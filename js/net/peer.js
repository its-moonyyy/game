// Consumes: Signaling (codes), Sync (snapshots/prediction),
//   window.Game/Menu (looked up at call time, see CONTRACTS.md)
// Produces: window.Net (host/join/confirm/sendInput/leave/ready/onState)

import { Signaling } from './signaling.js';
import { Sync } from './sync.js';

const stat = { sentInput: 0, recvInput: 0, sentState: 0, recvState: 0 };
const api = { onState: null, onOpen: null, onClose: null };
let role = null;

function status(text) {
  if (typeof window !== 'undefined' && window.Menu) {
    window.Menu.setStatus(text);
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
  Sync.resetGuest();
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
  const code = Signaling.encodeInvite({ type: 'offer',
    sdp: pc.localDescription.sdp });
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
    }, Sync.SNAP_MS));
  });
  return { code, connected };
}

async function join(codeA) {
  if (typeof RTCPeerConnection === 'undefined') {
    throw new Error('webrtc unavailable');
  }
  cleanup();
  const offer = Signaling.decodeInvite(codeA, 'offer');
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
      Sync.recordLocal(input);
      send();
    };
    timers.push(setInterval(send, Sync.SNAP_MS));
    channel.onmessage = (e) => handleMessage(e.data, {
      state: (msg) => {
        stat.recvState += 1;
        Sync.pushSnapshot(msg.snap);
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
  Sync.setActive(true);
  requestAnimationFrame(Sync.guestFrame);
  return { code: Signaling.encodeInvite({ type: 'answer',
    sdp: pc.localDescription.sdp }) };
}

async function confirm(codeB) {
  const answer = Signaling.decodeInvite(codeB, 'answer');
  await pc.setRemoteDescription({ type: 'answer', sdp: answer.sdp });
}

function sendInput(input) {
  Sync.recordLocal(input);
  if (typeof api.send === 'function') api.send(input);
}

Object.assign(api, { host, join, confirm, sendInput, leave,
  ready: (on) => Sync.setReady(on, api.onState),
  _test: { encodeInvite: Signaling.encodeInvite,
    decodeInvite: Signaling.decodeInvite, setReady: (on) => Sync.setReady(on, api.onState),
    injectState: Sync.pushSnapshot,
    extrapolate: Sync.extrapolate, reconcile: Sync.reconcile,
    mergePrediction: Sync.mergePrediction,
    snapshotIntervalMs: Sync.SNAP_MS,
    latest: Sync.latest,
    stat: () => ({ ...stat }),
    conn: () => ({ pc: pc && pc.connectionState,
      channel: channel && channel.readyState }),
    setClock: Sync.setClock } });

if (typeof window !== 'undefined') window.Net = api;
