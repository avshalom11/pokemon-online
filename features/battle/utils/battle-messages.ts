// Single source of truth for every battle notification string (rendered
// through BattleContent's `message` state into the shared
// components/battle/BattleMessageBox). Centralizing wording here means
// every battle screen state reads consistent Hebrew phrasing, and there is
// exactly one place to fix a typo or translation instead of several inline
// template strings scattered across BattleContent.
//
// Battle-only events, strictly: immediate attacks, faints, switches,
// captures, escapes. Player XP/level-up feedback is deliberately NOT here —
// XP is a brief toast (features/battle/components/XpToast.tsx, wording from
// features/player-progression/progression-messages.ts) and level-ups are a
// persistent notification (features/notifications/) — the battle loop must
// never be slowed by meta-progression text sharing this message box.
//
// Pokémon species names and the player's own username are always passed in
// as plain parameters and interpolated as-is (English, exactly as stored —
// see data/pokemon/pokemon-data.ts and PlayerProfile.displayName) — only the
// surrounding Hebrew grammar belongs to this module. Callers are
// responsible for actually setting the returned string via setMessage/
// BattleMessageBox, which renders it with dir="rtl" so the embedded Latin
// names stay left-to-right readable inside the Hebrew sentence.

export function wildAppearedMessage(wildName: string): string {
  return `פראי ${wildName} הופיע!`;
}

// Shared by both directions of a landed hit: the player's own Pokémon
// attacking the wild one, and the wild's counter-attack against the active
// party member — same Hebrew template either way, just swapped arguments.
export function attackMessage(attackerName: string, targetName: string): string {
  return `${attackerName} תקף את ${targetName}!`;
}

export function faintedMessage(name: string): string {
  return `${name} התעלף!`;
}

// A fainted party member always needs a follow-up prompt to pick a
// replacement — kept as its own helper (rather than making callers
// concatenate faintedMessage themselves) so that pairing stays in one place.
export function forcedReplacementMessage(faintedName: string): string {
  return `${faintedMessage(faintedName)} בחר פוקימון אחר.`;
}

export function switchInMessage(name: string): string {
  return `קדימה, ${name}!`;
}

export function throwPokeballMessage(playerName: string, wildName: string): string {
  return `${playerName} זרק פוכדור על ${wildName}!`;
}

export function captureFailedMessage(wildName: string): string {
  return `${wildName} השתחרר מהפוכדור!`;
}

export function captureSucceededMessage(wildName: string): string {
  return `${wildName} נתפס בהצלחה!`;
}

export function escapeMessage(): string {
  return "הצלחת לברוח!";
}

export function partyDefeatedMessage(): string {
  return "כל הפוקימונים שלך התעלפו!";
}
