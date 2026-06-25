export type AiSourceBriefKind = "article" | "pdf" | "transcript" | "text";
export type AiSourceExtraction = "plain-text" | "html-text" | "pdf-selectable-text" | "pdf-embedded-ocr";

export interface AiSourceBrief {
  filename: string;
  kind: AiSourceBriefKind;
  extraction: AiSourceExtraction;
  text: string;
  byteLength: number;
  warning?: string;
}

const MAX_SOURCE_BYTES = 4 * 1024 * 1024;
const MAX_PROMPT_SOURCE_CHARS = 3200;

export class AiSourceIngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiSourceIngestError";
  }
}

export async function readAiSourceBrief(file: File): Promise<AiSourceBrief> {
  if (file.size <= 0) {
    throw new AiSourceIngestError("Choose a file with readable text.");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new AiSourceIngestError("Choose a source file under 4 MB.");
  }

  const kind = sourceKindFromFile(file);
  const source = kind === "pdf" ? await readPdfText(file) : { text: await readPlainText(file), extraction: plainTextExtraction(file) };
  const text = normalizeSourceText(source.text);

  if (text.length < 20) {
    throw new AiSourceIngestError(
      kind === "pdf"
        ? "This PDF has no selectable or embedded OCR text. Paste OCR text, then run Video."
        : "Choose a source file with more readable text.",
    );
  }

  const truncated = text.length > MAX_PROMPT_SOURCE_CHARS;

  return {
    filename: file.name,
    kind,
    extraction: source.extraction,
    text: truncated ? text.slice(0, MAX_PROMPT_SOURCE_CHARS).trim() : text,
    byteLength: file.size,
    warning: truncated ? "Long source trimmed to fit the AI request limit." : undefined,
  };
}

export function createVideoProjectPromptFromSource(brief: AiSourceBrief) {
  const label = brief.kind === "pdf" ? "PDF" : brief.kind;
  const warning = brief.warning ? `\nConstraint: ${brief.warning}` : "";

  return [
    `Create an editable short video project from this ${label} source.`,
    `Source file: ${brief.filename}.`,
    `Extraction: ${brief.extraction}.`,
    "Use concise scenes, caption-ready narration, stock-search-friendly B-roll queries, and a practical social export preset.",
    warning,
    "Source text:",
    brief.text,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 3990);
}

function sourceKindFromFile(file: File): AiSourceBriefKind {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (name.endsWith(".srt") || name.endsWith(".vtt")) return "transcript";
  if (name.endsWith(".html") || name.endsWith(".htm") || name.endsWith(".md") || name.endsWith(".markdown")) return "article";
  return "text";
}

function plainTextExtraction(file: File): AiSourceExtraction {
  return file.name.toLowerCase().match(/\.html?$/) ? "html-text" : "plain-text";
}

async function readPlainText(file: File) {
  const text = await file.text();
  return file.name.toLowerCase().match(/\.html?$/) ? text.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ") : text;
}

async function readPdfText(file: File) {
  const buffer = await file.arrayBuffer();
  const binary = new TextDecoder("latin1").decode(buffer);
  const embeddedOcrStrings = [...binary.matchAll(/\/ActualText\s*(\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>)/g)].map((match) => decodePdfStringToken(match[1] ?? ""));
  const literalStrings = [...binary.matchAll(/(\((?:\\.|[^\\)]){2,}\))\s*Tj/g)].map((match) => decodePdfStringToken(match[1] ?? ""));
  const hexStrings = [...binary.matchAll(/(<[\dA-Fa-f\s]{4,}>)\s*Tj/g)].map((match) => decodePdfStringToken(match[1] ?? ""));
  const arrayStrings = [...binary.matchAll(/\[(?:\s*(?:\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>)\s*-?\d*)+\s*\]\s*TJ/g)].map((match) =>
    [...match[0].matchAll(/(\((?:\\.|[^\\)])*\)|<[\dA-Fa-f\s]+>)/g)].map((part) => decodePdfStringToken(part[1] ?? "")).join(" "),
  );

  return {
    text: [...embeddedOcrStrings, ...literalStrings, ...hexStrings, ...arrayStrings].join(" "),
    extraction: embeddedOcrStrings.some(Boolean) ? "pdf-embedded-ocr" : "pdf-selectable-text",
  } satisfies { text: string; extraction: AiSourceExtraction };
}

function decodePdfStringToken(token: string) {
  if (token.startsWith("(") && token.endsWith(")")) {
    return decodePdfLiteral(token.slice(1, -1));
  }
  if (token.startsWith("<") && token.endsWith(">")) {
    return decodePdfHex(token.slice(1, -1));
  }
  return "";
}

function decodePdfLiteral(value: string) {
  return value
    .replace(/\\([nrtbf()\\])/g, (_, code: string) => {
      if (code === "n") return "\n";
      if (code === "r") return "\r";
      if (code === "t") return "\t";
      if (code === "b") return "\b";
      if (code === "f") return "\f";
      return code;
    })
    .replace(/\\([0-7]{1,3})/g, (_, code: string) => String.fromCharCode(Number.parseInt(code, 8)));
}

function decodePdfHex(value: string) {
  const normalized = value.replace(/\s+/g, "");
  if (!normalized) return "";

  const padded = normalized.length % 2 === 0 ? normalized : `${normalized}0`;
  const bytes = padded.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)).filter((byte) => Number.isFinite(byte)) ?? [];
  if (!bytes.length) return "";

  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    return decodeUtf16Be(bytes.slice(2));
  }

  if (isLikelyUtf16Be(bytes)) {
    return decodeUtf16Be(bytes);
  }

  const buffer = Uint8Array.from(bytes);
  const utf8 = new TextDecoder().decode(buffer);
  return utf8.includes("\ufffd") ? new TextDecoder("latin1").decode(buffer) : utf8;
}

function isLikelyUtf16Be(bytes: number[]) {
  if (bytes.length < 4 || bytes.length % 2 !== 0) return false;

  const pairs = bytes.length / 2;
  let asciiPairs = 0;
  for (let index = 0; index < bytes.length; index += 2) {
    const high = bytes[index] ?? 0;
    const low = bytes[index + 1] ?? 0;
    if (high === 0 && low >= 0x09 && low <= 0x7e) {
      asciiPairs += 1;
    }
  }

  return asciiPairs >= Math.max(2, Math.ceil(pairs * 0.6));
}

function decodeUtf16Be(bytes: number[]) {
  let output = "";
  for (let index = 0; index < bytes.length; index += 2) {
    output += String.fromCharCode(((bytes[index] ?? 0) << 8) | (bytes[index + 1] ?? 0));
  }
  return output;
}

function normalizeSourceText(value: string) {
  return value
    .replace(/\u0000/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
