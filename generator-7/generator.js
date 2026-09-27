// ============================================================
// Drowned Dockworkers — Generative Trait Engine v2 "Open Water"
// Cartoon scuba divers with real human proportions, swimming through reefs,
// wrecks, kelp and sunken cities. Head traits show through the mask and
// around the regulator; body traits cover the wetsuit and kit.
// v2 replaces v1's helmet-only portraits with full-body scuba divers.
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
// ONE_OF_ONE_WEIGHTS (or an explicit lock).
const TRAITS = {
  // scene
  water: [
    { id: 'shallows',  weight: 34, rarity: 'common',   hex: '#1a7890' },
    { id: 'deep_blue', weight: 28, rarity: 'common',   hex: '#12457a' },
    { id: 'emerald',   weight: 20, rarity: 'uncommon', hex: '#16806a' },
    { id: 'twilight',  weight: 12, rarity: 'uncommon', hex: '#4a3f8a' },
    { id: 'abyss',     weight: 6,  rarity: 'rare',     hex: '#0a1a26' }
  ],
  location: [
    { id: 'reef',        weight: 36, rarity: 'common' },
    { id: 'kelp_forest', weight: 28, rarity: 'common' },
    { id: 'shipwreck',   weight: 22, rarity: 'uncommon' },
    { id: 'sunken_city', weight: 14, rarity: 'rare' }
  ],
  companion: [
    { id: 'none',      weight: 40, rarity: 'common' },
    { id: 'clownfish', weight: 26, rarity: 'common' },
    { id: 'turtle',    weight: 16, rarity: 'uncommon' },
    { id: 'octopus',   weight: 12, rarity: 'uncommon' },
    { id: 'manta',     weight: 6,  rarity: 'rare' }
  ],
  // head
  skin: [
    { id: 'pale',  weight: 22, rarity: 'common', hex: '#f2d2b0' },
    { id: 'tan',   weight: 22, rarity: 'common', hex: '#d9a070' },
    { id: 'olive', weight: 18, rarity: 'common', hex: '#c8a47a' },
    { id: 'brown', weight: 22, rarity: 'common', hex: '#a86a42' },
    { id: 'deep',  weight: 16, rarity: 'common', hex: '#6e4128' }
  ],
  eyes: [
    { id: 'round',      weight: 36, rarity: 'common' },
    { id: 'sleepy',     weight: 22, rarity: 'common' },
    { id: 'squint',     weight: 18, rarity: 'uncommon' },
    { id: 'tiny',       weight: 14, rarity: 'uncommon' },
    { id: 'mismatched', weight: 10, rarity: 'rare' }
  ],
  eyeColor: [
    { id: 'blue',   weight: 30, rarity: 'common',   hex: '#1f7aa8' },
    { id: 'green',  weight: 24, rarity: 'common',   hex: '#2f9a5a' },
    { id: 'amber',  weight: 22, rarity: 'uncommon', hex: '#c8861a' },
    { id: 'grey',   weight: 16, rarity: 'uncommon', hex: '#6a7a86' },
    { id: 'violet', weight: 8,  rarity: 'rare',     hex: '#7a4ad0' }
  ],
  brows: [
    { id: 'bushy',   weight: 30, rarity: 'common' },
    { id: 'thin',    weight: 26, rarity: 'common' },
    { id: 'angry',   weight: 18, rarity: 'uncommon' },
    { id: 'raised',  weight: 16, rarity: 'uncommon' },
    { id: 'unibrow', weight: 10, rarity: 'rare' }
  ],
  mustache: [
    { id: 'none',      weight: 30, rarity: 'common' },
    { id: 'walrus',    weight: 24, rarity: 'common' },
    { id: 'chevron',   weight: 20, rarity: 'uncommon' },
    { id: 'pencil',    weight: 16, rarity: 'uncommon' },
    { id: 'handlebar', weight: 10, rarity: 'rare' }
  ],
  hair: [
    { id: 'black',  weight: 26, rarity: 'common',   hex: '#1a1a1a' },
    { id: 'brown',  weight: 24, rarity: 'common',   hex: '#5a3418' },
    { id: 'blond',  weight: 14, rarity: 'uncommon', hex: '#e0b860' },
    { id: 'ginger', weight: 12, rarity: 'uncommon', hex: '#b85a2a' },
    { id: 'white',  weight: 10, rarity: 'rare',     hex: '#eeece6' },
    { id: 'hood',   weight: 14, rarity: 'uncommon', hex: '#1e2328' }
  ],
  maskColor: [
    { id: 'black',  weight: 30, rarity: 'common',   hex: '#1e2328' },
    { id: 'yellow', weight: 22, rarity: 'common',   hex: '#f0c030' },
    { id: 'blue',   weight: 20, rarity: 'common',   hex: '#2f6fd0' },
    { id: 'red',    weight: 16, rarity: 'uncommon', hex: '#d8443a' },
    { id: 'white',  weight: 12, rarity: 'uncommon', hex: '#f4f4f0' }
  ],
  // body
  wetsuit: [
    { id: 'black_blue',  weight: 30, rarity: 'common',   hex: '#2f6fd0' },
    { id: 'black_red',   weight: 24, rarity: 'common',   hex: '#d8443a' },
    { id: 'navy_orange', weight: 20, rarity: 'uncommon', hex: '#f07a2a' },
    { id: 'yellow',      weight: 14, rarity: 'uncommon', hex: '#f0c030' },
    { id: 'camo',        weight: 12, rarity: 'rare',     hex: '#4a5a36' },
    { id: 'abyss_glow',  weight: 0,  rarity: 'rare',     hex: '#3affe0', oneOfOneOnly: true }
  ],
  cut: [
    { id: 'full',   weight: 70, rarity: 'common' },
    { id: 'shorty', weight: 30, rarity: 'uncommon' }
  ],
  fins: [
    { id: 'black',  weight: 32, rarity: 'common',   hex: '#4a5058' },
    { id: 'blue',   weight: 28, rarity: 'common',   hex: '#5aa0f0' },
    { id: 'yellow', weight: 22, rarity: 'uncommon', hex: '#ffe066' },
    { id: 'red',    weight: 18, rarity: 'uncommon', hex: '#ff7a6a' }
  ],
  tank: [
    { id: 'silver', weight: 50, rarity: 'common',   hex: '#c4cdd4' },
    { id: 'yellow', weight: 32, rarity: 'uncommon', hex: '#f0c030' },
    { id: 'red',    weight: 18, rarity: 'rare',     hex: '#e0503a' }
  ],
  held: [
    { id: 'torch',  weight: 34, rarity: 'common' },
    { id: 'none',   weight: 26, rarity: 'common' },
    { id: 'camera', weight: 26, rarity: 'uncommon' },
    { id: 'spear',  weight: 14, rarity: 'rare' }
  ]
};
const CATEGORY_ORDER = ['water', 'location', 'companion', 'skin', 'eyes', 'eyeColor', 'brows', 'mustache', 'hair', 'maskColor', 'wetsuit', 'cut', 'fins', 'tank', 'held'];

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
// are the only way to reach 1/1-only values (the glowing abyss wetsuit).
const ONE_OF_ONE_WEIGHTS = {
  water:     { abyss: 30, twilight: 26, emerald: 18, deep_blue: 14, shallows: 12 },
  location:  { sunken_city: 32, shipwreck: 28, kelp_forest: 20, reef: 20 },
  companion: { manta: 30, octopus: 24, turtle: 22, clownfish: 14, none: 10 },
  eyes:      { mismatched: 28, tiny: 20, squint: 20, sleepy: 16, round: 16 },
  eyeColor:  { violet: 30, amber: 22, green: 18, blue: 16, grey: 14 },
  brows:     { unibrow: 26, raised: 20, angry: 20, bushy: 18, thin: 16 },
  mustache:  { handlebar: 28, walrus: 22, pencil: 18, chevron: 18, none: 14 },
  hair:      { white: 24, ginger: 20, hood: 18, blond: 14, brown: 12, black: 12 },
  wetsuit:   { abyss_glow: 26, camo: 20, yellow: 16, navy_orange: 14, black_red: 12, black_blue: 12 },
  tank:      { red: 40, yellow: 34, silver: 26 },
  held:      { spear: 32, camera: 28, torch: 24, none: 16 }
};
function pickOneOfOne(rng, cat) {
  const w = ONE_OF_ONE_WEIGHTS[cat];
  const pool = TRAITS[cat].map(t => ({ ...t, weight: w ? (w[t.id] || 0) : (t.oneOfOneOnly ? 0 : 1) })).filter(t => t.weight > 0);
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
  return picks;
}

