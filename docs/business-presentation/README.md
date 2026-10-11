# Tanzim ERP business presentation

A bilingual (Arabic / English) presentation of Tanzim for business stakeholders: overview, company lifecycle,
modules, per-module workflows, business scenarios for a typical trading company, module relationships, roles, benefits, current status,
gaps, roadmap and recommendations.

## Files

| File | What it is |
|---|---|
| `index.html` | The deck: styles and the renderer. Open it in a browser. |
| `content/00-base.js` | Shared labels, icons, and the module list with each module's status (drives the status chart). |
| `content/10-overview.js` | Cover, how to read, Part A (overview), Part B (lifecycle). |
| `content/20-modules.js` | Part C (modules overview) and Part D (one workflow slide per module). |
| `content/30-scenarios.js` | Part E (end-to-end scenarios) and Part F (relationships diagram and impact table). |
| `content/40-roles-status.js` | Parts G–K: roles, benefits, status, business questions, roadmap, recommendations, glossary. |
| `content/50-narration.js` | Spoken narration per slide (Arabic and English). |
| `audio/`, `video/` | Generated narration clips, the two explainer videos and their subtitles. |
| `video-tools/` | Scripts that build `audio/` and `video/` from the deck. |
| `VERIFICATION.md` | How each claim was checked against the code, the status matrix, and open questions. |

## Viewing and presenting

- Open `index.html` through a local web server so the `content/*.js` files load, for example:
  `python -m http.server 8765 -d docs/business-presentation`, then browse to http://localhost:8765.
  (Opening the file directly with `file://` also works in most browsers.)
- **عربي / EN** switches language and direction; the choice is remembered. `#en` or `#ar` in the URL forces one.
- **Present** shows one slide full screen. Arrow keys, Page Up/Down and Space move; Esc exits. In Arabic the left
  arrow moves forward.
- **Contents** opens the slide list.
- To make a PDF, use the browser's Print → Save as PDF: each slide prints on its own page.

## Narration and video

- `content/50-narration.js` holds a spoken script per slide in both languages.
- In **Present** mode, **🔊 Narrate** plays each slide's narration and moves on by itself; **CC** shows the text as
  captions. In the normal view, the ▶ button on each slide plays that slide only. Audio comes from
  `audio/<lang>/<nn>-<id>.mp3`; if a file is missing, the caption stays up for the reading time instead.
- **🎬 Video** opens `video/tanzim-<lang>.mp4` with its subtitles (`.vtt`) for the current language.
- To rebuild audio and videos after editing slides or narration (Windows; uses the offline Windows voices
  "Microsoft Hoda" for Arabic and "Microsoft Mark" for English, Edge for screenshots, and ffmpeg):

  ```
  python -m http.server 8765 -d docs/business-presentation
  pip install imageio-ffmpeg
  python docs/business-presentation/video-tools/build_video.py
  ```

  Options: `--lang ar` or `--lang en` for one language, `--size 1280x720`, `--skip-tts`, `--skip-shots`. The capture
  mode the script uses is `index.html?capture=1&lang=ar&slide=<id>` (one slide, full screen, light theme, no
  controls).

## Editing

Every visible text is a pair: `{ en: "…", ar: "…" }`. Edit both sides together and keep terms consistent with the
glossary slide and the app's own labels (`src/assets/i18n/*.json`). `**bold**` and `` `code` `` work inside texts.

Slide types (`type`): `cover`, `section`, `cards`, `stats`, `timeline`, `workflow`, `table`, `scenario`, `status`,
`network`, `questions`, `cols`. Copy an existing slide of the same type to add one. Status keys: `live`, `partial`
(backend ready, no screens), `wip` (screens on a branch), `placeholder` (name only), `absent`, `proposed`.

When a module's status changes, update its row in `content/00-base.js` (the status chart recounts itself) and the
matching workflow slide, status table and roadmap.
