'use strict';

// Csapatcímer: forma + jelkép + szín. A rajzolás a kliensben történik (public/app.js).
const SHAPES = ['shield', 'hex', 'circle', 'badge', 'diamond'];
const SYMBOLS = ['bolt', 'star', 'crosshair', 'flame', 'crown', 'chevron', 'claw', 'eye', 'mountain', 'gem'];

function validateIcon(icon) {
  if (icon === undefined || icon === null) return null;
  if (typeof icon !== 'object') throw new Error('érvénytelen ikon');
  const { shape, symbol, color } = icon;
  if (!SHAPES.includes(shape)) throw new Error('ismeretlen címerforma');
  if (!SYMBOLS.includes(symbol)) throw new Error('ismeretlen jelkép');
  if (typeof color !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(color)) throw new Error('a szín #rrggbb formátumú legyen');
  return { shape, symbol, color: color.toLowerCase() };
}

// Hivatalos logó: csak a public/logos mappában lévő fájlra mutató útvonal fogadható el.
function validateLogo(logo) {
  if (logo === undefined || logo === null || logo === '') return null;
  if (typeof logo !== 'string' || !/^\/logos\/[a-z0-9_-]+\.(svg|png|webp)$/.test(logo)) {
    throw new Error('érvénytelen logó útvonal');
  }
  return logo;
}

module.exports = { SHAPES, SYMBOLS, validateIcon, validateLogo };
