import fs from "fs";
const t = fs.readFileSync(process.env.TEMP + "/fj-home2.html", "utf8");
const i = t.indexOf('href="/login"');
console.log(JSON.stringify(t.slice(i, i + 140)));
console.log("has_登入", t.includes("登入"));
console.log("has_登录", t.includes("登录"));
