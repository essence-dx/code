import type { ReviewTaskSummary } from "@/db/project-comments";
import type {
  LayoutRepairPlan,
  RuleBasedLayoutProjectReport,
} from "@/features/creation/rule-based-layout-intelligence";
import type {
  TypographyProjectReport,
  TypographyRepairPacket,
} from "@/features/creation/professional-typography-system";
import type { ProjectSummary } from "@/features/editor/types";
import type { MediaBrandDeliveryKit } from "@/features/media-delivery/media-brand-delivery-kits";
import type { ProjectAuditSummary } from "@/features/projects/project-audit-center";
import type { ProjectHandoffPacket } from "@/features/projects/project-handoff-packet";
import type { VendorProductionHandoff } from "@/features/print-production/vendor-production-handoff";
import type {
  ProjectCoachingChecklist,
  ProjectCoachingChecklistItem,
  ProjectCoachingModeCenter,
  ProjectCoachingModeCenterInput,
  ProjectCoachingPacket,
  ProjectCoachingRecipe,
  ProjectCoachingRecipeCategory,
  ProjectCoachingSession,
  ProjectCoachingStatus,
  ProjectLearningDashboard,
  ProjectLearningTrack,
  ProjectReadinessCoachingCard,
} from "@/features/coaching/project-coaching-mode-types";

export type {
  ProjectCoachingChecklist,
  ProjectCoachingChecklistItem,
  ProjectCoachingChecklistItemStatus,
  ProjectCoachingModeCenter,
  ProjectCoachingModeCenterInput,
  ProjectCoachingPacket,
  ProjectCoachingRecipe,
  ProjectCoachingRecipeCategory,
  ProjectCoachingSession,
  ProjectCoachingStatus,
  ProjectLearningDashboard,
  ProjectLearningTrack,
  ProjectReadinessCoachingCard,
} from "@/features/coaching/project-coaching-mode-types";

export function createProjectCoachingModeCenter(
  input: ProjectCoachingModeCenterInput,
): ProjectCoachingModeCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const sessions = input.projects
    .filter((project) => !project.deletedAt)
    .map((project) =>
      createProjectCoachingSession({
        project,
        generatedAt,
        layoutReport:
          input.layoutIntelligence.projectReports.find(
            (report) => report.projectId === project.id,
          ) ?? null,
        layoutRepairPlans: input.layoutIntelligence.repairPlans.filter(
          (plan) => plan.projectId === project.id,
        ),
        typographyReport:
          input.typographySystem.projectReports.find(
            (report) => report.projectId === project.id,
          ) ?? null,
        typographyRepairPackets: input.typographySystem.repairPackets.filter(
          (packet) => packet.projectId === project.id,
        ),
        audit:
          input.projectAudits.find((audit) => audit.projectId === project.id) ??
          null,
        handoffPacket:
          input.projectHandoffPackets.find(
            (packet) => packet.projectId === project.id,
          ) ?? null,
        vendorHandoff:
          input.vendorProductionHandoff.handoffs.find(
            (handoff) => handoff.projectId === project.id,
          ) ?? null,
        mediaKit:
          input.mediaBrandDeliveryKitCenter.kits.find(
            (kit) => kit.projectId === project.id,
          ) ?? null,
        reviewTasks: input.reviewTasks.filter(
          (task) => task.projectId === project.id,
        ),
      }),
    )
    .sort(compareSessions)
    .slice(0, 12);
  const score = average(
    sessions.map((session) => session.score),
    100,
  );

  return {
    generatedAt,
    status: aggregateStatus(sessions.map((session) => session.status)),
    score,
    sessions,
    nextActions: createCenterNextActions(sessions),
    totals: {
      projects: sessions.length,
      coachingSessions: sessions.length,
      contextualRecipes: sessions.reduce(
        (total, session) => total + session.contextualRecipes.length,
        0,
      ),
      checklistItems: sessions.reduce(
        (total, session) => total + session.checklist.items.length,
        0,
      ),
      readinessCards: sessions.reduce(
        (total, session) => total + session.readinessCoaching.length,
        0,
      ),
      learningDashboards: sessions.length,
      readySessions: sessions.filter((session) => session.status === "ready")
        .length,
      reviewSessions: sessions.filter((session) => session.status === "review")
        .length,
      blockedSessions: sessions.filter(
        (session) => session.status === "blocked",
      ).length,
    },
  };
}

