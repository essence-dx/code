import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const forbiddenVisibleTerms = [
  "Kapwing",
  "Better Auth",
  "Drizzle",
  "Turso",
  "Groq",
  "Vercel AI",
  "AI SDK",
  "shadcn",
];

const tsxFiles = findFiles(fileURLToPath(new URL("../src", import.meta.url)), ".tsx");
const violations: string[] = [];

for (const file of tsxFiles) {
  const source = readFileSync(file, "utf8");
  const visibleText = [
    ...source.matchAll(/>([^<>{}]+)</g),
    ...source.matchAll(/(?:aria-label|title|placeholder|alt)=["']([^"']+)["']/g),
  ]
    .map((match) => match[1])
    .join("\n");

  for (const term of forbiddenVisibleTerms) {
    if (visibleText.toLowerCase().includes(term.toLowerCase())) {
      violations.push(`${file}: visible UI contains "${term}"`);
    }
  }
}

assert.deepEqual(violations, []);
console.log("Product language check passed.");

function findFiles(root: string, extension: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...findFiles(path, extension));
    } else if (path.endsWith(extension)) {
      files.push(path);
    }
  }

  return files;
}
