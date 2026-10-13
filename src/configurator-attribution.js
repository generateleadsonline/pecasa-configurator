// Capture this before the configurator replaces its query string. Call on the
// homepage as well to preserve a campaign across the internal design handoff.
// Storage is session-only and injected: no cookies, requests, contact fields,
// ad click IDs, raw referrer URLs or arbitrary query parameters are collected.
export const ATTRIBUTION_STORAGE_KEY = 'pecasa-configurator-attribution-v1';

const CAMPAIGN_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id'];
const KEYS = [...CAMPAIGN_KEYS, 'referrer_host', 'entry_path'];
const PUBLIC_PATHS = new Set(['/', '/configurator/', '/configurator/thank-you/', '/privacy.html']);

function plainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    && Object.getPrototypeOf(value) === Object.prototype;
}

function parseURL(value) {
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url : null;
  } catch { return null; }
}

function cleanCampaign(value, key) {
  if (typeof value !== 'string' || value.length > 2048) return '';
  // Reject obvious personal values and embedded URLs, including encoded forms.
  // Campaign tags must be non-personal labels; arbitrary names cannot reliably
  // be identified as personal data, so never populate tags from form inputs.
  let decoded = value;
  for (let pass = 0; pass < 2; pass++) {
    try { decoded = decodeURIComponent(decoded); } catch { break; }
  }
  decoded = decoded.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '');
  const phoneLike = /^[+()\d\s.-]{7,}$/.test(decoded) && (decoded.match(/\d/g) || []).length >= 7;
  // Numeric campaign IDs are legitimate; formatted phone numbers are not.
  const numericCampaignId = key === 'utm_id' && /^\d+$/.test(decoded);
  if (/@|:\/\/|www\.|[?=&]/i.test(decoded) || phoneLike && !numericCampaignId) return '';
  return decoded.replace(/[^\p{L}\p{N}\s_.:+()/-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, 120);
}

function cleanHost(value) {
  if (typeof value !== 'string' || !value || value.length > 253) return '';
  const candidate = parseURL(`https://${value}/`);
  // Exact hostname match rejects ports, credentials, paths and query strings.
  if (!candidate || candidate.hostname !== value.toLowerCase() || !value.includes('.') || /^[\d.]+$/.test(value)) return '';
  return candidate.hostname;
}

function cleanPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/')) return '';
  const path = value === '/' ? '/' : value.replace(/\/+$/, '') + '/';
  // This app has a small public route set. Unknown paths could contain names,
  // IDs or email addresses, so retain the route category rather than the path.
  return PUBLIC_PATHS.has(path) ? path : '/[other]';
}

function sanitise(value) {
  if (!plainObject(value)) return null;
  const result = Object.fromEntries(CAMPAIGN_KEYS.map(key => [key, cleanCampaign(value[key], key)]));
  result.referrer_host = cleanHost(value.referrer_host);
  result.entry_path = cleanPath(value.entry_path);
  return result;
}

/**
 * Current campaign for this browser session. An explicit UTM parameter starts
 * a new campaign and clears missing old tags; ordinary internal navigation
 * restores the stored campaign. Inject a safely obtained sessionStorage object
 * (accessing window.sessionStorage itself can throw in restricted browsers).
 */
export function captureAttribution({url, referrer = '', storage} = {}) {
  const current = parseURL(url);
  let previous = null;
  try {
    const saved = JSON.parse(storage?.getItem(ATTRIBUTION_STORAGE_KEY) || 'null');
    if (plainObject(saved) && saved.version === 1 && plainObject(saved.attribution)
      && typeof saved.attribution.entry_path === 'string' && typeof saved.attribution.referrer_host === 'string') previous = sanitise(saved.attribution);
  } catch { /* A storage restriction or stale value must never block designing. */ }

  const explicitCampaign = current && CAMPAIGN_KEYS.some(key => current.searchParams.has(key));
  let attribution;
  if (previous && !explicitCampaign) attribution = previous;
  else {
    attribution = Object.fromEntries(CAMPAIGN_KEYS.map(key => [key, cleanCampaign(current?.searchParams.get(key), key)]));
    const referring = parseURL(referrer);
    attribution.referrer_host = referring && referring.hostname !== current?.hostname ? cleanHost(referring.hostname) : '';
    attribution.entry_path = current ? cleanPath(current.pathname) : '';
  }
  try { storage?.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify({version: 1, attribution})); }
  catch { /* Return the in-memory attribution even when storage is unavailable. */ }
  return attribution;
}

// Assign these values through input.value / FormData.set, never HTML strings.
// This is a CRM/form payload helper, not a license to send these to analytics.
export function attributionFields(attribution) {
  const clean = sanitise(attribution) || sanitise({});
  return Object.fromEntries(KEYS.map(key => [key.replaceAll('_', '-'), clean[key]]));
}
