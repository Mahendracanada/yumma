'use strict';
/* Yumma front end: a phone app with a talking hologram, plus an "Under the hood" panel for judges.
 * Every decision still comes from the server-side agent (/api/conversation). This file only presents it. */

// ---------------------------------------------------------------- helpers
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const escapeHtml = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const isArabic = s => /[؀-ۿ]/.test(String(s || ''));
const PROFILE = 'salma-demo';
const sessionId = (() => { try { let id = sessionStorage.getItem('yumma-session'); if (!id) { id = crypto.randomUUID(); sessionStorage.setItem('yumma-session', id); } return id; } catch { return crypto.randomUUID(); } })();
async function postJSON(url, body) {
  const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Request failed (${r.status})`);
  return d;
}

// ---------------------------------------------------------------- icons
const ICON_PATHS = {
  mic: '<rect x="9" y="2.5" width="6" height="11" rx="3"/><path d="M5.5 10.5a6.5 6.5 0 0 0 13 0"/><path d="M12 17v4M8.5 21h7"/>',
  message: '<path d="M20.5 11.5a8 8 0 0 1-11.7 7.1L3.5 20l1.4-4.7a8 8 0 1 1 15.6-3.8z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
  shield: '<path d="M12 2.8l7.5 3v5.8c0 4.8-3.2 8.3-7.5 9.6-4.3-1.3-7.5-4.8-7.5-9.6V5.8z"/><path d="M8.8 12l2.2 2.2 4.3-4.5"/>',
  wave: '<path d="M3 12v0M6.5 9v6M10 5.5v13M13.5 8v8M17 10v4M20.5 11.5v1"/>',
  family: '<circle cx="6.5" cy="6.5" r="2.4"/><circle cx="17.5" cy="6.5" r="2.4"/><circle cx="12" cy="11.6" r="1.9"/><path d="M2.5 19.5v-2.2a4 4 0 0 1 6.4-3.2M21.5 19.5v-2.2a4 4 0 0 0-6.4-3.2M8.6 20.5v-.8a3.4 3.4 0 0 1 6.8 0v.8"/>',
  heart: '<path d="M12 20.3s-7.5-4.6-7.5-10.4A4.3 4.3 0 0 1 12 7.3a4.3 4.3 0 0 1 7.5 2.6c0 5.8-7.5 10.4-7.5 10.4z"/>',
  alert: '<path d="M12 3.2l9.3 16.3H2.7z"/><path d="M12 9.5v4.5M12 17h.01"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.3a3.5 3.5 0 0 1 7 0v3.2M12 14.5v2"/>',
  doc: '<path d="M6.5 2.8h8l4 4v14.4h-12z"/><path d="M14 2.8v4.5h4.5M9.5 12.5h6M9.5 16h6"/>',
  steps: '<circle cx="5" cy="5.5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="18.5" r="2"/><path d="M6.6 7.1l3.8 3.4M13.6 13.6l3.8 3.4"/>',
  user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="M8 12.2l2.8 2.8 5.2-5.6"/>',
  speaker: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  speakerOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none"/>',
  home: '<path d="M3.5 11L12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  send: '<path d="M4 12l16-8-6 16-2.5-6.5z"/><path d="M11.5 13.5L20 4"/>',
  phone: '<path d="M6.6 3.5h2.6l1.6 4.2-2 1.4a11 11 0 0 0 6.1 6.1l1.4-2 4.2 1.6v2.6a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>'
};
const ico = name => name === 'status'
  ? '<svg class="ico status" viewBox="0 0 66 14" aria-hidden="true" fill="currentColor"><rect x="0" y="9" width="3" height="4" rx="1"/><rect x="5" y="6.5" width="3" height="6.5" rx="1"/><rect x="10" y="4" width="3" height="9" rx="1"/><rect x="15" y="1.5" width="3" height="11.5" rx="1"/><path d="M31 12.6l-2.3-2.4a3.3 3.3 0 0 1 4.6 0zM26.4 7.9a6.6 6.6 0 0 1 9.2 0l-1.3 1.3a4.8 4.8 0 0 0-6.6 0zM24.2 5.6a9.8 9.8 0 0 1 13.6 0l-1.3 1.3a8 8 0 0 0-11 0z"/><rect x="43" y="2" width="20" height="10" rx="3" fill="none" stroke="currentColor" stroke-width="1.2"/><rect x="45" y="4" width="14" height="6" rx="1.5"/><rect x="64" y="5.3" width="1.6" height="3.4" rx=".8"/></svg>'
  : `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_PATHS[name] || ''}</svg>`;
const medal = (name, cls = '') => `<span class="medal ${cls}">${ico(name)}</span>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = ico(el.dataset.icon); }); }
const WAVEFORM = (() => {
  let bars = '';
  for (let i = 0; i < 44; i++) {
    const h = Math.max(4, Math.min(36, Math.round(5 + 30 * Math.abs(Math.sin(i * 0.52) * Math.cos(i * 0.19) + 0.18 * Math.sin(i * 1.7)))));
    bars += `<rect x="${i * 6}" y="${20 - h / 2}" width="3.2" height="${h}" rx="1.6"/>`;
  }
  return `<svg class="waveform" viewBox="0 0 264 40" preserveAspectRatio="none" fill="currentColor" aria-hidden="true">${bars}</svg>`;
})();
let gaugeId = 0;
function riskGauge(level, score) {
  const s = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const lv = ['HIGH', 'MEDIUM', 'LOW'].includes(level) ? level : 'LOW';
  const col = { HIGH: ['#e6c26f', '#ff6f5e'], MEDIUM: ['#9fe0c4', '#f2b04a'], LOW: ['#7fd8b4', '#d6b263'] }[lv];
  const id = `gg${++gaugeId}`;
  return `<svg class="gauge ${lv}" viewBox="0 0 220 136" role="img" aria-label="${lv} risk, score ${s} out of 100">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${col[0]}"/><stop offset="1" stop-color="${col[1]}"/></linearGradient></defs>
    <path d="M22 114 A88 88 0 0 1 198 114" fill="none" stroke="#173f35" stroke-width="16" stroke-linecap="round"/>
    <path d="M22 114 A88 88 0 0 1 198 114" fill="none" stroke="url(#${id})" stroke-width="16" stroke-linecap="round" pathLength="100" stroke-dasharray="${s} 100"/>
    <text x="110" y="98" text-anchor="middle" class="g-num">${s}</text>
    <text x="110" y="126" text-anchor="middle" class="g-lab">OUT OF 100</text></svg>`;
}

