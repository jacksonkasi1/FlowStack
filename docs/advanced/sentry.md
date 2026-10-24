# Sentry monitoring

Sentry is optional. With no DSN, no Sentry code sends anything and the apps run
normally. Enable it with `bun run setup --with sentry` (or by setting the
variables below); doctor then checks the configuration.

| App                              | SDK                           | Variables                                                                                                                                               |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API (`apps/server`)              | `@sentry/hono` (Node)         | `SENTRY_DSN`, optional `SENTRY_ENVIRONMENT`, `SENTRY_RELEASE` (defaults to `FLOWSTACK_RELEASE`, set on deploy), `SENTRY_TRACES_SAMPLE_RATE` (default 0) |
| React Router (`apps/web`)        | `@sentry/react`               | `VITE_SENTRY_DSN`, `VITE_SENTRY_ENVIRONMENT`, `VITE_SENTRY_RELEASE`, `VITE_SENTRY_TRACES_SAMPLE_RATE`                                                   |
| TanStack Start (`apps/tanstack`) | `@sentry/tanstackstart-react` | Browser: the `VITE_SENTRY_*` values. Server rendering: `SENTRY_DSN` etc.                                                                                |

Sentry is never initialised when `NODE_ENV=test` (or Vite `MODE=test`), so tests
cannot send events.

## What is captured

- **API**: unhandled errors through `app.onError` (each logged with its request
  ID), plus the Sentry Hono middleware. The response is a generic 500 with the
  request ID; error details are not sent to clients.
- **React Router**: a root `Sentry.ErrorBoundary` with a fallback page.
- **TanStack Start**: the root route's `errorComponent` (client errors and errors
  during server rendering), `src/server.ts` wraps the server handler, and
  `src/start.ts` adds Sentry's request and server-function middleware.

## Privacy

Sentry SDK v11 replaced `sendDefaultPii` with `dataCollection`, and **an unset
`dataCollection` collects everything**: cookies, headers, request and response
bodies, user details, database query values and AI prompts. FlowStack therefore
sets every category explicitly in `packages/config/src/config/monitoring.ts`,
shared by all three apps:

- off: user info, cookies, HTTP bodies, URL query values, database query data,
  GraphQL documents and variables, GenAI and MCP inputs/outputs, queue arguments,
  stack-frame local variables;
- headers: an allow-list of `content-type`, `content-length`, `accept`,
  `user-agent`, `x-request-id` only;
- a `beforeSend` scrubber removes request cookies, bodies, query strings,
  non-allow-listed headers and every user field except `id`.

`tests/server-runtime.test.ts` sends a request with a session cookie, a bearer
token and a token in the query string to a server with a DSN pointing at a local
fake Sentry, and asserts that none of them appear in what is sent.

## Source maps

Builds produce **no** source maps by default. When `SENTRY_AUTH_TOKEN`,
`SENTRY_ORG` and `SENTRY_PROJECT` are all set (release builds in CI), the Vite
plugins generate source maps, upload them for `SENTRY_RELEASE`, and delete the
`.map` files afterwards so they are never served (`apps/web` uses `hidden` maps).
`SENTRY_AUTH_TOKEN` is passed to builds without entering the Turborepo cache key.

## Verifying

- **Development wiring**: with a DSN set, open `http://localhost:8080/debug/sentry`
  (API) or `/debug/sentry` in either frontend. These routes exist only in
  development and throw a test error.
- **Live delivery**: `bun run sentry:verify` sends one event with `SENTRY_DSN` and
  reports whether Sentry accepted it (HTTP status and event ID). This is the only
  check that proves delivery to your Sentry project; the automated tests use a
  local fake ingest server.
