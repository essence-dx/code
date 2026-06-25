import {
  templateCatalogItems,
  type TemplateCatalogFormat,
  type TemplateCatalogItem,
} from "@/features/templates/template-catalog";

export { templateCatalogItems };

export type TemplateLibraryExpansionStatus = "ready" | "review" | "blocked";

export type TemplateLibraryStarterSystemKind =
  | "campaign"
  | "website"
  | "document"
  | "print"
  | "email"
  | "social"
  | "motion"
  | "workshop"
  | "brand";

export type TemplateLibraryStarterSystem = {
  id: string;
  kind: TemplateLibraryStarterSystemKind;
  label: string;
  detail: string;
  templateIds: string[];
  formats: TemplateCatalogFormat[];
};

export type TemplateLibraryQaGate = {
  id: string;
  label: string;
  status: TemplateLibraryExpansionStatus;
  score: number;
  detail: string;
};

export type TemplateLibraryCurationLane = {
  id: string;
  label: string;
  status: TemplateLibraryExpansionStatus;
  templateIds: string[];
  actions: string[];
};

export type TemplateLibraryCurationWorkflow = {
  id: string;
  label: string;
  lanes: TemplateLibraryCurationLane[];
};

export type TemplateLibraryIndustryPack = {
  id: string;
  title: string;
  industry: string;
  description: string;
  status: TemplateLibraryExpansionStatus;
  score: number;
  templates: TemplateCatalogItem[];
  formatCoverage: TemplateCatalogFormat[];
  starterSystems: TemplateLibraryStarterSystem[];
  qaGates: TemplateLibraryQaGate[];
  curationWorkflow: TemplateLibraryCurationWorkflow;
  nextAction: string;
};

export type FirstPartyTemplateLibraryExpansion = {
  generatedAt: string;
  status: TemplateLibraryExpansionStatus;
  score: number;
  industryPacks: TemplateLibraryIndustryPack[];
  curationLanes: TemplateLibraryCurationLane[];
  nextActions: string[];
  libraryPacket: {
    fileName: string;
    dataUrl: string;
  };
  totals: {
    catalogTemplates: number;
    industryPacks: number;
    readyPacks: number;
    reviewPacks: number;
    blockedPacks: number;
    componentSystems: number;
    curationLanes: number;
    provenanceReadyPercent: number;
  };
};

type IndustryPackBlueprint = {
  id: string;
  title: string;
  industry: string;
  description: string;
  templateIds: string[];
  targetFormats: TemplateCatalogFormat[];
};

const minimumTemplatesPerPack = 3;
const minimumFormatsPerPack = 3;

