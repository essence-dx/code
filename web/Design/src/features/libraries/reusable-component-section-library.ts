import type {
  DesignSystemComponentAdoptionGate,
  DesignSystemReleaseGateResult,
  DesignSystemTokenMigrationPlan,
} from "@/features/design-system/design-system-release-governance";
import type { TemplateInstanceUpdatePreview } from "@/features/templates/template-instance-propagation";
import type {
  ReusableComponentLibrary,
  ReusableComponentSectionLibraryCenter,
  ReusableComponentSectionLibraryInput,
  ReusableComponentVersionVariant,
  ReusableDependencyUpdatePlan,
  ReusableInsertPacket,
  ReusableLibraryStatus,
  ReusableSafeInsertGate,
  ReusableSafeInsertPlan,
  ReusableSectionKind,
  ReusableSectionLibrary,
} from "@/features/libraries/reusable-component-section-library-types";

export type {
  ReusableComponentLibrary,
  ReusableComponentSectionLibraryCenter,
  ReusableComponentSectionLibraryInput,
  ReusableComponentVersionVariant,
  ReusableDependencyUpdatePlan,
  ReusableInsertPacket,
  ReusableLibraryStatus,
  ReusableSafeInsertGate,
  ReusableSafeInsertGateKind,
  ReusableSafeInsertPlan,
  ReusableSectionKind,
  ReusableSectionLibrary,
} from "@/features/libraries/reusable-component-section-library-types";

export function createReusableComponentSectionLibraryCenter(
  input: ReusableComponentSectionLibraryInput,
): ReusableComponentSectionLibraryCenter {
  const generatedAt = normalizeDate(input.now).toISOString();
  const templatesById = new Map(
    input.templates.map((template) => [template.id, template]),
  );
  const activeProjects = input.projects.filter((project) => !project.deletedAt);
  const latestVersionByProject = createLatestVersionByProject(
    input.projectVersions,
  );
  const componentLibraries = input.designSystem.componentDefinitions
    .map((component) => {
      const template = templatesById.get(component.templateId) ?? null;
      const gate =
        input.releaseGovernance.componentAdoptionGates.find(
          (item) =>
            item.componentId === component.id ||
            item.templateId === component.templateId,
        ) ?? null;
      const updatePreviews =
        input.templateInstancePropagation.updatePreviews.filter(
          (preview) => preview.templateId === component.templateId,
        );
      const tokenMigrationPlans =
        input.releaseGovernance.tokenMigrationPlans.filter((plan) =>
          planTouchesComponentProjects(plan, component.usage.projectIds),
        );
      const dependencyUpdatePlan = createDependencyUpdatePlan({
        componentId: component.id,
        templateId: component.templateId,
        gate,
        tokenMigrationPlans,
        updatePreviews,
      });
      const versionedVariants = createVersionedVariants({
        template,
        componentStatus: component.status,
        componentUsageProjectIds: component.usage.projectIds,
        activeProjects,
        latestVersionByProject,
        updatePreviews,
      });
      const safeInsertPlan = createSafeInsertPlan({
        componentId: component.id,
        componentName: component.name,
        sectionKind: inferSectionKind(component.name, template?.width ?? 0),
        componentStatus: component.status,
        componentScore: component.score,
        gate,
        dependencyUpdatePlan,
        versionedVariants,
        template,
      });
      const status = aggregateStatus([
        component.status,
        dependencyUpdatePlan.status,
        safeInsertPlan.status,
      ]);
      const score = average([
        component.score,
        dependencyStatusScore(dependencyUpdatePlan.status),
        safeInsertPlan.score,
      ]);
      const sectionKind = inferSectionKind(
        component.name,
        template?.width ?? 0,
      );

      return {
        id: `component-library-${component.templateId}`,
        templateId: component.templateId,
        componentId: component.id,
        name: component.name,
        kind: component.kind,
        sectionKind,
        status,
        score,
        href: component.href,
        tokenCoverage: component.tokenCoverage,
        usage: component.usage,
        versionedVariants,
        dependencyUpdatePlan,
        safeInsertPlan,
        insertPacket: createInsertPacket({
          generatedAt,
          id: `component-insert-packet-${component.templateId}`,
          title: `${component.name} insert packet`,
          status,
          payload: {
            kind: "essence-studio.reusable-component-library",
            componentId: component.id,
            templateId: component.templateId,
            sectionKind,
            status,
            versionedVariants,
            dependencyUpdatePlan,
            safeInsertPlan,
          },
        }),
      } satisfies ReusableComponentLibrary;
    })
    .sort(compareComponentLibraries);
  const sectionLibraries = createSectionLibraries({
    generatedAt,
    componentLibraries,
  });
  const safeInsertPlans = componentLibraries.map(
    (library) => library.safeInsertPlan,
  );
  const dependencyUpdatePlans = componentLibraries.map(
    (library) => library.dependencyUpdatePlan,
  );
  const status = aggregateStatus(componentLibraries.map((item) => item.status));
  const score = average(
    componentLibraries.map((library) => library.score),
    componentLibraries.length ? undefined : 100,
  );

  return {
    generatedAt,
    status,
    score,
    componentLibraries,
    sectionLibraries,
    dependencyUpdatePlans,
    safeInsertPlans,
    nextActions: createNextActions({ componentLibraries, sectionLibraries }),
    totals: {
      componentLibraries: componentLibraries.length,
      sectionLibraries: sectionLibraries.length,
      versionedVariants: componentLibraries.reduce(
        (total, library) => total + library.versionedVariants.length,
        0,
      ),
      dependencyUpdatePlans: dependencyUpdatePlans.length,
      safeInsertPlans: safeInsertPlans.length,
      blockedInsertPlans: safeInsertPlans.filter(
        (plan) => plan.status === "blocked",
      ).length,
      reviewInsertPlans: safeInsertPlans.filter(
        (plan) => plan.status === "review",
      ).length,
      readyInsertPlans: safeInsertPlans.filter(
        (plan) => plan.status === "ready",
      ).length,
    },
  };
}

