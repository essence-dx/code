import assert from "node:assert/strict";
import { applyImportConnectorTransformSteps } from "../src/features/workbooks/import-connector-transforms";

const salesRows = [
  ["Region", "Product", "Quarter", "Amount"],
  ["North", "Notebook", "Q1", "10"],
  ["North", "Notebook", "Q2", "5"],
  ["South", "Pen", "Q1", "7"],
];

assert.deepEqual(
  applyImportConnectorTransformSteps(salesRows, [
    {
      id: "group",
      type: "groupBy",
      columns: "1",
      columnIndex: 4,
      aggregate: "sum",
    },
  ]),
  [
    ["Region", "sum Amount"],
    ["North", "15"],
    ["South", "7"],
  ],
);

assert.deepEqual(
  applyImportConnectorTransformSteps(
    [
      ["Name", "Tags"],
      ["Alpha", "red|blue"],
      ["Beta", "green"],
    ],
    [
      {
        id: "split",
        type: "splitColumn",
        columnIndex: 2,
        delimiter: "|",
        count: 2,
      },
      {
        id: "custom",
        type: "customColumn",
        name: "Label",
        value: "{{Name}}/{{Tags 1}}",
      },
    ],
  ),
  [
    ["Name", "Tags 1", "Tags 2", "Label"],
    ["Alpha", "red", "blue", "Alpha/red"],
    ["Beta", "green", "", "Beta/green"],
  ],
);

assert.deepEqual(
  applyImportConnectorTransformSteps(salesRows, [
    {
      id: "unpivot",
      type: "unpivotColumns",
      columns: "1,2",
      value: "3,4",
    },
  ]),
  [
    ["Region", "Product", "Attribute", "Value"],
    ["North", "Notebook", "Quarter", "Q1"],
    ["North", "Notebook", "Amount", "10"],
    ["North", "Notebook", "Quarter", "Q2"],
    ["North", "Notebook", "Amount", "5"],
    ["South", "Pen", "Quarter", "Q1"],
    ["South", "Pen", "Amount", "7"],
  ],
);

assert.deepEqual(
  applyImportConnectorTransformSteps(salesRows, [
    {
      id: "pivot",
      type: "pivotColumns",
      columns: "1,2",
      columnIndex: 3,
      targetColumnIndex: 4,
      aggregate: "sum",
    },
  ]),
  [
    ["Region", "Product", "Q1", "Q2"],
    ["North", "Notebook", "10", "5"],
    ["South", "Pen", "7", ""],
  ],
);

assert.deepEqual(
  applyImportConnectorTransformSteps(salesRows, [
    {
      id: "merge",
      type: "mergeLookup",
      columnIndex: 2,
      targetColumnIndex: 2,
      name: "Category",
      value: "Product,Category\nNotebook,Paper\nPen,Writing",
    },
  ]),
  [
    ["Region", "Product", "Quarter", "Amount", "Category"],
    ["North", "Notebook", "Q1", "10", "Paper"],
    ["North", "Notebook", "Q2", "5", "Paper"],
    ["South", "Pen", "Q1", "7", "Writing"],
  ],
);

console.log("Import connector transform checks passed.");
