/* Raffle front-end — vanilla JS, no build step. All user text goes through textContent. */
(function () {
  'use strict';

  const app = document.getElementById('app');
  const S = { config: null, me: null, isAdmin: false };

  // ---------- tiny DOM helper ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k === 'html') throw new Error('no html');
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const put = (el, ...nodes) => el.replaceChildren(...nodes.flat(Infinity).filter((n) => n != null && n !== false));
  const render = (...nodes) => put(app, ...nodes);

  // ---------- api ----------
  async function api(path, body) {
    const opts = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
    const res = await fetch(path, { credentials: 'same-origin', ...opts });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || 'Request failed (' + res.status + ')');
      Object.assign(err, data, { status: res.status });
      throw err;
    }
    return data;
  }

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------- formatting ----------
  function timeLeft(iso) {
    let ms = Date.parse(iso) - Date.now();
    if (ms <= 0) return null;
    const d = Math.floor(ms / 86400000); ms -= d * 86400000;
    const hr = Math.floor(ms / 3600000); ms -= hr * 3600000;
    const m = Math.floor(ms / 60000);
    return d ? `${d}d ${hr}h` : hr ? `${hr}h ${m}m` : `${Math.max(m, 1)}m`;
  }
  const fmtDate = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const chainBadge = (r) => h('span', { class: 'badge ' + r.chain }, r.chain === 'btc' ? (r.taprootOnly ? 'BTC · Ordinals' : 'BTC') : 'ETH');
  const stateLabel = { open: 'Live', upcoming: 'Soon', closed: 'Closed', drawn: 'Drawn', cancelled: 'Cancelled' };
  const stateBadge = (r) => h('span', { class: 'badge ' + r.state }, stateLabel[r.state] || r.state);
  function art(r, cls) {
    return h('div', { class: cls }, r.imageUrl ? h('img', { src: r.imageUrl, alt: '', loading: 'lazy', referrerpolicy: 'no-referrer' }) : r.chain === 'btc' ? '₿' : 'Ξ');
  }
  function when(r) {
    if (r.state === 'open') return 'Ends in ' + timeLeft(r.endsAt);
    if (r.state === 'upcoming') return 'Starts ' + fmtDate(r.startsAt);
    if (r.state === 'drawn') return 'Drawn ' + fmtDate(r.drawnAt);
    return 'Ended ' + fmtDate(r.endsAt);
  }
  const xIntentFollow = (handle) => 'https://x.com/intent/follow?screen_name=' + encodeURIComponent(handle);
  const xIntentPost = (text) => 'https://x.com/intent/post?text=' + encodeURIComponent(text);
  const loginHref = () => '/auth/discord?next=' + encodeURIComponent(location.pathname);

  // ---------- theme ----------
  function setChain(c) { document.documentElement.dataset.chain = c === 'btc' ? 'btc' : 'eth'; }
  function currentTheme() {
    return document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  }
  function themeToggle() {
    const btn = h('button', { class: 'btn small icon', type: 'button', id: 'theme-toggle' });
    const sync = () => {
      const t = currentTheme();
      btn.textContent = t === 'dark' ? '☀' : '☾';
      btn.setAttribute('aria-label', t === 'dark' ? 'Switch to day mode' : 'Switch to dark mode');
      btn.title = btn.getAttribute('aria-label');
    };
    btn.addEventListener('click', () => {
      const next = currentTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem('raffix-theme', next); } catch {}
      sync();
    });
    sync();
    return btn;
  }

  // ---------- header ----------
  function renderHeader() {
    document.getElementById('brand-name').textContent = S.config?.siteName || 'Raffix';
    document.title = S.config?.siteName || 'Raffix';
    document.getElementById('nav-admin').hidden = !S.isAdmin;
    for (const a of document.querySelectorAll('.top nav a')) {
      const p = a.getAttribute('href');
      a.classList.toggle('active', p === '/' ? location.pathname === '/' || location.pathname.startsWith('/r/') : location.pathname.startsWith(p));
    }
    const acc = document.getElementById('account');
    if (S.me) {
      put(acc, themeToggle(),
        h('span', { class: 'chip' }, h('img', { src: S.me.avatar, alt: '', referrerpolicy: 'no-referrer' }), h('b', {}, S.me.displayName)),
        h('button', { class: 'btn small', onclick: async () => { await api('/api/logout', {}); await loadMe(); route(); } }, 'Log out'),
      );
    } else {
      put(acc, themeToggle(), loginButton('Connect Discord', true));
    }
  }

  function loginButton(label, small) {
    if (!S.config?.discordConfigured && S.config?.devLogin) {
      const go = () => {
        const name = prompt('Dev login — username (use "admin" for the admin panel):', 'tester');
        if (name) location.href = '/auth/dev?name=' + encodeURIComponent(name) + '&next=' + encodeURIComponent(location.pathname);
      };
      return h('button', { class: 'btn discord' + (small ? ' small' : ''), onclick: go }, label + ' (dev)');
    }
    return h('a', { class: 'btn discord' + (small ? ' small' : ''), href: loginHref() }, discordIcon(), label);
  }
  function discordIcon() {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', '18'); s.setAttribute('height', '18'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    p.setAttribute('fill', 'currentColor');
    p.setAttribute('d', 'M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.6 9.1-.3 13.6.1 18.1a19.9 19.9 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z');
    s.append(p);
    return s;
  }

  // ---------- pages ----------
  async function pageList() {
    render(h('p', { class: 'muted' }, 'Loading…'));
    const { raffles } = await api('/api/raffles');
    const live = raffles.filter((r) => r.state === 'open' || r.state === 'upcoming');
    const past = raffles.filter((r) => !(r.state === 'open' || r.state === 'upcoming'));
    // Theme follows the featured raffle: the live one ending soonest.
    const featured = live.filter((r) => r.state === 'open').sort((a, b) => (a.endsAt < b.endsAt ? -1 : 1))[0] || live[0];
    setChain(featured ? featured.chain : 'eth');
    const card = (r) =>
      h('a', { class: 'card', href: '/r/' + r.slug, 'data-link': true },
        art(r, 'art'),
        h('div', { class: 'body' },
          r.collection && h('div', { class: 'eyebrow' }, r.collection),
          h('div', { class: 'title' }, r.title),
          h('div', { class: 'meta' }, stateBadge(r), chainBadge(r), r.myEntry && h('span', { class: 'badge open' }, 'Entered'), r.iWon && h('span', { class: 'badge btc' }, 'Won')),
          h('div', { class: 'small muted' }, `${r.winners} winner${r.winners === 1 ? '' : 's'} · ${r.entryCount} entered · ${when(r)}`),
        ),
      );
    render(
      h('div', { class: 'eyebrow' }, S.config.siteName),
      h('h1', {}, 'Raffles'),
      h('p', { class: 'lead' }, 'Connect your Discord and X, complete the tasks, drop a wallet. Every draw is provably fair — you can verify the result yourself.'),
      h('h2', {}, 'Live'),
      live.length ? h('div', { class: 'grid' }, live.map(card)) : h('div', { class: 'empty-state' }, 'No live raffles right now. Check back soon.'),
      past.length ? [h('h2', {}, 'Past'), h('div', { class: 'grid' }, past.map(card))] : null,
    );
  }

  async function pageRaffle(slug) {
    render(h('p', { class: 'muted' }, 'Loading…'));
    let raffle;
    try {
      ({ raffle } = await api('/api/raffles/' + encodeURIComponent(slug)));
    } catch (e) {
      return render(h('div', { class: 'empty-state' }, e.message, ' ', h('a', { href: '/', 'data-link': true }, 'Back to raffles')));
    }
    document.title = raffle.title + ' — ' + S.config.siteName;
    setChain(raffle.chain);

    const facts = h('div', { class: 'facts' },
      fact('Chain', raffle.chain === 'btc' ? (raffle.taprootOnly ? 'BTC (Taproot)' : 'BTC') : 'Ethereum'),
      fact('Winners', raffle.winners),
      fact('Entries', raffle.entryCount),
      fact(raffle.state === 'open' ? 'Ends in' : raffle.state === 'upcoming' ? 'Starts' : 'Ended', raffle.state === 'open' ? timeLeft(raffle.endsAt) : fmtDate(raffle.state === 'upcoming' ? raffle.startsAt : raffle.endsAt)),
    );

    const left = h('div', {},
      art(raffle, 'hero-art'),
      raffle.collection && h('div', { class: 'eyebrow' }, raffle.collection),
      h('h1', {}, raffle.title),
      h('div', { class: 'meta row' }, stateBadge(raffle), chainBadge(raffle)),
      facts,
      raffle.description && h('div', { class: 'desc' }, raffle.description),
      raffle.state === 'drawn' ? resultsBlock(raffle) : fairnessNote(raffle),
    );

    render(h('div', { class: 'detail' }, left, h('aside', { class: 'entry-panel' }, entryPanel(raffle))));
  }

  const fact = (k, v) => h('div', {}, h('div', { class: 'k' }, k), h('div', { class: 'v' }, v));

  function fairnessNote(raffle) {
    return h('div', {},
      h('h2', {}, 'Fair draw'),
      h('p', { class: 'small muted' }, 'The secret seed for this draw was locked in when the raffle was created. Its fingerprint is below; after the draw the seed is revealed so anyone can recompute the winners.'),
      h('div', { class: 'proof' }, h('div', {}, 'seed hash: ', h('b', {}, raffle.seedHash))),
    );
  }

  function resultsBlock(raffle) {
    const myId = raffle.myEntry?.id;
    const out = h('div', {},
      h('h2', {}, 'Winners'),
      h('ol', { class: 'winners' },
        raffle.winnerList.map((w, i) =>
          h('li', { class: w.entryId === myId ? 'me' : '' },
            h('span', { class: 'n' }, '#' + (i + 1)),
            h('span', {}, w.discordName, w.xHandle ? h('span', { class: 'muted small' }, '  @' + w.xHandle) : null),
            h('span', { class: 'w' }, w.wallet),
          ),
        ),
      ),
    );
    const proofBox = h('div', { class: 'proof' });
    const btn = h('button', { class: 'btn small', onclick: () => verifyDraw(raffle, proofBox, btn) }, 'Verify this draw in your browser');
    out.append(h('h2', {}, 'Verify'), h('p', { class: 'small muted' }, 'Recomputes the winners from the revealed seed and the full entry list. No trust needed.'), btn, proofBox);
    return out;
  }

  async function verifyDraw(raffle, box, btn) {
    btn.disabled = true;
    put(box, 'Checking…');
    try {
      const p = await api('/api/raffles/' + encodeURIComponent(raffle.slug) + '/proof');
      const hash = await Fair.sha256Hex(p.seed);
      const { listHash, order } = await Fair.shuffle(p.seed, p.entryIds);
      const winners = Fair.pickWinners(order, p.winners, p.disqualified);
      const expected = raffle.winnerList.map((w) => w.entryId);
      const match = winners.length === expected.length && winners.every((w, i) => w === expected[i]);
      const seedOk = hash === raffle.seedHash;
      put(box, 
        h('div', {}, 'seed: ', h('b', {}, p.seed)),
        h('div', {}, 'sha256(seed): ', h('b', {}, hash), seedOk ? '  ✓ matches the hash published at launch' : '  ✗ DOES NOT MATCH'),
        h('div', {}, 'entries: ', h('b', {}, p.entryIds.length), ' · list hash: ', h('b', {}, listHash)),
        p.disqualified.length ? h('div', {}, 'rerolled (disqualified): ', h('b', {}, p.disqualified.join(', '))) : null,
        raffle.myEntry ? h('div', {}, 'your entry id: ', h('b', {}, raffle.myEntry.id), p.entryIds.includes(raffle.myEntry.id) ? ' ✓ included' : ' ✗ missing') : null,
        h('div', { class: 'alert ' + (match && seedOk ? 'ok' : 'err') }, match && seedOk ? 'Verified: recomputed winners match the published winners.' : 'Mismatch — recomputed winners differ from the published list.'),
      );
    } catch (e) {
      put(box, h('div', { class: 'alert err' }, e.message));
    } finally {
      btn.disabled = false;
    }
  }

  // ---------- entry panel ----------
  function entryPanel(raffle) {
    const panel = h('div', { class: 'panel' });
    const me = S.me;
    const msg = h('div');
    const showErr = (e) => put(msg, errorAlert(e));

    if (raffle.state === 'drawn') {
      panel.append(
        raffle.iWon ? h('div', { class: 'banner' }, '🎉 You won! Keep an eye on Discord.') : null,
        h('div', { class: 'eyebrow' }, 'Raffle drawn'),
        h('p', { class: 'small muted' }, raffle.myEntry ? (raffle.iWon ? 'Congrats — your wallet is on the winners list.' : 'Not this time. Thanks for entering!') : 'This raffle has ended.'),
      );
      return panel;
    }
    if (raffle.state === 'cancelled' || raffle.state === 'closed') {
      panel.append(h('div', { class: 'eyebrow' }, raffle.state === 'closed' ? 'Entries closed' : 'Cancelled'), h('p', { class: 'small muted' }, raffle.state === 'closed' ? 'Winners will be drawn soon.' : 'This raffle was cancelled.'));
      if (raffle.myEntry) panel.append(h('div', { class: 'alert ok' }, 'You are entered with ' + raffle.myEntry.wallet));
      return panel;
    }

    panel.append(h('div', { class: 'eyebrow' }, raffle.myEntry ? 'You are in ✓' : 'Enter the raffle'));
    if (raffle.myEntry) panel.append(h('div', { class: 'alert ok' }, 'Entered with ', h('span', { class: 'mono' }, raffle.myEntry.wallet), '. Entry id ', h('span', { class: 'mono' }, raffle.myEntry.id), '. You can update your wallet below until it closes.'));

    let n = 0;
    const step = (done, title, sub, ...act) =>
      h('div', { class: 'step' + (done ? ' done' : '') }, h('div', { class: 'dot' }, done ? '✓' : ++n && n), h('div', {}, h('div', { class: 't' }, title), sub && h('div', { class: 's' }, sub), act.length ? h('div', { class: 'act' }, act) : null));
    // keep numbering stable even for done steps
    const stepN = (done, title, sub, ...act) => { const el = step(done, title, sub, ...act); if (done) n++; return el; };

    // 1. Discord
    const reqs = [];
    if (raffle.guild) reqs.push('Member of ' + raffle.guild.name);
    if (raffle.guild?.roles?.length) reqs.push('Role: ' + raffle.guild.roles.map((r) => r.name || r.id).join(' or '));
    if (raffle.minAccountAgeDays) reqs.push(`Account older than ${raffle.minAccountAgeDays} days`);
    panel.append(
      stepN(!!me, 'Connect Discord', me ? `Connected as ${me.displayName} (${me.username})` + (reqs.length ? ' · ' + reqs.join(' · ') : '') : 'Required. ' + reqs.join(' · '),
        !me ? loginButton('Connect Discord') : null,
        raffle.guild?.invite ? h('a', { class: 'small', href: raffle.guild.invite, target: '_blank', rel: 'noopener' }, 'Not in the server yet? Join ' + raffle.guild.name + ' ↗') : null,
      ),
    );

    // 2. X account
    if (raffle.requireX) {
      const linked = me?.x && (me.x.verified || S.config.xVerifyMode === 'handle');
      panel.append(stepN(!!linked, 'Link your X account', linked ? '@' + me.x.handle + (me.x.verified ? ' · verified' : '') : 'One-time, no X login or API needed.', me && !linked ? xLinkForm(raffle, showErr) : null,
        linked ? h('button', { class: 'btn small', onclick: async () => { if (!confirm('Unlink @' + me.x.handle + '?')) return; try { S.me = (await api('/api/x/unlink', {})).user; pageRaffle(raffle.slug); } catch (e) { showErr(e); } } }, 'Change account') : null));
    }

    // 3. Follows
    for (const handle of raffle.xFollow) {
      const done = !!me && me.follows.includes(handle.toLowerCase());
      panel.append(stepN(done, 'Follow @' + handle + ' on X', done ? 'Opened ✓ — make sure you hit Follow.' : 'Opens X in a new tab.',
        h('a', {
          class: 'btn x', href: xIntentFollow(handle), target: '_blank', rel: 'noopener',
          onclick: async () => {
            if (!S.me) return;
            try { S.me = (await api('/api/raffles/' + encodeURIComponent(raffle.slug) + '/follow', { handle })).user; setTimeout(() => pageRaffle(raffle.slug), 400); } catch (e) { showErr(e); }
          },
        }, 'Follow @' + handle),
      ));
    }

    // 4. Wallet + submit
    const ph = raffle.chain === 'btc' ? (raffle.taprootOnly ? 'bc1p… (Taproot / Ordinals)' : 'bc1p… / bc1q…') : '0x…';
    const input = h('input', { id: 'wallet', placeholder: ph, autocomplete: 'off', spellcheck: 'false', value: raffle.myEntry?.wallet || me?.wallets?.[raffle.chain] || '' });
    const submit = h('button', { class: 'btn primary block', disabled: !me || raffle.state !== 'open' }, raffle.myEntry ? 'Update entry' : raffle.state === 'upcoming' ? 'Opens ' + fmtDate(raffle.startsAt) : 'Enter raffle');
    submit.addEventListener('click', async () => {
      submit.disabled = true;
      put(msg);
      try {
        const res = await api('/api/raffles/' + encodeURIComponent(raffle.slug) + '/enter', { wallet: input.value });
        toast(res.updated ? 'Entry updated' : "You're in! Good luck 🍀");
        await loadMe();
        pageRaffle(raffle.slug);
      } catch (e) {
        showErr(e);
        submit.disabled = false;
      }
    });
    panel.append(
      h('div', { class: 'step' }, h('div', { class: 'dot' }, ++n), h('div', {},
        h('div', { class: 't' }, raffle.chain === 'btc' ? 'Your BTC wallet' : 'Your ETH wallet'),
        h('div', { class: 's' }, raffle.chain === 'btc' ? (raffle.taprootOnly ? 'Taproot address (starts with bc1p) — where the inscription goes.' : 'Bitcoin address that receives the prize.') : 'The address that gets allowlisted / receives the prize.'),
        h('div', { class: 'act' }, input))),
      submit,
      msg,
    );
    if (raffle.myEntry) {
      panel.append(h('button', { class: 'btn small danger block', onclick: async () => {
        if (!confirm('Withdraw your entry?')) return;
        try { await api('/api/raffles/' + encodeURIComponent(raffle.slug) + '/leave', {}); toast('Entry withdrawn'); pageRaffle(raffle.slug); } catch (e) { showErr(e); }
      } }, 'Withdraw entry'));
    }
    if (raffle.xFollow.length) panel.append(h('p', { class: 'note' }, 'Follows are checked by mods before prizes go out — unfollowing after entering can get you rerolled.'));
    return panel;
  }

  function errorAlert(e) {
    const a = h('div', { class: 'alert err' }, e.message);
    if (e.code === 'not_in_guild' && e.invite) a.append(' ', h('a', { href: e.invite, target: '_blank', rel: 'noopener' }, 'Join the server ↗'));
    if (e.code === 'discord_reauth' || e.code === 'login_required') a.append(' ', h('a', { href: loginHref() }, 'Reconnect Discord'));
    return a;
  }

  function xLinkForm(raffle, showErr) {
    const me = S.me;
    const wrap = h('div', { class: 'act' });
    const pending = me.x && !me.x.verified && me.x.pendingCode;
    if (!pending) {
      const inp = h('input', { placeholder: '@yourhandle', autocomplete: 'off', spellcheck: 'false', value: me.x?.handle || '' });
      const go = h('button', { class: 'btn' }, S.config.xVerifyMode === 'handle' ? 'Save' : 'Next');
      go.addEventListener('click', async () => {
        go.disabled = true;
        try { S.me = (await api('/api/x/start', { handle: inp.value })).user; pageRaffle(raffle.slug); } catch (e) { showErr(e); go.disabled = false; }
      });
      wrap.append(h('div', { class: 'row' }, inp, go));
      return wrap;
    }
    const text = `Verifying my X for ${S.config.siteName} raffles 🎟️ ${me.x.pendingCode}`;
    const url = h('input', { placeholder: 'https://x.com/' + me.x.handle + '/status/…', autocomplete: 'off', spellcheck: 'false' });
    const verify = h('button', { class: 'btn primary' }, 'Verify');
    verify.addEventListener('click', async () => {
      verify.disabled = true;
      try { S.me = (await api('/api/x/verify', { tweetUrl: url.value })).user; toast('X account verified ✓'); pageRaffle(raffle.slug); } catch (e) { showErr(e); verify.disabled = false; }
    });
    wrap.append(
      h('div', { class: 's' }, `1. Post this code from @${me.x.handle}:`),
      h('div', { class: 'code' }, me.x.pendingCode),
      h('a', { class: 'btn x', href: xIntentPost(text), target: '_blank', rel: 'noopener' }, 'Post on X'),
      h('div', { class: 's' }, '2. Paste the link to your post:'),
      h('div', { class: 'row' }, url, verify),
      h('div', { class: 'note' }, 'You can delete the post once verified. ', h('a', { href: '#', onclick: async (ev) => { ev.preventDefault(); try { S.me = (await api('/api/x/unlink', {})).user; pageRaffle(raffle.slug); } catch (e) { showErr(e); } } }, 'Wrong handle?')),
    );
    return wrap;
  }

  // ---------- admin ----------
  async function pageAdmin() {
    setChain('eth');
    if (!S.isAdmin) return render(h('div', { class: 'empty-state' }, S.me ? 'Admins only.' : 'Connect Discord to continue. ', !S.me && loginButton('Connect Discord')));
    render(h('p', { class: 'muted' }, 'Loading…'));
    const data = await api('/api/admin/raffles');
    const list = h('div', {}, data.raffles.length ? data.raffles.map((r) => adminRow(r, data)) : h('div', { class: 'empty-state' }, 'No raffles yet.'));
    render(
      h('div', { class: 'eyebrow' }, 'Admin'),
      h('h1', {}, 'Manage raffles'),
      h('h2', {}, 'New raffle'),
      raffleForm(null, data.defaults, () => pageAdmin()),
      h('h2', {}, 'All raffles'),
      list,
    );
  }

  function toLocalInput(iso) {
    const d = new Date(iso);
    const p = (x) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function raffleForm(r, defaults, onDone) {
    const v = r || { chain: 'eth', winners: 10, startsAt: new Date().toISOString(), endsAt: new Date(Date.now() + 2 * 86400000).toISOString(), collection: defaults.collection, xFollow: defaults.xFollow || [], requireX: true, guildId: defaults.guildId, guildName: defaults.guildName, guildInvite: defaults.guildInvite, roles: [], minAccountAgeDays: 30 };
    const f = {};
    const field = (name, label, el, hint, full) => { f[name] = el; return h('div', { class: full ? 'full' : '' }, h('label', { for: 'f-' + name }, label), Object.assign(el, { id: 'f-' + name }), hint && h('div', { class: 'hint' }, hint)); };
    const chain = h('select', {}, h('option', { value: 'eth' }, 'Ethereum'), h('option', { value: 'btc' }, 'Bitcoin'));
    chain.value = v.chain;
    const tap = h('input', { type: 'checkbox' }); tap.checked = !!v.taprootOnly;
    const reqX = h('input', { type: 'checkbox' }); reqX.checked = v.requireX !== false;
    const tapRow = h('label', { class: 'check' }, tap, 'Taproot (bc1p) only — for Ordinals');
    const syncTap = () => (tapRow.hidden = chain.value !== 'btc');
    const syncChain = () => { syncTap(); setChain(chain.value); };
    chain.addEventListener('change', syncChain); syncChain();
    const msg = h('div');
    const save = h('button', { class: 'btn primary', type: 'submit' }, r ? 'Save changes' : 'Create raffle');
    const form = h('form', { class: 'panel form-grid' },
      field('title', 'Title', h('input', { value: v.title || '', required: true, maxlength: 80, placeholder: 'Allowlist — 50 spots' }), null, true),
      field('collection', 'Collection / project', h('input', { value: v.collection || '', maxlength: 80 })),
      field('imageUrl', 'Image URL (https)', h('input', { value: v.imageUrl || '', placeholder: 'https://…' })),
      field('chain', 'Chain', chain),
      field('winners', 'Number of winners', h('input', { type: 'number', min: 1, max: 10000, value: v.winners })),
      h('div', { class: 'full' }, tapRow),
      field('startsAt', 'Starts', h('input', { type: 'datetime-local', value: toLocalInput(v.startsAt) })),
      field('endsAt', 'Ends', h('input', { type: 'datetime-local', value: toLocalInput(v.endsAt) })),
      field('xFollow', 'X accounts to follow', h('input', { value: (v.xFollow || []).join(', '), placeholder: '@collection, @artist' }), 'Comma separated, up to 5. Leave empty for none.'),
      h('div', {}, h('label', {}, 'X account'), h('label', { class: 'check' }, reqX, 'Require a linked X account')),
      field('guildId', 'Discord server ID (gate)', h('input', { value: v.guildId || '', placeholder: '123456789012345678' }), 'Entrants must be members. Empty = no server gate.'),
      field('guildName', 'Server name', h('input', { value: v.guildName || '' })),
      field('guildInvite', 'Server invite link', h('input', { value: v.guildInvite || '', placeholder: 'https://discord.gg/…' })),
      field('minAccountAgeDays', 'Min Discord account age (days)', h('input', { type: 'number', min: 0, value: v.minAccountAgeDays || 0 }), 'Blocks fresh alt accounts.'),
      field('roles', 'Required roles (any of)', h('textarea', { rows: 2, placeholder: '123456789012345678:Holder\n234567890123456789:OG' }, (v.roles || []).map((x) => x.id + (x.name ? ':' + x.name : '')).join('\n')), 'One per line as roleId:Label. Enable Developer Mode in Discord → right-click role → Copy ID.', true),
      field('description', 'Description', h('textarea', { rows: 4, maxlength: 2000 }, v.description || ''), null, true),
      h('div', { class: 'full row' }, save, r ? h('button', { class: 'btn', type: 'button', onclick: onDone }, 'Cancel') : null),
      h('div', { class: 'full' }, msg),
    );
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      save.disabled = true;
      put(msg);
      const body = {
        title: f.title.value, collection: f.collection.value, imageUrl: f.imageUrl.value, chain: chain.value, taprootOnly: tap.checked,
        winners: f.winners.value, startsAt: new Date(f.startsAt.value).toISOString(), endsAt: new Date(f.endsAt.value).toISOString(),
        xFollow: f.xFollow.value, requireX: reqX.checked, guildId: f.guildId.value, guildName: f.guildName.value, guildInvite: f.guildInvite.value,
        minAccountAgeDays: f.minAccountAgeDays.value, roles: f.roles.value, description: f.description.value,
      };
      try {
        await api(r ? `/api/admin/raffles/${r.id}/update` : '/api/admin/raffles', body);
        toast(r ? 'Saved' : 'Raffle created');
        onDone();
      } catch (e) {
        put(msg, errorAlert(e));
        save.disabled = false;
      }
    });
    return form;
  }

  function adminRow(r, data) {
    const more = h('div', { class: 'more' });
    const act = (label, path, confirmMsg, cls) =>
      h('button', { class: 'btn small ' + (cls || ''), onclick: async () => {
        if (confirmMsg && !confirm(confirmMsg)) return;
        try { await api(`/api/admin/raffles/${r.id}/${path}`, {}); toast('Done'); pageAdmin(); } catch (e) { put(more, errorAlert(e)); }
      } }, label);
    const showEntries = async () => {
      put(more, 'Loading entries…');
      try {
        const { entries } = await api(`/api/admin/raffles/${r.id}/entries`);
        const sorted = r.state === 'drawn' ? entries.slice().sort((a, b) => a.rank - b.rank) : entries;
        put(more, 
          h('div', { class: 'row small muted' }, `${entries.length} entries`),
          h('div', { class: 'table-wrap' }, h('table', {},
            h('thead', {}, h('tr', {}, ['#', 'Entry', 'Discord', 'X', 'Wallet', 'Entered', ''].map((x) => h('th', {}, x)))),
            h('tbody', {}, sorted.map((e) => h('tr', { class: e.disqualified ? 'dq' : e.winner ? 'win' : '' },
              h('td', {}, e.rank || ''), h('td', { class: 'mono' }, e.id),
              h('td', {}, e.discordName, h('span', { class: 'muted small' }, ' ' + e.discordId)),
              h('td', {}, e.xHandle ? h('a', { href: 'https://x.com/' + e.xHandle, target: '_blank', rel: 'noopener' }, '@' + e.xHandle) : ''),
              h('td', { class: 'mono' }, e.wallet), h('td', {}, fmtDate(e.createdAt)),
              h('td', {}, e.winner && !e.disqualified ? h('button', { class: 'btn small danger', onclick: async () => {
                const reason = prompt('Disqualify ' + e.discordName + ' and reroll? Reason (e.g. not following):', 'not following');
                if (reason == null) return;
                try { await api(`/api/admin/raffles/${r.id}/disqualify`, { entryId: e.id, reason }); toast('Rerolled'); pageAdmin(); } catch (err) { put(more, errorAlert(err)); }
              } }, 'Disqualify + reroll') : e.disqualified ? 'DQ: ' + e.disqualified : ''),
            ))),
          )),
        );
      } catch (e) { put(more, errorAlert(e)); }
    };
    return h('div', { class: 'admin-raffle' },
      h('div', { class: 'head' },
        h('div', { class: 'grow' },
          h('a', { href: '/r/' + r.slug, 'data-link': true, class: 'mono' }, r.title),
          h('div', { class: 'small muted' }, `${r.entryCount} entries · ${r.winners} winners · ${when(r)}`),
        ),
        stateBadge(r), chainBadge(r),
        h('div', { class: 'actions' },
          h('button', { class: 'btn small', onclick: showEntries }, 'Entries'),
          r.status === 'open' ? h('button', { class: 'btn small', onclick: () => put(more, raffleForm(r, data.defaults, () => pageAdmin())) }, 'Edit') : null,
          r.state === 'open' ? act('Close now', 'close', 'Close entries now?') : null,
          r.state === 'closed' ? act('Draw winners', 'draw', 'Draw winners now? This is final.', 'primary') : null,
          r.state === 'drawn' && data.webhook ? act('Announce in Discord', 'announce', 'Post the winners to the Discord webhook?') : null,
          h('a', { class: 'btn small', href: `/api/admin/raffles/${r.id}/export.csv` }, 'CSV'),
          r.state === 'drawn' ? h('a', { class: 'btn small', href: `/api/admin/raffles/${r.id}/export.csv?winners=1` }, 'Winners CSV') : null,
          r.status === 'open' ? act('Cancel', 'cancel', 'Cancel this raffle? It will disappear for entrants.', 'danger') : null,
        ),
      ),
      more,
    );
  }

  // ---------- router ----------
  async function route() {
    renderHeader();
    const p = location.pathname;
    try {
      const m = p.match(/^\/r\/([^/]+)\/?$/);
      if (m) await pageRaffle(decodeURIComponent(m[1]));
      else if (/^\/admin\/?$/.test(p)) await pageAdmin();
      else await pageList();
    } catch (e) {
      render(errorAlert(e));
    }
    window.scrollTo(0, 0);
  }

  document.addEventListener('click', (ev) => {
    const a = ev.target.closest('a[data-link]');
    if (!a || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.button !== 0) return;
    ev.preventDefault();
    if (a.getAttribute('href') !== location.pathname) history.pushState(null, '', a.getAttribute('href'));
    route();
  });
  window.addEventListener('popstate', route);

  async function loadMe() {
    const me = await api('/api/me');
    S.me = me.user;
    S.isAdmin = me.isAdmin;
  }

  (async function init() {
    S.config = await api('/api/config');
    await loadMe();
    const q = new URLSearchParams(location.search);
    if (q.get('auth') === 'cancelled') { toast('Discord login cancelled'); history.replaceState(null, '', location.pathname); }
    route();
  })();
})();