// ---------------------------------------------------------------- Yumma's voice (a female voice from the browser) and captions
const Speech = (() => {
  const supported = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  let enabled = true; try { enabled = localStorage.getItem('yumma-voice') !== 'off'; } catch {}
  let voices = [];
  const load = () => { try { voices = speechSynthesis.getVoices() || []; } catch { voices = []; } };
  if (supported) { load(); try { speechSynthesis.addEventListener('voiceschanged', load); } catch { speechSynthesis.onvoiceschanged = load; } }
  const FEMALE = /female|samantha|victoria|karen|moira|tessa|serena|fiona|\bkate\b|stephanie|susan|zira|hazel|libby|sonia|jenny|aria|natasha|allison|\bava\b|nicky|veena|martha|catherine|shelley|sandy|\bflo\b|google us english|laila|lana|mariam|hoda|salma|zariyah|amira|fatima|layla|noura|amina|sara\b/i;
  const MALE = /\bmale\b|daniel|\balex\b|\bfred\b|majed|maged|tarik|aaron|arthur|rishi|gordon|\breed\b|eddy|rocko|grandpa|ralph|bruce|junior|albert|thomas|oliver|george|\bryan\b|\bguy\b|hamed|naayf|david|\bmark\b|james|shakir|hamdan/i;
  function pick(lang) {
    if (!voices.length) load();
    const L = voices.filter(v => (v.lang || '').toLowerCase().replace('_', '-').startsWith(lang));
    const fem = L.filter(v => FEMALE.test(v.name) && !MALE.test(v.name.replace(/female/ig, '')));
    const best = a => a.find(v => /en-gb/i.test(v.lang) && /premium|enhanced|natural|neural/i.test(v.name)) || a.find(v => /premium|enhanced|natural|neural/i.test(v.name)) || a.find(v => /en-gb/i.test(v.lang)) || a[0];
    return best(fem) || L.find(v => !MALE.test(v.name)) || null;
  }
  const sentences = text => (String(text).match(/[^.!?؟]+[.!?؟]+["”’)]*\s*|[^.!?؟]+$/g) || [String(text)]).map(s => s.trim()).filter(Boolean);
  let current = null, gen = 0;
  function speakLine(text, onWord) {
    return new Promise(resolve => {
      const words = String(text).split(/\s+/).filter(Boolean);
      const estMs = Math.max(1200, words.length * 360);
      let done = false, sim = null, guard = null, idx = 0, boundary = false, started = false;
      const finish = () => { if (done) return; done = true; clearInterval(sim); clearTimeout(guard); if (onWord) onWord(words.length - 1); current = null; resolve(); };
      const startSim = () => { if (sim) return; sim = setInterval(() => { if (!boundary && idx < words.length && onWord) onWord(idx++); }, estMs / Math.max(1, words.length)); };
      current = { cancel: finish };
      if (!enabled || !supported) { startSim(); guard = setTimeout(finish, estMs + 250); return; }
      try {
        const u = new SpeechSynthesisUtterance(text);
        const ar = isArabic(text);
        const v = pick(ar ? 'ar' : 'en');
        if (v) { u.voice = v; u.lang = v.lang; } else u.lang = ar ? 'ar-AE' : 'en-GB';
        u.rate = ar ? 0.92 : 0.96; u.pitch = 1.08;
        const starts = []; String(text).replace(/\S+/g, (m, off) => { starts.push(off); return m; });
        u.onboundary = e => { if (typeof e.charIndex !== 'number' || !onWord) return; boundary = true; let w = 0; while (w + 1 < starts.length && starts[w + 1] <= e.charIndex) w++; onWord(w); };
        u.onstart = () => { started = true; setTimeout(() => { if (!boundary) startSim(); }, 500); };
        const t0 = Date.now();
        u.onend = finish;
        u.onerror = () => { const left = estMs - (Date.now() - t0); if (left > 400 && !started) { startSim(); clearTimeout(guard); guard = setTimeout(finish, left); } else finish(); };
        guard = setTimeout(() => { if (!started) { startSim(); clearTimeout(guard); guard = setTimeout(finish, estMs); } else guard = setTimeout(finish, estMs * 2 + 4000); }, 1500);
        speechSynthesis.speak(u);
      } catch { startSim(); guard = setTimeout(finish, estMs + 250); }
    });
  }
  return {
    supported, sentences, speakLine, pick,
    get enabled() { return enabled; },
    get gen() { return gen; },
    setEnabled(on) { enabled = on; try { localStorage.setItem('yumma-voice', on ? 'on' : 'off'); } catch {} if (!on) this.cancel(); },
    cancel() { gen++; try { if (supported) speechSynthesis.cancel(); } catch {} if (current) current.cancel(); }
  };
})();
function renderCaption(el, text) {
  el.dir = isArabic(text) ? 'rtl' : 'ltr';
  el.innerHTML = String(text).split(/\s+/).filter(Boolean).map(w => `<span>${escapeHtml(w)}</span>`).join(' ');
}
function markCaption(el, i) { el.querySelectorAll('span').forEach((s, k) => s.classList.toggle('on', k <= i)); }
function pulse(holo) { if (!holo) return; holo.classList.add('pulse'); clearTimeout(holo._p); holo._p = setTimeout(() => holo.classList.remove('pulse'), 140); }

// ---------------------------------------------------------------- the hologram
const Sparks = (() => {
  const list = []; let raf = 0;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function tick() {
    for (const s of list) {
      const c = s.c; if (!c.isConnected || !c.offsetParent) continue;
      const dpr = Math.min(2, window.devicePixelRatio || 1), w = c.clientWidth, h = c.clientHeight;
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const ctx = s.ctx; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
      if (s.p.length < 42 && Math.random() < 0.4) s.p.push({ x: w * (0.25 + Math.random() * 0.5), y: h * (0.7 + Math.random() * 0.25), vy: -(0.25 + Math.random() * 0.6), vx: (Math.random() - 0.5) * 0.3, r: 0.6 + Math.random() * 1.7, life: 0, max: 120 + Math.random() * 160, gold: Math.random() < 0.35 });
      s.p = s.p.filter(q => q.life++ < q.max);
      for (const q of s.p) { q.x += q.vx; q.y += q.vy; const a = Math.sin(Math.PI * q.life / q.max); ctx.beginPath(); ctx.fillStyle = q.gold ? `rgba(236,211,148,${(a * 0.9).toFixed(3)})` : `rgba(127,240,200,${(a * 0.85).toFixed(3)})`; ctx.arc(q.x, q.y, q.r, 0, 6.2832); ctx.fill(); }
    }
    raf = requestAnimationFrame(tick);
  }
  return { add(c) { list.push({ c, ctx: c.getContext('2d'), p: [] }); if (!raf && !reduce) raf = requestAnimationFrame(tick); } };
})();
function mountHolo(el) {
  el.innerHTML = '<div class="holo"><canvas class="holo-sparks" aria-hidden="true"></canvas><div class="holo-beam"></div><div class="holo-fig"><img src="/yumma-holo.webp" alt="Yumma, your AI agent"><div class="holo-scan"></div></div><div class="holo-ring"></div><div class="holo-ring r2"></div></div>';
  const h = el.firstElementChild; Sparks.add(h.querySelector('canvas')); return h;
}
const homeHolo = mountHolo($('#homeHolo'));
const ovHolo = mountHolo($('#ovHolo'));
requestAnimationFrame(() => { homeHolo.classList.add('appear'); });

// ---------------------------------------------------------------- navigation, clock, settings
hydrateIcons();
const screens = { home: $('#screen-home'), chat: $('#screen-chat'), promises: $('#screen-promises'), family: $('#screen-family') };
function goTab(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('active', k === name));
  $$('.tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  if (name === 'chat') { $('#chatBadge').hidden = true; scrollChat(); }
}
$$('.tabbar button').forEach(b => b.addEventListener('click', () => goTab(b.dataset.tab)));
$$('[data-go]').forEach(b => b.addEventListener('click', () => goTab(b.dataset.go)));
function tickClock() { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).replace(/\s?[AP]M$/i, ''); }
tickClock(); setInterval(tickClock, 30000);
const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();
$('#greetText').textContent = `${greeting}, Salma. I’m here whenever something feels rushed.`;
$('#textSize').addEventListener('click', e => { const on = document.body.classList.toggle('large-type'); e.currentTarget.setAttribute('aria-pressed', String(on)); });
function paintVoiceToggle() { const b = $('#voiceToggle'); b.innerHTML = ico(Speech.enabled ? 'speaker' : 'speakerOff'); b.setAttribute('aria-pressed', String(Speech.enabled)); b.setAttribute('aria-label', Speech.enabled ? 'Yumma’s voice is on' : 'Yumma’s voice is off'); }
$('#voiceToggle').addEventListener('click', () => { Speech.setEnabled(!Speech.enabled); paintVoiceToggle(); });
paintVoiceToggle();
async function speakOnHome() {
  const el = $('#greetText'); const text = el.textContent;
  renderCaption(el, text); homeHolo.classList.add('speaking');
  await Speech.speakLine(text, i => { markCaption(el, i); pulse(homeHolo); });
  homeHolo.classList.remove('speaking'); el.textContent = text;
}
$('#meetYumma').addEventListener('click', speakOnHome);
$('#homeHolo').addEventListener('click', speakOnHome);
$('#hdrAvatar').addEventListener('click', () => { goTab('home'); speakOnHome(); });

// ---------------------------------------------------------------- the promise in her own voice (stays on this device)
const yummaVoice = (() => {
  const DB = 'yumma-device', STORE = 'voice'; let audio = null;
  const open = () => new Promise((resolve, reject) => { try { const req = indexedDB.open(DB, 1); req.onupgradeneeded = () => req.result.createObjectStore(STORE); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); } catch (e) { reject(e); } });
  async function tx(mode, fn) { const db = await open(); return new Promise((resolve, reject) => { const t = db.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => resolve(r && r.result); t.onerror = () => reject(t.error); }); }
  return {
    async save(blob) { try { await tx('readwrite', st => st.put(blob, PROFILE)); return true; } catch { return false; } },
    async get() { try { return await tx('readonly', st => st.get(PROFILE)); } catch { return null; } },
    async has() { return Boolean(await this.get()); },
    async remove() { try { await tx('readwrite', st => st.delete(PROFILE)); } catch {} },
    stop() { if (audio) { audio.pause(); } },
    async play() {
      const blob = await this.get(); if (!blob) return false;
      if (audio) { audio.pause(); URL.revokeObjectURL(audio.src); }
      audio = new Audio(URL.createObjectURL(blob));
      await audio.play();
      await new Promise(res => { const t = setTimeout(res, 16000); audio.onended = () => { clearTimeout(t); res(); }; audio.onpause = () => { clearTimeout(t); res(); }; });
      return true;
    }
  };
})();
let promiseLine = '';
async function loadPromise() {
  try {
    const d = await (await fetch(`/api/calm-contract/${PROFILE}`)).json();
    const c = (d.contracts || [])[0];
    promiseLine = c ? c.commitment : '';
  } catch { promiseLine = ''; }
  $('#promiseText').textContent = promiseLine ? `“${promiseLine}”` : 'No promise saved yet.';
  $('#homePromise').textContent = promiseLine ? `“${promiseLine}”` : 'Not set yet';
  await paintPromiseState();
}
async function paintPromiseState() {
  const has = await yummaVoice.has();
  $('#homePromiseState').textContent = has ? 'In your voice' : (promiseLine ? 'Saved' : 'Set up');
  $('#homePromiseState').className = 'sc-state ' + (has || promiseLine ? 'ok' : 'todo');
  $('#playVoice').disabled = !has; $('#deleteVoice').disabled = !has;
}
(function initRecorder() {
  const recordBtn = $('#recordVoice'), stopBtn = $('#stopRecording'), status = $('#voiceRecordStatus');
  let recorder = null, chunks = [], timer = null;
  recordBtn.addEventListener('click', async () => {
    if (!$('#voiceConsent').checked) { status.textContent = 'Please tick the consent box first. Your recording stays on this phone.'; return; }
    if (!navigator.mediaDevices || !window.MediaRecorder) { status.textContent = 'This browser cannot record audio. Yumma will read your promise aloud instead.'; return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = []; recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop()); clearTimeout(timer); recordBtn.classList.remove('recording');
        const ok = await yummaVoice.save(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
        status.textContent = ok ? 'Saved on this phone only. Yumma will play it back when she senses pressure.' : 'Could not save on this phone (storage unavailable).';
        recordBtn.disabled = false; stopBtn.disabled = true; paintPromiseState();
      };
      recorder.start(); recordBtn.disabled = true; stopBtn.disabled = false; recordBtn.classList.add('recording');
      status.textContent = 'Recording… say your promise in your own words, then press Stop.';
      timer = setTimeout(() => { if (recorder && recorder.state === 'recording') recorder.stop(); }, 15000);
    } catch { status.textContent = 'Microphone permission was not granted. Nothing was recorded.'; }
  });
  stopBtn.addEventListener('click', () => { if (recorder && recorder.state === 'recording') recorder.stop(); });
  $('#playVoice').addEventListener('click', () => yummaVoice.play().catch(() => { status.textContent = 'Playback was blocked by the browser. Press Play again.'; }));
  $('#deleteVoice').addEventListener('click', async () => { await yummaVoice.remove(); status.textContent = 'Recording deleted from this phone.'; paintPromiseState(); });
})();

