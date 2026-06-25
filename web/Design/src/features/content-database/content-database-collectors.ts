import { upsertRecord } from "@/features/content-database/content-database-builder";
import type {
  ContentDatabaseInput,
  ContentTemplateSurface,
  DraftState,
} from "@/features/content-database/content-database-types";
import {
  capitalize,
  extractPricing,
  formatDateValue,
  inferProductName,
  inferProjectSurface,
  mapChannelToSurface,
  slugify,
} from "@/features/content-database/content-database-utils";

export function collectBrandRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.brandColors.forEach((color, index) => {
    upsertRecord(state, {
      kind: "brand-copy",
      label: index === 0 ? "Primary brand color" : `Brand color ${index + 1}`,
      variableKey: index === 0 ? "brand_color" : `brand_color_${index + 1}`,
      value: color.color,
      surfaces: ["text", "website", "email", "social"],
      source: {
        type: "brand-color",
        id: color.id,
        label: color.color,
        field: "color",
        excerpt: color.color,
      },
    });
  });

  input.brandFonts.forEach((font) => {
    upsertRecord(state, {
      kind: "brand-copy",
      label: `${capitalize(font.role)} brand font`,
      variableKey: `brand_${font.role}_font`,
      value: font.fontFamily,
      surfaces: ["text", "website", "email", "social"],
      source: {
        type: "brand-font",
        id: font.id,
        label: `${font.role}: ${font.fontFamily}`,
        field: "fontFamily",
        excerpt: font.fontFamily,
      },
    });
  });

  input.brandLogos.forEach((logo, index) => {
    upsertRecord(state, {
      kind: "brand-copy",
      label: index === 0 ? "Brand logo" : `Brand logo ${index + 1}`,
      variableKey: index === 0 ? "brand_logo" : `brand_logo_${index + 1}`,
      value: logo.name,
      surfaces: ["text", "website", "email", "social"],
      source: {
        type: "brand-logo",
        id: logo.id,
        label: logo.name,
        field: "name",
        excerpt: logo.name,
      },
    });
  });
}

export function collectTemplateRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.templates.forEach((template) => {
    if (template.creatorName) {
      upsertRecord(state, {
        kind: "person",
        label: "Template creator",
        variableKey: "creator_name",
        value: template.creatorName,
        surfaces: ["text", "website", "email", "social"],
        source: {
          type: "template",
          id: template.id,
          label: template.name,
          field: "creatorName",
          excerpt: template.creatorName,
        },
      });
    }

    upsertRecord(state, {
      kind: "product",
      label: "Starter pack",
      variableKey: "starter_pack_name",
      value: template.name,
      surfaces: ["text", "table", "website", "email", "social"],
      status:
        template.approvalStatus === "changes-requested" ? "review" : "ready",
      source: {
        type: "template",
        id: template.id,
        label: template.name,
        field: "name",
        excerpt: template.name,
      },
    });
  });
}

export function collectProjectRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.projects
    .filter((project) => !project.deletedAt)
    .forEach((project) => {
      const surface = inferProjectSurface(
        project.name,
        project.width,
        project.height,
      );

      upsertRecord(state, {
        kind: "product",
        label: "Project catalog item",
        variableKey: `project_${slugify(project.id)}`,
        value: project.name,
        surfaces: ["text", surface],
        status:
          project.approvalStatus === "changes-requested" ? "review" : "ready",
        source: {
          type: "project",
          id: project.id,
          label: project.name,
          field: "name",
          excerpt: `${project.name} (${project.width} x ${project.height})`,
        },
      });
    });
}

export function collectCampaignRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.campaigns.forEach((campaign) => {
    const campaignSurfaces: ContentTemplateSurface[] = [
      "text",
      "website",
      "email",
      "social",
    ];

    upsertRecord(state, {
      kind: "campaign-variable",
      label: "Campaign name",
      variableKey: "campaign_name",
      value: campaign.name,
      surfaces: campaignSurfaces,
      status: campaign.status === "draft" ? "review" : "ready",
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "name",
        excerpt: campaign.name,
      },
    });
    upsertRecord(state, {
      kind: "campaign-variable",
      label: "Campaign goal",
      variableKey: "campaign_goal",
      value: campaign.goal,
      surfaces: campaignSurfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "goal",
        excerpt: campaign.goal,
      },
    });
    upsertRecord(state, {
      kind: "campaign-variable",
      label: "Audience",
      variableKey: "audience",
      value: campaign.audience,
      surfaces: campaignSurfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "audience",
        excerpt: campaign.audience,
      },
    });
    upsertRecord(state, {
      kind: "brand-copy",
      label: "Campaign brief",
      variableKey: "campaign_brief",
      value: campaign.brief,
      surfaces: campaignSurfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "brief",
        excerpt: campaign.brief,
      },
    });

    collectCampaignBrandSnapshot(state, campaign, campaignSurfaces);
    collectCampaignProductAndDates(state, campaign);
    collectPricingRecords(state, {
      text: `${campaign.name} ${campaign.brief} ${campaign.goal}`,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "brief",
      },
      surfaces: ["text", "table", "website", "email", "social"],
    });
    collectCampaignDeliverables(state, campaign);
  });
}

