import type {
  DesignElement,
  DesignPage,
  ProjectDetail,
  TextElement,
} from "@/features/editor/types";
import type {
  LayoutContentBounds,
  LayoutHierarchyCheck,
  LayoutRepairOperation,
  LayoutRepairPlan,
  LayoutResponsiveSuggestion,
  LayoutSpacingAudit,
  RuleBasedLayoutIntelligenceCenter,
  RuleBasedLayoutIntelligenceInput,
  RuleBasedLayoutPageReport,
  RuleBasedLayoutProjectReport,
  RuleBasedLayoutStatus,
} from "@/features/creation/rule-based-layout-intelligence-types";

export type {
  LayoutContentBounds,
  LayoutHierarchyCheck,
  LayoutHierarchyIssue,
  LayoutPageDimensions,
  LayoutRepairOperation,
  LayoutRepairOperationKind,
  LayoutRepairPlan,
  LayoutResponsiveSuggestion,
  LayoutSpacingAudit,
  LayoutSpacingIssue,
  RuleBasedLayoutIntelligenceCenter,
  RuleBasedLayoutIntelligenceInput,
  RuleBasedLayoutPageReport,
  RuleBasedLayoutProjectReport,
  RuleBasedLayoutStatus,
} from "@/features/creation/rule-based-layout-intelligence-types";

type PageAnalysis = {
  project: ProjectDetail;
  page: DesignPage;
  pageDimensions: {
    width: number;
    height: number;
  };
  contentBounds: LayoutContentBounds | null;
  spacingAudits: LayoutSpacingAudit[];
  hierarchyChecks: LayoutHierarchyCheck[];
  responsiveSuggestions: LayoutResponsiveSuggestion[];
};

type RepairPlanDraft = Omit<LayoutRepairPlan, "dataUrl" | "json" | "fileName">;

export function createRuleBasedLayoutIntelligenceCenter(
  input: RuleBasedLayoutIntelligenceInput,
): RuleBasedLayoutIntelligenceCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const analyses = input.projects.flatMap((project) =>
    project.document.pages.map((page) => analyzePage(project, page)),
  );
  const spacingAudits = analyses.flatMap((analysis) => analysis.spacingAudits);
  const hierarchyChecks = analyses.flatMap(
    (analysis) => analysis.hierarchyChecks,
  );
  const responsiveSuggestions = analyses.flatMap(
    (analysis) => analysis.responsiveSuggestions,
  );
  const repairPlans = createRepairPlans({
    generatedAt,
    analyses,
    spacingAudits,
    hierarchyChecks,
    responsiveSuggestions,
  });
  const pageReports = createPageReports({
    analyses,
    repairPlans,
  });
  const projectReports = createProjectReports({
    projects: input.projects,
    pageReports,
    repairPlans,
  });
  const status = aggregateStatus([
    ...pageReports.map((page) => page.status),
    ...repairPlans.map((plan) => plan.status),
  ]);
  const score = average(
    pageReports.map((page) => page.score),
    100,
  );
  const nextActions = createNextActions({
    projectReports,
    repairPlans,
    responsiveSuggestions,
  });

  return {
    generatedAt,
    status,
    score,
    projectReports,
    pageReports,
    spacingAudits,
    hierarchyChecks,
    responsiveSuggestions,
    repairPlans,
    nextActions,
    totals: {
      projects: input.projects.length,
      pages: pageReports.length,
      spacingAudits: spacingAudits.length,
      hierarchyChecks: hierarchyChecks.length,
      responsiveSuggestions: responsiveSuggestions.length,
      repairPlans: repairPlans.length,
      blockedPages: pageReports.filter((page) => page.status === "blocked")
        .length,
      reviewPages: pageReports.filter((page) => page.status === "review")
        .length,
    },
  };
}

function analyzePage(project: ProjectDetail, page: DesignPage): PageAnalysis {
  const pageDimensions = getPageDimensions(project, page);
  const visibleElements = getVisibleElements(page);
  const contentBounds = getContentBounds(visibleElements);
  const spacingAudits = createSpacingAudits({
    project,
    page,
    pageDimensions,
    visibleElements,
    contentBounds,
  });
  const hierarchyChecks = [
    createHierarchyCheck({
      project,
      page,
      visibleElements,
    }),
  ];
  const responsiveSuggestions = createResponsiveSuggestions({
    project,
    page,
    pageDimensions,
    visibleElements,
    contentBounds,
  });

  return {
    project,
    page,
    pageDimensions,
    contentBounds,
    spacingAudits,
    hierarchyChecks,
    responsiveSuggestions,
  };
}

