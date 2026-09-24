/* =========================================================
   BLACKSTONE — UI / rendering
   ========================================================= */
'use strict';

const UI = { page: 'home', marketCat: 'weapon', tier: 'All', dirty: false, ready: false };

const $ = sel => document.querySelector(sel);
const el = {
  get main() { return $('#main'); },
  get nav() { return $('#nav'); },
  get bars() { return $('#bars'); },
  get cash() { return $('#cash'); },
  get footL() { return $('#foot-l'); },
  get footM() { return $('#foot-m'); },
  get toasts() { return $('#toasts'); },
  get modal() { return $('#modal-root'); }
};

/* Patch generated markup in place instead of replacing an entire screen every second.
   Keeping existing nodes avoids visible flashes and preserves focus/input state. */
function patchChildren(currentParent, nextParent) {
  const current = Array.from(currentParent.childNodes);
  const next = Array.from(nextParent.childNodes);
  const len = Math.max(current.length, next.length);
  for (let i = 0; i < len; i++) {
    const oldNode = current[i], newNode = next[i];
    if (!oldNode) { currentParent.appendChild(newNode.cloneNode(true)); continue; }
    if (!newNode) { oldNode.remove(); continue; }
    patchNode(oldNode, newNode);
  }
}
function patchNode(oldNode, newNode) {
  if (oldNode.isEqualNode(newNode)) return;
  if (oldNode.nodeType !== newNode.nodeType ||
      (oldNode.nodeType === 1 && oldNode.tagName !== newNode.tagName)) {
    oldNode.replaceWith(newNode.cloneNode(true));
    return;
  }
  if (oldNode.nodeType === 3 || oldNode.nodeType === 8) {
    oldNode.nodeValue = newNode.nodeValue;
    return;
  }
  if (oldNode.nodeType !== 1) return;

  const keepInputValue = oldNode === document.activeElement && /^(INPUT|TEXTAREA|SELECT)$/.test(oldNode.tagName);
  Array.from(oldNode.attributes).forEach(a => {
    if (!newNode.hasAttribute(a.name)) oldNode.removeAttribute(a.name);
  });
  Array.from(newNode.attributes).forEach(a => {
    if (keepInputValue && a.name === 'value') return;
    if (oldNode.getAttribute(a.name) !== a.value) oldNode.setAttribute(a.name, a.value);
  });
  patchChildren(oldNode, newNode);
}
function patchHTML(root, html) {
  const template = document.createElement('template');
  template.innerHTML = html;
  patchChildren(root, template.content);
}
function setText(node, value) {
  value = String(value);
  if (node && node.textContent !== value) node.textContent = value;
}

/* ---------------- nav ---------------- */
const NAV = [
  { group: 'You', items: [
    { id: 'home',    label: 'Overview',   icon: '🏠' },
    { id: 'profile', label: 'Character',  icon: '👤' },
    { id: 'gym',     label: 'Gym',        icon: '🏋️' },
    { id: 'job',     label: 'Employment', icon: '💼' }
  ]},
  { group: 'The Streets', items: [
    { id: 'crime',   label: 'Crimes',     icon: '🎭' },
    { id: 'streets', label: 'Fight',      icon: '⚔️' },
    { id: 'items',   label: 'Market',     icon: '🛒' },
    { id: 'inv',     label: 'Inventory',  icon: '🎒' }
  ]},
  { group: 'Services', items: [
    { id: 'bank',    label: 'Bank',       icon: '🏦' },
    { id: 'medical', label: 'Medical',    icon: '⚕️' }
  ]},
  { group: 'City', items: [
    { id: 'online',  label: 'Online',     icon: '🌐' }
  ]}
];

/* ---------------- helpers ---------------- */
function barHTML(id, label, val, max, cls, fmtVal) {
  const p = U.pct(val, max);
  return `<div class="bar" id="bar-${id}">
    <div class="lbl"><span>${label}</span><b>${fmtVal || (U.fmt(val) + ' / ' + U.fmt(max))}</b></div>
    <div class="track ${p <= 20 ? 'low' : ''}"><div class="fill ${cls}" style="width:${p}%"></div></div>
  </div>`;
}

function updateBars() {
  const S = E.state();
  const hpMax = E.maxHP(), enMax = E.maxEnergy(), nvMax = E.maxNerve(), haMax = U.maxHappy();
  if (!document.getElementById('bar-hp')) patchHTML(el.bars,
    barHTML('hp', '❤️ Health', S.hp, hpMax, 'hp') +
    barHTML('en', '⚡ Energy', S.energy, enMax, 'en') +
    barHTML('nv', '🧠 Nerve', S.nerve, nvMax, 'nv') +
    barHTML('ha', '😊 Happy', S.happy, haMax, 'ha'));
  [
    ['hp', S.hp, hpMax], ['en', S.energy, enMax],
    ['nv', S.nerve, nvMax], ['ha', S.happy, haMax]
  ].forEach(([id, value, max]) => {
    const root = document.getElementById('bar-' + id);
    if (!root) return;
    const label = root.querySelector('.lbl b');
    const track = root.querySelector('.track');
    const fill = root.querySelector('.fill');
    const p = U.pct(value, max);
    if (label) label.textContent = `${U.fmt(value)} / ${U.fmt(max)}`;
    if (track) track.classList.toggle('low', p <= 20);
    if (fill && fill.style.width !== p + '%') fill.style.width = p + '%';
  });
  setText(el.cash, U.money(S.money));
  setText(el.footL, `Day ${E.day()} · Lvl ${S.level} · ${S.name}`);
  const bits = [];
  if (E.inHospital()) bits.push(`🏥 hospital ${U.durShort((S.hospitalUntil - Date.now()) / 1000)}`);
  if (E.inJail()) bits.push(`🔒 jail ${U.durShort((S.jailUntil - Date.now()) / 1000)}`);
  if (S.burn > 0) bits.push(`🔥 burning ${U.durShort(S.burn)}`);
  if (S.steroidUntil > Date.now()) bits.push(`🧪 stims ${U.durShort((S.steroidUntil - Date.now()) / 1000)}`);
  setText(el.footM, bits.join('   ·   '));
}

function renderNav() {
  const S = E.state();
  let h = '';
  NAV.forEach((g, gi) => {
    if (gi) h += '<div class="nav-sep"></div>';
    h += `<div class="nav-h">${g.group}</div>`;
    g.items.forEach(it => {
      let tag = '';
      if (it.id === 'medical' && (E.inHospital() || E.inJail())) tag = '<span class="tag">!</span>';
      h += `<a href="#" data-nav="${it.id}" class="${UI.page === it.id ? 'active' : ''}"><span class="ic">${it.icon}</span>${it.label}${tag}</a>`;
    });
  });
  patchHTML(el.nav, h);
}

/* ---------------- toasts ---------------- */
function toast(title, msg, kind) {
  const t = document.createElement('div');
  t.className = 'toast ' + (kind || 'info');
  t.innerHTML = `<b>${title}</b><span>${msg || ''}</span>`;
  el.toasts.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; t.style.transition = 'all .3s'; }, 3000);
  setTimeout(() => t.remove(), 3400);
  while (el.toasts.children.length > 5) el.toasts.firstChild.remove();
}

/* ---------------- modal ---------------- */
UI.modal = function (title, bodyHTML, footHTML, opts) {
  opts = opts || {};
  el.modal.classList.remove('hidden');
  el.modal.innerHTML = `<div class="modal" style="${opts.width ? 'width:' + opts.width : ''}">
    <div class="m-head"><h3>${title}</h3>${opts.noClose ? '' : '<button class="x" data-close="1">✕</button>'}</div>
    <div class="m-body">${bodyHTML}</div>
    ${footHTML ? `<div class="m-foot">${footHTML}</div>` : ''}
  </div>`;
  if (opts.onMount) opts.onMount(el.modal);
};
UI.closeModal = function () { el.modal.classList.add('hidden'); el.modal.innerHTML = ''; };

/* ---------------- pages ---------------- */
const P = {};