const WATER = {
  shallows:  { stops: ['#4cc3cf', '#1a7890', '#0b3f58', '#062638'], city: '#0e4a60', win: '#7fe8e0', ray: 0.11 },
  deep_blue: { stops: ['#3aa8d0', '#146a9a', '#0a3a6a', '#04162e'], city: '#0c3358', win: '#8fd0ff', ray: 0.09 },
  emerald:   { stops: ['#5fdab0', '#16806a', '#0b4a44', '#042a28'], city: '#0d4a44', win: '#9ff0c8', ray: 0.1 },
  twilight:  { stops: ['#9a8fe0', '#4a3f8a', '#261f5a', '#110c30'], city: '#2a2360', win: '#c8a8ff', ray: 0.07 },
  abyss:     { stops: ['#1f4a5a', '#0a1a26', '#050d14', '#020508'], city: '#0a1a24', win: '#5ad0ff', ray: 0.03 }
};

const INK = '#0a1418';
const f = (n) => Math.round(n * 10) / 10;

const SKIN = { pale: '#f2d2b0', tan: '#d9a070', olive: '#c8a47a', brown: '#a86a42', deep: '#6e4128' };
const EYE = { blue: '#1f7aa8', green: '#2f9a5a', amber: '#c8861a', grey: '#6a7a86', violet: '#7a4ad0' };
const HAIR = { black: '#1a1a1a', brown: '#5a3418', ginger: '#b85a2a', white: '#eeece6', blond: '#e0b860' };
// wetsuit: [base, accent panel]
const SUIT = { black_blue: ['#1e2328', '#2f6fd0'], black_red: ['#1e2328', '#d8443a'], yellow: ['#f0c030', '#1e2328'], navy_orange: ['#1f2f5a', '#f07a2a'], camo: ['#4a5a36', '#2e3a22'], abyss_glow: ['#0a0f14', '#3affe0'] };
const FIN = { blue: ['#5aa0f0', '#1f5aa8'], yellow: ['#ffe066', '#d89a10'], black: ['#4a5058', '#15181a'], red: ['#ff7a6a', '#b8281e'] };
const TANK = { silver: ['#ffffff', '#c4cdd4', '#6a7580'], yellow: ['#fff2a0', '#f0c030', '#a87a10'], red: ['#ffb0a0', '#e0503a', '#8a2014'] };

