
export const dxSourceText = "\n\n\n\n\n\n  Component extends (props?: infer Props) => unknown ? Omit<Props, \"class\" | \"className\"> : never;\n\nexport function cx(...values) {\n  return values.flatMap(flattenClassValue).join(\" \").trim();\n}\n\nexport const cn = cx;\n\nexport function cva<T extends VariantRecord = VariantRecord>(base?, config= {}) {\n  return (props: CvaProps<T> = {}) => {\n    const selections = { ...config.defaultVariants, ...props } as Record<string, unknown>;\n    const variantClasses = Object.entries(config.variants ?? {}).map(([variantName, variantValues]) => {\n      const selectedValue = selections[variantName];\n\n      if (selectedValue == null) {\n        return null;\n      }\n\n      return variantValues[String(selectedValue)];\n    });\n\n    const compoundClasses = (config.compoundVariants ?? []).map((compound) => {\n      const matches = Object.entries(compound).every(([key, value]) => {\n        if (key === \"class\" || key === \"className\") {\n          return true;\n        }\n\n        return selections[key] === value;\n      });\n\n      return matches ? compound.class ?? compound.className : null;\n    });\n\n    return cx(base, variantClasses, compoundClasses, props.class, props.className);\n  };\n}\n\nfunction flattenClassValue(value: ClassValue): string[] {\n  if (!value) {\n    return [];\n  }\n\n  if (Array.isArray(value)) {\n    return value.flatMap(flattenClassValue);\n  }\n\n  if (typeof value === \"object\") {\n    return Object.entries(value)\n      .filter(([, enabled]) => Boolean(enabled))\n      .map(([className]) => className);\n  }\n\n  return [String(value)];\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/lib/forge/variants/class-variance-authority.ts",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-variants-class-variance-authority-ts-357cdf6d80c9f9e9.mjs",
  "kind": "ts",
  "hash": "357cdf6d80c9f9e9",
  "dependencies": [],
  "browser_executable": true,
  "source_transformed": true,
  "transform_kind": "typescript-helper-runtime",
  "runtime_exports": [
    "cx",
    "cva"
  ],
  "ecmascript_analysis": {
    "schema": "dx.ecmascript.analysis",
    "schema_revision": 1,
    "source_path": "src/lib/forge/variants/class-variance-authority.ts",
    "source_kind": "ts",
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
      "cx",
      "cva"
    ],
    "jsx": false,
    "top_level_await": false,
    "full_nextjs_parity": false,
    "analysis_boundary": "Uses vendored Turbopack ECMAScript and selected Next transform behavior as compatibility references while emitting DX-owned source graph receipts."
  },
  "node_modules_required": false
});
export const dxRuntimeModule = Object.freeze({
  transformed: true,
  transformKind: "typescript-helper-runtime",
  exportNames: ["cx","cva"]
});






  Component extends (props?: infer Props) => unknown ? Omit<Props, "class" | "className"> : never;

export function cx(...values) {
  return values.flatMap(flattenClassValue).join(" ").trim();
}

export const cn = cx;

export function cva<T extends VariantRecord = VariantRecord>(base?, config= {}) {
  return (props: CvaProps<T> = {}) => {
    const selections = { ...config.defaultVariants, ...props } as Record<string, unknown>;
    const variantClasses = Object.entries(config.variants ?? {}).map(([variantName, variantValues]) => {
      const selectedValue = selections[variantName];

      if (selectedValue == null) {
        return null;
      }

      return variantValues[String(selectedValue)];
    });

    const compoundClasses = (config.compoundVariants ?? []).map((compound) => {
      const matches = Object.entries(compound).every(([key, value]) => {
        if (key === "class" || key === "className") {
          return true;
        }

        return selections[key] === value;
      });

      return matches ? compound.class ?? compound.className : null;
    });

    return cx(base, variantClasses, compoundClasses, props.class, props.className);
  };
}

function flattenClassValue(value: ClassValue): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(flattenClassValue);
  }

  if (typeof value === "object") {
    return Object.entries(value)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([className]) => className);
  }

  return [String(value)];
}
export const dxRuntimeExports = Object.freeze({ cx, cva });
export const dxLinkedDependencies = Object.freeze([]);
export default dxSourceModule;
