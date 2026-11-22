'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fair = require('../public/fair.js');
const w = require('../lib/wallets');
const xv = require('../lib/xverify');
const { csvCell, safeNext } = require('../server.js');

test('fair shuffle is deterministic, a permutation, and seed-sensitive', async () => {
  const ids = Array.from({ length: 200 }, (_, i) => 'e' + i);
  const a = await fair.shuffle('aa'.repeat(32), ids);
  const b = await fair.shuffle('aa'.repeat(32), ids);
  const c = await fair.shuffle('bb'.repeat(32), ids);
  assert.deepStrictEqual(a.order, b.order);
  assert.notDeepStrictEqual(a.order, c.order);
  assert.deepStrictEqual([...a.order].sort(), [...ids].sort());
  assert.deepStrictEqual(fair.pickWinners(['x', 'y', 'z', 'q'], 2, ['y']), ['x', 'z']);
});

test('fair shuffle is roughly uniform', async () => {
  const counts = [0, 0, 0, 0];
  for (let i = 0; i < 2000; i++) {
    const { order } = await fair.shuffle(fair.newSeed(), ['0', '1', '2', '3']);
    counts[+order[0]]++;
  }
  for (const c of counts) assert.ok(c > 400 && c < 600, 'counts ' + counts);
});

test('eth addresses', () => {
  assert.ok(w.validateEth('0x52908400098527886E0F7030069857D2E4169EE7').ok);
  assert.ok(!w.validateEth('0x123').ok);
  assert.ok(!w.validateEth('0x' + '0'.repeat(40)).ok);
});

test('btc addresses', () => {
  assert.ok(w.validateBtc('BC1QW508D6QEJXTDG4C5R5ZSYVZWF3T4').ok === false); // garbage
  assert.ok(w.validateBtc('bc1qw508d6qejxtdg4c5r5zsyvzwfu2nadhr3fmtyz').ok === false); // bad checksum
  assert.ok(w.validateBtc('BC1QW508D6QEJXTDG4C5R5ZSYVZWF3T4').ok === false);
  assert.ok(w.validateBtc('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq').ok); // p2wpkh
  const tr = w.validateBtc('bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'); // BIP-350 vector
  assert.ok(tr.ok && tr.type === 'taproot', JSON.stringify(tr));
  assert.ok(!w.validateBtc('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq', { taprootOnly: true }).ok);
  assert.ok(w.validateBtc('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa').ok); // genesis
  assert.ok(w.validateBtc('3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy').ok);
  assert.ok(!w.validateBtc('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb').ok);
  assert.ok(!w.validateBtc('tb1qw508d6qejxtdg4c5r5x5ds9h8xgq3w9ah6zt4').ok); // testnet
  assert.ok(!w.validateBtc('bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdx').ok); // 1 char off
});

test('x helpers', () => {
  assert.strictEqual(xv.normalizeHandle('@Mattie_Cooks'), 'Mattie_Cooks');
  assert.strictEqual(xv.normalizeHandle('https://x.com/mattie?s=21'), 'mattie');
  assert.strictEqual(xv.normalizeHandle('not a handle!'), null);
  assert.deepStrictEqual(xv.parseTweetUrl('https://twitter.com/abc/status/1234567890?s=20'), { handle: 'abc', id: '1234567890' });
  assert.strictEqual(xv.parseTweetUrl('https://evil.com/abc/status/123456'), null);
  assert.match(xv.newCode(), /^RAFFLE-[A-Z2-9]{6}$/);
});

test('verifyTweet checks author and code', async () => {
  const fetcher = async () => ({ author_url: 'https://twitter.com/Alice', html: '<p>Verifying RAFFLE-ABCDEF</p>' });
  assert.ok((await xv.verifyTweet({ claimedHandle: 'alice', code: 'RAFFLE-ABCDEF', tweetUrl: 'https://x.com/alice/status/123456', fetcher })).ok);
  assert.ok(!(await xv.verifyTweet({ claimedHandle: 'bob', code: 'RAFFLE-ABCDEF', tweetUrl: 'https://x.com/alice/status/123456', fetcher })).ok);
  assert.ok(!(await xv.verifyTweet({ claimedHandle: 'alice', code: 'RAFFLE-ZZZZZZ', tweetUrl: 'https://x.com/alice/status/123456', fetcher })).ok);
  assert.ok(!(await xv.verifyTweet({ claimedHandle: 'alice', code: 'RAFFLE-ABCDEF', tweetUrl: 'https://x.com/alice/status/123456', fetcher: async () => null })).ok);
});

test('csv + redirect safety', () => {
  assert.strictEqual(csvCell('=HYPERLINK("x")'), '"\'=HYPERLINK(""x"")"');
  assert.strictEqual(safeNext('//evil.com'), '/');
  assert.strictEqual(safeNext('https://evil.com'), '/');
  assert.strictEqual(safeNext('/r/abc'), '/r/abc');
});
