# MetaPleno v186 — Primitiva Cross-Family Deep Rescue

Status: ACTIVE_RESEARCH
realMoneyPass: false

## Problem
The c46 playable pool produced repeated 5/6 events, but v185 shows the omitted winner was deep in the c46 ranking:
- 2024-01-11: omitted winner 22 at rank 29.
- 2026-07-25: omitted winner 38 at rank 20.

A local rank-8/rank-9 swap cannot solve this class of failure.

## Orthogonal rescue rule
For each target draw, reconstruct rankings using only information available strictly before that draw from independently defined Primitiva families already present in the repository (c46 successor model, Kalman/order-state family, gap/shape family, and other temporally clean families where executable specifications exist).

Measure for the omitted winner:
- rank by family;
- top-8/top-12/top-16 inclusion;
- cross-family vote count;
- disagreement with c46;
- whether a family could have supplied the omitted winner while a separate pre-draw false-positive score identifies a removable c46 pool member.

## Gates
- No result-derived family selection.
- Family set fixed before evaluating the 2024 and 2026 target events.
- No use of post-target draws in features.
- 5 EUR maximum research portfolio for compressed Primitiva candidate.
- A rescue is not a full hit unless the exact winning sextet exists in an actually playable ticket.
- Any successful retrospective rescue remains exploratory until matched-null, multiple-testing correction and a new prospective freeze pass.

## Decision target
Determine whether deep omitted winners are visible to an orthogonal family before the draw. If not, de-prioritize cross-family rescue and move to representation/regime discovery rather than parameter tuning.
