export const THEME_COOKIE = "theme";
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export function parseThemePreference(value: string | undefined | null): ThemePreference | null {
  return value === "system" || value === "light" || value === "dark" ? value : null;
}

/** Value for `<html data-theme>`; `undefined` lets the CSS follow the OS. */
export function themeAttribute(preference: ThemePreference): ResolvedTheme | undefined {
  return preference === "system" ? undefined : preference;
}