function createSpacingAudits(input: {
  project: ProjectDetail;
  page: DesignPage;
  pageDimensions: { width: number; height: number };
  visibleElements: DesignElement[];
  contentBounds: LayoutContentBounds | null;
}): LayoutSpacingAudit[] {
  const audits: LayoutSpacingAudit[] = [];

  if (!input.visibleElements.length || !input.contentBounds) {
    return [
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: "review",
        issue: "margin-risk",
        elementIds: [],
        measurement: 0,
        detail: "No visible layers are available for layout spacing analysis.",
        repairAction: "Add editable layers before running layout repairs.",
      }),
    ];
  }

  const sorted = [...input.visibleElements].sort(
    (left, right) => left.y - right.y || left.x - right.x,
  );
  const tightPair = findTightVerticalPair(sorted);

  if (tightPair) {
    audits.push(
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: tightPair.gap < 0 ? "blocked" : "review",
        issue: "cramped-spacing",
        elementIds: [tightPair.previous.id, tightPair.next.id],
        measurement: tightPair.gap,
        detail: `${tightPair.previous.id} and ${tightPair.next.id} have ${tightPair.gap}px vertical spacing.`,
        repairAction:
          "Distribute vertical spacing to at least 32px between stacked layers.",
      }),
    );
  }

  const leftEdgeSpread =
    Math.max(...input.visibleElements.map((element) => element.x)) -
    Math.min(...input.visibleElements.map((element) => element.x));

  if (leftEdgeSpread > 32) {
    audits.push(
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: "review",
        issue: "alignment-drift",
        elementIds: input.visibleElements.map((element) => element.id),
        measurement: leftEdgeSpread,
        detail: `Left edges drift by ${leftEdgeSpread}px across the page.`,
        repairAction: "Align primary content to a shared left edge.",
      }),
    );
  }

  const safeMargin = Math.round(
    Math.min(
      input.contentBounds.x,
      input.contentBounds.y,
      input.pageDimensions.width - input.contentBounds.right,
      input.pageDimensions.height - input.contentBounds.bottom,
    ),
  );

  if (safeMargin < 24) {
    audits.push(
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: "review",
        issue: "margin-risk",
        elementIds: input.visibleElements.map((element) => element.id),
        measurement: safeMargin,
        detail: `The smallest page margin is ${safeMargin}px.`,
        repairAction: "Move content inside a 48px safe margin.",
      }),
    );
  }

  const contentBottomRatio =
    input.contentBounds.bottom / Math.max(1, input.pageDimensions.height);

  if (input.visibleElements.length >= 3 && contentBottomRatio < 0.3) {
    audits.push(
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: "review",
        issue: "density-risk",
        elementIds: input.visibleElements.map((element) => element.id),
        measurement: Math.round(contentBottomRatio * 100),
        detail: `Primary layers occupy only the top ${Math.round(contentBottomRatio * 100)}% of the page.`,
        repairAction:
          "Redistribute stacked content through the visual safe area.",
      }),
    );
  }

  if (!audits.length) {
    audits.push(
      createSpacingAudit({
        project: input.project,
        page: input.page,
        status: "ready",
        issue: "balanced",
        elementIds: input.visibleElements.map((element) => element.id),
        measurement: safeMargin,
        detail:
          "Layer spacing, alignment, density, and safe margins are balanced.",
        repairAction: "No spacing repair is needed.",
      }),
    );
  }

  return audits;
}

function createSpacingAudit(input: {
  project: ProjectDetail;
  page: DesignPage;
  status: RuleBasedLayoutStatus;
  issue: LayoutSpacingAudit["issue"];
  elementIds: string[];
  measurement: number;
  detail: string;
  repairAction: string;
}): LayoutSpacingAudit {
  return {
    id: `spacing-${input.project.id}-${input.page.id}-${input.issue}`,
    projectId: input.project.id,
    pageId: input.page.id,
    status: input.status,
    issue: input.issue,
    elementIds: input.elementIds,
    measurement: input.measurement,
    detail: input.detail,
    repairAction: input.repairAction,
  };
}

