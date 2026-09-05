# BACKLOG — noticed, not done (max 30 lines, one per line)

- Unused-code check: `npx knip` on 2026-09-04 found 120 unused exports, 11 unused types, 1 duplicate export; its 20 "unused files" are hand-run CLI scripts, so a knip config needs `entry: ['scripts/**/*.mjs']` before it can join `npm run done`.
- `src/components/FichaDoObjeto.tsx` useMemo lists `idioma` as an unnecessary dependency (lint warning).
- The six AI-illustrated maps (Hígia, Palas, Haumea, Makemake, Éris, Quaoar) enter `public/data/atlas/texturas.json` as proveniencia `derivado`, so the ficha's seal calls an invented image "derivado"; owner's call whether it should read `artistico`.
- `npm test` needs a Chrome binary because `scripts/visual/chrome.mjs` resolves it at import time; a lazy resolve would let the suite run anywhere and retire that trap from AGENTS.md.
- `docs/RENDERER_CARTOGRAPHY.md` predates the 17/08 architecture wave; a 2026-09-04 spot check (5 paths, 3 mechanisms) still matched the code, so a full truth pass is the remaining doubt.
- `docs/PENDENCIAS-ARQUIVO.md` (567 KB) duplicates what git history holds; owner decides whether it goes.
- `src/three/world/corpos/rochoso.ts`: the procedural-surface shader branch (`superficie: 'procedural'`) has no consumer since item 151; remove it with its test (owner approves).
