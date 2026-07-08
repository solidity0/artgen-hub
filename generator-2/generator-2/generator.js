// ============================================================
// Firmware Glyph — Generative Trait Engine v3
// v1: core engine.
// v2: trait expansion for 20k supply.
// v3: +4 traits per category (28 new total).
//     palette:  terminal_green, rust_signal, steel_grey, infrared  (2U 2R)
//     core:     spiral_lock, diamond_pulse, hex_grid, orbit         (1U 3R)
//     fracture: cracked, splintered, eroded, ghost                  (1U 3R)
//     segments: minimal, pulse, dense_hive, ultra                   (1U 3R)
//     field:    interference, grain, void_static, overexposed       (1U 3R)
//     glitch:   flicker, pixel_shift, strobe, corrupt_feed          (1U 3R)
//     symmetry: mirror_4, radial_2, radial_8, mirror_radial_4       (1U 3R)
// Usage:
//   Node:    const { generatePiece, generateBatch } = require('./generator.js');
//   Browser: inlined into index.html by build.js -> window.GlyphGen
// ============================================================

// ---------- seeded RNG ----------
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
  palette: [
    // common
    { id: 'mono_white',      weight: 28, ink: '#ffffff', glow: '#ffffff', bg: '#000000', rarity: 'common' },
    { id: 'amber_rom',       weight: 22, ink: '#f7931a', glow: '#ffb347', bg: '#000000', rarity: 'common' },
    // uncommon
    { id: 'phosphor',        weight: 18, ink: '#39ff9e', glow: '#39ff9e', bg: '#020402', rarity: 'uncommon' },
    { id: 'cyan_signal',     weight: 14, ink: '#2bd4d4', glow: '#2bd4d4', bg: '#000305', rarity: 'uncommon' },
    { id: 'mag_pink',        weight: 12, ink: '#ff6ec7', glow: '#ff9edf', bg: '#050005', rarity: 'uncommon' },
    { id: 'cold_blue',       weight: 12, ink: '#7eb8ff', glow: '#aad4ff', bg: '#000208', rarity: 'uncommon' },
    { id: 'terminal_green',  weight: 14, ink: '#00ff41', glow: '#00ff41', bg: '#000200', rarity: 'uncommon' },  // matrix CRT green
    { id: 'rust_signal',     weight: 12, ink: '#e8622a', glow: '#f07a42', bg: '#040100', rarity: 'uncommon' },  // oxidised orange-red
    // rare
    { id: 'blood_bus',       weight: 10, ink: '#ff3b3b', glow: '#ff5c5c', bg: '#050000', rarity: 'rare' },
    { id: 'deep_violet',     weight: 8,  ink: '#c084fc', glow: '#d8b4fe', bg: '#030008', rarity: 'rare' },
    { id: 'ice_white',       weight: 8,  ink: '#e8f4ff', glow: '#ffffff', bg: '#000508', rarity: 'rare' },
    { id: 'gold_signal',     weight: 6,  ink: '#ffd700', glow: '#ffe44d', bg: '#020200', rarity: 'rare' },
    { id: 'steel_grey',      weight: 8,  ink: '#b0bec5', glow: '#cfd8dc', bg: '#010304', rarity: 'rare' },   // cold industrial
    { id: 'infrared',        weight: 6,  ink: '#ff4444', glow: '#ff8888', bg: '#080000', rarity: 'rare' }    // deep thermal red, different from blood_bus bg
  ],
  core: [
    // common
    { id: 'broken_ring',    weight: 28, k: 'ring',           rarity: 'common' },
    { id: 'split_cross',    weight: 22, k: 'cross',          rarity: 'common' },
    // uncommon
    { id: 'stacked_bars',   weight: 18, k: 'bars',           rarity: 'uncommon' },
    { id: 'nested_frame',   weight: 14, k: 'frame',          rarity: 'uncommon' },
    { id: 'spiral_lock',    weight: 14, k: 'spiral_lock',    rarity: 'uncommon' },  // concentric spiral arcs stepping inward
    // rare
    { id: 'triskel',        weight: 10, k: 'triskel',        rarity: 'rare' },
    { id: 'singularity',    weight: 6,  k: 'singularity',    rarity: 'rare' },
    { id: 'arc_burst',      weight: 8,  k: 'arc_burst',      rarity: 'rare' },
    { id: 'shattered_grid', weight: 6,  k: 'shattered_grid', rarity: 'rare' },
    { id: 'diamond_pulse',  weight: 8,  k: 'diamond_pulse',  rarity: 'rare' },  // nested rotated squares (diamonds)
    { id: 'hex_grid',       weight: 6,  k: 'hex_grid',       rarity: 'rare' },  // hexagonal cell pattern
    { id: 'orbit',          weight: 6,  k: 'orbit',          rarity: 'rare' }   // off-center rings at varying radii
  ],
  fracture: [
    // common
    { id: 'stable',     weight: 26, amt: 0.0,  rarity: 'common' },
    { id: 'hairline',   weight: 26, amt: 0.10, rarity: 'common' },
    { id: 'cracked',    weight: 20, amt: 0.18, rarity: 'common' },   // light surface cracking
    // uncommon
    { id: 'fractured',  weight: 20, amt: 0.24, rarity: 'uncommon' },
    { id: 'splintered', weight: 16, amt: 0.34, rarity: 'uncommon' }, // mid-fracture, more aggressive than fractured
    // rare
    { id: 'shattered',  weight: 14, amt: 0.42, rarity: 'rare' },
    { id: 'eroded',     weight: 10, amt: 0.54, rarity: 'rare' },     // heavy erosion, between shattered and corrupt
    { id: 'corrupt',    weight: 8,  amt: 0.66, rarity: 'rare' },
    { id: 'ghost',      weight: 6,  amt: 0.78, rarity: 'rare' },     // near-dissolved, ghostly remnants
    { id: 'dissolved',  weight: 5,  amt: 0.88, rarity: 'rare' }
  ],
  segments: [
    // common
    { id: 'minimal',      weight: 22, c: [2, 3],   rarity: 'common' },   // ultra-sparse, 1-2 elements only
    { id: 'sparse',       weight: 28, c: [4, 6],   rarity: 'common' },
    { id: 'dense',        weight: 32, c: [7, 11],  rarity: 'common' },
    // uncommon
    { id: 'swarm',        weight: 22, c: [12, 18], rarity: 'uncommon' },
    { id: 'pulse',        weight: 16, c: [8, 14],  rarity: 'uncommon' }, // mid-density, slightly randomised range
    // rare
    { id: 'hive',         weight: 12, c: [19, 28], rarity: 'rare' },
    { id: 'void_cluster', weight: 8,  c: [3, 4],   rarity: 'rare' },
    { id: 'scatter',      weight: 6,  c: [5, 8],   rarity: 'rare' },
    { id: 'dense_hive',   weight: 6,  c: [28, 40], rarity: 'rare' },   // maximum density
    { id: 'ultra',        weight: 5,  c: [40, 60], rarity: 'rare' }    // extreme — near-filled
  ],
  field: [
    // common
    { id: 'clean_black',   weight: 28, noise: 0.04, scan: 0.05, rarity: 'common' },
    { id: 'crt_scan',      weight: 32, noise: 0.06, scan: 0.14, rarity: 'common' },
    { id: 'grain',         weight: 22, noise: 0.10, scan: 0.04, rarity: 'common' },  // film-grain texture, low scan
    // uncommon
    { id: 'heavy_static',  weight: 20, noise: 0.14, scan: 0.10, rarity: 'uncommon' },
    { id: 'interference',  weight: 16, noise: 0.08, scan: 0.22, rarity: 'uncommon' }, // signal interference: mod scan lines
    // rare
    { id: 'bitstorm',      weight: 14, noise: 0.24, scan: 0.18, rarity: 'rare' },
    { id: 'burned_signal', weight: 8,  noise: 0.01, scan: 0.32, rarity: 'rare' },
    { id: 'phosphor_burn', weight: 6,  noise: 0.38, scan: 0.02, rarity: 'rare' },
    { id: 'void_static',   weight: 6,  noise: 0.30, scan: 0.28, rarity: 'rare' },   // both noise and scan at max
    { id: 'overexposed',   weight: 5,  noise: 0.02, scan: 0.48, rarity: 'rare' }    // near-white scanlines dominate
  ],
  glitch: [
    // common
    { id: 'none',          weight: 38, shift: 0.0, layers: 1, rarity: 'common' },
    { id: 'flicker',       weight: 20, shift: 0.2, layers: 1, rarity: 'common' },  // very slight channel bleed
    // uncommon
    { id: 'channel_slip',  weight: 28, shift: 0.5, layers: 1, rarity: 'uncommon' },
    { id: 'datamosh',      weight: 18, shift: 1.0, layers: 1, rarity: 'uncommon' },
    { id: 'pixel_shift',   weight: 16, shift: 0.7, layers: 2, rarity: 'uncommon' }, // two-layer offset, tighter than datamosh
    // rare
    { id: 'tear',          weight: 10, shift: 1.8, layers: 1, rarity: 'rare' },
    { id: 'hard_tear',     weight: 6,  shift: 2.8, layers: 1, rarity: 'rare' },
    { id: 'cascade',       weight: 5,  shift: 1.2, layers: 3, rarity: 'rare' },
    { id: 'strobe',        weight: 6,  shift: 2.2, layers: 2, rarity: 'rare' },    // two layers, extreme offset
    { id: 'corrupt_feed',  weight: 5,  shift: 1.5, layers: 4, rarity: 'rare' }    // four layers — maximum signal corruption
  ],
  symmetry: [
    // common
    { id: 'asymmetric',      weight: 40, reps: 1, mirror: false, rarity: 'common' },
    { id: 'mirror',          weight: 26, reps: 2, mirror: true,  rarity: 'common' },
    { id: 'radial_2',        weight: 20, reps: 2, mirror: false, rarity: 'common' }, // simple 180° rotation
    // uncommon
    { id: 'radial_3',        weight: 18, reps: 3, mirror: false, rarity: 'uncommon' },
    { id: 'mirror_4',        weight: 14, reps: 4, mirror: true,  rarity: 'uncommon' }, // 4-fold mirror symmetry
    // rare
    { id: 'radial_4',        weight: 10, reps: 4, mirror: false, rarity: 'rare' },
    { id: 'radial_6',        weight: 6,  reps: 6, mirror: false, rarity: 'rare' },
    { id: 'mirror_radial',   weight: 5,  reps: 3, mirror: true,  rarity: 'rare' },
    { id: 'radial_8',        weight: 6,  reps: 8, mirror: false, rarity: 'rare' },    // densest rotational
    { id: 'mirror_radial_4', weight: 4,  reps: 4, mirror: true,  rarity: 'rare' }    // 4-fold mirror + rotation — most complex
  ]
};

