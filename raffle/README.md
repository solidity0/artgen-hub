# Raffix — Web3 raffle tool

Discord-gated raffles for ETH and BTC (Ordinals) collections.

- **Discord connection required:** OAuth2 login. Raffles can require server membership, specific roles, and a minimum Discord account age (blocks fresh alts).
- **X account link without the X API:** the entrant posts a one-time code and pastes the post link. Raffix checks it through X's public, key-less embed endpoint. Each X handle can be linked to only one Discord account.
- **Follow tasks without the X API:** "Follow @collection" buttons open X's follow intent. X doesn't let anyone verify a follow without the paid API, so clicks are recorded and mods spot-check winners (see "Disqualify + reroll").
- **Wallets:** ETH addresses, and BTC with full checksum validation (bc1p taproot, bc1q, 1…, 3…). There's a "Taproot only" option for Ordinals. One wallet per raffle.
- **Provably fair draw:** a secret seed is committed (its sha256 is published) when the raffle is created and revealed at the draw. Anyone can press **Verify** on the raffle page to recompute the winners in their browser.
- **Admin panel:** create, edit, close and draw raffles; view entries; disqualify and reroll; export CSV of all entries or winners only; post winners to a Discord channel webhook.
- **Theme:** the accent colour follows the raffle's chain (ETH blue / Bitcoin orange), with a day/dark toggle.

Zero npm dependencies. Node 20.6+.

---

## 1. Create the Discord app (5 min)

1. Go to https://discord.com/developers/applications and click **New Application**.
2. Under **OAuth2**, copy the **Client ID** and **Client Secret**.
3. Under **OAuth2 → Redirects**, add `https://YOUR-DOMAIN/auth/discord/callback`.
   For local testing, add `http://localhost:8787/auth/discord/callback`.

You don't need a bot. Membership and role checks use the entrant's own login (`guilds.members.read` scope), so you don't need admin rights in the server you gate on, including collab partners' servers.

IDs: in Discord, go to **Settings → Advanced → Developer Mode**. Then right-click a server, role or user and choose **Copy ID**.

## 2. Configure

```bash
cp .env.example .env
```

| Variable | What |
|---|---|
| `SITE_NAME` | Shown in the header and in the X verification post (default `Raffix`) |
| `BASE_URL` | Public URL, no trailing slash |
| `SESSION_SECRET` | Long random string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | From step 1 |
| `ADMIN_DISCORD_IDS` | Comma-separated Discord user IDs allowed into `/admin` |
| `DISCORD_GUILD_ID`, `DISCORD_GUILD_NAME`, `DISCORD_GUILD_INVITE` | Optional default server gate, pre-filled on new raffles |
| `DEFAULT_COLLECTION`, `DEFAULT_X_FOLLOW` | Optional pre-fills for new raffles |
| `DISCORD_WEBHOOK_URL` | Optional: channel webhook for "Announce in Discord" |
| `X_VERIFY_MODE` | `tweet` (default: proves handle ownership) or `handle` (entrant just types it; lowest friction, not verified) |
| `DATA_FILE` | Where entries are stored. Keep it on persistent disk and keep it private (it holds Discord tokens). |
| `TRUST_PROXY` | `1` when running behind Railway/Render/Fly/nginx |

## 3. Run

```bash
npm start
```

To try it without a Discord app, run `npm run dev`. It enables a fake login, and logging in as `admin` opens the admin panel. **Never use it in production.**

```bash
npm test
```

## 4. Deploy (no GitHub Pages: this needs a server)

It's one Node process plus one data file. Any of these work:

- **Render (one click):** Dashboard → **New → Blueprint** → pick this repo. It reads `render.yaml` at the repo root, creates the service with a 1 GB disk, generates `SESSION_SECRET`, and asks you for the Discord values. `BASE_URL` is detected automatically. The start log prints the exact Discord redirect URL to paste into the developer portal.
- **Railway / Render (manual):** New service → point at this folder (root directory `raffle`) → start command `node server.js` → add the env vars → attach a **persistent volume/disk** at `/data` and set `DATA_FILE=/data/raffle.json`.
- **Fly.io:** `fly launch` (uses the `Dockerfile`), `fly volumes create data`, mount it at `/data`.
- **Any VPS ($5/mo):**
  ```bash
  docker build -t raffix .
  ```
  ```bash
  docker run -d --restart=always -p 8787:8787 -v raffix-data:/data --env-file .env raffix
  ```
  Put Caddy or nginx in front for HTTPS.

Then update `BASE_URL` and the Discord redirect URL to the real domain.

## Running a raffle

1. In **/admin → New raffle**, set the title, collection, chain, winners, start/end time, X accounts to follow, Discord server ID, roles and account age. Example: a 1-hour FeedTheFire raffle that ends 60 minutes after it starts and asks entrants to follow `@FeedTheFireRH`.
2. Share `https://YOUR-DOMAIN/r/<slug>`.
3. Entrants: Connect Discord → link X → click follow → paste wallet → Enter. They can update their wallet or withdraw until it closes.
4. When it ends (or you press **Close now**), press **Draw winners**.
5. Spot-check winners' follows on X (the X handles link from the Entries table). Use **Disqualify + reroll** on anyone who isn't following. The next entry in the published draw order takes their place, and the result stays verifiable.
6. Press **Winners CSV** for the allowlist, and optionally **Announce in Discord**.

## How the draw works

```
seed      = 32 random bytes, kept secret      (created with the raffle)
seedHash  = sha256(seed)                      (shown publicly from day one)
entries   = entry ids sorted by entry time
listHash  = sha256(entries joined by "\n")
shuffle   = Fisher–Yates, randomness = HMAC-SHA256(seed, listHash + ":" + counter), rejection-sampled
winners   = first N of the shuffle, skipping disqualified ids
```

`public/fair.js` is the exact code used both by the server and by the Verify button.

## Limits worth knowing

- **Follows can't be proven without the paid X API.** The tool records the follow click; mods confirm winners. If you ever get X API access, the check slots into the `/enter` route.
- **X link check** relies on X's public embed endpoint (`publish.twitter.com/oembed`). If X ever shuts it off, set `X_VERIFY_MODE=handle` and everything else keeps working.
- **Storage** is a single JSON file, which is fine for thousands of entries per raffle. Run one instance only.
