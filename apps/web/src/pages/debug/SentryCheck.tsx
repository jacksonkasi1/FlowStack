// Development-only route (see App.tsx): throws during render so the root
// error boundary reports it to Sentry.
export default function SentryCheck(): never {
  throw new Error("FlowStack Sentry verification error (development only)");
}
