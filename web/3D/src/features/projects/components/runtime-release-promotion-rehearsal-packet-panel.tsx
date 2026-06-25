import { CheckCircle2, Download, FileJson2, Milestone, RotateCcw, ShieldCheck, Table2, TriangleAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RuntimeReleasePromotionRehearsalPacket,
  RuntimeReleasePromotionRehearsalPacketFileFormat,
  RuntimeReleasePromotionRehearsalPacketStatus,
  RuntimeReleasePromotionRehearsalStepKind,
  RuntimeReleasePromotionRehearsalStepStatus,
} from "@/features/projects/runtime-release-promotion-rehearsal-packet";

function statusVariant(status: RuntimeReleasePromotionRehearsalPacketStatus | RuntimeReleasePromotionRehearsalStepStatus) {
  return status === "failed" || status === "blocked" ? "destructive" : "outline";
}

function StatusIcon({ status }: { status: RuntimeReleasePromotionRehearsalPacketStatus | RuntimeReleasePromotionRehearsalStepStatus }) {
  return status === "failed" || status === "blocked" ? <TriangleAlert className="size-3.5" /> : <CheckCircle2 className="size-3.5" />;
}

function StepIcon({ kind }: { kind: RuntimeReleasePromotionRehearsalStepKind }) {
  if (kind === "rollback-drill") {
    return <RotateCcw className="size-4" />;
  }

  if (kind === "post-promote-smoke") {
    return <ShieldCheck className="size-4" />;
  }

  if (kind === "operator-acknowledgement") {
    return <UserCheck className="size-4" />;
  }

  return <Milestone className="size-4" />;
}

function FileIcon({ format }: { format: RuntimeReleasePromotionRehearsalPacketFileFormat }) {
  return format === "json" ? <FileJson2 className="size-4" /> : <Table2 className="size-4" />;
}

export function RuntimeReleasePromotionRehearsalPacketPanel({ packet }: { packet: RuntimeReleasePromotionRehearsalPacket }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Milestone className="size-4" />
              Promotion rehearsal packet
            </CardTitle>
            <CardDescription>Alias move, post-promote smoke, rollback drill, and operator acknowledgement evidence before production promotion.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(packet.summary.status)}>
              <StatusIcon status={packet.summary.status} />
              {packet.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={packet.summary.rehearsalScore < 100 ? "destructive" : "outline"}>
              {packet.summary.rehearsalScore}/100 rehearsal
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 xl:grid-cols-4">
          {packet.steps.map((step) => (
            <div key={step.id} className="rounded-md border bg-background p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <StepIcon kind={step.kind} />
                    {step.kind}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">{step.detail}</p>
                </div>
                <Badge className="shrink-0 gap-1 rounded-md" variant={statusVariant(step.status)}>
                  <StatusIcon status={step.status} />
                  {step.status}
                </Badge>
              </div>
              <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{step.evidenceHash}</p>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {packet.files.map((file) => (
            <Button key={file.format} render={<a download={file.download} href={file.href} />} className="gap-2" size="sm" variant="outline">
              <FileIcon format={file.format} />
              {file.label}
            </Button>
          ))}
          <Badge className="gap-1 rounded-md" variant="outline">
            <Download className="size-3.5" />
            {packet.summary.packetHash}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
