import { getTextContrastStatus } from "@/features/editor/color-contrast";
import type {
  BrandFontRole,
  BrandFontSummary,
  DesignPage,
  ProjectDetail,
  TextElement,
} from "@/features/editor/types";
import type {
  ProfessionalTypographyStatus,
  ProfessionalTypographySystemCenter,
  ProfessionalTypographySystemInput,
  TypographyFontPairingGuidance,
  TypographyPageReport,
  TypographyProjectReport,
  TypographyReadabilityCheck,
  TypographyRepairOperation,
  TypographyRepairPacket,
  TypographyScale,
  TypographyScaleToken,
  TypographyTokenRole,
} from "@/features/creation/professional-typography-system-types";

export type {
  ProfessionalTypographyStatus,
  ProfessionalTypographySystemCenter,
  ProfessionalTypographySystemInput,
  TypographyFontPairingGuidance,
  TypographyPageReport,
  TypographyProjectReport,
  TypographyReadabilityCheck,
  TypographyReadabilityIssue,
  TypographyRepairOperation,
  TypographyRepairOperationKind,
  TypographyRepairPacket,
  TypographyScale,
  TypographyScaleToken,
  TypographyTokenRole,
} from "@/features/creation/professional-typography-system-types";

type PageTypographyAnalysis = {
  project: ProjectDetail;
  page: DesignPage;
  textElements: TextElement[];
  readabilityChecks: TypographyReadabilityCheck[];
  offBrandTextElements: TextElement[];
};

type RepairPacketDraft = Omit<
  TypographyRepairPacket,
  "dataUrl" | "json" | "fileName"
>;

const tokenRoles: TypographyTokenRole[] = [
  "display",
  "heading",
  "subheading",
  "body",
  "caption",
];

const roleLabels: Record<TypographyTokenRole, string> = {
  display: "Display",
  heading: "Heading",
  subheading: "Subheading",
  body: "Body",
  caption: "Caption",
};

const brandRoleByTokenRole: Partial<
  Record<TypographyTokenRole, BrandFontRole>
> = {
  heading: "heading",
  subheading: "subheading",
  body: "body",
  caption: "caption",
};

export function createProfessionalTypographySystemCenter(
  input: ProfessionalTypographySystemInput,
): ProfessionalTypographySystemCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const typeScale = createTypeScale(input.brandFonts);
  const fontPairings = createFontPairings(typeScale);
  const analyses = input.projects.flatMap((project) =>
    project.document.pages.map((page) =>
      analyzePageTypography({
        project,
        page,
        typeScale,
        brandFonts: input.brandFonts,
      }),
    ),
  );
  const readabilityChecks = analyses.flatMap(
    (analysis) => analysis.readabilityChecks,
  );
  const repairPackets = createRepairPackets({
    generatedAt,
    analyses,
    typeScale,
  });
  const pageReports = createPageReports({
    analyses,
    repairPackets,
  });
  const projectReports = createProjectReports({
    projects: input.projects,
    pageReports,
    repairPackets,
  });
  const status = aggregateStatus([
    typeScale.status,
    ...fontPairings.map((pairing) => pairing.status),
    ...pageReports.map((page) => page.status),
  ]);
  const score = average(
    [typeScaleScore(typeScale), ...pageReports.map((page) => page.score)],
    100,
  );

  return {
    generatedAt,
    status,
    score,
    typeScale,
    fontPairings,
    readabilityChecks,
    repairPackets,
    pageReports,
    projectReports,
    nextActions: createNextActions({
      typeScale,
      projectReports,
      repairPackets,
    }),
    totals: {
      projects: input.projects.length,
      pages: pageReports.length,
      textLayers: analyses.reduce(
        (total, analysis) => total + analysis.textElements.length,
        0,
      ),
      typeScaleTokens: typeScale.tokens.length,
      fontPairings: fontPairings.length,
      readabilityChecks: readabilityChecks.length,
      repairPackets: repairPackets.length,
      blockedPages: pageReports.filter((page) => page.status === "blocked")
        .length,
      reviewPages: pageReports.filter((page) => page.status === "review")
        .length,
    },
  };
}

