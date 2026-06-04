#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { planIntent, validatePlan } from './index.js';
function readJson(file) { return JSON.parse(fs.readFileSync(file,'utf8')); }
function readCatalog(dir) { return { connectors: fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>readJson(path.join(dir,f))) }; }
const PKG = (() => { try { const f = path.join(path.dirname(new URL(import.meta.url).pathname),'..','package.json'); return JSON.parse(fs.readFileSync(f,'utf8')); } catch(e) { return {name:'connector-router',version:'0.0.0'}; } })();
const args = process.argv.slice(2); const cmd = args.shift();
try {
  if (cmd === '--version') { console.log(PKG.version); process.exit(0); }
  if (!cmd || cmd === '--help') { console.log('Usage: connector-router <plan|validate> ...'); process.exit(cmd ? 0 : 1); }
  if (cmd === 'plan') {
    const intent = args.shift(); const catalogDir = args[args.indexOf('--catalog')+1] || 'fixtures/connectors';
    const maxRisk = args[args.indexOf('--max-risk')+1] || 'draft';
    const fieldIndex = args.indexOf('--fields'); const fields = fieldIndex >= 0 ? readJson(args[fieldIndex+1]) : {};
    const result = planIntent({intent, catalog: readCatalog(catalogDir), fields, maxRisk});
    console.log(JSON.stringify(result, null, 2)); process.exit(result.ok ? 0 : 2);
  }
  if (cmd === 'validate') {
    const plan = readJson(args.shift()); const catalogDir = args[args.indexOf('--catalog')+1] || 'fixtures/connectors';
    const result = validatePlan(plan, readCatalog(catalogDir)); console.log(JSON.stringify(result,null,2)); process.exit(result.ok ? 0 : 2);
  }
  throw new Error('Unknown command: '+cmd);
} catch (err) { console.error(err.message); process.exit(1); }
