import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

/** The 404 message, shared by the site's own 404 (with header and footer) and the bare root one. */
export function NotFoundContent({ withSearch = false }: { withSearch?: boolean }) {
  return (
    <Container className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="eyebrow">Error 404</p>
      <h1 className="text-h1 font-semibold">Page not found</h1>
      <p className="max-w-md text-body-lg text-fg-muted">
        The page you are looking for does not exist or is no longer available.
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
        {withSearch && (
          <ButtonLink href="/search" variant="ghost">
            Search the site
          </ButtonLink>
        )}
      </div>
    </Container>
  );
}
