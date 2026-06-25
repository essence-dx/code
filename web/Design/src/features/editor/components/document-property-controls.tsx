"use client";

import {
  Columns3,
  Heading1,
  MessageSquareText,
  Pilcrow,
  Plus,
  Quote,
  Rows3,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdjustmentSlider,
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import {
  createDocumentBlock,
  documentBlockKinds,
  getDocumentOutline,
  normalizeDocumentBlockKind,
  normalizeDocumentColumns,
} from "@/features/editor/document-blocks";
import type {
  DesignElement,
  DocumentBlock,
  DocumentBlockKind,
  DocumentElement,
} from "@/features/editor/types";

const blockKindLabels: Record<DocumentBlockKind, string> = {
  heading: "Heading",
  subheading: "Subheading",
  paragraph: "Paragraph",
  quote: "Quote",
  "page-break": "Page break",
};

const blockKindIcons: Record<DocumentBlockKind, typeof Pilcrow> = {
  heading: Heading1,
  subheading: Rows3,
  paragraph: Pilcrow,
  quote: Quote,
  "page-break": Columns3,
};

export function DocumentControls({
  element,
  onUpdateElement,
}: {
  element: DocumentElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  const outline = getDocumentOutline(element.blocks);

  function updateDocument(updates: Partial<DocumentElement>) {
    onUpdateElement(updates as Partial<DesignElement>);
  }

  function updateBlock(blockId: string, updates: Partial<DocumentBlock>) {
    updateDocument({
      blocks: element.blocks.map((block) =>
        block.id === blockId ? { ...block, ...updates } : block,
      ),
    });
  }

  function removeBlock(blockId: string) {
    if (element.blocks.length <= 1) return;

    updateDocument({
      blocks: element.blocks.filter((block) => block.id !== blockId),
    });
  }

  function addBlock(kind: DocumentBlockKind) {
    updateDocument({
      blocks: [
        ...element.blocks,
        createDocumentBlock({
          kind,
          content: kind === "page-break" ? "" : defaultBlockContent(kind),
        }),
      ],
    });
  }

  return (
    <Field label="Document">
      <div className="space-y-4">
        <Field label="Title">
          <Input
            value={element.title}
            onChange={(event) => updateDocument({ title: event.target.value })}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Columns">
            <Select
              value={String(element.columns)}
              onValueChange={(columns) =>
                updateDocument({
                  columns: normalizeDocumentColumns(Number(columns)),
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">One column</SelectItem>
                <SelectItem value="2">Two columns</SelectItem>
                <SelectItem value="3">Three columns</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <NumberField
            label="Column gap"
            value={element.columnGap}
            min={8}
            max={120}
            onChange={(columnGap) => updateDocument({ columnGap })}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Padding"
            value={element.padding}
            min={0}
            max={120}
            onChange={(padding) => updateDocument({ padding })}
          />
          <NumberField
            label="Radius"
            value={element.radius}
            min={0}
            max={80}
            onChange={(radius) => updateDocument({ radius })}
          />
        </div>

        <AdjustmentSlider
          label="Line height"
          value={Math.round(element.lineHeight * 100)}
          min={100}
          max={220}
          suffix="%"
          onChange={(lineHeight) => updateDocument({ lineHeight: lineHeight / 100 })}
        />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Text">
            <Input
              type="color"
              value={element.textColor}
              onChange={(event) =>
                updateDocument({ textColor: event.target.value })
              }
            />
          </Field>
          <Field label="Headings">
            <Input
              type="color"
              value={element.headingColor}
              onChange={(event) =>
                updateDocument({ headingColor: event.target.value })
              }
            />
          </Field>
        </div>

        <div className="rounded-md border border-border bg-muted/30 p-3">
          <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
            Outline
          </div>
          {outline.length > 0 ? (
            <div className="space-y-1">
              {outline.map((item) => (
                <div
                  key={item.id}
                  className="truncate text-xs text-muted-foreground"
                  style={{ paddingLeft: item.level === 2 ? 14 : 0 }}
                >
                  {item.text}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No headings yet.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {documentBlockKinds.map((kind) => {
            const Icon = blockKindIcons[kind];

            return (
              <Button
                key={kind}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addBlock(kind)}
              >
                <Icon className="h-3.5 w-3.5" />
                {blockKindLabels[kind]}
              </Button>
            );
          })}
        </div>

        <div className="space-y-3">
          {element.blocks.map((block, index) => (
            <DocumentBlockEditor
              key={block.id}
              block={block}
              index={index}
              canRemove={element.blocks.length > 1}
              onUpdate={(updates) => updateBlock(block.id, updates)}
              onRemove={() => removeBlock(block.id)}
            />
          ))}
        </div>
      </div>
    </Field>
  );
}

function DocumentBlockEditor({
  block,
  index,
  canRemove,
  onUpdate,
  onRemove,
}: {
  block: DocumentBlock;
  index: number;
  canRemove: boolean;
  onUpdate: (updates: Partial<DocumentBlock>) => void;
  onRemove: () => void;
}) {
  const Icon = blockKindIcons[block.kind];

  return (
    <div className="space-y-3 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span>Block {index + 1}</span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={!canRemove}
          aria-label={`Remove block ${index + 1}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Field label="Type">
        <Select
          value={block.kind}
          onValueChange={(kind) =>
            onUpdate({ kind: normalizeDocumentBlockKind(kind) })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {documentBlockKinds.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {blockKindLabels[kind]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {block.kind === "page-break" ? (
        <p className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          This block starts a new page or column in document-style exports.
        </p>
      ) : (
        <Field label="Content">
          <Textarea
            value={block.content}
            rows={block.kind === "paragraph" ? 4 : 2}
            onChange={(event) => onUpdate({ content: event.target.value })}
          />
        </Field>
      )}

      <Field label="Comment">
        <div className="relative">
          <MessageSquareText className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            value={block.comment ?? ""}
            rows={2}
            className="pl-9"
            placeholder="Optional review note"
            onChange={(event) => onUpdate({ comment: event.target.value })}
          />
        </div>
      </Field>
    </div>
  );
}

function defaultBlockContent(kind: DocumentBlockKind) {
  if (kind === "heading") return "New heading";
  if (kind === "subheading") return "New section";
  if (kind === "quote") return "A useful quote or callout.";

  return "New paragraph.";
}
