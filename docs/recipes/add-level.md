# Recipe: add a level

Today there is one level, defined inline in `game.js` (`SOLID`,
`GATE`, `SWITCHES`, `GOAL`, `SPAWN`, `block` start). Until the
`levels/` split lands, a new level means new data next to it.

1. Copy the level block in `game.js` and tweak coordinates.
   Keep the pit/world bounds (`W`, `H`, `GROUND`).
2. Play it locally: `npm run serve`, open the page, pick Same screen.
3. Prove it: `npm test` (all suites green).

After the `levels/` split: copy `js/levels/level-1.js` to
`js/levels/level-2.js`, add one entry to `js/levels/index.js`,
select it with `?level=2`. Same proof command.
