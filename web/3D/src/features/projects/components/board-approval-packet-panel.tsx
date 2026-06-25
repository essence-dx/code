"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Activity, Ban, Download, FileCheck2, FileJson2, Hash, History, Loader2, Save, ShieldCheck, Signature, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardApprovalPacketCriticalPathRow,
  BoardApprovalPacketReport,
  BoardApprovalPacketSignOffRow,
  BoardApprovalPacketStatus,
} from "@/features/projects/board-approval-packet";
import type { BoardApprovalPacketHistoryRecord, BoardApprovalPacketHistoryReport } from "@/features/projects/board-approval-packet-history";

function statusVariant(status: BoardApprovalPacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardApprovalPacketStatus }) {
  if (status === "ready") {
    return <ShieldCheck className="size-3.5" />;
  }

  return status === "watch" ? <Activity className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "No due date";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatByteSize(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  return `${Math.round(value / 1024)} KB`;
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

function PacketHistoryRow({
  isRevoking,
  onRevoke,
  record,
  workspaceId,
}: {
  isRevoking: boolean;
  onRevoke: (recordId: string) => void;
  record: BoardApprovalPacketHistoryRecord;
  workspaceId: string;
}) {
  const apiBase = `/api/workspaces/${encodeURIComponent(workspaceId)}/board-approval-packets/${encodeURIComponent(record.id)}`;

  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{formatDate(record.createdAt)}</p>
        <p className="mt-1 line-clamp-1 font-mono text-xs text-muted-foreground">{record.contentHash}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={record.status === "revoked" ? "destructive" : statusVariant(record.approvalStatus)}>
          {record.status === "revoked" ? <Ban className="size-3.5" /> : <StatusIcon status={record.approvalStatus} />}
          {record.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{record.approvalScore}/100 approval</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{record.recipientPurpose}</p>
        <p className="mt-1">{record.recipientName ?? "Board reviewer"}</p>
        <p className="mt-1">{record.recipientEmail ?? "No recipient email"}</p>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{record.createdBy.name ?? "Unknown actor"}</p>
        <p className="mt-1">{record.createdBy.email ?? "No email snapshot"}</p>
        {record.revokedAt ? <p className="mt-1">Revoked {formatDate(record.revokedAt)}</p> : null}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-2">
          {record.status === "active" ? (
            <>
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`${apiBase}?format=json`}>
                <FileJson2 className="size-3.5" />
                JSON {formatByteSize(record.jsonByteSize)}
              </a>
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} href={`${apiBase}?format=csv`}>
                <Download className="size-3.5" />
                CSV {formatByteSize(record.csvByteSize)}
              </a>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">Downloads disabled</span>
          )}
          <Button className="h-8 gap-2" disabled={record.status === "revoked" || isRevoking} onClick={() => onRevoke(record.id)} size="sm" type="button" variant="outline">
            {isRevoking ? <Loader2 className="size-3.5 animate-spin" /> : <Ban className="size-3.5" />}
            Revoke
          </Button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{record.downloadCount} audited download{record.downloadCount === 1 ? "" : "s"}</p>
      </TableCell>
    </TableRow>
  );
}

