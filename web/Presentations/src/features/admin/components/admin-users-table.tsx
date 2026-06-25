"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Shield, ShieldOff, UserCheck } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { AdminUserRow } from "@/features/admin/types"

type AdminUsersTableProps = {
  users: AdminUserRow[]
  currentUserId?: string
  onRefresh: () => void
}

export function AdminUsersTable({
  users,
  currentUserId,
  onRefresh,
}: AdminUsersTableProps) {
  const [query, setQuery] = useState("")
  const [busyUserId, setBusyUserId] = useState<string | null>(null)
  const filteredUsers = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return users

    return users.filter(
      (user) =>
        user.email.toLowerCase().includes(normalized) ||
        user.name.toLowerCase().includes(normalized) ||
        user.role.toLowerCase().includes(normalized),
    )
  }, [query, users])

  async function patchUser(userId: string, patch: Record<string, unknown>) {
    setBusyUserId(userId)
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, ...patch }),
    })
    setBusyUserId(null)
    onRefresh()
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="h-8 max-w-sm"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search users"
        />
        <Badge variant="outline">{filteredUsers.length} accounts</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredUsers.map((user) => {
            const isCurrentUser = user.id === currentUserId
            const isBusy = busyUserId === user.id

            return (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="grid gap-0.5">
                    <span className="font-medium">{user.name || "No name"}</span>
                    <span className="text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge
                      variant={user.emailVerified ? "secondary" : "outline"}
                    >
                      {user.emailVerified ? "Verified" : "Pending"}
                    </Badge>
                    {user.banned ? (
                      <Badge variant="destructive">Disabled</Badge>
                    ) : (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === "admin" ? "default" : "outline"}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  {new Intl.DateTimeFormat(undefined, {
                    dateStyle: "medium",
                  }).format(new Date(user.createdAt))}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Mark verified"
                      aria-label="Mark verified"
                      disabled={isBusy || user.emailVerified}
                      onClick={() =>
                        void patchUser(user.id, { emailVerified: true })
                      }
                    >
                      <CheckCircle2 className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title={user.role === "admin" ? "Make user" : "Make admin"}
                      aria-label={
                        user.role === "admin" ? "Make user" : "Make admin"
                      }
                      disabled={isBusy || (isCurrentUser && user.role === "admin")}
                      onClick={() =>
                        void patchUser(user.id, {
                          role: user.role === "admin" ? "user" : "admin",
                        })
                      }
                    >
                      {user.role === "admin" ? (
                        <UserCheck className="size-4" />
                      ) : (
                        <Shield className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant={user.banned ? "secondary" : "ghost"}
                      size="icon-sm"
                      title={user.banned ? "Enable account" : "Disable account"}
                      aria-label={
                        user.banned ? "Enable account" : "Disable account"
                      }
                      disabled={isBusy || isCurrentUser}
                      onClick={() =>
                        void patchUser(user.id, { banned: !user.banned })
                      }
                    >
                      <ShieldOff className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
