// ** import core packages
import { Hono } from "hono";

// ** import utils
import { db, sql } from "@repo/db";
import { logger } from "@repo/logs";

const READY_TIMEOUT_MS = 3000;

const route = new Hono();

// Unchanged legacy endpoint.
route.get("/", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Liveness: the process is serving requests. No dependencies are checked.
route.get("/live", (c) => c.json({ status: "live" }));

// Readiness: the database answers. Failure details stay in the logs.
route.get("/ready", async (c) => {
  try {
    await Promise.race([
      db.execute(sql`select 1`),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), READY_TIMEOUT_MS),
      ),
    ]);
    return c.json({ status: "ready" });
  } catch (error) {
    logger.warn("Readiness check failed", {
      check: "database",
      reason: error instanceof Error ? error.message : "unknown",
    });
    return c.json({ status: "unavailable" }, 503);
  }
});

export default route;
