import type { CellStyle } from "@/features/workbooks/types";

const currencyFormatter = new Intl.NumberFormat(undefined, {
  currency: "USD",
  style: "currency",
});

const accountingFormatter = new Intl.NumberFormat(undefined, {
  currency: "USD",
  currencySign: "accounting",
  style: "currency",
});

const percentFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 2,
  style: "percent",
});

const EXCEL_BUILT_IN_FORMATS: Record<
  Exclude<CellStyle["numberFormat"], undefined | "custom" | "general">,
  string
> = {
  accounting: '_("$"* #,##0.00_);_("$"* (#,##0.00);_("$"* "-"??_);_(@_)',
  currency: "$#,##0.00",
  date: "m/d/yyyy",
  percent: "0.00%",
};

function splitFormatSections(format: string) {
  const sections: string[] = [];
  let current = "";
  let inQuote = false;

  for (const character of format) {
    if (character === '"') {
      inQuote = !inQuote;
      current += character;
      continue;
    }

    if (character === ";" && !inQuote) {
      sections.push(current);
      current = "";
      continue;
    }

    current += character;
  }

  sections.push(current);
  return sections;
}

function stripFormatDirectives(section: string) {
  return section
    .replace(/\[[^\]]+\]/g, "")
    .replace(/\\(.)/g, "$1")
    .replace(/_./g, "")
    .replace(/\*./g, "")
    .replace(/"([^"]*)"/g, "$1")
    .trim();
}

function chooseFormatSection(value: number, sections: string[]) {
  if (value > 0) {
    return sections[0] ?? "";
  }

  if (value < 0) {
    return sections[1] ?? sections[0] ?? "";
  }

  return sections[2] ?? sections[0] ?? "";
}

function formatExcelSerialDate(value: number) {
  return new Date(Math.round((value - 25569) * 86400 * 1000));
}

