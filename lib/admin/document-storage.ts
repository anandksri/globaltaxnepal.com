import "server-only";

import { chmod, mkdir, realpath, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

export const maxDocumentSize = 10 * 1024 * 1024;

const fileTypes = {
  ".pdf": { mimeType: "application/pdf", signature: (bytes: Buffer) => bytes.subarray(0, 5).toString() === "%PDF-" },
  ".jpg": { mimeType: "image/jpeg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  ".jpeg": { mimeType: "image/jpeg", signature: (bytes: Buffer) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  ".png": { mimeType: "image/png", signature: (bytes: Buffer) => bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  ".webp": { mimeType: "image/webp", signature: (bytes: Buffer) => bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP" },
} as const;

export type AllowedDocumentMime = "application/pdf" | "image/jpeg" | "image/png" | "image/webp";

async function getStorageRoot() {
  const configured = process.env.DOCUMENT_STORAGE_PATH?.trim();
  const configuredRoot = path.resolve(configured || path.join(process.cwd(), "private-documents"));
  await mkdir(configuredRoot, { recursive: true, mode: 0o700 });
  await chmod(configuredRoot, 0o700);
  const root = await realpath(configuredRoot);
  const publicRoot = path.resolve(process.cwd(), "public");
  const realPublicRoot = await realpath(publicRoot);
  const relative = path.relative(realPublicRoot, root);
  if (relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative))) {
    throw new Error("DOCUMENT_STORAGE_PATH_MUST_BE_PRIVATE");
  }
  return root;
}

function validStorageKey(key: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(pdf|jpg|jpeg|png|webp)$/.test(key);
}

export async function getDocumentPath(storageKey: string) {
  if (!validStorageKey(storageKey)) throw new Error("INVALID_DOCUMENT_STORAGE_KEY");
  return path.join(await getStorageRoot(), storageKey);
}

export function validateDocumentBytes(
  originalName: string,
  mimeType: string,
  bytes: Buffer,
) {
  const extension = path.extname(originalName).toLowerCase() as keyof typeof fileTypes;
  const definition = fileTypes[extension];
  if (!definition || definition.mimeType !== mimeType || !definition.signature(bytes)) return null;
  const storageKey = `${randomUUID()}${extension}`;
  return { storageKey, mimeType: definition.mimeType };
}

export async function storeDocument(storageKey: string, bytes: Buffer) {
  const root = await getStorageRoot();
  const filePath = path.join(root, storageKey);
  await writeFile(filePath, bytes, { flag: "wx", mode: 0o600 });
  return filePath;
}

export async function removeStoredDocument(storageKey: string) {
  await rm(await getDocumentPath(storageKey), { force: true });
}
