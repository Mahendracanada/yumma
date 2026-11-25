const TYPES = Object.freeze(['preference','commitment','boundary','relationship','temporary_instruction','context']);

function classifyWisdom(content, explicitType) {
  const text = String(content || '').trim();
  const s = text.toLowerCase();
  if (TYPES.includes(explicitType)) return { type: explicitType, confidence: 1, basis: 'user_selected' };
  if (/\b(for today|for tonight|until tomorrow|for this week|just this once|temporarily|until \d{1,2}[:.]?\d{0,2})\b/.test(s))
    return { type: 'temporary_instruction', confidence: 0.9, basis: 'rule_inference' };
  if (/\b(never|do not|don't|must not|under no circumstances|i will not|i won't|not to)\b/.test(s))
    return { type: 'boundary', confidence: 0.82, basis: 'rule_inference' };
  if (/\b(i promised|i committed|i agreed|i will|i shall|my commitment|remind me to)\b/.test(s))
    return { type: 'commitment', confidence: 0.8, basis: 'rule_inference' };
  if (/\b(my daughter|my son|my spouse|my partner|my friend|my caregiver|my doctor|my neighbour|my neighbor)\b/.test(s))
    return { type: 'relationship', confidence: 0.78, basis: 'rule_inference' };
  if (/\b(i prefer|i like|i dislike|i hate|i enjoy|please use|i would rather|my preference)\b/.test(s))
    return { type: 'preference', confidence: 0.82, basis: 'rule_inference' };
  return { type: 'context', confidence: 0.55, basis: 'default' };
}

function detectPotentialConflict(existing, candidate) {
  const a = String(existing || '').toLowerCase();
  const b = String(candidate || '').toLowerCase();
  const pairs = [
    [/\b(prefer|like|want)\b/, /\b(do not|don't|dislike|hate|avoid)\b/],
    [/\b(do not|don't|never|won't|will not)\b/, /\b(please|always|will|want to)\b/]
  ];
  const shared = [...new Set(a.split(/\W+/).filter(w => w.length > 3 && b.includes(w)))];
  const polarityConflict = pairs.some(([x,y]) => (x.test(a) && y.test(b)) || (y.test(a) && x.test(b)));
  return polarityConflict && shared.length > 0 ? { possible: true, sharedTerms: shared.slice(0,5), resolution: 'ask_user' } : { possible: false, sharedTerms: [], resolution: 'none' };
}

function buildWisdomGraph(memories = []) {
  const active = memories.filter(m => m.status === 'active');
  const nodes = active.map(m => ({ id:m.id, type:m.type, content:m.content, expiresAt:m.expiresAt || null, confidence:m.classificationConfidence ?? null }));
  const conflicts = [];
  for (let i=0;i<nodes.length;i++) for (let j=i+1;j<nodes.length;j++) {
    const c = detectPotentialConflict(nodes[i].content, nodes[j].content);
    if (c.possible) conflicts.push({ memoryIds:[nodes[i].id,nodes[j].id], ...c });
  }
  return { nodes, counts: nodes.reduce((o,n)=>(o[n.type]=(o[n.type]||0)+1,o),{}), conflicts, requiresUserResolution: conflicts.length>0 };
}

module.exports = { TYPES, classifyWisdom, detectPotentialConflict, buildWisdomGraph };
