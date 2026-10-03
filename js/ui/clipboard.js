// Consumes: navigator.clipboard (guarded), a textarea box + status writer
// Produces: Clipboard.copy(box, setStatus), Clipboard.paste(box, setStatus)

function hasClipboard() {
  return typeof navigator !== 'undefined' &&
    !!navigator.clipboard;
}

async function copy(box, setStatus) {
  if (hasClipboard()) {
    try {
      await navigator.clipboard.writeText(box.value);
      setStatus('code copied');
      return;
    } catch (e) {}
  }
  if (typeof box.select === 'function') box.select();
  setStatus('copy manually: code selected');
}

async function paste(box, setStatus) {
  if (hasClipboard()) {
    try {
      box.value = await navigator.clipboard.readText();
      setStatus('code pasted');
      return;
    } catch (e) {}
  }
  setStatus('paste manually into the box');
}

export const Clipboard = { copy, paste };
