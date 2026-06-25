import { dxSourceModule as dxRouteEntryModule } from "./modules/src-app-dashboard-page-tsx-0e48b2dcf9b1bdc3.mjs";
const fallbackHtml = "<!doctype html><html lang=\"en\" class=\"dark\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><link rel=\"icon\" href=\"/public/favicon.svg\" type=\"image/svg+xml\"><link rel=\"apple-touch-icon\" href=\"/public/icon.svg\"><title>Essence Figma</title></head><body class=\"dx-template\"><main class=\"starter-shell\" data-dx-template=\"minimal\" data-dx-runtime=\"static\" data-dx-page-graph=\"src/app/dashboard/page\" data-dx-packet-sections=\"5\" data-dx-layouts=\"0\" data-dx-templates=\"0\" data-dx-boundaries=\"\" data-dx-conditionals=\"28\" data-dx-lists=\"2\" data-dx-keys=\"4\" data-dx-streaming=\"shell-first\" data-dx-deferred-chunks=\"0\" data-dx-resumable-islands=\"0\"><section class=\"starter-card\" aria-labelledby=\"starter-title\"><img class=\"starter-logo\" src=\"/public/logo.svg\" alt=\"Dx WWW\" width=\"40\" height=\"40\"><p class=\"starter-kicker\">Dx WWW</p><h1 id=\"starter-title\">Essence Figma</h1><p>Private design workspace</p><div class=\"starter-actions\" data-dx-proof-links=\"state-runtime islands\" aria-label=\"Starter proof routes\"><a class=\"starter-link\" href=\"/state-runtime\">Open state runtime proof</a><a class=\"starter-link\" href=\"/islands\">Open island proof</a></div><form class=\"starter-form\" action=\"/state-runtime\" method=\"get\" data-dx-no-js-fallback=\"preserved\"><p class=\"starter-form-label\" id=\"starter-proof-route-label\">No-JS proof target</p><div class=\"starter-form-panel\"><input class=\"starter-input\" name=\"note\" aria-labelledby=\"starter-proof-route-label\" placeholder=\"Optional proof note\"><button class=\"starter-action-button\" id=\"starter-proof-route\" aria-describedby=\"starter-proof-route-label\" type=\"submit\">Continue without JavaScript</button></div></form></section></main></body></html>";

export const dxRouteShell = Object.freeze({
  route: "/dashboard",
  fallbackHash: "18dc52a44f0fbeb0",
  fullReactHydration: false,
  nodeModulesRequired: false,
  sourceModuleEntry: dxRouteEntryModule
});

export function mount(target) {
  const container = typeof target === "string" ? document.querySelector(target) : target;
  if (!container) {
    throw new Error(`DX route shell target not found for ${dxRouteShell.route}`);
  }
  container.innerHTML = fallbackHtml;
  return dxRouteShell;
}

export default dxRouteShell;
