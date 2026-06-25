import { createHash, createHmac } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, extname, join, relative } from "node:path";

type ReleaseArtifact = {
  path: string;
  sha256: string;
  sizeBytes: number;
};

const root = process.cwd();
const dryRun = process.argv.includes("--dry-run");
const artifactRoot =
  process.env.ESSENCE_EXCEL_TAURI_ARTIFACT_DIR ??
  join(root, "src-tauri", "target", "release", "bundle");
const outputPath =
  process.env.ESSENCE_EXCEL_RELEASE_MANIFEST ??
  join(root, "release", "tauri-release-manifest.json");
const signingSecret = process.env.ESSENCE_EXCEL_RELEASE_SIGNING_SECRET;
const packageJson = JSON.parse(
  readFileSync(join(root, "package.json"), "utf8"),
) as { name?: string; version?: string };
const tauriConfig = JSON.parse(
  readFileSync(join(root, "src-tauri", "tauri.conf.json"), "utf8"),
) as { productName?: string; version?: string };

function isReleaseArtifact(path: string) {
  const lowerPath = path.toLowerCase();
  const extension = extname(lowerPath);

  return (
    [".appimage", ".deb", ".dmg", ".exe", ".msi", ".rpm", ".zip"].includes(
      extension,
    ) || lowerPath.endsWith(".tar.gz")
  );
}

function listFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    const stats = statSync(path);

    return stats.isDirectory() ? listFiles(path) : [path];
  });
}

function sha256(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (typeof value === "object" && value !== null) {
    const record = value as Record<string, unknown>;

    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function getArtifacts(): ReleaseArtifact[] {
  if (!existsSync(artifactRoot)) {
    return [];
  }

  return listFiles(artifactRoot)
    .filter(isReleaseArtifact)
    .map((path) => ({
      path: relative(root, path).replaceAll("\\", "/"),
      sha256: sha256(path),
      sizeBytes: statSync(path).size,
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

const artifacts = getArtifacts();

if (artifacts.length === 0 && !dryRun) {
  throw new Error(`No Tauri release artifacts found in ${artifactRoot}.`);
}

if (!signingSecret && !dryRun) {
  throw new Error("ESSENCE_EXCEL_RELEASE_SIGNING_SECRET is required.");
}

const manifest = {
  artifactRoot: relative(root, artifactRoot).replaceAll("\\", "/"),
  artifacts,
  generatedAt: new Date().toISOString(),
  packageName: packageJson.name ?? "essence-excel",
  productName: tauriConfig.productName ?? "Essence Excel",
  version: packageJson.version ?? tauriConfig.version ?? "0.0.0",
};
const payload = stableStringify(manifest);
const signature = createHmac("sha256", signingSecret ?? "dry-run-secret")
  .update(payload)
  .digest("hex");
const signedManifest = {
  ...manifest,
  signature: {
    algorithm: "hmac-sha256",
    keyEnv: "ESSENCE_EXCEL_RELEASE_SIGNING_SECRET",
    value: signature,
  },
};

if (dryRun) {
  console.log(
    `Release manifest dry run passed for ${basename(artifactRoot)} with ${artifacts.length} artifact(s).`,
  );
} else {
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(signedManifest, null, 2)}\n`);
  console.log(`Wrote signed Tauri release manifest to ${outputPath}.`);
}
