import { CheckCircle2, Download, FileJson2, Route, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseArchiveAssuranceDistributionMatrixReport,
  BoardReleaseArchiveAssuranceDistributionRecipient,
  BoardReleaseArchiveAssuranceDistributionStatus,
} from "@/features/projects/board-release-archive-assurance-distribution-matrix";

function statusVariant(status: BoardReleaseArchiveAssuranceDistributionStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseArchiveAssuranceDistributionStatus }) {
  if (status === "covered") {
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

function RecipientRow({ recipient }: { recipient: BoardReleaseArchiveAssuranceDistributionRecipient }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Route className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{recipient.title}</p>
            <p className="truncate text-xs text-muted-foreground">{recipient.audience}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(recipient.status)}>
          <StatusIcon status={recipient.status} />
          {recipient.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{recipient.expiryCoverage}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{recipient.routeLabel}</p>
        <p className="truncate text-xs text-muted-foreground">{recipient.recipient}</p>
      </TableCell>
      <TableCell className="text-sm">
        <p>{recipient.acknowledgementDeadline}</p>
        <p className="text-xs text-muted-foreground">expires {recipient.expiryAt}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{recipient.nextAction}</p>
        <p className="mt-1 truncate font-mono">{recipient.coverageHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseArchiveAssuranceDistributionMatrixPanel({
  report,
}: {
  report: BoardReleaseArchiveAssuranceDistributionMatrixReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Route className="size-4" />
              Archive assurance distribution matrix
            </CardTitle>
            <CardDescription>Recipient routes for handoff packets with acknowledgement deadlines, expiry coverage, and immutable coverage hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.matrixScore < 80 ? "destructive" : "outline"}>
              {report.summary.matrixScore}/100 matrix
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
          <SummaryTile detail="recipient rows" label="Recipients" value={`${report.summary.recipientCount}`} />
          <SummaryTile detail="covered routes" label="Covered" value={`${report.summary.coveredCount}`} />
          <SummaryTile detail="conditional routes" label="Watch" value={`${report.summary.watchCount}`} />
          <SummaryTile detail="blocked routes" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="expiry proof" label="Expiry" value={`${report.summary.expiryCoveredCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Distribution next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.distributionHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Packet</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Acknowledgement</TableHead>
              <TableHead>Coverage</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.recipients.map((recipient) => <RecipientRow key={recipient.id} recipient={recipient} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
