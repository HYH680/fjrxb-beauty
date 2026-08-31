import fs from "fs";

const files = [
  "src/app/api/avatars/upload/route.ts",
  "src/app/api/avatars/[file]/route.ts",
];
for (const f of files) {
  let s = fs.readFileSync(f, "utf8");
  s = s.replace(/import \{([^}]+)\} from "@\/lib\/avatars";/m, (m, names) => {
    const parts = names.split(",").map((x) => x.trim()).filter(Boolean);
    const server = parts.filter((p) => /getAvatarUploadDir|sanitizeAvatarFilename/.test(p));
    const client = parts.filter((p) => !/getAvatarUploadDir|sanitizeAvatarFilename/.test(p));
    const out = [];
    if (client.length) out.push(`import { ${client.join(", ")} } from "@/lib/avatars";`);
    if (server.length) out.push(`import { ${server.join(", ")} } from "@/lib/avatars-server";`);
    return out.join("\n");
  });
  fs.writeFileSync(f, s);
  console.log("patched", f);
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
const has =
  !!(pkg.dependencies && pkg.dependencies["server-only"]) ||
  !!(pkg.devDependencies && pkg.devDependencies["server-only"]);
console.log("server-only dep:", has);
if (!has) {
  pkg.dependencies = pkg.dependencies || {};
  pkg.dependencies["server-only"] = "^0.0.1";
  fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  console.log("added server-only to package.json");
}

let nc = fs.readFileSync("next.config.ts", "utf8");
if (!nc.includes("fjrxb.beauty")) {
  nc = nc.replace(
    'allowedDevOrigins: ["127.0.0.1"],',
    'allowedDevOrigins: ["127.0.0.1", "localhost", "fjrxb.beauty", "www.fjrxb.beauty"],'
  );
  fs.writeFileSync("next.config.ts", nc);
  console.log("next.config patched");
} else {
  console.log("next.config ok");
}