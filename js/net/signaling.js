// Consumes: nothing (pure functions)
// Produces: Signaling.encodeInvite/decodeInvite (see CONTRACTS.md)

const ownIds = new Set();
let idCounter = 0;

function newId() {
  idCounter += 1;
  return 'c' + Date.now().toString(36) + '-' + idCounter;
}

function encodeInvite(obj) {
  const withId = { ...obj, id: obj.id || newId() };
  ownIds.add(withId.id);
  const json = JSON.stringify(withId);
  return btoa(unescape(encodeURIComponent(json)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeInvite(code, wantType) {
  let obj;
  try {
    const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
    obj = JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch (e) {
    throw new Error('invalid invite code');
  }
  if (!obj || typeof obj.sdp !== 'string') {
    throw new Error('invalid invite code');
  }
  if (ownIds.has(obj.id)) throw new Error('own invite code');
  if (wantType && obj.type !== wantType) {
    throw new Error('wrong invite code type');
  }
  return obj;
}

export const Signaling = { encodeInvite, decodeInvite };
