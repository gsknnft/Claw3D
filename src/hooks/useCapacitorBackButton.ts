"use client";

import { useEffect } from "react";

// Handles the Android hardware back button in Capacitor native builds.
// In a native WebView the default back behaviour is to pop the WebView history,
// which can navigate out of the SPA shell. This hook mirrors that but lets us
// intercept it cleanly (e.g. to close a modal instead of going back).
export function useCapacitorBackButton(onBack?: () => boolean | void) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (!(window as any).Capacitor?.isNative) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let listener: any = null;

    const setup = async () => {
      try {
        const { App } = await import("@capacitor/app");
        listener = await App.addListener("backButton", (data) => {
          // Allow the caller to intercept first (e.g. close a modal).
          if (onBack && onBack() === true) return;
          if (data.canGoBack) window.history.back();
        });
      } catch {
        // @capacitor/app not available — no-op
      }
    };

    void setup();

    return () => {
      listener?.remove();
    };
  }, [onBack]);
}
