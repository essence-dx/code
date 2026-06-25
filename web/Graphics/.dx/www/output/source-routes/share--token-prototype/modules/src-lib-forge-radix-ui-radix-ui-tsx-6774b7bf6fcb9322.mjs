
export const dxSourceText = "import * as React from \"react\";\n\ntype PrimitiveProps = React.HTMLAttributes<HTMLElement> & {\n  asChild?: boolean;\n  checked?: boolean;\n  defaultChecked?: boolean;\n  disabled?: boolean;\n  value?: string;\n  defaultValue?: string | string[] | number[];\n  open?: boolean;\n  defaultOpen?: boolean;\n  modal?: boolean;\n  orientation?: \"horizontal\" | \"vertical\";\n  side?: \"top\" | \"right\" | \"bottom\" | \"left\";\n  align?: \"start\" | \"center\" | \"end\";\n  sideOffset?: number;\n  position?: string;\n  min?: number;\n  max?: number;\n};\n\ntype PrimitiveComponent = React.FC<PrimitiveProps & React.RefAttributes<HTMLElement>>;\ntype PrimitiveGroup<T extends Record<string, PrimitiveComponent>> = T;\n\nfunction slotElement(props: PrimitiveProps, ref?: React.Ref<HTMLElement>) {\n  const { asChild: _asChild, children, ...rest } = props;\n  if (React.isValidElement(children)) {\n    return React.cloneElement(children, { ...rest, ref } as Record<string, unknown>);\n  }\n  return React.createElement(\"span\", { ...rest, ref }, children);\n}\n\nfunction primitive(tagName: string, attributes: Record<string, unknown> = {}): PrimitiveComponent {\n  return React.forwardRef<HTMLElement, PrimitiveProps>(\n    ({ asChild = false, children, ...props }, ref) => {\n      if (asChild) {\n        return slotElement({ children, ...props }, ref);\n      }\n      return React.createElement(tagName, { ...attributes, ...props, ref }, children);\n    },\n  );\n}\n\nfunction passthrough(): PrimitiveComponent {\n  return React.forwardRef<HTMLElement, PrimitiveProps>(({ children }, _ref) => children ?? null);\n}\n\nexport const Slot = React.forwardRef<HTMLElement, PrimitiveProps>(\n  ({ children, ...props }, ref) => slotElement({ children, ...props }, ref),\n);\n\nconst Root = passthrough();\nconst Portal = passthrough();\nconst Provider = passthrough();\nconst Group = primitive(\"div\");\nconst Trigger = primitive(\"button\", { type: \"button\" });\nconst Close = primitive(\"button\", { type: \"button\" });\nconst Overlay = primitive(\"div\");\nconst Content = primitive(\"div\");\nconst Title = primitive(\"h2\");\nconst Description = primitive(\"p\");\nconst Action = primitive(\"button\", { type: \"button\" });\nconst Cancel = primitive(\"button\", { type: \"button\" });\nconst LabelRoot = primitive(\"label\");\nconst SeparatorRoot = primitive(\"div\", { role: \"separator\" });\nconst Arrow = primitive(\"span\", { \"aria-hidden\": true });\n\nexport const Dialog = {\n  Root,\n  Trigger,\n  Portal,\n  Close,\n  Overlay,\n  Content,\n  Title,\n  Description,\n};\n\nexport const AlertDialog = {\n  Root,\n  Trigger,\n  Portal,\n  Overlay,\n  Content,\n  Title,\n  Description,\n  Action,\n  Cancel,\n};\n\nexport const Tooltip = {\n  Provider,\n  Root,\n  Trigger,\n  Portal,\n  Content,\n  Arrow,\n};\n\nexport const DropdownMenu = {\n  Root,\n  Portal,\n  Trigger,\n  Content,\n  Group,\n  Item: primitive(\"div\", { role: \"menuitem\" }),\n  CheckboxItem: primitive(\"div\", { role: \"menuitemcheckbox\" }),\n  RadioGroup: primitive(\"div\", { role: \"radiogroup\" }),\n  RadioItem: primitive(\"div\", { role: \"menuitemradio\" }),\n  ItemIndicator: primitive(\"span\", { \"aria-hidden\": true }),\n  Label: primitive(\"div\"),\n  Separator: SeparatorRoot,\n  Sub: passthrough(),\n  SubTrigger: primitive(\"div\", { role: \"menuitem\" }),\n  SubContent: primitive(\"div\"),\n};\n\nexport const Tabs = {\n  Root: primitive(\"div\"),\n  List: primitive(\"div\", { role: \"tablist\" }),\n  Trigger: primitive(\"button\", { type: \"button\", role: \"tab\" }),\n  Content: primitive(\"div\", { role: \"tabpanel\" }),\n};\n\nexport const Select = {\n  Root: passthrough(),\n  Group,\n  Value: primitive(\"span\"),\n  Trigger,\n  Portal,\n  Content,\n  Viewport: primitive(\"div\"),\n  Label: primitive(\"div\"),\n  Item: primitive(\"div\", { role: \"option\" }),\n  ItemText: primitive(\"span\"),\n  ItemIndicator: primitive(\"span\", { \"aria-hidden\": true }),\n  Icon: primitive(\"span\", { \"aria-hidden\": true }),\n  Separator: SeparatorRoot,\n  ScrollUpButton: primitive(\"div\", { \"aria-hidden\": true }),\n  ScrollDownButton: primitive(\"div\", { \"aria-hidden\": true }),\n};\n\nexport const ScrollArea = {\n  Root: primitive(\"div\"),\n  Viewport: primitive(\"div\"),\n  Scrollbar: primitive(\"div\", { role: \"scrollbar\" }),\n  Thumb: primitive(\"div\"),\n  Corner: primitive(\"div\"),\n};\n\nexport const Avatar = {\n  Root: primitive(\"span\"),\n  Image: primitive(\"img\"),\n  Fallback: primitive(\"span\"),\n};\n\nexport const Label = {\n  Root: LabelRoot,\n};\n\nexport const Separator = {\n  Root: SeparatorRoot,\n};\n\nexport const Popover = {\n  Root,\n  Trigger,\n  Anchor: primitive(\"span\"),\n  Portal,\n  Content,\n  Close,\n  Arrow,\n};\n\nexport const Slider = {\n  Root: primitive(\"div\"),\n  Track: primitive(\"div\"),\n  Range: primitive(\"div\"),\n  Thumb: primitive(\"span\", { role: \"slider\", tabIndex: 0 }),\n};\n\nexport const Switch = {\n  Root: primitive(\"button\", { type: \"button\", role: \"switch\" }),\n  Thumb: primitive(\"span\"),\n};\n\nexport const Toggle = {\n  Root: primitive(\"button\", { type: \"button\" }),\n};\n\nexport const Progress = {\n  Root: primitive(\"div\", { role: \"progressbar\" }),\n  Indicator: primitive(\"div\"),\n};\n\nexport const radixPrimitiveGroups: PrimitiveGroup<Record<string, PrimitiveComponent>>[] = [\n  Dialog,\n  AlertDialog,\n  Tooltip,\n  DropdownMenu,\n  Tabs,\n  Select,\n  ScrollArea,\n  Avatar,\n  Label,\n  Separator,\n  Popover,\n  Slider,\n  Switch,\n  Toggle,\n  Progress,\n];\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/radix-ui/radix-ui.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-radix-ui-radix-ui-tsx-6774b7bf6fcb9322.mjs",
  "kind": "tsx",
  "hash": "6774b7bf6fcb9322",
  "dependencies": [
    {
      "specifier": "react",
      "resolved_path": null,
      "chunk_output": null,
      "kind": "compiler-intrinsic",
      "resolver_source": "compiler-intrinsic",
      "node_modules_required": false
    }
  ],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/radix-ui/radix-ui.tsx",
    "source_kind": "tsx",
    "parser_backend": "oxc-parser",
    "diagnostics": 0,
    "compatibility_reference": {
      "upstream_crates": [
        "turbopack-ecmascript"
      ],
      "reference_only": true,
      "runtime_build_adoption": false,
      "public_runtime_dependency": false,
      "vendor_root": "vendor/next-rust",
      "vendor_commit": "f3f56ecec2f3f8cefa0f0a1323ea406740251d5c",
      "next_transform_references": [
        "next-custom-transforms::track_dynamic_imports",
        "next-custom-transforms::react_server_components"
      ],
      "copied_code": false
    },
    "output_model": {
      "contract": "dx.www.moduleGraph",
      "compiler_owns_output": true,
      "public_architecture": "DX-owned source graph analysis"
    },
    "runtime_boundaries": {
      "next_runtime_required": false,
      "react_runtime_required": false,
      "rsc_required": false,
      "node_modules_required": false
    },
    "directives": [],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      }
    ],
    "dynamic_imports": [],
    "unresolved_dynamic_imports": [],
    "unsupported_dynamic_imports": [],
    "dynamic_import_analysis": {
      "status": "none-observed",
      "static_count": 0,
      "unresolved_count": 0,
      "unsupported_count": 0,
      "boundary": "source-owned dynamic import analysis; static specifiers become evidence, expressions remain unresolved, and unsupported call forms stay as adapter-boundary receipts"
    },
    "export_names": [
      "Slot",
      "Dialog",
      "AlertDialog",
      "Tooltip",
      "DropdownMenu",
      "Tabs",
      "Select",
      "ScrollArea",
      "Avatar",
      "Label",
      "Separator",
      "Popover",
      "Slider",
      "Switch",
      "Toggle",
      "Progress",
      "radixPrimitiveGroups"
    ],
    "jsx": true,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: false,
  transformKind: "metadata-only",
  exportNames: []
});
export const dxRuntimeExports = Object.freeze({});
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
