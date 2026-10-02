// ============================================================
// TORQUE — generative engine-part art (Generator 7)
//
// Every piece is a single car engine part — piston, spark plug, connecting
// rod, timing gear, turbocharger, valve, crankshaft or camshaft — drawn as a
// hero object in polished metal, then finished with a condition (factory
// fresh, oil-stained, rusted, heat-blued, scuffed), a scene, an effect and a
// framing. Three render modes: shaded metal, blueprint line drawing, neon.
//
// Usage:
//   Node:    const G = require('./generator.js'); G.generatePiece(1, 7)
//   Browser: inlined into index.html -> window.TorqueGen
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
  const total = pool.reduce((s, o) => s + (o.weight || 1), 0);
  let r = rng() * total;
  for (const o of pool) { r -= (o.weight || 1); if (r <= 0) return o; }
  return pool[pool.length - 1];
}
const TIER_FALLBACK = {
  common: ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare: ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  for (const t of TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare']) {
    const sub = pool.filter((p) => p.rarity === t);
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

// ---------- traits ----------
const TRAITS = {
  part: [
    { id: 'piston',          weight: 16, rarity: 'common' },
    { id: 'spark_plug',      weight: 16, rarity: 'common' },
    { id: 'timing_gear',     weight: 15, rarity: 'common' },
    { id: 'connecting_rod',  weight: 13, rarity: 'uncommon' },
    { id: 'valve',           weight: 12, rarity: 'uncommon' },
    { id: 'camshaft',        weight: 10, rarity: 'uncommon' },
    { id: 'crankshaft',      weight: 9,  rarity: 'rare' },
    { id: 'turbocharger',    weight: 9,  rarity: 'rare' }
  ],
  finish: [
    { id: 'steel',          weight: 22, rarity: 'common' },
    { id: 'cast_iron',      weight: 16, rarity: 'common' },
    { id: 'black_oxide',    weight: 14, rarity: 'common' },
    { id: 'chrome',         weight: 12, rarity: 'uncommon' },
    { id: 'anodized_red',   weight: 9,  rarity: 'uncommon' },
    { id: 'anodized_blue',  weight: 9,  rarity: 'uncommon' },
    { id: 'copper',         weight: 8,  rarity: 'uncommon' },
    { id: 'titanium',       weight: 6,  rarity: 'rare' },
    { id: 'gold',           weight: 4,  rarity: 'rare' }
  ],
  condition: [
    { id: 'factory_fresh',  weight: 28, rarity: 'common' },
    { id: 'scuffed',        weight: 22, rarity: 'common' },
    { id: 'oil_stained',    weight: 20, rarity: 'uncommon' },
    { id: 'heat_blued',     weight: 14, rarity: 'uncommon' },
    { id: 'rusted',         weight: 12, rarity: 'rare' }
  ],
  background: [
    { id: 'garage',         weight: 20, rarity: 'common' },
    { id: 'shop_paper',     weight: 18, rarity: 'common' },
    { id: 'midnight',       weight: 16, rarity: 'common' },
    { id: 'blueprint',      weight: 14, rarity: 'uncommon' },
    { id: 'redline',        weight: 12, rarity: 'uncommon' },
    { id: 'hazard',         weight: 10, rarity: 'uncommon' },
    { id: 'oil_black',      weight: 10, rarity: 'rare' }
  ],
  render: [
    { id: 'shaded',         weight: 70, rarity: 'common' },
    { id: 'blueprint_lines', weight: 18, rarity: 'uncommon' },
    { id: 'neon',           weight: 12, rarity: 'rare' }
  ],
  pose: [
    { id: 'upright',        weight: 40, rarity: 'common' },
    { id: 'tilted_left',    weight: 30, rarity: 'common' },
    { id: 'tilted_right',   weight: 30, rarity: 'common' }
  ],
  fx: [
    { id: 'none',           weight: 30, rarity: 'common' },
    { id: 'spotlight',      weight: 20, rarity: 'common' },
    { id: 'heat_glow',      weight: 14, rarity: 'uncommon' },
    { id: 'sparks',         weight: 12, rarity: 'uncommon' },
    { id: 'smoke',          weight: 12, rarity: 'uncommon' },
    { id: 'oil_drip',       weight: 12, rarity: 'uncommon' }
  ],
  frame: [
    { id: 'none',           weight: 45, rarity: 'common' },
    { id: 'spec_sheet',     weight: 25, rarity: 'uncommon' },
    { id: 'qc_stamp',       weight: 18, rarity: 'uncommon' },
    { id: 'race_tag',       weight: 12, rarity: 'rare' }
  ]
};

// metal finishes: [highlight, light, mid, dark]
const FINISH = {
  steel:         ['#f3f6f8', '#c3cad0', '#848d95', '#3e454b'],
  cast_iron:     ['#b4b6b8', '#7f8285', '#56595c', '#2a2c2e'],
  black_oxide:   ['#7d838b', '#43474d', '#26292d', '#0e0f11'],
  chrome:        ['#ffffff', '#dfe5ea', '#8e98a2', '#2f363d'],
  anodized_red:  ['#ffc2c2', '#ff4a52', '#c3121e', '#5a050b'],
  anodized_blue: ['#c6dcff', '#3f8bff', '#1650c4', '#081f57'],
  copper:        ['#ffe0c7', '#f19a5e', '#b9592a', '#5a250c'],
  titanium:      ['#eadfff', '#b7a3ef', '#6a5cb3', '#2a2457'],
  gold:          ['#fff3c4', '#ffcf3d', '#d29a0c', '#6e4a00']
};
const BG = {
  garage:     { a: '#8f8c86', b: '#5e5b56', ink: '#1d1c1a', dark: false },
  shop_paper: { a: '#f1e8d4', b: '#d9ccb0', ink: '#2a2620', dark: false },
  midnight:   { a: '#1b2338', b: '#070a13', ink: '#dfe7f7', dark: true },
  blueprint:  { a: '#2361a8', b: '#123a70', ink: '#e8f1ff', dark: true },
  redline:    { a: '#c4141f', b: '#5c0309', ink: '#fff1f1', dark: true },
  hazard:     { a: '#f3c11b', b: '#d79b00', ink: '#161616', dark: false },
  oil_black:  { a: '#22211f', b: '#050505', ink: '#e9e4da', dark: true }
};
// neon tube colour follows the finish, so neon pieces vary as much as metal ones
const NEON = { steel: '#38f6ff', cast_iron: '#7dff5a', black_oxide: '#b18cff', chrome: '#f4f8ff', anodized_red: '#ff4d6d', anodized_blue: '#3d9bff', copper: '#ff9b2f', titanium: '#ff3df2', gold: '#ffe14d' };

// ---------- unique piece names ----------
// Every piece in a collection gets its own name: a bijective shuffle of FIRST x LAST
// keyed by the seed, so no two pieces in one collection share a name. Past N pieces a
// roman numeral is appended (II, III, ...), which keeps them unique at any supply.
const NAME_PARTS = (function () {
  const FIRST = ['Redline', 'Nitro', 'Apex', 'Dyno', 'Boost', 'Torque', 'Turbo', 'Throttle', 'Drift', 'Burnout', 'Backfire', 'Overdrive',
    'Ignition', 'Octane', 'Clutch', 'Gearhead', 'Downforce', 'Slipstream', 'Holeshot', 'Launch', 'Kickdown', 'Hotrod', 'Blower', 'Wastegate',
    'Flywheel', 'Manifold', 'Intercooler', 'Bore', 'Stroke', 'Compression', 'Detonation', 'Afterfire', 'Lean Burn', 'Rich Mix', 'Cold Start',
    'Top Dead', 'Quarter Mile', 'Pit Stop', 'Pole', 'Green Flag', 'Checkered', 'Night Run', 'Iron', 'Big Block', 'Small Block', 'Straight Six',
    'Flat Four', 'Twin Cam', 'Dry Sump', 'Long Tube', 'Shift Light', 'Tach', 'Bypass', 'Spool', 'Lag', 'Dump Valve', 'Rev Limit', 'Heel Toe'];
  const LAST = [];
  { const P = ['LS', 'V8', 'V6', 'I4', 'BB', 'SB', 'GT', 'RS', 'TT', 'DOHC', 'SOHC', 'EVO', 'ST', 'CR', 'TX', 'RX'];
    const D = [289, 302, 327, 350, 383, 396, 409, 427, 440, 454, 502, 1600, 2000, 2600, 3000, 3800, 5000, 7000];
    // every prefix x displacement pairing (288 unique codes)
    for (let i = 0; i < P.length * D.length; i++) LAST.push(P[i % P.length] + '-' + D[Math.floor(i / P.length)]); }
  return { first: FIRST, last: LAST };
})();
function characterName(index, seed) {
  const F = NAME_PARTS.first, L = NAME_PARTS.last, N = F.length * L.length;
  let h = ((seed >>> 0) ^ 0x9e3779b9) >>> 0;
  const next = () => { h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = (h ^ (h + Math.imul(h ^ (h >>> 7), 0x297a2d39))) >>> 0; return (h ^ (h >>> 14)) >>> 0; };
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  let a = (next() % (N - 1)) + 1; while (gcd(a, N) !== 1) a = (a % (N - 1)) + 1;
  const b = next() % N;
  const i0 = Math.max(0, (index | 0) - 1), k = i0 % N, cycle = Math.floor(i0 / N);
  const m = (a * k + b) % N;
  const nF = F.length, nL = L.length;
  let c = (next() % (nF - 1)) + 1; while (gcd(c, nF) !== 1) c = (c % (nF - 1)) + 1;
  let d = (next() % (nL - 1)) + 1; while (gcd(d, nL) !== 1) d = (d % (nL - 1)) + 1;
  const fi = (c * (m % nF) + 31 * Math.floor(m / nF) + b) % nF;
  const li = (d * Math.floor(m / nF) + 17 * fi) % nL;
  const roman = (n) => { let r = ''; for (const [x, s] of [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= x) { r += s; n -= x; } return r; };
  return F[fi] + ' ' + L[li] + (cycle ? ' ' + roman(cycle + 1) : '');
}

// ---------- drawing kit ----------
// One kit per piece: fills/strokes depend on the render mode, so every part is
// written once and comes out as shaded metal, a blueprint line drawing or neon.
function makeKit(uid, finishId, mode, neonCol, bg) {
  const F = FINISH[finishId] || FINISH.steel;
  const id = (k) => k + uid;
  let defs = '';
  // cylinder shading (left-to-right), plate shading (diagonal), disc shading (radial)
  defs += `<linearGradient id="${id('cy')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${F[3]}"/><stop offset="0.18" stop-color="${F[2]}"/><stop offset="0.42" stop-color="${F[0]}"/><stop offset="0.6" stop-color="${F[1]}"/><stop offset="0.85" stop-color="${F[2]}"/><stop offset="1" stop-color="${F[3]}"/></linearGradient>`;
  defs += `<linearGradient id="${id('cv')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${F[3]}"/><stop offset="0.2" stop-color="${F[2]}"/><stop offset="0.42" stop-color="${F[0]}"/><stop offset="0.62" stop-color="${F[1]}"/><stop offset="0.86" stop-color="${F[2]}"/><stop offset="1" stop-color="${F[3]}"/></linearGradient>`;
  defs += `<linearGradient id="${id('pl')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${F[0]}"/><stop offset="0.35" stop-color="${F[1]}"/><stop offset="0.7" stop-color="${F[2]}"/><stop offset="1" stop-color="${F[3]}"/></linearGradient>`;
  defs += `<radialGradient id="${id('dk')}" cx="0.38" cy="0.32" r="0.75"><stop offset="0" stop-color="${F[0]}"/><stop offset="0.45" stop-color="${F[1]}"/><stop offset="0.8" stop-color="${F[2]}"/><stop offset="1" stop-color="${F[3]}"/></radialGradient>`;
  defs += `<linearGradient id="${id('cer')}" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9c3b6"/><stop offset="0.4" stop-color="#fffdf6"/><stop offset="0.75" stop-color="#ece5d6"/><stop offset="1" stop-color="#a59f92"/></linearGradient>`;
  defs += `<linearGradient id="${id('cu')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd2a8"/><stop offset="0.5" stop-color="#c8703a"/><stop offset="1" stop-color="#6b2f12"/></linearGradient>`;
  const shaded = mode === 'shaded';
  const line = shaded ? F[3] : mode === 'neon' ? neonCol : bg.dark ? '#e8f1ff' : '#1d3d6e';
  const sw = shaded ? 2.4 : mode === 'neon' ? 3 : 2.2;
  // fill helpers: g(kind) for metal, plus fixed materials
  const fill = (kind) => {
    if (mode === 'blueprint_lines') return 'none';
    if (mode === 'neon') return '#0b0b12';
    return { cyl: `url(#${id('cy')})`, cylv: `url(#${id('cv')})`, plate: `url(#${id('pl')})`, disc: `url(#${id('dk')})`, ceramic: `url(#${id('cer')})`, copper: `url(#${id('cu')})`, hole: '#0b0c0e', dark: F[3], mid: F[2], light: F[1] }[kind] || kind;
  };
  const st = (w) => ` stroke="${line}" stroke-width="${w || sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const k = {
    F, defs: () => defs, addDef: (d) => { defs += d; }, id, mode, line, sw, shaded,
    rect: (x, y, w, h, kind, r, extra) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${r ? ` rx="${r}"` : ''} fill="${fill(kind)}"${st()}${extra || ''}/>`,
    circ: (cx, cy, r, kind, extra) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill(kind)}"${st()}${extra || ''}/>`,
    ell: (cx, cy, rx, ry, kind, extra) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill(kind)}"${st()}${extra || ''}/>`,
    path: (d, kind, extra, w) => `<path d="${d}" fill="${kind ? fill(kind) : 'none'}"${st(w)}${extra || ''}/>`,
    // thin detail line (grooves, threads): dark in shaded mode, the line colour otherwise
    groove: (d, w, op) => `<path d="${d}" fill="none" stroke="${shaded ? F[3] : line}" stroke-width="${w || 2}" stroke-linecap="round" opacity="${shaded ? (op || 0.75) : 0.8}"/>`,
    // specular streak (shaded only)
    shine: (d, w, op) => shaded ? `<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${w || 3}" stroke-linecap="round" opacity="${op || 0.55}"/>` : ''
  };
  return k;
}

