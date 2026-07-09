import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const UPLOAD_ROOT = join(process.cwd(), "uploads");

export function uploadPublicBase(): string {
  return (process.env.UPLOAD_PUBLIC_BASE ?? "").replace(/\/$/, "");
}

/** Save a base64 data-URL image; returns public path `/uploads/...`. */
export async function saveImageUpload(dataUrl: string, kind: string): Promise<string> {
  await mkdir(UPLOAD_ROOT, { recursive: true });
  const match = /^data:image\/([\w+]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!match) {
    throw new Error("Invalid image data.");
  }
  let ext = match[1].toLowerCase().replace("jpeg", "jpg");
  if (!["webp", "jpg", "png"].includes(ext)) ext = "webp";
  const buf = Buffer.from(match[2], "base64");
  if (buf.length > 4 * 1024 * 1024) {
    throw new Error("Image too large (max 4 MB).");
  }
  const name = `${kind}-${randomBytes(8).toString("hex")}.${ext}`;
  await writeFile(join(UPLOAD_ROOT, name), buf);
  return `/uploads/${name}`;
}

export function toPublicUploadUrl(relativePath: string): string {
  if (!relativePath) return "";
  if (relativePath.startsWith("http://") || relativePath.startsWith("https://")) return relativePath;
  const base = uploadPublicBase();
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return base ? `${base}${path}` : path;
}
