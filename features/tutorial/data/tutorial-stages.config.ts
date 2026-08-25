import type {
  ReplayProgressView,
  TutorialCompletionSignal,
  TutorialPanelCopy,
  TutorialStageDefinition,
  TutorialTarget,
  TutorialProgressView,
} from "@/features/tutorial/types/tutorial.types";

// GAME TUTORIAL — CENTRAL STAGE REGISTRY (Phase 0). The one place every
// stage's id/order/copy/completion rule is declared — every server query,
// every client panel, and Home's own progress bar all read from this same
// array, never a scattered "if (stage === N)" anywhere else in the
// codebase (this feature's own explicit anti-pattern to avoid). Adding a
// future stage (e.g. Trading) is exactly one new entry here, plus — only if
// it needs a real detected action — a later phase's own small integration
// point in that feature; never a change to this file's neighbors.
//
// PHASE 0: every stage's completion is "explanation-only" — clicking the
// panel's own CTA always just advances to the next stage. PHASE 1 gates
// most stages on a real target instead (see tutorial.types.ts's own
// TutorialStageCompletion doc comment) — still a pure data edit to this
// array, never a rewrite of the components that render it. A later phase
// still changes specific stages' `completion` to gate on a real
// gameplay-mutating event (heal/purchase/capture/...) or extends the
// scripted Field Battle stage's own multi-step sequence — same "data
// change only" rule.
//
// GUIDE CHARACTER IMAGES — Professor Oak artwork (public/images/tutorial/)
// attached directly to the relevant stage's own panelCopy below, never a
// separate lookup table keyed by stage id: panelCopy is already the one
// place TutorialPanel reads its "what to show right now" copy from (see
// TutorialPanelCopy.guideImage's own doc comment, tutorial.types.ts). Four
// checkpoints:
//   Oak1 — Tutorial opening: welcome's own lead-in, the very first panel
//     ever shown.
//   Oak2 — after the Tutorial Pidgey is captured: capture-pidgey is
//     field-battle's LAST step, with no wrapUpPanelCopy/explainAfter of its
//     own, so the stage silently advances the instant it completes (see
//     completeActiveTarget, tutorial-context.tsx) straight into
//     pokemon-center — whose own explainAfterEntry (see that flag's own
//     doc comment, tutorial.types.ts) means this panel (and Oak2 with it)
//     actually shows once the player navigates there themselves, not
//     before.
//   Oak3 — mid-tutorial, between Hatchery and Gyms: gyms' own panelCopy is
//     exactly the explanation shown once the player navigates there,
//     immediately after finishing Hatchery.
//   Oak4 — the final completion/reward panel: completion's own lead-in,
//     which is also its reward-claim panel.
// Replay reuses these unchanged — getReplayExplainingPanelDisplay only ever
// returns these SAME registry panelCopy objects (see that function's own doc
// comment), so the same images appear at the same checkpoints during replay,
// with no separate replay-only image list to keep in sync.
const TUTORIAL_GUIDE_IMAGE_OPENING = "/images/tutorial/Oak1.png";
const TUTORIAL_GUIDE_IMAGE_AFTER_CAPTURE = "/images/tutorial/Oak2.png";
const TUTORIAL_GUIDE_IMAGE_MID_TUTORIAL = "/images/tutorial/Oak3.png";
const TUTORIAL_GUIDE_IMAGE_COMPLETION = "/images/tutorial/Oak4.png";

