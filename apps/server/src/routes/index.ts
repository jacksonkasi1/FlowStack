// ** import core packages
import { Hono } from "hono";

// ** import routes
import authRouter from "./auth";
import storageRouter from "./storage";

const apiRouter = new Hono();

apiRouter.route("/auth", authRouter);
apiRouter.route("/storage", storageRouter);

export default apiRouter;
