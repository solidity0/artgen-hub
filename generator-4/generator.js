// ============================================================
// Chalkbots — Generative Trait Engine v2 "Riso Chalk"
// Chalk-line bot + optional companion. v2 keeps the hand-drawn chalk line but
// adds colour and depth: a bodyColor trait (riso-style offset fills with
// halftone shading, rare chrome/gold/holo finishes), pastel and midnight
// backgrounds with a soft halo, chunkier proportions, outlined tube limbs,
// filled hands/feet, drop + ground shadows, blush and glowing coloured eyes.
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: inlined into index.html by build.js -> window.ChalkbotsGen
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
const TRAITS = {
  background: [
    { id: 'cream', hex: '#F2E9D8', weight: 42, rarity: 'common' },
    { id: 'white', hex: '#FFFFFF', weight: 38, rarity: 'common' },
    { id: 'black', hex: '#141414', weight: 12, rarity: 'rare' },
    { id: 'deep_black', hex: '#000000', weight: 8, rarity: 'rare' },
    { id: 'sage',     hex: '#DCE8D2', weight: 30, rarity: 'common' },
    { id: 'blush',    hex: '#F6DAD3', weight: 30, rarity: 'common' },
    { id: 'powder',   hex: '#D5E5F4', weight: 28, rarity: 'common' },
    { id: 'lemon',    hex: '#F6EEC2', weight: 24, rarity: 'uncommon' },
    { id: 'lavender', hex: '#E3DAF5', weight: 22, rarity: 'uncommon' },
    { id: 'midnight', hex: '#1B1F3B', weight: 8,  rarity: 'rare' }
  ],
  bodyColor: [
    { id: 'classic',   weight: 6, rarity: 'common' },               // unfilled: the v1 look
    { id: 'tomato',    hex: '#FF5A45', weight: 7, rarity: 'common' },
    { id: 'tangerine', hex: '#FF9124', weight: 7, rarity: 'common' },
    { id: 'butter',    hex: '#FFD23F', weight: 7, rarity: 'common' },
    { id: 'lime',      hex: '#A6E34B', weight: 7, rarity: 'common' },
    { id: 'mint',      hex: '#6FDDB8', weight: 7, rarity: 'common' },
    { id: 'teal',      hex: '#1FA7A0', weight: 7, rarity: 'common' },
    { id: 'sky',       hex: '#6EC1FF', weight: 7, rarity: 'common' },
    { id: 'cobalt',    hex: '#3F63F0', weight: 7, rarity: 'common' },
    { id: 'orchid',    hex: '#C05CE8', weight: 7, rarity: 'common' },
    { id: 'snow',      hex: '#F3F2ED', weight: 6, rarity: 'common' },
    { id: 'charcoal',  hex: '#3B3E48', weight: 6, rarity: 'common' },
    { id: 'bubblegum', hex: '#FF8FC8', weight: 4, rarity: 'uncommon' },
    { id: 'magenta',   hex: '#D1348F', weight: 4, rarity: 'uncommon' },
    { id: 'cherry',    hex: '#C8202F', weight: 4, rarity: 'uncommon' },
    { id: 'cocoa',     hex: '#8A5A3B', weight: 4, rarity: 'uncommon' },
    { id: 'olive',     hex: '#8C9A3E', weight: 4, rarity: 'uncommon' },
    { id: 'forest',    hex: '#2E8B57', weight: 4, rarity: 'uncommon' },
    { id: 'navy',      hex: '#243B7A', weight: 4, rarity: 'uncommon' },
    { id: 'plum',      hex: '#7A2E73', weight: 4, rarity: 'uncommon' },
    { id: 'steel',     hex: '#9AA6B4', weight: 4, rarity: 'uncommon' },
    { id: 'chrome',    hex: '#C9CED6', weight: 1.5, rarity: 'rare' },
    { id: 'gold',      hex: '#F2C14E', weight: 1.5, rarity: 'rare' },
    { id: 'holo',      hex: '#C7B8FF', weight: 1.2, rarity: 'rare' },
    { id: 'rose_gold', hex: '#E8A598', weight: 1.2, rarity: 'rare' },
    { id: 'purple',    hex: '#6B3FD1', weight: 1.2, rarity: 'rare' },
    { id: 'obsidian',  hex: '#2B2640', weight: 1,   rarity: 'rare' },
    { id: 'aurora',    hex: '#6FE3C5', weight: 1,   rarity: 'rare' }
  ],
  companionColor: [
    { id: 'none',   weight: 0,  rarity: 'common' },                 // only when there is no companion
    { id: 'snow',   hex: '#FAFAF7', weight: 24, rarity: 'common' },
    { id: 'ginger', hex: '#F29B4B', weight: 22, rarity: 'common' },
    { id: 'gray',   hex: '#A9ADB5', weight: 18, rarity: 'common' },
    { id: 'cream',  hex: '#F3E3C3', weight: 16, rarity: 'common' },
    { id: 'cocoa',  hex: '#9A6B4B', weight: 12, rarity: 'uncommon' },
    { id: 'ink',    hex: '#34343C', weight: 10, rarity: 'uncommon' },
    { id: 'pink',   hex: '#FFB7CF', weight: 6,  rarity: 'rare' },
    { id: 'blue',   hex: '#9CCBFF', weight: 5,  rarity: 'rare' },
    { id: 'golden', hex: '#F7C948', weight: 4,  rarity: 'rare' }
  ],
  hair: [
    { id: 'short_spike',  weight: 30, rarity: 'common' },
    { id: 'tall_spike',   weight: 25, rarity: 'common' },
    { id: 'wild_spike',   weight: 20, rarity: 'uncommon' },
    { id: 'mohawk_spike', weight: 15, rarity: 'uncommon' },
    { id: 'none',         weight: 10, rarity: 'rare' }
  ],
  ears: [
    { id: 'round_oval',     weight: 34, rarity: 'common' },
    { id: 'pointed',        weight: 26, rarity: 'common' },
    { id: 'antenna_dish',   weight: 16, rarity: 'uncommon' },
    { id: 'none',           weight: 10, rarity: 'uncommon' },
    { id: 'large_round',    weight: 8,  rarity: 'rare' },
    { id: 'jagged_broken',  weight: 6,  rarity: 'rare' }
  ],
  eyes: [
    { id: 'ring_plain',  weight: 30, rarity: 'common' },
    { id: 'spiral',      weight: 28, rarity: 'common' },
    { id: 'ring_double', weight: 18, rarity: 'uncommon' },
    { id: 'asymmetric',  weight: 14, rarity: 'uncommon' },
    { id: 'void',        weight: 10, rarity: 'rare' }
  ],
  eyeColor: [
    { id: 'default', weight: 60, rarity: 'common' },
    { id: 'blue',    hex: '#3aa0ff', weight: 16, rarity: 'uncommon' },
    { id: 'red',     hex: '#ff3b3b', weight: 14, rarity: 'uncommon' },
    { id: 'orange',  hex: '#ff8c1a', weight: 10, rarity: 'rare' }
  ],
  mouth: [
    { id: 'stitches_even',   weight: 32, rarity: 'common' },
    { id: 'stitches_uneven', weight: 26, rarity: 'common' },
    { id: 'zipper',          weight: 18, rarity: 'uncommon' },
    { id: 'single_line',     weight: 14, rarity: 'uncommon' },
    { id: 'fangs_stitch',    weight: 10, rarity: 'rare' }
  ],
  chestMark: [
    { id: 'x_cross',       weight: 32, rarity: 'common' },
    { id: 'slash',         weight: 16, rarity: 'uncommon' },
    { id: 'circle_target', weight: 12, rarity: 'uncommon' },
    { id: 'emoji_fire',    weight: 10, rarity: 'uncommon', emoji: '\u{1F525}' },
    { id: 'emoji_heart',   weight: 9,  rarity: 'uncommon', emoji: '\u2764\uFE0F' },
    { id: 'emoji_star',    weight: 8,  rarity: 'uncommon', emoji: '\u2B50' },
    { id: 'emoji_rocket',  weight: 8,  rarity: 'uncommon', emoji: '\u{1F680}' },
    { id: 'blank',         weight: 6,  rarity: 'rare' },
    { id: 'skull_small',   weight: 4,  rarity: 'rare' },
    { id: 'emoji_100',     weight: 4,  rarity: 'rare', emoji: '\u{1F4AF}' },
    { id: 'emoji_skull',   weight: 4,  rarity: 'rare', emoji: '\u{1F480}' },
    { id: 'emoji_ghost',   weight: 3,  rarity: 'rare', emoji: '\u{1F47B}' },
    { id: 'emoji_rainbow', weight: 2,  rarity: 'rare', emoji: '\u{1F308}' },
    { id: 'emoji_broken_heart', weight: 3, rarity: 'rare', emoji: '\u{1F494}' },
    { id: 'emoji_blast',        weight: 3, rarity: 'rare', emoji: '\u{1F4A5}' }
  ],
  hands: [
    { id: 'mitten_bow',  weight: 45, rarity: 'common' },
    { id: 'claw',        weight: 28, rarity: 'uncommon' },
    { id: 'round_paw',   weight: 17, rarity: 'uncommon' },
    { id: 'broken_stub', weight: 10, rarity: 'rare' },
    { id: 'pincer',       weight: 22, rarity: 'uncommon' },
    { id: 'three_finger', weight: 18, rarity: 'uncommon' },
    { id: 'hook',         weight: 7,  rarity: 'rare' },
    { id: 'magnet',       weight: 7,  rarity: 'rare' },
    { id: 'plug',         weight: 6,  rarity: 'rare' }
  ],
  headShape: [
    { id: 'box',     weight: 30, rarity: 'common' },
    { id: 'round',   weight: 24, rarity: 'common' },
    { id: 'tv',      weight: 14, rarity: 'uncommon' },
    { id: 'dome',    weight: 12, rarity: 'uncommon' },
    { id: 'capsule', weight: 10, rarity: 'uncommon' },
    { id: 'hex',     weight: 6,  rarity: 'rare' },
    { id: 'octagon', weight: 5,  rarity: 'rare' }
  ],
  bodyShape: [
    { id: 'box',       weight: 30, rarity: 'common' },
    { id: 'round',     weight: 22, rarity: 'common' },
    { id: 'barrel',    weight: 16, rarity: 'uncommon' },
    { id: 'trapezoid', weight: 12, rarity: 'uncommon' },
    { id: 'bell',      weight: 8,  rarity: 'uncommon' },
    { id: 'octagon',   weight: 6,  rarity: 'rare' },
    { id: 'capsule',   weight: 6,  rarity: 'rare' }
  ],
  arms: [
    { id: 'tube',     weight: 36, rarity: 'common' },
    { id: 'jointed',  weight: 22, rarity: 'common' },
    { id: 'spring',   weight: 14, rarity: 'uncommon' },
    { id: 'telescopic', weight: 12, rarity: 'uncommon' },
    { id: 'floating',   weight: 6,  rarity: 'rare' },       // always paired with pincer hands
    { id: 'on_floor', weight: 8,  rarity: 'rare' },
    { id: 'broken',   weight: 8,  rarity: 'rare' }
  ],
  feet: [
    { id: 'oval_shoes',   weight: 38, rarity: 'common' },
    { id: 'pointed_shoes',weight: 24, rarity: 'common' },
    { id: 'round_stubs',  weight: 16, rarity: 'uncommon' },
    { id: 'robot_blocks', weight: 12, rarity: 'uncommon' },
    { id: 'claw_feet',    weight: 6,  rarity: 'rare' },
    { id: 'peg_legs',     weight: 4,  rarity: 'rare' }
  ],
  sky: [
    { id: 'none',  weight: 50, rarity: 'common' },
    { id: 'star',  weight: 35, rarity: 'uncommon' },
    { id: 'comet', weight: 15, rarity: 'rare' }
  ],
  ground: [
    { id: 'light_scribble',  weight: 40, rarity: 'common' },
    { id: 'medium_scribble', weight: 35, rarity: 'common' },
    { id: 'heavy_scribble',  weight: 20, rarity: 'uncommon' },
    { id: 'scorched',        weight: 5,  rarity: 'rare' }
  ],
  grassColor: [
    { id: 'default', weight: 60, rarity: 'common' },
    { id: 'green',   hex: '#3fa34d', weight: 26, rarity: 'uncommon' },
    { id: 'white',   hex: '#ffffff', weight: 14, rarity: 'rare' }
  ],
  companion: [
    { id: 'none',      weight: 60, rarity: 'common' },
    { id: 'cat',       weight: 15, rarity: 'uncommon' },
    { id: 'dog',       weight: 13, rarity: 'uncommon' },
    { id: 'bird',      weight: 7,  rarity: 'uncommon' },
    { id: 'cat_ghost', weight: 3,  rarity: 'rare' },
    { id: 'bunny',     weight: 2,  rarity: 'rare' }
  ]
};

