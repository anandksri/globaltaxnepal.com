"use client";

import { Download } from "lucide-react";
import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    function updateInstalled() {
      setInstalled(standalone.matches || ("standalone" in navigator && navigator.standalone === true));
    }
    function onPrompt(event: Event) {
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    }
    function onInstalled() {
      setPrompt(null);
      setInstalled(true);
      setShowInstructions(false);
    }
    updateInstalled();
    standalone.addEventListener("change", updateInstalled);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone.removeEventListener("change", updateInstalled);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) {
      setShowInstructions((visible) => !visible);
      return;
    }
    setPrompt(null);
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch (error) {
      console.error("[pwa] Install prompt failed.", error);
      setShowInstructions(true);
    }
  }

  if (installed) return null;

  return (
    <div className="mt-3">
      <button
        aria-expanded={showInstructions}
        className="button button-secondary w-full"
        onClick={install}
        type="button"
      >
        <Download aria-hidden="true" className="icon" />
        Install app
      </button>
      {showInstructions && (
        <p className="mt-2 text-sm leading-6 text-text-secondary" role="status">
          On iPhone or iPad, tap Share in Safari, then Add to Home Screen. On Android, open your browser menu and choose Install app or Add to Home screen.
        </p>
      )}
    </div>
  );
}
