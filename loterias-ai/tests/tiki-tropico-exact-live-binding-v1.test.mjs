import assert from 'node:assert/strict';
import { summarizeTikiBinding } from '../casino/jackpots/tiki-tropico-exact-live-binding-v1.mjs';

const row=(role,ids=[],param=false,jackpot=null)=>({role,pageLiteralIdHits:ids.map(id=>({id})),stateBlobLiteralIdHits:[],scriptResults:param?[{literalIdHits:[],paramHits:[{}]}]:[],pageParamHits:[],graphql:{data:{jackpot}}});

{
  const s=summarizeTikiBinding([row('PRIMARY_TARGET',['tikitemple2_1']),row('ZERO_RESET_CONTROL',[]),row('ZERO_RESET_CONTROL',[])]);
  assert.deepEqual(s.strongExclusiveCandidates,['tikitemple2_1']);
  assert.equal(s.identityVerified,false);
  assert.equal(s.requiresSecondFrozenReplication,true);
}
{
  const s=summarizeTikiBinding([row('PRIMARY_TARGET',['tikitemple2_1']),row('ZERO_RESET_CONTROL',['tikitemple2_1']),row('ZERO_RESET_CONTROL',[])]);
  assert.deepEqual(s.strongExclusiveCandidates,[]);
}
{
  const s=summarizeTikiBinding([row('PRIMARY_TARGET',['pool1']),row('ZERO_RESET_CONTROL',[]),row('ZERO_RESET_CONTROL',[])]);
  assert.deepEqual(s.ambiguousExclusiveCandidates,['pool1']);
  assert.deepEqual(s.strongExclusiveCandidates,[]);
  assert.equal(s.identityVerified,false);
}
{
  const s=summarizeTikiBinding([row('PRIMARY_TARGET',[],true),row('ZERO_RESET_CONTROL',[]),row('ZERO_RESET_CONTROL',[])]);
  assert.equal(s.parameterizedQuerySpecificToPrimary,true);
  assert.equal(s.identityVerified,false);
}
{
  const s=summarizeTikiBinding([row('PRIMARY_TARGET',[],true),row('ZERO_RESET_CONTROL',[],true),row('ZERO_RESET_CONTROL',[])]);
  assert.equal(s.parameterizedQuerySpecificToPrimary,false);
}
console.log('tiki-tropico-exact-live-binding-v1.test.mjs: PASS');
