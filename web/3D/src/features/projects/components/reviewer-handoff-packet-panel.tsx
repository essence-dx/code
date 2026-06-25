"use client";

import { CheckCircle2, Download, FileCheck2, Hash, ShieldCheck, Signature, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ReviewerHandoffAttestationStatus, ReviewerHandoffPacketReport, ReviewerHandoffPacketStatus } from "@/features/projects/reviewer-handoff-packet";

function statusVariant(status: ReviewerHandoffPacketStatus | ReviewerHandoffAttestationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "pending" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ReviewerHandoffPacketStatus | ReviewerHandoffAttestationStatus }) {
  if (status === "ready" || status === "signed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not signed";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function downloadPacket(report: ReviewerHandoffPacketReport) {
  const blob = new Blob([report.packetJson], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `${report.packetId}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function ReviewerHandoffPacketPanel({ report }: { report: ReviewerHandoffPacketReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="size-4" />
              Reviewer handoff packet
            </CardTitle>
            <CardDescription>Redacted external summary, checksum verification, and owner attestations for governance review.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.handoffScore}/100 handoff
            </Badge>
            <Button className="h-8 gap-2" size="sm" type="button" onClick={() => downloadPacket(report)}>
              <Download className="size-4" />
              Packet JSON
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Workspace</p>
            <p className="mt-2 truncate text-sm font-semibold">{report.externalSummary.workspaceLabel}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Risk</p>
            <p className="mt-2 text-xl font-semibold">{report.externalSummary.riskScore}/100</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.externalSummary.riskLevel}</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Files</p>
            <p className="mt-2 text-xl font-semibold">{report.externalSummary.evidenceFileCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">{report.externalSummary.releaseBlockerCount} blockers</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Signatures</p>
            <p className="mt-2 text-xl font-semibold">
              {report.summary.signedAttestationCount}/{report.summary.totalAttestationCount}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{report.summary.pendingAttestationCount} pending</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Checksums</p>
            <p className="mt-2 text-xl font-semibold">
              {report.summary.verifiedChecksumCount}/{report.checksums.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">verified</p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-xs text-muted-foreground">Redactions</p>
            <p className="mt-2 text-xl font-semibold">{report.summary.redactionCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">sensitive tokens removed</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Evidence</TableHead>
                <TableHead>Sign-off</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.attestations.map((row) => (
                <TableRow key={row.sourceId}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <Signature className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.ownerHint}</p>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-2">{row.evidence}</p>
                    <p className="mt-1 line-clamp-2">{row.nextAction}</p>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.signedBy ?? "Pending"}</p>
                    <p className="mt-1">{formatDate(row.signedOffAt)}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Checksum</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Hash</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.checksums.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        {row.verified ? <ShieldCheck className="size-3.5" /> : <Hash className="size-3.5" />}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.label}</p>
                        <Badge className="mt-1 rounded-md" variant={row.verified ? "outline" : "destructive"}>
                          {row.verified ? "verified" : "mismatch"}
                        </Badge>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{row.sourceRecordCount}</TableCell>
                  <TableCell className="max-w-[260px] whitespace-normal text-xs text-muted-foreground">
                    <p className="break-all">{row.contentHash}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
