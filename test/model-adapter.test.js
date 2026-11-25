const test = require('node:test');
const assert = require('node:assert/strict');
const { ModelAdapter, makeModelInput, validateModelSuggestion } = require('../src/model-adapter');

const base = {
  message: 'Please help me understand this message.',
  risk: { level: 'HIGH', score: 80, reasons: [{ reason: 'Pressure language' }] },
  policy: { decision: 'DENY_SYNTHETIC_ACTION', actionBlocked: true },
  context: { relevantPreferences: ['plain language'] }
};

test('model adapter stays disabled when no provider is configured', async () => {
  const result = await new ModelAdapter().explain(base);
  assert.equal(result.status, 'not_configured');
  assert.equal(result.suggestion, null);
});

test('model input carries policy as read-only context and bounds message size', () => {
  const input = makeModelInput({ ...base, message: 'x'.repeat(9000) });
  assert.equal(input.message.length, 8000);
  assert.equal(input.actionBlocked, true);
  assert.equal(input.task, 'draft_explanation_only');
});

test('adapter accepts explanation only and strips attempted tool instructions', async () => {
  const adapter = new ModelAdapter({ provider: 'test-double', generate: async () => ({
    explanation: 'Pause and verify independently.', tool: 'transfer_money', authorize: true
  }) });
  const result = await adapter.explain(base);
  assert.equal(result.status, 'suggestion_only');
  assert.deepEqual(result.suggestion, { explanation: 'Pause and verify independently.' });
  assert.equal(result.suggestion.authorize, undefined);
});

test('invalid or oversized model output is rejected', () => {
  assert.throws(() => validateModelSuggestion({ explanation: '' }), /empty/);
  assert.throws(() => validateModelSuggestion({ explanation: 'x'.repeat(2401) }), /size limit/);
  assert.throws(() => validateModelSuggestion('just text'), /object/);
});

test('model failure cannot change the deterministic policy result', async () => {
  const adapter = new ModelAdapter({ provider: 'test-double', generate: async () => { throw new Error('provider unavailable'); } });
  await assert.rejects(adapter.explain(base), /provider unavailable/);
  assert.equal(base.policy.decision, 'DENY_SYNTHETIC_ACTION');
  assert.equal(base.policy.actionBlocked, true);
});

test('rejects model explanations that instruct credential disclosure or money movement', () => {
  assert.throws(() => validateModelSuggestion({ explanation: 'Please share your OTP with the caller.' }), /disallowed/);
  assert.throws(() => validateModelSuggestion({ explanation: 'Transfer the money immediately.' }), /disallowed/);
  assert.throws(() => validateModelSuggestion({ explanation: 'Enable remote access for the support agent.' }), /disallowed/);
});

test('allows calm verification guidance', () => {
  const result = validateModelSuggestion({ explanation: 'Pause and contact your bank using the number on your card.' });
  assert.equal(result.explanation, 'Pause and contact your bank using the number on your card.');
});
