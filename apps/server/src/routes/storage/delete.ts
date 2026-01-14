// ** import lib
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

// Validation pattern to prevent path traversal and absolute paths
const DANGEROUS_PATTERNS = /\.\.|^\/|[\x00-\x1f]/;

route.delete("/delete", async (c) => {
  const filePath = c.req.query("filePath");

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
  }

  // Validate filePath to prevent path traversal
  if (DANGEROUS_PATTERNS.test(filePath)) {
    return c.json({ error: "Invalid file path" }, 400);
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
