import {
  pptxCommentThreadPlan,
  type PptxCommentThreadAnchorStatus,
} from "./pptx-comment-thread-plan"
import type { Deck, PresentationElement, Slide, SlideComment } from "./types"

export type PptxCommentXmlPartKind =
  | "comment-authors"
  | "slide-comment-relationship"
  | "slide-comments"

export type PptxCommentXmlPartStatus = "blocked" | "partial" | "ready"

export type PptxCommentXmlPart = {
  commentCount: number
  detail: string
  id: string
  kind: PptxCommentXmlPartKind
  path: string
  slideId?: string
  slideNumber?: number
  status: PptxCommentXmlPartStatus
  xml: string
  xmlLength: number
}

export type PptxCommentXmlAuthoring = {
  anchorReadyCount: number
  authorCount: number
  manualHandoffCount: number
  missingAnchorCount: number
  nativeCommentCount: number
  nativeReplyCount: number
  nativeThreadCount: number
  parts: PptxCommentXmlPart[]
  readyPartCount: number
  status: PptxCommentXmlPartStatus
  summary: string
  totalPartCount: number
  xmlLength: number
}

type CommentRecord = {
  comment: SlideComment
  slide: Slide
  slideIndex: number
}

type CommentAuthor = {
  colorIndex: number
  id: number
  initials: string
  lastIndex: number
  name: string
}

const slideWidthEmu = 12_192_000
const slideHeightEmu = 6_858_000
const commentsRelationshipType =
  "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
}

function validTimestamp(value: string, fallback = "2026-01-01T00:00:00.000Z") {
  return Number.isFinite(Date.parse(value)) ? value : fallback
}

function openCommentRecords(deck: Deck): CommentRecord[] {
  return deck.slides.flatMap((slide, slideIndex) =>
    (slide.comments ?? [])
      .filter((comment) => !comment.resolved)
      .map((comment) => ({ comment, slide, slideIndex })),
  )
}

function commentThreadId(comment: SlideComment) {
  return comment.sourceThreadId || comment.sourceCommentId || ""
}

function isNativeCommentCandidate(comment: SlideComment) {
  return comment.source === "pptx" && Boolean(commentThreadId(comment))
}

function targetElement(slide: Slide, comment: SlideComment) {
  return slide.elements.find((element) => element.id === comment.targetElementId)
}

function anchorStatus(
  records: CommentRecord[],
): PptxCommentThreadAnchorStatus {
  return records.some(
    ({ comment, slide }) => comment.sourceAnchor || targetElement(slide, comment),
  )
    ? "ready"
    : "missing"
}

function elementAnchor(element: PresentationElement) {
  return {
    x: Math.round(((element.x + element.width / 2) / 100) * slideWidthEmu),
    y: Math.round(((element.y + element.height / 2) / 100) * slideHeightEmu),
  }
}

function commentAnchor(record: CommentRecord) {
  if (record.comment.sourceAnchor) {
    return {
      x: Math.round(record.comment.sourceAnchor.x),
      y: Math.round(record.comment.sourceAnchor.y),
    }
  }

  const element = targetElement(record.slide, record.comment)
  return element ? elementAnchor(element) : null
}

function authorInitials(name: string) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .join("")
    .slice(0, 3)
    .toUpperCase()

  return initials || "P"
}

function commentAuthors(records: CommentRecord[]) {
  const authors = new Map<string, CommentAuthor>()

  records.forEach(({ comment }, index) => {
    const name = comment.authorName.trim() || "PowerPoint reviewer"
    const existing = authors.get(name)

    if (existing) {
      existing.lastIndex = Math.max(existing.lastIndex, index + 1)
      return
    }

    authors.set(name, {
      colorIndex: authors.size % 12,
      id: authors.size,
      initials: authorInitials(name),
      lastIndex: index + 1,
      name,
    })
  })

  return Array.from(authors.values())
}

