"use client";

import { useEffect, useState } from "react";

import { getActiveTutorialTarget, getReplayActiveTarget } from "@/features/tutorial/data/tutorial-stages.config";
import { useTutorial } from "@/features/tutorial/context/tutorial-context";

// GAME TUTORIAL — PHASE 1. Dims the rest of the screen and draws a pulsing
// ring around whichever real control the current stage/sub-step is
// awaiting — never a fake proxy element, never anything that blocks
// interaction: every div this component renders carries pointer-events:
// none, so the player can click ANYTHING underneath it, including outside
// the highlighted target ("do not block unrelated navigation" — this
// task's own explicit requirement). "Bright target against a dimmed
// background" is a single-element CSS trick (a huge `box-shadow` covering
// the whole viewport, positioned exactly at the target's own rect) rather
// than a clip-path cutout or a second full-screen click-catching div — see
// this task's own "keep highlight visual only" requirement.
//
// Renders nothing whenever the target isn't currently registered/visible
// (a different route, not yet mounted, or the sidebar happens to be
// closed) — this component never nudges navigation itself, and a dimmed
// screen with nothing actually highlighted would be worse than showing
// nothing (the minimized banner's own guidance text is what tells the
// player where to go regardless — see TutorialPanel.tsx).
export function TutorialSpotlightOverlay() {
  const { view, mode, replayView, panelMode, getTargetElement, registryVersion } = useTutorial();
  const [rect, setRect] = useState<DOMRect | null>(null);

  // PHASE 5 — REPLAY. Same target-registry, same measuring logic, either
  // way — only WHICH view/resolver to read from differs (this task's own
  // "keep normal navigation/spotlight behavior" requirement, satisfied by
  // never duplicating this component for replay).
  const active =
    panelMode !== "awaiting"
      ? null
      : mode === "replay"
        ? (replayView ? getReplayActiveTarget(replayView) : null)
        : getActiveTutorialTarget(view);
  const targetId = active?.target.targetId ?? null;

  useEffect(() => {
    if (!targetId) return;

    const element = getTargetElement(targetId);
    if (!element) return;

    function measure() {
      setRect(element!.getBoundingClientRect());
    }

    // Re-measures on the target's own size changes (a card that reflows,
    // a panel that expands), on window resize, and on scroll from ANY
    // scrollable ancestor (capture: true — the sidebar's own aside panel,
    // Home's own scrolling container, etc. all bubble here) — the same
    // "the spotlight follows the real element" requirement across every
    // route/layout this app already has, without hardcoding any of their
    // individual scroll containers. No explicit initial measure() call
    // here — observe() itself always fires one initial ResizeObserver
    // callback asynchronously (a real browser guarantee, not a hack),
    // which is what populates `rect` the first time without calling
    // setState synchronously from this effect's own body.
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(element);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
      // Clears any stale rect the instant this target stops being the
      // active one (a dependency change below, or unmount) — otherwise a
      // subsequent target that isn't found on the current route (a
      // different route than the one it lives on) would incorrectly keep
      // showing the PREVIOUS target's own position.
      setRect(null);
    };
    // registryVersion is a deliberate dependency, not just targetId — a
    // target that unregisters and re-registers (e.g. the same component
    // remounting across a client-side navigation) bumps this counter even
    // when targetId itself hasn't changed, which is exactly when this
    // effect needs to re-run to find the NEW element instance.
  }, [targetId, registryVersion, getTargetElement]);

  if (!active || !rect) return null;

  const padding = 6;
  const style = {
    top: rect.top - padding,
    left: rect.left - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed z-[85] rounded-lg transition-all duration-200 ease-out"
        style={{ ...style, boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.65)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none animate-tutorial-spotlight-pulse fixed z-[86] rounded-lg outline outline-[3px] outline-indigo-400 transition-all duration-200 ease-out"
        style={style}
      />
    </>
  );
}
