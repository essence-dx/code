"use client";

import { useCallback, useEffect, useState } from "react";

export function useEditorShellUi({
  initialZoom = 0.55,
}: {
  initialZoom?: number;
} = {}) {
  const [zoom, setZoom] = useState(initialZoom);

  useEffect(() => {
    setZoom(initialZoom);
  }, [initialZoom]);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isVersionHistoryOpen, setIsVersionHistoryOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isPrintProofOpen, setIsPrintProofOpen] = useState(false);
  const [isExportJobsOpen, setIsExportJobsOpen] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(false);
  const [showPrintMarks, setShowPrintMarks] = useState(false);

  const openCommandPalette = useCallback(() => {
    setIsCommandPaletteOpen(true);
  }, []);

  const openVersionHistory = useCallback(() => {
    setIsVersionHistoryOpen(true);
  }, []);

  const openComments = useCallback(() => {
    setIsCommentsOpen(true);
  }, []);

  const openPrintProof = useCallback(() => {
    setIsPrintProofOpen(true);
  }, []);

  const openExportJobs = useCallback(() => {
    setIsExportJobsOpen(true);
  }, []);

  const toggleGuides = useCallback(() => {
    setShowGuides((current) => !current);
  }, []);

  const toggleGrid = useCallback(() => {
    setShowGrid((current) => !current);
  }, []);

  const togglePrintMarks = useCallback(() => {
    setShowPrintMarks((current) => !current);
  }, []);

  const zoomIn = useCallback(() => {
    setZoom((current) => Math.min(2, current + 0.1));
  }, []);

  const zoomOut = useCallback(() => {
    setZoom((current) => Math.max(0.2, current - 0.1));
  }, []);

  return {
    zoom,
    setZoom,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isVersionHistoryOpen,
    setIsVersionHistoryOpen,
    isCommentsOpen,
    setIsCommentsOpen,
    isPrintProofOpen,
    setIsPrintProofOpen,
    isExportJobsOpen,
    setIsExportJobsOpen,
    showGrid,
    showGuides,
    showPrintMarks,
    openCommandPalette,
    openVersionHistory,
    openComments,
    openPrintProof,
    openExportJobs,
    toggleGuides,
    toggleGrid,
    togglePrintMarks,
    zoomIn,
    zoomOut,
  };
}