// Two-tone bots: headColor is either 'matching' (head uses the body colour) or its own colour
// from the body palette. Built from bodyColor so the two lists never drift apart.
TRAITS.headColor = [{ id: 'matching', weight: 36, rarity: 'common' }].concat(
  TRAITS.bodyColor.filter((c) => c.id !== 'classic').map((c) => ({ id: c.id, hex: c.hex, weight: c.rarity === 'rare' ? 0.5 : c.rarity === 'uncommon' ? 1.6 : 3, rarity: c.rarity }))
);

const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  const order = TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare'];
  for (const t of order) {
    const sub = pool.filter((p) => p.rarity === t);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#', ''), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r; g = Math.round((t - g) * p) + g; b = Math.round((t - b) * p) + b;
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea', robinhood: '#00c805' };

// ---------- drawing helpers ----------
// Chalk strokes need three things clean vector lines don't have: waviness
// ALONG the line (not just at the corners), inconsistent pressure (opacity
// and width vary pass to pass), and chalk dust grain.
function rj(rng, v = 2) { return (rng() - 0.5) * v * 2; }
function jitterPt(pt, rng, amt) { return [pt[0] + rj(rng, amt / 2), pt[1] + rj(rng, amt / 2)]; }
// Insert intermediate points along each segment so jitter can wobble the
// MIDDLE of a line, not just its endpoints — a 2-point line jittered only at
// its ends still renders as a dead-straight segment.
function subdivide(points, segLen = 16) {
  const out = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1], [x1, y1] = points[i];
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.max(1, Math.round(dist / segLen));
    for (let s = 1; s <= n; s++) {
      const t = s / n;
      out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
    }
  }
  return out;
}
function chalkLine(points, rng, amt = 3) { return subdivide(points).map((p) => jitterPt(p, rng, amt)); }
function pathD(points) { return 'M ' + points.map((p) => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L '); }
// Chalk sticks are fat and leave a thick, uneven mark — the reference is
// nowhere near thin single-pixel linework.
const BASE_WIDTH = { stroke: 4.2, strokeThick: 6, strokeThin: 2.2, strokeGhost: 3, strokeMid: 3 };
// 4 overlapping passes per line, each independently jittered with a WIDE
// divergence and its own opacity/width — the reference shows a stick
// re-dragged over roughly (not exactly) the same path several times, with
// the individual passes visibly splitting apart rather than staying tight.
function doubleStroke(points, rng, amt, cls, colorOverride) {
  const base = BASE_WIDTH[cls] || 2.2;
  let out = '';
  const colorCss = colorOverride ? ('stroke:' + colorOverride + ';') : '';
  // Solid anchor pass, close to the true path — this is the sharp, controlled
  // line. Heavy overall jitter (even with an opaque core) still reads as
  // visual fuzz at a glance, especially at small sizes where the eye can't
  // resolve individual wobbles and just perceives an aggregate haze. Keeping
  // the anchor tight to the path is what actually reads as "sharp."
  const anchor = chalkLine(points, rng, amt * 0.16);
  out += '<path d="' + pathD(anchor) + '" class="' + cls + '" fill="none" style="' + colorCss + 'opacity:1;stroke-width:' + base.toFixed(2) + 'px"/>';
  // One light, slightly-offset accent pass for a touch of hand-drawn
  // character, kept subtle enough that it never competes with the anchor.
  const pts = chalkLine(points, rng, amt * 0.3);
  const op = (0.16 + rng() * 0.12).toFixed(2);
  const w = (base * 0.5).toFixed(2);
  out += '<path d="' + pathD(pts) + '" class="' + cls + '" fill="none" style="' + colorCss + 'opacity:' + op + ';stroke-width:' + w + 'px"/>';
  return out;
}
// Scattered chalk-dust grain along a path — tiny low-opacity dots, the
// texture that separates a chalk line from a clean vector stroke.
function chalkGrain(points, rng, ink, density = 0.4) {
  const pts = subdivide(points, 6);
  let out = '';
  for (const p of pts) {
    if (rng() > density) continue;
    const [x, y] = jitterPt(p, rng, 4);
    out += '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (0.5 + rng() * 0.9).toFixed(1) + '" fill="' + ink + '" opacity="' + (0.15 + rng() * 0.25).toFixed(2) + '"/>';
  }
  return out;
}
const DARK_BGS = ['black', 'deep_black', 'midnight'];
function isDarkBg(bgId) { return DARK_BGS.includes(bgId); }
function inkFor(bgId) { return isDarkBg(bgId) ? '#ffffff' : '#1c1c1c'; }
// Every black-background piece (the rare tier) gets a proper starry
// backdrop, not just whatever the independent `sky` trait happened to roll —
// scattered small sparkle-stars across the scene, chalk-drawn like everything
// else, all in the same white ink.
function renderStarfield(W, H, rng) {
  const n = 34;
  let out = '';
  for (let i = 0; i < n; i++) {
    const x = rng() * W;
    const y = rng() * H * 0.72;
    const s = 2.5 + rng() * 4;
    out += doubleStroke([[x - s, y], [x + s, y]], rng, 1, 'strokeThin');
    out += doubleStroke([[x, y - s], [x, y + s]], rng, 1, 'strokeThin');
  }
  return out;
}

function renderHair(cx, top, style, rng, topAt) {
  if (style === 'none') return '';
  const counts = { short_spike: 13, tall_spike: 15, wild_spike: 20, mohawk_spike: 10 };
  const lens = { short_spike: 20, tall_spike: 36, wild_spike: 30, mohawk_spike: 38 };
  const spread = style === 'mohawk_spike' ? 32 : 96;
  const n = counts[style] || 13;
  const len = lens[style] || 22;
  let out = '';
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = cx - spread / 2 + t * spread + rj(rng, 4);
    const wobble = style === 'wild_spike' ? rj(rng, 16) : rj(rng, 8);
    const l = len * (0.65 + rng() * 0.7);
    // A slight mid-point kink instead of a dead-straight spike — real chalk
    // strands rarely travel in one perfectly straight line.
    const midX = x + wobble * 0.4 + rj(rng, 5);
    const t0 = topAt ? topAt(x) : top;
    const midY = t0 - l * 0.55;
    out += doubleStroke([[x, t0], [midX, midY], [x + wobble, t0 - l]], rng, 2.5, 'stroke');
  }
  return out;
}

// v3 eyes: real eyeballs — white sclera, coloured iris, pupil and specular
// highlights, with a small seeded gaze offset so each bot looks somewhere.
function renderEyes(cx, cy, style, rng, ink, eyeColor, uid, dark) {
  const spacing = 30;
  const lx = cx - spacing, rx = cx + spacing;
  const iris = eyeColor || (dark ? '#2a2f45' : '#1c1c1c');
  const gx = rj(rng, 3.2), gy = rj(rng, 2.4); // shared gaze direction
  const pupil = '#0d0d0d';
  const R = 16;
  const sclera = (x, y) =>
    '<circle cx="' + x + '" cy="' + y + '" r="' + R + '" fill="#ffffff"/>' +
    '<path d="M ' + (x - R + 3) + ' ' + (y + 5) + ' A ' + R + ' ' + R + ' 0 0 0 ' + (x + R - 3) + ' ' + (y + 5) + '" fill="none" stroke="#000" stroke-opacity=".08" stroke-width="5"/>' +
    doubleStroke(ellipsePtsAt(x, y, R, R, 18), rng, 0.8, 'stroke');
  const shine = (x, y, s) =>
    '<circle cx="' + (x - 4.5 * s).toFixed(1) + '" cy="' + (y - 4.5 * s).toFixed(1) + '" r="' + (3.4 * s).toFixed(1) + '" fill="#ffffff"/>' +
    '<circle cx="' + (x + 3.2 * s).toFixed(1) + '" cy="' + (y + 3.4 * s).toFixed(1) + '" r="' + (1.5 * s).toFixed(1) + '" fill="#ffffff" opacity=".85"/>';
  const ringEye = (x, y, dbl) => {
    const ix = x + gx, iy = y + gy;
    let o = sclera(x, y);
    o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="9.5" fill="' + iris + '"/>';
    if (dbl) o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="6.8" fill="none" stroke="#ffffff" stroke-opacity=".55" stroke-width="1.4"/>';
    o += '<circle cx="' + ix.toFixed(1) + '" cy="' + iy.toFixed(1) + '" r="' + (dbl ? 3.6 : 4.6) + '" fill="' + pupil + '"/>';
    return o + shine(ix, iy, 1);
  };
  const spiralEye = (x, y) => {
    let o = sclera(x, y);
    const pts = [];
    for (let i = 0; i <= 26; i++) {
      const a = (i / 26) * Math.PI * 4.2;
      const rr = 1 + (i / 26) * 11;
      pts.push([x + gx * 0.5 + Math.cos(a) * rr, y + gy * 0.5 + Math.sin(a) * rr]);
    }
    o += '<path d="' + pathD(pts) + '" fill="none" stroke="' + iris + '" stroke-width="3" stroke-linecap="round"/>';
    return o + shine(x + gx * 0.5, y + gy * 0.5, 0.8);
  };
  const voidEye = (x, y) => {
    const col = eyeColor || '#15151c';
    return '<circle cx="' + x + '" cy="' + y + '" r="' + (R + 1) + '" fill="url(#vg' + uid + ')"/>' +
      doubleStroke(ellipsePtsAt(x, y, R + 1, R + 1, 18), rng, 0.8, 'stroke') +
      '<ellipse cx="' + (x - 5) + '" cy="' + (y - 7) + '" rx="6.5" ry="4" fill="#ffffff" opacity=".9" transform="rotate(-30 ' + (x - 5) + ' ' + (y - 7) + ')"/>' +
      '<circle cx="' + (x + 6) + '" cy="' + (y + 6) + '" r="2" fill="#ffffff" opacity=".7"/>';
  };
  let out = '';
  if (style === 'void') {
    const col = eyeColor || '#15151c';
    out += '<defs><radialGradient id="vg' + uid + '" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="' + shadeColor(col, 35) + '"/><stop offset="0.55" stop-color="' + col + '"/><stop offset="1" stop-color="' + shadeColor(col, -55) + '"/></radialGradient></defs>';
    out += voidEye(lx, cy) + voidEye(rx, cy);
  } else if (style === 'spiral') out += spiralEye(lx, cy) + spiralEye(rx, cy);
  else if (style === 'ring_double') out += ringEye(lx, cy, true) + ringEye(rx, cy, true);
  else if (style === 'asymmetric') out += ringEye(lx, cy, false) + spiralEye(rx, cy);
  else out += ringEye(lx, cy, false) + ringEye(rx, cy, false); // ring_plain
  return out;
}

function renderMouth(cx, cy, style, rng) {
  let out = '';
  if (style === 'stitches_even' || style === 'stitches_uneven') {
    const n = 6, w = 46;
    out += doubleStroke([[cx - w / 2, cy], [cx + w / 2, cy]], rng, 1.5, 'stroke');
    for (let i = 0; i < n; i++) {
      const x = cx - w / 2 + (i + 0.5) * (w / n);
      const jy = style === 'stitches_uneven' ? rj(rng, 8) : rj(rng, 3);
      out += doubleStroke([[x, cy - 6 + jy / 2], [x, cy + 6 + jy / 2]], rng, 1, 'stroke');
    }
  } else if (style === 'zipper') {
    const w = 46;
    out += doubleStroke([[cx - w / 2, cy], [cx + w / 2, cy]], rng, 1.5, 'stroke');
    for (let i = 0; i < 9; i++) {
      const x = cx - w / 2 + (i / 8) * w;
      const dir = i % 2 === 0 ? 1 : -1;
      out += '<path d="' + pathD(chalkLine([[x, cy], [x + 4 * dir, cy + 7]], rng, 1)) + '" class="stroke"/>';
    }
  } else if (style === 'single_line') {
    out += doubleStroke([[cx - 20, cy], [cx + 20, cy]], rng, 2, 'stroke');
  } else if (style === 'fangs_stitch') {
    const w = 40;
    out += doubleStroke([[cx - w / 2, cy], [cx + w / 2, cy]], rng, 1.5, 'stroke');
    out += '<path d="' + pathD(chalkLine([[cx - 10, cy], [cx - 14, cy + 12], [cx - 6, cy + 3]], rng, 1)) + '" class="stroke" fill="none"/>';
    out += '<path d="' + pathD(chalkLine([[cx + 10, cy], [cx + 14, cy + 12], [cx + 6, cy + 3]], rng, 1)) + '" class="stroke" fill="none"/>';
  }
  return out;
}

function renderChest(cx, cy, size, style, rng, ink, outline) {
  // non-box bodies draw their own outline and fit the chest mark inside it
  const half = outline ? size / 2 * 0.64 : size / 2;
  const boxOutline = outline || [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half], [cx - half, cy - half]];
  let out = doubleStroke(boxOutline, rng, 2, 'stroke') + chalkGrain(boxOutline, rng, ink, 0.1);
  const emojiEntry = TRAITS.chestMark.find((o) => o.id === style && o.emoji);
  if (emojiEntry) {
    // Real emoji glyph, not a vector drawing — browsers render these in their
    // own native color regardless of the chalk ink color, which is the point:
    // a genuine splash of color against an otherwise monochrome chalk figure.
    out += '<text x="' + cx + '" y="' + (cy + 26) + '" font-size="86" text-anchor="middle" style="font-family:\'Apple Color Emoji\',\'Segoe UI Emoji\',\'Noto Color Emoji\',sans-serif;">' + emojiEntry.emoji + '</text>';
    return out;
  }
  if (style === 'x_cross') {
    out += doubleStroke([[cx - half + 6, cy - half + 6], [cx + half - 6, cy + half - 6]], rng, 3, 'strokeThick');
    out += doubleStroke([[cx + half - 6, cy - half + 6], [cx - half + 6, cy + half - 6]], rng, 3, 'strokeThick');
  } else if (style === 'slash') {
    out += doubleStroke([[cx - half + 6, cy - half + 6], [cx + half - 6, cy + half - 6]], rng, 3, 'strokeThick');
  } else if (style === 'circle_target') {
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (half - 10) + '" class="stroke" fill="none"/>';
    out += '<circle cx="' + cx + '" cy="' + cy + '" r="' + (half - 22) + '" class="stroke" fill="none"/>';
  } else if (style === 'skull_small') {
    out += '<circle cx="' + cx + '" cy="' + (cy - 6) + '" r="14" class="stroke" fill="none"/>';
    out += '<circle cx="' + (cx - 5) + '" cy="' + (cy - 8) + '" r="3" fill="' + ink + '"/>';
    out += '<circle cx="' + (cx + 5) + '" cy="' + (cy - 8) + '" r="3" fill="' + ink + '"/>';
  }
  return out;
}