// ---------- rarity tier aware pick ----------
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

// ---------- helpers ----------
function hexA(hex, a) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16), g = parseInt(h.substring(2, 4), 16), b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

// ---------- field overlay ----------
// Perf-critical: this used to emit ~80 noise <rect>s + 120 scanline <rect>s per
// glyph (~200 DOM nodes), which multiplied across a large grid caused serious
// Generate lag and choppy SMIL playback. Now: scanlines are ONE rect filled with
// a <pattern>, and noise dots are batched into 3 opacity-bucketed <path>s.
// Same seeded rng consumption order, visually near-identical, ~5 nodes total.
function fieldOverlay(rng, field, invert, index) {
  const W = 600, dotColor = invert ? '#000000' : '#ffffff';
  const dots = Math.floor(W * W * field.noise * 0.0009);
  // bucket dots by opacity: low (0.11), mid (0.25), high (0.39)
  const buckets = ['', '', ''];
  for (let i = 0; i < dots; i++) {
    const x = Math.round(rng() * W), y = Math.round(rng() * W);
    const o = rng() * 0.45;
    const b = o < 0.15 ? 0 : o < 0.3 ? 1 : 2;
    buckets[b] += `M${x} ${y}h1.6v1.6h-1.6z`;
  }
  let out = '';
  const opac = [0.11, 0.25, 0.39];
  for (let b = 0; b < 3; b++) {
    if (buckets[b]) out += `<path d="${buckets[b]}" fill="${dotColor}" opacity="${opac[b]}"/>`;
  }
  // scanlines: one pattern + one rect instead of 120 rects
  const scanOp = (field.scan * 0.5).toFixed(3);
  out += `<pattern id="scan${index}" width="6" height="5" patternUnits="userSpaceOnUse">`
       + `<rect width="6" height="1.1" fill="${dotColor}" opacity="${scanOp}"/></pattern>`
       + `<rect width="${W}" height="${W}" fill="url(#scan${index})"/>`;
  return out;
}

