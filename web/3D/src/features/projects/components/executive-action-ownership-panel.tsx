import { AlertTriangle, CalendarClock, Download, LinkIcon, UserCheck, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExecutiveActionOwnershipMatrix, ExecutiveActionOwnershipRow, ExecutiveActionOwnershipStatus } from "@/features/projects/executive-action-ownership";

function statusVariant(status: ExecutiveActionOwnershipStatus) {
  if (status === "blocked" || status === "overdue") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: ExecutiveActionOwnershipStatus }) {
  return status === "ready" ? <UserCheck className="size-3.5" /> : <AlertTriangle className="size-3.5" />;
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

function EvidenceLinks({ row }: { row: ExecutiveActionOwnershipRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.evidenceLinks.map((link) => (
        <a className={buttonVariants({ className: "h-7 gap-1.5 px-2 text-xs", size: "sm", variant: "outline" })} href={link.href} key={`${row.id}:${link.kind}:${link.sourceId}`}>
          <LinkIcon className="size-3" />
          {link.label}
        </a>
      ))}
    </div>
  );
}

function OwnershipRow({ row }: { row: ExecutiveActionOwnershipRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[340px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <CalendarClock className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.signalLabel}</p>
            <p className="line-clamp-2 text-xs text-muted-foreground">{row.action}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="whitespace-normal">
        <p className="font-medium">{row.ownerName}</p>
        <p className="text-xs text-muted-foreground">{row.ownerEmail ?? row.ownerSource}</p>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.riskScore}/100</p>
      </TableCell>
      <TableCell className="whitespace-normal">
        <p className="text-sm">{row.dueWindowLabel}</p>
        <p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.dueAt))}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <EvidenceLinks row={row} />
      </TableCell>
    </TableRow>
  );
}

export function ExecutiveActionOwnershipPanel({ matrix }: { matrix: ExecutiveActionOwnershipMatrix }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="size-4" />
              Executive action ownership
            </CardTitle>
            <CardDescription>Accountable owners, due windows, and evidence links for the executive critical path.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(matrix.summary.status)}>
              <StatusIcon status={matrix.summary.status} />
              {matrix.summary.ownershipScore}/100
            </Badge>
            <Badge className="rounded-md" variant={matrix.summary.unassignedCount > 0 ? "secondary" : "outline"}>
              {matrix.summary.ownerCoveragePercent}% assigned
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={matrix.csvFileName} href={matrix.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail={matrix.summary.status} label="Ownership score" value={`${matrix.summary.ownershipScore}/100`} />
          <SummaryTile detail="assigned actions" label="Coverage" value={`${matrix.summary.ownerCoveragePercent}%`} />
          <SummaryTile detail="needs owner" label="Unassigned" value={`${matrix.summary.unassignedCount}`} />
          <SummaryTile detail="blocked or overdue" label="Blocked" value={`${matrix.summary.blockedCount + matrix.summary.overdueCount}`} />
          <SummaryTile detail="open due windows" label="Due soon" value={`${matrix.summary.dueSoonCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{matrix.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due</TableHead>
              <TableHead>Evidence</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {matrix.rows.length > 0 ? (
              matrix.rows.map((row) => <OwnershipRow key={row.id} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No executive owner actions are open for this release window.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