function createDependencyUpdatePlan(input: {
  componentId: string;
  templateId: string;
  gate: DesignSystemComponentAdoptionGate | null;
  tokenMigrationPlans: DesignSystemTokenMigrationPlan[];
  updatePreviews: TemplateInstanceUpdatePreview[];
}): ReusableDependencyUpdatePlan {
  const blockers = [
    ...input.tokenMigrationPlans
      .filter((plan) => plan.status === "blocked")
      .map((plan) => `${plan.label} is blocked.`),
    ...input.updatePreviews.flatMap((preview) =>
      preview.breakingChanges.map((change) => change.detail),
    ),
    ...(input.gate?.gateResults
      .filter((gate) => gate.status === "blocked")
      .map((gate) => `${gate.label}: ${gate.detail}`) ?? []),
  ];
  const recommendedUpdates = [
    ...input.tokenMigrationPlans.flatMap((plan) => plan.steps.slice(0, 2)),
    ...input.updatePreviews.map((preview) => preview.nextAction),
    input.gate?.nextAction ?? "Confirm adoption gates before inserting.",
  ].filter(Boolean);
  const affectedProjectIds = unique([
    ...(input.gate?.affectedProjectIds ?? []),
    ...input.tokenMigrationPlans.flatMap((plan) => plan.affectedProjectIds),
    ...input.updatePreviews.map((preview) => preview.projectId),
  ]);
  const status = aggregateStatus([
    ...(input.gate ? [input.gate.status] : []),
    ...input.tokenMigrationPlans.map((plan) => plan.status),
    ...input.updatePreviews.map((preview) => preview.status),
  ]);

  return {
    id: `dependency-update-${input.templateId}`,
    templateId: input.templateId,
    status,
    affectedProjectIds,
    tokenMigrationPlanIds: input.tokenMigrationPlans.map((plan) => plan.id),
    instancePreviewIds: input.updatePreviews.map((preview) => preview.id),
    publicSurfaces: input.gate?.publicSurfaces ?? 0,
    blockers,
    recommendedUpdates: unique(recommendedUpdates).slice(0, 5),
  };
}

