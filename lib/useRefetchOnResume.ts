"use client";

import { useEffect } from "react";

// PWA lifecycle hardening (HARDENING-AUDIT.md C6).
//
// Phones background and lock constantly at the venue. iOS kills the realtime
// WebSocket while suspended; supabase-js rejoins the channel on resume but
// events missed in between are never replayed, so pages quietly go stale.
// Re-running the page's existing fetch when the document becomes visible (or
// connectivity returns) closes the gap without touching the realtime wiring.
export function useRefetchOnResume(refetch: () => void) {
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") refetch();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", refetch);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", refetch);
    };
  }, [refetch]);
}
