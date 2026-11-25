const input = document.querySelector('#message');
const result = document.querySelector('#result');
const run = document.querySelector('#run');
const reset = document.querySelector('#reset');
const listenYumma = document.querySelector('#listenYumma');
const speakLast = document.querySelector('#speakLast');
const stopVoice = document.querySelector('#stopVoice');
const largeText = document.querySelector('#largeText');
const voiceStatus = document.querySelector('#voiceStatus');
let lastYummaResponse = '';
const conversationSessionId = (() => { try { return sessionStorage.getItem('yummaa-demo-session') || (() => { const id=crypto.randomUUID(); sessionStorage.setItem('yummaa-demo-session',id); return id; })(); } catch { return crypto.randomUUID(); } })();
if (largeText) largeText.addEventListener('click', () => { const on=document.body.classList.toggle('large-type'); largeText.setAttribute('aria-pressed', String(on)); });
if (stopVoice) stopVoice.addEventListener('click', () => { if ('speechSynthesis' in window) speechSynthesis.cancel(); voiceStatus.textContent='Voice playback stopped.'; });
if (speakLast) speakLast.addEventListener('click', () => { if (!lastYummaResponse) { voiceStatus.textContent='Ask Yumma to assess a request first.'; return; } if (!('speechSynthesis' in window)) { voiceStatus.textContent='Speech playback is not supported by this browser.'; return; } speechSynthesis.cancel(); const utterance=new SpeechSynthesisUtterance(lastYummaResponse); utterance.lang='en-GB'; utterance.onstart=()=>voiceStatus.textContent='Yumma is speaking.'; utterance.onend=()=>voiceStatus.textContent='Yumma has finished speaking.'; speechSynthesis.speak(utterance); });
const example = 'Your bank account will be blocked. Transfer your money immediately to this secure account. Keep this secret.';
const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// ---- v2.9 visual layer: icons, Yumma's portrait, voice waveform and risk gauge
const ICON_PATHS = {
  mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v4M8.5 21h7"/>',
  message: '<path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L3.5 20l1.4-4.7a8 8 0 1 1 15.6-3.8z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
  shield: '<path d="M12 2.8l7.5 3v5.8c0 4.8-3.2 8.3-7.5 9.6-4.3-1.3-7.5-4.8-7.5-9.6V5.8z"/><path d="M8.8 12l2.2 2.2 4.3-4.5"/>',
  wave: '<path d="M3 12v0M6.5 9v6M10 5.5v13M13.5 8v8M17 10v4M20.5 11.5v1"/>',
  family: '<circle cx="6.5" cy="6.5" r="2.4"/><circle cx="17.5" cy="6.5" r="2.4"/><circle cx="12" cy="11.6" r="1.9"/><path d="M2.5 19.5v-2.2a4 4 0 0 1 6.4-3.2M21.5 19.5v-2.2a4 4 0 0 0-6.4-3.2M8.6 20.5v-.8a3.4 3.4 0 0 1 6.8 0v.8"/>',
  moon: '<path d="M19.5 14.6A7.8 7.8 0 1 1 9.4 4.5a6.1 6.1 0 0 0 10.1 10.1z"/><path d="M17 3.5v2.4M15.8 4.7h2.4"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4.2-5.2"/><path d="M12 17h.01"/>',
  heart: '<path d="M12 20.3s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.6c0 5.8-7.5 10.4-7.5 10.4z"/>',
  alert: '<path d="M12 3.2l9.3 16.3H2.7z"/><path d="M12 9.5v4.5M12 17h.01"/>',
  ripple: '<circle cx="12" cy="12" r="2"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="9"/>',
  scale: '<path d="M12 3.5v17M7 20.5h10M4.5 7h15"/><path d="M4.5 7L2 13a2.6 2.6 0 0 0 5 0zM19.5 7L17 13a2.6 2.6 0 0 0 5 0z"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.3a3.5 3.5 0 0 1 7 0v3.2M12 14.5v2"/>',
  doc: '<path d="M6.5 2.8h8l4 4v14.4h-12z"/><path d="M14 2.8v4.5h4.5M9.5 12.5h6M9.5 16h6"/>',
  steps: '<circle cx="5" cy="5.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="18.5" r="2"/><path d="M6.6 7.1l3.8 3.4M13.6 13.6l3.8 3.4"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8 5.2-5.6"/>'
};
const ico = name => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
const medal = name => `<span class="medal">${ico(name)}</span>`;
const WAVEFORM = (() => {
  let bars = '';
  for (let i = 0; i < 44; i++) {
    const h = Math.max(4, Math.min(36, Math.round(5 + 30 * Math.abs(Math.sin(i * 0.52) * Math.cos(i * 0.19) + 0.18 * Math.sin(i * 1.7)))));
    bars += `<rect x="${i * 6}" y="${20 - h / 2}" width="3.2" height="${h}" rx="1.6"/>`;
  }
  return `<svg class="waveform" viewBox="0 0 264 40" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">${bars}</svg>`;
})();
const READY_HTML = msg => `<div class="empty"><div class="ready-portrait"><img src="/yumma-portrait.jpg" alt="Yumma, the AI agent"></div><h2>Yumma is ready</h2><p>${msg}</p></div>`;
function riskGauge(level, score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const lv = ['HIGH', 'MEDIUM', 'LOW'].includes(level) ? level : 'LOW';
  const col = { HIGH: ['#e6c26f', '#ff6f5e'], MEDIUM: ['#9fe0c4', '#f2b04a'], LOW: ['#7fd8b4', '#d6b263'] }[lv];
  return `<svg class="gauge ${lv}" viewBox="0 0 220 136" role="img" aria-label="${lv} risk, score ${s} out of 100">
    <defs><linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs>
    <path d="M22 114 A88 88 0 0 1 198 114" fill="none" stroke="#173f35" stroke-width="16" stroke-linecap="round"/>
    <path d="M22 114 A88 88 0 0 1 198 114" fill="none" stroke="url(#gaugeGrad)" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${s} 100"/>
    <text x="110" y="98" text-anchor="middle" class="g-num">${s}</text>
    <text x="110" y="126" text-anchor="middle" class="g-lab">OUT OF 100</text>
  </svg>`;
}
document.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ico(el.dataset.icon); });
document.querySelectorAll('[data-wave]').forEach(el => { el.innerHTML = WAVEFORM; });
reset.addEventListener('click', () => {
  input.value = example;
  result.innerHTML = READY_HTML('Submit the example to see the agent journey.');
});
run.addEventListener('click', async () => {
  run.disabled = true; run.textContent = 'Assessing…';
  try {
    const response = await fetch('/api/conversation', {
      method: 'POST', headers: {'content-type':'application/json'},
      body: JSON.stringify({message: input.value, sessionId: conversationSessionId})
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    const d = payload.assessment;
    const conversationalExplanation = payload.conversation?.explanation || d.response;
    lastYummaResponse = conversationalExplanation;
    const patterns = (d.risk.matchedPatterns || []).length
      ? `<p class="list"><b>Recognised pattern:</b> ${d.risk.matchedPatterns.map(p => escapeHtml(p.reason)).join(' · ')}</p>` : '';
    const aiNote = payload.aiRisk ? `<p class="note">AI risk signal: ${escapeHtml(payload.aiRisk.status.replaceAll('_',' '))}${payload.aiRisk.applied ? ' — raised the risk level' : ''}. It can raise risk but never lower it or authorise anything.</p>` : '';
    const reasons = d.risk.reasons.length
      ? `<ul class="signals">${d.risk.reasons.map(x => `<li><span>${escapeHtml(x.reason)}</span><b>+${escapeHtml(String(x.weight))}</b><i><em data-w="${Math.min(100, Math.max(8, Number(x.weight) * 3))}"></em></i></li>`).join('')}</ul>`
      : '<ul class="list"><li>No high-risk cues found by the current synthetic rules.</li></ul>';
    const posture = d.protectionPlan?.posture || 'INFORMATIONAL';
    const postureValue = document.querySelector('#postureValue');
    const postureNext = document.querySelector('#postureNext');
    if(postureValue) postureValue.textContent = posture.replaceAll('_',' ');
    if(postureNext) postureNext.textContent = (d.protectionPlan?.nextStep || 'Yumma will explain the request and keep the person in control.') + (d.protectionPlan?.ifAlreadyActed ? ' ' + d.protectionPlan.ifAlreadyActed : '');
    const impacts = d.ripple.impacts.length
      ? d.ripple.impacts.map(x => `<li><b>${escapeHtml(x.domain.replaceAll('_',' '))} <span class="sev ${escapeHtml(x.severity)}">${escapeHtml(x.severity)}</span></b> ${escapeHtml(x.consequence)}<br><small>Yumma suggests: ${escapeHtml(x.intervention)}</small></li>`).join('')
      : '<li>No cross-domain impact identified by current rules.</li>';
    const contracts = d.context.recalledContracts.length
      ? d.context.recalledContracts.map(x => `<p class="pc-quote">“${escapeHtml(x.commitment)}”</p>`).join('')
      : '<p>No matching active commitment retrieved.</p>';
    const hasVoice = await yummaVoice.has();
    const pressured = posture === 'PAUSE_AND_PROTECT' || posture === 'VERIFY';
    const promiseLine = d.context.recalledContracts[0]?.commitment || '';
    const voiceMoment = pressured && (hasVoice || promiseLine)
      ? `<div class="voice-moment"><div class="card-head">${medal('wave')}<div><strong>YOUR PROMISE, IN YOUR OWN VOICE</strong><small>${hasVoice ? 'Recorded by you, while calm, on this device' : 'Saved by you, while calm'}</small></div></div>${promiseLine ? `<p class="vm-quote">“${escapeHtml(promiseLine)}”</p>` : ''}${WAVEFORM}<p class="list">${hasVoice ? 'You recorded this when you were calm. Listen before you decide.' : 'You made this promise when you were calm. Record it above to hear it in your own voice.'}</p><button id="resultPlayVoice" type="button">${hasVoice ? '▶ Hear my promise' : '▶ Hear my promise read aloud'}</button></div>` : '';
    const fc = d.familyCheck || { applies: false, questions: [] };
    const familyMoment = fc.applies
      ? (fc.questions.length
          ? `<div class="family-moment"><div class="card-head">${medal('family')}<div><strong>FAMILY CHECK</strong><small>The question a cloned voice cannot answer</small></div></div><p class="list">Ask the caller: “${escapeHtml(fc.questions[0].question)}” A cloned voice cannot know the answer.</p><div class="row"><input id="familyCandidate" type="text" maxlength="80" placeholder="Type what the caller answered" aria-label="What the caller answered"><button id="familyCheckBtn" type="button" data-qid="${escapeHtml(fc.questions[0].id)}">Check answer</button></div><div id="familyResult" class="family-result" role="status" aria-live="polite"></div><p class="fm-foot">${ico('check')}You decide. Yumma never moves money or contacts anyone for you.</p></div>`
          : `<div class="family-moment"><div class="card-head">${medal('family')}<div><strong>FAMILY CHECK</strong><small>The question a cloned voice cannot answer</small></div></div><p class="list">${escapeHtml(fc.suggestion || '')} Tip: set a family question below so Yumma can check the caller for you.</p></div>`)
      : '';
    const signs = (d.risk.reasons || []).slice(0, 5).map(x => `<span>${ico('alert')}${escapeHtml(x.reason)}</span>`).join('');
    result.innerHTML = `
      <div class="verdict">
        <div class="verdict-who"><img class="avatar" src="/yumma-portrait.jpg" alt="Yumma"><div><span class="eyebrow">YUMMA · YOUR AI AGENT</span><h2>${escapeHtml(d.greeting)}</h2></div></div>
        <div class="verdict-meter">
          <div class="gauge-wrap"><div class="risk ${escapeHtml(d.risk.level)}">${escapeHtml(d.risk.level)} RISK · SCORE ${escapeHtml(String(d.risk.score))}/100</div>${riskGauge(d.risk.level, d.risk.score)}</div>
          <div class="decision ${escapeHtml(posture)}">${medal('shield')}<div><span>YUMMA DECISION</span><strong>${escapeHtml(posture.replaceAll('_',' '))}</strong></div></div>
        </div>
        ${signs ? `<div class="signs ${escapeHtml(d.risk.level)}">${signs}</div>` : ''}
      </div>${voiceMoment}${familyMoment}
      <p class="list"><b>Intent:</b> ${escapeHtml(d.request.intent.replaceAll('_',' '))}<br>
      <b>Requested action:</b> ${escapeHtml(d.request.requestedAction.replaceAll('_',' '))}<br>
      <b>Extraction confidence:</b> ${Math.round(d.request.confidence*100)}% (rule-based demo estimate)</p>
      <h3>${ico('heart')}01 · Personal context</h3>${contracts}
      <h3>${ico('alert')}02 · Risk signals</h3>${patterns}${reasons}${aiNote}
      <h3>${ico('ripple')}03 · Life Ripple</h3><p class="list"><b>Response posture:</b> ${escapeHtml(d.ripple.proportionality.replaceAll('_',' '))}<br>${escapeHtml(d.ripple.summary)}</p><ul class="list ripple">${impacts}</ul>${d.ripple.matchedWisdom.length ? `<p class="list"><b>Relevant personal wisdom:</b> ${d.ripple.matchedWisdom.map(x=>escapeHtml(x.content)).join(' · ')}</p>` : ''}
      <h3>${ico('scale')}04 · Policy decision</h3><p class="list">${escapeHtml(d.policy.decision.replaceAll('_',' '))}<br>${escapeHtml(d.policy.explanation)}</p>
      <div class="response"><img class="avatar sm" src="/yumma-portrait.jpg" alt=""><div>${escapeHtml(conversationalExplanation)}</div></div>
      <p class="note">Conversation: ${payload.isFollowUp ? 'follow-up using the previous assessment' : 'new assessment'} · ${payload.turnCount || 0} retained turns in this temporary browser session.</p>
      <p class="note">Explanation mode: ${escapeHtml(payload.conversation?.status || 'deterministic_fallback')} · ${escapeHtml(payload.conversation?.source || 'deterministic_policy_guidance')}. The model cannot change risk, policy or permissions.</p>
      <p class="blocked">${ico('lock')}${d.policy.actionBlocked ? 'UNSAFE SYNTHETIC ACTION BLOCKED' : 'NO EXTERNAL ACTION TAKEN'}</p>
      <h3>${ico('lock')}05 · Tool gateway</h3><p class="list">${escapeHtml(d.toolPlan.status.replaceAll('_',' '))} · ${escapeHtml(d.toolPlan.reason)}</p>
      <h3>${ico('doc')}06 · Decision audit</h3><div class="audit">${escapeHtml(JSON.stringify(d.audit,null,2))}</div>
      ${traceSection(payload.trace, payload.decisionRecord)}
      <p class="note">Synthetic profile and scenario. Any optional language model can draft explanation text only; deterministic safeguards retain authority. No bank verification, payment or external tool execution is connected.</p>`;
    result.querySelectorAll('[data-w]').forEach(el => { el.style.width = el.dataset.w + '%'; });
    const rpv = document.querySelector('#resultPlayVoice');
    if (rpv) {
      if (hasVoice) { rpv.addEventListener('click', () => yummaVoice.play()); yummaVoice.play().catch(() => {}); }
      else rpv.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) { voiceStatus.textContent = 'Speech playback is not supported by this browser.'; return; }
        speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(promiseLine); u.lang = 'en-GB'; speechSynthesis.speak(u);
      });
    }
    wireTraceButtons(payload.trace, payload.decisionRecord);
    const fcb = document.querySelector('#familyCheckBtn');
    if (fcb) fcb.addEventListener('click', () => checkFamilyAnswer(fcb.dataset.qid, document.querySelector('#familyCandidate').value, document.querySelector('#familyResult')));
  } catch (e) {
    result.textContent = 'Could not assess request: ' + e.message;
  } finally {
    run.disabled = false; run.textContent = 'Ask Yumma to assess';
  }
});

