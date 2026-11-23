// ============================================================
// IKENGA — generative carved-figure art (Generator 7)
//
// Inspired by the Igbo Ikenga carving tradition: horned wooden figures that
// are seated, standing, stacked as a column, or rising from a drum base,
// often holding a blade or tusk. Every piece is a single carving shown like a
// museum object: carved in one of six woods, with chevron / crosshatch / band
// incisions, displayed on a stand against a gallery backdrop, and aged
// (weathered, cracked, chipped) or intact.
//
// Usage:
//   Node:    const G = require('./generator.js'); G.generatePiece(1, 7)
//   Browser: inlined into index.html -> window.IkengaGen
// ============================================================

// ---------- seeded RNG ----------
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weightedPick(rng, pool) {
  const total = pool.reduce((s, o) => s + (o.weight || 0), 0);
  let r = rng() * total;
  for (const o of pool) { r -= (o.weight || 0); if (r <= 0 && o.weight) return o; }
  return pool.filter((o) => o.weight)[0];
}
const TIER_FALLBACK = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare: ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  for (const t of TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare']) {
    const sub = pool.filter((p) => p.rarity === t && p.weight);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}
function shadeColor(hex, percent) {
  const n = parseInt(hex.replace('#', ''), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}
const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea', robinhood: '#00c805' };
// pieces are numbered artworks ("Ikenga #12"); kept for API parity with the other engines
function characterName() { return ''; }

// ---------- traits ----------
const TRAITS = {
  form: [
    { id: 'seated',   weight: 28, rarity: 'common' },
    { id: 'standing', weight: 24, rarity: 'common' },
    { id: 'column',   weight: 20, rarity: 'uncommon' },
    { id: 'drum',     weight: 16, rarity: 'uncommon' }
  ],
  horns: [
    { id: 'twin_blades',  weight: 26, rarity: 'common' },
    { id: 'ram_curls',    weight: 22, rarity: 'common' },
    { id: 'curved_horns', weight: 18, rarity: 'uncommon' },
    { id: 'spiked',       weight: 14, rarity: 'uncommon' },
    { id: 'crown',        weight: 10, rarity: 'rare' }
  ],
  wood: [
    { id: 'honey_iroko',    weight: 24, rarity: 'common' },
    { id: 'pale_weathered', weight: 20, rarity: 'common' },
    { id: 'dark_smoked',    weight: 18, rarity: 'common' },
    { id: 'ash_grey',       weight: 12, rarity: 'uncommon' },
    { id: 'red_camwood',    weight: 10, rarity: 'uncommon' },
    { id: 'ebony',          weight: 7,  rarity: 'rare' }
  ],
  face: [
    { id: 'calm',        weight: 28, rarity: 'common' },
    { id: 'stern',       weight: 24, rarity: 'common' },
    { id: 'open_mouth',  weight: 16, rarity: 'uncommon' },
    { id: 'ichi_marked', weight: 16, rarity: 'uncommon' },
    { id: 'abstract',    weight: 12, rarity: 'rare' }
  ],
  carving: [
    { id: 'chevron',    weight: 24, rarity: 'common' },
    { id: 'bands',      weight: 22, rarity: 'common' },
    { id: 'plain',      weight: 20, rarity: 'common' },
    { id: 'crosshatch', weight: 18, rarity: 'uncommon' },
    { id: 'zigzag',     weight: 10, rarity: 'rare' }
  ],
  holds: [
    { id: 'knife',       weight: 28, rarity: 'common' },
    { id: 'tusk',        weight: 22, rarity: 'common' },
    { id: 'empty',       weight: 18, rarity: 'common' },
    { id: 'staff',       weight: 14, rarity: 'uncommon' },
    { id: 'trophy_head', weight: 12, rarity: 'rare' },
    { id: 'none',        weight: 0,  rarity: 'common' } // column / drum forms have no arms
  ],
  condition: [
    { id: 'intact',    weight: 32, rarity: 'common' },
    { id: 'weathered', weight: 26, rarity: 'common' },
    { id: 'cracked',   weight: 22, rarity: 'uncommon' },
    { id: 'chipped',   weight: 18, rarity: 'uncommon' }
  ],
  display: [
    { id: 'metal_stand', weight: 42, rarity: 'common' },
    { id: 'wood_block',  weight: 30, rarity: 'common' },
    { id: 'floor',       weight: 28, rarity: 'uncommon' }
  ],
  background: [
    { id: 'gallery_white', weight: 24, rarity: 'common' },
    { id: 'warm_cream',    weight: 22, rarity: 'common' },
    { id: 'stone',         weight: 18, rarity: 'common' },
    { id: 'terracotta',    weight: 14, rarity: 'uncommon' },
    { id: 'indigo',        weight: 12, rarity: 'uncommon' },
    { id: 'charcoal',      weight: 10, rarity: 'rare' }
  ],
  lighting: [
    { id: 'soft',      weight: 50, rarity: 'common' },
    { id: 'raking',    weight: 30, rarity: 'uncommon' },
    { id: 'spotlight', weight: 20, rarity: 'rare' }
  ]
};

// wood palettes: light, mid, dark, groove (carved line), hi (cut highlight)
const WOOD = {
  honey_iroko:    { light: '#dcab6b', mid: '#b47b41', dark: '#6b411e', groove: '#3a2210', hi: '#f6d6a6' },
  pale_weathered: { light: '#e4d2b3', mid: '#c2a983', dark: '#867053', groove: '#55462f', hi: '#f8eedb' },
  dark_smoked:    { light: '#8c6c50', mid: '#5c4130', dark: '#2c1d13', groove: '#140c06', hi: '#b8987e' },
  ash_grey:       { light: '#c2b8aa', mid: '#968b7d', dark: '#5a5147', groove: '#332d27', hi: '#e2dbd1' },
  red_camwood:    { light: '#c8693f', mid: '#953f26', dark: '#4c180d', groove: '#280a05', hi: '#ef9e80' },
  ebony:          { light: '#5a4d43', mid: '#2e2621', dark: '#120e0b', groove: '#000000', hi: '#8c7e72' }
};
const BACKDROP = {
  gallery_white: { top: '#f8f7f4', bot: '#e8e5df', floor: '#dad5cc', dark: false },
  warm_cream:    { top: '#f4e7d0', bot: '#e5d1ae', floor: '#d3bd96', dark: false },
  stone:         { top: '#d8d6d1', bot: '#b9b6ae', floor: '#a6a298', dark: false },
  terracotta:    { top: '#dc9068', bot: '#b2623d', floor: '#954f31', dark: false },
  indigo:        { top: '#2e355e', bot: '#1a1e3b', floor: '#11142a', dark: true },
  charcoal:      { top: '#2f2d2b', bot: '#1b1a19', floor: '#111010', dark: true }
};

// ---------- drawing kit ----------
function makeKit(uid, woodId, lighting, rng) {
  const W = WOOD[woodId] || WOOD.honey_iroko;
  const id = (k) => k + uid;
  const sil = [];            // silhouettes (for clip + cast shadow)
  let defs = '';
  const stops = lighting === 'raking'
    ? [[0, W.dark], [0.2, W.light], [0.5, W.mid], [0.82, W.dark], [1, W.dark]]
    : [[0, W.dark], [0.18, W.mid], [0.44, W.light], [0.72, W.mid], [1, W.dark]];
  defs += `<linearGradient id="${id('wd')}" x1="0" y1="0" x2="1" y2="0">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  // flat-on surfaces (tops of discs, seats): lighter, vertical falloff
  defs += `<linearGradient id="${id('wt')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${W.light}"/><stop offset="1" stop-color="${W.mid}"/></linearGradient>`;
  // wood grain: wavy vertical fibres
  let grain = '';
  for (let x = 2; x < 40; x += 4 + Math.floor(rng() * 3)) {
    const w = 0.8 + rng() * 1.6;
    grain += `<path d="M${x} 0 Q${x + w} 20 ${x} 40 T${x} 80" fill="none" stroke="${W.dark}" stroke-width="${(0.5 + rng() * 0.7).toFixed(2)}" opacity="${(0.12 + rng() * 0.16).toFixed(2)}"/>`;
  }
  defs += `<pattern id="${id('gr')}" width="40" height="80" patternUnits="userSpaceOnUse">${grain}</pattern>`;
  // incised carving patterns
  const g = W.groove, h = W.hi;
  const pat = {
    chevron:    `<pattern id="${id('pc')}" width="16" height="12" patternUnits="userSpaceOnUse"><path d="M0 2 L8 9 L16 2" fill="none" stroke="${g}" stroke-width="1.7"/><path d="M0 3.4 L8 10.4 L16 3.4" fill="none" stroke="${h}" stroke-width="0.8" opacity="0.6"/></pattern>`,
    crosshatch: `<pattern id="${id('pc')}" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M0 0 L10 10 M10 0 L0 10" fill="none" stroke="${g}" stroke-width="1.2"/></pattern>`,
    bands:      `<pattern id="${id('pc')}" width="10" height="9" patternUnits="userSpaceOnUse"><path d="M0 2 L10 2" stroke="${g}" stroke-width="1.8"/><path d="M0 3.3 L10 3.3" stroke="${h}" stroke-width="0.8" opacity="0.6"/></pattern>`,
    zigzag:     `<pattern id="${id('pc')}" width="12" height="16" patternUnits="userSpaceOnUse"><path d="M0 0 L6 8 L0 16 M6 0 L12 8 L6 16" fill="none" stroke="${g}" stroke-width="1.5"/></pattern>`
  };
  const k = {
    W, sil, id,
    addDef: (d) => { defs += d; },
    defs: () => defs,
    setCarving: (c) => { if (pat[c]) defs += pat[c]; k.carving = pat[c] ? c : null; },
    carving: null,
    // a carved wooden volume: shaded fill + grain + outline (+ optional incised pattern)
    wood: (d, opts) => {
      const o = opts || {};
      sil.push(d);
      let s = `<path d="${d}" fill="url(#${id(o.top ? 'wt' : 'wd')})" stroke="${W.groove}" stroke-width="2" stroke-linejoin="round"/>`;
      s += `<path d="${d}" fill="url(#${id('gr')})"/>`;
      if (o.carve && k.carving) s += `<path d="${d}" fill="url(#${id('pc')})" opacity="0.6"/>`;
      return s;
    },
    // a cut line: dark groove with a lighter lip just below it
    groove: (d, w) => `<path d="${d}" fill="none" stroke="${W.groove}" stroke-width="${w || 2.2}" stroke-linecap="round" opacity="0.85"/>` +
      `<path d="${d}" fill="none" stroke="${W.hi}" stroke-width="${((w || 2.2) * 0.45).toFixed(2)}" stroke-linecap="round" opacity="0.5" transform="translate(0.8 1)"/>`,
    hole: (d) => `<path d="${d}" fill="${W.groove}" opacity="0.85"/>`
  };
  return k;
}
const R = (n) => n.toFixed(1);
function rectD(x0, y0, x1, y1, r) {
  r = Math.min(r || 0, (x1 - x0) / 2, (y1 - y0) / 2);
  if (!r) return `M${R(x0)} ${R(y0)} L${R(x1)} ${R(y0)} L${R(x1)} ${R(y1)} L${R(x0)} ${R(y1)} Z`;
  return `M${R(x0 + r)} ${R(y0)} L${R(x1 - r)} ${R(y0)} Q${R(x1)} ${R(y0)} ${R(x1)} ${R(y0 + r)} L${R(x1)} ${R(y1 - r)} Q${R(x1)} ${R(y1)} ${R(x1 - r)} ${R(y1)} L${R(x0 + r)} ${R(y1)} Q${R(x0)} ${R(y1)} ${R(x0)} ${R(y1 - r)} L${R(x0)} ${R(y0 + r)} Q${R(x0)} ${R(y0)} ${R(x0 + r)} ${R(y0)} Z`;
}
function ellD(cx, cy, rx, ry) {
  return `M${R(cx - rx)} ${R(cy)} A${R(rx)} ${R(ry)} 0 1 0 ${R(cx + rx)} ${R(cy)} A${R(rx)} ${R(ry)} 0 1 0 ${R(cx - rx)} ${R(cy)} Z`;
}

