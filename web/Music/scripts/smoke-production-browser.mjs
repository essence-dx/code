import {
  assert,
  attachBrowserErrorCapture,
  clickUnique,
  expectVisible,
  launchBrowser,
} from "./smoke-browser-helpers.mjs";

const defaultBaseUrl = "https://essence-suno.vercel.app";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || defaultBaseUrl);
const results = {
  baseUrl: baseUrl.toString(),
  consoleErrors: [],
  failures: [],
  pageErrors: [],
  views: {},
};

async function clickNav(page, label) {
  await clickUnique(
    page.getByRole("button", { name: label }),
    `${label} navigation button`,
    results,
  );
}

const browser = await launchBrowser();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
});
attachBrowserErrorCapture(page, results);

try {
  const response = await page.goto(baseUrl.toString(), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });

  results.status = response?.status() ?? 0;
  results.title = await page.title();
  assert(results, response?.ok(), `Root page returned ${results.status}.`);
  assert(
    results,
    results.title.includes("Essence Suno"),
    "Page title is missing the app name.",
  );

  await expectVisible(
    page,
    page.getByRole("heading", { name: "Essence Suno" }),
    "app heading",
    results,
  );
  await expectVisible(page, page.getByText("AI ready"), "AI ready badge", results);
  await expectVisible(page, page.getByText("Tracks"), "tracks stat", results);
  await expectVisible(page, page.getByText("Writing"), "writing stat", results);
  await expectVisible(page, page.getByText("Import audio"), "import card", results);
  await expectVisible(
    page,
    page.getByRole("button", { name: "Choose files" }),
    "choose files button",
    results,
  );
  await expectVisible(page, page.getByText("Record audio"), "record card", results);

  for (const label of ["Create", "Library", "Playlists", "Studio", "AI", "Settings"]) {
    await expectVisible(
      page,
      page.getByRole("button", { name: label }),
      `${label} navigation`,
      results,
    );
  }

  await clickNav(page, "AI");
  await expectVisible(page, page.getByText("AI composer"), "AI composer", results);
  await expectVisible(
    page,
    page.getByRole("tab", { name: "Lyrics" }),
    "lyrics tab",
    results,
  );
  await expectVisible(
    page,
    page.getByRole("button", { name: "Generate lyrics" }),
    "generate lyrics button",
    results,
  );
  await expectVisible(
    page,
    page.getByRole("button", { name: "Expand style" }),
    "expand style button",
    results,
  );

  await clickNav(page, "Settings");
  await expectVisible(
    page,
    page.getByText("Creation services"),
    "creation services",
    results,
  );
  await expectVisible(
    page,
    page.getByText("Release readiness"),
    "release readiness",
    results,
  );
  await expectVisible(
    page,
    page.getByText("Writing assistant"),
    "writing assistant status",
    results,
  );

  assert(
    results,
    results.consoleErrors.length === 0,
    `Console errors: ${results.consoleErrors.join(" | ")}`,
  );
  assert(
    results,
    results.pageErrors.length === 0,
    `Page errors: ${results.pageErrors.join(" | ")}`,
  );
} finally {
  await browser.close();
}

const summary = {
  ok: results.failures.length === 0,
  results: {
    ...results,
    failures: undefined,
  },
  failures: results.failures,
};

console.log(JSON.stringify(summary, null, 2));

if (results.failures.length) {
  process.exit(1);
}
