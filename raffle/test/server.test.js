'use strict';
const test = require('node:test');
const assert = require('node:assert');
const { createApp, loadConfig } = require('../server.js');
const { Store } = require('../lib/store');
const fair = require('../public/fair.js');
const realDiscord = require('../lib/discord');

const ROLE = '111111111111111111';
const GUILD = '222222222222222222';

function client(base) {
  let cookies = {};
  async function req(path, body, method) {
    const res = await fetch(base + path, {
      method: method || (body === undefined ? 'GET' : 'POST'),
      redirect: 'manual',
      headers: { cookie: Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '), ...(body !== undefined ? { 'content-type': 'application/json' } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      cookies[kv.slice(0, i)] = kv.slice(i + 1);
    }
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch {}
    return { status: res.status, json, text, location: res.headers.get('location') };
  }
  return { req, cookies: () => cookies };
}

async function boot(deps = {}, env = {}) {
  const cfg = loadConfig({ SESSION_SECRET: 'test', DEV_LOGIN: '1', SITE_NAME: 'Test', DISCORD_CLIENT_ID: 'cid', DISCORD_CLIENT_SECRET: 'sec', ...env });
  cfg.dataFile = null;
  const server = createApp(cfg, { store: new Store(null), rateLimit: false, ...deps });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  cfg.baseUrl = base;
  return { server, base };
}

test('full raffle flow', async (t) => {
  const tweets = {};
  const { server, base } = await boot({ fetchOEmbed: async (h, id) => tweets[id] || null });
  t.after(() => server.close());

  const admin = client(base);
  await admin.req('/auth/dev?name=admin');
  assert.strictEqual((await admin.req('/api/me')).json.isAdmin, true);

  const bad = await admin.req('/api/admin/raffles', { title: '', winners: 1, endsAt: new Date(Date.now() + 1e6).toISOString() });
  assert.strictEqual(bad.status, 400);

  const created = await admin.req('/api/admin/raffles', {
    title: 'Ink Pups WL', collection: 'Ink Pups', chain: 'eth', winners: 2,
    endsAt: new Date(Date.now() + 3600e3).toISOString(), xFollow: '@inkpups, https://x.com/artist',
    guildId: GUILD, guildName: 'Cook With Mattie', roles: `${ROLE}:Holder`, minAccountAgeDays: 30,
  });
  assert.strictEqual(created.status, 200, created.text);
  const r = created.json.raffle;
  assert.deepStrictEqual(r.xFollow, ['inkpups', 'artist']);
  assert.ok(!('seed' in r) && /^[0-9a-f]{64}$/.test(r.seedHash));

  // Not logged in
  const anon = client(base);
  assert.strictEqual((await anon.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + '1'.repeat(40) })).json.code, 'login_required');
  // CSRF guard: non-JSON POST rejected
  const form = await fetch(base + `/api/raffles/${r.slug}/enter`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'a=1' });
  assert.strictEqual(form.status, 415);

  const users = [];
  for (let i = 0; i < 6; i++) {
    const c = client(base);
    await c.req(`/auth/dev?name=user${i}&roles=${ROLE}`);
    // X link via tweet code
    let res = await c.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + String(i).repeat(40) });
    assert.strictEqual(res.json.code, 'x_required');
    res = await c.req('/api/x/start', { handle: '@user' + i });
    const code = res.json.user.x.pendingCode;
    tweets['10000' + i] = { author_url: 'https://twitter.com/user' + i, html: 'hi ' + code };
    res = await c.req('/api/x/verify', { tweetUrl: `https://x.com/user${i}/status/10000${i}` });
    assert.strictEqual(res.json.user.x.verified, true, res.text);
    res = await c.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + String(i).repeat(40) });
    assert.strictEqual(res.json.code, 'follow_required');
    await c.req(`/api/raffles/${r.slug}/follow`, { handle: 'inkpups' });
    await c.req(`/api/raffles/${r.slug}/follow`, { handle: 'ARTIST' });
    res = await c.req(`/api/raffles/${r.slug}/enter`, { wallet: '0xnope' });
    assert.strictEqual(res.json.code, 'bad_wallet');
    res = await c.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + String(i + 1).repeat(40) });
    assert.strictEqual(res.status, 200, res.text);
    users.push(c);
  }
  // update wallet keeps same entry id
  const before = (await users[0].req(`/api/raffles/${r.slug}`)).json.raffle.myEntry;
  await users[0].req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'a'.repeat(40) });
  const after = (await users[0].req(`/api/raffles/${r.slug}`)).json.raffle.myEntry;
  assert.strictEqual(before.id, after.id);
  assert.strictEqual(after.wallet, '0x' + 'a'.repeat(40));

  // Someone else's X handle cannot be claimed
  const thief = client(base);
  await thief.req(`/auth/dev?name=thief&roles=${ROLE}`);
  assert.strictEqual((await thief.req('/api/x/start', { handle: 'user1' })).json.code, 'x_taken');
  await thief.req('/api/x/start', { handle: 'thief' });
  // handle mode is off: unverified handle cannot enter
  assert.strictEqual((await thief.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'b'.repeat(40) })).json.code, 'x_required');
  // Tweet from another account does not verify
  tweets['999999'] = { author_url: 'https://twitter.com/user1', html: 'x' };
  assert.strictEqual((await thief.req('/api/x/verify', { tweetUrl: 'https://x.com/user1/status/999999' })).status, 400);

  // Guild gates
  const outsider = client(base);
  await outsider.req('/auth/dev?name=outsider&member=0');
  await outsider.req('/api/x/start', { handle: 'outsider' });
  const oc = (await outsider.req('/api/me')).json.user.x.pendingCode;
  tweets['777777'] = { author_url: 'https://twitter.com/outsider', html: oc };
  await outsider.req('/api/x/verify', { tweetUrl: 'https://x.com/outsider/status/777777' });
  await outsider.req(`/api/raffles/${r.slug}/follow`, { handle: 'inkpups' });
  await outsider.req(`/api/raffles/${r.slug}/follow`, { handle: 'artist' });
  assert.strictEqual((await outsider.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'c'.repeat(40) })).json.code, 'not_in_guild');
  const norole = client(base);
  await norole.req('/auth/dev?name=outsider&roles=999');
  assert.strictEqual((await norole.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'c'.repeat(40) })).json.code, 'missing_role');
  // duplicate wallet
  await norole.req(`/auth/dev?name=outsider&roles=${ROLE}`);
  assert.strictEqual((await norole.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + '2'.repeat(40) })).json.code, 'wallet_taken');
  // too-new account
  const fresh = client(base);
  await fresh.req(`/auth/dev?name=fresh&roles=${ROLE}&ageDays=2`);
  assert.strictEqual((await fresh.req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'd'.repeat(40) })).json.code, 'account_too_new');

  // Non-admin cannot draw; draw needs closed raffle
  assert.strictEqual((await users[0].req(`/api/admin/raffles/${r.id}/draw`, {})).status, 403);
  assert.strictEqual((await admin.req(`/api/admin/raffles/${r.id}/draw`, {})).status, 400);
  // Proof not revealed before draw
  assert.strictEqual((await anon.req(`/api/raffles/${r.slug}/proof`)).json.revealed, false);

  assert.strictEqual((await admin.req(`/api/admin/raffles/${r.id}/close`, {})).status, 200);
  assert.strictEqual((await users[1].req(`/api/raffles/${r.slug}/enter`, { wallet: '0x' + 'e'.repeat(40) })).json.code, 'not_open');
  const drawn = await admin.req(`/api/admin/raffles/${r.id}/draw`, {});
  assert.strictEqual(drawn.status, 200, drawn.text);

  // Public result + independent verification
  const pub = (await anon.req(`/api/raffles/${r.slug}`)).json.raffle;
  assert.strictEqual(pub.winnerList.length, 2);
  assert.ok(pub.winnerList[0].wallet.includes('…'), 'wallets masked publicly');
  const proof = (await anon.req(`/api/raffles/${r.slug}/proof`)).json;
  assert.strictEqual(await fair.sha256Hex(proof.seed), r.seedHash);
  const { order } = await fair.shuffle(proof.seed, proof.entryIds);
  assert.deepStrictEqual(fair.pickWinners(order, 2, []), pub.winnerList.map((w) => w.entryId));

  // Reroll
  const dq = pub.winnerList[0].entryId;
  assert.strictEqual((await admin.req(`/api/admin/raffles/${r.id}/disqualify`, { entryId: dq, reason: 'unfollowed' })).status, 200);
  const pub2 = (await anon.req(`/api/raffles/${r.slug}`)).json.raffle;
  assert.deepStrictEqual(pub2.winnerList.map((w) => w.entryId), fair.pickWinners(order, 2, [dq]));

  // CSV
  const csv = await admin.req(`/api/admin/raffles/${r.id}/export.csv?winners=1`);
  assert.strictEqual(csv.text.trim().split('\n').length, 3);
  assert.match(csv.text, /^entry_id,discord_id/);
  assert.strictEqual((await anon.req(`/api/admin/raffles/${r.id}/export.csv`)).status, 401);

  // SPA routes serve HTML
  const page = await anon.req(`/r/${r.slug}`);
  assert.match(page.text, /<main id="app"/);
});