// ---------- head + face ----------
function head(k, hx, hy, rx, ry, style, brass) {
  let s = k.wood(ellD(hx, hy, rx, ry));
  const W = k.W, ey = hy - ry * 0.05, ex = rx * 0.42;
  // brow ridge
  s += k.groove(`M${R(hx - rx * 0.72)} ${R(hy - ry * 0.24)} Q${R(hx)} ${R(hy - ry * 0.46)} ${R(hx + rx * 0.72)} ${R(hy - ry * 0.24)}`, 2.4);
  // eyes
  for (const sd of [-1, 1]) {
    const x = hx + sd * ex;
    if (style === 'calm' || style === 'ichi_marked') {
      s += k.groove(`M${R(x - rx * 0.24)} ${R(ey)} Q${R(x)} ${R(ey + ry * 0.12)} ${R(x + rx * 0.24)} ${R(ey)}`, 2.2);
    } else if (style === 'stern') {
      s += `<path d="M${R(x - rx * 0.26)} ${R(ey - sd * 0)} L${R(x + rx * 0.26)} ${R(ey + (sd > 0 ? -1 : 1) * -ry * 0.08)} L${R(x + rx * 0.2)} ${R(ey + ry * 0.07)} L${R(x - rx * 0.2)} ${R(ey + ry * 0.07)} Z" fill="${W.groove}" opacity="0.85"/>`;
    } else if (style === 'open_mouth') {
      s += `<ellipse cx="${R(x)}" cy="${R(ey)}" rx="${R(rx * 0.22)}" ry="${R(ry * 0.09)}" fill="${W.hi}" stroke="${W.groove}" stroke-width="1.6"/>`;
      s += k.groove(`M${R(x - rx * 0.16)} ${R(ey)} L${R(x + rx * 0.16)} ${R(ey)}`, 1.6);
    } else { // abstract: cut rectangles
      s += `<rect x="${R(x - rx * 0.2)}" y="${R(ey - ry * 0.06)}" width="${R(rx * 0.4)}" height="${R(ry * 0.12)}" fill="${W.groove}" opacity="0.85"/>`;
    }
    if (brass) s += `<ellipse cx="${R(x)}" cy="${R(ey + 0.5)}" rx="${R(rx * 0.13)}" ry="${R(ry * 0.06)}" fill="#e0b040" stroke="#6b4a00" stroke-width="0.8"/><circle cx="${R(x - rx * 0.05)}" cy="${R(ey - 0.6)}" r="0.9" fill="#fff6c8"/>`;
  }
  // long carved nose
  const nt = hy - ry * 0.18, nb = hy + ry * 0.32;
  s += `<path d="M${R(hx - 3)} ${R(nt)} L${R(hx - rx * 0.17)} ${R(nb)} L${R(hx + rx * 0.17)} ${R(nb)} L${R(hx + 3)} ${R(nt)} Z" fill="${W.light}" stroke="${W.groove}" stroke-width="1.4" stroke-linejoin="round"/>`;
  s += k.groove(`M${R(hx - rx * 0.13)} ${R(nb - 1)} L${R(hx + rx * 0.13)} ${R(nb - 1)}`, 1.4);
  // mouth
  const my = hy + ry * 0.55;
  if (style === 'open_mouth') s += `<ellipse cx="${R(hx)}" cy="${R(my)}" rx="${R(rx * 0.24)}" ry="${R(ry * 0.11)}" fill="${W.groove}" opacity="0.9"/>`;
  else if (style === 'abstract') s += `<rect x="${R(hx - rx * 0.28)}" y="${R(my - 2)}" width="${R(rx * 0.56)}" height="5" fill="${W.groove}" opacity="0.85"/>`;
  else s += k.groove(`M${R(hx - rx * 0.28)} ${R(my)} Q${R(hx)} ${R(my + ry * 0.07)} ${R(hx + rx * 0.28)} ${R(my)}`, 2.2);
  // ichi: the parallel forehead scarification lines
  if (style === 'ichi_marked') {
    for (let i = -2; i <= 2; i++) s += k.groove(`M${R(hx + i * rx * 0.16)} ${R(hy - ry * 0.82)} L${R(hx + i * rx * 0.16)} ${R(hy - ry * 0.5)}`, 1.6);
  }
  // cheek lines (always): two short vertical cuts under the eyes
  for (const sd of [-1, 1]) s += k.groove(`M${R(hx + sd * rx * 0.62)} ${R(hy + ry * 0.12)} L${R(hx + sd * rx * 0.6)} ${R(hy + ry * 0.34)}`, 1.4);
  return s;
}

