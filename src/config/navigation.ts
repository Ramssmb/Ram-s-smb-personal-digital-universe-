import type { Route } from "next";

export interface NavItem {
  label: string;
  href: Route;
}

/**
 * Primary public navigation. A page is listed here only once it exists, so the
 * header never shows a link that leads nowhere. Pages are added in Phase 5.
 */
export const primaryNav: NavItem[] = [];
