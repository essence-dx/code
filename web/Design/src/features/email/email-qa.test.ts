import assert from "node:assert/strict";
import { describe, test } from "node:test";

import type { EmailModel } from "@/features/email/email-model";
import { createEmailQaReport } from "@/features/email/email-qa";

describe("email QA", () => {
  test("scores hosted images and complete email content as ready", () => {
    const report = createEmailQaReport(createReadyEmailModel());

    assert.equal(report.score, 100);
    assert.deepEqual(report.issues, []);
    assert.equal(report.summary.hostedImages, 1);
    assert.equal(report.summary.textBlocks, 1);
  });

  test("flags common email client delivery issues", () => {
    const report = createEmailQaReport({
      ...createReadyEmailModel(),
      subject: "Hi",
      previewText: "",
      sections: [
        {
          id: "main",
          name: "Main",
          background: "#ffffff",
          blocks: [
            {
              id: "hero",
              type: "image",
              src: "data:image/png;base64,abc",
              sourceKind: "embedded",
              alt: "",
              href: null,
              width: 640,
              height: 320,
              padding: 16,
            },
            {
              id: "cta",
              type: "button",
              label: "Open",
              href: "#",
              backgroundColor: "#111827",
              color: "#ffffff",
              align: "center",
              padding: 16,
            },
          ],
        },
      ],
    });
    const issueIds = report.issues.map((issue) => issue.id);

    assert.ok(report.score < 70);
    assert.ok(issueIds.includes("subject-length"));
    assert.ok(issueIds.includes("missing-preview"));
    assert.ok(issueIds.includes("image-alt-hero"));
    assert.ok(issueIds.includes("image-source-hero"));
    assert.ok(issueIds.includes("image-width-hero"));
    assert.ok(issueIds.includes("button-link-cta"));
    assert.ok(issueIds.includes("text-content"));
  });
});

function createReadyEmailModel(): EmailModel {
  return {
    version: 1,
    sourceProjectId: "project_1",
    subject: "Launch update",
    previewText: "A quick product update for the inbox.",
    blockPackId: "none",
    width: 600,
    sections: [
      {
        id: "main",
        name: "Main",
        background: "#ffffff",
        blocks: [
          {
            id: "copy",
            type: "text",
            content: "A concise email paragraph.",
            align: "left",
            color: "#111827",
            fontFamily: "Arial",
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 1.5,
            backgroundColor: "transparent",
            padding: 16,
          },
          {
            id: "hero",
            type: "image",
            src: "https://example.com/email/hero.png",
            sourceKind: "hosted",
            alt: "Product dashboard screenshot",
            href: null,
            width: 520,
            height: 280,
            padding: 16,
          },
          {
            id: "cta",
            type: "button",
            label: "Read more",
            href: "https://example.com",
            backgroundColor: "#111827",
            color: "#ffffff",
            align: "center",
            padding: 16,
          },
        ],
      },
    ],
  };
}
