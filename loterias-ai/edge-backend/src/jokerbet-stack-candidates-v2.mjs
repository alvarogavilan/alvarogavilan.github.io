import { JOKERBET_STACK_CANDIDATES as V1_CANDIDATES,JOKERBET_STACK_TERMS as V1_TERMS } from './jokerbet-stack-candidates-v1.mjs';

const HIGH_RTP_SOURCE='https://www.jokerbet.es/tragaperras-slots/mayor-mas-mejor-rtp.html';

export const JOKERBET_HIGH_RTP_CURRENT=[
  {
    id:'jokerbet:codex-of-fortune',
    game:'Codex of Fortune',provider:'NetEnt',minStakeEUR:0.20,maxStakeEUR:4,
    pageRtp:0.98,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    currentTitlePageResolved:true,rulesFingerprintVerified:false,bonusBalanceAllowed:false,
    sourceUrls:[HIGH_RTP_SOURCE,'https://www.jokerbet.es/tragaperras-slots/codex-of-fortune.html'],
    notes:[
      'Current JOKERBET high-RTP ranking publishes 98.00% RTP and ranks Codex of Fortune first.',
      'The current title page independently publishes NetEnt, 98.00% RTP, 0.20 EUR minimum stake and 4 EUR maximum stake.',
      'The title page exposes a Jackpot Temperature field but the public text does not resolve its value; operator-jackpot eligibility/probability must not be assumed.',
      'The title page says the selected slot does not accept bonus balance, so bonus-funded stack assumptions are forbidden.',
      'Exact downloadable rules/configuration fingerprint is not yet resolved; this is a high-priority screen, not an execution identity.'
    ]
  },
  {
    id:'jokerbet:book-of-aztec',
    game:'Book of Aztec',provider:'Amatic',minStakeEUR:0.10,maxStakeEUR:5,
    pageRtp:0.9763,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    currentTitlePageResolved:true,rulesFingerprintVerified:false,bonusBalanceAllowed:null,
    sourceUrls:[HIGH_RTP_SOURCE,'https://www.jokerbet.es/tragaperras-slots/book-of-aztec.html'],
    notes:[
      'Current JOKERBET high-RTP ranking publishes 97.63% RTP.',
      'The current title page independently publishes Amatic, 97.63% RTP, 0.10 EUR minimum stake and 5 EUR maximum stake.',
      'The public text does not resolve Jackpot Temperature; operator-jackpot eligibility/probability must not be assumed.',
      'Exact rules/configuration fingerprint remains unresolved.'
    ]
  },
  {
    id:'jokerbet:book-of-aztec-select',
    game:'Book Of Aztec Select',provider:'Amatic',minStakeEUR:0.10,maxStakeEUR:5,
    pageRtp:0.9763,providerProgressiveContribution:null,declaredRtpIncludingProviderContribution:null,
    providerProgressive:null,operatorJackpotTemperature:null,operatorJackpotEligibilityVerified:false,
    currentTitlePageResolved:true,rulesFingerprintVerified:false,bonusBalanceAllowed:null,
    sourceUrls:[HIGH_RTP_SOURCE,'https://www.jokerbet.es/tragaperras-slots/book-of-aztec-select.html'],
    notes:[
      'Current JOKERBET high-RTP ranking publishes 97.63% RTP.',
      'The current title page resolves the title/provider and 0.10 EUR minimum / 5 EUR maximum stake; exact rules fingerprint and jackpot temperature remain unresolved.'
    ]
  }
];

export const JOKERBET_STACK_CANDIDATES_V2=[...JOKERBET_HIGH_RTP_CURRENT,...V1_CANDIDATES];

export const JOKERBET_STACK_TERMS_V2={
  ...V1_TERMS,
  evidenceAsOf:'2026-08-24',
  cashbackPlus:{
    ...V1_TERMS.cashbackPlus,
    rolloverX:50,
    sourceUrl:'https://www.jokerbet.es/promociones/bono-cashback-semanal.html',
    correction:'Current casino/slots PLUS terms require x50 rollover; x10 applies to sports PLUS, not casino/slots.'
  },
  guards:{
    highRtpRankingIsScreenNotRulesFingerprint:true,
    jackpotTemperatureMissingCannotMeanEligible:true,
    bonusBalanceRestrictionMustBeRespected:true,
    cashbackCasinoPlusRolloverIs50x:true
  }
};
