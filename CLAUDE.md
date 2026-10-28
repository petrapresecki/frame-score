# Frame Score

## What this is

A tool that reads a film frame and plays it as ambient music. The visitor grades
the shot — exposure, contrast, temperature, saturation — and because the sound is
derived from the pixels, changing the grade changes the music automatically.
**You are grading a shot, and the grade is the score.**

It is piece No. 1 of Petra's personal creative practice, which sits at the
intersection of fashion, art, music and design. The governing document is
Manifesto Rev. A: https://claude.ai/code/artifact/6e395c36-0300-4d58-9aec-457f99f37dcb

The idea is hers. It came out of a faculty she has: hearing a song and seeing a
film scene for it. This tool is that, mechanised and inverted, and handed to a
stranger.

## Who decides what

**She directs. You implement.** She owns the concept, the references, the
constraint, the palette and every rejection. You own shaders, synthesis, DSP,
build config and debugging.

- Never make a taste call on her behalf. Do not name things for her, do not pick
  her signature typeface, do not decide the genre.
- **Propose before changing direction.** She has asked explicitly for proposals
  in chat before new work, so she can agree the direction first. Bug fixes and
  regressions you caused are exceptions — just fix those.
- She is not a musician and will direct by feel: _colder, emptier, too pretty,
  sounds like sirens_. That is usable feedback. Translate it into parameters
  yourself and say what you changed and why.
- If you disagree, say so once, plainly, then do what she decided.

## The brief, as agreed

- **Ambient**, not beat-driven. It should "show off the vibe of the frame."
- **The image decides everything.** Depth comes from the frame, not from adding
  controls. Do not solve a problem by adding a slider — that is the hedge she
  already rejected.
- **Creative _and_ useful.** She dislikes style-over-substance sites. It has to
  actually work as a tool.
- **It should never cut.** Her argument: everything now is chopped into pieces to
  hold your attention. Navigation should read as a continuous move, not a page
  change. This applies when the UI grows past one screen.
- Fashion and cinema are the **lens**, not the subject. Light, contrast,
  reflection, composition, the ordinary made beautiful. The piece is not _about_
  film, and it must not become noir pastiche or a Blade Runner shader demo.

## Sound constraints learned by ear — do not reintroduce these

Each of these was built, heard, and rejected. `LOG.md` has the detail.

- **No static drone.** A fixed pitch at fixed volume reads as "one frequency."
  The bed is four voices breathing on 23/27/32/37 s cycles that never realign.
- **No portamento on sustained voices.** Chord changes crossfade between two
  banks. Sliding pitch on a pad sounds like a siren.
- **No global vibrato on sustained voices.** Tape wow lives on the struck notes
  only, at about five cents. Forty cents on a drone is a wail.
- **No filter resonance above about Q 2.** Higher rings at one narrow frequency
  and reads as a distant whistle.
- **No risers or filter sweeps.** A noise swell into each band change reads as
  wind. She rejected this twice.
- **No continuous noise source of any kind.** Pink noise through a bandpass _is_
  wind synthesis. Texture is crackle: 11 ms impulses scattered at random
  positions, like dust on a needle.
- **Everything stays in key.** One mode, hand-written voicings stacked inside it,
  melody notes snapped to the current chord. The frame chooses and steers; it
  never gets to invent intervals.

## How the reading works

- The frame is graded, downsampled to 160×90, and measured. **Every measurement
  is stretched against the range real photographs occupy** — untouched, all
  photographs average to mid-grey and every frame sounds identical.
- **Four vertical bands, left to right, become four chords.** Each band takes the
  hue that makes it _different_ from the frame as a whole, so a large background
  cannot collapse the progression onto one chord.
- **The brightest point of each column becomes the melody** — not the column
  average, which washes out composition. Height in frame is pitch. The strongest
  peaks are collected into a motif that is restated in every band.
- **Chroma, not hue alone, picks the mode.** Pastel is desaturated, so a pink sky
  must not be read as saturated red. Below the chroma floor, brightness decides.
- **Activity** — from detail, brightness and the absence of haze — sets note
  length, placement grid, whether the motif restates inside a band, and octave
  lift. This is the axis that separates lively from hypnotic. Density alone is
  not liveliness.

## Layout

The instrument is plain JavaScript; the interface is React (Vite, Tailwind v4).
The split is the point: nothing below `core.js` knows React exists.

