// ============================================================
// Drowned Dockworkers — Generative Trait Engine v1
// Old dockworkers in barnacled diving helmets, carrying creature lanterns
// through sunken places. Bold ink outlines, gradient fills, seeded grime.
// Usage:
//   Node:    const G = require('./generator.js'); G.generatePiece(1, 7)
//   Browser: inlined into index.html by build.js -> window.DrownedGen
// ============================================================

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function weightedPick(rng, pool) {
  const total = pool.reduce((s, p) => s + p.weight, 0);
  let r = rng() * total;
  for (const p of pool) { if (r < p.weight) return p; r -= p.weight; }
  return pool[pool.length - 1];
}

// ---------- trait pools ----------
// oneOfOneOnly values never appear on regular pieces; 1/1s reach them through
// ONE_OF_ONE_WEIGHTS below (or an explicit lock).
const TRAITS = {
  water: [
    { id: 'shallows',  weight: 34, rarity: 'common',   hex: '#1a7890' },
    { id: 'deep_blue', weight: 28, rarity: 'common',   hex: '#12457a' },
    { id: 'emerald',   weight: 20, rarity: 'uncommon', hex: '#16806a' },
    { id: 'twilight',  weight: 12, rarity: 'uncommon', hex: '#4a3f8a' },
    { id: 'abyss',     weight: 6,  rarity: 'rare',     hex: '#0a1a26' }
  ],
  location: [
    { id: 'sunken_city', weight: 34, rarity: 'common' },
    { id: 'sub_dock',    weight: 30, rarity: 'common' },
    { id: 'shipwreck',   weight: 24, rarity: 'uncommon' },
    { id: 'trench',      weight: 12, rarity: 'rare' }
  ],
  helmet: [
    { id: 'brass',     weight: 38, rarity: 'common',   hex: '#e0a94a' },
    { id: 'copper',    weight: 30, rarity: 'common',   hex: '#d77a4a' },
    { id: 'steel',     weight: 18, rarity: 'uncommon', hex: '#aab6be' },
    { id: 'verdigris', weight: 10, rarity: 'rare',     hex: '#5fc0a4' },
    { id: 'gold',      weight: 4,  rarity: 'rare',     hex: '#ffd24a' }
  ],
  crust: [
    { id: 'barnacles', weight: 34, rarity: 'common' },
    { id: 'tarnish',   weight: 28, rarity: 'common' },
    { id: 'kelp',      weight: 22, rarity: 'uncommon' },
    { id: 'polished',  weight: 10, rarity: 'uncommon' },
    { id: 'coral',     weight: 6,  rarity: 'rare' }
  ],
  face: [
    { id: 'old_salt', weight: 40, rarity: 'common' },
    { id: 'deckhand', weight: 34, rarity: 'common' },
    { id: 'fishfolk', weight: 18, rarity: 'uncommon' },
    { id: 'skeleton', weight: 8,  rarity: 'rare' },
    { id: 'ghost',    weight: 0,  rarity: 'rare', oneOfOneOnly: true }
  ],
  skin: [
    { id: 'pale',  weight: 26, rarity: 'common', hex: '#f2d2b0' },
    { id: 'tan',   weight: 28, rarity: 'common', hex: '#d9a070' },
    { id: 'brown', weight: 26, rarity: 'common', hex: '#a86a42' },
    { id: 'deep',  weight: 20, rarity: 'uncommon', hex: '#6e4128' }
  ],
  headwear: [
    { id: 'knit_cap',    weight: 36, rarity: 'common' },
    { id: 'captain_hat', weight: 20, rarity: 'uncommon' },
    { id: 'souwester',   weight: 18, rarity: 'uncommon' },
    { id: 'bandana',     weight: 14, rarity: 'uncommon' },
    { id: 'none',        weight: 12, rarity: 'common' }
  ],
  hatColor: [
    { id: 'red',     weight: 34, rarity: 'common',   hex: '#d8443a' },
    { id: 'navy',    weight: 28, rarity: 'common',   hex: '#2c3e78' },
    { id: 'mustard', weight: 22, rarity: 'uncommon', hex: '#e2b030' },
    { id: 'forest',  weight: 16, rarity: 'uncommon', hex: '#2f7a4a' }
  ],
  facialHair: [
    { id: 'walrus',  weight: 30, rarity: 'common' },
    { id: 'beard',   weight: 24, rarity: 'common' },
    { id: 'stubble', weight: 20, rarity: 'common' },
    { id: 'none',    weight: 18, rarity: 'uncommon' },
    { id: 'braids',  weight: 8,  rarity: 'rare' }
  ],
  eyeColor: [
    { id: 'blue',   weight: 30, rarity: 'common',   hex: '#1f7aa8' },
    { id: 'green',  weight: 24, rarity: 'common',   hex: '#2f9a5a' },
    { id: 'amber',  weight: 22, rarity: 'uncommon', hex: '#c8861a' },
    { id: 'grey',   weight: 16, rarity: 'uncommon', hex: '#6a7a86' },
    { id: 'violet', weight: 8,  rarity: 'rare',     hex: '#7a4ad0' }
  ],
  hitchhiker: [
    { id: 'none',        weight: 34, rarity: 'common' },
    { id: 'crab',        weight: 24, rarity: 'common' },
    { id: 'hermit_crab', weight: 18, rarity: 'uncommon' },
    { id: 'octopus',     weight: 14, rarity: 'uncommon' },
    { id: 'seahorse',    weight: 10, rarity: 'rare' }
  ],
  lantern: [
    { id: 'jellyfish',  weight: 36, rarity: 'common',   hex: '#ff9ae6' },
    { id: 'anglerfish', weight: 28, rarity: 'uncommon', hex: '#5ad0ff' },
    { id: 'glow_coral', weight: 26, rarity: 'uncommon', hex: '#ff9a4a' },
    { id: 'pearl',      weight: 10, rarity: 'rare',     hex: '#fff2c8' }
  ]
};
const CATEGORY_ORDER = ['water', 'location', 'helmet', 'crust', 'face', 'skin', 'headwear', 'hatColor', 'facialHair', 'eyeColor', 'hitchhiker', 'lantern'];

// ---------- rarity tiers ----------
const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  for (const t of TIER_FALLBACK[tier] || TIER_FALLBACK.common) {
    const sub = pool.filter(p => p.rarity === t);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}

// ---------- 1/1 weighting ----------
// Curated per-category weights for 1/1s: they lean toward the rare looks and
// are the only way to reach 1/1-only values (the empty 'ghost' helmet).
const ONE_OF_ONE_WEIGHTS = {
  water:      { abyss: 30, twilight: 26, emerald: 18, deep_blue: 14, shallows: 12 },
  location:   { trench: 32, shipwreck: 30, sunken_city: 22, sub_dock: 16 },
  helmet:     { gold: 30, verdigris: 26, steel: 18, copper: 14, brass: 12 },
  crust:      { coral: 30, kelp: 22, barnacles: 20, tarnish: 16, polished: 12 },
  face:       { ghost: 22, skeleton: 24, fishfolk: 22, old_salt: 18, deckhand: 14 },
  facialHair: { braids: 28, walrus: 22, beard: 22, stubble: 14, none: 14 },
  eyeColor:   { violet: 30, amber: 22, green: 18, blue: 16, grey: 14 },
  hitchhiker: { seahorse: 26, octopus: 26, hermit_crab: 20, crab: 18, none: 10 },
  lantern:    { pearl: 34, anglerfish: 24, glow_coral: 22, jellyfish: 20 }
};
function pickOneOfOne(rng, cat) {
  const w = ONE_OF_ONE_WEIGHTS[cat];
  const pool = TRAITS[cat].map(t => ({ ...t, weight: w ? (w[t.id] || 0) : 1 })).filter(t => t.weight > 0);
  const id = weightedPick(rng, pool).id;
  return TRAITS[cat].find(t => t.id === id);
}

