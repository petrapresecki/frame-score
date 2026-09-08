# Build log

Per Article 06. What was tried, what was killed, and why.

## 2026-09-08 — moved to Vite

Rebuilt as a real project after two regressions caused by patching a single
large HTML file with text patterns. The second one deleted three synth objects
that were still referenced, and the piece silently failed on Play.

## Killed

- **Static drone.** Two oscillators on a fixed root. Read as one continuous
  frequency. Replaced by four voices breathing on cycles of 23/27/32/37 s.
- **Pitch glide between chords.** 2.2 s portamento on sustained voices, on top
  of a global vibrato, sounded like sirens. Replaced by a crossfade between two
  banks — the harmony moves, no pitch ever slides.
- **Global tape vibrato.** ~40 cents on a drone is a wail. Now ~5 cents, and
  only on the felt notes.
- **Filter resonance to Q 7.6.** Rang at one narrow frequency. Capped at 2.
- **Risers into band changes.** A 280 Hz→4.2 kHz sweep four times a loop. Read
  as wind. Removed.
- **Continuous pink noise through a bandpass.** That is how you synthesise wind.
  Replaced by crackle: 11 ms impulses scattered at random positions.

## Measured, 2026-09-07

Three shots run through the engine — The Grand Budapest Hotel, After Hours,
Blade Runner 2049 — revealed five mapping faults, fixed in this version:
detail clipping at 1.00, mode ignoring saturation (pastel pink read as phrygian),
band progressions collapsing to a single hue, space driven only by shadow, and
register driven only by brightness.

## 2026-09-08 — measured again, after the fixes

Same three shots, printed from the readout rather than guessed:

|              | Budapest | After Hours | Blade Runner |
|--------------|----------|-------------|--------------|
| mode         | lydian   | aeolian     | mixolydian   |
| activity     | 0.94     | 0.56        | 0.39         |
| restatements | 2×       | 1×          | 1×           |
| note length  | 0.43 s   | 1.87 s      | 2.63 s       |
| attack       | 3.7 s    | 4.6 s       | 6.9 s        |
| reverb wet   | 0.35     | 0.60        | 0.55         |
| motif        | 4 notes  | 4 notes     | 3 notes      |

Three tuning passes were needed after the six fixes: the activity sum only
spans about 0.12–0.68 on real frames so it had to be stretched; the restatement
threshold had to move to 0.70 so only a genuinely lively frame gets it; and the
octave drop is now suppressed when the register is already at the bottom,
because that is mud rather than weight.

## 2026-09-08 — FIX 7, the mode cliffs

Three cliffs were stacked on top of each other: hue was binned into twelve hard
sectors, `CHROMA_FLOOR` was a hard threshold, and the mode itself was a lookup.
Dragging Temperature or Saturation could trip all three inside one gesture and
flip the whole piece mid-drag.

Replaced by one continuous scalar. The five modes are ranked darkest to
brightest; hue is read as a chroma-weighted angle rather than a bucket and
interpolated around the circle; chroma fades between the hue reading and the
brightness reading instead of switching between them; and the chosen mode holds
until the scalar clears a boundary by 0.62, so it cannot flutter.

Hue is only believed when the frame agrees with itself about it. The first
version did not check this and got *worse* — After Hours is lit by neon in six
colours, so its mean hue angle is noise, and trusting it added flips that the
old lookup never had. The mean vector's length is now a second gate.

Measured over all four sliders dragged end to end, 120 steps each, on the three
frames: mode **reversals fell from 2 to 0**, and the remaining changes are all
monotonic — one to two per full drag, always in one direction.

After Hours and Blade Runner land on the modes they did before. Budapest moved
mixolydian → dorian: its own hue, a pale red, now pulls against its brightness
instead of being discarded for sitting under the chroma floor.

## 2026-09-08 — FIX 8, subject

### Killed: centre-versus-edge sharpness

The first attempt at "is there a subject" compared gradient energy in a central
ellipse against the periphery. It does not measure subject, it measures
vignetting. Budapest — a wide landscape with nothing in particular in it —
scored highest at 1.427, and Blade Runner, one figure alone in fog, scored
lowest at 0.991. Most photographs simply carry more detail in the middle.

### Kept: concentration

What works is asking how concentrated the detail is rather than where it sits:
the share of all edge energy held by the busiest tenth of the picture. Even
texture lands near 0.10, one thing against nothing approaches 1.

    Blade Runner 0.464   After Hours 0.370   Budapest 0.258

That is the right order, and it carries information `detail` does not — After
Hours and Budapest have almost the same detail (0.46 and 0.42) and clearly
different concentration. Computed from a histogram in the pass that was already
running, so it costs nothing on a slider drag. `spread` — the second moment of
the same distribution — was measured at the same time and thrown away: 0.367 to
0.384 across all three frames, which tells you nothing.

