#!/usr/bin/env node
/**
 * Remove bad A records for the shop domain via DNSPod classic API.
 *
 * Env: DNSPOD_LOGIN_TOKEN="id,token"  (DNSPod 控制台 → API Key)
 * Dry-run: node scripts/fix-dnspod-site-a.mjs
 * Apply:   node scripts/fix-dnspod-site-a.mjs --apply
 */
const DOMAIN = "fjrxb.beauty";
const SITE_IP = "119.28.45.212";
const BAD_IP = "43.156.92.214";
const NAMES = new Set(["@", "www", ""]);

const token = process.env.DNSPOD_LOGIN_TOKEN?.trim();
if (!token || !token.includes(",")) {
  console.error(
    'Set DNSPOD_LOGIN_TOKEN="API_ID,API_TOKEN" then re-run.\n' +
      "Create key: https://console.dnspod.cn/account/token\n" +
      "Or delete manually: DNSPod → fjrxb.beauty → remove A records pointing to " +
      BAD_IP +
      " for @ and www.",
  );
  process.exit(2);
}

const apply = process.argv.includes("--apply");

async function api(action, extra = {}) {
  const body = new URLSearchParams({
    login_token: token,
    format: "json",
    lang: "cn",
    domain: DOMAIN,
    ...extra,
  });
  const res = await fetch(`https://dnsapi.cn/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (data.status?.code !== "1") {
    throw new Error(`${action}: ${data.status?.code} ${data.status?.message}`);
  }
  return data;
}

const list = await api("Record.List");
const records = list.records || [];
console.log(`Found ${records.length} records for ${DOMAIN}`);

const targets = records.filter(
  (r) =>
    r.type === "A" &&
    NAMES.has(r.name) &&
    (r.value === BAD_IP || r.value === SITE_IP),
);

for (const r of records.filter((x) => x.type === "A" && NAMES.has(x.name))) {
  console.log(`  A ${r.name} → ${r.value} (id=${r.id} ttl=${r.ttl})`);
}

const bad = targets.filter((r) => r.value === BAD_IP);
const good = targets.filter((r) => r.value === SITE_IP);

if (bad.length === 0) {
  console.log(`No A → ${BAD_IP} on @/www. Nothing to delete.`);
} else if (!apply) {
  console.log(
    `\nWould delete ${bad.length} bad A record(s). Re-run with --apply to remove.`,
  );
  for (const r of bad) console.log(`  DELETE A ${r.name} → ${r.value} id=${r.id}`);
} else {
  for (const r of bad) {
    await api("Record.Remove", { record_id: r.id });
    console.log(`Deleted A ${r.name} → ${r.value} id=${r.id}`);
  }
}

const haveApex = good.some((r) => r.name === "@" || r.name === "");
const haveWww = good.some((r) => r.name === "www");
if (!haveApex) {
  console.log(`WARN: no A @ → ${SITE_IP}. Add it in DNSPod.`);
}
if (!haveWww) {
  console.log(
    `NOTE: no A www → ${SITE_IP}. Prefer CNAME www → ${DOMAIN}, or add A www → ${SITE_IP}.`,
  );
}

if (apply) {
  console.log("\nWait ~3 minutes for TTL, then: node scripts/check-public-tls.mjs");
}
