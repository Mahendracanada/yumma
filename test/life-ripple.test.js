const test = require('node:test');
const assert = require('node:assert/strict');
const { extractRequest, assessRisk, evaluateLifeRipple } = require('../src/agent');

test('maps a payment-pressure request across financial and essential-needs domains', () => {
  const request = extractRequest('Urgent: transfer money today to avoid a penalty.');
  const ripple = evaluateLifeRipple(request, assessRisk(request));
  assert.ok(ripple.domains.includes('financial'));
  assert.ok(ripple.domains.includes('essential_needs'));
  assert.equal(ripple.proportionality, 'pause_and_protect');
});

test('maps remote access to device control and privacy consequences', () => {
  const request = extractRequest('Support says install AnyDesk and share your screen now.');
  const ripple = evaluateLifeRipple(request, assessRisk(request));
  assert.ok(ripple.domains.includes('device_control'));
  assert.ok(ripple.domains.includes('privacy'));
});

test('links relevant personal boundary and commitment without changing them', () => {
  const request = extractRequest('Please send the OTP and transfer the money today.');
  const graph = { nodes: [
    { id: 'b1', type: 'boundary', content: 'I never share my OTP.' },
    { id: 'c1', type: 'commitment', content: 'Remind me to pause and verify with the bank.' },
    { id: 'p1', type: 'preference', content: 'I prefer tea.' }
  ] };
  const ripple = evaluateLifeRipple(request, assessRisk(request), graph);
  assert.deepEqual(ripple.matchedWisdom.map(n => n.id).sort(), ['b1', 'c1']);
});

test('benign informational request stays proportionate and non-alarmist', () => {
  const request = extractRequest('Can you explain how a bank statement works?');
  const ripple = evaluateLifeRipple(request, assessRisk(request));
  assert.equal(ripple.highestSeverity, 'none');
  assert.equal(ripple.proportionality, 'informational_only');
  assert.equal(ripple.impacts.length, 0);
});

test('every impact has a concrete proportionate intervention', () => {
  const request = extractRequest('Do not tell anyone, install this app, share your screen and enter your password now.');
  const ripple = evaluateLifeRipple(request, assessRisk(request));
  assert.ok(ripple.impacts.length >= 4);
  assert.ok(ripple.impacts.every(i => i.intervention && i.consequence));
});
