// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

route.get("/upload-url", async (c) => {
  const fileName = c.req.query("fileName");
  const contentType = c.req.query("contentType");
  const organizationId = c.req.query("organizationId");

  if (!fileName) {
    return c.json({ error: "fileName is required" }, 400);
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
