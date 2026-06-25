import { Award, CheckCircle2, Download, FileJson2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport,
  BoardReleaseArchiveAssuranceFinalCloseoutEvidence,
  BoardReleaseArchiveAssuranceFinalCloseoutStatus,
} from "@/features/projects/board-release-archive-assurance-final-closeout-certificate";

function statusVariant(status: BoardReleaseArchiveAssuranceFinalCloseoutStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "conditional" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveAssuranceFinalCloseoutStatus }) {
  if (status === "certified") {
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

function EvidenceRow({ row }: { row: BoardReleaseArchiveAssuranceFinalCloseoutEvidence }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Award className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="truncate text-xs text-muted-foreground">{row.kind}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.sourceStatus}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.recordCount} records</p>
        <p className="truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveAssuranceFinalCloseoutCertificatePanel({
  report,
}: {
  report: BoardReleaseArchiveAssuranceFinalCloseoutCertificateReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Award className="size-4" />
              Archive assurance final closeout certificate
            </CardTitle>
            <CardDescription>Final certificate sealing digest, notarization, distribution, and post-release audit evidence into one closeout bundle.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.certificateScore < 80 ? "destructive" : "outline"}>
              {report.summary.certificateScore}/100 certificate
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
          <SummaryTile detail="evidence sources" label="Evidence" value={`${report.summary.evidenceCount}`} />
          <SummaryTile detail="certified rows" label="Certified" value={`${report.summary.certifiedCount}`} />
          <SummaryTile detail="conditional rows" label="Conditional" value={`${report.summary.conditionalCount}`} />
          <SummaryTile detail="blocked rows" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="workspace" label="Certificate" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Certificate recommendation</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.recommendation}</p>
          <p className="mt-2 text-sm text-muted-foreground">{report.certificateText}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.certificateHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.evidence.map((row) => <EvidenceRow key={row.id} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
