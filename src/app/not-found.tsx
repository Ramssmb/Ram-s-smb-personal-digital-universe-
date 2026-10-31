import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/layout";

export default function NotFound() {
  return (
    <Container className="flex flex-1 flex-col items-start justify-center gap-4 py-24">
      <p className="eyebrow">Error 404</p>
      <h1 className="text-h1 font-semibold">Page not found</h1>
      <p className="max-w-md text-body-lg text-fg-muted">
        The page you are looking for does not exist or is no longer available.
      </p>
      <ButtonLink href="/" variant="secondary" className="mt-4">
        Back to home
      </ButtonLink>
    </Container>
  );
}
