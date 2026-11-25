const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { runSalmaJourney, ALLOWED_TOOLS } = require('./agent');
const { buildWisdomGraph } = require('./wisdom-graph');
const { createOpenAIAdapter, createModelRiskAdvisor } = require('./model-adapter');
const modelAdapter = createOpenAIAdapter();
const riskAdvisor = createModelRiskAdvisor();
async function aiRiskSignal(message) {
  if (riskAdvisor.provider !== 'none' && !aiAllowed()) {
    return { result: { status: 'daily_cap_reached', provider: riskAdvisor.provider, signal: null, latencyMs: 0 }, signal: null };
  }
  const result = await riskAdvisor.classify(message);
  return { result, signal: result.status === 'signal' ? result.signal : null };
}
function aiRiskSummary(result) {
  return { status: result.status, provider: result.provider, authority: 'may_raise_risk_only', applied: false, latencyMs: result.latencyMs ?? null };
}
const { MemoryStore } = require('./memory');
const { ConversationSessions } = require('./conversation-session');
const { CalmContractStore } = require('./calm-contract');
const { buildProtectionPlan } = require('./protection-orchestrator');
const { getScenarios, getScenario } = require('./demo-mode');
const { FamilyCheckStore } = require('./family-check');
const { Trace, DecisionLog, redact, sha256 } = require('./trace');

// ---- Configuration (see .env.example). Defaults run the local, single-user demo.
const DATA_DIR = process.env.YUMMA_DATA_DIR || path.join(__dirname, '..', 'data');
const JUDGE_MODE = process.env.YUMMA_JUDGE_MODE === 'on';
const JUDGE_ACCESS_CODE = process.env.JUDGE_ACCESS_CODE || '';
const TRUST_PROXY = process.env.TRUST_PROXY === '1' || JUDGE_MODE;
const HOST = process.env.HOST || (JUDGE_MODE ? '0.0.0.0' : '127.0.0.1');
const AI_DAILY_CAP = Math.max(0, Number(process.env.YUMMA_AI_DAILY_CAP || 2000));
const MAX_JUDGE_PROFILES = 1000;
const LOG_TRACES = process.env.YUMMA_LOG_TRACES !== 'off';
if (JUDGE_MODE && JUDGE_ACCESS_CODE.length < 12) {
  console.error('Judge mode needs JUDGE_ACCESS_CODE of at least 12 characters. Yumma did not start.');
  process.exit(1);
}
const familyCheckStore = new FamilyCheckStore(path.join(DATA_DIR, 'family-checks.json'));
const conversationSessions = new ConversationSessions();
const calmContractStore = new CalmContractStore(path.join(DATA_DIR, 'calm-contracts.json'));
const memoryStore = new MemoryStore(path.join(DATA_DIR, 'memory-store.json'));
const decisionLog = new DecisionLog(path.join(DATA_DIR, 'decision-log.jsonl'));
const DEMO_PROFILE = 'salma-demo';

// ---- Judge access: one link carries the access code; it becomes a signed, HttpOnly cookie.
const cookieKey = crypto.createHash('sha256').update('yumma-judge:' + JUDGE_ACCESS_CODE).digest();
const signSid = sid => crypto.createHmac('sha256', cookieKey).update(sid).digest('hex').slice(0, 32);
function safeEqual(a, b) { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); }
function judgeSession(req) {
  const m = /(?:^|;\s*)yumma_judge=([a-f0-9]{32})\.([a-f0-9]{32})/.exec(req.headers.cookie || '');
  return m && safeEqual(signSid(m[1]), m[2]) ? m[1] : null;
}
const seededProfiles = new Set();
function seedJudgeProfile(profileId) {
  if (seededProfiles.has(profileId)) return;
  const consent = { granted: true, purpose: 'Synthetic championship demonstration only' };
  if (!calmContractStore.list(profileId).length) {
    calmContractStore.create(profileId, { commitment: 'I will never share an OTP or transfer money under pressure.', triggers: ['otp', 'transfer', 'pressure', 'send money', 'aed'], selfAttestedCalm: true }, consent);
  }
  if (!familyCheckStore.list(profileId).length) {
    familyCheckStore.create(profileId, { question: 'What did we call Grandma’s old green car?', answer: 'Turtle' }, consent);
  }
  seededProfiles.add(profileId);
}
/** The profile a request may use: the shared synthetic profile locally, a private one per judge. */
function profileFor(req) { return JUDGE_MODE && req.judgeSid ? `judge-${req.judgeSid.slice(0, 20)}` : DEMO_PROFILE; }
function clientKey(req) {
  const fwd = TRUST_PROXY ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  return fwd || req.socket.remoteAddress || 'local';
}

