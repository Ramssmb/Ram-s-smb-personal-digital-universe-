import { ContentForm } from "@/components/admin/content-form";
import { PROFILE_FIELDS } from "@/lib/content/singletons";
import { requireAdminPage } from "@/server/auth/guard";
import { mediaSummaries } from "@/server/content/admin-data";
import { getProfile } from "@/server/content/singletons";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  await requireAdminPage();
  const profile = await getProfile();
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header>
        <h1 className="text-h1 font-semibold">Profile</h1>
        <p className="mt-2 max-w-2xl text-fg-muted">
          Your introduction on the home and About pages. Empty fields are simply not shown — leave
          anything you are unsure about blank.
        </p>
      </header>
      <ContentForm
        fields={PROFILE_FIELDS}
        initial={profile}
        options={{ categories: [], skills: [], tags: [] }}
        media={await mediaSummaries([profile.photoId])}
        mode="singleton"
        endpoint="/api/v1/admin/profile"
      />
    </div>
  );
}
