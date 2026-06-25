import {
  getAdminWorkspaceCapacityForecastMarkdown,
  getAdminWorkspaceCapacityForecastReport,
} from "../src/features/admin/admin-workspace-capacity-forecast";

const report = getAdminWorkspaceCapacityForecastReport({
  generatedAt: "2026-05-18T03:00:00.000Z",
  files: [
    {
      id: "file-1",
      name: "Checkout release",
      ownerEmail: "sam@example.com",
      updatedAt: "2026-05-17T10:00:00.000Z",
      trashedAt: null,
      versionCount: 8,
      document: {
        version: 1,
        activePageId: "page-1",
        pages: [
          {
            id: "page-1",
            name: "Review",
            background: "#fff",
            layers: [{ id: "layer-1" }, { id: "layer-2" }],
            comments: [
              {
                id: "comment-1",
                text: "Check copy",
                replies: [{ id: "reply-1" }],
              },
            ],
          },
        ],
        variables: {},
        components: {},
        collaborationRoom: {
          version: 1,
          chatMessages: [{ id: "chat-1", createdAt: 1 }],
          presenceEvents: [{ id: "presence-1", createdAt: 2 }],
          updatedAt: "2026-05-17T12:00:00.000Z",
        },
        updatedAt: "2026-05-17T12:00:00.000Z",
      },
    },
    {
      id: "file-2",
      name: "Marketing draft",
      ownerEmail: "lee@example.com",
      updatedAt: "2026-05-16T10:00:00.000Z",
      trashedAt: null,
      versionCount: 1,
      document: {
        version: 1,
        activePageId: "page-2",
        pages: [
          {
            id: "page-2",
            name: "Draft",
            background: "#fff",
            layers: Array.from({ length: 20 }, (_, index) => ({
              id: `layer-${index}`,
            })),
            comments: [],
          },
        ],
        variables: {},
        components: {},
        updatedAt: "2026-05-16T12:00:00.000Z",
      },
    },
  ],
  database: {
    databaseKind: "remote-libsql",
    configured: true,
    authTokenRequired: true,
    authTokenConfigured: true,
    users: 5,
    sessions: 8,
    accounts: 5,
    activeFiles: 2,
    activeShares: 3,
    versions: 9,
  },
  publicRouteAnalytics: {
    storageAvailable: true,
    retentionDays: 30,
    routeCount: 4,
    eventCount: 120,
    last7dEventCount: 70,
    missingCoverageCount: 1,
  },
  realtimeHealth: {
    monitoredRoomCount: 1,
    offlineReplayQueueCount: 2,
    eventDriftCount: 1,
    pendingSaveSignalCount: 1,
  },
  workspaceOperations: {
    storageBudgetBytes: 12000,
    storageUsedBytes: 9000,
    storageUsedPercent: 75,
    activeFileCount: 2,
    versionCount: 9,
    databaseKind: "remote-libsql",
  },
});

assert(report.rowCount >= 7, "Forecast should include all capacity dimensions.");
assert(report.storageUsedPercent === 75, "Storage utilization should come from operations evidence.");
assert(
  report.projected90DayStorageBytes > report.storageUsedBytes,
  "Storage forecast should project future growth.",
);
assert(
  report.rows.some((row) => row.dimension === "route-analytics"),
  "Route analytics capacity must be represented.",
);
assert(
  report.rows.some((row) => row.dimension === "collaboration-rooms"),
  "Collaboration room capacity must be represented.",
);
assert(
  report.rows.some((row) => row.status === "review" || row.status === "blocked"),
  "Near-capacity signals should produce operator review rows.",
);

const markdown = getAdminWorkspaceCapacityForecastMarkdown(report);

assert(
  markdown.includes("Workspace Capacity Forecast"),
  "Markdown export should have a clear title.",
);
assert(
  markdown.includes("route-analytics"),
  "Markdown export should include route analytics details.",
);

console.log(
  `Admin workspace capacity forecast smoke passed: ${report.rowCount} rows, ${report.projected90DayStorageBytes} bytes projected.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
