import {
  getAdminLiveReviewSessionsMarkdown,
  getAdminLiveReviewSessionsReport,
} from "../src/features/admin/admin-live-review-sessions";

const report = getAdminLiveReviewSessionsReport({
  generatedAt: "2026-05-18T12:00:00.000Z",
  branchReviewInbox: {
    generatedAt: "2026-05-18T11:50:00.000Z",
    status: "blocked",
    score: 62,
    requestCount: 2,
    reviewerCount: 3,
    blockerCount: 3,
    evidenceCount: 4,
    commands: ["Export branch review inbox."],
    requests: [
      {
        id: "branch-review-checkout",
        status: "blocked",
        branchId: "branch-checkout",
        branchName: "checkout-release-candidate",
        branchFileId: "file-checkout",
        branchFileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        mergeIntent: "release-candidate",
        reviewers: ["Design Lead", "PM Reviewer"],
        reviewerEmails: ["lead@example.com", "pm@example.com"],
        reviewerSummary: "Design Lead, PM Reviewer",
        slaStatus: "overdue",
        dueDate: "2026-05-18",
        mergeReadiness: "blocked",
        openCommentCount: 2,
        mergeReviewCount: 1,
        latestMergeReviewAt: "2026-05-18T11:30:00.000Z",
        releaseEvidenceCount: 2,
        blockerCount: 3,
        blockers: [
          "Two unresolved checkout comments",
          "Publication approval is missing",
          "Public share still allows download",
        ],
        evidence: ["Merge review notes saved", "Rollback anchor exists"],
        recommendation: "Resolve comments and approval before release.",
        updatedAt: "2026-05-18T11:35:00.000Z",
      },
      {
        id: "branch-review-mobile",
        status: "ready",
        branchId: "branch-mobile",
        branchName: "mobile-settings-polish",
        branchFileId: "file-mobile",
        branchFileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        mergeIntent: "review",
        reviewers: ["Lee Reviewer"],
        reviewerEmails: ["lee@example.com"],
        reviewerSummary: "Lee Reviewer",
        slaStatus: "clear",
        dueDate: "2026-05-20",
        mergeReadiness: "ready",
        openCommentCount: 0,
        mergeReviewCount: 2,
        latestMergeReviewAt: "2026-05-18T11:40:00.000Z",
        releaseEvidenceCount: 3,
        blockerCount: 0,
        blockers: [],
        evidence: ["Minutes accepted", "Approval linked"],
        recommendation: "Ready for merge review.",
        updatedAt: "2026-05-18T11:45:00.000Z",
      },
    ],
  },
  commentReactionWorkflows: {
    generatedAt: "2026-05-18T11:51:00.000Z",
    status: "review",
    score: 82,
    commentCount: 3,
    openCommentCount: 2,
    acknowledgementCount: 1,
    unacknowledgedOpenCommentCount: 1,
    commands: ["Export comment reaction workflows."],
    comments: [
      {
        id: "comment-checkout-1",
        status: "review",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        pageName: "Checkout review",
        commentId: "comment-1",
        textPreview: "CTA alignment needs product confirmation.",
        resolved: false,
        assigneeEmail: "pm@example.com",
        reactionCount: 2,
        acknowledgementCount: 0,
        reactionNotificationCount: 1,
        failedNotificationCount: 0,
        moderationReviewCount: 0,
        latestAt: "2026-05-18T11:10:00.000Z",
        recommendation: "Ask the assignee to acknowledge the comment.",
      },
      {
        id: "comment-checkout-2",
        status: "ready",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        pageName: "Checkout review",
        commentId: "comment-2",
        textPreview: "Responsive copy reviewed.",
        resolved: false,
        assigneeEmail: "lead@example.com",
        reactionCount: 2,
        acknowledgementCount: 1,
        reactionNotificationCount: 2,
        failedNotificationCount: 0,
        moderationReviewCount: 0,
        latestAt: "2026-05-18T11:20:00.000Z",
        recommendation: "Ready for review minutes.",
      },
      {
        id: "comment-mobile-1",
        status: "ready",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        pageName: "Mobile review",
        commentId: "comment-mobile",
        textPreview: "Mobile copy approved.",
        resolved: true,
        assigneeEmail: "lee@example.com",
        reactionCount: 1,
        acknowledgementCount: 1,
        reactionNotificationCount: 1,
        failedNotificationCount: 0,
        moderationReviewCount: 0,
        latestAt: "2026-05-18T11:42:00.000Z",
        recommendation: "Ready.",
      },
    ],
  },
  scopedPublicationApprovals: {
    generatedAt: "2026-05-18T11:52:00.000Z",
    status: "review",
    score: 76,
    scopeCount: 2,
    approvedScopeCount: 1,
    missingApprovalCount: 1,
    staleApprovalCount: 0,
    commands: ["Export scoped publication approvals."],
    scopes: [
      {
        scopeKey: "growth/checkout",
        teamName: "Growth",
        projectName: "Checkout",
        status: "review",
        approvalState: "missing",
        reviewerSummary: "No reviewer",
        reviewerEmail: null,
        slaStatus: "unscheduled",
        slaDueAt: null,
        fileCount: 1,
        channelCount: 1,
        readyChannelCount: 0,
        blockedChannelCount: 0,
        rollbackAnchorCount: 1,
        branchRequestCount: 1,
        branchBlockerCount: 3,
        releaseEvidenceDiffCount: 2,
        latestActivityAt: "2026-05-18T11:35:00.000Z",
        latestDecision: null,
        evidence: ["Rollback anchor exists"],
        blockers: ["Approval missing"],
        recommendation: "Assign reviewer and capture approval minutes.",
      },
      {
        scopeKey: "product/mobile",
        teamName: "Product",
        projectName: "Mobile",
        status: "ready",
        approvalState: "approved",
        reviewerSummary: "Lee Reviewer",
        reviewerEmail: "lee@example.com",
        slaStatus: "clear",
        slaDueAt: "2026-05-20T10:00:00.000Z",
        fileCount: 1,
        channelCount: 1,
        readyChannelCount: 1,
        blockedChannelCount: 0,
        rollbackAnchorCount: 1,
        branchRequestCount: 1,
        branchBlockerCount: 0,
        releaseEvidenceDiffCount: 0,
        latestActivityAt: "2026-05-18T11:45:00.000Z",
        latestDecision: {
          id: "decision-mobile",
          scopeKey: "product/mobile",
          teamName: "Product",
          projectName: "Mobile",
          decision: "approved",
          reviewerName: "Lee Reviewer",
          reviewerEmail: "lee@example.com",
          note: "Approved for release.",
          channelCount: 1,
          blockerCount: 0,
          evidenceDiffCount: 0,
          rollbackAnchorCount: 1,
          slaDueAt: "2026-05-20T10:00:00.000Z",
          createdAt: "2026-05-18T11:45:00.000Z",
        },
        evidence: ["Approval linked"],
        blockers: [],
        recommendation: "Approval ready.",
      },
    ],
  },
  publicLinkObservability: {
    generatedAt: "2026-05-18T11:53:00.000Z",
    status: "blocked",
    score: 68,
    activeShareCount: 2,
    surfaceCount: 2,
    downloadExposureCount: 1,
    releaseSafeCount: 1,
    commands: ["Export public link observability."],
    surfaces: [
      {
        id: "surface-checkout",
        shareId: "share-checkout",
        token: "share-secret-token",
        kind: "prototype",
        status: "blocked",
        label: "Checkout prototype",
        fileId: "file-checkout",
        fileName: "Checkout live review",
        ownerEmail: "sam@example.com",
        targetUrl: "https://example.test/share/share-secret-token",
        routePath: "/share/share-secret-token",
        permissionPreset: "prototype",
        smokeStatus: "ready",
        smokeLabel: "Route smoke ready",
        expiryState: "never",
        stale: false,
        allowComments: true,
        allowDownload: true,
        referrerNote: null,
        releaseSafe: false,
        latestAt: "2026-05-18T11:25:00.000Z",
        blockerCount: 2,
        reviewCount: 1,
        blockers: ["Download exposure", "Missing referrer note"],
        warnings: ["No expiry"],
        recommendation: "Disable downloads and add referrer note.",
      },
      {
        id: "surface-mobile",
        shareId: "share-mobile",
        token: "mobile-token",
        kind: "handoff",
        status: "ready",
        label: "Mobile handoff",
        fileId: "file-mobile",
        fileName: "Mobile account settings",
        ownerEmail: "lee@example.com",
        targetUrl: "https://example.test/share/mobile-token",
        routePath: "/share/mobile-token",
        permissionPreset: "view",
        smokeStatus: "ready",
        smokeLabel: "Route smoke ready",
        expiryState: "scheduled",
        stale: false,
        allowComments: false,
        allowDownload: false,
        referrerNote: "Mobile launch review",
        releaseSafe: true,
        latestAt: "2026-05-18T11:45:00.000Z",
        blockerCount: 0,
        reviewCount: 0,
        blockers: [],
        warnings: [],
        recommendation: "Ready.",
      },
    ],
  },
});

