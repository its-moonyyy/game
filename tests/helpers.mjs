// Consumes: nothing (pure test utilities)
// Produces: DOM/canvas stubs shared by all suites

export function makeEl() {
  return { hidden: false, textContent: '', value: '', innerHTML: '',
    content: '', handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; } };
}

export function makeDocument(ids) {
  const els = {};
  for (const id of ids) els[id] = makeEl();
  return { els,
    getElementById(id) { return els[id] || null; },
    addEventListener() {} };
}

export function makeWindow(extra = {}) {
  return { keyHandlers: {},
    addEventListener(type, fn) { this.keyHandlers[type] = fn; },
    ...extra };
}

export function makeCtx() {
  return new Proxy({}, { get(t, p) {
    if (p === 'createLinearGradient') {
      return () => ({ addColorStop() {} });
    }
    if (typeof p === 'string') return (...args) => undefined;
    return undefined;
  }, set() { return true; } });
}

export function b64url(obj) {
  return Buffer.from(JSON.stringify(obj), 'utf8')
    .toString('base64').replace(/\+/g, '-').replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const ALL_IDS = ['menu-view', 'game-view', 'menu-status',
  'btn-local', 'btn-host', 'btn-join', 'btn-connect', 'invite-out',
  'invite-in', 'pad-p1', 'pad-p2', 'viewport', 'net-overlay',
  'net-overlay-text', 'btn-exit', 'btn-copy', 'btn-paste'];
