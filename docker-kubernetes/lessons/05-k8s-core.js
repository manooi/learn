// Lessons: Kubernetes Core
// Visual simulators (lang html) + reference manifests / kubectl sessions (runnable: false).
window.LESSONS = window.LESSONS || [];

(function () {
  // Tiny YAML reader + checklist widget shared by this file's exercises.
  // (Code strings use String.raw so regex backslashes survive the template literal.)
  const YAML_LIB = String.raw`// ---- tiny YAML reader: enough for K8s manifests, not a full YAML parser ----
function parseYAML(src) {
  return src.replace(/\t/g, '  ').split(/^---[ ]*$/m).map(parseDoc)
    .filter(function (d) { return d != null; });
}
function parseDoc(text) {
  var lines = [];
  text.split('\n').forEach(function (raw, n) {
    var l = raw.replace(/^\s*#.*$/, '').replace(/\s+#.*$/, '');
    if (l.trim()) lines.push({ ind: l.search(/\S/), text: l.trim(), n: n + 1 });
  });
  if (!lines.length) return null;
  var pos = { i: 0 };
  var doc = block(lines, pos, lines[0].ind);
  if (pos.i < lines.length) {
    throw new Error('unexpected indentation near "' + lines[pos.i].text + '"');
  }
  return doc;
}
function isItem(t) { return t === '-' || t.indexOf('- ') === 0; }
function block(lines, pos, ind) {
  return isItem(lines[pos.i].text) ? list(lines, pos, ind) : map(lines, pos, ind);
}
function map(lines, pos, ind) {
  var obj = {};
  while (pos.i < lines.length && lines[pos.i].ind === ind && !isItem(lines[pos.i].text)) {
    var m = lines[pos.i].text.match(/^("[^"]*"|'[^']*'|[^:]+?)\s*:(?:\s+(.*))?$/);
    if (!m) throw new Error('expected "key: value" near "' + lines[pos.i].text + '"');
    var key = unq(m[1]);
    var rest = m[2];
    pos.i++;
    var next = lines[pos.i];
    if (rest && /^[|>][-+]?$/.test(rest)) {
      var buf = [];
      while (pos.i < lines.length && lines[pos.i].ind > ind) buf.push(lines[pos.i++].text);
      obj[key] = buf.join('\n');
    } else if (rest) obj[key] = scalar(rest);
    else if (next && next.ind > ind) obj[key] = block(lines, pos, next.ind);
    else if (next && next.ind === ind && isItem(next.text)) obj[key] = list(lines, pos, ind);
    else obj[key] = null;
  }
  return obj;
}
function list(lines, pos, ind) {
  var arr = [];
  while (pos.i < lines.length && lines[pos.i].ind === ind && isItem(lines[pos.i].text)) {
    var line = lines[pos.i];
    var rest = line.text.replace(/^-\s*/, '');
    if (!rest) {
      pos.i++;
      var nx = lines[pos.i];
      arr.push(nx && nx.ind > ind ? block(lines, pos, nx.ind) : null);
    } else if (/^("[^"]*"|'[^']*'|[^:\[\{"']+?)\s*:(\s|$)/.test(rest)) {
      // "- key: value" starts a map: treat the text after "- " as its own indented line
      var inner = ind + (line.text.length - rest.length);
      lines[pos.i] = { ind: inner, text: rest, n: line.n };
      arr.push(map(lines, pos, inner));
    } else {
      arr.push(scalar(rest));
      pos.i++;
    }
  }
  return arr;
}
function unq(s) {
  s = s.trim();
  var q = s[0];
  return (q === '"' || q === "'") && s.length > 1 && s[s.length - 1] === q ? s.slice(1, -1) : s;
}
function scalar(s) {
  s = s.trim();
  if (s[0] === '[' && s[s.length - 1] === ']') {
    return s.slice(1, -1).split(',').map(function (x) { return x.trim(); })
      .filter(Boolean).map(scalar);
  }
  if (s[0] === '{' && s[s.length - 1] === '}') {
    var o = {};
    s.slice(1, -1).split(',').forEach(function (kv) {
      var p = kv.split(':');
      if (p.length > 1) o[unq(p[0])] = scalar(p.slice(1).join(':'));
    });
    return o;
  }
  var u = unq(s);
  if (u !== s) return u;
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (s === 'true' || s === 'false') return s === 'true';
  if (s === 'null' || s === '~') return null;
  return s;
}
// helpers for the checks below
function get(o, path) {
  return path.split('.').reduce(function (a, k) { return a == null ? undefined : a[k]; }, o);
}
function kind(docs, k) {
  return docs.filter(function (d) { return d && d.kind === k; })[0];
}
function arr(x) { return Array.isArray(x) ? x : []; }
function low(x) { return String(x == null ? '' : x).trim().toLowerCase(); }
function sameLabels(selector, labels) {
  var keys = Object.keys(selector || {});
  return keys.length > 0 && keys.every(function (k) {
    return labels && String(labels[k]) === String(selector[k]);
  });
}`;

  const checker = (yaml, checks, rows) => String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; }
  textarea {
    width: 100%; box-sizing: border-box; margin: 0;
    font: 13px/1.45 ui-monospace, Menlo, Consolas, monospace;
    background: #fff; color: #1f2330;
  }
  #out { list-style: none; padding: 0; margin: 8px 0 0; }
  #out li { padding: 3px 10px; margin: 3px 0; border-radius: 6px; font-size: 14px; }
  #out li.ok { background: #e3f5e9; color: #125c2f; }
  #out li.bad { background: #fdecec; color: #8f1f24; }
  #out li.sum { background: #fff; font-weight: 600; }
  code { background: rgba(0,0,0,.06); padding: 0 4px; border-radius: 4px; }
</style>
<textarea id="f" spellcheck="false" rows="${rows || 18}">${yaml}</textarea>
<button id="check">Check</button>
<ul id="out"></ul>

<script>
${YAML_LIB}

// ---- the requirements ----
var CHECKS = ${checks};

function runChecks() {
  var out = document.getElementById('out');
  out.innerHTML = '';
  var docs = [];
  var err = null;
  try {
    docs = parseYAML(document.getElementById('f').value);
  } catch (e) {
    err = e.message;
  }
  function add(ok, label, cls) {
    var li = document.createElement('li');
    li.className = cls || (ok ? 'ok' : 'bad');
    li.innerHTML = (cls ? '' : ok ? '✓ ' : '✗ ') + label;
    out.appendChild(li);
  }
  if (err) add(false, 'YAML could not be read: ' + err);
  var passed = 0;
  CHECKS.forEach(function (c) {
    var ok = false;
    try { ok = !err && !!c[1](docs); } catch (e) { ok = false; }
    if (ok) passed++;
    add(ok, c[0]);
  });
  add(true, passed + ' / ' + CHECKS.length + ' checks pass' +
    (passed === CHECKS.length ? ' - nice!' : ''), 'sum');
  console.log('checked: ' + passed + '/' + CHECKS.length);
}
document.getElementById('check').addEventListener('click', runChecks);
runChecks();
</script>`;

  // ---- exercise requirements (JS source injected into each checker widget) ----
  const CHECKS_KIND = String.raw`[
  ['<code>kind: Cluster</code> and <code>apiVersion: kind.x-k8s.io/v1alpha4</code>', function (d) {
    return d[0].kind === 'Cluster' && d[0].apiVersion === 'kind.x-k8s.io/v1alpha4';
  }],
  ['exactly one <code>control-plane</code> node', function (d) {
    return arr(d[0].nodes).filter(function (n) { return low(n.role) === 'control-plane'; }).length === 1;
  }],
  ['at least two <code>worker</code> nodes', function (d) {
    return arr(d[0].nodes).filter(function (n) { return low(n.role) === 'worker'; }).length >= 2;
  }],
  ['control-plane maps <code>containerPort: 30080</code> to <code>hostPort: 8080</code>', function (d) {
    var cp = arr(d[0].nodes).filter(function (n) { return low(n.role) === 'control-plane'; })[0];
    return arr(cp && cp.extraPortMappings).some(function (m) {
      return Number(m.containerPort) === 30080 && Number(m.hostPort) === 8080;
    });
  }],
]`;

  const CHECKS_ARCH = String.raw`[
  ['stores all cluster state', function (d) { return /^etcd$/.test(low(d[0]['stores all cluster state'])); }],
  ['the only one talking to etcd', function (d) {
    return /^(kube-)?api-?server$|^kube-apiserver$|^api server$/.test(low(d[0]['validates requests and is the only one talking to etcd']));
  }],
  ['picks a node for a new pod', function (d) {
    return /^(kube-)?scheduler$/.test(low(d[0]['picks a node for a new pod']));
  }],
  ['runs the Deployment and ReplicaSet controllers', function (d) {
    return /^(kube-)?controller-?manager$/.test(low(d[0]['runs the Deployment and ReplicaSet controllers']));
  }],
  ['starts pods on its own node', function (d) {
    return /^kubelet$/.test(low(d[0]['starts pods on its own node and reports their status']));
  }],
  ['pulls images and runs containers', function (d) {
    return /^(containerd|cri-o|container runtime)$/.test(low(d[0]['actually pulls images and runs containers']));
  }],
  ['programs Service virtual IPs', function (d) {
    return /^kube-?proxy$/.test(low(d[0]['programs Service virtual IPs on every node']));
  }],
]`;

  const CHECKS_MANIFEST = String.raw`[
  ['<code>apiVersion: apps/v1</code> + <code>kind: Deployment</code>', function (d) {
    return d[0].apiVersion === 'apps/v1' && d[0].kind === 'Deployment';
  }],
  ['<code>metadata.name: web</code>', function (d) { return get(d[0], 'metadata.name') === 'web'; }],
  ['<code>spec.replicas: 2</code> (a number)', function (d) { return get(d[0], 'spec.replicas') === 2; }],
  ['no misspelled <code>spec.replica</code> field', function (d) { return get(d[0], 'spec.replica') === undefined; }],
  ['<code>spec.selector.matchLabels</code> matches the template labels', function (d) {
    return sameLabels(get(d[0], 'spec.selector.matchLabels'), get(d[0], 'spec.template.metadata.labels'));
  }],
  ['no <code>status:</code> section', function (d) { return !('status' in d[0]); }],
]`;

  const CHECKS_SIDECAR = String.raw`[
  ['<code>apiVersion: v1</code> + <code>kind: Pod</code>', function (d) {
    return d[0].apiVersion === 'v1' && d[0].kind === 'Pod';
  }],
  ['<code>log-agent</code> is in <code>initContainers</code> with <code>restartPolicy: Always</code>', function (d) {
    return arr(get(d[0], 'spec.initContainers')).some(function (c) {
      return c.name === 'log-agent' && c.restartPolicy === 'Always';
    });
  }],
  ['<code>log-agent</code> is no longer in <code>containers</code>', function (d) {
    return !arr(get(d[0], 'spec.containers')).some(function (c) { return c.name === 'log-agent'; });
  }],
  ['<code>app</code> is in <code>containers</code>', function (d) {
    return arr(get(d[0], 'spec.containers')).some(function (c) { return c.name === 'app'; });
  }],
  ['pod <code>volumes</code> has <code>logs</code> with <code>emptyDir</code>', function (d) {
    return arr(get(d[0], 'spec.volumes')).some(function (v) { return v.name === 'logs' && 'emptyDir' in v; });
  }],
  ['both <code>app</code> and <code>log-agent</code> mount <code>logs</code>', function (d) {
    var all = arr(get(d[0], 'spec.containers')).concat(arr(get(d[0], 'spec.initContainers')));
    return ['app', 'log-agent'].every(function (n) {
      return all.some(function (c) {
        return c.name === n && arr(c.volumeMounts).some(function (m) { return m.name === 'logs' && m.mountPath; });
      });
    });
  }],
]`;

  const CHECKS_LABELS = String.raw`[
  ['Deployment <code>api</code> is in namespace <code>shop</code>', function (d) {
    return get(kind(d, 'Deployment'), 'metadata.namespace') === 'shop';
  }],
  ['template labels include every <code>matchLabels</code> pair', function (d) {
    var dep = kind(d, 'Deployment');
    return sameLabels(get(dep, 'spec.selector.matchLabels'), get(dep, 'spec.template.metadata.labels'));
  }],
  ['Service <code>api</code> (namespace shop) selects the pod template labels', function (d) {
    var svc = kind(d, 'Service');
    return get(svc, 'metadata.namespace') === 'shop' &&
      sameLabels(get(svc, 'spec.selector'), get(kind(d, 'Deployment'), 'spec.template.metadata.labels'));
  }],
  ['<code>API_URL</code> uses the cross-namespace name + port 8080', function (d) {
    return /^http:\/\/api\.shop(\.svc(\.cluster\.local)?)?:8080\/?$/.test(get(kind(d, 'ConfigMap'), 'data.API_URL'));
  }],
]`;

  window.LESSONS.push(
    // ------------------------------------------------------------------ why-kubernetes
    {
      id: 'why-kubernetes',
      section: 'Kubernetes Core',
      title: 'Why Kubernetes?',
      explain: `
      <p>So far you ran containers on <strong>one machine</strong>: <code>docker run</code> for one container,
      <code>docker compose up</code> for a small stack. That works great on a laptop or a single server.
      Production is different: you have <strong>many machines</strong>, and machines fail.</p>

      <h3>What breaks when you have 10 servers instead of 1</h3>
      <ul>
        <li><strong>Scheduling</strong> - which server has enough CPU and memory for the next container? With Compose you pick the machine yourself (you <code>ssh</code> in and run it).</li>
        <li><strong>Self-healing</strong> - <code>restart: always</code> restarts a crashed container <em>on the same machine</em>. If the machine itself dies, nobody moves its containers somewhere else.</li>
        <li><strong>Scaling</strong> - going from 3 to 30 copies across servers, then back down at night.</li>
        <li><strong>Rollouts</strong> - replacing v1 with v2 a few copies at a time, and rolling back fast if v2 is broken.</li>
        <li><strong>Service discovery &amp; load balancing</strong> - containers get new IPs every time they move. Clients need one stable name that always reaches a healthy copy.</li>
        <li><strong>Config &amp; secrets</strong> - handing the same settings to every copy, on every machine.</li>
      </ul>
      <p>Kubernetes (K8s: "K", 8 letters, "s") is a <strong>container orchestrator</strong>: it does all of these jobs for a
      group of machines called a <strong>cluster</strong>. It started at Google (based on their internal system Borg), and
      the CNCF maintains it today. New minor versions ship about every 4 months. This course uses
      <strong>Kubernetes 1.33+</strong>; the newest release is v1.37 (August 2026).</p>

      <h3>The big idea: desired state</h3>
      <p>With <code>docker run</code> you give <em>commands</em>: "start this container now". With Kubernetes you describe the
      <em>result</em> you want: "there should always be 3 copies of <code>shop/web:1.4</code> running". Kubernetes stores that
      <strong>desired state</strong> and keeps comparing it with the <strong>actual state</strong>. When they differ (a copy
      crashed, a server died), it acts until they match again.</p>
      <p>You already know a small version of this: <code>compose.yaml</code> is desired state and <code>docker compose up</code>
      makes it true <em>once</em>. Kubernetes makes it true <em>all the time</em>, across all machines.</p>
      <div class="tip">Analogy: a thermostat. You don't switch the heater on and off yourself. You set 21&deg;C and the
      thermostat keeps checking and correcting. Kubernetes is a thermostat for containers.</div>

      <h3>Compose vs Kubernetes at a glance</h3>
      <table>
        <tr><th>You want</th><th>Docker / Compose</th><th>Kubernetes</th></tr>
        <tr><td>Run copies of a container</td><td><code>services.web</code> + <code>--scale web=3</code></td><td>Deployment with <code>replicas: 3</code></td></tr>
        <tr><td>A stable name for them</td><td>Service name on the Compose network</td><td>Service object (virtual IP + DNS)</td></tr>
        <tr><td>Publish to the outside</td><td><code>ports: ["8080:80"]</code></td><td>Service type NodePort / LoadBalancer, Ingress, Gateway</td></tr>
        <tr><td>Config / secrets</td><td><code>environment:</code>, <code>.env</code>, <code>secrets:</code></td><td>ConfigMap, Secret</td></tr>
        <tr><td>Storage</td><td>named volume</td><td>PersistentVolumeClaim</td></tr>
        <tr><td>Machines</td><td>one Docker host</td><td>many nodes in one cluster</td></tr>
      </table>

      <h3>Does Kubernetes still use Docker?</h3>
      <p>Not as its runtime. Each machine runs a small <strong>container runtime</strong> that talks the Container Runtime
      Interface (CRI), usually <strong>containerd</strong> (which Docker itself uses under the hood) or CRI-O. The old
      "dockershim" adapter was removed in Kubernetes 1.24.</p>
      <p>Your images are fine: <code>docker build</code> produces standard <strong>OCI images</strong>, and any runtime can run
      them. Keep building with Docker, push to a registry, and Kubernetes pulls from there.</p>

      <h3>A cluster on your laptop</h3>
      <ul>
        <li><strong>kind</strong> ("Kubernetes IN Docker") - each node is a Docker container. Fast, great for learning and CI.</li>
        <li><strong>k3d</strong> - runs k3s (a lightweight K8s distribution) in Docker containers.</li>
        <li><strong>minikube</strong> - single- or multi-node cluster in a VM or container, with handy addons.</li>
        <li><strong>Docker Desktop</strong> - Settings &rarr; Kubernetes &rarr; Enable. One click, one node (or several with the kind-based mode).</li>
      </ul>
      <div class="warn">Kubernetes is not free: it adds many concepts and moving parts. For one small app on one server,
      Compose is often the better tool. Kubernetes pays off when you have several machines, several teams, or need
      zero-downtime rollouts and automatic recovery.</div>
    `,
      examples: [
        {
          title: 'Simulator: 3 servers, 1 dies',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  .bar button.on { background: #326ce5; color: #fff; border-color: #326ce5; }
  .servers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .srv {
    background: #fff; border: 2px solid #c9d1e3; border-radius: 10px;
    padding: 8px; min-height: 110px; transition: all .3s;
  }
  .srv.dead { background: #fdecec; border-color: #e0797d; }
  .srv h4 { margin: 0 0 6px; font-size: 14px; display: flex; justify-content: space-between; }
  .srv small { font-weight: normal; color: #5b6275; }
  .ctr {
    display: inline-block; margin: 3px; padding: 3px 8px; border-radius: 6px;
    background: #dbe7ff; border: 1px solid #9db8f2; font: 12px ui-monospace, monospace;
  }
  .ctr.new { background: #dff5e5; border-color: #7cc795; }
  .ctr.lost { background: #eee; border-color: #bbb; color: #999; text-decoration: line-through; }
  .status { margin-top: 8px; padding: 8px 10px; border-radius: 8px; background: #fff; font-size: 14px; }
  .status b.bad { color: #b3261e; }
  .status b.good { color: #137333; }
</style>

<div class="bar">
  <b>Who is in charge?</b>
  <button id="m-manual" class="on">You (ssh + docker run)</button>
  <button id="m-k8s">Kubernetes</button>
</div>
<div class="bar">
  <button id="kill">Kill server-2</button>
  <button id="fix">Fix by hand: ssh + docker run</button>
  <button id="reset">Reset</button>
</div>
<div class="servers" id="servers"></div>
<div class="status" id="status"></div>

<script>
  var WANT = 6;
  var mode = 'manual';
  var servers = [];
  var timers = [];
  var nextId = 7;
  var fixes = 0;
  var killed = false;

  function reset() {
    timers.forEach(clearTimeout);
    timers = [];
    nextId = 7;
    fixes = 0;
    killed = false;
    servers = [
      { name: 'server-1', up: true, ctrs: [c('web-1'), c('web-4')] },
      { name: 'server-2', up: true, ctrs: [c('web-2'), c('web-5')] },
      { name: 'server-3', up: true, ctrs: [c('web-3'), c('web-6')] },
    ];
    console.log('--- mode: ' + (mode === 'manual' ? 'you run containers by hand' : 'Kubernetes') + ' ---');
    console.log('desired: ' + WANT + ' copies of shop/web:1.4 on 3 servers');
    render();
  }
  function c(name, state) { return { name: name, state: state || 'run' }; }

  function running() {
    var n = 0;
    servers.forEach(function (s) {
      s.ctrs.forEach(function (x) { if (x.state !== 'lost') n++; });
    });
    return n;
  }

  // the live server with the fewest running containers
  function emptiest() {
    var best = null;
    servers.forEach(function (s) {
      if (!s.up) return;
      if (!best || s.ctrs.length < best.ctrs.length) best = s;
    });
    return best;
  }

  function render() {
    var html = '';
    servers.forEach(function (s) {
      html += '<div class="srv' + (s.up ? '' : ' dead') + '"><h4>' + s.name +
        '<small>' + (s.up ? 'up' : 'DOWN') + '</small></h4>';
      s.ctrs.forEach(function (x) {
        html += '<span class="ctr ' + (x.state === 'run' ? '' : x.state) + '">' + x.name + '</span>';
      });
      html += '</div>';
    });
    document.getElementById('servers').innerHTML = html;
    var n = running();
    var msg = n === WANT
      ? '<b class="good">' + n + '/' + WANT + ' running</b>'
      : '<b class="bad">' + n + '/' + WANT + ' running</b>';
    if (killed && mode === 'manual' && n < WANT) msg += ' - users are getting errors. It is 03:12. Your phone is ringing.';
    if (killed && mode === 'manual' && n === WANT) msg += ' - fixed by hand after ' + fixes + ' ssh sessions (and a pager alert).';
    if (killed && mode === 'k8s' && n === WANT) msg += ' - Kubernetes healed it. Nobody woke up.';
    document.getElementById('status').innerHTML = msg;
    document.getElementById('fix').disabled = mode !== 'manual' || !killed || n === WANT;
    document.getElementById('kill').disabled = killed;
  }

  function kill() {
    killed = true;
    var s2 = servers[1];
    s2.up = false;
    s2.ctrs.forEach(function (x) { x.state = 'lost'; });
    console.log('[03:12] server-2 stopped responding (power supply failure)');
    console.log('web-2 and web-5 were running there');
    render();
    if (mode === 'manual') {
      console.log('restart: always cannot help - the whole machine is gone');
      console.log('nobody moves the containers. Click "Fix by hand" to be the orchestrator.');
      return;
    }
    later(700, function () {
      console.log('[node controller] node server-2 is NotReady (kubelet stopped reporting)');
      console.log('[node controller] evicting pods from server-2 (real default: after ~5 min, sped up here)');
    });
    later(1500, function () {
      console.log('[ReplicaSet web] desired 6, running 4 -> creating 2 new pods');
    });
    later(2300, function () { place('scheduler'); place('scheduler'); });
  }

  function place(who) {
    var target = emptiest();
    var name = 'web-' + nextId++;
    target.ctrs.push(c(name, 'new'));
    if (who === 'scheduler') {
      console.log('[scheduler] ' + name + ' -> ' + target.name + ' (most free room)');
      console.log('[kubelet ' + target.name + '] ' + name + ' Running; Service endpoints updated');
    } else {
      console.log('$ ssh ' + target.name + ' docker run -d --name ' + name + ' -p 808' + name.slice(4) + ':80 shop/web:1.4');
      console.log('# ...then edit the load balancer config by hand to add ' + target.name);
    }
    render();
  }

  function later(ms, fn) { timers.push(setTimeout(fn, ms)); }

  function setMode(m) {
    mode = m;
    document.getElementById('m-manual').className = m === 'manual' ? 'on' : '';
    document.getElementById('m-k8s').className = m === 'k8s' ? 'on' : '';
    reset();
  }

  document.getElementById('m-manual').onclick = function () { setMode('manual'); };
  document.getElementById('m-k8s').onclick = function () { setMode('k8s'); };
  document.getElementById('kill').onclick = kill;
  document.getElementById('fix').onclick = function () { fixes++; place('you'); };
  document.getElementById('reset').onclick = reset;
  reset();
</script>`,
        },
        {
          title: 'Your first local cluster with kind',
          runnable: false,
          lang: 'bash',
          note: 'Reference session - run it on your machine (needs Docker, kind and kubectl installed).',
          code: String.raw`# install (macOS/Homebrew shown; see kind.sigs.k8s.io for other OSes)
$ brew install kind kubectl

# create a cluster: kind starts a Docker container that IS the node
$ kind create cluster --name learn
Creating cluster "learn" ...
 ✓ Ensuring node image (kindest/node:v1.37.0)
 ✓ Preparing nodes
 ✓ Writing configuration
 ✓ Starting control-plane
 ✓ Installing CNI
 ✓ Installing StorageClass
Set kubectl context to "kind-learn"

# the "node" is just a container on your Docker host
$ docker ps --format '{{.Names}}  {{.Image}}'
learn-control-plane  kindest/node:v1.37.0

# kubectl talks to the cluster's API server
$ kubectl get nodes
NAME                  STATUS   ROLES           AGE   VERSION
learn-control-plane   Ready    control-plane   41s   v1.37.0

# your Docker-built image works as-is (it's an OCI image)
$ docker build -t shop/web:1.4 .
$ kind load docker-image shop/web:1.4 --name learn   # copy it into the node (no registry needed)
$ kubectl create deployment web --image=shop/web:1.4 --replicas=3
deployment.apps/web created
$ kubectl get pods
NAME                   READY   STATUS    RESTARTS   AGE
web-6d4b9c7f8d-9qzmt   1/1     Running   0          6s
web-6d4b9c7f8d-lr8wn   1/1     Running   0          6s
web-6d4b9c7f8d-x4k2p   1/1     Running   0          6s

# clean up
$ kind delete cluster --name learn
Deleting cluster "learn" ...`,
        },
      ],
      quiz: [
        {
          q: 'Your Compose service has <code>restart: always</code>. The whole server loses power. What happens to the container?',
          options: [
            'Docker moves it to another server',
            'Nothing - it is gone until someone starts it somewhere else',
            'It restarts on the same server a few seconds later',
            'Compose starts it on the laptop that ran docker compose up',
          ],
          answer: 1,
          why: '<code>restart: always</code> only works while that Docker daemon is alive. Moving work to another machine needs an orchestrator like Kubernetes.',
        },
        {
          q: 'What does "desired state" mean in Kubernetes?',
          options: [
            'A list of commands Kubernetes runs once, in order',
            'The state the cluster had at the last backup',
            'A description of the result you want, which Kubernetes keeps making true',
            'The CPU and memory limits of a node',
          ],
          answer: 2,
          why: 'You declare the result (e.g. 3 copies of an image). Controllers keep comparing it with reality and fix any difference, over and over.',
        },
        {
          q: 'Kubernetes removed dockershim in 1.24. Can it still run images you built with <code>docker build</code>?',
          options: [
            'No, you must rebuild them with a Kubernetes tool',
            'Only if Docker Engine is installed on every node',
            'Yes - they are standard OCI images, and containerd / CRI-O run them',
            'Only images from Docker Hub',
          ],
          answer: 2,
          why: 'Docker builds OCI-compliant images. Any CRI runtime (containerd, CRI-O) can pull and run them. Only the runtime on the node changed.',
        },
        {
          q: 'Which local tool runs each Kubernetes node as a Docker container?',
          options: ['kind', 'kubectl', 'Helm', 'etcd'],
          answer: 0,
          why: 'kind = "Kubernetes IN Docker". k3d does the same with k3s. kubectl is the client, Helm is a package manager, etcd is the cluster database.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Create a <strong>kind config</strong> for a multi-node learning cluster. In Docker you published ports
        with <code>-p 8080:80</code>; kind needs the same idea so your browser can reach the cluster.</p>
        <ul>
          <li><code>kind: Cluster</code> and <code>apiVersion: kind.x-k8s.io/v1alpha4</code></li>
          <li>exactly <strong>one</strong> node with <code>role: control-plane</code></li>
          <li>at least <strong>two</strong> nodes with <code>role: worker</code></li>
          <li>on the control-plane node, an <code>extraPortMappings</code> entry with
          <code>containerPort: 30080</code> and <code>hostPort: 8080</code> (like <code>-p 8080:30080</code>)</li>
        </ul>
        <p>Edit the config in the box below and click <b>Check</b>. (On your machine you'd use it with <code>kind create cluster --config kind.yaml</code>.)</p>`,
        hint: 'Each list item under <code>nodes:</code> starts with <code>- role: ...</code>. <code>extraPortMappings</code> is a list inside the control-plane item, indented under it.',
        starter: checker(`kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
  - role: control-plane
  - role: worker
    extraPortMappings:
      - containerPort: 8080
        hostPort: 30080`, CHECKS_KIND, 12),
        solution: checker(`kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
  - role: control-plane
    extraPortMappings:
      - containerPort: 30080
        hostPort: 8080
  - role: worker
  - role: worker`, CHECKS_KIND, 12),
      },
    },

    // ------------------------------------------------------------------ cluster-architecture
    {
      id: 'cluster-architecture',
      section: 'Kubernetes Core',
      title: 'Cluster architecture & the reconcile loop',
      explain: `
      <p>A Kubernetes cluster has two kinds of machines. The <strong>control plane</strong> is the brain: it stores what you
      asked for and decides what should happen. The <strong>worker nodes</strong> are the muscle: they actually run your
      containers. (On kind or Docker Desktop, one machine plays both roles.)</p>

      <h3>Control plane</h3>
      <ul>
        <li><strong>kube-apiserver</strong> - the front door. Every client (kubectl, dashboards, CI, and the other components)
        talks to it over HTTPS/REST. It checks who you are (authentication), what you may do (authorization, usually RBAC),
        runs admission checks, validates the object, and saves it.</li>
        <li><strong>etcd</strong> - a consistent key-value database holding <em>all</em> cluster state: every Deployment, Pod,
        Service, Secret. Only the API server talks to etcd. Back it up; losing it means losing the cluster's memory.</li>
        <li><strong>kube-scheduler</strong> - watches for Pods that have no node yet, <em>filters</em> nodes that can fit them
        (CPU, memory, rules), <em>scores</em> the rest, and <strong>binds</strong> the Pod to the best one. It doesn't start
        anything; it just writes "this Pod goes to node-2".</li>
        <li><strong>kube-controller-manager</strong> - one process running many <strong>controllers</strong>: Deployment,
        ReplicaSet, Node, Job, EndpointSlice, and more. Each one owns one kind of object and keeps it correct.</li>
        <li><em>cloud-controller-manager</em> (only on clouds) - creates cloud load balancers, checks cloud VMs, and so on.</li>
      </ul>

      <h3>Every node</h3>
      <ul>
        <li><strong>kubelet</strong> - the node agent. It watches for Pods bound to <em>its</em> node, asks the runtime to start
        them, runs health probes, and reports status back to the API server.</li>
        <li><strong>container runtime</strong> - containerd or CRI-O, spoken to through the CRI. It pulls images and runs
        containers, like the Docker daemon did on your laptop.</li>
        <li><strong>kube-proxy</strong> - programs the node's networking (iptables or nftables rules) so Service virtual IPs
        reach the right Pods. Some network plugins (for example Cilium) replace it.</li>
      </ul>
      <p>Add-ons such as <strong>CoreDNS</strong> (cluster DNS) and a <strong>CNI network plugin</strong> (Pod networking) run as
      ordinary Pods in the <code>kube-system</code> namespace.</p>

      <h3>The reconcile loop</h3>
      <p>Controllers don't receive orders. Each one runs the same loop forever:</p>
      <pre><code class="language-bash">loop:
  desired = what the object's spec says        (read from the API server)
  actual  = what really exists                 (also read from the API server)
  if actual != desired:
      take ONE small step toward desired        (create / delete / update objects)
  wait for the next change (a "watch" event), then repeat</code></pre>
      <p>Nobody runs a big "deploy script". The Deployment controller only creates a ReplicaSet. The ReplicaSet controller
      only creates Pods. The scheduler only picks nodes. The kubelet only starts containers. Each one reacts to what the
      previous one wrote. Because the loop starts from "what is true <em>now</em>", it also repairs things: if a Pod
      disappears, the next loop sees "2, want 3" and creates one.</p>
      <div class="tip">Compose analogy: <code>docker compose up</code> is <em>one</em> reconcile pass, run by you. Kubernetes runs
      the pass continuously, by many small controllers, all talking through one API server.</div>
      <div class="warn">"Level-triggered, not edge-triggered": controllers care about the current difference, not about the
      history of events. If a controller crashes and restarts, it just looks at the state again and carries on.</div>
    `,
      examples: [
        {
          title: 'Simulator: kubectl apply a Deployment (replicas: 3), step by step',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .nodes { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px; }
  .box {
    background: #fff; border: 2px solid #d3d9e6; border-radius: 9px; padding: 6px 8px;
    min-height: 44px; transition: all .25s;
  }
  .box h4 { margin: 0; font-size: 13px; }
  .box .sub { color: #5b6275; font-size: 12px; }
  .box.on { border-color: #f0a202; background: #fff8e6; box-shadow: 0 0 0 3px #ffe2a1; }
  .cp { border-top: 5px solid #326ce5; }
  .nd { border-top: 5px solid #1e8e3e; }
  .obj { font: 11px ui-monospace, monospace; color: #33415c; }
  .pod {
    display: inline-block; margin: 3px 3px 0 0; padding: 2px 6px; border-radius: 5px;
    font: 11px ui-monospace, monospace; border: 1px solid #9db8f2; background: #dbe7ff;
  }
  .pod.Pending { background: #eceff5; border-style: dashed; border-color: #9aa3b5; }
  .pod.ContainerCreating { background: #fff3cd; border-color: #e0b54b; }
  .pod.Running { background: #dff5e5; border-color: #7cc795; }
  .cap { margin-top: 6px; background: #fff; border-radius: 8px; padding: 6px 10px; min-height: 38px; }
</style>

<div class="bar">
  <button id="step">Step ▶</button>
  <button id="del" disabled>Delete a pod</button>
  <button id="reset">Reset</button>
  <span id="count"></span>
</div>
<div class="grid">
  <div class="box" id="b-kubectl"><h4>kubectl (you)</h4><div class="sub">web.yaml: Deployment, replicas: 3</div></div>
  <div class="box cp" id="b-api"><h4>kube-apiserver</h4><div class="sub">front door, validates, saves</div></div>
  <div class="box cp" id="b-etcd"><h4>etcd</h4><div class="obj" id="etcd">(empty)</div></div>
  <div class="box cp" id="b-cm"><h4>controller-manager</h4><div class="sub">Deployment + ReplicaSet controllers</div></div>
  <div class="box cp" id="b-sched"><h4>kube-scheduler</h4><div class="sub">picks a node for new pods</div></div>
  <div class="box" id="b-pending"><h4>Unscheduled pods</h4><div id="pending" class="sub">none</div></div>
</div>
<div class="nodes">
  <div class="box nd" id="b-node-1"><h4>node-1 <span class="sub">kubelet + containerd</span></h4><div id="node-1"></div></div>
  <div class="box nd" id="b-node-2"><h4>node-2 <span class="sub">kubelet + containerd</span></h4><div id="node-2"></div></div>
</div>
<div class="cap" id="cap">Press <b>Step ▶</b> to run <code>kubectl apply -f web.yaml</code>.</div>

<script>
  var RS = 'web-7c9d8f6b5d';
  var SPARE = ['h2v6c', 'b7tdn', 'm3fjq', 'p8wxz', 'c5rkg', 't9vhl'];
  var st, queue, stepNo;

  function reset() {
    st = { deploy: false, rs: false, pods: [], spare: 0 };
    stepNo = 0;
    queue = APPLY.slice();
    document.getElementById('cap').innerHTML = 'Press <b>Step ▶</b> to run <code>kubectl apply -f web.yaml</code>.';
    render([]);
  }

  function pod(suffix) { return { name: RS + '-' + suffix, node: null, phase: 'Pending' }; }
  function onNode(n) { return st.pods.filter(function (p) { return p.node === n; }); }
  function log(lines) { lines.forEach(function (l) { console.log(l); }); }

  var APPLY = [
    { on: ['kubectl', 'api'], cap: 'kubectl reads your YAML and sends it to the API server as a REST call. It never talks to nodes.',
      run: function () {
        log(['$ kubectl apply -f web.yaml',
          '[kubectl] POST /apis/apps/v1/namespaces/default/deployments']);
      } },
    { on: ['api', 'etcd'], cap: 'The API server checks who you are and what you may do, validates the object, then stores it in etcd. That is all "apply" does.',
      run: function () {
        st.deploy = true;
        log(['[kube-apiserver] authn ✓  authz (RBAC) ✓  admission ✓  valid ✓',
          '[etcd] stored deployments/default/web (replicas: 3)',
          'deployment.apps/web created']);
      } },
    { on: ['cm', 'api', 'etcd'], cap: 'The Deployment controller is watching Deployments. Desired: a ReplicaSet for this pod template. Actual: none. So it creates one.',
      run: function () {
        st.rs = true;
        log(['[deployment controller] watch: Deployment web ADDED',
          '[deployment controller] no ReplicaSet for this template -> create ' + RS + ' (replicas: 3)']);
      } },
    { on: ['cm', 'api', 'etcd', 'pending'], cap: 'The ReplicaSet controller sees its new ReplicaSet: desired 3 pods, actual 0. It creates 3 Pod objects. They have no node yet (Pending).',
      run: function () {
        st.pods = [pod('x4k2p'), pod('9qzmt'), pod('lr8wn')];
        log(['[replicaset controller] ' + RS + ': desired 3, actual 0 -> create 3 pods',
          '[etcd] stored 3 pods (phase: Pending, nodeName: "")']);
      } },
    { on: ['sched', 'api', 'pending'], cap: 'The scheduler watches for pods without a node. It filters nodes that fit, scores them, and writes a binding: pod -> node.',
      run: function () {
        log(['[scheduler] 3 unscheduled pods; filter: node-1 ✓ node-2 ✓ -> score -> bind']);
        var plan = ['node-1', 'node-2', 'node-1'];
        st.pods.forEach(function (p, i) {
          p.node = plan[i];
          log(['[scheduler] ' + p.name + ' -> ' + p.node]);
        });
      } },
    { on: ['node-1', 'node-2'], cap: 'Each kubelet watches for pods bound to ITS node and asks containerd (via CRI) to pull the image and start the containers.',
      run: function () {
        st.pods.forEach(function (p) { p.phase = 'ContainerCreating'; });
        log(['[kubelet node-1] 2 pods assigned to me -> CRI: pull nginx:1.29, start containers',
          '[kubelet node-2] 1 pod assigned to me -> CRI: pull nginx:1.29, start container']);
      } },
    { on: ['node-1', 'node-2', 'api', 'etcd'], cap: 'Kubelets report status back through the API server. Actual state = desired state. Try "Delete a pod" to see the loop repair it.',
      run: function () {
        st.pods.forEach(function (p) { p.phase = 'Running'; });
        log(['[kubelet] status -> API server: 3 pods Running, Ready',
          '$ kubectl get deploy web',
          'NAME   READY   UP-TO-DATE   AVAILABLE   AGE',
          'web    3/3     3            3           9s']);
      } },
  ];

  // replacement flow after a delete (the freed node-2 always has the fewest pods)
  function heal() {
    var fresh;
    return [
      { on: ['cm', 'api', 'etcd', 'pending'], cap: 'Reconcile loop: the ReplicaSet controller compares desired (3) with actual (2) and creates one replacement Pod. Nobody told it to.',
        run: function () {
          fresh = pod(SPARE[st.spare++ % SPARE.length]);
          st.pods.push(fresh);
          log(['[replicaset controller] ' + RS + ': desired 3, actual 2 -> create 1 pod',
            '[etcd] stored pod ' + fresh.name + ' (Pending)']);
        } },
      { on: ['sched', 'api', 'pending'], cap: 'The scheduler binds the new pod. It has a NEW name and will get a NEW IP: pods are replaced, never repaired.',
        run: function () {
          fresh.node = onNode('node-1').length <= onNode('node-2').length ? 'node-1' : 'node-2';
          log(['[scheduler] ' + fresh.name + ' -> ' + fresh.node + ' (fewest pods)']);
        } },
      { on: ['node-2', 'api'], cap: 'The kubelet starts it and reports Running. Desired state restored.',
        run: function () {
          fresh.phase = 'Running';
          log(['[kubelet ' + fresh.node + '] CRI: start container for ' + fresh.name + ' -> Running',
            '[replicaset controller] ' + RS + ': 3/3 ready - desired state restored']);
        } },
    ];
  }

  function del() {
    var victim = onNode('node-2')[0];
    st.pods = st.pods.filter(function (p) { return p !== victim; });
    log(['$ kubectl delete pod ' + victim.name,
      '[kube-apiserver] pod "' + victim.name + '" deleted',
      '[kubelet node-2] stopping container (SIGTERM)']);
    queue = heal();
    document.getElementById('cap').innerHTML = 'The pod is gone. Actual (2) no longer matches desired (3). Press <b>Step ▶</b>.';
    render(['kubectl', 'api', 'node-2']);
  }

  function step() {
    var s = queue.shift();
    if (!s) return;
    stepNo++;
    console.log('--- step ' + stepNo + ' ---');
    s.run();
    document.getElementById('cap').innerHTML = '<b>Step ' + stepNo + ':</b> ' + s.cap;
    render(s.on);
  }

  function render(on) {
    ['kubectl', 'api', 'etcd', 'cm', 'sched', 'pending', 'node-1', 'node-2'].forEach(function (id) {
      document.getElementById('b-' + id).classList.toggle('on', on.indexOf(id) >= 0);
    });
    var objs = [];
    if (st.deploy) objs.push('deployment/web');
    if (st.rs) objs.push('replicaset/' + RS);
    st.pods.forEach(function (p) { objs.push('pod/..' + p.name.slice(-5) + ' ' + (p.node || '(no node)')); });
    document.getElementById('etcd').innerHTML = objs.length ? objs.join('<br>') : '(empty)';
    var pend = st.pods.filter(function (p) { return !p.node; });
    document.getElementById('pending').innerHTML = pend.length ? pend.map(chip).join('') : 'none';
    ['node-1', 'node-2'].forEach(function (n) {
      document.getElementById(n).innerHTML = onNode(n).map(chip).join('') || '<span class="sub">no pods</span>';
    });
    document.getElementById('step').disabled = queue.length === 0;
    document.getElementById('del').disabled = queue.length > 0 || st.pods.length === 0;
    document.getElementById('count').textContent = queue.length ? queue.length + ' step(s) left' : 'in sync ✓';
  }
  function chip(p) { return '<span class="pod ' + p.phase + '" title="' + p.phase + '">' + p.name.slice(-5) + '</span>'; }

  document.getElementById('step').onclick = step;
  document.getElementById('del').onclick = del;
  document.getElementById('reset').onclick = function () { console.log('--- reset ---'); reset(); };
  reset();
</script>`,
          explain: `
          <details>
            <summary>The problem: who actually starts the containers?</summary>
            <p>With Compose, one program (<code>docker compose</code>) reads the file and starts the containers itself. If you
            expect Kubernetes to work the same way, <code>kubectl apply</code> would "start 3 pods". It doesn't.</p>
            <p><code>kubectl apply</code> only <strong>stores a wish</strong> in etcd and returns
            <code>deployment.apps/web created</code> <em>before a single container exists</em>. Everything after that is done
            by separate components, each watching the API server for work of its own kind. That is why:</p>
            <ul>
              <li><code>kubectl apply</code> "succeeds" even when the image name is wrong (the error shows up later, in the Pod's status).</li>
              <li>If a controller or scheduler restarts, nothing is lost: the wish is still in etcd.</li>
              <li>The same machinery that creates Pods also <em>re-creates</em> them.</li>
            </ul>
          </details>
          <details>
            <summary>Step by step: what each <b>Step ▶</b> click does</summary>
            <table>
              <tr><th>Step</th><th>Who acts</th><th>State change</th><th>Console</th></tr>
              <tr><td>1</td><td>kubectl &rarr; kube-apiserver</td><td>nothing stored yet</td><td><code>$ kubectl apply -f web.yaml</code><br><code>[kubectl] POST /apis/apps/v1/namespaces/default/deployments</code></td></tr>
              <tr><td>2</td><td>kube-apiserver &rarr; etcd</td><td>etcd: <code>deployment/web</code></td><td><code>[kube-apiserver] authn ✓ authz (RBAC) ✓ admission ✓ valid ✓</code><br><code>[etcd] stored deployments/default/web (replicas: 3)</code><br><code>deployment.apps/web created</code></td></tr>
              <tr><td>3</td><td>Deployment controller</td><td>+ <code>replicaset/web-7c9d8f6b5d</code></td><td><code>[deployment controller] watch: Deployment web ADDED</code><br><code>[deployment controller] no ReplicaSet for this template -&gt; create web-7c9d8f6b5d (replicas: 3)</code></td></tr>
              <tr><td>4</td><td>ReplicaSet controller</td><td>+ 3 Pods <code>x4k2p</code>, <code>9qzmt</code>, <code>lr8wn</code> in "Unscheduled pods" (dashed = Pending)</td><td><code>[replicaset controller] web-7c9d8f6b5d: desired 3, actual 0 -&gt; create 3 pods</code><br><code>[etcd] stored 3 pods (phase: Pending, nodeName: "")</code></td></tr>
              <tr><td>5</td><td>kube-scheduler</td><td><code>x4k2p</code> &rarr; node-1, <code>9qzmt</code> &rarr; node-2, <code>lr8wn</code> &rarr; node-1</td><td><code>[scheduler] 3 unscheduled pods; filter: node-1 ✓ node-2 ✓ -&gt; score -&gt; bind</code> + one line per pod</td></tr>
              <tr><td>6</td><td>kubelet on each node</td><td>chips turn yellow (ContainerCreating)</td><td><code>[kubelet node-1] 2 pods assigned to me -&gt; CRI: pull nginx:1.29, start containers</code><br><code>[kubelet node-2] 1 pod assigned to me -&gt; CRI: pull nginx:1.29, start container</code></td></tr>
              <tr><td>7</td><td>kubelets &rarr; API server</td><td>chips turn green (Running); counter shows <b>in sync ✓</b></td><td><code>[kubelet] status -&gt; API server: 3 pods Running, Ready</code><br><code>$ kubectl get deploy web</code> + a 3/3 table</td></tr>
            </table>
            <p>Then click <b>Delete a pod</b> (it deletes the pod on node-2, <code>9qzmt</code>), and keep stepping:</p>
            <table>
              <tr><th>Step</th><th>Who acts</th><th>State change</th><th>Console</th></tr>
              <tr><td>click</td><td>you &rarr; API server &rarr; kubelet</td><td><code>9qzmt</code> disappears; 2 pods left</td><td><code>$ kubectl delete pod web-7c9d8f6b5d-9qzmt</code><br><code>[kube-apiserver] pod "web-7c9d8f6b5d-9qzmt" deleted</code><br><code>[kubelet node-2] stopping container (SIGTERM)</code></td></tr>
              <tr><td>8</td><td>ReplicaSet controller</td><td>+ <code>h2v6c</code> (Pending)</td><td><code>[replicaset controller] web-7c9d8f6b5d: desired 3, actual 2 -&gt; create 1 pod</code></td></tr>
              <tr><td>9</td><td>kube-scheduler</td><td><code>h2v6c</code> &rarr; node-2</td><td><code>[scheduler] web-7c9d8f6b5d-h2v6c -&gt; node-2 (fewest pods)</code></td></tr>
              <tr><td>10</td><td>kubelet node-2</td><td>Running again, <b>in sync ✓</b></td><td><code>[kubelet node-2] CRI: start container for web-7c9d8f6b5d-h2v6c -&gt; Running</code><br><code>[replicaset controller] web-7c9d8f6b5d: 3/3 ready - desired state restored</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained: every step is the same loop</summary>
            <pre><code class="language-bash"># ReplicaSet controller, simplified
desired = rs.spec.replicas                  # ① read the wish (3)
actual  = count(pods matching rs.selector)  # ② look at reality (2 after the delete)
if actual &lt; desired: create (desired - actual) pods   # ③ one small step
if actual &gt; desired: delete (actual - desired) pods
# ④ then sleep until the API server sends a watch event</code></pre>
            <ol>
              <li><strong>①</strong> Desired state comes from the object's <code>spec</code>, stored in etcd by step 2.</li>
              <li><strong>②</strong> Actual state is <em>also</em> read from the API server: pods report their status there (step 7). Nobody asks nodes directly.</li>
              <li><strong>③</strong> The controller only creates <em>Pod objects</em>. It doesn't choose a node (that's the scheduler, step 5/9) or start containers (kubelet, step 6/10).</li>
              <li><strong>④</strong> Watches make this fast: components hold a long-lived connection and the API server pushes changes, so there is no busy polling.</li>
            </ol>
          </details>
          <details>
            <summary>Try this &amp; common mistakes</summary>
            <ul>
              <li>Click <b>Delete a pod</b> several times. Each replacement gets a new name (<code>h2v6c</code>, <code>b7tdn</code>, ...). A Pod is never "restarted as the same Pod" after deletion.</li>
              <li>Watch which boxes light up: <strong>only the API server touches etcd</strong>. The scheduler and kubelets never talk to each other.</li>
              <li>On a real cluster, run <code>kubectl get events --watch</code> in one terminal and apply in another: you'll see the same order (ScalingReplicaSet &rarr; SuccessfulCreate &rarr; Scheduled &rarr; Pulling &rarr; Started).</li>
            </ul>
            <div class="warn"><code>deployment.apps/web created</code> does <strong>not</strong> mean your app is running. Use
            <code>kubectl rollout status deployment/web</code> or <code>kubectl get pods</code> to see the actual state.</div>
          </details>
        `,
        },
        {
          title: 'Meet the components on a real (kind) cluster',
          runnable: false,
          lang: 'bash',
          code: String.raw`# control-plane components run as Pods in kube-system (on kind / kubeadm clusters)
$ kubectl get pods -n kube-system
NAME                                          READY   STATUS    RESTARTS   AGE
coredns-7c65d6cfc9-6lh8x                      1/1     Running   0          5m
coredns-7c65d6cfc9-tq2wz                      1/1     Running   0          5m
etcd-learn-control-plane                      1/1     Running   0          5m
kindnet-4bq9n                                 1/1     Running   0          5m
kube-apiserver-learn-control-plane            1/1     Running   0          5m
kube-controller-manager-learn-control-plane   1/1     Running   0          5m
kube-proxy-8x2ld                              1/1     Running   0          5m
kube-scheduler-learn-control-plane            1/1     Running   0          5m

# kubelet and containerd are NOT pods: they are system services on the node
$ docker exec learn-control-plane systemctl is-active kubelet containerd
active
active

# watch the chain of controllers react to one apply
$ kubectl apply -f web.yaml
deployment.apps/web created
$ kubectl get events --sort-by=.lastTimestamp
REASON              OBJECT                          MESSAGE
ScalingReplicaSet   deployment/web                  Scaled up replica set web-7c9d8f6b5d from 0 to 3
SuccessfulCreate    replicaset/web-7c9d8f6b5d       Created pod: web-7c9d8f6b5d-x4k2p
Scheduled           pod/web-7c9d8f6b5d-x4k2p        Successfully assigned default/web-7c9d8f6b5d-x4k2p to learn-worker
Pulling             pod/web-7c9d8f6b5d-x4k2p        Pulling image "nginx:1.29"
Started             pod/web-7c9d8f6b5d-x4k2p        Started container nginx

# desired (spec) vs actual (status) live side by side in every object
$ kubectl get deployment web -o jsonpath='{.spec.replicas} wanted, {.status.readyReplicas} ready{"\n"}'
3 wanted, 3 ready`,
        },
      ],
      quiz: [
        {
          q: 'Which component is the <strong>only</strong> one that reads and writes etcd directly?',
          options: ['kube-scheduler', 'kubelet', 'kube-apiserver', 'kube-controller-manager'],
          answer: 2,
          why: 'Everything goes through the API server, which validates requests and persists them in etcd. Other components watch the API server.',
        },
        {
          q: 'A new Pod object exists but has no node yet. Who fixes that?',
          options: ['The kubelet on the least busy node', 'kube-scheduler, by binding it to a node', 'The ReplicaSet controller', 'kube-proxy'],
          answer: 1,
          why: 'The scheduler watches for unscheduled Pods, filters + scores nodes, and writes the binding. Then that node\'s kubelet starts it.',
        },
        {
          q: '<code>kubectl apply</code> printed <code>deployment.apps/web created</code>. What do you know for sure?',
          options: [
            'All 3 containers are running',
            'The image was pulled successfully',
            'The Deployment object was validated and stored; the rest happens asynchronously',
            'The scheduler picked nodes for the pods',
          ],
          answer: 2,
          why: 'apply only stores desired state. Controllers, scheduler and kubelets then react. Check <code>kubectl rollout status</code> for the real outcome.',
        },
        {
          q: 'A worker node\'s kubelet stops working. Which statement is true?',
          options: [
            'The control plane can no longer accept kubectl commands',
            'Pods on that node stop being managed/reported; after a timeout they are replaced elsewhere by their controllers',
            'etcd loses the pods that ran on that node',
            'kube-proxy takes over starting containers',
          ],
          answer: 1,
          why: 'The node goes NotReady. The node controller eventually evicts its Pods, and ReplicaSets create replacements on healthy nodes. The control plane keeps working.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Who does what? Fill in the component for each job. Use the names from this lesson:
        <code>kube-apiserver</code>, <code>etcd</code>, <code>kube-scheduler</code>, <code>kube-controller-manager</code>,
        <code>kubelet</code>, <code>kube-proxy</code>, <code>containerd</code>. Type each answer after its colon in the box below and click <b>Check</b>.</p>`,
        hint: 'Think about the simulator: which box stored objects, which one placed pods on nodes, which one ran on every node and started containers? The Deployment and ReplicaSet controllers live inside one process.',
        starter: checker(`# Fill in each answer after the colon
stores all cluster state:
validates requests and is the only one talking to etcd:
picks a node for a new pod:
runs the Deployment and ReplicaSet controllers:
starts pods on its own node and reports their status:
actually pulls images and runs containers:
programs Service virtual IPs on every node: `, CHECKS_ARCH, 9),
        solution: checker(`# Fill in each answer after the colon
stores all cluster state: etcd
validates requests and is the only one talking to etcd: kube-apiserver
picks a node for a new pod: kube-scheduler
runs the Deployment and ReplicaSet controllers: kube-controller-manager
starts pods on its own node and reports their status: kubelet
actually pulls images and runs containers: containerd
programs Service virtual IPs on every node: kube-proxy`, CHECKS_ARCH, 9),
      },
    },

    // ------------------------------------------------------------------ kubectl-and-manifests
    {
      id: 'kubectl-and-manifests',
      section: 'Kubernetes Core',
      title: 'kubectl & YAML manifests',
      explain: `
      <p><strong>kubectl</strong> is the command-line client for the API server, like the <code>docker</code> CLI is for the
      Docker daemon. A <strong>manifest</strong> is a YAML file describing one or more Kubernetes objects, like
      <code>compose.yaml</code> describes services.</p>

      <h3>Every object has the same four parts</h3>
      <pre><code class="language-yaml">apiVersion: apps/v1        # which API group + version defines this kind
kind: Deployment           # what type of object
metadata:                  # identity: name, namespace, labels, annotations
  name: web
spec:                      # DESIRED state - you write this
  replicas: 3
  ...
status:                    # ACTUAL state - the cluster writes this, never you
  readyReplicas: 3</code></pre>
      <ul>
        <li><code>apiVersion</code> - core objects (Pod, Service, ConfigMap, Namespace) use plain <code>v1</code>. Others live
        in groups: <code>apps/v1</code> (Deployment, StatefulSet, DaemonSet), <code>batch/v1</code> (Job, CronJob),
        <code>networking.k8s.io/v1</code> (Ingress). A wrong pair gives
        <code>no matches for kind "Deployment" in version "v1"</code>.</li>
        <li><code>metadata.name</code> must be unique per kind in a namespace, lowercase, using letters, digits and <code>-</code>.</li>
        <li><code>spec</code> is different for every kind. <code>kubectl explain</code> tells you what goes in it.</li>
        <li><code>status</code> is filled in by controllers. Don't put it in your files.</li>
      </ul>
      <p>One file can hold several objects separated by a line with <code>---</code>.</p>

      <h3>Imperative vs declarative</h3>
      <table>
        <tr><th></th><th>Imperative ("do this")</th><th>Declarative ("make it like this")</th></tr>
        <tr><td>Example</td><td><code>kubectl create deployment web --image=nginx</code><br><code>kubectl scale deployment web --replicas=5</code></td><td><code>kubectl apply -f web.yaml</code></td></tr>
        <tr><td>Good for</td><td>quick experiments, one-off debugging</td><td>everything real: files in Git, reviewed, repeatable</td></tr>
        <tr><td>Compose analogy</td><td><code>docker run ...</code></td><td><code>docker compose up -d</code></td></tr>
      </table>
      <p><code>kubectl apply</code> is safe to run again and again: it creates what's missing and updates what changed. With
      files in Git this becomes <strong>GitOps</strong> (tools like Argo CD or Flux run <code>apply</code> for you).</p>
      <div class="warn">Mixing both styles causes surprises: if you <code>kubectl scale</code> to 5 but the file says
      <code>replicas: 3</code>, the next <code>apply</code> goes back to 3. Make the file the single source of truth.</div>

      <h3>The commands you'll use every day</h3>
      <table>
        <tr><th>Docker habit</th><th>kubectl</th></tr>
        <tr><td><code>docker ps</code></td><td><code>kubectl get pods</code> (<code>-o wide</code> for IP + node, <code>-A</code> for all namespaces)</td></tr>
        <tr><td><code>docker inspect web</code></td><td><code>kubectl describe pod web-...</code> (human view + events) or <code>kubectl get pod web-... -o yaml</code></td></tr>
        <tr><td><code>docker logs -f web</code></td><td><code>kubectl logs -f web-...</code> (<code>-c name</code> picks a container, <code>--previous</code> shows the crashed one)</td></tr>
        <tr><td><code>docker exec -it web sh</code></td><td><code>kubectl exec -it web-... -- sh</code></td></tr>
        <tr><td><code>docker compose up -d</code> / <code>down</code></td><td><code>kubectl apply -f dir/</code> / <code>kubectl delete -f dir/</code></td></tr>
        <tr><td><code>docker run -p 8080:80</code> for testing</td><td><code>kubectl port-forward svc/web 8080:80</code></td></tr>
      </table>
      <p>Handy extras:</p>
      <ul>
        <li><code>--dry-run=client -o yaml</code> - print the manifest an imperative command <em>would</em> create. The fastest way to start a new YAML file.</li>
        <li><code>kubectl diff -f web.yaml</code> - show what <code>apply</code> would change on the live cluster.</li>
        <li><code>kubectl explain deployment.spec.strategy</code> - built-in docs for any field, straight from the cluster's API schema.</li>
        <li><code>kubectl api-resources</code> - every kind, its short name (<code>po</code>, <code>deploy</code>, <code>svc</code>) and API group.</li>
      </ul>

      <h3>Contexts: which cluster am I talking to?</h3>
      <p>kubectl reads <code>~/.kube/config</code> (the <em>kubeconfig</em>). It lists clusters, users and <strong>contexts</strong>
      (cluster + user + default namespace). <code>kind create cluster</code> adds a context called <code>kind-&lt;name&gt;</code> and switches to it.</p>
      <pre><code class="language-bash">kubectl config get-contexts                    # list, * marks the current one
kubectl config use-context kind-learn           # switch cluster
kubectl config set-context --current --namespace=shop   # change default namespace</code></pre>
      <div class="warn">Always check your context before a <code>delete</code>. Many people add the current context to their shell prompt so "prod" is impossible to miss.</div>
    `,
      examples: [
        {
          title: 'Manifest anatomy: one file, two objects',
          runnable: false,
          lang: 'yaml',
          note: 'Reference manifest - save as web.yaml and run kubectl apply -f web.yaml.',
          code: String.raw`# ① which API defines this kind (apps group, version v1)
apiVersion: apps/v1
kind: Deployment                 # ② the object type
metadata:                        # ③ identity
  name: web
  namespace: default
  labels:
    app: web
spec:                            # ④ desired state (shape depends on kind)
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:                      # ⑤ a Pod template, stamped out 3 times
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.29
          ports:
            - containerPort: 80
---                              # ⑥ next object in the same file
apiVersion: v1                   # core group: just "v1"
kind: Service
metadata:
  name: web
spec:
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 80
# ⑦ no "status:" here - the cluster fills it in`,
        },
        {
          title: 'Simulator: your Docker habits, translated',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .cmds { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
  .cmds button { font: 12px ui-monospace, monospace; }
  .cmds button.on { background: #1f2330; color: #fff; }
  .row { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .card { background: #fff; border-radius: 9px; padding: 8px 10px; border: 1px solid #d3d9e6; }
  .card h4 { margin: 0 0 4px; font-size: 13px; color: #5b6275; }
  .card code { font: 13px ui-monospace, monospace; }
  .why { margin-top: 8px; background: #eef3ff; border-radius: 8px; padding: 8px 10px; }
</style>

<div class="cmds" id="cmds"></div>
<div class="row">
  <div class="card"><h4>Docker / Compose</h4><code id="d"></code></div>
  <div class="card"><h4>kubectl</h4><code id="k"></code></div>
</div>
<div class="why" id="why"></div>

<script>
  var MAP = [
    { d: 'docker ps', k: 'kubectl get pods -o wide',
      why: 'Lists pods (not containers). -o wide adds the pod IP and the node it runs on.',
      out: ['NAME                   READY   STATUS    RESTARTS   AGE   IP           NODE',
        'web-7c9d8f6b5d-x4k2p   1/1     Running   0          3m    10.244.1.4   node-1',
        'web-7c9d8f6b5d-9qzmt   1/1     Running   0          3m    10.244.2.7   node-2'] },
    { d: 'docker logs -f web', k: 'kubectl logs -f deploy/web',
      why: 'deploy/web picks one pod of the Deployment. Use a pod name for a specific one, -c for a specific container, --previous for the last crashed run.',
      out: ['Found 3 pods, using pod/web-7c9d8f6b5d-x4k2p',
        '10.244.0.1 - - "GET / HTTP/1.1" 200 615'] },
    { d: 'docker exec -it web sh', k: 'kubectl exec -it web-7c9d8f6b5d-x4k2p -- sh',
      why: 'Everything after -- is the command to run inside the container.',
      out: ['/ # hostname', 'web-7c9d8f6b5d-x4k2p'] },
    { d: 'docker inspect web', k: 'kubectl describe pod web-7c9d8f6b5d-x4k2p',
      why: 'describe = human summary + recent Events (the first place to look when something is wrong). For the raw object use get ... -o yaml.',
      out: ['Name:         web-7c9d8f6b5d-x4k2p', 'Node:         node-1/172.18.0.3',
        'Status:       Running', 'Events:', '  Normal  Scheduled  3m  default-scheduler  Successfully assigned default/web-7c9d8f6b5d-x4k2p to node-1',
        '  Normal  Started    3m  kubelet            Started container nginx'] },
    { d: 'docker compose up -d', k: 'kubectl apply -f k8s/',
      why: 'Declarative: create what is missing, update what changed, leave the rest. Safe to repeat.',
      out: ['deployment.apps/web created', 'service/web created', 'configmap/web-config unchanged'] },
    { d: 'docker compose down', k: 'kubectl delete -f k8s/',
      why: 'Deletes exactly the objects defined in those files. Deleting the Deployment also deletes its ReplicaSets and Pods.',
      out: ['deployment.apps "web" deleted', 'service "web" deleted', 'configmap "web-config" deleted'] },
    { d: 'docker compose up -d --scale web=5', k: 'kubectl scale deployment web --replicas=5',
      why: 'Imperative and quick - but update replicas in the YAML too, or the next apply undoes it.',
      out: ['deployment.apps/web scaled'] },
    { d: 'docker run -p 8080:80 ...', k: 'kubectl port-forward svc/web 8080:80',
      why: 'Tunnels localhost:8080 to the Service through the API server. For testing only; real traffic uses Services/Ingress.',
      out: ['Forwarding from 127.0.0.1:8080 -> 80', 'Handling connection for 8080'] },
    { d: '(write compose.yaml by hand)', k: 'kubectl create deployment web --image=nginx:1.29 --dry-run=client -o yaml',
      why: 'Nothing is sent to the cluster; kubectl just prints the manifest. Redirect it to a file and edit.',
      out: ['apiVersion: apps/v1', 'kind: Deployment', 'metadata:', '  labels:', '    app: web', '  name: web', 'spec:', '  replicas: 1', '  ...'] },
  ];

  var box = document.getElementById('cmds');
  MAP.forEach(function (m, i) {
    var b = document.createElement('button');
    b.textContent = m.d;
    b.onclick = function () { show(i); };
    box.appendChild(b);
  });

  function show(i) {
    var m = MAP[i];
    Array.prototype.forEach.call(box.children, function (b, j) { b.className = j === i ? 'on' : ''; });
    document.getElementById('d').textContent = m.d;
    document.getElementById('k').textContent = m.k;
    document.getElementById('why').textContent = m.why;
    console.log('$ ' + m.k);
    m.out.forEach(function (l) { console.log(l); });
  }
  show(0);
</script>`,
        },
        {
          title: 'A kubectl session: generate, apply, inspect, clean up',
          runnable: false,
          lang: 'bash',
          code: String.raw`# which cluster am I talking to?
$ kubectl config current-context
kind-learn

# generate a starting manifest instead of typing it
$ kubectl create deployment web --image=nginx:1.29 --replicas=3 \
    --dry-run=client -o yaml > web.yaml

# built-in docs for any field
$ kubectl explain deployment.spec.replicas
GROUP:      apps
KIND:       Deployment
VERSION:    v1
FIELD: replicas <integer>
DESCRIPTION:
    Number of desired pods. This is a pointer to distinguish between explicit
    zero and not specified. Defaults to 1.

$ kubectl apply -f web.yaml
deployment.apps/web created

# change replicas to 4 in the file, preview, apply again
$ kubectl diff -f web.yaml
-  replicas: 3
+  replicas: 4
$ kubectl apply -f web.yaml
deployment.apps/web configured

$ kubectl get deploy,pods
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/web   4/4     4            4           1m

NAME                       READY   STATUS    RESTARTS   AGE
pod/web-7c9d8f6b5d-9qzmt   1/1     Running   0          1m
pod/web-7c9d8f6b5d-lr8wn   1/1     Running   0          1m
pod/web-7c9d8f6b5d-x4k2p   1/1     Running   0          1m
pod/web-7c9d8f6b5d-h2v6c   1/1     Running   0          9s

# live object = your spec + defaults + status
$ kubectl get deploy web -o yaml | grep -A3 '^status:'
status:
  availableReplicas: 4
  observedGeneration: 2
  readyReplicas: 4

$ kubectl delete -f web.yaml
deployment.apps "web" deleted`,
        },
      ],
      quiz: [
        {
          q: 'Which <code>apiVersion</code> is correct for a Deployment?',
          options: ['<code>v1</code>', '<code>apps/v1</code>', '<code>deployments/v1</code>', '<code>extensions/v1beta1</code>'],
          answer: 1,
          why: 'Deployments live in the <code>apps</code> group. Plain <code>v1</code> is the core group (Pod, Service, ConfigMap). <code>extensions/v1beta1</code> was removed years ago.',
        },
        {
          q: 'Who writes the <code>status</code> section of an object?',
          options: ['You, in the manifest', 'kubectl, when you apply', 'The cluster (controllers, kubelet)', 'etcd, automatically'],
          answer: 2,
          why: '<code>spec</code> = your desired state; <code>status</code> = actual state reported by controllers and kubelets.',
        },
        {
          q: 'You want a Deployment YAML to start from without typing it. Which command?',
          options: [
            '<code>kubectl get deployment web</code>',
            '<code>kubectl create deployment web --image=nginx:1.29 --dry-run=client -o yaml</code>',
            '<code>kubectl explain deployment</code>',
            '<code>kubectl apply --generate deployment</code>',
          ],
          answer: 1,
          why: '<code>--dry-run=client</code> sends nothing to the cluster and <code>-o yaml</code> prints the object that would have been created.',
        },
        {
          q: 'You ran <code>kubectl scale deployment web --replicas=6</code>. The file still says <code>replicas: 2</code>. A teammate runs <code>kubectl apply -f web.yaml</code>. Result?',
          options: ['6 replicas', '2 replicas', '8 replicas', 'apply fails with a conflict'],
          answer: 1,
          why: 'apply makes the live object match the file. The imperative change is overwritten. Keep the file as the source of truth.',
        },
        {
          q: 'What does a kubeconfig <em>context</em> combine?',
          options: [
            'An image and a tag',
            'A cluster, a user, and a default namespace',
            'A Deployment and its Service',
            'A node and its pods',
          ],
          answer: 1,
          why: 'Contexts let one kubectl switch between clusters/users (<code>kubectl config use-context</code>) and set a default namespace.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>A teammate wrote this manifest from memory and <code>kubectl apply</code> rejects it. Edit the manifest in the box below so it would be accepted, then click <b>Check</b>:</p>
        <ul>
          <li>the right <code>apiVersion</code> for a Deployment</li>
          <li><code>metadata.name: web</code></li>
          <li><code>spec.replicas</code> (a number, spelled correctly) set to <code>2</code></li>
          <li>a <code>spec.selector.matchLabels</code> that matches the template labels</li>
          <li>no <code>status:</code> section (the cluster writes that)</li>
        </ul>`,
        hint: 'Deployment = <code>apps/v1</code>. The field is <code>replicas</code>, not <code>replica</code>. Copy the template labels (<code>app: web</code>) into <code>selector.matchLabels</code>. Delete the whole <code>status:</code> block.',
        starter: checker(`apiVersion: v1
kind: Deployment
metadata:
  labels:
    app: web
spec:
  replica: 2
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.29
status:
  readyReplicas: 2`, CHECKS_MANIFEST, 18),
        solution: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  labels:
    app: web
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: nginx
          image: nginx:1.29`, CHECKS_MANIFEST, 18),
      },
    },

    // ------------------------------------------------------------------ pods
    {
      id: 'pods',
      section: 'Kubernetes Core',
      title: 'Pods',
      explain: `
      <p>Kubernetes never runs a bare container. The smallest thing it schedules is a <strong>Pod</strong>: a wrapper around
      <strong>one or more containers</strong> that always run together on the same node and share some things.</p>

      <h3>What containers in one Pod share</h3>
      <ul>
        <li><strong>Network namespace</strong> - one IP address and one set of ports for the whole Pod. Containers reach each
        other on <code>localhost</code>. Two containers in one Pod cannot both listen on port 8080.</li>
        <li><strong>Volumes</strong> - a volume declared in the Pod (for example an <code>emptyDir</code>) can be mounted into
        several of its containers, so they can share files.</li>
        <li><strong>Lifecycle and node</strong> - scheduled together, started together, deleted together.</li>
      </ul>
      <p>Each container still has its <em>own image and filesystem</em>, its own process, and its own CPU/memory limits.</p>
      <div class="tip">Compose analogy: a Pod is like two Compose services where the second has
      <code>network_mode: "service:app"</code> and both mount the same named volume. Kubernetes just makes that grouping
      a first-class thing.</div>

      <h3>Pods are cattle, not pets</h3>
      <ul>
        <li><strong>The IP is ephemeral.</strong> Every new Pod gets a new IP from the node's Pod range. Never hardcode Pod IPs; use a Service (later lesson).</li>
        <li><strong>A container crash is repaired in place.</strong> The kubelet restarts the <em>container</em> (per
        <code>restartPolicy</code>, default <code>Always</code>), and <code>RESTARTS</code> goes up. Same Pod, same IP. Repeated crashes show as <code>CrashLoopBackOff</code> (restarts with growing delays).</li>
        <li><strong>A deleted Pod is gone.</strong> If you delete a bare Pod, or its node dies, nothing recreates it. Pods
        created by a Deployment/ReplicaSet are replaced, but as <em>new</em> Pods with new names and IPs.</li>
      </ul>
      <p>That's why you almost never write <code>kind: Pod</code> in real projects. You write a Deployment (or Job,
      StatefulSet, ...) whose <strong>pod template</strong> describes the Pods, and a controller keeps them alive.</p>

      <h3>Pod phases</h3>
      <p><code>Pending</code> (accepted, not yet running: waiting for a node, or pulling images) &rarr; <code>Running</code>
      &rarr; <code>Succeeded</code> or <code>Failed</code> (all containers exited). <code>Unknown</code> means the node stopped reporting.
      <code>kubectl get pods</code> also shows friendlier reasons such as <code>ContainerCreating</code>,
      <code>ImagePullBackOff</code> or <code>CrashLoopBackOff</code>.</p>

      <h3>Init containers and sidecars</h3>
      <ul>
        <li><strong>Init containers</strong> (<code>spec.initContainers</code>) run <em>one after another, to completion,
        before</em> the app containers start. Use them for "wait for the database", "run migrations", "download config".
        If one fails, the kubelet retries it and the app never starts until it succeeds.</li>
        <li><strong>Sidecars</strong> are helpers that run <em>alongside</em> the app for its whole life: log shippers,
        proxies, config reloaders. Since Kubernetes <strong>1.33 (stable)</strong> a native sidecar is an init container with
        <code>restartPolicy: Always</code>. It starts before the app containers, keeps running, is restarted if it crashes,
        and is stopped <em>after</em> the app on shutdown. It also doesn't block Jobs from completing.</li>
      </ul>
      <div class="warn">One Pod = one "unit of scaling". Don't put your web app and its database in the same Pod: you could
      never scale the web tier without also copying the database. Put things in one Pod only if they truly must live and die together.</div>
    `,
      examples: [
        {
          title: 'Simulator: a Pod with an init container, a sidecar and the app',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
  .pod {
    background: #fff; border: 3px dashed #326ce5; border-radius: 14px; padding: 8px 10px;
    transition: opacity .4s;
  }
  .pod.gone { opacity: .35; border-color: #9aa3b5; }
  .pod h4 { margin: 0 0 6px; display: flex; justify-content: space-between; font-size: 14px; }
  .pod h4 span { font: 12px ui-monospace, monospace; color: #5b6275; }
  .net { background: #e8f0fe; border-radius: 6px; padding: 3px 8px; font-size: 12px; text-align: center; }
  .net.flash { background: #ffe08a; }
  .ctrs { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin: 6px 0; }
  .c { border: 2px solid #c9d1e3; border-radius: 8px; padding: 6px; font-size: 12px; min-height: 52px; }
  .c b { display: block; font-size: 13px; }
  .c.running { border-color: #1e8e3e; background: #e9f7ee; }
  .c.done { border-color: #9aa3b5; background: #f1f3f7; color: #5b6275; }
  .c.crashed { border-color: #d93025; background: #fdecec; }
  .c.flash { box-shadow: 0 0 0 3px #ffe08a; }
  .vol { background: #fff4e0; border-radius: 6px; padding: 3px 8px; font-size: 12px; text-align: center; }
  .note { margin-top: 8px; background: #fff; border-radius: 8px; padding: 6px 10px; min-height: 20px; }
</style>

<div class="bar">
  <button id="create">Create pod</button>
  <button id="curl">log-agent: curl localhost:8080</button>
  <button id="req">app handles a request</button>
  <button id="crash">Crash app container</button>
  <button id="del">Delete pod</button>
</div>
<div class="pod gone" id="pod">
  <h4>Pod <code>shop</code> <span id="meta">not created</span></h4>
  <div class="net" id="net">shared network namespace: one IP, containers talk via localhost</div>
  <div class="ctrs">
    <div class="c" id="c-init"><b>init: migrate</b><span id="s-init">-</span></div>
    <div class="c" id="c-side"><b>sidecar: log-agent</b><span id="s-side">-</span></div>
    <div class="c" id="c-app"><b>app :8080</b><span id="s-app">-</span></div>
  </div>
  <div class="vol" id="vol">shared volume (emptyDir) mounted at /var/log/app in app + log-agent</div>
</div>
<div class="note" id="note">No pod yet. Click <b>Create pod</b>.</div>

<script>
  var IPS = ['10.244.1.17', '10.244.2.5', '10.244.1.23', '10.244.2.11'];
  var NODES = ['node-1', 'node-2', 'node-1', 'node-2'];
  var created = 0;
  var pod = null;
  var busy = false;
  var lines = 0;

  function $(id) { return document.getElementById(id); }
  function note(t) { $('note').innerHTML = t; }
  function flash(id) {
    $(id).classList.add('flash');
    setTimeout(function () { $(id).classList.remove('flash'); }, 500);
  }
  function seq(steps) {
    busy = true;
    render();
    var i = 0;
    (function next() {
      if (i >= steps.length) { busy = false; render(); return; }
      steps[i++]();
      render();
      setTimeout(next, 450);
    })();
  }

  function create() {
    var n = created++ % IPS.length;
    pod = { ip: IPS[n], node: NODES[n], init: 'waiting', side: 'waiting', app: 'waiting', restarts: 0 };
    lines = 0;
    seq([
      function () {
        console.log('$ kubectl apply -f pod.yaml');
        console.log('pod/shop created');
        console.log('[scheduler] shop -> ' + pod.node + ', pod IP ' + pod.ip);
      },
      function () {
        pod.init = 'running';
        console.log('[kubelet] init container "migrate": running');
        note('Init containers run first, one at a time. The app has not started yet.');
      },
      function () {
        pod.init = 'done';
        console.log('[kubelet] init container "migrate": completed (exit 0)');
      },
      function () {
        pod.side = 'running';
        console.log('[kubelet] sidecar "log-agent" (initContainer, restartPolicy: Always): started');
        note('A native sidecar starts before the app and keeps running.');
      },
      function () {
        pod.app = 'running';
        console.log('[kubelet] container "app": started, listening on :8080');
        console.log('$ kubectl get pod shop');
        console.log('NAME   READY   STATUS    RESTARTS   AGE');
        console.log('shop   2/2     Running   0          4s');
        note('Running. Pod IP <code>' + pod.ip + '</code> on ' + pod.node + '. Try the buttons.');
      },
    ]);
  }

  function curl() {
    flash('net');
    flash('c-app');
    console.log('[log-agent] $ curl -s localhost:8080/healthz');
    console.log('[log-agent] ok   <- same network namespace: localhost IS the pod');
    note('No Service, no IP needed: both containers share <code>localhost</code>.');
  }

  function req() {
    lines++;
    flash('vol');
    flash('c-side');
    console.log('[app] GET /cart 200 -> appended to /var/log/app/access.log');
    console.log('[log-agent] tail /var/log/app/access.log -> shipped line ' + lines);
    note('The app writes a file, the sidecar reads it: the <code>emptyDir</code> volume is shared.');
  }

  function crash() {
    seq([
      function () {
        pod.app = 'crashed';
        console.log('[app] panic: nil pointer dereference - exited with code 2');
        note('The container died, but the pod still exists.');
      },
      function () {
        pod.restarts++;
        pod.app = 'running';
        console.log('[kubelet] restartPolicy: Always -> restarted container "app" (restarts: ' + pod.restarts + ')');
        console.log('same pod, same IP ' + pod.ip + ' - the kubelet repairs containers in place');
        note('Container restarted in place. RESTARTS = ' + pod.restarts + '. Same pod, same IP.');
      },
    ]);
  }

  function del() {
    seq([
      function () {
        console.log('$ kubectl delete pod shop');
        console.log('[kubelet] SIGTERM -> "app" stops first, then sidecar "log-agent"');
        pod.app = 'done';
      },
      function () {
        pod.side = 'done';
        console.log('pod "shop" deleted');
      },
      function () {
        pod = null;
        console.log('$ kubectl get pods');
        console.log('No resources found in default namespace.');
        console.log('(a bare pod has no controller: nothing brings it back)');
        note('Gone for good. Nothing recreates a bare pod. Click <b>Create pod</b>: watch the IP.');
      },
    ]);
  }

  var LABEL = { waiting: 'waiting', running: 'running', done: 'completed', crashed: 'crashed (exit 2)' };
  function render() {
    $('pod').className = 'pod' + (pod ? '' : ' gone');
    $('meta').textContent = pod
      ? 'IP ' + pod.ip + ' · ' + pod.node + ' · restarts ' + pod.restarts
      : 'not created';
    [['init', 'c-init', 's-init'], ['side', 'c-side', 's-side'], ['app', 'c-app', 's-app']].forEach(function (x) {
      var s = pod ? pod[x[0]] : null;
      $(x[1]).className = 'c ' + (s || '');
      $(x[2]).textContent = s ? LABEL[s] : '-';
    });
    var up = pod && pod.app === 'running' && pod.side === 'running';
    $('create').disabled = busy || !!pod;
    $('curl').disabled = busy || !up;
    $('req').disabled = busy || !up;
    $('crash').disabled = busy || !up;
    $('del').disabled = busy || !pod;
  }

  $('create').onclick = create;
  $('curl').onclick = curl;
  $('req').onclick = req;
  $('crash').onclick = crash;
  $('del').onclick = del;
  console.log('$ kubectl get pods');
  console.log('No resources found in default namespace.');
  render();
</script>`,
          explain: `
          <details>
            <summary>The problem: helpers that must sit right next to your app</summary>
            <p>Say your app writes logs to a file and you want a log shipper to send them somewhere. With plain containers you'd
            need the two on the same machine, sharing a directory, started in the right order, and moved together if the
            machine dies. Two separate Deployments can't promise any of that: the scheduler could put them on different nodes.</p>
            <p>A Pod solves it by making "these containers belong together" part of the spec: same node, same network, shared
            volumes, one lifecycle. But it also means Pods are <em>disposable</em> units: when one is deleted, the containers,
            the IP and the <code>emptyDir</code> data go with it.</p>
          </details>
          <details>
            <summary>Step by step: what each button does</summary>
            <table>
              <tr><th>Click</th><th>Pod state</th><th>Console</th></tr>
              <tr><td>(load)</td><td>no pod (faded box)</td><td><code>$ kubectl get pods</code><br><code>No resources found in default namespace.</code></td></tr>
              <tr><td><b>Create pod</b></td><td>IP <code>10.244.1.17</code> on node-1. init "migrate": running &rarr; completed, then log-agent running, then app running</td><td><code>pod/shop created</code><br><code>[scheduler] shop -&gt; node-1, pod IP 10.244.1.17</code><br><code>[kubelet] init container "migrate": running</code><br><code>[kubelet] init container "migrate": completed (exit 0)</code><br><code>[kubelet] sidecar "log-agent" (initContainer, restartPolicy: Always): started</code><br><code>[kubelet] container "app": started, listening on :8080</code><br><code>shop   2/2     Running   0          4s</code></td></tr>
              <tr><td><b>log-agent: curl localhost:8080</b></td><td>network bar flashes</td><td><code>[log-agent] $ curl -s localhost:8080/healthz</code><br><code>[log-agent] ok   &lt;- same network namespace: localhost IS the pod</code></td></tr>
              <tr><td><b>app handles a request</b></td><td>volume bar flashes</td><td><code>[app] GET /cart 200 -&gt; appended to /var/log/app/access.log</code><br><code>[log-agent] tail /var/log/app/access.log -&gt; shipped line 1</code></td></tr>
              <tr><td><b>Crash app container</b></td><td>app red, then running again; header shows <code>restarts 1</code>, IP unchanged</td><td><code>[app] panic: nil pointer dereference - exited with code 2</code><br><code>[kubelet] restartPolicy: Always -&gt; restarted container "app" (restarts: 1)</code><br><code>same pod, same IP 10.244.1.17 - the kubelet repairs containers in place</code></td></tr>
              <tr><td><b>Delete pod</b></td><td>app stops, then sidecar; box fades, "not created"</td><td><code>$ kubectl delete pod shop</code><br><code>[kubelet] SIGTERM -&gt; "app" stops first, then sidecar "log-agent"</code><br><code>pod "shop" deleted</code><br><code>No resources found in default namespace.</code><br><code>(a bare pod has no controller: nothing brings it back)</code></td></tr>
              <tr><td><b>Create pod</b> again</td><td>a brand-new pod: IP <code>10.244.2.5</code> on node-2, restarts 0, log counter back to 1</td><td><code>[scheduler] shop -&gt; node-2, pod IP 10.244.2.5</code> ...</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained: the manifest behind the simulator</summary>
            <pre><code class="language-yaml">spec:
  initContainers:
    - name: migrate                  # ① runs to completion first
      image: shop/app:2.1
      command: ["./migrate", "up"]
    - name: log-agent                # ② native sidecar
      image: fluent/fluent-bit:4.0
      restartPolicy: Always          #    this line makes it a sidecar
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
  containers:
    - name: app                      # ③ starts after both init entries are up
      image: shop/app:2.1
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: logs                 # ④ same volume name = shared files
          mountPath: /var/log/app
  volumes:
    - name: logs
      emptyDir: {}                   # ⑤ lives exactly as long as the pod</code></pre>
            <ol>
              <li><strong>①</strong> A normal init container must exit 0 before the next entry starts.</li>
              <li><strong>②</strong> <code>restartPolicy: Always</code> on an init container = sidecar: the kubelet starts it, doesn't wait for it to exit, restarts it if it crashes, and stops it after the app containers.</li>
              <li><strong>③</strong> App containers start only once every init container has completed and every sidecar has started.</li>
              <li><strong>④</strong> Both containers mount the volume called <code>logs</code>, so the file the app writes is visible to the sidecar.</li>
              <li><strong>⑤</strong> <code>emptyDir</code> is created empty with the pod and deleted with it. It survives container restarts, not pod deletion.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: "my pod restarted, so it's the same as a new pod"</summary>
            <p>There are two very different events:</p>
            <ul>
              <li><strong>Container restart</strong> (the Crash button): kubelet, same pod name, same IP, <code>emptyDir</code> kept, <code>RESTARTS</code> + 1.</li>
              <li><strong>Pod replacement</strong> (Delete + Create): new pod object, new IP, empty <code>emptyDir</code>. Only a controller does this automatically.</li>
            </ul>
            <div class="tip">When a pod is crash-looping, <code>kubectl logs shop -c app --previous</code> shows the logs of the
            container run that crashed, and <code>kubectl describe pod shop</code> shows the exit code and events.</div>
          </details>
        `,
        },
        {
          title: 'pod.yaml: init container + native sidecar + shared volume',
          runnable: false,
          lang: 'yaml',
          code: String.raw`apiVersion: v1
kind: Pod
metadata:
  name: shop
  labels:
    app: shop
spec:
  initContainers:
    - name: migrate                 # runs once, must exit 0
      image: shop/app:2.1
      command: ["./migrate", "up"]
    - name: log-agent               # native sidecar (stable since 1.33)
      image: fluent/fluent-bit:4.0
      restartPolicy: Always
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
          readOnly: true
  containers:
    - name: app
      image: shop/app:2.1
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
  volumes:
    - name: logs
      emptyDir: {}`,
        },
        {
          title: 'Working with pods from the terminal',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ kubectl apply -f pod.yaml
pod/shop created

$ kubectl get pod shop -o wide
NAME   READY   STATUS     RESTARTS   AGE   IP            NODE
shop   0/2     Init:0/2   0          2s    10.244.1.17   learn-worker
$ kubectl get pod shop -o wide
NAME   READY   STATUS    RESTARTS   AGE   IP            NODE
shop   2/2     Running   0          9s    10.244.1.17   learn-worker

# logs / exec need -c when a pod has several containers
$ kubectl logs shop -c migrate
applied 3 migrations
$ kubectl exec -it shop -c log-agent -- sh
/ # wget -qO- localhost:8080/healthz
ok

# see containers, restarts, exit codes and events
$ kubectl describe pod shop | tail -5
Events:
  Normal  Scheduled  20s  default-scheduler  Successfully assigned default/shop to learn-worker
  Normal  Started    18s  kubelet            Started container migrate
  Normal  Started    16s  kubelet            Started container log-agent
  Normal  Started    15s  kubelet            Started container app

# a bare pod is not recreated
$ kubectl delete pod shop
pod "shop" deleted
$ kubectl get pods
No resources found in default namespace.`,
        },
      ],
      quiz: [
        {
          q: 'Two containers in the same Pod need to talk over HTTP. What address does one use to reach the other?',
          options: ['The other container\'s IP', '<code>localhost</code> + the other container\'s port', 'The container name as a DNS name', 'A Service is required'],
          answer: 1,
          why: 'Containers in a Pod share one network namespace, so they share an IP and reach each other on localhost (and must use different ports).',
        },
        {
          q: 'You <code>kubectl delete pod shop</code> for a Pod you created directly from a <code>kind: Pod</code> manifest. What happens?',
          options: ['The kubelet recreates it on the same node', 'It is gone; nothing recreates it', 'The scheduler recreates it on another node', 'It restarts with RESTARTS + 1'],
          answer: 1,
          why: 'Only controllers (ReplicaSet, Job, StatefulSet, ...) replace Pods. A bare Pod has no owner, so deleting it is final.',
        },
        {
          q: 'An app container crashes and the kubelet restarts it. Which is true?',
          options: [
            'The Pod gets a new IP',
            'The Pod gets a new name',
            'Same Pod, same IP; the RESTARTS counter goes up',
            'The emptyDir volume is wiped',
          ],
          answer: 2,
          why: 'A container restart happens inside the existing Pod. Only a new Pod gets a new name/IP and an empty emptyDir.',
        },
        {
          q: 'How do you declare a <strong>native sidecar</strong> in Kubernetes 1.33+?',
          options: [
            'Add <code>sidecar: true</code> to a container',
            'Put it in <code>initContainers</code> with <code>restartPolicy: Always</code>',
            'Put it second in the <code>containers</code> list',
            'Use <code>kind: Sidecar</code>',
          ],
          answer: 1,
          why: 'A restartable init container starts before the app, keeps running, is restarted on failure and is stopped after the app. It became stable in 1.33.',
        },
        {
          q: 'Your web app and PostgreSQL both need to run. Best layout?',
          options: [
            'One Pod with both containers',
            'Separate workloads (e.g. a Deployment for web, a StatefulSet for Postgres) connected via a Service',
            'One Pod per node with both containers',
            'Postgres as an init container of the web Pod',
          ],
          answer: 1,
          why: 'They scale and fail independently. Put containers in one Pod only when they must share lifecycle, network and files.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>The <code>log-agent</code> is listed as a regular container, so it may start after the app and has no
        volume to read from. Edit the manifest in the box below to turn it into a proper <strong>native sidecar</strong>, then click <b>Check</b>:</p>
        <ul>
          <li>keep <code>kind: Pod</code> / <code>apiVersion: v1</code></li>
          <li>move <code>log-agent</code> into <code>spec.initContainers</code> with <code>restartPolicy: Always</code></li>
          <li>keep <code>app</code> in <code>spec.containers</code> (and only there)</li>
          <li>add a pod-level <code>volumes</code> entry named <code>logs</code> of type <code>emptyDir: {}</code></li>
          <li>mount <code>logs</code> in <strong>both</strong> <code>app</code> and <code>log-agent</code></li>
        </ul>`,
        hint: '<code>initContainers:</code> sits at the same indentation as <code>containers:</code> (under <code>spec:</code>). <code>volumes:</code> too. The sidecar needs its own <code>volumeMounts</code> list.',
        starter: checker(`apiVersion: v1
kind: Pod
metadata:
  name: shop
spec:
  containers:
    - name: app
      image: shop/app:2.1
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
    - name: log-agent
      image: fluent/fluent-bit:4.0`, CHECKS_SIDECAR, 24),
        solution: checker(`apiVersion: v1
kind: Pod
metadata:
  name: shop
spec:
  initContainers:
    - name: log-agent
      image: fluent/fluent-bit:4.0
      restartPolicy: Always
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
  containers:
    - name: app
      image: shop/app:2.1
      ports:
        - containerPort: 8080
      volumeMounts:
        - name: logs
          mountPath: /var/log/app
  volumes:
    - name: logs
      emptyDir: {}`, CHECKS_SIDECAR, 24),
      },
    },

    // ------------------------------------------------------------------ labels-selectors-namespaces
    {
      id: 'labels-selectors-namespaces',
      section: 'Kubernetes Core',
      title: 'Labels, selectors & namespaces',
      explain: `
      <p>In Compose, services find each other by <em>name</em>, and <code>compose.yaml</code> lists exactly which containers
      belong to your app. Kubernetes has no such list. Instead, objects find each other by <strong>labels</strong>: small
      key/value tags, and <strong>selectors</strong>: queries over those tags. Labels are the glue of Kubernetes.</p>

      <h3>Labels</h3>
      <pre><code class="language-yaml">metadata:
  labels:
    app: web            # what it is
    tier: frontend      # which layer
    env: prod           # which environment
    track: canary       # which rollout track</code></pre>
      <ul>
        <li>Any object can have labels; you invent the keys. Values are short strings (max 63 chars).</li>
        <li>Keys may have a prefix: <code>app.kubernetes.io/name</code>, <code>app.kubernetes.io/version</code>,
        <code>app.kubernetes.io/part-of</code> are the <em>recommended</em> shared labels that tools understand.</li>
        <li>Change them live: <code>kubectl label pod web-1 track=canary</code> (add <code>--overwrite</code> to change a value, <code>track-</code> to remove).</li>
      </ul>
      <p><strong>Annotations</strong> look similar but are for non-identifying data (build info, tool settings, long text).
      You can't select by annotations.</p>

      <h3>Selectors</h3>
      <table>
        <tr><th>Kind</th><th>kubectl <code>-l</code></th><th>Meaning</th></tr>
        <tr><td rowspan="2">Equality</td><td><code>app=web</code> (or <code>==</code>)</td><td>label exists with this value</td></tr>
        <tr><td><code>env!=prod</code></td><td>value is not prod <em>or the label is missing</em></td></tr>
        <tr><td rowspan="4">Set-based</td><td><code>env in (prod,staging)</code></td><td>label exists and value is one of these</td></tr>
        <tr><td><code>tier notin (cache)</code></td><td>value is not in the set <em>or the label is missing</em></td></tr>
        <tr><td><code>track</code></td><td>label exists (any value)</td></tr>
        <tr><td><code>!track</code></td><td>label does not exist</td></tr>
      </table>
      <p>Commas mean <strong>AND</strong>: <code>app=web,env=prod</code> needs both. There is no OR between terms; use
      <code>in (...)</code> for "one of".</p>
      <p>Where selectors are used:</p>
      <ul>
        <li>A <strong>Service</strong> sends traffic to Pods matching <code>spec.selector</code> (equality only, a plain map).</li>
        <li>A <strong>Deployment / ReplicaSet / Job / StatefulSet / DaemonSet</strong> owns Pods matching
        <code>spec.selector</code>, which supports <code>matchLabels</code> and <code>matchExpressions</code>
        (operators <code>In</code>, <code>NotIn</code>, <code>Exists</code>, <code>DoesNotExist</code>).</li>
        <li>You: <code>kubectl get pods -l app=web</code>, <code>kubectl delete pods -l track=canary</code>, <code>kubectl logs -l app=web</code>.</li>
      </ul>
      <div class="warn">Selectors are live queries. If you change a Pod's labels so it no longer matches, its Service stops
      sending it traffic and its ReplicaSet stops counting it (and creates a replacement). Handy for debugging, dangerous by accident.</div>

      <h3>Namespaces: virtual clusters</h3>
      <p>A <strong>namespace</strong> is a named partition of one cluster: like a folder for objects. Names only have to be
      unique <em>within</em> a namespace, so <code>shop/web</code> and <code>blog/web</code> can both exist. Teams, apps or
      environments each get their own, and RBAC permissions and ResourceQuotas can be set per namespace.</p>
      <ul>
        <li>Built-in: <code>default</code> (where things go if you don't say), <code>kube-system</code> (cluster components),
        <code>kube-public</code>, <code>kube-node-lease</code>.</li>
        <li>Pick one per command with <code>-n shop</code>, all with <code>-A</code>, or set a default in your context.</li>
        <li>Some objects are <strong>cluster-scoped</strong> and live in no namespace: Nodes, Namespaces, PersistentVolumes,
        StorageClasses, ClusterRoles. <code>kubectl api-resources --namespaced=false</code> lists them.</li>
      </ul>
      <h3>DNS across namespaces</h3>
      <p>Every Service gets a DNS name: <code>&lt;service&gt;.&lt;namespace&gt;.svc.cluster.local</code>. Inside the same
      namespace the short name works (<code>http://api:8080</code>), like Compose service names. From another namespace use
      <code>api.shop</code> or the full name <code>api.shop.svc.cluster.local</code>.</p>
      <div class="tip">Compose analogy: the project name (<code>-p shop</code>) keeps two stacks apart on one host.
      Namespaces do the same inside a cluster. But namespaces are <strong>not</strong> a network wall: by default Pods can talk
      across namespaces. Use NetworkPolicies to restrict that.</div>
    `,
      examples: [
        {
          title: 'Simulator: type a selector, see what matches',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  #sel { font: 14px ui-monospace, monospace; width: 300px; }
  .presets button { font: 12px ui-monospace, monospace; padding: 2px 8px; }
  .ns { margin-top: 6px; }
  .ns h4 { margin: 4px 0; font-size: 13px; color: #5b6275; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .pod {
    background: #fff; border: 2px solid #d3d9e6; border-radius: 8px; padding: 5px 7px;
    transition: all .2s; font-size: 12px;
  }
  .pod b { font: 13px ui-monospace, monospace; }
  .pod.hit { border-color: #1e8e3e; background: #e6f6ec; }
  .pod.miss { opacity: .45; }
  .pod.hidden { display: none; }
  .lbl { display: inline-block; margin: 2px 2px 0 0; padding: 0 5px; border-radius: 4px; background: #eef1f7; font: 11px ui-monospace, monospace; }
  .res { margin-top: 6px; background: #fff; border-radius: 8px; padding: 6px 10px; }
  .err { color: #b3261e; }
</style>

<div class="bar">
  <b>-l</b> <input id="sel" value="app=web" spellcheck="false">
  <select id="ns">
    <option value="default">-n default</option>
    <option value="shop">-n shop</option>
    <option value="*">-A (all namespaces)</option>
  </select>
</div>
<div class="bar presets" id="presets"></div>
<div id="pods"></div>
<div class="res" id="res"></div>

<script>
  var PODS = [
    { ns: 'default', name: 'web-1', labels: { app: 'web', env: 'prod', tier: 'frontend', track: 'stable' } },
    { ns: 'default', name: 'web-2', labels: { app: 'web', env: 'prod', tier: 'frontend', track: 'canary' } },
    { ns: 'default', name: 'web-3', labels: { app: 'web', env: 'staging', tier: 'frontend' } },
    { ns: 'default', name: 'api-1', labels: { app: 'api', env: 'prod', tier: 'backend', track: 'stable' } },
    { ns: 'default', name: 'api-2', labels: { app: 'api', env: 'staging', tier: 'backend' } },
    { ns: 'default', name: 'redis-1', labels: { app: 'redis', tier: 'cache' } },
    { ns: 'shop', name: 'web-1', labels: { app: 'web', env: 'prod', tier: 'frontend' } },
    { ns: 'shop', name: 'worker-1', labels: { app: 'worker', env: 'dev', tier: 'backend' } },
  ];
  var PRESETS = ['app=web', 'app=web,env=prod', 'env!=prod', 'env in (prod,staging),tier!=cache',
    'track', '!track', 'tier notin (frontend,cache)', 'app=web,track=canary'];

  // split on commas that are not inside ( )
  function parseSelector(s) {
    var parts = [], cur = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    return parts.map(function (p) { return p.trim(); }).filter(Boolean).map(parseTerm);
  }
  function parseTerm(t) {
    var K = '([A-Za-z0-9._/-]+)';
    var m = t.match(new RegExp('^' + K + '\\s+(in|notin)\\s*\\(([^)]*)\\)$'));
    if (m) return { key: m[1], op: m[2], vals: m[3].split(',').map(function (v) { return v.trim(); }) };
    m = t.match(new RegExp('^' + K + '\\s*(==|!=|=)\\s*([A-Za-z0-9._-]*)$'));
    if (m) return { key: m[1], op: m[2] === '!=' ? '!=' : '=', vals: [m[3]] };
    m = t.match(new RegExp('^!\\s*' + K + '$'));
    if (m) return { key: m[1], op: '!exists' };
    m = t.match(new RegExp('^' + K + '$'));
    if (m) return { key: m[1], op: 'exists' };
    throw new Error('cannot parse "' + t + '"');
  }
  function matches(labels, term) {
    var has = Object.prototype.hasOwnProperty.call(labels, term.key);
    var v = labels[term.key];
    switch (term.op) {
      case '=': return has && v === term.vals[0];
      case '!=': return !has || v !== term.vals[0];
      case 'in': return has && term.vals.indexOf(v) >= 0;
      case 'notin': return !has || term.vals.indexOf(v) < 0;
      case 'exists': return has;
      default: return !has;
    }
  }
  function labelStr(l) {
    return Object.keys(l).map(function (k) { return k + '=' + l[k]; }).join(',');
  }
  function pad(s, n) { while (s.length < n) s += ' '; return s; }

  function update() {
    var sel = document.getElementById('sel').value;
    var ns = document.getElementById('ns').value;
    var terms, err = null;
    try { terms = parseSelector(sel); } catch (e) { err = e.message; terms = []; }
    var visible = PODS.filter(function (p) { return ns === '*' || p.ns === ns; });
    var hits = err ? [] : visible.filter(function (p) {
      return terms.every(function (t) { return matches(p.labels, t); });
    });

    var html = '';
    ['default', 'shop'].forEach(function (n) {
      html += '<div class="ns"><h4>namespace: ' + n + (ns === '*' || ns === n ? '' : ' (not in -n ' + ns + ')') + '</h4><div class="grid">';
      PODS.filter(function (p) { return p.ns === n; }).forEach(function (p) {
        var cls = visible.indexOf(p) < 0 ? 'miss' : hits.indexOf(p) >= 0 ? 'hit' : 'miss';
        html += '<div class="pod ' + cls + '"><b>' + p.name + '</b><br>' +
          Object.keys(p.labels).map(function (k) { return '<span class="lbl">' + k + '=' + p.labels[k] + '</span>'; }).join('') +
          '</div>';
      });
      html += '</div></div>';
    });
    document.getElementById('pods').innerHTML = html;

    var setBased = terms.some(function (t) { return t.op !== '='; });
    var res = err
      ? '<span class="err">error: ' + err + '</span>'
      : '<b>' + hits.length + '</b> match. ' + (terms.length === 0 ? 'Empty selector = everything. ' : '') +
        (setBased
          ? 'Uses !=, in, notin or exists: fine for kubectl and Deployment matchExpressions, but a Service selector only supports key=value pairs.'
          : 'A Service with this selector would send traffic to: ' + (hits.map(function (p) { return p.ns + '/' + p.name; }).join(', ') || 'nobody'));
    document.getElementById('res').innerHTML = res;

    console.log('$ kubectl get pods ' + (ns === '*' ? '-A' : '-n ' + ns) + " -l '" + sel + "' --show-labels");
    if (err) { console.log('error: ' + err); return; }
    if (!hits.length) { console.log('No resources found.'); return; }
    console.log((ns === '*' ? pad('NAMESPACE', 10) : '') + pad('NAME', 10) + 'LABELS');
    hits.forEach(function (p) {
      console.log((ns === '*' ? pad(p.ns, 10) : '') + pad(p.name, 10) + labelStr(p.labels));
    });
  }

  var pre = document.getElementById('presets');
  PRESETS.forEach(function (p) {
    var b = document.createElement('button');
    b.textContent = p;
    b.onclick = function () { document.getElementById('sel').value = p; update(); };
    pre.appendChild(b);
  });
  document.getElementById('sel').addEventListener('change', update);
  document.getElementById('sel').addEventListener('keydown', function (e) { if (e.key === 'Enter') update(); });
  document.getElementById('ns').addEventListener('change', update);
  update();
</script>`,
          explain: `
          <details>
            <summary>The problem: nothing in Kubernetes holds a list of "my pods"</summary>
            <p>A Deployment doesn't store "I own pods web-1, web-2, web-3", and a Service doesn't store a fixed list of backends.
            Pods come and go with random names, so any fixed list would be stale within minutes. Instead each owner stores a
            <strong>query</strong>, and the answer is recomputed all the time. If a new Pod appears with matching labels, it is
            included automatically; if a Pod's labels change, it drops out.</p>
            <p>This is why a typo in a label is so painful: <code>app: Web</code> vs <code>app: web</code> means the Service has
            zero endpoints and nothing tells you loudly.</p>
          </details>
          <details>
            <summary>Step by step: what each preset matches (namespace <code>default</code>)</summary>
            <table>
              <tr><th>Selector</th><th>Matches</th><th>Why</th></tr>
              <tr><td><code>app=web</code></td><td>web-1, web-2, web-3</td><td>shown on load; the result box says a Service would send traffic to <code>default/web-1, default/web-2, default/web-3</code></td></tr>
              <tr><td><code>app=web,env=prod</code></td><td>web-1, web-2</td><td>comma = AND; web-3 is <code>env=staging</code></td></tr>
              <tr><td><code>env!=prod</code></td><td>web-3, api-2, redis-1</td><td>redis-1 has <em>no</em> env label, and <code>!=</code> matches missing labels</td></tr>
              <tr><td><code>env in (prod,staging),tier!=cache</code></td><td>web-1, web-2, web-3, api-1, api-2</td><td><code>in</code> requires the label, so redis-1 is out already</td></tr>
              <tr><td><code>track</code></td><td>web-1, web-2, api-1</td><td>"key exists", any value</td></tr>
              <tr><td><code>!track</code></td><td>web-3, api-2, redis-1</td><td>exactly the other half</td></tr>
              <tr><td><code>tier notin (frontend,cache)</code></td><td>api-1, api-2</td><td>everyone has a tier here, so only backend is left</td></tr>
              <tr><td><code>app=web,track=canary</code></td><td>web-2</td><td>how you'd target only the canary</td></tr>
            </table>
            <p>Now switch the dropdown to <b>-A (all namespaces)</b> with <code>app=web</code>: 4 matches, including
            <code>shop/web-1</code>. The console adds a <code>NAMESPACE</code> column, like real kubectl. With <b>-n shop</b>
            only <code>web-1</code> in shop matches: the same name lives happily in two namespaces.</p>
          </details>
          <details>
            <summary>Key lines explained: the same selectors in YAML</summary>
            <pre><code class="language-yaml"># Deployment / ReplicaSet / Job / StatefulSet / DaemonSet
selector:
  matchLabels:              # ① equality, ANDed
    app: web
  matchExpressions:         # ② set-based, ANDed with ①
    - key: env
      operator: In          #    In | NotIn | Exists | DoesNotExist
      values: [prod, staging]
    - key: track
      operator: Exists
---
# Service: a plain map, equality only
selector:                   # ③
  app: web
  env: prod</code></pre>
            <ol>
              <li><strong>①</strong> <code>matchLabels: {app: web}</code> is the same as <code>-l app=web</code>.</li>
              <li><strong>②</strong> <code>In [prod, staging]</code> = <code>env in (prod,staging)</code>; <code>Exists</code> = <code>track</code>; <code>DoesNotExist</code> = <code>!track</code>. All terms in ① and ② must match.</li>
              <li><strong>③</strong> A Service selector has no <code>matchLabels</code> wrapper and no expressions. That's why the simulator warns when you use <code>!=</code>, <code>in</code> or exists-style terms.</li>
            </ol>
          </details>
          <details>
            <summary>Try this &amp; common mistakes</summary>
            <ul>
              <li>Type <code>app=web,app=api</code>: 0 matches. Comma is AND, not OR. Use <code>app in (web,api)</code>.</li>
              <li>Type <code>env in (prod</code>: parse error, just like kubectl's "unable to parse requirement".</li>
              <li>Type <code>app=Web</code>: 0 matches. Values are case-sensitive.</li>
            </ul>
            <div class="warn">A Deployment's <code>spec.selector</code> is <strong>immutable</strong> after creation and must match its
            pod template labels. Pick your labels carefully up front; to change the selector you delete and recreate the Deployment.</div>
          </details>
        `,
        },
        {
          title: 'Labels, selectors and namespaces in manifests',
          runnable: false,
          lang: 'yaml',
          code: String.raw`apiVersion: v1
kind: Namespace
metadata:
  name: shop
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop                # lives in "shop", not "default"
  labels:
    app.kubernetes.io/name: web
    app.kubernetes.io/part-of: shop
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web                   # must be a subset of the template labels
    matchExpressions:
      - key: track
        operator: In
        values: [stable, canary]
  template:
    metadata:
      labels:
        app: web
        track: stable
        env: prod
    spec:
      containers:
        - name: web
          image: shop/web:1.4
          env:
            - name: API_URL      # same namespace: short name is enough
              value: http://api:8080
            - name: AUTH_URL     # other namespace: <svc>.<ns>.svc.cluster.local
              value: http://auth.identity.svc.cluster.local
---
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  selector:                      # equality only
    app: web
  ports:
    - port: 80
      targetPort: 8080`,
        },
        {
          title: 'Selectors and namespaces from the terminal',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ kubectl create namespace shop
namespace/shop created
$ kubectl apply -f shop.yaml
deployment.apps/web created
service/web created

$ kubectl get pods -n shop --show-labels
NAME                   READY   STATUS    AGE   LABELS
web-5f8c6d9b7d-2kqxz   1/1     Running   20s   app=web,env=prod,pod-template-hash=5f8c6d9b7d,track=stable
web-5f8c6d9b7d-8wnvp   1/1     Running   20s   app=web,env=prod,pod-template-hash=5f8c6d9b7d,track=stable
web-5f8c6d9b7d-rt4hm   1/1     Running   20s   app=web,env=prod,pod-template-hash=5f8c6d9b7d,track=stable

# set-based selector, extra label columns
$ kubectl get pods -n shop -l 'env in (prod,staging),track' -L track
NAME                   READY   STATUS    AGE   TRACK
web-5f8c6d9b7d-2kqxz   1/1     Running   31s   stable
...

# take one pod out of the Service (and out of its ReplicaSet!) for debugging
$ kubectl label pod web-5f8c6d9b7d-2kqxz -n shop app=debug --overwrite
pod/web-5f8c6d9b7d-2kqxz labeled
$ kubectl get pods -n shop -l app=web
NAME                   READY   STATUS              AGE
web-5f8c6d9b7d-8wnvp   1/1     Running             50s
web-5f8c6d9b7d-rt4hm   1/1     Running             50s
web-5f8c6d9b7d-q9zlc   0/1     ContainerCreating   2s    # ReplicaSet replaced it

# make "shop" the default for this context
$ kubectl config set-context --current --namespace=shop

# DNS from a throwaway pod in another namespace
$ kubectl run -n default tmp --rm -it --image=busybox:1.37 --restart=Never -- \
    nslookup web.shop.svc.cluster.local
Name:      web.shop.svc.cluster.local
Address:   10.96.141.27
pod "tmp" deleted`,
        },
      ],
      quiz: [
        {
          q: 'Pod labels: <code>app=web, tier=frontend</code> (no <code>env</code> label). Which selector matches it?',
          options: ['<code>env=prod</code>', '<code>env in (prod,dev)</code>', '<code>env!=prod</code>', '<code>app=web,env</code>'],
          answer: 2,
          why: '<code>!=</code> and <code>notin</code> also match objects that don\'t have the key at all. <code>in</code>, <code>=</code> and the bare key require the label to exist.',
        },
        {
          q: 'What does <code>kubectl get pods -l app=web,app=api</code> return?',
          options: ['Pods with app=web or app=api', 'Nothing - comma is AND, and a label has one value', 'An error', 'Only app=api pods'],
          answer: 1,
          why: 'Comma-separated terms are ANDed. No pod can have app=web AND app=api. Use <code>app in (web,api)</code>.',
        },
        {
          q: 'A Pod in namespace <code>web</code> must call Service <code>api</code> in namespace <code>shop</code>. Which URL works?',
          options: ['<code>http://api</code>', '<code>http://shop.api</code>', '<code>http://api.shop.svc.cluster.local</code>', '<code>http://api.cluster.local/shop</code>'],
          answer: 2,
          why: 'Service DNS is <code>&lt;service&gt;.&lt;namespace&gt;.svc.cluster.local</code>. The short name <code>api</code> only resolves inside <code>shop</code>.',
        },
        {
          q: 'Which of these is <strong>cluster-scoped</strong> (not in any namespace)?',
          options: ['Deployment', 'Service', 'Node', 'ConfigMap'],
          answer: 2,
          why: 'Nodes, Namespaces, PersistentVolumes, StorageClasses and ClusterRoles are cluster-wide. Most app objects are namespaced.',
        },
        {
          q: 'Do namespaces stop Pods in <code>team-a</code> from connecting to Pods in <code>team-b</code>?',
          options: ['Yes, always', 'No - by default the Pod network is flat; you need NetworkPolicies', 'Only if they use different nodes', 'Only for UDP'],
          answer: 1,
          why: 'Namespaces separate names, RBAC and quotas, not network traffic. NetworkPolicies (with a CNI that enforces them) restrict traffic.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>The <code>api</code> app should live in namespace <code>shop</code>, and a frontend in namespace
        <code>web</code> should reach it. Right now the Service has no endpoints and the frontend URL can't resolve. Edit the manifests in the box below and click <b>Check</b>:</p>
        <ul>
          <li>put the Deployment in namespace <code>shop</code> (like the Service)</li>
          <li>make the pod template labels include <strong>every</strong> <code>selector.matchLabels</code> pair (values are case-sensitive)</li>
          <li>the Service selector must match those template labels too</li>
          <li>in the ConfigMap (namespace <code>web</code>), set <code>API_URL</code> to the cross-namespace DNS name of the Service, port 8080 (the full <code>...svc.cluster.local</code> form is best)</li>
        </ul>`,
        hint: 'Add <code>namespace: shop</code> under the Deployment\'s <code>metadata</code>. Template labels need <code>app: api</code> (lowercase) and <code>tier: backend</code>. The URL pattern is <code>http://&lt;svc&gt;.&lt;ns&gt;.svc.cluster.local:&lt;port&gt;</code>.',
        starter: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
      tier: backend
  template:
    metadata:
      labels:
        app: API
    spec:
      containers:
        - name: api
          image: shop/api:3.2
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: shop
spec:
  selector:
    app: api
    tier: backend
  ports:
    - port: 8080
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: web
data:
  API_URL: http://api:8080`, CHECKS_LABELS, 26),
        solution: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: api
      tier: backend
  template:
    metadata:
      labels:
        app: api
        tier: backend
    spec:
      containers:
        - name: api
          image: shop/api:3.2
          ports:
            - containerPort: 8080
---
apiVersion: v1
kind: Service
metadata:
  name: api
  namespace: shop
spec:
  selector:
    app: api
    tier: backend
  ports:
    - port: 8080
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: frontend-config
  namespace: web
data:
  API_URL: http://api.shop.svc.cluster.local:8080`, CHECKS_LABELS, 26),
      },
    },
  );
})();