test('discord oauth round trip + live membership check', async (t) => {
  const calls = [];
  const discord = {
    ...realDiscord,
    exchangeCode: async (cfg, code) => (calls.push(['exchange', code]), { accessToken: 'at', refreshToken: 'rt', expiresAt: Date.now() + 3600e3 }),
    refreshToken: async () => { throw new Error('nope'); },
    getMe: async () => ({ id: '80351110224678912', username: 'nelly', global_name: 'Nelly', avatar: null }),
    getMember: async (tok, gid) => (calls.push(['member', gid]), gid === GUILD ? { roles: [ROLE] } : null),
  };
  const { server, base } = await boot({ discord }, { ADMIN_DISCORD_IDS: '80351110224678912', DEV_LOGIN: '0', X_VERIFY_MODE: 'handle' });
  t.after(() => server.close());
  const c = client(base);
  const start = await c.req('/auth/discord?next=/admin');
  assert.strictEqual(start.status, 302);
  const u = new URL(start.location);
  assert.strictEqual(u.searchParams.get('scope'), 'identify guilds.members.read');
  // Wrong state rejected
  assert.strictEqual((await c.req('/auth/discord/callback?code=x&state=wrong')).status, 400);
  const st = await c.req('/auth/discord?next=/admin');
  const state = new URL(st.location).searchParams.get('state');
  const cb = await c.req(`/auth/discord/callback?code=abc&state=${state}`);
  assert.strictEqual(cb.status, 302);
  assert.strictEqual(cb.location, '/admin');
  const me = (await c.req('/api/me')).json;
  assert.strictEqual(me.user.username, 'nelly');
  assert.strictEqual(me.isAdmin, true);
  assert.strictEqual((await c.req('/auth/dev?name=x')).status, 404, 'dev login disabled');

  const { raffle } = (await c.req('/api/admin/raffles', { title: 'BTC drop', chain: 'btc', taprootOnly: true, winners: 1, endsAt: new Date(Date.now() + 3600e3).toISOString(), guildId: GUILD, roles: ROLE })).json;
  await c.req('/api/x/start', { handle: 'nelly' }); // handle mode: no tweet needed
  let res = await c.req(`/api/raffles/${raffle.slug}/enter`, { wallet: 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq' });
  assert.strictEqual(res.json.code, 'bad_wallet');
  res = await c.req(`/api/raffles/${raffle.slug}/enter`, { wallet: 'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0' });
  assert.strictEqual(res.status, 200, res.text);
  assert.deepStrictEqual(calls.at(-1), ['member', GUILD]);
});
