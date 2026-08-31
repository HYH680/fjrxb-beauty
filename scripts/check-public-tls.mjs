#!/usr/bin/env node
/**
 * Fail if fjrxb.beauty / www resolve to any IP other than the website host,
 * or if HTTPS with SNI fails on any advertised A record.
 *
 * Usage: node scripts/check-public-tls.mjs
 */
import dns from "node:dns/promises";
import tls from "node:tls";
import { setDefaultResultOrder } from "node:dns";

setDefaultResultOrder("ipv4first");

const SITE_IP = "119.28.45.212";
const FORBIDDEN_IPS = new Set(["43.156.92.214"]);
const HOSTS = ["fjrxb.beauty", "www.fjrxb.beauty"];
const RESOLVERS = ["8.8.8.8", "1.1.1.1", "119.29.29.29"];

async function resolveVia(host, server) {
  const resolver = new dns.Resolver();
  resolver.setServers([server]);
  try {
    return await resolver.resolve4(host);
  } catch (err) {
    return { error: String(err?.message || err) };
  }
}

function tlsProbe(ip, servername) {
  return new Promise((resolve) => {
    const socket = tls.connect(
      {
        host: ip,
        port: 443,
        servername,
        minVersion: "TLSv1.2",
        rejectUnauthorized: true,
        timeout: 10000,
      },
      () => {
        const cert = socket.getPeerCertificate();
        const out = {
          ok: true,
          version: socket.getProtocol(),
          cipher: socket.getCipher()?.name,
          san: cert?.subjectaltname || "",
          cn: cert?.subject?.CN || "",
        };
        socket.end();
        resolve(out);
      },
    );
    socket.on("error", (err) => {
      resolve({ ok: false, error: err.message });
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "timeout" });
    });
  });
}

let failed = false;

console.log(`Expected website IP: ${SITE_IP}`);
console.log(`Forbidden (Reality/proxy) IPs: ${[...FORBIDDEN_IPS].join(", ")}\n`);

for (const host of HOSTS) {
  const allIps = new Set();
  for (const server of RESOLVERS) {
    const addrs = await resolveVia(host, server);
    if (addrs?.error) {
      console.log(`[DNS] ${host} via ${server}: ERROR ${addrs.error}`);
      failed = true;
      continue;
    }
    console.log(`[DNS] ${host} via ${server}: ${addrs.join(", ")}`);
    for (const ip of addrs) allIps.add(ip);
  }

  for (const ip of allIps) {
    if (FORBIDDEN_IPS.has(ip) || ip !== SITE_IP) {
      console.log(
        `[FAIL] ${host} advertises ${ip} — remove this A record in DNSPod (keep only ${SITE_IP}).`,
      );
      failed = true;
    }
    const probe = await tlsProbe(ip, host);
    if (probe.ok) {
      console.log(
        `[TLS] ${host} @ ${ip}: ${probe.version} ${probe.cipher} CN=${probe.cn}`,
      );
    } else {
      console.log(`[TLS] ${host} @ ${ip}: FAIL ${probe.error}`);
      failed = true;
    }
  }
  console.log("");
}

if (failed) {
  console.error(
    "Public TLS check FAILED. Fix DNSPod A records for @ and www, then wait TTL (~3m) and re-run.",
  );
  process.exit(1);
}

console.log("Public TLS check OK.");