function createProjectCoachingSession(input: {
  project: ProjectSummary;
  generatedAt: string;
  layoutReport: RuleBasedLayoutProjectReport | null;
  layoutRepairPlans: LayoutRepairPlan[];
  typographyReport: TypographyProjectReport | null;
  typographyRepairPackets: TypographyRepairPacket[];
  audit: ProjectAuditSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
  vendorHandoff: VendorProductionHandoff | null;
  mediaKit: MediaBrandDeliveryKit | null;
  reviewTasks: ReviewTaskSummary[];
}): ProjectCoachingSession {
  const contextualRecipes = createContextualRecipes(input);
  const checklist = createChecklist(input);
  const readinessCoaching = createReadinessCoaching(input);
  const learningDashboard = createLearningDashboard(input);
  const score = createSessionScore({
    checklist,
    learningDashboard,
    readinessCoaching,
  });
  const status = createSessionStatus({
    score,
    checklist,
    readinessCoaching,
    project: input.project,
  });
  const nextAction = createSessionNextAction({
    project: input.project,
    status,
    contextualRecipes,
    checklist,
    readinessCoaching,
  });
  const coachingPacket = createCoachingPacket({
    project: input.project,
    status,
    generatedAt: input.generatedAt,
    contextualRecipes,
    checklist,
    readinessCoaching,
    learningDashboard,
    nextAction,
  });

  return {
    id: `project-coaching-${input.project.id}`,
    projectId: input.project.id,
    projectName: input.project.name,
    status,
    score,
    nextAction,
    contextualRecipes,
    checklist,
    readinessCoaching,
    learningDashboard,
    coachingPacket,
  };
}

