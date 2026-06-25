import type {
  ExportCertificationCheck,
  ExportCertificationQaMatrix,
  ExportCertificationStatus,
} from "@/features/export-certification/export-certification-types";

export function createCertificationCheck(
  input: ExportCertificationCheck,
): ExportCertificationCheck {
  return {
    ...input,
    score: clampCertificationScore(input.score),
  };
}

export function createQaMatrix(
  checks: ExportCertificationCheck[],
): ExportCertificationQaMatrix {
  const score = averageCertificationScore(checks.map((check) => check.score));
  const status = scoreToCertificationStatus(
    score,
    checks.some((check) => check.status === "blocked"),
  );

  return {
    status,
    score,
    checks,
    passedChecks: checks.filter((check) => check.status === "ready").length,
    blockedChecks: checks.filter((check) => check.status === "blocked").length,
  };
}

export function averageCertificationScore(values: number[]) {
  if (!values.length) return 0;

  return clampCertificationScore(
    Math.round(
      values.reduce((total, value) => total + value, 0) / values.length,
    ),
  );
}

export function clampCertificationScore(score: number) {
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function scoreToCertificationStatus(
  score: number,
  hasBlocked: boolean,
): ExportCertificationStatus {
  if (hasBlocked || score < 50) return "blocked";
  if (score < 86) return "review";

  return "ready";
}

export function statusScore(status: ExportCertificationStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 72;

  return 28;
}

export function formatCertificationDate(value: string | null) {
  if (!value) return "No date";

  return new Date(value).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

export function latestTimestamp(values: Array<string | null | undefined>) {
  return (
    values
      .filter((value): value is string => Boolean(value))
      .sort((left, right) => Date.parse(right) - Date.parse(left))[0] ?? null
  );
}
