#!/bin/sh
# Production database roles (docs/DATABASE_DESIGN.md §17). Runs once, when the
# data volume is first created. Passwords come from the environment, never from
# this file.
set -eu

: "${SITE_OWNER_PASSWORD:?SITE_OWNER_PASSWORD is required}"
: "${SITE_APP_PASSWORD:?SITE_APP_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  -v owner_pw="$SITE_OWNER_PASSWORD" -v app_pw="$SITE_APP_PASSWORD" <<'SQL'
CREATE ROLE site_owner LOGIN PASSWORD :'owner_pw';
CREATE ROLE site_app LOGIN PASSWORD :'app_pw';
CREATE DATABASE personal_site OWNER site_owner;
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
SQL
