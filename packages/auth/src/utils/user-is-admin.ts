// ** import core packages
import { db, user as userTable } from "@repo/db";
import { eq } from "drizzle-orm";

// ** import types
import type { Env } from "../types";

export default async function checkUserRole(
  userId: string,
  _env: Env,
): Promise<boolean> {
  const users = await db
    .select()
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1);

  if (users.length === 0) {
    return false;
  }

  const user = users[0];
  return user?.role === "super_admin" || user?.role === "admin";
}
