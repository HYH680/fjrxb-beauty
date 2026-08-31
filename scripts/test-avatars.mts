/**
 * Unit tests for src/lib/avatars.ts (run with node --experimental-strip-types).
 * Verifies the preset catalog switched from 48 SVGs to 16 PNGs.
 */
import assert from "node:assert";
import {
  AVATAR_PRESET_IDS,
  AVATAR_PRESETS,
  presetAvatarUrl,
  isPresetAvatarUrl,
  isAllowedAvatarUrl,
  resolveAvatarUrl,
  defaultAvatarUrlForUserId,
  isUploadedAvatarUrl,
} from "../src/lib/avatars.ts";

let passed = 0;
function ok(name, fn) {
  try {
    fn();
    passed++;
    console.log("PASS", name);
  } catch (e) {
    console.log("FAIL", name, "-", e.message);
    process.exitCode = 1;
  }
}

ok("catalog has exactly 16 presets", () => {
  assert.equal(AVATAR_PRESET_IDS.length, 16);
  assert.equal(AVATAR_PRESETS.length, 16);
});

ok("preset URLs end with .png", () => {
  for (const p of AVATAR_PRESETS) {
    assert.match(p.url, /^\/avatars\/presets\/avatar-\d{2}\.png$/);
  }
  assert.equal(presetAvatarUrl("avatar-05"), "/avatars/presets/avatar-05.png");
});

ok("valid new preset URLs accepted (01..16)", () => {
  for (let i = 1; i <= 16; i++) {
    const id = String(i).padStart(2, "0");
    assert.equal(isPresetAvatarUrl(`/avatars/presets/avatar-${id}.png`), true, id);
  }
});

ok("legacy .svg URLs rejected", () => {
  assert.equal(isPresetAvatarUrl("/avatars/presets/avatar-01.svg"), false);
  assert.equal(isPresetAvatarUrl("/avatars/presets/avatar-48.svg"), false);
  assert.equal(isAllowedAvatarUrl("/avatars/presets/avatar-01.svg"), false);
});

ok("out-of-range / malformed IDs rejected", () => {
  assert.equal(isPresetAvatarUrl("/avatars/presets/avatar-17.png"), false);
  assert.equal(isPresetAvatarUrl("/avatars/presets/avatar-00.png"), false);
  assert.equal(isPresetAvatarUrl("/avatars/presets/avatar-1.png"), false);
  assert.equal(isPresetAvatarUrl("/avatars/presets/../avatar-01.png"), false);
  assert.equal(isPresetAvatarUrl("/uploads/avatars/x.png"), false);
  assert.equal(isPresetAvatarUrl(""), false);
});

ok("uploaded avatar URLs still allowed", () => {
  assert.equal(isUploadedAvatarUrl("/api/avatars/abc123.png"), true);
  assert.equal(isAllowedAvatarUrl("/api/avatars/abc123.png"), true);
});

ok("resolveAvatarUrl falls back to a valid preset for stale .svg value", () => {
  const resolved = resolveAvatarUrl("/avatars/presets/avatar-33.svg", "user-1");
  assert.equal(isPresetAvatarUrl(resolved), true, resolved);
});

ok("resolveAvatarUrl(null) returns valid .png preset", () => {
  const resolved = resolveAvatarUrl(null, "user-1");
  assert.equal(isPresetAvatarUrl(resolved), true, resolved);
});

ok("defaultAvatarUrlForUserId stable and valid", () => {
  const a = defaultAvatarUrlForUserId("user-42");
  const b = defaultAvatarUrlForUserId("user-42");
  assert.equal(a, b);
  assert.equal(isPresetAvatarUrl(a), true, a);
});

console.log(`\n${passed} assertions passed${process.exitCode ? " (with failures)" : ""}`);
