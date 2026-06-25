"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, Download, FileInput, FileSpreadsheet, Loader2, ShieldAlert, UsersRound } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import {
  createWorkspaceMemberDirectoryExport,
  createWorkspaceMemberImportPlan,
  parseWorkspaceMemberImportCsv,
  type WorkspaceMemberImportPlan,
  type WorkspaceMemberImportStatus,
} from "@/features/workspaces/member-import-export";
import type { WorkspaceDashboard } from "@/features/workspaces/types";

const sampleCsv = "email,name,role\neditor@example.com,Editor User,editor\nviewer@example.com,Viewer User,viewer";

type ImportResponse = {
  createdInvites?: Array<{ email: string }>;
  error?: string;
  failedRows?: Array<{ email: string; error: string }>;
  plan?: WorkspaceMemberImportPlan;
};

function statusVariant(status: WorkspaceMemberImportStatus) {
  if (status === "blocked-role" || status === "invalid-email") {
    return "destructive" as const;
  }

  return status === "invite-ready" ? "outline" : "secondary";
}

function StatusIcon({ status }: { status: WorkspaceMemberImportStatus }) {
  if (status === "invite-ready") {
    return <CheckCircle2 className="size-3.5" />;
  }

  return status === "needs-admin-approval" || status === "blocked-role" ? <ShieldAlert className="size-3.5" /> : <AlertTriangle className="size-3.5" />;
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-xl font-semibold">{value}</p>
    </div>
  );
}

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => null);

  if (!response.ok && response.status !== 207) {
    const message = typeof payload?.error === "string" ? payload.error : "Member import failed";
    throw new Error(message);
  }

  return payload as T;
}

export function WorkspaceMemberImportExportPanel({ workspace }: { workspace: WorkspaceDashboard }) {
  const router = useRouter();
  const [allowAdminInvites, setAllowAdminInvites] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [lastImportPlan, setLastImportPlan] = useState<WorkspaceMemberImportPlan | null>(null);
  const [pending, setPending] = useState(false);
  const canManage = workspace.role === "owner" || workspace.role === "admin";
  const directoryExport = useMemo(() => createWorkspaceMemberDirectoryExport(workspace), [workspace]);
  const importPlan = useMemo(
    () =>
      createWorkspaceMemberImportPlan({
        allowAdminInvites,
        rows: parseWorkspaceMemberImportCsv(csvContent),
        workspace,
      }),
    [allowAdminInvites, csvContent, workspace],
  );
  const visibleRows = importPlan.rows.slice(0, 8);

  async function handleBulkImport() {
    if (!canManage || pending || importPlan.summary.inviteReadyCount === 0) {
      return;
    }

    setPending(true);

    try {
      const response = await parseJson<ImportResponse>(
        await fetch(`/api/workspaces/${workspace.id}/member-import`, {
          body: JSON.stringify({
            allowAdminInvites,
            csvContent,
          }),
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
        }),
      );

      if (!response.plan) {
        throw new Error(response.error ?? "Member import failed");
      }

      setLastImportPlan(response.plan);
      toast.success(`${response.createdInvites?.length ?? 0} workspace invite${response.createdInvites?.length === 1 ? "" : "s"} created`);

      if ((response.failedRows?.length ?? 0) > 0) {
        toast.error(`${response.failedRows?.length ?? 0} invite${response.failedRows?.length === 1 ? "" : "s"} failed during import`);
      }

      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Member import failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader className="gap-4">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="size-4" />
              Member import and export
            </CardTitle>
            <CardDescription>CSV directory exports, import previews, duplicate detection, pending-invite checks, and role-safe bulk invites.</CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={directoryExport.csvFileName} href={directoryExport.csvDataUri}>
              <Download data-icon="inline-start" />
              Export CSV
            </a>
            <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "outline" })} download={directoryExport.jsonFileName} href={directoryExport.jsonDataUri}>
              <Download data-icon="inline-start" />
              Export JSON
            </a>
            {importPlan.rows.length > 0 ? (
              <a className={buttonVariants({ className: "gap-2", size: "sm", variant: "secondary" })} download={importPlan.csvFileName} href={importPlan.csvDataUri}>
                <FileSpreadsheet data-icon="inline-start" />
                Plan CSV
              </a>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
          <SummaryTile label="Members" value={`${directoryExport.summary.memberCount}`} />
          <SummaryTile label="Pending invites" value={`${directoryExport.summary.pendingInviteCount}`} />
          <SummaryTile label="Import rows" value={`${importPlan.summary.totalRows}`} />
          <SummaryTile label="Ready" value={`${importPlan.summary.inviteReadyCount}`} />
          <SummaryTile label="Duplicates" value={`${importPlan.summary.duplicateMemberCount + importPlan.summary.pendingInviteDuplicateCount + importPlan.summary.importDuplicateCount}`} />
          <SummaryTile label="Role checks" value={`${importPlan.summary.roleSafetyBlockedCount}`} />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-2">
            <Label htmlFor="workspace-member-import-csv">Import CSV</Label>
            <Textarea
              className="min-h-40 font-mono text-xs"
              disabled={!canManage || pending}
              id="workspace-member-import-csv"
              onChange={(event) => setCsvContent(event.target.value)}
              placeholder={sampleCsv}
              value={csvContent}
            />
          </div>

          <div className="grid gap-3 rounded-md border bg-background p-3">
            <div className="flex items-start gap-3">
              <Checkbox checked={allowAdminInvites} disabled={!canManage || pending} id="workspace-member-import-admin" onCheckedChange={(checked) => setAllowAdminInvites(Boolean(checked))} />
              <div className="grid gap-1">
                <Label htmlFor="workspace-member-import-admin">Allow admin rows</Label>
                <p className="text-xs text-muted-foreground">Admin imports stay blocked until this is checked. Owner rows are always blocked.</p>
              </div>
            </div>
            <Button disabled={!canManage || pending || importPlan.summary.inviteReadyCount === 0} onClick={() => void handleBulkImport()} type="button">
              {pending ? <Loader2 className="animate-spin" data-icon="inline-start" /> : <FileInput data-icon="inline-start" />}
              Create {importPlan.summary.inviteReadyCount} invite{importPlan.summary.inviteReadyCount === 1 ? "" : "s"}
            </Button>
            {lastImportPlan ? (
              <p className="text-xs text-muted-foreground">
                Last import planned {lastImportPlan.summary.totalRows} row{lastImportPlan.summary.totalRows === 1 ? "" : "s"} with {lastImportPlan.summary.inviteReadyCount} invite-ready.
              </p>
            ) : null}
          </div>
        </div>

        {visibleRows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={`${row.sourceLine}:${row.email}:${row.status}`}>
                  <TableCell>{row.sourceLine}</TableCell>
                  <TableCell className="max-w-[240px] truncate">{row.email || "Missing email"}</TableCell>
                  <TableCell>{row.normalizedRole ?? row.role}</TableCell>
                  <TableCell>
                    <Badge className="gap-1 rounded-md" variant={statusVariant(row.status)}>
                      <StatusIcon status={row.status} />
                      {row.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[360px] whitespace-normal text-xs text-muted-foreground">{row.reason}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : null}
      </CardContent>
    </Card>
  );
}
