import { CheckCircle2, Download, FileKey2, KeyRound, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SignedAuditEvidencePacketStatus, SignedAuditEvidencePacketVerificationReport } from "@/features/projects/signed-audit-evidence-packets";

function statusVariant(status: SignedAuditEvidencePacketStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: SignedAuditEvidencePacketStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
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

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function SignedAuditEvidencePacketPanel({ report }: { report: SignedAuditEvidencePacketVerificationReport }) {
  const visibleRows = report.rows.slice(0, 8);
  const visibleKeys = report.keyRotationRows.slice(0, 6);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileKey2 className="size-4" />
              Signed audit evidence packets
            </CardTitle>
            <CardDescription>Detached signature verification, packet hash matching, trusted public keys, and signing-key rotation metadata.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant="outline">
              {report.summary.verificationScore}/100 verified
            </Badge>
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download data-icon="inline-start" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="handoff, risk, audit, release" label="Packets" value={`${report.summary.packetCount}`} />
          <SummaryTile detail="cryptographic signatures" label="Verified" value={`${report.summary.verifiedSignatureCount}`} />
          <SummaryTile detail={`${report.summary.watchPacketCount} in watch`} label="Ready" value={`${report.summary.readyPacketCount}`} />
          <SummaryTile detail="hash/signature/key failures" label="Blocked" value={`${report.summary.blockedPacketCount}`} />
          <SummaryTile detail={`${report.summary.publicKeyRotation.graceKeyCount} grace`} label="Active keys" value={`${report.summary.publicKeyRotation.activeKeyCount}`} />
          <SummaryTile detail={formatDate(report.summary.publicKeyRotation.nextRotationDueAt)} label="Next rotation" value={`${report.summary.publicKeyRotation.rotationDueCount}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Packet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Signature</TableHead>
                <TableHead>Hash</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={`${row.packetKind}:${row.packetId}`}>
                  <TableCell className="max-w-[260px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <ShieldCheck className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.sourceLabel}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.packetId}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.verificationState}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">{row.keyId ?? "No key"}</p>
                    <p className="mt-1">{row.signer ?? "No signer"}</p>
                  </TableCell>
                  <TableCell className="max-w-[240px] whitespace-normal text-xs text-muted-foreground">
                    <p className="break-all">{row.contentHash}</p>
                  </TableCell>
                  <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Rotation</TableHead>
                <TableHead>Window</TableHead>
                <TableHead>Next action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleKeys.map((row) => (
                <TableRow key={row.keyId}>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
                        <KeyRound className="size-3.5" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium">{row.keyId}</p>
                        <p className="truncate text-xs text-muted-foreground">{row.owner}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className="rounded-md" variant={row.rotationState === "revoked" || row.rotationState === "expired" ? "destructive" : row.rotationState === "current" ? "outline" : "secondary"}>
                      {row.rotationState}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[180px] whitespace-normal text-xs text-muted-foreground">
                    <p>{formatDate(row.validFrom)}</p>
                    <p>{formatDate(row.validUntil)}</p>
                  </TableCell>
                  <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
                    <p className="line-clamp-3">{row.nextAction}</p>
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
