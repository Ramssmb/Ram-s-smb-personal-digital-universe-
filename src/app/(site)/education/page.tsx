import { Prose, SafeLink } from "@/components/public/content";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { Container, PageHeader } from "@/components/ui/layout";
import { formatDate } from "@/lib/format";
import { listAchievements, listEducation } from "@/server/content/public";
import { pageMetadata } from "@/server/seo";

export async function generateMetadata() {
  return pageMetadata("education", "/education", {
    title: "Education",
    description: "Degree, institution, coursework and academic milestones.",
  });
}

function years(start: number | null, end: number | null): string {
  if (!start && !end) return "";
  if (start && end) return `${start} – ${end}`;
  return start ? `${start} – present` : `Until ${end}`;
}

export default async function EducationPage() {
  const [education, academic] = await Promise.all([
    listEducation(),
    listAchievements({ kind: "academic" }),
  ]);
  return (
    <Container>
      <PageHeader
        eyebrow="Education"
        title="Education"
        description="Academic background and coursework."
      />
      {education.length === 0 && academic.length === 0 ? (
        <EmptyState className="my-16" title="No education entries published yet" />
      ) : (
        <div className="flex flex-col gap-16 py-12 md:py-16">
          <ol className="relative flex flex-col gap-10 border-l border-line pl-6 md:pl-10">
            {education.map((entry) => (
              <li key={entry.id} className="relative">
                <span
                  aria-hidden="true"
                  className="absolute top-2 -left-[29px] size-2.5 rounded-full bg-accent ring-4 ring-canvas md:-left-[45px]"
                />
                <article className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-center gap-2">
                    {years(entry.startYear, entry.endYear) && (
                      <span className="font-mono text-small text-fg-muted">
                        {years(entry.startYear, entry.endYear)}
                      </span>
                    )}
                    {entry.currentStatus && <Badge tone="accent">{entry.currentStatus}</Badge>}
                    {entry.currentSemester && <Badge>Semester {entry.currentSemester}</Badge>}
                  </div>
                  <div>
                    <h2 className="text-h2 font-semibold">
                      {entry.degree}
                      {entry.branch ? ` · ${entry.branch}` : ""}
                    </h2>
                    <p className="mt-1 text-body-lg text-fg-muted">{entry.institution}</p>
                    <div className="mt-2">
                      <SafeLink href={entry.institutionUrl}>Institution website</SafeLink>
                    </div>
                  </div>
                  <Prose markdown={entry.descriptionMd} />
                  {entry.coursework.length > 0 && (
                    <div>
                      <h3 className="eyebrow">Relevant coursework</h3>
                      <ul className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                        {entry.coursework.map((course) => (
                          <li key={course} className="flex gap-2 text-body">
                            <span aria-hidden="true" className="text-fg-muted">
                              —
                            </span>
                            {course}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </article>
              </li>
            ))}
          </ol>
          {academic.length > 0 && (
            <section aria-labelledby="academic-heading">
              <h2 id="academic-heading" className="text-h2 font-semibold">
                Academic achievements
              </h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {academic.map((item) => (
                  <li key={item.id}>
                    <Card className="h-full">
                      <p className="font-semibold">{item.title}</p>
                      {item.organization && (
                        <p className="text-small text-fg-muted">{item.organization}</p>
                      )}
                      {item.achievedOn && (
                        <p className="mt-2 font-mono text-micro text-fg-muted">
                          {formatDate(item.achievedOn)}
                        </p>
                      )}
                      <Prose markdown={item.descriptionMd} className="mt-3 text-small" />
                    </Card>
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
