import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdminPage } from "@/server/auth/guard";
import { countNewMessages } from "@/server/services/contact";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false, follow: false },
};

export default async function PanelLayout({ children }: { children: ReactNode }) {
  // Convenience redirect only. Every page and API handler checks the session itself.
  const admin = await requireAdminPage();
  return (
    <AdminShell email={admin.email} newMessages={await countNewMessages()}>
      {children}
    </AdminShell>
  );
}