const industryPackBlueprints: IndustryPackBlueprint[] = [
  {
    id: "saas-launch-system",
    title: "SaaS launch system",
    industry: "SaaS",
    description:
      "Launch, explain, convert, and follow up across website, social, email, and pitch surfaces.",
    templateIds: [
      "social-launch-announcement",
      "product-landing-page",
      "product-update-email",
      "startup-pitch-deck",
      "data-story-infographic",
    ],
    targetFormats: [
      "website",
      "instagram-post",
      "email-template",
      "presentation",
      "infographic",
    ],
  },
  {
    id: "services-sales-system",
    title: "Services sales system",
    industry: "Services",
    description:
      "Proposal, proof, presentation, and web follow-up templates for service businesses.",
    templateIds: [
      "client-proposal-document",
      "startup-pitch-deck",
      "product-landing-page",
      "product-update-email",
      "portfolio-resume-profile",
    ],
    targetFormats: ["document", "presentation", "website", "email-template"],
  },
  {
    id: "food-beverage-local-system",
    title: "Food and beverage local system",
    industry: "Food and beverage",
    description:
      "Local restaurant launch surfaces across menu flyers, social specials, and customer email offers.",
    templateIds: [
      "restaurant-menu-launch",
      "restaurant-social-special",
      "restaurant-email-offer",
    ],
    targetFormats: ["flyer", "instagram-post", "email-template"],
  },
  {
    id: "healthcare-care-system",
    title: "Healthcare care system",
    industry: "Healthcare",
    description:
      "Patient-safe service, appointment, and intake templates for small clinics.",
    templateIds: [
      "clinic-care-flyer",
      "clinic-appointment-card",
      "clinic-website-intake",
    ],
    targetFormats: ["flyer", "business-card", "website"],
  },
  {
    id: "nonprofit-donor-system",
    title: "Nonprofit donor system",
    industry: "Nonprofit",
    description:
      "Cause, donor update, event promotion, and impact reporting starters for nonprofit teams.",
    templateIds: [
      "nonprofit-fundraiser-poster",
      "nonprofit-impact-report",
      "nonprofit-donor-email",
      "community-event-poster",
    ],
    targetFormats: ["poster", "document", "email-template"],
  },
  {
    id: "real-estate-listing-system",
    title: "Real estate listing system",
    industry: "Real estate",
    description:
      "Listing, open house, guide, and landing surfaces for property teams and agents.",
    templateIds: [
      "real-estate-listing-flyer",
      "real-estate-open-house-post",
      "real-estate-neighborhood-guide",
      "product-landing-page",
    ],
    targetFormats: ["flyer", "instagram-post", "document", "website"],
  },
  {
    id: "learning-product-system",
    title: "Learning product system",
    industry: "Learning",
    description:
      "Lesson, landing, email, and analytics starters for educators and course creators.",
    templateIds: [
      "course-lesson-handout",
      "product-landing-page",
      "product-update-email",
      "data-story-infographic",
    ],
    targetFormats: ["course", "website", "email-template", "infographic"],
  },
  {
    id: "creator-presence-system",
    title: "Creator presence system",
    industry: "Creator",
    description:
      "Identity, social, profile, video, and landing surfaces for independent creators.",
    templateIds: [
      "vertical-video-storyboard",
      "portfolio-resume-profile",
      "brand-mark-kit",
      "social-launch-announcement",
      "product-landing-page",
    ],
    targetFormats: ["video", "resume", "logo", "instagram-post", "website"],
  },
];

export function createFirstPartyTemplateLibraryExpansion(
  items: TemplateCatalogItem[] = templateCatalogItems,
  now: Date = new Date(),
): FirstPartyTemplateLibraryExpansion {
  const generatedAt = now.toISOString();
  const industryPacks = industryPackBlueprints.map((blueprint) =>
    createIndustryPack(blueprint, items),
  );
  const curationLanes = industryPacks.flatMap(
    (pack) => pack.curationWorkflow.lanes,
  );
  const score = average(industryPacks.map((pack) => pack.score));
  const status = scoreToStatus(
    score,
    industryPacks.some((pack) => pack.status === "blocked"),
  );
  const provenanceReadyPercent = calculateProvenanceReadyPercent(items);
  const totals = {
    catalogTemplates: items.length,
    industryPacks: industryPacks.length,
    readyPacks: industryPacks.filter((pack) => pack.status === "ready").length,
    reviewPacks: industryPacks.filter((pack) => pack.status === "review")
      .length,
    blockedPacks: industryPacks.filter((pack) => pack.status === "blocked")
      .length,
    componentSystems: industryPacks.reduce(
      (total, pack) => total + pack.starterSystems.length,
      0,
    ),
    curationLanes: curationLanes.length,
    provenanceReadyPercent,
  };
  const nextActions = createNextActions(industryPacks);

  return {
    generatedAt,
    status,
    score,
    industryPacks,
    curationLanes,
    nextActions,
    libraryPacket: createLibraryPacket({
      generatedAt,
      status,
      score,
      totals,
      industryPacks,
      nextActions,
    }),
    totals,
  };
}

function createIndustryPack(
  blueprint: IndustryPackBlueprint,
  items: TemplateCatalogItem[],
): TemplateLibraryIndustryPack {
  const templates = blueprint.templateIds
    .map((id) => items.find((template) => template.id === id))
    .filter((template): template is TemplateCatalogItem => Boolean(template));
  const formatCoverage = uniqueFormats(
    templates.map((template) => template.format),
  );
  const starterSystems = createStarterSystems(blueprint, templates);
  const curationWorkflow = createCurationWorkflow({
    blueprint,
    templates,
    starterSystems,
    formatCoverage,
  });
  const qaGates = createQaGates({
    blueprint,
    templates,
    starterSystems,
    formatCoverage,
    curationWorkflow,
  });
  const score = average(qaGates.map((gate) => gate.score));
  const status = scoreToStatus(
    score,
    qaGates.some((gate) => gate.status === "blocked"),
  );

  return {
    id: blueprint.id,
    title: blueprint.title,
    industry: blueprint.industry,
    description: blueprint.description,
    status,
    score,
    templates,
    formatCoverage,
    starterSystems,
    qaGates,
    curationWorkflow,
    nextAction: createPackNextAction({
      blueprint,
      status,
      qaGates,
      curationWorkflow,
    }),
  };
}

