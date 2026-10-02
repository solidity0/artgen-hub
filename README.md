# ArtGen — generator hub

Six generative art collections, each self-contained in its own folder, with a
hub landing page at the root linking between them. Every generator runs
entirely in the browser as a single HTML file — no server, no install — so it
works on GitHub Pages and can be inscribed on-chain as-is.

**Live hub:** https://solidity0.github.io/artgen-hub/

| # | Collection | Style | Tab icon | Open |
|---|------------|-------|----------|------|
| 1 | **Drifters** | Characters, drifters, resisters — the working collection | 👤 | [generator-1](https://solidity0.github.io/artgen-hub/generator-1/index.html) |
| 2 | **Glyphs** | Abstract machine-interface glyphs — fragmented, glitched, cold | 🌀 | [generator-2](https://solidity0.github.io/artgen-hub/generator-2/index.html) |
| 3 | **Oddlings** | Hand-inked PFP characters with starburst eyes | 👽 | [generator-3](https://solidity0.github.io/artgen-hub/generator-3/index.html) |
| 4 | **AfterBots** | Hand-inked industrial robots, often with a companion | 🤖 | [generator-4](https://solidity0.github.io/artgen-hub/generator-4/index.html) |
| 5 | **Ink Pups** | Scrawled ink hellhounds with burning eyes | 🐶 | [generator-5](https://solidity0.github.io/artgen-hub/generator-5/index.html) |
| 6 | **GRIMKIN** | Undead chibi guys haunting the block after dark | character PNG | [generator-6](https://solidity0.github.io/artgen-hub/generator-6/index.html) |

Slots 7 and 8 are reserved on the hub for future collections.

---

## Repository layout

```
/
├── index.html            ← hub landing page (site root) — GENERATORS list lives here
├── README.md
├── generator-1/  Drifters
├── generator-2/  Glyphs
├── generator-3/  Oddlings
├── generator-4/  AfterBots
├── generator-5/  Ink Pups
└── generator-6/  GRIMKIN
```

Every generator folder holds the same four files:

| File | What it is | Edit it? |
|------|------------|----------|
| `generator.js` | The trait engine — trait pools, rarity weights, 1/1 rules and the SVG renderer. Single source of truth for that collection. Works in the browser and in Node (`require('./generator.js')`). | ✅ yes |
| `index.src.html` | The website shell — layout, controls, gallery, lightbox and export code. Contains `<!-- ENGINE:START -->` / `<!-- ENGINE:END -->` markers where the engine gets inlined. | ✅ yes |
| `build.js` | Splices `generator.js` into `index.src.html` between the markers and writes `index.html`. `node build.js --check` verifies `index.html` is up to date without writing. | rarely |
| `index.html` | The built, self-contained page that GitHub Pages serves. | ❌ generated — never hand-edit |

---

## The generators

### 1 — Drifters
`generator-1/` · engine **v7** · browser global `window.ArtGen` · page ≈ 140 KB

The original, brand-agnostic character engine: robot-headed drifters in
bodies from suits to exosuits, set against 25 scene backgrounds.

| Trait | Values |
|-------|--------|
| background | 25 — red, clouds, starfield, rain, lightning, houses (dusk/twilight/night), cemetery, snow, beach, abandoned city, cave, desert, forest, swamp, static, eclipse, blood moon, … |
| body | 8 — suit, turtleneck, tank top, robe, hoodie, tattered, armored, exosuit |
| bodyColor | 14 |
| size | 3 — small, medium, large |
| headShape | 7 — round, boxed, monitor, split, cracked, vented, antenna |
| headColor | 12 |
| eyeShape | 12 — round glow, radiant glow, glitch, x dead, cyclops, void stare, spiral, scan line, … |
| eyeColor | 12 |
| mouth | 9 — waveform, grin, shout, stitched, fangs, zipper, circuit grid, … |
| accessory | 5 — none, scatter dots, scanlines, tears, ash fall |

### 2 — Glyphs
`generator-2/` · engine **v3 "Firmware Glyph"** · `window.GlyphGen` · page ≈ 92 KB

Abstract interface glyphs rather than characters. Built for a 20k supply.

| Trait | Values |
|-------|--------|
| palette | 14 — mono white, amber ROM, phosphor, cyan signal, infrared, … |
| core | 12 — broken ring, split cross, spiral lock, singularity, hex grid, orbit, … |
| fracture | 10 — stable → hairline → cracked → shattered → dissolved |
| segments | 10 — minimal → dense → swarm → hive → ultra |
| field | 10 — clean black, CRT scan, grain, heavy static, burned signal, … |
| glitch | 10 — none, flicker, channel slip, datamosh, tear, cascade, corrupt feed, … |
| symmetry | 10 — asymmetric, mirror, radial 2/3/4/6/8, mirror-radial |

1/1s exclude a set of palettes reserved for them.

### 3 — Oddlings
`generator-3/` · engine **v2 "Brush & Form Shading"** · `window.InkGen` · page ≈ 136 KB

Hand-drawn ink PFPs, framed head-and-shoulders. Starburst eyes are the
signature; eye color drives the palette. Linework runs through a Catmull-Rom
smoother with a double ink pass, and shading is form-hatched from an
upper-left light.

| Trait | Values |
|-------|--------|
| background | 15 — white dots, hatch, ink wash, scribble, splats, matte black (stars/wash/splat/red stars), … |
| headShape · headFill | 9 · 6 (outline → hatch shade → ink black → splatter) |
| hair | 11 — messy, spiky, mohawk, dreads, bandana, horns, horns red (1/1-only), tentacles, … |
| eyeColor · eyeStyle | 7 (white is 1/1-only) · 7 (starburst, hollow star, spiral, …) |
| mouth · clothing · accessory | 6 · 16 (8 styles × modern/classic) · 7 |
| expression · inkStyle · tag | 6 · 5 (clean line → chaotic) · 2 |

1/1s get **signature combos** — exact named trait sets only 1/1s can have —
plus curated eye/background/head-fill weights. White eyes auto-swap light
backgrounds for dark ones.

### 4 — AfterBots
`generator-4/` · engine **v2 "Riso Chalk"** · `window.AfterBotsGen` · page ≈ 124 KB

Chalk-line robots with riso-style offset colour fills and swappable parts —
camera-lens optics, antennas or cable bundles, grille mouths, hydraulic limbs
with knee bolts and riveted plates — often joined by a small companion creature.

| Trait | Values |
|-------|--------|
| vibe | 2 — friendly (65%), scary (35%): scary bots use the darker half of the pools below, get brow plates, cracks, rust streaks, oil drips, claw scratches and a red halo, and unlock the scary-only values in (brackets) |
| headShape · bodyShape | 7 each — box, round, TV, dome, capsule, hex, octagon · barrel, trapezoid, bell, … |
| bodyColor | 16 — incl. steel, gunmetal and black (black heads/bodies only on dark backgrounds) — plus separate head / leg / hand colour traits (15 each, or "matching") |
| arms · hands · feet | 7 · 7 · 4 — spring, telescopic, floating… · claw, pincer, hook, magnet, plug… · pointed, robot blocks, claw feet, peg legs |
| topper · ears · eyes · eyeColor · mouth | 5 (antenna, twin antenna, cables, fin, none) · 6 · 5 camera-lens optics (+ glare, cracked) · 4 (+ toxic) · 5 (grille, vent, zipper, LED bar, fang grille; + jaws) |
| internals | 5 — circuit board (brainbox, ICs, capacitors, power cell, braided harnesses), hydraulics (pump, pressure gauge, pistons, valve pipes), gearbox (meshing gears, belt, motor), coolant (glass tanks, radiator, coolant pipes), reactor (glowing core, copper coils, armoured cables); shown in an open bolted service hatch |
| companion · companionColor | 7 (cat, dog, bird, ghost cat, bunny, robo-dog) · 11 (incl. rust, teal, crimson) |
| background · sky · ground · grassColor | 10 — cream, white, concrete, ash, sand, smog, rust haze, black, deep black, midnight (+ blood night) · 3 (+ blood moon) · 4 · 3 |

1/1-only chest marks and grass colours, signature combos, and per-category
1/1 weights.

### 5 — Ink Pups
`generator-5/` · engine **v2 "Scrawl"** (2.3.0) · `window.InkPupsGen` · page ≈ 92 KB

Crude, wobbly single-weight hellhound heads (head only, scaled up) with
burning eyes, fangs, scars and blood on dark textured backgrounds.

| Trait | Values |
|-------|--------|
| background | 7 — void, smoke, paper, blood, fog, hatch, static; 1/1s add blood moon, red, pitch, bruise |
| headShape · fur | 4 · 4 (smooth, spiky, shaggy, tuft) |
| ears · earTone | 5 (floppy long/short, perky, folded, rose) · 3 |
| coat | 8 — plain, spots, scars, eye patch, hatch shade, blaze, blood, solid face |
| eyeColor · eyes · brows | 7 · 9 (hollow, ring, dot, slit, bleeding, spiral, x mark, starburst, visor; 1/1 third eye) · 4 (angry, snarl, none, scarred) |
| nose · mouth · muzzle | 4 (incl. skull) · 7 (fangs, snarl, stitched, teeth, drool, frown, howl) · 4 |

Curated 1/1 pickers, 1/1-exclusive values and batch-wide dedup.

### 6 — GRIMKIN
`generator-6/` · engine **v2** · `window.ChibiGen` · page ≈ 108 KB

Full-body undead chibi guys in shaded flat vector, set at night: a soft ink
underlay beneath every outline, clipped form shading and hatching, sunken
eye sockets, a moon over most pieces, cold moonlight, a heavy vignette, low
fog over the sidewalk, and derelict brick buildings or graves across the
street. Glows are stacked translucent shapes (no SVG filters).

| Trait | Values |
|-------|--------|
| skinTone | 7 — corpse, ghoul, zombie, ghost, bruised, blood, shadow (cute: white, pale, gray, onyx, red, blue) |
| hairColor | 10 — plus **rainbow**, 1/1-only |
| hairStyle | 7 — buzz, crew, fade, afro, spiky, durag, mohawk |
| facialHair | 5 — none, stubble, mustache, goatee, beard |
| outfitType · outfitColor | 6 (tank, stripes, hoodie, overalls, sweater, suit) · 7 (midnight, blood, rot, bruise, rust, bone, black) |
| vibe | 2 — scary (85%), cute (15%): cute pieces get the daytime scene and friendly traits below in (brackets) |
| eyeStyle | 7 — hollow, glowing, void, bleeding, stitched, button, demon (cute: dot, wide, sleepy, wink, sparkle) |
| mouth | 6 — stitched, fangs, grin, gape, bloody, teeth (cute: smile, beam, smirk) |
| scars | 5 — none, scar, cracks, splatter, stitches |
| accessory | 11 — none, cap, glasses, earring, gold chain; horns intact / broken / cracked, each in blood red or black |
| backdrop | 6 — none, brownstones, tenements (fire escapes + water towers), tenement + corner store, graves, bats |
| background | 6 — midnight, blood, fog, toxic, bruise, ember; 1/1s use pitch, blood moon (red moon), void, toxic (cute: warm sand, seafoam, cream, lime, lavender, sunflower; 1/1s ETH blue, red, punchy blue, rich lime) |

1/1s use curated pickers for skin, hair colour, outfit, backdrop and
background. The source of truth is
[solidity0/hoodcharacters](https://github.com/solidity0/hoodcharacters);
this folder is a synced copy — change it there and copy the four files here.

---

## Shared features (every generator page)

- **Collection settings** — name, symbol, description, and chain
  (Bitcoin / Ethereum / Robinhood), which also re-themes the page.
- **Unique character names** — every piece is named `Collection #N — Character Name` (e.g. `GRIMKIN #17 — Lil Stitches`), themed per generator; Gen 6 (GRIMKIN) uses the character name alone (e.g. `Lil Stitches`). Names come from a seeded one-to-one shuffle of first × last name lists, so no two pieces in a collection ever share one; past the list size a roman numeral (II, III, …) is appended. Shown in the gallery, lightbox and every download format.
- **Rarity tier** — any / common / uncommon / rare biases every unlocked trait.
- **Trait locks** — pick one or more values per category, or leave on random.
- **Seed, supply and 1/1 count** — supply is uncapped. Same seed + settings =
  same collection, every time. The 1/1 count follows supply at 10% until
  you edit it.
- **1/1 variety** — each 1/1 prefers trait values the batch's earlier 1/1s
  haven't used yet (best of up to 40 deterministic re-rolls, key traits
  counting double), and no two 1/1s share an exact trait combo. Generator 2
  still gives each 1/1 its own core form first, and Generator 4 its own
  body colour first; the variety spread breaks ties within those.
- **Virtualized gallery** — only visible tiles are drawn, so thousands of
  pieces stay smooth, including on mobile.
- **Lightbox** — full traits with rarity; download PNG (1200×1200) or SVG,
  copy image (shortcut **C**), copy markup; ← / → to browse, Esc to close.
- **Animate** (generators 1, 2, 3, 5, 6) — seeded SVG animation in the
  lightbox and SVG exports.
- **Export trait sheet** — CSV of every piece's traits and rarities.
- **Download batch (.zip)** — a launch-ready pack:
  - *Ethereum / Robinhood:* `images/`, `vectors/`, OpenSea-standard
    `metadata/` (with and without `.json`), `opensea-studio-metadata.csv`,
    `collection.json`, and a README with launch steps. Set **Image base URI**
    (e.g. `ipfs://<CID>/`) and **Project website** under Launch settings.
  - *Bitcoin:* `ordinals-collection.json`, `inscribe-order.csv`, per-piece
    metadata, SVGs and PNGs, and a README with inscription steps.
  - Batches over 1,000 pieces download as one metadata zip plus image zips
    of 1,000 each.

---

## Working on a generator

Edit `generator.js` (art/traits) or `index.src.html` (page), then from inside
that generator's folder:

```bash
node build.js           # rebuild index.html
node build.js --check   # verify index.html is up to date (CI-friendly)
```

Commit the rebuilt `index.html` together with your source change.

To render pieces from Node (e.g. for previews or tests):

```js
const G = require('./generator-6/generator.js');
const piece = G.generatePiece(1, 7);          // index 1, seed 7
console.log(piece.traits, piece.svg.length);
```

## Adding a new generator

1. Copy an existing generator folder's `generator.js`, `index.src.html` and
   `build.js` into the next empty slot (`generator-7/`).
2. Run `node build.js` inside it to produce `index.html`.
3. In the root `index.html`, set that slot's entry in the `GENERATORS` array
   to `active: true` and give it a name and description.
4. Add it to the tables in this README.

## Navigation

The hub links to each active generator with a plain relative link
(`generator-1/index.html`, …), and every generator has a "← Hub" link back.
No JavaScript routing and no build step for the hub itself, so any static
host — GitHub Pages included — serves it with no configuration.
