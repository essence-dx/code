import { CheckCircle2, Download, FileJson2, GitBranch, PackagePlus, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeReleaseCandidateArtifactAttachmentWorkflowFileFormat,
  NativeReleaseCandidateArtifactAttachmentWorkflowReport,
  NativeReleaseCandidateArtifactAttachmentWorkflowRow,
  NativeReleaseCandidateArtifactAttachmentWorkflowStatus,
} from "@/features/projects/native-release-candidate-artifact-attachment-workflow";

function statusVariant(status: NativeReleaseCandidateArtifactAttachmentWorkflowStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeReleaseCandidateArtifactAttachmentWorkflowStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: NativeReleaseCandidateArtifactAttachmentWorkflowFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
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

function WorkflowFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function WorkflowRow({ row }: { row: NativeReleaseCandidateArtifactAttachmentWorkflowRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <PackagePlus className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform}</p>
            <p className="truncate text-xs text-muted-foreground">{row.updaterChannel}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <WorkflowFlag enabled={row.attachmentReady} label="artifact" />
          <WorkflowFlag enabled={row.manifestReady} label="manifest" />
          <WorkflowFlag enabled={row.channelReady} label="channel" />
          <WorkflowFlag enabled={row.releaseApprovalReady} label="approval" />
        </div>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.artifactUrl || "missing artifact URL"}</p>
        <p className="mt-1 truncate">{row.manifestUrl || "missing manifest URL"}</p>
        <p className="mt-1 truncate">{row.attachmentOwner || "missing owner"}</p>
      </TableCell>
      <TableCell className="max-w-[420px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.workflowHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeReleaseCandidateArtifactAttachmentWorkflowPanel({ report }: { report: NativeReleaseCandidateArtifactAttachmentWorkflowReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4" />
              Release candidate artifact attachment
            </CardTitle>
            <CardDescription>Signed artifact attachments promoted into updater manifests with release approval blocked until every required platform is attached.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.workflowScore < 80 ? "destructive" : "outline"}>
              {report.summary.workflowScore}/100 workflow
            </Badge>
            {report.files.map((file) => (
              <Button key={file.format} render={<a download={file.download} href={file.href} />} className="h-8 gap-2" size="sm" variant="outline">
                <FileIcon format={file.format} />
                {file.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <SummaryTile detail="platform rows" label="Rows" value={`${report.summary.rowCount}`} />
          <SummaryTile detail="ready rows" label="Ready" value={`${report.summary.readyCount}`} />
          <SummaryTile detail="attached artifacts" label="Attached" value={`${report.summary.attachmentReadyCount}`} />
          <SummaryTile detail="manifest links" label="Manifest" value={`${report.summary.manifestReadyCount}`} />
          <SummaryTile detail="unblocked approvals" label="Approval" value={`${report.summary.approvalUnblockedCount}`} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Attachment action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{report.summary.workflowHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead>Artifact</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{report.rows.map((row) => <WorkflowRow key={row.platform} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {report.summary.workflowHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
