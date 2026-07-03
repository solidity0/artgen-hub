// ============================================================
// Generative Trait Engine v7  —  SINGLE SOURCE OF TRUTH
// Brand-agnostic: name your own collection in the website UI, or set
// the "name" field yourself when using this library directly.
//
// v3: eyes and mouths vary per-piece instead of being hardcoded.
// v4: head shape (round / boxed / open / split / cracked) and head color.
// v5: every trait has a rarity tag; pass a tier to bias generation.
// v6: backgrounds — rain, lightning, houses, cemetery, snow, beach.
// v7: SYNC RELEASE. This file is now the only place the engine lives.
//     The website (index.html) is built by inlining this file into
//     index.src.html at the ENGINE marker comments via build.js.
//     Merges the formerly HTML-only additions:
//       - backgrounds: abandoned_city, cave, desert, forest
//       - bodyColor:  ivory, moss, indigo, blood_red, mustard
//       - headColor:  ash, oxide, plum, deep_teal, crimson
//       - eyeColor:   violet, rose, gold, cyan, blood
//       - mouth:      none
// v8: TRAIT EXPANSION. Adds new options to every existing category — no
//     categories removed or renamed, no existing option's id/weight/rarity
//     changed.
//       - backgrounds: fog, swamp, static, eclipse
//       - body:        hoodie, tattered
//       - bodyColor:   teal, copper
//       - headShape:   dented, antenna
//       - headColor:   umber, amethyst
//       - eyeShape:    cyclops (single centered eye — its own positioning
//                      and idle/blink animation, see eyesMarkup)
//       - eyeColor:    silver, ember
//       - mouth:       fangs, zipper
//       - accessory:   scanlines, tears
//
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: load this file with a script tag -> window.ArtGen
// ============================================================

// ---------- seeded RNG (deterministic per index/seed) ----------
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
  for (const p of pool) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return pool[pool.length - 1];
}

// ---------- trait pools ----------
const TRAITS = {
  background: [
    { id: 'red',             weight: 18, fill: '#7a1f1f', pattern: 'none',           rarity: 'common' },
    { id: 'grey_dots',       weight: 18, fill: '#8a8a8a', pattern: 'dots',           rarity: 'common' },
    { id: 'teal_cloud',      weight: 16, fill: '#3a9b8f', pattern: 'cloud',          rarity: 'uncommon' },
    { id: 'blue_cloud',      weight: 16, fill: '#5ba3d0', pattern: 'cloud',          rarity: 'uncommon' },
    { id: 'cream',           weight: 16, fill: '#e8e3d3', pattern: 'none',           rarity: 'common' },
    { id: 'starfield',       weight: 16, fill: '#0a0a0a', pattern: 'stars',          rarity: 'rare' },
    { id: 'rain',            weight: 14, fill: '#41506b', pattern: 'rain',           rarity: 'uncommon' },
    { id: 'lightning',       weight: 10, fill: '#241f33', pattern: 'lightning',      rarity: 'rare' },
    { id: 'houses_dusk',     weight: 8,  fill: '#cf7a4a', pattern: 'houses',         rarity: 'uncommon' },
    { id: 'houses_twilight', weight: 8,  fill: '#5b4570', pattern: 'houses',         rarity: 'uncommon' },
    { id: 'houses_night',    weight: 8,  fill: '#1f2740', pattern: 'houses',         rarity: 'uncommon' },
    { id: 'cemetery',        weight: 10, fill: '#56605c', pattern: 'cemetery',       rarity: 'rare' },
    { id: 'cemetery_black',  weight: 10, fill: '#0a0a0a', pattern: 'cemetery',       rarity: 'rare' },
    { id: 'snow',            weight: 14, fill: '#aab9c4', pattern: 'snow',           rarity: 'uncommon' },
    { id: 'beach',           weight: 14, fill: '#bfe3ec', pattern: 'beach',          rarity: 'uncommon' },
    { id: 'abandoned_city',  weight: 10, fill: '#6b6f5e', pattern: 'abandoned_city', rarity: 'rare' },
    { id: 'cave',            weight: 10, fill: '#1c140f', pattern: 'cave',           rarity: 'rare' },
    { id: 'desert',          weight: 14, fill: '#e8b870', pattern: 'desert',         rarity: 'uncommon' },
    { id: 'forest',          weight: 14, fill: '#2e4034', pattern: 'forest',         rarity: 'uncommon' },
    { id: 'fog',             weight: 14, fill: '#8a9094', pattern: 'fog',            rarity: 'uncommon' },
    { id: 'swamp',           weight: 12, fill: '#33402a', pattern: 'swamp',          rarity: 'uncommon' },
    { id: 'static',          weight: 10, fill: '#4a4a4a', pattern: 'static',         rarity: 'rare' },
    { id: 'eclipse',         weight: 8,  fill: '#0c0c14', pattern: 'eclipse',        rarity: 'rare' }
  ],
  body: [
    { id: 'suit',       weight: 25, rarity: 'common' },
    { id: 'turtleneck', weight: 25, rarity: 'common' },
    { id: 'tank_top',   weight: 25, rarity: 'common' },
    { id: 'robe',       weight: 25, rarity: 'uncommon' },
    { id: 'hoodie',     weight: 20, rarity: 'uncommon' },
    { id: 'tattered',   weight: 14, rarity: 'rare' },
    { id: 'armored',    weight: 16, rarity: 'rare' }
  ],
  bodyColor: [
    { id: 'bone',      hex: '#ece0d8', weight: 26, rarity: 'common' },
    { id: 'charcoal',  hex: '#2b2b2e', weight: 20, rarity: 'common' },
    { id: 'rust',      hex: '#a85a35', weight: 18, rarity: 'uncommon' },
    { id: 'slate',     hex: '#5c6b7a', weight: 18, rarity: 'uncommon' },
    { id: 'wine',      hex: '#5a2a3f', weight: 18, rarity: 'rare' },
    { id: 'ivory',     hex: '#f5f1e6', weight: 16, rarity: 'common' },
    { id: 'moss',      hex: '#54643f', weight: 14, rarity: 'uncommon' },
    { id: 'indigo',    hex: '#303d8a', weight: 14, rarity: 'uncommon' },
    { id: 'blood_red', hex: '#8a1f1f', weight: 12, rarity: 'rare' },
    { id: 'mustard',   hex: '#b8893a', weight: 10, rarity: 'rare' },
    { id: 'teal',      hex: '#2f6b66', weight: 12, rarity: 'uncommon' },
    { id: 'copper',    hex: '#a8632f', weight: 10, rarity: 'rare' }
  ],
  size: [
    { id: 'small',  weight: 34, eyeR: 24, glowR: [31, 38], rarity: 'common' },
    { id: 'medium', weight: 33, eyeR: 32, glowR: [39, 46], rarity: 'common' },
    { id: 'large',  weight: 33, eyeR: 40, glowR: [47, 54], rarity: 'uncommon' }
  ],
  headShape: [
    { id: 'round',   weight: 32, rarity: 'common' },
    { id: 'boxed',   weight: 18, rarity: 'common' },
    { id: 'monitor', weight: 18, rarity: 'uncommon' },
    { id: 'split',   weight: 16, rarity: 'rare' },
    { id: 'cracked', weight: 16, rarity: 'rare' },
    { id: 'vented',  weight: 18, rarity: 'uncommon' },
    { id: 'antenna', weight: 14, rarity: 'rare' }
  ],
  headColor: [
    { id: 'onyx',      hex: '#0a0a0a', weight: 26, rarity: 'common' },
    { id: 'charcoal',  hex: '#2b2b2e', weight: 20, rarity: 'common' },
    { id: 'maroon',    hex: '#3a1518', weight: 18, rarity: 'uncommon' },
    { id: 'forest',    hex: '#142e1c', weight: 18, rarity: 'uncommon' },
    { id: 'midnight',  hex: '#11182e', weight: 18, rarity: 'rare' },
    { id: 'ash',       hex: '#332e2a', weight: 16, rarity: 'common' },
    { id: 'oxide',     hex: '#3a2418', weight: 14, rarity: 'uncommon' },
    { id: 'plum',      hex: '#2a1830', weight: 14, rarity: 'uncommon' },
    { id: 'deep_teal', hex: '#0f2a28', weight: 12, rarity: 'rare' },
    { id: 'crimson',   hex: '#3a0a12', weight: 10, rarity: 'rare' },
    { id: 'umber',     hex: '#4a2c10', weight: 12, rarity: 'uncommon' },
    { id: 'amethyst',  hex: '#2e1a42', weight: 10, rarity: 'rare' }
  ],
  eyeShape: [
    { id: 'round_glow',    weight: 30, rarity: 'common' },
    { id: 'hollow_socket', weight: 25, rarity: 'common' },
    { id: 'glitch',         weight: 25, rarity: 'uncommon' },
    { id: 'x_dead',        weight: 20, rarity: 'rare' },
    { id: 'cyclops',       weight: 14, rarity: 'rare' }
  ],
  eyeColor: [
    { id: 'green',   hex: '#e0ffe0', weight: 25, rarity: 'common' },
    { id: 'white',   hex: '#ffffff', weight: 25, rarity: 'common' },
    { id: 'iceblue', hex: '#d6f5ff', weight: 20, rarity: 'uncommon' },
    { id: 'peach',   hex: '#ffe8d6', weight: 15, rarity: 'uncommon' },
    { id: 'amber',   hex: '#fff7d6', weight: 15, rarity: 'rare' },
    { id: 'violet',  hex: '#e8d6ff', weight: 14, rarity: 'uncommon' },
    { id: 'rose',    hex: '#ffd6e8', weight: 12, rarity: 'uncommon' },
    { id: 'gold',    hex: '#ffe066', weight: 12, rarity: 'uncommon' },
    { id: 'cyan',    hex: '#7df9e8', weight: 10, rarity: 'rare' },
    { id: 'blood',   hex: '#ff4d4d', weight: 10, rarity: 'rare' },
    { id: 'silver',  hex: '#d8d8d8', weight: 12, rarity: 'uncommon' },
    { id: 'ember',   hex: '#ff7a3d', weight: 10, rarity: 'rare' }
  ],
  mouth: [
    { id: 'waveform', weight: 25, rarity: 'common' },
    { id: 'grin',     weight: 25, rarity: 'common' },
    { id: 'shout',    weight: 25, rarity: 'uncommon' },
    { id: 'stitched', weight: 25, rarity: 'rare' },
    { id: 'none',     weight: 12, rarity: 'rare' },
    { id: 'fangs',    weight: 16, rarity: 'rare' },
    { id: 'zipper',   weight: 12, rarity: 'rare' }
  ],
  accessory: [
    { id: 'none',         weight: 60, rarity: 'common' },
    { id: 'scatter_dots', weight: 40, rarity: 'uncommon' },
    { id: 'scanlines',    weight: 24, rarity: 'uncommon' },
    { id: 'tears',        weight: 16, rarity: 'rare' }
  ]
};