function createContextualRecipes(input: {
  project: ProjectSummary;
  layoutReport: RuleBasedLayoutProjectReport | null;
  layoutRepairPlans: LayoutRepairPlan[];
  typographyReport: TypographyProjectReport | null;
  typographyRepairPackets: TypographyRepairPacket[];
  audit: ProjectAuditSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
  vendorHandoff: VendorProductionHandoff | null;
  mediaKit: MediaBrandDeliveryKit | null;
  reviewTasks: ReviewTaskSummary[];
}): ProjectCoachingRecipe[] {
  const recipes: ProjectCoachingRecipe[] = [];

  for (const plan of input.layoutRepairPlans) {
    recipes.push({
      id: `recipe-${plan.id}`,
      category: "layout",
      status: statusFromSignal(plan.status),
      title: plan.title,
      detail: `${plan.operations.length} layout repair operation${plan.operations.length === 1 ? "" : "s"} ready for review.`,
      estimatedMinutes: 8 + plan.operations.length * 3,
      steps: plan.operations.map((operation) => operation.description),
      sourceLabels: ["Layout intelligence", plan.fileName],
    });
  }

  if (
    input.layoutReport &&
    input.layoutReport.status !== "ready" &&
    !input.layoutRepairPlans.length
  ) {
    recipes.push(
      createRecipe({
        id: `recipe-layout-${input.project.id}`,
        category: "layout",
        status: statusFromSignal(input.layoutReport.status),
        title: "Tune layout hierarchy",
        detail: input.layoutReport.nextAction,
        estimatedMinutes: 12,
        steps: [
          "Check spacing around the main subject.",
          "Align repeated content edges.",
          "Rebalance content into the format safe area.",
        ],
        sourceLabels: ["Layout intelligence"],
      }),
    );
  }

  for (const packet of input.typographyRepairPackets) {
    recipes.push({
      id: `recipe-${packet.id}`,
      category: "typography",
      status: statusFromSignal(packet.status),
      title: packet.title,
      detail: `${packet.operations.length} typography operation${packet.operations.length === 1 ? "" : "s"} ready for text cleanup.`,
      estimatedMinutes: 6 + packet.operations.length * 2,
      steps: packet.operations.map((operation) => operation.description),
      sourceLabels: ["Typography system", packet.fileName],
    });
  }

  if (
    input.typographyReport &&
    input.typographyReport.status !== "ready" &&
    !input.typographyRepairPackets.length
  ) {
    recipes.push(
      createRecipe({
        id: `recipe-typography-${input.project.id}`,
        category: "typography",
        status: statusFromSignal(input.typographyReport.status),
        title: "Improve type readability",
        detail: input.typographyReport.nextAction,
        estimatedMinutes: 10,
        steps: [
          "Apply the brand type scale.",
          "Check small text and contrast.",
          "Review line-height and long-copy width.",
        ],
        sourceLabels: ["Typography system"],
      }),
    );
  }

  for (const dimension of input.audit?.dimensions ?? []) {
    if (dimension.status === "ready") continue;

    recipes.push(
      createRecipe({
        id: `recipe-audit-${input.project.id}-${dimension.id}`,
        category: "production",
        status: dimension.status === "fix" ? "blocked" : "review",
        title: `${dimension.label} coaching`,
        detail: dimension.detail,
        estimatedMinutes: dimension.status === "fix" ? 16 : 9,
        steps: [
          `Review the ${dimension.label.toLowerCase()} evidence.`,
          "Apply the highest-impact fix first.",
          "Re-run the readiness check before delivery.",
        ],
        sourceLabels: ["Project audit"],
      }),
    );
  }

  if (input.handoffPacket && input.handoffPacket.status !== "ready") {
    recipes.push(
      createRecipe({
        id: `recipe-handoff-${input.project.id}`,
        category: "production",
        status: input.handoffPacket.status,
        title: "Finish project handoff",
        detail: input.handoffPacket.nextAction,
        estimatedMinutes: 14,
        steps: input.handoffPacket.checklist.length
          ? input.handoffPacket.checklist.map((item) => item.detail)
          : [
              "Review export bundle status.",
              "Close stakeholder notes.",
              "Confirm approval history.",
            ],
        sourceLabels: ["Project handoff"],
      }),
    );
  }

  if (input.vendorHandoff && input.vendorHandoff.status !== "ready") {
    recipes.push(
      createRecipe({
        id: `recipe-vendor-${input.project.id}`,
        category: "print",
        status: input.vendorHandoff.status,
        title: "Prepare print vendor delivery",
        detail: input.vendorHandoff.nextAction,
        estimatedMinutes: 15,
        steps: [
          "Review dieline and proof sheet blockers.",
          "Confirm SKU/package metadata.",
          "Regenerate the vendor packet after export evidence is ready.",
        ],
        sourceLabels: ["Vendor production handoff"],
      }),
    );
  }

  if (input.mediaKit && input.mediaKit.status !== "ready") {
    recipes.push(
      createRecipe({
        id: `recipe-media-${input.project.id}`,
        category: "media",
        status: input.mediaKit.status,
        title: "Finish media delivery kit",
        detail: input.mediaKit.nextAction,
        estimatedMinutes: 15,
        steps: [
          "Review lower-third and bumper/outro presets.",
          "Fix timeline QA warnings.",
          "Regenerate the media delivery packet.",
        ],
        sourceLabels: ["Media brand delivery"],
      }),
    );
  }

  const openTasks = input.reviewTasks.filter(
    (task) => !task.resolved && task.taskStatus !== "done",
  );
  if (openTasks.length) {
    recipes.push(
      createRecipe({
        id: `recipe-review-${input.project.id}`,
        category: "review",
        status: "blocked",
        title: "Resolve review feedback",
        detail: `${openTasks.length} open review task${openTasks.length === 1 ? "" : "s"} need owner follow-up.`,
        estimatedMinutes: 8 + openTasks.length * 4,
        steps: openTasks.slice(0, 4).map((task) => task.body),
        sourceLabels: ["Review tasks"],
      }),
    );
  }

  if (!recipes.length) {
    recipes.push(
      createRecipe({
        id: `recipe-maintenance-${input.project.id}`,
        category: "maintenance",
        status: "ready",
        title: "Maintain production quality",
        detail:
          "This project is ready. Use this recipe before the next variant or export.",
        estimatedMinutes: 5,
        steps: [
          "Duplicate only from the approved version.",
          "Keep brand and layout checks green.",
          "Export a fresh handoff packet after changes.",
        ],
        sourceLabels: ["Project coaching"],
      }),
    );
  }

  return recipes.slice(0, 8);
}

