# BLACKSTONE — a shared city RPG

A browser-based, text-style city RPG in the tradition of **Torn**. Build your character, train four stats, work jobs, commit crimes, and fight your way up from the gutter.

## Online beta

- Username/password accounts; no email address is collected
- Account-backed character saves (not just local browser saves)
- Public player profiles and a casual level/knockout leaderboard
- Shared live city chat, online presence, and private messages
- Existing character progression and NPC street combat, inside authenticated accounts

The Online area is the first multiplayer release. **Competitive duels, item transfers/trading, and co-op activities are not enabled yet:** combat and inventory actions still run in the browser, so a player could alter them with developer tools. Those features need server-authoritative game rules before they can safely affect a shared economy. Current profile-board stats are for fun, not prizes or competition.

## Run locally

Requires Node.js 20 or newer:

```bash
npm ci
npm run dev
# open http://localhost:3000
```

Local development uses an **ephemeral in-memory database**. Accounts and saves disappear when the server stops.

## Deploy on Render

The root `render.yaml` defines a Node web service (`blackstone-online`) plus a Render Postgres database. In Render, choose **New → Blueprint**, connect `lumber12345/blackstone`, and apply the Blueprint. Use the `blackstone-online` URL for the online game; if you previously created a separate static `blackstone` site, it is the old offline version.

### Important: demo database

This Blueprint uses Render's **Free Postgres** because this is a demo. Free Render Postgres expires 30 days after creation; upgrade it before then to retain player accounts and saves ([Render's free-instance limits](https://render.com/docs/free)). Free web instances can also spin down when idle.

### Accounts and password recovery

Sign-up and sign-in require only a username and password. No email verification, email login, password-reset email, SMTP credentials, or email API key is used or required. Passwords are stored as scrypt hashes, and new passwords must be at least 12 characters.

**There is no self-service password recovery.** If a player forgets their password, they cannot recover that account through the game; choose and store a password carefully. Existing email addresses from the earlier account version remain in the database privately for compatibility, but the game no longer reads or returns them. This update does not erase existing addresses.

## Game controls

`1` strike now · `2` use a healing item mid-fight · `3` flee · `?` help

## Source layout

```
index.html       account gate + game shell
css/             game and account styling
js/data.js       static game balance/content
js/engine.js     client-side RPG rules and combat
js/ui.js         pages and game controls
js/online.js     username account UI, cloud sync, social hub and chat client
js/main.js       account boot, game loop, battle visuals, autosave
server.js        API, username/password auth, sessions, chat and messages
server/schema.sql Postgres tables
render.yaml      Render web service + demo Postgres Blueprint
```
