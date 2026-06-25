import { strict as assert } from "node:assert";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  failProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";
import { createCadRuntimeAcceptancePacket } from "@/features/projects/cad-runtime-acceptance-packet";
import { createNativeCadKernelCapabilityMatrix } from "@/features/projects/native-cad-kernel-capability-matrix";

const generatedAt = "2026-05-30T18:00:00.000Z";
const workspaceId = "workspace-cad-runtime";

function unwrapJob(result: ReturnType<typeof createProjectCadConversionJob>) {
  assert.ok("job" in result);

  return result.job;
}

const readyJob = completeProjectCadConversionJob({
  finishedAt: "2026-05-30T18:04:00.000Z",
  job: startProjectCadConversionJob(
    unwrapJob(
      createProjectCadConversionJob({
        adapterId: "occt",
        generatedAt,
        projectId: "cad-runtime",
        projectName: "CAD Runtime",
        sourceBytes: 5 * 1024 * 1024,
        sourceFileName: "engine_mount_mm.step",
        target: "obj",
        workspaceId,
      }),
    ),
    "2026-05-30T18:02:00.000Z",
  ),
  resultPath: "outputs/engine_mount_mm.obj",
});

const readyPacket = createCadRuntimeAcceptancePacket({
  capabilityMatrix: createNativeCadKernelCapabilityMatrix({
    generatedAt,
    igesStatus: "ready",
    satStatus: "ready",
    stepStatus: "ready",
    stlStatus: "ready",
    workspaceId,
  }),
  executionQueue: createCadConversionExecutionQueue({
    generatedAt,
    jobs: [readyJob],
    workspaceId,
  }),
  generatedAt,
  workspaceId,
});

assert.equal(readyPacket.summary.status, "ready");
assert.equal(readyPacket.summary.rowCount, 4);
assert.equal(readyPacket.summary.readyCount, 4);
assert.equal(readyPacket.summary.blockedCount, 0);
assert.equal(readyPacket.summary.acceptanceScore, 100);
assert.deepEqual(
  readyPacket.rows.map((row) => row.kind),
  ["capability-matrix", "conversion-execution", "runtime-diagnostics", "export-readiness-recommendation"],
);
assert.match(readyPacket.summary.nextAction, /CAD runtime acceptance packet is ready/);
assert.equal(readyPacket.csvFileName, "workspace-cad-runtime-cad-runtime-acceptance-packet-20260530.csv");
assert.equal(readyPacket.jsonFileName, "workspace-cad-runtime-cad-runtime-acceptance-packet-20260530.json");
assert.match(readyPacket.csvContent, /^section_id,kind,title,status,evidence_hash,next_action/);

const failedJob = failProjectCadConversionJob({
  failedAt: "2026-05-30T18:08:00.000Z",
  job: startProjectCadConversionJob(
    unwrapJob(
      createProjectCadConversionJob({
        adapterId: "freecad",
        generatedAt,
        maxAttempts: 1,
        projectId: "cad-runtime",
        projectName: "CAD Runtime",
        sourceBytes: 3 * 1024 * 1024,
        sourceFileName: "legacy_mount_mm.iges",
        target: "stl",
        workspaceId,
      }),
    ),
    "2026-05-30T18:07:00.000Z",
  ),
  message: "FreeCAD failed before writing tessellation diagnostics.",
  retryable: true,
});

const blockedPacket = createCadRuntimeAcceptancePacket({
  capabilityMatrix: createNativeCadKernelCapabilityMatrix({
    generatedAt,
    workspaceId,
  }),
  executionQueue: createCadConversionExecutionQueue({
    generatedAt,
    jobs: [failedJob],
    workspaceId,
  }),
  exportReadinessStatus: "blocked",
  generatedAt,
  workspaceId,
});

assert.equal(blockedPacket.summary.status, "blocked");
assert.ok(blockedPacket.summary.blockedCount > 0);
assert.match(blockedPacket.summary.nextAction, /Resolve CAD runtime acceptance blockers/);

const reviewPacket = createCadRuntimeAcceptancePacket({
  capabilityMatrix: createNativeCadKernelCapabilityMatrix({
    generatedAt,
    igesStatus: "review",
    satStatus: "ready",
    stepStatus: "ready",
    stlStatus: "ready",
    workspaceId,
  }),
  executionQueue: createCadConversionExecutionQueue({
    generatedAt,
    jobs: [readyJob],
    workspaceId,
  }),
  exportReadinessStatus: "review",
  generatedAt,
  workspaceId,
});

assert.equal(reviewPacket.summary.status, "review");
assert.ok(reviewPacket.summary.reviewCount > 0);
assert.match(reviewPacket.summary.nextAction, /Review CAD runtime acceptance evidence/);

console.log("CAD runtime acceptance packet smoke passed");
