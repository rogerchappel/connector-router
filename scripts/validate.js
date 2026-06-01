#!/usr/bin/env node
import fs from 'fs';
const required = ['README.md','SKILL.md','docs/PRD.md','docs/TASKS.md','docs/ORCHESTRATION.md','package.json'];
const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) { console.error('Missing required files: ' + missing.join(', ')); process.exit(1); }
console.log('release readiness files present');
