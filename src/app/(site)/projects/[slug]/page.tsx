import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectArticle } from "@/components/public/articles";
import { JsonLd } from "@/components/public/content";
import { getIdentity, getProject } from "@/server/content/public";
import { absoluteUrl } from "@/server/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = await getProject((await params).slug);
  if (!project) return { title: "Project not found" };
  const title = project.seoTitle || project.title;
  const description = project.seoDescription || project.summary || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/projects/${project.slug}`,
      ...(project.cover
        ? {
            images: [
              {
                url: project.cover.src,
                width: project.cover.width,
                height: project.cover.height,
                alt: project.cover.alt,
              },
            ],
          }
        : {}),
    },
  };
}

export default async function ProjectPage({ params }: Params) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const { profile } = await getIdentity();
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          ...(project.summary ? { description: project.summary } : {}),
          url: absoluteUrl(`/projects/${project.slug}`),
          ...(project.startedOn ? { dateCreated: project.startedOn } : {}),
          ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
          ...(project.skills.length
            ? { keywords: project.skills.map((s) => s.name).join(", ") }
            : {}),
          ...(profile.displayName
            ? { author: { "@type": "Person", name: profile.displayName } }
            : {}),
        }}
      />
      <ProjectArticle project={project} />
    </>
  );
}