// GAME TUTORIAL — FINAL HEBREW COPY. Every panelCopy/wrapUpPanelCopy/
// explainAfter title/body/ctaLabel and every target's own `guidance` below
// carries the final, product-approved Hebrew copy — a pure text swap over
// the identical stage/completion/target/signal/skipInReplay structure this
// registry already had; no id, order, canPostpone, completion kind, target
// id, signal, or guideImage changed. Bodies that read as several paragraphs
// (or a short list, e.g. the reward lines) use literal "\n\n"/"\n" inside
// the string — TutorialPanel's own body <p> renders with
// `whitespace-pre-line` specifically so these breaks actually show, rather
// than collapsing into one run-on paragraph like plain HTML normally would.
export const TUTORIAL_STAGES: readonly TutorialStageDefinition[] = [
  {
    id: "welcome",
    order: 0,
    canPostpone: false,
    completion: { kind: "explanation-only" },
    panelCopy: {
      title: "ברוך הבא לעולם הפוקימונים!",
      body:
        "אני פרופסור אוק, ואני אלווה אותך בצעדים הראשונים שלך.\n\n" +
        "במהלך המסע תצא לקרבות שדה, תתפוס פוקימונים נדירים ותבנה שישייה חזקה משלך. " +
        "בהמשך תתמודד במכונים ותגיע לליגות, שם מחכים לך קרבות מול שחקנים אחרים.\n\n" +
        "סיים את הכרת המשחק ותקבל:\n" +
        "🥚 ביצה נדירה מאוד ממחוז סינו\n" +
        "💰 2,000 כסף\n" +
        "🪙 40 זהב",
      ctaLabel: "התחל את הכרת המשחק",
      guideImage: TUTORIAL_GUIDE_IMAGE_OPENING,
    },
  },
  {
    id: "home-sidebar",
    order: 1,
    canPostpone: true,
    completion: {
      kind: "single",
      target: { targetId: "sidebar-opener", guidance: "לחץ על החץ בצד ימין כדי לפתוח את סרגל הניווט." },
      signal: { kind: "action", actionId: "sidebar-opened" },
    },
    panelCopy: {
      title: "מכאן מתחיל המסע שלך",
      body:
        "זהו המסך הראשי שלך. כאן תוכל לראות מידע חשוב ולהמשיך את המסע שלך.\n\n" +
        "בצד ימין נמצא סרגל הניווט, וממנו תוכל להגיע לכל המקומות החשובים במשחק.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "my-pokemon",
    order: 2,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to My
    // Pokémon FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 ("open-my-pokemon") the instant they
    // arrive, BEFORE being asked to open the Starter's own details.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-my-pokemon",
          target: { targetId: "sidebar-team", guidance: "לחץ על \"הפוקימונים שלי\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/my-pokemon" },
        },
        {
          id: "open-starter-details",
          target: {
            targetId: "my-pokemon-party-section",
            guidance: "עכשיו לחץ על הפוקימון הראשון שלך כדי להכיר אותו מקרוב.",
          },
          signal: { kind: "action", actionId: "starter-details-opened" },
        },
      ],
      // MY POKÉMON — the ORIGINAL spec's own "explain briefly: level, XP,
      // HP, stats, moves" only makes sense once the Starter's details panel
      // is actually open — never before, since there's nothing to point at
      // yet — so this is genuinely a SECOND panel, not a duplicate of the
      // stage's own lead-in above (which only covers party MANAGEMENT, not
      // one Pokémon's own stats).
      wrapUpPanelCopy: {
        title: "הכירו טוב יותר",
        body:
          "כאן תוכל לראות את הרמה של הפוקימון, הניסיון שצבר, החיים שלו, הנתונים שלו והמתקפות שהוא מכיר.\n\n" +
          "ככל שתתקדם במשחק, הפוקימונים שלך יתחזקו וילמדו מתקפות חדשות.",
        ctaLabel: "המשך",
      },
    },
    panelCopy: {
      title: "הפוקימונים שלי",
      body:
        "כאן נמצאים כל הפוקימונים שלך.\n\n" +
        "השישייה הפעילה שלך יכולה להכיל עד 6 פוקימונים, ושאר הפוקימונים נשמרים במאגר. " +
        "מכאן תוכל להוסיף ולהסיר פוקימונים מהשישייה ולבנות את ההרכב שמתאים לך.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "map",
    order: 3,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the Map
    // FIRST; this stage's own panelCopy below then shows as the implicit
    // explanation for step 0 ("open-map") the instant they arrive, BEFORE
    // being guided to Grassland.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-map",
          target: { targetId: "sidebar-map", guidance: "לחץ על \"מפה\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/map" },
        },
        {
          id: "enter-grassland",
          // PHASE 5 — REPLAY. skipInReplay: true — after the Tutorial is
          // complete, entering Grassland for real would start a normal,
          // RNG wild encounter (the deterministic session only ever forces
          // while the REAL stage is genuinely "field-battle" — see
          // battle-view.service.ts's own forceTutorialEncounter check),
          // which is exactly the kind of unrelated real gameplay/account
          // change replay must never trigger.
          target: {
            targetId: "zone-grassland",
            guidance: "לחץ על אזור הדשא במפה.",
            skipInReplay: true,
          },
          // No wrapUpPanelCopy — entering the zone navigates straight into
          // /battle, and the next registry stage (field-battle) already
          // shows its own explanation the instant this stage advances, so
          // a separate wrap-up panel here would just repeat that.
          signal: { kind: "navigate", expectedPathname: "/battle" },
        },
      ],
    },
    panelCopy: {
      title: "יוצאים לשטח!",
      body:
        "במפה נמצאים האזורים שבהם תפגוש פוקימונים פראיים.\n\n" +
        "בכל אזור מחכים לך פוקימונים שונים, אז כדאי לחקור ולגלות מי מסתתר בכל מקום.\n\n" +
        "בוא נתחיל באזור הדשא!",
      ctaLabel: "בצע",
    },
  },
  {
    id: "field-battle",
    order: 4,
    canPostpone: true,
    // PHASE 3 — SCRIPTED PIDGEY BATTLE. Three real steps against the
    // deterministic Tutorial Pidgey encounter (battle-session.service.ts's
    // own getOrStartBattle, forced only while this exact stage is active —
    // see that function's own doc comment): a real attack, opening the
    // real Bag, and a real (guaranteed) capture. No wrapUpPanelCopy — the
    // capture succeeding is itself the confirmation the player needs;
    // advances straight to the Pokémon Center stage, same "no extra panel
    // needed" pattern the Map stage's own last step already establishes.
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "perform-attack",
          // PHASE 5 — REPLAY. skipInReplay: true — every step of this
          // stage is: the deterministic Tutorial Pidgey session no longer
          // exists once the Tutorial is complete (a fresh Grassland entry
          // during replay is skipped one level up, at the Map stage's own
          // "enter-grassland" step), so there is never a real battle here
          // to attack in, let alone guarantee-capture a second Pidgey.
          target: {
            targetId: "battle-scene",
            guidance: "בחר מתקפה ותקוף את Pidgey.",
            skipInReplay: true,
          },
          // Reported only after the REAL executeBattleActionAction result
          // confirms success (see BattleContent.tsx's own integration
          // point) — never a bare click.
          signal: { kind: "action", actionId: "battle-attack-performed" },
          // EXPLAIN CAPTURE CHANCE + SWITCHING (this task's own required
          // beats, shown together in one panel right after the real
          // attack lands, before the Bag is required) — explaining
          // switching only, never requiring it, per this task's own rule.
          explainAfter: {
            title: "עכשיו הסיכוי שלך טוב יותר!",
            body:
              "ככל שלפוקימון פראי נשארים פחות חיים, כך קל יותר לתפוס אותו — רק תיזהר לא להביס אותו.\n\n" +
              "כשיהיו לך כמה פוקימונים בשישייה, תוכל גם להחליף ביניהם במהלך הקרב.",
            ctaLabel: "המשך",
          },
        },
        {
          id: "open-bag",
          // PHASE 5 — REPLAY. skipInReplay: true — same reasoning as
          // perform-attack above (no real Tutorial battle exists to open
          // the Bag in during replay).
          target: {
            targetId: "battle-scene",
            guidance: "פתח את התיק שלך במהלך הקרב.",
            skipInReplay: true,
          },
          signal: { kind: "action", actionId: "battle-bag-opened" },
        },
        {
          id: "capture-pidgey",
          // PHASE 5 — REPLAY. skipInReplay: true — this task's own
          // explicit "no guaranteed Pidgey capture / no Pidgey grant"
          // rule: replay must never create a second guaranteed-capture
          // opportunity (closed server-side too — capture.service.ts's
          // guaranteed branch only ever fires for session.
          // isTutorialEncounter, which getBattleViewData only ever sets
          // once, before pidgeyCaptured — see that function's own doc
          // comment).
          target: {
            targetId: "battle-scene",
            guidance: "בחר Poké Ball ונסה לתפוס את Pidgey!",
            skipInReplay: true,
          },
          // Reported only after the REAL attemptCaptureAction result
          // confirms status "captured" — and, server-side, only ever
          // persisted once PlayerTutorialProgress.pidgeyCaptured is
          // already true (advanceTutorialSubStep's own guard,
          // tutorial-progress.service.ts) — never a bare client event for
          // this specific step, since it grants a permanent Pokémon.
          signal: { kind: "action", actionId: "pidgey-captured" },
        },
      ],
    },
    panelCopy: {
      title: "הקרב הראשון שלך!",
      body:
        "הנה Pidgey פראי!\n\n" +
        "בקרב תוכל לבחור מתקפות, להשתמש בפריטים ולנסות לתפוס את הפוקימון שמולך.\n\n" +
        "נתחיל בתקיפה.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "pokemon-center",
    order: 5,
    canPostpone: true,
    // PHASE 2 — REAL ACTIONS. Two real steps: reach the screen, then
    // actually heal the Starter — never just "opened the screen" (this
    // task's own explicit requirement). No wrapUpPanelCopy — the heal
    // succeeding is itself the confirmation the player needs; advances
    // straight to the next stage, same "no extra panel needed" pattern
    // Map's own last step already establishes.
    //
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the
    // Pokémon Center FIRST; this stage's own panelCopy below then shows as
    // the implicit explanation for step 0 ("open-pokemon-center") the
    // instant they arrive, BEFORE being asked to actually heal.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-pokemon-center",
          target: { targetId: "sidebar-pokemon-center", guidance: "היכנס ל\"מרכז הפוקימונים\" דרך סרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/pokemon-center" },
        },
        {
          id: "heal-starter",
          // PHASE 5 — REPLAY. skipInReplay: true — this task's own
          // explicit "no forced healing" rule.
          target: {
            targetId: "pokemon-center-heal-flow",
            guidance: "בחר את הפוקימון הראשון שלך שנפגע בקרב ולחץ על \"רפא\".",
            skipInReplay: true,
          },
          // Reported only after the REAL healPartyAction result confirms
          // success AND includes the Starter's own id (see
          // PokemonCenterContent.tsx's own integration point) — never a
          // bare "clicked heal" client event.
          signal: { kind: "action", actionId: "pokemon-healed" },
        },
      ],
    },
    panelCopy: {
      title: "כל הכבוד!",
      body:
        "תפסת את Pidgey הראשון שלך והוא עכשיו חלק מהשישייה שלך!\n\n" +
        "אבל קרבות גם פוגעים בפוקימונים שלך. במרכז הפוקימונים אפשר לרפא פוקימון אחד או את כל השישייה, " +
        "וגם להחזיר לחיים פוקימון שהובס.\n\n" +
        "בוא נטפל בפוקימון שנפגע בקרב.",
      ctaLabel: "בצע",
      guideImage: TUTORIAL_GUIDE_IMAGE_AFTER_CAPTURE,
    },
  },
  {
    id: "shop",
    order: 6,
    canPostpone: true,
    // PHASE 2 — REAL ACTIONS. Two real steps: reach the screen, then
    // actually buy exactly one normal Poké Ball at its real 100-money
    // price — never just "opened the screen". No wrapUpPanelCopy — same
    // "the real success is itself the confirmation" reasoning as the
    // Pokémon Center stage above.
    //
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the
    // Shop FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 ("open-shop") the instant they
    // arrive, BEFORE being asked to actually buy anything.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-shop",
          target: { targetId: "sidebar-shop", guidance: "לחץ על \"חנות\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/shop" },
        },
        {
          id: "buy-poke-ball",
          // PHASE 5 — REPLAY. skipInReplay: true — this task's own
          // explicit "no Poké Ball purchase / 100 Money deduction" rule.
          target: {
            targetId: "shop-purchase-flow",
            guidance: "קנה Poké Ball רגיל אחד ב-100 כסף.",
            skipInReplay: true,
          },
          // Reported only after the REAL purchaseShopItemAction result
          // confirms a success for exactly item "poke-ball", quantity 1,
          // totalPrice 100, currency "money" (see ShopContent.tsx's own
          // integration point) — never a bare "clicked buy" client event.
          signal: { kind: "action", actionId: "poke-ball-purchased" },
        },
      ],
    },
    panelCopy: {
      title: "הגיע הזמן להכיר את החנות",
      body:
        "בחנות תמצא Poké Balls, שיקויים, אבני התפתחות, ביצים, אינקובטורים ותיבות.\n\n" +
        "חלק מהפריטים עולים כסף וחלקם זהב. יש פריטים שאפשר למצוא גם במהלך המשחק, ואחרים זמינים רק בחנות.\n\n" +
        "בוא נקנה Poké Ball אחד.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "inventory",
    order: 7,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the
    // Inventory FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 (its only step) the instant they
    // arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-inventory",
          target: { targetId: "sidebar-inventory", guidance: "לחץ על \"תיק חפצים\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/inventory" },
        },
      ],
    },
    panelCopy: {
      title: "התיק שלך",
      body:
        "כל הפריטים שאתה קונה או מוצא נשמרים כאן, מסודרים לפי קטגוריות.\n\n" +
        "מהתיק אפשר גם למכור פריטים, לפתוח תיבות ולהשתמש בפריטים מתאימים. " +
        "ביצים ואינקובטורים נשמרים כאן, אבל את ההדגרה עצמה מבצעים במדגרה.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "daycare",
    order: 8,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the
    // Daycare FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 (its only step) the instant they
    // arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-daycare",
          target: { targetId: "sidebar-daycare", guidance: "לחץ על \"מעון פוקימונים\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/daycare" },
        },
      ],
    },
    panelCopy: {
      title: "מעון הפוקימונים",
      body:
        "במעון אפשר להשאיר פוקימונים כדי שיתקדמו בזמן שאתה ממשיך לשחק.\n\n" +
        "פוקימון יכול לעלות עד 10 רמות בכל שהייה, ובאיסוף משלמים את עלות הטיפול שנצברה.\n\n" +
        "אם הוא הגיע להתפתחות או למתקפה חדשה, תוכל לטפל בהחלטות האלה מיד לאחר האיסוף.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "hatchery",
    order: 9,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to the
    // Hatchery FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 (its only step) the instant they
    // arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-hatchery",
          target: { targetId: "sidebar-hatchery", guidance: "לחץ על \"מדגרה\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/hatchery" },
        },
      ],
    },
    panelCopy: {
      title: "המדגרה",
      body:
        "כאן מחברים ביצה לאינקובטור ומתחילים את תהליך הבקיעה.\n\n" +
        "ההתקדמות נקבעת לפי מספר הקרבות שתבצע, ולא לפי זמן. סוג הביצה והאינקובטור משפיעים על מספר הקרבות הדרוש.\n\n" +
        "אפשר להפעיל כמה אינקובטורים במקביל, כל עוד יש לך אינקובטורים זמינים.\n\n" +
        "ביצה שמצאת בקרב שייכת למחוז שבו נמצאה, והפוקימונים שיכולים לבקוע ממנה תלויים במחוז ובנדירות שלה.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "gyms",
    order: 10,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to Gyms
    // FIRST; this stage's own panelCopy below then shows as the implicit
    // explanation for step 0 (its only step) the instant they arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-gyms",
          target: { targetId: "sidebar-gyms", guidance: "לחץ על \"מכונים\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/gyms" },
        },
      ],
    },
    panelCopy: {
      title: "עכשיו מתחיל האתגר האמיתי",
      body:
        "אתה כבר יודע איך לתפוס פוקימונים ולטפל בהם. עכשיו הגיע הזמן לראות בשביל מה בנית את השישייה שלך!\n\n" +
        "בכל מחוז יש 3 מכונים. נצח את המאמנים ואת מנהיג המכון כדי להשיג תג.\n\n" +
        "אחרי שתשיג את שלושת התגים, תוכל להתמודד מול מנהל המחוז ולהתקדם לעבר הליגות.",
      ctaLabel: "בצע",
      guideImage: TUTORIAL_GUIDE_IMAGE_MID_TUTORIAL,
    },
  },
  {
    id: "leagues",
    order: 11,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to Leagues
    // FIRST; this stage's own panelCopy below then shows as the implicit
    // explanation for step 0 (its only step) the instant they arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-leagues",
          target: { targetId: "sidebar-leagues", guidance: "לחץ על \"ליגות\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/leagues" },
        },
      ],
    },
    panelCopy: {
      title: "הליגות",
      body:
        "כאן תוכל להוכיח כמה השישייה שלך באמת חזקה בקרבות נוקאאוט מול שחקנים אחרים.\n\n" +
        "ליגה 1 דורשת השלמת קנטו, ג'וטו והואן.\n" +
        "ליגה 2 דורשת השלמת סינו, יונובה וקאלוס.\n" +
        "ליגה 3 דורשת השלמת אלולה, גלאר ופלדאה.\n\n" +
        "את דרישות המחוזות צריך להשלים רק פעם אחת.\n\n" +
        "ההרשמה נסגרת ביום חמישי ב-18:30 והקרבות מתחילים ב-19:00.\n\n" +
        "שלושת אלופי הליגות והמקום השני בליגה 3 עולים לליגת האלופים.\n\n" +
        "וזכור — גם אם הפכת לאלוף, בחודש הבא תצטרך לחזור ולהילחם כדי לשמור על התואר!",
      ctaLabel: "בצע",
    },
  },
  {
    id: "regions",
    order: 12,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to Regions
    // FIRST; this stage's own panelCopy below then shows as the implicit
    // explanation for step 0 (its only step) the instant they arrive.
    explainAfterEntry: true,
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-regions",
          target: { targetId: "sidebar-world", guidance: "לחץ על \"מחוזות\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/world" },
        },
      ],
    },
    panelCopy: {
      title: "עולם שלם מחכה לך",
      body:
        "במשחק יש 9 מחוזות, ולכל אחד מפה משלו, פוקימונים שונים, מכונים ומנהל מחוז.\n\n" +
        "כל המחוזות זמינים לך מההתחלה. מעבר בין מחוזות עולה כסף, והמחיר תמיד מוצג לפני שתצא לדרך.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "profile",
    order: 13,
    canPostpone: true,
    // NAVIGATION ORDER — see TutorialStageDefinition.explainAfterEntry's
    // own doc comment (tutorial.types.ts): the player navigates to their
    // Profile FIRST; this stage's own panelCopy below then shows as the
    // implicit explanation for step 0 (its only step) the instant they
    // arrive.
    explainAfterEntry: true,
    // "/profile" (not the full "/profile/[username]") — profile's own real
    // route is dynamic, and the pathname check this drives is a prefix
    // match (see tutorial-context.tsx's own navigate-signal watcher).
    completion: {
      kind: "multi-step",
      steps: [
        {
          id: "open-profile",
          target: { targetId: "sidebar-profile", guidance: "לחץ על \"פרופיל\" בסרגל הניווט." },
          signal: { kind: "navigate", expectedPathname: "/profile" },
        },
      ],
    },
    panelCopy: {
      title: "הפרופיל שלך",
      body:
        "זה המקום שמציג את ההתקדמות שלך לעולם.\n\n" +
        "כאן תראה את הרמה שלך, הניסיון, הכסף והזהב, ותוכל לערוך את הפרופיל.\n\n" +
        "התגים, המדליות והגביעים שתשיג יוצגו כאן לראווה. אפשר גם להיכנס לפרופילים של שחקנים אחרים " +
        "דרך השם שלהם או באמצעות חיפוש.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "friends",
    order: 14,
    canPostpone: true,
    // FRIENDS/SOCIAL AREA — the friends bar/chat dock is already visible on
    // every route (no navigation possible or required — spec: "do not
    // require another player to exist or interact"), so this only spotlights
    // it; the minimized banner's own confirm button is what actually
    // advances, not any detected real event.
    completion: {
      kind: "single",
      target: { targetId: "friends-bar", guidance: "הכר את אזור החברים והצ'אט שבתחתית המסך." },
      signal: { kind: "manual" },
    },
    panelCopy: {
      title: "לא חייבים לצאת למסע לבד",
      body:
        "בסרגל החברים תוכל לראות את החברים שלך ומי מהם מחובר.\n\n" +
        "אפשר למצוא שחקנים אחרים, להיכנס לפרופיל שלהם ולשלוח משם בקשת חברות.\n\n" +
        "בצ'אט הראשי אפשר לדבר עם שחקנים במשחק, ועם חברים אפשר גם לפתוח שיחה פרטית.",
      ctaLabel: "בצע",
    },
  },
  {
    id: "completion",
    order: 15,
    canPostpone: true,
    // PHASE 4 — COMPLETION REWARD. Still "explanation-only" at the
    // TutorialStageCompletion type level (there is no real navigate/action
    // target to spotlight here) — the claim button's own special handling
    // is a narrow, id-keyed case in getExplainingPanelDisplay below, same
    // "small, targeted business rule" precedent Phase 3's own
    // capture-pidgey guard already establishes, rather than a new
    // completion kind for this one stage alone.
    completion: { kind: "explanation-only" },
    panelCopy: {
      title: "כל הכבוד, סיימת את הכרת המשחק!",
      body:
        "עכשיו אתה מכיר את הדברים החשובים שיעזרו לך להתחיל את המסע.\n\n" +
        "צא לקרבות, תפוס פוקימונים נדירים, בנה שישייה חזקה, אסוף תגים והתמודד בליגות מול שחקנים אחרים.\n\n" +
        "וזה הפרס שהבטחתי לך:\n" +
        "🥚 ביצה נדירה מאוד ממחוז סינו\n" +
        "💰 2,000 כסף\n" +
        "🪙 40 זהב\n\n" +
        "בהצלחה במסע שלך!",
      ctaLabel: "קבל את הפרס",
      guideImage: TUTORIAL_GUIDE_IMAGE_COMPLETION,
    },
  },
];

