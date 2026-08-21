import assert from 'node:assert/strict';
import {visibleTextFromHtml,extractEuroAmounts,amountMatchesWindow,classifyVisibleBinding} from '../casino/jackpots/tiki-zero-reset-visible-amount-binding-v1.mjs';

{
  const html='<html><body><script>const fake="11,43 €"</script><style>.x{content:"11,43 €"}</style><div>Bote actual: 11,43 €</div></body></html>';
  const text=visibleTextFromHtml(html);
  assert.equal(text.includes('fake'),false);
  assert.deepEqual(extractEuroAmounts(text),[11.43]);
}
{
  assert.deepEqual(extractEuroAmounts('A 10,22 € B 10.25€ C € 999.99'),[10.22,10.25,999.99]);
}
{
  assert.deepEqual(amountMatchesWindow([11.39,11.40,11.43,11.48],11.40,11.45,3),[11.39,11.40,11.43,11.48]);
  assert.deepEqual(amountMatchesWindow([11.30,11.50],11.40,11.45,2),[]);
}
{
  const rows=[
    {slug:'a',role:'PRIMARY_TARGET',windowMatchesEUR:[11.43]},
    {slug:'b',role:'OFFICIAL_SHARED_NETWORK',windowMatchesEUR:[11.44]},
    {slug:'c',role:'ZERO_RESET_CONTROL',windowMatchesEUR:[]}
  ];
  const x=classifyVisibleBinding(rows);
  assert.equal(x.exclusiveNetworkSignal,true);
  assert.equal(x.allSharedTargetsHit,true);
  assert.equal(x.identityVerified,false);
  assert.equal(x.requiresSecondFrozenReplication,true);
}
{
  const rows=[
    {slug:'a',role:'PRIMARY_TARGET',windowMatchesEUR:[11.43]},
    {slug:'c',role:'ZERO_RESET_CONTROL',windowMatchesEUR:[11.43]}
  ];
  const x=classifyVisibleBinding(rows);
  assert.equal(x.exclusiveNetworkSignal,false);
  assert.equal(x.requiresSecondFrozenReplication,false);
}
console.log('tiki-zero-reset-visible-amount-binding-v1.test.mjs: PASS');
