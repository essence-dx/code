import {
  createChartElement,
  createConnectorElement,
  createFormElement,
  createPage,
  createShapeElement,
  createStickyNoteElement,
  createTableElement,
  createTextElement,
} from "@/features/editor/document-factory";
import type { DesignDocument, DesignElement } from "@/features/editor/types";
import type { TemplateCatalogItem } from "@/features/templates/template-catalog";
import { applyTemplateLockingRules } from "@/features/templates/template-locking";

export function createTemplateCatalogDocument(
  item: TemplateCatalogItem,
): DesignDocument {
  let document: DesignDocument;

  if (item.format === "presentation") {
    document = createPresentationTemplate(item);
  } else if (item.format === "whiteboard") {
    document = createWhiteboardTemplate(item);
  } else if (item.format === "website") {
    document = createWebsiteTemplate(item);
  } else {
    const page = createPage({
      name: item.name,
      format: item.format,
      width: item.width,
      height: item.height,
      background: item.surfaceColor,
      notes: item.usageNotes,
      elements: createPosterLikeElements(item),
    });

    document = {
      version: 1,
      width: item.width,
      height: item.height,
      pages: [page],
      activePageId: page.id,
    };
  }

  return applyTemplateLockingRules(document, item);
}

function createPresentationTemplate(item: TemplateCatalogItem): DesignDocument {
  const pages = [
    createPage({
      name: "Promise",
      format: item.format,
      width: item.width,
      height: item.height,
      background: item.surfaceColor,
      notes: "Open with the sharpest promise and a concrete audience.",
      elements: createPosterLikeElements(item, {
        eyebrow: item.category,
        headline: item.name,
        subhead: item.description,
      }),
    }),
    createPage({
      name: "Proof",
      format: item.format,
      width: item.width,
      height: item.height,
      background: "#ffffff",
      notes: "Use metrics, customer proof, or progress evidence here.",
      elements: [
        block(item, 0.06, 0.08, 0.88, 0.84, "#ffffff", "#d4d4d8"),
        text(item, "Why this wins", 0.1, 0.13, 0.42, 0.11, 58, 800),
        ...metricCards(item),
        text(
          item,
          "Replace each proof card with a real metric, quote, or milestone.",
          0.1,
          0.76,
          0.72,
          0.08,
          28,
          500,
          "#475569",
        ),
      ],
    }),
    createPage({
      name: "Ask",
      format: item.format,
      width: item.width,
      height: item.height,
      background: item.textColor,
      notes: "Close with the exact next step.",
      elements: [
        text(item, "The next step", 0.09, 0.16, 0.62, 0.13, 64, 800, "#ffffff"),
        text(
          item,
          item.usageNotes,
          0.09,
          0.34,
          0.55,
          0.14,
          32,
          500,
          "#e2e8f0",
        ),
        block(item, 0.09, 0.62, 0.28, 0.12, item.accentColor, "transparent"),
        text(item, "Book follow-up", 0.12, 0.655, 0.22, 0.05, 26, 800, "#ffffff"),
      ],
    }),
  ];

  return {
    version: 1,
    width: item.width,
    height: item.height,
    pages,
    activePageId: pages[0].id,
  };
}

function createWhiteboardTemplate(item: TemplateCatalogItem): DesignDocument {
  const page = createPage({
    name: item.name,
    format: item.format,
    width: item.width,
    height: item.height,
    background: "#f8fafc",
    notes: item.usageNotes,
    elements: [
      text(item, item.name, 0.05, 0.05, 0.38, 0.08, 54, 800),
      text(item, item.description, 0.05, 0.13, 0.42, 0.06, 26, 500, "#475569"),
      ...["Signals", "Blockers", "Bets", "Owners"].flatMap((label, index) =>
        whiteboardColumn(item, label, index),
      ),
      createConnectorElement({
        x: Math.round(item.width * 0.25),
        y: Math.round(item.height * 0.48),
        width: Math.round(item.width * 0.5),
        height: 0,
        stroke: item.accentColor,
        strokeWidth: 5,
        endMarker: "arrow",
      }),
    ],
  });

  return {
    version: 1,
    width: item.width,
    height: item.height,
    pages: [page],
    activePageId: page.id,
    metadata: { canvasMode: "whiteboard" },
  };
}

function createWebsiteTemplate(item: TemplateCatalogItem): DesignDocument {
  const pages = [
    createPage({
      name: "Hero",
      format: item.format,
      width: item.width,
      height: 900,
      background: item.surfaceColor,
      websiteSeoTitle: item.name,
      websiteSeoDescription: item.description,
      websiteNavLabel: "Hero",
      elements: createPosterLikeElements(item, {
        headline: item.name,
        subhead: item.description,
      }),
    }),
    createPage({
      name: "Proof",
      format: item.format,
      width: item.width,
      height: item.height,
      background: "#ffffff",
      websiteSeoTitle: "Proof",
      websiteSeoDescription: "Key outcomes, trust signals, and reasons to act.",
      websiteNavLabel: "Proof",
      elements: [
        text(item, "Proof points", 0.08, 0.1, 0.5, 0.08, 56, 800),
        ...metricCards(item),
      ],
    }),
    createPage({
      name: "Contact",
      format: item.format,
      width: item.width,
      height: item.height,
      background: "#f8fafc",
      websiteSeoTitle: "Contact",
      websiteSeoDescription: "Collect interest from visitors with a simple form.",
      websiteNavLabel: "Contact",
      elements: [
        text(item, "Start the conversation", 0.08, 0.12, 0.52, 0.08, 48, 800),
        createFormElement({
          x: Math.round(item.width * 0.08),
          y: Math.round(item.height * 0.28),
          width: Math.round(item.width * 0.42),
          height: 220,
          label: "Email",
          placeholder: "you@example.com",
          accentColor: item.accentColor,
          surfaceColor: "#ffffff",
        }),
      ],
    }),
  ];

  return {
    version: 1,
    width: item.width,
    height: item.height,
    pages,
    activePageId: pages[0].id,
  };
}

