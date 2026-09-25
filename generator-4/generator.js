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
    { id: 'classic',   weight: 14, rarity: 'common' },               // unfilled: the v1 look
    { id: 'tomato',    hex: '#FF6F59', weight: 20, rarity: 'common' },
    { id: 'sky',       hex: '#79C3FF', weight: 20, rarity: 'common' },
    { id: 'butter',    hex: '#FFD45C', weight: 18, rarity: 'common' },
    { id: 'mint',      hex: '#7FD8BE', weight: 18, rarity: 'common' },
    { id: 'bubblegum', hex: '#FF9ECF', weight: 14, rarity: 'uncommon' },
    { id: 'lilac',     hex: '#B69CFF', weight: 14, rarity: 'uncommon' },
    { id: 'tangerine', hex: '#FF9F45', weight: 12, rarity: 'uncommon' },
    { id: 'steel',     hex: '#A3AEBB', weight: 10, rarity: 'uncommon' },
    { id: 'chrome',    hex: '#C9CED6', weight: 5,  rarity: 'rare' },
    { id: 'gold',      hex: '#F2C14E', weight: 4,  rarity: 'rare' },
    { id: 'holo',      hex: '#C7B8FF', weight: 3,  rarity: 'rare' }
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
    { id: 'broken_stub', weight: 10, rarity: 'rare' }
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
const BASE_WIDTH = { stroke: 4.2, strokeThick: 6, strokeThin: 2.2, strokeGhost: 3 };
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
  const pts = chalkLine(points, rng, amt * 0.45);
  const op = (0.3 + rng() * 0.2).toFixed(2);
  const w = (base * 0.6).toFixed(2);
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

function renderHair(cx, top, style, rng) {
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
    const midY = top - l * 0.55;
    out += doubleStroke([[x, top], [midX, midY], [x + wobble, top - l]], rng, 2.5, 'stroke');
  }
  return out;
}

function renderEyes(cx, cy, style, rng, ink, eyeColor) {
  const spacing = 26;
  const lx = cx - spacing, rx = cx + spacing;
  const col = eyeColor || null;
  function ring(x, y, r) {
    return doubleStroke(
      Array.from({ length: 13 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return [x + Math.cos(a) * r, y + Math.sin(a) * r];
      }), rng, 1.5, 'stroke', col
    );
  }
  function spiral(x, y, r) {
    const pts = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 3.2;
      const rr = (i / 20) * r;
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
    }
    return doubleStroke(pts, rng, 1, 'stroke', col);
  }
  let out = '';
  if (style === 'ring_plain') out += ring(lx, cy, 13) + ring(rx, cy, 13);
  else if (style === 'spiral') out += spiral(lx, cy, 13) + spiral(rx, cy, 13);
  else if (style === 'ring_double') out += ring(lx, cy, 14) + ring(lx, cy, 7) + ring(rx, cy, 14) + ring(rx, cy, 7);
  else if (style === 'asymmetric') out += ring(lx, cy, 13) + spiral(rx, cy, 13);
  else if (style === 'void') {
    const fillCol = col || ink;
    out += '<circle cx="' + lx + '" cy="' + cy + '" r="14" fill="' + fillCol + '"/>';
    out += '<circle cx="' + rx + '" cy="' + cy + '" r="14" fill="' + fillCol + '"/>';
    out += ring(lx, cy, 15) + ring(rx, cy, 15);
  }
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

function renderChest(cx, cy, size, style, rng, ink) {
  const half = size / 2;
  const boxOutline = [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half], [cx - half, cy - half]];
  let out = doubleStroke(boxOutline, rng, 2, 'stroke') + chalkGrain(boxOutline, rng, ink, 0.25);
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

