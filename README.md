# BLACKSTONE — a shared city RPG

A browser-based, text-style city RPG in the tradition of **Torn**. Build your character, train four stats, work jobs, commit crimes, and fight your way up from the gutter.

## Online beta

- Email/password accounts with email verification and password reset
- Account-backed character saves (not just local browser saves)
- Public player profiles and a casual level/knockout leaderboard
- Shared live city chat, online presence, and private messages
- Existing character progression and NPC street combat, inside authenticated accounts

The Online area is the first multiplayer release. **Competitive duels, item transfers/trading, and co-op activities are not enabled yet:** combat and inventory actions still run in the browser, so a player could alter them with developer tools. Those features need server-authoritative game rules before they can safely affect a shared economy. Current profile-board stats are for fun, not prizes or competition.

## Run locally

Requires Node.js 20 or newer:

```bash
npm ci
DEV_AUTO_VERIFY=1 npm run dev
# open http://localhost:3000
```

Local development uses an **ephemeral in-memory database** and automatically verifies test accounts. Test accounts and saves disappear when the server stops. This development shortcut is never enabled by the Render production configuration.

## Deploy on Render

The root `render.yaml` defines a Node web service (`blackstone-online`) plus a Render Postgres database. In Render, choose **New → Blueprint**, connect `lumber12345/blackstone`, and apply the Blueprint. Use the `blackstone-online` URL for the online game; if you previously created a separate static `blackstone` site, it is the old offline version.

### Important: demo database

This Blueprint uses Render's **Free Postgres** because this is a demo. Free Render Postgres expires 30 days after creation; upgrade it before then to retain player accounts and saves ([Render's free-instance limits](https://render.com/docs/free)). Free web instances can also spin down when idle.

### Email setup required for real signups

Before players can register, add these environment variables to the `blackstone-online` service in Render. Use credentials from your SMTP email provider; **never put them in GitHub or this repo**.

- `SMTP_HOST`
- `SMTP_PORT` (usually 465 or 587)
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM` (the verified sender address)

Until all five are configured, production signup and password-reset requests stay disabled. Local development logs verification links instead of sending email; Render never returns those links to the browser.

## Account/security notes

Passwords are stored as scrypt hashes, not plaintext. Login sessions use random, HttpOnly, SameSite cookies; password-reset and verification tokens are stored hashed and expire. Emails are not included in public profiles. Keep `DATABASE_URL` and SMTP values in Render's secret environment settings.

For launch with persistent player data, upgrade the database and configure SMTP before inviting players. After upgrading Postgres, change `DEMO_DATABASE` to `false` in Render to remove the in-game expiry warning. Until the game simulation moves server-side, treat uploaded character saves and leaderboard statistics as untrusted client data.

## Game controls

`1` strike now · `2` use a healing item mid-fight · `3` flee · `?` help

## Source layout

```
index.html       account gate + game shell
css/             game and account styling
js/data.js       static game balance/content
js/engine.js     client-side RPG rules and combat
js/ui.js         pages and game controls
js/online.js     account UI, cloud sync, social hub and chat client
js/main.js       account boot, game loop, battle visuals, autosave
server.js        API, password auth, email flows, sessions, chat and messages
server/schema.sql Postgres tables
render.yaml      Render web service + demo Postgres Blueprint
```
