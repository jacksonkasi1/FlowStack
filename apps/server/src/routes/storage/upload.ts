// ** import lib
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

// ** import config
import { env } from "@/config/env";

const route = new Hono();

route.get("/upload-url", async (c) => {
  const fileName = c.req.query("fileName");
  const contentType = c.req.query("contentType");
  const organizationId = c.req.query("organizationId");

  if (!fileName) {
    return c.json({ error: "fileName is required" }, 400);
  }

  // Validate fileName to prevent path traversal
  if (!r2.isValidFileName(fileName)) {
    return c.json({ error: "Invalid fileName" }, 400);
  }

  try {
    const result = await r2.getSignedUploadUrl(fileName, {
      contentType: contentType || undefined,
      organizationId: organizationId || undefined,
    });

    // Construct publicUrl from R2_PUBLIC_URL + filePath
    const publicUrl = env.R2_PUBLIC_URL
      ? `${env.R2_PUBLIC_URL}/${result.filePath}`
      : result.filePath;

    return c.json({
      signedUrl: result.signedUrl,
      filePath: result.filePath,
      publicUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload URL generation failed";
    return c.json({ error: message }, 500);
  }
});

export default route;
