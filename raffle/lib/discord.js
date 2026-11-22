'use strict';
// Minimal Discord OAuth2 + REST helpers (no SDK).
const API = 'https://discord.com/api/v10';
const SCOPES = 'identify guilds.members.read';

class DiscordError extends Error {
  constructor(message, status, retryAfter) { super(message); this.status = status; this.retryAfter = retryAfter; }
}

function authorizeUrl(cfg, state) {
  const p = new URLSearchParams({
    client_id: cfg.discordClientId,
    redirect_uri: cfg.baseUrl + '/auth/discord/callback',
    response_type: 'code',
    scope: SCOPES,
    state,
    prompt: 'none',
  });
  return 'https://discord.com/oauth2/authorize?' + p;
}

async function tokenRequest(cfg, params) {
  const res = await fetch(API + '/oauth2/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: cfg.discordClientId, client_secret: cfg.discordClientSecret, ...params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new DiscordError('Discord token exchange failed (' + res.status + ')', res.status);
  const t = await res.json();
  return { accessToken: t.access_token, refreshToken: t.refresh_token, expiresAt: Date.now() + t.expires_in * 1000, scope: t.scope };
}

const exchangeCode = (cfg, code) =>
  tokenRequest(cfg, { grant_type: 'authorization_code', code, redirect_uri: cfg.baseUrl + '/auth/discord/callback' });
const refreshToken = (cfg, refresh) => tokenRequest(cfg, { grant_type: 'refresh_token', refresh_token: refresh });

async function api(token, path) {
  const res = await fetch(API + path, { headers: { authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(10000) });
  if (res.status === 429) {
    const body = await res.json().catch(() => ({}));
    throw new DiscordError('Discord is rate limiting us, try again in a few seconds.', 429, body.retry_after || 5);
  }
  return res;
}

async function getMe(token) {
  const res = await api(token, '/users/@me');
  if (!res.ok) throw new DiscordError('Could not read your Discord profile (' + res.status + ')', res.status);
  return res.json();
}

/** Member object ({ roles, joined_at, nick }) or null if not in the guild. */
async function getMember(token, guildId) {
  const res = await api(token, `/users/@me/guilds/${guildId}/member`);
  if (res.status === 404 || res.status === 403) return null;
  if (res.status === 401) throw new DiscordError('Discord session expired, please reconnect Discord.', 401);
  if (!res.ok) throw new DiscordError('Could not check Discord membership (' + res.status + ')', res.status);
  return res.json();
}

function snowflakeDate(id) {
  return new Date(Number((BigInt(id) >> 22n) + 1420070400000n));
}

function avatarUrl(user) {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=96`;
  const idx = Number((BigInt(user.id) >> 22n) % 6n);
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

async function postWebhook(url, payload) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new DiscordError('Webhook failed (' + res.status + ')', res.status);
}

module.exports = { DiscordError, authorizeUrl, exchangeCode, refreshToken, getMe, getMember, snowflakeDate, avatarUrl, postWebhook };
