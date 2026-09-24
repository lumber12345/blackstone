/* =========================================================
   BLACKSTONE — online boot
   ========================================================= */
'use strict';

(function boot() {
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
  E.on('battletick', () => { /* battle DOM is patched by the fast loop */ });
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
    pop.className = 'pop'; pop.style.color = '#8697ab'; pop.style.fontSize = '16px'; pop.textContent = 'miss';
    node.appendChild(pop); setTimeout(() => pop.remove(), 1000);
  });
  E.on('battleend', () => { UI.dirty = true; UI.render(true); Online.queueSave(100); });
  E.on('changed', () => { if (UI.page === 'streets' && E.battle) UI.dirty = true; });
  E.on('tick', () => { if (E.battle) updateBattleBars(); });

  function updateBattleBars() {
    const B = E.battle; if (!B) return;
    const S = E.state();
    const php = document.getElementById('b-php');
    if (php) {
      const value = `${U.fmt(S.hp)} / ${U.fmt(E.maxHP())}`;
      if (php.textContent !== value) php.textContent = value;
      const f = document.getElementById('b-phpf');
      const width = U.pct(S.hp, E.maxHP()) + '%';
      if (f && f.style.width !== width) f.style.width = width;
    }
  }

  document.getElementById('btn-help').addEventListener('click', () => UI.help());
  window.addEventListener('beforeunload', () => {
    if (E.state()) { E.save(true); Online.syncSave(true); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && E.state()) { E.save(true); Online.syncSave(true); }
  });

  function enterOnline(data) {
    if (!data || !data.user) return;
    const auth = document.getElementById('auth-screen');
    const app = document.getElementById('app');
    auth.classList.add('hidden'); app.classList.remove('hidden');
    document.getElementById('account-name').textContent = '@' + data.user.username;
    const tag = document.getElementById('tagline');
    if (tag) tag.textContent = 'shared city · online account';

    let localSave = null;
    if (!data.save && E.hasSave() && E.load()) localSave = JSON.parse(JSON.stringify(E.state()));
    E.hardReset();
    UI.ready = false;
    E.battle = null;
    if (data.save && E.importSave(data.save)) {
      const S = E.state();
      const away = E.applyOffline();
      UI.page = S.page && typeof S.page === 'string' ? S.page : 'home';
      if (UI.page === 'streets') UI.page = 'home';
      UI.ready = true;
      UI.render(true);
      if (away > 120) setTimeout(() => toastLocal({ title: 'Welcome back', msg: `You were away for ${U.dur(away)}. Time kept moving in the city.`, kind: 'info' }), 200);
    } else if (localSave) {
      UI.page = 'home';
      document.getElementById('main').replaceChildren();
      const localLabel = `${U.esc(localSave.name || 'Unnamed character')} · level ${Math.max(1, Number(localSave.level) || 1)}`;
      UI.modal('📦 Import this browser save?', `<p class="small">Found <b class="gold">${localLabel}</b> in this browser. Import it into this account, or start with a fresh character. Choosing Import uploads the save to your account.</p>`,
        '<button class="btn ghost" data-fresh-local="1">Start fresh</button><button class="btn gold" data-import-local="1">Import character</button>',
        { noClose: true, width: 'min(500px,100%)', onMount: root => {
          root.querySelector('[data-import-local]').onclick = () => {
            UI.closeModal();
            if (E.importSave(localSave)) { UI.page = 'home'; UI.ready = true; UI.render(true); Online.syncSave(); }
            else UI.create();
          };
          root.querySelector('[data-fresh-local]').onclick = () => { UI.closeModal(); E.hardReset(); UI.create(); };
        } });
    } else {
      UI.page = 'home';
      document.getElementById('main').replaceChildren();
      UI.create();
    }
    Online.connect();
    Online.refreshHub();
  }

  function leaveOnline() {
    UI.ready = false;
    E.battle = null;
    E.hardReset();
    UI.page = 'home';
    document.getElementById('main').replaceChildren();
    document.getElementById('account-name').textContent = '';
    document.getElementById('app').classList.add('hidden');
    document.getElementById('auth-screen').classList.remove('hidden');
  }
  window.addEventListener('blackstone:authenticated', ev => enterOnline(ev.detail));
  window.addEventListener('blackstone:logout', leaveOnline);

  /* One-second game clock updates the existing DOM in place. */
  setInterval(() => {
    if (!E.state()) return;
    E.tick();
    if (E.battle) E.battleTick();
    UI.render(false);
  }, 1000);

  /* Fast battle meters; these only change text/width, never replace the combat screen. */
  setInterval(() => {
    if (!E.state() || !E.battle) return;
    const B = E.battle;
    const set = (id, v) => { const n = document.getElementById(id); v = String(v); if (n && n.textContent !== v) n.textContent = v; };
    const wid = (id, p) => { const n = document.getElementById(id); if (n && n.style.width !== p + '%') n.style.width = p + '%'; };
    set('b-pmt', Math.round(U.pct(B.pMeter, B.pNeed)) + '%'); wid('b-pmf', U.pct(B.pMeter, B.pNeed));
    set('b-emt', Math.round(U.pct(B.eMeter, B.eNeed)) + '%'); wid('b-emf', U.pct(B.eMeter, B.eNeed));
    set('b-timer', U.durShort(B.t));
  }, 90);

  /* Autosave locally as cache and to the account-backed server. */
  setInterval(() => {
    if (!E.state()) return;
    E.save(true); Online.syncSave();
  }, 15000);

  Online.bootstrap();
})();
