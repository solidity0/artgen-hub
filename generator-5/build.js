#!/usr/bin/env node
/* Ink Pups build: inlines generator.js into index.src.html between
   <!-- ENGINE:START --> / <!-- ENGINE:END --> and writes index.html.
   node build.js          → build
   node build.js --check  → verify index.html is up to date + engine sanity (exit 1 on failure) */
'use strict';
const fs = require('fs');
const path = require('path');

const dir = __dirname;
const SRC = path.join(dir, 'index.src.html');
const ENGINE = path.join(dir, 'generator.js');
const OUT = path.join(dir, 'index.html');
const START = '<!-- ENGINE:START -->';
const END = '<!-- ENGINE:END -->';

function build() {
  const src = fs.readFileSync(SRC, 'utf8');
  const engine = fs.readFileSync(ENGINE, 'utf8');
  const a = src.indexOf(START), b = src.indexOf(END);
  if (a < 0 || b < 0 || b < a) throw new Error('ENGINE markers missing or out of order in index.src.html');
  if (/<\/script/i.test(engine)) throw new Error('generator.js contains a closing script tag');
  return src.slice(0, a + START.length) + '\n<script>\n/* generator.js — inlined by build.js */\n' + engine + '\n</script>\n' + src.slice(b);
}

function sanity() {
  delete require.cache[require.resolve(ENGINE)];
  const G = require(ENGINE);
  const errs = [];
  const ids = new Set();
  for (const c of G.CATEGORY_ORDER) {
    const all = G.TRAITS[c].concat(G.ONE_OF_ONE_EXCLUSIVES[c] || []);
    for (const t of all) {
      const k = c + ':' + t.id;
      if (ids.has(k)) errs.push('duplicate trait id ' + k);
      ids.add(k);
      if (!['common', 'uncommon', 'rare'].includes(t.rarity)) errs.push('bad rarity ' + k);
    }
    for (const id of G.ONE_OF_ONE_PICKERS[c]) if (!G.findTrait(c, id)) errs.push('1/1 picker references missing ' + c + ':' + id);
  }
  const batch = G.generateBatch({ count: 400, oneOfOnes: 40, seed: 'build-check' });
  if (batch.dupes) errs.push(batch.dupes + ' duplicate combos in 400-piece check');
  for (const p of batch.pieces) {
    const s = G.renderSVG(p);
    if (/NaN|undefined/.test(s)) { errs.push('render error on piece ' + p.index); break; }
  }
  return errs;
}

const check = process.argv.includes('--check');
const html = build();
if (check) {
  const errs = sanity();
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== html) errs.push('index.html is stale; run: node build.js');
  if (errs.length) { console.error('✗ check failed:\n  ' + errs.join('\n  ')); process.exit(1); }
  console.log('✓ check passed: engine sane, index.html up to date');
} else {
  fs.writeFileSync(OUT, html);
  console.log('✓ built index.html (' + (html.length / 1024).toFixed(1) + ' KB)');
}
