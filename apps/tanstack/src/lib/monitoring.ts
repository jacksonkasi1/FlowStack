// ** import lib
import * as Sentry from '@sentry/tanstackstart-react'

// ** import config
import {
  sampleRate,
  scrubSentryEvent,
  sentryDataCollection,
} from '@repo/config'

// ** import types
import type { AnyRouter } from '@tanstack/react-router'

/** Browser-side Sentry. Off unless VITE_SENTRY_DSN is set. */
export function initClientMonitoring(router: AnyRouter) {
  const dsn = import.meta.env.VITE_SENTRY_DSN
  if (!dsn || import.meta.env.MODE === 'test') return
  const tracesSampleRate = sampleRate(
    import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
  )
  Sentry.init({
    dsn,
    environment:
      import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    tracesSampleRate,
    integrations: tracesSampleRate
      ? [Sentry.tanstackRouterBrowserTracingIntegration(router)]
      : [],
    dataCollection: sentryDataCollection(),
    beforeSend: (event) => scrubSentryEvent(event),
  })
}

export const captureException = Sentry.captureException
