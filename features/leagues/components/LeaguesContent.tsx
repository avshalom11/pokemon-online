"use client";

import { useState, useTransition } from "react";

import { BackButton } from "@/components/layout/BackButton";
import { SpriteImage } from "@/components/media/SpriteImage";
import { getChestDefinition } from "@/features/chests/data/chest-definitions";
import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { registerForLeagueAction } from "@/features/leagues/actions/register-for-league.action";
import { leagueMatchStatusLabelHe } from "@/features/leagues/data/league-match-labels";
import { getLeaguePlacementRewardDefinition, getLeagueParticipationRewardDefinition } from "@/features/leagues/data/league-reward-registry";
import type { LeaguePlayerAchievement } from "@/features/leagues/services/league-achievement.service";
import type { LeagueTournamentBracketView } from "@/features/leagues/services/league-bracket-view.service";
import type { LeaguesOverviewView, RegionalLeagueView } from "@/features/leagues/services/league-view.service";
import type { LeagueId } from "@/features/leagues/types/league.types";

interface LeaguesContentProps {
  overview: LeaguesOverviewView;
  achievements: readonly LeaguePlayerAchievement[];
  brackets: Record<LeagueId, LeagueTournamentBracketView | null>;
  championDisplayNames: Record<string, string>;
}

const CHAMPIONS_LEAGUE_NOTICE = "ההעפלה לליגת האלופים מתבצעת לפי תוצאות הליגות האזוריות — מקום 1 בכל ליגה אזורית, ומקום 2 בליגה III";
const DUPLICATE_QUALIFIER_MESSAGE = "לא ניתן ליצור כרגע את ליגת האלופים עקב כפילות בין המעפילים.";

const CYCLE_WEEK_LABELS = ["ליגה I", "ליגה II", "ליגה III", "ליגת האלופים"];

function registrationDeadlineHe(closesAt: Date): string {
  return new Intl.DateTimeFormat("he-IL", { timeZone: "Asia/Jerusalem", weekday: "long", hour: "2-digit", minute: "2-digit" }).format(closesAt);
}

function registerResultMessageHe(status: string): string {
  switch (status) {
    case "already-registered":
      return "כבר נרשמת לליגה זו";
    case "ineligible":
      return "אינך עומד בדרישות הליגה";
    case "registration-closed":
      return "ההרשמה נסגרה";
    case "champions-league-not-registerable":
      return "לא ניתן להירשם ידנית לליגת האלופים";
    case "league-not-active-this-week":
      return "הליגה אינה פעילה השבוע";
    default:
      return "לא ניתן להירשם כרגע";
  }
}

// GYMS & LEAGUES PHASE 9 — the /leagues page body (sections 11-26). Every
// number/label below is read straight off Phase 5/8's own view services
// (league-view.service.ts) and Phase 9's own new bracket-view/reward-
// registry data — nothing here recomputes eligibility, the 4-week rotation,
// a match's status, or a reward amount itself.
export function LeaguesContent({ overview, achievements, brackets, championDisplayNames }: LeaguesContentProps) {
  const [isPending, startTransition] = useTransition();
  const [statusByLeague, setStatusByLeague] = useState<Record<string, { registered: boolean; message: string | null }>>({});
  const [expandedLeagueId, setExpandedLeagueId] = useState<LeagueId | null>(null);

  function handleRegister(leagueId: LeagueId) {
    if (isPending) return;
    startTransition(async () => {
      const result = await registerForLeagueAction(leagueId);
      if (result.status === "registered" || result.status === "already-registered") {
        setStatusByLeague((current) => ({ ...current, [leagueId]: { registered: true, message: null } }));
      } else {
        setStatusByLeague((current) => ({ ...current, [leagueId]: { registered: false, message: registerResultMessageHe(result.status) } }));
      }
    });
  }

  function toggleExpanded(leagueId: LeagueId) {
    setExpandedLeagueId((current) => (current === leagueId ? null : leagueId));
  }

  return (
    <div dir="rtl" className="relative h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950/40 to-slate-950">
      <div className="relative mx-auto flex max-w-4xl flex-col gap-4 p-4 sm:p-6 lg:p-8">
        <BackButton />

        <div>
          <h1 className="text-lg font-bold text-slate-100">ליגות</h1>
          <p className="mt-1 text-sm text-slate-400">שלוש ליגות אזוריות וליגת אלופים אחת — מחזור בן 4 שבועות</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 text-xs text-slate-300">
          שבוע {overview.cycle.weekIndexInCycle + 1} מתוך 4 במחזור הנוכחי · הליגה הפעילה השבוע:{" "}
          <span className="font-semibold text-indigo-300">{CYCLE_WEEK_LABELS[overview.cycle.weekIndexInCycle]}</span>
        </div>

        <div className="flex flex-col gap-3">
          {overview.regionalLeagues.map((league) => (
            <RegionalLeagueCard
              key={league.leagueId}
              league={league}
              isPending={isPending}
              override={statusByLeague[league.leagueId]}
              onRegister={() => handleRegister(league.leagueId)}
              championName={league.currentChampionPlayerId ? championDisplayNames[league.currentChampionPlayerId] ?? null : null}
              bracket={brackets[league.leagueId]}
              isExpanded={expandedLeagueId === league.leagueId}
              onToggle={() => toggleExpanded(league.leagueId)}
            />
          ))}

          <ChampionsLeagueCard
            overview={overview}
            championName={overview.championsLeague.currentChampionPlayerId ? championDisplayNames[overview.championsLeague.currentChampionPlayerId] ?? null : null}
            bracket={brackets["champions-league"]}
            isExpanded={expandedLeagueId === "champions-league"}
            onToggle={() => toggleExpanded("champions-league")}
          />
        </div>

        <AchievementHistory achievements={achievements} />
      </div>
    </div>
  );
}