// horns: returns { back, front } (front draws over the head, e.g. the crown's collar ribs)
function horns(k, style, hx, hy, hw, H, rootY, rng) {
  let back = '', front = '';
  const root = rootY == null ? hy + 10 : rootY;
  if (style === 'twin_blades') {
    for (const sd of [-1, 1]) {
      const x0 = hx + sd * hw * 0.62, tc = x0 + sd * (10 + rng() * 10), ty = hy - H, wb = 26, wt = 22;
      back += k.wood(`M${R(x0 - wb / 2)} ${R(root)} C${R(x0 - wb / 2)} ${R(root - H * 0.5)} ${R(tc - wt / 2)} ${R(ty + H * 0.3)} ${R(tc - wt / 2)} ${R(ty + 12)} Q${R(tc)} ${R(ty - 6)} ${R(tc + wt / 2)} ${R(ty + 12)} C${R(tc + wt / 2)} ${R(ty + H * 0.3)} ${R(x0 + wb / 2)} ${R(root - H * 0.5)} ${R(x0 + wb / 2)} ${R(root)} Z`, { carve: true });
    }
  } else if (style === 'ram_curls') {
    for (const sd of [-1, 1]) {
      const cx = hx + sd * (hw + 16), cy = hy + 18, r = 30 + rng() * 6;
      back += k.wood(`M${R(hx + sd * hw * 0.4)} ${R(hy + 6)} Q${R(cx)} ${R(hy - 18)} ${R(cx + sd * 6)} ${R(cy - r * 0.6)} L${R(cx)} ${R(cy)} L${R(hx + sd * hw * 0.5)} ${R(hy + 22)} Z`);
      back += k.wood(`${ellD(cx, cy, r, r * 1.05)} ${ellD(cx, cy + 2, r * 0.42, r * 0.46)}`).replace(/<path d="([^"]*)" fill="url\(#wd/, '<path d="$1" fill-rule="evenodd" fill="url(#wd');
      back += `<path d="${ellD(cx, cy + 2, r * 0.42, r * 0.46)}" fill="${k.W.groove}" opacity="0.55"/>`;
      back += k.groove(`M${R(cx - sd * r * 0.7)} ${R(cy - r * 0.55)} Q${R(cx + sd * r * 0.2)} ${R(cy - r * 0.95)} ${R(cx + sd * r * 0.85)} ${R(cy - r * 0.2)}`, 1.6);
    }
  } else if (style === 'curved_horns') {
    for (const sd of [-1, 1]) {
      const tipX = hx + sd * (hw + 6), tipY = hy - H * 0.72;
      back += k.wood(`M${R(hx + sd * hw * 0.2)} ${R(root)} Q${R(hx + sd * (hw + 44))} ${R(hy - 24)} ${R(tipX)} ${R(tipY)} Q${R(hx + sd * (hw + 26))} ${R(hy - 30)} ${R(hx + sd * hw * 0.78)} ${R(root + 4)} Z`, { carve: true });
    }
  } else if (style === 'spiked') {
    const n = 3 + Math.floor(rng() * 3);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0.5 : i / (n - 1), a = -Math.PI * (0.82 - 0.64 * t);
      const bx = hx + Math.cos(a) * hw * 0.9, by = hy + 10 + Math.sin(a) * hw * 0.9, len = H * (0.55 + 0.35 * (1 - Math.abs(t - 0.5) * 2)), w = 11;
      const tx = bx + Math.cos(a) * len, ty = by + Math.sin(a) * len, px = -Math.sin(a) * w, py = Math.cos(a) * w;
      back += k.wood(`M${R(bx + px)} ${R(by + py)} L${R(tx)} ${R(ty)} L${R(bx - px)} ${R(by - py)} Z`, { carve: true });
    }
  } else if (style === 'crown') {
    // flat boxy horns with a notched top, plus a ribbed collar across the brow
    for (const sd of [-1, 1]) {
      const xi = hx + sd * hw * 0.15, xo = hx + sd * (hw + 20), ty = hy - H * 0.72;
      const xa = Math.min(xi, xo), xb = Math.max(xi, xo);
      back += k.wood(`M${R(xa)} ${R(root)} L${R(xa + (sd < 0 ? 0 : 4))} ${R(ty)} L${R((xa + xb) / 2)} ${R(ty + 10)} L${R(xb - (sd < 0 ? 4 : 0))} ${R(ty)} L${R(xb)} ${R(root)} Z`, { carve: true });
    }
    // ribbed crest across the crown of the head (kept above the brows)
    for (let i = 0; i < 3; i++) {
      const y = hy - 4 + i * 7;
      front += k.wood(rectD(hx - hw - 16 + i * 3, y, hx + hw + 16 - i * 3, y + 5, 2.5));
    }
  }
  return { back, front };
}

