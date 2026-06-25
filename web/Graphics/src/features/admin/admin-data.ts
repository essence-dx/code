
export type AdminUserRow = any;
export type AdminShareRow = any;
export type AdminFileRow = any;
export type AdminAuditRow = any;
export type AdminAuditSummary = any;
export type AdminWorkspaceHealth = any;
export type AdminNotificationDeliveryRow = any;
export type AdminSessionRiskRow = any;
export type AdminConfigCheck = any;
export type AdminMetric = any;
export type AdminDashboardData = any;
export type AdminDashboardResult = any;

export async function getAdminDashboardData(): Promise<any> {
  return {
    authorized: false,
    reason: "Static build mock",
  };
}