// ---------------------------------------------------------------- family question
async function loadFamily() {
  const list = $('#familyList');
  try {
    const d = await (await fetch(`/api/family-check/${PROFILE}`)).json();
    const qs = d.questions || [];
    list.innerHTML = qs.length
      ? qs.map(q => `<div class="fq-item"><p>“${escapeHtml(q.question)}”</p><small>${ico('lock')}Answer kept only as a protected hash</small><button type="button" class="ghost danger sm" data-revoke-fq="${escapeHtml(q.id)}">Remove</button></div>`).join('')
      : '<p class="note">No family question yet. Agree one with your family while everyone is calm.</p>';
    $('#homeFamily').textContent = qs.length ? `“${qs[0].question}”` : 'Not set yet';
    $('#homeFamilyState').textContent = qs.length ? 'Set' : 'Set up';
    $('#homeFamilyState').className = 'sc-state ' + (qs.length ? 'ok' : 'todo');
  } catch { list.textContent = 'Family question unavailable.'; }
}
$('#saveFamily').addEventListener('click', async () => {
  const st = $('#familyStatus');
  if (!$('#familyConsent').checked) { st.textContent = 'Please give consent before saving.'; return; }
  try {
    await postJSON(`/api/family-check/${PROFILE}`, { question: { question: $('#familyQuestion').value, answer: $('#familyAnswer').value }, consent: { granted: true, purpose: 'Family verification against impersonation and cloned voices' } });
    st.textContent = 'Saved. The answer is kept only as a protected hash.'; $('#familyQuestion').value = ''; $('#familyAnswer').value = ''; $('#familyConsent').checked = false; loadFamily();
  } catch (e) { st.textContent = e.message; }
});
$('#familyList').addEventListener('click', async ev => {
  const id = ev.target?.closest('[data-revoke-fq]')?.dataset.revokeFq; if (!id) return;
  try { const r = await fetch(`/api/family-check/${PROFILE}/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consent: { granted: true, purpose: 'Remove family question' } }) }); if (!r.ok) throw new Error((await r.json()).error); loadFamily(); }
  catch (e) { $('#familyStatus').textContent = e.message; }
});

// ---------------------------------------------------------------- chat
const chat = $('#chat');
function scrollChat(el) { requestAnimationFrame(() => chat.scrollTo({ top: el ? Math.max(0, el.offsetTop - 8) : chat.scrollHeight, behavior: 'smooth' })); }
function add(html, cls) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; chat.appendChild(d); if (!screens.chat.classList.contains('active')) $('#chatBadge').hidden = false; scrollChat(); return d; }
const addMine = t => add(`<div class="msg me" dir="auto">${escapeHtml(t)}</div>`, 'row me');
const addForwarded = (t, from) => add(`<div class="msg fwd" dir="auto"><span class="fwd-label">${ico('message')}Forwarded · ${escapeHtml(from || 'unknown sender')}</span>${escapeHtml(t)}</div>`, 'row me');
const addYumma = t => add(`<img class="av" src="/yumma-portrait.jpg" alt=""><div class="msg y" dir="auto">${escapeHtml(t)}</div>`, 'row y');
const addCard = html => add(html, 'row card-row');
const addTyping = () => add('<img class="av" src="/yumma-portrait.jpg" alt=""><div class="msg y typing" aria-label="Yumma is thinking"><i></i><i></i><i></i></div>', 'row y');
async function speakInChat(text, row) {
  const bubble = row && row.querySelector('.msg'); const av = $('#hdrAvatar');
  av.classList.add('speaking'); if (bubble) bubble.classList.add('speaking');
  const g = Speech.gen;
  for (const line of Speech.sentences(text)) { if (Speech.gen !== g) break; await Speech.speakLine(line, () => pulse(av)); }
  av.classList.remove('speaking'); if (bubble) bubble.classList.remove('speaking');
}
function setSuggestions(list) {
  $('#suggest').innerHTML = list.map(s => `<button type="button" class="chip-btn">${escapeHtml(s)}</button>`).join('');
}
$('#suggest').addEventListener('click', e => { const b = e.target.closest('.chip-btn'); if (b) ask(b.textContent, {}); });
$('#composer').addEventListener('submit', e => { e.preventDefault(); const t = $('#chatInput').value.trim(); if (!t) return; $('#chatInput').value = ''; ask(t, {}); });

let checksToday = 0; try { checksToday = Number(sessionStorage.getItem('yumma-checks') || 0); } catch {}
function countCheck() { checksToday++; try { sessionStorage.setItem('yumma-checks', String(checksToday)); } catch {} $('#homeChecks').textContent = `${checksToday} today · Yumma is watching for pressure`; }
if (checksToday) $('#homeChecks').textContent = `${checksToday} today · Yumma is watching for pressure`;

let inflight = false, askGen = 0;
async function ask(message, { forwarded = false, from = '' } = {}) {
  if (inflight) return; inflight = true;
  const gen = ++askGen;
  Speech.cancel(); yummaVoice.stop(); if (!overlay.hidden) { skipOverlay = true; closeOverlay(); }
  goTab('chat'); setSuggestions([]);
  if (forwarded) addForwarded(message, from); else addMine(message);
  const typing = addTyping(); Hood.running();
  $('#hdrStatus').textContent = 'Checking…';
  let p;
  try { p = await postJSON('/api/conversation', { message, sessionId }); }
  catch (e) { typing.remove(); addYumma(`I couldn’t check that just now (${e.message}). Please try again.`); $('#hdrStatus').textContent = 'Protecting Salma'; inflight = false; return; }
  await sleep(450); typing.remove(); inflight = false; $('#hdrStatus').textContent = 'Protecting Salma';
  Hood.show(p);
  const a = p.assessment; const posture = a.protectionPlan?.posture || 'INFORMATIONAL';
  const pressured = !p.isFollowUp && (posture === 'PAUSE_AND_PROTECT' || posture === 'VERIFY');
  if (!p.isFollowUp) countCheck();
  if (pressured) { await intervene(p, gen); if (gen !== askGen) return; renderCards(p); setSuggestions(['Why is this risky?', 'What should I do now?', 'Is it safe to send?']); if (!(a.familyCheck?.applies && a.familyCheck.questions?.length)) setTimeout(offerFeedback, 1500); }
  else { const text = p.conversation?.explanation || a.response; const row = addYumma(text); setSuggestions(p.isFollowUp ? ['What should I do now?'] : []); await speakInChat(text, row); if (!p.isFollowUp && gen === askGen) offerFeedback(); }
}

// ---------------------------------------------------------------- the intervention: Yumma appears, speaks, plays the promise back
const overlay = $('#holoOverlay'), caption = $('#caption');
let skipOverlay = false, overlayPromise = '';
async function sayOverlay(text) {
  const g = Speech.gen;
  for (const line of Speech.sentences(text)) {
    if (skipOverlay || Speech.gen !== g) return;
    renderCaption(caption, line); ovHolo.classList.add('speaking');
    await Speech.speakLine(line, i => { markCaption(caption, i); pulse(ovHolo); });
  }
  ovHolo.classList.remove('speaking');
}
async function playPromiseInOverlay() {
  caption.classList.add('quote'); renderCaption(caption, `“${overlayPromise}”`); markCaption(caption, 999);
  ovHolo.classList.add('listening');
  try { if (await yummaVoice.has()) { await yummaVoice.play(); } else { await sayOverlay(`“${overlayPromise}”`); } }
  catch { caption.classList.remove('quote'); await sayOverlay('Tap “Hear my promise” to listen to your own voice.'); }
  ovHolo.classList.remove('listening'); caption.classList.remove('quote');
}
async function intervene(p, gen) {
  const a = p.assessment; skipOverlay = false;
  const live = () => gen === askGen && !skipOverlay;
  overlayPromise = a.context?.recalledContracts?.[0]?.commitment || promiseLine;
  $('#ovRisk').textContent = `${a.risk.level} RISK · ${a.risk.score}/100`; $('#ovRisk').className = `risk-pill ${a.risk.level}`;
  $('#ovPromise').hidden = !overlayPromise;
  caption.innerHTML = ''; caption.classList.remove('quote');
  overlay.hidden = false; overlay.classList.remove('out'); void overlay.offsetWidth; overlay.classList.add('in');
  ovHolo.classList.remove('appear', 'alert'); void ovHolo.offsetWidth; ovHolo.classList.add('appear'); if (a.risk.level === 'HIGH') ovHolo.classList.add('alert');
  $('#phone').classList.add('buzz'); setTimeout(() => $('#phone').classList.remove('buzz'), 600);
  await sleep(1300);
  if (!live()) return;
  const s = Speech.sentences(a.response);
  await sayOverlay(s.slice(0, 2).join(' '));
  if (live() && overlayPromise) {
    const own = await yummaVoice.has();
    await sayOverlay(isArabic(a.response) ? 'تذكّري الوعد الذي قطعتِه وأنتِ هادئة.' : own ? 'You made a promise when you were calm. Listen to your own voice.' : 'When you were calm, you made yourself a promise.');
    if (live()) await playPromiseInOverlay();
  }
  if (live()) {
    const fc = a.familyCheck;
    const last = fc?.applies && fc.questions?.length ? `Before anything else, ask the caller your family question: “${fc.questions[0].question}”` : (isArabic(a.response) ? s.slice(2).join(' ') : 'Please check it yourself, on a number you already know.');
    await sayOverlay(last);
  }
  if (live()) await sleep(700);
  if (gen === askGen) closeOverlay();
}
function closeOverlay() {
  if (overlay.hidden) return;
  overlay.classList.remove('in'); overlay.classList.add('out');
  setTimeout(() => { overlay.hidden = true; overlay.classList.remove('out'); ovHolo.classList.remove('speaking', 'listening'); }, 420);
}
$('#ovContinue').addEventListener('click', () => { skipOverlay = true; Speech.cancel(); yummaVoice.stop(); closeOverlay(); });
$('#ovPromise').addEventListener('click', () => { Speech.cancel(); playPromiseInOverlay(); });

// ---------------------------------------------------------------- cards in the chat after the intervention
function renderCards(p) {
  const a = p.assessment; const posture = a.protectionPlan?.posture || 'INFORMATIONAL';
  const text = p.conversation?.explanation || a.response;
  addYumma(text);
  const signs = (a.risk.reasons || []).slice(0, 4).map(x => `<span>${ico('alert')}${escapeHtml(x.reason)}</span>`).join('');
  addCard(`<div class="card risk-card"><div class="rc-top"><div class="rc-gauge">${riskGauge(a.risk.level, a.risk.score)}<span class="risk ${escapeHtml(a.risk.level)}">${escapeHtml(a.risk.level)} RISK</span></div><div class="decision ${escapeHtml(posture)}">${medal('shield', 'sm')}<div><span>YUMMA DECISION</span><strong>${escapeHtml(posture.replaceAll('_', ' '))}</strong></div></div></div>${signs ? `<div class="signs ${escapeHtml(a.risk.level)}">${signs}</div>` : ''}</div>`);
  const promise = a.context?.recalledContracts?.[0]?.commitment;
  if (promise) {
    const row = addCard(`<div class="card promise-card"><div class="card-head">${medal('wave', 'sm')}<div><strong>YOUR PROMISE, IN YOUR OWN VOICE</strong><small>Made by you, while calm</small></div></div><p class="vm-quote" dir="auto">“${escapeHtml(promise)}”</p>${WAVEFORM}<button type="button" class="pill-btn gold" data-play-promise>${ico('play')}Hear my promise</button></div>`);
    row.querySelector('[data-play-promise]').addEventListener('click', async () => { if (await yummaVoice.has()) yummaVoice.play().catch(() => {}); else speakInChat(promise, null); });
  }
  const fc = a.familyCheck;
  if (fc?.applies) {
    if (fc.questions?.length) {
      const q = fc.questions[0];
      const row = addCard(`<div class="card family-card"><div class="card-head">${medal('family', 'sm')}<div><strong>FAMILY CHECK</strong><small>The question a cloned voice cannot answer</small></div></div><p class="fq">Ask the caller: “${escapeHtml(q.question)}”</p><form class="fc-row"><input type="text" maxlength="80" placeholder="What did the caller answer?" aria-label="What the caller answered"><button type="submit">Check</button></form><div class="family-result" role="status" aria-live="polite"></div><p class="fm-foot">${ico('check')}You decide. Yumma never moves money or contacts anyone for you.</p></div>`);
      row.querySelector('form').addEventListener('submit', e => { e.preventDefault(); checkFamily(q.id, row.querySelector('input').value, row.querySelector('.family-result')); });
      setTimeout(() => scrollChat(row), 250);
    } else addYumma(fc.suggestion || 'Set a family question in the Family tab, so I can check callers for you.');
  }
  const next = a.protectionPlan?.nextStep; const acted = a.protectionPlan?.ifAlreadyActed;
  if (next || acted) addCard(`<div class="card next-card"><div class="card-head">${medal('phone', 'sm')}<div><strong>WHAT YOU CAN DO NOW</strong><small>Your choice, always</small></div></div>${next ? `<p>${escapeHtml(next)}</p>` : ''}${acted ? `<p class="acted" dir="auto">${escapeHtml(acted)}</p>` : ''}</div>`);
}
async function checkFamily(id, answer, out) {
  if (!answer || !answer.trim()) { out.textContent = 'Type what the caller answered first.'; out.className = 'family-result'; return; }
  try {
    const d = await postJSON(`/api/family-check/${PROFILE}/${encodeURIComponent(id)}/verify`, { answer });
    out.className = `family-result ${d.result}`;
    const g = String(d.guidance || ''); const cut = g.indexOf('. ') + 1;
    out.innerHTML = `<span class="fr-badge">${d.result === 'MATCH' ? '✓' : d.result === 'LOCKED' ? '⏸' : '✗'}</span><span>${cut > 0 ? `<b>${escapeHtml(g.slice(0, cut))}</b>${escapeHtml(g.slice(cut))}` : escapeHtml(g)}</span>`;
    scrollChat();
    await speakInChat(g, null);
    offerFeedback();
  } catch (e) { out.className = 'family-result'; out.textContent = 'Could not check the answer: ' + e.message; }
}

// ---------------------------------------------------------------- anonymous tester feedback: three taps, once per session
const FEEDBACK_QS = [
  ['who', 'Who are you?', [['carer', 'I look after a parent'], ['older', 'I’m 60 or older'], ['banking', 'I work in banking or fraud'], ['judge', 'I’m a judge or reviewer'], ['other', 'Someone else']]],
  ['helped', 'Would Yumma have helped someone you know?', [['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]],
  ['pay', 'Core protection is free. Would your family add AED 5 a month for extra family features?', [['yes', 'Yes'], ['maybe', 'Maybe'], ['no', 'No']]]
];
let feedbackOffered = false; try { feedbackOffered = sessionStorage.getItem('yumma-feedback') === '1'; } catch {}
function offerFeedback() {
  if (feedbackOffered) return; feedbackOffered = true; try { sessionStorage.setItem('yumma-feedback', '1'); } catch {}
  const qs = FEEDBACK_QS.map(([id, q, opts], i) => `<div class="fb-q" data-q="${id}"${i ? ' hidden' : ''}><p>${escapeHtml(q)}</p><div class="fb-opts">${opts.map(([v, label]) => `<button type="button" data-v="${v}">${escapeHtml(label)}</button>`).join('')}</div></div>`).join('');
  const row = addCard(`<div class="card feedback-card"><div class="card-head">${medal('heart', 'sm')}<div><strong>HELP ME IMPROVE YUMMA</strong><small>Three taps · anonymous · no names or numbers</small></div></div>${qs}<div class="fb-done" hidden></div></div>`);
  const answers = {};
  row.addEventListener('click', async e => {
    const btn = e.target.closest('.fb-opts button'); if (!btn) return;
    const q = btn.closest('.fb-q'); answers[q.dataset.q] = btn.dataset.v;
    q.querySelectorAll('button').forEach(b => b.classList.toggle('on', b === btn)); q.classList.add('answered');
    const next = q.nextElementSibling;
    if (next && next.classList.contains('fb-q')) { next.hidden = false; scrollChat(); return; }
    const done = row.querySelector('.fb-done');
    try {
      const d = await postJSON('/api/feedback', { ...answers, sessionId });
      const sm = d.summary || {};
      done.textContent = answers.who === 'judge'
        ? 'Thank you. Judges’ answers are counted separately from real testers.'
        : `Thank you. ${sm.testers ? `So far ${sm.testers} ${sm.testers === 1 ? 'person has' : 'people have'} tried Yumma; ${sm.wouldHelpPct}% say it would help someone they know.` : ''}`;
      done.hidden = false; row.querySelectorAll('.fb-opts button').forEach(b => { b.disabled = true; });
      scrollChat(); loadTesterResults();
      speakInChat('Thank you. That helps me protect more families.', null);
    } catch (err) { done.textContent = 'Could not save your answer: ' + err.message; done.hidden = false; }
  });
  setTimeout(() => scrollChat(), 200);
}
async function loadTesterResults() {
  try {
    const sm = (await (await fetch('/api/feedback/summary')).json()).summary;
    const box = $('#testerResults');
    if (!sm || sm.testers < 10) { box.hidden = true; return; }
    $('#testerStats').innerHTML = `<div class="g"><small>Real people who tried Yumma</small><b>${sm.testers}</b></div><div class="g"><small>Say it would help someone they know</small><b>${sm.wouldHelpPct}%</b></div><div class="g"><small>Look after a parent, or are 60+</small><b>${sm.who.carer + sm.who.older}</b></div><div class="g neutral"><small>Would add AED 5 a month (yes or maybe)</small><b>${sm.wouldPayPct}%</b></div>`;
    box.hidden = false;
  } catch {}
}

// ---------------------------------------------------------------- incoming messages (notifications on Salma's phone)
const notif = $('#notif');
let pending = null;
function notify(message, from) {
  pending = { message, from: from || '+971 50 ••• 4821' };
  $('#notifText').textContent = message; $('#notifFrom').textContent = pending.from;
  notif.hidden = false; notif.classList.remove('in'); void notif.offsetWidth; notif.classList.add('in');
  $('#phone').classList.add('buzz'); setTimeout(() => $('#phone').classList.remove('buzz'), 600);
}
function hideNotif() { notif.classList.remove('in'); setTimeout(() => { notif.hidden = true; }, 250); }
$('#notifCheck').addEventListener('click', () => { if (!pending) return; const p = pending; pending = null; hideNotif(); ask(p.message, { forwarded: true, from: p.from }); });
$('#notifDismiss').addEventListener('click', hideNotif);

// ---------------------------------------------------------------- Under the hood (for judges)
const PRESET_TEXT = {
  'family-new-number': { from: '+971 50 ••• 4821', text: "Hi Mum, it's me. My phone broke so this is my new number. I'm in trouble and need AED 4,000 sent today to a friend's account. Please don't call, I can't talk right now." },
  'otp-request': { from: 'Bank Support', text: 'Someone claiming to be bank support urgently says my account will be blocked unless I read out the one-time password they just sent me. They told me to keep it secret.' },
  'bank-transfer-pressure': { from: '+971 4 ••• 2210', text: 'A caller claiming to be my bank says my account will be blocked unless I transfer my savings immediately. They told me not to tell anyone.' },
  'remote-access': { from: 'Tech Support', text: 'A support agent says I must install AnyDesk and share my screen so they can protect my bank account.' },
  'benign-information': { ask: true, text: 'Can you explain what a bank statement is and how I can read the transactions?' },
  'arabic-code': { from: 'البنك', title: 'Arabic: bank code request', text: 'أنا من البنك، سيتم إيقاف حسابك اليوم. أرسل لي رمز التحقق الآن ولا تخبر أحداً.' }
};
const STEP_LABEL = { receive_input: 'Receive the message', ai_risk_signal: 'AI risk signal', understand: 'Understand the request', recall_profile_promises: 'Recall Salma’s promises', match_scam_patterns: 'Match 19 UAE scam patterns', apply_ai_signal: 'Apply the AI signal (raise only)', map_consequences: 'Map the consequences', policy: 'Policy decision', protection_plan: 'Protection plan', family_check: 'Family check', recall_saved_promises: 'Recall saved promises', explain: 'Explain in plain words', write_decision_record: 'Write the decision record', output: 'Reply to Salma' };
const Hood = (() => {
  let trace = null, record = null;
  function detail(st) {
    const { n, step, ms, ...rest } = st;
    return Object.entries(rest).filter(([, v]) => v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && !v.length)).slice(0, 3)
      .map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}`)
      .join(' · ').replace(/^(.{110}).+$/, '$1…');
  }
  function guarantees(p, health) {
    const ai = p?.aiRisk || (health ? { status: health.aiRiskSignal?.configured ? 'ready' : 'not_configured', provider: health.aiRiskSignal?.provider } : null);
    const aiOn = ai && ai.status !== 'not_configured';
    const items = [
      ['Authorisation granted', p ? (p.safeguards?.authorizationGranted ? 'YES' : 'NO') : 'NO', 'good'],
      ['External action taken', p ? (p.safeguards?.externalActionTaken ? 'YES' : 'NONE') : 'NONE', 'good'],
      ['AI can lower risk', 'NEVER', 'good'],
      ['AI step', aiOn ? `ON · ${ai.provider || ''}${ai.applied ? ' · raised risk' : ''}` : 'OFF · rules only', aiOn ? 'good' : 'neutral'],
      ['Message stored', 'Fingerprint only', 'good']
    ];
    $('#guarantees').innerHTML = items.map(([k, v, c]) => `<div class="g ${c}"><small>${escapeHtml(k)}</small><b>${escapeHtml(v)}</b></div>`).join('');
  }
  return {
    guarantees,
    running() { $('#liveTrace').innerHTML = '<li class="run"><i class="spin"></i>Yumma is working…</li>'; $('#traceMeta').textContent = ''; },
    async show(p) {
      trace = p.trace; record = p.decisionRecord;
      const steps = trace?.steps || [];
      $('#traceMeta').textContent = steps.length ? `${steps.length} steps · ${trace.totalMs} ms` : '';
      const ol = $('#liveTrace');
      ol.innerHTML = steps.map(st => `<li><span class="tick">${ico('check')}</span><div><b>${escapeHtml(STEP_LABEL[st.step] || String(st.step).replaceAll('_', ' '))}</b><small>${escapeHtml(detail(st))}</small></div><span class="ms">${escapeHtml(String(st.ms))} ms</span></li>`).join('') || '<li class="idle">No steps returned.</li>';
      [...ol.children].forEach((li, i) => setTimeout(() => li.classList.add('on'), 90 * i));
      $('#recordInfo').innerHTML = record ? `Decision ${escapeHtml(String(record.seq))} · hash <code>${escapeHtml(record.hash.slice(0, 12))}…</code> chained to <code>${escapeHtml(record.prevHash.slice(0, 12))}…</code><br>The message itself is not stored, only its fingerprint.` : 'Follow-up answers reuse the last decision.';
      $('#dlTrace').disabled = !trace; $('#dlRecord').disabled = !record; $('#chainStatus').textContent = '';
      guarantees(p);
    },
    get trace() { return trace; }, get record() { return record; }
  };
})();
function downloadJson(name, value) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#dlTrace').addEventListener('click', () => Hood.trace && downloadJson(`${Hood.trace.id}.json`, Hood.trace));
$('#dlRecord').addEventListener('click', () => Hood.record && downloadJson(`${Hood.record.id}.json`, Hood.record));
$('#verifyChain').addEventListener('click', async () => {
  const out = $('#chainStatus');
  try { const d = await (await fetch('/api/decision-log/verify')).json(); out.textContent = d.ok ? `✓ Chain intact: ${d.entries} decision${d.entries === 1 ? '' : 's'}, every link and hash recomputed.` : `✗ Chain broken at entry ${d.brokenAt}: ${d.reason}.`; }
  catch (e) { out.textContent = 'Could not verify the chain: ' + e.message; }
});
async function loadPresets() {
  let scenarios = [];
  try { scenarios = (await (await fetch('/api/demo/scenarios')).json()).scenarios || []; } catch {}
  const list = [...scenarios.map(s => ({ id: s.id, title: s.title })), { id: 'arabic-code', title: PRESET_TEXT['arabic-code'].title }];
  $('#presets').innerHTML = list.filter(s => PRESET_TEXT[s.id]).map(s => { const t = PRESET_TEXT[s.id]; return `<button type="button" class="preset" data-preset="${escapeHtml(s.id)}"><b>${escapeHtml(s.title)}</b><small dir="auto">${escapeHtml(t.text.slice(0, 70))}…</small><em>${t.ask ? 'Salma asks Yumma' : 'Arrives on her phone'}</em></button>`; }).join('');
}
function closeHoodOnMobile() { if (matchMedia('(max-width: 899px)').matches) $('#hood').classList.remove('open'); }
$('#presets').addEventListener('click', e => {
  const b = e.target.closest('[data-preset]'); if (!b) return; const t = PRESET_TEXT[b.dataset.preset];
  autoDemo.cancel(); closeHoodOnMobile();
  if (t.ask) ask(t.text, {}); else { goTab('home'); notify(t.text, t.from); }
});
$('#sendCustom').addEventListener('click', () => { const t = $('#customMsg').value.trim(); if (!t) return; autoDemo.cancel(); closeHoodOnMobile(); goTab('home'); notify(t, 'Unknown sender'); $('#customMsg').value = ''; });
$('#hoodBtn').addEventListener('click', () => $('#hood').classList.add('open'));
$('#hoodBtnHdr').addEventListener('click', () => $('#hood').classList.add('open'));
$('#hoodClose').addEventListener('click', () => $('#hood').classList.remove('open'));

