/* ==========================================================================
   INK PUPS — generator.js  (v2 "Scrawl")
   Crude, thin, wobbly single-weight linework dog heads (head only, no body),
   glowing coloured eyes, textured environmental backgrounds.
   Rarity tiers, curated 1/1 pickers + 1/1-exclusive values, shared-batch dedup.
   Exposes window.InkPupsGen (browser) and module.exports (node / build.js).
   ========================================================================== */
(function (root) {
  'use strict';

  const VERSION = '2.3.0';
  const WIDTH = 480;
  const HEIGHT = 480;
  const SIZE = WIDTH; // legacy alias
  const HX = 240;     // head centre
  const HY = 246;
  const HEAD_SCALE = 1.5; // head-only composition: art scaled up, strokes stay thin
  const LW = 2.3;     // main line weight

  /* ---------------------------------------------------------------- RNG */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashSeed() {
    let h = 2166136261;
    for (let a = 0; a < arguments.length; a++) {
      const s = String(arguments[a]);
      for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
      h ^= 0x9e37; h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const jit = (rng, amt) => (rng() - 0.5) * 2 * amt;

  /* ------------------------------------------------------------- TRAITS */
  const TRAITS = {
    background: [
      { id: 'paper',  name: 'Paper',  hex: '#f3f3f1', rarity: 'common',   weight: 30 },
      { id: 'void',   name: 'Void',   hex: '#050505', rarity: 'common',   weight: 24 },
      { id: 'fog',    name: 'Fog',    hex: '#8c8c8c', rarity: 'uncommon', weight: 14 },
      { id: 'smoke',  name: 'Smoke',  hex: '#151515', rarity: 'uncommon', weight: 14 },
      { id: 'hatch',  name: 'Hatch',  hex: '#161616', rarity: 'rare',     weight: 9 },
      { id: 'static', name: 'Static', hex: '#eeeeec', rarity: 'rare',     weight: 9 }
    ],
    headShape: [
      { id: 'round',   name: 'Round',   rarity: 'common',   weight: 32 },
      { id: 'long',    name: 'Long',    rarity: 'common',   weight: 28 },
      { id: 'square',  name: 'Square',  rarity: 'uncommon', weight: 22 },
      { id: 'pointed', name: 'Pointed', rarity: 'uncommon', weight: 18 }
    ],
    fur: [
      { id: 'smooth', name: 'Smooth', rarity: 'common',   weight: 45 },
      { id: 'spiky',  name: 'Spiky',  rarity: 'uncommon', weight: 22 },
      { id: 'tuft',   name: 'Tuft',   rarity: 'uncommon', weight: 18 },
      { id: 'shaggy', name: 'Shaggy', rarity: 'rare',     weight: 15 }
    ],
    ears: [
      { id: 'floppy_long',  name: 'Floppy long',  rarity: 'common',   weight: 26 },
      { id: 'perky',        name: 'Perky',        rarity: 'common',   weight: 18 },
      { id: 'floppy_short', name: 'Floppy short', rarity: 'common',   weight: 22 },
      { id: 'folded',       name: 'Folded',       rarity: 'uncommon', weight: 16 },
      { id: 'rose',         name: 'Rose',         rarity: 'uncommon', weight: 12 }
    ],
    earTone: [
      { id: 'hollow',  name: 'Hollow',  rarity: 'common',   weight: 45 },
      { id: 'solid',   name: 'Solid',   rarity: 'common',   weight: 35 },
      { id: 'hatched', name: 'Hatched', rarity: 'uncommon', weight: 20 }
    ],
    coat: [
      { id: 'plain',       name: 'Plain',       rarity: 'common',   weight: 30 },
      { id: 'spots',       name: 'Spots',       rarity: 'common',   weight: 18 },
      { id: 'freckles',    name: 'Freckles',    rarity: 'common',   weight: 16 },
      { id: 'eye_patch',   name: 'Eye patch',   rarity: 'uncommon', weight: 12 },
      { id: 'hatch_shade', name: 'Hatch shade', rarity: 'uncommon', weight: 12 },
      { id: 'blaze',       name: 'Blaze',       rarity: 'uncommon', weight: 10 },
      { id: 'solid_face',  name: 'Solid face',  rarity: 'rare',     weight: 6 }
    ],
    eyeColor: [
      { id: 'ink',    name: 'Ink',    hex: null,      rarity: 'common',   weight: 28 },
      { id: 'red',    name: 'Red',    hex: '#ff3b3b', rarity: 'common',   weight: 16 },
      { id: 'blue',   name: 'Blue',   hex: '#6f7dff', rarity: 'common',   weight: 16 },
      { id: 'green',  name: 'Green',  hex: '#39ff6a', rarity: 'uncommon', weight: 12 },
      { id: 'orange', name: 'Orange', hex: '#ffa12b', rarity: 'uncommon', weight: 12 },
      { id: 'violet', name: 'Violet', hex: '#b36bff', rarity: 'rare',     weight: 8 },
      { id: 'white',  name: 'White',  hex: '#f4f4f4', rarity: 'rare',     weight: 8 }
    ],
    eyes: [
      { id: 'ring',      name: 'Ring',      rarity: 'common',   weight: 26 },
      { id: 'dot',       name: 'Dot',       rarity: 'common',   weight: 24 },
      { id: 'spiral',    name: 'Spiral',    rarity: 'uncommon', weight: 14 },
      { id: 'x_mark',    name: 'X mark',    rarity: 'uncommon', weight: 12 },
      { id: 'starburst', name: 'Starburst', rarity: 'uncommon', weight: 12 },
      { id: 'sleepy',    name: 'Sleepy',    rarity: 'uncommon', weight: 8 },
      { id: 'visor',     name: 'Visor',     rarity: 'rare',     weight: 6 }
    ],
    brows: [
      { id: 'none',     name: 'None',     rarity: 'common',   weight: 55 },
      { id: 'worried',  name: 'Worried',  rarity: 'uncommon', weight: 15 },
      { id: 'wrinkles', name: 'Wrinkles', rarity: 'uncommon', weight: 15 },
      { id: 'angry',    name: 'Angry',    rarity: 'rare',     weight: 15 }
    ],
    nose: [
      { id: 'triangle', name: 'Triangle', rarity: 'common',   weight: 40 },
      { id: 'button',   name: 'Button',   rarity: 'common',   weight: 28 },
      { id: 'hollow_o', name: 'Hollow O', rarity: 'uncommon', weight: 18 },
      { id: 'heart',    name: 'Heart',    rarity: 'rare',     weight: 14 }
    ],
    mouth: [
      { id: 'smile',    name: 'Smile',    rarity: 'common',   weight: 30 },
      { id: 'flat',     name: 'Flat',     rarity: 'common',   weight: 16 },
      { id: 'open',     name: 'Open',     rarity: 'uncommon', weight: 14 },
      { id: 'blep',     name: 'Blep',     rarity: 'uncommon', weight: 14 },
      { id: 'stitched', name: 'Stitched', rarity: 'uncommon', weight: 12 },
      { id: 'frown',    name: 'Frown',    rarity: 'uncommon', weight: 8 },
      { id: 'teeth',    name: 'Teeth',    rarity: 'rare',     weight: 8 }
    ],
    muzzle: [
      { id: 'clean',        name: 'Clean',        rarity: 'common',   weight: 45 },
      { id: 'whisker_dots', name: 'Whisker dots', rarity: 'common',   weight: 25 },
      { id: 'jowls',        name: 'Jowls',        rarity: 'uncommon', weight: 20 },
      { id: 'snout_line',   name: 'Snout line',   rarity: 'rare',     weight: 10 }
    ]
  };

  const CATEGORY_ORDER = ['background', 'headShape', 'fur', 'ears', 'earTone',
    'coat', 'eyeColor', 'eyes', 'brows', 'nose', 'mouth', 'muzzle'];

  const CATEGORY_META = {
    background: 'Background', headShape: 'Head', fur: 'Fur',
    ears: 'Ears', earTone: 'Ear tone', coat: 'Coat', eyeColor: 'Eye color', eyes: 'Eyes',
    brows: 'Brows', nose: 'Nose', mouth: 'Mouth', muzzle: 'Muzzle'
  };

  /* 1/1-exclusive values — never in regular pools, only via the 1/1 pickers */
  const ONE_OF_ONE_EXCLUSIVES = {
    background: [
      { id: 'eth_blue',    name: 'ETH Blue',    hex: '#627EEA', rarity: 'rare', exclusive: true },
      { id: 'red',         name: 'Red',         hex: '#FF3B3B', rarity: 'rare', exclusive: true },
      { id: 'rich_lime',   name: 'Rich Lime',   hex: '#C6EE4D', rarity: 'rare', exclusive: true },
      { id: 'punchy_blue', name: 'Punchy Blue', hex: '#3A2BE8', rarity: 'rare', exclusive: true }
    ],
    eyeColor: [
      { id: 'gold', name: 'Gold', hex: '#ffd23f', rarity: 'rare', exclusive: true }
    ],
    eyes: [
      { id: 'hearts', name: 'Hearts', rarity: 'rare', exclusive: true }
    ]
  };

  /* Curated, flattened 1/1 pickers for EVERY category (prevents rare-tier collapse). */
  const ONE_OF_ONE_PICKERS = {
    background: ['eth_blue', 'red', 'rich_lime', 'punchy_blue', 'hatch', 'static', 'void', 'fog'],
    headShape:  ['round', 'long', 'square', 'pointed'],
    fur:        ['smooth', 'spiky', 'tuft', 'shaggy'],
    ears:       ['floppy_long', 'floppy_short', 'perky', 'folded', 'rose'],
    earTone:    ['hollow', 'solid', 'hatched'],
    coat:       ['spots', 'eye_patch', 'hatch_shade', 'blaze', 'solid_face', 'plain'],
    eyeColor:   ['red', 'blue', 'green', 'orange', 'violet', 'white', 'gold'],
    eyes:       ['ring', 'spiral', 'x_mark', 'starburst', 'visor', 'hearts'],
    brows:      ['none', 'worried', 'wrinkles', 'angry'],
    nose:       ['triangle', 'button', 'hollow_o', 'heart'],
    mouth:      ['smile', 'open', 'blep', 'stitched', 'frown', 'teeth'],
    muzzle:     ['clean', 'whisker_dots', 'jowls', 'snout_line']
  };

  const TIER_FALLBACK = {
    rare: ['rare', 'uncommon', 'common'],
    uncommon: ['uncommon', 'common'],
    common: ['common']
  };

  function findTrait(cat, id) {
    return TRAITS[cat].find(t => t.id === id) ||
      (ONE_OF_ONE_EXCLUSIVES[cat] || []).find(t => t.id === id) || null;
  }

  function weightedPick(rng, pool) {
    let total = 0;
    for (const t of pool) total += (t.weight == null ? 1 : t.weight);
    let r = rng() * total;
    for (const t of pool) { r -= (t.weight == null ? 1 : t.weight); if (r <= 0) return t; }
    return pool[pool.length - 1];
  }

  function pickByRarity(rng, cat, tier, exclude) {
    let pool = TRAITS[cat].filter(t => !exclude || !exclude.includes(t.id));
    if (tier && tier !== 'all') {
      for (const tr of TIER_FALLBACK[tier]) {
        const sub = pool.filter(t => t.rarity === tr);
        if (sub.length) { pool = sub; break; }
      }
    }
    return weightedPick(rng, pool);
  }

  function pickOneOfOne(rng, cat, exclude) {
    const ids = ONE_OF_ONE_PICKERS[cat].filter(id => !exclude || !exclude.includes(id));
    const pool = ids.map(id => findTrait(cat, id)).filter(Boolean).map(t => ({ t, weight: 1 }));
    return weightedPick(rng, pool).t;
  }

  /* ---------------------------------------------------------- CONTRAST */
  function luma(hex) {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }
  const isDarkBg = (id) => luma(findTrait('background', id).hex) < 110;

  /* ---------------------------------------------- CONSTRAINT REPAIR */
  // visor already covers the eyes, so brows under it are pointless: reroll them to none-ish values
  // locks: { cat: id } or { cat: [id, id, ...] } (multi-select → pick among the allowed set)
  const lockList = (locks, cat) => { const L = locks && locks[cat]; return Array.isArray(L) ? L : (L ? [L] : []); };

  function repair(rng, picks, locks, pickFn) {
    if (picks.eyes === 'visor' && picks.brows === 'wrinkles' && !lockList(locks, 'brows').length) picks.brows = 'none';
    // eye colour must never match (or nearly match) the background colour
    const clash = () => {
      const e = findTrait('eyeColor', picks.eyeColor), g = findTrait('background', picks.background);
      if (!e || !e.hex || !g) return false;
      const p = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
      const [a1, a2] = [p(e.hex), p(g.hex)];
      return Math.hypot(a1[0] - a2[0], a1[1] - a2[1], a1[2] - a2[2]) < 90;
    };
    for (let k = 0; k < 8 && clash(); k++) {
      if (!lockList(locks, 'eyeColor').length) picks.eyeColor = pickFn('eyeColor', [picks.eyeColor]).id;
      else if (!lockList(locks, 'background').length) picks.background = pickFn('background', [picks.background]).id;
      else break;
    }
    return picks;
  }

  /* ------------------------------------------------- PIECE GENERATION */
  function comboKey(traits) { return CATEGORY_ORDER.map(c => traits[c]).join('|'); }

  function rollTraits(seed, opts) {
    const rng = mulberry32(seed);
    const locks = opts.locks || {};
    const oneOfOne = !!opts.oneOfOne;
    const tier = opts.tier || 'all';
    const pickFn = (cat, exclude) => oneOfOne ? pickOneOfOne(rng, cat, exclude) : pickByRarity(rng, cat, tier, exclude);
    const picks = {};
    for (const cat of CATEGORY_ORDER) {
      const allowed = lockList(locks, cat).filter(id => findTrait(cat, id) && (oneOfOne || !isExclusive(cat, id)));
      if (allowed.length === 1) picks[cat] = allowed[0];
      else if (allowed.length > 1) {
        const pool = allowed.map(id => findTrait(cat, id)).map(t => ({ t, weight: oneOfOne ? 1 : (t.weight || 1) }));
        picks[cat] = weightedPick(rng, pool).t.id;
      } else picks[cat] = pickFn(cat).id;
    }
    return repair(rng, picks, locks, pickFn);
  }

  function isExclusive(cat, id) { return !!(ONE_OF_ONE_EXCLUSIVES[cat] || []).find(t => t.id === id); }

  function generateUnique(baseSeed, index, opts, usedCombos, budget) {
    let traits, seed, key;
    for (let attempt = 0; attempt < budget; attempt++) {
      seed = hashSeed(baseSeed, index, attempt, opts.oneOfOne ? '1of1' : 'reg');
      traits = rollTraits(seed, opts);
      key = comboKey(traits);
      if (!usedCombos.has(key)) { usedCombos.add(key); return { seed, traits, duplicate: false }; }
    }
    return { seed, traits, duplicate: true };
  }

  function estimateComboSpace(opts) {
    const locks = opts.locks || {};
    let space = 1;
    for (const cat of CATEGORY_ORDER) {
      const ll = lockList(locks, cat).length;
      if (ll) { space *= ll; continue; }
      let n;
      if (opts.oneOfOne) n = ONE_OF_ONE_PICKERS[cat].length;
      else if (opts.tier && opts.tier !== 'all') {
        let pool = [];
        for (const tr of TIER_FALLBACK[opts.tier]) { pool = TRAITS[cat].filter(t => t.rarity === tr); if (pool.length) break; }
        n = pool.length;
      } else n = TRAITS[cat].length;
      space *= n;
      if (space > 1e12) return Infinity;
    }
    return space;
  }

  // Shared batch core. step() rolls the next piece; generateBatch runs it straight through,
  // generateBatchAsync yields to the browser between chunks so huge supplies don't freeze the page.
  function batchCore(opts) {
    const count = Math.max(1, Math.floor(Number(opts.count) || 1));
    const ones = Math.min(count, Math.max(0, Math.floor(Number(opts.oneOfOnes) || 0)));
    const baseSeed = opts.seed != null ? String(opts.seed) : String(Date.now());
    // 1/1s come first: #1..#N are the 1/1s, regular pieces follow
    const usedCombos = new Set();
    const regSpace = estimateComboSpace({ locks: opts.locks, tier: opts.tier });
    const oneSpace = estimateComboSpace({ locks: opts.locks, oneOfOne: true });
    const budgetFor = (space, need) => Math.min(600, Math.max(40, Number.isFinite(space) && space < need * 4 ? 600 : 60));
    const regBudget = budgetFor(regSpace, count - ones), oneBudget = budgetFor(oneSpace, ones);
    const out = { pieces: new Array(count), dupes: 0, baseSeed,
      warnings: {
        regular: Number.isFinite(regSpace) && regSpace < count - ones ? regSpace : null,
        oneOfOne: Number.isFinite(oneSpace) && oneSpace < ones ? oneSpace : null
      } };
    let i = 0;
    return {
      count, out,
      done: () => i >= count,
      progress: () => i,
      step() {
        const isOne = i < ones;
        const o = { locks: opts.locks, tier: isOne ? 'rare' : opts.tier, oneOfOne: isOne };
        const res = generateUnique(baseSeed, i, o, usedCombos, isOne ? oneBudget : regBudget);
        if (res.duplicate) out.dupes++;
        out.pieces[i] = { index: i + 1, seed: res.seed, isOneOfOne: isOne, traits: res.traits, duplicate: res.duplicate };
        i++;
      }
    };
  }

  function generateBatch(opts) {
    const c = batchCore(opts);
    while (!c.done()) c.step();
    return c.out;
  }

  // onProgress(done, total) is called between chunks; isCancelled() lets a newer run abort this one.
  async function generateBatchAsync(opts, onProgress, isCancelled) {
    const c = batchCore(opts);
    const CHUNK_MS = 30;
    while (!c.done()) {
      const t0 = Date.now();
      while (!c.done() && Date.now() - t0 < CHUNK_MS) c.step();
      if (onProgress) onProgress(c.progress(), c.count);
      if (isCancelled && isCancelled()) return null;
      if (!c.done()) await new Promise(r => setTimeout(r, 0));
    }
    return c.out;
  }

  /* --------------------------------------------------------- GEOMETRY */
  // Crude hand line: subdivide each segment and jitter every vertex, no smoothing.
  function wob(rng, pts, closed, amt, step) {
    amt = amt == null ? 1.2 : amt; step = step || 7;
    let seq = pts;
    if (closed) {
      const a = pts[0], b = pts[1] || pts[0];
      seq = pts.concat([a, [a[0] + (b[0] - a[0]) * 0.18, a[1] + (b[1] - a[1]) * 0.18]]); // slight overshoot
    }
    let d = '';
    for (let i = 0; i < seq.length - 1; i++) {
      const a = seq[i], b = seq[i + 1];
      const n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) {
        const t = k / n;
        d += (d ? 'L' : 'M') + f(a[0] + (b[0] - a[0]) * t + jit(rng, amt)) + ',' + f(a[1] + (b[1] - a[1]) * t + jit(rng, amt));
      }
    }
    const l = seq[seq.length - 1];
    return d + 'L' + f(l[0] + jit(rng, amt * 0.5)) + ',' + f(l[1] + jit(rng, amt * 0.5));
  }
  // main line + faint ghost pass, like a pen going over it twice
  function sketch(rng, pts, closed, ink, o) {
    o = o || {};
    const w = o.w || LW, amt = o.amt == null ? 1.2 : o.amt, step = o.step || 7;
    let s = `<path d="${wob(rng, pts, closed, amt, step)}" fill="${o.fill || 'none'}" stroke="${ink}" stroke-width="${f(w)}" stroke-linecap="round" stroke-linejoin="round"${o.opacity ? ` opacity="${o.opacity}"` : ''}/>`;
    if (o.ghost !== false) {
      s += `<path d="${wob(rng, pts, closed, amt * 1.7, step * 1.3)}" fill="none" stroke="${ink}" stroke-width="${f(w * 0.5)}" stroke-linecap="round" opacity=".4"/>`;
    }
    return s;
  }
  function ellipsePts(rng, cx, cy, rx, ry, n, rj) {
    const pts = [];
    const rot = rng() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      const k = 1 + jit(rng, rj || 0.04);
      pts.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
    }
    return pts;
  }
  const circ = (rng, cx, cy, r, n) => ellipsePts(rng, cx, cy, r, r, n || Math.max(8, Math.round(r * 1.1)), 0.06);
  const closedD = (pts) => 'M' + pts.map(p => f(p[0]) + ',' + f(p[1])).join('L') + 'Z';
  function heartPts(cx, cy, s) {
    const pts = [];
    for (let i = 0; i < 20; i++) {
      const t = (i / 20) * Math.PI * 2;
      const x = 16 * Math.pow(Math.sin(t), 3);
      const y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
      pts.push([cx + x * s / 16, cy + y * s / 16]);
    }
    return pts;
  }

  const HEAD = {
    round:   { rx: 76, ry: 72, eyeY: -8,  noseY: 24 },
    long:    { rx: 64, ry: 86, eyeY: -18, noseY: 30 },
    square:  { rx: 80, ry: 72, eyeY: -12, noseY: 22 },
    pointed: { rx: 80, ry: 72, eyeY: -2,  noseY: 28 }
  };

  function headPts(rng, shape) {
    const P = HEAD[shape];
    const J = (p, a) => [HX + p[0] + jit(rng, a), HY + p[1] + jit(rng, a)];
    switch (shape) {
      case 'round': return ellipsePts(rng, HX, HY, P.rx, P.ry, 22, 0.035);
      case 'long': return ellipsePts(rng, HX, HY, P.rx, P.ry, 22, 0.03).map(p => {
        const dy = (p[1] - HY) / P.ry;
        return dy > 0 ? [HX + (p[0] - HX) * (1 - 0.22 * dy * dy), p[1]] : p;
      });
      case 'square': return [[-78, -70], [80, -74], [83, 68], [-76, 72]].map(p => J(p, 5));
      case 'pointed': return [[0, -100], [80, -38], [76, 70], [-78, 72], [-82, -40]].map(p => J(p, 5));
    }
  }

  /* ------------------------------------------------------------- EARS */
  const EARS = {
    perky:        { front: false, ax: 0.60, ay: 0.72, pts: [[20, 14], [4, -46], [-6, -66], [-16, -50], [-26, 8]] },
    folded:       { front: false, ax: 0.58, ay: 0.74, pts: [[22, 14], [6, -40], [-24, -32], [-32, -10], [-22, 8]] },
    rose:         { front: false, ax: 0.70, ay: 0.72, pts: [[18, 12], [0, -22], [-32, -22], [-46, -2], [-18, 8]] },
    floppy_long:  { front: true,  ax: 0.66, ay: 0.64, pts: [[14, -8], [-20, -12], [-40, 20], [-44, 78], [-30, 104], [-14, 96], [-6, 50], [4, 14]] },
    floppy_short: { front: true,  ax: 0.68, ay: 0.64, pts: [[14, -6], [-20, -10], [-38, 18], [-36, 50], [-20, 60], [-6, 36]] }
  };

  function earPts(rng, earId, P, side) {
    const E = EARS[earId];
    const ax = HX + side * P.rx * E.ax, ay = HY - P.ry * E.ay;
    const sc = 0.9 + rng() * 0.2;
    return E.pts.map(p => [ax + (side === -1 ? p[0] : -p[0]) * sc + jit(rng, 3), ay + p[1] * sc + jit(rng, 3)]);
  }

  function hatchLines(rng, x0, y0, x1, y1, spacing, angleDeg, ink, w, op) {
    const t = Math.tan(angleDeg * Math.PI / 180);
    let s = '';
    const span = (y1 - y0) + Math.abs(t) * (x1 - x0);
    for (let c = -span; c < span * 2; c += spacing + jit(rng, 1.2)) {
      const ya = y0 + c, yb = y0 + c + t * (x1 - x0);
      s += `M${f(x0)},${f(ya + jit(rng, 1))}L${f(x1)},${f(yb + jit(rng, 1))}`;
    }
    return `<path d="${s}" fill="none" stroke="${ink}" stroke-width="${w}" stroke-linecap="round" opacity="${op}"/>`;
  }

  /* ----------------------------------------------------------- RENDER */
  function renderSVG(piece, opts) {
    const animate = !!(opts && opts.animate);
    const t = piece.traits;
    const rng = mulberry32(hashSeed(piece.seed, 'render'));
    const uid = (piece.seed >>> 0).toString(36);
    const bg = findTrait('background', t.background);
    const bgBase = bg.hex;
    const darkBg = luma(bgBase) < 110;
    const ink = darkBg ? '#ecebe6' : '#141414';
    const solidFace = t.coat === 'solid_face';
    // coloured (1/1) backgrounds: head/ear fills use a neutral paper tone, never the background colour
    const fillBase = bg.exclusive ? (darkBg ? '#141414' : '#f3f3f1') : bgBase;
    const headFill = solidFace ? ink : fillBase;
    // solid face: features flip to the neutral opposite of the ink, never the background colour
    const featInk = solidFace ? (darkBg ? '#141414' : '#f3f3f1') : ink;
    const eyeT = findTrait('eyeColor', t.eyeColor);
    let eyeHex = eyeT && eyeT.hex;
    if (eyeHex && t.eyeColor === 'white' && !darkBg && !solidFace) eyeHex = '#aab4ff';

    const P = HEAD[t.headShape];
    const hp = headPts(rng, t.headShape);
    const headD = closedD(hp);
    const tilt = jit(rng, 5);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">`;
    svg += `<defs>` +
      `<filter id="gl${uid}" x="-150%" y="-150%" width="400%" height="400%"><feGaussianBlur stdDeviation="5"/></filter>` +
      `<filter id="bl${uid}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>` +
      `<clipPath id="hc${uid}"><path d="${headD}"/></clipPath></defs>`;

    svg += backgroundMarkup(rng, t.background, bgBase, ink, uid);

    const headStart = svg.length;
    svg += `<g transform="translate(${HX},${HY}) scale(${HEAD_SCALE}) rotate(${f(tilt)}) translate(${-HX},${-HY})">`;

    /* ears */
    const earL = earPts(rng, t.ears, P, -1), earR = earPts(rng, t.ears, P, 1);
    const earFill = t.earTone === 'solid' ? ink : fillBase;
    const drawEar = (pts, side) => {
      let s = sketch(rng, pts, true, ink, { fill: earFill });
      if (t.earTone === 'hatched') {
        const id = `ec${uid}${side < 0 ? 'l' : 'r'}`;
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        s += `<clipPath id="${id}"><path d="${closedD(pts)}"/></clipPath><g clip-path="url(#${id})">` +
          hatchLines(rng, Math.min(...xs) - 4, Math.min(...ys) - 4, Math.max(...xs) + 4, Math.max(...ys) + 4, 5, side * 38, ink, 1.1, 0.85) + `</g>`;
      }
      if (solidFace && t.earTone === 'solid') {
        // solid ear on a solid face: light inner contour + fold stroke so the ear separates from the head
        const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length;
        const inner = pts.map(p => [cx + (p[0] - cx) * 0.62, cy + (p[1] - cy) * 0.62]);
        s += `<path d="${wob(rng, inner, true, 1.1, 6)}" fill="none" stroke="${featInk}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" opacity=".7" stroke-dasharray="${f(14 + rng() * 10)} ${f(4 + rng() * 5)}"/>`;
        s += `<path d="${wob(rng, [[cx + side * 3, cy - 12], [cx - side * 2, cy + 14]], false, 1, 5)}" fill="none" stroke="${featInk}" stroke-width="1" stroke-linecap="round" opacity=".5"/>`;
      }
      return s;
    };
    if (!EARS[t.ears].front) svg += drawEar(earL, -1) + drawEar(earR, 1);

    /* fur drawn behind the head fill (roots get covered) */
    if (t.fur === 'spiky') {
      const n = 16 + Math.floor(rng() * 8);
      let d = '';
      for (let i = 0; i < n; i++) {
        const a = -Math.PI * 0.94 + (i / (n - 1)) * Math.PI * 0.88 + jit(rng, 0.05);
        const r0 = 0.75, r1 = 1.14 + rng() * 0.16;
        d += `M${f(HX + Math.cos(a) * P.rx * r0)},${f(HY + Math.sin(a) * P.ry * r0)}L${f(HX + Math.cos(a + jit(rng, 0.04)) * P.rx * r1)},${f(HY + Math.sin(a) * P.ry * r1 - (t.headShape === 'pointed' ? 18 * Math.max(0, -Math.sin(a)) * (1 - Math.abs(Math.cos(a))) : 0))}`;
      }
      svg += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linecap="round"/>`;
    } else if (t.fur === 'tuft') {
      const top = Math.min(...hp.map(p => p[1]));
      const n = 3 + Math.floor(rng() * 3);
      for (let i = 0; i < n; i++) {
        const x = HX + (i - (n - 1) / 2) * 11 + jit(rng, 3);
        svg += sketch(rng, [[x - 5, top + 12], [x + jit(rng, 6), top - 16 - rng() * 14], [x + 5, top + 12]], false, ink, { w: 1.8, step: 6, ghost: false });
      }
    }

    /* head */
    svg += `<path d="${headD}" fill="${headFill}"/>`;
    svg += `<g clip-path="url(#hc${uid})">` + coatMarkup(rng, t.coat, P, ink, uid) + (solidFace ? solidFaceDepth(rng, P, hp, featInk) : '') + `</g>`;
    svg += sketch(rng, hp, true, ink, { step: 8 });

    if (EARS[t.ears].front) svg += drawEar(earL, -1) + drawEar(earR, 1);

    if (t.fur === 'shaggy') {
      const n = 5 + Math.floor(rng() * 4);
      for (let i = 0; i < n; i++) {
        const side = i % 2 ? 1 : -1;
        const a = -Math.PI / 2 + side * (0.25 + rng() * 0.9);
        const x0 = HX + Math.cos(a) * P.rx * 0.95, y0 = HY + Math.sin(a) * P.ry * 0.95;
        const len = 50 + rng() * 60;
        const x2 = x0 + side * (14 + rng() * 26), y2 = y0 + len;
        const cx = x0 + side * (30 + rng() * 20), cy = y0 + len * 0.25;
        svg += `<path d="M${f(x0)},${f(y0)}Q${f(cx)},${f(cy)} ${f(x2)},${f(y2)}" fill="none" stroke="${ink}" stroke-width="${f(2.6 + rng() * 1.2)}" stroke-linecap="round"/>`;
      }
    }

    svg += featureMarkup(rng, t, P, ink, featInk, headFill, eyeHex, uid, animate);
    svg += `</g>`;
    // keep line weights thin and crude after the head is scaled up
    // compensate the head scale so strokes keep the authored weight, proportionally at every display size
    svg = svg.slice(0, headStart) + svg.slice(headStart).replace(/ stroke-width="([\d.]+)"/g, (m, w) => ` stroke-width="${f(parseFloat(w) / HEAD_SCALE)}"`);
    return svg + `</svg>`;
  }

  function backgroundMarkup(rng, id, base, ink, uid) {
    let s = `<rect width="${WIDTH}" height="${HEIGHT}" fill="${base}"/>`;
    const dots = (n, col, rmin, rmax, omin, omax) => {
      let o = '';
      for (let i = 0; i < n; i++) o += `<circle cx="${f(rng() * WIDTH)}" cy="${f(rng() * HEIGHT)}" r="${f(rmin + rng() * (rmax - rmin))}" fill="${col}" opacity="${f(omin + rng() * (omax - omin))}"/>`;
      return o;
    };
    const blobs = (n, cols, op) => {
      let o = `<g filter="url(#bl${uid})">`;
      for (let i = 0; i < n; i++) o += `<ellipse cx="${f(rng() * WIDTH)}" cy="${f(rng() * HEIGHT)}" rx="${f(40 + rng() * 70)}" ry="${f(30 + rng() * 50)}" fill="${cols[i % cols.length]}" opacity="${op}"/>`;
      return o + '</g>';
    };
    const scribbles = (n, col, op) => {
      let o = '';
      for (let i = 0; i < n; i++) {
        const x = rng() * WIDTH, y = rng() * HEIGHT;
        const pts = [];
        for (let k = 0; k < 4; k++) pts.push([x + jit(rng, 22), y + jit(rng, 22)]);
        o += `<path d="${wob(rng, pts, false, 1.5, 6)}" fill="none" stroke="${col}" stroke-width=".9" opacity="${op}"/>`;
      }
      return o;
    };
    switch (id) {
      case 'paper': s += dots(40, '#222', 0.6, 1.7, 0.3, 0.7) + scribbles(4 + Math.floor(rng() * 4), '#999', 0.35); break;
      case 'static':
        s += hatchLines(rng, 0, 0, WIDTH, HEIGHT, 5, 35, '#cfcfcc', 0.7, 0.8) + hatchLines(rng, 0, 0, WIDTH, HEIGHT, 7, -35, '#d8d8d5', 0.6, 0.6) + dots(20, '#333', 0.6, 1.4, 0.3, 0.6);
        break;
      case 'void': {
        s += dots(70, '#ffffff', 0.5, 1.4, 0.25, 0.9);
        for (let i = 0; i < 3; i++) {
          const x = rng() * WIDTH, y = rng() * HEIGHT, r = 3 + rng() * 3;
          s += `<path d="M${f(x - r)},${f(y)}L${f(x + r)},${f(y)}M${f(x)},${f(y - r)}L${f(x)},${f(y + r)}" stroke="#fff" stroke-width=".9" opacity=".8"/>`;
        }
        break;
      }
      case 'fog': s += blobs(8, ['#b4b4b4', '#6c6c6c', '#a0a0a0'], 0.6) + dots(14, '#222', 0.6, 1.3, 0.2, 0.5); break;
      case 'smoke': s += blobs(8, ['#3d3d3d', '#2a2a2a', '#4a4a4a'], 0.75) + dots(20, '#fff', 0.5, 1.1, 0.15, 0.5); break;
      case 'hatch': s += hatchLines(rng, 0, 0, WIDTH, HEIGHT, 8, 38, '#2b2b2b', 1, 1) + dots(16, '#fff', 0.5, 1.1, 0.15, 0.4); break;
      default: s += dots(34, ink, 0.6, 1.6, 0.2, 0.5) + scribbles(3, ink, 0.18); break; // 1/1 flat colours
    }
    return s;
  }

  // Solid face depth: broken inner rim, side hatch shading, brow/cheek contour strokes and a
  // scribbled sheen, all in the light feature ink at low opacity, so the face never reads as a flat blob.
  function solidFaceDepth(rng, P, hp, lite) {
    let s = '';
    const side = rng() < 0.5 ? -1 : 1;
    // broken inner rim following the head outline
    const rim = hp.map(p => [HX + (p[0] - HX) * 0.86, HY + (p[1] - HY) * 0.86]);
    s += `<path d="${wob(rng, rim, true, 1.3, 7)}" fill="none" stroke="${lite}" stroke-width="1.1" stroke-linecap="round" opacity=".45" stroke-dasharray="${f(20 + rng() * 18)} ${f(8 + rng() * 10)} ${f(6 + rng() * 6)} ${f(10 + rng() * 8)}"/>`;
    // hatch shading on one side (light side of the face)
    const xa = side < 0 ? HX - P.rx - 10 : HX + P.rx * 0.35, xb = side < 0 ? HX - P.rx * 0.35 : HX + P.rx + 10;
    s += hatchLines(rng, xa, HY - P.ry - 20, xb, HY + P.ry + 20, 5.5, side * 42, lite, 0.9, 0.28);
    // brow ridge + cheek contours
    const ey = HY + P.eyeY;
    for (const sd of [-1, 1]) {
      const ex = HX + sd * P.rx * 0.38;
      s += `<path d="${wob(rng, [[ex - 14, ey - 18], [ex, ey - 23], [ex + 14, ey - 18]], false, 1, 5)}" fill="none" stroke="${lite}" stroke-width="1" stroke-linecap="round" opacity=".35"/>`;
      s += `<path d="${wob(rng, [[HX + sd * P.rx * 0.62, ey + 14], [HX + sd * P.rx * 0.55, HY + P.noseY + 18], [HX + sd * P.rx * 0.32, HY + P.noseY + 34]], false, 1.2, 6)}" fill="none" stroke="${lite}" stroke-width="1.1" stroke-linecap="round" opacity=".4"/>`;
    }
    // muzzle mound around nose/mouth
    const ny = HY + P.noseY;
    s += `<path d="${wob(rng, [[HX - 26, ny - 12], [HX - 30, ny + 12], [HX - 14, ny + 30], [HX + 14, ny + 30], [HX + 30, ny + 12], [HX + 26, ny - 12]], false, 1.2, 6)}" fill="none" stroke="${lite}" stroke-width="1.1" stroke-linecap="round" opacity=".38"/>`;
    // scribbled sheen near the top of the head
    const sx = HX - side * P.rx * 0.35, sy = HY - P.ry * 0.55;
    let d = '';
    for (let k = 0; k < 7; k++) d += (k ? 'L' : 'M') + f(sx + (k % 2 ? 14 : -14) + jit(rng, 3)) + ',' + f(sy + k * 2.6 + jit(rng, 1.5));
    s += `<path d="${d}" fill="none" stroke="${lite}" stroke-width="1" stroke-linejoin="round" opacity=".4"/>`;
    return s;
  }

  function coatMarkup(rng, coat, P, ink, uid) {
    const eyeY = HY + P.eyeY, ex = P.rx * 0.38;
    const avoid = [[HX - ex, eyeY, 20], [HX + ex, eyeY, 20], [HX, HY + P.noseY + 8, 26]];
    const clear = (x, y, r) => avoid.every(a => Math.hypot(x - a[0], y - a[1]) > a[2] + r);
    let s = '';
    switch (coat) {
      case 'spots': {
        let placed = 0, tries = 0; const n = 4 + Math.floor(rng() * 5);
        while (placed < n && tries++ < 200) {
          const a = rng() * Math.PI * 2, rr = Math.sqrt(rng());
          const x = HX + Math.cos(a) * P.rx * rr, y = HY + Math.sin(a) * P.ry * rr, r = 5 + rng() * 7;
          if (!clear(x, y, r)) continue;
          s += `<path d="${closedD(ellipsePts(rng, x, y, r, r * (0.7 + rng() * 0.4), 6, 0.25))}" fill="${ink}"/>`;
          placed++;
        }
        break;
      }
      case 'freckles':
        for (const side of [-1, 1]) for (let i = 0; i < 4 + Math.floor(rng() * 3); i++)
          s += `<circle cx="${f(HX + side * (20 + rng() * 26))}" cy="${f(HY + P.noseY - 4 + rng() * 18)}" r="${f(1.3 + rng())}" fill="${ink}"/>`;
        break;
      case 'eye_patch': {
        const side = rng() < 0.5 ? -1 : 1;
        const cx = HX + side * ex, cy = eyeY, r = 24;
        let d = ''; const n = 16;
        for (let k = 0; k <= n; k++) {
          const yy = cy - r + (2 * r * k) / n, half = Math.sqrt(Math.max(0, r * r - (yy - cy) * (yy - cy)));
          const x = cx + (k % 2 ? half : -half) + jit(rng, 2);
          d += (k ? 'L' : 'M') + f(x) + ',' + f(yy + jit(rng, 1.5));
        }
        s += `<path d="${d}" fill="none" stroke="${ink}" stroke-width="1.7" stroke-linejoin="round"/>`;
        break;
      }
      case 'hatch_shade': {
        const side = rng() < 0.5 ? -1 : 1;
        const xa = side < 0 ? HX - P.rx - 10 : HX + P.rx * 0.2, xb = side < 0 ? HX - P.rx * 0.2 : HX + P.rx + 10;
        s += hatchLines(rng, xa, HY - P.ry - 30, xb, HY + P.ry + 30, 6, 40, ink, 1.1, 0.75);
        break;
      }
      case 'blaze': {
        const stripe = 12 + rng() * 6;
        for (const side of [-1, 1]) {
          const pts = [[HX + side * stripe, HY - P.ry - 40], [HX + side * (P.rx + 30), HY - P.ry - 40],
            [HX + side * (P.rx + 30), eyeY + 34], [HX + side * P.rx * 0.6, eyeY + 28], [HX + side * (stripe + 16), eyeY + 12], [HX + side * (stripe + 4), eyeY - 14]]
            .map(p => [p[0] + jit(rng, 3), p[1] + jit(rng, 3)]);
          s += `<path d="${closedD(pts)}" fill="${ink}"/>`;
        }
        break;
      }
    }
    return s;
  }

  function featureMarkup(rng, t, P, ink, featInk, headFill, eyeHex, uid, animate) {
    // seeded SMIL motion (lightbox / export only): glow pulse + spinning spiral/starburst
    const arng = mulberry32(hashSeed(uid, 'anim'));
    const pulseDur = f(1.8 + arng() * 1.6), spinDur = f(4 + arng() * 5), spinDir = arng() < 0.5 ? -1 : 1;
    const spin = (inner, x, y) => animate
      ? `<g>${inner}<animateTransform attributeName="transform" type="rotate" from="0 ${f(x)} ${f(y)}" to="${360 * spinDir} ${f(x)} ${f(y)}" dur="${spinDur}s" repeatCount="indefinite"/></g>`
      : inner;
    let s = '';
    const halo = t.coat === 'blaze';
    const col = eyeHex || featInk;
    const ex = P.rx * 0.38;
    const eyes = [-1, 1].map(side => ({
      x: HX + side * (ex + jit(rng, 3)), y: HY + P.eyeY + jit(rng, 3), r: 10 + jit(rng, 2)
    }));
    const glow = (x, y, r) => !eyeHex ? '' : animate
      ? `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${eyeHex}" opacity=".75" filter="url(#gl${uid})"><animate attributeName="opacity" values=".4;.95;.4" dur="${pulseDur}s" repeatCount="indefinite"/></circle>`
      : `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${eyeHex}" opacity=".75" filter="url(#gl${uid})"/>`;

    /* eyes */
    if (t.eyes === 'visor') {
      const x0 = eyes[0].x - 20, x1 = eyes[1].x + 20, y = (eyes[0].y + eyes[1].y) / 2;
      s += glow(eyes[0].x, y, 16) + glow(eyes[1].x, y, 16);
      s += sketch(rng, [[x0, y - 8], [x1, y - 9], [x1, y + 7], [x0, y + 8]], true, featInk, { fill: featInk, ghost: false });
      for (const e of eyes) s += `<rect x="${f(e.x - 8)}" y="${f(y - 2)}" width="16" height="3.4" fill="${eyeHex || headFill}"/>`;
    } else {
      for (const e of eyes) {
        const { x, y, r } = e;
        if (halo) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r + 7)}" fill="${headFill}"/>`;
        s += glow(x, y, r * (t.eyes === 'sleepy' ? 1.2 : 1.8));
        switch (t.eyes) {
          case 'ring':
            s += sketch(rng, circ(rng, x, y, r), true, featInk, { fill: headFill, w: 1.9 });
            s += `<circle cx="${f(x + jit(rng, 1.5))}" cy="${f(y + jit(rng, 1.5))}" r="${f(r * 0.42)}" fill="${col}"/>`;
            break;
          case 'dot':
            s += sketch(rng, circ(rng, x, y, r * 0.75, 9), true, featInk, { fill: col, w: 1.6, ghost: false });
            break;
          case 'spiral': {
            s += sketch(rng, circ(rng, x, y, r), true, featInk, { fill: headFill, w: 1.8, ghost: false });
            const pts = [];
            for (let k = 0; k < 30; k++) { const a = k * 0.62, rr = (k / 30) * r * 0.85; pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
            s += spin(`<path d="${wob(rng, pts, false, 0.4, 3)}" fill="none" stroke="${col}" stroke-width="1.5" stroke-linecap="round"/>`, x, y);
            break;
          }
          case 'x_mark': {
            s += sketch(rng, circ(rng, x, y, r), true, featInk, { fill: headFill, w: 1.8, ghost: false });
            const k = r * 0.55;
            s += `<path d="M${f(x - k)},${f(y - k)}L${f(x + k)},${f(y + k)}M${f(x + k)},${f(y - k)}L${f(x - k)},${f(y + k)}" stroke="${col}" stroke-width="2.4" stroke-linecap="round"/>`;
            break;
          }
          case 'starburst': {
            s += sketch(rng, circ(rng, x, y, r), true, featInk, { fill: headFill, w: 1.8, ghost: false });
            let d = '';
            for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + jit(rng, 0.15); d += `M${f(x + Math.cos(a) * r * 0.2)},${f(y + Math.sin(a) * r * 0.2)}L${f(x + Math.cos(a) * r * 0.85)},${f(y + Math.sin(a) * r * 0.85)}`; }
            s += spin(`<path d="${d}" stroke="${col}" stroke-width="1.6" stroke-linecap="round"/>`, x, y);
            break;
          }
          case 'sleepy':
            s += sketch(rng, [[x - r, y - 1], [x - r * 0.5, y + r * 0.45], [x + r * 0.5, y + r * 0.45], [x + r, y - 1]], false, featInk, { w: 2, step: 5 });
            break;
          case 'hearts':
            s += sketch(rng, heartPts(x, y, r * 1.1), true, col === featInk ? featInk : col, { fill: eyeHex ? eyeHex : featInk, w: 1.6, ghost: false });
            break;
        }
      }
    }

    /* brows */
    const lines = [];
    for (const e of eyes) {
      const side = e.x < HX ? -1 : 1, by = e.y - e.r - 9;
      if (t.brows === 'worried') lines.push([[e.x + side * 12, by + 3], [e.x - side * 8, by - 5]]);
      if (t.brows === 'angry') lines.push([[e.x + side * 12, by - 5], [e.x - side * 9, by + 4]]);
    }
    if (t.brows === 'wrinkles') {
      const by = Math.min(eyes[0].y, eyes[1].y) - 26;
      for (let i = 0; i < 3; i++) lines.push([[HX - 12 + i, by - i * 6], [HX, by - i * 6 - 3], [HX + 12 - i, by - i * 6]]);
    }

    /* muzzle */
    const ny = HY + P.noseY + jit(rng, 2), nx = HX + jit(rng, 2);
    if (t.muzzle === 'whisker_dots') {
      for (const side of [-1, 1]) for (let i = 0; i < 3; i++)
        s += `<circle cx="${f(nx + side * (18 + i * 7 + jit(rng, 1.5)))}" cy="${f(ny + 6 + (i % 2) * 5 + jit(rng, 1))}" r="1.5" fill="${featInk}"/>`;
    } else if (t.muzzle === 'jowls') {
      for (const side of [-1, 1])
        lines.push([[nx + side * 14, ny - 2], [nx + side * 24, ny + 10], [nx + side * 22, ny + 26], [nx + side * 14, ny + 32]]);
    } else if (t.muzzle === 'snout_line') {
      lines.push([[nx - 22, ny - 8], [nx - 26, ny + 14], [nx - 12, ny + 28], [nx + 12, ny + 28], [nx + 26, ny + 14], [nx + 22, ny - 8]]);
    }

    /* mouth */
    const FS = 1.3; // face-feature scale (mouth + nose)
    const mlines = []; let ms = '';
    const my = ny + 9;
    switch (t.mouth) {
      case 'smile':
        mlines.push([[nx, ny + 4], [nx, my + 3]]);
        mlines.push([[nx - 13, my + 1], [nx - 6, my + 7], [nx, my + 3], [nx + 6, my + 7], [nx + 13, my + 1]]);
        break;
      case 'flat':
        mlines.push([[nx, ny + 4], [nx, my + 4]]);
        mlines.push([[nx - 11, my + 5], [nx + 11, my + 4]]);
        break;
      case 'frown':
        mlines.push([[nx, ny + 4], [nx, my + 2]]);
        mlines.push([[nx - 13, my + 10], [nx - 6, my + 3], [nx + 6, my + 3], [nx + 13, my + 10]]);
        break;
      case 'open':
        mlines.push([[nx, ny + 4], [nx, my + 1]]);
        ms += sketch(rng, [[nx - 12, my + 2], [nx + 12, my + 2], [nx + 8, my + 13], [nx - 8, my + 13]], true, featInk, { fill: featInk, w: 1.6, ghost: false });
        break;
      case 'blep':
        mlines.push([[nx, ny + 4], [nx, my + 3]]);
        mlines.push([[nx - 13, my + 1], [nx - 6, my + 7], [nx, my + 3], [nx + 6, my + 7], [nx + 13, my + 1]]);
        ms += sketch(rng, [[nx - 4, my + 5], [nx - 4, my + 13], [nx, my + 16], [nx + 4, my + 13], [nx + 4, my + 5]], false, featInk, { w: 1.5, step: 4, ghost: false });
        break;
      case 'stitched': {
        mlines.push([[nx - 15, my + 5], [nx + 15, my + 4]]);
        for (let i = -2; i <= 2; i++) mlines.push([[nx + i * 6, my], [nx + i * 6 + jit(rng, 1), my + 9]]);
        break;
      }
      case 'teeth': {
        ms += sketch(rng, [[nx - 15, my], [nx + 15, my - 1], [nx + 15, my + 9], [nx - 15, my + 10]], true, featInk, { fill: headFill === ink ? '#f4f4f2' : headFill, w: 1.7, ghost: false });
        for (let i = -2; i <= 2; i++) mlines.push([[nx + i * 5.5, my], [nx + i * 5.5, my + 9]]);
        break;
      }
    }

    const lineD = lines.map(p => wob(rng, p, false, 0.8, 5)).join('');
    if (halo && lineD) s += `<path d="${lineD}" fill="none" stroke="${headFill}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (lineD) s += `<path d="${lineD}" fill="none" stroke="${featInk}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;

    /* nose */
    let ns = '';
    switch (t.nose) {
      case 'triangle':
        ns = sketch(rng, [[nx - 9, ny - 5], [nx + 9, ny - 6], [nx, ny + 5]], true, featInk, { fill: featInk, w: 1.8, ghost: false, step: 4 });
        break;
      case 'button':
        ns = `<ellipse cx="${f(nx)}" cy="${f(ny - 1)}" rx="5.5" ry="4.2" fill="${featInk}"/>`;
        break;
      case 'hollow_o':
        ns = sketch(rng, circ(rng, nx, ny - 1, 5, 8), true, featInk, { w: 1.7, fill: headFill, ghost: false });
        break;
      case 'heart':
        ns = `<path d="${closedD(heartPts(nx, ny - 1, 7))}" fill="${featInk}"/>`;
        break;
    }
    // mouth + nose drawn in a scaled group so they read at thumbnail size
    const mD = mlines.map(p => wob(rng, p, false, 0.6, 4)).join('');
    s += `<g transform="translate(${f(nx)},${f(ny)}) scale(${FS}) translate(${f(-nx)},${f(-ny)})">`;
    if (halo && mD) s += `<path d="${mD}" fill="none" stroke="${headFill}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`;
    if (mD) s += `<path d="${mD}" fill="none" stroke="${featInk}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`;
    s += ms + ns + `</g>`;
    return s;
  }

  /* --------------------------------------------------------- METADATA */
  function traitName(cat, id) { const t = findTrait(cat, id); return t ? t.name : id; }

  function toMetadata(piece, opts) {
    const o = opts || {};
    const name = (o.collectionName || 'Ink Pups') + ' #' + piece.index;
    const attributes = CATEGORY_ORDER.map(c => ({ trait_type: CATEGORY_META[c], value: traitName(c, piece.traits[c]) }));
    if (piece.isOneOfOne) attributes.push({ trait_type: 'Edition', value: '1/1' });
    return {
      name,
      description: o.description || 'Scrawled dogs with glowing eyes, generated one at a time.',
      image: (o.imageBase || '') + piece.index + '.png',
      attributes
    };
  }

  function pieceRarityScore(piece) {
    const w = { common: 1, uncommon: 2, rare: 3 };
    let s = 0;
    for (const c of CATEGORY_ORDER) { const t = findTrait(c, piece.traits[c]); s += t ? (t.exclusive ? 4 : w[t.rarity]) : 1; }
    return s;
  }

  const api = {
    VERSION, SIZE, WIDTH, HEIGHT, TRAITS, weightedPick, mulberry32, CATEGORY_ORDER, CATEGORY_META, ONE_OF_ONE_EXCLUSIVES, ONE_OF_ONE_PICKERS,
    TIER_FALLBACK, findTrait, traitName, pickByRarity, rollTraits, generateUnique, generateBatch, generateBatchAsync,
    estimateComboSpace, comboKey, renderSVG, toMetadata, pieceRarityScore, hashSeed, luma, isDarkBg
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof root !== 'undefined') root.InkPupsGen = api;
})(typeof window !== 'undefined' ? window : globalThis);
