export type DesktopSigningPlatform = "linux" | "macos" | "windows";
export type DesktopSigningSecretScope = "optional" | "required";

export interface DesktopSigningSecret {
  description: string;
  key: string;
  label: string;
  scope: DesktopSigningSecretScope;
}

export interface DesktopSigningCommand {
  command: string;
  label: string;
  purpose: string;
}

export interface DesktopSigningCheck {
  command: string;
  label: string;
}

export interface DesktopSigningPlatformPlan {
  artifactPatterns: string[];
  checks: DesktopSigningCheck[];
  commands: DesktopSigningCommand[];
  label: string;
  missingRequiredSecrets: string[];
  platform: DesktopSigningPlatform;
  ready: boolean;
  secrets: DesktopSigningSecret[];
}

export interface DesktopSigningPlan {
  missingRequiredSecrets: string[];
  platforms: DesktopSigningPlatformPlan[];
  ready: boolean;
  summary: string;
}

const sharedSecrets: DesktopSigningSecret[] = [
  {
    description: "Minisign private key used by Tauri to create updater .sig files.",
    key: "TAURI_SIGNING_PRIVATE_KEY",
    label: "Tauri updater private key",
    scope: "required",
  },
  {
    description: "Password for the Tauri updater private key.",
    key: "TAURI_SIGNING_PRIVATE_KEY_PASSWORD",
    label: "Tauri updater key password",
    scope: "required",
  },
];

const platformSecrets: Record<DesktopSigningPlatform, DesktopSigningSecret[]> = {
  linux: [
    {
      description: "GPG private key for apt/rpm repository metadata when Linux packages are distributed through package repositories.",
      key: "LINUX_GPG_PRIVATE_KEY",
      label: "Linux package GPG key",
      scope: "optional",
    },
    {
      description: "Passphrase for the Linux package GPG key.",
      key: "LINUX_GPG_PASSPHRASE",
      label: "Linux package GPG passphrase",
      scope: "optional",
    },
  ],
  macos: [
    {
      description: "Base64 encoded Developer ID Application certificate.",
      key: "APPLE_CERTIFICATE_BASE64",
      label: "Developer ID certificate",
      scope: "required",
    },
    {
      description: "Password for the imported Developer ID certificate.",
      key: "APPLE_CERTIFICATE_PASSWORD",
      label: "Developer ID certificate password",
      scope: "required",
    },
    {
      description: "Codesign identity name or hash used for the app bundle.",
      key: "APPLE_SIGNING_IDENTITY",
      label: "Apple signing identity",
      scope: "required",
    },
    {
      description: "Apple ID used by notarytool.",
      key: "APPLE_ID",
      label: "Apple ID",
      scope: "required",
    },
    {
      description: "App-specific password for notarytool.",
      key: "APPLE_APP_SPECIFIC_PASSWORD",
      label: "Apple app password",
      scope: "required",
    },
    {
      description: "Apple team identifier for notarization.",
      key: "APPLE_TEAM_ID",
      label: "Apple team ID",
      scope: "required",
    },
  ],
  windows: [
    {
      description: "Base64 encoded PFX code-signing certificate.",
      key: "WINDOWS_CERTIFICATE_BASE64",
      label: "Windows PFX certificate",
      scope: "required",
    },
    {
      description: "Password for the Windows PFX certificate.",
      key: "WINDOWS_CERTIFICATE_PASSWORD",
      label: "Windows PFX password",
      scope: "required",
    },
    {
      description: "RFC3161 timestamp server used by signtool.",
      key: "WINDOWS_TIMESTAMP_URL",
      label: "Windows timestamp URL",
      scope: "required",
    },
  ],
};