// Ears are drawn per-side (x = ear's x position, flip mirrors shapes that
// aren't symmetric like the pointed-ear triangle).
function renderEars(x, y, style, rng, flip, fill) {
  const f = flip ? -1 : 1;
  if (style === 'none') return '';
  const under = (pts) => fill ? fillPath(pts, fill) : '';
  if (style === 'pointed') {
    const pts = [[x - 8 * f, y + 12], [x + 14 * f, y - 2], [x - 6 * f, y - 14], [x - 8 * f, y + 12]];
    return under(pts) + doubleStroke(pts, rng, 1.4, 'stroke');
  } else if (style === 'antenna_dish') {
    let out = under(ellipsePtsAt(x, y, 9, 9)) + doubleStroke(ellipsePtsAt(x, y, 9, 9), rng, 1.2, 'stroke');
    out += doubleStroke(ellipsePtsAt(x, y, 3.5, 3.5), rng, 1, 'stroke');
    out += doubleStroke([[x, y - 9], [x, y - 16]], rng, 1, 'stroke'); // small antenna stalk
    return out;
  } else if (style === 'large_round') {
    return under(ellipsePtsAt(x, y, 14, 22)) + doubleStroke(ellipsePtsAt(x, y, 14, 22), rng, 1.6, 'stroke');
  } else if (style === 'jagged_broken') {
    const pts = [[x - 9 * f, y - 16], [x + 6 * f, y - 10], [x - 4 * f, y - 2], [x + 8 * f, y + 6], [x - 8 * f, y + 15], [x - 9 * f, y - 16]];
    return under(pts) + doubleStroke(pts, rng, 1.6, 'stroke');
  }
  return under(ellipsePtsAt(x, y, 10, 16)) + doubleStroke(ellipsePtsAt(x, y, 10, 16), rng, 1.5, 'stroke'); // round_oval (default)
}

function renderHand(x, y, style, rng, flip, fill, ink) {
  const f = flip ? -1 : 1;
  const fl = ' style="fill:' + (fill || 'none') + '"';
  const col = fill || 'none', k = ink || '#1c1c1c';
  const shape = (pts) => fillPath(pts, col) + doubleStroke(pts.concat([pts[0]]), rng, 0.6, 'strokeMid');
  const knuckle = (r) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + col + '" stroke="' + k + '" stroke-width="3"/>';
  if (style === 'pincer') {
    let o = '';
    for (const s of [-1, 1]) o += shape([[x + 2 * s, y + 2], [x + 13 * s, y + 9], [x + 12 * s, y + 21], [x + 6 * s, y + 18], [x + 7 * s, y + 11], [x + 1 * s, y + 8]]);
    return o + knuckle(7);
  } else if (style === 'three_finger') {
    let o = '';
    for (const [dx, dy] of [[-8, 16], [0, 19], [8, 16]]) o += tubeP([[x, y + 4], [x + dx, y + dy]], 7.5, k) + tubeP([[x, y + 4], [x + dx, y + dy]], 3.6, col);
    return o + knuckle(9);
  } else if (style === 'hook') {
    const pts = [[x, y], [x, y + 11], [x - 1 * f, y + 17], [x - 6 * f, y + 21], [x - 12 * f, y + 18], [x - 13 * f, y + 13]];
    return tubeP(pts, 8, k) + tubeP(pts, 3.8, '#C4CAD3') + knuckle(6);
  } else if (style === 'magnet') {
    const pts = [[x - 9, y + 5], [x - 9, y + 13], [x - 4, y + 20], [x + 4, y + 20], [x + 9, y + 13], [x + 9, y + 5]];
    return tubeP(pts, 11, k) + tubeP(pts, 6, '#E8434F') + tubeP([[x - 9, y + 3], [x - 9, y + 7]], 6, '#D9DEE5') + tubeP([[x + 9, y + 3], [x + 9, y + 7]], 6, '#D9DEE5') + knuckle(5);
  } else if (style === 'plug') {
    return tubeP([[x - 4, y + 13], [x - 4, y + 21]], 3.4, k) + tubeP([[x + 4, y + 13], [x + 4, y + 21]], 3.4, k) +
      shape([[x - 9, y - 1], [x + 9, y - 1], [x + 8, y + 14], [x - 8, y + 14]]);
  }
  if (style === 'mitten_bow') {
    return '<circle cx="' + (x + 6 * f) + '" cy="' + y + '" r="9" class="stroke"' + fl + '/>' +
      '<circle cx="' + (x - 6 * f) + '" cy="' + (y + 4) + '" r="7" class="stroke"' + fl + '/>';
  } else if (style === 'claw') {
    let out = '';
    for (let i = -1; i <= 1; i++) out += '<path d="' + pathD(chalkLine([[x, y + 3], [x + i * 9, y + 15]], rng, 1)) + '" class="stroke"/>';
    return out + knuckle(8);
  } else if (style === 'broken_stub') {
    // cracked-off robot hand: palm with a jagged break, a crack, and two dangling wires
    const palm = [[x - 11, y - 6], [x + 11, y - 6], [x + 12, y + 6], [x + 7, y + 10], [x + 3, y + 5], [x - 2, y + 11], [x - 6, y + 6], [x - 12, y + 9]];
    return tubeP([[x - 3, y + 8], [x - 5, y + 15], [x - 2, y + 20]], 2.6, '#E8434F') +
      tubeP([[x + 4, y + 7], [x + 6, y + 14], [x + 3, y + 18]], 2.6, '#FFC93C') +
      '<circle cx="' + (x - 2) + '" cy="' + (y + 21) + '" r="2.4" fill="#FFE27A"/>' +
      shape(palm) +
      '<path d="M ' + (x - 3) + ' ' + (y - 6) + ' L ' + (x + 1) + ' ' + (y - 1) + ' L ' + (x - 2) + ' ' + (y + 3) + '" stroke="' + k + '" stroke-width="1.8" fill="none"/>';
  }
  return '<circle cx="' + x + '" cy="' + y + '" r="10" class="stroke"' + fl + '/>';
}

