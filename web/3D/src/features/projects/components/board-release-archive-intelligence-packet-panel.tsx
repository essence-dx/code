"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Clock3, Download, FileJson2, Hash, Loader2, PackageCheck, Save, ShieldAlert, Sparkles, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveIntelligencePacketRecommendation,
  BoardReleaseArchiveIntelligencePacketReport,
  BoardReleaseArchiveIntelligencePacketSection,
} from "@/features/projects/board-release-archive-intelligence-packet";
import type {
  BoardReleaseArchiveIntelligencePacketHistoryRecord,
  BoardReleaseArchiveIntelligencePacketHistoryReport,
} from "@/features/projects/board-release-archive-intelligence-packet-history";
import type { BoardReleaseCloseoutReadinessGateStatus } from "@/features/projects/board-release-closeout-readiness-gates";

function statusVariant(status: BoardReleaseCloseoutReadinessGateStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutReadinessGateStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function SummaryTile({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function formatDateTime(value: string | null) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Never";
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
}

function HistoryRow({ record, workspaceId }: { record: BoardReleaseArchiveIntelligencePacketHistoryRecord; workspaceId: string }) {
  const apiBase = `/api/workspaces/${encodeURIComponent(workspaceId)}/board-release-archive-intelligence-packets/${encodeURIComponent(record.id)}`;

  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <p className="font-medium">{formatDateTime(record.createdAt)}</p>
        <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{record.packetHash}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(record.status)}>
          <StatusIcon status={record.status} />
          {record.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{record.packetScore}/100 packet</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{record.actor.name ?? "Unknown actor"}</p>
        <p className="mt-1">{record.actor.email ?? "No email snapshot"}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{record.sectionCount} sections</p>
        <p>{record.recommendationCount} recommendations</p>
        <p>{record.blockedSectionCount + record.blockedRecommendationCount} blocked controls</p>
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`${apiBase}?format=json`}>
            <FileJson2 className="size-3.5" />
            JSON {formatByteSize(record.jsonByteSize)}
          </a>
          <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`${apiBase}?format=csv`}>
            <Download className="size-3.5" />
            CSV {formatByteSize(record.csvByteSize)}
          </a>
        </div>
      </TableCell>
    </TableRow>
  );
}

function SectionRow({ section }: { section: BoardReleaseArchiveIntelligencePacketSection }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackageCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{section.title}</p>
            <p className="truncate text-xs text-muted-foreground">{section.sectionKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(section.status)}>
          <StatusIcon status={section.status} />
          {section.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{section.score}/100</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-sm text-muted-foreground">
        <p className="line-clamp-3">{section.summary}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{section.nextAction}</p>
        <p className="mt-1 truncate font-mono">{section.sectionHash}</p>
      </TableCell>
    </TableRow>
  );
}

function RecommendationRow({ recommendation }: { recommendation: BoardReleaseArchiveIntelligencePacketRecommendation }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Sparkles className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{recommendation.title}</p>
            <p className="truncate text-xs text-muted-foreground">{recommendation.recommendationKind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(recommendation.status)}>
          <StatusIcon status={recommendation.status} />
          {recommendation.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{recommendation.priority} priority</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-sm text-muted-foreground">
        <p className="line-clamp-3">{recommendation.action}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{recommendation.evidenceHash}</p>
        <p className="mt-1 truncate font-mono">{recommendation.recommendationHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveIntelligencePacketPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: BoardReleaseArchiveIntelligencePacketHistoryReport | null;
  report: BoardReleaseArchiveIntelligencePacketReport;
  workspaceId?: string;
}) {
  const [packetHistory, setPacketHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);

  async function savePacket() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-release-archive-intelligence-packets`, {
        body: JSON.stringify({ packet: report }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardReleaseArchiveIntelligencePacketHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Archive intelligence packet could not be saved.");
      }

      setPacketHistory(payload.history);
      toast.success("Archive intelligence packet saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Archive intelligence packet could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Board release archive intelligence packet
            </CardTitle>
            <CardDescription>One packet for archive index, anomaly, trend, replay, and governance-update recommendations.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.packetScore < 80 ? "destructive" : "outline"}>
              {report.summary.packetScore}/100
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
            {canPersist ? (
              <Button className="h-8 gap-2" disabled={isSaving} size="sm" type="button" variant="outline" onClick={savePacket}>
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save packet
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="evidence sections" label="Sections" value={`${report.summary.sectionCount}`} />
          <SummaryTile detail="recommendations" label="Actions" value={`${report.summary.recommendationCount}`} />
          <SummaryTile detail="blocked sections" label="Blocked" value={`${report.summary.blockedSectionCount}`} />
          <SummaryTile detail="governance updates" label="Governance" value={`${report.summary.governanceUpdateCount}`} />
          <SummaryTile detail="packet hash" label="Hash" value={report.summary.packetHash.slice(7, 15)} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Executive memo</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.executiveMemo}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Summary</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.sections.map((section) => (
              <SectionRow key={section.sectionId} section={section} />
            ))}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recommendation</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.recommendations.map((recommendation) => (
              <RecommendationRow key={recommendation.recommendationId} recommendation={recommendation} />
            ))}
          </TableBody>
        </Table>

        {packetHistory ? (
          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <Clock3 className="size-4" />
                  Saved archive intelligence packet history
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {packetHistory.summary.totalPacketCount} saved packets from {packetHistory.summary.actorCount} actors, latest saved{" "}
                  {formatDateTime(packetHistory.summary.latestSavedAt)}.
                </p>
              </div>
              {packetHistory.summary.latestPacketHash ? (
                <Badge className="max-w-full gap-1 rounded-md font-mono" variant="outline">
                  <Hash className="size-3.5" />
                  <span className="truncate">{packetHistory.summary.latestPacketHash}</span>
                </Badge>
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Scope</TableHead>
                  <TableHead>Downloads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packetHistory.records.length > 0 ? (
                  packetHistory.records.slice(0, 6).map((record) => <HistoryRow key={record.id} record={record} workspaceId={workspaceId ?? report.workspaceId} />)
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      No archive intelligence packets have been saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