// Pick a full trait set. locks: { category: [ids] } (an explicit lock always
// wins, including over 1/1-only rules). Regular pieces never get 1/1-only values.
function pickPiece(rng, tier, locks, isOneOfOne) {
  const picks = {};
  for (const cat of CATEGORY_ORDER) {
    const locked = locks && locks[cat] && locks[cat].length ? TRAITS[cat].filter(t => locks[cat].includes(t.id)) : null;
    if (locked && locked.length) picks[cat] = weightedPick(rng, locked.map(t => ({ ...t, weight: t.weight || 1 })));
    else if (isOneOfOne) picks[cat] = pickOneOfOne(rng, cat);
    else picks[cat] = pickByRarity(rng, TRAITS[cat].filter(t => !t.oneOfOneOnly), tier);
  }
  // an empty ghost helmet or a skull has no hat hair or whiskers to show
  const isLocked = (cat) => locks && locks[cat] && locks[cat].length;
  if (picks.face.id === 'ghost') {
    if (!isLocked('facialHair')) picks.facialHair = TRAITS.facialHair.find(t => t.id === 'none');
    if (!isLocked('headwear')) picks.headwear = TRAITS.headwear.find(t => t.id === 'none');
  } else if (picks.face.id === 'skeleton' && !isLocked('facialHair')) {
    picks.facialHair = TRAITS.facialHair.find(t => t.id === 'none');
  }
  return picks;
}

// ---------- palettes ----------
const WATER = {
  shallows:  { stops: ['#4cc3cf', '#1a7890', '#0b3f58', '#062638'], city: '#0e4a60', edge: '#2a7f93', win: '#7fe8e0', ray: 0.1, snow: '#e8fcff' },
  deep_blue: { stops: ['#3a8fd0', '#12457a', '#0a2a50', '#04142a'], city: '#0c3358', edge: '#2a5f93', win: '#8fd0ff', ray: 0.08, snow: '#dff2ff' },
  emerald:   { stops: ['#5fdab0', '#16806a', '#0b4a44', '#042a28'], city: '#0d4a44', edge: '#2a8f7a', win: '#9ff0c8', ray: 0.1, snow: '#e8fff4' },
  twilight:  { stops: ['#9a8fe0', '#4a3f8a', '#261f5a', '#110c30'], city: '#2a2360', edge: '#5a4f9a', win: '#c8a8ff', ray: 0.07, snow: '#efe8ff' },
  abyss:     { stops: ['#1f4a5a', '#0a1a26', '#050d14', '#020508'], city: '#0a1a24', edge: '#1a3a4a', win: '#5ad0ff', ray: 0.03, snow: '#9fe8ff' }
};
const METAL = {
  brass:     ['#ffe7a3', '#e0a94a', '#a8641f', '#5e3510'],
  copper:    ['#ffd0b0', '#e08a5a', '#a4502a', '#5a2410'],
  steel:     ['#ffffff', '#c4cdd4', '#7a8792', '#3a444c'],
  verdigris: ['#d8fff0', '#7fd0b4', '#3a8a70', '#164a3a'],
  gold:      ['#fffbe0', '#ffd24a', '#d89a10', '#7a4a00']
};

// ---------- renderer ----------
const INK = '#0a1418';
const f = (n) => Math.round(n * 10) / 10;
const polar = (cx, cy, r, a) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];

