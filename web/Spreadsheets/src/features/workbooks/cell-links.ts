const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);

function looksLikeEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function looksLikePhone(value: string) {
  return /^\+?[\d\s().-]{7,}$/.test(value);
}

export function normalizeCellLinkUrl(value: string) {
  const trimmedValue = value.trim().slice(0, 1000);

  if (!trimmedValue) {
    return null;
  }

  const candidate = (() => {
    if (/^[a-z][a-z\d+.-]*:/i.test(trimmedValue)) {
      return trimmedValue;
    }

    if (looksLikeEmail(trimmedValue)) {
      return `mailto:${trimmedValue}`;
    }

    if (looksLikePhone(trimmedValue)) {
      return `tel:${trimmedValue.replace(/[\s().-]/g, "")}`;
    }

    return `https://${trimmedValue}`;
  })();

  try {
    const url = new URL(candidate);

    if (!allowedProtocols.has(url.protocol)) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
