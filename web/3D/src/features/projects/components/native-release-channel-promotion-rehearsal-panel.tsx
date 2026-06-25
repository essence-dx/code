import { CheckCircle2, Download, FileJson2, GitBranch, RotateCcw, ShieldAlert, Table2, TriangleAlert, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  NativeReleaseChannelPromotionFileFormat,
  NativeReleaseChannelPromotionKind,
  NativeReleaseChannelPromotionRehearsal,
  NativeReleaseChannelPromotionStatus,
  NativeReleaseChannelPromotionStep,
} from "@/features/projects/native-release-channel-promotion-rehearsal";

function statusVariant(status: NativeReleaseChannelPromotionStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: NativeReleaseChannelPromotionStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function StepIcon({ kind }: { kind: NativeReleaseChannelPromotionKind }) {
  if (kind === "rollback-rehearsal") {
    return <RotateCcw className="size-4" />;
  }

  if (kind === "operator-acknowledgement") {
    return <UserCheck className="size-4" />;
  }

  return <GitBranch className="size-4" />;
}

function FileIcon({ format }: { format: NativeReleaseChannelPromotionFileFormat }) {
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

function EvidenceFlag({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <Badge className="gap-1 rounded-md" variant={enabled ? "outline" : "destructive"}>
      {enabled ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
      {label}
    </Badge>
  );
}

function PromotionStepRow({ step }: { step: NativeReleaseChannelPromotionStep }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <StepIcon kind={step.kind} />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{step.kind}</p>
            <p className="truncate text-xs text-muted-foreground">{step.id}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(step.status)}>
          <StatusIcon status={step.status} />
          {step.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal">
        <div className="flex flex-wrap gap-1.5">
          <EvidenceFlag enabled={step.evidenceAttached} label="evidence" />
          <EvidenceFlag enabled={step.rollbackEvidenceAttached || step.kind !== "rollback-rehearsal"} label="rollback" />
          <EvidenceFlag enabled={step.staleApprovalInvalidated} label="stale approval" />
        </div>
        <p className="mt-2 truncate text-xs text-muted-foreground">{step.acknowledgedBy}</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{step.detail}</p>
        <p className="mt-1 truncate font-mono">{step.approvalHashBefore}</p>
        <p className="mt-1 truncate font-mono">{step.approvalHashAfter}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{step.nextAction}</p>
        <p className="mt-1 truncate font-mono">{step.stepHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function NativeReleaseChannelPromotionRehearsalPanel({ rehearsal }: { rehearsal: NativeReleaseChannelPromotionRehearsal }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="size-4" />
              Native release channel promotion rehearsal
            </CardTitle>
            <CardDescription>Staging-to-stable channel move, rollback evidence, operator acknowledgement, and stale approval invalidation before native promotion.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(rehearsal.summary.status)}>
              <StatusIcon status={rehearsal.summary.status} />
              {rehearsal.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={rehearsal.summary.rehearsalScore < 80 ? "destructive" : "outline"}>
              {rehearsal.summary.rehearsalScore}/100 rehearsal
            </Badge>
            {rehearsal.files.map((file) => (
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
          <SummaryTile detail="promotion steps" label="Rows" value={`${rehearsal.summary.rowCount}`} />
          <SummaryTile detail="ready steps" label="Ready" value={`${rehearsal.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${rehearsal.summary.reviewCount}`} />
          <SummaryTile detail="blocked steps" label="Blocked" value={`${rehearsal.summary.blockedCount}`} />
          <SummaryTile detail={`${rehearsal.fromChannel} to ${rehearsal.toChannel}`} label="Channel" value={rehearsal.toChannel} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Promotion action</p>
          <p className="mt-1 text-sm text-muted-foreground">{rehearsal.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{rehearsal.summary.rehearsalHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Evidence</TableHead>
              <TableHead>Approval</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{rehearsal.steps.map((step) => <PromotionStepRow key={step.id} step={step} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {rehearsal.summary.rehearsalHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
