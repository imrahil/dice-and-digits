# design-sync notes (Dice & Digits)

## How this repo syncs

- The repo is an **app**, not a published library. `.design-sync/lib/` is a small package (`dice-and-digits-ui`) that turns `src/components/` into one: `index.ts` (barrel of the shared components + `I18nProvider` + `Icons` namespace + types), `vite.config.ts`, `tsconfig.json`. Run `cfg.buildCmd` (`npm --prefix .design-sync/lib run build`) before the converter, always: it emits `dist/index.js`, `dist/style.css` + woff2, and `types/` (all gitignored).
- Two Vite passes on purpose: library mode always inlines assets, which put the fonts in `style.css` as ~2 MB of base64. The CSS pass is a plain build with `base: './'` so font `url()`s are relative (absolute `/x.woff2` urls made the converter drop every `@font-face` as dead).
- `ds.css` safelists the utility vocabulary the conventions header promises the design agent (Tailwind only emits classes it sees). If you name a new class in `conventions.md`, add it there. Keep the colour safelist narrow: the full property × colour × opacity × dark cross product made `style.css` 1.5 MB.
- `srcDir` points back at `../../src/components` (paths are relative to `.design-sync/lib`). `componentSrcMap` pins components that live in a shared file (`ui.tsx`, etc.) so their JSDoc is read; `I18nProvider` and `Icons` are excluded from cards.
- Converter commands from the repo root: `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --out ./ds-bundle` (the entry comes from `cfg.entry`). Render check and capture need `DS_CHROMIUM_PATH=/usr/bin/chromium` on this machine (Playwright's own chromium was never downloaded).
- `.design-sync/previews/fixtures.ts` holds shared sessions (one per scoring mode) and no-op scorers; previews import it relatively.

## Preview patterns

- Fixed-position overlays (`Sheet`, `DialogHost`, `QrShareSheet`, `BottomBar`, `RoundsBoard`'s entry sheet) escape their cell. Each such cell renders inside a phone frame: `skin-bg relative h-[N] w-[420px] overflow-hidden [transform:translateZ(0)]` (the transform makes the frame the fixed children's containing block). Those components are `cardMode: single` with a 480-wide viewport.
- `DialogHost` previews call `confirm()` / `toast()` in an effect; their state is module-level in the bundle, so it works across the shared global.
- Board-width components (420 px cells) are `cardMode: column`.

## Known render warns

- `[RENDER_THIN]` on `IconButton`: icon-only 40 px buttons paint little and carry no text by design; the captured sheet shows all three cells correctly.
- If `[RENDER_THIN]` "rendered height is 0px" appears on `Sheet`, `DialogHost` or `QrShareSheet`, a preview lost its phone frame (see Preview patterns) — that one is a regression.

## Re-sync risks

- `.design-sync/lib/index.ts` is a hand-kept barrel: a new shared component in `src/components/` is invisible to the sync until it is exported there (and pinned in `componentSrcMap` if it lives in a shared file).
- `.design-sync/lib/icons.ts` mirrors the app's lucide imports by hand; regenerate with the grep in its header when screens add icons.
- `fixtures.ts` hand-copies built-in rule snapshots from `src/data/presets.ts`; renamed categories there won't follow.
- The `Session`/`Rules` shapes in fixtures track `src/types.ts`; a type change breaks the preview compile (shows as `! preview build failed`).
- Font stacks: the bare `"Nunito"` fallback name was removed from `src/index.css` because it tripped `[FONT_MISSING]` (only `Nunito Variable` ships). Re-adding a family name that doesn't ship will re-trigger it.
