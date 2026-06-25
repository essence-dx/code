import { Archive, CheckCircle2, Download, FileJson2, PackageCheck, ShieldAlert, Table2, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type {
  DesktopPackageInstallRehearsalFileFormat,
  DesktopPackageInstallRehearsalPacket,
  DesktopPackageInstallRehearsalRow,
  DesktopPackageInstallRehearsalStatus,
} from "@/features/projects/desktop-package-install-rehearsal-packet";

function statusVariant(status: DesktopPackageInstallRehearsalStatus) {
  if (status === "blocked") {
    return "destructive" as const;
  }

  return status === "review" ? "secondary" : "outline";
}

function StatusIcon({ status }: { status: DesktopPackageInstallRehearsalStatus }) {
  if (status === "ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "blocked" ? <ShieldAlert className="size-3.5" /> : <TriangleAlert className="size-3.5" />;
}

function FileIcon({ format }: { format: DesktopPackageInstallRehearsalFileFormat }) {
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

function RehearsalFlag({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge className="rounded-md" variant={active ? "outline" : "destructive"}>
      {label}
    </Badge>
  );
}

function RehearsalRow({ row }: { row: DesktopPackageInstallRehearsalRow }) {
  return (
    <TableRow>
      <TableCell className="max-w-[300px] whitespace-normal">
        <div className="flex items-start gap-2">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary text-secondary-foreground">
            <Archive className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="font-medium">{row.platform.toUpperCase()}</p>
            <p className="truncate text-xs text-muted-foreground">{row.artifactFileName}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
          <StatusIcon status={row.status} />
          {row.status}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[320px] whitespace-normal text-xs text-muted-foreground">
        <div className="flex flex-wrap gap-1">
          <RehearsalFlag active={row.archiveVerified} label="archive" />
          <RehearsalFlag active={row.installVerified} label="install" />
          <RehearsalFlag active={row.smokeVerified} label="smoke" />
          <RehearsalFlag active={row.rollbackVerified} label="rollback" />
          <RehearsalFlag active={row.updaterMetadataLinked} label="updater" />
        </div>
        <p className="mt-2 line-clamp-2">{row.verificationNotes}</p>
      </TableCell>
      <TableCell className="max-w-[380px] whitespace-normal text-xs text-muted-foreground">
        <p className="truncate">{row.installCommand}</p>
        <p className="mt-1 truncate">{row.smokeCommand}</p>
        <p className="mt-1 truncate font-mono">{row.updaterMetadataHash}</p>
      </TableCell>
      <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">
        <p className="line-clamp-2">{row.nextAction}</p>
        <p className="mt-1 truncate font-mono">{row.packetHash}</p>
      </TableCell>
    </TableRow>
  );
}

export function DesktopPackageInstallRehearsalPacketPanel({ packet }: { packet: DesktopPackageInstallRehearsalPacket }) {
  return (
    <Card className="mt-4">
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PackageCheck className="size-4" />
              Desktop package install rehearsal
            </CardTitle>
            <CardDescription>Windows, macOS, and Linux archive/install rehearsal packets linked to updater metadata and release smoke evidence.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge className="gap-1 rounded-md" variant={statusVariant(packet.summary.status)}>
              <StatusIcon status={packet.summary.status} />
              {packet.summary.status}
            </Badge>
            <Badge className="rounded-md" variant={packet.summary.rehearsalScore < 80 ? "destructive" : "outline"}>
              {packet.summary.rehearsalScore}/100 rehearsal
            </Badge>
            {packet.files.map((file) => (
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
          <SummaryTile detail="platform rehearsals" label="Rows" value={`${packet.summary.rowCount}`} />
          <SummaryTile detail="ready platforms" label="Ready" value={`${packet.summary.readyCount}`} />
          <SummaryTile detail="needs review" label="Review" value={`${packet.summary.reviewCount}`} />
          <SummaryTile detail="release blockers" label="Blocked" value={`${packet.summary.blockedCount}`} />
          <SummaryTile detail="release version" label="Version" value={packet.releaseVersion} />
        </div>

        <div className="rounded-md border bg-background p-3">
          <p className="text-sm font-medium">Install rehearsal action</p>
          <p className="mt-1 text-sm text-muted-foreground">{packet.summary.nextAction}</p>
          <p className="mt-2 truncate font-mono text-xs text-muted-foreground">{packet.summary.packetHash}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Platform</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Checks</TableHead>
              <TableHead>Commands / Updater</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{packet.rows.map((row) => <RehearsalRow key={row.rehearsalId} row={row} />)}</TableBody>
        </Table>

        <Badge className="w-fit gap-1 rounded-md" variant="outline">
          <Download className="size-3.5" />
          {packet.summary.packetHash}
        </Badge>
      </CardContent>
    </Card>
  );
}