export function collectScheduleRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.contentScheduleItems.forEach((item) => {
    const surface = mapChannelToSurface(item.channel);
    const source = {
      type: "schedule",
      id: item.id,
      label: item.title,
    };

    upsertRecord(state, {
      kind: "campaign-variable",
      label: `${item.channel} planned caption`,
      variableKey: `${slugify(item.channel)}_caption`,
      value: item.caption || item.title,
      surfaces: ["text", surface],
      status: item.status === "cancelled" ? "review" : "ready",
      source: {
        ...source,
        field: "caption",
        excerpt: item.caption || item.title,
      },
    });
    upsertRecord(state, {
      kind: "event",
      label: `${item.channel} schedule date`,
      variableKey: `${slugify(item.channel)}_scheduled_date`,
      value: formatDateValue(item.scheduledAt),
      surfaces: ["table", surface],
      status: item.status === "published" ? "ready" : "review",
      source: {
        ...source,
        field: "scheduledAt",
        excerpt: item.scheduledAt,
      },
    });
    collectPricingRecords(state, {
      text: `${item.title} ${item.caption}`,
      source: {
        ...source,
        field: "caption",
      },
      surfaces: ["text", "table", surface],
    });
  });
}

export function collectWebsiteRecords(
  state: DraftState,
  input: ContentDatabaseInput,
) {
  input.websitePublishes.forEach((publish) => {
    upsertRecord(state, {
      kind: "campaign-variable",
      label: "Website title",
      variableKey: "website_title",
      value: publish.title,
      surfaces: ["text", "website"],
      status: publish.status === "published" ? "ready" : "review",
      source: {
        type: "website",
        id: publish.id,
        label: publish.title,
        field: "title",
        excerpt: publish.title,
      },
    });
    upsertRecord(state, {
      kind: "campaign-variable",
      label: "Website SEO title",
      variableKey: "website_seo_title",
      value: publish.seoTitle,
      surfaces: ["text", "website"],
      status: publish.status === "published" ? "ready" : "review",
      source: {
        type: "website",
        id: publish.id,
        label: publish.title,
        field: "seoTitle",
        excerpt: publish.seoTitle,
      },
    });
    upsertRecord(state, {
      kind: "brand-copy",
      label: "Website SEO description",
      variableKey: "website_seo_description",
      value: publish.seoDescription,
      surfaces: ["text", "website"],
      status: publish.status === "published" ? "ready" : "review",
      source: {
        type: "website",
        id: publish.id,
        label: publish.title,
        field: "seoDescription",
        excerpt: publish.seoDescription,
      },
    });
    collectPricingRecords(state, {
      text: `${publish.title} ${publish.seoTitle} ${publish.seoDescription}`,
      source: {
        type: "website",
        id: publish.id,
        label: publish.title,
        field: "seoDescription",
      },
      surfaces: ["text", "table", "website"],
    });
  });
}

function collectCampaignBrandSnapshot(
  state: DraftState,
  campaign: ContentDatabaseInput["campaigns"][number],
  surfaces: ContentTemplateSurface[],
) {
  if (campaign.primaryBrandColor) {
    upsertRecord(state, {
      kind: "brand-copy",
      label: "Campaign brand color",
      variableKey: "brand_color",
      value: campaign.primaryBrandColor,
      surfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "primaryBrandColor",
        excerpt: campaign.primaryBrandColor,
      },
    });
  }

  if (campaign.brandLogoName) {
    upsertRecord(state, {
      kind: "brand-copy",
      label: "Campaign logo",
      variableKey: "brand_logo",
      value: campaign.brandLogoName,
      surfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "brandLogoName",
        excerpt: campaign.brandLogoName,
      },
    });
  }

  if (campaign.brandFontFamily) {
    upsertRecord(state, {
      kind: "brand-copy",
      label: "Campaign brand font",
      variableKey: "brand_heading_font",
      value: campaign.brandFontFamily,
      surfaces,
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "brandFontFamily",
        excerpt: campaign.brandFontFamily,
      },
    });
  }
}

function collectCampaignProductAndDates(
  state: DraftState,
  campaign: ContentDatabaseInput["campaigns"][number],
) {
  const productName = inferProductName(campaign.name, campaign.brief);

  if (productName) {
    upsertRecord(state, {
      kind: "product",
      label: "Campaign product",
      variableKey: "product_name",
      value: productName,
      surfaces: ["text", "table", "website", "email", "social"],
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "name",
        excerpt: productName,
      },
    });
  }

  if (campaign.launchAt) {
    upsertRecord(state, {
      kind: "event",
      label: "Launch date",
      variableKey: "launch_date",
      value: formatDateValue(campaign.launchAt),
      surfaces: ["text", "table", "website", "email", "social"],
      source: {
        type: "campaign",
        id: campaign.id,
        label: campaign.name,
        field: "launchAt",
        excerpt: campaign.launchAt,
      },
    });
  }
}

function collectCampaignDeliverables(
  state: DraftState,
  campaign: ContentDatabaseInput["campaigns"][number],
) {
  campaign.deliverables.forEach((deliverable) => {
    const surface = mapChannelToSurface(deliverable.channel);
    const value = deliverable.projectName || deliverable.role;

    upsertRecord(state, {
      kind: "campaign-variable",
      label: `${deliverable.channel} deliverable`,
      variableKey: `${slugify(deliverable.channel)}_deliverable`,
      value,
      surfaces: ["text", surface],
      status:
        deliverable.approvalStatus === "changes-requested" ? "review" : "ready",
      source: {
        type: "deliverable",
        id: deliverable.id,
        label: deliverable.role,
        field: "projectName",
        excerpt: value,
      },
    });
  });
}

function collectPricingRecords(
  state: DraftState,
  input: {
    text: string;
    source: {
      type: string;
      id: string;
      label: string;
      field: string;
    };
    surfaces: ContentTemplateSurface[];
  },
) {
  extractPricing(input.text).forEach((price) => {
    upsertRecord(state, {
      kind: "pricing",
      label: price.label,
      variableKey: price.variableKey,
      value: price.value,
      surfaces: input.surfaces,
      source: {
        ...input.source,
        excerpt: price.excerpt,
      },
    });
  });
}