function createChecklist(input: {
  project: ProjectSummary;
  layoutReport: RuleBasedLayoutProjectReport | null;
  typographyReport: TypographyProjectReport | null;
  audit: ProjectAuditSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
  vendorHandoff: VendorProductionHandoff | null;
  mediaKit: MediaBrandDeliveryKit | null;
  reviewTasks: ReviewTaskSummary[];
}): ProjectCoachingChecklist {
  const items: ProjectCoachingChecklistItem[] = [
    {
      id: "layout",
      label: "Layout",
      ...checklistStatus({
        status: statusFromSignal(input.layoutReport?.status ?? "review"),
        score: input.layoutReport?.score ?? 60,
        readyDetail: "Layout checks are ready.",
        reviewDetail:
          input.layoutReport?.nextAction ??
          "Run layout coaching for this design.",
      }),
    },
    {
      id: "typography",
      label: "Typography",
      ...checklistStatus({
        status: statusFromSignal(input.typographyReport?.status ?? "review"),
        score: input.typographyReport?.score ?? 60,
        readyDetail: "Typography checks are ready.",
        reviewDetail:
          input.typographyReport?.nextAction ??
          "Run typography coaching for this design.",
      }),
    },
    {
      id: "readiness",
      label: "Production readiness",
      ...checklistStatus({
        status: auditStatusToCoaching(input.audit?.status ?? "review"),
        score: input.audit?.overallScore ?? 60,
        readyDetail: "Project audit is ready.",
        reviewDetail: "Resolve audit dimensions before final delivery.",
      }),
    },
    {
      id: "delivery",
      label: "Delivery packet",
      ...checklistStatus({
        status: aggregateStatus([
          statusFromSignal(input.handoffPacket?.status ?? "review"),
          statusFromSignal(input.vendorHandoff?.status ?? "ready"),
          statusFromSignal(input.mediaKit?.status ?? "ready"),
        ]),
        score: average(
          [
            input.handoffPacket?.packetScore,
            input.vendorHandoff?.score,
            input.mediaKit?.score,
          ].filter((score): score is number => typeof score === "number"),
          60,
        ),
        readyDetail: "Delivery packets are ready.",
        reviewDetail: "Finish export, vendor, or media delivery packets.",
      }),
    },
    {
      id: "approval",
      label: "Approval",
      ...checklistStatus({
        status:
          input.project.approvalStatus === "approved"
            ? "ready"
            : input.project.approvalStatus === "changes-requested"
              ? "blocked"
              : "review",
        score: input.project.approvalStatus === "approved" ? 100 : 45,
        readyDetail: "Project is approved.",
        reviewDetail: "Move the project through approval before delivery.",
      }),
    },
    {
      id: "feedback",
      label: "Feedback",
      ...checklistStatus({
        status: getReviewTaskStatus(input.reviewTasks),
        score: reviewTaskScore(input.reviewTasks),
        readyDetail: "Open feedback is resolved.",
        reviewDetail: "Close open review tasks before final handoff.",
      }),
    },
  ];
  const progressPercent = Math.round(
    items.reduce((total, item) => total + item.progressPercent, 0) /
      items.length,
  );

  return {
    status: aggregateStatus(
      items.map((item) => itemStatusToCoaching(item.status)),
    ),
    progressPercent,
    completedItems: items.filter((item) => item.status === "done").length,
    totalItems: items.length,
    items,
  };
}

