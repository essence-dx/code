export function envValue(name: string) {
  return process.env[name]?.replace(/^\uFEFF/, "").trim() || "";
}

export function optionalEnvValue(name: string) {
  return envValue(name) || undefined;
}
