// ** import core packages
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

// ** import config
import { TEMPLATE_FEATURES } from "@repo/config";

// R2 credentials are required only when storage was enabled during setup.
const r2 = (schema: z.ZodString) =>
  TEMPLATE_FEATURES.storage ? schema : schema.optional();

export const env = createEnv({
  server: {
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.string().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),

    BETTER_AUTH_URL: z.string().url(),
    BETTER_AUTH_SECRET: z.string().min(32),
    FRONTEND_URL: z.string().url(),
    DATABASE_URL: z.string().url(),

    ZEPTOMAIL_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM_ADDRESS: z.string().email().optional(),
    EMAIL_FROM_NAME: z.string().optional(),

    ALLOWED_ORIGINS: z.string().optional(),
    DOMAIN: z.string().optional(),

    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),

    // Rate limiting behind proxies (see apps/server/DEPLOYMENT.md).
    AUTH_TRUSTED_PROXIES: z.string().optional(),
    AUTH_IP_HEADERS: z.string().optional(),

    R2_ACCESS_KEY_ID: r2(z.string().min(1)),
    R2_SECRET_ACCESS_KEY: r2(z.string().min(1)),
    R2_ENDPOINT_URL: r2(z.string().url()),
    R2_BUCKET_NAME: r2(z.string().min(1)),
    R2_PUBLIC_URL: z.string().url().optional(),

    SENTRY_DSN: z.string().url().optional(),
    SENTRY_ENVIRONMENT: z.string().optional(),
    SENTRY_RELEASE: z.string().optional(),
    SENTRY_TRACES_SAMPLE_RATE: z.string().optional(),
  },

  runtimeEnv: process.env,

  emptyStringAsUndefined: true,

  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});

export type Env = typeof env;
