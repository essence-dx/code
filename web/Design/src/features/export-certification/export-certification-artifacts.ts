import type {
  ExportCertificationArtifact,
  ExportCertificationArtifactDefinition,
} from "@/features/export-certification/export-certification-types";

export const exportCertificationArtifacts: ExportCertificationArtifact[] = [
  "pdf",
  "video",
  "email",
  "website",
  "print",
];

export const exportCertificationDefinitions: Record<
  ExportCertificationArtifact,
  ExportCertificationArtifactDefinition
> = {
  pdf: {
    artifact: "pdf",
    label: "PDF certification",
    description:
      "Portable document delivery with stored PDF artifacts, accessibility review, and stakeholder signoff.",
    requiredExportFormats: ["pdf", "multipage-pdf"],
    relatedAuditDimensions: ["accessibility", "brand"],
    projectNameHints: [/pdf/i, /brochure/i, /document/i, /deck/i, /report/i],
    emptyAction: "Create a completed PDF export with stored artifact evidence.",
  },
  video: {
    artifact: "video",
    label: "Video certification",
    description:
      "Motion export delivery with completed video artifacts, timeline evidence, and review closure.",
    requiredExportFormats: ["mp4", "gif", "media-sequence"],
    relatedAuditDimensions: ["accessibility", "brand"],
    projectNameHints: [/video/i, /motion/i, /reel/i, /film/i],
    emptyAction: "Create a completed video export before certification.",
  },
  email: {
    artifact: "email",
    label: "Email certification",
    description:
      "Email artifact delivery with HTML export evidence, email QA, and approval history.",
    requiredExportFormats: ["html"],
    relatedAuditDimensions: ["email", "accessibility", "brand"],
    projectNameHints: [/email/i, /newsletter/i, /drop/i],
    emptyAction: "Create a completed email HTML export and run email QA.",
  },
  website: {
    artifact: "website",
    label: "Website certification",
    description:
      "Published website delivery with SEO, domain, analytics, and approval evidence.",
    requiredExportFormats: ["html"],
    relatedAuditDimensions: ["website", "seo", "accessibility", "brand"],
    projectNameHints: [/website/i, /site/i, /landing/i, /page/i],
    emptyAction: "Publish a website surface before certification.",
  },
  print: {
    artifact: "print",
    label: "Print certification",
    description:
      "Print-ready delivery with print PDF artifacts, preflight evidence, and stakeholder approval.",
    requiredExportFormats: ["print-pdf"],
    relatedAuditDimensions: ["print", "accessibility", "brand"],
    projectNameHints: [/print/i, /card/i, /poster/i, /flyer/i, /invite/i],
    emptyAction: "Create a completed print PDF export with preflight evidence.",
  },
};