It drives the bed voice count, the stereo width and centre, and biases which
column peaks become the motif. It deliberately does **not** touch reverb. This
measures concentration, not distance: Blade Runner is a small figure in a vast
space, and coupling the two would have made a wide shot sound like a close-up.
Space is still `spaceN`'s job.

## 2026-09-08 — FIX 9, ranges re-fitted against ten frames

Seven more stills arrived (The Fall ×3, Elevator to the Gallows ×2, The Long
Goodbye, a spaghetti western). Run through the readout, three of the stretched
ranges turned out to be wrong at one end — all three had been fitted against
three frames, which is not enough to see where a range really sits.

| measurement | fitted range | actually occupied | effect |
|---|---|---|---|
| `edgeRaw` → detail | 0.008 – 0.30 | 0.05 – 0.14 | detail lived in the bottom third of itself |
| `colourRaw` → colour | 0.05 – 0.42 | 0.00 – 0.38 | a green tree-lined avenue read as colourless |
| `focusRaw` → focus | 0.20 – 0.58 | 0.26 – 0.60 | a stark frame clipped at 1.00 |

Correcting `detail` widened it, which pushed `activity` into clipping at 1.00 on
three frames, so its stretch was re-fitted too: the raw sum spans 0.16 to 0.80
over ten frames, not the 0.12 to 0.68 that three frames suggested.

### The haze term in activity does not exist

`hazeN` is defined as `1 - detail`. So

    raw = 0.55*detail + 0.35*keyN + 0.30*(1 - hazeN)

is `0.85*detail + 0.35*keyN` — verified to three decimals on all ten frames.
"Detail, brightness and the absence of haze" is two axes wearing three names,
and detail carries 71% of it. Left as written; what should replace the third
term is a decision, not a fix.

### Two readings that do not match the frame

- **Monochrome has no mood.** Both Elevator to the Gallows frames measure chroma
  0.00, so brightness alone decides, and the grimmer of the two comes out
  mixolydian — nearly the brightest mode there is — because it happens to be mid
  key. In a black-and-white frame the mood is in the contrast, not the average.
- **A complementary palette cancels.** The Fall's desert — blue sky over an
  orange dune, the most deliberately coloured frame in the set — has chroma 0.76
  but agreement 0.18, because opposed hues cancel in a circular mean. The
  agreement gate added in FIX 7 then throws the colour away and lets brightness
  decide. Neon scatter and a two-colour scheme are not the same thing and the
  gate cannot currently tell them apart.

## 2026-09-08 — FIX 9 again, fifteen frames

Five more stills, chosen to fill the gaps: Fargo (snow, high key), Persona (a
close-up filling the frame), Blade Runner 1982 (blue held confidently), and The
Third Man against Kwaidan — chiaroscuro versus mist, the pair that tests whether
a black-and-white frame's mood can come from brightness.

They broke three more ranges immediately. Fargo alone clipped key light, detail
and focus **at the same time**; The Third Man pinned key light, detail and
shadow at the other end. Six ranges re-fitted:

| | was | now |
|---|---|---|
| `p50` → key light | 0.10 – 0.70 | 0.02 – 0.80 |
| `edgeRaw` → detail | 0.04 – 0.17 | 0.028 – 0.15 |
| `focusRaw` → focus | 0.24 – 0.62 | 0.24 – 0.80 |
| `colourRaw` → colour | 0.02 – 0.40 | 0.015 – 0.39 |
| `p95-p05` → range | 0.30 – 0.95 | 0.10 – 0.95 |
| `shadow` → shadow | 0.02 – 0.55 | 0.00 – 0.90 |

Activity re-fitted after: the raw sum spans 0.08 to 0.91 over fifteen frames.
Nothing clips now except gallows-a's key light, which floors because that frame
really is almost entirely black.

Lydian is reachable at last — Fargo lands on it at 3.72 of 4. Phrygian still is
not: the darkest frame in the set, The Third Man, only reaches 0.83.

### The black-and-white pair answers the question

Persona — an anguished face in close-up — reads **mixolydian at 3.28**. Kwaidan,
a ghost story in mist, reads **mixolydian at 3.40**. Both are near the bright
end of the ladder, because with chroma at 0.00 nothing but average brightness is
consulted, and both frames happen to be mid-to-bright. The Third Man, which is
almost all shadow, reads aeolian. So brightness alone separates dark frames from
bright ones and says nothing at all about mood.

### Letterboxing corrupts the reading

The Kwaidan still is a widescreen image sitting inside a 4:3 file, so
cover-cropping keeps black pillarbox bars down both sides. They fall in bands 0
and 3 and inflate shadow, contrast and the progression. Any upload of a
screenshot taken from video will have this. Bars need detecting and trimming
before analysis.

