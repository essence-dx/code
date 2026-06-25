import { CheckCircle2, Clock3, Download, FileJson2, ShieldAlert, Signature, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseDistributionAcknowledgement,
  BoardReleaseDistributionAcknowledgementReport,
  BoardReleaseDistributionAcknowledgementStatus,
} from "@/features/projects/board-release-distribution-acknowledgements";

function statusVariant(status: BoardReleaseDistributionAcknowledgementStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "pending" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseDistributionAcknowledgementStatus }) {
  if (status === "signed" || status === "waived") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(value));
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

function AcknowledgementRow({ acknowledgement }: { acknowledgement: BoardReleaseDistributionAcknowledgement }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Signature className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{acknowledgement.signerName}</p>
            <p className="truncate text-xs text-muted-foreground">{acknowledgement.recipientEmail ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(acknowledgement.status)}>
          <StatusIcon status={acknowledgement.status} />
          {acknowledgement.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{acknowledgement.releasePromotionId ?? "Unassigned release"}</p>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{formatDate(acknowledgement.dueAt)}</p>
        <p>signed {formatDate(acknowledgement.signedAt)}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{acknowledgement.nextAction}</p>
        <p className="mt-1 truncate font-mono">{acknowledgement.acknowledgementHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseDistributionAcknowledgementsPanel({ report }: { report: BoardReleaseDistributionAcknowledgementReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Signature className="size-4" />
              Board release distribution acknowledgements
            </CardTitle>
            <CardDescription>Signer status, due windows, packet hashes, and acknowledgement evidence for release distribution.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="gap-1 rounded-md" variant="outline">
              <Clock3 className="size-3.5" />
              {report.summary.pendingCount} pending
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
          <SummaryTile detail="ack rows" label="Total" value={`${report.summary.acknowledgementCount}`} />
          <SummaryTile detail="needs repair" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="awaiting signer" label="Pending" value={`${report.summary.pendingCount}`} />
          <SummaryTile detail="captured" label="Signed" value={`${report.summary.signedCount}`} />
          <SummaryTile detail="not required" label="Waived" value={`${report.summary.waivedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Acknowledgement next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Signer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.acknowledgements.map((acknowledgement) => <AcknowledgementRow acknowledgement={acknowledgement} key={acknowledgement.acknowledgementId} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