// ---------- core glyph form ----------
// animOpts: { animate, rng } — when animate=true, wraps shapes in inscription-safe
// SMIL motion. Timing seeded off animOpts.rng (separate stream) so toggling never
// shifts trait picks. When animate is false, output is byte-identical to static.
function glyphForm(rng, core, ink, R, segN, frac, animOpts) {
  const cx = 300, cy = 300, sw = 2.5;
  const open = `<g stroke="currentColor" stroke-width="${sw}" fill="none" stroke-linecap="square">`;
  let d = '';
  // Cap the drop probability: ghost (0.78) and dissolved (0.88) fractures
  // pushed frac*1.4 above 1.0, which dropped EVERY segment and produced
  // completely empty glyphs. 0.8 max keeps them heavily broken but never blank.
  const gapP = Math.min(0.8, frac * 1.4);
  let gapEnabled = true;
  const gap = () => gapEnabled && frac > 0 && rng() < gapP;
  const k = core.k;

  // animation helpers — only active when animOpts.animate is true
  const doAnim = !!(animOpts && animOpts.animate);
  const ar = animOpts && animOpts.rng;
  const f2 = n => Number(n).toFixed(2);
  const rnd = (lo, hi) => lo + ((ar ? ar() : 0.5) * (hi - lo));

  // per-core SMIL: each form gets motion that suits its geometry
  // rotation for radial forms, pulse for rings, jitter for structured forms
  let wrapOpen = '', wrapClose = '';
  if (doAnim) {
    const k2 = core.k;
    if (k2 === 'ring' || k2 === 'triskel' || k2 === 'spiral_lock' || k2 === 'orbit') {
      // slow rotation — suits circular/arc forms
      const dur = f2(rnd(8, 18));
      const dir = ar() > 0.5 ? '360' : '-360';
      wrapOpen  = `<g><animateTransform attributeName="transform" type="rotate" from="0 300 300" to="${dir} 300 300" dur="${dur}s" repeatCount="indefinite"/>`;
      wrapClose = `</g>`;
    } else if (k2 === 'singularity' || k2 === 'arc_burst') {
      // slow pulse opacity — singularity breathes, burst flickers
      const dur = f2(rnd(2.5, 4.5)), phase = f2(rnd(0, 2));
      wrapOpen  = `<g opacity="1"><animate attributeName="opacity" values="0.6;1;0.6" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      wrapClose = `</g>`;
    } else if (k2 === 'hex_grid' || k2 === 'shattered_grid') {
      // signal dropout — holds bright, briefly cuts to near-black
      const dur = f2(rnd(2, 3.5)), phase = f2(rnd(0, 2));
      wrapOpen  = `<g opacity="1"><animate attributeName="opacity" values="1;1;0.15;1" keyTimes="0;0.7;0.76;0.82" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      wrapClose = `</g>`;
    } else if (k2 === 'cross' || k2 === 'bars' || k2 === 'stacked_bars') {
      // horizontal jitter — reads as signal interference on structured forms
      const dur = f2(rnd(2.5, 4.5)), phase = f2(rnd(0, 2));
      wrapOpen  = `<g><animateTransform attributeName="transform" type="translate" additive="sum" values="0 0;0 0;4 0;-3 0;1 0;0 0" keyTimes="0;0.6;0.63;0.66;0.69;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/>`;
      wrapClose = `</g>`;
    } else if (k2 === 'diamond_pulse' || k2 === 'nested_frame' || k2 === 'frame') {
      // slow scale pulse around the glyph center. SMIL scale is about the
      // origin, so: translate to center, animate scale, counter-translate back.
      // Without the counter-translate the whole glyph gets shoved to (600,600).
      const dur = f2(rnd(3, 5.5)), phase = f2(rnd(0, 2));
      wrapOpen  = `<g transform="translate(300,300)"><animateTransform attributeName="transform" type="scale" additive="sum" values="1;1.1;1" dur="${dur}s" begin="-${phase}s" repeatCount="indefinite"/><g transform="translate(-300,-300)">`;
      wrapClose = `</g></g>`;
    } else {
      // fallback: slow rotation for anything else
      const dur = f2(rnd(10, 22));
      wrapOpen  = `<g><animateTransform attributeName="transform" type="rotate" from="0 300 300" to="360 300 300" dur="${dur}s" repeatCount="indefinite"/>`;
      wrapClose = `</g>`;
    }
  }

  // Two-attempt draw: if fracture drops every segment (possible on cores with
  // nested gap() checks), retry once with gaps disabled — no glyph is ever blank.
  for (let attempt = 0; attempt < 2 && d === ''; attempt++) {
  gapEnabled = attempt === 0;

  if (k === 'ring' || k === 'triskel' || k === 'singularity') {
    const steps = k === 'triskel' ? 3 : Math.max(segN, 8);
    const span  = k === 'triskel' ? 1.2 : 0.78;
    for (let i = 0; i < steps; i++) {
      if (gap()) continue;
      const base = k === 'singularity' ? rng() * Math.PI * 2 : (Math.PI * 2 / steps) * i;
      const a0 = base + (rng() - 0.5) * frac * 0.6;
      const a1 = a0 + (Math.PI * 2 / steps) * span * (k === 'singularity' ? (0.4 + rng()) : 1);
      const rr = k === 'singularity' ? R * (0.2 + (i / steps) * 0.9) : R * (1 + (rng() - 0.5) * frac * 0.5);
      const x0 = cx + Math.cos(a0) * rr, y0 = cy + Math.sin(a0) * rr;
      const x1 = cx + Math.cos(a1) * rr, y1 = cy + Math.sin(a1) * rr;
      d += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 ${(a1-a0)>Math.PI?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
    }
    if (k === 'singularity') d += `<circle cx="${cx}" cy="${cy}" r="${(R*0.08).toFixed(1)}" fill="currentColor" stroke="none"/>`;

  } else if (k === 'cross') {
    [[0,-1],[0,1],[-1,0],[1,0]].forEach(([dx,dy]) => {
      if (gap()) return;
      const jx = (rng()-0.5)*frac*R*0.6, jy = (rng()-0.5)*frac*R*0.6;
      d += `<path d="M${(cx+dx*R*0.2+jx).toFixed(1)} ${(cy+dy*R*0.2+jy).toFixed(1)} L${(cx+dx*R*1.05+jx).toFixed(1)} ${(cy+dy*R*1.05+jy).toFixed(1)}"/>`;
    });
    d += `<rect x="${(cx-R*0.34).toFixed(1)}" y="${(cy-R*0.34).toFixed(1)}" width="${(R*0.68).toFixed(1)}" height="${(R*0.68).toFixed(1)}"/>`;

  } else if (k === 'bars') {
    const n = Math.max(4, Math.floor(segN * 0.7));
    for (let i = 0; i < n; i++) {
      if (gap()) continue;
      const y = cy - R + (R*2/n)*i, w = R*(0.4+rng()*1.2), x = cx-w/2+(rng()-0.5)*frac*R;
      d += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${(R*0.08).toFixed(1)}" fill="currentColor" stroke="none"/>`;
    }

  } else if (k === 'frame') {
    for (let i = 0; i < 4; i++) {
      if (i > 0 && gap()) continue;
      const s = R*(1-i*0.26), ox = (rng()-0.5)*frac*R*0.8, oy = (rng()-0.5)*frac*R*0.8;
      d += `<rect x="${(cx-s+ox).toFixed(1)}" y="${(cy-s+oy).toFixed(1)}" width="${(s*2).toFixed(1)}" height="${(s*2).toFixed(1)}"/>`;
    }

  } else if (k === 'spiral_lock') {
    // Concentric arcs stepping inward by a fixed amount, each rotated slightly
    // — looks like a mechanical lock or winding tape reel.
    const rings = Math.max(3, Math.round(4 + segN * 0.2));
    for (let i = 0; i < rings; i++) {
      if (gap()) continue;
      const rr = R * (1 - i * 0.22);
      if (rr < R * 0.1) break;
      const startA = (Math.PI * 2 / rings) * i + (rng()-0.5)*frac*0.5;
      const sweep  = Math.PI * (1.4 + rng() * 0.4) * (1 - frac * 0.4);
      const x0 = cx + Math.cos(startA) * rr, y0 = cy + Math.sin(startA) * rr;
      const x1 = cx + Math.cos(startA + sweep) * rr, y1 = cy + Math.sin(startA + sweep) * rr;
      d += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 ${sweep>Math.PI?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
    }

  } else if (k === 'diamond_pulse') {
    // Nested rotated squares (diamonds), each slightly displaced by fracture.
    const count = Math.max(3, Math.round(3 + segN * 0.15));
    for (let i = 0; i < count; i++) {
      if (i > 0 && gap()) continue;
      const s = R * (1 - i * 0.24);
      if (s < R * 0.12) break;
      const ox = (rng()-0.5)*frac*R*0.6, oy = (rng()-0.5)*frac*R*0.6;
      // rotated square: 4 corners at 45°
      const pts = [0,1,2,3].map(c => {
        const a = Math.PI/4 + c * Math.PI/2;
        return `${(cx + Math.cos(a)*s + ox).toFixed(1)},${(cy + Math.sin(a)*s + oy).toFixed(1)}`;
      });
      d += `<polygon points="${pts.join(' ')}" fill="none"/>`;
    }

  } else if (k === 'hex_grid') {
    // Hexagonal cell pattern — machine/circuit board topology.
    const hexR = R * (0.28 + rng() * 0.12);
    const cols = 4, rows = 4;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (gap()) continue;
        const hx = cx - R*0.7 + col * hexR * 1.8 + (row % 2) * hexR * 0.9 + (rng()-0.5)*frac*12;
        const hy = cy - R*0.7 + row * hexR * 1.55 + (rng()-0.5)*frac*12;
        const pts = Array.from({length:6},(_,i) => {
          const a = Math.PI/6 + i * Math.PI/3;
          return `${(hx+Math.cos(a)*hexR).toFixed(1)},${(hy+Math.sin(a)*hexR).toFixed(1)}`;
        });
        d += `<polygon points="${pts.join(' ')}" fill="none"/>`;
      }
    }

  } else if (k === 'orbit') {
    // Off-center rings at varying radii — planetary/orbital feel.
    const count = Math.max(3, Math.round(3 + segN * 0.2));
    for (let i = 0; i < count; i++) {
      if (gap()) continue;
      const rr = R * (0.2 + (i / count) * 0.85);
      const ox = (rng()-0.5) * R * 0.35 + (rng()-0.5)*frac*R*0.3;
      const oy = (rng()-0.5) * R * 0.35 + (rng()-0.5)*frac*R*0.3;
      // partial arc: randomly skip a segment
      const skipA = rng() * Math.PI * 2, skipLen = Math.PI * (0.1 + rng()*0.5) * (1 + frac);
      const a0 = skipA + skipLen, sweep = Math.PI * 2 - skipLen;
      const x0 = cx+ox + Math.cos(a0)*rr, y0 = cy+oy + Math.sin(a0)*rr;
      const x1 = cx+ox + Math.cos(a0+sweep)*rr, y1 = cy+oy + Math.sin(a0+sweep)*rr;
      d += `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A${rr.toFixed(1)} ${rr.toFixed(1)} 0 ${sweep>Math.PI?1:0} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}"/>`;
    }

  } else if (k === 'arc_burst') {
    const spokeCount = Math.max(5, Math.round(6 + segN * 0.3));
    for (let i = 0; i < spokeCount; i++) {
      if (gap()) continue;
      const angle = (Math.PI*2/spokeCount)*i + (rng()-0.5)*frac*0.8;
      const len = R*(0.5+rng()*0.6);
      const x1 = cx+Math.cos(angle)*R*0.15, y1 = cy+Math.sin(angle)*R*0.15;
      const x2 = cx+Math.cos(angle)*len,    y2 = cy+Math.sin(angle)*len;
      d += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      if (i%2===0 && !gap()) {
        const capR = R*(0.08+rng()*0.10);
        d += `<circle cx="${x2.toFixed(1)}" cy="${y2.toFixed(1)}" r="${capR.toFixed(1)}" stroke-width="${sw*0.6}" fill="none"/>`;
      }
    }
    if (!gap()) d += `<circle cx="${cx}" cy="${cy}" r="${(R*0.18).toFixed(1)}" fill="none"/>`;

  } else if (k === 'shattered_grid') {
    const cols = 5, rows = 5;
    for (let r = 0; r <= rows; r++) {
      if (gap()) continue;
      const y = cy-R+(R*2/rows)*r+(rng()-0.5)*frac*24;
      let x = cx-R;
      while (x < cx+R) {
        const segW = R*(0.2+rng()*0.4);
        if (!gap()) d += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${Math.min(x+segW,cx+R).toFixed(1)}" y2="${(y+(rng()-0.5)*frac*14).toFixed(1)}"/>`;
        x += segW + R*0.08;
      }
    }
    for (let c = 0; c <= cols; c++) {
      if (gap()) continue;
      const x = cx-R+(R*2/cols)*c+(rng()-0.5)*frac*24;
      let y = cy-R;
      while (y < cy+R) {
        const segH = R*(0.2+rng()*0.4);
        if (!gap()) d += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x+(rng()-0.5)*frac*14).toFixed(1)}" y2="${Math.min(y+segH,cy+R).toFixed(1)}"/>`;
        y += segH + R*0.08;
      }
    }
  }

  // Near-empty guard: cores with an ungappable center element (split_cross's
  // rect, singularity's dot) dodge the d==='' check while fracture strips all
  // else, leaving 1-2 shape skeletons. Under 3 shapes → clear d, loop reruns
  // ungapped.
  if (attempt === 0) {
    const n = (d.match(/<(path|line|rect|circle|polygon)[ \/]/g) || []).length;
    if (n < 3) d = '';
  }
  } // end two-attempt draw loop

  // scattered bit-marks (shared across all cores)
  let bits = '';
  const bn = Math.floor(segN * 0.6);
  for (let i = 0; i < bn; i++) {
    if (rng() > 0.6) continue;
    const a = rng()*Math.PI*2, dist = R*(0.4+rng()*1.3);
    const x = cx+Math.cos(a)*dist, y = cy+Math.sin(a)*dist;
    const s = R*(0.012+rng()*0.025);
    bits += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${s.toFixed(1)}" height="${(s*(rng()<0.5?1:0.4)).toFixed(1)}" fill="currentColor" stroke="none" opacity="${(0.4+rng()*0.5).toFixed(2)}"/>`;
  }

  return wrapOpen + open + d + `</g>` + bits + wrapClose;
}

