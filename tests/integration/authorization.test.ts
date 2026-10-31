import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

import { createAdmin, request, resetDatabase, routeContext } from "../support/integration";

const ADMIN_API = join(process.cwd(), "src", "app", "api", "v1", "admin");
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"] as const;

function routeFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return routeFiles(full);
    return name === "route.ts" ? [full] : [];
  });
}

// Plausible values for every dynamic segment.
const PARAMS = {
  collection: "projects",
  id: "00000000-0000-4000-8000-000000000000",
  action: "publish",
  key: "home",
};

const files = routeFiles(ADMIN_API);

beforeAll(resetDatabase);

describe("admin API authorization", () => {
  it("discovers the admin routes", () => {
    expect(files.length).toBeGreaterThanOrEqual(12);
  });

  it.each(files.map((file) => [relative(ADMIN_API, file)]))(
    "%s calls requireAdmin in every handler",
    (file) => {
      const source = readFileSync(join(ADMIN_API, file), "utf8");
      const handlers = source.match(/export const (GET|POST|PUT|PATCH|DELETE) = apiHandler/g) ?? [];
      const guards = source.match(/await requireAdmin\(request\)/g) ?? [];
      expect(handlers.length).toBeGreaterThan(0);
      expect(guards.length).toBe(handlers.length);
    },
  );

  it.each(files.map((file) => [relative(ADMIN_API, file)]))(
    "%s rejects anonymous requests with 401",
    async (file) => {
      const route = (await import(pathToFileURL(join(ADMIN_API, file)).href)) as Record<
        string,
        unknown
      >;
      let checked = 0;
      for (const method of METHODS) {
        const handler = route[method] as
          ((req: Request, ctx: unknown) => Promise<Response>) | undefined;
        if (!handler) continue;
        const response = await handler(
          request(method, "/api/v1/admin/x", { json: method === "GET" ? undefined : {} }),
          routeContext(PARAMS),
        );
        expect(response.status, `${method} ${file}`).toBe(401);
        checked++;
      }
      expect(checked).toBeGreaterThan(0);
    },
  );

  it.each(files.map((file) => [relative(ADMIN_API, file)]))(
    "%s rejects cross-site writes with 403",
    async (file) => {
      const admin = await createAdmin();
      const route = (await import(pathToFileURL(join(ADMIN_API, file)).href)) as Record<
        string,
        unknown
      >;
      for (const method of METHODS.filter((m) => m !== "GET")) {
        const handler = route[method] as
          ((req: Request, ctx: unknown) => Promise<Response>) | undefined;
        if (!handler) continue;
        for (const origin of ["https://evil.test", null]) {
          const response = await handler(
            request(method, "/api/v1/admin/x", { cookie: admin.cookie, origin, json: {} }),
            routeContext(PARAMS),
          );
          expect(response.status, `${method} ${file} origin=${origin}`).toBe(403);
          expect((await response.json()).error.code).toBe("csrf_rejected");
        }
      }
    },
  );
});
