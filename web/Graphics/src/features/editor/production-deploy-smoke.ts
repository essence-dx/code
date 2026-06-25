import {
  getPrototypeFlowDiagnostics,
  type PrototypeFlowDiagnostics,
} from "@/features/editor/prototype-flow-diagnostics";
import type { DesignDocument, DesignPage } from "@/features/editor/types";

export type ProductionDeploySmokeStatus = "ready" | "review" | "blocked";

export type ProductionDeploySmokeKind =
  | "admin"
  | "auth"
  | "embed"
  | "editor"
  | "prototype"
  | "release-handoff"
  | "share";

export type ProductionDeploySmokeRow = {
  id: string;
  status: ProductionDeploySmokeStatus;
  kind: ProductionDeploySmokeKind;
  label: string;
  route: string;
  method: "GET" | "POST" | "UI";
  required: boolean;
  waitFor: string;
  evidence: string;
  detail: string;
  command: string;
  recommendation: string;
};

export type ProductionDeploySmokeReport = {
  generatedAt: string;
  baseUrl: string;
  shareToken: string;
  status: ProductionDeploySmokeStatus;
  score: number;
  routeCount: number;
  requiredRouteCount: number;
  readyCount: number;
  reviewCount: number;
  blockedCount: number;
  prototypeStartPageCount: number;
  prototypeHotspotCount: number;
  commands: string[];
  rows: ProductionDeploySmokeRow[];
};

export const defaultProductionDeploySmokeShareToken = "visual-fixture";

