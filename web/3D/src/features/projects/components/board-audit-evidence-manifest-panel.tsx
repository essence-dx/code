import { CheckCircle2, Download, FileCheck2, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardAuditEvidenceAttachmentManifest,
  BoardAuditEvidenceManifestRow,
  BoardAuditEvidenceManifestStatus,
} from "@/features/projects/board-audit-evidence-manifest";

function statusVariant(status: BoardAuditEvidenceManifestStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardAuditEvidenceManifestStatus }) {
  if (status === "ready") {
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

function ManifestRow({ row }: { row: BoardAuditEvidenceManifestRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[320px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <FileCheck2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.taskId}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="text-sm">
        <p className="font-medium">{row.attachments.length} attachments</p>
        <p className="text-xs text-muted-foreground">{row.linkedFileCount} exported files</p>
      </TableCell>
      <TableCell className="max-w-[240px]">
        <p className="truncate font-mono text-xs text-muted-foreground">{row.sourceHash}</p>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardAuditEvidenceManifestPanel({ manifest }: { manifest: BoardAuditEvidenceAttachmentManifest }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileCheck2 className="size-4" />
              Board audit evidence manifest
            </CardTitle>
            <CardDescription>Task closeout notes, source hashes, and exported packet files linked into one audit manifest.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(manifest.summary.status)}>
              <StatusIcon status={manifest.summary.status} />
              {manifest.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={manifest.summary.manifestScore < 70 ? "destructive" : "outline"}>
              {manifest.summary.manifestScore}/100 manifest
            </Badge>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={manifest.csvFileName} href={manifest.csvDataUri}>
              <Download className="size-4" />
              CSV
            </a>
            <a className={buttonVariants({ className: "h-8 gap-2", size: "sm", variant: "outline" })} download={manifest.jsonFileName} href={manifest.jsonDataUri}>
              <Download className="size-4" />
              JSON
            </a>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile detail="audit tasks" label="Tasks" value={`${manifest.summary.taskCount}`} />
          <SummaryTile detail="all evidence links" label="Attachments" value={`${manifest.summary.attachmentCount}`} />
          <SummaryTile detail="export packet files" label="Files" value={`${manifest.summary.linkedFileCount}`} />
          <SummaryTile detail="closeout notes" label="Notes" value={`${manifest.summary.closeoutNoteCount}`} />
          <SummaryTile detail="needs evidence" label="Missing" value={`${manifest.summary.missingEvidenceCount}`} />
          <SummaryTile detail="workspace" label="Manifest" value={manifest.workspaceId} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Manifest next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{manifest.summary.nextAction}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Task</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Source hash</TableHead>
              <TableHead>Next action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{manifest.rows.map((row) => <ManifestRow key={row.taskId} row={row} />)}</TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
