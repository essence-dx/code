import type { DesignTemplateSummary } from "@/features/editor/types";
import type {
  TemplateQualityFixItem,
  TemplateQualityFixPlan,
  TemplateQualityModerationRoute,
  TemplateQualityPacket,
  TemplateQualityProfile,
  TemplateQualityQaCenter,
  TemplateQualityQaDomain,
  TemplateQualityQaQueue,
  TemplateQualityQaStatus,
  TemplateQualityReadiness,
} from "@/features/templates/template-quality-qa-center-types";
import {
  combineStatus,
  formatNames,
  statusToPriority,
  uniqueStrings,
} from "@/features/templates/template-quality-qa-center-utils";

const queueLabels: Record<TemplateQualityQaQueue, string> = {
  "accessibility-localization": "Accessibility and localization",
  "marketplace-review": "Marketplace review",
  "creator-fixes": "Creator fixes",
  "moderator-escalation": "Moderator escalation",
};

export function createFixPlan(input: {
  template: DesignTemplateSummary;
  status: TemplateQualityQaStatus;
  score: number;
  readiness: TemplateQualityReadiness[];
}): TemplateQualityFixPlan {
  const items = input.readiness
    .filter((readiness) => readiness.status !== "ready")
    .map((readiness): TemplateQualityFixItem => {
      const priority = statusToPriority(readiness.status);

      return {
        id: `${input.template.id}-${readiness.id}-fix`,
        title: fixTitle(readiness.id),
        detail:
          readiness.signals[0] ??
          `Improve ${readiness.label.toLowerCase()} readiness before release.`,
        owner: readiness.id === "moderation" ? "moderator" : "creator",
        priority,
        href: `/templates/${input.template.id}`,
      };
    });

  return {
    templateId: input.template.id,
    templateName: input.template.name,
    status: input.status,
    score: input.score,
    summary: items.length
      ? `${items.length} creator-facing fix${items.length === 1 ? "" : "es"} before marketplace release.`
      : "No creator-facing fixes are open.",
    items,
  };
}

export function createModerationRoutes(
  profile: TemplateQualityProfile,
): TemplateQualityModerationRoute[] {
  const routes: TemplateQualityModerationRoute[] = [];
  const accessibilityLocalizationReadiness = [
    profile.readiness.accessibility,
    profile.readiness.localization,
  ].filter((readiness) => readiness.status !== "ready");

  if (accessibilityLocalizationReadiness.length) {
    routes.push(
      createModerationRoute({
        profile,
        queue: "accessibility-localization",
        status: combineStatus(accessibilityLocalizationReadiness),
        reason: accessibilityLocalizationReadiness
          .map((readiness) => readiness.label)
          .join(" and "),
        signals: accessibilityLocalizationReadiness.flatMap(
          (readiness) => readiness.signals,
        ),
      }),
    );
  }

  if (profile.readiness.marketplace.status !== "ready") {
    routes.push(
      createModerationRoute({
        profile,
        queue: "marketplace-review",
        status: profile.readiness.marketplace.status,
        reason: profile.readiness.marketplace.detail,
        signals: profile.readiness.marketplace.signals,
      }),
    );
  }

  if (profile.fixPlan.items.length) {
    routes.push(
      createModerationRoute({
        profile,
        queue: "creator-fixes",
        status: profile.fixPlan.status,
        reason: profile.fixPlan.summary,
        signals: profile.fixPlan.items.map((item) => item.title),
      }),
    );
  }

  if (profile.readiness.moderation.status !== "ready") {
    routes.push(
      createModerationRoute({
        profile,
        queue: "moderator-escalation",
        status: profile.readiness.moderation.status,
        reason: profile.readiness.moderation.detail,
        signals: profile.readiness.moderation.signals,
      }),
    );
  }

  return routes;
}

export function createQualityPacket(input: {
  generatedAt: string;
  status: TemplateQualityQaStatus;
  score: number;
  profiles: TemplateQualityProfile[];
  moderationRoutes: TemplateQualityModerationRoute[];
  creatorFixPlans: TemplateQualityFixPlan[];
  totals: TemplateQualityQaCenter["totals"];
}): TemplateQualityPacket {
  const payload = {
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    totals: input.totals,
    templates: input.profiles.map((profile) => ({
      templateId: profile.templateId,
      templateName: profile.templateName,
      status: profile.status,
      score: profile.score,
      readiness: profile.readiness,
      fixCount: profile.fixPlan.items.length,
    })),
    moderationRoutes: input.moderationRoutes,
    creatorFixPlans: input.creatorFixPlans.filter(
      (plan) => plan.items.length > 0,
    ),
  };

  return {
    fileName: `template-quality-qa-${input.generatedAt.slice(0, 10)}.json`,
    generatedAt: input.generatedAt,
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(payload, null, 2),
    )}`,
  };
}

export function createNextActions(input: {
  profiles: TemplateQualityProfile[];
  moderationRoutes: TemplateQualityModerationRoute[];
  creatorFixPlans: TemplateQualityFixPlan[];
}) {
  const actions: string[] = [];
  const blockedProfiles = input.profiles.filter(
    (profile) => profile.status === "blocked",
  );
  const creatorPlans = input.creatorFixPlans.filter(
    (plan) => plan.items.length > 0,
  );
  const marketplaceIssues = input.profiles.filter(
    (profile) => profile.readiness.marketplace.status !== "ready",
  );
  const localizationIssues = input.profiles.filter(
    (profile) =>
      profile.readiness.accessibility.status !== "ready" ||
      profile.readiness.localization.status !== "ready",
  );
  const escalations = input.moderationRoutes.filter(
    (route) => route.queue === "moderator-escalation",
  );

  if (blockedProfiles.length) {
    actions.push(
      `Clear blocked template QA before release: ${formatNames(blockedProfiles.map((profile) => profile.templateName))}.`,
    );
  }

  if (creatorPlans.length) {
    actions.push(
      `Send creator fix plans for ${formatNames(creatorPlans.map((plan) => plan.templateName))}.`,
    );
  }

  if (marketplaceIssues.length) {
    actions.push(
      `Complete marketplace listing gates for ${formatNames(marketplaceIssues.map((profile) => profile.templateName))}.`,
    );
  }

  if (localizationIssues.length) {
    actions.push(
      `Resolve accessibility or localization QA for ${formatNames(localizationIssues.map((profile) => profile.templateName))}.`,
    );
  }

  if (escalations.length) {
    actions.push(
      `Escalate overdue moderation routes for ${formatNames(escalations.map((route) => route.templateName))}.`,
    );
  }

  return uniqueStrings(actions).slice(0, 5);
}

function createModerationRoute(input: {
  profile: TemplateQualityProfile;
  queue: TemplateQualityQaQueue;
  status: TemplateQualityQaStatus;
  reason: string;
  signals: string[];
}): TemplateQualityModerationRoute {
  return {
    id: `${input.profile.templateId}-${input.queue}`,
    templateId: input.profile.templateId,
    templateName: input.profile.templateName,
    queue: input.queue,
    queueLabel: queueLabels[input.queue],
    status: input.status,
    priority: statusToPriority(input.status),
    reason: input.reason,
    openedAt: input.profile.updatedAt,
    href: input.profile.href,
    signals: uniqueStrings(input.signals).slice(0, 4),
  };
}

function fixTitle(domain: TemplateQualityQaDomain) {
  if (domain === "accessibility") return "Fix accessible template pages";
  if (domain === "localization") return "Resolve localization copy QA";
  if (domain === "marketplace") return "Complete marketplace listing gates";

  return "Close moderation review signals";
}
