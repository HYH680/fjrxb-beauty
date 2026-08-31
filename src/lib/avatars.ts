/**
 * Preset catalog — PNGs under `public/avatars/presets/`.
 * 16 photorealistic portraits with diverse people and solid-color backgrounds.
 */
export const AVATAR_PRESET_IDS = [
  "avatar-01",
  "avatar-02",
  "avatar-03",
  "avatar-04",
  "avatar-05",
  "avatar-06",
  "avatar-07",
  "avatar-08",
  "avatar-09",
  "avatar-10",
  "avatar-11",
  "avatar-12",
  "avatar-13",
  "avatar-14",
  "avatar-15",
  "avatar-16",
] as const;

export type AvatarPresetId = (typeof AVATAR_PRESET_IDS)[number];

export const AVATAR_PRESET_PREFIX = "/avatars/presets/";
export const AVATAR_UPLOAD_API_PREFIX = "/api/avatars/";

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const AVATAR_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export function presetAvatarUrl(id: AvatarPresetId | string): string {
  return `${AVATAR_PRESET_PREFIX}${id}.png`;
}

export const AVATAR_PRESETS = AVATAR_PRESET_IDS.map((id) => ({
  id,
  url: presetAvatarUrl(id),
}));

export function isPresetAvatarUrl(url: string): boolean {
  if (!url.startsWith(AVATAR_PRESET_PREFIX) || !url.endsWith(".png")) {
    return false;
  }
  const id = url.slice(AVATAR_PRESET_PREFIX.length, -".png".length);
  // Only the 16 on-disk presets are valid; stale IDs fall back to the default preset.
  return /^avatar-(0[1-9]|1[0-6])$/.test(id);
}

export function isUploadedAvatarUrl(url: string): boolean {
  if (!url.startsWith(AVATAR_UPLOAD_API_PREFIX)) return false;
  const name = url.slice(AVATAR_UPLOAD_API_PREFIX.length);
  return /^[a-zA-Z0-9._-]+\.(jpe?g|png|webp|gif)$/i.test(name);
}

export function isAllowedAvatarUrl(url: string): boolean {
  return isPresetAvatarUrl(url) || isUploadedAvatarUrl(url);
}

/** Stable default preset from user id (existing users without avatarUrl). */
export function defaultAvatarUrlForUserId(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
  }
  const id = AVATAR_PRESET_IDS[hash % AVATAR_PRESET_IDS.length]!;
  return presetAvatarUrl(id);
}

export function resolveAvatarUrl(
  avatarUrl: string | null | undefined,
  userId: string
): string {
  if (avatarUrl && isAllowedAvatarUrl(avatarUrl)) return avatarUrl;
  return defaultAvatarUrlForUserId(userId);
}

/** Uploaded files live outside `public/` so deploys don't wipe them. */
export function getAvatarUploadDir(): string {
  if (process.env.AVATAR_UPLOAD_DIR) {
    return process.env.AVATAR_UPLOAD_DIR;
  }
  const cwd = process.cwd().replace(/\\/g, "/");
  if (cwd.endsWith("/.next/standalone") || cwd.endsWith(".next/standalone")) {
    return `${cwd}/../../data/uploads/avatars`;
  }
  return `${cwd}/data/uploads/avatars`;
}

export function sanitizeAvatarFilename(name: string): string | null {
  const base = name.replace(/\\/g, "/").split("/").pop()?.toLowerCase() ?? "";
  if (!/^[a-z0-9._-]+\.(jpe?g|png|webp)$/.test(base)) return null;
  if (base.includes("..")) return null;
  return base;
}

