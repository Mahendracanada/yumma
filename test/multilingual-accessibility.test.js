 'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRequest, runSalmaJourney, detectLanguage } = require('../src/agent');

test('detects Arabic script without claiming general Arabic fluency', () => {
  const r = extractRequest('يرجى تحويل الأموال فوراً إلى البنك');
  assert.equal(detectLanguage('يرجى تحويل الأموال'), 'ar');
  assert.equal(r.detectedLanguage, 'ar');
  assert.equal(r.languageCoverage, 'limited_arabic_safety_lexicon');
});

test('Arabic urgent transfer request triggers high-risk protection', () => {
  const r = runSalmaJourney('البنك يقول إن حسابي سيتم حظره إذا لم أحوّل المال فوراً ولا تخبر أحداً');
  assert.equal(r.request.requestedAction, 'move_money');
  assert.equal(r.risk.level, 'HIGH');
  assert.equal(r.protectionPlan.posture, 'PAUSE_AND_PROTECT');
  assert.equal(r.protectionPlan.authorizationGranted, false);
  assert.equal(r.protectionPlan.externalActionTaken, false);
  assert.match(r.response, /لا تحوّل المال/);
});

test('Arabic OTP request is treated as credential risk', () => {
  const r = runSalmaJourney('أرسل رمز التحقق للبنك فوراً');
  assert.equal(r.request.requestedAction, 'share_credentials');
  assert.equal(r.risk.level, 'HIGH');
  assert.equal(r.protectionPlan.posture, 'PAUSE_AND_PROTECT');
});

test('Arabic ordinary informational question does not become high risk', () => {
  const r = runSalmaJourney('كيف أقرأ كشف الحساب البنكي؟');
  assert.equal(r.risk.level, 'LOW');
  assert.equal(r.protectionPlan.posture, 'INFORMATIONAL');
});
