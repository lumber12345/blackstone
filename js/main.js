/* =========================================================
   BLACKSTONE — boot
   ========================================================= */
'use strict';

(function boot() {
  /* ---- engine -> ui wiring ---- */
  E.on('toast', t => toastLocal(t));
  function toastLocal(t) {
    const box = document.getElementById('toasts');
    const d = document.createElement('div');
    d.className = 'toast ' + (t.kind || 'info');
    d.innerHTML = `<b>${t.title}</b><span>${t.msg || ''}</span>`;
    box.appendChild(d);
    setTimeout(() => { d.style.transition = 'all .3s'; d.style.opacity = '0'; d.style.transform = 'translateX(20px)'; }, 3000);
    setTimeout(() => d.remove(), 3400);
    while (box.children.length > 5) box.firstChild.remove();
  }

  E.on('battlestart', () => { UI.page = 'streets'; UI.dirty = true; UI.render(true); });
  E.on('battletick', () => { /* lightweight DOM updates only */ });
  E.on('battledmg', p => {
    const id = p.who === 'you' ? 'c-you' : 'c-foe';
    const node = document.getElementById(id);
    if (!node) return;
    node.classList.remove('hit');
    void node.offsetWidth;
    node.classList.add('hit');
    const pop = document.createElement('div');
    pop.className = 'pop' + (p.crit ? ' crit' : '');
    pop.style.color = p.who === 'you' ? '#ff8f92' : '#8fe9bb';
    pop.textContent = '−' + U.fmt(p.dmg);
    pop.style.left = (30 + Math.random() * 40) + '%';
    node.appendChild(pop);
    setTimeout(() => pop.remove(), 1000);
  });
  E.on('battlemiss', who => {
    const node = document.getElementById(who === 'you' ? 'c-you' : 'c-foe');
    if (!node) return;
    const pop = document.createElement('div');
    pop.className = 'pop';
    pop.style.color = '#8697ab';
    pop.style.fontSize = '16px';
    pop.textContent = 'miss';
    node.appendChild(pop);
    setTimeout(() => pop.remove(), 1000);
  });
  E.on('battleend', () => { UI.dirty = true; UI.render(true); });
  E.on('changed', () => {
    if (UI.page === 'streets' && E.battle) UI.dirty = true;
  });
  E.on('tick', () => {
    if (E.battle) updateBattleBars();
  });

  function updateBattleBars() {
    const B = E.battle; if (!B) return;
    const S = E.state();
    const php = document.getElementById('b-php');
    if (php) {
      php.textContent = `${U.fmt(S.hp)} / ${U.fmt(E.maxHP())}`;
      const f = document.getElementById('b-phpf');
      if (f) f.style.width = U.pct(S.hp, E.maxHP()) + '%';
    }
  }

  /* ---- header buttons ---- */
  document.getElementById('btn-save').addEventListener('click', () => E.save());
  if (!E.storageOK()) {
    const tag = document.getElementById('tagline');
    if (tag) tag.textContent = 'session only — export your save to keep it';
  }
  document.getElementById('btn-help').addEventListener('click', () => UI.help());
  window.addEventListener('beforeunload', () => { if (E.state()) E.save(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && E.state()) E.save(true); });

  /* ---- boot screen ---- */
  const main = document.getElementById('main');
  if (E.hasSave() && E.load()) {
    const S = E.state();
    const away = E.applyOffline();
    UI.page = S.page && typeof S.page === 'string' ? S.page : 'home';
    if (UI.page === 'streets' && !E.battle) UI.page = 'home';
    main.innerHTML = `<div class="panel"><div class="p-body" style="text-align:center;padding:44px 20px">
      <div style="font-size:52px">${S.avatar}</div>
      <h3 style="font-size:24px;margin-top:8px">${U.esc(S.name)}</h3>
      <p class="dim">Level ${S.level} · ${U.money(S.money)} on hand · Day ${E.day()}</p>
      <p class="tiny dimmer">${away > 120 ? `You were away for ${U.dur(away)}. ` : ''}Time kept moving while you were gone.</p>
      <button class="btn gold" id="boot-go" style="margin-top:16px;padding:13px 26px;font-size:15px">Enter Blackstone</button>
      <div style="margin-top:14px"><button class="btn tiny ghost" id="boot-wipe">Wipe save &amp; start a new character</button></div>
    </div></div>`;
    document.getElementById('boot-go').addEventListener('click', () => { UI.ready = true; UI.render(true); setTimeout(() => toastLocal({ title: 'Welcome back', msg: `${U.esc(S.name)} — the city missed you.`, kind: 'gold' }), 200); });
    document.getElementById('boot-wipe').addEventListener('click', () => { E.hardReset(); location.reload(); });
  } else {
    main.innerHTML = `<div class="panel"><div class="p-body" style="text-align:center;padding:44px 20px">
      <div style="font:800 34px/1 var(--mono);letter-spacing:6px;color:#fff">BLACKSTONE</div>
      <p class="dim" style="margin-top:10px">A text-based city RPG. Train. Steal. Fight. Get rich or get buried.</p>
    </div></div>`;
    UI.create();
  }

  /* ---- main loop ---- */
  setInterval(() => {
    if (!E.state()) return;
    E.tick();
    if (E.battle) E.battleTick();
    UI.render(false);
  }, 1000);

  /* fast visual loop for battle meters (no re-render) */
  setInterval(() => {
    if (!E.state() || !E.battle) return;
    const B = E.battle;
    const set = (id, v) => { const n = document.getElementById(id); v = String(v); if (n && n.textContent !== v) n.textContent = v; };
    const wid = (id, p) => { const n = document.getElementById(id); if (n && n.style.width !== p + '%') n.style.width = p + '%'; };
    set('b-pmt', Math.round(U.pct(B.pMeter, B.pNeed)) + '%'); wid('b-pmf', U.pct(B.pMeter, B.pNeed));
    set('b-emt', Math.round(U.pct(B.eMeter, B.eNeed)) + '%'); wid('b-emf', U.pct(B.eMeter, B.eNeed));
    set('b-timer', U.durShort(B.t));
  }, 90);

  /* ---- autosave ---- */
  setInterval(() => { if (E.state()) E.save(true); }, 15000);
})();
