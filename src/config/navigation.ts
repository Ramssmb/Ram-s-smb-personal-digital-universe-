import type { Route } from "next";

export interface NavItem {
  label: string;
  href: Route;
}

/** Shown directly in the desktop header. */
export const primaryNav: NavItem[] = [
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Journal", href: "/journal" },
  { label: "Skills", href: "/skills" },
];

/** Grouped under "More" on desktop; listed in full on mobile and in the footer. */
export const secondaryNav: NavItem[] = [
  { label: "Education", href: "/education" },
  { label: "Experience", href: "/experience" },
  { label: "Achievements", href: "/achievements" },
  { label: "Resources", href: "/resources" },
  { label: "Links", href: "/links" },
];

export const allNav: NavItem[] = [
  ...primaryNav,
  ...secondaryNav,
  { label: "Contact", href: "/contact" },
];
