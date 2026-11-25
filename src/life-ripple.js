const RULES = Object.freeze([
  { cue: 'transfer', domain: 'financial', severity: 'high', consequence: 'Potential loss of funds or payment details', intervention: 'Pause the payment and verify the recipient through a separately obtained official channel.' },
  { cue: 'transfer', domain: 'essential_needs', severity: 'medium', consequence: 'A financial loss could affect funds reserved for everyday needs', intervention: 'Do not use money needed for essentials until the request is independently verified.' },
  { cue: 'credential', domain: 'account_security', severity: 'high', consequence: 'A password, PIN or one-time code could enable account access', intervention: 'Do not disclose the code; contact the institution using a trusted channel.' },
  { cue: 'credential', domain: 'digital_identity', severity: 'medium', consequence: 'Account compromise could affect access to connected services', intervention: 'Use the institution’s official security process if credentials may already have been shared.' },
  { cue: 'remoteAccess', domain: 'device_control', severity: 'high', consequence: 'A third party could view or control the device', intervention: 'Do not enable remote access or screen sharing for an unsolicited caller.' },
  { cue: 'remoteAccess', domain: 'privacy', severity: 'high', consequence: 'Private messages, documents or account information could be exposed', intervention: 'End the unsolicited session and seek independent technical help if access was granted.' },
  { cue: 'secrecy', domain: 'support_network', severity: 'medium', consequence: 'Secrecy pressure may isolate the person from trusted support', intervention: 'Take time to speak with a trusted person before deciding.' },
  { cue: 'urgency', domain: 'decision_quality', severity: 'medium', consequence: 'Time pressure can make careful checking harder', intervention: 'Pause; a genuine request should withstand independent verification.' },
  { cue: 'threat', domain: 'emotional_pressure', severity: 'medium', consequence: 'Threat language may create fear and rush a decision', intervention: 'Do not act under threat; independently contact the named institution or authority.' },
  { cue: 'linkPressure', domain: 'device_security', severity: 'medium', consequence: 'An unverified link, app or QR code may expose the device or information', intervention: 'Do not open or install from the message; navigate independently to the official service.' }
]);

const PRIORITY = { high: 3, medium: 2, low: 1 };

function evaluateLifeRipple(request, risk, wisdomGraph = { nodes: [] }) {
  const impacts = RULES.filter(rule => request.cues?.[rule.cue]).map(rule => ({
    domain: rule.domain,
    severity: rule.severity,
    consequence: rule.consequence,
    intervention: rule.intervention,
    sourceCue: rule.cue
  }));
  const matchedWisdom = (wisdomGraph.nodes || []).filter(node => {
    const content = String(node.content || '').toLowerCase();
    return impacts.some(impact => impact.domain === 'support_network' && node.type === 'relationship') ||
      (node.type === 'boundary' && /otp|code|password|money|transfer|remote|screen|secret/.test(content) && impacts.length > 0) ||
      (node.type === 'commitment' && /verify|pause|think|call|bank|independent/.test(content) && impacts.length > 0);
  }).map(node => ({ id: node.id, type: node.type, content: node.content }));
  const domains = [...new Set(impacts.map(i => i.domain))];
  const highestSeverity = impacts.reduce((best, item) => PRIORITY[item.severity] > PRIORITY[best] ? item.severity : best, 'low');
  const interventions = [...new Set(impacts.map(i => i.intervention))];
  return {
    assessed: true,
    method: 'transparent_rule_based_synthetic_consequence_graph',
    domains,
    impacts,
    matchedWisdom,
    highestSeverity: impacts.length ? highestSeverity : 'none',
    recommendedInterventions: interventions,
    summary: impacts.length
      ? `Potential consequences identified across ${domains.length} life domain${domains.length === 1 ? '' : 's'}. These are rule-based possibilities, not confirmed outcomes.`
      : 'No cross-domain consequence was identified by the current demo rules.',
    riskLevel: risk.level,
    proportionality: highestSeverity === 'high' ? 'pause_and_protect' : impacts.length ? 'verify_without_alarm' : 'informational_only'
  };
}

module.exports = { evaluateLifeRipple, RULES };
