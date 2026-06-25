import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  createAudioElement,
  createVideoElement,
} from "@/features/editor/document-factory";
import {
  createAudioDuckingUpdates,
  createMediaProductionReadinessReport,
} from "@/features/editor/media-production-readiness";
import type { DesignElement } from "@/features/editor/types";

describe("media production readiness", () => {
  test("blocks an empty production timeline", () => {
    const report = createMediaProductionReadinessReport([]);

    assert.equal(report.status, "blocked");
    assert.equal(report.counts.clips, 0);
    assert.equal(
      report.checks.find((check) => check.id === "clips")?.status,
      "blocked",
    );
  });

  test("reviews missing captions, transitions, and ducking", () => {
    const video = createVideoElement({
      src: "data:video/mp4;base64,AAAA",
      mimeType: "video/mp4",
      timelineStartSeconds: 0,
      timelineDurationSeconds: 10,
    });
    const audio = createAudioElement({
      src: "data:audio/mpeg;base64,AAAA",
      mimeType: "audio/mpeg",
      timelineStartSeconds: 0,
      timelineDurationSeconds: 10,
      volume: 1,
    });
    const report = createMediaProductionReadinessReport([video, audio]);

    assert.equal(report.status, "review");
    assert.equal(report.needsAudioDucking, true);
    assert.equal(
      report.checks.find((check) => check.id === "captions")?.status,
      "review",
    );
    assert.equal(
      report.checks.find((check) => check.id === "transitions")?.status,
      "review",
    );
    assert.equal(
      report.checks.find((check) => check.id === "audio-ducking")?.status,
      "review",
    );
  });

  test("marks captioned, transitioned, ducked media as ready", () => {
    const video = createVideoElement({
      src: "data:video/mp4;base64,AAAA",
      mimeType: "video/mp4",
      transitionIn: "fade",
      transitionOut: "fade",
      transitionDurationSeconds: 0.5,
      subtitleCues: [
        {
          id: "caption-1",
          startSeconds: 0,
          endSeconds: 3,
          text: "Welcome to the launch.",
        },
      ],
    });
    const audio = createAudioElement({
      src: "data:audio/mpeg;base64,AAAA",
      mimeType: "audio/mpeg",
      volumeKeyframes: [
        { timeSeconds: 0, volume: 1 },
        { timeSeconds: 1, volume: 0.35 },
        { timeSeconds: 9, volume: 0.35 },
        { timeSeconds: 10, volume: 1 },
      ],
    });
    const report = createMediaProductionReadinessReport([video, audio]);

    assert.equal(report.status, "ready");
    assert.equal(report.score, 100);
    assert.equal(report.needsAudioDucking, false);
  });

  test("creates ducking keyframes for overlapping audio", () => {
    const video = createVideoElement({
      src: "data:video/mp4;base64,AAAA",
      mimeType: "video/mp4",
      timelineStartSeconds: 2,
      timelineDurationSeconds: 4,
    });
    const audio = createAudioElement({
      src: "data:audio/mpeg;base64,AAAA",
      mimeType: "audio/mpeg",
      timelineStartSeconds: 0,
      timelineDurationSeconds: 8,
      volume: 0.9,
    });
    const updates = createAudioDuckingUpdates([video, audio]);

    assert.equal(updates.length, 1);
    assert.equal(updates[0].elementId, audio.id);
    assert.deepEqual(
      (updates[0].updates as typeof audio).volumeKeyframes,
      [
        { timeSeconds: 1.5, volume: 0.9 },
        { timeSeconds: 2, volume: 0.35 },
        { timeSeconds: 6, volume: 0.35 },
        { timeSeconds: 6.5, volume: 0.9 },
      ],
    );
  });

  test("skips ducking updates when media does not overlap", () => {
    const video = createVideoElement({
      src: "data:video/mp4;base64,AAAA",
      mimeType: "video/mp4",
      timelineStartSeconds: 8,
      timelineDurationSeconds: 4,
    });
    const audio = createAudioElement({
      src: "data:audio/mpeg;base64,AAAA",
      mimeType: "audio/mpeg",
      timelineStartSeconds: 0,
      timelineDurationSeconds: 6,
    });
    const updates = createAudioDuckingUpdates([
      video,
      audio,
    ] satisfies DesignElement[]);

    assert.equal(updates.length, 0);
  });
});
