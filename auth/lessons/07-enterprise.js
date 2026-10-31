window.LESSONS = window.LESSONS || [];
(function () {
  // Widget code is written as real functions and serialized with toString(), so it is
  // syntax-checked with the file and needs no template-literal escaping.
  const SEC = '7 · Directories: LDAP & Kerberos';
  const STYLE = `<style>
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; background: #fff; margin: 6px 0; }
.muted { color: #646b80; font-size: 13px; }
.ok { color: #15803d; font-weight: 600; }
.bad { color: #b91c1c; font-weight: 600; }
.mono { font: 12px/1.45 ui-monospace, Menlo, monospace; }
.row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; font-size: 12px; background: #eef1f6; }
textarea, input.wide { width: 100%; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace; }
button.on { background: #087ea4; color: #fff; border-color: #087ea4; }
.verdict { padding: 8px 12px; border-radius: 8px; font-weight: 600; margin-top: 6px; }
.verdict.ok { background: #dcfce7; } .verdict.bad { background: #fee2e2; }
table.t { border-collapse: collapse; width: 100%; font-size: 13px; }
table.t td, table.t th { border-bottom: 1px solid #eef0f5; padding: 4px 6px; text-align: left; vertical-align: top; }
pre.box { background: #0f1320; color: #d7dcea; padding: 9px 11px; border-radius: 8px; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; margin: 6px 0; max-height: 300px; overflow: auto; }
h4 { margin: 4px 0 6px; font-size: 14px; }
.node { cursor: pointer; padding: 2px 6px; border-radius: 6px; font: 12.5px/1.6 ui-monospace, Menlo, monospace; white-space: nowrap; }
.node:hover { background: #eef1f6; } .node.sel { background: #087ea4; color: #fff; }
tr.hit td { background: #dcfce7; } tr.miss td { color: #9aa1b3; }
</style>`;
  const CLOSE = '</' + 'script>';
  const W = (html, main, libs, vars) => STYLE + '\n' + html + '\n<script>\n' +
    'window.VARS = ' + JSON.stringify(vars || {}) + ';\n' +
    (libs || []).map((f) => f.toString()).join('\n\n') + '\n\n(' + main.toString() + ')();\n' + CLOSE;

  // ---------- shared libs (serialized into widgets) ----------
  function L() { return Array.prototype.slice.call(arguments).join('\n'); }

  function sha1(bytes) {
    const l = bytes.length, n = ((l + 9 + 63) >> 6) << 6, p = new Uint8Array(n);
    p.set(bytes); p[l] = 0x80;
    const dv = new DataView(p.buffer);
    dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor((l * 8) / 4294967296));
    let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
    const w = new Uint32Array(80), rl = (x, k) => (x << k) | (x >>> (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let t = 0; t < 16; t++) w[t] = dv.getUint32(o + t * 4);
      for (let t = 16; t < 80; t++) w[t] = rl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1);
      let a = h0, b = h1, c = h2, d = h3, e = h4;
      for (let t = 0; t < 80; t++) {
        let f, k;
        if (t < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
        else if (t < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
        else if (t < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
        else { f = b ^ c ^ d; k = 0xca62c1d6; }
        const tmp = (rl(a, 5) + f + e + k + w[t]) >>> 0;
        e = d; d = c; c = rl(b, 30) >>> 0; b = a; a = tmp;
      }
      h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0; h4 = (h4 + e) >>> 0;
    }
    const out = new Uint8Array(20), odv = new DataView(out.buffer);
    [h0, h1, h2, h3, h4].forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }

  // {SSHA} = base64( SHA1(password + salt) + salt ), as produced by OpenLDAP's slappasswd
  function ssha(pw, salt) {
    const p = new TextEncoder().encode(pw), m = new Uint8Array(p.length + salt.length);
    m.set(p); m.set(salt, p.length);
    const d = sha1(m), out = new Uint8Array(20 + salt.length);
    out.set(d); out.set(salt, 20);
    return '{SSHA}' + Auth.b64(out);
  }
  function sshaVerify(pw, stored) {
    const raw = atob(stored.replace('{SSHA}', ''));
    const bytes = Uint8Array.from(raw, (c) => c.charCodeAt(0));
    return ssha(pw, bytes.slice(20)) === stored;
  }

  // The demo directory: dc=acme,dc=com
  function dirData() {
    const B = 'dc=acme,dc=com';
    const PW = { admin: 'S3cure-Admin!', alice: 'Wonderland!1', bob: 'builder42', carol: 'Carol#2026', dave: 'sales4ever', erin: 'erin-temp-1', frank: 'frankly99' };
    const person = (uid, cn, sn, dept, extra) => {
      const salt = new TextEncoder().encode(uid.slice(0, 2) + '!' + uid.length);
      const a = { objectClass: ['top', 'person', 'organizationalPerson', 'inetOrgPerson'], uid: [uid], cn: [cn], sn: [sn], givenName: [cn.split(' ')[0]] };
      if (dept) a.departmentNumber = [dept];
      Object.assign(a, extra || {});
      a.userPassword = [ssha(PW[uid], salt)];
      return { dn: 'uid=' + uid + ',ou=people,' + B, attrs: a };
    };
    const G = (n) => 'cn=' + n + ',ou=groups,' + B;
    const E = [
      { dn: B, attrs: { objectClass: ['top', 'dcObject', 'organization'], dc: ['acme'], o: ['Acme Corp'] } },
      { dn: 'ou=people,' + B, attrs: { objectClass: ['top', 'organizationalUnit'], ou: ['people'], description: ['All human accounts'] } },
      { dn: 'ou=groups,' + B, attrs: { objectClass: ['top', 'organizationalUnit'], ou: ['groups'] } },
      { dn: 'ou=services,' + B, attrs: { objectClass: ['top', 'organizationalUnit'], ou: ['services'], description: ['Service (application) accounts'] } },
      person('admin', 'Directory Admin', 'Admin', null, { mail: ['admin@acme.com'], memberOf: [G('admins')] }),
      person('alice', 'Alice Doe', 'Doe', 'eng', { mail: ['alice@acme.com'], title: ['Staff Engineer'], uidNumber: ['10001'], memberOf: [G('engineering')] }),
      person('bob', 'Bob Builder', 'Builder', 'eng', { mail: ['bob@acme.com'], uidNumber: ['10002'], memberOf: [G('engineering')] }),
      person('carol', 'Carol Chen', 'Chen', 'ops', { mail: ['carol@acme.com'], uidNumber: ['10003'], memberOf: [G('admins'), G('ops')] }),
      person('dave', 'Dave Diaz', 'Diaz', 'sales', { mail: ['dave@acme.com'], uidNumber: ['10004'] }),
      person('erin', 'Erin Evans', 'Evans', 'eng', { mail: ['erin@partner.example'], employeeType: ['contractor'], uidNumber: ['10005'], memberOf: [G('engineering')] }),
      person('frank', 'Frank Fox', 'Fox', 'ops', { uidNumber: ['10006'], memberOf: [G('ops')] }),
      { dn: 'cn=svc-wiki,ou=services,' + B, attrs: { objectClass: ['top', 'organizationalRole', 'simpleSecurityObject'], cn: ['svc-wiki'], description: ['Wiki app: may search ou=people'], userPassword: [ssha('wiki-svc-pw', new TextEncoder().encode('sv!8'))] } },
      { dn: G('engineering'), attrs: { objectClass: ['top', 'groupOfNames'], cn: ['engineering'], member: ['uid=alice,ou=people,' + B, 'uid=bob,ou=people,' + B, 'uid=erin,ou=people,' + B] } },
      { dn: G('ops'), attrs: { objectClass: ['top', 'groupOfNames'], cn: ['ops'], member: ['uid=carol,ou=people,' + B, 'uid=frank,ou=people,' + B] } },
      { dn: G('admins'), attrs: { objectClass: ['top', 'groupOfNames'], cn: ['admins'], member: ['uid=admin,ou=people,' + B, 'uid=carol,ou=people,' + B] } },
    ];
    return { base: B, entries: E, passwords: PW };
  }

  // RFC 4515 string filter parser + evaluator (and, or, not, =, ~=, >=, <=, presence, substrings)
  function ldapLib() {
    function parse(str, lenient) {
      let i = 0;
      const s = str.trim();
      const err = (m) => { throw new Error(m + ' at position ' + i); };
      function filter() {
        if (s[i] !== '(') err('expected "("');
        i++;
        let node;
        const c = s[i];
        if (c === '&' || c === '|') {
          i++;
          const kids = [];
          while (s[i] === '(') kids.push(filter());
          if (!kids.length) err('"' + c + '" needs at least one filter');
          node = { op: c === '&' ? 'and' : 'or', kids: kids };
        } else if (c === '!') {
          i++;
          node = { op: 'not', kid: filter() };
        } else node = item();
        if (s[i] !== ')') err('expected ")"');
        i++;
        return node;
      }
      function item() {
        const m = /^([A-Za-z][A-Za-z0-9-]*|[0-9]+(?:\.[0-9]+)+)(;[A-Za-z0-9-]+)*/.exec(s.slice(i));
        if (!m) err('expected an attribute name');
        const attr = m[1];
        i += m[0].length;
        let type;
        if (s.startsWith('~=', i)) type = 'approx';
        else if (s.startsWith('>=', i)) type = 'ge';
        else if (s.startsWith('<=', i)) type = 'le';
        else if (s[i] === '=') type = 'eq';
        else err('expected "=", "~=", ">=" or "<="');
        i += type === 'eq' ? 1 : 2;
        const parts = [''];
        while (i < s.length && s[i] !== ')') {
          const ch = s[i];
          if (ch === '(') err('unescaped "(" in value (write \\28)');
          if (ch === '*') { if (type !== 'eq') err('"*" only allowed with "="'); parts.push(''); i++; continue; }
          if (ch === '\\') {
            const hx = s.slice(i + 1, i + 3);
            if (!/^[0-9A-Fa-f]{2}$/.test(hx)) err('bad escape (use \\XX hex)');
            parts[parts.length - 1] += String.fromCharCode(parseInt(hx, 16));
            i += 3;
            continue;
          }
          parts[parts.length - 1] += ch;
          i++;
        }
        if (parts.length === 1) return { op: type, attr: attr, value: parts[0] };
        if (parts.length === 2 && parts[0] === '' && parts[1] === '') return { op: 'present', attr: attr };
        return { op: 'substr', attr: attr, initial: parts[0], any: parts.slice(1, -1).filter((x) => x !== ''), final: parts[parts.length - 1] };
      }
      const s0 = s[0] === '(' ? s : '(' + s + ')';
      if (s0 !== s) return parse(s0, lenient);
      const node = filter();
      const rest = s.slice(i);
      if (rest && !lenient) err('unexpected text after the filter: "' + rest + '"');
      return { node: node, ignored: rest };
    }
    const vals = (e, a) => {
      const k = Object.keys(e.attrs).find((x) => x.toLowerCase() === a.toLowerCase());
      return k ? e.attrs[k] : [];
    };
    function test(n, e) {
      const lc = (x) => String(x).toLowerCase();
      switch (n.op) {
        case 'and': return n.kids.every((k) => test(k, e));
        case 'or': return n.kids.some((k) => test(k, e));
        case 'not': return !test(n.kid, e);
        case 'present': return n.attr.toLowerCase() === 'objectclass' || vals(e, n.attr).length > 0;
        case 'eq': return vals(e, n.attr).some((v) => lc(v) === lc(n.value));
        case 'approx': return vals(e, n.attr).some((v) => lc(v).replace(/\s/g, '') === lc(n.value).replace(/\s/g, ''));
        case 'ge': case 'le': return vals(e, n.attr).some((v) => {
          const a = isNaN(v) || isNaN(n.value) ? lc(v) : +v, b = isNaN(v) || isNaN(n.value) ? lc(n.value) : +n.value;
          return n.op === 'ge' ? a >= b : a <= b;
        });
        case 'substr': return vals(e, n.attr).some((v) => {
          v = lc(v);
          let p = 0;
          if (n.initial) { if (!v.startsWith(lc(n.initial))) return false; p = n.initial.length; }
          for (const a of n.any) { const j = v.indexOf(lc(a), p); if (j < 0) return false; p = j + a.length; }
          return !n.final || (v.length - p >= n.final.length && v.endsWith(lc(n.final)));
        });
      }
      return false;
    }
    function show(n, d) {
      const pad = '  '.repeat(d || 0);
      if (n.op === 'and' || n.op === 'or') return pad + (n.op === 'and' ? '& AND' : '| OR') + '\n' + n.kids.map((k) => show(k, (d || 0) + 1)).join('\n');
      if (n.op === 'not') return pad + '! NOT\n' + show(n.kid, (d || 0) + 1);
      if (n.op === 'present') return pad + n.attr + ' is present';
      if (n.op === 'substr') return pad + n.attr + ' matches ' + JSON.stringify((n.initial || '') + '*' + n.any.map((x) => x + '*').join('') + (n.final || ''));
      const sym = { eq: '=', approx: '≈', ge: '≥', le: '≤' }[n.op];
      return pad + n.attr + ' ' + sym + ' ' + JSON.stringify(n.value);
    }
    function escape(v) {
      return String(v).replace(/[\\*()\u0000]/g, (c) => '\\' + c.charCodeAt(0).toString(16).padStart(2, '0'));
    }
    function inScope(dn, base, scope) {
      const d = dn.toLowerCase(), b = base.toLowerCase();
      if (scope === 'base') return d === b;
      if (!d.endsWith(',' + b) && d !== b) return false;
      if (scope === 'one') return d !== b && d.slice(0, d.length - b.length - 1).indexOf(',') < 0;
      return true;
    }
    return { parse, test, show, escape, inScope };
  }

  // ======================================================================
  // Lesson 1: LDAP basics
  // ======================================================================
  function ditExplorer() {
    const D = dirData();
    const el = document.getElementById('dit');
    el.innerHTML = '<div class="grid2" style="grid-template-columns:2fr 3fr"><div class="card"><h4>Directory Information Tree</h4><div id="tree"></div></div>' +
      '<div class="card"><div class="row"><button id="v1" class="on">Entry</button><button id="v2">LDIF</button></div><div id="det"></div></div></div>';
    const depth = (dn) => dn.split(',').length - 2;
    const sorted = D.entries.slice().sort((a, b) => a.dn.split(',').reverse().join(',').localeCompare(b.dn.split(',').reverse().join(',')));
    let sel = D.entries.find((e) => e.dn.startsWith('uid=alice')), mode = 'entry';
    const ICON = (e) => e.attrs.objectClass.indexOf('inetOrgPerson') >= 0 ? '👤' : e.attrs.objectClass.indexOf('groupOfNames') >= 0 ? '👥' :
      e.attrs.objectClass.indexOf('organizationalUnit') >= 0 ? '📁' : e.attrs.objectClass.indexOf('organization') >= 0 ? '🏢' : '⚙️';
    function tree() {
      document.getElementById('tree').innerHTML = sorted.map((e) => '<div class="node' + (e === sel ? ' sel' : '') + '" data-dn="' + e.dn + '" style="padding-left:' + (6 + depth(e.dn) * 18) + 'px">' +
        ICON(e) + ' ' + e.dn.split(',')[0] + '</div>').join('');
      document.querySelectorAll('[data-dn]').forEach((n) => (n.onclick = () => { sel = D.entries.find((e) => e.dn === n.dataset.dn); render(); }));
    }
    function render() {
      tree();
      const e = sel, parts = e.dn.split(',');
      const det = document.getElementById('det');
      if (mode === 'ldif') {
        det.innerHTML = '<pre class="box">' + Seq.esc(['dn: ' + e.dn].concat(Object.keys(e.attrs).reduce((acc, k) => acc.concat(e.attrs[k].map((v) => k + ': ' + v)), [])).join('\n')) + '</pre>' +
          '<div class="muted">LDIF (RFC 2849) is the text format for entries: one <code>attribute: value</code> per line, multi-valued attributes repeat. <code>ldapadd -f file.ldif</code> imports it.</div>';
        return;
      }
      const pwHtml = e.attrs.userPassword ? '<div class="card" style="background:#f8fafc"><b>Test a password against userPassword</b><br>' +
        '<input id="pw" placeholder="type a password" style="width:60%"> <span id="pwr" class="muted"></span><div class="muted">Hint: alice\'s is <code>Wonderland!1</code>. ' +
        'The server does exactly this during a simple bind: decode base64, split off the salt, SHA-1(password + salt), compare.</div></div>' : '';
      det.innerHTML = '<table class="t"><tr><td><b>DN</b></td><td class="mono">' + e.dn + '</td></tr>' +
        '<tr><td><b>RDN</b></td><td class="mono">' + parts[0] + ' <span class="muted">(unique among its siblings)</span></td></tr>' +
        '<tr><td><b>Parent</b></td><td class="mono">' + (parts.length > 2 ? parts.slice(1).join(',') : '(root suffix)') + '</td></tr></table>' +
        '<h4 style="margin-top:8px">Attributes</h4><table class="t">' + Object.keys(e.attrs).map((k) => '<tr><td class="mono"><b>' + k + '</b>' +
          (k === 'memberOf' ? ' <span class="pill">operational*</span>' : '') + '</td><td class="mono">' + e.attrs[k].map(Seq.esc).join('<br>') + '</td></tr>').join('') + '</table>' +
        (e.attrs.memberOf ? '<div class="muted">*memberOf is computed by the server (OpenLDAP memberof overlay / AD back-link) from the groups\' <code>member</code> values. Ask for it explicitly in searches.</div>' : '') + pwHtml;
      const pw = document.getElementById('pw');
      if (pw) pw.oninput = () => {
        const ok = sshaVerify(pw.value, e.attrs.userPassword[0]);
        document.getElementById('pwr').innerHTML = pw.value ? (ok ? '<span class="ok">✓ matches</span>' : '<span class="bad">✗ no match</span>') : '';
      };
    }
    document.getElementById('v1').onclick = () => { mode = 'entry'; document.getElementById('v1').classList.add('on'); document.getElementById('v2').classList.remove('on'); render(); };
    document.getElementById('v2').onclick = () => { mode = 'ldif'; document.getElementById('v2').classList.add('on'); document.getElementById('v1').classList.remove('on'); render(); };
    render();
  }

  function dnExercise() {
    const Q = [
      ['q1', 'Full DN of Bob\'s entry', 'uid=bob,ou=people,dc=acme,dc=com'],
      ['q2', 'Full DN of the ops group', 'cn=ops,ou=groups,dc=acme,dc=com'],
      ['q3', 'RDN of the wiki service account', 'cn=svc-wiki'],
      ['q4', 'Parent DN of cn=admins,ou=groups,dc=acme,dc=com', 'ou=groups,dc=acme,dc=com'],
      ['q5', 'Search base that covers ALL user accounts but no groups', 'ou=people,dc=acme,dc=com'],
    ];
    const norm = (s) => s.trim().toLowerCase().replace(/\s*,\s*/g, ',').replace(/\s*=\s*/g, '=');
    const el = document.getElementById('ex');
    el.innerHTML = '<pre class="box">dc=acme,dc=com\n├─ ou=people     uid=admin, uid=alice, uid=bob, uid=carol, uid=dave, uid=erin, uid=frank\n├─ ou=groups     cn=engineering, cn=ops, cn=admins\n└─ ou=services   cn=svc-wiki</pre>' +
      Q.map((q) => '<div style="margin:4px 0">' + q[1] + '<br><input class="wide" data-q="' + q[0] + '" value="' + (VARS.solved ? q[2] : '') + '"></div>').join('') +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = Q.filter((q) => norm(el.querySelector('[data-q="' + q[0] + '"]').value) !== q[2]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? bad.map((q) => '✗ ' + q[1]).join('<br>') + '<br><span class="muted">A DN is read leaf-first: RDN, then each parent, up to dc=acme,dc=com.</span>' : '✅ All correct. You can read a DN like a reversed path: /com/acme/people/bob.';
    };
  }

  // ======================================================================
  // Lesson 2: Bind & search
  // ======================================================================
  function ldapOpsFlow() {
    const D = dirData(), X = ldapLib();
    const filter = '(&(objectClass=person)(departmentNumber=eng))';
    const ast = X.parse(filter).node;
    const hits = D.entries.filter((e) => X.inScope(e.dn, 'ou=people,dc=acme,dc=com', 'sub') && X.test(ast, e));
    const bindReq = (id, dn, pw) => L('LDAPMessage { messageID ' + id + ',', '  protocolOp bindRequest {', '    version 3,', '    name "' + dn + '",', '    authentication simple "' + pw + '" } }', '', '# BER on the wire: 30 .. 02 01 0' + id + ' 60 .. 02 01 03 04 .. "' + dn.slice(0, 12) + '…" 80 .. (password in clear: TLS required!)');
    const tls = [
      { from: 'c', to: 's', label: 'ExtendedRequest StartTLS', msg: L('LDAPMessage { messageID 1,', '  protocolOp extendedReq { requestName "1.3.6.1.4.1.1466.20037" } }', '', '# TCP connection to ldap.acme.com:389 (plain). Ask to upgrade to TLS.'), note: 'Port <b>389</b> starts in plaintext; <b>StartTLS</b> upgrades the same connection. Alternative: <b>LDAPS</b> on port <b>636</b> = TLS from the first byte.' },
      { from: 's', to: 'c', kind: 'res', label: 'ExtendedResponse success (0)', msg: L('LDAPMessage { messageID 1,', '  protocolOp extendedResp { resultCode success (0), matchedDN "", diagnosticMessage "" } }', '', '# → TLS handshake on the same socket; everything below is encrypted'), set: { c: { connection: 'TLS (StartTLS)' } } },
    ];
    Seq.mount('#flow', {
      title: 'LDAP operations: StartTLS → Bind → Search → Unbind',
      intro: 'LDAP is a binary protocol (ASN.1 BER over TCP), not HTTP. The inspector shows each message in RFC 4511 notation.',
      actors: [
        { id: 'c', label: 'Client (ldapsearch)', icon: '🖥', store: {}, storeLabel: 'Connection' },
        { id: 's', label: 'LDAP · ldap.acme.com', icon: '🗄', store: { suffix: 'dc=acme,dc=com' }, storeLabel: 'Server' },
      ],
      scenarios: [
        { name: '✅ Bind + search', steps: tls.concat([
          { from: 'c', to: 's', label: 'BindRequest (simple)', msg: bindReq(2, 'uid=alice,ou=people,dc=acme,dc=com', 'Wonderland!1'), hl: ['bindRequest', 'simple'], note: '<b>Bind</b> = log in to the directory. A simple bind sends a DN + password. The server checks it against <code>userPassword</code> ({SSHA} hash).' },
          { from: 's', to: 's', label: 'SSHA check ✓', msg: L('# stored: ' + D.entries.find((e) => e.dn.startsWith('uid=alice')).attrs.userPassword[0], '# SHA1("Wonderland!1" + salt) == stored digest  → true') },
          { from: 's', to: 'c', kind: 'res', label: 'BindResponse success (0)', msg: L('LDAPMessage { messageID 2,', '  protocolOp bindResponse { resultCode success (0), matchedDN "", diagnosticMessage "" } }'), set: { c: { bound_as: 'uid=alice,ou=people,dc=acme,dc=com' } } },
          { from: 'c', to: 's', label: 'SearchRequest base/scope/filter', msg: L('LDAPMessage { messageID 3,', '  protocolOp searchRequest {', '    baseObject   "ou=people,dc=acme,dc=com",', '    scope        wholeSubtree (2),', '    derefAliases neverDerefAliases (0),', '    sizeLimit 0, timeLimit 0, typesOnly FALSE,', '    filter       ' + filter + ',', '    attributes   [ "cn", "mail" ] } }'), hl: ['baseObject', 'scope', 'filter', 'attributes'], note: 'Where to start (<b>base</b>), how deep (<b>scope</b>: baseObject / singleLevel / wholeSubtree), which entries (<b>filter</b>), which attributes to return.' },
        ]).concat(hits.map((e, j) => ({ from: 's', to: 'c', kind: 'res', label: 'SearchResultEntry ' + e.dn.split(',')[0], msg: L('LDAPMessage { messageID 3,', '  protocolOp searchResEntry {', '    objectName "' + e.dn + '",', '    attributes { cn: "' + e.attrs.cn[0] + '", mail: "' + e.attrs.mail[0] + '" } } }'), note: j === 0 ? 'One message <b>per matching entry</b>, all with the same messageID as the request.' : '' }))).concat([
          { from: 's', to: 'c', kind: 'res', label: 'SearchResultDone success (0)', msg: L('LDAPMessage { messageID 3,', '  protocolOp searchResDone { resultCode success (0), matchedDN "", diagnosticMessage "" } }'), note: hits.length + ' entries, then a final <b>SearchResultDone</b>. (Zero matches is also <code>success</code>, just with no entries.)' },
          { from: 'c', to: 's', label: 'UnbindRequest', msg: L('LDAPMessage { messageID 4, protocolOp unbindRequest NULL }', '', '# "unbind" actually means: close the connection'), set: { c: { connection: null, bound_as: null } } },
        ]) },
        { name: '❌ Wrong password (49)', steps: tls.concat([
          { from: 'c', to: 's', label: 'BindRequest (simple)', msg: bindReq(2, 'uid=alice,ou=people,dc=acme,dc=com', 'wonderland') },
          { from: 's', to: 's', label: 'SSHA check ✗', kind: 'err' },
          { from: 's', to: 'c', kind: 'err', label: 'BindResponse invalidCredentials (49)', msg: L('LDAPMessage { messageID 2,', '  protocolOp bindResponse { resultCode invalidCredentials (49), matchedDN "", diagnosticMessage "" } }', '', '# Active Directory says the same, with extra detail:', '# 80090308: LdapErr: DSID-0C09056B, comment: AcceptSecurityContext error, data 52e, v4f7c', '#   data 52e = bad password, 775 = account locked, 532 = password expired'), hl: ['invalidCredentials (49)'], note: 'Same code for "no such user" and "wrong password", so attackers can\'t tell which.' },
        ]) },
        { name: '❌ Bad search base (32)', steps: tls.concat([
          { from: 'c', to: 's', label: 'SearchRequest base=ou=staff…', msg: L('LDAPMessage { messageID 2,', '  protocolOp searchRequest { baseObject "ou=staff,dc=acme,dc=com", scope wholeSubtree (2),', '    filter (uid=alice), attributes [ "dn" ] } }'), note: 'Anonymous search (no bind) with a base DN that does not exist.' },
          { from: 's', to: 'c', kind: 'err', label: 'SearchResultDone noSuchObject (32)', msg: L('LDAPMessage { messageID 2,', '  protocolOp searchResDone { resultCode noSuchObject (32), matchedDN "dc=acme,dc=com", diagnosticMessage "" } }'), hl: ['noSuchObject (32)', 'matchedDN'], note: '<code>matchedDN</code> = the deepest part of your base that does exist. Other common codes: <code>insufficientAccessRights (50)</code>, <code>sizeLimitExceeded (4)</code>, <code>unwillingToPerform (53)</code>.' },
        ]) },
      ],
    });
  }

  function filterLab() {
    const D = dirData(), X = ldapLib();
    const PRESETS = [
      '(&(objectClass=person)(|(departmentNumber=eng)(departmentNumber=ops)))',
      '(uid=alice)', '(cn=*o*)', '(mail=*@acme.com)', '(!(mail=*))', '(member=*)',
      '(&(objectClass=inetOrgPerson)(memberOf=cn=admins,ou=groups,dc=acme,dc=com))',
      '(uidNumber>=10004)', '(&(departmentNumber=eng)(!(employeeType=contractor)))', '(cn=Alice Doe',
    ];
    const el = document.getElementById('lab');
    el.innerHTML = '<div class="row"><b>Presets:</b>' + PRESETS.map((p, i) => '<button data-i="' + i + '" class="mono" style="font-size:11.5px">' + Seq.esc(p) + '</button>').join('') + '</div>' +
      '<div class="row" style="margin-top:4px"><span>base</span><select id="base"><option>dc=acme,dc=com</option><option>ou=people,dc=acme,dc=com</option><option>ou=groups,dc=acme,dc=com</option></select>' +
      '<span>scope</span><select id="scope"><option value="sub">wholeSubtree (sub)</option><option value="one">singleLevel (one)</option><option value="base">baseObject (base)</option></select></div>' +
      '<input class="wide" id="f" spellcheck="false" style="font-size:14px;padding:6px">' +
      '<div class="grid2" style="grid-template-columns:2fr 3fr"><div><h4>Parse tree</h4><pre class="box" id="tree"></pre></div><div><h4 id="cnt">Entries</h4><div id="res" style="max-height:330px;overflow:auto"></div></div></div>';
    const f = document.getElementById('f');
    function run() {
      const base = document.getElementById('base').value, scope = document.getElementById('scope').value;
      let ast = null, error = null;
      try { ast = X.parse(f.value).node; } catch (e) { error = e.message; }
      document.getElementById('tree').innerHTML = error ? '<span style="color:#fca5a5">✗ ' + Seq.esc(error) + '</span>\n\nThe server would answer: protocolError (2) / the client library refuses to send it.' : Seq.esc(X.show(ast));
      let n = 0;
      document.getElementById('res').innerHTML = '<table class="t">' + D.entries.map((e) => {
        const ins = X.inScope(e.dn, base, scope), hit = !error && ins && X.test(ast, e);
        if (hit) n++;
        return '<tr class="' + (hit ? 'hit' : 'miss') + '"><td>' + (hit ? '✅' : ins ? '·' : '<span title="outside base/scope">⊘</span>') + '</td><td class="mono">' + e.dn + '</td></tr>';
      }).join('') + '</table>';
      document.getElementById('cnt').textContent = error ? 'Entries (filter invalid)' : n + ' matching entr' + (n === 1 ? 'y' : 'ies') + '  (⊘ = outside base/scope)';
    }
    el.querySelectorAll('[data-i]').forEach((b) => (b.onclick = () => { f.value = PRESETS[+b.dataset.i]; run(); }));
    f.oninput = run;
    document.getElementById('base').onchange = run;
    document.getElementById('scope').onchange = run;
    f.value = PRESETS[0];
    run();
  }

  function filterExercise() {
    const D = dirData(), X = ldapLib();
    const GOAL = '(&(objectClass=person)(|(departmentNumber=eng)(departmentNumber=ops))(!(employeeType=contractor))(mail=*))';
    const want = D.entries.filter((e) => X.test(X.parse(GOAL).node, e)).map((e) => e.dn);
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card">Find every <b>person</b> who is in department <b>eng or ops</b>, is <b>not a contractor</b> (employeeType), and <b>has a mail</b> attribute. Searched from <code>dc=acme,dc=com</code>, subtree.</div>' +
      '<div class="muted">Attributes available: objectClass, uid, cn, sn, mail, departmentNumber, employeeType, memberOf, uidNumber</div>' +
      '<input class="wide" id="f" spellcheck="false" style="font-size:14px;padding:6px" value="' + Seq.esc(VARS.solved ? GOAL : '(objectClass=person)') + '">' +
      '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const r = document.getElementById('res');
      let got;
      try { const n = X.parse(document.getElementById('f').value).node; got = D.entries.filter((e) => X.test(n, e)).map((e) => e.dn); }
      catch (e) { r.className = 'verdict bad'; r.textContent = '❌ Syntax error: ' + e.message; return; }
      const extra = got.filter((d) => want.indexOf(d) < 0), miss = want.filter((d) => got.indexOf(d) < 0);
      r.className = 'verdict ' + (extra.length || miss.length ? 'bad' : 'ok');
      r.innerHTML = extra.length || miss.length ? '❌ Your filter matches ' + got.length + ' entries.' + (extra.length ? '<br>Should NOT match: ' + extra.map((d) => d.split(',')[0]).join(', ') : '') +
        (miss.length ? '<br>Missing: ' + miss.map((d) => d.split(',')[0]).join(', ') : '') : '✅ Exactly ' + want.map((d) => d.split(',')[0]).join(', ') + '. (erin is a contractor, frank has no mail, dave is in sales.)';
    };
  }

  // ======================================================================
  // Lesson 3: LDAP auth flow (search-then-bind) + injection
  // ======================================================================
  function searchBindFlow() {
    const SVC = 'cn=svc-wiki,ou=services,dc=acme,dc=com', ALICE = 'uid=alice,ou=people,dc=acme,dc=com';
    const bind = (id, dn, pw) => L('LDAPMessage { messageID ' + id + ',', '  protocolOp bindRequest { version 3, name "' + dn + '",', '    authentication simple "' + pw + '" } }');
    const res = (id, op, code) => L('LDAPMessage { messageID ' + id + ',', '  protocolOp ' + op + ' { resultCode ' + code + ', matchedDN "", diagnosticMessage "" } }');
    const search = (uid) => L('LDAPMessage { messageID 2,', '  protocolOp searchRequest {', '    baseObject "ou=people,dc=acme,dc=com", scope wholeSubtree (2),', '    sizeLimit 2,', '    filter (&(objectClass=inetOrgPerson)(uid=' + uid + ')),', '    attributes [ "cn", "memberOf" ] } }');
    const start = (u, p) => [
      { from: 'b', to: 'a', label: 'POST /login', msg: L('POST /login HTTP/1.1', 'Host: wiki.acme.com', 'Content-Type: application/x-www-form-urlencoded', '', 'username=' + u + '&password=' + encodeURIComponent(p)), note: 'Users type a short username like <code>' + (u || '(empty)') + '</code>, not a full DN. The app has to find the DN first.' },
      { from: 'a', to: 'l', label: 'Bind as service account', msg: bind(1, SVC, 'wiki-svc-pw'), note: '① The app binds with its own <b>service account</b>, which is allowed to search <code>ou=people</code>. (Over LDAPS/StartTLS, as in the previous lesson.)' },
      { from: 'l', to: 'a', kind: 'res', label: 'BindResponse success (0)', msg: res(1, 'bindResponse', 'success (0)'), set: { a: { ldap_conn: 'bound as svc-wiki' } } },
      { from: 'a', to: 'l', label: 'Search (uid=' + (u || '') + ')', msg: search(u), hl: ['(uid=' + u + ')'], note: '② Search for the user. <code>sizeLimit 2</code>: the app needs <b>exactly one</b> result; two would mean something is wrong.' },
    ];
    const found = [
      { from: 'l', to: 'a', kind: 'res', label: 'SearchResultEntry uid=alice', msg: L('LDAPMessage { messageID 2,', '  protocolOp searchResEntry { objectName "' + ALICE + '",', '    attributes { cn: "Alice Doe",', '                 memberOf: "cn=engineering,ou=groups,dc=acme,dc=com" } } }'), hl: [ALICE], set: { a: { user_dn: ALICE } } },
      { from: 'l', to: 'a', kind: 'res', label: 'SearchResultDone (1 entry)', msg: res(2, 'searchResDone', 'success (0)') },
    ];
    Seq.mount('#flow', {
      title: 'Search-then-bind: how apps check an LDAP password',
      actors: [
        { id: 'b', label: 'Browser', icon: '🌐', store: {}, storeLabel: 'Cookies' },
        { id: 'a', label: 'Wiki app', icon: '📚', store: { svc_dn: 'cn=svc-wiki,…' }, storeLabel: 'App state' },
        { id: 'l', label: 'LDAP · ldap.acme.com', icon: '🗄', store: {}, storeLabel: 'Server' },
      ],
      scenarios: [
        { name: '✅ Correct password', steps: start('alice', 'Wonderland!1').concat(found).concat([
          { from: 'a', to: 'l', label: 'Bind as uid=alice + typed password', msg: bind(3, ALICE, 'Wonderland!1'), hl: [ALICE], note: '③ Now bind <b>as the user</b> with the password they typed. The <b>server</b> checks the password; the app never reads or compares hashes.' },
          { from: 'l', to: 'a', kind: 'res', label: 'BindResponse success (0)', msg: res(3, 'bindResponse', 'success (0)'), set: { a: { ldap_conn: 'bound as alice' } } },
          { from: 'a', to: 'a', label: 'memberOf → roles', msg: L('# memberOf: cn=engineering,ou=groups,dc=acme,dc=com', '# app role mapping: engineering → editor, admins → admin', '# → alice is an editor'), note: '④ Authorization: map directory groups to app roles. Rebind as the service account (or use a fresh connection) before the next login.' },
          { from: 'a', to: 'b', kind: 'res', label: '302 / + session', msg: L('HTTP/1.1 302 Found', 'Location: /', 'Set-Cookie: wiki_sid=W_31; Secure; HttpOnly; SameSite=Lax'), set: { b: { wiki_sid: 'W_31' }, a: { W_31: 'alice (editor)', ldap_conn: 'bound as svc-wiki' } } },
        ]) },
        { name: '❌ Wrong password (49)', steps: start('alice', 'wonderland').concat(found).concat([
          { from: 'a', to: 'l', label: 'Bind as uid=alice + typed password', msg: bind(3, ALICE, 'wonderland') },
          { from: 'l', to: 'a', kind: 'err', label: 'BindResponse invalidCredentials (49)', msg: res(3, 'bindResponse', 'invalidCredentials (49)'), hl: ['invalidCredentials (49)'] },
          { from: 'a', to: 'b', kind: 'err', label: '401 "Invalid username or password"', msg: L('HTTP/1.1 401 Unauthorized', 'Content-Type: text/html', '', '<p>Invalid username or password.</p>'), note: 'Generic message. Count failures: the directory\'s lockout policy (e.g. 5 attempts) applies here too, so an attacker can lock users out by guessing.' },
        ]) },
        { name: '❌ Unknown user', steps: start('mallory', 'guess').concat([
          { from: 'l', to: 'a', kind: 'res', label: 'SearchResultDone (0 entries)', msg: res(2, 'searchResDone', 'success (0)') + '\n\n# no SearchResultEntry was sent', note: 'Zero entries is still <code>success</code>.' },
          { from: 'a', to: 'b', kind: 'err', label: '401 "Invalid username or password"', msg: L('HTTP/1.1 401 Unauthorized', '', '<p>Invalid username or password.</p>'), note: 'Same message and similar timing as a wrong password, so usernames can\'t be enumerated.' },
        ]) },
        { name: '🚨 Empty password = "unauthenticated bind"', steps: start('alice', '').concat(found).concat([
          { from: 'a', to: 'l', label: 'Bind as uid=alice + "" (empty)', msg: bind(3, ALICE, ''), hl: ['simple ""'], note: 'The user left the password box empty, and the app passed it straight to bind.' },
          { from: 'l', to: 'a', kind: 'err', badge: 'Pitfall', label: 'BindResponse success (0) ?!', msg: L(res(3, 'bindResponse', 'success (0)'), '', '# RFC 4513 §5.1.2: a simple bind with a DN and an EMPTY password is an', '# "unauthenticated bind". It means "anonymous, but log this name".', '# The connection is now ANONYMOUS, not alice. Yet resultCode = success.'), hl: ['success (0)'], note: 'RFC 4513 says servers SHOULD refuse these by default with <code>unwillingToPerform (53)</code>, but not every server or configuration does.' },
          { from: 'a', to: 'b', kind: 'err', badge: 'Logged in as alice!', label: '302 / + session for alice', msg: L('HTTP/1.1 302 Found', 'Set-Cookie: wiki_sid=W_66; Secure; HttpOnly'), set: { a: { W_66: 'alice (NO PASSWORD!)' }, b: { wiki_sid: 'W_66' } }, note: 'The app saw "success" and logged the visitor in as Alice. <b>Fix:</b> reject empty (and whitespace-only) passwords <i>before</i> calling bind, and configure the server to refuse unauthenticated binds.' },
        ]) },
      ],
    });
  }

  function injectionLab() {
    const D = dirData(), X = ldapLib();
    const TPL = {
      lookup: ['Search-then-bind lookup', '(&(objectClass=inetOrgPerson)(uid={U}))'],
      legacy: ['Legacy: password inside the filter', '(&(uid={U})(userPassword={P}))'],
    };
    const el = document.getElementById('inj');
    el.innerHTML = '<div class="row"><b>App builds its filter as:</b>' + Object.keys(TPL).map((k) => '<label><input type="radio" name="t" value="' + k + '"' + (k === 'legacy' ? ' checked' : '') + '> ' + TPL[k][0] + '</label>').join('') + '</div>' +
      '<div class="grid2"><div><div>Username</div><input class="wide" id="u" spellcheck="false"></div><div><div>Password</div><input class="wide" id="p" value="anything"></div></div>' +
      '<div class="row"><button id="pay">Load payload *)(uid=*))(|(uid=*</button><button id="norm">Normal: alice</button><button id="star">uid = a*</button>' +
      '<label><input type="checkbox" id="esc"> Escape input (RFC 4515)</label><label><input type="checkbox" id="len" checked> Client library ignores trailing text</label></div>' +
      '<div class="card"><div class="muted">Template</div><div class="mono" id="tpl"></div><div class="muted" style="margin-top:4px">Filter actually sent</div><div class="mono" id="flt" style="font-size:13.5px"></div></div>' +
      '<div class="grid2"><pre class="box" id="tree"></pre><div class="card" id="out"></div></div>';
    const $ = (id) => document.getElementById(id);
    function run() {
      const t = el.querySelector('[name=t]:checked').value, esc = $('esc').checked;
      const u = esc ? X.escape($('u').value) : $('u').value, p = esc ? X.escape($('p').value) : $('p').value;
      const f = TPL[t][1].replace('{U}', u).replace('{P}', p);
      $('tpl').textContent = TPL[t][1];
      $('flt').innerHTML = Seq.esc(f).replace(Seq.esc(u), '<mark>' + Seq.esc(u) + '</mark>');
      let r;
      try { r = X.parse(f, $('len').checked); } catch (e) {
        $('tree').textContent = '✗ ' + e.message;
        $('out').innerHTML = '<div class="verdict" style="background:#f1f5f9">Filter error → login fails. (Still useful to an attacker: errors reveal that input reaches the filter unescaped.)</div>';
        return;
      }
      $('tree').textContent = X.show(r.node) + (r.ignored ? '\n\n# ignored trailing text:\n' + r.ignored : '');
      const hits = D.entries.filter((e) => X.inScope(e.dn, 'ou=people,dc=acme,dc=com', 'sub') && X.test(r.node, e));
      let v;
      if (t === 'legacy') {
        v = hits.length ? '<div class="verdict bad">🚨 "Search returned a user → password must be right" → logged in as <b>' + hits[0].dn.split(',')[0] + '</b>' +
          (hits.length > 1 ? ' (first of ' + hits.length + ' entries)' : '') + '</div>' : '<div class="verdict" style="background:#f1f5f9">0 entries → "invalid username or password"</div>';
      } else {
        v = hits.length === 1 ? '<div class="verdict ok">1 entry: ' + hits[0].dn.split(',')[0] + ' → next: bind as that DN with the typed password (the server checks it).</div>' :
          hits.length ? '<div class="verdict bad">' + hits.length + ' entries match! A careful app refuses (expected exactly 1). A sloppy one binds as the first (' + hits[0].dn.split(',')[0] + ') and still needs that user\'s password; but varying the input (a*, b*…) lets an attacker <b>enumerate</b> users and attribute values.</div>' :
          '<div class="verdict" style="background:#f1f5f9">0 entries → generic login error</div>';
      }
      $('out').innerHTML = '<b>Matched in ou=people:</b> ' + (hits.map((e) => e.dn.split(',')[0]).join(', ') || 'none') + v;
    }
    $('pay').onclick = () => { $('u').value = '*)(uid=*))(|(uid=*'; run(); };
    $('norm').onclick = () => { $('u').value = 'alice'; run(); };
    $('star').onclick = () => { $('u').value = 'a*'; run(); };
    el.querySelectorAll('input').forEach((i) => (i.oninput = i.onchange = run));
    $('pay').click();
  }

  function escapeExercise() {
    const X = ldapLib();
    const Q = [['q1', '*'], ['q2', 'bob)(uid=*'], ['q3', 'ACME\\alice'], ['q4', '(admin)']];
    const el = document.getElementById('ex');
    el.innerHTML = '<div class="card">The app builds <code>(&amp;(objectClass=inetOrgPerson)(uid=<b>VALUE</b>))</code>. For each raw username, type the <b>escaped VALUE</b> that must be inserted, using RFC 4515 escapes: <code>*</code>→<code>\\2a</code>, <code>(</code>→<code>\\28</code>, <code>)</code>→<code>\\29</code>, <code>\\</code>→<code>\\5c</code>, NUL→<code>\\00</code>.</div>' +
      Q.map((q) => '<div class="row" style="margin:4px 0"><span class="mono" style="width:150px">' + Seq.esc(q[1]) + '</span> → <input class="mono" style="width:300px" data-q="' + q[0] + '" value="' +
        (VARS.solved ? Seq.esc(X.escape(q[1])) : '') + '"></div>').join('') + '<button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = Q.filter((q) => el.querySelector('[data-q="' + q[0] + '"]').value.trim().toLowerCase() !== X.escape(q[1]));
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? '❌ Check: ' + bad.map((q) => Seq.esc(q[1])).join(' , ') + '. Every special character becomes a backslash + 2 hex digits; normal letters stay as they are.'
        : '✅ Correct. In real code use your library\'s helper (e.g. ldap.filter.escape_filter_chars in Python, ldapjs filter objects) rather than hand-rolling.';
    };
  }

  // ======================================================================
  // Lesson 4: Kerberos
  // ======================================================================
  function kerberosFlow() {
    const R = 'ACME.COM';
    const t = new Date(), ts = (m) => new Date(t.getTime() + m * 60000).toISOString().replace(/\.\d+Z$/, 'Z');
    const k = (s) => Auth.sha256hex(s).slice(0, 16) + '…';
    const Kalice = k('ACME.COMalice' + 'Wonderland!1'), SK1 = Auth.randHex(8), SK2 = Auth.randHex(8);
    const asReqNoPa = L('AS-REQ (msg-type 10)', '  pvno 5', '  req-body:', '    cname    alice', '    realm    ' + R, '    sname    krbtgt/' + R, '    till     ' + ts(600), '    nonce    192837465', '    etype    [aes256-cts-hmac-sha1-96, aes128-cts-hmac-sha1-96]');
    const preauth = (skew) => L('AS-REQ (msg-type 10)', '  padata:', '    PA-ENC-TIMESTAMP  { patimestamp ' + ts(skew || 0) + ' }  encrypted with K_alice', '  req-body:', '    cname alice, realm ' + R + ', sname krbtgt/' + R + ', nonce 192837466, etype [aes256-cts-hmac-sha1-96]');
    const start = [
      { from: 'w', to: 'w', label: 'kinit alice → derive K_alice', msg: L('$ kinit alice@' + R, 'Password for alice@' + R + ': ••••••••••••', '', '# K_alice = string2key(password, salt="ACME.COMalice")', '#   real: PBKDF2-HMAC-SHA1 (4096 iterations) + AES key derivation', '#   demo stand-in: ' + Kalice), set: { w: { K_alice: 'derived (in memory)' } }, note: 'The password is turned into a key <b>on the workstation</b>. The password itself is never sent anywhere.' },
      { from: 'w', to: 'as', label: 'AS-REQ (no pre-auth)', msg: asReqNoPa, note: 'Clients first try without pre-authentication…' },
      { from: 'as', to: 'w', kind: 'err', label: 'KRB-ERROR PREAUTH_REQUIRED (25)', msg: L('KRB-ERROR (msg-type 30)', '  error-code  KDC_ERR_PREAUTH_REQUIRED (25)', '  e-data:', '    PA-ETYPE-INFO2 { etype aes256-cts-hmac-sha1-96, salt "ACME.COMalice" }', '    PA-ENC-TIMESTAMP'), note: '…and the KDC asks for proof of the password first. Without pre-auth, anyone could request an AS-REP for alice and crack it offline ("AS-REP roasting").' },
    ];
    const fsTicket = '{ client alice@' + R + ', session key SK2, authtime, endtime ' + ts(600) + ', PAC (SID + groups) }';
    Seq.mount('#flow', {
      title: 'Kerberos v5: AS exchange → TGS exchange → AP exchange',
      intro: 'Three exchanges. <b>AS</b> = Authentication Service, <b>TGS</b> = Ticket-Granting Service (both inside the KDC, on a Domain Controller in AD). Watch the workstation\'s <b>ticket cache</b>.',
      actors: [
        { id: 'w', label: 'Alice\'s workstation', icon: '💻', store: {}, storeLabel: 'Ticket cache (klist)' },
        { id: 'as', label: 'KDC: AS', icon: '🎫', store: { K_alice: 'from AD database', K_krbtgt: 'secret' }, storeLabel: 'AS knows' },
        { id: 'tgs', label: 'KDC: TGS', icon: '🎟', store: { K_krbtgt: 'secret', K_files: 'secret' }, storeLabel: 'TGS knows' },
        { id: 'fs', label: 'File server (cifs)', icon: '🗂', store: { K_files: 'keytab' }, storeLabel: 'Service knows' },
      ],
      scenarios: [
        { name: '✅ Full ticket flow', steps: start.concat([
          { from: 'w', to: 'as', label: 'AS-REQ + PA-ENC-TIMESTAMP', msg: preauth(0), hl: ['PA-ENC-TIMESTAMP'], note: 'Pre-auth: the current time, encrypted with K_alice. Only someone who knows the password can produce it.' },
          { from: 'as', to: 'as', label: 'decrypt timestamp with K_alice ✓', msg: L('# K_alice from the account database decrypts the timestamp', '# |now - patimestamp| ≤ 5 minutes (default max clock skew)  ✓') },
          { from: 'as', to: 'w', kind: 'res', label: 'AS-REP: TGT + {SK1}K_alice', msg: L('AS-REP (msg-type 11)', '  ticket (the TGT):', '    sname   krbtgt/' + R, '    enc-part encrypted with K_krbtgt:', '      { client alice@' + R + ', session key SK1=' + SK1 + '…, endtime ' + ts(600) + ', PAC }', '  enc-part encrypted with K_alice:', '    { session key SK1, nonce 192837466, endtime ' + ts(600) + ', sname krbtgt/' + R + ' }'), hl: ['K_krbtgt', 'K_alice'], note: 'Two locked boxes. The <b>TGT</b> is locked with the KDC\'s own key: Alice can\'t open or change it. The second box (with the same session key SK1) is locked with K_alice, so only she can open it.' },
          { from: 'w', to: 'w', label: 'open {SK1}K_alice, cache TGT', set: { w: { K_alice: null, 'krbtgt/ACME.COM': 'TGT (valid 10h)', SK1: SK1 + '…' } }, note: 'The workstation forgets the password-derived key. From now on, the TGT + SK1 prove who Alice is. Like a wristband at a theme park.' },
          { from: 'w', to: 'tgs', label: 'TGS-REQ for cifs/files.acme.com', msg: L('TGS-REQ (msg-type 12)', '  padata:', '    PA-TGS-REQ = AP-REQ { ticket: TGT (opaque to Alice),', '                          authenticator: { cname alice, ctime ' + ts(0) + ' } encrypted with SK1 }', '  req-body:', '    sname  cifs/files.acme.com    # the Service Principal Name (SPN)', '    realm  ' + R + ', nonce 55512, etype [aes256-cts-hmac-sha1-96]'), hl: ['cifs/files.acme.com', 'authenticator'], note: 'Alice opens <code>\\\\files.acme.com\\share</code>. She shows the TGT plus a fresh <b>authenticator</b> (timestamp encrypted with SK1) proving she holds SK1 right now.' },
          { from: 'tgs', to: 'tgs', label: 'open TGT with K_krbtgt → SK1 → check authenticator', msg: L('# decrypt TGT with K_krbtgt → client alice, SK1', '# decrypt authenticator with SK1 → cname alice, ctime within 5 min  ✓', '# look up SPN cifs/files.acme.com → account FILES$ → K_files') },
          { from: 'tgs', to: 'w', kind: 'res', label: 'TGS-REP: service ticket + {SK2}SK1', msg: L('TGS-REP (msg-type 13)', '  ticket (service ticket):', '    sname cifs/files.acme.com', '    enc-part encrypted with K_files:', '      ' + fsTicket, '  enc-part encrypted with SK1:', '    { session key SK2=' + SK2 + '…, nonce 55512, sname cifs/files.acme.com }'), hl: ['K_files', 'SK1'] },
          { from: 'w', to: 'w', label: 'cache service ticket', set: { w: { 'cifs/files.acme.com': 'service ticket (valid 10h)', SK2: SK2 + '…' } } },
          { from: 'w', to: 'fs', label: 'AP-REQ: ticket + authenticator', msg: L('AP-REQ (msg-type 14)   # carried inside SMB2 SESSION_SETUP (via SPNEGO)', '  ap-options  mutual-required', '  ticket      service ticket (encrypted with K_files)', '  authenticator { cname alice, ctime ' + ts(0) + ', cusec 482113 } encrypted with SK2'), note: 'The KDC is not contacted. The file server can verify everything with its own key.' },
          { from: 'fs', to: 'fs', label: 'open ticket with K_files → SK2 → check', msg: L('# decrypt ticket with K_files (from keytab / machine account) → alice, SK2, PAC', '# decrypt authenticator with SK2 → ctime within 5 min, not in replay cache  ✓', '# PAC → Alice\'s SID + group SIDs → NTFS permissions') },
          { from: 'fs', to: 'w', kind: 'res', label: 'AP-REP {ctime}SK2 (mutual auth)', msg: L('AP-REP (msg-type 15)', '  enc-part encrypted with SK2: { ctime ' + ts(0) + ', cusec 482113 }'), note: 'Mutual authentication: only the real file server could open the ticket and learn SK2, so Alice knows she is not talking to an impostor.' },
        ]) },
        { name: '❌ Wrong password (24)', steps: start.concat([
          { from: 'w', to: 'as', label: 'AS-REQ + PA-ENC-TIMESTAMP (wrong key)', msg: preauth(0).replace('K_alice', 'K_wrong (typo in password)') },
          { from: 'as', to: 'as', label: 'decrypt fails ✗', kind: 'err' },
          { from: 'as', to: 'w', kind: 'err', label: 'KRB-ERROR PREAUTH_FAILED (24)', msg: L('KRB-ERROR (msg-type 30)', '  error-code KDC_ERR_PREAUTH_FAILED (24)', '', '$ kinit: Password incorrect while getting initial credentials', '# AD: Event ID 4771 on the DC; counts toward account lockout') },
        ]) },
        { name: '⏰ Clock skew (37)', steps: start.concat([
          { from: 'w', to: 'as', label: 'AS-REQ, workstation clock +7 min', msg: preauth(7), hl: ['patimestamp'], note: 'The workstation\'s clock is 7 minutes fast.' },
          { from: 'as', to: 'as', label: '|now - timestamp| = 7 min > 5 min ✗', kind: 'err' },
          { from: 'as', to: 'w', kind: 'err', label: 'KRB-ERROR KRB_AP_ERR_SKEW (37)', msg: L('KRB-ERROR (msg-type 30)', '  error-code KRB_AP_ERR_SKEW (37)', '  stime  ' + ts(0) + '   # server time, so the client can see the difference', '', '$ kinit: Clock skew too great while getting initial credentials'), note: 'Timestamps (not challenges) stop replays, so clocks must agree within ±5 minutes by default. That is why AD domain members sync time from the DCs (NTP).' },
        ]) },
      ],
    });
  }

  function keyMatrix() {
    const BLOBS = [
      ['PA-ENC-TIMESTAMP', 'K_alice', 'current time', ['w', 'kdc'], 'Proves Alice knows her password without sending it.'],
      ['AS-REP enc-part', 'K_alice', 'SK1, nonce, endtime', ['w', 'kdc'], 'Delivers the TGS session key SK1 to Alice.'],
      ['TGT', 'K_krbtgt', 'alice, SK1, times, PAC (groups)', ['kdc'], 'Alice carries it but cannot read or forge it. Steal K_krbtgt → forge any TGT for anyone: a <b>Golden Ticket</b>.'],
      ['Authenticator #1', 'SK1', 'alice, timestamp', ['w', 'kdc'], 'Proves the TGT\'s holder knows SK1 right now (a stolen TGT alone isn\'t enough… unless SK1 is stolen too: pass-the-ticket).'],
      ['TGS-REP enc-part', 'SK1', 'SK2', ['w', 'kdc'], 'Delivers the service session key SK2.'],
      ['Service ticket', 'K_files', 'alice, SK2, times, PAC', ['kdc', 'fs'], 'Only the service can open it. If the service runs under a user account with a weak password, anyone can request this ticket and brute-force it offline: <b>Kerberoasting</b>.'],
      ['Authenticator #2', 'SK2', 'alice, timestamp', ['w', 'fs'], 'Freshness proof for the service.'],
      ['AP-REP', 'SK2', 'the client\'s timestamp', ['w', 'fs'], 'Mutual authentication: the server proves it could open the ticket.'],
    ];
    const WHO = [['w', '💻 Alice'], ['kdc', '🎫 KDC'], ['fs', '🗂 File server'], ['eve', '🕵 Eve (sniffs the network)']];
    const el = document.getElementById('km');
    el.innerHTML = '<div class="muted">Every Kerberos message is a locked box. Click a row to see who holds the key that opens it.</div>' +
      '<table class="t"><tr><th>Box</th><th>Locked with</th>' + WHO.map((w) => '<th>' + w[1] + '</th>').join('') + '</tr>' +
      BLOBS.map((b, i) => '<tr data-i="' + i + '" style="cursor:pointer"><td><b>' + b[0] + '</b></td><td class="mono">🔒 ' + b[1] + '</td>' +
        WHO.map((w) => '<td>' + (b[3].indexOf(w[0]) >= 0 ? '🔓' : '—') + '</td>').join('') + '</tr>').join('') + '</table><div class="card" id="kd"></div>' +
      '<div class="card muted">🎢 Analogy: the <b>TGT</b> is a theme-park wristband from the ticket office (AS). Each ride (service) needs its own ride ticket from the ticket booth (TGS); you show your wristband to get one. The ride operator checks the ride ticket without phoning the office.</div>';
    el.querySelectorAll('[data-i]').forEach((tr) => (tr.onclick = () => {
      const b = BLOBS[+tr.dataset.i];
      el.querySelectorAll('[data-i]').forEach((x) => (x.style.background = x === tr ? '#fff1a8' : ''));
      document.getElementById('kd').innerHTML = '<b>' + b[0] + '</b> = { ' + b[2] + ' } encrypted with <code>' + b[1] + '</code><br>' + b[4] +
        '<br><span class="muted">Eve can copy this box but cannot open it. She can only replay it, which the timestamps + replay cache prevent.</span>';
    }));
    el.querySelector('[data-i="2"]').click();
  }

  function krbOrderExercise() {
    const RIGHT = ['AS-REQ (no pre-auth)', 'KRB-ERROR KDC_ERR_PREAUTH_REQUIRED', 'AS-REQ with PA-ENC-TIMESTAMP', 'AS-REP (TGT + session key SK1)', 'TGS-REQ (TGT + authenticator, sname cifs/files.acme.com)', 'TGS-REP (service ticket + SK2)', 'AP-REQ to the file server', 'AP-REP (mutual authentication)'];
    const SHUF = [5, 2, 7, 0, 4, 1, 6, 3].map((i) => RIGHT[i]);
    let list = VARS.solved ? RIGHT.slice() : SHUF.slice();
    const el = document.getElementById('ex');
    function render() {
      el.innerHTML = '<div class="muted">Use ▲ ▼ to put the messages of a first-time file share access in order, then click Check.</div>' +
        list.map((m, i) => '<div class="row card" style="margin:3px 0;padding:5px 8px"><b style="width:22px">' + (i + 1) + '.</b><span class="mono" style="flex:1">' + m + '</span>' +
          '<button data-u="' + i + '"' + (i === 0 ? ' disabled' : '') + '>▲</button><button data-d="' + i + '"' + (i === list.length - 1 ? ' disabled' : '') + '>▼</button></div>').join('') +
        '<button id="chk">Check</button><div id="res"></div>';
      el.querySelectorAll('[data-u]').forEach((b) => (b.onclick = () => { const i = +b.dataset.u; [list[i - 1], list[i]] = [list[i], list[i - 1]]; render(); }));
      el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => { const i = +b.dataset.d; [list[i + 1], list[i]] = [list[i], list[i + 1]]; render(); }));
      document.getElementById('chk').onclick = () => {
        const wrong = list.map((m, i) => (m === RIGHT[i] ? null : i + 1)).filter(Boolean);
        const r = document.getElementById('res');
        r.className = 'verdict ' + (wrong.length ? 'bad' : 'ok');
        r.innerHTML = wrong.length ? '❌ Positions ' + wrong.join(', ') + ' are wrong. Remember: AS (get TGT) → TGS (trade TGT for a service ticket) → AP (show it to the service).' : '✅ Perfect: AS exchange, TGS exchange, AP exchange.';
      };
    }
    render();
  }

  // ======================================================================
  // Lesson 5: Active Directory, SPNEGO, Entra
  // ======================================================================
  function spnegoFlow() {
    const bytes = (arr, n) => { const r = new Uint8Array(arr.length + n); r.set(arr); r.set(crypto.getRandomValues(new Uint8Array(n)), arr.length); return r; };
    const neg = Auth.b64(bytes([0x60, 0x82, 0x07, 0x1e, 0x06, 0x06, 0x2b, 0x06, 0x01, 0x05, 0x05, 0x02, 0xa0, 0x82, 0x07, 0x12, 0x30, 0x82, 0x07, 0x0e, 0xa0, 0x30, 0x30, 0x2e, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x82, 0xf7, 0x12, 0x01, 0x02, 0x02], 75)) + '…';
    const negResp = Auth.b64(bytes([0xa1, 0x81, 0x9f, 0x30, 0x81, 0x9c, 0xa0, 0x03, 0x0a, 0x01, 0x00, 0xa1, 0x0b, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x82, 0xf7, 0x12, 0x01, 0x02, 0x02], 39)) + '…';
    const ntlm = (type, n) => Auth.b64(bytes([0x4e, 0x54, 0x4c, 0x4d, 0x53, 0x53, 0x50, 0x00, type, 0, 0, 0, 0x07, 0x82, 0x08, 0xa2], n));
    const actors = [
      { id: 'b', label: 'Domain-joined PC', icon: '💻', store: { 'krbtgt/ACME.COM': 'TGT (from Windows logon)' }, storeLabel: 'Ticket cache' },
      { id: 'w', label: 'intranet.acme.com', icon: '🖥', store: { keytab: 'HTTP/intranet.acme.com' }, storeLabel: 'Web server' },
      { id: 'k', label: 'DC (KDC)', icon: '🏛', store: {}, storeLabel: 'DC' },
    ];
    Seq.mount('#flow', {
      title: 'Integrated Windows Authentication over HTTP (Negotiate / SPNEGO)',
      scenarios: [
        { name: '✅ Kerberos via Negotiate', actors: actors, steps: [
          { from: 'b', to: 'w', label: 'GET /reports', msg: L('GET /reports HTTP/1.1', 'Host: intranet.acme.com') },
          { from: 'w', to: 'b', kind: 'err', label: '401 WWW-Authenticate: Negotiate', msg: L('HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Negotiate', 'WWW-Authenticate: NTLM', 'Content-Length: 0'), hl: ['WWW-Authenticate: Negotiate'], note: 'RFC 4559. <b>Negotiate</b> = SPNEGO: "let\'s pick Kerberos if we can, else NTLM". Same 401 challenge pattern as Basic auth (section 3).' },
          { from: 'b', to: 'b', label: 'site in Intranet zone? → need HTTP/intranet.acme.com', note: 'Browsers only do this automatically for trusted/intranet sites (Windows Intranet zone, or Chrome/Edge <code>AuthServerAllowlist</code> policy).' },
          { from: 'b', to: 'k', kind: 'back', label: 'TGS-REQ sname HTTP/intranet.acme.com', msg: L('TGS-REQ (msg-type 12)', '  padata PA-TGS-REQ { TGT from logon + authenticator {…}SK1 }', '  sname HTTP/intranet.acme.com     # SPN built from the URL\'s host name'), hl: ['HTTP/intranet.acme.com'], note: 'The Kerberos part from the previous lesson. Alice got her TGT when she logged into Windows; no prompt now.' },
          { from: 'k', to: 'b', kind: 'back', label: 'TGS-REP service ticket', msg: L('TGS-REP (msg-type 13)', '  ticket { alice, SK, PAC } encrypted with the key of the account owning HTTP/intranet.acme.com', '  enc-part { SK } encrypted with SK1'), set: { b: { 'HTTP/intranet.acme.com': 'service ticket' } } },
          { from: 'b', to: 'w', label: 'GET /reports + Authorization: Negotiate', msg: L('GET /reports HTTP/1.1', 'Host: intranet.acme.com', 'Authorization: Negotiate ' + neg, '', '# base64(SPNEGO NegTokenInit [ mech: Kerberos 1.2.840.48018.1.2.2, mechToken: AP-REQ ])', '# "YII…" = bytes 60 82 …: every SPNEGO token starts like this'), hl: ['Authorization: Negotiate'] },
          { from: 'w', to: 'w', label: 'decrypt AP-REQ with keytab → ACME\\alice', msg: L('# ticket decrypted with HTTP/intranet key → client alice@ACME.COM', '# PAC: SID S-1-5-21-…-1104, groups: Domain Users, Finance', '# → REMOTE_USER = ACME\\alice') },
          { from: 'w', to: 'b', kind: 'res', label: '200 OK + Negotiate (mutual)', msg: L('HTTP/1.1 200 OK', 'WWW-Authenticate: Negotiate ' + negResp, 'Content-Type: text/html', '', '<h1>Q3 reports for Alice</h1>', '', '# "oYG…" = SPNEGO NegTokenResp, negResult accept-completed, + AP-REP'), note: 'Alice never typed anything. That is "Windows SSO" on the intranet.' },
        ] },
        { name: '⚠ NTLM fallback (opened by IP)', actors: [actors[0], { id: 'w', label: '10.0.0.5 (IIS)', icon: '🖥', store: {}, storeLabel: 'Web server' }, actors[2]], steps: [
          { from: 'b', to: 'w', label: 'GET http://10.0.0.5/reports', msg: L('GET /reports HTTP/1.1', 'Host: 10.0.0.5'), note: 'Same server, but opened by IP. There is no SPN <code>HTTP/10.0.0.5</code>, so Kerberos can\'t be used and SPNEGO falls back to NTLM.' },
          { from: 'w', to: 'b', kind: 'err', label: '401 Negotiate, NTLM', msg: L('HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: Negotiate', 'WWW-Authenticate: NTLM') },
          { from: 'b', to: 'w', label: 'Authorization: NTLM (Type 1 NEGOTIATE)', msg: L('GET /reports HTTP/1.1', 'Host: 10.0.0.5', 'Authorization: NTLM ' + ntlm(1, 16), '', '# "TlRMTVNTUAAB" = base64("NTLMSSP\\0" + 01): NEGOTIATE_MESSAGE'), hl: ['TlRMTVNTUAAB'] },
          { from: 'w', to: 'b', kind: 'err', label: '401 NTLM (Type 2 CHALLENGE)', msg: L('HTTP/1.1 401 Unauthorized', 'WWW-Authenticate: NTLM ' + ntlm(2, 40), '', '# CHALLENGE_MESSAGE with an 8-byte random server challenge'), hl: ['TlRMTVNTUAAC'], note: 'Challenge-response. Connection-oriented: the next request must use the same TCP connection.' },
          { from: 'b', to: 'w', label: 'Authorization: NTLM (Type 3 AUTHENTICATE)', msg: L('GET /reports HTTP/1.1', 'Host: 10.0.0.5', 'Authorization: NTLM ' + ntlm(3, 90), '', '# NTLMv2 response = HMAC-MD5 over the challenge, keyed from the NT hash', '# NT hash = MD4(UTF-16LE(password)): a password-equivalent ("pass-the-hash")'), hl: ['TlRMTVNTUAAD'] },
          { from: 'w', to: 'k', kind: 'back', label: 'Netlogon: validate response', msg: L('NetrLogonSamLogonWithFlags (MS-NRPC)', '  user ACME\\alice, server challenge, NTLMv2 response'), note: 'The web server can\'t check the response itself: it asks a DC (pass-through authentication).' },
          { from: 'k', to: 'w', kind: 'back', label: 'OK + groups', msg: L('STATUS_SUCCESS', '  user SID S-1-5-21-…-1104, groups …') },
          { from: 'w', to: 'b', kind: 'res', label: '200 OK', msg: L('HTTP/1.1 200 OK', '', '<h1>Q3 reports for Alice</h1>'), note: 'Works, but NTLM has no mutual authentication and is open to relay attacks. Microsoft has deprecated it and is removing it from Windows step by step; fix SPNs and use Kerberos.' },
        ] },
      ],
    });
  }

  function entraFlow() {
    const TEN = '72f988bf-86f1-41af-91ab-2d7cd011db47';
    const now = Math.floor(Date.now() / 1000);
    const idt = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { iss: 'https://login.microsoftonline.com/' + TEN + '/v2.0', aud: 'expense-app', sub: 'AAAAAAAAAAAAAAAAAAAAAIkzqFVrSaSaFHy782bbtaQ', oid: '00000000-0000-0000-66f3-3332eca7ea81', tid: TEN, preferred_username: 'alice@acme.com', name: 'Alice Doe', iat: now, exp: now + 3600, nonce: 'n-7y' }, 'k');
    const common = [
      { from: 'b', to: 'a', label: 'GET expense.example.com', msg: L('GET / HTTP/1.1', 'Host: expense.example.com'), note: 'A SaaS expense app, configured for SSO with Acme\'s Entra ID tenant.' },
      { from: 'a', to: 'b', kind: 'redirect', label: '302 → Entra /authorize', msg: L('HTTP/1.1 302 Found', 'Location: https://login.microsoftonline.com/' + TEN + '/oauth2/v2.0/authorize?client_id=expense-app', '    &response_type=code&scope=openid%20profile%20email&redirect_uri=…&state=…&nonce=n-7y&code_challenge=…') },
    ];
    const finish = [
      { from: 'e', to: 'b', kind: 'redirect', label: '302 → app /callback?code', msg: L('HTTP/1.1 302 Found', 'Location: https://expense.example.com/callback?code=0.AXEA…&state=…') },
      { from: 'b', to: 'a', label: 'GET /callback → ID token from Entra', msg: L('GET /callback?code=0.AXEA…&state=… HTTP/1.1', 'Host: expense.example.com', '', '# app redeems the code at Entra\'s /token, gets:', JSON.stringify(Auth.jwtDecode(idt).payload, null, 2)), hl: ['"tid"', '"oid"'], set: { a: { session: 'alice@acme.com (tid ' + TEN.slice(0, 8) + '…)' } }, note: 'Use <code>tid</code> + <code>oid</code> (tenant + object id) as the user key in multi-tenant apps. The app speaks OIDC (or SAML) only. It never touches LDAP or Kerberos.' },
    ];
    Seq.mount('#flow', {
      title: 'From on-prem AD to cloud SSO with Microsoft Entra ID',
      scenarios: [
        { name: '☁ Password hash sync (cloud auth)', actors: [
          { id: 'b', label: 'Browser', icon: '🌐', store: {} },
          { id: 'a', label: 'SaaS app', icon: '🧾', store: {}, storeLabel: 'App' },
          { id: 'e', label: 'Microsoft Entra ID', icon: '☁', store: {}, storeLabel: 'Entra tenant' },
          { id: 'c', label: 'Entra Connect Sync', icon: '🔁', store: {}, storeLabel: 'Sync server' },
          { id: 'd', label: 'AD DS (on-prem DC)', icon: '🏛', store: { alice: 'CN=Alice Doe,OU=Staff,DC=acme,DC=com' }, storeLabel: 'Active Directory' },
        ], steps: [
          { from: 'c', to: 'd', kind: 'back', label: 'read changes (LDAP DirSync)', msg: L('LDAP SearchRequest with DirSync control (1.2.840.113556.1.4.841)', '  base DC=acme,DC=com, filter (objectClass=*), changes since last cookie'), note: 'Beforehand, and continuously: <b>Microsoft Entra Connect Sync</b> (or the lighter Cloud Sync agent) reads users and groups from AD…' },
          { from: 'd', to: 'c', kind: 'back', label: 'users, groups, password hashes', msg: L('alice: userPrincipalName alice@acme.com, objectGUID …, memberOf …', '# + MD4 NT hash via replication rights, which Connect re-hashes', '#   (salted PBKDF2-HMAC-SHA256) before upload'), set: { c: { last_sync: 'a few minutes ago' } } },
          { from: 'c', to: 'e', kind: 'back', label: 'sync to cloud (HTTPS)', msg: L('# alice@acme.com → Entra user (onPremisesSyncEnabled: true)', '# password hash sync: hash of hash, every ~2 minutes'), set: { e: { 'alice@acme.com': 'synced from AD, hash of hash' } }, note: 'With <b>Password Hash Sync (PHS)</b>, Entra can check passwords itself; logins keep working even if the on-prem network is down. Microsoft\'s recommended option.' },
        ].concat(common).concat([
          { from: 'b', to: 'e', label: 'GET /authorize → sign-in page', msg: L('GET /' + TEN + '/oauth2/v2.0/authorize?client_id=expense-app&… HTTP/1.1', 'Host: login.microsoftonline.com') },
          { from: 'e', to: 'e', label: 'verify password + MFA + Conditional Access', note: 'Entra verifies the password against the synced hash, enforces MFA and Conditional Access policies (device, location, risk). On a domain-joined PC, Seamless SSO / Primary Refresh Token can skip the prompt.' },
        ]).concat(finish) },
        { name: '🏢 Federated with AD FS', actors: [
          { id: 'b', label: 'Browser', icon: '🌐', store: {} },
          { id: 'a', label: 'SaaS app', icon: '🧾', store: {}, storeLabel: 'App' },
          { id: 'e', label: 'Microsoft Entra ID', icon: '☁', store: { 'acme.com': 'federated → sts.acme.com' }, storeLabel: 'Entra tenant' },
          { id: 'f', label: 'AD FS · sts.acme.com', icon: '🏢', store: {}, storeLabel: 'AD FS' },
          { id: 'd', label: 'AD DS (on-prem DC)', icon: '🏛', store: {}, storeLabel: 'Active Directory' },
        ], steps: common.concat([
          { from: 'b', to: 'e', label: 'GET /authorize (alice@acme.com)', msg: L('GET /' + TEN + '/oauth2/v2.0/authorize?client_id=expense-app&login_hint=alice%40acme.com&… HTTP/1.1', 'Host: login.microsoftonline.com'), note: 'The domain acme.com is <b>federated</b>: Entra does not check passwords for it.' },
          { from: 'e', to: 'b', kind: 'redirect', label: '302 → AD FS (WS-Federation)', msg: L('HTTP/1.1 302 Found', 'Location: https://sts.acme.com/adfs/ls/?wa=wsignin1.0&wtrealm=urn%3afederation%3aMicrosoftOnline', '    &wctx=…&username=alice%40acme.com'), hl: ['wa=wsignin1.0', 'wtrealm'] },
          { from: 'b', to: 'f', label: 'GET /adfs/ls/ + Negotiate', msg: L('GET /adfs/ls/?wa=wsignin1.0&wtrealm=urn%3afederation%3aMicrosoftOnline&… HTTP/1.1', 'Host: sts.acme.com', 'Authorization: Negotiate YIIH…   # Kerberos, as in the previous example'), note: 'Inside the corporate network, AD FS uses Integrated Windows Auth: no prompt. Outside, a form login checked with LDAP/Kerberos.' },
          { from: 'f', to: 'd', kind: 'back', label: 'validate ticket, read groups', msg: L('# Kerberos service ticket for HTTP/sts.acme.com validated', '# LDAP: memberOf, mail, objectGUID (→ ImmutableID claim)') },
          { from: 'f', to: 'b', kind: 'res', label: 'auto-POST SAML token → Entra', msg: L('HTTP/1.1 200 OK', 'Content-Type: text/html', '', '<form method="POST" action="https://login.microsoftonline.com/login.srf">', '  <input type="hidden" name="wa" value="wsignin1.0"/>', '  <input type="hidden" name="wresult" value="&lt;t:RequestSecurityTokenResponse …&gt;&lt;saml:Assertion …"/>', '</form>'), note: 'A signed SAML assertion wrapped in WS-Federation. Entra checks it with AD FS\'s token-signing certificate.' },
          { from: 'b', to: 'e', label: 'POST /login.srf', msg: L('POST /login.srf HTTP/1.1', 'Host: login.microsoftonline.com', '', 'wa=wsignin1.0&wresult=…&wctx=…') },
        ]).concat(finish) },
      ],
    });
  }

  function protoExercise() {
    const CASES = [
      ['1', 'Domain-joined laptop opens http://intranet.acme.com (SPN HTTP/intranet.acme.com exists)', 'krb'],
      ['2', 'The same laptop opens http://10.0.0.5/reports', 'ntlm'],
      ['3', 'Employee logs into a SaaS app (Salesforce) from home, using the company account', 'fed'],
      ['4', 'An old PHP wiki checks the username/password form against the directory', 'ldap'],
      ['5', 'A new hire must appear in the SaaS app before her first login, and be disabled the day she leaves', 'scim'],
      ['6', 'Alice presses Ctrl+Alt+Del and logs into Windows at the office: a TGT lands in her cache', 'krb'],
    ];
    const OPT = [['', '— choose —'], ['krb', 'Kerberos (incl. via SPNEGO)'], ['ntlm', 'NTLM'], ['ldap', 'LDAP bind'], ['fed', 'SAML / OIDC via Entra ID'], ['scim', 'SCIM provisioning']];
    const el = document.getElementById('ex');
    el.innerHTML = '<table class="t">' + CASES.map((c) => '<tr><td>' + c[0] + '</td><td>' + c[1] + '</td><td><select data-c="' + c[0] + '">' +
      OPT.map((o) => '<option value="' + o[0] + '"' + (VARS.solved && o[0] === c[2] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></td></tr>').join('') +
      '</table><button id="chk">Check</button><div id="res"></div>';
    document.getElementById('chk').onclick = () => {
      const bad = CASES.filter((c) => el.querySelector('[data-c="' + c[0] + '"]').value !== c[2]).map((c) => c[0]);
      const r = document.getElementById('res');
      r.className = 'verdict ' + (bad.length ? 'bad' : 'ok');
      r.innerHTML = bad.length ? '❌ Re-think row(s) ' + bad.join(', ') + '. Hints: no SPN for an IP address; SaaS apps speak federation protocols; provisioning is not login.'
        : '✅ All correct. One directory, five protocols, each for a different job.';
    };
  }

  // ======================================================================
  // Lesson objects
  // ======================================================================
  const LDAPSEARCH = `# Simple bind (-x) as the service account over StartTLS (-ZZ = fail if TLS can't start)
ldapsearch -H ldap://ldap.acme.com -x -ZZ \\
  -D "cn=svc-wiki,ou=services,dc=acme,dc=com" -W \\
  -b "ou=people,dc=acme,dc=com" -s sub \\
  "(&(objectClass=person)(departmentNumber=eng))" cn mail memberOf

# The same over LDAPS: TLS from the first byte, port 636
ldapsearch -H ldaps://ldap.acme.com:636 -x \\
  -D "cn=svc-wiki,ou=services,dc=acme,dc=com" -W \\
  -b "ou=people,dc=acme,dc=com" "(uid=alice)" dn

# Who am I bound as? (great for testing a password)
ldapwhoami -H ldaps://ldap.acme.com -x -D "uid=alice,ou=people,dc=acme,dc=com" -W

# --- output of the first command (LDIF) ---
# extended LDIF
#
# alice, people, acme.com
dn: uid=alice,ou=people,dc=acme,dc=com
cn: Alice Doe
mail: alice@acme.com
memberOf: cn=engineering,ou=groups,dc=acme,dc=com

# bob, people, acme.com
dn: uid=bob,ou=people,dc=acme,dc=com
cn: Bob Builder
mail: bob@acme.com
memberOf: cn=engineering,ou=groups,dc=acme,dc=com

# search result
search: 3
result: 0 Success`;

  window.LESSONS.push(
    {
      id: 'ldap-basics',
      section: SEC,
      title: 'LDAP: the directory tree',
      explain: `
        <p>Before "Sign in with Google" there was (and in most companies, still is) a <strong>directory</strong>: one central database of every employee, group, computer and printer. Apps ask it "does this password match?" and "which groups is Alice in?". The protocol for talking to it is <strong>LDAP</strong> (Lightweight Directory Access Protocol, v3, RFC 4510–4519). OpenLDAP and Microsoft Active Directory are the big implementations.</p>
        <h3>A tree, not tables</h3>
        <p>Entries form the <strong>Directory Information Tree (DIT)</strong>. Each entry's name is its path from leaf to root:</p>
        <pre><code>uid=alice,ou=people,dc=acme,dc=com
└─RDN──┘ └─────── parent DN ──────┘</code></pre>
        <ul>
          <li><strong>DN</strong> (Distinguished Name): the full, unique name, read <em>leaf first</em>.</li>
          <li><strong>RDN</strong> (Relative DN): the first part, unique among siblings (<code>uid=alice</code>).</li>
          <li><code>dc</code> = domain component (acme.com → <code>dc=acme,dc=com</code>), <code>ou</code> = organizational unit, <code>cn</code> = common name, <code>uid</code> = user id.</li>
        </ul>
        <h3>Entries = objectClasses + attributes</h3>
        <p>Each entry lists <code>objectClass</code> values (e.g. <code>inetOrgPerson</code>) that define which attributes it must/may have. Attributes can be multi-valued (two <code>mail</code> values, many <code>member</code> values).</p>
        <h3>LDAP vs SQL</h3>
        <table>
          <tr><th>SQL</th><th>LDAP</th></tr>
          <tr><td>table schema</td><td>objectClass (schema)</td></tr>
          <tr><td>row</td><td>entry</td></tr>
          <tr><td>primary key</td><td>DN</td></tr>
          <tr><td>column</td><td>attribute (multi-valued)</td></tr>
          <tr><td><code>SELECT … WHERE</code></td><td>search with base, scope and filter</td></tr>
          <tr><td>DB login</td><td>bind</td></tr>
        </table>
        <p>Directories are optimised for <em>many reads, few writes</em> and for replication across sites.</p>
        <h3>Passwords</h3>
        <p><code>userPassword</code> is stored hashed with a scheme prefix, e.g. <code>{SSHA}</code> = base64(SHA-1(password + salt) + salt). The demo computes it for real. SHA-1 is fast, so modern deployments prefer <code>{ARGON2}</code> or <code>{PBKDF2-SHA512}</code> modules. Active Directory keeps its own (NT hash, Kerberos keys) in <code>unicodePwd</code>, which can never be read over LDAP.</p>
        <div class="tip">Apps should never read <code>userPassword</code>. They let the <strong>server</strong> check the password with a bind (next lessons). Access control lists usually hide it.</div>
      `,
      examples: [{ title: 'Directory tree explorer', code: W('<div id="dit"></div>', ditExplorer, [L, sha1, ssha, sshaVerify, dirData]) }],
      quiz: [
        { q: 'In uid=bob,ou=people,dc=acme,dc=com, what is the RDN?', options: ['dc=com', 'uid=bob', 'ou=people,dc=acme,dc=com', 'acme.com'], answer: 1, why: 'The RDN is the leftmost component.' },
        { q: 'Which attribute defines what kind of entry it is and which attributes it may have?', options: ['cn', 'objectClass', 'dn', 'memberOf'], answer: 1, why: 'objectClass values link the entry to schema definitions.' },
        { q: 'How is dc=acme,dc=com related to the DNS name acme.com?', options: ['Unrelated', 'Each DNS label becomes a dc= component, leaf first', 'It is encrypted', 'It must be com,acme'], answer: 1, why: 'Domain components mirror DNS labels.' },
        { q: 'What does the {SSHA} prefix in userPassword tell the server?', options: ['The password is in clear text', 'The hash scheme: salted SHA-1, so it knows how to verify', 'It is an SSH key', 'The password expired'], answer: 1, why: 'The {SCHEME} prefix selects the verification algorithm.' },
      ],
      exercise: {
        task: '<p>Using the tree in the box below, type each DN / RDN and click <strong>Check</strong>.</p>',
        hint: 'Start with the RDN (uid=… or cn=…), then append the parent: ou=people / ou=groups / ou=services, then dc=acme,dc=com.',
        starter: W('<div id="ex"></div>', dnExercise),
        solution: W('<div id="ex"></div>', dnExercise, [], { solved: true }),
      },
    },
    {
      id: 'ldap-bind-search',
      section: SEC,
      title: 'Bind & search filters',
      explain: `
        <p>LDAP is a stateful, binary protocol over TCP. A client opens a connection, optionally <strong>binds</strong> (authenticates), sends <strong>searches</strong> and other operations, and finally <strong>unbinds</strong> (closes). Each message has a <code>messageID</code>; responses carry a <code>resultCode</code>.</p>
        <h3>Ports and TLS</h3>
        <ul>
          <li><strong>389</strong>: plain LDAP. Upgrade with the <strong>StartTLS</strong> extended operation (OID 1.3.6.1.4.1.1466.20037) before binding.</li>
          <li><strong>636</strong>: <strong>LDAPS</strong>, TLS from the first byte.</li>
          <li>A simple bind sends the password as-is. Without TLS anyone on the network can read it.</li>
        </ul>
        <h3>Bind types</h3>
        <ul>
          <li><strong>Simple</strong>: DN + password.</li>
          <li><strong>Anonymous</strong>: empty DN, empty password (often allowed to read public data).</li>
          <li><strong>SASL</strong>: pluggable mechanisms like GSSAPI (Kerberos) or EXTERNAL (client TLS certificate).</li>
        </ul>
        <h3>Search = base + scope + filter + attributes</h3>
        <pre><code>base   ou=people,dc=acme,dc=com
scope  baseObject (just the base) | singleLevel (direct children) | wholeSubtree (everything below)
filter (&amp;(objectClass=person)(|(departmentNumber=eng)(departmentNumber=ops)))
attrs  cn mail</code></pre>
        <p>Filters (RFC 4515) use <strong>prefix notation</strong> with parentheses around everything:</p>
        <table>
          <tr><th>Filter</th><th>Meaning</th></tr>
          <tr><td><code>(uid=alice)</code></td><td>equality (case-insensitive for most attributes)</td></tr>
          <tr><td><code>(mail=*)</code></td><td>attribute is present</td></tr>
          <tr><td><code>(cn=Al*)</code>, <code>(mail=*@acme.com)</code></td><td>substring</td></tr>
          <tr><td><code>(uidNumber&gt;=10004)</code></td><td>ordering</td></tr>
          <tr><td><code>(&amp;(a)(b))</code>, <code>(|(a)(b))</code>, <code>(!(a))</code></td><td>AND, OR, NOT</td></tr>
          <tr><td><code>\\2a \\28 \\29 \\5c</code></td><td>escaped <code>*</code> <code>(</code> <code>)</code> <code>\\</code> inside values</td></tr>
        </table>
        <h3>Result codes you will meet</h3>
        <p><code>0 success</code>, <code>32 noSuchObject</code>, <code>49 invalidCredentials</code>, <code>50 insufficientAccessRights</code>, <code>53 unwillingToPerform</code>, <code>4 sizeLimitExceeded</code>.</p>
      `,
      examples: [
        { title: 'LDAP messages, step by step', code: W('<div id="flow"></div>', ldapOpsFlow, [L, sha1, ssha, dirData, ldapLib]) },
        {
          title: 'Live filter evaluator (real RFC 4515 parser)',
          code: W('<div id="lab"></div>', filterLab, [L, sha1, ssha, dirData, ldapLib]),
          explain: `
            <details>
              <summary>How to read a filter</summary>
              <p>Prefix notation: the operator comes first, then its operands, each in parentheses. <code>(&amp;(objectClass=person)(|(departmentNumber=eng)(departmentNumber=ops)))</code> reads "AND( objectClass=person , OR( dept=eng , dept=ops ) )". The parse tree panel shows exactly this structure.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Click the first preset (5 matches), then change <code>ops</code> to <code>sales</code>.</li>
                <li>Set base to <code>ou=groups,…</code>: all people become ⊘ (out of scope). Then try <code>(member=*)</code>.</li>
                <li>Set scope to <code>singleLevel</code> with base <code>dc=acme,dc=com</code> and filter <code>(objectClass=*)</code>: only the three OUs match.</li>
                <li>Click the last preset <code>(cn=Alice Doe</code>: a missing parenthesis gives a parse error.</li>
                <li>Type <code>(cn=*\\2a*)</code>: it searches for a literal asterisk (none found).</li>
              </ul>
            </details>
          `,
        },
        { title: 'Doing it from a terminal: ldapsearch', runnable: false, lang: 'bash', code: LDAPSEARCH, note: 'OpenLDAP client tools. -x = simple bind, -D = bind DN, -W = prompt for password, -b = base, -s = scope.' },
      ],
      quiz: [
        { q: 'Which result code means a bind failed because of a wrong password?', options: ['0', '32', '49', '53'], answer: 2, why: '49 = invalidCredentials.' },
        { q: 'Which filter finds people in eng OR ops?', options: ['(departmentNumber=eng|ops)', '(|(departmentNumber=eng)(departmentNumber=ops))', '(departmentNumber=eng)(departmentNumber=ops)', '(OR departmentNumber eng ops)'], answer: 1, why: 'Prefix notation: | then each operand in parentheses.' },
        { q: 'You need TLS on port 389. What do you use?', options: ['LDAPS', 'StartTLS extended operation', 'SASL PLAIN', 'Nothing: 389 is encrypted'], answer: 1, why: 'StartTLS upgrades a plain 389 connection; LDAPS is port 636.' },
        { q: 'scope singleLevel with base ou=people returns…', options: ['only ou=people itself', 'the direct children of ou=people', 'everything in the directory', 'the parent dc=acme'], answer: 1, why: 'singleLevel = one level below the base, not the base itself.' },
        { q: 'A search matched zero entries. What resultCode is in SearchResultDone?', options: ['32 noSuchObject', '0 success', '49', '4'], answer: 1, why: 'Zero matches is still success. noSuchObject means the base DN does not exist.' },
      ],
      exercise: {
        task: '<p>Write an LDAP filter in the box below that matches exactly the right people, then click <strong>Check</strong>.</p>',
        hint: 'Combine four conditions with &: objectClass=person, an OR of the two departments, a NOT of employeeType=contractor, and mail=* (presence).',
        starter: W('<div id="ex"></div>', filterExercise, [L, sha1, ssha, dirData, ldapLib]),
        solution: W('<div id="ex"></div>', filterExercise, [L, sha1, ssha, dirData, ldapLib], { solved: true }),
      },
    },
    {
      id: 'ldap-auth-flow',
      section: SEC,
      title: 'Logging into an app with LDAP',
      explain: `
        <p>Many internal apps (wikis, Jenkins, Grafana, VPNs) have a login form whose password check is "ask LDAP". The standard pattern is <strong>search-then-bind</strong>:</p>
        <ol>
          <li>Bind as the app's <strong>service account</strong>.</li>
          <li>Search for the user by the typed username: <code>(&amp;(objectClass=inetOrgPerson)(uid=alice))</code>. Require <strong>exactly one</strong> result and take its DN.</li>
          <li>Bind <strong>as that DN</strong> with the typed password. <code>success (0)</code> = correct password; <code>49</code> = wrong.</li>
          <li>Read <code>memberOf</code> (or search groups) to decide roles.</li>
        </ol>
        <p>Why not bind directly? Users type <code>alice</code>, not <code>uid=alice,ou=people,dc=acme,dc=com</code>, and DNs differ across OUs. (AD also accepts <code>alice@acme.com</code> or <code>ACME\\alice</code> as bind names.)</p>
        <h3>Two classic pitfalls</h3>
        <div class="warn"><strong>LDAP injection.</strong> If the username is pasted into the filter unescaped, characters like <code>*</code> <code>(</code> <code>)</code> change the filter's meaning. Escape with RFC 4515 rules (<code>*</code>→<code>\\2a</code>, <code>(</code>→<code>\\28</code>, <code>)</code>→<code>\\29</code>, <code>\\</code>→<code>\\5c</code>, NUL→<code>\\00</code>) or use your library's filter builder.</div>
        <div class="warn"><strong>Empty password.</strong> A simple bind with a DN and an <em>empty</em> password is an "unauthenticated bind" (RFC 4513 §5.1.2). Some servers return <code>success</code> while treating the connection as anonymous. An app that only checks "bind succeeded" lets anyone in with a blank password. Reject empty passwords before binding.</div>
        <div class="tip">Even better for new apps: don't do LDAP in the app at all. Put the directory behind an IdP (Keycloak, Entra ID, Okta, AD FS) and speak OIDC/SAML. The app then never sees passwords.</div>
      `,
      examples: [
        {
          title: 'Search-then-bind, with failure cases',
          code: W('<div id="flow"></div>', searchBindFlow, [L]),
          explain: `
            <details>
              <summary>The problem: turning "alice" + a password into a verified identity</summary>
              <p>The app has only a username and password. It must find the right directory entry, let the <em>server</em> verify the password, and get groups, without ever reading password hashes.</p>
            </details>
            <details>
              <summary>Step by step (tab ✅)</summary>
              <table>
                <tr><th>Step</th><th>LDAP operation</th><th>Bound as</th></tr>
                <tr><td>2–3</td><td>BindRequest service DN → success (0)</td><td>svc-wiki</td></tr>
                <tr><td>4–6</td><td>SearchRequest <code>(uid=alice)</code> → 1 SearchResultEntry → SearchResultDone</td><td>svc-wiki</td></tr>
                <tr><td>7–8</td><td>BindRequest <code>uid=alice,…</code> + typed password → success (0)</td><td>alice</td></tr>
                <tr><td>9</td><td>memberOf engineering → role editor</td><td>-</td></tr>
                <tr><td>10</td><td>HTTP 302 + session cookie</td><td>back to svc-wiki</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>Wrong password and unknown user produce the same HTTP response (tabs 2 and 3).</li>
                <li>Tab 4: <code>success (0)</code> doesn't always mean "authenticated". With an empty password the connection is anonymous.</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <p>Open tab 🚨 and watch the App state card: a session for "alice (NO PASSWORD!)" appears at the last step. Then compare step 8 of tab ✅ and step 8 of tab 🚨: identical result codes, very different meaning.</p>
            </details>
          `,
        },
        {
          title: 'LDAP injection lab',
          code: W('<div id="inj"></div>', injectionLab, [L, sha1, ssha, dirData, ldapLib]),
          explain: `
            <details>
              <summary>The problem: user input becomes filter syntax</summary>
              <p>Template <code>(&amp;(uid={U})(userPassword={P}))</code> with username <code>*)(uid=*))(|(uid=*</code> becomes:</p>
              <pre><code>(&amp;(uid=*)(uid=*))(|(uid=*)(userPassword=anything))
└──── complete filter ────┘└──── leftover text ──────────┘</code></pre>
              <p>The first complete filter means "any entry that has a uid". Libraries that stop at the first complete filter ignore the rest, so the password test vanished.</p>
            </details>
            <details>
              <summary>Step by step: what the lab shows</summary>
              <table>
                <tr><th>Setting</th><th>Result</th></tr>
                <tr><td>Legacy template + payload, lenient parsing</td><td>🚨 logged in as uid=admin (first of 7 entries)</td></tr>
                <tr><td>Untick "ignores trailing text"</td><td>parse error → login fails, but the error still tells the attacker the input is injectable</td></tr>
                <tr><td>Search-then-bind template + payload</td><td>7 entries; a careful app refuses, a sloppy one binds as the first user and still needs a password</td></tr>
                <tr><td>Tick "Escape input"</td><td><code>\\2a\\29\\28uid=\\2a…</code>: a literal username, 0 matches</td></tr>
              </table>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Click <strong>uid = a*</strong> with the search-then-bind template: 2 matches (admin, alice). Now an attacker can probe <code>al*</code>, <code>ali*</code>… to discover usernames.</li>
                <li>Tick <strong>Escape input</strong> and click the payload button again.</li>
              </ul>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'Why does the app bind as a service account first?', options: ['To read the user\'s password hash', 'To search for the user\'s DN (and attributes) from the typed username', 'Because users cannot bind', 'To encrypt the connection'], answer: 1, why: 'Anonymous search is often disabled; the service account may search to find the DN.' },
        { q: 'Who checks the user\'s password in search-then-bind?', options: ['The app compares hashes', 'The LDAP server, during the user\'s bind', 'The browser', 'Nobody'], answer: 1, why: 'The app binds as the user; the server verifies.' },
        { q: 'A user submits an empty password and the bind returns success (0). What happened?', options: ['The password is really empty', 'An unauthenticated bind: the session is anonymous, not the user', 'A server bug that never happens', 'TLS failed'], answer: 1, why: 'RFC 4513 unauthenticated bind. Reject empty passwords before binding.' },
        { q: 'How should the username "bob)(uid=*" be inserted into a filter?', options: ['As is', 'bob\\29\\28uid=\\2a', 'URL-encoded', 'base64'], answer: 1, why: 'RFC 4515 escaping: ) → \\29, ( → \\28, * → \\2a.' },
      ],
      exercise: {
        task: '<p>Escape each raw username for use inside an LDAP filter. Type the escaped values in the box below and click <strong>Check</strong>.</p>',
        hint: 'Only * ( ) \\ and NUL change. Each becomes \\ + two hex digits: * = 2a, ( = 28, ) = 29, \\ = 5c.',
        starter: W('<div id="ex"></div>', escapeExercise, [ldapLib]),
        solution: W('<div id="ex"></div>', escapeExercise, [ldapLib], { solved: true }),
      },
    },
    {
      id: 'kerberos',
      section: SEC,
      title: 'Kerberos: tickets instead of passwords',
      explain: `
        <p>LDAP binds send a password to every app. <strong>Kerberos v5</strong> (MIT, RFC 4120) avoids that: you prove your password <em>once</em> to a trusted server, the <strong>KDC</strong> (Key Distribution Center), and from then on you carry <strong>tickets</strong>. It is the default authentication of every Windows domain.</p>
        <div class="tip">🎢 Theme park analogy. At the entrance office (<strong>AS</strong>) you show your ID once and get a <strong>wristband</strong> (TGT) for the day. For each ride you visit the ticket booth (<strong>TGS</strong>), show the wristband, and get a ride ticket (<strong>service ticket</strong>). The ride operator (the <strong>service</strong>) checks the ride ticket without calling the office.</div>
        <h3>Words</h3>
        <ul>
          <li><strong>Principal</strong>: a named identity: <code>alice@ACME.COM</code>, or a service <code>cifs/files.acme.com@ACME.COM</code>. The service name is a <strong>SPN</strong> (Service Principal Name).</li>
          <li><strong>Realm</strong>: the Kerberos domain, by convention the DNS domain in capitals (<code>ACME.COM</code>).</li>
          <li><strong>Long-term keys</strong>: derived from passwords (users) or random (services, and <code>krbtgt</code>, the KDC's own account). The KDC knows them all.</li>
          <li><strong>Session keys</strong>: short-lived random keys the KDC hands out inside tickets (SK1, SK2).</li>
        </ul>
        <h3>Three exchanges</h3>
        <ol>
          <li><strong>AS-REQ / AS-REP</strong>: "I am alice" (+ pre-auth: timestamp encrypted with her key) → TGT + SK1.</li>
          <li><strong>TGS-REQ / TGS-REP</strong>: TGT + authenticator → service ticket for an SPN + SK2.</li>
          <li><strong>AP-REQ / AP-REP</strong>: service ticket + authenticator → service; optional reply proves the service is genuine (mutual authentication).</li>
        </ol>
        <p>Tickets carry timestamps, so clocks must agree: default max skew <strong>5 minutes</strong> (error <code>KRB_AP_ERR_SKEW</code>, 37).</p>
        <pre><code class="language-bash">$ kinit alice@ACME.COM
Password for alice@ACME.COM:
$ klist
Ticket cache: FILE:/tmp/krb5cc_1000
Default principal: alice@ACME.COM

Valid starting       Expires              Service principal
10/31/2026 09:00:12  10/31/2026 19:00:12  krbtgt/ACME.COM@ACME.COM
10/31/2026 09:03:40  10/31/2026 19:00:12  cifs/files.acme.com@ACME.COM</code></pre>
        <div class="warn">Attacks to know by name: <strong>Kerberoasting</strong> (request service tickets for SPNs of user accounts with weak passwords and crack them offline: use long random/managed service account passwords), <strong>AS-REP roasting</strong> (accounts with pre-auth disabled), <strong>Golden Ticket</strong> (stolen <code>krbtgt</code> key → forge any TGT; rotate krbtgt twice after a compromise), <strong>pass-the-ticket</strong> (stolen tickets + session keys from memory).</div>
      `,
      examples: [
        {
          title: 'Kerberos exchanges, with the ticket cache',
          code: W('<div id="flow"></div>', kerberosFlow, [L]),
          explain: `
            <details>
              <summary>The problem: proving who you are to many services without sending your password to any of them</summary>
              <p>With LDAP or Basic auth, every app sees your password, and a malicious app can steal it. Kerberos uses only <em>encrypted proofs</em>. The password-derived key is used once (to get the TGT) and then forgotten.</p>
            </details>
            <details>
              <summary>Step by step (tab ✅)</summary>
              <table>
                <tr><th>Step</th><th>Message</th><th>Locked with</th><th>Ticket cache after</th></tr>
                <tr><td>1</td><td>kinit derives K_alice</td><td>-</td><td>K_alice (memory)</td></tr>
                <tr><td>2–3</td><td>AS-REQ → KRB-ERROR PREAUTH_REQUIRED (25)</td><td>-</td><td>same</td></tr>
                <tr><td>4–5</td><td>AS-REQ + PA-ENC-TIMESTAMP</td><td>K_alice</td><td>same</td></tr>
                <tr><td>6–7</td><td>AS-REP: TGT + {SK1}</td><td>TGT: K_krbtgt · SK1: K_alice</td><td>TGT, SK1 (K_alice forgotten)</td></tr>
                <tr><td>8–10</td><td>TGS-REQ (sname cifs/files.acme.com) → TGS-REP</td><td>authenticator: SK1 · ticket: K_files · SK2: SK1</td><td>+ service ticket, SK2</td></tr>
                <tr><td>12–14</td><td>AP-REQ → service verifies → AP-REP</td><td>ticket: K_files · authenticator + AP-REP: SK2</td><td>unchanged</td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas</summary>
              <ul>
                <li>The client carries tickets it <em>cannot read</em> (TGT locked with K_krbtgt, service ticket with K_files).</li>
                <li>Session keys travel inside both a ticket (for the server) and a box the client can open. That is how two parties who never met end up sharing a key.</li>
                <li>Authenticators are fresh timestamps: stolen tickets can't simply be replayed later.</li>
              </ul>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Watch the 💻 Ticket cache card from step 6 to step 11: <code>K_alice</code> disappears, the TGT and then the service ticket appear.</li>
                <li>Open the ⏰ Clock skew tab: the only change is a timestamp 7 minutes off, and the KDC refuses.</li>
              </ul>
            </details>
          `,
        },
        { title: 'Who can open which box? (keys & attacks)', code: W('<div id="km"></div>', keyMatrix) },
      ],
      quiz: [
        { q: 'What does the TGT let Alice do?', options: ['Read files directly', 'Request service tickets from the TGS without re-entering her password', 'Change her password', 'Decrypt other users\' tickets'], answer: 1, why: 'The TGT is the "wristband" used at the TGS.' },
        { q: 'Which key encrypts a service ticket for cifs/files.acme.com?', options: ['Alice\'s key', 'The krbtgt key', 'The file server\'s long-term key', 'No key'], answer: 2, why: 'Only the service (and the KDC) can open its tickets.' },
        { q: 'kinit fails with "Clock skew too great". Why?', options: ['Wrong password', 'The client and KDC clocks differ by more than the allowed skew (5 min by default)', 'DNS is down', 'The ticket expired yesterday'], answer: 1, why: 'Kerberos relies on timestamps; KRB_AP_ERR_SKEW (37).' },
        { q: 'Why is an attacker who steals the krbtgt key so dangerous?', options: ['They can read email', 'They can forge TGTs for any user (Golden Ticket)', 'They can only crash the KDC', 'They can change DNS'], answer: 1, why: 'All TGTs are encrypted with krbtgt; with the key you can mint your own.' },
        { q: 'Kerberoasting targets…', options: ['The krbtgt account', 'Service accounts with SPNs and weak passwords, by cracking their service tickets offline', 'Browser cookies', 'LDAP filters'], answer: 1, why: 'Any user can request a service ticket; it is encrypted with the service account\'s password-derived key.' },
      ],
      exercise: {
        task: '<p>Put the Kerberos messages of a first-time file share access in order using the ▲ ▼ buttons in the box below, then click <strong>Check</strong>.</p>',
        hint: 'Three exchanges: AS (two attempts, because of pre-auth), TGS, AP. Each exchange is request then reply.',
        starter: W('<div id="ex"></div>', krbOrderExercise),
        solution: W('<div id="ex"></div>', krbOrderExercise, [], { solved: true }),
      },
    },
    {
      id: 'active-directory',
      section: SEC,
      title: 'Active Directory, SPNEGO & bridging to the cloud',
      explain: `
        <p><strong>Active Directory Domain Services (AD DS)</strong> is Microsoft's directory, and almost every company with Windows PCs runs it. It is not one protocol but a bundle running on <strong>Domain Controllers</strong>:</p>
        <table>
          <tr><th>Piece</th><th>Job</th><th>Port</th></tr>
          <tr><td>LDAP</td><td>the directory: users, groups, computers (<code>sAMAccountName</code>, <code>userPrincipalName</code>, <code>memberOf</code>, <code>objectSid</code>)</td><td>389 / 636, Global Catalog 3268 / 3269</td></tr>
          <tr><td>Kerberos KDC</td><td>authentication for logons, file shares, intranet sites</td><td>88</td></tr>
          <tr><td>DNS</td><td>clients find DCs via SRV records like <code>_ldap._tcp.dc._msdcs.acme.com</code>, <code>_kerberos._tcp.acme.com</code></td><td>53</td></tr>
          <tr><td>Group Policy</td><td>pushes settings and security policies to domain-joined PCs (via SYSVOL over SMB)</td><td>445</td></tr>
          <tr><td>NTLM (legacy)</td><td>challenge-response fallback when Kerberos can't be used</td><td>(inside other protocols)</td></tr>
        </table>
        <h3>Integrated Windows Authentication (IWA) on the web</h3>
        <p>Intranet sites use HTTP <strong>Negotiate</strong> (RFC 4559): the server answers <code>401</code> with <code>WWW-Authenticate: Negotiate</code>, the browser gets a Kerberos service ticket for <code>HTTP/host</code> and sends it base64-encoded in <code>Authorization: Negotiate YII…</code>. The token format is <strong>SPNEGO</strong>, which can wrap Kerberos or, as a fallback, NTLM.</p>
        <div class="warn">NTLM has no mutual authentication, is vulnerable to relay and pass-the-hash attacks, and Microsoft has deprecated it (NTLMv1 is already removed in Windows 11 24H2 / Server 2025). The usual cause of NTLM fallback is a missing SPN, or opening a site by IP address.</div>
        <h3>Bridging AD to the cloud: Microsoft Entra ID</h3>
        <p><strong>Microsoft Entra ID</strong> (formerly Azure AD) is <em>not</em> AD in the cloud. It speaks OIDC, OAuth 2, SAML and SCIM, not LDAP or Kerberos to apps. Companies connect the two:</p>
        <ul>
          <li><strong>Microsoft Entra Connect Sync</strong> (or <strong>Entra Cloud Sync</strong>) copies users and groups from AD to Entra.</li>
          <li>Passwords are then checked by one of: <strong>Password Hash Sync</strong> (a hash of the hash is synced; recommended), <strong>Pass-through Authentication</strong> (a small on-prem agent checks against AD), or <strong>federation</strong> with AD FS (Entra redirects to on-prem AD FS, which uses Kerberos/LDAP). Microsoft recommends moving from AD FS to cloud authentication.</li>
          <li>SaaS apps then integrate only with Entra, using OIDC or SAML (section 6).</li>
        </ul>
      `,
      examples: [
        {
          title: 'HTTP Negotiate: Kerberos and NTLM fallback',
          code: W('<div id="flow"></div>', spnegoFlow, [L]),
          explain: `
            <details>
              <summary>Step by step (tab ✅)</summary>
              <table>
                <tr><th>Step</th><th>HTTP / Kerberos</th><th>Key header</th></tr>
                <tr><td>1–2</td><td>GET → 401</td><td><code>WWW-Authenticate: Negotiate</code></td></tr>
                <tr><td>3–5</td><td>browser asks the KDC for <code>HTTP/intranet.acme.com</code></td><td>TGS-REQ / TGS-REP (TGT from Windows logon)</td></tr>
                <tr><td>6</td><td>GET again with the ticket</td><td><code>Authorization: Negotiate YII…</code> (SPNEGO + AP-REQ)</td></tr>
                <tr><td>7–8</td><td>server decrypts with its keytab, 200</td><td><code>WWW-Authenticate: Negotiate oYG…</code> (mutual)</td></tr>
              </table>
            </details>
            <details>
              <summary>Try this</summary>
              <p>Switch to the NTLM tab and compare base64 prefixes: <code>TlRMTVNTUAAB</code> / <code>…AC</code> / <code>…AD</code> are literally base64 of <code>NTLMSSP\\0</code> followed by message type 1, 2, 3. Note the extra Netlogon round-trip to the DC at step 6: the web server can't verify NTLM by itself.</p>
            </details>
          `,
        },
        { title: 'AD → Entra ID → SaaS app', code: W('<div id="flow"></div>', entraFlow, [L]) },
      ],
      quiz: [
        { q: 'Which of these is NOT part of Active Directory Domain Services?', options: ['LDAP directory', 'Kerberos KDC', 'DNS SRV records for locating DCs', 'OIDC discovery endpoint'], answer: 3, why: 'OIDC is spoken by Entra ID / AD FS, not by AD DS domain controllers.' },
        { q: 'What does the browser send after "WWW-Authenticate: Negotiate"?', options: ['Authorization: Basic base64(user:pass)', 'Authorization: Negotiate <base64 SPNEGO token with a Kerberos AP-REQ>', 'A cookie', 'A SAMLResponse'], answer: 1, why: 'RFC 4559 HTTP Negotiate carries SPNEGO tokens.' },
        { q: 'Users opening the intranet by IP address get NTLM instead of Kerberos. Why?', options: ['IP addresses are faster', 'No SPN exists for HTTP/<ip>, so no service ticket can be issued', 'NTLM is more secure', 'The KDC is down'], answer: 1, why: 'Kerberos service tickets are requested by SPN, normally built from the host name.' },
        { q: 'With Password Hash Synchronization, who verifies the password when a user logs into a SaaS app via Entra ID?', options: ['The on-prem DC on every login', 'Entra ID, using the synced hash-of-hash', 'The SaaS app', 'AD FS'], answer: 1, why: 'PHS = cloud authentication; no on-prem dependency at login time.' },
      ],
      exercise: {
        task: '<p>For each situation in the box below, pick the protocol doing the work, then click <strong>Check</strong>.</p>',
        hint: 'Kerberos needs an SPN (host name). SaaS apps use federation protocols through Entra. Old apps doing their own password checks use LDAP bind. Getting users into an app ahead of time is provisioning.',
        starter: W('<div id="ex"></div>', protoExercise),
        solution: W('<div id="ex"></div>', protoExercise, [], { solved: true }),
      },
    },
  );
})();
