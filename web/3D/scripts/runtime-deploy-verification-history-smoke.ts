import { strict as assert } from "node:assert";
import type { RuntimeQaPacket } from "@/features/projects/runtime-qa-packet";
import {
  createRuntimeDeployVerificationHistory,
  type RuntimeDeployVerificationRecord,
} from "@/features/projects/runtime-deploy-verification-history";

const packet = {
  summary: {
    packetHash: "sha256:packet-current",
    qaScore: 100,
    sceneVersionHash: "sha256:scene-version",
    status: "ready",
  },
} as RuntimeQaPacket;

const records: RuntimeDeployVerificationRecord[] = [
  {
    alias: "essence-spline.vercel.app",
    checkedAt: "2026-06-05T16:00:00.000Z",
    commitHash: "abc1234",
    deploymentUrl: "https://essence-spline-git-main.vercel.app",
    packetHash: "sha256:packet-previous",
    smokeStatus: "ready",
  },
  {
    alias: "essence-spline.vercel.app",
    checkedAt: "2026-06-05T17:00:00.000Z",
    commitHash: "def5678",
    deploymentUrl: "https://essence-spline-prod.vercel.app",
    packetHash: "sha256:packet-current",
    smokeStatus: "ready",
  },
];

const history = createRuntimeDeployVerificationHistory({
  generatedAt: "2026-06-05T17:05:00.000Z",
  productionAlias: "essence-spline.vercel.app",
  records,
  runtimeQaPacket: packet,
  workspaceId: "Workspace Runtime Release Evidence",
});

assert.equal(history.summary.status, "ready");
assert.equal(history.summary.recordCount, 2);
assert.equal(history.summary.readyCount, 2);
assert.equal(history.summary.blockedCount, 0);
assert.equal(history.summary.aliasDriftCount, 0);
assert.equal(history.summary.commitDriftCount, 1);
assert.equal(history.summary.packetDriftCount, 1);
assert.equal(history.summary.currentDeploymentUrl, "https://essence-spline-prod.vercel.app");
assert.equal(history.summary.currentCommitHash, "def5678");
assert.equal(history.summary.currentPacketHash, "sha256:packet-current");
assert.match(history.summary.historyHash, /^sha256:/);
assert.match(history.csvContent, /^checked_at,alias,deployment_url,commit_hash,packet_hash,smoke_status,drift_summary/);
assert.match(history.jsonContent, /"historyHash"/);
assert.equal(history.csvFileName, "workspace-runtime-release-evidence-runtime-deploy-verification-history-20260605.csv");
assert.equal(history.jsonFileName, "workspace-runtime-release-evidence-runtime-deploy-verification-history-20260605.json");

const blockedHistory = createRuntimeDeployVerificationHistory({
  generatedAt: "2026-06-05T17:05:00.000Z",
  productionAlias: "essence-spline.vercel.app",
  records: [
    ...records,
    {
      alias: "preview-only.vercel.app",
      checkedAt: "2026-06-05T18:00:00.000Z",
      commitHash: "ghi9999",
      deploymentUrl: "https://preview-only.vercel.app",
      packetHash: "sha256:packet-current",
      smokeStatus: "blocked",
    },
  ],
  runtimeQaPacket: packet,
  workspaceId: "Workspace Runtime Release Evidence",
});

assert.equal(blockedHistory.summary.status, "blocked");
assert.equal(blockedHistory.summary.blockedCount, 1);
assert.equal(blockedHistory.summary.aliasDriftCount, 1);
assert.match(blockedHistory.summary.nextAction, /Repair blocked runtime deploy verification/);
assert.match(blockedHistory.records.at(-1)?.driftSummary ?? "", /alias drift/);
assert.match(blockedHistory.records.at(-1)?.driftSummary ?? "", /smoke blocked/);

console.log("runtime deploy verification history smoke passed");
