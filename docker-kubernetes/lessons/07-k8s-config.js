// Section: Config, Health & Storage — Kubernetes v1.33+ (examples checked against v1.37, Aug 2026).
// Code strings use String.raw so regex backslashes survive; they contain no backticks and no "${".
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── ConfigMaps & Secrets
  {
    id: 'configmaps-secrets',
    section: 'Config, Health & Storage',
    title: 'ConfigMaps & Secrets',
    explain: `
      <p>With Docker you pass configuration with <code>docker run -e LOG_LEVEL=debug</code>, an
      <code>--env-file</code>, or by bind-mounting a config file into the container. Kubernetes splits
      configuration out of the Pod spec into separate API objects:</p>
      <ul>
        <li><strong>ConfigMap</strong> holds non-secret key/value data such as log levels, feature flags or a whole <code>nginx.conf</code>.</li>
        <li><strong>Secret</strong> has the same shape but is meant for passwords, tokens and TLS keys. It gets extra handling: tighter RBAC, it is never printed by <code>kubectl describe</code>, and it can be encrypted at rest.</li>
      </ul>
      <p>Think of the image as the appliance and the ConfigMap as its settings card. You ship one image to
      dev, staging and prod, and each namespace gets its own card.</p>

      <h3>Two ways a container can consume them</h3>
      <table>
        <tr><th></th><th>As environment variables</th><th>As files (volume)</th></tr>
        <tr><td>YAML</td><td><code>env[].valueFrom.configMapKeyRef</code> for one key, <code>envFrom.configMapRef</code> for all keys</td><td><code>volumes[].configMap</code> + <code>volumeMounts</code>. Each key becomes a file</td></tr>
        <tr><td>Docker analogy</td><td><code>-e</code> / <code>--env-file</code></td><td><code>-v ./conf:/etc/app:ro</code></td></tr>
        <tr><td>After you edit the ConfigMap</td><td><strong>Never updated.</strong> Env is fixed when the process starts</td><td><strong>Updated eventually</strong> (typically within a minute or so). Not updated if mounted with <code>subPath</code></td></tr>
        <tr><td>Best for</td><td>Small scalar settings (12-factor style)</td><td>Whole config files, certs, anything the app can hot-reload</td></tr>
      </table>

      <pre><code class="language-yaml">envFrom:
  - configMapRef:
      name: app-config      # every key → an env var of the same name
env:
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:         # one key from a Secret
        name: db-secret
        key: password</code></pre>

      <h3>Secrets are base64, not encrypted</h3>
      <p>The <code>data:</code> field of a Secret is only <strong>base64-encoded</strong>. Anyone who can
      <code>kubectl get secret -o yaml</code> can decode it with <code>base64 -d</code>. By default the API
      server also stores it in etcd unencrypted. To really protect secrets:</p>
      <ul>
        <li>Enable <strong>encryption at rest</strong> (an <code>EncryptionConfiguration</code> on the API server, ideally with a KMS v2 provider). Many managed clusters already do this, but check your provider.</li>
        <li>Lock down RBAC. <code>get</code>/<code>list</code> on <code>secrets</code> is effectively "read every password". Also, anyone who can create a Pod in the namespace can mount any Secret in it.</li>
        <li>Keep the real values in an external manager such as Vault, AWS Secrets Manager or GCP Secret Manager, and sync them in with the <strong>External Secrets Operator</strong> or the <strong>Secrets Store CSI Driver</strong>. For GitOps, <strong>Sealed Secrets</strong> or SOPS let you commit encrypted values.</li>
      </ul>
      <div class="warn">Never commit a Secret manifest with real values to Git. Base64 is an encoding, not a lock.</div>

      <h3>Rolling out a config change</h3>
      <p>Pods that read config from env vars keep the old values until they restart. The usual fix is
      <code>kubectl rollout restart deployment/web</code>, which triggers a normal rolling update.
      Helm and Kustomize can automate this by putting a hash of the config into the Pod template, so a
      config change becomes a new ReplicaSet. Kustomize's <code>configMapGenerator</code> appends a
      hash suffix to the name, and Helm charts often use a <code>checksum/config</code> annotation.</p>
      <div class="tip">Mark a ConfigMap or Secret <code>immutable: true</code> when it should never change in
      place. It protects you from accidental edits and reduces load on the API server. To change it you
      create a new one (e.g. <code>app-config-v2</code>) and point the Deployment at it.</div>
    `,
    examples: [
      {
        title: 'Simulator: edit a ConfigMap, watch env vs volume consumers',
        explain: `
          <details>
            <summary>The problem: "I changed the ConfigMap but my app still logs at info"</summary>
            <p>A ConfigMap is just data in the API server. Your app never reads it directly. The
            <strong>kubelet</strong> copies it into the container, and how it does that decides whether you
            ever see a change:</p>
            <ul>
              <li><strong>Env var</strong>: the kubelet builds the environment once, when the container starts. After that the environment belongs to the Linux process and nothing can change it from outside. Same as <code>docker run -e</code>: you can't change a running container's env either.</li>
              <li><strong>Volume</strong>: the kubelet writes each key as a file. On its periodic sync it notices the new ConfigMap version and swaps the files atomically (through a symlink flip). The delay is roughly the kubelet sync period plus its cache TTL, often up to a minute or more.</li>
            </ul>
            <p>The simulator uses a fixed 60s sync so you can see the delay. The real timing varies.</p>
          </details>
          <details>
            <summary>Step by step: apply "debug", then wait</summary>
            <table>
              <tr><th>Step</th><th>Click</th><th>API (<code>app-config</code>)</th><th><code>web-env-1</code> sees</th><th><code>web-vol-1</code> file</th><th>Console</th></tr>
              <tr><td>0</td><td>(page loads)</td><td>info, rv 1</td><td>info</td><td>info</td><td>—</td></tr>
              <tr><td>1</td><td><strong>kubectl apply</strong> (input is <code>debug</code>)</td><td><strong>debug</strong>, rv 2</td><td>info <em>(red, stale)</em></td><td>info <em>(red, stale)</em></td><td><code>$ kubectl apply -f app-config.yaml</code><br><code>configmap/app-config configured</code></td></tr>
              <tr><td>2</td><td><strong>Wait 20s ▶</strong></td><td>debug</td><td>info</td><td>info</td><td><code>[t=20s] waiting… web-env-1 sees info, web-vol-1 sees info</code></td></tr>
              <tr><td>3</td><td><strong>Wait 20s ▶</strong></td><td>debug</td><td>info</td><td>info</td><td><code>[t=40s] waiting… web-env-1 sees info, web-vol-1 sees info</code></td></tr>
              <tr><td>4</td><td><strong>Wait 20s ▶</strong></td><td>debug</td><td>info <em>(still stale)</em></td><td><strong>debug</strong> (green)</td><td><code>[t=60s] kubelet sync: updated /etc/config/LOG_LEVEL in web-vol-1 → debug</code></td></tr>
              <tr><td>5</td><td><strong>kubectl exec: inspect both</strong></td><td>debug</td><td>info</td><td>debug</td><td><code>$ kubectl exec web-env-1 -- printenv LOG_LEVEL</code> → <code>info</code><br><code>$ kubectl exec web-vol-1 -- cat /etc/config/LOG_LEVEL</code> → <code>debug</code></td></tr>
              <tr><td>6</td><td><strong>rollout restart</strong> (env pod)</td><td>debug</td><td>new pod <code>web-env-2</code>: <strong>debug</strong></td><td>debug</td><td><code>$ kubectl rollout restart deployment/web-env</code><br><code>deployment.apps/web-env restarted</code><br><code>[t=60s] web-env-2 started, LOG_LEVEL=debug (env read at container start)</code></td></tr>
            </table>
            <p>Notice step 4: the file is up to date but the env var is not, even though both come from the
            <em>same</em> ConfigMap. Only a new container (step 6) reads the env again.</p>
          </details>
          <details>
            <summary>Try this: the <code>subPath</code> trap</summary>
            <p>Click <strong>Reset</strong>, tick <strong>mounted with subPath</strong>, apply <code>debug</code>
            and wait until t=60s. The console prints
            <code>[t=60s] kubelet sync: web-vol-1 mounts with subPath → file NOT updated</code>.
            A <code>subPath</code> mount bind-mounts one file directly, so the kubelet's symlink swap never
            reaches it. Only a restart helps (the <strong>rollout restart</strong> button on the volume pod).</p>
            <div class="warn">An updated file only helps if the app <em>re-reads</em> it, by watching the file
            (inotify) or reloading on a timer or on SIGHUP. Most apps read config once at boot, so for them a
            volume behaves just like an env var and you still need a rollout restart.</div>
          </details>
        `,
        code: String.raw`<style>
  body { font: 13px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
  .card { background: #fff; border: 1px solid #d5dbe6; border-radius: 8px; padding: 10px; flex: 1; min-width: 200px; }
  .card h4 { margin: 0 0 6px; font-size: 13px; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
  .val { display: inline-block; padding: 2px 8px; border-radius: 4px; font-weight: 600; }
  .fresh { background: #e3f5e8; color: #137333; }
  .stale { background: #fdecea; color: #b3261e; }
  button { padding: 5px 10px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; margin: 4px 2px 0 0; }
  button.alt { background: #5f6b7a; }
  input[type=text] { width: 90px; padding: 3px 5px; border: 1px solid #c9d1de; border-radius: 4px; }
  .clock { font-weight: 700; font-size: 16px; }
  .muted { color: #5f6b7a; font-size: 12px; margin-top: 4px; }
</style>

<div class="row">
  <div class="card">
    <h4>ConfigMap <span class="mono">app-config</span></h4>
    <div class="mono">LOG_LEVEL: <input id="val" type="text" value="debug"></div>
    <button id="apply">kubectl apply</button>
    <div class="muted">stored in API: <b id="cmv">info</b> (resourceVersion <span id="rv">1</span>)</div>
  </div>
  <div class="card">
    <h4>Cluster clock</h4>
    <div class="clock">t = <span id="t">0</span>s</div>
    <button id="wait">Wait 20s ▶</button>
    <div class="muted">In this sim the kubelet syncs mounted ConfigMaps every 60s (next: <span id="next">60</span>s)</div>
  </div>
</div>

<div class="row">
  <div class="card">
    <h4>Pod <span class="mono" id="envName">web-env-1</span> — env var</h4>
    <div class="mono">env LOG_LEVEL ← configMapKeyRef</div>
    <div style="margin-top:6px">process sees: <span id="envVal" class="val fresh">info</span></div>
    <button id="restartEnv" class="alt">rollout restart</button>
  </div>
  <div class="card">
    <h4>Pod <span class="mono" id="volName">web-vol-1</span> — volume</h4>
    <div class="mono">file /etc/config/LOG_LEVEL</div>
    <div style="margin-top:6px">file contains: <span id="volVal" class="val fresh">info</span></div>
    <button id="restartVol" class="alt">rollout restart</button>
    <label class="muted" style="display:block"><input type="checkbox" id="subpath"> mounted with subPath</label>
  </div>
</div>

<button id="inspect">kubectl exec: inspect both</button>
<button id="reset" class="alt">Reset</button>

<script>
  var s;

  function initState() {
    s = { t: 0, cm: 'info', rv: 1, env: 'info', envGen: 1, vol: 'info', volGen: 1 };
  }

  function $(id) {
    return document.getElementById(id);
  }

  function envPod() {
    return 'web-env-' + s.envGen;
  }

  function volPod() {
    return 'web-vol-' + s.volGen;
  }

  function paint() {
    $('t').textContent = s.t;
    $('next').textContent = (Math.floor(s.t / 60) + 1) * 60;
    $('cmv').textContent = s.cm;
    $('rv').textContent = s.rv;
    $('envName').textContent = envPod();
    $('volName').textContent = volPod();
    $('envVal').textContent = s.env;
    $('volVal').textContent = s.vol;
    $('envVal').className = 'val ' + (s.env === s.cm ? 'fresh' : 'stale');
    $('volVal').className = 'val ' + (s.vol === s.cm ? 'fresh' : 'stale');
  }

  $('apply').onclick = function () {
    var v = $('val').value.trim();
    console.log('$ kubectl apply -f app-config.yaml');
    if (!v || v === s.cm) {
      console.log('configmap/app-config unchanged');
      return;
    }
    s.cm = v;
    s.rv += 1;
    console.log('configmap/app-config configured');
    paint();
  };

  $('wait').onclick = function () {
    s.t += 20;
    if (s.t % 60 === 0) {
      if (s.vol === s.cm) {
        console.log('[t=' + s.t + 's] kubelet sync: nothing to update');
      } else if ($('subpath').checked) {
        console.log('[t=' + s.t + 's] kubelet sync: ' + volPod() + ' mounts with subPath → file NOT updated');
      } else {
        s.vol = s.cm;
        console.log('[t=' + s.t + 's] kubelet sync: updated /etc/config/LOG_LEVEL in ' + volPod() + ' → ' + s.vol);
      }
    } else {
      console.log('[t=' + s.t + 's] waiting… ' + envPod() + ' sees ' + s.env + ', ' + volPod() + ' sees ' + s.vol);
    }
    paint();
  };

  $('restartEnv').onclick = function () {
    s.envGen += 1;
    s.env = s.cm;
    console.log('$ kubectl rollout restart deployment/web-env');
    console.log('deployment.apps/web-env restarted');
    console.log('[t=' + s.t + 's] ' + envPod() + ' started, LOG_LEVEL=' + s.env + ' (env read at container start)');
    paint();
  };

  $('restartVol').onclick = function () {
    s.volGen += 1;
    s.vol = s.cm;
    console.log('$ kubectl rollout restart deployment/web-vol');
    console.log('deployment.apps/web-vol restarted');
    console.log('[t=' + s.t + 's] ' + volPod() + ' started, /etc/config/LOG_LEVEL=' + s.vol + ' (fresh mount)');
    paint();
  };

  $('inspect').onclick = function () {
    console.log('$ kubectl exec ' + envPod() + ' -- printenv LOG_LEVEL');
    console.log(s.env);
    console.log('$ kubectl exec ' + volPod() + ' -- cat /etc/config/LOG_LEVEL');
    console.log(s.vol);
  };

  $('reset').onclick = function () {
    initState();
    $('val').value = 'debug';
    console.log('--- reset ---');
    paint();
  };

  initState();
  paint();
</script>`,
      },
      {
        title: 'Reference: ConfigMap + Secret + Deployment that uses both',
        runnable: false,
        lang: 'yaml',
        code: `# config.yaml — apply with: kubectl apply -f config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  LOG_LEVEL: info
  FEATURE_FLAGS: "search,beta-ui"   # quote values that YAML might misread
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-files
data:
  app.properties: |                 # a whole file as one key
    cache.ttl=300
    greeting=hello
---
apiVersion: v1
kind: Secret
metadata:
  name: db-secret
type: Opaque
stringData:                         # plain text in; the API stores it base64 under data:
  username: app
  password: s3cr3t-change-me        # demo only — never commit real secrets
---
apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          envFrom:                  # ① every key of app-config → env var
            - configMapRef:
                name: app-config
          env:
            - name: DB_USER         # ② single keys from the Secret
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: username
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          volumeMounts:
            - name: files           # ③ app-files keys → files in /etc/app
              mountPath: /etc/app
              readOnly: true
      volumes:
        - name: files
          configMap:
            name: app-files         # → /etc/app/app.properties`,
      },
      {
        title: 'Reference: create, decode and roll out config from the CLI',
        runnable: false,
        lang: 'bash',
        code: `$ kubectl create configmap app-config \\
    --from-literal=LOG_LEVEL=info --from-literal=FEATURE_FLAGS=search,beta-ui
configmap/app-config created

# Generate YAML instead of creating (great for committing to Git):
$ kubectl create configmap app-files --from-file=app.properties --dry-run=client -o yaml
apiVersion: v1
data:
  app.properties: |
    cache.ttl=300
    greeting=hello
kind: ConfigMap
metadata:
  name: app-files

$ kubectl create secret generic db-secret \\
    --from-literal=username=app --from-literal=password='s3cr3t-change-me'
secret/db-secret created

# "Hidden"... until you decode it:
$ kubectl get secret db-secret -o jsonpath='{.data.password}'
czNjcjN0LWNoYW5nZS1tZQ==
$ kubectl get secret db-secret -o jsonpath='{.data.password}' | base64 -d
s3cr3t-change-me

$ kubectl describe secret db-secret
Name:         db-secret
Type:         Opaque
Data
====
password:  16 bytes
username:  3 bytes

# Change a value, then restart so env-var consumers pick it up:
$ kubectl edit configmap app-config          # set LOG_LEVEL: debug
configmap/app-config edited
$ kubectl exec deploy/web -- printenv LOG_LEVEL
info
$ kubectl rollout restart deployment/web
deployment.apps/web restarted
$ kubectl rollout status deployment/web
deployment "web" successfully rolled out
$ kubectl exec deploy/web -- printenv LOG_LEVEL
debug`,
      },
    ],
    quiz: [
      {
        q: 'You edit a ConfigMap that a running Pod consumes through <code>envFrom</code>. What happens to the running container?',
        options: [
          'Its env vars update within about a minute',
          'Nothing. It keeps the old values until the container is restarted',
          'The kubelet restarts the container automatically',
          'The Deployment creates a new ReplicaSet automatically',
        ],
        answer: 1,
        why: 'The environment of a running process is fixed at start time. You need a restart, e.g. <code>kubectl rollout restart deployment/web</code>, or a config hash in the Pod template so a change triggers a rollout.',
      },
      {
        q: 'What protects the values in a Kubernetes Secret by default?',
        options: [
          'AES encryption with a cluster key',
          'Only base64 encoding, plus whatever RBAC and encryption-at-rest you configure',
          'They are hashed and cannot be read back',
          'They are stored only in memory on the node',
        ],
        answer: 1,
        why: 'Base64 is reversible by anyone. Real protection comes from RBAC, enabling encryption at rest (EncryptionConfiguration/KMS), and ideally an external secret manager.',
      },
      {
        q: 'A ConfigMap is mounted as a volume, but one file is mounted with <code>subPath</code>. After you update the ConfigMap…',
        options: [
          'the subPath file updates like the others',
          'the subPath file never updates until the Pod restarts',
          'the Pod is evicted',
          'the update is rejected by the API server',
        ],
        answer: 1,
        why: 'The kubelet updates projected volumes by swapping a symlink. A subPath mount bind-mounts the old file directly, so it never sees the swap.',
      },
      {
        q: 'Which is the closest Kubernetes equivalent of <code>docker run --env-file app.env</code>?',
        options: [
          '<code>volumes: - configMap</code>',
          '<code>envFrom: - configMapRef</code>',
          '<code>env: - value</code>',
          '<code>imagePullSecrets</code>',
        ],
        answer: 1,
        why: '<code>envFrom</code> turns every key of a ConfigMap (or Secret, via <code>secretRef</code>) into an env var, just like an env file.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `
        <p>This Deployment hard-codes its password and log level. Fix it so that:</p>
        <ol>
          <li>All keys of the ConfigMap <code>app-config</code> become env vars (use <code>envFrom</code>).</li>
          <li><code>DB_PASSWORD</code> comes from the Secret <code>db-secret</code>, key <code>password</code> (no plain <code>value:</code>).</li>
          <li>The ConfigMap <code>app-files</code> is mounted as a volume at <code>/etc/app</code>, and the volume name matches the mount name.</li>
        </ol>
        <p>Edit the manifest in the box below and click <strong>Check</strong>. Every line should turn ✓.</p>`,
      hint: 'Under the container add <code>envFrom: - configMapRef: name: app-config</code>. For the password use <code>valueFrom: secretKeyRef: {name, key}</code>. At pod level add <code>volumes: - name: files, configMap: name: app-files</code> and in the container <code>volumeMounts: - name: files, mountPath: /etc/app</code>.',
      starter: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 250px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          env:
            - name: LOG_LEVEL
              value: info
            - name: DB_PASSWORD
              value: hunter2
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function check() {
    var y = document.getElementById('f').value;
    var envFrom = blockAfter(y, /^\s*envFrom\s*:/);
    var pw = blockAfter(y, /^\s*-\s*name\s*:\s*["']?DB_PASSWORD["']?\s*$/);
    var mounts = blockAfter(y, /^\s*volumeMounts\s*:/);
    var vols = blockAfter(y, /^\s*volumes\s*:/);
    var mountName = (mounts.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var volName = (vols.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var rules = [
      ['envFrom with configMapRef name app-config',
        /configMapRef\s*:/.test(envFrom) && /name\s*:\s*["']?app-config["']?\s*$/m.test(envFrom)],
      ['LOG_LEVEL no longer hard-coded', !/name\s*:\s*["']?LOG_LEVEL/.test(y)],
      ['DB_PASSWORD uses secretKeyRef', /secretKeyRef\s*:/.test(pw)],
      ['secretKeyRef name db-secret, key password',
        /name\s*:\s*["']?db-secret["']?\s*$/m.test(pw) && /key\s*:\s*["']?password["']?\s*$/m.test(pw)],
      ['no plain-text password (value: hunter2)', !/value\s*:\s*["']?hunter2/.test(y)],
      ['volumeMount at /etc/app', /mountPath\s*:\s*["']?\/etc\/app\/?["']?\s*$/m.test(mounts)],
      ['volume from configMap app-files',
        /configMap\s*:/.test(vols) && /name\s*:\s*["']?app-files["']?\s*$/m.test(vols)],
      ['volume name matches volumeMount name', !!mountName && mountName === volName],
    ];
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules.forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
</script>`,
      solution: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 250px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          envFrom:
            - configMapRef:
                name: app-config
          env:
            - name: DB_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: db-secret
                  key: password
          volumeMounts:
            - name: files
              mountPath: /etc/app
              readOnly: true
      volumes:
        - name: files
          configMap:
            name: app-files
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function check() {
    var y = document.getElementById('f').value;
    var envFrom = blockAfter(y, /^\s*envFrom\s*:/);
    var pw = blockAfter(y, /^\s*-\s*name\s*:\s*["']?DB_PASSWORD["']?\s*$/);
    var mounts = blockAfter(y, /^\s*volumeMounts\s*:/);
    var vols = blockAfter(y, /^\s*volumes\s*:/);
    var mountName = (mounts.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var volName = (vols.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var rules = [
      ['envFrom with configMapRef name app-config',
        /configMapRef\s*:/.test(envFrom) && /name\s*:\s*["']?app-config["']?\s*$/m.test(envFrom)],
      ['LOG_LEVEL no longer hard-coded', !/name\s*:\s*["']?LOG_LEVEL/.test(y)],
      ['DB_PASSWORD uses secretKeyRef', /secretKeyRef\s*:/.test(pw)],
      ['secretKeyRef name db-secret, key password',
        /name\s*:\s*["']?db-secret["']?\s*$/m.test(pw) && /key\s*:\s*["']?password["']?\s*$/m.test(pw)],
      ['no plain-text password (value: hunter2)', !/value\s*:\s*["']?hunter2/.test(y)],
      ['volumeMount at /etc/app', /mountPath\s*:\s*["']?\/etc\/app\/?["']?\s*$/m.test(mounts)],
      ['volume from configMap app-files',
        /configMap\s*:/.test(vols) && /name\s*:\s*["']?app-files["']?\s*$/m.test(vols)],
      ['volume name matches volumeMount name', !!mountName && mountName === volName],
    ];
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules.forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
  check();
</script>`,
    },
  },
  // ───────────────────────────────────────────────────────────── Probes
  {
    id: 'probes',
    section: 'Config, Health & Storage',
    title: 'Liveness, readiness & startup probes',
    explain: `
      <p>A running process is not the same as a <em>working</em> app. It might still be warming caches,
      it might be deadlocked, or its database might be down. Docker's <code>HEALTHCHECK</code> only
      <em>marks</em> a container as <code>unhealthy</code>. Plain Docker won't restart it for that, and it
      doesn't stop sending traffic either. Kubernetes gives you three probes, and each one triggers a
      <strong>different action</strong>:</p>
      <table>
        <tr><th>Probe</th><th>Question it asks</th><th>When it fails</th></tr>
        <tr><td><strong>readinessProbe</strong></td><td>"Can you take traffic <em>right now</em>?"</td><td>Pod is removed from the Service's endpoints. <strong>No restart.</strong> It is added back when the probe passes again.</td></tr>
        <tr><td><strong>livenessProbe</strong></td><td>"Are you stuck beyond self-repair?"</td><td>The kubelet <strong>kills and restarts</strong> the container (with growing back-off: 10s, 20s, 40s… up to 5 min).</td></tr>
        <tr><td><strong>startupProbe</strong></td><td>"Have you finished booting?"</td><td>While it hasn't passed yet, liveness and readiness are <strong>not run at all</strong>. If it fails <code>failureThreshold</code> times, the container is restarted.</td></tr>
      </table>
      <p>Analogy: readiness is a restaurant flipping its sign to "closed" during a rush, while the
      kitchen keeps working. Liveness is the manager sending a frozen cook home and calling in a new one.
      Startup is "don't judge the new cook during their first hour".</p>

      <h3>How a probe checks</h3>
      <ul>
        <li><code>httpGet</code>: any status from 200 to 399 passes. The most common choice.</li>
        <li><code>tcpSocket</code>: passes if the port accepts a connection.</li>
        <li><code>exec</code>: runs a command in the container. Exit code 0 passes.</li>
        <li><code>grpc</code>: uses the standard gRPC health-checking protocol.</li>
      </ul>

      <h3>Timing fields (and their defaults)</h3>
      <pre><code class="language-yaml">livenessProbe:
  httpGet: { path: /healthz, port: 8080 }
  initialDelaySeconds: 0   # wait after container start before the first probe
  periodSeconds: 10        # how often to probe
  timeoutSeconds: 1        # a slower response counts as a failure
  failureThreshold: 3      # consecutive failures before acting
  successThreshold: 1      # consecutive successes to count as healthy again</code></pre>
      <p>The time before a liveness restart is roughly <code>initialDelaySeconds + failureThreshold × periodSeconds</code>.
      For a startup probe, <code>failureThreshold × periodSeconds</code> is the <strong>maximum boot time</strong>
      you allow (e.g. 30 × 5s = 150s).</p>

      <div class="warn"><strong>Classic pitfall:</strong> a liveness probe that checks a <em>dependency</em>
      (the database, another service). If the DB blips, <em>every</em> replica fails liveness at once and
      gets restarted. Restarting doesn't fix the DB. It only adds boot time, and all the pods reconnect to
      the database at the same moment. Liveness should check only "is <em>this process</em> wedged?".
      Put dependency checks, if anywhere, in <strong>readiness</strong>.</div>
      <div class="tip">A good default for a web service: a <code>readinessProbe</code> on <code>/ready</code>,
      a cheap <code>livenessProbe</code> on <code>/healthz</code> that does no I/O, and a
      <code>startupProbe</code> on <code>/healthz</code> if boot can take more than a few seconds. If you're
      unsure about liveness, leave it out. A wrong liveness probe causes more outages than no liveness probe.</div>
    `,
    examples: [
      {
        title: 'Simulator: a 180-second timeline with configurable probes',
        explain: `
          <details>
            <summary>The problem: a slow-booting app plus a liveness probe = restart loop</summary>
            <p>With the defaults (boot time 45s, readiness + liveness, no startup probe), the timeline goes all
            red and grey. Liveness starts probing at t=10s (<code>initialDelaySeconds: 10</code>), every 5s,
            and gives up after 3 failures. That is only <strong>20s</strong> of patience for an app that needs 45s:</p>
            <table>
              <tr><th>t</th><th>Container</th><th>What the kubelet does</th><th>Console</th></tr>
              <tr><td>0s</td><td>booting (attempt 1)</td><td>starts the container</td><td><code>[t=0s] container started</code></td></tr>
              <tr><td>10, 15, 20s</td><td>still booting</td><td>GET /healthz → connection refused ×3</td><td><code>[t=20s] liveness probe failed 3x → kubelet kills container (restart #1, back-off 10s)</code></td></tr>
              <tr><td>20–25s</td><td>back-off (grey)</td><td>waits 10s</td><td>—</td></tr>
              <tr><td>30s</td><td>booting <em>from zero</em> (attempt 2)</td><td>restarts it</td><td><code>[t=30s] container started again (attempt 2)</code></td></tr>
              <tr><td>50s</td><td>killed again</td><td>3 more failures</td><td><code>[t=50s] liveness probe failed 3x → … (restart #2, back-off 20s)</code></td></tr>
              <tr><td>70s / 90s</td><td>attempt 3 → killed</td><td></td><td><code>(restart #3, back-off 40s)</code></td></tr>
              <tr><td>130s / 150s</td><td>attempt 4 → killed</td><td></td><td><code>(restart #4, back-off 80s)</code></td></tr>
            </table>
            <p>Summary line: <code>Restarts: 4 · Ready 0s of 180s · Requests (1 per 5s): 0 ok, 0 failed</code>.
            The app is fine, but it <strong>never gets to finish booting</strong>. In <code>kubectl get pods</code>
            this looks like <code>CrashLoopBackOff</code>, and the probe is the cause. The readiness probe did its job:
            the Traffic row stays grey (·), so users got "no endpoints" instead of errors.</p>
          </details>
          <details>
            <summary>The fix: tick <code>startupProbe</code></summary>
            <pre><code class="language-yaml">startupProbe:
  httpGet: { path: /healthz, port: 8080 }
  periodSeconds: 5
  failureThreshold: 30     # ① up to 30 × 5s = 150s to boot
livenessProbe:             # ② not run until startup has passed
  httpGet: { path: /healthz, port: 8080 }
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
readinessProbe:            # ③ also gated; decides Service membership
  httpGet: { path: /ready, port: 8080 }
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 3</code></pre>
            <ol>
              <li><strong>①</strong> The startup probe fails every 5s from t=0 to t=40 (9 failures, far below 30). That's fine: it only restarts after 30.</li>
              <li><strong>②</strong> While startup hasn't passed, liveness is switched off, so nobody kills the booting app.</li>
              <li><strong>③</strong> Readiness also waits, then decides when traffic starts.</li>
            </ol>
            <table>
              <tr><th>t</th><th>Event</th><th>Console</th></tr>
              <tr><td>0s</td><td>container starts, startup probe fails (booting)</td><td><code>[t=0s] container started</code></td></tr>
              <tr><td>45s</td><td>app is up → startup passes</td><td><code>[t=45s] startup probe succeeded → liveness &amp; readiness probes begin</code></td></tr>
              <tr><td>50s</td><td>first readiness probe passes → traffic starts (✓)</td><td><code>[t=50s] readiness probe succeeded → pod added to Service endpoints</code></td></tr>
            </table>
            <p>Summary: <code>Restarts: 0 · Ready 130s of 180s · Requests (1 per 5s): 26 ok, 0 failed</code>.</p>
            <div class="tip">Why not just set liveness <code>initialDelaySeconds: 60</code>? It works, but it's a
            fixed wait. A fast boot still waits 60s before liveness protection starts, and a slow boot (a cold node,
            a big migration) at 61s still gets killed. A startup probe is a <em>maximum</em>: it passes as soon as the app is up.</div>
          </details>
          <details>
            <summary>The dependency pitfall: pick "database down t=100–130s"</summary>
            <p>Keep all three probes ticked and choose the DB scenario. <code>/ready</code> checks the DB,
            <code>/healthz</code> doesn't:</p>
            <table>
              <tr><th>t</th><th>/healthz ignores DB (default)</th><th>tick "/healthz also checks the DB"</th></tr>
              <tr><td>100, 105s</td><td>requests fail (✗): still Ready, readiness needs 3 failures</td><td>same</td></tr>
              <tr><td>110s</td><td><code>readiness probe failed 3x → pod removed from Service endpoints (no restart)</code></td><td>same, <strong>plus</strong> <code>liveness probe failed 3x → kubelet kills container (restart #1, back-off 10s)</code></td></tr>
              <tr><td>120s</td><td>out of endpoints, app idles</td><td><code>container started again (attempt 2)</code>, boots for 45s</td></tr>
              <tr><td>130s</td><td>DB back → <code>readiness probe succeeded → pod added to Service endpoints</code></td><td>still booting…</td></tr>
              <tr><td>170s</td><td>serving</td><td>finally <code>readiness probe succeeded</code></td></tr>
              <tr><td>Summary</td><td><code>Restarts: 0 · Ready 110s of 180s · … 20 ok, 2 failed</code></td><td><code>Restarts: 1 · Ready 70s of 180s · … 12 ok, 2 failed</code></td></tr>
            </table>
            <p>A 30-second DB blip became a 70-second outage, and that is with a single pod. With 20 replicas, all of
            them restart together and hit the recovering database at the same moment. That's a
            <strong>cascading failure</strong>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li><strong>No probes at all</strong> (untick everything, healthy): <code>Ready 180s of 180s · … 27 ok, 9 failed</code>. With no readiness probe the pod counts as Ready the moment the container starts, so the first 9 requests (t=0–40s) hit an app that is still booting.</li>
              <li><strong>Deadlock, readiness only</strong>: at t=110s the pod leaves the endpoints and <em>stays out forever</em> (<code>Restarts: 0 · Ready 60s</code>). Readiness can't fix a stuck process.</li>
              <li><strong>Deadlock, all three probes</strong>: liveness kills it at t=110s, it's back at t=170s. This is exactly what liveness is for.</li>
              <li>Drag boot time to 90s with the startup probe on: it still works, because 90s is inside the 150s budget.</li>
            </ul>
          </details>
        `,
        code: String.raw`<style>
  body { font: 13px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  .panel { background: #fff; border: 1px solid #d5dbe6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 4px 16px; align-items: center; }
  .ctl label { white-space: nowrap; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; color: #5f6b7a; }
  .grid { display: grid; grid-template-columns: 74px repeat(36, 1fr); gap: 1px; font-size: 10px; }
  .lab { font-weight: 600; font-size: 11px; align-self: center; }
  .c { height: 20px; border-radius: 2px; display: flex; align-items: center; justify-content: center; color: #fff; }
  .boot { background: #e6a700; } .run { background: #1e8e3e; } .hung { background: #8e44ad; }
  .wait { background: #b8c0cc; } .kill { background: #c5221f; }
  .yes { background: #1e8e3e; } .no { background: #e1e5ec; }
  .ok { background: #1e8e3e; } .err { background: #c5221f; } .none { background: #e1e5ec; color: #8a94a3; }
  .ax { font-size: 9.5px; color: #5f6b7a; text-align: left; }
  .sum { font-weight: 600; margin-top: 6px; }
  .legend span { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin: 0 3px 0 10px; vertical-align: -1px; }
</style>

<div class="panel ctl">
  <label>App boot time: <b id="bootv">45</b>s
    <input id="boot" type="range" min="10" max="90" step="5" value="45"></label>
  <label>Scenario:
    <select id="scn">
      <option value="none">healthy</option>
      <option value="hang">app deadlocks at t=100s</option>
      <option value="db">database down t=100–130s</option>
    </select></label>
</div>
<div class="panel">
  <div class="ctl">
    <label><input type="checkbox" id="useS"> startupProbe</label>
    <label><input type="checkbox" id="useR" checked> readinessProbe</label>
    <label><input type="checkbox" id="useL" checked> livenessProbe</label>
    <label><input type="checkbox" id="liveDB"> /healthz also checks the DB</label>
  </div>
  <div class="mono">startup: GET /healthz period 5s, failureThreshold 30 (150s budget) ·
    readiness: GET /ready delay 5s, period 5s, failureThreshold 3 ·
    liveness: GET /healthz delay 10s, period 5s, failureThreshold 3</div>
</div>
<div class="panel">
  <div class="grid" id="grid"></div>
  <div class="legend mono">
    <span class="boot"></span>booting <span class="run"></span>running <span class="hung"></span>hung
    <span class="wait"></span>back-off <span class="kill"></span>killed
    <span class="ok"></span>request ok <span class="err"></span>request failed
  </div>
  <div class="sum" id="sum"></div>
</div>

<script>
  var END = 180;
  var STEP = 5;
  var S = { delay: 0, period: 5, fail: 30 };
  var R = { delay: 5, period: 5, fail: 3 };
  var L = { delay: 10, period: 5, fail: 3 };

  function el(id) {
    return document.getElementById(id);
  }

  function due(p, age) {
    return age >= p.delay && (age - p.delay) % p.period === 0;
  }

  function simulate(o) {
    var log = [];
    var cells = [];
    var start = 0;
    var attempt = 1;
    var restarts = 0;
    var startupOK = false;
    var ready = false;
    var sf = 0;
    var rf = 0;
    var lf = 0;
    var ok = 0;
    var bad = 0;
    var readySecs = 0;

    function say(t, msg) {
      log.push('[t=' + t + 's] ' + msg);
    }

    function kill(t, why) {
      restarts += 1;
      var backoff = Math.min(300, 10 * Math.pow(2, restarts - 1));
      say(t, why + ' → kubelet kills container (restart #' + restarts + ', back-off ' + backoff + 's)');
      if (ready) say(t, 'pod removed from Service endpoints');
      start = t + backoff;
      attempt += 1;
      startupOK = false;
      ready = false;
      sf = 0;
      rf = 0;
      lf = 0;
    }

    for (var t = 0; t < END; t += STEP) {
      if (t < start) {
        cells.push({ c: 'wait', r: false, q: 'none' });
        continue;
      }
      if (t === start) {
        say(t, attempt === 1 ? 'container started' : 'container started again (attempt ' + attempt + ')');
      }
      var age = t - start;
      var up = age >= o.boot;
      var hung = o.scn === 'hang' && attempt === 1 && t >= 100;
      var dbUp = !(o.scn === 'db' && t >= 100 && t < 130);
      var healthz = up && !hung && (!o.liveDB || dbUp);
      var readyz = up && !hung && dbUp;
      var state = !up ? 'boot' : hung ? 'hung' : 'run';
      var killed = false;
      var gate = true;

      if (o.useS && !startupOK) {
        gate = false;
        if (due(S, age)) {
          if (healthz) {
            startupOK = true;
            say(t, 'startup probe succeeded → liveness & readiness probes begin');
          } else {
            sf += 1;
            if (sf >= S.fail) {
              kill(t, 'startup probe failed ' + S.fail + 'x');
              killed = true;
            }
          }
        }
      }

      if (!killed && gate && o.useR && due(R, age)) {
        if (readyz) {
          rf = 0;
          if (!ready) {
            ready = true;
            say(t, 'readiness probe succeeded → pod added to Service endpoints');
          }
        } else {
          rf += 1;
          if (ready && rf >= R.fail) {
            ready = false;
            say(t, 'readiness probe failed ' + R.fail + 'x → pod removed from Service endpoints (no restart)');
          }
        }
      }

      if (!killed && !o.useR) {
        var nowReady = !o.useS || startupOK;
        if (nowReady && !ready) {
          say(t, 'no readiness probe → pod counted Ready, gets traffic immediately');
        }
        ready = nowReady;
      }

      if (!killed && gate && o.useL && due(L, age)) {
        if (healthz) {
          lf = 0;
        } else {
          lf += 1;
          if (lf >= L.fail) {
            kill(t, 'liveness probe failed ' + L.fail + 'x');
            killed = true;
          }
        }
      }

      var q = 'none';
      if (!killed && ready) {
        q = readyz ? 'ok' : 'err';
        readySecs += STEP;
      }
      if (q === 'ok') ok += 1;
      if (q === 'err') bad += 1;
      cells.push({ c: killed ? 'kill' : state, r: !killed && ready, q: q });
    }

    return { log: log, cells: cells, restarts: restarts, ok: ok, bad: bad, readySecs: readySecs };
  }

  function options() {
    return {
      boot: Number(el('boot').value),
      scn: el('scn').value,
      useS: el('useS').checked,
      useR: el('useR').checked,
      useL: el('useL').checked,
      liveDB: el('liveDB').checked,
    };
  }

  function render(printLog) {
    var o = options();
    el('bootv').textContent = o.boot;
    var res = simulate(o);
    var g = el('grid');
    var html = '<div class="lab">t (s)</div>';
    for (var i = 0; i < 36; i++) {
      html += '<div class="ax">' + (i % 6 === 0 ? i * STEP : '') + '</div>';
    }
    var rows = [
      ['Container', function (x) { return x.c; }, function (x) { return x.c === 'kill' ? '✕' : ''; }],
      ['Ready', function (x) { return x.r ? 'yes' : 'no'; }, function () { return ''; }],
      ['Traffic', function (x) { return x.q; }, function (x) { return x.q === 'ok' ? '✓' : x.q === 'err' ? '✗' : '·'; }],
    ];
    rows.forEach(function (row) {
      html += '<div class="lab">' + row[0] + '</div>';
      res.cells.forEach(function (x) {
        html += '<div class="c ' + row[1](x) + '">' + row[2](x) + '</div>';
      });
    });
    g.innerHTML = html;
    el('sum').textContent = 'Restarts: ' + res.restarts + ' · Ready ' + res.readySecs + 's of ' + END +
      's · Requests (1 per 5s): ' + res.ok + ' ok, ' + res.bad + ' failed';
    if (printLog) {
      var probes = ['startup', 'readiness', 'liveness'].filter(function (n, i) {
        return [o.useS, o.useR, o.useL][i];
      });
      console.log('--- boot ' + o.boot + 's | probes: ' + (probes.join('+') || 'none') +
        (o.liveDB ? ' (/healthz checks DB)' : '') + ' | scenario: ' + o.scn + ' ---');
      res.log.forEach(function (line) { console.log(line); });
      console.log(el('sum').textContent);
    }
  }

  el('boot').oninput = function () { render(false); };
  ['boot', 'scn', 'useS', 'useR', 'useL', 'liveDB'].forEach(function (id) {
    el(id).onchange = function () { render(true); };
  });
  render(true);
</script>`,
      },
      {
        title: 'Reference: all three probes on a Deployment',
        runnable: false,
        lang: 'yaml',
        code: `apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          ports:
            - name: http
              containerPort: 8080
          startupProbe:                 # boot budget: 30 × 5s = 150s
            httpGet:
              path: /healthz
              port: http                # named port works too
            periodSeconds: 5
            failureThreshold: 30
          readinessProbe:               # in/out of Service endpoints
            httpGet:
              path: /ready              # may check "can I serve?" (DB pool, warm cache)
              port: http
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:                # restart only if the process is wedged
            httpGet:
              path: /healthz            # cheap, no dependency checks
              port: http
            periodSeconds: 10
            timeoutSeconds: 2
            failureThreshold: 3
        - name: worker                  # non-HTTP example
          image: ghcr.io/example/worker:1.4.0
          livenessProbe:
            exec:
              command: ["sh", "-c", "test $(( $(date +%s) - $(cat /tmp/heartbeat) )) -lt 60"]
            periodSeconds: 15`,
      },
      {
        title: 'Reference: what failing probes look like in kubectl',
        runnable: false,
        lang: 'bash',
        code: `$ kubectl get pods
NAME                   READY   STATUS             RESTARTS      AGE
web-6f9c8d7b5-x2kqp    0/1     CrashLoopBackOff   4 (30s ago)   3m
web-6f9c8d7b5-q8wnm    0/1     Running            0             3m

$ kubectl describe pod web-6f9c8d7b5-x2kqp
...
    Liveness:   http-get http://:http/healthz delay=10s timeout=1s period=5s #success=1 #failure=3
    Readiness:  http-get http://:http/ready delay=5s timeout=1s period=5s #success=1 #failure=3
    Last State: Terminated
      Reason:   Error
      Exit Code: 137
Events:
  Type     Reason     Age                From     Message
  ----     ------     ----               ----     -------
  Warning  Unhealthy  2m (x12 over 3m)   kubelet  Liveness probe failed: Get "http://10.244.1.7:8080/healthz": dial tcp 10.244.1.7:8080: connect: connection refused
  Normal   Killing    2m (x4 over 3m)    kubelet  Container web failed liveness probe, will be restarted
  Warning  BackOff    30s (x6 over 2m)   kubelet  Back-off restarting failed container web in pod web-6f9c8d7b5-x2kqp

# Readiness failures never restart — they just empty the endpoints:
$ kubectl get endpointslices -l kubernetes.io/service-name=web
NAME        ADDRESSTYPE   PORTS     ENDPOINTS   AGE
web-7k2vd   IPv4          <unset>   <unset>     3m

$ kubectl describe pod web-6f9c8d7b5-q8wnm | grep -A1 Unhealthy
  Warning  Unhealthy  5s (x20 over 2m)  kubelet  Readiness probe failed: HTTP probe failed with statuscode: 503`,
      },
    ],
    quiz: [
      {
        q: 'Your readiness probe starts failing on one pod. What does Kubernetes do?',
        options: [
          'Restarts the container',
          'Removes the pod from the Service endpoints until the probe passes again',
          'Deletes the pod and creates a new one',
          'Nothing unless a liveness probe also fails',
        ],
        answer: 1,
        why: 'Readiness only controls traffic. The container keeps running and is added back to the endpoints automatically once the probe passes.',
      },
      {
        q: 'An app takes up to 2 minutes to boot. Liveness: <code>periodSeconds: 10, failureThreshold: 3</code>. What is the best fix for the restart loop?',
        options: [
          'Remove the readiness probe',
          'Add a startupProbe with e.g. <code>periodSeconds: 10, failureThreshold: 15</code>',
          'Set <code>failureThreshold: 1</code> on liveness',
          'Set <code>restartPolicy: Never</code>',
        ],
        answer: 1,
        why: 'A startup probe disables liveness/readiness until it passes and allows up to 15 × 10s = 150s to boot, while liveness keeps reacting quickly afterwards.',
      },
      {
        q: 'Why is a liveness probe that queries the database dangerous?',
        options: [
          'Probes cannot open network connections',
          'A DB outage makes every replica fail liveness and restart at once, which lengthens the outage and adds load',
          'It makes the pod BestEffort QoS',
          'Liveness probes only support tcpSocket',
        ],
        answer: 1,
        why: 'Restarting cannot fix an external dependency. It adds boot time and a thundering herd of reconnects: a cascading failure.',
      },
      {
        q: 'How long before a liveness restart with <code>initialDelaySeconds: 10, periodSeconds: 5, failureThreshold: 3</code> if the app never answers?',
        options: ['5s', '10s', 'About 20s', '45s'],
        answer: 2,
        why: 'Probes run at 10s, 15s, 20s. The third consecutive failure at ~20s triggers the restart. That is exactly what the simulator shows.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `
        <p>The app exposes <code>/healthz</code> (process alive, no I/O) and <code>/ready</code> (checks the DB) on port 8080.
        It can take up to <strong>120 seconds</strong> to boot. The current config restarts it in a loop. Fix it:</p>
        <ol>
          <li><code>readinessProbe</code>: <code>httpGet</code> on <code>/ready</code>, port 8080.</li>
          <li><code>livenessProbe</code>: <code>httpGet</code> on <code>/healthz</code>, <em>not</em> <code>/ready</code>, and <code>failureThreshold</code> ≥ 3 (or left at the default).</li>
          <li><code>startupProbe</code> on <code>/healthz</code> with <code>failureThreshold × periodSeconds ≥ 120</code> (the default period is 10s, the default threshold 3).</li>
        </ol>
        <p>Edit the manifest in the box below and click <strong>Check</strong>. Every line should turn ✓.</p>`,
      hint: 'Copy the livenessProbe block twice, rename one copy to readinessProbe (path /ready) and one to startupProbe. For startup, periodSeconds: 5 with failureThreshold: 24 gives exactly 120s. Remove failureThreshold: 1 from liveness.',
      starter: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 300px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          ports:
            - containerPort: 8080
          livenessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 1
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function num(block, key, def) {
    var m = block.match(new RegExp('^\\s*' + key + '\\s*:\\s*["\']?(\\d+)', 'm'));
    return m ? Number(m[1]) : def;
  }

  function path(block) {
    return (block.match(/path\s*:\s*["']?(\/[\w\/.-]*)/) || [])[1];
  }

  function port8080(block) {
    return /port\s*:\s*["']?(8080|http)["']?\s*$/m.test(block);
  }

  function rules(y) {
    var r = blockAfter(y, /^\s*readinessProbe\s*:/);
    var l = blockAfter(y, /^\s*livenessProbe\s*:/);
    var s = blockAfter(y, /^\s*startupProbe\s*:/);
    var budget = s ? num(s, 'failureThreshold', 3) * num(s, 'periodSeconds', 10) : 0;
    return [
      ['readinessProbe uses httpGet', /httpGet\s*:/.test(r)],
      ['readinessProbe checks /ready on port 8080', path(r) === '/ready' && port8080(r)],
      ['livenessProbe checks /healthz (not /ready)', path(l) === '/healthz' && port8080(l)],
      ['livenessProbe failureThreshold ≥ 3', !!l && num(l, 'failureThreshold', 3) >= 3],
      ['startupProbe checks /healthz', path(s) === '/healthz' && port8080(s)],
      ['startup budget failureThreshold × periodSeconds ≥ 120s (now ' + budget + 's)', budget >= 120],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
</script>`,
      solution: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 300px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
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
          image: ghcr.io/example/web:1.4.0
          ports:
            - containerPort: 8080
          startupProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 5
            failureThreshold: 24
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /healthz
              port: 8080
            periodSeconds: 10
            failureThreshold: 3
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function num(block, key, def) {
    var m = block.match(new RegExp('^\\s*' + key + '\\s*:\\s*["\']?(\\d+)', 'm'));
    return m ? Number(m[1]) : def;
  }

  function path(block) {
    return (block.match(/path\s*:\s*["']?(\/[\w\/.-]*)/) || [])[1];
  }

  function port8080(block) {
    return /port\s*:\s*["']?(8080|http)["']?\s*$/m.test(block);
  }

  function rules(y) {
    var r = blockAfter(y, /^\s*readinessProbe\s*:/);
    var l = blockAfter(y, /^\s*livenessProbe\s*:/);
    var s = blockAfter(y, /^\s*startupProbe\s*:/);
    var budget = s ? num(s, 'failureThreshold', 3) * num(s, 'periodSeconds', 10) : 0;
    return [
      ['readinessProbe uses httpGet', /httpGet\s*:/.test(r)],
      ['readinessProbe checks /ready on port 8080', path(r) === '/ready' && port8080(r)],
      ['livenessProbe checks /healthz (not /ready)', path(l) === '/healthz' && port8080(l)],
      ['livenessProbe failureThreshold ≥ 3', !!l && num(l, 'failureThreshold', 3) >= 3],
      ['startupProbe checks /healthz', path(s) === '/healthz' && port8080(s)],
      ['startup budget failureThreshold × periodSeconds ≥ 120s (now ' + budget + 's)', budget >= 120],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
  check();
</script>`,
    },
  },
  // ───────────────────────────────────────────────────────────── Resources
  {
    id: 'resources',
    section: 'Config, Health & Storage',
    title: 'Requests, limits & QoS',
    explain: `
      <p>In Docker you cap a container with <code>docker run --cpus=0.5 --memory=512m</code>. Those are
      <strong>limits</strong>. Kubernetes adds a second number, and people mix the two up all the time:</p>
      <table>
        <tr><th></th><th><code>requests</code></th><th><code>limits</code></th></tr>
        <tr><td>Used by</td><td>the <strong>scheduler</strong>, when it picks a node</td><td>the <strong>kernel</strong> (cgroups) on the node, at runtime</td></tr>
        <tr><td>Meaning</td><td>"reserve at least this much for me"</td><td>"never let me use more than this"</td></tr>
        <tr><td>CPU exceeded</td><td>fine. Idle CPU is shared, weighted by requests</td><td><strong>throttled</strong>: the process runs slower and is never killed</td></tr>
        <tr><td>Memory exceeded</td><td>fine, but the pod becomes an eviction candidate if the node runs low</td><td><strong>OOMKilled</strong>: the container is killed, <code>Exit Code: 137</code> (128 + SIGKILL 9)</td></tr>
      </table>
      <p>Analogy: requests are a <em>restaurant reservation</em>. The host only seats you where your table
      size fits, even if other tables are half-empty right now. Limits are the <em>fire code</em>: go over
      the memory limit and you're thrown out.</p>

      <h3>Units</h3>
      <ul>
        <li>CPU: <code>1</code> = one core (vCPU). <code>500m</code> = 500 millicores = <code>0.5</code>.</li>
        <li>Memory: <code>Mi</code>/<code>Gi</code> are powers of two (1Mi = 1,048,576 bytes), and <code>M</code>/<code>G</code> are powers of ten. <strong>Lowercase <code>m</code> means milli</strong>, so <code>memory: 512m</code> is half a <em>byte</em>. Docker's <code>--memory=512m</code> means megabytes. Don't carry that habit over.</li>
      </ul>

      <h3>Scheduling and <code>Pending</code></h3>
      <p>The scheduler adds up the <em>requests</em> of the pods already on each node (not their actual usage!)
      and compares that with the node's <strong>allocatable</strong> capacity. If no node has room, the pod
      stays <code>Pending</code> with an event such as
      <code>0/3 nodes are available: 3 Insufficient memory.</code> Either shrink the requests, free up room, or add nodes
      (a cluster autoscaler does that automatically, as you'll see in the next section).</p>

      <h3>QoS classes (computed automatically)</h3>
      <ul>
        <li><strong>Guaranteed</strong>: every container has CPU <em>and</em> memory requests equal to its limits. Evicted last under node pressure.</li>
        <li><strong>Burstable</strong>: at least one request or limit is set, but it isn't Guaranteed. The common case.</li>
        <li><strong>BestEffort</strong>: no requests or limits at all. It always fits on a node (it requests 0) and it is <strong>evicted first</strong>.</li>
      </ul>
      <p>Check it with <code>kubectl get pod web -o jsonpath='{.status.qosClass}'</code>. If you set only
      <code>limits</code>, Kubernetes copies them into <code>requests</code>.</p>

      <div class="tip">A common practice: always set memory requests and a memory limit (usually equal,
      because memory can't be taken back without killing the process), and set a CPU request. Many
      teams skip the CPU limit on latency-sensitive services, because throttling hurts tail latency and idle CPU
      is otherwise wasted. Namespaces can enforce defaults with <code>LimitRange</code> and caps with
      <code>ResourceQuota</code>.</div>
      <div class="tip">Since Kubernetes 1.35, <strong>in-place pod resize</strong> is stable: you can change a running
      pod's CPU and memory through the <code>resize</code> subresource, often without restarting the container.
      The VPA (next section) can use it.</div>
    `,
    examples: [
      {
        title: 'Simulator: scheduler by requests + a runtime OOM/throttle lab',
        explain: `
          <details>
            <summary>The problem: "the node is at 20% CPU, why is my pod Pending?"</summary>
            <p>The scheduler never looks at live usage. It only adds up <strong>requests</strong>. A node full
            of pods that each request 1 CPU but use 50m is "full" as far as scheduling goes. The upper panel
            only tracks requests, just like the real scheduler.</p>
          </details>
          <details>
            <summary>Step by step: fill the cluster, hit <code>Pending</code>, free room</summary>
            <table>
              <tr><th>#</th><th>Click</th><th>node-1 requested</th><th>node-2 requested</th><th>Console</th></tr>
              <tr><td>1</td><td>+ db</td><td>1500m / 3072Mi</td><td>0 / 0</td><td><code>[scheduler] db-1 → node-1 (requests 1500m/3072Mi, node had 2000m/4096Mi free)</code></td></tr>
              <tr><td>2</td><td>+ db</td><td>1500m / 3072Mi</td><td>1500m / 3072Mi</td><td><code>db-2 → node-2</code>. Node-2 has more room left, so it scores higher (a LeastAllocated-style spread)</td></tr>
              <tr><td>3</td><td>+ api</td><td><strong>2000m / 4096Mi</strong></td><td>1500m / 3072Mi</td><td><code>api-1 → node-1 (requests 500m/1024Mi, node had 500m/1024Mi free)</code>. An exact fit, and the tie goes to node-1</td></tr>
              <tr><td>4</td><td>+ api</td><td>2000m / 4096Mi</td><td><strong>2000m / 4096Mi</strong></td><td><code>api-2 → node-2</code>. Both nodes are now 100% requested</td></tr>
              <tr><td>5</td><td>+ worker</td><td>full</td><td>full</td><td><code>[scheduler] worker-1 Pending: 0/2 nodes are available: 2 Insufficient cpu, 2 Insufficient memory.</code></td></tr>
              <tr><td>6</td><td>+ batch</td><td>still 2000m / 4096Mi</td><td>full</td><td><code>batch-1 → node-1 (requests none, node had 0m/0Mi free)</code>. BestEffort requests nothing, so it fits on a "full" node</td></tr>
              <tr><td>7</td><td>click chip <strong>api-2</strong></td><td>full</td><td>1500m / 3072Mi</td><td><code>[scheduler] retrying worker-1…</code><br><code>worker-1 Pending: 0/2 nodes are available: 2 Insufficient cpu, 1 Insufficient memory.</code></td></tr>
              <tr><td>8</td><td>click chip <strong>db-2</strong></td><td>full</td><td>1000m / 1024Mi</td><td><code>worker-1 → node-2 (requests 1000m/1024Mi, node had 2000m/4096Mi free)</code></td></tr>
            </table>
            <p>Step 7 is the interesting one. Node-2 now has enough <em>memory</em> (1024Mi free) but only 500m CPU,
            so the message changes to "1 Insufficient memory". A pod must fit on <strong>every</strong> resource on the
            <strong>same</strong> node. Free capacity spread across nodes doesn't help.</p>
          </details>
          <details>
            <summary>Step by step: the runtime panel (limits in action)</summary>
            <p>Pod <code>web</code> requests 250m / 256Mi, limits 500m / 512Mi, so its QoS is <strong>Burstable</strong>.</p>
            <table>
              <tr><th>Action</th><th>Status</th><th>Console</th></tr>
              <tr><td>CPU slider → 800</td><td>Running (note: "THROTTLED, work takes 1.6× longer")</td><td><code>[cgroup] web: CPU demand 800m &gt; limit 500m → throttled (not killed)</code></td></tr>
              <tr><td>Memory slider → 544</td><td><strong>OOMKilled</strong>, restarts 1</td><td><code>[kernel] web: memory 544Mi &gt; limit 512Mi → OOMKilled, exit code 137 (restart #1)</code><br><code>web    0/1     OOMKilled          1</code></td></tr>
              <tr><td>Memory slider → 608</td><td><strong>CrashLoopBackOff</strong>, restarts 2</td><td><code>… (restart #2)</code><br><code>web    0/1     CrashLoopBackOff   2</code></td></tr>
              <tr><td>Memory slider → 480</td><td>Running (note: "above its request… eviction candidate")</td><td><code>[kubelet] web: running with 480Mi ≤ limit 512Mi → Running</code></td></tr>
            </table>
            <p>The two resources behave in opposite ways. CPU is <em>compressible</em>: the kernel just hands out
            fewer time slices. Memory is <em>incompressible</em>: once allocated it can't be taken back, so the only
            option is to kill the process.</p>
            <div class="warn">An OOMKilled container restarts with the same limit and usually OOMs again: a
            CrashLoopBackOff with <code>Reason: OOMKilled</code>. Raising the limit (or fixing the leak) is the only fix.
            JVM and Node.js apps need their heap settings (<code>-XX:MaxRAMPercentage</code>,
            <code>--max-old-space-size</code>) set below the container limit.</div>
          </details>
        `,
        code: String.raw`<style>
  body { font: 13px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  .panel { background: #fff; border: 1px solid #d5dbe6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  h4 { margin: 0 0 6px; font-size: 13px; }
  button { padding: 4px 9px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; margin: 2px 2px 2px 0; font-size: 12px; }
  button.alt { background: #5f6b7a; }
  .nodes { display: flex; gap: 8px; }
  .node { flex: 1; border: 1px solid #d5dbe6; border-radius: 6px; padding: 6px; background: #fafbfd; }
  .bar { height: 9px; background: #e1e5ec; border-radius: 4px; overflow: hidden; margin: 2px 0 4px; }
  .fill { height: 100%; background: #326ce5; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; }
  .pod { display: inline-block; padding: 2px 6px; border-radius: 4px; margin: 2px; font-size: 11.5px; color: #fff; }
  .G { background: #1e8e3e; } .B { background: #e6a700; } .BE { background: #8a94a3; }
  .pending { background: #fdecea; color: #b3261e; border: 1px dashed #b3261e; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; }
  .status { font-weight: 700; padding: 2px 8px; border-radius: 4px; }
  .Running { background: #e3f5e8; color: #137333; }
  .Bad { background: #fdecea; color: #b3261e; }
  .note { font-size: 12px; color: #5f6b7a; }
</style>

<div class="panel">
  <h4>Scheduler: place pods by <em>requests</em> (each node: 2000m CPU, 4096Mi memory allocatable)</h4>
  <button data-t="db">+ db (1500m / 3072Mi, Guaranteed)</button>
  <button data-t="api">+ api (500m / 1024Mi, Burstable)</button>
  <button data-t="worker">+ worker (1000m / 1024Mi, Guaranteed)</button>
  <button data-t="batch">+ batch (no requests, BestEffort)</button>
  <button id="reset" class="alt">Reset</button>
  <div class="nodes" id="nodes" style="margin-top:6px"></div>
  <div id="pend" style="margin-top:4px"></div>
  <div class="note">Click a pod chip to delete it.</div>
</div>

<div class="panel">
  <h4>Runtime: pod <span class="mono">web</span> — requests 250m / 256Mi, limits 500m / 512Mi (Burstable)</h4>
  <div class="row">
    <label>CPU demand <b id="cpuv">300</b>m <input id="cpu" type="range" min="0" max="1000" step="50" value="300"></label>
    <label>Memory used <b id="memv">200</b>Mi <input id="mem" type="range" min="0" max="800" step="16" value="208"></label>
    <span>Status: <span id="st" class="status Running">Running</span> · restarts <b id="rs">0</b></span>
  </div>
  <div class="note" id="cpuNote"></div>
  <div class="note" id="memNote"></div>
</div>

<script>
  var T = {
    db: { cpu: 1500, mem: 3072, qos: 'G' },
    api: { cpu: 500, mem: 1024, qos: 'B' },
    worker: { cpu: 1000, mem: 1024, qos: 'G' },
    batch: { cpu: 0, mem: 0, qos: 'BE' },
  };
  var CAP = { cpu: 2000, mem: 4096 };
  var nodes, pending, order, counts, restarts;

  function el(id) {
    return document.getElementById(id);
  }

  function reset() {
    nodes = [{ name: 'node-1', pods: [] }, { name: 'node-2', pods: [] }];
    pending = [];
    order = [];
    counts = { db: 0, api: 0, worker: 0, batch: 0 };
  }

  function used(n) {
    return n.pods.reduce(function (a, p) {
      return { cpu: a.cpu + p.cpu, mem: a.mem + p.mem };
    }, { cpu: 0, mem: 0 });
  }

  function trySchedule(p) {
    var best = null;
    var bestScore = -1;
    var noCpu = 0;
    var noMem = 0;
    nodes.forEach(function (n) {
      var u = used(n);
      var freeCpu = CAP.cpu - u.cpu;
      var freeMem = CAP.mem - u.mem;
      var cpuOk = p.cpu <= freeCpu;
      var memOk = p.mem <= freeMem;
      if (!cpuOk) noCpu += 1;
      if (!memOk) noMem += 1;
      if (cpuOk && memOk) {
        // LeastAllocated-style score: prefer the node with the most room left after placement.
        var score = (freeCpu - p.cpu) / CAP.cpu + (freeMem - p.mem) / CAP.mem;
        if (score > bestScore) {
          bestScore = score;
          best = n;
        }
      }
    });
    if (best) {
      var u = used(best);
      console.log('[scheduler] ' + p.name + ' → ' + best.name + ' (requests ' +
        (p.cpu || p.mem ? p.cpu + 'm/' + p.mem + 'Mi' : 'none') +
        ', node had ' + (CAP.cpu - u.cpu) + 'm/' + (CAP.mem - u.mem) + 'Mi free)');
      best.pods.push(p);
      return true;
    }
    var why = [];
    if (noCpu) why.push(noCpu + ' Insufficient cpu');
    if (noMem) why.push(noMem + ' Insufficient memory');
    p.reason = '0/' + nodes.length + ' nodes are available: ' + why.join(', ') + '.';
    console.log('[scheduler] ' + p.name + ' Pending: ' + p.reason);
    return false;
  }

  function add(kind) {
    counts[kind] += 1;
    var t = T[kind];
    var p = { name: kind + '-' + counts[kind], cpu: t.cpu, mem: t.mem, qos: t.qos };
    order.push(p);
    console.log('$ kubectl apply -f ' + kind + '.yaml');
    console.log('pod/' + p.name + ' created');
    if (!trySchedule(p)) pending.push(p);
    paint();
  }

  function del(name) {
    var p = order.filter(function (x) { return x.name === name; })[0];
    if (!p) return;
    order = order.filter(function (x) { return x !== p; });
    console.log('$ kubectl delete pod ' + p.name);
    console.log('pod "' + p.name + '" deleted');
    pending = pending.filter(function (x) { return x !== p; });
    nodes.forEach(function (n) {
      n.pods = n.pods.filter(function (x) { return x !== p; });
    });
    var still = [];
    pending.forEach(function (x) {
      console.log('[scheduler] retrying ' + x.name + '…');
      if (!trySchedule(x)) still.push(x);
    });
    pending = still;
    paint();
  }

  function chip(p, cls) {
    return '<span class="pod ' + cls + '" data-pod="' + p.name + '" style="cursor:pointer">' + p.name + ' ' + p.qos + '</span>';
  }

  function paint() {
    el('nodes').innerHTML = nodes.map(function (n) {
      var u = used(n);
      return '<div class="node"><b>' + n.name + '</b>' +
        '<div class="mono">CPU requested ' + u.cpu + 'm / 2000m</div>' +
        '<div class="bar"><div class="fill" style="width:' + (u.cpu / 20) + '%"></div></div>' +
        '<div class="mono">Memory requested ' + u.mem + 'Mi / 4096Mi</div>' +
        '<div class="bar"><div class="fill" style="width:' + (u.mem / 40.96) + '%"></div></div>' +
        (n.pods.map(function (p) { return chip(p, p.qos); }).join('') || '<span class="note">empty</span>') +
        '</div>';
    }).join('');
    el('pend').innerHTML = pending.length
      ? '<b>Pending:</b> ' + pending.map(function (p) {
        return chip(p, 'pending') + '<span class="note">' + p.reason + '</span>';
      }).join('<br>')
      : '<span class="note">No pending pods. (G = Guaranteed, B = Burstable, BE = BestEffort)</span>';
  }

  // ── runtime panel ─────────────────────────────────────────────
  var LIM = { cpu: 500, mem: 512 };
  var REQ = { cpu: 250, mem: 256 };
  restarts = 0;

  function paintRuntime() {
    var cpu = Number(el('cpu').value);
    var mem = Number(el('mem').value);
    el('cpuv').textContent = cpu;
    el('memv').textContent = mem;
    el('cpuNote').textContent = cpu > LIM.cpu
      ? 'CPU: wants ' + cpu + 'm but the cgroup quota allows ' + LIM.cpu + 'm → THROTTLED, work takes ' +
        (cpu / LIM.cpu).toFixed(1) + '× longer. Never killed for CPU.'
      : 'CPU: using ' + cpu + 'm (limit ' + LIM.cpu + 'm). ' +
        (cpu > REQ.cpu ? 'Above its request: fine while the node has idle CPU.' : 'Within its request.');
    var oom = mem > LIM.mem;
    el('memNote').textContent = oom
      ? 'Memory: ' + mem + 'Mi > limit ' + LIM.mem + 'Mi → kernel OOM killer: OOMKilled, exit code 137.'
      : mem > REQ.mem
        ? 'Memory: ' + mem + 'Mi, above its request (' + REQ.mem + 'Mi): eviction candidate if the node runs short.'
        : 'Memory: ' + mem + 'Mi, within its request.';
    el('rs').textContent = restarts;
    var st = !oom ? 'Running' : restarts >= 2 ? 'CrashLoopBackOff' : 'OOMKilled';
    el('st').textContent = st;
    el('st').className = 'status ' + (oom ? 'Bad' : 'Running');
    return { cpu: cpu, mem: mem, oom: oom, st: st };
  }

  el('cpu').oninput = paintRuntime;
  el('mem').oninput = paintRuntime;

  el('cpu').onchange = function () {
    var r = paintRuntime();
    if (r.cpu > LIM.cpu) {
      console.log('[cgroup] web: CPU demand ' + r.cpu + 'm > limit ' + LIM.cpu + 'm → throttled (not killed)');
    }
  };

  el('mem').onchange = function () {
    var r = paintRuntime();
    if (r.oom) {
      restarts += 1;
      r = paintRuntime();
      console.log('[kernel] web: memory ' + r.mem + 'Mi > limit ' + LIM.mem + 'Mi → OOMKilled, exit code 137 (restart #' + restarts + ')');
      console.log('$ kubectl get pod web');
      console.log('NAME   READY   STATUS             RESTARTS');
      console.log('web    0/1     ' + (r.st + '                  ').slice(0, 19) + restarts);
    } else if (restarts > 0) {
      console.log('[kubelet] web: running with ' + r.mem + 'Mi ≤ limit ' + LIM.mem + 'Mi → Running');
    }
  };

  document.querySelectorAll('button[data-t]').forEach(function (b) {
    b.onclick = function () { add(b.getAttribute('data-t')); };
  });
  document.addEventListener('click', function (e) {
    var pod = e.target.closest && e.target.closest('[data-pod]');
    if (pod) del(pod.getAttribute('data-pod'));
  });
  el('reset').onclick = function () {
    reset();
    restarts = 0;
    el('cpu').value = 300;
    el('mem').value = 208;
    console.log('--- reset ---');
    paint();
    paintRuntime();
  };

  reset();
  paint();
  paintRuntime();
</script>`,
      },
      {
        title: 'Reference: requests, limits, LimitRange and ResourceQuota',
        runnable: false,
        lang: 'yaml',
        code: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:2.1.0
          resources:
            requests:            # scheduler reserves this
              cpu: 250m
              memory: 256Mi
            limits:              # kernel enforces this
              cpu: 500m          # over → throttled
              memory: 512Mi      # over → OOMKilled (exit 137)
---
# Namespace defaults for containers that don't say anything:
apiVersion: v1
kind: LimitRange
metadata:
  name: defaults
  namespace: team-a
spec:
  limits:
    - type: Container
      defaultRequest:
        cpu: 100m
        memory: 128Mi
      default:                   # default *limits*
        memory: 256Mi
---
# Cap the whole namespace:
apiVersion: v1
kind: ResourceQuota
metadata:
  name: team-a-quota
  namespace: team-a
spec:
  hard:
    requests.cpu: "8"
    requests.memory: 16Gi
    limits.memory: 32Gi
    pods: "50"`,
      },
      {
        title: 'Reference: diagnosing Pending, OOMKilled and throttling',
        runnable: false,
        lang: 'bash',
        code: `$ kubectl get pods
NAME                      READY   STATUS             RESTARTS      AGE
api-7d9f6c5b8-2xkfp       1/1     Running            0             5m
api-7d9f6c5b8-9wqzt       0/1     Pending            0             2m
report-5c8d7f9b6-lm4n2    0/1     CrashLoopBackOff   3 (20s ago)   4m

$ kubectl describe pod api-7d9f6c5b8-9wqzt | tail -3
Events:
  Warning  FailedScheduling  2m  default-scheduler  0/3 nodes are available: 3 Insufficient memory. preemption: 0/3 nodes are available: 3 No preemption victims found for incoming pod.

$ kubectl describe node worker-1 | grep -A6 "Allocated resources"
Allocated resources:
  (Total limits may be over 100 percent, i.e., overcommitted.)
  Resource           Requests      Limits
  --------           --------      ------
  cpu                1850m (92%)   3 (150%)
  memory             3900Mi (98%)  6Gi (153%)

$ kubectl describe pod report-5c8d7f9b6-lm4n2 | grep -A4 "Last State"
    Last State:     Terminated
      Reason:       OOMKilled
      Exit Code:    137
      Started:      Tue, 29 Sep 2026 10:14:02 +0000
      Finished:     Tue, 29 Sep 2026 10:14:31 +0000

$ kubectl get pod api-7d9f6c5b8-2xkfp -o jsonpath='{.status.qosClass}'
Burstable

# Live usage (needs metrics-server) — compare with requests:
$ kubectl top pods
NAME                     CPU(cores)   MEMORY(bytes)
api-7d9f6c5b8-2xkfp      480m         301Mi`,
      },
    ],
    quiz: [
      {
        q: 'What does the scheduler compare against a node\'s allocatable capacity?',
        options: [
          'The live CPU and memory usage of the pods on that node',
          'The sum of the <code>requests</code> of the pods on that node',
          'The sum of the <code>limits</code> of the pods on that node',
          'The image size',
        ],
        answer: 1,
        why: 'Scheduling is based purely on requests. Actual usage (<code>kubectl top</code>) doesn\'t matter to the scheduler.',
      },
      {
        q: 'A container uses more CPU than its limit. What happens?',
        options: ['It is OOMKilled', 'It is throttled (runs slower)', 'The pod is evicted', 'The node is cordoned'],
        answer: 1,
        why: 'CPU is compressible: the CFS quota simply gives it fewer time slices. Only memory over the limit kills the container.',
      },
      {
        q: 'A pod shows <code>Last State: Terminated, Reason: OOMKilled, Exit Code: 137</code>. What does 137 mean?',
        options: [
          'The app returned error 137',
          '128 + 9: the process was killed by SIGKILL, here from the kernel OOM killer',
          'The image was not found',
          'The liveness probe timed out 137 times',
        ],
        answer: 1,
        why: 'Exit codes above 128 mean "killed by signal (code − 128)". Signal 9 is SIGKILL, which the OOM killer sends when the memory limit is exceeded.',
      },
      {
        q: 'Which QoS class does a pod get if its only container has <code>requests: {cpu: 500m, memory: 512Mi}</code> and <code>limits: {cpu: 500m, memory: 512Mi}</code>?',
        options: ['BestEffort', 'Burstable', 'Guaranteed', 'Critical'],
        answer: 2,
        why: 'Requests equal limits for both CPU and memory in every container → Guaranteed. These pods are the last to be evicted.',
      },
      {
        q: 'What does <code>memory: 512m</code> mean in a Kubernetes manifest?',
        options: ['512 megabytes', '512 mebibytes', '0.512 bytes (milli-bytes)', 'It is invalid YAML'],
        answer: 2,
        why: 'Lowercase <code>m</code> is the milli suffix. Use <code>512Mi</code>. This is a classic mistake for people coming from <code>docker run --memory=512m</code>.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `
        <p>The <code>api</code> container needs half a CPU core and peaks at about 400Mi of memory. It must be in the
        <strong>Guaranteed</strong> QoS class. The current config has only a (broken) memory limit. Fix <code>resources</code> so that:</p>
        <ol>
          <li>CPU and memory <code>requests</code> and <code>limits</code> are all set.</li>
          <li>Memory uses <code>Mi</code>/<code>Gi</code>, and the memory limit is at least 400Mi.</li>
          <li>CPU is <code>500m</code> (or <code>0.5</code>).</li>
          <li>Requests equal limits, so the checker computes QoS = Guaranteed.</li>
        </ol>
        <p>Edit the manifest in the box below and click <strong>Check</strong>. Every line should turn ✓.</p>`,
      hint: 'resources: → requests: {cpu: 500m, memory: 512Mi} and limits: {cpu: 500m, memory: 512Mi}, each key on its own line, indented under requests:/limits:.',
      starter: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 280px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:2.1.0
          resources:
            limits:
              memory: 512m
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function val(block, key) {
    var m = block.match(new RegExp('^\\s*' + key + '\\s*:\\s*["\']?([\\w.]+)', 'm'));
    return m ? m[1] : '';
  }

  function cpuMilli(q) {
    var m = /^(\d+(?:\.\d+)?)(m?)$/.exec(q);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) : Number(m[1]) * 1000;
  }

  function memBytes(q) {
    var m = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|k|K|M|G|T|m)?$/.exec(q);
    if (!m) return NaN;
    var mult = { Ki: 1024, Mi: 1048576, Gi: 1073741824, Ti: 1099511627776, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12, m: 0.001 };
    return Number(m[1]) * (m[2] ? mult[m[2]] : 1);
  }

  function rules(y) {
    var res = blockAfter(y, /^\s*resources\s*:/);
    var req = blockAfter(res, /^\s*requests\s*:/);
    var lim = blockAfter(res, /^\s*limits\s*:/);
    var rc = val(req, 'cpu');
    var rm = val(req, 'memory');
    var lc = val(lim, 'cpu');
    var lm = val(lim, 'memory');
    // If only limits are set, Kubernetes copies them into requests.
    var ec = rc || lc;
    var em = rm || lm;
    var qos = !ec && !em && !lc && !lm ? 'BestEffort'
      : lc && lm && cpuMilli(ec) === cpuMilli(lc) && memBytes(em) === memBytes(lm) ? 'Guaranteed'
        : 'Burstable';
    var units = [rm, lm].filter(Boolean);
    return [
      ['requests.cpu and requests.memory are set', !!rc && !!rm],
      ['limits.cpu and limits.memory are set', !!lc && !!lm],
      ['memory uses Mi/Gi units (lowercase "m" means milli-bytes!)',
        units.length === 2 && units.every(function (u) { return /^\d+(\.\d+)?(Ki|Mi|Gi)$/.test(u); })],
      ['cpu is half a core (500m or 0.5)', cpuMilli(rc) === 500 && cpuMilli(lc) === 500],
      ['memory limit ≥ 400Mi (the app peaks at ~400Mi)', memBytes(lm) >= 400 * 1048576],
      ['QoS class is Guaranteed (now: ' + qos + ')', qos === 'Guaranteed'],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
</script>`,
      solution: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 280px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: api
  template:
    metadata:
      labels:
        app: api
    spec:
      containers:
        - name: api
          image: ghcr.io/example/api:2.1.0
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: 500m
              memory: 512Mi
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function val(block, key) {
    var m = block.match(new RegExp('^\\s*' + key + '\\s*:\\s*["\']?([\\w.]+)', 'm'));
    return m ? m[1] : '';
  }

  function cpuMilli(q) {
    var m = /^(\d+(?:\.\d+)?)(m?)$/.exec(q);
    if (!m) return NaN;
    return m[2] ? Number(m[1]) : Number(m[1]) * 1000;
  }

  function memBytes(q) {
    var m = /^(\d+(?:\.\d+)?)(Ki|Mi|Gi|Ti|k|K|M|G|T|m)?$/.exec(q);
    if (!m) return NaN;
    var mult = { Ki: 1024, Mi: 1048576, Gi: 1073741824, Ti: 1099511627776, k: 1e3, K: 1e3, M: 1e6, G: 1e9, T: 1e12, m: 0.001 };
    return Number(m[1]) * (m[2] ? mult[m[2]] : 1);
  }

  function rules(y) {
    var res = blockAfter(y, /^\s*resources\s*:/);
    var req = blockAfter(res, /^\s*requests\s*:/);
    var lim = blockAfter(res, /^\s*limits\s*:/);
    var rc = val(req, 'cpu');
    var rm = val(req, 'memory');
    var lc = val(lim, 'cpu');
    var lm = val(lim, 'memory');
    // If only limits are set, Kubernetes copies them into requests.
    var ec = rc || lc;
    var em = rm || lm;
    var qos = !ec && !em && !lc && !lm ? 'BestEffort'
      : lc && lm && cpuMilli(ec) === cpuMilli(lc) && memBytes(em) === memBytes(lm) ? 'Guaranteed'
        : 'Burstable';
    var units = [rm, lm].filter(Boolean);
    return [
      ['requests.cpu and requests.memory are set', !!rc && !!rm],
      ['limits.cpu and limits.memory are set', !!lc && !!lm],
      ['memory uses Mi/Gi units (lowercase "m" means milli-bytes!)',
        units.length === 2 && units.every(function (u) { return /^\d+(\.\d+)?(Ki|Mi|Gi)$/.test(u); })],
      ['cpu is half a core (500m or 0.5)', cpuMilli(rc) === 500 && cpuMilli(lc) === 500],
      ['memory limit ≥ 400Mi (the app peaks at ~400Mi)', memBytes(lm) >= 400 * 1048576],
      ['QoS class is Guaranteed (now: ' + qos + ')', qos === 'Guaranteed'],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
  check();
</script>`,
    },
  },
  // ───────────────────────────────────────────────────────────── Storage
  {
    id: 'persistent-storage',
    section: 'Config, Health & Storage',
    title: 'Volumes, PV, PVC & StorageClass',
    explain: `
      <p>A container's filesystem is thrown away when the container is replaced. You already solved this in
      Docker with <code>docker volume create pgdata</code> + <code>-v pgdata:/var/lib/postgresql/data</code>.
      Kubernetes has the same idea, but because pods can land on <em>any</em> node, storage is split into
      three objects:</p>
      <table>
        <tr><th>Object</th><th>Who creates it</th><th>What it is</th><th>Docker analogy</th></tr>
        <tr><td><strong>PersistentVolumeClaim</strong> (PVC)</td><td>you (the app developer)</td><td>a <em>request</em>: "I need 5Gi, ReadWriteOnce, class <code>standard</code>"</td><td>the <code>-v pgdata:</code> reference</td></tr>
        <tr><td><strong>PersistentVolume</strong> (PV)</td><td>usually the provisioner, automatically</td><td>the <em>actual</em> piece of storage: a cloud disk, NFS export, local path…</td><td>the volume itself</td></tr>
        <tr><td><strong>StorageClass</strong></td><td>the cluster admin (clusters ship with a default)</td><td>a "menu item" that says which provisioner makes PVs, with what parameters and reclaim policy</td><td>the volume <em>driver</em> (<code>--driver</code>)</td></tr>
      </table>
      <p>Analogy: the PVC is a <em>hotel booking</em>, the PV is the <em>actual room</em>, and the StorageClass
      is the <em>room type</em> (standard or suite). You book by type, and the hotel assigns a room. That's
      <strong>dynamic provisioning</strong>: create a PVC, a CSI driver creates a matching PV, and the two are
      <code>Bound</code> one-to-one.</p>

      <h3>Volume types you'll meet</h3>
      <ul>
        <li><code>emptyDir</code>: a scratch directory that lives exactly as long as the <strong>pod</strong>. It survives container restarts but not pod deletion or rescheduling. It can be shared between containers in the pod. <code>medium: Memory</code> gives you a tmpfs.</li>
        <li><code>configMap</code> / <code>secret</code>: config as files (previous lessons).</li>
        <li><code>persistentVolumeClaim</code>: durable storage that outlives pods.</li>
        <li><code>hostPath</code>: a directory on the node, like a Docker bind mount. Avoid it for apps: your pod may move to another node, and it's a security risk.</li>
      </ul>

      <h3>Access modes</h3>
      <table>
        <tr><th>Mode</th><th>Meaning</th></tr>
        <tr><td><code>ReadWriteOnce</code> (RWO)</td><td>read-write, mounted by a <strong>single node</strong> (several pods on that node can still share it). Typical for block disks (EBS, PD).</td></tr>
        <tr><td><code>ReadOnlyMany</code> (ROX)</td><td>read-only, many nodes.</td></tr>
        <tr><td><code>ReadWriteMany</code> (RWX)</td><td>read-write, many nodes. Needs a file system like NFS, EFS or CephFS.</td></tr>
        <tr><td><code>ReadWriteOncePod</code> (RWOP)</td><td>read-write, a <strong>single pod</strong> in the whole cluster (stable since 1.29). CSI volumes only.</td></tr>
      </table>

      <h3>Reclaim policy: what happens when the PVC is deleted</h3>
      <ul>
        <li><code>Delete</code> (the default for dynamically provisioned PVs): the PV <strong>and the underlying disk are deleted</strong>. Your data is gone.</li>
        <li><code>Retain</code>: the PV goes to <code>Released</code> and the disk keeps its data. An admin has to clean it up or re-bind it manually.</li>
      </ul>
      <div class="warn">Deleting a pod or a Deployment never deletes its PVCs. But <code>kubectl delete pvc</code>
      (or <code>kubectl delete namespace</code>) with a <code>Delete</code> policy destroys the disk. For
      production databases, use a StorageClass with <code>Retain</code> and take real backups (VolumeSnapshots, or
      database dumps).</div>

      <h3>Binding mode</h3>
      <p><code>volumeBindingMode: WaitForFirstConsumer</code> (used by kind's default <code>standard</code> class and most
      cloud classes) delays provisioning until a pod using the PVC is scheduled. That way the disk is created in the
      same zone or node as the pod. A PVC showing <code>Pending</code> with no pod yet is <em>normal</em> in that mode.</p>
      <div class="tip">StatefulSets (last section) use <code>volumeClaimTemplates</code> to create one PVC per replica
      (<code>data-db-0</code>, <code>data-db-1</code>…). It's the same mechanism, just automated.</div>
    `,
    examples: [
      {
        title: 'Simulator: PVC → provisioner → PV → pod, then delete things',
        explain: `
          <details>
            <summary>The problem: where does the data actually live?</summary>
            <p>The pod is disposable, and so is everything in <code>emptyDir</code>. Durable data lives on the
            <strong>backing disk</strong>, which the PV represents. The PVC is your handle on it. The
            simulator mounts both into the same pod, <code>/data</code> (PVC) and <code>/cache</code> (emptyDir),
            so you can watch them behave differently. The defaults are <code>reclaimPolicy: Delete</code> and
            <code>Immediate</code> binding.</p>
          </details>
          <details>
            <summary>Step by step: create, write, delete the pod, recreate, delete the PVC</summary>
            <table>
              <tr><th>#</th><th>Click</th><th>PVC</th><th>PV / disk</th><th>Pod</th><th>Console</th></tr>
              <tr><td>1</td><td>1. Create PVC</td><td>Bound</td><td>pvc-3f9c2a1e, empty</td><td>none</td><td><code>[provisioner] rancher.io/local-path: created volume pvc-3f9c2a1e (1Gi, RWO, reclaimPolicy Delete)</code><br><code>[pv-controller] PVC data ⇄ PV pvc-3f9c2a1e: Bound</code></td></tr>
              <tr><td>2</td><td>2. Create pod</td><td>Bound</td><td>empty</td><td>app-1 Running</td><td><code>[kubelet] app-1: mounted PVC data (pvc-3f9c2a1e) at /data, new emptyDir at /cache</code></td></tr>
              <tr><td>3</td><td>3. Write data ×2</td><td>Bound</td><td>order-1, order-2</td><td>/cache: tmp-1, tmp-2</td><td><code>$ kubectl exec app-1 -- sh -c "echo order-1 &gt;&gt; /data/orders.txt; …"</code></td></tr>
              <tr><td>4</td><td>Delete pod</td><td>Bound</td><td><strong>order-1, order-2 kept</strong></td><td>none</td><td><code>[kubelet] emptyDir /cache deleted with the pod (2 file(s) lost)</code><br><code>[kubelet] /data unmounted; pvc-3f9c2a1e keeps 2 file(s)</code></td></tr>
              <tr><td>5</td><td>2. Create pod</td><td>Bound</td><td>order-1, order-2</td><td>app-2, /cache empty</td><td><code>[kubelet] app-2: /data has 2 file(s), /cache is empty → Running</code></td></tr>
              <tr><td>6</td><td>Delete PVC</td><td><strong>Terminating</strong></td><td>still there</td><td>app-2 Running</td><td><code>[pvc-protection] data stays Terminating while app-2 still mounts it</code></td></tr>
              <tr><td>7</td><td>Delete pod</td><td>gone</td><td><strong>gone</strong></td><td>none</td><td><code>[pvc-protection] no pod uses data any more → finishing deletion</code><br><code>[pv-controller] reclaimPolicy Delete → PV pvc-3f9c2a1e and its disk deleted (2 file(s) gone)</code></td></tr>
            </table>
            <p>Step 6 is the <code>kubernetes.io/pvc-protection</code> finalizer at work. Kubernetes won't pull a disk out from
            under a running pod. The delete is recorded, and it finishes once the last pod lets go (step 7).</p>
          </details>
          <details>
            <summary>Try this: <code>Retain</code> and <code>WaitForFirstConsumer</code></summary>
            <ul>
              <li><strong>Reset</strong>, set reclaimPolicy to <strong>Retain</strong>, then create the PVC and pod, write, delete the pod, delete the PVC. The console ends with <code>reclaimPolicy Retain → PV pvc-3f9c2a1e is Released; disk and 1 file(s) kept</code>. Create a new PVC and you get a <em>new</em> PV (<code>pvc-8b41d07c</code>). A <code>Released</code> PV is never re-bound automatically, because it could hand one team's data to another.</li>
              <li>Tick <strong>WaitForFirstConsumer</strong> and create the PVC. It stays <code>Pending</code> (<code>waiting for a pod to use it</code>). Only <strong>Create pod</strong> triggers <code>[scheduler] app-1 → node-1; now the volume can be provisioned on that node</code>.</li>
              <li>Create the pod <em>before</em> the PVC: <code>app-1 Pending: persistentvolumeclaim "data" not found</code>. Create the PVC and the pending pod starts.</li>
            </ul>
            <div class="tip">Changing the StorageClass's reclaim policy only affects <em>new</em> PVs, because each PV copies the policy when it
            is created. To protect an existing volume, patch the PV itself:
            <code>kubectl patch pv &lt;name&gt; -p '{"spec":{"persistentVolumeReclaimPolicy":"Retain"}}'</code>.</div>
          </details>
        `,
        code: String.raw`<style>
  body { font: 13px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  .bar { background: #fff; border: 1px solid #d5dbe6; border-radius: 8px; padding: 8px 10px; margin-bottom: 8px; }
  button { padding: 4px 9px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; margin: 2px 2px 2px 0; font-size: 12px; }
  button.danger { background: #c5221f; }
  button.alt { background: #5f6b7a; }
  .flow { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 6px; }
  .card { background: #fff; border: 2px solid #d5dbe6; border-radius: 8px; padding: 6px; min-height: 90px; }
  .card h4 { margin: 0 0 4px; font-size: 12px; color: #5f6b7a; text-transform: uppercase; letter-spacing: .03em; }
  .mono { font-family: ui-monospace, Menlo, monospace; font-size: 11px; overflow-wrap: anywhere; }
  .ph { display: inline-block; margin-top: 3px; padding: 1px 6px; border-radius: 4px; font-weight: 700; font-size: 11px; }
  .Bound, .Running, .Ready { background: #e3f5e8; color: #137333; }
  .Pending, .Terminating, .Released { background: #fff4d6; color: #8a5a00; }
  .none { color: #8a94a3; font-style: italic; font-size: 12px; }
  .file { display: block; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
  .opts { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; margin-top: 4px; font-size: 12px; }
</style>

<div class="bar">
  <button id="mkpvc">1. Create PVC</button>
  <button id="mkpod">2. Create pod</button>
  <button id="write">3. Write data</button>
  <button id="delpod" class="danger">Delete pod</button>
  <button id="delpvc" class="danger">Delete PVC</button>
  <button id="reset" class="alt">Reset</button>
  <div class="opts">
    <span>StorageClass <b>standard</b>:</span>
    <label>reclaimPolicy
      <select id="policy"><option>Delete</option><option>Retain</option></select></label>
    <label><input type="checkbox" id="wffc"> volumeBindingMode: WaitForFirstConsumer</label>
  </div>
</div>

<div class="flow">
  <div class="card"><h4>StorageClass</h4><div id="sc"></div></div>
  <div class="card"><h4>PVC (the claim)</h4><div id="pvc"></div></div>
  <div class="card"><h4>PV (the volume)</h4><div id="pv"></div></div>
  <div class="card"><h4>Backing disk</h4><div id="disk"></div></div>
  <div class="card"><h4>Pod</h4><div id="pod"></div></div>
</div>

<script>
  var NAMES = ['pvc-3f9c2a1e', 'pvc-8b41d07c', 'pvc-c52e9f33', 'pvc-19d4be70', 'pvc-e07a6c55'];
  var s;

  function el(id) {
    return document.getElementById(id);
  }

  function initState() {
    s = { pvc: null, pvs: [], pod: null, podN: 0, pvN: 0, row: 0 };
  }

  function pvOf(claim) {
    return s.pvs.filter(function (v) { return v.claim === claim; })[0];
  }

  function provision() {
    var name = NAMES[s.pvN % NAMES.length];
    s.pvN += 1;
    var pv = { name: name, phase: 'Bound', policy: el('policy').value, claim: s.pvc, files: [] };
    s.pvs.push(pv);
    s.pvc.phase = 'Bound';
    s.pvc.pv = name;
    console.log('[provisioner] rancher.io/local-path: created volume ' + name + ' (1Gi, RWO, reclaimPolicy ' + pv.policy + ')');
    console.log('[pv-controller] PVC data ⇄ PV ' + name + ': Bound');
  }

  function finishPvcDelete() {
    var pv = pvOf(s.pvc);
    s.pvc = null;
    if (!pv) {
      console.log('[pv-controller] PVC data removed (it was never bound)');
      return;
    }
    pv.claim = null;
    if (pv.policy === 'Delete') {
      s.pvs = s.pvs.filter(function (v) { return v !== pv; });
      console.log('[pv-controller] reclaimPolicy Delete → PV ' + pv.name + ' and its disk deleted (' + pv.files.length + ' file(s) gone)');
    } else {
      pv.phase = 'Released';
      console.log('[pv-controller] reclaimPolicy Retain → PV ' + pv.name + ' is Released; disk and ' + pv.files.length + ' file(s) kept');
    }
  }

  function attach() {
    var name = s.pod.name;
    if (s.pvc.phase === 'Pending') {
      console.log('[scheduler] ' + name + ' → node-1; now the volume can be provisioned on that node');
      provision();
    }
    var pv = pvOf(s.pvc);
    s.pod.pending = false;
    console.log('[kubelet] ' + name + ': mounted PVC data (' + pv.name + ') at /data, new emptyDir at /cache');
    console.log('[kubelet] ' + name + ': /data has ' + pv.files.length + ' file(s), /cache is empty → Running');
  }

  el('mkpvc').onclick = function () {
    console.log('$ kubectl apply -f pvc.yaml');
    if (s.pvc) {
      console.log('persistentvolumeclaim/data unchanged');
      return;
    }
    s.pvc = { phase: 'Pending', pv: null };
    console.log('persistentvolumeclaim/data created');
    if (s.pod) {
      attach();
    } else if (el('wffc').checked) {
      console.log('[pv-controller] data: Pending (WaitForFirstConsumer: waiting for a pod to use it)');
    } else {
      provision();
    }
    paint();
  };

  el('mkpod').onclick = function () {
    console.log('$ kubectl apply -f pod.yaml');
    if (s.pod) {
      console.log('pod/' + s.pod.name + ' unchanged');
      return;
    }
    s.podN += 1;
    s.pod = { name: 'app-' + s.podN, cache: [], pending: true };
    console.log('pod/' + s.pod.name + ' created');
    if (!s.pvc || s.pvc.phase === 'Terminating') {
      console.log('[scheduler] ' + s.pod.name + ' Pending: persistentvolumeclaim "data" ' +
        (s.pvc ? 'is being deleted' : 'not found'));
    } else {
      attach();
    }
    paint();
  };

  el('write').onclick = function () {
    if (!s.pod || s.pod.pending) {
      console.log('error: no running pod. Create one first');
      return;
    }
    s.row += 1;
    var pv = pvOf(s.pvc);
    pv.files.push('order-' + s.row);
    s.pod.cache.push('tmp-' + s.row);
    console.log('$ kubectl exec ' + s.pod.name + ' -- sh -c "echo order-' + s.row +
      ' >> /data/orders.txt; echo tmp-' + s.row + ' >> /cache/tmp.txt"');
    paint();
  };

  el('delpod').onclick = function () {
    if (!s.pod) {
      console.log('error: no pod to delete');
      return;
    }
    console.log('$ kubectl delete pod ' + s.pod.name);
    console.log('pod "' + s.pod.name + '" deleted');
    var wasPending = s.pod.pending;
    if (!wasPending) {
      var pv = pvOf(s.pvc);
      console.log('[kubelet] emptyDir /cache deleted with the pod (' + s.pod.cache.length + ' file(s) lost)');
      console.log('[kubelet] /data unmounted; ' + pv.name + ' keeps ' + pv.files.length + ' file(s)');
    }
    s.pod = null;
    if (!wasPending && s.pvc.phase === 'Terminating') {
      console.log('[pvc-protection] no pod uses data any more → finishing deletion');
      finishPvcDelete();
    }
    paint();
  };

  el('delpvc').onclick = function () {
    console.log('$ kubectl delete pvc data');
    if (!s.pvc) {
      console.log('Error from server (NotFound): persistentvolumeclaims "data" not found');
      return;
    }
    console.log('persistentvolumeclaim "data" deleted');
    if (s.pod && !s.pod.pending) {
      s.pvc.phase = 'Terminating';
      console.log('[pvc-protection] data stays Terminating while ' + s.pod.name + ' still mounts it');
    } else {
      finishPvcDelete();
    }
    paint();
  };

  el('policy').onchange = function () {
    console.log('StorageClass standard: reclaimPolicy ' + el('policy').value + ' (applies to PVs created from now on)');
    paint();
  };

  el('wffc').onchange = function () {
    console.log('StorageClass standard: volumeBindingMode ' + (el('wffc').checked ? 'WaitForFirstConsumer' : 'Immediate'));
    paint();
  };

  el('reset').onclick = function () {
    initState();
    console.log('--- reset ---');
    paint();
  };

  function ph(x) {
    return '<span class="ph ' + x + '">' + x + '</span>';
  }

  function paint() {
    el('sc').innerHTML = '<div class="mono">standard</div><div class="mono">provisioner: rancher.io/local-path</div>' +
      '<div class="mono">reclaimPolicy: ' + el('policy').value + '</div>' +
      '<div class="mono">binding: ' + (el('wffc').checked ? 'WaitForFirstConsumer' : 'Immediate') + '</div>';
    el('pvc').innerHTML = s.pvc
      ? '<div class="mono">data · 1Gi · RWO</div>' + ph(s.pvc.phase) +
        '<div class="mono">volume: ' + (s.pvc.pv || '—') + '</div>'
      : '<span class="none">none</span>';
    el('pv').innerHTML = s.pvs.length
      ? s.pvs.map(function (v) {
        return '<div class="mono">' + v.name + '</div>' + ph(v.phase) +
          '<div class="mono">reclaim: ' + v.policy + '</div>';
      }).join('<hr>')
      : '<span class="none">none</span>';
    el('disk').innerHTML = s.pvs.length
      ? s.pvs.map(function (v) {
        return '<div class="mono">' + v.name + '/orders.txt</div>' +
          (v.files.map(function (f) { return '<span class="file">' + f + '</span>'; }).join('') ||
            '<span class="none">empty</span>');
      }).join('<hr>')
      : '<span class="none">none</span>';
    el('pod').innerHTML = s.pod && s.pod.pending
      ? '<div class="mono">' + s.pod.name + '</div>' + ph('Pending') +
        '<div class="mono">waiting for PVC data</div>'
      : s.pod
      ? '<div class="mono">' + s.pod.name + '</div>' + ph('Running') +
        '<div class="mono">/data → PVC data</div>' +
        '<div class="mono">/cache (emptyDir): ' + (s.pod.cache.join(', ') || 'empty') + '</div>'
      : '<span class="none">none</span>';
  }

  initState();
  paint();
</script>`,
      },
      {
        title: 'Reference: StorageClass, PVC and a Deployment that mounts it',
        runnable: false,
        lang: 'yaml',
        code: `# Most clusters already have a default StorageClass (kind: "standard").
# A custom one for a cloud disk might look like this:
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: fast-retain
provisioner: ebs.csi.aws.com          # the CSI driver that creates disks
parameters:
  type: gp3
reclaimPolicy: Retain                 # keep the disk when the PVC is deleted
volumeBindingMode: WaitForFirstConsumer
allowVolumeExpansion: true            # lets you grow a PVC by editing its size
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pgdata
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: fast-retain       # omit to use the cluster default
  resources:
    requests:
      storage: 10Gi
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: postgres
spec:
  replicas: 1                         # RWO disk → only one writer
  strategy:
    type: Recreate                    # old pod must release the disk first
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
        - name: postgres
          image: postgres:17
          envFrom:
            - secretRef:
                name: pg-secret
          volumeMounts:
            - name: data
              mountPath: /var/lib/postgresql/data
            - name: scratch
              mountPath: /tmp
      volumes:
        - name: data
          persistentVolumeClaim:
            claimName: pgdata
        - name: scratch
          emptyDir:
            sizeLimit: 500Mi`,
      },
      {
        title: 'Reference: watching a PVC bind on kind',
        runnable: false,
        lang: 'bash',
        code: `$ kubectl get storageclass
NAME                 PROVISIONER             RECLAIMPOLICY   VOLUMEBINDINGMODE      AGE
standard (default)   rancher.io/local-path   Delete          WaitForFirstConsumer   2d

$ kubectl apply -f pvc.yaml
persistentvolumeclaim/pgdata created
$ kubectl get pvc
NAME     STATUS    VOLUME   CAPACITY   ACCESS MODES   STORAGECLASS   AGE
pgdata   Pending                                      standard       5s
$ kubectl describe pvc pgdata | tail -2
  Normal  WaitForFirstConsumer  5s  persistentvolume-controller  waiting for first consumer to be created before binding

$ kubectl apply -f postgres.yaml
deployment.apps/postgres created
$ kubectl get pvc,pv
NAME                           STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS
persistentvolumeclaim/pgdata   Bound    pvc-3f9c2a1e-8d7b-4c1a-9f0e-2b6d5a4c3e21   5Gi        RWO            standard

NAME                                                        CAPACITY   RECLAIM POLICY   STATUS   CLAIM
persistentvolume/pvc-3f9c2a1e-8d7b-4c1a-9f0e-2b6d5a4c3e21   5Gi        Delete           Bound    default/pgdata

# Data survives pod replacement:
$ kubectl exec deploy/postgres -- psql -U postgres -c "CREATE TABLE t(x int)"
CREATE TABLE
$ kubectl delete pod -l app=postgres
pod "postgres-6d8f7c9b5-kx2lp" deleted
$ kubectl exec deploy/postgres -- psql -U postgres -c "\\dt"
         List of relations
 Schema | Name | Type  |  Owner
--------+------+-------+----------
 public | t    | table | postgres`,
      },
    ],
    quiz: [
      {
        q: 'Which object does an application developer normally write to ask for durable storage?',
        options: ['PersistentVolume', 'PersistentVolumeClaim', 'StorageClass', 'CSIDriver'],
        answer: 1,
        why: 'You write a PVC (the claim). With dynamic provisioning, the StorageClass\'s provisioner creates the PV for you.',
      },
      {
        q: 'A pod with an <code>emptyDir</code> volume is deleted and its Deployment creates a replacement. What is in the new pod\'s emptyDir?',
        options: ['The old files', 'Nothing: it is a new, empty directory', 'A read-only copy of the old files', 'It depends on the reclaim policy'],
        answer: 1,
        why: 'emptyDir lives exactly as long as the pod. It survives container restarts inside the same pod, but a new pod gets a new empty directory.',
      },
      {
        q: 'You delete a PVC whose dynamically provisioned PV has <code>reclaimPolicy: Delete</code> (and no pod uses it). What happens?',
        options: [
          'The PV becomes Released and the data is kept',
          'The PV and the underlying disk are deleted, so the data is gone',
          'Nothing until the namespace is deleted',
          'The PVC is recreated automatically',
        ],
        answer: 1,
        why: 'Delete is the default for dynamic provisioning. Use Retain (and backups) for data you care about.',
      },
      {
        q: 'Two pods on <em>different</em> nodes must write to the same volume at the same time. Which access mode do you need?',
        options: ['ReadWriteOnce', 'ReadWriteOncePod', 'ReadWriteMany', 'ReadOnlyMany'],
        answer: 2,
        why: 'RWO limits the volume to one node, and RWOP to one pod. Multi-node writers need RWX, backed by a shared filesystem such as NFS, EFS or CephFS.',
      },
      {
        q: 'Your new PVC is <code>Pending</code> and <code>describe</code> says <code>waiting for first consumer</code>. What is going on?',
        options: [
          'The provisioner is broken',
          'The StorageClass uses WaitForFirstConsumer. The PV is created once a pod using the PVC is scheduled',
          'The cluster is out of disk space',
          'You must create the PV manually',
        ],
        answer: 1,
        why: 'This is normal. Delaying provisioning lets the disk be created in the same zone/node as the pod.',
      },
    ],
    exercise: {
      lang: 'html',
      task: `
        <p>This Postgres pod keeps its data in an <code>emptyDir</code>, so every rescheduled pod starts with an empty
        database. Make it durable:</p>
        <ol>
          <li>Add a <code>PersistentVolumeClaim</code> document (separated by <code>---</code>) named <code>pgdata</code>,
          <code>ReadWriteOnce</code>, <code>5Gi</code>, <code>storageClassName: standard</code>.</li>
          <li>Replace the pod's <code>emptyDir</code> with <code>persistentVolumeClaim: claimName: pgdata</code>.</li>
          <li>Keep the volume name and the mount at <code>/var/lib/postgresql/data</code> consistent.</li>
        </ol>
        <p>Edit the manifest in the box below and click <strong>Check</strong>. Every line should turn ✓.</p>`,
      hint: 'PVC skeleton: apiVersion: v1 / kind: PersistentVolumeClaim / metadata.name / spec.accessModes (a list) / spec.storageClassName / spec.resources.requests.storage. In the pod: volumes: - name: pgdata, persistentVolumeClaim: claimName: pgdata.',
      starter: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 300px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false"># TODO: add a PersistentVolumeClaim here, then a line with three dashes

apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
    - name: postgres
      image: postgres:17
      env:
        - name: POSTGRES_PASSWORD
          value: example
      volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumes:
    - name: pgdata
      emptyDir: {}
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function docs(y) {
    return y.split(/^---\s*$/m);
  }

  function kindDoc(y, kind) {
    return docs(y).filter(function (d) {
      return new RegExp('^kind\\s*:\\s*' + kind + '\\s*$', 'm').test(d);
    })[0] || '';
  }

  function rules(y) {
    var pvc = kindDoc(y, 'PersistentVolumeClaim');
    var pod = kindDoc(y, 'Pod');
    var meta = blockAfter(pvc, /^metadata\s*:/);
    var modes = blockAfter(pvc, /^\s*accessModes\s*:/);
    var vols = blockAfter(pod, /^\s*volumes\s*:/);
    var mounts = blockAfter(pod, /^\s*volumeMounts\s*:/);
    var claim = (vols.match(/claimName\s*:\s*["']?([\w.-]+)/) || [])[1];
    var volName = (vols.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var mountName = (mounts.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    return [
      ['a separate document with kind: PersistentVolumeClaim (apiVersion v1)',
        !!pvc && /^apiVersion\s*:\s*v1\s*$/m.test(pvc)],
      ['PVC is named pgdata', /name\s*:\s*["']?pgdata["']?\s*$/m.test(meta)],
      ['accessModes: ReadWriteOnce', /-\s*["']?ReadWriteOnce["']?/.test(modes)],
      ['requests storage: 5Gi', /storage\s*:\s*["']?5Gi["']?\s*$/m.test(pvc)],
      ['storageClassName: standard', /storageClassName\s*:\s*["']?standard["']?\s*$/m.test(pvc)],
      ['pod volume uses persistentVolumeClaim claimName pgdata',
        /persistentVolumeClaim\s*:/.test(vols) && claim === 'pgdata'],
      ['no emptyDir for the database any more', !/emptyDir/.test(pod)],
      ['volume name matches volumeMount name, mounted at /var/lib/postgresql/data',
        !!volName && volName === mountName && /mountPath\s*:\s*["']?\/var\/lib\/postgresql\/data/.test(mounts)],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
</script>`,
      solution: String.raw`<style>
  body { font: 14px system-ui, sans-serif; background: #f4f6fa; color: #1d2330; margin: 0; padding: 10px; }
  textarea { width: 100%; height: 300px; box-sizing: border-box; font: 12.5px/1.45 ui-monospace, Menlo, monospace;
    padding: 8px; border: 1px solid #c9d1de; border-radius: 6px; background: #fff; color: #1d2330; }
  button { margin: 8px 0; padding: 6px 14px; border: 0; border-radius: 6px; background: #326ce5; color: #fff; cursor: pointer; }
  #out { list-style: none; padding: 0; margin: 0; }
  #out li { padding: 2px 0; }
  .ok { color: #137333; } .bad { color: #b3261e; }
</style>
<textarea id="f" spellcheck="false">apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: pgdata
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 5Gi
---
apiVersion: v1
kind: Pod
metadata:
  name: postgres
spec:
  containers:
    - name: postgres
      image: postgres:17
      env:
        - name: POSTGRES_PASSWORD
          value: example
      volumeMounts:
        - name: pgdata
          mountPath: /var/lib/postgresql/data
  volumes:
    - name: pgdata
      persistentVolumeClaim:
        claimName: pgdata
</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny line-based YAML helpers (no real parser needed for these checks).
  function blockAfter(text, re) {
    var ls = text.replace(/\t/g, '  ').split('\n');
    var i = ls.findIndex(function (l) { return re.test(l); });
    if (i < 0) return '';
    var ind = ls[i].search(/\S/);
    var out = [];
    for (var j = i + 1; j < ls.length; j++) {
      if (!ls[j].trim()) continue;
      if (ls[j].search(/\S/) <= ind) break;
      out.push(ls[j]);
    }
    return out.join('\n');
  }

  function docs(y) {
    return y.split(/^---\s*$/m);
  }

  function kindDoc(y, kind) {
    return docs(y).filter(function (d) {
      return new RegExp('^kind\\s*:\\s*' + kind + '\\s*$', 'm').test(d);
    })[0] || '';
  }

  function rules(y) {
    var pvc = kindDoc(y, 'PersistentVolumeClaim');
    var pod = kindDoc(y, 'Pod');
    var meta = blockAfter(pvc, /^metadata\s*:/);
    var modes = blockAfter(pvc, /^\s*accessModes\s*:/);
    var vols = blockAfter(pod, /^\s*volumes\s*:/);
    var mounts = blockAfter(pod, /^\s*volumeMounts\s*:/);
    var claim = (vols.match(/claimName\s*:\s*["']?([\w.-]+)/) || [])[1];
    var volName = (vols.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    var mountName = (mounts.match(/name\s*:\s*["']?([\w.-]+)/) || [])[1];
    return [
      ['a separate document with kind: PersistentVolumeClaim (apiVersion v1)',
        !!pvc && /^apiVersion\s*:\s*v1\s*$/m.test(pvc)],
      ['PVC is named pgdata', /name\s*:\s*["']?pgdata["']?\s*$/m.test(meta)],
      ['accessModes: ReadWriteOnce', /-\s*["']?ReadWriteOnce["']?/.test(modes)],
      ['requests storage: 5Gi', /storage\s*:\s*["']?5Gi["']?\s*$/m.test(pvc)],
      ['storageClassName: standard', /storageClassName\s*:\s*["']?standard["']?\s*$/m.test(pvc)],
      ['pod volume uses persistentVolumeClaim claimName pgdata',
        /persistentVolumeClaim\s*:/.test(vols) && claim === 'pgdata'],
      ['no emptyDir for the database any more', !/emptyDir/.test(pod)],
      ['volume name matches volumeMount name, mounted at /var/lib/postgresql/data',
        !!volName && volName === mountName && /mountPath\s*:\s*["']?\/var\/lib\/postgresql\/data/.test(mounts)],
    ];
  }

  function check() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    rules(document.getElementById('f').value).forEach(function (r) {
      var li = document.createElement('li');
      li.className = r[1] ? 'ok' : 'bad';
      li.textContent = (r[1] ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
  }

  document.getElementById('check').onclick = check;
  check();
</script>`,
    },
  },
);
