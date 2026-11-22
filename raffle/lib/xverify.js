'use strict';
// Link an X account WITHOUT the X API.
//
// 1. The user claims a handle and gets a one-time code.
// 2. They post a tweet containing the code (we hand them a prefilled intent link).
// 3. They paste the tweet URL. We fetch X's public, key-less oEmbed endpoint
//    (publish.twitter.com/oembed — the thing that powers embedded tweets),
//    which returns the tweet author and text. If the author matches the
//    claimed handle and the text contains the code, the account is verified.
//
// Follows cannot be verified without the API; they are tracked as "follow
// intent clicked" and winners can be spot-checked by mods before payout.

const HANDLE_RE = /^[A-Za-z0-9_]{1,15}$/;
const TWEET_RE = /^https?:\/\/(?:www\.|mobile\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})(?:[/?#].*)?$/i;

function normalizeHandle(input) {
  let h = String(input || '').trim();
  const m = h.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i);
  if (m) h = m[1];
  h = h.replace(/^@/, '');
  return HANDLE_RE.test(h) ? h : null;
}

function parseTweetUrl(url) {
  const m = String(url || '').trim().match(TWEET_RE);
  return m ? { handle: m[1], id: m[2] } : null;
}

function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const b = new Uint8Array(6);
  globalThis.crypto.getRandomValues(b);
  return 'RAFFLE-' + Array.from(b, (x) => alphabet[x % alphabet.length]).join('');
}

async function fetchOEmbed(handle, id) {
  const target = `https://twitter.com/${handle}/status/${id}`;
  const url = 'https://publish.twitter.com/oembed?omit_script=true&dnt=true&url=' + encodeURIComponent(target);
  const res = await fetch(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(8000) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('X embed service returned ' + res.status);
  return res.json();
}

/** Returns { ok:true } or { ok:false, error }. */
async function verifyTweet({ claimedHandle, code, tweetUrl, fetcher = fetchOEmbed }) {
  const t = parseTweetUrl(tweetUrl);
  if (!t) return { ok: false, error: 'Paste the full link to your post, e.g. https://x.com/you/status/123…' };
  let data;
  try {
    data = await fetcher(t.handle, t.id);
  } catch (e) {
    return { ok: false, error: 'Could not reach X to check the post. Try again in a minute.' };
  }
  if (!data) return { ok: false, error: 'Post not found. Make sure it is public (not a protected account) and not deleted.' };
  const author = String(data.author_url || '').replace(/\/+$/, '').split('/').pop() || '';
  if (author.toLowerCase() !== claimedHandle.toLowerCase()) {
    return { ok: false, error: `That post was made by @${author || '?'}, not @${claimedHandle}.` };
  }
  if (!String(data.html || '').includes(code)) {
    return { ok: false, error: `The post does not contain your code ${code}.` };
  }
  return { ok: true, handle: author };
}

module.exports = { normalizeHandle, parseTweetUrl, newCode, verifyTweet, fetchOEmbed };
