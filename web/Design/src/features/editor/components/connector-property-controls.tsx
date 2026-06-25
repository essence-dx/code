"use client";

import type { ReactNode } from "react";
import { ArrowLeftRight, Unlink } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ColorPalettePicker } from "@/features/editor/components/color-palette-picker";
import {
  Field,
  NumberField,
} from "@/features/editor/components/property-fields";
import type { EditorColorPalette } from "@/features/editor/color-palettes";
import { getElementAccessibilityLabel } from "@/features/editor/element-accessibility";
import type {
  ConnectorAnchor,
  ConnectorLabelBackground,
  ConnectorLabelPosition,
  ConnectorStrokeStyle,
  DesignElement,
} from "@/features/editor/types";

type ConnectorControlsProps = {
  element: Extract<DesignElement, { type: "connector" }>;
  palettes: readonly EditorColorPalette[];
  pageElements?: readonly DesignElement[];
  onUpdateElement: (updates: Partial<DesignElement>) => void;
};

export function ConnectorControls({
  element,
  palettes,
  pageElements = [],
  onUpdateElement,
}: ConnectorControlsProps) {
  const endpointOptions = getConnectorEndpointOptions(pageElements, element);
  const hasConnectedEndpoint = Boolean(
    element.startElementId || element.endElementId,
  );
  const canSwapEndpoints = Boolean(
    element.startElementId && element.endElementId,
  );

  return (
    <div className="space-y-4">
      <Field label="Label">
        <Input
          value={element.label}
          onChange={(event) =>
            onUpdateElement({
              label: event.target.value,
            } as Partial<DesignElement>)
          }
        />
      </Field>
      <Field label="Connector">
        <Select
          value={element.connectorKind}
          onValueChange={(connectorKind) =>
            onUpdateElement({
              connectorKind,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="straight">Straight</SelectItem>
            <SelectItem value="elbow">Elbow</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Line style">
        <Select
          value={element.strokeStyle ?? "solid"}
          onValueChange={(strokeStyle) =>
            onUpdateElement({
              strokeStyle: strokeStyle as ConnectorStrokeStyle,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="solid">Solid</SelectItem>
            <SelectItem value="dashed">Dashed</SelectItem>
            <SelectItem value="dotted">Dotted</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Label position">
        <Select
          value={element.labelPosition ?? "center"}
          onValueChange={(labelPosition) =>
            onUpdateElement({
              labelPosition: labelPosition as ConnectorLabelPosition,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="start">Start</SelectItem>
            <SelectItem value="center">Middle</SelectItem>
            <SelectItem value="end">End</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      <Field label="Label box">
        <Select
          value={element.labelBackground ?? "none"}
          onValueChange={(labelBackground) =>
            onUpdateElement({
              labelBackground: labelBackground as ConnectorLabelBackground,
            } as Partial<DesignElement>)
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            <SelectItem value="paper">Paper</SelectItem>
            <SelectItem value="line">Line tint</SelectItem>
          </SelectContent>
        </Select>
      </Field>
      {endpointOptions.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <EndpointField
            label="Start layer"
            value={element.startElementId}
            blockedElementId={element.endElementId}
            options={endpointOptions}
            onChange={(startElementId) =>
              onUpdateElement({
                startElementId,
                startAnchor: startElementId
                  ? (element.startAnchor ?? "auto")
                  : undefined,
              } as Partial<DesignElement>)
            }
          />
          <EndpointField
            label="End layer"
            value={element.endElementId}
            blockedElementId={element.startElementId}
            options={endpointOptions}
            onChange={(endElementId) =>
              onUpdateElement({
                endElementId,
                endAnchor: endElementId
                  ? (element.endAnchor ?? "auto")
                  : undefined,
              } as Partial<DesignElement>)
            }
          />
        </div>
      ) : null}
      {endpointOptions.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          <EndpointActionButton
            label="Swap connector endpoints"
            disabled={!canSwapEndpoints}
            onClick={() =>
              onUpdateElement({
                startElementId: element.endElementId,
                endElementId: element.startElementId,
                startAnchor: element.endAnchor,
                endAnchor: element.startAnchor,
                startMarker: element.endMarker,
                endMarker: element.startMarker,
              } as Partial<DesignElement>)
            }
          >
            <ArrowLeftRight className="h-4 w-4" />
          </EndpointActionButton>
          <EndpointActionButton
            label="Detach connector endpoints"
            disabled={!hasConnectedEndpoint}
            onClick={() =>
              onUpdateElement({
                startElementId: undefined,
                endElementId: undefined,
                startAnchor: undefined,
                endAnchor: undefined,
              } as Partial<DesignElement>)
            }
          >
            <Unlink className="h-4 w-4" />
          </EndpointActionButton>
        </div>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <MarkerField
          label="Start"
          value={element.startMarker}
          onChange={(startMarker) =>
            onUpdateElement({ startMarker } as Partial<DesignElement>)
          }
        />
        <MarkerField
          label="End"
          value={element.endMarker}
          onChange={(endMarker) =>
            onUpdateElement({ endMarker } as Partial<DesignElement>)
          }
        />
      </div>
      {element.startElementId && element.endElementId ? (
        <div className="grid grid-cols-2 gap-3">
          <AnchorField
            label="Start anchor"
            value={element.startAnchor ?? "auto"}
            onChange={(startAnchor) =>
              onUpdateElement({ startAnchor } as Partial<DesignElement>)
            }
          />
          <AnchorField
            label="End anchor"
            value={element.endAnchor ?? "auto"}
            onChange={(endAnchor) =>
              onUpdateElement({ endAnchor } as Partial<DesignElement>)
            }
          />
        </div>
      ) : null}
      <ColorField
        label="Line"
        value={element.stroke}
        palettes={palettes}
        onChange={(stroke) =>
          onUpdateElement({ stroke } as Partial<DesignElement>)
        }
      />
      <ColorField
        label="Label"
        value={element.labelColor}
        palettes={palettes}
        onChange={(labelColor) =>
          onUpdateElement({ labelColor } as Partial<DesignElement>)
        }
      />
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Stroke"
          value={element.strokeWidth}
          min={1}
          max={24}
          onChange={(strokeWidth) =>
            onUpdateElement({ strokeWidth } as Partial<DesignElement>)
          }
        />
        <NumberField
          label="Label size"
          value={element.labelFontSize}
          min={8}
          max={72}
          onChange={(labelFontSize) =>
            onUpdateElement({ labelFontSize } as Partial<DesignElement>)
          }
        />
      </div>
    </div>
  );
}

function EndpointActionButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          disabled={disabled}
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

function EndpointField({
  label,
  value,
  blockedElementId,
  options,
  onChange,
}: {
  label: string;
  value: string | undefined;
  blockedElementId: string | undefined;
  options: ConnectorEndpointOption[];
  onChange: (elementId: string | undefined) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value ?? freeEndpointValue}
        onValueChange={(nextValue) =>
          onChange(nextValue === freeEndpointValue ? undefined : nextValue)
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={freeEndpointValue}>Free point</SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.id}
              value={option.id}
              disabled={option.id === blockedElementId}
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function AnchorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ConnectorAnchor;
  onChange: (anchor: ConnectorAnchor) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(anchor) => onChange(anchor as ConnectorAnchor)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="auto">Auto</SelectItem>
          <SelectItem value="left">Left</SelectItem>
          <SelectItem value="right">Right</SelectItem>
          <SelectItem value="top">Top</SelectItem>
          <SelectItem value="bottom">Bottom</SelectItem>
          <SelectItem value="center">Center</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}

type ConnectorEndpointOption = {
  id: string;
  label: string;
};

const freeEndpointValue = "__free__";

function getConnectorEndpointOptions(
  pageElements: readonly DesignElement[],
  connector: Extract<DesignElement, { type: "connector" }>,
): ConnectorEndpointOption[] {
  return pageElements
    .filter(
      (element) =>
        element.type !== "connector" &&
        (!element.hidden ||
          element.id === connector.startElementId ||
          element.id === connector.endElementId),
    )
    .map((element) => ({
      id: element.id,
      label: getShortEndpointLabel(element),
    }));
}

function getShortEndpointLabel(element: DesignElement) {
  const label = getElementAccessibilityLabel(element);

  return label.length > 48 ? `${label.slice(0, 45)}...` : label;
}

function ColorField({
  label,
  value,
  palettes,
  onChange,
}: {
  label: string;
  value: string;
  palettes: readonly EditorColorPalette[];
  onChange: (color: string) => void;
}) {
  return (
    <Field label={label}>
      <Input
        type="color"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <ColorPalettePicker
        selectedColor={value}
        palettes={palettes}
        onSelectColor={onChange}
      />
    </Field>
  );
}

function MarkerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: "none" | "arrow" | "dot";
  onChange: (marker: "none" | "arrow" | "dot") => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(marker) =>
          onChange(marker as "none" | "arrow" | "dot")
        }
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          <SelectItem value="arrow">Arrow</SelectItem>
          <SelectItem value="dot">Dot</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
