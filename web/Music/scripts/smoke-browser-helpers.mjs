import { chromium } from "@playwright/test";

export async function launchBrowser() {
  const channel = process.env.PLAYWRIGHT_CHROME_CHANNEL || "chrome";

  try {
    return await chromium.launch({ channel, headless: true });
  } catch (error) {
    try {
      return await chromium.launch({ headless: true });
    } catch {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `Could not launch a browser. Install Chromium with "bunx playwright install chromium" or set PLAYWRIGHT_CHROME_CHANNEL. First launch error: ${message}`,
      );
    }
  }
}

export function attachBrowserErrorCapture(page, results) {
  page.on("console", (message) => {
    if (message.type() === "error") {
      results.consoleErrors.push(message.text());
    }
  });

  page.on("pageerror", (error) => {
    results.pageErrors.push(error.message);
  });
}

export async function expectVisible(page, locator, label, results) {
  const count = await locator.count();
  results.views[label] = count;
  assert(results, count > 0, `${label} was not found.`);

  if (count > 0) {
    assert(results, await locator.first().isVisible(), `${label} was not visible.`);
  }
}

export async function clickUnique(locator, label, results) {
  const count = await locator.count();
  assert(results, count === 1, `Expected one ${label}, found ${count}.`);

  if (count === 1) {
    await locator.click();
  }
}

export async function fetchJsonWithContextCookies(page, baseUrl, pathname, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("accept", "application/json");
  headers.set("origin", baseUrl.origin);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const cookies = await page.context().cookies(baseUrl.origin);

  if (cookies.length) {
    headers.set(
      "cookie",
      cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; "),
    );
  }

  const response = await fetch(new URL(pathname, baseUrl).toString(), {
    ...init,
    headers,
    redirect: "manual",
  });
  const text = await response.text();

  try {
    return { response, json: text ? JSON.parse(text) : null };
  } catch {
    return { response, json: null };
  }
}

export function assert(results, condition, message) {
  if (!condition) {
    results.failures.push(message);
  }
}
