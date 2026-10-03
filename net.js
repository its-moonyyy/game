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
    return !!s.block && ['x', 'y', 'vy']
      .every((k) => typeof s.block[k] === 'number');
  }

  const guest = { ready: false, queued: null, prev: null, next: null,
    active: false };
  const stat = { sentInput: 0, recvInput: 0, sentState: 0, recvState: 0 };
  const api = { onState: null };

  function deliver(snap) {
    if (typeof api.onState === 'function') api.onState(snap);
  }

  function pushSnapshot(snap) {
    if (!validSnapshot(snap)) return;
    if (!guest.ready) {
      guest.queued = snap;
      return;
    }
    guest.prev = guest.next;
    guest.next = { snap, at: clock() };
    if (!guest.prev) guest.prev = guest.next;
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpSnapshot(prev, next, t) {
    const out = JSON.parse(JSON.stringify(next));
    for (let i = 0; i < out.players.length; i++) {
      for (const k of ['x', 'y']) {
        out.players[i][k] = lerp(prev.players[i][k], next.players[i][k], t);
      }
    }
    for (const k of ['x', 'y']) {
      out.block[k] = lerp(prev.block[k], next.block[k], t);
    }
    return out;
  }

  function guestFrame() {
    if (!guest.active) return;
    if (guest.prev && guest.next) {
      const span = Math.max(1, guest.next.at - guest.prev.at);
      const t = Math.min(1, Math.max(0, (clock() - guest.prev.at) / span));
      deliver(lerpSnapshot(guest.prev.snap, guest.next.snap, t));
    }
    requestAnimationFrame(guestFrame);
  }

  function setReady(on) {
    guest.ready = !!on;
    if (guest.ready && guest.queued) {
      const snap = guest.queued;
      guest.queued = null;
      guest.prev = null;
      guest.next = null;
      pushSnapshot(snap);
      if (guest.next) deliver(guest.next.snap);
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
    channel.onclose = () => status('guest disconnected, waiting');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await waitGathering(pc);
    const code = encodeInvite({ type: 'offer', sdp: pc.localDescription.sdp });
    const connected = open.then(() => {
      status('connected');
    timers.push(setInterval(() => {
      if (channel && channel.readyState === 'open' && window.Game) {
        stat.sentState += 1;
        channel.send(JSON.stringify({ type: 'state',
          snap: window.Game.getSnapshot() }));
      }
    }, 50));
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
      api.send = (input) => { lastInput = { ...input }; send(); };
      timers.push(setInterval(send, 50));
      channel.onmessage = (e) => handleMessage(e.data, {
        state: (msg) => {
          stat.recvState += 1;
          pushSnapshot(msg.snap);
        },
      });
      channel.onopen = () => status('connected');
      channel.onclose = () => status('host left');
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
    if (typeof api.send === 'function') api.send(input);
  }

  Object.assign(api, { host, join, confirm, sendInput, leave,
    _test: { encodeInvite, decodeInvite, setReady,
      injectState: pushSnapshot, lerp: lerpSnapshot,
      stat: () => ({ ...stat }),
      conn: () => ({ pc: pc && pc.connectionState,
        channel: channel && channel.readyState }),
      setClock: (fn) => { clock = fn; } } });

  if (typeof window !== 'undefined') window.Net = api;
})();
