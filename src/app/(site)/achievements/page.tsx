import Link from "next/link";
import type { Route } from "next";

import { FileLink, Prose, SafeLink, TagList } from "@/components/public/content";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { label } from "@/lib/content/enums";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { listAchievements, listCertifications } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("achievements", "/achievements", {
    title: "Achievements and certifications",
    description: "Certificates, courses, awards, competitions and milestones.",
  });
}

const VIEWS = [
  { value: "", label: "All" },
  { value: "certifications", label: "Certifications & courses" },
  { value: "achievements", label: "Awards & milestones" },
];

export default async function AchievementsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view = "" } = await searchParams;
  const [certifications, achievements] = await Promise.all([
    view === "achievements" ? Promise.resolve([]) : listCertifications(),
    view === "certifications" ? Promise.resolve([]) : listAchievements(),
  ]);
  const empty = certifications.length === 0 && achievements.length === 0;

  return (
    <Container>
      <PageHeader
        eyebrow="Recognition"
        title="Achievements and certifications"
        description="Each entry links to its verification where one exists."
      />
      <nav aria-label="Filter" className="flex flex-wrap gap-2 py-8">
        {VIEWS.map((item) => (
          <Link
            key={item.value}
            href={(item.value ? `/achievements?view=${item.value}` : "/achievements") as Route}
            aria-current={view === item.value ? "page" : undefined}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-4 text-small transition-colors",
              view === item.value
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-fg-muted hover:text-fg",
            )}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {empty ? (
        <EmptyState className="mb-16" title="Nothing published here yet" />
      ) : (
        <div className="flex flex-col gap-16 pb-16">
          {certifications.length > 0 && (
            <section aria-labelledby="certs-heading">
              <h2 id="certs-heading" className="text-h2 font-semibold">
                Certifications and courses
              </h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {certifications.map((cert) => (
                  <li
                    key={cert.id}
                    id={`c-${cert.id}`}
                    className="flex scroll-mt-24 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{cert.title}</h3>
                        <p className="text-small text-fg-muted">{cert.issuer}</p>
                      </div>
                      <Badge>{label(cert.kind)}</Badge>
                    </div>
                    <p className="font-mono text-micro text-fg-muted">
                      {cert.issuedOn ? `Issued ${formatDate(cert.issuedOn)}` : ""}
                      {cert.expiresOn ? ` · Expires ${formatDate(cert.expiresOn)}` : ""}
                      {cert.credentialId ? ` · ID ${cert.credentialId}` : ""}
                    </p>
                    <Prose markdown={cert.descriptionMd} className="text-small" />
                    <TagList items={cert.skills} label="Related skills" />
                    <div className="mt-auto flex flex-wrap gap-4 pt-1">
                      <SafeLink href={cert.verificationUrl}>Verify credential</SafeLink>
                      {cert.file && <FileLink file={cert.file} label="View certificate" />}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {achievements.length > 0 && (
            <section aria-labelledby="awards-heading">
              <h2 id="awards-heading" className="text-h2 font-semibold">
                Awards and milestones
              </h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {achievements.map((item) => (
                  <li
                    key={item.id}
                    id={`a-${item.id}`}
                    className="flex scroll-mt-24 flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-surface p-6"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{item.title}</h3>
                        {item.organization && (
                          <p className="text-small text-fg-muted">{item.organization}</p>
                        )}
                      </div>
                      <Badge tone="accent">{label(item.kind)}</Badge>
                    </div>
                    {item.achievedOn && (
                      <p className="font-mono text-micro text-fg-muted">
                        {formatDate(item.achievedOn)}
                      </p>
                    )}
                    <Prose markdown={item.descriptionMd} className="text-small" />
                    <div className="mt-auto flex flex-wrap gap-4 pt-1">
                      <SafeLink href={item.url}>Details</SafeLink>
                      {item.file && (
                        <FileLink
                          file={item.file}
                          label={item.file.kind === "image" ? "View image" : "View document"}
                        />
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Container>
  );
}
