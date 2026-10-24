import { createFileRoute, notFound } from '@tanstack/react-router'

// Development-only: throws during render so the root error boundary reports
// it to Sentry. Returns 404 in production builds.
export const Route = createFileRoute('/debug/sentry')({
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound()
  },
  component: SentryCheck,
})

function SentryCheck(): never {
  throw new Error('FlowStack Sentry verification error (development only)')
}
