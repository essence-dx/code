import { renderEmailHtml } from "@/features/email/email-renderer";
import type { EmailBlock, EmailModel } from "@/features/email/email-model";

export type EmailQaSeverity = "pass" | "warning" | "error";

export type EmailQaIssue = {
  id: string;
  severity: Exclude<EmailQaSeverity, "pass">;
  client: "Gmail" | "Outlook" | "Apple Mail" | "General";
  label: string;
  detail: string;
};

export type EmailQaReport = {
  score: number;
  issues: EmailQaIssue[];
  summary: {
    buttons: number;
    hostedImages: number;
    images: number;
    textBlocks: number;
  };
};

export function createEmailQaReport(model: EmailModel): EmailQaReport {
  const issues: EmailQaIssue[] = [];
  const blocks = model.sections.flatMap((section) => section.blocks);
  const images = blocks.filter(isImageBlock);
  const buttons = blocks.filter((block) => block.type === "button");
  const textBlocks = blocks.filter((block) => block.type === "text");
  const html = renderEmailHtml(model);

  if (model.subject.length < 6 || model.subject.length > 78) {
    issues.push({
      id: "subject-length",
      severity: "warning",
      client: "General",
      label: "Subject length",
      detail: "Keep the subject between 6 and 78 characters for inbox scans.",
    });
  }

  if (!model.previewText.trim()) {
    issues.push({
      id: "missing-preview",
      severity: "warning",
      client: "Gmail",
      label: "Preview text missing",
      detail: "Add preview text so Gmail and mobile inboxes do not pull random body copy.",
    });
  }

  images.forEach((image) => {
    if (!image.alt.trim()) {
      issues.push({
        id: `image-alt-${image.id}`,
        severity: "error",
        client: "General",
        label: "Image alt text",
        detail: "Every email image needs alt text for blocked-image and accessibility states.",
      });
    }

    if (image.sourceKind === "embedded" || image.sourceKind === "unsafe") {
      issues.push({
        id: `image-source-${image.id}`,
        severity: "error",
        client: "Outlook",
        label: "Image hosting",
        detail:
          "Email clients often block data, blob, or relative images. Use hosted image URLs before sending.",
      });
    }

    if (image.width > model.width) {
      issues.push({
        id: `image-width-${image.id}`,
        severity: "warning",
        client: "Apple Mail",
        label: "Image width",
        detail: "Keep images at or below the email width to avoid mobile overflow.",
      });
    }
  });

  buttons.forEach((button) => {
    if (!button.href || button.href === "#") {
      issues.push({
        id: `button-link-${button.id}`,
        severity: "error",
        client: "General",
        label: "Button URL",
        detail: "Buttons need real HTTPS or mailto links before export or test send.",
      });
    }
  });

  if (html.length > 95_000) {
    issues.push({
      id: "gmail-clipping",
      severity: "warning",
      client: "Gmail",
      label: "HTML size",
      detail: "Gmail may clip emails near 102 KB, so keep exported HTML lean.",
    });
  }

  if (textBlocks.length === 0) {
    issues.push({
      id: "text-content",
      severity: "warning",
      client: "General",
      label: "Readable text",
      detail: "Add live text blocks so the email still works when images are blocked.",
    });
  }

  const score = Math.max(
    0,
    100 -
      issues.reduce(
        (total, issue) => total + (issue.severity === "error" ? 18 : 8),
        0,
      ),
  );

  return {
    score,
    issues,
    summary: {
      buttons: buttons.length,
      hostedImages: images.filter((image) => image.sourceKind === "hosted").length,
      images: images.length,
      textBlocks: textBlocks.length,
    },
  };
}

function isImageBlock(
  block: EmailBlock,
): block is Extract<EmailBlock, { type: "image" }> {
  return block.type === "image";
}
