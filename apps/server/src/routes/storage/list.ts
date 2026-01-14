// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

route.get("/get-all", async (c) => {
  const prefix = c.req.query("prefix");
  const maxKeys = c.req.query("maxKeys");
  const continuationToken = c.req.query("continuationToken");

  try {
    const result = await r2.listFiles({
      prefix: prefix || undefined,
      maxKeys: maxKeys ? parseInt(maxKeys, 10) : undefined,
      continuationToken: continuationToken || undefined,
    });

    return c.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "List files failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
