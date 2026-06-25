export function columnLabel(index: number) {
  let dividend = index + 1;
  let label = "";

  while (dividend > 0) {
    const modulo = (dividend - 1) % 26;
    label = String.fromCharCode(65 + modulo) + label;
    dividend = Math.floor((dividend - modulo) / 26);
  }

  return label;
}

export function columnIndex(label: string) {
  return label
    .toUpperCase()
    .split("")
    .reduce((total, character) => total * 26 + character.charCodeAt(0) - 64, 0) - 1;
}

export function cellKey(rowIndex: number, columnIndexValue: number) {
  return `${columnLabel(columnIndexValue)}${rowIndex + 1}`;
}

export function parseCellKey(key: string) {
  const match = /^([A-Z]+)(\d+)$/i.exec(key.trim());

  if (!match) {
    return null;
  }

  const rowNumber = Number(match[2]);
  const parsedColumnIndex = columnIndex(match[1]);

  if (rowNumber < 1 || parsedColumnIndex < 0) {
    return null;
  }

  return {
    columnIndex: parsedColumnIndex,
    rowIndex: rowNumber - 1,
  };
}
