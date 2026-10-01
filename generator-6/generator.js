// ============================================================
// Chibi Character — Generative Trait Engine v2
// Smooth flat-vector chibi guys (SVG paths/shapes, no pixel grid).
// Background color is a weighted trait; 1/1s draw from a curated palette.
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: inlined into index.html by build.js -> window.ChibiGen
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

// ---------- fixed background ----------
const BG_COLOR = '#d0fa05';

// ---------- 1/1-exclusive background color ----------
// Regular pieces are always BG_COLOR (not a trait). 1/1s draw from this
// curated palette instead, same pattern as the other ONE_OF_ONE_* pickers.
// Add more entries here as more hex codes come in.
const ONE_OF_ONE_BG_WEIGHTS = [
  { id: 'pitch',      hex: '#0b0b10', weight: 25 },
  { id: 'blood_moon', hex: '#8f0014', weight: 25 },
  { id: 'void',       hex: '#22083a', weight: 25 },
  { id: 'toxic',      hex: '#d0fa05', weight: 25 }
];
const ONE_OF_ONE_BG_WEIGHTS_CUTE = [
  { id: 'eth_blue',    hex: '#627EEA', weight: 25 },
  { id: 'red',         hex: '#FF0000', weight: 25 },
  { id: 'punchy_blue', hex: '#3A2BE8', weight: 25 },
  { id: 'rich_lime',   hex: '#B8EB00', weight: 25 }
];
function pickOneOfOneBgColor(rng, vibe) {
  const W = vibe === 'cute' ? ONE_OF_ONE_BG_WEIGHTS_CUTE : ONE_OF_ONE_BG_WEIGHTS;
  const total = W.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of W) {
    if (r < w.weight) return { id: w.id, hex: w.hex, rarity: 'oneOfOne' };
    r -= w.weight;
  }
  const w0 = W[0];
  return { id: w0.id, hex: w0.hex, rarity: 'oneOfOne' };
}

// ---------- trait pools ----------
const TRAITS = {
  skinTone: [
    { id: 'corpse',   weight: 26, hex: '#e6e6e6', rarity: 'common', vibe: 'scary' },
    { id: 'ghoul',    weight: 20, hex: '#8c8c8c', rarity: 'common', vibe: 'scary' },
    { id: 'zombie',   weight: 16, hex: '#7cab4c', rarity: 'uncommon', vibe: 'scary' },
    { id: 'ghost',    weight: 12, hex: '#9ccde4', rarity: 'uncommon', vibe: 'scary' },
    { id: 'bruised',  weight: 12, hex: '#82589e', rarity: 'uncommon', vibe: 'scary' },
    { id: 'blood',    weight: 8,  hex: '#b8322f', rarity: 'rare', vibe: 'scary' },
    { id: 'shadow',   weight: 6,  hex: '#1a1a1a', rarity: 'rare', vibe: 'scary' },
    { id: 'white',    weight: 30, hex: '#ffffff', rarity: 'common',   vibe: 'cute' },
    { id: 'pale',     weight: 22, hex: '#f5e8dc', rarity: 'uncommon', vibe: 'cute' },
    { id: 'gray',     weight: 16, hex: '#9a9a9a', rarity: 'uncommon', vibe: 'cute' },
    { id: 'onyx',     weight: 6,  hex: '#1a1a1a', rarity: 'rare',     vibe: 'cute' },
    { id: 'red',      weight: 11, hex: '#cc3f3f', rarity: 'rare',     vibe: 'cute' },
    { id: 'blue',     weight: 11, hex: '#3f6fcc', rarity: 'rare',     vibe: 'cute' }
  ],
  hairColor: [
    { id: 'black',    weight: 20, hex: '#1a1a1a', rarity: 'common' },
    { id: 'brown',    weight: 18, hex: '#6a4020', rarity: 'common' },
    { id: 'red',      weight: 12, hex: '#e83c3c', rarity: 'uncommon' },
    { id: 'pink',     weight: 12, hex: '#ff5ac8', rarity: 'uncommon' },
    { id: 'blue',     weight: 10, hex: '#5a8af5', rarity: 'uncommon' },
    { id: 'teal',     weight: 10, hex: '#3ce8c8', rarity: 'uncommon' },
    { id: 'orange',   weight: 8,  hex: '#ff8a3c', rarity: 'rare' },
    { id: 'green',    weight: 6,  hex: '#3ce85a', rarity: 'rare' },
    { id: 'yellow',   weight: 6,  hex: '#f5d020', rarity: 'rare' },
    { id: 'white',    weight: 5,  hex: '#f5f5f5', rarity: 'rare' }
  ],
  hairStyle: [
    { id: 'buzz',      weight: 24, rarity: 'common' },
    { id: 'crew',      weight: 20, rarity: 'common' },
    { id: 'fade',      weight: 16, rarity: 'uncommon' },
    { id: 'afro',      weight: 14, rarity: 'uncommon' },
    { id: 'spiky',     weight: 12, rarity: 'uncommon' },
    { id: 'durag',     weight: 8,  rarity: 'rare' },
    { id: 'mohawk',    weight: 6,  rarity: 'rare' }
  ],
  outfitType: [
    { id: 'tank',     weight: 22, rarity: 'common' },
    { id: 'stripes',  weight: 20, rarity: 'common' },
    { id: 'hoodie',   weight: 16, rarity: 'uncommon' },
    { id: 'overalls', weight: 14, rarity: 'uncommon' },
    { id: 'sweater',  weight: 12, rarity: 'uncommon' },
    { id: 'suit',     weight: 6,  rarity: 'rare' }
  ],
  outfitColor: [
    { id: 'midnight', weight: 22, hex: '#2c3a80', rarity: 'common', vibe: 'scary' },
    { id: 'blood',    weight: 18, hex: '#9a1020', rarity: 'common', vibe: 'scary' },
    { id: 'rot',      weight: 16, hex: '#4f7a26', rarity: 'uncommon', vibe: 'scary' },
    { id: 'bruise',   weight: 14, hex: '#5a2a80', rarity: 'uncommon', vibe: 'scary' },
    { id: 'rust',     weight: 12, hex: '#a8481a', rarity: 'uncommon', vibe: 'scary' },
    { id: 'bone',     weight: 10, hex: '#d8d0bc', rarity: 'rare', vibe: 'scary' },
    { id: 'black',    weight: 8,  hex: '#1a1a1a', rarity: 'rare' },
    { id: 'blue',     weight: 22, hex: '#3c5ae8', rarity: 'common',   vibe: 'cute' },
    { id: 'red',      weight: 18, hex: '#e83c5a', rarity: 'common',   vibe: 'cute' },
    { id: 'green',    weight: 16, hex: '#3ce85a', rarity: 'uncommon', vibe: 'cute' },
    { id: 'purple',   weight: 14, hex: '#8a3ce8', rarity: 'uncommon', vibe: 'cute' },
    { id: 'amber',    weight: 12, hex: '#e8a01a', rarity: 'uncommon', vibe: 'cute' },
    { id: 'white',    weight: 10, hex: '#e8e8e8', rarity: 'rare',     vibe: 'cute' }
  ],
  eyeStyle: [
    { id: 'hollow',   weight: 30, rarity: 'common', vibe: 'scary' },
    { id: 'glowing',  weight: 24, rarity: 'common', vibe: 'scary' },
    { id: 'void',     weight: 16, rarity: 'uncommon', vibe: 'scary' },
    { id: 'bleeding', weight: 14, rarity: 'uncommon', vibe: 'scary' },
    { id: 'stitched', weight: 10, rarity: 'uncommon', vibe: 'scary' },
    { id: 'button',   weight: 6,  rarity: 'rare', vibe: 'scary' },
    { id: 'demon',    weight: 6,  rarity: 'rare', vibe: 'scary' },
    { id: 'dot',      weight: 46, rarity: 'common',   vibe: 'cute' },
    { id: 'wide',     weight: 22, rarity: 'common',   vibe: 'cute' },
    { id: 'sleepy',   weight: 16, rarity: 'uncommon', vibe: 'cute' },
    { id: 'wink',     weight: 10, rarity: 'uncommon', vibe: 'cute' },
    { id: 'sparkle',  weight: 6,  rarity: 'rare',     vibe: 'cute' }
  ],
  accessory: [
    { id: 'none',      weight: 44, rarity: 'common' },
    { id: 'cap',       weight: 18, rarity: 'uncommon' },
    { id: 'glasses',   weight: 14, rarity: 'uncommon' },
    { id: 'earring',   weight: 8,  rarity: 'rare' },
    { id: 'chain',     weight: 8,  rarity: 'rare' },
    { id: 'horns',               weight: 3, rarity: 'rare', vibe: 'scary' },
    { id: 'black_horns',         weight: 3, rarity: 'rare', vibe: 'scary' },
    { id: 'broken_horns',        weight: 2, rarity: 'rare', vibe: 'scary' },
    { id: 'broken_black_horns',  weight: 2, rarity: 'rare', vibe: 'scary' },
    { id: 'cracked_horns',       weight: 2, rarity: 'rare', vibe: 'scary' },
    { id: 'cracked_black_horns', weight: 2, rarity: 'rare', vibe: 'scary' }
  ],
  facialHair: [
    { id: 'none',      weight: 50, rarity: 'common' },
    { id: 'stubble',   weight: 20, rarity: 'common' },
    { id: 'mustache',  weight: 12, rarity: 'uncommon' },
    { id: 'goatee',    weight: 12, rarity: 'uncommon' },
    { id: 'beard',     weight: 6,  rarity: 'rare' }
  ],
  // Background scenery — flanking silhouettes in the side-padding columns
  // (buildings, graves) or bats in the top headroom. 'none' dominates the
  // general pool; the five scene variants sum to 110/1000 = 11%.
  backdrop: [
    { id: 'none',             weight: 890, rarity: 'common' },
    { id: 'buildingsSmall',   weight: 22,  rarity: 'rare' },
    { id: 'buildingsTall',    weight: 22,  rarity: 'rare' },
    { id: 'buildingsSkyline', weight: 20,  rarity: 'rare' },
    { id: 'graves',           weight: 26,  rarity: 'rare', vibe: 'scary' },
    { id: 'bats',             weight: 20,  rarity: 'rare', vibe: 'scary' },
    { id: 'birds',            weight: 20,  rarity: 'rare', vibe: 'cute' }
  ],
  background: [
    { id: 'midnight',  hex: '#1d1838', weight: 26, rarity: 'common', vibe: 'scary' },
    { id: 'blood',     hex: '#5c0b12', weight: 22, rarity: 'common', vibe: 'scary' },
    { id: 'fog',       hex: '#3a4046', weight: 20, rarity: 'common', vibe: 'scary' },
    { id: 'toxic',     hex: '#d0fa05', weight: 14, rarity: 'common', vibe: 'scary' },
    { id: 'bruise',    hex: '#3a1648', weight: 12, rarity: 'uncommon', vibe: 'scary' },
    { id: 'ember',     hex: '#7a2406', weight: 6,  rarity: 'rare', vibe: 'scary' },
    { id: 'warm_sand', hex: '#F4A259', weight: 25, rarity: 'common',   vibe: 'cute' },
    { id: 'seafoam',   hex: '#4ECDC4', weight: 22, rarity: 'common',   vibe: 'cute' },
    { id: 'cream',     hex: '#F5F0E8', weight: 20, rarity: 'common',   vibe: 'cute' },
    { id: 'lime',      hex: '#d0fa05', weight: 18, rarity: 'common',   vibe: 'cute' },
    { id: 'lavender',  hex: '#A78BFA', weight: 10, rarity: 'uncommon', vibe: 'cute' },
    { id: 'sunflower', hex: '#FFD23F', weight: 5,  rarity: 'rare',     vibe: 'cute' }
  ],
  // Scary or cute: picks which half of the vibe-tagged pools a piece draws
  // from (untagged values belong to both) and how the scene is lit. Rolled
  // on its own RNG stream so the other traits keep their seed positions.
  vibe: [
    { id: 'scary', weight: 85, rarity: 'common' },
    { id: 'cute',  weight: 15, rarity: 'common' }
  ],
  // Rolled after facialHair so earlier traits keep their seed positions.
  mouth: [
    { id: 'stitched',  weight: 24, rarity: 'common', vibe: 'scary' },
    { id: 'fangs',     weight: 22, rarity: 'common', vibe: 'scary' },
    { id: 'grin',      weight: 18, rarity: 'uncommon', vibe: 'scary' },
    { id: 'gape',      weight: 14, rarity: 'uncommon', vibe: 'scary' },
    { id: 'bloody',    weight: 12, rarity: 'uncommon', vibe: 'scary' },
    { id: 'teeth',     weight: 10, rarity: 'rare', vibe: 'scary' },
    { id: 'smile',     weight: 40, rarity: 'common',   vibe: 'cute' },
    { id: 'beam',      weight: 30, rarity: 'common',   vibe: 'cute' },
    { id: 'smirk',     weight: 30, rarity: 'uncommon', vibe: 'cute' }
  ],
  scars: [
    { id: 'none',      weight: 46, rarity: 'common' },
    { id: 'scar',      weight: 18, rarity: 'common', vibe: 'scary' },
    { id: 'cracks',    weight: 12, rarity: 'uncommon', vibe: 'scary' },
    { id: 'splatter',  weight: 14, rarity: 'uncommon', vibe: 'scary' },
    { id: 'stitches',  weight: 10, rarity: 'rare', vibe: 'scary' }
  ]
};

