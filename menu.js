'use strict';

(function () {
  const P1_MAP = { left: 'a', right: 'd', jump: 'w' };
  const P2_MAP = { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp' };
  const NO_INPUT = { left: false, right: false, jump: false };
  let role = null;

  function el(id) {
    return document.getElementById(id);
  }

  function show(view) {
    el('menu-view').hidden = view !== 'menu';
    el('game-view').hidden = view !== 'game';
  }

  function setStatus(text) {
    el('menu-status').textContent = text;
  }

  function fail(err) {
    setStatus('error: ' + err.message);
  }

  function mountPad(id, mapping, onChange) {
    const container = el(id);
    container.innerHTML = '';
    if (typeof window !== 'undefined' && window.TouchPad) {
      window.TouchPad.mount(container, mapping, onChange);
    }
  }

  function startLocal() {
    role = 'local';
    show('game');
    mountPad('pad-p1', P1_MAP);
    mountPad('pad-p2', P2_MAP);
  }

  function startHost() {
    role = 'host';
    if (!window.Net) return;
    setStatus('creating invite code');
    window.Net.host().then((h) => {
      el('invite-out').value = h.code;
      setStatus('waiting for guest');
      h.connected.catch(fail);
    }).catch(fail);
  }

  function connectPressed() {
    const code = el('invite-in').value.trim();
    if (!code) {
      setStatus('paste a friend invite code first');
      return;
    }
    if (role === 'host') {
      if (!window.Net) return;
      window.Net.confirm(code).catch(fail);
      return;
    }
    role = 'join';
    if (!window.Net) return;
    window.Net.join(code).then((j) => {
      el('invite-out').value = j.code;
      setStatus('connecting, share your code back');
    }).catch(fail);
  }

  function onOpen(openedRole) {
    show('game');
    if (openedRole === 'guest') {
      if (window.Game) window.Game.setSimEnabled(false);
      if (window.Net) {
        window.Net.ready(true);
        window.Net.onState = (snap) => window.Game.applySnapshot(snap);
      }
      mountPad('pad-p1', P2_MAP, (input) => window.Net.sendInput(input));
    } else {
      mountPad('pad-p1', P1_MAP);
    }
  }

  function onClose(closedRole) {
    if (closedRole === 'guest') {
      if (window.Game) window.Game.setSimEnabled(true);
      show('menu');
      setStatus('host left');
    } else if (window.Game) {
      window.Game.setRemoteInput(1, NO_INPUT);
    }
  }

  function select(mode) {
    if (typeof api.onSelect === 'function') {
      api.onSelect(mode);
      return;
    }
    if (mode === 'local') startLocal();
    else if (mode === 'host' || mode === 'join') {
      role = mode;
      if (mode === 'host') startHost();
      else setStatus('paste the host invite code');
    }
  }

  function bind() {
    el('btn-local').addEventListener('click', () => select('local'));
    el('btn-host').addEventListener('click', () => select('host'));
    el('btn-join').addEventListener('click', () => select('join'));
    el('btn-connect').addEventListener('click', connectPressed);
    if (typeof window !== 'undefined' && window.Net) {
      window.Net.onOpen = onOpen;
      window.Net.onClose = onClose;
    }
  }

  const api = { show, setStatus, onSelect: null };

  if (typeof window !== 'undefined') window.Menu = api;
  if (typeof document !== 'undefined' && document.addEventListener) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bind);
    } else {
      bind();
    }
  }
})();
