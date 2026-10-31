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

  // ======================= html-forms =======================
  const formLab = W(`
<div class="grid2">
  <div class="card">
    <h4>🌐 Page: https://shop.test/login</h4>
    <div class="row muted">
      method:
      <label><input type="radio" name="m" value="GET"> GET</label>
      <label><input type="radio" name="m" value="POST" checked> POST</label>
      <select id="enc" style="font-size:12px">
        <option>application/x-www-form-urlencoded</option>
        <option>multipart/form-data</option>
      </select>
    </div>
    <form id="f" style="display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;margin-top:4px">
      <span>Username</span><input name="username" value="alice">
      <span>Password</span><input id="pw" type="password" name="password" value="s3cret pa$$">
      <span></span><span><label><input type="checkbox" name="remember" value="yes" checked> Remember me</label>
        <label class="muted"><input type="checkbox" id="show"> show password</label></span>
      <input type="hidden" name="next" value="/dashboard">
      <span></span><span><button class="primary">Log in</button> <span class="muted">+ hidden field <code>next</code></span></span>
    </form>
  </div>
  <div class="card">
    <pre id="src" style="margin:0;font:11.5px/1.4 ui-monospace,Menlo,monospace;background:#f7f8fb;padding:6px 8px;border-radius:8px;white-space:pre-wrap"></pre>
    <div id="addr" class="muted" style="margin-top:6px"></div>
  </div>
</div>
<div id="flow" class="tight"></div>
`, function () {
    const m = () => $('input[name=m]:checked').value;
    function pairs() {
      const out = [];
      $$('#f [name]').forEach((el) => {
        if (el.type === 'checkbox' && !el.checked) return;
        out.push([el.name, el.value]);
      });
      return out;
    }
    function renderSrc() {
      const enc = $('#enc').value;
      const lines = [
        '<form action="/login" method="' + m().toLowerCase() + '"' +
          (m() === 'POST' && enc !== 'application/x-www-form-urlencoded' ? ' enctype="' + enc + '"' : '') + '>',
        '  <input name="username" value="' + $('[name=username]').value + '">',
        '  <input type="password" name="password">',
        '  <input type="checkbox" name="remember" value="yes">',
        '  <input type="hidden" name="next" value="/dashboard">',
        '  <button>Log in</button>',
        '</form>',
      ];
      $('#src').textContent = lines.join('\n');
      $('#enc').disabled = m() === 'GET';
    }
    function build() {
      const p = pairs(), enc = $('#enc').value, method = m();
      const qs = new URLSearchParams(p).toString();
      const pw = $('#pw').value;
      const pwEnc = new URLSearchParams([['x', pw]]).toString().slice(2);
      let msg, hl;
      if (method === 'GET') {
        msg = ['GET /login?' + qs + ' HTTP/1.1', 'Host: shop.test', 'Accept: text/html',
          'Referer: https://shop.test/login', '', '# (no body: with GET the fields go into the URL)'].join('\n');
        hl = ['password=' + pwEnc];
        $('#addr').innerHTML = '<b>Address bar after submit:</b><br><code style="word-break:break-all">https://shop.test/login?' +
          esc(qs) + '</code><br><span class="pill bad">password is now in history, server logs and Referer headers</span>';
      } else if (enc === 'application/x-www-form-urlencoded') {
        const len = new TextEncoder().encode(qs).length;
        msg = ['POST /login HTTP/1.1', 'Host: shop.test', 'Origin: https://shop.test',
          'Content-Type: application/x-www-form-urlencoded', 'Content-Length: ' + len, '', qs].join('\n');
        hl = ['password=' + pwEnc, 'Content-Type'];
        $('#addr').innerHTML = '<b>Address bar after submit:</b> <code>https://shop.test/login</code> (fields are in the body)';
      } else {
        const b = '----WebKitFormBoundary' + Auth.randHex(8);
        const body = p.map(([k, v]) => '--' + b + '\nContent-Disposition: form-data; name="' + k + '"\n\n' + v)
          .join('\n') + '\n--' + b + '--';
        const len = new TextEncoder().encode(body.replace(/\n/g, '\r\n')).length;
        msg = ['POST /login HTTP/1.1', 'Host: shop.test', 'Origin: https://shop.test',
          'Content-Type: multipart/form-data; boundary=' + b, 'Content-Length: ' + len, '', body].join('\n');
        hl = [pw, 'boundary'];
        $('#addr').innerHTML = '<b>multipart</b> is meant for file uploads: every field becomes a "part" between boundary lines.';
      }
      const parsed = p.map(([k, v]) => k + ' = ' + JSON.stringify(v)).join('\n');
      const steps = [
        { from: 'b', to: 'b', label: 'collect name=value pairs',
          note: 'The browser walks the form. Every field <b>with a <code>name</code></b> becomes a pair. ' +
            'Unchecked checkboxes are skipped completely. Pairs: ' + p.map((x) => '<code>' + esc(x[0]) + '</code>').join(', '),
          set: { b: { fields: p.length + ' pairs' } } },
        { from: 'b', to: 's', label: method + ' /login' + (method === 'GET' ? '?…' : ''), msg, hl,
          note: 'This is the <b>exact</b> text that travels. Look at the highlighted password: <code>type="password"</code> ' +
            'only hid the dots on screen. It is <b>not encrypted</b>: only HTTPS (lesson 1.5) protects it on the wire.' },
        { from: 's', to: 's', label: 'decode fields', msg: '# what the server code receives\n' + parsed,
          note: 'The server URL-decodes (<code>+</code> → space, <code>%24</code> → <code>$</code>) and gets the original values back.',
          set: { s: { 'req.body.username': p[0] ? p[0][1] : '' } } },
        method === 'GET'
          ? { from: 's', to: 'b', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<h1>Welcome</h1>',
            note: 'It "works", but never send passwords with GET: the URL is saved in history, proxy & server logs, and leaks via <code>Referer</code>.' }
          : { from: 's', to: 'b', kind: 'redirect', label: '303 See Other → /dashboard',
            msg: 'HTTP/1.1 303 See Other\nLocation: /dashboard\nContent-Length: 0',
            hl: ['303 See Other', 'Location'],
            note: 'After a successful POST, servers reply <code>303</code> so the browser does a fresh <b>GET</b> /dashboard. ' +
              '(Pressing reload then won’t re-submit the form.) How the server remembers you is lesson 2.2.' },
      ];
      const seq = Seq.mount('#flow', {
        title: 'What your click actually sends',
        actors: [
          { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Browser' },
          { id: 's', label: 'shop.test server', icon: '🖥', store: {}, storeLabel: 'Server sees' },
        ],
        steps,
      });
      return seq;
    }
    $('#f').addEventListener('submit', (e) => { e.preventDefault(); build().play(); });
    $('#show').addEventListener('change', (e) => { $('#pw').type = e.target.checked ? 'text' : 'password'; });
    $$('input[name=m], #enc, #f input').forEach((el) => el.addEventListener('change', () => { renderSrc(); build(); }));
    $('[name=username]').addEventListener('input', renderSrc);
    renderSrc();
    build();
  });

  const encLab = W(`
<div class="card">
  <h4>🔤 URL-encoding explorer</h4>
  <div class="row">
    <input id="in" class="code" style="flex:1" value="p@ss&amp;word=1 ok">
  </div>
  <div class="row muted">Try:
    <button class="chip" data-v="a b">a b</button>
    <button class="chip" data-v="p@ss&amp;word=1 ok">p@ss&amp;word=1 ok</button>
    <button class="chip" data-v="café">café</button>
    <button class="chip" data-v="100% sure?">100% sure?</button>
    <button class="chip" data-v="😀">😀</button>
    <button class="chip" data-v="/dashboard?tab=1">/dashboard?tab=1</button>
  </div>
  <table class="t" style="margin-top:6px">
    <tr><th style="width:230px">Form body (<code>application/x-www-form-urlencoded</code>)</th><td><code id="form"></code></td></tr>
    <tr><th>In a URL path/query (<code>encodeURIComponent</code>)</th><td><code id="uri"></code></td></tr>
    <tr><th>As a full form field</th><td><code id="field"></code></td></tr>
  </table>
</div>
<div class="card">
  <h4>Character by character</h4>
  <div class="muted">Letters, digits and <code>* - . _</code> stay as they are. Space becomes <code>+</code> in forms.
    Everything else becomes its UTF-8 bytes written as <code>%XX</code> (hex). That is why <code>&amp;</code> and
    <code>=</code> inside a value can’t confuse the parser.</div>
  <div id="chars" class="row" style="margin-top:8px"></div>
</div>
<div class="card">
  <h4>Decode a body back</h4>
  <input id="dec" class="code" value="username=bob+smith&amp;password=p%40ss%26word%21">
  <div id="decout" style="margin-top:6px"></div>
</div>
`, function () {
    const enc = (s) => new URLSearchParams([['x', s]]).toString().slice(2);
    function update() {
      const v = $('#in').value;
      $('#form').textContent = enc(v);
      $('#uri').textContent = encodeURIComponent(v);
      $('#field').textContent = 'password=' + enc(v);
      $('#chars').innerHTML = Array.from(v).map((c) => {
        const e = enc(c), same = e === c;
        return '<div style="border:1px solid #e2e5ee;border-radius:8px;padding:4px 8px;text-align:center;background:' +
          (same ? '#fff' : '#fff7e0') + '"><div style="font-size:16px">' + esc(c === ' ' ? '␠' : c) +
          '</div><code>' + esc(e) + '</code></div>';
      }).join('');
    }
    function decode() {
      try {
        const rows = Array.from(new URLSearchParams($('#dec').value));
        $('#decout').innerHTML = '<table class="t"><tr><th>name</th><th>value</th></tr>' +
          rows.map(([k, x]) => '<tr><td><code>' + esc(k) + '</code></td><td><code>' + esc(x) + '</code></td></tr>').join('') + '</table>';
      } catch (e) { $('#decout').textContent = e.message; }
    }
    $('#in').addEventListener('input', update);
    $('#dec').addEventListener('input', decode);
    $$('[data-v]').forEach((b) => (b.onclick = () => { $('#in').value = b.dataset.v; update(); }));
    update();
    decode();
  });

  function formExercise() {
    const ta = $('#ans');
    ta.value = CFG.value;
    $('#check').onclick = () => {
      const v = ta.value.trim();
      const r = $('#result');
      let p;
      try { p = new URLSearchParams(v); } catch (e) { p = null; }
      const keys = p ? Array.from(p.keys()) : [];
      const msgs = [];
      if (/\s/.test(v)) msgs.push('A raw space is not allowed in the body. Spaces become <code>+</code> (or <code>%20</code>).');
      if (!p || p.get('username') !== 'bob smith') msgs.push('<code>username</code> should decode to <code>bob smith</code> (got <code>' + esc(p ? p.get('username') : '') + '</code>).');
      if (!p || p.get('password') !== 'p@ss&word!') msgs.push('<code>password</code> should decode to <code>p@ss&amp;word!</code> (got <code>' + esc(p ? p.get('password') : '') + '</code>). Did you encode <code>&amp;</code> as <code>%26</code>?');
      if (keys.length !== 2) msgs.push('Expected exactly 2 fields, the parser found ' + keys.length + ': ' + keys.map((k) => '<code>' + esc(k) + '</code>').join(', '));
      if (msgs.length) {
        r.className = 'result bad';
        r.innerHTML = '❌ ' + msgs.join('<br>');
      } else {
        r.className = 'result ok';
        r.innerHTML = '✅ Correct! The server will decode <code>username="bob smith"</code> and <code>password="p@ss&amp;word!"</code>.';
      }
      $('#parsed').innerHTML = p ? Array.from(p).map(([k, x]) => '<code>' + esc(k) + '</code> = <code>' + esc(JSON.stringify(x)) + '</code>').join('<br>') : '';
    };
  }
  const formExHtml = `
<div class="card">
  <h4>The form</h4>
  <div class="muted">A user types <b>username</b> <code>bob smith</code> and <b>password</b> <code>p@ss&amp;word!</code>
    into a <code>&lt;form method="post"&gt;</code> and clicks Log in.</div>
</div>
<div class="card">
  <h4>Write the request body exactly as the browser sends it</h4>
  <pre class="seq-msg">POST /login HTTP/1.1
Host: shop.test
Content-Type: application/x-www-form-urlencoded
</pre>
  <textarea id="ans" class="code" rows="3"></textarea>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
  <div class="muted" style="margin-top:6px">What the server parser sees:<div id="parsed"></div></div>
</div>`;

  // ======================= http-anatomy =======================
  const builder = W(`
<div class="card">
  <h4>🛠 Build a request to https://notes.test</h4>
  <div class="row">
    <select id="method"><option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option></select>
    <select id="path">
      <option>/</option><option>/api/me</option><option>/api/notes</option><option>/api/notes/7</option>
      <option>/old-page</option><option>/missing</option><option>/boom</option>
    </select>
    <span class="muted">HTTP/1.1</span>
  </div>
  <div class="row muted">
    Headers:
    <label><input type="checkbox" id="hAccept" checked> Accept: application/json</label>
    <label>Authorization:
      <select id="hAuth"><option value="">(none)</option><option value="alice">Bearer tok-alice (user)</option><option value="root">Bearer tok-root (admin)</option></select>
    </label>
    <label><input type="checkbox" id="hCT"> Content-Type: application/json</label>
  </div>
  <div class="row">
    <textarea id="body" class="code" rows="2" placeholder="body (only for POST / PUT)">{"text": "buy milk"}</textarea>
  </div>
  <div class="row"><button id="send" class="primary">Send ▶</button>
    <span class="muted">Ideas: GET /api/me without and with Authorization · POST /api/notes without Content-Type · DELETE /api/notes/7 as alice vs root · PUT / · GET /old-page</span></div>
</div>
<div id="flow" class="tight"></div>
<div id="parts" class="card tight" style="margin-top:8px"></div>
`, function () {
    const TOK = { alice: { user: 'alice', role: 'user' }, root: { user: 'root', role: 'admin' } };
    function request() {
      const method = $('#method').value, path = $('#path').value;
      const lines = [method + ' ' + path + ' HTTP/1.1', 'Host: notes.test', 'User-Agent: Mozilla/5.0 (demo)'];
      if ($('#hAccept').checked) lines.push('Accept: application/json');
      if ($('#hAuth').value) lines.push('Authorization: Bearer tok-' + $('#hAuth').value);
      const hasBody = method === 'POST' || method === 'PUT';
      const body = hasBody ? $('#body').value : '';
      if ($('#hCT').checked) lines.push('Content-Type: application/json');
      if (hasBody) lines.push('Content-Length: ' + new TextEncoder().encode(body).length);
      lines.push('');
      if (hasBody) lines.push(body);
      return { method, path, body, ct: $('#hCT').checked, who: TOK[$('#hAuth').value], raw: lines.join('\n') };
    }
    function json(o) { return JSON.stringify(o); }
    function server(r) {
      const date = 'Date: ' + new Date().toUTCString();
      const R = (code, text, headers, body, why) => ({ code, text, headers: [date].concat(headers || []), body: body || '', why });
      const allow = { '/': 'GET', '/api/me': 'GET', '/api/notes': 'GET, POST', '/api/notes/7': 'GET, PUT, DELETE', '/old-page': 'GET', '/missing': '', '/boom': 'GET' };
      if (r.path === '/missing') return R(404, 'Not Found', ['Content-Type: application/json'], json({ error: 'not_found' }), 'No route matches this path.');
      if (r.path === '/boom') return R(500, 'Internal Server Error', ['Content-Type: application/json'], json({ error: 'server_error' }), 'The server code threw an exception. 5xx = the server’s fault, not yours.');
      if (allow[r.path].split(', ').indexOf(r.method) < 0)
        return R(405, 'Method Not Allowed', ['Allow: ' + allow[r.path]], '', 'The path exists but not for ' + r.method + '. The <code>Allow</code> header lists valid methods.');
      if (r.path === '/') return R(200, 'OK', ['Content-Type: text/html; charset=utf-8'], '<!doctype html><h1>Notes</h1>', 'Public home page.');
      if (r.path === '/old-page') return R(301, 'Moved Permanently', ['Location: /'], '', '3xx = go somewhere else. The browser follows <code>Location</code> automatically.');
      const needAuth = r.path === '/api/me' || r.method !== 'GET';
      if (needAuth && !r.who)
        return R(401, 'Unauthorized', ['WWW-Authenticate: Bearer realm="notes"', 'Content-Type: application/json'], json({ error: 'unauthenticated' }),
          'This route needs to know <b>who</b> you are, and no credentials were sent. 401 must say how to authenticate in <code>WWW-Authenticate</code>.');
      if (r.path === '/api/me') return R(200, 'OK', ['Content-Type: application/json', 'Cache-Control: no-store'], json({ user: r.who.user, role: r.who.role }), 'Token recognized: the server knows who you are.');
      if (r.path === '/api/notes' && r.method === 'GET') return R(200, 'OK', ['Content-Type: application/json'], json([{ id: 7, text: 'hello' }]), 'Public list.');
      if (r.path === '/api/notes/7' && r.method === 'GET') return R(200, 'OK', ['Content-Type: application/json'], json({ id: 7, text: 'hello' }), 'Public note.');
      if (r.method === 'DELETE') {
        if (r.who.role !== 'admin') return R(403, 'Forbidden', ['Content-Type: application/json'], json({ error: 'forbidden' }), 'You are logged in (we know you are ' + r.who.user + ') but you are <b>not allowed</b> to delete. That’s 403, not 401.');
        return R(204, 'No Content', [], '', 'Deleted. 204 = success with an intentionally empty body.');
      }
      if (!r.ct) return R(415, 'Unsupported Media Type', ['Accept-Post: application/json'], '', 'Without <code>Content-Type: application/json</code> the server doesn’t know how to read your body.');
      try { JSON.parse(r.body); } catch (e) {
        return R(400, 'Bad Request', ['Content-Type: application/json'], json({ error: 'invalid_json' }), 'The body is not valid JSON. 4xx = the client sent something wrong.');
      }
      if (r.method === 'POST') return R(201, 'Created', ['Location: /api/notes/8', 'Content-Type: application/json'], json(Object.assign({ id: 8 }, JSON.parse(r.body))), '201 + <code>Location</code> tells you where the new resource lives.');
      return R(200, 'OK', ['Content-Type: application/json'], json(Object.assign({ id: 7 }, JSON.parse(r.body))), 'Replaced note 7.');
    }
    const CLASS = { 1: ['1xx informational', 'info'], 2: ['2xx success', 'ok'], 3: ['3xx redirection', 'warnp'], 4: ['4xx client error', 'bad'], 5: ['5xx server error', 'bad'] };
    function send(play) {
      const r = request(), res = server(r);
      const bodyLen = new TextEncoder().encode(res.body).length;
      const rawRes = ['HTTP/1.1 ' + res.code + ' ' + res.text].concat(res.headers, ['Content-Length: ' + bodyLen, '', res.body]).join('\n');
      const cls = String(res.code)[0];
      const kind = cls === '2' ? 'res' : cls === '3' ? 'redirect' : 'err';
      const s = Seq.mount('#flow', {
        actors: [{ id: 'c', label: 'Client (browser / app)', icon: '🌐' }, { id: 's', label: 'notes.test', icon: '🖥' }],
        steps: [
          { from: 'c', to: 's', label: r.method + ' ' + r.path, msg: r.raw, hl: ['Authorization', 'Content-Type'],
            note: 'Request = <b>request line</b> (method, path, version) + <b>headers</b> (<code>Name: value</code>) + <b>blank line</b> + optional <b>body</b>.' },
          { from: 's', to: 's', label: 'route + check', note: res.why },
          { from: 's', to: 'c', kind, label: res.code + ' ' + res.text, msg: rawRes, hl: ['WWW-Authenticate', 'Location', 'Allow'],
            note: 'Response = <b>status line</b> (version, code, reason) + headers + blank line + body. Class: <span class="pill ' + CLASS[cls][1] + '">' + CLASS[cls][0] + '</span>' },
        ],
      });
      const reqLine = r.raw.split('\n')[0].split(' ');
      $('#parts').innerHTML = '<table class="t"><tr><th>Request line</th><td>method <code>' + esc(reqLine[0]) +
        '</code> · target <code>' + esc(reqLine[1]) + '</code> · version <code>' + reqLine[2] + '</code></td></tr>' +
        '<tr><th>Status line</th><td>version <code>HTTP/1.1</code> · code <code>' + res.code + '</code> · reason <code>' + res.text +
        '</code> → <span class="pill ' + CLASS[cls][1] + '">' + CLASS[cls][0] + '</span></td></tr>' +
        '<tr><th>Body</th><td>' + (res.body ? bodyLen + ' bytes' : '<i>empty</i>') + '</td></tr></table>';
      if (play) s.play();
    }
    $('#send').onclick = () => send(true);
    function sync() { const m = $('#method').value; $('#body').disabled = !(m === 'POST' || m === 'PUT'); }
    $('#method').addEventListener('change', sync);
    sync();
    send(false);
  });

  const statusGrid = W(`
<div class="card">
  <h4>📟 Status codes you will meet in auth (click one)</h4>
  <div id="grid" style="display:grid;grid-template-columns:repeat(6,1fr);gap:6px"></div>
  <div id="detail" class="card" style="margin-top:10px;min-height:80px"></div>
</div>
`, function () {
    const C = [
      [101, 'Switching Protocols', 'Upgrading the connection, e.g. to WebSocket.', ''],
      [200, 'OK', 'Success with a body.', 'Login page shown, API data returned.'],
      [201, 'Created', 'Success, new resource created. Usually has a Location header.', 'Registered a new user / passkey.'],
      [204, 'No Content', 'Success, empty body on purpose.', 'Logout endpoint, DELETE.'],
      [301, 'Moved Permanently', 'Go to Location forever; browsers may cache it. Clients may switch POST to GET.', 'http:// → https:// redirect.'],
      [302, 'Found', 'Temporary redirect to Location.', 'Redirect to the login page, OAuth redirects.'],
      [303, 'See Other', 'Go to Location using GET. The right answer after a successful form POST.', 'POST /login → 303 /dashboard.'],
      [304, 'Not Modified', 'Your cached copy is still fresh.', ''],
      [307, 'Temporary Redirect', 'Like 302 but the method and body must NOT change.', 'Chrome shows a "307 Internal Redirect" when HSTS upgrades to https.'],
      [308, 'Permanent Redirect', 'Like 301 but the method must not change.', ''],
      [400, 'Bad Request', 'The request is malformed.', 'OAuth token endpoint errors like invalid_grant.'],
      [401, 'Unauthorized', 'Really means "unauthenticated": no or bad credentials. MUST include WWW-Authenticate.', 'Missing/expired token, Basic auth challenge.'],
      [403, 'Forbidden', 'We know who you are (or it doesn’t matter): you are not allowed.', 'Logged-in user hits an admin page, CSRF token missing.'],
      [404, 'Not Found', 'No such resource. Also used to hide that a resource exists.', 'Another user’s private document.'],
      [405, 'Method Not Allowed', 'Path exists, method doesn’t. Must include Allow.', ''],
      [409, 'Conflict', 'Conflicts with current state.', 'Username already taken.'],
      [415, 'Unsupported Media Type', 'Server can’t read this Content-Type.', ''],
      [429, 'Too Many Requests', 'Rate limited. May include Retry-After.', 'Brute-force login protection.'],
      [500, 'Internal Server Error', 'Server bug or crash.', ''],
      [502, 'Bad Gateway', 'A proxy got a bad answer from the app behind it.', ''],
      [503, 'Service Unavailable', 'Overloaded or down for maintenance.', ''],
    ];
    const col = { 1: '#e0f2fe', 2: '#dcfce7', 3: '#fef3c7', 4: '#fee2e2', 5: '#fecaca' };
    $('#grid').innerHTML = C.map((c, i) => '<button data-i="' + i + '" style="background:' + col[String(c[0])[0]] +
      ';margin:0;padding:6px 4px"><b>' + c[0] + '</b><br><span style="font-size:11px">' + c[1] + '</span></button>').join('');
    function show(i) {
      const c = C[i], k = String(c[0])[0];
      const names = { 1: 'Informational', 2: 'Success', 3: 'Redirection', 4: 'Client error (you sent something wrong)', 5: 'Server error (the server failed)' };
      $('#detail').innerHTML = '<div style="font:600 16px ui-monospace,Menlo,monospace">HTTP/1.1 ' + c[0] + ' ' + c[1] + '</div>' +
        '<div class="muted">' + k + 'xx · ' + names[k] + '</div><p style="margin:6px 0">' + c[2] + '</p>' +
        (c[3] ? '<div>🔐 <b>In auth:</b> ' + c[3] + '</div>' : '');
    }
    $$('#grid button').forEach((b) => (b.onclick = () => show(+b.dataset.i)));
    show(11);
  });

  function rawReqExercise() {
    $('#ans').value = CFG.value;
    $('#check').onclick = () => {
      const v = $('#ans').value.replace(/\r/g, '');
      const msgs = [];
      const sep = v.indexOf('\n\n');
      const head = sep < 0 ? v : v.slice(0, sep), body = sep < 0 ? '' : v.slice(sep + 2).trim();
      const lines = head.split('\n');
      if (!/^POST \/api\/notes HTTP\/1\.1$/.test(lines[0].trim())) msgs.push('Line 1 must be the request line: <code>POST /api/notes HTTP/1.1</code>');
      const hdr = {};
      lines.slice(1).forEach((l) => { const m = /^([A-Za-z0-9-]+):\s*(.*)$/.exec(l.trim()); if (m) hdr[m[1].toLowerCase()] = m[2]; else if (l.trim()) msgs.push('Not a valid header line: <code>' + esc(l) + '</code> (format is <code>Name: value</code>)'); });
      if (hdr.host !== 'notes.test') msgs.push('HTTP/1.1 requires a <code>Host</code> header: <code>Host: notes.test</code>');
      if (!/^application\/json/i.test(hdr['content-type'] || '')) msgs.push('Tell the server the body format: <code>Content-Type: application/json</code>');
      if (hdr.authorization !== 'Bearer tok-alice') msgs.push('Add the credentials: <code>Authorization: Bearer tok-alice</code>');
      if (sep < 0) msgs.push('Headers and body must be separated by one <b>empty line</b>.');
      let j = null;
      try { j = JSON.parse(body); } catch (e) { /* ignore */ }
      if (!j || j.text !== 'hi') msgs.push('Body must be JSON <code>{"text": "hi"}</code>');
      const r = $('#result');
      r.className = 'result ' + (msgs.length ? 'bad' : 'ok');
      r.innerHTML = msgs.length ? '❌ ' + msgs.join('<br>') : '✅ Perfect request! The server would answer <code>201 Created</code>.';
    };
  }
  const rawReqHtml = `
<div class="card">
  <h4>Write a raw HTTP request</h4>
  <div class="muted">Goal: as <b>alice</b> (token <code>tok-alice</code>), create a note with text <code>hi</code> by POSTing JSON to
    <code>https://notes.test/api/notes</code>. Type the whole request: request line, headers, empty line, body.</div>
  <textarea id="ans" class="code" rows="9" style="margin-top:6px"></textarea>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= stateless =======================
  const statelessSeq = W(`<div id="flow"></div>`, function () {
    const sid = 'k3Jx9QpL2vTn';
    const basic = Auth.b64('alice:s3cret');
    Seq.mount('#flow', {
      title: 'A server with the memory of a goldfish',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Browser remembers' },
        { id: 's', label: 'shop.test', icon: '🖥', store: { users: 'alice / s3cret' }, storeLabel: 'Server memory' },
      ],
      scenarios: [
        { name: '🐟 Nothing remembered', steps: [
          { from: 'b', to: 's', label: 'POST /login', msg: 'POST /login HTTP/1.1\nHost: shop.test\nContent-Type: application/x-www-form-urlencoded\n\nusername=alice&password=s3cret',
            note: 'Alice logs in. The password is correct.' },
          { from: 's', to: 'b', kind: 'res', label: '200 "Welcome, alice!"', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<h1>Welcome, alice!</h1>',
            note: 'The server says welcome… and then <b>forgets</b>. The request is finished; nothing links it to the next one.' },
          { from: 'b', to: 's', label: 'GET /cart', msg: 'GET /cart HTTP/1.1\nHost: shop.test\nAccept: text/html',
            note: 'A brand-new request. Look at it: <b>nothing</b> in it says "I am alice". It could come from anyone on Earth.' },
          { from: 's', to: 's', label: 'who is this?', note: 'HTTP is <b>stateless</b>: every request must carry everything the server needs to understand it.' },
          { from: 's', to: 'b', kind: 'err', label: '401 / redirect to login', msg: 'HTTP/1.1 302 Found\nLocation: /login',
            note: 'Without proof attached, the server must treat this as an anonymous visitor.' },
        ] },
        { name: '🔁 Re-send the password every time', steps: [
          { from: 'b', to: 's', label: 'GET /cart + Authorization', msg: 'GET /cart HTTP/1.1\nHost: shop.test\nAuthorization: Basic ' + basic, hl: ['Authorization'],
            note: 'Option 1: attach the credentials to <b>every</b> request (HTTP Basic auth, section 3). <code>' + basic + '</code> is just Base64 of <code>alice:s3cret</code>.' },
          { from: 's', to: 's', label: 'check password', note: 'The server re-checks the password on every request (slow, if hashed properly).' },
          { from: 's', to: 'b', kind: 'res', label: '200 alice’s cart', msg: 'HTTP/1.1 200 OK\n\n<h1>alice’s cart</h1>' },
          { from: 'b', to: 's', label: 'GET /orders + Authorization', msg: 'GET /orders HTTP/1.1\nHost: shop.test\nAuthorization: Basic ' + basic, hl: ['Authorization'],
            note: 'It works, but the real password travels on every request and the browser must keep it. No clean way to "log out".' },
          { from: 's', to: 'b', kind: 'res', label: '200 alice’s orders', msg: 'HTTP/1.1 200 OK\n\n<h1>alice’s orders</h1>' },
        ] },
        { name: '🍪 Give the browser a ticket (cookie)', steps: [
          { from: 'b', to: 's', label: 'POST /login', msg: 'POST /login HTTP/1.1\nHost: shop.test\nContent-Type: application/x-www-form-urlencoded\n\nusername=alice&password=s3cret' },
          { from: 's', to: 's', label: 'create session', note: 'Password OK. The server writes a note in its <b>session store</b>: ticket <code>' + sid + '</code> belongs to alice.',
            set: { s: { ['session ' + sid]: 'user=alice' } } },
          { from: 's', to: 'b', kind: 'redirect', label: '303 + Set-Cookie: sid=…', msg: 'HTTP/1.1 303 See Other\nLocation: /cart\nSet-Cookie: sid=' + sid + '; HttpOnly; Secure; SameSite=Lax; Path=/',
            hl: ['Set-Cookie'], note: 'The server hands the browser a <b>random ticket</b>, not the password. The browser stores it in its cookie jar.',
            set: { b: { 'cookie sid': sid } } },
          { from: 'b', to: 's', label: 'GET /cart + Cookie', msg: 'GET /cart HTTP/1.1\nHost: shop.test\nCookie: sid=' + sid, hl: ['Cookie'],
            note: 'From now on the browser <b>automatically</b> attaches <code>Cookie: sid=…</code> to every request to shop.test.' },
          { from: 's', to: 's', label: 'look up ticket', note: 'Lookup <code>' + sid + '</code> in the store → alice. Each request is still independent; the cookie carries the link.' },
          { from: 's', to: 'b', kind: 'res', label: '200 alice’s cart', msg: 'HTTP/1.1 200 OK\n\n<h1>alice’s cart</h1>' },
          { from: 'b', to: 's', label: 'GET /orders + Cookie', msg: 'GET /orders HTTP/1.1\nHost: shop.test\nCookie: sid=' + sid, hl: ['Cookie'] },
          { from: 's', to: 'b', kind: 'res', label: '200 alice’s orders', msg: 'HTTP/1.1 200 OK\n\n<h1>alice’s orders</h1>',
            note: 'This is the core idea behind every login system: <b>something must be sent with every request</b>, a cookie or an <code>Authorization</code> header.' },
        ] },
      ],
    });
  });

  const goldfish = W(`
<div class="grid2">
  <div class="card">
    <h4>🌐 You (browser)</h4>
    <div class="muted">Each button sends one independent request. Choose what to attach:</div>
    <div class="row">
      <label><input type="radio" name="att" value="none" checked> nothing</label>
      <label><input type="radio" name="att" value="cookie"> Cookie: sid=…</label>
      <label><input type="radio" name="att" value="auth"> Authorization header</label>
      <label><input type="radio" name="att" value="ip"> "same Wi-Fi, same IP"</label>
    </div>
    <div class="row">
      <button data-p="/">GET /</button><button data-p="/cart">GET /cart</button><button data-p="/orders">GET /orders</button>
      <button data-p="/admin">GET /admin</button>
    </div>
    <pre id="req" class="seq-msg" style="min-height:90px"></pre>
  </div>
  <div class="card">
    <h4>🖥 Server log (one line per request)</h4>
    <div id="log" style="font:12px/1.6 ui-monospace,Menlo,monospace;max-height:300px;overflow:auto"></div>
    <button id="clr" style="margin-top:6px">Clear log</button>
  </div>
</div>
<div class="card muted">The server has a session store <code>{ "k3Jx9QpL2vTn": "alice" }</code> and a token list
  <code>{ "tok-alice": "alice" }</code>. It never uses your IP address as identity: many people share one IP (café, office, mobile carrier),
  and one person changes IP all the time.</div>
`, function () {
    let n = 0;
    $$('[data-p]').forEach((b) => (b.onclick = () => {
      const att = $('input[name=att]:checked').value, p = b.dataset.p;
      const lines = ['GET ' + p + ' HTTP/1.1', 'Host: shop.test'];
      if (att === 'cookie') lines.push('Cookie: sid=k3Jx9QpL2vTn');
      if (att === 'auth') lines.push('Authorization: Bearer tok-alice');
      paint($('#req'), lines.join('\n'), ['Cookie', 'Authorization']);
      const who = att === 'cookie' || att === 'auth' ? 'alice' : null;
      const how = att === 'cookie' ? 'via session cookie' : att === 'auth' ? 'via Authorization header' : att === 'ip' ? 'IP 203.0.113.7 (shared by 40 café guests!)' : 'no credentials';
      let st = who ? 200 : p === '/' ? 200 : 401;
      if (p === '/admin' && who) st = 403;
      n++;
      const line = document.createElement('div');
      line.innerHTML = '#' + n + ' <b>GET ' + p + '</b> → ' + (who ? '<span class="pill ok">' + who + '</span>' : '<span class="pill bad">anonymous</span>') +
        ' <span class="muted">' + how + '</span> → <b>' + st + '</b>';
      $('#log').prepend(line);
    }));
    $('#clr').onclick = () => { $('#log').innerHTML = ''; n = 0; };
  });

  function cookieExercise() {
    $('#ans').value = CFG.value;
    $('#check').onclick = () => {
      const v = $('#ans').value.replace(/\r/g, '').trim();
      const lines = v.split('\n');
      const msgs = [];
      if (!/^GET \/cart HTTP\/1\.1$/.test(lines[0])) msgs.push('Keep the request line <code>GET /cart HTTP/1.1</code>.');
      if (!lines.some((l) => /^Host:\s*shop\.test$/i.test(l.trim()))) msgs.push('Keep <code>Host: shop.test</code>.');
      const ck = lines.find((l) => /^cookie:/i.test(l.trim()));
      if (!ck) msgs.push('Add a <code>Cookie</code> header line.');
      else if (!/^Cookie:\s*sid=Zr81bQ0wPmA4$/i.test(ck.trim()) && !/(^|;\s*)sid=Zr81bQ0wPmA4(;|$)/.test(ck.split(':').slice(1).join(':').trim()))
        msgs.push('The cookie must be <code>sid=Zr81bQ0wPmA4</code>: only <code>name=value</code>. Attributes like <code>HttpOnly</code> or <code>Path</code> are never sent back.');
      else if (/HttpOnly|Path=|Secure|SameSite/i.test(ck)) msgs.push('Attributes (<code>HttpOnly</code>, <code>Path</code>, …) are instructions for the browser. They are not sent in the <code>Cookie</code> header.');
      if (lines.some((l) => /^set-cookie:/i.test(l.trim()))) msgs.push('<code>Set-Cookie</code> is a <b>response</b> header (server → browser). Requests use <code>Cookie</code>.');
      const r = $('#result');
      r.className = 'result ' + (msgs.length ? 'bad' : 'ok');
      r.innerHTML = msgs.length ? '❌ ' + msgs.join('<br>') : '✅ Yes! The server looks up <code>Zr81bQ0wPmA4</code> in its session store and finds bob.';
    };
  }
  const cookieExHtml = `
<div class="card">
  <h4>Earlier response from the server (after bob logged in)</h4>
  <pre class="seq-msg">HTTP/1.1 303 See Other
Location: /cart
Set-Cookie: sid=Zr81bQ0wPmA4; Path=/; HttpOnly; Secure; SameSite=Lax</pre>
  <h4 style="margin-top:8px">Now write bob’s next request so the server knows it’s him</h4>
  <textarea id="ans" class="code" rows="5"></textarea>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= authn-vs-authz =======================
  const authzSeq = W(`<div id="flow"></div>`, function () {
    const alice = Auth.b64('alice:wonder1and'), bob = Auth.b64('bob:b0bsecure');
    const users = { users: 'alice(role=user) bob(role=admin)' };
    const req = (cred) => 'GET /admin/reports HTTP/1.1\nHost: corp.test' + (cred ? '\nAuthorization: Basic ' + cred : '');
    Seq.mount('#flow', {
      title: 'GET /admin/reports: three different answers',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐' },
        { id: 's', label: 'corp.test', icon: '🖥', store: users, storeLabel: 'Server knows' },
      ],
      scenarios: [
        { name: '🚫 No credentials → 401', steps: [
          { from: 'b', to: 's', label: 'GET /admin/reports', msg: req(), note: 'No <code>Authorization</code> header, no cookie. The server has no idea who you are.' },
          { from: 's', to: 's', label: 'AuthN: who? unknown', note: '<b>Authentication</b> fails before we even get to authorization.' },
          { from: 's', to: 'b', kind: 'err', label: '401 + WWW-Authenticate', msg: 'HTTP/1.1 401 Unauthorized\nWWW-Authenticate: Basic realm="corp admin", charset="UTF-8"\nContent-Type: text/plain\n\nPlease log in.',
            hl: ['401 Unauthorized', 'WWW-Authenticate'],
            note: '401 says "authenticate first". The spec (RFC 9110) requires a <code>WWW-Authenticate</code> header telling the client <b>how</b>. Its name is historic: 401 really means <b>unauthenticated</b>.' },
        ] },
        { name: '⛔ Valid user, not allowed → 403', steps: [
          { from: 'b', to: 's', label: 'GET /admin/reports (alice)', msg: req(alice), hl: ['Authorization'], note: 'Alice sends correct credentials.' },
          { from: 's', to: 's', label: 'AuthN ✓ alice', note: 'Password matches: <b>authenticated</b> as alice.', set: { s: { 'request.user': 'alice' } } },
          { from: 's', to: 's', label: 'AuthZ ✗ role=user', note: '<b>Authorization</b>: the rule says /admin needs <code>role=admin</code>. Alice is a <code>user</code>.' },
          { from: 's', to: 'b', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\nContent-Type: text/plain\n\nYou do not have access to reports.',
            hl: ['403 Forbidden'], note: '403 = "I know who you are, and the answer is no." Logging in again won’t help, so there is no <code>WWW-Authenticate</code>.' },
        ] },
        { name: '✅ Admin → 200', steps: [
          { from: 'b', to: 's', label: 'GET /admin/reports (bob)', msg: req(bob), hl: ['Authorization'] },
          { from: 's', to: 's', label: 'AuthN ✓ bob', set: { s: { 'request.user': 'bob' } }, note: 'Authenticated as bob.' },
          { from: 's', to: 's', label: 'AuthZ ✓ role=admin', note: 'The policy allows admins.' },
          { from: 's', to: 'b', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\nCache-Control: private, no-store\n\n<h1>Q3 reports</h1>',
            note: 'Both checks passed. <code>Cache-Control: private, no-store</code> stops shared caches from keeping personal pages.' },
        ] },
      ],
    });
  });

  const bouncer = W(`
<div class="card">
  <h4>🚪 The two-gate bouncer</h4>
  <div class="row">
    <label>Who sends the request?
      <select id="who">
        <option value="anon">nobody logged in (no credentials)</option>
        <option value="bad">someone with a WRONG password</option>
        <option value="expired">alice with an EXPIRED session</option>
        <option value="alice" selected>alice (role: viewer)</option>
        <option value="erin">erin (role: editor)</option>
        <option value="bob">bob (role: admin)</option>
      </select></label>
    <label>Request
      <select id="res">
        <option value="pub">GET /blog (public)</option>
        <option value="me">GET /me (any logged-in user)</option>
        <option value="edit">PUT /posts/42 (editor or admin)</option>
        <option value="adm" selected>GET /admin (admin only)</option>
        <option value="notes">GET /users/bob/notes (owner only, hidden)</option>
      </select></label>
  </div>
</div>
<div class="grid2">
  <div class="card" id="g1"></div>
  <div class="card" id="g2"></div>
</div>
<div class="card" id="out"></div>
`, function () {
    const U = { alice: 'viewer', erin: 'editor', bob: 'admin' };
    const NEED = { pub: null, me: 'any', edit: ['editor', 'admin'], adm: ['admin'], notes: 'owner:bob' };
    function run() {
      const w = $('#who').value, r = $('#res').value, need = NEED[r];
      const authed = !!U[w];
      const ident = { anon: 'No credentials at all.', bad: 'Credentials present but the password is wrong.', expired: 'Session id not found in the store any more (expired).' }[w] ||
        'Credentials valid → identity = <b>' + w + '</b> (role ' + U[w] + ')';
      let code, text, why, g2;
      if (need === null) {
        g2 = 'Public page: no rule needed.'; code = 200; text = 'OK'; why = 'Anyone may read it.';
      } else if (!authed) {
        g2 = '<span class="muted">not reached</span>'; code = 401; text = 'Unauthorized';
        why = 'Gate 1 failed. 401 = "who are you? authenticate first". Must carry a <code>WWW-Authenticate</code> header (for browser apps, a redirect to /login is also common).';
      } else if (need === 'any') {
        g2 = 'Rule: any authenticated user → ✅'; code = 200; text = 'OK'; why = 'Both gates passed.';
      } else if (typeof need === 'string') {
        const ok = w === 'bob';
        g2 = 'Rule: only the owner (bob) → ' + (ok ? '✅' : '❌');
        code = ok ? 200 : 404; text = ok ? 'OK' : 'Not Found';
        why = ok ? 'Owner reads own notes.' : 'Not allowed. The app answers <b>404</b> instead of 403 so outsiders can’t even learn that bob’s notes exist.';
      } else {
        const ok = need.indexOf(U[w]) >= 0;
        g2 = 'Rule: role in [' + need.join(', ') + '] → ' + U[w] + ' ' + (ok ? '✅' : '❌');
        code = ok ? 200 : 403; text = ok ? 'OK' : 'Forbidden';
        why = ok ? 'Both gates passed.' : 'Gate 1 passed, gate 2 failed: we know who you are, you just may not do this → <b>403</b>.';
      }
      $('#g1').innerHTML = '<h4>Gate 1 · Authentication (AuthN)</h4><div class="muted">“Who are you? Prove it.”</div><p>' +
        (need === null ? '<span class="muted">skipped for public pages</span>' : (authed ? '✅ ' : '❌ ') + ident) + '</p>';
      $('#g2').innerHTML = '<h4>Gate 2 · Authorization (AuthZ)</h4><div class="muted">“Are you allowed to do this?”</div><p>' + g2 + '</p>';
      const cls = code === 200 ? 'ok' : code === 401 ? 'warnp' : 'bad';
      $('#out').innerHTML = '<span class="pill ' + cls + '" style="font-size:15px">HTTP/1.1 ' + code + ' ' + text + '</span>' +
        (code === 401 ? ' <code>WWW-Authenticate: Bearer realm="app"</code>' : '') + '<p style="margin:6px 0 0">' + why + '</p>';
    }
    $('#who').onchange = run;
    $('#res').onchange = run;
    run();
  });

  function statusExercise() {
    const ANS = ['401', '403', '401', '200', '404'];
    $$('select.q').forEach((s, i) => { s.value = CFG.fill ? ANS[i] : ''; });
    $('#check').onclick = () => {
      let good = 0;
      const notes = [
        'No credentials at all → authenticate first.',
        'Identity known, permission missing → forbidden.',
        'An expired token is not valid proof of identity → 401 (with WWW-Authenticate: Bearer error="invalid_token").',
        'Logged in and reading her own profile → OK.',
        'The app hides that the resource exists → 404.',
      ];
      $$('select.q').forEach((s, i) => {
        const ok = s.value === ANS[i];
        if (ok) good++;
        s.style.background = s.value ? (ok ? '#dcfce7' : '#fee2e2') : '';
        $$('.fb')[i].innerHTML = s.value && !ok ? '❌ ' + notes[i] : ok ? '✅' : '';
      });
      const r = $('#result');
      r.className = 'result ' + (good === 5 ? 'ok' : 'bad');
      r.innerHTML = good === 5 ? '✅ All 5 correct! You can tell authentication failures from authorization failures.' : '❌ ' + good + ' / 5 correct. Red ones need another look.';
    };
  }
  const statusExHtml = `
<div class="card">
  <h4>Pick the right status code for each situation</h4>
  <table class="t">
    <tr><th>#</th><th>Situation</th><th>Status</th><th></th></tr>
    <tr><td>1</td><td>API call <code>GET /api/settings</code> with no cookie and no Authorization header</td><td><select class="q"><option></option><option>200</option><option>401</option><option>403</option><option>404</option></select></td><td class="fb"></td></tr>
    <tr><td>2</td><td>Logged in as a <i>viewer</i>, sends <code>DELETE /projects/1</code> (admins only)</td><td><select class="q"><option></option><option>200</option><option>401</option><option>403</option><option>404</option></select></td><td class="fb"></td></tr>
    <tr><td>3</td><td><code>Authorization: Bearer …</code> with a token that expired yesterday</td><td><select class="q"><option></option><option>200</option><option>401</option><option>403</option><option>404</option></select></td><td class="fb"></td></tr>
    <tr><td>4</td><td>alice, logged in, <code>GET /users/alice/profile</code></td><td><select class="q"><option></option><option>200</option><option>401</option><option>403</option><option>404</option></select></td><td class="fb"></td></tr>
    <tr><td>5</td><td>alice requests bob’s private doc; the app must not reveal that it exists</td><td><select class="q"><option></option><option>200</option><option>401</option><option>403</option><option>404</option></select></td><td class="fb"></td></tr>
  </table>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= https-tls =======================
  const sniffer = W(`