// GAME TUTORIAL — PHASE 4 — the one stage id claimTutorialReward
// (tutorial-progress.service.ts) and getExplainingPanelDisplay below both
// key off — a named constant rather than the literal "completion" string
// repeated in two files, so the two stay in sync if this stage's id is
// ever renamed.
export const TUTORIAL_COMPLETION_STAGE_ID = "completion";

export function getTutorialStageIndex(stageId: string): number {
  return TUTORIAL_STAGES.findIndex((stage) => stage.id === stageId);
}

export function getTutorialStageById(stageId: string): TutorialStageDefinition | undefined {
  return TUTORIAL_STAGES.find((stage) => stage.id === stageId);
}

// The very first stage (Stage 1 — Welcome) — a lazily-created
// PlayerTutorialProgress row always starts here (see its own @default in
// prisma/schema.prisma), and this is the one fallback tutorial-progress.
// service.ts falls back to if a persisted currentStageId somehow no longer
// resolves against this registry (a defensive "never crash, never
// undefined" guard — should never happen in practice).
export const FIRST_TUTORIAL_STAGE_ID = TUTORIAL_STAGES[0].id;

// null once `stageId` is the last stage in the registry — the one caller
// (tutorial-progress.service.ts's advanceTutorialStage) uses this to decide
// between "move to the next stage" and "mark the tutorial completed".
export function getNextTutorialStageId(stageId: string): string | null {
  const index = getTutorialStageIndex(stageId);
  if (index === -1) return null;
  return TUTORIAL_STAGES[index + 1]?.id ?? null;
}

