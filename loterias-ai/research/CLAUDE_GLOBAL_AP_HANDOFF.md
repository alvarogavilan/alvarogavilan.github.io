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

## Euromillones roll-down: primary source now confirmed

SELAE's own `Normas de Euromillones` confirm the mechanism. The maximum allocation cap can reach **250,000,000 EUR**. Once the maximum cap is being offered, it may be offered for at most four successive draws. If the **fifth** capped draw again has no category-1 winner, the category-1 fund increases the prize fund of the immediately lower category that has at least one winner in that draw.

Primary source:
`https://www.loteriasyapuestas.es/f/loterias/documentos/normativa/Normativa%20de%20los%20juegos/Normas_de_Euromillones_Mayo_2020.pdf`

This is a real Spanish analogue of the roll-down mechanism family, but it is **not active now** and is therefore a monitor-only target, not a reason to buy a ticket today.

## Highest-value active research leads

### 1. Botemania Double Jackpots — MustDropWithin

Botemania's front-end contains `MustDropWithinContainer` / countdown components. The exact numeric config and award mechanism are still unresolved. `botemania-double-jackpots-mustdrop-extractor-v2.mjs` widens the settings scan and a dedicated GitHub Actions workflow will persist fresh evidence. Until the config and allocation mechanism are known, the engine fails closed to `NO_PLAY`.

### 2. PlayUZU EGT jackpot family

The audited PlayUZU catalog contains **552 games**, with **142 `isJackpot=true`** titles, dominated by EGT. PlayUZU has **0 video-poker titles**, **0 Red Tiger provider games**, **0 `dailyJackpot`** and **0 `isJackpotKing`** flags in that catalog. The next probe must recover exact live Minor/Major/Grand tiers, reset/cap/contribution and determine whether EGT's generic must-hit-by literature applies to these exact Spanish configurations.

### 3. Progressive video poker

PlayUZU is closed as a video-poker lane. The dedicated search must move to **Botemania** and **PokerStars Casino España**, requiring exact paytable, denomination, full-jackpot qualifying bet and live progressive counter before a break-even threshold can be trusted.

## Rejected / dead lanes

- Lightning Roulette predictive edge: prospective replications failed. No post-hoc rescue.
- Physical roulette bias -> RNG: non-transferable.
- PlayUZU progressive video poker: absent from audited catalog.

## Next automatic actions

1. Review the first fresh Double Jackpots v2 workflow output.
2. Probe the 142 PlayUZU EGT jackpot titles for live tier values and exact must-hit-by semantics.
3. Audit Botemania/PokerStars ES progressive video poker.
4. Monitor Euromillones only when its jackpot approaches the official cap condition.
