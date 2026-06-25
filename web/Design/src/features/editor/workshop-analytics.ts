import type {
  DesignElement,
  DesignPage,
  WorkshopAgendaBlock,
  WorkshopBreakoutSection,
  WorkshopElementReactions,
  WorkshopFacilitationPackId,
  WorkshopReactionKind,
  WorkshopSessionStage,
  WorkshopSessionState,
} from "@/features/editor/types";

export const workshopReactionKinds = [
  "insight",
  "question",
  "concern",
] as const satisfies WorkshopReactionKind[];

export const workshopSessionStages = [
  "planning",
  "live",
  "paused",
  "recap",
] as const satisfies WorkshopSessionStage[];

export type WorkshopTargetSummary = {
  elementId: string;
  label: string;
  votes: number;
  reactions: number;
  totalSignals: number;
  reactionTotals: Record<WorkshopReactionKind, number>;
};

export type WorkshopSessionSummary = {
  session: NormalizedWorkshopSession;
  targetCount: number;
  totalVotes: number;
  totalReactions: number;
  totalSignals: number;
  quietTargetCount: number;
  averageSignalsPerParticipant: number;
  topTargets: WorkshopTargetSummary[];
  reactionTotals: Record<WorkshopReactionKind, number>;
};

export type NormalizedWorkshopSession = Required<
  Omit<
    WorkshopSessionState,
    "facilitationPackId" | "appliedPackAt" | "spotlightElementId"
  >
> & {
  facilitationPackId: WorkshopFacilitationPackId | null;
  appliedPackAt: string | null;
  spotlightElementId: string | null;
};

export function createWorkshopSessionSummary(
  page: DesignPage,
): WorkshopSessionSummary {
  const session = normalizeWorkshopSession(page.workshopSession);
  const targets = page.elements.filter(isWorkshopVotableElement);
  const targetSummaries = targets.map(createWorkshopTargetSummary);
  const totalVotes = targetSummaries.reduce(
    (total, target) => total + target.votes,
    0,
  );
  const totalReactions = targetSummaries.reduce(
    (total, target) => total + target.reactions,
    0,
  );
  const reactionTotals = createEmptyReactionTotals();

  for (const target of targetSummaries) {
    for (const kind of workshopReactionKinds) {
      reactionTotals[kind] += target.reactionTotals[kind];
    }
  }

  const totalSignals = totalVotes + totalReactions;

  return {
    session,
    targetCount: targets.length,
    totalVotes,
    totalReactions,
    totalSignals,
    quietTargetCount: targetSummaries.filter(
      (target) => target.totalSignals === 0,
    ).length,
    averageSignalsPerParticipant:
      session.participantCount > 0
        ? roundToTenth(totalSignals / session.participantCount)
        : 0,
    topTargets: targetSummaries
      .filter((target) => target.totalSignals > 0)
      .sort(
        (left, right) =>
          right.totalSignals - left.totalSignals || right.votes - left.votes,
      )
      .slice(0, 3),
    reactionTotals,
  };
}

export function normalizeWorkshopSession(
  session: WorkshopSessionState | undefined,
): NormalizedWorkshopSession {
  const stage = workshopSessionStages.includes(session?.stage ?? "planning")
    ? (session?.stage ?? "planning")
    : "planning";

  return {
    stage,
    votingOpen: session?.votingOpen ?? true,
    reactionsOpen: session?.reactionsOpen ?? true,
    participantCount: clampInteger(session?.participantCount ?? 0, 0, 999),
    facilitatorNote: String(session?.facilitatorNote ?? "").slice(0, 240),
    spotlightElementId: session?.spotlightElementId ?? null,
    facilitationPackId: normalizeFacilitationPackId(
      session?.facilitationPackId,
    ),
    facilitatorScript: String(session?.facilitatorScript ?? "").slice(0, 1800),
    agendaBlocks: normalizeWorkshopAgendaBlocks(session?.agendaBlocks),
    activeAgendaBlockId: session?.activeAgendaBlockId ?? null,
    breakoutSections: normalizeWorkshopBreakoutSections(
      session?.breakoutSections,
    ),
    recapSummary: String(session?.recapSummary ?? "").slice(0, 1200),
    appliedPackAt:
      typeof session?.appliedPackAt === "string" ? session.appliedPackAt : null,
  };
}

export function isWorkshopVotableElement(element: DesignElement) {
  return !element.hidden && !element.locked && element.type !== "connector";
}

export function getWorkshopVoteCount(element: DesignElement) {
  return Math.max(0, Math.round(element.workshopVotes ?? 0));
}

