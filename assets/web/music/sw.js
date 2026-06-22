const CACHE_NAME = "essence-suno-install-v2";
const OFFLINE_SHELL_URL = "/offline.html";
const STATIC_ASSETS = ["/icon.svg", OFFLINE_SHELL_URL];
const NETWORK_ONLY_DESTINATIONS = new Set(["audio", "video"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET" || request.headers.has("range")) {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin || isNetworkOnlyRequest(request, url)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(navigationFallback(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }
});

function isNetworkOnlyRequest(request, url) {
  return (
    url.pathname.startsWith("/api/") ||
    NETWORK_ONLY_DESTINATIONS.has(request.destination)
  );
}

async function navigationFallback(request) {
  try {
    return await fetch(request);
  } catch {
    const cached = await caches.match(OFFLINE_SHELL_URL);

    return (
      cached ||
      new Response("Essence is offline. Reconnect to open the workspace.", {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
        status: 503,
      })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  const response = await fetch(request);

  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
  }

  return response;
}
