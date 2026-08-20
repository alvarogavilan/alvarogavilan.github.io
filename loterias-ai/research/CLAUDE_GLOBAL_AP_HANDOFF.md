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

## This pass (Misión A/B/C)

**Misión A — Double Jackpots data-flow trace.** The v2 settings scan actually ran on GitHub Actions after the review merge: both bundles HTTP 200, 51 findings across 29 needles, **0 object-literal candidates**. That static path is now confirmed exhausted, not just suspected. But the lazy-chunk-feed manifest lists **six DoubleJackpots-family chunks the mustdrop extractors never fetched at all** — the `containers-DoubleJackpots-index-js` container (hitTerms include `query`, the most likely home of the real GraphQL data source) and three large `vendors~...DoubleJackpots~...` bundles (also tagged `query`/`date`). `botemania-double-jackpots-container-trace-v1.mjs` fetches these, extracts GraphQL/REST signatures, and builds a moduleID→chunk-name reference graph. Not yet run against live data (this session's network is sandboxed); scheduled every 2h.

**Misión B — video poker.** Confirmed via main's own `botemania-universe-current-v1.json`: Botemania has **4 real video-poker titles** — Classic Video Poker (96.77–99.26%), Póker 3 Opciones (97.99%/98.48%, explicit hand-pay ladder but shape doesn't match Jacks-or-Better, likely a different variant), Ultimate Video Poker (96.77–99.54%), Videopóker Remasterizado (99.54% flat — matches the well-published 9/6 Jacks-or-Better figure, unconfirmed hint). The previously-referenced "WAGER_BET" jackpot mapping for Ultimate Video Poker could **not** be found anywhere in main's evidence and is treated as unverified, not assumed. `progressive-video-poker-ev-v1.mjs` implements the Dancer-style EV engine (refuses a verdict without a cited `pRoyalFlush`), and `botemania-video-poker-jackpot-probe-v1.mjs` re-probes all 4 URLs specifically for jackpot/progresivo text that prior evidence never searched for.

**Misión C — world case studies expanded.** `loterias-ai/universidad/advantage-play-case-studies-v1.json` grows from 8 to 11 cases (added Don Johnson's negotiated rebate, Zeljko Ranogajec's pari-mutuel rebate arbitrage, the MIT Blackjack Team), restructured to the exact PERSON/DOCUMENTED_PROFIT/GAME/MECHANISM/OBSERVABLE_STATE/FORMULA/ENTRY_THRESHOLD/EXIT_THRESHOLD/BANKROLL/VARIANCE/LEGALITY/ONLINE_TRANSFER/SPAIN_TRANSFER/CURRENT_SPANISH_MATCH schema requested this pass. Both new mechanisms are marked NO_APLICABLE for a 20 EUR bankroll (negotiated high-roller rebates and industrial-scale pari-mutuel syndicates don't transfer down).

## Next automatic actions

1. Trigger/review `loterias-ai-botemania-double-jackpots-container-trace-v1.yml` and read `referenceGraph`/`graphqlLikeSnippets`.
2. Trigger/review `loterias-ai-botemania-video-poker-jackpot-probe-v1.yml` and read which titles show jackpot signal.
3. If any video-poker title shows jackpot signal, get its exact paytable before computing `pRoyalFlush` — never borrow a foreign figure.
4. Audit PokerStars Casino España for progressive video poker.
5. Resolve exact EGT jackpot family identities only where primary rules prove MHB semantics.
6. Monitor Euromillones only when its jackpot approaches the official cap condition.
