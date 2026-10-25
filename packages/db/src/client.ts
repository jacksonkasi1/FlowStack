// ** import core packages
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// ** import types
import type { Env } from "./types";

// ** import schema
import * as schema from "./schema/index";

/**
 * Neon hosts use the Neon HTTP driver (fast single queries, good cold starts).
 * Any other PostgreSQL (local, Docker, Cloud SQL) uses postgres.js over TCP.
 * Override with DATABASE_DRIVER=neon|postgres.
 */
export function selectDriver(databaseUrl: string): "neon" | "postgres" {
  const forced = process.env.DATABASE_DRIVER;
  if (forced === "neon" || forced === "postgres") return forced;
  try {
    return new URL(databaseUrl).hostname.endsWith(".neon.tech")
      ? "neon"
      : "postgres";
  } catch {
    return "neon";
  }
}

export function createClient(env?: Env) {
  const databaseUrl = env?.DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required but was not found in environment variables",
    );
  }

  const logger = process.env.NODE_ENV === "development";

  if (selectDriver(databaseUrl) === "postgres") {
    // Same query API as the Neon client. Typed as the Neon instance so
    // callers see one type; raw `execute` results differ in shape, so use
    // the query builder for anything that reads results.
    return drizzlePostgres({
      client: postgres(databaseUrl, {
        max: Number(process.env.DATABASE_POOL_MAX) || 10,
      }),
      schema,
      logger,
    }) as unknown as ReturnType<typeof drizzle<typeof schema>>;
  }

  // Use neon HTTP client - faster for single queries, handles cold starts better
  const sql = neon(databaseUrl);

  const db = drizzle({
    client: sql,
    schema,
    logger,
  });

  return db;
}

export type DbInstance = ReturnType<typeof createClient>;
