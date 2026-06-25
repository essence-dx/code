import { strict as assert } from "node:assert";
import { createDesktopSigningPlan, desktopSigningEnvExample, desktopSigningPlatforms } from "../src/features/projects/desktop-signing-workflow";

const emptyPlan = createDesktopSigningPlan({});

assert.equal(emptyPlan.ready, false);
assert.equal(emptyPlan.platforms.length, desktopSigningPlatforms.length);
assert.ok(emptyPlan.missingRequiredSecrets.includes("TAURI_SIGNING_PRIVATE_KEY"));
assert.ok(emptyPlan.missingRequiredSecrets.includes("WINDOWS_CERTIFICATE_BASE64"));
assert.ok(emptyPlan.missingRequiredSecrets.includes("APPLE_ID"));

const windowsReadyPlan = createDesktopSigningPlan(
  {
    TAURI_SIGNING_PRIVATE_KEY: "private-key",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
    WINDOWS_CERTIFICATE_BASE64: "pfx",
    WINDOWS_CERTIFICATE_PASSWORD: "password",
    WINDOWS_TIMESTAMP_URL: "http://timestamp.digicert.com",
  },
  ["windows"],
);

assert.equal(windowsReadyPlan.ready, true);
assert.equal(windowsReadyPlan.platforms[0]?.ready, true);
assert.match(windowsReadyPlan.platforms[0]?.commands[1]?.command ?? "", /tauri build/);
assert.match(windowsReadyPlan.platforms[0]?.checks[0]?.command ?? "", /signtool verify/);

const linuxPlan = createDesktopSigningPlan(
  {
    TAURI_SIGNING_PRIVATE_KEY: "private-key",
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: "password",
  },
  ["linux"],
);

assert.equal(linuxPlan.ready, true);
assert.ok(linuxPlan.platforms[0]?.secrets.some((secret) => secret.key === "LINUX_GPG_PRIVATE_KEY" && secret.scope === "optional"));
assert.match(desktopSigningEnvExample(), /APPLE_TEAM_ID=/);

console.log("desktop signing workflow smoke passed");
