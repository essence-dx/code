import { nanoid } from "nanoid";
import type {
  DesignActivityEvent,
  DesignDocument,
  DesignMergeReviewConflictFamily,
  DesignMergeReviewRecord,
  DesignMergeReviewSectionId,
} from "@/features/editor/types";

export type VersionMergeSectionId = DesignMergeReviewSectionId;

export type VersionMergeSection = {
  id: VersionMergeSectionId;
  label: string;
  description: string;
  conflictFamily: DesignMergeReviewConflictFamily;
  currentCount: number;
  incomingCount: number;
  changed: boolean;
};

export type VersionMergeReview = {
  sections: VersionMergeSection[];
  changedSections: number;
  conflictFamilies: DesignMergeReviewConflictFamily[];
};

export type VersionMergeSectionChoice = "current" | "incoming";

export type VersionMergeReviewInput = {
  sourceVersionId: string;
  sourceVersionName: string;
  reviewerName: string;
  reviewerEmail?: string | null;
  notes?: string;
};

export function getVersionMergeReview(
  current: DesignDocument,
  incoming: DesignDocument,
): VersionMergeReview {
  const sections: VersionMergeSection[] = [
    section(
      "pages",
      "Pages",
      "Layers, comments, guides, grids, and flow starts",
      "layout",
      {
        current: current.pages,
        incoming: incoming.pages,
        currentCount: current.pages.length,
        incomingCount: incoming.pages.length,
      },
    ),
    section(
      "components",
      "Components",
      "Components, variants, slots, and props",
      "design-system",
      {
        current: current.components ?? {},
        incoming: incoming.components ?? {},
        currentCount: Object.keys(current.components ?? {}).length,
        incomingCount: Object.keys(incoming.components ?? {}).length,
      },
    ),
    section(
      "variables",
      "Variables",
      "Collections, modes, aliases, and values",
      "design-system",
      {
        current: pickVariableState(current),
        incoming: pickVariableState(incoming),
        currentCount: Object.keys(
          current.variableDefinitions ?? current.variables,
        ).length,
        incomingCount: Object.keys(
          incoming.variableDefinitions ?? incoming.variables,
        ).length,
      },
    ),
    section(
      "styles",
      "Styles",
      "Paint, text, effect, grid, and layout presets",
      "handoff",
      {
        current: pickStyleState(current),
        incoming: pickStyleState(incoming),
        currentCount: getStyleCount(current),
        incomingCount: getStyleCount(incoming),
      },
    ),
    section(
      "libraries",
      "Libraries",
      "Library metadata, subscriptions, and reviews",
      "library",
      {
        current: pickLibraryState(current),
        incoming: pickLibraryState(incoming),
        currentCount: Object.keys(current.librarySubscriptions ?? {}).length,
        incomingCount: Object.keys(incoming.librarySubscriptions ?? {}).length,
      },
    ),
  ];

  return {
    sections,
    changedSections: sections.filter((item) => item.changed).length,
    conflictFamilies: getConflictFamilies(sections),
  };
}

export function mergeDesignDocuments(
  current: DesignDocument,
  incoming: DesignDocument,
  sectionIds: VersionMergeSectionId[],
): DesignDocument {
  const sections = new Set(sectionIds);

  return {
    ...current,
    ...(sections.has("pages")
      ? {
          activePageId: incoming.activePageId,
          pages: incoming.pages,
        }
      : null),
    ...(sections.has("components")
      ? {
          components: incoming.components,
        }
      : null),
    ...(sections.has("variables")
      ? {
          variables: incoming.variables,
          variableModes: incoming.variableModes,
          activeVariableModeId: incoming.activeVariableModeId,
          variableDefinitions: incoming.variableDefinitions,
          variableCollections: incoming.variableCollections,
        }
      : null),
    ...(sections.has("styles")
      ? {
          layoutGridStyles: incoming.layoutGridStyles,
          paintStyles: incoming.paintStyles,
          textStyles: incoming.textStyles,
          effectStyles: incoming.effectStyles,
          layoutPresetStyles: incoming.layoutPresetStyles,
        }
      : null),
    ...(sections.has("libraries")
      ? {
          libraryMetadata: incoming.libraryMetadata,
          librarySubscriptions: incoming.librarySubscriptions,
          pendingLibraryComponentUpdates: incoming.pendingLibraryComponentUpdates,
        }
      : null),
    updatedAt: new Date().toISOString(),
  };
}

