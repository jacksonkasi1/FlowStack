/* eslint-disable no-control-regex -- Reject control characters in storage keys. */
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const safePath = z
  .string()
  .min(1)
  .max(2048)
  .refine(
    (value) => !/\.\.|[\\\x00-\x1f]|^\//.test(value),
    "Invalid file path",
  );
export const fileQuery = zValidator("query", z.object({ filePath: safePath }));
export const uploadQuery = zValidator(
  "query",
  z.object({
    fileName: z
      .string()
      .min(1)
      .max(255)
      .refine(
        (value) => !/\.\.|[/\\\x00-\x1f]/.test(value),
        "Invalid file name",
      ),
    contentType: z.string().min(1).max(255).optional(),
    organizationId: z.string().min(1).max(128).optional(),
  }),
);
export const listQuery = zValidator(
  "query",
  z.object({
    prefix: safePath.optional(),
    maxKeys: z.coerce.number().int().min(1).max(1000).optional(),
    continuationToken: z.string().min(1).max(4096).optional(),
  }),
);

export function userPrefix(userId: string) {
  return `uploads/users/${encodeURIComponent(userId)}/`;
}
export function organizationPrefix(organizationId: string) {
  return `uploads/organizations/${encodeURIComponent(organizationId)}/`;
}
export function ownsPath(path: string, prefixes: readonly string[]) {
  return (
    safePath.safeParse(path).success &&
    prefixes.some((prefix) => path.startsWith(prefix))
  );
}