// PHASE 1 — the one place "given where the player currently is, which real
// target (if any) should the spotlight/minimized banner be waiting on right
// now" is computed — pure and derived entirely from `view`, so
// TutorialContext never has to re-implement this traversal itself, and it
// stays trivially unit-testable in isolation from any React state.
//
// null for "explanation-only" stages (nothing to spotlight), and also null
// for a "multi-step" stage once every one of its steps is already done
// (currentSubStep is the last step's own id) — TutorialPanel's own display
// logic is what decides whether that means "show wrapUpPanelCopy" or
// "silently advance the whole stage" (see tutorial-context.tsx).
export function getActiveTutorialTarget(
  view: Pick<TutorialProgressView, "currentStage" | "currentSubStep">
): { target: TutorialTarget; signal: TutorialCompletionSignal } | null {
  const completion = view.currentStage.completion;

  if (completion.kind === "single") {
    return { target: completion.target, signal: completion.signal };
  }

  if (completion.kind === "multi-step") {
    const currentIndex = view.currentSubStep
      ? completion.steps.findIndex((step) => step.id === view.currentSubStep)
      : -1;
    const activeStep = completion.steps[currentIndex + 1];
    return activeStep ? { target: activeStep.target, signal: activeStep.signal } : null;
  }

  return null;
}