function createStarterSystems(
  blueprint: IndustryPackBlueprint,
  templates: TemplateCatalogItem[],
): TemplateLibraryStarterSystem[] {
  const systems = [
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "website",
      label: "Website conversion starter",
      formats: ["website"],
      detail:
        "Hosted hero, proof, form, and contact sections ready for campaign publishing.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "social",
      label: "Social launch starter",
      formats: ["instagram-post", "banner"],
      detail:
        "Feed-safe announcement and promotion pieces for quick channel activation.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "email",
      label: "Email follow-up starter",
      formats: ["email-template"],
      detail:
        "Email-safe content blocks for announcement, offer, and nurture workflows.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "document",
      label: "Document handoff starter",
      formats: ["document", "resume", "course", "infographic", "spreadsheet"],
      detail:
        "Printable or exportable document structure for proposals, reports, and learning assets.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "print",
      label: "Print promotion starter",
      formats: ["poster", "flyer", "business-card", "print-product"],
      detail:
        "Print-safe layout blocks with clear hierarchy, CTA areas, and local handoff usage.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "campaign",
      label: "Campaign narrative starter",
      formats: ["presentation", "whiteboard"],
      detail:
        "Planning, pitch, and stakeholder narrative pieces for launch-room workflows.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "motion",
      label: "Motion storyboard starter",
      formats: ["video"],
      detail:
        "Timeline-ready hook, beat, caption, and CTA planning for short-form video.",
    }),
    createSystemFromFormats({
      blueprint,
      templates,
      kind: "brand",
      label: "Brand identity starter",
      formats: ["logo"],
      detail:
        "Reusable brand mark and identity prompts for saving into workspace brand kits.",
    }),
  ].filter((system): system is TemplateLibraryStarterSystem => Boolean(system));

  return systems;
}

function createSystemFromFormats(input: {
  blueprint: IndustryPackBlueprint;
  templates: TemplateCatalogItem[];
  kind: TemplateLibraryStarterSystemKind;
  label: string;
  formats: TemplateCatalogFormat[];
  detail: string;
}): TemplateLibraryStarterSystem | null {
  const matchingTemplates = input.templates.filter((template) =>
    input.formats.includes(template.format),
  );

  if (!matchingTemplates.length) return null;

  return {
    id: `${input.blueprint.id}-${input.kind}`,
    kind: input.kind,
    label: input.label,
    detail: input.detail,
    templateIds: matchingTemplates.map((template) => template.id),
    formats: uniqueFormats(
      matchingTemplates.map((template) => template.format),
    ),
  };
}

function createQaGates(input: {
  blueprint: IndustryPackBlueprint;
  templates: TemplateCatalogItem[];
  starterSystems: TemplateLibraryStarterSystem[];
  formatCoverage: TemplateCatalogFormat[];
  curationWorkflow: TemplateLibraryCurationWorkflow;
}): TemplateLibraryQaGate[] {
  const provenanceReady = input.templates.filter(
    (template) => template.assetProvenanceNotes.length >= 3,
  ).length;
  const editableReady = input.templates.filter(
    (template) =>
      template.usageNotes.trim() &&
      template.tags.length >= 3 &&
      template.accentColor &&
      template.surfaceColor &&
      template.textColor,
  ).length;
  const blockedCurationLanes = input.curationWorkflow.lanes.filter(
    (lane) => lane.status === "blocked",
  ).length;

  return [
    createCoverageGate({
      id: "catalog-depth",
      label: "Catalog depth",
      count: input.templates.length,
      target: minimumTemplatesPerPack,
      unit: "templates",
      subject: input.blueprint.industry,
    }),
    createCoverageGate({
      id: "format-coverage",
      label: "Format coverage",
      count: input.formatCoverage.length,
      target: minimumFormatsPerPack,
      unit: "formats",
      subject: input.blueprint.industry,
    }),
    createCoverageGate({
      id: "component-systems",
      label: "Componentized starter systems",
      count: input.starterSystems.length,
      target: 2,
      unit: "starter systems",
      subject: input.blueprint.industry,
    }),
    createRatioGate({
      id: "provenance",
      label: "Original asset provenance",
      ready: provenanceReady,
      total: input.templates.length,
      subject: input.blueprint.industry,
      emptyDetail: "No templates exist yet for provenance review.",
    }),
    createRatioGate({
      id: "editability",
      label: "Editable starter metadata",
      ready: editableReady,
      total: input.templates.length,
      subject: input.blueprint.industry,
      emptyDetail: "No templates exist yet for editable metadata review.",
    }),
    {
      id: "marketplace-curation",
      label: "Marketplace curation workflow",
      status: blockedCurationLanes ? "blocked" : "ready",
      score: blockedCurationLanes ? 35 : 100,
      detail: blockedCurationLanes
        ? `${input.blueprint.industry} has ${blockedCurationLanes} blocked curation lane.`
        : `${input.blueprint.industry} has a publish, QA, and promotion workflow.`,
    },
  ];
}

