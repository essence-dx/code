import { CheckCircle2, Download, FileJson2, LockKeyhole, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidencePacketLockReport,
  BoardEvidencePacketLockRow,
  BoardEvidencePacketLockState,
  BoardEvidencePacketLockStatus,
} from "@/features/projects/board-evidence-packet-lock";

function statusVariant(status: BoardEvidencePacketLockState | BoardEvidencePacketLockStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "open" || status === "partial" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidencePacketLockState | BoardEvidencePacketLockStatus }) {
  if (status === "locked") {
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

function LockRow({ row }: { row: BoardEvidencePacketLockRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <LockKeyhole className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.taskId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.lockState)}>
          <StatusIcon status={row.lockState} />
          {row.lockState}
        </Badge>
        <p className="mt-1 text-xs text-muted-foreground">{row.acceptanceStatus}</p>
      </TableCell>
      <TableCell className="max-w-[180px] whitespace-normal text-sm">
        <p className="font-medium">{row.ownerName}</p>
        <p className="text-xs text-muted-foreground">{row.verificationStatus}</p>
      </TableCell>
      <TableCell className="max-w-[280px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate font-mono">{row.lockHash ?? "Not locked"}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidencePacketLockPanel({ report }: { report: BoardEvidencePacketLockReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LockKeyhole className="size-4" />
              Board evidence packet lock
            </CardTitle>
            <CardDescription>Accepted evidence rows frozen before release promotion, with lock hashes and blocker visibility.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.promotionBlocked ? "destructive" : "outline"}>
              {report.summary.promotionBlocked ? "promotion blocked" : "promotion ready"}
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
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="acceptance rows" label="Tasks" value={`${report.summary.taskCount}`} />
          <SummaryTile detail="frozen rows" label="Locked" value={`${report.summary.lockedCount}`} />
          <SummaryTile detail="needs action" label="Blocked" value={`${report.summary.blockedCount}`} />
          <SummaryTile detail="not yet accepted" label="Open" value={`${report.summary.openCount}`} />
          <SummaryTile detail="locked ratio" label="Score" value={`${report.summary.lockScore}`} />
          <SummaryTile detail={report.lockActor.email ?? "No email"} label="Actor" value={report.lockActor.name ?? "Unknown"} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Packet lock next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evidence</TableHead>
              <TableHead>Lock</TableHead>
              <TableHead>Owner</TableHead>
              <TableHead>Hash</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <LockRow key={row.taskId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