// Feet are drawn per-leg (x = leg's x position, footY = where the foot sits,
// legBottomY = where the leg line should stop above the foot — peg_legs
// skips the separate foot shape entirely and just tapers the leg to a point).
function ellipsePtsAt(x, y, rx, ry, n = 14) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([x + Math.cos(a) * rx, y + Math.sin(a) * ry]);
  }
  return pts;
}
function renderFoot(x, footY, style, rng, flip, fill) {
  const f = flip ? -1 : 1;
  const under = (pts) => fill ? fillPath(pts, fill) : '';
  if (style === 'pointed_shoes') {
    const pts = [[x - 6 * f, footY - 6], [x + 20 * f, footY + 2], [x - 8 * f, footY + 8], [x - 6 * f, footY - 6]];
    return under(pts) + doubleStroke(pts, rng, 1.4, 'stroke');
  } else if (style === 'round_stubs') {
    return under(ellipsePtsAt(x, footY, 12, 9)) + doubleStroke(ellipsePtsAt(x, footY, 12, 9), rng, 1.2, 'stroke');
  } else if (style === 'robot_blocks') {
    const pts = [[x - 17, footY - 9], [x + 17, footY - 9], [x + 17, footY + 8], [x - 17, footY + 8], [x - 17, footY - 9]];
    return under(pts) + doubleStroke(pts, rng, 1.3, 'stroke');
  } else if (style === 'claw_feet') {
    let out = '';
    for (let i = -1; i <= 1; i++) out += doubleStroke([[x, footY - 4], [x + i * 10, footY + 9]], rng, 1, 'stroke');
    return out;
  } else if (style === 'peg_legs') {
    return ''; // no separate foot — the leg itself tapers to a point, handled at the call site
  }
  return under(ellipsePtsAt(x, footY, 21, 11)) + doubleStroke(ellipsePtsAt(x, footY, 21, 11), rng, 1.5, 'stroke'); // oval_shoes (default)
}

function renderSky(cx, y, style, rng) {
  if (style === 'star') {
    const cxp = cx + 90, cyp = y;
    const pts = [];
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
      pts.push([cxp + Math.cos(a) * 22, cyp + Math.sin(a) * 22]);
    }
    pts.push(pts[0]);
    return doubleStroke(pts, rng, 1.8, 'stroke');
  } else if (style === 'comet') {
    // No connecting line at all now — just a small scattered dot trail,
    // tucked into a top corner well clear of the head/hair area entirely.
    // The stroked line (even short/repositioned) kept reading as a stray
    // mark drawn across the character.
    const side = cx; // anchor near center-top, but dots stay compact and high
    let out = '';
    for (let i = 0; i < 7; i++) {
      const t = i / 6;
      const x = (side - 130) + t * 90 + rj(rng, 6);
      const yy = 12 + t * 14 + rj(rng, 4);
      out += '<circle cx="' + x.toFixed(1) + '" cy="' + yy.toFixed(1) + '" r="' + (1.6 + rng() * 2.2).toFixed(1) + '" class="dotFill"/>';
    }
    return out;
  }
  return '';
}

function renderGround(w, y, style, rng, grassColor) {
  const counts = { light_scribble: 18, medium_scribble: 30, heavy_scribble: 46, scorched: 26 };
  const n = counts[style] || 18;
  let out = '';
  const colorCss = grassColor ? ('stroke:' + grassColor + ';') : '';
  for (let i = 0; i < n; i++) {
    const x = rng() * w;
    const h = 6 + rng() * 16;
    out += '<path d="' + pathD(chalkLine([[x, y], [x + rj(rng, 6), y - h]], rng, 1)) + '" class="strokeThin" style="' + colorCss + '"/>';
  }
  out += doubleStroke([[0, y], [w, y]], rng, 1.5, 'strokeThin', grassColor);
  return out;
}

// v3 companions: filled, coloured little creatures with shiny eyes, blush and
// details. (x, y) is the point on the ground the companion stands on.
function renderCompanion(x, y, style, rng, col, ink, dark) {
  const ghost = style === 'cat_ghost';
  const fill = ghost ? '#EDE7FF' : (col || '#FAFAF7');
  const shade = shadeColor(ghost ? '#C9BCFF' : fill, -22);
  const cls = 'strokeMid';
  const blob = (cx, cy, rx, ry, f, n) => fillPath(ellipsePtsAt(cx, cy, rx, ry, n || 18), f || fill) + doubleStroke(ellipsePtsAt(cx, cy, rx, ry, n || 18), rng, 0.9, cls);
  const poly = (pts, f) => fillPath(pts, f || fill) + doubleStroke(pts.concat([pts[0]]), rng, 0.8, cls);
  const eye = (ex, ey, r) =>
    '<circle cx="' + ex + '" cy="' + ey + '" r="' + r + '" fill="#161616"/>' +
    '<circle cx="' + (ex - r * 0.35).toFixed(1) + '" cy="' + (ey - r * 0.4).toFixed(1) + '" r="' + (r * 0.42).toFixed(1) + '" fill="#ffffff"/>';
  const cheek = (bx, by) => '<ellipse cx="' + bx + '" cy="' + by + '" rx="4.5" ry="2.6" fill="#ff6f91" opacity=".55"/>';
  const leg = (lx, top, len) => '<path d="' + pathD(chalkLine([[lx, top], [lx, top + len]], rng, 0.6)) + '" stroke="' + ink + '" stroke-width="9" stroke-linecap="round" fill="none"/>' +
    '<path d="' + pathD([[lx, top], [lx, top + len]]) + '" stroke="' + fill + '" stroke-width="4.5" stroke-linecap="round" fill="none"/>';
  let o = '<g transform="translate(' + x + ',' + y + ') scale(1.3)">';
  o += '<ellipse cx="4" cy="1" rx="' + (style === 'bird' ? 20 : 38) + '" ry="5" fill="#000" opacity="' + (dark ? 0.45 : 0.12) + '"/>';

  if (style === 'cat' || style === 'cat_ghost') {
    if (ghost) o += '<ellipse cx="6" cy="-26" rx="46" ry="34" fill="#C9BCFF" opacity=".25"/>';
    // tail
    o += '<path d="' + pathD(chalkLine([[-26, -18], [-40, -30], [-38, -50], [-28, -56]], rng, 1)) + '" stroke="' + ink + '" stroke-width="11" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    o += '<path d="' + pathD([[-26, -18], [-40, -30], [-38, -50], [-28, -56]]) + '" stroke="' + fill + '" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" fill="none"/>';
    if (!ghost) for (const lx of [-16, -4, 10, 22]) o += leg(lx, -15, 10);
    o += ghost ? poly([[-30, -12], [-24, -34], [26, -36], [32, -12], [24, -4], [14, -12], [4, -3], [-6, -12], [-16, -4]])
               : blob(0, -22, 30, 15);
    o += blob(30, -44, 20, 17);
    o += poly([[15, -54], [16, -74], [28, -58]]) + poly([[33, -58], [44, -74], [46, -52]]);
    o += '<path d="M 18.5 -58 L 18.5 -68 L 24 -59 Z" fill="#ff9fb8" opacity=".8"/><path d="M 37 -58 L 43 -68 L 43.5 -56 Z" fill="#ff9fb8" opacity=".8"/>';
    o += eye(23, -46, 4) + eye(38, -46, 4) + cheek(18, -38) + cheek(43, -38);
    o += '<path d="M 29 -40 L 32 -40 L 30.5 -38 Z" fill="#ff7a9c"/><path d="M 30.5 -38 Q 28 -35 26 -37 M 30.5 -38 Q 33 -35 35 -37" stroke="' + ink + '" stroke-width="1.4" fill="none"/>';
    o += '<path d="M 12 -40 L 2 -42 M 12 -37 L 2 -35 M 48 -40 L 58 -42 M 48 -37 L 58 -35" stroke="' + ink + '" stroke-width="1.2" opacity=".7"/>';
    if (!ghost) o += '<path d="M -8 -30 Q -4 -22 -8 -14 M 2 -32 Q 6 -24 2 -16" stroke="' + shade + '" stroke-width="3" fill="none" stroke-linecap="round" opacity=".7"/>';
  } else if (style === 'dog') {
    o += '<path d="' + pathD(chalkLine([[-28, -24], [-40, -36], [-44, -46]], rng, 1)) + '" stroke="' + ink + '" stroke-width="10" stroke-linecap="round" fill="none"/><path d="' + pathD([[-28, -24], [-40, -36], [-44, -46]]) + '" stroke="' + fill + '" stroke-width="5" stroke-linecap="round" fill="none"/>';
    for (const lx of [-18, -5, 10, 22]) o += leg(lx, -15, 10);
    o += blob(0, -24, 32, 16);
    o += '<ellipse cx="-6" cy="-26" rx="10" ry="7" fill="' + shade + '" opacity=".75"/>';
    o += blob(32, -46, 19, 17);
    o += blob(46, -38, 11, 8, shadeColor(fill, 12));
    o += '<ellipse cx="54" cy="-41" rx="4" ry="3" fill="#161616"/>';
    o += '<path d="M 44 -31 Q 46 -24 50 -30 Z" fill="#ff6f91" stroke="' + ink + '" stroke-width="1.2"/>';
    o += poly([[18, -58], [10, -40], [20, -36], [24, -54]], shade) + poly([[38, -60], [48, -54], [44, -38]], shade);
    o += eye(28, -50, 3.8) + eye(39, -50, 3.8) + cheek(24, -41);
  } else if (style === 'bird') {
    o += leg(-5, -13, 8) + leg(6, -13, 8);
    o += blob(0, -28, 20, 18);
    o += '<ellipse cx="2" cy="-22" rx="11" ry="9" fill="#ffffff" opacity=".45"/>';
    o += poly([[-8, -32], [-24, -24], [-10, -18]], shade);
    o += poly([[17, -34], [30, -30], [17, -26]], '#FFB23E');
    o += '<path d="M -2 -45 Q 2 -54 6 -46 Q 8 -54 12 -45" stroke="' + ink + '" stroke-width="2" fill="none" stroke-linecap="round"/>';
    o += eye(9, -34, 3.4) + cheek(8, -26);
  } else if (style === 'bunny') {
    o += blob(-26, -24, 8, 8, '#ffffff');
    for (const lx of [-12, 12]) o += blob(lx, -7, 9, 5);
    o += blob(0, -24, 24, 18);
    o += poly([[10, -56], [12, -92], [22, -58]]) + poly([[26, -58], [36, -90], [36, -54]]);
    o += '<path d="M 14 -60 L 15 -84 L 19 -60 Z" fill="#ff9fb8" opacity=".85"/><path d="M 29 -60 L 34 -82 L 33 -58 Z" fill="#ff9fb8" opacity=".85"/>';
    o += blob(24, -46, 17, 15);
    o += eye(18, -48, 3.6) + eye(30, -48, 3.6) + cheek(14, -40) + cheek(34, -40);
    o += '<path d="M 23 -42 L 26 -42 L 24.5 -40 Z" fill="#ff7a9c"/><path d="M 24.5 -40 L 24.5 -37" stroke="' + ink + '" stroke-width="1.3"/>';
  }
  return o + '</g>';
}

