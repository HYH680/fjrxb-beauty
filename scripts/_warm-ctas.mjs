import fs from "fs";

const files = [
  "src/components/ChatLauncher.tsx",
  "src/components/AuthLayout.tsx",
  "src/components/ReviewOpsDesk.tsx",
  "src/components/SubscriptionList.tsx",
  "src/components/IntegrationCapabilityPanel.tsx",
  "src/app/error.tsx",
  "src/app/account/page.tsx",
  "src/app/onboarding/page.tsx",
  "src/app/forgot-password/page.tsx",
  "src/app/home/page.tsx",
  "src/app/use/[id]/page.tsx",
  "src/app/products/[id]/page.tsx",
];

const map = [
  [/bg-\[#3b82f6\]/g, "bg-[var(--shelf-accent)]"],
  [/hover:bg-\[#2563eb\]/g, "hover:bg-[var(--shelf-accent-hover)]"],
  [/focus:border-\[#3b82f6\]/g, "focus:border-[var(--shelf-accent)]"],
  [/text-white(?= hover:bg-\[var\(--shelf-accent-hover\)\])/g, "text-[var(--shelf-accent-ink)]"],
  [/shadow-blue-500\/20/g, "shadow-[#c4843c]/25"],
  [/var\(--accent-soft\)/g, "var(--shelf-accent-soft)"],
  [/bg-\[#0b0d10\]/g, "bg-[var(--bg-page)]"],
  [/bg-\[#12151c\]/g, "bg-[var(--bg-surface)]"],
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.log("skip missing", f);
    continue;
  }
  let s = fs.readFileSync(f, "utf8");
  const before = s;
  for (const [re, to] of map) s = s.replace(re, to);
  // Auth buttons: white text on copper -> ink
  if (f.includes("AuthLayout") || f.includes("ChatLauncher")) {
    s = s.replace(
      /bg-\[var\(--shelf-accent\)\]([^\n]*?)text-white/g,
      "bg-[var(--shelf-accent)]$1text-[var(--shelf-accent-ink)]"
    );
  }
  if (s !== before) {
    fs.writeFileSync(f, s);
    console.log("updated", f);
  } else console.log("unchanged", f);
}
