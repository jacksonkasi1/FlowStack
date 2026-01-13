// ** import core packages
import { DeleteObjectCommand, DeleteObjectsCommand } from "@aws-sdk/client-s3";

// ** import utils
import { createR2Client } from "./client";

// ** import types
import type { Env } from "./types";

export async function r2DeleteFile(
  filePath: string,
  env: Env,
): Promise<{ success: boolean }> {
  const client = createR2Client(env);

  const command = new DeleteObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filePath,
  });

  await client.send(command);
  return { success: true };
}

export async function r2DeleteFileByUrl(
  fileUrl: string,
  env: Env,
): Promise<{ success: boolean }> {
  const filePath = fileUrl
    .replace(env.R2_PUBLIC_URL || "", "")
    .replace(/^\//, "");
  return r2DeleteFile(filePath, env);
}

export async function r2DeleteMultipleFiles(
  filePaths: string[],
  env: Env,
): Promise<{ success: boolean; deleted: number }> {
  const client = createR2Client(env);

  const command = new DeleteObjectsCommand({
    Bucket: env.R2_BUCKET_NAME,
    Delete: {
      Objects: filePaths.map((key) => ({ Key: key })),
    },
  });

  const response = await client.send(command);
  return {
    success: true,
    deleted: response.Deleted?.length || 0,
  };
}
