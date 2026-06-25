"use client";

import * as React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { TablecnColumn } from "@/components/tablecn/data-table";
import type { AuditLogRow } from "@/features/audit/audit-log-service";
import type {
  DashboardSettingRow,
  DashboardUserRow,
  DashboardWorkbookRow,
} from "@/features/dashboard/dashboard-service";
import { formatDateTime } from "@/features/dashboard/components/dashboard-format";
import { StatusBadge } from "@/features/dashboard/components/status-badge";
import { UserActions } from "@/features/dashboard/components/user-actions";

export function useDashboardColumns({
  currentUserId,
  isAdmin,
}: {
  currentUserId: string;
  isAdmin: boolean;
}) {
  const workbookColumns = React.useMemo<TablecnColumn<DashboardWorkbookRow>[]>(
    () => [
      {
        id: "name",
        header: "Workbook",
        accessor: (row) => row.name,
        filterValue: (row) => `${row.name} ${row.ownerEmail} ${row.folderName}`,
        cell: (row) => (
          <Link href={`/workbooks/${row.id}`} className="font-medium hover:underline">
            {row.name}
          </Link>
        ),
      },
      {
        id: "owner",
        header: "Owner",
        accessor: (row) => row.ownerEmail,
        filterValue: (row) => row.ownerEmail,
      },
      {
        id: "folder",
        header: "Folder",
        accessor: (row) => row.folderName || "No folder",
        filterValue: (row) => row.folderName,
      },
      {
        id: "state",
        header: "State",
        accessor: (row) =>
          [row.isFavorite ? "Favorite" : "", row.isTemplate ? "Template" : ""]
            .filter(Boolean)
            .join(", ") || "Workbook",
        filterValue: (row) =>
          [row.isFavorite ? "favorite" : "", row.isTemplate ? "template" : "workbook"]
            .filter(Boolean)
            .join(" "),
        cell: (row) => (
          <div className="flex flex-wrap gap-1.5">
            {row.isFavorite ? <Badge variant="secondary">Favorite</Badge> : null}
            {row.isTemplate ? <Badge variant="secondary">Template</Badge> : null}
            {!row.isFavorite && !row.isTemplate ? <Badge variant="outline">Workbook</Badge> : null}
          </div>
        ),
        sortable: false,
      },
      {
        id: "updated",
        header: "Updated",
        accessor: (row) => formatDateTime(row.updatedAt),
        filterValue: (row) => formatDateTime(row.updatedAt),
        sortValue: (row) => row.updatedAt,
      },
    ],
    [],
  );

  const userColumns = React.useMemo<TablecnColumn<DashboardUserRow>[]>(
    () => [
      {
        id: "user",
        header: "User",
        accessor: (row) => `${row.name} ${row.email}`,
        filterValue: (row) => `${row.name} ${row.email}`,
        cell: (row) => (
          <div>
            <div className="font-medium">{row.name}</div>
            <div className="text-xs text-muted-foreground">{row.email}</div>
          </div>
        ),
      },
      {
        id: "verified",
        header: "Email",
        accessor: (row) => (row.emailVerified ? "Verified" : "Unverified"),
        filterValue: (row) => (row.emailVerified ? "verified" : "unverified"),
        cell: (row) => (
          <StatusBadge
            active={row.emailVerified}
            activeLabel="Verified"
            inactiveLabel="Unverified"
          />
        ),
      },
      {
        id: "workbooks",
        header: "Workbooks",
        accessor: (row) => row.workbookCount,
        sortValue: (row) => row.workbookCount,
      },
      {
        id: "sessions",
        header: "Sessions",
        accessor: (row) => row.activeSessions,
        sortValue: (row) => row.activeSessions,
      },
      {
        id: "created",
        header: "Created",
        accessor: (row) => formatDateTime(row.createdAt),
        sortValue: (row) => row.createdAt,
      },
      {
        id: "actions",
        header: "Actions",
        accessor: () => "",
        cell: (row) =>
          isAdmin ? <UserActions row={row} currentUserId={currentUserId} /> : "View only",
        className: "text-right",
        sortable: false,
      },
    ],
    [currentUserId, isAdmin],
  );

  const settingColumns = React.useMemo<TablecnColumn<DashboardSettingRow>[]>(
    () => [
      {
        id: "setting",
        header: "Setting",
        accessor: (row) => row.label,
        filterValue: (row) => `${row.label} ${row.value}`,
      },
      {
        id: "value",
        header: "Value",
        accessor: (row) => row.value,
        filterValue: (row) => row.value,
      },
      {
        id: "status",
        header: "Status",
        accessor: (row) => row.status,
        filterValue: (row) => row.status,
        cell: (row) => (
          <StatusBadge
            active={row.status === "ready"}
            activeLabel="Ready"
            inactiveLabel="Needs setup"
          />
        ),
      },
    ],
    [],
  );

  const auditColumns = React.useMemo<TablecnColumn<AuditLogRow>[]>(
    () => [
      {
        id: "event",
        header: "Event",
        accessor: (row) => `${row.summary} ${row.action}`,
        filterValue: (row) =>
          `${row.summary} ${row.action} ${row.category} ${row.actorEmail}`,
        cell: (row) => (
          <div>
            <div className="font-medium">{row.summary}</div>
            <div className="font-mono text-xs text-muted-foreground">
              {row.action}
            </div>
          </div>
        ),
      },
      {
        id: "category",
        header: "Category",
        accessor: (row) => row.category,
        filterValue: (row) => row.category,
        cell: (row) => <Badge variant="secondary">{row.category}</Badge>,
      },
      {
        id: "actor",
        header: "Actor",
        accessor: (row) => row.actorEmail,
        filterValue: (row) => row.actorEmail,
      },
      {
        id: "target",
        header: "Target",
        accessor: (row) =>
          row.targetWorkbookId ?? row.targetUserId ?? "Workspace",
        filterValue: (row) =>
          `${row.targetWorkbookId ?? ""} ${row.targetUserId ?? ""}`,
        cell: (row) => (
          <span className="font-mono text-xs">
            {row.targetWorkbookId ?? row.targetUserId ?? "workspace"}
          </span>
        ),
      },
      {
        id: "created",
        header: "Created",
        accessor: (row) => formatDateTime(row.createdAt),
        sortValue: (row) => row.createdAt,
      },
    ],
    [],
  );

  return { auditColumns, workbookColumns, userColumns, settingColumns };
}
