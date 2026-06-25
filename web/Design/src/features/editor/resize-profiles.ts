import type {
  AudioElement,
  ChartElement,
  ConnectorElement,
  DesignDocument,
  DesignElement,
  EmbedElement,
  FormElement,
  ImageElement,
  PdfElement,
  QrCodeElement,
  ShapeElement,
  StickyNoteElement,
  SvgElement,
  TableElement,
  TextElement,
  TimerElement,
} from "@/features/editor/types";

export type ResizeProfileGroup =
  | "social"
  | "presentation"
  | "print"
  | "website"
  | "email";

export type DesignResizeProfile = {
  id: string;
  name: string;
  group: ResizeProfileGroup;
  description: string;
  width: number;
  height: number;
};

export const designResizeProfiles: DesignResizeProfile[] = [
  {
    id: "instagram-square",
    name: "Instagram square",
    group: "social",
    description: "Feed post at 1:1.",
    width: 1080,
    height: 1080,
  },
  {
    id: "instagram-portrait",
    name: "Instagram portrait",
    group: "social",
    description: "Feed post at 4:5.",
    width: 1080,
    height: 1350,
  },
  {
    id: "story-reel",
    name: "Story / reel",
    group: "social",
    description: "Vertical 9:16 social story.",
    width: 1080,
    height: 1920,
  },
  {
    id: "youtube-thumbnail",
    name: "YouTube thumbnail",
    group: "social",
    description: "Wide thumbnail at 16:9.",
    width: 1280,
    height: 720,
  },
  {
    id: "presentation-wide",
    name: "Presentation wide",
    group: "presentation",
    description: "16:9 deck slide.",
    width: 1920,
    height: 1080,
  },
  {
    id: "presentation-standard",
    name: "Presentation standard",
    group: "presentation",
    description: "4:3 deck slide.",
    width: 1600,
    height: 1200,
  },
  {
    id: "a4-document",
    name: "A4 document",
    group: "print",
    description: "Vertical print page.",
    width: 794,
    height: 1123,
  },
  {
    id: "us-letter",
    name: "US letter",
    group: "print",
    description: "Letter-size print page.",
    width: 816,
    height: 1056,
  },
  {
    id: "business-card",
    name: "Business card",
    group: "print",
    description: "Horizontal card artwork.",
    width: 1050,
    height: 600,
  },
  {
    id: "website-hero",
    name: "Website hero",
    group: "website",
    description: "Responsive landing hero canvas.",
    width: 1440,
    height: 900,
  },
  {
    id: "website-page",
    name: "Website page",
    group: "website",
    description: "Long page design canvas.",
    width: 1440,
    height: 2200,
  },
  {
    id: "email-newsletter",
    name: "Email newsletter",
    group: "email",
    description: "Email-safe newsletter canvas.",
    width: 1200,
    height: 1800,
  },
  {
    id: "email-banner",
    name: "Email banner",
    group: "email",
    description: "Wide email header artwork.",
    width: 1200,
    height: 420,
  },
];

export function getDesignResizeProfile(value: FormDataEntryValue | null) {
  return designResizeProfiles.find((profile) => profile.id === value) ?? null;
}

export function resizeDesignDocument(input: {
  document: DesignDocument;
  profile: DesignResizeProfile;
  sourceProjectId: string;
  sourceProjectName: string;
}): DesignDocument {
  const { document, profile } = input;
  const sourceWidth = Math.max(1, document.width);
  const sourceHeight = Math.max(1, document.height);
  const scale = Math.min(
    profile.width / sourceWidth,
    profile.height / sourceHeight,
  );
  const offsetX = (profile.width - sourceWidth * scale) / 2;
  const offsetY = (profile.height - sourceHeight * scale) / 2;

  return {
    ...document,
    width: profile.width,
    height: profile.height,
    metadata: {
      ...document.metadata,
      sourceProjectId: input.sourceProjectId,
      sourceProjectName: input.sourceProjectName,
      variantProfileId: profile.id,
      variantName: profile.name,
      variantCreatedAt: new Date().toISOString(),
      sourceWidth: document.width,
      sourceHeight: document.height,
    },
    pages: document.pages.map((page) => ({
      ...page,
      elements: page.elements.map((element) =>
        resizeElement(element, scale, offsetX, offsetY),
      ),
    })),
  };
}

