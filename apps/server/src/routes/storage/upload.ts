// ** import lib
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

// Validation patterns for file names
const DANGEROUS_PATTERNS = /\.\.|[\x00-\x1f]/;
const MAX_FILENAME_LENGTH = 255;

route.get("/upload-url", async (c) => {
  const fileName = c.req.query("fileName");
  const contentType = c.req.query("contentType");
  const organizationId = c.req.query("organizationId");

  if (!fileName) {
    return c.json({ error: "fileName is required" }, 400);
  }

  // Validate fileName to prevent path traversal
  if (
    DANGEROUS_PATTERNS.test(fileName) ||
    fileName.length > MAX_FILENAME_LENGTH
  ) {
    return c.json({ error: "Invalid fileName" }, 400);
  }

  try {
    const result = await r2.getSignedUploadUrl(fileName, {
      contentType: contentType || undefined,
      organizationId: organizationId || undefined,
    });

    return c.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload URL generation failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
