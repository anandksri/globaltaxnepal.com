"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/service-worker.js").catch((error: unknown) => {
        console.error("[pwa] Service worker registration failed.", error);
      });
    }
  }, []);

  return null;
}
