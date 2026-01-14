// ** import core packages
import { Hono } from "hono";

// ** import middleware
import { authMiddleware, requireAuth } from "@/middleware/auth";

// ** import routes
import uploadRoute from "./upload";
import downloadRoute from "./download";
import deleteRoute from "./delete";
import listRoute from "./list";
import existsRoute from "./exists";

const storageRouter = new Hono();

// Apply auth middleware to all storage routes
storageRouter.use("*", authMiddleware);
storageRouter.use("*", requireAuth);

storageRouter.route("/", uploadRoute);
storageRouter.route("/", downloadRoute);
storageRouter.route("/", deleteRoute);
storageRouter.route("/", listRoute);
storageRouter.route("/", existsRoute);

export default storageRouter;
