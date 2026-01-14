export interface Env {
  DATABASE_URL: string;
}

export function createEnvFromProcessEnv(): Env {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  return {
    DATABASE_URL: databaseUrl,
  };
}