function createCoverageGate(input: {
  id: string;
  label: string;
  count: number;
  target: number;
  unit: string;
  subject: string;
}): TemplateLibraryQaGate {
  if (input.count >= input.target) {
    return {
      id: input.id,
      label: input.label,
      status: "ready",
      score: 100,
      detail: `${input.subject} covers ${input.count} ${input.unit}.`,
    };
  }

  if (input.count > 0) {
    return {
      id: input.id,
      label: input.label,
      status: "review",
      score: 65,
      detail: `${input.subject} has ${input.count} ${input.unit}; target is ${input.target}.`,
    };
  }

  return {
    id: input.id,
    label: input.label,
    status: "blocked",
    score: 0,
    detail: `${input.subject} has no ${input.unit} in the first-party catalog.`,
  };
}

function createRatioGate(input: {
  id: string;
  label: string;
  ready: number;
  total: number;
  subject: string;
  emptyDetail: string;
}): TemplateLibraryQaGate {
  if (!input.total) {
    return {
      id: input.id,
      label: input.label,
      status: "blocked",
      score: 0,
      detail: input.emptyDetail,
    };
  }

  const score = Math.round((input.ready / input.total) * 100);

  return {
    id: input.id,
    label: input.label,
    status: score === 100 ? "ready" : score >= 80 ? "review" : "blocked",
    score,
    detail: `${input.ready} of ${input.total} ${input.subject} templates pass this gate.`,
  };
}

function createCurationWorkflow(input: {
  blueprint: IndustryPackBlueprint;
  templates: TemplateCatalogItem[];
  starterSystems: TemplateLibraryStarterSystem[];
  formatCoverage: TemplateCatalogFormat[];
}): TemplateLibraryCurationWorkflow {
  const missingFormats = input.blueprint.targetFormats.filter(
    (format) => !input.formatCoverage.includes(format),
  );
  const missingTemplateCount = Math.max(
    0,
    minimumTemplatesPerPack - input.templates.length,
  );
  const backfillActions = [
    missingTemplateCount
      ? `Add ${missingTemplateCount} ${input.blueprint.industry} starter template${missingTemplateCount === 1 ? "" : "s"}.`
      : null,
    missingFormats.length
      ? `Add ${input.blueprint.industry} coverage for ${missingFormats.join(", ")}.`
      : null,
  ].filter((action): action is string => Boolean(action));

  return {
    id: `${input.blueprint.id}-curation`,
    label: `${input.blueprint.title} curation`,
    lanes: [
      {
        id: "publish-ready",
        label: "Publish-ready starters",
        status:
          input.templates.length >= minimumTemplatesPerPack
            ? "ready"
            : "review",
        templateIds: input.templates.map((template) => template.id),
        actions: input.templates.length
          ? [
              `Review ${input.templates.length} ${input.blueprint.industry} starters for marketplace publish order.`,
            ]
          : [`Create the first ${input.blueprint.industry} starter draft.`],
      },
      {
        id: "backfill-formats",
        label: "Backfill missing formats",
        status: backfillActions.length ? "blocked" : "ready",
        templateIds: [],
        actions: backfillActions.length
          ? backfillActions
          : [
              `${input.blueprint.industry} target formats are covered for this pack.`,
            ],
      },
      {
        id: "qa-release",
        label: "QA release lane",
        status: input.starterSystems.length >= 2 ? "ready" : "review",
        templateIds: input.templates.map((template) => template.id),
        actions: [
          `Run accessibility, localization, provenance, and editable-region checks for ${input.blueprint.title}.`,
        ],
      },
      {
        id: "promote-pack",
        label: "Marketplace promotion lane",
        status:
          input.templates.length >= minimumTemplatesPerPack
            ? "ready"
            : "review",
        templateIds: input.templates.slice(0, 3).map((template) => template.id),
        actions: [
          `Curate ${input.blueprint.title} into dashboard recommendations and marketplace rails.`,
        ],
      },
    ],
  };
}