// ---- AI daily cap: past the cap the deterministic rules carry on alone.
const aiUsage = { day: '', calls: 0 };
function aiAllowed() {
  const day = new Date().toISOString().slice(0, 10);
  if (aiUsage.day !== day) { aiUsage.day = day; aiUsage.calls = 0; }
  if (aiUsage.calls >= AI_DAILY_CAP) return false;
  aiUsage.calls += 1; return true;
}

// ---- Trace helpers
function finishAssessmentTrace(trace, { req, message, assessment, aiResult, explanation }) {
  const record = decisionLog.append({
    profile: profileFor(req), traceId: trace.id, inputSha256: sha256(message), inputChars: message.length,
    language: assessment.request?.detectedLanguage, posture: assessment.protectionPlan?.posture,
    riskLevel: assessment.risk?.level, score: assessment.risk?.score,
    patterns: (assessment.risk?.matchedPatterns || []).map(p => p.id),
    aiSignal: aiResult ? { status: aiResult.status, applied: Boolean(assessment.risk?.modelSignal?.applied) } : null,
    promisesRecalled: (assessment.context?.recalledContracts || []).length,
    familyCheckOffered: Boolean(assessment.familyCheck?.applies), explanationSource: explanation || 'deterministic_policy_guidance'
  });
  trace.step('write_decision_record', { recordId: record.id, seq: record.seq, hash: record.hash.slice(0, 16), chainedTo: record.prevHash.slice(0, 16) });
  trace.step('output', { posture: assessment.protectionPlan?.posture, authorizationGranted: false, externalActionTaken: false });
  const json = trace.toJSON();
  if (LOG_TRACES) console.log('[yumma-trace] ' + JSON.stringify({ ...json, input: redact(message), profile: profileFor(req) }));
  return { trace: json, decisionRecord: record };
}
const root = path.join(__dirname, '..', 'public');
const packageInfo = require('../package.json');

