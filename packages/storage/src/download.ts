// ** import core packages
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ** import utils
import { createR2Client } from "./client";

// ** import types
import type { DownloadResult, Env } from "./types";

export async function r2GetSignedDownloadUrl(
  filePath: string,
  env: Env,
  options?: { expiresIn?: number },
): Promise<string> {
  const client = createR2Client(env);

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filePath,
  });

  return getSignedUrl(client, command, {
    expiresIn: options?.expiresIn || 3600,
  });
}

export async function r2DownloadFile(
  filePath: string,
  env: Env,
): Promise<DownloadResult> {
  const client = createR2Client(env);

  const command = new GetObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filePath,
  });

  const response = await client.send(command);

  if (!response.Body) {
    throw new Error(`File not found: ${filePath}`);
  }

  const data = await response.Body.transformToByteArray();

  return {
    data,
    contentType: response.ContentType,
    size: response.ContentLength,
  };
}
