import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseArgs } from "node:util";
import { auditDesktopVerificationEvidencePacket } from "../src/lib/desktop/desktop-evidence-audit";

const evidenceRelativePath = join("desktop-verification", "latest-desktop-evidence.json");
const appFolderNames = ["com.essencefromexistence.kapwing", "Essence Studio", "EssenceStudio", "essence-kapwing"];
const debugTauriBinaryPath = join("src-tauri", "target", "debug", process.platform === "win32" ? "app.exe" : "app");
const minimumProofRunFreeBytes = 12 * 1024 * 1024 * 1024;
const minimumExistingBinaryProofFreeBytes = 2 * 1024 * 1024 * 1024;

const { values } = parseArgs({
  options: {
    packet: { type: "string", short: "p" },
    "timeout-ms": { type: "string" },
    "allow-blocked": { type: "boolean" },
    "no-launch": { type: "boolean" },
    "keep-alive": { type: "boolean" },
    "force-tauri-dev": { type: "boolean" },
    "existing-binary-only": { type: "boolean" },
  },
});

const startedAt = Date.now();
const timeoutMs = positiveNumber(values["timeout-ms"], 180_000);
const explicitPacketPath = stringValue(values.packet);
let tauriProcess: ChildProcess | null = null;
let nextProcess: ChildProcess | null = null;
let tauriExitCode: number | null = null;

if (values["no-launch"] !== true) {
  const launchMode = chooseLaunchMode();
  assertProofRunnerDiskHeadroom(launchMode);

  if (launchMode === "existing-binary") {
    nextProcess = startProcess("bun", ["run", "dev"], "Next dev");
    await waitForDevServer();
    tauriProcess = startProcess(resolve(debugTauriBinaryPath), [], "Tauri debug binary");
  } else {
    tauriProcess = startProcess("bun", ["run", "tauri:dev"], "Tauri dev", {
      RUSTFLAGS: proofRunnerRustFlags(),
    });
  }
}

try {
  const packetPath = await waitForEvidencePacket();
  const audit = auditDesktopVerificationEvidencePacket(readEvidencePacket(packetPath));

  console.log(`Desktop evidence packet: ${packetPath}`);
  console.log(audit.summary);
  console.log(`Status: ${audit.status.toUpperCase()}`);

  if (audit.status !== "ready" && values["allow-blocked"] !== true) {
    process.exitCode = 1;
  }
} finally {
  if (tauriProcess && values["keep-alive"] !== true) {
    stopProcessTree(tauriProcess);
  }
  if (nextProcess && values["keep-alive"] !== true) {
    stopProcessTree(nextProcess);
  }
}

function chooseLaunchMode() {
  if (values["existing-binary-only"] === true) {
    if (!existsSync(debugTauriBinaryPath)) {
      throw new Error(
        `No existing Tauri debug binary was found at ${debugTauriBinaryPath}. ` +
          "Run bun run tauri:dev once when you intentionally want to rebuild, then rerun bun run desktop:proof:refresh.",
      );
    }

    return "existing-binary" as const;
  }

  if (values["force-tauri-dev"] === true) return "tauri-dev" as const;
  return existsSync(debugTauriBinaryPath) ? ("existing-binary" as const) : ("tauri-dev" as const);
}

function startProcess(command: string, args: string[], label: string, env: Record<string, string | undefined> = {}) {
  const child = spawn(command, args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...env,
      ESSENCE_DESKTOP_AUTO_VERIFY: "1",
    },
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout?.on("data", (chunk) => process.stdout.write(chunk));
  child.stderr?.on("data", (chunk) => process.stderr.write(chunk));
  child.on("exit", (code) => {
    if (child === tauriProcess) {
      tauriExitCode = code ?? 0;
    }
  });

  console.log(`${label} started.`);
  return child;
}

