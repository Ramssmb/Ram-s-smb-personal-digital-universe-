import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader, SkipLink } from "@/components/site/site-header";
import { getFeaturedLinks, getIdentity } from "@/server/content/public";

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const [{ siteName }, links] = await Promise.all([getIdentity(), getFeaturedLinks()]);
  return (
    <>
      <SkipLink />
      <SiteHeader siteName={siteName} />
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
      <SiteFooter siteName={siteName} links={links} />
    </>
  );
}
