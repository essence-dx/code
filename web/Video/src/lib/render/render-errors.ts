const genericExportFailure = "Export failed. Try a shorter clip or another preset.";
const unsupportedExportFailure = "This export preset is unavailable for the current project.";
const mediaUnavailableFailure = "Source media is unavailable. Reconnect it and try again.";
const engineFailure = "Export rendering failed. Try a shorter clip or another preset.";

export class RenderUnsupportedError extends Error {
  constructor(message = unsupportedExportFailure) {
    super(message);
    this.name = "RenderUnsupportedError";
  }
}

export class RenderMediaUnavailableError extends Error {
  constructor(message = mediaUnavailableFailure) {
    super(message);
    this.name = "RenderMediaUnavailableError";
  }
}

export class RenderEngineError extends Error {
  constructor() {
    super(engineFailure);
    this.name = "RenderEngineError";
  }
}

export function renderFailureMessage(error: unknown, fallbackReason?: string) {
  if (error instanceof RenderUnsupportedError) return error.message;
  if (error instanceof RenderMediaUnavailableError) return error.message;
  if (error instanceof RenderEngineError) return error.message;
  if (fallbackReason) return fallbackReason;
  return genericExportFailure;
}