function renderHand(x, y, style, rng, flip, fill) {
  const f = flip ? -1 : 1;
  const fl = ' style="fill:' + (fill || 'none') + '"';
  if (style === 'mitten_bow') {
    return '<circle cx="' + (x + 6 * f) + '" cy="' + y + '" r="9" class="stroke"' + fl + '/>' +
      '<circle cx="' + (x - 6 * f) + '" cy="' + (y + 4) + '" r="7" class="stroke"' + fl + '/>';
  } else if (style === 'claw') {
    let out = '';
    for (let i = -1; i <= 1; i++) out += '<path d="' + pathD(chalkLine([[x, y], [x + i * 8, y + 12]], rng, 1)) + '" class="stroke"/>';
    return out;
  } else if (style === 'broken_stub') {
    return '<path d="' + pathD(chalkLine([[x - 8, y - 4], [x + 6, y + 6], [x - 4, y + 10]], rng, 1.5)) + '" class="stroke" fill="none"/>';
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

function renderCompanion(x, y, style, rng) {
  const cls = style === 'cat_ghost' ? 'strokeGhost' : 'stroke';
  let out = '<g transform="translate(' + x + ',' + y + ')">';

  if (style === 'cat' || style === 'cat_ghost') {
    out += doubleStroke([[-30, 20], [-20, -6], [10, -10], [30, 10], [30, 22]], rng, 2, cls);
    for (const lx of [-22, -8, 8, 22]) out += doubleStroke([[lx, 18], [lx, 34]], rng, 1.5, cls);
    out += doubleStroke(Array.from({ length: 15 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [34 + Math.cos(a) * 16, -4 + Math.sin(a) * 13]; }), rng, 1.2, cls);
    out += doubleStroke([[24, -14], [20, -30], [30, -18]], rng, 1.5, cls);
    out += doubleStroke([[42, -14], [46, -30], [38, -18]], rng, 1.5, cls);
    out += doubleStroke(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [29 + Math.cos(a) * 3.5, -5 + Math.sin(a) * 3.5]; }), rng, 0.8, cls);
    out += doubleStroke(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [39 + Math.cos(a) * 3.5, -5 + Math.sin(a) * 3.5]; }), rng, 0.8, cls);
    for (let i = 0; i < 3; i++) out += doubleStroke([[30 + i * 4, 3], [30 + i * 4, 7]], rng, 0.6, cls);
  } else if (style === 'dog') {
    // Longer snout, floppy ears, wagging tail — same visual language, distinct silhouette.
    out += doubleStroke([[-32, 20], [-22, -4], [12, -8], [34, 12], [34, 22]], rng, 2, cls);
    for (const lx of [-24, -8, 10, 26]) out += doubleStroke([[lx, 18], [lx, 34]], rng, 1.5, cls);
    out += doubleStroke([[34, -6], [50, -2], [48, 8], [34, 6]], rng, 1.2, cls); // snout
    out += doubleStroke(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [30 + Math.cos(a) * 15, -10 + Math.sin(a) * 12]; }), rng, 1.2, cls); // head
    out += doubleStroke([[20, -18], [12, -6], [22, -2]], rng, 1.5, cls); // floppy ear
    out += doubleStroke([[42, -20], [50, -8], [40, -4]], rng, 1.5, cls); // floppy ear
    out += doubleStroke(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [26 + Math.cos(a) * 3, -12 + Math.sin(a) * 3]; }), rng, 0.7, cls);
    out += doubleStroke([[44, 4], [46, 2], [46, 6], [44, 4]], rng, 0.5, cls); // nose
    out += doubleStroke([[-32, 20], [-42, 8], [-46, -2]], rng, 1.5, cls); // tail
  } else if (style === 'bird') {
    out += doubleStroke(Array.from({ length: 15 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [0 + Math.cos(a) * 18, 0 + Math.sin(a) * 14]; }), rng, 1.3, cls); // body
    out += doubleStroke(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [22 + Math.cos(a) * 11, -14 + Math.sin(a) * 10]; }), rng, 1.1, cls); // head
    out += doubleStroke([[32, -14], [44, -10], [32, -6]], rng, 1, cls); // beak
    out += doubleStroke(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [22 + Math.cos(a) * 2.6, -16 + Math.sin(a) * 2.6]; }), rng, 0.6, cls); // eye
    out += doubleStroke([[-6, 10], [-6, 26]], rng, 1.2, cls); // leg
    out += doubleStroke([[8, 10], [8, 26]], rng, 1.2, cls); // leg
    out += doubleStroke([[-10, 26], [-2, 26]], rng, 1, cls);
    out += doubleStroke([[4, 26], [12, 26]], rng, 1, cls);
    out += doubleStroke([[-16, 2], [-30, -6], [-16, -8]], rng, 1.3, cls); // wing
  } else if (style === 'bunny') {
    out += doubleStroke(Array.from({ length: 15 }, (_, i) => { const a = (i / 14) * Math.PI * 2; return [0 + Math.cos(a) * 20, 6 + Math.sin(a) * 15]; }), rng, 1.4, cls); // body
    out += doubleStroke(Array.from({ length: 13 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return [26 + Math.cos(a) * 13, -8 + Math.sin(a) * 11]; }), rng, 1.2, cls); // head
    out += doubleStroke([[20, -18], [16, -42], [24, -20]], rng, 1.4, cls); // long ear
    out += doubleStroke([[32, -18], [36, -42], [28, -20]], rng, 1.4, cls); // long ear
    out += doubleStroke(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [22 + Math.cos(a) * 3, -9 + Math.sin(a) * 3]; }), rng, 0.7, cls);
    out += doubleStroke(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [30 + Math.cos(a) * 3, -9 + Math.sin(a) * 3]; }), rng, 0.7, cls);
    for (const lx of [-14, 0, 12, 24]) out += doubleStroke([[lx, 18], [lx, 30]], rng, 1.3, cls);
    out += doubleStroke(Array.from({ length: 11 }, (_, i) => { const a = (i / 10) * Math.PI * 2; return [-18 + Math.cos(a) * 6, 12 + Math.sin(a) * 6]; }), rng, 1, cls); // tail puff
  }

  out += '</g>';
  return out;
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
function bodyPaint(bodyColor, bg, uid, dark) {
  const id = bodyColor ? bodyColor.id : 'classic';
  if (id === 'classic') {
    const f = dark ? '#262626' : bg.hex;
    return { fill: f, shade: dark ? '#000000' : shadeColor(bg.hex, -22), shoe: dark ? '#3a3a3a' : shadeColor(bg.hex, -12), defs: '', glow: '#ffffff', classic: true };
  }
  const gid = 'bf' + uid;
  const grad = (stops) => '<linearGradient id="' + gid + '" x1="0" y1="0" x2="1" y2="1">' +
    stops.map((c, i) => '<stop offset="' + (i / (stops.length - 1)).toFixed(2) + '" stop-color="' + c + '"/>').join('') + '</linearGradient>';
  if (id === 'chrome') return { fill: 'url(#' + gid + ')', shade: '#6d7580', shoe: '#8e96a1', glow: '#dfe6ee', defs: grad(['#f4f6f9', '#aeb6c1', '#eef1f5', '#8f98a4', '#dde2e8']) };
  if (id === 'gold') return { fill: 'url(#' + gid + ')', shade: '#9a6a12', shoe: '#c9922a', glow: '#ffd970', defs: grad(['#fff1b8', '#e9b340', '#fbe08a', '#c98f1e', '#f6d06a']) };
  if (id === 'holo') return { fill: 'url(#' + gid + ')', shade: '#7b6bd0', shoe: '#a996ff', glow: '#d9c9ff', defs: grad(['#ffd1ec', '#c7b8ff', '#a8e6ff', '#c2ffd9', '#fff3b0', '#ffc2e2']) };
  return { fill: bodyColor.hex, shade: shadeColor(bodyColor.hex, -34), shoe: shadeColor(bodyColor.hex, -22), glow: bodyColor.hex, defs: '' };
}

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

  // ---- proportions: chunkier than v1 (bigger head + chest, shorter legs) ----
  const headSize = 164, headTop = 98, headCx = cx, headCy = headTop + headSize / 2;
  const neckLen = 20, chestSize = 168;
  const neckTop = headTop + headSize;
  const chestCy = neckTop + neckLen + chestSize / 2;
  const hipY = neckTop + neckLen + chestSize;
  const groundY = hipY + 92;
  const hh = headSize / 2, ch = chestSize / 2;
  const shoulderY = chestCy - ch + 14;
  const armL = [[headCx - ch, shoulderY], [headCx - ch - 48, shoulderY + 58], [headCx - ch - 58, shoulderY + 106]];
  const armR = [[headCx + ch, shoulderY], [headCx + ch + 48, shoulderY + 58], [headCx + ch + 58, shoulderY + 106]];
  const legX = 38, peg = picks.feet.id === 'peg_legs';
  const legEnd = peg ? groundY - 12 : groundY - 18;
  const legL = [[headCx - legX, hipY - 4], [headCx - legX, legEnd]];
  const legR = [[headCx + legX, hipY - 4], [headCx + legX, legEnd]];

  let defs = paint.defs;
  let back = '';
  // ---- backdrop: soft halo behind the head + paper grain ----
  const haloFill = dark ? (paint.classic ? '#ffffff' : paint.glow) : (bg.id === 'white' ? '#f3f1ec' : '#ffffff');
  const haloOp = dark ? 0.1 : (bg.id === 'white' ? 1 : 0.55);
  back += '<circle cx="' + cx + '" cy="' + (headCy + 40) + '" r="196" fill="' + haloFill + '" opacity="' + haloOp + '"/>';
  back += '<circle cx="' + cx + '" cy="' + (headCy + 40) + '" r="228" fill="' + haloFill + '" opacity="' + (haloOp * 0.35).toFixed(2) + '"/>';
  let grain = '';
  for (let i = 0; i < 170; i++) {
    grain += '<circle cx="' + (deco() * SW - OX).toFixed(1) + '" cy="' + (deco() * H).toFixed(1) + '" r="' + (0.5 + deco() * 1.1).toFixed(1) + '" fill="' + ink + '" opacity="' + (0.04 + deco() * 0.07).toFixed(2) + '"/>';
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
  let sil = '';
  sil += '<rect x="' + (headCx - hh) + '" y="' + headTop + '" width="' + headSize + '" height="' + headSize + '" rx="6"/>';
  sil += '<rect x="' + (headCx - ch) + '" y="' + (chestCy - ch) + '" width="' + chestSize + '" height="' + chestSize + '" rx="6"/>';
  const tube = (pts, w, col, extra) => '<path d="' + pathD(pts) + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  sil += tube(armL, 14, shadowCol) + tube(armR, 14, shadowCol) + tube(legL, 14, shadowCol) + tube(legR, 14, shadowCol);
  body += '<g transform="translate(' + sdx + ' ' + sdy + ')" fill="' + shadowCol + '" opacity="' + sOp + '">' + sil + '</g>';

  // ---- limbs: outlined tubes (ink casing + colour core), drawn under head/chest ----
  const limb = (pts, jit, thin) => {
    const p = chalkLine(pts, rng, jit);
    return tube(p, thin ? 11 : 15, ink) + tube(p, thin ? 5 : 8.5, paint.fill);
  };
  body += limb(armL, 1.6) + limb(armR, 1.6) + limb(legL, 1.2, peg) + limb(legR, 1.2, peg);
  body += renderHand(armL[2][0], armL[2][1] + 8, picks.hands.id, rng, true, paint.fill);
  body += renderHand(armR[2][0], armR[2][1] + 8, picks.hands.id, rng, false, paint.fill);

  // ---- halftone shading (dots fading in toward the right/bottom edge) ----
  defs += '<pattern id="ht' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="3.5" cy="3.5" r="1.7" fill="' + paint.shade + '"/></pattern>' +
    '<linearGradient id="hg' + uid + '" x1="0" y1="0" x2="1" y2="0.35"><stop offset="0.45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>' +
    '<mask id="hm' + uid + '" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="url(#hg' + uid + ')"/></mask>';
  const block = (x0, y0, size) => {
    // colour plate slightly misregistered from the ink outline, then halftone, then outline
    const ox = 2 + rng() * 3, oy = 2 + rng() * 3;
    let o = fillPath(wobblyRect(x0 + ox, y0 + oy, x0 + size + ox, y0 + size + oy, rng, 1.2), paint.fill);
    o += '<rect x="' + (x0 + ox + 3) + '" y="' + (y0 + oy + 3) + '" width="' + (size - 6) + '" height="' + (size - 6) + '" fill="url(#ht' + uid + ')" mask="url(#hm' + uid + ')" opacity="' + (paint.classic ? 0.35 : 0.55) + '"/>';
    return o;
  };

  // ---- head ----
  body += renderHair(headCx, headTop, picks.hair.id, rng);
  body += block(headCx - hh, headTop, headSize);
  const headOutline = [[headCx - hh, headTop], [headCx + hh, headTop], [headCx + hh, headTop + headSize], [headCx - hh, headTop + headSize], [headCx - hh, headTop]];
  body += doubleStroke(headOutline, rng, 2.5, 'strokeThick');
  body += chalkGrain(headOutline, rng, ink, 0.3);
  body += renderEars(headCx - hh - 24, headCy, picks.ears.id, rng, true, paint.fill);
  body += renderEars(headCx + hh + 24, headCy, picks.ears.id, rng, false, paint.fill);
  // cheek blush
  const blush = dark ? '#ff7aa8' : '#ff6f91';
  body += '<ellipse cx="' + (headCx - 50) + '" cy="' + (headCy + 20) + '" rx="15" ry="8" fill="' + blush + '" opacity="' + (dark ? 0.35 : 0.42) + '"/>';
  body += '<ellipse cx="' + (headCx + 50) + '" cy="' + (headCy + 20) + '" rx="15" ry="8" fill="' + blush + '" opacity="' + (dark ? 0.35 : 0.42) + '"/>';
  const eyeColorHex = picks.eyeColor.hex || null;
  if (eyeColorHex) {
    defs += '<radialGradient id="eg' + uid + '"><stop offset="0" stop-color="' + eyeColorHex + '" stop-opacity="0.75"/><stop offset="1" stop-color="' + eyeColorHex + '" stop-opacity="0"/></radialGradient>';
    body += '<circle cx="' + (headCx - 30) + '" cy="' + (headCy - 12) + '" r="30" fill="url(#eg' + uid + ')"/>';
    body += '<circle cx="' + (headCx + 30) + '" cy="' + (headCy - 12) + '" r="30" fill="url(#eg' + uid + ')"/>';
  }
  // eye sockets: a light plate behind each eye so eyes pop off coloured bodies
  if (!paint.classic) {
    const sock = dark ? '#111111' : '#fffdf7';
    body += '<circle cx="' + (headCx - 30) + '" cy="' + (headCy - 12) + '" r="19" fill="' + sock + '" opacity="0.9"/>';
    body += '<circle cx="' + (headCx + 30) + '" cy="' + (headCy - 12) + '" r="19" fill="' + sock + '" opacity="0.9"/>';
  }
  body += '<g transform="translate(' + headCx + ' ' + (headCy - 12) + ') scale(1.15) translate(' + -headCx + ' ' + -(headCy - 12) + ')">' +
    renderEyes(headCx, headCy - 12, picks.eyes.id, rng, ink, eyeColorHex) + '</g>';
  body += renderMouth(headCx, headCy + 44, picks.mouth.id, rng);

  // ---- neck + chest ----
  const neck = chalkLine([[headCx, neckTop - 2], [headCx, neckTop + neckLen + 2]], rng, 0.8);
  body += tube(neck, 17, ink) + tube(neck, 10, paint.fill);
  body += block(headCx - ch, chestCy - ch, chestSize);
  body += renderChest(headCx, chestCy, chestSize, picks.chestMark.id, rng, ink);

  // ---- feet ----
  if (!peg) {
    body += renderFoot(headCx - legX, groundY - 13, picks.feet.id, rng, true, paint.shoe);
    body += renderFoot(headCx + legX, groundY - 13, picks.feet.id, rng, false, paint.shoe);
  } else {
    body += doubleStroke([[headCx - legX - 6, groundY - 15], [headCx - legX + 6, groundY - 15], [headCx - legX, groundY - 3], [headCx - legX - 6, groundY - 15]], rng, 1.3, 'stroke');
    body += doubleStroke([[headCx + legX - 6, groundY - 15], [headCx + legX + 6, groundY - 15], [headCx + legX, groundY - 3], [headCx + legX - 6, groundY - 15]], rng, 1.3, 'stroke');
  }

  if (picks.companion.id !== 'none') body += renderCompanion(headCx + 132, groundY - 40, picks.companion.id, rng);

  // Scoped by #piece{uid} — class styles must not leak between the many inline SVGs on the page.
  const style =
    '<style>' +
    '#piece' + uid + ' .stroke{stroke:' + ink + ';stroke-width:4.2px;fill:none;}' +
    '#piece' + uid + ' .strokeThick{stroke:' + ink + ';stroke-width:6px;fill:none;}' +
    '#piece' + uid + ' .strokeThin{stroke:' + ink + ';stroke-width:2.2px;fill:none;opacity:.85;}' +
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
    chestMark: 'skull_small', hands: 'broken_stub', feet: 'claw_feet', sky: 'comet', ground: 'scorched', grassColor: 'white', companion: 'cat_ghost', bodyColor: 'chrome'
  }
];
const SIGNATURE_TRAIT_KEYS = ['background', 'hair', 'ears', 'eyes', 'eyeColor', 'mouth', 'chestMark', 'hands', 'feet', 'sky', 'ground', 'grassColor', 'companion', 'bodyColor'];
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
  bodyColor: [{ id: 'chrome', weight: 30 }, { id: 'gold', weight: 28 }, { id: 'holo', weight: 26 }, { id: 'tomato', weight: 8 }, { id: 'classic', weight: 8 }],
  hair: [{ id: 'wild_spike', weight: 30 }, { id: 'mohawk_spike', weight: 26 }, { id: 'none', weight: 24 }, { id: 'tall_spike', weight: 20 }],
  ears: [{ id: 'jagged_broken', weight: 34 }, { id: 'large_round', weight: 30 }, { id: 'antenna_dish', weight: 18 }, { id: 'none', weight: 10 }, { id: 'pointed', weight: 8 }],
  eyes: [{ id: 'void', weight: 32 }, { id: 'asymmetric', weight: 26 }, { id: 'ring_double', weight: 24 }, { id: 'spiral', weight: 18 }],
  eyeColor: [{ id: 'orange', weight: 34 }, { id: 'red', weight: 30 }, { id: 'blue', weight: 26 }, { id: 'default', weight: 10 }],
  mouth: [{ id: 'fangs_stitch', weight: 30 }, { id: 'zipper', weight: 26 }, { id: 'single_line', weight: 24 }, { id: 'stitches_uneven', weight: 20 }],
  chestMark: [{ id: 'skull_small', weight: 14 }, { id: 'blank', weight: 12 }, { id: 'emoji_ghost', weight: 11 }, { id: 'emoji_skull', weight: 11 }, { id: 'emoji_100', weight: 9 }, { id: 'emoji_rainbow', weight: 9 }, { id: 'emoji_rocket', weight: 9 }, { id: 'emoji_broken_heart', weight: 9 }, { id: 'emoji_blast', weight: 9 }, { id: 'circle_target', weight: 7 }, { id: 'slash', weight: 7 }],
  hands: [{ id: 'broken_stub', weight: 34 }, { id: 'claw', weight: 30 }, { id: 'round_paw', weight: 22 }, { id: 'mitten_bow', weight: 14 }],
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
