import { create } from "zustand";
import type { ProjectCommentSummary } from "./types";

interface ProjectCommentState {
  comments: ProjectCommentSummary[];
  selectedCommentId: string | null;
  clearComments: () => void;
  removeComment: (id: string) => void;
  selectComment: (id: string | null) => void;
  setComments: (comments: ProjectCommentSummary[]) => void;
  upsertComment: (comment: ProjectCommentSummary) => void;
}

export const useProjectCommentStore = create<ProjectCommentState>((set) => ({
  comments: [],
  selectedCommentId: null,
  clearComments: () => set({ comments: [], selectedCommentId: null }),
  removeComment: (id) =>
    set((state) => ({
      comments: state.comments.filter((comment) => comment.id !== id),
      selectedCommentId: state.selectedCommentId === id ? null : state.selectedCommentId,
    })),
  selectComment: (id) => set({ selectedCommentId: id }),
  setComments: (comments) => set({ comments }),
  upsertComment: (comment) =>
    set((state) => {
      const exists = state.comments.some((entry) => entry.id === comment.id);

      return {
        comments: exists ? state.comments.map((entry) => (entry.id === comment.id ? comment : entry)) : [comment, ...state.comments],
      };
    }),
}));