function createVersionedVariants(input: {
  template: ReusableComponentSectionLibraryInput["templates"][number] | null;
  componentStatus: ReusableLibraryStatus;
  componentUsageProjectIds: string[];
  activeProjects: ReusableComponentSectionLibraryInput["projects"];
  latestVersionByProject: Map<string, { id: string; createdAt: string }>;
  updatePreviews: TemplateInstanceUpdatePreview[];
}): ReusableComponentVersionVariant[] {
  const templateVariant: ReusableComponentVersionVariant = {
    id: `variant-template-${input.template?.id ?? "unknown"}`,
    label: templateVariantLabel(input.template?.marketplaceStatus),
    source: "template",
    status: input.template
      ? approvalToStatus(input.template.approvalStatus)
      : input.componentStatus,
    projectId: null,
    versionId: null,
    updatedAt: input.template?.updatedAt ?? new Date(0).toISOString(),
    detail: input.template
      ? `${input.template.marketplaceUseCount} uses and ${input.template.marketplaceViewCount} views are available for reuse evidence.`
      : "Template metadata is missing for this component.",
  };
  const projectVariants = input.componentUsageProjectIds.map((projectId) => {
    const project =
      input.activeProjects.find((item) => item.id === projectId) ?? null;
    const latestVersion = input.latestVersionByProject.get(projectId) ?? null;
    const preview =
      input.updatePreviews.find((item) => item.projectId === projectId) ?? null;
    const status = latestVersion
      ? approvalToStatus(project?.approvalStatus ?? "draft")
      : "blocked";

    return {
      id: `variant-project-${projectId}`,
      label: latestVersion ? "Project snapshot" : "Snapshot needed",
      source: latestVersion ? "project-snapshot" : "project-instance",
      status: aggregateStatus([status, preview?.status ?? "ready"]),
      projectId,
      versionId: latestVersion?.id ?? null,
      updatedAt:
        latestVersion?.createdAt ??
        project?.updatedAt ??
        templateVariant.updatedAt,
      detail: latestVersion
        ? `Snapshot ${latestVersion.id} can restore this insert target.`
        : `Create a restore point for ${project?.name ?? projectId} before shared inserts.`,
    } satisfies ReusableComponentVersionVariant;
  });

  return [templateVariant, ...projectVariants].slice(0, 5);
}

function createSafeInsertPlan(input: {
  componentId: string;
  componentName: string;
  sectionKind: ReusableSectionKind;
  componentStatus: ReusableLibraryStatus;
  componentScore: number;
  gate: DesignSystemComponentAdoptionGate | null;
  dependencyUpdatePlan: ReusableDependencyUpdatePlan;
  versionedVariants: ReusableComponentVersionVariant[];
  template: ReusableComponentSectionLibraryInput["templates"][number] | null;
}): ReusableSafeInsertPlan {
  const gateResults =
    input.gate?.gateResults.map((gate) => safeGateFromReleaseGate(gate)) ?? [];
  const versionGate: ReusableSafeInsertGate = {
    id: `insert-gate-version-${input.componentId}`,
    kind: "version",
    status: input.versionedVariants.some(
      (variant) =>
        variant.source !== "template" && variant.status === "blocked",
    )
      ? "blocked"
      : "ready",
    label: "Versioned variants",
    detail: input.versionedVariants.some(
      (variant) =>
        variant.source !== "template" && variant.status === "blocked",
    )
      ? "Create restore points for dependent projects before inserting this component."
      : "Reusable variants have restore-point coverage.",
  };
  const dependencyGate: ReusableSafeInsertGate = {
    id: `insert-gate-dependency-${input.componentId}`,
    kind: "dependency",
    status: input.dependencyUpdatePlan.status,
    label: "Dependencies",
    detail: input.dependencyUpdatePlan.blockers.length
      ? input.dependencyUpdatePlan.blockers[0]
      : "No blocking dependency updates are known.",
  };
  const requiredGates = [...gateResults, versionGate, dependencyGate];
  const status = aggregateStatus([
    input.componentStatus,
    ...requiredGates.map((gate) => gate.status),
  ]);
  const score = average([
    input.componentScore,
    ...requiredGates.map((gate) => dependencyStatusScore(gate.status)),
  ]);

  return {
    id: `safe-insert-${input.componentId}`,
    status,
    score,
    targetFormats: createTargetFormats(input.template, input.sectionKind),
    requiredGates,
    insertSteps: [
      `Insert ${input.componentName} from the approved library version.`,
      "Apply current brand tokens before exposing the component to a project.",
      "Re-run dependency and approval gates after insertion.",
      "Create a restore point before applying updates to published surfaces.",
    ],
    nextAction:
      status === "ready"
        ? `${input.componentName} is ready for design-system-safe inserts.`
        : `Resolve ${input.componentName} insert gates before reuse.`,
  };
}

