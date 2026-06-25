import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { auditDesktopVerificationEvidencePacket } from "../src/lib/desktop/desktop-evidence-audit";

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    packet: { type: "string", short: "p" },
    json: { type: "boolean" },
    "allow-blocked": { type: "boolean" },
  },
});

const packetPath = stringValue(values.packet) || stringValue(positionals[0]);

if (!packetPath) {
  throw new Error("Provide a desktop evidence packet path with --packet or as the first argument.");
}

const packet = JSON.parse(readFileSync(resolve(packetPath), "utf8")) as unknown;
const audit = auditDesktopVerificationEvidencePacket(packet);

if (values.json) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  printAudit(audit);
}

if (audit.status !== "ready" && values["allow-blocked"] !== true) {
  process.exitCode = 1;
}

function printAudit(auditResult: ReturnType<typeof auditDesktopVerificationEvidencePacket>) {
  console.log(auditResult.summary);
  console.log(`Status: ${auditResult.status.toUpperCase()}`);
  console.log(`Entries: ${auditResult.entryCount}`);
  console.log(`Ready entries: ${auditResult.readyCount}`);

  const blockers = [
    ...auditResult.errors.map((error) => `Error: ${error}`),
    ...(auditResult.readyEntry ? [] : ["Missing ready launch proof: run the desktop checks from the Tauri app."]),
    ...(auditResult.stale ? ["Stale ready launch proof: refresh the desktop checks for this release."] : []),
    ...auditResult.missingRequirements.map((requirement) => `Missing ${requirement.label}: ${requirement.detail}`),
    ...auditResult.limitedRequirements.map((requirement) => `Limited ${requirement.label}: ${requirement.detail}`),
    ...auditResult.failedRequirements.map((requirement) => `Failed ${requirement.label}: ${requirement.detail}`),
  ];

  if (!blockers.length) return;

  console.log("Blockers:");
  for (const blocker of blockers) {
    console.log(`- ${blocker}`);
  }
}

function stringValue(value: string | boolean | undefined) {
  return typeof value === "string" ? value.trim() : "";
}
