export function getSafeInteractionUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`);

    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function openInteractionLink(value?: string | null) {
  const url = getSafeInteractionUrl(value);

  if (!url) {
    return false;
  }

  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}
