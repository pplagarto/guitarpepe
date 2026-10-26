export const TUNINGS = {
  standard: { name: 'Estándar', notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], midi: [40,45,50,55,59,64] },
  dropD: { name: 'Drop D', notes: ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'], midi: [38,45,50,55,59,64] },
  halfDown: { name: 'Medio tono abajo', notes: ['E♭2', 'A♭2', 'D♭3', 'G♭3', 'B♭3', 'E♭4'], midi: [39,44,49,54,58,63] },
  dadgad: { name: 'DADGAD', notes: ['D2', 'A2', 'D3', 'G3', 'A3', 'D4'], midi: [38,45,50,55,57,62] },
  openG: { name: 'Open G', notes: ['D2', 'G2', 'D3', 'G3', 'B3', 'D4'], midi: [38,43,50,55,59,62] },
  openD: { name: 'Open D', notes: ['D2', 'A2', 'D3', 'F♯3', 'A3', 'D4'], midi: [38,45,50,54,57,62] }
};
export const frequency = midi => 440 * 2 ** ((midi - 69) / 12);
export const centsBetween = (hz, target) => 1200 * Math.log2(hz / target);
export function nearestString(hz, tuning, selected = -1) {
  const targets = TUNINGS[tuning].midi.map(frequency);
  const index = selected >= 0 ? selected : targets.reduce((best, f, i) => Math.abs(centsBetween(hz, f)) < Math.abs(centsBetween(hz, targets[best])) ? i : best, 0);
  return { index, hz: targets[index], cents: centsBetween(hz, targets[index]) };
}

// YIN: normalized difference distinguishes a fundamental from its harmonics.
// Fixed integration window avoids bias toward large lag values.
export function detectPitch(samples, sampleRate) {
  const rms = Math.sqrt(samples.reduce((sum, n) => sum + n*n, 0) / samples.length);
  if (rms < 0.008) return null;
  const maxTau = Math.min(Math.floor(sampleRate / 55), Math.floor(samples.length / 2) - 1);
  const minTau = Math.floor(sampleRate / 600);
  const window = samples.length - maxTau;
  const difference = new Float32Array(maxTau + 1);
  let sum = 0;
  difference[0] = 1;
  for (let tau = 1; tau <= maxTau; tau++) {
    let value = 0;
    for (let i = 0; i < window; i++) { const delta = samples[i] - samples[i + tau]; value += delta * delta; }
    sum += value;
    difference[tau] = sum ? value * tau / sum : 1;
  }
  for (let tau = minTau; tau < maxTau; tau++) {
    if (difference[tau] >= 0.12) continue;
    while (tau + 1 <= maxTau && difference[tau + 1] < difference[tau]) tau++;
    if (tau === maxTau) return null;
    const a = difference[tau - 1], b = difference[tau], c = difference[tau + 1];
    const denominator = 2 * (2*b - a - c);
    const refined = tau + (denominator ? (c-a)/denominator : 0);
    return { hz: sampleRate / refined, confidence: 1 - b, rms };
  }
  return null;
}

export function validateSong(song) {
  if (!song || typeof song !== 'object') throw new Error('La canción no tiene un formato válido.');
  if (typeof song.title !== 'string' || !song.title.trim() || song.title.length > 160) throw new Error('Escribe un título de hasta 160 caracteres.');
  if (typeof song.artist !== 'string' || song.artist.length > 160) throw new Error('El artista debe tener hasta 160 caracteres.');
  if (typeof song.content !== 'string' || !song.content.trim() || song.content.length > 100000) throw new Error('Añade tablatura o acordes (máximo 100 000 caracteres).');
  if (!Object.hasOwn(TUNINGS, song.tuning)) throw new Error('Selecciona una afinación válida.');
  if (song.capo !== null && (!Number.isInteger(song.capo) || song.capo < 0 || song.capo > 12)) throw new Error('El capo debe estar entre 0 y 12.');
  if (!['tab', 'chords'].includes(song.format)) throw new Error('Selecciona tablatura o acordes.');
  if (!['draft','reviewed'].includes(song.status)) throw new Error('Estado de revisión inválido.');
  if (song.status === 'reviewed' && song.capo === null) throw new Error('Confirma si lleva capo antes de aprobar.');
  if (typeof song.source !== 'string' || song.source.length > 2000 || typeof song.notes !== 'string' || song.notes.length > 4000) throw new Error('La fuente o las notas son demasiado largas.');
  return song;
}
export function importBackup(text, makeId, now) {
  const data = JSON.parse(text);
  if (data.version !== 1 || !Array.isArray(data.songs) || data.songs.length > 500) throw new Error('Respaldo no compatible: se requiere versión 1, hasta 500 canciones.');
  return data.songs.map(raw => {
    validateSong(raw);
    return { id: makeId(), title: raw.title.trim(), artist: raw.artist.trim(), content: raw.content,
      format: raw.format, tuning: raw.tuning, capo: raw.capo, source: raw.source, notes: raw.notes,
      favorite: raw.favorite === true, status: 'draft', createdAt: now, updatedAt: now };
  });
}
export const blankTab = 'e|--------------------------------|\nB|--------------------------------|\nG|--------------------------------|\nD|--------------------------------|\nA|--------------------------------|\nE|--------------------------------|';
