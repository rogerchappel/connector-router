export const RISK_ORDER = ['read','draft','internal_write','external_write','public_publish'];
export function loadCatalog(catalog) { return Array.isArray(catalog) ? catalog : catalog.connectors || []; }
export function findCandidates(intent, connectors) {
  const text = intent.toLowerCase();
  return loadCatalog(connectors).flatMap(connector => (connector.actions || []).map(action => ({connector, action})))
    .filter(({action}) => (action.keywords || []).some(k => text.includes(k.toLowerCase())));
}
export function validateFields(action, fields={}) {
  return (action.requiredFields || []).filter(field => fields[field] === undefined || fields[field] === '');
}
export function planIntent({ intent, catalog, fields={}, maxRisk='draft' }) {
  const candidates = findCandidates(intent, catalog);
  if (candidates.length === 0) return { ok:false, errors:['no matching connector action'], candidates:[] };
  const allowed = candidates.filter(({action}) => RISK_ORDER.indexOf(action.risk) <= RISK_ORDER.indexOf(maxRisk));
  if (allowed.length === 0) return { ok:false, errors:['matching actions exceed maxRisk'], candidates:candidates.map(c => c.action.id) };
  const picked = allowed[0];
  const missing = validateFields(picked.action, fields);
  const plan = {
    id: 'route_' + Date.now(), intent, requiresApproval: ['external_write','public_publish'].includes(picked.action.risk), approved: false,
    action: { connector: picked.connector.id, operation: picked.action.id, risk: picked.action.risk, fields },
    evidence: [{ source: picked.connector.id + '.json', note: 'Matched keywords: ' + (picked.action.keywords || []).join(', ') }]
  };
  return missing.length ? { ok:false, errors: missing.map(f => 'missing field: ' + f), plan } : { ok:true, plan };
}
export function validatePlan(plan, catalog) {
  const connectors = loadCatalog(catalog);
  const connector = connectors.find(c => c.id === plan.action?.connector);
  const action = connector?.actions?.find(a => a.id === plan.action?.operation);
  const errors = [];
  if (!connector) errors.push('unknown connector');
  if (!action) errors.push('unknown action');
  if (action) errors.push(...validateFields(action, plan.action.fields || {}).map(f => 'missing field: ' + f));
  if (['external_write','public_publish'].includes(plan.action?.risk) && plan.requiresApproval !== true) errors.push('approval required');
  return { ok: errors.length === 0, errors };
}
