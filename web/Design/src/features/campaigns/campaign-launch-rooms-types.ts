export type CampaignLaunchRoomStatus = "ready" | "review" | "blocked";

export type CampaignLaunchCommandKind =
  | "signoff"
  | "schedule"
  | "launch"
  | "report";

export type CampaignLaunchRoomCheck = {
  id: string;
  label: string;
  status: CampaignLaunchRoomStatus;
  score: number;
  detail: string;
};

export type CampaignStakeholderSignoffItem = {
  id: string;
  title: string;
  owner: string;
  status: CampaignLaunchRoomStatus;
  detail: string;
  href: string | null;
};

export type CampaignStakeholderSignoff = {
  status: CampaignLaunchRoomStatus;
  score: number;
  approvedDeliverables: number;
  pendingDeliverables: number;
  openTasks: number;
  overdueTasks: number;
  approvalEvents: number;
  items: CampaignStakeholderSignoffItem[];
};

export type CampaignLaunchChannel = {
  id: string;
  name: string;
  status: CampaignLaunchRoomStatus;
  score: number;
  deliverables: number;
  approvedDeliverables: number;
  scheduledDeliverables: number;
  auditReadyDeliverables: number;
  publishingRollupScore: number | null;
  detail: string;
  nextAction: string;
};

export type CampaignChannelReadiness = {
  status: CampaignLaunchRoomStatus;
  score: number;
  channels: CampaignLaunchChannel[];
};

export type CampaignRolloutMilestone = {
  id: "brief" | "signoff" | "scheduling" | "launch" | "follow-up";
  title: string;
  status: CampaignLaunchRoomStatus;
  date: string | null;
  detail: string;
};

export type CampaignRolloutTimeline = {
  status: CampaignLaunchRoomStatus;
  score: number;
  milestones: CampaignRolloutMilestone[];
};

export type CampaignLaunchCommand = {
  id: string;
  kind: CampaignLaunchCommandKind;
  title: string;
  status: CampaignLaunchRoomStatus;
  detail: string;
  targetDate: string | null;
};

export type CampaignLaunchCommandPacket = {
  fileName: string;
  generatedAt: string;
  summary: string;
  commands: CampaignLaunchCommand[];
  dataUrl: string;
};

export type CampaignLaunchRoom = {
  id: string;
  campaignId: string;
  campaignName: string;
  status: CampaignLaunchRoomStatus;
  score: number;
  launchAt: string | null;
  goal: string;
  audience: string;
  stakeholderSignoff: CampaignStakeholderSignoff;
  channelReadiness: CampaignChannelReadiness;
  rolloutTimeline: CampaignRolloutTimeline;
  launchCommandPacket: CampaignLaunchCommandPacket;
  nextActions: string[];
  totals: {
    deliverables: number;
    formats: number;
    scheduledDeliverables: number;
    unscheduledDeliverables: number;
    approvedDeliverables: number;
    pendingSignoffs: number;
    openReviewTasks: number;
  };
};

export type CampaignLaunchRoomCenter = {
  generatedAt: string;
  status: CampaignLaunchRoomStatus;
  score: number;
  rooms: CampaignLaunchRoom[];
  nextActions: string[];
  totals: {
    campaigns: number;
    readyRooms: number;
    reviewRooms: number;
    blockedRooms: number;
    deliverables: number;
    scheduledDeliverables: number;
    pendingSignoffs: number;
    commandPackets: number;
  };
};
