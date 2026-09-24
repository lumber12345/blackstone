# BLACKSTONE — a text-based city RPG

A single-player, browser-based text RPG in the tradition of **Torn**: you start as a nobody with
$2,000 and bare fists, and climb to the top of a rotten city by training your body, pulling crimes,
fighting in the streets, and working terrible jobs.

No install, no account, no server — it is plain HTML/CSS/JS and it saves to your browser.

## Run it

Clone it and serve the folder — there is no build step and no dependencies:

```bash
git clone https://github.com/<you>/lumbercorp.git
cd lumbercorp
python3 -m http.server 8000        # then open http://localhost:8000
```

Any static server works (`npx serve`, `php -S`, nginx, GitHub Pages…). You can even open
`index.html` straight from disk — the game uses classic `<script>` tags, not ES modules.

### Play it on GitHub Pages

The repo is static-only, so Pages works out of the box: **Settings → Pages → Branch: `main` / root**.
Your save stays in whichever browser/origin you play from.

## The four bars

| Bar | What it does | Refill |
|---|---|---|
| ❤️ **Health** | Hit 0 and you wake up in the hospital | ~25/min |
| ⚡ **Energy** | Training (5), fighting (3), working (5), crimes (1–5) | ~24/min |
| 🧠 **Nerve** | Crimes and muggings only — the throttle on criminal income | ~12/min |
| 😊 **Happiness** | Multiplies your damage: ×0.5 at zero, ×1.0 at 100, ×1.5 at 200. Below 20 the gym refuses you | ~6/min |

## Systems

- **Gym** — 5 trainers (level-gated) that raise Strength (damage), Defense (mitigation),
  Speed (swing rate) and Dexterity (accuracy, crits, crime success). Black-market steroids double
  your gains for 30 minutes.
- **Crimes** — 8 tiers from Pickpocket to Assassination Contract. Success = base + Dex + level −
  law suspicion. Failure means a beating, a cell, or nothing. Law suspicion decays slowly and makes
  every crime harder.
- **Streets** — 14 enemies across 5 districts, up to Mr. Calloway the Kingpin. Fights run in real
  time: your attack meter fills based on Speed, and every enemy card shows a **forecast** (your
  damage/sec, theirs, and a win %) before you commit. You can also mug them instead of fighting.
- **Jobs** — 6 employers × 3 ranks, 8 shifts a day, promotions as you level.
- **Market / inventory** — 11 weapons, 5 armors, medical supplies, boosters and fenced loot.
  Gear is level-gated, so levelling matters as much as money.
- **Bank** — 0.4%/day interest on savings, 2%/day loans with a level-based credit limit.
- **Medical** — pay a doctor to skip hospital time, pay bail or break out of jail (Dex-scaled,
  big XP, failure extends the sentence). Stuck and broke? Scrounge from visitors every 15 minutes.
- **Achievements** (16), random street events, lifetime statistics, and a per-enemy kill ledger.

## Controls

`1` strike now · `2` use a healing item mid-fight · `3` flee · `?` help

## Files

```
index.html      shell, header bars, nav, modal + toast roots
css/style.css   all styling (no external assets — works offline)
js/data.js      every static number: items, enemies, crimes, jobs, trainers, achievements
js/engine.js    state, save/load, ticking, regen, combat, crimes, gym, bank, achievements
js/ui.js        page renderers + delegated click handling
js/main.js      boot, wiring, main loop, autosave
```

## Saving

The game autosaves every 15 seconds and on tab close. If your browser blocks local storage
(sandboxed iframes, private mode) it falls back to session memory and says so in the header —
use **Character → Export save** to download or copy a save code, and **Import save** to restore it.

## Balancing notes

Numbers were tuned by simulating full playthroughs headlessly: a competent player clears the first
four districts inside a week of game time and reaches the Kingpin around level 40–58 with
endgame gear. All damage, regen and price values live in `js/data.js` if you want to retune them.
