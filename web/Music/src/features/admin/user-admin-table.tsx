"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type AdminUserRow = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  sessions: number;
};

type UserAdminTableProps = {
  users: AdminUserRow[];
  onUserUpdated: (user: AdminUserRow) => void;
};

export function UserAdminTable({ users, onUserUpdated }: UserAdminTableProps) {
  const columns: ColumnDef<AdminUserRow>[] = [
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="User" />
      ),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {row.original.email}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "emailVerified",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={
            row.original.emailVerified
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-400/15 text-amber-100"
          }
        >
          {row.original.emailVerified ? (
            <CheckCircle2 className="mr-1 size-3" />
          ) : (
            <XCircle className="mr-1 size-3" />
          )}
          {row.original.emailVerified ? "verified" : "pending"}
        </Badge>
      ),
    },
    {
      accessorKey: "sessions",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Sessions" />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.sessions}
        </span>
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
        <Button
          size="sm"
          variant="secondary"
          className="gap-2"
          onClick={async () => {
            try {
              const nextVerified = !row.original.emailVerified;
              const response = await fetch(`/api/admin/users/${row.original.id}`, {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ emailVerified: nextVerified }),
              });

              if (!response.ok) {
                throw new Error("Could not update user.");
              }

              const payload = (await response.json()) as { user: AdminUserRow };
              onUserUpdated({
                ...row.original,
                ...payload.user,
                sessions: row.original.sessions,
              });
              toast.success(
                nextVerified ? "User marked verified." : "User marked pending.",
              );
            } catch (error) {
              toast.error(
                error instanceof Error ? error.message : "Could not update user.",
              );
            }
          }}
        >
          <ShieldCheck className="size-4" />
          {row.original.emailVerified ? "Mark pending" : "Verify"}
        </Button>
      ),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      filterColumn="email"
      filterPlaceholder="Search users"
    />
  );
}