function createHierarchyCheck(input: {
  project: ProjectDetail;
  page: DesignPage;
  visibleElements: DesignElement[];
}): LayoutHierarchyCheck {
  const textElements = input.visibleElements
    .filter((element): element is TextElement => element.type === "text")
    .sort((left, right) => right.fontSize - left.fontSize || left.y - right.y);
  const visualOrder = [...textElements].sort((left, right) => left.y - right.y);
  const heading =
    visualOrder.find((element) => element.fontSize >= 24) ??
    textElements[0] ??
    null;
  const largestLaterText =
    heading &&
    visualOrder
      .filter((element) => element.id !== heading.id && element.y >= heading.y)
      .sort((left, right) => right.fontSize - left.fontSize)[0];
  const body =
    largestLaterText ??
    textElements.find((element) => element.id !== heading?.id) ??
    null;

  if (!heading) {
    return createHierarchyResult({
      project: input.project,
      page: input.page,
      status: "review",
      issue: "missing-heading",
      heading,
      body,
      detail: "No text layer is available to establish hierarchy.",
      repairAction: "Add a headline and supporting text before export.",
    });
  }

  if (body && body.fontSize >= heading.fontSize) {
    return createHierarchyResult({
      project: input.project,
      page: input.page,
      status: "blocked",
      issue: "body-outsizes-heading",
      heading,
      body,
      detail: `${body.id} uses ${body.fontSize}px while the heading uses ${heading.fontSize}px.`,
      repairAction:
        "Scale body copy below the headline and restore a clear type hierarchy.",
    });
  }

  const firstText = visualOrder[0];

  if (firstText && firstText.id !== heading.id) {
    return createHierarchyResult({
      project: input.project,
      page: input.page,
      status: "review",
      issue: "heading-order-risk",
      heading,
      body: firstText,
      detail: `${heading.id} is visually lower than smaller supporting text.`,
      repairAction: "Move the headline before supporting text in visual order.",
    });
  }

  return createHierarchyResult({
    project: input.project,
    page: input.page,
    status: "ready",
    issue: "balanced",
    heading,
    body,
    detail: "Text hierarchy has a clear headline and supporting copy scale.",
    repairAction: "No hierarchy repair is needed.",
  });
}

function createHierarchyResult(input: {
  project: ProjectDetail;
  page: DesignPage;
  status: RuleBasedLayoutStatus;
  issue: LayoutHierarchyCheck["issue"];
  heading: TextElement | null;
  body: TextElement | null;
  detail: string;
  repairAction: string;
}): LayoutHierarchyCheck {
  return {
    id: `hierarchy-${input.project.id}-${input.page.id}`,
    projectId: input.project.id,
    pageId: input.page.id,
    status: input.status,
    issue: input.issue,
    headingElementId: input.heading?.id ?? null,
    bodyElementId: input.body?.id ?? null,
    headingSize: input.heading?.fontSize ?? 0,
    bodySize: input.body?.fontSize ?? 0,
    detail: input.detail,
    repairAction: input.repairAction,
  };
}

function createResponsiveSuggestions(input: {
  project: ProjectDetail;
  page: DesignPage;
  pageDimensions: { width: number; height: number };
  visibleElements: DesignElement[];
  contentBounds: LayoutContentBounds | null;
}): LayoutResponsiveSuggestion[] {
  return responsiveTargets.map((target) => {
    const scalePercent = calculateScalePercent(input.pageDimensions, target);
    const safeAreaCoverage = input.contentBounds
      ? calculateSafeAreaCoverage(input.contentBounds, input.pageDimensions)
      : 0;
    const ratioDelta = Math.abs(
      input.pageDimensions.width / Math.max(1, input.pageDimensions.height) -
        target.width / target.height,
    );
    const status: RuleBasedLayoutStatus =
      safeAreaCoverage > 92 || ratioDelta > 0.4 ? "review" : "ready";

    return {
      id: `responsive-${input.project.id}-${input.page.id}-${target.id}`,
      projectId: input.project.id,
      pageId: input.page.id,
      targetFormatId: target.id,
      targetLabel: target.label,
      status,
      targetWidth: target.width,
      targetHeight: target.height,
      scalePercent,
      safeAreaCoverage,
      suggestedFormat: target.format,
      detail: `${input.page.name} can adapt to ${target.label} at ${scalePercent}% scale with ${safeAreaCoverage}% safe-area coverage.`,
      steps: createResponsiveSteps({
        targetLabel: target.label,
        scalePercent,
        safeAreaCoverage,
        status,
      }),
    };
  });
}

