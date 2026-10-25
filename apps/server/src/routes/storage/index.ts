// ** import core packages
import { Hono } from "hono";

// ** import middleware
import { authMiddleware, requireAuth } from "@/middleware/auth";

// ** import config
import { TEMPLATE_FEATURES } from "@repo/config";

// ** import routes
import uploadRoute from "./upload";
import downloadRoute from "./download";
import deleteRoute from "./delete";
import listRoute from "./list";
import existsRoute from "./exists";

const storageRouter = new Hono();

// Storage was not selected during setup: no R2 credentials are configured.
if (!TEMPLATE_FEATURES.storage) {
  storageRouter.all("*", (c) =>
    c.json({ error: "File storage is not enabled for this project" }, 503),
  );
}

// Apply auth middleware to all storage routes
storageRouter.use("*", authMiddleware);
storageRouter.use("*", requireAuth);

storageRouter.route("/", uploadRoute);
storageRouter.route("/", downloadRoute);
storageRouter.route("/", deleteRoute);
storageRouter.route("/", listRoute);
storageRouter.route("/", existsRoute);

export default storageRouter;