const memoryText=document.querySelector('#memoryText');
const memoryConsent=document.querySelector('#memoryConsent');
const saveMemory=document.querySelector('#saveMemory');
const memoryStatus=document.querySelector('#memoryStatus');
const memoryList=document.querySelector('#memoryList');
const wisdomSummary=document.querySelector('#wisdomSummary');
const demoProfile='salma-demo';
async function refreshMemories(){
  const r=await fetch(`/api/memory/${demoProfile}`); const d=await r.json();
  const counts=Object.entries(d.wisdomGraph?.counts||{}).map(([k,v])=>`${escapeHtml(k.replaceAll('_',' '))}: ${v}`).join(' · ');
  wisdomSummary.innerHTML=`<p class="note">${counts || 'No active memory categories yet.'}</p>` + ((d.wisdomGraph?.conflicts||[]).length ? `<p class="blocked">Possible conflicting memories detected. Yumma will ask you to resolve them; it will not overwrite either one.</p>` : '');
  memoryList.innerHTML=(d.memories||[]).map(m=>`<div class="memory-row">${escapeHtml(m.content)} <small>(${escapeHtml(m.type)} · ${Math.round((m.classificationConfidence||0)*100)}% classification confidence)</small> <button data-revoke="${escapeHtml(m.id)}">Revoke</button></div>`).join('') || '<p>No saved memories.</p>';
}
if(saveMemory){
  refreshMemories();
  saveMemory.addEventListener('click',async()=>{
    if(!memoryConsent.checked){memoryStatus.textContent='Please provide explicit consent before saving.';return;}
    if(!memoryText.value.trim()){memoryStatus.textContent='Enter a commitment or preference first.';return;}
    const r=await fetch(`/api/memory/${demoProfile}`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({
      memory:{content:memoryText.value},
      consent:{granted:true,purpose:'User-requested Salma synthetic demo memory'}
    })});
    const d=await r.json(); memoryStatus.textContent=r.ok?'Saved with your consent.':d.error;
    if(r.ok){memoryText.value='';memoryConsent.checked=false;await refreshMemories();}
  });
  memoryList.addEventListener('click',async e=>{
    const id=e.target?.dataset?.revoke;if(!id)return;
    const r=await fetch(`/api/memory/${demoProfile}/${id}`,{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({consent:{granted:true,purpose:'User-requested memory revocation'}})});
    const d=await r.json();memoryStatus.textContent=r.ok?'Memory revoked.':d.error;await refreshMemories();
  });
}


