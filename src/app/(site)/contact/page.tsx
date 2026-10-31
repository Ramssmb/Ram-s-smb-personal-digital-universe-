import { LinkIconGlyph } from "@/components/site/link-icon";
import { Alert } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { getFeaturedLinks, getIdentity } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";
import { issueFormToken } from "@/server/services/contact";

import { ContactForm } from "./contact-form";

export async function generateMetadata() {
  return pageMetadata("contact", "/contact", {
    title: "Contact",
    description: "Send a message about collaborations, opportunities or questions.",
  });
}

export default async function ContactPage() {
  const [{ settings }, links] = await Promise.all([getIdentity(), getFeaturedLinks()]);
  return (
    <Container>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        description="Questions, collaborations, internships or just a hello — I read every message."
      />
      <div className="grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_320px] lg:gap-16">
        <div className="max-w-2xl">
          {settings.contactEnabled === false ? (
            <Alert tone="info" title="The contact form is closed at the moment.">
              {settings.publicEmail
                ? "Please use email instead."
                : "Please reach out through one of the profiles listed here."}
            </Alert>
          ) : (
            <ContactForm token={issueFormToken()} />
          )}
        </div>
        <aside className="flex flex-col gap-8">
          {settings.publicEmail && (
            <div>
              <h2 className="eyebrow">Email</h2>
              <a
                href={`mailto:${settings.publicEmail}`}
                className="mt-2 inline-block break-all font-medium text-accent"
              >
                {settings.publicEmail}
              </a>
            </div>
          )}
          {links.length > 0 && (
            <div>
              <h2 className="eyebrow">Elsewhere</h2>
              <ul className="mt-3 flex flex-col gap-1">
                {links.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      rel={link.relMe ? "me noopener noreferrer" : "noopener noreferrer"}
                      className="flex h-10 items-center gap-3 rounded-md text-fg-muted transition-colors hover:text-fg"
                    >
                      <LinkIconGlyph icon={link.icon} className="size-[18px]" />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </Container>
  );
}
