/* =========================================================
   BLACKSTONE — accounts, cloud saves, and shared city UI
   ========================================================= */
'use strict';

(function () {
  const Online = {
    user: null,
    socket: null,
    players: [],
    chat: [],
    onlineIds: new Set(),
    onlineCount: 0,
    connected: false,
    demoDb: false,
    temporaryDb: false,
    emailConfigured: false,
    saveTimer: null,
    saving: false,
    saveAgain: false,
    activeDm: null,

    async api(url, options) {
      options = options || {};
      const headers = Object.assign({}, options.headers || {});
      if (options.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
      const response = await fetch(url, Object.assign({ credentials: 'same-origin' }, options, { headers }));
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || `Request failed (${response.status}).`);
      return body;
    },

    showNotice(message, kind) {
      const el = document.getElementById('auth-notice');
      if (!el) return;
      el.textContent = message || '';
      el.className = 'auth-notice' + (kind ? ' ' + kind : '');
    },

    showAuthView(name) {
      const forms = {
        login: document.getElementById('auth-login-form'),
        signup: document.getElementById('auth-signup-form'),
        forgot: document.getElementById('auth-forgot-form'),
        resend: document.getElementById('auth-resend-form'),
        reset: document.getElementById('auth-reset-form')
      };
      Object.entries(forms).forEach(([key, form]) => { if (form) form.classList.toggle('hidden', key !== name); });
      const tabs = document.getElementById('auth-tabs');
      if (tabs) tabs.classList.toggle('hidden', name === 'forgot' || name === 'resend' || name === 'reset');
      document.querySelectorAll('[data-auth-view]').forEach(b => b.classList.toggle('on', b.dataset.authView === name));
    },

    bindAuth() {
      document.addEventListener('click', ev => {
        const toggle = ev.target.closest('[data-auth-view]');
        if (toggle) { this.showNotice('', ''); this.showAuthView(toggle.dataset.authView); }
      });
      const login = document.getElementById('auth-login-form');
      const signup = document.getElementById('auth-signup-form');
      const forgot = document.getElementById('auth-forgot-form');
      const reset = document.getElementById('auth-reset-form');
      if (login) login.addEventListener('submit', async ev => {
        ev.preventDefault();
        const form = new FormData(login);
        const submit = login.querySelector('[type="submit"]');
        submit.disabled = true; submit.textContent = 'Signing in…';
        try {
          await this.api('/api/auth/login', { method: 'POST', body: JSON.stringify({ identity: form.get('identity'), password: form.get('password') }) });
          const me = await this.api('/api/auth/me');
          this.showNotice('', '');
          this.authenticated(me);
        } catch (err) { this.showNotice(err.message, 'bad'); }
        finally { submit.disabled = false; submit.textContent = 'Enter Blackstone'; }
      });
      if (signup) signup.addEventListener('submit', async ev => {
        ev.preventDefault();
        const form = new FormData(signup);
        const submit = signup.querySelector('[type="submit"]');
        submit.disabled = true; submit.textContent = 'Creating account…';
        try {
          const result = await this.api('/api/auth/signup', { method: 'POST', body: JSON.stringify({ username: form.get('username'), email: form.get('email'), password: form.get('password') }) });
          if (result.verified) {
            const me = await this.api('/api/auth/me');
            this.authenticated(me);
          } else {
            this.showAuthView('login');
            this.showNotice(result.message || 'Check your inbox to verify your account.', 'good');
          }
        } catch (err) { this.showNotice(err.message, 'bad'); }
        finally { submit.disabled = false; submit.textContent = 'Create account'; }
      });
      if (forgot) forgot.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = new FormData(forgot).get('email');
        const submit = forgot.querySelector('[type="submit"]');
        submit.disabled = true; submit.textContent = 'Sending…';
        try {
          const result = await this.api('/api/auth/forgot', { method: 'POST', body: JSON.stringify({ email }) });
          this.showNotice(result.message, 'good');
        } catch (err) { this.showNotice(err.message, 'bad'); }
        finally { submit.disabled = false; submit.textContent = 'Send reset link'; }
      });
      const resend = document.getElementById('auth-resend-form');
      if (resend) resend.addEventListener('submit', async ev => {
        ev.preventDefault();
        const email = new FormData(resend).get('email');
        const submit = resend.querySelector('[type="submit"]');
        submit.disabled = true; submit.textContent = 'Sending…';
        try {
          const result = await this.api('/api/auth/resend-verification', { method: 'POST', body: JSON.stringify({ email }) });
          this.showNotice(result.message, 'good');
        } catch (err) { this.showNotice(err.message, 'bad'); }
        finally { submit.disabled = false; submit.textContent = 'Resend verification'; }
      });
      if (reset) reset.addEventListener('submit', async ev => {
        ev.preventDefault();
        const form = new FormData(reset);
        const submit = reset.querySelector('[type="submit"]');
        submit.disabled = true; submit.textContent = 'Resetting…';
        try {
          const result = await this.api('/api/auth/reset', { method: 'POST', body: JSON.stringify({ token: form.get('token'), password: form.get('password') }) });
          this.showAuthView('login');
          this.showNotice(result.message, 'good');
          history.replaceState({}, '', location.pathname);
        } catch (err) { this.showNotice(err.message, 'bad'); }
        finally { submit.disabled = false; submit.textContent = 'Reset password'; }
      });
      const params = new URLSearchParams(location.search);
      if (params.get('verified') === '1') this.showNotice('Email verified. Sign in to enter the city.', 'good');
      else if (params.get('verified') === 'invalid') this.showNotice('That verification link is invalid or expired. Ask for a fresh one.', 'bad');
      if (params.has('reset')) {
        document.getElementById('auth-reset-token').value = params.get('reset');
        this.showAuthView('reset');
        this.showNotice('Choose a new password for your account.', '');
      }
    },

    async bootstrap() {
      this.bindAuth();
      try {
        const me = await this.api('/api/auth/me');
        const health = await this.api('/api/health');
        this.demoDb = health.database === 'ephemeral-demo';
        this.temporaryDb = Boolean(health.temporaryDatabase);
        this.emailConfigured = Boolean(health.emailConfigured);
        const params = new URLSearchParams(location.search);
        if (me.user && !params.has('reset')) this.authenticated(me);
        else if (params.has('reset')) { /* reset form was opened in bindAuth */ }
        else if (location.search.includes('verified=')) { /* verification notice is set in bindAuth */ }
        else if (this.demoDb) this.showNotice('Local preview only: accounts and saves reset when the server restarts.', '');
        else if (!this.emailConfigured) this.showNotice(`Email delivery is not configured yet. Existing players can sign in, but new signup and password reset are disabled.${this.temporaryDb ? ' The demo database also expires after 30 days; upgrade it to retain accounts.' : ''}`, 'bad');
        else if (this.temporaryDb) this.showNotice('Demo database: upgrade Render Free Postgres before its 30-day expiry to retain accounts and saves.', '');
        else this.showNotice('', '');
      } catch (err) {
        this.showNotice(`Online service is unavailable: ${err.message}`, 'bad');
      }
    },

    authenticated(data) {
      this.user = data.user;
      window.dispatchEvent(new CustomEvent('blackstone:authenticated', { detail: data }));
    },

    async logout() {
      clearTimeout(this.saveTimer);
      if (this.user && window.E && E.state()) await this.syncSave();
      if (this.socket) { this.socket.disconnect(); this.socket = null; }
      try { await this.api('/api/auth/logout', { method: 'POST', body: '{}' }); } catch (_) {}
      this.user = null; this.connected = false;
      window.dispatchEvent(new CustomEvent('blackstone:logout'));
      this.showNotice('You have signed out.', 'good');
      this.showAuthView('login');
    },

    connect() {
      if (!this.user || this.socket || !window.io) return;
      const socket = window.io({ transports: ['websocket', 'polling'] });
      this.socket = socket;
      socket.on('connect', () => { this.connected = true; this.refreshHub(); this.renderIfOnline(); });
      socket.on('disconnect', () => { this.connected = false; this.renderIfOnline(); });
      socket.on('connect_error', () => { this.connected = false; this.renderIfOnline(); });
      socket.on('chat:history', messages => { this.chat = Array.isArray(messages) ? messages : []; this.renderIfOnline(); });
      socket.on('chat:new', message => {
        this.chat.push(message); if (this.chat.length > 100) this.chat.splice(0, this.chat.length - 100);
        this.renderIfOnline();
      });
      socket.on('presence:update', data => {
        this.onlineCount = Number(data.count) || 0;
        this.onlineIds = new Set((data.players || []).map(p => p.id));
        this.renderIfOnline();
      });
      socket.on('dm:new', message => {
        if (this.activeDm && (message.senderId === this.activeDm || message.recipientId === this.activeDm)) this.refreshDm(this.activeDm);
      });
    },

    async refreshHub() {
      if (!this.user) return;
      try {
        const [players, messages] = await Promise.all([
          this.api('/api/players'),
          this.api('/api/chat/recent')
        ]);
        this.players = players.players || [];
        if (!this.socket || !this.socket.connected) this.chat = messages.messages || [];
        this.renderIfOnline();
      } catch (err) {
        if (window.E) E.toast('Online hub unavailable', err.message, 'bad');
      }
    },

    renderIfOnline() {
      if (window.UI && UI.ready && UI.page === 'online') UI.render(false);
    },

    renderPage() {
      const user = this.user;
      const online = this.onlineIds;
      const players = this.players.map((p, i) => `<tr>
        <td class="num dim">${i + 1}</td>
        <td><span class="${online.has(p.id) ? 'online-status' : 'dim'}">${online.has(p.id) ? '<i class="online-dot"></i>' : ''}${U.esc(p.avatar)} ${U.esc(p.character)}</span><div class="tiny dimmer">@${U.esc(p.username)}</div></td>
        <td class="num">${p.level}</td><td class="num">${U.fmt(p.kills)}</td>
        <td class="num"><div class="btn-row" style="justify-content:flex-end;gap:4px"><button class="btn tiny ghost" data-online-profile="${U.esc(p.id)}">Profile</button><button class="btn tiny ghost" data-online-dm="${U.esc(p.id)}" ${p.id === user?.id ? 'disabled' : ''}>Message</button></div></td>
      </tr>`).join('');
      const chat = this.chat.slice(-50).map(m => `<div class="chat-line"><span class="who">${U.esc(m.username)}</span><span>${U.esc(m.body)}</span><time class="when">${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('');
      return `<div class="page">
        <div class="panel">
          <div class="p-head">🌐 City Online <span class="sub">${this.connected ? '<span class="online-status"><i class="online-dot"></i> connected</span>' : '<span class="dim">connecting…</span>'}</span></div>
          <div class="p-body"><p class="small dim">Welcome, <b class="gold">${U.esc(user?.username || '')}</b>. This shared city is account-based; your character saves to the server.</p>
            <p class="tiny dimmer">Social beta: profiles, presence, chat and private messages are live. Competitive duels, trading and co-op activities will follow server-authoritative game actions.</p>
            ${this.demoDb ? '<div class="warnmsg">⚠️ Local preview only: accounts and saves reset when this server restarts.</div>' : ''}
            ${this.temporaryDb ? '<div class="warnmsg">⚠️ Render Free Postgres expires after 30 days. Upgrade before expiry to keep player accounts and saves.</div>' : ''}
          </div>
        </div>
        <div class="online-grid">
          <div class="panel">
            <div class="p-head">🏆 Player board <span class="sub">${this.players.length} characters · ${this.onlineCount} online</span></div>
            <div class="p-body tight"><div class="rowwrap"><table class="online-table"><thead><tr><th>#</th><th>Player</th><th class="num">Lvl</th><th class="num">KOs</th><th></th></tr></thead>
              <tbody>${players || '<tr><td colspan="5" class="dim">No characters yet. Be the first to enter Blackstone.</td></tr>'}</tbody></table></div>
              <button class="btn tiny ghost" style="margin:9px 0 2px" data-online-refresh="1">↻ Refresh board</button>
            </div>
          </div>
          <div class="panel online-chat">
            <div class="p-head">💬 City chat <span class="sub">${this.onlineCount} online</span></div>
            <div class="p-body" style="display:flex;flex:1;flex-direction:column">
              <div class="chat-presence"><span>${this.connected ? 'Live messages' : 'Reconnecting to city…'}</span><span>Be decent. Keep it clean.</span></div>
              <div class="chat-feed" id="city-chat-feed">${chat || '<div class="dim small">No messages yet. Say hello.</div>'}</div>
              <form class="chat-compose" id="city-chat-form"><input id="city-chat-input" name="body" maxlength="280" autocomplete="off" placeholder="Say something to the city…" required ${this.connected ? '' : 'disabled'}><button class="btn gold" type="submit" ${this.connected ? '' : 'disabled'}>Send</button></form>
            </div>
          </div>
        </div>
      </div>`;
    },

    async onGameCreated() {
      await this.syncSave();
      await this.refreshHub();
    },

    async deleteSave() {
      try { await this.api('/api/game/save', { method: 'DELETE' }); return true; }
      catch (err) { if (window.E) E.toast('Could not wipe account save', err.message, 'bad'); return false; }
    },

    queueSave(delay) {
      if (!this.user || !window.E || !E.state()) return;
      clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(() => this.syncSave(), delay == null ? 700 : delay);
    },

    async syncSave(keepalive) {
      if (!this.user || !window.E || !E.state()) return false;
      if (this.saving) { this.saveAgain = true; return false; }
      this.saving = true;
      try {
        const response = await fetch('/api/game/save', {
          method: 'PUT', credentials: 'same-origin', keepalive: Boolean(keepalive),
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ save: E.state() })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Cloud save failed.');
        return true;
      } catch (err) {
        if (window.E) E.toast('Cloud save failed', err.message, 'bad');
        return false;
      } finally {
        this.saving = false;
        if (this.saveAgain) { this.saveAgain = false; this.queueSave(250); }
      }
    },

    async openProfile(playerId) {
      try {
        const { player } = await this.api(`/api/players/${encodeURIComponent(playerId)}`);
        const isOnline = this.onlineIds.has(player.id);
        UI.modal(`${U.esc(player.avatar)} ${U.esc(player.character)}`, `
          <div class="grid g2">
            <div class="muted-box"><div class="dimmer tiny">ACCOUNT</div><b>@${U.esc(player.username)}</b></div>
            <div class="muted-box"><div class="dimmer tiny">STATUS</div><span class="${isOnline ? 'green' : 'dim'}">${isOnline ? '● Online now' : 'Offline'}</span></div>
            <div class="muted-box"><div class="dimmer tiny">LEVEL</div><b>${player.level}</b></div>
            <div class="muted-box"><div class="dimmer tiny">KNOCKOUTS</div><b>${U.fmt(player.kills)}</b></div>
            <div class="muted-box"><div class="dimmer tiny">TIME PLAYED</div><b>${U.dur(player.played)}</b></div>
            <div class="muted-box"><div class="dimmer tiny">JOINED</div><b>${new Date(player.joined).toLocaleDateString()}</b></div>
          </div>
          <p class="tiny dimmer" style="margin-top:10px">Player-board stats are casual and not cheat-resistant yet.</p>`,
          `<button class="btn ghost" data-close="1">Close</button>${player.id !== this.user?.id ? `<button class="btn gold" data-online-dm="${U.esc(player.id)}">✉️ Message</button>` : ''}`,
          { width: 'min(520px,100%)' });
      } catch (err) { E.toast('Could not load profile', err.message, 'bad'); }
    },

    async openDm(playerId) {
      try {
        const data = await this.api(`/api/messages/${encodeURIComponent(playerId)}`);
        this.activeDm = playerId;
        const renderMessages = list => list.map(m => `<div class="chat-line"><span class="who">${U.esc(m.sender)}</span><span>${U.esc(m.body)}</span><time class="when">${new Date(m.createdAt).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</time></div>`).join('');
        const msgHTML = renderMessages(data.messages || []);
        UI.modal(`✉️ Message ${U.esc(data.player.username)}`, `<div class="chat-feed" id="dm-feed" style="height:280px">${msgHTML || '<p class="dim small">No messages yet.</p>'}</div>
          <form id="dm-form" class="chat-compose"><input id="dm-input" maxlength="500" required placeholder="Write a private message…"><button class="btn gold" type="submit">Send</button></form>`,
          '<button class="btn ghost" data-close="1">Close</button>', { width: 'min(560px,100%)' });
        const form = document.getElementById('dm-form');
        form.addEventListener('submit', async ev => {
          ev.preventDefault();
          const input = document.getElementById('dm-input'), body = input.value.trim();
          if (!body) return;
          try {
            const result = await this.api(`/api/messages/${encodeURIComponent(playerId)}`, { method: 'POST', body: JSON.stringify({ body }) });
            const feed = document.getElementById('dm-feed');
            if (feed) {
              const m = result.message;
              const row = document.createElement('div'); row.className = 'chat-line';
              const who = document.createElement('span'); who.className = 'who'; who.textContent = this.user.username;
              const text = document.createElement('span'); text.textContent = m.body;
              row.append(who, text); feed.appendChild(row); feed.scrollTop = feed.scrollHeight;
            }
            input.value = ''; input.focus();
          } catch (err) { E.toast('Message not sent', err.message, 'bad'); }
        });
      } catch (err) { E.toast('Could not open messages', err.message, 'bad'); }
    },

    async refreshDm(playerId) {
      if (!this.activeDm || this.activeDm !== playerId || !document.getElementById('dm-feed')) return;
      try {
        const data = await this.api(`/api/messages/${encodeURIComponent(playerId)}`);
        const feed = document.getElementById('dm-feed');
        if (!feed) return;
        const html = (data.messages || []).map(m => `<div class="chat-line"><span class="who">${U.esc(m.sender)}</span><span>${U.esc(m.body)}</span><time class="when">${new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time></div>`).join('');
        feed.innerHTML = html;
        feed.scrollTop = feed.scrollHeight;
      } catch (_) {}
    }
  };

  document.addEventListener('submit', ev => {
    if (ev.target.id !== 'city-chat-form') return;
    ev.preventDefault();
    const input = document.getElementById('city-chat-input');
    const body = input?.value.trim();
    if (!body || !Online.socket?.connected) return;
    Online.socket.emit('chat:send', { body }, result => {
      if (result?.error) E.toast('Chat message rejected', result.error, 'bad');
      else { input.value = ''; input.focus(); }
    });
  });
  document.addEventListener('click', ev => {
    if (ev.target.closest('[data-online-refresh]')) { Online.refreshHub(); return; }
    const profile = ev.target.closest('[data-online-profile]');
    if (profile) { Online.openProfile(profile.dataset.onlineProfile); return; }
    const dm = ev.target.closest('[data-online-dm]');
    if (dm && !dm.disabled) Online.openDm(dm.dataset.onlineDm);
  });
  document.getElementById('btn-logout')?.addEventListener('click', () => Online.logout());
  document.getElementById('btn-save')?.addEventListener('click', async () => {
    const ok = await Online.syncSave();
    if (ok) E.toast('Cloud save complete', 'Your character is synced to your account.', 'good');
  });

  window.Online = Online;
  if (window.UI && UI.pages) UI.pages.online = () => Online.renderPage();
  if (window.E) E.on('changed', () => Online.queueSave());
})();
