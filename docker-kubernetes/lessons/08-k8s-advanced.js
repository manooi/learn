// Section: Scaling, Security & Ops — Kubernetes v1.37 (Aug 2026), autoscaling/v2, Helm 4.
// Code strings use String.raw so regex backslashes inside the simulators survive untouched.
(function () {
  window.LESSONS = window.LESSONS || [];
  const SECTION = 'Scaling, Security & Ops';

  // ---------- shared pieces for the textarea-checker exercises ----------
  const CHECK_CSS = String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 12px; font-size: 14px; }
  p { margin: 0 0 8px; }
  textarea { width: 100%; box-sizing: border-box; font-family: ui-monospace, Menlo, monospace; font-size: 13px;
    background: #fff; color: #1d2330; border: 1px solid #c5ccd9; border-radius: 6px; padding: 8px; }
  button { margin: 8px 0; padding: 6px 14px; border-radius: 6px; border: 1px solid #3b6fd8; background: #3b6fd8; color: #fff; cursor: pointer; }
  #score { margin-left: 8px; font-weight: 600; }
  ul { list-style: none; padding: 0; margin: 0; }
  li { padding: 3px 8px; margin: 2px 0; border-radius: 4px; font-size: 13px; }
  li.ok { background: #e6f6ea; color: #1b5e20; }
  li.bad { background: #fdecec; color: #8a1c1c; }
</style>`;

  // Tiny YAML reader: maps, lists, "- key: v" list items, [a, b] inline lists, quotes, # comments,
  // multi-document files (---). Good enough for checking Kubernetes manifests, not a full YAML parser.
  const MINI_YAML = String.raw`
// ---- mini YAML reader (checker plumbing, no need to edit) ----
function parseDocs(src) {
  return src.split(/^---[ \t]*$/m).map(parseYaml).filter(function (d) {
    return d && typeof d === 'object';
  });
}
function parseYaml(src) {
  var ls = [];
  src.replace(/\t/g, '  ').split('\n').forEach(function (raw) {
    var t = raw.replace(/(^|\s)#.*$/, '');
    if (t.trim()) ls.push({ ind: t.search(/\S/), text: t.trim() });
  });
  if (!ls.length) return null;
  var r = block(ls, 0, ls[0].ind);
  if (r[1] < ls.length) throw new Error('unexpected indentation near "' + ls[r[1]].text + '"');
  return r[0];
}
function isDash(t) { return t === '-' || t.indexOf('- ') === 0; }
function scalar(v) {
  v = v.trim();
  if (/^\[.*\]$/.test(v)) {
    return v.slice(1, -1).split(',').map(scalar).filter(function (x) { return x !== ''; });
  }
  if (v === '{}') return {};
  return v.replace(/^(["'])(.*)\1$/, '$2');
}
function block(ls, i, ind) {
  if (isDash(ls[i].text)) {
    var arr = [];
    while (i < ls.length && ls[i].ind === ind && isDash(ls[i].text)) {
      var rest = ls[i].text.replace(/^-\s*/, '');
      if (!rest) {
        if (i + 1 >= ls.length) { arr.push(null); i++; continue; }
        var r1 = block(ls, i + 1, ls[i + 1].ind);
        arr.push(r1[0]);
        i = r1[1];
      } else if (/^[^\s'"\[{][^:]*:(\s|$)/.test(rest)) {
        ls[i] = { ind: ind + ls[i].text.length - rest.length, text: rest };
        var r2 = block(ls, i, ls[i].ind);
        arr.push(r2[0]);
        i = r2[1];
      } else {
        arr.push(scalar(rest));
        i++;
      }
    }
    return [arr, i];
  }
  var obj = {};
  while (i < ls.length && ls[i].ind === ind && !isDash(ls[i].text)) {
    var m = ls[i].text.match(/^([^:]+?):(?:\s+(.*))?$/);
    if (!m) throw new Error('line "' + ls[i].text + '" is not "key: value"');
    var key = m[1].trim().replace(/^(["'])(.*)\1$/, '$2');
    var val = m[2];
    i++;
    if (val && /^[|>][-+]?$/.test(val)) {
      var lines = [];
      while (i < ls.length && ls[i].ind > ind) { lines.push(ls[i].text); i++; }
      obj[key] = lines.join('\n');
    } else if (val !== undefined && val !== '') {
      obj[key] = scalar(val);
    } else if (i < ls.length && (ls[i].ind > ind || (ls[i].ind === ind && isDash(ls[i].text)))) {
      var r3 = block(ls, i, ls[i].ind);
      obj[key] = r3[0];
      i = r3[1];
    } else {
      obj[key] = null;
    }
  }
  return [obj, i];
}
function get(o, path) {
  return path.split('.').reduce(function (acc, k) {
    return acc == null ? undefined : acc[k];
  }, o);
}
function findKind(docs, kind) {
  return docs.filter(function (d) { return String(d.kind).toLowerCase() === kind.toLowerCase(); })[0];
}
function asList(v) { return Array.isArray(v) ? v : v == null ? [] : [v]; }
function low(v) { return String(v == null ? '' : v).trim().toLowerCase(); }
`;

  const CHECK_RUNNER = String.raw`
// ---- run the checks (on load and on every click) ----
function check() {
  var out = document.getElementById('out');
  var results;
  out.innerHTML = '';
  try {
    results = runChecks(parseDocs(document.getElementById('f').value));
  } catch (e) {
    results = [[false, 'Could not read the YAML: ' + e.message]];
  }
  var pass = 0;
  results.forEach(function (r) {
    var li = document.createElement('li');
    li.className = r[0] ? 'ok' : 'bad';
    li.textContent = (r[0] ? '✓ ' : '✗ ') + r[1];
    out.appendChild(li);
    if (r[0]) pass++;
  });
  document.getElementById('score').textContent = pass + ' / ' + results.length + ' checks pass';
  console.log('check: ' + pass + '/' + results.length + ' passed');
}
document.getElementById('check').onclick = check;
check();
`;

  // Builds the whole exercise widget: intro text + textarea + checker script.
  function checkerWidget(intro, yaml, checksJs, height) {
    return CHECK_CSS + '\n<p>' + intro + '</p>\n' +
      '<textarea id="f" spellcheck="false" style="height:' + (height || 260) + 'px">' + yaml + '</textarea>\n' +
      '<button id="check">Check</button><span id="score"></span>\n<ul id="out"></ul>\n\n<script>\n' +
      checksJs.trim() + '\n' + MINI_YAML + CHECK_RUNNER + '</script>';
  }

  // =====================================================================
  // Lesson: Autoscaling
  // =====================================================================
  const HPA_SIM = String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; font-size: 14px; }
  .card { background: #fff; border: 1px solid #d6dbe6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 3px 0; }
  .muted { color: #5c6678; font-size: 12px; }
  button { padding: 5px 10px; border-radius: 6px; border: 1px solid #9aa5b8; background: #fff; color: #1d2330; cursor: pointer; }
  button.primary { background: #3b6fd8; border-color: #3b6fd8; color: #fff; }
  .pods { display: flex; gap: 6px; flex-wrap: wrap; min-height: 58px; margin-top: 6px; }
  .pod { width: 58px; height: 52px; border-radius: 8px; background: #e8f0ff; border: 2px solid #3b6fd8;
    display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 11px; transition: all .3s; }
  .pod.hot { background: #fff0f0; border-color: #e03131; }
  .pod.cold { background: #f1f3f5; border-color: #868e96; }
  .bar { height: 5px; width: 42px; background: #dfe3ea; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .bar i { display: block; height: 100%; background: #2f9e44; }
  .hot .bar i { background: #e03131; }
  #f { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; background: #1d2330; color: #e6edf7;
    padding: 8px 10px; border-radius: 6px; white-space: pre-wrap; min-height: 70px; }
</style>

<div class="card">
  <div class="row">
    <label>Total CPU demand
      <input id="load" type="range" min="0" max="1500" step="100" value="200">
    </label>
    <b id="loadv">200m</b>
  </div>
  <div class="row">
    <label>Target averageUtilization
      <select id="target">
        <option>30</option><option selected>50</option><option>70</option><option>90</option>
      </select> %
    </label>
    <span class="muted">request 200m per pod · minReplicas 2 · maxReplicas 10 · tolerance 10%</span>
  </div>
  <div class="row">
    <button id="sync" class="primary">HPA sync (+15s) ▶</button>
    <button id="ff">Skip 5 min ⏩</button>
    <label><input id="stab" type="checkbox" checked> scale-down stabilization (300s)</label>
    <button id="reset">Reset</button>
  </div>
</div>

<div class="card">
  <div class="row">
    <b>t = <span id="t">0</span>s</b>
    <span>replicas: <b id="n">2</b></span>
    <span>avg CPU: <b id="util">50%</b> of request</span>
  </div>
  <div class="pods" id="pods"></div>
</div>

<div id="f"></div>

<script>
  var TARGET = 50;   // averageUtilization (% of the CPU request), changed by the select
  var REQ = 200;     // resources.requests.cpu: 200m
  var MIN = 2;
  var MAX = 10;
  var TOL = 0.1;     // HPA ignores ratios within 10% of 1.0
  var WINDOW = 300;  // behavior.scaleDown.stabilizationWindowSeconds

  var slider = document.getElementById('load');
  var stab = document.getElementById('stab');
  var box = document.getElementById('f');
  var t, n, load, recs;

  function utilNow() {
    // metrics-server reports usage; HPA divides by the request -> integer percent
    return Math.round(load / n / REQ * 100);
  }

  function draw() {
    var u = utilNow();
    document.getElementById('t').textContent = t;
    document.getElementById('n').textContent = n;
    document.getElementById('util').textContent = u + '%';
    document.getElementById('loadv').textContent = load + 'm';
    var pods = document.getElementById('pods');
    pods.innerHTML = '';
    for (var i = 0; i < n; i++) {
      var d = document.createElement('div');
      d.className = 'pod' + (u > TARGET * 1.1 ? ' hot' : u < TARGET * 0.9 ? ' cold' : '');
      d.innerHTML = 'web-' + (i + 1) + '<br>' + Math.round(load / n) + 'm' +
        '<div class="bar"><i style="width:' + Math.min(100, u) + '%"></i></div>';
      pods.appendChild(d);
    }
  }

  function sync() {
    t += 15;
    var u = utilNow();
    var ratio = u / TARGET;
    var raw = Math.ceil(n * u / TARGET);
    var lines = ['t=' + t + 's  currentReplicas=' + n + '  avg CPU=' + u + '% (target ' + TARGET + '%)'];
    var desired;

    if (Math.abs(ratio - 1) <= TOL) {
      desired = n;
      lines.push('ratio ' + ratio.toFixed(2) + ' is within the 10% tolerance -> no change');
    } else {
      desired = Math.min(MAX, Math.max(MIN, raw));
      lines.push('desired = ceil(' + n + ' × ' + u + ' / ' + TARGET + ') = ceil(' +
        (n * u / TARGET).toFixed(2) + ') = ' + raw);
      if (desired !== raw) lines.push('clamped to [min ' + MIN + ', max ' + MAX + '] -> ' + desired);
    }

    // remember every recommendation for the stabilization window
    recs.push({ t: t, v: desired });
    recs = recs.filter(function (r) { return t - r.t < WINDOW; });

    var next = desired;
    if (desired < n && stab.checked) {
      var hi = Math.max.apply(null, recs.map(function (r) { return r.v; }));
      next = Math.min(n, hi);
      if (next !== desired) {
        lines.push('scale-down held: highest recommendation in last 300s = ' + hi);
      }
    }

    lines.push(next === n ? 'replicas stay ' + n : 'SCALE ' + n + ' -> ' + next);
    console.log('[t=' + t + 's] ' + n + ' pods @ ' + u + '% -> desired ' + desired + ' -> ' +
      (next === n ? 'stay ' + n : 'scale ' + n + ' -> ' + next));
    n = next;
    draw();
    box.textContent = lines.join('\n');
  }

  function reset() {
    t = 0;
    n = 2;
    load = 200;
    recs = [];
    TARGET = 50;
    document.getElementById('target').value = '50';
    slider.value = 200;
    draw();
    box.textContent = 'Move the slider, then click "HPA sync".';
    console.log('$ kubectl get hpa web');
    console.log('NAME   REFERENCE        TARGETS        MINPODS   MAXPODS   REPLICAS');
    console.log('web    Deployment/web   cpu: 50%/50%   2         10        2');
  }

  slider.oninput = function () {
    load = Number(slider.value);
    draw();
  };
  slider.onchange = function () {
    console.log('load -> ' + load + 'm (nothing scales until the next HPA sync)');
  };
  document.getElementById('target').onchange = function (e) {
    TARGET = Number(e.target.value);
    draw();
    console.log('HPA target -> averageUtilization: ' + TARGET + '% (applies at the next sync)');
  };
  document.getElementById('sync').onclick = sync;
  document.getElementById('ff').onclick = function () {
    for (var i = 0; i < 20; i++) sync();
  };
  document.getElementById('reset').onclick = reset;
  reset();
</script>`;

  const HPA_WALK = `
<details>
  <summary>The problem: a fixed <code>replicas: 3</code> is wrong most of the day</summary>
  <p>With Compose you pick a number (<code>docker compose up --scale web=3</code>) and it stays that way. Real traffic isn't flat: at 3 a.m. three pods waste money, at a lunchtime spike three pods max out and requests queue up.</p>
  <p>The <strong>HorizontalPodAutoscaler</strong> (HPA) is a control loop that, every <strong>15 seconds</strong>, reads the average usage of your pods and edits the Deployment's <code>replicas</code> for you. Think of a supermarket manager watching queue length and opening or closing tills.</p>
  <p>The whole decision is one formula:</p>
  <pre><code class="language-bash">desiredReplicas = ceil( currentReplicas × currentMetric / targetMetric )</code></pre>
  <p>For CPU, <code>currentMetric</code> is <em>usage as a % of the pod's CPU request</em>. That's why the HPA needs <code>resources.requests.cpu</code>: without a request there is no 100%, so the target reads <code>&lt;unknown&gt;</code>.</p>
</details>
<details>
  <summary>Step by step: slider to 900m, sync twice, slider to 200m, sync, skip 5 min</summary>
  <p>The demo: request = 200m per pod, target = 50% (the default in the Target select), so each pod "should" use 100m. Start from <em>Reset</em> (2 pods, 200m total, 50%).</p>
  <table>
    <tr><th>Action</th><th>Numbers the HPA sees</th><th>Formula box</th><th>Console</th></tr>
    <tr><td>Slider → 900m</td><td>2 pods × 450m. Nothing changes yet</td><td>(unchanged)</td><td><code>load -&gt; 900m (nothing scales until the next HPA sync)</code></td></tr>
    <tr><td>HPA sync (t=15s)</td><td>450m / 200m = <strong>225%</strong></td><td><code>desired = ceil(2 × 225 / 50) = ceil(9.00) = 9</code> → <code>SCALE 2 -&gt; 9</code></td><td><code>[t=15s] 2 pods @ 225% -&gt; desired 9 -&gt; scale 2 -&gt; 9</code></td></tr>
    <tr><td>HPA sync (t=30s)</td><td>900m / 9 = 100m = <strong>50%</strong></td><td><code>ratio 1.00 is within the 10% tolerance -&gt; no change</code></td><td><code>[t=30s] 9 pods @ 50% -&gt; desired 9 -&gt; stay 9</code></td></tr>
    <tr><td>Slider → 200m, HPA sync (t=45s)</td><td>200m / 9 ≈ 22m = <strong>11%</strong></td><td><code>desired = ceil(9 × 11 / 50) = ceil(1.98) = 2</code>, then <code>scale-down held: highest recommendation in last 300s = 9</code></td><td><code>[t=45s] 9 pods @ 11% -&gt; desired 2 -&gt; stay 9</code></td></tr>
    <tr><td>Skip 5 min (t=60…315s)</td><td>Still 11%. The "9" recommendations from t=15s and t=30s are still inside the window</td><td>held at 9</td><td><code>[t=60s] 9 pods @ 11% -&gt; desired 2 -&gt; stay 9</code> … up to t=315s</td></tr>
    <tr><td>(same skip) t=330s</td><td>The t=30s "9" is now 300s old and drops out. Highest remaining = 2</td><td><code>SCALE 9 -&gt; 2</code></td><td><code>[t=330s] 9 pods @ 11% -&gt; desired 2 -&gt; scale 9 -&gt; 2</code></td></tr>
    <tr><td>(same skip) t=345s</td><td>200m / 2 = 100m = 50%</td><td>within tolerance</td><td><code>[t=345s] 2 pods @ 50% -&gt; desired 2 -&gt; stay 2</code></td></tr>
  </table>
  <p>Notice the formula <strong>converges in one step</strong>: 900m of demand ÷ 100m per pod = 9 pods, and the next sync confirms it. Scaling <em>up</em> is immediate (scale-up window is 0s by default). Scaling <em>down</em> waits 300s, so a short dip doesn't kill pods you'll need again in a minute.</p>
</details>
<details>
  <summary>Key lines explained: the HPA spec behind the widget</summary>
  <pre><code class="language-yaml">spec:
  minReplicas: 2                     # ④ floor
  maxReplicas: 10                    # ④ ceiling
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization          # ① % of resources.requests.cpu (200m here)
          averageUtilization: 50     # ② the "Target" select in the widget
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300   # ③ the checkbox
# ...and in the Deployment:  resources.requests.cpu: 200m</code></pre>
  <ol>
    <li><strong>①</strong> Utilization is usage ÷ request. A pod using 450m with a 200m request is at 225%. It can go above 100% when there's no CPU limit (or the limit is higher than the request).</li>
    <li><strong>②</strong> The target decides how much each pod <em>should</em> use: 50% of 200m = 100m, so demand ÷ 100m is roughly the replica count you end up with. At 9 pods and 900m, switch Target to 70 and sync: <code>desired = ceil(9 × 50 / 70) = ceil(6.43) = 7</code>. It's a scale-down, so the checkbox window holds it at 9 until the old recommendations expire.</li>
    <li><strong>③</strong> The HPA remembers every recommendation from the last 300s and scales down only to the <em>highest</em> of them. Untick the checkbox and the pods drop at the very next sync.</li>
    <li><strong>④</strong> The formula result is clamped to <code>[minReplicas, maxReplicas]</code>. Try 1500m: the formula asks for 15, and you get 10. That's your cost ceiling.</li>
  </ol>
  <p>Each sync also skips changes when <code>currentMetric / target</code> is within <strong>10%</strong> of 1.0 (the tolerance), which stops flapping between, say, 4 and 5 replicas. The real sync period is 15s (<code>--horizontal-pod-autoscaler-sync-period</code> on kube-controller-manager).</p>
</details>
<details>
  <summary>Try this / common mistakes</summary>
  <ul>
    <li>Set 1500m and sync: <code>clamped to [min 2, max 10] -&gt; 10</code>. Then sync again: 10 pods at 75%, which is still above target, but you're at <code>maxReplicas</code>.</li>
    <li>Set 0m: the formula gives 0, clamped up to <code>minReplicas</code> 2.</li>
    <li>Get to 9 pods, then set 1000m: 111m per pod = 56%, ratio 1.12, just outside the tolerance, so <code>ceil(9 × 56 / 50) = ceil(10.08) = 11</code>, clamped to 10. At 900m it stayed put, because the ratio was exactly 1.00.</li>
  </ul>
  <div class="warn">Keeping <code>replicas: 3</code> in the Deployment YAML you <code>kubectl apply</code> on every deploy resets the HPA's choice each time. Once an HPA owns a Deployment, remove <code>replicas</code> from the manifest (or leave it out of your Helm/Kustomize output).</div>
  <div class="tip">TARGETS showing <code>cpu: &lt;unknown&gt;/50%</code> means one of two things: metrics-server isn't installed/ready, or the pods have no CPU <strong>request</strong>.</div>
</details>`;

  window.LESSONS.push({
    id: 'autoscaling',
    section: SECTION,
    title: 'Autoscaling (HPA, VPA, cluster autoscaler)',
    explain: `
<p>So far you've set <code>replicas</code> by hand. Kubernetes can adjust capacity for you on three levels. Each one is a separate controller that answers a different question:</p>
<table>
  <tr><th>Autoscaler</th><th>Question it answers</th><th>What it changes</th></tr>
  <tr><td><strong>HPA</strong> (Horizontal Pod Autoscaler)</td><td>Do I need <em>more or fewer pods</em>?</td><td><code>spec.replicas</code> of a Deployment/StatefulSet</td></tr>
  <tr><td><strong>VPA</strong> (Vertical Pod Autoscaler)</td><td>Are my pods' <em>requests the right size</em>?</td><td>CPU/memory requests (and limits) of the pods</td></tr>
  <tr><td><strong>Cluster Autoscaler / Karpenter</strong></td><td>Do I need <em>more or fewer nodes</em>?</td><td>Adds/removes VMs in your cloud</td></tr>
</table>
<p>Docker Compose has nothing like this. <code>--scale</code> is a number you type. Here you declare a <em>target</em> ("keep average CPU at 50% of request") and a controller keeps working toward it.</p>

<h3>HPA: the formula</h3>
<pre><code class="language-bash">desiredReplicas = ceil( currentReplicas × currentMetric / targetMetric )

# 4 pods at 90% CPU, target 60%  →  ceil(4 × 90 / 60) = ceil(6.0) = 6 pods
# 6 pods at 20% CPU, target 60%  →  ceil(6 × 20 / 60) = ceil(2.0) = 2 pods (after the scale-down window)</code></pre>
<ul>
  <li><strong>Needs metrics-server</strong>: a small add-on that collects CPU/memory usage from each kubelet. Managed clusters usually ship it. On kind you install it yourself.</li>
  <li><strong>Needs resource requests</strong>: CPU "utilization" means <em>usage ÷ request</em>. No request, no percentage.</li>
  <li><strong>min / max</strong>: <code>minReplicas</code> keeps a floor for availability. <code>maxReplicas</code> caps your bill.</li>
  <li><strong>Tolerance</strong>: ratios within 10% of 1.0 are ignored, which stops constant flapping.</li>
  <li><strong>Stabilization window</strong>: scale-<em>down</em> waits for the highest recommendation of the last <strong>300 s</strong> (default). Scale-<em>up</em> reacts immediately (0 s). Both are tunable under <code>spec.behavior</code>.</li>
</ul>
<p>Use <code>apiVersion: autoscaling/v2</code>. It supports multiple metrics (CPU, memory, custom/external metrics like queue length) and the <code>behavior</code> block. <code>autoscaling/v1</code> only does CPU.</p>

<h3>VPA: right-sizing requests</h3>
<p>The VPA (a separate add-on, not built in) watches actual usage and recommends or applies better requests. Since Kubernetes <strong>1.35</strong>, <em>in-place pod resize</em> is GA, so the VPA's <code>InPlaceOrRecreate</code> mode can often resize a running pod without restarting it. Many teams run the VPA in <code>Off</code> (recommend-only) mode and copy its numbers into their manifests.</p>
<div class="warn">Don't let the HPA and the VPA both act on <strong>CPU/memory</strong> for the same workload. The VPA raises requests, which lowers utilization %, so the HPA scales in, the VPA reacts again, and the two fight. Combine them only when the HPA uses a custom metric (e.g. requests/sec).</div>

<h3>Cluster Autoscaler &amp; Karpenter: more nodes</h3>
<p>The HPA can ask for 10 pods, but if the nodes are full, the extra pods sit in <code>Pending</code>. The <strong>Cluster Autoscaler</strong> notices unschedulable pods and grows a node group. It also removes nodes that stay under-used. <strong>Karpenter</strong> (AWS-born, now also on Azure) skips node groups and provisions a right-sized VM for the pending pods directly. Either way, the chain is: <em>load ↑ → HPA adds pods → pods Pending → node autoscaler adds a node → pods run</em>.</p>
<div class="tip">Event-driven scaling (scale on queue depth, Kafka lag, cron, even down to zero) is usually done with <strong>KEDA</strong>. It creates and feeds an HPA for you.</div>
`,
    examples: [
      {
        title: 'HPA simulator: CPU load slider → replicas, step by step',
        lang: 'html',
        code: HPA_SIM,
        explain: HPA_WALK,
      },
      {
        title: 'HPA manifest (autoscaling/v2) with behavior',
        runnable: false,
        lang: 'yaml',
        code: `# hpa.yaml — scales Deployment "web" between 2 and 10 pods at 50% CPU of request
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: web
spec:
  scaleTargetRef:              # which workload to scale
    apiVersion: apps/v1
    kind: Deployment
    name: web
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization    # % of resources.requests.cpu
          averageUtilization: 50
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 0      # default: react immediately
    scaleDown:
      stabilizationWindowSeconds: 300    # default: wait 5 min before shrinking
      policies:
        - type: Percent                  # remove at most 50% of pods per minute
          value: 50
          periodSeconds: 60
---
# The Deployment MUST set a CPU request, and should NOT set replicas (the HPA owns it)
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
spec:
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
          image: ghcr.io/acme/web:1.4.2
          resources:
            requests:
              cpu: 200m
              memory: 128Mi
            limits:
              memory: 256Mi`,
      },
      {
        title: 'Try it on kind: metrics-server, load generator, watch the HPA',
        runnable: false,
        lang: 'bash',
        code: String.raw`# 1) metrics-server (kind's kubelets use self-signed certs, hence --kubelet-insecure-tls)
$ kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
$ kubectl -n kube-system patch deployment metrics-server --type=json \
    -p '[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--kubelet-insecure-tls"}]'
$ kubectl top pods
NAME                   CPU(cores)   MEMORY(bytes)
web-6d4b8c9f7-2xkqp    98m          41Mi
web-6d4b8c9f7-9mzvt    102m         40Mi

# 2) the HPA
$ kubectl apply -f hpa.yaml
horizontalpodautoscaler.autoscaling/web created

# 3) generate load from a throwaway pod
$ kubectl run load --image=busybox:1.36 --restart=Never -- \
    /bin/sh -c "while true; do wget -q -O- http://web; done"

# 4) watch it react
$ kubectl get hpa web --watch
NAME   REFERENCE        TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
web    Deployment/web   cpu: 50%/50%    2         10        2          1m
web    Deployment/web   cpu: 225%/50%   2         10        2          2m
web    Deployment/web   cpu: 225%/50%   2         10        9          2m
web    Deployment/web   cpu: 50%/50%    2         10        9          3m

$ kubectl describe hpa web | tail -4
Events:
  Type    Reason             Age   From                       Message
  ----    ------             ----  ----                       -------
  Normal  SuccessfulRescale  61s   horizontal-pod-autoscaler  New size: 9; reason: cpu resource utilization (percentage of request) above target

# 5) stop the load, then wait ~5 min for the scale-down window
$ kubectl delete pod load`,
      },
    ],
    quiz: [
      {
        q: 'An HPA targets 60% CPU. There are 4 replicas averaging 90% of their CPU request. What does it ask for?',
        options: ['5', '6', '7', '4 (within tolerance)'],
        answer: 1,
        why: 'ceil(4 × 90 / 60) = ceil(6.0) = 6. The ratio 1.5 is far outside the 10% tolerance.',
      },
      {
        q: '<code>kubectl get hpa</code> shows <code>cpu: &lt;unknown&gt;/50%</code>. What are the two usual causes?',
        options: [
          'The Deployment has too many replicas, or the Service is missing',
          'metrics-server is missing/not ready, or the pods have no CPU request',
          'The HPA uses autoscaling/v2 instead of v1',
          'maxReplicas is lower than minReplicas',
        ],
        answer: 1,
        why: 'Utilization = usage ÷ request. With no metrics (metrics-server) or no request, there is nothing to divide.',
      },
      {
        q: 'Load dropped 1 minute ago but the HPA still runs 9 pods. Why?',
        options: [
          'The HPA only scales up, never down',
          'The default 300s scale-down stabilization window keeps the highest recent recommendation',
          'metrics-server caches for 10 minutes',
          'Pods can only be removed during a rolling update',
        ],
        answer: 1,
        why: 'Scale-down waits until all recommendations from the last 300s are lower. This avoids flapping on short dips.',
      },
      {
        q: 'The HPA raised replicas from 5 to 12, but 4 new pods stay <code>Pending</code>. Which component fixes that?',
        options: ['The VPA', 'kube-proxy', 'Cluster Autoscaler or Karpenter', 'A second HPA'],
        answer: 2,
        why: 'The HPA only creates pods. Adding nodes when pods can\'t be scheduled is the node autoscaler\'s job.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `<p><em>Edit the manifest in the box below and click Check.</em></p>
<p>The <code>api</code> Deployment still uses an old <strong>autoscaling/v1</strong> HPA. Rewrite it as <code>autoscaling/v2</code>:</p>
<ul>
  <li><code>scaleTargetRef</code> → <code>apps/v1</code> Deployment named <code>api</code></li>
  <li>between <strong>3</strong> and <strong>12</strong> replicas</li>
  <li>a <code>Resource</code> metric on <code>cpu</code>, <code>type: Utilization</code>, <code>averageUtilization: 70</code></li>
  <li><code>behavior.scaleDown.stabilizationWindowSeconds: 600</code> (this app has spiky traffic)</li>
</ul>`,
      starter: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: autoscaling/v1
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 1
  maxReplicas: 12
  targetCPUUtilizationPercentage: 70`,
        HPA_CHECKS(), 300),
      hint: 'In v2 the CPU target moves into spec.metrics: a list with one item of type: Resource, and under resource: name: cpu plus target: { type: Utilization, averageUtilization: 70 }. The behavior block sits directly under spec.',
      solution: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  minReplicas: 3
  maxReplicas: 12
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 600`,
        HPA_CHECKS(), 300),
    },
  });

  function HPA_CHECKS() {
    return String.raw`
function runChecks(docs) {
  var h = findKind(docs, 'HorizontalPodAutoscaler') || {};
  var s = h.spec || {};
  var ref = s.scaleTargetRef || {};
  var cpu = asList(s.metrics).filter(function (m) {
    return m && low(m.type) === 'resource' && low(get(m, 'resource.name')) === 'cpu';
  })[0];
  return [
    [low(h.apiVersion) === 'autoscaling/v2', 'apiVersion is autoscaling/v2'],
    [low(ref.kind) === 'deployment' && low(ref.name) === 'api' && low(ref.apiVersion) === 'apps/v1',
      'scaleTargetRef points at apps/v1 Deployment "api"'],
    [String(s.minReplicas) === '3', 'minReplicas: 3'],
    [String(s.maxReplicas) === '12', 'maxReplicas: 12'],
    [!!cpu, 'spec.metrics has a Resource metric for cpu'],
    [!!cpu && low(get(cpu, 'resource.target.type')) === 'utilization' &&
      String(get(cpu, 'resource.target.averageUtilization')) === '70',
      'cpu target is type: Utilization, averageUtilization: 70'],
    [s.targetCPUUtilizationPercentage === undefined, 'old v1 field targetCPUUtilizationPercentage removed'],
    [String(get(s, 'behavior.scaleDown.stabilizationWindowSeconds')) === '600',
      'behavior.scaleDown.stabilizationWindowSeconds: 600'],
  ];
}`;
  }

  // =====================================================================
  // Lesson: ServiceAccounts & RBAC
  // =====================================================================
  const RBAC_SIM = String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; font-size: 13.5px; }
  .card { background: #fff; border: 1px solid #d6dbe6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  select, button { padding: 4px 8px; border-radius: 6px; border: 1px solid #9aa5b8; background: #fff; color: #1d2330; }
  button { background: #3b6fd8; border-color: #3b6fd8; color: #fff; cursor: pointer; }
  .b { display: block; margin: 3px 0; font-size: 12.5px; }
  .b code, .res code { background: #eef1f6; padding: 0 4px; border-radius: 3px; }
  .res { padding: 8px 10px; border-radius: 8px; font-size: 13.5px; }
  .yes { background: #e6f6ea; border: 1px solid #8fd19e; color: #1b5e20; }
  .no { background: #fdecec; border: 1px solid #f1a1a1; color: #8a1c1c; }
  h4 { margin: 0 0 4px; font-size: 13px; }
</style>

<div class="card">
  <h4>Bindings in the cluster (untick to delete one)</h4>
  <div id="bindings"></div>
</div>

<div class="card row">
  <label>Who <select id="who"></select></label>
  <label>can <select id="verb"></select></label>
  <label><select id="res"></select></label>
  <label>in <select id="ns"><option>dev</option><option>prod</option></select></label>
  <button id="ask">kubectl auth can-i</button>
</div>

<div id="answer" class="res">Pick a question and click the button.</div>

<script>
  // ---- Roles: what is allowed (never who) ----
  var ROLES = {
    'Role dev/pod-reader': [
      { res: ['pods', 'pods/log'], verbs: ['get', 'list', 'watch'] },
    ],
    'Role dev/deployer': [
      { res: ['deployments'], verbs: ['get', 'list', 'watch', 'create', 'update', 'patch'] },
      { res: ['pods'], verbs: ['get', 'list'] },
    ],
    'ClusterRole view': [
      { res: ['pods', 'pods/log', 'deployments', 'services', 'configmaps'], verbs: ['get', 'list', 'watch'] },
    ],
    'ClusterRole node-reader': [
      { res: ['nodes'], verbs: ['get', 'list', 'watch'] },
    ],
  };

  // ---- Bindings: who gets which role, and where ----
  var BINDINGS = [
    { name: 'RoleBinding dev/read-pods', ns: 'dev', subject: 'User alice', role: 'Role dev/pod-reader', on: true },
    { name: 'RoleBinding dev/ci-deploy', ns: 'dev', subject: 'ServiceAccount dev/ci-deployer', role: 'Role dev/deployer', on: true },
    { name: 'RoleBinding prod/bob-view', ns: 'prod', subject: 'User bob', role: 'ClusterRole view', on: true },
    { name: 'ClusterRoleBinding sre-nodes', ns: null, subject: 'Group sre', role: 'ClusterRole node-reader', on: true },
  ];

  // ---- Subjects and the identities they present ----
  var WHO = {
    'alice': { ids: ['User alice', 'Group dev-team'], as: '--as=alice' },
    'bob (group sre)': { ids: ['User bob', 'Group sre'], as: '--as=bob --as-group=sre' },
    'ci-deployer (SA in dev)': {
      ids: ['ServiceAccount dev/ci-deployer'],
      as: '--as=system:serviceaccount:dev:ci-deployer',
    },
    'default (SA in prod)': { ids: ['ServiceAccount prod/default'], as: '--as=system:serviceaccount:prod:default' },
  };
  var VERBS = ['get', 'list', 'watch', 'create', 'update', 'patch', 'delete'];
  var RES = ['pods', 'pods/log', 'deployments', 'services', 'secrets', 'configmaps', 'nodes'];
  var CLUSTER_SCOPED = { nodes: true };

  function fillSelect(id, items) {
    var sel = document.getElementById(id);
    items.forEach(function (x) {
      var o = document.createElement('option');
      o.textContent = x;
      sel.appendChild(o);
    });
  }
  fillSelect('who', Object.keys(WHO));
  fillSelect('verb', VERBS);
  fillSelect('res', RES);

  var bl = document.getElementById('bindings');
  BINDINGS.forEach(function (b, i) {
    var l = document.createElement('label');
    l.className = 'b';
    l.innerHTML = '<input type="checkbox" checked data-i="' + i + '"> <code>' + b.name + '</code>: ' +
      b.subject + ' → <code>' + b.role + '</code>';
    bl.appendChild(l);
  });
  bl.onchange = function (e) {
    var b = BINDINGS[Number(e.target.getAttribute('data-i'))];
    b.on = e.target.checked;
    var kind = b.name.split(' ')[0].toLowerCase();
    var name = b.name.split(' ')[1].split('/').pop();
    console.log(b.on ? '# re-created ' + b.name
      : '$ kubectl delete ' + kind + ' ' + name + (b.ns ? ' -n ' + b.ns : ''));
  };

  function canI(who, verb, res, ns) {
    var ids = WHO[who].ids;
    for (var i = 0; i < BINDINGS.length; i++) {
      var b = BINDINGS[i];
      if (!b.on || ids.indexOf(b.subject) < 0) continue;
      // a RoleBinding only grants inside its own namespace, and never cluster-scoped resources
      if (b.ns !== null && (CLUSTER_SCOPED[res] || b.ns !== ns)) continue;
      var rules = ROLES[b.role];
      for (var j = 0; j < rules.length; j++) {
        if (rules[j].res.indexOf(res) >= 0 && rules[j].verbs.indexOf(verb) >= 0) {
          return { ok: true, b: b, rule: rules[j] };
        }
      }
    }
    return { ok: false };
  }

  document.getElementById('ask').onclick = function () {
    var who = document.getElementById('who').value;
    var verb = document.getElementById('verb').value;
    var res = document.getElementById('res').value;
    var ns = document.getElementById('ns').value;
    var r = canI(who, verb, res, ns);
    var cmd = '$ kubectl auth can-i ' + verb + ' ' + res + (CLUSTER_SCOPED[res] ? '' : ' -n ' + ns) +
      ' ' + WHO[who].as;
    var box = document.getElementById('answer');
    console.log(cmd);
    console.log(r.ok ? 'yes' : 'no');
    if (r.ok) {
      box.className = 'res yes';
      box.innerHTML = '<b>yes</b>: allowed by <code>' + r.b.name + '</code> → <code>' + r.b.role +
        '</code> (rule: ' + r.rule.res.join(', ') + ' [' + r.rule.verbs.join(' ') + '])' +
        (r.b.ns ? '. Only valid in namespace <b>' + r.b.ns + '</b>.' : '. Valid cluster-wide.');
    } else {
      box.className = 'res no';
      box.innerHTML = '<b>no</b>: no enabled binding for ' + WHO[who].ids.join(' / ') + ' grants <code>' +
        verb + '</code> on <code>' + res + '</code>' + (CLUSTER_SCOPED[res] ? ' (cluster-scoped)' : ' in ' + ns) +
        '. RBAC denies by default.';
    }
  };
</script>`;

  window.LESSONS.push({
    id: 'rbac',
    section: SECTION,
    title: 'ServiceAccounts & RBAC',
    explain: `
<p>With Docker, whoever can reach the Docker socket is effectively root on the host. There is no "Bob can see containers but not delete them". Kubernetes has a real permission system, and you need it: people, CI pipelines and pods <em>inside</em> the cluster all call the same API server.</p>

<h3>Who: users, groups, ServiceAccounts</h3>
<ul>
  <li><strong>Users &amp; groups</strong> aren't Kubernetes objects. They come from your authentication (client certs, OIDC via your cloud IAM, etc.). Kubernetes only sees a name like <code>alice</code> and groups like <code>sre</code>.</li>
  <li><strong>ServiceAccounts</strong> <em>are</em> objects, one identity per app. Every namespace has a <code>default</code> SA, and pods use it unless you set <code>serviceAccountName</code>. The pod gets a short-lived, auto-rotated token mounted at <code>/var/run/secrets/kubernetes.io/serviceaccount/token</code>. Its full name is <code>system:serviceaccount:&lt;ns&gt;:&lt;name&gt;</code>.</li>
</ul>

<h3>What: Roles; where: Bindings</h3>
<p>RBAC splits permissions into two kinds of objects. It's like a building. A <strong>Role</strong> is a key card profile ("opens rooms 3 and 4"). A <strong>Binding</strong> hands that profile to a person.</p>
<table>
  <tr><th></th><th>Namespaced (one namespace)</th><th>Cluster-wide</th></tr>
  <tr><td>What is allowed</td><td><code>Role</code></td><td><code>ClusterRole</code> (also covers nodes, PVs, namespaces…)</td></tr>
  <tr><td>Who gets it</td><td><code>RoleBinding</code></td><td><code>ClusterRoleBinding</code></td></tr>
</table>
<p>A rule is <em>apiGroups + resources + verbs</em>. The verbs are <code>get list watch create update patch delete</code> (plus <code>deletecollection</code>, and special ones like <code>impersonate</code>). Sub-resources are separate: <code>pods/log</code> and <code>pods/exec</code> are not included in <code>pods</code>.</p>
<ul>
  <li>RBAC is <strong>additive and deny-by-default</strong>. There are no "deny" rules. If nothing grants it, it's forbidden.</li>
  <li>A <strong>RoleBinding can point at a ClusterRole</strong>. That grants the ClusterRole's rules <em>only in the binding's namespace</em>, so you can define "viewer" once and reuse it per namespace. Built-in ones: <code>view</code>, <code>edit</code>, <code>admin</code>, <code>cluster-admin</code>.</li>
  <li><strong>Least privilege</strong>: one ServiceAccount per app, only the verbs it needs, avoid <code>"*"</code>. Set <code>automountServiceAccountToken: false</code> for pods that never call the API.</li>
</ul>
<pre><code class="language-bash">$ kubectl auth can-i create deployments -n dev --as=system:serviceaccount:dev:ci-deployer
yes
$ kubectl auth can-i --list -n dev --as=alice      # everything alice may do in dev</code></pre>

<h3>Locking down the pod itself</h3>
<p>RBAC controls API calls. <code>securityContext</code> controls what the <em>process</em> may do on the node. It's the K8s version of <code>docker run --user 1000 --read-only --cap-drop ALL</code>:</p>
<pre><code class="language-yaml">securityContext:              # pod level
  runAsNonRoot: true          # refuse to start if the image would run as UID 0
  seccompProfile:
    type: RuntimeDefault
containers:
  - name: app
    securityContext:          # container level
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true   # mount an emptyDir for /tmp if the app needs to write
      capabilities:
        drop: ["ALL"]</code></pre>
<p><strong>Pod Security Admission</strong> (built in, replaced PodSecurityPolicy) enforces this per namespace with a label. There are three levels: <code>privileged</code> (anything goes), <code>baseline</code> (blocks obvious escalations like hostPath and privileged containers), and <code>restricted</code> (requires the settings above). Modes: <code>enforce</code>, <code>audit</code>, <code>warn</code>.</p>
<div class="tip">Roll PSA out safely: first label the namespace <code>pod-security.kubernetes.io/warn: restricted</code>. <code>kubectl apply</code> then prints warnings without blocking. Fix the manifests, then switch to <code>enforce</code>.</div>
`,
    examples: [
      {
        title: 'RBAC simulator: can this subject do that?',
        lang: 'html',
        code: RBAC_SIM,
        explain: `
<details>
  <summary>Try this: four questions that show how RBAC really works</summary>
  <table>
    <tr><th>Ask</th><th>Answer</th><th>Why</th></tr>
    <tr><td>alice · list · pods · dev</td><td>yes</td><td><code>RoleBinding dev/read-pods</code> → <code>Role dev/pod-reader</code></td></tr>
    <tr><td>alice · delete · pods · dev</td><td>no</td><td>The role only has get/list/watch. There is no rule to "deny"; nothing grants it, so it's refused.</td></tr>
    <tr><td>bob (group sre) · list · pods · <strong>dev</strong></td><td>no</td><td>He has <code>ClusterRole view</code>, but through a <em>RoleBinding in prod</em>, so it only counts in prod. Switch to prod: yes.</td></tr>
    <tr><td>bob (group sre) · list · nodes</td><td>yes</td><td>Nodes are cluster-scoped. Only a ClusterRoleBinding (<code>sre-nodes</code>, matched via his <em>group</em>) can grant them.</td></tr>
    <tr><td>default (SA in prod) · get · secrets</td><td>no</td><td>A fresh ServiceAccount has no permissions. Also note that <code>view</code> in the demo, like the real one, doesn't include secrets.</td></tr>
  </table>
  <p>Then untick <code>RoleBinding dev/ci-deploy</code> and ask again whether ci-deployer can <code>create deployments</code> in dev. The answer flips to <strong>no</strong>: the Role still exists, but nobody holds it.</p>
</details>`,
      },
      {
        title: 'ServiceAccount + Role + RoleBinding + hardened pod',
        runnable: false,
        lang: 'yaml',
        code: `# rbac.yaml — a CI identity that may roll out Deployments in "dev", nothing else
apiVersion: v1
kind: Namespace
metadata:
  name: dev
  labels:
    pod-security.kubernetes.io/enforce: restricted   # Pod Security Admission
    pod-security.kubernetes.io/warn: restricted
---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: ci-deployer
  namespace: dev
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: dev
rules:
  - apiGroups: ["apps"]              # Deployments live in the "apps" API group
    resources: ["deployments"]
    verbs: ["get", "list", "watch", "create", "update", "patch"]
  - apiGroups: [""]                  # "" = core group (pods, services, configmaps…)
    resources: ["pods"]
    verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy
  namespace: dev
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: dev
roleRef:                             # immutable: delete + recreate to change it
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployer
---
# An app pod that never calls the API and runs locked down (passes "restricted")
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: dev
spec:
  automountServiceAccountToken: false
  securityContext:
    runAsNonRoot: true
    runAsUser: 10001
    seccompProfile:
      type: RuntimeDefault
  containers:
    - name: web
      image: ghcr.io/acme/web:1.4.2
      securityContext:
        allowPrivilegeEscalation: false
        readOnlyRootFilesystem: true
        capabilities:
          drop: ["ALL"]
      volumeMounts:
        - name: tmp
          mountPath: /tmp
  volumes:
    - name: tmp
      emptyDir: {}`,
      },
      {
        title: 'Checking permissions and seeing Pod Security Admission reject a pod',
        runnable: false,
        lang: 'bash',
        code: String.raw`$ kubectl apply -f rbac.yaml
namespace/dev created
serviceaccount/ci-deployer created
role.rbac.authorization.k8s.io/deployer created
rolebinding.rbac.authorization.k8s.io/ci-deploy created
pod/web created

$ kubectl auth can-i patch deployments -n dev --as=system:serviceaccount:dev:ci-deployer
yes
$ kubectl auth can-i delete deployments -n dev --as=system:serviceaccount:dev:ci-deployer
no
$ kubectl auth can-i list pods -n prod --as=system:serviceaccount:dev:ci-deployer
no

# a short-lived token for the CI system (no long-lived Secret tokens needed)
$ kubectl create token ci-deployer -n dev --duration=1h
eyJhbGciOiJSUzI1NiIsImtpZCI6...

# a root, privileged-ish pod is rejected by the "restricted" namespace
$ kubectl run debug -n dev --image=busybox:1.36 -- sleep 3600
Error from server (Forbidden): pods "debug" is forbidden: violates PodSecurity "restricted:latest":
allowPrivilegeEscalation != false (container "debug" must set securityContext.allowPrivilegeEscalation=false),
unrestricted capabilities (container "debug" must set securityContext.capabilities.drop=["ALL"]),
runAsNonRoot != true (pod or container "debug" must set securityContext.runAsNonRoot=true),
seccompProfile (pod or container "debug" must set securityContext.seccompProfile.type to "RuntimeDefault" or "Localhost")`,
      },
    ],
    quiz: [
      {
        q: 'A <code>RoleBinding</code> in namespace <code>team-a</code> references the <code>ClusterRole</code> <code>edit</code>. Where can the subject edit things?',
        options: ['In every namespace', 'Only in team-a', 'Nowhere: a RoleBinding can\'t reference a ClusterRole', 'Only cluster-scoped resources'],
        answer: 1,
        why: 'A RoleBinding always limits the grant to its own namespace, even when it points at a ClusterRole. This is the standard way to reuse role definitions.',
      },
      {
        q: 'How do you forbid alice from deleting pods when another binding already allows it?',
        options: [
          'Add a Role with verbs: ["!delete"]',
          'Add a deny rule with effect: Deny',
          'You can\'t add a deny. Remove or narrow the binding/role that grants it',
          'Put alice in the system:unauthenticated group',
        ],
        answer: 2,
        why: 'RBAC is purely additive. There are no deny rules, so permissions are removed by removing grants.',
      },
      {
        q: 'A pod spec has no <code>serviceAccountName</code>. Which identity does it use to call the API?',
        options: ['cluster-admin', 'The ServiceAccount named default in the pod\'s namespace', 'No identity at all', 'The identity of the user who created it'],
        answer: 1,
        why: 'Every namespace gets a default ServiceAccount, and pods use it unless told otherwise. It has no RBAC permissions unless someone bound some.',
      },
      {
        q: 'Which command answers "can the CI account create deployments in prod?" without trying it?',
        options: [
          'kubectl get rolebindings --all-namespaces',
          'kubectl auth can-i create deployments -n prod --as=system:serviceaccount:ci:deployer',
          'kubectl describe sa deployer',
          'kubectl create deployment test --dry-run=client',
        ],
        answer: 1,
        why: '<code>kubectl auth can-i</code> with <code>--as</code> impersonation asks the API server\'s authorizer directly.',
      },
      {
        q: 'A namespace is labelled <code>pod-security.kubernetes.io/enforce: restricted</code>. Which pod is rejected?',
        options: [
          'One with runAsNonRoot: true, drop ALL capabilities, seccomp RuntimeDefault, no privilege escalation',
          'One whose container runs as root with default settings',
          'One with readOnlyRootFilesystem: true',
          'One using a ConfigMap volume',
        ],
        answer: 1,
        why: 'restricted requires non-root, dropped capabilities, allowPrivilegeEscalation=false and a seccomp profile. Default settings fail it.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `<p><em>Edit the manifest in the box below and click Check.</em></p>
<p>Someone gave the CI ServiceAccount far too much. Rewrite it with <strong>least privilege</strong>:</p>
<ul>
  <li>a namespaced <code>Role</code> named <code>deployer</code> in <code>dev</code> (not a ClusterRole)</li>
  <li>one rule: apiGroup <code>apps</code>, resource <code>deployments</code>, verbs <code>get</code>, <code>list</code>, <code>patch</code> only (no <code>"*"</code>, no <code>delete</code>)</li>
  <li>a <code>RoleBinding</code> in <code>dev</code> whose subject is the ServiceAccount <code>ci-deployer</code> (namespace <code>dev</code>) and whose <code>roleRef</code> is the Role <code>deployer</code></li>
</ul>`,
      starter: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: deployer
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["*"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: ci-deploy
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: dev
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin`,
        RBAC_CHECKS(), 330),
      hint: 'Change kind: ClusterRole → Role and add metadata.namespace: dev. Replace the wildcard rule with apiGroups: ["apps"], resources: ["deployments"], verbs: ["get", "list", "patch"]. Then ClusterRoleBinding → RoleBinding (namespace dev) with roleRef kind: Role, name: deployer.',
      solution: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: deployer
  namespace: dev
rules:
  - apiGroups: ["apps"]
    resources: ["deployments"]
    verbs: ["get", "list", "patch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: ci-deploy
  namespace: dev
subjects:
  - kind: ServiceAccount
    name: ci-deployer
    namespace: dev
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: deployer`,
        RBAC_CHECKS(), 330),
    },
  });

  function RBAC_CHECKS() {
    return String.raw`
function runChecks(docs) {
  var role = findKind(docs, 'Role');
  var rb = findKind(docs, 'RoleBinding');
  var rules = asList(role && role.rules);
  var verbs = [];
  var groups = [];
  var res = [];
  rules.forEach(function (r) {
    verbs = verbs.concat(asList(r && r.verbs).map(low));
    groups = groups.concat(asList(r && r.apiGroups).map(low));
    res = res.concat(asList(r && r.resources).map(low));
  });
  var subj = asList(rb && rb.subjects)[0] || {};
  var ref = (rb && rb.roleRef) || {};
  var noWild = verbs.concat(groups, res).indexOf('*') < 0;
  return [
    [!!role, 'a namespaced Role exists (kind: Role)'],
    [!findKind(docs, 'ClusterRole') && !findKind(docs, 'ClusterRoleBinding'), 'no ClusterRole / ClusterRoleBinding'],
    [!!role && low(get(role, 'metadata.name')) === 'deployer' && low(get(role, 'metadata.namespace')) === 'dev',
      'Role is named deployer in namespace dev'],
    [groups.indexOf('apps') >= 0 && res.indexOf('deployments') >= 0, 'rule covers apiGroup apps / resource deployments'],
    [['get', 'list', 'patch'].every(function (v) { return verbs.indexOf(v) >= 0; }), 'verbs include get, list, patch'],
    [noWild && verbs.length > 0 && verbs.every(function (v) { return ['get', 'list', 'patch'].indexOf(v) >= 0; }),
      'no "*" and no extra verbs (least privilege)'],
    [!!rb && low(get(rb, 'metadata.namespace')) === 'dev', 'RoleBinding lives in namespace dev'],
    [low(subj.kind) === 'serviceaccount' && low(subj.name) === 'ci-deployer' && low(subj.namespace) === 'dev',
      'subject is ServiceAccount ci-deployer (namespace dev)'],
    [low(ref.kind) === 'role' && low(ref.name) === 'deployer', 'roleRef is Role deployer'],
  ];
}`;
  }

  // =====================================================================
  // Lesson: Helm & Kustomize
  // =====================================================================
  const HELM_SIM = String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1.35fr 1fr; gap: 8px; }
  label.t { font-weight: 600; font-size: 12px; display: block; margin-bottom: 2px; }
  textarea, input { width: 100%; box-sizing: border-box; font-family: ui-monospace, Menlo, monospace; font-size: 12px;
    background: #fff; color: #1d2330; border: 1px solid #c5ccd9; border-radius: 6px; padding: 6px; }
  button { padding: 4px 9px; border-radius: 6px; border: 1px solid #3b6fd8; background: #3b6fd8; color: #fff; cursor: pointer; margin-top: 5px; }
  button.alt { background: #fff; color: #3b6fd8; }
  pre { margin: 6px 0 0; background: #1d2330; color: #e6edf7; padding: 8px; border-radius: 6px; font-size: 11.5px;
    max-height: 120px; overflow: auto; }
  #err { color: #c92a2a; font-size: 12px; min-height: 14px; }
  #hist { font-size: 12px; margin-top: 4px; }
  #hist span { display: inline-block; padding: 1px 6px; margin: 2px 3px 0 0; border-radius: 10px; background: #e9ecf2; }
  #hist span.cur { background: #d3f9d8; }
</style>

<div class="grid">
  <div>
    <label class="t">templates/deployment.yaml</label>
    <textarea id="tpl" spellcheck="false" style="height:228px">apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          {{- if .Values.resources.enabled }}
          resources:
            limits:
              memory: {{ .Values.resources.memory | quote }}
          {{- end }}</textarea>
  </div>
  <div>
    <label class="t">values.yaml</label>
    <textarea id="vals" spellcheck="false" style="height:150px">replicaCount: 2
image:
  repository: ghcr.io/acme/web
  tag: ""
service:
  port: 8080
resources:
  enabled: true
  memory: 256Mi</textarea>
    <label class="t">release name</label>
    <input id="rel" value="shop">
    <button id="up">helm upgrade --install</button>
    <button id="rb" class="alt">helm rollback</button>
  </div>
</div>
<div id="err"></div>
<pre id="out"></pre>
<div id="hist"></div>

<script>
  var CHART = { Name: 'web', Version: '0.3.0', AppVersion: '1.4.2' };
  var revs = [];   // one entry per revision: { rev, values, status, desc, summary }

  function isEmpty(v) {
    return v == null || v === '' || v === 'false' || v === '0' || (Array.isArray(v) && !v.length);
  }
  function lookup(expr, ctx) {
    expr = expr.trim();
    var q = expr.match(/^"(.*)"$/);
    if (q) return q[1];
    if (/^-?\d+$/.test(expr)) return expr;
    if (expr.charAt(0) !== '.') throw new Error('unknown expression "' + expr + '"');
    return get(ctx, expr.slice(1));
  }
  function evalPipe(src, ctx) {
    var parts = src.split('|');
    var v = lookup(parts[0], ctx);
    parts.slice(1).forEach(function (p) {
      var w = p.trim().split(/\s+/);
      if (w[0] === 'quote') v = '"' + (v == null ? '' : v) + '"';
      else if (w[0] === 'upper') v = String(v == null ? '' : v).toUpperCase();
      else if (w[0] === 'default') { if (isEmpty(v)) v = lookup(w.slice(1).join(' '), ctx); }
      else throw new Error('function "' + w[0] + '" is not supported in this demo (try quote, upper, default)');
    });
    return v;
  }
  function render(tpl, ctx, missing) {
    var s = tpl.replace(/\s*\{\{-\s*/g, '{{ ').replace(/\s*-\}\}\s*/g, ' }}');   // whitespace chomping
    s = s.replace(/\{\{\s*if\s+(.+?)\s*\}\}([\s\S]*?)\{\{\s*end\s*\}\}/g, function (all, cond, body) {
      return isEmpty(evalPipe(cond, ctx)) ? '' : body;
    });
    return s.replace(/\{\{\s*(.+?)\s*\}\}/g, function (all, expr) {
      var v = evalPipe(expr, ctx);
      if (v == null) { missing.push(expr.trim()); return ''; }
      return typeof v === 'object' ? JSON.stringify(v) : String(v);
    });
  }

  function build(valuesText, rev) {
    var ctx = {
      Values: parseYaml(valuesText) || {},
      Release: { Name: document.getElementById('rel').value.trim() || 'release', Namespace: 'default', Revision: rev },
      Chart: CHART,
    };
    var missing = [];
    var yaml = render(document.getElementById('tpl').value, ctx, missing);
    return { yaml: yaml, missing: missing, doc: parseYaml(yaml) || {} };
  }
  function summary(doc) {
    return 'replicas ' + get(doc, 'spec.replicas') + ', image ' + get(doc, 'spec.template.spec.containers.0.image');
  }

  function preview() {
    var err = document.getElementById('err');
    try {
      var r = build(document.getElementById('vals').value, revs.length + 1);
      document.getElementById('out').textContent = r.yaml;
      err.textContent = r.missing.length ? 'rendered empty (missing value): ' + r.missing.join(', ') : '';
      return r;
    } catch (e) {
      err.textContent = 'render error: ' + e.message;
      return null;
    }
  }

  function drawHistory() {
    document.getElementById('hist').innerHTML = revs.length
      ? 'Release history: ' + revs.map(function (h) {
        return '<span class="' + (h.status === 'deployed' ? 'cur' : '') + '">rev ' + h.rev + ' · ' +
          h.status + ' · ' + h.summary + '</span>';
      }).join('')
      : 'Not installed yet: this is only <b>helm template</b> output. Nothing is in the cluster.';
  }

  function deploy(valuesText, desc) {
    revs.forEach(function (h) { h.status = 'superseded'; });
    var r = build(valuesText, revs.length + 1);
    revs.push({ rev: revs.length + 1, values: valuesText, status: 'deployed', desc: desc, summary: summary(r.doc) });
    drawHistory();
  }

  document.getElementById('up').onclick = function () {
    var r = preview();
    if (!r) return;
    var rel = document.getElementById('rel').value.trim() || 'release';
    console.log('$ helm upgrade --install ' + rel + ' ./web');
    if (!revs.length) console.log('Release "' + rel + '" does not exist. Installing it now.');
    else console.log('Release "' + rel + '" has been upgraded. Happy Helming!');
    deploy(document.getElementById('vals').value, revs.length ? 'Upgrade complete' : 'Install complete');
    document.getElementById('rel').disabled = true;
    console.log('NAME: ' + rel + '   STATUS: deployed   REVISION: ' + revs.length);
  };

  document.getElementById('rb').onclick = function () {
    var rel = document.getElementById('rel').value.trim() || 'release';
    if (revs.length < 2) { console.log('# nothing to roll back to yet: install, change values, upgrade first'); return; }
    var target = revs[revs.length - 2];
    console.log('$ helm rollback ' + rel + ' ' + target.rev);
    document.getElementById('vals').value = target.values;
    deploy(target.values, 'Rollback to ' + target.rev);
    preview();
    console.log('Rollback was a success! Happy Helming!');
    console.log('$ helm history ' + rel);
    console.log('REVISION  STATUS      DESCRIPTION');
    revs.forEach(function (h) {
      console.log((h.rev + '         ').slice(0, 10) + (h.status + '            ').slice(0, 12) + h.desc);
    });
  };

  document.getElementById('tpl').oninput = preview;
  document.getElementById('vals').oninput = preview;
  document.getElementById('rel').oninput = preview;
  preview();
  drawHistory();
  console.log('$ helm template shop ./web     # render locally, like the box below');
` + MINI_YAML + '</script>';

  window.LESSONS.push({
    id: 'helm-kustomize',
    section: SECTION,
    title: 'Packaging: Helm & Kustomize',
    explain: `
<p>A real app is a pile of YAML: Deployment, Service, ConfigMap, Ingress, HPA… and you need it in <em>dev, staging and prod</em> with small differences (replicas, image tag, hostnames). Copy-pasting three folders drifts fast. Two tools solve this in opposite ways.</p>

<h3>Helm: templates + values = a release</h3>
<p>Helm is the "package manager" for Kubernetes, like <code>apt</code> or <code>npm</code> for clusters. A <strong>chart</strong> is a folder of templated YAML:</p>
<pre><code class="language-bash">web/
  Chart.yaml          # name, chart version, appVersion
  values.yaml         # defaults: replicaCount, image.tag, ...
  templates/          # Go-template YAML: {{ .Values.replicaCount }}
    deployment.yaml
    service.yaml
    _helpers.tpl      # reusable snippets (names, labels)</code></pre>
<ul>
  <li><strong>values</strong>: chart defaults, overridden by <code>-f my-values.yaml</code> (later files win) and then by <code>--set key=value</code> (wins over everything).</li>
  <li><strong>release</strong>: one installed instance of a chart, e.g. <code>helm install shop ./web</code>. Install the same chart twice with different names and you get two independent releases.</li>
  <li><strong>revisions</strong>: every <code>upgrade</code> or <code>rollback</code> creates a new numbered revision, stored as a Secret in the namespace. <code>helm rollback shop 1</code> re-applies revision 1's manifests <em>as a new revision</em>.</li>
  <li>Charts are shared through <strong>OCI registries</strong> (the same registries as your images): <code>helm install x oci://ghcr.io/acme/charts/web --version 0.3.0</code>.</li>
</ul>
<div class="tip"><strong>Helm 4</strong> (4.0.0, released Nov 12 2025, Helm's first major version in six years): applies manifests with <em>server-side apply</em>, has a new plugin system (including WebAssembly plugins), and improves waiting on resource readiness. Existing <code>apiVersion: v2</code> charts keep working. Flag renames to watch in CI scripts: <code>--atomic</code> → <code>--rollback-on-failure</code>, <code>--force</code> → <code>--force-replace</code>.</div>

<h3>Kustomize: plain YAML + patches</h3>
<p>Kustomize has <em>no templating</em>. You keep normal, valid manifests in a <strong>base</strong>. Each environment gets an <strong>overlay</strong> that says "take the base, then change these fields". It's built into kubectl: <code>kubectl apply -k overlays/prod</code>.</p>
<pre><code class="language-yaml"># base/kustomization.yaml
resources:
  - deployment.yaml
  - service.yaml

# overlays/prod/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: prod               # set on every object
resources:
  - ../../base
images:
  - name: ghcr.io/acme/web     # rewrite the tag without touching the Deployment
    newTag: 1.4.2
replicas:
  - name: web
    count: 5
patches:
  - path: memory-limit.yaml    # strategic-merge patch: only the fields that change</code></pre>

<h3>Which one?</h3>
<table>
  <tr><th></th><th>Helm</th><th>Kustomize</th></tr>
  <tr><td>Style</td><td>Templates with logic (if, range, functions)</td><td>Plain YAML + overlays/patches</td></tr>
  <tr><td>Best for</td><td>Distributing an app to <em>others</em> (databases, ingress controllers, your platform's charts)</td><td>Your <em>own</em> app across environments</td></tr>
  <tr><td>State</td><td>Tracks releases &amp; revisions, can roll back</td><td>Stateless: just renders YAML</td></tr>
  <tr><td>Install</td><td><code>helm</code> CLI</td><td>Already in <code>kubectl</code></td></tr>
</table>
<p>Many teams use both: third-party software via Helm charts, their own services via Kustomize. GitOps tools (Argo CD, Flux) understand both.</p>
<div class="warn">Always look at what you're about to apply: <code>helm template</code> / <code>helm diff</code> (plugin) or <code>kubectl kustomize overlays/prod</code>. A wrong indent in a Helm template produces valid-looking but wrong YAML.</div>
`,
    examples: [
      {
        title: 'Helm renderer: edit values, install, upgrade, roll back',
        lang: 'html',
        code: HELM_SIM,
        explain: `
<details>
  <summary>Try this: follow a release through three revisions</summary>
  <ol>
    <li>The dark box is <code>helm template</code> output. Note <code>image: "ghcr.io/acme/web:1.4.2"</code>: <code>tag</code> is <code>""</code>, so <code>| default .Chart.AppVersion</code> falls back to the chart's appVersion <code>1.4.2</code>.</li>
    <li>Click <strong>helm upgrade --install</strong>. Console: <code>Release "shop" does not exist. Installing it now.</code> The history shows <code>rev 1 · deployed · replicas 2, image ghcr.io/acme/web:1.4.2</code>.</li>
    <li>Change <code>replicaCount: 5</code> and <code>tag: "1.5.0"</code>, then upgrade again. You get <code>rev 2 · deployed</code> and rev 1 becomes <code>superseded</code>.</li>
    <li>Click <strong>helm rollback</strong>. Console: <code>$ helm rollback shop 1</code>. The values box goes back to rev 1's values and you get <strong>rev 3</strong> (<code>Rollback to 1</code>). A rollback never rewinds the revision counter.</li>
    <li>Set <code>enabled: false</code> under <code>resources</code>. The whole <code>resources:</code> block disappears. That's <code>{{- if }} … {{- end }}</code>, and the <code>-</code> trims the blank line it would leave.</li>
    <li>Delete the line <code>port: 8080</code>. <code>containerPort:</code> renders empty and the red line says <code>rendered empty (missing value): .Values.service.port</code>. Real Helm also renders a missing key as empty without complaint (unless the template uses <code>required</code>), which is why <code>helm lint</code> and <code>helm template</code> belong in CI. (Delete the whole <code>service:</code> map and real Helm fails with a <em>nil pointer</em> error instead.)</li>
  </ol>
</details>`,
      },
      {
        title: 'A small chart: Chart.yaml, values, template, prod values',
        runnable: false,
        lang: 'yaml',
        code: `# web/Chart.yaml
apiVersion: v2              # chart API v2 (Helm 3 and Helm 4)
name: web
description: Acme web frontend
type: application
version: 0.3.0              # CHART version: bump when templates change
appVersion: "1.4.2"         # APP version: used as the default image tag
---
# web/values.yaml — defaults, every key is overridable
replicaCount: 2
image:
  repository: ghcr.io/acme/web
  tag: ""                   # empty -> .Chart.AppVersion
service:
  port: 8080
resources:
  requests:
    cpu: 100m
    memory: 128Mi
  limits:
    memory: 256Mi
---
# web/templates/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ .Release.Name }}-{{ .Chart.Name }}
  labels:
    app.kubernetes.io/name: {{ .Chart.Name }}
    app.kubernetes.io/instance: {{ .Release.Name }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app.kubernetes.io/instance: {{ .Release.Name }}
  template:
    metadata:
      labels:
        app.kubernetes.io/instance: {{ .Release.Name }}
    spec:
      containers:
        - name: {{ .Chart.Name }}
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag | default .Chart.AppVersion }}"
          ports:
            - containerPort: {{ .Values.service.port }}
          resources:
            {{- toYaml .Values.resources | nindent 12 }}
---
# web/values-prod.yaml — only what differs in prod
replicaCount: 5
resources:
  requests:
    cpu: 250m
    memory: 256Mi
  limits:
    memory: 512Mi`,
      },
      {
        title: 'Helm and Kustomize commands you will actually type',
        runnable: false,
        lang: 'bash',
        code: String.raw`$ helm version
version.BuildInfo{Version:"v4.0.x", ...}

$ helm lint ./web
==> Linting ./web
[INFO] Chart.yaml: icon is recommended
1 chart(s) linted, 0 chart(s) failed

# render locally, apply nothing
$ helm template shop ./web -f web/values-prod.yaml | grep -E "replicas|image:"
  replicas: 5
          image: "ghcr.io/acme/web:1.4.2"

$ helm install shop ./web -n shop --create-namespace
NAME: shop
LAST DEPLOYED: Tue Sep 29 10:12:03 2026
NAMESPACE: shop
STATUS: deployed
REVISION: 1

# Helm 4: --rollback-on-failure (was --atomic) undoes a failed upgrade
$ helm upgrade shop ./web -n shop -f web/values-prod.yaml --set image.tag=1.4.3 --rollback-on-failure
Release "shop" has been upgraded. Happy Helming!
REVISION: 2

$ helm history shop -n shop
REVISION  STATUS      CHART      APP VERSION  DESCRIPTION
1         superseded  web-0.3.0  1.4.2        Install complete
2         deployed    web-0.3.0  1.4.2        Upgrade complete

$ helm rollback shop 1 -n shop
Rollback was a success! Happy Helming!

$ helm list -n shop
NAME  NAMESPACE  REVISION  STATUS    CHART      APP VERSION
shop  shop       3         deployed  web-0.3.0  1.4.2

# share the chart through an OCI registry
$ helm package web
Successfully packaged chart and saved it to: web-0.3.0.tgz
$ helm push web-0.3.0.tgz oci://ghcr.io/acme/charts
$ helm install shop oci://ghcr.io/acme/charts/web --version 0.3.0

# ---- Kustomize (built into kubectl) ----
$ kubectl kustomize overlays/prod | grep -E "namespace|replicas|image:"
  namespace: prod
  replicas: 5
        image: ghcr.io/acme/web:1.4.2
$ kubectl apply -k overlays/prod
service/web created
deployment.apps/web created
$ kubectl diff -k overlays/prod      # what would change on the next apply`,
      },
    ],
    quiz: [
      {
        q: 'You install the same chart twice: <code>helm install a ./web</code> and <code>helm install b ./web</code>. What do you get?',
        options: ['An error: the chart is already installed', 'Two independent releases, each with its own revisions', 'One release with two revisions', 'Release b replaces release a'],
        answer: 1,
        why: 'A release is an instance of a chart. Templates usually include .Release.Name in object names, so the two don\'t collide.',
      },
      {
        q: 'A release is at revision 4. You run <code>helm rollback shop 2</code>. What does <code>helm history</code> show afterwards?',
        options: ['Revisions 1–2 (3 and 4 deleted)', 'Revision 2 marked deployed, no new revision', 'A new revision 5 with rev 2\'s manifests', 'Revision 4 renamed to 2'],
        answer: 2,
        why: 'Rollback is a forward operation: it creates a new revision whose content equals the old one.',
      },
      {
        q: 'Which of these is true of Kustomize?',
        options: [
          'It needs {{ }} placeholders in your manifests',
          'It overlays patches on plain YAML and is built into kubectl (apply -k)',
          'It tracks release revisions in Secrets',
          'It only works with Helm charts',
        ],
        answer: 1,
        why: 'Kustomize is template-free: bases stay valid YAML, and overlays change fields. It ships inside kubectl.',
      },
      {
        q: 'Your CI script ran <code>helm upgrade --install --atomic</code>. After moving to Helm 4, what should it use?',
        options: ['--atomic still works identically forever', '--rollback-on-failure', '--force', '--safe'],
        answer: 1,
        why: 'Helm 4 renamed --atomic to --rollback-on-failure. The old flag is deprecated on upgrade and was removed from install.',
      },
      {
        q: 'values.yaml says <code>replicaCount: 2</code>, prod.yaml says <code>3</code>, and you run <code>helm upgrade -f prod.yaml --set replicaCount=4</code>. Result?',
        options: ['2', '3', '4', 'Error: conflicting values'],
        answer: 2,
        why: 'Precedence: chart defaults &lt; -f files (in order) &lt; --set.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `<p><em>Edit the manifest in the box below and click Check.</em></p>
<p>Layout: <code>base/</code> (Deployment <code>web</code> using image <code>ghcr.io/acme/web</code>) and <code>overlays/prod/kustomization.yaml</code>. Fix the prod overlay:</p>
<ul>
  <li>it is a <code>Kustomization</code> that pulls in the base with <code>resources:</code> (path <code>../../base</code>). The old <code>bases:</code> field is deprecated.</li>
  <li>everything goes into namespace <code>prod</code></li>
  <li>image <code>ghcr.io/acme/web</code> gets <code>newTag: 1.4.2</code> (never <code>latest</code> in prod)</li>
  <li>Deployment <code>web</code> runs <strong>5</strong> replicas (use the <code>replicas:</code> field)</li>
</ul>`,
      starter: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
bases:
  - ../base
namespace: default
images:
  - name: ghcr.io/acme/web
    newTag: latest`,
        KUSTOMIZE_CHECKS(), 240),
      hint: 'Replace bases: with resources: and a single item ../../base. Set namespace: prod. Change newTag to 1.4.2 (quotes optional). Add replicas: with one list item { name: web, count: 5 }.',
      solution: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
namespace: prod
resources:
  - ../../base
images:
  - name: ghcr.io/acme/web
    newTag: "1.4.2"
replicas:
  - name: web
    count: 5`,
        KUSTOMIZE_CHECKS(), 240),
    },
  });

  function KUSTOMIZE_CHECKS() {
    return String.raw`
function runChecks(docs) {
  var k = findKind(docs, 'Kustomization') || {};
  var img = asList(k.images).filter(function (i) { return i && low(i.name) === 'ghcr.io/acme/web'; })[0] || {};
  var rep = asList(k.replicas).filter(function (r) { return r && low(r.name) === 'web'; })[0] || {};
  return [
    [low(k.kind) === 'kustomization', 'kind: Kustomization'],
    [asList(k.resources).map(low).indexOf('../../base') >= 0, 'resources includes ../../base'],
    [k.bases === undefined, 'deprecated bases: field removed'],
    [low(k.namespace) === 'prod', 'namespace: prod'],
    [low(img.newTag) === '1.4.2', 'image ghcr.io/acme/web has newTag 1.4.2'],
    [String(rep.count) === '5', 'replicas: Deployment web count 5'],
  ];
}`;
  }

  // =====================================================================
  // Lesson: Debugging
  // =====================================================================
  const DEBUG_SIM = String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; font-size: 13px; }
  .row { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 6px; }
  select, button { padding: 4px 8px; border-radius: 6px; border: 1px solid #9aa5b8; background: #fff; color: #1d2330; font-size: 12.5px; }
  button.cmd { font-family: ui-monospace, Menlo, monospace; cursor: pointer; }
  button.go { background: #3b6fd8; border-color: #3b6fd8; color: #fff; cursor: pointer; }
  #sym { background: #fff8e6; border: 1px solid #f0d58a; border-radius: 6px; padding: 6px 8px; margin-bottom: 6px; }
  #term { background: #111827; color: #d1e7ff; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px;
    padding: 8px; border-radius: 6px; height: 190px; overflow: auto; white-space: pre; margin: 0 0 6px; }
  #verdict { padding: 6px 8px; border-radius: 6px; min-height: 18px; }
  .ok { background: #e6f6ea; color: #1b5e20; }
  .bad { background: #fdecec; color: #8a1c1c; }
</style>

<div class="row">
  <select id="case"></select>
  <span id="score">Solved: 0 / 5</span>
  <span id="used"></span>
</div>
<div id="sym"></div>
<div class="row" id="cmds"></div>
<pre id="term"></pre>
<div class="row">
  <select id="diag">
    <option value="">Your diagnosis…</option>
    <option value="pending">Pending: no node has enough CPU/memory for the requests</option>
    <option value="image">ImagePullBackOff: wrong image name/tag or missing pull secret</option>
    <option value="crash">App exits on startup: bad config / missing env var</option>
    <option value="oom">OOMKilled: container exceeds its memory limit</option>
    <option value="ready">Running but not Ready: readiness probe failing, no endpoints</option>
  </select>
  <button class="go" id="submit">Submit diagnosis</button>
</div>
<div id="verdict"></div>

<script>
  var CASES = [
    {
      name: 'Case 1: checkout', pod: 'checkout-6b8f9c7d4-x2k9p', svc: 'checkout', answer: 'pending',
      symptom: 'Deployed checkout 4 minutes ago. The page still returns 503.',
      fix: 'Requests ask for 8Gi memory; no node has that free. Lower requests.memory or add a bigger node pool.',
      out: {
        get: ['NAME                       READY   STATUS    RESTARTS   AGE',
          'checkout-6b8f9c7d4-x2k9p   0/1     Pending   0          4m12s'],
        describe: ['Name:         checkout-6b8f9c7d4-x2k9p',
          'Namespace:    shop',
          'Node:         <none>',
          'Status:       Pending',
          'Containers:',
          '  checkout:',
          '    Image:      ghcr.io/acme/checkout:2.3.0',
          '    Requests:',
          '      cpu:      500m',
          '      memory:   8Gi',
          'Conditions:',
          '  Type           Status',
          '  PodScheduled   False',
          'Events:',
          '  Type     Reason            Age   From               Message',
          '  Warning  FailedScheduling  4m    default-scheduler  0/3 nodes are available: 3 Insufficient memory.',
          '           preemption: 0/3 nodes are available: 3 No preemption victims found for incoming pod.'],
        logs: ['Error from server (BadRequest): pod checkout-6b8f9c7d4-x2k9p does not have a host assigned'],
        prev: ['Error from server (BadRequest): pod checkout-6b8f9c7d4-x2k9p does not have a host assigned'],
        events: ['LAST SEEN   TYPE      REASON             OBJECT                         MESSAGE',
          '4m          Warning   FailedScheduling   pod/checkout-6b8f9c7d4-x2k9p   0/3 nodes are available: 3 Insufficient memory. ...'],
        ep: ['NAME       ENDPOINTS   AGE', 'checkout   <none>      4m'],
      },
    },
    {
      name: 'Case 2: web', pod: 'web-5c9d8f7b6-q7m4t', svc: 'web', answer: 'image',
      symptom: 'CI bumped the image to "1.42". The new pod never starts; the old version still serves.',
      fix: 'The tag 1.42 does not exist (the release is 1.4.2). Fix the tag; for private registries also check imagePullSecrets.',
      out: {
        get: ['NAME                  READY   STATUS             RESTARTS   AGE',
          'web-5c9d8f7b6-q7m4t   0/1     ImagePullBackOff   0          2m30s'],
        describe: ['Name:         web-5c9d8f7b6-q7m4t',
          'Node:         kind-worker/172.18.0.3',
          'Status:       Pending',
          'Containers:',
          '  web:',
          '    Image:          ghcr.io/acme/web:1.42',
          '    State:          Waiting',
          '      Reason:       ImagePullBackOff',
          'Events:',
          '  Type     Reason     Age                  From     Message',
          '  Normal   Pulling    60s (x4 over 2m29s)  kubelet  Pulling image "ghcr.io/acme/web:1.42"',
          '  Warning  Failed     59s (x4 over 2m28s)  kubelet  Failed to pull image "ghcr.io/acme/web:1.42": rpc error:',
          '           code = NotFound desc = failed to pull and unpack image "ghcr.io/acme/web:1.42": not found',
          '  Warning  Failed     59s (x4 over 2m28s)  kubelet  Error: ErrImagePull',
          '  Normal   BackOff    5s (x9 over 2m27s)   kubelet  Back-off pulling image "ghcr.io/acme/web:1.42"',
          '  Warning  Failed     5s (x9 over 2m27s)   kubelet  Error: ImagePullBackOff'],
        logs: ['Error from server (BadRequest): container "web" in pod "web-5c9d8f7b6-q7m4t" is waiting to start:',
          'trying and failing to pull image'],
        prev: ['Error from server (BadRequest): previous terminated container "web" in pod "web-5c9d8f7b6-q7m4t" not found'],
        events: ['LAST SEEN   TYPE      REASON    OBJECT                    MESSAGE',
          '59s         Warning   Failed    pod/web-5c9d8f7b6-q7m4t   Failed to pull image "ghcr.io/acme/web:1.42": ... not found',
          '5s          Normal    BackOff   pod/web-5c9d8f7b6-q7m4t   Back-off pulling image "ghcr.io/acme/web:1.42"'],
        ep: ['NAME   ENDPOINTS                         AGE', 'web    10.244.1.7:8080,10.244.2.4:8080   12d'],
      },
    },
    {
      name: 'Case 3: worker', pod: 'worker-7f6d5c4b3-h8z2n', svc: 'worker', answer: 'crash',
      symptom: 'After moving worker to a new namespace, jobs pile up in the queue.',
      fix: 'The app exits with code 1 because DATABASE_URL is missing. Add it (env / envFrom a Secret) and the loop stops.',
      out: {
        get: ['NAME                     READY   STATUS             RESTARTS      AGE',
          'worker-7f6d5c4b3-h8z2n   0/1     CrashLoopBackOff   5 (40s ago)   4m'],
        describe: ['Name:         worker-7f6d5c4b3-h8z2n',
          'Node:         kind-worker2/172.18.0.4',
          'Containers:',
          '  worker:',
          '    Image:          ghcr.io/acme/worker:3.1.0',
          '    State:          Waiting',
          '      Reason:       CrashLoopBackOff',
          '    Last State:     Terminated',
          '      Reason:       Error',
          '      Exit Code:    1',
          '    Restart Count:  5',
          '    Limits:',
          '      memory:  256Mi',
          '    Environment:',
          '      QUEUE_URL:  amqp://rabbitmq:5672',
          'Events:',
          '  Warning  BackOff  12s (x19 over 4m)  kubelet  Back-off restarting failed container worker in pod',
          '                                                worker-7f6d5c4b3-h8z2n_shop(3c1e...)'],
        logs: ['{"level":"info","msg":"worker starting","version":"3.1.0"}',
          '{"level":"fatal","msg":"config error: DATABASE_URL is required"}'],
        prev: ['{"level":"info","msg":"worker starting","version":"3.1.0"}',
          '{"level":"fatal","msg":"config error: DATABASE_URL is required"}'],
        events: ['LAST SEEN   TYPE      REASON    OBJECT                       MESSAGE',
          '12s         Warning   BackOff   pod/worker-7f6d5c4b3-h8z2n   Back-off restarting failed container worker ...'],
        ep: ['NAME     ENDPOINTS   AGE', 'worker   <none>      4m'],
      },
    },
    {
      name: 'Case 4: cache', pod: 'cache-84c7b9d6f-p3r8w', svc: 'cache', answer: 'oom',
      symptom: 'cache restarts every few minutes since the dataset grew.',
      fix: 'Exit code 137 + Reason OOMKilled: the 128Mi limit is too small. Raise limits.memory (and requests) or cap the app\'s memory use.',
      out: {
        get: ['NAME                    READY   STATUS             RESTARTS      AGE',
          'cache-84c7b9d6f-p3r8w   0/1     CrashLoopBackOff   4 (30s ago)   9m'],
        describe: ['Name:         cache-84c7b9d6f-p3r8w',
          'Node:         kind-worker/172.18.0.3',
          'Containers:',
          '  cache:',
          '    Image:          ghcr.io/acme/cache:0.9.2',
          '    State:          Waiting',
          '      Reason:       CrashLoopBackOff',
          '    Last State:     Terminated',
          '      Reason:       OOMKilled',
          '      Exit Code:    137',
          '    Restart Count:  4',
          '    Limits:',
          '      memory:  128Mi',
          '    Requests:',
          '      memory:  128Mi',
          'Events:',
          '  Warning  BackOff  30s (x12 over 9m)  kubelet  Back-off restarting failed container cache in pod',
          '                                               cache-84c7b9d6f-p3r8w_shop(9a0b...)'],
        logs: ['loading dataset into memory... 40MB', 'loading dataset into memory... 80MB',
          'loading dataset into memory... 120MB'],
        prev: ['loading dataset into memory... 40MB', 'loading dataset into memory... 80MB',
          'loading dataset into memory... 120MB'],
        events: ['LAST SEEN   TYPE      REASON    OBJECT                      MESSAGE',
          '30s         Warning   BackOff   pod/cache-84c7b9d6f-p3r8w   Back-off restarting failed container cache ...'],
        ep: ['NAME    ENDPOINTS   AGE', 'cache   <none>      9m'],
      },
    },
    {
      name: 'Case 5: frontend', pod: 'frontend-66d8b7c9f-k4j2s', svc: 'frontend', answer: 'ready',
      symptom: 'Pods look "Running", but the Service returns "connection refused" / 503 from the Ingress.',
      fix: 'The readiness probe calls /healthz, but the app serves /ready, so it gets a 404. Fix the probe path so the pod joins the endpoints.',
      out: {
        get: ['NAME                       READY   STATUS    RESTARTS   AGE',
          'frontend-66d8b7c9f-k4j2s   0/1     Running   0          3m'],
        describe: ['Name:         frontend-66d8b7c9f-k4j2s',
          'Node:         kind-worker2/172.18.0.4',
          'Containers:',
          '  frontend:',
          '    Image:          ghcr.io/acme/frontend:5.0.1',
          '    State:          Running',
          '    Ready:          False',
          '    Restart Count:  0',
          '    Readiness:      http-get http://:8080/healthz delay=0s timeout=1s period=10s #success=1 #failure=3',
          'Conditions:',
          '  Type              Status',
          '  Ready             False',
          '  ContainersReady   False',
          'Events:',
          '  Warning  Unhealthy  4s (x19 over 3m)  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 404'],
        logs: ['listening on :8080', 'GET /healthz 404 0.4ms', 'GET /healthz 404 0.3ms', 'GET /healthz 404 0.3ms'],
        prev: ['Error from server (BadRequest): previous terminated container "frontend" in pod',
          '"frontend-66d8b7c9f-k4j2s" not found'],
        events: ['LAST SEEN   TYPE      REASON      OBJECT                         MESSAGE',
          '4s          Warning   Unhealthy   pod/frontend-66d8b7c9f-k4j2s   Readiness probe failed: HTTP probe failed with statuscode: 404'],
        ep: ['NAME       ENDPOINTS   AGE', 'frontend   <none>      3m'],
      },
    },
  ];

  var CMDS = [
    { key: 'get', label: 'get pods', cmd: function (c) { return 'kubectl get pods'; } },
    { key: 'describe', label: 'describe pod', cmd: function (c) { return 'kubectl describe pod ' + c.pod; } },
    { key: 'logs', label: 'logs', cmd: function (c) { return 'kubectl logs ' + c.pod; } },
    { key: 'prev', label: 'logs --previous', cmd: function (c) { return 'kubectl logs ' + c.pod + ' --previous'; } },
    { key: 'events', label: 'events', cmd: function (c) { return 'kubectl events --for pod/' + c.pod; } },
    { key: 'ep', label: 'get endpoints', cmd: function (c) { return 'kubectl get endpoints ' + c.svc; } },
  ];

  var solved = {};
  var used = 0;
  var cur = 0;
  var term = document.getElementById('term');
  var sel = document.getElementById('case');

  CASES.forEach(function (c, i) {
    var o = document.createElement('option');
    o.value = i;
    o.textContent = c.name;
    sel.appendChild(o);
  });
  CMDS.forEach(function (m) {
    var b = document.createElement('button');
    b.className = 'cmd';
    b.textContent = m.label;
    b.onclick = function () { run(m); };
    document.getElementById('cmds').appendChild(b);
  });

  function show(lines) {
    term.textContent += lines.join('\n') + '\n';
    term.scrollTop = term.scrollHeight;
  }
  function run(m) {
    var c = CASES[cur];
    var cmd = '$ ' + m.cmd(c);
    var lines = c.out[m.key].slice();
    if (m.key === 'ep') lines.unshift('Warning: v1 Endpoints is deprecated in v1.33+; use discovery.k8s.io/v1 EndpointSlice');
    show([cmd].concat(lines, ['']));
    console.log(cmd);
    used++;
    document.getElementById('used').textContent = 'Commands used: ' + used;
  }
  function load(i) {
    cur = i;
    used = 0;
    var c = CASES[i];
    term.textContent = '';
    document.getElementById('sym').innerHTML = '<b>Ticket:</b> ' + c.symptom + ' <i>(namespace shop is your default)</i>';
    document.getElementById('used').textContent = 'Commands used: 0';
    document.getElementById('verdict').className = '';
    document.getElementById('verdict').textContent = 'Investigate with the commands, then submit a diagnosis.';
    document.getElementById('diag').value = '';
  }
  sel.onchange = function () { load(Number(sel.value)); };

  document.getElementById('submit').onclick = function () {
    var c = CASES[cur];
    var d = document.getElementById('diag').value;
    var v = document.getElementById('verdict');
    if (!d) return;
    if (d === c.answer) {
      solved[cur] = true;
      v.className = 'ok';
      v.textContent = '✓ Correct (' + used + ' commands). ' + c.fix;
      console.log('# ' + c.name + ' solved');
    } else {
      v.className = 'bad';
      v.textContent = '✗ Not quite. Look again at STATUS, then at Events / Last State in describe.';
      console.log('# ' + c.name + ': wrong diagnosis');
    }
    document.getElementById('score').textContent = 'Solved: ' + Object.keys(solved).length + ' / ' + CASES.length;
  };

  load(0);
</script>`;

  window.LESSONS.push({
    id: 'debugging-k8s',
    section: SECTION,
    title: 'Debugging: Pending, CrashLoopBackOff, ImagePullBackOff',
    explain: `
<p>With Docker you debug one container: <code>docker ps</code>, <code>docker logs</code>, <code>docker exec</code>. In Kubernetes a failure can sit at any layer: the <strong>scheduler</strong> (no room), the <strong>kubelet</strong> (can't pull the image), the <strong>container</strong> (crashes), or the <strong>network</strong> (running but not receiving traffic). The trick is to read the <code>STATUS</code> column first. It tells you which layer to look at.</p>

<h3>The debugging flowchart</h3>
<table>
  <tr><th>STATUS you see</th><th>Layer</th><th>Where the answer is</th></tr>
  <tr><td><code>Pending</code> (no node)</td><td>Scheduler</td><td><code>describe pod</code> → Events: <code>FailedScheduling … Insufficient cpu/memory</code>, taints, node affinity, unbound PVC</td></tr>
  <tr><td><code>ErrImagePull</code> / <code>ImagePullBackOff</code></td><td>Kubelet pulling</td><td><code>describe pod</code> → Events: <code>not found</code> (typo/tag) or <code>unauthorized</code> (missing <code>imagePullSecrets</code>)</td></tr>
  <tr><td><code>CrashLoopBackOff</code></td><td>Your process</td><td><code>describe</code> → <strong>Last State</strong> (Reason + Exit Code), then <code>logs --previous</code></td></tr>
  <tr><td><code>OOMKilled</code> / exit 137</td><td>Kernel (memory limit)</td><td><code>describe</code> → <code>Last State: Terminated, Reason: OOMKilled</code>; compare with <code>limits.memory</code></td></tr>
  <tr><td><code>Running</code> but <code>0/1</code> READY</td><td>Readiness probe</td><td><code>describe</code> → <code>Readiness probe failed</code>; <code>get endpoints/endpointslices</code> is empty</td></tr>
  <tr><td><code>Running 1/1</code> but it still doesn't work</td><td>Service / network</td><td>Service <code>selector</code> vs pod labels, <code>targetPort</code>, <code>port-forward</code> to test the pod directly</td></tr>
</table>

<h3>The toolbox</h3>
<pre><code class="language-bash">kubectl get pods -o wide                 # STATUS, RESTARTS, which node
kubectl describe pod &lt;pod&gt;               # spec + State/Last State + Events (read it bottom-up)
kubectl logs &lt;pod&gt; [-c container]        # current container's stdout/stderr
kubectl logs &lt;pod&gt; --previous            # the instance that just CRASHED
kubectl events --for pod/&lt;pod&gt;           # events only (they expire after ~1h by default)
kubectl exec -it &lt;pod&gt; -- sh             # shell inside (if the image has one)
kubectl debug -it &lt;pod&gt; --image=busybox:1.36 --target=&lt;container&gt;   # ephemeral debug container
kubectl port-forward pod/&lt;pod&gt; 8080:8080 # bypass Service + Ingress, talk to the pod directly</code></pre>
<p><strong>Ephemeral containers</strong> (<code>kubectl debug</code>) matter because good production images are distroless and have no shell. <code>kubectl debug</code> adds a temporary container with your tools <em>into the running pod</em>, sharing its network, and with <code>--target</code> its process namespace. It's the K8s answer to "I'd just <code>docker exec</code> in".</p>
<div class="tip">Exit codes: <code>1</code> = the app itself failed, <code>137</code> = 128 + 9 = SIGKILL (OOM kill, or killed after the grace period), <code>143</code> = 128 + 15 = SIGTERM (normal stop). The same codes you know from <code>docker ps -a</code>.</div>
`,
    examples: [
      {
        title: 'Mystery broken pod: pick commands, read output, diagnose',
        lang: 'html',
        code: DEBUG_SIM,
        explain: `
<details>
  <summary>The problem: five pods, three look alike</summary>
  <p>Cases 3 and 4 both show <code>CrashLoopBackOff</code> in <code>kubectl get pods</code>. Case 1 and case 5 both "don't serve traffic". The STATUS column tells you <em>where</em> to look, not <em>why</em>. <code>CrashLoopBackOff</code> only means "it keeps dying and the kubelet is waiting longer and longer (10s, 20s, 40s… up to 5 min) before restarting it". The reason it dies is in <code>describe</code> and the logs.</p>
</details>
<details>
  <summary>Step by step: telling Case 3 and Case 4 apart</summary>
  <table>
    <tr><th>Step</th><th>Case 3: worker</th><th>Case 4: cache</th></tr>
    <tr><td><strong>get pods</strong></td><td><code>0/1 CrashLoopBackOff 5 (40s ago)</code></td><td><code>0/1 CrashLoopBackOff 4 (30s ago)</code>: looks the same</td></tr>
    <tr><td><strong>describe pod</strong> → Last State</td><td><code>Reason: Error</code>, <code>Exit Code: 1</code>: the <em>app</em> decided to exit</td><td><code>Reason: OOMKilled</code>, <code>Exit Code: 137</code>: the <em>kernel</em> killed it</td></tr>
    <tr><td><strong>describe pod</strong> → other clues</td><td><code>Environment:</code> only lists <code>QUEUE_URL</code></td><td><code>Limits: memory: 128Mi</code></td></tr>
    <tr><td><strong>logs --previous</strong></td><td><code>{"level":"fatal","msg":"config error: DATABASE_URL is required"}</code></td><td>Ends mid-way at <code>loading dataset into memory... 120MB</code>, with no error message because SIGKILL can't be caught</td></tr>
    <tr><td><strong>Diagnosis</strong></td><td>App exits on startup: bad config / missing env var</td><td>OOMKilled: container exceeds its memory limit</td></tr>
  </table>
  <p>And the other three: Case 1 <code>describe</code> shows <code>Node: &lt;none&gt;</code> and <code>FailedScheduling … 3 Insufficient memory</code> (requests <code>8Gi</code>). Case 2 Events say <code>Failed to pull image "ghcr.io/acme/web:1.42" … not found</code>. Case 5 is <code>Running</code> with <code>0/1</code>, and Events say <code>Readiness probe failed: HTTP probe failed with statuscode: 404</code>, while <code>get endpoints frontend</code> shows <code>&lt;none&gt;</code>.</p>
</details>
<details>
  <summary>Key lines: what each command can and can't tell you</summary>
  <ol>
    <li><strong>logs on a Pending pod</strong> → <code>does not have a host assigned</code>. There's no container, so there are no logs. Don't wait for logs; go to Events.</li>
    <li><strong>logs --previous on an image-pull failure</strong> → <code>previous terminated container "web" … not found</code>. The container never ran even once.</li>
    <li><strong>get endpoints</strong> prints <code>Warning: v1 Endpoints is deprecated in v1.33+</code>. It still works, but new tooling reads <code>EndpointSlice</code>s (<code>kubectl get endpointslices -l kubernetes.io/service-name=frontend</code>).</li>
    <li>In Case 2 the Service <em>still has endpoints</em> (<code>10.244.1.7:8080,…</code>): the old ReplicaSet's pods keep serving because the rolling update can't progress. That's the rolling-update safety net at work.</li>
  </ol>
</details>
<details>
  <summary>Common mistake</summary>
  <div class="warn">Running <code>kubectl logs</code> on a crash-looping pod and seeing nothing (or the wrong run). After a restart the <em>current</em> container is a fresh one. Use <code>--previous</code> to read the one that crashed. Also, don't "fix" a crash loop by deleting the pod: the ReplicaSet recreates it from the same broken spec.</div>
  <div class="tip">Try solving every case in 2 commands: <code>get pods</code> to pick the layer, then the <em>one</em> command the flowchart points at.</div>
</details>`,
      },
      {
        title: 'Beyond logs: exec, ephemeral debug containers, port-forward',
        runnable: false,
        lang: 'bash',
        code: String.raw`# Exit code + reason of the last crash, without reading the whole describe
$ kubectl get pod cache-84c7b9d6f-p3r8w \
    -o jsonpath='{.status.containerStatuses[0].lastState.terminated.reason} {.status.containerStatuses[0].lastState.terminated.exitCode}{"\n"}'
OOMKilled 137

# Shell into a running container (only if the image has a shell)
$ kubectl exec -it frontend-66d8b7c9f-k4j2s -- sh
/app $ wget -qO- localhost:8080/ready
ok

# Distroless image, no shell? Attach an ephemeral debug container that shares the pod
$ kubectl exec -it api-7c9f8d6b5-m2x4q -- sh
error: Internal error occurred: ... exec: "sh": executable file not found in $PATH
$ kubectl debug -it api-7c9f8d6b5-m2x4q --image=busybox:1.36 --target=api
Targeting container "api". If you don't see processes from this container it may be because the container runtime doesn't support this feature.
Defaulting debug container name to debugger-8xk2p.
/ # ps
PID   USER     COMMAND
    1 65532    /app/server
   14 root     sh
/ # wget -qO- localhost:8080/healthz
ok

# Copy of a crashing pod with a different command, so you can poke around
$ kubectl debug worker-7f6d5c4b3-h8z2n -it --copy-to=worker-debug --container=worker -- sh

# Skip Service and Ingress: talk to one pod / the Service from your laptop
$ kubectl port-forward pod/frontend-66d8b7c9f-k4j2s 8080:8080
Forwarding from 127.0.0.1:8080 -> 8080
$ curl -i localhost:8080/healthz
HTTP/1.1 404 Not Found

# Is the Service selecting any pods at all?
$ kubectl get endpointslices -l kubernetes.io/service-name=frontend
NAME             ADDRESSTYPE   PORTS   ENDPOINTS    AGE
frontend-9xk2d   IPv4          8080    10.244.2.9   3m

# Node-level problems (disk pressure, kubelet): a debug pod on the node
$ kubectl debug node/kind-worker -it --image=busybox:1.36
/ # chroot /host journalctl -u kubelet --since "10 min ago" | tail`,
      },
    ],
    quiz: [
      {
        q: 'A pod is <code>Pending</code> and <code>kubectl logs</code> says <code>does not have a host assigned</code>. Where do you look next?',
        options: ['kubectl logs --previous', 'kubectl describe pod → Events (FailedScheduling)', 'kubectl exec into it', 'The container registry'],
        answer: 1,
        why: 'No node means no container, so there are no logs. The scheduler writes the reason (Insufficient cpu/memory, taints, affinity, unbound PVC) as an event.',
      },
      {
        q: '<code>describe</code> shows <code>Last State: Terminated, Reason: OOMKilled, Exit Code: 137</code>. What\'s happening?',
        options: [
          'The image cannot be pulled',
          'The liveness probe failed',
          'The container used more memory than its limit and the kernel killed it',
          'The node ran out of disk',
        ],
        answer: 2,
        why: '137 = 128 + 9 (SIGKILL). With Reason OOMKilled, the cgroup memory limit was hit. Raise the limit or reduce usage.',
      },
      {
        q: 'Your crash-looping container printed its error, restarted, and now <code>kubectl logs</code> is empty. Which flag shows the crash?',
        options: ['--follow', '--since=1h', '--previous', '--all-containers'],
        answer: 2,
        why: '--previous shows the logs of the previous (crashed) instance of the container.',
      },
      {
        q: 'The image is distroless (no shell), so <code>kubectl exec -- sh</code> fails. What\'s the built-in way to get tools next to it?',
        options: [
          'Rebuild the image with bash',
          'kubectl debug -it &lt;pod&gt; --image=busybox --target=&lt;container&gt; (ephemeral container)',
          'docker exec on the node',
          'kubectl attach',
        ],
        answer: 1,
        why: 'Ephemeral containers are added to the running pod, share its network (and with --target its process namespace), and disappear when you exit.',
      },
      {
        q: 'Pods are <code>Running</code> but <code>READY 0/1</code>, and the Service has no endpoints. Most likely cause?',
        options: ['Wrong image tag', 'The readiness probe is failing', 'Not enough CPU on nodes', 'RBAC denies the pod'],
        answer: 1,
        why: 'Only Ready pods are added to Service endpoints. describe shows "Readiness probe failed" in Events.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `<p><em>Edit the manifest in the box below and click Check.</em></p>
<p>This Deployment has <strong>four</strong> bugs. Each one matches a symptom from the cluster (nodes have 2 CPUs and 4Gi memory):</p>
<ol>
  <li>Events: <code>0/3 nodes are available: 3 Insufficient cpu.</code> → the CPU request must be at most <code>1</code> (e.g. <code>250m</code>)</li>
  <li>Events: <code>Failed to pull image "ghcr.io/acme/web:1.42" … not found</code>. The real release tag is <code>1.4.2</code></li>
  <li>Last State: <code>OOMKilled</code>, exit 137. The app needs about 200Mi, so <code>limits.memory</code> must be at least <code>256Mi</code> (and requests.memory ≤ limits.memory)</li>
  <li>Events: <code>Readiness probe failed: HTTP probe failed with statuscode: 404</code>. The app serves <code>/ready</code> on the containerPort</li>
</ol>`,
      starter: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        - name: web
          image: ghcr.io/acme/web:1.42
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: "4"
              memory: 128Mi
            limits:
              memory: 128Mi
          readinessProbe:
            httpGet:
              path: /healthz
              port: 80`,
        DEBUG_CHECKS(), 380),
      hint: 'cpu: 250m, image tag :1.4.2, limits.memory: 256Mi, readinessProbe.httpGet.path: /ready with port: 8080 (the containerPort).',
      solution: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
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
        - name: web
          image: ghcr.io/acme/web:1.4.2
          ports:
            - containerPort: 8080
          resources:
            requests:
              cpu: 250m
              memory: 128Mi
            limits:
              memory: 256Mi
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080`,
        DEBUG_CHECKS(), 380),
    },
  });

  function DEBUG_CHECKS() {
    return String.raw`
function cpuCores(v) {
  v = low(v);
  if (!v) return NaN;
  return /m$/.test(v) ? parseFloat(v) / 1000 : parseFloat(v);
}
function memMi(v) {
  var m = low(v).match(/^([\d.]+)\s*(ki|mi|gi|k|m|g)?$/);
  if (!m) return NaN;
  var f = { ki: 1 / 1024, mi: 1, gi: 1024, k: 1 / 1048.576, m: 1 / 1.048576, g: 953.674 }[m[2] || ''] || 1 / 1048576;
  return parseFloat(m[1]) * f;
}
function runChecks(docs) {
  var d = findKind(docs, 'Deployment') || {};
  var c = asList(get(d, 'spec.template.spec.containers'))[0] || {};
  var r = c.resources || {};
  var port = String(get(asList(c.ports)[0] || {}, 'containerPort'));
  var probe = get(c, 'readinessProbe.httpGet') || {};
  var cpu = cpuCores(get(r, 'requests.cpu'));
  var lim = memMi(get(r, 'limits.memory'));
  var req = memMi(get(r, 'requests.memory'));
  return [
    [cpu > 0 && cpu <= 1, '1) requests.cpu fits a 2-CPU node (≤ 1): ' + get(r, 'requests.cpu')],
    [/:1\.4\.2$/.test(String(c.image)), '2) image tag is 1.4.2: ' + c.image],
    [lim >= 256, '3) limits.memory ≥ 256Mi: ' + get(r, 'limits.memory')],
    [!(req > lim), '3) requests.memory ≤ limits.memory'],
    [low(probe.path) === '/ready', '4) readinessProbe path is /ready'],
    [String(probe.port) === port, '4) readinessProbe port matches containerPort ' + port],
  ];
}`;
  }

  // =====================================================================
  // Lesson: Capstone
  // =====================================================================
  window.LESSONS.push({
    id: 'capstone-docker-to-k8s',
    section: SECTION,
    title: 'Capstone: from Dockerfile to cluster',
    explain: `
<p>Time to put everything together. We take a small Node.js web app from source code to a running, self-healing, rolling-updatable deployment on a local <strong>kind</strong> cluster, using the same steps you'd use for a real cluster (only the registry and the Ingress controller change).</p>

<h3>The pipeline</h3>
<table>
  <tr><th>#</th><th>Step</th><th>Tool</th><th>Lesson it comes from</th></tr>
  <tr><td>1</td><td>Multi-stage <strong>Dockerfile</strong>: small, non-root runtime image</td><td><code>docker build</code></td><td>Images, multi-stage builds</td></tr>
  <tr><td>2</td><td>Tag with a <strong>version</strong> (never rely on <code>latest</code>), push to a registry. On kind: <code>kind load docker-image</code></td><td><code>docker push</code> / <code>kind</code></td><td>Registries</td></tr>
  <tr><td>3</td><td><strong>ConfigMap</strong> for settings, consumed with <code>envFrom</code></td><td>YAML</td><td>ConfigMaps &amp; Secrets</td></tr>
  <tr><td>4</td><td><strong>Deployment</strong>: replicas, matching labels/selector, probes, requests/limits, securityContext</td><td>YAML</td><td>Deployments, probes, resources, RBAC</td></tr>
  <tr><td>5</td><td><strong>Service</strong> (stable name + load balancing) and <strong>Ingress</strong> (HTTP routing from outside)</td><td>YAML</td><td>Services, Ingress/Gateway</td></tr>
  <tr><td>6</td><td><code>kubectl apply</code>, <code>rollout status</code>, test with <code>port-forward</code></td><td>kubectl</td><td>kubectl basics</td></tr>
  <tr><td>7</td><td>Ship v1.1.0 as a <strong>rolling update</strong>, and <code>rollout undo</code> if it's bad</td><td>kubectl</td><td>Rolling updates</td></tr>
</table>

<h3>Compose → Kubernetes, side by side</h3>
<table>
  <tr><th><code>compose.yaml</code></th><th>Kubernetes</th></tr>
  <tr><td><code>services.web.image</code> / <code>build</code></td><td>Deployment <code>containers[].image</code> (K8s never builds, it only pulls)</td></tr>
  <tr><td><code>deploy.replicas</code></td><td>Deployment <code>replicas</code> (or an HPA)</td></tr>
  <tr><td><code>environment</code> / <code>env_file</code></td><td><code>env</code> / <code>envFrom</code> a ConfigMap or Secret</td></tr>
  <tr><td><code>ports: "8080:8080"</code></td><td><code>containerPort</code> + Service (+ Ingress for outside access)</td></tr>
  <tr><td><code>healthcheck</code></td><td><code>readinessProbe</code> / <code>livenessProbe</code> / <code>startupProbe</code></td></tr>
  <tr><td><code>deploy.resources</code></td><td><code>resources.requests</code> / <code>limits</code></td></tr>
  <tr><td>service name DNS (<code>http://web</code>)</td><td>Service DNS (<code>http://web</code>, <code>web.shop.svc.cluster.local</code>)</td></tr>
</table>

<h3>What the app must do for this to work well</h3>
<ul>
  <li>Listen on <code>0.0.0.0:8080</code> (not <code>localhost</code>, or the probes and Service can't reach it).</li>
  <li>Expose <code>/ready</code> (checks it can serve) and <code>/healthz</code> (the process is alive; <em>don't</em> check the database here).</li>
  <li>Read config from environment variables, log to stdout, and exit cleanly on <code>SIGTERM</code> within <code>terminationGracePeriodSeconds</code> (default 30s).</li>
</ul>
<div class="warn">With kind, use a real tag such as <code>web:1.0.0</code>. With <code>:latest</code> (or no tag), the default <code>imagePullPolicy</code> is <code>Always</code>, so the kubelet tries Docker Hub instead of the image you loaded, and you get <code>ErrImagePull</code>. With a version tag the default is <code>IfNotPresent</code>.</div>
<div class="tip">Ingress controller choice: the popular community <strong>ingress-nginx</strong> controller was retired (its best-effort maintenance ended in March 2026). For new setups, pick a maintained Ingress controller or move to <strong>Gateway API</strong> (<code>HTTPRoute</code>). On kind, the simplest test needs no controller at all: <code>kubectl port-forward svc/web 8080:80</code>.</div>
`,
    examples: [
      {
        title: '1. Dockerfile: multi-stage, non-root, production-only deps',
        runnable: false,
        lang: 'docker',
        code: `# syntax=docker/dockerfile:1
# ---------- deps: production node_modules only ----------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --omit=dev

# ---------- build: compile TypeScript -> dist/ ----------
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci
COPY . .
RUN npm run build

# ---------- runtime: small, no dev deps, no source ----------
FROM node:24-alpine
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
USER node                      # UID 1000, so runAsNonRoot passes
EXPOSE 8080
CMD ["node", "dist/server.js"] # exec form: node is PID 1 and receives SIGTERM`,
      },
      {
        title: '2. Kubernetes manifests: ConfigMap, Deployment, Service, Ingress',
        runnable: false,
        lang: 'yaml',
        code: `# k8s/app.yaml — apply with: kubectl apply -f k8s/
apiVersion: v1
kind: Namespace
metadata:
  name: shop
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config
  namespace: shop
data:
  LOG_LEVEL: info
  FEATURE_CHECKOUT_V2: "true"      # values are always strings: quote true/false/numbers
  API_BASE_URL: http://api.shop.svc.cluster.local
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: shop
  labels:
    app: web
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0              # never drop below 3 ready pods during a rollout
  selector:
    matchLabels:
      app: web                       # must match template labels below
  template:
    metadata:
      labels:
        app: web
    spec:
      securityContext:
        runAsNonRoot: true
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: web
          image: web:1.0.0             # real registry: ghcr.io/acme/web:1.0.0
          ports:
            - name: http
              containerPort: 8080
          envFrom:
            - configMapRef:
                name: web-config       # every key becomes an env var
          readinessProbe:              # gate traffic: only Ready pods get requests
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
          livenessProbe:               # restart if the process is wedged (no DB checks here)
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 10
            failureThreshold: 3
          startupProbe:                # up to 30 × 2s = 60s to boot before liveness starts
            httpGet:
              path: /healthz
              port: http
            periodSeconds: 2
            failureThreshold: 30
          resources:
            requests:                  # what the scheduler reserves
              cpu: 100m
              memory: 128Mi
            limits:                    # memory limit: over it = OOMKilled
              memory: 256Mi
          securityContext:
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            capabilities:
              drop: ["ALL"]
          volumeMounts:
            - name: tmp
              mountPath: /tmp
      volumes:
        - name: tmp
          emptyDir: {}
---
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
      port: 80                         # clients call http://web
      targetPort: http                 # -> containerPort 8080
---
# Needs an Ingress controller in the cluster. ingress-nginx is retired (maintenance ended March 2026):
# use a maintained controller, or Gateway API (Gateway + HTTPRoute) instead.
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: web
  namespace: shop
spec:
  ingressClassName: my-ingress-class   # the class of the controller you installed
  rules:
    - host: shop.localtest.me          # *.localtest.me resolves to 127.0.0.1
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: web
                port:
                  name: http`,
      },
      {
        title: '3. The whole session: kind cluster → load image → apply → rollout → undo',
        runnable: false,
        lang: 'bash',
        note: 'Reference session. Needs Docker, kind and kubectl on your machine. Output is abridged.',
        code: String.raw`# 1) a local cluster (kind = Kubernetes nodes running as Docker containers)
$ kind create cluster --name shop
Creating cluster "shop" ...
 ✓ Ensuring node image (kindest/node:v1.3x.y)   # version depends on your kind release
 ✓ Preparing nodes
 ✓ Writing configuration
 ✓ Starting control-plane
 ✓ Installing CNI
 ✓ Installing StorageClass
Set kubectl context to "kind-shop"

# 2) build the image and copy it into the kind node (no registry needed locally)
$ docker build -t web:1.0.0 .
 => [runtime 5/5] COPY package.json ./                      0.1s
 => exporting to image                                      0.4s
 => => naming to docker.io/library/web:1.0.0                0.0s
$ kind load docker-image web:1.0.0 --name shop
Image: "web:1.0.0" with ID "sha256:3f1c9a..." not yet present on node "shop-control-plane", loading...
# (real cluster instead: docker tag web:1.0.0 ghcr.io/acme/web:1.0.0 && docker push ghcr.io/acme/web:1.0.0)

# 3) apply everything
$ kubectl apply -f k8s/
namespace/shop created
configmap/web-config created
deployment.apps/web created
service/web created
ingress.networking.k8s.io/web created
$ kubectl config set-context --current --namespace=shop

$ kubectl rollout status deployment/web
Waiting for deployment "web" rollout to finish: 0 of 3 updated replicas are available...
Waiting for deployment "web" rollout to finish: 2 of 3 updated replicas are available...
deployment "web" successfully rolled out

$ kubectl get pods,svc -o wide
NAME                       READY   STATUS    RESTARTS   AGE   IP           NODE
pod/web-7d9f6c8b5-4kq2m    1/1     Running   0          40s   10.244.0.7   shop-control-plane
pod/web-7d9f6c8b5-9xt7w    1/1     Running   0          40s   10.244.0.8   shop-control-plane
pod/web-7d9f6c8b5-h2m5p    1/1     Running   0          40s   10.244.0.9   shop-control-plane
NAME          TYPE        CLUSTER-IP     EXTERNAL-IP   PORT(S)   AGE
service/web   ClusterIP   10.96.184.21   <none>        80/TCP    40s

# 4) test it (no Ingress controller needed for this)
$ kubectl port-forward svc/web 8080:80
Forwarding from 127.0.0.1:8080 -> 8080
$ curl -s localhost:8080/ready        # in a second terminal
ok
$ kubectl exec deploy/web -- printenv LOG_LEVEL
info

# 5) ship v1.1.0 as a rolling update
$ docker build -t web:1.1.0 . && kind load docker-image web:1.1.0 --name shop
$ kubectl set image deployment/web web=web:1.1.0
deployment.apps/web image updated
$ kubectl annotate deployment/web kubernetes.io/change-cause="release 1.1.0"
$ kubectl rollout status deployment/web
Waiting for deployment "web" rollout to finish: 1 out of 3 new replicas have been updated...
Waiting for deployment "web" rollout to finish: 2 out of 3 new replicas have been updated...
deployment "web" successfully rolled out

# 6) bad release? go back
$ kubectl rollout history deployment/web
REVISION  CHANGE-CAUSE
1         <none>
2         release 1.1.0
$ kubectl rollout undo deployment/web
deployment.apps/web rolled back

# 7) clean up
$ kind delete cluster --name shop
Deleting cluster "shop" ...`,
      },
    ],
    quiz: [
      {
        q: 'You loaded <code>web:latest</code> into kind with <code>kind load docker-image</code>, but pods show <code>ErrImagePull</code>. Why?',
        options: [
          'kind can\'t run images built by Docker',
          'For :latest the default imagePullPolicy is Always, so the kubelet tries to pull from Docker Hub',
          'You must restart the kind cluster after loading',
          'kind load only works with multi-stage images',
        ],
        answer: 1,
        why: 'Use a version tag (default policy IfNotPresent) or set imagePullPolicy: IfNotPresent explicitly.',
      },
      {
        q: 'The Deployment has <code>selector.matchLabels: {app: web}</code> but the template has <code>labels: {app: frontend}</code>. What happens on apply?',
        options: [
          'It works; labels are cosmetic',
          'The API server rejects it: selector does not match template labels',
          'Pods are created but the Service ignores them',
          'The Deployment picks the first matching pod',
        ],
        answer: 1,
        why: 'For apps/v1 Deployments the selector must match the template labels, and the selector is immutable after creation.',
      },
      {
        q: 'Why is <code>readinessProbe</code> essential for zero-downtime rolling updates?',
        options: [
          'It restarts crashed containers',
          'It makes the rollout wait until new pods can actually serve before sending traffic / removing old pods',
          'It speeds up image pulls',
          'It is required for the HPA',
        ],
        answer: 1,
        why: 'Without readiness, a pod counts as available as soon as the process starts, even if it can\'t serve yet. Traffic hits it too early and the old pods are removed too soon.',
      },
      {
        q: 'Which command tests the app end-to-end on kind without any Ingress controller installed?',
        options: ['kubectl proxy --ingress', 'kubectl port-forward svc/web 8080:80', 'kind expose web', 'docker run -p 8080:8080 web'],
        answer: 1,
        why: 'port-forward tunnels from your laptop to the Service (or one pod) through the API server.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `<p><em>Edit the manifest in the box below and click Check.</em></p>
<p>Assemble the capstone <strong>Deployment</strong>. Requirements (the checker verifies each):</p>
<ul>
  <li><code>apps/v1</code> Deployment named <code>web</code> with image <code>web:1.0.0</code> (a version tag, not <code>latest</code>)</li>
  <li>at least <strong>2</strong> replicas</li>
  <li><code>selector.matchLabels</code> must match the pod template's labels</li>
  <li><code>containerPort: 8080</code></li>
  <li>a <code>readinessProbe</code> with <code>httpGet</code> path <code>/ready</code> on port 8080 (or the port's name)</li>
  <li><code>resources.requests</code> for cpu <em>and</em> memory, plus <code>limits.memory</code></li>
  <li><code>envFrom</code> → <code>configMapRef</code> named <code>web-config</code></li>
</ul>`,
      starter: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: apps/v1
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
          image: web:latest
          # TODO: containerPort 8080, envFrom web-config, readinessProbe, resources`,
        CAPSTONE_CHECKS(), 400),
      hint: 'Fix the template label to app: web. Under the container add ports: [- containerPort: 8080], envFrom: [- configMapRef: {name: web-config}], readinessProbe.httpGet {path: /ready, port: 8080} and resources with requests (cpu, memory) and limits (memory).',
      solution: checkerWidget(
        'Edit the manifest in the box below and click Check.',
        `apiVersion: apps/v1
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
          image: web:1.0.0
          ports:
            - name: http
              containerPort: 8080
          envFrom:
            - configMapRef:
                name: web-config
          readinessProbe:
            httpGet:
              path: /ready
              port: http
            periodSeconds: 5
          resources:
            requests:
              cpu: 100m
              memory: 128Mi
            limits:
              memory: 256Mi`,
        CAPSTONE_CHECKS(), 400),
    },
  });

  function CAPSTONE_CHECKS() {
    return String.raw`
function runChecks(docs) {
  var d = findKind(docs, 'Deployment') || {};
  var sel = get(d, 'spec.selector.matchLabels') || {};
  var labels = get(d, 'spec.template.metadata.labels') || {};
  var c = asList(get(d, 'spec.template.spec.containers'))[0] || {};
  var ports = asList(c.ports);
  var p8080 = ports.filter(function (p) { return p && String(p.containerPort) === '8080'; })[0];
  var probe = get(c, 'readinessProbe.httpGet') || {};
  var r = c.resources || {};
  var cm = asList(c.envFrom).filter(function (e) { return e && get(e, 'configMapRef.name') === 'web-config'; });
  var selKeys = Object.keys(sel);
  var image = String(c.image || '');
  return [
    [low(d.apiVersion) === 'apps/v1' && low(get(d, 'metadata.name')) === 'web', 'apps/v1 Deployment named web'],
    [image === 'web:1.0.0' || /\/web:1\.0\.0$/.test(image), 'image is web:1.0.0 (version tag, not latest)'],
    [Number(get(d, 'spec.replicas')) >= 2, 'replicas ≥ 2'],
    [selKeys.length > 0 && selKeys.every(function (k) { return String(labels[k]) === String(sel[k]); }),
      'selector.matchLabels match the template labels'],
    [!!p8080, 'containerPort: 8080'],
    [low(probe.path) === '/ready' && !!p8080 &&
      (String(probe.port) === '8080' || (p8080.name && String(probe.port) === String(p8080.name))),
      'readinessProbe httpGet /ready on port 8080'],
    [!!get(r, 'requests.cpu') && !!get(r, 'requests.memory'), 'resources.requests has cpu and memory'],
    [!!get(r, 'limits.memory'), 'resources.limits.memory is set'],
    [cm.length > 0, 'envFrom configMapRef: web-config'],
  ];
}`;
  }
})();
