import { dxSourceModule as dep0, dxRuntimeExports as dep0Runtime } from "./src-components-ui-button-tsx-a045a54d4568e98d.mjs";
import { dxSourceModule as dep1, dxRuntimeExports as dep1Runtime } from "./src-lib-utils-ts-cb488a6352482fc7.mjs";
import { dxSourceModule as dep2, dxRuntimeExports as dep2Runtime } from "./src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs";
export const dxSourceText = "\"use client\";\n\nimport { useCallback, useEffect, useMemo, useRef, useState } from \"react\";\nimport {\n  ArrowLeft,\n  ChevronLeft,\n  MousePointerClick,\n  RotateCcw,\n  X,\n} from \"lucide-react\";\nimport { Button } from \"@/components/ui/button\";\nimport { cn } from \"@/lib/utils\";\nimport type {\n  PrototypePreviewHotspot,\n  PrototypePreviewModel,\n} from \"@/features/editor/prototype-preview\";\n\ntype PrototypePreviewProps = {\n  fileName: string;\n  model: PrototypePreviewModel;\n};\n\nexport function PrototypePreview({ fileName, model }: PrototypePreviewProps) {\n  const [currentPageId, setCurrentPageId] = useState(model.startPageId);\n  const [history, setHistory] = useState<string[]>([]);\n  const [overlay, setOverlay] = useState<OverlayState | null>(null);\n  const [lastTransition, setLastTransition] = useState<PreviewTransition>({\n    transition: \"instant\",\n    durationMs: 0,\n    deviceFrame: \"none\",\n    smartAnimate: false,\n  });\n  const viewportRef = useRef<HTMLElement>(null);\n  const currentPage = useMemo(\n    () =>\n      model.pages.find((page) => page.id === currentPageId) ?? model.pages[0],\n    [currentPageId, model.pages],\n  );\n  const canGoBack = history.length > 0;\n  const brokenHotspotCount =\n    currentPage?.hotspots.filter((hotspot) => !hotspot.targetExists).length ?? 0;\n  const overlayPage = overlay\n    ? model.pages.find((page) => page.id === overlay.pageId)\n    : undefined;\n\n  const goToPage = useCallback(\n    (targetPageId: string) => {\n      if (targetPageId === currentPageId) {\n        return;\n      }\n\n      setLastTransition({\n        transition: \"instant\",\n        durationMs: 0,\n        deviceFrame: \"none\",\n        smartAnimate: false,\n      });\n      setOverlay(null);\n      setHistory((items) => [...items, currentPageId].slice(-30));\n      setCurrentPageId(targetPageId);\n    },\n    [currentPageId],\n  );\n\n  const followHotspot = useCallback(\n    (hotspot: PrototypePreviewHotspot) => {\n      if (!hotspot.targetExists || hotspot.targetPageId === currentPageId) {\n        return;\n      }\n\n      if (hotspot.action === \"overlay\") {\n        setOverlay({\n          pageId: hotspot.targetPageId,\n          hotspot,\n        });\n        applyScrollBehavior(viewportRef.current, hotspot);\n        return;\n      }\n\n      setLastTransition({\n        transition: hotspot.transition,\n        durationMs: hotspot.durationMs,\n        deviceFrame: hotspot.deviceFrame,\n        smartAnimate: hotspot.smartAnimate,\n      });\n      setOverlay(null);\n      setHistory((items) => [...items, currentPageId].slice(-30));\n      setCurrentPageId(hotspot.targetPageId);\n      applyScrollBehavior(viewportRef.current, hotspot);\n    },\n    [currentPageId],\n  );\n\n  const goBack = useCallback(() => {\n    setHistory((items) => {\n      const previousPageId = items.at(-1);\n\n      if (!previousPageId) {\n        return items;\n      }\n\n      setLastTransition({\n        transition: \"instant\",\n        durationMs: 0,\n        deviceFrame: \"none\",\n        smartAnimate: false,\n      });\n      setOverlay(null);\n      setCurrentPageId(previousPageId);\n      return items.slice(0, -1);\n    });\n  }, []);\n\n  const restart = useCallback(() => {\n    setLastTransition({\n      transition: \"instant\",\n      durationMs: 0,\n      deviceFrame: \"none\",\n      smartAnimate: false,\n    });\n    setOverlay(null);\n    setCurrentPageId(model.startPageId);\n    setHistory([]);\n  }, [model.startPageId]);\n\n  useEffect(() => {\n    function handleKeyDown(event: KeyboardEvent) {\n      if (event.key === \"ArrowLeft\" || event.key === \"Backspace\") {\n        event.preventDefault();\n        goBack();\n      }\n\n      if (event.key === \"Home\") {\n        event.preventDefault();\n        restart();\n      }\n    }\n\n    window.addEventListener(\"keydown\", handleKeyDown);\n    return () => window.removeEventListener(\"keydown\", handleKeyDown);\n  }, [goBack, restart]);\n\n  if (!currentPage) {\n    return (\n      <main className=\"grid min-h-screen place-items-center bg-background p-6 text-foreground\">\n        <div className=\"rounded-md border border-border bg-card p-6 text-sm text-muted-foreground\">\n          This shared file has no pages to preview.\n        </div>\n      </main>\n    );\n  }\n\n  return (\n    <main className=\"grid min-h-screen grid-rows-[auto_minmax(0,1fr)] bg-background text-foreground\">\n      <header className=\"flex h-14 items-center justify-between gap-4 border-b border-border bg-card px-4\">\n        <div className=\"min-w-0\">\n          <h1 className=\"truncate text-sm font-medium\">{fileName}</h1>\n          <p className=\"truncate text-xs text-muted-foreground\">\n            {currentPage.name}\n            {currentPage.prototypeStart ? \" / start\" : \"\"}\n          </p>\n        </div>\n        <div className=\"flex items-center gap-2\">\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"outline\"\n            disabled={!canGoBack}\n            onClick={goBack}\n          >\n            <ChevronLeft className=\"size-4\" />\n            Back\n          </Button>\n          <Button\n            type=\"button\"\n            size=\"sm\"\n            variant=\"secondary\"\n            onClick={restart}\n          >\n            <RotateCcw className=\"size-4\" />\n            Restart\n          </Button>\n          <Button asChild type=\"button\" size=\"sm\" variant=\"outline\">\n            <a href=\"../\">\n              <ArrowLeft className=\"size-4\" />\n              Handoff\n            </a>\n          </Button>\n        </div>\n      </header>\n      <section\n        ref={viewportRef}\n        className={cn(\n          \"grid min-h-0 p-5\",\n          overlay?.hotspot.scrollBehavior === \"lock\"\n            ? \"overflow-hidden\"\n            : \"overflow-auto\",\n        )}\n      >\n        <div className=\"m-auto w-full max-w-5xl\">\n          <div\n            className={cn(\n              \"relative mx-auto overflow-hidden rounded-md border border-border bg-card shadow-2xl shadow-black/30\",\n              getDeviceFrameClass(lastTransition.deviceFrame),\n            )}\n          >\n            <div\n              key={currentPage.id}\n              className={cn(\n                \"relative [&_svg]:block [&_svg]:h-full [&_svg]:w-full\",\n                getTransitionClass(lastTransition.transition),\n                lastTransition.smartAnimate &&\n                  \"transition-[border-radius,transform,opacity] ease-out\",\n              )}\n              style={{\n                aspectRatio: `${currentPage.width} / ${currentPage.height}`,\n                animationDuration: `${Math.max(0, lastTransition.durationMs)}ms`,\n              }}\n            >\n              <div dangerouslySetInnerHTML={{ __html: currentPage.svg }} />\n              {currentPage.hotspots.map((hotspot) => (\n                <HotspotButton\n                  key={hotspot.id}\n                  hotspot={hotspot}\n                  onNavigate={followHotspot}\n                />\n              ))}\n            </div>\n            {overlay && overlayPage ? (\n              <PrototypeOverlay\n                page={overlayPage}\n                hotspot={overlay.hotspot}\n                onClose={() => setOverlay(null)}\n              />\n            ) : null}\n          </div>\n          <div className=\"mt-3 flex flex-wrap items-center justify-between gap-3\">\n            <div className=\"flex flex-wrap items-center gap-2 text-xs text-muted-foreground\">\n              <MousePointerClick className=\"size-3.5\" />\n              <span>{currentPage.hotspots.length} clickable hotspots</span>\n              {brokenHotspotCount > 0 ? (\n                <>\n                  <span>/</span>\n                  <span>{brokenHotspotCount} broken</span>\n                </>\n              ) : null}\n              <span>/</span>\n              <span>{model.pages.length} pages</span>\n            </div>\n            <div className=\"flex max-w-full flex-wrap justify-end gap-1.5\">\n              {model.pages.map((page) => (\n                <Button\n                  key={page.id}\n                  type=\"button\"\n                  size=\"sm\"\n                  variant={page.id === currentPage.id ? \"secondary\" : \"outline\"}\n                  className=\"h-7 max-w-40 truncate px-2 text-xs\"\n                  onClick={() => goToPage(page.id)}\n                >\n                  {page.name}\n                </Button>\n              ))}\n            </div>\n          </div>\n        </div>\n      </section>\n    </main>\n  );\n}\n\ntype PreviewTransition = {\n  transition: string;\n  durationMs: number;\n  deviceFrame: string;\n  smartAnimate: boolean;\n};\n\ntype OverlayState = {\n  pageId: string;\n  hotspot: PrototypePreviewHotspot;\n};\n\nfunction HotspotButton({\n  hotspot,\n  onNavigate,\n}: {\n  hotspot: PrototypePreviewHotspot;\n  onNavigate: (hotspot: PrototypePreviewHotspot) => void;\n}) {\n  return (\n    <button\n      type=\"button\"\n      disabled={!hotspot.targetExists}\n      className={cn(\n        \"absolute rounded-sm border outline-none transition focus-visible:ring-2\",\n        hotspot.targetExists\n          ? \"border-cyan-300/70 bg-cyan-300/10 hover:bg-cyan-300/25 focus-visible:ring-cyan-200\"\n          : \"cursor-not-allowed border-red-300/70 bg-red-400/15 focus-visible:ring-red-200\",\n      )}\n      style={{\n        left: `${hotspot.left}%`,\n        top: `${hotspot.top}%`,\n        width: `${hotspot.width}%`,\n        height: `${hotspot.height}%`,\n      }}\n      title={\n        hotspot.targetExists\n          ? `${hotspot.name} -> ${hotspot.targetPageName}`\n          : `${hotspot.name} has a missing target page`\n      }\n      aria-label={`${hotspot.name} opens ${hotspot.targetPageName}`}\n      onClick={() => onNavigate(hotspot)}\n    >\n      <span className=\"sr-only\">\n        {hotspot.trigger} to {hotspot.targetPageName}\n      </span>\n    </button>\n  );\n}\n\nfunction PrototypeOverlay({\n  page,\n  hotspot,\n  onClose,\n}: {\n  page: PrototypePreviewModel[\"pages\"][number];\n  hotspot: PrototypePreviewHotspot;\n  onClose: () => void;\n}) {\n  return (\n    <div\n      className={cn(\n        \"absolute inset-0 z-30 grid bg-black/50 p-5 backdrop-blur-sm\",\n        getOverlayPlacementClass(hotspot.overlayPosition),\n      )}\n      onClick={() => {\n        if (hotspot.closeOnOutside) {\n          onClose();\n        }\n      }}\n    >\n      <div\n        className={cn(\n          \"relative max-h-full max-w-full overflow-hidden rounded-md border border-border bg-card shadow-2xl\",\n          getDeviceFrameClass(hotspot.deviceFrame),\n        )}\n        style={{\n          aspectRatio: `${page.width} / ${page.height}`,\n          width: getOverlayWidth(hotspot.overlayPosition),\n        }}\n        onClick={(event) => event.stopPropagation()}\n      >\n        <div className=\"h-full w-full [&_svg]:block [&_svg]:h-full [&_svg]:w-full\">\n          <div dangerouslySetInnerHTML={{ __html: page.svg }} />\n        </div>\n        <Button\n          type=\"button\"\n          size=\"icon\"\n          variant=\"secondary\"\n          className=\"absolute right-2 top-2 size-8\"\n          aria-label=\"Close overlay\"\n          onClick={onClose}\n        >\n          <X className=\"size-4\" />\n        </Button>\n      </div>\n    </div>\n  );\n}\n\nfunction getTransitionClass(transition: string) {\n  if (transition === \"dissolve\") {\n    return \"animate-[prototype-dissolve_ease-out_both]\";\n  }\n\n  if (transition === \"slide-left\") {\n    return \"animate-[prototype-slide-left_ease-out_both]\";\n  }\n\n  if (transition === \"slide-right\") {\n    return \"animate-[prototype-slide-right_ease-out_both]\";\n  }\n\n  if (transition === \"slide-up\") {\n    return \"animate-[prototype-slide-up_ease-out_both]\";\n  }\n\n  if (transition === \"slide-down\") {\n    return \"animate-[prototype-slide-down_ease-out_both]\";\n  }\n\n  return \"\";\n}\n\nfunction getOverlayPlacementClass(position: string) {\n  if (position === \"top\") {\n    return \"items-start justify-items-center\";\n  }\n\n  if (position === \"bottom\") {\n    return \"items-end justify-items-center\";\n  }\n\n  if (position === \"left\") {\n    return \"items-center justify-items-start\";\n  }\n\n  if (position === \"right\") {\n    return \"items-center justify-items-end\";\n  }\n\n  return \"place-items-center\";\n}\n\nfunction getOverlayWidth(position: string) {\n  if (position === \"left\" || position === \"right\") {\n    return \"min(34rem, 82vw)\";\n  }\n\n  return \"min(48rem, 88vw)\";\n}\n\nfunction getDeviceFrameClass(deviceFrame: string) {\n  if (deviceFrame === \"phone\") {\n    return \"max-w-sm rounded-[2rem] border-8 border-zinc-900\";\n  }\n\n  if (deviceFrame === \"tablet\") {\n    return \"max-w-3xl rounded-[1.5rem] border-[10px] border-zinc-900\";\n  }\n\n  if (deviceFrame === \"desktop\") {\n    return \"max-w-6xl rounded-lg border-4 border-zinc-800\";\n  }\n\n  return \"\";\n}\n\nfunction applyScrollBehavior(\n  viewport: HTMLElement | null,\n  hotspot: PrototypePreviewHotspot,\n) {\n  if (!viewport || hotspot.scrollBehavior === \"preserve\") {\n    return;\n  }\n\n  window.setTimeout(() => {\n    viewport.scrollTo({ left: 0, top: 0, behavior: \"smooth\" });\n  }, 0);\n}\n";
export const dxSourceModule = Object.freeze({
  "source_path": "src/features/editor/components/prototype-preview.tsx",
  "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-features-editor-components-prototype-preview-tsx-bdd4ceabc69abdbb.mjs",
  "kind": "tsx",
  "hash": "bdd4ceabc69abdbb",
  "dependencies": [
    {
      "specifier": "@/components/ui/button",
      "resolved_path": "src/components/ui/button.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-components-ui-button-tsx-a045a54d4568e98d.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "@/lib/utils",
      "resolved_path": "src/lib/utils.ts",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-utils-ts-cb488a6352482fc7.mjs",
      "kind": "ts",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
    {
      "specifier": "lucide-react",
      "resolved_path": "src/lib/forge/icons/lucide-react.tsx",
      "chunk_output": ".dx/www/output/source-routes/share--token-prototype/modules/src-lib-forge-icons-lucide-react-tsx-b9b0a8debf22abe8.mjs",
      "kind": "tsx",
      "resolver_source": "tsconfig-path",
      "node_modules_required": false
    },
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
    "source_path": "src/features/editor/components/prototype-preview.tsx",
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
    "directives": [
      {
        "value": "use client",
        "scope": "module-prologue",
        "line": 1,
        "column": 1
      }
    ],
    "static_imports": [
      {
        "specifier": "react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "lucide-react",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/components/ui/button",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/lib/utils",
        "side_effect_only": false,
        "type_only": false
      },
      {
        "specifier": "@/features/editor/prototype-preview",
        "side_effect_only": false,
        "type_only": true
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
      "PrototypePreview"
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
export const dxLinkedDependencies = Object.freeze([dep0, dep1, dep2]);
export default dxSourceModule;
