export type BrowserLike = {
  newContext: (options: {
    viewport: { width: number; height: number };
  }) => Promise<BrowserContextLike>;
  close: () => Promise<void>;
};

export type BrowserContextLike = {
  newPage: () => Promise<PageLike>;
  close: () => Promise<void>;
};

export type PageResponseLike = {
  status: () => number;
  url: () => string;
};

export type PageLike = {
  on?: (event: "console" | "pageerror", handler: (value: unknown) => void) => void;
  off?: (event: "console" | "pageerror", handler: (value: unknown) => void) => void;
  removeListener?: (
    event: "console" | "pageerror",
    handler: (value: unknown) => void,
  ) => void;
  goto: (
    url: string,
    options?: Record<string, unknown>,
  ) => Promise<PageResponseLike | null>;
  getByLabel: (text: string | RegExp) => LocatorLike;
  getByRole: (
    role: string,
    options?: { name?: string | RegExp },
  ) => LocatorLike;
  locator: (selector: string) => LocatorLike;
  screenshot: (options: { path: string; fullPage: boolean }) => Promise<Buffer>;
  waitForLoadState: (
    state: string,
    options?: Record<string, unknown>,
  ) => Promise<unknown>;
  waitForTimeout: (timeout: number) => Promise<void>;
};

export type LocatorLike = {
  click: () => Promise<void>;
  fill: (value: string) => Promise<void>;
  innerText: (options?: Record<string, unknown>) => Promise<string>;
  isVisible: (options?: Record<string, unknown>) => Promise<boolean>;
};

export type PlaywrightModule = {
  chromium: {
    launch: (options: { headless: boolean }) => Promise<BrowserLike>;
  };
};

export async function ensureSignedIn(page: PageLike, baseUrl: string) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle" });

  const bodyText = await page.locator("body").innerText().catch(() => "");

  if (!bodyText.includes("Private design workspace")) {
    return;
  }

  const email = process.env.ESSENCE_VISUAL_EMAIL;
  const password = process.env.ESSENCE_VISUAL_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Set ESSENCE_VISUAL_EMAIL and ESSENCE_VISUAL_PASSWORD to probe authenticated visual surfaces.",
    );
  }

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForLoadState("networkidle").catch(() => null);
  await page.waitForTimeout(400);
  await waitForBodyText(page, "Files");
}

export async function waitForBodyText(page: PageLike, expectedText: string) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const text = await page.locator("body").innerText().catch(() => "");

    if (text.includes(expectedText)) {
      return;
    }

    await page.waitForTimeout(250);
  }

  throw new Error(`Expected page text was not found: ${expectedText}`);
}

export async function loadPlaywright() {
  const dynamicImport = new Function(
    "specifier",
    "return import(specifier)",
  ) as (specifier: string) => Promise<PlaywrightModule>;

  try {
    return await dynamicImport("playwright");
  } catch {
    throw new Error(
      "Playwright is required for visual QA. Install it or run this script in an environment where playwright is available.",
    );
  }
}

export function normalizeBaseUrl(value: string) {
  return value.replace(/\/$/, "");
}