// ---------- parts (each drawn around 300,300; fits a ~380px box) ----------
const PARTS = {
  piston(k) {
    let s = '';
    // skirt + crown body
    s += k.path('M200 170 Q200 140 230 136 L370 136 Q400 140 400 170 L400 300 L392 410 Q300 428 208 410 L200 300 Z', 'cyl');
    // crown dish
    s += k.ell(300, 140, 98, 12, 'light');
    s += k.ell(300, 140, 66, 7, 'mid');
    // ring grooves
    for (const y of [168, 190, 212]) s += k.groove(`M201 ${y} L399 ${y}`, 5, 0.85) + k.shine(`M206 ${y + 4} L394 ${y + 4}`, 1.2, 0.4);
    // pin boss + pin
    s += k.circ(300, 312, 46, 'cyl');
    s += k.circ(300, 312, 24, 'disc');
    s += k.circ(300, 312, 10, 'hole');
    // skirt relief cut-outs
    s += k.path('M214 260 Q226 312 214 364', null) + k.path('M386 260 Q374 312 386 364', null);
    s += k.shine('M246 150 L246 400', 6, 0.35);
    return s;
  },
  spark_plug(k) {
    let s = '';
    s += k.rect(282, 62, 36, 34, 'cyl', 6);                 // terminal nut
    s += k.rect(290, 92, 20, 14, 'cyl');
    // ribbed ceramic insulator
    s += k.path('M268 106 L332 106 L340 240 L260 240 Z', 'ceramic');
    for (let y = 118; y < 196; y += 16) s += k.groove(`M${266 + (y - 106) * 0.06} ${y} L${334 - (y - 106) * 0.06} ${y}`, 3, 0.35);
    // hex nut
    s += k.path('M236 240 L364 240 L364 300 L236 300 Z', 'cyl');
    s += k.groove('M268 242 L268 298 M332 242 L332 298', 2.5, 0.6);
    // threaded body
    s += k.rect(256, 300, 88, 108, 'cyl');
    for (let y = 306; y < 404; y += 10) s += k.groove(`M257 ${y} L343 ${y + 6}`, 2.2, 0.7);
    // insulator nose + electrodes
    s += k.path('M286 408 L314 408 L306 440 L294 440 Z', 'ceramic');
    s += k.rect(296, 440, 8, 16, 'mid');
    s += k.path('M340 408 L340 470 L302 470', null, '', 9);              // ground electrode
    s += k.shine('M276 312 L276 400', 5, 0.35) + k.shine('M282 116 L276 234', 5, 0.6);
    return s;
  },
  timing_gear(k, rng) {
    let s = '';
    const teeth = 28 + Math.floor(rng() * 10), R = 172, r = 152;
    let d = '';
    for (let i = 0; i < teeth; i++) {
      const a0 = (i / teeth) * Math.PI * 2, a1 = ((i + 0.22) / teeth) * Math.PI * 2, a2 = ((i + 0.5) / teeth) * Math.PI * 2, a3 = ((i + 0.72) / teeth) * Math.PI * 2;
      const P = (a, rr) => (300 + Math.cos(a) * rr).toFixed(1) + ' ' + (300 + Math.sin(a) * rr).toFixed(1);
      d += (i ? ' L' : 'M') + P(a0, r) + ' L' + P(a1, R) + ' L' + P(a2, R) + ' L' + P(a3, r);
    }
    s += k.path(d + ' Z', 'disc');
    s += k.circ(300, 300, 128, 'plate', ' opacity="0.95"');
    // lightening holes
    const holes = 4 + Math.floor(rng() * 3);
    for (let i = 0; i < holes; i++) { const a = (i / holes) * Math.PI * 2 + 0.3; s += k.circ((300 + Math.cos(a) * 84).toFixed(1), (300 + Math.sin(a) * 84).toFixed(1), 26, 'hole'); }
    s += k.circ(300, 300, 46, 'disc');
    s += k.circ(300, 300, 22, 'hole');
    s += k.rect(294, 268, 12, 14, 'hole');            // keyway
    s += k.shine('M206 230 A110 110 0 0 1 300 176', 5, 0.5);
    return s;
  },
  connecting_rod(k) {
    let s = '';
    // I-beam shank
    s += k.path('M270 150 L330 150 L352 360 L248 360 Z', 'cyl');
    s += k.path('M286 170 L314 170 L328 340 L272 340 Z', 'mid', ' opacity="0.9"');
    // small end
    s += k.circ(300, 132, 52, 'disc');
    s += k.circ(300, 132, 28, 'copper');
    s += k.circ(300, 132, 18, 'hole');
    // big end + cap
    s += k.path('M196 380 A104 104 0 0 1 404 380 Z', 'disc');
    s += k.path('M196 386 A104 104 0 0 0 404 386 Z', 'plate');
    s += k.circ(300, 383, 64, 'copper');
    s += k.circ(300, 383, 52, 'hole');
    // cap bolts
    for (const x of [212, 388]) s += k.rect(x - 9, 356, 18, 64, 'cyl', 3) + k.rect(x - 13, 418, 26, 16, 'dark', 2);
    s += k.groove('M196 383 L248 383 M352 383 L404 383', 2.5, 0.8);
    s += k.shine('M282 178 L272 330', 4, 0.45);
    return s;
  },
  valve(k) {
    let s = '';
    // stem
    s += k.rect(291, 70, 18, 330, 'cyl', 4);
    // head (tulip) + seat face
    s += k.path('M291 330 Q286 382 220 410 L380 410 Q314 382 309 330 Z', 'cyl');
    s += k.rect(214, 408, 172, 16, 'cylv', 4);
    // spring coil
    let d = '';
    for (let i = 0; i <= 12; i++) { const y = 120 + i * 13; d += (i ? ' L' : 'M') + (i % 2 ? 360 : 240) + ' ' + y; }
    s += `<path d="${d}" fill="none" stroke="${k.shaded ? k.F[3] : k.line}" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (k.shaded) s += `<path d="${d}" fill="none" stroke="${k.F[1]}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
    // retainer + keepers
    s += k.path('M234 96 L366 96 L350 118 L250 118 Z', 'plate');
    s += k.rect(282, 82, 36, 16, 'dark', 3);
    s += k.rect(244, 278, 112, 12, 'plate', 3);                 // spring seat
    s += k.shine('M296 80 L296 320', 3, 0.6);
    return s;
  },
  camshaft(k, rng) {
    let s = '';
    s += k.rect(70, 288, 460, 24, 'cylv', 10);                // shaft
    const lobes = 5 + Math.floor(rng() * 2);
    for (let i = 0; i < lobes; i++) {
      const x = 130 + i * (340 / (lobes - 1)), ang = ((i * 2 + Math.floor(rng() * 2)) % 6) * 60 - 90;
      s += `<g transform="rotate(${ang} ${x} 300)">` + k.path(`M${x - 28} 300 A28 28 0 0 1 ${x + 28} 300 Q${x + 22} 338 ${x} 348 Q${x - 22} 338 ${x - 28} 300 Z`, 'plate') + '</g>';
      if (i < lobes - 1) s += k.rect((x + 170 / (lobes - 1) - 11).toFixed(1), 280, 22, 40, 'cylv', 4); // bearing journal between lobes
    }
    // sprocket at the front
    let d = '';
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, b = ((i + 0.5) / 24) * Math.PI * 2; d += (i ? ' L' : 'M') + (78 + Math.cos(a) * 56).toFixed(1) + ' ' + (300 + Math.sin(a) * 56).toFixed(1) + ' L' + (78 + Math.cos(b) * 46).toFixed(1) + ' ' + (300 + Math.sin(b) * 46).toFixed(1); }
    s += k.path(d + ' Z', 'disc') + k.circ(78, 300, 16, 'hole');
    s += k.shine('M120 294 L520 294', 2.5, 0.5);
    return s;
  },
  crankshaft(k) {
    let s = '';
    s += k.rect(66, 284, 470, 32, 'cylv', 8);                  // main axis
    const throws = [[150, -1], [250, 1], [350, -1], [450, 1]];
    for (const [x, dir] of throws) {
      const yPin = 300 + dir * 62;
      // counterweight on the opposite side
      s += k.path(`M${x - 46} 300 L${x - 30} ${300 - dir * 92} Q${x} ${300 - dir * 112} ${x + 30} ${300 - dir * 92} L${x + 46} 300 Z`, 'plate');
      // web up to the rod journal
      s += k.path(`M${x - 34} 300 L${x - 26} ${yPin} L${x + 26} ${yPin} L${x + 34} 300 Z`, 'plate');
      s += k.rect(x - 22, yPin - 14, 44, 28, 'cylv', 6);       // rod journal
      s += k.circ(x, 300 - dir * 70, 8, 'hole');                 // oil gallery
    }
    // snout + flywheel flange
    s += k.rect(40, 290, 40, 20, 'cylv', 4);
    s += k.rect(520, 236, 30, 128, 'cyl', 6);
    for (const y of [256, 300, 344]) s += k.circ(535, y, 5, 'hole');
    s += k.shine('M90 292 L510 292', 2.5, 0.5);
    return s;
  },
  turbocharger(k, rng) {
    let s = '';
    // compressor volute (snail housing) with outlet
    s += k.path('M300 140 A160 160 0 1 1 158 362 L120 378 L104 340 L146 324 A160 160 0 0 1 300 140 Z', 'disc');
    s += k.path('M300 140 L470 140 L470 196 L404 196 A120 120 0 0 0 300 160 Z', 'cylv');
    s += k.rect(468, 128, 22, 80, 'cyl', 4);                   // outlet flange
    // inlet ring + compressor wheel
    s += k.circ(300, 300, 102, 'plate');
    s += k.circ(300, 300, 86, 'hole');
    const blades = 9 + Math.floor(rng() * 4);
    for (let i = 0; i < blades; i++) {
      const a = (i / blades) * Math.PI * 2, ax = 300 + Math.cos(a) * 18, ay = 300 + Math.sin(a) * 18;
      const bx = 300 + Math.cos(a + 0.9) * 82, by = 300 + Math.sin(a + 0.9) * 82, cx = 300 + Math.cos(a + 0.2) * 70, cy = 300 + Math.sin(a + 0.2) * 70;
      s += `<path d="M${ax.toFixed(1)} ${ay.toFixed(1)} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)}" fill="none" stroke="${k.shaded ? k.F[1] : k.line}" stroke-width="${k.shaded ? 7 : 2.5}" stroke-linecap="round"/>`;
    }
    s += k.circ(300, 300, 22, 'disc');
    s += `<path d="M291 293 L309 293 L313 300 L309 307 L291 307 L287 300 Z" fill="${k.mode === 'shaded' ? k.F[3] : 'none'}" stroke="${k.line}" stroke-width="2"/>`; // hex nut
    // clamp bolts around the housing
    for (let i = 0; i < 6; i++) { const a = -0.6 + i * 0.75; s += k.circ((300 + Math.cos(a) * 146).toFixed(1), (300 + Math.sin(a) * 146).toFixed(1), 7, 'dark'); }
    s += k.shine('M190 220 A140 140 0 0 1 280 162', 6, 0.45);
    return s;
  }
};

