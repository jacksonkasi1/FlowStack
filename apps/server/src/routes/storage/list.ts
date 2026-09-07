import { listQuery, ownsPath } from "./validation";
// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono<{ Variables: { storagePrefixes: string[] } }>();

route.get("/get-all", listQuery, async (c) => {
  const query = c.req.valid("query");
  const prefixes: string[] = c.get("storagePrefixes") || [];
  const prefix = query.prefix || prefixes[0];
  if (!prefix || !ownsPath(prefix, prefixes))
    return c.json({ error: "Forbidden" }, 403);
  const { maxKeys, continuationToken } = query;

  try {
    const result = await r2.listFiles({
      prefix: prefix || undefined,
      maxKeys,
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
