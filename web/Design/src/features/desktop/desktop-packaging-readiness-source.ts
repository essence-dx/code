import type { DesktopPackagingReadinessSource } from "@/features/desktop/desktop-packaging-readiness";

export const desktopPackagingReadinessSource = {
  productName: "Essence Studio",
  identifier: "com.essencefromexistence.studio",
  appVersion: "0.1.0",
  cargoVersion: "0.1.0",
  rustVersion: "1.77.2",
  frontendDist: "https://essence-studio-omega.vercel.app",
  devUrl: "http://localhost:3000",
  beforeBuildCommand: "",
  bundleActive: true,
  bundleTargets: ["all"],
  icons: [
    "icons/32x32.png",
    "icons/128x128.png",
    "icons/128x128@2x.png",
    "icons/icon.icns",
    "icons/icon.ico",
  ],
  license: "",
  repository: "",
  tauriVersion: "2.11.1",
  tauriBuildVersion: "2.6.1",
  logPluginConfigured: true,
  signing: {
    updaterPublicKeyConfigured: false,
    windowsCertificateConfigured: false,
    macosIdentityConfigured: false,
  },
  updater: {
    active: false,
    endpoints: [],
  },
  releaseChannels: [
    {
      id: "stable",
      label: "Stable",
      version: "0.1.0",
      updateEndpoint: null,
      promotedAt: null,
    },
    {
      id: "beta",
      label: "Beta",
      version: "0.1.0-beta.1",
      updateEndpoint: null,
      promotedAt: null,
    },
    {
      id: "canary",
      label: "Canary",
      version: "0.1.0-canary.1",
      updateEndpoint: null,
      promotedAt: null,
    },
  ],
} satisfies DesktopPackagingReadinessSource;
