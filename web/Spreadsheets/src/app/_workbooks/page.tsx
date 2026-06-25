import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import type { DashboardData } from "@/features/dashboard/dashboard-service";
import {
  createEmbeddedWorkbook,
  embeddedWorkbookUser,
} from "@/features/workbooks/embedded-workbook";

export default async function WorkbooksPage() {
  const workbook = createEmbeddedWorkbook();
  const currentUser = {
    id: "dx-local-user",
    name: embeddedWorkbookUser.name,
    email: embeddedWorkbookUser.email,
    emailVerified: true,
  };
  const dashboard: DashboardData = {
    isAdmin: false,
    adminEmail: embeddedWorkbookUser.email,
    stats: {
      users: 1,
      verifiedUsers: 1,
      activeSessions: 1,
      workbooks: 1,
      auditEvents: 0,
    },
    users: [
      {
        ...currentUser,
        activeSessions: 1,
        workbookCount: 1,
        createdAt: workbook.createdAt.toISOString(),
      },
    ],
    workbooks: [
      {
        id: workbook.id,
        name: workbook.name,
        ownerEmail: workbook.ownerEmail,
        folderName: workbook.folderName,
        isFavorite: workbook.isFavorite,
        isTemplate: workbook.isTemplate,
        lastOpenedAt: workbook.lastOpenedAt?.toISOString() ?? null,
        updatedAt: workbook.updatedAt.toISOString(),
      },
    ],
    settings: [
      {
        label: "Embedded preview",
        value: "Local",
        status: "ready",
      },
    ],
    auditLogs: [],
  };

  return (
    <DashboardShell
      currentUser={currentUser}
      dashboard={dashboard}
      workbooks={[workbook]}
    />
  );
}
