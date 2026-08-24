"use client";

import Link from "next/link";
import { useState } from "react";

import { useActiveBattle } from "@/features/battle-session/context/active-battle-context";
import { buildSidebarCategories, type SidebarMenuItem } from "@/features/navigation/data/sidebar-menu";
import { PlayerSearchModal } from "@/features/player-search/components/PlayerSearchModal";
import { useSidebarOpen } from "@/components/layout/sidebar-open-context";
import { SIDEBAR_PANEL_WIDTH_CSS } from "@/lib/layout/gameLayout";

const BATTLE_LOCKED_TITLE = "לא ניתן לנווט בזמן קרב פעיל";

interface GameSidebarProps {
  // Null only if the session somehow lacks one — the Profile item is left
  // without an href in that case (buildSidebarCategories), never a broken
  // link. See NavigationGrid.tsx's own identical fallback.
  username: string | null;
}

// The global right-side navigation sidebar — rendered once by
// app/(game)/layout.tsx, alongside (never replacing) GameHeader, so it
// appears on every authenticated game page including Battle. Menu structure
// lives entirely in features/navigation/data/sidebar-menu.ts; this
// component only renders it and owns purely presentational state (open/
// closed, which categories are expanded) plus the one real gating decision
// (is a battle currently active).
//
// Battle-lock source of truth: useActiveBattle() (features/battle-session/
// context/active-battle-context.tsx), seeded server-side from the real
// FieldBattleSession row (hasActiveBattleSession, battle-session.service.ts)
// and kept live by BattleContent's own mount/unmount — never a second,
// independently-tracked "am I in battle" flag, and never pathname matching.
export function GameSidebar({ username }: GameSidebarProps) {
  const { isActiveBattle } = useActiveBattle();
  const categories = buildSidebarCategories(username);

  // RIGHT SIDEBAR — PUSH FRIENDS BAR + GLOBAL CHAT. Open/closed state (and
  // its localStorage persistence) now lives in the shared SidebarOpenProvider
  // (components/layout/sidebar-open-context.tsx) rather than as local state
  // here, so FriendsBar/SocialDock and GlobalChatBar — plain siblings of
  // this component in app/(game)/layout.tsx, not parent/child — can read
  // the exact same live value and shift themselves out from under this
  // panel while it's open.
  const { isOpen, setIsOpen } = useSidebarOpen();
  // PLAYER SEARCH — the sidebar's own action-item state (see
  // sidebar-menu.ts's hasAction doc comment). Not persisted — always
  // starts closed on a fresh mount, same as every other modal in this
  // codebase.
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<Set<string>>(
    () => new Set(categories.map((category) => category.id))
  );

  function toggleCategory(categoryId: string) {
    setExpandedCategoryIds((current) => {
      const next = new Set(current);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }

  return (
    <div dir="rtl">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "סגור תפריט ניווט" : "פתח תפריט ניווט"}
        className="fixed z-40 flex h-10 w-8 items-center justify-center rounded-l-lg border border-white/10 bg-slate-900/90 text-slate-300 shadow-lg transition-[right] duration-200 hover:bg-slate-800"
        style={{ top: "calc(var(--app-header-height) + 1rem)", right: isOpen ? SIDEBAR_PANEL_WIDTH_CSS : "0px" }}
      >
        <span className="text-sm">{isOpen ? "◀" : "▶"}</span>
      </button>

      <aside
        aria-label="ניווט"
        className={`fixed right-0 bottom-0 top-[var(--app-header-height)] z-30 overflow-y-auto border-l border-white/10 bg-slate-950/95 backdrop-blur-md transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: SIDEBAR_PANEL_WIDTH_CSS }}
      >
        <nav className="flex flex-col gap-2 p-3">
          {categories.map((category) => {
            const isExpanded = expandedCategoryIds.has(category.id);
            return (
              <div key={category.id} className="rounded-xl border border-white/10 bg-slate-900/50">
                <button
                  type="button"
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={isExpanded}
                  className="flex w-full items-center justify-between px-3 py-2 text-right text-xs font-semibold tracking-wide text-slate-400 uppercase"
                >
                  {category.label}
                  <span className="text-[10px] text-slate-500">{isExpanded ? "▲" : "▼"}</span>
                </button>

                {isExpanded ? (
                  <ul className="flex flex-col gap-1 px-2 pb-2">
                    {category.items.map((item) => (
                      <li key={item.id}>
                        <SidebarMenuItemLink
                          item={item}
                          isBattleLocked={isActiveBattle}
                          onNavigate={() => setIsOpen(false)}
                          onAction={(id) => {
                            if (id === "player-search") setIsSearchOpen(true);
                            setIsOpen(false);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </nav>
      </aside>

      {isSearchOpen ? <PlayerSearchModal onClose={() => setIsSearchOpen(false)} /> : null}
    </div>
  );
}

interface SidebarMenuItemLinkProps {
  item: SidebarMenuItem;
  isBattleLocked: boolean;
  onNavigate: () => void;
  // PLAYER SEARCH — called (with the item's own id) instead of navigating,
  // for the one kind of item that opens a client-side action/modal rather
  // than a route (item.hasAction — see sidebar-menu.ts's own doc comment).
  onAction: (itemId: string) => void;
}

// One row. Four states: a real, clickable Link; an action button (opens a
// modal in place, e.g. Player Search); battle-locked (a real route/action,
// but disallowed right now — the EXACT SAME isBattleLocked check every
// state shares, never a second lock system); or no route yet (Profile with
// no known username) — the last two render identically inert but carry
// different tooltips so the reason is never ambiguous.
function SidebarMenuItemLink({ item, isBattleLocked, onNavigate, onAction }: SidebarMenuItemLinkProps) {
  const baseClassName = "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors";

  if (item.hasAction) {
    if (isBattleLocked) {
      return (
        <div aria-disabled="true" title={BATTLE_LOCKED_TITLE} className={`${baseClassName} cursor-not-allowed text-slate-600`}>
          <span aria-hidden="true">{item.icon}</span>
          {item.label}
        </div>
      );
    }

    return (
      <button
        type="button"
        onClick={() => onAction(item.id)}
        className={`${baseClassName} w-full text-right text-slate-200 hover:bg-white/10 hover:text-white`}
      >
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </button>
    );
  }

  if (!item.href) {
    return (
      <div aria-disabled="true" title="בקרוב" className={`${baseClassName} cursor-default text-slate-600`}>
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </div>
    );
  }

  if (isBattleLocked) {
    return (
      <div
        aria-disabled="true"
        title={BATTLE_LOCKED_TITLE}
        className={`${baseClassName} cursor-not-allowed text-slate-600`}
      >
        <span aria-hidden="true">{item.icon}</span>
        {item.label}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`${baseClassName} text-slate-200 hover:bg-white/10 hover:text-white`}
    >
      <span aria-hidden="true">{item.icon}</span>
      {item.label}
    </Link>
  );
}
