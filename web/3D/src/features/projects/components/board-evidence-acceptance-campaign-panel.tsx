import { CheckCircle2, ClipboardCheck, Download, FileCheck2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceAcceptanceCampaignReport,
  BoardEvidenceAcceptanceRow,
  BoardEvidenceAcceptanceStatus,
} from "@/features/projects/board-evidence-acceptance-campaign";

function statusVariant(status: BoardEvidenceAcceptanceStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "pending" || status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceAcceptanceStatus }) {
  if (status === "accepted") {
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

function AcceptanceRow({ row }: { row: BoardEvidenceAcceptanceRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileCheck2 className="size-3.5" />
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
        <p className="mt-1 text-xs text-muted-foreground">{row.kind}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal">
        <p className="font-medium">{row.owner}</p>
        <Badge className="mt-1 rounded-md" variant={row.attestationStatus === "blocked" ? "destructive" : row.attestationStatus === "accepted" ? "outline" : "secondary"}>
          {row.attestationStatus}
        </Badge>
        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{row.acceptedBy ?? row.attestationNote ?? "No owner attestation yet"}</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="break-all">{row.evidenceHash ?? row.scopeId}</p>
        <p className="mt-1">{row.sourceStatus}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceAcceptanceCampaignPanel({ report }: { report: BoardEvidenceAcceptanceCampaignReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="size-4" />
              Board evidence acceptance
            </CardTitle>
            <CardDescription>Owner attestations across bundle files, replay blockers, and exception scopes before board review closeout.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.acceptanceScore < 80 ? "destructive" : "outline"}>
              {report.summary.acceptanceScore}/100 acceptance
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={report.csvFileName} href={report.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="review scopes" label="Scopes" value={`${report.summary.scopeCount}`} />
          <SummaryTile detail="attested or ready" label="Accepted" value={`${report.summary.acceptedCount}`} />
          <SummaryTile detail="owner blocked" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="needs attestation" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="monitor before close" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="campaign rows" label="Campaign" value={report.campaignId.split("-").at(-1) ?? "current"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Acceptance next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scope</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Owner attestation</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.slice(0, 12).map((row) => <AcceptanceRow key={row.scopeId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