/* ========== HOME ========== */
P.home = function () {
  const S = E.state(), bs = E.battleStats();
  const now = Date.now();
  let alerts = '';
  if (E.inHospital()) {
    alerts += `<div class="lockmsg">🏥 <b>You are in the hospital.</b> ${U.dur((S.hospitalUntil - now) / 1000)} of treatment remaining.
      <div class="btn-row" style="margin-top:8px">
        <button class="btn sm blue" data-act="doctor">Pay doctor ${U.money(E.docCost())}</button>
        <button class="btn sm ghost" data-act="scrounge">🪙 Scrounge</button>
        <button class="btn sm ghost" data-nav="medical">Medical centre</button>
      </div></div>`;
  }
  if (E.inJail()) {
    alerts += `<div class="lockmsg">🔒 <b>You are in a cell.</b> ${U.dur((S.jailUntil - now) / 1000)} left on your sentence.
      <div class="btn-row" style="margin-top:8px">
        <button class="btn sm red" data-act="escape">Attempt escape (${U.clamp(Math.round(16 + S.skills.dex * 0.8 + S.level * 0.3), 6, 78)}%)</button>
        <button class="btn sm blue" data-act="bail">Pay bail ${U.money(E.bailCost())}</button>
      </div></div>`;
  }
  if (S.happy < DATA.GYM.minHappy) alerts += `<div class="warnmsg">😞 <b>Miserable.</b> Happiness is below ${DATA.GYM.minHappy} — the gym will turn you away. Buy candy, drugs or a drink.</div>`;
  if (S.energy < 5) alerts += `<div class="warnmsg">🥱 <b>Exhausted.</b> Under 5 energy: most actions are closed to you until you rest or dose up.</div>`;
  if (S.loan > 0) alerts += `<div class="warnmsg">🏦 <b>Debt:</b> ${U.money(S.loan)} accruing ${(DATA.BANK.loanRate * 100)}% per day. <button class="btn tiny ghost" data-nav="bank">Bank</button></div>`;
  if (S.steroidUntil > now) alerts += `<div class="okmsg">🧪 <b>Stimmed.</b> Gym gains are doubled for ${U.dur((S.steroidUntil - now) / 1000)}.</div>`;

  const w = bs.wpn, a = bs.arm;
  const quick = [
    { nav: 'gym', icon: '🏋️', t: 'Train', s: `${U.money(DATA.GYM.trainers[0].cost)} a session` },
    { nav: 'crime', icon: '🎭', t: 'Crime', s: `${E.crimeChance(DATA.CRIMES[Math.max(0, Math.min(DATA.CRIMES.length - 1, S.level - 1))])}% best odds` },
    { nav: 'streets', icon: '⚔️', t: 'Fight', s: '3 energy a scrap' },
    { nav: 'job', icon: '💼', t: 'Work', s: `${DATA.WORK_PER_DAY - S.worksToday} shifts left today` },
    { nav: 'items', icon: '🛒', t: 'Market', s: 'weapons, armor, drugs' },
    { nav: 'bank', icon: '🏦', t: 'Bank', s: `${U.money(S.bank)} saved` }
  ];

  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">${S.avatar} ${U.esc(S.name)} <span class="sub">Level ${S.level} · Day ${E.day()} · ${U.dur(S.played)} played</span></div>
      <div class="p-body">
        ${alerts}
        <div class="grid g2" style="margin-top:${alerts ? 10 : 0}px">
          <div class="muted-box">
            <h4>Experience</h4>
            ${barHTML('xp', 'Level ' + S.level + ' → ' + (S.level + 1), S.xp, E.xpNeed(), 'xp')}
            <div class="kv" style="margin-top:8px"><span>Total trained points</span><span>${U.fmt(E.totalSkill())}</span></div>
            <div class="kv"><span>Law suspicion</span><span class="${S.law > 50 ? 'red' : ''}">${U.fmt(S.law)} / ${DATA.MAX_LAW}</span></div>
            <div class="kv"><span>Fights won / lost</span><span>${S.stats.kills} / ${S.stats.losses}</span></div>
          </div>
          <div class="muted-box">
            <h4>Combat readout</h4>
            <div class="kv"><span>Weapon</span><span>${w.icon} ${w.name}</span></div>
            <div class="kv"><span>Armor</span><span>${a ? a.icon + ' ' + a.name : '— none —'}</span></div>
            <div class="kv"><span>Damage / hit</span><span class="gold">≈ ${U.fmt(bs.dmg)}</span></div>
            <div class="kv"><span>Defense</span><span>${U.fmt(bs.def)}</span></div>
            <div class="kv"><span>Accuracy / crit</span><span>${bs.acc}% / ${bs.crit.toFixed(1)}%</span></div>
            <div class="kv"><span>Swing every</span><span>${bs.swing.toFixed(2)}s</span></div>
          </div>
        </div>
      </div>
    </div>

    ${(() => {
      const S2 = E.state();
      if (S2.level > 4) return '';
      const steps = [
        { done: S2.equip.primary !== 'fists', nav: 'inv',    txt: 'Equip the <b>Wooden Baseball Bat</b> sitting in your bag — bare fists will not win you anything.' },
        { done: !!S2.equip.armor,               nav: 'inv',    txt: 'Put on the <b>Leather Hoodie</b>. Armor is the cheapest way to survive your first real fight.' },
        { done: S2.stats.kills >= 1,            nav: 'streets',txt: 'Beat the <b>Sewer Rat Pack</b> in the streets for your first cash and XP.' },
        { done: !!S2.job,                       nav: 'job',    txt: 'Take a <b>job</b> — eight shifts a day of honest money and XP while your nerve refills.' },
        { done: S2.stats.trained >= 1,          nav: 'gym',    txt: 'Train one point at the <b>gym</b>. Strength is damage; Dexterity is crime success.' },
        { done: S2.stats.crimes >= 1,           nav: 'crime',  txt: 'Pull your first <b>pickpocket</b>. Nerve is the throttle on criminal income.' }
      ];
      const left = steps.filter(s => !s.done).length;
      if (!left) return '<div class="panel"><div class="p-body"><div class="okmsg">✅ <b>You know the ropes now.</b> Keep training, keep upgrading gear, and work your way up the enemy tiers — the Kingpin is at the top.</div></div></div>';
      return `<div class="panel">
        <div class="p-head">🧭 First steps <span class="sub">${steps.length - left} of ${steps.length} done</span></div>
        <div class="p-body tight">
          <div class="track" style="margin:4px 4px 10px"><div class="fill xp" style="width:${Math.round((steps.length - left) / steps.length * 100)}%"></div></div>
          ${steps.map(s => `<div class="kv" style="padding:6px 4px">
            <span style="color:${s.done ? 'var(--dimmer)' : 'var(--text)'}">${s.done ? '✅' : '⬜'} <span style="${s.done ? 'text-decoration:line-through' : ''}">${s.txt}</span></span>
            <span>${s.done ? '' : `<button class="btn tiny ghost" data-nav="${s.nav}">Go</button>`}</span>
          </div>`).join('')}
        </div>
      </div>`;
    })()}

    <div class="panel">
      <div class="p-head">🚀 Quick actions</div>
      <div class="p-body tight">
        <div class="grid g3">
          ${quick.map(q => `<div class="card" data-nav="${q.nav}" style="cursor:pointer">
            <div class="c-top"><div class="c-ic">${q.icon}</div><div><div class="c-nm">${q.t}</div><div class="c-sub">${q.s}</div></div></div>
          </div>`).join('')}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="p-head">📜 What has been happening <span class="sub">last ${Math.min(S.feed.length, 25)} events</span></div>
      <div class="p-body tight">
        ${S.feed.length ? `<div class="feed">${S.feed.slice(0, 25).map(f => `<div><span class="t">${new Date(f.t).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span><span class="${f.kind === 'bad' ? 'red' : f.kind === 'gold' ? 'gold' : f.kind === 'good' ? 'green' : 'dim'}">${f.text}</span></div>`).join('')}</div>`
          : '<p class="dim">Nothing yet. Go commit a crime, train, or pick a fight.</p>'}
      </div>
    </div>
  </div>`;
};

/* ========== GYM ========== */
P.gym = function () {
  const S = E.state();
  const locked = E.inHospital() || E.inJail();
  const st = E.battleStats();
  return `
  <div class="page">
    ${locked ? `<div class="lockmsg">🚫 You cannot train while ${E.inJail() ? 'in a cell' : 'in the hospital'}.</div>` : ''}
    <div class="panel">
      <div class="p-head">🏋️ Your body <span class="sub">Each session: ${DATA.GYM.energyCost} energy · costs cash · needs ${DATA.GYM.minHappy}+ happiness</span></div>
      <div class="p-body">
        <div class="grid g2">
          ${DATA.SKILLS.map(s => {
            const cur = S.skills[s.key], need = DATA.gymNeed(cur), p = U.pct(S.prog[s.key], need);
            return `<div class="muted-box">
              <div class="stat-row" style="border:0;padding-top:0">
                <div class="s-ic">${s.icon}</div><div class="s-nm">${s.name}</div>
                <div class="s-val">${U.fmt(cur)}</div>
              </div>
              <div class="track" style="margin:2px 0 6px"><div class="fill ${s.key === 'str' ? 'hp' : s.key === 'def' ? 'nv' : s.key === 'spd' ? 'en' : 'ha'}" style="width:${p}%"></div></div>
              <div class="tiny dim" style="margin-bottom:7px">${U.fmt(Math.floor(S.prog[s.key]))} / ${U.fmt(need)} progress to the next point · ${s.desc}</div>
            </div>`;
          }).join('')}
        </div>
        <div class="hr"></div>
        <div class="grid g4 tiny">
          <div class="muted-box"><div class="dimmer">DAMAGE / HIT</div><div class="bignum gold">${U.fmt(st.dmg)}</div></div>
          <div class="muted-box"><div class="dimmer">DEFENSE</div><div class="bignum">${U.fmt(st.def)}</div></div>
          <div class="muted-box"><div class="dimmer">ACCURACY</div><div class="bignum">${st.acc}%</div></div>
          <div class="muted-box"><div class="dimmer">CRIT CHANCE</div><div class="bignum">${st.crit.toFixed(1)}%</</div></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="p-head">🥊 Trainers</div>
      <div class="p-body tight">
        <div class="grid g2">
          ${DATA.GYM.trainers.map(t => {
            const can = !locked && S.level >= t.minLvl && S.money >= t.cost && S.energy >= DATA.GYM.energyCost && S.happy >= DATA.GYM.minHappy;
            const skillName = t.skill === 'all' ? 'any stat' : DATA.SKILLS.find(s => s.key === t.skill).name;
            const btns = t.skill === 'all'
              ? DATA.SKILLS.map(s => `<button class="btn sm ${can ? 'purple' : ''}" data-act="train" data-id="${t.id}" data-skill="${s.key}" ${can ? '' : 'disabled'}>${s.icon} ${s.name.split(' ')[0]}</button>`).join('')
              : `<button class="btn sm ${can ? 'gold' : ''}" data-act="train" data-id="${t.id}" ${can ? '' : 'disabled'}>Train ${skillName}</button>`;
            return `<div class="card">
              <div class="c-top"><div class="c-ic">${t.icon}</div><div>
                <div class="c-nm">${t.name}</div><div class="c-sub">${U.money(t.cost)} · ×${t.bonus.toFixed(2)} gains · lvl ${t.minLvl}+</div></div></div>
              <p class="c-desc">${t.line}<br><span class="dimmer">Trains: ${skillName}</span></p>
              ${S.level < t.minLvl ? `<div class="pill red">Requires level ${t.minLvl}</div>` : ''}
              <div class="btn-row" style="margin-top:8px">${btns}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
};

/* ========== CRIME ========== */
P.crime = function () {
  const S = E.state();
  const locked = E.inHospital() || E.inJail();
  return `
  <div class="page">
    ${locked ? `<div class="lockmsg">🚫 Crime does not happen from ${E.inJail() ? 'a cell' : 'a hospital bed'}.</div>` : ''}
    <div class="panel">
      <div class="p-head">🎭 Crimes <span class="sub">Law suspicion ${U.fmt(S.law)}/${DATA.MAX_LAW} — the higher it is, the harder every job gets</span></div>
      <div class="p-body">
        <div class="infomsg small">Success scales with <b>Dexterity</b> and <b>level</b>, and falls as your <b>law suspicion</b> rises. Failure means a beating, a cell, or nothing at all. Nerve refills slowly — spend it wisely.</div>
        <div class="grid g2" style="margin-top:11px">
          ${DATA.CRIMES.map(c => {
            const unlocked = S.level >= c.minLvl;
            const ch = E.crimeChance(c);
            const can = unlocked && !locked && S.nerve >= c.nerve && S.energy >= c.energy;
            const exp = Math.round((c.cash[0] + c.cash[1]) / 2 * (ch / 100));
            return `<div class="card" style="${unlocked ? '' : 'opacity:.55'}">
              <div class="c-top"><div class="c-ic">${c.icon}</div><div>
                <div class="c-nm">${c.name}</div>
                <div class="c-sub">${unlocked ? `level ${c.minLvl}+` : `🔒 level ${c.minLvl}`}</div></div>
                <div style="margin-left:auto;text-align:right"><div class="bignum ${ch >= 70 ? 'green' : ch >= 40 ? 'gold' : 'red'}" style="font-size:19px">${ch}%</div><div class="tiny dimmer">success</div></div>
              </div>
              <p class="c-desc">${c.desc}</p>
              <div class="c-meta">
                <span class="pill blue">🧠 ${c.nerve} nerve</span>
                <span class="pill green">⚡ ${c.energy} energy</span>
                <span class="pill gold">${U.money(c.cash[0])}–${U.money(c.cash[1])}</span>
                <span class="pill purple">${c.xp[0]}–${c.xp[1]} XP</span>
                <span class="pill dim">avg ${U.money(exp)}</span>
              </div>
              <div class="tiny dimmer" style="margin-bottom:8px">Worst case: 🔒 ${U.dur(c.jail[0])}–${U.dur(c.jail[1])} jail · 🏥 ${U.dur(c.hosp[0])}–${U.dur(c.hosp[1])} hospital</div>
              <button class="btn wide ${can ? 'red' : ''}" data-act="crime" data-id="${c.id}" ${can ? '' : 'disabled'}>${unlocked ? 'Commit the crime' : `Locked until level ${c.minLvl}`}</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="p-head">📊 Record</div>
      <div class="p-body tight grid g4">
        <div class="muted-box"><div class="dimmer tiny">CRIMES PULLED</div><div class="bignum green">${U.fmt(S.stats.crimes)}</div></div>
        <div class="muted-box"><div class="dimmer tiny">FAILURES</div><div class="bignum red">${U.fmt(S.stats.crimeFails)}</div></div>
        <div class="muted-box"><div class="dimmer tiny">TIMES JAILED</div><div class="bignum">${U.fmt(S.stats.jails)}</div></div>
        <div class="muted-box"><div class="dimmer tiny">JAILBREAKS</div><div class="bignum gold">${U.fmt(S.stats.escapes)}</div></div>
      </div>
    </div>
  </div>`;
};

/* ========== STREETS / FIGHT ========== */
P.streets = function () {
  if (E.battle) return P.battle();
  const S = E.state();
  const locked = E.inHospital() || E.inJail();
  const bs = E.battleStats();
  const tiers = ['All'].concat(DATA.TIERS);
  const list = DATA.ENEMIES.filter(e => UI.tier === 'All' || e.tier === UI.tier);
  return `
  <div class="page">
    ${locked ? `<div class="lockmsg">🚫 Nobody fights a patient or a prisoner. Get out first.</div>` : ''}
    <div class="panel">
      <div class="p-head">⚔️ You <span class="sub">${bs.wpn.icon} ${bs.wpn.name} · ${bs.arm ? bs.arm.icon + ' ' + bs.arm.name : 'no armor'} · dmg ≈ ${U.fmt(bs.dmg)} · def ${U.fmt(bs.def)} · swing ${bs.swing.toFixed(2)}s</span></div>
      <div class="p-body tight">
        <div class="grid g4">
          <div class="muted-box"><div class="dimmer tiny">HP</div><div class="bignum">${U.fmt(S.hp)}<span class="dim small">/${U.fmt(E.maxHP())}</span></div></div>
          <div class="muted-box"><div class="dimmer tiny">ENERGY</div><div class="bignum green">${U.fmt(S.energy)}<span class="dim small">/${U.fmt(E.maxEnergy())}</span></div></div>
          <div class="muted-box"><div class="dimmer tiny">ACCURACY</div><div class="bignum">${bs.acc}%</div></div>
          <div class="muted-box"><div class="dimmer tiny">CRIT</div><div class="bignum gold">${bs.crit.toFixed(1)}%</div></div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="p-head">🌃 The streets of Blackstone <span class="sub">A fight costs 3 energy · mugging costs 3 energy + 4 nerve</span></div>
      <div class="p-body">
        <div class="tabs">${tiers.map(t => `<button class="tab ${UI.tier === t ? 'on' : ''}" data-tier="${t}">${t}</button>`).join('')}</div>
        <div class="grid g2">
          ${list.map(e => {
            const kills = S.kills[e.id] || 0;
            const fc = E.forecast(e);
            const danger = fc.win >= 75 ? 'green' : fc.win >= 50 ? 'gold' : fc.win >= 28 ? 'red' : 'red';
            const verdict = fc.win >= 85 ? 'easy prey' : fc.win >= 62 ? 'favourable' : fc.win >= 42 ? 'even odds' : fc.win >= 22 ? 'dangerous' : 'suicidal';
            const canFight = !locked && S.energy >= 3 && !E.battle;
            const canMug = !locked && S.energy >= 3 && S.nerve >= 4 && S.level + 6 >= e.lvl;
            return `<div class="card">
              <div class="c-top"><div class="c-ic">${e.icon}</div><div>
                <div class="c-nm">${e.name}</div>
                <div class="c-sub">Level ${e.lvl} · ${e.tier}</div></div>
                <div style="margin-left:auto"><span class="pill ${danger}">${verdict}</span></div>
              </div>
              <p class="c-desc">${e.note}</p>
              <div class="c-meta">
                <span class="pill red">❤️ ${U.fmt(e.hp)}</span>
                <span class="pill">💥 ${e.dmg[0]}–${e.dmg[1]}</span>
                <span class="pill blue">🛡️ ${e.def}</span>
                <span class="pill">⚡ spd ${e.spd}</span>
                <span class="pill gold">💰 ${U.money(e.cash[0])}–${U.money(e.cash[1])}</span>
                <span class="pill purple">${e.xp[0]}–${e.xp[1]} XP</span>
                ${kills ? `<span class="pill green">☠️ ×${kills}</span>` : ''}
              </div>
              <div class="muted-box tiny" style="padding:7px 9px;margin-bottom:8px">
                <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                  <span class="dim">Your damage</span><span class="mono green">${U.fmt(fc.pHits)}/s · kill in ${fc.tKill.toFixed(1)}s</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap">
                  <span class="dim">Their damage</span><span class="mono red">${U.fmt(fc.eHit)}/hit · you die in ${fc.tDie.toFixed(1)}s</span>
                </div>
                <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-top:4px">
                  <span class="dim">Forecast</span><span class="pill ${danger}">${fc.win}% win · ${verdict}</span>
                </div>
              </div>
              <div class="btn-row">
                <button class="btn sm ${canFight ? (fc.win >= 50 ? 'red' : 'ghost') : ''}" data-act="fight" data-id="${e.id}" ${canFight ? '' : 'disabled'}>⚔️ Attack</button>
                <button class="btn sm ${canMug ? 'blue' : ''}" data-act="mug" data-id="${e.id}" ${canMug ? '' : 'disabled'}>👛 Mug (${E.mugChance(e)}%)</button>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
};

/* ========== BATTLE ========== */
P.battle = function () {
  const B = E.battle, S = E.state(), e = B.enemy;
  const st = E.battleStats();
  const usable = Object.keys(S.inv).filter(id => {
    const it = DATA.ITEMS[id];
    return it && (it.heal || it.energy || it.happy);
  });
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">⚔️ <span id="b-title">${U.esc(e.name)}</span> <span class="sub" id="b-timer">0:00</span></div>
      <div class="p-body">
        <div class="battle">
          <div class="combatant you" id="c-you">
            <div class="nm">${S.avatar} ${U.esc(S.name)} <span class="st" style="margin-left:auto">LVL ${S.level}</span></div>
            <div class="st">${st.wpn.icon} ${st.wpn.name}${st.arm ? ' · ' + st.arm.icon + ' ' + st.arm.name : ''}</div>
            <div class="meter"><div class="lbl"><span>❤️ HP</span><b id="b-php">${U.fmt(B.php)} / ${U.fmt(B.phpMax)}</b></div>
              <div class="track"><div class="fill hp" id="b-phpf" style="width:${U.pct(B.php, B.phpMax)}%"></div></div></div>
            <div class="meter"><div class="lbl"><span>⚡ ATTACK</span><b id="b-pmt">${Math.round(U.pct(B.pMeter, B.pNeed))}%</b></div>
              <div class="track"><div class="fill atk" id="b-pmf" style="width:${U.pct(B.pMeter, B.pNeed)}%"></div></div></div>
            <div class="statusline" id="b-pstatus">${S.burn > 0 ? '<span class="pill red">🔥 burning</span>' : ''}<span class="pill">dmg ≈ ${U.fmt(st.dmg)}</span><span class="pill">def ${U.fmt(st.def)}</span></div>
          </div>
          <div class="combatant foe" id="c-foe">
            <div class="nm">${e.icon} ${U.esc(e.name)} <span class="st" style="margin-left:auto">LVL ${e.lvl}</span></div>
            <div class="st">${e.tier} · dmg ${e.dmg[0]}–${e.dmg[1]} · def ${e.def}</div>
            <div class="meter"><div class="lbl"><span>❤️ HP</span><b id="b-ehp">${U.fmt(B.ehp)} / ${U.fmt(B.ehpMax)}</b></div>
              <div class="track"><div class="fill foeatk" id="b-ehpf" style="width:${U.pct(B.ehp, B.ehpMax)}%"></div></div></div>
            <div class="meter"><div class="lbl"><span>⚡ ATTACK</span><b id="b-emt">${Math.round(U.pct(B.eMeter, B.eNeed))}%</b></div>
              <div class="track"><div class="fill foeatk" id="b-emf" style="width:${U.pct(B.eMeter, B.eNeed)}%"></div></div></div>
            <div class="statusline"><span class="pill">${e.note}</span></div>
          </div>
        </div>

        <div class="btn-row" style="margin:11px 0" id="b-actions">
          <button class="btn red" data-act="attacknow">⚔️ Strike now <kbd>1</kbd></button>
          <button class="btn blue" data-act="useitem-battle" data-id="${usable[0] || ''}" ${usable.length ? '' : 'disabled'}>💊 Quick item <kbd>2</kbd></button>
          <button class="btn ghost" data-act="battleinv">🎒 Use item…</button>
          <button class="btn gold" data-act="flee">🏃 Flee (1 ⚡) <kbd>3</kbd></button>
        </div>
        <div id="blog">${B.log.map(l => `<div class="${l.cls}">${l.text}</div>`).join('')}</div>
      </div>
    </div>
    ${B.over ? `<div class="panel"><div class="p-body">
      <div class="${B.win ? 'okmsg' : B.fled ? 'infomsg' : 'lockmsg'}">
        <b>${B.win ? '🏆 Victory' : B.fled ? '🏃 You fled' : '💀 Defeat'}</b> — ${B.win ? `${e.name} is down. Take the cash and go.` : B.fled ? 'Live to fight another night.' : 'Blackstone chews people up.'}
      </div>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn gold" data-act="leavebattle">Leave the fight</button>
        ${B.win ? `<button class="btn red" data-act="fight" data-id="${e.id}">Fight ${e.name} again</button>` : ''}
        <button class="btn ghost" data-nav="medical">Medical centre</button>
      </div>
    </div></div>` : ''}
  </div>`;
};

function updateBattleDOM() {
  const B = E.battle;
  if (!B || UI.page !== 'streets') return;
  const set = (id, text) => setText(document.getElementById(id), text);
  const wid = (id, p) => { const n = document.getElementById(id); if (n && n.style.width !== p + '%') n.style.width = p + '%'; };
  set('b-php', `${U.fmt(B.php)} / ${U.fmt(B.phpMax)}`); wid('b-phpf', U.pct(B.php, B.phpMax));
  set('b-ehp', `${U.fmt(B.ehp)} / ${U.fmt(B.ehpMax)}`); wid('b-ehpf', U.pct(B.ehp, B.ehpMax));
  set('b-pmt', Math.round(U.pct(B.pMeter, B.pNeed)) + '%'); wid('b-pmf', U.pct(B.pMeter, B.pNeed));
  set('b-emt', Math.round(U.pct(B.eMeter, B.eNeed)) + '%'); wid('b-emf', U.pct(B.eMeter, B.eNeed));
  set('b-timer', U.durShort(B.t));
  const ps = document.getElementById('b-pstatus');
  if (ps) patchHTML(ps, (E.state().burn > 0 ? '<span class="pill red">🔥 burning</span>' : '') +
    `<span class="pill">dmg ≈ ${U.fmt(E.battleStats().dmg)}</span><span class="pill">def ${U.fmt(E.battleStats().def)}</span>`);
  const blog = document.getElementById('blog');
  if (blog) {
    const want = B.log.slice(-60).map(l => `<div class="${l.cls}">${l.text}</div>`).join('');
    if (blog.dataset.sig !== String(B.log.length)) {
      blog.dataset.sig = String(B.log.length);
      patchHTML(blog, want);
      blog.scrollTop = blog.scrollHeight;
    }
  }
  if (B.over) {
    const acts = document.getElementById('b-actions');
    if (acts) acts.innerHTML = '';
  }
}

/* ========== ITEMS MARKET ========== */
P.items = function () {
  const S = E.state();
  const cat = DATA.CATS.find(c => c.id === UI.marketCat) || DATA.CATS[0];
  const list = Object.values(DATA.ITEMS).filter(i => i.cat === cat.id && i.price > 0);
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">🛒 Black Market <span class="sub">Cash on hand: <b class="gold">${U.money(S.money)}</b></span></div>
      <div class="p-body">
        <div class="tabs">${DATA.CATS.map(c => `<button class="tab ${UI.marketCat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.icon} ${c.name}</button>`).join('')}
          <button class="tab" data-act="upgrade" style="margin-left:auto;border-color:rgba(240,180,41,.45);color:var(--gold)">⬆️ Buy my best upgrade</button></div>
        <div class="rowwrap"><table class="t">
          <thead><tr><th>Item</th><th>Stats</th><th class="num">Price</th><th class="num">Owned</th><th></th></tr></thead>
          <tbody>
          ${list.map(i => {
            const afford = S.money >= i.price;
            const lvlOk = !(i.req && S.level < i.req);
            const stats = [];
            if (i.str) stats.push(`💥 ${i.str} dmg`);
            if (i.spd) stats.push(`⚡ ×${i.spd.toFixed(2)} speed`);
            if (i.def) stats.push(`🛡️ ${i.def} def`);
            if (i.heal) stats.push(`❤️ +${i.heal} HP`);
            if (i.energy) stats.push(`⚡ ${i.energy > 0 ? '+' : ''}${i.energy}`);
            if (i.nerve) stats.push(`🧠 ${i.nerve > 0 ? '+' : ''}${i.nerve}`);
            if (i.happy) stats.push(`😊 ${i.happy > 0 ? '+' : ''}${i.happy}`);
            const equipped = S.equip.primary === i.id || S.equip.armor === i.id;
            return `<tr>
              <td><div style="display:flex;gap:9px;align-items:center"><span style="font-size:19px">${i.icon}</span>
                <div><b>${i.name}</b>${equipped ? ' <span class="pill green">equipped</span>' : ''}<div class="tiny dimmer">${i.desc}</div></div></div></td>
              <td class="tiny">${stats.map(s => `<span class="pill">${s}</span>`).join(' ')}</td>
              <td class="num ${afford ? 'gold' : 'red'}">${U.money(i.price)}${i.req ? `<div class="tiny ${lvlOk ? 'dimmer' : 'red'}">lvl ${i.req}${lvlOk ? '' : ' 🔒'}</div>` : ''}</td>
              <td class="num">${U.fmt(S.inv[i.id] || 0)}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn tiny ${afford && lvlOk ? 'gold' : ''}" data-act="buy" data-id="${i.id}" data-qty="1" ${afford && lvlOk ? '' : 'disabled'}>${lvlOk ? 'Buy 1' : 'Locked'}</button>
                <button class="btn tiny ghost" data-act="buy" data-id="${i.id}" data-qty="5" ${S.money >= i.price * 5 && lvlOk ? '' : 'disabled'}>×5</button>
              </td></tr>`;
          }).join('')}
          </tbody>
        </table></div>
        <p class="tiny dimmer" style="margin-top:10px">Sell anything back at 50% from your <a href="#" data-nav="inv" class="gold">inventory</a>. Prices are fixed here; player-to-player trading is planned for a later server-authoritative update.</p>
      </div>
    </div>
  </div>`;
};

/* ========== INVENTORY ========== */
P.inv = function () {
  const S = E.state();
  const ids = Object.keys(S.inv).filter(id => S.inv[id] > 0);
  const groups = {};
  ids.forEach(id => { const c = DATA.ITEMS[id] ? DATA.ITEMS[id].cat : 'loot'; (groups[c] = groups[c] || []).push(id); });
  const order = ['weapon', 'armor', 'medical', 'booster', 'loot'];
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">🎒 Inventory <span class="sub">${ids.reduce((a, b) => a + S.inv[b], 0)} items · net worth ${U.money(S.money + S.bank + ids.reduce((a, id) => a + E.sellValue(id) * S.inv[id], 0))}</span></div>
      <div class="p-body">
        <div class="grid g2">
          <div class="muted-box">
            <h4>Equipped</h4>
            <div class="kv"><span>Weapon</span><span>${E.weapon().icon} ${E.weapon().name} <span class="dimmer">(💥 ${E.weapon().str})</span></span></div>
            <div class="kv"><span>Armor</span><span>${E.armor() ? E.armor().icon + ' ' + E.armor().name + ` <span class="dimmer">(🛡️ ${E.armor().def})</span>` : '— none —'}</span></div>
            <div class="btn-row" style="margin-top:8px">
              <button class="btn tiny gold" data-act="upgrade">⬆️ Buy my best upgrade</button>
              ${E.armor() ? `<button class="btn tiny ghost" data-act="unequip" data-slot="armor">Unequip armor</button>` : ''}
            </div>
          </div>
          <div class="muted-box">
            <h4>Notes</h4>
            <p class="small dim">Equipping swaps the old item back into your bag. Medical items can be used mid-fight. Boosters affect happiness, energy and nerve — happiness multiplies your damage and your gym gains.</p>
          </div>
        </div>
        ${ids.length === 0 ? '<div class="infomsg" style="margin-top:11px">Your pockets are empty. Visit the <b>market</b>.</div>' : ''}
        ${order.filter(c => groups[c]).map(c => `
          <div class="panel" style="margin-top:11px;background:#0b1119">
            <div class="p-head" style="font-size:11px">${(DATA.CATS.find(x => x.id === c) || { icon: '📦', name: c }).icon} ${(DATA.CATS.find(x => x.id === c) || { name: c }).name}</div>
            <div class="p-body tight"><div class="rowwrap"><table class="t">
              <thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Value</th><th></th></tr></thead>
              <tbody>${groups[c].map(id => {
                const i = DATA.ITEMS[id];
                const isEq = S.equip.primary === id || S.equip.armor === id;
                return `<tr><td><b>${i.icon} ${i.name}</b> <span class="tiny dimmer">${i.desc}</span></td>
                  <td class="num">${S.inv[id]}</td>
                  <td class="num dim">${U.money(E.sellValue(id))}</td>
                  <td style="text-align:right;white-space:nowrap">
                    ${i.slot ? `<button class="btn tiny ${isEq ? 'ghost' : 'gold'}" data-act="equip" data-id="${id}" ${isEq || (i.req && S.level < i.req) ? 'disabled' : ''}>${isEq ? 'Equipped' : (i.req && S.level < i.req) ? `Equip (lvl ${i.req})` : 'Equip'}</button>` : ''}
                    ${(i.heal || i.energy || i.nerve || i.happy) ? `<button class="btn tiny green" data-act="use" data-id="${id}">Use</button>` : ''}
                    <button class="btn tiny ghost" data-act="sell" data-id="${id}" ${isEq ? 'disabled' : ''}>Sell</button>
                  </td></tr>`;
              }).join('')}</tbody></table></div></div>
          </div>`).join('')}
      </div>
    </div>
  </div>`;
};

/* ========== JOB ========== */
P.job = function () {
  const S = E.state();
  const locked = E.inHospital() || E.inJail();
  const cur = S.job ? DATA.JOBS.find(j => j.id === S.job) : null;
  return `
  <div class="page">
    ${locked ? `<div class="lockmsg">🚫 Your employer has been told you are "unavailable".</div>` : ''}
    ${cur ? `<div class="panel">
      <div class="p-head">💼 ${cur.icon} ${cur.company} <span class="sub">${DATA.WORK_PER_DAY - S.worksToday} of ${DATA.WORK_PER_DAY} shifts left today</span></div>
      <div class="p-body">
        <div class="grid g2">
          <div class="muted-box">
            <h4>Current position</h4>
            <div class="kv"><span>Title</span><span>${E.jobRank(S.job).title}</span></div>
            <div class="kv"><span>Boss</span><span>${cur.boss}</span></div>
            <div class="kv"><span>Pay per shift</span><span class="gold">${U.money(E.jobRank(S.job).pay[0])}–${U.money(E.jobRank(S.job).pay[1])}</span></div>
            <div class="kv"><span>XP per shift</span><span>${E.jobRank(S.job).xp}</span></div>
            <div class="kv"><span>Next promotion</span><span>${(() => { const n = cur.levels[E.jobLevel(S.job) + 1]; return n ? `Level ${n.req} → ${n.title}` : 'Top of the ladder'; })()}</span></div>
          </div>
          <div class="muted-box">
            <h4>Work a shift</h4>
            <p class="small dim">Costs 5 energy and a little happiness. Eight shifts a day, then ${cur.boss} sends you home.</p>
            <div class="btn-row" style="margin-top:8px">
              <button class="btn gold" data-act="work" ${(!locked && S.energy >= 5) ? '' : 'disabled'}>💼 Work a shift</button>
              <button class="btn ghost" data-act="quit">Quit this job</button>
            </div>
          </div>
        </div>
      </div>
    </div>` : `<div class="infomsg">💼 You are unemployed. Take a job below — honest money, honest XP, and a promotion every time you level.</div>`}

    <div class="panel">
      <div class="p-head">🏢 Employers around Blackstone</div>
      <div class="p-body tight">
        <div class="grid g2">
          ${DATA.JOBS.map(j => {
            const lvl = E.jobLevel(j.id);
            const rank = j.levels[lvl];
            const isCur = S.job === j.id;
            return `<div class="card">
              <div class="c-top"><div class="c-ic">${j.icon}</div><div>
                <div class="c-nm">${j.company}</div><div class="c-sub">Boss: ${j.boss}</div></div>
                ${isCur ? '<span class="pill green" style="margin-left:auto">current job</span>' : ''}</div>
              <div class="rowwrap"><table class="t" style="margin-bottom:8px">
                <thead><tr><th>Rank</th><th class="num">Pay</th><th class="num">XP</th><th class="num">Lvl</th></tr></thead>
                <tbody>${j.levels.map((L, i) => `<tr style="${i === lvl ? 'background:#132030' : ''}">
                  <td>${i === lvl ? '▸ ' : ''}${L.title}</td><td class="num gold">${U.money(L.pay[0])}–${U.money(L.pay[1])}</td>
                  <td class="num">${L.xp}</td><td class="num dimmer">${L.req || 1}</td></tr>`).join('')}</tbody>
              </table></div>
              <button class="btn sm wide ${isCur ? 'ghost' : 'blue'}" data-act="takejob" data-id="${j.id}" ${isCur ? 'disabled' : ''}>${isCur ? 'You work here' : 'Take this job'}</button>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </div>`;
};

/* ========== BANK ========== */
P.bank = function () {
  const S = E.state();
  const cap = DATA.BANK.loanCap(S.level);
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">🏦 Blackstone Trust <span class="sub">Interest settles once a day</span></div>
      <div class="p-body">
        <div class="grid g4">
          <div class="muted-box"><div class="dimmer tiny">CASH ON HAND</div><div class="bignum gold">${U.money(S.money)}</div></div>
          <div class="muted-box"><div class="dimmer tiny">SAVINGS</div><div class="bignum green">${U.money(S.bank)}</div></div>
          <div class="muted-box"><div class="dimmer tiny">DEBT</div><div class="bignum ${S.loan ? 'red' : ''}">${U.money(S.loan)}</div></div>
          <div class="muted-box"><div class="dimmer tiny">NET WORTH</div><div class="bignum">${U.money(S.money + S.bank - S.loan)}</div></div>
        </div>
        <div class="grid g2" style="margin-top:11px">
          <div class="muted-box">
            <h4>Savings — ${(DATA.BANK.dailyRate * 100).toFixed(1)}% / day</h4>
            <p class="small dim">Safe from muggers and from losing a fight. Interest is paid into the balance daily.</p>
            <label class="fl" style="margin-top:8px">Amount</label>
            <input type="number" id="bank-amt" min="1" placeholder="${U.fmt(Math.max(1, Math.floor(S.money / 2)))}">
            <div class="btn-row" style="margin-top:8px">
              <button class="btn green" data-act="deposit">Deposit</button>
              <button class="btn blue" data-act="withdraw">Withdraw</button>
              <button class="btn ghost tiny" data-act="bank-half">Half</button>
              <button class="btn ghost tiny" data-act="bank-all">All</button>
            </div>
          </div>
          <div class="muted-box">
            <h4>Loans — ${(DATA.BANK.loanRate * 100).toFixed(0)}% / day</h4>
            <p class="small dim">Credit limit ${U.money(cap)} at level ${S.level}. Interest compounds daily and is never forgiven.</p>
            <label class="fl" style="margin-top:8px">Amount</label>
            <input type="number" id="loan-amt" min="1" placeholder="${U.fmt(Math.min(cap - S.loan, 5000))}">
            <div class="btn-row" style="margin-top:8px">
              <button class="btn red" data-act="borrow" ${S.loan >= cap ? 'disabled' : ''}>Borrow</button>
              <button class="btn gold" data-act="repay" ${S.loan <= 0 ? 'disabled' : ''}>Repay</button>
              <button class="btn ghost tiny" data-act="loan-max">Max</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>`;
};

/* ========== MEDICAL ========== */
P.medical = function () {
  const S = E.state();
  const now = Date.now();
  const meds = Object.keys(S.inv).filter(id => DATA.ITEMS[id] && DATA.ITEMS[id].heal);
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">⚕️ St. Verna Medical Centre</div>
      <div class="p-body">
        <div class="grid g2">
          <div class="muted-box">
            <h4>🏥 Hospital</h4>
            ${E.inHospital()
              ? `<p class="small"><b class="red">You are admitted.</b> ${U.dur((S.hospitalUntil - now) / 1000)} of treatment left. HP regenerates slowly while you lie here.</p>
                 <div class="track progress-lg"><div class="fill hp" style="width:${U.pct(S.hp, E.maxHP())}%"></div></div>
                 <div class="tiny dim" style="margin:5px 0 9px">${U.fmt(S.hp)} / ${U.fmt(E.maxHP())} HP</div>
                 <button class="btn blue wide" data-act="doctor" ${S.money >= E.docCost() ? '' : 'disabled'}>💵 Pay the doctor ${U.money(E.docCost())} — discharge now</button>
                 <button class="btn ghost wide" style="margin-top:7px" data-act="scrounge">🪙 Scrounge from visitors (every 15 min)</button>`
              : `<div class="okmsg">You are not hospitalized. HP regenerates at ${DATA.REGEN.hp}/minute naturally.</div>
                 <div class="track progress-lg" style="margin-top:9px"><div class="fill hp" style="width:${U.pct(S.hp, E.maxHP())}%"></div></div>
                 <div class="tiny dim" style="margin-top:5px">${U.fmt(S.hp)} / ${U.fmt(E.maxHP())} HP</div>`}
          </div>
          <div class="muted-box">
            <h4>🔒 Custody</h4>
            ${E.inJail()
              ? `<p class="small"><b class="red">You are in a cell.</b> ${U.dur((S.jailUntil - now) / 1000)} left.</p>
                 <div class="btn-row">
                   <button class="btn red" data-act="escape">🗝️ Break out (${U.clamp(Math.round(16 + S.skills.dex * 0.8 + S.level * 0.3), 6, 78)}%)</button>
                   <button class="btn blue" data-act="bail" ${S.money >= E.bailCost() ? '' : 'disabled'}>💵 Bail ${U.money(E.bailCost())}</button>
                 </div>
                 <button class="btn ghost wide" style="margin-top:7px" data-act="scrounge">🪙 Scrounge from the guard room (every 15 min)</button>
                 <p class="tiny dimmer" style="margin-top:8px">Breaking out costs 10 energy + 5 nerve, raises your law suspicion and pays good XP. Failing extends the sentence and you get beaten.</p>`
              : `<div class="okmsg">You are not in custody. Law suspicion: <b>${U.fmt(S.law)}/${DATA.MAX_LAW}</b> — it decays slowly and makes every crime harder.</div>`}
          </div>
        </div>
        <div class="hr"></div>
        <h4>Field medicine</h4>
        ${meds.length ? `<div class="grid g3">${meds.map(id => {
          const i = DATA.ITEMS[id];
          return `<div class="card"><div class="c-top"><div class="c-ic">${i.icon}</div><div><div class="c-nm">${i.name}</div><div class="c-sub">×${S.inv[id]} · heals ${i.heal} HP</div></div></div>
            <button class="btn sm green wide" data-act="use" data-id="${id}">Use now</button></div>`;
        }).join('')}</div>` : `<p class="dim small">No medical supplies. Buy some at the <a href="#" data-nav="items" class="gold">market</a> — a fight can end badly.</p>`}
      </div>
    </div>
  </div>`;
};

/* ========== PROFILE ========== */
P.profile = function () {
  const S = E.state(), bs = E.battleStats();
  const unlocked = DATA.ACHIEVEMENTS.filter(a => S.ach[a.id]).length;
  return `
  <div class="page">
    <div class="panel">
      <div class="p-head">👤 Character sheet</div>
      <div class="p-body">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <div class="avatar">${S.avatar}</div>
          <div style="flex:1;min-width:200px">
            <h3 style="font-size:19px">${U.esc(S.name)}</h3>
            <p class="dim small">Level ${S.level} · Day ${E.day()} · joined ${new Date(S.created).toLocaleDateString()}</p>
            <div class="btn-row">
              <button class="btn tiny ghost" data-act="rename">✏️ Change name</button>
              <button class="btn tiny ghost" data-act="reavatar">🎭 Change face</button>
              <button class="btn tiny blue" data-act="export">💾 Export save</button>
              <button class="btn tiny blue" data-act="import">📥 Import save</button>
              <button class="btn tiny red" data-act="hardreset">🗑️ Start over</button>
            </div>
          </div>
          <div style="text-align:right">
            <div class="dimmer tiny">EXPERIENCE</div>
            <div class="bignum gold">${U.fmt(S.xp)}<span class="dim small">/${U.fmt(E.xpNeed())}</span></div>
            <div class="track" style="width:170px;margin-top:5px"><div class="fill xp" style="width:${U.pct(S.xp, E.xpNeed())}%"></div></div>
          </div>
        </div>
        <div class="hr"></div>
        <div class="grid g2">
          <div class="muted-box">
            <h4>Vitals</h4>
            <div class="kv"><span>❤️ Health</span><span>${U.fmt(S.hp)} / ${U.fmt(E.maxHP())}</span></div>
            <div class="kv"><span>⚡ Energy</span><span>${U.fmt(S.energy)} / ${U.fmt(E.maxEnergy())}</span></div>
            <div class="kv"><span>🧠 Nerve</span><span>${U.fmt(S.nerve)} / ${U.fmt(E.maxNerve())}</span></div>
            <div class="kv"><span>😊 Happiness</span><span>${U.fmt(S.happy)} / ${U.fmt(U.maxHappy())}</span></div>
            <div class="kv"><span>🔥 Burning</span><span>${S.burn > 0 ? U.dur(S.burn) : 'no'}</span></div>
          </div>
          <div class="muted-box">
            <h4>Trained stats</h4>
            ${DATA.SKILLS.map(s => `<div class="kv"><span>${s.icon} ${s.name}</span><span>${U.fmt(S.skills[s.key])}</span></div>`).join('')}
            <div class="kv"><span>Total</span><span class="gold">${U.fmt(E.totalSkill())}</span></div>
          </div>
          <div class="muted-box">
            <h4>Combat</h4>
            <div class="kv"><span>Damage per hit</span><span class="gold">≈ ${U.fmt(bs.dmg)}</span></div>
            <div class="kv"><span>Defense</span><span>${U.fmt(bs.def)}</span></div>
            <div class="kv"><span>Attack speed</span><span>${bs.spd.toFixed(1)} (${bs.swing.toFixed(2)}s per swing)</span></div>
            <div class="kv"><span>Accuracy</span><span>${bs.acc}%</span></div>
            <div class="kv"><span>Critical chance</span><span>${bs.crit.toFixed(1)}% (×1.85)</span></div>
            <div class="kv"><span>Best single hit</span><span>${U.fmt(S.stats.bestHit)}</span></div>
          </div>
          <div class="muted-box">
            <h4>Lifetime</h4>
            <div class="kv"><span>Crimes pulled / failed</span><span>${U.fmt(S.stats.crimes)} / ${U.fmt(S.stats.crimeFails)}</span></div>
            <div class="kv"><span>Fights won / lost</span><span>${U.fmt(S.stats.kills)} / ${U.fmt(S.stats.losses)}</span></div>
            <div class="kv"><span>Muggings</span><span>${U.fmt(S.stats.mugs)}</span></div>
            <div class="kv"><span>Shifts worked</span><span>${U.fmt(S.stats.works)}</span></div>
            <div class="kv"><span>Jail / escapes</span><span>${U.fmt(S.stats.jails)} / ${U.fmt(S.stats.escapes)}</span></div>
            <div class="kv"><span>Hospital visits</span><span>${U.fmt(S.stats.hosp)}</span></div>
            <div class="kv"><span>Time played</span><span>${U.dur(S.played)}</span></div>
            <div class="kv"><span>Law suspicion</span><span>${U.fmt(S.law)} / ${DATA.MAX_LAW}</span></div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="p-head">🏅 Achievements <span class="sub">${unlocked} / ${DATA.ACHIEVEMENTS.length} unlocked</span></div>
      <div class="p-body tight">
        <div class="grid g3">
          ${DATA.ACHIEVEMENTS.map(a => {
            const got = !!S.ach[a.id];
            return `<div class="card" style="${got ? 'border-color:rgba(240,180,41,.4)' : 'opacity:.6'}">
              <div class="c-top"><div class="c-ic">${a.icon}</div><div><div class="c-nm">${a.name}</div>
              <div class="c-sub">${a.desc}</div></div></div>
              <div class="pill ${got ? 'gold' : 'dim'}">${got ? '✓ ' + new Date(S.ach[a.id]).toLocaleDateString() : 'locked'} · ${U.money(a.reward)}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="p-head">☠️ Notches <span class="sub">enemies you have put down</span></div>
      <div class="p-body tight">
        <div class="rowwrap"><table class="t"><thead><tr><th>Enemy</th><th class="num">Level</th><th class="num">Kills</th></tr></thead>
        <tbody>${DATA.ENEMIES.map(e => `<tr><td>${e.icon} ${e.name}</td><td class="num dim">${e.lvl}</td>
          <td class="num ${S.kills[e.id] ? 'green' : 'dimmer'}">${S.kills[e.id] || 0}</td></tr>`).join('')}</tbody></table></div>
      </div>
    </div>
  </div>`;
};

/* Shared-world page is rendered by the online client module, which owns its live data. */
P.online = function () {
  return window.Online ? window.Online.renderPage() : '<div class="page"><div class="panel"><div class="p-body">Online services are loading…</div></div></div>';
};

/* ---------------- render ---------------- */
UI.render = function (force) {
  if (!E.state() || !UI.ready) return;
  updateBars();
  renderNav();
  if (UI.page === 'streets' && E.battle) {
    if (force || UI.dirty) { patchHTML(el.main, P.battle()); UI.dirty = false; scrollLog(); }
    else updateBattleDOM();
  } else {
    const fn = P[UI.page] || P.home;
    patchHTML(el.main, fn());
  }
};
function scrollLog() { const b = document.getElementById('blog'); if (b) b.scrollTop = b.scrollHeight; }

UI.go = function (page) {
  UI.page = page;
  E.state().page = page;
  UI.render(true);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

/* ---------------- actions ---------------- */
const ACTS = {
  train: d => E.train(d.id, d.skill),
  crime: d => E.crime(d.id),
  fight: d => { E.startBattle(d.id); UI.go('streets'); },
  mug: d => E.mug(d.id),
  buy: d => E.buy(d.id, d.qty),
  upgrade: () => E.buyUpgrades(),
  sell: d => {
    const n = E.state().inv[d.id] || 0;
    UI.modal('💰 Sell item', `<p>Sell how many <b>${DATA.ITEMS[d.id].name}</b>? You have ${n}. Each returns <b class="gold">${U.money(E.sellValue(d.id))}</b>.</p>
      <div class="btn-row" style="margin-top:10px">${[1, 5, n].filter((v, i, a) => v > 0 && a.indexOf(v) === i).map(v => `<button class="btn sm ghost" data-sellqty="${v}">Sell ${v}</button>`).join('')}</div>`,
      `<button class="btn ghost" data-close="1">Cancel</button>`,
      { onMount: root => root.querySelectorAll('[data-sellqty]').forEach(b => b.onclick = () => { E.sell(d.id, b.dataset.sellqty); UI.closeModal(); }) });
  },
  use: d => E.useItem(d.id),
  equip: d => E.equip(d.id),
  unequip: d => E.unequip(d.slot),
  work: () => E.work(),
  takejob: d => E.takeJob(d.id),
  quit: () => UI.modal('💼 Quit your job?', '<p>You will lose your position. You can be rehired at the same rank any time.</p>',
    `<button class="btn ghost" data-close="1">Keep the job</button><button class="btn red" data-confirmquit="1">Quit</button>`,
    { onMount: r => r.querySelector('[data-confirmquit]').onclick = () => { E.quitJob(); UI.closeModal(); } }),
  deposit: () => E.deposit(($('#bank-amt') || {}).value),
  withdraw: () => E.withdraw(($('#bank-amt') || {}).value),
  borrow: () => E.borrow(($('#loan-amt') || {}).value),
  repay: () => E.repay(($('#loan-amt') || {}).value),
  'bank-half': () => { const i = $('#bank-amt'); if (i) i.value = Math.floor(E.state().money / 2); },
  'bank-all': () => { const i = $('#bank-amt'); if (i) i.value = Math.floor(E.state().money); },
  'loan-max': () => { const i = $('#loan-amt'); if (i) i.value = Math.max(1, DATA.BANK.loanCap(E.state().level) - E.state().loan); },
  doctor: () => E.payDoctor(),
  scrounge: () => E.scrounge(),
  escape: () => E.escape(),
  bail: () => E.bail(),
  attacknow: () => { const B = E.battle; if (B && !B.over) { B.pMeter = B.pNeed; } },
  flee: () => E.flee(),
  leavebattle: () => { E.battle = null; UI.render(true); },
  'useitem-battle': d => { if (d.id) E.battleItem(d.id); },
  battleinv: () => {
    const S = E.state();
    const ids = Object.keys(S.inv).filter(id => DATA.ITEMS[id] && (DATA.ITEMS[id].heal || DATA.ITEMS[id].energy || DATA.ITEMS[id].happy));
    UI.modal('🎒 Use an item mid-fight',
      ids.length ? `<div class="grid g2">${ids.map(id => { const i = DATA.ITEMS[id];
        return `<div class="card"><div class="c-top"><div class="c-ic">${i.icon}</div><div><div class="c-nm">${i.name}</div><div class="c-sub">×${S.inv[id]}</div></div></div>
        <p class="c-desc">${i.desc}</p><button class="btn sm green wide" data-bitem="${id}">Use</button></div>`; }).join('')}</div>`
        : '<p class="dim">Nothing usable in your bag.</p>',
      '<button class="btn ghost" data-close="1">Close</button>',
      { onMount: r => r.querySelectorAll('[data-bitem]').forEach(b => b.onclick = () => { E.battleItem(b.dataset.bitem); UI.closeModal(); UI.dirty = true; }) });
  },
  rename: () => {
    UI.modal('✏️ Change name', `<label class="fl">Street name</label><input type="text" id="newname" maxlength="18" value="${U.esc(E.state().name)}">`,
      '<button class="btn ghost" data-close="1">Cancel</button><button class="btn gold" data-okname="1">Save</button>',
      { onMount: r => { const inp = r.querySelector('#newname'); inp.focus(); inp.select();
        r.querySelector('[data-okname]').onclick = () => { const v = inp.value.trim().slice(0, 18); if (v) E.state().name = v; UI.closeModal(); UI.render(true); E.save(true); if (window.Online) Online.queueSave(); }; } });
  },
  reavatar: () => {
    UI.modal('🎭 Choose a face', `<div class="grid g4">${DATA.AVATARS.map(a => `<button class="btn ghost" style="font-size:24px;padding:12px" data-av="${a}">${a}</button>`).join('')}</div>`,
      '<button class="btn ghost" data-close="1">Cancel</button>',
      { onMount: r => r.querySelectorAll('[data-av]').forEach(b => b.onclick = () => { E.state().avatar = b.dataset.av; UI.closeModal(); UI.render(true); E.save(true); if (window.Online) Online.queueSave(); }) });
  },
  export: () => {
    const code = E.exportSave();
    UI.modal('💾 Save file', `
      <p class="small dim">Copy this code (or download it) to keep your character. Paste it back later with <b>Import</b>.</p>
      <div class="infomsg" style="margin-bottom:10px">Your account is the main save. This export is a portable backup; importing it replaces your current character on this account.</div>
      <textarea id="save-code" rows="6" spellcheck="false" style="font-family:var(--mono);font-size:10.5px;word-break:break-all">${code}</textarea>
      <div class="btn-row" style="margin-top:10px">
        <button class="btn sm blue" data-copy="1">📋 Copy code</button>
        <button class="btn sm ghost" data-dl="1">⬇️ Download file</button>
      </div>`,
      '<button class="btn ghost" data-close="1">Close</button>',
      { width: 'min(620px,100%)', onMount: r => {
        const ta = r.querySelector('#save-code');
        r.querySelector('[data-copy]').onclick = () => { ta.focus(); ta.select();
          try { navigator.clipboard.writeText(ta.value); toast('Copied', 'Save code is on your clipboard.', 'good'); }
          catch (e) { toast('Select and copy', 'Press Ctrl/Cmd + C to copy the highlighted code.', 'info'); } };
        r.querySelector('[data-dl]').onclick = () => E.downloadSave();
      } });
  },
  import: () => {
    UI.modal('📥 Import a save', '<p class="small dim">Paste a Blackstone save code below. This replaces your current character.</p><textarea id="imp-code" rows="6" spellcheck="false" placeholder="paste save code or raw JSON…"></textarea>',
      '<button class="btn ghost" data-close="1">Cancel</button><button class="btn gold" data-doimp="1">Import</button>',
      { width: 'min(620px,100%)', onMount: r => { const ta = r.querySelector('#imp-code'); ta.focus();
        r.querySelector('[data-doimp]').onclick = () => { if (E.importSave(ta.value)) { UI.closeModal(); UI.page = 'home'; UI.render(true); } }; } });
  },
  hardreset: () => {
    UI.modal('🗑️ Start over?', '<p>This permanently deletes your character, money, stats and achievements from your online account on every device. There is no undo.</p>',
      '<button class="btn ghost" data-close="1">Cancel</button><button class="btn red" data-wipe="1">Delete character</button>',
      { onMount: r => r.querySelector('[data-wipe]').onclick = async () => {
        UI.closeModal();
        const ok = window.Online ? await Online.deleteSave() : true;
        if (ok) { E.hardReset(); location.reload(); }
      } });
  }
};

/* ---------------- global click handling ---------------- */
document.addEventListener('click', function (ev) {
  const navEl = ev.target.closest('[data-nav]');
  if (navEl) { ev.preventDefault(); UI.go(navEl.dataset.nav); return; }

  const tierEl = ev.target.closest('[data-tier]');
  if (tierEl) { UI.tier = tierEl.dataset.tier; UI.render(true); return; }

  const catEl = ev.target.closest('[data-cat]');
  if (catEl) { UI.marketCat = catEl.dataset.cat; UI.render(true); return; }

  if (ev.target.closest('[data-close]') || ev.target === el.modal) { UI.closeModal(); return; }

  const actEl = ev.target.closest('[data-act]');
  if (actEl) {
    ev.preventDefault();
    if (actEl.disabled) return;
    const fn = ACTS[actEl.dataset.act];
    if (fn) { fn(actEl.dataset, actEl); if (!['bank-half','bank-all','loan-max','battleinv','sell','rename','reavatar','hardreset','quit','export','import'].includes(actEl.dataset.act)) UI.render(true); }
    return;
  }

  const cardNav = ev.target.closest('.card[data-nav]');
  if (cardNav) { UI.go(cardNav.dataset.nav); return; }
});

document.addEventListener('keydown', function (ev) {
  if (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA') return;
  if (!E.battle || E.battle.over) {
    if (ev.key === '?') UI.help();
    return;
  }
  if (ev.key === '1') { E.battle.pMeter = E.battle.pNeed; }
  if (ev.key === '2') { const ids = Object.keys(E.state().inv).filter(id => DATA.ITEMS[id] && DATA.ITEMS[id].heal); if (ids[0]) E.battleItem(ids[0]); }
  if (ev.key === '3') { E.flee(); }
});

/* ---------------- help ---------------- */
UI.help = function () {
  UI.modal('❔ How Blackstone works', `
  <p class="small">You are a nobody in a rotten city. Build stats, earn money, buy better weapons, and climb from sewer rats to the Kingpin.</p>
  <div class="hr"></div>
  <h4>The four bars</h4>
  <ul class="clean">
    <li><b class="red">❤️ Health</b> — hit 0 in a fight and you wake up in the hospital. Regenerates ~${DATA.REGEN.hp}/min (a full bar in about ${Math.round(DATA.BASE.hp / DATA.REGEN.hp)} minutes).</li>
    <li><b class="green">⚡ Energy</b> — spent on training (5), fighting (3), working (5), crimes (1–5). Regenerates ~${DATA.REGEN.energy}/min — a full bar in about ${Math.round(DATA.BASE.energy / DATA.REGEN.energy)} minutes.</li>
    <li><b class="blue">🧠 Nerve</b> — spent only on crimes and muggings. Regenerates ~${DATA.REGEN.nerve}/min. This is the throttle on your criminal income.</li>
    <li><b class="gold">😊 Happiness</b> — multiplies your damage (×0.5 at zero, ×1.0 at 100, ×1.5 at 200). Working, fighting and drugs lower it; candy and ecstasy raise it. Below ${DATA.GYM.minHappy} the gym refuses you.</li>
  </ul>
  <h4 style="margin-top:12px">The loop</h4>
  <ul class="clean">
    <li><b>Train</b> at the gym: Strength = damage, Defense = damage soaked, Speed = more swings — your attack meter fills in real time, Dexterity = accuracy, crits and crime success.</li>
    <li><b>Work</b> a job for reliable cash + XP (8 shifts a day, promotions as you level).</li>
    <li><b>Commit crimes</b> for big cash but risk jail or the hospital.</li>
    <li><b>Fight</b> on the streets for cash, XP and loot — fights run in real time, your attack meter fills based on Speed.</li>
    <li><b>Buy</b> better weapons and armor at the market (or hit <b>⬆️ Buy my best upgrade</b> to do it in one click) — gear is the single biggest damage jump, but the good stuff is level-gated, so keep levelling.</li>
  </ul>
  <h4 style="margin-top:12px">Fighting tips</h4>
  <ul class="clean">
    <li>Strike now (<kbd>1</kbd>) forces an immediate swing instead of waiting for the meter.</li>
    <li>Keep a <b>First Aid Kit</b> on you and use it mid-fight (<kbd>2</kbd>).</li>
    <li>Fleeing (<kbd>3</kbd>) costs 1 energy and they get one parting hit.</li>
    <li>Losing can hospitalize you for a long time. Pick fights you can win.</li>
  </ul>
  <h4 style="margin-top:12px">Getting locked up</h4>
  <ul class="clean">
    <li><b>Break out</b>: costs 10 energy + 5 nerve, chance scales with Dexterity, failure extends the sentence.</li>
    <li><b>Pay bail</b> or <b>pay the doctor</b> to skip the wait entirely.</li>
    <li><b>Law suspicion</b> rises with crime and lowers your success chance; it decays slowly over time.</li>
  </ul>
  <p class="tiny dimmer" style="margin-top:12px">Progress autosaves to your account every 15 seconds and after actions. This version also has public player profiles, a city board, direct messages, and live chat. Time keeps moving while you are away (regen only — you cannot be attacked offline).</p>`,
    '<button class="btn gold" data-close="1">Got it</button>', { width: 'min(660px,100%)' });
};

/* ---------------- character creation ---------------- */
UI.create = function () {
  const av = DATA.AVATARS[0];
  UI.modal('🌃 Welcome to Blackstone', `
    <p class="small dim">Rain on neon, a harbour full of stolen containers, and you with $2,000 and nothing to lose. Make a name.</p>
    <div class="hr"></div>
    <label class="fl">Street name</label>
    <input type="text" id="cc-name" maxlength="18" placeholder="e.g. V. Karras" value="">
    <label class="fl" style="margin-top:12px">Face</label>
    <div class="grid g4" id="cc-av">${DATA.AVATARS.map((a, i) => `<button class="btn ghost ${i === 0 ? 'gold' : ''}" style="font-size:23px;padding:11px" data-av="${a}">${a}</button>`).join('')}</div>
    <div class="hr"></div>
    <p class="tiny dimmer">You start with 3 bandages, 2 energy colas, a candy, bare fists and $2,000.</p>`,
    '<button class="btn gold" id="cc-go">Enter the city</button>',
    { noClose: true, width: 'min(560px,100%)', onMount: r => {
      let chosen = av;
      const nameInp = r.querySelector('#cc-name');
      r.querySelectorAll('[data-av]').forEach(b => b.onclick = () => {
        r.querySelectorAll('[data-av]').forEach(x => x.classList.remove('gold'));
        b.classList.add('gold'); chosen = b.dataset.av;
      });
      const start = () => {
        const nm = (nameInp.value.trim() || U.pick(['Kane', 'Rook', 'Vesper', 'Marlowe', 'Ash', 'Sable', 'Grisham', 'Nyx'])).slice(0, 18);
        UI.closeModal();
        E.newGame(nm, chosen);
        UI.ready = true;
        E.log('You arrived in Blackstone with $2,000 and no reputation.', 'gold');
        UI.page = 'home';
        UI.render(true);
        if (window.Online && Online.onGameCreated) Online.onGameCreated();
        setTimeout(() => UI.help(), 400);
      };
      r.querySelector('#cc-go').onclick = start;
      nameInp.focus();
      nameInp.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });
    } });
};

window.UI = UI;
