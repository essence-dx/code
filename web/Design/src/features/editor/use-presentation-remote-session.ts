"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type {
  PresentationRemoteCommand,
  PresentationRemoteSessionState,
} from "@/features/editor/presentation-remote-types";

type RemoteStatus = "starting" | "ready" | "error";

type UsePresentationRemoteSessionInput = {
  projectId: string;
  activeIndex: number;
  slideCount: number;
  pageName: string;
  onCommand: (command: PresentationRemoteCommand) => void;
};

export function usePresentationRemoteSession({
  projectId,
  activeIndex,
  slideCount,
  pageName,
  onCommand,
}: UsePresentationRemoteSessionInput) {
  const [session, setSession] =
    useState<PresentationRemoteSessionState | null>(null);
  const [status, setStatus] = useState<RemoteStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const [controlUrl, setControlUrl] = useState("");
  const seenCommandIdsRef = useRef<Set<string>>(new Set());
  const onCommandRef = useRef(onCommand);
  const initialStateRef = useRef({
    activeIndex,
    slideCount,
    pageName,
  });

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    let ignore = false;

    async function startSession() {
      setStatus("starting");

      try {
        const response = await fetch(
          `/api/projects/${projectId}/presentation-session`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(initialStateRef.current),
          },
        );

        if (!response.ok) {
          throw new Error("Remote pairing could not start");
        }

        const body = (await response.json()) as {
          session: PresentationRemoteSessionState;
        };

        if (ignore) return;

        seenCommandIdsRef.current.clear();
        setSession(body.session);
        setStatus("ready");
        setError(null);
      } catch (startError) {
        if (ignore) return;

        setStatus("error");
        setError(
          startError instanceof Error
            ? startError.message
            : "Remote pairing failed",
        );
      }
    }

    void startSession();

    return () => {
      ignore = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!session) {
      setControlUrl("");
      return;
    }

    setControlUrl(
      `${window.location.origin}/present/remote/${session.controlToken}`,
    );
  }, [session]);

  useEffect(() => {
    if (!session) return;

    const controller = new AbortController();
    const sessionId = session.id;

    async function publishState() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/presentation-session/${sessionId}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              activeIndex,
              slideCount,
              pageName,
            }),
            signal: controller.signal,
          },
        );

        if (!response.ok) {
          throw new Error("Remote state is not syncing");
        }

        const body = (await response.json()) as {
          session: PresentationRemoteSessionState;
        };

        setSession(body.session);
        setStatus("ready");
        setError(null);
      } catch (publishError) {
        if (controller.signal.aborted) return;

        setStatus("error");
        setError(
          publishError instanceof Error
            ? publishError.message
            : "Remote state is offline",
        );
      }
    }

    void publishState();

    return () => controller.abort();
  }, [activeIndex, pageName, projectId, session?.id, slideCount]);

  useEffect(() => {
    if (!session) return;

    let ignore = false;
    const sessionId = session.id;

    async function fetchCommands() {
      try {
        const response = await fetch(
          `/api/projects/${projectId}/presentation-session/${sessionId}/commands`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          throw new Error("Remote commands are not available");
        }

        const body = (await response.json()) as {
          commands: PresentationRemoteCommand[];
        };

        if (ignore) return;

        for (const command of body.commands) {
          if (seenCommandIdsRef.current.has(command.id)) continue;

          seenCommandIdsRef.current.add(command.id);
          onCommandRef.current(command);
        }

        setStatus("ready");
        setError(null);
      } catch (commandError) {
        if (ignore) return;

        setStatus("error");
        setError(
          commandError instanceof Error
            ? commandError.message
            : "Remote commands are offline",
        );
      }
    }

    void fetchCommands();
    const intervalId = window.setInterval(fetchCommands, 1000);

    return () => {
      ignore = true;
      window.clearInterval(intervalId);
    };
  }, [projectId, session?.id]);

  const copyControlUrl = useCallback(async () => {
    if (!controlUrl) return;

    await navigator.clipboard?.writeText(controlUrl).catch(() => {
      setError("Could not copy the remote control link");
      setStatus("error");
    });
  }, [controlUrl]);

  return {
    session,
    status,
    error,
    controlUrl,
    copyControlUrl,
  };
}
