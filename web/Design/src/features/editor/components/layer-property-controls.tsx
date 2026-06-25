"use client";

import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  Trash2,
  Unlock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import { getSafeHttpUrl } from "@/features/editor/link-utils";
import type { DesignElement } from "@/features/editor/types";

export function LayerGeometryControls({
  element,
  onUpdateElement,
}: {
  element: DesignElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <NumberField
        label="X"
        value={element.x}
        onChange={(x) => onUpdateElement({ x } as Partial<DesignElement>)}
      />
      <NumberField
        label="Y"
        value={element.y}
        onChange={(y) => onUpdateElement({ y } as Partial<DesignElement>)}
      />
      <NumberField
        label="W"
        value={element.width}
        min={1}
        onChange={(width) =>
          onUpdateElement({ width } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="H"
        value={element.height}
        min={1}
        onChange={(height) =>
          onUpdateElement({ height } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Rotate"
        value={element.rotation}
        onChange={(rotation) =>
          onUpdateElement({ rotation } as Partial<DesignElement>)
        }
      />
      <NumberField
        label="Opacity"
        value={Math.round(element.opacity * 100)}
        min={0}
        max={100}
        onChange={(opacity) =>
          onUpdateElement({
            opacity: opacity / 100,
          } as Partial<DesignElement>)
        }
      />
    </div>
  );
}

export function LayerAlignmentControls({
  element,
  canvasSize,
  onUpdateElement,
}: {
  element: DesignElement;
  canvasSize: {
    width: number;
    height: number;
  };
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Align to page">
      <div className="grid grid-cols-3 gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateElement({ x: 0 })}
          aria-label="Align to left edge"
        >
          <AlignHorizontalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            onUpdateElement({
              x: Math.round((canvasSize.width - element.width) / 2),
            })
          }
          aria-label="Align horizontally center"
        >
          <AlignHorizontalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            onUpdateElement({
              x: Math.round(canvasSize.width - element.width),
            })
          }
          aria-label="Align to right edge"
        >
          <AlignHorizontalJustifyEnd className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateElement({ y: 0 })}
          aria-label="Align to top edge"
        >
          <AlignVerticalJustifyStart className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            onUpdateElement({
              y: Math.round((canvasSize.height - element.height) / 2),
            })
          }
          aria-label="Align vertically center"
        >
          <AlignVerticalJustifyCenter className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() =>
            onUpdateElement({
              y: Math.round(canvasSize.height - element.height),
            })
          }
          aria-label="Align to bottom edge"
        >
          <AlignVerticalJustifyEnd className="h-4 w-4" />
        </Button>
      </div>
    </Field>
  );
}

export function LayerLinkControls({
  element,
  onUpdateElement,
}: {
  element: DesignElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
}) {
  return (
    <Field label="Link URL">
      <div className="flex gap-2">
        <Input
          type="url"
          value={element.linkUrl ?? ""}
          onChange={(event) =>
            onUpdateElement({
              linkUrl: event.target.value || undefined,
            } as Partial<DesignElement>)
          }
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={!getSafeHttpUrl(element.linkUrl)}
          onClick={() => {
            const safeUrl = getSafeHttpUrl(element.linkUrl);

            if (safeUrl) {
              window.open(safeUrl, "_blank", "noopener");
            }
          }}
          aria-label="Open layer link"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </Field>
  );
}

export function LayerActionBar({
  element,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
}: {
  element: DesignElement;
  onUpdateElement: (updates: Partial<DesignElement>) => void;
  onDuplicateElement: () => void;
  onDeleteElement: () => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2 p-4">
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          onUpdateElement({
            hidden: !element.hidden,
          } as Partial<DesignElement>)
        }
        aria-label={element.hidden ? "Show layer" : "Hide layer"}
      >
        {element.hidden ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={() =>
          onUpdateElement({
            locked: !element.locked,
          } as Partial<DesignElement>)
        }
        aria-label={element.locked ? "Unlock layer" : "Lock layer"}
      >
        {element.locked ? (
          <Unlock className="h-4 w-4" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={onDuplicateElement}
        aria-label="Duplicate layer"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="destructive"
        size="icon"
        onClick={onDeleteElement}
        aria-label="Delete layer"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
