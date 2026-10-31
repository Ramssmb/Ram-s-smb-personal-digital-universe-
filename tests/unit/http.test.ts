import { z } from "zod";

import { AppError, errorBody, toAppError } from "@/server/http/errors";
import { apiHandler } from "@/server/http/handler";
import { resolveRequestId } from "@/server/security/request-id";

describe("toAppError", () => {
  it("keeps AppErrors as they are", () => {
    const error = new AppError("conflict", "Slug already used.");
    expect(toAppError(error)).toBe(error);
    expect(error.status).toBe(409);
  });

  it("maps validation errors to field messages", () => {
    const result = z.object({ title: z.string().min(1) }).safeParse({ title: "" });
    const error = toAppError(result.error);
    expect(error.code).toBe("validation_failed");
    expect(error.status).toBe(400);
    expect(Object.keys(error.fields ?? {})).toEqual(["title"]);
  });

  it("hides the details of unexpected errors", () => {
    const error = toAppError(new Error("relation users does not exist at /srv/app.ts:12"));
    expect(error.code).toBe("internal_error");
    expect(error.message).toBe("Something went wrong.");
    expect(JSON.stringify(errorBody(error, "req-1"))).not.toContain("relation");
  });
});

describe("apiHandler", () => {
  it("returns the documented error shape with the request id", async () => {
    const handler = apiHandler(async () => {
      throw new AppError("not_found");
    });
    const response = await handler(new Request("http://localhost/api/v1/x"));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error.code).toBe("not_found");
    expect(body.error.requestId).toBe(response.headers.get("x-request-id"));
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("turns thrown exceptions into a generic 500", async () => {
    const handler = apiHandler(async () => {
      throw new Error("database password is hunter2");
    });
    const response = await handler(new Request("http://localhost/api/v1/x"));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("hunter2");
  });
});

describe("resolveRequestId", () => {
  it("accepts a safe upstream id", () => {
    expect(resolveRequestId("abc123-def456")).toBe("abc123-def456");
  });

  it.each([null, "short", "has spaces in it", "x".repeat(65), "evil\r\nset-cookie: a=b"])(
    "replaces unsafe id %j with a fresh one",
    (incoming) => {
      expect(resolveRequestId(incoming)).toMatch(/^[0-9a-f-]{36}$/);
    },
  );
});
