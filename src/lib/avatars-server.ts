import "server-only";
import path from "node:path";

/** Uploaded files live outside public/ so deploys don't wipe them. */
export function getAvatarUploadDir(): string {
  if (process.env.AVATAR_UPLOAD_DIR) {
    return path.resolve(process.env.AVATAR_UPLOAD_DIR);
  }
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/.next/standalone") || cwd.endsWith(".next/standalone")) {
    return path.join(process.cwd(), "..", "..", "data", "uploads", "avatars");
  }
  return path.join(process.cwd(), "data", "uploads", "avatars");
}

export function sanitizeAvatarFilename(name: string): string | null {
  const base = path.basename(name).toLowerCase();
  if (!/^[a-z0-9._-]+\.(jpe?g|png|webp|gif)$/.test(base)) return null;
  if (base.includes("..")) return null;
  return base;
}