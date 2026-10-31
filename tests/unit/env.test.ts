import { ConfigError, parseServerEnv } from "@/server/env";

const valid = {
  DATABASE_URL: "postgres://site_app:pw@127.0.0.1:5433/personal_site",
  SITE_URL: "https://example.test/",
  APP_SECRET: "x".repeat(32),
};

describe("parseServerEnv", () => {
  it("accepts a minimal valid configuration and applies defaults", () => {
    const env = parseServerEnv(valid);
    expect(env.SITE_URL).toBe("https://example.test");
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.DATABASE_POOL_MAX).toBe(10);
    expect(env.STORAGE_DIR).toBe("./storage");
    expect(env.TRUST_PROXY_HOPS).toBe(0);
  });

  it("requires a long enough APP_SECRET", () => {
    expect(() => parseServerEnv({ ...valid, APP_SECRET: "short" })).toThrow(/APP_SECRET/);
    expect(() => parseServerEnv({ ...valid, APP_SECRET: undefined })).toThrow(/APP_SECRET/);
  });

  it("rejects a missing database URL", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: undefined })).toThrow(ConfigError);
  });

  it("rejects non-postgres database URLs", () => {
    expect(() => parseServerEnv({ ...valid, DATABASE_URL: "mysql://x@y/z" })).toThrow(
      /DATABASE_URL/,
    );
  });

  it("rejects a non-http site URL", () => {
    expect(() => parseServerEnv({ ...valid, SITE_URL: "ftp://example.test" })).toThrow(/SITE_URL/);
  });

  it("bounds the number of trusted proxies", () => {
    expect(parseServerEnv({ ...valid, TRUST_PROXY_HOPS: "1" }).TRUST_PROXY_HOPS).toBe(1);
    expect(() => parseServerEnv({ ...valid, TRUST_PROXY_HOPS: "9" })).toThrow(/TRUST_PROXY_HOPS/);
  });

  it("never includes variable values in the error", () => {
    try {
      parseServerEnv({
        ...valid,
        DATABASE_URL: "postgres-but-not-a-url-with-SECRET-PASSWORD",
        APP_SECRET: "tiny-SECRET",
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ConfigError);
      expect(String((error as Error).message)).not.toContain("SECRET-PASSWORD");
      expect(String((error as Error).message)).not.toContain("tiny-SECRET");
    }
  });
});
