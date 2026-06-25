"use client";

import { Badge } from "@/components/ui/badge";
import { DataTable, type ColumnDef } from "@/components/tablecn/data-table";
import { DataTableColumnHeader } from "@/components/tablecn/data-table-column-header";

export interface DashboardUserRow {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: "Admin" | "User";
  projectCount: number;
  activeSessions: number;
  createdAt: string;
}

const columns: ColumnDef<DashboardUserRow, unknown>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} label="User" />,
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">{row.original.name}</div>
        <div className="truncate text-xs text-muted-foreground">{row.original.email}</div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Role" />,
    cell: ({ row }) => <Badge variant={row.original.role === "Admin" ? "default" : "secondary"}>{row.original.role}</Badge>,
  },
  {
    accessorKey: "emailVerified",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Email" />,
    cell: ({ row }) => <Badge variant={row.original.emailVerified ? "secondary" : "destructive"}>{row.original.emailVerified ? "Verified" : "Pending"}</Badge>,
  },
  {
    accessorKey: "projectCount",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Projects" />,
  },
  {
    accessorKey: "activeSessions",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Sessions" />,
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => <DataTableColumnHeader column={column} label="Joined" />,
    cell: ({ row }) => new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(row.original.createdAt)),
  },
];

export function ProjectAdminUsersTable({ users }: { users: DashboardUserRow[] }) {
  return <DataTable columns={columns} data={users} emptyLabel="No users found." searchPlaceholder="Search users..." />;
}