const commandSets: Record<DesktopSigningPlatform, DesktopSigningCommand[]> = {
  linux: [
    {
      command: "bun run tauri build -- --bundles appimage,deb,rpm",
      label: "Build Linux packages",
      purpose: "Produces AppImage, Deb, and RPM bundles with Tauri updater signatures.",
    },
    {
      command: "gpg --batch --import release/linux-package-signing.asc",
      label: "Import Linux package key",
      purpose: "Loads the optional package repository signing key when repository distribution is used.",
    },
    {
      command: "dpkg-sig --sign builder src-tauri/target/release/bundle/deb/*.deb && rpm --addsign src-tauri/target/release/bundle/rpm/*.rpm",
      label: "Sign package-manager artifacts",
      purpose: "Signs Deb and RPM artifacts for package-manager distribution.",
    },
  ],
  macos: [
    {
      command: "security create-keychain -p \"$APPLE_CERTIFICATE_PASSWORD\" release.keychain",
      label: "Create signing keychain",
      purpose: "Creates an isolated CI keychain for Developer ID signing material.",
    },
    {
      command: "security import release/apple-certificate.p12 -k release.keychain -P \"$APPLE_CERTIFICATE_PASSWORD\" -T /usr/bin/codesign",
      label: "Import Developer ID certificate",
      purpose: "Imports the Developer ID Application certificate for codesign.",
    },
    {
      command: "bun run tauri build -- --bundles app,dmg",
      label: "Build signed macOS bundle",
      purpose: "Builds the macOS app and DMG with Tauri updater signatures.",
    },
    {
      command: "xcrun notarytool submit src-tauri/target/release/bundle/dmg/*.dmg --apple-id \"$APPLE_ID\" --password \"$APPLE_APP_SPECIFIC_PASSWORD\" --team-id \"$APPLE_TEAM_ID\" --wait",
      label: "Notarize DMG",
      purpose: "Submits the DMG to Apple notarization and waits for the result.",
    },
    {
      command: "xcrun stapler staple src-tauri/target/release/bundle/dmg/*.dmg",
      label: "Staple notarization ticket",
      purpose: "Attaches the notarization ticket to the distributable DMG.",
    },
  ],
  windows: [
    {
      command: "powershell -NoProfile -ExecutionPolicy Bypass -Command \"[IO.File]::WriteAllBytes('release/windows-certificate.pfx',[Convert]::FromBase64String($env:WINDOWS_CERTIFICATE_BASE64))\"",
      label: "Materialize PFX certificate",
      purpose: "Decodes the CI secret into a temporary certificate file for signtool.",
    },
    {
      command: "bun run tauri build -- --bundles nsis,msi",
      label: "Build Windows installers",
      purpose: "Produces NSIS and MSI installers with Tauri updater signatures.",
    },
    {
      command: "signtool sign /fd SHA256 /tr %WINDOWS_TIMESTAMP_URL% /td SHA256 /f release\\windows-certificate.pfx /p %WINDOWS_CERTIFICATE_PASSWORD% src-tauri\\target\\release\\bundle\\nsis\\*.exe src-tauri\\target\\release\\bundle\\msi\\*.msi",
      label: "Sign Windows installers",
      purpose: "Applies Authenticode signatures and trusted timestamps to Windows installer artifacts.",
    },
  ],
};

const checkSets: Record<DesktopSigningPlatform, DesktopSigningCheck[]> = {
  linux: [
    {
      command: "bun run desktop:release:manifest -- --bundle-dir src-tauri/target/release/bundle",
      label: "Confirm updater signatures are discoverable",
    },
    {
      command: "gpg --verify release/linux-repository-metadata.sig release/linux-repository-metadata",
      label: "Verify repository metadata signature when used",
    },
  ],
  macos: [
    {
      command: "codesign --verify --deep --strict --verbose=2 src-tauri/target/release/bundle/macos/*.app",
      label: "Verify app bundle signature",
    },
    {
      command: "spctl --assess --type open --verbose src-tauri/target/release/bundle/dmg/*.dmg",
      label: "Assess Gatekeeper acceptance",
    },
    {
      command: "bun run desktop:release:manifest -- --bundle-dir src-tauri/target/release/bundle",
      label: "Confirm updater signatures are discoverable",
    },
  ],
  windows: [
    {
      command: "signtool verify /pa /all src-tauri\\target\\release\\bundle\\nsis\\*.exe src-tauri\\target\\release\\bundle\\msi\\*.msi",
      label: "Verify Authenticode signatures",
    },
    {
      command: "bun run desktop:release:manifest -- --bundle-dir src-tauri/target/release/bundle",
      label: "Confirm updater signatures are discoverable",
    },
  ],
};