// Optional browser speech recognition. Recognition is browser-managed and may use
// the browser/vendor's speech service; the user must explicitly start and grant mic access.
// Transcript is placed in the request box but is NEVER submitted automatically.
let recognition=null;
const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
if(listenYumma){
  if(!SpeechRecognition){
    listenYumma.disabled=true;
    listenYumma.title='Speech input is not supported by this browser.';
  } else {
    recognition=new SpeechRecognition();
    recognition.lang='en-GB';
    recognition.interimResults=true;
    recognition.continuous=false;
    recognition.onstart=()=>{
      listenYumma.classList.add('speaking');
      listenYumma.textContent='● Listening…';
      voiceStatus.textContent='Yumma is listening. Speak naturally; your words will appear in the request box. Nothing is submitted automatically.';
    };
    recognition.onresult=(event)=>{
      let transcript='';
      for(let i=0;i<event.results.length;i++) transcript+=event.results[i][0].transcript;
      input.value=transcript;
    };
    recognition.onerror=(event)=>{
      voiceStatus.textContent=event.error==='not-allowed'
        ? 'Microphone permission was denied. You can still type your request.'
        : `Speech input stopped (${event.error}). You can type your request instead.`;
    };
    recognition.onend=()=>{
      listenYumma.classList.remove('speaking');
      listenYumma.textContent='🎙 Speak to Yumma';
      if(input.value.trim()) voiceStatus.textContent='Yumma has captured your words. Review the text, then choose Ask Yumma to assess.';
    };
    listenYumma.addEventListener('click',()=>{
      try { input.value=''; recognition.start(); }
      catch(error){ voiceStatus.textContent='Speech input is already active or unavailable. Please try again.'; }
    });
  }
}


