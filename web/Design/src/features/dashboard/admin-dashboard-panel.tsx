"use client";

import type { ColumnDef } from "@tanstack/react-table";
import {
  Activity,
  LibraryBig,
  MailCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useMemo } from "react";

import { DataTableColumnHeader } from "@/components/tablecn/data-table-column-header";
import { EssenceDataTable } from "@/components/tablecn/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminDashboardData,
  AdminDashboardEmail,
  AdminDashboardProject,
  AdminDashboardSession,
  AdminDashboardTemplate,
  AdminDashboardUser,
} from "@/db/admin-dashboard";
import {
  getAdminDashboardCopy,
  type AdminDashboardCopy,
} from "@/features/dashboard/admin-dashboard-localization";
import type { EditorLocale } from "@/features/editor/editor-localization";
import { OperationalHealthPanel } from "@/features/operations/operational-health-panel";
import {
  getMarketplaceStatusBadgeVariant,
  templateMarketplaceStatusLabels,
  templateMarketplaceStatuses,
} from "@/features/templates/template-marketplace";

type AdminDashboardPanelProps = {
  locale: EditorLocale;
  data: AdminDashboardData;
  updateTemplateMarketplaceAction: (formData: FormData) => void;
};

export function AdminDashboardPanel({
  locale,
  data,
  updateTemplateMarketplaceAction,
}: AdminDashboardPanelProps) {
  const copy = getAdminDashboardCopy(locale);
  const userColumns = useMemo<ColumnDef<AdminDashboardUser>[]>(
    () => [
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.email}
          />
        ),
      },
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.name}
          />
        ),
      },
      {
        accessorKey: "emailVerified",
        header: copy.columns.verified,
        cell: ({ row }) => (
          <Badge variant={row.original.emailVerified ? "secondary" : "outline"}>
            {row.original.emailVerified
              ? copy.status.verified
              : copy.status.pending}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.created}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt, copy.dateLocale),
      },
    ],
    [copy],
  );
  const emailColumns = useMemo<ColumnDef<AdminDashboardEmail>[]>(
    () => [
      {
        accessorKey: "recipient",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.recipient}
          />
        ),
      },
      {
        accessorKey: "purpose",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.purpose}
          />
        ),
      },
      {
        accessorKey: "deliveryStatus",
        header: copy.columns.status,
        cell: ({ row }) => (
          <Badge
            variant={
              row.original.deliveryStatus === "sent" ? "secondary" : "outline"
            }
          >
            {formatDeliveryStatus(row.original.deliveryStatus, copy)}
          </Badge>
        ),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.created}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt, copy.dateLocale),
      },
    ],
    [copy],
  );
  const projectColumns = useMemo<ColumnDef<AdminDashboardProject>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.project}
          />
        ),
      },
      {
        accessorKey: "width",
        header: copy.columns.size,
        cell: ({ row }) => `${row.original.width} x ${row.original.height}`,
      },
      {
        accessorKey: "starred",
        header: copy.columns.state,
        cell: ({ row }) => (
          <div className="flex gap-1">
            {row.original.starred ? <Badge>{copy.status.starred}</Badge> : null}
            {row.original.deleted ? (
              <Badge variant="outline">{copy.status.trash}</Badge>
            ) : (
              <Badge variant="secondary">{copy.status.active}</Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "updatedAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.updated}
          />
        ),
        cell: ({ row }) => formatDate(row.original.updatedAt, copy.dateLocale),
      },
    ],
    [copy],
  );
  const sessionColumns = useMemo<ColumnDef<AdminDashboardSession>[]>(
    () => [
      {
        accessorKey: "userId",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.user}
          />
        ),
        cell: ({ row }) => row.original.userId.slice(0, 10),
      },
      {
        accessorKey: "ipAddress",
        header: copy.columns.ip,
        cell: ({ row }) => row.original.ipAddress ?? copy.status.unknown,
      },
      {
        accessorKey: "expiresAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.expires}
          />
        ),
        cell: ({ row }) => formatDate(row.original.expiresAt, copy.dateLocale),
      },
      {
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label={copy.columns.created}
          />
        ),
        cell: ({ row }) => formatDate(row.original.createdAt, copy.dateLocale),
      },
    ],
    [copy],
  );
  const templateColumns = useMemo<ColumnDef<AdminDashboardTemplate>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            copy={copy.tableHeader}
            label="Template"
          />
        ),
        cell: ({ row }) => (
          <div className="min-w-48">
            <p className="truncate text-sm font-medium">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.width} x {row.original.height}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "marketplaceStatus",
        header: "Marketplace",
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            <Badge
              variant={getMarketplaceStatusBadgeVariant(
                row.original.marketplaceStatus,
              )}
            >
              {templateMarketplaceStatusLabels[row.original.marketplaceStatus]}
            </Badge>
            <Badge variant="outline">{row.original.approvalStatus}</Badge>
          </div>
        ),
      },
      {
        accessorKey: "marketplaceCollection",
        header: "Collection",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <p>{row.original.marketplaceCollection ?? "Unassigned"}</p>
            <p className="text-xs text-muted-foreground">
              {row.original.marketplaceSeason ?? "No season"}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "marketplaceUseCount",
        header: "Usage",
        cell: ({ row }) => (
          <div className="space-y-1 text-sm">
            <p>{row.original.marketplaceUseCount} uses</p>
            <p className="text-xs text-muted-foreground">
              {row.original.marketplaceViewCount} views
            </p>
          </div>
        ),
      },
      {
        id: "workflow",
        header: "Workflow",
        cell: ({ row }) => (
          <form
            action={updateTemplateMarketplaceAction}
            className="grid min-w-72 gap-2"
          >
            <input type="hidden" name="templateId" value={row.original.id} />
            <div className="grid gap-2 sm:grid-cols-[130px_1fr_1fr]">
              <Select
                name="marketplaceStatus"
                defaultValue={row.original.marketplaceStatus}
              >
                <SelectTrigger
                  className="h-9 w-full"
                  aria-label={`Marketplace status for ${row.original.name}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {templateMarketplaceStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {templateMarketplaceStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                name="marketplaceCollection"
                defaultValue={row.original.marketplaceCollection ?? ""}
                placeholder="Collection"
              />
              <Input
                name="marketplaceSeason"
                defaultValue={row.original.marketplaceSeason ?? ""}
                placeholder="Season"
              />
            </div>
            <div className="flex gap-2">
              <Input
                name="marketplaceReviewNote"
                defaultValue={row.original.marketplaceReviewNote}
                placeholder="Review note"
              />
              <Button type="submit" variant="outline" size="sm">
                Save
              </Button>
            </div>
          </form>
        ),
      },
    ],
    [copy.tableHeader, updateTemplateMarketplaceAction],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          {copy.title}
        </CardTitle>
        <CardDescription>{copy.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="users" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="health">
              <Activity className="h-4 w-4" />
              Health
            </TabsTrigger>
            <TabsTrigger value="users">
              <UserRound className="h-4 w-4" />
              {copy.tabs.users}
            </TabsTrigger>
            <TabsTrigger value="emails">
              <MailCheck className="h-4 w-4" />
              {copy.tabs.emails}
            </TabsTrigger>
            <TabsTrigger value="projects">{copy.tabs.projects}</TabsTrigger>
            <TabsTrigger value="templates">
              <LibraryBig className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="sessions">{copy.tabs.auth}</TabsTrigger>
          </TabsList>
          <TabsContent value="health">
            <OperationalHealthPanel health={data.health} />
          </TabsContent>
          <TabsContent value="users">
            <EssenceDataTable
              columns={userColumns}
              data={data.users}
              emptyLabel={copy.noResults}
              paginationCopy={copy.pagination}
              searchColumn="email"
              searchPlaceholder={copy.search.users}
            />
          </TabsContent>
          <TabsContent value="emails">
            <EssenceDataTable
              columns={emailColumns}
              data={data.emails}
              emptyLabel={copy.noResults}
              paginationCopy={copy.pagination}
              searchColumn="recipient"
              searchPlaceholder={copy.search.recipients}
            />
          </TabsContent>
          <TabsContent value="projects">
            <EssenceDataTable
              columns={projectColumns}
              data={data.projects}
              emptyLabel={copy.noResults}
              paginationCopy={copy.pagination}
              searchColumn="name"
              searchPlaceholder={copy.search.projects}
            />
          </TabsContent>
          <TabsContent value="templates">
            <EssenceDataTable
              columns={templateColumns}
              data={data.templates}
              emptyLabel={copy.noResults}
              paginationCopy={copy.pagination}
              searchColumn="name"
              searchPlaceholder="Search templates..."
            />
          </TabsContent>
          <TabsContent value="sessions">
            <EssenceDataTable
              columns={sessionColumns}
              data={data.sessions}
              emptyLabel={copy.noResults}
              paginationCopy={copy.pagination}
              searchColumn="userId"
              searchPlaceholder={copy.search.userIds}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDeliveryStatus(status: string, copy: AdminDashboardCopy) {
  if (status === "sent") {
    return copy.status.sent;
  }

  if (status === "failed") {
    return copy.status.failed;
  }

  return status;
}
