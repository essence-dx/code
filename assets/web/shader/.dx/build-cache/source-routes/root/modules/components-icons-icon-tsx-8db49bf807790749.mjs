
export const dxSourceText = "export type IconProps = {\r\n  name: string;\r\n  title?: string;\r\n  className?: string;\r\n  \"aria-hidden\"?: string | boolean;\r\n  [attribute: string]: unknown;\r\n};\r\n\r\nexport function Icon({ name, title, className, ...props }: IconProps) {\r\n  return (\r\n    <span\r\n      aria-hidden={title ? undefined : true}\r\n      aria-label={title}\r\n      className={className}\r\n      data-dx-icon={name}\r\n      data-icon-source=\"dx-icons\"\r\n      role={title ? \"img\" : undefined}\r\n      {...props}\r\n    />\r\n  );\r\n}\r\n";
export const dxSourceModule = Object.freeze({
  "source_path": "components/icons/icon.tsx",
  "chunk_output": ".dx/www/output/.dx/build-cache/source-routes/root/modules/components-icons-icon-tsx-8db49bf807790749.mjs",
  "kind": "tsx",
  "hash": "8db49bf807790749",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": false,
  "transform_kind": "metadata-only",
  "runtime_exports": [],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "components/icons/icon.tsx",
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
    "static_imports": [],
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
      "Icon"
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