function renderScene(t, seed, index, animate, WT) {
  const rng = mulberry32(((seed | 0) * 7919 + index * 104729 + 17) >>> 0);
  const R = (a, b) => a + rng() * (b - a);
  let defs = '', gid = 0; const pre = `v${String(seed).replace(/\W/g, '')}_${index}_`;
  const stopsXml = (stops) => stops.map(([o, c, op]) => `<stop offset="${o}" stop-color="${c}"${op != null ? ` stop-opacity="${op}"` : ''}/>`).join('');
  const radial = (stops, cx = '50%', cy = '50%', r = '60%') => { const id = pre + (gid++); defs += `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stopsXml(stops)}</radialGradient>`; return `url(#${id})`; };
  const linear = (stops, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => { const id = pre + (gid++); defs += `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stopsXml(stops)}</linearGradient>`; return `url(#${id})`; };
  const stroke = (sw, extra) => sw ? (/\bstroke="/.test(extra) ? '' : ` stroke="${INK}"`) + ` stroke-width="${sw}"` : (/\bstroke="/.test(extra) ? '' : ' stroke="none"');
  const P = (d, fill, sw = 6, extra = '') => `<path d="${d}" fill="${fill}"${stroke(sw, extra)} stroke-linejoin="round" stroke-linecap="round" ${extra}/>`;
  const C = (cx, cy, r, fill, sw = 6, extra = '') => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}" fill="${fill}"${stroke(sw, extra)} ${extra}/>`;
  const E = (cx, cy, rx, ry, fill, sw = 6, extra = '') => `<ellipse cx="${f(cx)}" cy="${f(cy)}" rx="${f(rx)}" ry="${f(ry)}" fill="${fill}"${stroke(sw, extra)} ${extra}/>`;
  const L = (d, color = INK, w = 4, op = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"/>`;
  // inked limb: dark outline stroke under a coloured stroke
  const limb = (d, w, color) => L(d, INK, w + 10) + L(d, color, w);
  const bubble = (x, y, r) => C(x, y, r, radial([[0, '#bff4ff', 0.05], [0.8, '#bff4ff', 0.2], [1, '#e8fcff', 0.65]]), 2.5, 'stroke="#d8f8ff"') + E(x - r * 0.35, y - r * 0.4, r * 0.3, r * 0.18, '#ffffff', 0, 'opacity="0.9"');

  const [SB, SA] = SUIT[t.suit];
  const shorty = t.cut === 'shorty';
  const sk = SKIN[t.skin];
  const legCol = shorty ? sk : SB, armCol = shorty ? sk : SB;
  const FN = FIN[t.fins], TK = TANK[t.tank];

  let out = '';
  // ---------- water + location ----------
  out += `<rect width="1000" height="1000" fill="${linear([[0, WT.stops[0]], [0.4, WT.stops[1]], [0.8, WT.stops[2]], [1, WT.stops[3]]])}"/>`;
  for (const [x, w, k] of [[180, 110, 1.2], [420, 70, 0.8], [640, 130, 1], [860, 80, 0.7]]) out += `<path d="M${x - w / 2} 0 L${x + w / 2} 0 L${x + w * 1.8} 1000 L${x - w * 0.6} 1000 Z" fill="#e8feff" opacity="${f(WT.ray * k * 100) / 100}"/>`;
  const coral = (x, y, h, col) => { const d = `M${x} ${y} L${x} ${y - h} M${x} ${y - h * 0.5} L${x - h * 0.45} ${y - h * 0.9} M${x} ${y - h * 0.3} L${x + h * 0.4} ${y - h * 0.8}`; let s = L(d, INK, 20) + L(d, col, 13); for (const [cx, cy] of [[x, y - h], [x - h * 0.45, y - h * 0.9], [x + h * 0.4, y - h * 0.8]]) s += C(cx, cy, 10, col, 5); return s; };
  const kelp = (x0, y0, h, sway, w) => {
    const segs = 8, pts = [];
    for (let i = 0; i <= segs; i++) { const tt = i / segs; pts.push([x0 + Math.sin(tt * 5 + sway) * 30 * tt, y0 - h * tt]); }
    let left = '', right = '';
    pts.forEach(([x, y], i) => { const ww = w * (1 - i / segs * 0.7); left += ` L${f(x - ww)} ${f(y)}`; right = ` L${f(x + ww)} ${f(y)}` + right; });
    let s = P(`M${f(pts[0][0] - w)} ${y0}` + left + right + ' Z', linear([[0, '#1f6b52'], [1, '#2f8f6a']], 0, 0, 1, 0), 4);
    for (let i = 2; i < segs; i += 2) { const [x, y] = pts[i]; s += P(`M${f(x)} ${f(y)} Q${f(x + 34)} ${f(y - 10)} ${f(x + 46)} ${f(y - 34)} Q${f(x + 20)} ${f(y - 20)} ${f(x)} ${f(y)} Z`, '#2a8060', 3); }
    return s;
  };
  const loc = t.location;
  if (loc === 'reef') {
    out += P('M-20 1020 L-20 520 C60 540 120 600 170 680 C220 760 300 820 380 880 C440 930 470 980 480 1020 Z', linear([[0, '#1f5a5a'], [1, '#0a2a30']], 0, 0, 1, 0), 6);
    out += coral(60, 640, 90, '#ff6a8a') + coral(150, 720, 70, '#ffa24a') + coral(250, 820, 80, '#c86aff') + coral(340, 900, 60, '#ff6a8a');
    for (const [x, y, rr] of [[110, 780, 40], [200, 870, 34], [30, 720, 30]]) out += E(x, y, rr, rr * 0.7, radial([[0, '#7fd0a0'], [1, '#2a7a5a']]), 5) + L(`M${x - rr * 0.6} ${y} Q${x} ${y - rr * 0.5} ${x + rr * 0.6} ${y}`, '#1a5a3a', 3, 0.7);
  } else if (loc === 'sunken_city') {
    const arches = (x, top, w) => { let s = P(`M${x} 1000 L${x} ${top} L${x + w} ${top} L${x + w} 1000 Z`, WT.city, 4, 'stroke="#061a24"'); for (let y = top + 30; y < 940; y += 70) for (let wx = x + 16; wx + 22 < x + w - 8; wx += 40) { const lit = rng() < 0.35; s += P(`M${wx} ${y + 40} L${wx} ${y + 12} A11 11 0 0 1 ${wx + 22} ${y + 12} L${wx + 22} ${y + 40} Z`, lit ? WT.win : '#061a24', 3, `stroke="#061a24" opacity="${lit ? 0.75 : 1}"`); } return s; };
    out += `<g opacity="0.8">${arches(0, 480, 190)}${arches(840, 560, 160)}</g>`;
    out += `<g transform="rotate(-18 200 1000)" opacity="0.7">${arches(170, 620, 120)}</g>`;
  } else if (loc === 'shipwreck') {
    out += `<g opacity="0.85"><g transform="rotate(10 140 900)">`;
    out += P('M-60 640 C80 600 260 620 330 690 L300 1010 L-60 1010 Z', linear([[0, '#5a3a22'], [1, '#2a1a0e']], 0, 0, 1, 0), 6);
    for (let y = 660; y < 1000; y += 34) out += L(`M-60 ${y} C80 ${y - 30} 220 ${y - 10} 320 ${y + 30}`, '#1a0f06', 3, 0.7);
    for (const [px, py] of [[40, 730], [150, 720], [250, 750]]) out += C(px, py, 22, '#1a2a2a', 6, 'stroke="#c8a060"') + C(px - 5, py - 5, 6, WT.win, 0, 'opacity="0.6"');
    out += `</g>` + L('M110 640 L230 120', INK, 28) + L('M110 640 L230 120', '#6a4a2a', 20) + P('M190 300 C240 340 300 330 320 400 C280 430 260 480 200 470 C230 410 200 360 190 300 Z', linear([[0, '#e8dcc0', 0.8], [1, '#b8a888', 0.6]]), 5) + `</g>`;
  } else { // kelp_forest
    for (const [x, h, w] of [[30, 760, 16], [120, 600, 13], [210, 520, 12], [880, 720, 16], [960, 580, 13], [790, 460, 11]]) out += kelp(x, 1020, h, R(0, 3), w);
  }
  out += P('M0 960 C200 945 400 968 600 955 C800 942 900 962 1000 955 L1000 1000 L0 1000 Z', linear([[0, '#c9b58a'], [1, '#7a6a48']]), 5);
  // companion
  const comp = t.companion;
  const fish = (x, y, s, col, flip, stripes) => `<g transform="translate(${f(x)} ${f(y)}) scale(${flip ? -s : s} ${s})">` + P('M-30 0 C-10 -22 26 -18 34 0 C26 18 -10 22 -30 0 Z', col, 4) + (stripes ? P('M-4 -18 C2 -6 2 6 -4 18 L6 18 C12 6 12 -6 6 -18 Z', '#ffffff', 3) + P('M16 -14 C20 -4 20 4 16 14 L22 12 C26 4 26 -4 22 -12 Z', '#ffffff', 3) : '') + P('M-28 0 L-48 -14 L-44 0 L-48 14 Z', col, 4) + C(24, -4, 5, '#ffffff', 3) + C(25, -4, 2.2, INK, 0) + '</g>';
  if (comp === 'clownfish') out += fish(800, 200, 1.4, '#ff7a1a', false, true) + fish(880, 270, 1.1, '#ff7a1a', false, true) + fish(740, 300, 0.9, '#ff7a1a', true, true);
  else if (comp === 'turtle') {
    const tx = 800, ty = 230;
    out += `<g transform="rotate(-14 ${tx} ${ty})">`;
    for (const [fx, fy, rot] of [[-70, -40, -40], [60, -44, 30], [-60, 44, 30], [56, 40, -30]]) out += E(tx + fx, ty + fy, 40, 16, '#7ab86a', 5, `transform="rotate(${rot} ${tx + fx} ${ty + fy})"`);
    out += E(tx + 100, ty, 30, 22, '#8ac87a', 5) + C(tx + 112, ty - 6, 5, '#ffffff', 3) + C(tx + 113, ty - 6, 2.4, INK, 0);
    out += E(tx, ty, 90, 60, radial([[0, '#b8d070'], [0.7, '#6a8a3a'], [1, '#3a5a1e']], '40%', '35%'), 7);
    for (const [px, py] of [[-40, -18], [0, -26], [40, -18], [-30, 20], [10, 22], [48, 14]]) out += P(`M${tx + px - 16} ${ty + py} L${tx + px} ${ty + py - 14} L${tx + px + 16} ${ty + py} L${tx + px} ${ty + py + 14} Z`, '#8aaa4a', 3);
    out += '</g>';
  } else if (comp === 'octopus') {
    const cx = 820, cy = 230;
    for (let k = 0; k < 6; k++) { const d = `M${cx + (k - 2.5) * 16} ${cy + 30} C${f(cx + (k - 2.5) * 40)} ${cy + 80} ${f(cx + (k - 2.5) * 56)} ${cy + 100} ${f(cx + (k - 2.5) * 64)} ${cy + 130 + (k % 2) * 24}`; out += L(d, INK, 18) + L(d, '#9a4ad0', 11); }
    out += P(`M${cx - 60} ${cy + 36} C${cx - 70} ${cy - 60} ${cx + 70} ${cy - 60} ${cx + 60} ${cy + 36} Q${cx} ${cy + 52} ${cx - 60} ${cy + 36} Z`, radial([[0, '#e8a8ff'], [0.7, '#9a4ad0'], [1, '#5a1a8a']], '40%', '35%'), 7);
    for (const ex of [cx - 22, cx + 22]) out += C(ex, cy + 8, 12, '#fff6d0', 4) + `<rect x="${ex - 6}" y="${cy + 4}" width="12" height="7" rx="3" fill="${INK}"/>`;
  } else if (comp === 'manta') {
    const cx = 780, cy = 200;
    out += P(`M${cx - 170} ${cy + 10} C${cx - 90} ${cy - 40} ${cx - 30} ${cy - 60} ${cx} ${cy - 50} C${cx + 30} ${cy - 60} ${cx + 90} ${cy - 40} ${cx + 170} ${cy + 10} C${cx + 90} ${cy + 20} ${cx + 40} ${cy + 40} ${cx} ${cy + 60} C${cx - 40} ${cy + 40} ${cx - 90} ${cy + 20} ${cx - 170} ${cy + 10} Z`, linear([[0, '#3a4a5a'], [1, '#12202a']]), 7);
    out += L(`M${cx} ${cy + 60} Q${cx + 10} ${cy + 140} ${cx - 20} ${cy + 200}`, INK, 6) + P(`M${cx - 26} ${cy - 52} L${cx - 16} ${cy - 80} L${cx - 6} ${cy - 50} Z M${cx + 26} ${cy - 52} L${cx + 16} ${cy - 80} L${cx + 6} ${cy - 50} Z`, '#2a3a4a', 4);
    out += E(cx, cy + 8, 60, 20, '#e8eef2', 0, 'opacity="0.25"');
  }
  if (comp !== 'clownfish') out += fish(120, 420, 0.9, '#5ad0ff', true, false);

  // ---------- body (upright local coords, rotated into the swim pose) ----------
  let diver = '';
  const ROT = -50, OX = 540, OY = 540;
  const rad = ROT * Math.PI / 180;
  const W = (x, y) => [OX + x * Math.cos(rad) - y * Math.sin(rad), OY + x * Math.sin(rad) + y * Math.cos(rad)];
  let b = '';
  // tank on the back, peeking out on the right side
  b += `<rect x="40" y="-330" width="96" height="290" rx="44" fill="${linear([[0, TK[0]], [0.4, TK[1]], [1, TK[2]]], 0, 0, 1, 0)}" stroke="${INK}" stroke-width="7"/>`;
  b += `<rect x="72" y="-360" width="32" height="34" rx="6" fill="${linear([[0, '#e1e4e8'], [1, '#5a6066']], 0, 0, 1, 0)}" stroke="${INK}" stroke-width="5"/>`;
  b += L('M50 -120 L126 -120', INK, 4, 0.5) + L('M60 -310 L60 -60', '#ffffff', 8, 0.35);
  // back arm (right, relaxed) — drawn before the torso
  b += limb('M88 -280 Q130 -190 118 -110', 46, armCol) + limb('M118 -110 Q112 -40 90 0', 38, armCol);
  if (shorty) b += limb('M88 -280 Q120 -220 124 -190', 50, SB);
  b += C(88, 8, 22, t.gloves === 'none' ? sk : '#1e2328', 6);
  // legs: back leg bent in a kick, front leg long
  const legs = [
    { hip: [40, 10], knee: [70, 240], ankle: [150, 430], back: true },
    { hip: [-40, 10], knee: [-40, 250], ankle: [-10, 460], back: false }
  ];
  for (const g of legs.sort((a, c) => (a.back ? -1 : 1))) {
    const [hx, hy] = g.hip, [kx, ky] = g.knee, [ax, ay] = g.ankle;
    b += limb(`M${hx} ${hy} L${kx} ${ky}`, 66, legCol) + limb(`M${kx} ${ky} L${ax} ${ay}`, 50, legCol);
    if (shorty) b += limb(`M${hx} ${hy} L${hx + (kx - hx) * 0.55} ${hy + (ky - hy) * 0.55}`, 70, SB);
    else b += L(`M${hx + (kx - hx) * 0.2} ${hy + (ky - hy) * 0.2} L${kx} ${ky}`, SA, 10, 0.9); // accent stripe
    b += C(kx, ky, 12, '#2a2e32', 0, 'opacity="0.5"'); // knee pad
    // fin: long blade continuing the shin direction
    const dx = ax - kx, dy = ay - ky, len = Math.hypot(dx, dy), ux = dx / len, uy = dy / len, px = -uy, py = ux;
    const tipX = ax + ux * 230, tipY = ay + uy * 230;
    const fin = `M${f(ax - px * 30)} ${f(ay - py * 30)} L${f(tipX - px * 62)} ${f(tipY - py * 62)} Q${f(tipX + ux * 20)} ${f(tipY + uy * 20)} ${f(tipX + px * 62)} ${f(tipY + py * 62)} L${f(ax + px * 30)} ${f(ay + py * 30)} Z`;
    b += P(fin, linear([[0, FN[0]], [1, FN[1]]], 0, 0, 1, 1), 7);
    if (t.fins !== 'black') b += L(`M${f(ax)} ${f(ay)} L${f(tipX)} ${f(tipY)}`, FN[1], 5, 0.8);
    for (const s of [-1, 1]) b += L(`M${f(ax + ux * 60 + px * s * 22)} ${f(ay + uy * 60 + py * s * 22)} L${f(tipX - ux * 20 + px * s * 44)} ${f(tipY - uy * 20 + py * s * 44)}`, '#ffffff', 3, 0.35);
    b += P(`M${f(ax - px * 32 - ux * 20)} ${f(ay - py * 32 - uy * 20)} L${f(ax + px * 32 - ux * 20)} ${f(ay + py * 32 - uy * 20)} L${f(ax + px * 30 + ux * 40)} ${f(ay + py * 30 + uy * 40)} L${f(ax - px * 30 + ux * 40)} ${f(ay - py * 30 + uy * 40)} Z`, '#1e2328', 6); // foot pocket
  }
  // torso (wetsuit) + accent side panel
  const torso = 'M-100 -300 C-110 -220 -76 -130 -70 -60 C-72 -20 -66 10 -60 20 L60 20 C66 10 72 -20 70 -60 C76 -130 110 -220 100 -300 C60 -322 -60 -322 -100 -300 Z';
  b += P(torso, linear([[0, SB], [1, SB]]), 8);
  b += P('M-100 -300 C-110 -220 -76 -130 -70 -60 L-50 -60 C-60 -140 -80 -230 -76 -304 Z', SA, 0, 'opacity="0.95"');
  b += P('M100 -300 C110 -220 76 -130 70 -60 L50 -60 C60 -140 80 -230 76 -304 Z', SA, 0, 'opacity="0.95"');
  b += L('M0 -300 L0 -40', '#000000', 3, 0.3); // zip
  if (t.suit === 'abyss_glow') b += L('M-88 -300 C-94 -220 -66 -130 -60 -60 M88 -300 C94 -220 66 -130 60 -60', '#3affe0', 22, 0.35);
  // BCD vest + straps
  b += P('M-96 -290 L-40 -300 L-30 -120 L-80 -110 Z', '#15181c', 6) + P('M96 -290 L40 -300 L30 -120 L80 -110 Z', '#15181c', 6);
  b += `<rect x="-86" y="-180" width="50" height="56" rx="8" fill="#23282e" stroke="${INK}" stroke-width="5"/>` + `<rect x="36" y="-180" width="50" height="56" rx="8" fill="#23282e" stroke="${INK}" stroke-width="5"/>`;
  b += L('M-80 -230 L80 -230', INK, 16) + L('M-80 -230 L80 -230', '#2a2e34', 10) + `<rect x="-16" y="-240" width="32" height="20" rx="4" fill="#9aa0a8" stroke="${INK}" stroke-width="4"/>`;
  // weight belt
  b += `<rect x="-78" y="-40" width="156" height="30" rx="6" fill="#23282e" stroke="${INK}" stroke-width="6"/>`;
  for (const x of [-60, -30, 30]) b += `<rect x="${x}" y="-44" width="26" height="38" rx="4" fill="#6a7078" stroke="${INK}" stroke-width="4"/>`;
  b += `<rect x="-6" y="-46" width="30" height="42" rx="4" fill="#c4cdd4" stroke="${INK}" stroke-width="4"/>`;
  // inflator hose over the left shoulder + gauge console hanging off the side
  b += L('M-84 -300 C-130 -260 -140 -200 -120 -150', INK, 18) + L('M-84 -300 C-130 -260 -140 -200 -120 -150', '#2a2e34', 11);
  b += L('M-70 -90 C-120 -40 -150 10 -150 60', INK, 10) + L('M-70 -90 C-120 -40 -150 10 -150 60', '#2a2e34', 5);
  b += `<rect x="-184" y="56" width="68" height="84" rx="16" fill="#23282e" stroke="${INK}" stroke-width="6"/>` + C(-150, 86, 20, '#f4f2e8', 4) + L('M-150 86 L-140 74', '#d8443a', 3) + C(-150, 122, 10, '#f4f2e8', 3);
  // front arm (left) reaching forward with the held item
  b += limb('M-88 -280 Q-170 -200 -190 -120', 48, armCol) + limb('M-190 -120 Q-200 -40 -160 20', 40, armCol);
  if (shorty) b += limb('M-88 -280 Q-130 -240 -146 -214', 52, SB);
  b += C(-156, 34, 24, t.gloves === 'none' ? sk : '#1e2328', 6);
  if (t.held === 'torch') {
    b += `<g transform="rotate(20 -156 60)"><rect x="-176" y="30" width="40" height="110" rx="10" fill="#2a2e34" stroke="${INK}" stroke-width="6"/><rect x="-184" y="130" width="56" height="30" rx="8" fill="#c4cdd4" stroke="${INK}" stroke-width="5"/>` + C(-156, 160, 20, '#fff6c8', 4) + '</g>';
  } else if (t.held === 'camera') {
    b += `<rect x="-230" y="10" width="140" height="92" rx="14" fill="#2a2e34" stroke="${INK}" stroke-width="7"/>` + C(-160, 56, 30, '#1a2228', 6) + C(-160, 56, 18, radial([[0, '#7fd8ff'], [1, '#0a3a5a']]), 3) + C(-166, 50, 5, '#ffffff', 0);
    b += `<rect x="-120" y="-8" width="30" height="20" rx="4" fill="#d8443a" stroke="${INK}" stroke-width="4"/>`;
    b += L('M-230 30 L-270 -10', INK, 8) + C(-276, -16, 16, '#fff6c8', 4);
  } else if (t.held === 'spear') {
    b += L('M-156 -260 L-156 260', INK, 14) + L('M-156 -260 L-156 260', '#9aa0a8', 8) + P('M-156 -300 L-170 -254 L-142 -254 Z', '#e1e4e8', 5);
  }
  diver += `<g transform="translate(${OX} ${OY}) rotate(${ROT})">${b}</g>`;
  if (t.held === 'torch') {
    // light beam from the torch
    const [bx, by] = W(-150, 190);
    diver += `<path d="M${f(bx)} ${f(by)} L${f(bx - 380)} ${f(by + 260)} L${f(bx - 120)} ${f(by + 420)} Z" fill="${radial([[0, '#fff6c8', 0.55], [1, '#fff6c8', 0]], '0%', '0%', '100%')}"/>`;
  }

  // ---------- head (near-upright, facing the viewer) ----------
  const [nx, ny] = W(0, -330);
  const HX = nx - 26, HY = ny - 70; // head centre, set forward of the neck
  let h = '';
  // neck (wetsuit collar / hood)
  h += limb(`M${f(nx)} ${f(ny)} L${f(HX + 6)} ${f(HY + 60)}`, 60, t.hood ? SB : sk);
  // head + hair or hood
  h += E(HX, HY, 82, 100, radial([[0, sk], [0.75, sk], [1, '#5a3420']], '40%', '35%', '80%'), 8);
  if (t.hood) {
    h += P(`M${HX - 88} ${HY + 20} C${HX - 100} ${HY - 110} ${HX + 100} ${HY - 110} ${HX + 88} ${HY + 20} C${HX + 80} ${HY + 70} ${HX + 60} ${HY + 96} ${HX + 40} ${HY + 104} L${HX + 50} ${HY + 60} C${HX + 60} ${HY} ${HX + 40} ${HY - 60} ${HX} ${HY - 62} C${HX - 40} ${HY - 60} ${HX - 60} ${HY} ${HX - 50} ${HY + 60} L${HX - 40} ${HY + 104} C${HX - 60} ${HY + 96} ${HX - 80} ${HY + 70} ${HX - 88} ${HY + 20} Z`, SB, 7);
  } else {
    h += P(`M${HX - 82} ${HY - 10} C${HX - 90} ${HY - 110} ${HX + 90} ${HY - 116} ${HX + 82} ${HY - 10} C${HX + 60} ${HY - 60} ${HX - 20} ${HY - 50} ${HX - 82} ${HY - 10} Z`, HAIR[t.hair], 7);
    for (let i = 0; i < 5; i++) h += L(`M${HX - 50 + i * 24} ${HY - 80} q8 12 4 26`, '#000000', 2.5, 0.25);
    h += E(HX - 84, HY + 14, 12, 20, sk, 6); // ear
  }
  // mask strap
  h += L(`M${HX - 86} ${HY - 18} C${HX - 40} ${HY - 34} ${HX + 40} ${HY - 34} ${HX + 86} ${HY - 18}`, INK, 16) + L(`M${HX - 86} ${HY - 18} C${HX - 40} ${HY - 34} ${HX + 40} ${HY - 34} ${HX + 86} ${HY - 18}`, t.maskColor, 9);
  // eyes/brows first (seen through the mask glass)
  const eyeHex = EYE[t.eyeColor], hair = HAIR[t.hair];
  const eY = HY - 6;
  const eye = (ex, er) => {
    const white = C(ex, eY, er, radial([[0, '#ffffff'], [1, '#d8d2c4']]), 5);
    const iris = C(ex + 2, eY + 2, er * 0.58, radial([[0, '#ffffff'], [0.25, eyeHex], [1, '#0a2030']]), 2.5) + C(ex + 2, eY + 2, er * 0.26, INK, 0) + C(ex - 3, eY - 4, er * 0.2, '#ffffff', 0);
    if (t.eyes === 'sleepy') return white + iris + P(`M${ex - er - 2} ${eY} A${er + 2} ${er + 2} 0 0 1 ${ex + er + 2} ${eY} Z`, sk, 5) + L(`M${ex - er} ${eY} L${ex + er} ${eY}`, INK, 4);
    if (t.eyes === 'squint') return L(`M${ex - er} ${eY + 3} Q${ex} ${eY - 10} ${ex + er} ${eY + 3}`, INK, 5);
    if (t.eyes === 'tiny') return C(ex, eY, er * 0.7, radial([[0, '#ffffff'], [1, '#d8d2c4']]), 4) + C(ex + 2, eY + 1, er * 0.18, INK, 0);
    return white + iris;
  };
  h += t.eyes === 'mismatched' ? eye(HX - 30, 24) + eye(HX + 30, 15) : eye(HX - 30, 19) + eye(HX + 30, 17);
  const brow = (x, dir) => {
    if (t.brows === 'bushy') return P(`M${x - dir * 24} ${eY - 22} Q${x} ${eY - 38} ${x + dir * 22} ${eY - 22} Q${x} ${eY - 28} ${x - dir * 24} ${eY - 22} Z`, hair, 4);
    if (t.brows === 'thin') return L(`M${x - dir * 20} ${eY - 26} Q${x} ${eY - 34} ${x + dir * 18} ${eY - 26}`, hair, 4);
    if (t.brows === 'angry') return P(`M${x - dir * 24} ${eY - 36} L${x + dir * 18} ${eY - 22} L${x + dir * 16} ${eY - 16} L${x - dir * 24} ${eY - 28} Z`, hair, 4);
    if (t.brows === 'raised') return P(`M${x - dir * 22} ${eY - 26} Q${x} ${eY - 48} ${x + dir * 20} ${eY - 28} Q${x} ${eY - 40} ${x - dir * 22} ${eY - 26} Z`, hair, 4);
    return '';
  };
  h += t.brows === 'unibrow' ? P(`M${HX - 56} ${eY - 24} Q${HX - 28} ${eY - 40} ${HX} ${eY - 28} Q${HX + 28} ${eY - 40} ${HX + 56} ${eY - 24} Q${HX + 28} ${eY - 30} ${HX} ${eY - 18} Q${HX - 28} ${eY - 30} ${HX - 56} ${eY - 24} Z`, hair, 4) : brow(HX - 30, 1) + brow(HX + 30, -1);
  // mask: frame + tinted glass over eyes and nose
  const maskD = `M${HX - 66} ${eY - 40} C${HX - 30} ${eY - 52} ${HX + 30} ${eY - 52} ${HX + 66} ${eY - 40} C${HX + 74} ${eY - 10} ${HX + 66} ${eY + 26} ${HX + 44} ${eY + 32} C${HX + 24} ${eY + 36} ${HX + 16} ${eY + 44} ${HX} ${eY + 48} C${HX - 16} ${eY + 44} ${HX - 24} ${eY + 36} ${HX - 44} ${eY + 32} C${HX - 66} ${eY + 26} ${HX - 74} ${eY - 10} ${HX - 66} ${eY - 40} Z`;
  h += P(maskD, radial([[0, '#bff4ff', 0.08], [0.8, '#7fd8ff', 0.2], [1, '#bff4ff', 0.4]]), 0) + P(maskD, 'none', 12, `stroke="${t.maskColor}"`) + P(maskD, 'none', 3);
  h += L(`M${HX - 50} ${eY - 30} L${HX - 20} ${eY - 36}`, '#ffffff', 6, 0.7) + L(`M${HX + 40} ${eY + 14} L${HX + 50} ${eY - 4}`, '#ffffff', 4, 0.5);
  // nose inside the mask's nose pocket
  h += P(`M${HX} ${eY + 12} C${HX - 16} ${eY + 32} ${HX - 12} ${eY + 44} ${HX + 2} ${eY + 44} C${HX + 16} ${eY + 44} ${HX + 14} ${eY + 30} ${HX} ${eY + 12} Z`, sk, 4);
  // mustache between nose and regulator
  const mY = HY + 50;
  if (t.mustache === 'walrus') h += P(`M${HX - 52} ${mY + 8} C${HX - 44} ${mY - 12} ${HX - 16} ${mY - 12} ${HX} ${mY - 4} C${HX + 16} ${mY - 12} ${HX + 44} ${mY - 12} ${HX + 52} ${mY + 8} C${HX + 30} ${mY + 20} ${HX + 10} ${mY + 12} ${HX} ${mY + 8} C${HX - 10} ${mY + 12} ${HX - 30} ${mY + 20} ${HX - 52} ${mY + 8} Z`, hair, 5);
  else if (t.mustache === 'handlebar') h += P(`M${HX} ${mY - 2} C${HX - 20} ${mY - 10} ${HX - 44} ${mY} ${HX - 52} ${mY - 10} C${HX - 62} ${mY - 20} ${HX - 58} ${mY - 30} ${HX - 50} ${mY - 26} C${HX - 56} ${mY - 18} ${HX - 44} ${mY - 10} ${HX - 30} ${mY + 6} C${HX - 16} ${mY + 12} ${HX - 6} ${mY + 8} ${HX} ${mY + 6} C${HX + 6} ${mY + 8} ${HX + 16} ${mY + 12} ${HX + 30} ${mY + 6} C${HX + 44} ${mY - 10} ${HX + 56} ${mY - 18} ${HX + 50} ${mY - 26} C${HX + 58} ${mY - 30} ${HX + 62} ${mY - 20} ${HX + 52} ${mY - 10} C${HX + 44} ${mY} ${HX + 20} ${mY - 10} ${HX} ${mY - 2} Z`, hair, 4);
  else if (t.mustache === 'pencil') h += L(`M${HX - 30} ${mY} Q${HX} ${mY - 6} ${HX + 30} ${mY}`, hair, 5);
  else if (t.mustache === 'chevron') h += P(`M${HX - 36} ${mY + 8} C${HX - 36} ${mY - 10} ${HX + 36} ${mY - 10} ${HX + 36} ${mY + 8} L${HX + 24} ${mY + 6} C${HX + 10} ${mY + 2} ${HX - 10} ${mY + 2} ${HX - 24} ${mY + 6} Z`, hair, 4);
  // regulator in the mouth + hose back to the tank
  const [vx, vy] = W(88, -350);
  h += L(`M${HX + 30} ${HY + 94} C${HX + 90} ${HY + 120} ${f(vx - 40)} ${f(vy + 40)} ${f(vx)} ${f(vy)}`, INK, 18) + L(`M${HX + 30} ${HY + 94} C${HX + 90} ${HY + 120} ${f(vx - 40)} ${f(vy + 40)} ${f(vx)} ${f(vy)}`, '#2a2e34', 11);
  h += P(`M${HX - 34} ${HY + 76} C${HX - 36} ${HY + 116} ${HX + 36} ${HY + 116} ${HX + 34} ${HY + 76} Z`, '#23282e', 6);
  h += C(HX, HY + 84, 16, '#3a4048', 4) + C(HX, HY + 84, 7, t.maskColor, 0);
  h += P(`M${HX - 22} ${HY + 110} C${HX - 30} ${HY + 134} ${HX + 30} ${HY + 134} ${HX + 22} ${HY + 110} Z`, '#15181c', 5); // exhaust tee
  diver += `<g transform="rotate(-12 ${f(HX)} ${f(HY)}) translate(${f(HX)} ${f(HY)}) scale(1.2) translate(${f(-HX)} ${f(-HY)})">${h}</g>`;
  // exhaled bubbles rising from the regulator
  // exhaled bubbles rise from the regulator's side exhaust, clear of the face
  let bub = '';
  for (let i = 0; i < 9; i++) bub += bubble(HX + 120 + R(-18, 18) + i * 4, HY + 20 - i * 40 - R(0, 16), R(6, 18) - i * 0.6);
  diver += animate ? `<g>${bub}<animateTransform attributeName="transform" type="translate" values="0 30;0 -40;0 30" dur="${f(R(3.5, 5.5))}s" repeatCount="indefinite"/></g>` : bub;
  // whole diver scaled down so the fins stay inside the frame
  out += `<g transform="translate(110 70) scale(0.78)">${diver}</g>`;

  // ---------- particles + vignette ----------
  for (let i = 0; i < 90; i++) out += C(R(0, 1000), R(0, 1000), R(0.8, 2.4), '#e8fcff', 0, `opacity="${f(R(0.2, 0.7))}"`);
  out += `<rect width="1000" height="1000" fill="${radial([[0.55, '#021018', 0], [1, '#021018', 0.5]], '50%', '48%', '72%')}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 1000 1000"><defs>${defs}</defs>${out}</svg>`;
}


function renderFromTraits(picks, index, seed, opts) {
  const hood = picks.hair.id === 'hood';
  const t = {
    location: picks.location.id, companion: picks.companion.id,
    skin: picks.skin.id, eyes: picks.eyes.id, eyeColor: picks.eyeColor.id, brows: picks.brows.id, mustache: picks.mustache.id,
    hair: hood ? 'black' : picks.hair.id, hood, maskColor: picks.maskColor.hex,
    suit: picks.wetsuit.id, cut: picks.cut.id, gloves: 'black', fins: picks.fins.id, tank: picks.tank.id, held: picks.held.id
  };
  return renderScene(t, seed ?? 0, index, !!(opts && opts.animate), WATER[picks.water.id] || WATER.shallows);
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
