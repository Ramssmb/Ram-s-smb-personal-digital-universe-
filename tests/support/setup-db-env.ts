import { testDatabaseUrls } from "./db-urls";

// Point the application's own db() at the test database, as the runtime role.
const { app } = testDatabaseUrls();
process.env.DATABASE_URL = app;
process.env.SITE_URL ??= "http://localhost:3000";
process.env.LOG_LEVEL = "silent";
