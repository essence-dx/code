import { strict as assert } from "node:assert";
import { createCadConversionExecutionQueue } from "@/features/projects/cad-conversion-execution-queue";
import { createProjectCadConversionJob } from "@/features/projects/cad-conversion-worker";
import {
  createNativeCadKernelExecutionRunnerReport,
  executeNativeCadKernelJob,
  type NativeCadKernelAdapterConfig,
} from "@/features/projects/native-cad-kernel-execution-runner";

const generatedAt = "2026-06-02T09:00:00.000Z";
const workspaceId = "Workspace Commercial Proof";

function unwrapJob(result: ReturnType<typeof createProjectCadConversionJob>) {
  assert.ok("job" in result);

  return result.job;
}

const adapterConfigs: NativeCadKernelAdapterConfig[] = [
  {
    adapterId: "freecad",
    enabled: true,
    executablePath: "C:/Program Files/FreeCAD/bin/freecadcmd.exe",
    outputDirectory: "G:/Spline/.cad-evidence/freecad",
    sandboxCwd: "G:/Spline/.cad-sandbox/freecad",
    timeoutMs: 120000,
  },
  {
    adapterId: "occt",
    enabled: true,
    executablePath: "G:/Spline/tools/occt/essence-occt-convert.exe",
    outputDirectory: "G:/Spline/.cad-evidence/occt",
    sandboxCwd: "G:/Spline/.cad-sandbox/occt",
    timeoutMs: 90000,
  },
];

const job = unwrapJob(
  createProjectCadConversionJob({
    adapterId: "occt",
    generatedAt,
    projectId: "commercial-proof",
    projectName: "Commercial Proof",
    sourceBytes: 6 * 1024 * 1024,
    sourceFileName: "commercial_fixture_mm.step",
    target: "glb",
    workspaceId,
  }),
);

const success = await executeNativeCadKernelJob({
  adapterConfigs,
  executor: async ({ job: runningJob, runId }) => ({
    diagnosticFiles: ["diagnostics/commercial_fixture_mm.json"],
    durationMs: 4200,
    exitCode: 0,
    outputPath: `G:/Spline/.cad-evidence/occt/${runId}/${runningJob.outputFileName}`,
    stderr: "",
    stdout: "Converted with OCCT adapter.",
  }),
  generatedAt,
  job,
  runId: "cad-run-ready",
});

assert.equal(success.run.status, "ready");
assert.equal(success.job.status, "succeeded");
assert.equal(success.run.adapterId, "occt");
assert.equal(success.run.outputPath, "G:/Spline/.cad-evidence/occt/cad-run-ready/commercial_fixture_mm.glb");
assert.ok(success.run.diagnosticHash.startsWith("sha256:"));
assert.match(success.job.logs.at(-1)?.message ?? "", /Native CAD kernel execution attached diagnostics/);

const disabled = await executeNativeCadKernelJob({
  adapterConfigs: [
    {
      adapterId: "freecad",
      enabled: false,
      executablePath: "",
      outputDirectory: "G:/Spline/.cad-evidence/freecad",
      sandboxCwd: "G:/Spline/.cad-sandbox/freecad",
      timeoutMs: 120000,
    },
  ],
  executor: async () => {
    throw new Error("executor should not run for disabled adapters");
  },
  generatedAt,
  job: unwrapJob(
    createProjectCadConversionJob({
      adapterId: "freecad",
      generatedAt,
      projectId: "commercial-proof",
      projectName: "Commercial Proof",
      sourceBytes: 5 * 1024 * 1024,
      sourceFileName: "disabled_fixture_mm.step",
      target: "stl",
      workspaceId,
    }),
  ),
  runId: "cad-run-disabled",
});

assert.equal(disabled.run.status, "blocked");
assert.equal(disabled.job.status, "failed");
assert.match(disabled.run.failureReason ?? "", /disabled or incomplete/);

const queue = createCadConversionExecutionQueue({
  generatedAt,
  jobs: [success.job, disabled.job],
  workspaceId,
});

const report = createNativeCadKernelExecutionRunnerReport({
  executionQueue: queue,
  generatedAt,
  runs: [success.run, disabled.run],
  workspaceId,
});

assert.equal(report.summary.status, "blocked");
assert.equal(report.summary.rowCount, 2);
assert.equal(report.summary.readyCount, 1);
assert.equal(report.summary.blockedCount, 1);
assert.equal(report.summary.runnerScore, 50);
assert.match(report.summary.nextAction, /Resolve native CAD kernel runner blockers/);
assert.equal(report.csvFileName, "workspace-commercial-proof-native-cad-kernel-execution-runner-20260602.csv");
assert.equal(report.jsonFileName, "workspace-commercial-proof-native-cad-kernel-execution-runner-20260602.json");
assert.match(report.csvContent, /^run_id,adapter,status,job_id,output_path,diagnostic_hash,failure_reason,next_action/);

console.log("native CAD kernel execution runner smoke passed");
