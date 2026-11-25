'use strict';
const fs = require('node:fs');
const path = require('node:path');
const required = [
  'src/agent.js', 'src/server.js', 'src/memory.js', 'src/wisdom-graph.js',
  'src/life-ripple.js', 'src/protection-orchestrator.js', 'src/calm-contract.js',
  'src/model-adapter.js', 'src/demo-mode.js', 'src/conversation-session.js', 'src/family-check.js',
  'data/salma-profile.json', 'public/index.html', 'public/app.js', 'public/style.css',
  'public/yumma-hologram-concept.png', 'public/yumma-portrait.jpg', 'public/yumma-holo.webp', 'scripts/run-evaluation.js', 'scripts/smoke-demo.js',
  'evaluation/run-challenge.js', 'evaluation/challenge-tuning.json', 'evaluation/challenge-holdout.json',
  'evaluation/challenge-fresh.json', 'evaluation/challenge-tuning2.json', 'evaluation/challenge-fresh2.json', 'evaluation/challenge-fresh3.json',
  'evaluation/run-blind.js', 'test/family-check.test.js',
  'src/trace.js', 'evaluation/run-redteam.js'
];
const missing = required.filter(file => !fs.existsSync(path.join(__dirname, '..', file)));
if (missing.length) {
  console.error(`Source integrity check failed. Missing ${missing.length} required files:`);
  for (const file of missing) console.error(`- ${file}`);
  process.exit(1);
}
console.log(`Source integrity check: PASS (${required.length} required files present).`);
