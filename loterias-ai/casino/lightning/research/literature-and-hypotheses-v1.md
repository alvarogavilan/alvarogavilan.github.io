# Lightning Roulette — literature synthesis and testable hypotheses v1

Status: RESEARCH_ONLY / PAPER / NO REAL MONEY

## Verified mechanics
- Evolution states that live Lightning Roulette combines a physical single-zero roulette wheel with RNG-generated Lucky Numbers and Lucky Payout multipliers.
- Each round selects 1–5 Lucky Numbers and multipliers from 50x, 100x, 200x, 300x, 400x and 500x.
- Non-multiplied straight-up bets pay 29:1; other conventional roulette bets retain standard payouts.
- The physical wheel outcome and RNG multiplier layer must therefore be treated as distinct stochastic subsystems until evidence supports dependence.

## External research absorbed
1. Small & Tse, "Predicting the outcome of roulette" (2012): roulette has deterministic physical dynamics; outcome prediction can become possible when initial ball/wheel position, velocity and acceleration are observed. This supports testing physical-wheel bias and temporal persistence, but NOT claiming predictability from result history alone.
2. Salirrosas Martínez, "Biased Roulette Wheel: A Quantitative Trading Strategy Approach" (2016): 10,980 observed spins from a European roulette wheel were analysed with backtesting and walk-forward methods. This motivates strict walk-forward bias detection and bankroll-independent signal validation.
3. Evolution official material: Lucky Numbers and payouts are RNG-generated after betting closes. This motivates independent tests of RNG uniformity, lucky-number count distribution, multiplier distribution and dependence between RNG outputs and physical outcomes.
4. Public litigation descriptions indicate proprietary math files specify multiplier-selection frequency, Lucky Number frequency, number of Lucky Numbers per spin and payout probabilities. We do not possess those confidential files and will not infer or reconstruct trade secrets; instead we estimate observable empirical distributions from public outcomes.

## Preregistered empirical tests on our Tier-A corpus
### Physical wheel outcome lane
- Chi-square / exact multinomial uniformity across 0–36.
- Rolling-window drift and change-point tests.
- Serial dependence: lag-1..lag-20 mutual information, permutation-calibrated.
- Wheel-neighbour tests using European wheel order rather than numeric adjacency.
- Sector imbalance tests with multiplicity correction.
- Walk-forward-only bias exploitation test: train window -> frozen candidate set -> next-window scoring.

### RNG Lucky Number lane
- Distribution of count of Lucky Numbers per round (1..5).
- Per-number Lucky selection frequency across 0–36.
- Conditional independence of Lucky selection from physical winning number.
- Lag dependence in Lucky-number sets.
- Repeat/overlap rates versus matched random-set nulls.

### Multiplier lane
- Empirical frequency of 50/100/200/300/400/500x.
- Dependence of multiplier on Lucky-number count.
- Dependence of multiplier on number identity.
- Dependence of multiplier on physical winner.
- Temporal clustering / runs tests.

### Joint lane
- Probability winner is also Lucky conditional on Lucky count.
- Compare empirical P(winner in Lucky set | K=k) with k/37.
- Test whether multiplier magnitude conditional on a winner-hit differs from unconditional multiplier distribution.
- Detect regime changes only prospectively after preregistered thresholds.

## Scientific gates
- Selection, validation and prospective windows must remain separated.
- Correct for multiple testing (Holm/BH plus empirical permutation where appropriate).
- No parameter retuning after validation exposure.
- Historical anomalies are not promoted unless they survive frozen forward validation.
- No martingale, progression or staking system is treated as predictive evidence.
- No real-money claim or recommendation is permitted from exploratory findings.
