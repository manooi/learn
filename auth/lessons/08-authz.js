window.LESSONS = window.LESSONS || [];
(function () {
  const SECTION = '8 · Authorization Models';

  // Shared widget styles (light theme). Injected at the top of every widget.
  const CSS = `<style>
.card { border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; background: #fff; margin-bottom: 10px; }
.row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
.col { flex: 1; min-width: 220px; }
h4 { margin: 0 0 6px; font-size: 14px; color: #3a4256; }
.muted { color: #646b80; font-size: 13px; }
.small { font-size: 12.5px; }
.verdict { display: inline-block; font-weight: 800; padding: 3px 14px; border-radius: 99px; color: #fff; font-size: 15px; }
.ALLOW { background: #16a34a; } .DENY { background: #dc2626; } .NA { background: #64748b; }
.pill { display: inline-block; padding: 1px 8px; border-radius: 99px; background: #eef1f6; font-size: 12px; margin: 1px 2px; }
.pill.g { background: #dcfce7; color: #166534; } .pill.r { background: #fee2e2; color: #991b1b; }
.pill.b { background: #dbeafe; color: #1e40af; } .pill.y { background: #fef3c7; color: #92400e; }
table.t { border-collapse: collapse; width: 100%; font-size: 13px; }
table.t th, table.t td { border: 1px solid #e2e5ee; padding: 3px 6px; text-align: left; vertical-align: top; }
table.t th { background: #f4f6fa; font-weight: 600; }
.trace { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #0f1320; color: #d7dcea; border-radius: 8px;
  padding: 8px 10px; white-space: pre-wrap; max-height: 210px; overflow: auto; margin: 0; }
.trace .c { color: #7d869c; } .trace .g { color: #4ade80; } .trace .r { color: #f87171; } .trace .y { color: #facc15; }
.trace .b { color: #7fd6ea; }
.ok { color: #16a34a; font-weight: 700; } .bad { color: #dc2626; font-weight: 700; }
code { background: #eef1f6; padding: 0 4px; border-radius: 4px; font-size: 12.5px; }
@keyframes pop { 0% { transform: scale(.6); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
.pop { animation: pop .35s ease-out; }
@keyframes flash { 0% { background: #fff1a8; } 100% { background: transparent; } }
.flash { animation: flash 1.2s; }
.result { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 13.5px; }
.result.pass { background: #dcfce7; border: 1px solid #86efac; }
.result.fail { background: #fee2e2; border: 1px solid #fca5a5; }
.pipe { display: flex; align-items: center; gap: 0; margin: 8px 0; position: relative; }
.stage { flex: 1; text-align: center; border: 2px solid #e2e5ee; border-radius: 10px; padding: 6px 4px; font-size: 12.5px;
  background: #fbfcfe; transition: all .3s; min-height: 50px; }
.stage b { display: block; font-size: 13px; }
.stage.on { border-color: #2563eb; background: #eff6ff; }
.stage.pass { border-color: #16a34a; background: #f0fdf4; }
.stage.stop { border-color: #dc2626; background: #fef2f2; }
.stage.off { opacity: .45; border-style: dashed; }
.arrow { width: 26px; text-align: center; color: #9aa1b3; font-weight: 700; }
.dot { position: absolute; top: 50%; width: 14px; height: 14px; margin: -7px 0 0 -7px; border-radius: 50%;
  background: #2563eb; box-shadow: 0 0 0 4px #2563eb33; transition: left .45s ease-in-out; left: 0; display: none; }
button.primary { background: #087ea4; color: #fff; border-color: #087ea4; }
button.primary:hover { background: #066a8a; }
label { cursor: pointer; }
</style>`;

  const L = window.LESSONS;

  // Animated "packet moves through stages" helper shared by several widgets.
  const PIPE = `
function runPipe(pipe, upto, blocked, done) {
  var st = pipe.querySelectorAll('.stage');
  var dot = pipe.querySelector('.dot');
  pipe._run = (pipe._run || 0) + 1;
  var me = pipe._run;
  st.forEach(function (s) { s.classList.remove('on', 'pass', 'stop'); });
  function center(k) { return st[k].offsetLeft + st[k].offsetWidth / 2; }
  dot.style.display = 'block';
  dot.style.transition = 'none';
  dot.style.left = center(0) + 'px';
  void dot.offsetLeft;
  dot.style.transition = '';
  dot.style.background = '#2563eb';
  var i = 0;
  function tick() {
    if (pipe._run !== me) return;
    st[i].classList.add('on');
    if (i === upto) {
      setTimeout(function () {
        if (pipe._run !== me) return;
        st[i].classList.remove('on');
        st[i].classList.add(blocked ? 'stop' : 'pass');
        dot.style.display = 'none';
        if (done) done();
      }, 380);
      return;
    }
    setTimeout(function () {
      if (pipe._run !== me) return;
      st[i].classList.remove('on');
      st[i].classList.add('pass');
      i++;
      dot.style.left = center(i) + 'px';
      setTimeout(tick, 460);
    }, 300);
  }
  tick();
}
`;

  // ---------- Lesson 1 exercise generator (least privilege) ----------
  function mkLeastPriv(checked) {
    return CSS + `
<div class="card">
  <h4>🎧 Role: <code>support-agent</code></h4>
  <p class="muted" style="margin:0 0 6px">The job description says a support agent must be able to:
    <b>read tickets</b>, <b>reply to tickets</b> and <b>look up the customer's profile</b>. Nothing else.</p>
  <div id="perms" style="columns:2;font:13px ui-monospace,Menlo,monospace"></div>
  <div style="margin-top:8px">
    <button class="primary" id="check">Check</button>
    <button id="none">Untick all</button>
  </div>
  <div id="out"></div>
</div>
<script>
var ALL = ['ticket:read', 'ticket:reply', 'ticket:assign', 'ticket:delete', 'customer:read',
  'customer:update', 'customer:export', 'billing:refund', 'user:impersonate', 'admin:settings'];
var NEED = ['ticket:read', 'ticket:reply', 'customer:read'];
var START = ` + JSON.stringify(checked) + `;
var box = document.getElementById('perms');
ALL.forEach(function (p) {
  var l = document.createElement('label');
  l.style.display = 'block';
  l.innerHTML = '<input type="checkbox" value="' + p + '"' + (START.indexOf(p) >= 0 ? ' checked' : '') + '> ' + p;
  box.appendChild(l);
});
document.getElementById('none').onclick = function () {
  box.querySelectorAll('input').forEach(function (c) { c.checked = false; });
};
document.getElementById('check').onclick = function () {
  var got = [].slice.call(box.querySelectorAll('input:checked')).map(function (c) { return c.value; });
  var missing = NEED.filter(function (p) { return got.indexOf(p) < 0; });
  var extra = got.filter(function (p) { return NEED.indexOf(p) < 0; });
  var out = document.getElementById('out');
  if (!missing.length && !extra.length) {
    out.innerHTML = '<div class="result pass pop">✅ Exactly the 3 permissions the job needs. That is <b>least privilege</b>: ' +
      'if this agent account is phished, the attacker cannot refund money, export customers or impersonate users.</div>';
    return;
  }
  var h = '<div class="result fail pop">❌ Not yet.<ul style="margin:4px 0">';
  missing.forEach(function (p) { h += '<li>Missing <code>' + p + '</code>: the agent cannot do their job (a request would get 403).</li>'; });
  extra.forEach(function (p) { h += '<li>Extra <code>' + p + '</code>: not needed for the job. Every extra permission widens the blast radius of a stolen account.</li>'; });
  out.innerHTML = h + '</ul></div>';
};
</script>`;
  }

  L.push({
    id: 'authz-basics',
    section: SECTION,
    title: 'Authorization basics: who can do what',
    explain: `
      <p>Every lesson so far answered one question: <strong>who are you?</strong> That is <em>authentication</em> (AuthN).
      Passwords, sessions, JWTs, OIDC, SAML and Kerberos all end the same way: the server knows a verified identity,
      such as <code>sub = alice</code>.</p>
      <p><strong>Authorization</strong> (AuthZ) answers the next question: <strong>is alice allowed to do <em>this</em>?</strong>
      Knowing who someone is does not tell you what they may do. A hotel checks your passport at the front desk (AuthN),
      and then your key card opens room 512 but not room 513 (AuthZ).</p>

      <h3>The four parts of every authorization question</h3>
      <ul>
        <li><strong>Subject</strong>: who is asking (a user, a service, an app acting for a user). Example: <code>user:alice</code>.</li>
        <li><strong>Action</strong>: what they want to do. Example: <code>edit</code>, <code>delete</code>, <code>approve</code>.</li>
        <li><strong>Resource</strong>: what they want to do it to. Example: <code>document:42</code>.</li>
        <li><strong>Context</strong>: facts about the situation. Example: time of day, IP address, whether MFA was used.</li>
      </ul>
      <p>Every model in this section (ACL, RBAC, ABAC, ReBAC) is just a different way to answer
      <em>"may this subject do this action on this resource, in this context?"</em> with <code>ALLOW</code> or <code>DENY</code>.</p>

      <h3>Two golden rules</h3>
      <ul>
        <li><strong>Deny by default.</strong> If no rule says "yes", the answer is "no". A new endpoint that nobody wrote a rule for
        must be locked, not open.</li>
        <li><strong>Least privilege.</strong> Give each subject only the permissions its job needs, nothing "just in case".
        A stolen account can then do only limited damage.</li>
      </ul>

      <h3>Who does what: PEP, PDP, PIP, PAP</h3>
      <p>These names were popularized by the XACML standard, and almost every authorization system still uses them:</p>
      <table>
        <tr><th>Part</th><th>Job</th><th>Nightclub analogy</th><th>Real example</th></tr>
        <tr><td><strong>PEP</strong> Policy Enforcement Point</td><td>Stops the request, asks for a decision, then obeys it</td><td>Bouncer at the door</td><td>API middleware, API gateway</td></tr>
        <tr><td><strong>PDP</strong> Policy Decision Point</td><td>Evaluates the rules and returns ALLOW / DENY</td><td>Manager who reads the rules</td><td>OPA, Cedar, OpenFGA, a <code>can()</code> function</td></tr>
        <tr><td><strong>PIP</strong> Policy Information Point</td><td>Supplies extra facts (attributes) the PDP needs</td><td>Guest list / ID database</td><td>User directory, HR system, the DB row</td></tr>
        <tr><td><strong>PAP</strong> Policy Administration Point</td><td>Where people write and manage the rules</td><td>Owner who writes the house rules</td><td>Admin UI, a git repo of policies</td></tr>
      </table>
      <div class="tip">The PEP should know almost nothing about the rules. It only asks "allow?" and obeys. Then you can change the rules
      in one place (the PDP) without touching every endpoint.</div>

      <h3>401 or 403?</h3>
      <p><code>401 Unauthorized</code> really means "unauthenticated": no valid credentials, so log in first.
      <code>403 Forbidden</code> means "I know who you are, and you are not allowed". Some APIs return <code>404</code> instead of
      <code>403</code> so they don't reveal that a resource exists. You will see that in the IDOR lesson.</p>
      <div class="warn">Hiding a button in the UI is <strong>not</strong> authorization. Anyone can send the HTTP request with curl.
      The server must check every request.</div>
    `,
    examples: [
      {
        title: 'Animated: request → PEP → PDP → ALLOW / DENY',
        code: CSS + `
<div id="flow"></div>
<script>
var tok = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJhbGljZSJ9.c2ln';
var tokB = 'eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJib2IifQ.c2ln';
function decideReq(who, act) {
  return 'POST /access/v1/evaluation HTTP/1.1\\nHost: pdp.internal\\nContent-Type: application/json\\n\\n' +
    JSON.stringify({
      subject: { type: 'user', id: who },
      action: { name: act },
      resource: { type: 'document', id: '42' },
      context: { time: '2026-10-31T10:15:00Z', ip: '203.0.113.7' }
    }, null, 2);
}
Seq.mount('#flow', {
  title: 'One request, four roles: PEP asks, PIP informs, PDP decides, PEP enforces',
  actors: [
    { id: 'c', label: 'Client app', icon: '🌐', store: {} },
    { id: 'pep', label: 'Docs API (PEP)', icon: '🛡', store: {} },
    { id: 'pdp', label: 'Policy engine (PDP)', icon: '⚖️', store: { rules: 'viewer→read · editor→read,edit · admin→all' } },
    { id: 'pip', label: 'Directory (PIP)', icon: '📇', store: { alice: 'role=editor', bob: 'role=viewer' } },
  ],
  scenarios: [
    { name: '✅ alice edits doc 42', steps: [
      { from: 'c', to: 'pep', label: 'PUT /docs/42', hl: ['Authorization'],
        msg: 'PUT /docs/42 HTTP/1.1\\nHost: docs.example\\nAuthorization: Bearer ' + tok + '\\nContent-Type: application/json\\n\\n{"title": "Q3 plan v2"}',
        note: 'A normal API call. The bearer token is the <b>authentication</b> part: it proves the caller is alice.' },
      { from: 'pep', to: 'pep', label: 'AuthN ✓ sub=alice',
        note: 'The API validates the token (signature, <code>exp</code>, <code>aud</code>). Now it knows <b>who</b>. It still does not know whether alice may <b>edit</b> doc 42.',
        set: { pep: { subject: 'alice' } } },
      { from: 'pep', to: 'pdp', label: 'may alice edit doc 42?', hl: ['"subject"', '"action"', '"resource"', '"context"'],
        msg: decideReq('alice', 'edit'),
        note: 'The PEP sends the 4 parts of the question: <b>subject, action, resource, context</b>. This JSON shape follows the OpenID <b>AuthZEN</b> Authorization API, a standard PEP→PDP protocol.' },
      { from: 'pdp', to: 'pip', kind: 'back', label: 'GET /users/alice',
        msg: 'GET /users/alice HTTP/1.1\\nHost: directory.internal\\nAccept: application/json',
        note: 'The rules talk about <b>roles</b>, but the request only carried an id. The PDP asks the <b>PIP</b> (a directory) for the missing attribute.' },
      { from: 'pip', to: 'pdp', kind: 'back', label: '200 {role: editor}',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "alice", "role": "editor", "dept": "sales"}',
        set: { pdp: { 'alice.role': 'editor' } } },
      { from: 'pdp', to: 'pdp', label: 'evaluate rules',
        note: 'Rule <code>editor → read, edit</code> matches action <code>edit</code>. Result: <b>ALLOW</b>.',
        set: { pdp: { decision: 'ALLOW (editor→edit)' } } },
      { from: 'pdp', to: 'pep', kind: 'res', label: '{"decision": true}',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"decision": true}', hl: ['true'] },
      { from: 'pep', to: 'pep', label: 'enforce: run handler',
        note: 'The PEP obeys the decision and only now runs the real update code.' },
      { from: 'pep', to: 'c', kind: 'res', label: '200 OK',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "42", "title": "Q3 plan v2"}' },
    ]},
    { name: '❌ bob deletes doc 42', steps: [
      { from: 'c', to: 'pep', label: 'DELETE /docs/42', hl: ['DELETE'],
        msg: 'DELETE /docs/42 HTTP/1.1\\nHost: docs.example\\nAuthorization: Bearer ' + tokB,
        note: 'Same API, different user and action. Bob\\'s token is perfectly valid.' },
      { from: 'pep', to: 'pep', label: 'AuthN ✓ sub=bob', set: { pep: { subject: 'bob' } },
        note: 'Authentication succeeds. A valid token never means "allowed to do everything".' },
      { from: 'pep', to: 'pdp', label: 'may bob delete doc 42?', msg: decideReq('bob', 'delete'), hl: ['"delete"'] },
      { from: 'pdp', to: 'pip', kind: 'back', label: 'GET /users/bob', msg: 'GET /users/bob HTTP/1.1\\nHost: directory.internal' },
      { from: 'pip', to: 'pdp', kind: 'back', label: '200 {role: viewer}',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "bob", "role": "viewer"}', set: { pdp: { 'bob.role': 'viewer' } } },
      { from: 'pdp', to: 'pdp', kind: 'err', label: 'no rule permits → DENY',
        note: 'Viewer may only <code>read</code>. No rule says "viewer may delete", so <b>deny by default</b> kicks in. Nobody had to write a rule saying "bob may not delete".',
        set: { pdp: { decision: 'DENY (no matching rule)' } } },
      { from: 'pdp', to: 'pep', kind: 'res', label: '{"decision": false}',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"decision": false}', hl: ['false'],
        note: 'Note the PDP call itself succeeded (HTTP 200). The <em>answer</em> is "no".' },
      { from: 'pep', to: 'c', kind: 'err', label: '403 Forbidden', hl: ['403 Forbidden'],
        msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: application/json\\n\\n{"error": "forbidden", "message": "You may not delete this document"}',
        note: '<b>403</b>: "I know who you are, and the answer is no." The handler never ran, so nothing was deleted.' },
    ]},
    { name: '🔑 no token at all', steps: [
      { from: 'c', to: 'pep', label: 'DELETE /docs/42 (no token)', msg: 'DELETE /docs/42 HTTP/1.1\\nHost: docs.example',
        note: 'No <code>Authorization</code> header.' },
      { from: 'pep', to: 'pep', kind: 'err', label: 'AuthN ✗ unknown caller',
        note: 'There is no subject, so there is nothing to ask the PDP. Authentication fails first.' },
      { from: 'pep', to: 'c', kind: 'err', label: '401 Unauthorized', hl: ['401', 'WWW-Authenticate'],
        msg: 'HTTP/1.1 401 Unauthorized\\nWWW-Authenticate: Bearer realm="docs"\\nContent-Type: application/json\\n\\n{"error": "unauthenticated"}',
        note: '<b>401</b> means "log in first". Compare with the 403 in the bob scenario.' },
    ]},
  ],
});
</script>`,
      },
      {
        title: 'Decision playground: build the question, watch the decision',
        code: CSS + `
<div class="row">
  <div class="card col">
    <h4>1 · The question</h4>
    <div class="small">
      Subject <select id="sub">
        <option value="alice">alice (editor)</option><option value="bob">bob (viewer)</option>
        <option value="carol">carol (admin)</option><option value="anon">anonymous (no token)</option>
      </select><br>
      Action <select id="act">
        <option>read</option><option>edit</option><option>delete</option><option>share</option><option>export</option>
      </select><br>
      Resource <select id="res"><option value="42">doc:42 (owner alice)</option><option value="77">doc:77 (owner carol)</option></select><br>
      Context <label><input type="checkbox" id="office" checked> on office network</label>
    </div>
  </div>
  <div class="card col">
    <h4>2 · Policies in the PDP (untick to remove one)</h4>
    <div id="rules" class="small"></div>
    <div class="small" style="margin-top:6px">If no rule matches:
      <label><input type="radio" name="def" value="deny" checked> deny (default deny)</label>
      <label><input type="radio" name="def" value="allow"> allow 😬</label></div>
  </div>
</div>
<div class="pipe" id="pipe">
  <div class="stage"><b>🌐 Request</b><span id="s0"></span></div><div class="arrow">→</div>
  <div class="stage"><b>🛡 PEP</b><span id="s1">authenticate</span></div><div class="arrow">→</div>
  <div class="stage"><b>⚖️ PDP</b><span id="s2">evaluate</span></div><div class="arrow">→</div>
  <div class="stage"><b>📤 Response</b><span id="s3"></span></div>
  <div class="dot"></div>
</div>
<div style="text-align:center"><button class="primary" id="go">▶ Send request</button></div>
<div class="row" style="margin-top:8px">
  <div class="col"><h4>PEP → PDP question</h4><pre class="trace" id="q"></pre></div>
  <div class="col"><h4>PDP reasoning &amp; final response <span id="verdict"></span></h4><pre class="trace" id="tr">Press ▶ Send request</pre></div>
</div>
<script>
` + PIPE + `
var ROLE = { alice: 'editor', bob: 'viewer', carol: 'admin' };
var OWNER = { '42': 'alice', '77': 'carol' };
var RULES = [
  { id: 'P1', eff: 'PERMIT', txt: 'viewer, editor, admin may <b>read</b>',
    m: function (q) { return q.action === 'read' && ['viewer', 'editor', 'admin'].indexOf(q.role) >= 0; } },
  { id: 'P2', eff: 'PERMIT', txt: 'editor, admin may <b>edit</b>',
    m: function (q) { return q.action === 'edit' && ['editor', 'admin'].indexOf(q.role) >= 0; } },
  { id: 'P3', eff: 'PERMIT', txt: 'admin may <b>delete</b>',
    m: function (q) { return q.action === 'delete' && q.role === 'admin'; } },
  { id: 'P4', eff: 'PERMIT', txt: 'the <b>owner</b> may <b>share</b> their doc',
    m: function (q) { return q.action === 'share' && q.owner === q.subject; } },
  { id: 'D1', eff: 'DENY', txt: '<b>delete</b> is forbidden off the office network',
    m: function (q) { return q.action === 'delete' && !q.office; } },
];
var rb = document.getElementById('rules');
RULES.forEach(function (r) {
  var l = document.createElement('label');
  l.style.display = 'block';
  l.innerHTML = '<input type="checkbox" checked data-id="' + r.id + '"> <span class="pill ' +
    (r.eff === 'PERMIT' ? 'g' : 'r') + '">' + r.id + ' ' + r.eff + '</span> ' + r.txt;
  rb.appendChild(l);
});
function $(id) { return document.getElementById(id); }
function question() {
  var s = $('sub').value;
  return { subject: s, role: ROLE[s], action: $('act').value, res: $('res').value,
    owner: OWNER[$('res').value], office: $('office').checked };
}
function showQ() {
  var q = question();
  $('s0').textContent = ' ' + $('act').value.toUpperCase() + ' doc:' + q.res;
  if (q.subject === 'anon') { $('q').textContent = '// no subject: PEP never asks the PDP'; return; }
  $('q').textContent = JSON.stringify({
    subject: { type: 'user', id: q.subject },
    action: { name: q.action },
    resource: { type: 'document', id: q.res },
    context: { network: q.office ? 'office' : 'public' }
  }, null, 2);
}
document.querySelectorAll('select, input').forEach(function (e) { e.addEventListener('change', showQ); });
showQ();
$('go').onclick = function () {
  var q = question();
  var lines = [];
  var dec, status;
  $('verdict').innerHTML = '';
  $('s3').textContent = '';
  if (q.subject === 'anon') {
    lines.push('<span class="r">PEP: no valid token → cannot identify subject</span>');
    lines.push('PDP is never asked.');
    status = '401 Unauthorized';
    runPipe($('pipe'), 1, true, function () { finish('DENY', status, lines); });
    return;
  }
  lines.push('<span class="c">// role of ' + q.subject + ' (from PIP) = ' + q.role + ', owner of doc:' + q.res + ' = ' + q.owner + '</span>');
  var on = {};
  rb.querySelectorAll('input').forEach(function (c) { on[c.dataset.id] = c.checked; });
  var permits = [], denies = [];
  RULES.forEach(function (r) {
    if (!on[r.id]) { lines.push('<span class="c">' + r.id + ' (removed)</span>'); return; }
    var hit = r.m(q);
    lines.push((hit ? (r.eff === 'PERMIT' ? '<span class="g">✓ ' : '<span class="r">✓ ') : '<span class="c">· ') +
      r.id + ' ' + r.eff + (hit ? ' matches' : ' does not apply') + '</span>');
    if (hit) (r.eff === 'PERMIT' ? permits : denies).push(r.id);
  });
  var def = document.querySelector('input[name=def]:checked').value;
  if (denies.length) { dec = 'DENY'; lines.push('<span class="r">→ DENY: ' + denies.join(',') + ' forbids it (a deny always wins here)</span>'); }
  else if (permits.length) { dec = 'ALLOW'; lines.push('<span class="g">→ ALLOW because of ' + permits.join(',') + '</span>'); }
  else if (def === 'deny') { dec = 'DENY'; lines.push('<span class="y">→ no rule matched → DENY by default ✔ safe</span>'); }
  else { dec = 'ALLOW'; lines.push('<span class="y">→ no rule matched → ALLOW by default ⚠ anything nobody thought of is open!</span>'); }
  status = dec === 'ALLOW' ? '200 OK' : '403 Forbidden';
  runPipe($('pipe'), 3, dec === 'DENY', function () { finish(dec, status, lines); });
};
function finish(dec, status, lines) {
  $('s3').textContent = ' ' + status;
  lines.push('');
  lines.push('<span class="b">HTTP/1.1 ' + status + '</span>');
  $('tr').innerHTML = lines.join('\\n');
  $('verdict').innerHTML = '<span class="verdict pop ' + dec + '">' + dec + '</span>';
}
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li><b>bob · delete · doc:42</b> → DENY. No rule permits it, so default deny applies.</li>
              <li><b>bob · export</b> with "allow 😬" selected → ALLOW. Nobody wrote an <code>export</code> rule, so a brand-new feature is open to everyone. Switch back to "deny" and it is locked again. This is why <em>deny by default</em> matters.</li>
              <li><b>carol · delete</b>, then untick "on office network" → DENY. Rule D1 matches and a deny beats the permit from P3.</li>
              <li><b>anonymous</b> → the dot stops at the PEP with <code>401</code>. The PDP is never asked.</li>
              <li><b>alice · share · doc:77</b> → DENY. alice is an editor, but P4 is about <em>ownership</em>, and carol owns doc 77. Not everything fits into roles. Later lessons solve this with ABAC and ReBAC.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Alice sends a valid, unexpired token but is not allowed to delete the document. Which status fits best?',
        options: ['401 Unauthorized', '403 Forbidden', '400 Bad Request', '500 Internal Server Error'], answer: 1,
        why: 'The server knows who she is (authentication succeeded) but refuses the action. That is 403. 401 means "no valid credentials".' },
      { q: 'In the PEP / PDP / PIP / PAP model, which component returns ALLOW or DENY?',
        options: ['PEP', 'PDP', 'PIP', 'PAP'], answer: 1,
        why: 'The Policy Decision Point evaluates the rules. The PEP only asks and enforces. The PIP supplies attributes. The PAP is where rules are authored.' },
      { q: 'A developer adds a new endpoint <code>POST /reports/export</code> and forgets to add any policy rule for it. With deny-by-default, what happens?',
        options: ['Everyone can call it', 'Only admins can call it', 'Nobody can call it until a rule permits it', 'The server crashes'], answer: 2,
        why: 'No matching permit → deny. The mistake is "safe": the feature is locked rather than open to everyone.' },
      { q: 'Which is the best example of <em>least privilege</em>?',
        options: ['Give all engineers admin so they are never blocked', 'A CI deploy job gets only "deploy to staging", not "delete production database"',
          'Hide the delete button for non-admins', 'Use long passwords'], answer: 1,
        why: 'Least privilege = only what the job needs. Hiding a button is UI, not authorization. Passwords are authentication.' },
      { q: 'The policy says "managers may approve", but the request only contains <code>sub=kim</code>. Where does the PDP get Kim’s role?',
        options: ['From the PIP (e.g. directory / HR system / token claims)', 'From the PAP', 'It guesses', 'From the browser’s localStorage'], answer: 0,
        why: 'The Policy Information Point supplies attributes the PDP needs but was not given. Never trust a role sent by the client itself.' },
    ],
    exercise: {
      task: `<p>Someone created the role <code>support-agent</code> by ticking <em>everything</em>. Apply <strong>least privilege</strong>:
        in the box below, keep only the permissions the job really needs, then click <strong>Check</strong>.</p>`,
      hint: 'Read the job description in the widget: three verbs, three permissions. Refunds, exports and impersonation are not on the list.',
      starter: mkLeastPriv(['ticket:read', 'ticket:reply', 'ticket:assign', 'ticket:delete', 'customer:read',
        'customer:update', 'customer:export', 'billing:refund', 'user:impersonate', 'admin:settings']),
      solution: mkLeastPriv(['ticket:read', 'ticket:reply', 'customer:read']),
    },
  });

  // ---------- Lesson 2 exercise generator (ACL config) ----------
  function mkAclEx(pre) {
    return CSS + `
<div class="card">
  <h4>📄 payroll.csv · edit its ACL</h4>
  <p class="muted" style="margin:0 0 6px">People: <b>alice</b> (HR lead) · <b>bob</b> and <b>erin</b> (both members of <code>group:hr</code>) ·
    <b>carol</b> (auditor) · <b>dave</b> (sales). Choose an entry for each row (<i>none</i> = no ACL entry).</p>
  <table class="t" id="acl" style="max-width:520px"></table>
  <div style="margin-top:8px"><button class="primary" id="check">Check</button> <span class="muted" id="count"></span></div>
  <div id="out"></div>
</div>
<script>
var WHO = ['user:alice', 'user:bob', 'user:carol', 'user:dave', 'group:hr'];
var PRE = ` + JSON.stringify(pre) + `;
var GROUPS = { alice: [], bob: ['hr'], erin: ['hr'], carol: [], dave: [] };
var RANK = { none: 0, reader: 1, writer: 2, owner: 3 };
var t = document.getElementById('acl');
t.innerHTML = '<tr><th>Principal</th><th>Entry</th></tr>';
WHO.forEach(function (w) {
  var tr = document.createElement('tr');
  var opts = ['none', 'reader', 'writer', 'owner'].map(function (r) {
    return '<option' + (PRE[w] === r ? ' selected' : '') + '>' + r + '</option>';
  }).join('');
  tr.innerHTML = '<td><code>' + w + '</code></td><td><select data-w="' + w + '">' + opts + '</select></td>';
  t.appendChild(tr);
});
function acl() {
  var a = {};
  t.querySelectorAll('select').forEach(function (s) { if (s.value !== 'none') a[s.dataset.w] = s.value; });
  return a;
}
function level(a, user) {
  var best = RANK[a['user:' + user] || 'none'];
  GROUPS[user].forEach(function (g) { best = Math.max(best, RANK[a['group:' + g] || 'none']); });
  return best;
}
function upd() { document.getElementById('count').textContent = Object.keys(acl()).length + ' ACL entries'; }
t.addEventListener('change', upd);
upd();
var TESTS = [
  ['alice', 'is owner (can delete / change sharing)', function (l) { return l === 3; }],
  ['bob', 'can edit', function (l) { return l >= 2; }],
  ['erin', 'can edit (she was never listed by name!)', function (l) { return l >= 2; }],
  ['carol', 'can read but NOT edit', function (l) { return l === 1; }],
  ['dave', 'has no access', function (l) { return l === 0; }],
];
document.getElementById('check').onclick = function () {
  var a = acl(), pass = true;
  var h = '<table class="t" style="margin-top:8px"><tr><th>Requirement</th><th>Effective</th><th></th></tr>';
  TESTS.forEach(function (tc) {
    var l = level(a, tc[0]), ok = tc[2](l);
    pass = pass && ok;
    h += '<tr><td>' + tc[0] + ' ' + tc[1] + '</td><td>' + ['none', 'reader', 'writer', 'owner'][l] + '</td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  var n = Object.keys(a).length, small = n <= 3;
  h += '<tr><td>At most 3 ACL entries</td><td>' + n + '</td><td>' + (small ? '✅' : '❌') + '</td></tr></table>';
  pass = pass && small;
  document.getElementById('out').innerHTML = h + (pass
    ? '<div class="result pass pop">✅ Done. Granting <code>group:hr</code> instead of each HR person means the next HR hire gets access by joining the group, with no ACL edits.</div>'
    : '<div class="result fail pop">❌ Some requirements fail. Remember: a user\\'s access = the best entry among their own entry and their groups\\' entries.</div>');
};
</script>`;
  }

  L.push({
    id: 'acl',
    section: SECTION,
    title: 'Access Control Lists',
    explain: `
      <p>An <strong>Access Control List (ACL)</strong> is the simplest model: every resource carries its own list of
      <em>who may do what</em> to it.</p>
      <pre><code>budget.xlsx   →  alice: owner,  bob: writer,  group:eng: reader
salary.xlsx   →  carol: owner</code></pre>
      <p>Analogy: a guest list taped to each room's door. To find out whether bob may enter, you read the list on
      <em>that</em> door. You do not need a central rulebook.</p>

      <h3>Where you have already used ACLs</h3>
      <ul>
        <li><strong>Google Docs / Drive "Share"</strong>: each file has entries like "bob@… : Editor", "Anyone with the link : Viewer".</li>
        <li><strong>Unix file permissions</strong> (<code>rwxr-x---</code>): a tiny fixed ACL with three entries: owner, group, others.</li>
        <li><strong>Windows NTFS</strong>, S3 bucket ACLs, network firewall rules, Active Directory object security descriptors.</li>
      </ul>

      <h3>How a check works</h3>
      <ol>
        <li>Load the ACL of the resource.</li>
        <li>Find every entry that matches the subject: their own user entry, any group they belong to, and "anyone" entries.</li>
        <li>Take the strongest level (owner &gt; writer &gt; reader) and compare it with what the action needs.</li>
        <li>No matching entry means no access (deny by default).</li>
      </ol>

      <h3>Strengths and problems</h3>
      <ul>
        <li>👍 Very intuitive, and it is easy to answer "who can see <em>this file</em>?" (just read its list).</li>
        <li>👎 It is hard to answer "what can <em>bob</em> see?". You must scan every resource's ACL.</li>
        <li>👎 <strong>ACL explosion</strong>: 2,000 employees × 50,000 documents. When someone joins or changes team, you must edit hundreds
        of lists, and someone always forgets to remove access when people leave.</li>
      </ul>
      <div class="tip">The usual fix is to put <strong>groups</strong> in ACLs instead of people, and then manage group membership centrally,
      for example LDAP / AD groups from the enterprise lesson. Taken one step further, you get roles (next lesson).</div>
      <div class="warn">An ACL only works if <em>every</em> code path checks it. The classic bug is an API that checks the ACL on
      <code>GET /files/7</code> but forgets it on <code>GET /files/7/download</code>.</div>
    `,
    examples: [
      {
        title: 'Google-Docs-style sharing: act as different users',
        code: CSS + `
<div class="row" style="align-items:center;margin-bottom:6px">
  <div><b>Acting as:</b> <select id="me">
    <option>alice</option><option>bob</option><option>carol</option><option>dave</option>
  </select> <span class="muted" id="mygroups"></span></div>
  <div class="muted small">Groups: <code>group:eng</code> = bob, dave</div>
</div>
<div class="row" id="files"></div>
<h4>Access log</h4>
<pre class="trace" id="log" style="max-height:190px">Pick a user, then click an action on a file.</pre>
<script>
var GROUPS = { alice: [], bob: ['eng'], carol: [], dave: ['eng'] };
var RANK = { reader: 1, writer: 2, owner: 3 };
var NEED = { Open: 1, Edit: 2, Share: 2, Delete: 3 };
var NEEDNAME = { 1: 'reader', 2: 'writer', 3: 'owner' };
var FILES = {
  'plan.docx': [['user:alice', 'owner'], ['user:bob', 'writer'], ['group:eng', 'reader']],
  'salary.xlsx': [['user:carol', 'owner']],
  'readme.md': [['user:alice', 'owner'], ['anyone', 'reader']],
};
function me() { return document.getElementById('me').value; }
function matches(entry, u) {
  if (entry === 'anyone') return true;
  if (entry === 'user:' + u) return true;
  return GROUPS[u].some(function (g) { return entry === 'group:' + g; });
}
function effective(f, u) {
  var best = 0, via = [];
  FILES[f].forEach(function (e, i) {
    if (matches(e[0], u)) {
      via.push(i);
      best = Math.max(best, RANK[e[1]]);
    }
  });
  return { level: best, via: via };
}
var logLines = [];
function log(s) {
  logLines.unshift(s);
  document.getElementById('log').innerHTML = logLines.slice(0, 30).join('\\n');
}
function render(flash) {
  var u = me();
  document.getElementById('mygroups').textContent = GROUPS[u].length ? '(member of group:' + GROUPS[u].join(', group:') + ')' : '(no groups)';
  var box = document.getElementById('files');
  box.innerHTML = '';
  Object.keys(FILES).forEach(function (f) {
    var eff = effective(f, u);
    var c = document.createElement('div');
    c.className = 'card col';
    var h = '<h4>📄 ' + f + '</h4><div class="small muted">ACL entries:</div><div style="margin:4px 0">';
    FILES[f].forEach(function (e, i) {
      var mine = eff.via.indexOf(i) >= 0;
      var fl = flash && flash.f === f && flash.i.indexOf(i) >= 0 ? ' flash' : '';
      h += '<div class="small' + fl + '" style="padding:1px 4px;border-radius:4px;' + (mine ? 'font-weight:700' : '') + '">' +
        (mine ? '👉 ' : '') + '<code>' + e[0] + '</code> : ' + e[1] +
        (eff.level === 3 ? ' <a href="#" data-f="' + f + '" data-rm="' + i + '" title="remove">✕</a>' : '') + '</div>';
    });
    h += '</div><div class="small">You have: <b>' + (eff.level ? NEEDNAME[eff.level] : 'no access') + '</b></div><div style="margin-top:4px">';
    ['Open', 'Edit', 'Share', 'Delete'].forEach(function (a) { h += '<button data-f="' + f + '" data-a="' + a + '">' + a + '</button>'; });
    h += '</div><div class="small" style="margin-top:4px">Share with <select data-sw="' + f + '">' +
      '<option>user:alice</option><option>user:bob</option><option>user:carol</option><option>user:dave</option><option>group:eng</option><option>anyone</option></select>' +
      '<select data-sr="' + f + '"><option>reader</option><option>writer</option></select></div>';
    c.innerHTML = h;
    box.appendChild(c);
  });
}
document.getElementById('files').addEventListener('click', function (e) {
  var t = e.target, f = t.dataset.f;
  if (!f) return;
  e.preventDefault();
  var u = me(), eff = effective(f, u);
  if (t.dataset.rm !== undefined) {
    var gone = FILES[f].splice(+t.dataset.rm, 1)[0];
    log('<span class="y">✎ ' + u + ' removed "' + gone[0] + ' : ' + gone[1] + '" from ' + f + '</span>');
    render();
    return;
  }
  var a = t.dataset.a, need = NEED[a];
  var matched = eff.via.map(function (i) { return FILES[f][i].join('=') ; }).join(', ') || 'nothing';
  var ok = eff.level >= need;
  var line = (ok ? '<span class="g">✅ ALLOW</span> ' : '<span class="r">❌ DENY </span> ') + u + ' → ' + a + ' ' + f +
    '\\n   <span class="c">entries matching ' + u + ': ' + matched + ' → best = ' + (eff.level ? NEEDNAME[eff.level] : 'none') +
    '; ' + a + ' needs ' + NEEDNAME[need] + '</span>';
  if (ok && a === 'Share') {
    var w = document.querySelector('[data-sw="' + f + '"]').value;
    var r = document.querySelector('[data-sr="' + f + '"]').value;
    var ex = FILES[f].filter(function (x) { return x[0] === w; })[0];
    if (ex) ex[1] = ex[1] === 'owner' ? 'owner' : r; else FILES[f].push([w, r]);
    line += '\\n   <span class="y">✎ added "' + w + ' : ' + r + '" to the ACL of ' + f + '</span>';
  }
  if (ok && a === 'Delete') line += '\\n   <span class="c">(demo: file kept so you can keep playing)</span>';
  log(line);
  render({ f: f, i: eff.via });
});
document.getElementById('me').onchange = function () { render(); };
render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>As <b>dave</b>, click <b>Open</b> on plan.docx → ALLOW via <code>group:eng : reader</code>. Then <b>Edit</b> → DENY. Reader is not enough.</li>
              <li>As <b>bob</b>, Edit plan.docx → ALLOW. bob matches two entries (<code>user:bob : writer</code> and <code>group:eng : reader</code>), and the strongest one wins.</li>
              <li>As <b>carol</b>, Open readme.md → ALLOW via <code>anyone</code>. As alice, remove the <code>anyone</code> entry (✕), switch back to carol and try again.</li>
              <li>As <b>alice</b>, share salary.xlsx with someone → DENY. Only people already on a file's ACL (as writer/owner) can change it. Switch to carol and share it with bob as reader.</li>
              <li>Notice what is <em>hard</em>: to answer "which files can dave read?" you have to look at every card.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Unix rwx: a tiny fixed ACL (owner / group / others)',
        code: CSS + `
<div class="card">
  <div style="font:14px ui-monospace,Menlo,monospace;margin-bottom:8px">
    $ ls -l report.txt<br><b id="ls"></b>
  </div>
  <table class="t" style="max-width:520px;text-align:center" id="bits"></table>
  <div style="margin-top:6px" class="small">
    $ <b id="chmod"></b>
  </div>
</div>
<div class="card">
  <b>Who is trying?</b>
  <label><input type="radio" name="u" value="alice" checked> alice (the owner)</label>
  <label><input type="radio" name="u" value="bob"> bob (in group <code>eng</code>)</label>
  <label><input type="radio" name="u" value="carol"> carol (neither)</label>
  <div style="margin-top:6px">
    <button data-op="r">cat report.txt (read)</button>
    <button data-op="w">echo hi &gt;&gt; report.txt (write)</button>
    <button data-op="x">./report.txt (execute)</button>
  </div>
  <pre class="trace" id="out" style="margin-top:8px">Pick a user and an operation.</pre>
</div>
<script>
var CLS = ['owner', 'group', 'others'], OPS = ['r', 'w', 'x'];
var bits = { owner: { r: 1, w: 1, x: 0 }, group: { r: 1, w: 0, x: 0 }, others: { r: 0, w: 0, x: 0 } };
var tb = document.getElementById('bits');
function draw(hiCls) {
  var h = '<tr><th></th><th>r (read)</th><th>w (write)</th><th>x (execute)</th><th>octal</th></tr>';
  CLS.forEach(function (c) {
    var oct = bits[c].r * 4 + bits[c].w * 2 + bits[c].x;
    h += '<tr' + (c === hiCls ? ' style="background:#fef3c7"' : '') + '><th>' + c + (c === 'owner' ? ' (alice)' : c === 'group' ? ' (eng)' : '') + '</th>';
    OPS.forEach(function (o) { h += '<td><input type="checkbox" data-c="' + c + '" data-o="' + o + '"' + (bits[c][o] ? ' checked' : '') + '></td>'; });
    h += '<td><b>' + oct + '</b> = 4·' + bits[c].r + ' + 2·' + bits[c].w + ' + 1·' + bits[c].x + '</td></tr>';
  });
  tb.innerHTML = h;
  var sym = '-';
  var oct = '';
  CLS.forEach(function (c) {
    OPS.forEach(function (o) { sym += bits[c][o] ? o : '-'; });
    oct += bits[c].r * 4 + bits[c].w * 2 + bits[c].x;
  });
  document.getElementById('ls').textContent = sym + '  1 alice  eng  2048 Oct 31 10:15 report.txt';
  document.getElementById('chmod').textContent = 'chmod ' + oct + ' report.txt';
}
tb.addEventListener('change', function (e) {
  var t = e.target;
  bits[t.dataset.c][t.dataset.o] = t.checked ? 1 : 0;
  draw();
});
document.querySelectorAll('[data-op]').forEach(function (b) {
  b.onclick = function () {
    var u = document.querySelector('input[name=u]:checked').value, op = b.dataset.op;
    var cls = u === 'alice' ? 'owner' : u === 'bob' ? 'group' : 'others';
    var lines = [];
    lines.push('<span class="c">1. Is ' + u + ' the file owner (alice)? ' + (u === 'alice' ? 'yes → use OWNER bits, stop' : 'no') + '</span>');
    if (u !== 'alice') lines.push('<span class="c">2. Is ' + u + ' in the file group (eng)? ' + (u === 'bob' ? 'yes → use GROUP bits, stop' : 'no → use OTHERS bits') + '</span>');
    var set = bits[cls];
    var str = (set.r ? 'r' : '-') + (set.w ? 'w' : '-') + (set.x ? 'x' : '-');
    lines.push('   ' + cls + ' bits = ' + str + ' → need "' + op + '"');
    lines.push(set[op] ? '<span class="g">✅ allowed</span>' : '<span class="r">❌ Permission denied (EACCES)</span>');
    if (!set[op] && cls !== 'others' && bits.others[op]) {
      lines.push('<span class="y">⚠ "others" has ' + op + ', but ' + u + ' is not "others". Only ONE class is checked.</span>');
    }
    document.getElementById('out').innerHTML = lines.join('\\n');
    draw(cls);
  };
});
draw();
</script>`,
        explain: `
          <details>
            <summary>Try this: the surprising first-match rule</summary>
            <ol>
              <li>As <b>bob</b>, try write → denied: group bits are <code>r--</code>.</li>
              <li>Tick <b>others · w</b> (octal becomes 642) and try bob again → <em>still denied</em>. The kernel picks exactly one class (owner, else group, else others) and does not fall through to the next one.</li>
              <li>Untick all <b>owner</b> boxes, tick all <b>others</b> boxes (<code>chmod 077</code>), and try as alice → denied, even though "everyone else" can read. Strange, but that is how it works.</li>
            </ol>
            <div class="tip">Modern Linux also has POSIX ACLs (<code>setfacl -m u:bob:rw report.txt</code>) when 3 entries are not enough. The <code>root</code> user bypasses these checks entirely.</div>
          </details>
        `,
      },
      {
        title: 'ACL explosion: per-person entries vs groups',
        code: CSS + `
<div class="card">
  <div class="row">
    <div class="col small">Team size: <b id="tv"></b><br><input type="range" id="team" min="5" max="500" value="40" style="width:100%"></div>
    <div class="col small">Documents the team uses: <b id="dv"></b><br><input type="range" id="docs" min="10" max="5000" value="300" style="width:100%"></div>
    <div class="col small">Joiners + leavers per month: <b id="cv"></b><br><input type="range" id="churn" min="1" max="50" value="4" style="width:100%"></div>
  </div>
</div>
<div class="row">
  <div class="card col" style="border-color:#fca5a5">
    <h4>😩 Per-person ACL entries</h4>
    <div style="font-size:26px;font-weight:800" id="a1"></div><div class="muted">ACL entries to store</div>
    <div style="font-size:22px;font-weight:800;margin-top:6px" id="a2"></div><div class="muted">ACL edits every month (each one a chance to forget)</div>
  </div>
  <div class="card col" style="border-color:#86efac">
    <h4>😌 One <code>group:team</code> entry per doc</h4>
    <div style="font-size:26px;font-weight:800" id="b1"></div><div class="muted">ACL entries to store</div>
    <div style="font-size:22px;font-weight:800;margin-top:6px" id="b2"></div><div class="muted">group-membership edits per month (ACLs untouched)</div>
  </div>
</div>
<div class="card">
  <button class="primary" id="hire">👋 A new person joins the team</button>
  <div id="grid" style="display:grid;grid-template-columns:repeat(40,1fr);gap:2px;margin-top:8px"></div>
  <div class="muted small" id="gmsg" style="margin-top:4px">Each square = one document whose ACL must be edited (first 400 shown).</div>
</div>
<script>
function $(i) { return document.getElementById(i); }
function fmt(n) { return n.toLocaleString('en-US'); }
function upd() {
  var t = +$('team').value, d = +$('docs').value, c = +$('churn').value;
  $('tv').textContent = t; $('dv').textContent = d; $('cv').textContent = c;
  $('a1').textContent = fmt(t * d);
  $('a2').textContent = fmt(c * d);
  $('b1').textContent = fmt(d);
  $('b2').textContent = fmt(c);
}
document.querySelectorAll('input[type=range]').forEach(function (r) { r.oninput = upd; });
upd();
$('hire').onclick = function () {
  var d = +$('docs').value, n = Math.min(400, d), g = $('grid');
  g.innerHTML = '';
  for (var i = 0; i < n; i++) {
    var s = document.createElement('div');
    s.style.cssText = 'height:9px;border-radius:2px;background:#e2e5ee;transition:background .2s';
    g.appendChild(s);
  }
  var cells = g.children, i2 = 0;
  $('gmsg').textContent = 'Per-person model: editing ACLs…';
  var tm = setInterval(function () {
    for (var k = 0; k < 8 && i2 < n; k++, i2++) cells[i2].style.background = '#f87171';
    if (i2 >= n) {
      clearInterval(tm);
      $('gmsg').innerHTML = 'Per-person model: <b>' + fmt(d) + ' ACL edits</b> for one hire. Group model: <b>1</b> edit (add them to group:team). ' +
        'The documents\\' ACLs never change.';
    }
  }, 30);
};
</script>`,
      },
    ],
    quiz: [
      { q: 'With ACLs, which question is easy to answer and which is hard?',
        options: ['Easy: "what can bob access?" Hard: "who can access file X?"', 'Easy: "who can access file X?" Hard: "what can bob access?"',
          'Both are easy', 'Both are impossible'], answer: 1,
        why: 'The list lives on the resource, so "who can access X" means reading one list. "What can bob access" means scanning every resource’s list.' },
      { q: 'A file has <code>user:dave : reader</code> and <code>group:eng : writer</code>. dave is in eng. In the sharing demo’s model, can dave edit?',
        options: ['No, the user entry is more specific', 'Yes, the strongest matching entry (writer) wins', 'Only if the group entry is listed first', 'Only if he is the owner'], answer: 1,
        why: 'Google-Drive-style ACLs use the most permissive entry that applies to you. (Unix is different: it picks one class only. Systems differ, so always check!)' },
      { q: 'What does <code>chmod 640 report.txt</code> give the group?',
        options: ['read + write', 'read only', 'nothing', 'read + execute'], answer: 1,
        why: '6 = rw- (owner), 4 = r-- (group), 0 = --- (others). Each digit is 4·r + 2·w + 1·x.' },
      { q: 'Why is "ACL explosion" a security problem, not just an admin chore?',
        options: ['ACLs use too much disk', 'Every manual edit is a chance to forget, so leavers keep access and joiners get broad access copied from someone else',
          'ACLs are slow to read', 'It is not a problem'], answer: 1,
        why: 'Thousands of hand-maintained entries drift. Stale access for people who changed teams (or left) is one of the most common audit findings.' },
    ],
    exercise: {
      task: `<p>Configure the ACL of <code>payroll.csv</code> so that every requirement passes, <strong>using at most 3 entries</strong>.
        Pick the entries in the box below and click <strong>Check</strong>.</p>`,
      hint: 'erin is not in the table, but she is in group:hr. One group entry can cover both bob and erin.',
      starter: mkAclEx({}),
      solution: mkAclEx({ 'user:alice': 'owner', 'user:carol': 'reader', 'group:hr': 'writer' }),
    },
  });

  // ---------- Lesson 3 exercise generator (RBAC permission assignment) ----------
  function mkRbacEx(pa) {
    return CSS + `
<div class="card">
  <h4>🧾 Configure the role → permission matrix</h4>
  <p class="muted small" style="margin:0 0 6px">Fixed for you: <b>carol</b> = viewer, <b>dan</b> = accountant, <b>erin</b> = manager.
    Hierarchy is ON: <b>manager ⊇ accountant ⊇ viewer</b> (a senior role inherits everything its junior roles have).</p>
  <table class="t" id="m" style="max-width:600px;text-align:center"></table>
  <div style="margin-top:8px"><button class="primary" id="check">Check</button></div>
  <div id="out"></div>
</div>
<script>
var ROLES = ['viewer', 'accountant', 'manager'];
var PERMS = ['invoice:read', 'invoice:create', 'invoice:approve', 'invoice:delete'];
var JUNIOR = { manager: 'accountant', accountant: 'viewer', viewer: null };
var UA = { carol: 'viewer', dan: 'accountant', erin: 'manager' };
var PRE = ` + JSON.stringify(pa) + `;
var m = document.getElementById('m');
var h = '<tr><th>role \\\\ permission</th>' + PERMS.map(function (p) { return '<th><code>' + p + '</code></th>'; }).join('') + '</tr>';
ROLES.forEach(function (r) {
  h += '<tr><th>' + r + '</th>' + PERMS.map(function (p) {
    var on = (PRE[r] || []).indexOf(p) >= 0;
    return '<td><input type="checkbox" data-r="' + r + '" data-p="' + p + '"' + (on ? ' checked' : '') + '></td>';
  }).join('') + '</tr>';
});
m.innerHTML = h;
function direct(r, p) { return m.querySelector('[data-r="' + r + '"][data-p="' + p + '"]').checked; }
function can(u, p) {
  for (var r = UA[u]; r; r = JUNIOR[r]) if (direct(r, p)) return r;
  return null;
}
var TESTS = [
  ['carol', 'invoice:read', true], ['carol', 'invoice:create', false],
  ['dan', 'invoice:create', true], ['dan', 'invoice:read', true], ['dan', 'invoice:approve', false],
  ['erin', 'invoice:approve', true], ['erin', 'invoice:read', true], ['erin', 'invoice:delete', false],
];
document.getElementById('check').onclick = function () {
  var all = true;
  var out = '<table class="t" style="margin-top:8px;max-width:600px"><tr><th>Request</th><th>Expected</th><th>Got</th><th></th></tr>';
  TESTS.forEach(function (t) {
    var via = can(t[0], t[1]), got = !!via, ok = got === t[2];
    all = all && ok;
    out += '<tr><td>can ' + t[0] + ' <code>' + t[1] + '</code>?</td><td>' + (t[2] ? 'ALLOW' : 'DENY') + '</td><td>' +
      (got ? 'ALLOW <span class="muted">(via ' + via + ')</span>' : 'DENY') + '</td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  out += '</table>';
  var redundant = [];
  ROLES.forEach(function (r) {
    PERMS.forEach(function (p) {
      if (direct(r, p) && JUNIOR[r]) {
        for (var j = JUNIOR[r]; j; j = JUNIOR[j]) if (direct(j, p)) { redundant.push(r + ' → ' + p + ' (already inherited from ' + j + ')'); break; }
      }
    });
  });
  if (all && !redundant.length) out += '<div class="result pass pop">✅ All 8 requests behave as required, with no redundant grants. Each permission is granted once, at the most junior role that needs it, and inheritance does the rest.</div>';
  else if (all) out += '<div class="result pass pop">✅ All requests pass. 💡 Tidy-up: these ticks are redundant because of inheritance: ' + redundant.join('; ') + '.</div>';
  else out += '<div class="result fail pop">❌ Some requests are wrong. Hint: a manager inherits from accountant and viewer, so do not tick a permission on a junior role if a senior role must be denied it.</div>';
  document.getElementById('out').innerHTML = out;
};
</script>`;
  }

  L.push({
    id: 'rbac',
    section: SECTION,
    title: 'Role-Based Access Control (RBAC)',
    explain: `
      <p>ACLs attach people to resources one by one. <strong>RBAC</strong> adds a layer in the middle:
      <strong>roles</strong>. You give permissions to roles, and you give roles to users.</p>
      <pre><code>user ──(user assignment)──▶ role ──(permission assignment)──▶ permission
alice                           admin                              invoice:delete</code></pre>
      <p>Analogy: a company does not list every employee on every door. It says "staff badges open the office,
      manager badges also open the finance room", and then it hands out badges.</p>

      <h3>The NIST RBAC vocabulary</h3>
      <p>The standard model is the NIST RBAC model (ANSI/INCITS 359). Its terms are:</p>
      <ul>
        <li><strong>Users</strong>, <strong>Roles</strong>, and <strong>Permissions</strong>. A permission is an <em>operation on an object</em>, written like <code>invoice:delete</code>.</li>
        <li><strong>UA</strong> (user assignment, user ↔ role) and <strong>PA</strong> (permission assignment, role ↔ permission).</li>
        <li><strong>Sessions</strong>: the roles a user has <em>activated</em> right now (for example "assume admin role" in AWS or <code>sudo</code>).</li>
        <li><strong>Role hierarchy</strong> (Hierarchical RBAC): <code>admin ≥ editor ≥ viewer</code>, so a senior role inherits a junior role's permissions.</li>
        <li><strong>Separation of duty</strong>: <em>static</em> (SSD: a user may never hold both <code>payments-creator</code> and <code>payments-approver</code>)
        and <em>dynamic</em> (DSD: a user may hold both, but cannot activate them in the same session).</li>
      </ul>

      <h3>Where do roles come from?</h3>
      <p>Usually from the identity systems you already learned about:</p>
      <ul>
        <li><strong>OIDC / JWT</strong>: a <code>groups</code> or <code>roles</code> claim in the ID or access token. Microsoft Entra ID, for example, emits app roles in <code>roles</code> and group object IDs in <code>groups</code>.</li>
        <li><strong>SAML</strong>: an <code>&lt;Attribute Name="memberOf"&gt;</code> (or "groups", "Role") in the assertion.</li>
        <li><strong>LDAP / Active Directory</strong>: the user entry's <code>memberOf</code> attribute.</li>
      </ul>
      <p>The app then <strong>maps</strong> IdP groups to its own roles (<code>cn=finance-admins</code> → <code>admin</code>). The mapping belongs to the app. The IdP should not need to know your permission names.</p>

      <h3>The catch: role explosion</h3>
      <p>RBAC is great when access depends only on <em>what job you have</em>. It struggles when access depends on <em>which</em> record:
      "editors can edit invoices <em>of their own region</em>, <em>under 10k</em>". People then start creating
      <code>editor-EU</code>, <code>editor-EU-under10k</code>, <code>editor-US-readonly-Q3</code>… and soon there are more roles than users.
      That is <strong>role explosion</strong>, and it is the signal to add attributes (ABAC) or relationships (ReBAC).</p>
      <div class="tip">Check <strong>permissions</strong> in code, not role names: <code>can(user, 'invoice:delete')</code>, not <code>if (user.role === 'admin')</code>.
      Then adding a new role never requires a code change.</div>
    `,
    examples: [
      {
        title: 'RBAC simulator: users ↔ roles ↔ permissions, with live explanation',
        code: CSS + `
<div class="row">
  <div class="card col" style="flex:1.6">
    <h4>Permission assignment (PA): role → permissions</h4>
    <table class="t" id="pa" style="text-align:center"></table>
    <div class="small" style="margin-top:6px">
      <label><input type="checkbox" id="hier" checked> Role hierarchy: <b>admin ⊇ editor ⊇ viewer</b></label>
      <span class="muted">(<span style="color:#7c3aed">↑</span> = inherited)</span><br>
      <label><input type="checkbox" id="ssd" checked> SSD constraint: nobody may be both <b>editor</b> and <b>auditor</b></label>
    </div>
  </div>
  <div class="card col">
    <h4>User assignment (UA): user → roles</h4>
    <table class="t" id="ua" style="text-align:center"></table>
    <div id="ssdmsg" class="small" style="margin-top:4px"></div>
  </div>
</div>
<div class="card">
  <b>Ask:</b> can <select id="qu"></select> do <select id="qp"></select> ?
  <span id="verdict" style="margin-left:8px"></span>
  <pre class="trace" id="trace" style="margin-top:6px"></pre>
  <div class="small" style="margin-top:6px"><b>Who can do it?</b> <span id="who"></span></div>
</div>
<script>
var ROLES = ['viewer', 'editor', 'admin', 'auditor'];
var PERMS = ['invoice:read', 'invoice:create', 'invoice:update', 'invoice:delete', 'invoice:approve', 'report:read', 'user:manage'];
var USERS = ['alice', 'bob', 'carol', 'dan'];
var JUNIOR = { admin: 'editor', editor: 'viewer' };
var PA = { viewer: ['invoice:read'], editor: ['invoice:create', 'invoice:update'], admin: ['invoice:delete', 'invoice:approve', 'user:manage'],
  auditor: ['invoice:read', 'report:read'] };
var UA = { alice: ['admin'], bob: ['editor'], carol: ['viewer'], dan: ['auditor'] };
function $(i) { return document.getElementById(i); }
function hier() { return $('hier').checked; }
function chain(r) { var c = [r]; while (hier() && JUNIOR[c[c.length - 1]]) c.push(JUNIOR[c[c.length - 1]]); return c; }
function has(r, p) { return PA[r].indexOf(p) >= 0; }
function inherited(r, p) { var c = chain(r); for (var i = 1; i < c.length; i++) if (has(c[i], p)) return c[i]; return null; }
function drawPA() {
  var h = '<tr><th></th>' + PERMS.map(function (p) { return '<th style="font-size:11px"><code>' + p.replace(':', ':<br>') + '</code></th>'; }).join('') + '</tr>';
  ROLES.forEach(function (r) {
    h += '<tr><th>' + r + '</th>';
    PERMS.forEach(function (p) {
      var inh = !has(r, p) && inherited(r, p);
      h += '<td><input type="checkbox" data-r="' + r + '" data-p="' + p + '"' + (has(r, p) ? ' checked' : '') + '>' +
        (inh ? '<span style="color:#7c3aed" title="inherited from ' + inh + '">↑</span>' : '') + '</td>';
    });
    h += '</tr>';
  });
  $('pa').innerHTML = h;
}
function drawUA() {
  var h = '<tr><th></th>' + ROLES.map(function (r) { return '<th>' + r + '</th>'; }).join('') + '</tr>';
  USERS.forEach(function (u) {
    h += '<tr><th>' + u + '</th>' + ROLES.map(function (r) {
      return '<td><input type="checkbox" data-u="' + u + '" data-r="' + r + '"' + (UA[u].indexOf(r) >= 0 ? ' checked' : '') + '></td>';
    }).join('') + '</tr>';
  });
  $('ua').innerHTML = h;
}
function decide(u, p) {
  var lines = [], found = null;
  lines.push('<span class="c">// UA: ' + u + ' is assigned [' + UA[u].join(', ') + ']</span>');
  if (!UA[u].length) lines.push('<span class="y">' + u + ' has no roles at all</span>');
  UA[u].forEach(function (r) {
    var c = chain(r);
    if (c.length > 1) lines.push('<span class="c">// hierarchy: ' + c.join(' ⊇ ') + '</span>');
    c.forEach(function (rr, i) {
      var ok = has(rr, p);
      lines.push((i ? '   ↳ ' : '') + 'role ' + rr + (i ? ' (inherited)' : '') + ': PA contains ' + p + '? ' + (ok ? '<span class="g">yes</span>' : '<span class="c">no</span>'));
      if (ok && !found) found = [u].concat(c.slice(0, i + 1)).concat([p]);
    });
  });
  if (found) lines.push('<span class="g">→ ALLOW  path: ' + found.join(' → ') + '</span>');
  else lines.push('<span class="r">→ DENY  no role of ' + u + ' (incl. inherited) has ' + p + '</span>');
  return { ok: !!found, lines: lines };
}
function ssdCheck() {
  var bad = USERS.filter(function (u) { return UA[u].indexOf('editor') >= 0 && UA[u].indexOf('auditor') >= 0; });
  $('ssdmsg').innerHTML = $('ssd').checked && bad.length
    ? '<span class="bad">⛔ SSD violation: ' + bad.join(', ') + ' would be both editor and auditor (they could audit their own edits). Assignment rejected.</span>'
    : '<span class="muted">Try giving dan the editor role too.</span>';
  return bad;
}
function update() {
  var u = $('qu').value, p = $('qp').value, d = decide(u, p);
  $('trace').innerHTML = d.lines.join('\\n');
  $('verdict').innerHTML = '<span class="verdict pop ' + (d.ok ? 'ALLOW' : 'DENY') + '">' + (d.ok ? 'ALLOW' : 'DENY') + '</span>';
  $('who').innerHTML = USERS.map(function (x) { var ok = decide(x, p).ok; return '<span class="pill ' + (ok ? 'g' : 'r') + '">' + (ok ? '✓ ' : '✗ ') + x + '</span>'; }).join('');
}
$('qu').innerHTML = USERS.map(function (u) { return '<option>' + u + '</option>'; }).join('');
$('qp').innerHTML = PERMS.map(function (p) { return '<option>' + p + '</option>'; }).join('');
$('qp').value = 'invoice:read';
$('pa').addEventListener('change', function (e) {
  var r = e.target.dataset.r, p = e.target.dataset.p;
  if (e.target.checked) PA[r].push(p); else PA[r] = PA[r].filter(function (x) { return x !== p; });
  drawPA(); update();
});
$('ua').addEventListener('change', function (e) {
  var u = e.target.dataset.u, r = e.target.dataset.r;
  if (e.target.checked) UA[u].push(r); else UA[u] = UA[u].filter(function (x) { return x !== r; });
  if (ssdCheck().length && $('ssd').checked) {
    UA[u] = UA[u].filter(function (x) { return x !== r; });
    drawUA();
  }
  update();
});
$('hier').onchange = function () { drawPA(); update(); };
$('ssd').onchange = function () { ssdCheck(); };
$('qu').onchange = update;
$('qp').onchange = update;
drawPA(); drawUA(); ssdCheck(); update();
</script>`,
        explain: `
          <details>
            <summary>Step by step: "can alice do <code>invoice:read</code>?"</summary>
            <p>This is the default question when the widget loads. alice only has <code>admin</code>, and <code>admin</code>'s own row does not tick <code>invoice:read</code>.</p>
            <table>
              <tr><th>#</th><th>Trace line</th><th>Meaning</th></tr>
              <tr><td>1</td><td><code>UA: alice is assigned [admin]</code></td><td>Look up the user's roles.</td></tr>
              <tr><td>2</td><td><code>hierarchy: admin ⊇ editor ⊇ viewer</code></td><td>With hierarchy on, alice effectively also has editor and viewer.</td></tr>
              <tr><td>3</td><td><code>role admin: PA contains invoice:read? no</code></td><td>Not granted directly to admin.</td></tr>
              <tr><td>4</td><td><code>↳ role editor (inherited): … no</code></td><td>Keep walking down.</td></tr>
              <tr><td>5</td><td><code>↳ role viewer (inherited): … yes</code></td><td>Found it.</td></tr>
              <tr><td>6</td><td><code>ALLOW path: alice → admin → editor → viewer → invoice:read</code></td><td>The explanation you would show in an audit log.</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Untick <b>Role hierarchy</b> → alice can no longer read invoices. The ↑ marks disappear, and the "Who can do it?" row changes.</li>
              <li>Ask about <code>report:read</code>: only dan (auditor) can. To let alice read reports, you could tick it for admin, or give alice the auditor role. That is the RBAC design question: which role <em>should</em> own this?</li>
              <li>Tick <b>editor</b> for dan → rejected by the SSD constraint. Untick SSD and try again: now an auditor can edit the invoices they audit.</li>
              <li>Tick <code>invoice:delete</code> for <b>viewer</b> → everyone with any role in the hierarchy can delete. A single tick on a junior role spreads upward.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Where roles come from: OIDC claim, SAML attribute, LDAP memberOf',
        code: CSS + `
<div id="flow"></div>
<script>
var now = 1793441700;
var idt = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, {
  iss: 'https://login.acme.test', sub: 'alice', aud: 'invoices-web', exp: now + 300, iat: now,
  email: 'alice@acme.test', groups: ['finance-admins', 'all-staff']
}, 'demo-secret');
var p = Auth.jwtDecode(idt).payload;
var MAP = 'finance-admins → admin\\nfinance-editors → editor\\nall-staff → viewer';
Seq.mount('#flow', {
  title: 'The IdP says which groups you are in. The app maps groups to roles and checks permissions.',
  actors: [
    { id: 'b', label: 'Browser', icon: '🌐', store: {} },
    { id: 'app', label: 'Invoices app', icon: '🧾', store: { 'group→role map': 'finance-admins→admin · finance-editors→editor · all-staff→viewer' } },
    { id: 'idp', label: 'IdP / LDAP', icon: '🏛', store: {} },
  ],
  scenarios: [
    { name: '🪪 OIDC: groups claim', steps: [
      { from: 'idp', to: 'app', kind: 'back', label: 'token response (ID token)',
        msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id_token": "' + idt.slice(0, 60) + '…", "token_type": "Bearer", "expires_in": 300}',
        note: 'End of the OIDC code flow from lesson 6. The app receives an ID token. (Demo signs with HS256; real IdPs use RS256/ES256.)' },
      { from: 'app', to: 'app', label: 'decode → groups claim', hl: ['"groups"'],
        msg: '# decoded ID token payload\\n' + JSON.stringify(p, null, 2),
        note: 'The IdP put <code>groups</code> in the token because the app registration asked for it. In Microsoft Entra ID, app-specific roles arrive in a <code>roles</code> claim instead.',
        set: { app: { 'alice.groups': 'finance-admins, all-staff' } } },
      { from: 'app', to: 'app', label: 'map groups → roles', msg: '# app-owned mapping\\n' + MAP,
        note: 'The app translates IdP groups into <b>its own</b> roles. alice gets <code>admin</code> and <code>viewer</code>.',
        set: { app: { 'alice.roles': 'admin, viewer' } } },
      { from: 'b', to: 'app', label: 'DELETE /invoices/7', msg: 'DELETE /invoices/7 HTTP/1.1\\nHost: invoices.acme.test\\nCookie: __Host-sid=8f2c1e',
        note: 'Later, alice clicks Delete. The session cookie points to the stored roles.' },
      { from: 'app', to: 'app', label: "can(alice,'invoice:delete')", note: 'admin → <code>invoice:delete</code> ✓ (RBAC check from the simulator above).' },
      { from: 'app', to: 'b', kind: 'res', label: '204 No Content', msg: 'HTTP/1.1 204 No Content' },
    ]},
    { name: '📜 SAML: attribute', steps: [
      { from: 'b', to: 'app', kind: 'redirect', label: 'POST /saml/acs (assertion)', hl: ['memberOf', 'finance-editors'],
        msg: 'POST /saml/acs HTTP/1.1\\nHost: invoices.acme.test\\nContent-Type: application/x-www-form-urlencoded\\n\\nSAMLResponse=PHNhbWxwOlJlc3BvbnNl...\\n\\n# decoded (excerpt):\\n<saml:AttributeStatement>\\n  <saml:Attribute Name="memberOf">\\n    <saml:AttributeValue>finance-editors</saml:AttributeValue>\\n  </saml:Attribute>\\n</saml:AttributeStatement>',
        note: 'From the SAML lesson: the browser POSTs the signed assertion. Group membership travels as an <b>attribute</b>.' },
      { from: 'app', to: 'app', label: 'verify signature, map → editor', set: { app: { 'bob.roles': 'editor' } },
        note: 'After verifying the XML signature, the app maps <code>finance-editors</code> → <code>editor</code>.' },
      { from: 'b', to: 'app', label: 'DELETE /invoices/7', msg: 'DELETE /invoices/7 HTTP/1.1\\nHost: invoices.acme.test\\nCookie: __Host-sid=41aa0c' },
      { from: 'app', to: 'app', kind: 'err', label: "can(bob,'invoice:delete') ✗", note: 'editor has create/update only. Deny.' },
      { from: 'app', to: 'b', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: application/json\\n\\n{"error": "forbidden", "required": "invoice:delete"}' },
    ]},
    { name: '📇 LDAP: memberOf lookup', steps: [
      { from: 'b', to: 'app', label: 'POST /login', msg: 'POST /login HTTP/1.1\\nHost: invoices.acme.test\\nContent-Type: application/x-www-form-urlencoded\\n\\nusername=carol&password=••••••',
        note: 'An internal app that authenticates against LDAP / AD directly (LDAP lesson).' },
      { from: 'app', to: 'idp', kind: 'back', label: 'search (uid=carol) memberOf',
        msg: 'SearchRequest\\nbaseObject: ou=people,dc=acme,dc=test\\nscope: wholeSubtree\\nfilter: (uid=carol)\\nattributes: memberOf', hl: ['memberOf'],
        note: 'After the bind succeeds, the app reads the user\\'s <code>memberOf</code> attribute.' },
      { from: 'idp', to: 'app', kind: 'back', label: 'entry + memberOf',
        msg: 'SearchResultEntry\\ndn: uid=carol,ou=people,dc=acme,dc=test\\nmemberOf: cn=all-staff,ou=groups,dc=acme,dc=test',
        set: { app: { 'carol.roles': 'viewer' } }, note: 'Only <code>all-staff</code> → role viewer.' },
      { from: 'b', to: 'app', label: 'GET /invoices/7', msg: 'GET /invoices/7 HTTP/1.1\\nHost: invoices.acme.test\\nCookie: __Host-sid=c09e77' },
      { from: 'app', to: 'b', kind: 'res', label: '200 OK (viewer may read)', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": 7, "total": 1250.00, "status": "open"}' },
    ]},
  ],
});
</script>`,
      },
    ],
    quiz: [
      { q: 'In NIST RBAC, what does "PA" stand for?',
        options: ['Policy Administration', 'Permission Assignment (role ↔ permission)', 'Principal Authentication', 'Privileged Access'], answer: 1,
        why: 'UA = user assignment (user ↔ role), PA = permission assignment (role ↔ permission).' },
      { q: 'Hierarchy admin ⊇ editor ⊇ viewer. You grant <code>invoice:export</code> to <b>viewer</b>. Who can export?',
        options: ['Only viewers', 'Viewers, editors and admins', 'Only admins', 'Nobody until you also tick it for admin'], answer: 1,
        why: 'Senior roles inherit junior roles’ permissions, so a grant on a junior role spreads upward to every senior role.' },
      { q: 'Which code is the better RBAC check?',
        options: ['<code>if (user.role === "admin")</code>', '<code>if (can(user, "invoice:delete"))</code>', '<code>if (user.name === "alice")</code>', '<code>if (req.body.isAdmin)</code>'], answer: 1,
        why: 'Checking a permission keeps role design out of the code, so you can add roles without code changes. Trusting <code>req.body.isAdmin</code> lets the client choose its own role.' },
      { q: '"Nobody may hold both payments-creator and payments-approver." What is this called?',
        options: ['Role explosion', 'Static separation of duty (SSD)', 'Least privilege', 'Deny overrides'], answer: 1,
        why: 'SSD constrains user-to-role assignment so that one person cannot complete a sensitive process alone.' },
      { q: 'Your app now has roles like <code>editor-EU-under10k</code> and <code>viewer-US-Q3-only</code>. What is the likely fix?',
        options: ['Add more roles', 'Move the "which record" conditions into attributes/relationships (ABAC/ReBAC)', 'Give everyone admin', 'Switch to Basic auth'], answer: 1,
        why: 'This is role explosion: roles are being used to encode data conditions. Keep roles coarse and express record conditions as attributes or relationships.' },
    ],
    exercise: {
      task: `<p>Tick the role → permission boxes in the box below so that all 8 access requests behave as required, then click <strong>Check</strong>.
        For a perfect score, grant each permission only once and let the hierarchy do the rest.</p>`,
      hint: 'Start from the most junior role: what does carol (viewer) need? dan adds one more on top. erin adds one more on top of dan. Nobody may delete.',
      starter: mkRbacEx({ manager: ['invoice:delete'] }),
      solution: mkRbacEx({ viewer: ['invoice:read'], accountant: ['invoice:create'], manager: ['invoice:approve'] }),
    },
  });

  // ---------- Lesson 4 exercise generator (ABAC hospital policy) ----------
  function mkAbacEx(pre) {
    return CSS + `
<div class="card">
  <h4>🏥 Policy: "Doctors may read medical records of patients in their own ward, while on shift. VIP records need VIP access."</h4>
  <div class="row">
    <div class="col small">
      <b>Rule P (PERMIT, action = read)</b>: tick the conditions that must ALL be true:
      <div id="cl" style="font:12.5px ui-monospace,Menlo,monospace;margin-top:4px"></div>
    </div>
    <div class="col small">
      <b>Rule D (DENY, fixed)</b>:<br><code>resource.vip == true AND subject.vip_access == false</code>
      <div style="margin-top:10px"><b>Combining algorithm</b><br><select id="alg">
        <option value="deny-overrides">deny-overrides</option>
        <option value="permit-overrides">permit-overrides</option>
        <option value="first-applicable">first-applicable (P listed first)</option>
      </select></div>
    </div>
  </div>
  <div style="margin-top:8px"><button class="primary" id="check">Check</button></div>
  <div id="out"></div>
</div>
<script>
var CL = [
  ['a', 'subject.role == "doctor"', function (q) { return q.s.role === 'doctor'; }],
  ['b', 'subject.role == "nurse"', function (q) { return q.s.role === 'nurse'; }],
  ['c', 'subject.ward == resource.ward', function (q) { return q.s.ward === q.r.ward; }],
  ['d', 'env.on_shift == true', function (q) { return q.e.on_shift; }],
  ['e', 'resource.patient_id == subject.id', function (q) { return q.r.patient === q.s.id; }],
  ['f', 'subject.clearance >= 2', function (q) { return q.s.clearance >= 2; }],
];
var PRE = ` + JSON.stringify(pre) + `;
var box = document.getElementById('cl');
CL.forEach(function (c) {
  box.innerHTML += '<label style="display:block"><input type="checkbox" value="' + c[0] + '"' + (PRE.clauses.indexOf(c[0]) >= 0 ? ' checked' : '') + '> ' + c[1] + '</label>';
});
document.getElementById('alg').value = PRE.alg;
function S(id, role, ward, clr, vip) { return { id: id, role: role, ward: ward, clearance: clr, vip_access: vip }; }
var TESTS = [
  ['dr.lee reads ward-A record, on shift', { s: S('dr.lee', 'doctor', 'A', 1, false), r: { ward: 'A', vip: false, patient: 'p1' }, e: { on_shift: true } }, true],
  ['nurse.kim reads ward-A record, on shift', { s: S('nurse.kim', 'nurse', 'A', 2, false), r: { ward: 'A', vip: false, patient: 'p1' }, e: { on_shift: true } }, false],
  ['dr.lee reads a ward-B record', { s: S('dr.lee', 'doctor', 'A', 1, false), r: { ward: 'B', vip: false, patient: 'p2' }, e: { on_shift: true } }, false],
  ['dr.lee off shift (Sunday 3 am)', { s: S('dr.lee', 'doctor', 'A', 1, false), r: { ward: 'A', vip: false, patient: 'p1' }, e: { on_shift: false } }, false],
  ['dr.lee reads a VIP record (no VIP access)', { s: S('dr.lee', 'doctor', 'A', 1, false), r: { ward: 'A', vip: true, patient: 'p3' }, e: { on_shift: true } }, false],
  ['dr.ng (VIP access) reads a VIP record', { s: S('dr.ng', 'doctor', 'A', 3, true), r: { ward: 'A', vip: true, patient: 'p3' }, e: { on_shift: true } }, true],
];
document.getElementById('check').onclick = function () {
  var on = [].slice.call(box.querySelectorAll('input:checked')).map(function (c) { return c.value; });
  var alg = document.getElementById('alg').value, all = true;
  var h = '<table class="t" style="margin-top:8px"><tr><th>Request</th><th>P</th><th>D</th><th>Decision</th><th>Expected</th><th></th></tr>';
  TESTS.forEach(function (t) {
    var q = t[1];
    var p = CL.filter(function (c) { return on.indexOf(c[0]) >= 0; }).every(function (c) { return c[2](q); });
    var d = q.r.vip && !q.s.vip_access;
    var dec;
    if (alg === 'deny-overrides') dec = d ? false : p;
    else if (alg === 'permit-overrides') dec = p ? true : false;
    else dec = p ? true : false;
    var ok = dec === t[2];
    all = all && ok;
    h += '<tr><td>' + t[0] + '</td><td>' + (p ? 'applies' : '—') + '</td><td>' + (d ? 'applies' : '—') + '</td><td>' +
      (dec ? 'ALLOW' : 'DENY') + '</td><td>' + (t[2] ? 'ALLOW' : 'DENY') + '</td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  h += '</table>';
  h += all ? '<div class="result pass pop">✅ All 6 requests are correct. A permit rule built from attributes, plus a deny rule that always wins (deny-overrides): that is the classic, safe ABAC pattern.</div>'
    : '<div class="result fail pop">❌ Some requests are wrong. Look at which row fails: is a condition missing (too permissive), extra (too strict), or is the DENY rule losing to the PERMIT?</div>';
  document.getElementById('out').innerHTML = h;
};
</script>`;
  }

  L.push({
    id: 'abac',
    section: SECTION,
    title: 'Attribute-Based Access Control (ABAC)',
    explain: `
      <p>RBAC asks only <em>"what role do you have?"</em>. Real rules often depend on much more:
      <em>"managers may approve expenses <strong>of their own department</strong>, <strong>under 5,000</strong>,
      <strong>during business hours</strong>"</em>. Roles alone cannot express that without exploding.</p>
      <p><strong>ABAC</strong> (described in NIST SP 800-162) makes decisions from <strong>attributes</strong>, which are facts about the four parts of the question:</p>
      <table>
        <tr><th>Category</th><th>Example attributes</th><th>Typical source (PIP)</th></tr>
        <tr><td><strong>Subject</strong></td><td>role, department, clearance, country, employment type</td><td>token claims, HR system, directory</td></tr>
        <tr><td><strong>Resource</strong></td><td>owner, department, amount, classification, region</td><td>the database row itself</td></tr>
        <tr><td><strong>Action</strong></td><td>view, approve, export</td><td>the HTTP method + route</td></tr>
        <tr><td><strong>Environment</strong></td><td>time of day, IP / network, MFA used, device posture</td><td>the request, the token (<code>amr</code>/<code>acr</code>)</td></tr>
      </table>
      <p>A policy is a set of <strong>rules</strong>. Each rule has an <em>effect</em> (PERMIT or DENY) and a <em>condition</em> over attributes:</p>
      <pre><code>PERMIT approve expense
  WHEN subject.role == "manager"
   AND subject.dept == resource.dept
   AND resource.amount &lt; 5000
   AND 9 &lt;= env.hour &lt; 17</code></pre>
      <p>RBAC is really a special case of ABAC with only one attribute (<code>subject.role</code>).</p>

      <h3>When several rules match: combining algorithms</h3>
      <p>Most real requests match more than one rule, sometimes with opposite effects. A <strong>combining algorithm</strong>
      (the term comes from XACML) decides which one wins:</p>
      <ul>
        <li><strong>deny-overrides</strong>: if any matching rule says DENY, the result is DENY. This is the safest default and the one most systems use (Cedar's <code>forbid</code> always beats <code>permit</code>).</li>
        <li><strong>permit-overrides</strong>: any PERMIT wins. Use it carefully, because one broad permit can cancel every safety rule.</li>
        <li><strong>first-applicable</strong>: rules are checked in order and the first one that matches decides (like firewall rules). Then the order of the rules matters.</li>
      </ul>
      <p>If no rule matches, the PDP returns <em>NotApplicable</em>, and the PEP must treat that as DENY.</p>
      <div class="tip">The usual pattern: write <strong>permit</strong> rules for the business ("who may do what"), add <strong>deny</strong> rules for guardrails
      ("never approve your own expense", "big amounts need MFA"), and combine with deny-overrides.</div>
      <div class="warn">Attributes must come from a trusted source. <code>?dept=finance</code> in the query string is <em>not</em> a subject attribute.
      Take it from the verified token or a server-side lookup.</div>
    `,
    examples: [
      {
        title: 'ABAC policy evaluator with combining algorithms',
        code: CSS + `
<div class="row small">
  <div class="card col"><h4>👤 Subject</h4>
    role <select id="role"><option>employee</option><option selected>manager</option><option>finance-director</option></select><br>
    dept <select id="sdept"><option selected>sales</option><option>eng</option><option>finance</option></select><br>
    clearance <select id="clr"><option value="1">1 public</option><option value="2" selected>2 internal</option><option value="3">3 confidential</option></select><br>
    country <select id="country"><option selected>AU</option><option>US</option><option>DE</option></select>
  </div>
  <div class="card col"><h4>🧾 Resource: expense E-881</h4>
    submitted by <select id="owner"><option value="other" selected>a colleague</option><option value="me">me (the subject)</option></select><br>
    dept <select id="rdept"><option selected>sales</option><option>eng</option><option>finance</option></select><br>
    amount <input id="amount" type="number" value="4200" style="width:90px"><br>
    classification <select id="cls"><option>public</option><option selected>internal</option><option>confidential</option></select><br>
    region <select id="region"><option selected>APAC</option><option>US</option><option>EU</option></select>
  </div>
  <div class="card col"><h4>🌍 Environment &amp; action</h4>
    hour <input id="hour" type="range" min="0" max="23" value="10" style="width:110px"> <b id="hv"></b><br>
    <label><input type="checkbox" id="mfa" checked> MFA used this session</label><br>
    action <select id="action"><option selected>approve</option><option>view</option></select><br>
    algorithm <select id="alg"><option>deny-overrides</option><option>permit-overrides</option><option>first-applicable</option></select>
  </div>
</div>
<div class="small" style="margin:-2px 0 6px"><b>Presets:</b>
  <button data-p="normal">✅ Normal approval</button><button data-p="own">🙋 Own expense</button><button data-p="late">🌙 Late night</button>
  <button data-p="nomfa">🔓 No MFA</button><button data-p="dir">💰 Director, 12k</button><button data-p="secret">🔒 Confidential view</button>
</div>
<table class="t" id="rules"></table>
<div class="card" style="margin-top:8px;display:flex;gap:12px;align-items:center">
  <div id="verdict"></div><div id="why" class="small"></div>
</div>
<script>
function $(i) { return document.getElementById(i); }
var LVL = { public: 1, internal: 2, confidential: 3 };
var EU = ['DE'];
function C(label, f) { return [label, f]; }
var RULES = [
  { id: 'R1', eff: 'PERMIT', name: 'Managers approve same-dept expenses < 5000 in business hours', conds: [
    C('action = approve', function (q) { return [q.action === 'approve', q.action]; }),
    C('role = manager', function (q) { return [q.role === 'manager', q.role]; }),
    C('subject.dept = resource.dept', function (q) { return [q.sdept === q.rdept, q.sdept + ' vs ' + q.rdept]; }),
    C('amount < 5000', function (q) { return [q.amount < 5000, q.amount]; }),
    C('9 ≤ hour < 17', function (q) { return [q.hour >= 9 && q.hour < 17, q.hour + 'h']; }) ] },
  { id: 'R2', eff: 'PERMIT', name: 'Finance directors approve any expense', conds: [
    C('action = approve', function (q) { return [q.action === 'approve', q.action]; }),
    C('role = finance-director', function (q) { return [q.role === 'finance-director', q.role]; }) ] },
  { id: 'R3', eff: 'PERMIT', name: 'Staff view expenses of their own dept', conds: [
    C('action = view', function (q) { return [q.action === 'view', q.action]; }),
    C('subject.dept = resource.dept', function (q) { return [q.sdept === q.rdept, q.sdept + ' vs ' + q.rdept]; }) ] },
  { id: 'R4', eff: 'DENY', name: 'No self-approval', conds: [
    C('action = approve', function (q) { return [q.action === 'approve', q.action]; }),
    C('resource.owner = subject', function (q) { return [q.owner === 'me', q.owner === 'me' ? 'yes' : 'no']; }) ] },
  { id: 'R5', eff: 'DENY', name: 'Classification above clearance', conds: [
    C('level(classification) > clearance', function (q) { return [LVL[q.cls] > q.clr, LVL[q.cls] + ' > ' + q.clr]; }) ] },
  { id: 'R6', eff: 'DENY', name: 'Approvals ≥ 1000 need MFA', conds: [
    C('action = approve', function (q) { return [q.action === 'approve', q.action]; }),
    C('amount ≥ 1000', function (q) { return [q.amount >= 1000, q.amount]; }),
    C('no MFA', function (q) { return [!q.mfa, q.mfa ? 'mfa ✓' : 'no mfa']; }) ] },
  { id: 'R7', eff: 'DENY', name: 'EU expenses only from staff in the EU', conds: [
    C('region = EU', function (q) { return [q.region === 'EU', q.region]; }),
    C('country ∉ EU', function (q) { return [EU.indexOf(q.country) < 0, q.country]; }) ] },
];
var off = {};
function read() {
  return { role: $('role').value, sdept: $('sdept').value, clr: +$('clr').value, country: $('country').value,
    owner: $('owner').value, rdept: $('rdept').value, amount: +$('amount').value, cls: $('cls').value, region: $('region').value,
    hour: +$('hour').value, mfa: $('mfa').checked, action: $('action').value };
}
function evalAll() {
  var q = read();
  $('hv').textContent = q.hour + ':00';
  var res = RULES.map(function (r) {
    var cs = r.conds.map(function (c) { var o = c[1](q); return { label: c[0], ok: o[0], val: o[1] }; });
    return { r: r, cs: cs, applies: !off[r.id] && cs.every(function (c) { return c.ok; }) };
  });
  var alg = $('alg').value, app = res.filter(function (x) { return x.applies; });
  var dec = 'NA', by = [], why = '';
  var denies = app.filter(function (x) { return x.r.eff === 'DENY'; }), permits = app.filter(function (x) { return x.r.eff === 'PERMIT'; });
  if (alg === 'deny-overrides') {
    if (denies.length) { dec = 'DENY'; by = denies; why = 'deny-overrides: at least one DENY rule applies, so it wins'; }
    else if (permits.length) { dec = 'ALLOW'; by = permits; why = 'deny-overrides: no DENY applies, and a PERMIT does'; }
  } else if (alg === 'permit-overrides') {
    if (permits.length) { dec = 'ALLOW'; by = permits; why = 'permit-overrides: a PERMIT applies, so it wins' + (denies.length ? ' ⚠ even though ' + denies.map(function (x) { return x.r.id; }).join(',') + ' said DENY' : ''); }
    else if (denies.length) { dec = 'DENY'; by = denies; why = 'permit-overrides: no PERMIT, but a DENY applies'; }
  } else if (app.length) {
    by = [app[0]]; dec = app[0].r.eff === 'PERMIT' ? 'ALLOW' : 'DENY';
    why = 'first-applicable: ' + app[0].r.id + ' is the first rule (top to bottom) that applies';
  }
  if (dec === 'NA') why = 'NotApplicable: no rule applies → the PEP treats it as DENY (deny by default)';
  var h = '<tr><th style="width:52px">order</th><th>rule</th><th>conditions (✓ true / ✗ false, with the actual value)</th><th>status</th></tr>';
  res.forEach(function (x, i) {
    var won = by.indexOf(x) >= 0;
    h += '<tr style="' + (won ? 'background:' + (x.r.eff === 'PERMIT' ? '#dcfce7' : '#fee2e2') : '') + (off[x.r.id] ? ';opacity:.45' : '') + '">' +
      '<td><button data-up="' + i + '" title="move up" style="padding:0 5px">▲</button><input type="checkbox" data-off="' + x.r.id + '"' + (off[x.r.id] ? '' : ' checked') + ' title="enable rule"></td>' +
      '<td><span class="pill ' + (x.r.eff === 'PERMIT' ? 'g' : 'r') + '">' + x.r.id + ' ' + x.r.eff + '</span> ' + x.r.name + '</td><td>' +
      x.cs.map(function (c) { return '<span class="pill ' + (c.ok ? 'g' : 'r') + '">' + (c.ok ? '✓ ' : '✗ ') + c.label + ' <i style="opacity:.7">(' + c.val + ')</i></span>'; }).join(' ') +
      '</td><td><b>' + (off[x.r.id] ? 'off' : x.applies ? 'APPLIES' : '—') + '</b>' + (won ? ' 🏁' : '') + '</td></tr>';
  });
  $('rules').innerHTML = h;
  var shown = dec === 'NA' ? 'DENY' : dec;
  $('verdict').innerHTML = '<span class="verdict pop ' + (dec === 'NA' ? 'NA' : dec) + '">' + (dec === 'NA' ? 'NotApplicable → DENY' : shown) + '</span>';
  $('why').innerHTML = '<b>' + why + '</b>' + (by.length ? '<br>decided by: ' + by.map(function (x) { return x.r.id; }).join(', ') : '') +
    '<br><span class="muted">applying rules: ' + (app.map(function (x) { return x.r.id + ' ' + x.r.eff; }).join(', ') || 'none') + '</span>';
}
var PRESETS = {
  normal: {},
  own: { owner: 'me' },
  late: { hour: 22 },
  nomfa: { mfa: false },
  dir: { role: 'finance-director', sdept: 'finance', amount: 12000 },
  secret: { action: 'view', cls: 'confidential' },
};
var BASE = { role: 'manager', sdept: 'sales', clr: '2', country: 'AU', owner: 'other', rdept: 'sales', amount: 4200, cls: 'internal',
  region: 'APAC', hour: 10, mfa: true, action: 'approve' };
document.querySelectorAll('[data-p]').forEach(function (b) {
  b.onclick = function () {
    var p = Object.assign({}, BASE, PRESETS[b.dataset.p]);
    Object.keys(p).forEach(function (k) { if (k === 'mfa') $(k).checked = p[k]; else $(k).value = p[k]; });
    evalAll();
  };
});
document.querySelectorAll('select, input').forEach(function (e) { e.addEventListener('input', evalAll); e.addEventListener('change', evalAll); });
$('rules').addEventListener('click', function (e) {
  var t = e.target;
  if (t.dataset.up !== undefined) {
    var i = +t.dataset.up;
    if (i > 0) { var x = RULES[i]; RULES[i] = RULES[i - 1]; RULES[i - 1] = x; }
    evalAll();
  }
  if (t.dataset.off) { off[t.dataset.off] = !t.checked; evalAll(); }
});
evalAll();
</script>`,
        explain: `
          <details>
            <summary>The problem: one request, several rules, opposite answers</summary>
            <p>Kim is a sales manager. She clicks <b>Approve</b> on expense E-881 for 4,200, but <em>she submitted it herself</em>.
            R1 ("managers approve same-dept expenses &lt; 5000") is true for her, and so is R4 ("no self-approval").
            One rule says PERMIT and the other says DENY. The combining algorithm decides who wins, and the wrong choice turns a guardrail into decoration.</p>
          </details>
          <details>
            <summary>Step by step: click <b>🙋 Own expense</b>, then switch the algorithm</summary>
            <table>
              <tr><th>#</th><th>Rule</th><th>Conditions in the widget</th><th>Status</th></tr>
              <tr><td>1</td><td>R1 PERMIT</td><td>✓ action = approve (approve) ✓ role = manager ✓ subject.dept = resource.dept (sales vs sales) ✓ amount &lt; 5000 (4200) ✓ 9 ≤ hour &lt; 17 (10h)</td><td>APPLIES</td></tr>
              <tr><td>2</td><td>R2 PERMIT</td><td>✗ role = finance-director (manager)</td><td>—</td></tr>
              <tr><td>3</td><td>R3 PERMIT</td><td>✗ action = view (approve)</td><td>—</td></tr>
              <tr><td>4</td><td>R4 DENY</td><td>✓ action = approve ✓ resource.owner = subject (yes)</td><td>APPLIES</td></tr>
              <tr><td>5</td><td>R5 DENY</td><td>✗ level(classification) &gt; clearance (2 &gt; 2)</td><td>—</td></tr>
              <tr><td>6</td><td>R6 DENY</td><td>✓ action ✓ amount ≥ 1000 ✗ no MFA (mfa ✓)</td><td>—</td></tr>
              <tr><td>7</td><td>R7 DENY</td><td>✗ region = EU (APAC)</td><td>—</td></tr>
            </table>
            <p>Applying rules are <b>R1 PERMIT</b> and <b>R4 DENY</b>. The result now depends only on the algorithm:</p>
            <table>
              <tr><th>Algorithm</th><th>Verdict</th><th>Why (as shown in the widget)</th></tr>
              <tr><td>deny-overrides</td><td>DENY</td><td>at least one DENY rule applies, so it wins (decided by R4)</td></tr>
              <tr><td>permit-overrides</td><td>ALLOW ⚠</td><td>a PERMIT applies, so it wins, even though R4 said DENY</td></tr>
              <tr><td>first-applicable</td><td>ALLOW ⚠</td><td>R1 is the first rule (top to bottom) that applies</td></tr>
            </table>
            <p>Now press ▲ on R4 three times so it sits above R1: first-applicable becomes DENY. With first-applicable, <em>rule order is part of your security</em>.</p>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>Each rule is an <b>AND</b> of conditions. One ✗ means the rule does not apply. It does <em>not</em> mean "deny".</li>
              <li>"No rule applies" (<b>🌙 Late night</b>: R1 fails only on the hour) is <em>NotApplicable</em>. The PEP turns it into DENY.</li>
              <li>Guardrails (R4–R7) only work under deny-overrides, or under first-applicable when they are listed first.</li>
              <li>Attributes come from three places: the subject (token / HR), the resource (DB row), and the environment (clock, MFA claim).</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li><b>🔓 No MFA</b>: R1 and R6 both apply. Compare deny-overrides with permit-overrides.</li>
              <li><b>💰 Director, 12k</b>: R1 fails (amount, role) but R2 applies → ALLOW. Then set "submitted by" to <em>me</em>: is a director allowed to approve their own 12k expense under deny-overrides?</li>
              <li><b>🔒 Confidential view</b>: R3 permits viewing, R5 denies (3 &gt; 2). Raise clearance to 3 → ALLOW.</li>
              <li>Set region = EU and country = AU with action view → R7 blocks. Switch country to DE.</li>
              <li>Untick R4 (the checkbox next to ▲) and click Own expense: without the guardrail, self-approval goes through under every algorithm.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Animated: the PDP fetches missing attributes (PIP) and evaluates',
        code: CSS + `
<div id="flow"></div>
<script>
function evalReq(time) {
  return 'POST /access/v1/evaluation HTTP/1.1\\nHost: pdp.internal\\nContent-Type: application/json\\n\\n' + JSON.stringify({
    subject: { type: 'user', id: 'kim', properties: { mfa: true } },
    action: { name: 'approve' },
    resource: { type: 'expense', id: 'E-881', properties: { owner: 'sam', dept: 'sales', amount: 4200, classification: 'internal' } },
    context: { time: time }
  }, null, 2);
}
function steps(time, ok) {
  var hh = time.slice(11, 16);
  var s = [
    { from: 'c', to: 'api', label: 'POST /expenses/E-881/approve', msg: 'POST /expenses/E-881/approve HTTP/1.1\\nHost: expenses.acme.test\\nAuthorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJraW0iLCJhbXIiOlsicHdkIiwib3RwIl19.c2ln',
      note: 'Kim (sub=kim) approves an expense at <b>' + hh + '</b>. Her token\\'s <code>amr</code> claim says she used a password + OTP (MFA).' },
    { from: 'api', to: 'api', label: 'load expense E-881 (resource attrs)', set: { api: { 'E-881': 'owner=sam dept=sales 4200 internal' } },
      note: 'The PEP loads the resource from its DB. Its <b>resource attributes</b> come from the row itself.' },
    { from: 'api', to: 'pdp', label: 'evaluation request', msg: evalReq(time), hl: ['"properties"', '"time"'],
      note: 'Subject id + MFA, resource attributes, and environment (time) go to the PDP. The subject\\'s <b>dept</b> and <b>role</b> are missing.' },
    { from: 'pdp', to: 'pip', kind: 'back', label: 'GET /employees/kim', msg: 'GET /employees/kim HTTP/1.1\\nHost: hr.internal\\nAccept: application/json' },
    { from: 'pip', to: 'pdp', kind: 'back', label: '200 {role, dept, country}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "kim", "role": "manager", "dept": "sales", "country": "AU", "clearance": 2}',
      set: { pdp: { kim: 'manager · sales · AU · clr 2' } } },
  ];
  if (ok) {
    s.push({ from: 'pdp', to: 'pdp', label: 'R1 ✓  R4 ✗  R6 ✗ → PERMIT', note: 'R1: approve ✓ manager ✓ sales = sales ✓ 4200 &lt; 5000 ✓ 10h in 9–17 ✓. No DENY rule applies (owner is sam, MFA used).', set: { pdp: { decision: 'PERMIT by R1' } } });
    s.push({ from: 'pdp', to: 'api', kind: 'res', label: '{"decision": true}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"decision": true, "context": {"reason": "R1 manager same-dept < 5000"}}' });
    s.push({ from: 'api', to: 'c', kind: 'res', label: '200 approved', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "E-881", "status": "approved", "approved_by": "kim"}' });
  } else {
    s.push({ from: 'pdp', to: 'pdp', kind: 'err', label: 'R1 ✗ (hour 22) → NotApplicable', note: 'Everything matches except <code>9 ≤ hour &lt; 17</code>. No rule applies → NotApplicable → deny by default. Same user, same expense: only an <b>environment</b> attribute changed.', set: { pdp: { decision: 'NotApplicable → DENY' } } });
    s.push({ from: 'pdp', to: 'api', kind: 'res', label: '{"decision": false}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"decision": false, "context": {"reason": "outside business hours"}}' });
    s.push({ from: 'api', to: 'c', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: application/json\\n\\n{"error": "forbidden", "message": "Approvals are only allowed 09:00-17:00"}' });
  }
  return s;
}
Seq.mount('#flow', {
  actors: [
    { id: 'c', label: "Kim's browser", icon: '🌐', store: {} },
    { id: 'api', label: 'Expense API (PEP)', icon: '🛡', store: {} },
    { id: 'pdp', label: 'PDP', icon: '⚖️', store: { policy: 'R1..R7 (deny-overrides)' } },
    { id: 'pip', label: 'HR system (PIP)', icon: '📇', store: { kim: 'manager, sales' } },
  ],
  scenarios: [
    { name: '✅ 10:15 · approve 4200', steps: steps('2026-10-31T10:15:00+11:00', true) },
    { name: '❌ 22:40 · same request', steps: steps('2026-10-31T22:40:00+11:00', false) },
  ],
});
</script>`,
      },
    ],
    quiz: [
      { q: 'Which of these is an <em>environment</em> attribute?',
        options: ['subject.department', 'resource.amount', 'whether MFA was used / time of day', 'action = approve'], answer: 2,
        why: 'Environment (context) attributes describe the situation of the request: time, network, device, authentication strength.' },
      { q: 'R1 PERMITs and R4 DENYs the same request. Under <b>deny-overrides</b>, the decision is…',
        options: ['ALLOW', 'DENY', 'NotApplicable', 'Depends on rule order'], answer: 1,
        why: 'Deny-overrides: any applicable DENY wins. Rule order only matters for first-applicable.' },
      { q: 'No rule applies to a request. What should the PEP do?',
        options: ['Allow, since nothing forbids it', 'Deny (NotApplicable is treated as deny)', 'Retry until a rule applies', 'Return 500'], answer: 1,
        why: 'Deny by default. NotApplicable means "no policy covers this", which must not mean "go ahead".' },
      { q: 'Why does ABAC avoid RBAC’s role explosion?',
        options: ['It has no roles at all', 'Conditions like "same dept" or "amount &lt; 5000" are evaluated from attributes instead of encoded in role names',
          'It caches decisions', 'It uses JWTs'], answer: 1,
        why: 'One rule "subject.dept == resource.dept" replaces a role per department. Roles can still exist, as just another attribute.' },
      { q: 'An API reads <code>dept</code> from a request header <code>X-Dept</code> sent by the browser and uses it in ABAC rules. What is wrong?',
        options: ['Nothing', 'Headers are slow', 'The client controls that value, so it is not a trusted attribute', 'ABAC cannot use strings'], answer: 2,
        why: 'Subject attributes must come from a trusted source: verified token claims or a server-side lookup (PIP).' },
    ],
    exercise: {
      task: `<p>Build the hospital policy in the box below. Tick the conditions of the PERMIT rule, choose a combining algorithm, then click <strong>Check</strong>.
        All 6 test requests must get the expected decision.</p>`,
      hint: 'The policy sentence has three parts: doctors, own ward, on shift. Clearance and patient_id are not mentioned. The VIP DENY must beat the PERMIT.',
      starter: mkAbacEx({ clauses: ['a'], alg: 'permit-overrides' }),
      solution: mkAbacEx({ clauses: ['a', 'c', 'd'], alg: 'deny-overrides' }),
    },
  });

  // ReBAC (Zanzibar-style) engine shared by the ReBAC example and exercise.
  const REBAC_ENGINE = `
var MODEL = {
  user: {},
  group: { member: { computed: [], ttu: [] } },
  folder: {
    parent: { computed: [], ttu: [] },
    owner: { computed: [], ttu: [] },
    editor: { computed: ['owner'], ttu: [['parent', 'editor']] },
    viewer: { computed: ['editor'], ttu: [['parent', 'viewer']] }
  },
  doc: {
    parent: { computed: [], ttu: [] },
    owner: { computed: [], ttu: [] },
    editor: { computed: ['owner'], ttu: [['parent', 'editor']] },
    viewer: { computed: ['editor'], ttu: [['parent', 'viewer']] }
  }
};
var MODEL_DSL = [
  'model',
  '  schema 1.1',
  'type user',
  'type group',
  '  relations',
  '    define member: [user, group#member]',
  'type folder',
  '  relations',
  '    define parent: [folder]',
  '    define owner: [user]',
  '    define editor: [user, group#member] or owner or editor from parent',
  '    define viewer: [user, group#member] or editor or viewer from parent',
  'type doc',
  '  relations',
  '    define parent: [folder]',
  '    define owner: [user]',
  '    define editor: [user, group#member] or owner or editor from parent',
  '    define viewer: [user, group#member] or editor or viewer from parent'
].join('\\n');

function isObjRef(s) {
  var i = s.indexOf(':');
  return i > 0 && i < s.length - 1 && MODEL.hasOwnProperty(s.slice(0, i));
}
// "doc:plan#viewer@group:eng#member" -> { obj, rel, subj, subjRel }
function parseTuples(text) {
  var out = [], errors = [];
  text.split('\\n').forEach(function (raw, n) {
    var line = raw.trim();
    if (!line || line.indexOf('//') === 0) return;
    var at = line.indexOf('@');
    var left = at > 0 ? line.slice(0, at) : '', right = at > 0 ? line.slice(at + 1) : '';
    var h = left.indexOf('#');
    var obj = h > 0 ? left.slice(0, h) : '', rel = h > 0 ? left.slice(h + 1) : '';
    var h2 = right.indexOf('#');
    var subj = h2 > 0 ? right.slice(0, h2) : right, subjRel = h2 > 0 ? right.slice(h2 + 1) : '';
    var type = obj.split(':')[0];
    if (!obj || !rel || !subj || !isObjRef(obj) || !isObjRef(subj)) {
      errors.push('line ' + (n + 1) + ': expected  type:id#relation@type:id[#relation]  got "' + line + '"');
      return;
    }
    if (!MODEL[type][rel]) { errors.push('line ' + (n + 1) + ': type "' + type + '" has no relation "' + rel + '"'); return; }
    if (subjRel && !MODEL[subj.split(':')[0]][subjRel]) { errors.push('line ' + (n + 1) + ': unknown userset "' + right + '"'); return; }
    out.push({ i: out.length, obj: obj, rel: rel, subj: subj, subjRel: subjRel, text: line });
  });
  return { tuples: out, errors: errors };
}

// Zanzibar-style Check with a trace of every step (for the animation).
function runCheck(tuples, obj, rel, user) {
  var trace = [], seen = {};
  function log(d, t, cls, node, edge) { trace.push({ d: d, t: t, cls: cls || '', node: node, edge: edge === undefined ? -1 : edge }); }
  function check(o, r, d) {
    var key = o + '#' + r;
    log(d, 'Check ' + key + ' @ ' + user + ' ?', 'b', o);
    if (seen[key]) { log(d + 1, 'already visited ' + key + ' (cycle guard) → skip', 'c', o); return null; }
    if (d > 24) { log(d + 1, 'depth limit reached', 'r', o); return null; }
    seen[key] = 1;
    var type = o.split(':')[0], def = MODEL[type] && MODEL[type][r];
    if (!def) { log(d + 1, 'type ' + type + ' has no relation ' + r, 'r', o); return null; }
    var direct = tuples.filter(function (t) { return t.obj === o && t.rel === r; });
    var users = direct.filter(function (t) { return !t.subjRel; });
    for (var k = 0; k < users.length; k++) {
      if (users[k].subj === user) {
        log(d + 1, '✓ direct tuple ' + users[k].text, 'g', o, users[k].i);
        return [users[k].i];
      }
    }
    if (users.length) log(d + 1, 'direct users on ' + key + ': ' + users.map(function (t) { return t.subj; }).join(', ') + ' (not ' + user + ')', 'c', o);
    var sets = direct.filter(function (t) { return t.subjRel; });
    for (var s = 0; s < sets.length; s++) {
      var t = sets[s];
      log(d + 1, 'userset ' + t.subj + '#' + t.subjRel + ' is ' + r + ' of ' + o + ' → is ' + user + ' in it?', 'y', o, t.i);
      var p = check(t.subj, t.subjRel, d + 2);
      if (p) return [t.i].concat(p);
    }
    if (!direct.length) log(d + 1, 'no direct tuples for ' + key, 'c', o);
    for (var c = 0; c < def.computed.length; c++) {
      log(d + 1, 'rewrite: every ' + def.computed[c] + ' is also ' + r + ' → check ' + o + '#' + def.computed[c], 'y', o);
      var p2 = check(o, def.computed[c], d + 2);
      if (p2) return p2;
    }
    for (var u = 0; u < def.ttu.length; u++) {
      var ts = def.ttu[u][0], tr = def.ttu[u][1];
      var links = tuples.filter(function (x) { return x.obj === o && x.rel === ts; });
      if (!links.length) log(d + 1, 'rewrite: ' + r + ' from ' + ts + ' → ' + o + ' has no ' + ts, 'c', o);
      for (var w = 0; w < links.length; w++) {
        log(d + 1, 'rewrite: ' + r + ' from ' + ts + ' → ' + o + ' ' + ts + ' is ' + links[w].subj + ' → check ' + links[w].subj + '#' + tr, 'y', o, links[w].i);
        var p3 = check(links[w].subj, tr, d + 2);
        if (p3) return [links[w].i].concat(p3);
      }
    }
    log(d + 1, '✗ ' + key + ' does not reach ' + user, 'r', o);
    return null;
  }
  var path = check(obj, rel, 0);
  log(0, path ? 'ALLOWED ✓  {"allowed": true}' : 'DENIED ✗  {"allowed": false}', path ? 'g' : 'r', path ? user : obj);
  return { allowed: !!path, path: path || [], trace: trace };
}
`;

  const REBAC_DEFAULT = [
    'group:eng#member@user:alice',
    'group:eng#member@group:interns#member',
    'group:interns#member@user:carl',
    'folder:q3#viewer@group:eng#member',
    'doc:plan#parent@folder:q3',
    'doc:plan#owner@user:bob',
  ].join('\n');

  // Graph drawing helper for ReBAC widgets (SVG string built by concatenation).
  const REBAC_GRAPH = `
var COLS = { doc: 0, folder: 1, group: 2, user: 3 };
var COLNAME = ['📄 docs', '📁 folders', '👥 groups', '🙂 users'];
var NW = 150, NH = 30, CW = 240, ROWH = 46;
function layout(tuples, extra) {
  var pos = {}, perCol = [0, 0, 0, 0];
  function add(n) {
    if (pos[n]) return;
    var c = COLS[n.split(':')[0]];
    pos[n] = { x: 18 + c * CW, y: 34 + perCol[c] * ROWH, col: c };
    perCol[c]++;
  }
  tuples.forEach(function (t) { add(t.obj); add(t.subj); });
  (extra || []).forEach(add);
  return { pos: pos, h: 34 + Math.max.apply(null, perCol.concat([1])) * ROWH + 4 };
}
function drawGraph(svg, tuples, extra, st) {
  var L = layout(tuples, extra), P = L.pos;
  st = st || {};
  var COLOR = { def: '#b8bfd0', vis: '#7c8db5', cur: '#f59e0b', path: '#16a34a' };
  var h = '<defs>';
  Object.keys(COLOR).forEach(function (k) {
    h += '<marker id="m-' + k + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="' + COLOR[k] + '"/></marker>';
  });
  h += '</defs>';
  COLNAME.forEach(function (n, i) {
    h += '<text x="' + (18 + i * CW + NW / 2) + '" y="16" text-anchor="middle" font-size="12" fill="#646b80" font-weight="600">' + n + '</text>';
  });
  tuples.forEach(function (t) {
    var a = P[t.obj], b = P[t.subj];
    var k = st.path && st.path.indexOf(t.i) >= 0 ? 'path' : st.curEdge === t.i ? 'cur' : st.visEdges && st.visEdges[t.i] ? 'vis' : 'def';
    var w = k === 'path' ? 3.5 : k === 'cur' ? 3 : k === 'vis' ? 2 : 1.3;
    var d, lx, ly;
    if (a.col === b.col) {
      var x = a.x + NW, y1 = a.y + NH / 2, y2 = b.y + NH / 2;
      d = 'M' + x + ',' + y1 + ' C' + (x + 70) + ',' + y1 + ' ' + (x + 70) + ',' + y2 + ' ' + (x + 4) + ',' + y2;
      lx = x + 54; ly = (y1 + y2) / 2;
    } else {
      var x1 = a.x + NW, yA = a.y + NH / 2, x2 = b.x - 3, yB = b.y + NH / 2;
      d = 'M' + x1 + ',' + yA + ' L' + x2 + ',' + yB;
      lx = (x1 + x2) / 2; ly = (yA + yB) / 2;
    }
    var lab = t.rel + (t.subjRel ? ' (#' + t.subjRel + ')' : '');
    h += '<path d="' + d + '" fill="none" stroke="' + COLOR[k] + '" stroke-width="' + w + '" marker-end="url(#m-' + k + ')"' +
      (k === 'cur' ? ' stroke-dasharray="6 4"' : '') + '/>';
    h += '<text x="' + lx + '" y="' + (ly - 4) + '" text-anchor="middle" font-size="11" fill="' + (k === 'def' ? '#8a90a2' : COLOR[k]) +
      '" font-weight="' + (k === 'def' ? 400 : 700) + '" paint-order="stroke" stroke="#fbfcfe" stroke-width="4">' + lab + '</text>';
  });
  Object.keys(P).forEach(function (n) {
    var p = P[n];
    var k = st.pathNodes && st.pathNodes[n] ? 'path' : st.curNode === n ? 'cur' : st.visNodes && st.visNodes[n] ? 'vis' : 'def';
    var fill = { def: '#fff', vis: '#eef2ff', cur: '#fef3c7', path: '#dcfce7' }[k];
    h += '<rect x="' + p.x + '" y="' + p.y + '" width="' + NW + '" height="' + NH + '" rx="8" fill="' + fill + '" stroke="' + COLOR[k] +
      '" stroke-width="' + (k === 'def' ? 1.3 : 2.5) + '"/>';
    h += '<text x="' + (p.x + NW / 2) + '" y="' + (p.y + 19) + '" text-anchor="middle" font-size="12.5" font-family="ui-monospace,Menlo,monospace">' + n + '</text>';
  });
  svg.setAttribute('viewBox', '0 0 980 ' + L.h);
  svg.innerHTML = h;
}
`;

  function mkRebacEx(text) {
    return CSS + `
<div class="row">
  <div class="card col" style="max-width:420px">
    <h4>✍️ Your relation tuples</h4>
    <textarea id="tx" rows="11" spellcheck="false" style="width:100%;box-sizing:border-box;font:12.5px ui-monospace,Menlo,monospace"></textarea>
    <button class="primary" id="check">Check</button>
    <div id="err" class="small bad"></div>
  </div>
  <div class="card col">
    <h4>Requirements</h4>
    <ol class="small" style="margin:0;padding-left:18px">
      <li><code>doc:roadmap</code> lives inside <code>folder:product</code>.</li>
      <li>Designers (<b>dana</b>, <b>finn</b>) can <b>view</b> the doc and the folder.</li>
      <li>Grant access <b>to the group on the folder</b>: no tuple may give a user access to <code>folder:product</code> or <code>doc:roadmap</code> directly.</li>
      <li>dana must <b>not</b> be an editor. erin (sales) must not see it.</li>
    </ol>
    <svg id="g" style="width:100%;margin-top:6px;background:#fbfcfe;border:1px solid #e2e5ee;border-radius:8px"></svg>
  </div>
</div>
<div id="out"></div>
<script>
` + REBAC_ENGINE + REBAC_GRAPH + `
var tx = document.getElementById('tx');
tx.value = ` + JSON.stringify(text) + `;
function draw() { var p = parseTuples(tx.value); drawGraph(document.getElementById('g'), p.tuples, [], {}); }
tx.addEventListener('input', draw);
draw();
var TESTS = [
  ['user:dana', 'viewer', 'doc:roadmap', true],
  ['user:finn', 'viewer', 'doc:roadmap', true],
  ['user:dana', 'viewer', 'folder:product', true],
  ['user:dana', 'editor', 'doc:roadmap', false],
  ['user:erin', 'viewer', 'doc:roadmap', false],
];
document.getElementById('check').onclick = function () {
  var p = parseTuples(tx.value);
  document.getElementById('err').innerHTML = p.errors.join('<br>');
  var all = !p.errors.length;
  var h = '<div class="card"><table class="t"><tr><th>Check(user, relation, object)</th><th>Expected</th><th>Got</th><th>Path found</th><th></th></tr>';
  TESTS.forEach(function (t) {
    var r = runCheck(p.tuples, t[2], t[1], t[0]), ok = r.allowed === t[3];
    all = all && ok;
    var path = r.path.map(function (i) { return p.tuples[i].text; }).join('  →  ');
    h += '<tr><td><code>Check(' + t[0] + ', ' + t[1] + ', ' + t[2] + ')</code></td><td>' + t[3] + '</td><td>' + r.allowed + '</td><td class="small"><code>' +
      (path || '—') + '</code></td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  var direct = p.tuples.filter(function (t) {
    return (t.obj === 'doc:roadmap' || t.obj === 'folder:product') && t.subj.indexOf('user:') === 0;
  });
  var dOk = !direct.length;
  all = all && dOk;
  h += '<tr><td>No direct user grants on folder:product / doc:roadmap</td><td>none</td><td>' + (direct.length ? direct.map(function (t) { return t.text; }).join(', ') : 'none') +
    '</td><td></td><td>' + (dOk ? '✅' : '❌') + '</td></tr></table>';
  h += all ? '<div class="result pass pop">✅ Every check passes. When the next designer joins, one tuple (<code>group:design#member@user:new</code>) gives them every doc in the folder, and every future doc you add to it.</div>'
    : '<div class="result fail pop">❌ Not yet. Write tuples as <code>object#relation@subject</code>. A group as subject is <code>group:design#member</code>.</div>';
  document.getElementById('out').innerHTML = h + '</div>';
};
</script>`;
  }

  L.push({
    id: 'rebac',
    section: SECTION,
    title: 'Relationship-Based Access (ReBAC) & Zanzibar',
    explain: `
      <p>Think about Google Drive. You can view a document because you are in a group, the group was given access to a
      folder, and the document is inside that folder. No role says "alice: viewer of plan.docx". Access <em>follows relationships</em>.</p>
      <p><strong>ReBAC</strong> stores those relationships as a graph and answers "may alice view plan?" by
      <strong>searching the graph for a path</strong> from the document to alice.</p>

      <h3>Zanzibar: Google's design</h3>
      <p>Google published <em>"Zanzibar: Google's Consistent, Global Authorization System"</em> (USENIX ATC 2019). It serves Drive, YouTube,
      Calendar, Cloud and more. Its central idea is the <strong>relation tuple</strong>:</p>
      <pre><code>⟨object⟩#⟨relation⟩@⟨user⟩

doc:plan#owner@user:bob                  bob is owner of doc:plan
folder:q3#viewer@group:eng#member        every member of group:eng is viewer of folder:q3
group:eng#member@user:alice              alice is a member of group:eng
doc:plan#parent@folder:q3                doc:plan is inside folder:q3</code></pre>
      <p>A subject like <code>group:eng#member</code> is a <strong>userset</strong>: "everyone who has relation <em>member</em> on group:eng".</p>

      <h3>The model: rewrite rules</h3>
      <p>Tuples are only facts. The <strong>authorization model</strong> (Zanzibar calls it the namespace config) says how relations imply each other.
      In OpenFGA's DSL:</p>
      <pre><code>type doc
  relations
    define parent: [folder]
    define owner: [user]
    define editor: [user, group#member] or owner or editor from parent
    define viewer: [user, group#member] or editor or viewer from parent</code></pre>
      <ul>
        <li><code>[user, group#member]</code>: <em>direct</em> tuples of this relation, with users or usersets as subjects.</li>
        <li><code>or editor</code>: a <em>computed userset</em>. Every editor is automatically a viewer.</li>
        <li><code>viewer from parent</code>: a <em>tuple-to-userset</em>. Viewers of my parent folder are my viewers. This is how folder sharing reaches nested files.</li>
      </ul>
      <p>The main API call is <strong>Check(user, relation, object)</strong> → allowed true/false. There are also Read, Write, Expand
      (show the whole tree of who has access) and ListObjects ("which docs can alice view?").</p>

      <h3>Tools you can use today</h3>
      <ul>
        <li><strong>OpenFGA</strong>: open source and a CNCF project, started by Auth0/Okta. HTTP + gRPC API.</li>
        <li><strong>SpiceDB</strong> by AuthZed: open source, with its own schema language (<code>definition doc { relation viewer: user  permission view = viewer + parent-&gt;view }</code>).</li>
        <li>Also: Ory Keto, Permify, and managed services such as Auth0 FGA.</li>
      </ul>

      <h3>The "new enemy" problem (briefly)</h3>
      <p>Alice removes Bob from a folder, then adds a secret doc to it. If the authorization check runs on a <em>stale</em> replica that still has Bob's old
      tuple, Bob can see the new secret doc. Zanzibar fixes this with <strong>zookies</strong>: opaque consistency tokens returned on writes. You store one with the
      content, and later checks must be evaluated at a snapshot <em>at least as fresh</em> as that token. SpiceDB calls them <strong>ZedTokens</strong>.</p>
      <div class="tip">ReBAC also covers RBAC: <code>role:admin#assignee@user:alice</code> is just another tuple. It shines when access depends on
      <em>ownership, sharing, hierarchy and teams</em>, which describes most multi-user SaaS apps.</div>
    `,
    examples: [
      {
        title: 'Tuples → graph → animated Check() traversal',
        code: CSS + `
<div class="card" style="padding:6px">
  <svg id="g" style="width:100%;background:#fbfcfe;border-radius:8px"></svg>
</div>
<div class="card" style="padding:8px 12px">
  <b>Check(</b> <input id="cu" value="user:alice" list="ul" style="width:110px">,
  <select id="cr"><option>viewer</option><option>editor</option><option>owner</option><option>member</option></select>,
  <select id="co"></select> <b>)</b>
  <button class="primary" id="run">▶ Run check</button><button id="step">Step ▶</button><button id="reset">⏮</button>
  <span id="verdict"></span>
  <datalist id="ul"></datalist>
</div>
<div class="row">
  <div style="width:300px;flex:none">
    <h4>Relation tuples <span class="muted small">(object#relation@subject)</span></h4>
    <textarea id="tx" rows="8" spellcheck="false" style="width:100%;box-sizing:border-box;font:11.5px ui-monospace,Menlo,monospace"></textarea>
    <button id="apply">Apply tuples</button>
    <div id="err" class="small bad"></div>
    <details class="small"><summary>Authorization model (OpenFGA DSL)</summary><pre class="trace" id="dsl" style="max-height:170px"></pre></details>
  </div>
  <div class="col" style="flex:1.6"><h4>Traversal trace <span class="muted small" id="cnt"></span></h4><pre class="trace" id="tr" style="max-height:250px;font-size:11.5px"></pre></div>
  <div class="col" style="min-width:200px"><h4>Same check via OpenFGA HTTP API</h4><pre class="trace" id="api" style="max-height:250px;font-size:11px"></pre></div>
</div>
<script>
` + REBAC_ENGINE + REBAC_GRAPH + `
function $(i) { return document.getElementById(i); }
$('tx').value = ` + JSON.stringify(REBAC_DEFAULT) + `;
$('dsl').textContent = MODEL_DSL;
var T = [], R = null, idx = -1, timer = null;
function apply() {
  var p = parseTuples($('tx').value);
  T = p.tuples;
  $('err').innerHTML = p.errors.join('<br>');
  var objs = {}, users = {};
  T.forEach(function (t) {
    [t.obj, t.subj].forEach(function (n) { if (n.indexOf('user:') === 0) users[n] = 1; else objs[n] = 1; });
  });
  var cur = $('co').value;
  $('co').innerHTML = Object.keys(objs).sort().map(function (o) { return '<option>' + o + '</option>'; }).join('');
  if (objs[cur]) $('co').value = cur; else if (objs['doc:plan']) $('co').value = 'doc:plan';
  $('ul').innerHTML = Object.keys(users).map(function (u) { return '<option value="' + u + '">'; }).join('');
  reset();
}
function prepare() {
  R = runCheck(T, $('co').value, $('cr').value, $('cu').value.trim());
  var body = { tuple_key: { user: $('cu').value.trim(), relation: $('cr').value, object: $('co').value },
    authorization_model_id: '01JD3B7X9Q2M8K4T6V0N5RZC1H' };
  $('api').innerHTML = '<span class="b">POST /stores/01JD3B5W0P7E2A9F3C6H8KQ4MN/check</span>\\nContent-Type: application/json\\n\\n' +
    JSON.stringify(body, null, 2) + '\\n\\n<span class="c">// response (after the animation):</span>\\n<span id="apires" class="c">…</span>';
}
function render() {
  var st = { visNodes: {}, visEdges: {}, curNode: null, curEdge: -1 };
  var lines = [];
  for (var i = 0; i <= idx && R; i++) {
    var e = R.trace[i];
    st.visNodes[e.node] = 1;
    if (e.edge >= 0) st.visEdges[e.edge] = 1;
    var pad = new Array(e.d + 1).join('  ');
    var txt = pad + e.t;
    lines.push(i === idx ? '<span style="background:#334155;display:inline-block;width:100%" class="' + e.cls + '">' + txt + '</span>' : '<span class="' + e.cls + '">' + txt + '</span>');
    if (i === idx) { st.curNode = e.node; st.curEdge = e.edge; }
  }
  var done = R && idx === R.trace.length - 1;
  if (done) {
    st.path = R.path;
    st.pathNodes = {};
    R.path.forEach(function (k) { st.pathNodes[T[k].obj] = 1; st.pathNodes[T[k].subj] = 1; });
    if (R.allowed) st.pathNodes[$('cu').value.trim()] = 1;
    st.curEdge = -1; st.curNode = null;
    var pth = R.path.map(function (k) { return T[k].text; });
    lines.push('');
    lines.push(R.allowed ? '<span class="g">path: ' + pth.join('\\n      → ') + '</span>' : '<span class="r">no path from ' + $('co').value + '#' + $('cr').value + ' to ' + $('cu').value + '</span>');
    $('verdict').innerHTML = '<span class="verdict pop ' + (R.allowed ? 'ALLOW' : 'DENY') + '">' + (R.allowed ? 'allowed: true' : 'allowed: false') + '</span>';
    var ar = document.getElementById('apires');
    if (ar) { ar.className = R.allowed ? 'g' : 'r'; ar.textContent = 'HTTP/1.1 200 OK\\n' + JSON.stringify({ allowed: R.allowed, resolution: '' }, null, 2); }
  } else $('verdict').innerHTML = '';
  $('tr').innerHTML = lines.length ? lines.join('\\n') : '<span class="c">Press ▶ Run check (auto) or Step ▶ (one step at a time).</span>';
  var trEl = $('tr');
  trEl.scrollTop = trEl.scrollHeight;
  $('cnt').textContent = R && idx >= 0 ? 'step ' + (idx + 1) + ' / ' + R.trace.length : '';
  var extra = [$('cu').value.trim()].filter(function (u) { return u.indexOf('user:') === 0; });
  drawGraph($('g'), T, extra, st);
}
function reset() { clearInterval(timer); timer = null; idx = -1; prepare(); render(); }
function step() { if (!R) prepare(); if (idx < R.trace.length - 1) { idx++; render(); } else { clearInterval(timer); timer = null; } }
$('apply').onclick = apply;
$('step').onclick = function () { clearInterval(timer); timer = null; step(); };
$('reset').onclick = reset;
$('run').onclick = function () { reset(); timer = setInterval(step, 420); };
['cu', 'cr', 'co'].forEach(function (i) { $(i).addEventListener('change', reset); });
apply();
</script>`,
        explain: `
          <details>
            <summary>The problem: access that follows sharing, folders and teams</summary>
            <p>No tuple says "alice can view doc:plan". alice is in <code>group:eng</code>, eng members can view <code>folder:q3</code>,
            and <code>doc:plan</code> is inside q3. With an ACL you would copy alice onto every doc in every folder. With RBAC you would need a role per folder.
            ReBAC stores only these 6 facts and <em>derives</em> the answer by walking the graph. Add a doc to q3 and the whole of eng can view it, without any extra tuple per person.</p>
          </details>
          <details>
            <summary>Step by step: <code>Check(user:alice, viewer, doc:plan)</code> (the default)</summary>
            <p>Click <b>Step ▶</b> repeatedly. The trace lines (grouped here) light up the graph: orange = being explored, blue = visited, green = the final path.</p>
            <table>
              <tr><th>Trace lines</th><th>What the engine is doing</th><th>Graph</th></tr>
              <tr><td><code>Check doc:plan#viewer @ user:alice ?</code><br><code>no direct tuples for doc:plan#viewer</code></td><td>Look for a tuple <code>doc:plan#viewer@…</code>. There is none.</td><td>doc:plan orange</td></tr>
              <tr><td><code>rewrite: every editor is also viewer → check doc:plan#editor</code> … <code>rewrite: every owner is also editor</code> … <code>direct users on doc:plan#owner: user:bob (not user:alice)</code></td><td>Computed usersets: viewer ⊇ editor ⊇ owner. The only owner is bob.</td><td>owner edge to bob visited</td></tr>
              <tr><td><code>rewrite: editor from parent → doc:plan parent is folder:q3 → check folder:q3#editor</code> … <code>✗ folder:q3#editor does not reach user:alice</code></td><td>Tuple-to-userset: editors of the parent folder are editors of the doc. q3 has no editors.</td><td>parent edge, folder:q3 visited</td></tr>
              <tr><td><code>✗ doc:plan#editor does not reach user:alice</code></td><td>The whole "editor" branch failed. Back to viewer.</td><td></td></tr>
              <tr><td><code>rewrite: viewer from parent → doc:plan parent is folder:q3 → check folder:q3#viewer</code></td><td>Second tuple-to-userset: viewers of q3 are viewers of plan.</td><td>parent edge orange</td></tr>
              <tr><td><code>userset group:eng#member is viewer of folder:q3 → is user:alice in it?</code></td><td>The tuple <code>folder:q3#viewer@group:eng#member</code> points to a userset, so recurse into group:eng.</td><td>viewer (#member) edge orange</td></tr>
              <tr><td><code>✓ direct tuple group:eng#member@user:alice</code><br><code>ALLOWED ✓ {"allowed": true}</code></td><td>Found. The search stops at the first successful path.</td><td>doc:plan → folder:q3 → group:eng → user:alice green</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li>A Check is a <b>graph search</b>. Tuples are edges, and the model's rewrite rules say which edges you may follow.</li>
              <li>Three ways to reach a user: a <b>direct</b> tuple, a <b>computed userset</b> (<code>or editor</code>), and a <b>tuple-to-userset</b> (<code>viewer from parent</code>).</li>
              <li>Nested groups work for free: <code>group:eng#member@group:interns#member</code> makes every intern an eng member.</li>
              <li>Real engines (OpenFGA, SpiceDB) explore branches in parallel and cache sub-results. The demo explores them in order so you can follow along.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Change the user to <code>user:carl</code> and Run: the path goes through <em>two</em> groups (interns → eng).</li>
              <li><code>user:bob</code> → short path: owner ⇒ editor ⇒ viewer, all on doc:plan.</li>
              <li><code>user:eve</code> → DENIED. Watch the engine try every branch and skip already-visited ones (<code>cycle guard</code>).</li>
              <li>Add the tuples <code>folder:q3#parent@folder:company</code> and <code>folder:company#viewer@user:dana</code>, click Apply, and check dana: access comes from the grand-parent folder.</li>
              <li>Ask <code>Check(user:alice, editor, doc:plan)</code> → false. Viewing access does not imply editing.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Animated: OpenFGA write + check, and the new-enemy problem',
        code: CSS + `
<div id="flow"></div>
<script>
var STORE = '01JD3B5W0P7E2A9F3C6H8KQ4MN', MODEL_ID = '01JD3B7X9Q2M8K4T6V0N5RZC1H';
function j(o) { return JSON.stringify(o, null, 2); }
function rel(type, id, relation, st, sid) {
  return { resource: { objectType: type, objectId: id }, relation: relation, subject: { object: { objectType: st, objectId: sid } } };
}
var chk = function (consistency) {
  var b = { resource: { objectType: 'folder', objectId: 'secret' }, permission: 'view', subject: { object: { objectType: 'user', objectId: 'bob' } } };
  return Object.assign({ consistency: consistency }, b);
};
Seq.mount('#flow', {
  actors: [
    { id: 'a', label: 'Alice (browser)', icon: '👩', store: {} },
    { id: 'b', label: 'Bob (browser)', icon: '🧑', store: {} },
    { id: 'app', label: 'Docs app', icon: '📄', store: {} },
    { id: 'z', label: 'Authz service', icon: '🕸', store: { tuples: 'doc:plan#parent@folder:q3 · group:eng#member@user:alice', 'folder:secret#viewer@user:bob': '✓' } },
  ],
  scenarios: [
    { name: '✅ OpenFGA: share a folder, then check', steps: [
      { from: 'a', to: 'app', label: 'share folder q3 with eng', msg: 'POST /folders/q3/shares HTTP/1.1\\nHost: docs.acme.test\\nContent-Type: application/json\\n\\n{"group": "eng", "role": "viewer"}',
        note: 'Alice clicks "Share with the eng group". The app turns that into <b>one tuple</b>.' },
      { from: 'app', to: 'z', kind: 'back', label: 'POST /stores/{id}/write', hl: ['"writes"'],
        msg: 'POST /stores/' + STORE + '/write HTTP/1.1\\nHost: openfga.internal:8080\\nContent-Type: application/json\\n\\n' +
          j({ writes: { tuple_keys: [{ user: 'group:eng#member', relation: 'viewer', object: 'folder:q3' }] }, authorization_model_id: MODEL_ID }),
        set: { z: { 'new tuple': 'folder:q3#viewer@group:eng#member' } },
        note: 'OpenFGA tuple keys are written as <code>{user, relation, object}</code>, the same fact as <code>folder:q3#viewer@group:eng#member</code>.' },
      { from: 'z', to: 'app', kind: 'back', label: '200 {}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{}' },
      { from: 'b', to: 'app', label: 'GET /docs/plan', msg: 'GET /docs/plan HTTP/1.1\\nHost: docs.acme.test\\nCookie: __Host-sid=bob-7c1e',
        note: 'Bob (not in eng) tries to open the doc.' },
      { from: 'app', to: 'z', kind: 'back', label: 'POST /stores/{id}/check', hl: ['"user:bob"'],
        msg: 'POST /stores/' + STORE + '/check HTTP/1.1\\nHost: openfga.internal:8080\\nContent-Type: application/json\\n\\n' +
          j({ tuple_key: { user: 'user:bob', relation: 'viewer', object: 'doc:plan' }, authorization_model_id: MODEL_ID }) },
      { from: 'z', to: 'z', label: 'graph search: no path to bob', note: 'Same traversal as the widget above: plan → q3 → eng members. bob is not one.' },
      { from: 'z', to: 'app', kind: 'back', label: '{"allowed": false}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"allowed": false, "resolution": ""}', hl: ['false'] },
      { from: 'app', to: 'b', kind: 'err', label: '404 Not Found', msg: 'HTTP/1.1 404 Not Found\\nContent-Type: text/html\\n\\n<h1>Document not found</h1>',
        note: 'The app answers 404 rather than 403, so Bob does not even learn that the doc exists.' },
      { from: 'a', to: 'app', label: 'GET /docs/plan (alice)', msg: 'GET /docs/plan HTTP/1.1\\nHost: docs.acme.test\\nCookie: __Host-sid=alice-91ab' },
      { from: 'app', to: 'z', kind: 'back', label: 'check user:alice viewer doc:plan',
        msg: 'POST /stores/' + STORE + '/check HTTP/1.1\\nHost: openfga.internal:8080\\nContent-Type: application/json\\n\\n' +
          j({ tuple_key: { user: 'user:alice', relation: 'viewer', object: 'doc:plan' }, authorization_model_id: MODEL_ID }) },
      { from: 'z', to: 'app', kind: 'back', label: '{"allowed": true}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"allowed": true, "resolution": ""}', hl: ['true'] },
      { from: 'app', to: 'a', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK\\nContent-Type: text/html\\n\\n<h1>Q3 plan</h1>' },
    ]},
    { name: '⚠️ New enemy (stale check)', steps: [
      { from: 'a', to: 'app', label: 'remove bob from folder:secret', msg: 'DELETE /folders/secret/shares/bob HTTP/1.1\\nHost: docs.acme.test',
        note: 'Alice removes Bob, who is about to become an "enemy" of the folder.' },
      { from: 'app', to: 'z', kind: 'back', label: 'delete tuple (SpiceDB)',
        msg: 'POST /v1/relationships/write HTTP/1.1\\nHost: spicedb.internal:8443\\nAuthorization: Bearer sk_spicedb_preshared\\nContent-Type: application/json\\n\\n' +
          j({ updates: [{ operation: 'OPERATION_DELETE', relationship: rel('folder', 'secret', 'viewer', 'user', 'bob') }] }),
        set: { z: { 'folder:secret#viewer@user:bob': null } } },
      { from: 'z', to: 'app', kind: 'back', label: '200 writtenAt', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + j({ writtenAt: { token: 'GhUKEzE3OTM0NDE3MDAwMDAwMDAwMDA=' } }),
        note: 'The write returns a consistency token, but this app <b>throws it away</b>.' },
      { from: 'a', to: 'app', label: 'upload layoffs.pdf into folder:secret', msg: 'POST /folders/secret/docs HTTP/1.1\\nHost: docs.acme.test\\nContent-Type: application/pdf\\n\\n%PDF-1.7 …' },
      { from: 'b', to: 'app', label: 'GET /folders/secret', msg: 'GET /folders/secret HTTP/1.1\\nHost: docs.acme.test\\nCookie: __Host-sid=bob-7c1e' },
      { from: 'app', to: 'z', kind: 'back', label: 'check, minimizeLatency', hl: ['minimizeLatency'],
        msg: 'POST /v1/permissions/check HTTP/1.1\\nHost: spicedb.internal:8443\\nAuthorization: Bearer sk_spicedb_preshared\\nContent-Type: application/json\\n\\n' + j(chk({ minimizeLatency: true })) },
      { from: 'z', to: 'z', kind: 'err', label: 'served from a cached, older snapshot',
        note: 'For speed, the check is evaluated on a snapshot from a few seconds ago, <b>before</b> the delete. In that snapshot, Bob is still a viewer.' },
      { from: 'z', to: 'app', kind: 'back', label: 'HAS_PERMISSION 😱', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + j({ checkedAt: { token: 'GhUKEzE3OTM0NDE2OTUwMDAwMDAwMDA=' }, permissionship: 'PERMISSIONSHIP_HAS_PERMISSION' }) },
      { from: 'app', to: 'b', kind: 'err', label: '200: list incl. layoffs.pdf', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n["budget.xlsx", "layoffs.pdf"]',
        note: '<b>New enemy problem</b>: an ACL change and a content change were applied in the wrong order from the checker\\'s point of view.' },
    ]},
    { name: '✅ Fixed with a zookie / ZedToken', steps: [
      { from: 'app', to: 'z', kind: 'back', label: 'delete tuple → writtenAt token',
        msg: 'POST /v1/relationships/write HTTP/1.1\\nHost: spicedb.internal:8443\\nContent-Type: application/json\\n\\n' + j({ updates: [{ operation: 'OPERATION_DELETE', relationship: rel('folder', 'secret', 'viewer', 'user', 'bob') }] }),
        set: { z: { 'folder:secret#viewer@user:bob': null } } },
      { from: 'z', to: 'app', kind: 'back', label: '200 writtenAt', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + j({ writtenAt: { token: 'GhUKEzE3OTM0NDE3MDAwMDAwMDAwMDA=' } }),
        set: { app: { 'folder:secret zookie': 'GhUKEzE3OTM0NDE3…' } }, note: 'This time the app <b>stores the token</b> next to the folder (with its content version).' },
      { from: 'b', to: 'app', label: 'GET /folders/secret', msg: 'GET /folders/secret HTTP/1.1\\nHost: docs.acme.test\\nCookie: __Host-sid=bob-7c1e' },
      { from: 'app', to: 'z', kind: 'back', label: 'check atLeastAsFresh(token)', hl: ['atLeastAsFresh'],
        msg: 'POST /v1/permissions/check HTTP/1.1\\nHost: spicedb.internal:8443\\nContent-Type: application/json\\n\\n' + j(chk({ atLeastAsFresh: { token: 'GhUKEzE3OTM0NDE3MDAwMDAwMDAwMDA=' } })),
        note: 'The check must use a snapshot at least as new as the delete. Stale caches are not allowed for this request.' },
      { from: 'z', to: 'app', kind: 'back', label: 'NO_PERMISSION', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + j({ checkedAt: { token: 'GhUKEzE3OTM0NDE3MDUwMDAwMDAwMDA=' }, permissionship: 'PERMISSIONSHIP_NO_PERMISSION' }) },
      { from: 'app', to: 'b', kind: 'err', label: '404 Not Found', msg: 'HTTP/1.1 404 Not Found',
        note: 'Bob cannot see the folder. Zanzibar calls these tokens <b>zookies</b>; SpiceDB calls them <b>ZedTokens</b>.' },
    ]},
  ],
});
</script>`,
      },
    ],
    quiz: [
      { q: 'What does the tuple <code>folder:q3#viewer@group:eng#member</code> mean?',
        options: ['group:eng is a member of folder:q3', 'Every member of group:eng is a viewer of folder:q3', 'folder:q3 can view group:eng', 'Only the group admin can view q3'], answer: 1,
        why: 'Format is object#relation@subject. The subject <code>group:eng#member</code> is a userset: all members of eng.' },
      { q: 'In <code>define viewer: [user] or editor or viewer from parent</code>, what does <code>viewer from parent</code> do?',
        options: ['Makes the parent a viewer', 'Anyone who is viewer of this object’s parent folder is also viewer of this object', 'Copies tuples to the parent', 'Nothing, it is a comment'], answer: 1,
        why: 'This is a tuple-to-userset rewrite: follow the <code>parent</code> tuple, then evaluate <code>viewer</code> on that folder.' },
      { q: 'How does a Zanzibar-style system answer <code>Check(user:carl, viewer, doc:plan)</code>?',
        options: ['Looks up carl’s role', 'Searches the relationship graph for a path from doc:plan#viewer to user:carl, following the model’s rewrite rules', 'Asks carl', 'Decodes carl’s JWT'], answer: 1,
        why: 'Check is a graph traversal over tuples, guided by the model.' },
      { q: 'What problem do zookies / ZedTokens solve?',
        options: ['Password reuse', 'Checks evaluated on a stale snapshot that predates an access removal (the "new enemy" problem)', 'Token theft', 'Slow graph search'], answer: 1,
        why: 'The token records "evaluate at least as fresh as this write", so a removed user cannot see content added after their removal.' },
    ],
    exercise: {
      task: `<p>Write relation tuples in the box below so that every requirement passes, then click <strong>Check</strong>.
        Format: <code>object#relation@subject</code>, one per line. Lines starting with <code>//</code> are ignored.</p>`,
      hint: 'You need 4 tuples besides erin: two group memberships, one parent link (doc:roadmap#parent@folder:product), and one grant to the userset group:design#member on the folder.',
      starter: mkRebacEx([
        '// designers',
        'group:design#member@user:dana',
        '// TODO: finn is also a designer',
        '// TODO: put doc:roadmap inside folder:product',
        '// TODO: let the design group view folder:product',
        'group:sales#member@user:erin',
      ].join('\n')),
      solution: mkRebacEx([
        '// designers',
        'group:design#member@user:dana',
        'group:design#member@user:finn',
        'doc:roadmap#parent@folder:product',
        'folder:product#viewer@group:design#member',
        'group:sales#member@user:erin',
      ].join('\n')),
    },
  });

  const REGO_POLICY = `# policy/authz.rego  (OPA 1.x, Rego v1 syntax: "if" and "contains" are required)
package authz

# Deny by default: if no rule makes allow true, it stays false.
default allow := false

# The decision: allowed if at least one reason applies.
allow if count(reasons) > 0

# (1) Admins may do anything, but only with MFA
reasons contains "admin with MFA" if {
  "admin" in input.user.roles
  input.context.mfa == true
}

# (2) Customers may read and update their own orders
reasons contains "owner of the order" if {
  input.action in {"read", "update"}
  input.resource.owner == input.user.id
}

# (3) Support staff may read orders of their own tenant
reasons contains "support, same tenant" if {
  "support" in input.user.roles
  input.action == "read"
  input.resource.tenant == input.user.tenant
}

# Run it as a sidecar:   opa run --server --addr localhost:8181 policy/
# Ask for a decision:    curl -s localhost:8181/v1/data/authz/allow -d @input.json
# Unit test it:          opa test policy/ -v`;

  function mkCedarEx(pre) {
    return CSS + `
<div class="card">
  <h4>🌲 Complete the Cedar policy: <i>"Editors may edit documents of their own department."</i></h4>
  <pre style="font:13.5px/1.9 ui-monospace,Menlo,monospace;background:#f8fafc;border:1px solid #e2e5ee;border-radius:8px;padding:8px 12px;margin:0">permit (
  <select id="P"></select>,
  <select id="A"></select>,
  resource is Doc
)
when { <select id="W"></select> };</pre>
  <div class="small muted" style="margin-top:6px">Entities: <code>User::"alice"</code> (in <code>Role::"editor"</code>, dept sales) ·
    <code>User::"bob"</code> (in <code>Role::"viewer"</code>, dept sales) · <code>User::"carol"</code> (in <code>Role::"editor"</code>, dept eng) ·
    <code>Doc::"S1"</code> (dept sales, owner dave) · <code>Doc::"E1"</code> (dept eng, owner carol)</div>
  <div style="margin-top:8px"><button class="primary" id="check">Check</button></div>
  <div id="out"></div>
</div>
<script>
var OPTS = {
  P: ['principal', 'principal in Role::"editor"', 'principal == User::"alice"'],
  A: ['action', 'action == Action::"view"', 'action == Action::"edit"'],
  W: ['true', 'resource.owner == principal', 'principal.dept == resource.dept', 'context.mfa == true'],
};
var PRE = ` + JSON.stringify(pre) + `;
Object.keys(OPTS).forEach(function (k) {
  var s = document.getElementById(k);
  OPTS[k].forEach(function (o, i) {
    var op = document.createElement('option');
    op.value = i; op.textContent = o;
    s.appendChild(op);
  });
  s.value = PRE[k];
});
var USERS = { alice: { role: 'editor', dept: 'sales' }, bob: { role: 'viewer', dept: 'sales' }, carol: { role: 'editor', dept: 'eng' } };
var DOCS = { S1: { dept: 'sales', owner: 'dave' }, E1: { dept: 'eng', owner: 'carol' } };
function permit(u, a, d, mfa) {
  var p = +document.getElementById('P').value, ac = +document.getElementById('A').value, w = +document.getElementById('W').value;
  var U = USERS[u], D = DOCS[d];
  var okP = p === 0 || (p === 1 && U.role === 'editor') || (p === 2 && u === 'alice');
  var okA = ac === 0 || (ac === 1 && a === 'view') || (ac === 2 && a === 'edit');
  var okW = w === 0 || (w === 1 && D.owner === u) || (w === 2 && U.dept === D.dept) || (w === 3 && mfa);
  return okP && okA && okW;
}
var TESTS = [
  ['alice', 'edit', 'S1', true], ['alice', 'edit', 'E1', false], ['bob', 'edit', 'S1', false],
  ['alice', 'delete', 'S1', false], ['carol', 'edit', 'E1', true], ['carol', 'view', 'E1', false],
];
document.getElementById('check').onclick = function () {
  var all = true;
  var h = '<table class="t" style="margin-top:8px"><tr><th>Cedar request (principal, action, resource)</th><th>Expected</th><th>Got</th><th></th></tr>';
  TESTS.forEach(function (t) {
    var got = permit(t[0], t[1], t[2], true), ok = got === t[3];
    all = all && ok;
    h += '<tr><td><code>User::"' + t[0] + '", Action::"' + t[1] + '", Doc::"' + t[2] + '"</code></td><td>' + (t[3] ? 'Allow' : 'Deny') +
      '</td><td>' + (got ? 'Allow' : 'Deny') + '</td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  h += '</table>';
  h += all ? '<div class="result pass pop">✅ Correct. Scope (principal / action / resource) narrows <em>who and what</em>, and <code>when</code> adds the attribute condition. Anything not permitted is denied by default.</div>'
    : '<div class="result fail pop">❌ Some requests are wrong. Too many Allows → the scope or condition is too broad. Too many Denys → too narrow.</div>';
  document.getElementById('out').innerHTML = h;
};
</script>`;
  }

  L.push({
    id: 'policy-engines',
    section: SECTION,
    title: 'Policy as code: OPA/Rego & Cedar',
    explain: `
      <p>So far, our rules lived inside the widgets as <code>if</code> statements. In real systems, scattered <code>if (user.role === …)</code>
      checks become a problem: 40 microservices, 4 languages, and nobody can say what the access policy actually <em>is</em>.</p>
      <p><strong>Policy as code</strong> moves the rules out of the application into a dedicated <strong>policy engine</strong> (the PDP):</p>
      <ul>
        <li>Policies live in their own files, under version control, with code review and <strong>unit tests</strong>.</li>
        <li>Services only ask a question and enforce the answer. They become pure PEPs.</li>
        <li>You can change a rule without redeploying every service, and audit every decision in one place.</li>
      </ul>

      <h3>Open Policy Agent (OPA) and Rego</h3>
      <p><strong>OPA</strong> is a general-purpose policy engine and a graduated CNCF project. It is used for APIs, Kubernetes admission control, Terraform checks, and more.
      Policies are written in <strong>Rego</strong>, a declarative query language. OPA 1.0 (December 2024) made the "v1" syntax the default:
      rules use the <code>if</code> keyword, and multi-value rules use <code>contains</code>.</p>
      <p>Your service sends <code>{"input": …}</code> to OPA's REST <strong>Data API</strong> at <code>POST /v1/data/&lt;package path&gt;/&lt;rule&gt;</code> and gets back <code>{"result": …}</code>.
      OPA usually runs as a <strong>sidecar</strong> next to each service on <code>localhost:8181</code>, so a decision takes well under a millisecond and needs no network hop.
      Policies arrive as <strong>bundles</strong> that OPA polls from a bundle server.</p>
      <div class="warn">If the rule you query is <em>undefined</em> (wrong path, typo in the package), OPA answers <code>200 {}</code> with no <code>result</code> key.
      Treat a missing result as <strong>deny</strong>. And declare <code>default allow := false</code>.</div>

      <h3>Cedar</h3>
      <p><strong>Cedar</strong> is an open-source policy language from AWS. It powers Amazon Verified Permissions and AWS Verified Access.
      It is deliberately smaller than Rego and designed to be analyzable. Every policy is a <code>permit</code> or <code>forbid</code> with a scope and optional conditions:</p>
      <pre><code class="language-javascript">// Owners can read and update their own orders
permit (
  principal,
  action in [Action::"read", Action::"update"],
  resource is Order
)
when { resource.owner == principal };

// Support staff can read orders of their own tenant
permit (
  principal in Role::"support",
  action == Action::"read",
  resource is Order
)
when { resource.tenant == principal.tenant };

// Admins can do anything, with MFA
permit (principal in Role::"admin", action, resource)
when { context.mfa == true };

// Guardrail: nobody deletes a shipped order. forbid ALWAYS beats permit.
forbid (principal, action == Action::"delete", resource is Order)
when { resource.status == "shipped" };</code></pre>
      <p>Cedar's rules are simple: <strong>default deny</strong>, any matching <code>forbid</code> wins (deny-overrides), otherwise any matching <code>permit</code> allows.
      <code>principal in Role::"support"</code> uses Cedar's entity hierarchy (the user entity has <code>Role::"support"</code> as a parent).</p>

      <h3>Which one?</h3>
      <table>
        <tr><th></th><th>OPA / Rego</th><th>Cedar</th></tr>
        <tr><td>Style</td><td>General query language over any JSON</td><td>Small, purpose-built permit/forbid language</td></tr>
        <tr><td>Best for</td><td>Everything-policy: APIs, Kubernetes, CI/CD, infra</td><td>Application authorization (RBAC + ABAC + entity hierarchy)</td></tr>
        <tr><td>Runs as</td><td>Sidecar / daemon / library (Go, Wasm)</td><td>Library (Rust, with bindings), or the managed Verified Permissions service</td></tr>
      </table>
      <div class="tip">Others in the same space: Cerbos (YAML policies), Casbin (library, many languages), and OpenFGA / SpiceDB for ReBAC.
      All of them follow the same PEP → PDP split.</div>
    `,
    examples: [
      {
        title: 'Rego policy (read-only)',
        runnable: false,
        lang: 'python',
        note: 'Read-only: Rego for OPA 1.x. Highlighting is approximate (Python-style). The evaluator below runs an equivalent policy in JS.',
        code: REGO_POLICY,
      },
      {
        title: 'Policy evaluator: edit the input JSON, get OPA\'s decision',
        code: CSS + `
<div class="row">
  <div class="col" style="max-width:330px">
    <h4>📥 input (edit me)</h4>
    <div class="small" style="margin-bottom:4px">
      <button data-p="owner">owner reads</button><button data-p="other">reads other’s</button><button data-p="sup">support, same tenant</button>
      <button data-p="supx">support, other tenant</button><button data-p="supu">support updates</button><button data-p="adm">admin, no MFA</button><button data-p="admm">admin + MFA</button>
    </div>
    <textarea id="inp" rows="19" spellcheck="false" style="width:100%;box-sizing:border-box;font:12px ui-monospace,Menlo,monospace"></textarea>
  </div>
  <div class="col" style="flex:1.3">
    <h4>📜 policy authz.rego <span class="muted small">(✓/✗ = this line is true/false for your input)</span></h4>
    <pre class="trace" id="pol" style="max-height:440px;background:#f8fafc;color:#1f2330;border:1px solid #e2e5ee"></pre>
  </div>
  <div class="col">
    <h4>🔌 PEP ⇄ OPA over HTTP</h4>
    <div class="small">query <select id="path"><option>/v1/data/authz/allow</option><option>/v1/data/authz</option></select></div>
    <pre class="trace" id="http" style="max-height:400px;margin-top:4px"></pre>
    <div id="verdict" style="margin-top:6px"></div>
  </div>
</div>
<script>
function $(i) { return document.getElementById(i); }
var BASE = { user: { id: 'u-17', roles: ['customer'], tenant: 'acme' }, action: 'read',
  resource: { type: 'order', id: '77', owner: 'u-17', tenant: 'acme' }, context: { mfa: false } };
function clone(o) { return JSON.parse(JSON.stringify(o)); }
var PRE = {
  owner: function (x) { return x; },
  other: function (x) { x.resource.owner = 'u-99'; return x; },
  sup: function (x) { x.user = { id: 's-3', roles: ['support'], tenant: 'acme' }; return x; },
  supx: function (x) { x.user = { id: 's-3', roles: ['support'], tenant: 'acme' }; x.resource.tenant = 'globex'; return x; },
  supu: function (x) { x.user = { id: 's-3', roles: ['support'], tenant: 'acme' }; x.action = 'update'; return x; },
  adm: function (x) { x.user = { id: 'a-1', roles: ['admin'], tenant: 'acme' }; x.action = 'delete'; x.resource.owner = 'u-99'; return x; },
  admm: function (x) { x.user = { id: 'a-1', roles: ['admin'], tenant: 'acme' }; x.action = 'delete'; x.resource.owner = 'u-99'; x.context.mfa = true; return x; },
};
function g(o, path) { return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o); }
function has(arr, v) { return Array.isArray(arr) && arr.indexOf(v) >= 0; }
function eq(a, b) { return a !== undefined && b !== undefined && a === b; }
var RULES = [
  { name: 'admin with MFA', conds: [
    ['"admin" in input.user.roles', function (i) { return has(g(i, 'user.roles'), 'admin'); }],
    ['input.context.mfa == true', function (i) { return g(i, 'context.mfa') === true; }] ] },
  { name: 'owner of the order', conds: [
    ['input.action in {"read", "update"}', function (i) { return ['read', 'update'].indexOf(g(i, 'action')) >= 0; }],
    ['input.resource.owner == input.user.id', function (i) { return eq(g(i, 'resource.owner'), g(i, 'user.id')); }] ] },
  { name: 'support, same tenant', conds: [
    ['"support" in input.user.roles', function (i) { return has(g(i, 'user.roles'), 'support'); }],
    ['input.action == "read"', function (i) { return g(i, 'action') === 'read'; }],
    ['input.resource.tenant == input.user.tenant', function (i) { return eq(g(i, 'resource.tenant'), g(i, 'user.tenant')); }] ] },
];
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function run() {
  var txt = $('inp').value, path = $('path').value, input, err = null;
  try { input = JSON.parse(txt); } catch (e) { err = e.message; }
  var req = '<span class="b">POST ' + path + ' HTTP/1.1</span>\\nHost: localhost:8181\\nContent-Type: application/json\\n\\n{"input": ' + esc(txt.trim().slice(0, 60)) + (txt.trim().length > 60 ? ' …' : '') + '}';
  var pol = ['<span class="c">package authz</span>', '', 'default allow := false', ''];
  if (err) {
    $('http').innerHTML = req + '\\n\\n<span class="r">HTTP/1.1 400 Bad Request</span>\\n' + esc(JSON.stringify({ code: 'invalid_parameter', message: 'body contains malformed input document: ' + err }, null, 2));
    $('pol').innerHTML = pol.join('\\n') + '<span class="c">(fix the JSON first)</span>';
    $('verdict').innerHTML = '';
    return;
  }
  var reasons = [];
  var body = [];
  RULES.forEach(function (r) {
    var res = r.conds.map(function (c) { return c[1](input); });
    var ok = res.every(Boolean);
    if (ok) reasons.push(r.name);
    var col = ok ? '#dcfce7' : 'transparent';
    var blk = '<div style="background:' + col + ';border-radius:6px;padding:2px 4px;margin:2px 0">reasons contains "' + r.name + '" if {' + (ok ? '  <b style="color:#16a34a">← applies</b>' : '') + '\\n';
    r.conds.forEach(function (c, k) {
      blk += (res[k] ? '<span style="color:#16a34a">✓</span> ' : '<span style="color:#dc2626">✗</span> ') + esc(c[0]) + '\\n';
    });
    body.push(blk + '}</div>');
  });
  var allow = reasons.length > 0;
  pol.push('<div style="background:' + (allow ? '#dcfce7' : '#fee2e2') + ';border-radius:6px;padding:2px 4px">allow if count(reasons) &gt; 0   <b>→ count = ' + reasons.length + ', allow = ' + allow + '</b></div>');
  $('pol').innerHTML = pol.join('\\n') + body.join('');
  var result = path === '/v1/data/authz' ? { allow: allow, reasons: reasons } : allow;
  $('http').innerHTML = req + '\\n\\n<span class="' + (allow ? 'g' : 'r') + '">HTTP/1.1 200 OK</span>\\nContent-Type: application/json\\n\\n' + esc(JSON.stringify({ result: result }, null, 2)) +
    '\\n\\n<span class="c">// PEP: result ' + (allow ? 'true → run handler → 200' : 'false → 403 Forbidden') + '</span>';
  $('verdict').innerHTML = '<span class="verdict pop ' + (allow ? 'ALLOW' : 'DENY') + '">' + (allow ? 'ALLOW' : 'DENY') + '</span>';
}
function load(k) { $('inp').value = JSON.stringify(PRE[k](clone(BASE)), null, 2); run(); }
document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { load(b.dataset.p); }; });
$('inp').addEventListener('input', run);
$('path').onchange = run;
load('owner');
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <b>reads other's</b>: rule (2) fails on <code>input.resource.owner == input.user.id</code>, so the count is 0 and <code>{"result": false}</code>.</li>
              <li>Click <b>support, other tenant</b>, then edit <code>"tenant": "globex"</code> back to <code>"acme"</code> in the box → ALLOW (rule 3).</li>
              <li>Click <b>admin, no MFA</b> → DENY. Change <code>"mfa": false</code> to <code>true</code> → ALLOW.</li>
              <li>Switch the query to <code>/v1/data/authz</code>: you get the whole package document, <code>allow</code> plus the <code>reasons</code> set. That is handy for audit logs and error messages.</li>
              <li>Delete a comma to break the JSON: OPA answers <code>400</code>. Your PEP must treat errors as deny (fail closed).</li>
              <li>Delete the <code>"roles"</code> line: rules that reference it become <em>undefined</em> (false). Rego never crashes on missing fields.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Animated: service → OPA sidecar, bundles and decision logs',
        code: CSS + `
<div id="flow"></div>
<script>
function input(owner, roles, action) {
  return { input: { user: { id: 'u-17', roles: roles, tenant: 'acme' }, action: action,
    resource: { type: 'order', id: '77', owner: owner, tenant: 'acme' }, context: { mfa: false } } };
}
function q(body) { return 'POST /v1/data/authz/allow HTTP/1.1\\nHost: localhost:8181\\nContent-Type: application/json\\n\\n' + JSON.stringify(body, null, 2); }
var TOK = 'Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6ImsxIn0.eyJzdWIiOiJ1LTE3In0.c2ln';
Seq.mount('#flow', {
  actors: [
    { id: 'c', label: 'Client', icon: '🌐', store: {} },
    { id: 'svc', label: 'Orders service (PEP)', icon: '📦', store: {} },
    { id: 'opa', label: 'OPA sidecar (PDP)', icon: '⚖️', store: {} },
    { id: 'bun', label: 'Bundle server (PAP)', icon: '🗂', store: { 'authz bundle': 'v41 (git main)' } },
  ],
  scenarios: [
    { name: '✅ allowed', steps: [
      { from: 'opa', to: 'bun', kind: 'back', label: 'GET /bundles/authz.tar.gz', msg: 'GET /bundles/authz.tar.gz HTTP/1.1\\nHost: bundles.acme.internal\\nAuthorization: Bearer opa-bundle-reader',
        note: 'On start-up (and then every ~60 s) OPA downloads the policy <b>bundle</b>: a tarball of .rego files + data, built by CI from a git repo.' },
      { from: 'bun', to: 'opa', kind: 'back', label: '200 bundle v41', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/gzip\\nETag: "v41"\\n\\n# authz.tar.gz → /authz/authz.rego, /data.json, /.manifest',
        set: { opa: { bundle: 'v41' } } },
      { from: 'c', to: 'svc', label: 'GET /orders/77', msg: 'GET /orders/77 HTTP/1.1\\nHost: api.acme.test\\n' + TOK },
      { from: 'svc', to: 'svc', label: 'verify JWT, load order 77, build input',
        note: 'The service knows the <b>facts</b>: who (from the JWT), what (GET → read), which order (from its DB). It knows <b>no rules</b>.' },
      { from: 'svc', to: 'opa', label: 'POST /v1/data/authz/allow', msg: q(input('u-17', ['customer'], 'read')), hl: ['/v1/data/authz/allow', '"input"'],
        note: 'The Data API path mirrors the package: <code>package authz</code> + rule <code>allow</code> → <code>/v1/data/authz/allow</code>. The body is always <code>{"input": …}</code>.' },
      { from: 'opa', to: 'opa', label: 'evaluate (in memory, ~0.1 ms)', note: 'Rule (2) "owner of the order" applies.' },
      { from: 'opa', to: 'svc', kind: 'res', label: '{"result": true}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"result": true}', hl: ['"result": true'] },
      { from: 'svc', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "77", "status": "shipped", "total": 59.90}' },
      { from: 'opa', to: 'bun', kind: 'back', label: 'POST /logs (decision logs)', msg: 'POST /logs HTTP/1.1\\nHost: bundles.acme.internal\\nContent-Encoding: gzip\\nContent-Type: application/json\\n\\n[{"decision_id": "4ca636c1-55e4-417a-b1d8-4aceb67960d1",\\n  "path": "authz/allow", "result": true,\\n  "input": {"user": {"id": "u-17"}, "action": "read", "...": "..."},\\n  "timestamp": "2026-10-31T10:15:00.123Z"}]',
        note: 'Optional: OPA batches every decision to a log service, which gives you a central audit trail of who was allowed what and why.' },
    ]},
    { name: '❌ denied', steps: [
      { from: 'c', to: 'svc', label: 'GET /orders/91', msg: 'GET /orders/91 HTTP/1.1\\nHost: api.acme.test\\n' + TOK },
      { from: 'svc', to: 'svc', label: 'load order 91 (owner u-99)' },
      { from: 'svc', to: 'opa', label: 'POST /v1/data/authz/allow', msg: q(input('u-99', ['customer'], 'read')), hl: ['"owner": "u-99"'] },
      { from: 'opa', to: 'opa', kind: 'err', label: 'no rule applies → default false' },
      { from: 'opa', to: 'svc', kind: 'res', label: '{"result": false}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"result": false}', hl: ['false'] },
      { from: 'svc', to: 'c', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: application/json\\n\\n{"error": "forbidden"}',
        note: 'If OPA were unreachable or returned <code>{}</code>, the service must also answer 403: <b>fail closed</b>.' },
    ]},
    { name: '🔄 policy change, no redeploy', steps: [
      { from: 'bun', to: 'bun', label: 'PR merged → CI builds bundle v42', set: { bun: { 'authz bundle': 'v42: support may update' } },
        note: 'A policy author changes rule (3) to <code>input.action in {"read", "update"}</code>. Policy tests (<code>opa test</code>) run in CI like any other code.' },
      { from: 'opa', to: 'bun', kind: 'back', label: 'poll: If-None-Match "v41"', msg: 'GET /bundles/authz.tar.gz HTTP/1.1\\nHost: bundles.acme.internal\\nIf-None-Match: "v41"' },
      { from: 'bun', to: 'opa', kind: 'back', label: '200 bundle v42', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/gzip\\nETag: "v42"', set: { opa: { bundle: 'v42' } },
        note: 'Had nothing changed, the server would reply <code>304 Not Modified</code>.' },
      { from: 'c', to: 'svc', label: 'PUT /orders/77 (support agent)', msg: 'PUT /orders/77 HTTP/1.1\\nHost: api.acme.test\\n' + TOK + '\\nContent-Type: application/json\\n\\n{"address": "1 New St"}' },
      { from: 'svc', to: 'opa', label: 'POST /v1/data/authz/allow', msg: q(input('u-55', ['support'], 'update')) },
      { from: 'opa', to: 'svc', kind: 'res', label: '{"result": true}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"result": true}' },
      { from: 'svc', to: 'c', kind: 'res', label: '200 OK', msg: 'HTTP/1.1 200 OK',
        note: 'The behaviour changed and the Orders service was <b>not</b> rebuilt or redeployed. That is the point of decoupling policy from code.' },
    ]},
  ],
});
</script>`,
      },
    ],
    quiz: [
      { q: 'Your Rego file starts with <code>package authz</code> and defines rule <code>allow</code>. Which OPA REST call returns that decision?',
        options: ['GET /authz/allow', 'POST /v1/data/authz/allow with {"input": …}', 'POST /v1/policies/authz', 'POST /check'], answer: 1,
        why: 'The Data API maps package path + rule name onto <code>/v1/data/…</code>. The input document goes in the <code>input</code> field.' },
      { q: 'OPA answers <code>200 {}</code> (no <code>result</code> key). What should the service do?',
        options: ['Allow, since the status is 200', 'Deny: the rule was undefined (wrong path or no default), so fail closed', 'Retry forever', 'Crash'], answer: 1,
        why: 'An undefined document produces an empty response. Always treat "no result" as deny, and declare <code>default allow := false</code>.' },
      { q: 'In Cedar, a request matches one <code>permit</code> and one <code>forbid</code>. The result is…',
        options: ['Allow', 'Deny: forbid always overrides permit', 'Whichever policy is written first', 'An error'], answer: 1,
        why: 'Cedar is default-deny with forbid-overrides-permit semantics (deny-overrides).' },
      { q: 'What is the main benefit of running OPA as a sidecar on localhost?',
        options: ['It replaces authentication', 'Decisions are fast and local (no network hop), while policies are still managed centrally via bundles', 'It encrypts traffic', 'Services no longer need to send input'], answer: 1,
        why: 'The sidecar evaluates in memory. Bundles keep every sidecar in sync with the central policy repo.' },
    ],
    exercise: {
      task: `<p>Complete the Cedar policy in the box below by choosing the scope and the condition, then click <strong>Check</strong>.
        It must implement: <em>"Editors may edit documents of their own department"</em>, and nothing more.</p>`,
      hint: 'Principal: membership in the editor role. Action: only edit. Condition: compare principal.dept with resource.dept.',
      starter: mkCedarEx({ P: 0, A: 0, W: 0 }),
      solution: mkCedarEx({ P: 1, A: 2, W: 2 }),
    },
  });

  function mkIdorEx(pre) {
    return CSS + `
<div class="card">
  <h4>🛠 Fix the handler: choose the two highlighted lines</h4>
  <pre style="font:13px/1.8 ui-monospace,Menlo,monospace;background:#f8fafc;border:1px solid #e2e5ee;border-radius:8px;padding:8px 12px;margin:0;white-space:pre-wrap">// requireJwt verified the bearer token and set req.user = { sub, tenant_id, scope }
app.get('/api/invoices/:id', requireJwt, async (req, res) =&gt; {
  const tenant = <select id="A" style="font:12.5px ui-monospace,Menlo,monospace"></select>;
  const invoice = await db.invoices.findOne({ id: req.params.id, tenant_id: tenant });
  if (!invoice) return res.status(404).end();
  <select id="B" style="font:12.5px ui-monospace,Menlo,monospace;max-width:640px"></select>
  res.json(invoice);
});</pre>
  <div class="small muted" style="margin-top:6px">DB: invoice <b>1041</b> (tenant acme, owner bob) · <b>1042</b> (acme, owner alice) · <b>2001</b> (globex, owner gina)</div>
  <div style="margin-top:8px"><button class="primary" id="check">Check (run 5 attack/normal requests)</button></div>
  <div id="out"></div>
</div>
<script>
var OA = ["req.headers['x-tenant-id']", 'req.query.tenant', 'req.user.tenant_id  /* from the verified JWT */'];
var OB = ['// (no extra check)', 'if (!req.user) return res.status(401).end();',
  "if (invoice.owner_id !== req.headers['x-user-id']) return res.status(404).end();",
  'if (invoice.owner_id !== req.user.sub) return res.status(404).end();'];
var PRE = ` + JSON.stringify(pre) + `;
[['A', OA], ['B', OB]].forEach(function (x) {
  var s = document.getElementById(x[0]);
  x[1].forEach(function (o, i) { var op = document.createElement('option'); op.value = i; op.textContent = o; s.appendChild(op); });
  s.value = PRE[x[0]];
});
var DB = { '1041': { tenant: 'acme', owner: 'bob' }, '1042': { tenant: 'acme', owner: 'alice' }, '2001': { tenant: 'globex', owner: 'gina' } };
function handler(r) {
  var a = +document.getElementById('A').value, b = +document.getElementById('B').value;
  var tenant = a === 0 ? r.headers['x-tenant-id'] : a === 1 ? r.query.tenant : r.user.tenant_id;
  var inv = DB[r.id];
  if (!inv || inv.tenant !== tenant) return 404;
  if (b === 2 && inv.owner !== r.headers['x-user-id']) return 404;
  if (b === 3 && inv.owner !== r.user.sub) return 404;
  return 200;
}
function R(who, id, headers, query) { return { user: { sub: who, tenant_id: 'acme' }, id: id, headers: headers || {}, query: query || {} }; }
var TESTS = [
  ['bob reads his own invoice 1041 (app sends X-Tenant-Id: acme)', R('bob', '1041', { 'x-tenant-id': 'acme' }, { tenant: 'acme' }), 200],
  ['bob reads alice\\'s invoice 1042', R('bob', '1042', { 'x-tenant-id': 'acme' }, { tenant: 'acme' }), 404],
  ['bob reads 1042 and adds header X-User-Id: alice', R('bob', '1042', { 'x-tenant-id': 'acme', 'x-user-id': 'alice' }, { tenant: 'acme' }), 404],
  ['bob reads globex invoice 2001 with X-Tenant-Id: globex & ?tenant=globex', R('bob', '2001', { 'x-tenant-id': 'globex' }, { tenant: 'globex' }), 404],
  ['alice reads her own invoice 1042', R('alice', '1042', { 'x-tenant-id': 'acme' }, { tenant: 'acme' }), 200],
];
document.getElementById('check').onclick = function () {
  var all = true;
  var h = '<table class="t" style="margin-top:8px"><tr><th>Request (all with a valid JWT, tenant_id=acme)</th><th>Expected</th><th>Got</th><th></th></tr>';
  TESTS.forEach(function (t) {
    var got = handler(t[1]), ok = got === t[2];
    all = all && ok;
    h += '<tr><td>' + t[0] + '</td><td>' + t[2] + '</td><td>' + got + (got === 200 && t[2] !== 200 ? ' 💥 data leak' : '') + '</td><td>' + (ok ? '✅' : '❌') + '</td></tr>';
  });
  h += '</table>' + (all ? '<div class="result pass pop">✅ BOLA fixed. Both the tenant and the owner come from the <b>verified token</b>, never from anything the client can type. The 404 also hides whether the invoice exists.</div>'
    : '<div class="result fail pop">❌ Still exploitable. Ask yourself for each value: <i>could the attacker have typed this?</i> Headers and query strings: yes. Claims inside a verified JWT: no.</div>');
  document.getElementById('out').innerHTML = h;
};
</script>`;
  }

  L.push({
    id: 'scopes-vs-permissions',
    section: SECTION,
    title: 'Scopes vs permissions & IDOR/BOLA',
    explain: `
      <h3>Two different questions</h3>
      <p>In the OAuth lesson, an app asked for <code>scope=invoices:read</code> and the user clicked "Allow". It is tempting to treat scopes as permissions. They are not the same thing:</p>
      <ul>
        <li><strong>Scope</strong> = what the <em>app (client)</em> may do <em>on the user's behalf</em>. The user delegated it at consent time.</li>
        <li><strong>Permission</strong> = what the <em>user</em> may do at all, decided by your RBAC / ABAC / ReBAC policy.</li>
      </ul>
      <p>The request is allowed only if <strong>both</strong> say yes: <code>effective = scopes ∩ user permissions</code>.
      Analogy: you give a valet a car key that only starts the engine and cannot open the trunk (scope). But if the car isn't yours, the valet key doesn't help either (permission).</p>
      <div class="warn">An access token with <code>scope=invoices:write</code> does <em>not</em> mean the user may write <em>every</em> invoice. Scopes are coarse ("this kind of API").
      They say nothing about <em>which</em> objects.</div>

      <h3>IDOR / BOLA: the #1 API vulnerability</h3>
      <p>An API checks that the token is valid, then does <code>SELECT * FROM invoices WHERE id = :id</code>. Bob changes <code>/invoices/1041</code> to <code>/invoices/1042</code>
      and reads Alice's invoice. This is an <strong>IDOR</strong> (Insecure Direct Object Reference). The OWASP API Security Top 10 (2023 edition) ranks it first as
      <strong>API1:2023 Broken Object Level Authorization (BOLA)</strong>. Related entries: API3 (Broken Object <em>Property</em> Level Authorization: reading or writing fields you shouldn't) and
      API5 (Broken <em>Function</em> Level Authorization: calling admin endpoints).</p>
      <p>Fixes:</p>
      <ul>
        <li>Check <strong>object-level</strong> access on <em>every</em> endpoint that takes an ID: <code>WHERE id = :id AND owner_id = :sub</code>, or ask the PDP with the loaded object.</li>
        <li>Take identity and tenant from the <strong>verified token / session</strong>, never from a header, query or body the client controls.</li>
        <li>Answer <code>404</code> (not <code>403</code>) when you don't want to confirm that the object exists.</li>
        <li>Random UUIDs make guessing harder, but they are <em>not</em> a fix. IDs leak through URLs, logs and shared links.</li>
      </ul>

      <h3>Multi-tenant apps</h3>
      <p>In SaaS, every row belongs to a tenant (<code>tenant_id</code>). A missing tenant filter leaks one customer's data to another, which is the worst kind of incident.
      PostgreSQL <strong>row-level security</strong> can enforce it inside the database as a safety net:</p>
      <pre><code>ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON invoices
  USING (tenant_id = current_setting('app.tenant_id')::uuid);
-- per request:  SET LOCAL app.tenant_id = '&lt;tenant from the verified token&gt;';</code></pre>

      <h3>Enforce at every layer</h3>
      <table>
        <tr><th>Layer</th><th>Checks</th><th>Cannot check</th></tr>
        <tr><td><strong>API gateway</strong> (coarse)</td><td>token valid (signature, <code>iss</code>, <code>aud</code>, <code>exp</code>), required scope for the route, rate limits</td><td>who owns invoice 1042 (it never loads the object)</td></tr>
        <tr><td><strong>Service</strong> (fine)</td><td>object-level: owner, tenant, relationships, attributes (via the PDP)</td><td>nothing; this is the layer that must not be skipped</td></tr>
        <tr><td><strong>Database</strong> (safety net)</td><td>row-level security on tenant (or owner)</td><td>business rules like "managers approve &lt; 5000"</td></tr>
      </table>
      <div class="tip">Defense in depth: the gateway quickly rejects junk, the service makes the real decision, and the DB catches the bug you will eventually ship.</div>
    `,
    examples: [
      {
        title: 'Effective access = scopes ∩ permissions',
        code: CSS + `
<div class="row">
  <div class="card col"><h4>🙂 User</h4>
    <label><input type="radio" name="u" value="alice" checked> alice (role <b>admin</b>)</label><br>
    <label><input type="radio" name="u" value="bob"> bob (role <b>viewer</b>)</label>
  </div>
  <div class="card col"><h4>📱 App the user is using</h4>
    <label><input type="radio" name="app" value="viz" checked> 📊 ReportViz (third-party)</label><br>
    <label><input type="radio" name="app" value="books"> 🧾 AcmeBooks (first-party)</label>
  </div>
  <div class="card col"><h4>✅ Consent screen: scopes granted</h4><div id="scopes" class="small"></div></div>
</div>
<div class="row">
  <div class="card col" style="text-align:center"><h4>User may (permissions)</h4><div id="perm"></div></div>
  <div style="align-self:center;font-size:22px;font-weight:800">∩</div>
  <div class="card col" style="text-align:center"><h4>Token allows (scopes)</h4><div id="scp"></div></div>
  <div style="align-self:center;font-size:22px;font-weight:800">=</div>
  <div class="card col" style="text-align:center;border-color:#86efac"><h4>Effective</h4><div id="eff"></div></div>
</div>
<div style="text-align:center">
  <button data-act="read">GET /api/invoices</button>
  <button data-act="write">POST /api/invoices</button>
  <button data-act="delete">DELETE /api/invoices/7</button>
</div>
<div class="pipe" id="pipe">
  <div class="stage"><b>📱 App</b><span id="s0" class="small"></span></div><div class="arrow">→</div>
  <div class="stage"><b>🚪 Gateway</b><span class="small">scope check</span></div><div class="arrow">→</div>
  <div class="stage"><b>🧾 Invoices service</b><span class="small">permission check</span></div><div class="arrow">→</div>
  <div class="stage"><b>📤 Result</b><span id="s3" class="small"></span></div>
  <div class="dot"></div>
</div>
<div class="row">
  <div class="col"><h4>Request (access token decoded)</h4><pre class="trace" id="req">Click one of the three API calls.</pre></div>
  <div class="col"><h4>Response</h4><pre class="trace" id="res"></pre></div>
</div>
<script>
` + PIPE + `
function $(i) { return document.getElementById(i); }
var PERMS = { alice: ['invoices:read', 'invoices:write', 'invoices:delete'], bob: ['invoices:read'] };
var ASK = { viz: ['invoices:read'], books: ['invoices:read', 'invoices:write', 'invoices:delete'] };
var ALL = ['invoices:read', 'invoices:write', 'invoices:delete'];
var METHOD = { read: 'GET /api/invoices', write: 'POST /api/invoices', delete: 'DELETE /api/invoices/7' };
function val(n) { return document.querySelector('input[name=' + n + ']:checked').value; }
function drawScopes() {
  var asked = ASK[val('app')];
  $('scopes').innerHTML = '<div class="muted">The app requested: ' + asked.join(' ') + '</div>' + asked.map(function (s) {
    return '<label style="display:block"><input type="checkbox" class="sc" value="' + s + '" checked> ' + s + '</label>';
  }).join('');
}
function granted() { return [].slice.call(document.querySelectorAll('.sc:checked')).map(function (c) { return c.value; }); }
function chips(list, other) {
  return ALL.map(function (p) {
    var on = list.indexOf(p) >= 0;
    return '<span class="pill ' + (on ? (other ? 'g' : 'b') : '') + '" style="' + (on ? '' : 'opacity:.35;text-decoration:line-through') + '">' + p + '</span>';
  }).join('<br>');
}
function sets() {
  var u = val('u'), sc = granted(), pm = PERMS[u];
  var eff = ALL.filter(function (p) { return sc.indexOf(p) >= 0 && pm.indexOf(p) >= 0; });
  $('perm').innerHTML = chips(pm); $('scp').innerHTML = chips(sc); $('eff').innerHTML = chips(eff, true);
  return { u: u, sc: sc, pm: pm };
}
document.querySelectorAll('input[name=app]').forEach(function (r) { r.onchange = function () { drawScopes(); sets(); }; });
document.querySelectorAll('input[name=u]').forEach(function (r) { r.onchange = sets; });
$('scopes').addEventListener('change', sets);
drawScopes(); sets();
document.querySelectorAll('[data-act]').forEach(function (b) {
  b.onclick = function () {
    var s = sets(), act = b.dataset.act, need = 'invoices:' + act;
    var payload = { iss: 'https://login.acme.test', sub: s.u, aud: 'invoices-api', client_id: val('app') === 'viz' ? 'reportviz' : 'acmebooks',
      scope: s.sc.join(' '), exp: 1793442000 };
    $('req').innerHTML = '<span class="b">' + METHOD[act] + ' HTTP/1.1</span>\\nHost: api.acme.test\\nAuthorization: Bearer eyJhbGciOi…\\n\\n<span class="c">// token payload:</span>\\n' + JSON.stringify(payload, null, 2);
    $('res').textContent = '…';
    $('s0').textContent = ' ' + METHOD[act].split(' ')[0];
    $('s3').textContent = '';
    var res, at, blocked;
    if (s.sc.indexOf(need) < 0) {
      at = 1; blocked = true;
      res = '<span class="r">HTTP/1.1 403 Forbidden</span>\\nWWW-Authenticate: Bearer error="insufficient_scope",\\n  scope="' + need + '"\\n\\n<span class="c">// stopped at the GATEWAY: the token\\'s scope does not include ' + need +
        '.\\n// The user ' + (s.pm.indexOf(need) >= 0 ? 'COULD do this, but did not delegate it to this app.' : 'could not do it anyway.') + '</span>';
    } else if (s.pm.indexOf(need) < 0) {
      at = 2; blocked = true;
      res = '<span class="r">HTTP/1.1 403 Forbidden</span>\\nContent-Type: application/json\\n\\n{"error": "forbidden",\\n "detail": "' + s.u + ' lacks permission ' + need + '"}\\n\\n<span class="c">// passed the gateway (scope OK) but the SERVICE checked\\n// the user\\'s own permission: ' + s.u + ' is a viewer.</span>';
    } else {
      at = 3; blocked = false;
      var st = act === 'read' ? '200 OK' : act === 'write' ? '201 Created' : '204 No Content';
      res = '<span class="g">HTTP/1.1 ' + st + '</span>\\n\\n<span class="c">// scope ✓ (app may) AND permission ✓ (user may)</span>';
    }
    runPipe($('pipe'), at, blocked, function () {
      $('res').innerHTML = res;
      $('s3').textContent = blocked ? ' ✗' : ' ✓';
    });
  };
});
</script>`,
        explain: `
          <details>
            <summary>The problem: "the token says I can" vs "I am allowed"</summary>
            <p>Two mistakes are common. (1) An API checks only the token's scope: then <em>any</em> user who installs AcmeBooks can delete invoices, even viewers.
            (2) An API checks only the user's role: then a read-only reporting app that alice connected can delete her invoices, which she never agreed to.
            The correct check needs both.</p>
          </details>
          <details>
            <summary>Step by step: three combinations, click <b>DELETE /api/invoices/7</b> each time</summary>
            <table>
              <tr><th>Setup</th><th>Permissions ∩ Scopes</th><th>Dot stops at</th><th>Response</th></tr>
              <tr><td>alice + 📊 ReportViz</td><td>{read, write, delete} ∩ {read} = {read}</td><td>🚪 Gateway (red)</td><td><code>403</code> + <code>WWW-Authenticate: Bearer error="insufficient_scope", scope="invoices:delete"</code>. The note says the user COULD do this, but did not delegate it to this app.</td></tr>
              <tr><td>bob + 🧾 AcmeBooks</td><td>{read} ∩ {read, write, delete} = {read}</td><td>🧾 Invoices service (red)</td><td><code>403 {"error": "forbidden", "detail": "bob lacks permission invoices:delete"}</code></td></tr>
              <tr><td>alice + 🧾 AcmeBooks</td><td>{read, write, delete} ∩ {read, write, delete} = all</td><td>📤 Result (green)</td><td><code>204 No Content</code></td></tr>
            </table>
            <p>The <code>insufficient_scope</code> error and the <code>scope</code> attribute in <code>WWW-Authenticate</code> are defined by RFC 6750 §3.1 (Bearer tokens).</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>alice + AcmeBooks, then <b>untick</b> <code>invoices:delete</code> on the consent screen: the Effective box loses delete, and DELETE stops at the gateway. Users can down-scope an app.</li>
              <li>bob + AcmeBooks, POST → blocked at the service. A broad scope never adds permissions.</li>
              <li>Find a combination where <b>Effective is empty</b>, and try GET.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Animated: IDOR / BOLA, vulnerable vs fixed (incl. multi-tenant)',
        code: CSS + `
<div id="flow"></div>
<script>
var TOKB = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJib2IiLCJ0ZW5hbnRfaWQiOiJhY21lIiwic2NvcGUiOiJpbnZvaWNlczpyZWFkIn0.c2ln';
var H = 'Host: api.acme.test\\nAuthorization: Bearer ' + TOKB;
function inv(id, owner, tenant, total, name) {
  return 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n' + JSON.stringify({ id: id, tenant_id: tenant, owner_id: owner, customer: name, total: total, iban: 'DE89 3704 0044 0532 0130 00' }, null, 2);
}
var DBS = { rows: '1041 acme/bob · 1042 acme/alice · 2001 globex/gina' };
Seq.mount('#flow', {
  actors: [
    { id: 'b', label: "Bob's browser", icon: '🧑‍💻', store: { token: 'sub=bob tenant_id=acme scope=invoices:read' } },
    { id: 'api', label: 'Invoices API', icon: '🧾', store: {} },
    { id: 'db', label: 'Database', icon: '🗄', store: DBS },
  ],
  scenarios: [
    { name: '❌ Vulnerable (IDOR)', steps: [
      { from: 'b', to: 'api', label: 'GET /api/invoices/1041', msg: 'GET /api/invoices/1041 HTTP/1.1\\n' + H, note: 'Bob opens <b>his own</b> invoice. Nothing unusual yet.' },
      { from: 'api', to: 'api', label: 'JWT valid ✓ scope ✓', note: 'Signature, <code>exp</code>, <code>aud</code> and scope <code>invoices:read</code> are all fine. <b>This is where the vulnerable API stops checking.</b>' },
      { from: 'api', to: 'db', kind: 'back', label: 'SELECT … WHERE id = 1041', msg: "SELECT * FROM invoices WHERE id = $1;\\n-- params: ['1041']", hl: ['WHERE id = $1'] },
      { from: 'db', to: 'api', kind: 'back', label: 'row (owner bob)', msg: '1 row: {id: 1041, tenant_id: acme, owner_id: bob}' },
      { from: 'api', to: 'b', kind: 'res', label: '200 OK (his invoice)', msg: inv(1041, 'bob', 'acme', 120.0, 'Bob Ltd') },
      { from: 'b', to: 'b', label: 'edit URL: 1041 → 1042', note: 'Bob notices the number in the URL and simply adds 1. No hacking tools needed: a browser address bar or curl is enough.' },
      { from: 'b', to: 'api', kind: 'err', label: 'GET /api/invoices/1042', msg: 'GET /api/invoices/1042 HTTP/1.1\\n' + H, hl: ['1042'] },
      { from: 'api', to: 'api', label: 'JWT valid ✓ scope ✓ …and that\\'s it', note: 'The token is still bob\\'s valid token. Authentication succeeded, and nobody asked "<b>is this invoice bob\\'s?</b>"' },
      { from: 'api', to: 'db', kind: 'back', label: 'SELECT … WHERE id = 1042', msg: "SELECT * FROM invoices WHERE id = $1;\\n-- params: ['1042']" },
      { from: 'db', to: 'api', kind: 'back', label: 'row (owner alice!)', msg: '1 row: {id: 1042, tenant_id: acme, owner_id: alice}' },
      { from: 'api', to: 'b', kind: 'err', label: "200 OK: alice's invoice 💥", msg: inv(1042, 'alice', 'acme', 98000.0, 'Alice GmbH'), hl: ['"owner_id": "alice"', 'iban'],
        note: '<b>Broken Object Level Authorization</b> (OWASP API1:2023). Loop over ids 1…99999 and Bob downloads every customer\\'s invoice.' },
    ]},
    { name: '✅ Fixed (object-level check)', steps: [
      { from: 'b', to: 'api', kind: 'err', label: 'GET /api/invoices/1042', msg: 'GET /api/invoices/1042 HTTP/1.1\\n' + H },
      { from: 'api', to: 'api', label: 'JWT valid ✓ → sub=bob, tenant=acme', set: { api: { 'req.user': 'sub=bob tenant=acme' } },
        note: 'Identity comes <b>only</b> from the verified token.' },
      { from: 'api', to: 'db', kind: 'back', label: 'WHERE id AND owner AND tenant', hl: ['owner_id = $2', 'tenant_id = $3'],
        msg: "SELECT * FROM invoices\\n WHERE id = $1 AND owner_id = $2 AND tenant_id = $3;\\n-- params: ['1042', 'bob', 'acme']   ← $2, $3 from the token",
        note: 'The ownership condition is part of the query, so it cannot be forgotten later in the handler. (Alternative: load the row, then ask the PDP <code>can(bob, read, invoice 1042)</code>.)' },
      { from: 'db', to: 'api', kind: 'back', label: '0 rows', msg: '0 rows' },
      { from: 'api', to: 'b', kind: 'err', label: '404 Not Found', msg: 'HTTP/1.1 404 Not Found\\nContent-Type: application/json\\n\\n{"error": "not_found"}',
        note: '404 instead of 403: Bob cannot even tell whether invoice 1042 exists, so enumeration gives him nothing.' },
      { from: 'b', to: 'api', label: 'GET /api/invoices/1041', msg: 'GET /api/invoices/1041 HTTP/1.1\\n' + H },
      { from: 'api', to: 'db', kind: 'back', label: 'same query, id 1041', msg: "SELECT * FROM invoices\\n WHERE id = $1 AND owner_id = $2 AND tenant_id = $3;\\n-- params: ['1041', 'bob', 'acme']" },
      { from: 'db', to: 'api', kind: 'back', label: '1 row', msg: '1 row: {id: 1041, owner_id: bob}' },
      { from: 'api', to: 'b', kind: 'res', label: '200 OK (his own)', msg: inv(1041, 'bob', 'acme', 120.0, 'Bob Ltd') },
    ]},
    { name: '❌ Tenant from a header', steps: [
      { from: 'b', to: 'api', kind: 'err', label: 'GET /api/invoices + X-Tenant-Id: globex', hl: ['X-Tenant-Id: globex'],
        msg: 'GET /api/invoices?status=open HTTP/1.1\\n' + H + '\\nX-Tenant-Id: globex',
        note: 'The frontend normally sends <code>X-Tenant-Id: acme</code>, and the API trusts it. Bob edits it in DevTools.' },
      { from: 'api', to: 'api', label: 'JWT valid ✓ tenant = header 😬', note: 'The token says <code>tenant_id=acme</code>, but the code reads <code>req.headers[\\'x-tenant-id\\']</code>.' },
      { from: 'api', to: 'db', kind: 'back', label: "WHERE tenant_id = 'globex'", msg: "SELECT * FROM invoices WHERE tenant_id = $1 AND status = 'open';\\n-- params: ['globex']   ← from the header!" },
      { from: 'db', to: 'api', kind: 'back', label: "globex's rows", msg: '37 rows (tenant globex)' },
      { from: 'api', to: 'b', kind: 'err', label: '200: another company\\'s data 💥', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n[{"id": 2001, "tenant_id": "globex", "customer": "Globex Corp", "total": 410000.0}, …]',
        note: 'Cross-tenant leak: every value the client sends (path, query, header, body) is attacker-controlled.' },
    ]},
    { name: '✅ Tenant from token + RLS', steps: [
      { from: 'b', to: 'api', kind: 'err', label: 'GET /api/invoices + X-Tenant-Id: globex', msg: 'GET /api/invoices?status=open HTTP/1.1\\n' + H + '\\nX-Tenant-Id: globex' },
      { from: 'api', to: 'api', label: 'tenant = token.tenant_id (acme)', set: { api: { tenant: 'acme (from JWT)' } }, note: 'The header is ignored. The tenant comes from the verified claim.' },
      { from: 'api', to: 'db', kind: 'back', label: "SET LOCAL app.tenant_id = 'acme'", hl: ['SET LOCAL app.tenant_id'],
        msg: "BEGIN;\\nSET LOCAL app.tenant_id = 'acme';\\nSELECT * FROM invoices WHERE status = 'open';\\n-- RLS policy adds: AND tenant_id = current_setting('app.tenant_id')::uuid",
        note: 'Row-level security in PostgreSQL filters by tenant <b>inside the DB</b>. Even a query that forgets the filter cannot cross tenants.' },
      { from: 'db', to: 'api', kind: 'back', label: "acme's rows only", msg: '12 rows (tenant acme)' },
      { from: 'api', to: 'b', kind: 'res', label: "200 (acme's own data)", msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n[{"id": 1041, "tenant_id": "acme", …}]' },
    ]},
  ],
});
</script>`,
        explain: `
          <details>
            <summary>The problem: authentication ≠ object-level authorization</summary>
            <p>Every request in the vulnerable scenario carries a <b>valid</b> token with the <b>right scope</b>. The gateway would let it through, and the API's "auth middleware" is satisfied.
            The missing question is about <em>this specific object</em>: does invoice 1042 belong to the caller? Only code that has loaded (or filtered) the object can answer it.
            That is why BOLA is so common: it hides behind "we have auth".</p>
          </details>
          <details>
            <summary>Step by step: vulnerable vs fixed (same request <code>GET /api/invoices/1042</code>)</summary>
            <table>
              <tr><th>Step</th><th>❌ Vulnerable (steps 7–11)</th><th>✅ Fixed (steps 1–5)</th></tr>
              <tr><td>Request</td><td><code>GET /api/invoices/1042</code>, bob's token</td><td>same</td></tr>
              <tr><td>API check</td><td>"JWT valid ✓ scope ✓ …and that's it"</td><td>"JWT valid ✓ → sub=bob, tenant=acme"</td></tr>
              <tr><td>SQL</td><td><code>WHERE id = $1</code> with <code>['1042']</code></td><td><code>WHERE id = $1 AND owner_id = $2 AND tenant_id = $3</code> with <code>['1042', 'bob', 'acme']</code></td></tr>
              <tr><td>DB result</td><td>1 row, owner alice</td><td>0 rows</td></tr>
              <tr><td>Response</td><td><b>200 with alice's invoice + IBAN 💥</b></td><td><b>404 Not Found</b></td></tr>
            </table>
            <p>The multi-tenant pair works the same way. The only difference is where <code>tenant</code> comes from: <code>X-Tenant-Id</code> header (attacker-controlled) or the token's <code>tenant_id</code> claim (signed by the IdP), with RLS as the backstop.</p>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li><b>Every</b> endpoint that receives an object ID needs an object-level check: GET, PUT, DELETE, <code>/download</code>, <code>/export</code>, GraphQL resolvers, and batch endpoints.</li>
              <li>Put the condition <em>in the query</em> (or call the PDP with the loaded object), so it is hard to forget.</li>
              <li>Trusted inputs: verified token claims and server-side lookups. Untrusted: path, query, headers, body, cookies you didn't sign.</li>
              <li>Write a test for it: "user B requests user A's object → 404".</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>In <b>❌ Vulnerable</b>, click arrow 11 and look at the highlighted <code>owner_id</code>: the API never compared it with <code>sub</code>.</li>
              <li>Switch to <b>✅ Fixed</b> and compare the SQL at step 3 with step 9 of the vulnerable scenario.</li>
              <li>Play <b>❌ Tenant from a header</b> and <b>✅ Tenant from token + RLS</b> back to back: the request is byte-for-byte identical. Only the server's choice of trusted input differs.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Defense in depth: switch layers off and see what leaks',
        code: CSS + `
<div class="row small">
  <div class="card col"><h4>🧱 Layers</h4>
    <label><input type="checkbox" id="L1" checked> 🚪 Gateway: JWT valid + scope <code>invoices:read</code></label><br>
    <label><input type="checkbox" id="L2" checked> 🧾 Service: object-level check (owner + tenant)</label><br>
    <label><input type="checkbox" id="L3" checked> 🗄 DB: row-level security (tenant only)</label>
  </div>
  <div class="card col" style="flex:1.4"><h4>📨 Request</h4>
    <label><input type="radio" name="r" value="a"> no token at all</label><br>
    <label><input type="radio" name="r" value="b"> bob's token <i>without</i> invoices:read (scope: profile) → his invoice 1041</label><br>
    <label><input type="radio" name="r" value="c" checked> bob → his own invoice 1041</label><br>
    <label><input type="radio" name="r" value="d"> bob → alice's invoice 1042 (same tenant acme)</label><br>
    <label><input type="radio" name="r" value="e"> bob → globex invoice 2001 (other tenant)</label>
  </div>
</div>
<div style="text-align:center"><button class="primary" id="go">▶ Send</button></div>
<div class="pipe" id="pipe">
  <div class="stage"><b>🧑‍💻 Client</b></div><div class="arrow">→</div>
  <div class="stage" id="g1"><b>🚪 Gateway</b></div><div class="arrow">→</div>
  <div class="stage" id="g2"><b>🧾 Service</b></div><div class="arrow">→</div>
  <div class="stage" id="g3"><b>🗄 DB</b></div><div class="arrow">→</div>
  <div class="stage"><b>📤 Response</b><span id="st" class="small"></span></div>
  <div class="dot"></div>
</div>
<pre class="trace" id="log">Choose layers and a request, then ▶ Send.</pre>
<script>
` + PIPE + `
function $(i) { return document.getElementById(i); }
var INV = { '1041': { tenant: 'acme', owner: 'bob' }, '1042': { tenant: 'acme', owner: 'alice' }, '2001': { tenant: 'globex', owner: 'gina' } };
var REQ = {
  a: { tok: null, id: '1041' },
  b: { tok: { sub: 'bob', tenant: 'acme', scope: 'profile' }, id: '1041' },
  c: { tok: { sub: 'bob', tenant: 'acme', scope: 'invoices:read' }, id: '1041' },
  d: { tok: { sub: 'bob', tenant: 'acme', scope: 'invoices:read' }, id: '1042' },
  e: { tok: { sub: 'bob', tenant: 'acme', scope: 'invoices:read' }, id: '2001' },
};
function syncOff() { ['L1', 'L2', 'L3'].forEach(function (l, i) { $('g' + (i + 1)).classList.toggle('off', !$(l).checked); }); }
['L1', 'L2', 'L3'].forEach(function (l) { $(l).onchange = syncOff; });
syncOff();
$('go').onclick = function () {
  var r = REQ[document.querySelector('input[name=r]:checked').value], t = r.tok, inv = INV[r.id];
  var log = [], at = 4, status = '200 OK', block = false;
  log.push('<span class="b">GET /api/invoices/' + r.id + '</span>  ' + (t ? 'token: sub=' + t.sub + ' tenant=' + t.tenant + ' scope=' + t.scope : 'no Authorization header'));
  function stop(i, s, why) { at = i; status = s; block = true; log.push('<span class="r">✗ ' + why + '</span>'); }
  // gateway
  if (!$('L1').checked) log.push('<span class="c">🚪 gateway check disabled → pass</span>');
  else if (!t) stop(1, '401 Unauthorized', '🚪 gateway: no token → 401');
  else if (t.scope.indexOf('invoices:read') < 0) stop(1, '403 Forbidden (insufficient_scope)', '🚪 gateway: scope "' + t.scope + '" lacks invoices:read → 403');
  else log.push('<span class="g">✓ 🚪 gateway: signature/exp/aud ok, scope ok</span>');
  // service
  if (!block) {
    if (!$('L2').checked) log.push('<span class="c">🧾 service object check disabled → query by id only</span>');
    else if (!t) stop(2, '401 Unauthorized', '🧾 service: no identity → 401');
    else if (inv.tenant !== t.tenant || inv.owner !== t.sub) stop(2, '404 Not Found', '🧾 service: invoice ' + r.id + ' (' + inv.tenant + '/' + inv.owner + ') is not ' + t.tenant + '/' + t.sub + ' → 404');
    else log.push('<span class="g">✓ 🧾 service: ' + t.sub + ' owns ' + r.id + ' in tenant ' + t.tenant + '</span>');
  }
  // db
  if (!block) {
    if (!$('L3').checked) log.push('<span class="c">🗄 RLS disabled → row returned as-is</span>');
    else if (!t) stop(3, '404 Not Found', '🗄 RLS: app.tenant_id not set → 0 rows → 404');
    else if (inv.tenant !== t.tenant) stop(3, '404 Not Found', '🗄 RLS: row tenant ' + inv.tenant + ' ≠ ' + t.tenant + ' → 0 rows → 404');
    else log.push('<span class="g">✓ 🗄 RLS: tenant ' + inv.tenant + ' matches</span>' + (inv.owner !== (t && t.sub) ? '  <span class="y">(RLS only checks tenant, not owner!)</span>' : ''));
  }
  if (!block) {
    var leak = !t || inv.owner !== t.sub || t.scope.indexOf('invoices:read') < 0;
    log.push(leak ? '<span class="r">💥 200 OK: data returned that this caller must NOT see</span>' : '<span class="g">✓ 200 OK: legitimate access</span>');
    if (leak) status = '200 OK 💥 leak';
  }
  $('st').textContent = '';
  runPipe($('pipe'), at, block || /leak/.test(status), function () {
    $('st').textContent = ' ' + status;
    $('log').innerHTML = log.join('\\n');
  });
};
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>All layers on: send each request. Only "bob → his own invoice" gets 200. Note <em>which</em> layer stops each of the others.</li>
              <li>Turn off <b>Service</b> and send "bob → alice's invoice": the DB's RLS lets it through (same tenant). RLS on tenant alone does not stop BOLA <em>inside</em> a tenant.</li>
              <li>Service off, send "globex invoice": now RLS saves you. That is the safety net doing its job.</li>
              <li>Turn off <b>Gateway</b> and send "token without invoices:read": the service checks ownership but not scope, so a token never meant for invoices reads one. Either the gateway is mandatory, or the service checks scope too.</li>
              <li>Turn everything off and send "no token". 😱</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'alice (admin) uses a reporting app that was granted only <code>invoices:read</code>. The app calls DELETE /invoices/7. Result?',
        options: ['Allowed, alice is admin', 'Denied: the scope does not include delete (effective = scopes ∩ permissions)', 'Allowed, the token is valid', 'Depends on the app'], answer: 1,
        why: 'Scopes limit what the app may do on the user’s behalf, even when the user personally could.' },
      { q: 'What is OWASP API1:2023?',
        options: ['Broken Authentication', 'Broken Object Level Authorization (BOLA)', 'SSRF', 'Security Misconfiguration'], answer: 1,
        why: 'In the 2023 OWASP API Security Top 10, API1 is BOLA (IDOR in API form). API2 is Broken Authentication.' },
      { q: 'Which fix actually prevents IDOR on <code>GET /api/invoices/:id</code>?',
        options: ['Switch IDs to UUIDs', 'Hide the ID from the URL', 'Check that the invoice belongs to the caller (owner/tenant from the verified token) on every request', 'Rate-limit the endpoint'], answer: 2,
        why: 'Only an object-level authorization check fixes it. UUIDs and rate limits make exploitation harder but leave the hole open.' },
      { q: 'Where should the tenant ID used in queries come from?',
        options: ['An <code>X-Tenant-Id</code> header', 'The subdomain alone', 'A verified token claim or server-side session', 'A query parameter'], answer: 2,
        why: 'Anything the client sends can be edited. Signed claims or server-side state are trustworthy.' },
      { q: 'Why can an API gateway not prevent BOLA by itself?',
        options: ['Gateways cannot read headers', 'It never loads the object, so it cannot know who owns invoice 1042', 'Gateways do not support JWT', 'It can, always'], answer: 1,
        why: 'Gateways enforce coarse checks (token, scope, route). Object-level ownership needs the data, so it belongs in the service (or the DB).' },
    ],
    exercise: {
      task: `<p>This handler is vulnerable to BOLA and cross-tenant leaks. In the box below, pick the right value for <code>tenant</code> and the right extra check,
        then click <strong>Check</strong> to replay 5 requests (normal users and attackers).</p>`,
      hint: 'Both the tenant and the owner must come from req.user, which requireJwt filled from the verified token. Headers can be forged.',
      starter: mkIdorEx({ A: 0, B: 0 }),
      solution: mkIdorEx({ A: 2, B: 3 }),
    },
  });

  function mkTriage(pre) {
    return CSS + `
<div class="card">
  <h4>🚨 Incident triage: for each request, who rejects it, and with which status?</h4>
  <p class="small muted" style="margin:0 0 6px">Architecture: Browser → BFF (session cookie) → API gateway (validates JWT: signature, iss, aud, exp, scope) → Orders service (asks the PDP: owner/tenant/roles).</p>
  <table class="t" id="tbl"></table>
  <div style="margin-top:8px"><button class="primary" id="check">Check</button></div>
  <div id="out"></div>
</div>
<script>
var WHO = ['—', 'BFF', 'Gateway', 'Orders service / PDP', 'Nobody (succeeds)'];
var CODES = ['—', '200 OK', '302 Found (to IdP login)', '401 Unauthorized', '403 Forbidden'];
var CASES = [
  ['The browser has no session cookie and opens /orders/77', 1, 2, 'The BFF has no session, so it starts the OIDC login with a redirect to the IdP.'],
  ['Session ok, but the access token\\'s <code>exp</code> was 10 minutes ago (and the BFF did not refresh)', 2, 3, '401 + <code>error="invalid_token"</code>. The BFF should then use the refresh token and retry.'],
  ['Token valid, but <code>aud</code> is <code>billing-api</code>, not <code>orders-api</code>', 2, 3, 'A token minted for another API is not valid here: 401 invalid_token. Checking <code>aud</code> stops token reuse across APIs.'],
  ['Token valid with scope <code>openid orders:read</code>; the user calls <code>PUT /api/orders/77</code> (needs <code>orders:write</code>)', 2, 4, '403 + <code>error="insufficient_scope"</code>. A coarse check, so the gateway can do it without loading the order.'],
  ['Token valid, scope ok; alice reads order 91, which belongs to bob', 3, 4, 'Only the service has loaded order 91 and can ask the PDP about ownership. (Many APIs answer 404 here; this one is configured for 403.)'],
  ['Token valid, scope ok; alice reads her own order 77', 4, 1, 'Every layer says yes.'],
];
var PRE = ` + JSON.stringify(pre) + `;
var t = document.getElementById('tbl');
t.innerHTML = '<tr><th>#</th><th>Situation</th><th>Rejected by</th><th>Status</th></tr>' + CASES.map(function (c, i) {
  function sel(list, k, v) { return '<select data-k="' + k + i + '">' + list.map(function (o, j) { return '<option value="' + j + '"' + (j === v ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select>'; }
  return '<tr><td>' + (i + 1) + '</td><td class="small">' + c[0] + '</td><td>' + sel(WHO, 'w', PRE[i] ? PRE[i][0] : 0) + '</td><td>' + sel(CODES, 'c', PRE[i] ? PRE[i][1] : 0) + '</td></tr>';
}).join('');
document.getElementById('check').onclick = function () {
  var good = 0, h = '<ol class="small" style="margin:6px 0">';
  CASES.forEach(function (c, i) {
    var w = +t.querySelector('[data-k="w' + i + '"]').value, s = +t.querySelector('[data-k="c' + i + '"]').value;
    var ok = w === c[1] && s === c[2];
    if (ok) good++;
    h += '<li>' + (ok ? '✅ ' : '❌ ') + (ok ? c[3] : (w !== c[1] ? 'Wrong component. ' : '') + (s !== c[2] ? 'Wrong status. ' : '') + '<i>Think: which component has the information needed to say no?</i>') + '</li>';
  });
  h += '</ol>';
  document.getElementById('out').innerHTML = '<div class="result ' + (good === CASES.length ? 'pass' : 'fail') + ' pop"><b>' + good + ' / ' + CASES.length + ' correct.</b>' + h +
    (good === CASES.length ? 'You can now read any auth failure and point to the layer responsible. 🎓' : '') + '</div>';
};
</script>`;
  }

  L.push({
    id: 'putting-together',
    section: SECTION,
    title: 'Capstone: an end-to-end request',
    explain: `
      <p>Time to connect everything. A realistic web app today looks like this:</p>
      <pre><code>Browser ──cookie──▶ BFF / web app ──Bearer JWT──▶ API gateway ──▶ Orders service ──▶ Policy engine (PDP)
                         │  ▲
                         ▼  │ OIDC code + PKCE, refresh
                        IdP (OpenID Provider)</code></pre>
      <ul>
        <li><strong>Browser</strong>: holds only an <code>HttpOnly</code> session cookie, never the tokens. This is the <em>BFF (backend-for-frontend)</em> pattern recommended for browser apps.</li>
        <li><strong>BFF</strong>: a confidential OAuth client. It runs the OIDC authorization-code flow with PKCE, stores the tokens server-side, and attaches the access token to API calls.</li>
        <li><strong>IdP</strong>: authenticates the user (password, MFA, SSO) and issues an ID token, an access token and a refresh token.</li>
        <li><strong>API gateway</strong>: coarse checks on every call. Is the JWT signature valid, are <code>iss</code>, <code>aud</code> and <code>exp</code> right, and does the route's required scope appear in <code>scope</code>?</li>
        <li><strong>Orders service</strong>: loads the object and asks the <strong>PDP</strong> the fine-grained question (role, attributes, ownership, tenant).</li>
      </ul>
      <p>Each failure shows up at a predictable place with a predictable status code:</p>
      <table>
        <tr><th>What's wrong</th><th>Who notices</th><th>Response</th></tr>
        <tr><td>No session</td><td>BFF</td><td><code>302</code> to the IdP's <code>/authorize</code></td></tr>
        <tr><td>Expired / wrong-audience / bad-signature token</td><td>Gateway</td><td><code>401</code> <code>invalid_token</code>, then the BFF refreshes</td></tr>
        <tr><td>Scope missing</td><td>Gateway</td><td><code>403</code> <code>insufficient_scope</code></td></tr>
        <tr><td>Not your object / wrong tenant / policy says no</td><td>Service + PDP</td><td><code>403</code> (or <code>404</code>)</td></tr>
      </table>
      <div class="tip">Use the scenario tabs in the diagram below. The bar above the diagram shows which earlier lesson each step comes from.</div>
    `,
    examples: [
      {
        title: 'The whole journey: login → session → gateway → service → PDP',
        code: CSS + `
<style>.seq-diagram { max-height: 370px !important; }</style>
<div id="where" class="card" style="padding:4px 10px;margin-bottom:4px;font-size:13px">📚 Press <b>Next ▶</b>. This bar shows which lesson each step comes from.</div>
<div id="flow"></div>
<script>
var verifier = Auth.randB64url(32), challenge = Auth.sha256b64url(verifier);
var state = Auth.randB64url(12), nonce = Auth.randB64url(12), code = Auth.randB64url(18);
var sid = Auth.randB64url(24), rt = Auth.randB64url(32), rt2 = Auth.randB64url(32);
var NOW = 1793441700;
function at(exp, scope) {
  return Auth.jwtSign({ alg: 'HS256', typ: 'at+jwt', kid: 'demo-2026' }, { iss: 'https://login.acme.test', sub: 'u-17', aud: 'orders-api',
    client_id: 'shop-bff', scope: scope, roles: ['customer'], tenant_id: 'acme', iat: exp - 300, exp: exp }, 'demo-secret');
}
var AT = at(NOW + 300, 'openid profile orders:read');
var ATold = at(NOW - 600, 'openid profile orders:read');
var ATnew = at(NOW + 300, 'openid profile orders:read');
var IDT = Auth.jwtSign({ alg: 'HS256', typ: 'JWT' }, { iss: 'https://login.acme.test', sub: 'u-17', aud: 'shop-bff', nonce: nonce,
  name: 'Alice', email: 'alice@acme.test', amr: ['pwd', 'otp'], iat: NOW, exp: NOW + 300 }, 'demo-secret');
function short(t) { return t.slice(0, 38) + '…'; }
function dec(t) { return JSON.stringify(Auth.jwtDecode(t).payload, null, 2); }
var enc = encodeURIComponent;
var AUTHZ = '/authorize?response_type=code&client_id=shop-bff&redirect_uri=' + enc('https://shop.acme.test/callback') +
  '&scope=' + enc('openid profile orders:read') + '&state=' + state + '&nonce=' + nonce + '&code_challenge=' + challenge + '&code_challenge_method=S256';
var COOKIE = 'Cookie: __Host-sid=' + sid;
var BASIC = 'Authorization: Basic ' + Auth.b64('shop-bff:bff-client-secret');
function input(owner, id) {
  return 'POST /v1/data/orders/allow HTTP/1.1\\nHost: localhost:8181\\nContent-Type: application/json\\n\\n' + JSON.stringify({ input: {
    user: { id: 'u-17', roles: ['customer'], tenant: 'acme' }, action: 'read',
    resource: { type: 'order', id: id, owner: owner, tenant: 'acme' } } }, null, 2);
}
function gwCheck(ok, why) {
  return '# gateway JWT validation\\n# header: ' + JSON.stringify(Auth.jwtDecode(AT).header) + '\\n' +
    '✓ signature (key from https://login.acme.test/.well-known/jwks.json, kid=demo-2026)\\n✓ iss = https://login.acme.test\\n✓ aud = orders-api\\n' + (why || '✓ exp in the future\\n✓ scope contains orders:read');
}
var ORDER77 = 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"id": "77", "owner": "u-17", "tenant": "acme", "status": "shipped", "total": 59.90}';
var S = {
  login: [
    { from: 'br', to: 'bff', label: 'GET /orders/77 (no cookie)', msg: 'GET /orders/77 HTTP/1.1\\nHost: shop.acme.test\\nAccept: text/html', lesson: 'HTTP basics · sessions', note: 'Alice opens a link. There is no session cookie, so the BFF does not know who she is.' },
    { from: 'bff', to: 'bff', label: 'create PKCE verifier + state + nonce', lesson: 'OAuth 2 · PKCE',
      msg: '# kept server-side for this login attempt\\ncode_verifier  = ' + verifier + '\\ncode_challenge = BASE64URL(SHA256(verifier)) = ' + challenge + '\\nstate = ' + state + '\\nnonce = ' + nonce,
      set: { bff: { pkce_verifier: verifier.slice(0, 12) + '…', state: state } }, note: 'Real values, computed with SHA-256 in your browser.' },
    { from: 'bff', to: 'br', kind: 'redirect', label: '302 → IdP /authorize', hl: ['code_challenge', 'scope'], lesson: 'OIDC · authorization code flow',
      msg: 'HTTP/1.1 302 Found\\nLocation: https://login.acme.test' + AUTHZ, note: 'The requested <code>scope</code> includes <code>orders:read</code>. That scope is the delegation the gateway will check later.' },
    { from: 'br', to: 'idp', label: 'GET /authorize?…', msg: 'GET ' + AUTHZ + ' HTTP/1.1\\nHost: login.acme.test', lesson: 'OIDC' },
    { from: 'idp', to: 'idp', label: 'login: password + OTP, consent', lesson: 'Passwords · MFA · SSO',
      note: 'Authentication happens <b>only here</b>. With SSO, an existing IdP session would skip the password prompt.', set: { idp: { session: 'alice (pwd+otp)' } } },
    { from: 'idp', to: 'br', kind: 'redirect', label: '302 → /callback?code&state', lesson: 'OAuth 2',
      msg: 'HTTP/1.1 302 Found\\nLocation: https://shop.acme.test/callback?code=' + code + '&state=' + state },
    { from: 'br', to: 'bff', label: 'GET /callback?code=…&state=…', msg: 'GET /callback?code=' + code + '&state=' + state + ' HTTP/1.1\\nHost: shop.acme.test', lesson: 'OAuth 2 · CSRF protection via state',
      note: 'The BFF checks that <code>state</code> matches what it stored.' },
    { from: 'bff', to: 'idp', kind: 'back', label: 'POST /token (code + code_verifier)', hl: ['code_verifier', 'grant_type'], lesson: 'OAuth 2 · PKCE',
      msg: 'POST /token HTTP/1.1\\nHost: login.acme.test\\n' + BASIC + '\\nContent-Type: application/x-www-form-urlencoded\\n\\ngrant_type=authorization_code&code=' + code + '&redirect_uri=' + enc('https://shop.acme.test/callback') + '&code_verifier=' + verifier,
      note: 'Back-channel: the browser never sees this. The IdP hashes the verifier and compares it with the challenge from step 3.' },
    { from: 'idp', to: 'bff', kind: 'back', label: '200 {access, id, refresh tokens}', lesson: 'Tokens · JWT',
      msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\nCache-Control: no-store\\n\\n' + JSON.stringify({ access_token: short(AT), token_type: 'Bearer', expires_in: 300, refresh_token: short(rt), id_token: short(IDT), scope: 'openid profile orders:read' }, null, 2),
      set: { bff: { access_token: 'exp +5 min', refresh_token: rt.slice(0, 10) + '…' } } },
    { from: 'bff', to: 'bff', label: 'verify ID token, create session', lesson: 'OIDC · ID token validation', hl: ['nonce', 'aud'],
      msg: '# ID token payload\\n' + dec(IDT) + '\\n# check: signature, iss, aud = shop-bff, exp, nonce matches',
      set: { bff: { ['session ' + sid.slice(0, 6) + '…']: 'alice, tokens stored server-side' } } },
    { from: 'bff', to: 'br', kind: 'redirect', label: '302 /orders/77 + Set-Cookie', hl: ['Set-Cookie', 'HttpOnly'], lesson: 'Cookies · sessions',
      msg: 'HTTP/1.1 302 Found\\nLocation: /orders/77\\nSet-Cookie: __Host-sid=' + sid + '; Path=/; Secure; HttpOnly; SameSite=Lax',
      set: { br: { '__Host-sid': sid.slice(0, 10) + '…' } }, note: 'The browser gets only an opaque, HttpOnly cookie. JavaScript (and XSS) cannot read any token.' },
  ],
  happy: [
    { from: 'br', to: 'bff', label: 'GET /orders/77 + cookie', msg: 'GET /orders/77 HTTP/1.1\\nHost: shop.acme.test\\n' + COOKIE, lesson: 'Cookies · sessions' },
    { from: 'bff', to: 'bff', label: 'session → access token (still valid)', lesson: 'BFF pattern', note: 'Look up the session and take the stored access token.' },
    { from: 'bff', to: 'gw', label: 'GET /api/orders/77 + Bearer', hl: ['Authorization'], lesson: 'Bearer tokens',
      msg: 'GET /api/orders/77 HTTP/1.1\\nHost: api.acme.test\\nAuthorization: Bearer ' + AT + '\\n\\n# payload:\\n' + dec(AT) },
    { from: 'gw', to: 'gw', label: 'validate JWT: sig, iss, aud, exp, scope', msg: gwCheck(true), lesson: 'JWT · scopes vs permissions (this section)',
      note: '<b>Coarse authorization</b>: route <code>GET /api/orders/*</code> requires scope <code>orders:read</code>. The gateway never loads order 77. (Demo token uses HS256 so the browser can sign it; real IdPs sign with RS256/ES256.)' },
    { from: 'gw', to: 'svc', label: 'forward + X-Request-Id', msg: 'GET /orders/77 HTTP/1.1\\nHost: orders.internal\\nAuthorization: Bearer ' + short(AT) + '\\nX-Request-Id: 7f3a9c', lesson: 'Gateway (this section)',
      note: 'The token is forwarded so the service can verify it too and read its claims.' },
    { from: 'svc', to: 'svc', label: 'verify, load order 77', lesson: 'IDOR / BOLA (this section)', set: { svc: { 'order 77': 'owner u-17, tenant acme' } },
      note: 'The service has the object now, so it can make the <b>object-level</b> decision.' },
    { from: 'svc', to: 'pdp', label: 'POST /v1/data/orders/allow', msg: input('u-17', '77'), hl: ['"owner": "u-17"'], lesson: 'Policy as code · RBAC/ABAC (this section)' },
    { from: 'pdp', to: 'svc', kind: 'res', label: '{"result": true}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"result": true}', lesson: 'Policy as code', note: 'Rule "owner of the order" applies.' },
    { from: 'svc', to: 'gw', kind: 'res', label: '200 order JSON', msg: ORDER77, lesson: 'HTTP basics' },
    { from: 'gw', to: 'bff', kind: 'res', label: '200', msg: ORDER77, lesson: 'HTTP basics' },
    { from: 'bff', to: 'br', kind: 'res', label: '200 page', msg: 'HTTP/1.1 200 OK\\nContent-Type: text/html\\n\\n<h1>Order 77 · shipped · €59.90</h1>', lesson: 'BFF pattern' },
  ],
  expired: [
    { from: 'br', to: 'bff', label: 'GET /orders/77 + cookie', msg: 'GET /orders/77 HTTP/1.1\\nHost: shop.acme.test\\n' + COOKIE, lesson: 'Sessions' },
    { from: 'bff', to: 'gw', label: 'Bearer (expired token)', msg: 'GET /api/orders/77 HTTP/1.1\\nHost: api.acme.test\\nAuthorization: Bearer ' + short(ATold) + '\\n\\n# payload:\\n' + dec(ATold), hl: ['"exp"'], lesson: 'JWT' },
    { from: 'gw', to: 'gw', kind: 'err', label: 'exp < now ✗', lesson: 'JWT validation', msg: gwCheck(false, '✗ exp = ' + (NOW - 600) + ' < now = ' + NOW + '  (expired 10 min ago)') },
    { from: 'gw', to: 'bff', kind: 'err', label: '401 invalid_token', hl: ['invalid_token'], lesson: 'Bearer tokens (RFC 6750)',
      msg: 'HTTP/1.1 401 Unauthorized\\nWWW-Authenticate: Bearer error="invalid_token",\\n  error_description="The access token expired"' },
    { from: 'bff', to: 'idp', kind: 'back', label: 'POST /token grant_type=refresh_token', hl: ['refresh_token'], lesson: 'OAuth 2 · refresh tokens',
      msg: 'POST /token HTTP/1.1\\nHost: login.acme.test\\n' + BASIC + '\\nContent-Type: application/x-www-form-urlencoded\\n\\ngrant_type=refresh_token&refresh_token=' + rt,
      note: 'The user notices nothing. A good BFF refreshes <em>before</em> <code>exp</code> to avoid this extra round trip.' },
    { from: 'idp', to: 'bff', kind: 'back', label: '200 new access + rotated refresh', lesson: 'OAuth 2 · refresh token rotation',
      msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\nCache-Control: no-store\\n\\n' + JSON.stringify({ access_token: short(ATnew), token_type: 'Bearer', expires_in: 300, refresh_token: short(rt2) }, null, 2),
      set: { bff: { access_token: 'NEW, exp +5 min', refresh_token: rt2.slice(0, 10) + '… (rotated)' } }, note: 'Rotation: the old refresh token is now invalid. Reusing it would signal theft.' },
    { from: 'bff', to: 'gw', label: 'retry with new Bearer', msg: 'GET /api/orders/77 HTTP/1.1\\nHost: api.acme.test\\nAuthorization: Bearer ' + short(ATnew), lesson: 'Bearer tokens' },
    { from: 'gw', to: 'gw', label: 'validate ✓', msg: gwCheck(true), lesson: 'JWT' },
    { from: 'gw', to: 'svc', label: 'forward', msg: 'GET /orders/77 HTTP/1.1\\nHost: orders.internal\\nAuthorization: Bearer ' + short(ATnew), lesson: 'Gateway' },
    { from: 'svc', to: 'svc', label: 'PDP: allow ✓', lesson: 'Policy as code', note: 'Same object-level check as in the happy path.' },
    { from: 'svc', to: 'gw', kind: 'res', label: '200', msg: ORDER77, lesson: 'HTTP basics' },
    { from: 'gw', to: 'bff', kind: 'res', label: '200', msg: ORDER77, lesson: 'HTTP basics' },
    { from: 'bff', to: 'br', kind: 'res', label: '200 page', msg: 'HTTP/1.1 200 OK\\nContent-Type: text/html\\n\\n<h1>Order 77</h1>', lesson: 'BFF pattern' },
  ],
  scope: [
    { from: 'br', to: 'bff', label: 'POST /orders/77/refund', msg: 'POST /orders/77/refund HTTP/1.1\\nHost: shop.acme.test\\n' + COOKIE + '\\nX-CSRF-Token: 9b1c44e0\\nContent-Type: application/json\\n\\n{"reason": "damaged"}', lesson: 'Cookies · CSRF',
      note: 'Cookie-authenticated, state-changing request, so it carries a CSRF token too.' },
    { from: 'bff', to: 'gw', label: 'POST /api/orders/77/refund + Bearer', msg: 'POST /api/orders/77/refund HTTP/1.1\\nHost: api.acme.test\\nAuthorization: Bearer ' + short(AT) + '\\n\\n# token scope: "openid profile orders:read"', hl: ['scope'], lesson: 'Bearer tokens' },
    { from: 'gw', to: 'gw', kind: 'err', label: 'route needs orders:refund ✗', lesson: 'Scopes vs permissions (this section)',
      msg: gwCheck(false, '✓ exp in the future\\n✗ route POST /api/orders/*/refund requires scope orders:refund\\n  token scope = "openid profile orders:read"'),
      note: 'The BFF never asked for <code>orders:refund</code> at login, so this token cannot be used for refunds, whoever the user is.' },
    { from: 'gw', to: 'bff', kind: 'err', label: '403 insufficient_scope', hl: ['insufficient_scope'], lesson: 'Bearer tokens (RFC 6750 §3.1)',
      msg: 'HTTP/1.1 403 Forbidden\\nWWW-Authenticate: Bearer error="insufficient_scope",\\n  scope="orders:refund"' },
    { from: 'bff', to: 'br', kind: 'err', label: '403 page', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: text/html\\n\\n<p>You can\\'t request refunds here.</p>', lesson: 'Authorization basics',
      note: 'The Orders service and the PDP never saw this request: the gateway stopped it early and cheaply.' },
  ],
  owner: [
    { from: 'br', to: 'bff', label: 'GET /orders/91 + cookie', msg: 'GET /orders/91 HTTP/1.1\\nHost: shop.acme.test\\n' + COOKIE, lesson: 'Sessions', note: 'Alice edits the URL: 77 → 91.' },
    { from: 'bff', to: 'gw', label: 'GET /api/orders/91 + Bearer', msg: 'GET /api/orders/91 HTTP/1.1\\nHost: api.acme.test\\nAuthorization: Bearer ' + short(AT), lesson: 'Bearer tokens' },
    { from: 'gw', to: 'gw', label: 'sig ✓ iss ✓ aud ✓ exp ✓ scope ✓', msg: gwCheck(true), lesson: 'JWT', note: 'Everything the gateway can check is fine. It cannot know who owns order 91.' },
    { from: 'gw', to: 'svc', label: 'forward', msg: 'GET /orders/91 HTTP/1.1\\nHost: orders.internal\\nAuthorization: Bearer ' + short(AT), lesson: 'Gateway' },
    { from: 'svc', to: 'svc', label: 'load 91 (owner u-99)', set: { svc: { 'order 91': 'owner u-99, tenant acme' } }, lesson: 'IDOR / BOLA (this section)' },
    { from: 'svc', to: 'pdp', label: 'POST /v1/data/orders/allow', msg: input('u-99', '91'), hl: ['"owner": "u-99"', '"id": "u-17"'], lesson: 'Policy as code' },
    { from: 'pdp', to: 'svc', kind: 'res', label: '{"result": false}', msg: 'HTTP/1.1 200 OK\\nContent-Type: application/json\\n\\n{"result": false}', lesson: 'Policy as code', note: 'No rule applies: not owner, not support, not admin → default deny.' },
    { from: 'svc', to: 'gw', kind: 'err', label: '403 Forbidden', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: application/json\\n\\n{"error": "forbidden"}', lesson: 'Authorization basics' },
    { from: 'gw', to: 'bff', kind: 'err', label: '403', msg: 'HTTP/1.1 403 Forbidden', lesson: 'HTTP basics' },
    { from: 'bff', to: 'br', kind: 'err', label: '403 page', msg: 'HTTP/1.1 403 Forbidden\\nContent-Type: text/html\\n\\n<p>This order is not yours.</p>', lesson: 'IDOR / BOLA',
      note: 'BOLA prevented at the only layer that could: the service, using the PDP.' },
  ],
};
var where = document.getElementById('where');
Seq.mount('#flow', {
  actors: [
    { id: 'br', label: 'Browser', icon: '🌐', store: {} },
    { id: 'bff', label: 'BFF', icon: '🖥', store: {} },
    { id: 'idp', label: 'IdP', icon: '🏛', store: {} },
    { id: 'gw', label: 'Gateway', icon: '🚪', store: { requires: 'GET /api/orders/* → orders:read' } },
    { id: 'svc', label: 'Orders', icon: '📦', store: {} },
    { id: 'pdp', label: 'PDP', icon: '⚖️', store: { policy: 'owner | support+tenant | admin+mfa' } },
  ],
  scenarios: [
    { name: '① Login (OIDC + PKCE)', steps: S.login },
    { name: '② ✅ API call', steps: S.happy },
    { name: '③ ⏰ Expired → refresh', steps: S.expired },
    { name: '④ 🚫 Missing scope', steps: S.scope },
    { name: '⑤ 🚫 Not the owner', steps: S.owner },
  ],
  onStep: function (i, s) {
    where.innerHTML = '📚 Step ' + (i + 1) + ' comes from: <b>' + (s.lesson || '') + '</b>';
  },
  onScenario: function () { where.innerHTML = '📚 Press <b>Next ▶</b>. This bar shows which lesson each step comes from.'; },
});
</script>`,
        explain: `
          <details>
            <summary>The problem: knowing each piece is not the same as knowing where each check lives</summary>
            <p>Most real auth bugs are not broken crypto. They are checks done in the wrong place: a gateway expected to stop BOLA, a service that trusts a header,
            or a browser holding tokens it should not have. Following one request end to end shows which component knows what, and therefore which component must decide what.</p>
          </details>
          <details>
            <summary>Step by step: scenario ② ✅ API call</summary>
            <table>
              <tr><th>#</th><th>Arrow</th><th>What is checked</th><th>Lesson</th></tr>
              <tr><td>1</td><td>Browser → BFF <code>GET /orders/77 + cookie</code></td><td>Session cookie present</td><td>Cookies · sessions</td></tr>
              <tr><td>2</td><td>BFF: <code>session → access token (still valid)</code></td><td>Session lookup, token not expired</td><td>BFF pattern</td></tr>
              <tr><td>3</td><td>BFF → Gateway <code>GET /api/orders/77 + Bearer</code></td><td>(the decoded payload shows <code>aud</code>, <code>scope</code>, <code>roles</code>, <code>tenant_id</code>)</td><td>Bearer tokens</td></tr>
              <tr><td>4</td><td>Gateway: <code>validate JWT: sig, iss, aud, exp, scope</code></td><td><b>Coarse authZ</b>: route needs <code>orders:read</code></td><td>JWT · scopes</td></tr>
              <tr><td>5</td><td>Gateway → Orders <code>forward + X-Request-Id</code></td><td>Token forwarded</td><td>Gateway</td></tr>
              <tr><td>6</td><td>Orders: <code>verify, load order 77</code></td><td>Object loaded: owner u-17, tenant acme</td><td>IDOR / BOLA</td></tr>
              <tr><td>7–8</td><td>Orders → PDP <code>POST /v1/data/orders/allow</code> → <code>{"result": true}</code></td><td><b>Fine authZ</b>: owner of the order</td><td>Policy as code</td></tr>
              <tr><td>9–11</td><td><code>200</code> back through Gateway and BFF to the Browser</td><td>—</td><td>HTTP basics</td></tr>
            </table>
          </details>
          <details>
            <summary>Key ideas</summary>
            <ul>
              <li><b>AuthN happens once</b>, at the IdP (step 5 of ①). Everything afterwards relies on <em>artifacts</em> of that login: the session cookie, then the signed JWT.</li>
              <li><b>Coarse vs fine</b>: the gateway rejects what it can judge from the token alone (③ expired, ④ missing scope). Only the service can judge the object (⑤ not owner).</li>
              <li><b>401 vs 403</b>: ③ ends in 401 <code>invalid_token</code> (fixable by refreshing). ④ and ⑤ end in 403 (no retry will help).</li>
              <li>The browser never holds a token. The BFF is the OAuth client. Refresh and rotation happen server-to-server.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>In ①, open step 2 and step 8: the <code>code_challenge</code> is the SHA-256 of the <code>code_verifier</code>, computed live.</li>
              <li>Compare the Gateway state card across ② and ④: same rule table, a different route, a different outcome.</li>
              <li>In ⑤, click arrow 3: every gateway check is ✓, yet the request is still refused at arrow 7. Explain to yourself why the gateway could not have caught it.</li>
              <li>In ③, find the step where the old refresh token becomes useless.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In the capstone, which component can detect that alice is reading bob’s order?',
        options: ['The IdP', 'The API gateway', 'The Orders service (with the PDP)', 'The browser'], answer: 2,
        why: 'Only the service loads the order and knows its owner. The gateway sees a valid token with the right scope.' },
      { q: 'The gateway returns <code>401</code> with <code>error="invalid_token"</code> because <code>exp</code> passed. What should the BFF do?',
        options: ['Show "access denied"', 'Use its refresh token at the IdP’s /token endpoint and retry', 'Send the user’s password again', 'Remove the scope'], answer: 1,
        why: 'Expired access tokens are expected. The refresh-token grant gets a new one without bothering the user.' },
      { q: 'Why does the browser hold only an <code>HttpOnly</code> session cookie, not the access token?',
        options: ['Cookies are faster', 'XSS-injected JavaScript cannot read HttpOnly cookies, and the tokens stay server-side in the BFF', 'Browsers cannot store JWTs', 'The IdP requires it'], answer: 1,
        why: 'This is the BFF pattern. Tokens never reach JavaScript, which shrinks the impact of XSS.' },
      { q: 'A request is refused with <code>403 insufficient_scope</code>. Which layer most likely refused it, and did the Orders service run?',
        options: ['The PDP; yes', 'The gateway; no', 'The IdP; yes', 'The browser; no'], answer: 1,
        why: 'Scope is a coarse check the gateway performs from the token alone. The request never reached the service.' },
    ],
    exercise: {
      task: `<p>For each incident in the box below, choose which component rejects the request and with which status code, then click <strong>Check</strong>.</p>`,
      hint: 'No session → the BFF redirects (302). Problems visible in the token alone (exp, aud, scope) → the gateway. Problems that need the order itself → the service.',
      starter: mkTriage([]),
      solution: mkTriage([[1, 2], [2, 3], [2, 3], [2, 4], [3, 4], [4, 1]]),
    },
  });
})();