// Values a piece of this vibe may use (untagged = both vibes).
function vibePool(pool, vibe) { return vibe ? pool.filter(t => !t.vibe || t.vibe === vibe) : pool; }
function vibeRng(seed, index) { return mulberry32((seed ?? 0) * 7907 + index * 53 + 3); }

// ---------- rarity tier fallback ----------
const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  const order = TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare'];
  for (const t of order) {
    const sub = pool.filter(p => p.rarity === t);
    if (sub.length) return weightedPick(rng, sub);
  }
  return weightedPick(rng, pool);
}

// ---------- 1/1-exclusive hair color ----------
// 'rainbow' never appears in the base TRAITS.hairColor pool at all — it's
// only reachable through the dedicated 1/1 picker below, same pattern as
// the ink generator's white-eye exclusivity.
const RAINBOW_HAIR = { id: 'rainbow', hex: '#ff5ac8', rarity: 'rare', isRainbow: true };
const ONE_OF_ONE_HAIR_COLOR_WEIGHTS = [
  { ref: null,          weight: 55 }, // null = fall through to normal curated pick below
  { ref: RAINBOW_HAIR,  weight: 12 }
];
// Curated 1/1 weighting for the non-rainbow slice — favors the rarer colors
// more than plain rarity-tier forcing alone would.
const ONE_OF_ONE_HAIR_WEIGHTS = [
  { id: 'white',  weight: 22 },
  { id: 'green',  weight: 20 },
  { id: 'yellow', weight: 20 },
  { id: 'orange', weight: 18 },
  { id: 'teal',   weight: 12 },
  { id: 'blue',   weight: 8  }
];
function pickOneOfOneHairColor(rng) {
  const rainbowRoll = rng();
  if (rainbowRoll < 0.12) return RAINBOW_HAIR;
  const total = ONE_OF_ONE_HAIR_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_HAIR_WEIGHTS) {
    if (r < w.weight) return TRAITS.hairColor.find(h=>h.id===w.id);
    r -= w.weight;
  }
  return TRAITS.hairColor.find(h=>h.id===ONE_OF_ONE_HAIR_WEIGHTS[0].id);
}

// ---------- 1/1-exclusive skin tone ----------
// TRAITS.skinTone has exactly one entry tagged rarity:'rare' (onyx), so the
// old tierOverride:'rare' path collapsed every 1/1 into the same skin tone.
// Same fix as hair color: a dedicated curated picker that draws across the
// whole pool (favoring the visually rarer tones a bit) instead of filtering
// down to whichever single entry happens to carry the 'rare' tag.
const ONE_OF_ONE_SKIN_TONE_WEIGHTS = [
  { id: 'shadow',  weight: 20 },
  { id: 'blood',   weight: 20 },
  { id: 'zombie',  weight: 18 },
  { id: 'ghost',   weight: 16 },
  { id: 'bruised', weight: 14 },
  { id: 'corpse',  weight: 12 }
];
const ONE_OF_ONE_SKIN_TONE_WEIGHTS_CUTE = [
  { id: 'onyx',  weight: 20 },
  { id: 'red',   weight: 20 },
  { id: 'blue',  weight: 20 },
  { id: 'pale',  weight: 16 },
  { id: 'gray',  weight: 16 },
  { id: 'white', weight: 14 }
];
function pickOneOfOneSkinTone(rng, vibe) {
  const W = vibe === 'cute' ? ONE_OF_ONE_SKIN_TONE_WEIGHTS_CUTE : ONE_OF_ONE_SKIN_TONE_WEIGHTS;
  const total = W.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of W) {
    if (r < w.weight) return TRAITS.skinTone.find(s=>s.id===w.id);
    r -= w.weight;
  }
  return TRAITS.skinTone.find(s=>s.id===W[0].id);
}

// ---------- 1/1-exclusive outfit type ----------
// Same problem, same fix: outfitType only has one 'rare' entry (suit), so
// every 1/1 wore the same outfit. Curated spread across the whole pool.
const ONE_OF_ONE_OUTFIT_WEIGHTS = [
  { id: 'suit',     weight: 22 },
  { id: 'sweater',  weight: 20 },
  { id: 'overalls', weight: 20 },
  { id: 'hoodie',   weight: 20 },
  { id: 'stripes',  weight: 10 },
  { id: 'tank',     weight: 8  }
];
function pickOneOfOneOutfitType(rng) {
  const total = ONE_OF_ONE_OUTFIT_WEIGHTS.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of ONE_OF_ONE_OUTFIT_WEIGHTS) {
    if (r < w.weight) return TRAITS.outfitType.find(o=>o.id===w.id);
    r -= w.weight;
  }
  return TRAITS.outfitType.find(o=>o.id===ONE_OF_ONE_OUTFIT_WEIGHTS[0].id);
}

// ---------- 1/1-exclusive backdrop ----------
// Same curated-picker pattern again: general pieces get backdrop scenery
// only 9% of the time (see TRAITS.backdrop weights above), but 1/1s should
// show it off far more often — 90% here, with a small 'none' slice so it's
// not literally forced on every single 1/1.
const ONE_OF_ONE_BACKDROP_WEIGHTS = [
  { id: 'buildingsSmall',   weight: 18 },
  { id: 'buildingsTall',    weight: 18 },
  { id: 'buildingsSkyline', weight: 16 },
  { id: 'graves',           weight: 22 },
  { id: 'bats',             weight: 16 },
  { id: 'none',             weight: 10 }
];
const ONE_OF_ONE_BACKDROP_WEIGHTS_CUTE = [
  { id: 'buildingsSmall',   weight: 25 },
  { id: 'buildingsTall',    weight: 25 },
  { id: 'buildingsSkyline', weight: 20 },
  { id: 'birds',            weight: 20 },
  { id: 'none',             weight: 10 }
];
function pickOneOfOneBackdrop(rng, vibe) {
  const W = vibe === 'cute' ? ONE_OF_ONE_BACKDROP_WEIGHTS_CUTE : ONE_OF_ONE_BACKDROP_WEIGHTS;
  const total = W.reduce((s,w)=>s+w.weight,0);
  let r = rng() * total;
  for (const w of W) {
    if (r < w.weight) return TRAITS.backdrop.find(b=>b.id===w.id);
    r -= w.weight;
  }
  return TRAITS.backdrop.find(b=>b.id===W[0].id);
}

// ---------- vector canvas ----------
// Characters are drawn as smooth flat-vector shapes (paths, ellipses, rounded
// rects) on a 400x400 viewBox, with a darkened stroke of each shape's own fill
// as its outline. Same composition as before: headroom above, side margins
// for backdrop scenery, and a ground band below the feet.
const VB = 400, SIZE = 600;
const CX = 200;                 // character center line
const HEAD = { cx: 200, cy: 150, rx: 85, ry: 78 };
const EYE_Y = 165, EYE_LX = 165, EYE_RX = 235, EYE_JITTER = 8;
const GROUND_Y = 332;
const STROKE_W = 5;
const CROP = { x: 32, y: 12, size: 336 };