function resizeElement(
  element: DesignElement,
  scale: number,
  offsetX: number,
  offsetY: number,
): DesignElement {
  const base = {
    ...element,
    x: round(element.x * scale + offsetX),
    y: round(element.y * scale + offsetY),
    width: Math.max(1, round(element.width * scale)),
    height: Math.max(1, round(element.height * scale)),
  };

  if (element.type === "text") {
    return resizeTextElement(base as TextElement, scale);
  }

  if (element.type === "shape") {
    return resizeShapeElement(base as ShapeElement, scale);
  }

  if (element.type === "sticky-note") {
    return resizeStickyNoteElement(base as StickyNoteElement, scale);
  }

  if (element.type === "connector") {
    return resizeConnectorElement(base as ConnectorElement, scale);
  }

  if (element.type === "image") {
    return resizeImageElement(base as ImageElement, scale);
  }

  if (element.type === "audio") {
    return resizeAudioElement(base as AudioElement, scale);
  }

  if (element.type === "pdf") {
    return resizePdfElement(base as PdfElement, scale);
  }

  if (element.type === "svg") {
    return resizeSvgElement(base as SvgElement, scale);
  }

  if (element.type === "qr") {
    return resizeQrElement(base as QrCodeElement, scale);
  }

  if (element.type === "table") {
    return resizeTableElement(base as TableElement, scale);
  }

  if (element.type === "chart") {
    return resizeChartElement(base as ChartElement, scale);
  }

  if (element.type === "form") {
    return resizeFormElement(base as FormElement, scale);
  }

  if (element.type === "embed") {
    return resizeEmbedElement(base as EmbedElement, scale);
  }

  if (element.type === "timer") {
    return resizeTimerElement(base as TimerElement, scale);
  }

  return base as DesignElement;
}

function resizeTextElement(element: TextElement, scale: number): TextElement {
  return {
    ...element,
    fontSize: scaledNumber(element.fontSize, scale, 1),
    letterSpacing: scaledNumber(element.letterSpacing, scale, 0),
    textEffectBlur: scaledOptionalNumber(element.textEffectBlur, scale, 0),
    textEffectOffsetX: scaledOptionalNumber(element.textEffectOffsetX, scale, 0),
    textEffectOffsetY: scaledOptionalNumber(element.textEffectOffsetY, scale, 0),
    textOutlineWidth: scaledOptionalNumber(element.textOutlineWidth, scale, 0),
  };
}

function resizeShapeElement(element: ShapeElement, scale: number): ShapeElement {
  return {
    ...element,
    strokeWidth: scaledNumber(element.strokeWidth, scale, 0),
    radius: scaledNumber(element.radius, scale, 0),
  };
}

function resizeStickyNoteElement(
  element: StickyNoteElement,
  scale: number,
): StickyNoteElement {
  return {
    ...element,
    fontSize: scaledNumber(element.fontSize, scale, 1),
    radius: scaledNumber(element.radius, scale, 0),
  };
}

function resizeConnectorElement(
  element: ConnectorElement,
  scale: number,
): ConnectorElement {
  return {
    ...element,
    strokeWidth: scaledNumber(element.strokeWidth, scale, 0),
    labelFontSize: scaledNumber(element.labelFontSize, scale, 1),
  };
}

function resizeImageElement(element: ImageElement, scale: number): ImageElement {
  return {
    ...element,
    maskRadius: scaledOptionalNumber(element.maskRadius, scale, 0),
    frameWidth: scaledOptionalNumber(element.frameWidth, scale, 0),
  };
}

function resizeAudioElement(element: AudioElement, scale: number): AudioElement {
  return resizePanelElement(element, scale);
}

function resizePdfElement(element: PdfElement, scale: number): PdfElement {
  return resizePanelElement(element, scale);
}

function resizeSvgElement(element: SvgElement, scale: number): SvgElement {
  return {
    ...element,
    strokeWidth: scaledNumber(element.strokeWidth, scale, 0),
  };
}

function resizeQrElement(element: QrCodeElement, scale: number): QrCodeElement {
  return {
    ...element,
    qrMargin: scaledNumber(element.qrMargin, scale, 0),
  };
}

function resizeTableElement(element: TableElement, scale: number): TableElement {
  return {
    ...element,
    fontSize: scaledNumber(element.fontSize, scale, 1),
    borderWidth: scaledNumber(element.borderWidth, scale, 0),
    cellPadding: scaledNumber(element.cellPadding, scale, 0),
  };
}

function resizeChartElement(element: ChartElement, scale: number): ChartElement {
  return {
    ...element,
    fontSize: scaledNumber(element.fontSize, scale, 1),
    strokeWidth: scaledNumber(element.strokeWidth, scale, 0),
  };
}

function resizeFormElement(element: FormElement, scale: number): FormElement {
  return resizePanelElement(
    {
      ...element,
      fontSize: scaledNumber(element.fontSize, scale, 1),
    },
    scale,
  );
}

function resizeEmbedElement(element: EmbedElement, scale: number): EmbedElement {
  return resizePanelElement(
    {
      ...element,
      fontSize: scaledNumber(element.fontSize, scale, 1),
    },
    scale,
  );
}

function resizeTimerElement(element: TimerElement, scale: number): TimerElement {
  return resizePanelElement(
    {
      ...element,
      fontSize: scaledNumber(element.fontSize, scale, 1),
    },
    scale,
  );
}

function resizePanelElement<
  Element extends {
    borderWidth: number;
    radius: number;
    padding: number;
  },
>(element: Element, scale: number): Element {
  return {
    ...element,
    borderWidth: scaledNumber(element.borderWidth, scale, 0),
    radius: scaledNumber(element.radius, scale, 0),
    padding: scaledNumber(element.padding, scale, 0),
  };
}

function scaledOptionalNumber(
  value: number | undefined,
  scale: number,
  min: number,
) {
  return value === undefined ? value : scaledNumber(value, scale, min);
}

function scaledNumber(value: number, scale: number, min: number) {
  return Math.max(min, round(value * scale));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
