import fs from "fs";
import path from "path";
import crypto from "crypto";

/** All uploaded event photos live here and nowhere else. */
export const UPLOAD_ROOT = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));
export const EVENT_UPLOAD_DIR = path.join(UPLOAD_ROOT, "events");
export const EVENT_URL_PREFIX = "/uploads/events/";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export type ImageType = { ext: "jpg" | "png" | "webp"; mime: string };

/** Identify an image by its magic bytes. The client-declared content type is never trusted. */
export function detectImageType(buf: Buffer): ImageType | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return { ext: "jpg", mime: "image/jpeg" };
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return { ext: "png", mime: "image/png" };
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP")
    return { ext: "webp", mime: "image/webp" };
  return null;
}

/** Validates and stores an event photo. Returns the public URL path (never a filesystem path). */
export async function saveEventImage(eventId: string, buf: Buffer): Promise<string> {
  if (buf.length === 0 || buf.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be between 1 byte and 5 MB.");
  }
  const type = detectImageType(buf);
  if (!type) throw new Error("Unsupported image. Upload a JPEG, PNG or WebP file.");
  await fs.promises.mkdir(EVENT_UPLOAD_DIR, { recursive: true });
  const safeId = eventId.replace(/[^a-zA-Z0-9_-]/g, "");
  const fileName = `${safeId}-${crypto.randomBytes(6).toString("hex")}.${type.ext}`;
  await fs.promises.writeFile(path.join(EVENT_UPLOAD_DIR, fileName), buf, { flag: "wx" });
  return `${EVENT_URL_PREFIX}${fileName}`;
}

/** Removes a previously uploaded photo. Ignores anything that is not inside the upload folder. */
export async function deleteUploadedImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !imageUrl.startsWith(EVENT_URL_PREFIX)) return;
  const fileName = path.basename(imageUrl);
  const target = path.join(EVENT_UPLOAD_DIR, fileName);
  if (path.dirname(target) !== EVENT_UPLOAD_DIR) return;
  await fs.promises.unlink(target).catch(() => undefined);
}