// held objects (seated / standing): left hand (viewer's left) and right hand positions
function held(k, what, L, Rh, floorY) {
  const W = k.W;
  if (what === 'knife') {
    return k.wood(`M${R(L[0] - 5)} ${R(L[1] - 6)} L${R(L[0] - 2)} ${R(L[1] - 92)} Q${R(L[0] + 3)} ${R(L[1] - 102)} ${R(L[0] + 6)} ${R(L[1] - 92)} L${R(L[0] + 6)} ${R(L[1] - 6)} Z`) +
      k.groove(`M${R(L[0] + 1)} ${R(L[1] - 14)} L${R(L[0] + 2)} ${R(L[1] - 86)}`, 1.2) + k.wood(rectD(L[0] - 7, L[1] - 10, L[0] + 8, L[1] + 4, 3));
  }
  if (what === 'tusk') {
    return k.wood(`M${R(Rh[0] - 6)} ${R(Rh[1] - 2)} Q${R(Rh[0] + 44)} ${R(Rh[1] - 40)} ${R(Rh[0] + 18)} ${R(Rh[1] - 104)} Q${R(Rh[0] + 28)} ${R(Rh[1] - 44)} ${R(Rh[0] + 8)} ${R(Rh[1] + 4)} Z`) +
      `<path d="M${R(Rh[0] + 14)} ${R(Rh[1] - 92)} Q${R(Rh[0] + 30)} ${R(Rh[1] - 52)} ${R(Rh[0] + 12)} ${R(Rh[1] - 20)}" fill="none" stroke="${W.hi}" stroke-width="1.4" opacity="0.6"/>`;
  }
  if (what === 'staff') {
    return k.wood(rectD(Rh[0] - 4, Rh[1] - 120, Rh[0] + 5, floorY - 4, 3)) + k.wood(ellD(Rh[0] + 0.5, Rh[1] - 124, 8, 7));
  }
  if (what === 'trophy_head') {
    const hx = Rh[0] + 4, hy = Rh[1] - 20;
    return k.wood(ellD(hx, hy, 13, 16)) + k.groove(`M${R(hx - 7)} ${R(hy - 2)} L${R(hx - 2)} ${R(hy - 2)} M${R(hx + 2)} ${R(hy - 2)} L${R(hx + 7)} ${R(hy - 2)}`, 1.6) +
      k.groove(`M${R(hx - 4)} ${R(hy + 8)} L${R(hx + 4)} ${R(hy + 8)}`, 1.4);
  }
  return '';
}