function commentAuthorsXml(authors: CommentAuthor[]) {
  const entries = authors.map(
    (author) =>
      `  <p:cmAuthor id="${author.id}" name="${escapeXml(
        author.name,
      )}" initials="${escapeXml(author.initials)}" lastIdx="${
        author.lastIndex
      }" clrIdx="${author.colorIndex}"/>`,
  )

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:cmAuthorLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
${entries.join("\n")}
</p:cmAuthorLst>`
}

function sourceCommentId(comment: SlideComment, fallback: string) {
  return comment.sourceCommentId || fallback
}

function commentXml(
  record: CommentRecord,
  authorIds: Map<string, number>,
  index: number,
) {
  const comment = record.comment
  const authorName = comment.authorName.trim() || "PowerPoint reviewer"
  const anchor = commentAnchor(record)

  if (!anchor) return ""

  const sourceId = sourceCommentId(comment, comment.id)
  const parentId = comment.sourceParentCommentId ?? ""
  const replyDepth = comment.sourceReplyDepth ?? 0
  const threadId = commentThreadId(comment)
  const threadAttributes = [
    `id="${escapeXml(sourceId)}"`,
    threadId ? `threadId="${escapeXml(threadId)}"` : "",
    parentId ? `parentId="${escapeXml(parentId)}"` : "",
    replyDepth ? `replyDepth="${replyDepth}"` : "",
  ].filter(Boolean)

  return `  <p:cm authorId="${authorIds.get(authorName) ?? 0}" dt="${escapeXml(
    validTimestamp(comment.createdAt || comment.updatedAt),
  )}" idx="${index + 1}" ${threadAttributes.join(" ")}>
    <p:pos x="${anchor.x}" y="${anchor.y}"/>
    <p:text>${escapeXml(comment.body.trim())}</p:text>
  </p:cm>`
}

function slideCommentsXml(records: CommentRecord[], authorIds: Map<string, number>) {
  const comments = records
    .map((record, index) => commentXml(record, authorIds, index))
    .filter(Boolean)

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:cmLst xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
${comments.join("\n")}
</p:cmLst>`
}