// ---------- character-type (rarity tier) aware pick ----------
const TIER_FALLBACK = {
  common:   ['common', 'uncommon', 'rare'],
  uncommon: ['uncommon', 'rare', 'common'],
  rare:     ['rare', 'uncommon', 'common']
};
function pickByRarity(rng, pool, tier) {
  if (!tier || tier === 'any') return weightedPick(rng, pool);
  const order = TIER_FALLBACK[tier] || ['common', 'uncommon', 'rare'];
  for (const t of order) {
    const subset = pool.filter(p => p.rarity === t);
    if (subset.length) return weightedPick(rng, subset);
  }
  return weightedPick(rng, pool);
}

// Some multi-trait combinations clash visually for reasons that don't fit a
// single category pairing — each entry lists every trait that must match for
// the combo to be disallowed, plus exactly one key naming the trait that
// actually gets re-rolled when the rest line up. Originally just an
// eyeShape+mouth check (cyclops' single centered eye reads oddly under
// 'shout'); generalized to also cover combos involving headShape/eyeColor,
// and now accessory too — same shape of problem (a trait that reads fine on
// its own clashes with a specific other trait), no reason to keep it
// mouth-only.
const DISALLOWED_COMBOS = [
  { eyeShape: 'cyclops', mouth: 'shout' },
  // 'split' head's center gap sits exactly where a centered eye/mouth would
  // go — violet's eye-glow doesn't read well against the gap's exposed
  // background there, and fangs sitting right on the gap looks disconnected.
  { headShape: 'split', eyeColor: 'violet', mouth: 'fangs' },
  // 'monitor'/'vented' are a horizontal-box silhouette 10px shorter than
  // every other headShape (halfH=118 vs the standard ry=128 bottom edge).
  // mouthMarkup now compensates for that shift so 'shout' no longer visually
  // overlaps the head/neck boundary there — but even with correct clearance,
  // 'shout' is the tallest mouth and sits closest to the edge of any mouth
  // trait, reading as visually cramped against these two shapes specifically
  // in a way the other mouths don't. Simpler to just not pair them.
  { headShape: 'monitor', mouth: 'shout' },
  { headShape: 'vented', mouth: 'shout' },
  // 'tears' is sized for the standard two-eye layout at small/medium scale —
  // at 'large' the eyes (and the head itself) are big enough that the tear
  // reads as too small/oddly placed relative to everything else on the face,
  // regardless of eyeShape. Simpler to not pair them than to make tears
  // itself size-aware for one specific trait.
  { accessory: 'tears', size: 'large' },
  // 'split' head's center gap sits right where a two-eye tear's inner edge
  // would normally read against solid head color — against the gap's
  // exposed background instead, it looks disconnected from the face rather
  // than like it's dripping from an eye.
  { accessory: 'tears', headShape: 'split' }
];
function rerollTraitIfClashing(rng, traitsSoFar, targetKey, currentTrait, pool, tier) {
  // A single pass isn't enough: fixing one combo's re-roll can land on a
  // value that matches a DIFFERENT combo (confirmed — a split+violet+fangs
  // re-roll landed on 'shout', which is itself disallowed with cyclops, and
  // returning immediately after the first fix never re-checked it). Loop
  // until no combo matches the current value, or give up after a few tries
  // (the rule list is short, so this converges in 1-2 passes in practice).
  for (let attempt = 0; attempt < 5; attempt++) {
    const matched = DISALLOWED_COMBOS.find(combo =>
      Object.prototype.hasOwnProperty.call(combo, targetKey) &&
      Object.entries(combo).every(([key, val]) => key === targetKey ? currentTrait.id === val : traitsSoFar[key] === val)
    );
    if (!matched) break;
    const alt = pool.filter(t => t.id !== matched[targetKey]);
    if (!alt.length) break;
    currentTrait = pickByRarity(rng, alt, tier);
  }
  return currentTrait;
}