function createReadinessCoaching(input: {
  project: ProjectSummary;
  audit: ProjectAuditSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
  vendorHandoff: VendorProductionHandoff | null;
  mediaKit: MediaBrandDeliveryKit | null;
  reviewTasks: ReviewTaskSummary[];
}): ProjectReadinessCoachingCard[] {
  const auditCards =
    input.audit?.dimensions.map((dimension) => ({
      id: `coaching-audit-${input.project.id}-${dimension.id}`,
      dimension: dimension.label,
      status: auditStatusToCoaching(dimension.status),
      score: dimension.score,
      coachNote:
        dimension.status === "ready"
          ? `${dimension.label} is ready. Keep this green while editing.`
          : `${dimension.label} needs attention before production handoff.`,
      nextAction: dimension.detail,
      source: "audit" as const,
    })) ?? [];
  const deliveryCards: ProjectReadinessCoachingCard[] = [
    input.handoffPacket
      ? {
          id: `coaching-handoff-${input.project.id}`,
          dimension: "Project handoff",
          status: statusFromSignal(input.handoffPacket.status),
          score: input.handoffPacket.packetScore,
          coachNote:
            input.handoffPacket.status === "ready"
              ? "Final handoff evidence is ready."
              : "Handoff evidence still needs cleanup.",
          nextAction: input.handoffPacket.nextAction,
          source: "handoff",
        }
      : null,
    input.vendorHandoff
      ? {
          id: `coaching-vendor-${input.project.id}`,
          dimension: "Print vendor",
          status: statusFromSignal(input.vendorHandoff.status),
          score: input.vendorHandoff.score,
          coachNote:
            input.vendorHandoff.status === "ready"
              ? "Print vendor packet is ready."
              : "Print vendor handoff has blockers.",
          nextAction: input.vendorHandoff.nextAction,
          source: "vendor",
        }
      : null,
    input.mediaKit
      ? {
          id: `coaching-media-${input.project.id}`,
          dimension: "Media delivery",
          status: statusFromSignal(input.mediaKit.status),
          score: input.mediaKit.score,
          coachNote:
            input.mediaKit.status === "ready"
              ? "Media delivery kit is ready."
              : "Media delivery kit needs production cleanup.",
          nextAction: input.mediaKit.nextAction,
          source: "media",
        }
      : null,
  ].filter((card): card is ProjectReadinessCoachingCard => Boolean(card));
  const openTasks = input.reviewTasks.filter(
    (task) => !task.resolved && task.taskStatus !== "done",
  );

  if (openTasks.length) {
    deliveryCards.push({
      id: `coaching-review-${input.project.id}`,
      dimension: "Review feedback",
      status: "blocked",
      score: reviewTaskScore(input.reviewTasks),
      coachNote: `${openTasks.length} open review task${openTasks.length === 1 ? "" : "s"} need closure.`,
      nextAction: openTasks[0]?.body ?? "Resolve open review tasks.",
      source: "review",
    });
  }

  return [...auditCards, ...deliveryCards].slice(0, 8);
}

function createLearningDashboard(input: {
  project: ProjectSummary;
  layoutReport: RuleBasedLayoutProjectReport | null;
  typographyReport: TypographyProjectReport | null;
  audit: ProjectAuditSummary | null;
  handoffPacket: ProjectHandoffPacket | null;
  vendorHandoff: VendorProductionHandoff | null;
  mediaKit: MediaBrandDeliveryKit | null;
  reviewTasks: ReviewTaskSummary[];
}): ProjectLearningDashboard {
  const deliveryScore = average(
    [
      input.handoffPacket?.packetScore,
      input.vendorHandoff?.score,
      input.mediaKit?.score,
    ].filter((score): score is number => typeof score === "number"),
    100,
  );
  const tracks: ProjectLearningTrack[] = [
    createLearningTrack({
      id: "layout-craft",
      label: "Layout craft",
      score: input.layoutReport?.score ?? 60,
      status: statusFromSignal(input.layoutReport?.status ?? "review"),
      nextLesson: "Balance spacing, hierarchy, and safe-area rhythm.",
    }),
    createLearningTrack({
      id: "typography-system",
      label: "Typography system",
      score: input.typographyReport?.score ?? 60,
      status: statusFromSignal(input.typographyReport?.status ?? "review"),
      nextLesson: "Apply brand type scale and readable text hierarchy.",
    }),
    createLearningTrack({
      id: "production-readiness",
      label: "Production readiness",
      score: input.audit?.overallScore ?? 60,
      status: auditStatusToCoaching(input.audit?.status ?? "review"),
      nextLesson: "Clear audit dimensions before delivery.",
    }),
    createLearningTrack({
      id: "production-delivery",
      label: "Production delivery",
      score: deliveryScore,
      status: aggregateStatus([
        statusFromSignal(input.handoffPacket?.status ?? "review"),
        statusFromSignal(input.vendorHandoff?.status ?? "ready"),
        statusFromSignal(input.mediaKit?.status ?? "ready"),
      ]),
      nextLesson: "Package exports, packets, and approval evidence.",
    }),
    createLearningTrack({
      id: "review-collaboration",
      label: "Review collaboration",
      score: reviewTaskScore(input.reviewTasks),
      status: getReviewTaskStatus(input.reviewTasks),
      nextLesson: "Resolve comments and keep stakeholders aligned.",
    }),
  ];
  const progressPercent = Math.round(
    tracks.reduce((total, track) => total + track.progressPercent, 0) /
      tracks.length,
  );

  return {
    id: `learning-dashboard-${input.project.id}`,
    status: aggregateStatus(tracks.map((track) => track.status)),
    progressPercent,
    tracks,
  };
}