// Solid fill under a chalk outline (no stroke) — the colour layer of the riso look.
function fillPath(points, fill, opacity) {
  return '<path d="' + pathD(points) + ' Z" fill="' + fill + '" stroke="none"' + (opacity != null ? ' opacity="' + opacity + '"' : '') + '/>';
}
// Slightly wobbly rectangle outline (misregistered print plate feel).
function wobblyRect(x0, y0, x1, y1, rng, amt) {
  return chalkLine([[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], rng, amt);
}

// Paint for the body: flat colour, or a gradient for the rare metallic / holo finishes.
function bodyPaint(bodyColor, bg, uid, dark, suffix) {
  const id = bodyColor ? bodyColor.id : 'classic';
  if (id === 'classic') {
    const f = dark ? '#262626' : bg.hex;
    return { fill: f, shade: dark ? '#000000' : shadeColor(bg.hex, -22), shoe: dark ? '#3a3a3a' : shadeColor(bg.hex, -12), defs: '', glow: '#ffffff', classic: true };
  }
  const gid = 'bf' + (suffix || '') + uid;
  const grad = (stops) => '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
    stops.map((c, i) => '<stop offset="' + (i / (stops.length - 1)).toFixed(2) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
  if (id === 'chrome') return { fill: 'url(#' + gid + ')', shade: '#6d7580', shoe: '#8e96a1', glow: '#dfe6ee', defs: grad(['#f4f6f9', '#aeb6c1', '#eef1f5', '#8f98a4', '#dde2e8']) };
  if (id === 'gold') return { fill: 'url(#' + gid + ')', shade: '#9a6a12', shoe: '#c9922a', glow: '#ffd970', defs: grad(['#fff1b8', '#e9b340', '#fbe08a', '#c98f1e', '#f6d06a']) };
  if (id === 'rose_gold') return { fill: 'url(#' + gid + ')', shade: '#a8625a', shoe: '#c9837a', glow: '#ffc7bd', defs: grad(['#ffe1d8', '#e0a093', '#f7cbbf', '#c7867b', '#f2bfb2']) };
  if (id === 'obsidian') return { fill: 'url(#' + gid + ')', shade: '#07060c', shoe: '#1a1726', glow: '#8b6cff', defs: grad(['#3d3560', '#16131f', '#2b2640', '#0d0b14', '#4a3f78']) };
  if (id === 'aurora') return { fill: 'url(#' + gid + ')', shade: '#2f7f8f', shoe: '#4aa3a0', glow: '#8ff5d9', defs: grad(['#7cf5c8', '#5ec8ff', '#9d8bff', '#6ff0b0', '#ffe28a']) };
  if (id === 'holo') return { fill: 'url(#' + gid + ')', shade: '#7b6bd0', shoe: '#a996ff', glow: '#d9c9ff', defs: grad(['#ffd1ec', '#c7b8ff', '#a8e6ff', '#c2ffd9', '#fff3b0', '#ffc2e2']) };
  return { fill: bodyColor.hex, shade: shadeColor(bodyColor.hex, -34), shoe: shadeColor(bodyColor.hex, -22), glow: bodyColor.hex, defs: '' };
}

// ---------- v4 shape system: head/body outlines, arm styles ----------
function tubeP(pts, w, col) {
  return '<path d="' + pathD(pts) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"/>';
}
function rrPts(cx, cy, hw, hh, r, n) {
  n = n || 5;
  const pts = [];
  const corners = [[cx + hw - r, cy - hh + r, -Math.PI / 2], [cx + hw - r, cy + hh - r, 0], [cx - hw + r, cy + hh - r, Math.PI / 2], [cx - hw + r, cy - hh + r, Math.PI]];
  for (const [x, y, a0] of corners) for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI / 2);
    pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
  }
  return pts;
}
function octPts(cx, cy, hw, hh, c) {
  return [[cx - hw + c, cy - hh], [cx + hw - c, cy - hh], [cx + hw, cy - hh + c], [cx + hw, cy + hh - c], [cx + hw - c, cy + hh], [cx - hw + c, cy + hh], [cx - hw, cy + hh - c], [cx - hw, cy - hh + c]];
}
function capsulePts(cx, cy, hw, hh) {
  const pts = [];
  for (let i = 0; i <= 10; i++) { const a = Math.PI + (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw, cy - hh + hw + Math.sin(a) * hw]); }
  for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI; pts.push([cx + Math.cos(a) * hw, cy + hh - hw + Math.sin(a) * hw]); }
  return pts;
}
// Closed outline (no repeated first point) for a head or body shape of half-size s.
function shapePts(kind, cx, cy, s) {
  switch (kind) {
    case 'round': return ellipsePtsAt(cx, cy, s * 1.03, s * 1.03, 28).slice(0, -1);
    case 'tv': return rrPts(cx, cy, s * 1.2, s * 0.84, 22);
    case 'dome': {
      const pts = [];
      for (let i = 0; i <= 14; i++) { const a = Math.PI + (i / 14) * Math.PI; pts.push([cx + Math.cos(a) * s, cy + s * 0.05 + Math.sin(a) * s]); }
      pts.push([cx + s, cy + s], [cx - s, cy + s]);
      return pts;
    }
    case 'capsule': return capsulePts(cx, cy, s * 0.82, s);
    case 'hex': return [[cx - s * 0.52, cy - s], [cx + s * 0.52, cy - s], [cx + s * 1.06, cy], [cx + s * 0.52, cy + s], [cx - s * 0.52, cy + s], [cx - s * 1.06, cy]];
    case 'octagon': return octPts(cx, cy, s, s, s * 0.38);
    case 'barrel': return rrPts(cx, cy, s * 1.02, s, s * 0.48);
    case 'trapezoid': return [[cx - s * 1.12, cy - s], [cx + s * 1.12, cy - s], [cx + s * 0.74, cy + s], [cx - s * 0.74, cy + s]];
    case 'bell': return [[cx - s * 0.7, cy - s], [cx + s * 0.7, cy - s], [cx + s * 1.1, cy + s], [cx - s * 1.1, cy + s]];
    default: return [[cx - s, cy - s], [cx + s, cy - s], [cx + s, cy + s], [cx - s, cy + s]]; // box
  }
}
const closeLoop = (pts) => pts.concat([pts[0]]);
// Horizontal half-width of a closed outline at height y (widest crossing).
function halfWidthAt(pts, cx, y) {
  let best = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    if ((y0 - y) * (y1 - y) > 0 || y0 === y1) continue;
    const x = x0 + (x1 - x0) * (y - y0) / (y1 - y0);
    best = Math.max(best, Math.abs(x - cx));
  }
  return best;
}
// Topmost y of a closed outline at column x (where hair roots sit).
function topYAt(pts, x) {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % pts.length];
    if ((x0 - x) * (x1 - x) > 0 || x0 === x1) continue;
    best = Math.min(best, y0 + (y1 - y0) * (x - x0) / (x1 - x0));
  }
  return best;
}
// Zig-zag spring along a polyline.
function coilPts(path, amp, step) {
  const out = [];
  let k = 0;
  for (let i = 1; i < path.length; i++) {
    const [x0, y0] = path[i - 1], [x1, y1] = path[i];
    const len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    const n = Math.max(2, Math.round(len / step));
    for (let j = (i === 1 ? 0 : 1); j <= n; j++, k++) {
      const t = j / n, o = (j === 0 && i === 1) || (i === path.length - 1 && j === n) ? 0 : (k % 2 ? amp : -amp);
      out.push([x0 + (x1 - x0) * t + nx * o, y0 + (y1 - y0) * t + ny * o]);
    }
  }
  return out;
}
// How far below the wrist point each hand shape reaches (for hands resting on the floor).
const HAND_REACH = { mitten_bow: 11, round_paw: 10, claw: 12, broken_stub: 10, pincer: 21, three_finger: 20, hook: 21, magnet: 21, plug: 21 };

