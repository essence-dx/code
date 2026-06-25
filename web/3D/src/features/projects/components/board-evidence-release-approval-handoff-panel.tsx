import { CalendarClock, CheckCircle2, Download, FileJson2, LockKeyhole, ShieldAlert, TriangleAlert, Users2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  BoardEvidenceReleaseApprovalDependency,
  BoardEvidenceReleaseApprovalHandoffReport,
  BoardEvidenceReleaseApprovalHandoffStatus,
  BoardEvidenceReleaseApprovalSigner,
} from "@/features/projects/board-evidence-release-approval-handoff";

function statusVariant(status: BoardEvidenceReleaseApprovalHandoffStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "watch" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: BoardEvidenceReleaseApprovalHandoffStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string) {
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

function SignerRow({ signer }: { signer: BoardEvidenceReleaseApprovalSigner }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Users2 className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{signer.name}</p>
            <p className="truncate text-xs text-muted-foreground">{signer.email ?? "No email on file"}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="rounded-md" variant="outline">
          {signer.role}
        </Badge>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(signer.status)}>
          <StatusIcon status={signer.status} />
          {signer.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        <p>{formatDate(signer.dueAt)}</p>
        <p>{signer.dependencyCount} dependencies</p>
      </TableCell>
      <TableCell className="max-w-[340px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{signer.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

function DependencyRow({ dependency }: { dependency: BoardEvidenceReleaseApprovalDependency }) {
  return (
    <TableRow>
      <TableCell className="max-w-[260px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <LockKeyhole className="size-3.5" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{dependency.title}</p>
            <p className="font-mono text-xs text-muted-foreground">{dependency.source}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(dependency.status)}>
          <StatusIcon status={dependency.status} />
          {dependency.status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{dependency.ownerName ?? "Release board"}</TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{dependency.nextAction}</p>
      </TableCell>
    </TableRow>
  );
}

export function BoardEvidenceReleaseApprovalHandoffPanel({ report }: { report: BoardEvidenceReleaseApprovalHandoffReport }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" />
              Board evidence release approval handoff
            </CardTitle>
            <CardDescription>Signer ownership, due windows, and packet dependency checks before release promotion.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(report.summary.status)}>
              <StatusIcon status={report.summary.status} />
              {report.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={report.summary.handoffScore < 70 ? "destructive" : "outline"}>
              {report.summary.handoffScore}/100 handoff
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
          <SummaryTile detail="approval owners" label="Signers" value={`${report.summary.signerCount}`} />
          <SummaryTile detail="checked gates" label="Dependencies" value={`${report.summary.dependencyCount}`} />
          <SummaryTile detail="need action" label="Blockers" value={`${report.summary.dependencyBlockerCount}`} />
          <SummaryTile detail="inside 3 days" label="Due soon" value={`${report.summary.dueSoonCount}`} />
          <SummaryTile detail={report.releasePromotionId ?? "no release id"} label="Promotion" value={report.summary.status} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Handoff next action</p>
          <p className="mt-1 text-sm text-muted-foreground">{report.summary.nextAction}</p>
        </div>

        <div className="grid gap-4 2xl:grid-cols-2">
          <div className="min-w-0 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Signer</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{report.signers.map((signer) => <SignerRow key={signer.id} signer={signer} />)}</TableBody>
            </Table>
          </div>

          <div className="min-w-0 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Dependency</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Next action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>{report.dependencies.map((dependency) => <DependencyRow key={dependency.id} dependency={dependency} />)}</TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
