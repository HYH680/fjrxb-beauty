import fs from "fs";
const s = fs.readFileSync("src/components/ChatAssistant.tsx", "utf8");
const i = s.indexOf('BrandMark className="h-16');
console.log("brand idx", i);
console.log(JSON.stringify(s.slice(i, i + 600)));
const j = s.indexOf("recommendedProducts &&");
console.log("---rec---");
console.log(JSON.stringify(s.slice(j, j + 700)));
