import {discoverBetfairSportingStakeMenuCandidates} from './betfair-sporting-stake-menu-har-discovery-v1.mjs';

const VERSION='betfair-apmccoy-served-stake-review-v1';
const CONTRACT_REVISION='v1.1-code-owned-artifact-identity';
const GAME_ID='ap-mccoy-sporting-legends-cptn';
const SHA=/^[0-9a-f]{40}$/;
// Future entries map review commit -> exact canonical served-stake identity.
// Empty until a real current AP McCoy passive HAR stake menu is independently reviewed.
const APPROVED_STAKE_REVIEWS=new Map();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,contractRevision:CONTRACT_REVISION,valid:false,reason,stakeAtDecisionExactVerified:false,servedStakeMenuSemanticsVerified:false,reviewApproved:false,usableForExecution:false,execution:execution(),...extra};}
function artifactIdentity(v){return JSON.stringify([
  GAME_ID,text(v?.sourceName),text(v?.reviewCandidate?.endpoint),text(v?.reviewCandidate?.normalizedKey),text(v?.reviewCandidate?.objectPath),
  Array.isArray(v?.servedTotalStakeValuesEUR)?v.servedTotalStakeValuesEUR.map(finite):null,finite(v?.selectedStakeEUR),finite(v?.minimumServedTotalStakeEUR)
]);}
export function isApprovedBetfairApMcCoyServedStakeReviewCommit(value){const s=text(value)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_STAKE_REVIEWS.has(s);}
export function isApprovedBetfairApMcCoyServedStakeReviewArtifact(review){const commit=text(review?.reviewCommit)?.toLowerCase();if(!commit||!SHA.test(commit))return false;const expected=APPROVED_STAKE_REVIEWS.get(commit);return !!expected&&expected===artifactIdentity(review);}

export function reviewBetfairApMcCoyServedStake(har,{sourceName='apmccoy-current.har',reviewCommit,requiredStakeEUR=null}={}){
  const discovery=discoverBetfairSportingStakeMenuCandidates(har,{gameId:GAME_ID,sourceName});
  if(discovery?.valid!==true)return fail('STAKE_DISCOVERY_FAILED',{sourceName,discoveryReason:discovery?.reason||null});
  const menus=Array.isArray(discovery.strongTotalStakeMenuCandidates)?discovery.strongTotalStakeMenuCandidates:[];
  if(!menus.length)return fail('EXPLICIT_TOTAL_STAKE_MENU_CANDIDATE_REQUIRED',{sourceName,candidateCount:discovery.candidateCount||0,observedNormalizedKeys:discovery.observedNormalizedKeys||[]});
  const semanticFingerprints=[...new Set(menus.map(x=>JSON.stringify([x.endpoint,x.normalizedKey,x.objectPath,x.numericValues])) )];
  if(semanticFingerprints.length!==1)return fail('AMBIGUOUS_EXPLICIT_TOTAL_STAKE_MENUS',{sourceName,strongTotalStakeMenuCandidateCount:menus.length});
  const menu=menus[0],values=(menu.numericValues||[]).map(finite).filter(v=>v!==null&&v>0).sort((a,b)=>a-b);
  if(!values.length)return fail('EMPTY_OR_INVALID_TOTAL_STAKE_MENU',{sourceName});
  const required=finite(requiredStakeEUR);
  if(required!==null&&(!(required>0)||!values.some(v=>Math.abs(v-required)<1e-12)))return fail('REQUIRED_STAKE_NOT_IN_SERVED_TOTAL_STAKE_MENU',{sourceName,requiredStakeEUR:required,servedTotalStakeValuesEUR:values});
  const commit=text(reviewCommit)?.toLowerCase()||null;
  if(!commit||!SHA.test(commit))return fail('VALID_STAKE_REVIEW_COMMIT_SHA_REQUIRED',{sourceName,servedTotalStakeValuesEUR:values,reviewCandidate:{endpoint:menu.endpoint,normalizedKey:menu.normalizedKey,objectPath:menu.objectPath}});
  const selectedStakeEUR=required??values[0];
  const normalized={sourceName,reviewCandidate:{endpoint:menu.endpoint,normalizedKey:menu.normalizedKey,objectPath:menu.objectPath},servedTotalStakeValuesEUR:values,selectedStakeEUR,minimumServedTotalStakeEUR:values[0]};
  const identity=artifactIdentity(normalized),approvedIdentity=APPROVED_STAKE_REVIEWS.get(commit);
  if(!approvedIdentity)return fail('STAKE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{sourceName,reviewCommit:commit,servedTotalStakeValuesEUR:values,reviewCandidate:normalized.reviewCandidate});
  if(approvedIdentity!==identity)return fail('STAKE_REVIEW_ARTIFACT_IDENTITY_MISMATCH',{sourceName,reviewCommit:commit,reviewArtifactIdentity:identity});
  return {
    version:VERSION,contractRevision:CONTRACT_REVISION,valid:true,reason:'INDEPENDENT_AP_MCCOY_SERVED_TOTAL_STAKE_REVIEW_APPROVED_EXACT_IDENTITY',gameId:GAME_ID,reviewCommit:commit,reviewArtifactIdentity:identity,...normalized,
    servedStakeMenuSemanticsVerified:true,stakeAtDecisionExactVerified:true,reviewApproved:true,usableForExecution:false,
    scientificUse:'Promotion gate from passive AP McCoy server-response stake discovery to an exact served total-stake fact. The review commit is bound to the exact source/menu semantic fingerprint, complete served EUR stake list and selected stake. An approved SHA cannot be reused for a different menu, endpoint, stake list or selected stake.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,exactApMcCoyGameIdPinned:true,serverResponseEvidenceOnly:true,explicitTotalStakeMenuArrayRequired:true,codeOwnedReviewArtifactIdentity:true,reviewAllowlistCurrentlyEmpty:APPROVED_STAKE_REVIEWS.size===0,approvedShaCannotBeReusedWithAlteredStakeArtifact:true,clientSelectedValuesIgnored:true,genericStakeFieldsRejectedForApproval:true,componentFieldsRejectedForApproval:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