// each part's drawn extent (x0, y0, x1, y1), used to scale and centre it in the frame
const PART_BOX = {
  piston: [198, 126, 402, 430], spark_plug: [234, 60, 366, 474], timing_gear: [126, 126, 474, 474],
  connecting_rod: [194, 78, 406, 490], valve: [212, 68, 388, 426], camshaft: [20, 236, 532, 364],
  crankshaft: [38, 186, 552, 414], turbocharger: [100, 126, 492, 462]
};

// ---------- scene ----------
function backgroundMarkup(bgId, uid, rng) {
  const b = BG[bgId] || BG.garage;
  let s = `<defs><radialGradient id="bg${uid}" cx="0.5" cy="0.42" r="0.75"><stop offset="0" stop-color="${b.a}"/><stop offset="1" stop-color="${b.b}"/></radialGradient></defs>`;
  s += `<rect width="600" height="600" fill="url(#bg${uid})"/>`;
  if (bgId === 'blueprint') {
    let g = ''; for (let i = 20; i < 600; i += 20) g += `M${i} 0 L${i} 600 M0 ${i} L600 ${i} `;
    s += `<path d="${g}" stroke="#ffffff" stroke-width="${0.6}" opacity="0.16"/>`;
    let G2 = ''; for (let i = 100; i < 600; i += 100) G2 += `M${i} 0 L${i} 600 M0 ${i} L600 ${i} `;
    s += `<path d="${G2}" stroke="#ffffff" stroke-width="1.2" opacity="0.22"/>`;
  } else if (bgId === 'shop_paper') {
    let g = ''; for (let i = 30; i < 600; i += 30) g += `M${i} 0 L${i} 600 M0 ${i} L600 ${i} `;
    s += `<path d="${g}" stroke="#8a7a5a" stroke-width="0.6" opacity="0.25"/>`;
  } else if (bgId === 'garage') {
    // concrete wall + floor line + speckle
    s += `<rect y="430" width="600" height="170" fill="#4a4844" opacity="0.55"/><path d="M0 430 L600 430" stroke="#2c2a27" stroke-width="3"/>`;
    for (let i = 0; i < 90; i++) s += `<circle cx="${(rng() * 600).toFixed(0)}" cy="${(rng() * 600).toFixed(0)}" r="${(0.6 + rng() * 1.6).toFixed(1)}" fill="#2a2825" opacity="${(0.15 + rng() * 0.2).toFixed(2)}"/>`;
  } else if (bgId === 'hazard') {
    let st = '';
    for (let x = -60; x < 660; x += 40) st += `M${x} 560 L${x + 20} 560 L${x + 60} 600 L${x + 40} 600 Z M${x} 0 L${x + 20} 0 L${x + 60} 40 L${x + 40} 40 Z `;
    s += `<path d="${st}" fill="#151515"/>`;
  } else if (bgId === 'redline') {
    // tachometer arc sweeping behind the part
    s += `<path d="M110 470 A220 220 0 1 1 490 470" fill="none" stroke="#ffffff" stroke-width="3" opacity="0.18"/>`;
    for (let i = 0; i <= 10; i++) { const a = Math.PI * (0.75 + i * 0.15), r1 = 220, r2 = i >= 8 ? 196 : 206; s += `<path d="M${(300 + Math.cos(a) * r1).toFixed(1)} ${(330 + Math.sin(a) * r1).toFixed(1)} L${(300 + Math.cos(a) * r2).toFixed(1)} ${(330 + Math.sin(a) * r2).toFixed(1)}" stroke="${i >= 8 ? '#ffffff' : '#ffd0d0'}" stroke-width="${i >= 8 ? 5 : 3}" opacity="${i >= 8 ? 0.55 : 0.25}"/>`; }
  } else if (bgId === 'midnight' || bgId === 'oil_black') {
    for (let i = 0; i < 40; i++) s += `<circle cx="${(rng() * 600).toFixed(0)}" cy="${(rng() * 600).toFixed(0)}" r="${(0.5 + rng()).toFixed(1)}" fill="#ffffff" opacity="${(0.08 + rng() * 0.2).toFixed(2)}"/>`;
  }
  return s;
}

