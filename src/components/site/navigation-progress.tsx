"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/** Wait this long before showing anything, so fast navigations do not flash. */
const SHOW_AFTER_MS = 150;

function isInternalNavigation(event: MouseEvent): boolean {
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
  const anchor = (event.target as Element | null)?.closest?.("a[href]");
  if (!(anchor instanceof HTMLAnchorElement)) return false;
  if (anchor.target && anchor.target !== "_self") return false;
  if (anchor.hasAttribute("download")) return false;
  const url = new URL(anchor.href, location.href);
  if (url.origin !== location.origin) return false;
  // Same page (or only the #fragment changes): nothing to load.
  return url.pathname !== location.pathname || url.search !== location.search;
}

/**
 * A thin bar at the top of the window while the next page loads, so a click on
 * a slow connection visibly registers. It is announced once to screen readers.
 * Client-side only: the server-rendered HTML is unchanged.
 */
export function NavigationProgress() {
  const route = `${usePathname()}?${useSearchParams().toString()}`;
  // A new route remounts the bar, which resets it.
  return <ProgressBar key={route} />;
}

function ProgressBar() {
  const [clicked, setClicked] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (isInternalNavigation(event)) setClicked(true);
    };
    // Capture phase: next/link calls preventDefault() for client-side navigation
    // before a bubbling listener would see the click.
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!clicked) return;
    const timer = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    return () => clearTimeout(timer);
  }, [clicked]);

  return (
    <>
      <div
        aria-hidden="true"
        className={
          visible ? "fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-accent/20" : "hidden"
        }
      >
        <div className="h-full w-1/3 animate-[progress_1.2s_ease-in-out_infinite] bg-accent" />
      </div>
      <p role="status" className="sr-only">
        {visible ? "Loading page…" : ""}
      </p>
    </>
  );
}
