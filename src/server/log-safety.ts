/**
 * Reduces an error to fields that are safe to log. Database errors from
 * Drizzle embed the failed query *and its parameters* in their message, and
 * parameters can hold personal data (a contact message, an email address), so
 * the message is cut before "params:" and the query text is dropped.
 */
export interface SafeError {
  type: string;
  message: string;
  code?: string;
  stack?: string;
}

const MAX_MESSAGE = 300;

function clean(message: string): string {
  let text = message;
  const failed = text.indexOf("Failed query:");
  if (failed !== -1) text = `${text.slice(0, failed)}Failed query (details omitted)`;
  const params = text.indexOf("params:");
  if (params !== -1) text = text.slice(0, params);
  return text.trim().slice(0, MAX_MESSAGE);
}

export function safeError(error: unknown): SafeError {
  if (!(error instanceof Error)) return { type: typeof error, message: "non-error value thrown" };
  const cause = (error as { cause?: unknown }).cause;
  const pg = (cause ?? error) as { code?: unknown; message?: unknown };
  const result: SafeError = {
    type: error.name,
    message: clean(error.message),
    // Frame lines only ("    at …"): the stack begins with the full message, which may span lines.
    stack: error.stack
      ?.split("\n")
      .filter((line) => /^\s+at /.test(line))
      .slice(0, 5)
      .join("\n"),
  };
  if (typeof pg.code === "string") result.code = pg.code;
  if (cause instanceof Error && cause !== error)
    result.message += ` · cause: ${clean(cause.message)}`;
  return result;
}
