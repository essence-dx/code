import {
  createConnectorElement,
  createShapeElement,
  createStickyNoteElement,
  createTextElement,
  createTimerElement,
} from "@/features/editor/document-factory";
import type {
  DesignElement,
  DesignPage,
  WorkshopBreakoutSection,
  WorkshopFacilitationPackId,
  WorkshopSessionState,
} from "@/features/editor/types";
import {
  createWorkshopSessionSummary,
  normalizeWorkshopSession,
} from "@/features/editor/workshop-analytics";
import { getWorkshopFacilitationPack } from "@/features/editor/workshop-facilitation-pack-catalog";

export {
  getWorkshopFacilitationPack,
  workshopFacilitationPacks,
} from "@/features/editor/workshop-facilitation-pack-catalog";

export type WorkshopPackApplication = {
  elements: DesignElement[];
  sessionUpdates: Partial<WorkshopSessionState>;
};

export type WorkshopSessionExport = {
  fileName: string;
  markdown: string;
};

export function createWorkshopPackApplication(
  page: DesignPage,
  packId: WorkshopFacilitationPackId,
): WorkshopPackApplication {
  const pack = getWorkshopFacilitationPack(packId);
  const width = page.width ?? 2400;
  const height = page.height ?? 1350;
  const startX = Math.max(64, Math.round(width * 0.05));
  const startY = Math.max(64, Math.round(height * 0.08));
  const columnGap = Math.max(28, Math.round(width * 0.016));
  const columnWidth = Math.max(
    260,
    Math.round((width - startX * 2 - columnGap * 2) / 3),
  );
  const columnHeight = Math.max(520, Math.round(height * 0.58));
  const noteWidth = Math.min(260, Math.max(200, columnWidth - 48));
  const groupId = `workshop-pack-${pack.id}`;
  const elements: DesignElement[] = [];
  const breakoutSections: WorkshopBreakoutSection[] = [];

  elements.push(
    createTextElement({
      content: pack.name,
      x: startX,
      y: startY,
      width: Math.min(620, width - startX * 2),
      height: 72,
      fontSize: 46,
      fontWeight: 800,
      color: "#0f172a",
      locked: true,
      groupId,
    }),
    createTextElement({
      content: pack.description,
      x: startX,
      y: startY + 72,
      width: Math.min(760, width - startX * 2),
      height: 64,
      fontSize: 22,
      fontWeight: 500,
      color: "#475569",
      lineHeight: 1.2,
      locked: true,
      groupId,
    }),
    createTimerElement({
      label: pack.agendaBlocks[0]?.title ?? "Workshop timer",
      durationSeconds: (pack.agendaBlocks[0]?.minutes ?? 10) * 60,
      x: Math.max(startX, width - startX - 360),
      y: startY,
      width: 320,
      height: 130,
      fontSize: 38,
      surfaceColor: "#ffffff",
      borderColor: "#cbd5e1",
      accentColor: "#2563eb",
      locked: true,
      groupId,
    }),
  );

  pack.boardColumns.forEach((column, columnIndex) => {
    const x = startX + columnIndex * (columnWidth + columnGap);
    const y = startY + 180;
    const section = createShapeElement({
      x,
      y,
      width: columnWidth,
      height: columnHeight,
      fill: "#ffffff",
      stroke: column.accent,
      strokeWidth: 2,
      radius: 28,
      opacity: 0.92,
      locked: true,
      groupId,
    });
    const title = createTextElement({
      content: column.title,
      x: x + 28,
      y: y + 26,
      width: columnWidth - 56,
      height: 42,
      fontSize: 27,
      fontWeight: 800,
      color: "#0f172a",
      locked: true,
      groupId,
    });
    const prompt = createTextElement({
      content: column.prompt,
      x: x + 28,
      y: y + 68,
      width: columnWidth - 56,
      height: 48,
      fontSize: 17,
      fontWeight: 500,
      color: "#64748b",
      lineHeight: 1.18,
      locked: true,
      groupId,
    });
    const noteElements = column.notes.map((note, noteIndex) =>
      createStickyNoteElement({
        content: note,
        x: x + 28,
        y: y + 136 + noteIndex * 132,
        width: noteWidth,
        height: 108,
        fill: column.color,
        textColor: "#111827",
        accentColor: column.accent,
        fontSize: 20,
        fontWeight: 700,
        groupId,
      }),
    );

    elements.push(section, title, prompt, ...noteElements);
    breakoutSections.push({
      id: `${pack.id}-breakout-${columnIndex + 1}`,
      title: column.title,
      prompt: column.prompt,
      targetElementIds: noteElements.map((element) => element.id),
    });

    if (columnIndex > 0) {
      elements.push(
        createConnectorElement({
          x: x - columnGap + 6,
          y: y + 80,
          width: columnGap - 12,
          height: 0,
          stroke: "#94a3b8",
          strokeWidth: 3,
          strokeStyle: "dashed",
          endMarker: "arrow",
          locked: true,
          groupId,
        }),
      );
    }
  });

  return {
    elements,
    sessionUpdates: {
      stage: "planning",
      votingOpen: true,
      reactionsOpen: true,
      facilitationPackId: pack.id,
      facilitatorScript: pack.facilitatorScript,
      facilitatorNote: pack.recapPrompt,
      agendaBlocks: pack.agendaBlocks,
      activeAgendaBlockId: pack.agendaBlocks[0]?.id ?? null,
      breakoutSections,
      recapSummary: "",
      appliedPackAt: new Date().toISOString(),
    },
  };
}

