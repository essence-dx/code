"use client";

import { useRef, type ComponentType, type ReactNode } from "react";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalSpaceBetween,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalSpaceBetween,
  BringToFront,
  ChevronDown,
  ClipboardCopy,
  ClipboardPaste,
  Circle,
  Component,
  Copy,
  MoveDown,
  MoveUp,
  PenTool,
  Pencil,
  Frame,
  Group,
  Hand,
  MessageSquare,
  MousePointer2,
  Ruler,
  Redo2,
  Scissors,
  SendToBack,
  Square,
  SquareScissors,
  StickyNote,
  Trash2,
  Type,
  Undo2,
  Ungroup,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  EditorTool,
  LayerAlignment,
  LayerDistribution,
} from "@/features/editor/types";

type ToolbarProps = {
  tool: EditorTool;
  canUndo: boolean;
  canRedo: boolean;
  onToolChange: (tool: EditorTool) => void;
  onUndo: () => void;
  onRedo: () => void;
  canPaste: boolean;
  hasSelection: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  canAlign: boolean;
  onAlign: (alignment: LayerAlignment) => void;
  canDistribute: boolean;
  onDistribute: (distribution: LayerDistribution) => void;
  canGroup: boolean;
  canUngroup: boolean;
  canCreateComponent: boolean;
  onGroup: () => void;
  onUngroup: () => void;
  onCreateComponent: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
};

