"use client";

import { X } from "lucide-react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import { ColorPicker } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  createEffectStyleFromLayer,
  getEffectStyleLayerPatch,
} from "@/features/editor/effect-styles";
import { imageFitOptions } from "@/features/editor/image-options";
import { createPaintStyleValue } from "@/features/editor/paint-styles";
import { Label } from "@/components/ui/label";
import { NumberInput } from "@/components/ui/number-input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  autoLayoutAlignmentOptions,
  autoLayoutModeOptions,
  autoLayoutWrapOptions,
  createAutoLayoutLayerPatches,
  createAutoLayoutParentPatches,
  defaultAutoLayout,
  defaultLayoutSizing,
  getAutoLayoutChildLayers,
  getLayerSizing,
  layoutSizingOptions,
} from "@/features/editor/auto-layout";
import { getContrastReport } from "@/features/editor/color-contrast";
import {
  getPrimaryFillPaintPatch,
  getPrimaryStrokePaintPatch,
} from "@/features/editor/paint-stack";
import {
  defaultConstraints,
  getLayerConstraints,
  horizontalConstraintOptions,
  verticalConstraintOptions,
} from "@/features/editor/constraints";
import { ComponentInstanceSection } from "@/features/editor/components/component-instance-section";
import { ConnectorReviewPanel } from "@/features/editor/components/connector-review-panel";
import { DesignTokenExportSection } from "@/features/editor/components/design-token-export-section";
import { LayoutGridsSection } from "@/features/editor/components/layout-grids-section";
import { LayoutPresetStylesSection } from "@/features/editor/components/layout-preset-styles-section";
import { LayerCodeSection } from "@/features/editor/components/layer-code-section";
import { FillPaintStackSection } from "@/features/editor/components/fill-paint-stack-section";
import { FacilitationReviewPanel } from "@/features/editor/components/facilitation-review-panel";
import { FrameLayoutReviewPanel } from "@/features/editor/components/frame-layout-review-panel";
import { LayerMaskSection } from "@/features/editor/components/layer-mask-section";
import { SelectionPropertiesSection } from "@/features/editor/components/selection-properties-section";
import { TextFontInventoryPanel } from "@/features/editor/components/text-font-inventory-panel";
import { TextLayerReviewPanel } from "@/features/editor/components/text-layer-review-panel";
import { TextStylesSection } from "@/features/editor/components/text-styles-section";
import { VariableBindingsSection } from "@/features/editor/components/variable-bindings-section";
import { DocumentVariablesSection } from "@/features/editor/components/document-variables-section";
import { VectorPathNodeSection } from "@/features/editor/components/vector-path-node-section";
import type {
  DesignPagePatch,
  LayerPatch,
} from "@/features/editor/document-utils";
import {
  strokeLineCapOptions,
  strokeLineJoinOptions,
} from "@/features/editor/stroke-options";
import {
  createFlippedPathPatch,
  createNormalizedPathPatch,
} from "@/features/editor/vector-operations";
import {
  fontFamilyOptions,
  textAlignOptions,
  textResizeModeOptions,
} from "@/features/editor/text-options";
import {
  getTextLayerResizeModePatch,
  getTextLayerTextPatch,
  getTextLayerTypographyPatch,
} from "@/features/editor/text-layer-review";
import type {
  DesignComponent,
  DesignAutoLayoutAlignment,
  DesignAutoLayoutMode,
  DesignAutoLayoutWrap,
  DesignDevLinkKind,
  DesignDocument,
  DesignEffectStyle,
  DesignHorizontalConstraint,
  DesignLayer,
  DesignLayoutGridStyle,
  DesignLayoutPresetStyle,
  DesignPage,
  DesignPaintStyle,
  DesignPrototypeAction,
  DesignPrototypeDeviceFrame,
  DesignPrototypeOverlayPosition,
  DesignPrototypeScrollBehavior,
  DesignPrototypeTransition,
  DesignPrototypeTrigger,
  DesignLayoutSizingMode,
  DesignTextStyle,
  DesignTextResizeMode,
  DesignVariableCollection,
  DesignVariableDefinition,
  DesignVariableMode,
  DesignVerticalConstraint,
  FillRule,
  ImageFit,
  TextAlign,
} from "@/features/editor/types";

type PropertiesPanelProps = {
  className?: string;
  layer: DesignLayer | null;
  selectedLayers: DesignLayer[];
  page: DesignPage;
  pages: DesignPage[];
  components: DesignComponent[];
  variables: Record<string, string>;
  variableModes: DesignVariableMode[];
  activeVariableModeId?: string;
  variableDefinitions: Record<string, DesignVariableDefinition>;
  variableCollections: Record<string, DesignVariableCollection>;
  layoutGridStyles: Record<string, DesignLayoutGridStyle>;
  paintStyles: Record<string, DesignPaintStyle>;
  textStyles: Record<string, DesignTextStyle>;
  effectStyles: Record<string, DesignEffectStyle>;
  layoutPresetStyles: Record<string, DesignLayoutPresetStyle>;
  onUpdatePage: (patch: DesignPagePatch) => void;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
  onUpdateLayoutGridStyles: (
    styles: Record<string, DesignLayoutGridStyle>,
  ) => void;
  onUpdatePaintStyles: (styles: Record<string, DesignPaintStyle>) => void;
  onUpdateTextStyles: (styles: Record<string, DesignTextStyle>) => void;
  onUpdateEffectStyles: (styles: Record<string, DesignEffectStyle>) => void;
  onUpdateLayoutPresetStyles: (
    styles: Record<string, DesignLayoutPresetStyle>,
  ) => void;
  onUpdateVariableSystem: (
    patch: Partial<
      Pick<
        DesignDocument,
        | "variables"
        | "variableModes"
        | "activeVariableModeId"
        | "variableDefinitions"
        | "variableCollections"
      >
    >,
    applyBindings?: boolean,
  ) => void;
  onSelectLayer: (layerId: string) => void;
  onResetComponentInstance: (layerId: string) => void;
  onDetachComponentInstance: (layerId: string) => void;
  onUpdateComponentInstanceProperties: (
    layerId: string,
    properties: Record<string, string>,
  ) => void;
  onSwitchComponentInstanceVariant: (layerId: string, variantId?: string) => void;
};

