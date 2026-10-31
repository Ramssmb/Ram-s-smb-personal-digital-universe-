import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";

import { ContentForm } from "@/components/admin/content-form";
import { Alert } from "@/components/ui/display";
import { COLLECTIONS, isCollectionKey } from "@/lib/content/collections";
import { requireAdminPage } from "@/server/auth/guard";
import { formOptions, mediaSummaries, referencedMedia } from "@/server/content/admin-data";
import { getItem } from "@/server/content/service";
import { AppError } from "@/server/http/errors";

type Params = {
  params: Promise<{ collection: string; id: string }>;
  searchParams: Promise<{ created?: string }>;
};

export const metadata = { title: "Edit" };

export default async function EditItemPage({ params, searchParams }: Params) {
  await requireAdminPage();
  const { collection, id } = await params;
  if (!isCollectionKey(collection)) notFound();
  const def = COLLECTIONS[collection];
  let item: Record<string, unknown>;
  try {
    item = await getItem(collection, id);
  } catch (error) {
    if (error instanceof AppError && error.code === "not_found") notFound();
    throw error;
  }
  const [options, media] = await Promise.all([
    formOptions(),
    mediaSummaries(referencedMedia(collection, item)),
  ]);
  const { created } = await searchParams;
  const publicPath = def.publicPath?.(item) ?? null;

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <Link
          href={`/admin/content/${collection}` as Route}
          className="text-small text-fg-muted hover:text-fg"
        >
          ← {def.label}
        </Link>
        <h1 className="mt-2 truncate text-h1 font-semibold">
          {String(item[def.titleField] ?? def.singular)}
        </h1>
      </header>
      {created && (
        <Alert tone="success" title="Draft created.">
          It is not visible on the site until you publish it.
        </Alert>
      )}
      <ContentForm
        fields={def.fields}
        initial={item}
        options={options}
        media={media}
        mode="edit"
        endpoint={`/api/v1/admin/collections/${collection}/${id}`}
        collection={collection}
        singular={def.singular}
        publishable={def.publishable}
        previewPath={def.publishable ? `/admin/preview/${collection}/${id}` : null}
        publicPath={publicPath}
      />
    </div>
  );
}
