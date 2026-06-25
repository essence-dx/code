import {
  getAdminFileBrowserDepthMarkdown,
  getAdminFileBrowserDepthReport,
} from "../src/features/admin/admin-file-browser-depth";

const report = getAdminFileBrowserDepthReport({
  generatedAt: "2026-05-18T06:00:00.000Z",
  users: [
    {
      id: "owner-1",
      name: "Sam Owner",
      email: "sam@example.com",
      emailVerified: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      sessions: 1,
      files: 2,
      isCurrentUser: false,
    },
    {
      id: "editor-1",
      name: "Lee Editor",
      email: "lee@example.com",
      emailVerified: true,
      createdAt: "2026-05-02T00:00:00.000Z",
      sessions: 1,
      files: 0,
      isCurrentUser: false,
    },
  ],
  files: [
    {
      id: "file-1",
      name: "Checkout launch",
      ownerEmail: "sam@example.com",
      favorite: true,
      scope: "team",
      teamName: "Product",
      projectName: "Checkout",
      openCommentCount: 4,
      brokenPrototypeCount: 1,
      readyForDevCount: 2,
      prototypeHotspotCount: 6,
      collaboratorCount: 4,
      editorCount: 2,
      commenterCount: 1,
      viewerCount: 1,
      publicShareCount: 2,
      staleShareCount: 1,
      downloadShareCount: 1,
      reviewShareCount: 1,
      updatedAt: "2026-05-18T05:30:00.000Z",
      trashedAt: null,
    },
    {
      id: "file-2",
      name: "Private draft",
      ownerEmail: "lee@example.com",
      favorite: false,
      scope: "draft",
      teamName: "Personal",
      projectName: "Drafts",
      openCommentCount: 0,
      brokenPrototypeCount: 0,
      readyForDevCount: 0,
      prototypeHotspotCount: 0,
      collaboratorCount: 0,
      editorCount: 0,
      commenterCount: 0,
      viewerCount: 0,
      publicShareCount: 0,
      staleShareCount: 0,
      downloadShareCount: 0,
      reviewShareCount: 0,
      updatedAt: "2026-05-18T05:35:00.000Z",
      trashedAt: null,
    },
  ],
  collaborators: [
    {
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      userId: "editor-1",
      collaboratorEmail: "lee@example.com",
      collaboratorName: "Lee Editor",
      role: "editor",
      createdAt: "2026-05-15T00:00:00.000Z",
      updatedAt: "2026-05-18T04:00:00.000Z",
    },
  ],
  shares: [
    {
      id: "share-1",
      fileId: "file-1",
      fileName: "Checkout launch",
      ownerEmail: "sam@example.com",
      token: "secret-share-token",
      sharePath: "/share/secret-share-token",
      permissionPreset: "review",
      accessLevel: "viewer",
      allowComments: true,
      allowDownload: true,
      createdAt: "2026-05-17T21:00:00.000Z",
      expiresAt: null,
      disabledAt: null,
    },
  ],
  roleChangeApprovals: {
    generatedAt: "2026-05-18T05:45:00.000Z",
    pendingCount: 1,
    approvedCount: 0,
    rejectedCount: 0,
    requests: [
      {
        requestId: "request-1",
        requesterId: "owner-1",
        requesterEmail: "sam@example.com",
        fileId: "file-1",
        fileName: "Checkout launch",
        targetUserId: "editor-1",
        targetEmail: "lee@example.com",
        currentRole: "viewer",
        requestedRole: "editor",
        requesterNote: "Launch edits",
        reviewerEmail: null,
        reviewerNote: null,
        status: "pending",
        createdAt: "2026-05-18T05:40:00.000Z",
        decidedAt: null,
      },
    ],
  },
  auditEvents: [
    {
      id: "audit-1",
      actorEmail: "sam@example.com",
      action: "collaborator.role_change.request",
      targetType: "file",
      targetId: "file-1",
      targetLabel: "Checkout launch",
      metadata: { fileId: "file-1", targetEmail: "lee@example.com" },
      createdAt: "2026-05-18T05:40:00.000Z",
    },
    {
      id: "audit-2",
      actorEmail: "admin@example.com",
      action: "share.disable",
      targetType: "share",
      targetId: "share-1",
      targetLabel: "Checkout launch",
      metadata: { fileId: "file-1", token: "secret-share-token" },
      createdAt: "2026-05-18T05:50:00.000Z",
    },
  ],
});

assert(report.status === "blocked", "Unverified owner and risky access should block the report.");
assert(report.matrixCount === 2, "Team/project/draft scopes should produce two matrices.");
assert(report.permissionMatrices.some((matrix) => matrix.scope === "draft"), "Draft files should be represented.");
assert(report.ownerTransferQueue.length >= 1, "Owner transfer readiness queue should include risky ownership.");
assert(report.accessRequestQueue.length === 1, "Pending role-change request should appear in access queue.");
assert(report.auditBackedFileCount === 1, "File-level audit evidence should be counted.");
assert(
  report.commands.some((command) => command.includes("admin:file-browser-depth-smoke")),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminFileBrowserDepthMarkdown(report);

assert(
  markdown.includes("File Browser Depth"),
  "Markdown export should include a clear title.",
);
assert(
  markdown.includes("Product / Checkout / team"),
  "Markdown export should include permission matrix scope.",
);
assert(
  !markdown.includes("secret-share-token"),
  "Markdown export should not leak share tokens.",
);

console.log(
  `Admin file browser depth smoke passed: ${report.matrixCount} matrices, ${report.accessRequestQueue.length} requests.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
