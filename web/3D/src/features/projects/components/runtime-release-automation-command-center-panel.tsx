import { Archive, CheckCircle2, Download, FileJson2, PlayCircle, RotateCcw, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuntimeReleaseAutomationCommandCenter,
  RuntimeReleaseAutomationCommandCenterFileFormat,
  RuntimeReleaseAutomationCommandCenterStatus,
  RuntimeReleaseAutomationPrimaryActionKind,
} from "@/features/projects/runtime-release-automation-command-center";

function statusVariant(status: RuntimeReleaseAutomationCommandCenterStatus) {
  return status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: RuntimeReleaseAutomationCommandCenterStatus }) {
  if (status === "blocked") {
    return <TriangleAlert className="size-3.5" />;
  }

  if (status === "rollback-ready") {
    return <RotateCcw className="size-3.5" />;
  }

  if (status === "archived") {
    return <Archive className="size-3.5" />;
  }

  return <CheckCircle2 className="size-3.5" />;
}

function ActionIcon({ action }: { action: RuntimeReleaseAutomationPrimaryActionKind }) {
  if (action === "resolve-blockers") {
    return <ShieldAlert className="size-4" />;
  }

  if (action === "rollback") {
    return <RotateCcw className="size-4" />;
  }

  if (action === "archive") {
    return <Archive className="size-4" />;
  }

  return <PlayCircle className="size-4" />;
}

function FileIcon({ format }: { format: RuntimeReleaseAutomationCommandCenterFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

export function RuntimeReleaseAutomationCommandCenterPanel({ commandCenter }: { commandCenter: RuntimeReleaseAutomationCommandCenter }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4" />
              Automation command center
            </CardTitle>
            <CardDescription>Operator controls for ready, blocked, rollback-ready, and archived runtime release candidates.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={commandCenter.summary.status === "blocked" ? "destructive" : "outline"}>
              {commandCenter.summary.status === "blocked" ? <TriangleAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />}
              {commandCenter.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={commandCenter.summary.commandCenterScore < 100 ? "destructive" : "outline"}>
              {commandCenter.summary.commandCenterScore}/100 command center
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          {commandCenter.rows.map((row) => (
            <div key={row.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{row.releaseCandidateId}</p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{row.owner}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-md" variant={statusVariant(row.status)}>
                  <StatusIcon status={row.status} />
                  {row.status}
                </Badge>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-md border bg-muted/30 p-2">
                <ActionIcon action={row.primaryActionKind} />
                <p className="text-xs text-muted-foreground">{row.nextAction}</p>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{row.evidenceHash}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {commandCenter.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {commandCenter.summary.commandCenterHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