const requestWindows = new Map();
const RATE_LIMIT = 120;
const RATE_WINDOW_MS = 60_000;
const MAX_TRACKED_CLIENTS = 5000;
function applyRateLimit(key, now = Date.now()) {
  let window = requestWindows.get(key);
  if (!window || now - window.startedAt >= RATE_WINDOW_MS) {
    requestWindows.set(key, { startedAt: now, count: 1 });
    return true;
  }
  window.count += 1;
  if (window.count > RATE_LIMIT) return false;
  return true;
}
function send(res, status, payload, type='application/json') {
  res.writeHead(status, {
    'content-type': type,
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'DENY',
    'referrer-policy': 'no-referrer',
    'permissions-policy': 'camera=(), geolocation=(), payment=(), usb=()',
    'cross-origin-resource-policy': 'same-origin',
    'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  });
  res.end(type === 'application/json' ? JSON.stringify(payload) : payload);
}
function judgeGate(req, res) {
  const url = new URL(req.url, 'http://yumma.local');
  if (url.pathname === '/api/health') return true;
  const code = url.searchParams.get('access');
  if (code !== null) {
    if (!safeEqual(code, JUDGE_ACCESS_CODE) && !safeEqual(code.replace(/ /g, '+'), JUDGE_ACCESS_CODE)) { send(res, 401, JUDGE_DENIED_PAGE, 'text/html; charset=utf-8'); return false; }
    const sid = crypto.randomBytes(16).toString('hex');
    res.writeHead(302, { location: '/', 'cache-control': 'no-store',
      'set-cookie': `yumma_judge=${sid}.${signSid(sid)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=1209600` });
    res.end(); return false;
  }
  req.judgeSid = judgeSession(req);
  if (!req.judgeSid) {
    if (url.pathname.startsWith('/api/')) send(res, 401, { error: 'This judge link needs its access code. Please open the full link from the submission.' });
    else send(res, 401, JUDGE_DENIED_PAGE, 'text/html; charset=utf-8');
    return false;
  }
  const profile = profileFor(req);
  if (!seededProfiles.has(profile) && seededProfiles.size >= MAX_JUDGE_PROFILES) { send(res, 503, { error: 'The judge demo is at capacity. Please retry shortly.' }); return false; }
  seedJudgeProfile(profile);
  return true;
}
const JUDGE_DENIED_PAGE = '<!doctype html><meta charset="utf-8"><title>Yumma judge link</title><body style="font-family:system-ui;background:#041916;color:#F6F7F1;padding:48px;max-width:640px"><h1 style="color:#CFAE64">Yumma</h1><p>This is the Create AI Agents Championship judge link for Yumma. Please open it with the full link from the submission, which includes the access code.</p></body>';
const server = http.createServer((req, res) => {
  if (JUDGE_MODE && !judgeGate(req, res)) return;
  if (req.url.startsWith('/api/')) {
    const key = clientKey(req);
    const now = Date.now();
    if (requestWindows.size > MAX_TRACKED_CLIENTS) {
      for (const [client, entry] of requestWindows) {
        if (now - entry.startedAt >= RATE_WINDOW_MS) requestWindows.delete(client);
      }
    }
    if (requestWindows.size >= MAX_TRACKED_CLIENTS && !requestWindows.has(key)) {
      return send(res, 503, {error: 'Local demo is temporarily busy. Please retry shortly.'});
    }
    if (!applyRateLimit(key, now)) return send(res, 429, {error: 'Too many requests. Please wait and try again.'});
  }
  if (req.method === 'GET' && req.url === '/api/health') {
    return send(res, 200, {
      status: 'ok', service: 'yumma-local-prototype', version: packageInfo.version,
      mode: 'synthetic_demo', node: process.version,
      languageModel: { configured: modelAdapter.provider !== 'none', provider: modelAdapter.provider },
      aiRiskSignal: { configured: riskAdvisor.provider !== 'none', provider: riskAdvisor.provider, authority: 'may_raise_risk_only' },
      externalIntegrations: false, externalActionsEnabled: false,
      dataClassification: 'synthetic_demo_data'
    });
  }
  if (req.method === 'GET' && req.url === '/api/readiness') {
    return send(res, 200, {
      readyForLocalDemo: true, readyForPublicProduction: false, version: packageInfo.version,
      checks: {
        localRuntime: true, syntheticProfile: true, deterministicPolicy: true, judgeScenarios: true,
        liveLanguageModel: modelAdapter.provider !== 'none', aiRiskSignal: riskAdvisor.provider !== 'none', productionIdentityAndAccess: false,
        productionSecureStorage: false, independentSecurityAssessment: false,
        externalIntegrations: false, androidBuildVerified: false
      },
      notes: [
        'This readiness endpoint describes the local synthetic prototype only.',
        'Do not enter real sensitive personal or financial information.',
        'Android build and production security have not been verified.'
      ]
    });
  }
  if (req.method === 'GET' && req.url === '/api/demo/scenarios') return send(res, 200, { scenarios: getScenarios() });
  if (req.method === 'POST' && req.url === '/api/demo/reset') {
    let body = ''; req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on('end', () => { try { const { sessionId } = JSON.parse(body || '{}'); if (typeof sessionId === 'string') conversationSessions.sessions.delete(sessionId); return send(res, 200, { reset: true }); } catch { return send(res, 400, { error: 'Invalid reset request.' }); } });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/demo/run') {
    let body = ''; req.on('data', c => { body += c; if (body.length > 2000) req.destroy(); });
    req.on('end', () => { try { const { scenarioId } = JSON.parse(body || '{}'); const scenario = getScenario(scenarioId); if (!scenario) return send(res, 404, { error: 'Unknown demo scenario.' }); const assessment = runSalmaJourney(scenario.message, { familyQuestions: familyCheckStore.list(profileFor(req)) }); return send(res, 200, { scenario: { id: scenario.id, title: scenario.title, learning: scenario.learning, expectedPosture: scenario.expectedPosture }, assessment, checks: { postureMatchesExpected: assessment.protectionPlan.posture === scenario.expectedPosture, authorizationGranted: assessment.protectionPlan.authorizationGranted, externalActionTaken: assessment.protectionPlan.externalActionTaken } }); } catch { return send(res, 400, { error: 'Unable to run demo scenario.' }); } });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/conversation') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        if (typeof input.message !== 'string' || !input.message.trim()) return send(res, 400, { error: 'Please enter a message for Yumma.' });
        const session = conversationSessions.getOrCreate(input.sessionId);
        const message = input.message.trim().slice(0, 2000);
        const previous = session.previousAssessment;
        const followUp = Boolean(previous && /^(why|how|what|can you explain|explain|tell me more|what should i do|what now|is it safe)\b/i.test(message));
        let aiRisk = null;
        let assessment;
        let aiResult = null;
        const trace = new Trace({ kind: followUp ? 'follow_up' : 'assessment' });
        trace.step('receive_input', { chars: message.length, preview: redact(message, 80), followUp });
        if (followUp) {
          assessment = { ...previous, greeting: 'Hello again. I am here to help you think this through.' };
        } else {
          const { result, signal } = await aiRiskSignal(message);
          aiResult = result;
          trace.step('ai_risk_signal', { provider: result.provider, status: result.status, level: signal ? signal.level : null, latencyMs: result.latencyMs ?? null, authority: 'may_raise_risk_only' }, result.latencyMs ?? undefined);
          const pipeline = [];
          assessment = runSalmaJourney(message, { modelRiskSignal: signal, familyQuestions: familyCheckStore.list(profileFor(req)), trace: pipeline });
          trace.absorb(pipeline);
          aiRisk = { ...aiRiskSummary(result), applied: Boolean(assessment.risk.modelSignal && assessment.risk.modelSignal.applied) };
          assessment.audit.aiRiskSignal = aiRisk;
        }
        const profileId = profileFor(req);
        const relevantMemories = followUp ? [] : memoryStore.retrieve(profileId, message).slice(0, 5);
        const persistedContracts = followUp ? [] : calmContractStore.match(profileId, message);
        const seededContracts = followUp ? [] : (assessment.context?.recalledContracts || []).map(c => ({...c, prompt: `You asked me to remind you: “${c.commitment}” Would you still like to follow that guidance? You remain in control.`, authorization: false, canExecute: false}));
        const recalledContracts = [...seededContracts, ...persistedContracts];
        // Persisted Calm-State Contracts must enter the same protection decision
        // as profile-seeded commitments. Recall is context only: never authority.
        if (!followUp && recalledContracts.length) {
          assessment.context = {
            ...(assessment.context || { relevantPreferences: [] }),
            recalledContracts: recalledContracts.map(({id,commitment,purpose,source}) => ({
              id, commitment, purpose, source: source || 'consented_calm_state_contract'
            }))
          };
          assessment.protectionPlan = buildProtectionPlan({
            request: assessment.request, context: assessment.context, risk: assessment.risk,
            ripple: assessment.ripple, policy: assessment.policy
          });
          assessment.audit.recalledContractIds = recalledContracts.map(c => c.id);
          assessment.audit.protectionPosture = assessment.protectionPlan.posture;
          assessment.audit.externalActionTaken = false;
        }
        trace.step('recall_saved_promises', { promises: recalledContracts.length, consentedMemories: relevantMemories.length, posture: assessment.protectionPlan?.posture });
        const personalContext = {
          ...(assessment.context || { relevantPreferences: [] }),
          consentedMemories: relevantMemories.map(({id,type,content,purpose}) => ({id,type,content,purpose})),
          calmStateReminders: recalledContracts.map(({id,commitment,prompt,authorization,canExecute}) => ({id,commitment,prompt,authorization,canExecute}))
        };
        const history = session.turns.slice(-6);
        let conversation;
        try {
          const model = await modelAdapter.explain({ message, risk: assessment.risk, policy: assessment.policy,
            context: personalContext, response: assessment.response,
            conversationHistory: history, previousAssessment: followUp ? previous : null });
          conversation = model.status === 'suggestion_only'
            ? { status: model.status, provider: model.provider, explanation: model.suggestion.explanation, source: 'bounded_model_suggestion' }
            : { status: 'deterministic_fallback', provider: 'none', explanation: followUp ? `I’m referring to the request we just assessed. ${previous.response} ${previous.protectionPlan?.nextStep || ''}`.trim() : assessment.response, source: 'deterministic_policy_guidance' };
        } catch (error) {
          conversation = { status: 'provider_fallback', provider: 'none', explanation: followUp ? `I’m referring to the request we just assessed. ${previous.response} ${previous.protectionPlan?.nextStep || ''}`.trim() : assessment.response, source: 'deterministic_policy_guidance', note: error.message };
        }
        trace.step('explain', { source: conversation.source, status: conversation.status, provider: conversation.provider, fallbackReason: conversation.note || null });
        conversationSessions.addTurn(session, 'user', message);
        conversationSessions.addTurn(session, 'assistant', conversation.explanation);
        if (!followUp) conversationSessions.setAssessment(session, assessment);
        const { trace: traceJson, decisionRecord } = finishAssessmentTrace(trace, { req, message, assessment, aiResult, explanation: conversation.source });
        return send(res, 200, { trace: traceJson, decisionRecord, sessionId: session.id, turnCount: session.turns.length, isFollowUp: followUp, assessment, personalContext, conversation, aiRisk, safeguards: { aiRiskCanOnlyRaise: true, consentedMemoryOnly: true, calmStateRecallIsReminderOnly: true, recalledCommitmentCannotOverrideRisk: true, authorizationGranted: false, externalActionTaken: false } });
      } catch { return send(res, 400, { error: 'Unable to process conversation request.' }); }
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/api/assess') {
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      try {
        const input = JSON.parse(body || '{}');
        if (typeof input.message !== 'string' || !input.message.trim()) {
          return send(res, 400, {error: 'Please enter a request for Yumma to assess.'});
        }
        const message = input.message.trim().slice(0, 2000);
        const trace = new Trace();
        trace.step('receive_input', { chars: message.length, preview: redact(message, 80) });
        const { result, signal } = await aiRiskSignal(message);
        trace.step('ai_risk_signal', { provider: result.provider, status: result.status, level: signal ? signal.level : null, latencyMs: result.latencyMs ?? null, authority: 'may_raise_risk_only' }, result.latencyMs ?? undefined);
        const pipeline = [];
        const assessment = runSalmaJourney(message, { modelRiskSignal: signal, familyQuestions: familyCheckStore.list(profileFor(req)), trace: pipeline });
        trace.absorb(pipeline);
        assessment.audit.aiRiskSignal = { ...aiRiskSummary(result), applied: Boolean(assessment.risk.modelSignal && assessment.risk.modelSignal.applied) };
        const { trace: traceJson, decisionRecord } = finishAssessmentTrace(trace, { req, message, assessment, aiResult: result });
        return send(res, 200, { ...assessment, trace: traceJson, decisionRecord });
      } catch {
        return send(res, 400, {error: 'Unable to process request.'});
      }
    });
    return;
  }
  if (req.url.startsWith('/api/memory')) {
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    if (JUDGE_MODE && parts[2] && parts[2] !== DEMO_PROFILE) return send(res,403,{error:'Judges can only use their own synthetic profile.'});
    const profileId = parts[2] === DEMO_PROFILE ? profileFor(req) : parts[2];
    if (!profileId || !/^[a-zA-Z0-9_-]{1,64}$/.test(profileId)) return send(res,400,{error:'A valid profile ID is required.'});
    if (req.method === 'GET' && parts.length === 3) { const memories=memoryStore.list(profileId); return send(res,200,{memories, wisdomGraph:buildWisdomGraph(memories)}); }
    if (req.method === 'POST' && parts.length === 3) {
      let body=''; req.on('data',c=>{body+=c;if(body.length>10000)req.destroy();});
      req.on('end',()=>{try{const b=JSON.parse(body||'{}');send(res,201,{memory:memoryStore.create(profileId,b.memory,b.consent)});}
        catch(e){send(res,e.statusCode||400,{error:e.message||'Invalid request'});}});
      return;
    }
    if ((req.method === 'PATCH' || req.method === 'DELETE') && parts.length === 4) {
      let body=''; req.on('data',c=>{body+=c;if(body.length>10000)req.destroy();});
      req.on('end',()=>{try{const b=JSON.parse(body||'{}');const consent=b.consent;
        const row=req.method==='DELETE'?memoryStore.revoke(profileId,parts[3],consent):memoryStore.update(profileId,parts[3],b.patch,consent);
        send(res,200,{memory:row});}catch(e){send(res,e.statusCode||400,{error:e.message||'Invalid request'});}});
      return;
    }
    return send(res,405,{error:'Unsupported memory operation.'});
  }
  if (req.url.startsWith('/api/family-check')) {
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    if (JUDGE_MODE && parts[2] && parts[2] !== DEMO_PROFILE) return send(res,403,{error:'Judges can only use their own synthetic profile.'});
    const profileId = parts[2] === DEMO_PROFILE ? profileFor(req) : parts[2];
    if (!profileId || !/^[a-zA-Z0-9_-]{1,64}$/.test(profileId)) return send(res,400,{error:'A valid profile ID is required.'});
    if (parts[3] && !/^fvq-[a-f0-9-]{36}$/.test(parts[3])) return send(res,400,{error:'A valid family question ID is required.'});
    const readBody = (limit, fn) => { let body=''; req.on('data',c=>{body+=c;if(body.length>limit)req.destroy();});
      req.on('end',()=>{try{fn(JSON.parse(body||'{}'));}catch(e){send(res,e.statusCode||400,{error:e.message||'Invalid family question request.'});}}); };
    if (req.method === 'GET' && parts.length === 3) return send(res,200,{questions:familyCheckStore.list(profileId)});
    if (req.method === 'POST' && parts.length === 3) { readBody(4000, b => send(res,201,{question:familyCheckStore.create(profileId,b.question,b.consent)})); return; }
    if (req.method === 'POST' && parts.length === 5 && parts[4] === 'verify') { readBody(2000, b => send(res,200,familyCheckStore.verify(profileId,parts[3],b.answer))); return; }
    if (req.method === 'DELETE' && parts.length === 4) { readBody(2000, b => send(res,200,{question:familyCheckStore.revoke(profileId,parts[3],b.consent)})); return; }
    return send(res,405,{error:'Unsupported family question operation.'});
  }
  if (req.url.startsWith('/api/calm-contract')) {
    const parts = req.url.split('?')[0].split('/').filter(Boolean);
    if (JUDGE_MODE && parts[2] && parts[2] !== DEMO_PROFILE) return send(res,403,{error:'Judges can only use their own synthetic profile.'});
    const profileId = parts[2] === DEMO_PROFILE ? profileFor(req) : parts[2];
    if (!profileId || !/^[a-zA-Z0-9_-]{1,64}$/.test(profileId)) return send(res,400,{error:'A valid profile ID is required.'});
    if (req.method === 'GET' && parts.length === 3) return send(res,200,{contracts:calmContractStore.list(profileId)});
    if (req.method === 'POST' && parts.length === 3) {
      let body=''; req.on('data',c=>{body+=c;if(body.length>10000)req.destroy();});
      req.on('end',()=>{try{const b=JSON.parse(body||'{}');send(res,201,{contract:calmContractStore.create(profileId,b.contract,b.consent)});}
        catch(e){send(res,e.statusCode||400,{error:e.message||'Invalid contract request.'});}});
      return;
    }
    if (req.method === 'DELETE' && parts.length === 4) {
      let body=''; req.on('data',c=>{body+=c;if(body.length>5000)req.destroy();});
      req.on('end',()=>{try{const b=JSON.parse(body||'{}');send(res,200,{contract:calmContractStore.revoke(profileId,parts[3],b.consent)});}
        catch(e){send(res,e.statusCode||400,{error:e.message||'Invalid contract revocation.'});}});
      return;
    }
    return send(res,405,{error:'Unsupported Calm-State Contract operation.'});
  }
  if (req.method === 'GET' && req.url === '/api/decision-log/verify') {
    const v = decisionLog.verify();
    return send(res, 200, { ...v, note: 'Every decision entry carries the hash of the one before it. Changing or deleting any entry breaks the chain.' });
  }
  if (req.method === 'GET' && /^\/api\/decision-record\/dec-[a-f0-9-]{36}$/.test(req.url)) {
    const entry = decisionLog.get(req.url.split('/').pop());
    if (!entry || (JUDGE_MODE && entry.profile !== profileFor(req))) return send(res, 404, { error: 'Decision record not found.' });
    return send(res, 200, { record: entry, chain: decisionLog.verify() });
  }
  if (req.method === 'GET' && req.url === '/api/session') {
    return send(res, 200, { judgeMode: JUDGE_MODE, profile: JUDGE_MODE ? 'private synthetic judge profile' : DEMO_PROFILE, aiDailyCap: AI_DAILY_CAP, aiCallsToday: aiUsage.day === new Date().toISOString().slice(0, 10) ? aiUsage.calls : 0, syntheticDataOnly: true });
  }
  if (req.method === 'GET' && req.url === '/api/capabilities') {
    return send(res, 200, {
      agent: 'Yumma',
      mode: 'local synthetic prototype with deterministic scam-pattern rules, optional AI risk signal (raise-only) and optional bounded language-model explanation',
      languageModel: { configured: modelAdapter.provider !== 'none', provider: modelAdapter.provider, authority: 'explanation_only' },
      aiRiskSignal: { configured: riskAdvisor.provider !== 'none', provider: riskAdvisor.provider, authority: 'may_raise_risk_only' },
      capabilities: ['named UAE scam-pattern detection (19 patterns)','request extraction','profile-scoped context retrieval','Calm-State Contract recall','rule-based risk assessment','optional AI risk signal that can raise but never lower risk','multi-domain Life Ripple consequence graph with proportionate interventions','policy decision','local-only tool planning','decision audit','consented profile-scoped memory lifecycle','typed Personal Wisdom Graph with expiry and conflict flags','unified Personal Protection Orchestrator with staged decisions and explicit human-confirmation boundary','optional bounded language-model explanation with deterministic policy authority'],
      tools: ALLOWED_TOOLS,
      externalIntegrations: false
    });
  }
  let pathname;
  try { pathname = req.url === '/' ? '/index.html' : decodeURIComponent(req.url.split('?')[0]); }
  catch { return send(res, 400, 'Bad request path', 'text/plain'); }
  const file = path.resolve(root, '.' + pathname);
  if (!file.startsWith(root + path.sep) && file !== path.join(root, 'index.html')) return send(res, 403, 'Forbidden', 'text/plain');
  fs.readFile(file, (err, data) => {
    if (err) return send(res, 404, 'Not found', 'text/plain');
    const ext = path.extname(file).toLowerCase();
    const types = {'.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.html':'text/html; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
    const type = types[ext] || 'application/octet-stream';
    send(res, 200, data, type);
  });
});
const port = Number(process.env.PORT || 4173);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer between 1 and 65535.');
server.listen(port, HOST, () => console.log(`Yumma ${packageInfo.version} ${JUDGE_MODE ? 'judge mode' : 'local prototype'}: http://${HOST}:${port}  ·  AI risk signal: ${riskAdvisor.provider}${riskAdvisor.provider !== 'none' ? ` (daily cap ${AI_DAILY_CAP})` : ''}`));
