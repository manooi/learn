// Section: Docker Foundations
(function () {
  const CHECKER_CSS = `
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  p.task { margin: 0 0 6px; }
  textarea { width: 100%; box-sizing: border-box; height: 190px; font-family: ui-monospace, Menlo, monospace; font-size: 12.5px;
    padding: 8px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #111827; }
  button { margin-top: 8px; padding: 6px 14px; border-radius: 6px; border: 1px solid #4f46e5; background: #4f46e5; color: #fff; cursor: pointer; }
  ul { list-style: none; padding: 0; margin: 8px 0 0; }
  li { padding: 3px 8px; border-radius: 4px; margin: 3px 0; }
  .ok { background: #dcfce7; color: #166534; }
  .bad { background: #fee2e2; color: #991b1b; }
  #sum { font-weight: 600; margin: 6px 0 0; }`;

  const CHECKER_BASE = String.raw`
var ta = document.getElementById('f');
var out = document.getElementById('out');
var sum = document.getElementById('sum');

// Lines without comments, trimmed, "\" continuations joined.
function cleanLines(src) {
  var BS = String.fromCharCode(92);
  var raw = src.split('\n');
  var res = [];
  var buf = '';
  raw.forEach(function (l) {
    var t = l.replace(/^\s*#.*$/, '').trim();
    if (t.slice(-1) === BS) {
      buf += t.slice(0, -1) + ' ';
      return;
    }
    buf += t;
    if (buf.trim()) res.push(buf.trim());
    buf = '';
  });
  if (buf.trim()) res.push(buf.trim());
  return res;
}

function check() {
  out.innerHTML = '';
  var src = ta.value;
  var pass = 0;
  RULES.forEach(function (r) {
    var ok = false;
    try { ok = !!r[1](src); } catch (e) { ok = false; }
    if (ok) pass++;
    var li = document.createElement('li');
    li.className = ok ? 'ok' : 'bad';
    li.textContent = (ok ? '✓ ' : '✗ ') + r[0];
    out.appendChild(li);
  });
  sum.textContent = pass === RULES.length
    ? 'All ' + pass + ' checks pass. Nice work!'
    : pass + ' / ' + RULES.length + ' checks passing';
}
document.getElementById('check').addEventListener('click', check);
`;

  function checker(content, rulesJs) {
    return `<style>${CHECKER_CSS}
</style>

<textarea id="f" spellcheck="false">${content}</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<p id="sum"></p>

<script>${CHECKER_BASE}
${rulesJs}
check();
</script>`;
  }

  // ---------------------------------------------------------------------------
  // Exercise rule sets
  // ---------------------------------------------------------------------------
  const RUN_LIMITS_RULES = String.raw`
function cmd(src) {
  var ls = cleanLines(src).filter(function (l) { return /^docker\s+(container\s+)?run\b/.test(l); });
  return ls.length ? ls[0] : '';
}
function toks(src) { return cmd(src).split(/\s+/); }
var RULES = [
  ['It is a single "docker run" command', function (s) { return cmd(s) !== ''; }],
  ['Runs in the background (-d / --detach)', function (s) {
    return toks(s).some(function (t) { return t === '-d' || t === '--detach' || /^-[a-z]*d[a-z]*$/.test(t); });
  }],
  ['Is named web (--name web)', function (s) { return /--name(=|\s+)web(\s|$)/.test(cmd(s)); }],
  ['Memory limited to 256 MB (-m / --memory 256m)', function (s) {
    return /(^|\s)(-m|--memory)(=|\s+)256\s?[mM][iI]?[bB]?(\s|$)/.test(cmd(s));
  }],
  ['Half a CPU (--cpus 0.5)', function (s) { return /--cpus(=|\s+)0?\.5(\s|$)/.test(cmd(s)); }],
  ['Own hostname web01 (-h / --hostname web01)', function (s) {
    return /(^|\s)(-h|--hostname)(=|\s+)web01(\s|$)/.test(cmd(s));
  }],
  ['Image nginx:1.27 comes last (options go BEFORE the image)', function (s) {
    var t = toks(s);
    return t[t.length - 1] === 'nginx:1.27';
  }],
];`;

  const VOLUME_RULES = String.raw`
function runs(src) {
  return cleanLines(src).filter(function (l) { return /^docker\s+(container\s+)?run\b/.test(l); });
}
function volName(line) {
  var m = line.match(/(-v|--volume)(=|\s+)([^\s:]+):\/data(\s|$|:)/);
  if (m) return m[3];
  m = line.match(/--mount(=|\s+)(\S+)/);
  if (m && /(target|dst|destination)=\/data(,|$)/.test(m[2])) {
    var s = m[2].match(/(source|src)=([^,]+)/);
    return s ? s[2] : '';
  }
  return null;
}
var RULES = [
  ['Still has two "docker run" commands', function (s) { return runs(s).length === 2; }],
  ['First run mounts a volume at /data', function (s) { var r = runs(s); return r[0] && volName(r[0]); }],
  ['Second run mounts a volume at /data', function (s) { var r = runs(s); return r[1] && volName(r[1]); }],
  ['Both runs use the SAME volume name', function (s) {
    var r = runs(s);
    return r.length === 2 && volName(r[0]) && volName(r[0]) === volName(r[1]);
  }],
  ['It is a named volume (not a ./host/path bind mount)', function (s) {
    var r = runs(s);
    var n = r[0] ? volName(r[0]) : '';
    return !!n && !/[\/.~]/.test(n.charAt(0));
  }],
  ['Still removes the container with docker rm -f', function (s) {
    return cleanLines(s).some(function (l) { return /^docker\s+(container\s+)?rm\s+-f\s+notes-app/.test(l); });
  }],
];`;

  const ARCH_RULES = String.raw`
var ANSWERS = {
  1: ['dockercli', 'cli', 'docker', 'client', 'dockerclient'],
  2: ['registry', 'dockerhub', 'hub', 'imageregistry', 'containerregistry'],
  3: ['dockerd', 'dockerdaemon', 'daemon', 'dockerengine', 'engine'],
  4: ['containerd'],
  5: ['runc'],
};
function answer(src, n) {
  var ls = src.split('\n');
  for (var i = 0; i < ls.length; i++) {
    var m = ls[i].match(/^\s*(\d)\.[^=]*=(.*)$/);
    if (m && Number(m[1]) === n) return m[2].toLowerCase().replace(/[^a-z]/g, '');
  }
  return '';
}
function rule(n, label) {
  return [label, function (s) { return ANSWERS[n].indexOf(answer(s, n)) !== -1; }];
}
var RULES = [
  rule(1, '1. The client that turns commands into REST calls'),
  rule(2, '2. Where images live remotely'),
  rule(3, '3. The daemon that owns the Docker API'),
  rule(4, '4. The lifecycle supervisor underneath the daemon'),
  rule(5, '5. The low-level OCI runtime that exits after starting'),
];`;

  const REFRESHER_RULES = String.raw`
function ls(src) { return cleanLines(src); }
function has(src, re) { return ls(src).some(function (l) { return re.test(l); }); }
var RULES = [
  ['1. Runs nginx:1.27 detached, named web, port 8080 -> 80', function (s) {
    return ls(s).some(function (l) {
      return /^docker\s+(container\s+)?run\b/.test(l) &&
        /(\s-d\b|--detach|\s-[a-z]*d[a-z]*\s)/.test(l + ' ') &&
        /--name(=|\s+)web(\s|$)/.test(l) &&
        /(-p|--publish)(=|\s+)8080:80(\s|$)/.test(l) &&
        /\snginx:1\.27(\s|$)/.test(l);
    });
  }],
  ['2. Follows the logs of web', function (s) {
    return has(s, /^docker\s+(container\s+)?logs\s+(.*\s)?(-f|--follow)(\s.*)?\s?web$/) ||
      has(s, /^docker\s+(container\s+)?logs\s+(-f|--follow)\s+web(\s|$)/);
  }],
  ['3. Opens an interactive shell (sh) in web', function (s) {
    return has(s, /^docker\s+(container\s+)?exec\s+(-it|-ti|-i\s+-t|-t\s+-i)\s+web\s+(sh|bash|\/bin\/sh|\/bin\/bash)$/);
  }],
  ['4. Stops web gracefully (SIGTERM first, not kill)', function (s) {
    return has(s, /^docker\s+(container\s+)?stop\s+web$/) && !has(s, /^docker\s+(container\s+)?kill\b/);
  }],
  ['5. Removes the web container', function (s) { return has(s, /^docker\s+(container\s+)?rm\s+(-f\s+)?web$/); }],
  ['6. Shows ALL containers, including stopped ones', function (s) {
    return has(s, /^docker\s+(ps|container\s+ls)\s+(-a|--all)$/);
  }],
];`;

  // ---------------------------------------------------------------------------
  window.LESSONS = window.LESSONS || [];
  window.LESSONS.push(
    // =========================================================================
    {
      id: 'what-is-container',
      section: 'Docker Foundations',
      title: 'What is a container, really?',
      explain: `
        <p>You have probably run <code>docker run nginx</code> and seen a web server appear. It is tempting to think of that
        container as a "small virtual machine". It isn't one, and knowing the difference explains most of Docker's behaviour.</p>

        <h3>A container is just a process, fenced in</h3>
        <p>A container is an <strong>ordinary Linux process</strong> running on the host's kernel. The kernel is told to
        <em>restrict what that process can see</em> and <em>limit what it can use</em>. There is no second operating system
        and no emulated hardware.</p>
        <p><strong>Analogy:</strong> a VM is a separate house with its own foundation, plumbing and power. A container is a flat
        in an apartment block. You get your own front door and your own furniture, but the building (the kernel) is shared.</p>

        <h3>The two kernel features that make it work</h3>
        <ul>
          <li><strong>Namespaces</strong> control <em>what a process can see</em>. Each container gets its own:
            <code>pid</code> (its own process list where the app is PID 1), <code>net</code> (its own network interfaces and IP),
            <code>mnt</code> (its own root filesystem from the image), <code>uts</code> (its own hostname),
            <code>ipc</code>, and optionally <code>user</code> (root inside can map to a normal user outside).</li>
          <li><strong>cgroups</strong> (control groups) control <em>how much it can use</em>: memory, CPU, number of processes,
            disk I/O. <code>docker run --memory 256m --cpus 0.5</code> writes cgroup limits. If the app goes over its memory
            limit, the kernel's OOM killer kills it.</li>
        </ul>

        <h3>VM vs container at a glance</h3>
        <table>
          <tr><th></th><th>Virtual machine</th><th>Container</th></tr>
          <tr><td>Kernel</td><td>Its own guest kernel</td><td>Shares the host kernel</td></tr>
          <tr><td>Boots</td><td>A whole OS, usually tens of seconds</td><td>Starts one process, usually under a second</td></tr>
          <tr><td>Size</td><td>Gigabytes (full OS disk)</td><td>Megabytes up to a few hundred MB</td></tr>
          <tr><td>Isolation</td><td>Strong (hardware virtualisation)</td><td>Good, but a kernel bug affects every container</td></tr>
          <tr><td>Runs a different OS kernel?</td><td>Yes (Windows VM on Linux host)</td><td>No. Linux containers need a Linux kernel</td></tr>
        </table>

        <div class="tip"><strong>On macOS and Windows</strong>, Docker Desktop quietly runs a small Linux VM, and your containers
        share <em>that</em> VM's kernel. That's why <code>uname -r</code> inside a container on a Mac prints a Linux kernel version.</div>

        <h3>OCI: why "Docker images" work everywhere</h3>
        <p>The <strong>Open Container Initiative (OCI)</strong> publishes open specs for the <em>image format</em>, the
        <em>runtime</em> (how to start a container from an unpacked image) and <em>distribution</em> (how registries serve images).
        Docker builds OCI-compatible images, so the same image runs under containerd, Podman or Kubernetes. Kubernetes stopped
        talking to Docker itself years ago (dockershim was removed in 1.24), but it runs Docker-built images just fine.</p>

        <div class="warn"><strong>Common misconception:</strong> "the container has its own OS". It has its own <em>userland files</em>
        (for example Debian's <code>/bin</code>, <code>/etc</code> and libraries from the image), but <strong>not its own kernel</strong>.
        That's why a container can't load kernel modules, and why an Alpine container on an Ubuntu host still reports Ubuntu's kernel.</div>
      `,
      examples: [
        {
          title: 'VM stack vs container stack',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 10px; }
  button { padding: 5px 10px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; }
  button:hover { background: #eef2ff; }
  button.on { background: #fee2e2; border-color: #dc2626; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .col { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 8px; }
  .col h4 { margin: 0 0 6px; font-size: 13px; }
  .row { display: flex; gap: 4px; margin-bottom: 3px; }
  .slot { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .box { border-radius: 4px; padding: 4px 3px; text-align: center; font-size: 11px; transition: all .25s;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .app { background: #dbeafe; }
  .lib { background: #e0f2fe; }
  .guest { background: #fde68a; }
  .kernel { background: #fecaca; }
  .base { background: #e5e7eb; margin-bottom: 3px; }
  .rt { background: #d1fae5; margin-bottom: 3px; }
  .hl .kernel { outline: 3px solid #dc2626; outline-offset: -3px; font-weight: 700; }
  .stats { margin-top: 6px; font-size: 12px; color: #374151; line-height: 1.5; }
  .stats b { color: #111827; }
</style>

<div class="bar">
  <button id="add">+ Add app</button>
  <button id="remove">− Remove app</button>
  <button id="hl">Highlight kernels</button>
</div>

<div class="cols" id="cols">
  <div class="col">
    <h4>Virtual machines</h4>
    <div id="vm"></div>
    <div class="box base">Hypervisor</div>
    <div class="box kernel">Host OS + host kernel</div>
    <div class="box base" style="margin-top:3px">Hardware</div>
    <div class="stats" id="vmStats"></div>
  </div>
  <div class="col">
    <h4>Containers</h4>
    <div id="ct"></div>
    <div class="box rt">Container runtime (Docker Engine)</div>
    <div class="box kernel">Host OS + ONE shared Linux kernel</div>
    <div class="box base" style="margin-top:3px">Hardware</div>
    <div class="stats" id="ctStats"></div>
  </div>
</div>

<script>
  var apps = 2;
  var NAMES = ['web', 'api', 'db', 'cache', 'worker'];
  var highlight = false;

  function render() {
    var vm = '<div class="row">';
    var ct = '<div class="row">';
    for (var i = 0; i < apps; i++) {
      vm += '<div class="slot">' +
        '<div class="box app">' + NAMES[i] + '</div>' +
        '<div class="box lib">libs</div>' +
        '<div class="box guest">guest OS</div>' +
        '<div class="box kernel">guest kernel</div></div>';
      ct += '<div class="slot">' +
        '<div class="box app">' + NAMES[i] + '</div>' +
        '<div class="box lib">libs</div></div>';
    }
    document.getElementById('vm').innerHTML = vm + '</div>';
    document.getElementById('ct').innerHTML = ct + '</div>';

    document.getElementById('vmStats').innerHTML =
      'Kernels running: <b>' + (apps + 1) + '</b> (' + apps + ' guest + 1 host)<br>' +
      'Extra RAM just for guest OSes: <b>~' + apps + ' GB</b><br>' +
      'Start-up: boot a whole OS, <b>tens of seconds</b>';
    document.getElementById('ctStats').innerHTML =
      'Kernels running: <b>1</b> (shared by ' + apps + ' containers)<br>' +
      'Extra RAM overhead: <b>a few MB</b> per container<br>' +
      'Start-up: start one process, <b>usually &lt; 1 s</b>';
    document.getElementById('cols').className = 'cols' + (highlight ? ' hl' : '');
    document.getElementById('hl').className = highlight ? 'on' : '';
  }

  function report() {
    console.log('apps: ' + apps + ' | VM side runs ' + (apps + 1) + ' kernels | container side runs 1 kernel');
  }

  document.getElementById('add').onclick = function () {
    if (apps >= 5) { console.log('max 5 apps in this demo'); return; }
    apps++;
    render();
    report();
  };
  document.getElementById('remove').onclick = function () {
    if (apps <= 1) { console.log('need at least 1 app'); return; }
    apps--;
    render();
    report();
  };
  document.getElementById('hl').onclick = function () {
    highlight = !highlight;
    render();
    console.log(highlight
      ? 'Highlighting kernels: every VM carries its own; all containers share the host one.'
      : 'Highlight off.');
  };

  render();
  report();
</script>`,
          explain: `
            <details>
              <summary>The problem: one OS per app is heavy</summary>
              <p>Before containers, the usual way to isolate apps was one VM each. Every VM boots its <em>own</em> kernel and
              full OS, then runs your small app on top. Three small apps means three extra kernels and three OS installs, each
              reserving RAM and disk before your code even starts.</p>
              <p>Containers keep the isolation you actually need (separate files, processes and network) but drop the extra
              kernels. Only the app and its libraries are packaged.</p>
            </details>
            <details>
              <summary>Step by step: what the buttons show</summary>
              <table>
                <tr><th>Action</th><th>VM side</th><th>Container side</th><th>Console</th></tr>
                <tr><td>Load</td><td>web, api: each with libs, guest OS, guest kernel</td><td>web, api: just app + libs</td>
                  <td><code>apps: 2 | VM side runs 3 kernels | container side runs 1 kernel</code></td></tr>
                <tr><td>+ Add app</td><td>db appears with <em>another</em> guest OS + kernel</td><td>db appears as app + libs only</td>
                  <td><code>apps: 3 | VM side runs 4 kernels | container side runs 1 kernel</code></td></tr>
                <tr><td>Highlight kernels</td><td>4 red outlines (3 guest + host)</td><td>1 red outline: the shared kernel</td>
                  <td><code>Highlighting kernels: every VM carries its own; all containers share the host one.</code></td></tr>
                <tr><td>− Remove app</td><td>Back to 3 kernels</td><td>Still 1 kernel</td>
                  <td><code>apps: 2 | VM side runs 3 kernels | container side runs 1 kernel</code></td></tr>
              </table>
              <p>The RAM and start-up numbers are rough, illustrative figures. The point is the <em>shape</em>: VM cost grows
              with a whole OS per app, container cost grows with just the app.</p>
            </details>
            <details>
              <summary>Common mistake: "shared kernel" means "no isolation"</summary>
              <div class="warn">Containers <strong>are</strong> isolated: separate process trees, filesystems, network stacks and
              resource limits. The trade-off is that the isolation boundary is the kernel. A kernel exploit could escape every
              container on the host, which is why multi-tenant platforms sometimes add a VM layer (for example Firecracker or
              gVisor) around untrusted containers.</div>
            </details>
          `,
        },
        {
          title: 'Namespaces & cgroups: what a container sees and what it may use',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1.3fr 1fr; gap: 12px; }
  .card { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 8px 10px; }
  h4 { margin: 0 0 6px; font-size: 13px; }
  button { padding: 4px 9px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; font-size: 12px; }
  button.sel { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  table { border-collapse: collapse; width: 100%; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; margin-top: 6px; }
  td, th { text-align: left; padding: 2px 4px; border-bottom: 1px solid #eef0f4; }
  tr.web td { background: #dbeafe; }
  tr.db td { background: #fef3c7; }
  .meta { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; margin-top: 6px; line-height: 1.5; }
  .meter { height: 18px; background: #e5e7eb; border-radius: 4px; position: relative; overflow: hidden; margin: 6px 0; }
  .fill { height: 100%; background: #60a5fa; transition: width .3s; }
  .fill.danger { background: #f87171; }
  .limit { position: absolute; top: 0; bottom: 0; width: 2px; background: #dc2626; }
  .state { font-weight: 700; }
  select { font-size: 12px; }
</style>

<div class="grid">
  <div class="card">
    <h4>Namespaces: process list as seen from…</h4>
    <button data-view="host" class="sel">the host</button>
    <button data-view="web">inside web</button>
    <button data-view="db">inside db</button>
    <table id="ps"></table>
    <div class="meta" id="meta"></div>
  </div>
  <div class="card">
    <h4>cgroups: memory limit for web</h4>
    <label>limit
      <select id="limit">
        <option value="256">--memory 256m</option>
        <option value="128">--memory 128m</option>
        <option value="0">no limit</option>
      </select>
    </label>
    <div class="meter"><div class="fill" id="fill"></div><div class="limit" id="lim"></div></div>
    <div id="usage"></div>
    <p>State: <span class="state" id="state"></span></p>
    <button id="alloc">Allocate +64 MB</button>
    <button id="reset">Reset</button>
  </div>
</div>

<script>
  var PROCS = [
    { pid: 1, cmd: '/sbin/init', ns: 'host' },
    { pid: 612, cmd: 'dockerd', ns: 'host' },
    { pid: 640, cmd: 'containerd', ns: 'host' },
    { pid: 2301, cmd: 'containerd-shim-runc-v2 (web)', ns: 'host' },
    { pid: 2318, cmd: 'nginx: master process', ns: 'web', inner: 1 },
    { pid: 2355, cmd: 'nginx: worker process', ns: 'web', inner: 29 },
    { pid: 2402, cmd: 'containerd-shim-runc-v2 (db)', ns: 'host' },
    { pid: 2419, cmd: 'postgres', ns: 'db', inner: 1 },
    { pid: 2460, cmd: 'postgres: checkpointer', ns: 'db', inner: 27 },
  ];
  var META = {
    host: { hostname: 'laptop', ip: '192.168.1.20 (eth0), 172.17.0.1 (docker0)', os: 'Ubuntu 24.04 LTS' },
    web: { hostname: '3f2a9c1b7d4e', ip: '172.17.0.2 (eth0)', os: 'Debian GNU/Linux 12 (bookworm)' },
    db: { hostname: '8b1e0d6a2c95', ip: '172.17.0.3 (eth0)', os: 'Alpine Linux' },
  };
  var KERNEL = '6.8.0-45-generic';

  function showView(view) {
    var rows = '<tr><th>PID</th><th>COMMAND</th></tr>';
    var visible = PROCS.filter(function (p) { return view === 'host' || p.ns === view; });
    visible.forEach(function (p) {
      var pid = view === 'host' ? p.pid : p.inner;
      rows += '<tr class="' + p.ns + '"><td>' + pid + '</td><td>' + p.cmd + '</td></tr>';
    });
    document.getElementById('ps').innerHTML = rows;
    var m = META[view];
    document.getElementById('meta').innerHTML =
      'hostname: ' + m.hostname + '<br>ip: ' + m.ip + '<br>os-release: ' + m.os + '<br>uname -r: ' + KERNEL;
    var btns = document.querySelectorAll('[data-view]');
    for (var i = 0; i < btns.length; i++) {
      btns[i].className = btns[i].getAttribute('data-view') === view ? 'sel' : '';
    }
    console.log('--- view from ' + (view === 'host' ? 'the host' : 'inside ' + view) + ': ' +
      visible.length + ' processes, hostname ' + m.hostname + ', kernel ' + KERNEL + ' ---');
    visible.forEach(function (p) {
      console.log('  PID ' + (view === 'host' ? p.pid : p.inner) + '  ' + p.cmd);
    });
  }

  var btns = document.querySelectorAll('[data-view]');
  for (var i = 0; i < btns.length; i++) {
    btns[i].onclick = function () { showView(this.getAttribute('data-view')); };
  }

  // ---- cgroups memory demo ----
  var usage = 40;
  var state = 'running';
  var MAX = 400;

  function limit() { return Number(document.getElementById('limit').value); }

  function renderMem() {
    var l = limit();
    var fill = document.getElementById('fill');
    fill.style.width = Math.min(100, usage / MAX * 100) + '%';
    fill.className = 'fill' + (l && usage > l * 0.8 ? ' danger' : '');
    var lim = document.getElementById('lim');
    lim.style.display = l ? 'block' : 'none';
    lim.style.left = (l / MAX * 100) + '%';
    document.getElementById('usage').textContent =
      'MEM USAGE / LIMIT: ' + usage + 'MiB / ' + (l ? l + 'MiB' : 'host RAM (no limit)');
    var st = document.getElementById('state');
    st.textContent = state === 'running' ? 'Up (running)' : 'Exited (137) — OOM-killed';
    st.style.color = state === 'running' ? '#15803d' : '#b91c1c';
  }

  document.getElementById('alloc').onclick = function () {
    if (state !== 'running') {
      console.log('web is not running. Click Reset to start it again.');
      return;
    }
    usage += 64;
    var l = limit();
    if (l && usage > l) {
      console.log('web tried to use ' + usage + 'MiB > limit ' + l + 'MiB');
      console.log('kernel: Memory cgroup out of memory: Killed process 2318 (nginx)');
      console.log('$ docker ps -a --filter name=web  →  STATUS: Exited (137)');
      usage = 0;
      state = 'oom';
    } else {
      console.log('web  MEM ' + usage + 'MiB / ' + (l ? l + 'MiB' : 'no limit'));
    }
    renderMem();
  };
  document.getElementById('reset').onclick = function () {
    usage = 40;
    state = 'running';
    console.log('$ docker start web  →  web is running again (40MiB)');
    renderMem();
  };
  document.getElementById('limit').onchange = function () {
    console.log('limit set to ' + (limit() ? limit() + 'MiB' : 'none') +
      ' (like docker update --memory ' + (limit() ? limit() + 'm' : '...') + ' web)');
    renderMem();
  };

  showView('host');
  renderMem();
</script>`,
          explain: `
            <details>
              <summary>The problem: processes on one machine normally see and share everything</summary>
              <p>Without namespaces, every process on a Linux box sees every other process (<code>ps</code> lists them all),
              shares one hostname, one network stack and one filesystem. Without cgroups, one leaky app can eat all the RAM and
              take the whole machine down with it.</p>
              <p>Containers fix both with kernel features, not virtualisation: <strong>namespaces</strong> give each container
              its own <em>view</em>, and <strong>cgroups</strong> put a <em>budget</em> on it.</p>
            </details>
            <details>
              <summary>Step by step: clicking through the demo</summary>
              <table>
                <tr><th>Click</th><th>What you see</th><th>Console</th></tr>
                <tr><td>the host (on load)</td><td>9 processes. nginx is host PID <strong>2318</strong>, postgres is <strong>2419</strong>.</td>
                  <td><code>--- view from the host: 9 processes, hostname laptop, kernel 6.8.0-45-generic ---</code></td></tr>
                <tr><td>inside web</td><td>Only 2 processes. The <em>same</em> nginx master is now <strong>PID 1</strong>. Own hostname, own IP, Debian files.</td>
                  <td><code>--- view from inside web: 2 processes, hostname 3f2a9c1b7d4e, kernel 6.8.0-45-generic ---</code></td></tr>
                <tr><td>inside db</td><td>Only postgres (PID 1) and its checkpointer. Alpine files, but…</td>
                  <td><code>… kernel 6.8.0-45-generic ---</code>: the kernel never changes</td></tr>
                <tr><td>Allocate +64 MB ×3 (limit 256m)</td><td>104 → 168 → 232 MiB. Bar turns red above 80% of the limit.</td>
                  <td><code>web  MEM 232MiB / 256MiB</code></td></tr>
                <tr><td>Allocate +64 MB (4th)</td><td>296 &gt; 256: the kernel kills nginx. State: <strong>Exited (137)</strong>.</td>
                  <td><code>kernel: Memory cgroup out of memory: Killed process 2318 (nginx)</code></td></tr>
                <tr><td>Reset</td><td>Back to 40 MiB, running</td><td><code>$ docker start web  →  web is running again (40MiB)</code></td></tr>
              </table>
            </details>
            <details>
              <summary>Key ideas explained ①②③</summary>
              <pre><code class="language-bash">docker run -d --name web \\
  --hostname web01 \\     # ① UTS namespace: own hostname
  -p 8080:80 \\           # ② net namespace: own IP; -p forwards a host port into it
  --memory 256m \\        # ③ cgroup: hard memory cap → OOM kill (exit 137) above it
  --cpus 0.5 \\           # ③ cgroup: at most half a CPU core of time
  nginx:1.27</code></pre>
              <ol>
                <li><strong>①</strong> The PID and UTS namespaces are why the container thinks it's alone: its main process is
                PID 1 and it has its own hostname (by default the short container ID).</li>
                <li><strong>②</strong> The network namespace gives the container its own <code>eth0</code> on a private bridge
                (172.17.x.x by default). Publishing a port is how the outside world gets in.</li>
                <li><strong>③</strong> cgroups don't hide anything, they <em>limit</em>. Exit code <strong>137</strong> =
                128 + 9 (SIGKILL). If you see 137 and the container was never stopped by hand, suspect the memory limit
                (<code>docker inspect</code> shows <code>"OOMKilled": true</code>).</li>
              </ol>
              <p>(The <code>#</code> comments after <code>\\</code> are for reading only. In a real shell, a comment after a
              line continuation breaks the command.)</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ul>
                <li>Switch the limit to <strong>no limit</strong> and keep allocating: web never gets killed. On a real host it
                would keep growing until the whole machine is short on memory.</li>
                <li>Switch to <strong>128m</strong>: the second click (40 → 104 → 168) already crosses the limit.</li>
                <li>Compare the three views: the <code>uname -r</code> line is identical everywhere. That's the shared kernel.</li>
              </ul>
            </details>
          `,
        },
        {
          title: 'See it on your machine',
          runnable: false,
          lang: 'bash',
          code: String.raw`# Inside a container, your process is PID 1 and the list is tiny
$ docker run --rm alpine ps
PID   USER     TIME  COMMAND
    1 root      0:00 ps

# Own hostname (defaults to the short container ID)
$ docker run --rm alpine hostname
5c7e0f1d2a3b

# Same kernel as the host (on Docker Desktop: the Linux VM's kernel)
$ uname -r
6.8.0-45-generic
$ docker run --rm alpine uname -r
6.8.0-45-generic

# cgroup limit: ask for more memory than allowed → OOM-killed, exit code 137
$ docker run --rm --memory 64m python:3.13-slim \
    python -c "x = bytearray(200 * 1024 * 1024)"
$ echo $?
137

# The container is a normal process on the host
$ docker run -d --name web nginx:1.27
$ docker top web
UID    PID     PPID    CMD
root   23184   23161   nginx: master process nginx -g daemon off;
101    23230   23184   nginx: worker process`,
        },
      ],
      quiz: [
        {
          q: 'What does a container share with the host that a VM does NOT?',
          options: ['The filesystem', 'The kernel', 'The hostname', 'The process list'],
          answer: 1,
          why: 'Containers are processes on the host kernel. Filesystem, hostname and process list are isolated by namespaces.',
        },
        {
          q: 'Which kernel feature lets you cap a container at 256 MB of RAM?',
          options: ['PID namespace', 'Mount namespace', 'cgroups', 'OCI image spec'],
          answer: 2,
          why: 'cgroups limit resources (memory, CPU, PIDs, I/O). Namespaces only control what a process can see.',
        },
        {
          q: 'Inside a container, <code>ps</code> shows your app as PID 1. On the host, the same process is PID 23184. Why?',
          options: [
            'Docker renumbers processes when you run ps',
            'The container runs a separate kernel with its own PIDs',
            'The PID namespace gives the container its own PID numbering',
            'PID 1 is reserved for containers',
          ],
          answer: 2,
          why: 'A PID namespace has its own numbering. The same process has one PID inside the namespace and another on the host.',
        },
        {
          q: 'A container keeps dying with exit code 137 even though nobody stopped it. The most likely cause?',
          options: [
            'A syntax error in the Dockerfile',
            'The image tag was wrong',
            'The container ran out of PIDs in its namespace',
            'It hit its memory limit and was OOM-killed (SIGKILL = 128 + 9)',
          ],
          answer: 3,
          why: '137 means SIGKILL. Without a manual docker kill, the usual culprit is the cgroup memory limit. docker inspect shows OOMKilled: true.',
        },
        {
          q: 'Why can an image built by Docker run on a Kubernetes cluster that uses containerd, not Docker?',
          options: [
            'Docker images follow the OCI image spec, which containerd understands',
            'Kubernetes still bundles Docker internally',
            'containerd converts Docker images to VMs',
            'It can’t: you must rebuild with a Kubernetes tool',
          ],
          answer: 0,
          why: 'Docker builds OCI images. Any OCI-compliant runtime (containerd, CRI-O, Podman) can run them.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `
          <p>Complete the <code>docker run</code> command in the box so it uses <strong>namespaces and cgroups</strong> on purpose:</p>
          <ul>
            <li>run <code>nginx:1.27</code> in the background, named <code>web</code></li>
            <li>limit it to <strong>256 MB</strong> of memory and <strong>half a CPU</strong></li>
            <li>give it its own hostname <code>web01</code></li>
          </ul>
          <p>Edit the command in the box below and click <strong>Check</strong>. Remember: all options go <em>before</em> the image name.</p>`,
        starter: checker(`# Run nginx:1.27 in the background as "web",
# limited to 256 MB of RAM and half a CPU,
# with its own hostname "web01".
docker run nginx:1.27`, RUN_LIMITS_RULES),
        hint: 'Flags: -d, --name, --memory (or -m), --cpus, --hostname (or -h). Anything after the image name is treated as the command to run inside the container.',
        solution: checker(`# Run nginx:1.27 in the background as "web",
# limited to 256 MB of RAM and half a CPU,
# with its own hostname "web01".
docker run -d --name web \\
  --memory 256m \\
  --cpus 0.5 \\
  --hostname web01 \\
  nginx:1.27`, RUN_LIMITS_RULES),
      },
    },

    // =========================================================================
    {
      id: 'images-vs-containers',
      section: 'Docker Foundations',
      title: 'Images vs containers',
      explain: `
        <p>People mix these two words up all the time, and it causes real bugs ("where did my data go?").</p>

        <h3>Class vs instance</h3>
        <p>An <strong>image</strong> is a read-only template: a stack of filesystem layers plus some metadata (default command,
        env vars, exposed ports). A <strong>container</strong> is a running (or stopped) <em>instance</em> of an image.
        Like a class and its objects: one image, many containers.</p>
        <p><strong>Analogy:</strong> the image is a cake recipe printed in a book. Every container is a cake made from it.
        Eating one cake doesn't change the recipe, and scribbling notes on your cake's box doesn't show up on anyone else's.</p>

        <h3>Layers: read-only below, writable on top</h3>
        <p>An image is a stack of read-only <strong>layers</strong>, each one a set of file changes. When you start a container,
        Docker adds one thin <strong>writable container layer</strong> on top. A union filesystem (usually <code>overlay2</code>)
        merges them so the process sees one normal-looking filesystem.</p>
        <ul>
          <li><strong>New file</strong> → written into the container's writable layer only.</li>
          <li><strong>Change an image file</strong> → <em>copy-on-write</em>: the file is copied up into the writable layer, then
            changed. The image layer underneath is untouched.</li>
          <li><strong>Delete an image file</strong> → a "whiteout" marker hides it. The bytes are still in the image layer.</li>
        </ul>
        <p>Because image layers are read-only, <strong>ten containers from one image share the same layers on disk</strong>.
        Each one only costs its own small writable layer.</p>

        <h3>The consequence: containers are disposable</h3>
        <p>The writable layer belongs to <em>one</em> container. <code>docker stop</code> keeps it (a stopped container still
        has its files). <code>docker rm</code> <strong>deletes it forever</strong>. That's by design: you should be able to throw a
        container away and start a fresh one from the image at any time.</p>

        <div class="warn"><strong>Pitfall:</strong> running a database in a container without a volume. Everything works until
        someone runs <code>docker rm</code> (or <code>docker compose down</code>), and the data is gone. Anything that must
        outlive the container goes in a <strong>volume</strong> (<code>-v pgdata:/var/lib/postgresql/data</code>), which lives
        outside the container's writable layer.</div>

        <div class="tip"><code>docker diff &lt;container&gt;</code> lists exactly what the container changed compared to its
        image: <code>A</code> = added, <code>C</code> = changed, <code>D</code> = deleted.</div>
      `,
      examples: [
        {
          title: 'One image, many containers, separate writable layers',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 10px; }
  button { padding: 4px 9px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; font-size: 12px; }
  button:hover { background: #eef2ff; }
  .wrap { display: flex; flex-direction: column; gap: 8px; }
  .ctrs { display: flex; gap: 8px; flex-wrap: wrap; min-height: 96px; }
  .ctr { background: #fff; border: 2px solid #dde2ea; border-radius: 8px; padding: 6px 8px; width: 150px; cursor: pointer; }
  .ctr.sel { border-color: #4f46e5; box-shadow: 0 0 0 2px #c7d2fe; }
  .ctr h5 { margin: 0 0 4px; font-size: 12.5px; }
  .wl { background: #fef9c3; border: 1px dashed #ca8a04; border-radius: 4px; padding: 3px 5px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; min-height: 30px; }
  .empty { color: #9ca3af; }
  .image { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; }
  .layer { background: #e0e7ff; border-radius: 4px; padding: 3px 6px; margin-top: 3px; font-family: ui-monospace, Menlo, monospace; font-size: 11px; }
  .hint { color: #6b7280; font-size: 12px; }
</style>

<div class="bar">
  <button id="run">docker run</button>
  <button id="write">write /data/notes.txt</button>
  <button id="edit">edit /app/config.json</button>
  <button id="cat">cat notes in every container</button>
  <button id="diff">docker diff</button>
  <button id="rm">docker rm -f</button>
  <button id="reset">Reset</button>
</div>

<div class="wrap">
  <div class="ctrs" id="ctrs"></div>
  <div class="hint" id="hint"></div>
  <div class="image">
    <b>Image myapp:1.0</b> (read-only, stored once, shared by all containers)
    <div class="layer">layer 3 · /app/server.js, /app/config.json · 12 KB</div>
    <div class="layer">layer 2 · node runtime /usr/local/bin/node · 140 MB</div>
    <div class="layer">layer 1 · debian:bookworm-slim base /bin /etc /usr · 74 MB</div>
  </div>
</div>

<script>
  var ctrs = [];
  var nextId = 1;
  var selected = null;

  function find(name) {
    for (var i = 0; i < ctrs.length; i++) if (ctrs[i].name === name) return ctrs[i];
    return null;
  }

  function render() {
    var html = '';
    ctrs.forEach(function (c) {
      var files = c.files.length
        ? c.files.map(function (f) { return f.op + ' ' + f.path; }).join('<br>')
        : '<span class="empty">(empty)</span>';
      html += '<div class="ctr' + (c.name === selected ? ' sel' : '') + '" data-name="' + c.name + '">' +
        '<h5>' + c.name + '</h5><div class="wl">' + files + '</div></div>';
    });
    if (!ctrs.length) html = '<span class="empty">No containers. Click "docker run".</span>';
    document.getElementById('ctrs').innerHTML = html;
    document.getElementById('hint').textContent = selected
      ? 'Selected: ' + selected + ' (click a container to select it). Yellow box = its writable layer.'
      : '';
    var cards = document.querySelectorAll('.ctr');
    for (var i = 0; i < cards.length; i++) {
      cards[i].onclick = function () { selected = this.getAttribute('data-name'); render(); };
    }
  }

  function need() {
    var c = find(selected);
    if (!c) console.log('No container selected. Click "docker run" first.');
    return c;
  }

  document.getElementById('run').onclick = function () {
    if (ctrs.length >= 4) { console.log('max 4 containers in this demo'); return; }
    var name = 'c' + nextId++;
    ctrs.push({ name: name, files: [] });
    selected = name;
    console.log('$ docker run -d --name ' + name + ' myapp:1.0');
    console.log(name + ': new EMPTY writable layer on top of the 3 shared image layers');
    render();
  };

  document.getElementById('write').onclick = function () {
    var c = need();
    if (!c) return;
    console.log('$ docker exec ' + c.name + " sh -c 'echo hello > /data/notes.txt'");
    if (!c.files.some(function (f) { return f.path === '/data/notes.txt'; })) {
      c.files.push({ op: 'A', path: '/data/notes.txt' });
    }
    console.log('written to ' + c.name + "'s writable layer only");
    render();
  };

  document.getElementById('edit').onclick = function () {
    var c = need();
    if (!c) return;
    console.log('$ docker exec ' + c.name + " sh -c 'echo {\"debug\":true} > /app/config.json'");
    if (!c.files.some(function (f) { return f.path === '/app/config.json'; })) {
      c.files.push({ op: 'C', path: '/app/config.json' });
    }
    console.log('copy-on-write: /app/config.json copied up from image layer 3 into ' + c.name +
      ', then changed. Image unchanged.');
    render();
  };

  document.getElementById('cat').onclick = function () {
    if (!ctrs.length) { console.log('No containers.'); return; }
    ctrs.forEach(function (c) {
      console.log('$ docker exec ' + c.name + ' cat /data/notes.txt');
      var has = c.files.some(function (f) { return f.path === '/data/notes.txt'; });
      console.log(has ? 'hello' : 'cat: /data/notes.txt: No such file or directory');
    });
  };

  document.getElementById('diff').onclick = function () {
    var c = need();
    if (!c) return;
    console.log('$ docker diff ' + c.name);
    if (!c.files.length) console.log('(no output: nothing changed yet)');
    var dirs = {};
    c.files.forEach(function (f) {
      var dir = f.path.split('/').slice(0, 2).join('/');
      if (!dirs[dir]) { console.log(f.op + ' ' + dir); dirs[dir] = 1; }
      console.log(f.op + ' ' + f.path);
    });
  };

  document.getElementById('rm').onclick = function () {
    var c = need();
    if (!c) return;
    console.log('$ docker rm -f ' + c.name);
    console.log(c.name);
    var lost = c.files.map(function (f) { return f.path; });
    console.log(lost.length
      ? 'writable layer deleted: ' + lost.join(', ') + ' gone forever'
      : 'writable layer deleted (it was empty)');
    ctrs = ctrs.filter(function (x) { return x !== c; });
    selected = ctrs.length ? ctrs[ctrs.length - 1].name : null;
    render();
  };

  document.getElementById('reset').onclick = function () {
    ctrs = [];
    nextId = 1;
    selected = null;
    console.log('--- reset ---');
    render();
  };

  render();
</script>`,
          explain: `
            <details>
              <summary>The problem: "I saved a file in my container and now it's gone"</summary>
              <p>You <code>docker exec</code> into a container, create a file, then later recreate the container (new image
              version, <code>docker compose up</code> after a config change, <code>docker rm</code>…). The file is gone. Or you
              start a second copy of the app and it can't see the first one's files.</p>
              <p>Both surprises come from one fact: every container has its <strong>own private writable layer</strong>, and it
              is deleted together with the container.</p>
            </details>
            <details>
              <summary>Step by step: run, run, write, cat, rm, run, cat</summary>
              <table>
                <tr><th>Click</th><th>State</th><th>Console</th></tr>
                <tr><td>docker run</td><td>c1 with an empty writable layer</td>
                  <td><code>$ docker run -d --name c1 myapp:1.0</code><br><code>c1: new EMPTY writable layer on top of the 3 shared image layers</code></td></tr>
                <tr><td>docker run</td><td>c2, also empty. Image still stored once.</td><td><code>$ docker run -d --name c2 myapp:1.0</code></td></tr>
                <tr><td>click c1, write /data/notes.txt</td><td>c1: <code>A /data/notes.txt</code></td>
                  <td><code>written to c1's writable layer only</code></td></tr>
                <tr><td>cat notes in every container</td><td>no change</td>
                  <td><code>$ docker exec c1 cat /data/notes.txt</code> → <code>hello</code><br>
                  <code>$ docker exec c2 cat /data/notes.txt</code> → <code>cat: /data/notes.txt: No such file or directory</code></td></tr>
                <tr><td>(c1 selected) docker rm -f</td><td>c1 and its layer gone</td>
                  <td><code>writable layer deleted: /data/notes.txt gone forever</code></td></tr>
                <tr><td>docker run</td><td>c3, empty. It's a fresh copy of the image, <em>not</em> of c1.</td>
                  <td><code>$ docker run -d --name c3 myapp:1.0</code></td></tr>
                <tr><td>cat notes in every container</td><td></td>
                  <td>both c2 and c3 → <code>No such file or directory</code></td></tr>
              </table>
            </details>
            <details>
              <summary>Copy-on-write: what "edit /app/config.json" shows</summary>
              <p><code>/app/config.json</code> lives in <strong>image layer 3</strong>, which is read-only. When a container
              writes to it, overlay2 first <em>copies the file up</em> into that container's writable layer and changes the copy.
              The yellow box shows <code>C /app/config.json</code>, and <code>docker diff</code> prints:</p>
              <pre><code class="language-bash">$ docker diff c1
C /app
C /app/config.json</code></pre>
              <p>Other containers still see the original file from the image. The image itself never changes. The only ways
              to change an image are to build a new one (or <code>docker commit</code>, which you should avoid because nobody
              can reproduce it).</p>
              <div class="tip">Copy-up happens per <em>whole file</em>. Appending one line to a 2 GB file inside a container copies
              2 GB into the writable layer first. Write-heavy data (databases, logs) belongs in volumes for performance too.</div>
            </details>
            <details>
              <summary>Common mistake: <code>docker stop</code> vs <code>docker rm</code></summary>
              <div class="warn"><code>docker stop</code> only stops the process. The container and its writable layer still exist
              (<code>docker ps -a</code> lists it), and <code>docker start</code> brings it back with its files. It's
              <code>docker rm</code> (also <code>--rm</code>, <code>docker compose down</code>) that throws the layer away.
              Either way, don't rely on it: use a volume for data you care about.</div>
            </details>
          `,
        },
        {
          title: 'Prove it on your machine',
          runnable: false,
          lang: 'bash',
          code: String.raw`# One image...
$ docker pull nginx:1.27
$ docker image inspect nginx:1.27 --format '{{len .RootFS.Layers}} layers'
7 layers

# ...two containers
$ docker run -d --name a nginx:1.27
$ docker run -d --name b nginx:1.27

# Write a file in "a" only
$ docker exec a sh -c 'echo hello > /tmp/notes.txt'
$ docker exec b cat /tmp/notes.txt
cat: /tmp/notes.txt: No such file or directory

# What did "a" change compared to the image?
$ docker diff a
C /tmp
A /tmp/notes.txt
C /var/cache/nginx
...

# SIZE = writable layer; "virtual" = writable layer + shared image layers
$ docker ps -s --format 'table {{.Names}}\t{{.Size}}'
NAMES     SIZE
b         1.09kB (virtual 192MB)
a         1.1kB (virtual 192MB)

# Remove "a" and start a new one: the file is gone
$ docker rm -f a
$ docker run -d --name a nginx:1.27
$ docker exec a cat /tmp/notes.txt
cat: /tmp/notes.txt: No such file or directory`,
        },
      ],
      quiz: [
        {
          q: 'You start 5 containers from a 200 MB image. Roughly how much disk do the image layers use?',
          options: ['1 GB (5 × 200 MB)', '200 MB, shared by all 5, plus a small writable layer each', '0 MB, images live in the registry', '40 MB each'],
          answer: 1,
          why: 'Image layers are read-only and shared. Each container only adds its own (usually small) writable layer.',
        },
        {
          q: 'A container modifies <code>/etc/nginx/nginx.conf</code>, which came from the image. What happens?',
          options: [
            'The image layer is modified in place',
            'The write fails because image layers are read-only',
            'The file is copied up into the container’s writable layer and changed there',
            'All containers from that image see the change',
          ],
          answer: 2,
          why: 'Copy-on-write: the file is copied up into the writable layer. The image and other containers are unaffected.',
        },
        {
          q: 'Which command permanently deletes a container’s writable layer?',
          options: ['docker stop', 'docker kill', 'docker rm', 'docker pause'],
          answer: 2,
          why: 'stop, kill and pause leave the container (and its files) in place. rm removes it together with its writable layer.',
        },
        {
          q: 'Where should a Postgres container keep its data so it survives <code>docker rm</code>?',
          options: [
            'In the writable layer',
            'In the image, via docker commit',
            'In /tmp',
            'In a volume mounted at the data directory',
          ],
          answer: 3,
          why: 'Volumes live outside the container’s writable layer and are not deleted with the container.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `
          <p>This script loses the note, because the file lives in the container's writable layer and
          <code>docker rm -f</code> deletes it. Fix <strong>both</strong> <code>docker run</code> lines so <code>/data</code> is
          backed by the same <strong>named volume</strong> (for example <code>notes</code>). Then the final <code>cat</code> would
          print <code>hello</code>. Edit the script in the box below and click <strong>Check</strong>.</p>`,
        starter: checker(`docker run -d --name notes-app myapp:1.0
docker exec notes-app sh -c 'echo hello > /data/notes.txt'
docker rm -f notes-app

docker run -d --name notes-app myapp:1.0
docker exec notes-app cat /data/notes.txt`, VOLUME_RULES),
        hint: 'Add -v notes:/data (volume name, colon, path inside the container) before the image name on both run lines. A name without a leading / or . is a named volume, not a host path.',
        solution: checker(`docker run -d --name notes-app -v notes:/data myapp:1.0
docker exec notes-app sh -c 'echo hello > /data/notes.txt'
docker rm -f notes-app

docker run -d --name notes-app -v notes:/data myapp:1.0
docker exec notes-app cat /data/notes.txt`, VOLUME_RULES),
      },
    },

    // =========================================================================
    {
      id: 'docker-architecture',
      section: 'Docker Foundations',
      title: 'How Docker works under the hood',
      explain: `
        <p>"Docker" is really a chain of programs, each with one job. Knowing the chain makes error messages make sense
        ("Cannot connect to the Docker daemon…") and explains how Kubernetes can run containers without Docker at all.</p>

        <h3>The chain</h3>
        <ol>
          <li><strong>docker CLI</strong>: the <code>docker</code> command. It is only an <em>API client</em>. It turns
            <code>docker run …</code> into HTTP calls to the daemon over a Unix socket (<code>/var/run/docker.sock</code>).</li>
          <li><strong>dockerd</strong> (the Docker daemon / Docker Engine): owns the Docker API. It handles images, builds (via
            BuildKit), networks, volumes and container config.</li>
          <li><strong>containerd</strong>: a lower-level daemon that manages container lifecycles (and, with the
            containerd image store, image content too). Kubernetes nodes usually talk to containerd directly.</li>
          <li><strong>containerd-shim-runc-v2</strong>: a tiny per-container parent process. It keeps the container's stdio and
            exit code, so dockerd or containerd can restart without killing your containers.</li>
          <li><strong>runc</strong>: the OCI runtime. It reads an OCI bundle (a <code>config.json</code> + root filesystem), sets up
            namespaces and cgroups, starts your process… and then <em>exits</em>.</li>
        </ol>
        <p>A <strong>registry</strong> (Docker Hub, GHCR, ECR…) sits outside the chain and stores images. Images are pulled from it
        by digest, layer by layer.</p>

        <pre><code class="language-bash">docker CLI ──REST over /var/run/docker.sock──▶ dockerd ──gRPC──▶ containerd
                                                  │                     │
                                     pulls from registry        containerd-shim-runc-v2
                                                                        │
                                                                      runc ──▶ your process (PID 1)</code></pre>

        <div class="tip"><strong>Why it matters:</strong> since the CLI is just a client, it can talk to a remote daemon
        (<code>DOCKER_HOST=ssh://me@server</code> or <code>docker context use</code>). And "Cannot connect to the Docker daemon"
        means the <em>daemon</em> isn't running or you can't reach its socket. Your command itself is probably fine.</div>

        <div class="warn"><strong>Security:</strong> access to <code>/var/run/docker.sock</code> is effectively root on the host,
        because anyone who can call the API can start a privileged container that mounts <code>/</code>. Think twice before
        mounting the socket into a container.</div>

        <p>Recent change: Docker Engine 29 uses the <strong>containerd image store</strong> by default on <em>new</em> installs
        (older installs keep the classic overlay2 store until you switch). You don't need to do anything about it. It just means
        even more of the work in the diagram is done by containerd.</p>
      `,
      examples: [
        {
          title: 'Step through `docker run -d nginx`',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  .bar { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
  button { padding: 5px 10px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; }
  button.primary { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  .diagram { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; align-items: center; }
  .node { background: #fff; border: 2px solid #dde2ea; border-radius: 8px; padding: 6px 4px; text-align: center; font-size: 11.5px;
    transition: all .25s; min-height: 34px; display: flex; align-items: center; justify-content: center; }
  .node.active { border-color: #4f46e5; background: #eef2ff; box-shadow: 0 0 0 3px #c7d2fe; font-weight: 700; }
  .node.done { border-color: #16a34a; }
  .node.gone { opacity: .45; border-style: dashed; }
  .top { grid-column: 2 / span 1; }
  .bottom { grid-column: 2 / span 1; }
  .msg { margin-top: 10px; background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 8px 10px; min-height: 64px; }
  .msg b { display: block; margin-bottom: 3px; }
  .step { color: #6b7280; font-size: 12px; }
</style>

<div class="bar">
  <button id="step" class="primary">Step ▶</button>
  <button id="all">Run all</button>
  <button id="reset">Reset</button>
  <label><input type="checkbox" id="cached"> nginx:latest already in local image store</label>
</div>

<div class="diagram">
  <div></div>
  <div class="node top" id="n-registry">Registry<br>(Docker Hub)</div>
  <div></div><div></div><div></div><div></div>
  <div class="node" id="n-cli">docker CLI</div>
  <div class="node" id="n-dockerd">dockerd</div>
  <div class="node" id="n-containerd">containerd</div>
  <div class="node" id="n-shim">shim</div>
  <div class="node" id="n-runc">runc</div>
  <div class="node" id="n-ctr">nginx<br>container</div>
  <div></div>
  <div class="node bottom" id="n-store">local image<br>store</div>
</div>

<div class="msg" id="msg"><b>Ready.</b>Click "Step ▶" to send <code>docker run -d nginx</code> through the stack.</div>
<div class="step" id="count"></div>

<script>
  var ID = '3f2a9c1b7d4e5a6f8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a';
  var STEPS_PULL = [
    { title: '1. CLI → dockerd: create container', nodes: ['cli', 'dockerd'],
      text: 'The CLI is just an API client. It sends POST /containers/create to dockerd over /var/run/docker.sock.',
      log: ['$ docker run -d nginx', '→ POST /containers/create {"Image":"nginx"}'] },
    { title: '2. dockerd: image not found locally', nodes: ['dockerd', 'store'],
      text: 'dockerd looks in the local image store for nginx:latest. Not there, so it answers 404.',
      log: ['← 404 No such image: nginx:latest', "Unable to find image 'nginx:latest' locally"] },
    { title: '3. Pull: resolve the tag at the registry', nodes: ['cli', 'dockerd', 'registry'],
      text: 'The CLI asks dockerd to pull (POST /images/create). dockerd asks registry-1.docker.io which manifest the tag "latest" points to, for your CPU architecture.',
      log: ['→ POST /images/create?fromImage=nginx&tag=latest', 'latest: Pulling from library/nginx'] },
    { title: '4. Pull: download and unpack layers', nodes: ['registry', 'dockerd', 'store'],
      text: 'Layers are downloaded in parallel, their sha256 checked, then unpacked into the local image store.',
      log: ['a2318d6c47ec: Pull complete', 'e0a2d3f5a1b7: Pull complete', '4f1c9d2e8b6a: Pull complete',
        'Digest: sha256:9f2e6ba1...c41d', 'Status: Downloaded newer image for nginx:latest'] },
    { title: '5. Create: container config + writable layer', nodes: ['cli', 'dockerd', 'store'],
      text: 'The CLI retries create. dockerd writes the container config, prepares a writable layer on top of the image layers and a network endpoint. Nothing is running yet.',
      log: ['→ POST /containers/create {"Image":"nginx"}', '← 201 Created {"Id":"3f2a9c1b7d4e..."}'] },
    { title: '6. Start: dockerd → containerd', nodes: ['cli', 'dockerd', 'containerd'],
      text: 'The CLI calls POST /containers/{id}/start. dockerd asks containerd, over gRPC, to create and start a task.',
      log: ['→ POST /containers/3f2a9c1b7d4e/start', 'dockerd → containerd: create + start task (gRPC)'] },
    { title: '7. containerd → shim → runc', nodes: ['containerd', 'shim', 'runc'],
      text: 'containerd launches containerd-shim-runc-v2. The shim runs runc with an OCI bundle (config.json + rootfs). runc creates the namespaces and cgroups, mounts the rootfs, then execs the entrypoint.',
      log: ['runc: namespaces + cgroups ready', 'runc: exec /docker-entrypoint.sh nginx -g "daemon off;" as PID 1'] },
    { title: '8. Running: runc exits, shim stays', nodes: ['shim', 'ctr'], gone: ['runc'],
      text: 'runc has done its job and exits. The shim stays as the container\'s parent (holds stdio, reports the exit code). With -d the CLI prints the full container ID and returns.',
      log: [ID] },
  ];

  var STEPS_CACHED = [
    STEPS_PULL[0],
    { title: '2. dockerd: image found, container created', nodes: ['dockerd', 'store'],
      text: 'nginx:latest is already in the local image store, so dockerd creates the container straight away: config, writable layer, network endpoint. No registry involved.',
      log: ['← 201 Created {"Id":"3f2a9c1b7d4e..."}'] },
    STEPS_PULL[5], STEPS_PULL[6], STEPS_PULL[7],
  ];
  // Renumber the cached path
  var steps, i;

  function allNodes() { return document.querySelectorAll('.node'); }

  function reset() {
    var cached = document.getElementById('cached').checked;
    steps = cached ? STEPS_CACHED : STEPS_PULL;
    i = 0;
    var ns = allNodes();
    for (var k = 0; k < ns.length; k++) ns[k].className = ns[k].className.replace(/ (active|done|gone)/g, '');
    document.getElementById('msg').innerHTML =
      '<b>Ready.</b>Click "Step ▶" to send <code>docker run -d nginx</code> through the stack' +
      (cached ? ' (image cached: no pull).' : ' (image NOT cached: will pull).');
    document.getElementById('count').textContent = '0 / ' + steps.length + ' steps';
  }

  function step() {
    if (i >= steps.length) {
      console.log('(done: click Reset to run it again)');
      return;
    }
    var s = steps[i];
    var ns = allNodes();
    for (var k = 0; k < ns.length; k++) {
      if (/ active/.test(ns[k].className)) ns[k].className = ns[k].className.replace(' active', '') + ' done';
    }
    s.nodes.forEach(function (n) {
      var el = document.getElementById('n-' + n);
      el.className = el.className.replace(/ (done|gone)/g, '') + ' active';
    });
    (s.gone || []).forEach(function (n) {
      var el = document.getElementById('n-' + n);
      el.className = el.className.replace(/ (active|done)/g, '') + ' gone';
    });
    var num = i + 1;
    var title = s.title.replace(/^[0-9]+\./, num + '.');
    document.getElementById('msg').innerHTML = '<b>' + title + '</b>' + s.text;
    console.log('— ' + title + ' —');
    s.log.forEach(function (l) { console.log(l); });
    i++;
    document.getElementById('count').textContent = i + ' / ' + steps.length + ' steps';
  }

  document.getElementById('step').onclick = step;
  document.getElementById('all').onclick = function () {
    while (i < steps.length) step();
  };
  document.getElementById('reset').onclick = function () {
    reset();
    console.log('--- reset ---');
  };
  document.getElementById('cached').onchange = reset;

  reset();
</script>`,
          explain: `
            <details>
              <summary>Step by step: the uncached path (checkbox off)</summary>
              <table>
                <tr><th>Step</th><th>Who</th><th>Console</th></tr>
                <tr><td>1. CLI → dockerd: create container</td><td>docker CLI, dockerd</td><td><code>→ POST /containers/create {"Image":"nginx"}</code></td></tr>
                <tr><td>2. dockerd: image not found locally</td><td>dockerd, local store</td><td><code>Unable to find image 'nginx:latest' locally</code></td></tr>
                <tr><td>3. Pull: resolve the tag at the registry</td><td>CLI, dockerd, registry</td><td><code>latest: Pulling from library/nginx</code></td></tr>
                <tr><td>4. Pull: download and unpack layers</td><td>registry, dockerd, store</td><td><code>… Pull complete</code> ×3, <code>Digest: sha256:…</code>, <code>Status: Downloaded newer image for nginx:latest</code></td></tr>
                <tr><td>5. Create: container config + writable layer</td><td>CLI, dockerd, store</td><td><code>← 201 Created {"Id":"3f2a9c1b7d4e..."}</code></td></tr>
                <tr><td>6. Start: dockerd → containerd</td><td>CLI, dockerd, containerd</td><td><code>dockerd → containerd: create + start task (gRPC)</code></td></tr>
                <tr><td>7. containerd → shim → runc</td><td>containerd, shim, runc</td><td><code>runc: exec /docker-entrypoint.sh nginx -g "daemon off;" as PID 1</code></td></tr>
                <tr><td>8. Running: runc exits, shim stays</td><td>shim, container (runc greyed out)</td><td>the 64-character container ID</td></tr>
              </table>
              <p>Tick <strong>nginx:latest already in local image store</strong> and the pull steps disappear. You get 5 steps,
              and step 2 becomes "image found, container created". That's why the second <code>docker run nginx</code> starts
              almost instantly.</p>
            </details>
            <details>
              <summary>Key details that surprise people</summary>
              <ol>
                <li><strong>The CLI does the pull dance.</strong> "Unable to find image … locally" is printed by the CLI after
                the daemon answered 404. Then it asks for a pull and retries the create.</li>
                <li><strong><code>docker run</code> = create + start.</strong> You can do them separately
                (<code>docker create</code>, then <code>docker start</code>). A "Created" container in <code>docker ps -a</code>
                has a config and writable layer but has never run.</li>
                <li><strong>runc doesn't stay around.</strong> It sets things up and exits. The shim keeps the container alive
                independently of dockerd. With <code>"live-restore": true</code> in the daemon config, containers even survive
                a dockerd restart.</li>
                <li><strong>Tags resolve to digests.</strong> "latest" is looked up at pull time and pinned to a
                <code>sha256:</code> digest locally. More on that in <em>Tags, digests &amp; registries</em>.</li>
              </ol>
            </details>
          `,
        },
        {
          title: 'Peek at the pieces on your machine',
          runnable: false,
          lang: 'bash',
          code: String.raw`# Client and server are separate programs with separate versions
$ docker version
Client:
 Version:           28.5.1
 API version:       1.51
Server: Docker Engine - Community
 Engine:
  Version:          28.5.1
 containerd:
  Version:          v1.7.28
 runc:
  Version:          1.3.0
...

# The CLI is "just" an HTTP client. You can call the same API with curl:
$ curl -s --unix-socket /var/run/docker.sock http://localhost/containers/json | head -c 120
[{"Id":"3f2a9c1b7d4e...","Names":["/web"],"Image":"nginx:1.27","State":"running",...

# The processes behind a running container
$ ps -ef | grep -E 'containerd-shim|nginx: master' | grep -v grep
root  23161     1  containerd-shim-runc-v2 -namespace moby -id 3f2a9c1b7d4e...
root  23184 23161  nginx: master process nginx -g daemon off;

# Point the CLI at another daemon
$ docker context ls
$ DOCKER_HOST=ssh://me@build-server docker ps`,
          note: 'Reference session. Versions shown are examples; yours will differ.',
        },
      ],
      quiz: [
        {
          q: 'You get <code>Cannot connect to the Docker daemon at unix:///var/run/docker.sock</code>. What’s wrong?',
          options: [
            'The image name is misspelled',
            'dockerd isn’t running, or your user can’t access its socket',
            'runc is missing',
            'The registry is down',
          ],
          answer: 1,
          why: 'The CLI is only a client. This error means it can’t reach the daemon’s API socket.',
        },
        {
          q: 'Which component actually creates the namespaces and cgroups for a container?',
          options: ['docker CLI', 'dockerd', 'runc', 'The registry'],
          answer: 2,
          why: 'runc is the OCI runtime. It sets up namespaces and cgroups, starts the process, then exits.',
        },
        {
          q: 'What keeps a container running after runc exits?',
          options: [
            'The containerd-shim-runc-v2 process, which stays as its parent',
            'The docker CLI process',
            'The registry connection',
            'Nothing. runc never exits.',
          ],
          answer: 0,
          why: 'The shim is the container’s parent. It holds stdio and reports the exit status, independent of dockerd.',
        },
        {
          q: 'What does <code>docker run</code> do, in terms of API calls?',
          options: [
            'Only start',
            'Build, then start',
            'Pull, then exec',
            'Create (pulling first if the image is missing), then start',
          ],
          answer: 3,
          why: 'docker run = docker create + docker start. If create returns “No such image”, the CLI pulls and retries.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>After each <code>=</code>, write which component does the job:
          <code>docker CLI</code>, <code>dockerd</code>, <code>containerd</code>, <code>runc</code> or <code>registry</code>.
          Edit the lines in the box below, then click <strong>Check</strong>.</p>`,
        starter: checker(`# After each "=", write which component does the job:
# docker CLI, dockerd, containerd, runc, or registry

1. turns "docker run" into REST API calls          =
2. stores images and serves them over HTTPS        =
3. owns the API; handles builds, networks, volumes =
4. supervises container lifecycle via shims        =
5. creates namespaces + cgroups, then exits        =`, ARCH_RULES),
        hint: 'Follow the chain from the top: CLI → dockerd → containerd → (shim) → runc. The registry is outside the chain.',
        solution: checker(`# After each "=", write which component does the job:
# docker CLI, dockerd, containerd, runc, or registry

1. turns "docker run" into REST API calls          = docker CLI
2. stores images and serves them over HTTPS        = registry
3. owns the API; handles builds, networks, volumes = dockerd
4. supervises container lifecycle via shims        = containerd
5. creates namespaces + cgroups, then exits        = runc`, ARCH_RULES),
      },
    },

    // =========================================================================
    {
      id: 'docker-refresher',
      section: 'Docker Foundations',
      title: 'Command refresher',
      explain: `
        <p>A quick tour of the commands you'll use every day, with the flags that trip people up.</p>

        <h3>Starting containers</h3>
        <pre><code class="language-bash">docker run nginx                     # foreground: your terminal is attached to its output
docker run -d nginx                  # detached: runs in the background, prints the ID
docker run -d --name web -p 8080:80 nginx   # name it; host port 8080 → container port 80
docker run -it --rm alpine sh        # interactive shell; --rm deletes the container on exit
docker run --rm alpine echo hi       # one-off command, then clean up</code></pre>
        <ul>
          <li><code>-i</code> keeps stdin open, <code>-t</code> gives it a terminal. Together (<code>-it</code>) you get a usable shell.</li>
          <li><code>--rm</code> removes the container (and its writable layer) as soon as it exits.</li>
          <li>Everything <strong>after</strong> the image name is the command to run inside, replacing the image's default <code>CMD</code>.</li>
        </ul>

        <h3>Looking around</h3>
        <pre><code class="language-bash">docker ps            # running containers
docker ps -a         # ALL containers, including exited ones
docker logs web      # stdout/stderr of the main process
docker logs -f web   # follow (like tail -f). Ctrl+C stops following, not the container
docker exec -it web sh   # run an extra process inside a RUNNING container
docker images        # local images (same as docker image ls)</code></pre>

        <h3>Stopping and cleaning up</h3>
        <ul>
          <li><code>docker stop web</code>: sends <strong>SIGTERM</strong>, waits up to 10 s for a clean shutdown, then SIGKILL.</li>
          <li><code>docker kill web</code>: sends <strong>SIGKILL</strong> immediately. No cleanup, exit code 137.</li>
          <li><code>docker rm web</code>: deletes a stopped container. <code>docker rm -f</code> kills and deletes in one go.</li>
          <li><code>docker pull nginx:1.27</code>: download an image without running it.</li>
        </ul>

        <div class="warn"><strong>"My container exits immediately!"</strong> A container lives exactly as long as its main process
        (PID 1). <code>docker run -d alpine</code> starts <code>sh</code>, which has no terminal and no script, so it exits
        straight away. That's not a bug. Give it a long-running command, or use <code>-it</code> for a shell.</div>

        <div class="tip">Most commands also have a longer "management command" form: <code>docker container ls</code>,
        <code>docker container rm</code>, <code>docker image ls</code>. Same thing, more consistent naming.</div>
      `,
      examples: [
        {
          title: 'Fake terminal: try the commands',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .quick { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px; }
  .quick button { font-family: ui-monospace, Menlo, monospace; font-size: 11px; padding: 3px 6px; border: 1px solid #c7cdd8;
    border-radius: 5px; background: #fff; color: #1f2937; cursor: pointer; }
  .quick button:hover { background: #eef2ff; }
  #term { background: #0f172a; color: #e2e8f0; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; height: 170px;
    overflow-y: auto; padding: 6px 8px; border-radius: 6px 6px 0 0; white-space: pre-wrap; }
  #term .cmd { color: #93c5fd; }
  #term .err { color: #fca5a5; }
  #term .note { color: #fcd34d; }
  .inrow { display: flex; background: #1e293b; border-radius: 0 0 6px 6px; padding: 4px 8px; }
  .inrow span { color: #93c5fd; font-family: ui-monospace, Menlo, monospace; margin-right: 6px; }
  #in { flex: 1; background: transparent; border: 0; color: #f8fafc; font-family: ui-monospace, Menlo, monospace; font-size: 12px; outline: none; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; background: #fff; font-size: 11.5px; font-family: ui-monospace, Menlo, monospace; }
  th, td { text-align: left; padding: 3px 6px; border-bottom: 1px solid #eef0f4; }
  th { background: #eef2f7; }
  .up { color: #15803d; font-weight: 700; }
  .ex { color: #b91c1c; }
  .cr { color: #92400e; }
</style>

<div class="quick" id="quick"></div>
<div id="term"></div>
<div class="inrow"><span>$</span><input id="in" placeholder="type a docker command and press Enter (try: help)" autocomplete="off"></div>
<table id="tbl"></table>

<script>
  var QUICK = [
    'docker run -d --name web -p 8080:80 nginx', 'docker ps', 'docker ps -a', 'docker logs web',
    'docker exec -it web sh', 'docker stop web', 'docker start web', 'docker kill web', 'docker rm web',
    'docker run --rm alpine echo hi', 'docker run -d alpine', 'docker run -it --rm alpine',
    'docker run -d --name nap alpine sleep 3600', 'docker stop nap', 'docker images', 'docker pull redis:7',
  ];
  var REGISTRY = {
    nginx: { size: '192MB', kind: 'server', cmd: '"/docker-entrypoint.…"' },
    alpine: { size: '7.8MB', kind: 'shell', cmd: '"/bin/sh"' },
    busybox: { size: '4.3MB', kind: 'shell', cmd: '"sh"' },
    redis: { size: '117MB', kind: 'server', cmd: '"docker-entrypoint.s…"' },
    postgres: { size: '438MB', kind: 'postgres', cmd: '"docker-entrypoint.s…"' },
    node: { size: '1.12GB', kind: 'node', cmd: '"docker-entrypoint.s…"' },
    'hello-world': { size: '10.1kB', kind: 'hello', cmd: '"/hello"' },
  };
  var images = [{ repo: 'alpine', tag: 'latest', id: hex(12), created: '2 weeks ago' }];
  var ctrs = [];
  var hist = [];
  var hIdx = 0;
  var ADJ = ['eager', 'quirky', 'brave', 'jolly', 'sleepy', 'zen', 'vibrant', 'focused'];
  var SCI = ['turing', 'hopper', 'lovelace', 'curie', 'tesla', 'noether', 'darwin', 'bohr'];

  function hex(n) {
    var s = '';
    for (var k = 0; k < n; k++) s += '0123456789abcdef'.charAt(Math.floor(Math.random() * 16));
    return s;
  }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function print(text, cls) {
    var t = document.getElementById('term');
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    t.appendChild(d);
    t.scrollTop = t.scrollHeight;
    console.log(text);
  }
  function pad(s, n) { s = String(s); while (s.length < n) s += ' '; return s; }
  function ago(ms) {
    var s = Math.max(1, Math.round((Date.now() - ms) / 1000));
    if (s < 60) return s === 1 ? 'Less than a second' : s + ' seconds';
    return Math.round(s / 60) + ' minutes';
  }
  function parseRef(ref) {
    var parts = ref.split(':');
    return { repo: parts[0], tag: parts[1] || 'latest' };
  }
  function findImage(ref) {
    var r = parseRef(ref);
    for (var k = 0; k < images.length; k++) if (images[k].repo === r.repo && images[k].tag === r.tag) return images[k];
    return null;
  }
  function findCtr(key) {
    for (var k = 0; k < ctrs.length; k++) {
      if (ctrs[k].name === key || ctrs[k].id.indexOf(key) === 0) return ctrs[k];
    }
    return null;
  }
  function statusText(c) {
    if (c.status === 'running') return 'Up ' + ago(c.startedAt);
    if (c.status === 'created') return 'Created';
    return 'Exited (' + c.exitCode + ') ' + ago(c.finishedAt) + ' ago';
  }

  function pull(ref, quiet) {
    var r = parseRef(ref);
    if (!REGISTRY[r.repo]) {
      print('Error response from daemon: pull access denied for ' + r.repo +
        ", repository does not exist or may require 'docker login'", 'err');
      return null;
    }
    var existing = findImage(ref);
    if (existing && !quiet) {
      print(r.tag + ': Pulling from library/' + r.repo);
      print('Digest: sha256:' + hex(64));
      print('Status: Image is up to date for ' + r.repo + ':' + r.tag);
      return existing;
    }
    if (existing) return existing;
    print(r.tag + ': Pulling from library/' + r.repo);
    print(hex(12) + ': Pull complete');
    print(hex(12) + ': Pull complete');
    print('Digest: sha256:' + hex(64));
    print('Status: Downloaded newer image for ' + r.repo + ':' + r.tag);
    var img = { repo: r.repo, tag: r.tag, id: hex(12), created: '9 days ago' };
    images.push(img);
    return img;
  }

  function finish(c, code) {
    c.status = 'exited';
    c.exitCode = code;
    c.finishedAt = Date.now();
    if (c.rm) {
      ctrs = ctrs.filter(function (x) { return x !== c; });
    }
  }

  // Decide what the container's main process does when it starts.
  function boot(c, attached) {
    var kind = REGISTRY[c.repo].kind;
    c.status = 'running';
    c.startedAt = Date.now();
    var cmd = c.args.join(' ');
    if (kind === 'hello') {
      c.logs = ['Hello from Docker!', 'This message shows that your installation appears to be working correctly.'];
      if (attached) c.logs.forEach(function (l) { print(l); });
      finish(c, 0);
      return;
    }
    if (kind === 'shell' || kind === 'node') {
      if (c.args.length && c.args[0] === 'echo') {
        c.logs = [c.args.slice(1).join(' ').replace(/^["']|["']$/g, '')];
        if (attached) print(c.logs[0]);
        finish(c, 0);
        return;
      }
      if (c.args.length && c.args[0] === 'sleep') {
        c.logs = [];
        c.sleepPid1 = true;
        if (attached) print('(attached to "sleep ' + (c.args[1] || '') + '". Simulated: we detach you, and it keeps running. Normally you would use -d for this)', 'note');
        return;
      }
      if (c.args.length && !/^(sh|\/bin\/sh|bash|node)$/.test(c.args[0])) {
        c.logs = ['(ran "' + cmd + '")'];
        if (attached) print(c.logs[0]);
        finish(c, 0);
        return;
      }
      if (c.it) {
        if (kind === 'node') print('Welcome to Node.js v22.20.0.');
        print((kind === 'node' ? '> ' : '/ # ') + '(simulated interactive session. Typing "exit" for you)', 'note');
        print(kind === 'node' ? '> .exit' : '/ # exit');
        c.logs = [];
        finish(c, 0);
        return;
      }
      c.logs = [];
      finish(c, 0);
      print('(the shell had no terminal and nothing to do, so it exited at once. Use -it, or give it a long-running command)', 'note');
      return;
    }
    if (kind === 'postgres' && !c.env.some(function (e) { return /^POSTGRES_PASSWORD=/.test(e); })) {
      c.logs = ['Error: Database is uninitialized and superuser password is not specified.',
        '       You must specify POSTGRES_PASSWORD to a non-empty value for the',
        '       superuser. For example, "-e POSTGRES_PASSWORD=password" on "docker run".'];
      if (attached) c.logs.forEach(function (l) { print(l, 'err'); });
      finish(c, 1);
      return;
    }
    c.logs = c.repo === 'nginx'
      ? ['/docker-entrypoint.sh: Configuration complete; ready for start up',
        '2026/09/30 10:00:01 [notice] 1#1: nginx/1.29.1', '2026/09/30 10:00:01 [notice] 1#1: start worker processes']
      : c.repo === 'redis'
        ? ['1:M * Server initialized', '1:M * Ready to accept connections tcp']
        : ['LOG:  database system is ready to accept connections'];
    if (attached) {
      c.logs.forEach(function (l) { print(l); });
      print('^C (simulated: you pressed Ctrl+C in the attached terminal → the container stops)', 'note');
      finish(c, 0);
    }
  }

  function cmdRun(args) {
    var opts = { d: false, it: false, rm: false, name: null, ports: [], env: [] };
    var k = 0;
    while (k < args.length && args[k].charAt(0) === '-') {
      var a = args[k];
      if (a === '-d' || a === '--detach') opts.d = true;
      else if (a === '-it' || a === '-ti') opts.it = true;
      else if (a === '-i' || a === '-t' || a === '--interactive' || a === '--tty') opts.it = true;
      else if (a === '-dit' || a === '-itd') { opts.it = true; opts.d = true; }
      else if (a === '--rm') opts.rm = true;
      else if (a === '--name') opts.name = args[++k];
      else if (a.indexOf('--name=') === 0) opts.name = a.slice(7);
      else if (a === '-p' || a === '--publish') opts.ports.push(args[++k]);
      else if (a === '-e' || a === '--env') opts.env.push(args[++k]);
      else {
        print('unknown flag: ' + a, 'err');
        print("See 'docker run --help'.", 'err');
        return;
      }
      k++;
    }
    var ref = args[k];
    if (!ref) {
      print('"docker run" requires at least 1 argument.', 'err');
      return;
    }
    if (opts.name && findCtr(opts.name) && findCtr(opts.name).name === opts.name) {
      print('docker: Error response from daemon: Conflict. The container name "/' + opts.name +
        '" is already in use by container "' + findCtr(opts.name).id + '". You have to remove (or rename) that container to be able to reuse that name.', 'err');
      return;
    }
    var r = parseRef(ref);
    if (!findImage(ref)) {
      if (!REGISTRY[r.repo]) {
        print("Unable to find image '" + r.repo + ':' + r.tag + "' locally");
        pull(ref, true);
        return;
      }
      print("Unable to find image '" + r.repo + ':' + r.tag + "' locally");
      pull(ref, true);
    }
    var c = {
      id: hex(64), name: opts.name || ADJ[Math.floor(Math.random() * ADJ.length)] + '_' + SCI[Math.floor(Math.random() * SCI.length)],
      repo: r.repo, image: r.repo + (r.tag === 'latest' ? '' : ':' + r.tag), args: args.slice(k + 1),
      it: opts.it, rm: opts.rm, env: opts.env, ports: opts.ports.map(function (p) {
        var pp = p.split(':');
        return '0.0.0.0:' + pp[0] + '->' + (pp[1] || pp[0]) + '/tcp';
      }).join(', '),
      created: Date.now(), status: 'created', exitCode: 0, logs: [],
    };
    c.command = c.args.length ? '"' + c.args.join(' ').slice(0, 18) + '"' : REGISTRY[r.repo].cmd;
    ctrs.push(c);
    if (opts.d) {
      boot(c, false);
      print(c.id);
    } else {
      boot(c, true);
    }
  }

  function cmdPs(args) {
    var all = args.indexOf('-a') !== -1 || args.indexOf('--all') !== -1;
    var q = args.indexOf('-q') !== -1;
    var list = ctrs.filter(function (c) { return all || c.status === 'running'; });
    if (q) { list.forEach(function (c) { print(c.id.slice(0, 12)); }); return; }
    print(pad('CONTAINER ID', 14) + pad('IMAGE', 12) + pad('STATUS', 36) + pad('PORTS', 22) + 'NAMES');
    list.forEach(function (c) {
      print(pad(c.id.slice(0, 12), 14) + pad(c.image, 12) + pad(statusText(c), 36) +
        pad(c.status === 'running' ? c.ports : '', 22) + c.name);
    });
  }

  function need(key, verb) {
    if (!key) { print('"docker ' + verb + '" requires at least 1 argument.', 'err'); return null; }
    var c = findCtr(key);
    if (!c) print('Error response from daemon: No such container: ' + key, 'err');
    return c;
  }

  function exec(line) {
    line = line.trim();
    if (!line) return;
    print('$ ' + line, 'cmd');
    hist.push(line);
    hIdx = hist.length;
    var t = line.match(/"[^"]*"|'[^']*'|\S+/g) || [];
    if (t[0] === 'clear') { document.getElementById('term').innerHTML = ''; return; }
    if (t[0] === 'help') {
      print('Supported: docker run [-d] [-it] [--rm] [--name N] [-p H:C] [-e K=V] IMAGE [CMD...]', 'note');
      print('  docker ps [-a] [-q] | logs [-f] C | exec [-it] C CMD | stop C | kill C | start C', 'note');
      print('  docker rm [-f] C | images | pull IMAGE | rmi IMAGE | clear', 'note');
      print('  images you can pull: ' + Object.keys(REGISTRY).join(', '), 'note');
      return;
    }
    if (t[0] !== 'docker') { print('this demo only understands docker commands (try: help)', 'err'); return; }
    if (t[1] === 'container' && t[2]) {
      var map = { ls: 'ps', rm: 'rm', stop: 'stop', start: 'start', kill: 'kill', logs: 'logs', exec: 'exec', run: 'run' };
      t = ['docker', map[t[2]] || t[2]].concat(t.slice(3));
    }
    if (t[1] === 'image' && t[2] === 'ls') t = ['docker', 'images'];
    var sub = t[1];
    var args = t.slice(2);
    var c;
    if (sub === 'run') cmdRun(args);
    else if (sub === 'ps') cmdPs(args);
    else if (sub === 'images') {
      print(pad('REPOSITORY', 14) + pad('TAG', 10) + pad('IMAGE ID', 15) + pad('CREATED', 14) + 'SIZE');
      images.forEach(function (im) {
        print(pad(im.repo, 14) + pad(im.tag, 10) + pad(im.id, 15) + pad(im.created, 14) + REGISTRY[im.repo].size);
      });
    } else if (sub === 'pull') {
      if (!args[0]) { print('"docker pull" requires exactly 1 argument.', 'err'); return; }
      pull(args[0], false);
    } else if (sub === 'logs') {
      var follow = args.indexOf('-f') !== -1 || args.indexOf('--follow') !== -1;
      c = need(args.filter(function (a) { return a.charAt(0) !== '-'; })[0], 'logs');
      if (!c) return;
      c.logs.forEach(function (l) { print(l); });
      if (follow) {
        if (c.status === 'running') print('(following new output… simulated: you press Ctrl+C. Only the log stream stops, the container keeps running)', 'note');
        else print('(container is not running, so -f returns right away)', 'note');
      }
    } else if (sub === 'exec') {
      var rest = args.filter(function (a) { return a.charAt(0) !== '-'; });
      c = need(rest[0], 'exec');
      if (!c) return;
      if (c.status !== 'running') {
        print('Error response from daemon: container ' + c.id + ' is not running', 'err');
        return;
      }
      var what = rest.slice(1).join(' ') || '';
      if (!what) { print('"docker exec" requires at least 2 arguments.', 'err'); return; }
      if (/^(sh|bash|\/bin\/sh|\/bin\/bash)$/.test(what)) {
        if (args.indexOf('-it') === -1 && args.indexOf('-ti') === -1) {
          print('(no -it: the shell gets no terminal and exits immediately)', 'note');
          return;
        }
        print('# (simulated shell inside ' + c.name + ': a NEW process next to PID 1) ', 'note');
        print('# hostname → ' + c.id.slice(0, 12));
        print('# exit');
      } else {
        print('(simulated) ran "' + what + '" inside ' + c.name);
      }
    } else if (sub === 'stop') {
      c = need(args[0], 'stop');
      if (!c) return;
      if (c.status === 'running') {
        if (c.sleepPid1) {
          print('(SIGTERM sent… sleep is PID 1 with no SIGTERM handler, so it ignores it. After 10s Docker sends SIGKILL)', 'note');
          finish(c, 137);
        } else {
          print('(SIGTERM sent → ' + c.name + ' shut down cleanly)', 'note');
          finish(c, 0);
        }
      }
      print(args[0]);
    } else if (sub === 'kill') {
      c = need(args[0], 'kill');
      if (!c) return;
      if (c.status !== 'running') {
        print('Error response from daemon: cannot kill container: ' + args[0] + ': container ' + c.id + ' is not running', 'err');
        return;
      }
      print('(SIGKILL: no chance to clean up)', 'note');
      finish(c, 137);
      print(args[0]);
    } else if (sub === 'start') {
      c = need(args[0], 'start');
      if (!c) return;
      if (c.status !== 'running') {
        boot(c, false);
        if (c.status !== 'running') print('(started, but its main process exited again right away)', 'note');
      }
      print(args[0]);
    } else if (sub === 'rm') {
      var force = args.indexOf('-f') !== -1 || args.indexOf('--force') !== -1;
      var key = args.filter(function (a) { return a.charAt(0) !== '-'; })[0];
      c = need(key, 'rm');
      if (!c) return;
      if (c.status === 'running' && !force) {
        print('Error response from daemon: cannot remove container "/' + c.name +
          '": container is running: stop the container before removing or force remove', 'err');
        return;
      }
      ctrs = ctrs.filter(function (x) { return x !== c; });
      print(key);
    } else if (sub === 'rmi') {
      var im = args[0] && findImage(args[0]);
      if (!im) { print('Error response from daemon: No such image: ' + (args[0] || ''), 'err'); return; }
      var user = ctrs.filter(function (x) { return x.repo === im.repo; })[0];
      if (user) {
        print('Error response from daemon: conflict: unable to remove repository reference "' + args[0] +
          '" (must force) - container ' + user.id.slice(0, 12) + ' is using its referenced image ' + im.id, 'err');
        return;
      }
      images = images.filter(function (x) { return x !== im; });
      print('Untagged: ' + im.repo + ':' + im.tag);
      print('Deleted: sha256:' + hex(64));
    } else {
      print('docker: \'' + sub + '\' is not supported in this demo (try: help)', 'err');
    }
  }

  function renderTable() {
    var h = '<tr><th>NAME</th><th>IMAGE</th><th>STATUS</th><th>PORTS</th></tr>';
    if (!ctrs.length) h += '<tr><td colspan="4" style="color:#9ca3af">no containers (docker ps -a is empty)</td></tr>';
    ctrs.forEach(function (c) {
      var cls = c.status === 'running' ? 'up' : c.status === 'created' ? 'cr' : 'ex';
      h += '<tr><td>' + esc(c.name) + '</td><td>' + esc(c.image) + '</td><td class="' + cls + '">' + esc(statusText(c)) +
        '</td><td>' + esc(c.status === 'running' ? c.ports : '') + '</td></tr>';
    });
    document.getElementById('tbl').innerHTML = h;
  }

  function run(line) {
    try { exec(line); } catch (e) { print('demo error: ' + e.message, 'err'); }
    renderTable();
  }

  var q = document.getElementById('quick');
  QUICK.forEach(function (cmd) {
    var b = document.createElement('button');
    b.textContent = cmd.replace(/^docker /, '');
    b.title = cmd;
    b.onclick = function () { run(cmd); };
    q.appendChild(b);
  });
  var input = document.getElementById('in');
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { run(input.value); input.value = ''; }
    if (e.key === 'ArrowUp' && hIdx > 0) { hIdx--; input.value = hist[hIdx]; e.preventDefault(); }
    if (e.key === 'ArrowDown') { hIdx = Math.min(hist.length, hIdx + 1); input.value = hist[hIdx] || ''; }
  });
  setInterval(renderTable, 1000);
  print('Simulated Docker. Click a command above or type one (try: help).', 'note');
  renderTable();
</script>`,
          explain: `
            <details>
              <summary>Try this: five things worth seeing</summary>
              <ol>
                <li><strong>Lifecycle:</strong> <code>run -d --name web -p 8080:80 nginx</code> → <code>stop web</code> →
                <code>ps</code> (empty!) → <code>ps -a</code> (there it is, <em>Exited (0)</em>) → <code>start web</code> → <code>rm web</code>
                (error: it's running) → <code>kill web</code> → <code>rm web</code>.</li>
                <li><strong>Exits immediately:</strong> <code>run -d alpine</code> shows up as <em>Exited (0)</em> right away,
                because <code>sh</code> had nothing to do. Compare with <code>run -it --rm alpine</code>.</li>
                <li><strong>stop vs kill:</strong> <code>stop web</code> gives <em>Exited (0)</em>: nginx caught SIGTERM and shut
                down cleanly. <code>kill web</code> gives <em>Exited (137)</em>.</li>
                <li><strong>The PID 1 signal trap:</strong> <code>run -d --name nap alpine sleep 3600</code> then <code>stop nap</code>.
                <code>sleep</code> is PID 1 with no SIGTERM handler, and PID 1 ignores signals it doesn't handle. Docker waits the
                full 10 s and then SIGKILLs it (<em>137</em>). Real fix: <code>docker run --init</code>, or an app that handles SIGTERM.</li>
                <li><strong>--rm:</strong> <code>run --rm alpine echo hi</code> prints <code>hi</code> and leaves nothing in
                <code>ps -a</code>.</li>
              </ol>
              <p>Also try a name conflict (run the <code>web</code> command twice) and <code>run -d postgres</code> without
              <code>-e POSTGRES_PASSWORD=…</code>, then <code>logs</code> on its name.</p>
            </details>
          `,
        },
        {
          title: 'A real session',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ docker run -d --name web -p 8080:80 nginx:1.27
Unable to find image 'nginx:1.27' locally
1.27: Pulling from library/nginx
...
Status: Downloaded newer image for nginx:1.27
8c1f6d0b2a9e4f7c...

$ docker ps
CONTAINER ID   IMAGE        COMMAND                  CREATED         STATUS         PORTS                  NAMES
8c1f6d0b2a9e   nginx:1.27   "/docker-entrypoint.…"   5 seconds ago   Up 4 seconds   0.0.0.0:8080->80/tcp   web

$ curl -s localhost:8080 | head -n 4
<!DOCTYPE html>
<html>
<head>
<title>Welcome to nginx!</title>

$ docker logs --tail 2 web
172.17.0.1 - - [30/Sep/2026:10:02:11 +0000] "GET / HTTP/1.1" 200 615 "-" "curl/8.5.0" "-"

$ docker exec -it web sh
# nginx -v
nginx version: nginx/1.27.5
# exit

$ docker stop web
web
$ docker ps -a --filter name=web --format '{{.Names}}  {{.Status}}'
web  Exited (0) 3 seconds ago

$ docker rm web
web

# Clean up everything that's stopped / unused
$ docker container prune
$ docker image prune`,
        },
      ],
      quiz: [
        {
          q: '<code>docker run -d alpine</code> shows <code>Exited (0)</code> a second later. Why?',
          options: [
            'The main process (sh) had no terminal or script, so it finished, and the container ends with it',
            'Alpine images are broken',
            '-d kills containers after one second',
            'It ran out of memory',
          ],
          answer: 0,
          why: 'A container lives as long as its PID 1. sh without a TTY or input exits at once with code 0.',
        },
        {
          q: 'What’s the difference between <code>docker stop</code> and <code>docker kill</code>?',
          options: [
            'None, they’re aliases',
            'stop deletes the container; kill keeps it',
            'kill only works on detached containers',
            'stop sends SIGTERM and waits (10 s by default) before SIGKILL; kill sends SIGKILL right away',
          ],
          answer: 3,
          why: 'stop allows a graceful shutdown. kill doesn’t. Neither removes the container.',
        },
        {
          q: 'Your container isn’t in <code>docker ps</code>. Where do you look first?',
          options: ['docker images', 'docker ps -a, then docker logs &lt;name&gt;', 'docker pull', 'docker exec'],
          answer: 1,
          why: 'ps only lists running containers. ps -a shows exited ones and their exit code, and logs shows what the process printed before it died.',
        },
        {
          q: 'In <code>docker run -p 8080:80 nginx</code>, which number is the container port?',
          options: ['8080', '80', 'Both', 'Neither: -p sets memory'],
          answer: 1,
          why: 'The format is HOST:CONTAINER. Traffic to host port 8080 is forwarded to port 80 inside the container.',
        },
        {
          q: 'What does <code>docker exec -it web sh</code> need?',
          options: [
            'A stopped container named web',
            'An image called web',
            'A running container named web that has sh in its image',
            'Nothing. It creates web if missing.',
          ],
          answer: 2,
          why: 'exec starts an extra process inside an existing, running container. The binary must exist in that container’s filesystem.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>In the box below, write the commands (one per line, under each comment) to:</p>
          <ol>
            <li>run <code>nginx:1.27</code> in the background, named <code>web</code>, host port <code>8080</code> → container port <code>80</code></li>
            <li>follow its logs</li>
            <li>open an interactive <code>sh</code> inside it</li>
            <li>stop it <strong>gracefully</strong></li>
            <li>remove it</li>
            <li>list <strong>all</strong> containers to confirm it's gone</li>
          </ol>
          <p>Then click <strong>Check</strong>.</p>`,
        starter: checker(`# 1. run nginx:1.27 detached as "web", 8080 -> 80
docker run nginx

# 2. follow logs

# 3. shell inside

# 4. stop gracefully
docker kill web

# 5. remove

# 6. list all containers
docker ps`, REFRESHER_RULES),
        hint: 'You need: docker run -d --name … -p HOST:CONTAINER IMAGE, docker logs -f, docker exec -it … sh, docker stop (not kill), docker rm, docker ps -a.',
        solution: checker(`# 1. run nginx:1.27 detached as "web", 8080 -> 80
docker run -d --name web -p 8080:80 nginx:1.27

# 2. follow logs
docker logs -f web

# 3. shell inside
docker exec -it web sh

# 4. stop gracefully
docker stop web

# 5. remove
docker rm web

# 6. list all containers
docker ps -a`, REFRESHER_RULES),
      },
    },
  );
})();
