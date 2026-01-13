// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

route.delete("/delete", async (c) => {
  const filePath = c.req.query("filePath");

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
  }

  try {
    await r2.deleteFile(filePath);
    return c.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File deletion failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
