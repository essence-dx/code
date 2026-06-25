import type {
  DesignElement,
  DesignPage,
  DesignPresetId,
  ProjectDetail,
} from "@/features/editor/types";

export type VisualSuitePageType =
  | "docs"
  | "sheets"
  | "whiteboards"
  | "presentations"
  | "social"
  | "videos"
  | "websites"
  | "email"
  | "print";

export type MixedFormatReadinessStatus = "ready" | "review" | "blocked";

export type MixedFormatPageReadiness = {
  pageId: string;
  pageName: string;
  pageType: VisualSuitePageType;
  pageTypeLabel: string;
  score: number;
  status: MixedFormatReadinessStatus;
  signals: string[];
  gaps: string[];
};

export type MixedFormatProjectOrchestration = {
  projectId: string;
  projectName: string;
  updatedAt: string;
  pageCount: number;
  pageTypes: VisualSuitePageType[];
  pageTypeLabels: string[];
  readinessScore: number;
  status: MixedFormatReadinessStatus;
  isMixedFormat: boolean;
  pageReadiness: MixedFormatPageReadiness[];
  nextBestActions: string[];
};

export type MixedFormatWorkspaceOrchestration = {
  projects: MixedFormatProjectOrchestration[];
  suiteCoverage: Array<{
    pageType: VisualSuitePageType;
    label: string;
    projectCount: number;
    pageCount: number;
    status: MixedFormatReadinessStatus;
  }>;
  totals: {
    projects: number;
    mixedFormatProjects: number;
    pageCount: number;
    averageReadiness: number;
  };
};

export const visualSuitePageTypeLabels: Record<VisualSuitePageType, string> = {
  docs: "Docs",
  sheets: "Sheets",
  whiteboards: "Whiteboards",
  presentations: "Presentations",
  social: "Social",
  videos: "Video",
  websites: "Websites",
  email: "Email",
  print: "Print",
};

const visualSuitePageTypes: VisualSuitePageType[] = [
  "docs",
  "sheets",
  "whiteboards",
  "presentations",
  "social",
  "videos",
  "websites",
  "email",
  "print",
];

export function createMixedFormatWorkspaceOrchestration(
  projects: ProjectDetail[],
): MixedFormatWorkspaceOrchestration {
  const projectReports = projects
    .map(createMixedFormatProjectOrchestration)
    .sort(
      (left, right) =>
        Number(right.isMixedFormat) - Number(left.isMixedFormat) ||
        right.readinessScore - left.readinessScore ||
        new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime(),
    );
  const pageCount = projectReports.reduce(
    (total, project) => total + project.pageCount,
    0,
  );

  return {
    projects: projectReports,
    suiteCoverage: visualSuitePageTypes.map((pageType) =>
      createSuiteCoverage(pageType, projectReports),
    ),
    totals: {
      projects: projectReports.length,
      mixedFormatProjects: projectReports.filter((project) => project.isMixedFormat)
        .length,
      pageCount,
      averageReadiness: projectReports.length
        ? Math.round(
            projectReports.reduce(
              (total, project) => total + project.readinessScore,
              0,
            ) / projectReports.length,
          )
        : 0,
    },
  };
}

export function createMixedFormatProjectOrchestration(
  project: ProjectDetail,
): MixedFormatProjectOrchestration {
  const pageReadiness = project.document.pages.map((page) =>
    createPageReadiness(page, project),
  );
  const pageTypes = Array.from(
    new Set(pageReadiness.map((page) => page.pageType)),
  );
  const readinessScore = pageReadiness.length
    ? Math.round(
        pageReadiness.reduce((total, page) => total + page.score, 0) /
          pageReadiness.length,
      )
    : 0;
  const isMixedFormat = pageTypes.length > 1;

  return {
    projectId: project.id,
    projectName: project.name,
    updatedAt: project.updatedAt,
    pageCount: project.document.pages.length,
    pageTypes,
    pageTypeLabels: pageTypes.map((pageType) => visualSuitePageTypeLabels[pageType]),
    readinessScore,
    status: getReadinessStatus(readinessScore),
    isMixedFormat,
    pageReadiness,
    nextBestActions: createProjectNextBestActions({
      isMixedFormat,
      pageTypes,
      pageReadiness,
    }),
  };
}

