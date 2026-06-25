import { strict as assert } from "node:assert";
import {
  completeProjectCadConversionJob,
  createProjectCadConversionJob,
  createProjectCadConversionQueueReport,
  failProjectCadConversionJob,
  retryProjectCadConversionJob,
  startProjectCadConversionJob,
} from "@/features/projects/cad-conversion-worker";

const queued = createProjectCadConversionJob({
  adapterId: "freecad",
  generatedAt: "2026-05-16T21:00:00.000Z",
  projectId: "project-cad",
  projectName: "CAD Project",
  sourceBytes: 18 * 1024 * 1024,
  sourceFileName: "servo-mount_mm.step",
  target: "stl",
  workspaceId: "workspace-cad",
});

assert.ok("job" in queued);
assert.equal(queued.job.status, "queued");
assert.equal(queued.job.adapterId, "freecad");
assert.equal(queued.job.target, "stl");
assert.match(queued.job.command, /freecadcmd/);
assert.match(queued.job.command, /servo-mount_mm\.stl/);
assert.equal(queued.job.diagnostics.unitMetadata.sourceUnit, "millimeter");

const running = startProjectCadConversionJob(queued.job, "2026-05-16T21:01:00.000Z");
const retryable = failProjectCadConversionJob({
  failedAt: "2026-05-16T21:02:00.000Z",
  job: running,
  message: "FreeCAD exited before writing the mesh.",
  retryable: true,
});

assert.equal(retryable.status, "retryable-failed");
assert.equal(retryable.attempts, 1);
assert.ok(retryable.nextAttemptAt);
assert.equal(retryable.logs.at(-1)?.level, "warning");

const requeued = retryProjectCadConversionJob(retryable, "2026-05-16T21:10:00.000Z");
const completed = completeProjectCadConversionJob({
  finishedAt: "2026-05-16T21:15:00.000Z",
  job: startProjectCadConversionJob(requeued, "2026-05-16T21:11:00.000Z"),
  resultPath: "outputs/servo-mount_mm.stl",
});

assert.equal(completed.status, "succeeded");
assert.equal(completed.attempts, 2);
assert.equal(completed.resultPath, "outputs/servo-mount_mm.stl");

const occt = createProjectCadConversionJob({
  adapterId: "occt",
  generatedAt: "2026-05-16T21:16:00.000Z",
  projectId: "project-cad",
  projectName: "CAD Project",
  sourceBytes: 4 * 1024 * 1024,
  sourceFileName: "housing_in.iges",
  target: "obj",
  workspaceId: "workspace-cad",
});

assert.ok("job" in occt);
assert.match(occt.job.command, /essence-occt-convert/);
assert.match(occt.job.command, /--scale-to-meters 0\.0254/);

const unsupported = createProjectCadConversionJob({
  projectId: "project-cad",
  sourceBytes: 1024,
  sourceFileName: "ready.glb",
});

assert.equal("error" in unsupported, true);

const report = createProjectCadConversionQueueReport([completed, occt.job], "2026-05-16T21:20:00.000Z");

assert.equal(report.summary.totalCount, 2);
assert.equal(report.summary.succeededCount, 1);
assert.equal(report.summary.queuedCount, 1);
assert.equal(report.jobs[0].sourceFileName, "housing_in.iges");

console.log("cad conversion worker smoke passed");
