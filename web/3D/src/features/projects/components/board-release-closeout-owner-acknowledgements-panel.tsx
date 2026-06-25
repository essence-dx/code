import { CheckCircle2, Clock3, Download, FileJson2, ShieldAlert, UserRoundCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardReleaseCloseoutOwnerAcknowledgement,
  BoardReleaseCloseoutOwnerAcknowledgementReport,
  BoardReleaseCloseoutOwnerAcknowledgementStatus,
} from "@/features/projects/board-release-closeout-owner-acknowledgements";

function statusVariant(status: BoardReleaseCloseoutOwnerAcknowledgementStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "due" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardReleaseCloseoutOwnerAcknowledgementStatus }) {
  if (status === "signed") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <Clock3 className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      }).format(date);
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

function AcknowledgementRow({ acknowledgement }: { acknowledgement: BoardReleaseCloseoutOwnerAcknowledgement }) {
  return (
    <TableRow>
      <TableCell className="max-w-[280px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <UserRoundCheck className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{acknowledgement.gateKind}</p>
            <p className="truncate text-xs text-muted-foreground">{acknowledgement.requiredRole} acknowledgement</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(acknowledgement.status)}>
          <StatusIcon status={acknowledgement.status} />
          {acknowledgement.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">
          {acknowledgement.roleCovered ? "role covered" : "missing role"}
        </p>
      </TableCell>
      <TableCell className="max-w-[220px] whitespace-normal text-sm">
        <p className="font-medium">{acknowledgement.signerName ?? "Unassigned"}</p>
        <p className="truncate text-xs text-muted-foreground">{acknowledgement.signerEmail ?? "No signer email"}</p>
      </TableCell>
      <TableCell className="max-w-[260px] whitespace-normal text-sm">
        <p>Due {formatDate(acknowledgement.dueAt)}</p>
        <p className="text-xs text-muted-foreground">Signed {formatDate(acknowledgement.signedAt)}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-3">{acknowledgement.nextAction}</p>
        <p className="mt-1 truncate font-mono">{acknowledgement.acknowledgementHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardReleaseCloseoutOwnerAcknowledgementsPanel({
  report,
}: {
  report: BoardReleaseCloseoutOwnerAcknowledgementReport;
}) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserRoundCheck className="size-4" />
              Board release closeout owner acknowledgements
            </CardTitle>
            <CardDescription>Role-covered owner sign-off rows with due windows, signer evidence, and exportable acknowledgement hashes.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="rounded-md" variant={report.summary.status === "blocked" ? "destructive" : "outline"}>
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.missingRoleCount > 0 ? "destructive" : "outline"}>
              {report.summary.roleCoverageCount}/{report.summary.acknowledgementCount} roles covered
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
          <SummaryTile detail="tracked sign-offs" label="Acknowledgements" value={`${report.summary.acknowledgementCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="open windows" label="Due" value={`${report.summary.dueCount}`} />
          <SummaryTile detail="completed" label="Signed" value={`${report.summary.signedCount}`} />
          <SummaryTile detail="eligible roles" label="Coverage" value={`${report.summary.roleCoverageCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Acknowledgement next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Signer</TableHead>
              <TableHead>Window</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {report.acknowledgements.map((acknowledgement) => (
              <AcknowledgementRow acknowledgement={acknowledgement} key={acknowledgement.acknowledgementId} />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
