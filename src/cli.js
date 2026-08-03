#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { planIntent, validatePlan } from './index.js';
import { CliUsageError, parseCommandLine, USAGE, USAGE_STATUS } from './cli-args.js';
function readJson(file) { return JSON.parse(fs.readFileSync(file,'utf8')); }
function readCatalog(dir) { return { connectors: fs.readdirSync(dir).filter(f=>f.endsWith('.json')).map(f=>readJson(path.join(dir,f))) }; }
const PKG = (() => { try { const f = path.join(path.dirname(fileURLToPath(import.meta.url)),'..','package.json'); return JSON.parse(fs.readFileSync(f,'utf8')); } catch(e) { return {name:'connector-router',version:'0.0.0'}; } })();
try {
  const { command, positional, options } = parseCommandLine(process.argv.slice(2));
  if (command === '--version') { console.log(PKG.version); process.exit(0); }
  if (command === '--help') { console.log(USAGE); process.exit(0); }
  if (command === 'plan') {
    const catalogDir = options['--catalog'] ?? 'fixtures/connectors';
    const maxRisk = options['--max-risk'] ?? 'draft';
    const fields = options['--fields'] ? readJson(options['--fields']) : {};
    const result = planIntent({intent: positional, catalog: readCatalog(catalogDir), fields, maxRisk});
    console.log(JSON.stringify(result, null, 2)); process.exit(result.ok ? 0 : 2);
  }
  if (command === 'validate') {
    const plan = readJson(positional); const catalogDir = options['--catalog'] ?? 'fixtures/connectors';
    const result = validatePlan(plan, readCatalog(catalogDir)); console.log(JSON.stringify(result,null,2)); process.exit(result.ok ? 0 : 2);
  }
} catch (err) {
  if (err instanceof CliUsageError) {
    console.error(`Error: ${err.message}\n\n${USAGE}`);
    process.exit(USAGE_STATUS);
  }
  console.error(err.message); process.exit(1);
}
