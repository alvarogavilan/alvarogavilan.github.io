# Claude Global Advantage-Play Handoff

Machine-readable state: `loterias-ai/research/claude-global-ap-handoff-v1.json`.

## STATUS

**NO_PLAY.** No Spanish-accessible candidate in this pass has yet cleared a conservative, execution-ready EV > 100%. The existing Botemania bankroll must remain untouched until a gate closes with exact game identity, rules, current state and stake.

## Independent review corrections

The first Claude implementation was reviewed before merge and two mathematical issues were corrected:

1. **Lottery shared-fund EV:** the original code used fund divided by the expected number of winners. That is not exact because `E[1/W] != 1/E[W]`. The engine now uses the exact category-specific exchangeability result under independent equiprobable tickets:

   `EV_fund_per_ticket = Fund * [1-(1-p)^N] / N`

   The Euromillones model intentionally counts only the target lower category; any further cascade to lower categories is omitted, making the model conservative rather than optimistic.

2. **Must-drop finite-step EV:** the original code used the infinitesimal approximation `hazard(q) * dq`. The engine now uses the exact conditional probability over the next finite meter/time interval:

   `P(drop in (q1,q2] | survived q1) = [F(q2)-F(q1)] / [1-F(q1)]`

   with `F(q)=q^alpha` only as an explicit scenario family. This matters most near the cap/deadline, exactly where an AP decision gate is most sensitive.

Both corrections have dedicated regression tests.

## Euromillones roll-down: primary source confirmed

SELAE's own `Normas de Euromillones` confirm the mechanism. The maximum allocation cap can reach **250,000,000 EUR**. Once the maximum cap is being offered, it may be offered for at most four successive draws. If the **fifth** capped draw again has no category-1 winner, the category-1 fund increases the prize fund of the immediately lower category that has at least one winner in that draw.

Primary source:
`https://www.loteriasyapuestas.es/f/loterias/documentos/normativa/Normativa%20de%20los%20juegos/Normas_de_Euromillones_Mayo_2020.pdf`

This is a real Spanish analogue of the roll-down mechanism family, but it is **not active now** and is therefore a monitor-only target, not a reason to buy a ticket today.

## Highest-value active research leads

### 1. Botemania Double Jackpots — MustDropWithin

Botemania's front-end contains `MustDropWithinContainer` / countdown components. The exact numeric config and award mechanism are still unresolved. `botemania-double-jackpots-mustdrop-extractor-v2.mjs` widens the settings scan and a dedicated GitHub Actions workflow will persist fresh evidence. Until the config and allocation mechanism are known, the engine fails closed to `NO_PLAY`.

### 2. PlayUZU EGT jackpots

The audited PlayUZU catalog contains **552 games**, with **142 `isJackpot=true`** titles, dominated by EGT. PlayUZU has **0 video-poker titles**, **0 Red Tiger provider games**, **0 `dailyJackpot`** and **0 `isJackpotKing`** flags in that catalog.

Important: EGT's official literature explicitly describes **2 Happy Hits** as a standalone mystery jackpot with a displayed `Must hit by` field. That must **not** be generalized to all EGT Jackpot Cards titles. No exact PlayUZU match for the named 2 Happy Hits compatible titles has been established in this review, so the 142 EGT jackpot games remain progressive/mystery candidates, not proven MHB opportunities.

### 3. Progressive video poker

PlayUZU is closed as a video-poker lane. The dedicated search must move to **Botemania** and **PokerStars Casino España**, requiring exact paytable, denomination, full-jackpot qualifying bet and live progressive counter before a break-even threshold can be trusted.

## Rejected / dead lanes

- Lightning Roulette predictive edge: prospective replications failed. No post-hoc rescue.
- Physical roulette bias -> RNG: non-transferable.
- PlayUZU progressive video poker: absent from audited catalog.
- Generic assumption `EGT jackpot == must-hit-by`: rejected. Only exact jackpot families with primary rules may enter the MHB gate.

## Previous pass (Misión A/B/C) — now independently reviewed and corrected

ChatGPT reviewed that pass's PR #189/#190 and fixed two real bugs before merge: (1) the multi-hand video-poker engine let 10/25 hands pay the same total as 1 hand, inflating EV ×10 for free — `totalCoinsBet` now correctly scales as `qualifyingCoinsBetPerHand*handsPerSpin`; (2) the progressive-signal detector matched bare "Royal"/"Escalera Real" (present in almost every video poker game, progressive or not) and the substring "bote" (which matched "Bote**mania**" itself) — both fixed to whole-word/whole-phrase matching. Both fixes are on `main` and confirmed by a real workflow run: `botemania-video-poker-jackpot-probe-v1.json` version `v1.2-whole-word-signals` shows exactly **one** title with a real progressive signal.

## Previous pass — Carril A/B results (now further advanced this pass)