function createSectionLibraries(input: {
  generatedAt: string;
  componentLibraries: ReusableComponentLibrary[];
}): ReusableSectionLibrary[] {
  return Array.from(groupBySection(input.componentLibraries).entries())
    .map(([kind, libraries]) => {
      const status = aggregateStatus(
        libraries.map((library) => library.status),
      );
      const score = average(libraries.map((library) => library.score));
      const componentIds = libraries.map((library) => library.componentId);
      const templateIds = libraries.map((library) => library.templateId);
      const targetFormats = unique(
        libraries.flatMap((library) => library.safeInsertPlan.targetFormats),
      );

      return {
        id: `section-library-${kind}`,
        kind,
        label: sectionLabels[kind],
        status,
        score,
        componentIds,
        templateIds,
        variantCount: libraries.reduce(
          (total, library) => total + library.versionedVariants.length,
          0,
        ),
        targetFormats,
        safeInsertPlanIds: libraries.map(
          (library) => library.safeInsertPlan.id,
        ),
        insertPacket: createInsertPacket({
          generatedAt: input.generatedAt,
          id: `section-insert-packet-${kind}`,
          title: `${sectionLabels[kind]} section insert packet`,
          status,
          payload: {
            kind: "essence-studio.reusable-section-library",
            sectionKind: kind,
            componentIds,
            templateIds,
            targetFormats,
            safeInsertPlanIds: libraries.map(
              (library) => library.safeInsertPlan.id,
            ),
          },
        }),
        nextAction:
          status === "ready"
            ? `${sectionLabels[kind]} sections are ready for safe inserts.`
            : `Resolve blocked ${sectionLabels[kind].toLowerCase()} component gates before broad reuse.`,
      } satisfies ReusableSectionLibrary;
    })
    .sort(compareSectionLibraries);
}

function createInsertPacket(input: {
  generatedAt: string;
  id: string;
  title: string;
  status: ReusableLibraryStatus;
  payload: Record<string, unknown>;
}): ReusableInsertPacket {
  return {
    id: input.id,
    title: input.title,
    status: input.status,
    generatedAt: input.generatedAt,
    downloadJson: createJsonDataUrl({
      ...input.payload,
      generatedAt: input.generatedAt,
      status: input.status,
    }),
  };
}

function safeGateFromReleaseGate(
  gate: DesignSystemReleaseGateResult,
): ReusableSafeInsertGate {
  return {
    id: `insert-${gate.id}`,
    kind: gate.kind,
    status: gate.status,
    label: gate.label,
    detail: gate.detail,
  };
}

function groupBySection(libraries: ReusableComponentLibrary[]) {
  const groups = new Map<ReusableSectionKind, ReusableComponentLibrary[]>();

  for (const library of libraries) {
    groups.set(library.sectionKind, [
      ...(groups.get(library.sectionKind) ?? []),
      library,
    ]);
  }

  return groups;
}

function createNextActions(input: {
  componentLibraries: ReusableComponentLibrary[];
  sectionLibraries: ReusableSectionLibrary[];
}) {
  const blocked = input.componentLibraries.filter(
    (library) => library.status === "blocked",
  );
  if (blocked.length) {
    return blocked
      .slice(0, 4)
      .map((library) => library.safeInsertPlan.nextAction);
  }

  const review = input.componentLibraries.filter(
    (library) => library.status === "review",
  );
  if (review.length) {
    return review
      .slice(0, 4)
      .map((library) => library.safeInsertPlan.nextAction);
  }

  return input.sectionLibraries.length
    ? [
        "All reusable section libraries are insert-ready; keep version snapshots fresh before publishing.",
      ]
    : [
        "Publish templates and design-system components to populate reusable libraries.",
      ];
}