// Darkens/lightens a hex color by percent — used for shading and for the
// per-shape outline (a shape-specific dark tone reads better than one flat
// black outline everywhere).
function shadePixel(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function outlineOf(hex) { return shadePixel(hex, -86); }

// Perceptual brightness of a hex color (0-255) — used to decide whether
// face-feature ink (eyes/mouth/glasses) needs to flip to a light tone, so
// the face doesn't vanish on near-black (onyx) skin.
function luma(hex) {
  const num = parseInt(hex.replace('#',''), 16);
  const r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  return 0.299*r + 0.587*g + 0.114*b;
}
function faceInk(skinHex) {
  return luma(skinHex) < 60
    ? { ink: '#e8e8e8', hl: '#2a2a2a' }  // light ink + dark highlight on dark skin
    : { ink: '#1a1a1a', hl: '#ffffff' }; // default: dark ink + white highlight
}

// ---------- tiny SVG element helpers ----------
function fmt(n) { return Math.round(n * 100) / 100; }
function attrs(o) {
  let s = '';
  for (const k in o) if (o[k] !== undefined && o[k] !== null) s += ` ${k}="${typeof o[k] === 'number' ? fmt(o[k]) : o[k]}"`;
  return s;
}
// Filled shape with its own darkened outline (pass stroke:false for none).
function styled(fill, extra) {
  const e = extra || {};
  const stroke = e.stroke === false ? undefined : (e.stroke || outlineOf(fill.startsWith('url(') ? (e.baseHex || '#888888') : fill));
  return {
    fill,
    stroke,
    'stroke-width': stroke ? (e.sw || STROKE_W) : undefined,
    'stroke-linejoin': stroke ? 'round' : undefined,
    'stroke-linecap': stroke ? 'round' : undefined,
    opacity: e.opacity,
    'fill-opacity': e.fillOpacity
  };
}
function path(d, fill, extra) { return `<path${attrs({ d, ...styled(fill, extra) })}/>`; }
function ellipse(cx, cy, rx, ry, fill, extra) { return `<ellipse${attrs({ cx, cy, rx, ry, ...styled(fill, extra) })}/>`; }
function circle(cx, cy, r, fill, extra) { return `<circle${attrs({ cx, cy, r, ...styled(fill, extra) })}/>`; }
function rrect(x, y, w, h, r, fill, extra) { return `<rect${attrs({ x, y, width: w, height: h, rx: r, ...styled(fill, extra) })}/>`; }
function rrectD(x, y, w, h, r) {
  return `M${x+r} ${y} L${x+w-r} ${y} Q${x+w} ${y} ${x+w} ${y+r} L${x+w} ${y+h-r} Q${x+w} ${y+h} ${x+w-r} ${y+h} L${x+r} ${y+h} Q${x} ${y+h} ${x} ${y+h-r} L${x} ${y+r} Q${x} ${y} ${x+r} ${y} Z`;
}

// ---------- ink + form shading ----------
// Same finishing passes as the ink generators: each major shape gets a soft,
// wide, low-opacity ink underlay beneath its crisp outline (brush bleed), then
// form shading clipped to the shape — a core shadow and fine hatching on the
// side away from a fixed upper-left light, plus a soft highlight on the lit
// side — so volumes read as rounded instead of flat cut-paper.
let _sid = 's';      // per-piece id prefix so inline SVGs on one page never share clip ids
let _clipN = 0;
// Lite mode (gallery thumbnails): skips detail invisible at thumbnail size —
// fine hatching and paper-grain specks — so tiles rasterise much faster.
let _lite = false;
// true while rendering a cute-vibe piece: daylight scene, friendly face
let _cute = false;
function inked(d, fill, extra) {
  const base = fill.startsWith('url(') ? ((extra && extra.baseHex) || '#6a4a8a') : fill;
  // (the old wide, faint "brush bleed" underlay read as blur at thumbnail size, so it's gone:
  // shapes get a crisp outline only)
  void base;
  return path(d, fill, extra);
}
function formShade(d, fill, box, opts) {
  const o = opts || {};
  const id = `${_sid}k${_clipN++}`;
  const [x0, y0, x1, y1] = box, w = x1 - x0, h = y1 - y0;
  const dark = fill.startsWith('url(') ? '#000000' : shadePixel(fill, -28);
  const hatchInk = fill.startsWith('url(') ? '#000000' : outlineOf(fill);
  let g = ellipse(x0 + w * (o.sx || 0.9), y0 + h * (o.sy || 0.78), w * 0.62, h * 0.8, dark, { stroke: false, opacity: o.shadow ?? 0.5 });
  // (no fine hatching: faint 1px lines read as haze, so shading is clean cel shading only)
  void hatchInk;
  if (o.highlight !== false) g += ellipse(x0 + w * 0.28, y0 + h * 0.18, w * 0.15, h * 0.075, '#ffffff', { stroke: false, opacity: Math.min(0.55, (o.hl ?? 0.2) * 1.6) });
  return `<clipPath id="${id}"><path d="${d}"/></clipPath><g clip-path="url(#${id})">${g}</g>`;
}
// Fill + ink underlay + clipped shading + crisp outline redrawn on top.
function shaded(d, fill, box, opts, extra) {
  const e = extra || {};
  const outline = e.stroke === false ? '' : `<path${attrs({ d, ...styled(fill, e), fill: 'none', opacity: undefined, 'fill-opacity': undefined })}/>`;
  return inked(d, fill, { ...e, stroke: false }) + formShade(d, fill, box, opts) + outline;
}

function line(d, color, w, opacity) {
  return `<path${attrs({ d, fill: 'none', stroke: color, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity })}/>`;
}

// ---------- render body + outfit ----------
// Broad, square-shouldered build with a visible neck. Silhouette still
// varies by outfit — hoodie/overalls read bulkier, suit reads slimmer — so
// pieces aren't the same body with a palette swap.
const OUTFIT_WIDTH = { hoodie: 1, overalls: 1, suit: -1, sweater: 0, tank: 0, stripes: 0 };
function torsoPath(x0, x1, top) {
  return `M${x0} 300 L${x0} ${top+16} Q${x0} ${top} ${x0+16} ${top} L${x1-16} ${top} Q${x1} ${top} ${x1} ${top+16} L${x1} 300 Q${x1} 306 ${x1-6} 306 L${x0+6} 306 Q${x0} 306 ${x0} 300 Z`;
}
function drawBodyAndOutfit(skinHex, outfitId, outfitHex) {
  const wPad = (OUTFIT_WIDTH[outfitId] || 0) * 10;
  const x0 = 142 - wPad, x1 = 258 + wPad;
  const shoe = luma(skinHex) < 60 ? '#4a4a5a' : '#2a2a2a';
  const sleeve = outfitId === 'tank' ? skinHex : outfitHex;
  let s = '';

  // legs + sneakers
  s += shaded(rrectD(172, 290, 24, 44, 6), skinHex, [172, 290, 196, 334], { hatch: false });
  s += shaded(rrectD(204, 290, 24, 44, 6), skinHex, [204, 290, 228, 334], { hatch: false, shadow: 0.7 });
  const shoeL = 'M160 340 Q160 326 176 326 L194 326 Q200 326 200 334 L200 342 L160 342 Z';
  const shoeR = 'M240 340 Q240 326 224 326 L206 326 Q200 326 200 334 L200 342 L240 342 Z';
  s += shaded(shoeL, shoe, [160, 326, 200, 342], { hatch: false, hl: 0.3 });
  s += shaded(shoeR, shoe, [200, 326, 240, 342], { hatch: false, hl: 0.3 });
  s += line('M163 339 L197 339', '#f5f5f5', 3);
  s += line('M203 339 L237 339', '#f5f5f5', 3);
  s += line('M176 330 L184 330 M204 330 L212 330', '#f5f5f5', 1.8, 0.8); // laces

  // neck
  s += shaded(rrectD(184, 206, 32, 26, 6), skinHex, [184, 206, 216, 232], { hatch: false, sy: 0.9, shadow: 0.7 });

  // arms (sleeve + fist); right arm sits in the shade
  const fist = (cx, dark) => shaded(`M${cx-13} 294 A13 13 0 1 0 ${cx+13} 294 A13 13 0 1 0 ${cx-13} 294 Z`, skinHex, [cx-13, 281, cx+13, 307], { hatch: false, shadow: dark ? 0.7 : 0.4 }) +
    line(`M${cx-6} 300 L${cx-6} 304 M${cx} 301 L${cx} 305 M${cx+6} 300 L${cx+6} 304`, shadePixel(skinHex, -40), 1.6, 0.8);
  s += fist(x0 - 11, false);
  s += fist(x1 + 11, true);
  s += shaded(rrectD(x0 - 25, 230, 30, 60, 12), sleeve, [x0 - 25, 230, x0 + 5, 290], { sx: 1.1, shadow: 0.35 });
  s += shaded(rrectD(x1 - 5, 230, 30, 60, 12), sleeve, [x1 - 5, 230, x1 + 25, 290], { sx: 0.7, shadow: 0.6 });
  if (outfitId !== 'tank') { // elbow creases
    s += line(`M${x0-18} 262 Q${x0-10} 266 ${x0-4} 262`, outlineOf(sleeve), 2, 0.45);
    s += line(`M${x1+4} 262 Q${x1+10} 266 ${x1+18} 262`, outlineOf(sleeve), 2, 0.45);
  }
  if (outfitId === 'sweater') {
    s += rrect(x0 - 25, 276, 30, 12, 5, '#f5f5f5');
    s += rrect(x1 - 5, 276, 30, 12, 5, '#f5f5f5');
  }

  // torso
  const top = outfitId === 'tank' ? 232 : 222;
  if (outfitId === 'tank') {
    s += path(`M${x0+12} 218 L${x1-12} 218 L${x1-12} 240 L${x0+12} 240 Z`, skinHex); // bare shoulders/chest
  }
  s += shaded(torsoPath(x0, x1, top), outfitHex, [x0, top, x1, 306], { sx: 0.95, sy: 0.7 });
  // fabric folds from the armpits and at the waist
  s += line(`M${x0+10} ${top+22} Q${x0+22} ${top+34} ${x0+16} ${top+50}`, outlineOf(outfitHex), 2, 0.4);
  s += line(`M${x1-10} ${top+22} Q${x1-22} ${top+34} ${x1-16} ${top+50}`, outlineOf(outfitHex), 2, 0.4);
  s += line(`M${x0+30} 292 Q${CX} 298 ${x1-30} 292`, outlineOf(outfitHex), 2, 0.3);

  if (outfitId === 'tank') {
    s += rrect(x0 + 14, 216, 14, 22, 5, outfitHex);
    s += rrect(x1 - 28, 216, 14, 22, 5, outfitHex);
  } else if (outfitId === 'stripes') {
    s += rrect(x0 + 3, 244, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
    s += rrect(x0 + 3, 266, x1 - x0 - 6, 9, 3, '#f5f5f5', { stroke: false });
  } else if (outfitId === 'overalls') {
    const bib = '#3c5ae8';
    s += line(`M176 250 L${x0+18} 226`, outlineOf(bib), 10);
    s += line(`M224 250 L${x1-18} 226`, outlineOf(bib), 10);
    s += line(`M176 250 L${x0+18} 226`, bib, 6);
    s += line(`M224 250 L${x1-18} 226`, bib, 6);
    s += path(`M170 246 L230 246 L230 304 L170 304 Z`, bib);
    s += circle(178, 256, 4, '#f5d020');
    s += circle(222, 256, 4, '#f5d020');
    s += rrect(186, 266, 28, 18, 4, shadePixel(bib, -15)); // front pocket
  } else if (outfitId === 'suit') {
    s += path(`M180 ${top} L200 266 L220 ${top} Z`, '#e8e8e8');
    s += path(`M195 ${top+8} L205 ${top+8} L209 258 L200 270 L191 258 Z`, '#e83c3c');
    s += line(`M180 ${top} L192 262`, outlineOf(outfitHex), 4);
    s += line(`M220 ${top} L208 262`, outlineOf(outfitHex), 4);
  } else if (outfitId === 'sweater') {
    s += rrect(x0 + 2, 288, x1 - x0 - 4, 16, 5, '#f5f5f5');
    s += path(`M180 ${top} Q200 ${top+14} 220 ${top}`, 'none', { stroke: '#f5f5f5', sw: 6 });
  } else if (outfitId === 'hoodie') {
    s += path(`M154 232 Q200 262 246 232 Q242 212 200 212 Q158 212 154 232 Z`, shadePixel(outfitHex, -22));
    s += line(`M188 240 L186 266`, '#f5f5f5', 4);
    s += line(`M212 240 L214 266`, '#f5f5f5', 4);
    s += path(`M170 272 L230 272 L238 298 L162 298 Z`, shadePixel(outfitHex, -12)); // kangaroo pocket
  }
  return s;
}

// ---------- render head + face ----------
// Squarer jaw than a plain oval — the rounded-egg head was a big part of
// the soft/feminine read.
const HEAD_PATH = 'M200 72 C258 72 286 102 286 148 C286 180 280 204 262 218 C246 228 224 230 200 230 C176 230 154 228 138 218 C120 204 114 180 114 148 C114 102 142 72 200 72 Z';
function drawHead(skinHex) {
  let s = '';
  const ear = (cx, dir) => inked(`M${cx-15} 160 A15 15 0 1 0 ${cx+15} 160 A15 15 0 1 0 ${cx-15} 160 Z`, skinHex) +
    line(`M${cx+dir*4} 152 Q${cx-dir*6} 158 ${cx+dir*2} 168`, shadePixel(skinHex, -35), 2.5, 0.7);
  s += ear(HEAD.cx - HEAD.rx + 1, -1);
  s += ear(HEAD.cx + HEAD.rx - 1, 1);
  s += shaded(HEAD_PATH, skinHex, [114, 72, 286, 230], { sx: 0.95, sy: 0.72, shadow: 0.42, hl: 0.24 });
  const contour = shadePixel(skinHex, luma(skinHex) < 60 ? 30 : -30);
  // nose (lit from the upper-left, so its shadow falls to the right) + cheekbone line
  s += line('M198 172 Q206 182 200 188 Q196 190 192 187', contour, 3, 0.75);
  s += line('M254 186 Q262 196 256 208', contour, 2.5, 0.35);
  return s;
}

// Thick brows angled down hard toward the nose — a permanent glare.
function drawBrows(eyeStyle, jx, skinHex) {
  const { ink } = faceInk(skinHex);
  const xs = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER];
  const tilt = _cute ? (eyeStyle === 'sleepy' ? 0 : 4) : (eyeStyle === 'void' ? -2 : 9); // inner ends lower = more determined look
  return line(`M${xs[0]-15} ${EYE_Y-22} L${xs[0]+12} ${EYE_Y-22+tilt}`, ink, 6) +
    line(`M${xs[1]-12} ${EYE_Y-22+tilt} L${xs[1]+15} ${EYE_Y-22}`, ink, 6);
}

// Horror mouths. A small seeded offset keeps them from sitting on exactly the
// same spot on every face.
const CAVITY = '#1a0406', BLOOD = '#a3000f', TOOTH = '#f2ecd8';
function drawMouth(style, skinHex, rng, centred) {
  // rng draws kept for seed stability, but every mouth now sits dead-centre under the nose
  if (rng() < 0.4) rng();
  const ox = 0;
  const x = CX + ox;
  // under a mustache the mouth drops a little so the mustache doesn't sit on the lip / teeth
  // with a goatee/beard it stays up in the gap between mustache and chin hair, so it doesn't vanish into the beard
  if (centred && style !== 'fangs') return `<g transform="translate(0 ${centred === 'beard' || centred === 'goatee' ? 1 : 5})">` + drawMouth(style, skinHex, () => 0.9, false) + '</g>';
  const { ink } = faceInk(skinHex);
  const lip = luma(skinHex) < 60 ? shadePixel(skinHex, 40) : shadePixel(skinHex, -50);
  const rim = { stroke: luma(skinHex) < 60 ? '#6a6a6a' : outlineOf(skinHex), sw: 2.5 };
  let s = '';
  if (style === 'covered') {
    // hidden under a goatee / beard
  } else if (style === 'smile') {
    s += line(`M${x-10} 200 Q${x} 206 ${x+10} 200`, lip, 4);
  } else if (style === 'beam') {
    s += line(`M${x-15} 200 Q${x} 210 ${x+15} 200`, lip, 4);
  } else if (style === 'smirk') {
    s += line(`M${x-10} 202 Q${x} 205 ${x+10} 196`, lip, 4);
  } else if (style === 'stitched') {
    s += line(`M${x-24} 202 Q${x} 206 ${x+24} 200`, lip, 4);
    for (let i = -18; i <= 18; i += 9) s += line(`M${x+i} 195 L${x+i+1} 210`, lip, 2.5);
  } else if (style === 'fangs') {
    // mirrored pair: same size, same height, hanging straight from a level lip
    // (under a mustache the mustache itself is the lip, so the fangs hang just below it)
    const fy = centred ? 197 : 200;
    s += path(`M${x-12} ${fy} L${x-8} ${fy+14} L${x-4} ${fy} Z`, TOOTH, { stroke: ink, sw: 1.8 });
    s += path(`M${x+4} ${fy} L${x+8} ${fy+14} L${x+12} ${fy} Z`, TOOTH, { stroke: ink, sw: 1.8 });
    if (!centred) s += line(`M${x-18} ${fy-2} Q${x} ${fy+4} ${x+18} ${fy-2}`, lip, 4);
  } else if (style === 'grin') {
    // wide jack-o'-lantern grin with jagged teeth
    const cav = `M${x-32} 192 Q${x} 206 ${x+32} 192 Q${x+22} 222 ${x} 222 Q${x-22} 222 ${x-32} 192 Z`;
    let t = `M${x-28} 195`;
    for (let i = -28; i < 28; i += 8) t += ` L${x+i+4} ${i % 16 === 0 ? 208 : 205} L${x+i+8} ${197 + Math.abs(i) * 0.08}`;
    // teeth are clipped to the mouth so none poke out past the lips at the corners
    const gid = `${_sid}k${_clipN++}`;
    s += path(cav, CAVITY, { stroke: false });
    s += `<clipPath id="${gid}"><path d="${cav}"/></clipPath><g clip-path="url(#${gid})">` +
      path(t + ` Q${x} 203 ${x-28} 195 Z`, TOOTH, { stroke: false }) +
      path(`M${x-14} 222 L${x-10} 212 L${x-6} 222 Z M${x+6} 222 L${x+10} 212 L${x+14} 222 Z`, TOOTH, { stroke: false }) + '</g>';
    s += path(cav, 'none', rim);
  } else if (style === 'gape') {
    s += ellipse(x, 205, 10, 13, CAVITY, rim);
    // short drip that ends on the chin (it used to run down past the head onto the shirt)
    s += path(`M${x+3} 216 Q${x+5} 221 ${x+4.5} 225 Q${x+3} 228.5 ${x+1.5} 225 Q${x+1} 221 ${x+1} 217 Z`, '#c8e8b0', { stroke: false, opacity: 0.85 });
  } else if (style === 'bloody') {
    s += line(`M${x-16} 202 Q${x} 198 ${x+16} 202`, lip, 4);
    s += path(`M${x+10} 202 Q${x+14} 212 ${x+13} 224 Q${x+13} 232 ${x+9} 232 Q${x+6} 230 ${x+7} 222 Q${x+8} 212 ${x+10} 202 Z`, BLOOD, { stroke: false });
    s += path(`M${x-12} 203 Q${x-10} 210 ${x-11} 214 Q${x-13} 216 ${x-14} 213 Q${x-14} 208 ${x-12} 203 Z`, BLOOD, { stroke: false });
  } else if (style === 'teeth') {
    // lipless, skull-like rows of teeth
    s += rrect(x - 22, 194, 44, 20, 6, TOOTH, rim);
    s += line(`M${x-22} 204 L${x+22} 204`, CAVITY, 2.5);
    for (let i = -14; i <= 14; i += 7) s += line(`M${x+i} 195 L${x+i} 213`, CAVITY, 1.8);
  }
  return s;
}

function sparkleStar(x, y, r, color) {
  const i = r * 0.3;
  return path(`M${x} ${y-r} Q${x+i} ${y-i} ${x+r} ${y} Q${x+i} ${y+i} ${x} ${y+r} Q${x-i} ${y+i} ${x-r} ${y} Q${x-i} ${y-i} ${x} ${y-r} Z`, color, { stroke: false });
}

// Soft glow built from stacked translucent circles (no SVG filters — those
// render blurry inside <img> thumbnails on Safari).
function glow(x, y, r, color) {
  return circle(x, y, r * 1.6, color, { stroke: false, opacity: 0.14 }) +
    circle(x, y, r * 1.3, color, { stroke: false, opacity: 0.24 });
}

// Dark, sunken sockets under every eye style so the whole face reads gaunt.
function drawSunken(jx, skinHex) {
  if (_cute) return '';
  const c = luma(skinHex) < 60 ? '#000000' : shadePixel(skinHex, -45);
  return [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER].map(x =>
    ellipse(x, EYE_Y + 2, 17, 15, c, { stroke: false, opacity: 0.32 }) +
    path(`M${x-14} ${EYE_Y+14} Q${x} ${EYE_Y+22} ${x+14} ${EYE_Y+14}`, 'none', { stroke: c, sw: 2.5, opacity: 0.7 })).join('');
}

function drawEyes(style, jx, skinHex) {
  const { ink } = faceInk(skinHex);
  const xs = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER], y = EYE_Y;
  const socketRim = luma(skinHex) < 60 ? { stroke: '#5a5a5a', sw: 2 } : { stroke: false };
  let s = '';
  const hl = faceInk(skinHex).hl;
  const openEye = (x) => ellipse(x, y, 8, 10, ink, { stroke: false }) + circle(x + 3, y - 3, 2.5, hl, { stroke: false });
  if (style === 'dot') {
    xs.forEach(x => { s += openEye(x); });
  } else if (style === 'wide') {
    xs.forEach(x => {
      s += ellipse(x, y, 13, 12, '#ffffff', { stroke: ink, sw: 3 });
      s += circle(x, y + 1, 7, luma(skinHex) < 60 ? '#1a1a1a' : ink, { stroke: false });
      s += circle(x + 2, y - 1, 2.5, '#ffffff', { stroke: false });
    });
  } else if (style === 'sleepy') {
    xs.forEach(x => {
      s += path(`M${x-10} ${y} L${x+10} ${y} Q${x+10} ${y+9} ${x} ${y+9} Q${x-10} ${y+9} ${x-10} ${y} Z`, ink, { stroke: false });
      s += line(`M${x-12} ${y} L${x+12} ${y}`, ink, 4);
    });
  } else if (style === 'wink') {
    s += openEye(xs[0]);
    s += line(`M${xs[1]-10} ${y+1} L${xs[1]+10} ${y+1}`, ink, 4);
  } else if (style === 'sparkle') {
    xs.forEach(x => {
      s += ellipse(x, y, 10, 12, ink, { stroke: false });
      s += sparkleStar(x + 3, y - 3, 5, hl);
    });
  } else if (style === 'hollow') {
    xs.forEach(x => {
      s += ellipse(x, y, 14, 15, '#07070a', socketRim);
      s += glow(x, y + 1, 4, '#ffffff') + circle(x, y + 1, 2.6, '#ffffff', { stroke: false });
    });
  } else if (style === 'glowing') {
    xs.forEach(x => {
      s += ellipse(x, y, 13, 12, '#1a0000', socketRim);
      s += glow(x, y, 9, '#ff2a1a');
      s += ellipse(x, y, 8, 7, '#ff3b2a', { stroke: false }) + circle(x, y, 3, '#ffd6c8', { stroke: false });
    });
  } else if (style === 'void') {
    xs.forEach(x => {
      s += ellipse(x, y, 14, 14, '#f4f2e6', { stroke: ink, sw: 3 });
      s += line(`M${x-13} ${y+2} L${x-6} ${y+1} L${x-3} ${y+5}`, '#c0101a', 1.4, 0.8);
      s += line(`M${x+13} ${y-3} L${x+7} ${y-1} L${x+5} ${y-6}`, '#c0101a', 1.4, 0.8);
    });
  } else if (style === 'bleeding') {
    xs.forEach((x, i) => {
      s += ellipse(x, y, 10, 12, '#07070a', socketRim);
      s += circle(x + 3, y - 3, 2, '#ffffff', { stroke: false, opacity: 0.8 });
      const len = i ? 30 : 42, bx = x - 2 + i * 3;
      s += path(`M${bx-3} ${y+9} Q${bx-2} ${y+len*0.6} ${bx-4} ${y+len} Q${bx} ${y+len+7} ${bx+4} ${y+len} Q${bx+2} ${y+len*0.6} ${bx+3} ${y+9} Z`, BLOOD, { stroke: false });
    });
  } else if (style === 'stitched') {
    xs.forEach(x => {
      s += line(`M${x-10} ${y-10} L${x+10} ${y+10} M${x+10} ${y-10} L${x-10} ${y+10}`, ink, 5);
    });
  } else if (style === 'button') {
    ['#7a1020', '#1f1f2a'].forEach((c, i) => {
      const x = xs[i];
      s += circle(x, y, 13, c, { stroke: outlineOf(c), sw: 3 });
      s += circle(x - 3, y - 4, 4, '#ffffff', { stroke: false, opacity: 0.18 });
      [[-4,-4],[4,-4],[-4,4],[4,4]].forEach(([dx,dy]) => { s += circle(x+dx, y+dy, 2, '#07070a', { stroke: false }); });
      s += line(`M${x-4} ${y-4} L${x+4} ${y+4} M${x+4} ${y-4} L${x-4} ${y+4}`, '#e8e0c8', 1.6);
    });
  } else if (style === 'demon') {
    xs.forEach(x => {
      s += glow(x, y, 9, '#ffb000');
      s += ellipse(x, y, 13, 11, '#ffb000', { stroke: '#3a1a00', sw: 2.5 });
      s += ellipse(x, y, 2.6, 10, '#07070a', { stroke: false });
    });
  }
  return s;
}