interface RegionalLeagueCardProps {
  league: RegionalLeagueView;
  isPending: boolean;
  override?: { registered: boolean; message: string | null };
  onRegister: () => void;
  championName: string | null;
  bracket: LeagueTournamentBracketView | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function RegionalLeagueCard({ league, isPending, override, onRegister, championName, bracket, isExpanded, onToggle }: RegionalLeagueCardProps) {
  const registered = override?.registered ?? league.registered;
  const canRegister = league.eligible && league.registrationOpen && !registered;

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-100">{league.displayName}</p>
        <span className={`text-xs ${league.eligible ? "text-emerald-400" : "text-slate-500"}`}>
          {league.eligible ? "זכאי" : `לא זכאי (${league.badgeCount}/${league.requiredBadgeCount} עיטורים, ${league.regionalChampionCount}/${league.requiredRegionalChampionCount} אלופים)`}
        </span>
      </div>

      <p className="mt-1 text-xs text-slate-400">
        {!league.activeThisWeek
          ? "הליגה אינה פעילה השבוע"
          : league.registrationOpen
            ? `ההרשמה פתוחה · מועד סגירה: ${registrationDeadlineHe(league.registrationClosesAt)}`
            : "ההרשמה נסגרה"}
      </p>

      <CurrentChampionLine championName={championName} />

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-400">{registered ? "נרשמת לליגה" : "טרם נרשמת"}</span>

        {canRegister ? (
          <button
            type="button"
            disabled={isPending}
            onClick={onRegister}
            className="rounded-md bg-indigo-600 px-3 py-1 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            הרשמה לליגה
          </button>
        ) : null}
      </div>

      {override?.message ? (
        <p role="alert" className="mt-1 text-xs text-red-300">
          {override.message}
        </p>
      ) : null}

      <RewardPreviewSection leagueId={league.leagueId} />
      <BracketSection bracket={bracket} isExpanded={isExpanded} onToggle={onToggle} />
    </div>
  );
}

interface ChampionsLeagueCardProps {
  overview: LeaguesOverviewView;
  championName: string | null;
  bracket: LeagueTournamentBracketView | null;
  isExpanded: boolean;
  onToggle: () => void;
}

function ChampionsLeagueCard({ overview, championName, bracket, isExpanded, onToggle }: ChampionsLeagueCardProps) {
  const champions = overview.championsLeague;

  return (
    <div className="rounded-xl border border-amber-400/20 bg-amber-950/10 p-4">
      <p className="text-sm font-semibold text-amber-200">{champions.displayName}</p>
      <p className="mt-1 text-xs text-slate-400">{CHAMPIONS_LEAGUE_NOTICE}</p>
      <p className="mt-1 text-xs text-slate-500">
        {champions.hasDuplicateQualifier
          ? DUPLICATE_QUALIFIER_MESSAGE
          : champions.tournamentCreated
            ? "טורניר ליגת האלופים נוצר"
            : champions.qualifiersReady
              ? "המעפילים מוכנים"
              : "ממתין להשלמת הליגות האזוריות"}
      </p>
      {!champions.activeThisWeek ? <p className="mt-1 text-xs text-slate-500">הליגה אינה פעילה השבוע</p> : null}

      <CurrentChampionLine championName={championName} />

      <RewardPreviewSection leagueId="champions-league" />
      <BracketSection bracket={bracket} isExpanded={isExpanded} onToggle={onToggle} />
    </div>
  );
}

