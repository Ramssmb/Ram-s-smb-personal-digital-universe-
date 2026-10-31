import { isActivePath } from "@/components/site/nav-utils";
import { parseThemePreference, themeAttribute } from "@/lib/theme";

describe("theme preference", () => {
  it.each(["system", "light", "dark"] as const)("accepts %s", (value) => {
    expect(parseThemePreference(value)).toBe(value);
  });

  it.each(["", "DARK", "blue", null, undefined])("ignores %j", (value) => {
    expect(parseThemePreference(value)).toBeNull();
  });

  it("leaves the attribute off for system so CSS follows the OS", () => {
    expect(themeAttribute("system")).toBeUndefined();
    expect(themeAttribute("dark")).toBe("dark");
  });
});

describe("isActivePath", () => {
  it("matches the section and its sub-pages", () => {
    expect(isActivePath("/projects", "/projects")).toBe(true);
    expect(isActivePath("/projects/devpulse", "/projects")).toBe(true);
  });

  it("does not match a different section with the same prefix", () => {
    expect(isActivePath("/projects-old", "/projects")).toBe(false);
  });

  it("matches home only on the home page", () => {
    expect(isActivePath("/", "/")).toBe(true);
    expect(isActivePath("/about", "/")).toBe(false);
  });
});
