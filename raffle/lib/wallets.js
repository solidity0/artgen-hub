'use strict';
// Address validation for ETH and Bitcoin mainnet (incl. taproot for Ordinals).
const crypto = require('node:crypto');

const ETH_RE = /^0x[0-9a-fA-F]{40}$/;

function validateEth(addr) {
  addr = String(addr || '').trim();
  if (!ETH_RE.test(addr)) return { ok: false, error: 'Not a valid ETH address (0x + 40 hex characters).' };
  if (/^0x0{40}$/.test(addr)) return { ok: false, error: 'That is the zero address.' };
  return { ok: true, address: addr, type: 'eth' };
}

// ---- bech32 / bech32m (BIP-173 / BIP-350) ----
const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';
const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
function polymod(values) {
  let chk = 1;
  for (const v of values) {
    const top = chk >>> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((top >>> i) & 1) chk ^= GEN[i];
  }
  return chk >>> 0;
}
function hrpExpand(hrp) {
  const out = [];
  for (const c of hrp) out.push(c.charCodeAt(0) >> 5);
  out.push(0);
  for (const c of hrp) out.push(c.charCodeAt(0) & 31);
  return out;
}
function convertBits(data, from, to) {
  let acc = 0, bits = 0;
  const out = [], maxv = (1 << to) - 1;
  for (const v of data) {
    acc = (acc << from) | v; bits += from;
    while (bits >= to) { bits -= to; out.push((acc >> bits) & maxv); }
  }
  if (bits >= from || ((acc << (to - bits)) & maxv)) return null; // bad padding
  return out;
}
function decodeSegwit(addr) {
  if (addr !== addr.toLowerCase() && addr !== addr.toUpperCase()) return null;
  addr = addr.toLowerCase();
  const pos = addr.lastIndexOf('1');
  if (pos < 1 || pos + 7 > addr.length || addr.length > 90) return null;
  const hrp = addr.slice(0, pos);
  if (hrp !== 'bc') return null;
  const data = [];
  for (const c of addr.slice(pos + 1)) {
    const d = CHARSET.indexOf(c);
    if (d < 0) return null;
    data.push(d);
  }
  const pm = polymod(hrpExpand(hrp).concat(data));
  const spec = pm === 1 ? 'bech32' : pm === 0x2bc830a3 ? 'bech32m' : null;
  if (!spec) return null;
  const payload = data.slice(0, -6);
  const version = payload[0];
  const prog = convertBits(payload.slice(1), 5, 8);
  if (!prog || version > 16 || prog.length < 2 || prog.length > 40) return null;
  if (version === 0 && (spec !== 'bech32' || (prog.length !== 20 && prog.length !== 32))) return null;
  if (version !== 0 && spec !== 'bech32m') return null;
  return { version, length: prog.length };
}

// ---- base58check (legacy 1… and 3…) ----
const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function decodeBase58Check(addr) {
  let n = 0n;
  for (const c of addr) {
    const d = B58.indexOf(c);
    if (d < 0) return null;
    n = n * 58n + BigInt(d);
  }
  let hex = n.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  let bytes = Buffer.from(hex === '0' ? '' : hex, 'hex');
  let zeros = 0;
  while (addr[zeros] === '1') zeros++;
  bytes = Buffer.concat([Buffer.alloc(zeros), bytes]);
  if (bytes.length !== 25) return null;
  const body = bytes.subarray(0, 21);
  const sum = crypto.createHash('sha256').update(crypto.createHash('sha256').update(body).digest()).digest();
  if (!sum.subarray(0, 4).equals(bytes.subarray(21))) return null;
  return { version: body[0] };
}

function validateBtc(addr, { taprootOnly = false } = {}) {
  addr = String(addr || '').trim();
  const fail = (error) => ({ ok: false, error });
  if (/^bc1/i.test(addr)) {
    const sw = decodeSegwit(addr);
    if (!sw) return fail('Not a valid Bitcoin address (checksum failed).');
    const taproot = sw.version === 1 && sw.length === 32;
    if (taprootOnly && !taproot) return fail('This raffle needs a Taproot (bc1p…) address — the kind Ordinals wallets use.');
    return { ok: true, address: addr.toLowerCase(), type: taproot ? 'taproot' : 'segwit' };
  }
  if (/^[13]/.test(addr)) {
    const b = decodeBase58Check(addr);
    if (!b || (b.version !== 0x00 && b.version !== 0x05)) return fail('Not a valid Bitcoin address (checksum failed).');
    if (taprootOnly) return fail('This raffle needs a Taproot (bc1p…) address — the kind Ordinals wallets use.');
    return { ok: true, address: addr, type: 'legacy' };
  }
  return fail('Not a Bitcoin mainnet address (expected bc1p…, bc1q…, 1… or 3…).');
}

function validateWallet(chain, addr, opts) {
  return chain === 'btc' ? validateBtc(addr, opts) : validateEth(addr);
}

function maskWallet(a) {
  a = String(a || '');
  return a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
}

module.exports = { validateEth, validateBtc, validateWallet, maskWallet };
