"use client";

import "./globals.css";

/**
 * Last-resort error page, used when the root layout itself fails (for example
 * when the database is unreachable). It renders its own <html> and needs no data.
 */
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh items-center justify-center p-6">
        <div className="flex max-w-md flex-col gap-4">
          <h1 className="text-h2 font-semibold">The site is temporarily unavailable</h1>
          <p className="text-fg-muted">Please try again in a moment.</p>
          <button
            type="button"
            onClick={reset}
            className="h-11 self-start rounded-[var(--radius-button)] border border-line-strong px-4 text-small font-medium"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