function renderFromTraits(picks, index, seed) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const deco = mulberry32((seed ?? 0) * 100003 + index + 7777); // background texture only
  const W = 500, H = 572;
  // Square canvas (NFT-standard 1:1): the figure is laid out on the 500-wide stage and
  // centred; the backdrop (bg, stars, ground) extends across the full square width.
  const SW = H, OX = (SW - W) / 2;
  const bg = TRAITS.background.find((o) => o.id === picks.background.id);
  const dark = isDarkBg(bg.id);
  const ink = inkFor(bg.id);
  const cx = W / 2;
  const uid = (seed ?? 0) + '_' + index;
  const bodyColor = picks.bodyColor ? TRAITS.bodyColor.find((o) => o.id === picks.bodyColor.id) : null;
  const paint = bodyPaint(bodyColor, bg, uid, dark);
  const headColor = picks.headColor && picks.headColor.id !== 'matching' ? TRAITS.headColor.find((o) => o.id === picks.headColor.id) : null;
  const headPaint = headColor ? bodyPaint(headColor, bg, uid, dark, 'h') : paint;

  // ---- proportions: chunkier than v1 (bigger head + chest, shorter legs) ----
  const headSize = 164, headTop = 98, headCx = cx, headCy = headTop + headSize / 2;
  const neckLen = 20, chestSize = 168;
  const neckTop = headTop + headSize;
  const chestCy = neckTop + neckLen + chestSize / 2;
  const hipY = neckTop + neckLen + chestSize;
  const groundY = hipY + 92;
  const hh = headSize / 2, ch = chestSize / 2;
  const headKind = picks.headShape ? picks.headShape.id : 'box';
  const bodyKind = picks.bodyShape ? picks.bodyShape.id : 'box';
  const armStyle = picks.arms ? picks.arms.id : 'tube';
  const headPts = shapePts(headKind, headCx, headCy, hh);
  const bodyPts = shapePts(bodyKind, headCx, chestCy, ch);
  const shoulderY = chestCy - ch + 16;
  let bodyW = 0; for (const p of bodyPts) bodyW = Math.max(bodyW, Math.abs(p[0] - headCx));
  const shoulderX = Math.max(8, halfWidthAt(bodyPts, headCx, shoulderY) - 10); // starts inside the body; hidden under it
  const armPath = (side) => [[headCx + side * shoulderX, shoulderY], [headCx + side * (bodyW + 40), shoulderY + 58], [headCx + side * (bodyW + 50), shoulderY + 106]];
  const floorArm = (side) => [[headCx + side * shoulderX, shoulderY], [headCx + side * (bodyW + 30), shoulderY + 84], [headCx + side * (bodyW + 38), groundY - (HAND_REACH[picks.hands.id] || 12) - 2]];
  const legX = 38, peg = picks.feet.id === 'peg_legs';
  const legEnd = peg ? groundY - 12 : groundY - 18;
  const legTop = chestCy + ch * 0.55; // tucked under the body so no shape leaves a gap above the legs
  const legL = [[headCx - legX, legTop], [headCx - legX, legEnd]];
  const legR = [[headCx + legX, legTop], [headCx + legX, legEnd]];

  // arms: which polylines are drawn as limbs, and where the hands go
  const arms = [];   // { pts, kind: 'tube' | 'jointed' | 'spring' | 'stub' }
  const hands = [];  // { x, y, flip, rot }
  let sparks = null;
  if (armStyle === 'floating') {
    for (const side of [-1, 1]) hands.push({ x: headCx + side * (bodyW + 46), y: shoulderY + 92, flip: side < 0, float: true });
  } else if (armStyle === 'on_floor') {
    for (const side of [-1, 1]) { const p = floorArm(side); arms.push({ pts: p, kind: 'tube' }); hands.push({ x: p[2][0], y: p[2][1] + 2, flip: side < 0 }); }
  } else if (armStyle === 'broken') {
    const L = armPath(-1), R = armPath(1);
    const mid = [L[0][0] + (L[1][0] - L[0][0]) * 0.9 - 4, L[0][1] + (L[1][1] - L[0][1]) * 0.9];
    arms.push({ pts: [L[0], mid], kind: 'stub' });
    sparks = mid;
    arms.push({ pts: R, kind: 'tube' });
    hands.push({ x: R[2][0], y: R[2][1] + 8, flip: false });
    // the snapped-off forearm lying on the ground to the left
    const gy = groundY - 8;
    arms.push({ pts: [[headCx - 196, gy + 1], [headCx - 156, gy - 2], [headCx - 116, gy - 4]], kind: 'tube' });
    hands.push({ x: headCx - 204, y: gy - 4, flip: true, rot: 90 });
  } else {
    for (const side of [-1, 1]) { const p = armPath(side); arms.push({ pts: p, kind: armStyle === 'jointed' || armStyle === 'spring' || armStyle === 'telescopic' ? armStyle : 'tube' }); hands.push({ x: p[2][0], y: p[2][1] + 8, flip: side < 0 }); }
  }

  let defs = paint.defs;
  let back = '';
  // ---- backdrop: soft halo behind the head + paper grain ----
  const haloFill = dark ? (paint.classic ? '#ffffff' : paint.glow) : (bg.id === 'white' ? '#f3f1ec' : '#ffffff');
  const haloOp = dark ? 0.1 : (bg.id === 'white' ? 1 : 0.55);
  back += '<circle cx="' + cx + '" cy="' + (headCy + 40) + '" r="196" fill="' + haloFill + '" opacity="' + haloOp + '"/>';
  back += '<circle cx="' + cx + '" cy="' + (headCy + 40) + '" r="228" fill="' + haloFill + '" opacity="' + (haloOp * 0.35).toFixed(2) + '"/>';
  let grain = '';
  for (let i = 0; i < 170; i++) {
    grain += '<circle cx="' + (deco() * SW - OX).toFixed(1) + '" cy="' + (deco() * H).toFixed(1) + '" r="' + (0.5 + deco() * 1.1).toFixed(1) + '" fill="' + ink + '" opacity="' + (0.03 + deco() * 0.04).toFixed(2) + '"/>';
  }
  back += grain;

  let body = '';
  if (dark) body += '<g transform="translate(' + -OX + ' 0)">' + renderStarfield(SW, H, rng) + '</g>';
  body += renderSky(cx, 24, picks.sky.id, rng);

  let grassColorHex = picks.grassColor.hex || null;
  if (grassColorHex === '#ffffff' && !dark) grassColorHex = null;
  body += '<g transform="translate(' + -OX + ' 0)">' + renderGround(SW, groundY, picks.ground.id, rng, grassColorHex) + '</g>';

  // ---- shadows: soft ground shadow + offset drop shadow of the silhouette ----
  const shadowCol = dark ? '#000000' : '#1c1c1c';
  body += '<ellipse cx="' + cx + '" cy="' + (groundY + 1) + '" rx="128" ry="11" fill="' + shadowCol + '" opacity="' + (dark ? 0.55 : 0.13) + '"/>';
  const sdx = 9, sdy = 7, sOp = dark ? 0.45 : 0.12;
  const tube = (pts, w, col, extra) => '<path d="' + pathD(pts) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  let sil = '<path d="' + pathD(headPts) + ' Z"/><path d="' + pathD(bodyPts) + ' Z"/>';
  for (const a of arms) if (a.pts[0][1] < groundY - 20) sil += tube(a.pts, 14, shadowCol);
  sil += tube(legL, 14, shadowCol) + tube(legR, 14, shadowCol);
  body += '<g transform="translate(' + sdx + ' ' + sdy + ')" fill="' + shadowCol + '" opacity="' + sOp + '">' + sil + '</g>';

  // ---- limbs, drawn under head/chest ----
  const limb = (pts, jit, thin) => {
    const p = chalkLine(pts, rng, jit);
    return tube(p, thin ? 11 : 15, ink) + tube(p, thin ? 5 : 8.5, paint.fill);
  };
  const joint = (x, y, r) => '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + paint.shoe + '" stroke="' + ink + '" stroke-width="3.2"/>' +
    '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + (r * 0.32).toFixed(1) + '" fill="' + ink + '"/>';
  for (const a of arms) {
    if (a.kind === 'jointed') {
      body += tube(a.pts, 12, ink) + tube(a.pts, 6.5, paint.fill);
      body += joint(a.pts[1][0], a.pts[1][1], 8) + joint(a.pts[2][0], a.pts[2][1], 6);
    } else if (a.kind === 'telescopic') {
      // three nested sleeves, thinner toward the hand, with a metal collar at each join
      const [p0, p1, p2] = a.pts;
      const pm = [p1[0] + (p2[0] - p1[0]) * 0.5, p1[1] + (p2[1] - p1[1]) * 0.5];
      const segs = [[p0, p1, 18], [p1, pm, 14], [pm, p2, 10]];
      for (const [s0, s1, w] of segs) body += tube([s0, s1], w, ink) + tube([s0, s1], w - 6.5, paint.fill);
      for (const [c, r] of [[p1, 10], [pm, 8]]) body += '<circle cx="' + c[0].toFixed(1) + '" cy="' + c[1].toFixed(1) + '" r="' + r + '" fill="' + paint.shoe + '" stroke="' + ink + '" stroke-width="3"/>' +
        '<path d="M ' + (c[0] - r * 0.55).toFixed(1) + ' ' + c[1].toFixed(1) + ' L ' + (c[0] + r * 0.55).toFixed(1) + ' ' + c[1].toFixed(1) + '" stroke="' + ink + '" stroke-width="1.6" opacity=".7"/>';
    } else if (a.kind === 'spring') {
      const c = coilPts(a.pts, 7, 6);
      body += tube(c, 6, ink) + tube(c, 2.6, paint.fill);
    } else if (a.kind === 'stub') {
      body += limb(a.pts, 1.2);
      const [x, y] = a.pts[1];
      body += fillPath([[x - 9, y - 6], [x + 3, y - 10], [x + 1, y - 2], [x + 8, y + 4], [x - 4, y + 8], [x - 2, y + 1]], paint.fill) +
        doubleStroke([[x - 9, y - 6], [x + 3, y - 10], [x + 1, y - 2], [x + 8, y + 4], [x - 4, y + 8], [x - 2, y + 1], [x - 9, y - 6]], rng, 0.8, 'strokeMid');
    } else {
      body += limb(a.pts, 1.6);
    }
  }
  if (sparks) {
    const [sx, sy] = sparks;
    for (let i = 0; i < 6; i++) {
      const ang = -2.6 + i * 0.5 + rj(rng, 0.15), l1 = 10 + rng() * 3, l2 = l1 + 8 + rng() * 8;
      body += '<path d="M ' + (sx + Math.cos(ang) * l1).toFixed(1) + ' ' + (sy + Math.sin(ang) * l1).toFixed(1) + ' L ' + (sx + Math.cos(ang) * l2).toFixed(1) + ' ' + (sy + Math.sin(ang) * l2).toFixed(1) + '" stroke="#FFC93C" stroke-width="3" stroke-linecap="round"/>';
    }
    body += '<circle cx="' + sx + '" cy="' + sy + '" r="4" fill="#FFE27A"/>';
  }
  body += limb(legL, 1.2, peg) + limb(legR, 1.2, peg);
  for (const h of hands) {
    let g = renderHand(h.x, h.y, picks.hands.id, rng, h.flip, paint.fill, ink);
    // hands read at thumbnail size (hands resting on the floor stay 1x so they sit on the ground)
    const hs = h.float ? 1.6 : (h.rot || armStyle === 'on_floor') ? 1 : 1.2;
    if (hs !== 1) g = '<g transform="translate(' + h.x + ' ' + h.y + ') scale(' + hs + ') translate(' + -h.x + ' ' + -h.y + ')">' + g + '</g>';
    if (h.rot) g = '<g transform="rotate(' + h.rot + ' ' + h.x + ' ' + h.y + ')">' + g + '</g>';
    if (h.float) {
      const d = h.flip ? 1 : -1; // motion marks point back toward the body
      g += '<path d="M ' + (h.x + d * 30) + ' ' + (h.y - 6) + ' q ' + (d * 6) + ' 8 0 16 M ' + (h.x + d * 37) + ' ' + (h.y - 2) + ' q ' + (d * 4) + ' 6 0 10" stroke="' + ink + '" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".6"/>';
      g += '<ellipse cx="' + h.x + '" cy="' + (groundY + 1) + '" rx="12" ry="3" fill="' + shadowCol + '" opacity="' + (dark ? 0.4 : 0.1) + '"/>';
    }
    body += g;
  }

  // ---- halftone shading (dots fading in toward the right/bottom edge), clipped to each shape ----
  defs += '<pattern id="ht' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.7" fill="' + paint.shade + '"/></pattern>' +
    '<linearGradient id="hg' + uid + '" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
    '<mask id="hm' + uid + '" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#hg' + uid + ')"/></mask>';
  if (headPaint !== paint) defs += headPaint.defs + '<pattern id="hth' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.7" fill="' + headPaint.shade + '"/></pattern>';
  const block = (pts, key, pp) => {
    pp = pp || paint;
    const pat = pp === paint ? 'ht' : 'hth';
    // colour plate slightly misregistered from the ink outline, then halftone, then (caller) outline
    const ox = 1.5 + rng() * 2, oy = 1.5 + rng() * 2;
    const moved = pts.map(([x, y]) => [x + ox, y + oy]);
    let o = fillPath(chalkLine(closeLoop(moved), rng, 1.2), pp.fill);
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of moved) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
    const cid = 'sc' + key + uid;
    defs += '<clipPath id="' + cid + '"><path d="' + pathD(moved) + ' Z"/></clipPath>';
    o += '<rect x="' + (x0 + 3).toFixed(1) + '" y="' + (y0 + 3).toFixed(1) + '" width="' + (x1 - x0 - 6).toFixed(1) + '" height="' + (y1 - y0 - 6).toFixed(1) + '" fill="url(#' + pat + uid + ')" mask="url(#hm' + uid + ')" clip-path="url(#' + cid + ')" opacity="' + (pp.classic ? 0.35 : 0.55) + '"/>';
    return o;
  };

  // ---- head ----
  body += renderHair(headCx, headTop, picks.hair.id, rng, (x) => { const t = topYAt(headPts, x); return Number.isFinite(t) ? t + 3 : headTop; });
  body += block(headPts, 'h', headPaint);
  const headOutline = closeLoop(headPts);
  body += doubleStroke(headOutline, rng, 2.5, 'strokeThick');
  body += chalkGrain(headOutline, rng, ink, 0.12);
  if (headKind === 'tv') {
    // screen bezel + two little dials: reads instantly as a CRT head
    body += doubleStroke(closeLoop(rrPts(headCx - 6, headCy, hh * 1.2 - 22, hh * 0.84 - 13, 14)), rng, 1, 'strokeMid');
    body += joint(headCx + hh * 1.2 - 10, headCy - 18, 5) + joint(headCx + hh * 1.2 - 10, headCy + 6, 5);
  } else if (headKind === 'dome') {
    body += doubleStroke([[headCx - hh + 6, headCy + hh * 0.35], [headCx + hh - 6, headCy + hh * 0.35]], rng, 1, 'strokeMid');
  }
  const earX = halfWidthAt(headPts, headCx, headCy) + 24;
  body += renderEars(headCx - earX, headCy, picks.ears.id, rng, true, headPaint.fill);
  body += renderEars(headCx + earX, headCy, picks.ears.id, rng, false, headPaint.fill);
  // cheek blush
  const blush = dark ? '#ff7aa8' : '#ff6f91';
  const bx = Math.min(50, halfWidthAt(headPts, headCx, headCy + 20) - 20);
  body += '<ellipse cx="' + (headCx - bx) + '" cy="' + (headCy + 20) + '" rx="15" ry="8" fill="' + blush + '" opacity="' + (dark ? 0.35 : 0.42) + '"/>';
  body += '<ellipse cx="' + (headCx + bx) + '" cy="' + (headCy + 20) + '" rx="15" ry="8" fill="' + blush + '" opacity="' + (dark ? 0.35 : 0.42) + '"/>';
  const eyeColorHex = picks.eyeColor.hex || null;
  if (eyeColorHex) {
    defs += '<radialGradient id="eg' + uid + '"><stop offset="0.35" stop-color="' + eyeColorHex + '" stop-opacity="0.9"/><stop offset="1" stop-color="' + eyeColorHex + '" stop-opacity="0"/></radialGradient>';
    body += '<circle cx="' + (headCx - 32) + '" cy="' + (headCy - 12) + '" r="36" fill="url(#eg' + uid + ')"/>';
    body += '<circle cx="' + (headCx + 32) + '" cy="' + (headCy - 12) + '" r="36" fill="url(#eg' + uid + ')"/>';
  }
  body += '<g transform="translate(' + headCx + ' ' + (headCy - 12) + ') scale(1.06) translate(' + -headCx + ' ' + -(headCy - 12) + ')">' +
    renderEyes(headCx, headCy - 12, picks.eyes.id, rng, ink, eyeColorHex, uid, dark) + '</g>';
  body += renderMouth(headCx, headCy + 44, picks.mouth.id, rng);

  // ---- neck + chest ----
  const neck = chalkLine([[headCx, neckTop - 2], [headCx, neckTop + neckLen + 2]], rng, 0.8);
  body += tube(neck, 17, ink) + tube(neck, 10, paint.fill);
  body += block(bodyPts, 'b');
  body += renderChest(headCx, chestCy, chestSize, picks.chestMark.id, rng, ink, bodyKind === 'box' ? null : closeLoop(bodyPts));
  if (bodyKind === 'barrel' || bodyKind === 'capsule') {
    // riveted belly band
    const by = chestCy + ch * 0.62, bw = halfWidthAt(bodyPts, headCx, by) - 4;
    body += doubleStroke([[headCx - bw, by], [headCx + bw, by]], rng, 0.8, 'strokeMid');
    for (const rx of [-0.6, -0.2, 0.2, 0.6]) body += '<circle cx="' + (headCx + rx * bw).toFixed(1) + '" cy="' + (by + 7) + '" r="2.6" fill="' + ink + '" opacity=".7"/>';
  }

  // ---- feet ----
  if (!peg) {
    body += renderFoot(headCx - legX, groundY - 13, picks.feet.id, rng, true, paint.shoe);
    body += renderFoot(headCx + legX, groundY - 13, picks.feet.id, rng, false, paint.shoe);
  } else {
    body += doubleStroke([[headCx - legX - 6, groundY - 15], [headCx - legX + 6, groundY - 15], [headCx - legX, groundY - 3], [headCx - legX - 6, groundY - 15]], rng, 1.3, 'stroke');
    body += doubleStroke([[headCx + legX - 6, groundY - 15], [headCx + legX + 6, groundY - 15], [headCx + legX, groundY - 3], [headCx + legX - 6, groundY - 15]], rng, 1.3, 'stroke');
  }

  if (picks.companion.id !== 'none') {
    const cc = picks.companionColor && picks.companionColor.hex;
    body += renderCompanion(headCx + 170, groundY, picks.companion.id, rng, cc, ink, dark);
  }

  // Scoped by #piece{uid} — class styles must not leak between the many inline SVGs on the page.
  const style =
    '<style>' +
    '#piece' + uid + ' .stroke{stroke:' + ink + ';stroke-width:4.2px;fill:none;}' +
    '#piece' + uid + ' .strokeThick{stroke:' + ink + ';stroke-width:6px;fill:none;}' +
    '#piece' + uid + ' .strokeThin{stroke:' + ink + ';stroke-width:2.2px;fill:none;opacity:.85;}' +
    '#piece' + uid + ' .strokeMid{stroke:' + ink + ';stroke-width:3px;fill:none;}' +
    '#piece' + uid + ' .strokeGhost{stroke:' + ink + ';stroke-width:3px;fill:none;opacity:.4;stroke-dasharray:3 3;}' +
    '#piece' + uid + ' .dotFill{fill:' + ink + ';opacity:.5;}' +
    '#piece' + uid + ' .scorchFill{fill:' + ink + ';opacity:.18;}' +
    '</style>';

  return '<svg id="piece' + uid + '" viewBox="' + -OX + ' 0 ' + SW + ' ' + H + '" width="' + SW + '" height="' + H + '" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' + defs + '</defs>' +
    '<rect x="' + -OX + '" y="0" width="' + SW + '" height="' + H + '" fill="' + bg.hex + '"/>' + style +
    back + '<g>' + body + '</g></svg>';
}

