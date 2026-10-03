# Recipe: add a level

Levels are data-only files in `js/levels/`, registered in
`js/levels/index.js`. Spots are validated by `tests/levels.test.mjs`.

1. Copy `js/levels/level-1.js` to `js/levels/level-2.js` and tweak
   coordinates. Keep inside the world bounds (`W`, `H`, `GROUND`
   in `js/config.js`).
2. Add one entry to the registry in `js/levels/index.js`.
3. Play it: `npm run serve`, open `http://localhost:8903/` and pick
   Same screen (or jump straight in with `?level=level-2`).
4. Prove it: `npm test` (all suites green).