async function waitForEvidencePacket() {
  if (explicitPacketPath) {
    const packetPath = resolve(explicitPacketPath);
    if (!existsSync(packetPath)) {
      throw new Error(`Desktop evidence packet was not found at ${packetPath}.`);
    }

    return packetPath;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const packetPath = findFreshEvidencePacket();
    if (packetPath) return packetPath;

    if (tauriExitCode !== null) {
      throw new Error(`Tauri proof launch exited before evidence was written. Exit code: ${tauriExitCode}.`);
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out after ${timeoutMs}ms waiting for ${evidenceRelativePath}.`);
}

function findFreshEvidencePacket() {
  for (const candidate of evidencePacketCandidates()) {
    if (!existsSync(candidate)) continue;

    const stats = statSync(candidate);
    if (stats.isFile() && stats.mtimeMs >= startedAt - 2_000) {
      return candidate;
    }
  }

  return null;
}

function evidencePacketCandidates() {
  const roots = [process.env.LOCALAPPDATA, process.env.APPDATA].filter((value): value is string => Boolean(value));
  const candidates = new Set<string>();

  for (const root of roots) {
    for (const appFolderName of appFolderNames) {
      candidates.add(join(root, appFolderName, evidenceRelativePath));
    }

    for (const folder of matchingAppDataFolders(root)) {
      candidates.add(join(folder, evidenceRelativePath));
    }
  }

  return [...candidates];
}

function matchingAppDataFolders(root: string) {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /essence|kapwing|studio|com\.essence/i.test(entry.name))
      .map((entry) => join(root, entry.name));
  } catch {
    return [];
  }
}

function stopProcessTree(child: ChildProcess) {
  if (!child.pid) return;

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
    return;
  }

  child.kill("SIGTERM");
}

function readEvidencePacket(packetPath: string) {
  return JSON.parse(readFileSync(packetPath, "utf8").replace(/^\uFEFF/, "")) as unknown;
}

function proofRunnerRustFlags() {
  const existing = process.env.RUSTFLAGS?.trim();
  if (process.platform !== "win32") return existing;

  const pdbFlag = "-C link-arg=/PDB:NONE";
  if (!existing) return pdbFlag;
  if (existing.includes("/PDB:NONE")) return existing;
  return `${existing} ${pdbFlag}`;
}

function assertProofRunnerDiskHeadroom(launchMode: "existing-binary" | "tauri-dev") {
  const freeBytes = readFreeDiskBytes(process.cwd());
  const minimumBytes = launchMode === "existing-binary" ? minimumExistingBinaryProofFreeBytes : minimumProofRunFreeBytes;
  if (freeBytes === null || freeBytes >= minimumBytes) return;

  throw new Error(
    `Desktop proof needs at least ${formatBytes(minimumBytes)} free on the workspace drive before launching ${launchMode}. ` +
      `Only ${formatBytes(freeBytes)} is available. Free disk space or remove stale build artifacts, then rerun bun run desktop:proof:dev.`,
  );
}

async function waitForDevServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (await canReachDevServer()) return;
    await sleep(1_000);
  }

  throw new Error("Timed out waiting for http://localhost:3000 before launching the existing Tauri binary.");
}

async function canReachDevServer() {
  try {
    const response = await fetch("http://localhost:3000", { redirect: "manual" });
    return response.status >= 200 && response.status < 500;
  } catch {
    return false;
  }
}

function readFreeDiskBytes(path: string) {
  if (process.platform === "win32") {
    const driveName = driveLetter(path);
    if (!driveName) return null;

    const result = spawnSync(
      "powershell",
      ["-NoProfile", "-Command", `(Get-PSDrive -Name '${driveName}').Free`],
      { encoding: "utf8" },
    );
    const parsed = Number(result.stdout.trim());
    return Number.isFinite(parsed) ? parsed : null;
  }

  const result = spawnSync("df", ["-k", path], { encoding: "utf8" });
  const availableKilobytes = result.stdout.trim().split(/\s+/).at(-3);
  const parsed = Number(availableKilobytes);
  return Number.isFinite(parsed) ? parsed * 1024 : null;
}

function driveLetter(path: string) {
  const match = /^[a-zA-Z]:/.exec(resolve(path));
  return match?.[0]?.slice(0, 1).toUpperCase() ?? null;
}

function formatBytes(value: number) {
  return `${(value / 1024 / 1024 / 1024).toFixed(1)} GiB`;
}

function positiveNumber(value: string | boolean | undefined, fallback: number) {
  if (typeof value !== "string") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function stringValue(value: string | boolean | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function sleep(ms: number) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}