// Wounds and marks drawn over the finished face.
function drawScars(style, skinHex, jx) {
  if (!style || style === 'none') return '';
  const seam = luma(skinHex) < 60 ? '#8a8a8a' : shadePixel(skinHex, -55);
  const lx = EYE_LX + jx*EYE_JITTER;
  let s = '';
  if (style === 'scar') {
    // a stitched gash straight down through the left eye
    s += line(`M${lx+6} ${EYE_Y-34} Q${lx-2} ${EYE_Y} ${lx-10} ${EYE_Y+42}`, '#c85a6a', 5, 0.85);
    for (let t = 0.12; t < 0.95; t += 0.2) {
      const px = lx + 6 - 16 * t, py = EYE_Y - 34 + 76 * t;
      s += line(`M${fmt(px-7)} ${fmt(py-1)} L${fmt(px+7)} ${fmt(py+1)}`, seam, 2.2);
    }
  } else if (style === 'cracks') {
    s += line('M270 128 L252 146 L260 156 L240 176 M252 146 L236 142', seam, 2.6, 0.9);
    s += line('M124 180 L140 188 L136 202 L150 212', seam, 2.4, 0.85);
  } else if (style === 'splatter') {
    [[236,128,5],[248,140,3],[226,138,2.5],[258,122,2],[152,204,4],[142,196,2.2],[260,190,3.5],[214,262,6],[230,276,3],[186,284,4]].forEach(([x,y,r]) => {
      s += circle(x, y, r, BLOOD, { stroke: false, opacity: 0.9 });
    });
    s += path('M214 266 Q216 280 213 292 Q210 296 208 290 Q209 280 212 266 Z', BLOOD, { stroke: false, opacity: 0.9 });
  } else if (style === 'stitches') {
    // Frankenstein seam across the forehead
    s += line('M140 124 Q200 112 262 124', seam, 3.5);
    for (let x = 148; x <= 254; x += 13) {
      const y = 124 - Math.sin((x - 140) / 122 * Math.PI) * 11;
      s += line(`M${x} ${fmt(y-7)} L${x+2} ${fmt(y+7)}`, seam, 2.4);
    }
  }
  return s;
}