## 2026-09-08 — FIX 10 to 13, the tuning pass

### FIX 10 — letterbox bars

A screenshot taken from video carries black bars and they are not part of the
picture. The Kwaidan still is widescreen inside a 4:3 file; its bars fell in
bands 0 and 3 and were manufacturing most of its mood. Trimming them:

    shadow 0.233 -> 0.009        contrast 0.794 -> 0.492

Bars are detected on the ungraded pixels, so lifting exposure cannot hide them,
and only trimmed when they appear on **both** opposite sides — letterboxing is
symmetric, a dark edge in a composition is not. The Third Man, which is 89%
shadow, is correctly left alone.

### FIX 11 — a monochrome frame's mood is not its brightness

Persona and Kwaidan both read mixolydian, near the bright end of the ladder,
because with chroma at zero nothing but average brightness was consulted. Mood
in a black-and-white frame is carried by contrast and shadow: chiaroscuro is
heavy however bright its highlights, an even luminous frame is light however
grey. Brightness is now held down by both.

    tone = keyN * (1 - 0.50*rangeN) * (1 - 0.55*shadowN)

Multiplicative, not subtractive — the first version subtracted and drove a third
of the frames below zero, where they all floored at the same value.

    Persona    mixolydian 3.28 -> dorian 2.61
    Gallows-b  mixolydian 3.21 -> dorian 1.60

### FIX 12 — the progression was collapsing and saying it was not

The old test asked whether each band beat the frame average, which all four can
do while still choosing the same chord. **Every** black-and-white frame came out
`red red red red`: one chord for the whole piece, while the readout said "all
earned". The real question is whether the bands chose different hues.

When they did not, the harmony now moves on how light each band is. A monochrome
frame has no colour to be about, but it still has composition. Every frame in
the set now has two to four distinct chords instead of one; Fargo alone falls
back to the cadence, correctly — a flat white field has nothing to move on.

### FIX 13 — a two-colour scheme is not noise

FIX 7's agreement gate could not tell scattered neon from a deliberate palette:
both have a meaningless mean hue. The Fall's desert — blue sky over an orange
dune — measured chroma 0.79 and agreement 0.18, and had its colour thrown away.

Doubling the hue angle folds opposites onto each other, so a frame that
disagrees with itself at 0.18 agrees along its axis at 0.94. The louder end of
that axis is what the frame is about. Three frames are palettes: The Fall's
desert (orange against blue), The Fall's lake (azure against earth) and After
Hours (cyan against warm).

It made the piece **more** stable, not less. Mode reversals over sixty slider
sweeps, fifteen frames end to end:

    before this whole pass:  21        after:  4

The Fall's desert alone went from 5 and 8 reversals on Temperature and
Saturation to zero, because a frame whose colour is trusted stops thrashing.
The four that remain are `tone` genuinely reversing when exposure starts
crushing highlights, which is the mapping being honest rather than flutter.

## 2026-09-08 — FIX 14, stereo

The frame is read left to right and now it sounds left to right. The bed sits
where its band sits, notes sound where they were found in the picture, dust
falls anywhere, and the bass stays centred so a phone speaker keeps it.

Each bank carries one band's chord, so the bank is what moves. Its pan is set
outright while it is still silent, in the moment before it fades in — no pan
ever slides underneath a sounding voice, for the same reason no pitch does.

The melody cannot work that way: a note rings for seconds, so its position
cannot be moved after it starts. There are five fixed positions instead, each
with its own bell and its own hammer, and every note is played from the one
nearest to where it was found. Width and centre come from FIX 8 — a
concentrated subject gathers the sound, an even field spreads it.

Measured in a real browser, dry, above 300 Hz, per band, left to right:

    Budapest        -0.61  -0.19  +0.15  +0.62
    The Third Man   -0.04  -0.07  +0.04  +0.25

### Killed: two measurements that were wrong before the code was

Nearly reported two bugs that were not bugs.

The first per-band reading showed no movement at all on half the frames. The
probe had set the bank pans and then waited four seconds — during which
`goToBand` fired and overwrote them. It was measuring ordinary playback.

The second showed the image collapsing on every spacious frame. A full-band RMS
is dominated by the bass, and the bass is centred deliberately. The stereo image
has to be measured above it.

### The melody was never sounding

`scatter()` schedules crackle at random positions inside the tick, and one synth
cannot be triggered out of chronological order — Tone throws "time must be
greater than or equal to the last scheduled time". That throw happened inside
`tick()` **before** the motif loop, so every note of the melody was being lost
with it, on every tick that scattered more than one impulse. Pre-existing, found
only because the audio was finally being measured rather than assumed. The
offsets are sorted now.

### Open: the bass stops being a bass on bright frames

