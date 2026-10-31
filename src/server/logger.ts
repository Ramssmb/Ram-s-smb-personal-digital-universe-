import "server-only";

import pino from "pino";

/**
 * Structured JSON logs on stdout. Fields that could carry credentials or
 * personal data are redacted even if a caller passes them by mistake.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  base: { service: "personal-site" },
  redact: {
    paths: [
      "password",
      "*.password",
      "token",
      "*.token",
      "cookie",
      "*.cookie",
      "headers.cookie",
      "headers.authorization",
      "body",
      "*.body",
    ],
    censor: "[redacted]",
  },
});