function createTypeScale(brandFonts: BrandFontSummary[]): TypographyScale {
  const fontsByRole = new Map<BrandFontRole, BrandFontSummary>();

  brandFonts.forEach((font) => {
    if (!fontsByRole.has(font.role)) {
      fontsByRole.set(font.role, font);
    }
  });

  const heading = fontsByRole.get("heading");
  const body = fontsByRole.get("body");
  const caption = fontsByRole.get("caption") ?? body;
  const tokens = tokenRoles.map((role) =>
    createScaleToken({
      role,
      sourceFont: getBrandFontForToken(role, fontsByRole),
      heading,
      body,
      caption,
    }),
  );
  const missingBrandRoles = tokenRoles.filter((role) => {
    const brandRole = brandRoleByTokenRole[role];

    return brandRole ? !fontsByRole.has(brandRole) : !heading;
  });
  const status: ProfessionalTypographyStatus =
    heading && body ? "ready" : brandFonts.length ? "review" : "blocked";

  return {
    id: "professional-type-scale",
    status,
    tokens,
    missingBrandRoles,
    summary:
      status === "ready"
        ? "Heading and body typography roles are ready for reusable scales."
        : "Define at least heading and body brand font roles to lock the scale.",
  };
}

function createScaleToken(input: {
  role: TypographyTokenRole;
  sourceFont: BrandFontSummary | null;
  heading: BrandFontSummary | undefined;
  body: BrandFontSummary | undefined;
  caption: BrandFontSummary | undefined;
}): TypographyScaleToken {
  const derived = deriveTokenFont(input);
  const font = input.sourceFont ?? derived;
  const source = input.sourceFont ? "brand" : "derived";

  return {
    id: `type-scale-${input.role}`,
    role: input.role,
    label: roleLabels[input.role],
    status:
      input.role === "heading" || input.role === "body" ? "ready" : "review",
    source,
    fontFamily: font.fontFamily,
    fontSize: font.fontSize,
    fontWeight: font.fontWeight,
    lineHeight: font.lineHeight,
    letterSpacing: font.letterSpacing,
    detail:
      source === "brand"
        ? `${roleLabels[input.role]} uses the saved ${input.role} brand font.`
        : `${roleLabels[input.role]} is derived from the nearest saved brand role.`,
  };
}

function getBrandFontForToken(
  role: TypographyTokenRole,
  fontsByRole: Map<BrandFontRole, BrandFontSummary>,
) {
  const brandRole = brandRoleByTokenRole[role];

  if (brandRole) return fontsByRole.get(brandRole) ?? null;
  if (role === "display") return null;

  return null;
}

function deriveTokenFont(input: {
  role: TypographyTokenRole;
  heading: BrandFontSummary | undefined;
  body: BrandFontSummary | undefined;
  caption: BrandFontSummary | undefined;
}) {
  const heading = input.heading ?? input.body ?? input.caption;
  const body = input.body ?? input.heading ?? input.caption;
  const base = body ?? heading ?? input.caption;
  const fallback = {
    fontFamily: "Inter",
    fontSize: 18,
    fontWeight: 500,
    lineHeight: 1.3,
    letterSpacing: 0,
  };

  if (input.role === "display") {
    const font = heading ?? base;

    return {
      ...fallback,
      ...font,
      fontSize: Math.round((font?.fontSize ?? 40) * 1.22),
      fontWeight: Math.max(font?.fontWeight ?? 760, 760),
      lineHeight: 1.05,
    };
  }

  if (input.role === "subheading") {
    const font = heading ?? body ?? base;

    return {
      ...fallback,
      ...font,
      fontSize: Math.max(20, Math.round((font?.fontSize ?? 32) * 0.62)),
      fontWeight: Math.max(600, Math.round((font?.fontWeight ?? 700) * 0.86)),
      lineHeight: 1.18,
    };
  }

  if (input.role === "caption") {
    const font = input.caption ?? body ?? base;

    return {
      ...fallback,
      ...font,
      fontSize: Math.max(12, Math.round((font?.fontSize ?? 16) * 0.78)),
      fontWeight: font?.fontWeight ?? 500,
      lineHeight: 1.35,
    };
  }

  return { ...fallback, ...base };
}

function createFontPairings(
  typeScale: TypographyScale,
): TypographyFontPairingGuidance[] {
  const heading = getToken(typeScale, "heading");
  const body = getToken(typeScale, "body");
  const caption = getToken(typeScale, "caption");
  const status = aggregateStatus([heading.status, body.status]);
  const sameFamily = heading.fontFamily === body.fontFamily;

  return [
    {
      id: "primary-brand-font-pairing",
      status,
      headingFontFamily: heading.fontFamily,
      bodyFontFamily: body.fontFamily,
      captionFontFamily: caption.fontFamily,
      headingRole: "heading",
      bodyRole: "body",
      detail: sameFamily
        ? `${heading.fontFamily} carries both heading and body roles with weight contrast.`
        : `${heading.fontFamily} headlines pair with ${body.fontFamily} body copy.`,
      recommendation: sameFamily
        ? "Use weight, size, and line-height contrast to keep the single-family system clear."
        : "Use the heading family for display moments and the body family for readable long-form copy.",
    },
  ];
}