function createRepairPlans(input: {
  generatedAt: string;
  analyses: PageAnalysis[];
  spacingAudits: LayoutSpacingAudit[];
  hierarchyChecks: LayoutHierarchyCheck[];
  responsiveSuggestions: LayoutResponsiveSuggestion[];
}): LayoutRepairPlan[] {
  const drafts = input.analyses.flatMap((analysis) =>
    createPageRepairPlanDrafts({
      ...input,
      analysis,
    }),
  );

  return drafts.map((draft) => {
    const payload = {
      kind: "essence-studio.rule-based-layout-intelligence",
      schemaVersion: 1,
      generatedAt: input.generatedAt,
      repairPlanId: draft.id,
      projectId: draft.projectId,
      pageId: draft.pageId,
      title: draft.title,
      status: draft.status,
      sourceIds: draft.sourceIds,
      operations: draft.operations,
    };
    const json = JSON.stringify(payload, null, 2);

    return {
      ...draft,
      fileName: `${draft.id}.json`,
      dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
      json,
    };
  });
}

function createPageRepairPlanDrafts(input: {
  generatedAt: string;
  analysis: PageAnalysis;
  spacingAudits: LayoutSpacingAudit[];
  hierarchyChecks: LayoutHierarchyCheck[];
  responsiveSuggestions: LayoutResponsiveSuggestion[];
}): RepairPlanDraft[] {
  const pageSpacing = input.spacingAudits.filter(
    (audit) =>
      audit.pageId === input.analysis.page.id && audit.status !== "ready",
  );
  const pageHierarchy = input.hierarchyChecks.filter(
    (check) =>
      check.pageId === input.analysis.page.id && check.status !== "ready",
  );
  const pageResponsive = input.responsiveSuggestions.filter(
    (suggestion) =>
      suggestion.pageId === input.analysis.page.id &&
      suggestion.status !== "ready",
  );
  const drafts: RepairPlanDraft[] = [];
  const combinedOperations = createLayoutRepairOperations({
    analysis: input.analysis,
    spacingAudits: pageSpacing,
    hierarchyChecks: pageHierarchy,
  });

  if (combinedOperations.length) {
    drafts.push({
      id: `repair-${input.analysis.project.id}-${input.analysis.page.id}-layout`,
      projectId: input.analysis.project.id,
      pageId: input.analysis.page.id,
      title: `${input.analysis.page.name} layout repair`,
      status: aggregateStatus([
        ...pageSpacing.map((audit) => audit.status),
        ...pageHierarchy.map((check) => check.status),
      ]),
      sourceIds: [
        ...pageSpacing.map((audit) => audit.id),
        ...pageHierarchy.map((check) => check.id),
      ],
      operations: combinedOperations,
    });
  }

  const shouldCreateResponsiveRepair =
    pageSpacing.length > 0 || pageHierarchy.length > 0;

  for (const suggestion of shouldCreateResponsiveRepair ? pageResponsive : []) {
    drafts.push({
      id: `repair-${input.analysis.project.id}-${input.analysis.page.id}-${suggestion.targetFormatId}`,
      projectId: input.analysis.project.id,
      pageId: input.analysis.page.id,
      title: `${input.analysis.page.name} ${suggestion.targetLabel} repair`,
      status: suggestion.status,
      sourceIds: [suggestion.id],
      operations: [
        {
          kind: "resize-for-format",
          targetElementIds: input.analysis.page.elements.map(
            (element) => element.id,
          ),
          description: `Resize the page to ${suggestion.targetWidth}x${suggestion.targetHeight} for ${suggestion.targetLabel}.`,
          width: suggestion.targetWidth,
          height: suggestion.targetHeight,
        },
        {
          kind: "scale-to-safe-area",
          targetElementIds: input.analysis.page.elements.map(
            (element) => element.id,
          ),
          description: `Scale the current layout to ${suggestion.scalePercent}% and keep content inside safe margins.`,
        },
      ],
    });
  }

  return drafts.sort((left, right) => left.id.localeCompare(right.id));
}

