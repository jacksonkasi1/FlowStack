import { fileQuery, ownsPath } from "./validation";
// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono<{ Variables: { storagePrefixes: string[] } }>();

route.get("/download-url", fileQuery, async (c) => {
  const { filePath } = c.req.valid("query");
  if (!ownsPath(filePath, c.get("storagePrefixes") || []))
    return c.json({ error: "Forbidden" }, 403);

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
  }

  // Validate filePath to prevent path traversal
  if (!r2.isValidPath(filePath)) {
    return c.json({ error: "Invalid file path" }, 400);
  }

  try {
    const url = await r2.getSignedDownloadUrl(filePath);
    return c.json({ url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Download URL generation failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