function createPackNextAction(input: {
  blueprint: IndustryPackBlueprint;
  status: TemplateLibraryExpansionStatus;
  qaGates: TemplateLibraryQaGate[];
  curationWorkflow: TemplateLibraryCurationWorkflow;
}) {
  const blockedGate = input.qaGates.find((gate) => gate.status === "blocked");
  const reviewGate = input.qaGates.find((gate) => gate.status === "review");
  const blockedLane = input.curationWorkflow.lanes.find(
    (lane) => lane.status === "blocked",
  );

  if (blockedLane?.actions[0]) return blockedLane.actions[0];
  if (blockedGate) return blockedGate.detail;
  if (reviewGate) return reviewGate.detail;
  if (input.status === "ready") {
    return `Promote ${input.blueprint.title} as a first-party marketplace pack.`;
  }

  return `Review ${input.blueprint.title} before promotion.`;
}

function createNextActions(industryPacks: TemplateLibraryIndustryPack[]) {
  const blocked = industryPacks.filter((pack) => pack.status === "blocked");
  const review = industryPacks.filter((pack) => pack.status === "review");
  const ready = industryPacks.filter((pack) => pack.status === "ready");

  return [
    ...blocked.map((pack) => pack.nextAction),
    ...review.map((pack) => pack.nextAction),
    ...ready
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 3)
      .map((pack) => pack.nextAction),
  ].slice(0, 6);
}

function createLibraryPacket(input: {
  generatedAt: string;
  status: TemplateLibraryExpansionStatus;
  score: number;
  totals: FirstPartyTemplateLibraryExpansion["totals"];
  industryPacks: TemplateLibraryIndustryPack[];
  nextActions: string[];
}) {
  const packet = {
    generatedAt: input.generatedAt,
    status: input.status,
    score: input.score,
    totals: input.totals,
    industryPacks: input.industryPacks.map((pack) => ({
      id: pack.id,
      industry: pack.industry,
      status: pack.status,
      score: pack.score,
      templates: pack.templates.map((template) => template.id),
      formats: pack.formatCoverage,
      starterSystems: pack.starterSystems.map((system) => ({
        id: system.id,
        kind: system.kind,
        templates: system.templateIds,
      })),
      qaGates: pack.qaGates.map((gate) => ({
        id: gate.id,
        status: gate.status,
        score: gate.score,
      })),
      curationLanes: pack.curationWorkflow.lanes.map((lane) => ({
        id: lane.id,
        status: lane.status,
        actions: lane.actions,
      })),
    })),
    nextActions: input.nextActions,
  };

  return {
    fileName: "first-party-template-library-expansion.json",
    dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(packet, null, 2),
    )}`,
  };
}

function calculateProvenanceReadyPercent(items: TemplateCatalogItem[]) {
  if (!items.length) return 0;

  const ready = items.filter(
    (template) => template.assetProvenanceNotes.length >= 3,
  ).length;

  return Math.round((ready / items.length) * 100);
}

function scoreToStatus(
  score: number,
  hasBlockedGate: boolean,
): TemplateLibraryExpansionStatus {
  if (hasBlockedGate || score < 50) return "blocked";
  if (score < 85) return "review";

  return "ready";
}

function average(values: number[]) {
  if (!values.length) return 0;

  return Math.round(
    values.reduce((total, value) => total + value, 0) / values.length,
  );
}

function uniqueFormats(formats: TemplateCatalogFormat[]) {
  return [...new Set(formats)].sort((a, b) => a.localeCompare(b));
}
