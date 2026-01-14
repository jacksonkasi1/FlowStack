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
  let filePath: string;

  if (env.R2_PUBLIC_URL && fileUrl.startsWith(env.R2_PUBLIC_URL)) {
    filePath = fileUrl.replace(env.R2_PUBLIC_URL, "").replace(/^\//, "");
  } else {
    // Parse URL to extract pathname
    try {
      const url = new URL(fileUrl);
      filePath = url.pathname.replace(/^\//, "");
    } catch {
      throw new Error(`Invalid file URL: ${fileUrl}`);
    }
  }

  if (!filePath) {
    throw new Error("Could not extract file path from URL");
  }

  return r2DeleteFile(filePath, env);
}

export async function r2DeleteMultipleFiles(
  filePaths: string[],
  env: Env,
): Promise<{ success: boolean; deleted: number }> {
  if (filePaths.length === 0) {
    return { success: true, deleted: 0 };
  }

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
