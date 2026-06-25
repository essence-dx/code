import {
  capabilityAreas,
  capabilityAreaLabels,
  capabilityStatusWeights,
  type CapabilityArea,
  type CapabilityPriority,
  type CapabilityStatus,
  type ProductCapability,
} from "@/lib/product/capability-types";

export interface CapabilityStatusCount {
  status: CapabilityStatus;
  count: number;
}

export interface CapabilityAreaReport {
  area: CapabilityArea;
  label: string;
  total: number;
  ready: number;
  needsVerification: number;
  partial: number;
  missing: number;
  priorityOpen: number;
  score: number;
  capabilities: ProductCapability[];
}

export interface ProductReadinessReport {
  score: number;
  total: number;
  ready: number;
  needsVerification: number;
  partial: number;
  missing: number;
  statusCounts: CapabilityStatusCount[];
  areas: CapabilityAreaReport[];
  nextCapabilities: ProductCapability[];
}

const statusOrder: CapabilityStatus[] = ["ready", "needs-verification", "partial", "missing"];
const priorityOrder: CapabilityPriority[] = ["p0", "p1", "p2"];

export function createProductReadinessReport(capabilities: ProductCapability[]): ProductReadinessReport {
  const total = capabilities.length;
  const statusCounts = statusOrder.map((status) => ({
    status,
    count: capabilities.filter((capability) => capability.status === status).length,
  }));
  const weightedScore = capabilities.reduce((sum, capability) => sum + capabilityStatusWeights[capability.status], 0);
  const areas = capabilityAreas.map((area) => createCapabilityAreaReport(area, capabilities));

  return {
    score: total ? Math.round((weightedScore / total) * 100) : 0,
    total,
    ready: countStatus(statusCounts, "ready"),
    needsVerification: countStatus(statusCounts, "needs-verification"),
    partial: countStatus(statusCounts, "partial"),
    missing: countStatus(statusCounts, "missing"),
    statusCounts,
    areas,
    nextCapabilities: capabilities
      .filter((capability) => capability.status !== "ready")
      .sort(compareCapabilitiesForNextWork)
      .slice(0, 6),
  };
}

function createCapabilityAreaReport(area: CapabilityArea, capabilities: ProductCapability[]): CapabilityAreaReport {
  const areaCapabilities = capabilities.filter((capability) => capability.area === area);
  const weightedScore = areaCapabilities.reduce((sum, capability) => sum + capabilityStatusWeights[capability.status], 0);

  return {
    area,
    label: capabilityAreaLabels[area],
    total: areaCapabilities.length,
    ready: areaCapabilities.filter((capability) => capability.status === "ready").length,
    needsVerification: areaCapabilities.filter((capability) => capability.status === "needs-verification").length,
    partial: areaCapabilities.filter((capability) => capability.status === "partial").length,
    missing: areaCapabilities.filter((capability) => capability.status === "missing").length,
    priorityOpen: areaCapabilities.filter((capability) => capability.priority === "p0" && capability.status !== "ready").length,
    score: areaCapabilities.length ? Math.round((weightedScore / areaCapabilities.length) * 100) : 0,
    capabilities: areaCapabilities,
  };
}

function countStatus(counts: CapabilityStatusCount[], status: CapabilityStatus) {
  return counts.find((count) => count.status === status)?.count ?? 0;
}

function compareCapabilitiesForNextWork(left: ProductCapability, right: ProductCapability) {
  const priorityDelta = priorityOrder.indexOf(left.priority) - priorityOrder.indexOf(right.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const statusDelta = statusOrder.indexOf(right.status) - statusOrder.indexOf(left.status);
  if (statusDelta !== 0) return statusDelta;

  return left.label.localeCompare(right.label);
}
