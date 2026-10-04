// Consumes: nothing (pure test utilities)
// Produces: DOM/canvas stubs shared by all suites

export function makeEl() {
  const el = { hidden: false, textContent: '', value: '',
    content: '', children: [], handlers: {},
    addEventListener(type, fn) { this.handlers[type] = fn; },
    appendChild(b) { this.children.push(b); },
    getContext() { return makeCtx(); } };
  let html = '';
  Object.defineProperty(el, 'innerHTML', {
    get: () => html,
    set: (v) => { html = v; el.children.length = 0; },
    configurable: true,
  });
  return el;
}

export function makeDocument(ids) {
  const els = {};
  for (const id of ids) els[id] = makeEl();
  return { els,
    getElementById(id) { return els[id] || null; },
    addEventListener() {},
    createElement() { return makeEl(); } };
}

export function makeWindow(extra = {}) {
  const w = { keyHandlers: {},
    addEventListener(type, fn) {
      (w.keyHandlers[type] ||= []).push(fn);
    },
    ...extra };
  return w;
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

export const ALL_IDS = ['game', 'menu-view', 'game-view', 'menu-status',
  'btn-local', 'btn-host', 'btn-join', 'btn-connect', 'invite-out',
  'invite-in', 'pad-p1', 'pad-p2', 'viewport', 'net-overlay',
  'net-overlay-text', 'btn-exit', 'btn-copy', 'btn-paste', 'level-row',
  'btn-layout-azerty', 'btn-layout-qwerty'];