// PHASE 1/3 — the one place "which panel copy should the full
// ('explaining') panel show right now, and what does its CTA do" is
// computed — pure, derived entirely from `view`, so TutorialPanel never
// has to re-implement this branching itself. Only ever meaningful while
// the caller's own panelMode is "explaining" — TutorialPanel is what
// decides whether to render this at all (see that component's own doc
// comment).
export function getExplainingPanelDisplay(
  view: Pick<TutorialProgressView, "currentStage" | "currentSubStep">
): { copy: TutorialPanelCopy; ctaKind: "advance" | "begin-awaiting" | "proceed" | "claim-reward" } {
  const { currentStage } = view;

  if (currentStage.completion.kind === "multi-step" && view.currentSubStep !== null) {
    // PHASE 3 — the step that just completed (currentSubStep) may declare
    // its own mid-flow explanation, shown BEFORE whatever comes next (the
    // next step's own awaiting, the stage's wrapUpPanelCopy, or a direct
    // advance) — takes priority over wrapUpPanelCopy below, since it can
    // fire on ANY step, not only the last one. Its own CTA ("proceed")
    // computes what to do next at click time (see tutorial-context.tsx's
    // own proceed()), never baked in here.
    const completedStep = currentStage.completion.steps.find((step) => step.id === view.currentSubStep);
    if (completedStep?.explainAfter) {
      return { copy: completedStep.explainAfter, ctaKind: "proceed" };
    }

    // NAVIGATION ORDER — explainAfterEntry's own doc comment
    // (tutorial.types.ts): the stage's own panelCopy is the implicit
    // explanation for its FIRST step (always the real route navigation)
    // once that step's signal fires — reusing panelCopy itself rather than
    // duplicating its text into an explicit explainAfter, so there's
    // exactly one source of truth for this stage's explanation regardless
    // of when it displays. Checked before wrapUpPanelCopy below since it
    // can only ever apply to step 0, never the LAST step of a multi-step
    // stage (unless they're the same step, e.g. a one-step stage like
    // Inventory — still correct either way).
    if (currentStage.explainAfterEntry && completedStep === currentStage.completion.steps[0]) {
      return { copy: currentStage.panelCopy, ctaKind: "proceed" };
    }

    // Every step already done (getActiveTutorialTarget would return null
    // here) AND this stage actually defines a wrap-up panel — see this
    // stage's own completion.wrapUpPanelCopy doc comment for why a stage
    // with none never reaches this branch at all (TutorialContext's own
    // completeActiveTarget skips straight through to the next stage
    // instead).
    if (currentStage.completion.wrapUpPanelCopy) {
      return { copy: currentStage.completion.wrapUpPanelCopy, ctaKind: "advance" };
    }
  }

  if (currentStage.completion.kind === "explanation-only") {
    // PHASE 4 — COMPLETION REWARD. The one narrow, id-keyed special case:
    // the Completion stage's own CTA claims the real reward (atomically,
    // exactly-once — see claimTutorialReward, tutorial-progress.service.ts)
    // instead of just advancing like every other explanation-only stage.
    if (currentStage.id === TUTORIAL_COMPLETION_STAGE_ID) {
      return { copy: currentStage.panelCopy, ctaKind: "claim-reward" };
    }
    return { copy: currentStage.panelCopy, ctaKind: "advance" };
  }

  // "single" or "multi-step" at its very first (currentSubStep === null)
  // panel — the stage's own lead-in, and the CTA starts awaiting its first
  // real target instead of advancing directly.
  return { copy: currentStage.panelCopy, ctaKind: "begin-awaiting" };
}

