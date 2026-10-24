import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// Injected variables (Infisical) win; otherwise use packages/db/.env, then the
// API's .env so a single local file is enough. loadEnvFile never overrides
// variables that are already set.
for (const file of [".env", "../../apps/server/.env"])
  if (!process.env.DATABASE_URL && existsSync(file)) process.loadEnvFile(file);

// `push` and `drop` rewrite the schema without migration history. Allow them
// only against development databases.
const destructive = process.argv.some(
  (arg) => arg === "push" || arg === "drop",
);
const target =
  process.env.FLOWSTACK_ENV ||
  (process.env.NODE_ENV === "production" ? "production" : "development");
if (destructive && target !== "development") {
  throw new Error(
    `drizzle-kit ${process.argv.includes("push") ? "push" : "drop"} is blocked for ${target}. Generate a migration with db:generate and apply it with db:migrate instead.`,
  );
}

export default defineConfig({
  verbose: true,
  schemaFilter: ["public"],
  schema: "./src/schema",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
