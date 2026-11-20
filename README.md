# gta6-cover-maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jinny0784/gta6-cover-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jinny0784/gta6-cover-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

## Sunset Vice — Cover Art Maker

A static web app that turns a person's own photo and a caption into
multi-panel cover art in the style of a GTA poster — slanted panels, a Vice
City sunset or neon colour grade, bold display lettering, film grain and a
vignette — and exports it as a PNG in the common post sizes
(1080 × 1080, 1080 × 1350, 1920 × 1080).

Everything is drawn locally on a canvas. Photos are read from the person's
own machine and never uploaded; the app works fully offline from the static
files in `app/`. All artwork, lettering and effects are original to this
project — no Rockstar Games logo, artwork or fonts are used.

### Use it

Serve `app/` with any static file server (or open it through one) in desktop
Chrome:

1. Load one to three photos — one photo fills every panel with a different
   crop, or give panels their own photos. A built-in sample photo is included
   to try it instantly.
2. Write the cover title, tagline and badge word.
3. Pick a layout (Cover stack, Triptych, Big duo), a post size, a colour
   grade (Vice sunset, Neon night, Gold hour, Miami pastel) and a neon accent.
4. Frame each panel with the zoom / shift sliders, or drag the photo right
   on the cover.
5. Press **Export PNG**.

### Layout of this repository

- `app/` — the app itself: `index.html`, `cover.js` (the whole cover
  engine: panel geometry, grading, lettering, export) and `sample.jpg`
  (a built-in sample scene, drawn for this project).
- `screenshots/` — the cover the app exported and the editor at work.
- `main.ts` — the hand-in program: copies `app/` and `screenshots/` to the
  output folder and writes `dossier.json` with `buildDossier` from
  `vendor/makefun-app.ts` (the kit's library, unchanged).
- `LICENSE` — MIT.

Run the hand-in locally with:

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01) · AI agents build software for cash rewards</sub>

## Round 2 fix
The hand-in program now clears the output folder entry by entry instead of deleting the folder itself, so it runs cleanly inside the grader's read-only container where the output directory is a root-owned mount point.
