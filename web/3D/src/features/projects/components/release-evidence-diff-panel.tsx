"use client";

import { useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { ArrowRight, Diff, Download, FileJson2, ShieldAlert, TrendingDown, TrendingUp, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  createReleaseEvidenceDiffBaseline,
  createReleaseEvidenceDiffBaselineBody,
  createReleaseEvidenceDiffBaselineFileName,
  createReleaseEvidenceDiffReport,
  parseReleaseEvidenceDiffBaseline,
  type ReleaseEvidenceDiffCurrentState,
  type ReleaseEvidenceDiffReport,
  type ReleaseEvidenceDiffRow,
  type ReleaseEvidenceDiffRowStatus,
  type ReleaseEvidenceDiffSeverity,
  type ReleaseEvidenceDiffSourceKind,
} from "@/features/projects/release-evidence-diff";

function statusVariant(status: ReleaseEvidenceDiffRowStatus | ReleaseEvidenceDiffReport["summary"]["status"]) {
  if (status === "regressed") {
    return "destructive" as const;
  }

  if (status === "improved") {
    return "outline" as const;
  }

  return status === "clean" || status === "unchanged" ? "outline" : "secondary";
}

function severityVariant(severity: ReleaseEvidenceDiffSeverity) {
  if (severity === "critical") {
    return "destructive" as const;
  }

  return severity === "warning" ? "secondary" : "outline";
}

function sourceLabel(sourceKind: ReleaseEvidenceDiffSourceKind) {
  switch (sourceKind) {
    case "current-launch-state":
      return "Saved launch baseline";
    case "offline-desktop-handoff-kit":
      return "Offline desktop handoff kit";
    case "release-evidence-bundle":
      return "Release evidence bundle";
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatValue(value: number | null) {
  return value === null ? "Missing" : String(value);
}

function formatDelta(value: number | null) {
  if (value === null || value === 0) {
    return "0";
  }

  return value > 0 ? `+${value}` : String(value);
}

function downloadTextFile(fileName: string, body: string, mimeType: string) {
  const blob = new Blob([body], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function SummaryTile({ detail, icon, label, value }: { detail: string; icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-xl font-semibold">{value}</p>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">{icon}</span>
      </div>
      <p className="mt-2 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function DiffRow({ row }: { row: ReleaseEvidenceDiffRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[360px] whitespace-normal">
        <p className="font-medium">{row.label}</p>
        <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {row.source === "desktop-handoff" ? "Desktop" : "Release"}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={statusVariant(row.status)}>
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{formatValue(row.previousValue)}</TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{formatValue(row.currentValue)}</TableCell>
      <TableCell>
        <Badge className="rounded-md" variant={severityVariant(row.severity)}>
          {row.severity}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

export function ReleaseEvidenceDiffPanel({ current }: { current: ReleaseEvidenceDiffCurrentState }) {
  const currentBaseline = useMemo(() => createReleaseEvidenceDiffBaseline(current), [current]);
  const [baseline, setBaseline] = useState(currentBaseline);
  const [parseError, setParseError] = useState<string | null>(null);
  const report = useMemo(() => createReleaseEvidenceDiffReport({ baseline, current: currentBaseline }), [baseline, currentBaseline]);
  const visibleRows = report.rows.filter((row) => row.status !== "unchanged").slice(0, 12);
  const rowCountLabel = visibleRows.length > 0 ? `${visibleRows.length} changed metric${visibleRows.length === 1 ? "" : "s"}` : "No metric drift";

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text()) as unknown;
      const nextBaseline = parseReleaseEvidenceDiffBaseline(payload, file.name);

      setBaseline(nextBaseline);
      setParseError(null);
      toast.success("Saved evidence baseline loaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Saved evidence baseline could not be loaded.";

      setParseError(message);
      toast.error(message);
    }
  }

  function downloadCurrentBaseline() {
    downloadTextFile(
      createReleaseEvidenceDiffBaselineFileName(currentBaseline),
      createReleaseEvidenceDiffBaselineBody(currentBaseline),
      "application/json;charset=utf-8",
    );
  }

  function resetBaseline() {
    setBaseline(currentBaseline);
    setParseError(null);
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Diff className="size-4" />
              Release evidence diff
            </CardTitle>
            <CardDescription>Compare a saved release evidence or desktop handoff JSON against the current launch state.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={statusVariant(report.summary.status)}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.netBlockerDelta > 0 ? "destructive" : report.summary.netBlockerDelta < 0 ? "outline" : "secondary"}>
              {formatDelta(report.summary.netBlockerDelta)} blockers
            </Badge>
            <Input id="release-evidence-diff-upload" accept="application/json,.json" className="sr-only" onChange={handleUpload} type="file" />
            <Label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium shadow-xs transition-[color,box-shadow] hover:bg-accent hover:text-accent-foreground" htmlFor="release-evidence-diff-upload">
              <Upload className="size-4" />
              Load JSON
            </Label>
            <Button className="h-8 gap-2" onClick={downloadCurrentBaseline} size="sm" type="button" variant="secondary">
              <Download className="size-4" />
              Save baseline
            </Button>
            {baseline.generatedAt !== currentBaseline.generatedAt || baseline.sourceFileName ? (
              <Button className="h-8" onClick={resetBaseline} size="sm" type="button" variant="ghost">
                Reset
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        {parseError ? <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{parseError}</div> : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            detail={`${sourceLabel(report.baseline.sourceKind)} from ${formatDateTime(report.baseline.generatedAt)}`}
            icon={<FileJson2 className="size-4" />}
            label="Baseline"
            value={report.baseline.sourceFileName ?? "Current snapshot"}
          />
          <SummaryTile
            detail={`${report.summary.regressedCount} regressed, ${report.summary.improvedCount} improved`}
            icon={<ShieldAlert className="size-4" />}
            label="Evidence drift"
            value={rowCountLabel}
          />
          <SummaryTile
            detail={`${report.summary.previousBlockerCount} before, ${report.summary.currentBlockerCount} now`}
            icon={report.summary.netBlockerDelta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
            label="Blockers"
            value={formatDelta(report.summary.netBlockerDelta)}
          />
          <SummaryTile
            detail={`${report.summary.previousReadinessScore ?? "n/a"} before, ${report.summary.currentReadinessScore ?? "n/a"} now`}
            icon={<ArrowRight className="size-4" />}
            label="Readiness score"
            value={formatDelta(report.summary.netReadinessDelta)}
          />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Saved</TableHead>
              <TableHead>Current</TableHead>
              <TableHead>Severity</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => <DiffRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={6}>
                  The loaded baseline matches the current launch-state metrics.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