// Judge-facing deterministic scenario console. It uses the same server-side agent engine.
const scenarioSelect=document.querySelector('#scenarioSelect');
const runScenario=document.querySelector('#runScenario');
const resetDemo=document.querySelector('#resetDemo');
const scenarioLearning=document.querySelector('#scenarioLearning');
const judgeEvidence=document.querySelector('#judgeEvidence');
async function loadJudgeScenarios(){
  if(!scenarioSelect)return;
  try{const r=await fetch('/api/demo/scenarios');const d=await r.json();if(!r.ok)throw new Error(d.error);
    scenarioSelect.innerHTML=d.scenarios.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(x.title)}</option>`).join('');
    const update=()=>{const selected=d.scenarios.find(x=>x.id===scenarioSelect.value);scenarioLearning.textContent=selected?`What this demonstrates: ${selected.learning}.`:'Choose a scenario.';};
    scenarioSelect.addEventListener('change',update);update();
  }catch(e){scenarioSelect.innerHTML='<option value="">Scenarios unavailable</option>';scenarioLearning.textContent=e.message;}
}
if(runScenario)runScenario.addEventListener('click',async()=>{
  runScenario.disabled=true;runScenario.textContent='Running…';
  try{const r=await fetch('/api/demo/run',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({scenarioId:scenarioSelect.value})});const d=await r.json();if(!r.ok)throw new Error(d.error);
    const a=d.assessment;const posture=a.protectionPlan.posture;
    judgeEvidence.innerHTML=`<div class="risk ${escapeHtml(a.risk.level)}">${escapeHtml(a.risk.level)} RISK · ${a.risk.score}/100</div><h3>${escapeHtml(d.scenario.title)}</h3><p>${escapeHtml(d.scenario.learning)}</p><div class="judge-posture"><span>YUMMA DECISION</span><strong>${escapeHtml(posture.replaceAll('_',' '))}</strong><p>${escapeHtml(a.protectionPlan.nextStep||a.policy.explanation)}</p></div><h4>Evidence checks</h4><ul><li>Expected posture: ${escapeHtml(d.scenario.expectedPosture)}</li><li>Posture matched: ${d.checks.postureMatchesExpected?'PASS':'FAIL'}</li><li>Authorization granted: ${d.checks.authorizationGranted?'YES':'NO'}</li><li>External action taken: ${d.checks.externalActionTaken?'YES':'NO'}</li></ul><h4>Risk signals</h4><ul>${a.risk.reasons.map(x=>`<li>${escapeHtml(x.reason)} (+${x.weight})</li>`).join('')||'<li>No risk signals identified by the current rules.</li>'}</ul><p class="note">Synthetic test evidence only. This is not independent validation of real-world detection accuracy.</p>`;
    input.value=({ 'bank-transfer-pressure':'A caller claiming to be my bank says my account will be blocked unless I transfer my savings immediately. They told me not to tell anyone.','otp-request':'Someone claiming to be bank support urgently says my account will be blocked unless I read out the one-time password they just sent me. They told me to keep it secret.','remote-access':'A support agent says I must install AnyDesk and share my screen so they can protect my bank account.','family-new-number':"Hi Mum, it's me. My phone broke so this is my new number. I'm in trouble and need AED 4,000 sent today to a friend's account. Please don't call, I can't talk right now.",'benign-information':'Can you explain what a bank statement is and how I can read the transactions?'})[scenarioSelect.value]||input.value;
  }catch(e){judgeEvidence.textContent='Could not run scenario: '+e.message;}
  finally{runScenario.disabled=false;runScenario.textContent='Run selected scenario';}
});
if(resetDemo)resetDemo.addEventListener('click',async()=>{
  try{await fetch('/api/demo/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({sessionId:conversationSessionId})});}
  catch{}
  input.value=example;judgeEvidence.textContent='Demo session reset. Choose a scenario to begin.';
  result.innerHTML=READY_HTML('Choose a judge scenario to begin the walkthrough.');
});
loadJudgeScenarios();


/* ---------------------------------------------------------------------------
 * v2.7 — Your promise in your own voice (kept on this device) and the
 * Family Verification Question. Synthetic demo profile: salma-demo.
 * ------------------------------------------------------------------------- */
const PROFILE = 'salma-demo';
const yummaVoice = (() => {
  const DB = 'yumma-device', STORE = 'voice';
  let currentAudio = null;
  function open() {
    return new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open(DB, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(STORE);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (e) { reject(e); }
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode); const st = t.objectStore(STORE);
      const r = fn(st); t.oncomplete = () => resolve(r && r.result); t.onerror = () => reject(t.error);
    });
  }
  return {
    async save(blob) { try { await tx('readwrite', st => st.put(blob, PROFILE)); return true; } catch { return false; } },
    async get() { try { return await tx('readonly', st => st.get(PROFILE)); } catch { return null; } },
    async has() { return Boolean(await this.get()); },
    async remove() { try { await tx('readwrite', st => st.delete(PROFILE)); } catch {} },
    async play() {
      const blob = await this.get(); if (!blob) return;
      if (currentAudio) { currentAudio.pause(); URL.revokeObjectURL(currentAudio.src); }
      currentAudio = new Audio(URL.createObjectURL(blob));
      return currentAudio.play();
    }
  };
})();

(function initPromisePanel() {
  const recordBtn = document.querySelector('#recordVoice'), stopBtn = document.querySelector('#stopRecording');
  const playBtn = document.querySelector('#playVoice'), delBtn = document.querySelector('#deleteVoice');
  const consent = document.querySelector('#voiceConsent'), status = document.querySelector('#voiceRecordStatus');
  const promiseText = document.querySelector('#promiseText');
  if (!recordBtn) return;
  fetch(`/api/calm-contract/${PROFILE}`).then(r => r.json()).then(d => {
    const c = (d.contracts || [])[0];
    promiseText.textContent = c ? `“${c.commitment}”` : '“I will never share an OTP or transfer money under pressure.” (example — the demo launcher saves this promise with consent)';
  }).catch(() => { promiseText.textContent = 'Promise unavailable.'; });
  const refresh = async () => { const has = await yummaVoice.has(); playBtn.disabled = !has; delBtn.disabled = !has; };
  refresh();
  let recorder = null, chunks = [], timer = null;
  recordBtn.addEventListener('click', async () => {
    if (!consent.checked) { status.textContent = 'Please tick the consent box first. Your recording stays on this device.'; return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { status.textContent = 'This browser cannot record audio. Yumma can still read your promise aloud with “Hear Yumma”.'; return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); clearTimeout(timer); recordBtn.classList.remove('recording');
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        const ok = await yummaVoice.save(blob);
        status.textContent = ok ? 'Saved on this device only. Yumma will play it back when pressure is detected.' : 'Could not save on this device (storage unavailable).';
        recordBtn.disabled = false; stopBtn.disabled = true; refresh();
      };
      recorder.start(); recordBtn.disabled = true; stopBtn.disabled = false; recordBtn.classList.add('recording');
      status.textContent = 'Recording… say your promise in your own words, then press Stop.';
      timer = setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 15000);
    } catch (e) { status.textContent = 'Microphone permission was not granted. Nothing was recorded.'; }
  });
  stopBtn.addEventListener('click', () => { if (recorder && recorder.state === 'recording') recorder.stop(); });
  playBtn.addEventListener('click', () => yummaVoice.play().catch(() => { status.textContent = 'Playback was blocked by the browser. Press play again.'; }));
  delBtn.addEventListener('click', async () => { await yummaVoice.remove(); status.textContent = 'Recording deleted from this device.'; refresh(); });
})();

async function loadFamilyQuestions() {
  const list = document.querySelector('#familyList'); if (!list) return;
  try {
    const d = await (await fetch(`/api/family-check/${PROFILE}`)).json();
    list.innerHTML = (d.questions || []).length
      ? d.questions.map(q => `<div class="memory-row">“${escapeHtml(q.question)}” <small>· answer stored as a protected hash</small> <button type="button" data-revoke-fq="${escapeHtml(q.id)}">Remove</button></div>`).join('')
      : 'No family question yet. Agree one with your family while everyone is calm.';
  } catch { list.textContent = 'Family questions unavailable.'; }
}
async function checkFamilyAnswer(id, answer, out) {
  if (!answer || !answer.trim()) { out.textContent = 'Type what the caller answered first.'; return; }
  try {
    const r = await fetch(`/api/family-check/${PROFILE}/${encodeURIComponent(id)}/verify`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ answer }) });
    const d = await r.json(); if (!r.ok) throw new Error(d.error);
    out.className = `family-result ${d.result}`;
    const g = String(d.guidance || ''); const cut = g.indexOf('. ') + 1;
    out.innerHTML = `<span class="fr-badge">${d.result === 'MATCH' ? '✓' : d.result === 'LOCKED' ? '⏸' : '✗'}</span><span>${cut > 0 ? `<b>${escapeHtml(g.slice(0, cut))}</b>${escapeHtml(g.slice(cut))}` : escapeHtml(g)}</span>`;
  } catch (e) { out.textContent = 'Could not check the answer: ' + e.message; }
}
(function initFamilyPanel() {
  const save = document.querySelector('#saveFamily'); if (!save) return;
  const q = document.querySelector('#familyQuestion'), a = document.querySelector('#familyAnswer'), c = document.querySelector('#familyConsent'), st = document.querySelector('#familyStatus');
  loadFamilyQuestions();
  save.addEventListener('click', async () => {
    if (!c.checked) { st.textContent = 'Please give consent before saving.'; return; }
    try {
      const r = await fetch(`/api/family-check/${PROFILE}`, { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ question: { question: q.value, answer: a.value }, consent: { granted: true, purpose: 'Family verification against impersonation and cloned voices' } }) });
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      st.textContent = 'Saved. The answer is stored only as a protected hash.'; q.value = ''; a.value = ''; c.checked = false; loadFamilyQuestions();
    } catch (e) { st.textContent = e.message; }
  });
  document.querySelector('#familyList').addEventListener('click', async ev => {
    const id = ev.target && ev.target.dataset && ev.target.dataset.revokeFq; if (!id) return;
    try {
      const r = await fetch(`/api/family-check/${PROFILE}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consent: { granted: true, purpose: 'Remove family question' } }) });
      if (!r.ok) throw new Error((await r.json()).error); loadFamilyQuestions();
    } catch (e) { st.textContent = e.message; }
  });
})();

