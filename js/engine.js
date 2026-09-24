/* =========================================================
   BLACKSTONE — game engine (state, ticks, actions, combat)
   ========================================================= */
'use strict';

const U = {};

/* ---------------- utils ---------------- */
U.rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
U.chance = p => Math.random() < p;
U.pick = a => a[Math.floor(Math.random() * a.length)];
U.clamp = (v, a, b) => v < a ? a : (v > b ? b : v);
U.fmt = n => Math.round(n).toLocaleString('en-US');
U.money = n => '$' + U.fmt(n);
U.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
U.pct = (a, b) => b <= 0 ? 0 : U.clamp(Math.round((a / b) * 100), 0, 100);
U.plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

U.dur = function (sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`;
  return `${s}s`;
};
U.durShort = function (sec) {
  sec = Math.max(0, Math.ceil(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
               : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

/* ---------------- state ---------------- */
const SAVE_KEY = 'blackstone.save.v1';
const E = {};
let S = null;

function newState(name, avatar) {
  const now = Date.now();
  return {
    v: 1,
    name: name || 'Nobody',
    avatar: avatar || '🕵️',
    level: 1,
    xp: 0,
    money: 2000,
    bank: 0,
    loan: 0,
    hp: DATA.BASE.hp, energy: DATA.BASE.energy, nerve: DATA.BASE.nerve, happy: DATA.BASE.happiness,
    burn: 0,
    skills: { str: 1, def: 0, spd: 0, dex: 1 },
    prog: { str: 0, def: 0, spd: 0, dex: 0 },
    equip: { primary: 'fists', armor: null },
    inv: { bandage: 3, cola: 2, candy: 2, bat: 1, hoodie: 1 },
    job: null, jobLvl: {},
    law: 0,
    hospitalUntil: 0, jailUntil: 0,
    injuries: [],
    steroidUntil: 0,
    lastTick: now, lastDay: now, lastEvent: now, nextInterest: now + 86400000,
    worksToday: 0,
    lastScrounge: 0,
    kills: {},
    stats: { crimes: 0, crimeFails: 0, jails: 0, hosp: 0, escapes: 0, kills: 0, losses: 0, mugs: 0, works: 0, trained: 0, bestHit: 0 },
    feed: [],
    ach: {},
    created: now,
    played: 0,
    page: 'home'
  };
}

/* ---------------- derived ---------------- */
function sk() { return S.skills; }
E.view = function () { return { lvl: S.level, str: sk().str, def: sk().def, spd: sk().spd, dex: sk().dex }; };
E.maxHP = () => DATA.maxHP(E.view());
E.maxEnergy = () => DATA.maxEnergy(E.view());
E.maxNerve = () => DATA.maxNerve(E.view());
U.maxHappy = () => DATA.maxHappy(E.view());
E.maxHappy = U.maxHappy;
/* aliases used by DATA event callbacks */
U.maxHP = () => E.maxHP();
U.maxEnergy = () => E.maxEnergy();
U.maxNerve = () => E.maxNerve();
E.xpNeed = () => DATA.xpFor(S.level);
E.totalSkill = () => sk().str + sk().def + sk().spd + sk().dex;

E.weapon = () => DATA.ITEMS[S.equip.primary] || DATA.ITEMS.fists;
E.armor = () => S.equip.armor ? DATA.ITEMS[S.equip.armor] : null;

E.happyMod = () => U.clamp(0.5 + S.happy / 100, 0.5, 1.5);
E.lvlMod = () => 1 + S.level * 0.05;

/* seconds between your swings */
E.swingTime = () => 1.15 / ((E.weapon().spd || 1) * (1 + sk().spd * 0.02));
/* seconds between an enemy's swings */
E.enemySwing = e => 1.15 / (1 + e.spd * 0.015);
/* raw hit before defense mitigation */
E.rawDamage = () => E.weapon().str * (1 + sk().str * 0.022) * E.lvlMod() * E.happyMod();
E.enemyRaw = e => (e.dmg[0] + e.dmg[1]) / 2 * (1 + e.dex * 0.004) * (1 + e.lvl * 0.01);
E.playerDef = () => { const a = E.armor(); return (a ? a.def : 0) + sk().def * 0.5 + S.level * 0.5; };
E.mitigate = (dmg, def) => dmg * (100 / (100 + def));

E.battleStats = function () {
  const v = E.view(), w = E.weapon(), a = E.armor();
  const def = E.playerDef();
  return {
    dmg: E.rawDamage(),
    def: def,
    spd: (w.spd || 1) * (1 + v.spd * 0.02),
    swing: E.swingTime(),
    dex: v.dex,
    acc: U.clamp(74 + v.dex * 0.28 + S.level * 0.2, 50, 96),
    crit: U.clamp(3 + v.dex * 0.2, 3, 30),
    wpn: w, arm: a
  };
};

/* ---------------- persistence ---------------- */
/* Works even when localStorage is blocked (sandboxed iframes, private mode):
   falls back to an in-memory store, plus manual export/import of the save file. */
const MEM = {};
let STORAGE_OK = true;
try { const k = '__bs_test__'; localStorage.setItem(k, '1'); localStorage.removeItem(k); }
catch (e) { STORAGE_OK = false; }
const store = {
  get ok() { return STORAGE_OK; },
  read() { if (STORAGE_OK) { try { return localStorage.getItem(SAVE_KEY); } catch (e) {} } return MEM[SAVE_KEY] || null; },
  write(v) { MEM[SAVE_KEY] = v; if (STORAGE_OK) { try { localStorage.setItem(SAVE_KEY, v); } catch (e) { STORAGE_OK = false; } } },
  clear() { delete MEM[SAVE_KEY]; if (STORAGE_OK) { try { localStorage.removeItem(SAVE_KEY); } catch (e) {} } }
};
E.storageOK = () => STORAGE_OK;
/* UTF-8 safe base64 — avatars are emoji, so the old escape/unescape trick corrupted them. */
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(String(b64).replace(/\s+/g, ''));
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder('utf-8').decode(bytes);
}
E.exportSave = function () { S.lastTick = Date.now(); return b64encode(JSON.stringify(S)); };
E.importSave = function (text) {
  try {
    const clean = (text && typeof text === 'object' ? JSON.stringify(text) : String(text || '')).trim();
    const json = clean.charAt(0) === '{' ? clean : b64decode(clean);
    const d = JSON.parse(json);
    if (!d || typeof d !== 'object' || !d.name) throw new Error('bad save');
    store.write(JSON.stringify(d));
    E.load();
    E.emit('toast', { title: 'Save imported', msg: `Welcome back, ${U.esc(S.name)}.`, kind: 'gold' });
    E.emit('changed');
    return true;
  } catch (e) {
    E.emit('toast', { title: 'Import failed', msg: 'That does not look like a Blackstone save code.', kind: 'bad' });
    return false;
  }
};
E.downloadSave = function () {
  try {
    const blob = new Blob([E.exportSave()], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'blackstone-save.txt';
    document.body.appendChild(a); a.click(); a.remove();
    E.emit('toast', { title: 'Save exported', msg: 'blackstone-save.txt downloaded.', kind: 'good' });
  } catch (e) {
    E.emit('toast', { title: 'Export failed', msg: 'Your browser blocked the download — use the copyable save code instead.', kind: 'bad' });
  }
};

E.save = function (silent) {
  if (!S) return;
  S.lastTick = Date.now();
  store.write(JSON.stringify(S));
  if (!silent) {
    E.emit('toast', { title: 'Game saved', msg: STORAGE_OK ? 'Progress written to this browser.' : 'Saved to this session only — export your save to keep it.', kind: STORAGE_OK ? 'good' : 'info' });
  }
};
E.hasSave = () => !!store.read();
E.load = function () {
  try {
    const raw = store.read();
    if (!raw) return false;
    const d = JSON.parse(raw);
    S = Object.assign(newState(d.name, d.avatar), d);
    S.skills = Object.assign({ str: 0, def: 0, spd: 0, dex: 0 }, d.skills);
    S.prog = Object.assign({ str: 0, def: 0, spd: 0, dex: 0 }, d.prog);
    S.inv = Object.assign({}, d.inv);
    S.equip = Object.assign({ primary: 'fists', armor: null }, d.equip);
    S.stats = Object.assign(newState().stats, d.stats);
    S.kills = Object.assign({}, d.kills);
    S.ach = Object.assign({}, d.ach);
    S.feed = Array.isArray(d.feed) ? d.feed : [];
    S.injuries = Array.isArray(d.injuries) ? d.injuries : [];
    S.jobLvl = Object.assign({}, d.jobLvl);
    return true;
  } catch (e) { return false; }
};
E.newGame = function (name, avatar) { S = newState(name, avatar); E.save(true); return S; };
E.hardReset = function () { store.clear(); S = null; };
E.state = () => S;

/* ---------------- event bus ---------------- */
const handlers = {};
E.on = (k, fn) => { (handlers[k] = handlers[k] || []).push(fn); };
E.emit = function (k, p) { (handlers[k] || []).forEach(fn => { try { fn(p); } catch (e) { console.error(e); } }); };

/* ---------------- logging ---------------- */
E.log = function (text, kind) {
  S.feed.unshift({ t: Date.now(), text, kind: kind || 'info' });
  if (S.feed.length > 60) S.feed.length = 60;
};
E.toast = (title, msg, kind) => E.emit('toast', { title, msg, kind: kind || 'info' });

/* ---------------- resources ---------------- */
E.canAct = function () {
  const now = Date.now();
  if (S.hospitalUntil > now) return { ok: false, why: `You are in the hospital — ${U.dur((S.hospitalUntil - now) / 1000)} left.` };
  if (S.jailUntil > now) return { ok: false, why: `You are in a cell — ${U.dur((S.jailUntil - now) / 1000)} left.` };
  if (E.battle) return { ok: false, why: 'You are in the middle of a fight.' };
  return { ok: true };
};
E.inHospital = () => S.hospitalUntil > Date.now();
E.inJail = () => S.jailUntil > Date.now();

E.spend = function (o) {
  if (o.energy && S.energy < o.energy) { E.emit('toast', { title: 'Too exhausted', msg: `You need ${o.energy} energy.`, kind: 'bad' }); return false; }
  if (o.nerve && S.nerve < o.nerve) { E.emit('toast', { title: 'Not enough nerve', msg: `You need ${o.nerve} nerve.`, kind: 'bad' }); return false; }
  if (o.money && S.money < o.money) { E.emit('toast', { title: 'Not enough cash', msg: `You need ${U.money(o.money)}.`, kind: 'bad' }); return false; }
  if (o.energy) S.energy -= o.energy;
  if (o.nerve) S.nerve -= o.nerve;
  if (o.money) S.money -= o.money;
  return true;
};

E.addXP = function (amount, quiet) {
  S.xp += amount;
  let leveled = 0;
  while (S.xp >= E.xpNeed() && S.level < 200) {
    S.xp -= E.xpNeed(); S.level++; leveled++;
    S.hp = E.maxHP(); S.energy = E.maxEnergy(); S.nerve = E.maxNerve();
    S.happy = Math.min(S.happy + 25, U.maxHappy());
  }
  if (leveled && !quiet) {
    E.emit('toast', { title: `LEVEL ${S.level}`, msg: 'You feel tougher, sharper — everything refilled.', kind: 'gold' });
    E.log(`Reached level ${S.level}.`, 'gold');
  }
  return leveled;
};

E.addMoney = (n) => { S.money = Math.max(0, Math.round(S.money + n)); };

E.hospitalize = function (sec, reason) {
  const defReduction = U.clamp(1 - sk().def * 0.0016, 0.55, 1);
  const until = Date.now() + Math.round(sec * 1000 * defReduction);
  S.hospitalUntil = Math.max(S.hospitalUntil || 0, until);
  S.hp = 1; S.stats.hosp++;
  E.log(`Hospitalized: ${reason}`, 'bad');
};
E.jail = function (sec, reason) {
  if (E.inHospital()) return E.hospitalize(Math.round(sec * 0.6), reason + ' (too injured for a cell)');
  S.jailUntil = Math.max(S.jailUntil || 0, Date.now() + Math.round(sec * 1000));
  S.law = Math.min(DATA.MAX_LAW, S.law + U.rand(4, 12));
  S.stats.jails++;
  E.log(`Jailed: ${reason}`, 'bad');
};
E.addItem = function (id, n) { n = n || 1; S.inv[id] = (S.inv[id] || 0) + n; };
E.removeItem = function (id, n) {
  n = n || 1;
  if ((S.inv[id] || 0) < n) return false;
  S.inv[id] -= n; if (S.inv[id] <= 0) delete S.inv[id];
  return true;
};

/* ---------------- ticking ---------------- */
E.tick = function () {
  if (!S) return;
  const now = Date.now();
  let dt = (now - S.lastTick) / 1000;
  S.lastTick = now;
  if (dt <= 0) return;
  if (dt > 86400) dt = 86400;
  S.played += dt;

  const mins = dt / 60, R = DATA.REGEN;
  const injCount = S.injuries ? S.injuries.length : 0;
  S.hp = Math.min(E.maxHP(), S.hp + R.hp * mins * (1 - injCount * 0.1));
  S.energy = Math.min(E.maxEnergy(), S.energy + R.energy * mins);
  S.nerve = Math.min(E.maxNerve(), S.nerve + R.nerve * mins);
  S.happy = Math.min(U.maxHappy(), S.happy + R.happy * mins);

  if (S.burn > 0) S.burn = Math.max(0, S.burn - dt);
  if (S.law > 0) S.law = Math.max(0, S.law - mins * 0.12);
  if (S.hospitalUntil && S.hospitalUntil <= now) { S.hospitalUntil = 0; S.hp = E.maxHP(); E.log('Discharged from the hospital.', 'good'); }
  if (S.jailUntil && S.jailUntil <= now) { S.jailUntil = 0; E.log('Released from custody.', 'info'); }
  if (S.injuries) S.injuries = S.injuries.filter(i => i.until > now);

  if (now >= S.nextInterest) { E.applyInterest(); S.nextInterest = now + 86400000; }
  if (now - S.lastDay >= 86400000) { S.lastDay = now; S.worksToday = 0; E.log('A new day breaks over Blackstone.', 'info'); }
  if (now - S.lastEvent > 210000) { S.lastEvent = now; if (U.chance(0.45)) E.randomEvent(); }

  E.checkAchievements();
  E.emit('tick', dt);
};

E.applyOffline = function () {
  if (!S) return 0;
  const away = (Date.now() - (S.lastTick || Date.now())) / 1000;
  if (away < 60) return 0;
  E.tick();
  return away;
};

E.day = () => 1 + Math.floor((Date.now() - S.created) / 86400000);

/* ---------------- bank ---------------- */
E.applyInterest = function () {
  if (S.bank > 0) {
    const g = Math.round(S.bank * DATA.BANK.dailyRate);
    S.bank += g;
    E.log(`Bank interest paid: +${U.money(g)}`, 'good');
  }
  if (S.loan > 0) {
    const g = Math.round(S.loan * DATA.BANK.loanRate);
    S.loan += g;
    E.log(`Loan interest accrued: debt now ${U.money(S.loan)}`, 'bad');
  }
};
E.deposit = function (amt) {
  amt = Math.floor(amt);
  if (!(amt > 0)) return E.toast('Invalid amount', 'Type a positive number.', 'bad');
  if (amt > S.money) return E.toast('Not enough cash', 'You cannot deposit what you do not have.', 'bad');
  S.money -= amt; S.bank += amt;
  E.log(`Deposited ${U.money(amt)}.`, 'info');
  E.emit('changed');
};
E.withdraw = function (amt) {
  amt = Math.floor(amt);
  if (!(amt > 0)) return E.toast('Invalid amount', 'Type a positive number.', 'bad');
  if (amt > S.bank) return E.toast('Not enough savings', 'Your balance is too low.', 'bad');
  S.bank -= amt; S.money += amt;
  E.log(`Withdrew ${U.money(amt)}.`, 'info');
  E.emit('changed');
};
E.borrow = function (amt) {
  amt = Math.floor(amt);
  const cap = DATA.BANK.loanCap(S.level);
  if (!(amt > 0)) return E.toast('Invalid amount', 'Type a positive number.', 'bad');
  if (S.loan + amt > cap) return E.toast('Credit limit', `The bank will not lend you more than ${U.money(cap)} at level ${S.level}.`, 'bad');
  S.loan += amt; S.money += amt;
  E.log(`Borrowed ${U.money(amt)} at ${DATA.BANK.loanRate * 100}%/day.`, 'info');
  E.emit('changed');
};
E.repay = function (amt) {
  amt = Math.floor(amt);
  if (!(amt > 0)) return E.toast('Invalid amount', 'Type a positive number.', 'bad');
  amt = Math.min(amt, S.loan, S.money);
  if (amt <= 0) return E.toast('Nothing to repay', 'You need cash on hand and an outstanding debt.', 'bad');
  S.money -= amt; S.loan -= amt;
  E.log(`Repaid ${U.money(amt)} of debt.`, 'good');
  E.emit('changed');
};

/* ---------------- gym ---------------- */
E.train = function (trainerId, skillKey) {
  const act = E.canAct();
  if (!act.ok) return E.toast('Cannot train', act.why, 'bad');
  const t = DATA.GYM.trainers.find(x => x.id === trainerId);
  if (!t) return;
  if (S.level < t.minLvl) return E.toast('Locked', `You need level ${t.minLvl} for this trainer.`, 'bad');
  if (S.money < t.cost) return E.toast('Cannot afford it', `${t.name} wants ${U.money(t.cost)} per session.`, 'bad');
  if (S.energy < DATA.GYM.energyCost) return E.toast('Too exhausted', `Training costs ${DATA.GYM.energyCost} energy.`, 'bad');
  if (S.happy < DATA.GYM.minHappy) return E.toast('Too miserable', `You need at least ${DATA.GYM.minHappy} happiness to push yourself.`, 'bad');

  const key = (t.skill === 'all') ? skillKey : t.skill;
  if (!DATA.SKILLS.some(s => s.key === key)) return;

  S.money -= t.cost; S.energy -= DATA.GYM.energyCost;
  const boost = (S.steroidUntil > Date.now()) ? 2 : 1;
  const gain = DATA.gymGain(1, t.bonus, S.happy) * boost;
  const before = sk()[key];
  S.prog[key] += gain;
  let need = DATA.gymNeed(sk()[key]);
  let gained = 0;
  while (S.prog[key] >= need && gained < 3) {
    S.prog[key] -= need; sk()[key]++; gained++;
    need = DATA.gymNeed(sk()[key]);
  }
  S.stats.trained += gained;
  S.happy = Math.max(0, S.happy - 1);

  if (gained > 0) {
    const meta = DATA.SKILLS.find(s => s.key === key);
    E.log(`Trained ${meta.name} to ${sk()[key]} (${gained > 1 ? '+' + gained : '+1'}).`, 'good');
    E.emit('toast', { title: `${meta.icon} ${meta.name} +${gained}`, msg: `Now ${sk()[key]} points. ${t.name} nods.`, kind: 'good' });
  } else {
    E.emit('toast', { title: `${t.name}`, msg: `${t.line} (+${gain.toFixed(1)} progress)`, kind: 'info' });
  }
  E.addXP(4, true);
  E.emit('changed');
};

/* ---------------- crimes ---------------- */
E.crimeChance = function (c) {
  const lawPenalty = S.law * 0.18;
  const raw = c.base + sk().dex * 0.55 + S.level * 0.42 - lawPenalty;
  return U.clamp(Math.round(raw), 4, 96);
};
E.crime = function (id) {
  const act = E.canAct();
  if (!act.ok) return E.toast('Cannot commit crimes', act.why, 'bad');
  const c = DATA.CRIMES.find(x => x.id === id);
  if (!c) return;
  if (S.level < c.minLvl) return E.toast('Too green', `You need level ${c.minLvl} for ${c.name}.`, 'bad');
  if (!E.spend({ energy: c.energy, nerve: c.nerve })) return;

  const chance = E.crimeChance(c);
  const success = U.chance(chance / 100);
  E.emit('changed');

  if (success) {
    const cash = U.rand(c.cash[0], c.cash[1]);
    const xp = U.rand(c.xp[0], c.xp[1]);
    S.money += cash;
    S.law = Math.max(0, S.law - 1);
    S.happy = Math.min(U.maxHappy(), S.happy + 4);
    S.stats.crimes++;
    E.addXP(xp);
    let lootMsg = '';
    if (U.chance(0.16)) {
      const lid = U.pick(DATA.LOOT.slice(0, U.clamp(Math.floor(S.level / 6) + 2, 2, DATA.LOOT.length)));
      E.addItem(lid); lootMsg = ` You also pocketed a <b>${DATA.ITEMS[lid].name}</b>.`;
    }
    E.log(`${c.icon} ${c.name} succeeded — ${U.money(cash)}, ${xp} XP.`, 'good');
    E.emit('toast', { title: `${c.icon} ${c.name}: SUCCESS`, msg: `${U.money(cash)} and ${xp} XP.${lootMsg}`, kind: 'good' });
  } else {
    S.stats.crimeFails++;
    E.addXP(Math.round((c.xp[0] + c.xp[1]) / 2 * 0.25), true);
    const roll = Math.random();
    if (roll < 0.34) {
      const t = U.rand(c.jail[0], c.jail[1]);
      E.jail(t, `${c.name} went wrong — cuffed on the pavement.`);
      S.happy = Math.max(0, S.happy - 10);
      E.emit('toast', { title: `${c.icon} ARRESTED`, msg: `${U.dur(t)} in a cell. Try to break out, or pay bail.`, kind: 'bad' });
    } else if (roll < 0.68) {
      const t = U.rand(c.hosp[0], c.hosp[1]);
      E.hospitalize(t, `${c.name} went wrong — you got hurt badly.`);
      S.happy = Math.max(0, S.happy - 8);
      E.emit('toast', { title: `${c.icon} INJURED`, msg: `You are in the hospital for ${U.dur((S.hospitalUntil - Date.now()) / 1000)}.`, kind: 'bad' });
    } else {
      S.law = Math.min(DATA.MAX_LAW, S.law + U.rand(3, 8));
      S.happy = Math.max(0, S.happy - 4);
      E.emit('toast', { title: `${c.icon} GOT AWAY`, msg: 'You bolted empty-handed. The cops have your description now.', kind: 'info' });
      E.log(`${c.name} failed — escaped clean.`, 'info');
    }
  }
  E.emit('changed');
};

function left0(s) { return Math.max(0, s.jailUntil - Date.now()); }
E.escape = function () {
  if (!E.inJail()) return E.toast('Not jailed', 'You are a free citizen.', 'info');
  if (!E.spend({ energy: 10, nerve: 5 })) return;
  const remaining = left0(S);
  const chance = U.clamp(16 + sk().dex * 0.8 + S.level * 0.3, 6, 78);
  if (U.chance(chance / 100)) {
    S.jailUntil = 0; S.stats.escapes++;
    S.law = Math.min(DATA.MAX_LAW, S.law + 5);
    E.addXP(90 + S.level * 6);
    E.log('Broke out of custody.', 'gold');
    E.emit('toast', { title: '🗝️ ESCAPED', msg: 'Over the wall and into the rain. Your record just got worse.', kind: 'gold' });
  } else {
    S.jailUntil = Date.now() + remaining + U.rand(120, 420) * 1000;
    S.hp = Math.max(1, S.hp - U.rand(20, 70));
    E.emit('toast', { title: 'CAUGHT', msg: 'The guards were waiting. Sentence extended and you got beaten.', kind: 'bad' });
  }
  E.emit('changed');
};

E.bail = function () {
  if (!E.inJail()) return E.toast('Not jailed', 'You are free.', 'info');
  const mins = left0(S) / 60000;
  const cost = Math.round(mins * DATA.MEDICAL.bailPerMin(S.level));
  if (S.money < cost) return E.toast('Cannot afford bail', `Bail is ${U.money(cost)} for the time remaining.`, 'bad');
  S.money -= cost; S.jailUntil = 0;
  E.log(`Paid ${U.money(cost)} bail.`, 'info');
  E.emit('toast', { title: 'Bailed out', msg: 'Money talks. You walk free.', kind: 'good' });
  E.emit('changed');
};
E.bailCost = () => Math.round((left0(S) / 60000) * DATA.MEDICAL.bailPerMin(S.level));

/* Small "do something" action while stuck in a bed or a cell. */
E.scrounge = function () {
  if (!E.inHospital() && !E.inJail()) return E.toast('Nothing to do', 'You are free — go earn real money.', 'info');
  const now = Date.now();
  if ((S.lastScrounge || 0) + 15 * 60000 > now) {
    return E.toast('Not yet', `You can scrounge again in ${U.dur(((S.lastScrounge || 0) + 15 * 60000 - now) / 1000)}.`, 'info');
  }
  S.lastScrounge = now;
  const roll = Math.random();
  if (roll < 0.45) {
    const c = U.rand(20, 90) + S.level * 12;
    S.money += c;
    E.emit('toast', { title: '🪙 Scrounged', msg: `Somebody took pity on you: ${U.money(c)}.`, kind: 'good' });
  } else if (roll < 0.7) {
    const id = U.pick(['bandage', 'candy', 'cola']);
    E.addItem(id);
    E.emit('toast', { title: '🎁 Scrounged', msg: `A visitor left a ${DATA.ITEMS[id].name}.`, kind: 'good' });
  } else if (roll < 0.88) {
    const xp = U.rand(10, 30) + S.level * 3;
    E.addXP(xp);
    E.emit('toast', { title: '📖 Scrounged', msg: `You listened to the old-timers: ${xp} XP.`, kind: 'info' });
  } else {
    S.happy = Math.max(0, S.happy - 4);
    E.emit('toast', { title: '🚫 Nothing', msg: 'Nobody even looked at you. −4 happiness.', kind: 'bad' });
  }
  E.emit('changed');
};

/* ---------------- medical ---------------- */
E.payDoctor = function () {
  if (!E.inHospital()) return E.toast('Not hospitalized', 'You are healthy enough to walk.', 'info');
  const mins = (S.hospitalUntil - Date.now()) / 60000;
  const cost = Math.round(mins * DATA.MEDICAL.docFeePerMin(S.level));
  if (S.money < cost) return E.toast('Cannot afford it', `The doctor wants ${U.money(cost)}.`, 'bad');
  S.money -= cost; S.hospitalUntil = 0; S.hp = E.maxHP();
  E.log(`Paid ${U.money(cost)} for private treatment.`, 'info');
  E.emit('toast', { title: 'Treated', msg: 'Stitched, drugged, discharged.', kind: 'good' });
  E.emit('changed');
};
E.docCost = () => Math.round(((S.hospitalUntil - Date.now()) / 60000) * DATA.MEDICAL.docFeePerMin(S.level));

/* ---------------- items ---------------- */
E.useItem = function (id) {
  const it = DATA.ITEMS[id];
  if (!it) return;
  if (!E.removeItem(id, 1)) return E.toast('None left', `You have no ${it.name}.`, 'bad');

  if (it.cat === 'weapon' || it.cat === 'armor') { E.equip(id); E.addItem(id, 1); return; }
  let bits = [];
  if (it.heal) { const before = S.hp; S.hp = Math.min(E.maxHP(), S.hp + it.heal); bits.push(`+${U.fmt(S.hp - before)} HP`); }
  if (it.energy) { const b = S.energy; S.energy = U.clamp(S.energy + it.energy, 0, E.maxEnergy()); bits.push(`${it.energy > 0 ? '+' : ''}${U.fmt(S.energy - b)} energy`); }
  if (it.nerve) { const b = S.nerve; S.nerve = U.clamp(S.nerve + it.nerve, 0, E.maxNerve()); bits.push(`${it.nerve > 0 ? '+' : ''}${U.fmt(S.nerve - b)} nerve`); }
  if (it.happy) { const b = S.happy; S.happy = U.clamp(S.happy + it.happy, 0, U.maxHappy()); bits.push(`${it.happy > 0 ? '+' : ''}${U.fmt(S.happy - b)} happy`); }
  if (id === 'steroids') { S.steroidUntil = Date.now() + 1800000; bits.push('gym gains ×2 for 30m'); }
  E.log(`Used ${it.name} (${bits.join(', ')}).`, 'info');
  E.emit('toast', { title: `${it.icon} ${it.name}`, msg: bits.length ? bits.join(', ') : 'Used.', kind: 'good' });
  E.emit('changed');
};
E.equip = function (id) {
  const it = DATA.ITEMS[id];
  if (!it || !it.slot) return;
  if (it.req && S.level < it.req) return E.toast('Too heavy for you', `${it.name} needs level ${it.req} — you are level ${S.level}.`, 'bad');
  const cur = S.equip[it.slot];
  if (id !== cur) {
    if (!E.removeItem(id, 1)) return E.toast('None left', `You have no ${it.name} to equip.`, 'bad');
    if (cur && cur !== 'fists') E.addItem(cur, 1);
    S.equip[it.slot] = id;
    E.log(`Equipped ${it.name}.`, 'info');
    E.emit('toast', { title: `${it.icon} Equipped`, msg: it.name, kind: 'good' });
  }
  E.emit('changed');
};
E.unequip = function (slot) {
  const cur = S.equip[slot];
  if (!cur || cur === 'fists') return;
  E.addItem(cur, 1);
  S.equip[slot] = null;
  E.emit('changed');
};
E.buy = function (id, qty) {
  const it = DATA.ITEMS[id]; if (!it) return;
  if (it.req && S.level < it.req) return E.toast('Not sold to you', `${it.name} requires level ${it.req}. Come back stronger.`, 'bad');
  qty = U.clamp(parseInt(qty, 10) || 1, 1, 99);
  const cost = it.price * qty;
  if (it.price <= 0) return E.toast('Not for sale', 'That cannot be bought.', 'bad');
  if (S.money < cost) return E.toast('Not enough cash', `${qty}× ${it.name} costs ${U.money(cost)}.`, 'bad');
  S.money -= cost; E.addItem(id, qty);
  E.log(`Bought ${qty}× ${it.name} for ${U.money(cost)}.`, 'info');
  E.emit('toast', { title: 'Purchased', msg: `${qty}× ${it.icon} ${it.name} — ${U.money(cost)}`, kind: 'good' });
  E.emit('changed');
};
E.sell = function (id, qty) {
  const it = DATA.ITEMS[id]; if (!it) return;
  qty = U.clamp(parseInt(qty, 10) || 1, 1, S.inv[id] || 0);
  if (qty <= 0) return E.toast('Nothing to sell', 'You do not have any.', 'bad');
  if (S.equip.primary === id || S.equip.armor === id) return E.toast('Equipped', 'Unequip it first.', 'bad');
  const value = Math.round(it.price * 0.5) * qty;
  if (!E.removeItem(id, qty)) return;
  S.money += value;
  E.log(`Sold ${qty}× ${it.name} for ${U.money(value)}.`, 'info');
  E.emit('toast', { title: 'Sold', msg: `${qty}× ${it.icon} ${it.name} → ${U.money(value)}`, kind: 'gold' });
  E.emit('changed');
};
/* One-click upgrade: buy + equip the best weapon and armor you are level- and cash-qualified for. */
E.buyUpgrades = function () {
  const reserve = Math.round(S.money * 0.15);
  let got = [];
  for (const slot of ['weapon', 'armor']) {
    const cur = slot === 'weapon' ? E.weapon() : E.armor();
    const metric = slot === 'weapon' ? (i => i.str) : (i => i.def);
    let best = null;
    for (const it of Object.values(DATA.ITEMS)) {
      if (it.cat !== slot || it.price <= 0) continue;
      if (it.req && S.level < it.req) continue;
      if (cur && metric(it) <= metric(cur)) continue;
      if (it.price > S.money - reserve) continue;
      if (!best || metric(it) > metric(best)) best = it;
    }
    if (best) { E.buy(best.id, 1); E.equip(best.id); if (S.equip[best.slot] === best.id) got.push(best.icon + ' ' + best.name); }
  }
  if (!got.length) E.emit('toast', { title: 'No upgrades available', msg: 'Nothing better fits your level and budget right now (15% of your cash is kept in reserve).', kind: 'info' });
  else E.emit('toast', { title: '⬆️ Geared up', msg: got.join(' · '), kind: 'gold' });
  E.emit('changed');
};

E.sellValue = id => Math.round((DATA.ITEMS[id] ? DATA.ITEMS[id].price : 0) * 0.5);

/* ---------------- jobs ---------------- */
E.jobLevel = id => {
  const j = DATA.JOBS.find(x => x.id === id); if (!j) return null;
  let lvl = 0;
  for (let i = j.levels.length - 1; i >= 0; i--) {
    if (S.level >= j.levels[i].req) { lvl = i; break; }
  }
  return lvl;
};
E.jobRank = id => { const j = DATA.JOBS.find(x => x.id === id); return j ? j.levels[E.jobLevel(id)] : null; };
E.takeJob = function (id) {
  const j = DATA.JOBS.find(x => x.id === id); if (!j) return;
  if (E.jobLevel(id) === 0 && j.levels[0].req > S.level) return E.toast('Not qualified', `You need level ${j.levels[0].req}.`, 'bad');
  S.job = id; S.jobLvl[id] = E.jobLevel(id);
  E.log(`Took a job at ${j.company} as ${E.jobRank(id).title}.`, 'info');
  E.emit('toast', { title: `${j.icon} Hired`, msg: `${E.jobRank(id).title} at ${j.company}.`, kind: 'good' });
  E.emit('changed');
};
E.quitJob = function () {
  if (!S.job) return;
  const j = DATA.JOBS.find(x => x.id === S.job);
  E.log(`Quit ${j.company}.`, 'info');
  S.job = null;
  E.emit('toast', { title: 'Quit', msg: 'You walked out. The door hit you on the way.', kind: 'info' });
  E.emit('changed');
};
E.work = function () {
  const act = E.canAct();
  if (!act.ok) return E.toast('Cannot work', act.why, 'bad');
  if (!S.job) return E.toast('Unemployed', 'Pick a job first.', 'bad');
  const j = DATA.JOBS.find(x => x.id === S.job);
  const rank = E.jobRank(S.job);
  if (S.energy < 5) return E.toast('Too exhausted', 'A shift costs 5 energy.', 'bad');
  S.energy -= 5;

  if (S.worksToday >= DATA.WORK_PER_DAY) {
    S.happy = Math.max(0, S.happy - 5);
    E.emit('toast', { title: 'Sent home', msg: `${j.boss} says the shift is over. −5 happiness.`, kind: 'bad' });
    E.emit('changed'); return;
  }
  S.worksToday++; S.stats.works++;
  const pay = U.rand(rank.pay[0], rank.pay[1]);
  const xp = rank.xp;
  S.money += pay;
  S.happy = Math.max(0, S.happy - 2);
  E.addXP(xp);
  let extra = '';
  if (U.chance(0.08)) { const tip = U.rand(60, 400); S.money += tip; extra = ` ${j.boss} slips you a ${U.money(tip)} tip.`; }
  if (U.chance(0.05)) { E.addItem('bandage'); extra += ' You find a first aid bandage in the supply closet.'; }
  /* promotion check */
  const nl = E.jobLevel(S.job);
  if (nl > (S.jobLvl[S.job] || 0)) {
    S.jobLvl[S.job] = nl;
    extra += ` <b>Promoted to ${j.levels[nl].title}!</b>`;
    E.log(`Promoted at ${j.company} to ${j.levels[nl].title}.`, 'gold');
  }
  E.log(`Worked a shift at ${j.company} — ${U.money(pay)}, ${xp} XP.`, 'info');
  E.emit('toast', { title: `${j.icon} Shift complete`, msg: `${U.money(pay)} and ${xp} XP.${extra}`, kind: 'gold' });
  E.emit('changed');
};

/* ---------------- mugging ---------------- */
/* Head-to-head forecast used by the streets list, so players can read the odds. */
E.forecast = function (e) {
  const st = E.battleStats();
  const pHits = Math.max(1, st.dmg * (100 / (100 + e.def)) * (st.acc / 100) / st.swing);
  const eHit = Math.max(1, E.enemyRaw(e) * (100 / (100 + st.def)));
  const eHits = eHit * (e.acc / 100) / E.enemySwing(e);
  const tKill = e.hp / pHits;
  const tDie = E.maxHP() / eHits;
  const ratio = tDie / Math.max(0.01, tKill);
  const win = U.clamp(Math.round(50 + (ratio - 1) * 34), 3, 97);
  return { win, pHits: Math.round(pHits), eHit: Math.round(eHit), tKill: tKill, tDie: tDie, ratio };
};

E.mugChance = e => U.clamp(45 + (sk().dex - e.dex) * 2.2 + (S.level - e.lvl) * 1.5, 8, 93);
E.mug = function (id) {
  const act = E.canAct();
  if (!act.ok) return E.toast('Cannot mug', act.why, 'bad');
  const e = DATA.ENEMIES.find(x => x.id === id); if (!e) return;
  if (S.level + 6 < e.lvl) return E.toast('Too dangerous', 'They would see you coming a mile off.', 'bad');
  if (!E.spend({ energy: 3, nerve: 4 })) return;
  S.stats.mugs++;
  const chance = E.mugChance(e);
  if (U.chance(chance / 100)) {
    const cash = Math.max(5, Math.round(U.rand(e.cash[0], e.cash[1]) * 0.7));
    S.money += cash; E.addXP(Math.round((e.xp[0] + e.xp[1]) / 2 * 0.5));
    S.law = Math.min(DATA.MAX_LAW, S.law + 2);
    E.log(`Mugged ${e.name} for ${U.money(cash)}.`, 'good');
    E.emit('toast', { title: '👛 Mugged', msg: `${e.name} hands over ${U.money(cash)} and runs.`, kind: 'good' });
  } else if (U.chance(0.5)) {
    E.startBattle(id, 'They turned on you mid-mug.');
    return;
  } else {
    S.law = Math.min(DATA.MAX_LAW, S.law + 3);
    E.emit('toast', { title: 'Got away', msg: `${e.name} saw you coming and bolted. Nothing taken.`, kind: 'info' });
    E.log(`Failed to mug ${e.name}.`, 'info');
  }
  E.emit('changed');
};

/* ---------------- combat ---------------- */
E.battle = null;
let bTimer = null;

E.startBattle = function (enemyId, intro) {
  const e = DATA.ENEMIES.find(x => x.id === enemyId);
  if (!e) return;
  const act = E.canAct();
  if (!act.ok) return E.toast('Cannot fight', act.why, 'bad');
  if (!E.spend({ energy: 3 })) return;

  const st = E.battleStats();
  E.battle = {
    enemy: e,
    ehp: e.hp, ehpMax: e.hp,
    php: S.hp, phpMax: E.maxHP(),
    pMeter: 0, eMeter: 0,
    pNeed: E.swingTime(),
    eNeed: E.enemySwing(e),
    t: 0, over: false, win: null,
    log: [{ cls: 'sys', text: intro || `You square up to ${e.name} in the ${e.tier.toLowerCase()}.` }],
    burnTick: 0,
    started: Date.now()
  };
  S.hp = E.battle.php;
  E.emit('battlestart', E.battle);
  E.emit('changed');
  if (!bTimer) bTimer = setInterval(E.battleTick, 100);
};

E.battleTick = function () {
  const B = E.battle;
  if (!B || B.over) return;
  const dt = 0.1;
  B.t += dt;
  const st = E.battleStats();
  const e = B.enemy;
  B.pNeed = E.swingTime();
  B.eNeed = E.enemySwing(e);

  B.pMeter += dt;
  B.eMeter += dt;

  if (B.pMeter >= B.pNeed) { B.pMeter = 0; E.playerHit(B, st); }
  if (B.over) return;
  if (B.eMeter >= B.eNeed) { B.eMeter = 0; E.enemyHit(B, st); }

  /* burn damage over time */
  if (S.burn > 0 && B.t - B.burnTick >= 1) {
    B.burnTick = B.t;
    const bd = U.rand(4, 9 + Math.floor(S.level / 4));
    B.php = Math.max(0, B.php - bd);
    B.log.push({ cls: 'foe', text: `🔥 You burn for ${bd}.` });
    if (B.log.length > 400) B.log.splice(0, B.log.length - 400);
    if (B.php <= 0) return E.endBattle(false, 'The fire finished you.');
  }
  S.hp = B.php;
  E.emit('battletick', B);
};

function variance(x) { return x * (0.88 + Math.random() * 0.26); }

E.playerHit = function (B, st) {
  const e = B.enemy;
  const acc = U.clamp(st.acc - e.dex * 0.22, 32, 97);
  if (!U.chance(acc / 100)) {
    B.log.push({ cls: 'you', text: `You swing your ${st.wpn.name.toLowerCase()} — ${e.name} slips aside. (miss)` });
    E.emit('battlemiss', 'foe'); return;
  }
  let dmg = variance(st.dmg);
  dmg *= 100 / (100 + e.def);
  const crit = U.chance(st.crit / 100);
  if (crit) dmg *= 1.85;
  dmg = Math.max(1, Math.round(dmg));
  B.ehp = Math.max(0, B.ehp - dmg);
  S.stats.bestHit = Math.max(S.stats.bestHit, dmg);
  B.log.push({ cls: crit ? 'crit' : 'you', text: `${crit ? '💥 CRITICAL! ' : ''}You hit ${e.name} with ${st.wpn.icon} ${st.wpn.name} for ${U.fmt(dmg)}.` });
  E.emit('battledmg', { who: 'foe', dmg, crit });
  if (B.ehp <= 0) E.endBattle(true);
};

E.enemyHit = function (B, st) {
  const e = B.enemy;
  if (!U.chance(e.acc / 100)) {
    B.log.push({ cls: 'foe', text: `${e.name} lunges at you — you get out of the way. (miss)` });
    E.emit('battlemiss', 'you'); return;
  }
  let dmg = variance(E.enemyRaw(e));
  dmg *= 100 / (100 + st.def);
  const crit = U.chance(5 + e.dex * 0.07);
  if (crit) dmg *= 1.6;
  dmg = Math.max(1, Math.round(dmg));
  B.php = Math.max(0, B.php - dmg);
  B.log.push({ cls: crit ? 'crit' : 'foe', text: `${crit ? '💥 CRITICAL! ' : ''}${e.icon} ${e.name} hits you for ${U.fmt(dmg)}.` });
  E.emit('battledmg', { who: 'you', dmg, crit });
  if (e.id === 'arsonist' && U.chance(0.28) && S.burn <= 0) {
    S.burn = 5 + U.rand(0, 3);
    B.log.push({ cls: 'foe', text: '🔥 He douses you in accelerant — you are BURNING.' });
  }
  if (B.php <= 0) E.endBattle(false, `${e.name} puts you down.`);
};

E.endBattle = function (win, reason) {
  const B = E.battle;
  if (!B || B.over) return;
  B.over = true; B.win = win;
  const e = B.enemy;
  S.hp = Math.max(win ? 1 : 1, B.php);
  if (win) {
    S.kills[e.id] = (S.kills[e.id] || 0) + 1;
    S.stats.kills++;
    const cash = U.rand(e.cash[0], e.cash[1]);
    const xp = U.rand(e.xp[0], e.xp[1]);
    S.money += cash;
    E.addXP(xp);
    S.happy = Math.min(U.maxHappy(), S.happy + 6);
    S.law = Math.min(DATA.MAX_LAW, S.law + 1);
    let loot = null;
    if (U.chance(0.30)) {
      const maxIdx = U.clamp(Math.floor(e.lvl / 7) + 2, 1, DATA.LOOT.length);
      loot = U.pick(DATA.LOOT.slice(0, maxIdx));
      E.addItem(loot);
    }
    if (U.chance(0.10)) { E.addItem('bandage'); }
    B.log.push({ cls: 'big', text: `☠️ ${e.name} goes down.` });
    B.log.push({ cls: 'loot', text: `💰 You take ${U.money(cash)} and ${xp} XP${loot ? `, plus a ${DATA.ITEMS[loot].name}` : ''}.` });
    E.log(`Defeated ${e.name} — ${U.money(cash)}, ${xp} XP${loot ? ', ' + DATA.ITEMS[loot].name : ''}.`, 'gold');
    E.emit('toast', { title: `🏆 ${e.name} defeated`, msg: `${U.money(cash)}, ${xp} XP${loot ? `, ${DATA.ITEMS[loot].icon} ${DATA.ITEMS[loot].name}` : ''}`, kind: 'gold' });
  } else {
    S.stats.losses++;
    S.happy = Math.max(0, S.happy - 12);
    S.burn = 0;
    if (U.chance(0.65)) {
      const t = U.rand(60, 150) + e.lvl * 4;
      E.hospitalize(t, reason || `beaten by ${e.name}`);
      B.log.push({ cls: 'sys', text: `🚑 You wake up in the hospital. ${U.dur(t)} of treatment.` });
    } else {
      const loss = Math.min(S.money, U.rand(50, 400) + e.lvl * 40);
      S.money -= loss;
      S.hp = Math.max(1, Math.round(E.maxHP() * 0.2));
      B.log.push({ cls: 'sys', text: `🏃 You crawl away. They took ${U.money(loss)} off you.` });
    }
    E.log(`Lost a fight to ${e.name}.`, 'bad');
    if (!E.inHospital()) E.emit('toast', { title: '💀 Defeated', msg: reason || `${e.name} beat you badly.`, kind: 'bad' });
  }
  E.emit('battleend', B);
  E.emit('changed');
};

E.flee = function () {
  const B = E.battle;
  if (!B || B.over) return;
  if (S.energy < 1) { E.toast('Too exhausted', 'Fleeing costs 1 energy.', 'bad'); return; }
  S.energy -= 1;
  B.log.push({ cls: 'sys', text: '🏃 You break off and run. They get one swing at your back.' });
  const st = E.battleStats();
  if (U.chance(0.55)) {
    let dmg = Math.max(1, Math.round(variance(E.mitigate(E.enemyRaw(B.enemy), st.def)) * 0.7));
    B.php = Math.max(1, B.php - dmg);
    B.log.push({ cls: 'foe', text: `${B.enemy.name} clips you for ${U.fmt(dmg)} as you go.` });
    E.emit('battledmg', { who: 'you', dmg, crit: false });
  } else {
    B.log.push({ cls: 'you', text: 'You get away clean.' });
  }
  S.hp = B.php;
  B.over = true; B.win = null; B.fled = true;
  S.happy = Math.max(0, S.happy - 4);
  E.log(`Fled from ${B.enemy.name}.`, 'info');
  E.emit('battleend', B);
  E.emit('changed');
};

E.battleItem = function (id) {
  const B = E.battle;
  if (!B || B.over) return;
  const it = DATA.ITEMS[id]; if (!it) return;
  if (!E.removeItem(id, 1)) return E.toast('None left', `You have no ${it.name}.`, 'bad');
  let bits = [];
  if (it.heal) { const b = B.php; B.php = Math.min(B.phpMax, B.php + it.heal); bits.push(`+${U.fmt(B.php - b)} HP`); S.hp = B.php; }
  if (it.energy) { S.energy = U.clamp(S.energy + it.energy, 0, E.maxEnergy()); bits.push('energy'); }
  if (it.happy) { S.happy = U.clamp(S.happy + it.happy, 0, U.maxHappy()); bits.push('happy'); }
  B.log.push({ cls: 'sys', text: `${it.icon} You use ${it.name} (${bits.join(', ') || 'no combat effect'}).` });
  E.emit('battletick', B);
};

/* ---------------- random events ---------------- */
E.randomEvent = function () {
  const act = E.canAct();
  if (!act.ok) return;
  const pool = DATA.EVENTS.slice();
  let total = pool.reduce((a, b) => a + b.w, 0);
  let r = Math.random() * total, ev = pool[0];
  for (const p of pool) { r -= p.w; if (r <= 0) { ev = p; break; } }
  const res = ev.fn(S) || { msg: '', kind: 'info' };
  if (res.after) res.after();
  E.log(`${ev.text} (${res.msg})`, res.kind === 'bad' ? 'bad' : 'good');
  E.emit('toast', { title: '🌃 Street event', msg: `${ev.text} <b>${res.msg || ''}</b>`, kind: res.kind || 'info' });
  E.emit('changed');
};

/* ---------------- achievements ---------------- */
E.checkAchievements = function () {
  for (const a of DATA.ACHIEVEMENTS) {
    if (S.ach[a.id]) continue;
    let ok = false;
    try { ok = a.check(S); } catch (e) { ok = false; }
    if (ok) {
      S.ach[a.id] = Date.now();
      S.money += a.reward;
      E.log(`Achievement unlocked: ${a.name} (+${U.money(a.reward)})`, 'gold');
      E.emit('toast', { title: `${a.icon} ${a.name}`, msg: `${a.desc} — reward ${U.money(a.reward)}`, kind: 'gold' });
      E.emit('ach', a);
    }
  }
};

E.reset = function (name, avatar) {
  E.battle = null;
  S = newState(name || S.name, avatar || S.avatar);
  E.save(true);
  E.emit('changed');
};

window.U = U;
window.DATA = DATA;
window.E = E;
