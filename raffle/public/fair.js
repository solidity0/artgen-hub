/*
 * Provably-fair draw (commit–reveal).
 *
 * When a raffle is created the server picks a secret 32-byte seed and publishes
 * only sha256(seed). After entries close, the seed is revealed and the winners
 * are a Fisher–Yates shuffle of the entry ids driven by HMAC-SHA256(seed, …).
 * Anyone can re-run this file against the published seed + entry list and get
 * the exact same order. Uses WebCrypto only, so the same file runs in Node 20+
 * (server + tests) and in the browser (the "verify" panel).
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fair = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const enc = new TextEncoder();
  const subtle = () => globalThis.crypto.subtle;
  const toHex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

  async function sha256Hex(str) {
    return toHex(await subtle().digest('SHA-256', enc.encode(str)));
  }

  function newSeed() {
    const b = new Uint8Array(32);
    globalThis.crypto.getRandomValues(b);
    return toHex(b);
  }

  /** Shuffle entry ids (already in canonical order). Returns { listHash, order }. */
  async function shuffle(seedHex, entryIds) {
    const listHash = await sha256Hex(entryIds.join('\n'));
    const key = await subtle().importKey('raw', enc.encode(seedHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    let counter = 0;
    async function randBelow(n) {
      const limit = Math.floor(0x100000000 / n) * n; // rejection sampling: no modulo bias
      for (;;) {
        const mac = new Uint8Array(await subtle().sign('HMAC', key, enc.encode(listHash + ':' + counter++)));
        const x = mac[0] * 0x1000000 + mac[1] * 0x10000 + mac[2] * 0x100 + mac[3];
        if (x < limit) return x % n;
      }
    }
    const order = entryIds.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = await randBelow(i + 1);
      const t = order[i]; order[i] = order[j]; order[j] = t;
    }
    return { listHash, order };
  }

  /** Winners = first N of the shuffled order, skipping disqualified ids (rerolls). */
  function pickWinners(order, count, disqualified) {
    const dq = new Set(disqualified || []);
    return order.filter((id) => !dq.has(id)).slice(0, count);
  }

  return { sha256Hex, newSeed, shuffle, pickWinners };
});
