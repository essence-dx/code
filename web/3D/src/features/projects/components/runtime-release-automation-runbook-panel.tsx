import { CheckCircle2, Download, FileJson2, PlayCircle, RotateCcw, ShieldCheck, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuntimeReleaseAutomationCommandKind,
  RuntimeReleaseAutomationRunbook,
  RuntimeReleaseAutomationRunbookFileFormat,
  RuntimeReleaseAutomationRunbookStatus,
} from "@/features/projects/runtime-release-automation-runbook";

function statusVariant(status: RuntimeReleaseAutomationRunbookStatus) {
  return status === "ready" ? "outline" : "destructive";
}

function StatusIcon({ status }: { status: RuntimeReleaseAutomationRunbookStatus }) {
  return status === "ready" ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function CommandIcon({ kind }: { kind: RuntimeReleaseAutomationCommandKind }) {
  if (kind === "rollback") {
    return <RotateCcw className="size-4" />;
  }

  if (kind === "post-promote-smoke") {
    return <ShieldCheck className="size-4" />;
  }

  return <PlayCircle className="size-4" />;
}

function FileIcon({ format }: { format: RuntimeReleaseAutomationRunbookFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

export function RuntimeReleaseAutomationRunbookPanel({ runbook }: { runbook: RuntimeReleaseAutomationRunbook }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="size-4" />
              Runtime release automation
            </CardTitle>
            <CardDescription>Promotion commands, post-promote smoke checks, and rollback guardrails for approved runtime handoff bundles.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(runbook.summary.status)}>
              <StatusIcon status={runbook.summary.status} />
              {runbook.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={runbook.summary.runbookScore < 100 ? "destructive" : "outline"}>
              {runbook.summary.runbookScore}/100 runbook
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-3">
          {runbook.commands.map((command) => (
            <div key={command.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <CommandIcon kind={command.kind} />
                    {command.label}
                  </p>
                  <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{command.command}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{command.evidenceHash}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant={statusVariant(command.status)}>
                  {command.kind}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {runbook.guardrails.map((guardrail) => (
            <div key={guardrail.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{guardrail.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{guardrail.nextAction}</p>
                  <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{guardrail.evidenceHash}</p>
                </div>
                <Badge className="shrink-0 rounded-md" variant={statusVariant(guardrail.status)}>
                  {guardrail.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {runbook.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {runbook.summary.runbookHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