function analyzePageTypography(input: {
  project: ProjectDetail;
  page: DesignPage;
  typeScale: TypographyScale;
  brandFonts: BrandFontSummary[];
}): PageTypographyAnalysis {
  const textElements = input.page.elements.filter(
    (element): element is TextElement => element.type === "text",
  );
  const brandFamilies = new Set(
    input.brandFonts.map((font) => font.fontFamily.toLowerCase()),
  );
  const offBrandTextElements = brandFamilies.size
    ? textElements.filter(
        (element) => !brandFamilies.has(element.fontFamily.toLowerCase()),
      )
    : textElements;
  const readabilityChecks = textElements.map((element) =>
    createReadabilityCheck({
      project: input.project,
      page: input.page,
      element,
    }),
  );

  return {
    project: input.project,
    page: input.page,
    textElements,
    readabilityChecks,
    offBrandTextElements,
  };
}

function createReadabilityCheck(input: {
  project: ProjectDetail;
  page: DesignPage;
  element: TextElement;
}): TypographyReadabilityCheck {
  const contrast = getTextContrastStatus({
    textColor: input.element.color,
    backgroundColor: input.page.background,
    fontSize: input.element.fontSize,
    fontWeight: input.element.fontWeight,
  });
  const lineLength = Math.round(
    input.element.width / Math.max(1, input.element.fontSize * 0.52),
  );
  const base = {
    id: `typography-readability-${input.project.id}-${input.page.id}-${input.element.id}`,
    projectId: input.project.id,
    pageId: input.page.id,
    elementId: input.element.id,
    fontFamily: input.element.fontFamily,
    fontSize: input.element.fontSize,
    fontWeight: input.element.fontWeight,
    lineHeight: input.element.lineHeight,
    contrastRatio: Number(contrast.ratio.toFixed(2)),
  };

  if (!contrast.passesAA) {
    return {
      ...base,
      status: "blocked",
      issue: "contrast",
      detail: `${input.element.id} contrast is ${contrast.formattedRatio}; ${contrast.requiredRatio}:1 is required.`,
      repairAction: `Use ${contrast.suggestedTextColor} or another brand-safe text color with stronger contrast.`,
    };
  }

  if (input.element.fontSize < 12) {
    return {
      ...base,
      status: "review",
      issue: "small-text",
      detail: `${input.element.id} uses ${input.element.fontSize}px text, which is below the readable minimum.`,
      repairAction: "Raise supporting copy to the caption or body token size.",
    };
  }

  if (lineLength > 80) {
    return {
      ...base,
      status: "review",
      issue: "line-length",
      detail: `${input.element.id} is approximately ${lineLength} characters wide per line.`,
      repairAction:
        "Narrow the text frame or split long copy into shorter lines.",
    };
  }

  if (input.element.lineHeight < 1.05 || input.element.lineHeight > 1.8) {
    return {
      ...base,
      status: "review",
      issue: "line-height",
      detail: `${input.element.id} uses ${input.element.lineHeight} line height.`,
      repairAction:
        "Restore the line height from the matching type-scale token.",
    };
  }

  return {
    ...base,
    status: "ready",
    issue: "balanced",
    detail: `${input.element.id} meets the first-pass readability checks.`,
    repairAction: "No readability repair needed.",
  };
}

function createRepairPackets(input: {
  generatedAt: string;
  analyses: PageTypographyAnalysis[];
  typeScale: TypographyScale;
}): TypographyRepairPacket[] {
  return input.analyses
    .map((analysis) =>
      createRepairPacketDraft({
        analysis,
        typeScale: input.typeScale,
      }),
    )
    .filter((packet): packet is RepairPacketDraft => Boolean(packet))
    .map((packet) =>
      attachRepairPacketDownload({
        packet,
        generatedAt: input.generatedAt,
        typeScale: input.typeScale,
      }),
    )
    .sort(compareRepairPackets);
}