function parseDateValue(value: unknown) {
  if (typeof value === "number") {
    return formatExcelSerialDate(value);
  }

  const numeric = Number(value);

  if (Number.isFinite(numeric) && String(value).trim() !== "") {
    return formatExcelSerialDate(numeric);
  }

  const parsedDate = new Date(String(value));

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

function formatCustomDateValue(value: unknown, section: string) {
  if (!/[ymdhHsS]/.test(section) || /[0#?]/.test(section)) {
    return null;
  }

  const date = parseDateValue(value);

  if (!date) {
    return null;
  }

  const monthNames = new Intl.DateTimeFormat(undefined, { month: "short" });
  const fullMonthNames = new Intl.DateTimeFormat(undefined, { month: "long" });

  return section
    .replace(/yyyy/g, String(date.getFullYear()))
    .replace(/yy/g, String(date.getFullYear()).slice(-2))
    .replace(/mmmm/g, fullMonthNames.format(date))
    .replace(/mmm/g, monthNames.format(date))
    .replace(/mm/g, padDatePart(date.getMonth() + 1))
    .replace(/m/g, String(date.getMonth() + 1))
    .replace(/dd/g, padDatePart(date.getDate()))
    .replace(/d/g, String(date.getDate()))
    .replace(/hh/g, padDatePart(date.getHours()))
    .replace(/h/g, String(date.getHours()))
    .replace(/ss/g, padDatePart(date.getSeconds()))
    .replace(/s/g, String(date.getSeconds()));
}

function getNumericPlaceholderRange(section: string) {
  const firstIndex = section.search(/[0#?]/);

  if (firstIndex === -1) {
    return null;
  }

  let lastIndex = firstIndex;

  for (let index = firstIndex; index < section.length; index += 1) {
    if (/[0#?,.]/.test(section[index])) {
      lastIndex = index;
    }
  }

  return { firstIndex, lastIndex };
}

function getDecimalPlaces(pattern: string) {
  const decimalIndex = pattern.indexOf(".");

  if (decimalIndex === -1) {
    return 0;
  }

  return Array.from(pattern.slice(decimalIndex + 1)).filter((character) =>
    /[0#?]/.test(character),
  ).length;
}

function getMinimumIntegerDigits(pattern: string) {
  const integerPattern = pattern.split(".")[0] ?? "";
  const mandatoryDigits = Array.from(integerPattern).filter(
    (character) => character === "0",
  ).length;

  return Math.min(Math.max(mandatoryDigits, 1), 21);
}

function formatCustomNumericValue(value: number, section: string) {
  const placeholderRange = getNumericPlaceholderRange(section);

  if (!placeholderRange) {
    return section;
  }

  const pattern = section.slice(
    placeholderRange.firstIndex,
    placeholderRange.lastIndex + 1,
  );
  const prefix = section.slice(0, placeholderRange.firstIndex);
  const suffix = section.slice(placeholderRange.lastIndex + 1);
  const percentCount = Array.from(section).filter(
    (character) => character === "%",
  ).length;
  const scaledValue = Math.abs(value) * Math.pow(100, percentCount);
  const decimalPlaces = getDecimalPlaces(pattern);
  const formatted = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: decimalPlaces,
    minimumFractionDigits: decimalPlaces,
    minimumIntegerDigits: getMinimumIntegerDigits(pattern),
    useGrouping: pattern.includes(","),
  }).format(scaledValue);

  return `${prefix}${formatted}${suffix}`;
}

export function formatCustomNumberValue(value: unknown, format?: string) {
  const customFormat = format?.trim();

  if (!customFormat) {
    return null;
  }

  const sections = splitFormatSections(customFormat).map(stripFormatDirectives);
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || String(value).trim() === "") {
    const textSection = sections[3];

    return textSection ? textSection.replace(/@/g, String(value)) : null;
  }

  const section = chooseFormatSection(numericValue, sections);
  const dateValue = formatCustomDateValue(value, section);

  if (dateValue !== null) {
    return dateValue;
  }

  const formatted = formatCustomNumericValue(numericValue, section);

  return numericValue < 0 && sections.length < 2 ? `-${formatted}` : formatted;
}

export function formatValueByCellStyle(value: unknown, style?: CellStyle) {
  if (!style?.numberFormat || style.numberFormat === "general") {
    return null;
  }

  if (style.numberFormat === "custom") {
    return formatCustomNumberValue(value, style.customNumberFormat);
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (style.numberFormat === "currency" && Number.isFinite(numericValue)) {
    return currencyFormatter.format(numericValue);
  }

  if (style.numberFormat === "accounting" && Number.isFinite(numericValue)) {
    return accountingFormatter.format(numericValue);
  }

  if (style.numberFormat === "percent" && Number.isFinite(numericValue)) {
    return percentFormatter.format(numericValue);
  }

  if (style.numberFormat === "date") {
    const dateValue = parseDateValue(value);

    if (dateValue) {
      return dateValue.toLocaleDateString();
    }
  }

  return null;
}

export function cellStyleToExcelNumberFormat(style?: CellStyle) {
  if (!style?.numberFormat || style.numberFormat === "general") {
    return null;
  }

  if (style.numberFormat === "custom") {
    return style.customNumberFormat?.trim() || null;
  }

  return EXCEL_BUILT_IN_FORMATS[style.numberFormat] ?? null;
}

export function excelNumberFormatToCellStyle(value: unknown): CellStyle | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const format = value.trim();
  const normalized = format.toLowerCase();

  if (!normalized || normalized === "general") {
    return undefined;
  }

  if (normalized.includes("%")) {
    return { numberFormat: "percent" };
  }

  if (
    normalized.includes("yyyy") ||
    normalized.includes("yy") ||
    normalized.includes("mmm") ||
    normalized.includes("dd") ||
    normalized.includes("m/d") ||
    normalized.includes("d/m")
  ) {
    return { numberFormat: "date" };
  }

  const formatWithoutLocale = normalized.replace(/\[\$-[^\]]+\]/g, "");
  const hasCurrencyToken =
    /[$\u20ac\u00a3\u00a5]/.test(formatWithoutLocale) ||
    formatWithoutLocale.includes("currency");

  if (hasCurrencyToken && formatWithoutLocale.includes("*")) {
    return { numberFormat: "accounting" };
  }

  if (hasCurrencyToken) {
    return { numberFormat: "currency" };
  }

  return {
    customNumberFormat: format.slice(0, 120),
    numberFormat: "custom",
  };
}
