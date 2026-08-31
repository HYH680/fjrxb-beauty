import fs from "fs";

const files = [
  "src/app/account/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/login/page.tsx",
  "src/app/onboarding/page.tsx",
  "src/app/register/page.tsx",
  "src/app/settings/page.tsx",
  "src/app/settings/integrations/page.tsx",
  "src/app/error.tsx",
];

for (const f of files) {
  const s = fs.readFileSync(f, "utf8");
  const lines = s.split(/\r?\n/);
  console.log("\n===", f, "===");
  lines.forEach((line, i) => {
    if (line.includes("\uFFFD") || /�/.test(line)) {
      console.log(String(i + 1) + ":" + line);
    }
  });
}