// ---------------------------------------------------------------- speak to Yumma (browser speech recognition; never sends on its own)
(function initMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition; const btn = $('#micBtn');
  if (!SR) { btn.disabled = true; btn.title = 'Speech input is not supported by this browser.'; return; }
  const rec = new SR(); rec.lang = 'en-GB'; rec.interimResults = true; rec.continuous = false;
  rec.onstart = () => btn.classList.add('listening');
  rec.onend = () => btn.classList.remove('listening');
  rec.onresult = e => { let t = ''; for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript; $('#chatInput').value = t; };
  btn.addEventListener('click', () => { try { rec.start(); } catch {} });
})();

// ---------------------------------------------------------------- start-up
addYumma(`${greeting}, Salma. Forward me any message or call that feels rushed, and I’ll check it with you. You always decide.`);
$('#chatBadge').hidden = true;
loadPromise(); loadFamily(); loadPresets(); loadTesterResults();
(async () => {
  try { const h = await (await fetch('/api/health')).json(); Hood.guarantees(null, h); } catch { Hood.guarantees(null, null); }
  try { const d = await (await fetch('/api/session')).json(); if (d.judgeMode) { $('#modeTag').textContent = 'SYNTHETIC JUDGE DEMO'; $('#judgeNote').hidden = false; } } catch {}
})();
// A first message arrives on Salma's phone a few seconds after the app opens, once per session.
const autoDemo = (() => {
  let t = null; let seen = false; try { seen = sessionStorage.getItem('yumma-first-message') === '1'; } catch {}
  if (!seen) t = setTimeout(() => { try { sessionStorage.setItem('yumma-first-message', '1'); } catch {} const f = PRESET_TEXT['family-new-number']; notify(f.text, f.from); }, 3500);
  return { cancel() { clearTimeout(t); try { sessionStorage.setItem('yumma-first-message', '1'); } catch {} } };
})();
