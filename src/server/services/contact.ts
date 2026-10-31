import "server-only";

import { count, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

import type { SessionUser } from "@/server/auth/session";
import { getSettingsRow } from "@/server/content/singletons";
import { db } from "@/server/db/client";
import { contactMessages } from "@/server/db/schema";
import { AppError } from "@/server/http/errors";
import { logger } from "@/server/logger";
import { clientIpHash } from "@/server/security/client-ip";
import { keyedHash, safeEqual } from "@/server/security/crypto";
import { enforce, RULES } from "@/server/security/rate-limit";

import { audit } from "./audit";

const MIN_FILL_MS = 3_000;
const MAX_TOKEN_AGE_MS = 2 * 60 * 60 * 1000;

/** A signed render timestamp; proves the form was loaded and not filled instantly by a bot. */
export function issueFormToken(now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${keyedHash("contact-form", ts)}`;
}

export function checkFormToken(token: string, now = Date.now()): "ok" | "too-fast" | "invalid" {
  const [ts, signature] = token.split(".");
  if (!ts || !signature || !/^\d{13}$/.test(ts)) return "invalid";
  if (!safeEqual(signature, keyedHash("contact-form", ts))) return "invalid";
  const age = now - Number(ts);
  if (age < 0 || age > MAX_TOKEN_AGE_MS) return "invalid";
  if (age < MIN_FILL_MS) return "too-fast";
  return "ok";
}

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Use at most 100 characters."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(254),
  subject: z.string().trim().max(150, "Use at most 150 characters.").optional().default(""),
  message: z
    .string()
    .trim()
    .min(10, "Write at least 10 characters.")
    .max(5000, "Use at most 5,000 characters."),
  /** Honeypot: hidden from people, filled in by naive bots. */
  website: z.string().max(500).optional().default(""),
  formToken: z.string().max(200),
});

/**
 * Stores a contact message. Suspected spam is stored with status "spam" and
 * answered exactly like a real message, so bots learn nothing.
 */
export async function submitContact(input: unknown, headers: Headers): Promise<void> {
  const settings = await getSettingsRow();
  if (settings.contactEnabled === false) {
    throw new AppError("forbidden", "The contact form is currently closed.");
  }
  const data = contactSchema.parse(input);
  const ipHash = clientIpHash(headers);
  await enforce(RULES.contactPerIpShort, ipHash);
  await enforce(RULES.contactPerIpDay, ipHash);

  const token = checkFormToken(data.formToken);
  if (token === "invalid") {
    throw new AppError("validation_failed", "The form expired. Reload the page and try again.");
  }
  const spam = data.website.trim() !== "" || token === "too-fast";

  await db()
    .insert(contactMessages)
    .values({
      name: data.name,
      email: data.email,
      subject: data.subject,
      body: data.message,
      status: spam ? "spam" : "new",
      ipHash,
      userAgent: headers.get("user-agent")?.slice(0, 300) ?? null,
    });
  if (!spam) logger.info("contact message received");
}

export async function listMessages(options: { status?: string; page?: number } = {}) {
  const page = Math.max(1, options.page ?? 1);
  const pageSize = 25;
  const status = ["new", "read", "archived", "spam"].includes(options.status ?? "")
    ? (options.status as "new" | "read" | "archived" | "spam")
    : undefined;
  const where = status
    ? eq(contactMessages.status, status)
    : inArray(contactMessages.status, ["new", "read"]);
  const [items, [total]] = await Promise.all([
    db()
      .select()
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db().select({ value: count() }).from(contactMessages).where(where),
  ]);
  return { items, total: Number(total?.value ?? 0), page, pageSize };
}

export async function countNewMessages(): Promise<number> {
  const [row] = await db()
    .select({ value: count() })
    .from(contactMessages)
    .where(eq(contactMessages.status, "new"));
  return Number(row?.value ?? 0);
}

export const messageUpdateSchema = z.object({
  status: z.enum(["new", "read", "archived", "spam"]),
});

export async function updateMessage(id: string, input: unknown, admin: SessionUser) {
  if (!z.uuid().safeParse(id).success) throw new AppError("not_found");
  const { status } = messageUpdateSchema.parse(input);
  const updated = await db()
    .update(contactMessages)
    .set({ status, updatedAt: new Date() })
    .where(eq(contactMessages.id, id))
    .returning({ id: contactMessages.id });
  if (!updated.length) throw new AppError("not_found");
  await audit({
    userId: admin.id,
    action: "message_status",
    entityType: "message",
    entityId: id,
    summary: { status },
  });
}

export async function deleteMessage(id: string, admin: SessionUser) {
  if (!z.uuid().safeParse(id).success) throw new AppError("not_found");
  const deleted = await db()
    .delete(contactMessages)
    .where(eq(contactMessages.id, id))
    .returning({ id: contactMessages.id });
  if (!deleted.length) throw new AppError("not_found");
  await audit({ userId: admin.id, action: "delete", entityType: "message", entityId: id });
}