function CurrentChampionLine({ championName }: { championName: string | null }) {
  if (!championName) {
    return <p className="mt-1 text-xs text-slate-600">אין אלוף נוכחי עדיין</p>;
  }
  return (
    <p className="mt-1 text-xs text-amber-300">
      <span aria-hidden="true">🏆</span> אלוף נוכחי: {championName}
    </p>
  );
}

// GYMS & LEAGUES PHASE 9 (section 22) — reward preview, reading Phase 8's
// own registry EXACTLY. REWARD EXCLUSIVITY (section 15) communicated
// explicitly: Top 3 = placement reward ONLY, everyone else = participation
// reward ONLY — never implying a player could receive both.
function RewardPreviewSection({ leagueId }: { leagueId: LeagueId }) {
  const [open, setOpen] = useState(false);
  const places = [1, 2, 3] as const;
  const participation = getLeagueParticipationRewardDefinition(leagueId);

  return (
    <div className="mt-3 border-t border-white/5 pt-2">
      <button type="button" onClick={() => setOpen((current) => !current)} className="text-xs font-semibold text-slate-300 underline-offset-2 hover:underline">
        {open ? "הסתר פרסים" : "הצג פרסים"}
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-2 text-xs">
          {places.map((place) => {
            const reward = getLeaguePlacementRewardDefinition(leagueId, place);
            return (
              <div key={place} className="rounded-lg border border-white/5 bg-slate-950/40 p-2">
                <p className="font-semibold text-slate-200">
                  {place === 1 ? "🥇 מקום ראשון" : place === 2 ? "🥈 מקום שני" : "🥉 מקום שלישי"} — {reward.achievementLabel}
                </p>
                <p className="mt-0.5 text-slate-400">
                  {reward.money.toLocaleString("he-IL")} כסף · {reward.xpPercentOfNextLevel}% ניסיון · {reward.gold.toLocaleString("he-IL")} זהב
                  {reward.chestRewards.length > 0
                    ? ` · ${reward.chestRewards.map((chest) => `${getChestDefinition(chest.chestTypeId).displayName} x${chest.quantity}`).join(", ")}`
                    : ""}
                </p>
              </div>
            );
          })}
          <div className="rounded-lg border border-white/5 bg-slate-950/40 p-2">
            <p className="font-semibold text-slate-200">פרס השתתפות (מחוץ ל-3 המקומות הראשונים בלבד)</p>
            <p className="mt-0.5 text-slate-400">
              {participation.money.toLocaleString("he-IL")} כסף
              {participation.eggRewards.length > 0
                ? ` · ${participation.eggRewards.map((egg) => `${getEggDefinition(egg.rarity).displayName} x${egg.quantity}`).join(", ")}`
                : ""}
            </p>
          </div>
          <p className="text-[11px] text-slate-500">שחקן מקבל פרס מקום בלבד אם סיים בין 3 המקומות הראשונים, אחרת פרס השתתפות בלבד — לעולם לא שניהם.</p>
        </div>
      ) : null}
    </div>
  );
}

