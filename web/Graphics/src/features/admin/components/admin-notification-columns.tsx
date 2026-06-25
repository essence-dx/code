"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/tablecn/data-table-column-header";
import type { AdminNotificationDeliveryRow } from "@/features/admin/admin-data";

export function getNotificationColumns(
  formatDate: (value: string) => string,
): ColumnDef<AdminNotificationDeliveryRow>[] {
  return [
    {
      accessorKey: "fileName",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="File" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.fileName}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.ownerEmail}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "kind",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Event" />
      ),
      cell: ({ row }) => formatNotificationKind(row.original.kind),
    },
    {
      accessorKey: "recipientEmail",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Recipient" />
      ),
      cell: ({ row }) => (
        <div>
          <div>{row.original.recipientEmail}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.actorName} / {row.original.pageName}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Status" />
      ),
      cell: ({ row }) =>
        row.original.status === "sent" ? (
          <Badge variant="secondary">Sent</Badge>
        ) : (
          <div className="space-y-1">
            <Badge variant="destructive">Failed</Badge>
            {row.original.reason ? (
              <div className="max-w-60 text-xs text-muted-foreground">
                {row.original.reason}
              </div>
            ) : null}
          </div>
        ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} label="Time" />
      ),
      cell: ({ row }) => formatDate(row.original.createdAt),
    },
  ];
}

function formatNotificationKind(value: AdminNotificationDeliveryRow["kind"]) {
  const labels: Record<AdminNotificationDeliveryRow["kind"], string> = {
    "new-comment": "New comment",
    "new-reply": "New reply",
    assignment: "Assignment",
    mention: "Mention",
    reaction: "Reaction",
    acknowledgement: "Acknowledgement",
  };

  return labels[value];
}
