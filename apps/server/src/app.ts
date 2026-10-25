// ** import core packages
import { Hono } from "hono";
import { cors } from "hono/cors";
import { HTTPException } from "hono/http-exception";
import { requestId } from "hono/request-id";
import * as Sentry from "@sentry/hono/node";

// ** import utils
import { logger } from "@repo/logs";

// ** import routes
import apiRouter from "./routes";
import healthRouter from "./routes/health";

// ** import config
import { env } from "./config";
import { sentryEnabled } from "./instrument";

export function createApp() {
  const app = new Hono<{ Variables: { requestId: string } }>();

  if (sentryEnabled) app.use(Sentry.sentry(app));

  // Accepts a caller-supplied X-Request-Id only when it is short and plain.
  app.use(
    "*",
    requestId({
      generator: () => crypto.randomUUID(),
      limitLength: 64,
    }),
  );

  app.use(
    "*",
    cors({
      origin: env.ALLOWED_ORIGINS
        ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
        : [env.FRONTEND_URL || "http://localhost:3000"],
      credentials: true,
      allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
      exposeHeaders: ["X-Request-Id"],
    }),
  );

  app.use("*", async (c, next) => {
    const start = Date.now();
    await next();
    // Path only: query strings can carry tokens.
    logger.info(`${c.req.method} ${c.req.path} - ${c.res.status}`, {
      requestId: c.get("requestId"),
      durationMs: Date.now() - start,
    });
  });

  app.get("/", (c) => {
    return c.json({ message: "FlowStack Server", status: "ok" });
  });

  app.route("/health", healthRouter);

  // Development-only: confirms Sentry receives server errors.
  if (env.NODE_ENV === "development") {
    app.get("/debug/sentry", () => {
      throw new Error("FlowStack Sentry verification error (development only)");
    });
  }

  app.route("/api", apiRouter);

  app.notFound((c) => {
    return c.json({ error: "Not Found" }, 404);
  });

  app.onError((err, c) => {
    const id = c.get("requestId");
    if (err instanceof HTTPException) {
      if (err.status >= 500)
        logger.error("HTTP exception", { requestId: id, status: err.status });
      return err.getResponse();
    }
    logger.error("Unhandled error", {
      requestId: id,
      errorType: err.name,
      error: env.NODE_ENV === "production" ? undefined : err.message,
    });
    if (sentryEnabled) Sentry.captureException(err);
    return c.json({ error: "Internal Server Error", requestId: id }, 500);
  });

  return app;
}
