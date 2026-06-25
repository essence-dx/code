import type {
  PivotTableAggregation,
  PivotTableCalculatedField,
  PivotTableCalculatedItem,
  PivotTableFieldGrouping,
  PivotTableMeasure,
  PivotTableTimelineFilter,
  PivotTableValueField,
} from "@/features/workbooks/types";

export type PivotTableLayoutUpdate = {
  calculatedFields?: PivotTableCalculatedField[];
  calculatedItems?: PivotTableCalculatedItem[];
  columnFieldIds?: string[];
  filterFieldIds?: string[];
  filterSelections?: Record<string, string[]>;
  fieldGroupings?: PivotTableFieldGrouping[];
  measures?: PivotTableMeasure[];
  rowFieldIds?: string[];
  timelineFilters?: PivotTableTimelineFilter[];
  valueField?: {
    aggregation: PivotTableAggregation;
    fieldId: string;
  };
  valueFields?: PivotTableValueField[];
};
