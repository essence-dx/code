import { nanoid } from "nanoid";

import type {
  AudienceInteraction,
  AudienceInteractionKind,
  DesignDocument,
  DesignPage,
} from "@/features/editor/types";

export type AudienceResponseSummary = {
  interactionId: string;
  totalResponses: number;
  options: Array<{
    label: string;
    count: number;
    correct: boolean;
  }>;
  questions: Array<{
    id: string;
    name: string;
    body: string;
    createdAt: string;
  }>;
};

export function createDefaultAudienceInteraction(
  kind: AudienceInteractionKind = "poll",
): AudienceInteraction {
  return {
    id: nanoid(),
    kind,
    enabled: true,
    prompt:
      kind === "qa"
        ? "What should we discuss?"
        : kind === "quiz"
          ? "Which option is correct?"
          : "Which direction should we take?",
    options: kind === "qa" ? [] : ["Option A", "Option B", "Option C"],
    correctOptionIndex: kind === "quiz" ? 0 : undefined,
  };
}

export function normalizeAudienceInteraction(
  interaction: AudienceInteraction | undefined,
  kind?: AudienceInteractionKind,
) {
  const fallback = createDefaultAudienceInteraction(kind);
  const nextKind = kind ?? interaction?.kind ?? fallback.kind;
  const options =
    nextKind === "qa"
      ? []
      : (interaction?.options?.filter((option) => option.trim()) ?? []).slice(
          0,
          6,
        );

  return {
    id: interaction?.id ?? fallback.id,
    kind: nextKind,
    enabled: interaction?.enabled ?? true,
    prompt: interaction?.prompt?.trim() || fallback.prompt,
    options:
      nextKind === "qa"
        ? []
        : options.length >= 2
          ? options
          : fallback.options,
    correctOptionIndex:
      nextKind === "quiz"
        ? clampCorrectOption(interaction?.correctOptionIndex, options.length)
        : undefined,
  } satisfies AudienceInteraction;
}

export function getEnabledAudienceInteractions(document: DesignDocument) {
  return document.pages
    .map((page) => ({
      page,
      interaction: page.audienceInteraction,
    }))
    .filter(
      (item): item is { page: DesignPage; interaction: AudienceInteraction } =>
        Boolean(item.interaction?.enabled),
    );
}

export function findAudienceInteraction(input: {
  document: DesignDocument;
  pageId: string;
  interactionId: string;
}) {
  const page = input.document.pages.find((item) => item.id === input.pageId);
  const interaction = page?.audienceInteraction;

  if (!page || !interaction?.enabled || interaction.id !== input.interactionId) {
    return null;
  }

  return { page, interaction };
}

function clampCorrectOption(value: number | undefined, optionCount: number) {
  if (!Number.isInteger(value)) return 0;

  return Math.max(0, Math.min(value ?? 0, Math.max(0, optionCount - 1)));
}