// ---- Execution trace, decision record and judge banner
function traceSection(trace, record) {
  if (!trace || !Array.isArray(trace.steps)) return '';
  const rows = trace.steps.map(st => {
    const { n, step, ms, ...detail } = st;
    const info = Object.entries(detail).filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && !v.length))
      .map(([k, v]) => `${escapeHtml(k)}: ${escapeHtml(Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v))}`).join(' · ');
    return `<li><b>${escapeHtml(String(n))}. ${escapeHtml(String(step).replaceAll('_', ' '))}</b> <span class="ms">${escapeHtml(String(ms))} ms</span><br><span class="trace-detail">${info}</span></li>`;
  }).join('');
  const rec = record ? `<p class="list"><b>Decision record ${escapeHtml(String(record.seq))}:</b> hash ${escapeHtml(record.hash.slice(0, 16))}… chained to ${escapeHtml(record.prevHash.slice(0, 16))}… The message itself is not stored, only its fingerprint.</p>` : '';
  return `<h3>${ico('steps')}07 · Execution trace</h3><p class="note">Trace ${escapeHtml(trace.id)} · ${escapeHtml(String(trace.steps.length))} steps · ${escapeHtml(String(trace.totalMs))} ms in total.</p><ol class="trace">${rows}</ol>${rec}
    <div class="row trace-actions"><button class="secondary" id="dlTrace" type="button">Download trace</button>${record ? '<button class="secondary" id="dlRecord" type="button">Download decision record</button><button class="secondary" id="verifyChain" type="button">Verify record chain</button>' : ''}</div><p id="chainStatus" class="note" role="status" aria-live="polite"></p>`;
}
function downloadJson(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function wireTraceButtons(trace, record) {
  const t = document.querySelector('#dlTrace'); if (t) t.addEventListener('click', () => downloadJson(`${trace.id}.json`, trace));
  const r = document.querySelector('#dlRecord'); if (r) r.addEventListener('click', () => downloadJson(`${record.id}.json`, record));
  const v = document.querySelector('#verifyChain');
  if (v) v.addEventListener('click', async () => {
    const out = document.querySelector('#chainStatus');
    try { const d = await (await fetch('/api/decision-log/verify')).json();
      out.textContent = d.ok ? `✓ Chain intact: ${d.entries} decision${d.entries === 1 ? "" : "s"}, every link and hash recomputed.` : `✗ Chain broken at entry ${d.brokenAt}: ${d.reason}.`; }
    catch (e) { out.textContent = 'Could not verify the chain: ' + e.message; }
  });
}
(async function judgeBanner() {
  try {
    const d = await (await fetch('/api/session')).json();
    if (!d.judgeMode) return;
    const b = document.createElement('div'); b.className = 'judge-banner'; b.setAttribute('role', 'note');
    b.textContent = 'Judge link · You have your own private copy of Salma, a synthetic user. Please use test messages only, not real personal details.';
    document.body.prepend(b);
    const tag = document.querySelector('header .local'); if (tag) tag.textContent = 'SYNTHETIC JUDGE DEMO';
  } catch { /* banner is optional */ }
})();
