import { ArrowRight, Sparkles } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

import {
  JournalItem,
  JsonLd,
  MoreLink,
  ProjectCard,
  ResponsiveImage,
  SectionHeading,
} from "@/components/public/content";
import { LinkIconGlyph } from "@/components/site/link-icon";
import { buttonClasses } from "@/components/ui/button";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { Container } from "@/components/ui/layout";
import { label } from "@/lib/content/enums";
import { formatDate } from "@/lib/format";
import {
  getFeaturedLinks,
  getIdentity,
  getIdentityProfileUrls,
  listAchievements,
  listCertifications,
  listEducation,
  listJournal,
  listProjects,
  listSkills,
} from "@/server/content/public";
import { absoluteUrl, pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  const { siteName, profile } = await getIdentity();
  return pageMetadata("home", "/", {
    title: siteName ?? "Home",
    description: profile.headline ?? undefined,
  });
}

export default async function HomePage() {
  const { profile, settings, siteName, photo } = await getIdentity();
  const [links, education, projects, skills, journal, achievements, certifications, profileUrls] =
    await Promise.all([
      getFeaturedLinks(),
      settings.homeShowEducation ? listEducation() : Promise.resolve([]),
      settings.homeShowProjects
        ? listProjects({ featured: true, limit: 3 })
        : Promise.resolve({ items: [] }),
      settings.homeShowSkills ? listSkills({ featured: true }) : Promise.resolve([]),
      settings.homeShowJournal ? listJournal({ limit: 3 }) : Promise.resolve({ items: [] }),
      settings.homeShowAchievements
        ? listAchievements({ featured: true, limit: 4 })
        : Promise.resolve([]),
      settings.homeShowAchievements
        ? listCertifications({ featured: true, limit: 4 })
        : Promise.resolve([]),
      getIdentityProfileUrls(),
    ]);
  const highlights = [
    ...achievements.map((a) => ({
      id: `a-${a.id}`,
      title: a.title,
      meta: [label(a.kind), a.organization].filter(Boolean).join(" · "),
      date: a.achievedOn,
    })),
    ...certifications.map((c) => ({
      id: `c-${c.id}`,
      title: c.title,
      meta: [label(c.kind), c.issuer].join(" · "),
      date: c.issuedOn,
    })),
  ]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 4);
  const currentEducation = education[0];
  const hasHero = Boolean(profile.displayName);
  const nothingYet =
    !hasHero &&
    !profile.interests.length &&
    !education.length &&
    !projects.items.length &&
    !skills.length &&
    !journal.items.length &&
    !highlights.length;

  if (nothingYet) {
    return (
      <Container className="flex flex-1 items-center py-16 md:py-24">
        <EmptyState
          className="w-full"
          icon={<Sparkles />}
          title="Nothing is published yet"
          description="This site is being set up. Content will appear here once it is published."
        />
      </Container>
    );
  }

  return (
    <>
      {hasHero && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Person",
            name: profile.displayName,
            ...(profile.headline ? { description: profile.headline } : {}),
            url: absoluteUrl("/"),
            ...(photo ? { image: absoluteUrl(photo.src) } : {}),
            ...(profileUrls.length ? { sameAs: profileUrls } : {}),
            ...(currentEducation
              ? { alumniOf: { "@type": "CollegeOrUniversity", name: currentEducation.institution } }
              : {}),
          }}
        />
      )}

      {hasHero ? (
        <section className="border-b border-line">
          <Container className="grid gap-10 py-16 md:py-24 lg:grid-cols-[1fr_auto] lg:items-center lg:gap-16">
            <div className="flex max-w-3xl animate-[rise-in_400ms_var(--ease-standard)] flex-col gap-6">
              {profile.availability && (
                <p className="inline-flex items-center gap-2 self-start rounded-full border border-line bg-surface px-3 py-1 text-small text-fg-muted">
                  <span aria-hidden="true" className="size-2 rounded-full bg-success" />
                  {profile.availability}
                </p>
              )}
              <h1 className="text-display font-semibold tracking-tight">{profile.displayName}</h1>
              {profile.headline && (
                <p className="text-body-lg text-fg-muted md:text-h3 md:font-normal">
                  {profile.headline}
                </p>
              )}
              {profile.shortBio && (
                <p className="max-w-[60ch] text-body-lg text-fg">{profile.shortBio}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link href="/projects" className={buttonClasses("primary", "md")}>
                  View projects
                  <ArrowRight aria-hidden="true" className="size-4" />
                </Link>
                <Link href="/about" className={buttonClasses("secondary", "md")}>
                  About me
                </Link>
                {links.length > 0 && (
                  <ul className="flex gap-1" aria-label="Profiles">
                    {links.map((link) => (
                      <li key={link.id}>
                        <a
                          href={link.url}
                          rel={link.relMe ? "me noopener noreferrer" : "noopener noreferrer"}
                          aria-label={link.label}
                          title={link.label}
                          className="inline-flex size-11 items-center justify-center rounded-[var(--radius-button)] text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
                        >
                          <LinkIconGlyph icon={link.icon} className="size-5" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            {photo && (
              <ResponsiveImage
                image={photo}
                sizes="(min-width: 1024px) 320px, 240px"
                priority
                className="size-60 rounded-[28px] border border-line object-cover shadow-float lg:size-80"
              />
            )}
          </Container>
        </section>
      ) : (
        <h1 className="sr-only">{siteName ?? "Home"}</h1>
      )}

      {(profile.currentFocus || profile.interests.length > 0 || currentEducation) && (
        <section aria-label="Now" className="border-b border-line bg-surface">
          <Container className="grid gap-8 py-10 md:grid-cols-3">
            {currentEducation && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Education</p>
                <p className="font-medium">
                  {currentEducation.degree}
                  {currentEducation.branch ? `, ${currentEducation.branch}` : ""}
                </p>
                <p className="text-small text-fg-muted">
                  {currentEducation.institution}
                  {currentEducation.currentStatus ? ` · ${currentEducation.currentStatus}` : ""}
                </p>
              </div>
            )}
            {profile.currentFocus && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Currently learning</p>
                <p className="text-fg">{profile.currentFocus}</p>
              </div>
            )}
            {profile.interests.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="eyebrow">Interests</p>
                <ul className="flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <li key={interest}>
                      <Badge>{interest}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Container>
        </section>
      )}

      {projects.items.length > 0 && (
        <section aria-labelledby="featured-projects">
          <Container className="py-16 md:py-24">
            <SectionHeading
              id="featured-projects"
              title="Featured projects"
              action={<MoreLink href="/projects">All projects</MoreLink>}
            />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.items.map((project, index) => (
                <ProjectCard key={project.id} project={project} priority={!photo && index === 0} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {skills.length > 0 && (
        <section aria-labelledby="featured-skills" className="border-t border-line">
          <Container className="py-16 md:py-24">
            <SectionHeading
              id="featured-skills"
              title="Skills"
              action={<MoreLink href="/skills">All skills</MoreLink>}
            />
            <ul className="flex flex-wrap gap-2">
              {skills.map((skill) => (
                <li key={skill.id}>
                  <Link
                    href={`/skills#${skill.slug}` as Route}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-small font-medium transition-colors hover:border-line-strong"
                  >
                    {skill.name}
                    <span className="text-micro text-fg-muted">{label(skill.learningStatus)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      {journal.items.length > 0 && (
        <section aria-labelledby="recent-journal" className="border-t border-line">
          <Container className="py-16 md:py-24">
            <SectionHeading
              id="recent-journal"
              title="Recent learning"
              action={<MoreLink href="/journal">Full journal</MoreLink>}
            />
            <div className="divide-y divide-line border-y border-line">
              {journal.items.map((entry) => (
                <JournalItem key={entry.id} entry={entry} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {highlights.length > 0 && (
        <section aria-labelledby="highlights" className="border-t border-line">
          <Container className="py-16 md:py-24">
            <SectionHeading
              id="highlights"
              title="Achievements"
              action={<MoreLink href="/achievements">All achievements</MoreLink>}
            />
            <ul className="grid gap-4 md:grid-cols-2">
              {highlights.map((item) => (
                <li key={item.id}>
                  <Card className="h-full">
                    <p className="text-small text-fg-muted">{item.meta}</p>
                    <p className="mt-1 font-semibold">{item.title}</p>
                    {item.date && (
                      <p className="mt-2 font-mono text-micro text-fg-muted">
                        {formatDate(item.date)}
                      </p>
                    )}
                  </Card>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section aria-labelledby="contact-cta" className="border-t border-line bg-surface">
        <Container className="flex flex-col items-start gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
          <div className="max-w-xl">
            <h2 id="contact-cta" className="text-h2 font-semibold">
              Get in touch
            </h2>
            <p className="mt-2 text-fg-muted">
              Questions, collaborations or opportunities are welcome.
            </p>
          </div>
          <Link href="/contact" className={buttonClasses("primary", "md")}>
            Contact
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Container>
      </section>
    </>
  );
}
