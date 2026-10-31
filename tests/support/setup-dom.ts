import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => cleanup());

// Unit tests never touch a database; these values only satisfy configuration parsing.
process.env.LOG_LEVEL = "silent";
process.env.SITE_URL ??= "http://localhost:3000";
process.env.DATABASE_URL ??= "postgres://unit:unit@127.0.0.1:1/unit";
process.env.APP_SECRET ??= "unit-test-secret-unit-test-secret-0123456789";

// jsdom has no matchMedia; components that follow the OS theme need it.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
