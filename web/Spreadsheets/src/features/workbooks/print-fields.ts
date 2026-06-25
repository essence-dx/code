export type PrintFieldContext = {
  fileName: string;
  sheetName: string;
  pageNumber: number;
  pageCount: number;
  generatedAt?: Date;
};

export const printFieldTokens = [
  { label: "Page", token: "&[Page]" },
  { label: "Pages", token: "&[Pages]" },
  { label: "Date", token: "&[Date]" },
  { label: "Time", token: "&[Time]" },
  { label: "File", token: "&[File]" },
  { label: "Sheet", token: "&[Sheet]" },
] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    timeStyle: "short",
  }).format(value);
}

export function expandPrintFieldText(
  value: string,
  context: PrintFieldContext,
) {
  const generatedAt = context.generatedAt ?? new Date();
  const replacements: Array<[RegExp, string]> = [
    [/&\[Page\]|&P/g, String(context.pageNumber)],
    [/&\[Pages\]|&N/g, String(context.pageCount)],
    [/&\[Date\]|&D/g, formatDate(generatedAt)],
    [/&\[Time\]|&T/g, formatTime(generatedAt)],
    [/&\[File\]|&F/g, context.fileName],
    [/&\[Tab\]|&\[Sheet\]|&A/g, context.sheetName],
  ];

  return replacements.reduce(
    (nextValue, [pattern, replacement]) =>
      nextValue.replace(pattern, replacement),
    value,
  );
}
