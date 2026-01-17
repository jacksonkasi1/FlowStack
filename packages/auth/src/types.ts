export interface Env {
  NODE_ENV: string;
  BETTER_AUTH_URL: string;
  BETTER_AUTH_SECRET: string;
  FRONTEND_URL: string;
  DATABASE_URL: string;
  ZEPTOMAIL_API_KEY?: string;
  EMAIL_FROM_ADDRESS?: string;
  EMAIL_FROM_NAME?: string;
  ALLOWED_ORIGINS?: string;
  DOMAIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
}

export interface Bindings extends Env {}

export interface AuthConfig {
  env: Env;
}

export function createEnvFromProcess(): Env {
  const required = [
    "BETTER_AUTH_URL",
    "BETTER_AUTH_SECRET",
    "FRONTEND_URL",
    "DATABASE_URL",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required env: ${missing.join(", ")}`);
  }

  return {
    NODE_ENV: process.env.NODE_ENV || "development",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL!,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET!,
    FRONTEND_URL: process.env.FRONTEND_URL!,
    DATABASE_URL: process.env.DATABASE_URL!,
    ZEPTOMAIL_API_KEY: process.env.ZEPTOMAIL_API_KEY,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    DOMAIN: process.env.DOMAIN,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  };
}
