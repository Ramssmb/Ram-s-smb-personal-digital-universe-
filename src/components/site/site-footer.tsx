import { Container } from "@/components/ui/layout";

export function SiteFooter({ siteName }: { siteName: string | null }) {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto border-t border-line">
      <Container className="flex flex-col gap-2 py-10 text-small text-fg-muted sm:flex-row sm:items-center sm:justify-between">
        <p>
          © {year}
          {siteName ? ` ${siteName}` : ""}
        </p>
      </Container>
    </footer>
  );
}
