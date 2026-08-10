import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const typecheck = spawnSync(process.execPath, [join("node_modules", "typescript", "bin", "tsc"), "--noEmit"], { stdio: "inherit" });
if (typecheck.status !== 0) process.exit(typecheck.status ?? 1);

const forbidden = ["service_role", "AI Insight", "AI Recommendation", "AI Score"];
const roots = ["app", "components", "lib", "middleware.ts"];
const files = [];
function walk(path) {
  if (!existsSync(path)) return;
  if (statSync(path).isDirectory()) {
    for (const child of readdirSync(path)) walk(join(path, child));
    return;
  }
  const content = readFileSync(path, { encoding: "utf8" });
  if (path.endsWith(".ts") || path.endsWith(".tsx")) files.push([path, content]);
}
for (const root of roots) walk(root);
for (const [file, content] of files) {
  for (const token of forbidden) {
    if (content.includes(token)) {
      console.error(`lint: forbidden product token "${token}" in ${file}`);
      process.exit(1);
    }
  }
}
console.log(`lint: ${files.length} TypeScript source files checked`);
