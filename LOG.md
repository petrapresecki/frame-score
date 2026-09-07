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
