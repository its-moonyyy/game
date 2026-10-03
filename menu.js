'use strict';

(function () {
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

  function bind() {
    el('btn-local').addEventListener('click', () => {
      if (typeof api.onSelect === 'function') api.onSelect('local');
    });
    el('btn-host').addEventListener('click', () => {
      if (typeof api.onSelect === 'function') api.onSelect('host');
    });
    el('btn-join').addEventListener('click', () => {
      if (typeof api.onSelect === 'function') api.onSelect('join');
    });
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
