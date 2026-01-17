// ** import core packages
import { Hono } from "hono";
import { cors } from "hono/cors";

// ** import utils
import { logger } from "@repo/logs";

// ** import routes
import apiRouter from "./routes";

// ** import config
import { env } from "./config";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: env.ALLOWED_ORIGINS
      ? env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
      : [env.FRONTEND_URL || "http://localhost:3000"],
    credentials: true,
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  logger.info(
    `${c.req.method} ${c.req.path} - ${c.res.status} (${duration}ms)`,
  );
});

app.get("/", (c) => {
  return c.json({ message: "FlowStack Server", status: "ok" });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.route("/api", apiRouter);

app.notFound((c) => {
  return c.json({ error: "Not Found" }, 404);
});

app.onError((err, c) => {
  logger.error(`Unhandled error: ${err.message}`);
  return c.json({ error: "Internal Server Error" }, 500);
});

const PORT = parseInt(env.PORT || "8080", 10);

export default {
  port: PORT,
  fetch: app.fetch,
};

logger.info(`Server starting on http://localhost:${PORT}`);
