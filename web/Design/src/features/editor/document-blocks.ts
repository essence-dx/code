import { nanoid } from "nanoid";

import type {
  DocumentBlock,
  DocumentBlockKind,
  DocumentElement,
} from "@/features/editor/types";

export type DocumentOutlineItem = {
  id: string;
  text: string;
  level: 1 | 2;
  blockIndex: number;
};

export const documentBlockKinds = [
  "heading",
  "subheading",
  "paragraph",
  "quote",
  "page-break",
] satisfies DocumentBlockKind[];

export function createDefaultDocumentBlocks(): DocumentBlock[] {
  return [
    createDocumentBlock({
      kind: "heading",
      content: "A clear document title",
    }),
    createDocumentBlock({
      kind: "paragraph",
      content:
        "Write a useful opening paragraph. This layer flows text into columns, keeps page breaks visible, and stores review comments beside each block.",
    }),
    createDocumentBlock({
      kind: "subheading",
      content: "Section heading",
    }),
    createDocumentBlock({
      kind: "paragraph",
      content:
        "Add paragraphs, quotes, and page breaks from the properties panel. Export keeps this structure readable in DOCX.",
    }),
  ];
}

export function createDocumentBlock({
  id,
  kind = "paragraph",
  content = "",
  comment = "",
}: Partial<DocumentBlock> = {}): DocumentBlock {
  return {
    id: typeof id === "string" && id.trim() ? id : nanoid(),
    kind: normalizeDocumentBlockKind(kind),
    content,
    ...(comment ? { comment } : {}),
  };
}

export function normalizeDocumentBlockKind(
  value?: string | null,
): DocumentBlockKind {
  return documentBlockKinds.includes(value as DocumentBlockKind)
    ? (value as DocumentBlockKind)
    : "paragraph";
}

export function normalizeDocumentColumns(value?: number | null): 1 | 2 | 3 {
  if (value === 2 || value === 3) return value;

  return 1;
}

export function normalizeDocumentBlocks(
  blocks?: readonly Partial<DocumentBlock>[] | null,
): DocumentBlock[] {
  const normalized = (blocks ?? [])
    .map((block) =>
      createDocumentBlock({
        id: block.id,
        kind: block.kind,
        content: block.content ?? "",
        comment: block.comment ?? "",
      }),
    )
    .filter((block) => block.kind === "page-break" || block.content.trim());

  return normalized.length > 0 ? normalized : createDefaultDocumentBlocks();
}

export function getDocumentOutline(
  blocks: readonly DocumentBlock[],
): DocumentOutlineItem[] {
  return blocks.flatMap((block, blockIndex) => {
    if (block.kind !== "heading" && block.kind !== "subheading") return [];

    const text = block.content.trim();
    if (!text) return [];

    return [
      {
        id: block.id,
        text,
        level: block.kind === "heading" ? 1 : 2,
        blockIndex,
      },
    ];
  });
}

export function getDocumentPlainText(element: DocumentElement) {
  return element.blocks
    .map((block) => {
      if (block.kind === "page-break") return "\n--- page break ---\n";

      return block.content;
    })
    .join("\n\n")
    .trim();
}
