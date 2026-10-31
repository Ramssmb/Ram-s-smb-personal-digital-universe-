import { ContentForm } from "@/components/admin/content-form";
import { SeoPagesForm } from "@/components/admin/seo-pages-form";
import { SETTINGS_FIELDS } from "@/lib/content/singletons";
import { requireAdminPage } from "@/server/auth/guard";
import { mediaSummaries } from "@/server/content/admin-data";
import { getSeoPages, getSettingsRow } from "@/server/content/singletons";

export const metadata = { title: "Settings & SEO" };

export default async function SettingsPage() {
  await requireAdminPage();
  const [settings, seo] = await Promise.all([getSettingsRow(), getSeoPages()]);
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-12">
      <section className="flex flex-col gap-6" aria-labelledby="settings-heading">
        <header>
          <h1 id="settings-heading" className="text-h1 font-semibold">
            Settings & SEO
          </h1>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Site name, search-engine defaults, the contact form and which sections the home page
            shows.
          </p>
        </header>
        <ContentForm
          fields={SETTINGS_FIELDS}
          initial={settings}
          options={{ categories: [], skills: [], tags: [] }}
          media={await mediaSummaries([settings.ogImageId])}
          mode="singleton"
          endpoint="/api/v1/admin/settings"
        />
      </section>
      <section className="flex flex-col gap-6" aria-labelledby="seo-heading">
        <header>
          <h2 id="seo-heading" className="text-h2 font-semibold">
            Page titles and descriptions
          </h2>
          <p className="mt-2 max-w-2xl text-fg-muted">
            Optional overrides for search results and link previews. Empty fields use sensible
            defaults.
          </p>
        </header>
        <SeoPagesForm pages={seo} />
      </section>
    </div>
  );
}
