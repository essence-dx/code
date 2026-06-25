export type SortCustomOrder = "none" | "months" | "weekdays" | "quarters";
export type SortOn = "values" | "cellColor" | "fontColor" | "icon";

export const sortCustomOrderOptions: Array<{
  label: string;
  value: SortCustomOrder;
}> = [
  { label: "Default", value: "none" },
  { label: "Months", value: "months" },
  { label: "Weekdays", value: "weekdays" },
  { label: "Quarters", value: "quarters" },
];

const customSortOrders: Record<Exclude<SortCustomOrder, "none">, string[][]> = {
  months: [
    ["jan", "january"],
    ["feb", "february"],
    ["mar", "march"],
    ["apr", "april"],
    ["may"],
    ["jun", "june"],
    ["jul", "july"],
    ["aug", "august"],
    ["sep", "sept", "september"],
    ["oct", "october"],
    ["nov", "november"],
    ["dec", "december"],
  ],
  weekdays: [
    ["sun", "sunday"],
    ["mon", "monday"],
    ["tue", "tues", "tuesday"],
    ["wed", "wednesday"],
    ["thu", "thur", "thurs", "thursday"],
    ["fri", "friday"],
    ["sat", "saturday"],
  ],
  quarters: [
    ["q1", "quarter 1", "quarter one"],
    ["q2", "quarter 2", "quarter two"],
    ["q3", "quarter 3", "quarter three"],
    ["q4", "quarter 4", "quarter four"],
  ],
};

function normalizeSortText(value: string) {
  return value.trim().toLowerCase().replace(/\.$/, "");
}

function getCustomSortRank(value: string, customOrder: SortCustomOrder) {
  if (customOrder === "none") {
    return null;
  }

  const normalizedValue = normalizeSortText(value);
  const order = customSortOrders[customOrder];

  for (let index = 0; index < order.length; index += 1) {
    if (order[index].includes(normalizedValue)) {
      return index;
    }
  }

  return null;
}

export function compareSpreadsheetValues(
  left: string,
  right: string,
  customOrder: SortCustomOrder = "none",
) {
  const leftRank = getCustomSortRank(left, customOrder);
  const rightRank = getCustomSortRank(right, customOrder);

  if (leftRank !== null || rightRank !== null) {
    if (leftRank === null) {
      return 1;
    }

    if (rightRank === null) {
      return -1;
    }

    return leftRank - rightRank;
  }

  const leftNumber = Number(left);
  const rightNumber = Number(right);

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber;
  }

  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}
