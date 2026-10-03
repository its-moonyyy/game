# Recipe: add a pad button

Pads live in `touch.js` (`TouchPad.mount`), styled in `style.css`
(`.touch-pad`, shown only on `pointer: coarse`).

1. Add the button in `mount` next to left/right/jump, tracking its
   own touch id like the others.
2. Map it in the `mapping` argument and extend the `onChange`
   `{left, right, jump}` shape — then update CONTRACTS.md in the
   same commit (input-slot convention).
3. Extend the touch parity test: the button must produce the same
   `keys` entry its keyboard twin would.
4. Check `pointer: coarse` CSS shows it only on touch devices.
5. Prove it: `npm test` (all suites green).
