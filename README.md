# Vice Cover Studio — Make GTA 6 Cover Art

[![Make GTA 6 Cover Art](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/irwan11795/makefun-gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/irwan11795/makefun-gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

Vice Cover Studio is an offline web app that turns any photo into
GTA-style multi-panel poster cover art, built for make.fun's
"Make GTA 6 Cover Art" bounty ($250, top 50 share the pot).

Pick a photo (or several), choose a layout, pick a Vice City colour grade,
write a big bold caption — and export a share-ready PNG in one click.
Everything runs in your browser from local files: your photos are read on
your machine and never uploaded anywhere.

## What it does

- **Multi-panel poster layouts** — Hero + 2 side panels, 3 columns, or a
  2 × 2 grid, with a diagonal accent stripe and a gradient sun disc.
- **Any photo** — file picker or drag-and-drop, several photos at once.
  One photo can fill every panel, or each panel can have its own photo.
- **Crop per panel** — drag a panel photo to reposition it, zoom slider,
  flip button, reset crop.
- **Bold caption lettering** — Anton (SIL Open Font License) big title with
  a neon shadow, plus an editable sub-caption. Edit the caption in the
  fields or by clicking the text right on the cover.
- **Vice City colour grades** — Sunset (orange-magenta), Neon
  (cyan-magenta) and Noir, applied live to the preview and baked into the
  exported PNG, with grain and a vignette.
- **Export PNG in the common post sizes** — 1080 × 1080, 1080 × 1350 and
  1920 × 1080, rendered at full resolution on an offscreen canvas.
- **Honest privacy note in the app** — "Photos stay on your machine —
  nothing is uploaded."

## Run it offline

Serve `app/` with any static HTTP server and open `app/index.html` in
desktop Chrome. For example, from this repository:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network request: every script, font and image the app
loads is a file under `app/`.

## Layout

- `app/` — the web app (static files, no build step)
- `app/src/app.js` — the cover engine: panels, grades, crop, export
- `app/fonts/` — Anton (SIL OFL) + its licence text
- `app/samples/` — four built-in sample photos (see credits below)
- `screenshots/` — real browser captures of the app and its exports
- `main.ts` — the entry program: copies `app/` and `screenshots/` to the
  output directory and writes `dossier.json`
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged

## Sample photo credits

- Lionel Messi — CC BY-SA 3.0, © Кирилл Венедиктов / soccer.ru, via Wikimedia Commons
- Cristiano Ronaldo — CC BY-SA 3.0, © Анна Нэсси / soccer.ru, via Wikimedia Commons
- Taylor Swift — CC BY 3.0, © iHeartRadioCA, via Wikimedia Commons
- Dwayne Johnson — CC BY-SA 2.0, © Eva Rinaldi, via Wikimedia Commons

The sample photos are built-in examples only — the app accepts any photo
from your own machine. Original design: no Rockstar Games logo, artwork
or font is used anywhere.
