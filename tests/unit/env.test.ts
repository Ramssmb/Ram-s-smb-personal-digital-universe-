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
    expect(env.DATABASE_PREPARE).toBe(true);
    expect(env.UPLOAD_MODE).toBe("form");
    expect(env.CRON_SECRET).toBeUndefined();
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

describe("production and optional-feature rules", () => {
  it("requires https in production, except on localhost", () => {
    expect(() =>
      parseServerEnv({ ...valid, NODE_ENV: "production", SITE_URL: "http://example.test" }),
    ).toThrow(/SITE_URL: must use https/);
    expect(
      parseServerEnv({ ...valid, NODE_ENV: "production", SITE_URL: "http://localhost:3100" })
        .SITE_URL,
    ).toBe("http://localhost:3100");
    expect(
      parseServerEnv({ ...valid, NODE_ENV: "production", SITE_URL: "https://example.test" })
        .SITE_URL,
    ).toBe("https://example.test");
  });

  it("treats empty values as unset (Docker Compose passes unset variables as empty)", () => {
    const env = parseServerEnv({ ...valid, SMTP_URL: "", S3_ENDPOINT: " ", STORAGE_DRIVER: "" });
    expect(env.SMTP_URL).toBeUndefined();
    expect(env.STORAGE_DRIVER).toBe("local");
  });

  it("requires every S3 setting when the S3 driver is chosen", () => {
    expect(() => parseServerEnv({ ...valid, STORAGE_DRIVER: "s3" })).toThrow(
      /S3_ENDPOINT[\s\S]*S3_BUCKET[\s\S]*S3_ACCESS_KEY_ID[\s\S]*S3_SECRET_ACCESS_KEY/,
    );
    const s3 = {
      ...valid,
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://s3.example.test",
      S3_BUCKET: "media",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    };
    expect(parseServerEnv(s3).S3_REGION).toBe("auto");
    expect(() =>
      parseServerEnv({
        ...s3,
        NODE_ENV: "production",
        SITE_URL: "https://x.test",
        S3_ENDPOINT: "http://s3.example.test",
      }),
    ).toThrow(/S3_ENDPOINT: must use https/);
  });

  it("allows direct uploads only with object storage", () => {
    expect(() => parseServerEnv({ ...valid, UPLOAD_MODE: "direct" })).toThrow(
      /UPLOAD_MODE: direct uploads need STORAGE_DRIVER=s3/,
    );
    const direct = parseServerEnv({
      ...valid,
      UPLOAD_MODE: "direct",
      STORAGE_DRIVER: "s3",
      S3_ENDPOINT: "https://s3.example.test",
      S3_BUCKET: "media",
      S3_ACCESS_KEY_ID: "id",
      S3_SECRET_ACCESS_KEY: "secret",
    });
    expect(direct.UPLOAD_MODE).toBe("direct");
  });

  it("parses the serverless database and cron settings", () => {
    expect(parseServerEnv({ ...valid, DATABASE_PREPARE: "false" }).DATABASE_PREPARE).toBe(false);
    expect(() => parseServerEnv({ ...valid, DATABASE_PREPARE: "no" })).toThrow(/DATABASE_PREPARE/);
    expect(() => parseServerEnv({ ...valid, CRON_SECRET: "short" })).toThrow(
      /CRON_SECRET: must be at least 16 characters/,
    );
  });

  it("requires a sender and recipient when email notifications are configured", () => {
    expect(() =>
      parseServerEnv({ ...valid, SMTP_URL: "smtps://u:p@mail.example.test:465" }),
    ).toThrow(/SMTP_FROM[\s\S]*CONTACT_NOTIFY_TO/);
    expect(() =>
      parseServerEnv({
        ...valid,
        SMTP_URL: "http://mail.example.test",
        SMTP_FROM: "Site <site@example.test>",
        CONTACT_NOTIFY_TO: "me@example.test",
      }),
    ).toThrow(/SMTP_URL: must start with smtp/);
  });

  it("never echoes an SMTP password in errors", () => {
    try {
      parseServerEnv({ ...valid, SMTP_URL: "smtps://user:VERY-SECRET-PW@mail.example.test" });
      expect.unreachable();
    } catch (error) {
      expect(String((error as Error).message)).not.toContain("VERY-SECRET-PW");
    }
  });
});
