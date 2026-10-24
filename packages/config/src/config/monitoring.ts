/**
 * Sentry privacy baseline shared by the API and both frontends.
 *
 * Sentry SDK v11 replaced `sendDefaultPii` with `dataCollection`, and an unset
 * `dataCollection` collects everything (cookies, headers, bodies, user info,
 * database values, AI prompts). Every category is therefore set explicitly.
 * Loosen individual entries only after reviewing what they would send.
 */
export function sentryDataCollection() {
  return {
    userInfo: false,
    cookies: false,
    httpHeaders: {
      request: {
        allow: [
          "content-type",
          "content-length",
          "accept",
          "user-agent",
          "x-request-id",
        ],
      },
      response: { allow: ["content-type", "content-length", "x-request-id"] },
    },
    httpBodies: [] as Array<
      | "incomingRequest"
      | "outgoingRequest"
      | "incomingResponse"
      | "outgoingResponse"
    >,
    urlQueryParams: false,
    graphQL: { document: false, variables: false },
    genAI: { inputs: false, outputs: false },
    mcp: { inputs: false, outputs: false },
    databaseQueryData: false,
    queues: false,
    stackFrameVariables: false,
  };
}

const SAFE_HEADERS = new Set([
  "content-type",
  "content-length",
  "accept",
  "user-agent",
  "x-request-id",
]);

interface ScrubbableEvent {
  request?: {
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
    headers?: Record<string, string>;
    url?: string;
  };
  user?: { id?: string | number } & Record<string, unknown>;
}

/**
 * Defence in depth for `beforeSend`: removes request data that the
 * dataCollection settings should already exclude, in case an integration or
 * manual call adds it anyway.
 */
export function scrubSentryEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;
    if (event.request.url) event.request.url = event.request.url.split("?")[0];
    if (event.request.headers)
      event.request.headers = Object.fromEntries(
        Object.entries(event.request.headers).filter(([name]) =>
          SAFE_HEADERS.has(name.toLowerCase()),
        ),
      );
  }
  if (event.user)
    event.user = event.user.id === undefined ? {} : { id: event.user.id };
  return event;
}

/** Parses a sample rate, falling back to 0 (no tracing) for missing or invalid values. */
export function sampleRate(value: string | undefined): number {
  const rate = Number(value);
  return Number.isFinite(rate) && rate >= 0 && rate <= 1 ? rate : 0;
}
