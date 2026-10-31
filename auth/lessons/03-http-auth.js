window.LESSONS = window.LESSONS || [];
(function () {
  // Shared widget styles + helpers (concatenated into each widget's code).
  const CSS = `<style>
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 9px 12px; background: #fff; margin-bottom: 9px; }
.card h4 { margin: 0 0 6px; font-size: 13.5px; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 7px; }
.g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.g3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }
label { font-size: 12.5px; color: #4a5165; }
input, select, textarea { font: 12.5px ui-monospace, Menlo, monospace; }
textarea { width: 100%; box-sizing: border-box; resize: vertical; }
.mono { font: 12.5px/1.5 ui-monospace, Menlo, monospace; overflow-wrap: anywhere; }
pre.dark { background: #0f1320; color: #d7dcea; padding: 8px 10px; border-radius: 8px; margin: 4px 0;
  font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.ok { color: #15803d; font-weight: 600; }
.bad { color: #b91c1c; font-weight: 600; }
.mut { color: #6b7280; font-size: 12.5px; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; }
.pill.ok { background: #dcfce7; } .pill.bad { background: #fee2e2; } .pill.mid { background: #fef3c7; color: #92400e; }
.verdict { font-size: 17px; font-weight: 800; padding: 6px 10px; border-radius: 8px; text-align: center; margin-top: 6px; }
.verdict.ok { background: #dcfce7; } .verdict.bad { background: #fee2e2; color: #b91c1c; }
table.t { border-collapse: collapse; width: 100%; font-size: 12.5px; }
table.t td, table.t th { border: 1px solid #e2e5ee; padding: 3px 6px; text-align: left; vertical-align: top; }
table.t th { background: #f4f6fa; }
ol.trace { margin: 4px 0; padding-left: 22px; font-size: 13px; }
ol.trace li { margin: 3px 0; }
.fb { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 13.5px; }
.fb.ok { background: #dcfce7; } .fb.bad { background: #fee2e2; }
.fb:empty { display: none; }
mark { background: #fde68a; border-radius: 3px; padding: 0 2px; }
</style>`;
  const H = `const NL = '\\n';
const $ = (s) => document.querySelector(s);
const esc = (s) => Seq.esc(s);
`;

  // =====================================================================
  // basic-auth
  // =====================================================================
  const basicFlow = CSS + `
<div class="row">
  <label>Username <input id="u" value="alice" size="10"></label>
  <label>Password <input id="p" value="s3cret" size="12"></label>
  <span class="mut">Change them and press Enter: every message below is recomputed with real Base64.</span>
</div>
<div id="flow"></div>
<script>
` + H + `
let seq;
function build() {
  const u = $('#u').value, p = $('#p').value;
  const cred = Auth.b64(u + ':' + p);
  const bad = Auth.b64(u + ':' + 'letmein');
  const hdr = 'Authorization: Basic ' + cred;
  const get = (path, extra) => ['GET ' + path + ' HTTP/1.1', 'Host: intranet.shop.test',
    'User-Agent: Mozilla/5.0', 'Accept: text/html'].concat(extra || []).join(NL);
  const challenge = ['HTTP/1.1 401 Unauthorized',
    'WWW-Authenticate: Basic realm="Shop admin", charset="UTF-8"',
    'Content-Type: text/html', '', '<h1>401 Unauthorized</h1>'].join(NL);
  const serverStore = { users: u + ' → bcrypt($2b$12$Lr…)' };
  const step1 = { from: 'b', to: 's', label: 'GET /admin (no credentials)', msg: get('/admin'),
    note: 'The browser has no credentials for this site yet, so it sends a plain request.' };
  const step2 = { from: 's', to: 'b', kind: 'err', label: '401 + WWW-Authenticate: Basic',
    msg: challenge, hl: ['WWW-Authenticate', 'realm="Shop admin"'],
    note: 'The <b>challenge</b>. <code>401</code> means "who are you?". <code>WWW-Authenticate</code> tells ' +
      'the client which scheme to use (<code>Basic</code>) and the <code>realm</code>, a name for the ' +
      'protected area. <code>charset="UTF-8"</code> (RFC 7617) says how to turn non-ASCII passwords into bytes.' };
  Seq.mount('#flow', {
    title: 'HTTP Basic auth (RFC 7617)',
    actors: [
      { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Browser credential cache' },
      { id: 's', label: 'intranet.shop.test', icon: '🖥', store: serverStore, storeLabel: 'Server user table' },
    ],
    scenarios: [
      { name: '✅ Correct password', steps: [
        step1, step2,
        { from: 'b', to: 'b', label: 'native sign-in dialog', badge: 'User types',
          note: 'The browser shows its <b>built-in</b> username/password dialog (not your HTML). ' +
            'The user types <code>' + esc(u) + '</code> / <code>' + esc(p) + '</code>.',
          set: { b: { 'realm "Shop admin"': u + ':' + p } } },
        { from: 'b', to: 'b', label: 'base64(user:pass)', badge: 'Encode',
          msg: ['# join with a colon', u + ':' + p, '', '# Base64-encode the UTF-8 bytes', cred].join(NL),
          note: 'Username and password are joined with <code>:</code> and Base64-encoded. ' +
            '<b>No key, no secret</b>: this is just a different alphabet for the same bytes.' },
        { from: 'b', to: 's', label: 'GET /admin + Authorization: Basic', msg: get('/admin', [hdr]),
          hl: ['Authorization'], note: 'The same request again, now with the <code>Authorization</code> header.' },
        { from: 's', to: 's', label: 'decode → split at first ":" → bcrypt compare',
          msg: ['# server side', 'base64-decode("' + cred + '")', '  = "' + u + ':' + p + '"',
            'username = "' + u + '"   password = "' + p + '"',
            'bcrypt.compare(password, users["' + u + '"].hash)  → true'].join(NL),
          note: 'The server decodes, splits at the <b>first</b> colon (so usernames cannot contain <code>:</code>), ' +
            'and checks the password against its stored hash.' },
        { from: 's', to: 'b', kind: 'res', label: '200 OK',
          msg: ['HTTP/1.1 200 OK', 'Content-Type: text/html', 'Cache-Control: no-store', '', '<h1>Admin dashboard</h1>'].join(NL),
          note: 'Authenticated. Note: the server created <b>no session</b>. It will forget alice immediately.' },
        { from: 'b', to: 's', label: 'GET /admin/orders (header re-sent automatically)',
          msg: get('/admin/orders', [hdr]), hl: ['Authorization'],
          note: 'The browser caches the credentials for this realm and attaches them to <b>every</b> following request. ' +
            'So the password travels over the wire again and again.' },
        { from: 's', to: 's', label: 'decode + bcrypt compare (again!)',
          note: 'Stateless: the server repeats the whole check on every request. With bcrypt that is ~100 ms of CPU each time.' },
        { from: 's', to: 'b', kind: 'res', label: '200 OK',
          msg: ['HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<h1>Orders</h1>'].join(NL) },
      ]},
      { name: '❌ Wrong password', steps: [
        step1, step2,
        { from: 'b', to: 'b', label: 'user types wrong password', badge: 'User types',
          note: 'The user types <code>letmein</code> instead.', set: { b: { 'realm "Shop admin"': u + ':letmein' } } },
        { from: 'b', to: 's', label: 'GET /admin + Authorization: Basic',
          msg: get('/admin', ['Authorization: Basic ' + bad]), hl: ['Authorization'] },
        { from: 's', to: 's', label: 'decode → bcrypt compare → false',
          msg: ['base64-decode("' + bad + '") = "' + u + ':letmein"', 'bcrypt.compare(...)  → false'].join(NL) },
        { from: 's', to: 'b', kind: 'err', label: '401 + WWW-Authenticate (again)', msg: challenge, hl: ['WWW-Authenticate'],
          note: 'Wrong credentials get the <b>same</b> 401 challenge, not 403. 401 = "not authenticated, try again".',
          set: { b: { 'realm "Shop admin"': null } } },
        { from: 'b', to: 'b', label: 'dialog shown again', badge: 'User types',
          note: 'Seeing a 401 with a challenge, the browser drops the cached credentials and prompts again. ' +
            'Servers should rate-limit failed attempts (brute force!).' },
      ]},
      { name: '👀 Over plain HTTP: sniffed', actors: [
          { id: 'b', label: 'Browser', icon: '🌐', store: { 'realm "Shop admin"': u + ':' + p } },
          { id: 'e', label: 'Eve on café Wi-Fi', icon: '🕵️', store: {}, storeLabel: 'Eve’s notes' },
          { id: 's', label: 'intranet.shop.test', icon: '🖥', store: serverStore },
        ], steps: [
        { from: 'b', to: 'e', label: 'GET http://… + Authorization (no TLS!)',
          msg: get('/admin', [hdr]), hl: ['Authorization'],
          note: 'The site uses <code>http://</code>. Every byte passes through the café router <b>in clear text</b>.' },
        { from: 'e', to: 'e', label: 'capture packet', badge: 'Sniff',
          msg: ['# Wireshark / tcpdump output', 'GET /admin HTTP/1.1', hdr].join(NL), hl: [cred],
          set: { e: { captured: hdr } } },
        { from: 'e', to: 'e', label: 'base64-decode → password!', badge: 'Decode',
          msg: ['$ echo ' + cred + ' | base64 -d', u + ':' + p].join(NL),
          note: 'Decoding needs no key. Eve now has the <b>real password</b>, which may also be reused on other sites.',
          set: { e: { password: u + ':' + p } } },
        { from: 'e', to: 's', label: 'GET /admin with stolen header', msg: get('/admin', [hdr]), hl: ['Authorization'] },
        { from: 's', to: 'e', kind: 'res', label: '200 OK (Eve is "alice")',
          msg: ['HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<h1>Admin dashboard</h1>'].join(NL),
          note: 'The server cannot tell Eve from Alice. Fix: <b>only ever use Basic over HTTPS</b>. TLS encrypts the header.' },
      ]},
      { name: '🚪 "Log out" does not work', actors: [
          { id: 'b', label: 'Browser', icon: '🌐', store: { 'realm "Shop admin"': u + ':' + p }, storeLabel: 'Browser credential cache' },
          { id: 's', label: 'intranet.shop.test', icon: '🖥', store: serverStore },
        ], steps: [
        { from: 'b', to: 's', label: 'POST /logout', msg: ['POST /logout HTTP/1.1', 'Host: intranet.shop.test', hdr].join(NL),
          hl: ['Authorization'], note: 'Alice clicks a "Log out" button in the page.' },
        { from: 's', to: 'b', kind: 'res', label: '200 "You are logged out"',
          msg: ['HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<p>You are logged out</p>'].join(NL),
          note: 'The server has <b>nothing to delete</b>: there is no session. It can only say "bye".' },
        { from: 'b', to: 's', label: 'GET /admin (creds still cached!)', msg: get('/admin', [hdr]), hl: ['Authorization'],
          note: 'The credential cache lives in the browser and JavaScript cannot clear it. The browser keeps sending the header.' },
        { from: 's', to: 'b', kind: 'res', label: '200 OK: still logged in',
          msg: ['HTTP/1.1 200 OK', '', '<h1>Admin dashboard</h1>'].join(NL),
          note: 'Only closing the browser (or hacks like forcing a 401 with fake credentials) "logs out". ' +
            'This is a big reason websites use form login + sessions instead.' },
      ]},
    ],
  });
}
$('#u').addEventListener('change', build);
$('#p').addEventListener('change', build);
build();
</script>`;

  const base64Lab = CSS + `
<div class="g2">
  <div class="card">
    <h4>① Encode: what the browser does</h4>
    <div class="row"><label>user <input id="eu" value="alice" size="10"></label>
      <label>pass <input id="ep" value="s3cret" size="12"></label></div>
    <div class="mut">Joined string → UTF-8 bytes → 6-bit groups → Base64 alphabet:</div>
    <div id="bits" style="max-height:250px;overflow:auto"></div>
    <pre class="dark" id="hdr"></pre>
  </div>
  <div class="card">
    <h4>② Decode: what anyone on the wire can do</h4>
    <label>Paste an Authorization header (or just the Base64 part)</label>
    <textarea id="din" rows="2">Authorization: Basic Ym9iOmNvcnJlY3QgaG9yc2U=</textarea>
    <div id="dout" class="mono"></div>
    <div class="mut" style="margin-top:8px">Try: a password with <code>é</code> or <code>🔑</code> (several bytes each),
      a password containing <code>:</code>, or delete one character of the Base64.</div>
    <div class="fb bad" style="margin-top:10px">🔓 <b>Encoding ≠ encryption.</b> There is no key. Base64 only makes
      binary bytes safe to put in a text header. Anyone can reverse it in one line:
      <code>atob('…')</code> or <code>base64 -d</code>.</div>
  </div>
</div>
<script>
` + H + `
const ALPH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function enc() {
  const s = $('#eu').value + ':' + $('#ep').value;
  const bytes = new TextEncoder().encode(s);
  let rows = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const grp = Array.from(bytes.slice(i, i + 3));
    const chars = new TextDecoder().decode(new Uint8Array(grp));
    let bits = grp.map((b) => b.toString(2).padStart(8, '0')).join('');
    const nOut = Math.ceil(bits.length / 6);
    bits = bits.padEnd(nOut * 6, '0');
    const six = [];
    for (let k = 0; k < nOut; k++) six.push(bits.slice(k * 6, k * 6 + 6));
    const out = six.map((x) => ALPH[parseInt(x, 2)]).join('') + '='.repeat(4 - nOut);
    rows += '<tr><td>' + esc(JSON.stringify(chars)) + '</td><td>' +
      grp.map((b) => b.toString(16).padStart(2, '0')).join(' ') + '</td><td>' +
      six.map((x) => x + '→' + parseInt(x, 2)).join(' ') + '</td><td><b>' + out + '</b></td></tr>';
  }
  $('#bits').innerHTML = '<table class="t mono"><tr><th>chars</th><th>bytes (hex)</th><th>6-bit → index</th>' +
    '<th>b64</th></tr>' + rows + '</table>';
  $('#hdr').textContent = '"' + s + '"  (' + bytes.length + ' bytes)' + NL + 'Authorization: Basic ' + Auth.b64(s);
}
function dec() {
  let v = $('#din').value.trim().replace('Authorization:', '').trim();
  if (v.toLowerCase().startsWith('basic ')) v = v.slice(6).trim();
  try {
    const s = Auth.b64d(v);
    const i = s.indexOf(':');
    $('#dout').innerHTML = '<div style="margin-top:6px">Decoded: <mark>' + esc(s) + '</mark></div>' +
      (i < 0 ? '<div class="bad">No colon: not valid user:pass</div>'
        : '<div>username = <b>' + esc(s.slice(0, i)) + '</b></div><div>password = <b class="bad">' +
          esc(s.slice(i + 1)) + '</b>  <span class="mut">(split at the FIRST colon)</span></div>');
  } catch (e) {
    $('#dout').innerHTML = '<div class="bad" style="margin-top:6px">Not valid Base64 (' + esc(e.message) + ')</div>';
  }
}
['#eu', '#ep'].forEach((s) => $(s).addEventListener('input', enc));
$('#din').addEventListener('input', dec);
enc();
dec();
</script>`;

  const basicExercise = (solved) => CSS + `
<div class="card">
  <h4>Captured on hotel Wi-Fi (plain HTTP)</h4>
  <pre class="dark" id="cap"></pre>
  <div class="row">
    <label>username <input id="xu" value="${solved ? 'devops' : ''}" size="14"></label>
    <label>password <input id="xp" value="${solved ? 'C0ffee:Mugs!' : ''}" size="16"></label>
    <button id="chk">Check</button>
  </div>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const SECRET = 'devops:C0ffee:Mugs!';
$('#cap').textContent = ['GET /reports/q3 HTTP/1.1', 'Host: intranet.acme.test',
  'Authorization: Basic ' + Auth.b64(SECRET), 'Accept: */*'].join(NL);
$('#chk').onclick = () => {
  const u = $('#xu').value, p = $('#xp').value, fb = $('#fb');
  if (u === 'devops' && p === 'C0ffee:Mugs!') {
    fb.className = 'fb ok';
    fb.innerHTML = '✅ Correct. Note the password itself contains a colon: split at the <b>first</b> colon only. ' +
      'You recovered it with zero secrets, which is why Basic auth must only travel over HTTPS.';
  } else if (u === 'devops' && p === 'C0ffee') {
    fb.className = 'fb bad';
    fb.innerHTML = '❌ Close! You split at every colon. RFC 7617: the user-id cannot contain ":", ' +
      'so split at the <b>first</b> one. Everything after it is the password.';
  } else {
    fb.className = 'fb bad';
    fb.innerHTML = '❌ Not quite. Base64-decode the part after <code>Basic </code>, then split at the first colon.';
  }
};
</script>`;

  // =====================================================================
  // digest-auth
  // =====================================================================
  const RFC = {
    user: 'Mufasa', realm: 'http-auth@example.org', pass: 'Circle of Life', method: 'GET',
    uri: '/dir/index.html', nonce: '7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v', nc: '00000001',
    cnonce: 'f2/wE4q74E6zIJEtWaHKaf5wv/H5QzzpXusqGemxURZJ', qop: 'auth',
    opaque: 'FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS',
  };

  const digestFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const R = ` + JSON.stringify(RFC) + `;
const ha1 = Auth.md5(R.user + ':' + R.realm + ':' + R.pass);
function resp(method, uri, nonce, nc, cnonce) {
  const ha2 = Auth.md5(method + ':' + uri);
  return { ha2, r: Auth.md5(ha1 + ':' + nonce + ':' + nc + ':' + cnonce + ':' + R.qop + ':' + ha2) };
}
const cnonce2 = 'h8lmTq3pT0tVZsOo0oVLyVJyM6Bm2ZRHfZ1mUbKKa0A';
const nonce2 = 'Ab5XoQd0Q9WMzc3gy0/1k3xX2WdxYH3hzQnZdlRgXv1o';
const r1 = resp('GET', R.uri, R.nonce, '00000001', R.cnonce);
const r2 = resp('GET', R.uri, R.nonce, '00000002', cnonce2);
const r3 = resp('GET', R.uri, nonce2, '00000001', cnonce2);
const host = 'Host: example.org';
const challenge = (nonce, stale) => ['HTTP/1.1 401 Unauthorized',
  'WWW-Authenticate: Digest realm="' + R.realm + '",', '    qop="auth, auth-int",', '    algorithm=MD5,',
  '    nonce="' + nonce + '",', '    opaque="' + R.opaque + '"' + (stale ? ',' : ''),
].concat(stale ? ['    stale=true'] : []).join(NL);
const authz = (uri, nonce, nc, cnonce, r) => ['GET ' + uri + ' HTTP/1.1', host,
  'Authorization: Digest username="' + R.user + '",', '    realm="' + R.realm + '",', '    uri="' + uri + '",',
  '    algorithm=MD5,', '    nonce="' + nonce + '",', '    nc=' + nc + ',', '    cnonce="' + cnonce + '",',
  '    qop=auth,', '    response="' + r + '",', '    opaque="' + R.opaque + '"'].join(NL);
const calc = (nc, cnonce, nonce, x) => ['# HA1 = MD5(username:realm:password)',
  'MD5("' + R.user + ':' + R.realm + ':' + R.pass + '")', '  = ' + ha1, '',
  '# HA2 = MD5(method:uri)', 'MD5("GET:' + R.uri + '")', '  = ' + x.ha2, '',
  '# response = MD5(HA1:nonce:nc:cnonce:qop:HA2)',
  'MD5("' + ha1.slice(0, 8) + '…:' + nonce.slice(0, 8) + '…:' + nc + ':' + cnonce.slice(0, 8) + '…:auth:' + x.ha2.slice(0, 8) + '…")',
  '  = ' + x.r].join(NL);
const srvStore = { 'HA1[Mufasa]': ha1.slice(0, 16) + '…' };
const s1 = { from: 'c', to: 's', label: 'GET /dir/index.html', msg: ['GET ' + R.uri + ' HTTP/1.1', host].join(NL),
  note: 'First request, no credentials.' };
const s2 = { from: 's', to: 'c', kind: 'err', label: '401 + WWW-Authenticate: Digest nonce=…',
  msg: challenge(R.nonce), hl: ['nonce=', 'qop=', 'realm=', 'opaque='],
  note: 'The server invents a fresh random <code>nonce</code> ("number used once") and remembers it. ' +
    '<code>qop</code> = quality of protection, <code>opaque</code> must be echoed back unchanged.',
  set: { s: { ['nonce ' + R.nonce.slice(0, 8) + '…']: 'issued, last nc=0' } } };
const s3 = { from: 'c', to: 'c', label: 'user types password; compute response', badge: 'MD5 × 3',
  msg: calc('00000001', R.cnonce, R.nonce, r1), hl: ['HA1', 'HA2', 'response'],
  note: 'The password is <b>never sent</b>. The client mixes it with the server nonce, its own random <code>cnonce</code> ' +
    'and a counter <code>nc</code>, and sends only the hash.',
  set: { c: { password: R.pass, nonce: R.nonce.slice(0, 8) + '…', nc: '00000001' } } };
const s4 = { from: 'c', to: 's', label: 'GET + Authorization: Digest response=…',
  msg: authz(R.uri, R.nonce, '00000001', R.cnonce, r1.r), hl: ['response=', 'nc=', 'cnonce='] };
const s5 = { from: 's', to: 's', label: 'look up HA1, recompute, compare, check nc',
  msg: ['# server knows HA1 for Mufasa (stored), and the nonce it issued',
    'HA2      = MD5("GET:' + R.uri + '") = ' + r1.ha2,
    'expected = MD5(HA1:nonce:00000001:cnonce:auth:HA2)', '         = ' + r1.r,
    'received = ' + r1.r + '   ✓ match', 'nc 00000001 > last nc 0   ✓ fresh'].join(NL),
  note: 'The server can compute the same value because it stores <b>HA1</b> (not the password). It also records the ' +
    'highest <code>nc</code> seen for this nonce.',
  set: { s: { ['nonce ' + R.nonce.slice(0, 8) + '…']: 'issued, last nc=1' } } };
const s6 = { from: 's', to: 'c', kind: 'res', label: '200 OK + Authentication-Info',
  msg: ['HTTP/1.1 200 OK', 'Authentication-Info: qop=auth, nc=00000001,', '    cnonce="' + R.cnonce + '",',
    '    rspauth="…"', 'Content-Type: text/html', '', '<h1>index</h1>'].join(NL), hl: ['Authentication-Info'],
  note: '<code>Authentication-Info</code> (optional) can carry <code>rspauth</code>, proving the <i>server</i> also knows HA1, and a <code>nextnonce</code>.' };
Seq.mount('#flow', {
  title: 'HTTP Digest auth (RFC 7616): values computed live with MD5',
  actors: [
    { id: 'c', label: 'Client', icon: '🌐', store: {}, storeLabel: 'Client' },
    { id: 's', label: 'example.org', icon: '🖥', store: srvStore, storeLabel: 'Server (stores HA1 + nonces)' },
  ],
  scenarios: [
    { name: '✅ First request', steps: [s1, s2, s3, s4, s5, s6] },
    { name: '🔁 Next request (nc=2)', steps: [
      Object.assign({}, s4, { label: '(earlier) request with nc=00000001' }), s5,
      { from: 'c', to: 'c', label: 'nc++ , new cnonce, recompute', badge: 'MD5',
        msg: calc('00000002', cnonce2, R.nonce, r2), hl: ['00000002'],
        note: 'For the next request the client reuses the nonce (no extra round trip) but increments <code>nc</code> ' +
          'and picks a new <code>cnonce</code>. The response hash changes completely.', set: { c: { nc: '00000002' } } },
      { from: 'c', to: 's', label: 'GET + Digest nc=00000002', msg: authz(R.uri, R.nonce, '00000002', cnonce2, r2.r),
        hl: ['nc=00000002', 'response='] },
      { from: 's', to: 's', label: 'recompute ✓, nc 2 > 1 ✓',
        msg: ['expected = ' + r2.r, 'received = ' + r2.r + '   ✓', 'nc 00000002 > last nc 00000001   ✓'].join(NL),
        set: { s: { ['nonce ' + R.nonce.slice(0, 8) + '…']: 'issued, last nc=2' } } },
      { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK' },
    ]},
    { name: '🦹 Replay attack', actors: [
        { id: 'c', label: 'Client', icon: '🌐', store: {} },
        { id: 'e', label: 'Eve (sniffer)', icon: '🕵️', store: {}, storeLabel: 'Eve' },
        { id: 's', label: 'example.org', icon: '🖥', store: srvStore, storeLabel: 'Server (stores HA1 + nonces)' },
      ], steps: [
      Object.assign({}, s2, { from: 's', to: 'c' }),
      Object.assign({}, s4, { from: 'c', to: 's', note: 'Imagine no TLS: Eve records this exact request on the way.' }),
      { from: 'e', to: 'e', label: 'record the Authorization header', badge: 'Sniff',
        note: 'Eve gets the response hash, nonce, nc, cnonce, but <b>not the password</b> (and MD5 cannot be reversed directly).',
        set: { e: { captured: 'response="' + r1.r.slice(0, 10) + '…" nc=00000001' } } },
      Object.assign({}, s5, { from: 's', to: 's' }),
      { from: 'e', to: 's', label: 'replay identical request', msg: authz(R.uri, R.nonce, '00000001', R.cnonce, r1.r),
        hl: ['nc=00000001'], note: 'Eve resends the request byte-for-byte.' },
      { from: 's', to: 's', label: 'hash ✓ but nc 1 ≤ last nc 1 ✗', badge: 'Replay!',
        msg: ['expected = ' + r1.r + '   ✓ (same inputs)', 'nc 00000001 ≤ last nc 00000001   ✗ already used'].join(NL),
        note: 'The hash is valid, but the server remembers which <code>nc</code> values it accepted for this nonce. ' +
          'Eve cannot bump nc herself: changing it changes the hash, which needs HA1.' },
      { from: 's', to: 'e', kind: 'err', label: '401 (replay rejected)', msg: challenge(nonce2) },
      { from: 'e', to: 'e', label: 'try /admin with same response?', badge: 'Fails too',
        note: 'Changing the URI also fails: HA2 = MD5(method:uri) is inside the hash. But note: with <code>qop=auth</code> ' +
          'the <b>body</b> is not protected, and without TLS Eve can still read every response.' },
    ]},
    { name: '⏰ Stale nonce', steps: [
      { from: 'c', to: 's', label: 'GET with old nonce (hours later)', msg: authz(R.uri, R.nonce, '00000009', cnonce2, r2.r),
        hl: ['nonce='] },
      { from: 's', to: 's', label: 'nonce expired (hash itself is fine)',
        note: 'Servers expire nonces after a while to limit replay windows.',
        set: { s: { ['nonce ' + R.nonce.slice(0, 8) + '…']: 'expired', ['nonce ' + nonce2.slice(0, 8) + '…']: 'issued, last nc=0' } } },
      { from: 's', to: 'c', kind: 'err', label: '401 + stale=true + new nonce', msg: challenge(nonce2, true), hl: ['stale=true'],
        note: '<code>stale=true</code> means "your password was right, only the nonce is old". The browser retries <b>without</b> prompting.' },
      { from: 'c', to: 'c', label: 'recompute with new nonce, nc=1', badge: 'MD5',
        msg: calc('00000001', cnonce2, nonce2, r3), set: { c: { nonce: nonce2.slice(0, 8) + '…', nc: '00000001' } } },
      { from: 'c', to: 's', label: 'GET + Digest (new nonce)', msg: authz(R.uri, nonce2, '00000001', cnonce2, r3.r), hl: ['nonce='] },
      { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK' },
    ]},
  ],
});
</script>`;

  const digestCalc = CSS + `
<div class="g2">
  <div class="card">
    <h4>Inputs</h4>
    <div class="row"><label>algorithm <select id="alg"><option>MD5</option><option>SHA-256</option></select></label>
      <button id="ex1">Load RFC 7616 example</button><button id="ex2">Load RFC 2617 example</button></div>
    <table class="t" id="inp"></table>
  </div>
  <div class="card">
    <h4>Computation (live)</h4>
    <div id="out" class="mono"></div>
    <div id="ref" style="margin-top:6px"></div>
  </div>
</div>
<div class="card"><h4>Resulting header</h4><pre class="dark" id="hdr"></pre></div>
<script>
` + H + `
const F = ['username', 'realm', 'password', 'method', 'uri', 'nonce', 'nc', 'cnonce', 'qop'];
const R = ` + JSON.stringify(RFC) + `;
const EX1 = { username: R.user, realm: R.realm, password: R.pass, method: 'GET', uri: R.uri, nonce: R.nonce,
  nc: R.nc, cnonce: R.cnonce, qop: 'auth' };
const EX2 = { username: 'Mufasa', realm: 'testrealm@host.com', password: 'Circle Of Life', method: 'GET',
  uri: '/dir/index.html', nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093', nc: '00000001', cnonce: '0a4f113b', qop: 'auth' };
const KNOWN = { ['MD5|' + EX1.nonce]: '8ca523f5e9506fed4657c9700eebdbec',
  ['SHA-256|' + EX1.nonce]: '753927fa0e85d155564e2e272a28d1802ca10daf4496794697cf8db5856cb6c1',
  ['MD5|' + EX2.nonce]: '6629fae49393a05397450978507c4ef1' };
$('#inp').innerHTML = F.map((f) => '<tr><td>' + f + '</td><td><input id="f_' + f + '" style="width:100%;box-sizing:border-box"></td></tr>').join('');
function load(ex) { F.forEach((f) => ($('#f_' + f).value = ex[f])); calc(); }
function calc() {
  const v = {};
  F.forEach((f) => (v[f] = $('#f_' + f).value));
  const alg = $('#alg').value;
  const Hf = alg === 'MD5' ? Auth.md5 : Auth.sha256hex;
  const a1 = v.username + ':' + v.realm + ':' + v.password;
  const a2 = v.method + ':' + v.uri;
  const ha1 = Hf(a1), ha2 = Hf(a2);
  const a3 = ha1 + ':' + v.nonce + ':' + v.nc + ':' + v.cnonce + ':' + v.qop + ':' + ha2;
  const r = Hf(a3);
  const H = alg === 'MD5' ? 'MD5' : 'SHA256';
  $('#out').innerHTML =
    '<b>① HA1</b> = ' + H + '(username:realm:password)<br>' + H + '("' + esc(a1) + '")<br>= <mark>' + ha1 + '</mark><br><br>' +
    '<b>② HA2</b> = ' + H + '(method:uri)<br>' + H + '("' + esc(a2) + '")<br>= <mark>' + ha2 + '</mark><br><br>' +
    '<b>③ response</b> = ' + H + '(HA1:nonce:nc:cnonce:qop:HA2)<br>' + H + '("' + esc(a3) + '")<br>= <mark><b>' + r + '</b></mark>';
  const k = KNOWN[alg + '|' + v.nonce];
  $('#ref').innerHTML = k ? (k === r ? '<span class="pill ok">✓ matches the RFC test vector</span>'
    : '<span class="pill bad">≠ RFC value ' + k.slice(0, 12) + '… (you changed an input)</span>') : '';
  $('#hdr').textContent = ['Authorization: Digest username="' + v.username + '",', '    realm="' + v.realm + '",',
    '    uri="' + v.uri + '",', '    algorithm=' + alg + ',', '    nonce="' + v.nonce + '",', '    nc=' + v.nc + ',',
    '    cnonce="' + v.cnonce + '",', '    qop=' + v.qop + ',', '    response="' + r + '"'].join(NL);
}
$('#inp').addEventListener('input', calc);
$('#alg').onchange = calc;
$('#ex1').onclick = () => load(EX1);
$('#ex2').onclick = () => { $('#alg').value = 'MD5'; load(EX2); };
load(EX1);
</script>`;

  const digestExercise = (solved) => {
    const V = { u: 'bob', realm: 'files@acme.test', pass: 'tr0ub4dor', method: 'GET', uri: '/reports/q3.pdf',
      nonce: 'dcd98b7102dd2f0e8b11d0f600bfb0c093', nc: '00000001', cnonce: '0a4f113b' };
    return CSS + `
<div class="g2">
  <div class="card">
    <h4>The situation</h4>
    <pre class="dark" id="sit"></pre>
    <div class="mut">Bob's password is <code>tr0ub4dor</code>.</div>
  </div>
  <div class="card">
    <h4>MD5 scratchpad</h4>
    <label>Type any string; its MD5 appears below</label>
    <input id="pad" style="width:100%;box-sizing:border-box" value="${solved ? 'GET:/reports/q3.pdf' : ''}">
    <div class="mono" id="padout" style="margin-top:4px"></div>
  </div>
</div>
<div class="card">
  <h4>Your answer (32 hex chars each)</h4>
  <table class="t">
    <tr><td>HA1</td><td><input id="a1" size="40" value="${solved ? '@@HA1' : ''}"></td></tr>
    <tr><td>HA2</td><td><input id="a2" size="40" value="${solved ? '@@HA2' : ''}"></td></tr>
    <tr><td>response</td><td><input id="a3" size="40" value="${solved ? '@@R' : ''}"></td></tr>
  </table>
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const V = ` + JSON.stringify(V) + `;
const HA1 = Auth.md5(V.u + ':' + V.realm + ':' + V.pass);
const HA2 = Auth.md5(V.method + ':' + V.uri);
const RSP = Auth.md5(HA1 + ':' + V.nonce + ':' + V.nc + ':' + V.cnonce + ':auth:' + HA2);
[['#a1', HA1], ['#a2', HA2], ['#a3', RSP]].forEach(([s, v]) => { if ($(s).value.startsWith('@@')) $(s).value = v; });
$('#sit').textContent = ['HTTP/1.1 401 Unauthorized',
  'WWW-Authenticate: Digest realm="' + V.realm + '", qop="auth",', '    algorithm=MD5, nonce="' + V.nonce + '"', '',
  '# Bob\\'s browser will now send:', V.method + ' ' + V.uri + ' HTTP/1.1',
  'Authorization: Digest username="bob", realm="' + V.realm + '",', '    uri="' + V.uri + '", nonce="' + V.nonce + '",',
  '    nc=' + V.nc + ', cnonce="' + V.cnonce + '", qop=auth,', '    response="?????"'].join(NL);
const pad = () => ($('#padout').innerHTML = 'MD5 = <mark>' + Auth.md5($('#pad').value) + '</mark>');
$('#pad').addEventListener('input', pad);
pad();
$('#chk').onclick = () => {
  const g = (s) => $(s).value.trim().toLowerCase();
  const ok1 = g('#a1') === HA1, ok2 = g('#a2') === HA2, ok3 = g('#a3') === RSP;
  const fb = $('#fb');
  fb.className = 'fb ' + (ok1 && ok2 && ok3 ? 'ok' : 'bad');
  fb.innerHTML = (ok1 ? '✅' : '❌') + ' HA1 ' + (ok1 ? '' : '(MD5 of username:realm:password, no spaces)') + '<br>' +
    (ok2 ? '✅' : '❌') + ' HA2 ' + (ok2 ? '' : '(MD5 of method:uri)') + '<br>' +
    (ok3 ? '✅' : '❌') + ' response ' + (ok3 ? '' : '(MD5 of HA1:nonce:nc:cnonce:qop:HA2, using the hex HA1/HA2 and qop "auth")') +
    (ok1 && ok2 && ok3 ? '<br><b>You just did what every Digest client does.</b> And notice: anyone holding HA1 could do it without the password.' : '');
};
</script>`;
  };

  // =====================================================================
  // api-keys
  // =====================================================================
  const apiKeyFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const KEY = 'sk_live_EXAMPLE_not_a_real_key_dYfE';
const KEY2 = 'sk_live_EXAMPLE_revoked_key_eLz';
const h = (k) => Auth.sha256hex(k).slice(0, 16) + '…';
const store = { ['sha256 ' + h(KEY)]: 'acme-shop, orders:read, active', ['sha256 ' + h(KEY2)]: 'old-ci, revoked 2026-09-02' };
const req = (line, key) => [line, 'Host: api.payments.test', 'X-API-Key: ' + key, 'Accept: application/json'].join(NL);
const lookup = (k, res) => ({ from: 's', to: 's', label: 'sha256(key) → look up in DB',
  msg: ['sha256("' + k + '")', '  = ' + Auth.sha256hex(k), '', 'SELECT project, scopes, status FROM api_keys', ' WHERE key_hash = \\'' + Auth.sha256hex(k).slice(0, 16) + '…\\'', '  → ' + res].join(NL),
  note: 'The DB stores only a <b>hash</b> of each key (like passwords). A fast SHA-256 is fine here because keys are long random strings, so there is nothing to brute-force.' });
Seq.mount('#flow', {
  title: 'API keys: one long-lived secret per application',
  actors: [
    { id: 'c', label: 'Backend of acme-shop', icon: '🧩', store: { env: 'PAYMENTS_KEY=' + KEY.slice(0, 12) + '…' }, storeLabel: 'Client config' },
    { id: 's', label: 'api.payments.test', icon: '🏦', store: store, storeLabel: 'api_keys table' },
  ],
  scenarios: [
    { name: '✅ Valid key in header', steps: [
      { from: 'c', to: 's', label: 'GET /v1/orders  X-API-Key: sk_live_…', msg: req('GET /v1/orders?limit=2 HTTP/1.1', KEY), hl: ['X-API-Key'],
        note: 'The key goes in a <b>header</b>. Many APIs use <code>X-API-Key</code>; others use <code>Authorization: Bearer sk_live_…</code>. Both keep it out of the URL.' },
      lookup(KEY, "acme-shop | orders:read | active"),
      { from: 's', to: 's', label: 'scope check: orders:read ✓', note: 'Authentication (which project?) then authorization (may this key read orders?).',
        set: { s: { last_used: '2026-10-31T09:12Z' } } },
      { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{"data":[{"id":"ord_101","total":4200},{"id":"ord_102","total":990}]}'].join(NL) },
    ]},
    { name: '⛔ Revoked key', steps: [
      { from: 'c', to: 's', label: 'GET /v1/orders (old key)', msg: req('GET /v1/orders HTTP/1.1', KEY2), hl: ['X-API-Key'],
        note: 'A forgotten CI job still uses a key that was revoked after rotation.' },
      lookup(KEY2, 'old-ci | revoked 2026-09-02'),
      { from: 's', to: 'c', kind: 'err', label: '401 invalid_api_key',
        msg: ['HTTP/1.1 401 Unauthorized', 'Content-Type: application/json', '', '{"error":{"type":"invalid_request_error","code":"invalid_api_key","message":"This API key was revoked."}}'].join(NL),
        note: '401: the server does not accept this identity at all. Revocation is instant because the server <b>looks the key up</b> on every request.' },
    ]},
    { name: '🚫 Valid key, wrong scope', steps: [
      { from: 'c', to: 's', label: 'POST /v1/refunds', msg: ['POST /v1/refunds HTTP/1.1', 'Host: api.payments.test', 'X-API-Key: ' + KEY, 'Content-Type: application/json', '', '{"order":"ord_101","amount":4200}'].join(NL), hl: ['X-API-Key'] },
      lookup(KEY, "acme-shop | orders:read | active"),
      { from: 's', to: 's', label: 'scope check: refunds:write ✗' },
      { from: 's', to: 'c', kind: 'err', label: '403 Forbidden',
        msg: ['HTTP/1.1 403 Forbidden', 'Content-Type: application/json', '', '{"error":{"code":"insufficient_permissions","message":"Key lacks refunds:write"}}'].join(NL),
        note: '403, not 401: we know who you are, you just may not do this. <b>Least privilege</b>: give each key only the scopes it needs, so a leak hurts less.' },
    ]},
    { name: '🔓 Key in the URL leaks', actors: [
        { id: 'c', label: 'Client', icon: '🧩', store: {} },
        { id: 'p', label: 'CDN / proxy', icon: '📜', store: {}, storeLabel: 'access.log' },
        { id: 's', label: 'api.payments.test', icon: '🏦', store: store, storeLabel: 'api_keys table' },
        { id: 'a', label: 'Attacker', icon: '🦹', store: {}, storeLabel: 'Attacker' },
      ], steps: [
      { from: 'c', to: 'p', label: 'GET /v1/orders?api_key=sk_live_…', msg: ['GET /v1/orders?api_key=' + KEY + ' HTTP/1.1', 'Host: api.payments.test'].join(NL), hl: ['api_key='],
        note: 'A developer put the key in the query string "because it was easier to test in the browser".' },
      { from: 'p', to: 'p', label: 'write access log line', badge: 'Logged',
        msg: '203.0.113.7 - - [31/Oct/2026:09:12:44 +0000] "GET /v1/orders?api_key=' + KEY + ' HTTP/1.1" 200 812', hl: [KEY],
        note: 'Web servers, CDNs, proxies and APM tools log the <b>full URL</b> by default. Headers are usually not logged.',
        set: { p: { line: '…?api_key=' + KEY.slice(0, 14) + '…' } } },
      { from: 'p', to: 's', label: 'forward', msg: 'GET /v1/orders?api_key=' + KEY.slice(0, 14) + '… HTTP/1.1' },
      { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK', note: 'Works fine, so nobody notices.' },
      { from: 'a', to: 'p', label: 'reads exported logs', badge: 'Leak',
        note: 'URLs also end up in browser history, <code>Referer</code> headers, screenshots, and support tickets. Months later, someone with log access copies the key.',
        set: { a: { key: KEY.slice(0, 14) + '…' } } },
      { from: 'a', to: 's', label: 'GET /v1/orders  X-API-Key: (stolen)', msg: req('GET /v1/orders HTTP/1.1', KEY), hl: ['X-API-Key'] },
      { from: 's', to: 'a', kind: 'res', label: '200 OK: attacker is "acme-shop"', msg: 'HTTP/1.1 200 OK',
        note: 'An API key is a <b>bearer secret</b>: whoever has it is the app. Fix: header only, scan logs/repos for the <code>sk_live_</code> prefix, revoke and rotate.' },
    ]},
  ],
});
</script>`;

  const apiKeyGen = CSS + `
<div class="g2">
  <div class="card">
    <h4>① Create a key (dashboard)</h4>
    <div class="row">
      <label>type <select id="ty"><option value="sk">secret (server only)</option><option value="pk">publishable (browser ok)</option></select></label>
      <label>mode <select id="md"><option>live</option><option>test</option></select></label>
    </div>
    <div class="row" id="scopes">
      <label><input type="checkbox" value="orders:read" checked> orders:read</label>
      <label><input type="checkbox" value="orders:write"> orders:write</label>
      <label><input type="checkbox" value="refunds:write"> refunds:write</label>
    </div>
    <button id="gen">Generate key</button> <button id="rot">Rotate newest</button>
    <div id="shown"></div>
  </div>
  <div class="card">
    <h4>② What the server stores (api_keys)</h4>
    <div id="db" style="max-height:230px;overflow:auto"></div>
    <div class="mut">Only the hash + a short prefix/last-4 for display. The full key is shown <b>once</b>.</div>
  </div>
</div>
<div class="card">
  <h4>③ Send a request with a key</h4>
  <div class="row"><select id="call"><option>GET /v1/orders</option><option>POST /v1/orders</option><option>POST /v1/refunds</option></select>
    <input id="k" size="48" placeholder="paste a key here"> <button id="send">Send</button></div>
  <div class="g2"><pre class="dark" id="rq"></pre><div><ol class="trace" id="tr"></ol><div id="vd"></div></div></div>
</div>
<script>
` + H + `
const B62 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const rand = (n) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => B62[b % 62]).join('');
const db = [];
function render() {
  $('#db').innerHTML = '<table class="t mono"><tr><th>id</th><th>display</th><th>key_hash (sha256)</th><th>scopes</th><th>status</th></tr>' +
    db.map((r) => '<tr><td>' + r.id + '</td><td>' + r.prefix + '…' + r.last4 + '</td><td>' + r.hash.slice(0, 14) + '…</td><td>' +
      r.scopes.join(' ') + '</td><td><span class="pill ' + (r.status === 'active' ? 'ok' : r.status === 'revoked' ? 'bad' : 'mid') + '">' +
      r.status + '</span>' + (r.status !== 'revoked' ? ' <button data-rv="' + r.id + '">revoke</button>' : '') + '</td></tr>').join('') + '</table>';
}
function create() {
  const prefix = $('#ty').value + '_' + $('#md').value + '_';
  const key = prefix + rand(32);
  const scopes = Array.from(document.querySelectorAll('#scopes input:checked')).map((x) => x.value);
  db.push({ id: 'key_' + (db.length + 1), prefix, last4: key.slice(-4), hash: Auth.sha256hex(key), scopes, status: 'active' });
  $('#shown').innerHTML = '<div class="fb ok">Copy it now, you will not see it again:<div class="mono"><b>' + key + '</b></div>' +
    '<div class="mut">The <code>' + prefix + '</code> prefix tells humans and secret scanners (e.g. GitHub push protection) what this is.</div></div>';
  $('#k').value = key;
  render();
  return key;
}
$('#gen').onclick = create;
$('#rot').onclick = () => {
  const old = db.filter((r) => r.status === 'active').pop();
  const key = create();
  if (old) { old.status = 'expires in 24h'; render(); }
  $('#shown').innerHTML += '<div class="mut">Rotation: the new key is active and the old one keeps working for an overlap period, so you can deploy the new key without downtime. Then it is revoked.</div>';
};
$('#db').addEventListener('click', (e) => {
  const id = e.target.dataset.rv;
  if (!id) return;
  db.find((r) => r.id === id).status = 'revoked';
  render();
});
const NEED = { 'GET /v1/orders': 'orders:read', 'POST /v1/orders': 'orders:write', 'POST /v1/refunds': 'refunds:write' };
$('#send').onclick = () => {
  const key = $('#k').value.trim(), call = $('#call').value;
  $('#rq').textContent = [call + ' HTTP/1.1', 'Host: api.payments.test', 'X-API-Key: ' + key].join(NL);
  const steps = [], hsh = Auth.sha256hex(key);
  steps.push('sha256(key) = ' + hsh.slice(0, 16) + '…');
  const row = db.find((r) => r.hash === hsh);
  let verdict;
  if (!row) { steps.push('❌ no row with that hash'); verdict = ['bad', '401 Unauthorized: invalid_api_key']; }
  else {
    steps.push('✓ found ' + row.id + ' (' + row.prefix + '…' + row.last4 + ')');
    if (row.status === 'revoked') { steps.push('❌ status = revoked'); verdict = ['bad', '401 Unauthorized: key revoked']; }
    else {
      steps.push('✓ status = ' + row.status);
      if (row.prefix.startsWith('pk_') && call !== 'GET /v1/orders') { steps.push('❌ publishable keys are read-only'); verdict = ['bad', '403 Forbidden']; }
      else if (!row.scopes.includes(NEED[call])) { steps.push('❌ needs scope ' + NEED[call]); verdict = ['bad', '403 Forbidden: insufficient scope']; }
      else { steps.push('✓ has scope ' + NEED[call]); verdict = ['ok', '200 OK']; }
    }
  }
  $('#tr').innerHTML = steps.map((s) => '<li class="mono">' + esc(s) + '</li>').join('');
  $('#vd').innerHTML = '<div class="verdict ' + verdict[0] + '">' + verdict[1] + '</div>';
};
render();
$('#rq').textContent = 'Generate a key, then press Send.';
</script>`;

  const apiKeyExercise = (solved) => CSS + `
<div class="card">
  <h4>Fix this request so the key cannot leak into logs</h4>
  <div class="mut">The key is <code>sk_live_9fQ2mXv7Lp4Rt8Wz</code>. Keep calling <code>GET /v1/charges?limit=10</code> on <code>api.payments.test</code>.</div>
  <textarea id="t" rows="6" style="margin-top:6px">${solved
    ? 'GET /v1/charges?limit=10 HTTP/1.1\nHost: api.payments.test\nX-API-Key: sk_live_9fQ2mXv7Lp4Rt8Wz\nAccept: application/json'
    : 'GET /v1/charges?limit=10&api_key=sk_live_9fQ2mXv7Lp4Rt8Wz HTTP/1.1\nHost: api.payments.test\nAccept: application/json'}</textarea>
  <button id="chk">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const KEY = 'sk_live_9fQ2mXv7Lp4Rt8Wz';
$('#chk').onclick = () => {
  const lines = $('#t').value.split(NL).map((l) => l.trim());
  const first = lines[0] || '';
  const errs = [];
  if (!/^GET \\/v1\\/charges\\?limit=10 HTTP\\/1\\.1$/.test(first)) errs.push('Line 1 should be exactly <code>GET /v1/charges?limit=10 HTTP/1.1</code> (no key in the URL).');
  if (first.includes(KEY)) errs.push('The key is still in the request line: that is what access logs record.');
  if (!lines.some((l) => /^host:\\s*api\\.payments\\.test$/i.test(l))) errs.push('Missing <code>Host: api.payments.test</code>.');
  const inHeader = lines.slice(1).some((l) => new RegExp('^(x-api-key:\\\\s*|authorization:\\\\s*bearer\\\\s+)' + KEY + '$', 'i').test(l));
  if (!inHeader) errs.push('Put the key in a header: <code>X-API-Key: …</code> or <code>Authorization: Bearer …</code>.');
  const fb = $('#fb');
  fb.className = 'fb ' + (errs.length ? 'bad' : 'ok');
  fb.innerHTML = errs.length ? '❌ ' + errs.join('<br>❌ ') : '✅ The URL is clean and the key rides in a header that logs, Referer and history do not capture.';
};
</script>`;

  // =====================================================================
  // hmac-signing
  // =====================================================================
  const hmacFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const SECRET = 'whk_3c1f9a6e2b7d48a0';
const KID = 'ak_partner_42';
const TS = 1793448000;
const BODY = '{"amount":1000,"currency":"USD","to":"acct_9"}';
const EVIL = '{"amount":99000,"currency":"USD","to":"acct_666"}';
const canon = (body, ts) => ['POST', '/v1/payouts', String(ts), Auth.sha256hex(body)].join(NL);
const sig = (body, ts) => Auth.hmacSha256hex(SECRET, canon(body, ts));
const S = sig(BODY, TS);
const httpReq = (body, ts, s) => ['POST /v1/payouts HTTP/1.1', 'Host: api.bank.test', 'Content-Type: application/json',
  'X-Key-Id: ' + KID, 'X-Timestamp: ' + ts, 'X-Signature: ' + s, '', body].join(NL);
const showCanon = (body, ts) => ['# canonical string (4 lines)', canon(body, ts), '', '# = method \\\\n path \\\\n timestamp \\\\n sha256(body)'].join(NL);
const srvCheck = (body, ts, now, got) => {
  const exp = sig(body, ts);
  return ['now = ' + now + '   |now - X-Timestamp| = ' + Math.abs(now - ts) + 's   (window 300s) ' + (Math.abs(now - ts) <= 300 ? '✓' : '✗'),
    'secret = secrets["' + KID + '"]', 'sha256(received body) = ' + Auth.sha256hex(body).slice(0, 24) + '…',
    'expected = HMAC-SHA256(secret, canonical) = ' + exp.slice(0, 24) + '…', 'received = ' + got.slice(0, 24) + '…',
    'constant-time equal? ' + (exp === got ? '✓ yes' : '✗ NO')].join(NL);
};
const store = { [KID]: SECRET };
const c1 = { from: 'c', to: 'c', label: 'build canonical string', badge: 'Canonicalize', msg: showCanon(BODY, TS),
  note: 'Both sides must build <b>exactly</b> the same bytes. The body is represented by its SHA-256, so any change to it changes the string.' };
const c2 = { from: 'c', to: 'c', label: 'signature = HMAC-SHA256(secret, canonical)', badge: 'HMAC',
  msg: ['HMAC-SHA256("' + SECRET + '", canonical)', '  = ' + S].join(NL), hl: [S],
  note: 'HMAC mixes the secret into a hash of the message. Without the secret, nobody can produce a matching signature. The <b>secret never leaves</b> the client.' };
Seq.mount('#flow', {
  title: 'HMAC request signing (simplified SigV4-style)',
  actors: [
    { id: 'c', label: 'Partner client', icon: '🧩', store: { [KID]: SECRET }, storeLabel: 'Client secret' },
    { id: 's', label: 'api.bank.test', icon: '🏦', store: store, storeLabel: 'Server secrets by key id' },
  ],
  scenarios: [
    { name: '✅ Signed request', steps: [c1, c2,
      { from: 'c', to: 's', label: 'POST /v1/payouts + X-Signature', msg: httpReq(BODY, TS, S), hl: ['X-Key-Id', 'X-Timestamp', 'X-Signature'],
        note: 'Sent: key id (who), timestamp (when), signature (proof). <b>Not</b> sent: the secret.' },
      { from: 's', to: 's', label: 'check clock window, recompute HMAC, compare', msg: srvCheck(BODY, TS, TS + 2, S),
        note: 'The server rebuilds the canonical string from what it <i>received</i>, signs it with its copy of the secret, and compares in constant time.' },
      { from: 's', to: 'c', kind: 'res', label: '201 Created', msg: ['HTTP/1.1 201 Created', 'Content-Type: application/json', '', '{"id":"po_77","status":"pending"}'].join(NL) },
    ]},
    { name: '🧨 Tampered in transit', actors: [
        { id: 'c', label: 'Partner client', icon: '🧩', store: { [KID]: SECRET }, storeLabel: 'Client secret' },
        { id: 'm', label: 'Compromised proxy', icon: '🦹', store: {}, storeLabel: 'Attacker (no secret)' },
        { id: 's', label: 'api.bank.test', icon: '🏦', store: store, storeLabel: 'Server secrets by key id' },
      ], steps: [c1, c2,
      { from: 'c', to: 'm', label: 'POST amount=1000', msg: httpReq(BODY, TS, S), hl: ['"amount":1000'] },
      { from: 'm', to: 'm', label: 'edit body: amount=99000, to=acct_666', badge: 'Tamper',
        msg: ['- ' + BODY, '+ ' + EVIL, '', '# headers (incl. X-Signature) left untouched:', '# the attacker cannot compute a new one'].join(NL), hl: ['99000'] },
      { from: 'm', to: 's', label: 'POST amount=99000 (old signature)', msg: httpReq(EVIL, TS, S), hl: ['"amount":99000', 'X-Signature'] },
      { from: 's', to: 's', label: 'sha256(body) changed → HMAC mismatch', badge: 'Mismatch', msg: srvCheck(EVIL, TS, TS + 2, S),
        note: 'The server hashes the body <i>it received</i>. Different body → different canonical string → different HMAC.' },
      { from: 's', to: 'm', kind: 'err', label: '401 signature_mismatch', msg: ['HTTP/1.1 401 Unauthorized', 'Content-Type: application/json', '', '{"error":"signature_mismatch"}'].join(NL),
        note: 'Integrity: a signature protects the exact request. Compare with an API key, which only proves "I know the key", not "this body is untouched".' },
    ]},
    { name: '🔁 Replay 10 min later', actors: [
        { id: 'c', label: 'Partner client', icon: '🧩', store: { [KID]: SECRET }, storeLabel: 'Client secret' },
        { id: 'e', label: 'Eve (recorded it)', icon: '🕵️', store: {}, storeLabel: 'Eve' },
        { id: 's', label: 'api.bank.test', icon: '🏦', store: store, storeLabel: 'Server secrets by key id' },
      ], steps: [
      { from: 'c', to: 's', label: 'original signed POST (t=' + TS + ')', msg: httpReq(BODY, TS, S) },
      { from: 'e', to: 'e', label: 'copy the whole request', badge: 'Record', set: { e: { copy: 'POST /v1/payouts, X-Signature ' + S.slice(0, 10) + '…' } },
        note: 'Eve cannot change the request, but she could <b>send it again</b> to pay twice.' },
      { from: 'e', to: 's', label: 'identical POST at t+600s', msg: httpReq(BODY, TS, S), hl: ['X-Timestamp'] },
      { from: 's', to: 's', label: 'HMAC ✓ but timestamp too old ✗', badge: 'Replay!', msg: srvCheck(BODY, TS, TS + 600, S),
        note: 'The signature is still valid (same bytes), but the timestamp is <b>inside</b> the signed string, so Eve cannot refresh it. 600 s &gt; 300 s window → reject.' },
      { from: 's', to: 'e', kind: 'err', label: '401 request_expired', msg: ['HTTP/1.1 401 Unauthorized', '', '{"error":"request_expired"}'].join(NL),
        note: 'Inside the 5-minute window a replay would still pass. Stronger APIs also store a nonce / request id (or an <code>Idempotency-Key</code>) and reject duplicates.' },
    ]},
  ],
});
</script>`;

  const hmacLab = CSS + `
<div class="g3">
  <div class="card">
    <h4>🧩 Client signs</h4>
    <label>secret</label><input id="cs" value="whk_3c1f9a6e2b7d48a0" style="width:100%;box-sizing:border-box">
    <div class="row" style="margin-top:4px"><label>method <select id="m"><option>POST</option><option>PUT</option></select></label>
      <label>path <input id="pa" value="/v1/payouts" size="11"></label></div>
    <label>body</label><textarea id="bo" rows="3">{"amount":1000,"currency":"USD","to":"acct_9"}</textarea>
    <button id="sign">✍️ Sign &amp; send</button>
    <pre class="dark" id="can" style="font-size:11px"></pre>
  </div>
  <div class="card">
    <h4>🌐 On the wire (editable!)</h4>
    <textarea id="wire" rows="11" style="font-size:11.5px"></textarea>
    <div class="row" style="margin-top:4px">
      <button id="t1">💰 amount → 99000</button>
      <button id="t2">⏩ replay +10 min</button>
      <button id="t3">🧭 path → /v1/admin</button>
    </div>
    <div class="mut">Edit anything above, or use a button, then verify →</div>
  </div>
  <div class="card">
    <h4>🏦 Server verifies</h4>
    <div class="row"><label>server clock <b id="clk"></b></label></div>
    <label><input type="checkbox" id="ws"> server has a different (rotated) secret</label><br>
    <label><input type="checkbox" id="nv"> naive compare (<code>==</code>, leaks timing)</label><br>
    <button id="ver">🔍 Verify</button>
    <ol class="trace mono" id="tr" style="font-size:11.5px"></ol>
    <div id="vd"></div>
  </div>
</div>
<script>
` + H + `
const T0 = 1793448000;
let now = T0;
const canon = (m, p, ts, body) => [m, p, String(ts), Auth.sha256hex(body)].join(NL);
function sign() {
  now = T0;
  const m = $('#m').value, p = $('#pa').value, body = $('#bo').value;
  const c = canon(m, p, T0, body);
  const s = Auth.hmacSha256hex($('#cs').value, c);
  $('#can').textContent = '# canonical string' + NL + c + NL + NL + '# HMAC-SHA256(secret, canonical) =' + NL + s;
  $('#wire').value = [m + ' ' + p + ' HTTP/1.1', 'Host: api.bank.test', 'Content-Type: application/json', 'X-Key-Id: ak_partner_42',
    'X-Timestamp: ' + T0, 'X-Signature: ' + s, '', body].join(NL);
  $('#clk').textContent = String(now);
  $('#tr').innerHTML = ''; $('#vd').innerHTML = '';
}
function parse(raw) {
  const i = raw.indexOf(NL + NL);
  const head = (i < 0 ? raw : raw.slice(0, i)).split(NL), body = i < 0 ? '' : raw.slice(i + 2);
  const [m, p] = head[0].split(' ');
  const h = {};
  head.slice(1).forEach((l) => { const k = l.indexOf(':'); if (k > 0) h[l.slice(0, k).trim().toLowerCase()] = l.slice(k + 1).trim(); });
  return { m, p, h, body };
}
function ctEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function verify() {
  const r = parse($('#wire').value);
  const out = [];
  const add = (ok, t) => out.push('<li>' + (ok ? '✅ ' : '❌ ') + t + '</li>');
  const ts = parseInt(r.h['x-timestamp'], 10), sigIn = r.h['x-signature'] || '';
  const secret = $('#ws').checked ? 'whk_NEW_ROTATED_77aa' : 'whk_3c1f9a6e2b7d48a0';
  let ok = true;
  if (r.h['x-key-id'] !== 'ak_partner_42') { add(false, 'unknown X-Key-Id'); ok = false; }
  else add(true, '1. key id ak_partner_42 → secret found');
  const age = Math.abs(now - ts);
  if (!(age <= 300)) { add(false, '2. timestamp age ' + (isNaN(age) ? '?' : age) + 's &gt; 300s window'); ok = false; }
  else add(true, '2. timestamp age ' + age + 's ≤ 300s');
  const bh = Auth.sha256hex(r.body);
  add(true, '3. sha256(body) = ' + bh.slice(0, 16) + '…');
  const c = canon(r.m, r.p, r.h['x-timestamp'], r.body);
  add(true, '4. canonical = ' + esc(c.split(NL).slice(0, 3).join(' ⏎ ')) + ' ⏎ …');
  const exp = Auth.hmacSha256hex(secret, c);
  add(true, '5. expected HMAC = ' + exp.slice(0, 16) + '…<br>&nbsp;&nbsp;&nbsp;received&nbsp;&nbsp;HMAC = ' + esc(sigIn.slice(0, 16)) + '…');
  const eq = $('#nv').checked ? exp == sigIn : ctEqual(exp, sigIn);
  if (!eq) { add(false, '6. ' + ($('#nv').checked ? 'naive ==' : 'constant-time compare') + ': mismatch'); ok = false; }
  else add(true, '6. ' + ($('#nv').checked ? 'naive == (works, but timing can leak how many leading chars matched)' : 'constant-time compare: equal'));
  $('#tr').innerHTML = out.join('');
  $('#vd').innerHTML = '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'ACCEPT → 201' : 'REJECT → 401') + '</div>';
}
$('#sign').onclick = sign;
$('#ver').onclick = verify;
$('#t1').onclick = () => { $('#wire').value = $('#wire').value.replace('"amount":1000', '"amount":99000'); verify(); };
$('#t2').onclick = () => { now = T0 + 600; $('#clk').textContent = now + ' (+600s)'; verify(); };
$('#t3').onclick = () => { $('#wire').value = $('#wire').value.replace(/^(\\w+) \\S+/, '$1 /v1/admin'); verify(); };
sign();
</script>`;

  const webhookLab = CSS + `
<div class="row">
  <label>Provider style <select id="pv"><option value="gh">GitHub: X-Hub-Signature-256</option><option value="st">Stripe: Stripe-Signature</option></select></label>
  <label>shared webhook secret <input id="sec" value="whsec_test_8Hk2" size="16"></label>
</div>
<div class="g2">
  <div class="card">
    <h4>📮 Provider sends (POST to your /webhook)</h4>
    <pre class="dark" id="sent" style="max-height:260px;overflow:auto"></pre>
  </div>
  <div class="card">
    <h4>🖥 Your endpoint verifies</h4>
    <label>raw body as received (edit to tamper)</label>
    <textarea id="raw" rows="4"></textarea>
    <label><input type="checkbox" id="reparse"> 🐞 bug: verify <code>JSON.stringify(req.body)</code> (parsed + re-serialized) instead of the raw bytes</label><br>
    <label>receive delay <select id="dl"><option value="3">3 s</option><option value="400">400 s</option><option value="7200">2 h</option></select></label>
    <ol class="trace mono" id="tr" style="font-size:11.5px"></ol>
    <div id="vd"></div>
  </div>
</div>
<script>
` + H + `
const T = 1793448000;
const BODY = '{\\n  "id": "evt_1Q9",\\n  "type": "order.paid",\\n  "data": { "amount": 2000 }\\n}';
let header = '';
function send() {
  const sec = $('#sec').value, pv = $('#pv').value;
  let lines;
  if (pv === 'gh') {
    header = 'sha256=' + Auth.hmacSha256hex(sec, BODY);
    lines = ['POST /webhook HTTP/1.1', 'Host: shop.test', 'User-Agent: GitHub-Hookshot/abc123', 'X-GitHub-Event: push',
      'X-GitHub-Delivery: 72d3162e-cc78-11e3-81ab-4c9367dc0958', 'X-Hub-Signature-256: ' + header, 'Content-Type: application/json'];
  } else {
    header = 't=' + T + ',v1=' + Auth.hmacSha256hex(sec, T + '.' + BODY);
    lines = ['POST /webhook HTTP/1.1', 'Host: shop.test', 'User-Agent: Stripe/1.0 (+https://stripe.com/docs/webhooks)',
      'Stripe-Signature: ' + header, 'Content-Type: application/json; charset=utf-8'];
  }
  lines.push('', BODY,
    pv === 'gh' ? '# signed bytes: the raw body' : '# signed bytes: "' + T + '." + raw body');
  $('#sent').innerHTML = Seq.colorMsg(lines.join(NL), [pv === 'gh' ? 'X-Hub-Signature-256' : 'Stripe-Signature']);
  $('#raw').value = BODY;
  verify();
}
function verify() {
  const sec = $('#sec').value, pv = $('#pv').value, now = T + parseInt($('#dl').value, 10);
  let body = $('#raw').value;
  const out = [];
  const add = (ok, t) => out.push('<li>' + (ok === null ? '➖ ' : ok ? '✅ ' : '❌ ') + t + '</li>');
  if ($('#reparse').checked) {
    try { body = JSON.stringify(JSON.parse(body)); add(null, 're-serialized body: ' + esc(body.slice(0, 40)) + '…'); }
    catch (e) { add(false, 'body is not JSON'); }
  }
  let ok;
  if (pv === 'gh') {
    const exp = 'sha256=' + Auth.hmacSha256hex(sec, body);
    add(null, 'expected = sha256=HMAC(secret, body) = ' + exp.slice(7, 23) + '…');
    add(null, 'header&nbsp;&nbsp; = ' + header.slice(7, 23) + '…');
    ok = exp === header;
    add(ok, ok ? 'match (compare with crypto.timingSafeEqual)' : 'mismatch');
    add(null, 'no timestamp in the signature: dedupe replays by X-GitHub-Delivery id');
  } else {
    const parts = Object.fromEntries(header.split(',').map((kv) => kv.split('=')));
    const age = now - parseInt(parts.t, 10);
    const exp = Auth.hmacSha256hex(sec, parts.t + '.' + body);
    add(null, 'parse header → t=' + parts.t + ', v1=' + parts.v1.slice(0, 12) + '…');
    add(null, 'expected v1 = HMAC(secret, t + "." + body) = ' + exp.slice(0, 12) + '…');
    const sigOk = exp === parts.v1;
    add(sigOk, sigOk ? 'signature matches' : 'signature mismatch');
    const fresh = age <= 300;
    add(fresh, 'age ' + age + 's ' + (fresh ? '≤' : '&gt;') + ' 300s tolerance (Stripe library default)');
    ok = sigOk && fresh;
  }
  $('#tr').innerHTML = out.join('');
  $('#vd').innerHTML = '<div class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? '200: process event' : '400: reject, do not process') + '</div>';
}
$('#pv').onchange = send;
$('#sec').addEventListener('change', send);
['#raw', '#reparse', '#dl'].forEach((s) => $(s).addEventListener('input', verify));
send();
</script>`;

  const hmacExercise = (solved) => CSS + `
<div class="card">
  <h4>Build the canonical string the server will sign</h4>
  <pre class="dark" id="rq"></pre>
  <div class="mut">Format (one item per line, no trailing newline): <code>METHOD</code> ⏎ <code>PATH</code> ⏎ <code>X-Timestamp</code> ⏎ <code>hex(sha256(body))</code>.
    Use the helper to hash the body.</div>
  <div class="row" style="margin-top:6px"><label>sha256 helper <input id="hp" size="40" placeholder="type or paste text"></label></div>
  <div class="mono" id="ho"></div>
  <label>Your canonical string</label>
  <textarea id="cs" rows="4">${solved ? '@@SOL' : 'PUT\n'}</textarea>
  <button id="chk">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const SECRET = 'whk_3c1f9a6e2b7d48a0', TS = '1793451600', BODY = '{"limit":5000}';
const SOL = ['PUT', '/v1/cards/card_7/limit', TS, Auth.sha256hex(BODY)].join(NL);
const SIG = Auth.hmacSha256hex(SECRET, SOL);
if ($('#cs').value === '@@SOL') $('#cs').value = SOL;
$('#rq').textContent = ['PUT /v1/cards/card_7/limit HTTP/1.1', 'Host: api.bank.test', 'Content-Type: application/json',
  'X-Key-Id: ak_partner_42', 'X-Timestamp: ' + TS, 'X-Signature: ' + SIG, '', BODY].join(NL);
const hp = () => ($('#ho').innerHTML = 'sha256 = <mark>' + Auth.sha256hex($('#hp').value) + '</mark>');
$('#hp').addEventListener('input', hp);
hp();
$('#chk').onclick = () => {
  const mine = $('#cs').value.replace(/\\r/g, '');
  const got = Auth.hmacSha256hex(SECRET, mine);
  const fb = $('#fb');
  if (got === SIG) {
    fb.className = 'fb ok';
    fb.innerHTML = '✅ HMAC(secret, your string) = ' + got.slice(0, 20) + '… equals X-Signature. Byte-for-byte canonicalization is the whole game.';
    return;
  }
  const a = mine.split(NL), b = SOL.split(NL);
  const names = ['method', 'path', 'timestamp', 'sha256(body)'];
  const msgs = names.map((n, i) => (a[i] === b[i] ? '✅ ' : '❌ ') + 'line ' + (i + 1) + ' (' + n + ')');
  if (a.length > 4) msgs.push('❌ extra lines / trailing newline');
  fb.className = 'fb bad';
  fb.innerHTML = 'HMAC(secret, your string) = ' + got.slice(0, 20) + '… ≠ X-Signature.<br>' + msgs.join('<br>');
};
</script>`;

  // =====================================================================
  // bearer-tokens
  // =====================================================================
  const bearerFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const now = 1793448000;
const tok = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt', kid: 'k1' },
  { iss: 'https://auth.shop.test', sub: 'user_42', aud: 'https://api.shop.test', scope: 'orders:read', iat: now - 60, exp: now + 840 }, 'demo');
const old = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt', kid: 'k1' },
  { iss: 'https://auth.shop.test', sub: 'user_42', aud: 'https://api.shop.test', scope: 'orders:read', iat: now - 3600, exp: now - 2700 }, 'demo');
const short = (t) => t.slice(0, 28) + '…' + t.slice(-8);
const get = (path, t) => ['GET ' + path + ' HTTP/1.1', 'Host: api.shop.test'].concat(t ? ['Authorization: Bearer ' + t] : []).concat(['Accept: application/json']).join(NL);
const err401 = (extra) => ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer realm="api.shop.test"' + (extra ? ',' : '')].concat(extra ? ['    ' + extra.join(',' + NL + '    ')] : []).concat(['Cache-Control: no-store']).join(NL);
Seq.mount('#flow', {
  title: 'Bearer tokens (RFC 6750): possession = access',
  actors: [
    { id: 'c', label: 'App', icon: '📱', store: { access_token: short(tok) }, storeLabel: 'App memory' },
    { id: 'a', label: 'api.shop.test', icon: '🛒', store: { 'trusts iss': 'https://auth.shop.test' }, storeLabel: 'Resource server' },
  ],
  scenarios: [
    { name: '✅ Valid token', steps: [
      { from: 'c', to: 'a', label: 'GET /orders  Authorization: Bearer eyJ…', msg: get('/orders', tok), hl: ['Authorization: Bearer'],
        note: 'The scheme word is <code>Bearer</code>, then one space, then the token. "Bearer" = "whoever <b>bears</b> (carries) this token".' },
      { from: 'a', to: 'a', label: 'validate: signature, iss, aud, exp, scope',
        msg: ['header: ' + JSON.stringify(Auth.jwtDecode(tok).header), 'payload: ' + JSON.stringify(Auth.jwtDecode(tok).payload, null, 1).split(NL).join(' '), '', 'exp - now = 840s  ✓  scope orders:read ✓'].join(NL),
        note: 'This one is a self-contained JWT, so the API checks it locally (lesson "Tokens & JWT"). Nothing here asks <i>who</i> sent it.' },
      { from: 'a', to: 'c', kind: 'res', label: '200 OK', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"id":101,"total":42.00}]'].join(NL) },
    ]},
    { name: '⏰ Expired', actors: [
        { id: 'c', label: 'App', icon: '📱', store: { access_token: short(old) }, storeLabel: 'App memory' },
        { id: 'a', label: 'api.shop.test', icon: '🛒', store: { 'trusts iss': 'https://auth.shop.test' }, storeLabel: 'Resource server' },
      ], steps: [
      { from: 'c', to: 'a', label: 'GET /orders + old token', msg: get('/orders', old), hl: ['Authorization: Bearer'] },
      { from: 'a', to: 'a', label: 'exp ' + (now - 2700) + ' < now ✗', msg: 'exp = ' + (now - 2700) + '  now = ' + now + '  → expired 45 min ago' },
      { from: 'a', to: 'c', kind: 'err', label: '401 error="invalid_token"', msg: err401(['error="invalid_token"', 'error_description="The access token expired"']), hl: ['error="invalid_token"'],
        note: '<code>invalid_token</code> = expired, revoked, malformed or otherwise invalid → <b>401</b>. A well-behaved client now refreshes the token and retries once.' },
    ]},
    { name: '❓ Missing', steps: [
      { from: 'c', to: 'a', label: 'GET /orders (no Authorization)', msg: get('/orders'), note: 'A bug in the app forgot to attach the header.' },
      { from: 'a', to: 'c', kind: 'err', label: '401 + WWW-Authenticate: Bearer', msg: err401(), hl: ['WWW-Authenticate'],
        note: 'RFC 6750 §3.1: if the request has <b>no</b> authentication info, the server SHOULD NOT include an error code. Just the challenge: "use Bearer here".' },
    ]},
    { name: '🔒 insufficient_scope', steps: [
      { from: 'c', to: 'a', label: 'DELETE /orders/101', msg: ['DELETE /orders/101 HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + tok].join(NL) },
      { from: 'a', to: 'a', label: 'token valid, but scope = orders:read', note: 'Authentication succeeded. Authorization failed.' },
      { from: 'a', to: 'c', kind: 'err', label: '403 error="insufficient_scope"',
        msg: ['HTTP/1.1 403 Forbidden', 'WWW-Authenticate: Bearer realm="api.shop.test",', '    error="insufficient_scope",', '    scope="orders:write"'].join(NL), hl: ['insufficient_scope'],
        note: '403 + <code>insufficient_scope</code>, optionally naming the scope needed. (Malformed requests get 400 + <code>invalid_request</code>.)' },
    ]},
    { name: '🦹 Stolen token works', actors: [
        { id: 'c', label: 'App', icon: '📱', store: { access_token: short(tok) }, storeLabel: 'App memory' },
        { id: 'x', label: 'Attacker', icon: '🦹', store: {}, storeLabel: 'Attacker' },
        { id: 'a', label: 'api.shop.test', icon: '🛒', store: { 'trusts iss': 'https://auth.shop.test' }, storeLabel: 'Resource server' },
      ], steps: [
      { from: 'c', to: 'x', kind: 'info', label: 'token leaks (XSS, log, URL…)', badge: 'Leak', set: { x: { access_token: short(tok) } },
        note: 'Say the app once did <code>GET /export?access_token=…</code> and the URL ended up in a log. (RFC 6750 says don\\'t put tokens in URLs. OAuth 2.1 drops that option completely.)' },
      { from: 'x', to: 'a', label: 'GET /orders  Bearer (stolen)', msg: get('/orders', tok), hl: ['Authorization: Bearer'] },
      { from: 'a', to: 'x', kind: 'res', label: '200 OK: attacker gets the data', msg: ['HTTP/1.1 200 OK', '', '[{"id":101,"total":42.00}]'].join(NL),
        note: 'Same bytes, same result. A bearer token is like <b>cash</b>: no ID check. Defences: TLS only, short <code>exp</code>, narrow scope/audience, and sender-constrained tokens (DPoP RFC 9449, mTLS RFC 8705).' },
    ]},
  ],
});
</script>`;

  const opaqueVsJwt = CSS + `
<div id="flow"></div>
<script>
` + H + `
const now = 1793448000;
const opaque = '2YotnFZFEjr1zCsicMWpAA';
const jwt = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt' }, { iss: 'https://auth.shop.test', sub: 'user_42', aud: 'https://api.shop.test', scope: 'orders:read', exp: now + 900 }, 'demo');
Seq.mount('#flow', {
  title: 'Opaque vs self-contained bearer tokens',
  actors: [
    { id: 'c', label: 'App', icon: '📱' },
    { id: 'a', label: 'API', icon: '🛒', store: {}, storeLabel: 'API cache' },
    { id: 'z', label: 'Auth server', icon: '🔑', store: { [opaque]: 'user_42, orders:read, exp ' + (now + 900) }, storeLabel: 'Token DB' },
  ],
  scenarios: [
    { name: '🎫 Opaque token + introspection', steps: [
      { from: 'c', to: 'a', label: 'GET /orders  Bearer 2YotnF…', msg: ['GET /orders HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + opaque].join(NL), hl: [opaque],
        note: 'An opaque token is a random <b>reference</b>, like a coat-check ticket. The API cannot read anything from it.' },
      { from: 'a', to: 'z', kind: 'back', label: 'POST /introspect (RFC 7662)',
        msg: ['POST /introspect HTTP/1.1', 'Host: auth.shop.test', 'Authorization: Basic ' + Auth.b64('orders-api:api-secret'), 'Content-Type: application/x-www-form-urlencoded', '', 'token=' + opaque + '&token_type_hint=access_token'].join(NL), hl: ['token='],
        note: 'So it asks the auth server, server-to-server. The API authenticates itself (here with Basic, as you learned!).' },
      { from: 'z', to: 'a', kind: 'back', label: '{"active":true, …}',
        msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', JSON.stringify({ active: true, sub: 'user_42', scope: 'orders:read', client_id: 'shop-app', exp: now + 900 }, null, 2)].join(NL), hl: ['"active": true'],
        set: { a: { [opaque]: 'active (cache 60s)' } }, note: 'Revocation is instant: delete the row and the next introspection says <code>{"active":false}</code>. Cost: an extra network call (often cached briefly).' },
      { from: 'a', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK' },
    ]},
    { name: '📦 Self-contained JWT', steps: [
      { from: 'c', to: 'a', label: 'GET /orders  Bearer eyJ…', msg: ['GET /orders HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + jwt].join(NL), hl: ['Bearer'],
        note: 'A self-contained token carries its own claims plus a signature, like a <b>signed passport</b>.' },
      { from: 'a', to: 'a', label: 'decode + verify signature locally', msg: ['payload = ' + JSON.stringify(Auth.jwtDecode(jwt).payload, null, 2), '', 'signature ✓  exp ✓  aud ✓'].join(NL),
        note: 'No call to the auth server: fast and scalable. But the auth server cannot "un-sign" it, so it stays valid until <code>exp</code>.' },
      { from: 'a', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK' },
    ]},
  ],
});
</script>`;

  const bearerExercise = (solved) => {
    const ans = solved ? [0, 1, 2, 3] : [-1, -1, -1, -1];
    return CSS + `
<div class="card">
  <h4>Pick the correct response for each request to <code>api.shop.test</code></h4>
  <table class="t" id="tb"></table>
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const OPTS = ['401 + WWW-Authenticate: Bearer realm="api" (no error code)', '401 + Bearer error="invalid_token"',
  '403 + Bearer error="insufficient_scope"', '400 + Bearer error="invalid_request"', '200 OK'];
const CASES = [
  ['GET /orders with no Authorization header at all', 0],
  ['GET /orders with a token whose exp passed 3 minutes ago', 1],
  ['DELETE /orders/7 with a valid token whose scope is only "orders:read"', 2],
  ['GET /orders with the token BOTH in Authorization and in ?access_token= (two methods at once)', 3],
];
const PRE = ` + JSON.stringify(ans) + `;
$('#tb').innerHTML = '<tr><th>Request</th><th>Response</th></tr>' + CASES.map((c, i) => '<tr><td>' + c[0] + '</td><td><select id="s' + i + '"><option value="-1">choose…</option>' +
  OPTS.map((o, j) => '<option value="' + j + '"' + (PRE[i] === j ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></td></tr>').join('');
const WHY = ['RFC 6750 §3.1: with no credentials, send only the challenge.', 'Expired/revoked/bad signature → invalid_token (401).',
  'Valid token, not enough privilege → insufficient_scope (403).', 'More than one method to send a token is a malformed request → invalid_request (400).'];
$('#chk').onclick = () => {
  let n = 0;
  const lines = CASES.map((c, i) => { const ok = +$('#s' + i).value === c[1]; if (ok) n++; return (ok ? '✅ ' : '❌ ') + (i + 1) + '. ' + (ok ? WHY[i] : 'not quite'); });
  $('#fb').className = 'fb ' + (n === 4 ? 'ok' : 'bad');
  $('#fb').innerHTML = n + '/4<br>' + lines.join('<br>');
};
</script>`;
  };

  // =====================================================================
  // mtls
  // =====================================================================
  const mtlsFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const thumb = Auth.sha256b64url('DER bytes of cert CN=fintech-app serial 0x4F2A');
const thumbEve = Auth.sha256b64url('DER bytes of cert CN=eve serial 0x0BAD');
const tls = (lines) => lines.join(NL);
const hello = { from: 'c', to: 's', label: 'ClientHello', msg: tls(['ClientHello', 'supported_versions: TLS 1.3', 'server_name (SNI): api.bank.test',
  'key_share: x25519 <client public value>', 'signature_algorithms: ecdsa_secp256r1_sha256, rsa_pss_rsae_sha256, …', 'cipher_suites: TLS_AES_128_GCM_SHA256, …']),
  note: 'Same as normal TLS so far. Everything after ServerHello is encrypted (shown in <code>{braces}</code>).' };
const sh = { from: 's', to: 'c', kind: 'res', label: 'ServerHello + {EncryptedExtensions}', msg: tls(['ServerHello', 'key_share: x25519 <server public value>', '', '{EncryptedExtensions}', '# both sides now derive handshake keys']) };
const creq = { from: 's', to: 'c', kind: 'res', label: '{CertificateRequest}  ← the mTLS part', badge: 'Ask for client cert',
  msg: tls(['{CertificateRequest}', 'certificate_authorities: CN=Bank Partner CA', 'signature_algorithms: ecdsa_secp256r1_sha256, rsa_pss_rsae_sha256']),
  hl: ['CertificateRequest'], note: 'The server asks the client to prove who it is, and lists which CAs it trusts. Ordinary websites never send this message.' };
const scert = { from: 's', to: 'c', kind: 'res', label: '{Certificate} {CertificateVerify} {Finished}',
  msg: tls(['{Certificate}  CN=api.bank.test  ← issued by a public CA', '{CertificateVerify}  signature over handshake with server private key', '{Finished}']),
  note: 'The usual server authentication.' };
const chk = { from: 'c', to: 'c', label: 'verify server cert (normal TLS)', note: 'Chain to a trusted root, hostname = api.bank.test, not expired.' };
const ccert = { from: 'c', to: 's', label: '{Certificate} client cert chain', badge: 'Client cert',
  msg: tls(['{Certificate}', 'Subject: CN=fintech-app, O=Fintech Ltd', 'SAN: URI:spiffe://partners.bank.test/fintech-app', 'Issuer: CN=Bank Partner CA', 'Validity: 2026-09-01 → 2026-12-01', 'Public key: EC P-256']), hl: ['Subject', 'Issuer'],
  note: 'The certificate is <b>public</b> info. Sending it alone proves nothing, anyone could copy it.' };
const cver = { from: 'c', to: 's', label: '{CertificateVerify} + {Finished}', badge: 'Proof of key',
  msg: tls(['{CertificateVerify}', 'algorithm: ecdsa_secp256r1_sha256', 'signature: ECDSA(client_private_key, hash(handshake transcript so far))', '', '{Finished}']), hl: ['CertificateVerify'],
  note: '<b>This</b> is the proof: a signature over this unique handshake, made with the private key matching the cert. It cannot be replayed into another connection.' };
const sval = { from: 's', to: 's', label: 'validate client cert + signature → identity', msg: tls(['chain → CN=Bank Partner CA (trusted)     ✓', 'validity period                          ✓', 'revocation (CRL / OCSP)                  ✓', 'CertificateVerify signature              ✓', 'identity = spiffe://partners.bank.test/fintech-app']),
  set: { s: { 'peer identity': 'fintech-app' } } };
const app = { from: 'c', to: 's', label: 'GET /accounts (inside the tunnel)', msg: tls(['GET /accounts HTTP/1.1', 'Host: api.bank.test', '# no password, no API key: the TLS layer already authenticated the client']) };
const ok = { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: tls(['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"iban":"GB33BUKB20201555555555"}]']) };
const A = [
  { id: 'c', label: 'fintech-app', icon: '🧩', store: { cert: 'CN=fintech-app', 'private key': '🔒 (never sent)' }, storeLabel: 'Client' },
  { id: 's', label: 'api.bank.test', icon: '🏦', store: { trusts: 'CN=Bank Partner CA' }, storeLabel: 'Server' },
];
Seq.mount('#flow', {
  title: 'Mutual TLS (TLS 1.3): both sides present certificates',
  actors: A,
  scenarios: [
    { name: '✅ Valid client cert', steps: [hello, sh, creq, scert, chk, ccert, cver, sval, app, ok] },
    { name: '❌ No client cert', steps: [hello, sh, creq, scert, chk,
      { from: 'c', to: 's', label: '{Certificate} (empty)', msg: tls(['{Certificate}', '  certificate_list: <empty>', '# e.g. a plain browser with no cert installed']) },
      { from: 's', to: 'c', kind: 'err', label: 'alert: certificate_required (116)', msg: tls(['Alert (fatal)', 'description: certificate_required (116)', '# connection closed, no HTTP request ever happens']),
        note: 'The failure happens <b>before HTTP</b>. There is no 401 page: the connection just dies.' }] },
    { name: '❌ Untrusted CA', steps: [hello, sh, creq, scert, chk,
      Object.assign({}, ccert, { msg: tls(['{Certificate}', 'Subject: CN=fintech-app', 'Issuer: CN=Eve Homemade CA  ← self-made']), hl: ['Eve Homemade CA'] }),
      cver,
      { from: 's', to: 'c', kind: 'err', label: 'alert: unknown_ca (48)', msg: tls(['Alert (fatal)', 'description: unknown_ca (48)']),
        note: 'Anyone can create a certificate that says "CN=fintech-app". What matters is <b>who signed it</b>: only certs chaining to the trusted CA are accepted.' }] },
    { name: '🔗 Certificate-bound token (RFC 8705)', actors: [
        { id: 'c', label: 'fintech-app', icon: '🧩', store: { cert: 'CN=fintech-app' }, storeLabel: 'Client' },
        { id: 'z', label: 'Auth server', icon: '🔑', store: {}, storeLabel: 'AS' },
        { id: 's', label: 'api.bank.test', icon: '🏦', store: {}, storeLabel: 'API' },
        { id: 'x', label: 'Attacker', icon: '🦹', store: { cert: 'CN=eve (own key)' }, storeLabel: 'Attacker' },
      ], steps: [
      { from: 'c', to: 'z', label: 'POST /token over mTLS', msg: tls(['POST /token HTTP/1.1', 'Host: as.bank.test', 'Content-Type: application/x-www-form-urlencoded', '# TLS client cert = client authentication (tls_client_auth)', '', 'grant_type=client_credentials&client_id=fintech-app&scope=accounts']),
        note: 'RFC 8705 lets the TLS client cert replace a client secret (<code>tls_client_auth</code>).' },
      { from: 'z', to: 'c', kind: 'res', label: 'access_token with cnf.x5t#S256', msg: tls(['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{"access_token":"eyJ…","token_type":"Bearer","expires_in":300}', '', '# token payload contains:', '"cnf": { "x5t#S256": "' + thumb + '" }']), hl: ['x5t#S256'],
        note: 'The AS embeds the SHA-256 <b>thumbprint</b> of the client\\'s certificate in the token (<code>cnf</code> = confirmation).', set: { c: { token: 'eyJ… (cnf=' + thumb.slice(0, 8) + '…)' } } },
      { from: 'c', to: 's', label: 'GET /accounts over mTLS + token', msg: tls(['GET /accounts HTTP/1.1', 'Authorization: Bearer eyJ…', '# TLS layer: client cert CN=fintech-app']) },
      { from: 's', to: 's', label: 'sha256(TLS cert) == cnf.x5t#S256 ✓', msg: tls(['sha256(presented cert) = ' + thumb, 'token cnf.x5t#S256     = ' + thumb, '✓ same certificate']) },
      { from: 's', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK' },
      { from: 'c', to: 'x', kind: 'info', label: 'token leaks', badge: 'Leak', set: { x: { token: 'eyJ… (stolen)' } } },
      { from: 'x', to: 's', label: 'GET /accounts with stolen token (own cert)', msg: tls(['GET /accounts HTTP/1.1', 'Authorization: Bearer eyJ…', '# TLS layer: client cert CN=eve']) },
      { from: 's', to: 's', label: 'thumbprint mismatch ✗', msg: tls(['sha256(presented cert) = ' + thumbEve, 'token cnf.x5t#S256     = ' + thumb, '✗ different certificate']) },
      { from: 's', to: 'x', kind: 'err', label: '401 invalid_token', msg: tls(['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token",', '    error_description="certificate mismatch"']),
        note: 'The token is no longer a pure bearer token: it only works together with the private key of the right certificate. Required by FAPI 2.0 / open banking profiles (mTLS or DPoP).' },
    ]},
  ],
});
</script>`;

  const CERTS_JS = `
const CERTS = {
  good: { name: 'fintech-app (valid)', cn: 'fintech-app', san: 'spiffe://partners.bank.test/fintech-app', issuer: 'Bank Partner CA', notAfter: '2026-12-01', revoked: false, hasKey: true },
  orders: { name: 'orders-svc (valid, other service)', cn: 'orders-svc', san: 'spiffe://partners.bank.test/orders-svc', issuer: 'Bank Partner CA', notAfter: '2027-01-15', revoked: false, hasKey: true },
  expired: { name: 'fintech-app (expired)', cn: 'fintech-app', san: 'spiffe://partners.bank.test/fintech-app', issuer: 'Bank Partner CA', notAfter: '2026-06-30', revoked: false, hasKey: true },
  revoked: { name: 'fintech-app (revoked: key was leaked)', cn: 'fintech-app', san: 'spiffe://partners.bank.test/fintech-app', issuer: 'Bank Partner CA', notAfter: '2026-12-01', revoked: true, hasKey: true },
  self: { name: 'eve self-signed "fintech-app"', cn: 'fintech-app', san: 'spiffe://partners.bank.test/fintech-app', issuer: 'fintech-app (self)', notAfter: '2030-01-01', revoked: false, hasKey: true },
  copied: { name: 'copied cert, no private key', cn: 'fintech-app', san: 'spiffe://partners.bank.test/fintech-app', issuer: 'Bank Partner CA', notAfter: '2026-12-01', revoked: false, hasKey: false },
};
const TODAY = '2026-10-31';
function evaluate(c, pol) {
  const st = [];
  const add = (ok, t, alert) => st.push({ ok, t, alert });
  add(c.issuer === pol.ca, 'chain: issuer "' + c.issuer + '" ' + (c.issuer === pol.ca ? '= trusted CA' : '≠ ' + pol.ca), 'unknown_ca (48)');
  add(c.notAfter >= TODAY, 'validity: notAfter ' + c.notAfter + (c.notAfter >= TODAY ? ' ≥ ' : ' &lt; ') + TODAY, 'certificate_expired (45)');
  add(!pol.checkRev || !c.revoked, pol.checkRev ? 'revocation (OCSP): ' + (c.revoked ? 'REVOKED' : 'good') : 'revocation: not checked ⚠', 'certificate_revoked (44)');
  add(c.hasKey, 'CertificateVerify: ' + (c.hasKey ? 'signature valid (client has private key)' : 'cannot sign: no private key'), 'decrypt_error (51)');
  const allowed = pol.allow.includes(c.san);
  add(allowed, 'authorization: SAN ' + c.san.split('/').pop() + (allowed ? ' in' : ' NOT in') + ' allow-list', '→ HTTP 403');
  let verdict = 'ACCEPT', at = -1;
  for (let i = 0; i < st.length; i++) if (!st[i].ok) { at = i; verdict = i < 4 ? 'TLS alert ' + st[i].alert : '403 Forbidden'; break; }
  return { st, verdict, at };
}`;

  const mtlsChecker = CSS + `
<div class="g2">
  <div class="card">
    <h4>Client connects with…</h4>
    <select id="cs" style="width:100%"></select>
    <table class="t mono" id="cd" style="margin-top:6px"></table>
    <h4 style="margin-top:8px">Server policy</h4>
    <div class="mono" style="font-size:12px">trusted CA: Bank Partner CA<br>allowed SAN: spiffe://partners.bank.test/fintech-app</div>
    <label><input type="checkbox" id="rev" checked> check revocation (OCSP/CRL)</label>
  </div>
  <div class="card">
    <h4>Server's checks, in order</h4>
    <ol class="trace mono" id="tr"></ol>
    <div id="vd"></div>
    <div class="mut" style="margin-top:6px">Checks 1–4 happen inside the TLS handshake (failure = TLS alert, no HTTP at all).
      Check 5 is application authorization, after TLS succeeds.</div>
  </div>
</div>
<script>
` + H + CERTS_JS + `
$('#cs').innerHTML = Object.keys(CERTS).map((k) => '<option value="' + k + '">' + CERTS[k].name + '</option>').join('');
function run() {
  const c = CERTS[$('#cs').value];
  $('#cd').innerHTML = [['Subject CN', c.cn], ['SAN', c.san], ['Issuer', c.issuer], ['Not after', c.notAfter], ['Has private key', c.hasKey ? 'yes' : 'no']]
    .map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td></tr>').join('');
  const r = evaluate(c, { ca: 'Bank Partner CA', allow: ['spiffe://partners.bank.test/fintech-app'], checkRev: $('#rev').checked });
  $('#tr').innerHTML = r.st.map((s, i) => '<li style="opacity:' + (r.at >= 0 && i > r.at ? 0.35 : 1) + '">' + (r.at >= 0 && i > r.at ? '⏭ ' : s.ok ? '✅ ' : '❌ ') + s.t + '</li>').join('');
  $('#vd').innerHTML = '<div class="verdict ' + (r.verdict === 'ACCEPT' ? 'ok' : 'bad') + '">' + r.verdict + '</div>';
}
$('#cs').onchange = run;
$('#rev').onchange = run;
run();
</script>`;

  const mtlsExercise = (solved) => CSS + `
<div class="card">
  <h4>Configure the payments API's mTLS policy</h4>
  <div class="mut">Goal: <b>only</b> the valid fintech-app cert gets in. orders-svc must get 403; expired, revoked, self-signed and copied certs must fail the handshake.</div>
  <div class="row" style="margin-top:6px">
    <label>trusted CA <select id="ca"><option${solved ? '' : ' selected'}>Any certificate</option><option${solved ? ' selected' : ''}>Bank Partner CA</option><option>fintech-app (self)</option></select></label>
    <label><input type="checkbox" id="rev"${solved ? ' checked' : ''}> check revocation</label>
  </div>
  <label>allowed SANs (one per line)</label>
  <textarea id="al" rows="2">${solved ? 'spiffe://partners.bank.test/fintech-app' : 'spiffe://partners.bank.test/fintech-app\nspiffe://partners.bank.test/orders-svc'}</textarea>
  <button id="chk">Check</button>
  <table class="t" id="res" style="margin-top:6px"></table>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + CERTS_JS + `
const WANT = { good: 'ACCEPT', orders: '403', expired: 'TLS', revoked: 'TLS', self: 'TLS', copied: 'TLS' };
$('#chk').onclick = () => {
  const ca = $('#ca').value;
  const pol = { ca: ca, allow: $('#al').value.split(NL).map((s) => s.trim()).filter(Boolean), checkRev: $('#rev').checked };
  let bad = 0;
  $('#res').innerHTML = '<tr><th>cert</th><th>result</th><th>wanted</th></tr>' + Object.keys(CERTS).map((k) => {
    const c = Object.assign({}, CERTS[k]);
    if (ca === 'Any certificate') c.issuer = ca;
    const r = evaluate(c, pol);
    const ok = r.verdict.startsWith(WANT[k]);
    if (!ok) bad++;
    return '<tr><td>' + CERTS[k].name + '</td><td>' + r.verdict + '</td><td>' + (ok ? '✅' : '❌ ' + WANT[k]) + '</td></tr>';
  }).join('');
  $('#fb').className = 'fb ' + (bad ? 'bad' : 'ok');
  $('#fb').innerHTML = bad ? '❌ ' + bad + ' certificate(s) get the wrong result. Think: who signs, is it still trusted, and which identity may call this API?'
    : '✅ Trust exactly one CA, check revocation, and authorize by identity (SAN). Authentication by TLS, authorization by allow-list.';
};
</script>`;

  // =====================================================================
  window.LESSONS.push(
    {
      id: 'basic-auth',
      section: '3 · HTTP Auth Schemes',
      title: 'HTTP Basic auth',
      explain: `
<p>HTTP has its own built-in authentication framework (RFC 9110 §11): the server answers <code>401 Unauthorized</code> with a <code>WWW-Authenticate</code> header naming a <strong>scheme</strong>, and the client retries with an <code>Authorization</code> header for that scheme. The oldest and simplest scheme is <strong>Basic</strong> (RFC 7617).</p>
<pre><code class="language-http">HTTP/1.1 401 Unauthorized
WWW-Authenticate: Basic realm="Shop admin", charset="UTF-8"

GET /admin HTTP/1.1
Authorization: Basic YWxpY2U6czNjcmV0</code></pre>
<p>The value after <code>Basic</code> is just <code>base64("alice:s3cret")</code>. Think of it as writing your password on a postcard in a slightly unusual alphabet: anyone who handles the postcard can read it.</p>
<h3>How it behaves</h3>
<ul>
  <li><strong>Challenge → response.</strong> The <code>realm</code> names the protected area. The browser shows its own native dialog (you cannot style it).</li>
  <li><strong>Sent on every request.</strong> There is no session. The browser caches the credentials for that realm and attaches them to each request, so the server re-checks the password every time.</li>
  <li><strong>No logout.</strong> The credential cache is not reachable from JavaScript or by the server. Users stay "logged in" until they close the browser.</li>
  <li><strong>Split at the first colon.</strong> Usernames may not contain <code>:</code>; passwords may.</li>
</ul>
<div class="warn">Base64 is <strong>encoding, not encryption</strong>. Over plain <code>http://</code> the password is effectively in clear text. Only use Basic over HTTPS.</div>
<div class="tip">Where you still see Basic in 2026: internal tools behind a VPN, package registries and CI (often with a token as the "password"), quick protection of a staging site, and OAuth client authentication (<code>client_secret_basic</code>, which you will meet in the OAuth section).</div>`,
      examples: [
        { title: 'The Basic auth flow: correct, wrong, sniffed, no logout', code: basicFlow },
        { title: 'Base64 lab: encode, decode, prove it is not encryption', code: base64Lab },
      ],
      quiz: [
        { q: 'What does the server send to ask for Basic credentials?', options: ['<code>403</code> + <code>Authorization: Basic</code>', '<code>401</code> + <code>WWW-Authenticate: Basic realm="…"</code>', '<code>302</code> to a login page', '<code>200</code> with a login form'], answer: 1, why: 'The challenge is a 401 with a WWW-Authenticate header naming the scheme and realm.' },
        { q: 'An attacker captures <code>Authorization: Basic Ym9iOnB3</code> over plain HTTP. What do they need to read the password?', options: ['The server private key', 'Nothing: Base64-decode it', 'A rainbow table', 'The realm name'], answer: 1, why: 'Base64 is a reversible encoding with no key. It decodes to bob:pw.' },
        { q: 'Why is logout hard with Basic auth?', options: ['The server must delete the session', 'The browser caches credentials and re-sends them; neither the page nor the server can clear that cache', 'Cookies expire too slowly', 'The realm is fixed'], answer: 1, why: 'There is no server session to delete, and the browser\'s credential cache is outside JavaScript\'s reach.' },
        { q: 'A password is <code>a:b:c</code> for user <code>sam</code>. What does the server get after decoding and splitting?', options: ['user=sam, pass=a', 'user=sam, pass=a:b:c', 'Error: passwords cannot contain colons', 'user=sam:a:b, pass=c'], answer: 1, why: 'RFC 7617 splits at the first colon. User-ids cannot contain colons; passwords can.' },
      ],
      exercise: {
        task: `<p>You sniffed a request on hotel Wi-Fi. Decode the <code>Authorization</code> header and type the username and password in the box below, then click <strong>Check</strong>. (Use the Base64 lab above, or <code>atob()</code> in your browser console.)</p>`,
        starter: basicExercise(false),
        hint: 'Copy the text after "Basic ", decode it, then split at the FIRST colon only.',
        solution: basicExercise(true),
      },
    },
    {
      id: 'digest-auth',
      section: '3 · HTTP Auth Schemes',
      title: 'HTTP Digest auth',
      explain: `
<p><strong>Digest</strong> (RFC 7616, which replaced RFC 2617 in 2015) was designed to fix Basic's worst problem: sending the password itself. Instead, the client proves it knows the password by sending a <strong>hash</strong> that mixes the password with a random challenge from the server.</p>
<p>Analogy: the guard says a random word ("<em>nonce</em>"), you answer with a code computed from that word and your secret. Someone overhearing your answer learns nothing reusable, because next time the guard picks a new word.</p>
<pre><code class="language-http">HTTP/1.1 401 Unauthorized
WWW-Authenticate: Digest realm="http-auth@example.org", qop="auth, auth-int",
    algorithm=MD5, nonce="7ypf/xlj9XXwfDPEoM4URrv/xwf94BcCAzFZH4GiTo0v",
    opaque="FQhe/qaU925kfnzjCev0ciny7QMkPqMAFRtzCUYo5tdS"</code></pre>
<h3>The three hashes (qop=auth)</h3>
<ol>
  <li><code>HA1 = H(username:realm:password)</code>, the secret part</li>
  <li><code>HA2 = H(method:uri)</code>, binds the answer to this request</li>
  <li><code>response = H(HA1:nonce:nc:cnonce:qop:HA2)</code></li>
</ol>
<ul>
  <li><code>nonce</code>: server's random challenge. <code>cnonce</code>: client's random value. <code>nc</code>: 8-hex-digit counter of requests sent with this nonce (<code>00000001</code>, <code>00000002</code>…). Together they make every response unique, and the server rejects an <code>nc</code> it has already seen: <strong>replay protection</strong>.</li>
  <li><code>stale=true</code> in a new challenge means "password fine, nonce expired": retry without prompting.</li>
</ul>
<h3>Why it is mostly obsolete</h3>
<ul>
  <li><strong>MD5</strong> is broken and fast to brute-force. RFC 7616 added SHA-256 and SHA-512/256, but client support for them is patchy, so MD5 is what you meet in practice.</li>
  <li><strong>The server stores HA1</strong> (or the plain password). HA1 is <em>password-equivalent</em>: steal the HA1 table and you can log in to that realm without knowing any password. You cannot use bcrypt/Argon2 here.</li>
  <li><code>qop=auth</code> does not protect the body, and without TLS the responses are readable anyway. Once HTTPS is everywhere, Basic-over-TLS (with a properly hashed password on the server) is simply better.</li>
</ul>
<div class="tip">Where you still see Digest: IP cameras, routers, SIP/VoIP phones (SIP borrowed it) and some legacy enterprise gear.</div>`,
      examples: [
        {
          title: 'Digest flow: challenge, response, nc counter, replay, stale nonce',
          code: digestFlow,
          explain: `
<details><summary>The problem Digest solves (and the one it creates)</summary>
<p>With Basic, a sniffer gets the password. With Digest, a sniffer gets <code>response</code>: an MD5 of the password mixed with values that change every time. The server can verify it because it stores <code>HA1 = MD5(username:realm:password)</code>.</p>
<p>The price: the stored HA1 is enough to compute valid responses. If the server's HA1 table leaks, every account in that realm is compromised, with no cracking needed. Compare with a bcrypt hash, which is useless for logging in.</p>
</details>
<details><summary>Step by step: the "✅ First request" scenario</summary>
<table>
<tr><th>Step</th><th>Who</th><th>What is computed / stored</th></tr>
<tr><td>1</td><td>Client → server</td><td><code>GET /dir/index.html</code>, no credentials</td></tr>
<tr><td>2</td><td>Server → client</td><td>401 with <code>nonce</code>, <code>realm</code>, <code>qop</code>, <code>opaque</code>. Server state: nonce issued, last nc = 0</td></tr>
<tr><td>3</td><td>Client</td><td>HA1 = MD5("Mufasa:http-auth@example.org:Circle of Life"), HA2 = MD5("GET:/dir/index.html"), response = MD5(HA1:nonce:00000001:cnonce:auth:HA2) = <code>8ca523f5…</code> (the RFC 7616 test vector)</td></tr>
<tr><td>4</td><td>Client → server</td><td><code>Authorization: Digest</code> with all parameters + <code>response</code>. Password not sent</td></tr>
<tr><td>5</td><td>Server</td><td>Looks up stored HA1, recomputes, compares; checks nc 1 &gt; 0. Server state: last nc = 1</td></tr>
<tr><td>6</td><td>Server → client</td><td>200 + optional <code>Authentication-Info</code></td></tr>
</table>
</details>
<details><summary>Key ideas: what each random value prevents</summary>
<ul>
<li><strong>nonce</strong> (server-chosen): an old response from a different nonce is useless.</li>
<li><strong>nc</strong> (counter): within one nonce, each request has a new number. The server remembers the highest one, so an exact replay is caught (🦹 scenario, step 6).</li>
<li><strong>cnonce</strong> (client-chosen): stops a malicious server from picking a nonce that makes precomputed tables useful.</li>
<li><strong>HA2 includes the URI</strong>: a captured response for <code>/dir/index.html</code> does not work for <code>/admin</code>.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
<li>Open <b>🔁 Next request</b>: watch the client state card change <code>nc</code> to <code>00000002</code> and compare the two response hashes. They share nothing.</li>
<li>Open <b>🦹 Replay attack</b> and step to 6: the hash check passes, the nc check fails.</li>
<li>Open <b>⏰ Stale nonce</b>: the 401 carries <code>stale=true</code>, and the client recomputes with the new nonce without asking the user.</li>
</ul>
</details>`,
        },
        {
          title: 'Digest calculator (verify the RFC test vectors)',
          code: digestCalc,
          explain: `
<details><summary>Step by step: what the calculator computes</summary>
<table>
<tr><th>Row</th><th>Input string</th><th>Result</th></tr>
<tr><td>① HA1</td><td><code>username:realm:password</code></td><td>32 hex chars (MD5) or 64 (SHA-256)</td></tr>
<tr><td>② HA2</td><td><code>method:uri</code></td><td>hash</td></tr>
<tr><td>③ response</td><td><code>HA1:nonce:nc:cnonce:qop:HA2</code> (HA1/HA2 as lowercase hex text)</td><td>the value sent in <code>response="…"</code></td></tr>
</table>
<p>The green pill confirms the output equals the published example from RFC 7616 §3.9.1 (MD5 <code>8ca523f5…</code>, SHA-256 <code>753927fa…</code>) or RFC 2617 §3.5 (<code>6629fae4…</code>).</p>
</details>
<details><summary>Try this</summary>
<ul>
<li>Change <code>nc</code> from <code>00000001</code> to <code>00000002</code>: ③ changes completely, ① and ② stay the same.</li>
<li>Change <code>uri</code> to <code>/admin</code>: only ② and ③ change.</li>
<li>Change the password by one letter: everything changes. Note that the server never needs the password, only ①.</li>
<li>Switch the algorithm to SHA-256 with the RFC 7616 example loaded: the pill confirms the SHA-256 test vector.</li>
</ul>
</details>`,
        },
      ],
      quiz: [
        { q: 'In Digest auth, what does the server need to store to verify a login?', options: ['A bcrypt hash of the password', 'HA1 = MD5(username:realm:password) or the plain password', 'Only the username', 'The last cnonce'], answer: 1, why: 'It must recompute the response, which needs HA1. HA1 is password-equivalent for that realm.' },
        { q: 'An attacker replays a captured Digest request byte-for-byte. What stops it?', options: ['The response hash no longer matches', 'The server has already seen that nc for that nonce (or the nonce expired)', 'MD5 is random', 'The browser blocks it'], answer: 1, why: 'The hash is still valid (same inputs). The nc counter / nonce lifetime is what catches replays.' },
        { q: 'What does <code>stale=true</code> in a Digest challenge mean?', options: ['Wrong password', 'Credentials were fine but the nonce expired; retry with the new nonce without prompting', 'The realm changed', 'Use Basic instead'], answer: 1, why: 'stale=true tells the client the response was valid except for an old nonce.' },
        { q: 'Why is Digest rarely used for new systems?', options: ['It sends the password in clear', 'MD5 + password-equivalent HA1 storage; HTTPS + Basic or token schemes are simpler and safer', 'Browsers removed 401 support', 'It needs JavaScript'], answer: 1, why: 'It prevents slow password hashing on the server and relies on MD5; TLS solves the eavesdropping problem better.' },
      ],
      exercise: {
        task: `<p>Bob's browser received a Digest challenge. Use the MD5 scratchpad to compute <strong>HA1</strong>, <strong>HA2</strong> and the final <strong>response</strong> (qop=auth), type them in the box below and click <strong>Check</strong>.</p>`,
        starter: digestExercise(false),
        hint: 'HA1 = MD5("bob:files@acme.test:tr0ub4dor"). HA2 = MD5("GET:/reports/q3.pdf"). Then MD5(HA1 + ":" + nonce + ":00000001:0a4f113b:auth:" + HA2).',
        solution: digestExercise(true),
      },
    },
    {
      id: 'api-keys',
      section: '3 · HTTP Auth Schemes',
      title: 'API keys',
      explain: `
<p>An <strong>API key</strong> is a long random string that identifies and authenticates an <em>application or project</em> (not a person) calling an API. It is like a hotel key card for a company account: whoever holds it gets in, and the hotel can deactivate it any time.</p>
<pre><code class="language-http">GET /v1/orders HTTP/1.1
Host: api.payments.test
X-API-Key: sk_live_EXAMPLE_not_a_real_key_dYfE</code></pre>
<h3>Good API key hygiene</h3>
<ul>
  <li><strong>Header, never query string.</strong> <code>?api_key=…</code> lands in server/CDN/proxy access logs, browser history and <code>Referer</code> headers. Use a header (<code>X-API-Key</code>, or <code>Authorization: Bearer</code> as Stripe and OpenAI do).</li>
  <li><strong>Recognisable prefix.</strong> <code>sk_live_</code> (secret, production), <code>sk_test_</code>, <code>pk_live_</code> (publishable), GitHub's <code>ghp_</code> / <code>github_pat_</code>. Humans see what it is, and secret scanners can find leaked keys in code and logs.</li>
  <li><strong>Store a hash.</strong> Like passwords, keep only <code>sha256(key)</code> plus a display hint (<code>sk_live_…dYfE</code>). Show the full key <em>once</em> at creation. A fast hash is fine because the key has ~190 bits of randomness: nothing to guess.</li>
  <li><strong>Scope it.</strong> Least privilege: read-only keys, per-environment keys, per-service keys.</li>
  <li><strong>Rotate and revoke.</strong> Support two active keys at once so you can deploy a new one before revoking the old one.</li>
</ul>
<div class="warn">API keys are <strong>bearer secrets</strong> with long lifetimes. Never ship a secret key in a mobile app or browser JavaScript: anyone can extract it. Publishable keys exist precisely for that case, and they can only do harmless things.</div>
<div class="tip">API key vs user login: a key says "this is acme-shop's backend". It does not say which human clicked the button. For user-delegated access you will use OAuth tokens (later section).</div>`,
      examples: [
        { title: 'API key requests: valid, revoked, wrong scope, leaked in the URL', code: apiKeyFlow },
        { title: 'Key generator: prefix, hashed storage, scopes, rotation, revocation', code: apiKeyGen },
      ],
      quiz: [
        { q: 'Why is <code>GET /v1/orders?api_key=sk_live_…</code> dangerous even over HTTPS?', options: ['HTTPS does not encrypt query strings', 'URLs are written to access logs, history and Referer headers', 'Query strings are limited to 100 chars', 'The server cannot read query strings'], answer: 1, why: 'TLS protects the wire, but the full URL is recorded at both ends and in intermediaries.' },
        { q: 'Why can the server store API keys with plain SHA-256 instead of bcrypt?', options: ['SHA-256 is slower than bcrypt', 'Keys are long and random, so brute-forcing the hash is infeasible', 'Keys are not secret', 'bcrypt cannot hash strings with underscores'], answer: 1, why: 'Slow hashing protects low-entropy human passwords. A 32-char random key has no guessable space.' },
        { q: 'A key with scope <code>orders:read</code> calls <code>POST /v1/refunds</code>. Best response?', options: ['401', '403', '404', '500'], answer: 1, why: 'The key is valid (authenticated) but not allowed (authorization) → 403.' },
        { q: 'What is the point of a <code>sk_live_</code> prefix?', options: ['It encrypts the key', 'It makes the key shorter', 'Humans and secret scanners can recognise what kind of key leaked', 'It is required by HTTP'], answer: 2, why: 'Prefixes enable automatic leak detection (e.g. push protection) and avoid using test keys in production.' },
      ],
      exercise: {
        task: `<p>Rewrite the raw HTTP request in the box below so the API key is <strong>not</strong> in the URL but still authenticates the call, then click <strong>Check</strong>.</p>`,
        starter: apiKeyExercise(false),
        hint: 'Remove &api_key=… from line 1 and add a header line such as X-API-Key: sk_live_9fQ2mXv7Lp4Rt8Wz.',
        solution: apiKeyExercise(true),
      },
    },
    {
      id: 'hmac-signing',
      section: '3 · HTTP Auth Schemes',
      title: 'HMAC request signing',
      explain: `
<p>API keys and Basic auth send the secret with every request. <strong>Request signing</strong> sends a <em>proof</em> instead. Client and server share a secret; the client computes an <strong>HMAC</strong> (a keyed hash) over the important parts of the request and sends only that signature.</p>
<p>Analogy: a wax seal on a letter. The seal proves who sent it, and if anyone changes the letter the seal no longer matches. Here the "seal" can only be made by someone holding the secret.</p>
<pre><code class="language-http">canonical = "POST\\n/v1/payouts\\n1793448000\\n" + hex(sha256(body))
signature = hex(HMAC-SHA256(secret, canonical))

POST /v1/payouts HTTP/1.1
X-Key-Id: ak_partner_42
X-Timestamp: 1793448000
X-Signature: 5b0c…
Content-Type: application/json

{"amount":1000,"currency":"USD","to":"acct_9"}</code></pre>
<p>The server rebuilds the canonical string from what it received, computes the HMAC with its copy of the secret, and compares. This gives you three properties:</p>
<ul>
  <li><strong>Authentication</strong>: only a secret holder can produce the signature.</li>
  <li><strong>Integrity</strong>: change the method, path or one byte of the body and the signature fails.</li>
  <li><strong>Limited replay</strong>: the timestamp is signed, and the server rejects requests older than a window (often 5 minutes). Add a nonce/request-id cache to block replays inside the window.</li>
</ul>
<h3>Real-world versions</h3>
<ul>
  <li><strong>AWS Signature Version 4</strong>: same idea with a longer canonical request (method, path, query, signed headers, payload hash), a date/region/service scope and a derived signing key. Header: <code>Authorization: AWS4-HMAC-SHA256 Credential=…, SignedHeaders=…, Signature=…</code>.</li>
  <li><strong>Inbound webhooks</strong>: the provider signs, <em>you</em> verify. GitHub: <code>X-Hub-Signature-256: sha256=HMAC(secret, raw body)</code>. Stripe: <code>Stripe-Signature: t=…,v1=HMAC(secret, t + "." + raw body)</code>, with a 5-minute default tolerance in its libraries.</li>
</ul>
<div class="warn">Compare signatures with a <strong>constant-time</strong> function (<code>crypto.timingSafeEqual</code> in Node, <code>hmac.compare_digest</code> in Python). A normal <code>==</code> stops at the first differing character, and the timing difference can let an attacker guess a valid signature byte by byte.</div>
<div class="tip">The #1 webhook bug: verifying the signature against <code>JSON.stringify(req.body)</code> after your framework parsed it. Whitespace and key order change, the bytes differ, and verification fails. Always verify the <strong>raw</strong> body bytes.</div>`,
      examples: [
        { title: 'Signed request: happy path, tampered body, replay', code: hmacFlow,
          explain: `
<details><summary>The problem: a bearer secret proves nothing about the request</summary>
<p>With an API key, a compromised proxy that sees the request can change <code>"amount":1000</code> to <code>99000</code>, or resend it tomorrow, and the server happily accepts: the key is still valid. Signing fixes this by binding the proof to the exact bytes and time of the request.</p>
</details>
<details><summary>Step by step: the "🧨 Tampered in transit" scenario</summary>
<table>
<tr><th>Step</th><th>Who</th><th>What happens</th></tr>
<tr><td>1</td><td>Client</td><td>Canonical = <code>POST⏎/v1/payouts⏎1793448000⏎sha256(body)</code></td></tr>
<tr><td>2</td><td>Client</td><td>signature = HMAC-SHA256(secret, canonical)</td></tr>
<tr><td>3</td><td>Client → proxy</td><td>Request with amount 1000 + signature</td></tr>
<tr><td>4</td><td>Proxy</td><td>Changes body to amount 99000 / acct_666. Cannot recompute the signature (no secret), so it keeps the old one</td></tr>
<tr><td>5</td><td>Proxy → server</td><td>Tampered body, original signature</td></tr>
<tr><td>6</td><td>Server</td><td>sha256(received body) is different → canonical string different → expected HMAC ≠ received → mismatch</td></tr>
<tr><td>7</td><td>Server → proxy</td><td><code>401 signature_mismatch</code></td></tr>
</table>
</details>
<details><summary>Key ideas</summary>
<ul>
<li>The secret is used, never sent. A sniffer only sees signatures, each valid for one exact request.</li>
<li>Everything you want to protect must be <strong>inside</strong> the canonical string. Unsigned headers can be altered freely.</li>
<li>The timestamp works against replay only <em>because</em> it is signed: change it and the HMAC breaks (🔁 scenario, step 4).</li>
</ul>
</details>`,
        },
        { title: 'Signing lab: sign, tamper on the wire, verify', code: hmacLab,
          explain: `
<details><summary>Step by step: what Verify does (matches the trace)</summary>
<table>
<tr><th>#</th><th>Server check</th><th>Fails when…</th></tr>
<tr><td>1</td><td>Look up the secret by <code>X-Key-Id</code></td><td>unknown key id</td></tr>
<tr><td>2</td><td>|server clock − X-Timestamp| ≤ 300 s</td><td>you press ⏩ replay +10 min</td></tr>
<tr><td>3</td><td>sha256 of the body <em>as received</em></td><td>(always computed)</td></tr>
<tr><td>4</td><td>Rebuild canonical string from received method, path, timestamp, body hash</td><td>(always computed)</td></tr>
<tr><td>5</td><td>expected = HMAC-SHA256(server's secret, canonical)</td><td>(always computed)</td></tr>
<tr><td>6</td><td>constant-time compare expected vs <code>X-Signature</code></td><td>you edited the body/path/timestamp, or the server's secret differs</td></tr>
</table>
</details>
<details><summary>Try this</summary>
<ul>
<li>Press <b>Verify</b> right after signing: ACCEPT.</li>
<li>Press <b>💰 amount → 99000</b>: check 6 fails. Now change it back by hand to 1000 and Verify: ACCEPT again. The signature depends only on content.</li>
<li>Change <code>X-Timestamp</code> in the wire box to the current server clock to "refresh" a replay: the HMAC breaks, because the timestamp is signed.</li>
<li>Tick <b>server has a different secret</b>: this is what happens after a half-finished key rotation.</li>
<li>Edit the client's body and press <b>Sign &amp; send</b> again: a completely new signature.</li>
</ul>
</details>`,
        },
        { title: 'Inbound webhook verification (GitHub / Stripe style)', code: webhookLab,
          explain: `
<details><summary>Try this</summary>
<ul>
<li>Tick <b>🐞 bug: verify JSON.stringify(req.body)</b>: the event is genuine, yet verification fails, because re-serializing removed the whitespace the provider signed.</li>
<li>Change <code>2000</code> to <code>20000</code> in the raw body: mismatch.</li>
<li>Switch to Stripe and pick a <b>2 h</b> delay: the signature is fine, but the timestamp tolerance rejects it. GitHub's scheme has no signed timestamp, so you dedupe by <code>X-GitHub-Delivery</code>.</li>
</ul>
</details>` },
      ],
      quiz: [
        { q: 'A proxy changes the body of a signed request but leaves <code>X-Signature</code> unchanged. What happens?', options: ['Accepted: the signature header is still valid', 'Rejected: the server hashes the received body, so the recomputed HMAC differs', 'Accepted if the timestamp is fresh', 'The proxy can recompute the HMAC from the old one'], answer: 1, why: 'The body hash is part of the canonical string. Without the secret, nobody can make a new matching HMAC.' },
        { q: 'Why must the timestamp be inside the signed string?', options: ['To make the signature longer', 'Otherwise an attacker could replay an old request with a fresh timestamp header', 'HTTP requires it', 'So the server can skip the HMAC'], answer: 1, why: 'A signed timestamp cannot be changed without breaking the signature, so old requests stay old.' },
        { q: 'Why use a constant-time comparison for signatures?', options: ['It is faster', 'A normal string compare returns early, leaking how many leading characters matched through timing', 'HMAC output is binary', 'To support Unicode'], answer: 1, why: 'Timing side channels can let an attacker discover a valid signature byte by byte.' },
        { q: 'Your Stripe webhook verification fails for genuine events. Most likely cause?', options: ['Stripe uses MD5', 'You verify against the parsed and re-serialized JSON instead of the raw body', 'The secret must be Base64-decoded', 'Webhooks are not signed'], answer: 1, why: 'The signature covers the exact raw bytes. Any re-serialization changes them.' },
      ],
      exercise: {
        task: `<p>The server signs <code>METHOD⏎PATH⏎TIMESTAMP⏎hex(sha256(body))</code>. Build that exact canonical string for the request shown, type it in the box below and click <strong>Check</strong>. The widget computes the HMAC of your string and compares it with the real <code>X-Signature</code>.</p>`,
        starter: hmacExercise(false),
        hint: 'Paste the body {"limit":5000} into the sha256 helper. Lines: PUT, /v1/cards/card_7/limit, 1793451600, then the hash. No trailing newline.',
        solution: hmacExercise(true),
      },
    },
    {
      id: 'bearer-tokens',
      section: '3 · HTTP Auth Schemes',
      title: 'Bearer tokens',
      explain: `
<p>A <strong>bearer token</strong> (RFC 6750) is a string that grants access to whoever presents it, like cash or a concert wristband: nobody asks for ID. It is the token type you will use with OAuth 2.0 and most modern APIs.</p>
<pre><code class="language-http">GET /orders HTTP/1.1
Host: api.shop.test
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6ImF0K2p3dCJ9…</code></pre>
<h3>Error responses (RFC 6750 §3)</h3>
<pre><code class="language-http">HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer realm="api.shop.test",
    error="invalid_token", error_description="The access token expired"</code></pre>
<ul>
  <li>No token at all → <code>401</code> with just <code>WWW-Authenticate: Bearer realm="…"</code> (no error code).</li>
  <li><code>invalid_token</code> → <code>401</code>: expired, revoked, malformed, bad signature.</li>
  <li><code>insufficient_scope</code> → <code>403</code>: token fine, privilege missing.</li>
  <li><code>invalid_request</code> → <code>400</code>: malformed request, e.g. a token sent in two places.</li>
</ul>
<h3>Two kinds of tokens</h3>
<ul>
  <li><strong>Opaque</strong>: a random reference (<code>2YotnFZFEjr1zCsicMWpAA</code>). The API asks the auth server what it means (token introspection, RFC 7662). Easy to revoke, costs a lookup.</li>
  <li><strong>Self-contained</strong>: usually a signed JWT carrying claims (<code>sub</code>, <code>scope</code>, <code>exp</code>). Verified locally, fast, but valid until it expires. Next section goes deep.</li>
</ul>
<div class="warn">Never put tokens in URLs (<code>?access_token=…</code>). RFC 6750 only allows it as a last resort and OAuth 2.1 removes it. Use the <code>Authorization</code> header, always over HTTPS, and keep tokens short-lived.</div>
<div class="tip">Because possession = access, modern high-security setups make tokens <strong>sender-constrained</strong>: DPoP (RFC 9449) or mTLS-bound tokens (RFC 8705, next lesson) only work together with a private key the thief does not have.</div>`,
      examples: [
        { title: 'Bearer requests: valid, expired, missing, insufficient scope, stolen', code: bearerFlow },
        { title: 'Opaque (introspection) vs self-contained (local verify)', code: opaqueVsJwt },
      ],
      quiz: [
        { q: 'What does "bearer" mean for a token?', options: ['It is bound to the user\'s IP', 'Anyone who holds it can use it', 'It is encrypted', 'It can only be used once'], answer: 1, why: 'Possession is the only requirement, which is why leaks are so dangerous.' },
        { q: 'A request has no Authorization header. Per RFC 6750 the server should reply…', options: ['400 invalid_request', '401 with <code>WWW-Authenticate: Bearer realm="…"</code> and no error code', '403 insufficient_scope', '200 with empty data'], answer: 1, why: 'RFC 6750 §3.1: if the request lacks authentication info, the server should not include an error code.' },
        { q: 'Main trade-off of opaque tokens vs JWTs?', options: ['Opaque are bigger', 'Opaque need a lookup (introspection) but can be revoked instantly; JWTs verify locally but stay valid until exp', 'JWTs cannot carry scopes', 'Opaque tokens are less random'], answer: 1, why: 'Reference vs value: lookups give control, self-contained gives speed.' },
        { q: 'Why not send <code>GET /orders?access_token=…</code>?', options: ['Query strings are not encrypted by TLS', 'URLs leak into logs, history and Referer headers', 'The server cannot parse it', 'It is twice as slow'], answer: 1, why: 'Same reason as API keys: URLs are recorded in many places.' },
      ],
      exercise: {
        task: `<p>For each request, choose the response a correct RFC 6750 resource server sends, in the box below, then click <strong>Check</strong>.</p>`,
        starter: bearerExercise(false),
        hint: 'No credentials → bare challenge. Bad/expired token → 401 invalid_token. Not enough scope → 403. Malformed (two methods) → 400.',
        solution: bearerExercise(true),
      },
    },
    {
      id: 'mtls',
      section: '3 · HTTP Auth Schemes',
      title: 'Mutual TLS & client certificates',
      explain: `
<p>In normal HTTPS only the <strong>server</strong> shows a certificate. In <strong>mutual TLS (mTLS)</strong> the <strong>client</strong> shows one too. Authentication happens in the TLS handshake itself, before any HTTP request exists. It is like a building where both the guard and the visitor show government-issued ID badges.</p>
<h3>What changes in the TLS 1.3 handshake</h3>
<ol>
  <li>Server sends <code>CertificateRequest</code>, listing which CAs it trusts.</li>
  <li>Client sends its <code>Certificate</code> (public, anyone could copy it)…</li>
  <li>…and a <code>CertificateVerify</code>: a signature over the handshake transcript using the client's <strong>private key</strong>. This is the real proof.</li>
  <li>Server validates the chain to its trusted CA, the validity dates, revocation, and the signature, then maps the cert (Subject or SAN) to an identity.</li>
</ol>
<p>Failures are TLS alerts (<code>certificate_required</code>, <code>unknown_ca</code>, <code>certificate_expired</code>…), not HTTP 401 pages: the connection simply closes.</p>
<h3>Where it is used</h3>
<ul>
  <li><strong>Service-to-service</strong>: service meshes (Istio, Linkerd) give every workload a short-lived cert with a SPIFFE ID like <code>spiffe://cluster/ns/payments/sa/api</code>, and enforce mTLS automatically.</li>
  <li><strong>Banking / open banking</strong>: UK Open Banking, Brazil Open Finance and FAPI 2.0 security profiles use mTLS for client authentication and/or token binding.</li>
  <li><strong>IoT and devices</strong>: each device ships with its own cert.</li>
</ul>
<h3>RFC 8705: OAuth + mTLS</h3>
<ul>
  <li><strong>Client authentication</strong>: <code>tls_client_auth</code> (CA-issued cert) or <code>self_signed_tls_client_auth</code> instead of a client secret.</li>
  <li><strong>Certificate-bound access tokens</strong>: the token contains <code>"cnf": {"x5t#S256": "&lt;SHA-256 thumbprint of the cert&gt;"}</code>. The API checks that the TLS client cert matches, so a stolen token is useless without the private key.</li>
</ul>
<div class="warn">TLS is often terminated at a load balancer, so the app never sees the handshake. The proxy must verify the cert and forward it in a header (e.g. RFC 9440 <code>Client-Cert</code>, or Envoy's <code>X-Forwarded-Client-Cert</code>), and the app must only trust that header from the proxy.</div>
<div class="tip">Why not mTLS for websites? Installing and choosing client certs in browsers is a terrible user experience. Passkeys (WebAuthn) give users the same "private key never leaves the device" property in a friendly way.</div>`,
      examples: [
        { title: 'mTLS handshake: valid, missing cert, untrusted CA, cert-bound token', code: mtlsFlow,
          explain: `
<details><summary>The problem: a certificate alone proves nothing</summary>
<p>A certificate is public: the server sends its own to every visitor. If the client just sent a cert file, an attacker could copy it. What proves identity is the <code>CertificateVerify</code> signature, made with the private key over <em>this</em> handshake's transcript, so it cannot be copied or replayed into another connection.</p>
</details>
<details><summary>Step by step: "✅ Valid client cert"</summary>
<table>
<tr><th>Step</th><th>Message</th><th>Purpose</th></tr>
<tr><td>1</td><td>ClientHello</td><td>Versions, ciphers, key share, SNI</td></tr>
<tr><td>2</td><td>ServerHello + {EncryptedExtensions}</td><td>Key exchange done; rest is encrypted</td></tr>
<tr><td>3</td><td>{CertificateRequest}</td><td>Server asks for a client cert from <i>Bank Partner CA</i></td></tr>
<tr><td>4</td><td>{Certificate} {CertificateVerify} {Finished}</td><td>Normal server authentication</td></tr>
<tr><td>5</td><td>Client verifies server</td><td>Chain, hostname, dates</td></tr>
<tr><td>6</td><td>{Certificate} (client)</td><td>Client's chain, Subject CN=fintech-app, SAN SPIFFE URI</td></tr>
<tr><td>7</td><td>{CertificateVerify} + {Finished}</td><td>Proof of private key over the transcript</td></tr>
<tr><td>8</td><td>Server validates</td><td>Chain, dates, revocation, signature → identity</td></tr>
<tr><td>9–10</td><td>GET /accounts → 200</td><td>HTTP with no credentials: the connection is authenticated</td></tr>
</table>
</details>
<details><summary>Key ideas: certificate-bound tokens</summary>
<p>In the 🔗 scenario the auth server puts the cert's SHA-256 thumbprint into the token's <code>cnf.x5t#S256</code>. The API compares that with the thumbprint of the cert on the current TLS connection (step 4 ✓, step 8 ✗). The token stops being a pure bearer token: possession alone is not enough.</p>
</details>
<details><summary>Try this</summary>
<ul>
<li>Compare where each failure scenario ends: there is never an HTTP 401, only a TLS alert.</li>
<li>In 🔗, step through to 8 and compare the two thumbprints in the inspector.</li>
</ul>
</details>`,
        },
        { title: 'Client certificate checker', code: mtlsChecker },
      ],
      quiz: [
        { q: 'Which handshake message proves the client actually holds the private key?', options: ['ClientHello', 'Certificate', 'CertificateVerify', 'CertificateRequest'], answer: 2, why: 'CertificateVerify is a signature over the handshake transcript made with the private key. The Certificate itself is public.' },
        { q: 'A client without a certificate connects to a server that requires mTLS (TLS 1.3). What does it see?', options: ['HTTP 401', 'HTTP 403', 'A TLS alert (certificate_required) and a closed connection', 'A redirect to a login page'], answer: 2, why: 'Authentication happens in the TLS layer, so failure is a TLS alert before any HTTP.' },
        { q: 'What does <code>cnf.x5t#S256</code> in an access token do (RFC 8705)?', options: ['Encrypts the token', 'Binds the token to a specific client certificate thumbprint', 'Stores the CA name', 'Sets the expiry'], answer: 1, why: 'The API checks that the TLS client cert matches the thumbprint, so a stolen token alone is useless.' },
        { q: 'Typical use of mTLS?', options: ['Public blog comments', 'Service-to-service traffic and open-banking APIs', 'Password reset emails', 'Browser cookie storage'], answer: 1, why: 'mTLS shines where both ends are machines you control or regulate; browser UX makes it rare for end users.' },
      ],
      exercise: {
        task: `<p>Set the trusted CA, revocation checking and allowed SANs in the box below so that only the valid fintech-app certificate is accepted, then click <strong>Check</strong>.</p>`,
        starter: mtlsExercise(false),
        hint: 'Trust only "Bank Partner CA", turn on revocation checking, and allow only the fintech-app SAN.',
        solution: mtlsExercise(true),
      },
    },
  );
})();
