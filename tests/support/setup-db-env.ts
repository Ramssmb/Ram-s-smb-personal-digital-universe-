import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { testDatabaseUrls } from "./db-urls";

// Point the application's own db() at the test database, as the runtime role.
const { app } = testDatabaseUrls();
process.env.DATABASE_URL = app;
process.env.SITE_URL = "http://localhost:3000";
process.env.LOG_LEVEL = "silent";
process.env.APP_SECRET = "integration-test-secret-0123456789-abcdefgh";
process.env.STORAGE_DIR = mkdtempSync(join(tmpdir(), "personal-site-storage-"));
// Tests choose their client address through X-Forwarded-For, as if behind one proxy.
process.env.TRUST_PROXY_HOPS = "1";