function createLayoutRepairOperations(input: {
  analysis: PageAnalysis;
  spacingAudits: LayoutSpacingAudit[];
  hierarchyChecks: LayoutHierarchyCheck[];
}): LayoutRepairOperation[] {
  const operations: LayoutRepairOperation[] = [];
  const visibleElements = getVisibleElements(input.analysis.page);
  const leftEdge = Math.max(
    48,
    Math.min(...visibleElements.map((element) => element.x)),
  );

  if (
    input.spacingAudits.some(
      (audit) =>
        audit.issue === "alignment-drift" || audit.issue === "margin-risk",
    )
  ) {
    operations.push({
      kind: "align-left-edges",
      targetElementIds: visibleElements.map((element) => element.id),
      description: `Align primary layer left edges to ${leftEdge}px.`,
      x: leftEdge,
    });
  }

  if (
    input.spacingAudits.some(
      (audit) =>
        audit.issue === "cramped-spacing" || audit.issue === "density-risk",
    )
  ) {
    operations.push({
      kind: "distribute-vertical-spacing",
      targetElementIds: visibleElements.map((element) => element.id),
      description:
        "Distribute stacked layers with at least 32px vertical spacing through the safe area.",
      y: 64,
    });
  }

  const hierarchy = input.hierarchyChecks.find(
    (check) => check.status !== "ready",
  );

  if (hierarchy?.headingElementId && hierarchy.bodyElementId) {
    operations.push({
      kind: "restore-text-hierarchy",
      targetElementIds: [hierarchy.headingElementId, hierarchy.bodyElementId],
      description:
        "Restore a clear headline/body scale by reducing supporting copy below the headline.",
      fontSize: Math.max(16, Math.round(hierarchy.headingSize * 0.62)),
    });
  }

  return operations;
}

function createPageReports(input: {
  analyses: PageAnalysis[];
  repairPlans: LayoutRepairPlan[];
}): RuleBasedLayoutPageReport[] {
  return input.analyses
    .map((analysis) => {
      const spacing = analysis.spacingAudits;
      const hierarchy = analysis.hierarchyChecks;
      const responsive = analysis.responsiveSuggestions;
      const repairPlans = input.repairPlans.filter(
        (plan) => plan.pageId === analysis.page.id,
      );
      const status = aggregateStatus([
        ...spacing.map((audit) => audit.status),
        ...hierarchy.map((check) => check.status),
      ]);
      const score = scorePage({
        status,
        spacing,
        hierarchy,
        responsive,
      });

      return {
        id: `layout-page-${analysis.project.id}-${analysis.page.id}`,
        projectId: analysis.project.id,
        projectName: analysis.project.name,
        pageId: analysis.page.id,
        pageName: analysis.page.name,
        status,
        score,
        dimensions: analysis.pageDimensions,
        contentBounds: analysis.contentBounds,
        spacingAuditIds: spacing.map((audit) => audit.id),
        hierarchyCheckIds: hierarchy.map((check) => check.id),
        responsiveSuggestionIds: responsive.map((suggestion) => suggestion.id),
        repairPlanIds: repairPlans.map((plan) => plan.id),
        nextAction: createPageNextAction({
          pageName: analysis.page.name,
          status,
          repairPlans,
        }),
      };
    })
    .sort(comparePageReports);
}