function createRepairPacketDraft(input: {
  analysis: PageTypographyAnalysis;
  typeScale: TypographyScale;
}): RepairPacketDraft | null {
  const findings = input.analysis.readabilityChecks.filter(
    (check) => check.status !== "ready",
  );
  const operations = createRepairOperations({
    analysis: input.analysis,
    typeScale: input.typeScale,
    findings,
  });

  if (!operations.length) return null;

  const status = aggregateStatus([
    ...findings.map((finding) => finding.status),
    input.analysis.offBrandTextElements.length ? "review" : "ready",
  ]);

  return {
    id: `typography-repair-${input.analysis.project.id}-${input.analysis.page.id}`,
    projectId: input.analysis.project.id,
    pageId: input.analysis.page.id,
    title: `${input.analysis.page.name} typography repair`,
    status,
    sourceIds: unique([
      ...findings.map((finding) => finding.id),
      ...input.analysis.offBrandTextElements.map((element) => element.id),
    ]),
    operations,
  };
}

function createRepairOperations(input: {
  analysis: PageTypographyAnalysis;
  typeScale: TypographyScale;
  findings: TypographyReadabilityCheck[];
}): TypographyRepairOperation[] {
  const operations: TypographyRepairOperation[] = [];
  const offBrand = input.analysis.offBrandTextElements;

  if (offBrand.length) {
    const bodyToken = getToken(input.typeScale, "body");

    operations.push({
      kind: "apply-brand-type-scale",
      targetElementIds: offBrand.map((element) => element.id),
      description:
        "Map off-brand text layers onto the reusable brand type scale.",
      fontFamily: bodyToken.fontFamily,
      fontSize: bodyToken.fontSize,
      fontWeight: bodyToken.fontWeight,
      lineHeight: bodyToken.lineHeight,
      letterSpacing: bodyToken.letterSpacing,
    });
  }

  const readabilityFindings = input.findings.filter(
    (finding) =>
      finding.issue === "contrast" ||
      finding.issue === "small-text" ||
      finding.issue === "line-length",
  );

  if (readabilityFindings.length) {
    const bodyToken = getToken(input.typeScale, "body");

    operations.push({
      kind: "improve-readability",
      targetElementIds: readabilityFindings.map((finding) => finding.elementId),
      description:
        "Raise small copy, improve contrast, and keep line length within readable bounds.",
      fontSize: bodyToken.fontSize,
      fontWeight: bodyToken.fontWeight,
      lineHeight: bodyToken.lineHeight,
      color: "#111827",
    });
  }

  const lineHeightFindings = input.findings.filter(
    (finding) => finding.issue === "line-height",
  );

  if (lineHeightFindings.length) {
    const bodyToken = getToken(input.typeScale, "body");

    operations.push({
      kind: "adjust-line-height",
      targetElementIds: lineHeightFindings.map((finding) => finding.elementId),
      description: "Restore line-height rhythm from the body type token.",
      lineHeight: bodyToken.lineHeight,
    });
  }

  return operations;
}

