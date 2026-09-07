// What the frame decided, in numbers. This panel is the tuning instrument:
// load two frames, compare the columns, and a mapping that cannot tell them
// apart shows up here before you have to hear it.

import { HUENAME } from './music.js'

export const ROWS = [
  ['Palette',     (A, M) => HUENAME[A.hue],                       (A, M) => `mode · ${M.modeName}`],
  ['Progression', (A, M) => M.prog.map(c => HUENAME[c.hue].slice(0, 3)).join(' · '),
                  (A, M) => (A.bands.filter(b => b.distinct).length >= 3 ? '4 bands · all earned' : '4 bands · cadence held')],
  ['Activity',    (A, M) => M.activity.toFixed(2),
                  (A, M) => `${M.repeats}× per band · note ${M.noteLen.toFixed(1)} s`],
  ['Key light',   (A, M) => A.keyN.toFixed(2),                    (A, M) => `register · oct ${M.oct}${M.lift ? (M.lift > 0 ? ' +8ve' : ' −8ve') : ''}`],
  ['Detail',      (A, M) => A.detail.toFixed(2),                  (A, M) => `motif · ${M.motif.length} notes`],
  ['Space',       (A, M) => A.spaceN.toFixed(2),                  (A, M) => `wet ${M.wet.toFixed(2)}`],
  ['Haze',        (A, M) => A.hazeN.toFixed(2),                   (A, M) => `attack · ${M.attack.toFixed(1)} s`],
  ['Colour',      (A, M) => A.colour.toFixed(2),                  (A, M) => (M.padOn ? `pad on · drive ${M.drive.toFixed(2)}` : 'pad muted · stark')],
  ['Symmetry',    (A, M) => A.sym.toFixed(2),                     (A, M) => `echo · ${M.echo.toFixed(2)}`],
  ['Raw',         (A) => A.edgeRaw.toFixed(3),                    (A) => `gradient · chroma ${A.colourRaw.toFixed(3)}`],
]

export function paint(host, A, M) {
  host.innerHTML = ROWS.map(r =>
    `<tr><th>${r[0]}</th><td>${r[1](A, M)}</td><td class="map">${r[2](A, M)}</td></tr>`
  ).join('')
}
