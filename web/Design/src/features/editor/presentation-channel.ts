export type PresentationCommandAction =
  | "first"
  | "previous"
  | "next"
  | "last"
  | "go-to";

export type PresentationChannelMessage =
  | {
      type: "command";
      action: PresentationCommandAction;
      slideIndex?: number;
    }
  | {
      type: "state";
      activeIndex: number;
      slideCount: number;
      pageName: string;
    };

export function getPresentationChannelName(projectId: string) {
  return `essence-studio:presentation:${projectId}`;
}

export function isPresentationChannelMessage(
  value: unknown,
): value is PresentationChannelMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Record<string, unknown>;

  if (message.type === "state") {
    return (
      typeof message.activeIndex === "number" &&
      typeof message.slideCount === "number" &&
      typeof message.pageName === "string"
    );
  }

  if (message.type === "command") {
    return (
      message.action === "first" ||
      message.action === "previous" ||
      message.action === "next" ||
      message.action === "last" ||
      message.action === "go-to"
    );
  }

  return false;
}

export function getNextSlideIndex(input: {
  currentIndex: number;
  slideCount: number;
  action: PresentationCommandAction;
  slideIndex?: number;
}) {
  const lastIndex = Math.max(0, input.slideCount - 1);

  if (input.action === "first") return 0;
  if (input.action === "previous") return Math.max(0, input.currentIndex - 1);
  if (input.action === "next")
    return Math.min(lastIndex, input.currentIndex + 1);
  if (input.action === "last") return lastIndex;

  return Math.max(
    0,
    Math.min(input.slideIndex ?? input.currentIndex, lastIndex),
  );
}
