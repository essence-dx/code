import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { auditReleaseEvidencePacket } from "../src/lib/product/release-evidence-audit";

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
  throw new Error("Provide a release evidence packet path with --packet or as the first argument.");
}

const packet = JSON.parse(readFileSync(resolve(packetPath), "utf8")) as unknown;
const audit = auditReleaseEvidencePacket(packet);

if (values.json) {
  console.log(JSON.stringify(audit, null, 2));
} else {
  printAudit(audit);
}

if (audit.status !== "ready" && values["allow-blocked"] !== true) {
  process.exitCode = 1;
}

function printAudit(auditResult: ReturnType<typeof auditReleaseEvidencePacket>) {
  console.log(auditResult.summary);
  console.log(`Status: ${auditResult.status.toUpperCase()}`);
  console.log(`Release gate: ${auditResult.releaseScore}/100`);
  console.log(`Evidence: ${auditResult.evidenceScore}/100`);

  const blockers = [
    ...auditResult.errors.map((error) => `Error: ${error}`),
    ...auditResult.missingRequirements.map((requirement) => `Missing ${requirement.label}: ${requirement.detail}`),
    ...auditResult.staleRequirements.map((requirement) => `Stale ${requirement.label}: ${requirement.detail}`),
    ...auditResult.blockedGates.map((gate) => `Blocked ${gate.label}: ${gate.detail}`),
    ...auditResult.warningGates.map((gate) => `Warning ${gate.label}: ${gate.detail}`),
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