// ---------- the four carving forms (local coords: x around 300, base at y = 0, up is negative) ----------
function seated(k, p, rng) {
  let s = '';
  const hornsHeight = 110 + rng() * 40;
  s += k.wood(rectD(228, -24, 372, 0, 5), { carve: true });                               // base slab
  for (const x of [252, 332]) s += k.wood(rectD(x, -102, x + 16, -24, 3));                 // stool legs
  s += k.wood(rectD(244, -120, 356, -100, 6), { top: true, carve: true });                // stool seat
  for (const x of [272, 308]) s += k.wood(rectD(x, -104, x + 20, -30, 6));                // shins
  s += k.wood(ellD(282, -28, 16, 8)) + k.wood(ellD(318, -28, 16, 8));                       // feet
  s += k.wood(rectD(262, -128, 338, -102, 10));                                            // thighs
  const torso = 'M258 -124 L252 -204 Q254 -238 300 -242 Q346 -238 348 -204 L342 -124 Z';
  s += k.wood(torso);
  s += k.groove('M286 -206 Q300 -198 314 -206', 1.6) + k.groove('M300 -172 L300 -160', 1.6);
  // arms (bent, hands forward at chest height)
  s += k.wood('M250 -234 L272 -226 L264 -166 L238 -172 Z') + k.wood('M350 -234 L328 -226 L336 -166 L362 -172 Z');
  const L = [248, -160], Rh = [352, -160];
  s += held(k, p.holds, L, Rh, 0);
  s += k.wood(ellD(L[0], L[1], 13, 12)) + k.wood(ellD(Rh[0], Rh[1], 13, 12));              // hands
  s += k.wood(rectD(286, -262, 314, -236, 4));                                             // neck
  const hx = 300, hy = -300, rx = 36, ry = 44;
  const hn = horns(k, p.horns, hx, hy - ry + 8, rx, hornsHeight, null, rng);
  return hn.back + s + head(k, hx, hy, rx, ry, p.face, p.brass) + hn.front;
}
function standing(k, p, rng) {
  let s = '';
  const hornsHeight = 110 + rng() * 40;
  s += k.wood(ellD(300, -8, 58, 10), { top: true, carve: true });                          // round base
  s += k.wood('M266 -134 L294 -134 L291 -60 L296 -14 L264 -14 L269 -60 Z') + k.wood('M306 -134 L334 -134 L331 -60 L336 -14 L304 -14 L309 -60 Z');
  s += k.wood(rectD(264, -156, 336, -128, 10));                                            // hips
  s += k.wood('M258 -150 L252 -226 Q254 -258 300 -262 Q346 -258 348 -226 L342 -150 Z');    // torso
  s += k.groove('M286 -228 Q300 -220 314 -228', 1.6) + k.groove('M300 -196 L300 -184', 1.6);
  s += k.wood('M250 -254 L272 -246 L262 -182 L236 -188 Z') + k.wood('M350 -254 L328 -246 L338 -182 L364 -188 Z');
  const L = [246, -176], Rh = [354, -176];
  s += held(k, p.holds, L, Rh, -10);
  s += k.wood(ellD(L[0], L[1], 13, 12)) + k.wood(ellD(Rh[0], Rh[1], 13, 12));
  s += k.wood(rectD(286, -284, 314, -258, 4));
  const hx = 300, hy = -322, rx = 36, ry = 44;
  const hn = horns(k, p.horns, hx, hy - ry + 8, rx, hornsHeight, null, rng);
  return hn.back + s + head(k, hx, hy, rx, ry, p.face, p.brass) + hn.front;
}
function column(k, p, rng) {
  // a stack of flared, stepped tiers (like the slim abstract Ikenga), small head on top, tall horns
  let s = '';
  s += k.wood(rectD(274, -26, 326, 0, 4));                                                  // foot
  let y = -26;
  const n = 4 + Math.floor(rng() * 3);
  for (let i = 0; i < n; i++) {
    const h = 30 + rng() * 12, wb = 30 + rng() * 26 - i * 2, wt = wb * (0.6 + rng() * 0.3);
    s += k.wood(`M${R(300 - wt)} ${R(y)} L${R(300 - wb)} ${R(y - h * 0.35)} L${R(300 - wt * 0.9)} ${R(y - h)} L${R(300 + wt * 0.9)} ${R(y - h)} L${R(300 + wb)} ${R(y - h * 0.35)} L${R(300 + wt)} ${R(y)} Z`, { carve: true });
    y -= h;
  }
  s += k.wood(rectD(290, y - 22, 310, y + 2, 4));                                          // neck
  const rx = 28, ry = 35, hy = y - 22 - ry + 4;
  const hn = horns(k, p.horns, 300, hy - ry + 6, rx, 150 + rng() * 40, null, rng);
  return hn.back + s + head(k, 300, hy, rx, ry, p.face, p.brass) + hn.front;
}
function drum(k, p, rng) {
  // a carved drum with a disc on top; tall horns rise from the disc behind a small figure
  let s = '';
  s += k.wood('M232 0 L228 -104 L372 -104 L368 0 Z', { carve: true });
  for (const x of [252, 276, 300, 324, 348]) s += k.groove(`M${x} -100 L${x + (x - 300) * 0.02} -4`, 1.3);
  s += k.wood(ellD(300, -106, 84, 14), { top: true });
  // tall blades / crown rise from the disc behind the figure; other horns grow from the head
  const fromDisc = p.horns === 'twin_blades' || p.horns === 'crown';
  const hn = horns(k, p.horns, 300, -264, fromDisc ? 44 : 28, fromDisc ? 220 : 120, fromDisc ? -112 : null, rng);
  let fig = k.wood(rectD(282, -206, 318, -110, 6));                                         // ribbed figure column
  for (let yy = -196; yy < -116; yy += 9) fig += k.groove(`M284 ${yy} L316 ${yy}`, 1.3);
  const head2 = head(k, 300, -238, 28, 34, p.face, p.brass);
  return s + hn.back + fig + head2 + hn.front;
}
const FORMS = { seated, standing, column, drum };

