// ** import core packages
import { Hono } from "hono";

// ** import utils
import { configureAuth } from "@repo/auth";
import { env } from "@/config";

let authInstance: ReturnType<typeof configureAuth> | null = null;

function getAuthInstance(): ReturnType<typeof configureAuth> {
  if (!authInstance) {
    authInstance = configureAuth(env);
  }
  return authInstance;
}

const route = new Hono();

route.all("/*", async (c) => {
  const auth = getAuthInstance();
  return auth.handler(c.req.raw);
});

export default route;
