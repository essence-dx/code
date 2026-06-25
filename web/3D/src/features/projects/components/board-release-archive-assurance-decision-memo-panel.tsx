import { CheckCircle2, Download, FileJson2, Scale, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveAssuranceDecisionMemoOwner,
  BoardReleaseArchiveAssuranceDecisionMemoReport,
  BoardReleaseArchiveAssuranceDecisionMemoStatus,
} from "@/features/projects/board-release-archive-assurance-decision-memo";

function statusVariant(status: BoardReleaseArchiveAssuranceDecisionMemoStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "conditional" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveAssuranceDecisionMemoStatus }) {
  if (status === "approved") {
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

function OwnerRow({ owner }: { owner: BoardReleaseArchiveAssuranceDecisionMemoOwner }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Scale className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{owner.title}</p>
            <p className="truncate text-xs text-muted-foreground">{owner.sourceArea}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(owner.status)}>
          <StatusIcon status={owner.status} />
          {owner.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{owner.riskLevel}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{owner.ownerRole}</p>
        <p className="text-xs text-muted-foreground">{owner.dueWindow}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{owner.nextAction}</p>
        <p className="mt-1 truncate font-mono">{owner.evidenceHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveAssuranceDecisionMemoPanel({
  report,
}: {
  report: BoardReleaseArchiveAssuranceDecisionMemoReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="size-4" />
              Archive assurance decision memo
            </CardTitle>
            <CardDescription>Board-ready archive release recommendation with residual blocker owners and evidence-backed follow-up.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.memoScore < 80 ? "destructive" : "outline"}>
              {report.summary.memoScore}/100 memo
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
          <SummaryTile detail="residual owners" label="Owners" value={`${report.summary.ownerCount}`} />
          <SummaryTile detail="conditional follow-up" label="Conditional" value={`${report.summary.conditionalOwnerCount}`} />
          <SummaryTile detail="approval blockers" label="Blocked" value={`${report.summary.blockedOwnerCount}`} />
          <SummaryTile detail="decision" label="Status" value={report.summary.status} />
          <SummaryTile detail="workspace" label="Memo" value={report.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Decision memo</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.executiveMemo}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.memoHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.owners.map((owner) => <OwnerRow key={owner.id} owner={owner} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
