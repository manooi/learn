// Section: Images & Dockerfiles
(function () {
  const CHECKER_CSS = `
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  textarea { width: 100%; box-sizing: border-box; height: 210px; font-family: ui-monospace, Menlo, monospace; font-size: 12.5px;
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

// Lines without full-line comments, trimmed, "\" continuations joined.
function cleanLines(src) {
  var BS = String.fromCharCode(92);
  var res = [];
  var buf = '';
  src.split('\n').forEach(function (l) {
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

// Dockerfile helpers: [{op, args}], and stages split on FROM
function instrs(src) {
  return cleanLines(src).map(function (l) {
    var m = l.match(/^([A-Za-z]+)\s*(.*)$/);
    return m ? { op: m[1].toUpperCase(), args: m[2].trim() } : null;
  }).filter(Boolean);
}
function stages(src) {
  var st = [];
  instrs(src).forEach(function (i) {
    if (i.op === 'FROM') {
      var m = i.args.match(/^(?:--platform=\S+\s+)?(\S+)(?:\s+as\s+(\S+))?/i);
      st.push({ image: m ? m[1] : '', name: m && m[2] ? m[2] : '', list: [] });
    } else if (st.length) {
      st[st.length - 1].list.push(i);
    }
  });
  return st;
}
function idx(list, fn) {
  for (var k = 0; k < list.length; k++) if (fn(list[k])) return k;
  return -1;
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

  // Glob matcher shared by the .dockerignore simulator and exercise (no RegExp building needed).
  const IGNORE_MATCHER = String.raw`
function segMatch(p, s) {
  if (!p.length) return !s.length;
  var c = p.charAt(0);
  if (c === '*') {
    for (var k = 0; k <= s.length; k++) if (segMatch(p.slice(1), s.slice(k))) return true;
    return false;
  }
  if (!s.length) return false;
  if (c === '?' || c === s.charAt(0)) return segMatch(p.slice(1), s.slice(1));
  return false;
}
function pathMatch(pp, sp) {
  if (!pp.length) return !sp.length;
  if (pp[0] === '**') {
    for (var k = 0; k <= sp.length; k++) if (pathMatch(pp.slice(1), sp.slice(k))) return true;
    return false;
  }
  if (!sp.length) return false;
  return segMatch(pp[0], sp[0]) && pathMatch(pp.slice(1), sp.slice(1));
}
function parseIgnore(text) {
  return text.split('\n').map(function (l) { return l.trim(); })
    .filter(function (l) { return l && l.charAt(0) !== '#'; })
    .map(function (l) {
      var neg = l.charAt(0) === '!';
      if (neg) l = l.slice(1).trim();
      l = l.replace(/^\.\//, '').replace(/^\/+/, '').replace(/\/+$/, '');
      return { neg: neg, parts: l.split('/') };
    })
    .filter(function (r) { return r.parts.join('') !== ''; });
}
// A path is excluded if the LAST rule matching it (or one of its parent dirs) is not a "!" rule.
function isIgnored(rules, path) {
  var segs = path.split('/');
  var ignored = false;
  rules.forEach(function (r) {
    for (var n = 1; n <= segs.length; n++) {
      if (pathMatch(r.parts, segs.slice(0, n))) { ignored = !r.neg; break; }
    }
  });
  return ignored;
}`;

  // ---------------------------------------------------------------------------
  // Exercise rule sets
  // ---------------------------------------------------------------------------
  const BASICS_RULES = String.raw`
var RULES = [
  ['FROM pins a Node version (e.g. node:22-slim), not bare "node" or :latest', function (s) {
    var st = stages(s);
    return st.length && /^node:\d/.test(st[0].image) && !/latest/.test(st[0].image);
  }],
  ['WORKDIR /app is set before copying files', function (s) {
    var l = instrs(s);
    var w = idx(l, function (i) { return i.op === 'WORKDIR' && /^\/app\/?$/.test(i.args); });
    var c = idx(l, function (i) { return i.op === 'COPY'; });
    return w !== -1 && c !== -1 && w < c;
  }],
  ['No "RUN cd ..." (WORKDIR replaces it)', function (s) {
    return !instrs(s).some(function (i) { return i.op === 'RUN' && /(^|&&|;)\s*cd\s/.test(i.args); });
  }],
  ['ENV NODE_ENV=production', function (s) {
    return instrs(s).some(function (i) { return i.op === 'ENV' && /NODE_ENV(=|\s+)"?production"?/.test(i.args); });
  }],
  ['EXPOSE 3000', function (s) {
    return instrs(s).some(function (i) { return i.op === 'EXPOSE' && /(^|\s)3000(\/tcp)?(\s|$)/.test(i.args); });
  }],
  ['CMD uses exec form: ["node", "server.js"]', function (s) {
    return instrs(s).some(function (i) { return i.op === 'CMD' && /^\[\s*"node"\s*,\s*"(\.\/)?server\.js"\s*\]$/.test(i.args); });
  }],
];`;

  const ORDER_RULES = String.raw`
function isCopyAll(i) { return i.op === 'COPY' && /^(--\S+\s+)*\.\s+(\.\/?|\/app\/?)$/.test(i.args); }
function isCopyPkg(i) { return i.op === 'COPY' && /package/.test(i.args) && !isCopyAll(i); }
function isInstall(i) { return i.op === 'RUN' && /npm\s+(ci|install|i)(\s|$)/.test(i.args); }
function isBuild(i) { return i.op === 'RUN' && /npm\s+run\s+build/.test(i.args); }
var RULES = [
  ['Copies package.json / package-lock.json on their own', function (s) { return instrs(s).some(isCopyPkg); }],
  ['...BEFORE running npm ci', function (s) {
    var l = instrs(s);
    var p = idx(l, isCopyPkg), n = idx(l, isInstall);
    return p !== -1 && n !== -1 && p < n;
  }],
  ['npm ci runs exactly once', function (s) { return instrs(s).filter(isInstall).length === 1; }],
  ['COPY . . comes AFTER npm ci', function (s) {
    var l = instrs(s);
    var n = idx(l, isInstall), a = idx(l, isCopyAll);
    return n !== -1 && a !== -1 && a > n;
  }],
  ['npm run build comes after COPY . .', function (s) {
    var l = instrs(s);
    var a = idx(l, isCopyAll), b = idx(l, isBuild);
    return a !== -1 && b > a;
  }],
  ['CMD is still the last instruction', function (s) {
    var l = instrs(s);
    return l.length && l[l.length - 1].op === 'CMD';
  }],
];`;

  const MULTI_RULES = String.raw`
function last(s) { var st = stages(s); return st[st.length - 1]; }
function buildName(s) { var st = stages(s); return st.length > 1 ? st[0].name : ''; }
var RULES = [
  ['At least two stages (two FROM lines)', function (s) { return stages(s).length >= 2; }],
  ['The first stage is named (FROM node:22 AS build)', function (s) { return !!buildName(s); }],
  ['The final stage uses a small base (slim, alpine or distroless)', function (s) {
    return stages(s).length >= 2 && /(slim|alpine|distroless)/.test(last(s).image);
  }],
  ['The final stage copies dist from the first stage with COPY --from', function (s) {
    var n = buildName(s);
    return n && last(s).list.some(function (i) {
      return i.op === 'COPY' && i.args.indexOf('--from=' + n) !== -1 && /dist/.test(i.args);
    });
  }],
  ['The final stage installs production deps only (npm ci --omit=dev)', function (s) {
    return stages(s).length >= 2 && last(s).list.some(function (i) {
      return i.op === 'RUN' && /npm\s+ci\b.*(--omit=dev|--omit\s+dev|--production)/.test(i.args);
    });
  }],
  ['The final stage does NOT run the build (no npm run build)', function (s) {
    return stages(s).length >= 2 && !last(s).list.some(function (i) { return /npm\s+run\s+build/.test(i.args); });
  }],
  ['The final stage runs dist/server.js', function (s) {
    return stages(s).length >= 2 && last(s).list.some(function (i) { return i.op === 'CMD' && /dist\/server\.js/.test(i.args); });
  }],
];`;

  const IGNORE_RULES = IGNORE_MATCHER + String.raw`
function ig(s, p) { return isIgnored(parseIgnore(s), p); }
var RULES = [
  ['node_modules excluded, also nested (packages/api/node_modules)', function (s) {
    return ig(s, 'node_modules/express/index.js') && ig(s, 'packages/api/node_modules/zod/index.js');
  }],
  ['.git excluded', function (s) { return ig(s, '.git/HEAD'); }],
  ['.env and .env.local excluded (secrets!)', function (s) { return ig(s, '.env') && ig(s, '.env.local'); }],
  ['.env.example still included (use a ! rule)', function (s) { return !ig(s, '.env.example'); }],
  ['coverage/ excluded', function (s) { return ig(s, 'coverage/lcov.info'); }],
  ['.log files excluded at ANY depth (logs/app.log, packages/api/debug.log)', function (s) {
    return ig(s, 'npm-debug.log') && ig(s, 'logs/app.log') && ig(s, 'packages/api/debug.log');
  }],
  ['Source and package files still included', function (s) {
    return !ig(s, 'src/server.js') && !ig(s, 'package.json') && !ig(s, 'package-lock.json') &&
      !ig(s, 'packages/api/src/index.js');
  }],
];`;

  const PIN_RULES = String.raw`
var DIGEST = 'sha256:5be1ecc7935f1dd85635d4feedaf660594030253cc97c9e9ca3819ffeac36b65';
function st(s) { return stages(s); }
var RULES = [
  ['Build stage pins a Node version (node:22...), not :latest', function (s) {
    var x = st(s);
    return x.length && /^node:\d/.test(x[0].image) && !/latest/.test(x[0].image);
  }],
  ['Build stage is still named build', function (s) { var x = st(s); return x.length && x[0].name === 'build'; }],
  ['Runtime stage uses a versioned nginx tag (nginx:1.27-alpine)', function (s) {
    var x = st(s);
    return x.length > 1 && /^nginx:1\.27-alpine(@|$)/.test(x[x.length - 1].image);
  }],
  ['Runtime stage is ALSO pinned to the given digest (@sha256:5be1ec...)', function (s) {
    var x = st(s);
    return x.length > 1 && x[x.length - 1].image.split('@')[1] === DIGEST;
  }],
  ['No FROM without a tag, and no :latest anywhere', function (s) {
    return st(s).every(function (x) { return /[:@]/.test(x.image); }) && !/latest/.test(s.replace(/^\s*#.*$/gm, ''));
  }],
  ['Still copies the build output with COPY --from=build', function (s) {
    var x = st(s);
    return x.length > 1 && x[x.length - 1].list.some(function (i) { return i.op === 'COPY' && /--from=build/.test(i.args); });
  }],
];`;

  const HARDEN_RULES = String.raw`
function lastStage(s) { var x = stages(s); return x.length ? x[x.length - 1].list : []; }
var RULES = [
  ['No ARG/ENV holding a token, secret or password', function (s) {
    return !instrs(s).some(function (i) {
      return (i.op === 'ARG' || i.op === 'ENV') && /(token|secret|passw)/i.test(i.args);
    });
  }],
  ['npm ci reads the token from a BuildKit secret mount', function (s) {
    return instrs(s).some(function (i) {
      return i.op === 'RUN' && /--mount=type=secret/.test(i.args) && /npm\s+ci/.test(i.args);
    });
  }],
  ['The token is never written into the image (.npmrc not created by echo)', function (s) {
    return !/echo[^\n]*_authToken/.test(s);
  }],
  ['Runs as a non-root USER, set before CMD', function (s) {
    var l = lastStage(s);
    var u = -1;
    l.forEach(function (i, k) { if (i.op === 'USER') u = k; });
    var c = idx(l, function (i) { return i.op === 'CMD'; });
    return u !== -1 && !/^(root|0)(:|$)/.test(l[u].args) && (c === -1 || u < c);
  }],
  ['Has a HEALTHCHECK', function (s) {
    return instrs(s).some(function (i) { return i.op === 'HEALTHCHECK' && !/^NONE$/i.test(i.args); });
  }],
  ['CMD still in exec form', function (s) {
    return lastStage(s).some(function (i) { return i.op === 'CMD' && /^\[/.test(i.args); });
  }],
];`;

  // ---------------------------------------------------------------------------
  window.LESSONS = window.LESSONS || [];
  window.LESSONS.push(
    // =========================================================================
    {
      id: 'dockerfile-basics',
      section: 'Images & Dockerfiles',
      title: 'Writing a Dockerfile',
      explain: `
        <p>A <strong>Dockerfile</strong> is a recipe for an image. Each line is an <em>instruction</em>. The builder (BuildKit,
        the default in Docker Engine 23+) runs them top to bottom and snapshots the result. You build it with:</p>
        <pre><code class="language-bash">docker build -t myapp:1.0 .    # "." = the build context (the files the build can see)</code></pre>

        <h3>The instructions you'll use 95% of the time</h3>
        <table>
          <tr><th>Instruction</th><th>What it does</th><th>When</th></tr>
          <tr><td><code>FROM node:22-slim</code></td><td>Start from a base image. Always the first instruction.</td><td>build</td></tr>
          <tr><td><code>WORKDIR /app</code></td><td>Set (and create) the working directory for everything after it. Use it instead of <code>RUN cd …</code>.</td><td>build + run</td></tr>
          <tr><td><code>COPY src dest</code></td><td>Copy files from the build context into the image.</td><td>build</td></tr>
          <tr><td><code>RUN npm ci</code></td><td>Run a command <em>during the build</em> and keep the resulting files.</td><td>build</td></tr>
          <tr><td><code>ENV NODE_ENV=production</code></td><td>Set an environment variable for later steps <em>and</em> for the running container.</td><td>build + run</td></tr>
          <tr><td><code>ARG VERSION</code></td><td>A build-time variable (<code>--build-arg</code>). Not present in the running container.</td><td>build</td></tr>
          <tr><td><code>EXPOSE 3000</code></td><td>Documentation: "this app listens on 3000". It does <strong>not</strong> publish the port. You still need <code>-p</code>.</td><td>metadata</td></tr>
          <tr><td><code>USER node</code></td><td>Run later steps and the container as this user.</td><td>build + run</td></tr>
          <tr><td><code>CMD ["node","server.js"]</code></td><td>Default command when the container starts. Easy to override.</td><td>run</td></tr>
          <tr><td><code>ENTRYPOINT ["node"]</code></td><td>The fixed executable. <code>CMD</code> / run arguments become its arguments.</td><td>run</td></tr>
        </table>

        <div class="warn"><strong>RUN vs CMD:</strong> <code>RUN</code> happens once, at build time, on the build machine.
        <code>CMD</code> is stored in the image and happens every time a container starts. <code>RUN node server.js</code>
        would try to start your server <em>during the build</em> and hang it.</div>

        <h3>Exec form vs shell form</h3>
        <pre><code class="language-docker">CMD ["node", "server.js"]   # exec form (JSON array): runs node directly as PID 1
CMD node server.js          # shell form: runs /bin/sh -c "node server.js"</code></pre>
        <p>With the shell form, PID 1 is usually <code>/bin/sh</code>. <code>docker stop</code> sends SIGTERM to PID 1. The shell
        doesn't forward it to your app, so Docker waits 10 s and then SIGKILLs everything, and your app never gets to shut
        down cleanly. (Some shells hand PID 1 over to a single simple command, but don't rely on it.) Use the <strong>exec form</strong>
        for <code>CMD</code> and <code>ENTRYPOINT</code>. The JSON needs <strong>double quotes</strong>. With single quotes Docker
        silently falls back to shell form.</p>

        <h3>CMD vs ENTRYPOINT</h3>
        <ul>
          <li>Only <code>CMD</code>: the image has a default command, and <code>docker run myapp other-cmd</code> replaces it completely.</li>
          <li><code>ENTRYPOINT</code> + <code>CMD</code>: ENTRYPOINT is the fixed program, CMD is its <em>default arguments</em>.
            Run arguments replace just the CMD part. Good for "this image is a tool" (<code>docker run mytool --help</code>).</li>
          <li>Override the entrypoint itself with <code>docker run --entrypoint sh myapp</code>.</li>
        </ul>
        <div class="tip">Rule of thumb for app images: use <code>CMD ["node", "server.js"]</code> in exec form, and add
        <code>ENTRYPOINT</code> only when the image is meant to behave like a single command-line tool.</div>
      `,
      examples: [
        {
          title: 'CMD vs ENTRYPOINT: what actually runs?',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 12px; font-size: 13px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .card { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 8px 10px; }
  label { display: block; font-weight: 600; margin: 4px 0 2px; font-size: 12px; }
  select, input { width: 100%; box-sizing: border-box; font-family: ui-monospace, Menlo, monospace; font-size: 12px; padding: 4px;
    border: 1px solid #c7cdd8; border-radius: 5px; background: #fff; color: #111827; }
  pre { background: #0f172a; color: #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 11.5px; margin: 6px 0 0; white-space: pre-wrap; }
  .quick button { font-family: ui-monospace, Menlo, monospace; font-size: 11px; margin: 4px 3px 0 0; padding: 2px 6px; border: 1px solid #c7cdd8;
    border-radius: 5px; background: #fff; color: #1f2937; cursor: pointer; }
  .res { font-family: ui-monospace, Menlo, monospace; font-size: 12px; line-height: 1.6; }
  .ok { color: #15803d; font-weight: 700; }
  .bad { color: #b91c1c; font-weight: 700; }
  .warn { background: #fef3c7; border-radius: 5px; padding: 4px 6px; margin-top: 4px; font-size: 12px; }
  #stop { margin-top: 8px; padding: 4px 10px; border: 1px solid #4f46e5; background: #4f46e5; color: #fff; border-radius: 6px; cursor: pointer; }
</style>

<div class="grid">
  <div class="card">
    <label>ENTRYPOINT</label>
    <select id="ep">
      <option value="none">(none)</option>
      <option value="exec">ENTRYPOINT ["node"]</option>
      <option value="shell">ENTRYPOINT node</option>
    </select>
    <label>CMD</label>
    <select id="cmd">
      <option value="full">CMD ["node", "server.js"]</option>
      <option value="arg">CMD ["server.js"]</option>
      <option value="shell">CMD node server.js</option>
      <option value="none">(none)</option>
    </select>
    <label>docker run myapp …</label>
    <input id="args" placeholder="(no extra arguments)">
    <div class="quick">
      <button data-a="">(none)</button>
      <button data-a="worker.js">worker.js</button>
      <button data-a="node worker.js">node worker.js</button>
      <button data-a="sh">sh</button>
    </div>
    <pre id="df"></pre>
  </div>
  <div class="card">
    <div class="res" id="res"></div>
    <button id="stop">docker stop</button>
  </div>
</div>

<script>
  var CMDS = {
    full: { exec: ['node', 'server.js'], text: 'CMD ["node", "server.js"]' },
    arg: { exec: ['server.js'], text: 'CMD ["server.js"]' },
    shell: { shell: 'node server.js', text: 'CMD node server.js' },
    none: null,
  };
  var EPS = {
    none: null,
    exec: { exec: ['node'], text: 'ENTRYPOINT ["node"]' },
    shell: { shell: 'node', text: 'ENTRYPOINT node' },
  };
  var last = null;

  function q(s) { return s.indexOf(' ') !== -1 ? '"' + s + '"' : s; }

  function compute() {
    var ep = EPS[document.getElementById('ep').value];
    var cmd = CMDS[document.getElementById('cmd').value];
    var raw = document.getElementById('args').value.trim();
    var args = raw ? raw.split(/\s+/) : [];
    var notes = [];
    var argv;
    if (ep && ep.shell) {
      argv = ['/bin/sh', '-c', ep.shell];
      if (cmd || args.length) notes.push('Shell-form ENTRYPOINT ignores CMD and run arguments completely.');
    } else {
      var tail = args.length ? args : cmd ? (cmd.exec ? cmd.exec : ['/bin/sh', '-c', cmd.shell]) : [];
      if (!args.length && !cmd && !ep) {
        tail = ['bash'];
        notes.push('No CMD here, so the base image\'s CMD ["bash"] is inherited.');
      }
      if (!args.length && !cmd && ep) notes.push('Setting ENTRYPOINT clears the CMD inherited from the base image.');
      if (args.length && (cmd || !ep)) notes.push('Run arguments replaced the CMD.');
      argv = (ep ? ep.exec : []).concat(tail);
    }
    var outcome;
    var ok = true;
    if (!argv.length) {
      outcome = 'docker: Error response from daemon: no command specified';
      ok = false;
    } else if (argv[0] === 'node') {
      var script = argv[1];
      if (!script) outcome = 'node starts its REPL with no terminal and exits at once (Exited 0)';
      else if (script === 'node') { outcome = "Error: Cannot find module '/app/node'"; ok = false; }
      else if (script === '/bin/sh' || script === 'sh') { outcome = 'node tries to run ' + script + ' as a JavaScript file → crash'; ok = false; }
      else outcome = 'node runs ' + script;
    } else if (argv[0] === '/bin/sh') {
      outcome = argv[2] === 'node' ? 'sh starts node with no script → REPL, exits at once' : 'sh runs: ' + argv[2];
    } else if (argv[0] === 'sh' || argv[0] === 'bash') {
      outcome = argv[0] + ' starts, has no terminal (no -it), exits at once';
    } else {
      outcome = 'exec: "' + argv[0] + '": executable file not found in $PATH';
      ok = false;
    }
    if (argv[0] === '/bin/sh') notes.push('PID 1 is /bin/sh, not your app. SIGTERM from docker stop may never reach node.');
    if (ep && ep.exec && cmd && cmd.exec && cmd.exec[0] === 'node' && !args.length) {
      notes.push('ENTRYPOINT already says "node", so CMD should only hold the arguments.');
    }
    return { ep: ep, cmd: cmd, raw: raw, argv: argv, outcome: outcome, ok: ok, notes: notes };
  }

  function render() {
    var r = compute();
    last = r;
    var df = 'FROM debian:bookworm-slim   # base CMD: ["bash"]\n' +
      'COPY --from=node:22-slim /usr/local/bin/node /usr/local/bin/\n' +
      'WORKDIR /app\nCOPY . .\n' +
      (r.ep ? r.ep.text + '\n' : '') + (r.cmd ? r.cmd.text : '');
    document.getElementById('df').textContent = df;
    var html = '<b>$ docker run myapp' + (r.raw ? ' ' + r.raw : '') + '</b><br>';
    html += 'process: ' + (r.argv.length ? r.argv.map(q).join(' ') : '(nothing)') + '<br>';
    html += 'PID 1: <b>' + (r.argv[0] || '-') + '</b><br>';
    html += '<span class="' + (r.ok ? 'ok' : 'bad') + '">' + r.outcome + '</span>';
    r.notes.forEach(function (n) { html += '<div class="warn">' + n + '</div>'; });
    document.getElementById('res').innerHTML = html;
    console.log('$ docker run myapp' + (r.raw ? ' ' + r.raw : '') + '  →  ' +
      (r.argv.length ? r.argv.map(q).join(' ') : '(no command)') + '  |  ' + r.outcome);
  }

  document.getElementById('ep').onchange = render;
  document.getElementById('cmd').onchange = render;
  document.getElementById('args').oninput = render;
  var qb = document.querySelectorAll('[data-a]');
  for (var i = 0; i < qb.length; i++) {
    qb[i].onclick = function () {
      document.getElementById('args').value = this.getAttribute('data-a');
      render();
    };
  }
  document.getElementById('stop').onclick = function () {
    var r = last;
    if (!r.ok || !r.argv.length) { console.log('$ docker stop → nothing is running'); return; }
    if (r.argv[0] === '/bin/sh') {
      console.log('$ docker stop → SIGTERM to PID 1 (/bin/sh). sh does not forward it... 10s later: SIGKILL. Exited (137)');
    } else {
      console.log('$ docker stop → SIGTERM to PID 1 (' + r.argv[0] + '). The app can close connections and exit cleanly.');
    }
  };

  render();
</script>`,
          explain: `
            <details>
              <summary>Step by step: the combinations worth trying</summary>
              <p>Pick the ENTRYPOINT and CMD from the dropdowns, then use the argument buttons. The console logs one line per change.</p>
              <table>
                <tr><th>ENTRYPOINT</th><th>CMD</th><th>run args</th><th>process (PID 1 first)</th><th>result</th></tr>
                <tr><td>(none)</td><td><code>["node", "server.js"]</code></td><td>(none)</td><td><code>node server.js</code></td><td>node runs server.js</td></tr>
                <tr><td>(none)</td><td><code>["node", "server.js"]</code></td><td><code>node worker.js</code></td><td><code>node worker.js</code></td><td>args replaced CMD</td></tr>
                <tr><td>(none)</td><td><code>["node", "server.js"]</code></td><td><code>worker.js</code></td><td><code>worker.js</code></td><td><code>executable file not found in $PATH</code></td></tr>
                <tr><td><code>["node"]</code></td><td><code>["server.js"]</code></td><td><code>worker.js</code></td><td><code>node worker.js</code></td><td>tool-style image: args replace only the CMD part</td></tr>
                <tr><td><code>["node"]</code></td><td><code>["node", "server.js"]</code></td><td>(none)</td><td><code>node node server.js</code></td><td><code>Cannot find module '/app/node'</code></td></tr>
                <tr><td>(none)</td><td><code>node server.js</code></td><td>(none)</td><td><code>/bin/sh -c "node server.js"</code></td><td>works, but PID 1 is sh</td></tr>
                <tr><td><code>node</code> (shell)</td><td>anything</td><td>anything</td><td><code>/bin/sh -c node</code></td><td>CMD and args ignored</td></tr>
              </table>
            </details>
            <details>
              <summary>The rule, in one sentence</summary>
              <p><strong>Final command = ENTRYPOINT (exec form) + (run arguments if given, otherwise CMD).</strong> A shell-form
              CMD is turned into <code>/bin/sh -c "…"</code> before it's appended. A shell-form ENTRYPOINT wins over everything
              and ignores both CMD and run arguments.</p>
              <pre><code class="language-docker"># Tool-style image
ENTRYPOINT ["node"]          # ① fixed program
CMD ["server.js"]            # ② default argument, replaced by "docker run myapp worker.js"

# App-style image (most common)
CMD ["node", "server.js"]    # ③ whole default command, replaced by "docker run myapp sh"</code></pre>
              <ol>
                <li><strong>①</strong> ENTRYPOINT is only changed with <code>docker run --entrypoint …</code>.</li>
                <li><strong>②</strong> CMD after an exec-form ENTRYPOINT is just <em>default arguments</em>.</li>
                <li><strong>③</strong> With no ENTRYPOINT, the first word of run arguments must be a program in the image
                (that's why <code>worker.js</code> alone fails: it isn't in <code>$PATH</code>).</li>
              </ol>
            </details>
            <details>
              <summary>Try this: why exec form matters for docker stop</summary>
              <p>Select <strong>CMD node server.js</strong> (shell form) and click <strong>docker stop</strong>. The console shows
              SIGTERM going to <code>/bin/sh</code>, a 10-second wait and then SIGKILL (exit 137). Switch back to
              <strong>CMD ["node", "server.js"]</strong> and click again: SIGTERM reaches node directly.</p>
              <div class="tip">Even in exec form, your app has to <em>handle</em> SIGTERM (for example
              <code>process.on('SIGTERM', …)</code> in Node) to shut down gracefully. As PID 1, a process without a handler
              ignores SIGTERM. <code>docker run --init</code> adds a tiny init (tini) as PID 1 that forwards signals for you.</div>
            </details>
          `,
        },
        {
          title: 'A small, well-structured Dockerfile',
          runnable: false,
          lang: 'docker',
          code: String.raw`# syntax=docker/dockerfile:1

# ① Pinned, small base image
FROM node:22-slim

# ② All later paths are relative to /app (created if missing)
WORKDIR /app

# ③ Available at build AND run time
ENV NODE_ENV=production

# ④ Dependencies first (better caching: see "Layers & build cache")
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# ⑤ Then the source code
COPY . .

# ⑥ Documentation only: you still need "docker run -p 3000:3000"
EXPOSE 3000

# ⑦ Don't run as root (the node image ships a "node" user)
USER node

# ⑧ Exec form: node is PID 1 and receives SIGTERM
CMD ["node", "server.js"]`,
        },
        {
          title: 'Build it, run it, override it',
          runnable: false,
          lang: 'bash',
          code: String.raw`$ docker build -t myapp:1.0 .
[+] Building 14.2s (10/10) FINISHED
 => [internal] load build definition from Dockerfile        0.0s
 => [1/5] FROM docker.io/library/node:22-slim@sha256:…      4.1s
 => [2/5] WORKDIR /app                                      0.1s
 => [3/5] COPY package.json package-lock.json ./            0.0s
 => [4/5] RUN npm ci --omit=dev                             8.9s
 => [5/5] COPY . .                                          0.1s
 => exporting to image                                      0.6s
 => => naming to docker.io/library/myapp:1.0                0.0s

$ docker run -d --name app -p 3000:3000 myapp:1.0

# What did the image record as its default command?
$ docker image inspect myapp:1.0 --format '{{json .Config.Cmd}} {{json .Config.Entrypoint}}'
["node","server.js"] ["docker-entrypoint.sh"]

# Replace CMD for a one-off command
$ docker run --rm myapp:1.0 node -e "console.log(process.version)"
v22.20.0

# Replace the ENTRYPOINT (e.g. to debug with a shell)
$ docker run --rm -it --entrypoint sh myapp:1.0
$ whoami
node`,
          note: 'Reference session. The official node image sets ENTRYPOINT ["docker-entrypoint.sh"], a small script that passes your CMD through (and prepends "node" if the first argument starts with "-").',
        },
      ],
      quiz: [
        {
          q: 'What does <code>EXPOSE 3000</code> do?',
          options: [
            'Publishes port 3000 on the host',
            'Opens the firewall',
            'Documents that the app listens on 3000. You still need -p to publish it.',
            'Makes the app listen on port 3000',
          ],
          answer: 2,
          why: 'EXPOSE is metadata. Publishing happens at run time with -p HOST:CONTAINER (or -P for all exposed ports).',
        },
        {
          q: 'Why prefer <code>CMD ["node", "server.js"]</code> over <code>CMD node server.js</code>?',
          options: [
            'It builds faster',
            'The exec form makes node PID 1, so it receives SIGTERM from docker stop',
            'Shell form is not allowed in CMD',
            'Exec form caches better',
          ],
          answer: 1,
          why: 'Shell form wraps the command in /bin/sh -c, so the shell is PID 1 and may not forward signals.',
        },
        {
          q: 'Image has <code>ENTRYPOINT ["ping"]</code> and <code>CMD ["localhost"]</code>. What runs for <code>docker run img example.com</code>?',
          options: ['ping localhost', 'example.com', 'ping example.com', 'ping localhost example.com'],
          answer: 2,
          why: 'Run arguments replace CMD, and they are appended to the exec-form ENTRYPOINT.',
        },
        {
          q: 'Which instruction runs during <code>docker build</code>, not when the container starts?',
          options: ['CMD', 'ENTRYPOINT', 'RUN', 'HEALTHCHECK'],
          answer: 2,
          why: 'RUN executes at build time and its result is saved as a layer. CMD and ENTRYPOINT are stored and used at container start.',
        },
        {
          q: 'You write <code>RUN cd /app</code> and then <code>RUN npm ci</code>. Where does npm ci run?',
          options: ['In /app', 'In the previous WORKDIR (or /)', 'It fails the build', 'In the build context'],
          answer: 1,
          why: 'Each RUN starts a fresh shell, so the cd is forgotten. Use WORKDIR /app, which applies to every later instruction.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This Dockerfile works, but it's sloppy. Edit it in the box below and click <strong>Check</strong>:</p>
          <ul>
            <li>pin the base image to a specific Node version (e.g. <code>node:22-slim</code>)</li>
            <li>use <code>WORKDIR /app</code> instead of <code>cd</code>, and copy into it</li>
            <li>set <code>NODE_ENV=production</code></li>
            <li>document port <code>3000</code></li>
            <li>start with <code>node server.js</code> in <strong>exec form</strong></li>
          </ul>`,
        starter: checker(`FROM node
COPY . /app
RUN cd /app && npm ci --omit=dev
CMD npm start`, BASICS_RULES),
        hint: 'You need FROM node:22-slim, WORKDIR /app, COPY . ., RUN npm ci --omit=dev, ENV NODE_ENV=production, EXPOSE 3000 and CMD ["node", "server.js"] with double quotes.',
        solution: checker(`FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY . .
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "server.js"]`, BASICS_RULES),
      },
    },

    // =========================================================================
    {
      id: 'layers-and-cache',
      section: 'Images & Dockerfiles',
      title: 'Layers & build cache',
      explain: `
        <p>Your first build takes a minute. Then you change one line of code and it takes a minute <em>again</em>. Nine times out
        of ten, the fix is to reorder two lines in the Dockerfile.</p>

        <h3>Every step is cached</h3>
        <p>BuildKit runs the Dockerfile step by step. Instructions that change files (<code>RUN</code>, <code>COPY</code>,
        <code>ADD</code>) each produce a <strong>layer</strong>. Others (<code>ENV</code>, <code>CMD</code>, <code>EXPOSE</code>…)
        just change the image's metadata. Before running a step, BuildKit checks its <strong>cache</strong>: "have I already run
        this exact step, on top of this exact previous step?"</p>
        <ul>
          <li>For <code>RUN</code>, the cache key is the command text plus the parent step. It does <em>not</em> look at what the
            command would download. <code>RUN apt-get update</code> stays cached forever unless something above it changes.</li>
          <li>For <code>COPY</code>/<code>ADD</code>, the key includes a <strong>checksum of the copied files</strong>. Change one
            byte in a copied file and that COPY misses the cache.</li>
        </ul>

        <h3>The domino rule</h3>
        <p>Once one step misses the cache, <strong>every step after it is rebuilt too</strong>, because each one sits on top of the
        changed layer. So the order of your Dockerfile decides how much work each change costs.</p>
        <p><strong>Analogy:</strong> a stack of pancakes. Swap the third pancake and you have to re-stack everything above it,
        but the two at the bottom stay put.</p>

        <h3>The golden order: rarely-changing stuff first</h3>
        <pre><code class="language-docker">FROM node:22-slim
WORKDIR /app
COPY package*.json ./   # changes rarely → npm ci stays cached
RUN npm ci              # the slow step
COPY . .                # changes on every commit → only this and below rebuild
RUN npm run build</code></pre>
        <p>Compare with the naive <code>COPY . .</code> followed by <code>RUN npm ci</code>: any source change invalidates the
        COPY, and the domino rule then forces a full <code>npm ci</code> on every build.</p>

        <div class="tip"><strong>Extra speed:</strong> a cache mount keeps npm's download cache between builds even when the
        step <em>does</em> rerun: <code>RUN --mount=type=cache,target=/root/.npm npm ci</code>. And in CI, export the cache with
        <code>docker buildx build --cache-to/--cache-from</code>, because fresh CI machines start with an empty cache.</div>

        <div class="warn"><strong>Stale-cache gotcha:</strong> <code>RUN apt-get update</code> on its own line gets cached, and
        a later <code>RUN apt-get install -y curl</code> then uses an old package index. Always combine them:
        <code>RUN apt-get update &amp;&amp; apt-get install -y curl</code>. To force a clean build, use <code>docker build --no-cache .</code></div>
      `,
      examples: [
        {
          title: 'Build cache simulator: naive vs optimized order',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 6px; }
  button { padding: 4px 9px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; font-size: 12px; }
  button.primary { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  button.toggle { background: #fef3c7; border-color: #d97706; }
  .steps { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px; }
  .step { display: grid; grid-template-columns: 70px 1fr 56px; gap: 6px; align-items: center; font-family: ui-monospace, Menlo, monospace;
    font-size: 12px; padding: 3px 4px; border-radius: 4px; transition: background .3s; }
  .step + .step { border-top: 1px solid #f0f2f6; }
  .badge { font-size: 10.5px; font-weight: 700; text-align: center; border-radius: 4px; padding: 2px 0; background: #e5e7eb; color: #4b5563; }
  .CACHED { background: #dcfce7; color: #166534; }
  .RUN { background: #ffedd5; color: #9a3412; }
  .BASE { background: #e0e7ff; color: #3730a3; }
  .META { background: #f3f4f6; color: #6b7280; }
  .t { text-align: right; color: #6b7280; }
  .sum { margin-top: 6px; font-weight: 600; }
  .pending { color: #b45309; font-size: 12px; margin: 4px 0; min-height: 16px; }
  .hist { font-size: 12px; color: #374151; margin-top: 4px; }
</style>

<div class="bar">
  <button id="order" class="toggle">Order: naive (click to switch)</button>
  <button id="src">✎ edit src/app.js</button>
  <button id="pkg">✎ edit package.json</button>
  <button id="readme">✎ edit README.md</button>
  <button id="build" class="primary">▶ docker build</button>
  <button id="prune">builder prune</button>
</div>
<div class="pending" id="pending"></div>
<div class="steps" id="steps"></div>
<div class="sum" id="sum">Not built yet. Click "▶ docker build".</div>
<div class="hist" id="hist"></div>

<script>
  var TIMES = { WORKDIR: 0.1, COPYPKG: 0.1, NPMCI: 41.3, COPYALL: 0.4, BUILD: 7.2 };
  var BASE_PULL = 12.4;
  var OVERHEAD = 0.5;
  var DOCKERFILES = {
    naive: [
      { text: 'FROM node:22-slim', kind: 'FROM' },
      { text: 'WORKDIR /app', kind: 'WORKDIR' },
      { text: 'COPY . .', kind: 'COPYALL' },
      { text: 'RUN npm ci', kind: 'NPMCI' },
      { text: 'RUN npm run build', kind: 'BUILD' },
      { text: 'CMD ["node", "dist/server.js"]', kind: 'META' },
    ],
    optimized: [
      { text: 'FROM node:22-slim', kind: 'FROM' },
      { text: 'WORKDIR /app', kind: 'WORKDIR' },
      { text: 'COPY package*.json ./', kind: 'COPYPKG' },
      { text: 'RUN npm ci', kind: 'NPMCI' },
      { text: 'COPY . .', kind: 'COPYALL' },
      { text: 'RUN npm run build', kind: 'BUILD' },
      { text: 'CMD ["node", "dist/server.js"]', kind: 'META' },
    ],
  };
  var order = 'naive';
  var files = { src: 1, pkg: 1, readme: 1 };
  var changed = [];
  var cache = {};
  var basePulled = false;
  var lastResult = null;
  var buildNo = 0;
  var hist = [];

  function inputs(kind) {
    if (kind === 'COPYPKG') return 'pkg' + files.pkg;
    if (kind === 'COPYALL') return 'pkg' + files.pkg + '|src' + files.src + '|readme' + files.readme;
    return '';
  }

  function render() {
    var df = DOCKERFILES[order];
    var n = df.filter(function (s) { return s.kind !== 'META'; }).length;
    var html = '';
    var k = 0;
    df.forEach(function (s, i) {
      var r = lastResult && lastResult.order === order ? lastResult.rows[i] : null;
      var badge = s.kind === 'META' ? '<span class="badge META">metadata</span>'
        : r ? '<span class="badge ' + r.status + '">' + r.status + '</span>' : '<span class="badge">…</span>';
      var label = s.kind === 'META' ? s.text : '[' + (++k) + '/' + n + '] ' + s.text;
      html += '<div class="step">' + badge + '<span>' + label + '</span><span class="t">' +
        (r && s.kind !== 'META' ? r.time.toFixed(1) + 's' : '') + '</span></div>';
    });
    document.getElementById('steps').innerHTML = html;
    document.getElementById('order').textContent = 'Order: ' + order + ' (click to switch)';
    document.getElementById('pending').textContent = changed.length
      ? 'Changed since last build: ' + changed.join(', ') : '';
    document.getElementById('hist').textContent = hist.length ? 'Build history: ' + hist.join('  ·  ') : '';
  }

  function build() {
    var df = DOCKERFILES[order];
    var n = df.filter(function (s) { return s.kind !== 'META'; }).length;
    var parent = 'root';
    var rows = [];
    var total = OVERHEAD;
    var lines = [];
    var k = 0;
    df.forEach(function (s) {
      if (s.kind === 'META') { rows.push(null); return; }
      k++;
      var label = '[' + k + '/' + n + '] ' + s.text;
      var row;
      if (s.kind === 'FROM') {
        row = basePulled ? { status: 'BASE', time: 0 } : { status: 'RUN', time: BASE_PULL };
        basePulled = true;
        lines.push(' => ' + '[' + k + '/' + n + '] FROM docker.io/library/node:22-slim' + '   ' + row.time.toFixed(1) + 's');
        parent = 'from-node22slim';
      } else {
        var key = parent + '>' + s.text + '#' + inputs(s.kind);
        if (cache[key]) {
          row = { status: 'CACHED', time: 0 };
          lines.push(' => CACHED ' + label + '   0.0s');
        } else {
          row = { status: 'RUN', time: TIMES[s.kind] };
          cache[key] = true;
          lines.push(' => ' + label + '   ' + row.time.toFixed(1) + 's');
        }
        parent = key;
      }
      total += row.time;
      rows.push(row);
    });
    buildNo++;
    var ran = rows.filter(function (r) { return r && r.status === 'RUN'; }).length;
    console.log('$ docker build -t myapp .   (' + order + ' order' + (changed.length ? ', changed: ' + changed.join(', ') : '') + ')');
    console.log('[+] Building ' + total.toFixed(1) + 's FINISHED');
    lines.forEach(function (l) { console.log(l); });
    console.log(' => exporting to image');
    lastResult = { order: order, rows: rows };
    hist.push('#' + buildNo + ' ' + total.toFixed(1) + 's');
    document.getElementById('sum').textContent = 'Build #' + buildNo + ': ' + total.toFixed(1) + 's total, ' +
      ran + ' step' + (ran === 1 ? '' : 's') + ' executed, ' + (n - ran) + ' reused.';
    changed = [];
    render();
  }

  function edit(what, file) {
    files[what]++;
    if (changed.indexOf(file) === -1) changed.push(file);
    console.log('edited ' + file + ' (not built yet)');
    render();
  }

  document.getElementById('src').onclick = function () { edit('src', 'src/app.js'); };
  document.getElementById('pkg').onclick = function () { edit('pkg', 'package.json'); };
  document.getElementById('readme').onclick = function () { edit('readme', 'README.md'); };
  document.getElementById('build').onclick = build;
  document.getElementById('order').onclick = function () {
    order = order === 'naive' ? 'optimized' : 'naive';
    console.log('Dockerfile switched to ' + order + ' order');
    render();
  };
  document.getElementById('prune').onclick = function () {
    cache = {};
    console.log('$ docker builder prune -f   → build cache cleared (the base image stays)');
    render();
  };

  render();
</script>`,
          explain: `
            <details>
              <summary>The problem: one line of code, a full npm ci</summary>
              <p>In the <strong>naive</strong> order, <code>COPY . .</code> copies <em>everything</em>, including your source.
              Edit any source file and that COPY's checksum changes, so it misses the cache. By the domino rule, <code>RUN npm ci</code>
              right after it has to run again, even though your dependencies didn't change at all.</p>
              <table>
                <tr><th>Build</th><th>Change</th><th>Naive order</th></tr>
                <tr><td>#1</td><td>(first build)</td><td>everything runs: <strong>61.9s</strong></td></tr>
                <tr><td>#2</td><td>edit src/app.js</td><td>COPY . . → npm ci → build all rerun: <strong>49.4s</strong></td></tr>
              </table>
            </details>
            <details>
              <summary>Step by step: the same edits in both orders</summary>
              <p>Click <strong>▶ docker build</strong> once, then <strong>✎ edit src/app.js</strong> and build again. Then switch the
              order, build once to fill the cache, and repeat. The console prints BuildKit-style lines like
              <code>=&gt; CACHED [4/6] RUN npm ci   0.0s</code>.</p>
              <table>
                <tr><th>Action</th><th>Naive: steps executed</th><th>Naive time</th><th>Optimized: steps executed</th><th>Optimized time</th></tr>
                <tr><td>first build</td><td>all 5 (incl. base pull 12.4s)</td><td>61.9s</td><td>all 6</td><td>62.0s from scratch (49.5s right after switching from naive: FROM and WORKDIR are reused)</td></tr>
                <tr><td>build again, no change</td><td>none</td><td>0.5s</td><td>none</td><td>0.5s</td></tr>
                <tr><td>edit src/app.js</td><td>COPY . ., npm ci, npm run build</td><td>49.4s</td><td>COPY . ., npm run build</td><td><strong>8.1s</strong></td></tr>
                <tr><td>edit README.md</td><td>COPY . ., npm ci, npm run build</td><td>49.4s</td><td>COPY . ., npm run build</td><td>8.1s</td></tr>
                <tr><td>edit package.json</td><td>COPY . ., npm ci, npm run build</td><td>49.4s</td><td>COPY package*.json, npm ci, COPY . ., build</td><td>49.5s</td></tr>
              </table>
              <p>The base image rows show <strong>BASE</strong> once <code>node:22-slim</code> is local: it isn't rebuilt, just reused.
              <code>CMD</code> shows <strong>metadata</strong>: it never takes build time. The 0.5s is fixed overhead (loading
              metadata, exporting the image).</p>
            </details>
            <details>
              <summary>Key lines explained ①②③</summary>
              <pre><code class="language-docker">COPY package*.json ./   # ① cache key = checksum of package.json + package-lock.json only
RUN npm ci              # ② cache key = the command + the layer below: unchanged → CACHED
COPY . .                # ③ cache key includes EVERY copied file: source edits miss here
RUN npm run build       #    ...and the domino rule rebuilds only from here down</code></pre>
              <ol>
                <li><strong>①</strong> This COPY only sees the two package files, so editing <code>src/app.js</code> doesn't change its key.</li>
                <li><strong>②</strong> Its parent is unchanged, so the 41-second install is reused.</li>
                <li><strong>③</strong> Source changes are caught here, <em>after</em> the expensive step. Only the cheap steps below rerun.</li>
              </ol>
            </details>
            <details>
              <summary>Try this / common mistakes</summary>
              <ul>
                <li><strong>Edit README.md</strong> in the optimized order: <code>COPY . .</code> still misses, because the README
                is in the build context. Adding <code>README.md</code> to <code>.dockerignore</code> would keep it out of the key
                (next lesson).</li>
                <li><strong>Switch order</strong> after building: the steps that differ, and everything below them, rebuild,
                because the cache keys depend on the exact instruction text and its position in the chain.</li>
                <li>Click <strong>builder prune</strong> and build: every step runs again, but the base image doesn't need pulling.</li>
              </ul>
              <div class="warn">Don't "fix" a slow build with <code>--no-cache</code> by default. It throws away all of this.
              Use it only when you really need fresh <code>RUN</code> results (for example to pick up new OS security patches).</div>
            </details>
          `,
        },
        {
          title: 'Real BuildKit output: before and after reordering',
          runnable: false,
          lang: 'bash',
          code: String.raw`# Naive order, after editing src/app.js
$ docker build -t myapp .
[+] Building 49.7s (11/11) FINISHED
 => [internal] load build context                          0.1s
 => [1/5] FROM docker.io/library/node:22-slim@sha256:…     0.0s
 => CACHED [2/5] WORKDIR /app                              0.0s
 => [3/5] COPY . .                                         0.4s
 => [4/5] RUN npm ci                                      41.3s
 => [5/5] RUN npm run build                                7.2s
 => exporting to image                                     0.6s

# Optimized order, after editing src/app.js
$ docker build -t myapp .
[+] Building 8.3s (12/12) FINISHED
 => [internal] load build context                          0.1s
 => [1/6] FROM docker.io/library/node:22-slim@sha256:…     0.0s
 => CACHED [2/6] WORKDIR /app                              0.0s
 => CACHED [3/6] COPY package*.json ./                     0.0s
 => CACHED [4/6] RUN npm ci                                0.0s
 => [5/6] COPY . .                                         0.4s
 => [6/6] RUN npm run build                                7.2s
 => exporting to image                                     0.6s

# See the layers (and their sizes) of the result
$ docker history myapp --format 'table {{.CreatedBy}}\t{{.Size}}' | head -n 6
CREATED BY                                   SIZE
CMD ["node" "dist/server.js"]                0B
RUN /bin/sh -c npm run build # buildkit      2.1MB
COPY . . # buildkit                          3.4MB
RUN /bin/sh -c npm ci # buildkit             312MB
COPY package*.json ./ # buildkit             412kB`,
        },
      ],
      quiz: [
        {
          q: 'Step 3 of 6 misses the cache. Which steps are rebuilt?',
          options: [
            'Steps 3, 4, 5 and 6',
            'Only step 3',
            'All 6 steps',
            'Only the slowest step',
          ],
          answer: 0,
          why: 'Each layer sits on the one below it. Once a step misses, every later step must rerun on top of the new layer.',
        },
        {
          q: 'How does BuildKit decide whether <code>COPY . .</code> can be reused?',
          options: [
            'It compares file modification times',
            'It checks the checksums of the copied files',
            'It always reuses COPY steps',
            'It never caches COPY',
          ],
          answer: 1,
          why: 'COPY/ADD cache keys include a checksum of the file contents being copied.',
        },
        {
          q: '<code>RUN apt-get update</code> is on its own line and cached from 3 months ago. What’s the risk?',
          options: [
            'None, BuildKit re-downloads the index automatically',
            'The build fails immediately',
            'apt-get update is never cached',
            'A later apt-get install uses a stale package index (old versions, or 404s)',
          ],
          answer: 3,
          why: 'RUN is cached by command text, not by what it downloads. Combine update && install in one RUN.',
        },
        {
          q: 'Which order makes source-code edits cheapest for a Node app?',
          options: [
            'COPY . . → RUN npm ci',
            'RUN npm ci → COPY package*.json ./',
            'COPY package*.json ./ → RUN npm ci → COPY . .',
            'COPY . . → COPY package*.json ./ → RUN npm ci',
          ],
          answer: 2,
          why: 'Install dependencies from the package files alone, then copy the frequently-changing source afterwards.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Every code change reinstalls all npm packages with this Dockerfile. Edit it in the box below so that
          <strong>dependencies are installed from the package files first</strong> and the source is copied afterwards.
          Then click <strong>Check</strong>.</p>`,
        starter: checker(`FROM node:22-slim
WORKDIR /app
COPY . .
RUN npm ci
RUN npm run build
CMD ["node", "dist/server.js"]`, ORDER_RULES),
        hint: 'Add COPY package*.json ./ before RUN npm ci, and move COPY . . below npm ci (keep npm run build after it).',
        solution: checker(`FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]`, ORDER_RULES),
      },
    },

    // =========================================================================
    {
      id: 'multi-stage-builds',
      section: 'Images & Dockerfiles',
      title: 'Multi-stage builds',
      explain: `
        <p>Building an app needs a lot of stuff: compilers, TypeScript, test tools, devDependencies. <em>Running</em> it needs
        much less. A single-stage image ships all of it, so it's bigger, slower to pull, and has more software for attackers to poke at.</p>

        <h3>The idea: build in one stage, ship another</h3>
        <p>A Dockerfile can have several <code>FROM</code> lines. Each starts a new <strong>stage</strong> with a fresh filesystem.
        Only the <strong>last stage</strong> becomes your image (unless you pick another with <code>--target</code>). You pull the
        build output out of an earlier stage with <code>COPY --from=&lt;stage&gt;</code>.</p>
        <p><strong>Analogy:</strong> a workshop and a shop window. You build the furniture in a workshop full of saws and sawdust,
        then carry just the finished chair to the shop. The saws don't come along.</p>

        <pre><code class="language-docker">FROM node:22 AS build                  # ① full toolchain
WORKDIR /app
COPY package*.json ./
RUN npm ci                             #    includes devDependencies (typescript…)
COPY . .
RUN npm run build                      #    produces /app/dist

FROM node:22-slim AS runtime           # ② fresh, small base
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev                  # ③ production deps only
COPY --from=build /app/dist ./dist     # ④ just the compiled output
USER node
CMD ["node", "dist/server.js"]</code></pre>

        <h3>Rough sizes (uncompressed, approximately)</h3>
        <table>
          <tr><th>Base image</th><th>Approx. size</th><th>Notes</th></tr>
          <tr><td><code>node:22</code></td><td>~1.1 GB</td><td>Full Debian + build tools (python3, make, g++, git)</td></tr>
          <tr><td><code>node:22-slim</code></td><td>~240 MB</td><td>Minimal Debian, glibc. A safe default runtime</td></tr>
          <tr><td><code>node:22-alpine</code></td><td>~155 MB</td><td>Alpine uses musl, not glibc. Some native modules behave differently</td></tr>
          <tr><td>distroless (e.g. <code>gcr.io/distroless/nodejs22-debian12</code>)</td><td>similar to slim or smaller</td><td>No shell, no package manager. Hardest to debug, smallest attack surface</td></tr>
        </table>
        <p>Exact numbers change with every release. Check with <code>docker images</code>.</p>

        <div class="tip">Build stages also run <strong>in parallel</strong> when they don't depend on each other, and
        <code>docker build --target build .</code> stops at a named stage. That's handy for a "test" stage in CI.</div>

        <div class="warn">The same idea works for any language. For Go or Rust you can often ship a static binary on
        <code>scratch</code> or distroless in under 20 MB. For Java, build with a JDK image and run on a JRE image.</div>
      `,
      examples: [
        {
          title: 'What ends up in the final image?',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .bar { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin-bottom: 8px; }
  button { padding: 4px 10px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; font-size: 12px; }
  button.sel { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  button.primary { background: #16a34a; color: #fff; border-color: #16a34a; }
  select { font-size: 12px; padding: 3px; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .stage { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; transition: opacity .3s; }
  .stage h4 { margin: 0 0 4px; font-size: 12.5px; }
  .stage.discard { opacity: .55; border-style: dashed; }
  .item { display: grid; grid-template-columns: 1fr 64px; font-size: 12px; padding: 2px 4px; border-radius: 4px; margin: 2px 0; }
  .item .sz { text-align: right; font-family: ui-monospace, Menlo, monospace; color: #4b5563; }
  .ship { background: #dcfce7; }
  .tool { background: #fee2e2; }
  .moved { background: #dbeafe; }
  .bars { margin-top: 8px; background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; }
  .bar2 { height: 14px; border-radius: 3px; background: #f87171; transition: width .4s; }
  .bar2.small { background: #34d399; }
  .lbl { font-size: 12px; margin-top: 3px; }
  .muted { color: #9ca3af; font-size: 12px; }
</style>

<div class="bar">
  <button id="single">single-stage</button>
  <button id="multi" class="sel">multi-stage</button>
  <label>runtime base
    <select id="base">
      <option value="slim">node:22-slim (~240 MB)</option>
      <option value="alpine">node:22-alpine (~155 MB)</option>
    </select>
  </label>
  <button id="build" class="primary">▶ docker build</button>
</div>
<div class="cols">
  <div class="stage" id="s1"></div>
  <div class="stage" id="s2"></div>
</div>
<div class="bars" id="bars"></div>

<script>
  var mode = 'multi';
  var BASES = { slim: { name: 'node:22-slim', size: 240 }, alpine: { name: 'node:22-alpine', size: 155 } };
  var BUILD_ITEMS = [
    { name: 'node:22 base (Debian, python3, make, g++, git)', size: 1100, kind: 'tool' },
    { name: 'node_modules: dev + prod deps (typescript, jest, …)', size: 310, kind: 'tool' },
    { name: 'src/ TypeScript source + tests', size: 4, kind: 'tool' },
    { name: 'dist/ compiled JavaScript', size: 2, kind: 'ship' },
  ];
  var SINGLE_TOTAL = 1100 + 310 + 4 + 2;

  function fmt(mb) { return mb >= 1000 ? (mb / 1000).toFixed(2) + ' GB' : mb + ' MB'; }
  function items(list) {
    return list.map(function (it) {
      return '<div class="item ' + it.kind + '"><span>' + it.name + '</span><span class="sz">' + fmt(it.size) + '</span></div>';
    }).join('');
  }
  function runtimeItems() {
    var b = BASES[document.getElementById('base').value];
    return [
      { name: b.name + ' base', size: b.size, kind: 'ship' },
      { name: 'node_modules: prod deps only (npm ci --omit=dev)', size: 45, kind: 'ship' },
      { name: 'dist/ ← COPY --from=build', size: 2, kind: 'moved' },
    ];
  }
  function total() {
    if (mode === 'single') return SINGLE_TOTAL;
    return runtimeItems().reduce(function (a, it) { return a + it.size; }, 0);
  }

  function render() {
    var s1 = document.getElementById('s1');
    var s2 = document.getElementById('s2');
    if (mode === 'single') {
      s1.className = 'stage';
      s1.innerHTML = '<h4>Only stage = final image (FROM node:22)</h4>' + items(BUILD_ITEMS) +
        '<div class="muted">Red = only needed to BUILD, but shipped anyway.</div>';
      s2.className = 'stage discard';
      s2.innerHTML = '<h4>(no second stage)</h4><div class="muted">Switch to multi-stage to separate build and runtime.</div>';
    } else {
      s1.className = 'stage discard';
      s1.innerHTML = '<h4>Stage "build" (FROM node:22 AS build): discarded</h4>' + items(BUILD_ITEMS) +
        '<div class="muted">Used during the build, then thrown away.</div>';
      s2.className = 'stage';
      s2.innerHTML = '<h4>Stage "runtime" = final image</h4>' + items(runtimeItems()) +
        '<div class="muted">Blue = copied out of the build stage.</div>';
    }
    document.getElementById('base').disabled = mode === 'single';
    var t = total();
    document.getElementById('bars').innerHTML =
      '<div class="lbl">single-stage: ' + fmt(SINGLE_TOTAL) + '</div><div class="bar2" style="width:100%"></div>' +
      '<div class="lbl">this build (' + mode + '): <b>' + fmt(t) + '</b></div>' +
      '<div class="bar2' + (mode === 'multi' ? ' small' : '') + '" style="width:' + (t / SINGLE_TOTAL * 100) + '%"></div>' +
      '<div class="muted">Approximate, uncompressed sizes.</div>';
    document.getElementById('single').className = mode === 'single' ? 'sel' : '';
    document.getElementById('multi').className = mode === 'multi' ? 'sel' : '';
  }

  function build() {
    var b = BASES[document.getElementById('base').value];
    console.log('$ docker build -t myapp:' + mode + ' .');
    if (mode === 'single') {
      ['[1/6] FROM docker.io/library/node:22', '[2/6] WORKDIR /app', '[3/6] COPY package*.json ./',
        '[4/6] RUN npm ci', '[5/6] COPY . .', '[6/6] RUN npm run build'].forEach(function (l) { console.log(' => ' + l); });
    } else {
      ['[build 1/6] FROM docker.io/library/node:22', '[runtime 1/6] FROM docker.io/library/' + b.name,
        '[build 2/6] WORKDIR /app', '[runtime 2/6] WORKDIR /app', '[build 3/6] COPY package*.json ./',
        '[runtime 3/6] COPY package*.json ./', '[build 4/6] RUN npm ci', '[runtime 4/6] RUN npm ci --omit=dev',
        '[build 5/6] COPY . .', '[build 6/6] RUN npm run build', '[runtime 5/6] COPY --from=build /app/dist ./dist',
        '[runtime 6/6] USER node'].forEach(function (l) { console.log(' => ' + l); });
      console.log('    (build and runtime steps run in parallel where they do not depend on each other)');
    }
    console.log('$ docker images myapp');
    console.log('REPOSITORY   TAG       SIZE');
    console.log('myapp        ' + (mode + '      ').slice(0, 10) + fmt(total()));
  }

  document.getElementById('single').onclick = function () { mode = 'single'; render(); console.log('mode: single-stage'); };
  document.getElementById('multi').onclick = function () { mode = 'multi'; render(); console.log('mode: multi-stage'); };
  document.getElementById('base').onchange = function () { render(); console.log('runtime base: ' + BASES[this.value].name); };
  document.getElementById('build').onclick = build;

  render();
</script>`,
          explain: `
            <details>
              <summary>The problem: the build toolchain ships to production</summary>
              <p>In <strong>single-stage</strong> mode, the final image is simply the stage that did the build. So it contains
              the full <code>node:22</code> base with compilers, all devDependencies, your TypeScript source and tests. The only
              thing production needs, <code>dist/</code> (green), is about 2 MB of it.</p>
              <ul>
                <li><strong>Size:</strong> ≈ 1.42 GB to push, store and pull on every deploy and every new node.</li>
                <li><strong>Security:</strong> every extra package (git, gcc, python…) is more CVEs for scanners to report and
                more tools for an attacker who gets in.</li>
              </ul>
            </details>
            <details>
              <summary>Step by step: what "▶ docker build" logs in multi-stage mode</summary>
              <table>
                <tr><th>Console line</th><th>What happens</th></tr>
                <tr><td><code>[build 1/6] FROM docker.io/library/node:22</code></td><td>Build stage starts from the full image</td></tr>
                <tr><td><code>[runtime 1/6] FROM docker.io/library/node:22-slim</code></td><td>Runtime stage starts <em>in parallel</em> from the small base</td></tr>
                <tr><td><code>[build 4/6] RUN npm ci</code></td><td>All deps, including typescript, installed in the build stage</td></tr>
                <tr><td><code>[runtime 4/6] RUN npm ci --omit=dev</code></td><td>Only production deps in the runtime stage (≈ 45 MB)</td></tr>
                <tr><td><code>[build 6/6] RUN npm run build</code></td><td>TypeScript compiled to <code>/app/dist</code></td></tr>
                <tr><td><code>[runtime 5/6] COPY --from=build /app/dist ./dist</code></td><td>Must wait for build 6/6. Copies the output across (blue item)</td></tr>
                <tr><td><code>myapp  multi  287 MB</code></td><td>slim base 240 + prod deps 45 + dist 2. With alpine: <strong>202 MB</strong></td></tr>
              </table>
              <p>Switch to <strong>single-stage</strong> and build: <code>myapp  single  1.42 GB</code>. Same app, about 5–7× bigger.</p>
            </details>
            <details>
              <summary>Key lines explained ①②③④</summary>
              <ol>
                <li><strong>① <code>FROM node:22 AS build</code></strong>: <code>AS</code> names the stage so later stages can refer to it.
                The full image is fine here because it never ships.</li>
                <li><strong>② <code>FROM node:22-slim AS runtime</code></strong>: a new <code>FROM</code> starts with an empty
                filesystem. Nothing from the build stage comes along unless you copy it.</li>
                <li><strong>③ <code>npm ci --omit=dev</code></strong>: reinstall only production dependencies. (Alternative:
                <code>npm prune --omit=dev</code> in the build stage, then copy <code>node_modules</code> across.)</li>
                <li><strong>④ <code>COPY --from=build /app/dist ./dist</code></strong>: the path is inside the <em>build stage's</em>
                filesystem, not your laptop.</li>
              </ol>
            </details>
            <details>
              <summary>Common mistakes</summary>
              <div class="warn">
                <ul>
                  <li><strong>Forgetting runtime deps:</strong> copying only <code>dist/</code> without any <code>node_modules</code>
                  → <code>Error: Cannot find module 'express'</code> at startup.</li>
                  <li><strong>Native modules across libc:</strong> building <code>node_modules</code> on Debian (glibc) and copying
                  them into Alpine (musl) can crash. Install deps in the runtime stage, or use the same base family for both stages.</li>
                  <li><strong>Wrong stage name or path</strong> in <code>--from</code>: the build fails with "not found". Check
                  <code>WORKDIR</code> in the build stage.</li>
                </ul>
              </div>
            </details>
          `,
        },
        {
          title: 'Multi-stage for a compiled language (Go)',
          runnable: false,
          lang: 'docker',
          code: String.raw`# syntax=docker/dockerfile:1
FROM golang:1.25 AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Static binary: no libc needed at runtime
RUN CGO_ENABLED=0 go build -o /out/server ./cmd/server

# Distroless "static": CA certs + tzdata + a nonroot user, no shell
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/server /server
USER nonroot:nonroot
ENTRYPOINT ["/server"]

# Result: roughly 10-20 MB instead of ~800 MB+ for golang:1.25`,
        },
      ],
      quiz: [
        {
          q: 'In a multi-stage Dockerfile, which stage becomes the image by default?',
          options: ['The first stage', 'The largest stage', 'The last stage', 'All stages are merged'],
          answer: 2,
          why: 'The final FROM block is the output image, unless you pick another with --target.',
        },
        {
          q: 'What does <code>COPY --from=build /app/dist ./dist</code> copy from?',
          options: [
            'The filesystem of the stage named build',
            'The build context on your machine',
            'A registry image called build',
            'The previous container run',
          ],
          answer: 0,
          why: '--from refers to an earlier stage (or an image). The source path is inside that stage’s filesystem.',
        },
        {
          q: 'Your multi-stage image starts and immediately fails with <code>Cannot find module \'express\'</code>. Likely cause?',
          options: [
            'The build stage is too small',
            'The runtime stage has no production node_modules',
            'EXPOSE is missing',
            'The image needs to be single-stage',
          ],
          answer: 1,
          why: 'Only dist was copied. Install production deps in the runtime stage (npm ci --omit=dev) or copy pruned node_modules.',
        },
        {
          q: 'Main benefits of multi-stage builds? (pick the best answer)',
          options: [
            'Faster containers at runtime',
            'They remove the need for a registry',
            'They make images mutable',
            'Smaller images and fewer tools/packages exposed in production',
          ],
          answer: 3,
          why: 'Smaller images pull faster and have a smaller attack surface. Runtime speed of the app is usually unchanged.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Convert this single-stage TypeScript Dockerfile to a <strong>multi-stage</strong> build: a named build stage
          on <code>node:22</code> that compiles, and a final stage on a small base (<code>node:22-slim</code>) with production
          dependencies only and the compiled <code>dist/</code>. Edit it in the box below and click <strong>Check</strong>.</p>`,
        starter: checker(`FROM node:22
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "dist/server.js"]`, MULTI_RULES),
        hint: 'Add "AS build" to the first FROM and remove its CMD. Then add FROM node:22-slim, WORKDIR /app, COPY package*.json ./, RUN npm ci --omit=dev, COPY --from=build /app/dist ./dist and CMD ["node", "dist/server.js"].',
        solution: checker(`FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
CMD ["node", "dist/server.js"]`, MULTI_RULES),
      },
    },

    // =========================================================================
    {
      id: 'build-context-dockerignore',
      section: 'Images & Dockerfiles',
      title: 'Build context & .dockerignore',
      explain: `
        <p>The <code>.</code> at the end of <code>docker build -t myapp .</code> isn't decoration. It's the <strong>build
        context</strong>: the directory whose files the build is allowed to see. <code>COPY</code> can only copy from the
        context. It can't reach <code>../secrets</code> or your home directory.</p>

        <h3>Why the context matters</h3>
        <ul>
          <li><strong>Speed:</strong> BuildKit transfers context files to the builder (which may be a remote machine or a VM on
            Docker Desktop). Hundreds of MB of <code>node_modules</code> and <code>.git</code> slow every build.</li>
          <li><strong>Cache:</strong> <code>COPY . .</code> checksums everything it copies. A changed log file or git object busts
            the cache for no reason.</li>
          <li><strong>Security:</strong> <code>COPY . .</code> will happily bake <code>.env</code>, SSH keys or cloud credentials
            into an image layer, where anyone who can pull the image can read them.</li>
          <li><strong>Correctness:</strong> copying your laptop's <code>node_modules</code> (built for macOS) over the ones
            <code>npm ci</code> just installed for Linux can break native modules.</li>
        </ul>

        <h3>.dockerignore</h3>
        <p>A <code>.dockerignore</code> file in the root of the context lists what to leave out. One pattern per line:</p>
        <pre><code class="language-bash"># .dockerignore
**/node_modules
.git
.env
.env.*
!.env.example      # "!" re-includes something an earlier line excluded
coverage
**/*.log
Dockerfile*        # optional: the builder still reads the Dockerfile</code></pre>
        <ul>
          <li>Patterns are matched from the <strong>context root</strong>. <code>node_modules</code> only matches the top-level
            one. Use <code>**/node_modules</code> for nested ones (monorepos).</li>
          <li>Matching a directory excludes everything inside it.</li>
          <li>The <strong>last matching line wins</strong>, which is how <code>!</code> exceptions work.</li>
        </ul>

        <div class="warn"><strong>Not the same as .gitignore.</strong> In <code>.gitignore</code>, <code>*.log</code> matches at any
        depth. In <code>.dockerignore</code>, <code>*.log</code> only matches files in the context root. Use <code>**/*.log</code>.</div>

        <div class="tip">With several Dockerfiles in one repo you can give each its own ignore file:
        <code>api.Dockerfile</code> + <code>api.Dockerfile.dockerignore</code> next to it. It's used instead of the root
        <code>.dockerignore</code> when you build with <code>-f api.Dockerfile</code>.</div>
      `,
      examples: [
        {
          title: '.dockerignore playground: what gets sent?',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .cols { display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px; }
  .card { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; }
  h4 { margin: 0 0 4px; font-size: 12.5px; }
  textarea { width: 100%; box-sizing: border-box; height: 170px; font-family: ui-monospace, Menlo, monospace; font-size: 12px;
    border: 1px solid #c7cdd8; border-radius: 5px; padding: 5px; background: #fff; color: #111827; }
  .presets button, #build { font-size: 11.5px; margin: 4px 3px 0 0; padding: 3px 8px; border: 1px solid #c7cdd8; border-radius: 5px;
    background: #fff; color: #1f2937; cursor: pointer; }
  #build { background: #4f46e5; color: #fff; border-color: #4f46e5; }
  .f { display: grid; grid-template-columns: 1fr 64px; font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; padding: 1px 4px; border-radius: 3px; }
  .f .sz { text-align: right; }
  .in { background: #dcfce7; }
  .out { color: #9ca3af; text-decoration: line-through; }
  .secret.in { background: #fecaca; color: #991b1b; font-weight: 700; }
  .total { margin-top: 6px; font-weight: 600; }
  .alert { color: #b91c1c; font-size: 12px; margin-top: 2px; }
</style>

<div class="cols">
  <div class="card">
    <h4>.dockerignore (type here)</h4>
    <textarea id="ig" spellcheck="false"></textarea>
    <div class="presets">
      <button data-p="empty">empty</button>
      <button data-p="gitstyle">.gitignore-style</button>
      <button data-p="good">good</button>
    </div>
    <button id="build">▶ docker build .</button>
  </div>
  <div class="card">
    <h4>Build context</h4>
    <div id="tree"></div>
    <div class="total" id="total"></div>
    <div class="alert" id="alert"></div>
  </div>
</div>

<script>
` + IGNORE_MATCHER + String.raw`

  var FILES = [
    { label: 'Dockerfile', path: 'Dockerfile', kb: 0.4 },
    { label: 'package.json', path: 'package.json', kb: 1.2 },
    { label: 'package-lock.json', path: 'package-lock.json', kb: 310 },
    { label: 'src/', path: 'src/server.js', kb: 9 },
    { label: 'README.md', path: 'README.md', kb: 4 },
    { label: 'node_modules/', path: 'node_modules/express/index.js', kb: 186000 },
    { label: 'packages/api/node_modules/', path: 'packages/api/node_modules/zod/index.js', kb: 42000 },
    { label: 'packages/api/src/', path: 'packages/api/src/index.js', kb: 6 },
    { label: 'packages/api/debug.log', path: 'packages/api/debug.log', kb: 3100 },
    { label: '.git/', path: '.git/HEAD', kb: 58000 },
    { label: '.env', path: '.env', kb: 0.3, secret: true },
    { label: '.env.local', path: '.env.local', kb: 0.2, secret: true },
    { label: '.env.example', path: '.env.example', kb: 0.2 },
    { label: 'coverage/', path: 'coverage/lcov.info', kb: 9200 },
    { label: 'logs/app.log', path: 'logs/app.log', kb: 24000 },
    { label: 'npm-debug.log', path: 'npm-debug.log', kb: 800 },
  ];
  var PRESETS = {
    empty: '',
    gitstyle: 'node_modules\n*.log\n.env',
    good: '**/node_modules\n.git\n.env\n.env.*\n!.env.example\ncoverage\n**/*.log',
  };

  function size(kb) { return kb >= 1000 ? (kb / 1000).toFixed(1) + 'MB' : kb + 'kB'; }

  function evaluate() {
    var rules = parseIgnore(document.getElementById('ig').value);
    var total = 0;
    var secrets = [];
    var html = '';
    FILES.forEach(function (f) {
      var out = isIgnored(rules, f.path);
      if (!out) total += f.kb;
      if (!out && f.secret) secrets.push(f.label);
      html += '<div class="f ' + (out ? 'out' : 'in') + (f.secret ? ' secret' : '') + '"><span>' + f.label +
        '</span><span class="sz">' + size(f.kb) + '</span></div>';
    });
    document.getElementById('tree').innerHTML = html;
    document.getElementById('total').textContent = 'Context sent to the builder: ' + size(Math.round(total * 10) / 10);
    document.getElementById('alert').textContent = secrets.length
      ? '⚠ ' + secrets.join(', ') + ' would be sent, and COPY . . would bake it into the image!' : '';
    return { total: total, secrets: secrets };
  }

  document.getElementById('ig').addEventListener('input', evaluate);
  var pb = document.querySelectorAll('[data-p]');
  for (var i = 0; i < pb.length; i++) {
    pb[i].onclick = function () {
      var p = this.getAttribute('data-p');
      document.getElementById('ig').value = PRESETS[p];
      var r = evaluate();
      console.log('preset "' + p + '": context ' + size(Math.round(r.total * 10) / 10) +
        (r.secrets.length ? ', secrets included: ' + r.secrets.join(', ') : ', no secrets'));
    };
  }
  document.getElementById('build').onclick = function () {
    var r = evaluate();
    var secs = Math.max(0.1, r.total / 40000);
    console.log('$ docker build -t myapp .');
    console.log(' => [internal] load .dockerignore                  0.0s');
    console.log(' => [internal] load build context                  ' + secs.toFixed(1) + 's');
    console.log(' => => transferring context: ' + size(Math.round(r.total * 10) / 10) + '   ' + secs.toFixed(1) + 's');
    if (r.secrets.length) console.log(' !! after COPY . . the image now contains: ' + r.secrets.join(', '));
  };

  document.getElementById('ig').value = PRESETS.empty;
  evaluate();
</script>`,
          explain: `
            <details>
              <summary>Try this: three presets, then your own</summary>
              <ol>
                <li><strong>empty</strong>: context 323.4MB. <code>.env</code> and <code>.env.local</code> are red: they'd end
                up in the image.</li>
                <li><strong>.gitignore-style</strong> (<code>node_modules</code>, <code>*.log</code>, <code>.env</code>): better,
                but <code>packages/api/node_modules/</code>, <code>logs/app.log</code> and <code>packages/api/debug.log</code>
                are still sent, because those patterns only match at the root. <code>.env.local</code> is still red.</li>
                <li><strong>good</strong>: only the source, package files, <code>README.md</code> and <code>.env.example</code>
                remain: 330.8kB.</li>
              </ol>
              <p>Then type your own patterns into the box. Try <code>*.md</code>, or add <code>!README.md</code> after a
              <code>*.md</code> line and watch "last match wins".</p>
            </details>
            <details>
              <summary>Common mistake: "I deleted .env in a later step, so it's fine"</summary>
              <div class="warn">If <code>COPY . .</code> copies <code>.env</code>, it's stored in that layer. A later
              <code>RUN rm .env</code> only hides it in a <em>new</em> layer. The original layer still ships with the image and
              can be extracted by anyone who can pull it. Keep secrets out of the context with <code>.dockerignore</code>, and
              use BuildKit secret mounts for build-time credentials (see <em>Image best practices</em>).</div>
            </details>
          `,
        },
        {
          title: 'Context in practice',
          runnable: false,
          lang: 'bash',
          code: String.raw`# The context is the LAST argument (here: the current directory)
$ docker build -t myapp .

# Different Dockerfile, same context
$ docker build -f docker/api.Dockerfile -t api .

# Context can be a subfolder: COPY paths are then relative to ./services/web
$ docker build -t web ./services/web

# Without .dockerignore: the transfer line gives it away
 => [internal] load build context                          9.8s
 => => transferring context: 331.62MB                      9.7s

# With a good .dockerignore
 => [internal] load build context                          0.1s
 => => transferring context: 336.10kB                      0.0s

# COPY can't escape the context:
#   COPY ../shared ./shared
#   ERROR: failed to compute cache key: "/shared": not found`,
        },
      ],
      quiz: [
        {
          q: 'In <code>docker build -t app ./web</code>, what is <code>./web</code>?',
          options: ['The output folder', 'The build context: the files the build can COPY from', 'The Dockerfile name', 'The image tag'],
          answer: 1,
          why: 'The last argument is the context. COPY paths are relative to it and can’t escape it.',
        },
        {
          q: 'Your .dockerignore has <code>*.log</code>. Is <code>logs/app.log</code> excluded?',
          options: ['Yes, like .gitignore', 'No, *.log only matches at the context root. Use **/*.log', 'Only on Linux', 'Only if logs/ is empty'],
          answer: 1,
          why: '.dockerignore patterns are anchored to the context root, unlike .gitignore.',
        },
        {
          q: 'How do you exclude all <code>.env*</code> files but keep <code>.env.example</code>?',
          options: [
            '.env* then !.env.example',
            '!.env.example then .env*',
            'Only .env.example',
            'It’s impossible',
          ],
          answer: 0,
          why: 'The last matching line wins, so the ! exception has to come after the broader exclusion.',
        },
        {
          q: 'Why exclude <code>node_modules</code> when the Dockerfile runs <code>npm ci</code> anyway?',
          options: [
            'It’s required by npm',
            'Docker can’t copy folders named node_modules',
            'Smaller/faster context, no cache busting, and host-built native modules don’t overwrite the Linux ones',
            'To make the image mutable',
          ],
          answer: 2,
          why: 'Local node_modules are big, change often, and may be compiled for a different OS/CPU.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Write a <code>.dockerignore</code> for a monorepo in the box below (one pattern per line), then click
          <strong>Check</strong>. The checker tests real paths such as <code>packages/api/node_modules/zod/index.js</code>,
          <code>logs/app.log</code>, <code>.env.local</code> and <code>src/server.js</code> against your patterns.</p>
          <ul>
            <li>exclude every <code>node_modules</code> (nested too), <code>.git</code>, <code>coverage</code></li>
            <li>exclude <code>.env</code> and every <code>.env.*</code>, but keep <code>.env.example</code></li>
            <li>exclude <code>.log</code> files at any depth</li>
            <li>don't exclude source or package files</li>
          </ul>`,
        starter: checker(`# .dockerignore: one pattern per line
node_modules
*.log`, IGNORE_RULES),
        hint: 'Use **/ to match at any depth (**/node_modules, **/*.log). Put !.env.example AFTER .env.* because the last matching line wins.',
        solution: checker(`# .dockerignore: one pattern per line
**/node_modules
.git
coverage
.env
.env.*
!.env.example
**/*.log`, IGNORE_RULES),
      },
    },

    // =========================================================================
    {
      id: 'tags-and-registries',
      section: 'Images & Dockerfiles',
      title: 'Tags, digests & registries',
      explain: `
        <p>Images live in <strong>registries</strong>: Docker Hub, GitHub Container Registry (GHCR), AWS ECR, Google Artifact
        Registry, Azure ACR, or a self-hosted one like Harbor. You <code>docker push</code> to them and
        <code>docker pull</code> (or Kubernetes pulls) from them.</p>

        <h3>Anatomy of an image reference</h3>
        <pre><code class="language-bash">ghcr.io/acme/api:1.4.2@sha256:3bfc2695…
└─ ①  ─┘└─ ② ──┘└③─┘ └────── ④ ──────┘
① registry host   (omitted → docker.io)
② repository      (docker.io official images live under library/, e.g. library/nginx)
③ tag             (omitted → latest)
④ digest          (optional; content hash of the manifest, overrides the tag)</code></pre>
        <p>So <code>nginx</code> really means <code>docker.io/library/nginx:latest</code>.</p>

        <h3>Tags are sticky notes; digests are fingerprints</h3>
        <ul>
          <li>A <strong>tag</strong> is a movable pointer. Pushing a new image with the same tag just moves the pointer. The old
            image is still there by digest, but the tag now means something else.</li>
          <li><strong><code>latest</code> is not special.</strong> It's just the default tag name when you don't give one. It doesn't
            mean "newest" (nobody forces anyone to update it), and it changes under your feet whenever someone pushes.</li>
          <li>A <strong>digest</strong> (<code>sha256:…</code>) is the hash of the image's manifest. Same digest = byte-for-byte
            the same image, forever. It can't be moved.</li>
        </ul>

        <div class="warn"><strong>Why it matters:</strong> if two servers pull <code>myapp:latest</code> an hour apart, they can run
        different code. With Kubernetes this happens naturally: a pod rescheduled onto a new node pulls again. Deploy with an
        immutable version tag (<code>myapp:1.4.2</code>, or a git SHA) and, for maximum certainty, a digest.</div>

        <h3>Pushing</h3>
        <pre><code class="language-bash">docker build -t ghcr.io/acme/api:1.4.2 .
docker tag ghcr.io/acme/api:1.4.2 ghcr.io/acme/api:latest   # a second name, same image ID
docker login ghcr.io
docker push ghcr.io/acme/api:1.4.2
docker push ghcr.io/acme/api:latest                          # layers already exist → fast</code></pre>

        <div class="tip">Multi-architecture images: a tag like <code>nginx:1.27</code> points to an <em>image index</em> listing
        one manifest per platform (amd64, arm64…). Your machine pulls the matching one. That's why the digest shown by
        <code>docker pull</code> (the index) can differ from the one inside <code>docker image inspect</code> on some setups.
        <code>docker buildx imagetools inspect nginx:1.27</code> shows the whole thing.</div>
      `,
      examples: [
        {
          title: 'Tag mutability vs digest pinning',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .bar { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 8px; }
  button { padding: 4px 8px; border: 1px solid #c7cdd8; border-radius: 6px; background: #fff; color: #1f2937; cursor: pointer; font-size: 11.5px; }
  button.push { border-color: #7c3aed; color: #5b21b6; }
  button.pull { border-color: #0369a1; color: #075985; }
  .cols { display: grid; grid-template-columns: 1fr 1.2fr; gap: 10px; }
  .card { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; }
  h4 { margin: 0 0 4px; font-size: 12.5px; }
  table { border-collapse: collapse; width: 100%; font-size: 11.5px; font-family: ui-monospace, Menlo, monospace; }
  td, th { text-align: left; padding: 3px 4px; border-bottom: 1px solid #eef0f4; }
  .v1 { background: #dbeafe; }
  .v2 { background: #dcfce7; }
  .v3 { background: #fef3c7; }
  .ver { font-weight: 700; padding: 0 4px; border-radius: 3px; }
  .alert { color: #b91c1c; font-weight: 600; font-size: 12px; margin-top: 6px; min-height: 16px; }
  .muted { color: #9ca3af; }
</style>

<div class="bar">
  <button class="push" id="p1">① push v1 as :1.0 + :latest</button>
  <button class="push" id="p2">② push v2 as :1.1 + :latest</button>
  <button class="push" id="p3">③ re-push :1.0 (hotfix v3)</button>
</div>
<div class="bar">
  <button class="pull" data-s="a" data-ref="latest">server-a: pull :latest</button>
  <button class="pull" data-s="b" data-ref="latest">server-b: pull :latest</button>
  <button class="pull" data-s="c" data-ref="1.0">server-c: pull :1.0</button>
  <button class="pull" data-s="d" data-ref="digest">server-d: pull @sha256 (v1)</button>
  <button id="reset">Reset</button>
</div>
<div class="cols">
  <div class="card">
    <h4>Registry: docker.io/myorg/api</h4>
    <table id="reg"></table>
  </div>
  <div class="card">
    <h4>Servers</h4>
    <table id="srv"></table>
    <div class="alert" id="alert"></div>
  </div>
</div>

<script>
  var BUILDS = {
    v1: '3bfc269594ef649228e9a74bab00f042efc91d5acc6fbee31a382e80d42388fe',
    v2: 'fb04dcb6970e4c3d1873de51fd5a50d7bb46b3383113602665c350ec40b5f990',
    v3: 'e0d2747b9ab7abb6eb65e0373fa1b428a28bd6d8a2380106dcc080f58005ee14',
  };
  var tags, servers, known;

  function reset() {
    tags = {};
    known = {};
    servers = {
      a: { ref: 'myorg/api:latest', v: null },
      b: { ref: 'myorg/api:latest', v: null },
      c: { ref: 'myorg/api:1.0', v: null },
      d: { ref: 'myorg/api@sha256:3bfc2695…', v: null },
    };
  }
  function short(d) { return 'sha256:' + d.slice(0, 12) + '…'; }
  function verOf(d) {
    for (var k in BUILDS) if (BUILDS[k] === d) return k;
    return '?';
  }

  function render() {
    var r = '<tr><th>TAG</th><th>→ DIGEST</th><th>build</th></tr>';
    var names = Object.keys(tags);
    if (!names.length) r += '<tr><td colspan="3" class="muted">(empty: push something)</td></tr>';
    names.forEach(function (t) {
      var v = verOf(tags[t]);
      r += '<tr><td>:' + t + '</td><td>' + short(tags[t]) + '</td><td><span class="ver ' + v + '">' + v + '</span></td></tr>';
    });
    document.getElementById('reg').innerHTML = r;
    var s = '<tr><th>server</th><th>image ref</th><th>running</th></tr>';
    ['a', 'b', 'c', 'd'].forEach(function (k) {
      var x = servers[k];
      s += '<tr><td>' + k + '</td><td>' + x.ref + '</td><td>' +
        (x.v ? '<span class="ver ' + x.v + '">' + x.v + '</span>' : '<span class="muted">-</span>') + '</td></tr>';
    });
    document.getElementById('srv').innerHTML = s;
    var a = servers.a.v, b = servers.b.v;
    document.getElementById('alert').textContent = a && b && a !== b
      ? '⚠ server-a and server-b both say "myorg/api:latest" but run different builds (' + a + ' vs ' + b + ')!' : '';
  }

  function push(v, list) {
    var d = BUILDS[v];
    var first = !known[v];
    known[v] = true;
    list.forEach(function (t, i) {
      var old = tags[t];
      console.log('$ docker push myorg/api:' + t);
      console.log('The push refers to repository [docker.io/myorg/api]');
      console.log(first && i === 0 ? '5f70bf18a086: Pushed' : '5f70bf18a086: Layer already exists');
      console.log(t + ': digest: ' + short(d) + ' size: 1573');
      if (old && old !== d) console.log('   (tag :' + t + ' moved: ' + verOf(old) + ' → ' + v + ')');
      tags[t] = d;
    });
    render();
  }

  function pull(k, which) {
    var s = servers[k];
    var d;
    if (which === 'digest') {
      console.log('$ docker pull myorg/api@' + short(BUILDS.v1));
      if (!known.v1) {
        console.log('Error response from daemon: manifest for myorg/api@' + short(BUILDS.v1) + ' not found: manifest unknown');
        return;
      }
      d = BUILDS.v1;
    } else {
      console.log('$ docker pull myorg/api:' + which);
      if (!tags[which]) {
        console.log('Error response from daemon: manifest for myorg/api:' + which + ' not found: manifest unknown: manifest unknown');
        return;
      }
      d = tags[which];
      console.log(which + ': Pulling from myorg/api');
    }
    var v = verOf(d);
    console.log('Digest: ' + short(d));
    console.log(s.v === v
      ? 'Status: Image is up to date for ' + s.ref
      : 'Status: Downloaded newer image for ' + s.ref);
    console.log('server-' + k + ' now runs ' + v);
    s.v = v;
    render();
  }

  document.getElementById('p1').onclick = function () { push('v1', ['1.0', 'latest']); };
  document.getElementById('p2').onclick = function () { push('v2', ['1.1', 'latest']); };
  document.getElementById('p3').onclick = function () { push('v3', ['1.0']); };
  var pb = document.querySelectorAll('[data-s]');
  for (var i = 0; i < pb.length; i++) {
    pb[i].onclick = function () { pull(this.getAttribute('data-s'), this.getAttribute('data-ref')); };
  }
  document.getElementById('reset').onclick = function () { reset(); render(); console.log('--- reset ---'); };

  reset();
  render();
</script>`,
          explain: `
            <details>
              <summary>The problem: same tag, different code</summary>
              <p>Tags are pointers you can move. Here's a very common week:</p>
              <table>
                <tr><th>When</th><th>What happens</th><th><code>:latest</code> points to</th><th>Fleet</th></tr>
                <tr><td>Mon</td><td>CI pushes v1 as <code>:1.0</code> and <code>:latest</code>. server-a pulls <code>:latest</code>.</td><td>v1</td><td>a = v1</td></tr>
                <tr><td>Tue</td><td>CI pushes v2 as <code>:1.1</code> and <code>:latest</code>.</td><td><strong>v2</strong></td><td>a = v1 (nothing re-pulled)</td></tr>
                <tr><td>Wed</td><td>Traffic spike: autoscaler starts server-b, which pulls <code>:latest</code>.</td><td>v2</td><td>a = v1, <strong>b = v2</strong> ❌</td></tr>
              </table>
              <p>Both servers are configured with the exact same string, <code>myorg/api:latest</code>, yet they run different
              builds. A bug that only shows on "some requests" is now very hard to track down.</p>
            </details>
            <details>
              <summary>Step by step: reproduce it with the buttons</summary>
              <table>
                <tr><th>Click</th><th>Registry</th><th>Console (abridged)</th></tr>
                <tr><td>① push v1</td><td>:1.0 → v1, :latest → v1</td><td><code>1.0: digest: sha256:3bfc269594ef… size: 1573</code></td></tr>
                <tr><td>server-a: pull :latest</td><td></td><td><code>Digest: sha256:3bfc269594ef…</code> <code>server-a now runs v1</code></td></tr>
                <tr><td>server-d: pull @sha256 (v1)</td><td></td><td><code>server-d now runs v1</code></td></tr>
                <tr><td>② push v2</td><td>:1.1 → v2, :latest <strong>moves</strong> to v2</td><td><code>(tag :latest moved: v1 → v2)</code></td></tr>
                <tr><td>server-b: pull :latest</td><td></td><td><code>Digest: sha256:fb04dcb6970e…</code> <code>server-b now runs v2</code>, red warning appears</td></tr>
                <tr><td>server-c: pull :1.0</td><td></td><td><code>server-c now runs v1</code></td></tr>
                <tr><td>③ re-push :1.0 (hotfix v3)</td><td>:1.0 <strong>moves</strong> to v3</td><td><code>(tag :1.0 moved: v1 → v3)</code></td></tr>
                <tr><td>server-c: pull :1.0</td><td></td><td><code>Status: Downloaded newer image …</code> <code>server-c now runs v3</code></td></tr>
                <tr><td>server-d: pull @sha256 (v1)</td><td></td><td><code>Status: Image is up to date …</code>: still v1, always v1</td></tr>
              </table>
              <p>Pulling a digest before v1 has been pushed fails with <code>manifest unknown</code>: a digest names content that
              must already exist.</p>
            </details>
            <details>
              <summary>Key takeaways ①②③</summary>
              <ol>
                <li><strong>① Tags move.</strong> Even version tags like <code>:1.0</code> can be overwritten (button ③), unless your
                registry enforces <em>tag immutability</em> (ECR, Artifact Registry, Harbor and others can).</li>
                <li><strong>② Digests don't.</strong> <code>@sha256:…</code> always resolves to the same bytes. Server-d never drifts.</li>
                <li><strong>③ A good policy:</strong> CI pushes a unique tag per build (<code>1.4.2</code> or the git SHA), deployments
                reference that tag (plus digest if you can), and <code>latest</code> is at most a convenience for humans.</li>
              </ol>
              <div class="tip">You can combine both: <code>nginx:1.27-alpine@sha256:…</code>. The tag is for humans to read, the
              digest is what actually gets pulled. Tools like Renovate or Dependabot can keep such pins up to date.</div>
            </details>
          `,
        },
        {
          title: 'Tag, push and pin: real commands',
          runnable: false,
          lang: 'bash',
          code: String.raw`# Docker Hub (namespace = your user or org)
$ docker login
$ docker build -t myorg/api:1.4.2 .
$ docker push myorg/api:1.4.2
The push refers to repository [docker.io/myorg/api]
5f70bf18a086: Pushed
1.4.2: digest: sha256:3bfc269594ef649228e9a74bab00f042efc91d5acc6fbee31a382e80d42388fe size: 1573

# GitHub Container Registry
$ echo "$GITHUB_TOKEN" | docker login ghcr.io -u my-user --password-stdin
$ docker tag myorg/api:1.4.2 ghcr.io/myorg/api:1.4.2
$ docker push ghcr.io/myorg/api:1.4.2

# AWS ECR
$ aws ecr get-login-password --region ap-southeast-2 \
    | docker login --username AWS --password-stdin 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com
$ docker tag myorg/api:1.4.2 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/api:1.4.2
$ docker push 123456789012.dkr.ecr.ap-southeast-2.amazonaws.com/api:1.4.2

# Find the digest of a tag
$ docker images --digests myorg/api
REPOSITORY   TAG     DIGEST                                                                    IMAGE ID
myorg/api    1.4.2   sha256:3bfc269594ef649228e9a74bab00f042efc91d5acc6fbee31a382e80d42388fe   9a1c…
$ docker buildx imagetools inspect nginx:1.27-alpine
Name:      docker.io/library/nginx:1.27-alpine
MediaType: application/vnd.oci.image.index.v1+json
Digest:    sha256:…
Manifests:
  Platform: linux/amd64 ...
  Platform: linux/arm64 ...

# Pull by digest: always exactly the same image
$ docker pull myorg/api@sha256:3bfc269594ef649228e9a74bab00f042efc91d5acc6fbee31a382e80d42388fe`,
        },
      ],
      quiz: [
        {
          q: 'What does <code>docker pull redis</code> pull?',
          options: [
            'The newest Redis version, guaranteed',
            'docker.io/library/redis:latest, whatever that tag points to right now',
            'All Redis tags',
            'The image with the highest digest',
          ],
          answer: 1,
          why: 'No tag means :latest, and no registry means Docker Hub. latest is just a name the publisher chose to move.',
        },
        {
          q: 'Which reference is guaranteed to give the same image bytes forever?',
          options: ['myapp:latest', 'myapp:1.4.2', 'myapp@sha256:3bfc…', 'myapp:stable'],
          answer: 2,
          why: 'A digest is a content hash. Tags, even version-looking ones, can be re-pushed.',
        },
        {
          q: 'You run <code>docker tag api:1.4.2 api:latest</code>. What happens?',
          options: [
            'A second name is added pointing to the same image ID',
            'The image is copied and uses twice the disk',
            'The image is rebuilt',
            'The image is pushed',
          ],
          answer: 0,
          why: 'Tags are just names. Both point to the same image and nothing is copied.',
        },
        {
          q: 'Two pods from the same Deployment use <code>myapp:latest</code> but behave differently. Most likely cause?',
          options: [
            'Kubernetes randomizes images',
            'Digests collide',
            'EXPOSE differs',
            'They pulled :latest at different times, and the tag was moved in between',
          ],
          answer: 3,
          why: 'Mutable tags plus pulls at different times give a mixed fleet. Deploy unique tags or digests.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Make this Dockerfile reproducible. Edit it in the box below and click <strong>Check</strong>:</p>
          <ul>
            <li>build stage: pin Node to a version tag (for example <code>node:22</code>). Keep the stage name <code>build</code>.</li>
            <li>runtime stage: use <code>nginx:1.27-alpine</code> <strong>and</strong> pin it to this digest (pretend you looked it up with
              <code>docker buildx imagetools inspect</code>):<br>
              <code>sha256:5be1ecc7935f1dd85635d4feedaf660594030253cc97c9e9ca3819ffeac36b65</code></li>
            <li>no <code>latest</code>, and no untagged <code>FROM</code></li>
          </ul>`,
        starter: checker(`FROM node:latest AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx
COPY --from=build /app/dist /usr/share/nginx/html`, PIN_RULES),
        hint: 'The format is name:tag@sha256:<64 hex chars>, for example FROM nginx:1.27-alpine@sha256:5be1ec… (the full digest, no spaces).',
        solution: checker(`FROM node:22 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine@sha256:5be1ecc7935f1dd85635d4feedaf660594030253cc97c9e9ca3819ffeac36b65
COPY --from=build /app/dist /usr/share/nginx/html`, PIN_RULES),
      },
    },

    // =========================================================================
    {
      id: 'image-best-practices',
      section: 'Images & Dockerfiles',
      title: 'Image best practices & security',
      explain: `
        <p>A working image isn't necessarily a good one. These habits make images smaller, faster to ship and much harder to abuse.</p>

        <h3>1. Small, pinned base images</h3>
        <p>Use <code>-slim</code>, <code>-alpine</code> or distroless variants, and pin a version (<code>node:22-slim</code>,
        not <code>node</code>). Fewer packages means fewer CVEs and faster pulls. Rebuild regularly so you pick up security patches.</p>

        <h3>2. Don't run as root</h3>
        <p>By default a container's process runs as <code>root</code> (UID 0). If an attacker breaks your app, they are root
        inside the container, one kernel bug away from the host. Add a <code>USER</code>: the official Node images ship a
        <code>node</code> user, and elsewhere you create one with <code>useradd</code> or <code>adduser</code>.
        Kubernetes can then enforce <code>runAsNonRoot: true</code>.</p>

        <h3>3. Never put secrets in layers</h3>
        <p>Every layer ships with the image. If you <code>COPY .npmrc</code> and later <code>RUN rm .npmrc</code>, the token
        is still in the earlier layer, and anyone with the image can extract it (<code>docker save</code>, then untar). The same
        goes for <code>ARG</code>/<code>ENV</code> values: they show up in <code>docker history</code> and the image config.
        Use a <strong>BuildKit secret mount</strong>. It's available only during that one <code>RUN</code> and never written to a layer:</p>
        <pre><code class="language-docker">RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci</code></pre>
        <pre><code class="language-bash">docker build --secret id=npmrc,src=$HOME/.npmrc -t myapp .</code></pre>
        <p>Runtime secrets (DB passwords, API keys) come in at run time via env vars, mounted files, or Kubernetes Secrets. Never bake them in.</p>

        <h3>4. HEALTHCHECK</h3>
        <p><code>HEALTHCHECK</code> tells Docker how to check that the app works, not just that the process is alive.
        <code>docker ps</code> then shows <code>(healthy)</code> or <code>(unhealthy)</code>, and Compose can wait for it with
        <code>depends_on: condition: service_healthy</code>. (Kubernetes ignores HEALTHCHECK and uses its own liveness/readiness
        probes instead.) Slim images often have no <code>curl</code>, so use the runtime you already have:</p>
        <pre><code class="language-docker">HEALTHCHECK --interval=30s --timeout=3s --retries=3 \\
  CMD node -e "fetch('http://localhost:3000/health').then(r =&gt; process.exit(r.ok ? 0 : 1)).catch(() =&gt; process.exit(1))"</code></pre>

        <h3>5. One process per container</h3>
        <p>Run the web app in one container and the database in another, not both under a supervisor in one. Each container
        then has one job, its own logs, and can be scaled, restarted and updated on its own. That's the model Compose and
        Kubernetes are built around.</p>

        <h3>6. Scan your images</h3>
        <pre><code class="language-bash">docker scout quickview myapp:1.0     # summary of known CVEs + base image advice
docker scout cves myapp:1.0          # full list
trivy image myapp:1.0                # popular open-source alternative</code></pre>

        <div class="tip">Other cheap wins: combine <code>apt-get update &amp;&amp; apt-get install -y --no-install-recommends … &amp;&amp;
        rm -rf /var/lib/apt/lists/*</code> in one <code>RUN</code>, install only production deps, use <code>.dockerignore</code>,
        and add <code>LABEL org.opencontainers.image.source=…</code> so people can find the code.</div>
      `,
      examples: [
        {
          title: 'Harden a Dockerfile, one practice at a time',
          code: String.raw`<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fa; color: #1f2937; margin: 0; padding: 10px; font-size: 13px; }
  .cols { display: grid; grid-template-columns: 1fr 1.25fr; gap: 10px; }
  .card { background: #fff; border: 1px solid #dde2ea; border-radius: 8px; padding: 6px 8px; }
  h4 { margin: 0 0 4px; font-size: 12.5px; }
  label { display: block; font-size: 12px; padding: 2px 0; cursor: pointer; }
  pre { background: #0f172a; color: #e2e8f0; border-radius: 6px; padding: 6px 8px; font-size: 10.8px; margin: 0; white-space: pre-wrap;
    max-height: 250px; overflow: auto; }
  .score { font-weight: 700; margin-top: 6px; }
  .find { font-size: 11.5px; margin-top: 4px; }
  .find div { padding: 1px 4px; border-radius: 3px; margin: 2px 0; }
  .bad { background: #fee2e2; color: #991b1b; }
  .good { background: #dcfce7; color: #166534; }
  button { margin-top: 6px; padding: 4px 9px; border: 1px solid #4f46e5; background: #4f46e5; color: #fff; border-radius: 6px; cursor: pointer; font-size: 12px; }
  button.plain { background: #fff; color: #1f2937; border-color: #c7cdd8; }
</style>

<div class="cols">
  <div class="card">
    <h4>Practices</h4>
    <label><input type="checkbox" data-k="base"> small, pinned base (node:22-slim)</label>
    <label><input type="checkbox" data-k="apt"> apt-get in one RUN + clean lists</label>
    <label><input type="checkbox" data-k="prod"> production deps only</label>
    <label><input type="checkbox" data-k="secret"> token via BuildKit secret mount</label>
    <label><input type="checkbox" data-k="user"> run as non-root USER</label>
    <label><input type="checkbox" data-k="health"> HEALTHCHECK</label>
    <div class="score" id="score"></div>
    <div class="find" id="find"></div>
    <button id="hist">docker history</button>
    <button id="all" class="plain">apply all</button>
    <button id="none" class="plain">clear all</button>
  </div>
  <div class="card">
    <h4>Dockerfile</h4>
    <pre id="df"></pre>
  </div>
</div>

<script>
  var on = {};
  var LABELS = {
    base: ['node:latest: unpinned, ~1.1 GB full Debian', 'node:22-slim: pinned, ~240 MB'],
    apt: ['apt-get update cached separately; package lists left in the image', 'single RUN, --no-install-recommends, lists removed'],
    prod: ['devDependencies shipped', 'npm ci --omit=dev'],
    secret: ['NPM token baked into a layer (rm does not help!)', 'token only exists during the RUN (secret mount)'],
    user: ['runs as root (UID 0)', 'runs as node (UID 1000)'],
    health: ['no HEALTHCHECK: docker only knows "process alive"', 'HEALTHCHECK reports healthy/unhealthy'],
  };

  function dockerfile() {
    var L = [];
    if (on.secret) L.push('# syntax=docker/dockerfile:1');
    L.push(on.base ? 'FROM node:22-slim' : 'FROM node:latest');
    L.push('WORKDIR /app');
    if (on.apt) {
      L.push('RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \\');
      L.push('    && rm -rf /var/lib/apt/lists/*');
    } else {
      L.push('RUN apt-get update');
      L.push('RUN apt-get install -y ca-certificates');
    }
    L.push('COPY package*.json ./');
    var ci = on.prod ? 'npm ci --omit=dev' : 'npm ci';
    if (on.secret) {
      L.push('RUN --mount=type=secret,id=npmrc,target=/root/.npmrc ' + ci);
    } else {
      L.push('COPY .npmrc /root/.npmrc');
      L.push('RUN ' + ci);
      L.push('RUN rm /root/.npmrc');
    }
    L.push(on.user ? 'COPY --chown=node:node . .' : 'COPY . .');
    L.push('EXPOSE 3000');
    if (on.health) {
      L.push('HEALTHCHECK --interval=30s --timeout=3s \\');
      L.push("  CMD node -e \"fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))\"");
    }
    if (on.user) L.push('USER node');
    L.push('CMD ["node", "server.js"]');
    return L.join('\n');
  }

  function size() {
    var s = on.base ? 240 : 1100;
    s += on.prod ? 45 : 310;
    s += on.apt ? 0 : 20;
    return s;
  }

  function render() {
    document.getElementById('df').textContent = dockerfile();
    var keys = Object.keys(LABELS);
    var n = keys.filter(function (k) { return on[k]; }).length;
    document.getElementById('score').textContent = n + ' / ' + keys.length + ' practices · image ≈ ' +
      (size() >= 1000 ? (size() / 1000).toFixed(2) + ' GB' : size() + ' MB') + ' (illustrative)';
    document.getElementById('find').innerHTML = keys.map(function (k) {
      return '<div class="' + (on[k] ? 'good' : 'bad') + '">' + (on[k] ? '✔ ' : '✘ ') + LABELS[k][on[k] ? 1 : 0] + '</div>';
    }).join('');
  }

  var boxes = document.querySelectorAll('[data-k]');
  for (var i = 0; i < boxes.length; i++) {
    boxes[i].onchange = function () {
      on[this.getAttribute('data-k')] = this.checked;
      console.log((this.checked ? 'applied: ' : 'removed: ') + LABELS[this.getAttribute('data-k')][1]);
      render();
    };
  }
  function setAll(v) {
    for (var j = 0; j < boxes.length; j++) { boxes[j].checked = v; on[boxes[j].getAttribute('data-k')] = v; }
    render();
  }
  document.getElementById('all').onclick = function () { setAll(true); console.log('all practices applied'); };
  document.getElementById('none').onclick = function () { setAll(false); console.log('all practices removed'); };

  document.getElementById('hist').onclick = function () {
    console.log('$ docker history myapp --format "{{.CreatedBy}}  {{.Size}}"   (newest first, abridged)');
    console.log('CMD ["node" "server.js"]  0B');
    if (on.user) console.log('USER node  0B');
    if (on.health) console.log('HEALTHCHECK &{["CMD-SHELL" "node -e ..."] ...}  0B');
    console.log((on.user ? 'COPY --chown=node:node . . # buildkit' : 'COPY . . # buildkit') + '  48kB');
    if (on.secret) {
      console.log('RUN --mount=type=secret,id=npmrc,target=/root/.npmrc ' + (on.prod ? 'npm ci --omit=dev' : 'npm ci') + '  ' + (on.prod ? '45MB' : '310MB'));
      console.log('→ no layer contains the token. The secret was mounted only while that RUN executed.');
    } else {
      console.log('RUN /bin/sh -c rm /root/.npmrc # buildkit  0B');
      console.log('RUN /bin/sh -c ' + (on.prod ? 'npm ci --omit=dev' : 'npm ci') + ' # buildkit  ' + (on.prod ? '45MB' : '310MB'));
      console.log('COPY .npmrc /root/.npmrc # buildkit  87B   <-- the token is still in THIS layer!');
      console.log('→ anyone who can pull the image can run: docker save myapp | tar -x  and read the token.');
    }
  };

  render();
</script>`,
          explain: `
            <details>
              <summary>The problem: "I deleted the secret, so it's gone"</summary>
              <p>Start with every box unticked and click <strong>docker history</strong>. Three layers matter:</p>
              <table>
                <tr><th>Layer (oldest → newest)</th><th>Size</th><th>What it contains</th></tr>
                <tr><td><code>COPY .npmrc /root/.npmrc</code></td><td>87B</td><td>The token file: <strong>stored forever in this layer</strong></td></tr>
                <tr><td><code>RUN npm ci</code></td><td>310MB</td><td>node_modules</td></tr>
                <tr><td><code>RUN rm /root/.npmrc</code></td><td>0B</td><td>A "whiteout" marker that hides the file in the final view. The bytes are still in the older layer.</td></tr>
              </table>
              <p>An image is the whole stack of layers, not just the top view. <code>docker save</code> exports every layer as a
              tarball, and the token is sitting in one of them.</p>
            </details>
            <details>
              <summary>Step by step: tick "token via BuildKit secret mount"</summary>
              <table>
                <tr><th>Before</th><th>After</th></tr>
                <tr><td><code>COPY .npmrc /root/.npmrc</code><br><code>RUN npm ci</code><br><code>RUN rm /root/.npmrc</code></td>
                  <td><code># syntax=docker/dockerfile:1</code><br><code>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci</code></td></tr>
                <tr><td>history: <code>… 87B   &lt;-- the token is still in THIS layer!</code></td>
                  <td>history: <code>→ no layer contains the token. The secret was mounted only while that RUN executed.</code></td></tr>
              </table>
              <pre><code class="language-docker">RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci   # ① ② ③</code></pre>
              <ol>
                <li><strong>①</strong> <code>id=npmrc</code> matches <code>--secret id=npmrc,src=$HOME/.npmrc</code> on the <code>docker build</code> command line.</li>
                <li><strong>②</strong> <code>target=</code> is where the file appears, only for this one <code>RUN</code> (by default <code>/run/secrets/&lt;id&gt;</code>).</li>
                <li><strong>③</strong> The secret doesn't affect the cache key and never ends up in the layer. Only what <code>npm ci</code> writes does.</li>
              </ol>
            </details>
            <details>
              <summary>Try this / common mistakes</summary>
              <ul>
                <li>Click <strong>apply all</strong>: size drops from ≈ 1.43 GB to ≈ 285 MB (illustrative numbers), and the
                Dockerfile gains <code>USER node</code>, <code>COPY --chown</code> and a <code>HEALTHCHECK</code>.</li>
                <li>Tick only <strong>run as non-root USER</strong> and watch where <code>USER node</code> lands: after the
                installs (which need root) and right before <code>CMD</code>.</li>
              </ul>
              <div class="warn"><strong>Also leaks:</strong> <code>ARG NPM_TOKEN</code> + <code>--build-arg NPM_TOKEN=…</code>. Build
              args are recorded in the image's build history, and BuildKit even warns about it (<code>SecretsUsedInArgOrEnv</code>).
              If a secret ever made it into a pushed image, <strong>rotate it</strong>. Deleting the tag doesn't un-leak it.</div>
            </details>
          `,
        },
        {
          title: 'A hardened Dockerfile + scanning',
          runnable: false,
          lang: 'docker',
          code: String.raw`# syntax=docker/dockerfile:1

# --- build stage -------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
    --mount=type=cache,target=/root/.npm \
    npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

# --- runtime stage -----------------------------------------------------------
FROM node:22-slim
LABEL org.opencontainers.image.source="https://github.com/myorg/api"
ENV NODE_ENV=production
WORKDIR /app

# Files owned by the unprivileged user that ships with the node image
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node package.json ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node
CMD ["node", "dist/server.js"]

# Build:  docker build --secret id=npmrc,src=$HOME/.npmrc -t myorg/api:1.4.2 .
# Scan:   docker scout quickview myorg/api:1.4.2
#         docker scout cves --only-severity critical,high myorg/api:1.4.2
#         trivy image --severity HIGH,CRITICAL myorg/api:1.4.2
# Check:  docker run --rm myorg/api:1.4.2 whoami     →  node
#         docker ps  →  STATUS  Up 2 minutes (healthy)`,
        },
      ],
      quiz: [
        {
          q: 'A Dockerfile does <code>COPY id_rsa /root/.ssh/</code>, <code>RUN git clone …</code>, <code>RUN rm /root/.ssh/id_rsa</code>. Is the key safe?',
          options: [
            'Yes, it was deleted',
            'No, it still exists in the COPY layer, and anyone who has the image can extract it',
            'Yes, if the image is multi-stage',
            'Yes, BuildKit strips secrets automatically',
          ],
          answer: 1,
          why: 'Deleting in a later layer only hides the file. Use RUN --mount=type=secret (or type=ssh for SSH keys) instead.',
        },
        {
          q: 'Why add <code>USER node</code> (or another non-root user)?',
          options: [
            'It makes the image smaller',
            'Docker requires it',
            'If the app is compromised, the attacker isn’t root inside the container',
            'It speeds up npm ci',
          ],
          answer: 2,
          why: 'Least privilege: a non-root process can do far less damage, and Kubernetes can enforce runAsNonRoot.',
        },
        {
          q: 'What does <code>HEALTHCHECK</code> give you?',
          options: [
            'Automatic restarts in Kubernetes',
            'Faster builds',
            'A CVE scan',
            'A healthy/unhealthy status in docker ps that Compose can wait on',
          ],
          answer: 3,
          why: 'Docker runs the check periodically and records status. Kubernetes ignores it and uses its own probes.',
        },
        {
          q: 'Which is the best way to handle a database password the app needs at runtime?',
          options: [
            'ENV DB_PASSWORD=… in the Dockerfile',
            'ARG DB_PASSWORD at build time',
            'Inject it at run time (env var, mounted secret file, Kubernetes Secret)',
            'COPY a .env file into the image',
          ],
          answer: 2,
          why: 'Anything in the Dockerfile ends up in the image. Runtime secrets must come from the runtime environment.',
        },
        {
          q: 'Which tools scan an image for known vulnerabilities?',
          options: ['docker scout and trivy', 'docker history', 'docker diff', 'docker inspect'],
          answer: 0,
          why: 'docker scout (built into the Docker CLI) and Trivy compare the packages in your image against CVE databases.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This image leaks an npm token and runs as root. Edit the Dockerfile in the box below, then click <strong>Check</strong>:</p>
          <ul>
            <li>remove the <code>ARG</code> and read the token from a <strong>BuildKit secret mount</strong> during <code>npm ci</code>
              (built with <code>docker build --secret id=npmrc,src=$HOME/.npmrc .</code>)</li>
            <li>run as the non-root <code>node</code> user</li>
            <li>add a <code>HEALTHCHECK</code> (the app serves <code>/health</code> on port 3000; there's no curl in slim images)</li>
          </ul>`,
        starter: checker(`FROM node:22-slim
ARG NPM_TOKEN
WORKDIR /app
COPY package*.json ./
RUN echo "//registry.npmjs.org/:_authToken=$NPM_TOKEN" > .npmrc && npm ci --omit=dev && rm .npmrc
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]`, HARDEN_RULES),
        hint: 'RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev. Add USER node just before CMD, and HEALTHCHECK CMD node -e "fetch(\'http://localhost:3000/health\')…".',
        solution: checker(`# syntax=docker/dockerfile:1
FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev
COPY --chown=node:node . .
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \\
  CMD node -e "fetch('http://localhost:3000/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
USER node
CMD ["node", "server.js"]`, HARDEN_RULES),
      },
    },
  );
})();
