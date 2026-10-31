-- Local development and CI only. Creates the two databases and the two roles
-- from docs/DATABASE_DESIGN.md §17:
--   site_owner  owns the schema; used only to run migrations
--   site_app    the web process; may read and write rows, cannot change the schema
-- The passwords below are throwaway values for a database bound to localhost.
-- Production roles are created with generated passwords (Phase 10).

CREATE ROLE site_owner LOGIN PASSWORD 'site_owner_dev';
CREATE ROLE site_app LOGIN PASSWORD 'site_app_dev';

CREATE DATABASE personal_site OWNER site_owner;
CREATE DATABASE personal_site_test OWNER site_owner;

\connect personal_site
REVOKE ALL ON DATABASE personal_site FROM PUBLIC;
GRANT CONNECT ON DATABASE personal_site TO site_app;
ALTER SCHEMA public OWNER TO site_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO site_app;

\connect personal_site_test
REVOKE ALL ON DATABASE personal_site_test FROM PUBLIC;
GRANT CONNECT ON DATABASE personal_site_test TO site_app;
ALTER SCHEMA public OWNER TO site_owner;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO site_app;
ALTER DEFAULT PRIVILEGES FOR ROLE site_owner IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO site_app;
