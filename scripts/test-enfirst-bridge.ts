import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { detectLanguage, needBridge } from "../src/lib/enfirst-bridge-lang.ts";

const root = dirname(fileURLToPath(import.meta.url));
const bridgeSrc = readFileSync(join(root, "../src/lib/enfirst-bridge.ts"), "utf8");
assert.match(bridgeSrc, /Do NOT show the anchor/);
assert.match(bridgeSrc, /User text:/);
assert.match(bridgeSrc, /wrapUserMessageForEnfirst/);
assert.doesNotMatch(bridgeSrc, /from "\.\/enfirst-bridge-lang\.ts"/);

assert.equal(detectLanguage("").trigger, false);
assert.equal(needBridge("Hello world"), false);
assert.equal(detectLanguage("你好世界").trigger, true);
assert.equal(detectLanguage("你好世界").primary, "zh");
assert.equal(detectLanguage("こんにちは").trigger, true);
assert.equal(detectLanguage("안녕하세요").trigger, true);
assert.equal(detectLanguage("Привет").trigger, true);
assert.equal(detectLanguage("مرحبا").trigger, true);
assert.equal(detectLanguage("请帮我 run script").trigger, true);
assert.equal(detectLanguage("const x = 1;").trigger, false);

console.log("enfirst bridge tests passed");
