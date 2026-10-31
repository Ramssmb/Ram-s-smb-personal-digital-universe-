import Link from "next/link";

import { Prose, ResponsiveImage } from "@/components/public/content";
import { Badge, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { getIdentity, listAboutSections, listEducation } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  const { siteName } = await getIdentity();
  return pageMetadata("about", "/about", {
    title: "About",
    description: siteName
      ? `About ${siteName}: background, education, interests and goals.`
      : undefined,
  });
}

export default async function AboutPage() {
  const [{ profile, photo }, sections, education] = await Promise.all([
    getIdentity(),
    listAboutSections(),
    listEducation(),
  ]);
  const hasIntro = Boolean(profile.shortBio || profile.headline);
  const empty =
    !hasIntro && sections.length === 0 && education.length === 0 && profile.interests.length === 0;

  return (
    <Container>
      <PageHeader
        eyebrow="About"
        title={profile.displayName ? `About ${profile.displayName}` : "About"}
        description={profile.headline}
      />
      {empty ? (
        <EmptyState
          className="my-16"
          title="Nothing here yet"
          description="This page fills in as sections are published."
        />
      ) : (
        <div className="grid gap-12 py-12 md:py-16 lg:grid-cols-[1fr_300px] lg:gap-16">
          <div className="flex min-w-0 flex-col gap-12">
            {profile.shortBio && <p className="max-w-[68ch] text-body-lg">{profile.shortBio}</p>}
            {sections.map((section) => (
              <section
                key={section.id}
                aria-labelledby={`about-${section.id}`}
                className="flex flex-col gap-4"
              >
                <h2 id={`about-${section.id}`} className="text-h2 font-semibold">
                  {section.title}
                </h2>
                <Prose markdown={section.bodyMd} />
              </section>
            ))}
          </div>
          <aside className="flex flex-col gap-8">
            {photo && (
              <ResponsiveImage
                image={photo}
                sizes="300px"
                className="aspect-square w-full max-w-[300px] rounded-[var(--radius-card)] border border-line object-cover"
              />
            )}
            {profile.currentFocus && (
              <div>
                <p className="eyebrow">Current focus</p>
                <p className="mt-2">{profile.currentFocus}</p>
              </div>
            )}
            {profile.interests.length > 0 && (
              <div>
                <p className="eyebrow">Interests</p>
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {profile.interests.map((interest) => (
                    <li key={interest}>
                      <Badge>{interest}</Badge>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {education.length > 0 && (
              <div>
                <p className="eyebrow">Education</p>
                <ul className="mt-2 flex flex-col gap-3">
                  {education.map((entry) => (
                    <li key={entry.id}>
                      <p className="font-medium">
                        {entry.degree}
                        {entry.branch ? `, ${entry.branch}` : ""}
                      </p>
                      <p className="text-small text-fg-muted">{entry.institution}</p>
                    </li>
                  ))}
                </ul>
                <Link
                  href="/education"
                  className="mt-3 inline-block text-small font-medium text-accent"
                >
                  Education details
                </Link>
              </div>
            )}
            {profile.location && (
              <div>
                <p className="eyebrow">Based in</p>
                <p className="mt-2">{profile.location}</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </Container>
  );
}
