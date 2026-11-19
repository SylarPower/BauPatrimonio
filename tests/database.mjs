import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs/promises";
const db = new PGlite();
try {
  await db.exec(
    `create role anon nologin; create role authenticated nologin; create schema auth; create table auth.users(id uuid primary key); create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$; grant usage on schema auth to authenticated, anon; grant execute on function auth.uid() to authenticated, anon;`,
  );
  await db.exec(
    await fs.readFile("supabase/migrations/202611190001_initial.sql", "utf8"),
  );
  await db.exec(await fs.readFile("supabase/tests/isolation.sql", "utf8"));
  console.log(
    "PASS: migrazione eseguita su PostgreSQL/PGlite, isolamento RLS con due utenti, scrittura e lettura RPC. Nessun progetto Supabase remoto coinvolto.",
  );
} finally {
  await db.close();
}