// ---------- color helper ----------
function shade(hex, percent) {
  const num = parseInt(hex.slice(1), 16);
  let r = (num >> 16) & 0xff, g = (num >> 8) & 0xff, b = num & 0xff;
  const t = percent < 0 ? 0 : 255, p = Math.abs(percent) / 100;
  r = Math.round((t - r) * p) + r;
  g = Math.round((t - g) * p) + g;
  b = Math.round((t - b) * p) + b;
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgbArr(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}
function colorDistance(hexA, hexB) {
  const [r1, g1, b1] = hexToRgbArr(hexA);
  const [r2, g2, b2] = hexToRgbArr(hexB);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}
function luma(hex) {
  const [r, g, b] = hexToRgbArr(hex);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}
// Some bodyColor/headColor + background fill pairs are close enough in RGB
// space to nearly disappear into each other (two are literally identical:
// onyx headColor vs starfield/cemetery_black backgrounds). Rather than
// chasing individual bad pairs — fragile, and breaks again every time a
// color is added — bodyMarkup/headMarkup check distance against the chosen
// background at generation time and only add a thin contrast outline when
// the shape's own fill is genuinely too close to call. Pieces with normal
// contrast are completely unaffected — this is NOT a universal outline.

// ---------- body shape paths (skin/garment) ----------
function bodyMarkup(bodyId, colorHex, bgFill) {
  // Outline only when bodyColor is genuinely too close to the chosen
  // background (e.g. bone #ece0d8 vs cream background #e8e3d3 — distance 7,
  // nearly invisible) — most combos already contrast fine and stay flat,
  // exactly as before. Direction depends on the fill's own luminance
  // (lighten dark colors, darken light ones), since bodyColor spans both.
  // For SEVERE cases (distance < 15 — including literal duplicates) a
  // stroke alone isn't enough: the fill itself stays invisible against the
  // background, leaving only a thin outline — a hollow wireframe instead of
  // a solid shape. Shift the fill itself there, not just the edge; every
  // shaded/secondary tone derives from this adjusted base so they stay
  // coherent with whatever the body ends up actually being colored.
  const dist = colorDistance(colorHex, bgFill);
  const lowContrast = dist < 40;
  const baseHex = dist < 15 ? (luma(colorHex) > 128 ? shade(colorHex, -55) : shade(colorHex, 55)) : colorHex;
  const strokeAttr = lowContrast ? ` stroke="${luma(baseHex) > 128 ? shade(baseHex, -40) : shade(baseHex, 40)}" stroke-width="2"` : '';
  switch (bodyId) {
    case 'suit':
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 282 335 L 282 360 Q 200 365 195 580 L 405 580 Q 400 365 318 360 L 318 335 Z" fill="${baseHex}"${strokeAttr}/>`;
    case 'turtleneck':
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 280 327 L 280 360 Q 208 365 205 580 L 395 580 Q 392 365 320 360 L 320 327 Z" fill="${baseHex}"${strokeAttr}/>`;
    case 'tank_top':
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 282 335 L 282 360 Q 205 365 200 580 L 400 580 Q 395 365 318 360 L 318 335 Z" fill="${shade(baseHex, 35)}"${strokeAttr}/><path d="M 285 335 L 285 370 Q 222 375 218 580 L 382 580 Q 378 375 315 370 L 315 335 Z" fill="${shade(baseHex, -15)}"/>`;
    case 'robe':
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 278 335 L 278 360 Q 185 390 182 580 L 418 580 Q 415 390 322 360 L 322 335 Z" fill="${baseHex}"${strokeAttr} opacity="0.92"/>`;
    case 'hoodie':
      // Collar height matters because head shapes have different bottom
      // edges (round/boxed/etc end at y=343; monitor/vented end at y=333,
      // 10px higher) — whatever isn't covered by the head shows. The old
      // collar was ~54px tall, so that 10px difference meant monitor/vented
      // exposed a disproportionately large, disconnected-looking chunk of it.
      // Smaller collar (~21px) keeps the same 10px difference proportionally
      // minor regardless of which head shape it pairs with.
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 280 327 L 280 360 Q 208 365 205 580 L 395 580 Q 392 365 320 360 L 320 327 Z" fill="${baseHex}"${strokeAttr}/><path d="M 258 328 Q 300 346 342 328 L 342 340 Q 300 358 258 340 Z" fill="${shade(baseHex, -25)}"/>`;
    case 'tattered':
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 282 335 L 282 360 Q 200 365 195 580 L 215 565 L 235 580 L 255 562 L 275 580 L 300 560 L 325 580 L 345 562 L 365 580 L 385 565 L 405 580 Q 400 365 318 360 L 318 335 Z" fill="${baseHex}"${strokeAttr} opacity="0.95"/>`;
    case 'armored': {
      // Same suit-style silhouette, divided into panels by seam lines with
      // rivets at the corners and a subtle highlight on the top plate — all
      // derived from baseHex so the severe-contrast fix (when active) still
      // carries through consistently into the panel/rivet tones.
      const panelLine = shade(baseHex, -30);
      const rivetColor = shade(baseHex, -45);
      const highlight = shade(baseHex, 20);

      // Real silhouette edge at a given y, solved from the same quadratic
      // bezier that draws the body outline (P0=(282,360), control=(200,365),
      // P1=(195,580); mirrored for the right side). The seam lines below
      // used to guess this with a flat "200 + (y-360)*0.05" linear taper,
      // which is far shallower than how fast the real curve narrows right
      // below the neck — at y=410 that put the seam's start ~20px outside
      // the actual body edge, a visible line poking past the silhouette.
      // Solving the real curve (same technique already used for topPlate's
      // corners below) fixes that at every y, not just the ones the old
      // linear guess happened to land close to.
      function bodyEdgeX(y) {
        const a = 210, b = 10, c = 360 - y;
        const t = (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a);
        return (1 - t) * (1 - t) * 282 + 2 * (1 - t) * t * 200 + t * t * 195;
      }
      const seamInset = 12; // safety margin inside the real edge, same spirit as topPlate's 8px inset
      const seams = [410, 470, 530].map(py => {
        const left = bodyEdgeX(py) + seamInset;
        const right = 600 - left; // silhouette is symmetric about cx=300
        return `<path d="M ${left.toFixed(1)} ${py} Q 300 ${py + 4} ${right.toFixed(1)} ${py}" fill="none" stroke="${panelLine}" stroke-width="3" opacity="0.6"/>`;
      }).join('');

      const rivets = [[230, 410], [370, 410], [215, 470], [385, 470], [205, 530], [395, 530]].map(([rx, ry]) =>
        `<circle cx="${rx}" cy="${ry}" r="3" fill="${rivetColor}" opacity="0.7"/>`
      ).join('');
      // Corners were hand-picked assuming the body was already near full
      // width just below the neck (220-380 at y=365) — the real silhouette
      // there is the curve's actual position, not that. Computed precisely:
      // at y=365 the body's left/right edges are at x≈262/338, not 220/380 —
      // the highlight's top corners stuck out ~40px beyond the real edge
      // into the background, visible as a transparent wedge. Now inset a
      // further 8px inside the real curve as a safety margin.
      const topPlate = `<path d="M 270 365 L 330 365 L 368 405 L 232 405 Z" fill="${highlight}" opacity="0.25"/>`;
      return `<rect x="284" y="315" width="32" height="35" fill="#0a0a0a"/><path d="M 282 335 L 282 360 Q 200 365 195 580 L 405 580 Q 400 365 318 360 L 318 335 Z" fill="${baseHex}"${strokeAttr}/>${seams}${rivets}${topPlate}`;
    }
    default:
      return '';
  }
}

// ---------- head shape + color ----------
function headMarkup(shapeId, colorHex, rng, bgFill) {
  const cx = 300, cy = 215, rx = 118, ry = 128;
  // headColor is always a dark hex, and a few backgrounds are equally dark
  // (headColor 'onyx' #0a0a0a is an EXACT match for background 'starfield'/
  // 'cemetery_black', also #0a0a0a — the head would be genuinely invisible,
  // not just low-contrast, there). For SEVERE cases (distance < 15) a
  // stroke alone isn't enough: the fill itself stays invisible against the
  // background, leaving only a thin outline visible — a hollow wireframe
  // instead of a solid head. The fill itself shifts there, not just the
  // edge; lightened since headColor is always dark, so it still reads
  // against dark backgrounds. Most combos already contrast fine and stay flat.
  const dist = colorDistance(colorHex, bgFill);
  const lowContrast = dist < 40;
  const baseHex = dist < 15 ? shade(colorHex, 55) : colorHex;
  const strokeAttr = lowContrast ? ` stroke="${shade(baseHex, 35)}" stroke-width="2"` : '';
  switch (shapeId) {
    case 'boxed':
      return `<rect x="${cx - rx}" y="${cy - ry}" width="${rx * 2}" height="${ry * 2}" rx="22" fill="${baseHex}"${strokeAttr}/>`;
    case 'monitor': {
      // horizontal-box look: wider than tall, unlike every other headShape
      // (which are taller-than-wide or square) — reads as a CRT/screen head.
      const halfW = 145, halfH = 118, rxCorner = 20;
      return `<rect x="${cx - halfW}" y="${cy - halfH}" width="${halfW * 2}" height="${halfH * 2}" rx="${rxCorner}" fill="${baseHex}"${strokeAttr}/>`;
    }
    case 'split': {
      // The two halves are each shifted AWAY from center, leaving a real
      // 28px gap with nothing drawn there — since body (including the black
      // neck rect) is drawn before the head, that gap exposed the neck rect
      // and raw background straight through the middle of the face. A full
      // ellipse drawn first, filled with the actual background color, covers
      // exactly that gap (the two halves cover everything else identically
      // to before) — reads as a genuine hole through to the background
      // instead of exposing the neck/body construction underneath.
      const gap = 14;
      const seamFill = bgFill;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${seamFill}"/><path d="M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 0 ${cx} ${cy + ry} Z" fill="${baseHex}"${strokeAttr} transform="translate(-${gap},0)"/><path d="M ${cx} ${cy - ry} A ${rx} ${ry} 0 0 1 ${cx} ${cy + ry} Z" fill="${baseHex}"${strokeAttr} transform="translate(${gap},0)"/>`;
    }
    case 'cracked': {
      const topY = cy - ry, stopY = cy - 60;
      const pts = [[cx, topY]];
      const steps = 3;
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const y = topY + t * (stopY - topY);
        const x = cx + Math.round((rng() - 0.5) * 50);
        pts.push([x, y]);
      }
      pts.push([cx + Math.round((rng() - 0.5) * 20), stopY]);
      const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
      const chinX = cx + Math.round((rng() - 0.5) * 40);
      const dChin = `M ${chinX - 10} ${cy + ry - 8} L ${chinX} ${cy + ry} L ${chinX + 10} ${cy + ry - 8}`;
      let chips = '';
      for (let i = 0; i < 3; i++) {
        const side = rng() < 0.5 ? -1 : 1;
        const px = cx + side * (40 + Math.round(rng() * 50));
        const py = topY + Math.round(rng() * (stopY - topY));
        chips += `<circle cx="${px}" cy="${py}" r="3" fill="#ffffff" opacity="0.4"/>`;
      }
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${baseHex}"${strokeAttr}/><path d="${d}" fill="none" stroke="#ffffff" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" opacity="0.85"/><path d="${dChin}" fill="none" stroke="#ffffff" stroke-width="3" stroke-linejoin="round" stroke-linecap="round" opacity="0.7"/>${chips}`;
    }
    case 'antenna': {
      const rodTopY = cy - ry - 38;
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${baseHex}"${strokeAttr}/><line x1="${cx}" y1="${cy - ry}" x2="${cx}" y2="${rodTopY}" stroke="${baseHex}" stroke-width="6" stroke-linecap="round"/><circle cx="${cx}" cy="${rodTopY}" r="9" fill="${baseHex}"${strokeAttr}/>`;
    }
    case 'vented': {
      // same horizontal-box footprint as 'monitor', plus a grille of thin
      // horizontal vent lines near the top — CRT/speaker-grille detail.
      const halfW = 145, halfH = 118, rxCorner = 20;
      const ventColor = shade(baseHex, -25);
      let vents = '';
      for (let i = 0; i < 4; i++) {
        const y = cy - 95 + i * 11;
        vents += `<rect x="${cx - 110}" y="${y}" width="220" height="4" rx="2" fill="${ventColor}" opacity="0.6"/>`;
      }
      return `<rect x="${cx - halfW}" y="${cy - halfH}" width="${halfW * 2}" height="${halfH * 2}" rx="${rxCorner}" fill="${baseHex}"${strokeAttr}/>${vents}`;
    }
    case 'round':
    default:
      return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${baseHex}"${strokeAttr}/>`;
  }
}