// ---------- facial hair ----------
function drawFacialHair(style, hairColor, skinHex) {
  if (!style || style === 'none') return '';
  // Facial hair only follows natural hair colors — a pink or teal mustache
  // reads as lipstick — so dyed/rainbow hair gets a dark-brown beard.
  const NATURAL = ['black', 'brown', 'white'];
  let c = NATURAL.includes(hairColor.id) ? hairColor.hex : '#3a2a1a';
  // keep it visible when hair and skin are near-identical (e.g. black on onyx)
  if (Math.abs(luma(c) - luma(skinHex)) < 30) c = luma(skinHex) < 60 ? '#4a4a4a' : shadePixel(c, -40);
  const mustache = path('M182 194 Q191 186 200 191 Q209 186 218 194 Q210 199 200 196 Q190 199 182 194 Z', c, { stroke: false });
  if (style === 'stubble') {
    // fine stipple (a flat translucent patch read as a dirty smudge)
    const area = 'M152 202 Q158 223 200 225 Q242 223 248 202 Q236 215 200 215 Q164 215 152 202 Z M184 191 Q200 186 216 191 L216 195 Q200 191 184 195 Z';
    const sid = `${_sid}k${_clipN++}`;
    let dots = '';
    for (let yy = 185; yy <= 226; yy += 3.1) for (let xx = 150; xx <= 250; xx += 3.3) {
      const h = Math.sin(xx * 12.9898 + yy * 78.233) * 43758.5453, f = h - Math.floor(h);
      dots += `M${(xx + f * 1.3).toFixed(1)} ${(yy + ((f * 7) % 1) * 1.3).toFixed(1)}h0.01`;
    }
    return `<clipPath id="${sid}"><path d="${area}"/></clipPath><path d="${dots}" stroke="${c}" stroke-width="1.2" stroke-linecap="round" opacity="0.45" clip-path="url(#${sid})"/>`;
  } else if (style === 'mustache') {
    return mustache;
  } else if (style === 'goatee') {
    return mustache + path('M187 214 Q200 211 213 214 L209 227 Q200 232 191 227 Z', c, { stroke: false });
  } else if (style === 'beard') {
    const beard = 'M122 160 Q122 226 200 234 Q278 226 278 160 L266 164 Q262 212 224 216 Q212 211 200 211 Q188 211 176 216 Q138 212 134 164 Z';
    return shaded(beard, c, bboxOfD(beard), { shadow: 0.4, hl: 0.12 }) + mustache;
  }
  return '';
}

// ---------- render hair ----------
// Short masculine cuts. Each style has an optional back layer (drawn behind
// head/body) and a front layer (drawn over the forehead).
const HAIR_SHAPES = {
  buzz: {
    front: 'M118 140 Q116 70 200 68 Q284 70 282 140 Q270 104 200 100 Q130 104 118 140 Z'
  },
  crew: {
    front: 'M116 146 L114 118 Q112 62 196 58 Q292 58 288 118 L286 146 L276 146 Q276 118 262 104 Q226 110 192 98 Q156 110 132 112 Q124 124 126 146 Z'
  },
  fade: { // high-top fade: flat top over faded sides
    sides: 'M118 142 Q116 76 200 74 Q284 76 282 142 Q270 108 200 104 Q130 108 118 142 Z',
    front: 'M128 110 Q124 70 132 44 Q140 30 200 28 Q260 30 268 44 Q276 70 272 110 Q236 98 200 98 Q164 98 128 110 Z'
  },
  afro: {
    back: 'M200 22 C260 22 296 54 296 110 C296 146 286 170 276 180 L124 180 C114 170 104 146 104 110 C104 54 140 22 200 22 Z',
    front: 'M120 134 Q124 82 200 80 Q276 82 280 134 Q244 112 200 114 Q156 112 120 134 Z'
  },
  spiky: {
    front: 'M118 138 L110 94 L136 102 L132 60 L160 82 L168 40 L192 72 L206 32 L222 70 L242 42 L248 84 L272 64 L268 102 L292 96 L282 138 Q262 110 200 106 Q138 110 118 138 Z'
  },
  durag: {
    back: 'M268 108 Q322 146 316 232 L298 236 Q302 172 256 132 Z M258 118 Q300 160 290 236 L276 236 Q282 176 248 140 Z',
    front: 'M112 148 Q104 60 200 56 Q296 60 288 148 Q250 126 200 124 Q150 126 112 148 Z'
  },
  mohawk: {
    sides: 'M118 140 Q116 70 200 68 Q284 70 282 140 Q270 104 200 100 Q130 104 118 140 Z',
    front: 'M180 116 L170 62 L188 74 L190 30 L204 58 L216 26 L218 70 L232 58 L222 116 Q200 106 180 116 Z'
  }
};
function hairFill(hairColor, gradId) {
  return hairColor.isRainbow ? `url(#${gradId})` : hairColor.hex;
}
// Bounding box of a path made only of absolute M/L/Q/C/Z commands (x,y pairs).
function bboxOfD(d) {
  const n = d.match(/-?\d+(\.\d+)?/g).map(Number);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i+1]); y1 = Math.max(y1, n[i+1]); }
  return [x0, y0, x1, y1];
}
function drawHairBack(style, hairColor, gradId) {
  const shape = HAIR_SHAPES[style];
  if (!shape || !shape.back) return '';
  return shaded(shape.back, hairFill(hairColor, gradId), bboxOfD(shape.back), { shadow: 0.45 }, { baseHex: '#6a4a8a' });
}
// Sideburns stay visible under a cap, which hides the rest of the front hair.
function drawSideburns(hairColor, gradId) {
  const f = hairFill(hairColor, gradId);
  return rrect(116, 124, 12, 40, 4, f, { baseHex: '#6a4a8a' }) + rrect(272, 124, 12, 40, 4, f, { baseHex: '#6a4a8a' });
}
function drawHairFront(style, hairColor, gradId, capped) {
  const shape = HAIR_SHAPES[style];
  if (!shape) return '';
  if (capped) return style === 'durag' ? '' : drawSideburns(hairColor, gradId);
  const fill = hairFill(hairColor, gradId);
  let s = '';
  if (shape.sides) s += path(shape.sides, fill, { baseHex: '#6a4a8a', opacity: 0.55 });
  // the afro's hairline blends into its back layer, so it gets no outline
  s += shaded(shape.front, fill, bboxOfD(shape.front), { shadow: 0.4, hl: 0.28 }, style === 'afro' ? { stroke: false } : { baseHex: '#6a4a8a' });
  if (style === 'durag') {
    s += line('M200 58 L200 124', hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25), 4, hairColor.isRainbow ? 0.5 : undefined);
    s += line('M140 98 Q170 84 196 80', '#ffffff', 5, 0.3);
  } else if (style === 'fade') {
    const curl = hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25);
    [[156,50],[200,42],[244,50],[176,74],[224,74],[146,90],[254,90]].forEach(([x,y]) => { s += line(`M${x-7} ${y} Q${x} ${y-7} ${x+7} ${y}`, curl, 3, 0.6); });
  } else if (style === 'afro') {
    const curl = hairColor.isRainbow ? '#ffffff' : shadePixel(hairColor.hex, -25);
    [[146,52],[200,36],[254,52],[118,100],[282,100],[172,66],[228,66]].forEach(([x,y]) => { s += line(`M${x-8} ${y} Q${x} ${y-8} ${x+8} ${y}`, curl, 3, 0.6); });
  } else if (style !== 'mohawk' && style !== 'spiky' && style !== 'fade') {
    s += line('M146 92 Q164 78 190 74', '#ffffff', 5, 0.3); // sheen
  }
  return s;
}