// ---------- 1/1-exclusive signature combos ----------
const ONE_OF_ONE_SIGNATURE_COMBOS = [
  {
    name: 'condemned',
    background: 'black', hair: 'wild_spike', ears: 'jagged_broken', eyes: 'void', eyeColor: 'red', mouth: 'fangs_stitch',
    chestMark: 'skull_small', hands: 'broken_stub', feet: 'claw_feet', sky: 'comet', ground: 'scorched', grassColor: 'white', companion: 'cat_ghost', bodyColor: 'obsidian', companionColor: 'ink', headShape: 'octagon', bodyShape: 'box', arms: 'broken', headColor: 'matching'
  }
];
const SIGNATURE_TRAIT_KEYS = ['background', 'hair', 'ears', 'eyes', 'eyeColor', 'mouth', 'chestMark', 'hands', 'feet', 'sky', 'ground', 'grassColor', 'companion', 'bodyColor', 'companionColor', 'headShape', 'bodyShape', 'arms', 'headColor'];
function resolveSignatureCombo(sig) {
  const out = {};
  SIGNATURE_TRAIT_KEYS.forEach((k) => { out[k] = TRAITS[k].find((t) => t.id === sig[k]); });
  return out;
}
function maybeSignatureCombo(rng, isOneOfOne) {
  if (!isOneOfOne) return null;
  for (const sig of ONE_OF_ONE_SIGNATURE_COMBOS) {
    if (rng() < 0.08) return resolveSignatureCombo(sig); // ~8% chance per signature
  }
  return null;
}
function matchesAnySignature(traitIds) {
  return ONE_OF_ONE_SIGNATURE_COMBOS.some((sig) => SIGNATURE_TRAIT_KEYS.every((k) => traitIds[k] === sig[k]));
}
// Non-1/1 pieces that naturally land on the exact signature mutate `ground`
// (low visual impact) so the exact combo stays 1/1-exclusive.
function breakSignatureMatch(picks, rng, groundLocked) {
  const ids = {}; SIGNATURE_TRAIT_KEYS.forEach((k) => { ids[k] = picks[k].id; });
  if (!matchesAnySignature(ids)) return picks;
  if (groundLocked) return picks;
  const alt = TRAITS.ground.filter((g) => g.id !== picks.ground.id);
  if (alt.length) picks.ground = weightedPick(rng, alt);
  return picks;
}

