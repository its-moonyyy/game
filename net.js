'use strict';

(function () {
  let clock = () => Date.now();
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

  function status(text) {
    if (typeof window !== 'undefined' && window.Menu) {
      window.Menu.setStatus(text);
    }
  }

  function validSnapshot(s) {
    if (!s || !Array.isArray(s.players) || s.players.length !== 2) {
      return false;
    }
    for (const p of s.players) {
      if (!['x', 'y', 'vx', 'vy'].every((k) => typeof p[k] === 'number')) {
        return false;
      }
    }
    if (!s.block || !['x', 'y', 'vy']
      .every((k) => typeof s.block[k] === 'number')) {
      return false;
    }
    if (typeof s.openAmt !== 'number') return false;
    if (!Array.isArray(s.switches) || s.switches.length !== 2 ||
      !s.switches.every((v) => typeof v === 'boolean')) {
      return false;
    }
    return typeof s.won === 'boolean';
  }

  const SNAP_MS = 33;
  const guest = { ready: false, queued: null, latest: null, active: false };
  let lastLocal = { left: false, right: false, jump: false };
  const stat = { sentInput: 0, recvInput: 0, sentState: 0, recvState: 0 };
  const api = { onState: null, onOpen: null, onClose: null };
  let role = null;

  function deliver(snap) {
    if (typeof api.onState === 'function') api.onState(snap);
  }

  function pushSnapshot(snap) {
    if (!validSnapshot(snap)) return;
    if (!guest.ready) {
      guest.queued = snap;
      return;
    }
    guest.latest = { snap, at: clock() };
  }

  function extrapolate(snap, ageMs) {
    const t = Math.min(Math.max(ageMs, 0), 150) / 1000;
    const out = JSON.parse(JSON.stringify(snap));
    for (const p of out.players) {
      p.x += p.vx * t;
      p.y += p.vy * t;
    }
    out.block.y += out.block.vy * t;
    return out;
  }

  function reconcile(local, host) {
    const dx = host.x - local.x;
    const dy = host.y - local.y;
    if (dx * dx + dy * dy > 36 * 36) return { x: host.x, y: host.y };
    return { x: local.x + dx * 0.35, y: local.y + dy * 0.35 };
  }

  function mergePrediction(localSnap, serverSnap, ageMs) {
    const fresh = extrapolate(serverSnap, ageMs);
    const out = JSON.parse(JSON.stringify(fresh));
    out.players[1] = { ...fresh.players[1],
      ...reconcile(localSnap.players[1], fresh.players[1]) };
    return out;
  }

  function guestFrame() {
    if (!guest.active) return;
    if (guest.latest && window.Game) {
      const local = window.Game.getSnapshot();
      const merged = mergePrediction(local, guest.latest.snap,
        clock() - guest.latest.at);
      window.Game.applySnapshot(merged);
      window.Game.setRemoteInput(1, lastLocal);
    }
    requestAnimationFrame(guestFrame);
  }

  function setReady(on) {
    guest.ready = !!on;
    if (guest.ready && guest.queued) {
      const snap = guest.queued;
      guest.queued = null;
      guest.latest = null;
      pushSnapshot(snap);
      if (guest.latest) deliver(guest.latest.snap);
    }
  }

  function handleMessage(raw, handlers) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      return;
    }
    if (!msg || typeof msg.type !== 'string') return;
    const fn = handlers[msg.type];
    if (typeof fn === 'function') fn(msg);
  }

  function waitGathering(pc) {
    return new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }
      const done = () => {
        pc.removeEventListener('icecandidate', onCandidate);
        resolve();
      };
      const onCandidate = (e) => {
        if (!e.candidate) done();
      };
      pc.addEventListener('icecandidate', onCandidate);
      setTimeout(done, 1500);
    });
  }

  let pc = null;
  let channel = null;
  let timers = [];

  function cleanup() {
    for (const t of timers) clearInterval(t);
    timers = [];
    if (channel) {
      try { channel.close(); } catch (e) {}
      channel = null;
    }
    if (pc) {
      try { pc.close(); } catch (e) {}
      pc = null;
    }
    guest.active = false;
    guest.ready = false;
    guest.queued = null;
    guest.latest = null;
    role = null;
  }

  function leave() {
    cleanup();
    status('');
  }

  async function host() {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('webrtc unavailable');
    }
    cleanup();
    pc = new RTCPeerConnection();
    channel = pc.createDataChannel('coop');
    status('waiting for guest');
    const open = new Promise((resolve) => {
      channel.onopen = resolve;
    });
    channel.onmessage = (e) => handleMessage(e.data, {
      input: (msg) => {
        stat.recvInput += 1;
        if (window.Game && msg.input) {
          window.Game.setRemoteInput(1, msg.input);
        }
      },
    });
    channel.onclose = () => {
      status('guest disconnected, waiting');
      if (typeof api.onClose === 'function') api.onClose('host');
    };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitGathering(pc);
    const code = encodeInvite({ type: 'offer', sdp: pc.localDescription.sdp });
    role = 'host';
    const connected = open.then(() => {
      status('connected');
      if (typeof api.onOpen === 'function') api.onOpen('host');
      timers.push(setInterval(() => {
        if (channel && channel.readyState === 'open' && window.Game) {
          stat.sentState += 1;
          channel.send(JSON.stringify({ type: 'state',
            snap: window.Game.getSnapshot() }));
        }
      }, SNAP_MS));
    });
    return { code, connected };
  }

  async function join(codeA) {
    if (typeof RTCPeerConnection === 'undefined') {
      throw new Error('webrtc unavailable');
    }
    cleanup();
    const offer = decodeInvite(codeA, 'offer');
    pc = new RTCPeerConnection();
    status('connecting');
    pc.ondatachannel = (e) => {
      channel = e.channel;
      role = 'guest';
      let lastInput = { left: false, right: false, jump: false };
      let seq = 0;
      const send = () => {
        if (channel.readyState === 'open') {
          seq += 1;
          stat.sentInput += 1;
          channel.send(JSON.stringify({ type: 'input',
            seq, input: lastInput }));
        }
      };
      api.send = (input) => {
        lastInput = { ...input };
        lastLocal = { ...input };
        send();
      };
      timers.push(setInterval(send, SNAP_MS));
      channel.onmessage = (e) => handleMessage(e.data, {
        state: (msg) => {
          stat.recvState += 1;
          pushSnapshot(msg.snap);
        },
      });
      channel.onopen = () => {
        status('connected');
        if (typeof api.onOpen === 'function') api.onOpen('guest');
      };
      channel.onclose = () => {
        status('host left');
        if (typeof api.onClose === 'function') api.onClose('guest');
      };
    };
    await pc.setRemoteDescription({ type: 'offer', sdp: offer.sdp });
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    await waitGathering(pc);
    guest.active = true;
    requestAnimationFrame(guestFrame);
    return { code: encodeInvite({ type: 'answer',
      sdp: pc.localDescription.sdp }) };
  }

  async function confirm(codeB) {
    const answer = decodeInvite(codeB, 'answer');
    await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
  }

  function sendInput(input) {
    lastLocal = { ...input };
    if (typeof api.send === 'function') api.send(input);
  }

  Object.assign(api, { host, join, confirm, sendInput, leave,
    ready: (on) => setReady(on),
    _test: { encodeInvite, decodeInvite, setReady,
      injectState: pushSnapshot, extrapolate, reconcile, mergePrediction,
      snapshotIntervalMs: SNAP_MS,
      latest: () => guest.latest && guest.latest.snap,
      stat: () => ({ ...stat }),
      conn: () => ({ pc: pc && pc.connectionState,
        channel: channel && channel.readyState }),
      setClock: (fn) => { clock = fn; } } });

  if (typeof window !== 'undefined') window.Net = api;
})();
