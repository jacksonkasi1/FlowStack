// ** import core packages
import { Hono } from "hono";

// ** import routes
import uploadRoute from "./upload";
import downloadRoute from "./download";
import deleteRoute from "./delete";
import listRoute from "./list";
import existsRoute from "./exists";

const storageRouter = new Hono();

storageRouter.route("/", uploadRoute);
storageRouter.route("/", downloadRoute);
storageRouter.route("/", deleteRoute);
storageRouter.route("/", listRoute);
storageRouter.route("/", existsRoute);

export default storageRouter;