// Mask that is white wherever the part is (any colour, any mode) — used to keep
// condition overlays (rust, oil, heat tint, scratches) on the metal only.
function conditionMarkup(cond, uid, rng, partMarkup, mode) {
  if (mode !== 'shaded' || cond === 'factory_fresh') {
    // a crisp diagonal specular sweep for brand-new parts
    if (mode === 'shaded' && cond === 'factory_fresh')
      return `<defs><filter id="wh${uid}"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter><mask id="pm${uid}"><g filter="url(#wh${uid})">${partMarkup}</g></mask>` +
        `<linearGradient id="sw${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0.38" stop-color="#fff" stop-opacity="0"/><stop offset="0.48" stop-color="#fff" stop-opacity="0.45"/><stop offset="0.56" stop-color="#fff" stop-opacity="0"/></linearGradient></defs>` +
        `<rect width="600" height="600" fill="url(#sw${uid})" mask="url(#pm${uid})"/>`;
    return '';
  }
  let over = '';
  if (cond === 'rusted') {
    for (let i = 0; i < 160; i++) {
      const c = ['#7a3410', '#a14a17', '#c46a2a', '#5b260d'][Math.floor(rng() * 4)];
      over += `<circle cx="${(60 + rng() * 480).toFixed(0)}" cy="${(60 + rng() * 480).toFixed(0)}" r="${(2 + rng() * 9).toFixed(1)}" fill="${c}" opacity="${(0.35 + rng() * 0.4).toFixed(2)}"/>`;
    }
  } else if (cond === 'oil_stained') {
    for (let i = 0; i < 14; i++) {
      const x = 80 + rng() * 440, y = 80 + rng() * 440, r = 10 + rng() * 34;
      over += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${r.toFixed(0)}" ry="${(r * (0.5 + rng() * 0.6)).toFixed(0)}" fill="#1a1206" opacity="${(0.35 + rng() * 0.3).toFixed(2)}"/>`;
      if (rng() < 0.5) over += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} q${(rng() * 6 - 3).toFixed(1)} ${(20 + rng() * 40).toFixed(0)} 0 ${(40 + rng() * 50).toFixed(0)}" stroke="#1a1206" stroke-width="${(3 + rng() * 4).toFixed(1)}" stroke-linecap="round" opacity="0.55" fill="none"/>`;
    }
  } else if (cond === 'heat_blued') {
    over += `<defs><linearGradient id="hb${uid}" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#3a2a9a"/><stop offset="0.35" stop-color="#7a3cc0"/><stop offset="0.6" stop-color="#3d8fd8"/><stop offset="0.85" stop-color="#e2b04a"/><stop offset="1" stop-color="#e2b04a" stop-opacity="0"/></linearGradient></defs>`;
    over += `<rect width="600" height="600" fill="url(#hb${uid})" opacity="0.5"/>`;
  } else if (cond === 'scuffed') {
    for (let i = 0; i < 40; i++) {
      const x = 80 + rng() * 440, y = 80 + rng() * 440, a = rng() * Math.PI, l = 10 + rng() * 40;
      over += `<path d="M${x.toFixed(0)} ${y.toFixed(0)} L${(x + Math.cos(a) * l).toFixed(0)} ${(y + Math.sin(a) * l).toFixed(0)}" stroke="${rng() < 0.6 ? '#ffffff' : '#000000'}" stroke-width="${(0.8 + rng() * 1.4).toFixed(1)}" opacity="${(0.25 + rng() * 0.3).toFixed(2)}" stroke-linecap="round"/>`;
    }
  }
  return `<defs><filter id="wh${uid}"><feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0"/></filter><mask id="pm${uid}"><g filter="url(#wh${uid})">${partMarkup}</g></mask></defs><g mask="url(#pm${uid})">${over}</g>`;
}

