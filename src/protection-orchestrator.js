'use strict';

/** Composes Yumma's existing reasoning layers into one explainable, non-executing journey. */
function buildProtectionPlan({ request, context, risk, ripple, policy }) {
  const matchedContracts = (context.recalledContracts || []).map(c => ({
    id: c.id,
    reminder: c.commitment,
    source: c.source || 'personal_commitment',
    authorization: false
  }));

  let posture = 'INFORMATIONAL';
  let nextStep = 'Explain the request and let the person decide whether they need further help.';
  let humanConfirmationRequired = false;

  if (policy.actionBlocked || risk.level === 'HIGH') {
    posture = 'PAUSE_AND_PROTECT';
    nextStep = 'Do not proceed with the requested action. Verify independently using a trusted channel.';
    humanConfirmationRequired = true;
  } else if (risk.level === 'MEDIUM') {
    posture = 'VERIFY';
    nextStep = 'Pause and verify the request through a separately obtained trusted channel.';
    humanConfirmationRequired = true;
  } else if (matchedContracts.length) {
    posture = 'GENTLE_REMINDER';
    nextStep = 'Present the person’s own reminder and ask whether they still want to follow it.';
    humanConfirmationRequired = true;
  }

  if (request && request.detectedLanguage === 'ar') {
    nextStep = ({
      PAUSE_AND_PROTECT: 'لا تُكمل الإجراء المطلوب. تحقّق بنفسك عبر قناة موثوقة تعرفها.',
      VERIFY: 'توقّف وتحقّق من الطلب عبر قناة موثوقة تحصل عليها بنفسك.',
      GENTLE_REMINDER: 'تذكيرك الذي كتبته بنفسك أمامك؛ هل ما زلت تريد اتباعه؟',
      INFORMATIONAL: 'أشرح لك الطلب، والقرار لك دائماً.'
    })[posture] || nextStep;
  }

  const ifAlreadyActed = posture === 'PAUSE_AND_PROTECT' || posture === 'VERIFY'
    ? (request && request.detectedLanguage === 'ar'
      ? 'إذا كانت الأموال قد حُوّلت أو شاركت رمزاً: اتصل بالبنك فوراً على الرقم المطبوع على بطاقتك، ثم أبلغ الشرطة: أمان 800 2626 (أبوظبي)، أو ecrime.ae (دبي)، أو 999 في حالات الطوارئ.'
      : 'If money has already moved or a code was shared: call your bank now on the number printed on your card, then report it to the police: Aman 800 2626 (Abu Dhabi), ecrime.ae (Dubai), or 999 in an emergency.')
    : null;
  const matchedDomains = Array.isArray(ripple.domains) ? ripple.domains : [];
  const reasons = (risk.reasons || []).map(x => x.reason);
  const limitations = [
    'Risk and consequence analysis use deterministic demo rules.',
    'Personal context is synthetic in this demonstration.',
    'No external action, transaction, message or contact is executed.'
  ];

  return Object.freeze({
    version: '0.9.0',
    posture,
    ifAlreadyActed,
    stages: [
      { name: 'Understand', status: request.needsClarification ? 'needs_clarification' : 'complete' },
      { name: 'Remember', status: matchedContracts.length ? 'matched' : 'no_recall' },
      { name: 'Assess risk', status: risk.level.toLowerCase(), score: risk.score },
      { name: 'Map consequences', status: matchedDomains.length ? 'mapped' : 'no_rule_match', domains: matchedDomains },
      { name: 'Apply policy', status: policy.decision, actionBlocked: policy.actionBlocked },
      { name: 'Ask the person', status: humanConfirmationRequired ? 'confirmation_required' : 'person_remains_in_control' }
    ],
    matchedContracts,
    riskReasons: reasons,
    consequenceDomains: matchedDomains,
    nextStep,
    humanConfirmationRequired,
    authorizationGranted: false,
    externalActionTaken: false,
    limitations
  });
}

module.exports = { buildProtectionPlan };