export function createWorkshopSessionExport(page: DesignPage): WorkshopSessionExport {
  const summary = createWorkshopSessionSummary(page);
  const session = normalizeWorkshopSession(page.workshopSession);
  const pack = getWorkshopFacilitationPack(session.facilitationPackId);
  const agendaLines = session.agendaBlocks.length
    ? session.agendaBlocks.map(
        (block, index) =>
          `${index + 1}. ${block.title} (${block.minutes} min): ${block.prompt}`,
      )
    : ["No agenda blocks saved."];
  const breakoutLines = session.breakoutSections.length
    ? session.breakoutSections.map(
        (section, index) =>
          `${index + 1}. ${section.title}: ${section.prompt} (${section.targetElementIds.length} targets)`,
      )
    : ["No breakout sections saved."];
  const targetLines = summary.topTargets.length
    ? summary.topTargets.map(
        (target, index) =>
          `${index + 1}. ${target.label}: ${target.totalSignals} signals (${target.votes} votes, ${target.reactions} reactions)`,
      )
    : ["No voted targets yet."];
  const recap =
    session.recapSummary ||
    session.facilitatorNote ||
    pack.recapPrompt ||
    "No facilitator recap saved yet.";

  return {
    fileName: `${slugify(page.name || "workshop")}-session-summary.md`,
    markdown: [
      `# ${page.name || "Workshop"} session summary`,
      "",
      `Pack: ${pack.name}`,
      `Stage: ${session.stage}`,
      `Participants: ${session.participantCount}`,
      `Signals: ${summary.totalSignals} total, ${summary.averageSignalsPerParticipant} per participant`,
      "",
      "## Facilitator script",
      session.facilitatorScript || "No facilitator script saved.",
      "",
      "## Agenda",
      ...agendaLines,
      "",
      "## Breakout sections",
      ...breakoutLines,
      "",
      "## Top signals",
      ...targetLines,
      "",
      "## Recap",
      recap,
      "",
    ].join("\n"),
  };
}

export function createWorkshopRecapSuggestion(page: DesignPage) {
  const summary = createWorkshopSessionSummary(page);
  const session = normalizeWorkshopSession(page.workshopSession);
  const topTarget = summary.topTargets[0];
  const pack = getWorkshopFacilitationPack(session.facilitationPackId);

  if (!topTarget) {
    return pack.recapPrompt;
  }

  return `${pack.recapPrompt} Current strongest signal: ${topTarget.label} with ${topTarget.totalSignals} total signals.`;
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "workshop";
}
