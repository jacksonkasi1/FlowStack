// ** import core packages
import { drizzle } from "drizzle-orm/neon-serverless";

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

  const db = drizzle({
    connection: databaseUrl,
    schema,
    logger: process.env.NODE_ENV === "development",
  });

  return db;
}

export type DbInstance = ReturnType<typeof createClient>;
