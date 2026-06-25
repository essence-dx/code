import { normalizeCellLinkUrl } from "@/features/workbooks/cell-links";
import { parseCellKey } from "@/features/workbooks/addresses";
import type { CellLink } from "@/features/workbooks/types";

export type ExternalLinkIssue = {
  id: string;
  linkId: string;
  cellKey: string;
  label: string;
  url: string;
  message: string;
  severity: "error" | "warning";
  repairUrl?: string;
  rowIndex: number | null;
  columnIndex: number | null;
};

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function hasEnoughPhoneDigits(value: string) {
  return value.replace(/\D/g, "").length >= 7;
}

function toHttpsUrl(url: URL) {
  const repaired = new URL(url.toString());

  repaired.protocol = "https:";

  return repaired.toString();
}

function createIssue({
  link,
  message,
  severity,
  repairUrl,
}: {
  link: CellLink;
  message: string;
  severity: ExternalLinkIssue["severity"];
  repairUrl?: string;
}): ExternalLinkIssue {
  const position = parseCellKey(link.cellKey);

  return {
    id: `${link.id}:${message}`,
    linkId: link.id,
    cellKey: link.cellKey,
    label: link.label,
    url: link.url,
    message,
    severity,
    repairUrl,
    rowIndex: position?.rowIndex ?? null,
    columnIndex: position?.columnIndex ?? null,
  };
}

export function getExternalLinkIssues(links: CellLink[]) {
  const issues: ExternalLinkIssue[] = [];

  for (const link of links) {
    if (!parseCellKey(link.cellKey)) {
      issues.push(
        createIssue({
          link,
          message: "Link points to an invalid cell address.",
          severity: "error",
        }),
      );
    }

    const normalizedUrl = normalizeCellLinkUrl(link.url);

    if (!normalizedUrl) {
      issues.push(
        createIssue({
          link,
          message: "Link uses an unsupported or broken URL.",
          severity: "error",
        }),
      );
      continue;
    }

    if (normalizedUrl !== link.url) {
      issues.push(
        createIssue({
          link,
          message: "Link can be normalized to a safe URL.",
          severity: "warning",
          repairUrl: normalizedUrl,
        }),
      );
    }

    const url = new URL(normalizedUrl);

    if (url.protocol === "http:") {
      issues.push(
        createIssue({
          link,
          message: "Link uses an unencrypted HTTP address.",
          severity: "warning",
          repairUrl: toHttpsUrl(url),
        }),
      );
    }

    if (url.protocol === "mailto:" && !looksLikeEmail(url.pathname)) {
      issues.push(
        createIssue({
          link,
          message: "Email link is missing a valid address.",
          severity: "error",
        }),
      );
    }

    if (url.protocol === "tel:" && !hasEnoughPhoneDigits(url.pathname)) {
      issues.push(
        createIssue({
          link,
          message: "Phone link is missing a usable number.",
          severity: "error",
        }),
      );
    }
  }

  return issues.sort((left, right) => {
    if (left.rowIndex === null || right.rowIndex === null) {
      return left.cellKey.localeCompare(right.cellKey);
    }

    return (
      left.rowIndex - right.rowIndex ||
      (left.columnIndex ?? 0) - (right.columnIndex ?? 0)
    );
  });
}
