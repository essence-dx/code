import type {
  WorkbookAddInManifest,
  WorkbookAutomationPermission,
  WorkbookCustomFunction,
} from "@/features/workbooks/types";
import {
  createAddInPackageSignature,
  createDefaultAddInSandboxCommands,
  getAddInDisabledReason,
  getAddInPackageDigest,
  getAddInSignatureStatus,
  normalizeAddInSandboxCommands,
  normalizeAddInSignature,
  normalizeAutomationPermissions,
} from "@/features/workbooks/workbook-addin-packages";

const MAX_CUSTOM_FUNCTIONS = 60;
const MAX_ADD_INS = 30;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowIso() {
  return new Date().toISOString();
}

function safeText(value: unknown, fallback: string, limit: number) {
  return typeof value === "string"
    ? value.trim().slice(0, limit) || fallback
    : fallback;
}

function normalizeFunctionName(value: unknown) {
  const name = safeText(value, "", 40).toUpperCase().replace(/[^A-Z0-9_.]/g, "");

  return /^[A-Z_][A-Z0-9_.]{1,39}$/.test(name) ? name : "";
}

export function normalizeCustomFunctions(value: unknown): WorkbookCustomFunction[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const names = new Set<string>();

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookCustomFunction>;
      const name = normalizeFunctionName(candidate.name);
      const expression = safeText(candidate.expression, "", 2000);

      if (!name || !expression || names.has(name)) {
        return [];
      }

      names.add(name);

      return [
        {
          id: safeText(candidate.id, id("custom_function"), 100),
          name,
          description: safeText(
            candidate.description,
            "Workbook custom function",
            240,
          ),
          expression,
          enabled: candidate.enabled !== false,
          createdAt: safeText(candidate.createdAt, nowIso(), 40),
          updatedAt: safeText(candidate.updatedAt, nowIso(), 40),
        },
      ];
    })
    .slice(0, MAX_CUSTOM_FUNCTIONS);
}

export function upsertCustomFunction(
  functions: WorkbookCustomFunction[],
  input: { description?: string; expression: string; name: string },
) {
  const timestamp = nowIso();
  const name = normalizeFunctionName(input.name);
  const expression = safeText(input.expression, "", 2000);

  if (!name || !expression) {
    return functions;
  }

  const nextFunction: WorkbookCustomFunction = {
    id: id("custom_function"),
    name,
    description: safeText(input.description, "Workbook custom function", 240),
    expression,
    enabled: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return [
    nextFunction,
    ...functions.filter((item) => item.name !== name),
  ].slice(0, MAX_CUSTOM_FUNCTIONS);
}

export function deleteCustomFunction(
  functions: WorkbookCustomFunction[],
  functionId: string,
) {
  return functions.filter((item) => item.id !== functionId);
}

export function normalizeAddIns(value: unknown): WorkbookAddInManifest[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .flatMap((item) => {
      if (typeof item !== "object" || item === null) {
        return [];
      }

      const candidate = item as Partial<WorkbookAddInManifest>;
      const name = safeText(candidate.name, "", 100);
      const provider = safeText(candidate.provider, "", 100);
      const version = safeText(candidate.version, "1.0.0", 32);
      const description = safeText(
        candidate.description,
        "Workbook add-in manifest",
        240,
      );
      const homepageUrl =
        typeof candidate.homepageUrl === "string"
          ? candidate.homepageUrl.trim().slice(0, 240)
          : undefined;
      const permissions = normalizeAutomationPermissions(candidate.permissions);
      const sandboxCommands = normalizeAddInSandboxCommands(
        candidate.sandboxCommands,
        permissions,
      );

      if (!name || !provider) {
        return [];
      }

      const packageDigest = getAddInPackageDigest({
        description,
        homepageUrl,
        name,
        permissions,
        provider,
        sandboxCommands,
        version,
      });
      const signature = normalizeAddInSignature(candidate.signature);
      const signatureStatus = getAddInSignatureStatus({
        packageDigest,
        signature,
      });
      const enabled = candidate.enabled === true && signatureStatus === "verified";
      const lastRunStatus =
        candidate.lastRunStatus === "succeeded" ||
        candidate.lastRunStatus === "failed"
          ? candidate.lastRunStatus
          : undefined;

      return [
        {
          id: safeText(candidate.id, id("addin"), 100),
          name,
          provider,
          version,
          description,
          homepageUrl,
          permissions,
          packageDigest,
          signature,
          signatureStatus,
          sandboxCommands,
          enabled,
          enabledAt: enabled
            ? safeText(candidate.enabledAt, nowIso(), 40)
            : undefined,
          disabledReason: enabled
            ? undefined
            : getAddInDisabledReason(candidate, signatureStatus),
          installedAt: safeText(candidate.installedAt, nowIso(), 40),
          updatedAt: safeText(candidate.updatedAt, nowIso(), 40),
          lastRunAt: safeText(candidate.lastRunAt, "", 40) || undefined,
          lastRunStatus,
          lastRunMessage: safeText(candidate.lastRunMessage, "", 180) || undefined,
        },
      ];
    })
    .slice(0, MAX_ADD_INS);
}

export function registerAddInManifest(
  addIns: WorkbookAddInManifest[],
  input: {
    description?: string;
    name: string;
    permissions: WorkbookAutomationPermission[];
    provider: string;
    version?: string;
  },
) {
  const timestamp = nowIso();
  const name = safeText(input.name, "", 100);
  const provider = safeText(input.provider, "", 100);
  const version = safeText(input.version, "1.0.0", 32);
  const description = safeText(input.description, "Workbook add-in manifest", 240);
  const permissions = normalizeAutomationPermissions(input.permissions);
  const sandboxCommands = createDefaultAddInSandboxCommands(permissions);

  if (!name || !provider) {
    return addIns;
  }

  const signature = createAddInPackageSignature({
    description,
    name,
    permissions,
    provider,
    sandboxCommands,
    signedAt: timestamp,
    version,
  });

  const manifest: WorkbookAddInManifest = {
    id: id("addin"),
    name,
    provider,
    version,
    description,
    permissions,
    packageDigest: signature.value,
    signature,
    signatureStatus: "verified",
    sandboxCommands,
    enabled: false,
    disabledReason: "Enable explicitly before running.",
    installedAt: timestamp,
    updatedAt: timestamp,
  };

  return [
    manifest,
    ...addIns.filter(
      (item) =>
        item.name.toLowerCase() !== name.toLowerCase() ||
        item.provider.toLowerCase() !== provider.toLowerCase(),
    ),
  ].slice(0, MAX_ADD_INS);
}

export function deleteAddInManifest(
  addIns: WorkbookAddInManifest[],
  addInId: string,
) {
  return addIns.filter((item) => item.id !== addInId);
}

export function setAddInEnabled(
  addIns: WorkbookAddInManifest[],
  addInId: string,
  enabled: boolean,
) {
  const timestamp = nowIso();

  return addIns.map((item) => {
    if (item.id !== addInId) {
      return item;
    }

    if (enabled && item.signatureStatus !== "verified") {
      return {
        ...item,
        disabledReason: "Package signature must be verified before enablement.",
        enabled: false,
        updatedAt: timestamp,
      };
    }

    return {
      ...item,
      disabledReason: enabled ? undefined : "Disabled by workbook owner.",
      enabled,
      enabledAt: enabled ? timestamp : undefined,
      updatedAt: timestamp,
    };
  });
}