export function inferVisualSuitePageType(input: {
  page: DesignPage;
  project: ProjectDetail;
}): VisualSuitePageType {
  const format = input.page.format ?? inferFormatFromProject(input.project);
  const elementTypes = new Set(input.page.elements.map((element) => element.type));

  if (format === "whiteboard" || input.project.document.metadata?.canvasMode === "whiteboard") {
    return "whiteboards";
  }
  if (format === "presentation") return "presentations";
  if (format === "spreadsheet" || elementTypes.has("table")) return "sheets";
  if (format === "website") return "websites";
  if (format === "email-template") return "email";
  if (format === "video" || elementTypes.has("video") || elementTypes.has("audio")) {
    return "videos";
  }
  if (isPrintFormat(format)) return "print";
  if (isDocumentFormat(format) || elementTypes.has("document")) return "docs";

  return "social";
}

function createPageReadiness(
  page: DesignPage,
  project: ProjectDetail,
): MixedFormatPageReadiness {
  const pageType = inferVisualSuitePageType({ page, project });
  const dimensions = {
    width: page.width ?? project.document.width,
    height: page.height ?? project.document.height,
  };
  const signals = createBaseSignals(page, dimensions);
  const gaps: string[] = [];
  let score = 40;

  if (page.elements.length > 0) {
    score += 20;
  } else {
    gaps.push("Add at least one editable layer.");
  }

  if (dimensions.width >= 320 && dimensions.height >= 320) {
    score += 10;
  } else {
    gaps.push("Increase page dimensions for usable exports.");
  }

  if (page.notes?.trim()) {
    score += 5;
    signals.push("Notes");
  }

  score += scoreTypeSpecificSignals({ page, pageType, signals, gaps });

  return {
    pageId: page.id,
    pageName: page.name,
    pageType,
    pageTypeLabel: visualSuitePageTypeLabels[pageType],
    score: Math.max(0, Math.min(100, score)),
    status: getReadinessStatus(score),
    signals,
    gaps: gaps.length ? gaps : ["Ready for this first-pass orchestration view."],
  };
}

function scoreTypeSpecificSignals(input: {
  page: DesignPage;
  pageType: VisualSuitePageType;
  signals: string[];
  gaps: string[];
}) {
  const elementTypes = new Set(input.page.elements.map((element) => element.type));

  if (input.pageType === "docs") {
    return addSignalScore({
      ok: elementTypes.has("document") || elementTypes.has("text"),
      label: "Document text",
      gap: "Add document or text blocks.",
      ...input,
    });
  }

  if (input.pageType === "sheets") {
    return addSignalScore({
      ok: elementTypes.has("table") || elementTypes.has("chart"),
      label: "Data grid",
      gap: "Add a table or chart layer.",
      ...input,
    });
  }

  if (input.pageType === "whiteboards") {
    const hasBoardContent =
      elementTypes.has("sticky-note") ||
      elementTypes.has("connector") ||
      Boolean(input.page.workshopSession);

    return addSignalScore({
      ok: hasBoardContent,
      label: "Workshop structure",
      gap: "Add sticky notes, connectors, or workshop state.",
      ...input,
    });
  }

  if (input.pageType === "presentations") {
    const hasPresentationSignal =
      Boolean(input.page.transition && input.page.transition !== "none") ||
      Boolean(input.page.audienceInteraction) ||
      Boolean(input.page.notes?.trim());

    return addSignalScore({
      ok: hasPresentationSignal,
      label: "Slide notes or interaction",
      gap: "Add speaker notes, transitions, or audience interaction.",
      ...input,
    });
  }

  if (input.pageType === "videos") {
    const hasMotion =
      elementTypes.has("video") ||
      elementTypes.has("audio") ||
      input.page.elements.some(hasLayerMotion);

    return addSignalScore({
      ok: hasMotion,
      label: "Motion or media",
      gap: "Add video, audio, or layer motion.",
      ...input,
    });
  }

  if (input.pageType === "websites") {
    const hasSeo =
      Boolean(input.page.websiteSeoTitle?.trim()) &&
      Boolean(input.page.websiteSeoDescription?.trim());

    return addSignalScore({
      ok: hasSeo,
      label: "SEO metadata",
      gap: "Add section SEO title and description.",
      ...input,
    });
  }

  if (input.pageType === "email") {
    const hasEmailContent = elementTypes.has("text") || elementTypes.has("image");

    return addSignalScore({
      ok: hasEmailContent,
      label: "Email content",
      gap: "Add text or image content for email export.",
      ...input,
    });
  }

  if (input.pageType === "print") {
    const hasBackground = input.page.background !== "transparent";

    return addSignalScore({
      ok: hasBackground,
      label: "Print background",
      gap: "Set a print-safe background.",
      ...input,
    });
  }

  return addSignalScore({
    ok: input.page.elements.length >= 2,
    label: "Social composition",
    gap: "Add at least two layers for a complete social composition.",
    ...input,
  });
}