// GYMS & LEAGUES PHASE 9 (sections 15-20) — generic tournament bracket,
// variable round count, entirely driven by league-bracket-view.service.ts's
// own already-resolved rounds/placements — no round count, label, or
// participant name is ever decided here.
function BracketSection({ bracket, isExpanded, onToggle }: { bracket: LeagueTournamentBracketView | null; isExpanded: boolean; onToggle: () => void }) {
  if (!bracket) {
    return <p className="mt-2 text-[11px] text-slate-600">אין טורניר פעיל כרגע</p>;
  }

  return (
    <div className="mt-2 border-t border-white/5 pt-2">
      <button type="button" onClick={onToggle} aria-expanded={isExpanded} className="text-xs font-semibold text-slate-300 underline-offset-2 hover:underline">
        {isExpanded ? "הסתר טבלת טורניר" : "הצג טבלת טורניר"}
      </button>

      {isExpanded ? (
        <div className="mt-2 flex flex-col gap-3">
          {bracket.placements.length > 0 ? (
            <div className="rounded-lg border border-amber-400/20 bg-amber-950/10 p-2 text-xs">
              <p className="mb-1 font-semibold text-amber-200">תוצאות סופיות</p>
              {bracket.placements.map((placement) => (
                <p key={placement.place} className={placement.isViewer ? "font-semibold text-amber-200" : "text-slate-300"}>
                  {placement.place === 1 ? "🥇" : placement.place === 2 ? "🥈" : "🥉"} {placement.playerName}
                </p>
              ))}
            </div>
          ) : null}

          {bracket.rounds.length === 0 ? (
            <p className="text-[11px] text-slate-600">הסיבוב הראשון עדיין לא נוצר</p>
          ) : (
            bracket.rounds.map((round) => (
              <div key={round.roundNumber}>
                <p className="mb-1 text-[11px] font-semibold text-slate-400">{round.roundLabel}</p>
                <div className="flex flex-col gap-1.5">
                  {round.matches.map((match) => (
                    <MatchCard key={match.matchId} match={match} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

function MatchCard({ match }: { match: LeagueTournamentBracketView["rounds"][number]["matches"][number] }) {
  const isSelfInvolved = match.participantAIsViewer || match.participantBIsViewer;

  return (
    <div className={`rounded-lg border p-2 text-xs ${isSelfInvolved ? "border-indigo-400/30 bg-indigo-950/20" : "border-white/5 bg-slate-950/40"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className={match.winnerIsParticipantA === true ? "font-semibold text-emerald-300" : "text-slate-200"}>
          {match.participantAName}
          {match.participantAIsComputer ? <span className="text-slate-500"> (מחשב)</span> : null}
        </span>
        <span className="text-slate-500">נגד</span>
        <span className={match.winnerIsParticipantA === false ? "font-semibold text-emerald-300" : "text-slate-200"}>
          {match.participantBName}
          {match.participantBIsComputer ? <span className="text-slate-500"> (מחשב)</span> : null}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
        <span>{match.scheduledAtLabel}</span>
        <span>{leagueMatchStatusLabelHe(match.displayStatus)}</span>
      </div>
      {match.resolutionReasonLabel ? <p className="mt-0.5 text-[11px] text-slate-500">{match.resolutionReasonLabel}</p> : null}
      {match.canEnter ? (
        <a
          href={`/leagues/match/${match.matchId}`}
          className="mt-1.5 inline-block rounded-md bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-indigo-500"
        >
          כניסה לקרב
        </a>
      ) : null}
    </div>
  );
}

// GYMS & LEAGUES PHASE 9 (sections 22/23) — the viewer's OWN full Trophy/
// Medal history, one row per LeagueTournamentPlacement the player has ever
// earned — never collapsed into a single boolean, and a player who won the
// same League across multiple cycles sees every one of those rows here.
function AchievementHistory({ achievements }: { achievements: readonly LeaguePlayerAchievement[] }) {
  if (achievements.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
        <h2 className="text-sm font-semibold text-slate-100">גביעים ומדליות</h2>
        <p className="mt-1 text-xs text-slate-500">עדיין לא זכית בגביע או מדליה בליגות</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4">
      <h2 className="text-sm font-semibold text-slate-100">גביעים ומדליות</h2>
      <div className="mt-2 flex flex-col gap-2">
        {[...achievements].reverse().map((achievement) => (
          <div key={`${achievement.tournamentId}-${achievement.place}`} className="flex items-center gap-3 rounded-lg border border-white/5 bg-slate-950/40 p-2">
            <SpriteImage
              src={achievement.achievementImageUrl}
              alt={achievement.achievementLabel}
              className="h-9 w-9 object-contain"
              fallbackClassName="flex h-9 w-9 items-center justify-center rounded-lg border border-dashed border-white/20 bg-slate-800/60 text-slate-500"
            />
            <div className="flex-1 text-xs">
              <p className="font-semibold text-slate-100">{achievement.achievementLabel}</p>
              <p className="text-slate-500">
                {achievement.leagueId} · {achievement.weekKey}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
