import { MediaLibrary } from "@/components/admin/media-library";
import { requireAdminPage } from "@/server/auth/guard";
import { listMedia } from "@/server/media/service";

export const metadata = { title: "Media" };

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminPage();
  const { q, page } = await searchParams;
  const result = await listMedia({ q, page: Math.max(1, Number(page) || 1) });
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-h1 font-semibold">Media</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Images are converted to WebP in several sizes, with location and camera data removed.
          Private files are only ever shown inside this dashboard.
        </p>
      </header>
      <MediaLibrary
        items={result.items.map((item) => ({
          id: item.id,
          kind: item.kind,
          access: item.access,
          altText: item.altText,
          originalFilename: item.originalFilename,
          byteSize: item.byteSize,
          width: item.width,
          height: item.height,
          createdAt: item.createdAt.toISOString(),
        }))}
        total={result.total}
        page={result.page}
        pageSize={result.pageSize}
        query={q ?? ""}
      />
    </div>
  );
}
