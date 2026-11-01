import { z } from "zod";

import { safeExternalUrl, safeMailto } from "@/lib/safe-url";

/**
 * Field definitions drive three things from one place: the admin form, the
 * server-side validation schema and which columns a service may write.
 */
export type FieldDef =
  | {
      kind: "text";
      name: string;
      label: string;
      required?: boolean;
      max?: number;
      hint?: string;
      placeholder?: string;
    }
  | { kind: "slug"; name: string; label: string; from: string; hint?: string }
  | {
      kind: "textarea";
      name: string;
      label: string;
      required?: boolean;
      max?: number;
      hint?: string;
      rows?: number;
    }
  | { kind: "markdown"; name: string; label: string; max?: number; hint?: string; rows?: number }
  | {
      kind: "url";
      name: string;
      label: string;
      required?: boolean;
      hint?: string;
      /** Also accept `mailto:address` (Links only). */
      allowEmail?: boolean;
    }
  | { kind: "email"; name: string; label: string; hint?: string }
  | { kind: "date"; name: string; label: string; required?: boolean; hint?: string }
  | { kind: "integer"; name: string; label: string; min: number; max: number; hint?: string }
  | {
      kind: "select";
      name: string;
      label: string;
      options: readonly string[];
      required?: boolean;
      hint?: string;
    }
  | { kind: "boolean"; name: string; label: string; hint?: string }
  | { kind: "string-list"; name: string; label: string; hint?: string; maxItems?: number }
  | { kind: "link-list"; name: string; label: string; hint?: string }
  | {
      kind: "category";
      name: string;
      label: string;
      scope: "skill" | "project" | "resource";
      hint?: string;
    }
  | { kind: "relation-many"; name: string; label: string; target: "skills" | "tags"; hint?: string }
  | {
      kind: "media";
      name: string;
      label: string;
      accept: "image" | "document" | "any";
      hint?: string;
    }
  | {
      kind: "media-many";
      name: string;
      label: string;
      /** "any" also accepts PDFs, which public pages list as attachments. */
      accept: "image" | "any";
      hint?: string;
    };

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/** Blank strings from forms become null, so "not set" is stored as NULL. */
const blankToNull = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? null : value;

const trimmed = (max: number) => z.string().trim().max(max, `Use at most ${max} characters.`);

export const urlSchema = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => safeExternalUrl(value) !== null, "Enter a full http:// or https:// address.")
  .transform((value) => safeExternalUrl(value)!);

const urlOrMailtoSchema = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => safeExternalUrl(value) !== null || safeMailto(value) !== null,
    "Enter a full https:// address or mailto:name@example.com.",
  )
  .transform((value) => safeExternalUrl(value) ?? safeMailto(value)!);

const validDate = z
  .string()
  .regex(DATE_PATTERN, "Use the format YYYY-MM-DD.")
  // Round-trip so impossible dates such as 2026-02-30 are rejected (Date.parse rolls them over).
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Enter a real date.");

function fieldSchema(field: FieldDef): z.ZodType {
  switch (field.kind) {
    case "text": {
      const base = trimmed(field.max ?? 200);
      return field.required
        ? base.min(1, "Required.")
        : z.preprocess(blankToNull, base.nullable()).optional();
    }
    case "slug":
      return z
        .preprocess(
          blankToNull,
          z
            .string()
            .trim()
            .max(80)
            .regex(SLUG_PATTERN, "Use lowercase letters, numbers and single hyphens.")
            .nullable(),
        )
        .optional();
    case "textarea": {
      const base = trimmed(field.max ?? 2000);
      return field.required ? base.min(1, "Required.") : base.optional().default("");
    }
    case "markdown":
      return z
        .string()
        .max(field.max ?? 50_000)
        .optional()
        .default("");
    case "url": {
      const schema = field.allowEmail ? urlOrMailtoSchema : urlSchema;
      return field.required ? schema : z.preprocess(blankToNull, schema.nullable()).optional();
    }
    case "email":
      return z
        .preprocess(blankToNull, z.string().trim().toLowerCase().email().max(254).nullable())
        .optional();
    case "date":
      return field.required
        ? validDate
        : z.preprocess(blankToNull, validDate.nullable()).optional();
    case "integer":
      return z
        .preprocess(
          (value) => (value === "" || value === null || value === undefined ? null : Number(value)),
          z.number().int().min(field.min).max(field.max).nullable(),
        )
        .optional();
    case "select": {
      const base = z.enum(field.options as [string, ...string[]]);
      return field.required ? base : z.preprocess(blankToNull, base.nullable()).optional();
    }
    case "boolean":
      return z.boolean().optional().default(false);
    case "string-list":
      return z
        .array(trimmed(300).min(1))
        .max(field.maxItems ?? 50)
        .optional()
        .default([]);
    case "link-list":
      return z
        .array(z.object({ label: trimmed(100).min(1, "Add a label."), url: urlSchema }))
        .max(20)
        .optional()
        .default([]);
    case "category":
      return z.preprocess(blankToNull, z.uuid().nullable()).optional();
    case "relation-many":
      return z.array(z.uuid()).max(100).optional().default([]);
    case "media":
      return z.preprocess(blankToNull, z.uuid().nullable()).optional();
    case "media-many":
      return z.array(z.uuid()).max(30).optional().default([]);
  }
}

export function buildSchema(fields: FieldDef[]) {
  return z
    .object(Object.fromEntries(fields.map((field) => [field.name, fieldSchema(field)])))
    .strict();
}

/** Fields stored in join tables rather than columns. */
export function isRelationField(field: FieldDef): boolean {
  return field.kind === "relation-many" || field.kind === "media-many";
}
