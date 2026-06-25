import type { RuntimeDeployVerificationHistory } from "@/features/projects/runtime-deploy-verification-history";
import type { RuntimeQaPacket } from "@/features/projects/runtime-qa-packet";

export type RuntimeEvidenceDashboardDownloadFormat = "csv" | "json" | "markdown";
export type RuntimeEvidenceDashboardDownloadId =
  | "deploy-history-csv"
  | "deploy-history-json"
  | "runtime-qa-csv"
  | "runtime-qa-json"
  | "runtime-qa-markdown";

export interface RuntimeEvidenceDashboardDownload {
  description: string;
  download: string;
  format: RuntimeEvidenceDashboardDownloadFormat;
  hash: string;
  href: string;
  id: RuntimeEvidenceDashboardDownloadId;
  label: string;
}

export interface CreateRuntimeEvidenceDashboardDownloadsInput {
  deployHistory?: RuntimeDeployVerificationHistory | null;
  runtimeQaPacket: RuntimeQaPacket;
}

export function createRuntimeEvidenceDashboardDownloads(input: CreateRuntimeEvidenceDashboardDownloadsInput): RuntimeEvidenceDashboardDownload[] {
  const packetHash = input.runtimeQaPacket.summary.packetHash;
  const downloads: RuntimeEvidenceDashboardDownload[] = [
    {
      description: "Reviewer-readable runtime QA packet.",
      download: input.runtimeQaPacket.markdownFileName,
      format: "markdown",
      hash: packetHash,
      href: input.runtimeQaPacket.markdownDataUri,
      id: "runtime-qa-markdown",
      label: "QA packet",
    },
    {
      description: "Runtime QA packet section scores.",
      download: input.runtimeQaPacket.csvFileName,
      format: "csv",
      hash: packetHash,
      href: input.runtimeQaPacket.csvDataUri,
      id: "runtime-qa-csv",
      label: "QA CSV",
    },
    {
      description: "Full runtime QA packet payload.",
      download: input.runtimeQaPacket.jsonFileName,
      format: "json",
      hash: packetHash,
      href: input.runtimeQaPacket.jsonDataUri,
      id: "runtime-qa-json",
      label: "QA JSON",
    },
  ];

  if (input.deployHistory) {
    const historyHash = input.deployHistory.summary.historyHash;

    downloads.push(
      {
        description: "Production deploy verification history rows.",
        download: input.deployHistory.csvFileName,
        format: "csv",
        hash: historyHash,
        href: input.deployHistory.csvDataUri,
        id: "deploy-history-csv",
        label: "Deploy CSV",
      },
      {
        description: "Full production deploy verification history.",
        download: input.deployHistory.jsonFileName,
        format: "json",
        hash: historyHash,
        href: input.deployHistory.jsonDataUri,
        id: "deploy-history-json",
        label: "Deploy JSON",
      },
    );
  }

  return downloads;
}
