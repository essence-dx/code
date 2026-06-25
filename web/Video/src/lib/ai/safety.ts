import type { AiEditorRequest, AiUsageAction } from "@/lib/ai/schemas";

export type AiSafetyStatus = "allowed" | "blocked" | "flagged";

export interface AiSafetyReview {
  status: AiSafetyStatus;
  reason?: string;
}

const blockedPromptPatterns = [
  /\b(non[-\s]?consensual|revenge porn|deepfake nude|undress|child sexual|csam)\b/i,
  /\b(dox|doxx|home address|private address|social security number|ssn|credit card number|bank password)\b/i,
  /\b(impersonate|clone voice|voice clone)\b.*\b(real person|celebrity|private person|without consent)\b/i,
  /\b(remove watermark|bypass watermark|steal copyrighted|pirated)\b/i,
];

const flaggedPromptPatterns = [
  /\b(face swap|deepfake|celebrity|trademark|logo)\b/i,
  /\bmedical advice|legal advice|financial advice\b/i,
];

export class AiPromptSafetyError extends Error {
  constructor(public readonly review: AiSafetyReview) {
    super(review.reason ?? "This AI request was blocked by the workspace safety policy.");
    this.name = "AiPromptSafetyError";
  }
}

export function reviewEditorAiSafety(input: Pick<AiEditorRequest, "action" | "prompt" | "transcript" | "mediaBrief">): AiSafetyReview {
  return reviewAiTextSafety({
    action: input.action,
    text: [input.prompt, input.transcript, input.mediaBrief].filter(Boolean).join("\n"),
  });
}

export function reviewAiTextSafety(input: { action: AiUsageAction; text?: string }): AiSafetyReview {
  const text = input.text?.trim() ?? "";
  if (!text) {
    return { status: "blocked", reason: "Write a clear request before running AI." };
  }

  const blockedPattern = blockedPromptPatterns.find((pattern) => pattern.test(text));
  if (blockedPattern) {
    return {
      status: "blocked",
      reason: "This request is blocked because it asks for unsafe, private, non-consensual, or rights-violating media work.",
    };
  }

  const flaggedPattern = flaggedPromptPatterns.find((pattern) => pattern.test(text));
  if (flaggedPattern) {
    return {
      status: "flagged",
      reason: "Review rights, consent, and accuracy before using this AI output.",
    };
  }

  return { status: "allowed" };
}

export function assertAiSafety(review: AiSafetyReview) {
  if (review.status === "blocked") {
    throw new AiPromptSafetyError(review);
  }
}
