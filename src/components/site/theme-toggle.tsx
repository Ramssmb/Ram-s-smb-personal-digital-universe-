"use client";

import { Moon, Sun } from "lucide-react";
import { useSyncExternalStore } from "react";

import { IconButton } from "@/components/ui/button";
import { THEME_COOKIE, THEME_COOKIE_MAX_AGE, type ResolvedTheme } from "@/lib/theme";

const darkQuery = "(prefers-color-scheme: dark)";

/** The theme actually shown: an explicit choice on <html>, else the OS setting. */
function readResolvedTheme(): ResolvedTheme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia(darkQuery).matches ? "dark" : "light";
}

function subscribe(onChange: () => void) {
  const media = window.matchMedia(darkQuery);
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  media.addEventListener("change", onChange);
  return () => {
    observer.disconnect();
    media.removeEventListener("change", onChange);
  };
}

/**
 * Switches between light and dark. The choice is stored in a cookie so the
 * server renders the right theme on the next visit, without a flash.
 */
export function ThemeToggle() {
  // `null` on the server: the server cannot know the OS theme.
  const theme = useSyncExternalStore<ResolvedTheme | null>(
    subscribe,
    readResolvedTheme,
    () => null,
  );
  const next: ResolvedTheme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE}=${next}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }

  return (
    <IconButton
      label={theme ? `Switch to ${next} theme` : "Switch theme"}
      variant="ghost"
      onClick={toggle}
      data-testid="theme-toggle"
    >
      {/* Both icons render; CSS shows the one matching the current theme. */}
      <Sun aria-hidden="true" className="size-[18px] theme-dark:hidden" />
      <Moon aria-hidden="true" className="hidden size-[18px] theme-dark:block" />
    </IconButton>
  );
}
