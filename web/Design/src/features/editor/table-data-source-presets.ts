export type TableDataSourcePresetId =
  | "generic"
  | "airtable"
  | "supabase"
  | "hasura"
  | "stripe"
  | "google-analytics";

export type TableDataSourcePreset = {
  id: TableDataSourcePresetId;
  label: string;
  tokenPlaceholder: string;
  urlPlaceholder: string;
  customHeaderName?: string;
  customHeaderValuePlaceholder?: string;
};

export const tableDataSourcePresets = [
  {
    id: "generic",
    label: "Generic CSV / JSON",
    tokenPlaceholder: "Optional, not saved",
    urlPlaceholder: "CSV, JSON, or public Google Sheets URL",
  },
  {
    id: "airtable",
    label: "Airtable records",
    tokenPlaceholder: "Personal access token, not saved",
    urlPlaceholder: "https://api.airtable.com/v0/base/table",
  },
  {
    id: "supabase",
    label: "Supabase REST",
    customHeaderName: "apikey",
    customHeaderValuePlaceholder: "Anon or service key, not saved",
    tokenPlaceholder: "Optional JWT, not saved",
    urlPlaceholder: "https://project.supabase.co/rest/v1/table?select=*",
  },
  {
    id: "hasura",
    label: "Hasura REST",
    customHeaderName: "x-hasura-admin-secret",
    customHeaderValuePlaceholder: "Admin secret, not saved",
    tokenPlaceholder: "Optional JWT, not saved",
    urlPlaceholder: "https://api.example.com/api/rest/report",
  },
  {
    id: "stripe",
    label: "Stripe list API",
    tokenPlaceholder: "Secret key, not saved",
    urlPlaceholder: "https://api.stripe.com/v1/customers?limit=10",
  },
  {
    id: "google-analytics",
    label: "Google Analytics API",
    tokenPlaceholder: "OAuth access token, not saved",
    urlPlaceholder: "https://analyticsdata.googleapis.com/v1beta/...",
  },
] satisfies TableDataSourcePreset[];

export function getTableDataSourcePreset(id: string) {
  return (
    tableDataSourcePresets.find((preset) => preset.id === id) ??
    tableDataSourcePresets[0]
  );
}
