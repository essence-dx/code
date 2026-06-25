import type { MarketplaceDiscoveryTemplate } from "@/features/templates/template-marketplace-discovery";
import type { MarketplaceInstallCohort } from "@/features/templates/template-marketplace-intelligence-types";
import {
  daysBetween,
  round,
  sum,
} from "@/features/templates/template-marketplace-intelligence-utils";

export function createInstallCohorts(
  templates: MarketplaceDiscoveryTemplate[],
  now: Date,
): MarketplaceInstallCohort[] {
  const cohorts = [
    { id: "last-7", label: "Last 7 days", min: 0, max: 7 },
    { id: "days-8-30", label: "8-30 days", min: 8, max: 30 },
    { id: "days-31-90", label: "31-90 days", min: 31, max: 90 },
    { id: "older", label: "90+ days", min: 91, max: Number.POSITIVE_INFINITY },
  ];

  return cohorts.map((cohort) => {
    const cohortTemplates = templates.filter((template) => {
      if (!template.publishedAt) return false;

      const age = daysBetween(now, template.publishedAt);

      return age >= cohort.min && age <= cohort.max;
    });
    const views = sum(cohortTemplates.map((template) => template.viewCount));
    const uses = sum(cohortTemplates.map((template) => template.useCount));

    return {
      id: cohort.id,
      label: cohort.label,
      templateCount: cohortTemplates.length,
      views,
      uses,
      conversionRate: views ? round((uses / views) * 100, 1) : 0,
    };
  });
}
