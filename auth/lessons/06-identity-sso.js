window.LESSONS = window.LESSONS || [];
(function () {
  // Widget code is written as real functions and serialized with toString(), so it is
  // syntax-checked with the file and needs no template-literal escaping.
  const SEC = '6 · Identity: OIDC, SSO & SAML';
  const STYLE = `<style>
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; background: #fff; margin: 6px 0; }
.muted { color: #646b80; font-size: 13px; }
.ok { color: #15803d; font-weight: 600; }
.bad { color: #b91c1c; font-weight: 600; }
.mono { font: 12px/1.45 ui-monospace, Menlo, monospace; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 12px; background: #eef1f6; }
textarea { width: 100%; box-sizing: border-box; font: 12px/1.45 ui-monospace, Menlo, monospace; }
button.on { background: #087ea4; color: #fff; border-color: #087ea4; }
.verdict { padding: 8px 12px; border-radius: 8px; font-weight: 600; margin-top: 6px; }
.verdict.ok { background: #dcfce7; } .verdict.bad { background: #fee2e2; }
table.t { border-collapse: collapse; width: 100%; font-size: 13px; }
table.t td, table.t th { border-bottom: 1px solid #eef0f5; padding: 4px 6px; text-align: left; vertical-align: top; }
pre.box { background: #0f1320; color: #d7dcea; padding: 9px 11px; border-radius: 8px; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; margin: 6px 0; max-height: 300px; overflow: auto; }
h4 { margin: 4px 0 6px; font-size: 14px; }
</style>`;
  const CLOSE = '</' + 'script>';
  // W(html, main, libs, vars): html fragment + libs (function declarations) + main() IIFE
  const W = (html, main, libs, vars) => STYLE + '\n' + html + '\n<script>\n' +
    (vars ? 'window.VARS = ' + JSON.stringify(vars) + ';\n' : 'window.VARS = {};\n') +
    (libs || []).map((f) => f.toString()).join('\n\n') + '\n\n(' + main.toString() + ')();\n' + CLOSE;

  // ---------- shared libs (serialized into widgets) ----------
  function L() { return Array.prototype.slice.call(arguments).join('\n'); }

  function deflateRaw(str) {
    // Real raw DEFLATE (RFC 1951): one block, fixed Huffman codes, greedy LZ77 matching.
    const src = new TextEncoder().encode(str);
    const out = [];
    let bitbuf = 0, bitcnt = 0;
    const put = (v, n) => {
      for (let i = 0; i < n; i++) {
        bitbuf |= ((v >> i) & 1) << bitcnt;
        bitcnt++;
        if (bitcnt === 8) { out.push(bitbuf); bitbuf = 0; bitcnt = 0; }
      }
    };
    const putRev = (code, len) => { for (let i = len - 1; i >= 0; i--) put((code >> i) & 1, 1); };
    const lit = (c) => {
      if (c < 144) putRev(0x30 + c, 8);
      else if (c < 256) putRev(0x190 + c - 144, 9);
      else if (c < 280) putRev(c - 256, 7);
      else putRev(0xc0 + c - 280, 8);
    };
    const LB = [3,4,5,6,7,8,9,10,11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,115,131,163,195,227,258];
    const LE = [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];
    const DB = [1,2,3,4,5,7,9,13,17,25,33,49,65,97,129,193,257,385,513,769,1025,1537,2049,3073,4097,6145,8193,12289,16385,24577];
    const DE = [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];
    put(1, 1); put(1, 2);
    let i = 0;
    while (i < src.length) {
      let bestLen = 0, bestDist = 0;
      for (let j = Math.max(0, i - 32768); j < i; j++) {
        let l = 0;
        while (l < 258 && i + l < src.length && src[j + l] === src[i + l]) l++;
        if (l > bestLen) { bestLen = l; bestDist = i - j; }
      }
      if (bestLen >= 3) {
        let c = 0;
        while (c < 28 && LB[c + 1] <= bestLen) c++;
        lit(257 + c); put(bestLen - LB[c], LE[c]);
        let d = 0;
        while (d < 29 && DB[d + 1] <= bestDist) d++;
        putRev(d, 5); put(bestDist - DB[d], DE[d]);
        i += bestLen;
      } else { lit(src[i]); i++; }
    }
    lit(256);
    if (bitcnt) out.push(bitbuf);
    return new Uint8Array(out);
  }

  function isoAt(offsetSec) {
    return new Date(Math.floor(Date.now() / 1000 + offsetSec) * 1000).toISOString().replace('.000', '');
  }

  // SAML builders shared by the SAML widgets
  function samlLib() {
    const SP = 'https://wiki.acme.test/saml/metadata';
    const ACS = 'https://wiki.acme.test/saml/acs';
    const IDP = 'https://idp.acme-idp.test';
    const SSO = 'https://idp.acme-idp.test/sso/saml';
    function authnRequest(id) {
      return '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"' +
        ' xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="' + id + '" Version="2.0"' +
        ' IssueInstant="' + isoAt(0) + '" Destination="' + SSO + '"' +
        ' ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"' +
        ' AssertionConsumerServiceURL="' + ACS + '">' +
        '<saml:Issuer>' + SP + '</saml:Issuer>' +
        '<samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress"' +
        ' AllowCreate="true"/></samlp:AuthnRequest>';
    }
    function assertionBody(o) {
      return L(
        '    <saml:Issuer>' + (o.issuer || IDP) + '</saml:Issuer>',
        '    <saml:Subject>',
        '      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">' +
          (o.nameId || 'alice@acme.test') + '</saml:NameID>',
        '      <saml:SubjectConfirmation Method="urn:oasis:names:tc:SAML:2.0:cm:bearer">',
        '        <saml:SubjectConfirmationData' + (o.inResponseTo === null ? '' : ' InResponseTo="' + (o.inResponseTo || '_req42') + '"') +
          ' NotOnOrAfter="' + isoAt(o.scExp != null ? o.scExp : 300) + '" Recipient="' + (o.recipient || ACS) + '"/>',
        '      </saml:SubjectConfirmation>',
        '    </saml:Subject>',
        '    <saml:Conditions NotBefore="' + isoAt(-5) + '" NotOnOrAfter="' + isoAt(o.exp != null ? o.exp : 300) + '">',
        '      <saml:AudienceRestriction>',
        '        <saml:Audience>' + (o.audience || SP) + '</saml:Audience>',
        '      </saml:AudienceRestriction>',
        '    </saml:Conditions>',
        '    <saml:AuthnStatement AuthnInstant="' + isoAt(-2) + '" SessionIndex="_sess_7f3a91">',
        '      <saml:AuthnContext>',
        '        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>',
        '      </saml:AuthnContext>',
        '    </saml:AuthnStatement>',
        '    <saml:AttributeStatement>',
        '      <saml:Attribute Name="email" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">',
        '        <saml:AttributeValue>' + (o.nameId || 'alice@acme.test') + '</saml:AttributeValue>',
        '      </saml:Attribute>',
        '      <saml:Attribute Name="groups" NameFormat="urn:oasis:names:tc:SAML:2.0:attrname-format:basic">',
        '        <saml:AttributeValue>' + (o.group || 'engineering') + '</saml:AttributeValue>',
        '      </saml:Attribute>',
        '    </saml:AttributeStatement>'
      );
    }
    const NS = ' xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"';
    function signatureXml(id, digest) {
      const signedInfo = L(
        '      <ds:SignedInfo>',
        '        <ds:CanonicalizationMethod Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>',
        '        <ds:SignatureMethod Algorithm="http://www.w3.org/2001/04/xmldsig-more#rsa-sha256"/>',
        '        <ds:Reference URI="#' + id + '">',
        '          <ds:Transforms>',
        '            <ds:Transform Algorithm="http://www.w3.org/2000/09/xmldsig#enveloped-signature"/>',
        '            <ds:Transform Algorithm="http://www.w3.org/2001/10/xml-exc-c14n#"/>',
        '          </ds:Transforms>',
        '          <ds:DigestMethod Algorithm="http://www.w3.org/2001/04/xmlenc#sha256"/>',
        '          <ds:DigestValue>' + digest + '</ds:DigestValue>',
        '        </ds:Reference>',
        '      </ds:SignedInfo>');
      // Simulated RSA: an HMAC with the IdP's secret over what SignedInfo commits to.
      const sigVal = Auth.hmacSha256b64('idp-signing-key', 'ref=' + id + ';digest=' + digest);
      return L(
        '    <ds:Signature xmlns:ds="http://www.w3.org/2000/09/xmldsig#">',
        signedInfo,
        '      <ds:SignatureValue>' + sigVal + '</ds:SignatureValue>',
        '      <ds:KeyInfo><ds:X509Data><ds:X509Certificate>MIIDqDCCApCgAwIBAgIGAZK7w9' +
          'xMMA0GCSqGSIb3DQEBCwUAMIGUMQswCQYDVQQGEwJVUzET…</ds:X509Certificate></ds:X509Data></ds:KeyInfo>',
        '    </ds:Signature>');
    }
    // Digest = SHA-256 of the Assertion with <ds:Signature> removed (enveloped-signature transform).
    // Our "canonicalization" is the browser's XMLSerializer; samlCheck() uses the same steps.
    function digestWithoutSig(xml) {
      const el = new DOMParser().parseFromString(xml, 'application/xml').documentElement;
      const sig = el.getElementsByTagNameNS('http://www.w3.org/2000/09/xmldsig#', 'Signature')[0];
      if (sig) sig.parentNode.removeChild(sig);
      return Auth.b64(Auth.sha256(new XMLSerializer().serializeToString(el)));
    }
    function signedAssertion(o) {
      o = o || {};
      const id = o.id || '_a7c3e1d0';
      const open = '<saml:Assertion' + NS + ' ID="' + id + '" Version="2.0" IssueInstant="' + isoAt(-1) + '">';
      const lines = assertionBody(o).split('\n');
      const build = (sigXml) => open + '\n' + lines[0] + '\n' + (sigXml ? sigXml + '\n' : '') +
        lines.slice(1).join('\n') + '\n  </saml:Assertion>';
      if (o.unsigned) return build('');
      const digest = digestWithoutSig(build(signatureXml(id, 'x')));
      return build(signatureXml(id, digest));
    }
    function response(o, assertionXml) {
      o = o || {};
      return L(
        '<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"' + NS,
        '    ID="_r91b2" Version="2.0" IssueInstant="' + isoAt(-1) + '"',
        '    Destination="' + (o.recipient || ACS) + '"' + (o.inResponseTo === null ? '' : ' InResponseTo="' + (o.inResponseTo || '_req42') + '"') + '>',
        '  <saml:Issuer>' + (o.issuer || IDP) + '</saml:Issuer>',
        '  <samlp:Status>',
        '    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>',
        '  </samlp:Status>',
        '  ' + (assertionXml || signedAssertion(o)),
        '</samlp:Response>');
    }
    return { SP, ACS, IDP, SSO, authnRequest, signedAssertion, response };
  }

  // ======================================================================
  // Lesson 1: OAuth is not login
  // ======================================================================
  function substitutionWidget() {
    const at = 'ya29.' + Auth.randB64url(24);
    const now = Math.floor(Date.now() / 1000);
    const idQuiz = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, {
      iss: 'https://accounts.provider.test', sub: 'alice-1029', aud: 'quizfun-app',
      iat: now, exp: now + 3600, email: 'alice@mail.test' }, 'quizfun-secret');
    const actorsA = [
      { id: 'm', label: 'PhotoApp mobile app', icon: '📱', store: {} },
      { id: 'p', label: 'Provider (login+API)', icon: '🏛', store: { users: 'alice-1029' } },
      { id: 'b', label: 'PhotoApp backend', icon: '🖥', store: {} },
    ];
    const actorsB = [
      { id: 'u', label: 'Alice (browser)', icon: '🌐', store: {} },
      { id: 'q', label: 'QuizFun (evil app)', icon: '😈', store: {} },
      { id: 'p', label: 'Provider (login+API)', icon: '🏛', store: { users: 'alice-1029' } },
      { id: 'b', label: 'PhotoApp backend', icon: '🖥', store: {} },
    ];
    Seq.mount('#flow', {
      title: 'Token substitution: "log in with an access token" is broken',
      intro: 'PhotoApp lets its mobile app log in by sending a Provider <b>access token</b> to its backend. Watch what an evil third-party app can do with that.',
      scenarios: [
        { name: '1 · How PhotoApp meant it', actors: actorsA, steps: [
          { from: 'm', to: 'p', label: 'OAuth: authorize PhotoApp', msg: L('GET /authorize?response_type=code&client_id=photoapp&scope=photos.read', '    &redirect_uri=com.photoapp:/cb&code_challenge=…&state=… HTTP/1.1', 'Host: accounts.provider.test'), note: 'Alice approves PhotoApp in the Provider\'s login page (OAuth code + PKCE, as in section 5).' },
          { from: 'p', to: 'm', kind: 'res', label: 'access_token (for photoapp)', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{ "access_token": "' + at + '",', '  "token_type": "Bearer", "expires_in": 3600, "scope": "photos.read" }'), set: { m: { access_token: at.slice(0, 14) + '…' } }, note: 'An access token is a <b>valet key</b>: "the holder may call these APIs". It says nothing about who is holding it.' },
          { from: 'm', to: 'b', label: 'POST /api/login {access_token}', msg: L('POST /api/login HTTP/1.1', 'Host: api.photoapp.test', 'Content-Type: application/json', '', '{ "access_token": "' + at + '" }'), hl: ['access_token'], note: 'The app hands the token to its backend and says "log me in".' },
          { from: 'b', to: 'p', kind: 'back', label: 'GET /me (Bearer token)', msg: L('GET /me HTTP/1.1', 'Host: api.provider.test', 'Authorization: Bearer ' + at), note: '"Pseudo-authentication": the backend asks the API whose data this token opens.' },
          { from: 'p', to: 'b', kind: 'back', label: '200 {sub: alice-1029}', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{ "id": "alice-1029", "email": "alice@mail.test" }') },
          { from: 'b', to: 'm', kind: 'res', label: '200 + session for alice', msg: L('HTTP/1.1 200 OK', 'Set-Cookie: session=s_71ac; HttpOnly; Secure', '', '{ "user": "alice-1029" }'), set: { b: { session_s_71ac: 'alice-1029' } }, note: 'Looks fine… but the backend never checked <b>which app</b> the token was issued to.' },
        ] },
        { name: '2 · ❌ Evil app substitutes a token', actors: actorsB, steps: [
          { from: 'u', to: 'q', label: 'Alice plays a quiz', msg: L('GET / HTTP/1.1', 'Host: quizfun.test'), note: 'Alice uses a harmless-looking quiz site that offers "Log in with Provider".' },
          { from: 'q', to: 'u', kind: 'redirect', label: '302 → Provider authorize', msg: L('HTTP/1.1 302 Found', 'Location: https://accounts.provider.test/authorize?response_type=code&client_id=quizfun-app&scope=profile&…') },
          { from: 'u', to: 'p', label: 'Alice logs in + consents', msg: L('POST /login HTTP/1.1', 'Host: accounts.provider.test', '', 'username=alice&password=•••••'), note: 'Completely legitimate OAuth. Alice consents to QuizFun reading her profile.' },
          { from: 'p', to: 'q', kind: 'back', label: 'token response (for quizfun-app)', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{ "access_token": "' + at + '", "token_type": "Bearer" }', '# issued to client_id = quizfun-app, but nothing in this string says so'), set: { q: { alice_token: at.slice(0, 14) + '…' } }, note: 'QuizFun (the attacker) now holds a valid access token for Alice.' },
          { from: 'q', to: 'b', kind: 'err', label: 'POST /api/login {Alice\'s token}', badge: 'Attack', msg: L('POST /api/login HTTP/1.1', 'Host: api.photoapp.test', 'Content-Type: application/json', '', '{ "access_token": "' + at + '" }'), hl: ['access_token'], note: 'The attacker replays Alice\'s token to <b>PhotoApp</b>, an app it was never meant for.' },
          { from: 'b', to: 'p', kind: 'back', label: 'GET /me', msg: L('GET /me HTTP/1.1', 'Host: api.provider.test', 'Authorization: Bearer ' + at) },
          { from: 'p', to: 'b', kind: 'back', label: '200 {id: alice-1029}', msg: L('HTTP/1.1 200 OK', '', '{ "id": "alice-1029", "email": "alice@mail.test" }'), note: 'The API happily answers: the token is valid for reading Alice\'s profile.' },
          { from: 'b', to: 'q', kind: 'err', label: '200 + session as ALICE', badge: 'Account takeover', msg: L('HTTP/1.1 200 OK', 'Set-Cookie: session=s_9e02; HttpOnly; Secure', '', '{ "user": "alice-1029" }'), set: { b: { session_s_9e02: 'alice-1029 (attacker!)' }, q: { photoapp_session: 's_9e02 = Alice' } }, note: 'The attacker is now logged into PhotoApp <b>as Alice</b>. The access token proved "someone may read Alice\'s profile", not "Alice is logging into PhotoApp".' },
        ] },
        { name: '3 · ✅ Fix: ID token with aud check', actors: actorsB, steps: [
          { from: 'p', to: 'q', kind: 'back', label: 'QuizFun gets Alice\'s ID token', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{ "access_token": "' + at + '",', '  "id_token": "' + idQuiz + '" }'), set: { q: { alice_id_token: 'aud=quizfun-app' } }, note: 'With OpenID Connect the Provider also returns an <b>ID token</b>: a signed statement "alice-1029 logged in <i>to quizfun-app</i>".' },
          { from: 'q', to: 'b', kind: 'err', label: 'POST /api/login {id_token}', badge: 'Attack', msg: L('POST /api/login HTTP/1.1', 'Host: api.photoapp.test', 'Content-Type: application/json', '', '{ "id_token": "' + idQuiz + '" }'), note: 'The attacker tries the same trick with the ID token.' },
          { from: 'b', to: 'b', label: 'verify sig, iss, aud, exp, nonce', msg: L('# decoded payload', JSON.stringify(Auth.jwtDecode(idQuiz).payload, null, 2), '', '# check: aud == "photoapp"?  →  "quizfun-app" ≠ "photoapp"  ✗'), hl: ['quizfun-app'], note: 'The <code>aud</code> (audience) claim names the client the token was minted for. It is signed, so the attacker cannot change it.' },
          { from: 'b', to: 'q', kind: 'err', label: '401 wrong audience', msg: L('HTTP/1.1 401 Unauthorized', 'Content-Type: application/json', '', '{ "error": "invalid_token", "error_description": "aud mismatch" }'), note: 'Rejected. (A backend that must accept access tokens can instead call the Provider\'s <b>introspection</b> endpoint and check <code>client_id</code>/<code>aud</code>.)' },
        ] },
      ],
    });
  }

  function askTokenWidget() {
    const Q = [
      ['Who is the user?', 'Not reliably. Often opaque; you must call an API (/me) and hope.', '<code>sub</code> (+ <code>iss</code>): a stable, unique user id at this provider.'],
      ['Which app was it issued to?', 'Not visible to you. Only the provider knows (introspection).', '<code>aud</code> = your client_id (and <code>azp</code>).'],
      ['When did the user log in?', 'Unknown. Refresh tokens can mint new access tokens for months without the user present.', '<code>auth_time</code> and <code>iat</code>.'],
      ['How did they log in (password? MFA?)', 'Unknown.', '<code>amr</code> (e.g. ["pwd","otp"]) and <code>acr</code>.'],
      ['Is this response for MY login attempt?', 'No way to tell.', '<code>nonce</code> echoes the random value you sent.'],
      ['Who is supposed to read it?', 'The resource server (API). Clients should treat it as opaque.', 'The client (your app). Never send it to APIs as a bearer token.'],
    ];
    const el = document.getElementById('ask');
    el.innerHTML = '<div class="row" id="qs"></div><div class="grid2" style="margin-top:8px">' +
      '<div class="card"><h4>🔑 Access token (OAuth)</h4><div id="a1" class="muted">Pick a question above.</div></div>' +
      '<div class="card"><h4>🪪 ID token (OpenID Connect)</h4><div id="a2" class="muted">Pick a question above.</div></div></div>';
    Q.forEach((q, i) => {
      const b = document.createElement('button');
      b.textContent = q[0];
      b.onclick = () => {
        document.querySelectorAll('#qs button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        document.getElementById('a1').innerHTML = q[1];
        document.getElementById('a2').innerHTML = q[2];
      };
      document.getElementById('qs').appendChild(b);
    });
  }

  function subExercise() {
    const OPTS = [
      ['sig', 'Verify the JWT signature with the Provider\'s published keys', true],
      ['iss', 'iss equals exactly https://accounts.provider.test', true],
      ['aud', 'aud contains PhotoApp\'s own client_id ("photoapp")', true],
      ['exp', 'exp is in the future (allowing a small clock skew)', true],
      ['nonce', 'nonce equals the random value PhotoApp generated for this login', true],
      ['me', 'Call /me with it and trust whichever user comes back', false],
      ['eyj', 'Check that the token starts with "eyJ" (looks like a JWT)', false],
      ['anyaud', 'Accept any aud, as long as the signature is valid', false],
    ];
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card"><b>PhotoApp backend: POST /api/login { id_token }</b>' +
      '<div class="muted">Tick every check the backend must perform before creating a session. Then click Check.</div>' +
      OPTS.map((o) => '<div><label><input type="checkbox" data-k="' + o[0] + '"' +
        (VARS.solved && o[2] ? ' checked' : '') + '> ' + o[1] + '</label></div>').join('') +
      '<button id="chk" style="margin-top:6px">Check</button><div id="res"></div></div>';
    document.getElementById('chk').onclick = () => {
      const msgs = [];
      OPTS.forEach((o) => {
        const on = el.querySelector('[data-k="' + o[0] + '"]').checked;
        if (on && !o[2]) msgs.push('✗ "' + o[1] + '" does not prove the login was for PhotoApp.');
        if (!on && o[2]) msgs.push('✗ Missing: ' + o[1]);
      });
      const r = document.getElementById('res');
      r.className = 'verdict ' + (msgs.length ? 'bad' : 'ok');
      r.innerHTML = msgs.length ? msgs.join('<br>') : '✅ Correct. Signature + iss prove who issued it, aud proves it was for you, exp and nonce stop replays.';
    };
  }

  // ======================================================================
  // Lesson 2: OIDC basics
  // ======================================================================
  function oidcFlowWidget() {
    const now = Math.floor(Date.now() / 1000);
    const state = Auth.randB64url(12), nonce = Auth.randB64url(12), verifier = Auth.randB64url(32);
    const challenge = Auth.sha256b64url(verifier), code = 'SplxlOBeZQQYbYS6WxSbIA';
    const SECRET = 'photoapp-client-secret-7f2c';
    const claims = { iss: 'https://id.acme.test', sub: '248289761001', aud: 'photoapp', exp: now + 300,
      iat: now, auth_time: now - 4, nonce: nonce, amr: ['pwd', 'otp'], name: 'Alice Doe',
      email: 'alice@acme.test', email_verified: true };
    const idToken = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, claims, SECRET);
    const access = 'at.' + Auth.randB64url(20);
    const q = 'response_type=code&client_id=photoapp' +
      '&redirect_uri=https%3A%2F%2Fphotoapp.test%2Fcallback&scope=openid%20profile%20email' +
      '&state=' + state + '&nonce=' + nonce + '&code_challenge=' + challenge + '&code_challenge_method=S256';
    Seq.mount('#flow', {
      title: 'OpenID Connect: authorization code flow with scope=openid',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookies' },
        { id: 'r', label: 'PhotoApp (RP)', icon: '🖥', store: {}, storeLabel: 'RP session store' },
        { id: 'i', label: 'id.acme.test (OP)', icon: '🏛', store: {}, storeLabel: 'OP state' },
      ],
      steps: [
        { from: 'b', to: 'r', label: 'GET /login', msg: L('GET /login HTTP/1.1', 'Host: photoapp.test'), note: 'Alice clicks "Sign in". In OIDC language PhotoApp is the <b>Relying Party (RP)</b> and the IdP is the <b>OpenID Provider (OP)</b>.' },
        { from: 'r', to: 'r', label: 'make state, nonce, PKCE verifier', set: { r: { state: state, nonce: nonce, code_verifier: verifier.slice(0, 16) + '…' } }, note: '<code>state</code> protects the redirect (CSRF), <code>nonce</code> will be copied <i>into the ID token</i> so the RP can tie the token to this login, PKCE protects the code.' },
        { from: 'r', to: 'b', kind: 'redirect', label: '302 → /authorize?scope=openid…', msg: L('HTTP/1.1 302 Found', 'Location: https://id.acme.test/authorize?' + q, 'Set-Cookie: pre_sid=p_33a1; HttpOnly; Secure; SameSite=Lax'), hl: ['scope=openid%20profile%20email', 'nonce=' + nonce], set: { b: { 'photoapp.test pre_sid': 'p_33a1' } }, note: '<code>scope=openid</code> is what turns plain OAuth into OpenID Connect. <code>profile email</code> ask for those claims.' },
        { from: 'b', to: 'i', label: 'GET /authorize', msg: L('GET /authorize?' + q + ' HTTP/1.1', 'Host: id.acme.test') },
        { from: 'i', to: 'b', kind: 'res', label: '200 login page', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<form method="post" action="/login"> email, password, one-time code … </form>') },
        { from: 'b', to: 'i', label: 'POST /login (password + OTP)', msg: L('POST /login HTTP/1.1', 'Host: id.acme.test', 'Content-Type: application/x-www-form-urlencoded', '', 'email=alice%40acme.test&password=%E2%80%A2%E2%80%A2%E2%80%A2&otp=492811') },
        { from: 'i', to: 'b', kind: 'redirect', label: '302 → /callback?code&state', msg: L('HTTP/1.1 302 Found', 'Location: https://photoapp.test/callback?code=' + code + '&state=' + state, 'Set-Cookie: op_session=op_91fd; Domain=id.acme.test; HttpOnly; Secure'), set: { b: { 'id.acme.test op_session': 'op_91fd' }, i: { code: code + ' → alice, nonce', op_session: 'alice (pwd+otp)' } }, note: 'The OP remembers the nonce together with the code.' },
        { from: 'b', to: 'r', label: 'GET /callback?code&state', msg: L('GET /callback?code=' + code + '&state=' + state + ' HTTP/1.1', 'Host: photoapp.test', 'Cookie: pre_sid=p_33a1') },
        { from: 'r', to: 'r', label: 'state matches ✓', note: 'Query <code>state</code> equals the one stored in the session.' },
        { from: 'r', to: 'i', kind: 'back', label: 'POST /token (code + verifier)', msg: L('POST /token HTTP/1.1', 'Host: id.acme.test', 'Authorization: Basic ' + Auth.b64('photoapp:' + SECRET), 'Content-Type: application/x-www-form-urlencoded', '', 'grant_type=authorization_code&code=' + code + '&redirect_uri=https%3A%2F%2Fphotoapp.test%2Fcallback', '&code_verifier=' + verifier) },
        { from: 'i', to: 'r', kind: 'back', label: '200 {access_token, id_token}', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', 'Cache-Control: no-store', '', '{', '  "access_token": "' + access + '",', '  "token_type": "Bearer",', '  "expires_in": 3600,', '  "scope": "openid profile email",', '  "id_token": "' + idToken + '"', '}'), hl: ['id_token'], set: { i: { code: null } }, note: 'Because the scope contained <code>openid</code>, the token response also carries an <b>id_token</b>. Its decoded content appears below the diagram.' },
        { from: 'r', to: 'r', label: 'validate ID token', msg: L('# 1 signature   HS256 with client_secret (real OPs mostly use RS256 + JWKS)  ✓', '# 2 iss         "https://id.acme.test" == expected                        ✓', '# 3 aud         contains "photoapp"                                       ✓', '# 4 exp         ' + claims.exp + ' > now                                       ✓', '# 5 iat         not in the future                                         ✓', '# 6 nonce       == session nonce ' + nonce + '                      ✓'), note: 'Only after every check passes does the RP believe "this is user <code>248289761001</code>".' },
        { from: 'r', to: 'b', kind: 'res', label: '302 / + Set-Cookie session', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: sid=s_5c0e; HttpOnly; Secure; SameSite=Lax'), set: { b: { 'photoapp.test sid': 's_5c0e', 'photoapp.test pre_sid': null }, r: { s_5c0e: 'sub=248289761001 (Alice)', state: null, nonce: null, code_verifier: null } }, note: 'The app creates its <b>own</b> session. The ID token\'s job is done: it was a one-time proof of login.' },
      ],
      onStep(i) {
        const p = document.getElementById('dec');
        if (i < 10) { p.innerHTML = '<span class="muted">The decoded ID token appears here at step 11.</span>'; return; }
        const d = Auth.jwtDecode(idToken);
        p.innerHTML = '<div class="grid2"><div><b>Header</b><pre class="box">' + Seq.esc(JSON.stringify(d.header, null, 2)) +
          '</pre></div><div><b>Payload (claims)</b><pre class="box">' + Seq.esc(JSON.stringify(d.payload, null, 2)) + '</pre></div></div>';
      },
    });
  }

  function idTokenLab() {
    const SECRET = 'photoapp-client-secret-7f2c';
    const RP = { iss: 'https://id.acme.test', client_id: 'photoapp', nonce: 'n-0S6_WzA2Mj' };
    const now = () => Math.floor(Date.now() / 1000);
    const EXPL = {
      iss: 'Issuer: who minted the token. Must equal the expected issuer exactly.',
      sub: 'Subject: stable unique user id at this issuer. Use (iss, sub) as the user key, not email.',
      aud: 'Audience: the client_id(s) this token is for.',
      azp: 'Authorized party: the client that requested it (needed when aud has several values).',
      exp: 'Expiry (Unix seconds). Reject when now > exp.',
      iat: 'Issued-at time.',
      auth_time: 'When the user actually authenticated (may be earlier than iat if SSO reused a session).',
      nonce: 'Echo of the random value the RP put in the authorize request. Stops replay/injection.',
      amr: 'Authentication methods references (RFC 8176): pwd, otp, mfa, hwk, …',
      acr: 'Authentication context class: the assurance level achieved.',
      email: 'Email address. Only trust it as an identifier if email_verified is true (and even then prefer sub).',
      email_verified: 'Whether the OP verified the email.',
      name: 'Display name (profile scope).',
    };
    function make(kind) {
      const t = now();
      const p = { iss: RP.iss, sub: '248289761001', aud: RP.client_id, exp: t + 300, iat: t, auth_time: t - 4,
        nonce: RP.nonce, amr: ['pwd', 'otp'], email: 'alice@acme.test', email_verified: true };
      let h = { alg: 'HS256', typ: 'JWT' };
      if (kind === 'aud') p.aud = 'quizfun-app';
      if (kind === 'exp') { p.iat = t - 7200; p.exp = t - 3600; p.auth_time = t - 7204; }
      if (kind === 'nonce') p.nonce = 'n-old-replayed';
      if (kind === 'iss') p.iss = 'https://id.evil.test';
      if (kind === 'none') {
        h = { alg: 'none', typ: 'JWT' };
        return Auth.b64url(JSON.stringify(h)) + '.' + Auth.b64url(JSON.stringify(p)) + '.';
      }
      const tok = Auth.jwtSign(h, p, SECRET);
      if (kind === 'edit') {
        const parts = tok.split('.');
        const p2 = Object.assign({}, p, { email: 'admin@acme.test', sub: '1' });
        return parts[0] + '.' + Auth.b64url(JSON.stringify(p2)) + '.' + parts[2];
      }
      return tok;
    }
    const el = document.getElementById('lab');
    el.innerHTML =
      '<div class="card"><b>RP expects</b> <span class="mono">iss=' + RP.iss + ' · client_id=' + RP.client_id +
      ' · session nonce=' + RP.nonce + ' · alg=HS256 (key = client_secret) · clock skew ±60s</span></div>' +
      '<div class="row"><span class="muted">Load a token:</span>' +
      [['ok', '✅ valid'], ['aud', 'for another app'], ['exp', 'expired'], ['nonce', 'wrong nonce'],
        ['iss', 'evil issuer'], ['none', 'alg: none'], ['edit', 'payload edited, old signature']]
        .map((k) => '<button data-k="' + k[0] + '">' + k[1] + '</button>').join('') + '</div>' +
      '<textarea id="tok" rows="4" spellcheck="false"></textarea>' +
      '<div class="muted">You can also edit the token text directly; everything below re-evaluates live.</div>' +
      '<div class="grid2"><div class="card"><h4>Decoded claims</h4><div id="claims"></div></div>' +
      '<div class="card"><h4>Validation checklist</h4><div id="checks"></div><div id="verdict"></div></div></div>';
    const ta = document.getElementById('tok');
    el.querySelectorAll('[data-k]').forEach((b) => (b.onclick = () => {
      el.querySelectorAll('[data-k]').forEach((x) => x.classList.remove('on'));
      b.classList.add('on');
      ta.value = make(b.dataset.k);
      run();
    }));
    function fmtVal(k, v) {
      if ((k === 'exp' || k === 'iat' || k === 'auth_time') && typeof v === 'number') {
        const d = v - now();
        return v + ' <span class="muted">(' + (d >= 0 ? 'in ' + d + 's' : Math.abs(d) + 's ago') + ')</span>';
      }
      return Seq.esc(JSON.stringify(v));
    }
    function run() {
      let d;
      const C = [];
      try { d = Auth.jwtDecode(ta.value); } catch (e) { d = null; }
      if (!d) {
        document.getElementById('claims').innerHTML = '<span class="bad">Not a decodable JWT (need header.payload.signature, base64url JSON).</span>';
        document.getElementById('checks').innerHTML = '';
        document.getElementById('verdict').className = 'verdict bad';
        document.getElementById('verdict').textContent = '❌ Reject';
        return;
      }
      const p = d.payload, t = now();
      document.getElementById('claims').innerHTML = '<div class="mono">header: ' + Seq.esc(JSON.stringify(d.header)) + '</div>' +
        '<table class="t">' + Object.keys(p).map((k) => '<tr data-claim="' + k + '" style="cursor:pointer"><td class="mono"><b>' + k +
        '</b></td><td class="mono">' + fmtVal(k, p[k]) + '</td></tr>').join('') + '</table>' +
        '<div class="card muted" id="cx">👆 Click a claim to see what it means.</div>';
      document.querySelectorAll('[data-claim]').forEach((tr) => (tr.onclick = () => {
        document.getElementById('cx').innerHTML = '<b>' + tr.dataset.claim + '</b>: ' + (EXPL[tr.dataset.claim] || 'custom claim');
      }));
      const auds = [].concat(p.aud || []);
      C.push(['1. alg is the expected one (not "none")', d.header.alg === 'HS256', 'alg = ' + d.header.alg]);
      C.push(['2. signature valid', d.header.alg === 'HS256' && Auth.jwtVerify(ta.value, SECRET), d.header.alg !== 'HS256' ? 'skipped: refuse unexpected alg' : 'HMAC over header.payload']);
      C.push(['3. iss == expected issuer', p.iss === RP.iss, 'iss = ' + p.iss]);
      C.push(['4. aud contains my client_id', auds.indexOf(RP.client_id) >= 0 && (auds.length === 1 || p.azp === RP.client_id), 'aud = ' + JSON.stringify(p.aud)]);
      C.push(['5. exp not passed', typeof p.exp === 'number' && t <= p.exp + 60, 'exp - now = ' + (p.exp - t) + 's']);
      C.push(['6. iat not in the future', typeof p.iat === 'number' && p.iat <= t + 60, 'iat - now = ' + (p.iat - t) + 's']);
      C.push(['7. nonce == session nonce', p.nonce === RP.nonce, 'nonce = ' + p.nonce]);
      document.getElementById('checks').innerHTML = C.map((c) => '<div>' + (c[1] ? '<span class="ok">✓</span> ' : '<span class="bad">✗</span> ') +
        c[0] + ' <span class="muted">' + Seq.esc(c[2]) + '</span></div>').join('');
      const fail = C.filter((c) => !c[1]);
      const v = document.getElementById('verdict');
      v.className = 'verdict ' + (fail.length ? 'bad' : 'ok');
      v.textContent = fail.length ? '❌ Reject: ' + fail[0][0].slice(3) : '✅ Accept: user = (' + p.iss + ', ' + p.sub + ')';
    }
    ta.oninput = run;
    el.querySelector('[data-k=ok]').click();
  }

  function idTokenExercise() {
    const RP = { iss: 'https://id.acme.test', client_id: 'photoapp', nonce: 'n-0S6_WzA2Mj' };
    const t = Math.floor(Date.now() / 1000);
    const base = () => ({ iss: RP.iss, sub: '248289761001', aud: 'photoapp', exp: t + 300, iat: t, nonce: RP.nonce });
    const CASES = [
      ['A', { alg: 'RS256', kid: 'k1' }, Object.assign(base(), { aud: ['photoapp-admin'] }), 'aud'],
      ['B', { alg: 'RS256', kid: 'k1' }, Object.assign(base(), { iss: 'https://id.acme.test/' }), 'iss'],
      ['C', { alg: 'RS256', kid: 'k1' }, base(), 'accept'],
      ['D', { alg: 'none' }, base(), 'alg'],
      ['E', { alg: 'RS256', kid: 'k1' }, Object.assign(base(), { iat: t - 90000, exp: t - 86400 }), 'exp'],
      ['F', { alg: 'RS256', kid: 'k1' }, Object.assign(base(), { nonce: 'n-Zx81_Qa' }), 'nonce'],
    ];
    const OPTS = [['', '— choose —'], ['accept', 'Accept (all checks pass)'], ['alg', 'Reject: alg'], ['iss', 'Reject: iss'],
      ['aud', 'Reject: aud'], ['exp', 'Reject: exp'], ['nonce', 'Reject: nonce']];
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card mono">RP config → issuer "' + RP.iss + '", client_id "' + RP.client_id +
      '", session nonce "' + RP.nonce + '", expected alg RS256. Assume every RS256 signature verifies.</div>' +
      CASES.map((c) => '<div class="card"><b>Token ' + c[0] + '</b> <select data-c="' + c[0] + '">' +
        OPTS.map((o) => '<option value="' + o[0] + '"' + (VARS.solved && o[0] === c[3] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select><div class="mono">header ' + Seq.esc(JSON.stringify(c[1])) + '<br>payload ' +
        Seq.esc(JSON.stringify(c[2])).replace(/"(exp|iat)":(\d+)/g, (m, k, v) => '"' + k + '":' + v + ' <i>(' + (v - t >= 0 ? 'in ' + (v - t) + 's' : (t - v) + 's ago') + ')</i>') +
        '</div></div>').join('') +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const wrong = CASES.filter((c) => el.querySelector('[data-c="' + c[0] + '"]').value !== c[3]).map((c) => c[0]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (wrong.length ? 'bad' : 'ok');
      r.innerHTML = wrong.length ? '❌ Not quite: look again at token(s) ' + wrong.join(', ') + '. Compare every claim to the RP config character by character.'
        : '✅ All six right. Note B: a trailing slash makes the issuer a different string, and issuer comparison is exact.';
    };
  }

  window.LESSONS.push(
    {
      id: 'oauth-is-not-auth',
      section: SEC,
      title: 'OAuth is not login',
      explain: `
        <p>In section 5 you learned that OAuth 2 gives an app an <strong>access token</strong> so it can call an API on the user's behalf. Many people then thought: "if I can call <code>/me</code> with the token, I know who the user is, so OAuth is a login protocol." That shortcut is called <strong>pseudo-authentication</strong>, and it is dangerous.</p>
        <h3>Valet key vs passport</h3>
        <p>An access token is like a <strong>valet key</strong> for a car: it opens certain doors. Whoever holds it can use it, and the key itself does not say who is holding it or which valet it was handed to. A login needs a <strong>passport</strong>: a document that says <em>who</em> you are, <em>who issued it</em>, and <em>who it was issued for</em>.</p>
        <p>What an access token does <em>not</em> tell your app:</p>
        <ul>
          <li><strong>Which app</strong> it was issued to. A token minted for a different app works just as well on the API.</li>
          <li><strong>Whether the user is present right now</strong>. Refresh tokens can mint new access tokens for months.</li>
          <li><strong>How and when</strong> the user logged in (password? MFA?).</li>
          <li>Whether it belongs to <strong>this login attempt</strong> or was injected by an attacker.</li>
        </ul>
        <h3>The token substitution attack</h3>
        <p>If your backend accepts "here is an access token, please log me in", any other app that ever received a token for that user (a quiz, a game, a malicious browser extension) can replay it to you and log in <strong>as that user</strong>. The API happily answers <code>/me</code>, because the token really is valid. It just was not meant for you.</p>
        <div class="warn">Never build "log in with an access token". Access tokens are meant for the <strong>API</strong> (resource server), not for the client to learn who logged in.</div>
        <h3>The fix: OpenID Connect</h3>
        <p><strong>OpenID Connect (OIDC)</strong> is a thin identity layer on top of OAuth 2. Add <code>scope=openid</code> and the provider also returns an <strong>ID token</strong>: a signed JWT that says "user <code>sub</code> authenticated at <code>auth_time</code>, issued by <code>iss</code>, <strong>for client <code>aud</code></strong>, in response to <code>nonce</code>". Your app checks those claims, and a substituted token fails the <code>aud</code> check. The next lesson dissects it.</p>
        <div class="tip">Rule of thumb: <strong>ID token = for the client</strong> (who logged in?). <strong>Access token = for the API</strong> (may this request access this data?).</div>
      `,
      examples: [
        {
          title: 'Token substitution: the attack and the fix',
          code: W('<div id="flow"></div>', substitutionWidget, [L]),
          explain: `
            <details>
              <summary>The problem: a valid token, the wrong app</summary>
              <p>PhotoApp's mobile app obtains an access token and sends it to the PhotoApp backend, which calls <code>/me</code> to learn the user. The backend's only question is "is this token valid?". The question it <em>should</em> ask is "was this token issued <strong>to me</strong> for <strong>this login</strong>?".</p>
            </details>
            <details>
              <summary>Step by step: scenario 2 (the attack)</summary>
              <table>
                <tr><th>Step</th><th>What happens</th><th>Who holds what</th></tr>
                <tr><td>1–3</td><td>Alice logs into QuizFun with the Provider (normal OAuth)</td><td>nothing stolen yet</td></tr>
                <tr><td>4</td><td>Provider sends QuizFun an access token for Alice</td><td>QuizFun: <code>alice_token</code></td></tr>
                <tr><td>5</td><td>QuizFun POSTs <em>that</em> token to PhotoApp's <code>/api/login</code></td><td>PhotoApp sees just a string</td></tr>
                <tr><td>6–7</td><td>PhotoApp calls <code>/me</code>; Provider answers <code>alice-1029</code></td><td>token is valid, so 200</td></tr>
                <tr><td>8</td><td>PhotoApp creates a session for Alice and gives it to the attacker</td><td>QuizFun: <code>photoapp_session = Alice</code></td></tr>
              </table>
            </details>
            <details>
              <summary>Key idea: the audience claim</summary>
              <p>In scenario 3 the attacker only has an ID token whose signed <code>aud</code> is <code>quizfun-app</code>. PhotoApp compares it to its own client_id <code>photoapp</code> and rejects. The attacker cannot edit <code>aud</code> without breaking the signature.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Switch between tabs 2 and 3 and watch the PhotoApp state card: in tab 2 a session for Alice appears; in tab 3 it never does.</li>
                <li>Click step 3 in tab 3 and find the highlighted <code>quizfun-app</code> in the decoded payload.</li>
              </ul>
            </details>
          `,
        },
        {
          title: 'Ask the token: access token vs ID token',
          code: W('<div id="ask"></div>', askTokenWidget),
        },
      ],
      quiz: [
        { q: 'Why is "call /me with the access token and log that user in" unsafe?', options: ['Access tokens are never valid for /me', 'The token may have been issued to a different app and replayed to yours', '/me is too slow', 'Access tokens are always encrypted'], answer: 1, why: 'The API accepts any valid token, whichever client it was issued to. Your app cannot tell it was meant for someone else.' },
        { q: 'What turns an OAuth 2 authorization request into an OpenID Connect one?', options: ['Adding scope=openid', 'Using POST instead of GET', 'Adding response_type=token', 'Using a refresh token'], answer: 0, why: 'The openid scope value signals OIDC; the OP then returns an ID token.' },
        { q: 'Which claim stops a token minted for QuizFun from being accepted by PhotoApp?', options: ['sub', 'iat', 'aud', 'email'], answer: 2, why: 'aud (audience) names the client the ID token is for. PhotoApp must require its own client_id.' },
        { q: 'Who is the intended consumer of an access token?', options: ['The client app, to learn the user', 'The resource server (API)', 'The browser', 'The user'], answer: 1, why: 'Clients should treat access tokens as opaque and just forward them to the API.' },
      ],
      exercise: {
        task: '<p>PhotoApp now accepts an <strong>ID token</strong> on <code>POST /api/login</code>. In the box below, tick every check it must perform before creating a session, then click <strong>Check</strong>.</p>',
        hint: 'Five checks are needed: who issued it, that it is authentic, who it is for, that it is fresh, and that it belongs to this login attempt.',
        starter: W('<div id="ex"></div>', subExercise),
        solution: W('<div id="ex"></div>', subExercise, [], { solved: true }),
      },
    },
    {
      id: 'oidc-basics',
      section: SEC,
      title: 'OpenID Connect: the ID token',
      explain: `
        <p><strong>OpenID Connect 1.0</strong> (OIDC) is OAuth 2 + a standard way to say <em>who logged in</em>. It reuses the authorization code flow you already know and adds three things:</p>
        <ul>
          <li><code>scope=openid</code> (plus optional <code>profile</code>, <code>email</code>, <code>address</code>, <code>phone</code>)</li>
          <li>a <code>nonce</code> parameter: a random value the app generates and later finds <em>inside</em> the ID token</li>
          <li>an <strong>ID token</strong> in the token response: a signed JWT about the authentication event</li>
        </ul>
        <p>Vocabulary: the app is the <strong>Relying Party (RP)</strong>, the identity provider is the <strong>OpenID Provider (OP)</strong>.</p>
        <pre><code class="language-http">GET /authorize?response_type=code&amp;client_id=photoapp
    &amp;redirect_uri=https%3A%2F%2Fphotoapp.test%2Fcallback
    &amp;scope=openid%20profile%20email
    &amp;state=af0ifjsldkj&amp;nonce=n-0S6_WzA2Mj
    &amp;code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&amp;code_challenge_method=S256 HTTP/1.1
Host: id.acme.test</code></pre>
        <h3>The ID token's claims</h3>
        <table>
          <tr><th>Claim</th><th>Meaning</th></tr>
          <tr><td><code>iss</code></td><td>Issuer URL. Must match exactly.</td></tr>
          <tr><td><code>sub</code></td><td>Subject: stable user id at that issuer. <strong>(iss, sub)</strong> is the user key.</td></tr>
          <tr><td><code>aud</code></td><td>Audience: your client_id.</td></tr>
          <tr><td><code>exp</code>, <code>iat</code></td><td>Expiry and issued-at (Unix seconds).</td></tr>
          <tr><td><code>nonce</code></td><td>Echo of your nonce.</td></tr>
          <tr><td><code>auth_time</code></td><td>When the user really authenticated (SSO may reuse an older login).</td></tr>
          <tr><td><code>amr</code> / <code>acr</code></td><td>How they authenticated (<code>pwd</code>, <code>otp</code>, <code>mfa</code>…) and the assurance level.</td></tr>
          <tr><td><code>email</code>, <code>email_verified</code>, <code>name</code>…</td><td>Profile claims, if requested and allowed.</td></tr>
        </table>
        <h3>Validation checklist (OIDC Core §3.1.3.7)</h3>
        <ol>
          <li>Signature is valid using the OP's key, and <code>alg</code> is the one you expect (never <code>none</code>).</li>
          <li><code>iss</code> equals the expected issuer exactly.</li>
          <li><code>aud</code> contains your client_id (if several audiences, <code>azp</code> must be you).</li>
          <li><code>exp</code> has not passed; <code>iat</code> is reasonable.</li>
          <li><code>nonce</code> equals the one you stored for this login.</li>
          <li>If you sent <code>max_age</code>, check <code>auth_time</code>.</li>
        </ol>
        <div class="tip">When the RP receives the ID token directly from the token endpoint over TLS (the code flow), the spec allows skipping signature validation. Libraries verify it anyway, and so should you; it costs nothing.</div>
        <h3>Which token goes to the API?</h3>
        <p>The <strong>access token</strong>. The ID token is for the RP itself; its <code>aud</code> is your client, not the API. Sending ID tokens as bearer tokens to APIs is a common mistake: the API would be accepting tokens whose audience is someone else.</p>
        <div class="warn">Do not identify users by <code>email</code>. Emails change and can be re-assigned. Store <code>iss + sub</code>.</div>
      `,
      examples: [
        {
          title: 'The OIDC code flow, with a real ID token',
          code: W('<div id="flow"></div><div class="card" id="dec"></div>', oidcFlowWidget, [L]),
        },
        {
          title: 'ID token validator lab',
          code: W('<div id="lab"></div>', idTokenLab),
          explain: `
            <details>
              <summary>The problem: a JWT that decodes is not a JWT you can trust</summary>
              <p>Anyone can base64-encode JSON. Decoding shows you the claims, but <em>trust</em> comes only from the checks: an attacker can mint a token with <code>alg: none</code>, replay an old one, use one meant for another app, or edit the payload and keep the old signature.</p>
            </details>
            <details>
              <summary>Step by step: what each "Load a token" button breaks</summary>
              <table>
                <tr><th>Button</th><th>What changed</th><th>First failing check</th></tr>
                <tr><td>✅ valid</td><td>nothing</td><td>none: Accept</td></tr>
                <tr><td>for another app</td><td><code>aud = "quizfun-app"</code> (signed correctly)</td><td>4. aud</td></tr>
                <tr><td>expired</td><td><code>exp</code> one hour ago</td><td>5. exp</td></tr>
                <tr><td>wrong nonce</td><td><code>nonce</code> from an older login</td><td>7. nonce</td></tr>
                <tr><td>evil issuer</td><td><code>iss = https://id.evil.test</code></td><td>3. iss</td></tr>
                <tr><td>alg: none</td><td>header <code>alg: none</code>, empty signature</td><td>1. alg (signature check is skipped and refused)</td></tr>
                <tr><td>payload edited</td><td>email and sub changed, old signature kept</td><td>2. signature</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>The signature covers <code>header.payload</code>; one changed byte breaks it (try the "payload edited" button).</li>
                <li>A perfectly signed token can still be wrong for you: <code>aud</code>, <code>iss</code>, <code>exp</code> and <code>nonce</code> are separate checks.</li>
                <li>The demo signs with HS256 using the client secret (allowed by OIDC for confidential clients). Most OPs use RS256/ES256 with public keys from the JWKS (next lesson).</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Click <strong>✅ valid</strong>, then change one character in the middle part of the token in the textarea. The signature check fails.</li>
                <li>Click <strong>expired</strong> and read the <code>exp</code> row: the "… s ago" hint shows how stale it is.</li>
              </ul>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'What is the purpose of the nonce parameter?', options: ['Encrypt the ID token', 'Bind the ID token to this specific login attempt so it cannot be replayed or injected', 'Replace the state parameter', 'Choose the signing algorithm'], answer: 1, why: 'The RP stores the nonce in the session and requires the same value inside the ID token.' },
        { q: 'Which pair should your database use as the user\'s key?', options: ['email', 'name + email', 'iss + sub', 'aud + sub'], answer: 2, why: 'sub is unique and stable only within one issuer, so combine it with iss.' },
        { q: 'Your API receives a request. Which token should the client have sent in Authorization: Bearer?', options: ['The ID token', 'The access token', 'The nonce', 'The authorization code'], answer: 1, why: 'Access tokens are for APIs. ID tokens are for the client and their aud is the client.' },
        { q: 'An ID token header says "alg":"none". What do you do?', options: ['Accept it if the claims look right', 'Reject it: only accept the algorithm you expect', 'Verify with HS256 instead', 'Ask the user to log in twice'], answer: 1, why: 'Pin the expected algorithm(s). alg:none means unsigned.' },
        { q: 'iss in the token is "https://id.acme.test/" but you expect "https://id.acme.test". Valid?', options: ['Yes, trailing slashes are ignored', 'No, the issuer comparison is an exact string match', 'Only if sub matches', 'Yes, if aud matches'], answer: 1, why: 'OIDC requires the issuer to match exactly.' },
      ],
      exercise: {
        task: '<p>Six ID tokens arrived at PhotoApp. For each one, in the box below choose whether to accept it or which check fails, then click <strong>Check</strong>.</p>',
        hint: 'Compare iss character by character (slashes count), check aud is a list containing "photoapp", look at the "s ago" hint for exp, and read the header alg.',
        starter: W('<div id="ex"></div>', idTokenExercise),
        solution: W('<div id="ex"></div>', idTokenExercise, [], { solved: true }),
      },
    },
  );

  // ======================================================================
  // Lesson 3: Discovery, JWKS & UserInfo
  // ======================================================================
  function discoveryDoc() {
    return {
      issuer: 'https://id.acme.test',
      authorization_endpoint: 'https://id.acme.test/oauth2/authorize',
      token_endpoint: 'https://id.acme.test/oauth2/token',
      userinfo_endpoint: 'https://id.acme.test/oauth2/userinfo',
      jwks_uri: 'https://id.acme.test/oauth2/keys',
      end_session_endpoint: 'https://id.acme.test/oauth2/logout',
      revocation_endpoint: 'https://id.acme.test/oauth2/revoke',
      introspection_endpoint: 'https://id.acme.test/oauth2/introspect',
      registration_endpoint: 'https://id.acme.test/oauth2/register',
      scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
      response_types_supported: ['code'],
      response_modes_supported: ['query', 'form_post'],
      grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
      subject_types_supported: ['public', 'pairwise'],
      id_token_signing_alg_values_supported: ['RS256', 'ES256'],
      token_endpoint_auth_methods_supported: ['client_secret_basic', 'private_key_jwt'],
      code_challenge_methods_supported: ['S256'],
      claims_supported: ['iss', 'sub', 'aud', 'exp', 'iat', 'auth_time', 'nonce', 'amr', 'name', 'email', 'email_verified'],
      backchannel_logout_supported: true,
      backchannel_logout_session_supported: true,
    };
  }

  function discoveryExplorer() {
    const DOC = discoveryDoc();
    const INFO = {
      issuer: 'The OP\'s identifier. Must equal the URL you fetched this from (minus /.well-known/…) and must equal every ID token\'s <code>iss</code>.',
      authorization_endpoint: 'Where the <b>browser</b> is redirected to log in (GET /authorize?response_type=code&scope=openid…).',
      token_endpoint: 'Where your <b>backend</b> POSTs the code (+ PKCE verifier, client auth) to get tokens.',
      userinfo_endpoint: 'GET with <code>Authorization: Bearer &lt;access_token&gt;</code> → JSON claims about the user.',
      jwks_uri: 'JSON Web Key Set: the OP\'s <b>public</b> signing keys. Pick the key whose <code>kid</code> matches the ID token header.',
      end_session_endpoint: 'RP-initiated logout (see the logout lesson).',
      revocation_endpoint: 'RFC 7009: revoke a refresh/access token.',
      introspection_endpoint: 'RFC 7662: an API asks "is this token active, and for which client?"',
      registration_endpoint: 'Dynamic Client Registration (RFC 7591): apps register themselves via API.',
      scopes_supported: 'Scopes you may request. offline_access asks for a refresh token.',
      response_types_supported: 'Which flows exist. Modern OPs offer only "code" (implicit flow is discouraged).',
      response_modes_supported: 'How the code returns: in the query string, or as an auto-POSTed form (form_post).',
      grant_types_supported: 'Grant types the token endpoint accepts.',
      subject_types_supported: '"pairwise" gives each app a different sub for the same user (privacy: apps cannot correlate users).',
      id_token_signing_alg_values_supported: 'Algorithms the OP may sign ID tokens with. Pin the one you expect.',
      token_endpoint_auth_methods_supported: 'How confidential clients authenticate: HTTP Basic with a secret, or a signed JWT assertion.',
      code_challenge_methods_supported: 'PKCE methods. S256 should always be there.',
      claims_supported: 'Claims the OP can return.',
      backchannel_logout_supported: 'The OP can POST logout tokens to RPs server-to-server.',
      backchannel_logout_session_supported: 'Logout tokens can carry a <code>sid</code> (session id) claim.',
    };
    const TASKS = [
      ['Send the user to log in', 'authorization_endpoint'], ['Swap code for tokens', 'token_endpoint'],
      ['Verify an ID token signature', 'jwks_uri'], ['Get the user\'s profile', 'userinfo_endpoint'],
      ['Log the user out of the OP', 'end_session_endpoint'], ['Check the iss claim', 'issuer'],
    ];
    const el = document.getElementById('disc');
    el.innerHTML = '<div class="muted">GET https://id.acme.test<b>/.well-known/openid-configuration</b> returned this. Click any key, or a task:</div>' +
      '<div class="row" id="tasks"></div>' +
      '<div class="grid2"><pre class="box" id="json" style="max-height:520px"></pre><div class="card" id="info"><span class="muted">👈 Click a key.</span></div></div>';
    const keys = Object.keys(DOC);
    document.getElementById('json').innerHTML = '{\n' + keys.map((k, i) =>
      '  <span data-key="' + k + '" style="cursor:pointer;color:#7fd6ea">"' + k + '"</span>: ' +
      Seq.esc(JSON.stringify(DOC[k])) + (i < keys.length - 1 ? ',' : '')).join('\n') + '\n}';
    function pick(k) {
      el.querySelectorAll('[data-key]').forEach((s) => {
        s.style.background = s.dataset.key === k ? '#f6c945' : '';
        s.style.color = s.dataset.key === k ? '#111' : '#7fd6ea';
      });
      document.getElementById('info').innerHTML = '<h4 class="mono">' + k + '</h4><div class="mono" style="margin-bottom:6px">' +
        Seq.esc(JSON.stringify(DOC[k])) + '</div><div>' + INFO[k] + '</div>';
    }
    el.querySelectorAll('[data-key]').forEach((s) => (s.onclick = () => pick(s.dataset.key)));
    TASKS.forEach((t) => {
      const b = document.createElement('button');
      b.textContent = t[0];
      b.onclick = () => pick(t[1]);
      document.getElementById('tasks').appendChild(b);
    });
  }

  function jwksFlow() {
    const DOC = discoveryDoc();
    const n1 = Auth.randB64url(256), n2 = Auth.randB64url(256);
    const short = (s) => s.slice(0, 46) + '…';
    const now = Math.floor(Date.now() / 1000);
    const idt = (kid) => Auth.b64url(JSON.stringify({ alg: 'RS256', kid: kid, typ: 'JWT' })) + '.' +
      Auth.b64url(JSON.stringify({ iss: DOC.issuer, sub: '248289761001', aud: 'photoapp', exp: now + 300, iat: now, nonce: 'n-0S6_WzA2Mj' })) +
      '.' + Auth.randB64url(256);
    const at = 'at.' + Auth.randB64url(20);
    const discSteps = [
      { from: 'r', to: 'i', kind: 'back', label: 'GET /.well-known/openid-configuration', msg: L('GET /.well-known/openid-configuration HTTP/1.1', 'Host: id.acme.test', 'Accept: application/json'), note: 'At start-up the RP only needs the <b>issuer URL</b>. Everything else is discovered.' },
      { from: 'i', to: 'r', kind: 'back', label: '200 discovery JSON', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', 'Cache-Control: public, max-age=3600', '', JSON.stringify({ issuer: DOC.issuer, authorization_endpoint: DOC.authorization_endpoint, token_endpoint: DOC.token_endpoint, userinfo_endpoint: DOC.userinfo_endpoint, jwks_uri: DOC.jwks_uri, id_token_signing_alg_values_supported: ['RS256'], '…': '…' }, null, 2)), hl: ['jwks_uri', 'issuer'], set: { r: { config: 'cached (1h)' } } },
      { from: 'r', to: 'r', label: 'issuer == configured issuer ✓', note: 'Check the document\'s <code>issuer</code> equals the URL you started from. Prevents a mix-up with another OP.' },
      { from: 'r', to: 'i', kind: 'back', label: 'GET /oauth2/keys (jwks_uri)', msg: L('GET /oauth2/keys HTTP/1.1', 'Host: id.acme.test') },
      { from: 'i', to: 'r', kind: 'back', label: '200 JWKS {keys:[…]}', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/jwk-set+json', '', JSON.stringify({ keys: [{ kty: 'RSA', use: 'sig', alg: 'RS256', kid: '2026-10-a', n: short(n1), e: 'AQAB' }] }, null, 2)), hl: ['"kid": "2026-10-a"'], set: { r: { jwks: 'kid 2026-10-a' } }, note: 'A JWK holds an RSA public key: modulus <code>n</code> and exponent <code>e</code> (AQAB = 65537), both base64url.' },
    ];
    Seq.mount('#flow', {
      title: 'Discovery → JWKS → verify → UserInfo',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐' },
        { id: 'r', label: 'PhotoApp backend (RP)', icon: '🖥', store: { issuer: 'https://id.acme.test' }, storeLabel: 'RP cache' },
        { id: 'i', label: 'id.acme.test (OP)', icon: '🏛', store: { signing_keys: '2026-10-a (active)' }, storeLabel: 'OP keys' },
      ],
      scenarios: [
        { name: '✅ Happy path', steps: discSteps.concat([
          { from: 'b', to: 'r', label: 'GET /callback?code&state', msg: L('GET /callback?code=SplxlOBeZQQYbYS6WxSbIA&state=af0ifjsldkj HTTP/1.1', 'Host: photoapp.test'), note: 'Later, a user logs in (flow from the previous lesson) and the RP exchanges the code.' },
          { from: 'i', to: 'r', kind: 'back', label: 'token response with id_token', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', '{ "access_token": "' + at + '", "token_type": "Bearer",', '  "id_token": "' + idt('2026-10-a').slice(0, 90) + '…" }', '', '# id_token header → {"alg":"RS256","kid":"2026-10-a","typ":"JWT"}'), hl: ['"kid":"2026-10-a"'] },
          { from: 'r', to: 'r', label: 'find key by kid → RS256 verify ✓', msg: L('# header.kid = 2026-10-a  → found in cached JWKS', '# RSASSA-PKCS1-v1_5-SHA256 verify(n, e, header.payload, signature) → true', '# then iss / aud / exp / nonce checks as before'), note: 'The OP signs with its <b>private</b> key; anyone with the public JWK can verify, but nobody else can sign.' },
          { from: 'r', to: 'i', kind: 'back', label: 'GET /oauth2/userinfo (Bearer)', msg: L('GET /oauth2/userinfo HTTP/1.1', 'Host: id.acme.test', 'Authorization: Bearer ' + at), hl: ['Authorization'], note: 'UserInfo is an OAuth-protected API: it takes the <b>access token</b>, not the ID token.' },
          { from: 'i', to: 'r', kind: 'back', label: '200 claims JSON', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/json', '', JSON.stringify({ sub: '248289761001', name: 'Alice Doe', given_name: 'Alice', family_name: 'Doe', preferred_username: 'alice', email: 'alice@acme.test', email_verified: true, picture: 'https://id.acme.test/avatars/alice.png', locale: 'en-AU', updated_at: 1792000000 }, null, 2)), set: { r: { profile: 'Alice Doe <alice@acme.test>' } } },
          { from: 'r', to: 'r', label: 'userinfo.sub == id_token.sub ✓', note: 'Spec rule: the UserInfo <code>sub</code> MUST match the ID token\'s <code>sub</code>, otherwise ignore the response.' },
        ]) },
        { name: '🔄 Key rotation (unknown kid)', steps: discSteps.concat([
          { from: 'i', to: 'i', label: 'OP rotates: new key 2026-11-b', set: { i: { signing_keys: '2026-11-b (active), 2026-10-a (retiring)' } }, note: 'OPs rotate keys regularly. They publish the new key in the JWKS before signing with it.' },
          { from: 'i', to: 'r', kind: 'back', label: 'id_token with kid 2026-11-b', msg: L('# id_token header', '{"alg":"RS256","kid":"2026-11-b","typ":"JWT"}'), hl: ['2026-11-b'] },
          { from: 'r', to: 'r', label: 'kid not in cache!', kind: 'err', note: 'Do not reject yet, and do not try every key either.' },
          { from: 'r', to: 'i', kind: 'back', label: 'GET /oauth2/keys (refetch)', msg: L('GET /oauth2/keys HTTP/1.1', 'Host: id.acme.test'), note: 'Refetch the JWKS once (rate-limited, so attackers cannot make you hammer the OP).' },
          { from: 'i', to: 'r', kind: 'back', label: '200 JWKS with 2 keys', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/jwk-set+json', '', JSON.stringify({ keys: [{ kty: 'RSA', use: 'sig', alg: 'RS256', kid: '2026-11-b', n: short(n2), e: 'AQAB' }, { kty: 'RSA', use: 'sig', alg: 'RS256', kid: '2026-10-a', n: short(n1), e: 'AQAB' }] }, null, 2)), set: { r: { jwks: 'kid 2026-11-b, 2026-10-a' } } },
          { from: 'r', to: 'r', label: 'verify with 2026-11-b ✓', note: 'Found it. Unknown kid after a refetch → reject.' },
        ]) },
        { name: '❌ UserInfo with a bad token', steps: discSteps.slice(0, 2).concat([
          { from: 'r', to: 'i', kind: 'back', label: 'GET /oauth2/userinfo (expired token)', msg: L('GET /oauth2/userinfo HTTP/1.1', 'Host: id.acme.test', 'Authorization: Bearer at.expired_9f1c') },
          { from: 'i', to: 'r', kind: 'err', label: '401 invalid_token', msg: L('HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Bearer error="invalid_token",', '    error_description="The access token expired"'), hl: ['WWW-Authenticate'], note: 'Bearer-protected APIs signal errors in <code>WWW-Authenticate</code> (RFC 6750). Refresh the access token and retry.' },
        ]) },
      ],
    });
  }

  function discExercise() {
    const DOC = {
      issuer: 'https://login.globex.test/realms/staff',
      authorization_endpoint: 'https://login.globex.test/realms/staff/protocol/openid-connect/auth',
      token_endpoint: 'https://login.globex.test/realms/staff/protocol/openid-connect/token',
      userinfo_endpoint: 'https://login.globex.test/realms/staff/protocol/openid-connect/userinfo',
      jwks_uri: 'https://login.globex.test/realms/staff/protocol/openid-connect/certs',
      end_session_endpoint: 'https://login.globex.test/realms/staff/protocol/openid-connect/logout',
      introspection_endpoint: 'https://login.globex.test/realms/staff/protocol/openid-connect/token/introspect',
      id_token_signing_alg_values_supported: ['RS256', 'ES256', 'PS256'],
    };
    const Q = [
      ['q1', 'Your backend wants to verify an ID token signature. Which URL does it GET?', 'jwks_uri'],
      ['q2', 'Which URL do you redirect the browser to so the user can log in?', 'authorization_endpoint'],
      ['q3', 'Your backend POSTs the authorization code to…', 'token_endpoint'],
      ['q4', 'Which URL gives profile claims when called with the access token?', 'userinfo_endpoint'],
      ['q5', 'Every ID token\'s iss claim must equal exactly…', 'issuer'],
    ];
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="muted">Discovery document of a Keycloak-style OP (paths differ per product; that is why you discover them):</div>' +
      '<pre class="box">' + Seq.esc(JSON.stringify(DOC, null, 2)) + '</pre>' +
      Q.map((q) => '<div style="margin:4px 0">' + q[1] + '<br><input data-q="' + q[0] + '" style="width:96%" class="mono" value="' +
        (VARS.solved ? DOC[q[2]] : '') + '"></div>').join('') +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const out = Q.map((q) => {
        const v = el.querySelector('[data-q="' + q[0] + '"]').value.trim();
        const hit = Object.keys(DOC).find((k) => DOC[k] === v);
        return v === DOC[q[2]] ? null : '✗ ' + q[1] + (hit ? ' (you used ' + hit + ')' : v ? ' (not an exact URL from the document)' : ' (empty)');
      }).filter(Boolean);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (out.length ? 'bad' : 'ok');
      r.innerHTML = out.length ? out.join('<br>') : '✅ All correct. One issuer URL is enough to configure a whole OIDC client.';
    };
  }

  // ======================================================================
  // Lesson 4: SSO concepts
  // ======================================================================
  function ssoFlow() {
    const IDP = 'login.acme-idp.test';
    const code1 = 'c_A1' + Auth.randHex(3), code2 = 'c_B7' + Auth.randHex(3);
    const auth = (cid, host, extra) => 'https://' + IDP + '/authorize?response_type=code&client_id=' + cid +
      '&redirect_uri=https%3A%2F%2F' + host + '%2Fcallback&scope=openid&state=' + Auth.randB64url(6) + '&nonce=' + Auth.randB64url(6) + (extra || '');
    const actors = [
      { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookie jar (by domain)' },
      { id: 'a', label: 'App A · app-a.test', icon: '📒', store: {}, storeLabel: 'App A sessions' },
      { id: 'i', label: 'IdP · ' + IDP, icon: '🏛', store: {}, storeLabel: 'IdP sessions' },
      { id: 'c', label: 'App B · app-b.test', icon: '📊', store: {}, storeLabel: 'App B sessions' },
    ];
    const pre = [
      { id: 'b', label: 'Browser', icon: '🌐', store: { 'app-a.test → a_sid': 'A_42', [IDP + ' → idp_sid']: 'I_77 (Alice)' }, storeLabel: 'Cookie jar (by domain)' },
      { id: 'a', label: 'App A · app-a.test', icon: '📒', store: { A_42: 'alice' }, storeLabel: 'App A sessions' },
      { id: 'i', label: 'IdP · ' + IDP, icon: '🏛', store: { I_77: 'alice, auth_time 09:00' }, storeLabel: 'IdP sessions' },
      { id: 'c', label: 'App B · app-b.test', icon: '📊', store: {}, storeLabel: 'App B sessions' },
    ];
    Seq.mount('#flow', {
      title: 'One IdP session cookie, many apps',
      intro: 'Watch the <b>Cookie jar</b> card: each cookie belongs to one domain. The "magic" of SSO is just the IdP\'s own cookie.',
      scenarios: [
        { name: '1 · App A, then App B (silent SSO)', actors: actors, steps: [
          { from: 'b', to: 'a', label: 'GET app-a.test/', msg: L('GET / HTTP/1.1', 'Host: app-a.test', '# no Cookie header: the jar has nothing for app-a.test'), note: 'Alice opens App A for the first time today.' },
          { from: 'a', to: 'b', kind: 'redirect', label: '302 → IdP /authorize', msg: L('HTTP/1.1 302 Found', 'Location: ' + auth('app-a', 'app-a.test')), note: 'No session at App A → send the browser to the IdP.' },
          { from: 'b', to: 'i', label: 'GET /authorize (no IdP cookie)', msg: L('GET /authorize?client_id=app-a&… HTTP/1.1', 'Host: ' + IDP, '# no Cookie header: nothing stored for ' + IDP + ' yet') },
          { from: 'i', to: 'b', kind: 'res', label: '200 login form', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<form method="post" action="/login">…</form>'), note: 'The IdP has no session for this browser, so it must ask for credentials.' },
          { from: 'b', to: 'i', label: 'POST /login (password)', msg: L('POST /login HTTP/1.1', 'Host: ' + IDP, 'Content-Type: application/x-www-form-urlencoded', '', 'username=alice&password=%E2%80%A2%E2%80%A2%E2%80%A2') },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 → A/callback + Set-Cookie idp_sid', msg: L('HTTP/1.1 302 Found', 'Location: https://app-a.test/callback?code=' + code1 + '&state=…', 'Set-Cookie: idp_sid=I_77; Path=/; Secure; HttpOnly; SameSite=None'), hl: ['Set-Cookie: idp_sid=I_77'], set: { b: { [IDP + ' → idp_sid']: 'I_77' }, i: { I_77: 'alice, auth_time 09:00' } }, note: '⭐ The IdP sets a cookie on <b>its own domain</b>. App A will never see it. This cookie is the SSO session.' },
          { from: 'b', to: 'a', label: 'GET /callback?code', msg: L('GET /callback?code=' + code1 + '&state=… HTTP/1.1', 'Host: app-a.test') },
          { from: 'a', to: 'i', kind: 'back', label: 'POST /token → id_token', msg: L('POST /token HTTP/1.1', 'Host: ' + IDP, 'Authorization: Basic YXBwLWE6…', '', 'grant_type=authorization_code&code=' + code1 + '&redirect_uri=…', '', '# response: 200 {"id_token":"eyJ…(sub=alice, aud=app-a)", "access_token":"…"}') },
          { from: 'a', to: 'b', kind: 'res', label: '302 / + Set-Cookie a_sid', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: a_sid=A_42; Secure; HttpOnly; SameSite=Lax'), set: { b: { 'app-a.test → a_sid': 'A_42' }, a: { A_42: 'alice' } }, note: 'App A now has its <b>own</b> local session. Two cookies, two domains.' },
          { from: 'b', to: 'c', label: 'GET app-b.test/', msg: L('GET / HTTP/1.1', 'Host: app-b.test', '# still no Cookie header: a_sid belongs to app-a.test only'), note: 'Later Alice opens App B. The browser does not send App A\'s cookie here.' },
          { from: 'c', to: 'b', kind: 'redirect', label: '302 → IdP /authorize', msg: L('HTTP/1.1 302 Found', 'Location: ' + auth('app-b', 'app-b.test')) },
          { from: 'b', to: 'i', label: 'GET /authorize + Cookie idp_sid ⭐', msg: L('GET /authorize?client_id=app-b&… HTTP/1.1', 'Host: ' + IDP, 'Cookie: idp_sid=I_77'), hl: ['Cookie: idp_sid=I_77'], note: '⭐ The aha moment: the browser <b>automatically</b> attaches the IdP cookie because the request goes to the IdP\'s domain.' },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 → B/callback (no prompt!)', msg: L('HTTP/1.1 302 Found', 'Location: https://app-b.test/callback?code=' + code2 + '&state=…', '# idp_sid I_77 is valid → skip the login form'), note: 'The IdP recognises Alice and issues a code straight away. Alice sees only a quick flicker of redirects.' },
          { from: 'b', to: 'c', label: 'GET /callback?code', msg: L('GET /callback?code=' + code2 + '&state=… HTTP/1.1', 'Host: app-b.test'), note: 'App B exchanges the code at /token (back-channel, as in step 8) and gets an ID token with aud=app-b, auth_time still 09:00.' },
          { from: 'c', to: 'b', kind: 'res', label: '302 / + Set-Cookie b_sid', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: b_sid=B_19; Secure; HttpOnly; SameSite=Lax'), set: { b: { 'app-b.test → b_sid': 'B_19' }, c: { B_19: 'alice' } }, note: 'Three cookies on three domains: two app sessions + one IdP session. One password typed.' },
        ] },
        { name: '2 · App B demands a fresh login (prompt=login)', actors: pre, steps: [
          { from: 'b', to: 'c', label: 'GET app-b.test/admin', msg: L('GET /admin HTTP/1.1', 'Host: app-b.test'), note: 'Same starting point: Alice is logged into App A and the IdP. App B\'s admin area is sensitive.' },
          { from: 'c', to: 'b', kind: 'redirect', label: '302 → /authorize?prompt=login', msg: L('HTTP/1.1 302 Found', 'Location: ' + auth('app-b', 'app-b.test', '&prompt=login&max_age=0')), hl: ['prompt=login', 'max_age=0'], note: '<code>prompt=login</code> tells the IdP: re-authenticate even if you have a session. <code>max_age=N</code>: the login must be at most N seconds old.' },
          { from: 'b', to: 'i', label: 'GET /authorize + Cookie idp_sid', msg: L('GET /authorize?client_id=app-b&prompt=login&max_age=0&… HTTP/1.1', 'Host: ' + IDP, 'Cookie: idp_sid=I_77'), hl: ['Cookie: idp_sid=I_77'] },
          { from: 'i', to: 'b', kind: 'res', label: '200 login form anyway', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<form method="post" action="/login"> Please confirm your password … </form>'), note: 'The cookie is there, but the RP asked for a fresh login.' },
          { from: 'b', to: 'i', label: 'POST /login', msg: L('POST /login HTTP/1.1', 'Host: ' + IDP, '', 'username=alice&password=%E2%80%A2%E2%80%A2%E2%80%A2') },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 → B/callback (new auth_time)', msg: L('HTTP/1.1 302 Found', 'Location: https://app-b.test/callback?code=' + code2 + '&state=…', 'Set-Cookie: idp_sid=I_78; Secure; HttpOnly; SameSite=None'), set: { b: { [IDP + ' → idp_sid']: 'I_78 (fresh)' }, i: { I_77: null, I_78: 'alice, auth_time 14:05' } } },
          { from: 'c', to: 'c', label: 'check auth_time ≥ now - max_age ✓', note: 'App B must verify <code>auth_time</code> in the ID token itself: a user could strip <code>prompt=login</code> from the URL.' },
          { from: 'c', to: 'b', kind: 'res', label: '200 admin page', msg: L('HTTP/1.1 200 OK', 'Set-Cookie: b_sid=B_20; Secure; HttpOnly'), set: { b: { 'app-b.test → b_sid': 'B_20' }, c: { B_20: 'alice (fresh 14:05)' } } },
        ] },
      ],
    });
  }

  function ssoPlayground() {
    const APPS = { A: 'app-a.test', B: 'app-b.test', C: 'app-c.test' };
    const S = { jar: {}, idp: null, prompts: 0, t: 0, freshC: false, log: [] };
    const el = document.getElementById('pg');
    el.innerHTML = '<div class="row"><b>Do:</b>' +
      Object.keys(APPS).map((k) => '<button data-v="' + k + '">Visit App ' + k + '</button>').join('') +
      '<button data-x="logoutA">Log out of App A (local only)</button>' +
      '<button data-x="expire">IdP session expires</button>' +
      '<button data-x="clear">Clear all cookies</button></div>' +
      '<label class="muted"><input type="checkbox" id="fresh"> App C always sends <code>prompt=login</code> (e.g. a payroll app)</label>' +
      '<div class="grid2" style="grid-template-columns:repeat(4,1fr)" id="jars"></div>' +
      '<div class="row"><span class="pill" id="pc"></span></div><div class="card mono" id="log" style="max-height:260px;overflow:auto"></div>';
    function jars() {
      const doms = ['app-a.test', 'app-b.test', 'app-c.test', 'login.acme-idp.test'];
      document.getElementById('jars').innerHTML = doms.map((d) => {
        const v = S.jar[d];
        return '<div class="card"><b class="muted">🍪 ' + d + '</b><div class="mono">' + (v ? v : '<span class="muted">(none)</span>') + '</div></div>';
      }).join('');
      document.getElementById('pc').textContent = 'Password prompts so far: ' + S.prompts;
      document.getElementById('log').innerHTML = S.log.length ? S.log.join('<br>') : '<span class="muted">Click "Visit App A" to start.</span>';
      const lg = document.getElementById('log');
      lg.scrollTop = lg.scrollHeight;
    }
    function log(h) { S.log.push(h); }
    function visit(k) {
      const host = APPS[k], ck = k.toLowerCase() + '_sid';
      log('<b>── Visit App ' + k + '</b>');
      if (S.jar[host]) { log(host + ': Cookie ' + S.jar[host] + ' → <span class="ok">already logged in, no IdP trip</span>'); return; }
      const fresh = k === 'C' && document.getElementById('fresh').checked;
      log(host + ': no ' + ck + ' → 302 to IdP /authorize?client_id=app-' + k.toLowerCase() + (fresh ? '&amp;prompt=login' : ''));
      if (S.idp && !fresh) {
        log('login.acme-idp.test: Cookie idp_sid=' + S.idp + ' → session valid → <span class="ok">no prompt</span>, 302 back with code');
      } else {
        log('login.acme-idp.test: ' + (S.idp ? 'idp_sid present but prompt=login' : 'no idp_sid') + ' → <span class="bad">🔑 password prompt</span>');
        S.prompts++;
        S.idp = 'I_' + (++S.t);
        S.jar['login.acme-idp.test'] = 'idp_sid=' + S.idp;
        log('login.acme-idp.test: Set-Cookie idp_sid=' + S.idp + ', 302 back with code');
      }
      S.jar[host] = ck + '=' + k + '_' + (++S.t);
      log(host + ': code → tokens (back-channel), Set-Cookie ' + S.jar[host] + ' ✅');
    }
    el.querySelectorAll('[data-v]').forEach((b) => (b.onclick = () => { visit(b.dataset.v); jars(); }));
    el.querySelectorAll('[data-x]').forEach((b) => (b.onclick = () => {
      const x = b.dataset.x;
      if (x === 'logoutA') { delete S.jar['app-a.test']; log('<b>── App A logout</b>: App A deleted a_sid. <i>The IdP cookie is untouched!</i>'); }
      if (x === 'expire') { delete S.jar['login.acme-idp.test']; S.idp = null; log('<b>── IdP session expired</b> (idle timeout). App sessions still exist.'); }
      if (x === 'clear') { S.jar = {}; S.idp = null; log('<b>── All cookies cleared</b> (new browser / private window).'); }
      jars();
    }));
    jars();
  }

  function ssoExercise() {
    const CASES = [
      ['1', 'a_sid (app-a.test), idp_sid (IdP)', 'Alice visits App A.', 'app'],
      ['2', 'idp_sid (IdP) only', 'Alice visits App B.', 'silent'],
      ['3', 'a_sid (app-a.test) only: the IdP session expired', 'Alice visits App B.', 'prompt'],
      ['4', 'a_sid, idp_sid', 'Alice visits App C, which sends prompt=login.', 'prompt'],
      ['5', 'a_sid, idp_sid', 'Alice clicks App A\'s "Log out" (it deletes a_sid only), then opens App A again.', 'silent'],
      ['6', 'b_sid (app-b.test), idp_sid', 'Alice opens App B in a brand-new private window.', 'prompt'],
    ];
    const OPT = [['', '— choose —'], ['app', 'No IdP trip: app session already exists'], ['silent', 'Silent SSO: redirect to IdP, no password'], ['prompt', 'Password prompt at the IdP']];
    const el = document.getElementById('ex');
    el.innerHTML = '<table class="t"><tr><th>#</th><th>Cookies in the browser</th><th>What happens</th><th>Your prediction</th></tr>' +
      CASES.map((c) => '<tr><td>' + c[0] + '</td><td class="mono">' + c[1] + '</td><td>' + c[2] + '</td><td><select data-c="' + c[0] + '">' +
        OPT.map((o) => '<option value="' + o[0] + '"' + (VARS.solved && o[0] === c[3] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select></td></tr>').join('') + '</table><button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = CASES.filter((c) => el.querySelector('[data-c="' + c[0] + '"]').value !== c[3]).map((c) => c[0]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? '❌ Re-think row(s) ' + bad.join(', ') + '. Ask: does the app have its own cookie? If not, does the IdP have one, and did the app ask for prompt=login? A private window starts with an empty jar.'
        : '✅ Correct. Row 5 is the classic surprise: logging out of the app alone does not log you out of the IdP.';
    };
  }

  window.LESSONS.push(
    {
      id: 'oidc-discovery',
      section: SEC,
      title: 'Discovery, JWKS & UserInfo',
      explain: `
        <p>An OIDC client needs a lot of configuration: where to send users, where to swap codes, which keys sign tokens… Instead of copying URLs by hand, OIDC Discovery says: give the client the <strong>issuer URL</strong> and it fetches the rest from a well-known address.</p>
        <pre><code class="language-http">GET /.well-known/openid-configuration HTTP/1.1
Host: id.acme.test

HTTP/1.1 200 OK
Content-Type: application/json

{ "issuer": "https://id.acme.test",
  "authorization_endpoint": "https://id.acme.test/oauth2/authorize",
  "token_endpoint": "https://id.acme.test/oauth2/token",
  "jwks_uri": "https://id.acme.test/oauth2/keys", … }</code></pre>
        <h3>JWKS: the public keys</h3>
        <p>Real OPs sign ID tokens with an <strong>asymmetric</strong> key (RS256 or ES256). The private key never leaves the OP; the public keys are published at <code>jwks_uri</code> as a <strong>JSON Web Key Set</strong>. Each key has a <code>kid</code> (key id). The ID token header names the <code>kid</code> it was signed with, so the RP knows which key to use.</p>
        <div class="tip">Cache the JWKS. If a token arrives with an unknown <code>kid</code>, refetch once (the OP probably rotated keys), then reject if it is still unknown.</div>
        <h3>UserInfo</h3>
        <p><code>userinfo_endpoint</code> is a small OAuth-protected API. Call it with the <strong>access token</strong> to get claims (<code>name</code>, <code>email</code>, <code>picture</code>…). Its <code>sub</code> must match the ID token's <code>sub</code>.</p>
        <h3>Standard claims by scope</h3>
        <table>
          <tr><th>Scope</th><th>Claims</th></tr>
          <tr><td><code>openid</code></td><td><code>sub</code> (required for OIDC)</td></tr>
          <tr><td><code>profile</code></td><td><code>name</code>, <code>given_name</code>, <code>family_name</code>, <code>preferred_username</code>, <code>picture</code>, <code>locale</code>, <code>updated_at</code>…</td></tr>
          <tr><td><code>email</code></td><td><code>email</code>, <code>email_verified</code></td></tr>
          <tr><td><code>phone</code> / <code>address</code></td><td><code>phone_number</code>, <code>phone_number_verified</code> / <code>address</code></td></tr>
        </table>
        <div class="warn"><code>preferred_username</code> and <code>email</code> are not stable or unique. They are for display. Use <code>iss + sub</code> as the key.</div>
      `,
      examples: [
        { title: 'Discovery document explorer', code: W('<div id="disc"></div>', discoveryExplorer, [discoveryDoc]) },
        {
          title: 'Discovery → JWKS → verify → UserInfo (with key rotation)',
          code: W('<div id="flow"></div>', jwksFlow, [L, discoveryDoc]),
          explain: `
            <details>
              <summary>Step by step: the happy path</summary>
              <table>
                <tr><th>Step</th><th>Request</th><th>Why</th></tr>
                <tr><td>1–3</td><td>GET discovery, check <code>issuer</code></td><td>learn every endpoint from one URL</td></tr>
                <tr><td>4–5</td><td>GET <code>jwks_uri</code></td><td>download public keys, cache by <code>kid</code></td></tr>
                <tr><td>6–8</td><td>token response → find key by <code>kid</code> → verify RS256</td><td>prove the OP signed it</td></tr>
                <tr><td>9–11</td><td>GET <code>/userinfo</code> with Bearer access token</td><td>profile claims; <code>sub</code> must match</td></tr>
              </table>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Open the <strong>🔄 Key rotation</strong> tab and watch the RP cache card: <code>jwks</code> grows from one kid to two at step 10.</li>
                <li>Open <strong>❌ UserInfo with a bad token</strong> and read the highlighted <code>WWW-Authenticate</code> header.</li>
              </ul>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'Where is the OIDC discovery document?', options: ['/oauth/config.json', '{issuer}/.well-known/openid-configuration', '/userinfo', '/jwks'], answer: 1, why: 'OpenID Connect Discovery 1.0 defines the /.well-known/openid-configuration path under the issuer.' },
        { q: 'An ID token header contains "kid":"2026-11-b" which is not in your cached JWKS. Best action?', options: ['Reject immediately', 'Try every cached key', 'Refetch the JWKS once (rate-limited), then verify or reject', 'Skip signature validation'], answer: 2, why: 'A new kid usually means key rotation; refetch, but rate-limit so attackers cannot force constant refetches.' },
        { q: 'Which token do you send to the userinfo endpoint?', options: ['ID token', 'Access token as a Bearer token', 'Refresh token', 'Authorization code'], answer: 1, why: 'UserInfo is an OAuth-protected resource.' },
        { q: 'Why can anyone download the JWKS without harm?', options: ['It is encrypted', 'It only contains public keys, which verify but cannot sign', 'It expires in 1 second', 'Only the RP can read JSON'], answer: 1, why: 'Asymmetric crypto: the private key stays at the OP.' },
      ],
      exercise: {
        task: '<p>You are wiring up a new OP. Using only its discovery document, fill in the exact URL or value for each question in the box below and click <strong>Check</strong>.</p>',
        hint: 'Each answer is one value copied exactly from the JSON: jwks_uri, authorization_endpoint, token_endpoint, userinfo_endpoint, issuer.',
        starter: W('<div id="ex"></div>', discExercise),
        solution: W('<div id="ex"></div>', discExercise, [], { solved: true }),
      },
    },
    {
      id: 'sso-concepts',
      section: SEC,
      title: 'Single Sign-On: how one login covers many apps',
      explain: `
        <p><strong>Single Sign-On (SSO)</strong>: log in once, use many apps. Your company's Google Workspace or Microsoft 365 login opens the calendar, the wiki and the HR portal without asking again. How?</p>
        <h3>There is no shared cookie</h3>
        <p>Beginners often guess the apps share a cookie. They can't: cookies are scoped to a domain, so <code>app-a.test</code> can never read a cookie of <code>app-b.test</code>. The trick is simpler:</p>
        <ol>
          <li>Each app redirects the browser to the <strong>same IdP</strong>.</li>
          <li>The first time, the IdP shows a login form and then sets a cookie on <strong>its own domain</strong> (the <em>IdP session</em>).</li>
          <li>Next time any app redirects there, the browser automatically sends that IdP cookie. The IdP sees "already logged in" and redirects straight back with a code. No password.</li>
          <li>Each app then creates its <strong>own local session</strong> cookie.</li>
        </ol>
        <div class="tip">Analogy: a festival wristband (the IdP session) at the entrance gate. Each stage (app) checks you at its own door by sending you to the gate; the gate sees your wristband and stamps your hand for that stage (app session).</div>
        <h3>So there are (at least) three sessions</h3>
        <ul>
          <li>App A's session (cookie on <code>app-a.test</code>)</li>
          <li>App B's session (cookie on <code>app-b.test</code>)</li>
          <li>The IdP session (cookie on <code>login.acme-idp.test</code>)</li>
        </ul>
        <p>They expire independently. That is why "log out" is tricky (see the logout lesson).</p>
        <h3>Asking for a fresh login</h3>
        <ul>
          <li><code>prompt=login</code>: re-authenticate even if an IdP session exists.</li>
          <li><code>max_age=600</code>: the login must be at most 10 minutes old; check <code>auth_time</code> in the ID token.</li>
          <li><code>prompt=none</code>: the opposite: never show UI; return <code>error=login_required</code> if there is no session (used for silent checks).</li>
        </ul>
        <div class="warn">Third-party cookie blocking in modern browsers breaks SSO tricks that load the IdP in a hidden iframe. Top-level redirects (shown here) still work, because the IdP cookie is first-party during the redirect.</div>
      `,
      examples: [
        {
          title: 'SSO: watch the cookie jar',
          code: W('<div id="flow"></div>', ssoFlow, [L]),
          explain: `
            <details>
              <summary>The problem: how does App B know Alice, without sharing a cookie with App A?</summary>
              <p>App B never sees App A's cookie or the IdP cookie. It just does a normal OIDC redirect. Whether Alice sees a password form is decided entirely by the IdP, based on <em>its</em> cookie.</p>
            </details>
            <details>
              <summary>Step by step (tab 1)</summary>
              <table>
                <tr><th>Step</th><th>Cookie sent</th><th>Result</th><th>Cookie jar afterwards</th></tr>
                <tr><td>1</td><td>none</td><td>App A: no session → 302 to IdP</td><td>empty</td></tr>
                <tr><td>3–5</td><td>none for the IdP</td><td>IdP shows login form, Alice types password</td><td>empty</td></tr>
                <tr><td>6</td><td>-</td><td>IdP <code>Set-Cookie: idp_sid</code> ⭐</td><td>IdP: idp_sid</td></tr>
                <tr><td>7–9</td><td>none</td><td>App A exchanges code, sets <code>a_sid</code></td><td>IdP + App A</td></tr>
                <tr><td>10–11</td><td>none for app-b.test</td><td>App B: no session → 302 to IdP</td><td>unchanged</td></tr>
                <tr><td>12</td><td><code>idp_sid</code> ⭐</td><td>IdP recognises Alice</td><td>unchanged</td></tr>
                <tr><td>13</td><td>-</td><td>302 back with code, <strong>no form</strong></td><td>unchanged</td></tr>
                <tr><td>14–15</td><td>none</td><td>App B sets <code>b_sid</code></td><td>IdP + App A + App B</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>SSO = the IdP session cookie + every app delegating login to the same IdP.</li>
                <li>The ID token for App B has <code>aud=app-b</code> and an <code>auth_time</code> from the <em>first</em> login (09:00). Tab 2 shows how an app forces a newer one.</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>In tab 1, compare step 3 and step 12 in the inspector: same URL path, but only step 12 carries <code>Cookie: idp_sid</code>.</li>
                <li>In tab 2, step 7 says App B checks <code>auth_time</code> itself. Why? Because the user controls the URL and could remove <code>prompt=login</code>.</li>
              </ul>
            </details>
          `,
        },
        {
          title: 'SSO playground: three apps, one IdP',
          code: W('<div id="pg"></div>', ssoPlayground),
          explain: `
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Visit App A (1 prompt), then App B and App C: still 1 prompt.</li>
                <li>Click <strong>Log out of App A</strong>, then Visit App A: you are back in silently. Surprise!</li>
                <li>Click <strong>IdP session expires</strong>, then Visit App A: no prompt, because App A still has its own session. Now click <strong>Clear all cookies</strong> and Visit App B: a prompt, because every jar is empty.</li>
                <li>Tick the <code>prompt=login</code> box and visit App C: a prompt even though the IdP cookie exists.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'Where is the cookie that makes SSO work stored?', options: ['On every app\'s domain', 'On the IdP\'s domain', 'In localStorage of App A', 'In the ID token'], answer: 1, why: 'The IdP session cookie lives on the IdP domain and is sent only to the IdP.' },
        { q: 'Alice is logged in at the IdP and opens App B for the first time. What does she see?', options: ['A password form', 'A few quick redirects, then App B logged in', 'An error', 'App A'], answer: 1, why: 'The IdP sees its cookie and immediately returns a code to App B.' },
        { q: 'Which parameter forces re-authentication even if an IdP session exists?', options: ['prompt=none', 'prompt=login', 'response_mode=query', 'scope=offline_access'], answer: 1, why: 'prompt=login (or max_age with a small value) asks the OP to re-authenticate.' },
        { q: 'App B sent max_age=300. What must App B verify in the ID token?', options: ['iat only', 'auth_time is at most 300 seconds ago', 'exp is exactly 300', 'nonce = 300'], answer: 1, why: 'auth_time tells when the user really authenticated; the RP enforces max_age.' },
      ],
      exercise: {
        task: '<p>For each situation in the box below, predict what Alice experiences, then click <strong>Check</strong>.</p>',
        hint: 'Order of decisions: (1) app has its own session cookie? → no IdP trip. (2) Otherwise the IdP decides: valid IdP cookie and no prompt=login → silent; else password prompt.',
        starter: W('<div id="ex"></div>', ssoExercise),
        solution: W('<div id="ex"></div>', ssoExercise, [], { solved: true }),
      },
    },
  );

  // ======================================================================
  // Lesson 5: SAML 2.0 SP-initiated SSO
  // ======================================================================
  // Validator used by SAML widgets: real DOM parsing + real SHA-256 digest of the referenced element.
  function samlCheck(xml, mode) {
    const SAMLNS = 'urn:oasis:names:tc:SAML:2.0:assertion', DS = 'http://www.w3.org/2000/09/xmldsig#';
    const r = { steps: [], ok: false, user: null };
    const step = (ok, t) => { r.steps.push([ok, t]); return ok; };
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) { step(false, 'XML does not parse'); return r; }
    const sig = doc.getElementsByTagNameNS(DS, 'Signature')[0];
    if (!step(!!sig, sig ? 'found a <ds:Signature>' : 'no <ds:Signature> anywhere → unsigned')) return r;
    const ref = sig.getElementsByTagNameNS(DS, 'Reference')[0];
    const id = ((ref && ref.getAttribute('URI')) || '').replace(/^#/, '');
    let target = null;
    const all = doc.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) if (all[i].getAttribute('ID') === id) { target = all[i]; break; }
    if (!step(!!target, 'Reference URI="#' + id + '" → ' + (target ? '<' + target.tagName + ' ID="' + id + '">' : 'no element with that ID'))) return r;
    const clone = target.cloneNode(true);
    const inner = clone.getElementsByTagNameNS(DS, 'Signature')[0];
    if (inner) inner.parentNode.removeChild(inner);
    const digest = Auth.b64(Auth.sha256(new XMLSerializer().serializeToString(clone)));
    const dv = (sig.getElementsByTagNameNS(DS, 'DigestValue')[0] || {}).textContent;
    if (!step(digest === dv, 'SHA-256 digest of that element ' + (digest === dv ? '== DigestValue' : '≠ DigestValue (content was modified)'))) return r;
    const sv = (sig.getElementsByTagNameNS(DS, 'SignatureValue')[0] || {}).textContent;
    const expect = Auth.hmacSha256b64('idp-signing-key', 'ref=' + id + ';digest=' + dv);
    if (!step(sv === expect, 'SignatureValue over SignedInfo ' + (sv === expect ? 'verifies with IdP cert' : 'does NOT verify'))) return r;
    const assertions = doc.getElementsByTagNameNS(SAMLNS, 'Assertion');
    let chosen;
    if (mode === 'safe') {
      if (!step(assertions.length === 1 && target.localName === 'Assertion', 'exactly one Assertion, and it is the signed one (' + assertions.length + ' found)')) return r;
      chosen = target;
      step(true, 'read identity FROM THE VERIFIED ELEMENT');
    } else {
      chosen = assertions[0];
      step(true, 'read identity from getElementsByTagName("Assertion")[0] (' + assertions.length + ' Assertion(s) in doc)');
    }
    const nid = chosen && chosen.getElementsByTagNameNS(SAMLNS, 'NameID')[0];
    r.user = nid ? nid.textContent : null;
    r.readSigned = chosen === target;
    r.ok = !!r.user;
    return r;
  }

  function samlFlow() {
    const S = samlLib();
    const reqId = '_req42';
    const req = S.authnRequest(reqId);
    const deflated = deflateRaw(req);
    const samlRequest = Auth.b64(deflated);
    const relay = 'r_' + Auth.randHex(4);
    const resp = S.response({});
    const samlResponse = Auth.b64(resp);
    const short = (s, n) => s.slice(0, n) + '…(' + (s.length - n) + ' more chars)';
    Seq.mount('#flow', {
      title: 'SAML 2.0 Web Browser SSO: SP-initiated, Redirect → POST bindings',
      intro: 'The <b>SP</b> (Service Provider) is the app, the <b>IdP</b> issues signed XML <b>assertions</b>. The browser carries every message: there is no back-channel here.',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookies' },
        { id: 's', label: 'SP · wiki.acme.test', icon: '📚', store: { idp_cert: 'from IdP metadata' }, storeLabel: 'SP state' },
        { id: 'i', label: 'IdP · acme-idp.test', icon: '🏛', store: { sp_acs: S.ACS }, storeLabel: 'IdP state' },
      ],
      steps: [
        { from: 'b', to: 's', label: 'GET /pages/roadmap', msg: L('GET /pages/roadmap HTTP/1.1', 'Host: wiki.acme.test'), note: 'Alice opens a wiki page. No session.' },
        { from: 's', to: 's', label: 'build AuthnRequest', msg: req.replace(/></g, '>\n<'), set: { s: { pending: reqId + ' → RelayState ' + relay, [relay]: '/pages/roadmap' } }, note: 'The SP writes an XML <code>&lt;samlp:AuthnRequest&gt;</code> and remembers its <code>ID</code> so it can match the answer later (<code>InResponseTo</code>).' },
        { from: 's', to: 'b', kind: 'redirect', label: '302 ?SAMLRequest=…&RelayState=…', msg: L('HTTP/1.1 302 Found', 'Location: ' + S.SSO + '?SAMLRequest=' + encodeURIComponent(samlRequest) + '&RelayState=' + relay, '', '# HTTP-Redirect binding: XML → DEFLATE (' + req.length + ' → ' + deflated.length + ' bytes) → base64 → URL-encode', '# (a signed request would add &SigAlg=…&Signature=… query params)'), hl: ['SAMLRequest', 'RelayState'], note: '<b>HTTP-Redirect binding</b>: the request is compressed so it fits in a URL. <code>RelayState</code> is an opaque value that will come back unchanged (here: where to go after login).' },
        { from: 'b', to: 'i', label: 'GET /sso/saml?SAMLRequest…', msg: L('GET /sso/saml?SAMLRequest=' + short(encodeURIComponent(samlRequest), 60) + '&RelayState=' + relay + ' HTTP/1.1', 'Host: idp.acme-idp.test') },
        { from: 'i', to: 'i', label: 'base64 → inflate → check SP', msg: L('# decoded AuthnRequest', 'Issuer:                      ' + S.SP, 'AssertionConsumerServiceURL: ' + S.ACS, 'ID:                          ' + reqId, '', '# Issuer is a known SP (from SP metadata) ✓', '# ACS URL is registered for that SP ✓ (never post assertions to an unregistered URL)'), note: 'The IdP trusts only SPs it has <b>metadata</b> for, and sends the answer only to a registered ACS URL.' },
        { from: 'i', to: 'b', kind: 'res', label: '200 login page', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<form method="post" action="/login">…</form>') },
        { from: 'b', to: 'i', label: 'POST /login', msg: L('POST /login HTTP/1.1', 'Host: idp.acme-idp.test', 'Content-Type: application/x-www-form-urlencoded', '', 'username=alice&password=%E2%80%A2%E2%80%A2%E2%80%A2'), set: { b: { 'idp.acme-idp.test → idp_sid': 'I_31' }, i: { I_31: 'alice' } } },
        { from: 'i', to: 'i', label: 'build + sign <Assertion>', msg: resp, hl: ['InResponseTo="_req42"', 'Recipient=', '<saml:Audience>', 'NotOnOrAfter', 'saml:NameID', 'ds:DigestValue'], note: 'This is the decoded <code>&lt;samlp:Response&gt;</code>. The <code>&lt;ds:Signature&gt;</code> inside the Assertion covers the whole Assertion (enveloped signature). The next example lets you click through every element.' },
        { from: 'i', to: 'b', kind: 'res', label: '200 auto-submit form (SAMLResponse)', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', 'Cache-Control: no-store', '', '<html><body onload="document.forms[0].submit()">', '  <form method="POST" action="' + S.ACS + '">', '    <input type="hidden" name="SAMLResponse" value="' + short(samlResponse, 80) + '"/>', '    <input type="hidden" name="RelayState" value="' + relay + '"/>', '    <noscript><button type="submit">Continue</button></noscript>', '  </form>', '</body></html>'), hl: ['SAMLResponse', 'RelayState', 'action="' + S.ACS + '"'], note: '<b>HTTP-POST binding</b>: the Response is too big for a URL, so the IdP returns an HTML form that the browser submits by itself. Value = plain base64 (no DEFLATE in the POST binding).' },
        { from: 'b', to: 's', label: 'POST /saml/acs', msg: L('POST /saml/acs HTTP/1.1', 'Host: wiki.acme.test', 'Content-Type: application/x-www-form-urlencoded', 'Origin: https://idp.acme-idp.test', '', 'SAMLResponse=' + short(encodeURIComponent(samlResponse), 80) + '&RelayState=' + relay), note: 'The <b>Assertion Consumer Service (ACS)</b> is the SP endpoint that receives assertions.' },
        { from: 's', to: 's', label: 'validate Response + Assertion', msg: L('# 1 XML Signature: digest of Assertion + SignatureValue with IdP cert from metadata  ✓', '# 2 Issuer == ' + S.IDP + '                                    ✓', '# 3 Status == urn:oasis:names:tc:SAML:2.0:status:Success                          ✓', '# 4 InResponseTo == pending request ' + reqId + '                                     ✓', '# 5 SubjectConfirmationData Recipient == my ACS URL, NotOnOrAfter in future     ✓', '# 6 Conditions NotBefore ≤ now < NotOnOrAfter                                    ✓', '# 7 AudienceRestriction contains my entityID ' + S.SP + '  ✓', '# 8 Assertion ID not seen before (replay cache)                                  ✓', '', '→ user = alice@acme.test, groups = [engineering]'), set: { s: { pending: null } } },
        { from: 's', to: 'b', kind: 'res', label: '302 /pages/roadmap + session', msg: L('HTTP/1.1 302 Found', 'Location: /pages/roadmap', 'Set-Cookie: wiki_sid=W_88; Secure; HttpOnly; SameSite=Lax'), set: { b: { 'wiki.acme.test → wiki_sid': 'W_88' }, s: { W_88: 'alice@acme.test', [relay]: null } }, note: 'RelayState told the SP where Alice was going. Like OIDC, the SP now has its own session and the IdP has another one (→ SSO for the next SP).' },
      ],
    });
  }

  function assertionViewer() {
    const S = samlLib();
    const xml = S.response({});
    const req = S.authnRequest('_req42');
    const def = deflateRaw(req);
    const INFO = {
      Response: '<b>samlp:Response</b>: the protocol envelope. <code>Destination</code> = ACS URL, <code>InResponseTo</code> = ID of the AuthnRequest.',
      Issuer: '<b>saml:Issuer</b>: the IdP\'s <b>entityID</b>. Must match the IdP you configured (from its metadata).',
      Status: '<b>samlp:Status</b>: <code>…:status:Success</code>, or e.g. <code>…:status:Responder</code> / <code>AuthnFailed</code> on errors.',
      StatusCode: 'Status value URN.',
      Assertion: '<b>saml:Assertion</b>: the signed statement about the user. Has its own <code>ID</code>: the signature\'s Reference points at it. Record used IDs to block replays.',
      Signature: '<b>ds:Signature</b> (XML Signature): <code>SignedInfo</code> lists what is signed (<code>Reference URI="#ID"</code>) with its SHA-256 <code>DigestValue</code>; <code>SignatureValue</code> is the RSA signature over SignedInfo; <code>KeyInfo</code> carries the cert, but <b>verify with the cert from metadata</b>, never the one embedded in the message.',
      SignedInfo: 'The part that is actually RSA-signed. It contains the digest of the referenced element.',
      Reference: '<code>URI="#_a7c3e1d0"</code>: which element is covered. The validator must later use <b>that same element</b> (see XML Signature Wrapping in the next lesson).',
      DigestValue: 'base64(SHA-256(canonicalized Assertion without the Signature)). Genuinely computed in this demo.',
      SignatureValue: 'RSA-SHA256 signature of SignedInfo (simulated here).',
      X509Certificate: 'The IdP\'s signing cert. Pin the one from metadata.',
      Subject: '<b>saml:Subject</b>: who the assertion is about.',
      NameID: '<b>NameID</b>: the user identifier. Format here is emailAddress; others are persistent (opaque, stable: best) or transient.',
      SubjectConfirmation: 'Method <code>…:cm:bearer</code>: whoever presents it may use it, so the next element restricts where/when.',
      SubjectConfirmationData: '<code>Recipient</code> must be your ACS URL, <code>NotOnOrAfter</code> in the future, <code>InResponseTo</code> your request ID.',
      Conditions: '<b>Conditions</b>: validity window <code>NotBefore</code> ≤ now &lt; <code>NotOnOrAfter</code> (allow a little clock skew).',
      AudienceRestriction: 'Who may consume this assertion.',
      Audience: '<b>Audience</b>: must equal <b>your</b> SP entityID. Stops an assertion for another SP being replayed to you.',
      AuthnStatement: '<b>AuthnStatement</b>: when (<code>AuthnInstant</code>) and how the user logged in; <code>SessionIndex</code> identifies the IdP session (used for Single Logout).',
      AuthnContext: 'How the user authenticated.', AuthnContextClassRef: 'e.g. <code>PasswordProtectedTransport</code> (password over TLS), or MFA class URNs.',
      AttributeStatement: '<b>AttributeStatement</b>: extra user data (email, name, groups/roles). Like OIDC claims.',
      Attribute: 'One attribute with a <code>Name</code> and one or more values.', AttributeValue: 'The value.',
      Transforms: 'Processing applied before digesting: remove the enveloped Signature, then exclusive canonicalization.',
      Transform: 'One transform step.', CanonicalizationMethod: 'Exclusive XML Canonicalization: normalizes whitespace in tags, attribute order, namespaces.',
      SignatureMethod: 'rsa-sha256.', DigestMethod: 'sha256.', KeyInfo: 'Key hint.', X509Data: 'Certificate container.',
    };
    const el = document.getElementById('v');
    el.innerHTML = '<div class="row"><button id="m1" class="on">Decoded XML (click elements)</button><button id="m2">As sent: SAMLResponse (base64)</button><button id="m3">AuthnRequest encoding pipeline</button></div>' +
      '<div class="grid2" style="grid-template-columns:3fr 2fr"><pre class="box" id="x" style="max-height:560px;white-space:pre;overflow:auto"></pre><div class="card" id="info"><span class="muted">👈 Click any element name (blue).</span></div></div>';
    const x = document.getElementById('x'), info = document.getElementById('info');
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    function render(n, d) {
      const pad = '  '.repeat(d);
      if (n.nodeType === 3) { const t = n.textContent.trim(); return t ? pad + '<span style="color:#fde68a">' + Seq.esc(t) + '</span>\n' : ''; }
      if (n.nodeType !== 1) return '';
      const attrs = Array.from(n.attributes).filter((a) => !/^xmlns/.test(a.name))
        .map((a) => ' <span style="color:#c4b5fd">' + a.name + '</span>="' + Seq.esc(a.value) + '"').join('');
      const tag = '<span data-el="' + n.localName + '" style="color:#7fd6ea;cursor:pointer;text-decoration:underline dotted">' + n.tagName + '</span>';
      const kids = Array.from(n.childNodes).map((c) => render(c, d + 1)).join('');
      if (!kids) return pad + '&lt;' + tag + attrs + '/&gt;\n';
      if (n.childNodes.length === 1 && n.firstChild.nodeType === 3) return pad + '&lt;' + tag + attrs + '&gt;<span style="color:#fde68a">' + Seq.esc(n.textContent) + '</span>&lt;/' + n.tagName + '&gt;\n';
      return pad + '&lt;' + tag + attrs + '&gt;\n' + kids + pad + '&lt;/' + n.tagName + '&gt;\n';
    }
    function showXml() {
      x.innerHTML = render(doc.documentElement, 0);
      x.querySelectorAll('[data-el]').forEach((s) => (s.onclick = () => {
        x.querySelectorAll('[data-el]').forEach((o) => (o.style.background = ''));
        s.style.background = '#334155';
        info.innerHTML = '<h4 class="mono">&lt;' + s.textContent + '&gt;</h4>' + (INFO[s.dataset.el] || '');
      }));
      info.innerHTML = '<span class="muted">👈 Click any element name (blue). Start with Issuer, NameID, Conditions, Audience, ds:Signature.</span>';
    }
    function tab(id) { ['m1', 'm2', 'm3'].forEach((m) => document.getElementById(m).classList.toggle('on', m === id)); }
    document.getElementById('m1').onclick = () => { tab('m1'); x.style.whiteSpace = 'pre'; showXml(); };
    document.getElementById('m2').onclick = () => {
      tab('m2'); x.style.whiteSpace = 'pre-wrap';
      x.textContent = 'SAMLResponse=' + Auth.b64(xml);
      info.innerHTML = '<h4>HTTP-POST binding</h4>This is the hidden form field the browser posts to the ACS: <b>base64(XML)</b>, ' + Auth.b64(xml).length +
        ' characters. Base64 is <b>encoding, not encryption</b>: anyone (including a browser extension or proxy) can decode it. Sensitive attributes would need an <code>&lt;EncryptedAssertion&gt;</code>.';
    };
    document.getElementById('m3').onclick = () => {
      tab('m3'); x.style.whiteSpace = 'pre-wrap';
      const b = Auth.b64(def);
      x.textContent = '① AuthnRequest XML (' + req.length + ' bytes)\n' + req.replace(/></g, '>\n<') +
        '\n\n② raw DEFLATE (RFC 1951) → ' + def.length + ' bytes, first 40 as hex:\n' + Auth.hex(def.slice(0, 40)) +
        '\n\n③ base64 → ' + b.length + ' chars\n' + b + '\n\n④ URL-encode → query parameter\nSAMLRequest=' + encodeURIComponent(b);
      info.innerHTML = '<h4>HTTP-Redirect binding</h4>Requests travel in a URL, and URLs have length limits, so the XML is <b>DEFLATE-compressed</b> before base64. The IdP reverses it: URL-decode → base64-decode → inflate. These bytes are real DEFLATE output (paste the base64 into any SAML decoder).';
    };
    showXml();
  }

  function samlExercise() {
    const S = samlLib();
    const base = { audience: S.SP, recipient: S.ACS, inResponseTo: '_req42', exp: 300 };
    const CASES = [
      ['1', Object.assign({}, base, { audience: 'https://jira.acme.test/saml/metadata' }), 'aud'],
      ['2', base, 'ok'],
      ['3', Object.assign({}, base, { exp: -3600, scExp: -3600 }), 'exp'],
      ['4', Object.assign({}, base, { recipient: 'https://evil.test/acs' }), 'recip'],
      ['5', Object.assign({}, base, { unsigned: true }), 'unsigned'],
      ['6', Object.assign({}, base, { inResponseTo: '_req99' }), 'irt'],
      ['7', Object.assign({}, base, { issuer: 'https://idp.evil.test' }), 'issuer'],
    ];
    const OPT = [['', '— choose —'], ['ok', 'Accept'], ['unsigned', 'Reject: no signature'], ['issuer', 'Reject: wrong Issuer'], ['aud', 'Reject: wrong Audience'],
      ['recip', 'Reject: wrong Recipient'], ['exp', 'Reject: expired'], ['irt', 'Reject: InResponseTo mismatch']];
    const pick = (a) => a.split('\n').filter((l) => /Issuer|NameID|SubjectConfirmationData|Conditions |Audience>|ds:Signature |DigestValue/.test(l)).map((l) => l.trim()).join('\n');
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card mono">SP config: entityID=' + S.SP + '<br>ACS=' + S.ACS + '<br>trusted IdP=' + S.IDP +
      '<br>pending AuthnRequest ID=_req42 · now=' + isoAt(0) + '</div>' +
      CASES.map((c) => '<div class="card"><b>Assertion ' + c[0] + '</b> <select data-c="' + c[0] + '">' +
        OPT.map((o) => '<option value="' + o[0] + '"' + (VARS.solved && o[0] === c[2] ? ' selected' : '') + '>' + o[1] + '</option>').join('') +
        '</select><pre class="box" style="max-height:130px">' + Seq.esc(pick(S.signedAssertion(c[1]))) + '</pre></div>').join('') +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = CASES.filter((c) => el.querySelector('[data-c="' + c[0] + '"]').value !== c[2]).map((c) => c[0]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? '❌ Look again at assertion(s) ' + bad.join(', ') + '. Compare Issuer, Audience, Recipient, InResponseTo and NotOnOrAfter with the SP config, and check that a ds:Signature exists.'
        : '✅ All seven right. A real SP checks all of these on every assertion.';
    };
  }

  // ======================================================================
  // Lesson 6: SAML vs OIDC, IdP-initiated, XSW
  // ======================================================================
  function compareWidget() {
    const ROWS = [
      ['Age & home', 'OASIS standard, 2005. Enterprise web SSO.', 'OpenID Foundation, 2014, built on OAuth 2. Web, mobile, APIs.'],
      ['Token format', 'XML <code>&lt;Assertion&gt;</code>', 'JSON Web Token (ID token)'],
      ['Signature', 'XML Signature (c14n, transforms; easy to get wrong)', 'JWS: sign the exact bytes header.payload'],
      ['How it travels', 'Through the browser only: Redirect / POST bindings (Artifact binding is rare)', 'Code via browser, tokens over a back-channel POST /token'],
      ['Config', 'Exchange XML metadata files (entityID, ACS URL, certs)', 'Discovery URL + client_id/secret; JWKS for keys'],
      ['API access', 'None built in (it is only about login)', 'Access tokens for APIs come for free (OAuth 2)'],
      ['Mobile / SPA', 'Awkward (needs a browser POST to an ACS)', 'Native: code + PKCE'],
      ['Logout', 'SLO via LogoutRequest/LogoutResponse', 'RP-initiated, front-channel and back-channel logout'],
      ['Typical choice in 2026', 'Legacy and many enterprise SaaS apps (every IdP still supports it)', 'Default for new apps; social login'],
    ];
    const SNIP = {
      saml: L('<saml:Assertion ID="_a7" IssueInstant="2026-10-31T09:15:03Z">', '  <saml:Issuer>https://idp.acme-idp.test</saml:Issuer>', '  <ds:Signature>…</ds:Signature>', '  <saml:Subject><saml:NameID>alice@acme.test</saml:NameID></saml:Subject>', '  <saml:Conditions NotOnOrAfter="2026-10-31T09:20:03Z">', '    <saml:AudienceRestriction><saml:Audience>https://wiki.acme.test/saml/metadata</saml:Audience>', '  …'),
      oidc: L('{', '  "iss": "https://id.acme.test",', '  "sub": "248289761001",', '  "aud": "photoapp",', '  "exp": 1793444200,', '  "iat": 1793443900,', '  "nonce": "n-0S6_WzA2Mj",', '  "email": "alice@acme.test"', '}'),
    };
    const MAP = [['Issuer', 'iss'], ['NameID', 'sub'], ['Audience', 'aud'], ['NotOnOrAfter', 'exp'], ['IssueInstant', 'iat'], ['InResponseTo', 'nonce (sort of)'], ['AttributeStatement', 'other claims']];
    const el = document.getElementById('cmp');
    el.innerHTML = '<table class="t"><tr><th style="width:18%"></th><th>SAML 2.0</th><th>OpenID Connect</th></tr>' +
      ROWS.map((r) => '<tr><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>').join('') + '</table>' +
      '<h4 style="margin-top:10px">Same idea, different syntax: click a pair</h4><div class="row" id="pairs"></div>' +
      '<div class="grid2"><pre class="box" id="s1"></pre><pre class="box" id="s2"></pre></div>';
    const hi = (txt, w) => Seq.esc(txt).split(Seq.esc(w)).join('<mark>' + Seq.esc(w) + '</mark>');
    function show(i) {
      document.querySelectorAll('#pairs button').forEach((b, j) => b.classList.toggle('on', i === j));
      document.getElementById('s1').innerHTML = i < 0 ? Seq.esc(SNIP.saml) : hi(SNIP.saml, MAP[i][0]);
      document.getElementById('s2').innerHTML = i < 0 ? Seq.esc(SNIP.oidc) : hi(SNIP.oidc, '"' + MAP[i][1].split(' ')[0] + '"');
    }
    MAP.forEach((m, i) => {
      const b = document.createElement('button');
      b.textContent = m[0] + ' ↔ ' + m[1];
      b.onclick = () => show(i);
      document.getElementById('pairs').appendChild(b);
    });
    show(-1);
  }

  function idpInitFlow() {
    const S = samlLib();
    const attackerResp = Auth.b64(S.response({ inResponseTo: null, nameId: 'mallory@acme.test' }));
    const goodResp = Auth.b64(S.response({ inResponseTo: null }));
    const short = (s) => s.slice(0, 70) + '…';
    Seq.mount('#flow', {
      title: 'IdP-initiated SSO: an assertion nobody asked for',
      scenarios: [
        { name: '1 · Normal: click a tile in the IdP portal', actors: [
          { id: 'b', label: 'Alice\'s browser', icon: '🌐', store: { 'idp.acme-idp.test → idp_sid': 'I_31' }, storeLabel: 'Cookies' },
          { id: 'i', label: 'IdP portal', icon: '🏛', store: { I_31: 'alice' } },
          { id: 's', label: 'SP · wiki.acme.test', icon: '📚', store: {}, storeLabel: 'SP state' },
        ], steps: [
          { from: 'b', to: 'i', label: 'GET /app/wiki/sso (tile click)', msg: L('GET /app/wiki/sso HTTP/1.1', 'Host: idp.acme-idp.test', 'Cookie: idp_sid=I_31'), note: 'Alice is on her company\'s app dashboard (Okta, Entra "My Apps"…) and clicks the Wiki tile.' },
          { from: 'i', to: 'b', kind: 'res', label: '200 auto-submit form', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<body onload="document.forms[0].submit()">', '<form method="POST" action="' + S.ACS + '">', '  <input type="hidden" name="SAMLResponse" value="' + short(goodResp) + '"/>', '</form>'), note: 'No AuthnRequest came first. The Response has <b>no InResponseTo</b>.' },
          { from: 'b', to: 's', label: 'POST /saml/acs', msg: L('POST /saml/acs HTTP/1.1', 'Host: wiki.acme.test', 'Content-Type: application/x-www-form-urlencoded', '', 'SAMLResponse=' + short(encodeURIComponent(goodResp))) },
          { from: 's', to: 's', label: 'validate (no InResponseTo to check!)', msg: L('# signature ✓  issuer ✓  audience ✓  time ✓  recipient ✓', '# InResponseTo: absent. SP has no record of starting this login.', '# → the SP cannot tell "Alice clicked a tile" from "someone posted this into Alice\'s browser"'), kind: 'self' },
          { from: 's', to: 'b', kind: 'res', label: '302 / + session (alice)', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: wiki_sid=W_90; Secure; HttpOnly'), set: { s: { W_90: 'alice' }, b: { 'wiki.acme.test → wiki_sid': 'W_90' } } },
        ] },
        { name: '2 · ❌ Login CSRF with an unsolicited response', actors: [
          { id: 'b', label: 'Alice\'s browser', icon: '🌐', store: {}, storeLabel: 'Cookies' },
          { id: 'm', label: 'Mallory\'s web page', icon: '😈', store: {} },
          { id: 'i', label: 'IdP', icon: '🏛', store: {} },
          { id: 's', label: 'SP · wiki.acme.test', icon: '📚', store: {}, storeLabel: 'SP state' },
        ], steps: [
          { from: 'm', to: 'i', label: 'Mallory logs in as herself', msg: L('GET /app/wiki/sso HTTP/1.1', 'Host: idp.acme-idp.test', 'Cookie: idp_sid=I_66   # Mallory\'s own session'), note: 'Mallory is a legitimate (low-privilege) user. She starts IdP-initiated SSO but stops before her browser submits the form.' },
          { from: 'i', to: 'm', kind: 'res', label: 'SAMLResponse for mallory', msg: L('HTTP/1.1 200 OK', '', '<form … name="SAMLResponse" value="' + short(attackerResp) + '">', '# a perfectly valid, signed assertion for mallory@acme.test, valid ~5 minutes'), set: { m: { captured: 'SAMLResponse (mallory)' } } },
          { from: 'b', to: 'm', label: 'Alice visits Mallory\'s page', msg: L('GET /funny-cats HTTP/1.1', 'Host: mallory.test') },
          { from: 'm', to: 'b', kind: 'err', badge: 'Attack', label: 'hidden auto-submit form → SP ACS', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<body onload="document.forms[0].submit()">', '<form method="POST" action="' + S.ACS + '">', '  <input type="hidden" name="SAMLResponse" value="' + short(attackerResp) + '"/>', '</form>'), note: 'Exactly what an IdP would send, but served from Mallory\'s site.' },
          { from: 'b', to: 's', label: 'POST /saml/acs (Mallory\'s assertion)', msg: L('POST /saml/acs HTTP/1.1', 'Host: wiki.acme.test', 'Origin: https://mallory.test', '', 'SAMLResponse=' + short(encodeURIComponent(attackerResp))) },
          { from: 's', to: 'b', kind: 'err', badge: 'Logged in as Mallory', label: '302 / session = mallory', msg: L('HTTP/1.1 302 Found', 'Set-Cookie: wiki_sid=W_91; Secure; HttpOnly'), set: { s: { W_91: 'mallory (in Alice\'s browser)' }, b: { 'wiki.acme.test → wiki_sid': 'W_91 (Mallory!)' } }, note: 'Alice is now silently logged into <b>Mallory\'s</b> account. Anything she writes (notes, uploaded files, a saved card) goes to Mallory. If Mallory had <i>stolen</i> Alice\'s response instead, the same missing InResponseTo check would allow a replay.' },
        ] },
        { name: '3 · ✅ Safer: bounce to SP-initiated', actors: [
          { id: 'b', label: 'Alice\'s browser', icon: '🌐', store: { 'idp.acme-idp.test → idp_sid': 'I_31' }, storeLabel: 'Cookies' },
          { id: 'i', label: 'IdP portal', icon: '🏛', store: { I_31: 'alice' } },
          { id: 's', label: 'SP · wiki.acme.test', icon: '📚', store: {}, storeLabel: 'SP state' },
        ], steps: [
          { from: 'b', to: 'i', label: 'click tile', msg: L('GET /app/wiki HTTP/1.1', 'Host: idp.acme-idp.test') },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 → SP login URL (bookmark app)', msg: L('HTTP/1.1 302 Found', 'Location: https://wiki.acme.test/saml/login'), note: 'Configure the tile as a plain link to the SP\'s login URL (a "bookmark" app) instead of an unsolicited assertion.' },
          { from: 'b', to: 's', label: 'GET /saml/login', msg: L('GET /saml/login HTTP/1.1', 'Host: wiki.acme.test') },
          { from: 's', to: 'b', kind: 'redirect', label: '302 AuthnRequest (ID=_req77)', msg: L('HTTP/1.1 302 Found', 'Location: ' + S.SSO + '?SAMLRequest=…&RelayState=…'), set: { s: { pending: '_req77' } }, note: 'Now the SP starts the flow and will require <code>InResponseTo="_req77"</code>, bound to this browser\'s session. SSO still means no password prompt.' },
          { from: 'b', to: 'i', label: 'GET /sso/saml (cookie: idp_sid)', msg: L('GET /sso/saml?SAMLRequest=… HTTP/1.1', 'Host: idp.acme-idp.test', 'Cookie: idp_sid=I_31') },
          { from: 'i', to: 'b', kind: 'res', label: 'auto-POST Response InResponseTo=_req77', msg: L('HTTP/1.1 200 OK', '', '<form method="POST" action="' + S.ACS + '"> SAMLResponse (InResponseTo="_req77") … </form>') },
          { from: 'b', to: 's', label: 'POST /saml/acs → InResponseTo ✓', msg: L('POST /saml/acs HTTP/1.1', 'Host: wiki.acme.test', '', 'SAMLResponse=…'), set: { s: { pending: null, W_92: 'alice' } } },
        ] },
      ],
    });
  }

  // Builds an XML Signature Wrapping attack from a response string.
  function xswAttack(xml) {
    const a = xml.indexOf('<saml:Assertion'), e = xml.indexOf('</saml:Assertion>') + '</saml:Assertion>'.length;
    const signed = xml.slice(a, e);
    const s1 = signed.indexOf('<ds:Signature'), s2 = signed.indexOf('</ds:Signature>') + '</ds:Signature>'.length;
    let evil = signed.slice(0, s1).replace(/\n\s*$/, '\n') + signed.slice(s2).replace(/^\n/, '');
    evil = evil.replace('ID="_a7c3e1d0"', 'ID="_evil666"').split('alice@acme.test').join('admin@acme.test').replace('>engineering<', '>admins<');
    return xml.slice(0, a) + evil + '\n  ' + signed + xml.slice(e);
  }

  function xswSim() {
    const S = samlLib();
    const orig = S.response({});
    const PRE = {
      orig: ['Original response', orig],
      xsw: ['XSW: inject unsigned evil Assertion before the signed one', xswAttack(orig)],
      tamper: ['Naive tamper: change NameID inside the signed Assertion', orig.split('<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">alice@acme.test').join('<saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">admin@acme.test')],
    };
    const el = document.getElementById('xsw');
    el.innerHTML = '<div class="row">' + Object.keys(PRE).map((k) => '<button data-p="' + k + '">' + PRE[k][0] + '</button>').join('') + '</div>' +
      '<textarea id="xml" rows="15" spellcheck="false" style="white-space:pre"></textarea>' +
      '<div class="muted">Editable: change anything and both SPs re-validate. Signatures and digests are really computed (SHA-256; RSA simulated with HMAC).</div>' +
      '<div class="grid2"><div class="card"><h4>🙈 Vulnerable SP</h4><div id="n"></div></div><div class="card"><h4>🛡 Safe SP</h4><div id="s"></div></div></div>';
    const ta = document.getElementById('xml');
    function out(r) {
      return r.steps.map((s) => (s[0] ? '<span class="ok">✓</span> ' : '<span class="bad">✗</span> ') + Seq.esc(s[1])).join('<br>') +
        '<div class="verdict ' + (r.ok && r.user === 'alice@acme.test' ? 'ok' : r.ok ? 'bad' : '') + '" style="' + (r.ok ? '' : 'background:#f1f5f9') + '">' +
        (r.ok ? 'Logged in as <b>' + Seq.esc(r.user) + '</b>' + (r.readSigned ? ' (from the signed element)' : ' ⚠ from an UNSIGNED element!') : 'Rejected') + '</div>';
    }
    function run() {
      document.getElementById('n').innerHTML = out(samlCheck(ta.value, 'naive'));
      document.getElementById('s').innerHTML = out(samlCheck(ta.value, 'safe'));
    }
    el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => {
      el.querySelectorAll('[data-p]').forEach((x) => x.classList.toggle('on', x === b));
      ta.value = PRE[b.dataset.p][1];
      run();
    }));
    ta.oninput = run;
    el.querySelector('[data-p=orig]').click();
  }

  function xswExercise() {
    const S = samlLib();
    const orig = S.response({});
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="muted">Goal: make the <b>vulnerable SP</b> log you in as <code>admin@acme.test</code> while its signature checks still pass. Edit the XML, then click Check.</div>' +
      '<textarea id="xml" rows="18" spellcheck="false" style="white-space:pre"></textarea>' +
      '<div class="row"><button id="chk">Check</button><button id="rst">Reset XML</button></div><div id="res"></div>';
    const ta = document.getElementById('xml');
    ta.value = VARS.solved ? xswAttack(orig) : orig;
    document.getElementById('rst').onclick = () => { ta.value = orig; };
    document.getElementById('chk').onclick = () => {
      const n = samlCheck(ta.value, 'naive'), s = samlCheck(ta.value, 'safe');
      const r = document.getElementById('res');
      const trace = '<div class="mono" style="margin-top:6px">' + n.steps.map((x) => (x[0] ? '✓ ' : '✗ ') + Seq.esc(x[1])).join('<br>') + '</div>';
      if (n.ok && n.user === 'admin@acme.test') {
        r.className = 'verdict ok';
        r.innerHTML = '✅ Wrapped! The vulnerable SP verified the signed alice Assertion but read admin from your unsigned one. The safe SP says: ' +
          (s.ok ? 'logged in as ' + Seq.esc(s.user) : 'Rejected (' + Seq.esc(s.steps[s.steps.length - 1][1]) + ')') + '.' + trace;
      } else {
        r.className = 'verdict bad';
        r.innerHTML = '❌ ' + (n.ok ? 'Signature passes, but you are logged in as ' + Seq.esc(n.user) + '.' : 'The vulnerable SP rejected it: the signed Assertion must stay byte-for-byte intact.') + trace;
      }
    };
  }

  window.LESSONS.push(
    {
      id: 'saml',
      section: SEC,
      title: 'SAML 2.0 SP-initiated SSO',
      explain: `
        <p><strong>SAML 2.0</strong> (Security Assertion Markup Language, OASIS 2005) is the older sibling of OIDC and still runs most enterprise SSO: Salesforce, AWS, Workday, Atlassian, Zoom… all accept it. Same idea as OIDC, different vocabulary and much more XML.</p>
        <table>
          <tr><th>SAML term</th><th>Meaning</th><th>OIDC equivalent</th></tr>
          <tr><td>Service Provider (SP)</td><td>the app</td><td>Relying Party</td></tr>
          <tr><td>Identity Provider (IdP)</td><td>login server</td><td>OpenID Provider</td></tr>
          <tr><td>Assertion</td><td>signed XML statement about the user</td><td>ID token</td></tr>
          <tr><td>entityID</td><td>unique name (usually a URL) of an SP or IdP</td><td>client_id / issuer</td></tr>
          <tr><td>Assertion Consumer Service (ACS)</td><td>SP endpoint receiving assertions</td><td>redirect_uri</td></tr>
          <tr><td>Binding</td><td>how a message is carried over HTTP</td><td>response_mode</td></tr>
        </table>
        <h3>The two bindings you will meet</h3>
        <ul>
          <li><strong>HTTP-Redirect</strong> (<code>urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect</code>): message in the URL query: <code>SAMLRequest</code> = URL-encode(base64(DEFLATE(xml))), plus <code>RelayState</code> and optionally <code>SigAlg</code> + <code>Signature</code>. Used for the small AuthnRequest.</li>
          <li><strong>HTTP-POST</strong> (<code>…:bindings:HTTP-POST</code>): message in an auto-submitting HTML form field <code>SAMLResponse</code> = base64(xml). Used for the big, signed Response.</li>
        </ul>
        <p><code>RelayState</code> is an opaque value the SP sends and gets back unchanged, typically a key for "where was the user going".</p>
        <h3>Metadata: how SP and IdP trust each other</h3>
        <p>Before any login, admins exchange XML <strong>metadata</strong> files. The SP's says "my entityID, my ACS URL"; the IdP's says "my entityID, my SSO URL, my signing certificate".</p>
        <pre><code class="language-xml">&lt;md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
    entityID="https://idp.acme-idp.test"&gt;
  &lt;md:IDPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol"&gt;
    &lt;md:KeyDescriptor use="signing"&gt;
      &lt;ds:KeyInfo&gt;&lt;ds:X509Data&gt;&lt;ds:X509Certificate&gt;MIIDqDCC…&lt;/ds:X509Certificate&gt;…
    &lt;/md:KeyDescriptor&gt;
    &lt;md:SingleSignOnService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
        Location="https://idp.acme-idp.test/sso/saml"/&gt;
  &lt;/md:IDPSSODescriptor&gt;
&lt;/md:EntityDescriptor&gt;</code></pre>
        <div class="warn">Verify assertion signatures with the certificate from <strong>metadata</strong>. Never trust the <code>&lt;ds:X509Certificate&gt;</code> embedded in the incoming message: an attacker can sign with their own key and include their own cert.</div>
        <div class="tip">Base64 is not encryption. Anyone who sees the POST can read the assertion. Use TLS everywhere, and <code>&lt;EncryptedAssertion&gt;</code> if attributes are sensitive.</div>
      `,
      examples: [
        {
          title: 'SP-initiated SSO, message by message',
          code: W('<div id="flow"></div>', samlFlow, [L, isoAt, deflateRaw, samlLib]),
          explain: `
            <details>
              <summary>The problem: getting a signed statement from the IdP to the SP via the browser</summary>
              <p>SAML has no server-to-server call in the common setup. The browser carries the request to the IdP (in a URL) and the response to the SP (in a form POST). So the SP must assume the browser, or anyone, could have tampered with or replayed the message. That's why the assertion is signed and full of restrictions (audience, recipient, time window, InResponseTo).</p>
            </details>
            <details>
              <summary>Step by step</summary>
              <table>
                <tr><th>Step</th><th>Binding / message</th><th>Key fields</th></tr>
                <tr><td>2</td><td>SP builds <code>AuthnRequest</code></td><td><code>ID=_req42</code>, <code>Issuer</code>=SP entityID, <code>AssertionConsumerServiceURL</code></td></tr>
                <tr><td>3–4</td><td>HTTP-Redirect: 302 with <code>SAMLRequest</code> + <code>RelayState</code></td><td>XML → DEFLATE → base64 → URL-encode</td></tr>
                <tr><td>5</td><td>IdP decodes and checks the SP</td><td>known Issuer, registered ACS URL</td></tr>
                <tr><td>6–7</td><td>login at IdP</td><td>IdP session cookie set</td></tr>
                <tr><td>8</td><td>IdP builds and signs the Response</td><td><code>InResponseTo</code>, <code>Audience</code>, <code>Recipient</code>, <code>NotOnOrAfter</code>, <code>NameID</code></td></tr>
                <tr><td>9–10</td><td>HTTP-POST: auto-submit form to the ACS</td><td><code>SAMLResponse</code> = base64(XML), <code>RelayState</code></td></tr>
                <tr><td>11</td><td>SP validates 8 rules</td><td>signature, issuer, status, InResponseTo, recipient, time, audience, replay</td></tr>
                <tr><td>12</td><td>SP session + redirect to RelayState target</td><td><code>wiki_sid</code></td></tr>
              </table>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Click step 3 and read the comment: the AuthnRequest really is DEFLATE-compressed in the browser (sizes shown).</li>
                <li>Click step 8: the highlighted fields are exactly the ones validated in step 11.</li>
                <li>Compare the SP state card at step 2 and step 12: the pending request ID is consumed.</li>
              </ul>
            </details>
          `,
        },
        {
          title: 'Assertion explorer + encoding views',
          code: W('<div id="v"></div>', assertionViewer, [L, isoAt, deflateRaw, samlLib]),
        },
      ],
      quiz: [
        { q: 'Which binding usually carries the SAMLResponse to the SP?', options: ['HTTP-Redirect', 'HTTP-POST (auto-submitting form)', 'SOAP back-channel', 'WebSocket'], answer: 1, why: 'Responses are large and signed, so they go in a POSTed form field.' },
        { q: 'How is SAMLRequest encoded in the HTTP-Redirect binding?', options: ['base64 only', 'DEFLATE, then base64, then URL-encode', 'Encrypted with AES', 'JSON then base64url'], answer: 1, why: 'DEFLATE keeps the URL short.' },
        { q: 'What must the <Audience> element contain for your SP to accept the assertion?', options: ['The IdP entityID', 'Your SP\'s entityID', 'The user\'s email', 'The ACS URL'], answer: 1, why: 'AudienceRestriction says which SP the assertion is for.' },
        { q: 'The assertion includes an <ds:X509Certificate>. Which cert should you verify the signature with?', options: ['The one in the message', 'The IdP cert from metadata you configured', 'Any cert issued by a public CA', 'No cert is needed'], answer: 1, why: 'Otherwise attackers sign with their own key and ship their own cert.' },
        { q: 'What is RelayState for?', options: ['Encrypting the assertion', 'An opaque value round-tripped by the IdP, e.g. the page to return to', 'The user\'s password', 'The signing algorithm'], answer: 1, why: 'The SP sends it with the request and gets it back unchanged.' },
      ],
      exercise: {
        task: '<p>Seven assertions arrived at the wiki SP. For each, in the box below choose Accept or the reason to reject, then click <strong>Check</strong>.</p>',
        hint: 'Compare each snippet line by line with the SP config: Issuer, Audience, Recipient, InResponseTo, NotOnOrAfter vs now, and whether there is a ds:Signature at all.',
        starter: W('<div id="ex"></div>', samlExercise, [L, isoAt, samlLib]),
        solution: W('<div id="ex"></div>', samlExercise, [L, isoAt, samlLib], { solved: true }),
      },
    },
    {
      id: 'saml-vs-oidc',
      section: SEC,
      title: 'SAML vs OIDC & IdP-initiated SSO',
      explain: `
        <p>SAML and OIDC solve the same problem: an IdP tells an app who logged in, in a signed message. Choose OIDC for new apps (mobile, SPAs, APIs). Support SAML when enterprise customers demand it, which they often do.</p>
        <h3>IdP-initiated SSO</h3>
        <p>In <strong>SP-initiated</strong> SSO (previous lesson) the app sends an AuthnRequest first. In <strong>IdP-initiated</strong> SSO the user starts at the IdP's app portal, clicks a tile, and the IdP POSTs an <em>unsolicited</em> Response to the SP. It is convenient, but:</p>
        <ul>
          <li>There is no <code>InResponseTo</code>, so the SP cannot tell whether <em>this browser</em> started a login.</li>
          <li>That enables <strong>login CSRF</strong> (force a victim into the attacker's account) and makes stolen responses easier to replay.</li>
          <li>Mitigations: keep validity short, cache assertion IDs to block replays, or disable IdP-initiated and make the tile link to the SP's login URL (SP-initiated "bounce"). OIDC has no unsolicited ID tokens at all; its equivalent is "initiate login URI" that just asks the RP to start a normal flow.</li>
        </ul>
        <h3>XML Signature Wrapping (XSW)</h3>
        <p>XML Signature signs an <em>element identified by ID</em>, not "the whole message". If the code that <strong>verifies</strong> looks up the element by ID, but the code that <strong>reads the user</strong> takes "the first Assertion in the document", an attacker can add a second, unsigned Assertion with a different user. The signature still checks out, but the app reads the forged element.</p>
        <pre><code class="language-xml">&lt;samlp:Response&gt;
  &lt;saml:Assertion ID="_evil666"&gt; … admin@acme.test … &lt;/saml:Assertion&gt;   ← app reads this
  &lt;saml:Assertion ID="_a7c3e1d0"&gt;                                    ← signature covers this
    &lt;ds:Signature&gt; … Reference URI="#_a7c3e1d0" … &lt;/ds:Signature&gt; … alice@acme.test …
  &lt;/saml:Assertion&gt;
&lt;/samlp:Response&gt;</code></pre>
        <div class="warn">XSW-style bugs keep appearing in real SAML libraries (e.g. ruby-saml in 2024–2025, several CVEs). Use a well-maintained library, keep it updated, reject responses with more than one Assertion, and read data only from the element the signature actually covered.</div>
      `,
      examples: [
        { title: 'Side-by-side comparison', code: W('<div id="cmp"></div>', compareWidget, [L]) },
        {
          title: 'IdP-initiated SSO and login CSRF',
          code: W('<div id="flow"></div>', idpInitFlow, [L, isoAt, samlLib]),
          explain: `
            <details>
              <summary>The problem: an answer without a question</summary>
              <p>In SP-initiated SSO the SP remembers "I sent <code>_req42</code> from this browser session". An unsolicited response has nothing to match, so any valid response posted to the ACS is accepted, no matter who posted it or from which page.</p>
            </details>
            <details>
              <summary>Step by step: tab 2</summary>
              <table>
                <tr><th>Step</th><th>What happens</th></tr>
                <tr><td>1–2</td><td>Mallory obtains a valid, signed response for her own account</td></tr>
                <tr><td>3–4</td><td>Alice visits Mallory's page, which contains the same auto-submit form an IdP would send</td></tr>
                <tr><td>5</td><td>Alice's browser POSTs it to the real ACS</td></tr>
                <tr><td>6</td><td>The SP logs Alice's browser into Mallory's account</td></tr>
              </table>
            </details>
            <details>
              <summary>Try this</summary>
              <p>Compare the SP state card at the end of tabs 2 and 3. In tab 3, the SP stores <code>pending: _req77</code> before the IdP answers. That record is what was missing in tab 2.</p>
            </details>
          `,
        },
        {
          title: 'XML Signature Wrapping simulator',
          code: W('<div id="xsw"></div>', xswSim, [L, isoAt, samlLib, samlCheck, xswAttack]),
          explain: `
            <details>
              <summary>The problem: verifying one element, using another</summary>
              <p>The signature's <code>Reference URI="#_a7c3e1d0"</code> says which element is covered. The vulnerable SP verifies that element correctly, then calls the equivalent of <code>getElementsByTagName("Assertion")[0]</code> to read the user. Two different lookups, two different answers.</p>
            </details>
            <details>
              <summary>Step by step: what each preset shows</summary>
              <table>
                <tr><th>Preset</th><th>🙈 Vulnerable SP</th><th>🛡 Safe SP</th></tr>
                <tr><td>Original response</td><td>✓ all checks, logged in as alice</td><td>✓ logged in as alice</td></tr>
                <tr><td>XSW: inject unsigned evil Assertion</td><td>✓ digest + signature (the alice Assertion is untouched), then reads Assertion[0] → <strong>admin</strong> ⚠</td><td>✗ "exactly one Assertion…" (2 found) → Rejected</td></tr>
                <tr><td>Naive tamper NameID</td><td>✗ digest ≠ DigestValue → Rejected</td><td>✗ Rejected</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>The digest is a genuine SHA-256 over the serialized Assertion with its Signature removed (the enveloped-signature transform), so any edit inside the signed element is detected.</li>
                <li>Content <em>outside</em> the signed element is not protected at all. XSW abuses exactly that.</li>
                <li>Safe rule: the element you read must be the element you verified (same DOM node), and there must be only one.</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Load the XSW preset, then in the textarea change <code>ID="_evil666"</code> to <code>ID="_a7c3e1d0"</code> (duplicate IDs). Which assertion does the Reference now resolve to? (The first in document order: digest fails.)</li>
                <li>Load the original, then add a space inside <code>&lt;saml:AttributeValue&gt;</code>: digest fails, as it should.</li>
              </ul>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'What is missing from an IdP-initiated SAML Response that makes it riskier?', options: ['A signature', 'InResponseTo (no request to bind it to)', 'NameID', 'Audience'], answer: 1, why: 'The SP has no pending request ID to match, so it cannot tell who started the login.' },
        { q: 'In an XSW attack, what does the attacker change inside the signed Assertion?', options: ['The NameID', 'Nothing: they add a separate unsigned element the app reads instead', 'The DigestValue', 'The certificate'], answer: 1, why: 'The signed element stays intact so signature verification passes.' },
        { q: 'Best defence against XSW in your own SP code?', options: ['Use regex to find NameID', 'Read user data only from the exact element the signature verified, reject multiple Assertions, use a maintained library', 'Disable signatures', 'Base64-encode twice'], answer: 1, why: 'Bind "what was verified" to "what is used".' },
        { q: 'You are building a new mobile app with an API. Which protocol fits better?', options: ['SAML 2.0', 'OpenID Connect (with code + PKCE)', 'LDAP', 'Kerberos'], answer: 1, why: 'OIDC is JSON/OAuth-based and has native app support and access tokens.' },
      ],
      exercise: {
        task: '<p>Play attacker. In the box below, edit the SAML Response so the <strong>vulnerable SP</strong> logs you in as <code>admin@acme.test</code> while its signature checks still pass, then click <strong>Check</strong>.</p>',
        hint: 'Copy the whole <saml:Assertion …> … </saml:Assertion> block and paste it right before the original. In the copy: change ID to something new, change alice@acme.test to admin@acme.test, and delete its <ds:Signature> … </ds:Signature> block. Leave the original untouched.',
        starter: W('<div id="ex"></div>', xswExercise, [L, isoAt, samlLib, samlCheck, xswAttack]),
        solution: W('<div id="ex"></div>', xswExercise, [L, isoAt, samlLib, samlCheck, xswAttack], { solved: true }),
      },
    },
  );

  // ======================================================================
  // Lesson 7: Logout
  // ======================================================================
  function logoutFlow() {
    const IDP = 'id.acme.test';
    const now = Math.floor(Date.now() / 1000);
    const idTokenA = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { iss: 'https://' + IDP, sub: '248289761001', aud: 'app-a', exp: now - 1800, iat: now - 2100, sid: 'I_77' }, 'app-a-secret');
    const logoutToken = Auth.jwtSign({ alg: 'HS256', typ: 'logout+jwt' }, {
      iss: 'https://' + IDP, sub: '248289761001', aud: 'app-b', iat: now, exp: now + 120, jti: 'bWJq' + Auth.randHex(4),
      sid: 'I_77', events: { 'http://schemas.openid.net/event/backchannel-logout': {} } }, 'app-b-secret');
    const state = Auth.randB64url(8);
    const base = () => [
      { id: 'b', label: 'Browser', icon: '🌐', store: { 'app-a.test → a_sid': 'A_42', 'app-b.test → b_sid': 'B_19', [IDP + ' → idp_sid']: 'I_77' }, storeLabel: 'Cookie jar' },
      { id: 'a', label: 'App A', icon: '📒', store: { A_42: 'alice (sid I_77)' }, storeLabel: 'App A sessions' },
      { id: 'i', label: 'IdP · ' + IDP, icon: '🏛', store: { I_77: 'alice → RPs: app-a, app-b' }, storeLabel: 'IdP sessions' },
      { id: 'c', label: 'App B', icon: '📊', store: { B_19: 'alice (sid I_77)' }, storeLabel: 'App B sessions' },
    ];
    const S = samlLib();
    const lreq = '<samlp:LogoutRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"' +
      ' ID="_lr1" Version="2.0" IssueInstant="' + isoAt(0) + '" Destination="https://idp.acme-idp.test/slo">' +
      '<saml:Issuer>' + S.SP + '</saml:Issuer><saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">alice@acme.test</saml:NameID>' +
      '<samlp:SessionIndex>_sess_7f3a91</samlp:SessionIndex></samlp:LogoutRequest>';
    const lreq2 = lreq.replace('_lr1', '_lr2').replace(S.SP, S.IDP).replace('https://idp.acme-idp.test/slo', 'https://jira.acme.test/saml/slo');
    const lres = (id, irt, iss, dest) => '<samlp:LogoutResponse xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"' +
      ' ID="' + id + '" Version="2.0" IssueInstant="' + isoAt(0) + '" Destination="' + dest + '" InResponseTo="' + irt + '">' +
      '<saml:Issuer>' + iss + '</saml:Issuer><samlp:Status><samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/></samlp:Status></samlp:LogoutResponse>';
    const enc = (x) => encodeURIComponent(Auth.b64(deflateRaw(x)));
    const pretty = (x) => x.replace(/></g, '>\n<');
    const samlActors = [
      { id: 'b', label: 'Browser', icon: '🌐', store: { 'wiki → wiki_sid': 'W_88', 'jira → jira_sid': 'J_12', 'idp → idp_sid': 'I_31' }, storeLabel: 'Cookie jar' },
      { id: 'a', label: 'SP 1 · wiki', icon: '📚', store: { W_88: 'alice' }, storeLabel: 'wiki sessions' },
      { id: 'i', label: 'IdP · acme-idp.test', icon: '🏛', store: { I_31: 'alice → SPs: wiki, jira' }, storeLabel: 'IdP sessions' },
      { id: 'c', label: 'SP 2 · jira', icon: '🐞', store: { J_12: 'alice' }, storeLabel: 'jira sessions' },
    ];
    Seq.mount('#flow', {
      title: 'Three sessions, three ways to log out',
      intro: 'Starting point for every tab: Alice is logged into App A, App B and the IdP (three cookies, three sessions).',
      scenarios: [
        { name: '1 · App-only logout (surprise!)', actors: base(), steps: [
          { from: 'b', to: 'a', label: 'POST /logout', msg: L('POST /logout HTTP/1.1', 'Host: app-a.test', 'Cookie: a_sid=A_42'), note: 'Alice clicks "Log out" in App A.' },
          { from: 'a', to: 'b', kind: 'res', label: '302 / + delete a_sid', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: a_sid=; Max-Age=0; Secure; HttpOnly'), set: { a: { A_42: null }, b: { 'app-a.test → a_sid': null } }, note: 'App A deletes <b>its own</b> session. It cannot touch the IdP cookie (different domain).' },
          { from: 'b', to: 'a', label: 'GET / → "Sign in" clicked', msg: L('GET /login HTTP/1.1', 'Host: app-a.test'), note: 'Alice (or her colleague on the same computer!) clicks "Sign in".' },
          { from: 'a', to: 'b', kind: 'redirect', label: '302 → IdP /authorize', msg: L('HTTP/1.1 302 Found', 'Location: https://' + IDP + '/authorize?client_id=app-a&response_type=code&scope=openid&…') },
          { from: 'b', to: 'i', label: 'GET /authorize + Cookie idp_sid', msg: L('GET /authorize?client_id=app-a&… HTTP/1.1', 'Host: ' + IDP, 'Cookie: idp_sid=I_77'), hl: ['Cookie: idp_sid=I_77'] },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 code (no password!)', msg: L('HTTP/1.1 302 Found', 'Location: https://app-a.test/callback?code=c_99&state=…'), note: 'The IdP session is still alive, so SSO happily logs her straight back in.' },
          { from: 'b', to: 'a', kind: 'err', badge: 'Surprise', label: 'logged in again', msg: L('GET /callback?code=c_99&state=… HTTP/1.1', 'Host: app-a.test', '', '# → new a_sid. "I logged out, why am I still logged in?!"'), set: { a: { A_43: 'alice' }, b: { 'app-a.test → a_sid': 'A_43' } }, note: 'And App B never noticed anything. On a shared computer this is a real security problem.' },
        ] },
        { name: '2 · OIDC RP-initiated + back-channel', actors: base(), steps: [
          { from: 'b', to: 'a', label: 'POST /logout', msg: L('POST /logout HTTP/1.1', 'Host: app-a.test', 'Cookie: a_sid=A_42') },
          { from: 'a', to: 'b', kind: 'redirect', label: '302 → end_session_endpoint', msg: L('HTTP/1.1 302 Found', 'Location: https://' + IDP + '/oauth2/logout?id_token_hint=' + idTokenA, '    &post_logout_redirect_uri=https%3A%2F%2Fapp-a.test%2Flogged-out&state=' + state, 'Set-Cookie: a_sid=; Max-Age=0; Secure; HttpOnly'), hl: ['id_token_hint', 'post_logout_redirect_uri', 'state'], set: { a: { A_42: null }, b: { 'app-a.test → a_sid': null } }, note: 'OpenID Connect RP-Initiated Logout 1.0: the RP clears its session and sends the browser to the OP\'s <code>end_session_endpoint</code> (from discovery). <code>id_token_hint</code> = the ID token it got at login (expired is fine) so the OP knows who and which session.' },
          { from: 'b', to: 'i', label: 'GET /oauth2/logout?…', msg: L('GET /oauth2/logout?id_token_hint=eyJ…&post_logout_redirect_uri=…&state=' + state + ' HTTP/1.1', 'Host: ' + IDP, 'Cookie: idp_sid=I_77') },
          { from: 'i', to: 'i', label: 'check hint + redirect URI, end I_77', msg: L('# id_token_hint signed by me, aud=app-a, sid=I_77  ✓', '# post_logout_redirect_uri registered for app-a  ✓ (else: no redirect → open redirect risk)', '# session I_77 had RPs: app-a, app-b → notify app-b'), set: { i: { I_77: null } }, note: 'The OP ends <b>its</b> session and looks up every RP that used it.' },
          { from: 'i', to: 'c', kind: 'back', label: 'POST /backchannel-logout (logout_token)', msg: L('POST /backchannel-logout HTTP/1.1', 'Host: app-b.test', 'Content-Type: application/x-www-form-urlencoded', '', 'logout_token=' + logoutToken, '', '# decoded payload:', JSON.stringify(Auth.jwtDecode(logoutToken).payload, null, 2)), hl: ['logout_token', '"sid"', 'backchannel-logout'], note: 'OpenID Connect Back-Channel Logout 1.0: server-to-server, so it works even though the browser never visits App B. The logout token is a JWT with an <code>events</code> claim and <code>sid</code>/<code>sub</code>, and <b>no nonce</b>.' },
          { from: 'c', to: 'c', label: 'verify token, kill sessions with sid I_77', msg: L('# typ logout+jwt, signature, iss, aud=app-b, iat fresh  ✓', '# events contains http://schemas.openid.net/event/backchannel-logout  ✓', '# nonce absent (must be absent: stops ID tokens being used as logout tokens)  ✓', '# jti not seen before  ✓', '# delete every session with sid=I_77'), set: { c: { B_19: null } } },
          { from: 'c', to: 'i', kind: 'back', label: '200 OK', msg: L('HTTP/1.1 200 OK', 'Cache-Control: no-store') },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 → post_logout_redirect_uri', msg: L('HTTP/1.1 302 Found', 'Location: https://app-a.test/logged-out?state=' + state, 'Set-Cookie: idp_sid=; Max-Age=0; Secure; HttpOnly'), set: { b: { [IDP + ' → idp_sid']: null } } },
          { from: 'b', to: 'a', kind: 'res', label: 'GET /logged-out?state ✓', msg: L('GET /logged-out?state=' + state + ' HTTP/1.1', 'Host: app-a.test', '', '# App A checks state, shows "You are signed out everywhere"'), note: 'Every card is now empty except App B\'s browser cookie, which points to a session that no longer exists on the server. Next visit to App B → login prompt.' },
        ] },
        { name: '3 · SAML Single Logout (SLO)', actors: samlActors, steps: [
          { from: 'b', to: 'a', label: 'GET /logout', msg: L('GET /logout HTTP/1.1', 'Host: wiki.acme.test') },
          { from: 'a', to: 'b', kind: 'redirect', label: '302 IdP ?SAMLRequest=<LogoutRequest>', msg: L('HTTP/1.1 302 Found', 'Location: https://idp.acme-idp.test/slo?SAMLRequest=' + enc(lreq) + '&RelayState=bye', '    &SigAlg=http%3A%2F%2Fwww.w3.org%2F2001%2F04%2Fxmldsig-more%23rsa-sha256&Signature=…', '', '# decoded LogoutRequest:', pretty(lreq)), hl: ['SessionIndex', 'NameID'], set: { a: { W_88: null } }, note: 'The SP sends a signed <code>&lt;samlp:LogoutRequest&gt;</code> naming the user (<code>NameID</code>) and the IdP session (<code>SessionIndex</code> from the AuthnStatement), over the HTTP-Redirect binding.' },
          { from: 'b', to: 'i', label: 'GET /slo?SAMLRequest', msg: L('GET /slo?SAMLRequest=…&RelayState=bye&SigAlg=…&Signature=… HTTP/1.1', 'Host: idp.acme-idp.test') },
          { from: 'i', to: 'i', label: 'session participants: wiki, jira', note: 'The IdP must log out every other SP in the session first.' },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 jira ?SAMLRequest=<LogoutRequest>', msg: L('HTTP/1.1 302 Found', 'Location: https://jira.acme.test/saml/slo?SAMLRequest=' + enc(lreq2), '', '# decoded:', pretty(lreq2)), note: 'Front-channel propagation: the <b>browser</b> is bounced to each SP in turn.' },
          { from: 'b', to: 'c', label: 'GET /saml/slo?SAMLRequest', msg: L('GET /saml/slo?SAMLRequest=… HTTP/1.1', 'Host: jira.acme.test', 'Cookie: jira_sid=J_12') },
          { from: 'c', to: 'b', kind: 'redirect', label: '302 IdP ?SAMLResponse=<LogoutResponse>', msg: L('HTTP/1.1 302 Found', 'Location: https://idp.acme-idp.test/slo?SAMLResponse=' + enc(lres('_ls2', '_lr2', 'https://jira.acme.test/saml/metadata', 'https://idp.acme-idp.test/slo')), 'Set-Cookie: jira_sid=; Max-Age=0', '', pretty(lres('_ls2', '_lr2', 'https://jira.acme.test/saml/metadata', 'https://idp.acme-idp.test/slo'))), set: { c: { J_12: null }, b: { 'jira → jira_sid': null } } },
          { from: 'b', to: 'i', label: 'GET /slo?SAMLResponse', msg: L('GET /slo?SAMLResponse=… HTTP/1.1', 'Host: idp.acme-idp.test'), set: { i: { I_31: null } } },
          { from: 'i', to: 'b', kind: 'redirect', label: '302 wiki ?SAMLResponse=Success', msg: L('HTTP/1.1 302 Found', 'Location: https://wiki.acme.test/saml/slo?SAMLResponse=…&RelayState=bye', 'Set-Cookie: idp_sid=; Max-Age=0', '', pretty(lres('_ls1', '_lr1', S.IDP, 'https://wiki.acme.test/saml/slo'))), set: { b: { 'idp → idp_sid': null, 'wiki → wiki_sid': null } } },
          { from: 'b', to: 'a', kind: 'res', label: 'GET /saml/slo → "signed out"', msg: L('GET /saml/slo?SAMLResponse=…&RelayState=bye HTTP/1.1', 'Host: wiki.acme.test'), note: 'Works, but fragile: if jira is down or Alice closes the tab mid-chain, she ends up half logged out. Many IdPs offer the SOAP back-channel binding or just a best-effort SLO.' },
        ] },
      ],
    });
  }

  function logoutSim() {
    const S = { a: true, b: true, idp: true };
    const M = {
      login: ['🔄 Log in to both apps again', () => { S.a = S.b = S.idp = true; }, 'Alice is logged into App A, App B and the IdP.'],
      local: ['App A: local logout only', () => { S.a = false; }, 'App A deleted its session cookie. Nobody else was told.'],
      rp: ['App A: RP-initiated logout (IdP has no back-channel)', () => { S.a = false; S.idp = false; }, 'App A and the IdP sessions ended. App B was not notified.'],
      bc: ['App A: RP-initiated + back-channel logout', () => { S.a = S.idp = S.b = false; }, 'IdP POSTed a logout_token to App B, which killed its session too.'],
      fc: ['App A: RP-initiated + front-channel (3rd-party cookies blocked)', () => { S.a = false; S.idp = false; }, 'The IdP loaded App B\'s frontchannel_logout_uri in a hidden iframe, but the browser did not attach App B\'s cookie to that third-party request, so App B could not find the session. App B stays logged in.'],
    };
    const el = document.getElementById('sim');
    el.innerHTML = '<div class="row">' + Object.keys(M).map((k) => '<button data-m="' + k + '">' + M[k][0] + '</button>').join('') + '</div>' +
      '<div class="card" id="what"></div><div class="grid2" style="grid-template-columns:repeat(3,1fr)" id="st"></div>' +
      '<h4>What happens if Alice now…</h4><div id="next"></div>';
    const lamp = (on, name) => '<div class="card" style="background:' + (on ? '#dcfce7' : '#f1f5f9') + '"><b>' + name + '</b><br>' + (on ? '🟢 session alive' : '⚪ no session') + '</div>';
    const visit = (app, own) => own ? '<span class="ok">still logged in</span> (own session)' : S.idp ? '<span class="bad">silently logged back in</span> via the IdP session' : 'sees a <b>login prompt</b> ✔';
    function render(k) {
      el.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === k));
      document.getElementById('what').innerHTML = M[k][2];
      document.getElementById('st').innerHTML = lamp(S.a, '📒 App A') + lamp(S.idp, '🏛 IdP') + lamp(S.b, '📊 App B');
      document.getElementById('next').innerHTML = '<table class="t"><tr><td>…opens App A</td><td>' + visit('A', S.a) + '</td></tr><tr><td>…opens App B</td><td>' +
        visit('B', S.b) + '</td></tr></table>' + (S.a || S.b || S.idp ? '' : '<div class="verdict ok">✅ Fully logged out everywhere.</div>');
    }
    el.querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => { M[b.dataset.m][1](); render(b.dataset.m); }));
    render('login');
  }

  function logoutExercise() {
    const now = Math.floor(Date.now() / 1000);
    const idt = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { iss: 'https://id.acme.test', sub: '248289761001', aud: 'photoapp', iat: now - 600, exp: now - 300, sid: 'I_5c' }, 'k');
    const END = 'https://id.acme.test/oauth2/logout', POST = 'https://photoapp.test/logged-out';
    const el = document.getElementById('ex');
    const sol = END + '?id_token_hint=' + idt + '&post_logout_redirect_uri=' + encodeURIComponent(POST) + '&state=' + Auth.randB64url(8);
    el.innerHTML = '<div class="card mono">discovery.end_session_endpoint = ' + END + '<br>registered post_logout_redirect_uris for photoapp = ["' + POST + '"]' +
      '<br>ID token you received at login:<br><textarea rows="3" readonly>' + idt + '</textarea></div>' +
      '<div>Logout URL to redirect the browser to:</div><textarea id="u" rows="4" spellcheck="false">' + (VARS.solved ? sol : END + '?') + '</textarea>' +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const r = document.getElementById('res'), errs = [];
      let u;
      try { u = new URL(document.getElementById('u').value.trim()); } catch (e) { u = null; }
      if (!u) errs.push('Not a valid absolute URL.');
      else {
        if (u.origin + u.pathname !== END) errs.push('Must start with the end_session_endpoint ' + END);
        if (u.searchParams.get('id_token_hint') !== idt) errs.push('id_token_hint must be exactly the ID token above (copy all of it).');
        const p = u.searchParams.get('post_logout_redirect_uri');
        if (p !== POST) errs.push('post_logout_redirect_uri must exactly match a registered URI' + (p ? ' (got ' + Seq.esc(p) + ')' : ' (missing)') + '. URL-encode it.');
        if (!u.searchParams.get('state')) errs.push('Add a random state, so your /logged-out page can tell this redirect was yours.');
      }
      r.className = 'verdict ' + (errs.length ? 'bad' : 'ok');
      r.innerHTML = errs.length ? errs.map((e) => '✗ ' + e).join('<br>') : '✅ Correct RP-initiated logout request. (The expired ID token is fine as a hint.)';
    };
  }

  // ======================================================================
  // Lesson 8: Social login, federation, provisioning
  // ======================================================================
  function linkingSim() {
    const LOGINS = {
      bobG: ['Bob signs in with Google', { iss: 'https://accounts.google.com', sub: '110248495921238986420', email: 'bob@corp.test', email_verified: true }],
      evil: ['Attacker signs in with SketchyID', { iss: 'https://sketchy-id.test', sub: 'x9', email: 'bob@corp.test', email_verified: false }],
      bobG2: ['Bob (Google) after changing his Google email', { iss: 'https://accounts.google.com', sub: '110248495921238986420', email: 'bob.b@corp.test', email_verified: true }],
      newGh: ['Carol signs in with GitHub', { iss: 'github.com (OAuth: /user + /user/emails API)', sub: '583231', email: 'carol@mail.test', email_verified: true }],
    };
    const POL = {
      naive: 'Auto-link by email (naive)',
      verified: 'Auto-link only if email_verified = true',
      never: 'Never auto-link: match (iss, sub); if the email is taken, ask the user to sign in the old way first',
    };
    let db, pol = 'naive';
    const reset = () => { db = [{ id: 1, email: 'bob@corp.test', methods: ['password'], links: [] }]; };
    reset();
    const el = document.getElementById('lk');
    el.innerHTML = '<div class="card"><b>App policy:</b> ' + Object.keys(POL).map((k) => '<label style="display:block"><input type="radio" name="p" value="' + k + '"' + (k === pol ? ' checked' : '') + '> ' + POL[k] + '</label>').join('') + '</div>' +
      '<div class="row">' + Object.keys(LOGINS).map((k) => '<button data-l="' + k + '">' + LOGINS[k][0] + '</button>').join('') + '<button id="rs">↺ reset DB</button></div>' +
      '<div class="grid2"><div class="card"><h4>Incoming identity</h4><pre class="box" id="tok">(click a login)</pre><div id="trace"></div></div><div class="card"><h4>App user table</h4><div id="db"></div></div></div>';
    el.querySelectorAll('[name=p]').forEach((r) => (r.onchange = () => { pol = r.value; }));
    function showDb(hl) {
      document.getElementById('db').innerHTML = '<table class="t"><tr><th>id</th><th>email</th><th>login methods</th><th>linked (iss, sub)</th></tr>' +
        db.map((u) => '<tr style="background:' + (u.id === hl ? '#fff1a8' : '') + '"><td>' + u.id + '</td><td>' + u.email + '</td><td>' + u.methods.join(', ') + '</td><td class="mono">' +
          (u.links.map((l) => l.iss.split(' ')[0].replace('https://', '') + ' / ' + l.sub).join('<br>') || '-') + '</td></tr>').join('') + '</table>';
    }
    function login(k) {
      const t = LOGINS[k][1], tr = [];
      let hl = null, verdict = '', cls = 'ok';
      document.getElementById('tok').textContent = JSON.stringify(t, null, 2);
      const linked = db.find((u) => u.links.some((l) => l.iss === t.iss && l.sub === t.sub));
      tr.push('1. Look up (iss, sub) in links → ' + (linked ? 'found user #' + linked.id : 'not linked yet'));
      if (linked) { hl = linked.id; verdict = 'Logged in as user #' + linked.id + ' (email change does not matter: sub is stable)'; }
      else {
        const byEmail = db.find((u) => u.email === t.email);
        tr.push('2. Look up email ' + t.email + ' → ' + (byEmail ? 'user #' + byEmail.id + ' exists' : 'no user'));
        if (!byEmail) {
          const n = { id: db.length + 1, email: t.email, methods: [t.iss.split(' ')[0].replace('https://', '')], links: [{ iss: t.iss, sub: t.sub }] };
          db.push(n); hl = n.id;
          tr.push('3. Create new user #' + n.id);
          verdict = 'New account #' + n.id + ' created';
          if (k === 'bobG2') { cls = 'bad'; verdict += ': a duplicate of Bob, because the app keyed on email instead of (iss, sub)!'; }
        } else if (pol === 'naive' || (pol === 'verified' && t.email_verified === true)) {
          byEmail.links.push({ iss: t.iss, sub: t.sub });
          byEmail.methods.push(t.iss.split(' ')[0].replace('https://', ''));
          hl = byEmail.id;
          tr.push('3. Policy "' + pol + '" → link to #' + byEmail.id + ' and log in' + (pol === 'naive' ? ' (email_verified was ' + t.email_verified + ', never checked)' : ''));
          if (k === 'evil') { cls = 'bad'; verdict = '🚨 ACCOUNT TAKEOVER: the attacker is now logged in as Bob and has a permanent login method on his account.'; }
          else verdict = 'Linked and logged in as #' + byEmail.id;
        } else {
          tr.push('3. Policy "' + pol + '" → refuse to auto-link' + (pol === 'verified' ? ' (email_verified = ' + t.email_verified + ')' : ''));
          cls = k === 'evil' ? 'ok' : '';
          verdict = 'Shown: "An account with this email exists. Sign in with your password, then link ' + t.iss.split(' ')[0].replace('https://', '') + ' in Settings."';
        }
      }
      document.getElementById('trace').innerHTML = '<div class="mono">' + tr.join('<br>') + '</div><div class="verdict ' + cls + '" style="' + (cls ? '' : 'background:#f1f5f9') + '">' + verdict + '</div>';
      showDb(hl);
    }
    el.querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => login(b.dataset.l)));
    document.getElementById('rs').onclick = () => { reset(); showDb(); document.getElementById('trace').innerHTML = ''; };
    showDb();
  }

  function federationFlow() {
    const S = samlLib();
    const OKTA = 'designhub.okta.test', ADFS = 'sts.globex.test';
    const req = '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="_okta91" Version="2.0" IssueInstant="' + isoAt(0) +
      '" Destination="https://' + ADFS + '/adfs/ls/" AssertionConsumerServiceURL="https://' + OKTA + '/sso/saml2/0oa4globex"><saml:Issuer>https://www.okta.com/exk4globex</saml:Issuer></samlp:AuthnRequest>';
    const now = Math.floor(Date.now() / 1000);
    const idt = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { iss: 'https://' + OKTA, sub: '00u8bob', aud: 'designhub-web', iat: now, exp: now + 300, email: 'bob@globex.test', idp: 'globex-adfs', amr: ['fed'] }, 'k');
    Seq.mount('#flow', {
      title: 'Federation chain: DesignHub → Okta → Globex AD FS → Active Directory',
      intro: 'DesignHub (a SaaS app) trusts only its own Okta tenant. Okta trusts customer Globex\'s IdP. Globex\'s IdP trusts Globex\'s Active Directory. Each hop speaks its own protocol.',
      actors: [
        { id: 'b', label: 'Bob\'s browser', icon: '🌐', store: {}, storeLabel: 'Cookies' },
        { id: 'a', label: 'DesignHub app', icon: '🎨', store: { trusts: 'Okta (OIDC)' } },
        { id: 'o', label: 'Okta (broker)', icon: '🔀', store: { 'globex.test': '→ SAML IdP sts.globex.test' }, storeLabel: 'Okta routing rules' },
        { id: 'f', label: 'Globex AD FS', icon: '🏢', store: { trusts: 'AD domain GLOBEX' } },
        { id: 'd', label: 'Globex AD DC', icon: '🗄', store: { bob: 'GLOBEX\\bob, groups: Design' } },
      ],
      steps: [
        { from: 'b', to: 'a', label: 'enter bob@globex.test', msg: L('POST /login HTTP/1.1', 'Host: designhub.test', '', 'email=bob%40globex.test'), note: 'Bob types only his email ("identifier-first" login).' },
        { from: 'a', to: 'b', kind: 'redirect', label: '302 → Okta /authorize (OIDC)', msg: L('HTTP/1.1 302 Found', 'Location: https://' + OKTA + '/oauth2/v1/authorize?client_id=designhub-web&response_type=code', '    &scope=openid%20email&login_hint=bob%40globex.test&state=…&nonce=…&code_challenge=…') },
        { from: 'b', to: 'o', label: 'GET /oauth2/v1/authorize', msg: L('GET /oauth2/v1/authorize?client_id=designhub-web&login_hint=bob%40globex.test&… HTTP/1.1', 'Host: ' + OKTA) },
        { from: 'o', to: 'o', label: 'home realm discovery: @globex.test', note: '<b>Home realm discovery</b>: Okta\'s routing rule maps the email domain to Globex\'s own IdP. Okta does not know Bob\'s password and never will.' },
        { from: 'o', to: 'b', kind: 'redirect', label: '302 → AD FS ?SAMLRequest', msg: L('HTTP/1.1 302 Found', 'Location: https://' + ADFS + '/adfs/ls/?SAMLRequest=' + encodeURIComponent(Auth.b64(deflateRaw(req))) + '&RelayState=okta_…', '', '# Okta now plays SAML *SP* toward Globex:', req.replace(/></g, '>\n<')) },
        { from: 'b', to: 'f', label: 'GET /adfs/ls/?SAMLRequest', msg: L('GET /adfs/ls/?SAMLRequest=… HTTP/1.1', 'Host: ' + ADFS, 'Authorization: Negotiate YIIH…  # on the corporate network: Kerberos SSO (next section)') },
        { from: 'f', to: 'd', kind: 'back', label: 'Kerberos ticket check / LDAP lookup', msg: L('# AD FS validates Bob\'s Kerberos service ticket (or an LDAP bind for a form login)', '# then reads attributes over LDAP:', 'SearchRequest base="DC=globex,DC=test" filter=(sAMAccountName=bob)', '    attributes: mail, givenName, sn, memberOf') },
        { from: 'd', to: 'f', kind: 'back', label: 'bob: mail, memberOf=Design', msg: L('SearchResultEntry "CN=Bob B,OU=Staff,DC=globex,DC=test"', '  mail: bob@globex.test', '  memberOf: CN=Design,OU=Groups,DC=globex,DC=test') },
        { from: 'f', to: 'b', kind: 'res', label: 'auto-POST SAMLResponse → Okta ACS', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<body onload="document.forms[0].submit()">', '<form method="POST" action="https://' + OKTA + '/sso/saml2/0oa4globex">', '  <input type="hidden" name="SAMLResponse" value="PHNhbWxwOlJlc3BvbnNl…"/>', '</form>', '', '# Assertion: Issuer=http://sts.globex.test/adfs/services/trust, NameID=bob@globex.test,', '#            Audience=https://www.okta.com/exk4globex, groups=Design'), set: { b: { 'sts.globex.test → MSISAuth': '…' } } },
        { from: 'b', to: 'o', label: 'POST /sso/saml2/0oa4globex', msg: L('POST /sso/saml2/0oa4globex HTTP/1.1', 'Host: ' + OKTA, '', 'SAMLResponse=PHNhbWxwOlJlc3BvbnNl…&RelayState=okta_…') },
        { from: 'o', to: 'o', label: 'validate SAML, JIT-create/link Okta user', note: 'Okta validates the assertion like any SAML SP, then creates or updates its own user <code>00u8bob</code> (JIT), mapping attributes and groups.', set: { o: { '00u8bob': 'bob@globex.test (idp: globex-adfs)' } } },
        { from: 'o', to: 'b', kind: 'redirect', label: '302 → DesignHub /callback?code', msg: L('HTTP/1.1 302 Found', 'Location: https://designhub.test/callback?code=…&state=…', 'Set-Cookie: sid=…; Domain=' + OKTA) },
        { from: 'b', to: 'a', label: 'GET /callback → id_token from Okta', msg: L('GET /callback?code=…&state=… HTTP/1.1', 'Host: designhub.test', '', '# DesignHub exchanges the code at Okta (back-channel) and gets:', JSON.stringify(Auth.jwtDecode(idt).payload, null, 2)), set: { a: { session: 'bob@globex.test via Okta' } }, note: 'DesignHub only ever validates an <b>Okta</b> ID token. It never talks to Globex. Adding a new enterprise customer is an Okta config change, not a code change.' },
      ],
    });
  }

  function provisioningFlow() {
    const userBody = { schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'], externalId: '7f3c9a2e-5b1d-4c88-9e0a-2d4b6f1a3c55', userName: 'bob@globex.test',
      name: { givenName: 'Bob', familyName: 'Builder' }, displayName: 'Bob Builder', emails: [{ value: 'bob@globex.test', type: 'work', primary: true }], active: true };
    const created = Object.assign({ id: '2819c223-7f76-453a-919d-413861904646' }, userBody, { meta: { resourceType: 'User', created: isoAt(0), lastModified: isoAt(0),
      location: 'https://api.designhub.test/scim/v2/Users/2819c223-7f76-453a-919d-413861904646', version: 'W/"a330bc54f0671c9"' } });
    const actors = [
      { id: 'u', label: 'Bob\'s browser', icon: '🌐' },
      { id: 'i', label: 'Entra ID (Globex)', icon: '🏢', store: { bob: 'active, in group "DesignHub users"' }, storeLabel: 'Directory' },
      { id: 'a', label: 'DesignHub', icon: '🎨', store: {}, storeLabel: 'DesignHub users' },
    ];
    Seq.mount('#flow', {
      title: 'Getting users into the app: JIT vs SCIM 2.0',
      scenarios: [
        { name: 'JIT (just-in-time) provisioning', actors: actors, steps: [
          { from: 'u', to: 'a', label: 'first SSO login (SAML/OIDC)', msg: L('POST /saml/acs HTTP/1.1', 'Host: designhub.test', '', 'SAMLResponse=…   # NameID=bob@globex.test, givenName=Bob, groups=Design'), note: 'Nobody created Bob in DesignHub beforehand.' },
          { from: 'a', to: 'a', label: 'no such user → create from assertion', set: { a: { 'bob@globex.test': 'active (created at first login)' } }, note: '<b>JIT</b>: create (or update) the account from the attributes in the assertion/ID token. Simple: no extra API.' },
          { from: 'a', to: 'u', kind: 'res', label: '302 / + session', msg: L('HTTP/1.1 302 Found', 'Set-Cookie: dh_sid=D_1; Secure; HttpOnly'), set: { a: { D_1: 'bob session (30 days)' } } },
          { from: 'i', to: 'i', label: 'Bob leaves Globex → disabled', set: { i: { bob: 'DISABLED' } }, note: 'HR disables Bob in the directory.' },
          { from: 'u', to: 'a', kind: 'err', badge: 'Gap', label: 'Bob\'s old session still works', msg: L('GET /files HTTP/1.1', 'Host: designhub.test', 'Cookie: dh_sid=D_1', '', '# 200 OK: DesignHub was never told'), note: 'JIT only runs <b>at login</b>. DesignHub learns nothing about leavers: existing sessions, API tokens and the account linger until they expire. A colleague cannot share files with Bob before his first login either.' },
        ] },
        { name: 'SCIM 2.0 (push from the IdP)', actors: actors, steps: [
          { from: 'i', to: 'i', label: 'Bob added to group "DesignHub users"', note: 'An admin assigns the app. The IdP\'s provisioning service now pushes changes, typically every few minutes.' },
          { from: 'i', to: 'a', kind: 'back', label: 'GET /scim/v2/Users?filter=userName eq …', msg: L('GET /scim/v2/Users?filter=userName%20eq%20%22bob%40globex.test%22 HTTP/1.1', 'Host: api.designhub.test', 'Authorization: Bearer scim_tok_4f1e…', 'Accept: application/scim+json'), note: 'SCIM (RFC 7643/7644) is a REST API the <b>app</b> implements and the <b>IdP</b> calls. First: does the user exist?' },
          { from: 'a', to: 'i', kind: 'back', label: '200 totalResults: 0', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/scim+json', '', JSON.stringify({ schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'], totalResults: 0, Resources: [] }, null, 2)) },
          { from: 'i', to: 'a', kind: 'back', label: 'POST /scim/v2/Users', msg: L('POST /scim/v2/Users HTTP/1.1', 'Host: api.designhub.test', 'Authorization: Bearer scim_tok_4f1e…', 'Content-Type: application/scim+json', '', JSON.stringify(userBody, null, 2)), hl: ['userName', 'externalId', '"active": true'] },
          { from: 'a', to: 'i', kind: 'back', label: '201 Created {id}', msg: L('HTTP/1.1 201 Created', 'Content-Type: application/scim+json', 'Location: ' + created.meta.location, 'ETag: W/"a330bc54f0671c9"', '', JSON.stringify(created, null, 2)), hl: ['"id"'], set: { a: { 'bob@globex.test': 'active (id 2819c223…), before any login' } }, note: 'Bob exists before he ever logs in: colleagues can share with him, licences are counted.' },
          { from: 'u', to: 'a', label: 'SSO login → matched existing user', msg: L('POST /saml/acs HTTP/1.1', 'Host: designhub.test', '', 'SAMLResponse=…   # NameID=bob@globex.test'), set: { a: { D_2: 'bob session' } } },
          { from: 'i', to: 'i', label: 'Bob leaves → disabled', set: { i: { bob: 'DISABLED' } } },
          { from: 'i', to: 'a', kind: 'back', label: 'PATCH /scim/v2/Users/2819c223… active=false', msg: L('PATCH /scim/v2/Users/2819c223-7f76-453a-919d-413861904646 HTTP/1.1', 'Host: api.designhub.test', 'Authorization: Bearer scim_tok_4f1e…', 'Content-Type: application/scim+json', '', JSON.stringify({ schemas: ['urn:ietf:params:scim:api:messages:2.0:PatchOp'], Operations: [{ op: 'replace', path: 'active', value: false }] }, null, 2)), hl: ['"active"', 'PatchOp'] },
          { from: 'a', to: 'a', label: 'deactivate + revoke sessions/tokens', set: { a: { 'bob@globex.test': 'DEACTIVATED', D_2: null } }, note: 'The app must also kill live sessions and API tokens, not just flip a flag.' },
          { from: 'a', to: 'i', kind: 'back', label: '200 OK', msg: L('HTTP/1.1 200 OK', 'Content-Type: application/scim+json', '', '{ "id": "2819c223-…", "userName": "bob@globex.test", "active": false, … }') },
          { from: 'u', to: 'a', kind: 'err', label: 'Bob tries again → 403', msg: L('GET /files HTTP/1.1', 'Host: designhub.test', 'Cookie: dh_sid=D_2', '', '# → 302 /login (session revoked); SSO would fail too: IdP refuses a disabled user'), note: 'Deprovisioning within minutes. That is why enterprise customers ask "do you support SCIM?".' },
        ] },
      ],
    });
  }

  function linkExercise() {
    const CASES = [
      ['1', '(iss=Google, sub=1102…) is already linked to user #7', 'login'],
      ['2', 'New (iss=Google, sub=5531…), email dave@mail.test (verified), no user has that email', 'create'],
      ['3', 'New (iss=Google, sub=8810…), email erin@corp.test (verified); user #3 has email erin@corp.test and a password', 'ask'],
      ['4', '(iss=Google, sub=1102…) linked to #7, but the token\'s email changed from fred@ to fred.k@', 'login'],
      ['5', 'New (iss=sketchy-id, sub=x9), email erin@corp.test, email_verified=false; user #3 has that email', 'ask'],
      ['6', 'New (iss=https://sketchy-id.test, sub=1102…: the same digits as case 1), email gina@mail.test, no user has that email', 'create'],
    ];
    const OPT = [['', '— choose —'], ['login', 'Log in as the linked user'], ['create', 'Create a new account'], ['ask', 'Ask user to sign in the existing way, then link']];
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card">Policy: <b>(1)</b> look up <code>(iss, sub)</code>; if linked, log in. <b>(2)</b> Else if the email belongs to an existing user, never auto-link: ask them to sign in the existing way first. <b>(3)</b> Else create a new account.</div>' +
      '<table class="t">' + CASES.map((c) => '<tr><td>' + c[0] + '</td><td>' + c[1] + '</td><td><select data-c="' + c[0] + '">' +
        OPT.map((o) => '<option value="' + o[0] + '"' + (VARS.solved && o[0] === c[2] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></td></tr>').join('') +
      '</table><button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = CASES.filter((c) => el.querySelector('[data-c="' + c[0] + '"]').value !== c[2]).map((c) => c[0]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? '❌ Re-check case(s) ' + bad.join(', ') + '. The user key is the pair (iss, sub): a sub from another issuer is a different identity, and an email change does not matter.'
        : '✅ Right. Case 6 is subtle: sub values are only unique within one issuer, so (sketchy-id, 1102…) has nothing to do with the Google user #7.';
    };
  }

  window.LESSONS.push(
    {
      id: 'logout-slo',
      section: SEC,
      title: 'Logout: local, RP-initiated & single logout',
      explain: `
        <p>Login with SSO creates <strong>several sessions</strong>: one per app plus one at the IdP. "Log out" can mean ending one, some, or all of them, and they live on different servers and different cookie domains.</p>
        <table>
          <tr><th>Kind</th><th>Ends</th><th>How</th></tr>
          <tr><td>Local logout</td><td>this app's session</td><td>delete server session + cookie</td></tr>
          <tr><td>RP-initiated logout (OIDC)</td><td>app + IdP session</td><td>redirect to <code>end_session_endpoint</code> with <code>id_token_hint</code>, <code>post_logout_redirect_uri</code>, <code>state</code></td></tr>
          <tr><td>Back-channel logout (OIDC)</td><td>other apps' sessions</td><td>IdP POSTs a signed <code>logout_token</code> to each RP's <code>backchannel_logout_uri</code></td></tr>
          <tr><td>Front-channel logout (OIDC)</td><td>other apps' sessions</td><td>IdP loads each RP's logout URL in hidden iframes (breaks when third-party cookies are blocked)</td></tr>
          <tr><td>SAML Single Logout</td><td>all SPs + IdP</td><td><code>LogoutRequest</code> / <code>LogoutResponse</code> bounced through the browser (or SOAP)</td></tr>
        </table>
        <div class="warn">Local logout alone + a live IdP session = the user is silently logged back in on the next click of "Sign in". On a shared computer that is a real problem.</div>
        <h3>The logout token</h3>
        <pre><code class="language-json">{
  "iss": "https://id.acme.test",
  "aud": "app-b",
  "iat": 1793443900, "exp": 1793444020,
  "jti": "bWJq4f1e",
  "sub": "248289761001",
  "sid": "I_77",
  "events": { "http://schemas.openid.net/event/backchannel-logout": {} }
}</code></pre>
        <p>It looks like an ID token but must contain the <code>events</code> claim and must <strong>not</strong> contain a <code>nonce</code>, so the two can't be swapped. The JWT header should use <code>typ: logout+jwt</code>. <code>sid</code> is the IdP session id that also appeared in the ID token at login, so the RP must remember it next to its own session.</p>
        <div class="tip">Ending sessions is not the whole story: refresh tokens issued to the app keep working until revoked (<code>revocation_endpoint</code>). A complete logout revokes them too.</div>
      `,
      examples: [
        {
          title: 'Logout scenarios, message by message',
          code: W('<div id="flow"></div>', logoutFlow, [L, isoAt, deflateRaw, samlLib]),
          explain: `
            <details>
              <summary>The problem: three sessions on three servers</summary>
              <p>App A can only delete what it owns. To end the IdP session it must send the browser there (the IdP cookie is only sent to the IdP). To end App B's session, someone must tell App B: either the browser visits it (front-channel / SAML redirect chain) or the IdP calls it server-to-server (back-channel).</p>
            </details>
            <details>
              <summary>Step by step: tab 2 (OIDC)</summary>
              <table>
                <tr><th>Step</th><th>Message</th><th>Sessions left (A / IdP / B)</th></tr>
                <tr><td>1–2</td><td>App A clears its session, 302 to <code>end_session_endpoint?id_token_hint&amp;post_logout_redirect_uri&amp;state</code></td><td>– / ✓ / ✓</td></tr>
                <tr><td>3–4</td><td>IdP validates the hint and the redirect URI, ends <code>I_77</code></td><td>– / – / ✓</td></tr>
                <tr><td>5–7</td><td>Back-channel <code>POST /backchannel-logout</code> with <code>logout_token</code> (sid I_77) → App B deletes session → 200</td><td>– / – / –</td></tr>
                <tr><td>8–9</td><td>302 back to <code>post_logout_redirect_uri?state</code></td><td>– / – / –</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>Tab 1: local logout is not SSO logout. Watch the IdP card: <code>I_77</code> never disappears.</li>
                <li>Tab 2: the IdP knows which RPs share a session, and <code>sid</code> lets each RP find its matching local sessions.</li>
                <li>Tab 3: SAML SLO chains the browser through every SP. One broken hop and logout stays partial.</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>In tab 2, click step 5 and find <code>"sid"</code> and the <code>events</code> URI in the decoded logout token.</li>
                <li>In tab 3, count how many times the browser bounces (steps with orange dashed arrows) for just two SPs.</li>
              </ul>
            </details>
          `,
        },
        {
          title: 'Logout simulator: which sessions survive?',
          code: W('<div id="sim"></div>', logoutSim),
        },
      ],
      quiz: [
        { q: 'Alice logs out of App A (local logout only), then clicks "Sign in". What happens?', options: ['A password prompt', 'She is logged in silently via the still-valid IdP session', 'An error', 'App B logs out'], answer: 1, why: 'The IdP session cookie was never touched.' },
        { q: 'Which parameter tells the OP which user/session the RP wants to end?', options: ['nonce', 'id_token_hint', 'code_verifier', 'RelayState'], answer: 1, why: 'id_token_hint carries the ID token issued at login (it may be expired).' },
        { q: 'Why does back-channel logout work even when the browser never visits App B?', options: ['It uses cookies', 'The IdP POSTs a logout_token to App B server-to-server', 'It uses WebSockets', 'App B polls every second'], answer: 1, why: 'Back-channel = direct server-to-server call.' },
        { q: 'Why must a logout token NOT contain a nonce?', options: ['It is too long', 'So an ID token (which has a nonce) can never be accepted as a logout token', 'Nonces are deprecated', 'To save bandwidth'], answer: 1, why: 'The spec forbids nonce and requires the events claim, making the two token types distinguishable.' },
        { q: 'What identifies the IdP session in a SAML LogoutRequest?', options: ['RelayState', 'SessionIndex (with NameID)', 'AssertionConsumerServiceURL', 'Audience'], answer: 1, why: 'SessionIndex comes from the AuthnStatement issued at login.' },
      ],
      exercise: {
        task: '<p>Build the RP-initiated logout URL for PhotoApp in the box below (endpoint + <code>id_token_hint</code> + <code>post_logout_redirect_uri</code> + <code>state</code>) and click <strong>Check</strong>.</p>',
        hint: 'Start from the end_session_endpoint, then ?id_token_hint=<the whole token>&post_logout_redirect_uri=https%3A%2F%2Fphotoapp.test%2Flogged-out&state=<any random string>.',
        starter: W('<div id="ex"></div>', logoutExercise),
        solution: W('<div id="ex"></div>', logoutExercise, [], { solved: true }),
      },
    },
    {
      id: 'federation-social',
      section: SEC,
      title: 'Social login, federation & provisioning',
      explain: `
        <h3>Social login</h3>
        <p>"Sign in with Google / Apple / Microsoft" is just OIDC where the IdP is a big consumer provider (Google's issuer is <code>https://accounts.google.com</code>). "Sign in with GitHub" is plain <strong>OAuth 2</strong> plus GitHub's <code>/user</code> and <code>/user/emails</code> APIs (no ID token), so you read the verified flag from that API.</p>
        <h3>Account linking: the dangerous part</h3>
        <p>Your app already has <code>bob@corp.test</code> with a password. Someone signs in with an IdP whose token says <code>email: bob@corp.test</code>. Should you log them into Bob's account?</p>
        <ul>
          <li>Only if the IdP <strong>verified</strong> that email (<code>email_verified: true</code>) <em>and</em> you trust that IdP to be authoritative for it. Some IdPs let users type any email.</li>
          <li>Safest: never auto-link. Ask the user to sign in the old way first, then link the new provider from settings.</li>
          <li>After linking, recognise the user by <code>(iss, sub)</code>, never by email: emails change.</li>
        </ul>
        <div class="warn">"Auto-link by email" with an IdP that does not verify emails = account takeover. Variants of this bug (including account "pre-hijacking", studied by Microsoft researchers in 2022) have hit many real apps.</div>
        <h3>Enterprise federation</h3>
        <p>B2B SaaS apps serve many companies, each with its own IdP (Microsoft Entra ID, Okta, Google Workspace, AD FS…). Instead of integrating each one, the app trusts <strong>one broker</strong> (Okta, Auth0, Entra External ID, Keycloak) and the broker federates to each customer's IdP. Chain of trust: App → broker → customer IdP → customer directory (often Active Directory).</p>
        <h3>Provisioning: getting accounts into the app</h3>
        <table>
          <tr><th></th><th>JIT provisioning</th><th>SCIM 2.0</th></tr>
          <tr><td>When</td><td>at first login</td><td>pushed by the IdP when the directory changes</td></tr>
          <tr><td>How</td><td>create the user from assertion / ID token attributes</td><td>IdP calls the app's REST API: <code>POST /scim/v2/Users</code>, <code>PATCH</code>, <code>DELETE</code></td></tr>
          <tr><td>Deprovisioning</td><td>none: app never hears about leavers</td><td><code>active: false</code> within minutes</td></tr>
          <tr><td>Effort</td><td>trivial</td><td>implement a SCIM server (RFC 7643 schema, RFC 7644 protocol)</td></tr>
        </table>
      `,
      examples: [
        {
          title: 'Account linking simulator',
          code: W('<div id="lk"></div>', linkingSim),
          explain: `
            <details>
              <summary>The problem: email is a claim, not proof</summary>
              <p>An ID token's <code>email</code> is whatever the IdP says. If the IdP did not verify it, anyone can claim <code>bob@corp.test</code>. Linking by email then hands Bob's account to the attacker, permanently, because a new login method is now attached to it.</p>
            </details>
            <details>
              <summary>Step by step: what to click and what you will see</summary>
              <table>
                <tr><th>Policy</th><th>Attacker signs in with SketchyID</th><th>Bob signs in with Google</th></tr>
                <tr><td>Auto-link by email</td><td>🚨 ACCOUNT TAKEOVER</td><td>linked to #1</td></tr>
                <tr><td>Auto-link only if verified</td><td>refused (email_verified = false)</td><td>linked to #1</td></tr>
                <tr><td>Never auto-link</td><td>refused: "sign in with your password first"</td><td>refused too (safe, a bit more friction)</td></tr>
              </table>
              <p>Then click <strong>Bob (Google) after changing his Google email</strong>: if Bob was already linked, step 1 finds him by <code>(iss, sub)</code>. If not linked yet, a duplicate account appears.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Keep "naive", click <strong>Attacker signs in with SketchyID</strong>. Watch row #1 gain a <code>sketchy-id.test</code> link.</li>
                <li>Click ↺ reset DB, choose "only if email_verified", repeat.</li>
                <li>Reset, click <strong>Bob signs in with Google</strong> (naive), then <strong>Bob after changing his Google email</strong>: still user #1.</li>
              </ol>
            </details>
          `,
        },
        {
          title: 'Federation chain: app → broker → customer IdP → AD',
          code: W('<div id="flow"></div>', federationFlow, [L, isoAt, deflateRaw, samlLib]),
        },
        {
          title: 'JIT vs SCIM provisioning',
          code: W('<div id="flow"></div>', provisioningFlow, [L, isoAt]),
          explain: `
            <details>
              <summary>The problem: leavers</summary>
              <p>With JIT, the app hears about a user only when they log in. When someone leaves the company, the IdP blocks <em>new</em> logins, but the app's existing sessions, API tokens and the account itself linger. Compare the DesignHub state card at the last step of each tab.</p>
            </details>
            <details>
              <summary>Step by step: the SCIM tab</summary>
              <table>
                <tr><th>Step</th><th>Request (IdP → app)</th><th>Effect</th></tr>
                <tr><td>2–3</td><td><code>GET /scim/v2/Users?filter=userName eq "bob@globex.test"</code></td><td>0 results</td></tr>
                <tr><td>4–5</td><td><code>POST /scim/v2/Users</code> (core User schema)</td><td>201 + <code>id</code>; Bob exists before first login</td></tr>
                <tr><td>8–10</td><td><code>PATCH /scim/v2/Users/{id}</code> PatchOp replace <code>active=false</code></td><td>deactivated, sessions revoked</td></tr>
              </table>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'A login arrives with email matching an existing account but email_verified=false. Safe action?', options: ['Log them into the existing account', 'Do not auto-link; ask them to sign in with the existing method first', 'Delete the existing account', 'Ignore email_verified'], answer: 1, why: 'Unverified email is just a claim: auto-linking enables account takeover.' },
        { q: 'Which pair identifies a federated user stably?', options: ['email', 'name', '(iss, sub)', 'IP address'], answer: 2, why: 'sub is unique and stable within an issuer.' },
        { q: 'What does SCIM provide that JIT provisioning does not?', options: ['Password hashing', 'Push-based create/update/deactivate, including for users who never log in or who leave', 'Faster logins', 'Encryption'], answer: 1, why: 'SCIM lets the IdP manage the user lifecycle in the app.' },
        { q: 'In the federation chain, which issuer does the SaaS app validate tokens from?', options: ['The customer\'s AD', 'The customer\'s AD FS', 'Its own broker (e.g. Okta)', 'Google'], answer: 2, why: 'Each party trusts only its neighbour; the app only trusts its broker.' },
      ],
      exercise: {
        task: '<p>Apply the app\'s linking policy to each incoming login in the box below, then click <strong>Check</strong>.</p>',
        hint: 'Step 1 matches on the pair (iss, sub) only. Step 2 looks at email only when step 1 found nothing.',
        starter: W('<div id="ex"></div>', linkExercise),
        solution: W('<div id="ex"></div>', linkExercise, [], { solved: true }),
      },
    },
  );
})();
