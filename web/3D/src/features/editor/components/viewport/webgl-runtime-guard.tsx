"use client";

import { Component, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type WebGlStatus = "checking" | "ready" | "blocked";

interface WebGLRuntimeGuardProps {
  children: ReactNode;
  className?: string;
  surfaceLabel: string;
}

interface WebGLCanvasErrorBoundaryProps {
  children: ReactNode;
  className?: string;
  onRetry: () => void;
  resetKey: number;
  surfaceLabel: string;
}

interface WebGLCanvasErrorBoundaryState {
  errorMessage: string | null;
}

function canCreateWebGlContext() {
  if (typeof window === "undefined") {
    return false;
  }

  const canvas = window.document.createElement("canvas");

  try {
    const context =
      canvas.getContext("webgl2", { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext("webgl", { failIfMajorPerformanceCaveat: false }) ??
      (canvas.getContext("experimental-webgl", {
        failIfMajorPerformanceCaveat: false,
      }) as WebGLRenderingContext | null);

    if (!context) {
      return false;
    }

    const loseContext = context.getExtension("WEBGL_lose_context");
    loseContext?.loseContext();

    return true;
  } catch {
    return false;
  }
}

function WebGLUnavailablePanel({
  className,
  detail,
  onRetry,
  surfaceLabel,
}: {
  className?: string;
  detail?: string;
  onRetry: () => void;
  surfaceLabel: string;
}) {
  return (
    <div className={cn("flex h-full min-h-[320px] w-full items-center justify-center bg-background/95 p-4", className)}>
      <Card className="max-w-md border-border bg-card/95 shadow-sm">
        <CardHeader>
          <div className="mb-2 flex size-9 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <AlertTriangle className="size-4" />
          </div>
          <CardTitle>{surfaceLabel} needs WebGL</CardTitle>
          <CardDescription>
            Enable browser hardware acceleration or use a WebGL-capable browser session, then retry the viewport.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {detail ? <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">{detail}</p> : null}
          <Button className="gap-2" size="sm" variant="secondary" onClick={onRetry}>
            <RefreshCw className="size-3.5" />
            Retry viewport
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

class WebGLCanvasErrorBoundary extends Component<WebGLCanvasErrorBoundaryProps, WebGLCanvasErrorBoundaryState> {
  state: WebGLCanvasErrorBoundaryState = {
    errorMessage: null,
  };

  static getDerivedStateFromError(error: unknown): WebGLCanvasErrorBoundaryState {
    return {
      errorMessage: error instanceof Error ? error.message : "The WebGL renderer could not start.",
    };
  }

  componentDidCatch() {
    // React records the component stack in development; the UI remains available for recovery.
  }

  componentDidUpdate(previousProps: WebGLCanvasErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.errorMessage) {
      this.setState({ errorMessage: null });
    }
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <WebGLUnavailablePanel
          className={this.props.className}
          detail={this.state.errorMessage}
          onRetry={this.props.onRetry}
          surfaceLabel={this.props.surfaceLabel}
        />
      );
    }

    return this.props.children;
  }
}

export function WebGLRuntimeGuard({ children, className, surfaceLabel }: WebGLRuntimeGuardProps) {
  const [status, setStatus] = useState<WebGlStatus>("checking");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStatus(canCreateWebGlContext() ? "ready" : "blocked");
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [retryKey]);

  const retry = () => {
    setStatus("checking");
    setRetryKey((currentKey) => currentKey + 1);
  };

  if (status !== "ready") {
    return (
      <WebGLUnavailablePanel
        className={className}
        detail={status === "checking" ? "Checking browser graphics support." : undefined}
        onRetry={retry}
        surfaceLabel={surfaceLabel}
      />
    );
  }

  return (
    <WebGLCanvasErrorBoundary className={className} onRetry={retry} resetKey={retryKey} surfaceLabel={surfaceLabel}>
      {children}
    </WebGLCanvasErrorBoundary>
  );
}
