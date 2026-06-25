import type { DesignDocument } from "@/features/editor/types";

type SpeakerNotesExportInput = {
  projectName: string;
  document: DesignDocument;
};

type SpeakerNotesImportResult =
  | {
      ok: true;
      document: DesignDocument;
      updatedPages: number;
    }
  | {
      ok: false;
      message: string;
    };

export function createSpeakerNotesMarkdown({
  projectName,
  document,
}: SpeakerNotesExportInput) {
  const lines = [`# ${projectName} speaker notes`, ""];

  document.pages.forEach((page, index) => {
    lines.push(`## ${index + 1}. ${page.name}`);
    lines.push(`<!-- slide-id: ${page.id} -->`);
    lines.push("");
    lines.push(page.notes?.trim() || "_No speaker notes._");
    lines.push("");
  });

  return lines.join("\n").trimEnd() + "\n";
}

export function importSpeakerNotesMarkdown(
  document: DesignDocument,
  markdown: string,
): SpeakerNotesImportResult {
  const sections = parseSpeakerNoteSections(markdown);

  if (sections.length === 0) {
    return {
      ok: false,
      message: "No slide note sections were found.",
    };
  }

  const notesByPageId = new Map<string, string>();
  const notesByIndex = new Map<number, string>();

  for (const section of sections) {
    if (section.pageId) {
      notesByPageId.set(section.pageId, section.notes);
    } else if (section.index !== null) {
      notesByIndex.set(section.index, section.notes);
    }
  }

  let updatedPages = 0;
  const pages = document.pages.map((page, index) => {
    const importedNotes = notesByPageId.get(page.id) ?? notesByIndex.get(index);

    if (importedNotes === undefined) return page;
    if ((page.notes ?? "") === importedNotes) return page;

    updatedPages += 1;
    return {
      ...page,
      notes: importedNotes,
    };
  });

  if (updatedPages === 0) {
    return {
      ok: false,
      message: "No matching slide notes changed.",
    };
  }

  return {
    ok: true,
    document: {
      ...document,
      pages,
    },
    updatedPages,
  };
}

export function createPresentationOutline(document: DesignDocument) {
  return document.pages.map((page, index) => ({
    id: page.id,
    number: index + 1,
    name: page.name,
    notesPreview: summarizeNotes(page.notes ?? ""),
    elementCount: page.elements.filter((element) => !element.hidden).length,
  }));
}

function parseSpeakerNoteSections(markdown: string) {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const matches = [...normalized.matchAll(/^##\s+(.+)$/gm)];

  return matches.map((match, sectionIndex) => {
    const contentStart = (match.index ?? 0) + match[0].length;
    const contentEnd =
      sectionIndex + 1 < matches.length
        ? (matches[sectionIndex + 1].index ?? normalized.length)
        : normalized.length;
    const heading = match[1].trim();
    const index = readHeadingIndex(heading);
    const body = normalized.slice(contentStart, contentEnd).trim();
    const pageId = body.match(/<!--\s*slide-id:\s*([^>]+?)\s*-->/)?.[1].trim();
    const notes = body
      .replace(/<!--\s*slide-id:\s*([^>]+?)\s*-->/, "")
      .trim()
      .replace(/^_No speaker notes\._$/i, "");

    return {
      pageId: pageId || null,
      index,
      notes,
    };
  });
}

function readHeadingIndex(heading: string) {
  const match = heading.match(/^(\d+)[.)\s-]/);
  if (!match) return null;

  const index = Number(match[1]) - 1;
  return Number.isInteger(index) && index >= 0 ? index : null;
}

function summarizeNotes(notes: string) {
  const normalized = notes.trim().replace(/\s+/g, " ");

  if (!normalized) return "No notes";
  if (normalized.length <= 96) return normalized;

  return `${normalized.slice(0, 93)}...`;
}