function createLearningTrack(input: {
  id: ProjectLearningTrack["id"];
  label: string;
  score: number;
  status: ProjectCoachingStatus;
  nextLesson: string;
}): ProjectLearningTrack {
  const progressPercent = clampPercent(input.score);
  const totalLessons = 4;
  const completedLessons = Math.min(
    totalLessons,
    Math.floor(progressPercent / 25),
  );

  return {
    id: input.id,
    label: input.label,
    status: input.status,
    progressPercent,
    completedLessons,
    totalLessons,
    nextLesson:
      input.status === "ready" ? "Keep this track green." : input.nextLesson,
  };
}

function createCoachingPacket(input: {
  project: ProjectSummary;
  status: ProjectCoachingStatus;
  generatedAt: string;
  contextualRecipes: ProjectCoachingRecipe[];
  checklist: ProjectCoachingChecklist;
  readinessCoaching: ProjectReadinessCoachingCard[];
  learningDashboard: ProjectLearningDashboard;
  nextAction: string;
}): ProjectCoachingPacket {
  const payload = {
    kind: "essence-studio.project-coaching-mode",
    projectId: input.project.id,
    projectName: input.project.name,
    generatedAt: input.generatedAt,
    status: input.status,
    nextAction: input.nextAction,
    contextualRecipes: input.contextualRecipes.length,
    checklistProgress: input.checklist.progressPercent,
    readinessCards: input.readinessCoaching.length,
    learningTracks: input.learningDashboard.tracks.length,
    recipes: input.contextualRecipes,
    checklist: input.checklist,
    readinessCoaching: input.readinessCoaching,
    learningDashboard: input.learningDashboard,
  };

  return {
    id: `coaching-packet-${input.project.id}`,
    title: `${input.project.name} coaching packet`,
    status: input.status,
    generatedAt: input.generatedAt,
    downloadJson: createJsonDataUrl(payload),
  };
}

function createSessionScore(input: {
  checklist: ProjectCoachingChecklist;
  learningDashboard: ProjectLearningDashboard;
  readinessCoaching: ProjectReadinessCoachingCard[];
}) {
  const readinessScore = average(
    input.readinessCoaching.map((card) => card.score),
    100,
  );

  return Math.round(
    input.checklist.progressPercent * 0.45 +
      input.learningDashboard.progressPercent * 0.25 +
      readinessScore * 0.3,
  );
}

function createSessionStatus(input: {
  score: number;
  checklist: ProjectCoachingChecklist;
  readinessCoaching: ProjectReadinessCoachingCard[];
  project: ProjectSummary;
}): ProjectCoachingStatus {
  if (
    input.project.approvalStatus === "changes-requested" ||
    input.checklist.status === "blocked" ||
    input.readinessCoaching.some((card) => card.status === "blocked")
  ) {
    return "blocked";
  }

  if (input.score >= 88 && input.checklist.progressPercent === 100) {
    return "ready";
  }

  return "review";
}

