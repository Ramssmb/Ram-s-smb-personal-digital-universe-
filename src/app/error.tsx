"use client";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

/** Shown when a page fails to render. Details stay in the server logs. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Container className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="text-h1 font-semibold">This page could not be loaded</h1>
      <p className="max-w-md text-body-lg text-fg-muted">
        Please try again. If the problem continues, come back a little later.
      </p>
      {error.digest && (
        <p className="font-mono text-small text-fg-muted">Reference: {error.digest}</p>
      )}
      <Button variant="secondary" className="mt-4" onClick={reset}>
        Try again
      </Button>
    </Container>
  );
}