export function getWorkshopReactionCount(
  element: DesignElement,
  kind?: WorkshopReactionKind,
) {
  const reactions = normalizeWorkshopReactions(element.workshopReactions);

  if (kind) return reactions[kind];

  return workshopReactionKinds.reduce(
    (total, reactionKind) => total + reactions[reactionKind],
    0,
  );
}

export function createWorkshopReactionUpdate(
  element: DesignElement,
  kind: WorkshopReactionKind,
  delta: number,
): Pick<DesignElement, "workshopReactions"> {
  const reactions = normalizeWorkshopReactions(element.workshopReactions);
  const nextValue = Math.max(0, reactions[kind] + delta);

  return {
    workshopReactions: {
      ...reactions,
      [kind]: nextValue,
    },
  };
}

export function createClearWorkshopSignalsUpdate(): Pick<
  DesignElement,
  "workshopVotes" | "workshopReactions"
> {
  return {
    workshopVotes: 0,
    workshopReactions: createEmptyReactionTotals(),
  };
}

export function workshopLayerName(element: DesignElement) {
  if (element.type === "text") return element.content || "Text";
  if (element.type === "document") return element.title || "Document";
  if (element.type === "sticky-note") return element.content || "Sticky note";
  if (element.type === "image") return element.alt || "Image";
  if (element.type === "video") return element.title || "Video";
  if (element.type === "audio") return element.title || "Audio";
  if (element.type === "pdf") return element.title || "PDF";
  if (element.type === "svg") return element.name || "SVG";
  if (element.type === "qr") return "QR code";
  if (element.type === "table") return "Table";
  if (element.type === "chart") return "Chart";
  if (element.type === "form") return element.label || element.value || "Form";
  if (element.type === "embed") return element.title || "Embed";
  if (element.type === "timer") return element.label || "Timer";

  return element.type === "shape" ? element.shape : "Layer";
}

function createWorkshopTargetSummary(
  element: DesignElement,
): WorkshopTargetSummary {
  const votes = getWorkshopVoteCount(element);
  const reactionTotals = normalizeWorkshopReactions(element.workshopReactions);
  const reactions = workshopReactionKinds.reduce(
    (total, kind) => total + reactionTotals[kind],
    0,
  );

  return {
    elementId: element.id,
    label: workshopLayerName(element),
    votes,
    reactions,
    totalSignals: votes + reactions,
    reactionTotals,
  };
}

function normalizeWorkshopReactions(
  reactions: WorkshopElementReactions | undefined,
): Record<WorkshopReactionKind, number> {
  return {
    insight: clampInteger(reactions?.insight ?? 0, 0, 999),
    question: clampInteger(reactions?.question ?? 0, 0, 999),
    concern: clampInteger(reactions?.concern ?? 0, 0, 999),
  };
}

function normalizeFacilitationPackId(
  value: WorkshopSessionState["facilitationPackId"],
) {
  if (
    value === "design-sprint" ||
    value === "retro" ||
    value === "decision-room" ||
    value === "content-planning"
  ) {
    return value;
  }

  return null;
}

function normalizeWorkshopAgendaBlocks(
  blocks: WorkshopAgendaBlock[] | undefined,
) {
  if (!Array.isArray(blocks)) return [];

  return blocks.slice(0, 12).map((block, index) => ({
    id: String(block.id || `agenda-${index + 1}`).slice(0, 80),
    title: String(block.title || `Agenda ${index + 1}`).slice(0, 80),
    minutes: clampInteger(block.minutes, 1, 240),
    prompt: String(block.prompt || "").slice(0, 240),
  }));
}

function normalizeWorkshopBreakoutSections(
  sections: WorkshopBreakoutSection[] | undefined,
) {
  if (!Array.isArray(sections)) return [];

  return sections.slice(0, 12).map((section, index) => ({
    id: String(section.id || `breakout-${index + 1}`).slice(0, 80),
    title: String(section.title || `Breakout ${index + 1}`).slice(0, 80),
    prompt: String(section.prompt || "").slice(0, 240),
    targetElementIds: Array.isArray(section.targetElementIds)
      ? section.targetElementIds
          .map((id) => String(id).slice(0, 80))
          .filter(Boolean)
          .slice(0, 30)
      : [],
  }));
}

function createEmptyReactionTotals(): Record<WorkshopReactionKind, number> {
  return {
    insight: 0,
    question: 0,
    concern: 0,
  };
}

function clampInteger(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;

  return Math.max(min, Math.min(max, Math.round(value)));
}

function roundToTenth(value: number) {
  return Math.round(value * 10) / 10;
}