// ---------- symmetry wrapper ----------
function composedGlyph(rng, traits, ink, R, segN, frac, animOpts) {
  const sym = traits.symmetry;
  const cx = 300, cy = 300;
  let out = '';
  for (let rep = 0; rep < sym.reps; rep++) {
    const angle = (360 / sym.reps) * rep;
    const rotTransform = rep === 0 ? '' : `rotate(${angle} ${cx} ${cy})`;
    const form = glyphForm(rng, traits.core, ink, R, segN, frac, animOpts);
    out += `<g${rotTransform ? ` transform="${rotTransform}"` : ''}>${form}</g>`;
    if (sym.mirror) {
      const mt = `translate(${cx*2},0) scale(-1,1)${rotTransform ? ` rotate(${angle} ${cx} ${cy})` : ''}`;
      out += `<g transform="${mt}">${form}</g>`;
    }
  }
  return out;
}

// ---------- 1/1 exclusions ----------
const ONE_OF_ONE_EXCLUDED_PALETTES = []; // all palettes are dark-bg, all eligible for 1/1s

// ---------- 1/1-only combos ----------
// These core × symmetry pairings compose into emblem-grade pieces (concentric
// targets, structured emblems, starbursts). They are the visual signature of
// the 1/1s: ONLY 1/1 pieces may carry them. Everywhere else — including
// rare-tier generation — the symmetry rerolls to asymmetric.
const RARE_ONLY_COMBOS = [
  { core: 'spiral_lock',  symmetry: ['mirror', 'mirror_4', 'mirror_radial', 'mirror_radial_4', 'radial_2', 'radial_3', 'radial_4', 'radial_6', 'radial_8'] },
  { core: 'stacked_bars', symmetry: ['mirror_4', 'mirror_radial', 'mirror_radial_4', 'radial_4', 'radial_6', 'radial_8'] },
  { core: 'split_cross',  symmetry: ['radial_3', 'radial_4', 'radial_6', 'radial_8', 'mirror_radial', 'mirror_radial_4'] }
];

