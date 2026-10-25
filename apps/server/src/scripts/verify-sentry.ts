// Sends one test event to the Sentry project configured by SENTRY_DSN and
// reports whether Sentry accepted it. Run with `bun run sentry:verify`.
// This is a live check: it needs a real DSN and network access.
import * as Sentry from "@sentry/hono/node";

// ** import config
import { scrubSentryEvent, sentryDataCollection } from "@repo/config";

const dsn = process.env.SENTRY_DSN;
if (!dsn) {
  console.error(
    "SENTRY_DSN is not set. Nothing was sent (Sentry is disabled).",
  );
  process.exit(1);
}

let status: number | undefined;
Sentry.init({
  dsn,
  environment: process.env.SENTRY_ENVIRONMENT || "development",
  release: process.env.SENTRY_RELEASE,
  dataCollection: sentryDataCollection(),
  beforeSend: (event) => scrubSentryEvent(event),
  transport: (options) => {
    const transport = Sentry.makeNodeTransport(options);
    return {
      ...transport,
      send: async (envelope) => {
        const response = await transport.send(envelope);
        status = response.statusCode;
        return response;
      },
    };
  },
});

const eventId = Sentry.captureMessage(
  "FlowStack Sentry verification event",
  "info",
);
const flushed = await Sentry.flush(10000);
if (flushed && status && status >= 200 && status < 300) {
  console.log(
    `Sentry accepted the test event (HTTP ${status}). Event ID: ${eventId}`,
  );
} else {
  console.error(
    `Sentry did not confirm delivery (${status ? `HTTP ${status}` : "no response"}). Check the DSN, network access and project rate limits.`,
  );
  process.exitCode = 1;
}
