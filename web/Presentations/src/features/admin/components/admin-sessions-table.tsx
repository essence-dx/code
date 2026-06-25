"use client"

import { useMemo, useState } from "react"
import { LogOut } from "lucide-react"

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
import type { AdminSessionRow } from "@/features/admin/types"

type AdminSessionsTableProps = {
  sessions: AdminSessionRow[]
  onRefresh: () => void
}

export function AdminSessionsTable({
  sessions,
  onRefresh,
}: AdminSessionsTableProps) {
  const [query, setQuery] = useState("")
  const [busySessionId, setBusySessionId] = useState<string | null>(null)
  const filteredSessions = useMemo(() => {
    const normalized = query.trim().toLowerCase()

    if (!normalized) return sessions

    return sessions.filter(
      (session) =>
        session.userEmail?.toLowerCase().includes(normalized) ||
        session.userName?.toLowerCase().includes(normalized) ||
        session.ipAddress?.toLowerCase().includes(normalized),
    )
  }, [query, sessions])

  async function revokeSession(sessionId: string) {
    setBusySessionId(sessionId)
    await fetch("/api/admin/sessions", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId }),
    })
    setBusySessionId(null)
    onRefresh()
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          className="h-8 max-w-sm"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search sessions"
        />
        <Badge variant="outline">{filteredSessions.length} sessions</Badge>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>Updated</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredSessions.map((session) => (
            <TableRow key={session.id}>
              <TableCell>
                <div className="grid gap-0.5">
                  <span className="font-medium">
                    {session.userName || "Unknown user"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {session.userEmail || session.userId}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="grid max-w-64 gap-0.5">
                  <span className="truncate">
                    {session.ipAddress || "No IP recorded"}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {session.userAgent || "No user agent"}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(new Date(session.updatedAt))}
              </TableCell>
              <TableCell>
                {new Intl.DateTimeFormat(undefined, {
                  dateStyle: "medium",
                }).format(new Date(session.expiresAt))}
              </TableCell>
              <TableCell>
                <div className="flex justify-end gap-1">
                  {session.isCurrent ? (
                    <Badge variant="secondary">Current</Badge>
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      title="Revoke session"
                      aria-label="Revoke session"
                      disabled={busySessionId === session.id}
                      onClick={() => void revokeSession(session.id)}
                    >
                      <LogOut className="size-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