`botemania-double-jackpots-container-trace-v1.yml` ran on GitHub Actions and recovered the container's compiled GraphQL query verbatim: `query loadJackpots { redTigerJackpots { id amount } }` — only `id`/`amount`, no `mustDropWithin`. Ruled out `HeadlessJackpots` (its query is `loadGames`, a game-catalog loader) and the `settings` bundle (confirmed react-slick carousel breakpoint config). `botemania-ultimate-video-poker-metadata-probe-v1.yml` also ran: confirmed `providerId=roxor-gaming` via Botemania's own public GraphQL — **Botemania's video poker is Roxor Gaming**, don't re-investigate the provider.

## This pass — Roxor launch flow, Double Jackpots data-flow, real paytable evidence

**CARRIL B: provider confirmed, real paytable now on record, still gated on P(Royal Flush).** `providerId=roxor-gaming` is confirmed from a real run (not inferred). The user provided a screenshot of "Jotas o Mejor Progresivo"'s actual paytable — **1-2-3-4-5-7-25-50-800** (Jacks-or-Better through Royal Flush per coin), the classic **"7/5 Jacks or Better"** shape, distinct from full-pay 9/6 — plus **10 hands × 2.50 EUR/hand = 25 EUR total** observed play. This is recorded in `progressive-video-poker-ev-v1.mjs`'s registry as `manualScreenshotEvidence`, tagged `MANUAL_SCREENSHOT_EVIDENCE`, not re-requested. **`pRoyalFlushForFixedStrategy` deliberately stays `null`**: the only citable figure found (WizardOfOdds, ~1/40,391 via WebSearch — WebFetch to wizardofodds.com is itself blocked by this session's own egress policy) is for the *different* 9/6 table, and optimal strategy shifts with a reduced flush/full-house pay, so reusing it would violate "no mezcles estrategias." A new test asserts the engine still refuses a verdict even with a real paytable present, specifically to stop a future pass from quietly substituting the 9/6 figure. `botemania-roxor-launch-flow-probe-v1.mjs` (new, Carril B Prioridad 1 per instruction) does a bounded (120-chunk) site-wide search for Roxor launch/session vocabulary, keeping only chunks that actually mention "roxor" — aimed at finding a vendor-primary paytable/rules asset the way Blueprint's fileservice worked for Irish Riches. Not yet run.

**CARRIL A: the global scan surfaced two genuinely new components, still no smoking gun.** `botemania-double-jackpots-global-mustdropwithin-scan-v1.mjs` ran (pre-PR-#192-fix): 366 chunks discovered, 361 scanned, 5 hits. Two are new: a separate **hooks-based generic "Jackpots" component** (`vendors~...Jackpots`, 21.3KB) whose render logic filters the raw jackpots array against two *fixed ID-list constants* — `T` for `type==="blueprint"`, `S` otherwise — via `f.forEach(id => jackpots.find(j => j.id===id))`, but does **not** itself add `mustDropWithin`, only reads it conditionally (same pattern as everywhere else); and a **generic (non-DoubleJackpots) MustDropWithin** component, confirming the countdown UI is shared infrastructure. Three hypotheses remain open, matching the instruction's own framing: **H1** (Apollo cache/wrapper enrichment elsewhere — no evidence yet), **H2** (the property is simply absent for Red Tiger rows and the component just tolerates that — most parsimonious given the live query only returns `id`/`amount`), **H3** (`mustDropWithin` is only meaningful for the Blueprint branch — plausible given Blueprint's own MBWB is a *monetary* cap while this UI code does `new Date(x).getTime()`, i.e. treats it as a *time* value, suggesting this specific countdown feature might actually belong to a Red Tiger "Daily/Hourly Drop" concept rather than Blueprint's MBWB at all). Two new scripts target closing this: `botemania-redtiger-jackpots-live-query-v1.mjs` (executes the exact recovered query on a 15-min schedule and persists real `id`/`amount` rows, to compare against Daily/Quick Hit/Hourly labels) and `botemania-jackpots-shared-component-idlists-probe-v1.mjs` (re-fetches the generic Jackpots/MustDropWithin/BlueprintJackpots-container chunks searching specifically for the literal `T`/`S` list contents and blueprint/daily/hourly/quick vocabulary). Neither has run against live data yet.

## Next automatic actions

1. Trigger/review `loterias-ai-botemania-roxor-launch-flow-probe-v1.yml` first (Carril B Prioridad 1).
2. Trigger/review `loterias-ai-botemania-redtiger-jackpots-live-query-v1.yml` and compare real IDs against Daily/Quick Hit/Hourly hints.
3. Trigger/review `loterias-ai-botemania-jackpots-idlists-probe-v1.yml` and read `idListCandidates` to resolve H1/H2/H3.
4. Once a Roxor asset is found, look for a primary-source P(Royal Flush) specific to the 7/5 paytable — never reuse the 9/6 comparator.
5. Re-run the global mustDropWithin scan now that PR #192's coverage fix is on main, for real `scanComplete`/`fetchCoveragePct` numbers.
6. Monitor Euromillones only when its jackpot approaches the official cap condition.