`bass = chord root / 4`, and the chord root follows the register. On Fargo, at
octave 2, that puts the bass at about **293 Hz** — not a bass, a mid-range tone,
sitting in the same range as the bed at roughly 20 dB louder, and centred, which
flattens the stereo image to nothing. With it muted Fargo sweeps normally.
Clamping it to a real bass range would fix both. Her call: it changes what every
bright frame sounds like.


## 2026-09-08 — the optical track

Two regressions from the React migration, and then the animation rebuilt around
what actually broke.

### The loop ended on pause

`sweep()` returned without re-scheduling itself once `core.playing` went false.
The playhead parked wherever the last animation frame caught it and the marks
froze mid-decay — while the engine's own `OUT` fade was still sounding for
0.9 s. The loop runs unconditionally now.

Also: the marks canvas only checked its width before resizing. Harmless while
`Frame` was the sized grid child; once the reel started sizing the gate it could
change height alone and leave the marks on a stale pixel grid.

### Killed: the picture working out what is sounding for itself

`Frame.jsx` derived the step from `Tone.Transport.progress` and kept its own copy
of the motif rules, down to band two dropping its tail. That is two copies of one
truth: a late tick or a slow grade pass desynchronises them permanently, and then
the marks are showing a performance nobody is hearing — silently, because both
halves look right in isolation.

`Engine.say(time, event)` schedules through `Tone.Draw`, so a note event lands on
the animation frame nearest the audio time it was scheduled for. `core.tap(fn)`
is the subscription. The picture now only draws what the engine says it played.

### The optical track

Her direction, of three proposed: variable-area sound printed the way it is
printed on a release print — perforations, sound track, picture, in that order
across the strip, so it sits **outboard** of the frame and never over it. She is
grading a shot; nothing is allowed to cover the shot.

- The envelope is the bed, computed from the same 23/27/32/37 s cycles the
  oscillator gains ride (`breathAt`). Recomputed, not sampled: an AudioParam
  driven by a connected LFO does not report the LFO in `.value`.
- A struck note swells the envelope with a ripple in it, and the ripple's
  spatial frequency is the pitch. An audible frequency at four seconds of film
  in the gate aliases to a smear, so it is mapped down to a rate the eye can
  resolve — two octaves apart still look two octaves apart.
- **The axis moves.** A band change repans the bed, so the track's centre line
  walks across over the same 1.6 s the chords take to crossfade. The progression
  is legible as a shape rather than as an event.
- Dust is specks of 11 ms, which is 11 ms of film. Never a texture laid over the
  strip — there is no continuous noise in the sound and there is none in the
  picture of it.
- **The strip's speed is the master gain, not the playing flag.** A flag kept the
  print running flat out through the 0.9 s pause fade and then stopped it dead —
  a cut. Following the gain, it spins up with the fade in, coasts to a stop with
  the fade out, and comes to rest holding the last notes faintly printed.

Perforations are placed on absolute print distance rather than on the loop, so
they carry the speed and never tick in time with anything.

### Not verified in the browser

Builds clean and the plumbing is exercised, but nothing here has been *seen*
running. Claude has no browser in this session. The look is hers to accept.

## 2026-09-08 — the optical track, killed; and the overlay was twice the size of the shot

The optical track is out — her call, one look was enough. `Optical.jsx` deleted
and the reel is back to the markup it had before it: no flex row, no track
gutter, the box is the picture again. The event plumbing stays, because the marks
over the picture use it and it is what stopped them inventing a performance.

### The marks were laid out at 2× and spilling onto the field

Visible as band edges and pitch rules running past the right edge of the shot and
on down through the printer points.

`<canvas className="absolute inset-0">` with no width or height. That stretches a
div; a canvas is a **replaced** element, and for replaced elements `width: auto`
resolves to the *intrinsic* width — the backing store — and the over-constrained
`right` is ignored outright. The overlay's CSS size was therefore
`cv.width × cv.height`, which is set to w·dpr × h·dpr. On a 2× display the
overlay was laid out at twice the size of the picture.

The signature, from her screenshot: band 0's two edges landed at 0 and w/2
instead of 0 and w/4. Exactly 2×, and it confirmed the mechanism before a line
was changed.

Latent, not new. While the first pass ran with the wrapper at zero size the
backing store stayed 0, so the overlay was invisible rather than wrong — which is
why fixing the loop and the resize check is what made it appear. Two bugs hiding
each other.

`place()` now sets left/top/width/height in CSS pixels from the **picture
canvas** rather than the wrapper, so the marks are anchored to the shot whatever
the box around it does, and the playhead's 8px overhang is explicit instead of
being inferred from `-top-2 -bottom-2`.

Rule for anything drawn over the frame from here: a canvas overlay needs an
explicit CSS size. `inset-0` is not a size for a replaced element.
