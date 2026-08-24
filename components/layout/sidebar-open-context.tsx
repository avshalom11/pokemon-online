"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const OPEN_STORAGE_KEY = "game-sidebar-open";

interface SidebarOpenContextValue {
  isOpen: boolean;
  setIsOpen: (value: boolean | ((current: boolean) => boolean)) => void;
}

const SidebarOpenContext = createContext<SidebarOpenContextValue | null>(null);

// RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. The one shared source of
// the right sidebar's open/closed state — lifted out of GameSidebar.tsx
// (which used to own this as purely local state) so the other fixed-
// position UI anchored to the right edge (FriendsBar/SocialDock,
// GlobalChatBar) can react to it too. app/(game)/layout.tsx renders
// GameSidebar and those bars as plain siblings, not parent/child, so a
// shared context — not prop drilling — is the only way for all of them to
// read the exact same live value with zero risk of drifting out of sync.
//
// Hydration convention unchanged from GameSidebar's own prior local state:
// starts closed on both the server render and the first client paint (SSR-
// safe, no mismatch), then reads the persisted value from localStorage
// right after mount — never during the initial render.
export function SidebarOpenProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem(OPEN_STORAGE_KEY);
    if (stored !== null) setIsOpen(stored === "true");
    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;
    window.localStorage.setItem(OPEN_STORAGE_KEY, String(isOpen));
  }, [isOpen, hasHydrated]);

  return <SidebarOpenContext.Provider value={{ isOpen, setIsOpen }}>{children}</SidebarOpenContext.Provider>;
}

export function useSidebarOpen(): SidebarOpenContextValue {
  const context = useContext(SidebarOpenContext);
  if (!context) {
    throw new Error("useSidebarOpen must be used within SidebarOpenProvider");
  }
  return context;
}
