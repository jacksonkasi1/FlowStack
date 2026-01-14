// ** import core packages
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";

// ** import utils
import { createR2Client } from "./client";

// ** import types
import type { Env, FileObject, UploadOptions } from "./types";

function generateFilePath(fileName: string, organizationId?: string): string {
  const timestamp = Date.now();
  const uniqueId = nanoid(8);
  const sanitizedName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .replace(/^\.+/, "") // Remove leading dots
    .replace(/\.{2,}/g, "."); // Collapse consecutive dots
  const prefix = organizationId ? `uploads/${organizationId}` : "uploads";
  return `${prefix}/${timestamp}-${uniqueId}-${sanitizedName}`;
}

export async function r2GetSignedUploadUrl(
  fileName: string,
  env: Env,
  options?: UploadOptions,
): Promise<{ signedUrl: string; filePath: string }> {
  const client = createR2Client(env);
  const filePath = generateFilePath(fileName, options?.organizationId);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filePath,
    ContentType: options?.contentType,
  });

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: options?.expiresIn || 3600,
  });

  return { signedUrl, filePath };
}

export async function r2UploadBuffer(
  buffer: Buffer | Uint8Array,
  fileName: string,
  env: Env,
  options?: UploadOptions,
): Promise<FileObject> {
  const client = createR2Client(env);
  const filePath = generateFilePath(fileName, options?.organizationId);

  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: filePath,
    Body: buffer,
    ContentType: options?.contentType,
  });

  await client.send(command);

  const url = env.R2_PUBLIC_URL ? `${env.R2_PUBLIC_URL}/${filePath}` : filePath;

  return {
    key: filePath,
    url,
    size: buffer.length,
    contentType: options?.contentType,
  };
}