// ---------- render accessory ----------
const CAP_COLOR = '#e83c5a';
function drawAccessory(style, jx, skinHex) {
  if (style === 'cap') {
    const crown = 'M112 136 Q106 54 200 50 Q294 54 288 136 Q200 118 112 136 Z';
    return shaded(crown, CAP_COLOR, bboxOfD(crown), { shadow: 0.4, hl: 0.3 }) +
      path('M200 124 Q262 116 318 132 Q322 144 306 146 Q256 136 200 138 Z', shadePixel(CAP_COLOR, -18)) +
      circle(200, 52, 5, shadePixel(CAP_COLOR, -18)) +
      line('M200 54 L200 122', shadePixel(CAP_COLOR, -30), 3);
  } else if (style === 'glasses') {
    // Square frames aligned to the same jx as drawEyes so the lenses sit on
    // the actual eyes; eyes stay visible through the translucent lens.
    const rim = faceInk(skinHex).ink;
    const lx = EYE_LX + jx*EYE_JITTER, rx = EYE_RX + jx*EYE_JITTER;
    const lens = { stroke: rim, sw: 5, fillOpacity: 0.18 };
    return rrect(lx - 22, EYE_Y - 17, 44, 34, 7, '#ffffff', lens) + rrect(rx - 22, EYE_Y - 17, 44, 34, 7, '#ffffff', lens) +
      line(`M${lx+22} ${EYE_Y-6} L${rx-22} ${EYE_Y-6}`, rim, 5);
  } else if (style === 'earring') {
    return circle(HEAD.cx - HEAD.rx + 1, 180, 5, '#f5d020') + circle(HEAD.cx + HEAD.rx - 1, 180, 5, '#f5d020');
  } else if (/horns$/.test(style)) {
    // horns: intact, broken (right horn snapped off) or cracked, in blood red or black
    const black = style.includes('black');
    const hornC = black ? '#1d1b22' : '#8e0c14';
    const ridge = black ? '#ffffff' : '#000000', ridgeOp = black ? 0.22 : 0.4;
    const crackC = black ? '#8a8694' : '#000000';
    // crescent horns: sweep out from the head, then hook up and slightly inward at the tip
    const hornL = 'M150 88 C130 80 104 66 112 32 C122 50 146 62 166 76 Z';
    const hornR = 'M250 88 C270 80 296 66 288 32 C278 50 254 62 234 76 Z';
    // stump of the right horn, broken off with a jagged end
    const stumpR = 'M250 88 C266 82 281 74 283 63 L276 60 L281 54 L271 55 L268 49 L263 57 C257 64 246 70 234 76 Z';
    const opt = { shadow: 0.45, hl: black ? 0.28 : 0.35 };
    const broken = style.startsWith('broken'), cracked = style.startsWith('cracked');
    let s = shaded(hornL, hornC, bboxOfD(hornL), opt) + line('M133 79 Q141 71 151 67 M118 64 Q125 57 133 54', ridge, 2, ridgeOp);
    if (broken) {
      s += shaded(stumpR, hornC, bboxOfD(stumpR), opt) + line('M267 79 Q259 71 249 67', ridge, 2, ridgeOp) +
        // splintered break face + a couple of chips falling away
        line('M276 60 L270 63 M268 49 L265 57', crackC, 1.8, 0.9) +
        path('M293 48 L300 44 L301 51 Z', hornC) + path('M288 36 L293 33 L294 39 Z', hornC);
    } else {
      s += shaded(hornR, hornC, bboxOfD(hornR), opt) + line('M267 79 Q259 71 249 67 M282 64 Q275 57 267 54', ridge, 2, ridgeOp);
    }
    if (cracked) {
      // jagged cracks running up both horns
      s += line('M156 80 L146 74 L147 67 L136 62 L131 53 L121 47 L116 40', crackC, 2.8) + line('M146 74 L139 77 M136 62 L128 64', crackC, 2) +
        line('M244 80 L254 74 L253 67 L264 62 L269 53 L279 47 L284 40', crackC, 2.8) + line('M254 74 L261 77 M264 62 L272 64', crackC, 2);
    }
    return s;
  } else if (style === 'chain') {
    const gold = '#f5c518';
    return line('M168 224 Q200 272 232 224', outlineOf(gold), 9) + line('M168 224 Q200 272 232 224', gold, 5) +
      circle(200, 252, 10, gold) + circle(200, 252, 4, shadePixel(gold, -30), { stroke: false });
  }
  return '';
}

// ---------- background scenery ----------
// Red-brick city blocks in the side margins: brownstones, walk-up tenements
// with fire escapes and rooftop water towers, and a corner store. Right-side
// buildings are mirror images of the left (x -> VB - x - w).
// Two palettes: a derelict night block (scary) and the original sunny
// red-brick block (cute). setScene() swaps them per piece.
const SCENES = {
  scary: { BRICK: '#5a2a24', BRICK_DARK: '#3e1c18', TRIM: '#8a7c6c', IRON: '#141414', WIN_LIT: '#d8ff5a', WIN_DARK: '#10141c', STONE: '#4e2620', AWN: ['#8a0a14', '#1a1a1a'] },
  cute:  { BRICK: '#9c4a36', BRICK_DARK: '#7a3626', TRIM: '#e8d8c0', IRON: '#2a2a2a', WIN_LIT: '#f5e0a0', WIN_DARK: '#2d3748', STONE: '#8a4a38', AWN: ['#e83c3c', '#f5f5f5'] }
};
let BRICK, BRICK_DARK, TRIM, IRON, WIN_LIT, WIN_DARK, STONE, AWN;
function setScene(cute) { ({ BRICK, BRICK_DARK, TRIM, IRON, WIN_LIT, WIN_DARK, STONE, AWN } = SCENES[cute ? 'cute' : 'scary']); }
setScene(false);