// PHASE 5 — REPLAY. The very first stage, by array position — replay
// always starts here, exactly like a fresh, never-started real Tutorial
// does (see FIRST_TUTORIAL_STAGE_ID's own doc comment above).
export const REPLAY_FIRST_STAGE_INDEX = 0;

// Builds the purely client-side ReplayProgressView tutorial-context.tsx's
// own replay state machine renders from — a plain index into TUTORIAL_STAGES
// plus whichever sub-step (if any) is currently being reviewed. Never reads
// or writes PlayerTutorialProgress; the real `view` this mirrors is
// completely untouched by any of this.
export function buildReplayProgressView(stageIndex: number, subStep: string | null): ReplayProgressView {
  const currentStage = TUTORIAL_STAGES[stageIndex];
  const totalStages = TUTORIAL_STAGES.length;

  return {
    currentStage,
    currentSubStep: subStep,
    stageIndex,
    totalStages,
    progressPercent: Math.round((stageIndex / totalStages) * 100),
    isLastStage: stageIndex === totalStages - 1,
  };
}

// null once `stageIndex` is the last stage — mirrors getNextTutorialStageId's
// own "no next stage" contract, but over a plain array index (replay has no
// persisted stage id to look up) rather than a stage id string.
export function getNextReplayStageIndex(stageIndex: number): number | null {
  return stageIndex + 1 < TUTORIAL_STAGES.length ? stageIndex + 1 : null;
}

