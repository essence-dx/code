export type RenderingQaStatus = "ready" | "review" | "blocked";

export type WebsiteQaViewport = "mobile" | "tablet" | "desktop";

export type EmailQaClient = "Gmail" | "Outlook" | "Apple Mail";

export type WebsiteViewportQaCheck = {
  id: string;
  publishId: string;
  projectId: string;
  title: string;
  viewport: WebsiteQaViewport;
  width: number;
  status: RenderingQaStatus;
  url: string;
  checks: string[];
  warnings: string[];
};

export type EmailClientQaCheck = {
  id: string;
  projectId: string;
  projectName: string;
  client: EmailQaClient;
  status: RenderingQaStatus;
  score: number;
  exportJobId: string | null;
  checks: string[];
  warnings: string[];
};

export type RenderingQaLinkValidation = {
  id: string;
  kind: "website-slug" | "custom-domain" | "email-export";
  label: string;
  url: string;
  status: RenderingQaStatus;
  detail: string;
};

export type RenderingQaFormDiagnostic = {
  id: string;
  publishId: string;
  projectId: string;
  title: string;
  status: RenderingQaStatus;
  submissionCount: number;
  sectionIds: string[];
  detail: string;
};

export type RenderingQaAccessibilityEvidence = {
  id: string;
  projectId: string;
  projectName: string;
  surface: "website" | "email";
  status: RenderingQaStatus;
  score: number;
  detail: string;
};

export type WebsiteEmailRenderingQaCenter = {
  generatedAt: string;
  status: RenderingQaStatus;
  score: number;
  websiteViewportMatrix: WebsiteViewportQaCheck[];
  emailClientMatrix: EmailClientQaCheck[];
  linkValidation: RenderingQaLinkValidation[];
  formRoutingDiagnostics: RenderingQaFormDiagnostic[];
  accessibilityEvidence: RenderingQaAccessibilityEvidence[];
  releaseReport: {
    fileName: string;
    dataUrl: string;
  };
  nextActions: string[];
  totals: {
    websiteViewportChecks: number;
    emailClientChecks: number;
    linkChecks: number;
    formDiagnostics: number;
    accessibilityEvidence: number;
    readyChecks: number;
    reviewChecks: number;
    blockedChecks: number;
  };
};
