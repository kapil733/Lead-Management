import "server-only";

import { mkdir, writeFile, readFile, unlink } from "fs/promises";
import path from "path";
import { put, del, get } from "@vercel/blob";
import { env } from "@/env";

const LOCAL_PREFIX = "local:";
const ROOT = path.join(process.cwd(), ".data", "uploads");

export async function storePayrollFile(input: {
  employeeId: string;
  fileName: string;
  bytes: Buffer;
  contentType: string;
}): Promise<{ blobUrl: string }> {
  const safeName = input.fileName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);

  if (env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `payroll/${input.employeeId}/${Date.now()}-${safeName}`,
      input.bytes,
      {
        access: "private",
        contentType: input.contentType,
        token: env.BLOB_READ_WRITE_TOKEN,
      },
    );
    return { blobUrl: blob.url };
  }

  const dir = path.join(ROOT, input.employeeId);
  await mkdir(dir, { recursive: true });
  const rel = path.join(input.employeeId, `${Date.now()}-${safeName}`);
  await writeFile(path.join(ROOT, rel), input.bytes);
  return { blobUrl: `${LOCAL_PREFIX}${rel}` };
}

export function isLocalBlobUrl(blobUrl: string): boolean {
  return blobUrl.startsWith(LOCAL_PREFIX);
}

export async function readPayrollFile(
  blobUrl: string,
): Promise<{ bytes: Buffer; contentType: string }> {
  if (isLocalBlobUrl(blobUrl)) {
    const rel = blobUrl.slice(LOCAL_PREFIX.length);
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(path.resolve(ROOT) + path.sep) && full !== path.resolve(ROOT)) {
      throw new Error("Invalid path");
    }
    const bytes = await readFile(full);
    return { bytes, contentType: "application/octet-stream" };
  }

  const result = await get(blobUrl, {
    access: "private",
    token: env.BLOB_READ_WRITE_TOKEN,
  });
  if (!result?.stream) {
    throw new Error("Blob not found");
  }
  const reader = result.stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  const bytes = Buffer.concat(chunks.map((c) => Buffer.from(c)));
  return {
    bytes,
    contentType:
      result.blob.contentType ||
      result.headers.get("content-type") ||
      "application/octet-stream",
  };
}

export async function deletePayrollFile(blobUrl: string): Promise<void> {
  if (isLocalBlobUrl(blobUrl)) {
    const rel = blobUrl.slice(LOCAL_PREFIX.length);
    const full = path.resolve(ROOT, rel);
    if (!full.startsWith(path.resolve(ROOT) + path.sep)) return;
    try {
      await unlink(full);
    } catch {
      // ignore missing
    }
    return;
  }
  if (env.BLOB_READ_WRITE_TOKEN) {
    await del(blobUrl, { token: env.BLOB_READ_WRITE_TOKEN });
  }
}