const primaryTools = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "hand", label: "Pan", icon: Hand },
  { id: "frame", label: "Frame", icon: Frame },
  { id: "text", label: "Text", icon: Type },
  { id: "sticky", label: "Sticky", icon: StickyNote },
  { id: "comment", label: "Comment", icon: MessageSquare },
] satisfies Array<{
  id: EditorTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

const shapeTools = [
  { id: "rectangle", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
] satisfies Array<{
  id: EditorTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

const drawTools = [
  { id: "pen", label: "Pen", icon: PenTool },
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "cutter", label: "Cutter", icon: SquareScissors },
  { id: "measure", label: "Measure", icon: Ruler },
] satisfies Array<{
  id: EditorTool;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

const alignments = [
  { id: "left", label: "Align left", icon: AlignStartVertical },
  {
    id: "horizontal-center",
    label: "Align horizontal center",
    icon: AlignCenterVertical,
  },
  { id: "right", label: "Align right", icon: AlignEndVertical },
  { id: "top", label: "Align top", icon: AlignStartHorizontal },
  {
    id: "vertical-center",
    label: "Align vertical center",
    icon: AlignCenterHorizontal,
  },
  { id: "bottom", label: "Align bottom", icon: AlignEndHorizontal },
] satisfies Array<{
  id: LayerAlignment;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

const distributions = [
  {
    id: "horizontal",
    label: "Distribute horizontal spacing",
    icon: AlignHorizontalSpaceBetween,
  },
  {
    id: "vertical",
    label: "Distribute vertical spacing",
    icon: AlignVerticalSpaceBetween,
  },
] satisfies Array<{
  id: LayerDistribution;
  label: string;
  icon: ComponentType<{ className?: string }>;
}>;

export function EditorToolbar({
  tool,
  canUndo,
  canRedo,
  onToolChange,
  onUndo,
  onRedo,
  canPaste,
  hasSelection,
  onCopy,
  onCut,
  onPaste,
  canAlign,
  onAlign,
  canDistribute,
  onDistribute,
  canGroup,
  canUngroup,
  canCreateComponent,
  onGroup,
  onUngroup,
  onCreateComponent,
  onDelete,
  onDuplicate,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: ToolbarProps) {
  return (
    <nav
      aria-label="Editor tools"
      className="pointer-events-auto absolute bottom-4 left-1/2 z-[80] flex max-w-[calc(100dvw-1rem)] -translate-x-1/2 items-center justify-center gap-1 overflow-visible rounded-lg border border-border bg-card/95 p-1 shadow-xl backdrop-blur"
    >
      <div className="flex min-w-0 shrink items-center gap-0.5 rounded-md border border-border bg-card p-1 sm:gap-1">
        {primaryTools.map((item) => {
          const Icon = item.icon;
          return (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant={tool === item.id ? "secondary" : "ghost"}
                  className="size-8 rounded-sm"
                  data-editor-tool={item.id}
                  data-editor-tool-active={tool === item.id || undefined}
                  onClick={() => onToolChange(item.id)}
                  aria-label={item.label}
                >
                  <Icon className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{item.label}</TooltipContent>
            </Tooltip>
          );
        })}
        <ToolMenu
          label="Shape"
          icon={Square}
          tool={tool}
          items={shapeTools}
          onToolChange={onToolChange}
        />
        <ToolMenu
          label="Draw"
          icon={PenTool}
          tool={tool}
          items={drawTools}
          onToolChange={onToolChange}
        />
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-0.5 rounded-md border border-border bg-card p-1 sm:ml-2 sm:gap-1">
        <ToolbarButton
          label="Undo"
          disabled={!canUndo}
          commandId="undo"
          onClick={onUndo}
        >
          <Undo2 className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          label="Redo"
          disabled={!canRedo}
          commandId="redo"
          onClick={onRedo}
        >
          <Redo2 className="size-4" />
        </ToolbarButton>
        <ActionMenu
          canPaste={canPaste}
          hasSelection={hasSelection}
          canAlign={canAlign}
          canDistribute={canDistribute}
          canGroup={canGroup}
          canUngroup={canUngroup}
          canCreateComponent={canCreateComponent}
          onCopy={onCopy}
          onCut={onCut}
          onPaste={onPaste}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onGroup={onGroup}
          onUngroup={onUngroup}
          onCreateComponent={onCreateComponent}
          onAlign={onAlign}
          onDistribute={onDistribute}
          onBringForward={onBringForward}
          onSendBackward={onSendBackward}
          onBringToFront={onBringToFront}
          onSendToBack={onSendToBack}
        />
      </div>
    </nav>
  );
}

function ToolMenu({
  label,
  icon: Icon,
  tool,
  items,
  onToolChange,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  tool: EditorTool;
  items: ReadonlyArray<{
    id: EditorTool;
    label: string;
    icon: ComponentType<{ className?: string }>;
  }>;
  onToolChange: (tool: EditorTool) => void;
}) {
  const active = items.some((item) => item.id === tool);
  const menuId = `editor-toolbar-${label.toLowerCase()}-menu`;
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function selectTool(nextTool: EditorTool) {
    onToolChange(nextTool);

    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details
      ref={detailsRef}
      className="group/menu relative shrink-0"
      data-editor-tool-active={active || undefined}
    >
      <summary
        aria-controls={menuId}
        title={label}
        className={[
          "flex h-8 cursor-pointer list-none items-center justify-center gap-1 rounded-sm border border-transparent px-1.5 text-[0.8rem] font-medium outline-none transition-colors select-none sm:px-2 [&::-webkit-details-marker]:hidden",
          active
            ? "bg-secondary text-secondary-foreground"
            : "hover:bg-muted hover:text-foreground",
        ].join(" ")}
      >
        <Icon className="size-4" />
        <span className="hidden text-xs sm:inline">{label}</span>
        <ChevronDown className="size-3 transition-transform group-open/menu:rotate-180" />
      </summary>
      <ToolbarMenuPanel id={menuId} className="w-44">
        {items.map((item) => (
          <CommandMenuItem
            key={item.id}
            label={item.label}
            icon={item.icon}
            toolId={item.id}
            active={tool === item.id}
            onClick={() => selectTool(item.id)}
          />
        ))}
      </ToolbarMenuPanel>
    </details>
  );
}

function CommandMenuItem({
  label,
  disabled,
  icon: Icon,
  toolId,
  commandId,
  active,
  onClick,
}: {
  label: string;
  disabled?: boolean;
  icon: ComponentType<{ className?: string }>;
  toolId?: EditorTool;
  commandId?: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      data-editor-tool={toolId}
      data-editor-action={commandId}
      data-editor-tool-active={active || undefined}
      onClick={onClick}
      className={[
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm outline-none transition-colors focus-visible:bg-accent focus-visible:text-accent-foreground disabled:pointer-events-none disabled:opacity-45",
        active
          ? "bg-secondary text-secondary-foreground"
          : "text-popover-foreground hover:bg-accent hover:text-accent-foreground",
      ].join(" ")}
    >
      <Icon className="size-4" />
      <span className="truncate">{label}</span>
    </button>
  );
}

function ActionMenu({
  canPaste,
  hasSelection,
  canAlign,
  canDistribute,
  canGroup,
  canUngroup,
  canCreateComponent,
  onCopy,
  onCut,
  onPaste,
  onDelete,
  onDuplicate,
  onGroup,
  onUngroup,
  onCreateComponent,
  onAlign,
  onDistribute,
  onBringForward,
  onSendBackward,
  onBringToFront,
  onSendToBack,
}: {
  canPaste: boolean;
  hasSelection: boolean;
  canAlign: boolean;
  canDistribute: boolean;
  canGroup: boolean;
  canUngroup: boolean;
  canCreateComponent: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onCreateComponent: () => void;
  onAlign: (alignment: LayerAlignment) => void;
  onDistribute: (distribution: LayerDistribution) => void;
  onBringForward: () => void;
  onSendBackward: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
}) {
  const detailsRef = useRef<HTMLDetailsElement>(null);

  function run(action: () => void) {
    action();

    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  }

  return (
    <details ref={detailsRef} className="group/menu relative shrink-0">
      <summary
        aria-label="More editor actions"
        aria-controls="editor-toolbar-actions-menu"
        title="More"
        className="flex h-8 cursor-pointer list-none items-center justify-center gap-1 rounded-sm border border-transparent px-1.5 text-[0.8rem] font-medium outline-none transition-colors select-none hover:bg-muted hover:text-foreground sm:px-2 [&::-webkit-details-marker]:hidden"
      >
        <Group className="size-4" />
        <span className="hidden text-xs sm:inline">More</span>
        <ChevronDown className="size-3 transition-transform group-open/menu:rotate-180" />
      </summary>
      <ToolbarMenuPanel
        id="editor-toolbar-actions-menu"
        align="end"
        className="w-72 max-w-[calc(100vw-1rem)]"
      >
        <ToolbarMenuSection label="Edit">
          <CommandMenuItem
            label="Copy"
            disabled={!hasSelection}
            icon={ClipboardCopy}
            commandId="copy"
            onClick={() => run(onCopy)}
          />
          <CommandMenuItem
            label="Cut"
            disabled={!hasSelection}
            icon={Scissors}
            commandId="cut"
            onClick={() => run(onCut)}
          />
          <CommandMenuItem
            label="Paste"
            disabled={!canPaste}
            icon={ClipboardPaste}
            commandId="paste"
            onClick={() => run(onPaste)}
          />
          <CommandMenuItem
            label="Duplicate"
            disabled={!hasSelection}
            icon={Copy}
            commandId="duplicate"
            onClick={() => run(onDuplicate)}
          />
          <CommandMenuItem
            label="Delete"
            disabled={!hasSelection}
            icon={Trash2}
            commandId="delete"
            onClick={() => run(onDelete)}
          />
        </ToolbarMenuSection>
        <ToolbarMenuSection label="Organize">
          <CommandMenuItem
            label="Group"
            disabled={!canGroup}
            icon={Group}
            commandId="group"
            onClick={() => run(onGroup)}
          />
          <CommandMenuItem
            label="Ungroup"
            disabled={!canUngroup}
            icon={Ungroup}
            commandId="ungroup"
            onClick={() => run(onUngroup)}
          />
          <CommandMenuItem
            label="Create component"
            disabled={!canCreateComponent}
            icon={Component}
            commandId="create-component"
            onClick={() => run(onCreateComponent)}
          />
        </ToolbarMenuSection>
        <ToolbarMenuSection label="Align">
          {alignments.map((item) => (
            <CommandMenuItem
              key={item.id}
              label={item.label}
              disabled={!canAlign}
              icon={item.icon}
              commandId={`align:${item.id}`}
              onClick={() => run(() => onAlign(item.id))}
            />
          ))}
        </ToolbarMenuSection>
        <ToolbarMenuSection label="Distribute">
          {distributions.map((item) => (
            <CommandMenuItem
              key={item.id}
              label={item.label}
              disabled={!canDistribute}
              icon={item.icon}
              commandId={`distribute:${item.id}`}
              onClick={() => run(() => onDistribute(item.id))}
            />
          ))}
        </ToolbarMenuSection>
        <ToolbarMenuSection label="Order">
          <CommandMenuItem
            label="Bring to front"
            disabled={!hasSelection}
            icon={BringToFront}
            commandId="bring-to-front"
            onClick={() => run(onBringToFront)}
          />
          <CommandMenuItem
            label="Bring forward"
            disabled={!hasSelection}
            icon={MoveUp}
            commandId="bring-forward"
            onClick={() => run(onBringForward)}
          />
          <CommandMenuItem
            label="Send backward"
            disabled={!hasSelection}
            icon={MoveDown}
            commandId="send-backward"
            onClick={() => run(onSendBackward)}
          />
          <CommandMenuItem
            label="Send to back"
            disabled={!hasSelection}
            icon={SendToBack}
            commandId="send-to-back"
            onClick={() => run(onSendToBack)}
          />
        </ToolbarMenuSection>
      </ToolbarMenuPanel>
    </details>
  );
}

function ToolbarMenuPanel({
  id,
  align = "center",
  className,
  children,
}: {
  id: string;
  align?: "center" | "end";
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      role="menu"
      className={[
        "absolute bottom-full z-[90] mb-2 max-h-[min(32rem,calc(100dvh-6rem))] overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl ring-1 ring-foreground/10 backdrop-blur",
        align === "end" ? "right-0" : "left-1/2 -translate-x-1/2",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
    </div>
  );
}

function ToolbarMenuSection({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-border/70 py-1 last:border-b-0">
      <div className="px-2 py-1 text-[0.68rem] font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </div>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function ToolbarButton({
  label,
  disabled,
  commandId,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  commandId?: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8 rounded-sm"
          disabled={disabled}
          data-editor-action={commandId}
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