<div class="grid2 tight">
  <div class="card">
    <h4>☕ Café Wi-Fi: someone at the next table runs a packet sniffer</h4>
    <div class="row"><label>username <input id="u" value="alice" style="width:120px"></label></div>
    <div class="row"><label>password <input id="p" value="Sunshine!2026" style="width:140px"></label></div>
    <div class="row"><button id="go" class="primary">Rebuild &amp; play ▶</button></div>
    <div class="muted">Then switch the tabs below: 🔓 HTTP vs 🔒 HTTPS vs ✏️ tampering. Watch the attacker’s notebook.</div>
  </div>
  <div id="seen" class="card" style="font-size:12px"></div>
</div>
<div id="flow" class="tight"></div>
`, function () {
    function cipher(seed, n) {
      let out = '', h = seed;
      while (out.length < n * 2) { h = Auth.sha256hex(h); out += h; }
      return out.slice(0, n * 2).replace(/(..)/g, '$1 ').trim();
    }
    function build(play) {
      const u = $('#u').value, p = $('#p').value;
      const body = new URLSearchParams([['username', u], ['password', p]]).toString();
      const req = ['POST /login HTTP/1.1', 'Host: shop.test', 'Content-Type: application/x-www-form-urlencoded',
        'Content-Length: ' + body.length, 'Cookie: cart=3', '', body].join('\n');
      const res = 'HTTP/1.1 303 See Other\nLocation: /account\nSet-Cookie: sid=Q7mZ2xV9rT; HttpOnly; Path=/';
      const len = req.length + 22;
      const rec = (seed, n) => '# what the sniffer captures (TLS record)\n' +
        '# 203.0.113.7:51544 → 198.51.100.20:443 (TCP)\n' +
        '17 03 03 ' + ('0' + (n >> 8).toString(16)).slice(-2) + ' ' + ('0' + (n & 255).toString(16)).slice(-2) +
        '   # type=application_data, length=' + n + '\n' + cipher(seed, 48) + ' …';
      const pwEnc = new URLSearchParams([['x', p]]).toString().slice(2);
      const http = [
        { from: 'b', to: 'w', label: 'POST /login (plain HTTP)', msg: req, hl: ['password=' + pwEnc, 'Cookie'],
          note: 'Over <code>http://</code> the request is plain text. Every device it passes through can read it.' },
        { from: 'w', to: 'w', label: 'sniff', msg: '# attacker’s capture\nPOST /login HTTP/1.1\n... password=' + pwEnc, hl: [pwEnc],
          note: '🕵 The attacker sees the method, path, headers, cookies and the password. Nothing to crack.',
          set: { w: { stolen: u + ' / ' + p } } },
        { from: 'w', to: 's', label: 'forward', msg: req },
        { from: 's', to: 'w', kind: 'res', label: '303 + Set-Cookie', msg: res, hl: ['Set-Cookie'] },
        { from: 'w', to: 'w', label: 'sniff', note: 'The session cookie is captured too: the attacker can now act as ' + esc(u) + ' even without the password.',
          set: { w: { 'stolen cookie': 'sid=Q7mZ2xV9rT' } } },
        { from: 'w', to: 'b', kind: 'res', label: '303 → /account', msg: res },
      ];
      const https = [
        { from: 'b', to: 'w', label: 'TLS ClientHello (SNI)', msg: '# readable part of the handshake\nTLS 1.3 ClientHello\nserver_name: shop.test\n# everything else after the handshake is encrypted',
          hl: ['shop.test'], note: 'Before any HTTP, browser and server do a TLS handshake (next example). The hostname in the SNI extension and the server IP are still visible (unless Encrypted Client Hello is used).' },
        { from: 'b', to: 'w', label: 'POST /login (encrypted)', msg: rec(req, len), hl: ['17 03 03'],
          note: 'The same HTTP request, now inside an encrypted TLS record. The path, headers, cookies and password are all hidden.' },
        { from: 'w', to: 'w', label: 'sniff', note: '🕵 The attacker learns only: <b>who</b> talks to <b>which server</b> (IP, hostname), <b>when</b>, and roughly <b>how many bytes</b>.',
          set: { w: { learned: 'alice’s laptop → shop.test, ~' + len + ' bytes' } } },
        { from: 'w', to: 's', label: 'forward ciphertext', msg: rec(req, len) },
        { from: 's', to: 's', label: 'decrypt', msg: req, hl: ['password=' + pwEnc], note: 'Only the real server (which has the session keys) gets the plain request back.' },
        { from: 's', to: 'b', kind: 'res', label: '303 (encrypted)', msg: rec(res, res.length + 22), note: 'The response and its <code>Set-Cookie</code> are encrypted as well.' },
      ];
      const tamper = [
        { from: 's', to: 'w', kind: 'res', label: '200 page (HTTP)', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form action="/login" method="post">…</form>',
          note: 'Encryption is not the only thing TLS gives you. Over plain HTTP, the attacker can also <b>change</b> traffic.' },
        { from: 'w', to: 'w', label: 'inject script', msg: '# attacker edits the page in flight\n<form action="/login" method="post">…</form>\n<script src="http://evil.test/keylogger.js"><\/script>',
          hl: ['evil.test'], note: 'A malicious hotspot rewrites the HTML before forwarding it.' },
        { from: 'w', to: 'b', kind: 'err', label: '200 page + evil script', msg: 'HTTP/1.1 200 OK\nContent-Type: text/html\n\n<form action="/login" method="post">…</form>\n<script src="http://evil.test/keylogger.js"><\/script>',
          note: 'The browser cannot tell. With HTTPS, any modified byte breaks the record’s authentication tag and the connection is aborted: TLS gives <b>integrity</b>.' },
      ];
      const s = Seq.mount('#flow', {
        actors: [
          { id: 'b', label: 'Your laptop', icon: '💻' },
          { id: 'w', label: 'Café Wi-Fi + sniffer', icon: '🕵', store: {}, storeLabel: 'Attacker’s notebook' },
          { id: 's', label: 'shop.test', icon: '🖥' },
        ],
        scenarios: [{ name: '🔓 http://', steps: http }, { name: '🔒 https://', steps: https }, { name: '✏️ http:// + tampering', steps: tamper }],
        onScenario(i) { table(i); },
      });
      table(0);
      if (play) s.play();
    }
    function table(i) {
      const rows = [
        ['Server IP & port', '✅', '✅'], ['Hostname (DNS / SNI)', '✅', '✅ (hidden only with ECH + encrypted DNS)'],
        ['Path & query (/login?…)', '✅', '❌'], ['Headers & cookies', '✅', '❌'], ['Password in the body', '✅', '❌'],
        ['Can modify the page', '✅', '❌ (detected, connection fails)'], ['Size & timing', '✅', '✅'],
      ];
      $('#seen').innerHTML = '<h4>What can the sniffer see?</h4><table class="t" style="font-size:12px"><tr><th></th><th' + (i !== 1 ? ' style="background:#fee2e2"' : '') +
        '>http://</th><th' + (i === 1 ? ' style="background:#dcfce7"' : '') + '>https://</th></tr>' +
        rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table>';
    }
    $('#go').onclick = () => build(true);
    build(false);
  });

  const tlsSeq = W(`<div id="flow"></div>`, function () {
    const cr = Auth.randHex(16), sr = Auth.randHex(16);
    const ch = ['ClientHello', 'legacy_version: 0x0303', 'random: ' + cr,
      'cipher_suites: TLS_AES_128_GCM_SHA256, TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256',
      'server_name: bank.test', 'supported_versions: TLS 1.3', 'supported_groups: X25519MLKEM768, x25519, secp256r1',
      'key_share: X25519MLKEM768 (client public key share)', 'alpn: h2, http/1.1'].join('\n');
    const sh = ['ServerHello', 'random: ' + sr, 'cipher_suite: TLS_AES_128_GCM_SHA256', 'supported_versions: TLS 1.3',
      'key_share: X25519MLKEM768 (server public key share)'].join('\n');
    const cert = (subj, issuer) => ['{Certificate}  # encrypted with handshake keys', 'subject: CN=' + subj,
      'subjectAltName: DNS:' + subj + ', DNS:www.' + subj, 'issuer: ' + issuer, 'validity: 2026-09-14 → 2026-12-13',
      'public key: ECDSA P-256', '# + intermediate certificate chain'].join('\n');
    const keys = { 'handshake keys': 'derived from both key shares' };
    Seq.mount('#flow', {
      title: 'TLS 1.3 handshake (simplified, RFC 8446)',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐', store: { 'trusted roots': 'ISRG Root X1, … (~150 CAs)' }, storeLabel: 'Browser' },
        { id: 'm', label: 'Network (café)', icon: '📶' },
        { id: 's', label: 'bank.test', icon: '🏦', store: { 'private key': '🔑 (never leaves server)' }, storeLabel: 'Server' },
      ],
      scenarios: [
        { name: '✅ Normal handshake', steps: [
          { from: 'b', to: 's', label: 'ClientHello', msg: ch, hl: ['server_name', 'key_share'],
            note: '"Hi, I speak TLS 1.3, here are my ciphers and my half of a key exchange." Sent in the clear.' },
          { from: 's', to: 'b', kind: 'res', label: 'ServerHello', msg: sh, hl: ['key_share'],
            note: 'The server picks a cipher and sends its key share. Now <b>both</b> sides can compute the same secret; an eavesdropper who saw both shares cannot.',
            set: { b: keys, s: keys } },
          { from: 's', to: 'b', kind: 'res', label: '{Certificate} {CertificateVerify}', msg: cert('bank.test', "CN=R12, O=Let's Encrypt") +
              '\n\n{CertificateVerify}\nsignature: ECDSA over the handshake transcript, using the private key', hl: ['subjectAltName', 'CertificateVerify'],
            note: 'From here on everything is encrypted (<code>{…}</code>). The certificate says "this public key belongs to bank.test", signed by a CA. CertificateVerify proves the server <b>holds the matching private key</b>.' },
          { from: 's', to: 'b', kind: 'res', label: '{Finished}', msg: '{Finished}\nverify_data: HMAC over the whole handshake transcript', note: 'A MAC over everything so far: any tampering with earlier messages would be detected.' },
          { from: 'b', to: 'b', label: 'verify certificate', note: 'Browser checks: ① name in <code>subjectAltName</code> matches <code>bank.test</code>, ② today is inside the validity dates, ③ the chain leads to a <b>trusted root CA</b>, ④ the CertificateVerify signature is valid.',
            set: { b: { cert: '✅ bank.test, trusted' } } },
          { from: 'b', to: 's', label: '{Finished}', msg: '{Finished}\nverify_data: …', note: 'Handshake done after <b>one round trip</b> (1-RTT). Both sides switch to application traffic keys.',
            set: { b: { 'traffic keys': 'ready' }, s: { 'traffic keys': 'ready' } } },
          { from: 'b', to: 's', label: '[GET /account] encrypted', msg: '[application_data]\nGET /account HTTP/1.1\nHost: bank.test\nCookie: sid=…', hl: ['Cookie'],
            note: 'Now normal HTTP flows inside the encrypted tunnel. That’s all HTTPS is: <b>HTTP over TLS</b>.' },
          { from: 's', to: 'b', kind: 'res', label: '[200 OK] encrypted', msg: '[application_data]\nHTTP/1.1 200 OK\nStrict-Transport-Security: max-age=31536000; includeSubDomains',
            hl: ['Strict-Transport-Security'], note: 'HSTS tells the browser: "for the next year, only ever talk to me over HTTPS" (see the third tab).' },
        ] },
        { name: '🕵 Fake server (MITM)', steps: [
          { from: 'b', to: 'm', label: 'ClientHello', msg: ch, note: 'The café router intercepts and pretends to be bank.test.' },
          { from: 'm', to: 'b', kind: 'res', label: 'ServerHello', msg: sh, note: 'The attacker can do a key exchange: that part needs no secret.' },
          { from: 'm', to: 'b', kind: 'res', label: '{Certificate}', msg: cert('bank.test', 'CN=bank.test (self-signed by attacker)'), hl: ['self-signed'],
            note: 'But the attacker doesn’t have bank.test’s private key, and no real CA will issue them a certificate for bank.test. So they send a self-made one…' },
          { from: 'b', to: 'b', label: 'verify certificate ✗', note: '…and the chain does not lead to any trusted root.', set: { b: { cert: '❌ untrusted issuer' } } },
          { from: 'b', to: 'm', kind: 'err', label: 'alert: bad_certificate', msg: 'TLS Alert: bad_certificate\n# browser shows: "Your connection is not private"\n# NET::ERR_CERT_AUTHORITY_INVALID', hl: ['ERR_CERT_AUTHORITY_INVALID'],
            note: 'The browser stops before sending any HTTP. <b>Never click through this warning</b> on a login page.' },
        ] },
        { name: '↩️ sslstrip vs HSTS', steps: [
          { from: 'b', to: 'm', label: 'GET http://bank.test/', msg: 'GET / HTTP/1.1\nHost: bank.test', note: 'User types <code>bank.test</code>. Without a scheme, the first request might go over plain HTTP.' },
          { from: 'm', to: 'b', kind: 'err', label: 'http:// page (stripped)', msg: 'HTTP/1.1 200 OK\n\n<form action="http://bank.test/login">', hl: ['http://bank.test/login'],
            note: 'sslstrip: the attacker talks HTTPS to the bank but keeps <b>you</b> on HTTP, rewriting links. Your password then goes over HTTP to them.' },
          { from: 'b', to: 'b', label: 'with HSTS: 307 Internal Redirect', msg: '307 Internal Redirect\nLocation: https://bank.test/\nNon-Authoritative-Reason: HSTS',
            note: 'If the browser has seen <code>Strict-Transport-Security</code> before (or bank.test is on the built-in <b>HSTS preload</b> list), it rewrites to https:// <b>before</b> sending anything.',
            set: { b: { HSTS: 'bank.test → https only' } } },
          { from: 'b', to: 's', label: 'ClientHello (https)', msg: ch, note: 'Straight to a real TLS handshake. Nothing is left to strip.' },
        ] },
      ],
    });
  });

  function certExercise() {
    const ANS = ['valid', 'name', 'expired', 'issuer', 'valid'];
    $$('select.q').forEach((s, i) => { s.value = CFG.fill ? ANS[i] : ''; });
    $('#check').onclick = () => {
      const why = ['SAN lists bank.test, dates OK, chain to a trusted root.', 'The certificate is for evil.test, not bank.test.', '“Not after” is in the past (today is 2026-10-31).',
        'Self-signed: no trusted CA vouches for it.', '*.bank.test covers exactly one extra label: login.bank.test ✓ (but not bank.test itself or a.b.bank.test).'];
      let good = 0;
      $$('select.q').forEach((s, i) => {
        const ok = s.value === ANS[i];
        if (ok) good++;
        s.style.background = s.value ? (ok ? '#dcfce7' : '#fee2e2') : '';
        $$('.fb')[i].textContent = s.value ? (ok ? '✅ ' : '❌ ') + why[i] : '';
      });
      const r = $('#result');
      r.className = 'result ' + (good === 5 ? 'ok' : 'bad');
      r.innerHTML = good === 5 ? '✅ 5 / 5. You check certificates like a browser does.' : '❌ ' + good + ' / 5 correct.';
    };
  }
  const opts = '<select class="q"><option></option><option value="valid">✅ valid</option><option value="name">❌ name mismatch</option><option value="expired">❌ expired</option><option value="issuer">❌ untrusted issuer</option></select>';
  const certExHtml = `
