// ** import core packages
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// ** import types
import type { Env } from "./types";

// ** import schema
import * as schema from "./schema/index";

export function createClient(env?: Env) {
  const databaseUrl = env?.DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required but was not found in environment variables",
    );
  }

  // Use neon HTTP client - faster for single queries, handles cold starts better
  const sql = neon(databaseUrl);

  const db = drizzle({
    client: sql,
    schema,
    logger: process.env.NODE_ENV === "development",
  });

  return db;
}

export type DbInstance = ReturnType<typeof createClient>;
