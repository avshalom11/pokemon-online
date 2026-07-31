import type { CurrencyReward } from "@/features/currency/types/currency.types";

// Hebrew wording for the persistent notification a field-battle currency
// reward creates (features/notifications/) — same "one dedicated
// -messages.ts per reward domain" precedent
// features/player-progression/progression-messages.ts already established
// for level-up text. One of each currency's two variants is picked at
// random per reward (see fieldBattleCurrencyRewardMessage) — never the
// same phrasing every single time a player wins.
//
// pokemonName is always the defeated wild's own species name, exactly as
// shown elsewhere in battle (English, embedded as-is inside the Hebrew
// sentence — same convention features/battle/utils/battle-messages.ts
// already uses for e.g. wildAppearedMessage).
const MONEY_REWARD_MESSAGE_TEMPLATES: ((pokemonName: string, amount: number) => string)[] = [
  (pokemonName, amount) => `${pokemonName} ממש התרשם מהיכולות שלך והעניק לך ${amount} כסף.`,
  (pokemonName, amount) => `${pokemonName} התעלף והשאיר שק עם ${amount} כסף.`,
];

const GOLD_REWARD_MESSAGE_TEMPLATES: ((pokemonName: string, amount: number) => string)[] = [
  (pokemonName, amount) => `${pokemonName} העניק לך ${amount} זהב.`,
  (_pokemonName, amount) => `מצאת ${amount} זהב לאחר הקרב.`,
];

function pickRandomTemplate<T>(templates: readonly T[], randomSource: () => number): T {
  const index = Math.min(Math.floor(randomSource() * templates.length), templates.length - 1);
  return templates[index];
}

export function fieldBattleCurrencyRewardMessage(
  pokemonName: string,
  reward: CurrencyReward,
  randomSource: () => number = Math.random
): string {
  const templates = reward.type === "money" ? MONEY_REWARD_MESSAGE_TEMPLATES : GOLD_REWARD_MESSAGE_TEMPLATES;
  const template = pickRandomTemplate(templates, randomSource);
  return template(pokemonName, reward.amount);
}
