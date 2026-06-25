const desktopUpdateEnvKeyPattern = /[^A-Z0-9_]/g;

export function normalizeDesktopUpdateEnvKey(value: string) {
  return value.toUpperCase().replace(desktopUpdateEnvKeyPattern, "_");
}

export function getDesktopUpdatePlatformEnvKey(prefix: string, target: string, arch: string) {
  return `${prefix}_${normalizeDesktopUpdateEnvKey(target)}_${normalizeDesktopUpdateEnvKey(arch)}`;
}

export function readDesktopUpdatePlatformValue(
  env: Record<string, string | undefined>,
  prefix: string,
  target: string,
  arch: string,
) {
  return env[getDesktopUpdatePlatformEnvKey(prefix, target, arch)] ?? env[prefix] ?? "";
}