function fxBack(fx, uid, bg, rng) {
  if (fx === 'smoke') {
    // rises behind the part rather than fogging over it
    let s = '';
    for (let i = 0; i < 18; i++) { const x = 170 + rng() * 260, y = 30 + rng() * 260, r = 24 + rng() * 52; s += `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="${r.toFixed(0)}" fill="${bg.dark ? '#aab0b8' : '#5c5f63'}" opacity="${(0.08 + rng() * 0.12).toFixed(2)}"/>`; }
    return s;
  }
  if (fx === 'spotlight') return `<defs><radialGradient id="sp${uid}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffffff" stop-opacity="${bg.dark ? 0.32 : 0.45}"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs><polygon points="230,0 370,0 520,600 80,600" fill="url(#sp${uid})" opacity="0.7"/><ellipse cx="300" cy="300" rx="240" ry="240" fill="url(#sp${uid})"/>`;
  if (fx === 'heat_glow') return `<defs><radialGradient id="hg${uid}"><stop offset="0" stop-color="#ff7a1a" stop-opacity="0.75"/><stop offset="0.6" stop-color="#ff3b00" stop-opacity="0.25"/><stop offset="1" stop-color="#ff3b00" stop-opacity="0"/></radialGradient></defs><circle cx="300" cy="320" r="260" fill="url(#hg${uid})"/>`;
  return '';
}
function fxFront(fx, uid, rng, bg, bottom) {
  if (fx === 'sparks') {
    // grinding sparks spraying out sideways from under the part, not across it
    let s = ''; const side = rng() < 0.5 ? -1 : 1, ox = 300 + side * (40 + rng() * 50), oy = Math.min(540, bottom + 10);
    for (let i = 0; i < 26; i++) {
      const a = (side > 0 ? -0.35 : Math.PI + 0.35) - side * rng() * 0.9, l = 40 + rng() * 150, x2 = ox + Math.cos(a) * l, y2 = oy + Math.sin(a) * l;
      s += `<path d="M${ox.toFixed(0)} ${oy.toFixed(0)} L${x2.toFixed(0)} ${y2.toFixed(0)}" stroke="${rng() < 0.5 ? '#ffd23f' : '#ff8a1f'}" stroke-width="${(1 + rng() * 2).toFixed(1)}" stroke-linecap="round" opacity="${(0.55 + rng() * 0.4).toFixed(2)}"/>`;
      s += `<circle cx="${x2.toFixed(0)}" cy="${y2.toFixed(0)}" r="${(1.5 + rng() * 2).toFixed(1)}" fill="#fff3b0"/>`;
    }
    return s;
  }
  if (fx === 'oil_drip') {
    // drips fall from the underside of the part into a puddle on its shadow
    const x = 280 + rng() * 40, top = bottom - 4, pud = Math.min(560, bottom + 36);
    return `<ellipse cx="${x.toFixed(0)}" cy="${pud.toFixed(0)}" rx="62" ry="9" fill="#0d0a05" opacity="0.75"/><ellipse cx="${(x - 16).toFixed(0)}" cy="${(pud - 3).toFixed(0)}" rx="20" ry="2.5" fill="#ffffff" opacity="0.18"/>` +
      `<path d="M${x.toFixed(0)} ${top.toFixed(0)} q-6 14 0 22 q6 -8 0 -22" fill="#0d0a05"/><path d="M${x.toFixed(0)} ${(top + (pud - top) * 0.55).toFixed(0)} q-5 12 0 18 q5 -6 0 -18" fill="#0d0a05" opacity="0.85"/>`;
  }
  return '';
}