function SignOffRow({ row }: { row: BoardApprovalPacketSignOffRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Signature className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium capitalize">{row.role}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.action}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.required ? "Required" : "Optional"}</p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.ownerName}</p>
        <p className="mt-1">{row.ownerEmail ?? "No email attached"}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
        <p>{formatDate(row.dueAt)}</p>
        <p className="mt-1 break-all font-mono">{row.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

function CriticalPathRow({ row }: { row: BoardApprovalPacketCriticalPathRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <p className="font-medium">{row.label}</p>
        <p className="text-xs text-muted-foreground">{row.source}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
        <p className="font-medium text-foreground">{row.ownerName}</p>
        <p className="mt-1 line-clamp-2">{row.action}</p>
      </TableCell>
      <TableCell className="max-w-[300px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.evidence}</p>
        <p className="mt-1 break-all font-mono">{row.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardApprovalPacketPanel({
  canPersist,
  history,
  report,
  workspaceId,
}: {
  canPersist?: boolean;
  history?: BoardApprovalPacketHistoryReport | null;
  report: BoardApprovalPacketReport;
  workspaceId?: string;
}) {
  const [packetHistory, setPacketHistory] = useState(history ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  async function savePacket() {
    if (!canPersist || !workspaceId || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-approval-packets`, {
        body: JSON.stringify({
          packet: report,
          recipientPurpose: "Board approval review",
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardApprovalPacketHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board approval packet could not be saved.");
      }

      setPacketHistory(payload.history);
      toast.success("Board approval packet saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board approval packet could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function revokePacket(recordId: string) {
    if (!canPersist || !workspaceId || revokingId) {
      return;
    }

    setRevokingId(recordId);

    try {
      const response = await fetch(`/api/workspaces/${encodeURIComponent(workspaceId)}/board-approval-packets/${encodeURIComponent(recordId)}`, {
        body: JSON.stringify({ reason: "Revoked from board operations dashboard" }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      const payload = (await response.json().catch(() => null)) as { error?: string; history?: BoardApprovalPacketHistoryReport } | null;

      if (!response.ok || !payload?.history) {
        throw new Error(payload?.error ?? "Board approval packet could not be revoked.");
      }

      setPacketHistory(payload.history);
      toast.success("Board approval packet revoked");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Board approval packet could not be revoked.");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="size-4" />
              Board approval packet
            </CardTitle>
            <CardDescription>Redacted board summary with critical path, checksum evidence, and release sign-off state.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.approvalScore}/100
            </Badge>
            <Badge className="rounded-md" variant={report.summary.blockedSignOffCount > 0 ? "destructive" : "outline"}>
              {report.summary.blockedSignOffCount} blocked
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <Download className="size-4" />
              JSON
            </a>
            {packetHistory ? (
              <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={packetHistory.csvFileName} href={packetHistory.csvDataUri}>
                <History className="size-4" />
                History CSV
              </a>
            ) : null}
            {canPersist && workspaceId ? (
              <Button className="h-8 gap-2" disabled={isSaving} onClick={savePacket} size="sm" type="button" variant="outline">
                {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save packet
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <SummaryTile detail={report.summary.status} label="Approval score" value={`${report.summary.approvalScore}/100`} />
          <SummaryTile detail="board blockers" label="Blocked" value={`${report.summary.blockedSignOffCount}`} />
          <SummaryTile detail="pending review" label="Watch" value={`${report.summary.watchSignOffCount}`} />
          <SummaryTile detail="signed off" label="Ready" value={`${report.summary.readySignOffCount}`} />
          <SummaryTile detail="packet and source hashes" label="Checksums" value={`${report.summary.checksumCount}`} />
          <SummaryTile detail="sensitive tokens removed" label="Redactions" value={`${report.summary.redactionCount}`} />
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail={formatDate(packetHistory?.summary.latestSavedAt ?? null)} label="Saved packets" value={`${packetHistory?.summary.totalCount ?? 0}`} />
          <SummaryTile detail="download audit trail" label="Downloads" value={`${packetHistory?.summary.downloadCount ?? 0}`} />
          <SummaryTile detail="active recipient views" label="Active" value={`${packetHistory?.summary.activeCount ?? 0}`} />
          <SummaryTile detail="revoked shares" label="Revoked" value={`${packetHistory?.summary.revokedCount ?? 0}`} />
          <SummaryTile detail="saved blocker packets" label="Blocked history" value={`${packetHistory?.summary.blockedPacketCount ?? 0}`} />
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_0.9fr]">
          <div className="rounded-md border bg-background p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <FileCheck2 className="size-4" />
              Board summary
            </p>
            <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{report.redactedSummary}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Hash className="size-4" />
              Packet checksum
            </p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{report.checksums.packetHash}</p>
            <p className="mt-2 text-sm text-muted-foreground">{report.executiveMemo}</p>
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sign-off</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Due and evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.signOffs.map((row) => <SignOffRow key={row.role} row={row} />)}</TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Critical path</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner action</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.criticalPath.length > 0 ? (
              report.criticalPath.map((row) => <CriticalPathRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={4}>
                  No board approval blockers are active for this release window.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source checksum</TableHead>
              <TableHead>Records</TableHead>
              <TableHead>Hash</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.checksums.sources.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="max-w-[240px] whitespace-normal">
                  <p className="font-medium">{row.label}</p>
                  <Badge className="mt-1 rounded-md" variant={row.verified ? "outline" : "destructive"}>
                    {row.verified ? "verified" : "mismatch"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{row.sourceRecordCount}</TableCell>
                <TableCell className="max-w-[420px] whitespace-normal">
                  <p className="break-all font-mono text-xs text-muted-foreground">{row.contentHash}</p>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="grid gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium">
              <History className="size-4" />
              Packet history
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Saved board packets keep recipient purpose, actor attribution, revocation state, and download audit counts.</p>
          </div>
          {packetHistory && workspaceId ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Saved</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Files</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packetHistory.records.length > 0 ? (
                  packetHistory.records
                    .slice(0, 6)
                    .map((record) => (
                      <PacketHistoryRow key={record.id} isRevoking={revokingId === record.id} onRevoke={revokePacket} record={record} workspaceId={workspaceId} />
                    ))
                ) : (
                  <TableRow>
                    <TableCell className="text-muted-foreground" colSpan={5}>
                      No board approval packets are saved yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-md border bg-background p-3">
              <p className="text-sm font-medium">No saved packet history</p>
              <p className="mt-1 text-sm text-muted-foreground">Save this packet after board-ready review to start an audited approval record.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
