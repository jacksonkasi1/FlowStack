// ** import lib
import * as Sentry from "@sentry/react";

// ** import config
import {
  sampleRate,
  scrubSentryEvent,
  sentryDataCollection,
} from "@repo/config";

/** Browser-side Sentry. Off unless VITE_SENTRY_DSN is set. */
export function initMonitoring() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn || import.meta.env.MODE === "test") return;
  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate: sampleRate(
      import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
    ),
    dataCollection: sentryDataCollection(),
    beforeSend: (event) => scrubSentryEvent(event),
  });
}

export const ErrorBoundary = Sentry.ErrorBoundary;
