#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

const FILE='loterias-ai/casino/lightning/evidence/economic-number-selection-prospective-freeze-v1.json';
const EXPECTED_GIT_BLOB='068be309acc7d7828514e3562f93a81c3ed3eeeb';
const EXPECTED_START='2026-08-17T22:30:00Z';
const EXPECTED_SOURCE_COMMIT='cad105e834a88d378b5be21781f6ea9bb0836424';
const EXPECTED_SOURCE_FINGERPRINT='5492ef21fe2072d114b3084df798a947e062c9ca607b43b845e9693cccbc1e10';

const raw=fs.readFileSync(FILE);
const gitHeader=Buffer.from(`blob ${raw.length}\0`);
const gitBlob=crypto.createHash('sha1').update(gitHeader).update(raw).digest('hex');
if(gitBlob!==EXPECTED_GIT_BLOB)throw new Error(`NUMBER_FREEZE_MUTATED expected=${EXPECTED_GIT_BLOB} actual=${gitBlob}`);
const f=JSON.parse(raw.toString('utf8'));
if(f.version!=='economic-number-selection-prospective-freeze-v1')throw new Error('NUMBER_FREEZE_VERSION_CHANGED');
if(f.mode!=='PAPER_ONLY')throw new Error('NUMBER_FREEZE_MODE_CHANGED');
if(f.registeredFromMain!==EXPECTED_SOURCE_COMMIT)throw new Error('NUMBER_FREEZE_SOURCE_COMMIT_CHANGED');
if(f.registeredCorpus?.authoritativeRounds!==2103||f.registeredCorpus?.fingerprint!==EXPECTED_SOURCE_FINGERPRINT)throw new Error('NUMBER_FREEZE_SOURCE_BOUNDARY_CHANGED');
if(f.prospectiveStartsAt!==EXPECTED_START)throw new Error('NUMBER_FREEZE_START_CHANGED');
if(f.candidateFamily?.totalCandidates!==132||f.candidateFamily?.candidatesPerCoverage!==66)throw new Error('NUMBER_FREEZE_FAMILY_SIZE_CHANGED');
if(JSON.stringify(f.candidateFamily?.coverages)!==JSON.stringify([3,4]))throw new Error('NUMBER_FREEZE_COVERAGES_CHANGED');
if(JSON.stringify(f.candidateFamily?.modes)!==JSON.stringify(['hot','cold','recent','notRecent','transition','wheelLast']))throw new Error('NUMBER_FREEZE_MODES_CHANGED');
if(JSON.stringify(f.candidateFamily?.lookbacks)!==JSON.stringify([5,8,10,12,15,20,30,50,80,120,200]))throw new Error('NUMBER_FREEZE_LOOKBACKS_CHANGED');
if(f.twoPhaseProtocol?.phaseA?.rounds!==5000||f.twoPhaseProtocol?.phaseB?.rounds!==5000||f.twoPhaseProtocol?.fixedFinalBoundary!==10000)throw new Error('NUMBER_FREEZE_BOUNDARIES_CHANGED');
if(f.twoPhaseProtocol?.phaseB?.alphaPerFinalist!==0.025||f.twoPhaseProtocol?.postBoundaryDataMayRescueV1!==false)throw new Error('NUMBER_FREEZE_CONFIRMATION_GATE_CHANGED');
if(f.guards?.noFutureLeakage!==true||f.guards?.all132CandidatesFrozenBeforeEligibleFuture!==true||f.guards?.optionalStoppingBlocked!==true)throw new Error('NUMBER_FREEZE_GUARDS_CHANGED');
if(f.promotionGate?.automaticBettingAllowed!==false||f.promotionGate?.realMoneyAllowed!==false||f.guards?.realMoneyAllowed!==false)throw new Error('NUMBER_FREEZE_REAL_MONEY_GUARD_CHANGED');
console.log(JSON.stringify({status:'NUMBER_PROSPECTIVE_FREEZE_VERIFIED',gitBlob,sourceCommit:f.registeredFromMain,sourceRounds:f.registeredCorpus.authoritativeRounds,prospectiveStartsAt:f.prospectiveStartsAt,totalCandidates:f.candidateFamily.totalCandidates,phaseA:f.twoPhaseProtocol.phaseA.rounds,phaseB:f.twoPhaseProtocol.phaseB.rounds,realMoneyAllowed:false},null,2));
