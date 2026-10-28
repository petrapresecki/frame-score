# Frame Score

![Grading a still from The Grand Budapest Hotel in Frame Score](docs/preview.gif)

Live at [frame-score.pages.dev](https://frame-score.pages.dev/). Turn the sound on and press play.

Grade a film frame and hear the grade. The shot is read in four vertical bands,
left to right; the colour of each becomes a chord, the brightest points become a
motif, and the whole reading is played back as an ambient loop. Change the grade
and the sound follows, because the sound is derived from the pixels.

Piece No. 1 of the practice described in Manifesto Rev. A.

## Run

```bash
npm install
npm run dev
```

## Your own frames

Drop any image onto the frame in the UI. To keep a working set on disk, put
stills in `frames/` — that folder is gitignored on purpose, because film stills
are copyrighted and must not end up in the repository. For anything published,
use public-domain sources.

## Layout

- `src/grade.js` — the four grade controls, as pixel maths. One implementation,
  used for both display and analysis, so what you see is what gets heard.
- `src/analysis.js` — reads a graded frame into measurements.
- `src/music.js` — turns measurements into musical decisions.
- `src/engine.js` — the Tone.js graph and the sequencer.
- `src/plates.js` — placeholder frames drawn in code.
- `src/core.js` — the instrument: canvas, grade state, analysis and engine. Plain
  JavaScript, and the last file that knows nothing about the interface.
- `src/App.jsx`, `src/components/` — the interface, in React. Tailwind v4 for
  styling; the accent colour is sampled from the frame at runtime.
