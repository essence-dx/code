"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { EyeOff, RotateCcw, ShieldAlert, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AdminReportRow = {
  adminNote: string;
  createdAt: string;
  details: string;
  id: string;
  reason: string;
  reporterEmail: string;
  reporterUserId: string | null;
  resolvedAt: string | null;
  status: "open" | "reviewing" | "actioned" | "dismissed";
  targetId: string;
  targetLabel: string;
  targetOwnerId: string | null;
  targetType: "song" | "profile" | "playlist" | "comment";
  updatedAt: string;
};

type ModerationReportTableProps = {
  onReportUpdated: (report: AdminReportRow) => void;
  reports: AdminReportRow[];
};

export function ModerationReportTable({
  onReportUpdated,
  reports,
}: ModerationReportTableProps) {
  const columns: ColumnDef<AdminReportRow>[] = [
    {
      accessorKey: "targetLabel",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Target" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.targetLabel}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.targetType} / {row.original.targetId}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "reason",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Reason" />
      ),
      cell: ({ row }) => (
        <div className="max-w-[280px]">
          <Badge variant="secondary">{row.original.reason}</Badge>
          {row.original.details ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
              {row.original.details}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => (
        <Badge className={statusClassName(row.original.status)}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-2">
          <ReportAction
            action="reviewing"
            icon={ShieldAlert}
            label="Review"
            report={row.original}
            onReportUpdated={onReportUpdated}
          />
          <ReportAction
            action="hide"
            icon={EyeOff}
            label="Hide"
            report={row.original}
            onReportUpdated={onReportUpdated}
          />
          <ReportAction
            action="restore"
            icon={RotateCcw}
            label="Restore"
            report={row.original}
            onReportUpdated={onReportUpdated}
          />
          <ReportAction
            action="dismiss"
            icon={ShieldCheck}
            label="Dismiss"
            report={row.original}
            onReportUpdated={onReportUpdated}
          />
        </div>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={reports}
      filterColumn="targetLabel"
      filterPlaceholder="Search reports"
    />
  );
}

function ReportAction({
  action,
  icon: Icon,
  label,
  onReportUpdated,
  report,
}: {
  action: "dismiss" | "hide" | "restore" | "reviewing";
  icon: typeof ShieldAlert;
  label: string;
  onReportUpdated: (report: AdminReportRow) => void;
  report: AdminReportRow;
}) {
  return (
    <Button
      size="sm"
      variant="secondary"
      className="gap-2"
      onClick={async () => {
        try {
          const payload = actionPayload(action);
          const response = await fetch(`/api/admin/reports/${report.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            throw new Error("Could not update report.");
          }

          const data = (await response.json()) as { report: AdminReportRow };
          onReportUpdated(data.report);
          toast.success("Report updated.");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Could not update report.",
          );
        }
      }}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

function actionPayload(action: "dismiss" | "hide" | "restore" | "reviewing") {
  if (action === "hide") {
    return {
      status: "actioned",
      targetAction: "hide",
    };
  }

  if (action === "restore") {
    return {
      status: "actioned",
      targetAction: "restore",
    };
  }

  if (action === "dismiss") {
    return {
      status: "dismissed",
      targetAction: "none",
    };
  }

  return {
    status: "reviewing",
    targetAction: "none",
  };
}

function statusClassName(status: AdminReportRow["status"]) {
  if (status === "open") {
    return "bg-amber-400/15 text-amber-100";
  }

  if (status === "actioned") {
    return "bg-emerald-400/15 text-emerald-200";
  }

  if (status === "dismissed") {
    return "bg-slate-400/15 text-slate-200";
  }

  return "bg-sky-400/15 text-sky-100";
}