function addSignalScore(input: {
  ok: boolean;
  label: string;
  gap: string;
  signals: string[];
  gaps: string[];
}) {
  if (input.ok) {
    input.signals.push(input.label);

    return 25;
  }

  input.gaps.push(input.gap);

  return 0;
}

function createBaseSignals(
  page: DesignPage,
  dimensions: { width: number; height: number },
) {
  const signals = [
    `${dimensions.width} x ${dimensions.height}`,
    `${page.elements.length} layers`,
  ];

  if (page.format) signals.push(page.format);
  if (page.background !== "transparent") signals.push("Background");

  return signals;
}

function createProjectNextBestActions(input: {
  isMixedFormat: boolean;
  pageTypes: VisualSuitePageType[];
  pageReadiness: MixedFormatPageReadiness[];
}) {
  const actions: string[] = [];
  const weakestPage = [...input.pageReadiness].sort(
    (left, right) => left.score - right.score,
  )[0];

  if (!input.isMixedFormat) {
    actions.push("Add a second page type to make this a true visual-suite project.");
  }

  if (!input.pageTypes.includes("websites")) {
    actions.push("Add a website page when this project needs hosted publishing.");
  }

  if (!input.pageTypes.includes("email")) {
    actions.push("Add an email page for campaign follow-up handoffs.");
  }

  if (weakestPage && weakestPage.score < 85) {
    actions.push(`${weakestPage.pageName}: ${weakestPage.gaps[0]}`);
  }

  return actions.slice(0, 3);
}

function createSuiteCoverage(
  pageType: VisualSuitePageType,
  projects: MixedFormatProjectOrchestration[],
) {
  const matchingProjects = projects.filter((project) =>
    project.pageTypes.includes(pageType),
  );
  const pageCount = projects.reduce(
    (total, project) =>
      total +
      project.pageReadiness.filter((page) => page.pageType === pageType).length,
    0,
  );
  const score = matchingProjects.length ? 100 : 0;

  return {
    pageType,
    label: visualSuitePageTypeLabels[pageType],
    projectCount: matchingProjects.length,
    pageCount,
    status: getReadinessStatus(score),
  };
}

function getReadinessStatus(score: number): MixedFormatReadinessStatus {
  if (score >= 85) return "ready";
  if (score >= 60) return "review";

  return "blocked";
}

function inferFormatFromProject(project: ProjectDetail): DesignPresetId {
  const ratio = project.width / Math.max(1, project.height);

  if (project.document.metadata?.canvasMode === "whiteboard") return "whiteboard";
  if (ratio > 1.45) return "presentation";
  if (ratio < 0.65) return "video";

  return project.width === project.height ? "instagram-post" : "custom";
}

function isDocumentFormat(format: DesignPresetId) {
  return format === "document" || format === "resume" || format === "course";
}

function isPrintFormat(format: DesignPresetId) {
  return (
    format === "poster" ||
    format === "flyer" ||
    format === "business-card" ||
    format === "print-product" ||
    format === "infographic"
  );
}

function hasLayerMotion(element: DesignElement) {
  return Boolean(
    element.motionPreset && element.motionPreset !== "none" && !element.hidden,
  );
}
