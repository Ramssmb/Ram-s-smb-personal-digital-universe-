import "server-only";

import nodemailer, { type Transporter } from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

import { env } from "@/server/env";
import { logger } from "@/server/logger";

let transport: Transporter | null | undefined;

/** The SMTP transport, or null when notifications are not configured. */
function mailer(): Transporter | null {
  if (transport !== undefined) return transport;
  const { SMTP_URL } = env();
  transport = SMTP_URL
    ? nodemailer.createTransport({
        url: SMTP_URL,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
      } as SMTPTransport.Options)
    : null;
  return transport;
}

export function notificationsEnabled(): boolean {
  return Boolean(env().SMTP_URL);
}

/** Line breaks would start a new header; the library encodes the rest. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, " ").trim();

export interface NewMessage {
  name: string;
  email: string;
  subject: string;
  body: string;
}

/**
 * Emails the owner about a new contact message. Never throws: a failure is
 * logged, and the message is already stored in the dashboard inbox.
 */
export async function notifyNewMessage(
  message: NewMessage,
): Promise<"sent" | "disabled" | "failed"> {
  const smtp = mailer();
  if (!smtp) return "disabled";
  const { SMTP_FROM, CONTACT_NOTIFY_TO, SITE_URL } = env();
  try {
    await smtp.sendMail({
      from: SMTP_FROM,
      to: CONTACT_NOTIFY_TO,
      // Replying from the mail app answers the visitor directly.
      replyTo: { name: oneLine(message.name), address: message.email },
      subject: oneLine(`New message: ${message.subject || "(no subject)"}`).slice(0, 200),
      text: [
        `From: ${oneLine(message.name)} <${message.email}>`,
        "",
        message.body,
        "",
        "—",
        `Read and manage messages: ${SITE_URL}/admin/messages`,
      ].join("\n"),
    });
    return "sent";
  } catch (error) {
    logger.error({ err: error }, "contact notification failed");
    return "failed";
  }
}

/** For tests: forget the cached transport after the configuration changes. */
export function resetMailerForTests(): void {
  transport = undefined;
}
