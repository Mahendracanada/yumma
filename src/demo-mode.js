'use strict';

const SCENARIOS = Object.freeze([
  { id: 'bank-transfer-pressure', title: 'Urgent bank transfer', category: 'financial-scam', message: "A caller claiming to be my bank says my account will be blocked unless I transfer my savings immediately. They said, don’t tell anyone.", expectedPosture: 'PAUSE_AND_PROTECT', learning: 'Urgency, impersonation, secrecy and money movement' },
  { id: 'otp-request', title: 'One-time code request', category: 'credential-theft', message: 'Someone claiming to be bank support urgently says my account will be blocked unless I read out the one-time password they just sent me. They told me to keep it secret.', expectedPosture: 'PAUSE_AND_PROTECT', learning: 'Credential requests and institutional impersonation' },
  { id: 'remote-access', title: 'Remote access request', category: 'device-takeover', message: 'A support agent says I must install AnyDesk and share my screen so they can protect my bank account.', expectedPosture: 'PAUSE_AND_PROTECT', learning: 'Remote access, device control and privacy consequences' },
  { id: 'family-new-number', title: 'Relative on a new number', category: 'family-impersonation', message: "Hi Mum, it's me. My phone broke so this is my new number. I'm in trouble and need AED 4,000 sent today to a friend's account. Please don't call, I can't talk right now.", expectedPosture: 'PAUSE_AND_PROTECT', learning: 'Family impersonation, new number, urgency and a third-party account' },
  { id: 'benign-information', title: 'Benign information request', category: 'control-case', message: 'Can you explain what a bank statement is and how I can read the transactions?', expectedPosture: 'INFORMATIONAL', learning: 'Proportionate handling of harmless questions' }
]);
function getScenarios() { return SCENARIOS.map(({id,title,category,expectedPosture,learning}) => ({id,title,category,expectedPosture,learning})); }
function getScenario(id) { return SCENARIOS.find(s => s.id === id) || null; }
module.exports = { getScenarios, getScenario };