// rough bounding box of a list of path strings (M/L/Q/C/T/A/Z with absolute coords)
function pathsBBox(list) {
  const b = [Infinity, Infinity, -Infinity, -Infinity];
  const add = (x, y) => { b[0] = Math.min(b[0], x); b[1] = Math.min(b[1], y); b[2] = Math.max(b[2], x); b[3] = Math.max(b[3], y); };
  for (const d of list) {
    const t = d.match(/[MLQCTAZ]|-?\d*\.?\d+/g) || []; let c = '', i = 0;
    while (i < t.length) {
      if (/[A-Z]/.test(t[i])) { c = t[i++]; if (c === 'Z') continue; }
      if (c === 'A') { const rx = +t[i], ry = +t[i + 1], x = +t[i + 5], y = +t[i + 6]; add(x - rx, y - ry); add(x + rx, y + ry); i += 7; }
      else { add(+t[i], +t[i + 1]); i += 2; }
    }
  }
  return b;
}

// ---------- render ----------
function renderFromTraits(picks, index, seed, opts) {
  const uid = (seed ?? 0) + '_' + index;
  const rng = mulberry32(((seed ?? 0) * 100003 + index) ^ 0x2f6b1c3d); // art-detail stream
  const bg = BACKDROP[picks.background.id] || BACKDROP.gallery_white;
  const lighting = picks.lighting.id;
  const k = makeKit(uid, picks.wood.id, lighting, rng);
  k.setCarving(picks.carving.id);
  const p = { horns: picks.horns.id, face: picks.face.id, holds: picks.holds.id, brass: !!(opts && opts.isOneOfOne) };
  const floorY = 520;
  const displayId = picks.display.id;
  const baseY = displayId === 'metal_stand' ? floorY - 12 : displayId === 'wood_block' ? floorY - 34 : floorY;
  const body = FORMS[picks.form.id](k, p, rng);
  // scale the carving to fill the frame: as large as fits between the top margin and its base
  const bb = pathsBBox(k.sil);
  const sc = Math.min(1.5, (baseY - 44) / Math.max(1, -bb[1]), 380 / Math.max(1, bb[2] - bb[0]));
  const fit = `translate(300 ${baseY}) scale(${sc.toFixed(3)}) translate(-300 0)`;

  let s = `<svg id="piece${uid}" viewBox="0 0 600 600" width="600" height="600" xmlns="http://www.w3.org/2000/svg"><defs>`;
  s += `<linearGradient id="bgw${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${bg.top}"/><stop offset="1" stop-color="${bg.bot}"/></linearGradient>`;
  s += `<filter id="bl${uid}" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9"/></filter>`;
  s += k.defs();
  s += `<clipPath id="ob${uid}">${k.sil.map((d) => `<path d="${d}"/>`).join('')}</clipPath>`;
  s += '</defs>';
  // gallery backdrop + floor
  s += `<rect width="600" height="600" fill="url(#bgw${uid})"/>`;
  if (lighting === 'spotlight') s += `<radialGradient id="sp${uid}" cx="0.5" cy="0.42" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="${bg.dark ? 0.22 : 0.55}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient><rect width="600" height="600" fill="url(#sp${uid})"/>`;
  s += `<rect y="${floorY}" width="600" height="${600 - floorY}" fill="${bg.floor}"/><path d="M0 ${floorY} L600 ${floorY}" stroke="${shadeColor(bg.floor, -18)}" stroke-width="1.5"/>`;
  // contact shadow on the floor + soft cast shadow on the wall behind
  s += `<ellipse cx="312" cy="${floorY + 6}" rx="150" ry="12" fill="#000" opacity="${bg.dark ? 0.5 : 0.22}"/>`;
  s += `<g transform="translate(${lighting === 'raking' ? 30 : 16} 8) ${fit}" filter="url(#bl${uid})" opacity="${bg.dark ? 0.45 : 0.22}">${k.sil.map((d) => `<path d="${d}" fill="#000"/>`).join('')}</g>`;
  // display
  if (displayId === 'metal_stand') s += `<rect x="212" y="${floorY - 12}" width="176" height="12" fill="${bg.dark ? '#3a3a3e' : '#2a2a2c'}"/><rect x="212" y="${floorY - 12}" width="176" height="2" fill="#6a6a70"/>`;
  else if (displayId === 'wood_block') s += `<rect x="218" y="${floorY - 34}" width="164" height="34" fill="#3b2a1d"/><rect x="218" y="${floorY - 34}" width="164" height="3" fill="#6a4c34"/><rect x="218" y="${floorY - 34}" width="10" height="34" fill="#2b1e14"/>`;
  // the carving
  s += `<g transform="${fit}">${body}`;
  // condition, clipped to the carving
  const cond = picks.condition.id;
  let over = '';
  if (cond === 'weathered') {
    over += `<filter id="wn${uid}"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${(index % 97) + 1}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 0.97  0 0 0 0 0.92  0 0 0 -2.2 1.2"/></filter>`;
    // a soft dry bloom on the surface (strong noise read as static on dark woods)
    over += `<rect x="150" y="-460" width="300" height="470" filter="url(#wn${uid})" opacity="${/ebony|dark_smoked/.test(picks.wood.id) ? 0.12 : 0.22}"/>`;
    for (let i = 0; i < 10; i++) over += `<ellipse cx="${R(220 + rng() * 160)}" cy="${R(-420 + rng() * 420)}" rx="${R(10 + rng() * 26)}" ry="${R(6 + rng() * 16)}" fill="${k.W.hi}" opacity="${(0.12 + rng() * 0.12).toFixed(2)}"/>`;
  } else if (cond === 'cracked') {
    const n = 1 + (rng() < 0.5 ? 1 : 0);
    for (let c = 0; c < n; c++) {
      let x = 270 + rng() * 60, y = -420 + rng() * 120, d = `M${R(x)} ${R(y)}`;
      while (y < -10) { y += 18 + rng() * 26; x += (rng() - 0.5) * 16; d += ` L${R(x)} ${R(y)}`; }
      over += `<path d="${d}" fill="none" stroke="${k.W.groove}" stroke-width="2.4" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${k.W.hi}" stroke-width="0.9" opacity="0.6" transform="translate(1.4 0)"/>`;
    }
  } else if (cond === 'chipped') {
    for (let i = 0; i < 9; i++) {
      const x = 220 + rng() * 160, y = -400 + rng() * 400, r = 4 + rng() * 7;
      over += `<path d="M${R(x)} ${R(y - r)} L${R(x + r)} ${R(y - r * 0.2)} L${R(x + r * 0.4)} ${R(y + r)} L${R(x - r)} ${R(y + r * 0.3)} Z" fill="${k.W.hi}" opacity="0.75"/>`;
    }
  } else {
    over += `<rect x="150" y="-460" width="300" height="470" fill="url(#gl${uid})"/>`;
    s += `<linearGradient id="gl${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.42" stop-color="#fff" stop-opacity="0.12"/><stop offset="0.52" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  }
  if (lighting === 'raking') {
    s += `<linearGradient id="rk${uid}" x1="0" y1="0" x2="1" y2="0"><stop offset="0.45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.38"/></linearGradient>`;
    over += `<rect x="150" y="-460" width="300" height="470" fill="url(#rk${uid})"/>`;
  } else if (lighting === 'spotlight') {
    s += `<linearGradient id="tp${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.2"/></linearGradient>`;
    over += `<rect x="150" y="-460" width="300" height="470" fill="url(#tp${uid})"/>`;
  }
  s += `<g clip-path="url(#ob${uid})">${over}</g></g>`;
  if (opts && opts.isOneOfOne) s += `<rect x="8" y="8" width="584" height="584" fill="none" stroke="#c9a24a" stroke-width="3" opacity="0.85"/>`;
  return s + '</svg>';
}

function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  const locks = (opts && opts.locks) || {};
  const pick = (cat) => {
    const sel = locks[cat];
    if (sel && sel.length) { const sub = TRAITS[cat].filter((p) => sel.includes(p.id)); if (sub.length) return sub.length === 1 ? sub[0] : weightedPick(rng, sub.map((o) => (o.weight ? o : Object.assign({}, o, { weight: 1 })))); }
    // 1/1s lean rare: rare woods, horns, faces and lighting come up far more often
    return pickByRarity(rng, TRAITS[cat], isOneOfOne && rng() < 0.6 ? 'rare' : t);
  };
  const picks = {};
  for (const cat of Object.keys(TRAITS)) picks[cat] = pick(cat);
  // column and drum carvings have no arms, so they hold nothing; figures always get a real hold
  const armless = picks.form.id === 'column' || picks.form.id === 'drum';
  if (armless) picks.holds = TRAITS.holds.find((h) => h.id === 'none');
  else if (picks.holds.id === 'none') picks.holds = TRAITS.holds[0];
  // dark woods on dark backdrops lose their silhouette: move them to a light gallery wall (unless locked)
  if (/ebony|dark_smoked/.test(picks.wood.id) && BACKDROP[picks.background.id].dark && !(locks.background && locks.background.length)) picks.background = TRAITS.background.find((b) => b.id === 'stone');
  const svg = opts && opts.render === false ? null : renderFromTraits(picks, index, seed, { isOneOfOne });
  const traits = {}, rarity = {};
  for (const cat of Object.keys(TRAITS)) { traits[cat] = picks[cat].id; rarity[cat] = picks[cat].rarity; }
  return { index, svg, tier: t, isOneOfOne, traits, rarity, picks, renderIndex: index, seed };
}
function renderPiece(p) { return renderFromTraits(p.picks, p.renderIndex, p.seed, { isOneOfOne: p.isOneOfOne }); }
function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

const api = { characterName, TRAITS, TIER_FALLBACK, CHAIN_THEMES, WOOD, BACKDROP,
  mulberry32, weightedPick, pickByRarity, shadeColor, renderFromTraits, renderPiece, generatePiece, generateBatch };
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.IkengaGen = api;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
