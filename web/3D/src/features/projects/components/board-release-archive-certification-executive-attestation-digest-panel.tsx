import { CheckCircle2, Download, FileJson2, NotebookTabs, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveCertificationExecutiveAttestationDigestReport,
  BoardReleaseArchiveCertificationExecutiveAttestationRow,
  BoardReleaseArchiveCertificationExecutiveAttestationStatus,
} from "@/features/projects/board-release-archive-certification-executive-attestation-digest";

function statusVariant(status: BoardReleaseArchiveCertificationExecutiveAttestationStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveCertificationExecutiveAttestationStatus }) {
  if (status === "attested") {
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

function AttestationRow({ row }: { row: BoardReleaseArchiveCertificationExecutiveAttestationRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <NotebookTabs className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.score}/100</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.kind}</p>
        <p className="text-xs text-muted-foreground">{row.metric}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.evidenceHash}</p>
        <p className="mt-1 truncate font-mono">{row.attestationHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveCertificationExecutiveAttestationDigestPanel({
  report,
}: {
  report: BoardReleaseArchiveCertificationExecutiveAttestationDigestReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <NotebookTabs className="size-4" />
              Archive certification executive attestation digest
            </CardTitle>
            <CardDescription>Executive sign-off digest for certificate history, replay verification, auditor packet, and revocation state.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.attestationScore < 80 ? "destructive" : "outline"}>
              {report.summary.attestationScore}/100 attestation
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.jsonFileName} href={report.jsonDataUri}>
              <FileJson2 className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          <SummaryTile detail="digest rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready to sign" label="Attested" value={`${report.summary.attestedCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="monitor" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="workspace" label="Digest" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Executive memo</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.executiveMemo}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.attestationHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Attestation area</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Metric</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <AttestationRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
