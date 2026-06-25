import { copyFile, mkdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourceDir = join(root, "node_modules", "@ffmpeg", "core", "dist", "umd");
const targetDir = join(root, "public", "ffmpeg");
const assets = ["ffmpeg-core.js", "ffmpeg-core.wasm"];

await mkdir(targetDir, { recursive: true });

for (const asset of assets) {
  const source = join(sourceDir, asset);
  const target = join(targetDir, asset);
  const sourceStat = await stat(source);

  try {
    const targetStat = await stat(target);
    if (targetStat.size === sourceStat.size) continue;
  } catch {
    // Missing assets are copied below.
  }

  await copyFile(source, target);
}
