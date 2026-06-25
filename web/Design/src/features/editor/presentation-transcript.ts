import type {
  DesignDocument,
  DesignPage,
  TextElement,
} from "@/features/editor/types";

type PresentationTranscriptInput = {
  projectName: string;
  document: DesignDocument;
};

export function createPresentationTranscript({
  projectName,
  document,
}: PresentationTranscriptInput) {
  const lines = [`# ${projectName} transcript`, ""];

  document.pages.forEach((page, index) => {
    const slideText = getSlideText(page);
    const notes = page.notes?.trim();

    lines.push(`## ${index + 1}. ${page.name}`);
    lines.push("");

    if (slideText) {
      lines.push("### Slide text");
      lines.push(slideText);
      lines.push("");
    }

    if (notes) {
      lines.push("### Speaker notes");
      lines.push(notes);
      lines.push("");
    }

    if (!slideText && !notes) {
      lines.push("_No text or speaker notes._");
      lines.push("");
    }
  });

  return lines.join("\n").trimEnd() + "\n";
}

export function createPresentationCaptionsVtt({
  projectName,
  document,
}: PresentationTranscriptInput) {
  const cues = document.pages
    .map((page, index) => {
      const text = page.notes?.trim() || getSlideText(page) || page.name;
      const start = index * 10;
      const end = start + 10;

      return [
        String(index + 1),
        `${formatVttTime(start)} --> ${formatVttTime(end)}`,
        `${page.name}: ${text.replace(/\s+/g, " ")}`,
      ].join("\n");
    })
    .join("\n\n");

  return `WEBVTT\n\nNOTE ${projectName}\n\n${cues}\n`;
}

function getSlideText(page: DesignPage) {
  return page.elements
    .filter(isVisibleTextElement)
    .map((element) => element.content.trim())
    .filter(Boolean)
    .join("\n\n");
}

function isVisibleTextElement(
  element: DesignPage["elements"][number],
): element is TextElement {
  return element.type === "text" && !element.hidden;
}

function formatVttTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0",
  )}:${String(seconds).padStart(2, "0")}.000`;
}