// ---------- curated 1/1 pickers ----------
// Flattened, hand-weighted spreads per category for 1/1 generation — avoids
// forcing tier:'rare' against pools that only have one rare value (the
// collapse bug hit repeatedly on earlier generators).
const ONE_OF_ONE_WEIGHTS = {
  background: [{ id: 'black', weight: 40 }, { id: 'deep_black', weight: 35 }, { id: 'midnight', weight: 25 }],
  bodyColor: [{ id: 'chrome', weight: 12 }, { id: 'gold', weight: 12 }, { id: 'holo', weight: 11 }, { id: 'rose_gold', weight: 11 }, { id: 'purple', weight: 10 }, { id: 'obsidian', weight: 11 }, { id: 'aurora', weight: 11 }, { id: 'cherry', weight: 4 }, { id: 'cobalt', weight: 4 }, { id: 'classic', weight: 4 }],
  companionColor: [{ id: 'golden', weight: 30 }, { id: 'blue', weight: 25 }, { id: 'pink', weight: 25 }, { id: 'ink', weight: 20 }],
  hair: [{ id: 'wild_spike', weight: 30 }, { id: 'mohawk_spike', weight: 26 }, { id: 'none', weight: 24 }, { id: 'tall_spike', weight: 20 }],
  ears: [{ id: 'jagged_broken', weight: 34 }, { id: 'large_round', weight: 30 }, { id: 'antenna_dish', weight: 18 }, { id: 'none', weight: 10 }, { id: 'pointed', weight: 8 }],
  eyes: [{ id: 'void', weight: 32 }, { id: 'asymmetric', weight: 26 }, { id: 'ring_double', weight: 24 }, { id: 'spiral', weight: 18 }],
  eyeColor: [{ id: 'orange', weight: 34 }, { id: 'red', weight: 30 }, { id: 'blue', weight: 26 }, { id: 'default', weight: 10 }],
  mouth: [{ id: 'fangs_stitch', weight: 30 }, { id: 'zipper', weight: 26 }, { id: 'single_line', weight: 24 }, { id: 'stitches_uneven', weight: 20 }],
  chestMark: [{ id: 'skull_small', weight: 14 }, { id: 'blank', weight: 12 }, { id: 'emoji_ghost', weight: 11 }, { id: 'emoji_skull', weight: 11 }, { id: 'emoji_100', weight: 9 }, { id: 'emoji_rainbow', weight: 9 }, { id: 'emoji_rocket', weight: 9 }, { id: 'emoji_broken_heart', weight: 9 }, { id: 'emoji_blast', weight: 9 }, { id: 'circle_target', weight: 7 }, { id: 'slash', weight: 7 }],
  hands: [{ id: 'magnet', weight: 16 }, { id: 'hook', weight: 16 }, { id: 'plug', weight: 14 }, { id: 'pincer', weight: 14 }, { id: 'broken_stub', weight: 12 }, { id: 'claw', weight: 12 }, { id: 'three_finger', weight: 8 }, { id: 'round_paw', weight: 4 }, { id: 'mitten_bow', weight: 4 }],
  headShape: [{ id: 'hex', weight: 20 }, { id: 'octagon', weight: 20 }, { id: 'tv', weight: 18 }, { id: 'dome', weight: 14 }, { id: 'capsule', weight: 12 }, { id: 'round', weight: 10 }, { id: 'box', weight: 6 }],
  bodyShape: [{ id: 'octagon', weight: 20 }, { id: 'capsule', weight: 20 }, { id: 'bell', weight: 16 }, { id: 'trapezoid', weight: 16 }, { id: 'barrel', weight: 12 }, { id: 'round', weight: 10 }, { id: 'box', weight: 6 }],
  headColor: [{ id: 'matching', weight: 30 }, { id: 'gold', weight: 12 }, { id: 'chrome', weight: 12 }, { id: 'holo', weight: 10 }, { id: 'aurora', weight: 10 }, { id: 'obsidian', weight: 10 }, { id: 'charcoal', weight: 8 }, { id: 'snow', weight: 8 }],
  arms: [{ id: 'broken', weight: 24 }, { id: 'telescopic', weight: 16 }, { id: 'floating', weight: 16 }, { id: 'on_floor', weight: 20 }, { id: 'spring', weight: 16 }, { id: 'jointed', weight: 14 }, { id: 'tube', weight: 4 }],
  feet: [{ id: 'claw_feet', weight: 32 }, { id: 'peg_legs', weight: 26 }, { id: 'robot_blocks', weight: 22 }, { id: 'pointed_shoes', weight: 12 }, { id: 'round_stubs', weight: 8 }],
  sky: [{ id: 'comet', weight: 45 }, { id: 'star', weight: 35 }, { id: 'none', weight: 20 }],
  ground: [{ id: 'scorched', weight: 34 }, { id: 'heavy_scribble', weight: 30 }, { id: 'medium_scribble', weight: 20 }, { id: 'light_scribble', weight: 16 }],
  grassColor: [{ id: 'white', weight: 46 }, { id: 'default', weight: 42 }, { id: 'green', weight: 12 }],
  companion: [{ id: 'cat_ghost', weight: 22 }, { id: 'bunny', weight: 20 }, { id: 'cat', weight: 18 }, { id: 'dog', weight: 16 }, { id: 'bird', weight: 14 }, { id: 'none', weight: 10 }]
};
function pickOneOfOne(category, rng) {
  const weights = ONE_OF_ONE_WEIGHTS[category];
  const total = weights.reduce((s, w) => s + w.weight, 0);
  let r = rng() * total;
  for (const w of weights) {
    if (r < w.weight) return TRAITS[category].find((o) => o.id === w.id);
    r -= w.weight;
  }
  return TRAITS[category].find((o) => o.id === weights[0].id);
}

// These chest emoji can ONLY appear on 1/1 pieces. They stay in the normal
// TRAITS.chestMark pool (so tier math and trait-lock chips keep working),
// but any non-1/1 draw that lands on one rerolls to a different value from
// the same tier fallback — unless the user explicitly locked it themselves,
// which always wins.
const ONE_OF_ONE_ONLY_CHESTMARK = ['emoji_broken_heart', 'emoji_blast'];
const ONE_OF_ONE_ONLY_GRASSCOLOR = ['green'];
const ONE_OF_ONE_ONLY_BY_CATEGORY = { chestMark: ONE_OF_ONE_ONLY_CHESTMARK, grassColor: ONE_OF_ONE_ONLY_GRASSCOLOR };

function hexToLab(h) {
  const c = [1, 3, 5].map((i) => { const v = parseInt(h.substr(i, 2), 16) / 255; return v > 0.04045 ? Math.pow((v + 0.055) / 1.055, 2.4) : v / 12.92; });
  const X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
// head colour must read as clearly different from the body colour (classic bodies have no hex: anything goes)
function tooClose(head, body) {
  if (!head || !head.hex) return false;
  if (!body || !body.hex) return false;
  if (head.id === body.id) return true;
  const a = hexToLab(head.hex), b = hexToLab(body.hex);
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 30;
}

function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  const locks = (opts && opts.locks) || {};

  const sigOverride = maybeSignatureCombo(rng, isOneOfOne);

  function pick(category) {
    const sel = locks[category];
    const explicitLock = !!(sel && sel.length);
    if (explicitLock) {
      const sub = TRAITS[category].filter((p) => sel.includes(p.id));
      if (sub.length) return weightedPick(rng, sub);
    }
    if (isOneOfOne) return pickOneOfOne(category, rng);
    let choice = pickByRarity(rng, TRAITS[category], t);
    const exclusiveList = ONE_OF_ONE_ONLY_BY_CATEGORY[category];
    if (exclusiveList && !explicitLock && exclusiveList.includes(choice.id)) {
      const pool = TRAITS[category].filter((p) => !exclusiveList.includes(p.id));
      choice = pickByRarity(rng, pool, t);
    }
    return choice;
  }

  let picks = {
    background: sigOverride ? sigOverride.background : pick('background'),
    hair: sigOverride ? sigOverride.hair : pick('hair'),
    ears: sigOverride ? sigOverride.ears : pick('ears'),
    eyes: sigOverride ? sigOverride.eyes : pick('eyes'),
    eyeColor: sigOverride ? sigOverride.eyeColor : pick('eyeColor'),
    mouth: sigOverride ? sigOverride.mouth : pick('mouth'),
    chestMark: sigOverride ? sigOverride.chestMark : pick('chestMark'),
    hands: sigOverride ? sigOverride.hands : pick('hands'),
    feet: sigOverride ? sigOverride.feet : pick('feet'),
    sky: sigOverride ? sigOverride.sky : pick('sky'),
    ground: sigOverride ? sigOverride.ground : pick('ground'),
    grassColor: sigOverride ? sigOverride.grassColor : pick('grassColor'),
    companion: sigOverride ? sigOverride.companion : pick('companion'),
    // picked last so every earlier trait roll stays identical to v1 for the same seed
    bodyColor: sigOverride ? sigOverride.bodyColor : pick('bodyColor')
  };
  picks.companionColor = picks.companion.id === 'none'
    ? TRAITS.companionColor[0]
    : (sigOverride && sigOverride.companionColor) || (function () {
        const c = pick('companionColor');
        return c.id === 'none' ? weightedPick(rng, TRAITS.companionColor.slice(1)) : c;
      })();
  // v4 shape traits, picked last so every earlier roll is unchanged for a given seed
  picks.headShape = sigOverride ? sigOverride.headShape : pick('headShape');
  picks.bodyShape = sigOverride ? sigOverride.bodyShape : pick('bodyShape');
  picks.arms = sigOverride ? sigOverride.arms : pick('arms');
  // hands-on-the-floor arms reach down where the companion stands: no companion (unless explicitly locked)
  if (picks.arms.id === 'on_floor' && picks.companion.id !== 'none' && !(locks.companion && locks.companion.length)) {
    picks.companion = TRAITS.companion.find((o) => o.id === 'none');
    picks.companionColor = TRAITS.companionColor[0];
  }
  // floating arms are the signature pincer look: pincer hands unless hands were explicitly locked
  if (picks.arms.id === 'floating' && !(locks.hands && locks.hands.length)) picks.hands = TRAITS.hands.find((o) => o.id === 'pincer');
  // two-tone head: rerolled (unless locked) when it is the body colour or too close to it to read as two tones
  picks.headColor = sigOverride && sigOverride.headColor ? sigOverride.headColor : pick('headColor');
  if (!(locks.headColor && locks.headColor.length)) {
    for (let k = 0; k < 8 && picks.headColor.id !== 'matching' && tooClose(picks.headColor, picks.bodyColor); k++) picks.headColor = pick('headColor');
    if (picks.headColor.id !== 'matching' && tooClose(picks.headColor, picks.bodyColor)) picks.headColor = TRAITS.headColor[0];
  }
  if (!isOneOfOne) picks = breakSignatureMatch(picks, rng, !!(locks.ground && locks.ground.length));

  const svg = renderFromTraits(picks, index, seed);
  const traits = {}, rarity = {};
  SIGNATURE_TRAIT_KEYS.forEach((k) => { traits[k] = picks[k].id; rarity[k] = picks[k].rarity; });

  return { index, svg, tier: t, isOneOfOne, traits, rarity };
}

function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

const api = {
  TRAITS, TIER_FALLBACK, CHAIN_THEMES,
  mulberry32, weightedPick, pickByRarity, shadeColor,
  renderFromTraits, generatePiece, generateBatch,
  ONE_OF_ONE_WEIGHTS, pickOneOfOne, ONE_OF_ONE_ONLY_CHESTMARK, ONE_OF_ONE_ONLY_GRASSCOLOR, ONE_OF_ONE_ONLY_BY_CATEGORY,
  ONE_OF_ONE_SIGNATURE_COMBOS, SIGNATURE_TRAIT_KEYS, resolveSignatureCombo,
  maybeSignatureCombo, matchesAnySignature, breakSignatureMatch
};
// Browser detection: check for a real DOM rather than inferring Node from
// "no module var" — some sandboxed preview environments define a stray
// `module` object for their own bundling, which would otherwise misdirect
// this export to module.exports and silently skip window.ChalkbotsGen.
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.ChalkbotsGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