function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  const rng = mulberry32(((seed | 0) * 7919 + index * 104729 + 17) >>> 0);
  const R = (a, b) => a + rng() * (b - a);
  const pre = `d${String(seed ?? 0).replace(/\W/g, '')}_${index}_`;
  let defs = '', gid = 0;
  const stopsXml = (stops) => stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const radial = (stops, cx = '50%', cy = '50%', r = '60%') => { const id = pre + (gid++); defs += `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stopsXml(stops)}</radialGradient>`; return `url(#${id})`; };
  const linear = (stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => { const id = pre + (gid++); defs += `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml(stops)}</linearGradient>`; return `url(#${id})`; };
  // outline attrs: an explicit stroke="..." in `extra` replaces the default
  // ink colour (duplicate attributes make the SVG invalid as a standalone file)
  const stroke = (sw, extra) => sw ? (/\bstroke="/.test(extra) ? '' : ` stroke="${INK}"`) + ` stroke-width="${sw}"` : (/\bstroke="/.test(extra) ? '' : ' stroke="none"');
  const P = (d, fill, sw = 6, extra = '') => `<path d="${d}" fill="${fill}"${stroke(sw, extra)} stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const C = (cx, cy, r, fill, sw = 6, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${stroke(sw, extra)} ${extra}/>`;
  const E = (cx, cy, rx, ry, fill, sw = 6, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${stroke(sw, extra)} ${extra}/>`;
  const L = (d, color = INK, w = 4, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;

  const W = WATER[picks.water.id] || WATER.shallows;
  const M = METAL[picks.helmet.id] || METAL.brass;
  const metal = (cx = '35%', cy = '28%') => radial([[0, M[0]], [0.3, M[1]], [0.75, M[2]], [1, M[3]]], cx, cy, '75%');
  const VERDI = '#4fb3a0';
  const glowHex = picks.lantern.hex;

  const bubble = (x, y, r) => C(x, y, r, radial([[0, '#bff4ff', 0.05], [0.8, '#bff4ff', 0.18], [1, '#e8fcff', 0.6]]), 2.5, 'stroke="#d8f8ff"') +
    E(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, '#ffffff', 0, `opacity="0.9" transform="rotate(-35 ${f(x - r * 0.35)} ${f(y - r * 0.4)})"`);
  const barnacle = (x, y, r) => E(x, y, r, r * 0.72, radial([[0, '#fbf6e6'], [0.7, '#cfc4a4'], [1, '#8a7e62']], '40%', '30%'), 3) +
    E(x, y - r * 0.18, r * 0.42, r * 0.24, '#2b2a24', 2) +
    L(`M${f(x - r * 0.8)} ${f(y + r * 0.1)} Q${f(x - r * 0.5)} ${f(y - r * 0.3)} ${f(x - r * 0.3)} ${f(y - r * 0.35)} M${f(x + r * 0.8)} ${f(y + r * 0.1)} Q${f(x + r * 0.5)} ${f(y - r * 0.3)} ${f(x + r * 0.3)} ${f(y - r * 0.35)}`, '#8a7e62', 1.5, 0.8);
  const barnacles = (cx, cy, spread, n) => { const pts = []; for (let i = 0; i < n; i++) pts.push([cx + R(-spread, spread), cy + R(-spread * 0.6, spread * 0.6), R(9, 17)]); pts.sort((a, b) => a[1] - b[1]); return pts.map(([x, y, r]) => barnacle(x, y, r)).join(''); };
  const verdigris = (cx, cy, r, n = 8) => { let s = ''; for (let i = 0; i < n; i++) s += C(cx + R(-r, r), cy + R(-r * 0.6, r * 0.6), R(r * 0.15, r * 0.4), VERDI, 0, `opacity="${f(R(0.35, 0.7))}"`); return s; };
  const kelp = (x0, y0, h, sway, w) => {
    const segs = 8, pts = [];
    for (let i = 0; i <= segs; i++) { const t = i / segs; pts.push([x0 + Math.sin(t * 5 + sway) * 28 * t, y0 - h * t]); }
    let left = '', right = '';
    pts.forEach(([x, y], i) => { const ww = w * (1 - i / segs * 0.7); left += ` L${f(x - ww)} ${f(y)}`; right = ` L${f(x + ww)} ${f(y)}` + right; });
    let s = P(`M${f(pts[0][0] - w)} ${y0}` + left + right + ' Z', linear([[0, '#1f6b52'], [1, '#2f8f6a']], 0, 0, 1, 0), 4);
    s += L('M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(' L'), '#63c08e', 2, 0.7);
    for (let i = 2; i < segs; i += 2) { const [x, y] = pts[i]; s += P(`M${f(x)} ${f(y)} Q${f(x + 34)} ${f(y - 10)} ${f(x + 46)} ${f(y - 34)} Q${f(x + 20)} ${f(y - 20)} ${f(x)} ${f(y)} Z`, '#2a8060', 3); }
    return s;
  };

  let out = '';

  // ---------- water ----------
  out += `<rect width="1000" height="1000" fill="${linear([[0, W.stops[0]], [0.35, W.stops[1]], [0.75, W.stops[2]], [1, W.stops[3]]])}"/>`;
  for (const [x, w, k] of [[140, 90, 1], [330, 60, 0.8], [520, 120, 1.1], [720, 70, 0.8], [880, 100, 0.9]]) out += `<path d="M${x - w / 2} 0 L${x + w / 2} 0 L${x + w * 1.6} 1000 L${x - w * 0.4} 1000 Z" fill="#e8feff" opacity="${f(W.ray * k * 100) / 100}"/>`;
  if (picks.water.id !== 'abyss') for (let i = 0; i < 9; i++) out += L(`M${i * 120 - 40} ${f(R(18, 40))} q30 -10 60 0 t60 0`, '#d8fbff', 3, 0.4);

  // ---------- location ----------
  const loc = picks.location.id;
  if (loc === 'sunken_city') {
    const arches = (x, top, w) => {
      let s = P(`M${x} 1000 L${x} ${top} L${x + w} ${top} L${x + w} 1000 Z`, W.city, 4, 'stroke="#061a24"');
      s += L(`M${x + 4} ${top + 6} L${x + 4} 1000`, W.edge, 3, 0.6);
      for (let y = top + 30; y < 900; y += 70) for (let wx = x + 16; wx + 22 < x + w - 8; wx += 40) {
        const lit = rng() < 0.35;
        s += P(`M${wx} ${y + 40} L${wx} ${y + 12} A11 11 0 0 1 ${wx + 22} ${y + 12} L${wx + 22} ${y + 40} Z`, lit ? W.win : '#061a24', 3, `stroke="#061a24" opacity="${lit ? 0.75 : 1}"`);
      }
      return s;
    };
    out += `<g opacity="0.85">${arches(0, 420, 170)}${arches(830, 380, 170)}</g>`;
    out += `<g transform="rotate(-24 120 900)" opacity="0.8">${arches(60, 300, 110)}${C(115, 360, 40, '#d8e8d0', 5, 'stroke="#061a24"')}${L('M115 360 L115 332 M115 360 L136 368', '#061a24', 4)}</g>`;
    out += P('M300 640 Q380 520 460 640 Z', W.city, 0) + P('M560 620 Q650 500 740 620 Z', W.city, 0);
  } else if (loc === 'shipwreck') {
    // broken hull on the left, snapped mast with a torn sail on the right
    out += `<g opacity="0.9"><g transform="rotate(14 140 760)">`;
    out += P('M-60 560 C80 520 240 540 300 600 L270 900 L-60 900 Z', linear([[0, '#5a3a22'], [1, '#2a1a0e']], 0, 0, 1, 0), 6);
    for (let y = 580; y < 900; y += 34) out += L(`M-60 ${y} C80 ${y - 30} 200 ${y - 10} 290 ${y + 30}`, '#1a0f06', 3, 0.7);
    for (const [px, py] of [[40, 650], [140, 640], [230, 670]]) out += C(px, py, 20, '#1a2a2a', 6, 'stroke="#c8a060"') + C(px - 5, py - 5, 6, W.win, 0, 'opacity="0.6"');
    out += `</g></g>`;
    out += `<g opacity="0.85">` + L('M780 1000 L900 300', INK, 30) + L('M780 1000 L900 300', '#6a4a2a', 22) + L('M840 470 L990 500', INK, 20) + L('M840 470 L990 500', '#6a4a2a', 13) +
      P('M860 490 C900 540 960 520 990 600 C950 640 930 700 870 690 C900 620 870 560 860 490 Z', linear([[0, '#e8dcc0', 0.8], [1, '#b8a888', 0.6]]), 5) +
      L('M905 360 L1000 420', '#3a2a18', 3, 0.8) + `</g>`;
  } else if (loc === 'trench') {
    // jagged cliff walls, glowing vents and tube worms below
    const cliff = (side) => {
      let d = side < 0 ? 'M-10 0' : 'M1010 0';
      for (let y = 0; y <= 1000; y += 80) { const x = side < 0 ? R(120, 230) : R(770, 880); d += ` L${f(x)} ${y}`; }
      d += side < 0 ? ' L-10 1000 Z' : ' L1010 1000 Z';
      return P(d, linear([[0, W.city], [1, '#02080c']], side < 0 ? 0 : 1, 0, side < 0 ? 1 : 0, 0), 6) + L(d.replace(/ Z$/, ''), W.edge, 3, 0.5);
    };
    out += cliff(-1) + cliff(1);
    for (let i = 0; i < 40; i++) { const side = rng() < 0.5; out += C(side ? R(10, 150) : R(850, 990), R(80, 900), R(1.5, 4), W.win, 0, `opacity="${f(R(0.4, 0.9))}"`); }
    for (const vx of [90, 930]) out += C(vx, 880, 90, radial([[0, '#ff8a3a', 0.5], [1, '#ff8a3a', 0]]), 0) + P(`M${vx - 30} 930 L${vx - 12} 850 L${vx + 12} 850 L${vx + 30} 930 Z`, '#2a1a14', 5);
  } else { // sub_dock: pilings, crates and a hanging chain
    for (const [px, w] of [[60, 50], [170, 40], [840, 46], [950, 54]]) {
      out += P(`M${px - w / 2} 1000 L${px - w / 2} 60 L${px + w / 2} 60 L${px + w / 2} 1000 Z`, linear([[0, '#5a4a32'], [0.5, '#7a664a'], [1, '#3a2e1e']], 0, 0, 1, 0), 5);
      for (let y = 120; y < 1000; y += 90) out += L(`M${px - w / 2 + 4} ${y} l${w - 8} 6`, '#2a2014', 2.5, 0.6);
    }
    out += barnacles(60, 700, 18, 4) + barnacles(950, 620, 20, 4);
    for (const [cx, cy, s] of [[100, 860, 90], [880, 850, 100], [860, 760, 70]]) {
      out += `<rect x="${cx - s / 2}" y="${cy - s / 2}" width="${s}" height="${s}" fill="${linear([[0, '#a07a4a'], [1, '#5a4024']])}" stroke="${INK}" stroke-width="5"/>` +
        L(`M${cx - s / 2} ${cy - s / 2} L${cx + s / 2} ${cy + s / 2} M${cx + s / 2} ${cy - s / 2} L${cx - s / 2} ${cy + s / 2}`, '#3a2a14', 4, 0.8);
    }
    let chain = ''; for (let y = 0; y < 520; y += 22) chain += E(760 + Math.sin(y / 80) * 6, y, 7, 11, 'none', 4, 'stroke="#4a5458"');
    out += `<g opacity="0.8">${chain}</g>`;
  }

  // ---------- fish school ----------
  for (let i = 0; i < 12; i++) {
    const x = R(560, 960), y = R(90, 300), s = R(0.6, 1.2);
    out += `<g transform="translate(${f(x)} ${f(y)}) scale(${f(s)})" opacity="0.7"><path d="M-18 0 Q0 -10 14 0 Q0 10 -18 0 Z M-16 0 L-26 -7 L-26 7 Z" fill="${W.stops[3]}"/></g>`;
  }
  // kelp (not in the trench)
  if (loc !== 'trench') out += kelp(40, 1010, R(420, 560), R(0, 3), 14) + kelp(110, 1010, R(300, 420), R(0, 3), 12) + kelp(900, 1010, R(460, 580), R(0, 3), 15) + kelp(965, 1010, R(340, 460), R(0, 3), 12);

  // ---------- seabed ----------
  out += P('M0 900 C200 880 380 905 560 890 C760 875 880 900 1000 890 L1000 1000 L0 1000 Z', loc === 'trench' ? linear([[0, '#3a3a36'], [1, '#141412']]) : linear([[0, '#c9b58a'], [1, '#7a6a48']]), 5);
  for (let i = 0; i < 26; i++) { const x = R(0, 1000), y = R(905, 995); if (x > 180 && x < 820) continue; out += E(x, y, R(10, 26), R(7, 14), rng() < 0.5 ? '#4a5a58' : '#5d6b62', 4); }
  if (loc === 'trench') for (let i = 0; i < 9; i++) { const x = rng() < 0.5 ? R(20, 180) : R(820, 980); out += L(`M${f(x)} 1000 L${f(x + R(-6, 6))} ${f(R(860, 930))}`, '#f2f2ea', 7) + C(x, R(850, 870), 7, '#e2412e', 3); }

  // ---------- lantern glow ----------
  const LX = 820, LY = 770;
  out += C(LX, LY, 330, radial([[0, glowHex, 0.5], [0.4, glowHex, 0.18], [1, glowHex, 0]]), 0);

  // ---------- hose ----------
  out += L('M700 330 C860 300 960 420 1010 520', INK, 34) + L('M700 330 C860 300 960 420 1010 520', linear([[0, '#3d4a4a'], [1, '#1d2626']]), 24);
  for (let i = 0; i < 8; i++) { const t = i / 8; const x = 700 + 310 * t, y = 330 - Math.sin(t * Math.PI) * 40 + 190 * t * t; out += L(`M${f(x - 6)} ${f(y - 12)} l12 24`, '#5c6b6b', 3, 0.8); }

  // ---------- suit ----------
  out += P('M40 1010 C60 880 170 800 300 780 L700 780 C830 800 940 880 960 1010 Z', linear([[0, '#b6a47a'], [0.5, '#8d7b52'], [1, '#5a4c2e']], 0, 0, 1, 0), 8);
  for (const d of ['M150 900 Q190 880 220 910', 'M780 900 Q820 880 850 910', 'M240 820 Q260 860 250 900']) out += L(d, '#4a3d22', 4, 0.7);
  out += E(760, 920, 200, 110, '#3a2e16', 0, 'opacity="0.3"');
  out += P('M620 900 L740 890 L748 980 L626 990 Z', '#7a6a44', 5);
  for (let i = 0; i < 9; i++) out += L(`M${632 + i * 13} ${f(896 - i * 1.2)} l0 10 M${634 + i * 13} ${f(978 - i * 1.2)} l0 10`, '#e8dcb8', 2.5, 0.9);
  out += `<text x="684" y="956" font-family="Georgia, serif" font-weight="700" font-size="34" fill="#2a2210" text-anchor="middle" opacity="0.8">N°${index}</text>`;
  out += P('M150 930 L230 918 L238 990 L156 1000 Z', '#9a8660', 5);
  for (let i = 0; i < 6; i++) out += L(`M${160 + i * 13} ${926 - i * 2} l0 10`, '#4a3d22', 2.5, 0.9);

  // ---------- breastplate + neck ring ----------
  const plate = 'M250 690 C300 660 700 660 750 690 L800 830 C700 870 300 870 200 830 Z';
  out += P(plate, metal('40%', '20%'), 8);
  for (let i = 0; i <= 12; i++) { const t = i / 12; out += C(215 + t * 570, 832 + Math.sin(t * Math.PI) * 26, 7, radial([[0, M[0]], [1, M[3]]], '35%', '35%'), 3); }
  const crust = picks.crust.id;
  if (crust !== 'polished') out += verdigris(300, 780, 50, crust === 'tarnish' ? 16 : 8) + verdigris(690, 790, 40, crust === 'tarnish' ? 12 : 6);
  if (crust === 'barnacles') out += barnacles(270, 790, 40, 7);
  const star = (cx, cy, r) => { let d = ''; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5; const [x, y] = polar(cx, cy, i % 2 ? r * 0.45 : r, a); d += (i ? ' L' : 'M') + `${f(x)} ${f(y)}`; } return P(d + ' Z', radial([[0, '#ffb070'], [1, '#e2572e']]), 5); };
  out += star(640, 760, 34);
  out += E(500, 690, 230, 44, metal('50%', '20%'), 8) + E(500, 684, 200, 30, M[3], 0, 'opacity="0.5"');

  // rope + cargo hook over the left shoulder
  const rope = 'M80 1010 C110 900 170 820 270 770';
  out += L(rope, INK, 34) + L(rope, '#c9a86a', 26);
  for (let i = 0; i < 16; i++) { const t = i / 16, x = 80 + 190 * t, y = 1010 - 240 * t + 36 * Math.sin(t * Math.PI); out += L(`M${f(x - 10)} ${f(y - 6)} l16 12`, '#7a5a2a', 3.5, 0.9); }
  out += L('M270 770 C290 800 286 830 270 850', INK, 16) + L('M270 770 C290 800 286 830 270 850', '#c9a86a', 10);
  out += P('M268 846 C236 848 226 890 250 910 C270 926 300 910 296 884 L282 886 C284 900 270 908 260 900 C246 890 250 866 270 862 Z', linear([[0, '#e1e4e8'], [0.5, '#9aa0a6'], [1, '#50565c']], 0, 0, 1, 0), 6);

  // ---------- helmet ----------
  const HX = 500, HY = 450, HR = 250;
  out += C(HX, HY, HR + 26, radial([[0.85, W.win, 0.3], [1, W.win, 0]]), 0);
  out += C(HX, HY, HR, metal('32%', '26%'), 10);
  for (const sx of [-1, 1]) {
    const px = HX + sx * 205, py = HY + 20;
    out += E(px, py, 44, 70, metal('50%', '30%'), 7) + E(px, py, 28, 50, linear([[0, '#0f3a4a'], [1, '#062028']]), 5) + E(px - sx * 6, py - 18, 7, 16, '#bff4ff', 0, 'opacity="0.7"');
  }
  out += `<rect x="${HX - 34}" y="${HY - HR - 20}" width="68" height="40" rx="8" fill="${metal('40%', '20%')}" stroke="${INK}" stroke-width="7"/>` + C(HX, HY - HR - 26, 18, metal('40%', '30%'), 6);
  // rising bubbles from the valve (animated when requested)
  let valveBubbles = '';
  for (const [bx, by, br] of [[HX + 10, 150, 16], [HX - 20, 105, 11], [HX + 26, 62, 20], [HX - 6, 18, 9], [HX + 60, 130, 7]]) valveBubbles += bubble(bx, by, br);
  out += animate ? `<g>${valveBubbles}<animateTransform attributeName="transform" type="translate" values="0 40;0 -30;0 40" dur="${f(R(3.5, 5.5))}s" repeatCount="indefinite"/></g>` : valveBubbles;
  const PX = HX, PY = HY + 25, PR = 150;
  out += C(PX, PY, PR + 42, metal('35%', '25%'), 9);
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const [bx, by] = polar(PX, PY, PR + 22, a); out += C(bx, by, 10, radial([[0, M[0]], [1, M[3]]], '35%', '35%'), 4); }

  // ---------- face inside the porthole ----------
  defs += `<clipPath id="${pre}port"><circle cx="${PX}" cy="${PY}" r="${PR}"/></clipPath>`;
  const faceId = picks.face.id;
  let face = C(PX, PY, PR, linear([[0, '#1e5a6a'], [1, '#0b2a36']]), 0);
  const eyeHex = picks.eyeColor.hex;
  const hairWhite = faceId === 'old_salt';
  const hairHex = hairWhite ? '#eeece6' : ['#3a2a1e', '#6a3a1a', '#b85a2a', '#1a1a1a'][Math.floor(R(0, 4))];
  if (faceId === 'ghost') {
    // empty helmet: dark water and two drifting lights where eyes would be
    face += C(PX, PY, PR, radial([[0, '#0a2a36'], [1, '#010a0e']]), 0);
    for (const ex of [PX - 45, PX + 45]) face += C(ex, PY + 10, 38, radial([[0, eyeHex, 0.7], [1, eyeHex, 0]]), 0) + C(ex, PY + 10, 12, '#ffffff', 0) + C(ex, PY + 10, 7, eyeHex, 0);
  } else {
    let skin, shade;
    if (faceId === 'fishfolk') { skin = radial([[0, '#9fe0c8'], [0.7, '#4fa88a'], [1, '#2a6a58']], '40%', '35%', '70%'); shade = '#1a4a3a'; }
    else if (faceId === 'skeleton') { skin = radial([[0, '#fbf6e6'], [0.7, '#ddd2b4'], [1, '#a89c80']], '40%', '35%', '70%'); shade = '#5a5040'; }
    else { const sk = picks.skin.hex; skin = radial([[0, sk], [0.7, sk], [1, '#5a3420']], '40%', '35%', '80%'); shade = '#3a2010'; }
    if (faceId === 'fishfolk') for (const sx of [-1, 1]) face += P(`M${PX + sx * 105} ${PY + 10} L${PX + sx * 150} ${PY - 30} L${PX + sx * 140} ${PY + 20} L${PX + sx * 150} ${PY + 60} Z`, '#3a9a7a', 5);
    face += E(PX, PY + 20, 118, 150, skin, 7);
    face += E(PX + 60, PY + 60, 70, 110, shade, 0, 'opacity="0.2"');
    if (faceId === 'fishfolk') for (let i = 0; i < 3; i++) face += L(`M${PX - 95 + i * 8} ${PY + 70 + i * 14} q-10 6 -2 14`, '#1a4a3a', 3, 0.8);
    // headwear
    const hat = picks.headwear.id, hc = picks.hatColor.hex;
    const hatG = linear([[0, hc], [1, '#20202a']]);
    face += '<g transform="translate(0 -22)">';
    if (hat === 'knit_cap') {
      face += P(`M${PX - 125} ${PY - 20} C${PX - 110} ${PY - 120} ${PX + 110} ${PY - 120} ${PX + 125} ${PY - 20} Z`, linear([[0, hc], [1, hc]]), 7);
      for (let x = PX - 110; x <= PX + 110; x += 16) face += L(`M${x} ${PY - 22} L${x + 2} ${PY - 80}`, '#000000', 3, 0.25);
      face += P(`M${PX - 130} ${PY - 32} L${PX + 130} ${PY - 32} L${PX + 128} ${PY - 6} L${PX - 128} ${PY - 6} Z`, hc, 6) + `<rect x="${PX - 130}" y="${PY - 32}" width="260" height="26" fill="#000" opacity="0.15"/>`;
    } else if (hat === 'captain_hat') {
      face += P(`M${PX - 120} ${PY - 30} C${PX - 130} ${PY - 110} ${PX + 130} ${PY - 110} ${PX + 120} ${PY - 30} Z`, '#f2f2ea', 7);
      face += P(`M${PX - 122} ${PY - 40} L${PX + 122} ${PY - 40} L${PX + 120} ${PY - 16} L${PX - 120} ${PY - 16} Z`, hc, 6);
      face += P(`M${PX - 110} ${PY - 16} Q${PX} ${PY + 12} ${PX + 110} ${PY - 16} Q${PX} ${PY - 2} ${PX - 110} ${PY - 16} Z`, '#1a1a1a', 5);
      face += C(PX, PY - 60, 14, '#ffd24a', 4) + L(`M${PX - 8} ${PY - 60} L${PX + 8} ${PY - 60} M${PX} ${PY - 68} L${PX} ${PY - 52}`, '#8a5a00', 3);
    } else if (hat === 'souwester') {
      face += P(`M${PX - 100} ${PY - 20} C${PX - 90} ${PY - 120} ${PX + 90} ${PY - 120} ${PX + 100} ${PY - 20} Z`, linear([[0, '#ffe066'], [1, '#d8a010']]), 7);
      face += P(`M${PX - 150} ${PY - 10} Q${PX} ${PY - 50} ${PX + 150} ${PY - 10} Q${PX + 150} ${PY + 20} ${PX + 120} ${PY + 30} Q${PX} ${PY - 14} ${PX - 120} ${PY + 30} Q${PX - 150} ${PY + 20} ${PX - 150} ${PY - 10} Z`, linear([[0, '#ffe066'], [1, '#c89010']]), 7);
    } else if (hat === 'bandana') {
      face += P(`M${PX - 122} ${PY - 20} C${PX - 110} ${PY - 110} ${PX + 110} ${PY - 110} ${PX + 122} ${PY - 20} Q${PX} ${PY - 40} ${PX - 122} ${PY - 20} Z`, hc, 7);
      for (let i = 0; i < 10; i++) face += C(PX + R(-90, 90), PY + R(-90, -40), 4, '#ffffff', 0, 'opacity="0.7"');
      face += P(`M${PX + 110} ${PY - 40} L${PX + 150} ${PY - 20} L${PX + 130} ${PY + 4} Z`, hc, 5);
    } else if (faceId !== 'skeleton') {
      // bare head: a few hair tufts
      for (let i = 0; i < 6; i++) face += L(`M${PX - 60 + i * 24} ${PY - 90} q${f(R(-10, 10))} -20 ${f(R(-4, 8))} -34`, hairHex, 7);
    }
    face += '</g><g transform="translate(0 -26)">';
    if (faceId === 'skeleton') {
      for (const ex of [PX - 50, PX + 50]) face += E(ex, PY + 45, 34, 38, '#1a1612', 5) + C(ex, PY + 45, 10, eyeHex, 0, 'opacity="0.9"');
      face += P(`M${PX - 14} ${PY + 100} L${PX} ${PY + 76} L${PX + 14} ${PY + 100} Z`, '#1a1612', 4);
      face += `<rect x="${PX - 60}" y="${PY + 126}" width="120" height="34" rx="6" fill="#f4eedc" stroke="${INK}" stroke-width="5"/>`;
      for (let x = PX - 45; x < PX + 60; x += 15) face += L(`M${x} ${PY + 126} L${x} ${PY + 160}`, INK, 3);
    } else {
      const browHex = faceId === 'fishfolk' ? '#1a4a3a' : (hairWhite ? '#e8e6e0' : hairHex);
      face += P(`M${PX - 88} ${PY + 12} Q${PX - 55} ${PY - 8} ${PX - 18} ${PY + 12} Q${PX - 50} ${PY + 4} ${PX - 88} ${PY + 12} Z`, browHex, 5);
      face += P(`M${PX + 18} ${PY + 12} Q${PX + 55} ${PY - 8} ${PX + 88} ${PY + 12} Q${PX + 50} ${PY + 4} ${PX + 18} ${PY + 12} Z`, browHex, 5);
      const big = faceId === 'fishfolk' ? 1.3 : 1;
      for (const [ex, er0] of [[PX - 50, 30], [PX + 52, 26]]) {
        const er = er0 * big;
        face += C(ex, PY + 45, er, radial([[0, '#ffffff'], [1, faceId === 'fishfolk' ? '#e8e070' : '#d8d2c4']]), 6);
        face += C(ex + 5, PY + 48, er * 0.55, radial([[0, '#ffffff'], [0.25, eyeHex], [1, '#0a2030']]), 3);
        face += C(ex + 5, PY + 48, er * 0.25, INK, 0) + C(ex - 2, PY + 40, er * 0.18, '#ffffff', 0) + C(ex + 12, PY + 54, er * 0.1, glowHex, 0);
      }
      const noseFill = faceId === 'fishfolk' ? '#3a8a70' : radial([[0, '#ffffff', 0.25], [1, '#000000', 0.15]], '40%', '40%');
      face += P(`M${PX} ${PY + 60} C${PX - 30} ${PY + 100} ${PX - 22} ${PY + 128} ${PX + 4} ${PY + 126} C${PX + 30} ${PY + 124} ${PX + 26} ${PY + 96} ${PX} ${PY + 60} Z`, faceId === 'fishfolk' ? noseFill : (picks.skin.hex), 6);
      face += P(`M${PX} ${PY + 60} C${PX - 30} ${PY + 100} ${PX - 22} ${PY + 128} ${PX + 4} ${PY + 126} C${PX + 30} ${PY + 124} ${PX + 26} ${PY + 96} ${PX} ${PY + 60} Z`, noseFill, 0);
      // facial hair
      const fh = picks.facialHair.id;
      const fhHex = faceId === 'fishfolk' ? '#2a6a58' : (hairWhite ? '#f4f2ec' : hairHex);
      const fhG = linear([[0, fhHex], [1, fhHex]]);
      if (fh === 'beard' || fh === 'braids') face += P(`M${PX - 110} ${PY + 90} C${PX - 110} ${PY + 190} ${PX + 110} ${PY + 190} ${PX + 110} ${PY + 90} C${PX + 70} ${PY + 140} ${PX - 70} ${PY + 140} ${PX - 110} ${PY + 90} Z`, fhG, 6);
      if (fh === 'braids') for (const bx of [PX - 30, PX + 30]) { face += L(`M${bx} ${PY + 160} L${bx} ${PY + 230}`, INK, 16) + L(`M${bx} ${PY + 160} L${bx} ${PY + 230}`, fhHex, 11); face += C(bx, PY + 190, 7, '#ffd24a', 3); }
      if (fh === 'stubble') for (let i = 0; i < 70; i++) { const a = R(0.15, Math.PI - 0.15), rr = R(80, 110); face += C(PX + Math.cos(a) * rr, PY + 90 + Math.sin(a) * rr * 0.6, 1.8, fhHex === '#f4f2ec' ? '#9a968e' : fhHex, 0, 'opacity="0.7"'); }
      if (fh === 'walrus' || fh === 'beard' || fh === 'braids') {
        face += P(`M${PX - 90} ${PY + 150} C${PX - 80} ${PY + 118} ${PX - 30} ${PY + 118} ${PX} ${PY + 132} C${PX + 30} ${PY + 118} ${PX + 80} ${PY + 118} ${PX + 90} ${PY + 150} C${PX + 60} ${PY + 176} ${PX + 20} ${PY + 160} ${PX} ${PY + 150} C${PX - 20} ${PY + 160} ${PX - 60} ${PY + 176} ${PX - 90} ${PY + 150} Z`, fhG, 6);
        for (let i = 0; i < 8; i++) face += L(`M${PX - 70 + i * 20} ${PY + 140} l${i < 4 ? -6 : 6} 18`, '#000000', 2, 0.25);
      } else {
        face += L(`M${PX - 30} ${PY + 150} Q${PX} ${PY + 164} ${PX + 30} ${PY + 148}`, INK, 5);
      }
    }
    face += '</g>';
  }
  out += `<g clip-path="url(#${pre}port)">${face}</g>`;
  out += C(PX, PY, PR, radial([[0, '#bff4ff', 0.04], [0.8, '#7fd8ff', 0.12], [1, '#bff4ff', 0.35]]), 7);
  out += `<path d="M${PX - 118} ${PY - 40} A${PR - 20} ${PR - 20} 0 0 1 ${PX + 10} ${PY - 128}" fill="none" stroke="#ffffff" stroke-width="16" stroke-linecap="round" opacity="0.55"/>`;
  out += `<path d="M${PX - 100} ${PY + 4} A${PR - 42} ${PR - 42} 0 0 1 ${PX - 60} ${PY - 74}" fill="none" stroke="#ffffff" stroke-width="7" stroke-linecap="round" opacity="0.4"/>`;
  for (const [bx, by, br] of [[PX + 112, PY + 92, 9], [PX + 122, PY + 62, 6], [PX + 108, PY + 34, 11]]) out += bubble(bx, by, br);

  // ---------- helmet crust ----------
  if (crust !== 'polished') out += verdigris(330, 330, 60, crust === 'tarnish' ? 18 : 8) + verdigris(650, 560, 50, crust === 'tarnish' ? 14 : 6) + verdigris(620, 250, 40, crust === 'tarnish' ? 12 : 5);
  else out += `<path d="M320 300 A200 200 0 0 1 460 230" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.45"/>`;
  if (crust === 'barnacles' || crust === 'tarnish') out += barnacles(330, 560, 50, crust === 'barnacles' ? 9 : 3);
  if (crust === 'barnacles') out += barnacles(655, 285, 30, 5);
  for (let i = 0; i < 16; i++) { const x = R(290, 720), y = R(220, 640); if (Math.hypot(x - PX, y - PY) < PR + 50) continue; out += L(`M${f(x)} ${f(y)} l${f(R(-24, 24))} ${f(R(-8, 8))}`, M[3], 2, 0.6); }
  if (crust === 'kelp' || crust === 'barnacles') {
    const strands = crust === 'kelp'
      ? [['M470 212 C400 214 330 250 306 330 C292 380 300 430 286 490', 12], ['M440 222 C380 236 344 290 338 360 C334 400 344 440 332 480', 9], ['M500 208 C450 226 400 262 376 320 C362 356 368 392 360 420', 8], ['M420 216 C360 226 316 270 296 318', 7], ['M560 210 C640 230 700 300 716 380', 9]]
      : [['M470 212 C400 214 330 250 306 330 C292 380 300 430 286 490', 10], ['M440 222 C380 236 344 290 338 360', 7]];
    for (const [d, w] of strands) out += L(d, INK, w + 6) + L(d, '#2f9a62', w) + L(d, '#8fe0a8', 2, 0.6);
  }
  if (crust === 'coral') {
    const branch = (x, y, h, col) => { let s = ''; const d = `M${x} ${y} L${x} ${y - h} M${x} ${y - h * 0.5} L${x - h * 0.4} ${y - h * 0.9} M${x} ${y - h * 0.3} L${x + h * 0.45} ${y - h * 0.75}`; s += L(d, INK, 16) + L(d, col, 10); for (const [cx, cy] of [[x, y - h], [x - h * 0.4, y - h * 0.9], [x + h * 0.45, y - h * 0.75]]) s += C(cx, cy, 8, col, 4); return s; };
    out += branch(320, 330, 90, '#ff6a8a') + branch(372, 272, 70, '#ffa24a') + branch(640, 270, 60, '#c86aff') + barnacles(330, 560, 40, 4);
  }

  // ---------- hitchhiker ----------
  const hh = picks.hitchhiker.id;
  if (hh === 'crab') {
    const cx = 640, cy = 225, red = radial([[0, '#ff9a6a'], [1, '#c63a1e']], '40%', '35%');
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) { const d = `M${cx + sx * 20} ${cy + 6 + k * 6} l${sx * 22} ${6 + k * 4} l${sx * 8} 16`; out += L(d, INK, 7) + L(d, '#e2502e', 3.5); }
    out += E(cx, cy + 8, 38, 24, red, 6);
    for (const sx of [-1, 1]) {
      out += P(`M${cx + sx * 30} ${cy} C${cx + sx * 50} ${cy - 20} ${cx + sx * 56} ${cy - 40} ${cx + sx * 50} ${cy - 52}`, 'none', 7);
      out += P(`M${cx + sx * 50} ${cy - 50} C${cx + sx * 76} ${cy - 66} ${cx + sx * 80} ${cy - 30} ${cx + sx * 60} ${cy - 34} L${cx + sx * 66} ${cy - 46} C${cx + sx * 56} ${cy - 44} ${cx + sx * 48} ${cy - 44} ${cx + sx * 50} ${cy - 50} Z`, red, 5);
      out += L(`M${cx + sx * 10} ${cy - 10} L${cx + sx * 12} ${cy - 30}`, INK, 4) + C(cx + sx * 12, cy - 34, 7, '#ffffff', 4) + C(cx + sx * 13, cy - 34, 3, INK, 0);
    }
    out += L(`M${cx - 10} ${cy + 16} Q${cx} ${cy + 22} ${cx + 10} ${cy + 16}`, INK, 3);
  } else if (hh === 'hermit_crab') {
    const cx = 630, cy = 230;
    out += P(`M${cx - 50} ${cy + 20} C${cx - 60} ${cy - 50} ${cx + 30} ${cy - 70} ${cx + 40} ${cy} C${cx + 40} ${cy + 30} ${cx - 20} ${cy + 40} ${cx - 50} ${cy + 20} Z`, radial([[0, '#fff0d8'], [1, '#d88a5a']], '40%', '35%'), 6);
    out += L(`M${cx - 10} ${cy + 10} C${cx - 30} ${cy - 10} ${cx - 10} ${cy - 40} ${cx + 12} ${cy - 30} C${cx + 30} ${cy - 20} ${cx + 16} ${cy} ${cx} ${cy - 4}`, '#a85a3a', 5);
    out += E(cx + 46, cy + 18, 20, 14, '#e2502e', 5) + C(cx + 50, cy - 4, 7, '#ffffff', 4) + C(cx + 51, cy - 4, 3, INK, 0) + L(`M${cx + 46} ${cy + 6} L${cx + 50} ${cy - 2}`, INK, 3);
    for (let k = 0; k < 3; k++) out += L(`M${cx + 40} ${cy + 26 + k * 3} l${-10 - k * 6} 16`, '#e2502e', 5);
  } else if (hh === 'octopus') {
    const cx = 560, cy = 210, pur = radial([[0, '#e8a8ff'], [0.7, '#9a4ad0'], [1, '#5a1a8a']], '40%', '35%');
    for (let k = 0; k < 6; k++) { const a = -0.3 + k * 0.33; const d = `M${cx + (k - 2.5) * 20} ${cy + 30} C${f(cx + (k - 2.5) * 50)} ${cy + 80} ${f(cx + (k - 2.5) * 70 + 20 * Math.cos(a))} ${cy + 110} ${f(cx + (k - 2.5) * 80)} ${cy + 140 + (k % 2) * 30}`; out += L(d, INK, 20) + L(d, '#9a4ad0', 13); for (let j = 1; j < 4; j++) out += C(cx + (k - 2.5) * (20 + j * 18), cy + 50 + j * 26, 3.5, '#f0d0ff', 0, 'opacity="0.9"'); }
    out += P(`M${cx - 70} ${cy + 36} C${cx - 80} ${cy - 70} ${cx + 80} ${cy - 70} ${cx + 70} ${cy + 36} Q${cx} ${cy + 56} ${cx - 70} ${cy + 36} Z`, pur, 7);
    for (const ex of [cx - 26, cx + 26]) out += C(ex, cy + 10, 13, '#fff6d0', 5) + `<rect x="${ex - 7}" y="${cy + 6}" width="14" height="7" rx="3" fill="${INK}"/>`;
    for (let i = 0; i < 5; i++) out += C(cx + R(-50, 50), cy + R(-40, -5), R(3, 6), '#c878f0', 0, 'opacity="0.8"');
  } else if (hh === 'seahorse') {
    const cx = 790, cy = 250;
    const body = `M${cx} ${cy - 60} C${cx + 40} ${cy - 70} ${cx + 44} ${cy - 30} ${cx + 20} ${cy - 20} C${cx + 44} ${cy} ${cx + 40} ${cy + 50} ${cx + 10} ${cy + 70} C${cx - 10} ${cy + 84} ${cx - 20} ${cy + 110} ${cx - 2} ${cy + 118} C${cx + 14} ${cy + 124} ${cx + 16} ${cy + 104} ${cx + 4} ${cy + 104} C${cx - 20} ${cy + 80} ${cx + 20} ${cy + 60} ${cx - 6} ${cy + 20} C${cx - 20} ${cy} ${cx - 24} ${cy - 40} ${cx} ${cy - 60} Z`;
    out += P(body, radial([[0, '#ffe07a'], [1, '#e08a1a']], '40%', '35%'), 6);
    out += P(`M${cx + 24} ${cy - 50} L${cx + 64} ${cy - 44} L${cx + 62} ${cy - 34} L${cx + 26} ${cy - 36} Z`, '#f0a830', 5);
    out += C(cx + 12, cy - 44, 7, '#ffffff', 4) + C(cx + 14, cy - 44, 3.5, INK, 0);
    for (let i = 0; i < 6; i++) out += L(`M${cx - 4} ${cy - 10 + i * 14} l14 2`, '#b86a10', 2.5, 0.8);
    out += P(`M${cx - 6} ${cy} C${cx - 36} ${cy - 10} ${cx - 40} ${cy + 20} ${cx - 12} ${cy + 26} Z`, '#ffcf5a', 4);
  }

  // ---------- arm + creature lantern ----------
  const armD = 'M720 860 C780 820 830 760 850 680';
  out += L(armD, INK, 76) + L(armD, linear([[0, '#b6a47a'], [1, '#7a6a44']], 0, 0, 1, 0), 64);
  out += L('M742 830 Q770 800 790 770', '#5a4c2e', 4, 0.7) + L('M800 760 Q820 730 832 700', '#5a4c2e', 4, 0.7);
  out += `<rect x="818" y="670" width="64" height="26" rx="8" fill="${metal('40%', '20%')}" stroke="${INK}" stroke-width="6"/>`;
  out += P('M820 676 C806 640 830 612 860 614 C892 616 904 644 892 676 Z', radial([[0, '#f4e6c4'], [1, '#a8966a']], '40%', '35%'), 7);
  for (const x of [838, 856, 874]) out += L(`M${x} 622 L${x} 648`, '#8a7a50', 3, 0.8);
  out += L(`M${LX + 40} 626 L${LX + 40} ${LY - 118}`, INK, 5);
  out += P(`M${LX - 56} ${LY - 50} C${LX - 70} ${LY + 20} ${LX - 60} ${LY + 80} ${LX} ${LY + 88} C${LX + 60} ${LY + 80} ${LX + 70} ${LY + 20} ${LX + 56} ${LY - 50} Z`, radial([[0, '#ffffff', 0.9], [0.5, glowHex, 0.55], [1, glowHex, 0.35]]), 6);
  let creature = '';
  const lan = picks.lantern.id;
  if (lan === 'jellyfish') {
    creature += P(`M${LX - 32} ${LY + 10} C${LX - 34} ${LY - 34} ${LX + 34} ${LY - 34} ${LX + 32} ${LY + 10} Q${LX} ${LY + 2} ${LX - 32} ${LY + 10} Z`, radial([[0, '#ffffff'], [0.6, '#ffc6f0'], [1, '#e87ad8']]), 4);
    for (let i = 0; i < 5; i++) { const x = LX - 24 + i * 12; creature += L(`M${x} ${LY + 8} q${f(R(-8, 8))} 18 ${f(R(-4, 4))} 36 q${f(R(-6, 6))} 12 ${f(R(-3, 3))} 22`, '#ff9ae6', 3, 0.9); }
    creature += C(LX - 10, LY - 16, 5, '#ffffff', 0, 'opacity="0.9"');
  } else if (lan === 'anglerfish') {
    creature += P(`M${LX - 40} ${LY + 20} C${LX - 40} ${LY - 20} ${LX + 30} ${LY - 24} ${LX + 40} ${LY + 14} C${LX + 30} ${LY + 50} ${LX - 30} ${LY + 54} ${LX - 40} ${LY + 20} Z`, radial([[0, '#4a5a6a'], [1, '#1a2230']]), 4);
    creature += P(`M${LX + 10} ${LY + 22} L${LX + 38} ${LY + 18} L${LX + 36} ${LY + 32} Z`, '#0a0a10', 2);
    for (let i = 0; i < 4; i++) creature += P(`M${LX + 14 + i * 6} ${LY + 20} l3 6 l3 -6 Z`, '#ffffff', 0);
    creature += C(LX + 4, LY + 6, 5, '#e8f8ff', 2) + L(`M${LX - 6} ${LY - 12} Q${LX - 10} ${LY - 40} ${LX + 14} ${LY - 34}`, '#1a2230', 3);
    creature += C(LX + 16, LY - 32, 12, radial([[0, '#ffffff'], [1, '#5ad0ff']]), 0) + P(`M${LX - 40} ${LY + 20} L${LX - 60} ${LY + 4} L${LX - 58} ${LY + 36} Z`, '#1a2230', 3);
  } else if (lan === 'glow_coral') {
    const br = (x, y, h, a) => { const [x2, y2] = [x + Math.sin(a) * h, y - Math.cos(a) * h]; return L(`M${f(x)} ${f(y)} L${f(x2)} ${f(y2)}`, '#ff7a2a', 7) + C(x2, y2, 6, '#ffe0a0', 0); };
    creature += br(LX, LY + 70, 60, 0) + br(LX, LY + 40, 40, -0.7) + br(LX, LY + 30, 44, 0.7) + br(LX - 20, LY + 10, 28, -0.4) + br(LX + 22, LY + 4, 26, 0.5);
    creature += E(LX, LY + 74, 30, 8, '#c8a878', 3);
  } else { // pearl in an open clam
    creature += P(`M${LX - 44} ${LY + 50} Q${LX} ${LY + 80} ${LX + 44} ${LY + 50} Q${LX} ${LY + 40} ${LX - 44} ${LY + 50} Z`, linear([[0, '#f0e0ff'], [1, '#a88ac8']]), 4);
    creature += P(`M${LX - 44} ${LY + 46} Q${LX - 40} ${LY - 10} ${LX} ${LY - 14} Q${LX + 40} ${LY - 10} ${LX + 44} ${LY + 46} Q${LX} ${LY + 20} ${LX - 44} ${LY + 46} Z`, linear([[0, '#f0e0ff'], [1, '#c8b0e0']]), 4);
    for (let i = -2; i <= 2; i++) creature += L(`M${LX} ${LY + 30} L${LX + i * 16} ${LY - 6}`, '#9a7ab8', 2, 0.7);
    creature += C(LX, LY + 38, 16, radial([[0, '#ffffff'], [0.7, '#fff2c8'], [1, '#e0c890']], '35%', '35%'), 3);
  }
  out += animate ? `<g>${creature}<animateTransform attributeName="transform" type="translate" values="0 0;0 -6;0 0" dur="2.4s" repeatCount="indefinite"/></g>` : creature;
  out += `<rect x="${LX - 62}" y="${LY - 70}" width="124" height="24" rx="6" fill="${metal('40%', '20%')}" stroke="${INK}" stroke-width="6"/>`;
  out += P(`M${LX - 44} ${LY - 70} C${LX - 40} ${LY - 120} ${LX + 40} ${LY - 120} ${LX + 44} ${LY - 70}`, 'none', 7);
  out += L(`M${LX - 44} ${LY + 50} Q${LX - 50} ${LY + 20} ${LX - 42} ${LY - 20}`, '#ffffff', 6, 0.55);
  out += C(LX, LY, 420, radial([[0, glowHex, 0.26], [0.5, glowHex, 0.1], [1, glowHex, 0]]), 0);

  // ---------- marine snow, stray bubbles, vignette ----------
  for (let i = 0; i < 110; i++) out += C(R(0, 1000), R(0, 1000), R(0.8, 2.6), W.snow, 0, `opacity="${f(R(0.2, 0.7))}"`);
  for (let i = 0; i < 9; i++) out += bubble(R(40, 960), R(60, 700), R(4, 10));
  out += `<rect width="1000" height="1000" fill="${radial([[0.55, '#021018', 0], [1, '#021018', 0.6]], '50%', '48%', '72%')}"/>`;

  return `<svg width="600" height="600" viewBox="0 0 1000 1000" xmlns="http://www.w3.org/2000/svg"><defs>${defs}</defs>${out}</svg>`;
}

// ---------- main composer ----------
function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  const picks = pickPiece(rng, t, opts && opts.locks, isOneOfOne);
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });
  const traits = {}, rarity = {};
  for (const k of CATEGORY_ORDER) { traits[k] = picks[k].id; rarity[k] = picks[k].rarity; }
  return { index, svg, tier: t, picks, traits, rarity, isOneOfOne };
}
function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea', robinhood: '#00c805' };

const api = {
  generatePiece, generateBatch, renderFromTraits, pickPiece,
  TRAITS, CATEGORY_ORDER, TIER_FALLBACK, ONE_OF_ONE_WEIGHTS,
  mulberry32, weightedPick, pickByRarity, pickOneOfOne, shadeColor, CHAIN_THEMES
};
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') window.DrownedGen = api;
if (typeof module !== 'undefined' && module.exports) module.exports = api;
