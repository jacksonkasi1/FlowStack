// Loaded before the app (first import in index.ts). Sentry stays off unless
// SENTRY_DSN is set, and never runs under tests.
import * as Sentry from "@sentry/hono/node";

// ** import config
import {
  sampleRate,
  scrubSentryEvent,
  sentryDataCollection,
} from "@repo/config";

const dsn = process.env.SENTRY_DSN;

export const sentryEnabled = Boolean(dsn) && process.env.NODE_ENV !== "test";

if (sentryEnabled) {
  Sentry.init({
    dsn,
    environment:
      process.env.SENTRY_ENVIRONMENT ||
      process.env.ENVIRONMENT ||
      process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE || process.env.FLOWSTACK_RELEASE,
    tracesSampleRate: sampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    dataCollection: sentryDataCollection(),
    beforeSend: (event) => scrubSentryEvent(event),
  });
}