function createSessionNextAction(input: {
  project: ProjectSummary;
  status: ProjectCoachingStatus;
  contextualRecipes: ProjectCoachingRecipe[];
  checklist: ProjectCoachingChecklist;
  readinessCoaching: ProjectReadinessCoachingCard[];
}) {
  if (input.status === "ready") {
    return `${input.project.name} is ready. Keep the maintenance recipe handy before the next edit.`;
  }

  const blockedRecipe = input.contextualRecipes.find(
    (recipe) => recipe.status === "blocked",
  );
  if (blockedRecipe) {
    return `Resolve ${blockedRecipe.title.toLowerCase()} for ${input.project.name}.`;
  }

  const blockedCard = input.readinessCoaching.find(
    (card) => card.status === "blocked",
  );
  if (blockedCard) {
    return `Resolve ${blockedCard.dimension.toLowerCase()} before delivery for ${input.project.name}.`;
  }

  const activeChecklist = input.checklist.items.find(
    (item) => item.status !== "done",
  );

  return activeChecklist
    ? `${activeChecklist.detail} ${input.project.name}.`
    : `Review coaching recipes before final delivery for ${input.project.name}.`;
}

function checklistStatus(input: {
  status: ProjectCoachingStatus;
  score: number;
  readyDetail: string;
  reviewDetail: string;
}): Omit<ProjectCoachingChecklistItem, "id" | "label"> {
  if (input.status === "ready" && input.score >= 85) {
    return {
      status: "done",
      progressPercent: 100,
      detail: input.readyDetail,
    };
  }

  if (input.status === "blocked") {
    return {
      status: "blocked",
      progressPercent: Math.min(55, clampPercent(input.score)),
      detail: input.reviewDetail,
    };
  }

  return {
    status: "active",
    progressPercent: Math.min(84, clampPercent(input.score)),
    detail: input.reviewDetail,
  };
}

function createRecipe(input: {
  id: string;
  category: ProjectCoachingRecipeCategory;
  status: ProjectCoachingStatus;
  title: string;
  detail: string;
  estimatedMinutes: number;
  steps: string[];
  sourceLabels: string[];
}): ProjectCoachingRecipe {
  return input;
}

function getReviewTaskStatus(
  reviewTasks: ReviewTaskSummary[],
): ProjectCoachingStatus {
  const openTasks = reviewTasks.filter(
    (task) => !task.resolved && task.taskStatus !== "done",
  );

  if (!openTasks.length) return "ready";
  if (openTasks.some((task) => task.taskStatus === "todo")) return "blocked";

  return "review";
}

function reviewTaskScore(reviewTasks: ReviewTaskSummary[]) {
  if (!reviewTasks.length) return 100;
  const openTasks = reviewTasks.filter(
    (task) => !task.resolved && task.taskStatus !== "done",
  );

  return Math.round(
    ((reviewTasks.length - openTasks.length) / reviewTasks.length) * 100,
  );
}

function auditStatusToCoaching(
  status: ProjectAuditSummary["status"],
): ProjectCoachingStatus {
  if (status === "ready") return "ready";
  if (status === "fix") return "blocked";

  return "review";
}

function statusFromSignal(
  status: "ready" | "review" | "blocked",
): ProjectCoachingStatus {
  return status;
}

function itemStatusToCoaching(
  status: ProjectCoachingChecklistItem["status"],
): ProjectCoachingStatus {
  if (status === "done") return "ready";
  if (status === "blocked") return "blocked";

  return "review";
}

function aggregateStatus(
  statuses: ProjectCoachingStatus[],
): ProjectCoachingStatus {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function average(values: number[], fallback: number) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function compareSessions(
  left: ProjectCoachingSession,
  right: ProjectCoachingSession,
) {
  const statusDelta = statusRank(left.status) - statusRank(right.status);
  if (statusDelta !== 0) return statusDelta;

  return right.score - left.score;
}

function statusRank(status: ProjectCoachingStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function createCenterNextActions(sessions: ProjectCoachingSession[]) {
  const actions = sessions
    .filter((session) => session.status !== "ready")
    .map((session) => session.nextAction);

  if (actions.length) return actions.slice(0, 4);

  return sessions.length
    ? [
        "All project coaching sessions are ready; use maintenance recipes before future edits.",
      ]
    : ["Create a project to open the first coaching session."];
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function createJsonDataUrl(payload: unknown) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
}
