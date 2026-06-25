import {
  assert,
  attachBrowserErrorCapture,
  clickUnique,
  expectVisible,
  fetchJsonWithContextCookies,
  launchBrowser,
} from "./smoke-browser-helpers.mjs";

const defaultBaseUrl = "https://essence-suno.vercel.app";
const baseUrl = new URL(process.env.SMOKE_BASE_URL || defaultBaseUrl);
const createdAt = Date.now();
const email =
  process.env.SMOKE_AUTH_EMAIL || `essence-browser-${createdAt}@example.com`;
const password =
  process.env.SMOKE_AUTH_PASSWORD || `EssenceBrowser-${createdAt}-pass`;
const name = process.env.SMOKE_AUTH_NAME || "Essence Browser Smoke";
const shouldCreateTempUser =
  !process.env.SMOKE_AUTH_EMAIL && process.env.SMOKE_AUTH_CREATE_TEMP !== "false";
const shouldDeleteUser =
  shouldCreateTempUser && process.env.SMOKE_AUTH_DELETE_TEMP !== "false";
const results = {
  baseUrl: baseUrl.toString(),
  consoleErrors: [],
  createdTempUser: shouldCreateTempUser,
  deletedTempUser: false,
  failures: [],
  pageErrors: [],
  views: {},
};

async function gotoApp(page) {
  const response = await page.goto(baseUrl.toString(), {
    waitUntil: "networkidle",
    timeout: 60_000,
  });
  results.status = response?.status() ?? 0;
  assert(results, response?.ok(), `Root page returned ${results.status}.`);
}

async function clickNav(page, label) {
  await clickUnique(
    page.getByRole("button", { name: label }),
    `${label} navigation button`,
    results,
  );
}

async function activeTabPanel(page) {
  const panel = page.locator('[role="tabpanel"][data-state="active"]');
  const count = await panel.count();
  assert(results, count === 1, `Expected one active auth tab panel, found ${count}.`);
  return panel;
}

async function submitAuthForm(page) {
  if (shouldCreateTempUser) {
    await clickUnique(page.getByRole("tab", { name: "Create" }), "Create auth tab", results);
  } else {
    await clickUnique(page.getByRole("tab", { name: "Sign in" }), "Sign in auth tab", results);
  }

  const panel = await activeTabPanel(page);

  if (shouldCreateTempUser) {
    await panel.getByLabel("Name").fill(name);
  }

  await panel.getByLabel("Email").fill(email);
  await panel.getByLabel("Password").fill(password);

  const buttonName = shouldCreateTempUser ? "Create account" : "Sign in";
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.url().includes(
          shouldCreateTempUser ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email",
        ) && response.request().method() === "POST",
      { timeout: 30_000 },
    ),
    panel.getByRole("button", { name: buttonName }).click(),
  ]);

  await page.getByText(email, { exact: true }).waitFor({
    state: "visible",
    timeout: 30_000,
  });
}

async function verifyAuthenticatedApi(page) {
  const session = await fetchJsonWithContextCookies(
    page,
    baseUrl,
    "/api/auth/get-session",
  );
  results.sessionStatusCode = session.response.status;
  results.sessionEmailMatches = session.json?.user?.email === email;
  assert(results, session.response.ok, `Session returned ${session.response.status}.`);
  assert(results, results.sessionEmailMatches, "Browser session email did not match.");

  const songs = await fetchJsonWithContextCookies(
    page,
    baseUrl,
    "/api/library/songs",
  );
  results.songsStatusCode = songs.response.status;
  assert(results, songs.response.ok, `Protected song list returned ${songs.response.status}.`);
  assert(results, Array.isArray(songs.json?.songs), "Protected song list is missing songs.");
}

async function cleanupUser(page) {
  if (!shouldDeleteUser) {
    return;
  }

  const deletion = await fetchJsonWithContextCookies(page, baseUrl, "/api/auth/delete-user", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
  results.deleteUserStatusCode = deletion.response.status;
  results.deletedTempUser = deletion.response.ok;
  assert(
    results,
    deletion.response.ok,
    `Temporary browser user delete returned ${deletion.response.status}.`,
  );
}

const browser = await launchBrowser();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1100 },
});
attachBrowserErrorCapture(page, results);

try {
  await gotoApp(page);
  await clickNav(page, "Settings");
  await expectVisible(page, page.getByText("Email auth"), "email auth panel", results);
  await submitAuthForm(page);
  await expectVisible(page, page.getByText("Account"), "account panel", results);
  await expectVisible(page, page.getByText(email, { exact: true }), "account email", results);
  await expectVisible(page, page.getByText("active", { exact: true }), "active session badge", results);
  await expectVisible(page, page.getByRole("button", { name: "Sign out" }), "sign out button", results);
  await verifyAuthenticatedApi(page);
} finally {
  try {
    await cleanupUser(page);
  } finally {
    await browser.close();
  }
}

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
