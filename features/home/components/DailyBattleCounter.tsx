interface DailyBattleCounterProps {
  count: number;
}

// Server-authoritative display only — the count itself is computed and
// persisted entirely server-side (features/daily-battles/services/
// daily-battle-count.service.ts); this component never increments
// anything, only renders whatever home-data.service.ts already fetched.
// Home-only by construction: nothing on Map or Battle imports this.
export function DailyBattleCounter({ count }: DailyBattleCounterProps) {
  return (
    <div className="w-fit rounded-lg border border-white/10 bg-slate-900/60 px-3 py-1.5 text-sm font-semibold text-slate-200">
      {`מספר קרבות יומי: ${count}`}
    </div>
  );
}
