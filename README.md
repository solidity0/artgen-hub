# ArtGen — generator hub

This repo now holds multiple generative art collections, each self-contained
in its own folder, with a hub landing page at the root linking between them.

## Layout

```
/
├── index.html          ← hub landing page (this is now the site root)
├── generator-1/
│   ├── generator.js     ← trait engine — single source of truth for this generator
│   ├── index.src.html   ← website shell/template
│   ├── build.js         ← splices generator.js into index.src.html → index.html
│   └── index.html       ← generated output — do not hand-edit, run build.js instead
├── generator-2/  … generator-7/   ← reserved for future collections, same pattern
```

## Working on a generator

Each generator folder is independent and follows the same rule as before:
edit `generator.js`, then run `node build.js` (or `node build.js --check` to
verify without rebuilding) from inside that generator's folder. `index.html`
inside a generator folder is always generated, never hand-edited.

## Adding a new generator

1. Duplicate the pattern from an existing generator folder (`generator.js` /
   `index.src.html` / `build.js`) into the next empty numbered folder.
2. Run `node build.js` inside it to produce that folder's `index.html`.
3. In the root `index.html`, find the `GENERATORS` array and flip that
   generator's entry to `active: true`.

## Navigation

The hub (root `index.html`) links to each active generator via a normal
relative link (`generator-1/index.html`, etc). Each generator has a "← Hub"
link back to the root. This is plain HTML navigation — no JavaScript
routing, no build step required for the hub itself, so any static host
(GitHub Pages included) serves it correctly with no extra configuration.
