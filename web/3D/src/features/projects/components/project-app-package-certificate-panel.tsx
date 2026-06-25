import { CheckCircle2, Clock3, KeyRound, PackageCheck, ShieldAlert, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ProjectAppPackageCertificateBundleRow, ProjectAppPackageCertificateReport, ProjectAppPackageCertificateStatus } from "@/features/projects/app-package-certificates";

function statusVariant(status: ProjectAppPackageCertificateStatus) {
  if (status === "expired" || status === "missing" || status === "mismatch" || status === "revoked") {
    return "destructive" as const;
  }

  if (status === "expiring") {
    return "secondary" as const;
  }

  return "outline" as const;
}

function statusIcon(status: ProjectAppPackageCertificateStatus) {
  if (status === "valid") {
    return <CheckCircle2 className="size-3.5" />;
  }

  if (status === "expiring") {
    return <Clock3 className="size-3.5" />;
  }

  return <TriangleAlert className="size-3.5" />;
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not attached";
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function CertificateRow({ row }: { row: ProjectAppPackageCertificateBundleRow }) {
  return (
    <TableRow>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate font-medium">{row.projectName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.sourceVersionId}</p>
        </div>
      </TableCell>
      <TableCell>
        <div className="min-w-0">
          <p className="truncate text-sm">{row.presetLabel}</p>
          <p className="truncate text-xs text-muted-foreground">{row.platform}</p>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          {statusIcon(row.status)}
          {row.status}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="max-w-[280px]">
          <p className="truncate text-xs">{row.certificate?.subject ?? "No certificate attached"}</p>
          <p className="truncate text-xs text-muted-foreground">{row.certificate?.fingerprintSha256 ?? row.issue}</p>
        </div>
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(row.expiresAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectAppPackageCertificatePanel({ report }: { report: ProjectAppPackageCertificateReport }) {
  const visibleRows = report.rows.slice(0, 10);

  return (
    <Card className="mt-4">
      <CardHeader className="gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              Native package certificates
            </CardTitle>
            <CardDescription>Certificate coverage for Windows, macOS, Linux, Android, and visionOS app package records.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={report.summary.blockedCount > 0 ? "destructive" : "outline"}>
              <ShieldAlert className="size-3.5" />
              {report.summary.blockedCount} blocked
            </Badge>
            <Badge className="gap-1 rounded-md" variant="outline">
              <CheckCircle2 className="size-3.5" />
              {report.summary.readyCount}/{report.summary.totalRequiredCount} ready
            </Badge>
            <Badge className="gap-1 rounded-md" variant="secondary">
              <PackageCheck className="size-3.5" />
              {report.summary.nativeBundleCount} native bundles
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Certificate</TableHead>
              <TableHead>Expires</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.length > 0 ? (
              visibleRows.map((row) => <CertificateRow key={`${row.sourceKey}:${row.platform}`} row={row} />)
            ) : (
              <TableRow>
                <TableCell className="text-muted-foreground" colSpan={5}>
                  No native package certificate slots are required yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {report.summary.expiringCount > 0 ? (
          <div className="mt-3 flex items-start gap-2 rounded-md border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
            <Clock3 className="mt-0.5 size-4 shrink-0" />
            {report.summary.expiringCount} certificate{report.summary.expiringCount === 1 ? "" : "s"} expire within 30 days.
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