function mx(side, x, w) { return side === 'L' ? x : VB - x - w; }
function brickBody(side, x, top, w, color) {
  const X = mx(side, x, w);
  let s = rrect(X, top, w, GROUND_Y - top + 6, 2, color);
  // mortar courses — faint horizontal lines for brick texture
  for (let y = top + 10; y < GROUND_Y; y += 10) s += line(`M${X+3} ${y} L${X+w-3} ${y}`, shadePixel(color, -22), 1.5, 0.45);
  // shadow side (light comes from the upper-left) + a lit left edge
  s += rrect(X + w * 0.68, top, w * 0.32, GROUND_Y - top + 6, 2, '#000000', { stroke: false, opacity: 0.16 });
  s += rrect(X + 2, top, 3, GROUND_Y - top + 6, 1, '#ffffff', { stroke: false, opacity: 0.14 });
  s += rrect(X - 3, top - 6, w + 6, 8, 1, TRIM); // cornice
  return s;
}
function windowAt(side, x, y, w, h, lit) {
  const X = mx(side, x, w);
  return rrect(X, y, w, h, 1.5, lit ? WIN_LIT : WIN_DARK, { stroke: TRIM, sw: 2.5 }) +
    rrect(X - 2, y + h, w + 4, 3, 1, TRIM, { stroke: false }); // sill
}
function windowGrid(side, x, top, w, bottom, key) {
  let s = '', row = 0;
  for (let y = top + 16; y + 18 < bottom; y += 30, row++) {
    let col = 0;
    for (let wx = x + 8; wx + 14 <= x + w - 6; wx += 22, col++) {
      s += windowAt(side, wx, y, 14, 18, _cute ? (row * 3 + col * 5 + key) % 4 !== 0 : (row * 3 + col * 5 + key) % 5 === 0);
    }
  }
  return s;
}
function brownstone(side, x, top, w) {
  let s = brickBody(side, x, top, w, STONE);
  s += windowGrid(side, x, top, w, GROUND_Y - 44, 1);
  // stoop door + steps
  const dx = x + Math.round(w / 2) - 9;
  s += path(`M${mx(side, dx, 18)} ${GROUND_Y-8} L${mx(side, dx, 18)} ${GROUND_Y-34} Q${mx(side, dx, 18)+9} ${GROUND_Y-44} ${mx(side, dx, 18)+18} ${GROUND_Y-34} L${mx(side, dx, 18)+18} ${GROUND_Y-8} Z`, '#4a2a1a', { stroke: TRIM, sw: 2.5 });
  s += rrect(mx(side, dx - 5, 28), GROUND_Y - 8, 28, 5, 1, '#b8a890');
  s += rrect(mx(side, dx - 9, 36), GROUND_Y - 3, 36, 5, 1, '#b8a890');
  return s;
}
function fireEscape(side, x, top, w) {
  let s = '';
  const fx = x + 4, fw = w - 8;
  for (let y = top + 40; y < GROUND_Y - 30; y += 30) {
    const X = mx(side, fx, fw);
    s += line(`M${X} ${y} L${X+fw} ${y}`, IRON, 3);
    s += line(`M${X} ${y-10} L${X+fw} ${y-10}`, IRON, 1.5);
    for (let rx = X; rx <= X + fw; rx += 8) s += line(`M${rx} ${y} L${rx} ${y-10}`, IRON, 1.2);
    const a = mx(side, fx + 6, 0), b = mx(side, fx + fw - 6, 0);
    s += line(`M${a} ${y} L${b} ${y+30}`, IRON, 2); // ladder down to the next landing
  }
  return s;
}
function waterTower(side, x, top) {
  const X = mx(side, x, 26);
  return line(`M${X+4} ${top} L${X+6} ${top-14} M${X+22} ${top} L${X+20} ${top-14} M${X+4} ${top-6} L${X+22} ${top-6}`, IRON, 2) +
    rrect(X + 2, top - 36, 22, 24, 2, '#8a6a4a') +
    line(`M${X+2} ${top-28} L${X+24} ${top-28} M${X+2} ${top-20} L${X+24} ${top-20}`, '#5a4030', 1.5) +
    path(`M${X} ${top-36} L${X+13} ${top-48} L${X+26} ${top-36} Z`, '#5a4030');
}
function tenement(side, x, top, w) {
  let s = brickBody(side, x, top, w, BRICK);
  s += windowGrid(side, x, top, w, GROUND_Y - 8, 2);
  s += fireEscape(side, x, top, w);
  s += waterTower(side, x + Math.round(w / 2) - 13, top - 6);
  return s;
}
function cornerStore(side, x, top, w) {
  let s = brickBody(side, x, top, w, BRICK_DARK);
  const X = mx(side, x, w);
  // sign, awning, shop window
  s += rrect(X + 4, top + 8, w - 8, 14, 2, '#1a1a1a', { stroke: TRIM, sw: 2 });
  s += line(`M${X+10} ${top+15} L${X+w-10} ${top+15}`, '#3ce85a', 3, 0.9);
  const ay = top + 30, stripes = Math.max(2, Math.floor((w - 4) / 8));
  const sw = (w + 4) / stripes;
  for (let i = 0; i < stripes; i++) {
    s += path(`M${X-2+i*sw} ${ay} L${X-2+(i+1)*sw} ${ay} L${X-2+(i+1)*sw} ${ay+12} Q${X-2+(i+0.5)*sw} ${ay+17} ${X-2+i*sw} ${ay+12} Z`, i % 2 ? AWN[1] : AWN[0], { stroke: false });
  }
  s += rrect(X + 6, ay + 20, w - 12, GROUND_Y - ay - 26, 2, _cute ? WIN_LIT : WIN_DARK, { stroke: TRIM, sw: 2.5 });
  return s;
}
// Buildings sit on a far street line (FAR_Y) higher up the frame than the
// character's sidewalk, scaled down toward the outer edges and hazed into the
// background, so they read as a block across the street behind him — with a
// clear gap between them and his arms.
const FAR_Y = 296, FAR_SCALE = 0.78;
function farSide(side, markup) {
  const ax = side === 'L' ? CROP.x : CROP.x + CROP.size; // anchor on the frame edge
  return `<g transform="translate(${ax} ${FAR_Y}) scale(${FAR_SCALE}) translate(${-ax} ${-GROUND_Y})">${markup}</g>`;
}
function drawBackdrop(backdropId, bgHex) {
  const side = (sd) => {
    if (backdropId === 'buildingsSmall') return brownstone(sd, 42, 232, 60);
    if (backdropId === 'buildingsTall') return tenement(sd, 44, 118, 56);
    if (backdropId === 'buildingsSkyline') return tenement(sd, 40, 128, 34) + cornerStore(sd, 72, 236, 40);
    return '';
  };
  if (backdropId === 'birds') {
    const bird = (x, y) => line(`M${x-12} ${y} Q${x-6} ${y-8} ${x} ${y} Q${x+6} ${y-8} ${x+12} ${y}`, '#2a2a2a', 3.5);
    return `<g opacity="0.8">${bird(66, 62) + bird(100, 42) + bird(302, 44) + bird(336, 66)}</g>`;
  }
  if (backdropId === 'bats') {
    const bat = (x, y, k) => path(`M${x} ${y+3} Q${x-3} ${y-3} ${x-4} ${y-1} Q${x-10} ${y-9*k} ${x-20*k} ${y-4} Q${x-15*k} ${y} ${x-16*k} ${y+5} Q${x-11*k} ${y+2} ${x-8*k} ${y+6} Q${x-5} ${y+3} ${x} ${y+7} Q${x+5} ${y+3} ${x+8*k} ${y+6} Q${x+11*k} ${y+2} ${x+16*k} ${y+5} Q${x+15*k} ${y} ${x+20*k} ${y-4} Q${x+10} ${y-9*k} ${x+4} ${y-1} Q${x+3} ${y-3} ${x} ${y+3} Z`, '#0a0a0e', { stroke: false });
    return `<g opacity="0.9">${bat(70, 60, 1) + bat(104, 36, 0.7) + bat(300, 40, 0.8) + bat(338, 70, 1.1) + bat(90, 96, 0.55)}</g>`;
  }
  if (backdropId === 'graves') {
    const stone = (x, h, w, tilt) => {
      const d = `M${x} ${GROUND_Y} L${x} ${GROUND_Y-h+w/2} Q${x} ${GROUND_Y-h} ${x+w/2} ${GROUND_Y-h} Q${x+w} ${GROUND_Y-h} ${x+w} ${GROUND_Y-h+w/2} L${x+w} ${GROUND_Y} Z`;
      return `<g transform="rotate(${tilt} ${x+w/2} ${GROUND_Y})">` + shaded(d, '#6a6a72', [x, GROUND_Y-h, x+w, GROUND_Y], { shadow: 0.5, hl: 0.15 }) +
        line(`M${x+w/2} ${GROUND_Y-h+10} L${x+w/2} ${GROUND_Y-h+30} M${x+w/2-7} ${GROUND_Y-h+17} L${x+w/2+7} ${GROUND_Y-h+17}`, '#3a3a40', 3) +
        line(`M${x+6} ${GROUND_Y-h*0.35} L${x+w-6} ${GROUND_Y-h*0.35}`, '#3a3a40', 2, 0.6) + '</g>';
    };
    const L = stone(40, 70, 34, -6) + stone(82, 46, 26, 5);
    const R = stone(VB - 74, 76, 34, 7) + stone(VB - 110, 44, 26, -4);
    return `<g opacity="0.85">${farSide('L', L)}${farSide('R', R)}</g>`;
  }
  const L = side('L'), R = side('R');
  if (!L) return '';
  // far street the buildings stand on, then the hazed buildings themselves
  const street = rrect(CROP.x - 10, FAR_Y - 2, CROP.size + 20, GROUND_Y - FAR_Y + 20, 0, shadePixel(bgHex, -16), { stroke: false }) +
    line(`M${CROP.x - 10} ${FAR_Y - 2} L${CROP.x + CROP.size + 10} ${FAR_Y - 2}`, shadePixel(bgHex, -32), 2, 0.6);
  return street + `<g opacity="0.72">${farSide('L', L)}${farSide('R', R)}</g>`;
}

// A sidewalk in a darker shade of the background: curb highlight, paving
// joints and a couple of cracks, plus a soft contact shadow under the feet.
function drawGround(bgHex, rng) {
  const base = shadePixel(bgHex, -30), ink = shadePixel(bgHex, -50);
  let s = path(`M-10 ${GROUND_Y} Q200 ${GROUND_Y-16} 410 ${GROUND_Y} L410 410 L-10 410 Z`, base, { stroke: shadePixel(bgHex, -45) });
  s += line(`M-10 ${GROUND_Y+4} Q200 ${GROUND_Y-12} 410 ${GROUND_Y+4}`, shadePixel(bgHex, -12), 2.5, 0.7);
  for (let x = 40; x <= 360; x += 52) s += line(`M${x} ${GROUND_Y + 2} L${x + (x - 200) * 0.35} 410`, ink, 2, 0.35);
  for (let i = 0; i < 2; i++) {
    const cx = 60 + rng() * 280, cy = GROUND_Y + 8 + rng() * 6;
    s += line(`M${fmt(cx)} ${fmt(cy)} l6 3 l-2 5 l7 2`, ink, 1.5, 0.4);
  }
  return s + ellipse(CX, GROUND_Y + 10, 70, 10, ink, { stroke: false, opacity: 0.4 });
}

// Atmosphere: the flat background becomes a lit backdrop — a radial light
// pool behind the character, paper grain specks and a soft vignette, the same
// way the ink generators treat their backgrounds.
function drawAtmosphere(bgHex, rng) {
  const id = `${_sid}bg`;
  let s = `<defs><radialGradient id="${id}" cx="50%" cy="42%" r="62%">` +
    `<stop offset="0" stop-color="${shadePixel(bgHex, 30)}"/><stop offset="0.55" stop-color="${bgHex}"/><stop offset="1" stop-color="${shadePixel(bgHex, -22)}"/>` +
    `</radialGradient></defs><rect width="${VB}" height="${VB}" fill="url(#${id})"/>`;
  const speck = shadePixel(bgHex, -40), light = shadePixel(bgHex, 45);
  for (let i = 0; i < 0; i++) { // paper-grain specks removed: they read as noise/haze
    const x = CROP.x + rng() * CROP.size, y = CROP.y + rng() * (GROUND_Y - CROP.y), r = 0.6 + rng() * 1.6;
    s += circle(fmt(x), fmt(y), fmt(r), rng() < 0.6 ? speck : light, { stroke: false, opacity: fmt(0.15 + rng() * 0.25) });
  }
  return s;
}
// Pale moon (with a faint halo) in one top corner of the headroom, on most pieces.
function drawMoon(bgHex, index, seed) {
  if (_cute) return '';
  const r = mulberry32((seed ?? 0) * 7919 + index * 37 + 5);
  if (r() < 0.3) return '';
  const left = r() < 0.5, x = left ? 76 : 324, y = 50 + r() * 10;
  const blood = bgHex.toLowerCase() === '#8f0014';
  const c = blood ? '#ff4a3a' : '#f0ead0';
  let s = circle(x, y, 38, c, { stroke: false, opacity: 0.07 }) + circle(x, y, 28, c, { stroke: false, opacity: 0.12 }) +
    circle(x, y, 20, c, { stroke: false });
  s += circle(x - 6, y - 4, 4.5, shadePixel(c, -18), { stroke: false }) + circle(x + 7, y + 6, 3, shadePixel(c, -18), { stroke: false }) + circle(x + 4, y - 9, 2, shadePixel(c, -18), { stroke: false });
  return s;
}
// Low fog banks rolling over the street and around the legs.
function drawFog(rng) {
  if (_cute) return '';
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = 40 + rng() * 320, y = GROUND_Y - 14 + rng() * 22;
    s += ellipse(fmt(x), fmt(y), fmt(90 + rng() * 70), fmt(9 + rng() * 7), '#d8dde2', { stroke: false, opacity: fmt(0.06 + rng() * 0.06) });
  }
  return s;
}
function drawVignette() {
  const id = `${_sid}vg`;
  return `<defs><radialGradient id="${id}" cx="50%" cy="45%" r="70%"><stop offset="${_cute ? 0.6 : 0.45}" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="${_cute ? 0.22 : 0.42}"/></radialGradient></defs>` +
    `<rect x="${CROP.x}" y="${CROP.y}" width="${CROP.size}" height="${CROP.size}" fill="url(#${id})"/>`;
}