function attachRepairPacketDownload(input: {
  packet: RepairPacketDraft;
  generatedAt: string;
  typeScale: TypographyScale;
}): TypographyRepairPacket {
  const fileName = `${input.packet.id}.json`;
  const packetJson = {
    kind: "essence-studio.professional-typography-system",
    generatedAt: input.generatedAt,
    repairPacketId: input.packet.id,
    projectId: input.packet.projectId,
    pageId: input.packet.pageId,
    sourceIds: input.packet.sourceIds,
    operations: input.packet.operations,
    typeScaleTokens: input.typeScale.tokens,
  };
  const json = JSON.stringify(packetJson, null, 2);

  return {
    ...input.packet,
    fileName,
    json,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(json)}`,
  };
}

function createPageReports(input: {
  analyses: PageTypographyAnalysis[];
  repairPackets: TypographyRepairPacket[];
}): TypographyPageReport[] {
  return input.analyses
    .map((analysis) => {
      const checks = analysis.readabilityChecks;
      const packets = input.repairPackets.filter(
        (packet) => packet.pageId === analysis.page.id,
      );
      const status = aggregateStatus([
        ...checks.map((check) => check.status),
        ...packets.map((packet) => packet.status),
      ]);
      const score = scoreTypography({
        status,
        findings: checks,
        offBrandCount: analysis.offBrandTextElements.length,
      });

      return {
        id: `typography-page-${analysis.project.id}-${analysis.page.id}`,
        projectId: analysis.project.id,
        projectName: analysis.project.name,
        pageId: analysis.page.id,
        pageName: analysis.page.name,
        status,
        score,
        textLayerCount: analysis.textElements.length,
        readabilityCheckIds: checks.map((check) => check.id),
        repairPacketIds: packets.map((packet) => packet.id),
        nextAction:
          status === "ready"
            ? `${analysis.page.name}: typography is ready.`
            : `Apply ${packets.length} typography repair packet${packets.length === 1 ? "" : "s"} for ${analysis.page.name}.`,
      };
    })
    .sort(comparePageReports);
}

function createProjectReports(input: {
  projects: ProjectDetail[];
  pageReports: TypographyPageReport[];
  repairPackets: TypographyRepairPacket[];
}): TypographyProjectReport[] {
  return input.projects
    .map((project) => {
      const pages = input.pageReports.filter(
        (page) => page.projectId === project.id,
      );
      const packets = input.repairPackets.filter(
        (packet) => packet.projectId === project.id,
      );
      const status = aggregateStatus(pages.map((page) => page.status));
      const score = average(
        pages.map((page) => page.score),
        100,
      );

      return {
        id: `typography-project-${project.id}`,
        projectId: project.id,
        projectName: project.name,
        status,
        score,
        pageCount: pages.length,
        textLayerCount: pages.reduce(
          (total, page) => total + page.textLayerCount,
          0,
        ),
        repairPacketIds: packets.map((packet) => packet.id),
        nextAction:
          status === "ready"
            ? `${project.name}: typography system is ready.`
            : `Apply ${packets.length} brand-safe typography repair packet${packets.length === 1 ? "" : "s"} for ${project.name}.`,
      };
    })
    .sort(compareProjectReports);
}

function scoreTypography(input: {
  status: ProfessionalTypographyStatus;
  findings: TypographyReadabilityCheck[];
  offBrandCount: number;
}) {
  const blocked = input.findings.filter(
    (finding) => finding.status === "blocked",
  ).length;
  const review = input.findings.filter(
    (finding) => finding.status === "review",
  ).length;
  const base = input.status === "ready" ? 96 : 92;

  return Math.max(
    0,
    Math.min(100, base - blocked * 25 - review * 9 - input.offBrandCount * 5),
  );
}

function typeScaleScore(typeScale: TypographyScale) {
  if (typeScale.status === "blocked") return 40;
  if (typeScale.status === "review") return 72;

  return Math.max(84, 100 - typeScale.missingBrandRoles.length * 4);
}

function createNextActions(input: {
  typeScale: TypographyScale;
  projectReports: TypographyProjectReport[];
  repairPackets: TypographyRepairPacket[];
}) {
  const actions: string[] = [];

  if (input.typeScale.status !== "ready") {
    actions.push(
      "Save heading and body brand fonts before locking typography.",
    );
  }

  const blocked = input.projectReports.filter(
    (project) => project.status === "blocked",
  );
  const review = input.projectReports.filter(
    (project) => project.status === "review",
  );

  if (blocked.length) {
    actions.push(
      `Apply typography repair packets for ${blocked.length} blocked project${blocked.length === 1 ? "" : "s"}.`,
    );
  }

  if (!blocked.length && review.length) {
    actions.push(
      `Review typography guidance for ${review.length} project${review.length === 1 ? "" : "s"}.`,
    );
  }

  if (input.repairPackets.length) {
    actions.push(
      `Download ${input.repairPackets.length} brand-safe text repair packet${input.repairPackets.length === 1 ? "" : "s"} for handoff.`,
    );
  }

  if (!actions.length) {
    actions.push("Typography system is ready across current project pages.");
  }

  return actions;
}

function getToken(typeScale: TypographyScale, role: TypographyTokenRole) {
  return (
    typeScale.tokens.find((token) => token.role === role) ?? typeScale.tokens[0]
  );
}

function aggregateStatus(
  statuses: ProfessionalTypographyStatus[],
): ProfessionalTypographyStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function compareRepairPackets(
  left: TypographyRepairPacket,
  right: TypographyRepairPacket,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.title.localeCompare(right.title)
  );
}

function comparePageReports(
  left: TypographyPageReport,
  right: TypographyPageReport,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName) ||
    left.pageName.localeCompare(right.pageName)
  );
}

function compareProjectReports(
  left: TypographyProjectReport,
  right: TypographyProjectReport,
) {
  return (
    statusWeight(right.status) - statusWeight(left.status) ||
    left.score - right.score ||
    left.projectName.localeCompare(right.projectName)
  );
}

function statusWeight(status: ProfessionalTypographyStatus) {
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

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}
