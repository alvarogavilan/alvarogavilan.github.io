import {discoverBetfairSportingStakeMenuCandidates} from './betfair-sporting-stake-menu-har-discovery-v1.mjs';

const VERSION='betfair-apmccoy-served-stake-review-v1';
const GAME_ID='ap-mccoy-sporting-legends-cptn';
const SHA=/^[0-9a-f]{40}$/;
// Empty until an exact current AP McCoy passive HAR is independently inspected and
// a dedicated review commit is explicitly pinned by a later code change.
const APPROVED_STAKE_REVIEW_COMMITS=new Set();
const finite=v=>{if(v===null||v===undefined||v===''||typeof v==='boolean')return null;const n=Number(v);return Number.isFinite(n)?n:null;};
const text=v=>typeof v==='string'&&v.trim()?v.trim():null;
function execution(){return {decision:'NO_PLAY',realMoneyAllowed:false,realStakeEUR:0,maxSpins:0,maxTotalStakeEUR:0};}
function fail(reason,extra={}){return {version:VERSION,valid:false,reason,stakeAtDecisionExactVerified:false,servedStakeMenuSemanticsVerified:false,reviewApproved:false,usableForExecution:false,execution:execution(),...extra};}
function approved(commit){const s=text(commit)?.toLowerCase();return !!s&&SHA.test(s)&&APPROVED_STAKE_REVIEW_COMMITS.has(s);}

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
  if(!approved(commit))return fail('STAKE_REVIEW_COMMIT_NOT_CODE_ALLOWLISTED',{sourceName,reviewCommit:commit,servedTotalStakeValuesEUR:values,reviewCandidate:{endpoint:menu.endpoint,normalizedKey:menu.normalizedKey,objectPath:menu.objectPath}});
  const selectedStakeEUR=required??values[0];
  return {
    version:VERSION,valid:true,reason:'INDEPENDENT_AP_MCCOY_SERVED_TOTAL_STAKE_REVIEW_APPROVED',sourceName,gameId:GAME_ID,reviewCommit:commit,
    servedTotalStakeValuesEUR:values,selectedStakeEUR,minimumServedTotalStakeEUR:values[0],
    reviewCandidate:{endpoint:menu.endpoint,normalizedKey:menu.normalizedKey,objectPath:menu.objectPath},
    servedStakeMenuSemanticsVerified:true,stakeAtDecisionExactVerified:true,reviewApproved:true,usableForExecution:false,
    scientificUse:'Promotion gate from passive AP McCoy server-response stake discovery to an exact served total-stake fact. Only an explicit total-stake menu array after the latest exact AP McCoy real-money launcher can enter. The complete semantic fingerprint must be independently inspected in a dedicated commit and that commit must later be hard-pinned in this module. Caller booleans, client POST values, generic betValues, coin values, line bets or arbitrary SHA strings cannot promote stake semantics.',
    execution:execution(),
    hardGuards:{onlineOnly:true,nonPromoOnly:true,exactApMcCoyGameIdPinned:true,serverResponseEvidenceOnly:true,explicitTotalStakeMenuArrayRequired:true,codeOwnedReviewAllowlist:true,reviewAllowlistCurrentlyEmpty:APPROVED_STAKE_REVIEW_COMMITS.size===0,clientSelectedValuesIgnored:true,genericStakeFieldsRejectedForApproval:true,componentFieldsRejectedForApproval:true,noWagerProbe:true,noAutomaticBetting:true,realMoneyAllowed:false}
  };
}