// ---------- shared renderer ----------
function renderFromTraits(picks, index, seed, opts) {
  const animate = !!(opts && opts.animate);
  _lite = !!(opts && opts.lite);
  const { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor, facialHair, mouth, scars, vibe } = picks;
  _cute = !!(vibe && vibe.id === 'cute');
  setScene(_cute);
  const bgHex = (bgColor && bgColor.hex) || BG_COLOR;
  // separate, deterministic RNG stream for cosmetic jitter (eye offset, mouth
  // shape) so it stays stable per index/seed without being coupled to
  // however many trait rolls happen above
  const jitterRng = mulberry32((seed ?? 0) * 130003 + index * 17 + 11);
  const gradId = `rb-${seed ?? 0}-${index}`;
  _sid = `h${String(seed ?? 0).replace(/\W/g, '')}_${index}_`; _clipN = 0;
  // own RNG stream for grain/cracks so it never shifts the face jitter above
  const fxRng = mulberry32((seed ?? 0) * 91193 + index * 131 + 7);
  const capped = accessory.id === 'cap';

  let defs = '';
  if (hairColor.isRainbow) {
    const RAINBOW = ['#ff5a5a','#ffa63c','#f5d020','#3ce85a','#3ca8f5','#8a5af5'];
    defs = `<defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">` +
      RAINBOW.map((c, i) => `<stop offset="${fmt(i / (RAINBOW.length - 1))}" stop-color="${c}"/>`).join('') +
      `</linearGradient></defs>`;
  }

  let body = '';
  body += drawMoon(bgHex, index, seed);
  if (backdrop) body += drawBackdrop(backdrop.id, bgHex);
  body += drawGround(bgHex, fxRng);
  // low fog rolls across the street behind the figure (drawn over him it hazed the legs)
  body += drawFog(fxRng);
  // a cap sits over an afro's crown, so skip the big afro back layer then
  if (!(capped && hairStyle.id === 'afro')) body += drawHairBack(hairStyle.id, hairColor, gradId);
  body += drawBodyAndOutfit(skinTone.hex, outfitType.id, outfitColor.hex);
  body += drawHead(skinTone.hex);
  // small seeded jitter so eyes aren't pinned to the exact same spot on
  // every piece; shared with brows and glasses so they stay aligned.
  // eyes sit symmetrically on the face centre line, lined up with the nose and mouth
  // (the old sideways jitter pushed them off-centre); rng draws kept for seed stability
  if (jitterRng() < 0.3) jitterRng();
  const jx = 0;
  body += drawFacialHair(facialHair && facialHair.id, hairColor, skinTone.hex);
  body += drawSunken(jx, skinTone.hex);
  body += drawEyes(eyeStyle.id, jx, skinTone.hex);
  body += drawMouth((mouth && mouth.id) || (_cute ? 'smile' : 'stitched'), skinTone.hex, jitterRng, !!facialHair && ['mustache', 'goatee', 'beard'].includes(facialHair.id) && facialHair.id);
  body += drawHairFront(hairStyle.id, hairColor, gradId, capped);
  body += drawBrows(eyeStyle.id, jx, skinTone.hex);
  body += drawScars(scars && scars.id, skinTone.hex, jx);
  body += drawAccessory(accessory.id, jx, skinTone.hex);

  let blinkAnim = '';
  if (animate) {
    const animRng = mulberry32((seed ?? 0) * 70001 + index * 9973 + 3);
    const dur = (3.5 + animRng()*2.5).toFixed(2);
    const phase = (animRng()*3).toFixed(2);
    // Blink: skin-colored lids with a closed-eye line fade in over the eyes
    // briefly, then back out.
    const { ink } = faceInk(skinTone.hex);
    const lids = [EYE_LX + jx*EYE_JITTER, EYE_RX + jx*EYE_JITTER].map(x =>
      ellipse(x, EYE_Y, 17, 16, skinTone.hex, { stroke: false }) +
      line(`M${x-10} ${EYE_Y+2} L${x+10} ${EYE_Y+2}`, ink, 4)).join('');
    blinkAnim = `<g opacity="0"><animate attributeName="opacity" values="0;0;1;0;0" keyTimes="0;0.46;0.5;0.54;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>${lids}</g>`;
  }

  // cold moonlight (scary) or warm golden sun (cute) from the upper-left, over everything but the vignette
  const sunId = `${_sid}sun`;
  const sun = `<defs><radialGradient id="${sunId}" cx="18%" cy="8%" r="95%">` + (_cute
    ? `<stop offset="0" stop-color="#ffb347" stop-opacity="0.12"/><stop offset="1" stop-color="#ff7a1a" stop-opacity="0"/>`
    : `<stop offset="0" stop-color="#9fe0ff" stop-opacity="0.07"/><stop offset="1" stop-color="#4a7aff" stop-opacity="0"/>`) + `</radialGradient></defs>` +
    `<rect x="${CROP.x}" y="${CROP.y}" width="${CROP.size}" height="${CROP.size}" fill="url(#${sunId})"/>`;
  // 1.2x crop into the 400x400 stage so the figure fills the frame
  const svg = `<svg width="${SIZE}" height="${SIZE}" viewBox="${CROP.x} ${CROP.y} ${CROP.size} ${CROP.size}" xmlns="http://www.w3.org/2000/svg">
${defs}${drawAtmosphere(bgHex, fxRng)}
${body}
${blinkAnim}
${sun}
${drawVignette()}
</svg>`;
  return svg.replace(/#[0-9a-fA-F]{6}\b/g, (h) => (UNGRADED.has(h.toLowerCase()) || isNeutral(h)) ? h : warmGrade(h));
}

// ---------- color grade ----------
// Every color in the finished piece goes through one warm, saturated grade so
// the whole collection shares a single look: channels nudged toward red/amber
// and away from blue, then saturation boosted. Greys pick up a warm tint too.
// Colours supplied as exact swatches keep their true value (the grade would
// push #d0fa05 to #d9ff00); tones derived from them are still graded.
const UNGRADED = new Set(['#d0fa05']);
// Exact neutral greys (r = g = b) also skip the grade, so the white and gray
// skin tones — and their shading — stay truly white/gray instead of cream/beige.
function isNeutral(h) { const v = h.slice(1).toLowerCase(); return v.slice(0, 2) === v.slice(2, 4) && v.slice(2, 4) === v.slice(4, 6); }
const _gradeCache = new Map();
function warmGrade(hex) {
  const key = hex.toLowerCase();
  if (_gradeCache.has(key)) return _gradeCache.get(key);
  const num = parseInt(key.slice(1), 16);
  let r = ((num >> 16) & 255) / 255, g = ((num >> 8) & 255) / 255, b = (num & 255) / 255;
  // saturation boost (HSL) first, so cool colors stay vivid rather than going grey
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let l = (max + min) / 2, h = 0, sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  sat = Math.min(1, sat * 1.28 + (sat > 0.04 ? 0.04 : 0));
  // warm tint: a small shift toward amber that fades out on dark colors, so
  // black hair and onyx skin stay black
  const warm = Math.min(1, Math.max(0, (l - 0.12) * 1.6));
  const q = l < 0.5 ? l * (1 + sat) : l + sat - l * sat, p = 2 * l - q;
  const hue = (t) => { t = (t + 1) % 1; return t < 1/6 ? p + (q - p) * 6 * t : t < 1/2 ? q : t < 2/3 ? p + (q - p) * (2/3 - t) * 6 : p; };
  const out = sat === 0 ? [l, l, l] : [hue(h + 1/3), hue(h), hue(h - 1/3)];
  out[0] += 0.035 * warm; out[1] += 0.012 * warm; out[2] -= 0.05 * warm;
  const res = '#' + out.map(v => Math.round(Math.max(0, Math.min(1, v)) * 255).toString(16).padStart(2, '0')).join('');
  _gradeCache.set(key, res);
  return res;
}


// ---------- main composer ----------
// A goatee or full beard never shares the face with a mouth: the chin hair covers it, so the
// mouth trait becomes 'covered' (nothing drawn). If the mouth is the thing that must stay (a
// locked mouth), the beard is trimmed to just a mustache instead. A gaping mouth goes
// clean-shaven. Pure remaps, no rng draws, so every other trait stays seed-stable.
const MOUTH_COVERED = { id: 'covered', weight: 0, rarity: 'common' };
function fixFaceCombo(facialHair, mouth, keepMouth) {
  const FH = (id) => TRAITS.facialHair.find((f) => f.id === id);
  if (!facialHair || !mouth) return { facialHair, mouth };
  if (mouth.id === 'gape' && ['mustache', 'goatee', 'beard'].includes(facialHair.id)) return { facialHair: FH('none'), mouth };
  if (facialHair.id === 'goatee' || facialHair.id === 'beard') {
    return keepMouth ? { facialHair: FH('mustache'), mouth } : { facialHair, mouth: MOUTH_COVERED };
  }
  return { facialHair, mouth };
}

function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  const vibe = weightedPick(vibeRng(seed, index), TRAITS.vibe), V = vibe.id;
  const P = (k) => vibePool(TRAITS[k], V);

  const skinTone   = isOneOfOne ? pickOneOfOneSkinTone(rng, V) : pickByRarity(rng, P('skinTone'), t);
  const hairColor  = isOneOfOne ? pickOneOfOneHairColor(rng) : pickByRarity(rng, P('hairColor'), t);
  const hairStyle  = pickByRarity(rng, P('hairStyle'), t);
  const outfitType = isOneOfOne ? pickOneOfOneOutfitType(rng) : pickByRarity(rng, P('outfitType'), t);
  const outfitColor= pickByRarity(rng, P('outfitColor'), t);
  const eyeStyle   = pickByRarity(rng, P('eyeStyle'), t);
  const accessory  = pickByRarity(rng, P('accessory'), t);
  const backdrop   = isOneOfOne ? pickOneOfOneBackdrop(rng, V) : pickByRarity(rng, P('backdrop'), t);
  const bgColor    = isOneOfOne ? pickOneOfOneBgColor(rng, V) : pickByRarity(rng, P('background'), t);
  let facialHair   = pickByRarity(rng, P('facialHair'), t); // rolled after the originals so earlier traits stay seed-stable
  let mouth        = pickByRarity(rng, P('mouth'), t);
  ({ facialHair, mouth } = fixFaceCombo(facialHair, mouth));
  const scars      = pickByRarity(rng, P('scars'), t);

  const picks = { skinTone, hairColor, hairStyle, outfitType, outfitColor, eyeStyle, accessory, backdrop, bgColor, facialHair, mouth, scars, vibe };
  const svg = renderFromTraits(picks, index, seed, { animate: !!(opts && opts.animate) });

  return {
    index, svg, tier: t,
    traits: {
      skinTone: skinTone.id, hairColor: hairColor.id, hairStyle: hairStyle.id,
      outfitType: outfitType.id, outfitColor: outfitColor.id, eyeStyle: eyeStyle.id, accessory: accessory.id,
      backdrop: backdrop.id, background: bgColor.id, facialHair: facialHair.id, mouth: mouth.id, scars: scars.id, vibe: vibe.id
    },
    rarity: {
      skinTone: skinTone.rarity, hairColor: hairColor.rarity, hairStyle: hairStyle.rarity,
      outfitType: outfitType.rarity, outfitColor: outfitColor.rarity, eyeStyle: eyeStyle.rarity, accessory: accessory.rarity,
      backdrop: backdrop.rarity, background: bgColor.rarity, facialHair: facialHair.rarity, mouth: mouth.rarity, scars: scars.rarity, vibe: vibe.rarity
    }
  };
}

function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

const CHAIN_THEMES = { bitcoin: '#f7931a', ethereum: '#627eea', robinhood: '#00c805' };

const api = {
  generatePiece, generateBatch, TRAITS, TIER_FALLBACK,
  mulberry32, weightedPick, pickByRarity, shadeColor, vibePool, vibeRng,
  renderFromTraits, fixFaceCombo, BG_COLOR, CHAIN_THEMES,
  RAINBOW_HAIR, ONE_OF_ONE_HAIR_WEIGHTS, pickOneOfOneHairColor,
  ONE_OF_ONE_SKIN_TONE_WEIGHTS, pickOneOfOneSkinTone,
  ONE_OF_ONE_OUTFIT_WEIGHTS, pickOneOfOneOutfitType,
  ONE_OF_ONE_BACKDROP_WEIGHTS, pickOneOfOneBackdrop,
  ONE_OF_ONE_BG_WEIGHTS, pickOneOfOneBgColor
};
const hasRealDOM = typeof document !== 'undefined' && typeof document.createElement === 'function';
if (hasRealDOM && typeof window !== 'undefined') {
  window.ChibiGen = api;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
}