| file                          | what it holds                                                                                   |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `src/grade.js`                | the four grade controls as pixel maths — one implementation, used for both display and analysis |
| `src/analysis.js`             | graded frame → measurements                                                                     |
| `src/music.js`                | measurements → musical decisions (modes, voicings, progression, motif, activity)                |
| `src/engine.js`               | the Tone.js graph and the sequencer                                                             |
| `src/plates.js`               | placeholder frames drawn in code                                                                |
| `src/core.js`                 | the instrument: canvas, grade state, analysis and engine, behind a listener                     |
| `src/useFrameScore.js`        | the one hook that holds `Core` in a ref and hands React the last reading                        |
| `src/App.jsx`                 | direction B, the light table on the blue: the frame left, its contour drawing and the grade right, the bars beneath |
| `src/names.js`                | words for decisions: chord names from voicings, the key, a tempo word for activity — names only, never decides |
| `src/useBand.js`              | which band the engine says it is playing, and a count of band changes, from `core.tap`          |
| `src/accent.js`               | the tone: the frame's hue, forced clear of the blue ground. Used only for what is sounding      |
| `src/components/Frame.jsx`    | the frame as transport, the marks drawn over it, and the sounding band underlined               |
| `src/components/Reel.jsx`     | the gate, the reel of candidate shots, and the transport row                                    |
| `src/components/Contours.jsx` | the frame's light as contour lines, with the melody's notes as heads that ring when struck      |
| `src/components/PrinterPoints.jsx` | the four grade controls as scrubbed numerals, in a table, with reset all and a ↺ per moved row |
| `src/components/Bars.jsx`     | the four bars as a table; the sounding row fills over its four seconds                          |
| `src/components/Picks.jsx`    | my picks as labelled stills under the frame; `Sources.jsx` is the plates and the file input     |
| `src/skin.css`                | the Tailwind theme: the blue field, white ink, IBM Plex Mono. The tone is a live custom property, never a token |
| `LOG.md`                      | the build log — what was tried and killed, and why                                              |

The picture never works out what is sounding for itself. `Engine.say` schedules
an event through `Tone.Draw` at the audio time a note is struck, a band changes
or dust falls, and `core.tap(fn)` is how the interface hears them — `on` is the
reading, `tap` is the performance. Anything that re-derives the step from
`Tone.Transport.progress` is keeping a second copy of the motif rules, and the
two drift apart the first time a tick is late.

`Core` is deliberately not React state — it owns a canvas, an imperative Tone.js
graph and its own scheduling. React holds only `{ A, M, grade, sourceName }`.
`main.jsx` does not use `StrictMode`: a double-invoked mount would build a second
Tone.js graph and leave the first one running.

## Working on it

```bash
npm run dev      # http://localhost:5178
```

**Verify in the browser before claiming it works.** Two regressions shipped
because a large file was patched with text patterns and never run. The modules
exist so that can't happen silently — use them.

Measuring without hearing anything:

```js
await window.__load("/frames/budapest.jpg");
window.__frameScore; // { A, M } — every measurement and every decision
```

The **Read** panel is the tuning instrument. Load two frames, compare the
columns: a mapping that can't tell them apart shows up there before anyone has
to listen. When a mapping seems wrong, print the numbers rather than guessing —
that is how all six of the current fixes were found.

**Claude cannot hear.** Do not offer opinions on whether it sounds good. You can
see the frame, print what the engine decided, and measure the rendered audio.
The verdict is hers.

**Stop playback and kill the dev server when you are done testing.** A forgotten
tab looped audio on her machine for an hour.

## Reference frames

`frames/` holds working stills and is **gitignored on purpose** — film stills are
copyrighted and must never be committed. Anything published needs public-domain
sources; a surprising number of 1940s–50s noirs qualify because their copyrights
lapsed, and curating that set is her art direction to do.

Current test set: The Grand Budapest Hotel (should be the liveliest), After Hours
(atmospheric, not too relaxed), Blade Runner 2049 (most repetitive and chill).
Those three intents are the acceptance test.

## Open

- Is Budapest actually *funky*, or just fast? Funky may need the bass to move.
  She hasn't defined the word yet, deliberately.
- A curated public-domain frame set, to replace the code-drawn plates.
- TMDB could power "pick a movie, get a shot," but needs a server key — it cannot
  run inside an Artifact.
- **Desert Cut**, the techno sibling built from the same analysis after Kangding
  Ray's score for *Sirāt*, is shelved, not abandoned:
  https://claude.ai/code/artifact/882e3b96-d90d-42bb-a741-3fe096212907
- Earlier prototype versions live in the Artifact's own history:
  https://claude.ai/code/artifact/8a6e0c2a-673f-464d-9935-8805042e727e