function planTouchesComponentProjects(
  plan: DesignSystemTokenMigrationPlan,
  projectIds: string[],
) {
  if (!plan.affectedProjectIds.length) return true;
  if (!projectIds.length) return plan.status !== "ready";

  return plan.affectedProjectIds.some((projectId) =>
    projectIds.includes(projectId),
  );
}

function createLatestVersionByProject(
  versions: ReusableComponentSectionLibraryInput["projectVersions"],
) {
  const map = new Map<string, { id: string; createdAt: string }>();

  for (const version of versions) {
    const current = map.get(version.projectId);
    if (
      !current ||
      Date.parse(version.createdAt) > Date.parse(current.createdAt)
    ) {
      map.set(version.projectId, version);
    }
  }

  return map;
}

function inferSectionKind(name: string, width: number): ReusableSectionKind {
  const value = normalizeLookup(name);
  if (value.includes("hero") || value.includes("header")) return "hero";
  if (value.includes("nav") || value.includes("menu")) return "navigation";
  if (value.includes("price") || value.includes("plan")) return "pricing";
  if (value.includes("testimonial") || value.includes("quote"))
    return "testimonial";
  if (value.includes("chart") || value.includes("report")) return "data";
  if (value.includes("video") || value.includes("media")) return "media";
  if (width >= 1200) return "content";

  return "utility";
}

function createTargetFormats(
  template: ReusableComponentSectionLibraryInput["templates"][number] | null,
  sectionKind: ReusableSectionKind,
) {
  const formats = new Set<string>();
  if (template) {
    formats.add(`${template.width} x ${template.height}`);
    if (template.width >= 1200) formats.add("website");
    if (template.height >= 900) formats.add("presentation");
  }
  if (sectionKind === "hero" || sectionKind === "navigation")
    formats.add("website");
  if (sectionKind === "pricing") formats.add("website");
  if (sectionKind === "media") formats.add("video");
  if (sectionKind === "data") formats.add("report");

  return [...formats];
}

function templateVariantLabel(status: string | undefined) {
  if (status === "published") return "Published";
  if (status === "review") return "Review";
  if (status === "archived") return "Archived";

  return "Draft";
}

function approvalToStatus(
  approvalStatus: ReusableComponentSectionLibraryInput["projects"][number]["approvalStatus"],
): ReusableLibraryStatus {
  if (approvalStatus === "approved") return "ready";
  if (approvalStatus === "changes-requested") return "blocked";

  return "review";
}

function aggregateStatus(statuses: ReusableLibraryStatus[]) {
  if (statuses.includes("blocked")) return "blocked";
  if (statuses.includes("review")) return "review";

  return "ready";
}

function dependencyStatusScore(status: ReusableLibraryStatus) {
  if (status === "ready") return 100;
  if (status === "review") return 65;

  return 15;
}

function average(values: number[], fallback = 100) {
  if (!values.length) return fallback;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function compareComponentLibraries(
  left: ReusableComponentLibrary,
  right: ReusableComponentLibrary,
) {
  return (
    statusRank(left.status) - statusRank(right.status) ||
    left.score - right.score ||
    right.versionedVariants.length - left.versionedVariants.length ||
    left.name.localeCompare(right.name)
  );
}

function compareSectionLibraries(
  left: ReusableSectionLibrary,
  right: ReusableSectionLibrary,
) {
  return (
    statusRank(left.status) - statusRank(right.status) ||
    left.score - right.score ||
    right.variantCount - left.variantCount ||
    left.label.localeCompare(right.label)
  );
}

function statusRank(status: ReusableLibraryStatus) {
  if (status === "blocked") return 0;
  if (status === "review") return 1;

  return 2;
}

function normalizeDate(value: string | Date | undefined) {
  if (value instanceof Date) return value;
  if (value) return new Date(value);

  return new Date();
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ");
}

function unique(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

function createJsonDataUrl(payload: unknown) {
  return `data:application/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(payload, null, 2),
  )}`;
}

const sectionLabels: Record<ReusableSectionKind, string> = {
  hero: "Hero",
  navigation: "Navigation",
  pricing: "Pricing",
  testimonial: "Testimonial",
  data: "Data",
  media: "Media",
  content: "Content",
  utility: "Utility",
};
