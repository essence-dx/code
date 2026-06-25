import { strict as assert } from "node:assert";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  failProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";

const generatedAt = "2026-05-30T12:00:00.000Z";
const workspaceId = "workspace-cad-execution";

function unwrapJob(result: ReturnType<typeof createProjectCadConversionJob>) {
  assert.ok("job" in result);

  return result.job;
}

const queued = unwrapJob(
  createProjectCadConversionJob({
    adapterId: "occt",
    generatedAt,
    projectId: "cad-exec",
    projectName: "CAD Execution",
    sourceBytes: 6 * 1024 * 1024,
    sourceFileName: "housing_mm.step",
    target: "obj",
    workspaceId,
  }),
);

const running = startProjectCadConversionJob(
  unwrapJob(
    createProjectCadConversionJob({
      adapterId: "freecad",
      generatedAt,
      projectId: "cad-exec",
      projectName: "CAD Execution",
      sourceBytes: 8 * 1024 * 1024,
      sourceFileName: "bracket_mm.step",
      target: "stl",
      workspaceId,
    }),
  ),
  "2026-05-30T12:02:00.000Z",
);

const retryable = failProjectCadConversionJob({
  failedAt: "2026-05-30T12:04:00.000Z",
  job: running,
  message: "OCCT tessellation returned non-manifold faces.",
  retryable: true,
});

const failed = failProjectCadConversionJob({
  failedAt: "2026-05-30T12:06:00.000Z",
  job: startProjectCadConversionJob(
    unwrapJob(
      createProjectCadConversionJob({
        adapterId: "freecad",
        generatedAt,
        maxAttempts: 1,
        projectId: "cad-exec",
        projectName: "CAD Execution",
        sourceBytes: 4 * 1024 * 1024,
        sourceFileName: "legacy_mm.iges",
        target: "stl",
        workspaceId,
      }),
    ),
    "2026-05-30T12:05:00.000Z",
  ),
  message: "FreeCAD exited before writing the output mesh.",
  retryable: true,
});

const succeeded = completeProjectCadConversionJob({
  finishedAt: "2026-05-30T12:08:00.000Z",
  job: startProjectCadConversionJob(queued, "2026-05-30T12:01:00.000Z"),
  resultPath: "outputs/housing_mm.obj",
});

const queue = createCadConversionExecutionQueue({
  generatedAt,
  jobs: [retryable, failed, succeeded],
  workspaceId,
});

assert.equal(queue.summary.status, "blocked");
assert.equal(queue.summary.rowCount, 3);
assert.equal(queue.summary.retryableCount, 1);
assert.equal(queue.summary.blockedCount, 1);
assert.equal(queue.summary.runningCount, 0);
assert.equal(queue.summary.succeededCount, 1);
assert.equal(queue.summary.executionScore, 53);
assert.match(queue.summary.nextAction, /Resolve blocked CAD conversions before accepting native runtime parity/);
assert.ok(queue.rows.every((row) => row.adapterContract.includes(row.adapterId.toUpperCase())));
assert.ok(queue.rows.every((row) => row.diagnosticHash.startsWith("sha256:")));
assert.ok(queue.rows.some((row) => row.failureReason.includes("FreeCAD exited")));
assert.ok(queue.rows.some((row) => row.retryState.includes("retryable")));
assert.equal(queue.csvFileName, "workspace-cad-execution-cad-conversion-execution-queue-20260530.csv");
assert.equal(queue.jsonFileName, "workspace-cad-execution-cad-conversion-execution-queue-20260530.json");
assert.match(queue.csvContent, /^job_id,source_file,status,adapter_contract,retry_state,diagnostic_hash,failure_reason,next_action/);

console.log("CAD conversion execution queue smoke passed");