export function getProductionDeploySmokeReport({
  document,
  activePage,
  baseUrl = "https://<deployment-url>",
  generatedAt = new Date().toISOString(),
  shareToken = defaultProductionDeploySmokeShareToken,
}: {
  document: DesignDocument;
  activePage: DesignPage;
  baseUrl?: string;
  generatedAt?: string;
  shareToken?: string;
}): ProductionDeploySmokeReport {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  const normalizedShareToken =
    shareToken.trim() || defaultProductionDeploySmokeShareToken;
  const prototype = getPrototypeFlowDiagnostics(document);
  const rows = getDeploySmokeRows({
    activePage,
    baseUrl: normalizedBaseUrl,
    document,
    prototype,
    shareToken: normalizedShareToken,
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const reviewCount = rows.filter((row) => row.status === "review").length;
  const readyCount = rows.filter((row) => row.status === "ready").length;

  return {
    generatedAt,
    baseUrl: normalizedBaseUrl,
    shareToken: normalizedShareToken,
    status:
      blockedCount > 0 ? "blocked" : reviewCount > 0 ? "review" : "ready",
    score: Math.max(0, 100 - blockedCount * 24 - reviewCount * 8),
    routeCount: rows.length,
    requiredRouteCount: rows.filter((row) => row.required).length,
    readyCount,
    reviewCount,
    blockedCount,
    prototypeStartPageCount: prototype.startPageCount,
    prototypeHotspotCount: prototype.hotspotCount,
    commands: getSmokeCommands(normalizedBaseUrl, normalizedShareToken),
    rows,
  };
}

export function getProductionDeploySmokeJson(
  report: ProductionDeploySmokeReport,
) {
  return JSON.stringify(report, null, 2);
}

export function getProductionDeploySmokeCsv(
  report: ProductionDeploySmokeReport,
) {
  return [
    [
      "id",
      "status",
      "kind",
      "method",
      "route",
      "required",
      "wait_for",
      "evidence",
      "detail",
      "command",
      "recommendation",
    ].join(","),
    ...report.rows.map((row) =>
      [
        row.id,
        row.status,
        row.kind,
        row.method,
        row.route,
        row.required,
        row.waitFor,
        row.evidence,
        row.detail,
        row.command,
        row.recommendation,
      ]
        .map(escapeCsvCell)
        .join(","),
    ),
  ].join("\n");
}

export function getProductionDeploySmokeMarkdown(
  report: ProductionDeploySmokeReport,
) {
  return [
    "# Production Deploy Smoke Checklist",
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Score: ${report.score}`,
    `Base URL: ${report.baseUrl}`,
    `Share token: ${report.shareToken}`,
    `Routes: ${report.readyCount} ready, ${report.reviewCount} review, ${report.blockedCount} blocked`,
    "",
    "Run this handoff against an already deployed Vercel URL. It does not require a local production build.",
    "",
    "## Commands",
    "",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Routes",
    "",
    ...report.rows.map(
      (row) =>
        `- [${row.status}] ${row.label} (${row.method} ${row.route}) - wait for "${row.waitFor}". Evidence: ${row.evidence}. ${row.detail} Recommendation: ${row.recommendation}`,
    ),
  ].join("\n");
}

function getDeploySmokeRows({
  activePage,
  baseUrl,
  document,
  prototype,
  shareToken,
}: {
  activePage: DesignPage;
  baseUrl: string;
  document: DesignDocument;
  prototype: PrototypeFlowDiagnostics;
  shareToken: string;
}) {
  const hasActivePage = document.pages.some((page) => page.id === activePage.id);
  const hasPrototypeStart = prototype.startPageCount > 0;
  const hasPrototypeBlockers = prototype.issues.some(
    (issue) => issue.severity === "high",
  );
  const activityCount = document.activityEvents?.length ?? 0;

  return [
    {
      id: "auth-email-password-otp",
      status: "ready",
      kind: "auth",
      label: "Email/password and OTP auth",
      route: "/api/auth/[...all]",
      method: "POST",
      required: true,
      waitFor: "session cookie after OTP verification",
      evidence: "Sign in with seeded admin and confirm the editor unlocks.",
      detail:
        "Better Auth handles email/password and OTP verification through the Next.js auth route.",
      command:
        "Run an interactive sign-in smoke with admin@mail.com after deployment.",
      recommendation:
        "Confirm BETTER_AUTH_URL, NEXT_PUBLIC_APP_URL, BREVO_API_KEY, and Turso envs are set on Vercel before the smoke.",
    },
    {
      id: "editor-home",
      status: hasActivePage ? "ready" : "blocked",
      kind: "editor",
      label: "Authenticated editor",
      route: "/",
      method: "GET",
      required: true,
      waitFor: "Files",
      evidence: "Route probe should find the file browser and editor shell.",
      detail: hasActivePage
        ? `Active page ${activePage.name} is present for editor smoke coverage.`
        : "The document active page is missing from the page list.",
      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} bun run visual:routes`,
      recommendation:
        "Use the seeded visual fixture so the editor route has stable layers, comments, and prototype data.",
    },
    {
      id: "admin-dashboard",
      status: "ready",
      kind: "admin",
      label: "Admin dashboard",
      route: "/dashboard",
      method: "GET",
      required: true,
      waitFor: "Admin",
      evidence:
        "Route probe should render admin workspace health, users, shares, and audit panels.",
      detail: "The admin route is part of the authenticated production smoke set.",
      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} bun run visual:routes`,
      recommendation:
        "Seed admin@mail.com and verify the account has administrator access before probing Vercel.",
    },
    {
      id: "public-share-handoff",
      status: shareToken ? "ready" : "review",
      kind: "share",
      label: "Public share handoff",
      route: `/share/${shareToken || "<token>"}`,
      method: "GET",
      required: true,
      waitFor: "shared file",
      evidence:
        "Route probe should load a public handoff without an authenticated session.",
      detail: shareToken
        ? `Using share token ${shareToken} for public handoff coverage.`
        : "No share token is configured for public handoff smoke coverage.",
      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || "<token>"} bun run visual:routes`,
      recommendation:
        "Use the seeded visual fixture token or create a fresh handoff link before production approval.",
    },
    {
      id: "public-prototype",
      status: hasPrototypeBlockers || !hasPrototypeStart ? "review" : "ready",
      kind: "prototype",
      label: "Public prototype preview",
      route: `/share/${shareToken || "<token>"}/prototype`,
      method: "GET",
      required: true,
      waitFor: "Prototype",
      evidence:
        "Route probe should load the share prototype view and find prototype UI text.",
      detail: hasPrototypeStart
        ? `${prototype.startPageCount} start page and ${prototype.hotspotCount} hotspot${prototype.hotspotCount === 1 ? "" : "s"} are available.`
        : "No prototype start page is marked for this document.",
      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || "<token>"} bun run visual:routes`,
      recommendation:
        "Mark one prototype start page and clear broken hotspot targets before calling the prototype route fully ready.",
    },
    {
      id: "public-embed",
      status: shareToken ? "ready" : "review",
      kind: "embed",
      label: "Public embed preview",
      route: `/embed/${shareToken || "<token>"}`,
      method: "GET",
      required: true,
      waitFor: "Prototype",
      evidence:
        "Route probe should load an iframe-friendly public embed surface without an authenticated session.",
      detail: shareToken
        ? `Using share token ${shareToken} for public embed coverage.`
        : "No share token is configured for public embed smoke coverage.",
      command: `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken || "<token>"} bun run visual:routes`,
      recommendation:
        "Use the embed route for controlled external surfaces and keep the source share expiry reviewed.",
    },
    {
      id: "release-handoff-export",
      status: activityCount > 0 ? "ready" : "review",
      kind: "release-handoff",
      label: "Release handoff export",
      route: "Extensions > Performance release export",
      method: "UI",
      required: true,
      waitFor: "JSON and Handoff downloads",
      evidence:
        "Download performance, runtime, baseline, collaboration, and deploy-smoke evidence before release approval.",
      detail: activityCount > 0
        ? `${activityCount} activity event${activityCount === 1 ? "" : "s"} are available for release context.`
        : "No activity events are available to attach to release handoff context.",
      command: "Export JSON and Handoff from the Extensions production panels.",
      recommendation:
        "Attach the JSON and Markdown exports to the release notes for reviewer repeatability.",
    },
  ] satisfies ProductionDeploySmokeRow[];
}

function getSmokeCommands(baseUrl: string, shareToken: string) {
  return [
    "bun run seed:admin",
    "bun run visual:seed-fixture",
    `ESSENCE_VISUAL_BASE_URL=${baseUrl} ESSENCE_VISUAL_SHARE_TOKEN=${shareToken} bun run visual:routes`,
    "bun run visual:summary -- --routes artifacts/visual-regression/<run-id>/route-health.json",
  ];
}

function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "") || "https://<deployment-url>";
}

function escapeCsvCell(value: boolean | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return "";
  }

  const text = String(value);

  if (!/[",\n\r]/.test(text)) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}