function frameMarkup(frame, b, bgId, part, finish, rng, bottom) {
  const ink = b.ink;
  const label = (t) => String(t).replace(/_/g, ' ').toUpperCase();
  if (frame === 'spec_sheet') {
    const pn = 'PN ' + (1000 + Math.floor(rng() * 9000)) + '-' + String.fromCharCode(65 + Math.floor(rng() * 26)) + (10 + Math.floor(rng() * 90));
    return `<rect x="16" y="16" width="568" height="568" fill="none" stroke="${ink}" stroke-width="2" opacity="0.7"/><rect x="24" y="24" width="552" height="552" fill="none" stroke="${ink}" stroke-width="0.8" opacity="0.5"/>` +
      `<g opacity="0.85" font-family="'Courier New',monospace" fill="${ink}"><rect x="376" y="508" width="200" height="68" fill="none" stroke="${ink}" stroke-width="1.4"/>` +
      `<path d="M376 530 L576 530 M376 552 L576 552" stroke="${ink}" stroke-width="0.8"/>` +
      `<text x="384" y="524" font-size="12" font-weight="bold">${label(part)}</text><text x="384" y="546" font-size="10">${label(finish)}</text><text x="384" y="568" font-size="10">${pn}</text></g>` +
      // dimension line along the bottom
      (() => { const dy = Math.min(496, (bottom || 440) + 50).toFixed(0);
        return `<g stroke="${ink}" stroke-width="1" opacity="0.6"><path d="M120 ${dy} L360 ${dy} M120 ${dy - 8} L120 ${+dy + 8} M360 ${dy - 8} L360 ${+dy + 8}"/><path d="M120 ${dy} l10 -4 l0 8 z M360 ${dy} l-10 -4 l0 8 z" fill="${ink}"/></g>` +
        `<text x="240" y="${dy - 6}" font-family="'Courier New',monospace" font-size="11" fill="${ink}" text-anchor="middle" opacity="0.7">${(80 + Math.floor(rng() * 60)).toFixed(0)}.${Math.floor(rng() * 10)} mm</text>`; })();
  }
  if (frame === 'qc_stamp') {
    const rot = (-18 + rng() * 36).toFixed(0), x = 470 + rng() * 40, y = 470 + rng() * 40;
    const sc = bgId === 'redline' ? '#ffffff' : '#d0182b'; // red ink would vanish on the red scene
    return `<g transform="rotate(${rot} ${x.toFixed(0)} ${y.toFixed(0)})" opacity="0.8" font-family="'Courier New',monospace" fill="${sc}" text-anchor="middle">` +
      `<circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="58" fill="none" stroke="${sc}" stroke-width="5"/><circle cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" r="48" fill="none" stroke="${sc}" stroke-width="1.5"/>` +
      `<text x="${x.toFixed(0)}" y="${(y - 6).toFixed(0)}" font-size="17" font-weight="bold">QC</text><text x="${x.toFixed(0)}" y="${(y + 14).toFixed(0)}" font-size="13" font-weight="bold">PASSED</text></g>`;
  }
  if (frame === 'race_tag') {
    const num = 1 + Math.floor(rng() * 99);
    return `<g transform="rotate(-8 112 112)"><path d="M48 70 L176 70 L176 156 L48 156 Z" fill="#f5f2ea" stroke="#151515" stroke-width="3"/><circle cx="64" cy="86" r="6" fill="none" stroke="#151515" stroke-width="2.5"/>` +
      `<path d="M58 80 Q20 40 40 14" stroke="#151515" stroke-width="2" fill="none"/>` +
      `<text x="118" y="140" font-family="Impact,'Arial Black',sans-serif" font-size="62" fill="#c3121e" text-anchor="middle">${num}</text></g>`;
  }
  return '';
}