function createProjectReports(input: {
  projects: ProjectDetail[];
  pageReports: RuleBasedLayoutPageReport[];
  repairPlans: LayoutRepairPlan[];
}): RuleBasedLayoutProjectReport[] {
  return input.projects
    .map((project) => {
      const pages = input.pageReports.filter(
        (page) => page.projectId === project.id,
      );
      const repairPlans = input.repairPlans.filter(
        (plan) => plan.projectId === project.id,
      );
      const status = aggregateStatus(pages.map((page) => page.status));
      const score = average(
        pages.map((page) => page.score),
        100,
      );

      return {
        id: `layout-project-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        status,
        score,
        pageCount: pages.length,
        pageReportIds: pages.map((page) => page.id),
        repairPlanIds: repairPlans.map((plan) => plan.id),
        nextAction:
          status === "ready"
            ? `${project.name}: layout intelligence is ready.`
            : `Apply ${repairPlans.length} layout repair plan${repairPlans.length === 1 ? "" : "s"} for ${project.name}.`,
      };
    })
    .sort(compareProjectReports);
}

function scorePage(input: {
  status: RuleBasedLayoutStatus;
  spacing: LayoutSpacingAudit[];
  hierarchy: LayoutHierarchyCheck[];
  responsive: LayoutResponsiveSuggestion[];
}) {
  const findings = [...input.spacing, ...input.hierarchy, ...input.responsive];
  const blocked = findings.filter(
    (finding) => finding.status === "blocked",
  ).length;
  const review = findings.filter(
    (finding) => finding.status === "review",
  ).length;
  const base = input.status === "ready" ? 96 : 92;

  return Math.max(0, Math.min(100, base - blocked * 24 - review * 8));
}

function createPageNextAction(input: {
  pageName: string;
  status: RuleBasedLayoutStatus;
  repairPlans: LayoutRepairPlan[];
}) {
  if (input.status === "ready") {
    return `${input.pageName}: no layout repair is needed.`;
  }

  return `${input.pageName}: apply ${input.repairPlans.length} one-click repair plan${input.repairPlans.length === 1 ? "" : "s"}.`;
}

function createNextActions(input: {
  projectReports: RuleBasedLayoutProjectReport[];
  repairPlans: LayoutRepairPlan[];
  responsiveSuggestions: LayoutResponsiveSuggestion[];
}) {
  return unique([
    ...input.projectReports
      .filter((project) => project.status !== "ready")
      .map((project) => project.nextAction),
    ...input.responsiveSuggestions
      .filter((suggestion) => suggestion.status !== "ready")
      .map(
        (suggestion) =>
          `${suggestion.targetLabel}: ${suggestion.steps[0] ?? suggestion.detail}`,
      ),
    input.repairPlans.length
      ? `Review ${input.repairPlans.length} one-click repair plan${input.repairPlans.length === 1 ? "" : "s"} before applying layout changes.`
      : "No layout repairs are queued.",
  ]).slice(0, 6);
}

function findTightVerticalPair(elements: DesignElement[]) {
  let tightest: {
    previous: DesignElement;
    next: DesignElement;
    gap: number;
  } | null = null;

  for (let index = 1; index < elements.length; index += 1) {
    const previous = elements[index - 1];
    const next = elements[index];

    if (!previous || !next) continue;

    const gap = Math.round(next.y - (previous.y + previous.height));

    if (!tightest || gap < tightest.gap) {
      tightest = { previous, next, gap };
    }
  }

  if (tightest && tightest.gap < 16) return tightest;

  return null;
}

function createResponsiveSteps(input: {
  targetLabel: string;
  scalePercent: number;
  safeAreaCoverage: number;
  status: RuleBasedLayoutStatus;
}) {
  return [
    `Scale grouped content to ${input.scalePercent}% for ${input.targetLabel}.`,
    `Keep primary layers under ${Math.max(80, input.safeAreaCoverage)}% safe-area coverage.`,
    input.status === "ready"
      ? "Preserve current hierarchy after resizing."
      : "Re-center content and re-run hierarchy checks after resizing.",
  ];
}

function getPageDimensions(project: ProjectDetail, page: DesignPage) {
  return {
    width: page.width ?? project.document.width,
    height: page.height ?? project.document.height,
  };
}

function getVisibleElements(page: DesignPage) {
  return page.elements.filter((element) => !element.hidden);
}

function getContentBounds(
  elements: DesignElement[],
): LayoutContentBounds | null {
  if (!elements.length) return null;

  const x = Math.min(...elements.map((element) => element.x));
  const y = Math.min(...elements.map((element) => element.y));
  const right = Math.max(
    ...elements.map((element) => element.x + element.width),
  );
  const bottom = Math.max(
    ...elements.map((element) => element.y + element.height),
  );

  return {
    x,
    y,
    width: right - x,
    height: bottom - y,
    right,
    bottom,
  };
}

function calculateScalePercent(
  source: { width: number; height: number },
  target: { width: number; height: number },
) {
  return Math.round(
    Math.min(target.width / source.width, target.height / source.height) * 100,
  );
}

function calculateSafeAreaCoverage(
  bounds: LayoutContentBounds,
  dimensions: { width: number; height: number },
) {
  const widthCoverage = (bounds.width / Math.max(1, dimensions.width)) * 100;
  const heightCoverage = (bounds.height / Math.max(1, dimensions.height)) * 100;

  return Math.round(Math.max(widthCoverage, heightCoverage));
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function aggregateStatus(
  statuses: RuleBasedLayoutStatus[],
): RuleBasedLayoutStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function comparePageReports(
  left: RuleBasedLayoutPageReport,
  right: RuleBasedLayoutPageReport,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName) ||
    left.pageName.localeCompare(right.pageName)
  );
}

function compareProjectReports(
  left: RuleBasedLayoutProjectReport,
  right: RuleBasedLayoutProjectReport,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName)
  );
}

function statusWeight(status: RuleBasedLayoutStatus) {
  if (status === "blocked") return 2;
  if (status === "review") return 1;

  return 0;
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

const responsiveTargets = [
  {
    id: "mobile-story" as const,
    label: "Mobile story",
    width: 1080,
    height: 1920,
    format: "instagram-post" as const,
  },
  {
    id: "presentation-slide" as const,
    label: "Presentation slide",
    width: 1920,
    height: 1080,
    format: "presentation" as const,
  },
];