const artifactPatterns: Record<DesktopSigningPlatform, string[]> = {
  linux: ["src-tauri/target/release/bundle/appimage/*.AppImage", "src-tauri/target/release/bundle/deb/*.deb", "src-tauri/target/release/bundle/rpm/*.rpm"],
  macos: ["src-tauri/target/release/bundle/macos/*.app", "src-tauri/target/release/bundle/dmg/*.dmg", "src-tauri/target/release/bundle/macos/*.app.tar.gz"],
  windows: ["src-tauri/target/release/bundle/nsis/*.exe", "src-tauri/target/release/bundle/msi/*.msi"],
};

const platformLabels: Record<DesktopSigningPlatform, string> = {
  linux: "Linux packages",
  macos: "macOS Developer ID and notarization",
  windows: "Windows Authenticode installers",
};

const defaultSecretValues: Partial<Record<string, string>> = {
  WINDOWS_TIMESTAMP_URL: "http://timestamp.digicert.com",
};

export const desktopSigningPlatforms: DesktopSigningPlatform[] = ["windows", "macos", "linux"];

function isConfigured(env: Record<string, string | undefined>, key: string) {
  return Boolean(env[key]?.trim());
}

export function createDesktopSigningPlan(
  env: Record<string, string | undefined> = {},
  platforms: DesktopSigningPlatform[] = desktopSigningPlatforms,
): DesktopSigningPlan {
  const platformPlans = platforms.map((platform) => {
    const secrets = [...sharedSecrets, ...platformSecrets[platform]];
    const missingRequiredSecrets = secrets.filter((secret) => secret.scope === "required" && !isConfigured(env, secret.key)).map((secret) => secret.key);

    return {
      artifactPatterns: artifactPatterns[platform],
      checks: checkSets[platform],
      commands: commandSets[platform],
      label: platformLabels[platform],
      missingRequiredSecrets,
      platform,
      ready: missingRequiredSecrets.length === 0,
      secrets,
    };
  });
  const missingRequiredSecrets = [...new Set(platformPlans.flatMap((platform) => platform.missingRequiredSecrets))];
  const readyCount = platformPlans.filter((platform) => platform.ready).length;

  return {
    missingRequiredSecrets,
    platforms: platformPlans,
    ready: platformPlans.length > 0 && readyCount === platformPlans.length,
    summary: `${readyCount}/${platformPlans.length} desktop signing workflows have all required secrets configured.`,
  };
}

export function desktopSigningEnvExample() {
  const secrets = [...sharedSecrets, ...desktopSigningPlatforms.flatMap((platform) => platformSecrets[platform])];

  return `${secrets
    .map((secret) => [`# ${secret.scope}: ${secret.label}`, `# ${secret.description}`, `${secret.key}=${defaultSecretValues[secret.key] ?? ""}`].join("\n"))
    .join("\n\n")}
`;
}

export function desktopSigningChecklistMarkdown() {
  const plan = createDesktopSigningPlan(
    Object.fromEntries([...sharedSecrets, ...desktopSigningPlatforms.flatMap((platform) => platformSecrets[platform])].filter((secret) => secret.scope === "required").map((secret) => [secret.key, "configured"])),
  );

  return `# Signed Desktop Release Checklist

## Before build

- Confirm the published scene URL opens without authentication.
- Confirm the package version was bumped before publishing.
- Confirm Tauri updater keys are present in the CI environment.
- Run \`bun run desktop:signing:plan -- --json\` or the exported package equivalent to verify required signing secrets.

${plan.platforms
  .map(
    (platform) => `## ${platform.label}

Artifacts:
${platform.artifactPatterns.map((pattern) => `- \`${pattern}\``).join("\n")}

Required secrets:
${platform.secrets
  .filter((secret) => secret.scope === "required")
  .map((secret) => `- \`${secret.key}\`: ${secret.description}`)
  .join("\n")}

Commands:
${platform.commands.map((command) => `- \`${command.command}\` - ${command.purpose}`).join("\n")}

Verification:
${platform.checks.map((check) => `- \`${check.command}\` - ${check.label}`).join("\n")}
`,
  )
  .join("\n")}
`;
}
