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

## This pass — real results read from main, two carriles pushed further

**CARRIL A result: the exact GraphQL query is recovered, and it does NOT explain `mustDropWithin`.** `botemania-double-jackpots-container-trace-v1.yml` already ran on GitHub Actions (triggered by the PR #189 merge). It recovered the container's compiled query verbatim from its own `loc.source.body`:

```graphql
query loadJackpots {
    redTigerJackpots {
        id
        amount
    }
}
```

Only `id` and `amount` — no `mustDropWithin`. The container's `render()` passes this array straight through, unmodified, as `jackpots={r}` to the base `DoubleJackpots` component, whose `componentDidMount` reads `jackpots[t].mustDropWithin` directly. So the deadline is attached **somewhere between** the Apollo query result and this component receiving it — but not in this container. Also ruled out this pass: `HeadlessJackpots` (its query is `loadGames`, a game-catalog loader, structurally unrelated) and the `settings` bundle (confirmed to be react-slick **carousel breakpoint config**, not jackpot economics — its `getSettings(venture, gamesLength)` result is spread straight into the carousel's slider props). `botemania-double-jackpots-global-mustdropwithin-scan-v1.mjs` (new) reuses the `runtime.js`-parsing technique from `botemania-headless-global-bundle-config-scan-v1.mjs` (which already discovered **260 total chunks** site-wide) to search the *entire* bundle, not just the 36 jackpot-keyword-filtered chunks, for the real enrichment source. Not yet run (sandboxed session network); scheduled every 4h.

**CARRIL B result: variant and live feed confirmed, paytable still missing.** Ultimate Video Poker's own help page lists 10 selectable sub-games including **"Jotas o Mejor Progresivo"**, with 1/5/10/25 simultaneous hands. `loterias-ai/edge-live/evidence/progressive-score-research-v1.json` already has this exact game mapped to `monitor.feedId=WAGER_BET`, live at **3,448.25 EUR**, `identity.confidence=VERY_HIGH` — but its `evidenceClass` is `MANUAL_SCREENSHOT_LIVE_AMOUNT_CROSS_MATCH`, i.e. a human established this mapping with a screenshot, not a reproducible script; noted honestly rather than presented as script-derived. No paytable numbers appear anywhere in the static help text — payouts almost certainly live inside the game client itself. `botemania-ultimate-video-poker-metadata-probe-v1.mjs` (new) mirrors the exact pattern that already worked for Irish Riches (`botemania-irish-metadata-probe-v1.mjs`'s public-GraphQL provider/launch lookup) to find a vendor help/rules asset. Not yet run.

## Next automatic actions

1. Trigger/review `loterias-ai-botemania-double-jackpots-global-mustdropwithin-scan-v1.yml` and read `hitChunks` for the true `mustDropWithin` source.
2. Trigger/review `loterias-ai-botemania-ultimate-video-poker-metadata-probe-v1.yml` and read `paramHints`/`games` for a provider ID or vendor help endpoint.
3. Once a provider is identified, probe its help/rules asset for the exact paytable — same pattern as Blueprint's fileservice for Irish Riches.
4. Audit PokerStars Casino España for progressive video poker.
5. Monitor Euromillones only when its jackpot approaches the official cap condition.
