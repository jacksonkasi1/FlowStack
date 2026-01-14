// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

route.get("/exists", async (c) => {
  const filePath = c.req.query("filePath");

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
  }

  // Validate filePath to prevent path traversal
  if (!r2.isValidPath(filePath)) {
    return c.json({ error: "Invalid file path" }, 400);
  }

  try {
    const exists = await r2.fileExists(filePath);
    return c.json({ exists });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "File exists check failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
