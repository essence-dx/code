import type {
  PivotAggregation,
  PivotField,
  PivotFieldListState,
  PivotFieldRole,
  PivotSourceModel,
} from "@/features/spreadsheet/pivot/pivot-types";

function removeFieldFromLayout(
  state: PivotFieldListState,
  fieldId: string,
): PivotFieldListState {
  return {
    ...state,
    columnFieldIds: state.columnFieldIds.filter((id) => id !== fieldId),
    filterFieldIds: state.filterFieldIds.filter((id) => id !== fieldId),
    rowFieldIds: state.rowFieldIds.filter((id) => id !== fieldId),
    valueFields: state.valueFields.filter((field) => field.fieldId !== fieldId),
  };
}

function getDefaultAggregation(field: PivotField): PivotAggregation {
  return field.valueType === "number" ? "sum" : "count";
}

export function createPivotFieldListState(
  source: PivotSourceModel,
): PivotFieldListState {
  const firstTextField = source.fields.find(
    (field) => field.valueType !== "number",
  );
  const firstValueField =
    source.fields.find((field) => field.valueType === "number") ??
    source.fields[0];

  return {
    availableFields: source.fields,
    columnFieldIds: [],
    filterFieldIds: [],
    rowFieldIds: firstTextField ? [firstTextField.id] : [],
    valueFields: firstValueField
      ? [
          {
            aggregation: getDefaultAggregation(firstValueField),
            fieldId: firstValueField.id,
            label: `${getDefaultAggregation(firstValueField)} of ${
              firstValueField.name
            }`,
          },
        ]
      : [],
  };
}

export function movePivotField(
  state: PivotFieldListState,
  field: PivotField,
  role: PivotFieldRole,
): PivotFieldListState {
  const nextState = removeFieldFromLayout(state, field.id);

  if (role === "available") {
    return nextState;
  }

  if (role === "row") {
    return {
      ...nextState,
      rowFieldIds: [...nextState.rowFieldIds, field.id],
    };
  }

  if (role === "column") {
    return {
      ...nextState,
      columnFieldIds: [...nextState.columnFieldIds, field.id],
    };
  }

  if (role === "filter") {
    return {
      ...nextState,
      filterFieldIds: [...nextState.filterFieldIds, field.id],
    };
  }

  const aggregation = getDefaultAggregation(field);

  return {
    ...nextState,
    valueFields: [
      ...nextState.valueFields,
      {
        aggregation,
        fieldId: field.id,
        label: `${aggregation} of ${field.name}`,
      },
    ],
  };
}
