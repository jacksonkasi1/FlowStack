// ** import core packages
import { Hono } from "hono";

// ** import utils
import { r2 } from "@repo/storage";

const route = new Hono();

route.get("/download-url", async (c) => {
  const filePath = c.req.query("filePath");

  if (!filePath) {
    return c.json({ error: "filePath is required" }, 400);
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
