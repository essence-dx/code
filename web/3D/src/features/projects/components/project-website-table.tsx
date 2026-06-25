"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type ColumnDef } from "@/components/tablecn/data-table";
import { DataTableColumnHeader } from "@/components/tablecn/data-table-column-header";

export interface DashboardWebsiteRow {
  id: string;
  name: string;
  owner: string;
  status: "Published" | "Draft";
  visibility: string;
  shareUrl: string | null;
  embedUrl: string | null;
  updatedAt: string;
}

const columns: ColumnDef<DashboardWebsiteRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Scene" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.name}</div>
        <div className="truncate text-xs text-muted-foreground">{row.original.owner}</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Status" />,
    cell: ({ row }) => <Badge variant={row.original.status === "Published" ? "default" : "secondary"}>{row.original.status}</Badge>,
  },
  {
    accessorKey: "visibility",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Visibility" />,
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Updated" />,
    cell: ({ row }) => new Intl.DateTimeFormat("en", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" }).format(new Date(row.original.updatedAt)),
  },
  {
    id: "actions",
    enableHiding: false,
    header: "Open",
    cell: ({ row }) =>
      row.original.shareUrl ? (
        <Button render={<Link href={row.original.shareUrl} target="_blank" />} size="sm" variant="outline">
          <ExternalLink className="size-4" />
          View
        </Button>
      ) : (
        <span className="text-xs text-muted-foreground">Private</span>
      ),
  },
];

export function ProjectWebsiteTable({ scenes }: { scenes: DashboardWebsiteRow[] }) {
  return <DataTable columns={columns} data={scenes} emptyLabel="No scenes found." searchPlaceholder="Search website scenes..." />;
}