// Returns the symmetry to use: the picked one if this is a 1/1, else the
// asymmetric fallback when the pairing is gated.
function enforceRareOnlyCombos(core, symmetry, isOneOfOne) {
  if (isOneOfOne) return symmetry;
  const rule = RARE_ONLY_COMBOS.find(r => r.core === core.id);
  if (rule && rule.symmetry.includes(symmetry.id)) {
    return TRAITS.symmetry.find(s => s.id === 'asymmetric');
  }
  return symmetry;
}

// 1/1 pieces roll a seeded 25% chance to draw one of the gated combos
// directly — that's what makes these compositions actually present among
// the 1/1s rather than merely absent everywhere.
function maybeRareCombo(rng, isOneOfOne) {
  if (!isOneOfOne || rng() >= 0.25) return null;
  const rule = RARE_ONLY_COMBOS[Math.floor(rng() * RARE_ONLY_COMBOS.length)];
  const core = TRAITS.core.find(c => c.id === rule.core);
  const symId = rule.symmetry[Math.floor(rng() * rule.symmetry.length)];
  const symmetry = TRAITS.symmetry.find(s => s.id === symId);
  return (core && symmetry) ? { core, symmetry } : null;
}

// ---------- color helper ----------
function shadeColor(hex, percent) {
  const num = parseInt(hex.replace('#',''), 16);
  let r=(num>>16)&0xff, g=(num>>8)&0xff, b=num&0xff;
  const t=percent<0?0:255, p=Math.abs(percent)/100;
  r=Math.round((t-r)*p)+r; g=Math.round((t-g)*p)+g; b=Math.round((t-b)*p)+b;
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
}

