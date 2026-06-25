import { defaultVariableCollections } from "@/features/editor/variable-bindings";
import type {
  DesignActivityEvent,
  DesignComment,
  DesignComponent,
  DesignDocument,
  DesignLayer,
  DesignPage,
} from "@/features/editor/types";

export const visualFixtureFileId = "visual-fixture-file";
export const visualFixtureShareToken = "visual-fixture";
export const visualFixtureTimestamp = "2026-05-15T00:00:00.000Z";

export function createVisualFixtureDocument(): DesignDocument {
  const component = createFixtureButtonComponent();

  return {
    version: 1,
    activePageId: "visual-page-dashboard",
    variables: {
      "color/surface": "#101114",
      "color/panel": "#f8fafc",
      "color/accent": "#14b8a6",
      "color/warning": "#f59e0b",
      "radius/default": "8",
      "space/default": "16",
    },
    activeVariableModeId: "default",
    variableModes: [{ id: "default", name: "Default" }],
    variableCollections: defaultVariableCollections,
    variableDefinitions: {
      "color/surface": {
        id: "color/surface",
        name: "color/surface",
        type: "color",
        collectionId: "paint",
        values: { default: "#101114" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      "color/panel": {
        id: "color/panel",
        name: "color/panel",
        type: "color",
        collectionId: "paint",
        values: { default: "#f8fafc" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      "color/accent": {
        id: "color/accent",
        name: "color/accent",
        type: "color",
        collectionId: "paint",
        values: { default: "#14b8a6" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      "color/warning": {
        id: "color/warning",
        name: "color/warning",
        type: "color",
        collectionId: "paint",
        values: { default: "#f59e0b" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      "radius/default": {
        id: "radius/default",
        name: "radius/default",
        type: "number",
        collectionId: "layout",
        values: { default: "8" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      "space/default": {
        id: "space/default",
        name: "space/default",
        type: "number",
        collectionId: "layout",
        values: { default: "16" },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    components: {
      [component.id]: component,
    },
    layoutGridStyles: {
      "grid-8": {
        id: "grid-8",
        name: "8 px grid",
        grid: {
          name: "8 px grid",
          kind: "grid",
          color: "#14b8a6",
          opacity: 0.16,
          size: 8,
          count: 12,
          gutter: 16,
          margin: 24,
          alignment: "stretch",
        },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    paintStyles: {
      "paint-accent": {
        id: "paint-accent",
        name: "Accent teal",
        value: "#14b8a6",
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    textStyles: {
      "text-title": {
        id: "text-title",
        name: "Title / 32",
        fontFamily: "Inter, Arial, sans-serif",
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: 0,
        textAlign: "left",
        textColor: "#111827",
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    effectStyles: {
      "effect-panel": {
        id: "effect-panel",
        name: "Panel shadow",
        shadowEnabled: true,
        shadowColor: "rgba(15, 23, 42, 0.14)",
        shadowX: 0,
        shadowY: 16,
        shadowBlur: 32,
        shadowSpread: 0,
        effectsVisible: true,
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    exportPresets: {
      handoff: {
        id: "handoff",
        name: "Fixture handoff",
        settings: {
          formats: ["svg", "png", "json"],
          includeManifest: true,
          scope: "page",
          scale: 2,
        },
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    activityEvents: createFixtureActivityEvents(),
    collaborationRoom: {
      version: 1,
      chatMessages: [
        {
          id: "fixture-chat-1",
          peerId: "fixture-peer-designer",
          name: "Mira Designer",
          email: "mira@example.com",
          color: "#14b8a6",
          text: "Ready for visual regression capture.",
          createdAt: Date.parse(visualFixtureTimestamp),
        },
      ],
      presenceEvents: [
        {
          id: "fixture-presence-1",
          kind: "joined",
          peerId: "fixture-peer-designer",
          peerName: "Mira Designer",
          peerEmail: "mira@example.com",
          color: "#14b8a6",
          detail: "Joined the deterministic fixture review.",
          createdAt: Date.parse(visualFixtureTimestamp),
        },
      ],
      updatedAt: visualFixtureTimestamp,
    },
    commentNotificationPreferences: {
      enabled: true,
      newComments: true,
      replies: true,
      assignments: true,
      mentions: true,
      reactions: true,
      acknowledgements: true,
      mutedEmails: [],
      updatedAt: visualFixtureTimestamp,
    },
    notificationDeliveries: [],
    updatedAt: visualFixtureTimestamp,
    pages: [createDashboardPage(), createPrototypePage()],
  };
}

function createDashboardPage(): DesignPage {
  return {
    id: "visual-page-dashboard",
    name: "Visual QA Dashboard",
    background: "#101114",
    prototypeStart: true,
    grid: {
      visible: true,
      snap: true,
      objectSnap: true,
      size: 8,
    },
    guides: [
      {
        id: "fixture-guide-x",
        orientation: "vertical",
        position: 120,
        createdAt: visualFixtureTimestamp,
      },
      {
        id: "fixture-guide-y",
        orientation: "horizontal",
        position: 96,
        createdAt: visualFixtureTimestamp,
      },
    ],
    comments: createFixtureComments(),
    layers: [
      createFrameLayer({
        id: "fixture-frame-dashboard",
        name: "Dashboard frame",
        x: 120,
        y: 96,
        width: 1080,
        height: 680,
        fill: "#f8fafc",
      }),
      createTextLayer({
        id: "fixture-title",
        name: "Visual QA title",
        text: "Deterministic visual QA",
        x: 168,
        y: 148,
        width: 460,
        height: 48,
        fontSize: 32,
        fontWeight: 700,
        textColor: "#111827",
      }),
      createTextLayer({
        id: "fixture-subtitle",
        name: "Visual QA subtitle",
        text: "Stable layers for screenshot capture, route probes, and pixel diffs.",
        x: 170,
        y: 204,
        width: 560,
        height: 44,
        fontSize: 16,
        fontWeight: 400,
        textColor: "#475569",
      }),
      createRectangleLayer({
        id: "fixture-metric-card-a",
        name: "Readiness metric",
        x: 168,
        y: 292,
        width: 240,
        height: 148,
        fill: "#ffffff",
        stroke: "#dbeafe",
      }),
      createTextLayer({
        id: "fixture-metric-a-label",
        name: "Readiness label",
        text: "Readiness",
        x: 194,
        y: 320,
        width: 160,
        height: 24,
        fontSize: 14,
        fontWeight: 600,
        textColor: "#475569",
      }),
      createTextLayer({
        id: "fixture-metric-a-value",
        name: "Readiness value",
        text: "96%",
        x: 194,
        y: 356,
        width: 120,
        height: 48,
        fontSize: 40,
        fontWeight: 700,
        textColor: "#0f172a",
      }),
      createRectangleLayer({
        id: "fixture-metric-card-b",
        name: "Route health metric",
        x: 432,
        y: 292,
        width: 240,
        height: 148,
        fill: "#ecfeff",
        stroke: "#67e8f9",
      }),
      createTextLayer({
        id: "fixture-metric-b-label",
        name: "Route label",
        text: "Routes",
        x: 458,
        y: 320,
        width: 160,
        height: 24,
        fontSize: 14,
        fontWeight: 600,
        textColor: "#155e75",
      }),
      createTextLayer({
        id: "fixture-metric-b-value",
        name: "Route value",
        text: "4/4",
        x: 458,
        y: 356,
        width: 120,
        height: 48,
        fontSize: 40,
        fontWeight: 700,
        textColor: "#164e63",
      }),
      createPathLayer(),
      createRectangleLayer({
        id: "fixture-button-instance",
        name: "Open prototype",
        componentId: "fixture-component-button",
        componentLayerId: "fixture-component-button-bg",
        componentProperties: { label: "Open prototype", state: "default" },
        x: 168,
        y: 516,
        width: 220,
        height: 56,
        fill: "#14b8a6",
        stroke: "#0f766e",
        prototype: {
          targetPageId: "visual-page-prototype",
          trigger: "click",
          action: "navigate",
          transition: "slide-left",
          durationMs: 220,
          preserveScroll: false,
          scrollBehavior: "reset",
          deviceFrame: "desktop",
        },
      }),
      createTextLayer({
        id: "fixture-button-label",
        name: "Button label",
        text: "Open prototype",
        x: 204,
        y: 534,
        width: 148,
        height: 22,
        fontSize: 15,
        fontWeight: 700,
        textColor: "#ecfeff",
      }),
    ],
  };
}

function createPrototypePage(): DesignPage {
  return {
    id: "visual-page-prototype",
    name: "Prototype Result",
    background: "#172554",
    comments: [],
    layers: [
      createFrameLayer({
        id: "fixture-frame-prototype",
        name: "Prototype frame",
        x: 180,
        y: 120,
        width: 760,
        height: 480,
        fill: "#eff6ff",
      }),
      createTextLayer({
        id: "fixture-prototype-title",
        name: "Prototype title",
        text: "Prototype target reached",
        x: 238,
        y: 200,
        width: 420,
        height: 46,
        fontSize: 30,
        fontWeight: 700,
        textColor: "#1e3a8a",
      }),
      createTextLayer({
        id: "fixture-prototype-copy",
        name: "Prototype copy",
        text: "This page gives the prototype preview and visual route probe a stable destination.",
        x: 240,
        y: 268,
        width: 520,
        height: 52,
        fontSize: 16,
        fontWeight: 400,
        textColor: "#334155",
      }),
    ],
  };
}

function createFixtureButtonComponent(): DesignComponent {
  return {
    id: "fixture-component-button",
    name: "Fixture Button",
    width: 220,
    height: 56,
    layers: [
      createRectangleLayer({
        id: "fixture-component-button-bg",
        name: "Button background",
        x: 0,
        y: 0,
        width: 220,
        height: 56,
        fill: "#14b8a6",
        stroke: "#0f766e",
      }),
      createTextLayer({
        id: "fixture-component-button-label",
        name: "Button text",
        text: "Open prototype",
        x: 36,
        y: 18,
        width: 148,
        height: 22,
        fontSize: 15,
        fontWeight: 700,
        textColor: "#ecfeff",
      }),
    ],
    propertyDefinitions: {
      label: {
        id: "label",
        name: "Label",
        type: "text",
        defaultValue: "Open prototype",
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
      state: {
        id: "state",
        name: "State",
        type: "variant",
        defaultValue: "default",
        options: ["default", "hover"],
        createdAt: visualFixtureTimestamp,
        updatedAt: visualFixtureTimestamp,
      },
    },
    variants: [],
    createdAt: visualFixtureTimestamp,
    updatedAt: visualFixtureTimestamp,
  };
}

function createFixtureComments(): DesignComment[] {
  return [
    {
      id: "fixture-comment-open",
      x: 730,
      y: 208,
      text: "Review the visual fixture before updating baselines.",
      mentions: ["qa@example.com"],
      assigneeName: "QA Owner",
      assigneeEmail: "qa@example.com",
      replies: [
        {
          id: "fixture-comment-reply",
          text: "Ready for deterministic capture.",
          mentions: [],
          authorName: "Mira Designer",
          createdAt: visualFixtureTimestamp,
          updatedAt: visualFixtureTimestamp,
        },
      ],
      reactions: [
        {
          id: "fixture-comment-reaction",
          kind: "check",
          actorName: "QA Owner",
          actorEmail: "qa@example.com",
          createdAt: visualFixtureTimestamp,
        },
      ],
      resolved: false,
      createdAt: visualFixtureTimestamp,
      updatedAt: visualFixtureTimestamp,
    },
  ];
}

function createFixtureActivityEvents(): DesignActivityEvent[] {
  return [
    {
      id: "fixture-activity-snapshot",
      kind: "export",
      actorName: "Visual QA",
      actorEmail: "qa@example.com",
      label: "Captured fixture snapshot",
      detail: "Deterministic editor state",
      targetId: visualFixtureFileId,
      createdAt: visualFixtureTimestamp,
    },
    {
      id: "fixture-activity-prototype",
      kind: "extension",
      actorName: "Visual QA",
      actorEmail: "qa@example.com",
      label: "Set prototype start page",
      detail: "Visual QA Dashboard",
      targetId: "visual-page-dashboard",
      createdAt: visualFixtureTimestamp,
    },
  ];
}

function createBaseLayer(input: {
  id: string;
  type: DesignLayer["type"];
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  cornerRadius?: number;
}): DesignLayer {
  return {
    id: input.id,
    type: input.type,
    name: input.name,
    x: input.x,
    y: input.y,
    width: input.width,
    height: input.height,
    rotation: 0,
    opacity: 1,
    visible: true,
    locked: false,
    fill: input.fill,
    stroke: input.stroke,
    strokeWidth: input.stroke === "transparent" ? 0 : 1,
    cornerRadius: input.cornerRadius ?? 10,
  };
}

function createFrameLayer(input: {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}): DesignLayer {
  return {
    ...createBaseLayer({
      ...input,
      type: "frame",
      stroke: "#cbd5e1",
      cornerRadius: 18,
    }),
    readyForDev: true,
    clipContent: true,
    layoutGrids: [
      {
        id: `${input.id}-grid`,
        name: "Fixture 8 px grid",
        kind: "grid",
        visible: true,
        color: "#14b8a6",
        opacity: 0.12,
        size: 8,
        count: 12,
        gutter: 16,
        margin: 24,
        alignment: "stretch",
      },
    ],
    shadowEnabled: true,
    shadowColor: "rgba(15, 23, 42, 0.16)",
    shadowX: 0,
    shadowY: 18,
    shadowBlur: 40,
    shadowSpread: 0,
    effectsVisible: true,
  };
}

function createRectangleLayer(input: {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string;
  componentId?: string;
  componentLayerId?: string;
  componentProperties?: Record<string, string>;
  prototype?: DesignLayer["prototype"];
}): DesignLayer {
  return {
    ...createBaseLayer({
      ...input,
      type: "rectangle",
      cornerRadius: 14,
    }),
    componentId: input.componentId,
    componentLayerId: input.componentLayerId,
    componentProperties: input.componentProperties,
    prototype: input.prototype,
    readyForDev: true,
    variableBindings: {
      fill: input.fill === "#14b8a6" ? "color/accent" : undefined,
      cornerRadius: "radius/default",
    },
  };
}

function createTextLayer(input: {
  id: string;
  name: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontWeight: number;
  textColor: string;
}): DesignLayer {
  return {
    ...createBaseLayer({
      ...input,
      type: "text",
      fill: "transparent",
      stroke: "transparent",
      cornerRadius: 0,
    }),
    text: input.text,
    fontFamily: "Inter, Arial, sans-serif",
    fontSize: input.fontSize,
    fontWeight: input.fontWeight,
    lineHeight: 1.15,
    letterSpacing: 0,
    textAlign: "left",
    textColor: input.textColor,
    textResizeMode: "fixed",
    readyForDev: true,
  };
}

function createPathLayer(): DesignLayer {
  return {
    ...createBaseLayer({
      id: "fixture-chart-path",
      type: "path",
      name: "Fixture trend path",
      x: 744,
      y: 296,
      width: 360,
      height: 160,
      fill: "transparent",
      stroke: "#14b8a6",
      cornerRadius: 0,
    }),
    strokeWidth: 4,
    strokeLineCap: "round",
    strokeLineJoin: "round",
    pathData: "M 0 132 C 72 84 98 104 156 60 S 250 36 360 18",
    pathViewBox: {
      x: 0,
      y: 0,
      width: 360,
      height: 160,
    },
    fillRule: "nonzero",
    readyForDev: true,
  };
}