// ---------- render ----------
function renderFromTraits(picks, index, seed, opts) {
  const uid = (seed ?? 0) + '_' + index;
  const rng = mulberry32(((seed ?? 0) * 100003 + index) ^ 0x5bd1e995); // art detail stream (traits use their own)
  const bgId = picks.background.id, b = BG[bgId] || BG.garage, mode = picks.render.id;
  const partId = picks.part.id;
  const k = makeKit(uid, picks.finish.id, mode, NEON[picks.finish.id] || '#38f6ff', b);
  const partMarkup = PARTS[partId](k, rng);
  const angle = picks.pose.id === 'tilted_left' ? -14 : picks.pose.id === 'tilted_right' ? 14 : 0;
  // horizontal parts (shafts) tilt less so their ends stay inside the frame
  const ang = (partId === 'camshaft' || partId === 'crankshaft') ? angle * 0.6 : angle;
  // fit the part's own bounding box into the frame (max 470 wide / 390 tall), centred a little above middle
  const [bx0, by0, bx1, by1] = PART_BOX[partId] || [100, 100, 500, 500];
  const bw = bx1 - bx0, bh = by1 - by0, sc = Math.min(470 / bw, 390 / bh, 1.5);
  const cyFit = 282, bottom = cyFit + bh * sc / 2;
  const tf = `rotate(${ang} 300 ${cyFit}) translate(300 ${cyFit}) scale(${sc.toFixed(3)}) translate(${-(bx0 + bw / 2)} ${-(by0 + bh / 2)})`;
  let s = `<svg id="piece${uid}" viewBox="0 0 600 600" width="600" height="600" xmlns="http://www.w3.org/2000/svg">`;
  s += backgroundMarkup(bgId, uid, rng);
  s += fxBack(picks.fx.id, uid, b, rng);
  // soft contact shadow under the part
  s += `<ellipse cx="300" cy="${Math.min(556, bottom + 34).toFixed(0)}" rx="${Math.min(230, bw * sc * 0.48).toFixed(0)}" ry="16" fill="#000000" opacity="${b.dark ? 0.45 : 0.22}"/>`;
  const glow = mode === 'neon' ? `<defs><filter id="ng${uid}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : '';
  s += glow + `<g transform="${tf}"${mode === 'neon' ? ` filter="url(#ng${uid})"` : ''}><defs>${k.defs()}</defs>${partMarkup}` + conditionMarkup(picks.condition.id, uid, rng, partMarkup, mode) + '</g>';
  s += fxFront(picks.fx.id, uid, rng, b, bottom);
  s += frameMarkup(picks.frame.id, b, bgId, partId, picks.finish.id, rng, bottom);
  if (opts && opts.isOneOfOne) s += `<rect x="6" y="6" width="588" height="588" fill="none" stroke="#ffcf3d" stroke-width="4" opacity="0.9"/>`;
  return s + '</svg>';
}

function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  const locks = (opts && opts.locks) || {};
  const pick = (cat) => {
    const sel = locks[cat];
    if (sel && sel.length) { const sub = TRAITS[cat].filter((p) => sel.includes(p.id)); if (sub.length) return weightedPick(rng, sub); }
    // 1/1s lean rare: rare parts, finishes and conditions come up far more often
    return pickByRarity(rng, TRAITS[cat], isOneOfOne && rng() < 0.6 ? 'rare' : t);
  };
  const picks = {};
  for (const cat of Object.keys(TRAITS)) picks[cat] = pick(cat);
  // the blueprint line drawing belongs on the blueprint sheet / dark scenes; neon needs a dark room
  if (picks.render.id === 'neon' && !(BG[picks.background.id] || {}).dark && !(locks.background && locks.background.length)) picks.background = TRAITS.background.find((b) => b.id === 'midnight');
  // oil drips would vanish on the oil-black floor
  if (picks.fx.id === 'oil_drip' && picks.background.id === 'oil_black' && !(locks.fx && locks.fx.length)) picks.fx = TRAITS.fx.find((f) => f.id === 'smoke');
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

const api = { characterName, TRAITS, TIER_FALLBACK, CHAIN_THEMES, FINISH, BG,
  mulberry32, weightedPick, pickByRarity, shadeColor, renderFromTraits, renderPiece, generatePiece, generateBatch };
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.TorqueGen = api;
} else if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
