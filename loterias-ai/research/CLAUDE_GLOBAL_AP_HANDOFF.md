# Claude Global Advantage-Play Handoff

Status machine-readable version: `loterias-ai/research/claude-global-ap-handoff-v1.json`.

## TL;DR

**STATUS: NO_PLAY.** No mechanism studied this pass or in prior sessions has cleared a conservative, robust EV > 100% for any Botemania or other Spanish-accessible game. The 20 EUR already deposited in Botemania should not be staked on any candidate in this file.

## What actually moved this pass

1. **Must-drop EV engine, generalized.** `loterias-ai/casino/jackpots/must-drop-ev-engine-v1.mjs` lifts the hazard-shape math already proven in `botemania-irish-riches-jpk-current-screen-v1.mjs` (a power-law `F(q)=q^alpha` hazard family, screened across `alpha` instead of assuming any single shape — including uniform) out of that one script and into a reusable module. It now supports both:
   - **Monetary-cap must-drop** (Blueprint Jackpot King Royal/Regal style): `monetaryCapScenarioGrid(...)`.
   - **Wall-clock must-drop-within** (Botemania's own "Double Jackpots" countdown component): `timedDeadlineHazardGrid(...)`.

   The wall-clock model deliberately **refuses to produce a PLAY-eligible EV** unless the caller supplies a validated `awardMechanism` (network-random-active-spin vs per-player-session-countdown). Guessing that mechanism would be exactly the kind of fabricated signal this project explicitly forbids, so the engine returns `NO_PLAY` / `AWARD_MECHANISM_UNKNOWN...` instead. It also exposes `impliedMaxConcurrentPlayersForBreakeven(...)`, which inverts the equation into a falsifiable question ("how low would concurrency have to be for this to already be +EV?") instead of assuming an unknown parameter.

   Full unit tests with hand-verified numeric expectations: `loterias-ai/tests/must-drop-ev-engine-v1.test.mjs` (added to `loterias-ai-ci.yml`).

2. **Botemania's "Double Jackpots" must-drop mechanism confirmed to exist, still not quantified.** Prior work (`botemania-double-jackpots-mustdrop-extractor-v1.json`) found the live UI component (`MustDropWithinContainer`, `CountdownContainer`) in Botemania's own front-end bundle, but a 7-needle text scan of the accompanying "settings" bundle (22.8 KB, HTTP 200) found **zero** matches. `botemania-double-jackpots-mustdrop-extractor-v2.mjs` widens that to 18 needles plus a needle-independent scan for any object literal with a jackpot/pot/cap/seed-flavoured key and 2+ numeric fields — because the real config keys may simply not be named "amount"/"maximum"/"minimum". This session's own sandboxed network egress cannot execute it against live data (see Environment constraint below); a new scheduled workflow (`loterias-ai-botemania-double-jackpots-mustdrop-v2.yml`, every 2h) will run it with real (GitHub Actions) network access.

3. **Red Tiger dead end documented, not re-attempted blindly.** `botemania-redtiger-venture-probe-v1.json` already tried 4 plausible venture identifiers for Botemania's Red Tiger jackpot feed; all returned HTTP 200 with 0 rows. That's evidence of a wrong identifier, not evidence of no Red Tiger jackpots — logged as a blocker with a concrete next step (mine Botemania's own game-launch client map for the real identifier) rather than re-guessing.

## Environment constraint (repeats from PR #169, still true)

This interactive Claude Code session runs under a network-egress allowlist that blocks direct fetches to Botemania, Blueprint, Red Tiger, and Wayback Machine hosts. Only the repo's own scheduled GitHub Actions workflows — which run on GitHub-hosted runners with unrestricted egress — can actually execute the `.mjs` probes end-to-end. This session's contribution this pass is therefore code, math, tests, and CI wiring; **fresh live numbers depend on those workflows firing**, not on this session polling anything itself.

## Per-Misión status (only what changed or was newly assessed this pass)

- **Misión 1 (must-hit-by/must-drop):** Engine built and tested. Botemania "Double Jackpots" identified as the most promising concrete target; numeric config still unrecovered (v2 scanner ready, unexecuted). Irish Riches JPK unchanged from issue #168 (still blocked on exact MBWB/stake ladder).
- **Misión 2 (progressive video poker):** PlayUZU's full 552-game catalog audited field-by-field this pass: **0 video poker titles of any kind** (no "poker" in any name/category), **0 `dailyJackpot`**, **0 `isJackpotKing`**, **0 Red Tiger** provider games. Misión 2 is CLOSED at PlayUZU — redirect to Botemania's own catalog and PokerStars Casino España next. Side finding: 142 PlayUZU games are `isJackpot=true`, dominated by EGT (Minor/Major/Grand tier jackpots, publicly documented by EGT to have a disclosed must-hit-by range per vendor literature) — a concrete, well-scoped next probe against PlayUZU's already-reachable `games-api.netdnstrace1.com` backend, not a fresh discovery problem.
- **Misión 3 (world winners → mechanisms):** Covered in PR #169 (`loterias-ai/universidad/advantage-play-case-studies-v1.json`, not yet merged to `main`). Classification table (`TRANSFERIBLE_NOW`/`TRANSFERIBLE_WITH_DATA`/`PHYSICAL_ONLY`/`OBSOLETE`/`NO_EDGE`) reproduced in the JSON handoff's `transferableMechanisms`.
- **Misión 4 (persistent-state slots):** Not audited this pass.
- **Misión 5 (progressive ID census / feed resolution):** Not audited this pass; the specific IDs named in the brief (`diamondbonanza25BTM`, `DealOrNoDealStateful3`, etc.) were not found in the current repo state and need a fresh census pass, not assumed to exist.
- **Misión 6 (ruleta):** No new physical-bias evidence found or claimed; Lightning Roulette's prior prospective failures are treated as still failed, not rescued.
- **Misión 7 (loterías con overlay):** **Found a real Spanish analogue of Selbee's roll-down mechanism.** Euromillones' own published rules (cross-checked across independent sources, not yet a primary SELAE citation) forcibly redirect category-1 (jackpot) funds into category 2 (5 numbers + 1 star) once the jackpot hits its 250M EUR cap and goes unwon for 4 consecutive draws. `lottery-rolldown-ev-engine-v1.mjs` implements the pari-mutuel EV math for this and refuses a play verdict when the expected-winner sample is too thin to trust. **Not currently active** — the jackpot has to actually be near the cap, which is historically rare, so this is a monitor-for-the-condition target, not today's candidate. Logged in the JSON's `nearThresholdCandidates`.
- **Misión 8 (EDGE 24/7 fast/normal/slow lanes):** Not built this pass; the new v2 workflow's 2-hour cadence is a `NORMAL_LANE`-tier addition, not yet a full fast/normal/slow architecture.
- **Misión 9 (PLAY_NOW/NO_PLAY output contract):** Enforced structurally in `timedDeadlineHazardGrid()` (refuses to output a verdict without every required field) and in this handoff's top-level `status`.

## Next automatic action

Trigger or wait for `loterias-ai-botemania-double-jackpots-mustdrop-v2.yml`, then read its fresh `botemania-double-jackpots-mustdrop-extractor-v2.json` for `objectLiteralCandidates` — that is the single highest-value unresolved lead from this pass.
