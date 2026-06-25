import {
  filterAdminCommandCenterSearchRows,
  getAdminCommandCenterSearchMarkdown,
  getAdminCommandCenterSearchReport,
} from "../src/features/admin/admin-command-center-search";

const report = getAdminCommandCenterSearchReport({
  generatedAt: "2026-05-18T00:00:00.000Z",
  users: [
    {
      id: "user-1",
      name: "Samira Designer",
      email: "sam@example.com",
      emailVerified: false,
      createdAt: "2026-05-01T00:00:00.000Z",
      sessions: 2,
      files: 3,
      isCurrentUser: false,
    },
  ],
  files: [
    {
      id: "file-1",
      name: "Mobile checkout polish",
      ownerEmail: "sam@example.com",
      favorite: true,
      scope: "team",
      teamName: "Product",
      projectName: "Checkout",
      updatedAt: "2026-05-17T10:00:00.000Z",
      trashedAt: null,
      collaboratorCount: 4,
      editorCount: 2,
      publicShareCount: 1,
      staleShareCount: 1,
      readyForDevCount: 2,
      prototypeHotspotCount: 6,
      commenterCount: 1,
      viewerCount: 3,
      downloadShareCount: 1,
      reviewShareCount: 1,
      openCommentCount: 5,
      brokenPrototypeCount: 0,
    },
  ],
  shares: [
    {
      id: "share-1",
      fileId: "file-1",
      fileName: "Mobile checkout polish",
      ownerEmail: "sam@example.com",
      token: "public-token",
      sharePath: "/share/public-token",
      permissionPreset: "review",
      accessLevel: "viewer",
      allowComments: true,
      allowDownload: true,
      createdAt: "2026-05-17T11:00:00.000Z",
      expiresAt: null,
      disabledAt: null,
    },
  ],
  governanceReports: [
    {
      id: "dlp",
      source: "Data-loss prevention",
      category: "governance",
      status: "blocked",
      score: 72,
      summary: "Sensitive export and download exposure require review.",
      findings: [
        "2 blocked DLP rows",
        "4 sensitive metadata findings",
        "Download exposure is enabled on a public review share",
      ],
      latestAt: "2026-05-17T12:00:00.000Z",
      commands: ["Export data-loss prevention evidence."],
    },
  ],
  runbookCenter: {
    status: "review",
    score: 86,
    commandCount: 2,
    runbooks: [
      {
        id: "evidence-bundle",
        category: "evidence-bundle",
        status: "review",
        title: "Evidence bundle handoff",
        objective: "Collect DLP, sync diagnostics, and archive evidence.",
        cadence: "Before release",
        owner: "Release operator",
        rowCount: 1,
        commandCount: 1,
        blockedSignalCount: 0,
        reviewSignalCount: 1,
        evidenceBundle: "release-evidence-bundle",
        rows: [],
        commands: ["Export evidence bundle markdown."],
      },
    ],
    rows: [
      {
        id: "runbook-row",
        category: "evidence-bundle",
        status: "review",
        label: "Release evidence bundle",
        cadence: "Before release",
        owner: "Release operator",
        evidence: "DLP and sync diagnostics are ready for handoff.",
        command: "Export evidence bundle markdown.",
        latestAt: "2026-05-17T13:00:00.000Z",
      },
    ],
    commands: ["Export evidence bundle markdown."],
  },
});

assert(
  filterAdminCommandCenterSearchRows(report.rows, "dlp").some(
    (row) => row.source === "Data-loss prevention",
  ),
  "DLP governance report should be searchable by source.",
);

assert(
  filterAdminCommandCenterSearchRows(report.rows, "sam@example.com").some(
    (row) => row.category === "user",
  ),
  "User ownership should be searchable by email.",
);

assert(
  filterAdminCommandCenterSearchRows(report.rows, "release-evidence-bundle")
    .length >= 1,
  "Evidence bundle identifiers should be searchable.",
);

assert(
  report.blockedCount === 1 && report.reviewCount >= 2,
  "Status counts should include governance and runbook search rows.",
);

const markdown = getAdminCommandCenterSearchMarkdown(report);

assert(
  markdown.includes("release-evidence-bundle"),
  "Markdown export should include evidence bundle context.",
);

console.log(
  `Admin command center search smoke passed: ${report.rows.length} rows indexed.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
