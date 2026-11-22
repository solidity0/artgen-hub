'use strict';
/*
 * Raffle server — zero dependencies, Node 20+.
 *
 *   Discord OAuth2 (required)  → identity, guild membership + role gates
 *   X account link (no X API)  → tweet-a-code, checked through X's public oEmbed
 *   X follow tasks             → follow intent links, tracked as "clicked"
 *   Wallets                    → ETH or BTC (taproot-only option for Ordinals)
 *   Draws                      → commit–reveal, verifiable in the browser
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { Store } = require('./lib/store');
const fair = require('./public/fair.js');
const wallets = require('./lib/wallets');
const xv = require('./lib/xverify');
const discordLib = require('./lib/discord');

const PUBLIC_DIR = path.join(__dirname, 'public');
const DAY = 86400000;

// ---------------------------------------------------------------- config
function loadConfig(env = process.env) {
  const port = Number(env.PORT) || 8787;
  // RENDER_EXTERNAL_URL / RAILWAY_PUBLIC_DOMAIN are set automatically by those hosts.
  const hostUrl = env.RENDER_EXTERNAL_URL || (env.RAILWAY_PUBLIC_DOMAIN ? 'https://' + env.RAILWAY_PUBLIC_DOMAIN : '');
  const baseUrl = (env.BASE_URL || hostUrl || `http://localhost:${port}`).replace(/\/+$/, '');
  const prod = env.NODE_ENV === 'production';
  let sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    if (prod) throw new Error('SESSION_SECRET must be set in production');
    sessionSecret = crypto.randomBytes(32).toString('hex');
    console.warn('[raffle] SESSION_SECRET not set — using a random one (sessions reset on restart).');
  }
  const list = (s) => String(s || '').split(/[\s,]+/).filter(Boolean);
  return {
    port,
    host: env.HOST || '0.0.0.0',
    baseUrl,
    secure: baseUrl.startsWith('https://'),
    sessionSecret,
    siteName: env.SITE_NAME || 'Raffix',
    defaultCollection: env.DEFAULT_COLLECTION || '',
    defaultXFollow: env.DEFAULT_X_FOLLOW || '',
    discordClientId: env.DISCORD_CLIENT_ID || '',
    discordClientSecret: env.DISCORD_CLIENT_SECRET || '',
    defaultGuildId: env.DISCORD_GUILD_ID || '',
    defaultGuildInvite: env.DISCORD_GUILD_INVITE || '',
    defaultGuildName: env.DISCORD_GUILD_NAME || '',
    admins: new Set(list(env.ADMIN_DISCORD_IDS)),
    dataFile: env.DATA_FILE || path.join(__dirname, 'data', 'raffle.json'),
    xVerifyMode: env.X_VERIFY_MODE === 'handle' ? 'handle' : 'tweet',
    webhookUrl: env.DISCORD_WEBHOOK_URL || '',
    devLogin: env.DEV_LOGIN === '1' && !prod,
    trustProxy: env.TRUST_PROXY === '1',
  };
}

// ---------------------------------------------------------------- helpers
class HttpError extends Error {
  constructor(status, message, code, extra) { super(message); this.status = status; this.code = code; this.extra = extra; }
}
const bad = (msg, code, extra) => new HttpError(400, msg, code, extra);

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const randId = (bytes = 6) => crypto.randomBytes(bytes).toString('hex');

function sign(secret, value) {
  return value + '.' + crypto.createHmac('sha256', secret).update(value).digest('base64url');
}
function unsign(secret, signed) {
  if (typeof signed !== 'string') return null;
  const i = signed.lastIndexOf('.');
  if (i < 1) return null;
  const value = signed.slice(0, i);
  const expect = Buffer.from(sign(secret, value));
  const got = Buffer.from(signed);
  return expect.length === got.length && crypto.timingSafeEqual(expect, got) ? value : null;
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function safeNext(next) {
  return typeof next === 'string' && /^\/(?!\/)[\w\-./?=&%#]*$/.test(next) ? next : '/';
}

function csvCell(v) {
  let s = v == null ? '' : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'raffle';
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

// ---------------------------------------------------------------- app
function createApp(cfg, deps = {}) {
  const store = deps.store || new Store(cfg.dataFile);
  const discord = deps.discord || discordLib;
  const fetchOEmbed = deps.fetchOEmbed || xv.fetchOEmbed;
  const now = deps.now || (() => Date.now());
  const db = store.data;

  // --- rate limiting (per Discord account when logged in, else per IP; writes only) ---
  const buckets = new Map();
  function rateLimit(ip, cost = 1) {
    if (deps.rateLimit === false) return;
    const t = now();
    const b = buckets.get(ip) || { tokens: 30, at: t };
    b.tokens = Math.min(30, b.tokens + ((t - b.at) / 1000) * 0.5); // 30 burst, refill 1 per 2s
    b.at = t;
    if (b.tokens < cost) throw new HttpError(429, 'Slow down a little and try again.', 'rate_limited');
    b.tokens -= cost;
    buckets.set(ip, b);
    if (buckets.size > 5000) for (const [k, v] of buckets) if (t - v.at > 600000) buckets.delete(k);
  }

  // --- sessions (stateless signed cookie: uid.expiry) ---
  const SESSION_DAYS = 14;
  function setCookie(res, name, value, maxAgeSec) {
    const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'HttpOnly', 'SameSite=Lax', `Max-Age=${maxAgeSec}`];
    if (cfg.secure) parts.push('Secure');
    const prev = res.getHeader('Set-Cookie') || [];
    res.setHeader('Set-Cookie', prev.concat(parts.join('; ')));
  }
  function startSession(res, uid) {
    const exp = now() + SESSION_DAYS * DAY;
    setCookie(res, 'sid', sign(cfg.sessionSecret, `${uid}:${exp}`), SESSION_DAYS * 86400);
  }
  function currentUser(req) {
    const v = unsign(cfg.sessionSecret, parseCookies(req.headers.cookie).sid);
    if (!v) return null;
    const [uid, exp] = v.split(':');
    if (!(Number(exp) > now())) return null;
    return db.users[uid] || null;
  }
  const isAdmin = (u) => !!u && (cfg.admins.has(u.id) || (cfg.devLogin && u.dev && u.username === 'admin'));

  // --- view models ---
  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      displayName: u.globalName || u.username,
      avatar: u.avatar,
      accountCreated: u.accountCreated,
      x: u.x && { handle: u.x.handle, verified: !!u.x.verified, pendingCode: u.x.verified ? undefined : u.x.code },
      follows: Object.keys(u.follows || {}),
      wallets: u.wallets || {},
      dev: !!u.dev,
    };
  }

  function raffleState(r) {
    if (r.status === 'cancelled' || r.status === 'drawn') return r.status;
    const t = now();
    if (t < Date.parse(r.startsAt)) return 'upcoming';
    if (t >= Date.parse(r.endsAt)) return 'closed';
    return 'open';
  }

  function winnersOf(r) {
    return r.order ? fair.pickWinners(r.order, r.winners, (r.disqualified || []).map((d) => d.entryId)) : [];
  }

  function publicRaffle(r, viewer, { full = false } = {}) {
    const entries = store.entriesFor(r.id);
    const out = {
      id: r.id, slug: r.slug, title: r.title, collection: r.collection, description: r.description,
      imageUrl: r.imageUrl, chain: r.chain, taprootOnly: !!r.taprootOnly, winners: r.winners,
      startsAt: r.startsAt, endsAt: r.endsAt, state: raffleState(r),
      xFollow: r.xFollow, requireX: r.requireX,
      guild: r.guildId ? { id: r.guildId, name: r.guildName || 'our Discord', invite: r.guildInvite || '', roles: r.roles || [] } : null,
      minAccountAgeDays: r.minAccountAgeDays || 0,
      entryCount: Object.keys(entries).length,
      seedHash: r.seedHash,
      drawnAt: r.drawnAt || null,
    };
    if (r.status === 'drawn') {
      const byId = new Map(Object.values(entries).map((e) => [e.id, e]));
      out.winnerList = winnersOf(r).map((id) => {
        const e = byId.get(id);
        return { entryId: id, discordName: e.discordName, xHandle: e.xHandle, wallet: wallets.maskWallet(e.wallet) };
      });
    }
    if (viewer) {
      const mine = entries[viewer.id];
      out.myEntry = mine ? { id: mine.id, wallet: mine.wallet, createdAt: mine.createdAt } : null;
      if (mine && out.winnerList) out.iWon = out.winnerList.some((w) => w.entryId === mine.id);
    }
    if (full) {
      out.status = r.status;
      out.guildId = r.guildId; out.guildName = r.guildName; out.guildInvite = r.guildInvite;
      out.disqualified = r.disqualified || [];
      out.createdAt = r.createdAt;
    }
    return out;
  }

  function canonicalEntries(raffleId) {
    return Object.values(store.entriesFor(raffleId)).sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id < b.id ? -1 : 1));
  }

  function findRaffle(key) {
    const r = db.raffles[key] || Object.values(db.raffles).find((x) => x.slug === key);
    if (!r) throw new HttpError(404, 'Raffle not found.', 'not_found');
    return r;
  }

  // --- Discord token handling ---
  async function discordToken(user) {
    const t = user.discordToken;
    if (!t) throw new HttpError(401, 'Please reconnect Discord.', 'discord_reauth');
    if (t.expiresAt > now() + 60000) return t.accessToken;
    try {
      user.discordToken = await discord.refreshToken(cfg, t.refreshToken);
      store.save();
      return user.discordToken.accessToken;
    } catch {
      throw new HttpError(401, 'Your Discord connection expired, please reconnect Discord.', 'discord_reauth');
    }
  }

  async function checkGuild(user, r) {
    if (!r.guildId) return;
    if (user.dev) {
      const m = user.devMember;
      if (!m) throw new HttpError(403, `You need to be in ${r.guildName || 'the Discord server'} to enter.`, 'not_in_guild', { invite: r.guildInvite });
      if (r.roles?.length && !r.roles.some((x) => m.roles.includes(x.id)))
        throw new HttpError(403, 'You need one of these roles: ' + r.roles.map((x) => x.name || x.id).join(', '), 'missing_role');
      return;
    }
    let member;
    try {
      member = await discord.getMember(await discordToken(user), r.guildId);
    } catch (e) {
      if (e instanceof HttpError) throw e;
      if (e.status === 401) throw new HttpError(401, e.message, 'discord_reauth');
      throw new HttpError(503, e.message, 'discord_unavailable');
    }
    if (!member) throw new HttpError(403, `You need to join ${r.guildName || 'the Discord server'} first.`, 'not_in_guild', { invite: r.guildInvite });
    if (member.pending) throw new HttpError(403, 'Finish the Discord membership screening (accept the rules) first.', 'guild_pending');
    if (r.roles?.length && !r.roles.some((x) => member.roles.includes(x.id)))
      throw new HttpError(403, 'You need one of these Discord roles: ' + r.roles.map((x) => x.name || x.id).join(', '), 'missing_role');
  }

  // --- raffle input validation (admin) ---
  function parseRaffleInput(body, existing) {
    const s = (v, max) => String(v ?? '').trim().slice(0, max);
    const title = s(body.title, 80);
    if (!title) throw bad('Title is required.');
    const chain = body.chain === 'btc' ? 'btc' : 'eth';
    const winners = Math.floor(Number(body.winners));
    if (!(winners >= 1 && winners <= 10000)) throw bad('Winners must be between 1 and 10000.');
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date(now());
    const endsAt = new Date(body.endsAt);
    if (isNaN(startsAt) || isNaN(endsAt)) throw bad('Start and end times must be valid dates.');
    if (endsAt <= startsAt) throw bad('End time must be after the start time.');
    const xFollow = [];
    for (const h of String(body.xFollow || '').split(/[\s,]+/).filter(Boolean)) {
      const n = xv.normalizeHandle(h);
      if (!n) throw bad(`"${h}" is not a valid X handle.`);
      if (!xFollow.some((x) => x.toLowerCase() === n.toLowerCase())) xFollow.push(n);
    }
    if (xFollow.length > 5) throw bad('At most 5 accounts to follow.');
    const guildId = s(body.guildId, 25);
    if (guildId && !/^\d{15,22}$/.test(guildId)) throw bad('Discord server ID must be a numeric snowflake.');
    const roles = [];
    for (const line of String(body.roles || '').split(/[\n,]+/).map((x) => x.trim()).filter(Boolean)) {
      const m = line.match(/^(\d{15,22})(?:\s*[:=]\s*(.+))?$/);
      if (!m) throw bad(`Role "${line}" should look like 123456789012345678:Holder`);
      roles.push({ id: m[1], name: (m[2] || '').trim().slice(0, 40) });
    }
    if (roles.length && !guildId) throw bad('Role gates need a Discord server ID.');
    const imageUrl = s(body.imageUrl, 500);
    if (imageUrl && !/^https:\/\//.test(imageUrl)) throw bad('Image URL must start with https://');
    const guildInvite = s(body.guildInvite, 200);
    if (guildInvite && !/^https:\/\/(discord\.gg|discord\.com\/invite)\//.test(guildInvite)) throw bad('Invite must be a discord.gg link.');
    return {
      title,
      collection: s(body.collection, 80),
      description: s(body.description, 2000),
      imageUrl,
      chain,
      taprootOnly: chain === 'btc' && !!body.taprootOnly,
      winners,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      xFollow,
      requireX: !!body.requireX || xFollow.length > 0,
      guildId,
      guildName: s(body.guildName, 60),
      guildInvite,
      roles,
      minAccountAgeDays: Math.max(0, Math.min(3650, Math.floor(Number(body.minAccountAgeDays) || 0))),
    };
  }

  // --- draw ---
  async function draw(r) {
    const list = canonicalEntries(r.id);
    const ids = list.map((e) => e.id);
    const { listHash, order } = await fair.shuffle(r.seed, ids);
    r.order = order;
    r.listHash = listHash;
    r.drawnAt = new Date(now()).toISOString();
    r.status = 'drawn';
    store.save();
  }

  async function announce(r) {
    if (!cfg.webhookUrl) throw bad('DISCORD_WEBHOOK_URL is not configured.');
    const entries = store.entriesFor(r.id);
    const byId = new Map(Object.values(entries).map((e) => [e.id, e]));
    const lines = winnersOf(r).map((id, i) => `${i + 1}. <@${byId.get(id).discordId}>${byId.get(id).xHandle ? ` (x.com/${byId.get(id).xHandle})` : ''}`);
    const head = `🎟️ **${r.title}** — ${lines.length} winner${lines.length === 1 ? '' : 's'} from ${Object.keys(entries).length} entries`;
    const tail = `Verify the draw: ${cfg.baseUrl}/r/${r.slug}`;
    // Discord caps messages at 2000 chars — chunk the list.
    const chunks = [];
    let cur = head;
    for (const l of lines) {
      if ((cur + '\n' + l).length > 1900) { chunks.push(cur); cur = l; } else cur += '\n' + l;
    }
    chunks.push(cur + '\n\n' + tail);
    for (const content of chunks) await discord.postWebhook(cfg.webhookUrl, { content, allowed_mentions: { parse: ['users'] } });
    r.announcedAt = new Date(now()).toISOString();
    store.save();
  }

  // ------------------------------------------------------------ routes
  const routes = [];
  const route = (method, pattern, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    routes.push({ method, re, keys, handler, ...opts });
  };

  function requireUser(ctx) {
    if (!ctx.user) throw new HttpError(401, 'Connect Discord first.', 'login_required');
    return ctx.user;
  }
  function requireAdmin(ctx) {
    const u = requireUser(ctx);
    if (!isAdmin(u)) throw new HttpError(403, 'Admins only.', 'forbidden');
    return u;
  }

  // public config + session
  route('GET', '/api/config', () => ({
    siteName: cfg.siteName,
    xVerifyMode: cfg.xVerifyMode,
    devLogin: cfg.devLogin,
    discordConfigured: !!(cfg.discordClientId && cfg.discordClientSecret),
  }));
  route('GET', '/api/me', (ctx) => ({ user: publicUser(ctx.user), isAdmin: isAdmin(ctx.user) }));
  route('POST', '/api/logout', (ctx) => {
    setCookie(ctx.res, 'sid', '', 0);
    return { ok: true };
  });

  // Discord OAuth
  route('GET', '/auth/discord', (ctx) => {
    if (!cfg.discordClientId) throw new HttpError(503, 'Discord login is not configured on this server.');
    const state = b64u(crypto.randomBytes(16));
    const next = safeNext(ctx.query.get('next'));
    setCookie(ctx.res, 'ost', sign(cfg.sessionSecret, state + '|' + next), 600);
    ctx.redirect(discord.authorizeUrl(cfg, state));
  });

  route('GET', '/auth/discord/callback', async (ctx) => {
    const cookie = unsign(cfg.sessionSecret, parseCookies(ctx.req.headers.cookie).ost);
    setCookie(ctx.res, 'ost', '', 0);
    const [state, next] = (cookie || '').split('|');
    if (ctx.query.get('error')) return ctx.redirect(safeNext(next) + (safeNext(next).includes('?') ? '&' : '?') + 'auth=cancelled');
    if (!state || state !== ctx.query.get('state')) throw bad('Login expired or was tampered with — please try again.');
    const token = await discord.exchangeCode(cfg, String(ctx.query.get('code') || ''));
    const me = await discord.getMe(token.accessToken);
    const u = (db.users[me.id] ||= { id: me.id, createdAt: new Date(now()).toISOString(), follows: {}, wallets: {} });
    Object.assign(u, {
      username: me.username,
      globalName: me.global_name || '',
      avatar: discord.avatarUrl(me),
      accountCreated: discord.snowflakeDate(me.id).toISOString(),
      discordToken: token,
      lastLoginAt: new Date(now()).toISOString(),
    });
    store.save();
    startSession(ctx.res, u.id);
    ctx.redirect(safeNext(next));
  });

  // Local testing without a Discord app: /auth/dev?name=alice&member=1&roles=123
  route('GET', '/auth/dev', (ctx) => {
    if (!cfg.devLogin) throw new HttpError(404, 'Not found');
    const name = (ctx.query.get('name') || 'tester').replace(/[^\w]/g, '').slice(0, 20) || 'tester';
    const id = 'dev' + crypto.createHash('sha256').update(name).digest('hex').slice(0, 12);
    const u = (db.users[id] ||= { id, createdAt: new Date(now()).toISOString(), follows: {}, wallets: {} });
    Object.assign(u, {
      dev: true,
      username: name,
      globalName: name,
      avatar: 'https://cdn.discordapp.com/embed/avatars/0.png',
      accountCreated: new Date(now() - Number(ctx.query.get('ageDays') || 400) * DAY).toISOString(),
      devMember: ctx.query.get('member') === '0' ? null : { roles: String(ctx.query.get('roles') || '').split(',').filter(Boolean) },
    });
    store.save();
    startSession(ctx.res, id);
    ctx.redirect(safeNext(ctx.query.get('next')));
  });

  // X linking
  route('POST', '/api/x/start', (ctx) => {
    const u = requireUser(ctx);
    const handle = xv.normalizeHandle(ctx.body.handle);
    if (!handle) throw bad('Enter your X handle, e.g. @yourname');
    const owner = db.xHandles[handle.toLowerCase()];
    if (owner && owner !== u.id) throw bad(`@${handle} is already linked to another Discord account.`, 'x_taken');
    if (u.x?.verified && u.x.handle.toLowerCase() !== handle.toLowerCase()) delete db.xHandles[u.x.handle.toLowerCase()];
    if (cfg.xVerifyMode === 'handle') {
      u.x = { handle, verified: false, linkedAt: new Date(now()).toISOString() };
      db.xHandles[handle.toLowerCase()] = u.id;
    } else {
      u.x = { handle, verified: false, code: xv.newCode(), startedAt: new Date(now()).toISOString() };
    }
    store.save();
    return { user: publicUser(u) };
  });

  route('POST', '/api/x/verify', async (ctx) => {
    const u = requireUser(ctx);
    if (!u.x?.code) throw bad('Start by entering your X handle.');
    rateLimit(ctx.rlKey, 3);
    const r = await xv.verifyTweet({ claimedHandle: u.x.handle, code: u.x.code, tweetUrl: ctx.body.tweetUrl, fetcher: fetchOEmbed });
    if (!r.ok) throw bad(r.error, 'x_verify_failed');
    const key = r.handle.toLowerCase();
    const owner = db.xHandles[key];
    if (owner && owner !== u.id) throw bad(`@${r.handle} is already linked to another Discord account.`, 'x_taken');
    db.xHandles[key] = u.id;
    u.x = { handle: r.handle, verified: true, verifiedAt: new Date(now()).toISOString(), proof: String(ctx.body.tweetUrl).slice(0, 200) };
    store.save();
    return { user: publicUser(u) };
  });

  route('POST', '/api/x/unlink', (ctx) => {
    const u = requireUser(ctx);
    if (u.x && db.xHandles[u.x.handle.toLowerCase()] === u.id) delete db.xHandles[u.x.handle.toLowerCase()];
    u.x = null;
    store.save();
    return { user: publicUser(u) };
  });

  // Raffles (public)
  route('GET', '/api/raffles', (ctx) => {
    const list = Object.values(db.raffles)
      .filter((r) => r.status !== 'cancelled')
      .map((r) => publicRaffle(r, ctx.user))
      .sort((a, b) => (a.endsAt < b.endsAt ? 1 : -1));
    return { raffles: list };
  });

  route('GET', '/api/raffles/:key', (ctx) => {
    const r = findRaffle(ctx.params.key);
    if (r.status === 'cancelled' && !isAdmin(ctx.user)) throw new HttpError(404, 'Raffle not found.');
    return { raffle: publicRaffle(r, ctx.user) };
  });

  route('GET', '/api/raffles/:key/proof', (ctx) => {
    const r = findRaffle(ctx.params.key);
    if (r.status !== 'drawn') return { seedHash: r.seedHash, revealed: false };
    return {
      revealed: true,
      seed: r.seed,
      seedHash: r.seedHash,
      listHash: r.listHash,
      entryIds: canonicalEntries(r.id).map((e) => e.id),
      winners: r.winners,
      disqualified: (r.disqualified || []).map((d) => d.entryId),
    };
  });

  route('POST', '/api/raffles/:key/follow', (ctx) => {
    const u = requireUser(ctx);
    const r = findRaffle(ctx.params.key);
    const h = r.xFollow.find((x) => x.toLowerCase() === String(ctx.body.handle || '').toLowerCase());
    if (!h) throw bad('That account is not part of this raffle.');
    (u.follows ||= {})[h.toLowerCase()] = new Date(now()).toISOString();
    store.save();
    return { user: publicUser(u) };
  });

  route('POST', '/api/raffles/:key/enter', async (ctx) => {
    const u = requireUser(ctx);
    rateLimit(ctx.rlKey, 2);
    const r = findRaffle(ctx.params.key);
    const state = raffleState(r);
    if (state !== 'open') throw bad(state === 'upcoming' ? 'This raffle has not started yet.' : 'This raffle is closed.', 'not_open');

    if (r.minAccountAgeDays) {
      const ageDays = (now() - Date.parse(u.accountCreated)) / DAY;
      if (ageDays < r.minAccountAgeDays) throw new HttpError(403, `Your Discord account must be at least ${r.minAccountAgeDays} days old.`, 'account_too_new');
    }
    if (r.requireX) {
      if (!u.x || (cfg.xVerifyMode === 'tweet' && !u.x.verified)) throw new HttpError(403, 'Link your X account first.', 'x_required');
    }
    const missing = r.xFollow.filter((h) => !(u.follows || {})[h.toLowerCase()]);
    if (missing.length) throw new HttpError(403, 'Follow ' + missing.map((h) => '@' + h).join(', ') + ' on X first.', 'follow_required');

    const w = wallets.validateWallet(r.chain, ctx.body.wallet, { taprootOnly: r.taprootOnly });
    if (!w.ok) throw bad(w.error, 'bad_wallet');

    await checkGuild(u, r); // last: it is the only step that calls Discord

    const entries = store.entriesFor(r.id);
    const dupe = Object.values(entries).find((e) => e.discordId !== u.id && e.wallet.toLowerCase() === w.address.toLowerCase());
    if (dupe) throw bad('That wallet is already entered by someone else.', 'wallet_taken');

    const t = new Date(now()).toISOString();
    const existing = entries[u.id];
    entries[u.id] = {
      id: existing?.id || randId(5),
      discordId: u.id,
      discordName: u.username,
      xHandle: u.x?.handle || '',
      wallet: w.address,
      walletType: w.type,
      createdAt: existing?.createdAt || t,
      updatedAt: t,
    };
    (u.wallets ||= {})[r.chain] = w.address;
    store.save();
    return { raffle: publicRaffle(r, u), updated: !!existing };
  });

  route('POST', '/api/raffles/:key/leave', (ctx) => {
    const u = requireUser(ctx);
    const r = findRaffle(ctx.params.key);
    if (raffleState(r) !== 'open') throw bad('This raffle is closed.');
    delete store.entriesFor(r.id)[u.id];
    store.save();
    return { raffle: publicRaffle(r, u) };
  });

  // Admin
  route('GET', '/api/admin/raffles', (ctx) => {
    requireAdmin(ctx);
    const list = Object.values(db.raffles).map((r) => publicRaffle(r, null, { full: true })).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    return { raffles: list, webhook: !!cfg.webhookUrl, defaults: { guildId: cfg.defaultGuildId, guildInvite: cfg.defaultGuildInvite, guildName: cfg.defaultGuildName, collection: cfg.defaultCollection, xFollow: cfg.defaultXFollow.split(/[\s,]+/).filter(Boolean) } };
  });

  route('POST', '/api/admin/raffles', async (ctx) => {
    const u = requireAdmin(ctx);
    const input = parseRaffleInput(ctx.body);
    const id = randId(6);
    let slug = slugify(input.title);
    if (Object.values(db.raffles).some((r) => r.slug === slug)) slug += '-' + id.slice(0, 4);
    const seed = fair.newSeed();
    db.raffles[id] = { id, slug, ...input, status: 'open', seed, seedHash: await fair.sha256Hex(seed), createdBy: u.id, createdAt: new Date(now()).toISOString() };
    store.save();
    return { raffle: publicRaffle(db.raffles[id], null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/update', (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status !== 'open') throw bad('Only raffles that have not been drawn can be edited.');
    const input = parseRaffleInput(ctx.body);
    if (input.chain !== r.chain && Object.keys(store.entriesFor(r.id)).length) throw bad('Cannot change the chain once people have entered.');
    Object.assign(r, input);
    store.save();
    return { raffle: publicRaffle(r, null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/close', (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status !== 'open') throw bad('Raffle is not open.');
    r.endsAt = new Date(Math.min(Date.parse(r.endsAt), now())).toISOString();
    store.save();
    return { raffle: publicRaffle(r, null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/draw', async (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status === 'drawn') throw bad('Already drawn.');
    if (r.status === 'cancelled') throw bad('Raffle was cancelled.');
    if (raffleState(r) !== 'closed') throw bad('Close the raffle before drawing (entries must be final).');
    if (!Object.keys(store.entriesFor(r.id)).length) throw bad('Nobody entered.');
    await draw(r);
    return { raffle: publicRaffle(r, null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/disqualify', (ctx) => {
    const admin = requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status !== 'drawn') throw bad('Draw first.');
    const entryId = String(ctx.body.entryId || '');
    if (!winnersOf(r).includes(entryId)) throw bad('That entry is not a current winner.');
    (r.disqualified ||= []).push({ entryId, reason: String(ctx.body.reason || '').slice(0, 200), by: admin.id, at: new Date(now()).toISOString() });
    store.save();
    return { raffle: publicRaffle(r, null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/cancel', (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status === 'drawn') throw bad('Already drawn.');
    r.status = 'cancelled';
    store.save();
    return { raffle: publicRaffle(r, null, { full: true }) };
  });

  route('POST', '/api/admin/raffles/:key/announce', async (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    if (r.status !== 'drawn') throw bad('Draw first.');
    await announce(r);
    return { ok: true };
  });

  route('GET', '/api/admin/raffles/:key/entries', (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    const win = new Set(winnersOf(r));
    const rank = new Map((r.order || []).map((id, i) => [id, i + 1]));
    const dq = new Map((r.disqualified || []).map((d) => [d.entryId, d.reason]));
    return {
      entries: canonicalEntries(r.id).map((e) => ({ ...e, rank: rank.get(e.id) || null, winner: win.has(e.id), disqualified: dq.has(e.id) ? dq.get(e.id) || 'yes' : null })),
    };
  });

  route('GET', '/api/admin/raffles/:key/export.csv', (ctx) => {
    requireAdmin(ctx);
    const r = findRaffle(ctx.params.key);
    const onlyWinners = ctx.query.get('winners') === '1';
    const win = winnersOf(r);
    const winSet = new Set(win);
    const rank = new Map((r.order || []).map((id, i) => [id, i + 1]));
    const dq = new Set((r.disqualified || []).map((d) => d.entryId));
    let rows = canonicalEntries(r.id);
    if (onlyWinners) rows = win.map((id) => rows.find((e) => e.id === id));
    const lines = [['entry_id', 'discord_id', 'discord_name', 'x_handle', 'wallet', 'wallet_type', 'entered_at', 'draw_rank', 'winner', 'disqualified']];
    for (const e of rows) lines.push([e.id, e.discordId, e.discordName, e.xHandle, e.wallet, e.walletType, e.createdAt, rank.get(e.id) || '', winSet.has(e.id) ? 'yes' : '', dq.has(e.id) ? 'yes' : '']);
    ctx.res.writeHead(200, {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${r.slug}${onlyWinners ? '-winners' : '-entries'}.csv"`,
    });
    ctx.res.end(lines.map((l) => l.map(csvCell).join(',')).join('\n') + '\n');
    return ctx.HANDLED;
  });

  // ------------------------------------------------------------ server
  const HANDLED = Symbol('handled');

  function serveStatic(req, res, pathname) {
    let file = pathname === '/' ? '/index.html' : pathname;
    let full = path.join(PUBLIC_DIR, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
    if (!full.startsWith(PUBLIC_DIR) || !fs.existsSync(full) || fs.statSync(full).isDirectory()) {
      // SPA routes
      if (/^\/(r\/[^/]+|admin)?\/?$/.test(pathname)) full = path.join(PUBLIC_DIR, 'index.html');
      else return false;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(full)] || 'application/octet-stream',
      'cache-control': full.endsWith('index.html') ? 'no-cache' : 'public, max-age=300',
    });
    fs.createReadStream(full).pipe(res);
    return true;
  }

  async function readBody(req) {
    if (req.method !== 'POST') return {};
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 32 * 1024) throw new HttpError(413, 'Request too large.');
      chunks.push(c);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { throw bad('Invalid JSON body.'); }
  }

  async function handle(req, res) {
    const url = new URL(req.url, 'http://x');
    const pathname = url.pathname;
    const ip = (cfg.trustProxy && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress || '?';
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'same-origin');
    res.setHeader('x-frame-options', 'DENY');
    res.setHeader(
      'content-security-policy',
      "default-src 'self'; img-src 'self' https: data:; style-src 'self' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    );

    const match = routes.find((r) => r.method === req.method && r.re.test(pathname));
    const isApi = pathname.startsWith('/api/') || pathname.startsWith('/auth/');
    if (!match) {
      if (req.method === 'GET' && !isApi && serveStatic(req, res, pathname)) return;
      return sendError(res, new HttpError(404, 'Not found.', 'not_found'), isApi);
    }
    const ctx = {
      req, res, ip, HANDLED,
      query: url.searchParams,
      params: Object.fromEntries(match.keys.map((k, i) => [k, decodeURIComponent(pathname.match(match.re)[i + 1])])),
      user: currentUser(req),
      get rlKey() { return this.user ? 'u:' + this.user.id : 'ip:' + ip; },
      redirect(to) { res.writeHead(302, { location: to }); res.end(); return HANDLED; },
    };
    try {
      if (req.method === 'POST') {
        // CSRF: SameSite=Lax cookies + require a JSON content type (not sendable cross-site without CORS preflight).
        if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Expected JSON.');
        rateLimit(ctx.rlKey, 1);
      }
      ctx.body = await readBody(req);
      const out = await match.handler(ctx);
      if (res.headersSent || out === HANDLED) return;
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify(out));
    } catch (e) {
      sendError(res, e, pathname.startsWith('/api/'));
    }
  }

  function sendError(res, e, json) {
    const status = e instanceof HttpError ? e.status : e?.status === 429 ? 429 : 500;
    if (status === 500) console.error('[raffle]', e);
    const message = status === 500 ? 'Something went wrong on our side.' : e.message;
    if (res.headersSent) return res.end();
    if (json) {
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ error: message, code: e.code, ...(e.extra || {}) }));
    } else {
      res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' });
      res.end(`<!doctype html><meta charset="utf-8"><title>Error</title><body style="font-family:sans-serif;background:#080808;color:#f0f0f0;padding:40px"><p>${String(message).replace(/[<>&"]/g, (c) => `&#${c.charCodeAt(0)};`)}</p><p><a style="color:#f7931a" href="/">Back to raffles</a></p>`);
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((e) => sendError(res, e, true));
  });
  server.store = store;
  return server;
}

module.exports = { createApp, loadConfig, csvCell, safeNext, sign, unsign };

if (require.main === module) {
  const cfg = loadConfig();
  const server = createApp(cfg);
  const flush = () => { try { server.store.flush(); } catch (e) { console.error(e); } process.exit(0); };
  process.on('SIGINT', flush);
  process.on('SIGTERM', flush);
  server.listen(cfg.port, cfg.host, () => {
    console.log(`[raffle] ${cfg.siteName} on ${cfg.baseUrl}`);
    console.log(`[raffle] Discord redirect URL: ${cfg.baseUrl}/auth/discord/callback`);
    if (!cfg.discordClientId) console.warn('[raffle] DISCORD_CLIENT_ID/SECRET not set — Discord login disabled.');
    if (!cfg.admins.size) console.warn('[raffle] ADMIN_DISCORD_IDS is empty — nobody can create raffles.');
    if (cfg.devLogin) console.warn('[raffle] DEV_LOGIN is on — /auth/dev lets anyone log in as anyone. Never use in production.');
  });
}