<div class="card">
  <h4>Today is 2026-10-31. Would the browser accept each certificate?</h4>
  <table class="t">
    <tr><th>#</th><th>You visit</th><th>Certificate</th><th>Verdict</th><th></th></tr>
    <tr><td>1</td><td><code>https://bank.test</code></td><td>SAN: bank.test, www.bank.test · issuer: Let’s Encrypt R12 → ISRG Root X1 · 2026-09-14 → 2026-12-13</td><td>${opts}</td><td class="fb"></td></tr>
    <tr><td>2</td><td><code>https://bank.test</code></td><td>SAN: evil.test · issuer: Let’s Encrypt R12 → ISRG Root X1 · 2026-10-01 → 2026-12-30</td><td>${opts}</td><td class="fb"></td></tr>
    <tr><td>3</td><td><code>https://bank.test</code></td><td>SAN: bank.test · issuer: DigiCert → trusted root · 2025-06-01 → 2026-06-01</td><td>${opts}</td><td class="fb"></td></tr>
    <tr><td>4</td><td><code>https://bank.test</code></td><td>SAN: bank.test · issuer: CN=bank.test (itself) · 2026-10-01 → 2027-10-01</td><td>${opts}</td><td class="fb"></td></tr>
    <tr><td>5</td><td><code>https://login.bank.test</code></td><td>SAN: *.bank.test · issuer: Sectigo → trusted root · 2026-08-01 → 2027-01-28</td><td>${opts}</td><td class="fb"></td></tr>
  </table>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= same-origin =======================
  const originCalc = W(`
<div class="card">
  <h4>🧮 Origin calculator</h4>
  <div class="row"><b style="width:30px">A</b><input id="a" class="code" style="flex:1" value="https://app.shop.test/cart?x=1"></div>
  <div class="row"><b style="width:30px">B</b><input id="b" class="code" style="flex:1" value="https://api.shop.test/me"></div>
  <div class="row muted">Presets:
    <button class="chip" data-a="https://shop.test/a" data-b="https://shop.test:443/b?q=1">default port</button>
    <button class="chip" data-a="https://shop.test/" data-b="http://shop.test/">http vs https</button>
    <button class="chip" data-a="https://app.shop.test/" data-b="https://api.shop.test/me">subdomains</button>
    <button class="chip" data-a="http://localhost:3000/" data-b="http://localhost:8080/api">dev ports</button>
    <button class="chip" data-a="https://shop.test/" data-b="https://evil.test/">other site</button>
    <button class="chip" data-a="https://alice.github.io/" data-b="https://mallory.github.io/">github.io</button>
  </div>
  <table class="t" id="tbl" style="margin-top:6px"></table>
  <div id="verdict" style="margin-top:8px"></div>
</div>
<div class="card" id="rules"></div>
`, function () {
    const PSL = ['github.io', 'co.uk', 'com.au', 'vercel.app'];
    const DEF = { 'http:': '80', 'https:': '443' };
    function site(host) {
      if (/^[\d.]+$/.test(host) || host === 'localhost') return host;
      const parts = host.split('.');
      for (const ps of PSL) if (host.endsWith('.' + ps)) return parts.slice(-(ps.split('.').length + 1)).join('.');
      return parts.slice(-2).join('.');
    }
    function run() {
      let A, B;
      try { A = new URL($('#a').value); B = new URL($('#b').value); } catch (e) { $('#verdict').innerHTML = '<span class="pill bad">invalid URL</span>'; return; }
      const pa = A.port || DEF[A.protocol], pb = B.port || DEF[B.protocol];
      const row = (name, x, y) => '<tr><th>' + name + '</th><td><code>' + esc(x) + '</code></td><td><code>' + esc(y) + '</code></td><td>' +
        (x === y ? '<span class="pill ok">same</span>' : '<span class="pill bad">different</span>') + '</td></tr>';
      $('#tbl').innerHTML = '<tr><th></th><th>A</th><th>B</th><th></th></tr>' + row('scheme', A.protocol.slice(0, -1), B.protocol.slice(0, -1)) +
        row('host', A.hostname, B.hostname) + row('port (effective)', pa, pb) +
        '<tr><th>origin</th><td><code>' + A.origin + '</code></td><td><code>' + B.origin + '</code></td><td></td></tr>' +
        '<tr><th class="muted">path / query</th><td class="muted" colspan="3">ignored for origins (' + esc(A.pathname + A.search) + ' vs ' + esc(B.pathname + B.search) + ')</td></tr>';
      const so = A.origin === B.origin;
      const ss = A.protocol === B.protocol && site(A.hostname) === site(B.hostname);
      $('#verdict').innerHTML = (so ? '<span class="pill ok">✅ same-origin</span>' : '<span class="pill bad">❌ cross-origin</span>') + ' &nbsp; ' +
        (ss ? '<span class="pill ok">same-site</span>' : '<span class="pill bad">cross-site</span>') +
        ' <span class="muted">site A = <code>' + A.protocol + '//' + site(A.hostname) + '</code>, site B = <code>' + B.protocol + '//' + site(B.hostname) + '</code></span>' +
        '<div class="muted" style="margin-top:4px">Origin = scheme + host + port, all three must match. <b>Site</b> = scheme + registrable domain (one label under a public suffix, from the Public Suffix List; this demo knows just a few). Cookies’ SameSite uses <i>site</i>; the Same-Origin Policy uses <i>origin</i>.</div>';
      const t = so ? 'same-origin' : 'cross-origin';
      $('#rules').innerHTML = '<h4>If a page on A talks to B (' + t + ')</h4><table class="t"><tr><th>Action from A’s JavaScript/HTML</th><th>Allowed?</th></tr>' +
        [['Embed B’s image, script, CSS, iframe', '✅ always (it can display, not read the bytes)'],
          ['Submit a &lt;form&gt; to B / navigate to B', '✅ always (the request is <b>sent</b>; this is why CSRF exists)'],
          ['fetch() to B and <b>read</b> the response', so ? '✅ same-origin' : '❌ blocked unless B replies with CORS headers'],
          ['Read the DOM of an iframe showing B', so ? '✅' : '❌ never'],
          ['Read B’s localStorage', so ? '✅ shared' : '❌ each origin has its own']]
          .map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('') + '</table>';
    }
    $$('#a, #b').forEach((i) => i.addEventListener('input', run));
    $$('[data-a]').forEach((b) => (b.onclick = () => { $('#a').value = b.dataset.a; $('#b').value = b.dataset.b; run(); }));
    run();
  });

  const corsSeq = W(`<div id="flow"></div>`, function () {
    const O = 'https://app.shop.test';
    const js = (code) => '// JavaScript running on ' + O + '\n' + code;
    const pre = 'OPTIONS /notes/7 HTTP/1.1\nHost: api.shop.test\nOrigin: ' + O + '\nAccess-Control-Request-Method: PUT\nAccess-Control-Request-Headers: content-type\nSec-Fetch-Mode: cors';
    const putReq = 'PUT /notes/7 HTTP/1.1\nHost: api.shop.test\nOrigin: ' + O + '\nCookie: sid=7fQ2mWk9\nContent-Type: application/json\n\n{"text":"buy oat milk"}';
    Seq.mount('#flow', {
      title: 'app.shop.test (JS) → api.shop.test',
      actors: [
        { id: 'j', label: 'Page JS', icon: '📜' },
        { id: 'b', label: 'Browser (CORS)', icon: '🌐', store: { 'cookie for api.shop.test': 'sid=7fQ2mWk9' }, storeLabel: 'Browser' },
        { id: 's', label: 'api.shop.test', icon: '🖥' },
      ],
      scenarios: [
        { name: '① Simple GET + credentials', steps: [
          { from: 'j', to: 'b', label: "fetch(url, {credentials:'include'})", msg: js("const r = await fetch('https://api.shop.test/me', {\n  credentials: 'include',\n});"),
            note: 'Different origin (host differs). A plain GET with no custom headers is a <b>simple request</b>: no preflight needed.' },
          { from: 'b', to: 's', label: 'GET /me + Origin + Cookie', msg: 'GET /me HTTP/1.1\nHost: api.shop.test\nOrigin: ' + O + '\nCookie: sid=7fQ2mWk9\nSec-Fetch-Site: same-site\nSec-Fetch-Mode: cors',
            hl: ['Origin', 'Cookie'], note: 'The browser adds <code>Origin</code> automatically. Because of <code>credentials: \'include\'</code> it also attaches cookies.' },
          { from: 's', to: 'b', kind: 'res', label: '200 + Access-Control-Allow-*', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nAccess-Control-Allow-Origin: ' + O + '\nAccess-Control-Allow-Credentials: true\nVary: Origin\n\n{"user":"alice"}',
            hl: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'], note: 'The server opts in: it names the exact origin and allows credentials. <code>Vary: Origin</code> keeps caches from mixing answers for different origins.' },
          { from: 'b', to: 'b', label: 'CORS check ✓', note: 'ACAO equals the page origin ✓ and ACAC is <code>true</code> ✓ (required because credentials were included).' },
          { from: 'b', to: 'j', kind: 'res', label: 'resolve(Response)', msg: '// r.status === 200\nawait r.json()  // → { user: "alice" }', note: 'Only now may the page’s JavaScript read the body.' },
        ] },
        { name: '② Preflight (PUT JSON)', steps: [
          { from: 'j', to: 'b', label: 'fetch PUT, JSON, credentials', msg: js("await fetch('https://api.shop.test/notes/7', {\n  method: 'PUT',\n  credentials: 'include',\n  headers: { 'Content-Type': 'application/json' },\n  body: JSON.stringify({ text: 'buy oat milk' }),\n});"),
            note: 'PUT is not a "simple" method and <code>application/json</code> is not a "simple" content type. Either one triggers a <b>preflight</b>.' },
          { from: 'b', to: 's', label: 'OPTIONS (preflight)', msg: pre, hl: ['OPTIONS', 'Access-Control-Request-Method', 'Access-Control-Request-Headers'],
            note: 'The browser asks permission first. The preflight <b>never carries cookies</b> and no body.' },
          { from: 's', to: 'b', kind: 'res', label: '204 + allow PUT, content-type', msg: 'HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: ' + O + '\nAccess-Control-Allow-Methods: GET, PUT, DELETE\nAccess-Control-Allow-Headers: Content-Type\nAccess-Control-Allow-Credentials: true\nAccess-Control-Max-Age: 600\nVary: Origin',
            hl: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Methods', 'Access-Control-Allow-Headers', 'Access-Control-Allow-Credentials', 'Access-Control-Max-Age'],
            note: '"Yes: that origin may PUT with a Content-Type header and credentials. Remember this for 600 s."' },
          { from: 'b', to: 'b', label: 'preflight check ✓', note: 'Origin ✓, method PUT listed ✓, header content-type listed ✓, credentials allowed ✓. Cached for 600 s.',
            set: { b: { 'preflight cache': 'PUT+content-type OK (600 s)' } } },
          { from: 'b', to: 's', label: 'PUT /notes/7 + Cookie', msg: putReq, hl: ['Cookie', 'Origin'], note: 'Now the real request goes out, with cookies.' },
          { from: 's', to: 'b', kind: 'res', label: '200 + ACAO + ACAC', msg: 'HTTP/1.1 200 OK\nContent-Type: application/json\nAccess-Control-Allow-Origin: ' + O + '\nAccess-Control-Allow-Credentials: true\nVary: Origin\n\n{"id":7,"text":"buy oat milk"}',
            hl: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials'], note: 'The actual response must <b>also</b> carry the CORS headers.' },
          { from: 'b', to: 'j', kind: 'res', label: 'resolve(Response)', msg: '// r.ok === true' },
        ] },
        { name: '③ ❌ ACAO: * with credentials', steps: [
          { from: 'j', to: 'b', label: 'fetch PUT, JSON, credentials', msg: js("await fetch('https://api.shop.test/notes/7', {\n  method: 'PUT', credentials: 'include',\n  headers: { 'Content-Type': 'application/json' }, body,\n});") },
          { from: 'b', to: 's', label: 'OPTIONS (preflight)', msg: pre, hl: ['OPTIONS'] },
          { from: 's', to: 'b', kind: 'res', label: '204 + ACAO: *', msg: 'HTTP/1.1 204 No Content\nAccess-Control-Allow-Origin: *\nAccess-Control-Allow-Methods: *\nAccess-Control-Allow-Headers: *',
            hl: ['Access-Control-Allow-Origin: *'], note: 'A lazy config: "everyone is welcome".' },
          { from: 'b', to: 'b', label: 'preflight check ✗', msg: "# Chrome DevTools console\nAccess to fetch at 'https://api.shop.test/notes/7' from origin\n'https://app.shop.test' has been blocked by CORS policy: The value of the\n'Access-Control-Allow-Origin' header in the response must not be the wildcard '*'\nwhen the request's credentials mode is 'include'.",
            note: 'With credentials, <code>*</code> is <b>not allowed</b> (and <code>*</code> in Allow-Methods/Headers is treated literally). The server must echo the exact origin and send <code>Access-Control-Allow-Credentials: true</code>.' },
          { from: 'b', to: 'j', kind: 'err', label: 'reject(TypeError)', msg: 'TypeError: Failed to fetch', note: 'The actual PUT is <b>never sent</b>. The page only gets a generic error: it can’t tell why.' },
        ] },
        { name: '④ ⚠️ No CORS headers: sent anyway', steps: [
          { from: 'j', to: 'b', label: 'fetch POST form-encoded', msg: js("await fetch('https://api.shop.test/notes', {\n  method: 'POST', credentials: 'include',\n  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },\n  body: 'text=spam',\n});"),
            note: 'POST with a form content type is a <b>simple</b> request (same as an HTML form could send). No preflight!' },
          { from: 'b', to: 's', label: 'POST /notes + Cookie', msg: 'POST /notes HTTP/1.1\nHost: api.shop.test\nOrigin: ' + O + '\nCookie: sid=7fQ2mWk9\nContent-Type: application/x-www-form-urlencoded\n\ntext=spam', hl: ['Cookie'] },
          { from: 's', to: 's', label: 'creates the note!', note: 'The server processes it: the note is created.' },
          { from: 's', to: 'b', kind: 'res', label: '201 (no ACAO)', msg: 'HTTP/1.1 201 Created\nContent-Type: application/json\n\n{"id":8}' },
          { from: 'b', to: 'j', kind: 'err', label: 'reject(TypeError)', msg: 'TypeError: Failed to fetch\n# "No \'Access-Control-Allow-Origin\' header is present"',
            note: 'CORS only stopped the page from <b>reading</b> the response. The side effect already happened. <b>CORS is not CSRF protection</b> (lesson 2.4).' },
        ] },
      ],
    });
  });

  function corsExercise() {
    $('#ans').value = CFG.value;
    $('#check').onclick = () => {
      const h = {};
      $('#ans').value.split('\n').forEach((l) => { const m = /^\s*([A-Za-z-]+)\s*:\s*(.*?)\s*$/.exec(l); if (m) h[m[1].toLowerCase()] = m[2]; });
      const msgs = [];
      const acao = h['access-control-allow-origin'];
      if (!acao) msgs.push('Missing <code>Access-Control-Allow-Origin</code>.');
      else if (acao === '*') msgs.push('<code>*</code> is not allowed when the request uses credentials. Echo the exact origin.');
      else if (acao !== 'https://app.shop.test') msgs.push('ACAO must exactly equal the page origin <code>https://app.shop.test</code> (scheme + host, no path, no trailing slash). You wrote <code>' + esc(acao) + '</code>.');
      if ((h['access-control-allow-credentials'] || '') !== 'true') msgs.push('Add <code>Access-Control-Allow-Credentials: true</code> (lowercase <code>true</code>), otherwise cookies can’t be used.');
      const meth = (h['access-control-allow-methods'] || '').toUpperCase().split(/\s*,\s*/);
      if (meth.indexOf('DELETE') < 0) msgs.push('<code>Access-Control-Allow-Methods</code> must list <code>DELETE</code>.');
      const hd = (h['access-control-allow-headers'] || '').toLowerCase().split(/\s*,\s*/);
      if (hd.indexOf('x-csrf-token') < 0) msgs.push('<code>Access-Control-Allow-Headers</code> must list <code>X-CSRF-Token</code> (the custom header the page sends).');
      const r = $('#result');
      r.className = 'result ' + (msgs.length ? 'bad' : 'ok');
      r.innerHTML = msgs.length ? '❌ ' + msgs.join('<br>') : '✅ The browser accepts this preflight and sends the DELETE with cookies.';
    };
  }
  const corsExHtml = `
<div class="card">
  <h4>The browser sent this preflight</h4>
  <pre class="seq-msg">OPTIONS /notes/7 HTTP/1.1
Host: api.shop.test
Origin: https://app.shop.test
Access-Control-Request-Method: DELETE
Access-Control-Request-Headers: x-csrf-token</pre>
  <div class="muted">The page calls <code>fetch(url, { method: 'DELETE', credentials: 'include', headers: { 'X-CSRF-Token': t } })</code>.
    Write the CORS headers of the server’s <code>204 No Content</code> reply (one per line) so the request is allowed.</div>
  <textarea id="ans" class="code" rows="6" style="margin-top:6px"></textarea>
  <div class="row"><button id="check" class="primary">Check</button></div>
  <div id="result" class="result"></div>
</div>`;

  // ======================= LESSONS =======================
  const S = '1 · Web Foundations';
  window.LESSONS.push(
    {
      id: 'html-forms',
      section: S,
      title: 'HTML forms: what really gets sent',
      explain: `
<p>Every login you have ever done starts with an <strong>HTML form</strong>. HTML is the language web pages are written in: tags like <code>&lt;input&gt;</code> and <code>&lt;button&gt;</code> describe what appears on screen. A form groups inputs and says <em>where</em> and <em>how</em> to send them.</p>
<pre><code class="language-html">&lt;form action="/login" method="post"&gt;
  &lt;input name="username"&gt;
  &lt;input type="password" name="password"&gt;
  &lt;button&gt;Log in&lt;/button&gt;
&lt;/form&gt;</code></pre>
<ul>
  <li><code>action</code> = the URL to send to. <code>method</code> = <code>get</code> or <code>post</code>.</li>
  <li>Each input’s <code>name</code> becomes the <strong>key</strong>, what the user typed becomes the <strong>value</strong>. No <code>name</code> → not sent at all.</li>
  <li>The browser joins them into <code>username=alice&amp;password=s3cret</code>. This format is called <code>application/x-www-form-urlencoded</code>.</li>
</ul>
<h3>GET vs POST</h3>
<p>With <strong>GET</strong> the pairs are glued onto the URL after a <code>?</code> (the <em>query string</em>). With <strong>POST</strong> they travel in the request <em>body</em>, below the headers. For anything secret, always use POST: URLs are stored in browser history, server logs and leak to other sites through the <code>Referer</code> header.</p>
<h3>URL encoding</h3>
<p>Since <code>&amp;</code> and <code>=</code> are separators, they can’t appear raw inside a value. The browser <em>percent-encodes</em> special characters: <code>&amp;</code> → <code>%26</code>, <code>@</code> → <code>%40</code>, space → <code>+</code>. Think of it as packing fragile items in bubble wrap. The server unwraps them.</p>
<div class="warn"><code>type="password"</code> only shows dots on <em>your screen</em>. On the network the password is plain text. Only HTTPS (lesson 1.5) protects it in transit.</div>
<div class="tip">Click <b>Log in</b> in the demo below and step through the request. Switch GET/POST and the enctype to compare.</div>
`,
      examples: [
        {
          title: 'Live form → the exact HTTP request',
          code: formLab,
          explain: `
<details><summary>What to try</summary>
<ol>
  <li>Click <b>Log in</b> with POST: step 2 shows the body <code>username=alice&amp;password=s3cret+pa%24%24&amp;remember=yes&amp;next=%2Fdashboard</code>. The space became <code>+</code>, <code>$</code> became <code>%24</code>.</li>
  <li>Untick <b>Remember me</b>: the <code>remember</code> pair disappears completely (it is not sent as <code>remember=no</code>).</li>
  <li>Switch to <b>GET</b>: the pairs move into the URL and the address bar card warns you the password is now visible.</li>
  <li>Choose <b>multipart/form-data</b>: each field becomes a separate part between boundary lines (used for file uploads).</li>
</ol></details>`,
        },
        { title: 'URL-encoding explorer', code: encLab },
      ],
      quiz: [
        { q: 'Which attribute decides the key in <code>key=value</code> when a form is sent?', options: ['<code>id</code>', '<code>name</code>', '<code>type</code>', '<code>placeholder</code>'], answer: 1, why: 'Only the <code>name</code> attribute matters. Inputs without a name are not sent.' },
        { q: 'What does <code>&lt;input type="password"&gt;</code> do to the data sent over the network?', options: ['Encrypts it', 'Hashes it', 'Nothing: it only hides characters on screen', 'Base64-encodes it'], answer: 2, why: 'The field just masks the characters visually. Protection on the wire comes from HTTPS.' },
        { q: 'Why should a login form use POST instead of GET?', options: ['POST is encrypted', 'GET puts the password in the URL, which ends up in history, logs and Referer headers', 'GET cannot send text', 'POST is faster'], answer: 1, why: 'Neither is encrypted by itself. GET just puts the values somewhere that gets copied and logged everywhere.' },
        { q: 'How is the value <code>a b&amp;c</code> written in a form-urlencoded body?', options: ['<code>a b&amp;c</code>', '<code>a+b%26c</code>', '<code>a%2Bb&amp;c</code>', '<code>YSBiJmM=</code>'], answer: 1, why: 'Space → <code>+</code>, <code>&amp;</code> → <code>%26</code> so it isn’t mistaken for a field separator.' },
        { q: 'An unchecked <code>&lt;input type="checkbox" name="remember"&gt;</code> is sent as…', options: ['<code>remember=off</code>', '<code>remember=</code>', '<code>remember=false</code>', 'Nothing: it is left out'], answer: 3, why: 'Unchecked checkboxes are skipped entirely. Servers treat "missing" as unchecked.' },
      ],
      exercise: {
        task: `<p>A user enters username <code>bob smith</code> and password <code>p@ss&amp;word!</code>. Type the exact <code>application/x-www-form-urlencoded</code> body the browser sends in the box below and click <b>Check</b>. The starter is what a beginner might write: see how the server misreads it.</p>`,
        starter: W(formExHtml, formExercise, { value: 'username=bob smith&password=p@ss&word!' }),
        hint: 'Separate fields with <code>&amp;</code>. Inside values: space → <code>+</code>, <code>@</code> → <code>%40</code>, <code>&amp;</code> → <code>%26</code>, <code>!</code> → <code>%21</code>.',
        solution: W(formExHtml, formExercise, { value: 'username=bob+smith&password=p%40ss%26word%21' }),
      },
    },
    {
      id: 'http-anatomy',
      section: S,
      title: 'Anatomy of an HTTP request & response',
      explain: `
<p>When the browser sends a form (or loads any page), it speaks <strong>HTTP</strong>: a plain-text conversation of one <em>request</em> and one <em>response</em>. Like a letter: an address line, some labelled details, an empty line, then the content.</p>
<pre><code class="language-http">POST /api/notes HTTP/1.1          ← request line: METHOD  path  version
Host: notes.test                  ← headers: Name: value
Authorization: Bearer tok-alice
Content-Type: application/json
                                  ← empty line = "headers are over"
{"text": "hi"}                    ← body (optional)</code></pre>
<pre><code class="language-http">HTTP/1.1 201 Created              ← status line: version  code  reason
Location: /api/notes/8
Content-Type: application/json

{"id": 8, "text": "hi"}</code></pre>
<h3>Methods</h3>
<p><code>GET</code> read · <code>POST</code> create / submit · <code>PUT</code> replace · <code>PATCH</code> modify · <code>DELETE</code> remove · <code>OPTIONS</code> ask what’s allowed (used by CORS). GET must not change anything on the server.</p>
<h3>Headers that matter for auth</h3>
<ul>
  <li><code>Host</code>: which website (required in HTTP/1.1, many sites share one IP).</li>
  <li><code>Authorization</code>: credentials or a token. <code>Cookie</code> / <code>Set-Cookie</code>: the browser’s automatic memory.</li>
  <li><code>WWW-Authenticate</code>: the server’s “here’s how to log in” on a 401.</li>
  <li><code>Location</code>: where to go on a 3xx redirect.</li>
</ul>
<h3>Status code classes</h3>
<table><tr><th>Class</th><th>Meaning</th><th>Examples</th></tr>
<tr><td>1xx</td><td>Informational</td><td>101</td></tr>
<tr><td>2xx</td><td>Success</td><td>200, 201, 204</td></tr>
<tr><td>3xx</td><td>Go elsewhere</td><td>301, 302, 303, 307, 308</td></tr>
<tr><td>4xx</td><td>You (the client) did something wrong</td><td>400, 401, 403, 404, 429</td></tr>
<tr><td>5xx</td><td>The server failed</td><td>500, 502, 503</td></tr></table>
<div class="tip">HTTP/2 and HTTP/3 send the same information in a compact binary form, but the methods, headers and status codes are identical. Browsers’ DevTools (Network tab) show them in this readable text style.</div>
`,
      examples: [
        { title: 'Request builder → animated round trip', code: builder },
        { title: 'Status code explorer', code: statusGrid },
      ],
      quiz: [
        { q: 'What separates the headers from the body?', options: ['A semicolon', 'An empty line', 'The <code>Content-Length</code> header', 'A closing tag'], answer: 1, why: 'One empty line (CRLF CRLF) marks the end of headers. <code>Content-Length</code> then says how long the body is.' },
        { q: 'Which header is required in every HTTP/1.1 request?', options: ['<code>Accept</code>', '<code>Cookie</code>', '<code>Host</code>', '<code>Authorization</code>'], answer: 2, why: 'Many sites share one IP address, so the server needs <code>Host</code> to know which site you want.' },
        { q: 'A server returns <code>201 Created</code>. Which class is that?', options: ['Informational', 'Success', 'Redirection', 'Client error'], answer: 1, why: 'Any 2xx is success; 201 also usually carries a <code>Location</code> header.' },
        { q: 'You get <code>500 Internal Server Error</code>. Whose fault is it, per HTTP?', options: ['The client’s', 'The server’s', 'The network’s', 'The user’s password'], answer: 1, why: '5xx means the server failed. 4xx means the request was wrong.' },
        { q: 'Which response header must accompany a 3xx redirect so the browser knows where to go?', options: ['<code>Location</code>', '<code>Referer</code>', '<code>Host</code>', '<code>Redirect-To</code>'], answer: 0, why: '<code>Location</code> holds the target URL. (<code>Referer</code> is a request header, famously misspelled.)' },
      ],
      exercise: {
        task: `<p>Write a complete raw HTTP request in the box below and click <b>Check</b>: alice (token <code>tok-alice</code>) creates a note with the text <code>hi</code> by POSTing JSON to <code>https://notes.test/api/notes</code>.</p>`,
        starter: W(rawReqHtml, rawReqExercise, { value: 'POST /api/notes\nAuthorization: tok-alice\n{"text": "hi"}' }),
        hint: 'Line 1: <code>POST /api/notes HTTP/1.1</code>. Then <code>Host</code>, <code>Authorization: Bearer …</code>, <code>Content-Type</code>, an empty line, then the JSON.',
        solution: W(rawReqHtml, rawReqExercise, { value: 'POST /api/notes HTTP/1.1\nHost: notes.test\nAuthorization: Bearer tok-alice\nContent-Type: application/json\n\n{"text": "hi"}' }),
      },
    },
    {
      id: 'stateless',
      section: S,
      title: 'HTTP is stateless: why login is hard',
      explain: `
<p>Imagine a receptionist with the memory of a goldfish. You introduce yourself, show your ID, get a smile… and ten seconds later, when you ask for your room key, they ask “who are you?” again. That is an HTTP server.</p>
<p><strong>Stateless</strong> means each request is handled on its own. The protocol has no built-in idea of “the same visitor as before”. The TCP connection doesn’t help either: browsers open and close connections freely, and proxies mix many users on one connection. Your IP address doesn’t identify you: a whole café can share one IP.</p>
<h3>So how can anyone stay logged in?</h3>
<p>The only way: <strong>something must be sent with every single request</strong> that proves who you are. The two big options:</p>
<ul>
  <li><strong>A cookie</strong>: after login the server answers <code>Set-Cookie: sid=k3Jx…</code>. The browser stores it and from then on attaches <code>Cookie: sid=k3Jx…</code> automatically to every request to that site. The server looks the id up in its <em>session store</em>. (Section 2.)</li>
  <li><strong>An <code>Authorization</code> header</strong>: the client attaches credentials or a token itself, e.g. <code>Authorization: Bearer eyJ…</code>. Common for APIs and mobile apps. (Sections 3–5.)</li>
</ul>
<pre><code class="language-http">HTTP/1.1 303 See Other
Set-Cookie: sid=k3Jx9QpL2vTn; HttpOnly; Secure; SameSite=Lax; Path=/

GET /cart HTTP/1.1
Cookie: sid=k3Jx9QpL2vTn</code></pre>
<div class="tip">Every auth system in this course is an answer to one question: <em>what do we attach to each request, and how does the server trust it?</em></div>
`,
      examples: [
        { title: 'The goldfish server: three strategies', code: statelessSeq },
        { title: 'Send requests, read the server log', code: goldfish },
      ],
      quiz: [
        { q: '“HTTP is stateless” means…', options: ['HTTP can’t carry data', 'Each request is processed independently; the protocol doesn’t remember earlier requests', 'Servers can’t have databases', 'Cookies are forbidden'], answer: 1, why: 'Servers can store state (databases, sessions); the protocol itself just doesn’t link requests together.' },
        { q: 'Which of these is NOT a reliable way to recognise a logged-in user?', options: ['A session cookie', 'An Authorization header with a token', 'The client’s IP address', 'A signed token in a header'], answer: 2, why: 'Many users share an IP (NAT, café, office) and one user’s IP changes often.' },
        { q: 'After <code>Set-Cookie: sid=abc</code>, who attaches <code>Cookie: sid=abc</code> to the next requests?', options: ['The page’s JavaScript must add it', 'The browser, automatically', 'The server copies it', 'Nobody, it’s only stored'], answer: 1, why: 'The browser’s cookie jar adds matching cookies to every request automatically. That convenience is also why CSRF exists (lesson 2.4).' },
        { q: 'Why is re-sending the password on every request worse than a session id?', options: ['It isn’t worse', 'The real password is exposed on every request and must be kept by the client; you can’t revoke it without changing it', 'Passwords are too long for headers', 'Servers can’t check passwords twice'], answer: 1, why: 'A random session id can be revoked (logout) and is useless elsewhere; the password is your master key.' },
      ],
      exercise: {
        task: `<p>Bob just logged in and got a <code>Set-Cookie</code>. Write his next request for <code>/cart</code> so the server recognises him, in the box below, and click <b>Check</b>.</p>`,
        starter: W(cookieExHtml, cookieExercise, { value: 'GET /cart HTTP/1.1\nHost: shop.test\n' }),
        hint: 'Requests use the <code>Cookie</code> header, with only <code>name=value</code>.',
        solution: W(cookieExHtml, cookieExercise, { value: 'GET /cart HTTP/1.1\nHost: shop.test\nCookie: sid=Zr81bQ0wPmA4' }),
      },
    },
    {
      id: 'authn-vs-authz',
      section: S,
      title: 'AuthN vs AuthZ, 401 vs 403',
      explain: `
<p>Two words that sound alike and get mixed up all the time:</p>
<ul>
  <li><strong>Authentication (AuthN)</strong>: <em>Who are you?</em> Proving an identity. Like showing your passport at the airport.</li>
  <li><strong>Authorization (AuthZ)</strong>: <em>What may you do?</em> Checking permissions. Like your boarding pass deciding which plane you may board.</li>
</ul>
<p>AuthN always comes first: you can’t decide what someone may do until you know who they are. (Public pages skip both.)</p>
<h3>Identity, credentials, factors</h3>
<p>An <strong>identity</strong> is an account (alice). <strong>Credentials</strong> are the evidence you present (a password, a code, a key). Evidence comes in three kinds, called <strong>factors</strong>:</p>
<table><tr><th>Factor</th><th>Examples</th></tr>
<tr><td>🧠 Something you <b>know</b></td><td>password, PIN, security question</td></tr>
<tr><td>📱 Something you <b>have</b></td><td>phone with an authenticator app, security key, passkey on your device</td></tr>
<tr><td>👆 Something you <b>are</b></td><td>fingerprint, face</td></tr></table>
<p><strong>Multi-factor</strong> authentication (MFA) means factors of <em>different kinds</em>. Password + security question is still one factor (both “know”).</p>
<h3>401 vs 403</h3>
<pre><code class="language-http">HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api"

HTTP/1.1 403 Forbidden</code></pre>
<ul>
  <li><strong>401</strong> = authentication missing or failed. Despite the name, it means <em>un-authenticated</em>. It must include <code>WWW-Authenticate</code> describing how to authenticate (RFC 9110).</li>
  <li><strong>403</strong> = the server knows who you are (or it doesn’t matter) and the answer is still no. Retrying with the same login won’t help.</li>
  <li><strong>404</strong> is sometimes used instead of 403 to avoid revealing that something exists.</li>
</ul>
<div class="warn">Web apps with login forms often answer “not logged in” with a <code>302</code>/<code>303</code> redirect to <code>/login</code> instead of a 401, because browsers show an ugly native dialog for <code>WWW-Authenticate: Basic</code>. APIs should use proper 401s.</div>
`,
      examples: [
        { title: 'Three requests, three answers', code: authzSeq },
        { title: 'The two-gate bouncer', code: bouncer },
      ],
      quiz: [
        { q: 'Authentication answers which question?', options: ['What may you do?', 'Who are you?', 'Where are you?', 'How fast are you?'], answer: 1, why: 'AuthN = identity. AuthZ = permissions.' },
        { q: 'alice is logged in but opens <code>/admin</code>, which only admins may see. Best status?', options: ['401', '403', '500', '302'], answer: 1, why: 'Her identity is known; permission is missing → 403 Forbidden.' },
        { q: 'Which header must a 401 response include?', options: ['<code>Location</code>', '<code>WWW-Authenticate</code>', '<code>Set-Cookie</code>', '<code>Authorization</code>'], answer: 1, why: 'RFC 9110 requires <code>WWW-Authenticate</code> with at least one challenge (e.g. <code>Basic</code>, <code>Bearer</code>).' },
        { q: 'Password + a 6-digit code from an authenticator app is…', options: ['One factor (both are codes)', 'Two factors: know + have', 'Two factors: know + are', 'Three factors'], answer: 1, why: 'The code proves you possess the phone holding the secret → “have”.' },
        { q: 'Password + “name of your first pet” is…', options: ['Two-factor auth', 'Single-factor: both are something you know', 'Biometric', 'Passwordless'], answer: 1, why: 'MFA needs factors of different kinds.' },
      ],
      exercise: {
        task: `<p>For each situation in the box below, pick the status code a well-behaved API should return, then click <b>Check</b>.</p>`,
        starter: W(statusExHtml, statusExercise, { fill: false }),
        hint: 'Ask in order: do we know who it is? (no → 401) Are they allowed? (no → 403, or 404 if existence must stay secret).',
        solution: W(statusExHtml, statusExercise, { fill: true }),
      },
    },
    {
      id: 'https-tls',
      section: S,
      title: 'HTTPS & TLS: why credentials need it',
      explain: `
<p>An HTTP request travels through many machines: your Wi-Fi router, your internet provider, several routers on the way. With plain <code>http://</code> each of them can <strong>read</strong> it (passwords, cookies) and even <strong>change</strong> it (inject a script). On public Wi-Fi, “each of them” includes the stranger at the next table.</p>
<p><strong>HTTPS</strong> = HTTP inside a <strong>TLS</strong> tunnel. TLS (Transport Layer Security, current version 1.3) gives three guarantees:</p>
<ul>
  <li><strong>Confidentiality</strong>: traffic is encrypted; only the two ends can read it.</li>
  <li><strong>Integrity</strong>: any modification is detected and the connection is dropped.</li>
  <li><strong>Server authentication</strong>: you are really talking to <code>bank.test</code>, not an impostor.</li>
</ul>
<h3>Certificates and CAs, in one paragraph</h3>
<p>A <strong>certificate</strong> is a small document saying “this public key belongs to <code>bank.test</code>”, signed by a <strong>Certificate Authority</strong> (CA) such as Let’s Encrypt. Your browser ships with a list of ~150 trusted root CAs. During the handshake the server shows its certificate and proves it holds the matching private key. The browser checks the name, the dates and the signature chain. An attacker can copy the certificate (it’s public) but not the private key, so they can’t pass the check.</p>
<h3>HSTS</h3>
<p>The very first <code>http://</code> request can still be intercepted (an attack called <em>sslstrip</em>). Sites fix this with <code>Strict-Transport-Security: max-age=31536000; includeSubDomains</code>: once seen, the browser refuses plain HTTP for that site. The HSTS <em>preload list</em> built into browsers covers even the first visit.</p>
<div class="warn">HTTPS hides the <em>content</em> (path, headers, cookies, body), not the fact that you talk to <code>bank.test</code>: the IP address and usually the hostname (SNI) stay visible.</div>
<div class="tip">Every auth mechanism in this course assumes HTTPS. Without it, a password, a session cookie and a bearer token are all equally easy to steal.</div>
`,
      examples: [
        { title: 'Café Wi-Fi sniffer: HTTP vs HTTPS', code: sniffer },
        {
          title: 'TLS 1.3 handshake, step by step',
          code: tlsSeq,
          explain: `
<details><summary>The problem: agreeing on a secret while everyone listens</summary>
<p>Browser and server have never met. Anything they send first is visible to the café sniffer. They need to (1) agree on encryption keys that the sniffer can’t compute, and (2) make sure the other side is the real <code>bank.test</code>. TLS 1.3 does both in <b>one round trip</b>.</p>
</details>
<details><summary>Step by step: the “✅ Normal handshake” tab</summary>
<table>
<tr><th>Step</th><th>Message</th><th>Readable by sniffer?</th><th>What it achieves</th></tr>
<tr><td>1</td><td>ClientHello</td><td>yes</td><td>versions, ciphers, hostname (<code>server_name</code>), the client’s <code>key_share</code></td></tr>
<tr><td>2</td><td>ServerHello</td><td>yes</td><td>chosen cipher + server <code>key_share</code> → both derive the same <b>handshake keys</b> (state cards turn yellow)</td></tr>
<tr><td>3</td><td>{Certificate} {CertificateVerify}</td><td>no (encrypted)</td><td>“this key belongs to bank.test” + proof of holding the private key</td></tr>
<tr><td>4</td><td>{Finished} (server)</td><td>no</td><td>MAC over the whole transcript → tampering detected</td></tr>
<tr><td>5</td><td>verify certificate</td><td>–</td><td>name, dates, chain to trusted root, signature</td></tr>
<tr><td>6</td><td>{Finished} (client)</td><td>no</td><td>traffic keys ready</td></tr>
<tr><td>7–8</td><td>[application data]</td><td>no</td><td>normal HTTP, with an HSTS header in the response</td></tr>
</table>
<p>The key exchange (Diffie-Hellman; in 2026 browsers use the hybrid post-quantum group <code>X25519MLKEM768</code>) is the clever bit: each side sends a <em>public</em> share and keeps a private value; combining your private value with the other public share gives the same secret on both sides, but the two public shares alone don’t.</p>
</details>
<details><summary>Key ideas: why the MITM tab fails</summary>
<p>In “🕵 Fake server” the attacker can complete steps 1–2 (a key exchange needs no secret). But at step 3 they need a certificate for <code>bank.test</code> that chains to a trusted CA <b>and</b> the matching private key for CertificateVerify. They have neither, so the browser aborts with <code>NET::ERR_CERT_AUTHORITY_INVALID</code> before any HTTP (and any password) is sent.</p>
</details>
<details><summary>Try this</summary>
<ul>
  <li>In the first tab, click step 3 and read the <code>subjectAltName</code>: that is the name the browser compares to the address bar.</li>
  <li>Switch to “↩️ sslstrip vs HSTS” and compare step 2 (attack) with step 3 (what HSTS makes the browser do instead).</li>
  <li>In the sniffer example above, open the 🔒 tab and click step 2: the HTTP request is now just <code>17 03 03 …</code> bytes.</li>
</ul>
</details>`,
        },
      ],
      quiz: [
        { q: 'Which guarantees does TLS give?', options: ['Only encryption', 'Confidentiality, integrity and server authentication', 'Only that the user is logged in', 'That the website is not malicious'], answer: 1, why: 'TLS proves you reached the real domain and protects the traffic. It says nothing about whether the site itself is honest.' },
        { q: 'On café Wi-Fi with HTTPS, can the sniffer see the path <code>/reset?token=abc</code>?', options: ['Yes', 'No: only the IP, usually the hostname, and traffic size/timing', 'Only the token', 'Only on GET requests'], answer: 1, why: 'Path, query, headers and body are inside the encrypted tunnel.' },
        { q: 'What does a server certificate prove, once validated?', options: ['The site is safe to use', 'This public key belongs to this domain, vouched for by a CA your browser trusts', 'The user’s identity', 'That the password is correct'], answer: 1, why: 'Phishing sites can have perfectly valid certificates for <em>their own</em> domain.' },
        { q: 'What does <code>Strict-Transport-Security</code> protect against?', options: ['XSS', 'Downgrade to plain HTTP (sslstrip) on later visits', 'Weak passwords', 'CSRF'], answer: 1, why: 'After seeing HSTS, the browser upgrades every request to HTTPS internally.' },
        { q: 'How many round trips does a full TLS 1.3 handshake need before the client can send HTTP?', options: ['0', '1', '2', '3'], answer: 1, why: 'TLS 1.3 is 1-RTT (TLS 1.2 needed 2). Resumed sessions can even use 0-RTT.' },
      ],
      exercise: {
        task: `<p>You are the browser’s certificate checker. For each certificate in the box below choose the verdict and click <b>Check</b>.</p>`,
        starter: W(certExHtml, certExercise, { fill: false }),
        hint: 'Check three things in order: does a SAN entry match the visited host (a wildcard covers exactly one label)? Is today inside the dates? Does the issuer chain lead to a trusted root?',
        solution: W(certExHtml, certExercise, { fill: true }),
      },
    },
    {
      id: 'same-origin',
      section: S,
      title: 'Origins, Same-Origin Policy & CORS',
      explain: `
<p>Your browser runs JavaScript from many websites at once, in different tabs. If a script on <code>evil.test</code> could read your open <code>bank.test</code> pages, the web would be unusable. The <strong>Same-Origin Policy</strong> (SOP) is the wall between them.</p>
<h3>What is an origin?</h3>
<p><strong>Origin = scheme + host + port.</strong> <code>https://shop.test</code> (port 443 implied). Change any one of them and it’s a different origin: <code>http://shop.test</code>, <code>https://api.shop.test</code>, <code>https://shop.test:8443</code>. The path doesn’t matter.</p>
<p>A looser idea, <strong>site</strong>, is scheme + “registrable domain” (<code>https://shop.test</code> covers <code>app.shop.test</code> and <code>api.shop.test</code>). Cookies’ <code>SameSite</code> uses sites; the SOP uses origins.</p>
<h3>What SOP blocks, and what it doesn’t</h3>
<ul>
  <li>❌ JavaScript <strong>reading</strong> a response from another origin (<code>fetch</code>), or another origin’s DOM / storage.</li>
  <li>✅ <strong>Sending</strong> requests: forms, links, <code>&lt;img&gt;</code>, <code>&lt;script&gt;</code> to any origin. The browser even attaches cookies. That’s the root of CSRF (lesson 2.4).</li>
</ul>
<h3>CORS: the server’s permission slip</h3>
<p><strong>Cross-Origin Resource Sharing</strong> lets a server say “this other origin may read my responses”:</p>
<pre><code class="language-http">Access-Control-Allow-Origin: https://app.shop.test
Access-Control-Allow-Credentials: true
Vary: Origin</code></pre>
<p>For “non-simple” requests (methods like <code>PUT</code>/<code>DELETE</code>, a JSON <code>Content-Type</code>, custom headers), the browser first sends a <strong>preflight</strong> <code>OPTIONS</code> request asking permission. Cookies are only sent with cross-origin <code>fetch</code> if the page asks for <code>credentials: 'include'</code>, and the response is only readable if the server says <code>Access-Control-Allow-Credentials: true</code> with an exact origin (never <code>*</code>).</p>
<div class="warn">CORS is enforced by the <em>browser</em> to protect <em>users</em>. It is not server security: <code>curl</code> ignores it, and simple requests reach your server (and run!) even when CORS later blocks the response from being read.</div>
`,
      examples: [
        { title: 'Origin calculator', code: originCalc },
        {
          title: 'CORS: simple request, preflight, and failures',
          code: corsSeq,
          explain: `
<details><summary>The problem: two origins of one app</summary>
<p>Your front end lives at <code>https://app.shop.test</code>, your API at <code>https://api.shop.test</code>. Different hosts → different origins → by default the front end’s JavaScript may <em>send</em> to the API but not <em>read</em> the answers. CORS headers are the API telling the browser “app.shop.test is mine, let it read”.</p>
</details>
<details><summary>Step by step: “② Preflight (PUT JSON)”</summary>
<table>
<tr><th>Step</th><th>Arrow</th><th>Key headers</th><th>Why</th></tr>
<tr><td>1</td><td>fetch PUT, JSON, credentials</td><td>–</td><td>PUT + <code>application/json</code> make it non-simple</td></tr>
<tr><td>2</td><td>OPTIONS (preflight)</td><td><code>Origin</code>, <code>Access-Control-Request-Method: PUT</code>, <code>Access-Control-Request-Headers: content-type</code></td><td>asks first; no cookies, no body</td></tr>
<tr><td>3</td><td>204 + allow PUT, content-type</td><td><code>Access-Control-Allow-Origin</code>, <code>-Methods</code>, <code>-Headers</code>, <code>-Credentials: true</code>, <code>-Max-Age: 600</code></td><td>server grants it</td></tr>
<tr><td>4</td><td>preflight check ✓</td><td>–</td><td>browser caches the permission for 600 s</td></tr>
<tr><td>5</td><td>PUT /notes/7 + Cookie</td><td><code>Cookie</code>, <code>Content-Type</code></td><td>the real request</td></tr>
<tr><td>6</td><td>200 + ACAO + ACAC</td><td>same two headers again</td><td>every response needs them</td></tr>
<tr><td>7</td><td>resolve(Response)</td><td>–</td><td>JavaScript gets the data</td></tr>
</table>
</details>
<details><summary>Key ideas from the failure tabs</summary>
<ul>
  <li><b>③</b>: <code>Access-Control-Allow-Origin: *</code> is rejected when credentials are included. The PUT is never sent, and JS only sees <code>TypeError: Failed to fetch</code>; the real reason is in the DevTools console.</li>
  <li><b>④</b>: a form-like POST is a <em>simple request</em>. No preflight, so the server <b>executes</b> it; CORS only hides the response afterwards. Protect state-changing endpoints with CSRF defenses, not CORS.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
  <li>In the origin calculator, click the <b>default port</b> preset: <code>:443</code> is the same as no port, so the origins match.</li>
  <li>Click <b>subdomains</b>: cross-origin but same-site. That is exactly the setup of the CORS example.</li>
  <li>In the CORS example, compare step 3 of tab ② with step 3 of tab ③ and spot the one header that breaks it.</li>
</ul>
</details>`,
        },
      ],
      quiz: [
        { q: 'What is the origin of <code>https://shop.test:443/a/b?x=1</code>?', options: ['<code>https://shop.test:443/a</code>', '<code>https://shop.test</code>', '<code>shop.test</code>', '<code>https://shop.test/a/b</code>'], answer: 1, why: 'Scheme + host + port, and 443 is the default for https so it’s omitted.' },
        { q: 'Are <code>http://shop.test</code> and <code>https://shop.test</code> the same origin?', options: ['Yes, same host', 'No, the scheme differs', 'Only for GET', 'Only if cookies are shared'], answer: 1, why: 'All three parts must match.' },
        { q: 'Who enforces CORS?', options: ['The server', 'The browser', 'The firewall', 'DNS'], answer: 1, why: 'The server only declares permissions in headers; the browser decides whether page JS may read the response.' },
        { q: 'Which request triggers a preflight?', options: ['GET with no custom headers', 'POST with <code>Content-Type: application/x-www-form-urlencoded</code>', 'PUT with <code>Content-Type: application/json</code>', 'Loading an <code>&lt;img&gt;</code>'], answer: 2, why: 'Non-simple method and non-simple content type. Images and form-like requests never preflight.' },
        { q: 'With <code>fetch(url, {credentials: \'include\'})</code>, which response headers let the page read the response?', options: ['<code>Access-Control-Allow-Origin: *</code>', 'The exact origin in ACAO + <code>Access-Control-Allow-Credentials: true</code>', 'Just <code>Access-Control-Allow-Credentials: true</code>', 'No headers needed'], answer: 1, why: 'Credentialed CORS needs both, and the wildcard is not allowed.' },
      ],
      exercise: {
        task: `<p>Configure the API’s preflight response. Write the CORS headers in the box below (one per line) so that the shown DELETE from <code>https://app.shop.test</code> with cookies and a custom <code>X-CSRF-Token</code> header is allowed, then click <b>Check</b>.</p>`,
        starter: W(corsExHtml, corsExercise, { value: 'Access-Control-Allow-Origin: *\n' }),
        hint: 'You need four headers: Allow-Origin (exact origin), Allow-Credentials (true), Allow-Methods (include DELETE), Allow-Headers (include X-CSRF-Token).',
        solution: W(corsExHtml, corsExercise, { value: 'Access-Control-Allow-Origin: https://app.shop.test\nAccess-Control-Allow-Credentials: true\nAccess-Control-Allow-Methods: GET, PUT, DELETE\nAccess-Control-Allow-Headers: Content-Type, X-CSRF-Token\nAccess-Control-Max-Age: 600\nVary: Origin' }),
      },
    },
  );
})();
