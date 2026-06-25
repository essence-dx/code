import assert from "node:assert/strict";
import {
  createBoardOperationsReviewCycleHistoryRecord,
  createBoardOperationsReviewCycleHistoryReport,
  getBoardOperationsReviewCycleHistoryDownload,
} from "@/features/projects/board-operations-review-cycle-history";
import type { BoardOperationsControlCenterReport } from "@/features/projects/board-operations-control-center";

const generatedAt = "2026-05-17T11:00:00.000Z";

const controlCenter: BoardOperationsControlCenterReport = {
  closeoutReport: "Board operations closeout for workspace-board\nMay board closeout",
  csvContent: "control,status,score,owner,next_action\n",
  csvDataUri: "data:text/csv,control",
  csvFileName: "control.csv",
  generatedAt,
  rows: [
    {
      detail: "Audit has blocked sections.",
      id: "closeout-report",
      label: "Closeout report",
      nextAction: "Close blocked audit export sections and forecast risks before final board closeout.",
      owner: "Board operations",
      score: 41,
      status: "blocked",
    },
    {
      detail: "Agenda has blocked items.",
      id: "agenda-readiness",
      label: "Agenda readiness",
      nextAction: "Clear blocked agenda items before the board cycle closes.",
      owner: "Board chair",
      score: 58,
      status: "blocked",
    },
  ],
  summary: {
    blockedCount: 2,
    controlScore: 54,
    nextAction: "Close blocked audit export sections and forecast risks before final board closeout.",
    readyCount: 0,
    rowCount: 2,
    savedReviewCycleCount: 1,
    status: "blocked",
    watchCount: 0,
  },
  workspaceId: "workspace-board",
};

const record = createBoardOperationsReviewCycleHistoryRecord({
  actor: {
    email: "chair@example.com",
    name: "Release Chair",
    userId: "user-chair",
  },
  controlCenter,
  createdAt: generatedAt,
  reviewCycle: {
    id: "cycle-may",
    label: "May board closeout",
    owner: "Release chair",
    savedAt: "2026-05-17T10:30:00.000Z",
    status: "blocked",
  },
  workspaceId: "workspace-board",
});

assert.equal(record.status, "blocked");
assert.equal(record.ownerCloseoutState, "blocked");
assert.equal(record.auditHash.startsWith("sha256:"), true);
assert.equal(record.controlScore, 54);
assert.equal(record.blockedControlCount, 2);
assert.equal(record.jsonFileName, "workspace-board-board-review-cycle-cycle-may-20260517.json");
assert.equal(record.csvFileName, "workspace-board-board-review-cycle-cycle-may-20260517.csv");
assert.match(record.csvContent, /cycle_id,label,status,owner,control_score,audit_hash,next_action/);

const history = createBoardOperationsReviewCycleHistoryReport([record]);
assert.equal(history.summary.totalRecordCount, 1);
assert.equal(history.summary.blockedRecordCount, 1);
assert.equal(history.summary.latestAuditHash, record.auditHash);
assert.equal(history.summary.latestSavedAt, generatedAt);
assert.equal(history.summary.ownerCount, 1);
assert.match(history.csvContent, /May board closeout/);

const jsonDownload = getBoardOperationsReviewCycleHistoryDownload(record, "json");
assert.equal(jsonDownload.fileName, record.jsonFileName);
assert.match(jsonDownload.body, /"schemaVersion": 1/);

const csvDownload = getBoardOperationsReviewCycleHistoryDownload(record, "csv");
assert.equal(csvDownload.fileName, record.csvFileName);
assert.match(csvDownload.body, /cycle-may/);

console.log("board operations review cycle history smoke passed");