assert(report.status === "blocked", "Live review sessions should block when agenda items have unresolved owners or unsafe shares.");
assert(report.sessionCount === 2, "Each active branch review request should become a live review session.");
assert(report.agendaItemCount >= 8, "Sessions should generate agendas from branches, comments, approvals, shares, and action items.");
assert(report.minutesItemCount >= 5, "Sessions should produce minutes from branch evidence, acknowledgements, approvals, and share state.");
assert(report.linkedBranchCount === 2, "Branch reviews should be linked.");
assert(report.linkedCommentCount === 3, "Comment review evidence should be linked.");
assert(report.linkedApprovalCount === 2, "Publication approval scopes should be linked.");
assert(report.linkedPublicShareCount === 2, "Public share surfaces should be linked.");
assert(report.actionItemCount >= 3, "Blockers should become action items.");
assert(report.missingOwnerCount >= 1, "Missing approval owners should be visible.");
assert(
  report.sessions.some(
    (session) =>
      session.fileId === "file-checkout" &&
      session.status === "blocked" &&
      session.publicShareCount === 1 &&
      session.openCommentCount === 2,
  ),
  "Checkout session should link branch, comments, approvals, and public share blockers.",
);
assert(
  report.actionItems.some(
    (item) =>
      item.sessionId.includes("file-checkout") &&
      item.status === "blocked" &&
      item.ownerRef !== "unassigned",
  ),
  "Blocked checkout action item should keep an owner reference.",
);
assert(
  report.rows.some((row) => row.category === "agenda"),
  "Agenda row should be present.",
);
assert(
  report.rows.some((row) => row.category === "minutes"),
  "Minutes row should be present.",
);
assert(
  report.commands.some((command) =>
    command.includes("admin:live-review-sessions-smoke"),
  ),
  "Targeted smoke command should be listed.",
);

const markdown = getAdminLiveReviewSessionsMarkdown(report);

assert(
  markdown.includes("Live Review Sessions"),
  "Markdown export should include a clear title.",
);
assert(markdown.includes("agenda"), "Markdown should include agenda evidence.");
assert(markdown.includes("minutes"), "Markdown should include minutes evidence.");
assert(markdown.includes("action items"), "Markdown should include action items.");
assert(!markdown.includes("sam@example.com"), "Markdown export should redact owner emails.");
assert(!markdown.includes("share-secret-token"), "Markdown export should redact share tokens.");

console.log(
  `Admin live review sessions smoke passed: ${report.sessionCount} sessions, ${report.actionItemCount} action items.`,
);

function assert(value: unknown, message: string) {
  if (!value) {
    throw new Error(message);
  }
}
