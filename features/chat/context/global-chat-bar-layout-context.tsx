"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";

import { isHomePathname, shouldForceCollapseOnRouteChange } from "@/features/chat/utils/route-chat-visibility";

interface GlobalChatBarLayoutContextValue {
  isHome: boolean;
  minimized: boolean;
  setMinimized: (value: boolean | ((current: boolean) => boolean)) => void;
}

const GlobalChatBarLayoutContext = createContext<GlobalChatBarLayoutContextValue | null>(null);

// BOTTOM UI — FRIENDS PANEL BESIDE GLOBAL CHAT. The one shared source of
// "is there a minimized Global Chat bar to sit next to right now" —
// `isHome`/`minimized` (and the route-driven auto-collapse that used to
// live entirely inside GlobalChatBar.tsx) are lifted up here so SocialDock
// and the shared BottomDock wrapper — plain siblings of GlobalChatBar in
// app/(game)/layout.tsx, not parent/child — can read the exact same live
// values to decide whether Friends belongs beside the minimized bar (same
// bottom row) or back in its own original stacked-above position (Home, or
// while the chat panel is expanded — both left completely unchanged by this
// ticket). GlobalChatBar remains the only thing that ever calls
// setMinimized.
export function GlobalChatBarLayoutProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isHome = isHomePathname(pathname);

  const [minimized, setMinimized] = useState(true);
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    if (shouldForceCollapseOnRouteChange(prevPathname, pathname)) {
      setMinimized(true);
    }
    setPrevPathname(pathname);
  }

  return (
    <GlobalChatBarLayoutContext.Provider value={{ isHome, minimized, setMinimized }}>
      {children}
    </GlobalChatBarLayoutContext.Provider>
  );
}

export function useGlobalChatBarLayout(): GlobalChatBarLayoutContextValue {
  const context = useContext(GlobalChatBarLayoutContext);
  if (!context) {
    throw new Error("useGlobalChatBarLayout must be used within GlobalChatBarLayoutProvider");
  }
  return context;
}
