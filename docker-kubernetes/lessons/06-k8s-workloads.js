// Lessons: Workloads & Networking
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
  const CHECKS_DEPLOY = String.raw`[
  ['<code>apiVersion: apps/v1</code> + <code>kind: Deployment</code>', function (d) {
    return d[0].apiVersion === 'apps/v1' && d[0].kind === 'Deployment';
  }],
  ['<code>replicas: 3</code>', function (d) { return get(d[0], 'spec.replicas') === 3; }],
  ['template labels match <code>selector.matchLabels</code>', function (d) {
    return sameLabels(get(d[0], 'spec.selector.matchLabels'), get(d[0], 'spec.template.metadata.labels'));
  }],
  ['image has a specific tag (not <code>latest</code>, not missing)', function (d) {
    var c = arr(get(d[0], 'spec.template.spec.containers'))[0];
    var img = String(c && c.image || '');
    var tag = img.indexOf(':') > 0 ? img.split(':').pop() : '';
    return tag !== '' && tag !== 'latest';
  }],
  ['container exposes <code>containerPort: 8080</code>', function (d) {
    var c = arr(get(d[0], 'spec.template.spec.containers'))[0];
    return arr(c && c.ports).some(function (p) { return Number(p.containerPort) === 8080; });
  }],
]`;

  const CHECKS_ROLLING = String.raw`[
  ['<code>strategy.type: RollingUpdate</code>', function (d) {
    return get(d[0], 'spec.strategy.type') === 'RollingUpdate';
  }],
  ['<code>maxUnavailable: 0</code>', function (d) {
    var v = get(d[0], 'spec.strategy.rollingUpdate.maxUnavailable');
    return v === 0 || v === '0%';
  }],
  ['<code>maxSurge</code> of at least 1 (or a percentage above 0)', function (d) {
    var v = get(d[0], 'spec.strategy.rollingUpdate.maxSurge');
    if (typeof v === 'number') return v >= 1;
    return /^[1-9]\d*%$/.test(String(v));
  }],
  ['<code>readinessProbe.httpGet</code> on <code>/healthz</code>, port 8080 or <code>http</code>', function (d) {
    var c = arr(get(d[0], 'spec.template.spec.containers'))[0];
    var h = get(c, 'readinessProbe.httpGet');
    return !!h && h.path === '/healthz' && (Number(h.port) === 8080 || h.port === 'http');
  }],
  ['image is <code>shop/web:v2</code>', function (d) {
    var c = arr(get(d[0], 'spec.template.spec.containers'))[0];
    return c && c.image === 'shop/web:v2';
  }],
]`;

  const CHECKS_SERVICE = String.raw`[
  ['Service selector matches the pod template labels', function (d) {
    return sameLabels(get(kind(d, 'Service'), 'spec.selector'), get(kind(d, 'Deployment'), 'spec.template.metadata.labels'));
  }],
  ['<code>targetPort</code> is 3000 or <code>http</code>', function (d) {
    var p = arr(get(kind(d, 'Service'), 'spec.ports'))[0];
    return !!p && (Number(p.targetPort) === 3000 || p.targetPort === 'http');
  }],
  ['<code>port: 80</code> and <code>type: NodePort</code>', function (d) {
    var s = kind(d, 'Service');
    var p = arr(get(s, 'spec.ports'))[0];
    return get(s, 'spec.type') === 'NodePort' && !!p && Number(p.port) === 80;
  }],
  ['<code>nodePort</code> is in 30000-32767 (or omitted)', function (d) {
    var p = arr(get(kind(d, 'Service'), 'spec.ports'))[0];
    if (!p) return false;
    if (p.nodePort === undefined) return true;
    var n = Number(p.nodePort);
    return n >= 30000 && n <= 32767;
  }],
]`;

  const CHECKS_ROUTE = String.raw`[
  ['<code>apiVersion: gateway.networking.k8s.io/v1</code> + <code>kind: HTTPRoute</code>', function (d) {
    return d[0].apiVersion === 'gateway.networking.k8s.io/v1' && d[0].kind === 'HTTPRoute';
  }],
  ['<code>parentRefs</code> includes <code>shop-gw</code>', function (d) {
    return arr(get(d[0], 'spec.parentRefs')).some(function (p) { return p && p.name === 'shop-gw'; });
  }],
  ['<code>hostnames</code> includes <code>shop.example.com</code>', function (d) {
    return arr(get(d[0], 'spec.hostnames')).indexOf('shop.example.com') >= 0;
  }],
  ['rule: <code>PathPrefix /api</code> &rarr; <code>api:8080</code>', function (d) {
    return arr(get(d[0], 'spec.rules')).some(function (r) {
      var m = arr(r.matches).some(function (x) {
        return get(x, 'path.type') === 'PathPrefix' && /^\/api\/?$/.test(get(x, 'path.value'));
      });
      var b = arr(r.backendRefs).some(function (x) { return x.name === 'api' && Number(x.port) === 8080; });
      return m && b;
    });
  }],
  ['a rule sends traffic to <code>web:80</code>', function (d) {
    return arr(get(d[0], 'spec.rules')).some(function (r) {
      return arr(r.backendRefs).some(function (x) { return x.name === 'web' && Number(x.port) === 80; });
    });
  }],
]`;

  const CHECKS_CRON = String.raw`[
  ['<code>apiVersion: batch/v1</code> + <code>kind: CronJob</code>', function (d) {
    return d[0].apiVersion === 'batch/v1' && d[0].kind === 'CronJob';
  }],
  ['<code>schedule</code> = 02:30 every day', function (d) {
    return String(get(d[0], 'spec.schedule')).trim().split(/\s+/).join(' ') === '30 2 * * *';
  }],
  ['<code>timeZone: Asia/Bangkok</code>', function (d) { return get(d[0], 'spec.timeZone') === 'Asia/Bangkok'; }],
  ['<code>concurrencyPolicy: Forbid</code>', function (d) { return get(d[0], 'spec.concurrencyPolicy') === 'Forbid'; }],
  ['<code>jobTemplate.spec.backoffLimit: 2</code>', function (d) {
    return get(d[0], 'spec.jobTemplate.spec.backoffLimit') === 2;
  }],
  ['pod <code>restartPolicy</code> is <code>OnFailure</code> or <code>Never</code>', function (d) {
    var r = get(d[0], 'spec.jobTemplate.spec.template.spec.restartPolicy');
    return r === 'OnFailure' || r === 'Never';
  }],
]`;

  window.LESSONS.push(
    // ------------------------------------------------------------------ deployments
    {
      id: 'deployments',
      section: 'Workloads & Networking',
      title: 'Deployments & ReplicaSets',
      explain: `
      <p>A bare Pod dies and stays dead. For a stateless app (web servers, APIs, workers) you want "always N copies of this
      Pod". That's a <strong>Deployment</strong>. It is the Kubernetes version of a Compose service with
      <code>deploy.replicas: 3</code>, except it keeps the count true forever and across machines.</p>

      <h3>Three layers</h3>
      <pre><code class="language-bash">Deployment web                 you write this (replicas, pod template, update strategy)
 └─ ReplicaSet web-6d4b9c7f8d  created by the Deployment controller, one per template version
     ├─ Pod web-6d4b9c7f8d-x4k2p   created by the ReplicaSet controller
     ├─ Pod web-6d4b9c7f8d-9qzmt
     └─ Pod web-6d4b9c7f8d-lr8wn</code></pre>
      <ul>
        <li>The <strong>ReplicaSet</strong> does one job: keep exactly <code>replicas</code> Pods that match its selector.
        Too few &rarr; create; too many &rarr; delete.</li>
        <li>The <strong>Deployment</strong> manages ReplicaSets. When you change the pod template (a new image, say), it
        creates a <em>new</em> ReplicaSet and shifts Pods over gradually (next lesson). You never edit ReplicaSets yourself.</li>
      </ul>

      <h3>Reading pod names</h3>
      <p><code>web-6d4b9c7f8d-x4k2p</code> = Deployment name <code>web</code> + <strong>pod-template-hash</strong>
      <code>6d4b9c7f8d</code> (a hash of the pod template, also added as a label) + a random 5-character suffix. All Pods of
      one ReplicaSet share the hash; a new template gives a new hash. When you see two different hashes, a rollout is in progress
      (or stuck).</p>

      <h3>The selector must match the template</h3>
      <p><code>spec.selector.matchLabels</code> says which Pods the Deployment owns. <code>spec.template.metadata.labels</code>
      is what new Pods get. The API server rejects a Deployment whose selector doesn't match its own template
      (<code>selector does not match template labels</code>). The selector is also <strong>immutable</strong>: to change it
      you create a new Deployment.</p>

      <h3>Self-healing and scaling</h3>
      <ul>
        <li>Pod deleted, crashed out of existence, or its node died &rarr; the ReplicaSet sees "current 2, desired 3" and creates a
        <em>new</em> Pod (new name, new IP). The scheduler places it wherever there's room.</li>
        <li>Scale with <code>kubectl scale deployment web --replicas=5</code> or by editing <code>replicas</code> in the YAML and
        re-applying. (Later, a HorizontalPodAutoscaler can change it for you based on CPU or other metrics.)</li>
        <li>Scaling down removes Pods: roughly the ones on the most crowded nodes and the newest first.</li>
      </ul>
      <div class="tip">Compose analogy: <code>docker compose up -d --scale web=3</code> starts 3 containers once.
      A Deployment with <code>replicas: 3</code> is a promise that is re-checked on every change in the cluster.</div>
      <div class="warn">Deployments are for <strong>stateless</strong> Pods: any copy can be killed and replaced by a new one
      with a new name. If each copy needs its own identity or disk (databases), use a StatefulSet (see the last lesson of
      this section).</div>
    `,
      examples: [
        {
          title: 'Simulator: replicas slider + kill pods',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  .tree { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
  .obj { background: #fff; border-radius: 8px; padding: 4px 10px; border: 2px solid #326ce5; font-size: 13px; }
  .obj.rs { border-color: #7b61ff; }
  .arrow { color: #5b6275; }
  .nodes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
  .node { background: #fff; border: 1px solid #d3d9e6; border-top: 5px solid #1e8e3e; border-radius: 8px; padding: 6px; min-height: 110px; }
  .node h4 { margin: 0 0 4px; font-size: 13px; }
  .pod {
    display: flex; justify-content: space-between; align-items: center; margin: 3px 0; padding: 2px 4px 2px 7px;
    border-radius: 6px; font: 11px ui-monospace, monospace; border: 1px solid #7cc795; background: #dff5e5;
    transition: all .3s;
  }
  .pod.ContainerCreating { background: #fff3cd; border-color: #e0b54b; }
  .pod.Terminating { background: #fdecec; border-color: #e0797d; opacity: .6; text-decoration: line-through; }
  .pod button { padding: 0 6px; margin: 0; font-size: 11px; line-height: 16px; }
</style>

<div class="bar">
  <label>replicas: <b id="rv">3</b> <input type="range" id="rep" min="0" max="8" value="3"></label>
  <button id="get">kubectl get pods</button>
  <button id="reset">Reset</button>
</div>
<div class="tree">
  <span class="obj" id="dep">Deployment web</span><span class="arrow">&rarr;</span>
  <span class="obj rs" id="rs">ReplicaSet</span><span class="arrow">&rarr; pods below (click ✕ to kill one)</span>
</div>
<div class="nodes" id="nodes"></div>

<script>
  var RS = 'web-6d4b9c7f8d';
  var SUFFIX = ['x4k2p', '9qzmt', 'lr8wn', 'h2v6c', 'b7tdn', 'm3fjq', 'p8wxz', 'c5rkg', 't9vhl',
    'z2nmd', 'k7wqa', 'f4jxs', 'r6ybn', 'w3gtd', 'n8cpe', 'q5hvu', 'd2mkx', 'g9sfa'];
  var NODES = ['node-1', 'node-2', 'node-3'];
  var desired, pods, made, seq, timer;

  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function ev(reason, obj, msg) { console.log('Normal  ' + pad(reason, 18) + pad(obj, 27) + msg); }
  function live() { return pods.filter(function (p) { return p.phase !== 'Terminating'; }); }
  function onNode(n) { return live().filter(function (p) { return p.node === n; }); }

  function reset() {
    clearTimeout(timer);
    desired = 3;
    made = 0;
    seq = 0;
    pods = [];
    document.getElementById('rep').value = 3;
    for (var i = 0; i < 3; i++) {
      var p = newPod();
      p.phase = 'Running';
      p.node = NODES[i];
    }
    console.log('$ kubectl apply -f web.yaml');
    console.log('deployment.apps/web created   (3 pods running on node-1..3)');
    render();
  }

  function newPod() {
    var s = made < SUFFIX.length ? SUFFIX[made] : SUFFIX[made % SUFFIX.length] + made;
    made++;
    var p = { name: RS + '-' + s, phase: 'ContainerCreating', node: null, born: seq++ };
    pods.push(p);
    return p;
  }

  // the ReplicaSet controller: one reconcile pass
  function reconcile() {
    var have = live();
    if (have.length < desired) {
      var n = desired - have.length;
      console.log('[replicaset] ' + RS + ': desired ' + desired + ', current ' + have.length + ' -> create ' + n);
      for (var i = 0; i < n; i++) {
        var p = newPod();
        var best = NODES.slice().sort(function (a, b) { return onNode(a).length - onNode(b).length; })[0];
        p.node = best;
        ev('SuccessfulCreate', 'replicaset/' + RS, 'Created pod: ' + p.name);
        ev('Scheduled', 'pod/' + p.name, 'Successfully assigned to ' + best);
        startLater(p);
      }
    } else if (have.length > desired) {
      var k = have.length - desired;
      console.log('[replicaset] ' + RS + ': desired ' + desired + ', current ' + have.length + ' -> delete ' + k);
      for (var j = 0; j < k; j++) {
        var victim = pickVictim();
        victim.phase = 'Terminating';
        ev('SuccessfulDelete', 'replicaset/' + RS, 'Deleted pod: ' + victim.name);
        removeLater(victim);
      }
    }
    render();
  }

  // scale-down choice (simplified): pods on the most crowded node first, then the newest
  function pickVictim() {
    return live().slice().sort(function (a, b) {
      return (onNode(b.node).length - onNode(a.node).length) || (b.born - a.born);
    })[0];
  }

  function startLater(p) {
    setTimeout(function () {
      if (p.phase !== 'ContainerCreating') return;
      p.phase = 'Running';
      ev('Started', 'pod/' + p.name, 'Started container web');
      render();
    }, 700);
  }
  function removeLater(p) {
    setTimeout(function () {
      pods = pods.filter(function (x) { return x !== p; });
      render();
    }, 600);
  }

  function kill(name) {
    var p = pods.filter(function (x) { return x.name === name; })[0];
    if (!p || p.phase === 'Terminating') return;
    console.log('$ kubectl delete pod ' + name);
    console.log('pod "' + name + '" deleted');
    p.phase = 'Terminating';
    removeLater(p);
    render();
    timer = setTimeout(reconcile, 350);
  }

  function scale(n) {
    if (n === desired) return;
    console.log('$ kubectl scale deployment web --replicas=' + n);
    ev('ScalingReplicaSet', 'deployment/web', 'Scaled ' + (n > desired ? 'up' : 'down') +
      ' replica set ' + RS + ' from ' + desired + ' to ' + n);
    desired = n;
    render();
    timer = setTimeout(reconcile, 350);
  }

  function getPods() {
    console.log('$ kubectl get pods -o wide');
    console.log(pad('NAME', 23) + pad('READY', 8) + pad('STATUS', 19) + 'NODE');
    pods.forEach(function (p) {
      console.log(pad(p.name, 23) + pad(p.phase === 'Running' ? '1/1' : '0/1', 8) + pad(p.phase, 19) + p.node);
    });
  }

  function render() {
    document.getElementById('rv').textContent = desired;
    var ready = pods.filter(function (p) { return p.phase === 'Running'; }).length;
    document.getElementById('dep').innerHTML = 'Deployment <b>web</b> replicas: ' + desired;
    document.getElementById('rs').innerHTML = 'ReplicaSet <b>' + RS + '</b> desired ' + desired +
      ' · current ' + live().length + ' · ready ' + ready;
    document.getElementById('nodes').innerHTML = NODES.map(function (n) {
      return '<div class="node"><h4>' + n + '</h4>' + pods.filter(function (p) { return p.node === n; })
        .map(function (p) {
          return '<div class="pod ' + p.phase + '" title="' + p.phase + '"><span>' + p.name.slice(4) + '</span>' +
            (p.phase === 'Terminating' ? '' : '<button data-kill="' + p.name + '">✕</button>') + '</div>';
        }).join('') + '</div>';
    }).join('');
  }

  document.getElementById('nodes').addEventListener('click', function (e) {
    var n = e.target.getAttribute('data-kill');
    if (n) kill(n);
  });
  var rep = document.getElementById('rep');
  rep.addEventListener('input', function () { document.getElementById('rv').textContent = rep.value; });
  rep.addEventListener('change', function () { scale(Number(rep.value)); });
  document.getElementById('get').onclick = getPods;
  document.getElementById('reset').onclick = function () { console.log('--- reset ---'); reset(); };
  reset();
</script>`,
          explain: `
          <details>
            <summary>The problem: "3 copies" must stay true while things go wrong</summary>
            <p>In Compose, <code>--scale web=3</code> starts three containers and forgets about it. If one host dies, you have
            two. If you <code>docker rm</code> one, you have two. Nothing notices.</p>
            <p>A ReplicaSet notices, because "3" is stored as desired state and its controller re-checks the count every time a
            matching Pod changes. The fix is always the same move: create or delete Pod objects until the count matches.
            It never "repairs" a deleted Pod; it creates a new one.</p>
          </details>
          <details>
            <summary>Step by step: kill a pod, scale to 5, scale to 2</summary>
            <table>
              <tr><th>You do</th><th>Pods afterwards</th><th>Console (events)</th></tr>
              <tr><td>(load)</td><td>node-1 <code>x4k2p</code>, node-2 <code>9qzmt</code>, node-3 <code>lr8wn</code> - all Running</td><td><code>$ kubectl apply -f web.yaml</code><br><code>deployment.apps/web created   (3 pods running on node-1..3)</code></td></tr>
              <tr><td>click ✕ on <code>9qzmt</code></td><td><code>9qzmt</code> red/struck out (Terminating), then gone. New <code>h2v6c</code> on node-2 (it now has the fewest pods): yellow, then green</td><td><code>$ kubectl delete pod web-6d4b9c7f8d-9qzmt</code><br><code>pod "web-6d4b9c7f8d-9qzmt" deleted</code><br><code>[replicaset] web-6d4b9c7f8d: desired 3, current 2 -&gt; create 1</code><br><code>Normal  SuccessfulCreate  replicaset/web-6d4b9c7f8d  Created pod: web-6d4b9c7f8d-h2v6c</code><br><code>Normal  Scheduled  pod/web-6d4b9c7f8d-h2v6c  Successfully assigned to node-2</code><br><code>Normal  Started  pod/web-6d4b9c7f8d-h2v6c  Started container web</code></td></tr>
              <tr><td>drag slider to <b>5</b></td><td>+ <code>b7tdn</code> on node-1, + <code>m3fjq</code> on node-2 (ties go to the first node)</td><td><code>$ kubectl scale deployment web --replicas=5</code><br><code>Normal  ScalingReplicaSet  deployment/web  Scaled up replica set web-6d4b9c7f8d from 3 to 5</code><br><code>[replicaset] web-6d4b9c7f8d: desired 5, current 3 -&gt; create 2</code><br>+ SuccessfulCreate / Scheduled / Started for each</td></tr>
              <tr><td>drag slider to <b>2</b></td><td><code>m3fjq</code>, <code>b7tdn</code>, <code>h2v6c</code> terminate; <code>x4k2p</code> and <code>lr8wn</code> stay</td><td><code>Normal  ScalingReplicaSet  deployment/web  Scaled down replica set web-6d4b9c7f8d from 5 to 2</code><br><code>[replicaset] web-6d4b9c7f8d: desired 2, current 5 -&gt; delete 3</code><br><code>Normal  SuccessfulDelete  replicaset/web-6d4b9c7f8d  Deleted pod: web-6d4b9c7f8d-m3fjq</code> (then b7tdn, h2v6c)</td></tr>
            </table>
            <p>(The console pads the columns with extra spaces so they line up.) Why that
            scale-down order? Nodes 1 and 2 had 2 pods each, so their newest (<code>m3fjq</code>) goes first. Then node-1 is the
            most crowded, so <code>b7tdn</code>. Then it's a tie again, and the newest overall is <code>h2v6c</code>. The oldest
            pods, spread one per node, survive.</p>
          </details>
          <details>
            <summary>Key lines explained: the Deployment behind the simulator</summary>
            <pre><code class="language-yaml">apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3                  # ① the slider
  selector:
    matchLabels:
      app: web                 # ② which pods this Deployment (and its RS) owns
  template:                    # ③ blueprint; its hash becomes 6d4b9c7f8d
    metadata:
      labels:
        app: web               # ④ must satisfy ②
    spec:
      containers:
        - name: web
          image: shop/web:1.4</code></pre>
            <ol>
              <li><strong>①</strong> <code>replicas</code> is copied to the ReplicaSet. <code>kubectl scale</code> changes the same field.</li>
              <li><strong>②</strong> The ReplicaSet counts pods matching this selector (plus the <code>pod-template-hash</code> label it adds itself).</li>
              <li><strong>③</strong> Change anything in the template (image, env, labels) and you get a new hash, a new ReplicaSet, and a rollout.</li>
              <li><strong>④</strong> If ② and ④ disagree, the API server rejects the Deployment. That's this lesson's exercise.</li>
            </ol>
          </details>
          <details>
            <summary>Try this &amp; common mistakes</summary>
            <ul>
              <li>Kill two pods quickly on the same node: two replacements appear, spread over the emptiest nodes.</li>
              <li>Drag to <b>0</b>: every pod terminates but the Deployment and ReplicaSet stay. Scale back up and new names appear. <code>replicas: 0</code> is a common way to "pause" an app.</li>
              <li>Click <b>kubectl get pods</b> during a change to catch <code>ContainerCreating</code> and <code>Terminating</code> in the table.</li>
            </ul>
            <div class="warn">Deleting pods one by one never gets rid of a Deployment's pods: they come right back. Delete (or scale) the <strong>Deployment</strong> instead.</div>
          </details>
        `,
        },
        {
          title: 'The same thing on a real cluster',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ kubectl apply -f web.yaml
deployment.apps/web created

# the three layers, and how their names relate
$ kubectl get deploy,rs,pods -l app=web
NAME                  READY   UP-TO-DATE   AVAILABLE   AGE
deployment.apps/web   3/3     3            3           20s

NAME                             DESIRED   CURRENT   READY   AGE
replicaset.apps/web-6d4b9c7f8d   3         3         3       20s

NAME                       READY   STATUS    RESTARTS   AGE
pod/web-6d4b9c7f8d-9qzmt   1/1     Running   0          20s
pod/web-6d4b9c7f8d-lr8wn   1/1     Running   0          20s
pod/web-6d4b9c7f8d-x4k2p   1/1     Running   0          20s

# who owns a pod?
$ kubectl get pod web-6d4b9c7f8d-x4k2p -o jsonpath='{.metadata.ownerReferences[0].kind}/{.metadata.ownerReferences[0].name}'
ReplicaSet/web-6d4b9c7f8d

# self-healing
$ kubectl delete pod web-6d4b9c7f8d-9qzmt
pod "web-6d4b9c7f8d-9qzmt" deleted
$ kubectl get pods -l app=web
NAME                   READY   STATUS    RESTARTS   AGE
web-6d4b9c7f8d-h2v6c   1/1     Running   0          4s
web-6d4b9c7f8d-lr8wn   1/1     Running   0          1m
web-6d4b9c7f8d-x4k2p   1/1     Running   0          1m

# scaling
$ kubectl scale deployment web --replicas=5
deployment.apps/web scaled
$ kubectl get events --field-selector involvedObject.kind=ReplicaSet | tail -2
Normal   SuccessfulCreate   replicaset/web-6d4b9c7f8d   Created pod: web-6d4b9c7f8d-b7tdn
Normal   SuccessfulCreate   replicaset/web-6d4b9c7f8d   Created pod: web-6d4b9c7f8d-m3fjq

# a mismatched selector is rejected up front
$ kubectl apply -f broken.yaml
The Deployment "web" is invalid: spec.template.metadata.labels: Invalid value:
map[string]string{"app":"frontend"}: selector does not match template labels`,
        },
      ],
      quiz: [
        {
          q: 'Who creates the Pods of a Deployment?',
          options: ['The Deployment controller, directly', 'The ReplicaSet controller, for a ReplicaSet the Deployment created', 'kubectl', 'The scheduler'],
          answer: 1,
          why: 'Deployment &rarr; ReplicaSet &rarr; Pods. The Deployment controller manages ReplicaSets; each ReplicaSet controller keeps its pod count.',
        },
        {
          q: 'In <code>web-6d4b9c7f8d-x4k2p</code>, what is <code>6d4b9c7f8d</code>?',
          options: ['The node ID', 'The container ID', 'The pod-template-hash of its ReplicaSet', 'A random number per pod'],
          answer: 2,
          why: 'It\'s a hash of the pod template. Every pod of the same ReplicaSet shares it; <code>x4k2p</code> is the random per-pod suffix.',
        },
        {
          q: 'You delete one pod of a 3-replica Deployment. What happens?',
          options: [
            'The Deployment now has 2 replicas',
            'The same pod restarts with the same name',
            'A new pod with a new name (and IP) is created to get back to 3',
            'All 3 pods are recreated',
          ],
          answer: 2,
          why: 'The ReplicaSet sees current 2 &lt; desired 3 and creates one new pod.',
        },
        {
          q: 'Selector <code>app: web</code>, template labels <code>app: frontend</code>. What happens on apply?',
          options: [
            'Pods are created but never counted, so it creates pods forever',
            'The API server rejects it: selector does not match template labels',
            'Kubernetes fixes the labels for you',
            'It works; labels are optional',
          ],
          answer: 1,
          why: 'Validation requires the selector to match the template labels, precisely to prevent that "create forever" loop.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This Deployment would be rejected and isn't production-ready. Edit the manifest in the box below and click
        <b>Check</b>:</p>
        <ul>
          <li><code>apiVersion: apps/v1</code>, <code>kind: Deployment</code>, <code>replicas: 3</code></li>
          <li><code>selector.matchLabels</code> must be matched by the template labels</li>
          <li>use a specific image tag, not <code>latest</code> (e.g. <code>shop/web:1.4.2</code>)</li>
          <li>the container exposes <code>containerPort: 8080</code></li>
        </ul>`,
        hint: 'Either change the template label to <code>app: web</code> or the selector to <code>app: frontend</code>; they just have to agree. <code>ports</code> is a list: <code>- containerPort: 8080</code>.',
        starter: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: frontend
    spec:
      containers:
        - name: web
          image: shop/web:latest`, CHECKS_DEPLOY, 20),
        solution: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: shop/web:1.4.2
          ports:
            - containerPort: 8080`, CHECKS_DEPLOY, 20),
      },
    },

    // ------------------------------------------------------------------ rolling-updates
    {
      id: 'rolling-updates',
      section: 'Workloads & Networking',
      title: 'Rolling updates & rollbacks',
      explain: `
      <p>With Compose, <code>docker compose up -d</code> after changing the image <em>stops</em> the old container and starts a
      new one: a short outage, and if the new image is broken, you're down until you notice. A Deployment updates
      <strong>gradually</strong> instead: it starts new Pods, waits until they're <em>ready</em>, and only then removes old ones.</p>

      <h3>What triggers a rollout</h3>
      <p>Any change to <code>spec.template</code>: a new image (<code>kubectl set image deployment/web web=shop/web:v2</code>
      or editing the YAML), new env vars, new labels, resources... Changing only <code>replicas</code> is scaling, not a rollout.
      The Deployment creates a <strong>new ReplicaSet</strong> (new pod-template-hash) and moves Pods from the old one to the new one.</p>

      <h3>Two knobs: <code>maxSurge</code> and <code>maxUnavailable</code></h3>
      <pre><code class="language-yaml">spec:
  replicas: 4
  strategy:
    type: RollingUpdate          # default; the other option is Recreate (kill all, then start)
    rollingUpdate:
      maxSurge: 25%              # default: up to 25% EXTRA pods during the update
      maxUnavailable: 25%        # default: up to 25% of pods may be not-ready</code></pre>
      <ul>
        <li><strong>maxSurge</strong>: how many pods <em>above</em> <code>replicas</code> may exist. Percentages round
        <strong>up</strong>. 25% of 4 = 1 &rarr; at most 5 pods in total.</li>
        <li><strong>maxUnavailable</strong>: how many of the desired pods may be unavailable. Percentages round
        <strong>down</strong>. 25% of 4 = 1 &rarr; at least 3 must be available at all times.</li>
        <li>Both can't be 0 (the API rejects it: nothing could ever move). <code>maxSurge: 1, maxUnavailable: 0</code> is the
        classic "never go below full capacity" setting; <code>maxSurge: 0, maxUnavailable: 1</code> is "never use extra
        resources".</li>
      </ul>

      <h3>Readiness gates the whole thing</h3>
      <p>"Available" means the pod's <strong>readiness probe</strong> passes (and it stayed ready for <code>minReadySeconds</code>,
      default 0). If new pods never become ready, the rollout simply <strong>stops</strong>: old pods keep serving and you
      are never below the <code>maxUnavailable</code> limit. After <code>progressDeadlineSeconds</code> (default 600) the
      Deployment is marked <code>ProgressDeadlineExceeded</code>, but Kubernetes does <em>not</em> roll back by itself.</p>
      <div class="warn">No readiness probe = a pod counts as ready as soon as its containers start, even if the app needs 20
      seconds to warm up or crashes on the first request. Always add a readiness probe to anything behind a Service.</div>

      <h3>Watching, history and rollback</h3>
      <ul>
        <li><code>kubectl rollout status deployment/web</code> - waits and prints progress; exits non-zero on failure (great in CI).</li>
        <li><code>kubectl rollout history deployment/web</code> - revisions (kept as old ReplicaSets scaled to 0; <code>revisionHistoryLimit</code> default 10).
        Set the <code>kubernetes.io/change-cause</code> annotation to get a useful CHANGE-CAUSE column.</li>
        <li><code>kubectl rollout undo deployment/web</code> - roll back to the previous revision (<code>--to-revision=N</code> for a specific one).
        A rollback is just another rolling update, to the old template.</li>
        <li><code>kubectl rollout restart deployment/web</code> - replace every pod with the same template (e.g. to pick up a changed ConfigMap).</li>
        <li><code>kubectl rollout pause</code> / <code>resume</code> - batch several template changes into one rollout.</li>
      </ul>
      <div class="tip">Undo only restores the <em>pod template</em>. If your YAML in Git still says v2, the next
      <code>kubectl apply</code> rolls forward again. After an emergency undo, fix the file too.</div>
    `,
      examples: [
        {
          title: 'Simulator: step through a rolling update',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  .bar label { font-size: 13px; }
  .rs { background: #fff; border-radius: 9px; padding: 6px 8px; margin-bottom: 6px; border-left: 6px solid #9aa3b5; }
  .rs.v1 { border-left-color: #326ce5; }
  .rs.v2 { border-left-color: #1e8e3e; }
  .rs h4 { margin: 0 0 4px; font-size: 13px; font-weight: 600; }
  .rs h4 span { font-weight: normal; color: #5b6275; }
  .chip {
    display: inline-block; width: 46px; text-align: center; margin: 2px; padding: 4px 0; border-radius: 6px;
    font: 12px ui-monospace, monospace; color: #fff;
  }
  .chip.v1 { background: #326ce5; }
  .chip.v2 { background: #1e8e3e; }
  .chip.start { background: #fff; border: 2px dashed #9aa3b5; color: #5b6275; padding: 2px 0; }
  .chip.fail { background: #fff; border: 2px dashed #d93025; color: #d93025; padding: 2px 0; }
  .stats { display: flex; gap: 8px; flex-wrap: wrap; font-size: 13px; }
  .stats div { background: #fff; border-radius: 7px; padding: 4px 8px; }
  .msg { margin-top: 6px; background: #fff; border-radius: 8px; padding: 6px 10px; min-height: 20px; }
  .err { color: #b3261e; }
</style>

<div class="bar">
  <label>replicas <select id="r"><option>2</option><option>3</option><option selected>4</option><option>5</option><option>6</option><option>8</option><option>10</option></select></label>
  <label>maxSurge <select id="s"><option>0</option><option>1</option><option>2</option><option selected>25%</option><option>50%</option><option>100%</option></select></label>
  <label>maxUnavailable <select id="u"><option>0</option><option>1</option><option>2</option><option selected>25%</option><option>50%</option><option>100%</option></select></label>
  <label><input type="checkbox" id="fail"> v2 fails its readiness probe</label>
</div>
<div class="bar">
  <button id="step">Step ▶</button>
  <button id="undo">kubectl rollout undo</button>
  <button id="reset">Reset</button>
</div>
<div id="sets"></div>
<div class="stats" id="stats"></div>
<div class="msg" id="msg"></div>

<script>
  var HASH = { v1: 'web-5d7f8c9b4', v2: 'web-7b6c9d5f8' };
  var R, surge, unavail, sets, target, stepNo, done, invalid, rev;

  function $(id) { return document.getElementById(id); }
  function resolve(v, up) {
    if (v.indexOf('%') < 0) return Number(v);
    var x = R * parseInt(v, 10) / 100;
    return up ? Math.ceil(x) : Math.floor(x);
  }
  function mkPods(n, ready) {
    var a = [];
    for (var i = 0; i < n; i++) a.push({ ready: ready });
    return a;
  }
  function all() { return sets.v1.concat(sets.v2); }
  function readyCount(list) { return list.filter(function (p) { return p.ready; }).length; }

  function reset() {
    R = Number($('r').value);
    var s = $('s').value, u = $('u').value;
    surge = resolve(s, true);
    unavail = resolve(u, false);
    sets = { v1: mkPods(R, true), v2: [] };
    target = 'v2';
    stepNo = 0;
    done = false;
    invalid = false;
    rev = 2;
    console.log('--- replicas=' + R + ' maxSurge=' + s + ' (=' + surge + ') maxUnavailable=' + u + ' (=' + unavail + ') ---');
    if (s === '0' && u === '0') {
      invalid = true;
      console.log('The Deployment "web" is invalid: spec.strategy.rollingUpdate.maxUnavailable: ' +
        'Invalid value: may not be 0 when maxSurge is 0');
      msg('<span class="err">Rejected: with maxSurge 0 and maxUnavailable 0 no pod could ever be replaced.</span>');
      render();
      return;
    }
    if (surge === 0 && unavail === 0) {
      unavail = 1;
      console.log('(both round to 0 for ' + R + ' replicas -> the controller uses maxUnavailable = 1)');
    }
    console.log('$ kubectl set image deployment/web web=shop/web:v2');
    console.log('deployment.apps/web image updated');
    console.log('limits: at most ' + (R + surge) + ' pods total, at least ' + (R - unavail) + ' available');
    msg('Revision 2 (image v2) created. Press <b>Step ▶</b>: each step is one pass of the Deployment controller.');
    render();
  }

  function becomesReady(ver) { return !(ver === 'v2' && $('fail').checked); }

  function step() {
    if (done || invalid) return;
    stepNo++;
    var old = target === 'v2' ? 'v1' : 'v2';
    var acts = [];
    // (a) starting pods whose readiness probe passes become Ready
    var nowReady = 0;
    ['v1', 'v2'].forEach(function (v) {
      sets[v].forEach(function (p) {
        if (!p.ready && becomesReady(v)) { p.ready = true; nowReady++; }
      });
    });
    if (nowReady) acts.push(nowReady + ' pod(s) became Ready');
    // (b) scale up the new ReplicaSet, but never above replicas + maxSurge in total
    var up = Math.min(R - sets[target].length, R + surge - all().length);
    if (up > 0) {
      sets[target] = sets[target].concat(mkPods(up, false));
      acts.push('scale up ' + HASH[target] + ' (' + target + ') to ' + sets[target].length);
    }
    // (c) scale down the old ReplicaSet: unready old pods first (they serve nobody),
    //     then ready ones, but never below replicas - maxUnavailable available
    var before = sets[old].length;
    sets[old] = sets[old].filter(function (p) { return p.ready; });
    var canRemove = readyCount(all()) - (R - unavail);
    var down = Math.max(0, Math.min(sets[old].length, canRemove));
    sets[old] = sets[old].slice(0, sets[old].length - down);
    if (sets[old].length !== before) {
      acts.push('scale down ' + HASH[old] + ' (' + old + ') to ' + sets[old].length);
    }

    var line = '[step ' + stepNo + '] ' + (acts.length ? acts.join('; ') : 'nothing can change') +
      ' | v1 ' + readyCount(sets.v1) + '/' + sets.v1.length + '  v2 ' + readyCount(sets.v2) + '/' + sets.v2.length +
      ' | available ' + readyCount(all()) + '/' + R + ', total ' + all().length;
    console.log(line);

    if (sets[target].length === R && readyCount(sets[target]) === R && sets[old].length === 0) {
      done = true;
      console.log('deployment "web" successfully rolled out');
      msg('Done: all ' + R + ' pods run ' + target + '. The old ReplicaSet ' + HASH[old] + ' stays at 0 pods, kept for rollback.');
    } else if (!acts.length) {
      var upd = sets[target].length;
      console.log('Waiting for deployment "web" rollout to finish: ' + (upd < R
        ? upd + ' out of ' + R + ' new replicas have been updated...'
        : readyCount(sets[target]) + ' of ' + upd + ' updated replicas are available...'));
      msg('<span class="err">Stuck:</span> new pods never become Ready, so no more old pods may go. ' +
        readyCount(all()) + ' old pods keep serving traffic. Try <b>kubectl rollout undo</b>.');
    } else {
      msg('Step ' + stepNo + ': ' + acts.join('; ') + '.');
    }
    render();
  }

  function undo() {
    if (invalid) return;
    var prev = target === 'v2' ? 'v1' : 'v2';
    rev++;
    console.log('$ kubectl rollout undo deployment/web');
    console.log('deployment.apps/web rolled back   (revision ' + rev + ' = template of ' + prev + ')');
    target = prev;
    done = false;
    stepNo = 0;
    msg('Rolling back is just another rolling update, towards ' + prev + '. Press <b>Step ▶</b>.');
    render();
  }

  function msg(h) { $('msg').innerHTML = h; }

  function render() {
    var html = '';
    ['v1', 'v2'].forEach(function (v) {
      var list = sets ? sets[v] : [];
      html += '<div class="rs ' + (list.length ? v : '') + '"><h4>ReplicaSet ' + HASH[v] + ' <span>image shop/web:' + v +
        (target === v ? ' · target' : '') + ' · ' + readyCount(list) + '/' + list.length + ' ready</span></h4>';
      list.forEach(function (p) {
        var cls = p.ready ? v : (becomesReady(v) ? 'start' : 'fail');
        html += '<span class="chip ' + cls + '">' + (p.ready ? v : v + ' 0/1') + '</span>';
      });
      if (!list.length) html += '<span style="color:#5b6275;font-size:12px">0 pods</span>';
      html += '</div>';
    });
    $('sets').innerHTML = html;
    var total = all().length, avail = readyCount(all());
    $('stats').innerHTML = invalid ? '' :
      '<div>total pods <b>' + total + '</b> (max ' + (R + surge) + ')</div>' +
      '<div>available <b>' + avail + '</b> (min ' + (R - unavail) + ')</div>' +
      '<div>step <b>' + stepNo + '</b></div>';
    $('step').disabled = done || invalid;
    $('undo').disabled = invalid || stepNo === 0 && target === 'v2' && !sets.v2.length;
  }

  ['r', 's', 'u', 'fail'].forEach(function (id) { $(id).addEventListener('change', reset); });
  $('step').onclick = step;
  $('undo').onclick = undo;
  $('reset').onclick = reset;
  reset();
</script>`,
          explain: `
          <details>
            <summary>The problem: replacing every pod without an outage</summary>
            <p>You have 4 pods of v1 serving users and want v2. Two naive options both hurt:</p>
            <ul>
              <li><strong>Stop all, start all</strong> (<code>strategy: Recreate</code>, or <code>docker compose up -d</code>): a gap with 0 pods, and if v2 is broken you're fully down.</li>
              <li><strong>Start 4 new, then stop 4 old</strong>: needs double the capacity for a while.</li>
            </ul>
            <p>A rolling update is the middle ground: a few new pods at a time, bounded by <code>maxSurge</code> (extra pods
            allowed) and <code>maxUnavailable</code> (missing pods allowed). And old pods are only removed when enough pods are
            <em>ready</em>, so a broken v2 can't take you down.</p>
          </details>
          <details>
            <summary>Step by step: defaults (replicas 4, maxSurge 25%, maxUnavailable 25%)</summary>
            <p>On load the console shows the limits: <code>limits: at most 5 pods total, at least 3 available</code>
            (25% of 4 = 1; surge rounds up, unavailable rounds down). Each <b>Step ▶</b> is one controller pass: (a) starting pods
            that pass readiness become Ready, (b) scale up the new ReplicaSet within the surge limit, (c) scale down the old one
            within the availability limit.</p>
            <table>
              <tr><th>Step</th><th>v1 ReplicaSet</th><th>v2 ReplicaSet</th><th>Console</th></tr>
              <tr><td>load</td><td>4 ready</td><td>0</td><td><code>deployment.apps/web image updated</code><br><code>limits: at most 5 pods total, at least 3 available</code></td></tr>
              <tr><td>1</td><td>3 ready</td><td>1 starting (dashed)</td><td><code>[step 1] scale up web-7b6c9d5f8 (v2) to 1; scale down web-5d7f8c9b4 (v1) to 3 | v1 3/3  v2 0/1 | available 3/4, total 4</code></td></tr>
              <tr><td>2</td><td>2 ready</td><td>1 ready + 1 starting</td><td><code>[step 2] 1 pod(s) became Ready; scale up web-7b6c9d5f8 (v2) to 2; scale down web-5d7f8c9b4 (v1) to 2 | v1 2/2  v2 1/2 | available 3/4, total 4</code></td></tr>
              <tr><td>3</td><td>1 ready</td><td>2 ready + 1 starting</td><td><code>[step 3] 1 pod(s) became Ready; scale up web-7b6c9d5f8 (v2) to 3; scale down web-5d7f8c9b4 (v1) to 1 | v1 1/1  v2 2/3 | available 3/4, total 4</code></td></tr>
              <tr><td>4</td><td>0</td><td>3 ready + 1 starting</td><td><code>[step 4] 1 pod(s) became Ready; scale up web-7b6c9d5f8 (v2) to 4; scale down web-5d7f8c9b4 (v1) to 0 | v1 0/0  v2 3/4 | available 3/4, total 4</code></td></tr>
              <tr><td>5</td><td>0 (kept for rollback)</td><td>4 ready</td><td><code>[step 5] 1 pod(s) became Ready | v1 0/0  v2 4/4 | available 4/4, total 4</code><br><code>deployment "web" successfully rolled out</code></td></tr>
            </table>
            <p>Why does step 1 already remove a v1 pod? The new pod pushes the total to 5 (the surge limit). 4 pods are still ready,
            and only 3 are required, so one old pod may go right away. Available never drops below 3, total never exceeds 5.</p>
          </details>
          <details>
            <summary>Same defaults, but tick "v2 fails its readiness probe"</summary>
            <table>
              <tr><th>Step</th><th>v1</th><th>v2</th><th>Console</th></tr>
              <tr><td>1</td><td>3 ready</td><td>1 not ready (red dashed)</td><td><code>[step 1] scale up web-7b6c9d5f8 (v2) to 1; scale down web-5d7f8c9b4 (v1) to 3 | v1 3/3  v2 0/1 | available 3/4, total 4</code></td></tr>
              <tr><td>2</td><td>3 ready</td><td>2 not ready</td><td><code>[step 2] scale up web-7b6c9d5f8 (v2) to 2 | v1 3/3  v2 0/2 | available 3/4, total 5</code></td></tr>
              <tr><td>3</td><td>3 ready</td><td>2 not ready</td><td><code>[step 3] nothing can change | v1 3/3  v2 0/2 | available 3/4, total 5</code><br><code>Waiting for deployment "web" rollout to finish: 2 out of 4 new replicas have been updated...</code></td></tr>
            </table>
            <p>The rollout is stuck, but users are fine: 3 v1 pods still serve. Now click <b>kubectl rollout undo</b> and step again:</p>
            <table>
              <tr><th>Step</th><th>v1 (now the target)</th><th>v2</th><th>Console</th></tr>
              <tr><td>click</td><td>3 ready</td><td>2 not ready</td><td><code>$ kubectl rollout undo deployment/web</code><br><code>deployment.apps/web rolled back   (revision 3 = template of v1)</code></td></tr>
              <tr><td>1</td><td>3 ready</td><td>0</td><td><code>[step 1] scale down web-7b6c9d5f8 (v2) to 0 | v1 3/3  v2 0/0 | available 3/4, total 3</code></td></tr>
              <tr><td>2</td><td>3 ready + 1 starting</td><td>0</td><td><code>[step 2] scale up web-5d7f8c9b4 (v1) to 4 | v1 3/4  v2 0/0 | available 3/4, total 4</code></td></tr>
              <tr><td>3</td><td>4 ready</td><td>0</td><td><code>[step 3] 1 pod(s) became Ready | v1 4/4  v2 0/0 | available 4/4, total 4</code><br><code>deployment "web" successfully rolled out</code></td></tr>
            </table>
            <p>Unready old pods can be removed freely (they serve nobody), which is why step 1 drops both v2 pods at once.
            The undo creates revision 3, which reuses the v1 ReplicaSet (same template, same hash).</p>
          </details>
          <details>
            <summary>Try this &amp; common mistakes</summary>
            <ul>
              <li>Set <b>maxSurge 1, maxUnavailable 0</b>: total goes up to 5 but available never drops below 4. Slower, but full capacity the whole time.</li>
              <li>Set <b>maxSurge 0, maxUnavailable 1</b>: never more than 4 pods (no extra resources needed), capacity dips to 3.</li>
              <li>Set <b>maxSurge 100%</b>: all 4 new pods start at once (blue/green-like), old ones go as the new ones get ready.</li>
              <li>Set both to <b>0</b>: the API rejects it, as the console shows.</li>
              <li>Set <b>replicas 2</b> with <b>maxSurge 0</b> and <b>maxUnavailable 25%</b>: both round to 0, so the controller quietly uses maxUnavailable = 1.</li>
            </ul>
            <div class="warn">A rollout that "succeeds" with a broken app usually means the readiness probe checks too little
            (or doesn't exist). Make it hit an endpoint that proves the app can actually serve.</div>
          </details>
        `,
        },
        {
          title: 'Zero-downtime Deployment settings',
          runnable: false,
          lang: 'yaml',
          code: String.raw`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  annotations:
    kubernetes.io/change-cause: "v2: new checkout page"   # shows in rollout history
spec:
  replicas: 4
  revisionHistoryLimit: 5          # old ReplicaSets kept for undo (default 10)
  progressDeadlineSeconds: 300     # mark the rollout failed after 5 min (default 600)
  minReadySeconds: 5               # ready for 5s before it counts as available
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1                  # at most 5 pods during the update
      maxUnavailable: 0            # never below 4 available
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: shop/web:v2
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:          # gates traffic AND rollout progress
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 5
            failureThreshold: 3`,
        },
        {
          title: 'kubectl rollout: status, history, undo',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ kubectl set image deployment/web web=shop/web:v2
deployment.apps/web image updated
$ kubectl annotate deployment/web kubernetes.io/change-cause="v2: new checkout page"

$ kubectl rollout status deployment/web
Waiting for deployment "web" rollout to finish: 1 out of 4 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 2 out of 4 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 1 old replicas are pending termination...
deployment "web" successfully rolled out

# two ReplicaSets: the old one is kept at 0 for rollback
$ kubectl get rs -l app=web
NAME            DESIRED   CURRENT   READY   AGE
web-5d7f8c9b4   0         0         0       2d
web-7b6c9d5f8   4         4         4       40s

$ kubectl rollout history deployment/web
deployment.apps/web
REVISION  CHANGE-CAUSE
1         v1: initial release
2         v2: new checkout page

# v2 is bad -> back to the previous revision
$ kubectl rollout undo deployment/web
deployment.apps/web rolled back
$ kubectl rollout history deployment/web
REVISION  CHANGE-CAUSE
2         v2: new checkout page
3         v1: initial release          # revision 1 became revision 3

# a stuck rollout (new pods never Ready) fails the CI step instead of hanging forever
$ kubectl rollout status deployment/web --timeout=2m
Waiting for deployment "web" rollout to finish: 2 out of 4 new replicas have been updated...
error: timed out waiting for the condition`,
        },
      ],
      quiz: [
        {
          q: 'replicas: 4 with the defaults (25% / 25%). What are the limits during a rollout?',
          options: ['At most 4 pods, at least 4 available', 'At most 5 pods, at least 3 available', 'At most 6 pods, at least 2 available', 'At most 8 pods, at least 0 available'],
          answer: 1,
          why: 'maxSurge 25% of 4 = 1 (rounded up) &rarr; 5 total. maxUnavailable 25% of 4 = 1 (rounded down) &rarr; 3 must stay available.',
        },
        {
          q: 'The new pods never pass their readiness probe. What does Kubernetes do?',
          options: [
            'Rolls back automatically',
            'Deletes all old pods anyway after 10 minutes',
            'Stops progressing; old pods keep serving; after progressDeadlineSeconds it reports ProgressDeadlineExceeded',
            'Restarts the node',
          ],
          answer: 2,
          why: 'It never removes old pods below the availability limit, so the rollout stalls safely. It only reports failure; undo is up to you (or your CD tool).',
        },
        {
          q: 'Which change starts a new rollout (a new ReplicaSet)?',
          options: ['<code>replicas: 4</code> &rarr; <code>6</code>', 'Changing the container image in the pod template', 'Adding a label to the Deployment\'s own metadata', 'Running <code>kubectl get deploy</code>'],
          answer: 1,
          why: 'Only changes to <code>spec.template</code> create a new pod-template-hash and a new ReplicaSet. Replicas is plain scaling.',
        },
        {
          q: 'You want full capacity at every moment of a rollout. Which setting?',
          options: ['maxSurge: 0, maxUnavailable: 1', 'maxSurge: 1, maxUnavailable: 0', 'maxSurge: 0, maxUnavailable: 0', 'strategy: Recreate'],
          answer: 1,
          why: 'maxUnavailable 0 means never below replicas available; maxSurge 1 lets one extra pod start. Both 0 is rejected; Recreate has downtime.',
        },
        {
          q: 'What does <code>kubectl rollout undo deployment/web</code> actually do?',
          options: [
            'Restores the old pods from a snapshot',
            'Starts a rolling update back to the previous pod template (as a new revision)',
            'Deletes the Deployment and re-applies the last YAML',
            'Reverts your Git repository',
          ],
          answer: 1,
          why: 'It copies the previous revision\'s template back into the Deployment, which rolls out like any change and gets a new revision number.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Make this Deployment's updates zero-downtime. Edit the manifest in the box below and click <b>Check</b>:</p>
        <ul>
          <li><code>strategy.type: RollingUpdate</code></li>
          <li><code>maxUnavailable: 0</code> and <code>maxSurge</code> of at least 1 (a number or a percentage)</li>
          <li>a <code>readinessProbe</code> on the container using <code>httpGet</code> with path <code>/healthz</code> and port <code>8080</code> (or the port name <code>http</code>)</li>
          <li>the image pinned to <code>shop/web:v2</code></li>
        </ul>`,
        hint: '<code>strategy</code> sits under <code>spec</code> (next to <code>replicas</code>), with <code>rollingUpdate:</code> nested inside. <code>readinessProbe</code> goes inside the container item, at the same level as <code>image</code>.',
        starter: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 4
  strategy:
    type: Recreate
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: shop/web:latest
          ports:
            - name: http
              containerPort: 8080`, CHECKS_ROLLING, 26),
        solution: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
  replicas: 4
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
        - name: web
          image: shop/web:v2
          ports:
            - name: http
              containerPort: 8080
          readinessProbe:
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 5`, CHECKS_ROLLING, 26),
      },
    },

    // ------------------------------------------------------------------ services
    {
      id: 'services',
      section: 'Workloads & Networking',
      title: 'Services',
      explain: `
      <p>Pods come and go, and every new Pod gets a new IP. So how does the frontend find the API? In Compose you just used
      the service name (<code>http://api:8080</code>) and Docker's DNS pointed it at the container. Kubernetes has the same idea,
      made sturdier: a <strong>Service</strong>.</p>

      <h3>What a Service gives you</h3>
      <ul>
        <li>A <strong>stable virtual IP</strong> (the ClusterIP, e.g. <code>10.96.12.34</code>) that never changes while the Service exists.</li>
        <li>A <strong>DNS name</strong>: <code>web</code> in the same namespace, <code>web.shop.svc.cluster.local</code> everywhere.</li>
        <li><strong>Load balancing</strong> across all <em>ready</em> Pods that match its <code>selector</code>.</li>
      </ul>

      <h3>How it finds Pods: selector &rarr; EndpointSlices</h3>
      <p>The Service's <code>spec.selector</code> (e.g. <code>app: web</code>) is a label query. The EndpointSlice controller
      keeps <strong>EndpointSlice</strong> objects listing the IP:port of every matching Pod, with a <code>ready</code> condition.
      Pods that fail their readiness probe stay listed but get no traffic. (The older <code>Endpoints</code> API is deprecated
      since 1.33; use <code>kubectl get endpointslices</code>.)</p>
      <p>On every node, <strong>kube-proxy</strong> watches Services and EndpointSlices and programs the kernel (iptables or
      nftables rules): "packets to <code>10.96.12.34:80</code> &rarr; pick one of these pod IPs on port 8080". The ClusterIP is
      not a real interface: nothing "listens" there, the rules rewrite the destination.</p>

      <h3>Three ports, three meanings</h3>
      <pre><code class="language-yaml">ports:
  - port: 80           # the Service's port: clients call web:80
    targetPort: 8080   # the container's port (a number, or a named containerPort like "http")
    nodePort: 30080    # only for NodePort/LoadBalancer: opened on EVERY node (30000-32767)</code></pre>
      <p>Compose's <code>ports: ["8080:80"]</code> is <em>host:container</em>. In a Service, <code>port</code> is what clients use
      and <code>targetPort</code> is the container side. If you leave out <code>targetPort</code>, it equals <code>port</code>.</p>

      <h3>Service types</h3>
      <table>
        <tr><th>Type</th><th>Reachable from</th><th>Typical use</th></tr>
        <tr><td><code>ClusterIP</code> (default)</td><td>inside the cluster only</td><td>app-to-app traffic (API, database, cache)</td></tr>
        <tr><td><code>NodePort</code></td><td>every node's IP on <code>nodePort</code></td><td>quick external access, bare-metal, kind with port mappings</td></tr>
        <tr><td><code>LoadBalancer</code></td><td>an external IP from the cloud (or MetalLB / cloud-provider-kind locally)</td><td>exposing one service directly to the internet</td></tr>
        <tr><td>Headless (<code>clusterIP: None</code>)</td><td>DNS returns the Pod IPs directly, no virtual IP</td><td>StatefulSets (<code>db-0.db</code>), clients that do their own balancing</td></tr>
        <tr><td><code>ExternalName</code></td><td>DNS CNAME to an outside name</td><td>giving an external database an in-cluster name</td></tr>
      </table>
      <p>Each type builds on the previous one: a LoadBalancer Service also has a NodePort and a ClusterIP.</p>
      <div class="tip">For local testing you don't need any external type: <code>kubectl port-forward svc/web 8080:80</code>
      tunnels your laptop's port 8080 to the Service.</div>
      <div class="warn">The #1 Service bug: the selector doesn't match the Pod labels (or the targetPort isn't the port the
      app listens on). The Service is created happily, but has no endpoints (or connections are refused).
      Check with <code>kubectl get endpointslices -l kubernetes.io/service-name=web</code>.</div>
    `,
      examples: [
        {
          title: 'Simulator: a Service load-balancing across changing pods',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  .bar label { font-size: 13px; }
  .svc { background: #fff; border: 2px solid #7b61ff; border-radius: 10px; padding: 6px 10px; margin-bottom: 6px; }
  .svc code { font-size: 12px; }
  .eps { font: 12px ui-monospace, monospace; margin-top: 4px; }
  .ep { display: inline-block; margin: 2px 4px 0 0; padding: 1px 6px; border-radius: 5px; background: #e6f6ec; }
  .ep.no { background: #eee; color: #888; text-decoration: line-through; }
  .pods { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .pod { background: #fff; border: 2px solid #d3d9e6; border-radius: 9px; padding: 5px 6px; font-size: 12px; transition: all .25s; }
  .pod.in { border-color: #1e8e3e; }
  .pod.hit { box-shadow: 0 0 0 4px #ffd166; }
  .pod.new { border-style: dashed; }
  .pod b { font: 12px ui-monospace, monospace; display: block; }
  .pod code { font-size: 11px; }
  .pod button { font-size: 11px; padding: 1px 5px; margin: 3px 2px 0 0; }
  .tag { display: inline-block; padding: 0 5px; border-radius: 4px; background: #eef1f7; font: 11px ui-monospace, monospace; }
  .ready { color: #137333; } .notready { color: #b3261e; }
</style>

<div class="bar">
  <button id="send">Send 3 requests</button>
  <label>type <select id="type"><option>ClusterIP</option><option>NodePort</option><option>LoadBalancer</option></select></label>
  <label>targetPort <select id="tp"><option>8080</option><option>80</option></select></label>
  <button id="reset">Reset</button>
</div>
<div class="svc">
  <b>Service web</b> <span id="addr"></span><br>
  <code>selector: app=web</code> · <code>port: 80</code> &rarr; <code id="tpl">targetPort: 8080</code> (containers listen on 8080)
  <div class="eps" id="eps"></div>
</div>
<div class="pods" id="pods"></div>

<script>
  var NEW_IPS = ['10.244.2.14', '10.244.1.17', '10.244.2.21', '10.244.1.26', '10.244.2.30', '10.244.1.33'];
  var NEW_SUFFIX = ['m3fjq', 'p8wxz', 'c5rkg', 't9vhl', 'z2nmd', 'k7wqa'];
  var pods, rr, made, lastEps;

  function reset() {
    pods = [
      pod('web-7d9f8c6b5-x4k2p', '10.244.1.5', 'web', 'web'),
      pod('web-7d9f8c6b5-9qzmt', '10.244.2.8', 'web', 'web'),
      pod('web-7d9f8c6b5-lr8wn', '10.244.1.9', 'web', 'web'),
      pod('api-5c8d7b9f6-h2v6c', '10.244.2.3', 'api', 'api'),
    ];
    rr = 0;
    made = 0;
    lastEps = null;
    document.getElementById('type').value = 'ClusterIP';
    document.getElementById('tp').value = '8080';
    render();
  }
  function pod(name, ip, app, owner) { return { name: name, ip: ip, app: app, owner: owner, ready: true, isNew: false }; }

  function endpoints() { return pods.filter(function (p) { return p.app === 'web'; }); }
  function readyEps() { return endpoints().filter(function (p) { return p.ready; }); }
  function tp() { return document.getElementById('tp').value; }

  function send() {
    var type = document.getElementById('type').value;
    for (var i = 0; i < 3; i++) {
      var eps = readyEps();
      var path = type === 'ClusterIP' ? 'web.default.svc.cluster.local -> 10.96.12.34:80'
        : type === 'NodePort' ? '172.18.0.3:30080 (node-1) -> 10.96.12.34:80'
        : '203.0.113.10:80 (cloud LB) -> node-1:30080 -> 10.96.12.34:80';
      console.log('$ curl http://' + (type === 'ClusterIP' ? 'web' : type === 'NodePort' ? '172.18.0.3:30080' : '203.0.113.10') + '/');
      if (!eps.length) {
        console.log('  ' + path + ' -> no ready endpoints: connection refused');
        continue;
      }
      var p = eps[rr++ % eps.length];
      if (tp() !== '8080') {
        console.log('  ' + path + ' -> ' + p.ip + ':' + tp() + ' connection refused (nothing listens on ' + tp() + ')');
      } else {
        console.log('  ' + path + ' -> ' + p.ip + ':8080 (' + p.name + ') 200 OK');
      }
      flash(p.name);
    }
  }
  function flash(name) {
    var el = document.querySelector('[data-pod="' + name + '"]');
    if (!el) return;
    el.classList.add('hit');
    setTimeout(function () { el.classList.remove('hit'); }, 450);
  }

  function act(name, what) {
    var p = pods.filter(function (x) { return x.name === name; })[0];
    if (!p) return;
    if (what === 'label') {
      // web pods toggle web <-> debug, the api pod toggles api <-> web
      var to = p.owner === 'web' ? (p.app === 'web' ? 'debug' : 'web') : (p.app === 'api' ? 'web' : 'api');
      console.log('$ kubectl label pod ' + p.name + ' app=' + to + ' --overwrite');
      p.app = to;
    } else if (what === 'ready') {
      p.ready = !p.ready;
      console.log('[kubelet] ' + p.name + ' readiness probe ' + (p.ready ? 'passing -> Ready' : 'failing -> NotReady'));
    } else if (what === 'kill') {
      console.log('$ kubectl delete pod ' + p.name);
      pods = pods.filter(function (x) { return x !== p; });
      var hash = p.owner === 'web' ? 'web-7d9f8c6b5-' : 'api-5c8d7b9f6-';
      var fresh = pod(hash + NEW_SUFFIX[made % NEW_SUFFIX.length], NEW_IPS[made % NEW_IPS.length], p.owner, p.owner);
      made++;
      fresh.ready = false;
      fresh.isNew = true;
      pods.push(fresh);
      console.log('[replicaset] replacement ' + fresh.name + ' created, IP ' + fresh.ip + ' (not ready yet)');
      setTimeout(function () {
        if (pods.indexOf(fresh) < 0) return;
        fresh.ready = true;
        fresh.isNew = false;
        console.log('[kubelet] ' + fresh.name + ' readiness probe passing -> Ready');
        render();
      }, 1200);
    }
    render();
  }

  function render() {
    var type = document.getElementById('type').value;
    document.getElementById('addr').innerHTML = type === 'ClusterIP'
      ? 'ClusterIP <code>10.96.12.34</code> · DNS <code>web.default.svc.cluster.local</code>'
      : type === 'NodePort'
        ? 'ClusterIP <code>10.96.12.34</code> + <code>nodePort: 30080</code> on every node'
        : 'EXTERNAL-IP <code>203.0.113.10</code> &rarr; nodePort 30080 &rarr; ClusterIP <code>10.96.12.34</code>';
    document.getElementById('tpl').textContent = 'targetPort: ' + tp();
    var eps = endpoints();
    document.getElementById('eps').innerHTML = 'EndpointSlice web-abc12: ' + (eps.length
      ? eps.map(function (p) {
        return '<span class="ep' + (p.ready ? '' : ' no') + '">' + p.ip + ':' + tp() + (p.ready ? '' : ' (not ready)') + '</span>';
      }).join('')
      : '<span class="ep no">(empty - no pod matches app=web)</span>');
    document.getElementById('pods').innerHTML = pods.map(function (p) {
      return '<div class="pod' + (p.app === 'web' ? ' in' : '') + (p.isNew ? ' new' : '') + '" data-pod="' + p.name + '">' +
        '<b>' + p.name + '</b><code>' + p.ip + '</code><br><span class="tag">app=' + p.app + '</span> ' +
        '<span class="' + (p.ready ? 'ready' : 'notready') + '">' + (p.ready ? 'Ready' : 'NotReady') + '</span><br>' +
        '<button data-a="label" data-n="' + p.name + '">label</button>' +
        '<button data-a="ready" data-n="' + p.name + '">ready?</button>' +
        '<button data-a="kill" data-n="' + p.name + '">kill</button></div>';
    }).join('');
    var sig = readyEps().map(function (p) { return p.ip; }).join(', ');
    if (sig !== lastEps) {
      if (lastEps !== null) rr = 0;
      console.log('EndpointSlice web: ready endpoints [' + sig + ']');
      lastEps = sig;
    }
  }

  document.getElementById('pods').addEventListener('click', function (e) {
    var a = e.target.getAttribute('data-a');
    if (a) act(e.target.getAttribute('data-n'), a);
  });
  document.getElementById('send').onclick = send;
  document.getElementById('type').onchange = function () {
    console.log('$ kubectl patch svc web -p \'{"spec":{"type":"' + this.value + '"}}\'');
    render();
  };
  document.getElementById('tp').onchange = function () {
    console.log('$ kubectl patch svc web ... targetPort: ' + this.value);
    render();
  };
  document.getElementById('reset').onclick = function () { console.log('--- reset ---'); reset(); };
  reset();
</script>`,
          explain: `
          <details>
            <summary>The problem: clients can't chase pod IPs</summary>
            <p>Pod IPs change on every replacement (you saw that in the Pods lesson). If the frontend were configured with
            <code>10.244.1.5</code>, it would break at the next rollout. It also shouldn't send traffic to a pod that is still
            starting, or one whose readiness probe is failing.</p>
            <p>A Service fixes both: clients use one stable name/IP, and the list behind it (the EndpointSlice) is rebuilt
            automatically from the selector and each pod's readiness.</p>
          </details>
          <details>
            <summary>Step by step: send, un-ready, relabel, kill</summary>
            <table>
              <tr><th>You do</th><th>Ready endpoints</th><th>Console</th></tr>
              <tr><td>(load)</td><td><code>10.244.1.5, 10.244.2.8, 10.244.1.9</code> (the api pod doesn't match <code>app=web</code>)</td><td><code>EndpointSlice web: ready endpoints [10.244.1.5, 10.244.2.8, 10.244.1.9]</code></td></tr>
              <tr><td><b>Send 3 requests</b></td><td>same</td><td><code>$ curl http://web/</code><br><code>web.default.svc.cluster.local -&gt; 10.96.12.34:80 -&gt; 10.244.1.5:8080 (web-7d9f8c6b5-x4k2p) 200 OK</code><br>then <code>10.244.2.8</code> (9qzmt), then <code>10.244.1.9</code> (lr8wn)</td></tr>
              <tr><td><b>ready?</b> on <code>9qzmt</code></td><td><code>10.244.1.5, 10.244.1.9</code> (9qzmt shown struck out: listed, not ready)</td><td><code>[kubelet] web-7d9f8c6b5-9qzmt readiness probe failing -&gt; NotReady</code><br><code>EndpointSlice web: ready endpoints [10.244.1.5, 10.244.1.9]</code></td></tr>
              <tr><td><b>Send 3 requests</b></td><td>same</td><td>x4k2p, lr8wn, x4k2p (the round-robin restarts when the list changes)</td></tr>
              <tr><td><b>label</b> on <code>lr8wn</code></td><td><code>10.244.1.5</code> only</td><td><code>$ kubectl label pod web-7d9f8c6b5-lr8wn app=debug --overwrite</code><br><code>EndpointSlice web: ready endpoints [10.244.1.5]</code></td></tr>
              <tr><td><b>kill</b> on <code>x4k2p</code></td><td>empty for a moment, then <code>10.244.2.14</code></td><td><code>$ kubectl delete pod web-7d9f8c6b5-x4k2p</code><br><code>[replicaset] replacement web-7d9f8c6b5-m3fjq created, IP 10.244.2.14 (not ready yet)</code><br><code>EndpointSlice web: ready endpoints []</code><br>about 1s later: <code>[kubelet] web-7d9f8c6b5-m3fjq readiness probe passing -&gt; Ready</code><br><code>EndpointSlice web: ready endpoints [10.244.2.14]</code></td></tr>
            </table>
            <p>If you <b>Send</b> while the list is empty: <code>-&gt; no ready endpoints: connection refused</code>. The Service
            still exists and still has its IP; it just has nowhere to send traffic.</p>
          </details>
          <details>
            <summary>Key lines explained: the Service behind the simulator</summary>
            <pre><code class="language-yaml">apiVersion: v1
kind: Service
metadata:
  name: web                 # ① DNS name: web / web.default.svc.cluster.local
spec:
  type: ClusterIP           # ② try NodePort / LoadBalancer in the dropdown
  selector:
    app: web                # ③ live label query -&gt; EndpointSlice
  ports:
    - port: 80              # ④ what clients call
      targetPort: 8080      # ⑤ where the container listens (dropdown)
      # nodePort: 30080     #    added for NodePort/LoadBalancer</code></pre>
            <ol>
              <li><strong>①</strong> CoreDNS answers <code>web</code> with the ClusterIP <code>10.96.12.34</code>.</li>
              <li><strong>②</strong> NodePort adds port 30080 on every node (the console shows <code>172.18.0.3:30080 (node-1) -&gt; 10.96.12.34:80</code>); LoadBalancer adds an external IP in front of that.</li>
              <li><strong>③</strong> Relabeling a pod to <code>app=debug</code> removes it from the endpoints (its ReplicaSet would also replace it on a real cluster).</li>
              <li><strong>④</strong> Clients always use port 80, whatever the containers use.</li>
              <li><strong>⑤</strong> Set targetPort to <b>80</b>: the endpoints are there, but every request gets <code>connection refused (nothing listens on 80)</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: "the Service exists, so it works"</summary>
            <p>A Service with a wrong selector or targetPort is perfectly valid YAML. Debug in this order:</p>
            <pre><code class="language-bash">kubectl get endpointslices -l kubernetes.io/service-name=web   # empty? selector/labels/readiness
kubectl get pods -l app=web --show-labels                        # do the labels really match?
kubectl describe pod web-...                                     # readiness probe failing?
kubectl run tmp --rm -it --image=busybox:1.37 --restart=Never -- wget -qO- web:80   # try from inside</code></pre>
            <div class="tip">Real kube-proxy picks a backend randomly per connection (iptables/nftables), not strictly
            round-robin like the simulator. And it balances <em>connections</em>, not requests: one long-lived HTTP/2 or gRPC
            connection sticks to one pod.</div>
          </details>
        `,
        },
        {
          title: 'ClusterIP, NodePort and headless Services',
          runnable: false,
          lang: 'yaml',
          code: String.raw`# internal: other pods call http://web (or web.shop.svc.cluster.local)
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: shop
spec:
  selector:
    app: web
  ports:
    - name: http
      port: 80
      targetPort: http        # the containerPort named "http" (8080) - survives port changes
---
# external on every node's IP, port 30080 (with kind: map it via extraPortMappings)
apiVersion: v1
kind: Service
metadata:
  name: web-public
  namespace: shop
spec:
  type: NodePort
  selector:
    app: web
  ports:
    - port: 80
      targetPort: 8080
      nodePort: 30080         # optional; must be 30000-32767, else one is picked
---
# headless: DNS returns pod IPs, used by StatefulSets (db-0.db.shop.svc.cluster.local)
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: shop
spec:
  clusterIP: None
  selector:
    app: db
  ports:
    - port: 5432`,
        },
        {
          title: 'Inspecting Services and endpoints',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ kubectl get svc -n shop
NAME         TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)        AGE
db           ClusterIP   None           <none>        5432/TCP       2m
web          ClusterIP   10.96.12.34    <none>        80/TCP         2m
web-public   NodePort    10.96.200.7    <none>        80:30080/TCP   2m

$ kubectl get endpointslices -n shop -l kubernetes.io/service-name=web
NAME        ADDRESSTYPE   PORTS   ENDPOINTS                          AGE
web-abc12   IPv4          8080    10.244.1.5,10.244.2.8,10.244.1.9   2m

# from inside the cluster
$ kubectl run tmp -n shop --rm -it --image=busybox:1.37 --restart=Never -- sh
/ # nslookup web
Name:      web.shop.svc.cluster.local
Address:   10.96.12.34
/ # nslookup db
Name:      db.shop.svc.cluster.local
Address:   10.244.1.12            # headless: pod IPs, no virtual IP
/ # wget -qO- web
<html>...shop...</html>

# from your laptop, no Service type change needed
$ kubectl port-forward -n shop svc/web 8080:80
Forwarding from 127.0.0.1:8080 -> 8080

# the classic bug: selector matches nothing
$ kubectl describe svc web -n shop | grep -i endpoints
Endpoints:         <none>`,
        },
      ],
      quiz: [
        {
          q: 'How does a Service decide which Pods get its traffic?',
          options: ['A list of pod names in the Service', 'Its label selector, filtered to ready Pods', 'All Pods in the namespace', 'Pods on the same node'],
          answer: 1,
          why: 'The selector is a live label query; the EndpointSlice controller lists matching Pods and marks which are ready. Only ready ones get traffic.',
        },
        {
          q: 'Service <code>port: 80, targetPort: 8080</code>. Which is true?',
          options: [
            'Clients call port 8080; containers listen on 80',
            'Clients call the Service on port 80; traffic goes to the containers\' port 8080',
            'Port 80 is opened on every node',
            'Both ports must be the same',
          ],
          answer: 1,
          why: '<code>port</code> is the Service side, <code>targetPort</code> the Pod side. Opening a port on every node is <code>nodePort</code> (NodePort/LoadBalancer types).',
        },
        {
          q: 'Which Service type is reachable <em>only from inside</em> the cluster?',
          options: ['NodePort', 'LoadBalancer', 'ClusterIP', 'ExternalName'],
          answer: 2,
          why: 'ClusterIP (the default) is a virtual IP routed only inside the cluster. NodePort and LoadBalancer add external entry points.',
        },
        {
          q: 'A Service shows <code>Endpoints: &lt;none&gt;</code>. Most likely cause?',
          options: [
            'kube-proxy is not installed',
            'Its selector matches no ready Pods (label typo, wrong namespace, or failing readiness)',
            'The Service type is ClusterIP',
            'The Service port is 80',
          ],
          answer: 1,
          why: 'Empty endpoints means the selector found no ready Pods. Compare <code>kubectl get pods --show-labels</code> with the selector.',
        },
        {
          q: 'What does <code>clusterIP: None</code> (a headless Service) change?',
          options: [
            'The Service becomes external',
            'DNS returns the individual Pod IPs instead of one virtual IP',
            'The Service stops load balancing and drops traffic',
            'Pods lose their IPs',
          ],
          answer: 1,
          why: 'No virtual IP, no kube-proxy rules. DNS answers with the Pod IPs, and StatefulSets get per-pod names like <code>db-0.db</code>.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>The shop pods are running, but the Service has no endpoints and would also hit the wrong port. And
        <code>kubectl apply</code> rejects the nodePort. Edit the manifests in the box below and click <b>Check</b>:</p>
        <ul>
          <li>the Service selector must match the Deployment's pod template labels</li>
          <li><code>targetPort</code> must be the container's port: <code>3000</code> or its name <code>http</code></li>
          <li>keep <code>port: 80</code> and <code>type: NodePort</code></li>
          <li><code>nodePort</code> must be within <code>30000-32767</code> (or removed)</li>
        </ul>`,
        hint: 'The template labels are <code>app: shop</code> and <code>tier: web</code>; use exactly those (both, or at least one that really exists) in <code>spec.selector</code>. Try <code>nodePort: 30080</code>.',
        starter: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop
      tier: web
  template:
    metadata:
      labels:
        app: shop
        tier: web
    spec:
      containers:
        - name: shop
          image: shop/web:1.4.2
          ports:
            - name: http
              containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: shop
spec:
  type: NodePort
  selector:
    app: shop-web
  ports:
    - port: 80
      targetPort: 80
      nodePort: 8080`, CHECKS_SERVICE, 26),
        solution: checker(`apiVersion: apps/v1
kind: Deployment
metadata:
  name: shop
spec:
  replicas: 2
  selector:
    matchLabels:
      app: shop
      tier: web
  template:
    metadata:
      labels:
        app: shop
        tier: web
    spec:
      containers:
        - name: shop
          image: shop/web:1.4.2
          ports:
            - name: http
              containerPort: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: shop
spec:
  type: NodePort
  selector:
    app: shop
    tier: web
  ports:
    - port: 80
      targetPort: http
      nodePort: 30080`, CHECKS_SERVICE, 26),
      },
    },

    // ------------------------------------------------------------------ ingress-and-gateway
    {
      id: 'ingress-and-gateway',
      section: 'Workloads & Networking',
      title: 'Ingress & Gateway API',
      explain: `
      <p>A <code>LoadBalancer</code> Service gives <em>one</em> service <em>one</em> external IP. With ten web apps that's ten
      cloud load balancers (and ten bills), and none of them understands HTTP: they can't route <code>/api</code> to one
      service and <code>/</code> to another, or terminate TLS for <code>shop.example.com</code>.</p>
      <p>You need an <strong>L7 (HTTP) router</strong> in front: one entry point that looks at the <strong>host</strong> and
      <strong>path</strong> of each request and forwards it to the right Service. In Compose you'd add a Traefik or nginx
      container and configure it with labels or a config file. Kubernetes standardises that config as API objects.</p>

      <h3>Ingress (networking.k8s.io/v1)</h3>
      <pre><code class="language-yaml">apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: shop
spec:
  ingressClassName: traefik          # which controller should handle this
  tls:
    - hosts: [shop.example.com]
      secretName: shop-tls           # certificate in a Secret
  rules:
    - host: shop.example.com
      http:
        paths:
          - path: /api
            pathType: Prefix         # Prefix | Exact | ImplementationSpecific
            backend:
              service:
                name: api
                port:
                  number: 8080
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  number: 80</code></pre>
      <ul>
        <li>An Ingress is just <em>configuration</em>. Nothing happens until an <strong>ingress controller</strong> runs in the
        cluster (Traefik, HAProxy, Contour, F5 NGINX Ingress Controller, cloud ones like the AWS Load Balancer Controller or GKE Ingress...).
        The controller itself is usually exposed with one LoadBalancer or NodePort Service.</li>
        <li><code>Prefix</code> matches <em>whole path segments</em>: <code>/api</code> matches <code>/api</code> and
        <code>/api/orders</code>, but not <code>/apiv2</code>. <code>Exact</code> matches only that exact path.</li>
        <li>When several paths match, the <strong>longest</strong> wins (and Exact beats Prefix on a tie).</li>
      </ul>
      <div class="warn"><strong>ingress-nginx is retired.</strong> The community <code>kubernetes/ingress-nginx</code> controller,
      used by a huge share of clusters, ended maintenance in <strong>March 2026</strong>: the repository is archived, with no
      more releases or security fixes. Existing installs keep running, but plan a migration. The <em>Ingress API</em> itself
      is still supported (though feature-frozen), and F5's separate NGINX Ingress Controller is still maintained.</div>

      <h3>Gateway API (gateway.networking.k8s.io/v1): the successor</h3>
      <p>Ingress put everything in one object and left advanced features to controller-specific annotations. The
      <strong>Gateway API</strong> (GA since 2023) splits the job by role:</p>
      <table>
        <tr><th>Object</th><th>Who owns it</th><th>Says</th></tr>
        <tr><td><code>GatewayClass</code></td><td>infrastructure provider</td><td>"this kind of load balancer is implemented by controller X" (like a StorageClass)</td></tr>
        <tr><td><code>Gateway</code></td><td>cluster operator</td><td>"listen on port 443 for *.example.com with this certificate"</td></tr>
        <tr><td><code>HTTPRoute</code></td><td>app team</td><td>"for shop.example.com, send <code>/api</code> to Service <code>api:8080</code>"; attaches to a Gateway via <code>parentRefs</code></td></tr>
      </table>
      <p>It supports header matching, traffic splitting by weight (canaries), redirects and rewrites as normal fields rather than
      annotations, plus other protocols (GRPCRoute, TLSRoute...). The API is installed as CRDs, and implementations include
      Envoy Gateway, Istio, Cilium, Traefik, NGINX Gateway Fabric, kgateway and the major clouds. For path matching, Gateway
      API calls it <code>PathPrefix</code> (Ingress says <code>Prefix</code>).</p>
      <div class="tip">For new setups, prefer the Gateway API. You'll still meet Ingress everywhere in existing clusters and
      docs, so it's worth reading both. The <code>ingress2gateway</code> tool can convert Ingress objects to Gateway API resources.</div>
    `,
      examples: [
        {
          title: 'Simulator: an HTTP router mapping hosts & paths to Services',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  #url { font: 13px ui-monospace, monospace; width: 300px; }
  .presets button { font: 11px ui-monospace, monospace; padding: 2px 6px; }
  .mode button.on { background: #1f2330; color: #fff; }
  table { border-collapse: collapse; width: 100%; background: #fff; border-radius: 8px; font-size: 13px; }
  th, td { padding: 4px 8px; text-align: left; border-bottom: 1px solid #e3e7ef; }
  th { background: #eef1f7; font-weight: 600; }
  td code { font-size: 12px; }
  tr.hit td { background: #fff3c4; }
  .res { margin-top: 6px; background: #fff; border-radius: 8px; padding: 6px 10px; }
  .ok { color: #137333; font-weight: 600; } .bad { color: #b3261e; font-weight: 600; }
</style>

<div class="bar mode">
  <button id="m-ing" class="on">Ingress</button>
  <button id="m-gw">Gateway API (HTTPRoute)</button>
  <label><input type="checkbox" id="ctrl" checked> controller installed</label>
</div>
<div class="bar">
  <input id="url" value="http://shop.example.com/api/orders" spellcheck="false">
  <button id="go">Send</button>
</div>
<div class="bar presets" id="presets"></div>
<table>
  <thead><tr><th>#</th><th>host</th><th>path</th><th>match type</th><th>&rarr; Service</th></tr></thead>
  <tbody id="rules"></tbody>
</table>
<div class="res" id="res"></div>

<script>
  var RULES = [
    { host: 'shop.example.com', path: '/api', type: 'Prefix', svc: 'api', port: 8080 },
    { host: 'shop.example.com', path: '/login', type: 'Exact', svc: 'auth', port: 80 },
    { host: 'shop.example.com', path: '/', type: 'Prefix', svc: 'web', port: 80 },
    { host: 'admin.example.com', path: '/', type: 'Prefix', svc: 'admin', port: 80 },
  ];
  var PRESETS = ['http://shop.example.com/', 'http://shop.example.com/api/orders', 'http://shop.example.com/apiv2',
    'http://shop.example.com/login', 'http://shop.example.com/login/reset', 'http://admin.example.com/users',
    'http://blog.example.com/'];
  var mode = 'ing';

  function typeName(t) {
    if (mode === 'ing') return t;
    return t === 'Prefix' ? 'PathPrefix' : 'Exact';
  }

  // Prefix = whole path segments: /api matches /api and /api/x, not /apiv2
  function prefixMatch(rule, path) {
    if (rule === '/') return true;
    var r = rule.replace(/\/$/, '');
    return path === r || path.indexOf(r + '/') === 0;
  }

  function route(host, path) {
    var best = null;
    RULES.forEach(function (r, i) {
      if (r.host !== host) return;
      var ok = r.type === 'Exact' ? path === r.path : prefixMatch(r.path, path);
      if (!ok) return;
      // longest path wins; on a tie Exact beats Prefix
      if (!best || r.path.length > best.r.path.length ||
        (r.path.length === best.r.path.length && r.type === 'Exact')) best = { r: r, i: i };
    });
    return best;
  }

  function send() {
    var raw = document.getElementById('url').value.trim();
    var m = raw.match(/^https?:\/\/([^\/:]+)(?::\d+)?(\/[^?#]*)?/);
    var res = document.getElementById('res');
    console.log('$ curl ' + raw);
    if (!m) {
      res.innerHTML = '<span class="bad">Not a URL.</span> Try one of the presets.';
      console.log('curl: (3) URL rejected: Bad hostname');
      renderRules(-1);
      return;
    }
    var host = m[1].toLowerCase();
    var path = m[2] || '/';
    if (!document.getElementById('ctrl').checked) {
      res.innerHTML = '<span class="bad">No controller:</span> the ' + (mode === 'ing' ? 'Ingress' : 'HTTPRoute') +
        ' object exists, but nobody reads it. No address, no proxy, no routing.';
      console.log('curl: (7) Failed to connect to ' + host + ' port 80: Connection refused');
      console.log('$ kubectl get ' + (mode === 'ing' ? 'ingress shop' : 'gateway shop-gw'));
      console.log(mode === 'ing' ? 'NAME   CLASS     HOSTS                               ADDRESS   PORTS'
        : 'NAME      CLASS   ADDRESS   PROGRAMMED');
      console.log(mode === 'ing' ? 'shop   traefik   shop.example.com,admin.example.com             80'
        : 'shop-gw   eg                Unknown');
      renderRules(-1);
      return;
    }
    var hit = route(host, path);
    console.log('[' + (mode === 'ing' ? 'ingress controller' : 'gateway') + '] Host: ' + host + '  path: ' + path);
    if (!hit) {
      res.innerHTML = '<span class="bad">404</span> no rule matches <code>' + host + path + '</code>' +
        (mode === 'ing' ? ' - the controller\'s default backend answers.' : ' - the Gateway answers 404.');
      console.log('  no matching rule -> HTTP/1.1 404 Not Found');
      renderRules(-1);
      return;
    }
    var r = hit.r;
    res.innerHTML = '<span class="ok">200</span> rule #' + (hit.i + 1) + ' <code>' + r.path + '</code> (' + typeName(r.type) +
      ') &rarr; Service <b>' + r.svc + ':' + r.port + '</b> &rarr; one of its ready pods';
    console.log('  matched rule #' + (hit.i + 1) + ': ' + r.path + ' (' + typeName(r.type) + ') -> service ' + r.svc + ':' + r.port);
    console.log('  HTTP/1.1 200 OK   (response from one of the ' + r.svc + ' pods)');
    renderRules(hit.i);
  }

  function renderRules(hitIdx) {
    document.getElementById('rules').innerHTML = RULES.map(function (r, i) {
      return '<tr' + (i === hitIdx ? ' class="hit"' : '') + '><td>' + (i + 1) + '</td><td><code>' + r.host + '</code></td><td><code>' +
        r.path + '</code></td><td>' + typeName(r.type) + '</td><td><code>' + r.svc + ':' + r.port + '</code></td></tr>';
    }).join('');
  }

  function setMode(m) {
    mode = m;
    document.getElementById('m-ing').className = m === 'ing' ? 'on' : '';
    document.getElementById('m-gw').className = m === 'gw' ? 'on' : '';
    console.log(m === 'ing'
      ? '--- Ingress "shop" (networking.k8s.io/v1), ingressClassName: traefik ---'
      : '--- HTTPRoutes attached to Gateway "shop-gw" (gateway.networking.k8s.io/v1) ---');
    send();
  }

  var pre = document.getElementById('presets');
  PRESETS.forEach(function (u) {
    var b = document.createElement('button');
    b.textContent = u.replace('http://', '');
    b.onclick = function () { document.getElementById('url').value = u; send(); };
    pre.appendChild(b);
  });
  document.getElementById('go').onclick = send;
  document.getElementById('url').addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });
  document.getElementById('m-ing').onclick = function () { setMode('ing'); };
  document.getElementById('m-gw').onclick = function () { setMode('gw'); };
  document.getElementById('ctrl').onchange = send;
  setMode('ing');
</script>`,
          explain: `
          <details>
            <summary>What each preset shows</summary>
            <table>
              <tr><th>URL</th><th>Result</th><th>Why</th></tr>
              <tr><td><code>shop.example.com/</code></td><td>rule #3 &rarr; <code>web:80</code></td><td><code>/</code> Prefix matches everything on that host</td></tr>
              <tr><td><code>shop.example.com/api/orders</code></td><td>rule #1 &rarr; <code>api:8080</code></td><td>both <code>/api</code> and <code>/</code> match; the longer one wins</td></tr>
              <tr><td><code>shop.example.com/apiv2</code></td><td>rule #3 &rarr; <code>web:80</code></td><td>Prefix works on whole segments: <code>apiv2</code> is not <code>api</code></td></tr>
              <tr><td><code>shop.example.com/login</code></td><td>rule #2 &rarr; <code>auth:80</code></td><td>Exact match</td></tr>
              <tr><td><code>shop.example.com/login/reset</code></td><td>rule #3 &rarr; <code>web:80</code></td><td>Exact doesn't match sub-paths, so it falls back to <code>/</code></td></tr>
              <tr><td><code>admin.example.com/users</code></td><td>rule #4 &rarr; <code>admin:80</code></td><td>host decides first</td></tr>
              <tr><td><code>blog.example.com/</code></td><td>404</td><td>no rule for that host</td></tr>
            </table>
            <p>Switch to <b>Gateway API (HTTPRoute)</b>: routing is identical, only the match type names change
            (<code>Prefix</code> &rarr; <code>PathPrefix</code>). Untick <b>controller installed</b>: every request fails with
            <code>Connection refused</code>, and <code>kubectl get ingress</code> shows an empty ADDRESS. The most common
            "my Ingress does nothing" cause on a fresh cluster.</p>
          </details>
        `,
        },
        {
          title: 'The same routing as Gateway API resources',
          runnable: false,
          lang: 'yaml',
          note: 'Reference manifests - needs the Gateway API CRDs plus an implementation (e.g. Envoy Gateway) installed.',
          code: String.raw`# usually installed by the platform team, together with the controller
apiVersion: gateway.networking.k8s.io/v1
kind: GatewayClass
metadata:
  name: eg
spec:
  controllerName: gateway.envoyproxy.io/gatewayclass-controller
---
# the operator: one shared entry point
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: shop-gw
  namespace: infra
spec:
  gatewayClassName: eg
  listeners:
    - name: https
      protocol: HTTPS
      port: 443
      hostname: "*.example.com"
      tls:
        certificateRefs:
          - name: example-com-tls
      allowedRoutes:
        namespaces:
          from: All
---
# the app team: routes for their hostname
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: shop
spec:
  parentRefs:
    - name: shop-gw
      namespace: infra
  hostnames:
    - shop.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api
          port: 8080
    - matches:
        - path:
            type: Exact
            value: /login
      backendRefs:
        - name: auth
          port: 80
    - backendRefs:              # no matches = everything else ("/" prefix)
        - name: web
          port: 80
          weight: 90
        - name: web-canary      # traffic split: 10% to the canary
          port: 80
          weight: 10`,
        },
        {
          title: 'Checking an Ingress / Gateway from the terminal',
          runnable: false,
          lang: 'bash',
          code: String.raw`# is there a controller, and which classes exist?
$ kubectl get ingressclass
NAME      CONTROLLER                      AGE
traefik   traefik.io/ingress-controller   3d

$ kubectl get ingress -n shop
NAME   CLASS     HOSTS              ADDRESS        PORTS     AGE
shop   traefik   shop.example.com   203.0.113.20   80, 443   2m

# test host-based routing without DNS: send the Host header yourself
$ curl -H 'Host: shop.example.com' http://203.0.113.20/api/health
{"status":"ok","service":"api"}

# Gateway API
$ kubectl get gatewayclass,gateway -A
NAME                                 CONTROLLER                                      ACCEPTED
gatewayclass.gateway.networking.k8s.io/eg   gateway.envoyproxy.io/gatewayclass-controller   True

NAMESPACE   NAME                                      CLASS   ADDRESS        PROGRAMMED
infra       gateway.gateway.networking.k8s.io/shop-gw   eg      203.0.113.30   True

$ kubectl get httproute -n shop
NAME   HOSTNAMES              AGE
shop   ["shop.example.com"]   1m

# route not working? the status says why (e.g. backend Service not found)
$ kubectl describe httproute shop -n shop | grep -A2 'Reason'
    Reason:  Accepted
    Reason:  ResolvedRefs`,
        },
      ],
      quiz: [
        {
          q: 'You applied an Ingress but <code>kubectl get ingress</code> shows no ADDRESS and nothing routes. Most likely?',
          options: ['The Service type must be LoadBalancer', 'No ingress controller is installed (or ingressClassName doesn\'t match one)', 'Ingress needs a Gateway', 'The pods need hostNetwork'],
          answer: 1,
          why: 'Ingress objects are only configuration. A controller must watch them and program a proxy.',
        },
        {
          q: 'Ingress rule <code>path: /api</code>, <code>pathType: Prefix</code>. Which request matches it?',
          options: ['<code>/apiv2</code>', '<code>/api/orders</code>', '<code>/v1/api</code>', 'All of them'],
          answer: 1,
          why: 'Prefix matching is by path segment: <code>/api</code>, <code>/api/</code>, <code>/api/orders</code> match; <code>/apiv2</code> does not.',
        },
        {
          q: 'In the Gateway API, which object does an <strong>application team</strong> usually write?',
          options: ['GatewayClass', 'Gateway', 'HTTPRoute', 'IngressClass'],
          answer: 2,
          why: 'Infra providers define GatewayClasses, operators run Gateways, and app teams attach HTTPRoutes to them via <code>parentRefs</code>.',
        },
        {
          q: 'What is the status of the community <code>ingress-nginx</code> controller in 2026?',
          options: [
            'It became the Gateway API reference implementation',
            'Retired in March 2026: archived, no further releases or security fixes',
            'Merged into kube-proxy',
            'Still actively developed with new features',
          ],
          answer: 1,
          why: 'Kubernetes SIG Network retired it; existing installs still run but get no fixes. The Ingress API remains, and other controllers or Gateway API implementations are the way forward.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Write an <strong>HTTPRoute</strong> for <code>shop.example.com</code> attached to the Gateway
        <code>shop-gw</code>. Edit the manifest in the box below and click <b>Check</b>:</p>
        <ul>
          <li><code>apiVersion: gateway.networking.k8s.io/v1</code>, <code>kind: HTTPRoute</code></li>
          <li><code>parentRefs</code> includes <code>name: shop-gw</code></li>
          <li><code>hostnames</code> includes <code>shop.example.com</code></li>
          <li>a rule matching path type <code>PathPrefix</code> value <code>/api</code> &rarr; backend <code>api</code> port <code>8080</code></li>
          <li>a rule sending traffic to backend <code>web</code> port <code>80</code></li>
        </ul>`,
        hint: 'Gateway API uses <code>PathPrefix</code>, not Ingress\'s <code>Prefix</code>. Each backend in <code>backendRefs</code> needs both <code>name</code> and <code>port</code>. A rule without <code>matches</code> catches everything.',
        starter: checker(`apiVersion: gateway.networking.k8s.io/v1beta1
kind: HTTPRoute
metadata:
  name: shop
spec:
  hostnames:
    - shop.example.com
  rules:
    - matches:
        - path:
            type: Prefix
            value: /api
      backendRefs:
        - name: api
    - backendRefs:
        - name: web
          port: 80`, CHECKS_ROUTE, 22),
        solution: checker(`apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
spec:
  parentRefs:
    - name: shop-gw
  hostnames:
    - shop.example.com
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api
      backendRefs:
        - name: api
          port: 8080
    - backendRefs:
        - name: web
          port: 80`, CHECKS_ROUTE, 22),
      },
    },

    // ------------------------------------------------------------------ other-workloads
    {
      id: 'other-workloads',
      section: 'Workloads & Networking',
      title: 'Jobs, CronJobs, DaemonSets & StatefulSets',
      explain: `
      <p>A Deployment assumes every Pod is interchangeable and should run forever. Plenty of work doesn't fit that. Kubernetes
      has a controller for each common shape. They all create Pods from a <code>template</code>, like a Deployment; what
      differs is <em>how many</em>, <em>where</em>, <em>what they're called</em> and <em>when they stop</em>.</p>

      <table>
        <tr><th>Workload</th><th>Pods are...</th><th>Use it for</th><th>Compose / Docker analogy</th></tr>
        <tr><td><strong>Deployment</strong></td><td>N identical, random names, run forever</td><td>stateless web/API/workers</td><td><code>deploy.replicas</code></td></tr>
        <tr><td><strong>StatefulSet</strong></td><td>N with stable names <code>db-0</code>, <code>db-1</code>, each with its own disk</td><td>databases, queues, clustered systems (Postgres, Kafka, etcd)</td><td>one service per replica, each with its own named volume</td></tr>
        <tr><td><strong>DaemonSet</strong></td><td>exactly one per (matching) node</td><td>node agents: log shippers, monitoring, CNI, kube-proxy</td><td>Swarm's <code>mode: global</code></td></tr>
        <tr><td><strong>Job</strong></td><td>run until N succeed, then stop</td><td>migrations, batch processing, one-off tasks</td><td><code>docker compose run --rm migrate</code></td></tr>
        <tr><td><strong>CronJob</strong></td><td>a new Job on a schedule</td><td>nightly reports, backups, cleanups</td><td>cron on the host calling <code>docker run</code></td></tr>
      </table>

      <h3>StatefulSet</h3>
      <ul>
        <li><strong>Stable identity</strong>: pods are named <code>&lt;name&gt;-0</code>, <code>-1</code>, <code>-2</code>. If <code>db-1</code> is deleted,
        a new <code>db-1</code> comes back with the same name.</li>
        <li><strong>Stable storage</strong>: <code>volumeClaimTemplates</code> create one PersistentVolumeClaim per pod
        (<code>data-db-0</code>, <code>data-db-1</code>...). A recreated <code>db-1</code> re-attaches <code>data-db-1</code>.
        Scaling down or deleting the StatefulSet keeps the PVCs by default (your data is safe; you clean up yourself, or set
        <code>persistentVolumeClaimRetentionPolicy</code>).</li>
        <li><strong>Ordered</strong> (default <code>podManagementPolicy: OrderedReady</code>): <code>db-1</code> starts only after
        <code>db-0</code> is Ready; scale-down removes the highest ordinal first. <code>Parallel</code> skips the waiting.</li>
        <li><strong>Stable DNS</strong> via a headless Service (<code>serviceName</code>): <code>db-0.db.shop.svc.cluster.local</code>,
        so replicas can find "the primary" by name.</li>
      </ul>
      <div class="warn">A StatefulSet gives you identity and disks, not a database operator. Replication, failover and backups
      are still your job (or an operator's, e.g. CloudNativePG for Postgres). Many teams use a managed database instead.</div>

      <h3>DaemonSet</h3>
      <p>One pod on every node, automatically: add a node and a pod appears there; remove it and the pod goes. Use a
      <code>nodeSelector</code> or affinity to target only some nodes. Control-plane nodes are tainted, so DaemonSet pods only run
      there if they have a matching toleration.</p>

      <h3>Job</h3>
      <ul>
        <li><code>completions</code> - how many successful pods are needed (default 1). <code>parallelism</code> - how many run at once (default 1).</li>
        <li><code>backoffLimit</code> - retries before the Job is marked Failed (default 6), with growing delays.
        <code>activeDeadlineSeconds</code> caps total runtime.</li>
        <li>Pod <code>restartPolicy</code> must be <code>Never</code> (failed pod &rarr; new pod) or <code>OnFailure</code> (restart the container in place). <code>Always</code> isn't allowed.</li>
        <li>Finished pods stay (<code>Completed</code>) so you can read their logs; <code>ttlSecondsAfterFinished</code> deletes the Job later.</li>
      </ul>
      <h3>CronJob</h3>
      <ul>
        <li><code>schedule</code> uses cron syntax (<code>"30 2 * * *"</code> = 02:30 every day). Set <code>timeZone</code> (e.g. <code>"Asia/Bangkok"</code>) or it's the controller's time zone, usually UTC.</li>
        <li><code>concurrencyPolicy</code>: <code>Allow</code> (default), <code>Forbid</code> (skip if the last run is still going), <code>Replace</code>.</li>
        <li>Keeps the last 3 successful and 1 failed Job by default (<code>successfulJobsHistoryLimit</code> / <code>failedJobsHistoryLimit</code>).</li>
        <li>Each run is a Job named <code>&lt;cronjob&gt;-&lt;scheduled time in minutes since epoch&gt;</code>.</li>
      </ul>
    `,
      examples: [
        {
          title: 'Simulator: same cluster, five workload types',
          code: String.raw`<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; align-items: center; margin-bottom: 6px; }
  .types button.on { background: #326ce5; color: #fff; border-color: #326ce5; }
  .desc { background: #fff; border-radius: 8px; padding: 5px 10px; margin-bottom: 6px; font-size: 13px; }
  .nodes { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
  .node { background: #fff; border: 1px solid #d3d9e6; border-top: 5px solid #1e8e3e; border-radius: 8px; padding: 5px; min-height: 90px; }
  .node.off { opacity: .35; border-top-color: #9aa3b5; }
  .node h4 { margin: 0 0 3px; font-size: 12px; }
  .pod { margin: 3px 0; padding: 2px 5px; border-radius: 5px; font: 11px ui-monospace, monospace; border: 1px solid; }
  .pod.Running { background: #dff5e5; border-color: #7cc795; }
  .pod.Starting { background: #fff3cd; border-color: #e0b54b; }
  .pod.Completed { background: #eceff5; border-color: #aab2c3; color: #5b6275; }
  .pod.Failed { background: #fdecec; border-color: #e0797d; color: #a4262c; }
  .pvcs { margin-top: 6px; font: 12px ui-monospace, monospace; }
  .pvc { display: inline-block; background: #fff4e0; border: 1px solid #e8c07a; border-radius: 5px; padding: 1px 6px; margin: 2px; }
</style>

<div class="bar types" id="types"></div>
<div class="desc" id="desc"></div>
<div class="bar">
  <button id="step">Step ▶</button>
  <button id="del">Delete a pod</button>
  <button id="add">Add a node</button>
  <button id="reset">Reset</button>
</div>
<div class="nodes" id="nodes"></div>
<div class="pvcs" id="pvcs"></div>

<script>
  var TYPES = ['Deployment', 'StatefulSet', 'DaemonSet', 'Job', 'CronJob'];
  var DESC = {
    Deployment: '<b>Deployment web</b>, replicas: 3. Interchangeable pods with random names.',
    StatefulSet: '<b>StatefulSet db</b>, replicas: 3, volumeClaimTemplates: data. Ordered, stable names, one PVC each.',
    DaemonSet: '<b>DaemonSet log-agent</b>. One pod per node, no replicas field.',
    Job: '<b>Job report</b>, completions: 3, parallelism: 2, backoffLimit: 4. Runs to completion.',
    CronJob: '<b>CronJob nightly</b>, schedule: "*/5 * * * *". Creates a Job every 5 minutes (sped up: 1 step = next run).',
  };
  var RAND = ['x4k2p', '9qzmt', 'lr8wn', 'h2v6c', 'b7tdn', 'm3fjq', 'p8wxz', 'c5rkg', 't9vhl', 'z2nmd', 'k7wqa', 'f4jxs'];
  var type = 'Deployment';
  var nodes, pods, pvcs, r, clock, jobs, done, failures;

  function $(id) { return document.getElementById(id); }
  function rand() { return RAND[r++ % RAND.length]; }
  function emptiest() {
    return nodes.slice().sort(function (a, b) { return count(a) - count(b); })[0];
  }
  function count(nd) { return pods.filter(function (p) { return p.node === nd && p.phase !== 'Completed'; }).length; }
  function add(name, node, phase) { var p = { name: name, node: node, phase: phase || 'Starting' }; pods.push(p); return p; }
  function find(name) { return pods.filter(function (p) { return p.name === name; })[0]; }
  function hhmm(t) {
    var d = new Date(t * 60000);
    return ('0' + d.getUTCHours()).slice(-2) + ':' + ('0' + d.getUTCMinutes()).slice(-2);
  }

  function reset() {
    nodes = ['node-1', 'node-2', 'node-3'];
    pods = [];
    pvcs = [];
    r = 0;
    jobs = [];
    done = 0;
    failures = 0;
    clock = Date.UTC(2026, 8, 30, 10, 0) / 60000;
    console.log('--- ' + type + ' ---');
    render();
  }

  var IMPL = {
    Deployment: {
      step: function () {
        if (pods.length === 0) {
          console.log('[replicaset] web-6d4b9c7f8d: desired 3, current 0 -> create 3 (all at once, any order)');
          for (var i = 0; i < 3; i++) {
            var p = add('web-6d4b9c7f8d-' + rand(), emptiest(), 'Running');
            console.log('  ' + p.name + ' -> ' + p.node);
          }
        } else console.log('[replicaset] web-6d4b9c7f8d: 3/3 ready, nothing to do');
      },
      del: function () {
        var v = pods[0];
        pods.splice(0, 1);
        var p = add('web-6d4b9c7f8d-' + rand(), emptiest(), 'Running');
        console.log('$ kubectl delete pod ' + v.name);
        console.log('[replicaset] replacement with a NEW random name: ' + p.name + ' -> ' + p.node);
      },
      add: function (nd) { console.log('[deployment] nothing moves to ' + nd + ': running pods are never rebalanced'); },
    },
    StatefulSet: {
      step: function () {
        var starting = pods.filter(function (p) { return p.phase === 'Starting'; })[0];
        if (starting) {
          starting.phase = 'Running';
          console.log('[statefulset] ' + starting.name + ' is Ready');
        }
        if (pods.length < 3 && (!starting || pods.length === Number(starting.name.slice(-1)) + 1)) {
          var ord = pods.length;
          var p = add('db-' + ord, nodes[ord % nodes.length]);
          pvcs.push('data-db-' + ord);
          console.log('[statefulset] create pod db-' + ord + ' + PVC data-db-' + ord + ' (Bound)' +
            (ord > 0 ? ' - only now, because db-' + (ord - 1) + ' is Ready' : ''));
          console.log('  DNS: db-' + ord + '.db.default.svc.cluster.local -> ' + p.node);
        } else if (!starting) {
          console.log('[statefulset] db: 3/3 ready (db-0, db-1, db-2)');
        }
      },
      del: function () {
        var v = find('db-1');
        if (!v) { console.log('(db-1 does not exist yet - step first)'); return; }
        console.log('$ kubectl delete pod db-1');
        v.phase = 'Starting';
        console.log('[statefulset] recreate db-1: SAME name, SAME PVC data-db-1, same DNS name');
        console.log('  (step to mark it Ready)');
      },
      add: function (nd) { console.log('[statefulset] nothing changes on ' + nd + ': pods keep their identity where they are'); },
    },
    DaemonSet: {
      step: function () {
        var missing = nodes.filter(function (nd) { return !pods.some(function (p) { return p.node === nd; }); });
        if (!missing.length) { console.log('[daemonset] log-agent: 1 pod on each of ' + nodes.length + ' nodes, nothing to do'); return; }
        missing.forEach(function (nd) {
          var p = add('log-agent-' + rand(), nd, 'Running');
          console.log('[daemonset] ' + nd + ' has no log-agent -> create ' + p.name + ' pinned to ' + nd);
        });
      },
      del: function () {
        var v = pods.filter(function (p) { return p.node === 'node-2'; })[0];
        if (!v) { console.log('(no pod on node-2 yet - step first)'); return; }
        pods.splice(pods.indexOf(v), 1);
        var p = add('log-agent-' + rand(), 'node-2', 'Running');
        console.log('$ kubectl delete pod ' + v.name);
        console.log('[daemonset] node-2 has no log-agent -> ' + p.name + ' on node-2 (always the same node)');
      },
      add: function (nd) {
        var p = add('log-agent-' + rand(), nd, 'Running');
        console.log('[daemonset] new node ' + nd + ' -> create ' + p.name + ' there automatically');
      },
    },
    Job: {
      step: function () {
        var running = pods.filter(function (p) { return p.phase === 'Running'; });
        if (done >= 3) { console.log('[job] report: Complete (3/3). Pods stay Completed so you can read logs.'); return; }
        running.forEach(function (p, i) {
          // the second pod of the first batch fails once, to show retries
          if (pods.length === 2 && i === 1) {
            p.phase = 'Failed';
            failures++;
            console.log('[job] ' + p.name + ' exited 1 -> Failed (failures ' + failures + '/backoffLimit 4)');
          } else {
            p.phase = 'Completed';
            done++;
            console.log('[job] ' + p.name + ' exited 0 -> Completed (' + done + '/3)');
          }
        });
        var need = Math.min(2, 3 - done);
        for (var i = 0; i < need; i++) {
          var q = add('report-' + rand(), emptiest(), 'Running');
          console.log('[job] start ' + q.name + ' on ' + q.node + ' (' + done + ' done, parallelism 2)');
        }
        if (done >= 3) {
          console.log('$ kubectl get job report');
          console.log('NAME     STATUS     COMPLETIONS   DURATION');
          console.log('report   Complete   3/3           41s');
        }
      },
      del: function () { console.log('(try this on StatefulSet or DaemonSet: Job pods finish on their own)'); },
      add: function (nd) { console.log('[job] ' + nd + ' is used only if a new pod needs a node'); },
    },
    CronJob: {
      step: function () {
        pods.forEach(function (p) {
          if (p.phase === 'Running') { p.phase = 'Completed'; console.log('[job] ' + p.name + ' Completed'); }
        });
        clock += 5;
        var job = 'nightly-' + clock;
        jobs.push(job);
        var p = add(job + '-' + rand(), emptiest(), 'Running');
        console.log('[cronjob] ' + hhmm(clock) + ' UTC: schedule "*/5 * * * *" fired -> Job ' + job + ' -> pod ' + p.name);
        var keep = jobs.filter(function (j) { return j !== job; });
        if (keep.length > 3) {
          var old = jobs.shift();
          pods = pods.filter(function (x) { return x.name.indexOf(old + '-') !== 0; });
          console.log('[cronjob] successfulJobsHistoryLimit 3 -> delete old Job ' + old + ' and its pod');
        }
      },
      del: function () { console.log('(try this on StatefulSet or DaemonSet: CronJob pods finish on their own)'); },
      add: function (nd) { console.log('[cronjob] ' + nd + ' can be used by future runs'); },
    },
  };

  function render() {
    $('types').innerHTML = '';
    TYPES.forEach(function (t) {
      var b = document.createElement('button');
      b.textContent = t;
      b.className = t === type ? 'on' : '';
      b.onclick = function () { type = t; reset(); };
      $('types').appendChild(b);
    });
    $('desc').innerHTML = DESC[type];
    var cols = nodes.length > 3 ? nodes : nodes.concat(['(no node-4 yet)']);
    $('nodes').innerHTML = cols.map(function (nd) {
      var off = nodes.indexOf(nd) < 0;
      return '<div class="node' + (off ? ' off' : '') + '"><h4>' + nd + '</h4>' + pods.filter(function (p) { return p.node === nd; })
        .map(function (p) { return '<div class="pod ' + p.phase + '" title="' + p.phase + '">' + p.name + '</div>'; }).join('') + '</div>';
    }).join('');
    $('pvcs').innerHTML = pvcs.length ? 'PVCs: ' + pvcs.map(function (c) { return '<span class="pvc">' + c + '</span>'; }).join('') : '';
    $('add').disabled = nodes.length >= 4;
    $('del').disabled = type === 'Job' || type === 'CronJob' || pods.length === 0;
  }

  $('step').onclick = function () { IMPL[type].step(); render(); };
  $('del').onclick = function () { IMPL[type].del(); render(); };
  $('add').onclick = function () {
    nodes.push('node-4');
    console.log('$ kubectl get nodes   # node-4 joined, Ready');
    IMPL[type].add('node-4');
    render();
  };
  $('reset').onclick = reset;
  reset();
</script>`,
          explain: `
          <details>
            <summary>What to try with each type</summary>
            <table>
              <tr><th>Type</th><th>Do this</th><th>What you'll see</th></tr>
              <tr><td>Deployment</td><td>Step, Delete a pod, Add a node</td><td>3 pods at once with random names; the replacement has a <em>new</em> random name; node-4 stays empty (no rebalancing)</td></tr>
              <tr><td>StatefulSet</td><td>Step 4 times, then Delete a pod</td><td><code>db-0</code>, then <code>db-1</code> only after <code>db-0</code> is Ready, then <code>db-2</code>, each with a PVC <code>data-db-N</code>. Deleting brings back <code>db-1</code> with the same name and the same PVC</td></tr>
              <tr><td>DaemonSet</td><td>Step, Add a node, Delete a pod</td><td>one <code>log-agent</code> per node; node-4 gets one immediately; a deleted pod is recreated on the <em>same</em> node</td></tr>
              <tr><td>Job</td><td>Step 3 times</td><td>2 pods run in parallel; one fails (<code>failures 1/backoffLimit 4</code>) and is replaced; after 3 successes the Job is Complete and pods stay Completed</td></tr>
              <tr><td>CronJob</td><td>Step 5 times</td><td>a new Job every "5 minutes" named <code>nightly-&lt;minutes since epoch&gt;</code>; on the 5th run the oldest finished Job is deleted (<code>successfulJobsHistoryLimit: 3</code>)</td></tr>
            </table>
          </details>
        `,
        },
        {
          title: 'StatefulSet with a headless Service and per-pod volumes',
          runnable: false,
          lang: 'yaml',
          code: String.raw`apiVersion: v1
kind: Service
metadata:
  name: db
spec:
  clusterIP: None              # headless: gives db-0.db, db-1.db ... DNS names
  selector:
    app: db
  ports:
    - port: 5432
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: db
spec:
  serviceName: db              # the headless Service above
  replicas: 3
  podManagementPolicy: OrderedReady   # default: db-0, then db-1, then db-2
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
        - name: postgres
          image: postgres:17
          ports:
            - containerPort: 5432
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
  volumeClaimTemplates:        # one PVC per pod: data-db-0, data-db-1, data-db-2
    - metadata:
        name: data
      spec:
        accessModes: ["ReadWriteOnce"]
        resources:
          requests:
            storage: 10Gi`,
        },
        {
          title: 'Job, CronJob and DaemonSet manifests',
          runnable: false,
          lang: 'yaml',
          code: String.raw`apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
spec:
  completions: 1
  backoffLimit: 3               # give up after 3 retries
  activeDeadlineSeconds: 600
  ttlSecondsAfterFinished: 3600 # delete the Job an hour after it finishes
  template:
    spec:
      restartPolicy: Never      # Never or OnFailure (Always is not allowed)
      containers:
        - name: migrate
          image: shop/api:3.2
          command: ["./migrate", "up"]
---
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nightly-report
spec:
  schedule: "30 2 * * *"        # 02:30 every day
  timeZone: "Asia/Bangkok"
  concurrencyPolicy: Forbid     # skip a run if the previous one is still going
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: report
              image: shop/report:1.0
---
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: log-agent
  namespace: kube-system
spec:
  selector:
    matchLabels:
      app: log-agent
  template:
    metadata:
      labels:
        app: log-agent
    spec:
      tolerations:              # also run on tainted control-plane nodes
        - key: node-role.kubernetes.io/control-plane
          operator: Exists
          effect: NoSchedule
      containers:
        - name: fluent-bit
          image: fluent/fluent-bit:4.0
          volumeMounts:
            - name: varlog
              mountPath: /var/log
              readOnly: true
      volumes:
        - name: varlog
          hostPath:
            path: /var/log`,
        },
      ],
      quiz: [
        {
          q: 'You need a log collector on <strong>every</strong> node, including nodes added next month. Which workload?',
          options: ['Deployment with replicas = number of nodes', 'DaemonSet', 'StatefulSet', 'CronJob'],
          answer: 1,
          why: 'A DaemonSet runs one pod per (matching) node and follows nodes being added or removed.',
        },
        {
          q: 'StatefulSet <code>db</code> pod <code>db-1</code> is deleted. What comes back?',
          options: [
            'A pod with a random name and a fresh volume',
            'A new <code>db-1</code>, re-attached to PVC <code>data-db-1</code>',
            'Nothing until you scale the StatefulSet',
            '<code>db-3</code>',
          ],
          answer: 1,
          why: 'StatefulSet pods have stable identities: the same name, DNS name and PersistentVolumeClaim.',
        },
        {
          q: 'A Job has <code>completions: 3</code> and <code>parallelism: 2</code>. What happens?',
          options: [
            '3 pods run forever',
            'Up to 2 pods run at a time until 3 have succeeded, then the Job is Complete',
            '2 pods run, and the Job completes when both finish',
            '6 pods run in total',
          ],
          answer: 1,
          why: 'parallelism caps concurrency; completions is the number of successful pods needed. Failed pods are retried up to backoffLimit.',
        },
        {
          q: 'Which <code>restartPolicy</code> is <strong>not</strong> allowed in a Job\'s pod template?',
          options: ['Never', 'OnFailure', 'Always', 'All are allowed'],
          answer: 2,
          why: 'A Job\'s pods must be able to finish. Always would restart them forever, so only Never and OnFailure are valid.',
        },
        {
          q: 'A CronJob\'s previous run is still going when the next schedule fires. You want to skip the new run. Setting?',
          options: ['<code>concurrencyPolicy: Forbid</code>', '<code>concurrencyPolicy: Replace</code>', '<code>suspend: true</code>', '<code>parallelism: 1</code>'],
          answer: 0,
          why: 'Forbid skips the new run; Replace cancels the running Job and starts the new one; Allow (default) runs both.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Turn this into a nightly backup <strong>CronJob</strong>. Edit the manifest in the box below and click <b>Check</b>:</p>
        <ul>
          <li><code>apiVersion: batch/v1</code>, <code>kind: CronJob</code></li>
          <li>runs at <strong>02:30 every day</strong> in time zone <code>Asia/Bangkok</code></li>
          <li>never runs two backups at the same time (<code>concurrencyPolicy</code>)</li>
          <li>the Job retries at most 2 times (<code>backoffLimit: 2</code> inside <code>jobTemplate.spec</code>)</li>
          <li>the pod's <code>restartPolicy</code> is valid for a Job</li>
        </ul>`,
        hint: 'Cron fields are minute hour day-of-month month day-of-week, so 02:30 daily is <code>"30 2 * * *"</code>. The pod template lives at <code>spec.jobTemplate.spec.template</code>. Use <code>Forbid</code> and <code>OnFailure</code> (or <code>Never</code>).',
        starter: checker(`apiVersion: batch/v1
kind: Job
metadata:
  name: backup
spec:
  schedule: "2 30 * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: Always
          containers:
            - name: backup
              image: shop/backup:1.2
              args: ["--target", "s3://shop-backups"]`, CHECKS_CRON, 20),
        solution: checker(`apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup
spec:
  schedule: "30 2 * * *"
  timeZone: "Asia/Bangkok"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      backoffLimit: 2
      template:
        spec:
          restartPolicy: OnFailure
          containers:
            - name: backup
              image: shop/backup:1.2
              args: ["--target", "s3://shop-backups"]`, CHECKS_CRON, 20),
      },
    },
  );
})();
