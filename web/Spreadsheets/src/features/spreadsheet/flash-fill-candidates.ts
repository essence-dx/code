export type FlashFillCandidate = {
  id: string;
  value: string;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function createFlashFillCandidates({
  idPrefix,
  value,
}: {
  idPrefix: string;
  value: string;
}) {
  const trimmed = value.trim();
  const candidates = new Map<string, string>();

  addCandidate(candidates, `${idPrefix}:raw`, trimmed);
  addCandidate(candidates, `${idPrefix}:lower`, trimmed.toLowerCase());
  addCandidate(candidates, `${idPrefix}:upper`, trimmed.toUpperCase());
  addCandidate(candidates, `${idPrefix}:title`, titleCase(trimmed));
  addWordCandidates(candidates, idPrefix, trimmed);
  addStructuredCandidates(candidates, idPrefix, trimmed);
  addDateCandidates(candidates, idPrefix, trimmed);

  return [...candidates.entries()].map(([id, candidateValue]) => ({
    id,
    value: candidateValue,
  }));
}

function addWordCandidates(
  candidates: Map<string, string>,
  idPrefix: string,
  value: string,
) {
  const words = value.match(/[A-Za-z0-9]+/g) ?? [];
  const alphaWords = words.filter((word) => /[A-Za-z]/.test(word));

  addCandidate(candidates, `${idPrefix}:first-word`, words[0]);
  addCandidate(candidates, `${idPrefix}:last-word`, words.at(-1));
  addCandidate(candidates, `${idPrefix}:first-alpha`, alphaWords[0]);
  addCandidate(candidates, `${idPrefix}:last-alpha`, alphaWords.at(-1));
  addCandidate(
    candidates,
    `${idPrefix}:initials`,
    alphaWords.map((word) => word[0]?.toUpperCase() ?? "").join(""),
  );
  addCandidate(
    candidates,
    `${idPrefix}:initials-lower`,
    alphaWords.map((word) => word[0]?.toLowerCase() ?? "").join(""),
  );
  addCandidate(
    candidates,
    `${idPrefix}:first-initial`,
    alphaWords[0]?.[0]?.toUpperCase(),
  );
  addCandidate(
    candidates,
    `${idPrefix}:first-initial-lower`,
    alphaWords[0]?.[0]?.toLowerCase(),
  );
}

function addStructuredCandidates(
  candidates: Map<string, string>,
  idPrefix: string,
  value: string,
) {
  const tokens = value.match(/[A-Za-z]+|\d+/g) ?? [];
  const digitTokens = value.match(/\d+/g) ?? [];
  const letterTokens = value.match(/[A-Za-z]+/g) ?? [];

  tokens.slice(0, 6).forEach((token, index) => {
    addCandidate(candidates, `${idPrefix}:token-${index}`, token);
    addCandidate(
      candidates,
      `${idPrefix}:token-${index}-lower`,
      token.toLowerCase(),
    );
    addCandidate(
      candidates,
      `${idPrefix}:token-${index}-upper`,
      token.toUpperCase(),
    );
  });

  digitTokens.slice(0, 4).forEach((token, index) => {
    addCandidate(candidates, `${idPrefix}:number-${index}`, token);
    addCandidate(
      candidates,
      `${idPrefix}:number-${index}-unpadded`,
      String(Number(token)),
    );
  });

  letterTokens.slice(0, 4).forEach((token, index) => {
    addCandidate(candidates, `${idPrefix}:letters-${index}`, token);
    addCandidate(
      candidates,
      `${idPrefix}:letters-${index}-lower`,
      token.toLowerCase(),
    );
    addCandidate(
      candidates,
      `${idPrefix}:letters-${index}-upper`,
      token.toUpperCase(),
    );
  });

  addCandidate(candidates, `${idPrefix}:digits`, digitTokens.join(""));
  addCandidate(candidates, `${idPrefix}:letters`, letterTokens.join(""));
  addCandidate(
    candidates,
    `${idPrefix}:letters-lower`,
    letterTokens.join("").toLowerCase(),
  );
  addCandidate(
    candidates,
    `${idPrefix}:letters-upper`,
    letterTokens.join("").toUpperCase(),
  );
}

function addDateCandidates(
  candidates: Map<string, string>,
  idPrefix: string,
  value: string,
) {
  const date = parseDateParts(value);

  if (!date) {
    return;
  }

  const yyyy = String(date.year).padStart(4, "0");
  const mm = String(date.month).padStart(2, "0");
  const dd = String(date.day).padStart(2, "0");
  const monthName = monthNames[date.month - 1] ?? "";
  const shortMonth = monthName.slice(0, 3);

  addCandidate(candidates, `${idPrefix}:date-iso`, `${yyyy}-${mm}-${dd}`);
  addCandidate(candidates, `${idPrefix}:date-us`, `${mm}/${dd}/${yyyy}`);
  addCandidate(candidates, `${idPrefix}:date-eu`, `${dd}/${mm}/${yyyy}`);
  addCandidate(candidates, `${idPrefix}:date-compact`, `${yyyy}${mm}${dd}`);
  addCandidate(candidates, `${idPrefix}:date-us-dash`, `${mm}-${dd}-${yyyy}`);
  addCandidate(
    candidates,
    `${idPrefix}:date-short-month`,
    `${shortMonth} ${date.day}, ${yyyy}`,
  );
  addCandidate(
    candidates,
    `${idPrefix}:date-day-short-month`,
    `${date.day} ${shortMonth} ${yyyy}`,
  );
  addCandidate(
    candidates,
    `${idPrefix}:date-long-month`,
    `${monthName} ${date.day}, ${yyyy}`,
  );
  addCandidate(candidates, `${idPrefix}:year`, yyyy);
  addCandidate(candidates, `${idPrefix}:month`, mm);
  addCandidate(candidates, `${idPrefix}:day`, dd);
}

function parseDateParts(value: string) {
  const iso = value.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);

  if (iso) {
    return normalizeDateParts({
      year: Number(iso[1]),
      month: Number(iso[2]),
      day: Number(iso[3]),
    });
  }

  const slash = value.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);

  if (slash) {
    const year = Number(slash[3]?.length === 2 ? `20${slash[3]}` : slash[3]);
    return normalizeDateParts({
      year,
      month: Number(slash[1]),
      day: Number(slash[2]),
    });
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return normalizeDateParts({
    year: parsed.getFullYear(),
    month: parsed.getMonth() + 1,
    day: parsed.getDate(),
  });
}

function normalizeDateParts({
  day,
  month,
  year,
}: {
  day: number;
  month: number;
  year: number;
}) {
  if (year < 1000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() + 1 !== month ||
    date.getDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function addCandidate(
  candidates: Map<string, string>,
  id: string,
  value: string | undefined,
) {
  const trimmed = value?.trim() ?? "";

  if (trimmed) {
    candidates.set(id, trimmed);
  }
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}