// ---------- shared renderer ----------
// opts: { animate: boolean } — when true, adds inscription-safe SMIL to the glyph.
// Animation uses a SEPARATE seeded stream (seed*70001+index*9973+1) so toggling
// never changes which traits are picked — the art is identical, only motion added.
function renderGlyphSVG(picks, index, seed, opts) {
  const { palette, core, fracture, segments, field, glitch, symmetry } = picks;
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const ink = palette.ink, glow = palette.glow, bg = palette.bg;
  const R = 132;
  let segN = Math.floor(rng() * (segments.c[1] - segments.c[0] + 1)) + segments.c[0];
  // Complexity budget: symmetry repetition multiplies every element, so a dense
  // segment count × 8 symmetry copies × halo × slip layers exploded to 2000+
  // DOM nodes and choppy animation. High symmetry already fills the canvas with
  // copies, so scale per-copy density down as copies go up — total on-screen
  // density stays roughly constant, element count stays bounded (~72 forms max).
  const symCopies = symmetry.reps * (symmetry.mirror ? 2 : 1);
  segN = Math.min(segN, Math.max(4, Math.ceil(72 / symCopies)));
  const frac = fracture.amt;
  const slip = glitch.shift * 7.2;
  const layers = glitch.layers || 1;
  const animate = !!(opts && opts.animate);

  // independent timing stream — keeps trait selection stable when toggled
  const animRng = animate ? mulberry32((seed ?? 0) * 70001 + index * 9973 + 1) : null;
  const animOpts = animate ? { animate: true, rng: animRng } : null;

  // Geometry is defined ONCE in <defs> and referenced by <use> for the halo
  // and every slip layer. Colors are applied via CSS `color` on the wrappers
  // (the forms draw in currentColor), so recolored fringes cost one node each
  // instead of a full geometry copy. This is what keeps heavy combos (dense
  // grid cores × 8-way symmetry × multi-layer glitch) smooth to animate.
  const staticGlyph = composedGlyph(mulberry32((seed??0)*100003+index+1), {core,symmetry}, ink, R, segN, frac, null);

  let slipLayers = '';
  if (slip > 0) {
    for (let l = 1; l <= layers; l++) {
      const offset = slip * l;
      slipLayers +=
        `<g color="#ff2b6d" transform="translate(${(-offset).toFixed(1)},0)" opacity="${(0.28/l).toFixed(2)}"><use href="#fg${index}"/></g>` +
        `<g color="#2bd4ff" transform="translate(${offset.toFixed(1)},0)" opacity="${(0.28/l).toFixed(2)}"><use href="#fg${index}"/></g>`;
    }
  }

  // main layer: animated pieces need inline markup (SMIL lives on the shapes);
  // static pieces just reference the def like everything else
  const mainLayer = animate
    ? `<g color="${ink}">${composedGlyph(mulberry32((seed??0)*100003+index+1), {core,symmetry}, ink, R, segN, frac, animOpts)}</g>`
    : `<g color="${ink}"><use href="#fg${index}"/></g>`;

  const vignette = palette.invert ? '' :
    `<radialGradient id="vig${index}" cx="50%" cy="50%" r="62%"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.82"/></radialGradient><rect width="600" height="600" fill="url(#vig${index})"/>`;

  return `<svg width="600" height="600" viewBox="0 0 600 600" xmlns="http://www.w3.org/2000/svg">
<defs>
<g id="fg${index}">${staticGlyph}</g>
<filter id="halo${index}" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="14"/></filter>
<radialGradient id="emit${index}" cx="50%" cy="50%" r="36%"><stop offset="0%" stop-color="${hexA(glow,0.08)}"/><stop offset="100%" stop-color="${hexA(glow,0)}"/></radialGradient>
</defs>
<rect width="600" height="600" fill="${bg}"/>
${fieldOverlay(rng, field, palette.invert, index)}
<rect width="600" height="600" fill="url(#emit${index})"/>
<g color="${ink}" filter="url(#halo${index})" opacity="0.35"><use href="#fg${index}"/></g>
${slipLayers}
${mainLayer}
${vignette}
</svg>`;
}