function slideRelationshipXml(slideNumber: number) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rIdComments${slideNumber}" Type="${commentsRelationshipType}" Target="../comments/comment${slideNumber}.xml"/>
</Relationships>`
}

function groupNativeRecordsBySlide(records: CommentRecord[]) {
  return records.reduce((groups, record) => {
    const key = record.slide.id
    groups.set(key, [...(groups.get(key) ?? []), record])
    return groups
  }, new Map<string, CommentRecord[]>())
}

function combinedStatus(parts: PptxCommentXmlPart[]): PptxCommentXmlPartStatus {
  if (!parts.length || parts.every((part) => part.status === "blocked")) {
    return "blocked"
  }

  if (parts.every((part) => part.status === "ready")) return "ready"

  return "partial"
}

function summary(input: {
  manualHandoffCount: number
  missingAnchorCount: number
  nativeCommentCount: number
  readyPartCount: number
  totalPartCount: number
}) {
  if (!input.nativeCommentCount) {
    return "No imported PowerPoint comments are safe for native comment XML authoring yet."
  }

  const partSummary = `${input.readyPartCount}/${input.totalPartCount} comment XML part${
    input.totalPartCount === 1 ? "" : "s"
  } authored for ${input.nativeCommentCount} native comment${
    input.nativeCommentCount === 1 ? "" : "s"
  }`

  const handoffs = [
    input.manualHandoffCount
      ? `${input.manualHandoffCount} manual comment(s) remain in notes`
      : "",
    input.missingAnchorCount
      ? `${input.missingAnchorCount} thread(s) need anchor review`
      : "",
  ].filter(Boolean)

  return handoffs.length ? `${partSummary}; ${handoffs.join("; ")}.` : `${partSummary}.`
}

export function pptxCommentXmlAuthoring(deck: Deck): PptxCommentXmlAuthoring {
  const plan = pptxCommentThreadPlan(deck)
  const nativeRecords = openCommentRecords(deck).filter(({ comment }) =>
    isNativeCommentCandidate(comment),
  )
  const safeNativeRecords = nativeRecords.filter((record) =>
    Boolean(commentAnchor(record)),
  )
  const authors = commentAuthors(safeNativeRecords)
  const authorIds = new Map(authors.map((author) => [author.name, author.id]))
  const slideGroups = groupNativeRecordsBySlide(safeNativeRecords)
  const parts: PptxCommentXmlPart[] = []

  if (authors.length) {
    const xml = commentAuthorsXml(authors)
    parts.push({
      commentCount: 0,
      detail: "Registers reviewers referenced by authored native comment XML.",
      id: "comment-xml:authors",
      kind: "comment-authors",
      path: "ppt/commentAuthors.xml",
      status: "ready",
      xml,
      xmlLength: xml.length,
    })
  }

  for (const records of slideGroups.values()) {
    const first = records[0]
    if (!first) continue

    const slideNumber = first.slideIndex + 1
    const commentsXml = slideCommentsXml(records, authorIds)
    const relationshipXml = slideRelationshipXml(slideNumber)

    parts.push(
      {
        commentCount: records.length,
        detail:
          "Authors imported PowerPoint comments with preserved body, author, timestamp, anchor, thread id, and reply metadata.",
        id: `comment-xml:slide:${first.slide.id}`,
        kind: "slide-comments",
        path: `ppt/comments/comment${slideNumber}.xml`,
        slideId: first.slide.id,
        slideNumber,
        status: anchorStatus(records) === "ready" ? "ready" : "blocked",
        xml: commentsXml,
        xmlLength: commentsXml.length,
      },
      {
        commentCount: records.length,
        detail:
          "Adds the slide relationship needed to attach the authored comment part to its slide package part.",
        id: `comment-xml:slide-rel:${first.slide.id}`,
        kind: "slide-comment-relationship",
        path: `ppt/slides/_rels/slide${slideNumber}.xml.rels`,
        slideId: first.slide.id,
        slideNumber,
        status: "ready",
        xml: relationshipXml,
        xmlLength: relationshipXml.length,
      },
    )
  }

  const readyPartCount = parts.filter((part) => part.status === "ready").length
  const xmlLength = parts.reduce((total, part) => total + part.xmlLength, 0)

  return {
    anchorReadyCount: plan.anchorReadyCount,
    authorCount: authors.length,
    manualHandoffCount: plan.manualHandoffCount,
    missingAnchorCount: plan.missingAnchorCount,
    nativeCommentCount: safeNativeRecords.length,
    nativeReplyCount: plan.nativeReplyCount,
    nativeThreadCount: plan.nativeThreadCount,
    parts,
    readyPartCount,
    status: combinedStatus(parts),
    summary: summary({
      manualHandoffCount: plan.manualHandoffCount,
      missingAnchorCount: plan.missingAnchorCount,
      nativeCommentCount: safeNativeRecords.length,
      readyPartCount,
      totalPartCount: parts.length,
    }),
    totalPartCount: parts.length,
    xmlLength,
  }
}

export function serializePptxCommentXmlAuthoring(deck: Deck) {
  const authoring = pptxCommentXmlAuthoring(deck)
  const lines = [
    "PowerPoint comment XML authoring",
    `Status: ${authoring.status}`,
    `Parts: ${authoring.readyPartCount}/${authoring.totalPartCount}`,
    `Authors: ${authoring.authorCount}`,
    `Native comments: ${authoring.nativeCommentCount}`,
    `Native threads: ${authoring.nativeThreadCount}`,
    `Native replies: ${authoring.nativeReplyCount}`,
    `Manual handoffs: ${authoring.manualHandoffCount}`,
    `XML characters: ${authoring.xmlLength}`,
    `Summary: ${authoring.summary}`,
    "",
    "Authored comment XML parts:",
    ...(authoring.parts.length
      ? authoring.parts.map(
          (part, index) =>
            `${index + 1}. ${part.path} - ${part.status}; ${part.commentCount} comment(s); ${part.xmlLength} characters; ${part.detail}`,
        )
      : ["None"]),
  ]

  return `${lines.join("\n")}\n`
}
