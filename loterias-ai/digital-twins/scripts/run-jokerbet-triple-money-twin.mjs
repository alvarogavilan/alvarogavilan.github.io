#!/usr/bin/env node
import {CONTRACT,thresholdSurface,robustThresholdFromHazardLower,executionGate} from '../games/jokerbet-triple-money.mjs';
const hypotheticalQLower=[0,1e-7,2e-7,5e-7,1e-6,2e-6,5e-6];
const out={version:'jokerbet-triple-money-digital-twin-v1',mode:'RESEARCH_ONLY',contract:CONTRACT,currentExecutionGate:executionGate({}),robustThresholdWithCurrentHazardKnowledge:robustThresholdFromHazardLower(null),hypotheticalThresholdSurface:thresholdSurface(hypotheticalQLower),keyResult:'With no defendible positive lower bound on Grand hazard, no finite Grand amount is a robust +EV threshold.',guards:{hypotheticalHazardsNotExecutionEvidence:true,noContributionEqualsHazardAssumption:true,noStakeLinearityAssumption:true,noForeignCounterTransfer:true,noAutomaticBetting:true,realMoneyAllowed:false}};
process.stdout.write(`${JSON.stringify(out,null,2)}\n`);
