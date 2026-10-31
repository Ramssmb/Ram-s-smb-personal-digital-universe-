import { ConfigError, parseServerEnv } from "@/server/env";

const valid = {
  DATABASE_URL: "postgres://site_app:pw@127.0.0.1:5433/personal_site",
  SITE_URL: "https://example.test/",
};

describe("parseServerEnv", () => {
  it("accepts a minimal valid configuration and applies defaults", () => {
    const env = parseServerEnv(valid);
    expect(env.SITE_URL).toBe("https://example.test");
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.DESIGN_GALLERY).toBe(false);
  });

  it("parses the design gallery flag", () => {
    expect(parseServerEnv({ ...valid, DESIGN_GALLERY: "1" }).DESIGN_GALLERY).toBe(true);
  });

  it("rejects a missing database URL", () => {
    expect(() => parseServerEnv({ SITE_URL: valid.SITE_URL })).toThrow(ConfigError);
  });

  it("rejects non-postgres database URLs", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x@y/z" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a non-http site URL", () => {
    expect(() => parseServerEnv({ ...valid, SITE_URL: "ftp://example.test" })).toThrow(/SITE_URL/);
  });

  it("never includes variable values in the error", () => {
    const secret = "postgres-but-not-a-url-with-SECRET-PASSWORD";
    try {
      parseServerEnv({ ...valid, DATABASE_URL: secret });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(String((error as Error).message)).not.toContain("SECRET-PASSWORD");
    }
  });
});
