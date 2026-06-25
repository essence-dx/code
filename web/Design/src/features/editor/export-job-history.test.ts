import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createExportJob,
  normalizeExportJobs,
  prependExportJob,
  updateExportJob,
} from "@/features/editor/export-job-history";

describe("export job history", () => {
  test("creates readable export job metadata", () => {
    const job = createExportJob({
      format: "print-pdf",
      projectName: "Launch Poster",
      now: "2026-05-15T10:00:00.000Z",
    });

    assert.equal(job.formatLabel, "Print-ready PDF");
    assert.equal(job.fileName, "launch-poster-print-ready.pdf");
    assert.equal(job.status, "queued");
    assert.equal(job.progress, 4);
  });

  test("prepends jobs and caps history length", () => {
    const jobs = Array.from({ length: 25 }, (_, index) =>
      createExportJob({
        format: "png",
        projectName: `Design ${index}`,
      }),
    );
    const nextJob = createExportJob({
      format: "webp",
      projectName: "Next",
    });

    const history = prependExportJob(jobs, nextJob);

    assert.equal(history.length, 20);
    assert.equal(history[0]?.id, nextJob.id);
  });

  test("updates one export job without changing the rest", () => {
    const first = createExportJob({ format: "png", projectName: "One" });
    const second = createExportJob({ format: "jpg", projectName: "Two" });
    const jobs = updateExportJob([first, second], second.id, {
      status: "completed",
      progress: 100,
      artifactName: "two.jpg",
    });

    assert.equal(jobs[0]?.status, "queued");
    assert.equal(jobs[1]?.status, "completed");
    assert.equal(jobs[1]?.artifactName, "two.jpg");
  });

  test("normalizes persisted jobs and removes invalid rows", () => {
    const validJob = createExportJob({
      format: "media-sequence",
      projectName: "Deck",
    });
    const jobs = normalizeExportJobs([
      { ...validJob, progress: 240, formatLabel: "Old label" },
      { id: "bad" },
    ]);

    assert.equal(jobs.length, 1);
    assert.equal(jobs[0]?.progress, 100);
    assert.equal(jobs[0]?.formatLabel, "Media sequence JSON");
  });
});