export function PropertiesPanel({
  className,
  layer,
  selectedLayers,
  page,
  pages,
  components,
  variables,
  variableModes,
  activeVariableModeId,
  variableDefinitions,
  variableCollections,
  layoutGridStyles,
  paintStyles,
  textStyles,
  effectStyles,
  layoutPresetStyles,
  onUpdatePage,
  onUpdateLayer,
  onUpdateLayers,
  onUpdateLayoutGridStyles,
  onUpdatePaintStyles,
  onUpdateTextStyles,
  onUpdateEffectStyles,
  onUpdateLayoutPresetStyles,
  onUpdateVariableSystem,
  onSelectLayer,
  onResetComponentInstance,
  onDetachComponentInstance,
  onUpdateComponentInstanceProperties,
  onSwitchComponentInstanceVariant,
}: PropertiesPanelProps) {
  const component = layer?.componentId
    ? components.find((item) => item.id === layer.componentId)
    : undefined;
  const variant = component?.variants?.find(
    (item) => item.id === layer?.componentVariantId,
  );
  const textContrast =
    layer?.text !== undefined
      ? getContrastReport(
          layer.textColor ?? "#ffffff",
          layer.fill === "transparent" ? page.background : layer.fill,
        )
      : null;

  return (
    <aside
      data-editor-properties-panel="true"
      className={cn(
        "flex min-h-0 min-w-0 max-w-[100dvw] flex-col overflow-x-hidden overflow-y-hidden border-t border-border bg-card [contain:inline-size] lg:border-l lg:border-t-0 [&_*]:min-w-0 [&_button]:max-w-full [&_button]:overflow-hidden [&_button]:text-ellipsis [&_input]:max-w-full [&_textarea]:max-w-full [&_[data-slot=select-trigger]]:max-w-full [&_[data-slot=select-trigger]]:w-full [&_[data-slot=select-trigger]>span]:truncate",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center justify-between px-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Properties
        </span>
        <span className="text-xs text-muted-foreground">
          {selectedLayers.length > 1
            ? `${selectedLayers.length} selected`
            : layer
              ? layer.type
              : "Canvas"}
        </span>
      </div>
      <Separator />

      <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden [&_[data-slot=scroll-area-viewport]]:overflow-x-hidden [&_[data-slot=scroll-area-viewport]]:overflow-y-auto [&_[data-slot=scroll-area-viewport]]:overscroll-contain [&_[data-slot=scroll-area-viewport]>div]:!block [&_[data-slot=scroll-area-viewport]>div]:max-w-full [&_[data-slot=scroll-area-viewport]>div]:min-w-0">
        {selectedLayers.length > 1 ? (
          <div className="min-w-0 max-w-full overflow-x-hidden">
            <SelectionPropertiesSection
              layers={selectedLayers}
              variables={variables}
              onUpdateLayers={onUpdateLayers}
            />
          </div>
        ) : layer ? (
          <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden p-3">
            <Field label="Name">
              <Input
                value={layer.name}
                onChange={(event) =>
                  onUpdateLayer(layer.id, { name: event.target.value })
                }
              />
            </Field>

            {component ? (
              <ComponentInstanceSection
                layer={layer}
                layers={page.layers}
                component={component}
                variantName={variant?.name}
                onSelectLayer={onSelectLayer}
                onResetComponentInstance={onResetComponentInstance}
                onDetachComponentInstance={onDetachComponentInstance}
                onUpdateComponentInstanceProperties={
                  onUpdateComponentInstanceProperties
                }
                onSwitchComponentInstanceVariant={
                  onSwitchComponentInstanceVariant
                }
              />
            ) : null}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
              <NumberField
                label="X"
                value={layer.x}
                onChange={(x) => onUpdateLayer(layer.id, { x })}
              />
              <NumberField
                label="Y"
                value={layer.y}
                onChange={(y) => onUpdateLayer(layer.id, { y })}
              />
              <NumberField
                label="W"
                value={layer.width}
                min={1}
                onChange={(width) => onUpdateLayer(layer.id, { width })}
              />
              <NumberField
                label="H"
                value={layer.height}
                min={1}
                onChange={(height) => onUpdateLayer(layer.id, { height })}
              />
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
              <NumberField
                label="Radius"
                value={layer.cornerRadius}
                min={0}
                onChange={(cornerRadius) =>
                  onUpdateLayer(layer.id, { cornerRadius })
                }
              />
              <NumberField
                label="Opacity"
                value={Math.round(layer.opacity * 100)}
                min={0}
                max={100}
                onChange={(opacity) =>
                  onUpdateLayer(layer.id, { opacity: opacity / 100 })
                }
              />
            </div>

            <NumberField
              label="Rotation"
              value={layer.rotation}
              onChange={(rotation) => onUpdateLayer(layer.id, { rotation })}
            />

            <Button
              type="button"
              variant={layer.clipContent ? "secondary" : "outline"}
              className="w-full"
              onClick={() =>
                onUpdateLayer(layer.id, {
                  clipContent: !(layer.clipContent ?? false),
                })
              }
            >
              {layer.clipContent ? "Clip content on" : "Clip content off"}
            </Button>

            <LayerMaskSection layer={layer} onUpdateLayer={onUpdateLayer} />

            <Button
              type="button"
              variant={layer.readyForDev ? "secondary" : "outline"}
              className="w-full"
              onClick={() =>
                onUpdateLayer(layer.id, {
                  readyForDev: !(layer.readyForDev ?? false),
                })
              }
            >
              {layer.readyForDev ? "Ready for dev" : "Mark ready for dev"}
            </Button>

            <Separator />
            <VariableBindingsSection
              layer={layer}
              variableDefinitions={variableDefinitions}
              variableModes={variableModes}
              activeVariableModeId={activeVariableModeId}
              onUpdateLayer={onUpdateLayer}
            />

            <Separator />
            <LayoutSizingSection layer={layer} onUpdateLayer={onUpdateLayer} />
            <ConstraintsSection layer={layer} onUpdateLayer={onUpdateLayer} />

            {layer.type === "frame" ? (
              <>
                <AutoLayoutSection
                  frame={layer}
                  layers={page.layers}
                  onUpdateLayer={onUpdateLayer}
                  onUpdateLayers={onUpdateLayers}
                />
                <Separator />
                <LayoutPresetStylesSection
                  frame={layer}
                  layoutPresetStyles={layoutPresetStyles}
                  onUpdateLayer={onUpdateLayer}
                  onUpdateLayoutPresetStyles={onUpdateLayoutPresetStyles}
                />
                <Separator />
                <LayoutGridsSection
                  layer={layer}
                  gridStyles={layoutGridStyles}
                  onUpdateLayer={onUpdateLayer}
                  onUpdateLayoutGridStyles={onUpdateLayoutGridStyles}
                />
              </>
            ) : null}

            <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
              <ColorField
                label="Fill"
                value={layer.fill}
                blendMode={layer.blendMode ?? "normal"}
                onChange={(fill) =>
                  onUpdateLayer(layer.id, getPrimaryFillPaintPatch(layer, { value: fill }))
                }
                onBlendModeChange={(blendMode) =>
                  onUpdateLayer(
                    layer.id,
                    getPrimaryFillPaintPatch(layer, { blendMode }),
                  )
                }
                paintStyles={paintStyles}
                onUpdatePaintStyles={onUpdatePaintStyles}
              />
              <ColorField
                label="Stroke"
                value={layer.stroke}
                onChange={(stroke) =>
                  onUpdateLayer(layer.id, getPrimaryStrokePaintPatch(layer, { value: stroke }))
                }
                paintStyles={paintStyles}
                onUpdatePaintStyles={onUpdatePaintStyles}
              />
            </div>

            <FillPaintStackSection
              kind="fill"
              layer={layer}
              onUpdateLayer={onUpdateLayer}
            />
            <FillPaintStackSection
              kind="stroke"
              layer={layer}
              onUpdateLayer={onUpdateLayer}
            />

            <NumberField
              label="Stroke"
              value={layer.strokeWidth}
              min={0}
              onChange={(strokeWidth) =>
                onUpdateLayer(layer.id, { strokeWidth })
              }
            />

            <StrokeOptionsSection layer={layer} onUpdateLayer={onUpdateLayer} />

            <EffectsSection
              layer={layer}
              effectStyles={effectStyles}
              onUpdateLayer={onUpdateLayer}
              onUpdateEffectStyles={onUpdateEffectStyles}
            />

            {layer.type === "image" ? (
              <ImageOptionsSection layer={layer} onUpdateLayer={onUpdateLayer} />
            ) : null}

            {layer.text !== undefined ? (
              <>
                <Separator />
                <TextStylesSection
                  layer={layer}
                  textStyles={textStyles}
                  onUpdateLayer={onUpdateLayer}
                  onUpdateTextStyles={onUpdateTextStyles}
                />
                <Field label="Text">
                  <Textarea
                    value={layer.text}
                    rows={5}
                    onChange={(event) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTextPatch(layer, event.target.value),
                      )
                    }
                  />
                </Field>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
                  <NumberField
                    label="Size"
                    value={layer.fontSize ?? 16}
                    min={8}
                    onChange={(fontSize) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTypographyPatch(layer, { fontSize }),
                      )
                    }
                  />
                  <NumberField
                    label="Weight"
                    value={layer.fontWeight ?? 400}
                    min={100}
                    max={900}
                    step={100}
                    onChange={(fontWeight) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTypographyPatch(layer, { fontWeight }),
                      )
                    }
                  />
                </div>
                <SelectField
                  label="Font"
                  value={layer.fontFamily ?? "Inter, Arial, sans-serif"}
                  options={fontFamilyOptions}
                  onChange={(fontFamily) =>
                    onUpdateLayer(
                      layer.id,
                      getTextLayerTypographyPatch(layer, { fontFamily }),
                    )
                  }
                />
                <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
                  <SelectField<TextAlign>
                    label="Align"
                    value={layer.textAlign ?? "left"}
                    options={textAlignOptions}
                    onChange={(textAlign) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTypographyPatch(layer, { textAlign }),
                      )
                    }
                  />
                  <SelectField<DesignTextResizeMode>
                    label="Resize"
                    value={layer.textResizeMode ?? "fixed"}
                    options={textResizeModeOptions}
                    onChange={(textResizeMode) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerResizeModePatch(layer, textResizeMode),
                      )
                    }
                  />
                  <NumberField
                    label="Line"
                    value={layer.lineHeight ?? 1.25}
                    min={0.5}
                    step={0.05}
                    onChange={(lineHeight) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTypographyPatch(layer, { lineHeight }),
                      )
                    }
                  />
                  <NumberField
                    label="Tracking"
                    value={layer.letterSpacing ?? 0}
                    step={0.5}
                    onChange={(letterSpacing) =>
                      onUpdateLayer(
                        layer.id,
                        getTextLayerTypographyPatch(layer, { letterSpacing }),
                      )
                    }
                  />
                </div>
                <ColorField
                  label="Text"
                  value={layer.textColor ?? "#ffffff"}
                  onChange={(textColor) =>
                    onUpdateLayer(layer.id, { textColor })
                  }
                  paintStyles={paintStyles}
                  onUpdatePaintStyles={onUpdatePaintStyles}
                />
                <ContrastBadge report={textContrast} />
                <TextLayerReviewPanel
                  layers={[layer]}
                  variables={variables}
                  onUpdateLayers={onUpdateLayers}
                />
              </>
            ) : null}

            {layer.type === "path" ? (
              <>
                <Separator />
                <VectorPathSection layer={layer} onUpdateLayer={onUpdateLayer} />
              </>
            ) : null}

            <Separator />
            <PrototypeSection
              layer={layer}
              pages={pages}
              onUpdateLayer={onUpdateLayer}
            />

            <Separator />
            <CodeConnectSection layer={layer} onUpdateLayer={onUpdateLayer} />

            <Separator />
            <DevLinksSection layer={layer} onUpdateLayer={onUpdateLayer} />

            <Separator />
            <LayerCodeSection
              layer={layer}
              layers={page.layers}
              pages={pages}
              variables={variables}
              comments={page.comments ?? []}
            />
          </div>
        ) : (
          <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden p-3">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Page
            </div>
            <Field label="Name">
              <Input
                value={page.name}
                onChange={(event) =>
                  onUpdatePage({ name: event.target.value })
                }
              />
            </Field>
            <ColorField
              label="Background"
              value={page.background}
              onChange={(background) => onUpdatePage({ background })}
              paintStyles={paintStyles}
              onUpdatePaintStyles={onUpdatePaintStyles}
            />
            <Button
              type="button"
              variant={page.prototypeStart ? "secondary" : "outline"}
              className="w-full"
              onClick={() =>
                onUpdatePage({
                  prototypeStart: !(page.prototypeStart ?? false),
                })
              }
            >
              {page.prototypeStart
                ? "Prototype start page"
                : "Mark prototype start"}
            </Button>
            <Separator />
            <PageGridSection page={page} onUpdatePage={onUpdatePage} />
            <Separator />
            <DocumentVariablesSection
              variables={variables}
              variableDefinitions={variableDefinitions}
              variableCollections={variableCollections}
              variableModes={variableModes}
              activeVariableModeId={activeVariableModeId}
              onUpdateVariableSystem={onUpdateVariableSystem}
            />
            <Separator />
            <DesignTokenExportSection
              variables={variables}
              variableDefinitions={variableDefinitions}
              variableCollections={variableCollections}
              variableModes={variableModes}
              activeVariableModeId={activeVariableModeId}
              paintStyles={paintStyles}
              textStyles={textStyles}
              effectStyles={effectStyles}
              layoutGridStyles={layoutGridStyles}
              layoutPresetStyles={layoutPresetStyles}
            />
            <Separator />
            <FrameLayoutReviewPanel
              page={page}
              onUpdateLayers={onUpdateLayers}
            />
            <Separator />
            <TextFontInventoryPanel pages={pages} />
            <Separator />
            <ConnectorReviewPanel page={page} onUpdateLayers={onUpdateLayers} />
            <Separator />
            <FacilitationReviewPanel page={page} onUpdatePage={onUpdatePage} />
            <Separator />
            <PrototypeFlowSection
              page={page}
              pages={pages}
              onSelectLayer={onSelectLayer}
            />
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

function LayoutSizingSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  const sizing = getLayerSizing(layer);

  function updateSizing(
    axis: keyof NonNullable<DesignLayer["layoutSizing"]>,
    mode: DesignLayoutSizingMode,
  ) {
    const nextSizing = {
      ...defaultLayoutSizing,
      ...layer.layoutSizing,
      [axis]: mode,
    };

    onUpdateLayer(layer.id, {
      layoutSizing:
        nextSizing.horizontal === "fixed" && nextSizing.vertical === "fixed"
          ? undefined
          : nextSizing,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Sizing
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <SelectField<DesignLayoutSizingMode>
          label="Horizontal"
          value={sizing.horizontal}
          options={layoutSizingOptions}
          onChange={(mode) => updateSizing("horizontal", mode)}
        />
        <SelectField<DesignLayoutSizingMode>
          label="Vertical"
          value={sizing.vertical}
          options={layoutSizingOptions}
          onChange={(mode) => updateSizing("vertical", mode)}
        />
      </div>
      {layer.parentId ? (
        <Button
          type="button"
          variant={layer.absolutePositioned ? "secondary" : "outline"}
          className="w-full justify-between"
          onClick={() =>
            onUpdateLayer(layer.id, {
              absolutePositioned: layer.absolutePositioned ? undefined : true,
            })
          }
        >
          <span>Absolute in frame</span>
          <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
            {layer.absolutePositioned ? "On" : "Off"}
          </span>
        </Button>
      ) : null}
    </div>
  );
}

function ConstraintsSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  const constraints = getLayerConstraints(layer);

  function updateConstraints(
    axis: keyof NonNullable<DesignLayer["constraints"]>,
    value: DesignHorizontalConstraint | DesignVerticalConstraint,
  ) {
    const nextConstraints = {
      ...defaultConstraints,
      ...layer.constraints,
      [axis]: value,
    };

    onUpdateLayer(layer.id, {
      constraints:
        nextConstraints.horizontal === "left" &&
        nextConstraints.vertical === "top"
          ? undefined
          : nextConstraints,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Constraints
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <SelectField<DesignHorizontalConstraint>
          label="Horizontal"
          value={constraints.horizontal}
          options={horizontalConstraintOptions}
          onChange={(value) => updateConstraints("horizontal", value)}
        />
        <SelectField<DesignVerticalConstraint>
          label="Vertical"
          value={constraints.vertical}
          options={verticalConstraintOptions}
          onChange={(value) => updateConstraints("vertical", value)}
        />
      </div>
    </div>
  );
}

function AutoLayoutSection({
  frame,
  layers,
  onUpdateLayer,
  onUpdateLayers,
}: {
  frame: DesignLayer;
  layers: DesignLayer[];
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateLayers: (patches: LayerPatch[]) => void;
}) {
  const autoLayout = frame.autoLayout ?? defaultAutoLayout;
  const childCount = getAutoLayoutChildLayers(frame, layers).length;
  const adoptPatches = createAutoLayoutParentPatches(frame, layers);

  function updateAutoLayout(patch: Partial<typeof defaultAutoLayout>) {
    onUpdateLayer(frame.id, {
      autoLayout: {
        ...defaultAutoLayout,
        ...frame.autoLayout,
        ...patch,
        gap: Math.max(0, Math.round(patch.gap ?? frame.autoLayout?.gap ?? defaultAutoLayout.gap)),
        paddingX: Math.max(
          0,
          Math.round(patch.paddingX ?? frame.autoLayout?.paddingX ?? defaultAutoLayout.paddingX),
        ),
        paddingY: Math.max(
          0,
          Math.round(patch.paddingY ?? frame.autoLayout?.paddingY ?? defaultAutoLayout.paddingY),
        ),
      },
    });
  }

  function applyAutoLayout() {
    const patches = createAutoLayoutLayerPatches(frame, layers);

    if (patches.length > 0) {
      onUpdateLayers(patches);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Auto layout
        </div>
        <div className="text-xs text-muted-foreground">{childCount} children</div>
      </div>
      <SelectField<DesignAutoLayoutMode | "none">
        label="Mode"
        value={frame.autoLayout?.mode ?? "none"}
        options={autoLayoutModeOptions}
        onChange={(mode) =>
          mode === "none"
            ? onUpdateLayer(frame.id, { autoLayout: undefined })
            : updateAutoLayout({ mode })
        }
      />
      <SelectField<DesignAutoLayoutAlignment>
        label="Align"
        value={autoLayout.align}
        options={autoLayoutAlignmentOptions}
        onChange={(align) => updateAutoLayout({ align })}
      />
      <SelectField<DesignAutoLayoutWrap>
        label="Wrap"
        value={autoLayout.wrap ?? "nowrap"}
        options={autoLayoutWrapOptions}
        onChange={(wrap) => updateAutoLayout({ wrap })}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.25rem,1fr))] gap-2">
        <NumberField
          label="Gap"
          value={autoLayout.gap}
          min={0}
          onChange={(gap) => updateAutoLayout({ gap })}
        />
        <NumberField
          label="Pad X"
          value={autoLayout.paddingX}
          min={0}
          onChange={(paddingX) => updateAutoLayout({ paddingX })}
        />
        <NumberField
          label="Pad Y"
          value={autoLayout.paddingY}
          min={0}
          onChange={(paddingY) => updateAutoLayout({ paddingY })}
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={!frame.autoLayout || childCount === 0}
        onClick={applyAutoLayout}
      >
        Apply layout
      </Button>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={!frame.autoLayout || adoptPatches.length === 0}
        onClick={() => onUpdateLayers(adoptPatches)}
      >
        Adopt contained children
      </Button>
    </div>
  );
}

function ImageOptionsSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  const isVideo =
    layer.assetMetadata?.mimeType?.startsWith("video/") ||
    layer.imageSrc?.startsWith("data:video/");

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {isVideo ? "Video" : "Image"}
      </div>
      <SelectField<ImageFit>
        label="Fit"
        value={layer.imageFit ?? "cover"}
        options={imageFitOptions}
        onChange={(imageFit) => onUpdateLayer(layer.id, { imageFit })}
      />
    </div>
  );
}

function DevLinksSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  function updateDevLink(kind: DesignDevLinkKind, url: string) {
    const trimmedUrl = url.trim();
    const existingLinks = layer.devLinks ?? [];
    const nextLinks = trimmedUrl
      ? [
          ...existingLinks.filter((link) => link.kind !== kind),
          {
            kind,
            url: trimmedUrl,
            label: devLinkOptions.find((option) => option.kind === kind)?.label,
          },
        ]
      : existingLinks.filter((link) => link.kind !== kind);

    onUpdateLayer(layer.id, {
      devLinks: nextLinks.length > 0 ? nextLinks : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Dev links
      </div>
      {devLinkOptions.map((option) => (
        <Field key={option.kind} label={option.label}>
          <Input
            value={getDevLinkUrl(layer, option.kind)}
            placeholder={option.placeholder}
            onChange={(event) => updateDevLink(option.kind, event.target.value)}
          />
        </Field>
      ))}
    </div>
  );
}

function PrototypeSection({
  layer,
  pages,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  pages: DesignPage[];
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  const prototype = layer.prototype;
  const targetValue = prototype?.targetPageId ?? "none";
  const targetOptions = [
    { value: "none", label: "No target" },
    ...pages.map((page) => ({ value: page.id, label: page.name })),
  ];

  function updatePrototype(
    patch: Partial<NonNullable<DesignLayer["prototype"]>>,
  ) {
    const nextPrototype = {
      targetPageId: prototype?.targetPageId ?? pages[0]?.id ?? "",
      trigger: prototype?.trigger ?? "click",
      action: prototype?.action ?? "navigate",
      transition: prototype?.transition ?? "instant",
      durationMs: prototype?.durationMs ?? 300,
      preserveScroll: prototype?.preserveScroll ?? false,
      scrollBehavior:
        prototype?.scrollBehavior ??
        (prototype?.preserveScroll ? "preserve" : "reset"),
      overlayPosition: prototype?.overlayPosition ?? "center",
      closeOnOutside: prototype?.closeOnOutside ?? true,
      deviceFrame: prototype?.deviceFrame ?? "none",
      smartAnimate: prototype?.smartAnimate ?? false,
      ...patch,
    };

    onUpdateLayer(layer.id, {
      prototype: nextPrototype.targetPageId ? nextPrototype : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Prototype
      </div>
      <SelectField
        label="Target"
        value={targetValue}
        options={targetOptions}
        onChange={(targetPageId) =>
          targetPageId === "none"
            ? onUpdateLayer(layer.id, { prototype: undefined })
            : updatePrototype({ targetPageId })
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <SelectField<DesignPrototypeAction>
          label="Action"
          value={prototype?.action ?? "navigate"}
          options={prototypeActionOptions}
          onChange={(action) => updatePrototype({ action })}
        />
        <SelectField<DesignPrototypeTrigger>
          label="Trigger"
          value={prototype?.trigger ?? "click"}
          options={prototypeTriggerOptions}
          onChange={(trigger) => updatePrototype({ trigger })}
        />
        <SelectField<DesignPrototypeOverlayPosition>
          label="Overlay"
          value={prototype?.overlayPosition ?? "center"}
          options={prototypeOverlayPositionOptions}
          onChange={(overlayPosition) =>
            updatePrototype({
              action: "overlay",
              overlayPosition,
            })
          }
        />
        <SelectField<DesignPrototypeScrollBehavior>
          label="Scroll"
          value={
            prototype?.scrollBehavior ??
            (prototype?.preserveScroll ? "preserve" : "reset")
          }
          options={prototypeScrollBehaviorOptions}
          onChange={(scrollBehavior) =>
            updatePrototype({
              scrollBehavior,
              preserveScroll: scrollBehavior === "preserve",
            })
          }
        />
        <SelectField<DesignPrototypeTransition>
          label="Transition"
          value={prototype?.transition ?? "instant"}
          options={prototypeTransitionOptions}
          onChange={(transition) => updatePrototype({ transition })}
        />
        <SelectField<DesignPrototypeDeviceFrame>
          label="Device"
          value={prototype?.deviceFrame ?? "none"}
          options={prototypeDeviceFrameOptions}
          onChange={(deviceFrame) => updatePrototype({ deviceFrame })}
        />
      </div>
      <NumberField
        label="Duration"
        value={prototype?.durationMs ?? 300}
        min={0}
        max={5000}
        step={50}
        onChange={(durationMs) => updatePrototype({ durationMs })}
      />
      <Button
        type="button"
        variant={prototype?.smartAnimate ? "secondary" : "outline"}
        className="w-full"
        disabled={!prototype}
        onClick={() => updatePrototype({ smartAnimate: !(prototype?.smartAnimate ?? false) })}
      >
        {prototype?.smartAnimate ? "Smart animate on" : "Smart animate off"}
      </Button>
      <Button
        type="button"
        variant={prototype?.closeOnOutside === false ? "outline" : "secondary"}
        className="w-full"
        disabled={!prototype || (prototype?.action ?? "navigate") !== "overlay"}
        onClick={() =>
          updatePrototype({
            action: "overlay",
            closeOnOutside: !(prototype?.closeOnOutside ?? true),
          })
        }
      >
        {prototype?.closeOnOutside === false
          ? "Keep overlay open"
          : "Close overlay outside"}
      </Button>
    </div>
  );
}

function CodeConnectSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  function updateCodeConnect(
    patch: Partial<NonNullable<DesignLayer["codeConnect"]>>,
  ) {
    const nextMapping = {
      componentName: layer.codeConnect?.componentName ?? "",
      importPath: layer.codeConnect?.importPath ?? "",
      props: layer.codeConnect?.props ?? "",
      ...patch,
    };
    const hasMapping =
      nextMapping.componentName.trim() ||
      nextMapping.importPath.trim() ||
      nextMapping.props.trim();

    onUpdateLayer(layer.id, {
      codeConnect: hasMapping
        ? {
            componentName: nextMapping.componentName,
            importPath: nextMapping.importPath,
            props: nextMapping.props || undefined,
          }
        : undefined,
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Code Connect
      </div>
      <Field label="Component">
        <Input
          value={layer.codeConnect?.componentName ?? ""}
          placeholder="Button"
          onChange={(event) =>
            updateCodeConnect({ componentName: event.target.value })
          }
        />
      </Field>
      <Field label="Import path">
        <Input
          value={layer.codeConnect?.importPath ?? ""}
          placeholder="@/components/ui/button"
          onChange={(event) =>
            updateCodeConnect({ importPath: event.target.value })
          }
        />
      </Field>
      <Field label="Props JSON">
        <Textarea
          value={layer.codeConnect?.props ?? ""}
          rows={3}
          placeholder='{"variant":"default"}'
          onChange={(event) => updateCodeConnect({ props: event.target.value })}
        />
      </Field>
    </div>
  );
}

const prototypeTriggerOptions = [
  { value: "click", label: "Click" },
  { value: "hover", label: "Hover" },
  { value: "drag", label: "Drag" },
  { value: "delay", label: "Delay" },
] satisfies Array<{ value: DesignPrototypeTrigger; label: string }>;

const prototypeActionOptions = [
  { value: "navigate", label: "Navigate" },
  { value: "overlay", label: "Overlay" },
] satisfies Array<{ value: DesignPrototypeAction; label: string }>;

const prototypeTransitionOptions = [
  { value: "instant", label: "Instant" },
  { value: "dissolve", label: "Dissolve" },
  { value: "slide-left", label: "Slide left" },
  { value: "slide-right", label: "Slide right" },
  { value: "slide-up", label: "Slide up" },
  { value: "slide-down", label: "Slide down" },
] satisfies Array<{ value: DesignPrototypeTransition; label: string }>;

const prototypeOverlayPositionOptions = [
  { value: "center", label: "Center" },
  { value: "top", label: "Top" },
  { value: "bottom", label: "Bottom" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] satisfies Array<{ value: DesignPrototypeOverlayPosition; label: string }>;

const prototypeScrollBehaviorOptions = [
  { value: "reset", label: "Reset" },
  { value: "preserve", label: "Preserve" },
  { value: "lock", label: "Lock" },
] satisfies Array<{ value: DesignPrototypeScrollBehavior; label: string }>;

const prototypeDeviceFrameOptions = [
  { value: "none", label: "None" },
  { value: "phone", label: "Phone" },
  { value: "tablet", label: "Tablet" },
  { value: "desktop", label: "Desktop" },
] satisfies Array<{ value: DesignPrototypeDeviceFrame; label: string }>;

const fillRuleOptions = [
  { value: "nonzero", label: "Nonzero" },
  { value: "evenodd", label: "Even odd" },
] satisfies Array<{ value: FillRule; label: string }>;

const devLinkOptions: Array<{
  kind: DesignDevLinkKind;
  label: string;
  placeholder: string;
}> = [
  {
    kind: "storybook",
    label: "Storybook",
    placeholder: "https://storybook.example.com/?path=/story/button",
  },
  {
    kind: "github",
    label: "GitHub",
    placeholder: "https://github.com/org/repo/blob/main/component.tsx",
  },
  {
    kind: "jira",
    label: "Jira",
    placeholder: "https://company.atlassian.net/browse/UI-123",
  },
  {
    kind: "vscode",
    label: "VS Code",
    placeholder: "vscode://file/path/to/component.tsx",
  },
  {
    kind: "docs",
    label: "Docs",
    placeholder: "https://docs.example.com/design-system/button",
  },
];

function getDevLinkUrl(layer: DesignLayer, kind: DesignDevLinkKind) {
  return layer.devLinks?.find((link) => link.kind === kind)?.url ?? "";
}

function EffectsSection({
  layer,
  effectStyles,
  onUpdateLayer,
  onUpdateEffectStyles,
}: {
  layer: DesignLayer;
  effectStyles: Record<string, DesignEffectStyle>;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
  onUpdateEffectStyles: (styles: Record<string, DesignEffectStyle>) => void;
}) {
  const shadowEnabled = layer.shadowEnabled ?? false;
  const effectsVisible = layer.effectsVisible ?? true;
  const savedStyles = Object.values(effectStyles).sort((first, second) =>
    first.name.localeCompare(second.name),
  );

  function applyStyle(styleId: string) {
    const style = effectStyles[styleId];

    if (style) {
      onUpdateLayer(layer.id, getEffectStyleLayerPatch(style));
    }
  }

  function saveStyle() {
    const styleId = nanoid();

    onUpdateEffectStyles({
      ...effectStyles,
      [styleId]: createEffectStyleFromLayer(
        styleId,
        `${layer.name || "Effect"} ${savedStyles.length + 1}`,
        layer,
      ),
    });
  }

  function removeStyle(styleId: string) {
    const remainingStyles = { ...effectStyles };
    delete remainingStyles[styleId];
    onUpdateEffectStyles(remainingStyles);
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Effects
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
        <Select value="" onValueChange={applyStyle}>
          <SelectTrigger className="h-8 min-w-0">
            <SelectValue placeholder="Apply effect style" />
          </SelectTrigger>
          <SelectContent>
            {savedStyles.length > 0 ? (
              savedStyles.map((style) => (
                <SelectItem key={style.id} value={style.id}>
                  {style.name}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="__empty" disabled>
                No saved effect styles
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="outline"
          className="h-8 px-2 text-xs"
          onClick={saveStyle}
        >
          Save
        </Button>
      </div>
      {savedStyles.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {savedStyles.slice(0, 6).map((style) => (
            <div
              key={style.id}
              className="flex h-6 max-w-full items-center overflow-hidden rounded-md border border-border bg-background text-[11px]"
            >
              <button
                type="button"
                className="min-w-0 px-1.5 text-left text-muted-foreground hover:text-foreground"
                onClick={() => applyStyle(style.id)}
              >
                <span className="block max-w-28 truncate">{style.name}</span>
              </button>
              <button
                type="button"
                className="grid h-full w-5 place-items-center text-muted-foreground/70 hover:text-destructive"
                aria-label={`Remove ${style.name} effect style`}
                onClick={() => removeStyle(style.id)}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <Button
          type="button"
          variant={effectsVisible ? "secondary" : "outline"}
          onClick={() =>
            onUpdateLayer(layer.id, { effectsVisible: !effectsVisible })
          }
        >
          {effectsVisible ? "Visible" : "Hidden"}
        </Button>
        <Button
          type="button"
          variant={shadowEnabled ? "secondary" : "outline"}
          onClick={() =>
            onUpdateLayer(layer.id, {
              effectsVisible: true,
              shadowEnabled: !shadowEnabled,
              shadowColor: layer.shadowColor ?? "rgb(0 0 0 / 0.24)",
              shadowX: layer.shadowX ?? 0,
              shadowY: layer.shadowY ?? 12,
              shadowBlur: layer.shadowBlur ?? 24,
              shadowSpread: layer.shadowSpread ?? 0,
            })
          }
        >
          {shadowEnabled ? "Shadow on" : "Shadow off"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            onUpdateLayer(layer.id, {
              shadowEnabled: false,
              shadowColor: undefined,
              shadowX: undefined,
              shadowY: undefined,
              shadowBlur: undefined,
              shadowSpread: undefined,
              layerBlur: undefined,
              backgroundBlur: undefined,
              effectsVisible: true,
            })
          }
        >
          Reset
        </Button>
      </div>
      {shadowEnabled ? (
        <>
          <ColorField
            label="Shadow color"
            value={layer.shadowColor ?? "rgb(0 0 0 / 0.24)"}
            onChange={(shadowColor) =>
              onUpdateLayer(layer.id, { shadowColor })
            }
          />
          <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
            <NumberField
              label="Shadow X"
              value={layer.shadowX ?? 0}
              onChange={(shadowX) => onUpdateLayer(layer.id, { shadowX })}
            />
            <NumberField
              label="Shadow Y"
              value={layer.shadowY ?? 12}
              onChange={(shadowY) => onUpdateLayer(layer.id, { shadowY })}
            />
            <NumberField
              label="Blur"
              value={layer.shadowBlur ?? 24}
              min={0}
              onChange={(shadowBlur) =>
                onUpdateLayer(layer.id, { shadowBlur })
              }
            />
            <NumberField
              label="Spread"
              value={layer.shadowSpread ?? 0}
              onChange={(shadowSpread) =>
                onUpdateLayer(layer.id, { shadowSpread })
              }
            />
          </div>
        </>
      ) : null}
      <NumberField
        label="Layer blur"
        value={layer.layerBlur ?? 0}
        min={0}
        onChange={(layerBlur) =>
          onUpdateLayer(layer.id, {
            effectsVisible: true,
            layerBlur: layerBlur > 0 ? layerBlur : undefined,
          })
        }
      />
      <NumberField
        label="Background blur"
        value={layer.backgroundBlur ?? 0}
        min={0}
        onChange={(backgroundBlur) =>
          onUpdateLayer(layer.id, {
            effectsVisible: true,
            backgroundBlur: backgroundBlur > 0 ? backgroundBlur : undefined,
          })
        }
      />
    </div>
  );
}

function StrokeOptionsSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Stroke options
      </div>
      <Field label="Dash pattern">
        <Input
          value={layer.strokeDash ?? ""}
          placeholder="6 4"
          spellCheck={false}
          onChange={(event) =>
            onUpdateLayer(layer.id, {
              strokeDash: event.target.value.trim() || undefined,
            })
          }
        />
      </Field>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <SelectField
          label="Cap"
          value={layer.strokeLineCap ?? "butt"}
          options={strokeLineCapOptions}
          onChange={(strokeLineCap) =>
            onUpdateLayer(layer.id, { strokeLineCap })
          }
        />
        <SelectField
          label="Join"
          value={layer.strokeLineJoin ?? "miter"}
          options={strokeLineJoinOptions}
          onChange={(strokeLineJoin) =>
            onUpdateLayer(layer.id, { strokeLineJoin })
          }
        />
      </div>
    </div>
  );
}

function VectorPathSection({
  layer,
  onUpdateLayer,
}: {
  layer: DesignLayer;
  onUpdateLayer: (layerId: string, patch: Partial<DesignLayer>) => void;
}) {
  const viewBox = layer.pathViewBox ?? {
    x: 0,
    y: 0,
    width: layer.width,
    height: layer.height,
  };

  function updateViewBox(patch: Partial<NonNullable<DesignLayer["pathViewBox"]>>) {
    onUpdateLayer(layer.id, {
      pathViewBox: {
        ...viewBox,
        ...patch,
        width: Math.max(1, patch.width ?? viewBox.width),
        height: Math.max(1, patch.height ?? viewBox.height),
      },
    });
  }

  function applyPathPatch(patch: Partial<DesignLayer> | null) {
    if (patch) {
      onUpdateLayer(layer.id, patch);
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Vector
      </div>
      <Field label="Path data">
        <Textarea
          value={layer.pathData ?? ""}
          rows={4}
          spellCheck={false}
          className="font-mono text-xs"
          placeholder="M 0 0 L 100 0 L 100 100 Z"
          onChange={(event) =>
            onUpdateLayer(layer.id, { pathData: event.target.value })
          }
        />
      </Field>
      <SelectField
        label="Fill rule"
        value={layer.fillRule ?? "nonzero"}
        options={fillRuleOptions}
        onChange={(fillRule) => onUpdateLayer(layer.id, { fillRule })}
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.25rem,1fr))] gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!layer.pathData}
          onClick={() => applyPathPatch(createNormalizedPathPatch(layer))}
        >
          Normalize
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!layer.pathData}
          onClick={() => applyPathPatch(createFlippedPathPatch(layer, "horizontal"))}
        >
          Flip H
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!layer.pathData}
          onClick={() => applyPathPatch(createFlippedPathPatch(layer, "vertical"))}
        >
          Flip V
        </Button>
      </div>
      <VectorPathNodeSection layer={layer} onUpdateLayer={onUpdateLayer} />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(6.5rem,1fr))] gap-2">
        <NumberField
          label="View X"
          value={viewBox.x}
          onChange={(x) => updateViewBox({ x })}
        />
        <NumberField
          label="View Y"
          value={viewBox.y}
          onChange={(y) => updateViewBox({ y })}
        />
        <NumberField
          label="View W"
          value={viewBox.width}
          min={1}
          onChange={(width) => updateViewBox({ width })}
        />
        <NumberField
          label="View H"
          value={viewBox.height}
          min={1}
          onChange={(height) => updateViewBox({ height })}
        />
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() =>
          onUpdateLayer(layer.id, {
            pathViewBox: {
              x: 0,
              y: 0,
              width: Math.max(1, Math.round(layer.width)),
              height: Math.max(1, Math.round(layer.height)),
            },
          })
        }
      >
        Reset viewBox only
      </Button>
    </div>
  );
}

function SelectField<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: TValue;
  options: ReadonlyArray<{ value: TValue; label: string }>;
  onChange: (value: TValue) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(nextValue as TValue)}
      >
        <SelectTrigger className="min-w-0 w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

function PageGridSection({
  page,
  onUpdatePage,
}: {
  page: DesignPage;
  onUpdatePage: (patch: DesignPagePatch) => void;
}) {
  const grid = page.grid ?? {
    visible: true,
    snap: false,
    objectSnap: true,
    size: 24,
  };

  function updateGrid(patch: Partial<NonNullable<DesignPage["grid"]>>) {
    onUpdatePage({
      grid: {
        ...grid,
        ...patch,
        size: Math.max(4, Math.round(patch.size ?? grid.size)),
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Grid
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(5.25rem,1fr))] gap-2">
        <Button
          type="button"
          variant={grid.visible ? "secondary" : "outline"}
          onClick={() => updateGrid({ visible: !grid.visible })}
        >
          {grid.visible ? "Visible" : "Hidden"}
        </Button>
        <Button
          type="button"
          variant={grid.snap ? "secondary" : "outline"}
          onClick={() => updateGrid({ snap: !grid.snap })}
        >
          {grid.snap ? "Snap on" : "Snap off"}
        </Button>
        <Button
          type="button"
          variant={grid.objectSnap ? "secondary" : "outline"}
          onClick={() => updateGrid({ objectSnap: !grid.objectSnap })}
        >
          {grid.objectSnap ? "Objects" : "Free"}
        </Button>
      </div>
      <NumberField
        label="Grid size"
        value={grid.size}
        min={4}
        onChange={(size) => updateGrid({ size })}
      />
    </div>
  );
}

function PrototypeFlowSection({
  page,
  pages,
  onSelectLayer,
}: {
  page: DesignPage;
  pages: DesignPage[];
  onSelectLayer: (layerId: string) => void;
}) {
  const hotspotLayers = page.layers.filter((layer) => layer.prototype);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Prototype flow
        </div>
        <div className="text-xs text-muted-foreground">
          {page.prototypeStart ? "Start / " : ""}
          {hotspotLayers.length} hotspots
        </div>
      </div>
      {page.prototypeStart ? (
        <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-100">
          This page is marked as a prototype flow starting point.
        </div>
      ) : null}
      {hotspotLayers.length > 0 ? (
        <div className="space-y-2">
          {hotspotLayers.map((layer) => {
            const prototype = layer.prototype;
            const targetPage = pages.find(
              (item) => item.id === prototype?.targetPageId,
            );
            const diagnostics = getPrototypeDiagnostics(layer, targetPage);

            return (
              <button
                key={layer.id}
                type="button"
                className="w-full rounded-md border border-border bg-background/50 p-2 text-left text-xs hover:bg-muted"
                onClick={() => onSelectLayer(layer.id)}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate font-medium text-foreground">
                    {layer.name}
                  </span>
                  <span className="shrink-0 text-muted-foreground">
                    {prototype?.durationMs ?? 0}ms
                  </span>
                </div>
                <div className="mt-1 truncate text-muted-foreground">
                  {getPrototypeLabel(prototype?.trigger)} {"->"}{" "}
                  {targetPage?.name ?? "Unknown page"}
                </div>
                <div className="mt-1 truncate font-mono text-[10px] text-muted-foreground">
                  {prototype?.action ?? "navigate"} /{" "}
                  {prototype?.transition ?? "instant"}
                  {prototype?.smartAnimate ? " / smart" : ""}
                  {prototype?.deviceFrame && prototype.deviceFrame !== "none"
                    ? ` / ${prototype.deviceFrame}`
                    : ""}
                </div>
                {diagnostics.length > 0 ? (
                  <div className="mt-1 text-[10px] text-amber-300">
                    {diagnostics.join(" / ")}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-3 text-xs text-muted-foreground">
          No prototype hotspots on this page.
        </div>
      )}
    </div>
  );
}

function getPrototypeDiagnostics(
  layer: DesignLayer,
  targetPage: DesignPage | undefined,
) {
  const prototype = layer.prototype;

  if (!prototype) {
    return [];
  }

  return [
    targetPage ? null : "Missing target",
    prototype.action === "overlay" && prototype.transition === "instant"
      ? "Overlay has no transition"
      : null,
    prototype.smartAnimate && prototype.durationMs < 150
      ? "Smart transition too fast"
      : null,
    prototype.scrollBehavior === "lock" && prototype.action !== "overlay"
      ? "Scroll lock works best with overlays"
      : null,
  ].filter((item): item is string => Boolean(item));
}

function getPrototypeLabel(
  trigger: NonNullable<DesignLayer["prototype"]>["trigger"] | undefined,
) {
  if (trigger === "hover") {
    return "Hover";
  }

  if (trigger === "drag") {
    return "Drag";
  }

  if (trigger === "delay") {
    return "Delay";
  }

  return "Click";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-2">
      <Label className="block truncate text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

function ContrastBadge({ report }: { report: ReturnType<typeof getContrastReport> }) {
  return (
    <div className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground">
      {report ? (
        <>
          Contrast{" "}
          <span className="font-mono text-foreground">
            {report.ratio.toFixed(2)}:1
          </span>{" "}
          / {report.label}
        </>
      ) : (
        "Contrast unavailable for this paint"
      )}
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <NumberInput
        value={Number.isFinite(value) ? value : 0}
        min={min}
        max={max}
        step={step}
        onChange={onChange}
      />
    </Field>
  );
}

function ColorField({
  label,
  value,
  onChange,
  blendMode,
  onBlendModeChange,
  paintStyles,
  onUpdatePaintStyles,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  blendMode?: string;
  onBlendModeChange?: (value: string) => void;
  paintStyles?: Record<string, DesignPaintStyle>;
  onUpdatePaintStyles?: (styles: Record<string, DesignPaintStyle>) => void;
}) {
  const savedStyles = Object.values(paintStyles ?? {}).sort((first, second) =>
    first.name.localeCompare(second.name),
  );

  function applyStyle(styleId: string) {
    const style = paintStyles?.[styleId];

    if (!style) {
      return;
    }

    onChange(style.value);

    if (style.blendMode && onBlendModeChange) {
      onBlendModeChange(style.blendMode);
    }
  }

  function saveStyle() {
    if (!paintStyles || !onUpdatePaintStyles) {
      return;
    }

    const styleId = nanoid();

    onUpdatePaintStyles({
      ...paintStyles,
      [styleId]: createPaintStyleValue({
        id: styleId,
        name: `${label} ${savedStyles.length + 1}`,
        value,
        blendMode,
      }),
    });
  }

  function removeStyle(styleId: string) {
    if (!paintStyles || !onUpdatePaintStyles) {
      return;
    }

    const remainingStyles = { ...paintStyles };
    delete remainingStyles[styleId];
    onUpdatePaintStyles(remainingStyles);
  }

  return (
    <Field label={label}>
      <div className="space-y-2">
        <ColorPicker
          value={value}
          blendMode={blendMode}
          onChange={onChange}
          onBlendModeChange={onBlendModeChange}
          aria-label={label}
        />
        {paintStyles && onUpdatePaintStyles ? (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <Select value="" onValueChange={applyStyle}>
              <SelectTrigger className="h-8 min-w-0">
                <SelectValue placeholder="Apply paint style" />
              </SelectTrigger>
              <SelectContent>
                {savedStyles.length > 0 ? (
                  savedStyles.map((style) => (
                    <SelectItem key={style.id} value={style.id}>
                      {style.name}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="__empty" disabled>
                    No saved paint styles
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="outline"
              className="h-8 px-2 text-xs"
              onClick={saveStyle}
            >
              Save
            </Button>
          </div>
        ) : null}
        {savedStyles.length > 0 && paintStyles && onUpdatePaintStyles ? (
          <div className="flex flex-wrap gap-1">
            {savedStyles.slice(0, 6).map((style) => (
              <div
                key={style.id}
                className="flex h-6 max-w-full items-center overflow-hidden rounded-md border border-border bg-background text-[11px]"
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-1 px-1.5 text-muted-foreground hover:text-foreground"
                  onClick={() => applyStyle(style.id)}
                >
                  <span
                    className="size-3 shrink-0 rounded-sm border border-border"
                    style={{ background: style.value }}
                  />
                  <span className="max-w-20 truncate">{style.name}</span>
                </button>
                <button
                  type="button"
                  className="grid h-full w-5 place-items-center text-muted-foreground/70 hover:text-destructive"
                  aria-label={`Remove ${style.name} paint style`}
                  onClick={() => removeStyle(style.id)}
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Field>
  );
}
