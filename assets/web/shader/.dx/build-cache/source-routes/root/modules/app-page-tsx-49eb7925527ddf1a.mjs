import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./components-icons-icon-tsx-8db49bf807790749.mjs";
export const dxSourceText = "import { Icon } from \"../components/icons/icon\";\r\n\r\nexport const metadata = {\r\n  title: \"Shader\",\r\n  description: \"Shader\",\r\n} as const;\r\n\r\nexport default function HomePage() {\r\n  return (\r\n    <main className=\"dx-shader-root\" data-dx-route=\"/\" data-dx-template=\"dx-shader\">\r\n      <header className=\"topbar\">\r\n        <div className=\"brand\">\r\n          <img className=\"brand-mark\" src=\"/favicon.svg\" alt=\"Shader Logo\" />\r\n          <span className=\"brand-name\">Shader</span>\r\n        </div>\r\n\r\n        <div className=\"topbar-center\">\r\n          <div\r\n            className=\"segmented\"\r\n            id=\"dx-shader-aspect-control\"\r\n            role=\"group\"\r\n            aria-label=\"Canvas aspect ratio\"\r\n          />\r\n        </div>\r\n\r\n        <div className=\"topbar-actions\">\r\n          <button\r\n            className=\"btn btn-primary\"\r\n            id=\"btn-random\"\r\n            title=\"Randomize everything (R)\"\r\n            type=\"button\"\r\n          >\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <rect\r\n                x=\"1.5\"\r\n                y=\"1.5\"\r\n                width=\"13\"\r\n                height=\"13\"\r\n                rx=\"3\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n              <circle cx=\"5.4\" cy=\"5.4\" r=\"1.25\" fill=\"currentColor\" />\r\n              <circle cx=\"10.6\" cy=\"10.6\" r=\"1.25\" fill=\"currentColor\" />\r\n              <circle cx=\"10.6\" cy=\"5.4\" r=\"1.25\" fill=\"currentColor\" />\r\n              <circle cx=\"5.4\" cy=\"10.6\" r=\"1.25\" fill=\"currentColor\" />\r\n            </svg>\r\n            Randomize\r\n          </button>\r\n          <div className=\"topbar-divider\" />\r\n          <button\r\n            className=\"btn\"\r\n            id=\"btn-export-png\"\r\n            title=\"Save still image (S)\"\r\n            type=\"button\"\r\n          >\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <rect\r\n                x=\"1.5\"\r\n                y=\"1.5\"\r\n                width=\"13\"\r\n                height=\"13\"\r\n                rx=\"2\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n              <circle cx=\"5.5\" cy=\"5.5\" r=\"1.5\" fill=\"currentColor\" />\r\n              <path\r\n                d=\"M2 12 L6 8 L9 11 L11.5 8.5 L14 11\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n            </svg>\r\n            Image\r\n          </button>\r\n          <button\r\n            className=\"btn\"\r\n            id=\"btn-export-video\"\r\n            title=\"Record looping video\"\r\n            type=\"button\"\r\n          >\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <rect\r\n                x=\"1.5\"\r\n                y=\"3.5\"\r\n                width=\"9\"\r\n                height=\"9\"\r\n                rx=\"2\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n              <path\r\n                d=\"M10.5 7 L14.5 4.5 V11.5 L10.5 9\"\r\n                fill=\"currentColor\"\r\n              />\r\n            </svg>\r\n            Video\r\n          </button>\r\n          <button\r\n            className=\"btn\"\r\n            id=\"btn-export-gif\"\r\n            title=\"Render seamless looping GIF\"\r\n            type=\"button\"\r\n          >\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <path\r\n                d=\"M13.5 8 a5.5 5.5 0 1 1 -1.6 -3.9\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n              <path\r\n                d=\"M13.8 1.6 V4.4 H11\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.5\"\r\n              />\r\n            </svg>\r\n            GIF\r\n          </button>\r\n          <button\r\n            className=\"btn\"\r\n            id=\"btn-set\"\r\n            title=\"Generate a consistent set of variations\"\r\n            type=\"button\"\r\n          >\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <rect\r\n                x=\"1.5\"\r\n                y=\"1.5\"\r\n                width=\"5.5\"\r\n                height=\"5.5\"\r\n                rx=\"1.5\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.4\"\r\n              />\r\n              <rect\r\n                x=\"9\"\r\n                y=\"1.5\"\r\n                width=\"5.5\"\r\n                height=\"5.5\"\r\n                rx=\"1.5\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.4\"\r\n              />\r\n              <rect\r\n                x=\"1.5\"\r\n                y=\"9\"\r\n                width=\"5.5\"\r\n                height=\"5.5\"\r\n                rx=\"1.5\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.4\"\r\n              />\r\n              <rect\r\n                x=\"9\"\r\n                y=\"9\"\r\n                width=\"5.5\"\r\n                height=\"5.5\"\r\n                rx=\"1.5\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.4\"\r\n              />\r\n            </svg>\r\n            Set\r\n          </button>\r\n          <div className=\"topbar-divider\" />\r\n          {/* <a className=\"btn btn-ghost\" href=\"/dx-shader/docs.html\" title=\"Documentation\">\r\n            <svg viewBox=\"0 0 16 16\" aria-hidden=\"true\">\r\n              <path\r\n                d=\"M3 2 H10 L13 5 V14 H3 Z\"\r\n                fill=\"none\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.4\"\r\n              />\r\n              <path\r\n                d=\"M5.5 7.5 H10.5 M5.5 10 H10.5\"\r\n                stroke=\"currentColor\"\r\n                strokeWidth=\"1.2\"\r\n              />\r\n            </svg>\r\n            Docs\r\n          </a> */}\r\n        </div>\r\n      </header>\r\n\r\n      <div className=\"app\">\r\n        <section className=\"stage\" id=\"stage\">\r\n          <div\r\n            className=\"shader-loader\"\r\n            data-loader-mode=\"auto\"\r\n            data-loader-state=\"preparing\"\r\n            id=\"shader-boot-loader\"\r\n            role=\"status\"\r\n            aria-live=\"polite\"\r\n          >\r\n            <div className=\"shader-loader-panel\">\r\n              {/* <div\r\n                className=\"shader-loader-mark p-2\"\r\n              >\r\n                \r\n                <svg\r\n                  className=\"shader-loader-spinner h-16 w-16\"\r\n                  xmlns=\"http://www.w3.org/2000/svg\"\r\n                  width=\"24\"\r\n                  height=\"24\"\r\n                  viewBox=\"0 0 24 24\"\r\n                  fill=\"none\"\r\n                  stroke=\"#000000\"\r\n                  strokeWidth=\"1\"\r\n                  strokeLinecap=\"round\"\r\n                  strokeLinejoin=\"round\"\r\n                  style={{ animation: \"shader-loader-spin 1.5s linear infinite\" }}\r\n                >\r\n                  <path d=\"M12 2v4\"/>\r\n                  <path d=\"m16.2 7.8 2.9-2.9\"/>\r\n                  <path d=\"M18 12h4\"/>\r\n                  <path d=\"m16.2 16.2 2.9 2.9\"/>\r\n                  <path d=\"M12 18v4\"/>\r\n                  <path d=\"m4.9 19.1 2.9-2.9\"/>\r\n                  <path d=\"M2 12h4\"/>\r\n                  <path d=\"m4.9 4.9 2.9 2.9\"/>\r\n                </svg>\r\n              </div> */}\r\n              <div className=\"shader-loader-copy\">\r\n                <span className=\"shader-loader-title\">Preparing shader engine</span>\r\n                <span className=\"shader-loader-detail\" id=\"shader-boot-status\">\r\n                  Initializing rendering engine\r\n                </span>\r\n              </div>\r\n              <button\r\n                className=\"shader-loader-action\"\r\n                hidden=\"hidden\"\r\n                id=\"shader-boot-start\"\r\n                type=\"button\"\r\n              >\r\n                Start shader\r\n              </button>\r\n              <div className=\"shader-loader-shimmer\" aria-hidden=\"true\" />\r\n            </div>\r\n          </div>\r\n          <div className=\"canvas-frame\" id=\"canvas-frame\">\r\n            <div className=\"canvas-shell\" id=\"canvas-shell\">\r\n              <div\r\n                className=\"shader-static-fallback\"\r\n                id=\"shader-static-fallback\"\r\n                aria-hidden=\"true\"\r\n              >\r\n                <span className=\"shader-static-title\">Shader</span>\r\n                <span className=\"shader-static-detail\">Safe shader preview</span>\r\n              </div>\r\n              <noscript>\r\n                <div className=\"shader-static-fallback shader-static-fallback-noscript\">\r\n                  <span className=\"shader-static-title\">Shader</span>\r\n                  <span className=\"shader-static-detail\">\r\n                    JavaScript is required to start the live shader.\r\n                  </span>\r\n                </div>\r\n              </noscript>\r\n              <canvas id=\"view\" />\r\n            </div>\r\n          </div>\r\n          <div className=\"stage-meta\">\r\n            <div className=\"meta-left\">\r\n              <button\r\n                className=\"icon-btn\"\r\n                id=\"btn-play\"\r\n                title=\"Play / pause (Space)\"\r\n                type=\"button\"\r\n              >\r\n                <svg id=\"icon-pause\" viewBox=\"0 0 14 14\">\r\n                  <rect\r\n                    x=\"2.5\"\r\n                    y=\"2\"\r\n                    width=\"3\"\r\n                    height=\"10\"\r\n                    rx=\"1\"\r\n                    fill=\"currentColor\"\r\n                  />\r\n                  <rect\r\n                    x=\"8.5\"\r\n                    y=\"2\"\r\n                    width=\"3\"\r\n                    height=\"10\"\r\n                    rx=\"1\"\r\n                    fill=\"currentColor\"\r\n                  />\r\n                </svg>\r\n                <svg id=\"icon-play\" viewBox=\"0 0 14 14\">\r\n                  <path d=\"M3.5 2 L12 7 L3.5 12 Z\" fill=\"currentColor\" />\r\n                </svg>\r\n              </button>\r\n              <span className=\"meta-item mono\" id=\"meta-mode\">\r\n                ...\r\n              </span>\r\n              <span className=\"meta-sep\" />\r\n              <span className=\"meta-item mono dim\" id=\"meta-seed\">\r\n                seed 0000\r\n              </span>\r\n            </div>\r\n            <div className=\"meta-right\">\r\n              <span className=\"meta-item mono dim\" id=\"meta-loop\">\r\n                4.0s loop\r\n              </span>\r\n              <span className=\"meta-sep\" />\r\n              <span className=\"meta-item mono dim\" id=\"meta-res\">\r\n                0x0\r\n              </span>\r\n              <span className=\"meta-sep\" />\r\n              <span className=\"meta-item mono dim\" id=\"meta-fps\">\r\n                60 fps\r\n              </span>\r\n            </div>\r\n          </div>\r\n        </section>\r\n\r\n        <aside className=\"rail\" id=\"rail\" />\r\n      </div>\r\n\r\n      <div className=\"overlay is-hidden\" id=\"overlay\" hidden=\"hidden\">\r\n        <div className=\"overlay-card\">\r\n          <div className=\"overlay-title\" id=\"overlay-title\">\r\n            Rendering\r\n          </div>\r\n          <div className=\"overlay-detail mono\" id=\"overlay-detail\">\r\n            ...\r\n          </div>\r\n          <div className=\"progress\">\r\n            <div className=\"progress-fill\" id=\"overlay-bar\" />\r\n          </div>\r\n          <button className=\"btn overlay-cancel\" id=\"overlay-cancel\" type=\"button\">\r\n            Cancel\r\n          </button>\r\n        </div>\r\n      </div>\r\n\r\n      <div className=\"toast mono is-hidden\" id=\"toast\" hidden=\"hidden\"></div>\r\n\r\n    </main>\r\n  );\r\n}\r\n";
export const dxSourceModule = Object.freeze({
  "source_path": "app/page.tsx",
  "chunk_output": ".dx/www/output/.dx/build-cache/source-routes/root/modules/app-page-tsx-49eb7925527ddf1a.mjs",
  "kind": "tsx",
  "hash": "49eb7925527ddf1a",
  "dependencies": [
    {
      "specifier": "../components/icons/icon",
      "resolved_path": "components/icons/icon.tsx",
      "chunk_output": ".dx/www/output/.dx/build-cache/source-routes/root/modules/components-icons-icon-tsx-8db49bf807790749.mjs",
      "kind": "tsx",
      "resolver_source": "relative",
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
    "source_path": "app/page.tsx",
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
        "specifier": "../components/icons/icon",
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
      "HomePage",
      "metadata"
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
export const dxLinkedDependencies = Object.freeze([dep0]);
export default dxSourceModule;