export function mergeDesignDocumentsWithReview(
  current: DesignDocument,
  incoming: DesignDocument,
  choices: Partial<Record<VersionMergeSectionId, VersionMergeSectionChoice>>,
  input: VersionMergeReviewInput,
): DesignDocument {
  const review = getVersionMergeReview(current, incoming);
  const acceptedSectionIds = review.sections
    .filter((section) => choices[section.id] === "incoming")
    .map((section) => section.id);
  const keptSectionIds = review.sections
    .filter((section) => choices[section.id] !== "incoming")
    .map((section) => section.id);
  const createdAt = new Date().toISOString();
  const record = {
    id: nanoid(),
    sourceVersionId: input.sourceVersionId,
    sourceVersionName: input.sourceVersionName,
    reviewerName: input.reviewerName,
    reviewerEmail: input.reviewerEmail ?? null,
    notes: input.notes?.trim() || null,
    decisions: review.sections.map((section) => ({
      sectionId: section.id,
      label: section.label,
      decision:
        choices[section.id] === "incoming"
          ? "accept-incoming"
          : "keep-current",
      changed: section.changed,
      currentCount: section.currentCount,
      incomingCount: section.incomingCount,
    })),
    acceptedSectionIds,
    keptSectionIds,
    conflictFamilies: getConflictFamilies(
      review.sections.filter((section) => section.changed),
    ),
    rollbackVersionId: input.sourceVersionId,
    createdAt,
  } satisfies DesignMergeReviewRecord;
  const merged = mergeDesignDocuments(current, incoming, acceptedSectionIds);
  const event = {
    id: nanoid(),
    kind: "version",
    actorName: input.reviewerName,
    actorEmail: input.reviewerEmail ?? null,
    label: "Recorded merge review",
    detail: `${acceptedSectionIds.length} accepted, ${keptSectionIds.length} kept from ${input.sourceVersionName}`,
    targetId: input.sourceVersionId,
    createdAt,
  } satisfies DesignActivityEvent;

  return {
    ...merged,
    branchMetadata: merged.branchMetadata
      ? {
          ...merged.branchMetadata,
          mergeNotes: record.notes,
          updatedAt: createdAt,
        }
      : merged.branchMetadata,
    mergeReviews: [record, ...(current.mergeReviews ?? [])].slice(0, 80),
    activityEvents: [event, ...(merged.activityEvents ?? [])].slice(0, 180),
    updatedAt: createdAt,
  };
}

function section(
  id: VersionMergeSectionId,
  label: string,
  description: string,
  conflictFamily: DesignMergeReviewConflictFamily,
  data: {
    current: unknown;
    incoming: unknown;
    currentCount: number;
    incomingCount: number;
  },
): VersionMergeSection {
  return {
    id,
    label,
    description,
    conflictFamily,
    currentCount: data.currentCount,
    incomingCount: data.incomingCount,
    changed: stableStringify(data.current) !== stableStringify(data.incoming),
  };
}

function getConflictFamilies(sections: VersionMergeSection[]) {
  return Array.from(
    new Set(
      sections
        .filter((section) => section.changed)
        .map((section) => section.conflictFamily),
    ),
  );
}

function pickVariableState(document: DesignDocument) {
  return {
    variables: document.variables,
    variableModes: document.variableModes,
    activeVariableModeId: document.activeVariableModeId,
    variableDefinitions: document.variableDefinitions,
    variableCollections: document.variableCollections,
  };
}

function pickStyleState(document: DesignDocument) {
  return {
    layoutGridStyles: document.layoutGridStyles,
    paintStyles: document.paintStyles,
    textStyles: document.textStyles,
    effectStyles: document.effectStyles,
    layoutPresetStyles: document.layoutPresetStyles,
  };
}

function pickLibraryState(document: DesignDocument) {
  return {
    libraryMetadata: document.libraryMetadata,
    librarySubscriptions: document.librarySubscriptions,
    pendingLibraryComponentUpdates: document.pendingLibraryComponentUpdates,
  };
}

function getStyleCount(document: DesignDocument) {
  return (
    Object.keys(document.layoutGridStyles ?? {}).length +
    Object.keys(document.paintStyles ?? {}).length +
    Object.keys(document.textStyles ?? {}).length +
    Object.keys(document.effectStyles ?? {}).length +
    Object.keys(document.layoutPresetStyles ?? {}).length
  );
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (isRecord(value)) {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
