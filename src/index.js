export const RISK_ORDER = ['read','draft','internal_write','external_write','public_publish'];
export function loadCatalog(catalog) {
  if (Array.isArray(catalog)) return catalog;
  return catalog && Array.isArray(catalog.connectors) ? catalog.connectors : [];
}
function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isOptionalStringArray(value) {
  return value === undefined || (
    Array.isArray(value) && value.every(isNonEmptyString)
  );
}
function validateCatalogShape(catalog) {
  if (!Array.isArray(catalog) && !(catalog && Array.isArray(catalog.connectors))) {
    return ['catalog connectors must be an array'];
  }
  return loadCatalog(catalog).flatMap((connector, connectorIndex) => {
    const connectorPath = `catalog connector[${connectorIndex}]`;
    if (!connector || typeof connector !== 'object' || Array.isArray(connector)) {
      return [`${connectorPath} must be an object`];
    }
    const errors = [];
    if (!isNonEmptyString(connector.id)) {
      errors.push(`${connectorPath}.id must be a non-empty string`);
    }
    if (connector.actions !== undefined && !Array.isArray(connector.actions)) {
      errors.push(`${connectorPath}.actions must be an array`);
      return errors;
    }
    for (const [actionIndex, action] of (connector.actions || []).entries()) {
      const actionPath = `${connectorPath}.actions[${actionIndex}]`;
      if (!action || typeof action !== 'object' || Array.isArray(action)) {
        errors.push(`${actionPath} must be an object`);
        continue;
      }
      if (!isNonEmptyString(action.id)) {
        errors.push(`${actionPath}.id must be a non-empty string`);
      }
      for (const field of ['keywords', 'requiredFields']) {
        if (!isOptionalStringArray(action[field])) {
          errors.push(`${actionPath}.${field} must be an array of non-empty strings`);
        }
      }
    }
    return errors;
  });
}
function validateCatalogUniqueness(catalog) {
  const connectorLocations = new Map();
  const errors = [];
  for (const [connectorIndex, connector] of loadCatalog(catalog).entries()) {
    const connectorPath = `catalog connector[${connectorIndex}]`;
    const previousConnectorPath = connectorLocations.get(connector.id);
    if (previousConnectorPath) {
      errors.push(`${connectorPath}.id duplicates ${previousConnectorPath}.id: ${connector.id}`);
    } else {
      connectorLocations.set(connector.id, connectorPath);
    }

    const actionLocations = new Map();
    for (const [actionIndex, action] of (connector.actions || []).entries()) {
      const actionPath = `${connectorPath}.actions[${actionIndex}]`;
      const previousActionPath = actionLocations.get(action.id);
      if (previousActionPath) {
        errors.push(`${actionPath}.id duplicates ${previousActionPath}.id: ${action.id}`);
      } else {
        actionLocations.set(action.id, actionPath);
      }
    }
  }
  return errors;
}
export function findCandidates(intent, connectors) {
  const text = intent.toLowerCase();
  return loadCatalog(connectors).flatMap(connector => (connector.actions || []).map(action => ({connector, action})))
    .filter(({action}) => (action.keywords || []).some(k => text.includes(k.toLowerCase())));
}
export function validateFields(action, fields={}) {
  return (action.requiredFields || []).filter(field => !isNonEmptyString(fields[field]));
}
function formatRisk(risk) {
  return risk === undefined ? 'missing' : String(risk);
}
export function validateCatalogRisks(catalog) {
  return loadCatalog(catalog).flatMap(connector => (connector.actions || []).flatMap(action =>
    RISK_ORDER.includes(action.risk)
      ? []
      : [`unsupported catalog risk for ${connector.id}.${action.id}: ${formatRisk(action.risk)}`]
  ));
}
export function validateCatalog(catalog) {
  const shapeErrors = validateCatalogShape(catalog);
  if (shapeErrors.length) return shapeErrors;
  const uniquenessErrors = validateCatalogUniqueness(catalog);
  return uniquenessErrors.length ? uniquenessErrors : validateCatalogRisks(catalog);
}
export function planIntent({ intent, catalog, fields={}, maxRisk='draft' }) {
  if (!RISK_ORDER.includes(maxRisk)) {
    return { ok:false, errors:[`unsupported maxRisk: ${formatRisk(maxRisk)}`], candidates:[] };
  }
  const catalogErrors = validateCatalog(catalog);
  if (catalogErrors.length) return { ok:false, errors:catalogErrors, candidates:[] };
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
  if (!isObject(plan)) return { ok:false, errors:['plan must be an object'] };
  if (!isObject(plan.action)) return { ok:false, errors:['plan.action must be an object'] };
  if (plan.action.fields !== undefined && !isObject(plan.action.fields)) {
    return { ok:false, errors:['plan.action.fields must be an object'] };
  }
  const catalogErrors = validateCatalog(catalog);
  if (catalogErrors.length) return { ok:false, errors:catalogErrors };
  const connectors = loadCatalog(catalog);
  const connector = connectors.find(c => c.id === plan.action?.connector);
  const action = connector?.actions?.find(a => a.id === plan.action?.operation);
  const errors = [];
  if (!connector) errors.push('unknown connector');
  if (!action) errors.push('unknown action');
  if (action) {
    if (plan.action.risk !== action.risk) errors.push('action risk does not match catalog');
    errors.push(...validateFields(action, plan.action.fields || {}).map(f => 'missing field: ' + f));
    if (['external_write','public_publish'].includes(action.risk) && plan.requiresApproval !== true) errors.push('approval required');
  }
  return { ok: errors.length === 0, errors };
}
