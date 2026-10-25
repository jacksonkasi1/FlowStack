// Custom server entry: initialises Sentry for SSR and server functions when
// SENTRY_DSN is set, then delegates to the default TanStack Start handler.
// ** import lib
import * as Sentry from '@sentry/tanstackstart-react'
import handler, { createServerEntry } from '@tanstack/react-start/server-entry'

// ** import config
import {
  sampleRate,
  scrubSentryEvent,
  sentryDataCollection,
} from '@repo/config'

if (process.env.SENTRY_DSN && process.env.NODE_ENV !== 'test') {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
    release: process.env.SENTRY_RELEASE,
    tracesSampleRate: sampleRate(process.env.SENTRY_TRACES_SAMPLE_RATE),
    dataCollection: sentryDataCollection(),
    beforeSend: (event) => scrubSentryEvent(event),
  })
}

export default createServerEntry(
  Sentry.wrapFetchWithSentry({
    fetch(request: Request) {
      return handler.fetch(request)
    },
  }),
)
