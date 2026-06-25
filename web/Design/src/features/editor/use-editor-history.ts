"use client";

import { useCallback, useState } from "react";

import type { DesignDocument } from "@/features/editor/types";

type HistoryState = {
  past: DesignDocument[];
  present: DesignDocument;
  future: DesignDocument[];
};

export function useEditorHistory(initialDocument: DesignDocument) {
  const [state, setState] = useState<HistoryState>({
    past: [],
    present: initialDocument,
    future: [],
  });

  const commit = useCallback(
    (
      updater: DesignDocument | ((document: DesignDocument) => DesignDocument),
    ) => {
      setState((current) => {
        const nextDocument =
          typeof updater === "function" ? updater(current.present) : updater;

        return {
          past: [...current.past, current.present].slice(-60),
          present: nextDocument,
          future: [],
        };
      });
    },
    [],
  );

  const replacePresent = useCallback((document: DesignDocument) => {
    setState((current) => ({
      ...current,
      present: document,
    }));
  }, []);

  const commitWithBase = useCallback(
    (baseDocument: DesignDocument, nextDocument: DesignDocument) => {
      setState((current) => ({
        past: [...current.past, baseDocument].slice(-60),
        present: nextDocument,
        future: [],
      }));
    },
    [],
  );

  const undo = useCallback(() => {
    setState((current) => {
      const previous = current.past.at(-1);

      if (!previous) return current;

      return {
        past: current.past.slice(0, -1),
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setState((current) => {
      const next = current.future[0];

      if (!next) return current;

      return {
        past: [...current.past, current.present],
        present: next,
        future: current.future.slice(1),
      };
    });
  }, []);

  return {
    document: state.present,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    commit,
    commitWithBase,
    replacePresent,
    undo,
    redo,
  };
}
