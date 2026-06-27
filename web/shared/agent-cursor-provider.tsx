"use client";

import { useEffect, useRef } from "react";

function loadScript(src: string): Promise<void> {
  return new Promise(function (resolve, reject) {
    if (document.querySelector('script[src="' + src + '"]')) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = function () { resolve(); };
    s.onerror = function () { reject(new Error("Failed to load " + src)); };
    document.head.appendChild(s);
  });
}

export function AgentCursorProvider() {
    const loadedRef = useRef(false);

  useEffect(function () {
    if (loadedRef.current) return;
    loadedRef.current = true;

    loadScript("/agent-cursor.js").catch(function (err) {
      console.error("[AgentCursorProvider] Failed to load agent-cursor.js:", err);
    });
    loadScript("/canvas-export.js").catch(function (err) {
      console.error("[AgentCursorProvider] Failed to load canvas-export.js:", err);
    });

    return function () {
      if (typeof window !== "undefined" && window.__agentCursor) {
        window.__agentCursor.disconnect();
      }
    };
  }, []);

  return null;
}
