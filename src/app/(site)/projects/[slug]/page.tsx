import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectArticle } from "@/components/public/articles";
import { JsonLd } from "@/components/public/content";
import { getIdentity, getProject } from "@/server/content/public";
import { absoluteUrl, shareImageUrl, socialMetadata } from "@/server/seo";

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = await getProject((await params).slug);
  // Render the regular 404 page (with its own metadata), not an error shell.
  if (!project) notFound();
  const title = project.seoTitle || project.title;
  const description = project.seoDescription || project.summary || undefined;
  return {
    title,
    description,
    ...(await socialMetadata({
      title,
      description,
      path: `/projects/${project.slug}`,
      type: "article",
      image: project.cover,
      modifiedTime: project.updatedAt.toISOString(),
    })),
  };
}

export default async function ProjectPage({ params }: Params) {
  const project = await getProject((await params).slug);
  if (!project) notFound();
  const { profile, ogImage } = await getIdentity();
  const image = project.cover ?? ogImage;
  const url = absoluteUrl(`/projects/${project.slug}`);
  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          ...(project.summary ? { description: project.summary } : {}),
          url,
          mainEntityOfPage: url,
          ...(image ? { image: absoluteUrl(shareImageUrl(image)) } : {}),
          ...(project.startedOn ? { dateCreated: project.startedOn } : {}),
          ...(project.repoUrl ? { codeRepository: project.repoUrl } : {}),
          ...(project.skills.length
            ? { keywords: project.skills.map((s) => s.name).join(", ") }
            : {}),
          ...(profile.displayName
            ? { author: { "@type": "Person", name: profile.displayName, url: absoluteUrl("/") } }
            : {}),
        }}
      />
      <ProjectArticle project={project} />
    </>
  );
}
