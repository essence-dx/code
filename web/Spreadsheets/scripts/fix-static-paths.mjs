import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, extname, resolve } from "path";

const outDir = resolve(process.cwd(), "out");

function fixHtml(filePath) {
  let content = readFileSync(filePath, "utf-8");
  const orig = content;
  content = content.replaceAll(/\/(_next\/)/g, "./$1");
  content = content.replaceAll(/"\/(_next\/)/g, "\"./$1");
  if (content !== orig) {
    writeFileSync(filePath, content, "utf-8");
    console.log("  fixed", filePath);
    return true;
  }
  return false;
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      walk(p);
    } else if (name.endsWith(".html")) {
      fixHtml(p);
    }
  }
}

console.log("Fixing static export paths...");
walk(outDir);
console.log("Done.");
