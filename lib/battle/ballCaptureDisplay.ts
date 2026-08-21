import { calculateCaptureChance, type CaptureChanceParams } from "@/engine/battle/capture";
import { isCaptureBallId } from "@/data/battle/capture-rate-config";

// Field Battle Bag — live capture-chance display. A thin presentation
// wrapper around the REAL calculateCaptureChance formula (engine/battle/
// capture.ts, reading data/battle/capture-rate-config.ts's own
// CAPTURE_RATE_TABLE) — never a second/duplicated formula. The only new
// thing this file does is round that same 0-1 probability to a whole
// percent for display; the probability itself is computed nowhere else.
//
// Master Ball's own itemId — duplicated as a plain string constant the same
// way features/battle/components/BattleContent.tsx's own MASTER_BALL_ITEM_ID
// already is (no single shared export for it exists yet in this codebase).
export const MASTER_BALL_ITEM_ID = "master-ball";

// Master Ball's 100% is not a computed value: it mirrors the real
// guaranteed-capture bypass rule already implemented in
// capture.service.ts's own MASTER_BALL_ITEM_ID branch, which never rolls
// against CAPTURE_RATE_TABLE at all (captured = true, unconditionally).
// Displaying 100% here can therefore never diverge from what throwing a
// Master Ball actually does. Returns null for any itemId that isn't a real
// capture ball (e.g. a Medicine item) — never a fabricated fallback percent.
export function getBallCapturePercent(ballItemId: string, params: CaptureChanceParams): number | null {
  if (ballItemId === MASTER_BALL_ITEM_ID) {
    return 100;
  }

  if (!isCaptureBallId(ballItemId)) {
    return null;
  }

  return Math.round(calculateCaptureChance(params, ballItemId) * 100);
}
