// Postgres connection pool — replaces lib/supabase.ts during the
// self-host migration (see SELFHOST.md, Phase 4). Not yet wired into the
// app's actual queries; reading code as of v1.4.1 still imports from
// ./supabase. The plan is to swap call sites one file at a time.
//
// Usage pattern after refactor:
//
//   import { db } from "@/lib/db";
//
//   const { rows } = await db.query<{ id: number; title: string }>(
//     `SELECT id, title FROM articles WHERE topic = $1 ORDER BY scraped_at DESC LIMIT $2`,
//     [topic, 100]
//   );
//
// Notes:
// - Pool size deliberately small (5) so frequent cron scrapes can't
//   exhaust the database. Bump if dashboard concurrency grows.
// - SSL is enabled when the connection string sets sslmode=require; for
//   localhost connections (the default in our self-host setup) it stays
//   off and saves a handshake.
// - Add `pg` and `@types/pg` to package.json before importing this file:
//     npm install pg
//     npm install --save-dev @types/pg

import { Pool, type PoolConfig, type QueryResult, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Self-host setup requires a Postgres connection string — see SELFHOST.md Phase 3a."
    );
  }
  const config: PoolConfig = {
    connectionString,
    max: 5,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  };
  // SSL: enable when the URL explicitly requests it. Otherwise (localhost
  // for self-host) leave off.
  if (/sslmode=(require|verify-full|verify-ca)/.test(connectionString)) {
    config.ssl = { rejectUnauthorized: false };
  }
  pool = new Pool(config);
  pool.on("error", (err) => {
    console.error("[db] idle client error:", err);
  });
  return pool;
}

export const db = {
  query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<QueryResult<T>> {
    return getPool().query<T>(text, params);
  },

  // Single-row helper. Throws if zero rows returned; returns the first
  // row if multiple.
  async one<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T> {
    const { rows } = await getPool().query<T>(text, params);
    if (rows.length === 0) {
      throw new Error(`db.one: no rows returned for query: ${text}`);
    }
    return rows[0];
  },

  // Optional-row helper. Returns undefined when no rows match.
  async maybeOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T | undefined> {
    const { rows } = await getPool().query<T>(text, params);
    return rows[0];
  },

  // Many-row helper. Returns the rows array directly.
  async many<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<T[]> {
    const { rows } = await getPool().query<T>(text, params);
    return rows;
  },
};