// PHASE 5 — the replay-aware counterpart to getActiveTutorialTarget: same
// traversal (reused verbatim, never duplicated), except a target flagged
// skipInReplay has its real signal coerced to "manual" — the player still
// sees the exact same guidance and (whenever the real page happens to be
// reachable, e.g. Pokémon Center/Shop) the exact same spotlight, but is
// never required — or able — to perform the real, mutating action again
// (see TutorialTarget.skipInReplay's own doc comment, tutorial.types.ts,
// for exactly which targets this applies to and why).
export function getReplayActiveTarget(
  view: Pick<ReplayProgressView, "currentStage" | "currentSubStep">
): { target: TutorialTarget; signal: TutorialCompletionSignal } | null {
  const active = getActiveTutorialTarget(view);
  if (!active) return null;

  if (active.target.skipInReplay) {
    return { target: active.target, signal: { kind: "manual" } };
  }

  return active;
}

// PHASE 5 — the replay-aware counterpart to getExplainingPanelDisplay: same
// panel selection (reused verbatim), except the Completion stage's own
// "claim-reward" CTA is coerced to a plain "advance" — replay walks through
// the exact same final panel/copy, but finishing it only ever ends the
// replay walkthrough itself, never claims the real, already-claimed reward
// a second time (this task's own explicit "no reward at the end" rule).
export function getReplayExplainingPanelDisplay(
  view: Pick<ReplayProgressView, "currentStage" | "currentSubStep">
): { copy: TutorialPanelCopy; ctaKind: "advance" | "begin-awaiting" | "proceed" } {
  const display = getExplainingPanelDisplay(view);
  return display.ctaKind === "claim-reward"
    ? { copy: display.copy, ctaKind: "advance" as const }
    : { copy: display.copy, ctaKind: display.ctaKind };
}
