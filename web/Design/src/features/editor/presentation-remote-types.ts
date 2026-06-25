import type { PresentationCommandAction } from "@/features/editor/presentation-channel";

export type PresentationRemoteSessionState = {
  id: string;
  controlToken: string;
  activeIndex: number;
  slideCount: number;
  pageName: string;
  status: string;
  expiresAt: string;
  updatedAt: string;
};

export type PresentationRemoteSlide = {
  index: number;
  id: string;
  name: string;
  hasNotes: boolean;
};

export type PresentationRemoteController = PresentationRemoteSessionState & {
  projectId: string;
  projectName: string;
  slides: PresentationRemoteSlide[];
};

export type PresentationRemoteCommand = {
  id: string;
  action: PresentationCommandAction;
  slideIndex: number | null;
  createdAt: string;
};
