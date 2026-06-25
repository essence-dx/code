"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Clock3,
  Database,
  FileStack,
  LayoutDashboard,
  Monitor,
  RefreshCw,
  ShieldCheck,
  UsersRound,
  Wrench,
} from "lucide-react"

import { AuthPanel } from "@/features/presentation/components/auth-panel"
import { AdminDecksTable } from "@/features/admin/components/admin-decks-table"
import { AdminSessionsTable } from "@/features/admin/components/admin-sessions-table"
import { AdminUsersTable } from "@/features/admin/components/admin-users-table"
import type {
  AdminDeckRow,
  AdminSessionRow,
  AdminSummary,
  AdminUserRow,
} from "@/features/admin/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type AdminUsersResponse = {
  users: AdminUserRow[]
}

type AdminDecksResponse = {
  decks: AdminDeckRow[]
}

type AdminSessionsResponse = {
  sessions: AdminSessionRow[]
}

const metricIcons = {
  users: UsersRound,
  verifiedUsers: BadgeCheck,
  activeSessions: ShieldCheck,
  decks: FileStack,
}

function operationBadgeVariant(status: string) {
  if (status === "blocked") return "destructive"
  if (status === "attention") return "secondary"

  return "outline"
}

export function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [decks, setDecks] = useState<AdminDeckRow[]>([])
  const [sessions, setSessions] = useState<AdminSessionRow[]>([])
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  async function loadDashboard() {
    setIsLoading(true)
    setError("")

    const [summaryResponse, usersResponse, decksResponse, sessionsResponse] =
      await Promise.all([
      fetch("/api/admin/summary"),
      fetch("/api/admin/users"),
      fetch("/api/admin/decks"),
      fetch("/api/admin/sessions"),
    ])

    if (
      !summaryResponse.ok ||
      !usersResponse.ok ||
      !decksResponse.ok ||
      !sessionsResponse.ok
    ) {
      setSummary(null)
      setUsers([])
      setDecks([])
      setSessions([])
      setError(
        summaryResponse.status === 401 || usersResponse.status === 401
          ? "Sign in with an admin account to open the dashboard."
          : "This account does not have dashboard access.",
      )
      setIsLoading(false)
      return
    }

    const summaryJson = (await summaryResponse.json()) as AdminSummary
    const usersJson = (await usersResponse.json()) as AdminUsersResponse
    const decksJson = (await decksResponse.json()) as AdminDecksResponse
    const sessionsJson =
      (await sessionsResponse.json()) as AdminSessionsResponse

    setSummary(summaryJson)
    setUsers(usersJson.users)
    setDecks(decksJson.decks)
    setSessions(sessionsJson.sessions)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadDashboard()
  }, [])

  const metrics = summary?.metrics
  const dataOperations = summary?.dataOperations
  const visibleOperations = dataOperations?.operations.slice(0, 5) ?? []

  return (
    <main className="min-h-screen bg-muted/30 text-foreground">
      <div className="grid min-h-screen lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="hidden border-r bg-background lg:block">
          <div className="flex h-14 items-center gap-2 border-b px-4">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <LayoutDashboard className="size-4" />
            </div>
            <div className="grid">
              <span className="text-sm font-semibold">Essence PowerPoint</span>
              <span className="text-xs text-muted-foreground">
                Workspace console
              </span>
            </div>
          </div>
          <nav className="grid gap-1 p-3 text-sm">
            {["Overview", "Users", "Decks", "Sessions", "Website"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="rounded-md px-3 py-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item}
              </a>
            ))}
          </nav>
        </aside>
        <section className="min-w-0">
          <header className="sticky top-0 z-10 flex min-h-14 flex-wrap items-center justify-between gap-3 border-b bg-background/95 px-4 py-2 backdrop-blur">
            <div className="min-w-0">
              <h1 className="truncate text-base font-semibold">
                Workspace dashboard
              </h1>
              <p className="text-xs text-muted-foreground">
                Accounts, access, and editor availability.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <AuthPanel />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void loadDashboard()}
              >
                <RefreshCw className="size-3.5" />
                Refresh
              </Button>
              <Button render={<Link href="/editor" />}>Open editor</Button>
            </div>
          </header>

          <div className="grid gap-4 p-4 lg:p-6">
            {error ? (
              <Card>
                <CardHeader>
                  <CardTitle>Admin access required</CardTitle>
                  <CardDescription>{error}</CardDescription>
                </CardHeader>
              </Card>
            ) : null}

            <Tabs defaultValue="overview" className="gap-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
                <TabsTrigger value="decks">Decks</TabsTrigger>
                <TabsTrigger value="sessions">Sessions</TabsTrigger>
                <TabsTrigger value="website">Website</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" id="overview" className="grid gap-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["users", "Users", metrics?.users ?? 0],
                    [
                      "verifiedUsers",
                      "Verified",
                      metrics?.verifiedUsers ?? 0,
                    ],
                    [
                      "activeSessions",
                      "Sessions",
                      metrics?.activeSessions ?? 0,
                    ],
                    ["decks", "Decks", metrics?.decks ?? 0],
                  ].map(([key, label, value]) => {
                    const Icon = metricIcons[key as keyof typeof metricIcons]

                    return (
                      <Card key={key}>
                        <CardHeader className="flex-row items-center justify-between space-y-0">
                          <CardTitle>{label}</CardTitle>
                          <Icon className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-semibold">{value}</div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Auth health</CardTitle>
                    <CardDescription>
                      Email verification and admin access state.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-[14rem_minmax(0,1fr)]">
                    <div className="grid gap-2">
                      <div className="text-4xl font-semibold">
                        {metrics?.verificationRate ?? 0}%
                      </div>
                      <span className="text-sm text-muted-foreground">
                        verified accounts
                      </span>
                      <Badge variant="secondary">
                        {metrics?.admins ?? 0} admin account
                        {metrics?.admins === 1 ? "" : "s"}
                      </Badge>
                    </div>
                    <div className="grid gap-2">
                      {summary?.recentUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                        >
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium">
                              {user.name || user.email}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">
                              {user.email}
                            </div>
                          </div>
                          <Badge
                            variant={user.emailVerified ? "secondary" : "outline"}
                          >
                            {user.emailVerified ? "Verified" : "Pending"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Production data operations</CardTitle>
                        <CardDescription>
                          Admin, deck, share, fixture, and asset remediation.
                        </CardDescription>
                      </div>
                      <Badge
                        variant={operationBadgeVariant(
                          dataOperations?.status ?? "attention",
                        )}
                      >
                        <Database className="size-3" />
                        {dataOperations?.readyCount ?? 0}/
                        {dataOperations?.totalCount ?? 0}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="grid gap-2">
                    {visibleOperations.length ? (
                      visibleOperations.map((operation) => (
                        <div
                          key={operation.id}
                          className="grid gap-2 rounded-md border bg-background px-3 py-2 md:grid-cols-[minmax(0,1fr)_auto]"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">
                                {operation.label}
                              </span>
                              <Badge
                                variant={operationBadgeVariant(
                                  operation.status,
                                )}
                              >
                                {operation.status}
                              </Badge>
                              {operation.ownerVisible ? (
                                <Badge variant="outline">Owner visible</Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {operation.remediation}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Wrench className="size-3" />
                            {operation.affectedCount} affected
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                        Data operations load after admin access is confirmed.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="users" id="users">
                <Card>
                  <CardHeader>
                    <CardTitle>User management</CardTitle>
                    <CardDescription>
                      Verify accounts, adjust roles, and disable access.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-36 rounded-md bg-muted" />
                    ) : (
                      <AdminUsersTable
                        users={users}
                        currentUserId={summary?.currentUser.id}
                        onRefresh={loadDashboard}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="decks" id="decks">
                <Card>
                  <CardHeader>
                    <CardTitle>Deck management</CardTitle>
                    <CardDescription>
                      Review saved decks, ownership, slide counts, and stale content.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-36 rounded-md bg-muted" />
                    ) : (
                      <AdminDecksTable
                        decks={decks}
                        onRefresh={loadDashboard}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="sessions" id="sessions">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Session management</CardTitle>
                        <CardDescription>
                          Review active sessions and revoke stale access.
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        <Clock3 className="size-3" />
                        {sessions.length} total
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="h-36 rounded-md bg-muted" />
                    ) : (
                      <AdminSessionsTable
                        sessions={sessions}
                        onRefresh={loadDashboard}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="website" id="website">
                <Card>
                  <CardHeader>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <CardTitle>Website view</CardTitle>
                        <CardDescription>
                          The live editor surface remains available as a full app.
                        </CardDescription>
                      </div>
                      <Button render={<Link href="/editor" />}>
                        <Monitor className="size-4" />
                        Open
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-hidden rounded-md border bg-background">
                      <iframe
                        title="Essence PowerPoint editor preview"
                        src="/editor"
                        className="h-[70vh] w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </div>
    </main>
  )
}