// ---------- eyes ----------
// opts: { animate, rng, headColor }  — animate adds inline SMIL (inscription-safe,
// no JS/CSS). Timing is seeded off rng so no two pieces move in sync. When animate
// is false the output is byte-identical to the original static markup.
function eyesMarkup(shapeId, colorHex, eyeR, glowR, opts) {
  const cxL = 249, cxR = 351;
  // The eye row normally sits a bit above the head's vertical center (200,
  // vs the head's own center at 215) to leave room for a mouth below it. With
  // no mouth, that empty space below makes the eye(s) look too high/off-
  // balance — recenter on the head's actual middle instead.
  const noMouth = !!(opts && opts.noMouth);
  const cy = noMouth ? 215 : 200;
  const animate = opts && opts.animate;
  const rng = (opts && opts.rng) || null;
  const headColor = (opts && opts.headColor) || '#0a0a0a';

  // seeded helper: value in [lo, hi], or 0.5 mid when no rng (keeps determinism testable)
  const rnd = (lo, hi) => lo + ((rng ? rng() : 0.5) * (hi - lo));
  const f2 = n => Number(n).toFixed(2);

  let body;

  if (shapeId === 'round_glow') {
    body = [cxL, cxR].map(cx => {
      let glowAnim = '', blink = '';
      if (animate) {
        // breathing pulse: the two glow rings swell/fade. Per-eye phase offset so
        // the pair doesn't pulse in lockstep.
        const dur = f2(rnd(2.6, 4.2));
        const phase = f2(rnd(0, 1.5));
        glowAnim = `<animate attributeName="opacity" values="0.15;0.32;0.15" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
        // eye-local blink: squash ONLY the eyeball+pupil vertically about the eye
        // center. The glow rings stay put, so the iris closes without any rect on
        // the head. Long seeded cycle, fast close, staggered per eye.
        const bdur = f2(rnd(4.5, 7.5));
        const bphase = f2(rnd(0, 4));
        blink = `<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 1;1 0.05;1 1;1 1" keyTimes="0;0.9;0.95;1;1" dur="${bdur}s" begin="-${bphase}s" repeatCount="indefinite"/>`;
      }
      const outerAnim = animate ? glowAnim : '';
      const innerAnim = animate ? glowAnim.replace('0.15;0.32;0.15', '0.25;0.45;0.25') : '';
      const eyeball = animate
        ? `<g transform="translate(${cx} ${cy})">${blink}<circle cx="0" cy="0" r="${eyeR}" fill="${colorHex}"/><circle cx="0" cy="0" r="${Math.round(eyeR * 0.3)}" fill="#0a0a0a"/></g>`
        : `<circle cx="${cx}" cy="${cy}" r="${eyeR}" fill="${colorHex}"/><circle cx="${cx}" cy="${cy}" r="${Math.round(eyeR * 0.3)}" fill="#0a0a0a"/>`;
      return `<circle cx="${cx}" cy="${cy}" r="${glowR[1]}" fill="${colorHex}" opacity="0.15">${outerAnim}</circle>`
           + `<circle cx="${cx}" cy="${cy}" r="${glowR[0]}" fill="${colorHex}" opacity="0.25">${innerAnim}</circle>`
           + eyeball;
    }).join('');
  }
  else if (shapeId === 'hollow_socket') {
    body = [cxL, cxR].map(cx => {
      let spark = '';
      if (animate) {
        // the lone highlight flickers like a spark in the void; irregular-feeling
        // via keyTimes that hold then stutter.
        const dur = f2(rnd(1.8, 3.2));
        const phase = f2(rnd(0, 2));
        spark = `<animate attributeName="opacity" values="0.4;0.4;0.12;0.5;0.4" keyTimes="0;0.45;0.55;0.7;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      }
      return `<ellipse cx="${cx}" cy="${cy + 2}" rx="${eyeR + 2}" ry="${eyeR + 10}" fill="#000"/>`
           + `<ellipse cx="${cx}" cy="${cy}" rx="${eyeR - 2}" ry="${eyeR + 6}" fill="#1f1f1f"/>`
           + `<ellipse cx="${cx - eyeR * 0.2}" cy="${cy - eyeR * 0.4}" rx="${Math.round(eyeR * 0.3)}" ry="${Math.round(eyeR * 0.4)}" fill="${colorHex}" opacity="0.4">${spark}</ellipse>`;
    }).join('');
  }
  else if (shapeId === 'glitch') {
    // a stack of horizontal scan bars instead of a literal eye, each with a
    // faint red/cyan chromatic-aberration ghost offset to either side — the
    // classic glitch-image look. Stagger pattern is fixed (not seeded) so it
    // reads consistently across pieces, varied only by eyeColor/headColor/size.
    const offsets = [-6, 8, -3, 5];
    body = [cxL, cxR].map(cx => {
      const barH = Math.max(5, Math.round(eyeR * 0.32));
      const barW = Math.round(eyeR * 1.7);
      let bars = '';
      offsets.forEach((off, i) => {
        const y = cy - (offsets.length - 1) * barH / 2 + i * barH;
        const x = cx - barW / 2 + off;
        bars += `<rect x="${(x - 3).toFixed(1)}" y="${(y - barH / 2).toFixed(1)}" width="${barW}" height="${Math.max(2, barH - 1)}" fill="#ff3b3b" opacity="0.3"/>`;
        bars += `<rect x="${(x + 3).toFixed(1)}" y="${(y - barH / 2).toFixed(1)}" width="${barW}" height="${Math.max(2, barH - 1)}" fill="#3bdfff" opacity="0.3"/>`;
        bars += `<rect x="${x.toFixed(1)}" y="${(y - barH / 2).toFixed(1)}" width="${barW}" height="${Math.max(2, barH - 1)}" fill="${colorHex}"/>`;
      });
      let jitter = '';
      if (animate) {
        // signal jitter: holds still, then a quick sideways jump-and-settle —
        // distinctly different motion from a smooth pulse/dilate, reads as
        // a dropped frame rather than breathing.
        const dur = f2(rnd(2.5, 4.5));
        const phase = f2(rnd(0, 2));
        jitter = `<animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 0;7 0;-5 0;2 0;0 0;0 0" keyTimes="0;0.55;0.58;0.61;0.64;0.67;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      }
      return `<g>${jitter}${bars}</g>`;
    }).join('');
  }
  else if (shapeId === 'cyclops') {
    // single dominant eye, centered. Previously nudged DOWN 8px to clear the
    // 'open' headShape's top notch — that shape no longer exists (replaced
    // by monitor/vented), so that's reverted. Instead nudged UP 10px and
    // scaled down slightly (1.5x -> 1.3x), because at medium/large sizes the
    // eye's bottom edge was crowding or literally overlapping the 'shout'
    // mouth (the tallest mouth shape, reaching up to y=261) — confirmed
    // overlap of 7px at 'large'. This keeps 19-40px of clearance from shout
    // (and therefore every other, shorter mouth) at every size, while still
    // leaving 136px+ of margin above any current headShape's top edge.
    const cx = 300;
    const eyeCy = noMouth ? cy : cy - 10;
    const bigR = Math.round(eyeR * 1.3);
    const bigGlow = glowR;
    let glowAnim = '', blink = '';
    if (animate) {
      const dur = f2(rnd(2.6, 4.2));
      glowAnim = `<animate attributeName="opacity" values="0.15;0.32;0.15" dur="${dur}s" repeatCount="indefinite"/>`;
      const bdur = f2(rnd(4.5, 7.5));
      const bphase = f2(rnd(0, 4));
      blink = `<animateTransform attributeName="transform" type="scale" additive="sum" values="1 1;1 1;1 0.05;1 1;1 1" keyTimes="0;0.9;0.95;1;1" dur="${bdur}s" begin="-${bphase}s" repeatCount="indefinite"/>`;
    }
    const innerAnim = animate ? glowAnim.replace('0.15;0.32;0.15', '0.25;0.45;0.25') : '';
    const eyeball = animate
      ? `<g transform="translate(${cx} ${eyeCy})">${blink}<circle cx="0" cy="0" r="${bigR}" fill="${colorHex}"/><circle cx="0" cy="0" r="${Math.round(bigR * 0.3)}" fill="#0a0a0a"/></g>`
      : `<circle cx="${cx}" cy="${eyeCy}" r="${bigR}" fill="${colorHex}"/><circle cx="${cx}" cy="${eyeCy}" r="${Math.round(bigR * 0.3)}" fill="#0a0a0a"/>`;
    body = `<circle cx="${cx}" cy="${eyeCy}" r="${bigGlow[1]}" fill="${colorHex}" opacity="0.15">${animate ? glowAnim : ''}</circle>`
         + `<circle cx="${cx}" cy="${eyeCy}" r="${bigGlow[0]}" fill="${colorHex}" opacity="0.25">${innerAnim}</circle>`
         + eyeball;
  }
  else {
    // x_dead
    const w = Math.round(eyeR * 0.8), sw = Math.round(eyeR * 0.32);
    body = [cxL, cxR].map(cx => {
      let drop = '';
      if (animate) {
        // dying-signal dropout: holds bright, briefly cuts out.
        const dur = f2(rnd(2.2, 3.8));
        const phase = f2(rnd(0, 2));
        drop = `<animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.6;0.68;0.76" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      }
      return `<g opacity="1">${drop}`
           + `<line x1="${cx - w}" y1="${cy - w}" x2="${cx + w}" y2="${cy + w}" stroke="${colorHex}" stroke-width="${sw}" stroke-linecap="round"/>`
           + `<line x1="${cx + w}" y1="${cy - w}" x2="${cx - w}" y2="${cy + w}" stroke="${colorHex}" stroke-width="${sw}" stroke-linecap="round"/>`
           + `</g>`;
    }).join('');
  }

  // Animation is intentionally confined to the eye elements themselves (glow,
  // spark, pupil, signal). No overlay rects on the head — earlier versions drew
  // head-colored "eyelid" rects that poked outside round heads and read as a box
  // flashing on the forehead. The per-shape idle motion above is the whole effect.
  return body;
}

// ---------- mouth ----------
function mouthMarkup(mouthId, headShapeId) {
  const cx = 300;
  // Every other headShape (round/boxed/split/cracked/antenna) has its
  // bottom edge at cy+128=343. 'monitor' and 'vented' are a genuinely
  // different silhouette — a horizontal box with halfH=118, bottom edge
  // at only 333 — 10px shorter, with nothing here ever compensating for
  // it. The mouth's own vertical anchor was a flat cy=295 regardless of
  // headShape, so every mouth trait quietly lost exactly that 10px of
  // clearance under monitor/vented specifically. Most mouths had enough
  // margin to spare that it didn't show; 'shout' (the tallest, ry=34)
  // only had 11px of margin to begin with, so it dropped to ~1px —
  // visually indistinguishable from touching the head's bottom edge,
  // reading as if it were sitting on the neck/collar below. Shifting the
  // whole mouth up by that same 10px under monitor/vented restores the
  // identical clearance every other headShape already has, for every
  // mouth trait, not just a special-case patch for 'shout' alone.
  const cy = (headShapeId === 'monitor' || headShapeId === 'vented') ? 285 : 295;
  if (mouthId === 'waveform') {
    // jagged oscilloscope trace across the mouth instead of a blank shape
    const pts = [[-50, 0], [-38, -10], [-26, 8], [-14, -14], [-2, 12], [10, -8], [22, 14], [34, -10], [46, 4], [50, 0]];
    const d = pts.map(([dx, dy], i) => `${i === 0 ? 'M' : 'L'} ${cx + dx} ${cy + dy}`).join(' ');
    return `<path d="${d}" fill="none" stroke="#7df9e8" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  if (mouthId === 'grin') {
    let out = `<rect x="${cx - 42}" y="${cy - 15}" width="84" height="30" rx="3" fill="#fff"/><line x1="${cx - 42}" y1="${cy}" x2="${cx + 42}" y2="${cy}" stroke="#1a1a1a" stroke-width="3"/>`;
    for (let i = -28; i <= 28; i += 14) out += `<line x1="${cx + i}" y1="${cy - 15}" x2="${cx + i}" y2="${cy + 15}" stroke="#1a1a1a" stroke-width="3"/>`;
    return out;
  }
  if (mouthId === 'shout') return `<ellipse cx="${cx}" cy="${cy + 3}" rx="26" ry="34" fill="#000"/><ellipse cx="${cx}" cy="${cy + 3}" rx="20" ry="28" fill="#1f1f1f"/>`;
  if (mouthId === 'none') return '';
  if (mouthId === 'fangs') {
    return `<ellipse cx="${cx}" cy="${cy + 3}" rx="30" ry="22" fill="#1a1a1a"/><path d="M ${cx - 16} ${cy - 9} L ${cx - 10} ${cy + 9} L ${cx - 4} ${cy - 9} Z" fill="#fff"/><path d="M ${cx + 4} ${cy - 9} L ${cx + 10} ${cy + 9} L ${cx + 16} ${cy - 9} Z" fill="#fff"/>`;
  }
  if (mouthId === 'zipper') {
    let out = `<line x1="${cx}" y1="${cy - 20}" x2="${cx}" y2="${cy + 20}" stroke="#9a9a9a" stroke-width="3"/>`;
    for (let i = -16; i <= 16; i += 8) out += `<line x1="${cx - 6}" y1="${cy + i}" x2="${cx + 6}" y2="${cy + i}" stroke="#9a9a9a" stroke-width="2"/>`;
    out += `<rect x="${cx - 5}" y="${cy + 18}" width="10" height="8" rx="2" fill="#9a9a9a"/>`;
    return out;
  }
  // stitched
  let out = `<line x1="${cx - 48}" y1="${cy}" x2="${cx + 48}" y2="${cy}" stroke="#fff" stroke-width="4" opacity="0.9"/>`;
  [-34, -12, 10, 32].forEach(i => out += `<line x1="${cx + i}" y1="${cy - 11}" x2="${cx + i - 4}" y2="${cy + 11}" stroke="#fff" stroke-width="3" opacity="0.9"/>`);
  return out;
}

// ---------- background texture overlays ----------
function backgroundOverlay(rng, pattern) {
  let out = '';
  if (pattern === 'dots') {
    for (let i = 0; i < 28; i++) out += `<circle cx="${Math.round(rng() * 600)}" cy="${Math.round(rng() * 600)}" r="0.8" fill="#000" opacity="0.12"/>`;
  }
  else if (pattern === 'cloud') {
    for (let i = 0; i < 5; i++) { const rx = 35 + Math.round(rng() * 32); out += `<ellipse cx="${Math.round(rng() * 600)}" cy="${Math.round(rng() * 160)}" rx="${rx}" ry="${Math.round(rx * 0.5)}" fill="#ffffff" opacity="0.35"/>`; }
  }
  else if (pattern === 'stars') {
    for (let i = 0; i < 35; i++) out += `<circle cx="${Math.round(rng() * 600)}" cy="${Math.round(rng() * 250)}" r="${(rng() * 1.5 + 0.5).toFixed(1)}" fill="#ffffff" opacity="${(rng() * 0.5 + 0.35).toFixed(2)}"/>`;
  }
  else if (pattern === 'rain') {
    for (let i = 0; i < 24; i++) {
      const x = rng() * 600, y = rng() * 600, len = 14 + rng() * 10;
      out += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - len * 0.3).toFixed(1)}" y2="${(y + len).toFixed(1)}" stroke="#cfe0ee" stroke-width="1.4" opacity="${(0.25 + rng() * 0.3).toFixed(2)}"/>`;
    }
  }
  else if (pattern === 'lightning') {
    // Margin widened again — 25px against monitor/vented wasn't visually
    // convincing at a glance even though it never literally touched. Now
    // 40px clear of the widest current headShape, and the START position is
    // drawn from comfortably inside that safe zone (20-100 / 500-580)
    // instead of a wide range that often got clamped down to the boundary —
    // less pinning against the limit, more natural-looking spread overall.
    const side = rng() < 0.5 ? -1 : 1;
    const safeLimit = side < 0 ? 115 : 485; // 40px clear of monitor/vented (155/445)
    let x = side < 0 ? (20 + rng() * 80) : (580 - rng() * 80);
    const y0 = 20;
    let d = `M ${x} ${y0}`;
    for (let i = 1; i <= 5; i++) {
      const ny = y0 + i * ((280 - y0) / 5);
      x += Math.round((rng() - 0.5) * 40);
      x = side < 0 ? Math.min(x, safeLimit) : Math.max(x, safeLimit);
      d += ` L ${x} ${ny}`;
    }
    out += `<path d="${d}" fill="none" stroke="#fff7b0" stroke-width="7" stroke-linejoin="round" opacity="0.25"/><path d="${d}" fill="none" stroke="#fffbe0" stroke-width="3" stroke-linejoin="round" opacity="0.9"/>`;
  }
  else if (pattern === 'houses') {
    // Contained within frame: starts at x=4 (so the first roof's 4px
    // overhang lands exactly at the left edge, not off-canvas) and clamps
    // the last building's width so its roof overhang never crosses x=600.
    let x = 4;
    while (x < 600) {
      let w = 50 + rng() * 40, h = 40 + rng() * 50, roofH = 18 + rng() * 14;
      if (x + w + 4 > 600) w = 600 - x - 4;
      if (w < 14) break;
      out += `<rect x="${x.toFixed(1)}" y="${(580 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#1a1410" opacity="0.85"/>`;
      out += `<path d="M ${(x - 4).toFixed(1)} ${(580 - h).toFixed(1)} L ${(x + w / 2).toFixed(1)} ${(580 - h - roofH).toFixed(1)} L ${(x + w + 4).toFixed(1)} ${(580 - h).toFixed(1)} Z" fill="#1a1410" opacity="0.85"/>`;
      if (rng() < 0.6) out += `<rect x="${(x + w * 0.3).toFixed(1)}" y="${(580 - h * 0.6).toFixed(1)}" width="${Math.max(6, w * 0.18).toFixed(1)}" height="${Math.max(6, h * 0.18).toFixed(1)}" fill="#ffce8a" opacity="0.8"/>`;
      x += w + 6 + rng() * 14;
    }
  }
  else if (pattern === 'cemetery') {
    // Contained within frame: starts at x=0, clamps the last headstone/cross
    // width so it never crosses x=600 (no overhang beyond the base width here,
    // unlike houses' roof, so a straightforward clamp is enough).
    let x = 0;
    while (x < 600) {
      let w = 22 + rng() * 14, h = 36 + rng() * 26;
      if (x + w > 600) w = 600 - x;
      if (w < 10) break;
      if (rng() < 0.3) {
        const cx = x + w / 2;
        out += `<rect x="${(cx - 3).toFixed(1)}" y="${(580 - h).toFixed(1)}" width="6" height="${h.toFixed(1)}" fill="#1c1c1c" opacity="0.85"/>`;
        out += `<rect x="${(cx - w / 2).toFixed(1)}" y="${(580 - h * 0.65).toFixed(1)}" width="${w.toFixed(1)}" height="6" fill="#1c1c1c" opacity="0.85"/>`;
      } else {
        out += `<path d="M ${x.toFixed(1)} 580 L ${x.toFixed(1)} ${(580 - h + 10).toFixed(1)} Q ${(x + w / 2).toFixed(1)} ${(580 - h).toFixed(1)} ${(x + w).toFixed(1)} ${(580 - h + 10).toFixed(1)} L ${(x + w).toFixed(1)} 580 Z" fill="#1c1c1c" opacity="0.85"/>`;
      }
      x += w + 14 + rng() * 18;
    }
    out += `<rect x="0" y="500" width="600" height="40" fill="#cfd6d2" opacity="0.12"/>`;
  }
  else if (pattern === 'snow') {
    out += `<rect x="0" y="555" width="600" height="45" fill="#f3f6f8" opacity="0.9"/>`;
    for (let i = 0; i < 28; i++) {
      const x = Math.round(rng() * 600), y = Math.round(rng() * 560);
      out += `<circle cx="${x}" cy="${y}" r="${(1 + rng() * 2.5).toFixed(1)}" fill="#ffffff" opacity="${(0.55 + rng() * 0.4).toFixed(2)}"/>`;
    }
  }
  else if (pattern === 'beach') {
    // Sun moved up and into the corners (was cy=90, r=40, x:90-130/470-510) —
    // that overlapped the wider monitor/vented/split head shapes. New
    // position clears every current headShape with 27px+ margin.
    const sunX = rng() < 0.5 ? 60 + rng() * 35 : 505 + rng() * 35;
    out += `<circle cx="${sunX.toFixed(1)}" cy="50" r="30" fill="#ffd27a"/><rect x="0" y="470" width="600" height="50" fill="#3f8fb0"/>`;
    for (let i = 0; i < 3; i++) { const wy = 478 + i * 12; out += `<path d="M 0 ${wy} Q 60 ${wy - 6} 120 ${wy} T 240 ${wy} T 360 ${wy} T 480 ${wy} T 600 ${wy}" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.5"/>`; }
    out += `<rect x="0" y="520" width="600" height="60" fill="#e8d3a0"/>`;
  }
  else if (pattern === 'abandoned_city') {
    // Contained within frame: starts at x=0, clamps the last building's
    // width so it never crosses x=600 (the jagged roofline stays within
    // [x, x+w], no overhang beyond the base width).
    let x = 0;
    while (x < 600) {
      let w = 34 + rng() * 26, h = 90 + rng() * 110, topY = 580 - h, jag = 8 + rng() * 14;
      if (x + w > 600) w = 600 - x;
      if (w < 16) break;
      out += `<path d="M ${x.toFixed(1)} 580 L ${x.toFixed(1)} ${(topY + jag).toFixed(1)} L ${(x + w * 0.3).toFixed(1)} ${topY.toFixed(1)} L ${(x + w * 0.6).toFixed(1)} ${(topY + jag * 0.6).toFixed(1)} L ${(x + w).toFixed(1)} ${(topY + jag * 1.4).toFixed(1)} L ${(x + w).toFixed(1)} 580 Z" fill="#15140f" opacity="0.82"/>`;
      if (rng() < 0.5) {
        let winX = x + w * 0.2 + rng() * w * 0.4, winW = 6 + rng() * 6;
        if (winX + winW > x + w) winW = (x + w) - winX; // stay within the building's own bounds, not just the canvas
        if (winW > 2) out += `<rect x="${winX.toFixed(1)}" y="${(topY + jag * 2 + rng() * (h * 0.4)).toFixed(1)}" width="${winW.toFixed(1)}" height="${(8 + rng() * 8).toFixed(1)}" fill="#000000" opacity="0.6"/>`;
      }
      x += w + 14 + rng() * 16;
    }
    for (let i = 0; i < 5; i++) { const rx = Math.round(rng() * 600), ry = 560 + Math.round(rng() * 15), rr = 6 + rng() * 10; out += `<ellipse cx="${rx}" cy="${ry}" rx="${rr.toFixed(1)}" ry="${(rr * 0.5).toFixed(1)}" fill="#1a1812" opacity="0.5"/>`; }
  }
  else if (pattern === 'cave') {
    for (let i = 0; i < 6; i++) {
      const x = rng() < 0.5 ? rng() * 150 : 450 + rng() * 150, w = 18 + rng() * 22, len = 30 + rng() * 70;
      out += `<path d="M ${(x - w / 2).toFixed(1)} 0 L ${x.toFixed(1)} ${len.toFixed(1)} L ${(x + w / 2).toFixed(1)} 0 Z" fill="#0d0805" opacity="0.85"/>`;
    }
    out += `<path d="M 0 0 L 60 0 L 30 250 L 0 600 Z" fill="#120c08" opacity="0.7"/><path d="M 600 0 L 540 0 L 570 280 L 600 600 Z" fill="#120c08" opacity="0.7"/>`;
    for (let i = 0; i < 12; i++) { const gx = rng() * 600, gy = 100 + rng() * 450; out += `<circle cx="${gx.toFixed(1)}" cy="${gy.toFixed(1)}" r="${(1 + rng() * 1.5).toFixed(1)}" fill="#7fd6e0" opacity="${(0.4 + rng() * 0.4).toFixed(2)}"/>`; }
    out += `<rect x="0" y="560" width="600" height="40" fill="#0d0805" opacity="0.6"/>`;
  }
  else if (pattern === 'desert') {
    // Sun moved up and into the corners — same overlap issue beach had:
    // old position (x:90-130/470-510, r=36) clipped into monitor/vented heads.
    const sunX = rng() < 0.5 ? 60 + rng() * 35 : 505 + rng() * 35;
    out += `<circle cx="${sunX.toFixed(1)}" cy="50" r="30" fill="#fff2c0" opacity="0.9"/><path d="M 0 520 Q 150 480 300 510 T 600 500 L 600 600 L 0 600 Z" fill="#c98f4a"/><path d="M 0 560 Q 200 530 400 555 T 600 545 L 600 600 L 0 600 Z" fill="#b97c3a" opacity="0.85"/>`;
    const cx = rng() < 0.5 ? 60 + rng() * 30 : 510 + rng() * 30, h = 50 + rng() * 30;
    out += `<rect x="${(cx - 6).toFixed(1)}" y="${(560 - h).toFixed(1)}" width="12" height="${h.toFixed(1)}" rx="5" fill="#3a5a32"/><rect x="${(cx - 18).toFixed(1)}" y="${(560 - h * 0.6).toFixed(1)}" width="14" height="9" rx="4" fill="#3a5a32"/><rect x="${(cx + 6).toFixed(1)}" y="${(560 - h * 0.75).toFixed(1)}" width="14" height="9" rx="4" fill="#3a5a32"/>`;
  }
  else if (pattern === 'forest') {
    // Contained within frame: starts at x=0, clamps the last tree's width
    // so it never crosses x=600 (canopy/trunk stay within [x, x+w]).
    let x = 0;
    while (x < 600) {
      let w = 30 + rng() * 30, h = 80 + rng() * 100, baseY = 580;
      if (x + w > 600) w = 600 - x;
      if (w < 12) break;
      out += `<rect x="${(x + w * 0.4).toFixed(1)}" y="${(baseY - h * 0.15).toFixed(1)}" width="${(w * 0.2).toFixed(1)}" height="${(h * 0.15).toFixed(1)}" fill="#1a140d" opacity="0.8"/><path d="M ${x.toFixed(1)} ${(baseY - h * 0.15).toFixed(1)} L ${(x + w / 2).toFixed(1)} ${(baseY - h).toFixed(1)} L ${(x + w).toFixed(1)} ${(baseY - h * 0.15).toFixed(1)} Z" fill="#16241a" opacity="0.85"/>`;
      x += w * 1.0 + rng() * 18;
    }
  }
  else if (pattern === 'fog') {
    for (let i = 0; i < 6; i++) {
      const y = 80 + i * 80 + rng() * 30, h = 30 + rng() * 20;
      out += `<rect x="0" y="${y.toFixed(1)}" width="600" height="${h.toFixed(1)}" fill="#ffffff" opacity="${(0.08 + rng() * 0.1).toFixed(2)}"/>`;
    }
  }
  else if (pattern === 'swamp') {
    // Contained within frame: starts at x=0, clamps the last reed's width
    // so it never crosses x=600.
    let x = 0;
    while (x < 600) {
      const h = 40 + rng() * 60;
      let w = 4 + rng() * 4;
      if (x + w > 600) w = 600 - x;
      if (w < 2) break;
      out += `<rect x="${x.toFixed(1)}" y="${(580 - h).toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" fill="#1f2a16" opacity="0.7"/>`;
      x += 16 + rng() * 24;
    }
    out += `<rect x="0" y="540" width="600" height="60" fill="#26331c" opacity="0.5"/>`;
    for (let i = 0; i < 4; i++) {
      const y = 100 + i * 90 + rng() * 30;
      out += `<rect x="0" y="${y.toFixed(1)}" width="600" height="20" fill="#ffffff" opacity="${(0.05 + rng() * 0.06).toFixed(2)}"/>`;
    }
  }
  else if (pattern === 'static') {
    // 140 individual speckles was the single heaviest piece of markup in the
    // whole engine (~12KB average just for this background, vs ~4.5KB overall
    // average) — it's what made generating large supplies slow/heavy. A small
    // tileable pattern gives the same TV-static density from a handful of
    // elements instead of 140. The tile's contents are still seeded per piece
    // (via rng) so each 'static' piece keeps a distinct noise texture, just
    // built from a repeating tile rather than one element per speck.
    const tileSize = 50 + Math.round(rng() * 20);
    const n = 6 + Math.floor(rng() * 5);
    let speckles = '';
    for (let i = 0; i < n; i++) {
      const x = Math.round(rng() * tileSize), y = Math.round(rng() * tileSize);
      const w = 4 + Math.round(rng() * 10), h = 1 + Math.round(rng() * 3);
      speckles += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff" opacity="${(0.15 + rng() * 0.35).toFixed(2)}"/>`;
    }
    // id drawn from this piece's own rng stream (not a global counter) so the
    // whole function stays deterministic — same seed+index always reproduces
    // the same svg, including this id. Two draws over a combined ~1e12 space
    // keeps collisions negligible even across very large batches.
    const patId = 'stp' + Math.floor(rng() * 1e6) + '_' + Math.floor(rng() * 1e6);
    out += `<defs><pattern id="${patId}" width="${tileSize}" height="${tileSize}" patternUnits="userSpaceOnUse">${speckles}</pattern></defs><rect width="600" height="600" fill="url(#${patId})"/>`;
    for (let i = 0; i < 3; i++) {
      const y = Math.round(rng() * 600);
      out += `<rect x="0" y="${y}" width="600" height="3" fill="#ffffff" opacity="0.2"/>`;
    }
  }
  else if (pattern === 'eclipse') {
    // Sun sits in the far top-left corner, smaller and tucked in tighter than
    // before — the previous position (and radius) cleared the head shapes
    // that existed at the time, but overlapped the wider monitor/vented heads
    // added afterward. Re-verified against every current headShape's actual
    // bounding box; this clears all of them with 27px+ margin.
    const sunX = 40 + rng() * 60;
    const sunY = 38 + rng() * 14;
    out += `<circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="28" fill="none" stroke="#ffd27a" stroke-width="4" opacity="0.9"/><circle cx="${sunX.toFixed(1)}" cy="${sunY.toFixed(1)}" r="23" fill="#05050a"/>`;
    for (let i = 0; i < 25; i++) out += `<circle cx="${Math.round(rng() * 600)}" cy="${Math.round(rng() * 280)}" r="${(rng() * 1.2 + 0.4).toFixed(1)}" fill="#ffffff" opacity="${(rng() * 0.4 + 0.2).toFixed(2)}"/>`;
  }
  return out;
}

// ---------- accessories ----------
function accessoryMarkup(rng, accId, eyeCtx) {
  if (accId === 'scatter_dots') {
    let out = '';
    const n = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) out += `<circle cx="${Math.round(rng() * 480 + 60)}" cy="${Math.round(rng() * 480 + 30)}" r="2" fill="#fff" opacity="0.7"/>`;
    return out;
  }
  if (accId === 'scanlines') {
    // identical visual to repeating <rect> every 8px, but as one pattern tile
    // instead of ~75 literal rects — same look at a fraction of the bytes.
    // Per-piece unique pattern id (cheap, harmless if it ever collided since
    // the content is identical regardless) so this stays well-formed when
    // hundreds of these sit side by side in one HTML document (the gallery
    // grid), where duplicate ids are invalid.
    const pid = 'sl' + Math.floor(rng() * 1e6);
    return `<defs><pattern id="${pid}" width="600" height="8" patternUnits="userSpaceOnUse"><rect x="0" y="4" width="600" height="2" fill="#000000" opacity="0.12"/></pattern></defs><rect x="0" y="0" width="600" height="600" fill="url(#${pid})"/>`;
  }
  if (accId === 'tears') {
    // Was hardcoded to ±51px either side of center (300), which is exactly
    // right for the standard two-eye layout (eyes at 249/351) but puts the
    // tear well off to the side of 'cyclops' — a single eye centered at
    // x=300 — instead of underneath it. Center-align for cyclops instead of
    // reusing the two-eye offset.
    const isCyclops = eyeCtx && eyeCtx.eyeShape === 'cyclops';
    const side = rng() < 0.5 ? -1 : 1;
    const tx = isCyclops ? 300 : 300 + side * 51;

    // Was ALSO a flat ty=230 for every non-cyclops case, which assumed one
    // specific eye shape's bottom edge and one specific cy — wrong on two
    // counts: (1) noMouth shifts cy from 200 to 215 (15px) and this never
    // accounted for it, and (2) every eyeShape has a different actual
    // vertical extent below cy — hollow_socket's outer ellipse alone reaches
    // eyeR+10, taller than the flat 230 constant assumed, so the tear started
    // partway INSIDE the socket instead of below it (confirmed: at
    // size=medium with a mouth present, eye bottom = 200+42 = 242, twelve
    // pixels below where the tear used to start). round_glow's faint outer
    // glow ring reaches even further (glowR[1], which is exactly eyeR+14 at
    // every defined size — verified against the actual size trait
    // definitions rather than assumed). Computing the real bottom edge per
    // shape, the same way cyclops already got fixed, instead of one guess
    // reused for every shape.
    const cy = (eyeCtx && eyeCtx.noMouth) ? 215 : 200;
    const eyeR = (eyeCtx && eyeCtx.eyeR) || 32;
    let bottomOffset;
    if (isCyclops) {
      const eyeCy = (eyeCtx && eyeCtx.noMouth) ? cy : cy - 10;
      bottomOffset = Math.round(eyeR * 1.3) + (eyeCy - cy); // fold cyclops's own cy shift into the offset from the shared cy below
    } else if (!eyeCtx || !eyeCtx.eyeShape || eyeCtx.eyeShape === 'round_glow') {
      bottomOffset = eyeR + 14; // outer glow ring radius (glowR[1]), verified == eyeR+14 at every defined size
    } else if (eyeCtx.eyeShape === 'hollow_socket') {
      bottomOffset = eyeR + 10; // outer socket ellipse's ry
    } else if (eyeCtx.eyeShape === 'glitch') {
      const barH = Math.max(5, Math.round(eyeR * 0.32));
      bottomOffset = Math.round(1.5 * barH); // 4 stacked bars, half-span below center
    } else if (eyeCtx.eyeShape === 'x_dead') {
      bottomOffset = Math.round(eyeR * 0.8); // X shape's own half-width, which also sets its vertical reach
    } else {
      bottomOffset = eyeR + 14; // unrecognized shape (future-proofing) — fall back to the tallest known case rather than the shortest, so a new shape added later overshoots safely instead of overlapping
    }
    const ty = cy + bottomOffset + 6;

    return `<path d="M ${tx} ${ty} Q ${tx - 6} ${ty + 18} ${tx} ${ty + 26} Q ${tx + 6} ${ty + 18} ${tx} ${ty} Z" fill="#bcd9ff" opacity="0.8"/>`;
  }
  return '';
}

// ---------- main composer ----------
// opts (optional): { animate: boolean } — when true, eyes get inscription-safe
// SMIL animation. Animation timing uses a SEPARATE seeded stream so toggling it
// never changes which traits are picked (the art stays identical, only motion is added).
function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const animate = !!(opts && opts.animate);

  const background = pickByRarity(rng, TRAITS.background, t);
  const body       = pickByRarity(rng, TRAITS.body, t);
  const bodyColor  = pickByRarity(rng, TRAITS.bodyColor, t);
  const size       = pickByRarity(rng, TRAITS.size, t);
  const headShape  = pickByRarity(rng, TRAITS.headShape, t);
  const headColor  = pickByRarity(rng, TRAITS.headColor, t);
  const eyeShape   = pickByRarity(rng, TRAITS.eyeShape, t);
  const eyeColor   = pickByRarity(rng, TRAITS.eyeColor, t);
  let mouth        = pickByRarity(rng, TRAITS.mouth, t);
  mouth = rerollTraitIfClashing(rng, { headShape: headShape.id, eyeShape: eyeShape.id, eyeColor: eyeColor.id }, 'mouth', mouth, TRAITS.mouth, t);
  let accessory    = pickByRarity(rng, TRAITS.accessory, t);
  accessory = rerollTraitIfClashing(rng, { headShape: headShape.id, size: size.id, eyeShape: eyeShape.id, mouth: mouth.id }, 'accessory', accessory, TRAITS.accessory, t);

  // independent timing stream (different multiplier) — keeps trait selection stable
  const animRng = animate ? mulberry32((seed ?? 0) * 70001 + index * 9973 + 1) : null;
  const eyeOpts = { noMouth: mouth.id === 'none' };
  if (animate) { eyeOpts.animate = true; eyeOpts.rng = animRng; eyeOpts.headColor = headColor.hex; }

  const svg = `<svg viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
<rect width="600" height="600" fill="${background.fill}"/>
${backgroundOverlay(rng, background.pattern)}
${bodyMarkup(body.id, bodyColor.hex, background.fill)}
${headMarkup(headShape.id, headColor.hex, rng, background.fill)}
${eyesMarkup(eyeShape.id, eyeColor.hex, size.eyeR, size.glowR, eyeOpts)}
${mouthMarkup(mouth.id, headShape.id)}
${accessoryMarkup(rng, accessory.id, { eyeShape: eyeShape.id, eyeR: size.eyeR, noMouth: eyeOpts.noMouth })}
</svg>`;

  return {
    index,
    svg,
    tier: t,
    traits: {
      background: background.id, body: body.id, bodyColor: bodyColor.id, size: size.id,
      headShape: headShape.id, headColor: headColor.id,
      eyeShape: eyeShape.id, eyeColor: eyeColor.id,
      mouth: mouth.id, accessory: accessory.id
    },
    rarity: {
      background: background.rarity, body: body.rarity, bodyColor: bodyColor.rarity, size: size.rarity,
      headShape: headShape.rarity, headColor: headColor.rarity,
      eyeShape: eyeShape.rarity, eyeColor: eyeColor.rarity,
      mouth: mouth.rarity, accessory: accessory.rarity
    }
  };
}

function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

// ---------- export ----------
const api = {
  generatePiece, generateBatch, TRAITS, TIER_FALLBACK,
  mulberry32, weightedPick, pickByRarity, shade,
  bodyMarkup, headMarkup, eyesMarkup, mouthMarkup, backgroundOverlay, accessoryMarkup
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.ArtGen = api;
}
