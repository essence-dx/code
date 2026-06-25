import type { SlideComment } from "./types"

export function commentSourceAnchorLabel(comment: SlideComment) {
  if (!comment.sourceAnchor) return ""

  return `Anchor ${comment.sourceAnchor.x}, ${comment.sourceAnchor.y}`
}

export function commentSourceThreadLabel(comment: SlideComment) {
  return comment.sourceThreadId ? `Thread ${comment.sourceThreadId}` : ""
}

export function commentSourceReplyLabel(comment: SlideComment) {
  if (!comment.sourceParentCommentId) return ""

  return comment.sourceReplyToAuthorName
    ? `Reply to ${comment.sourceReplyToAuthorName}`
    : `Reply to ${comment.sourceParentCommentId}`
}

export function commentSourceDepthLabel(comment: SlideComment) {
  return comment.sourceReplyDepth && comment.sourceReplyDepth > 1
    ? `Depth ${comment.sourceReplyDepth}`
    : ""
}
