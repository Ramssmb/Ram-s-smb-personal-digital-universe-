import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { ContentForm } from "@/components/admin/content-form";
import { COLLECTIONS, isCollectionKey } from "@/lib/content/collections";
import { requireAdminPage } from "@/server/auth/guard";
import { formOptions } from "@/server/content/admin-data";

type Params = { params: Promise<{ collection: string }> };

export async function generateMetadata({ params }: Params) {
  const { collection } = await params;
  return {
    title: isCollectionKey(collection)
      ? `New ${COLLECTIONS[collection].singular.toLowerCase()}`
      : "New",
  };
}

/** Sensible starting values, never personal data. */
function defaults(collection: string): Record<string, unknown> {
  const today = new Date().toISOString().slice(0, 10);
  switch (collection) {
    case "journal":
      return { entryDate: today };
    case "skills":
      return { learningStatus: "learning" };
    case "projects":
      return { projectStatus: "in_progress" };
    case "experience":
      return { kind: "internship" };
    case "certifications":
      return { kind: "certification" };
    case "achievements":
      return { kind: "award" };
    case "resources":
      return { kind: "website", addedOn: today };
    case "links":
      return { kind: "profile", icon: "link" };
    case "categories":
      return { scope: "skill" };
    default:
      return {};
  }
}

export default async function NewItemPage({ params }: Params) {
  await requireAdminPage();
  const { collection } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = COLLECTIONS[collection];
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <Link
          href={`/admin/content/${collection}` as Route}
          className="text-small text-fg-muted hover:text-fg"
        >
          ← {def.label}
        </Link>
        <h1 className="mt-2 text-h1 font-semibold">New {def.singular.toLowerCase()}</h1>
      </header>
      <ContentForm
        fields={def.fields}
        initial={defaults(collection)}
        options={await formOptions()}
        media={{}}
        mode="create"
        endpoint={`/api/v1/admin/collections/${collection}`}
        collection={collection}
        singular={def.singular}
        publishable={def.publishable}
      />
    </div>
  );
}
