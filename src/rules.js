'use strict';

// CS2 MR12 szabályok: 13 nyert kör kell, 12-12 után MR3 hosszabbítás.
function validMapScore(a, b) {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return false;
  const w = Math.max(a, b);
  const l = Math.min(a, b);
  if (w === 13) return l <= 11;
  // hosszabbítás: 16-12..14, 19-15..17, 22-18..20 ...
  return w >= 16 && w % 3 === 1 && w - l >= 2 && w - l <= 4;
}

// bestOf: 1, 3 vagy 5. Visszaadja a győztest (1|2) és a nyert pályákat, vagy hibát dob.
function evaluateSeries(bestOf, maps) {
  if (![1, 3, 5].includes(bestOf)) throw new Error('bestOf csak 1, 3 vagy 5 lehet');
  if (!Array.isArray(maps) || maps.length === 0) throw new Error('legalább egy pálya eredménye kell');
  const need = Math.ceil(bestOf / 2);
  let w1 = 0;
  let w2 = 0;
  maps.forEach((m, i) => {
    if (w1 === need || w2 === need) throw new Error('a sorozat már eldőlt, felesleges pálya: ' + (i + 1));
    if (!validMapScore(m.score1, m.score2)) {
      throw new Error(`érvénytelen CS2 pályaeredmény (${m.score1}-${m.score2}) a(z) ${i + 1}. pályán`);
    }
    if (m.score1 > m.score2) w1++; else w2++;
  });
  if (w1 !== need && w2 !== need) throw new Error('a sorozat nincs lejátszva, hiányzó pályák');
  return { winner: w1 > w2 ? 1 : 2, maps1: w1, maps2: w2 };
}

module.exports = { validMapScore, evaluateSeries };