function createPosterLikeElements(
  item: TemplateCatalogItem,
  overrides: {
    eyebrow?: string;
    headline?: string;
    subhead?: string;
  } = {},
): DesignElement[] {
  const headline = overrides.headline ?? item.name;
  const subhead = overrides.subhead ?? item.description;
  const eyebrow = overrides.eyebrow ?? `${item.category} / ${item.platform}`;

  const elements: DesignElement[] = [
    block(item, 0.06, 0.06, 0.88, 0.88, "#ffffff", "#d4d4d8"),
    block(item, 0.06, 0.06, 0.18, 0.88, item.accentColor, "transparent"),
    text(item, eyebrow, 0.28, 0.12, 0.5, 0.04, 22, 800, item.accentColor),
    text(item, headline, 0.28, 0.2, 0.54, 0.18, 58, 800, item.textColor),
    text(item, subhead, 0.28, 0.43, 0.52, 0.12, 28, 500, "#475569"),
    text(item, item.usageNotes, 0.28, 0.72, 0.48, 0.1, 20, 500, "#64748b"),
  ];

  if (item.format === "infographic") {
    elements.push(
      createChartElement({
        x: Math.round(item.width * 0.25),
        y: Math.round(item.height * 0.58),
        width: Math.round(item.width * 0.5),
        height: Math.round(item.height * 0.18),
        backgroundColor: item.surfaceColor,
        textColor: item.textColor,
        axisColor: item.accentColor,
      }),
    );
  }

  if (item.format === "email-template") {
    elements.push(
      createShapeElement({
        x: Math.round(item.width * 0.28),
        y: Math.round(item.height * 0.58),
        width: Math.round(item.width * 0.34),
        height: 84,
        fill: item.accentColor,
        radius: 16,
      }),
      text(item, "Read the update", 0.31, 0.6, 0.24, 0.04, 24, 800, "#ffffff"),
    );
  }

  if (item.format === "course") {
    elements.push(
      createTableElement({
        x: Math.round(item.width * 0.28),
        y: Math.round(item.height * 0.58),
        width: Math.round(item.width * 0.48),
        height: Math.round(item.height * 0.18),
        rows: 4,
        columns: 2,
        cells: [
          "Goal",
          "Activity",
          "Understand",
          "Read and mark",
          "Practice",
          "Solve examples",
          "Reflect",
          "Write takeaway",
        ],
        headerFill: item.accentColor,
      }),
    );
  }

  return elements;
}

function metricCards(item: TemplateCatalogItem): DesignElement[] {
  return ["Outcome", "Evidence", "Next step"].flatMap((label, index) => {
    const left = 0.1 + index * 0.28;

    return [
      block(item, left, 0.34, 0.22, 0.26, item.surfaceColor, "#d4d4d8"),
      text(item, label, left + 0.025, 0.38, 0.16, 0.05, 24, 800, item.textColor),
      text(
        item,
        "Replace with real proof.",
        left + 0.025,
        0.48,
        0.16,
        0.08,
        18,
        500,
        "#64748b",
      ),
    ];
  });
}

function whiteboardColumn(
  item: TemplateCatalogItem,
  label: string,
  index: number,
): DesignElement[] {
  const x = Math.round(item.width * (0.06 + index * 0.23));
  const y = Math.round(item.height * 0.27);
  const width = Math.round(item.width * 0.18);

  return [
    text(item, label, x / item.width, 0.22, 0.16, 0.05, 28, 800),
    createStickyNoteElement({
      x,
      y,
      width,
      height: 170,
      content: `${label} note`,
      fill: index % 2 ? "#dcfce7" : "#fef3c7",
      accentColor: item.accentColor,
    }),
    createStickyNoteElement({
      x,
      y: y + 210,
      width,
      height: 170,
      content: "Add detail",
      fill: "#ffffff",
      accentColor: item.accentColor,
    }),
  ];
}

function block(
  item: TemplateCatalogItem,
  x: number,
  y: number,
  width: number,
  height: number,
  fill: string,
  stroke: string,
) {
  return createShapeElement({
    x: Math.round(item.width * x),
    y: Math.round(item.height * y),
    width: Math.round(item.width * width),
    height: Math.round(item.height * height),
    fill,
    stroke,
    strokeWidth: stroke === "transparent" ? 0 : 2,
    radius: Math.max(8, Math.round(item.width * 0.015)),
  });
}

function text(
  item: TemplateCatalogItem,
  content: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
  fontWeight: number,
  color = item.textColor,
) {
  return createTextElement({
    content,
    x: Math.round(item.width * x),
    y: Math.round(item.height * y),
    width: Math.round(item.width * width),
    height: Math.round(item.height * height),
    fontSize,
    fontWeight,
    color,
    textAlign: "left",
  });
}
