// Sentry must initialise before anything else is imported.
import "./instrument";

// ** import core packages
import { serve } from "@hono/node-server";

// ** import utils
import { logger } from "@repo/logs";

// ** import config
import { env } from "./config";
import { createApp } from "./app";

const app = createApp();

const PORT = parseInt(env.PORT || "8080", 10);

serve({ port: PORT, fetch: app.fetch });

export default app;

logger.info(`Server starting on http://localhost:${PORT}`);