// ---------- main composer ----------
function generatePiece(index, seed, tier, opts) {
  const rng = mulberry32((seed ?? 0) * 100003 + index);
  const t = tier || 'any';
  const palette  = pickByRarity(rng, TRAITS.palette, t);
  const core     = pickByRarity(rng, TRAITS.core, t);
  const fracture = pickByRarity(rng, TRAITS.fracture, t);
  const segments = pickByRarity(rng, TRAITS.segments, t);
  const field    = pickByRarity(rng, TRAITS.field, t);
  const glitch   = pickByRarity(rng, TRAITS.glitch, t);
  let symmetry = pickByRarity(rng, TRAITS.symmetry, t);
  const isOneOfOne = !!(opts && opts.isOneOfOne);
  symmetry = enforceRareOnlyCombos(core, symmetry, isOneOfOne);
  const rc = maybeRareCombo(rng, isOneOfOne);
  const finalCore = rc ? rc.core : core;
  if (rc) symmetry = rc.symmetry;
  const picks = { palette, core: finalCore, fracture, segments, field, glitch, symmetry };
  const animate = !!(opts && opts.animate);
  const svgStatic = renderGlyphSVG(picks, index, seed, null);
  const svg = animate ? renderGlyphSVG(picks, index, seed, { animate: true }) : svgStatic;
  return {
    index, svg, svgStatic, tier: t,
    traits: { palette:palette.id, core:finalCore.id, fracture:fracture.id, segments:segments.id, field:field.id, glitch:glitch.id, symmetry:symmetry.id },
    rarity: { palette:palette.rarity, core:finalCore.rarity, fracture:fracture.rarity, segments:segments.rarity, field:field.rarity, glitch:glitch.rarity, symmetry:symmetry.rarity }
  };
}

function generateBatch(count, seed, tier, opts) {
  const out = [];
  for (let i = 1; i <= count; i++) out.push(generatePiece(i, seed, tier, opts));
  return out;
}

// ---------- export ----------
const api = {
  generatePiece, generateBatch, TRAITS,
  mulberry32, weightedPick, pickByRarity, TIER_FALLBACK,
  hexA, fieldOverlay, glyphForm, composedGlyph, renderGlyphSVG,
  ONE_OF_ONE_EXCLUDED_PALETTES, shadeColor,
  RARE_ONLY_COMBOS, enforceRareOnlyCombos, maybeRareCombo
};
if (typeof module !== 'undefined' && module.exports) {
  module.exports = api;
} else if (typeof window !== 'undefined') {
  window.GlyphGen = api;
}
