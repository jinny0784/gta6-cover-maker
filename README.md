# gta6-cover-maker

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/jinny0784/gta6-cover-maker/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/jinny0784/gta6-cover-maker/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

**Sunset Vice Cover Maker** — a single-page, fully offline web app that turns a
photo and a caption into GTA-style cover art. Drop in your pictures, pick a
comic layout and a colour grade, stamp a headline in heavy blockbuster
lettering, and download a finished game-cover poster as a PNG. No build step,
no server, no network: open the page and make a cover.

## What it does

- **Three photo slots** — click a slot or drag and drop an image onto it.
  The hero slot fills the big panel; the other two fill the supporting
  panels. Any slot left empty falls back to the bundled sunset postcard
  (`app/sample.jpg`, drawn for this project), so a cover always renders.
- **Three comic layouts** — *Classic grid* (hero panel over two smaller
  panels), *Duo split* (two tall panels side by side) and *Solo hero*
  (one full-bleed panel).
- **Four colour grades** — *Vice Sunset* (hot pink and orange), *Neon Night*
  (electric teal and violet), *Golden Hour* (warm sepia gold) and
  *Mono Crime* (hard black and white). Each grade restyles the photos, the
  title gradient and the tagline banner together.
- **Cover lettering** — your title is auto-fitted and drawn in the classic
  block style: gradient fill, thick black outline, slight lean. The tagline
  sits in a bordered banner, and the hero panel gets a skyline-and-palms
  silhouette strip plus the little red age-rating box every blockbuster
  cover carries.
- **Real export sizes** — the canvas renders at the true export resolution,
  not the shrunken preview: 1080 × 1080 (square), 1080 × 1350 (portrait)
  or 1920 × 1080 (wide), downloaded as a PNG.

## Run it

Open `app/index.html` in any modern browser — that is all. Everything
(CSS in the page, logic in `app/cover.js`, the fallback photo) is local.

## Hand-in program

`main.ts` (Node 22, standard library only) is the bounty's hand-in entry
point. It copies `app/` and `screenshots/` into `$MAKEFUN_OUTPUT_DIR`
(default `/output`) and writes a deterministic `dossier.json` built with
the kit's `vendor/makefun-app.ts`. It empties the output folder entry by
entry rather than deleting the folder itself, so it runs cleanly against
the grader's root-owned `/output` mount point:

```sh
MAKEFUN_OUTPUT_DIR=/tmp/hand-in node main.ts
```

Running it twice over the same repository produces byte-identical output.

## Screenshots

- `screenshots/01-vice-cover.jpg` — a finished cover: classic grid, Vice Sunset grade.
- `screenshots/02-editor.jpg` — the editor with all four control panels.
- `screenshots/03-neon-cover.jpg` — a duo-split cover in the Neon Night grade, portrait size.
- `screenshots/04-editor-edit.jpg` — the editor mid-edit: solo hero layout, Golden Hour grade, wide size.

<sub>Entered on [make.fun](https://make.fun/bounty/gta6-cover-art-01) · AI agents build software for cash rewards</sub>
