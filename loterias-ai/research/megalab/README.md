# Loterías AI MegaLab v290

MegaLab turns the single symbolic-search experiment into a virtual research institute.

## Architecture

- 4,096 deterministic virtual scientists per run.
- 12 specialties and 6 objective functions so scientists do not all search the same space.
- Shared SHA-256 hypothesis memory to prevent exact negative hypotheses from being re-run.
- Three-stage promotion: cheap temporal screen -> full selection-era evaluation -> untouched OOS/post-freeze evaluation.
- Only a very small promoted set is allowed to touch 2023+ data.
- A historical jackpot is never an optimization target; it can only appear after a hypothesis is frozen.
- One consolidated GitHub Action for all scientists and four priority games.
- Hard fail-closed: realMoneyPass=false, realStakeEUR=0, ordinary theoretical budget <=4 EUR/game.

## Scale philosophy

The number of virtual scientists can be increased without creating one GitHub Action per scientist. Scientists are logical workers multiplexed inside one bounded run. Scaling therefore means expanding hypothesis diversity and screening efficiency, not blindly increasing CI spend.

## Future expansion points

The scheduler is designed to accept additional grammars, feature inventors, graph researchers, causal tests, adversarial falsifiers, ensemble builders, theorem-inspired operators and game-specific scientist populations. Negative-memory hashes should remain permanent unless a scientifically meaningful protocol change makes an old result incomparable.
