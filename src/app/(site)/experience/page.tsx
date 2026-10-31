import { Prose, TagList } from "@/components/public/content";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { ExternalLink } from "@/components/ui/text-link";
import { label } from "@/lib/content/enums";
import { formatRange } from "@/lib/format";
import { listExperience } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("experience", "/experience", {
    title: "Experience",
    description: "Internships, work, open source and volunteering.",
  });
}

export default async function ExperiencePage() {
  const experience = await listExperience();
  return (
    <Container>
      <PageHeader
        eyebrow="Experience"
        title="Experience"
        description="Internships, work, open-source contributions and volunteering."
      />
      {experience.length === 0 ? (
        <EmptyState className="my-16" title="No experience published yet" />
      ) : (
        <ol className="relative my-12 flex flex-col gap-12 border-l border-line pl-6 md:my-16 md:pl-10">
          {experience.map((item) => (
            <li key={item.id} id={`e-${item.id}`} className="relative scroll-mt-24">
              <span
                aria-hidden="true"
                className="absolute top-2 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-canvas md:-left-[45px]"
              />
              <article className="flex flex-col gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{label(item.kind)}</Badge>
                  {formatRange(item.startedOn, item.endedOn) && (
                    <span className="font-mono text-small text-fg-muted">
                      {formatRange(item.startedOn, item.endedOn)}
                    </span>
                  )}
                  {item.location && (
                    <span className="text-small text-fg-muted">· {item.location}</span>
                  )}
                </div>
                <div>
                  <h2 className="text-h3 font-semibold">{item.role}</h2>
                  <p className="text-body-lg text-fg-muted">
                    {item.organizationUrl ? (
                      <ExternalLink href={item.organizationUrl} newTab>
                        {item.organization}
                      </ExternalLink>
                    ) : (
                      item.organization
                    )}
                  </p>
                </div>
                <Prose markdown={item.summaryMd} />
                {item.responsibilities.length > 0 && (
                  <ul className="prose list-disc">
                    {item.responsibilities.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                )}
                <TagList items={item.skills} label="Skills used" />
                {item.links.length > 0 && (
                  <ul className="flex flex-wrap gap-4">
                    {item.links.map((link) => (
                      <li key={link.url}>
                        <ExternalLink href={link.url} newTab className="text-small">
                          {link.label}
                        </ExternalLink>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </li>
          ))}
        </ol>
      )}
    </Container>
  );
}
