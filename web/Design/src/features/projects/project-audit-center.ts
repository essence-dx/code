import { createEmailModelFromProject } from "@/features/email/email-model";
import { createEmailQaReport } from "@/features/email/email-qa";
import { createBrandGuardrailReport } from "@/features/editor/brand-guardrails";
import { createPrintPreflightReport } from "@/features/editor/print-preflight";
import type {
  BrandColorSummary,
  BrandFontSummary,
  BrandLogoSummary,
  DesignElement,
  DesignPage,
  ImageElement,
  ProjectDetail,
} from "@/features/editor/types";
import { createWebsiteSeoAudit } from "@/features/website/website-seo-audit";

export type ProjectAuditStatus = "ready" | "review" | "fix";

export type ProjectAuditDimensionId =
  | "accessibility"
  | "seo"
  | "brand"
  | "print"
  | "email"
  | "website";

export type ProjectAuditDimension = {
  id: ProjectAuditDimensionId;
  label: string;
  status: ProjectAuditStatus;
  score: number;
  detail: string;
};

export type ProjectAuditSummary = {
  projectId: string;
  projectName: string;
  updatedAt: string;
  overallScore: number;
  status: ProjectAuditStatus;
  dimensions: ProjectAuditDimension[];
};

export function createProjectAuditSummary(input: {
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
}): ProjectAuditSummary {
  const dimensions = [
    createAccessibilityDimension(input.project),
    createSeoDimension(input.project),
    createBrandDimension(input),
    createPrintDimension(input.project),
    createEmailDimension(input.project),
    createWebsiteDimension(input.project),
  ] satisfies ProjectAuditDimension[];
  const overallScore = Math.round(
    dimensions.reduce((total, dimension) => total + dimension.score, 0) /
      dimensions.length,
  );

  return {
    projectId: input.project.id,
    projectName: input.project.name,
    updatedAt: input.project.updatedAt,
    overallScore,
    status: scoreToStatus(overallScore),
    dimensions,
  };
}

function createAccessibilityDimension(project: ProjectDetail) {
  const images = getVisibleElements(project.document.pages).filter(
    (element): element is ImageElement => element.type === "image",
  );
  const missingAltCount = images.filter((image) => !image.alt.trim()).length;
  const score = images.length
    ? Math.round(((images.length - missingAltCount) / images.length) * 100)
    : 100;

  return createDimension({
    id: "accessibility",
    label: "Accessibility",
    score,
    detail: images.length
      ? `${images.length - missingAltCount}/${images.length} images include alt text.`
      : "No image layers need alt text yet.",
  });
}

function createSeoDimension(project: ProjectDetail) {
  const audits = project.document.pages.map((page) =>
    createWebsiteSeoAudit({
      projectName: project.name,
      title: page.name,
      seoTitle: page.websiteSeoTitle ?? "",
      seoDescription: page.websiteSeoDescription ?? "",
      slug: createSlug(page.websiteNavLabel || page.name),
    }),
  );
  const passed = audits.reduce((total, audit) => total + audit.score, 0);
  const total = audits.reduce((sum, audit) => sum + audit.total, 0) || 1;
  const score = Math.round((passed / total) * 100);

  return createDimension({
    id: "seo",
    label: "SEO",
    score,
    detail: `${passed}/${total} page metadata checks pass.`,
  });
}

function createBrandDimension(input: {
  project: ProjectDetail;
  brandColors: BrandColorSummary[];
  brandFonts: BrandFontSummary[];
  brandLogos: BrandLogoSummary[];
}) {
  const report = createBrandGuardrailReport({
    document: input.project.document,
    brandColors: input.brandColors,
    brandFonts: input.brandFonts,
    brandLogos: input.brandLogos,
  });

  return createDimension({
    id: "brand",
    label: "Brand",
    score: report.score,
    detail: report.issues.length
      ? `${report.issues.length} brand issue${report.issues.length === 1 ? "" : "s"} found.`
      : "Brand colors, fonts, and logo usage look ready.",
  });
}

function createPrintDimension(project: ProjectDetail) {
  const page = getActivePage(project);
  const report = createPrintPreflightReport({
    document: project.document,
    page,
  });

  return createDimension({
    id: "print",
    label: "Print",
    score: report.score,
    detail: `${report.checks.filter((check) => check.status === "pass").length}/${report.checks.length} print checks pass on the active page.`,
  });
}

function createEmailDimension(project: ProjectDetail) {
  const model = createEmailModelFromProject({
    project,
    subject: project.name,
    previewText: getActivePage(project).notes ?? "",
  });
  const report = createEmailQaReport(model);

  return createDimension({
    id: "email",
    label: "Email QA",
    score: report.score,
    detail: report.issues.length
      ? `${report.issues.length} email issue${report.issues.length === 1 ? "" : "s"} found.`
      : "Email export checks look ready.",
  });
}

function createWebsiteDimension(project: ProjectDetail) {
  const pages = project.document.pages;
  const pagesWithSeo = pages.filter(
    (page) => page.websiteSeoTitle?.trim() && page.websiteSeoDescription?.trim(),
  ).length;
  const pagesWithNavigation = pages.filter(
    (page) => page.websiteHideFromNavigation || page.websiteNavLabel?.trim(),
  ).length;
  const score = Math.min(
    100,
    (project.publicShareId ? 25 : 0) +
      (pages.length ? 20 : 0) +
      Math.round((pagesWithSeo / Math.max(1, pages.length)) * 30) +
      Math.round((pagesWithNavigation / Math.max(1, pages.length)) * 25),
  );

  return createDimension({
    id: "website",
    label: "Website",
    score,
    detail: project.publicShareId
      ? `${pagesWithSeo}/${pages.length} pages have SEO metadata and the public link is enabled.`
      : `${pagesWithSeo}/${pages.length} pages have SEO metadata; public link is not enabled.`,
  });
}

function createDimension(input: {
  id: ProjectAuditDimensionId;
  label: string;
  score: number;
  detail: string;
}): ProjectAuditDimension {
  const score = Math.max(0, Math.min(100, Math.round(input.score)));

  return {
    ...input,
    score,
    status: scoreToStatus(score),
  };
}

function scoreToStatus(score: number): ProjectAuditStatus {
  if (score >= 85) return "ready";
  if (score >= 70) return "review";

  return "fix";
}

function getActivePage(project: ProjectDetail): DesignPage {
  return (
    project.document.pages.find(
      (page) => page.id === project.document.activePageId,
    ) ??
    project.document.pages[0] ?? {
      id: "empty",
      name: "Empty page",
      background: "#ffffff",
      elements: [],
    }
  );
}

function getVisibleElements(pages: DesignPage[]): DesignElement[] {
  return pages.flatMap((page) =>
    page.elements.filter((element) => !element.hidden),
  );
}

function createSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
