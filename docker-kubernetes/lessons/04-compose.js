// Section: Docker Compose
// Simulator scripts are real functions injected with .toString(): syntax-checked on load, no template escaping.
(function () {
  window.LESSONS = window.LESSONS || [];

  // ---------- shared: exercise checker widget ----------
  const CHECK_CSS = `<style>
  body { background: #f4f6fa; color: #1f2330; }
  label.f { display: block; font-size: 13px; font-weight: 600; margin: 6px 0 2px; }
  textarea { width: 100%; box-sizing: border-box; margin: 0; background: #fff; color: #1f2330;
             font: 13px/1.45 ui-monospace, Menlo, Consolas, monospace; tab-size: 2; }
  #out { list-style: none; padding-left: 0; font-size: 14px; margin: 8px 0 0; }
  #out li { padding: 2px 0; }
  .ok { color: #15803d; }
  .bad { color: #b91c1c; }
</style>`;

  function runChecks() {
    var out = document.getElementById('out');
    out.innerHTML = '';
    var passed = 0;
    RULES.forEach(function (r) {
      var ok = false;
      try { ok = !!r[1](val); } catch (e) { ok = false; }
      if (ok) passed++;
      var li = document.createElement('li');
      li.className = ok ? 'ok' : 'bad';
      li.textContent = (ok ? '✓ ' : '✗ ') + r[0];
      out.appendChild(li);
    });
    var sum = document.createElement('li');
    sum.style.fontWeight = '600';
    sum.style.marginTop = '6px';
    sum.textContent = passed === RULES.length
      ? 'All ' + RULES.length + ' checks pass. Nice!'
      : passed + ' / ' + RULES.length + ' checks pass';
    out.appendChild(sum);
  }

  function widget(fields, rules, helpers) {
    const areas = fields.map((f) =>
      `<label class="f" for="${f.id}">${f.label}</label>\n` +
      `<textarea id="${f.id}" spellcheck="false" style="height:${f.height}px">${f.value}</textarea>`
    ).join('\n');
    const ruleSrc = rules.map((r) => '  [' + JSON.stringify(r[0]) + ', ' + r[1].toString() + ']').join(',\n');
    const helperSrc = (helpers || []).map((f) => f.toString() + '\n\n').join('');
    return `${CHECK_CSS}
${areas}
<button id="check">Check</button>
<ul id="out"></ul>
<script>
function val(id) { return document.getElementById(id).value; }

${helperSrc}var RULES = [
${ruleSrc}
];

${runChecks.toString()}

document.getElementById('check').onclick = runChecks;
runChecks();
</script>`;
  }

  // Tiny compose "parser" used by the checkers: returns { serviceName: blockText }.
  function services(y) {
    var out = {};
    var inS = false;
    var cur = null;
    y.replace(/\t/g, '  ').split('\n').forEach(function (l) {
      if (/^\s*(#.*)?$/.test(l)) return;
      if (/^\S/.test(l)) {
        inS = /^services\s*:/.test(l);
        cur = null;
        return;
      }
      if (!inS) return;
      var m = l.match(/^ {2}([A-Za-z0-9_.-]+)\s*:\s*$/);
      if (m) {
        cur = m[1];
        out[cur] = '';
        return;
      }
      if (cur) out[cur] += l + '\n';
    });
    return out;
  }
  // Text of a top-level block (e.g. "volumes"), without its header line.
  function topBlock(y, name) {
    var lines = y.replace(/\t/g, '  ').split('\n');
    var out = null;
    lines.forEach(function (l) {
      if (/^\S/.test(l) && !/^#/.test(l)) {
        out = out === null && new RegExp('^' + name + '\\s*:').test(l) ? '' : (out === null ? null : out + '\u0000');
        return;
      }
      if (out !== null && out.indexOf('\u0000') < 0) out += l + '\n';
    });
    return out === null ? null : out.split('\u0000')[0];
  }
  // Split a block into list items ("- ..." lines plus their continuation lines).
  function items(block) {
    var res = [];
    block.split('\n').forEach(function (l) {
      if (/^\s*-\s/.test(l)) res.push(l + '\n');
      else if (res.length) res[res.length - 1] += l + '\n';
    });
    return res;
  }

  // ---------- simulator 1: compose up / down ----------
  function composeSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }
    var ORDER = ['db', 'api', 'web'];  // dependency order: web -> api -> db
    var S;

    function fresh() {
      return { net: false, vol: false, built: false, orders: 0, c: { db: 'none', api: 'none', web: 'none' } };
    }
    function name(svc) { return 'shop-' + svc + '-1'; }
    function pad(s, n) {
      while (s.length < n) s += ' ';
      return s;
    }
    function render() {
      ORDER.forEach(function (svc) {
        var st = S.c[svc];
        $('c-' + svc).className = 'svc ' + st;
        $('st-' + svc).textContent = st === 'none' ? 'no container' : st === 'running' ? name(svc) + ' · running' : name(svc) + ' · exited';
      });
      $('c-net').className = 'res ' + (S.net ? 'running' : 'none');
      $('c-net').textContent = S.net ? 'network shop_default' : 'network: (none)';
      $('c-vol').className = 'res ' + (S.vol ? 'running' : 'none');
      $('c-vol').textContent = S.vol ? 'volume shop_pgdata · ' + S.orders + ' orders stored' : 'volume: (none)';
    }

    function up() {
      log('$ docker compose up -d');
      var lines = [];
      if (!S.built) {
        log('[+] Building 8.4s (10/10) FINISHED');
        log(' => [api internal] load build definition from Dockerfile');
        log(' => [api 5/5] COPY . .');
        log(' => [api] exporting to image');
        S.built = true;
      }
      if (!S.net) { lines.push(' ✔ Network shop_default   Created'); S.net = true; }
      if (!S.vol) { lines.push(' ✔ Volume "shop_pgdata"   Created'); S.vol = true; }
      ORDER.forEach(function (svc) {
        var was = S.c[svc];
        lines.push(' ✔ Container ' + pad(name(svc), 13) + (was === 'running' ? 'Running' : 'Started'));
        S.c[svc] = 'running';
      });
      log('[+] Running ' + lines.length + '/' + lines.length);
      lines.forEach(log);
      render();
    }
    function ps() {
      log('$ docker compose ps');
      log('NAME         IMAGE               SERVICE   STATUS         PORTS');
      var any = false;
      ORDER.slice().reverse().forEach(function (svc) {
        if (S.c[svc] !== 'running') return;
        any = true;
        var img = { web: 'nginx:1.27-alpine', api: 'shop-api', db: 'postgres:17' }[svc];
        var ports = { web: '0.0.0.0:8080->80/tcp', api: '0.0.0.0:3000->3000/tcp', db: '5432/tcp' }[svc];
        log(pad(name(svc), 13) + pad(img, 20) + pad(svc, 10) + pad('Up 1 minute', 15) + ports);
      });
      if (!any) log('(no running containers; stopped ones show with docker compose ps -a)');
    }
    function logs() {
      log('$ docker compose logs api');
      if (S.c.api === 'none') { log('(no api container: nothing to show)'); return; }
      log('api-1  | Server listening on 0.0.0.0:3000');
      log('api-1  | Connected to postgres at db:5432 (DATABASE_URL host "db" = the db service)');
      if (S.orders) log('api-1  | ' + S.orders + ' order(s) created so far');
      if (S.c.api === 'exited') log('api-1 exited with code 0');
    }
    function order() {
      log('$ curl -X POST localhost:8080/api/orders');
      if (S.c.web !== 'running' || S.c.api !== 'running' || S.c.db !== 'running') {
        log('curl: (7) Failed to connect to localhost port 8080: Connection refused   (stack is not running)');
        return;
      }
      S.orders++;
      log('{"id":' + S.orders + ',"status":"created"}   web -> api:3000 -> db:5432 -> volume shop_pgdata');
      render();
    }
    function stop() {
      log('$ docker compose stop');
      var n = 0;
      var lines = [];
      ORDER.slice().reverse().forEach(function (svc) {
        if (S.c[svc] === 'running') {
          S.c[svc] = 'exited';
          n++;
          lines.push(' ✔ Container ' + pad(name(svc), 13) + 'Stopped');
        }
      });
      log('[+] Stopping ' + n + '/' + n);
      lines.forEach(log);
      render();
    }
    function down(v) {
      log('$ docker compose down' + (v ? ' -v' : ''));
      var lines = [];
      ORDER.slice().reverse().forEach(function (svc) {
        if (S.c[svc] !== 'none') {
          S.c[svc] = 'none';
          lines.push(' ✔ Container ' + pad(name(svc), 13) + 'Removed');
        }
      });
      if (v && S.vol) {
        lines.push(' ✔ Volume shop_pgdata     Removed');
        S.vol = false;
        S.orders = 0;
      }
      if (S.net) {
        lines.push(' ✔ Network shop_default   Removed');
        S.net = false;
      }
      log('[+] Running ' + lines.length + '/' + lines.length);
      lines.forEach(log);
      if (!v && S.vol) log('(volume shop_pgdata is kept: ' + S.orders + ' orders survive. Use down -v to delete it)');
      render();
    }

    $('b-up').onclick = up;
    $('b-ps').onclick = ps;
    $('b-logs').onclick = logs;
    $('b-order').onclick = order;
    $('b-stop').onclick = stop;
    $('b-down').onclick = function () { down(false); };
    $('b-downv').onclick = function () { down(true); };
    $('b-reset').onclick = function () {
      S = fresh();
      log('--- reset: nothing created yet ---');
      render();
    };
    S = fresh();
    render();
    log('Project "shop" (the folder name). Click "docker compose up -d".');
  }

  // ---------- simulator 2: depends_on race ----------
  function raceSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }
    var SPEED = 500;     // real ms per simulated second
    var END = 6;         // timeline length in simulated seconds
    var DB_READY = 3.5;  // postgres needs 3.5s to initialise
    var timer = null;

    function yaml() {
      var host = $('host').value;
      var dep = $('dep').value;
      var l = ['services:', '  api:', '    build: ./api', '    environment:',
        '      DATABASE_URL: postgres://postgres:secret@' + host + ':5432/app'];
      if (dep === 'started') l.push('    depends_on:', '      - db');
      if (dep === 'healthy') l.push('    depends_on:', '      db:', '        condition: service_healthy');
      l.push('  db:', '    image: postgres:17', '    environment:', '      POSTGRES_PASSWORD: secret');
      if (dep === 'healthy') {
        l.push('    healthcheck:', '      test: ["CMD-SHELL", "pg_isready -U postgres -h localhost"]',
          '      interval: 1s', '      retries: 10');
      }
      return l.join('\n');
    }

    function plan() {
      var host = $('host').value;
      var dep = $('dep').value;
      var ev = [];
      ev.push({ t: 0, lane: 'db', mark: 'start', text: ' ✔ Container shop-db-1   Started' });
      var apiStart = 0;
      if (dep === 'started') apiStart = 0.2;
      if (dep === 'healthy') {
        [1, 2, 3].forEach(function (t) {
          ev.push({ t: t, lane: 'db', mark: 'hc-bad', text: 'db-1 healthcheck: pg_isready -> no response (status: starting)' });
        });
        ev.push({ t: 4, lane: 'db', mark: 'hc-ok', text: 'db-1 healthcheck: pg_isready -> accepting connections' });
        ev.push({ t: 4, lane: 'db', mark: '', text: ' ✔ Container shop-db-1   Healthy' });
        apiStart = 4.1;
      }
      ev.push({ t: DB_READY, lane: 'db', mark: 'ready', text: 'db-1   | database system is ready to accept connections' });
      ev.push({ t: apiStart, lane: 'api', mark: 'start', text: ' ✔ Container shop-api-1  Started' });
      var tc = Math.round((apiStart + 0.5) * 10) / 10;
      var result;
      if (host === 'localhost') {
        result = 'api-1  | Error: connect ECONNREFUSED 127.0.0.1:5432';
      } else if (tc < DB_READY) {
        result = 'api-1  | Error: connect ECONNREFUSED 172.20.0.2:5432';
      } else {
        result = null;
      }
      if (result) {
        ev.push({ t: tc, lane: 'api', mark: 'fail', text: result });
        ev.push({ t: tc, lane: 'api', mark: '', text: 'api-1 exited with code 1' });
      } else {
        ev.push({ t: tc, lane: 'api', mark: 'ok', text: 'api-1  | connected to db:5432 ✓ listening on :3000' });
      }
      ev.sort(function (a, b) { return a.t - b.t; });
      return { ev: ev, apiStart: apiStart, apiEnd: result ? tc : null, ok: !result };
    }

    function pct(t) { return (t / END * 100) + '%'; }
    function clear() {
      if (timer) clearInterval(timer);
      timer = null;
      Array.prototype.forEach.call(document.querySelectorAll('.mk'), function (m) { m.remove(); });
      ['db-init', 'db-ok', 'api-bar'].forEach(function (id) { $(id).style.width = '0'; });
      $('head').style.left = '0';
      $('verdict').textContent = '';
      $('verdict').className = '';
    }
    function mark(e) {
      if (!e.mark) return;
      var m = document.createElement('div');
      m.className = 'mk ' + e.mark;
      m.style.left = pct(e.t);
      m.title = e.text;
      m.textContent = { start: '▶', 'hc-bad': '♡', 'hc-ok': '♥', ready: '●', fail: '✗', ok: '✓' }[e.mark];
      $('lane-' + e.lane).appendChild(m);
    }

    function play() {
      clear();
      var p = plan();
      var now = 0;
      var i = 0;
      log('$ docker compose up');
      $('b-up').disabled = true;
      $('api-bar').style.left = pct(p.apiStart);
      timer = setInterval(function () {
        now = Math.round((now + 0.1) * 10) / 10;
        $('head').style.left = pct(now);
        $('db-init').style.width = pct(Math.min(now, DB_READY));
        $('db-ok').style.left = pct(DB_READY);
        $('db-ok').style.width = now > DB_READY ? pct(now - DB_READY) : '0';
        var apiTo = p.apiEnd === null ? now : Math.min(now, p.apiEnd);
        $('api-bar').style.width = apiTo > p.apiStart ? pct(apiTo - p.apiStart) : '0';
        $('api-bar').className = 'bar ' + (p.apiEnd !== null && now >= p.apiEnd ? 'dead' : 'alive');
        while (i < p.ev.length && p.ev[i].t <= now + 1e-9) {
          var e = p.ev[i++];
          log('[' + e.t.toFixed(1) + 's] ' + e.text);
          mark(e);
        }
        if (now >= END) {
          clearInterval(timer);
          timer = null;
          $('b-up').disabled = false;
          $('verdict').className = p.ok ? 'good' : 'bad';
          $('verdict').textContent = p.ok ? 'api is running and connected ✓' : 'api exited (1): connection refused ✗';
        }
      }, SPEED / 10);
    }

    function changed() {
      clear();
      $('b-up').disabled = false;
      $('yaml').textContent = yaml();
    }
    $('host').onchange = changed;
    $('dep').onchange = changed;
    $('b-up').onclick = play;
    changed();
  }

  // ---------- simulator 3: override / profile merge ----------
  function mergeSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }
    var FILES = {
      base: {
        api: { build: './api', environment: { NODE_ENV: 'production' }, command: 'node server.js' },
        db: { image: 'postgres:17' },
        adminer: { image: 'adminer', profiles: ['debug'], ports: ['8081:8080'] }
      },
      override: {
        api: {
          environment: { NODE_ENV: 'development', DEBUG: 'api:*' },
          ports: ['3000:3000', '9229:9229'],
          volumes: ['./api/src:/app/src'],
          command: 'node --watch --inspect=0.0.0.0 server.js'
        }
      },
      prod: {
        api: {
          image: 'ghcr.io/acme/api:1.4.2',
          environment: { LOG_LEVEL: 'warn' },
          ports: ['80:3000'],
          restart: 'always'
        }
      }
    };
    var KEYS = ['build', 'image', 'command', 'environment', 'ports', 'volumes', 'restart', 'profiles'];

    function merge(a, b) {
      var out = JSON.parse(JSON.stringify(a));
      Object.keys(b).forEach(function (svc) {
        var s = out[svc] || (out[svc] = {});
        Object.keys(b[svc]).forEach(function (k) {
          var v = b[svc][k];
          if (Array.isArray(v)) s[k] = (s[k] || []).concat(v);                     // lists: appended
          else if (typeof v === 'object') s[k] = Object.assign({}, s[k] || {}, v);  // maps: merged by key
          else s[k] = v;                                                           // scalars: replaced
        });
      });
      return out;
    }

    function files() {
      var c = $('cmd').value;
      if (c === 'default') return ['base', 'override'];
      if (c === 'base') return ['base'];
      return ['base', 'prod'];
    }
    function cmdText() {
      var c = $('cmd').value;
      var prof = $('prof').checked ? ' --profile debug' : '';
      var f = c === 'default' ? '' : c === 'base' ? ' -f compose.yaml' : ' -f compose.yaml -f compose.prod.yaml';
      return 'docker compose' + f + prof + ' up -d';
    }
    function toYaml(svc, s) {
      var l = ['  ' + svc + ':'];
      KEYS.forEach(function (k) {
        if (s[k] === undefined) return;
        var v = s[k];
        if (Array.isArray(v)) {
          l.push('    ' + k + ':');
          v.forEach(function (x) { l.push('      - ' + x); });
        } else if (typeof v === 'object') {
          l.push('    ' + k + ':');
          Object.keys(v).forEach(function (x) { l.push('      ' + x + ': ' + v[x]); });
        } else {
          l.push('    ' + k + ': ' + v);
        }
      });
      return l.join('\n');
    }

    function render() {
      var fs = files();
      ['base', 'override', 'prod'].forEach(function (f) {
        $('f-' + f).className = 'file' + (fs.indexOf(f) >= 0 ? ' used' : '');
      });
      var cfg = fs.reduce(function (acc, f) { return merge(acc, FILES[f]); }, {});
      var prof = $('prof').checked;
      var started = Object.keys(cfg).filter(function (s) { return !cfg[s].profiles || prof; });
      $('cmdline').textContent = '$ ' + cmdText();
      $('loaded').textContent = 'files loaded: ' + fs.map(function (f) {
        return { base: 'compose.yaml', override: 'compose.override.yaml (auto)', prod: 'compose.prod.yaml' }[f];
      }).join(' + ');
      $('started').textContent = 'services started: ' + started.join(', ') +
        (prof ? '' : '   (adminer skipped: profile "debug" not active)');
      $('eff').textContent = 'services:\n' + toYaml('api', cfg.api);
      log('$ ' + cmdText().replace(' up -d', ' config') + '   # api only');
      log($('eff').textContent);
      log($('started').textContent);
    }
    $('cmd').onchange = render;
    $('prof').onchange = render;
    render();
  }

  // =====================================================================
  window.LESSONS.push(
    // -------------------------------------------------------------------
    {
      id: 'compose-basics',
      section: 'Docker Compose',
      title: 'Compose basics',
      explain: `
<p>A real app is rarely one container. A web frontend, an API and a database means three long
<code>docker run</code> commands with networks, ports, env vars and volumes, typed in the right order, every time.
<strong>Docker Compose</strong> replaces that with one file describing the whole stack, and one command to start it.</p>
<p>Analogy: <code>docker run</code> is ordering each dish separately and telling the kitchen how to cook it.
<code>compose.yaml</code> is the set menu: write it once, then just say "the usual".</p>

<h3>The file: <code>compose.yaml</code></h3>
<pre><code class="language-yaml">services:                     # one entry per container you want
  web:
    image: nginx:1.27-alpine  # use an existing image...
    ports:
      - "8080:80"             # host:container, same as -p
  api:
    build: ./api              # ...or build one from ./api/Dockerfile
    environment:
      DATABASE_URL: postgres://postgres:example@db:5432/shop
    ports:
      - "3000:3000"
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data   # named volume...

volumes:
  pgdata:                     # ...must be declared here</code></pre>
<ul>
  <li><strong>services</strong>: each key becomes a container (really: one or more replicas of it).</li>
  <li><strong>image</strong> vs <strong>build</strong>: pull a ready image, or build from a folder with a Dockerfile. Long form: <code>build: { context: ./api, dockerfile: Dockerfile.dev, target: dev }</code>. With both, Compose builds and tags the result with the <code>image</code> name.</li>
  <li><strong>ports</strong>, <strong>environment</strong> (map or <code>- KEY=value</code> list), <strong>env_file</strong>, <strong>volumes</strong>, <strong>command</strong>, <strong>restart</strong>: the same ideas as the <code>docker run</code> flags you already know. Quote port mappings (<code>"8080:80"</code>) so YAML never misreads them as numbers.</li>
  <li>Top-level <strong>volumes</strong> (and <strong>networks</strong>, <strong>secrets</strong>, <strong>configs</strong>) declare shared resources.</li>
</ul>
<div class="warn">Don't write <code>version: "3.8"</code> at the top. It's from the old <code>docker-compose</code> v1 era. Compose v2 follows the Compose Specification, ignores it and warns <em>"the attribute <code>version</code> is obsolete"</em>. Also, it's <code>docker compose</code> (a plugin, with a space) now, not <code>docker-compose</code>.</div>

<h3>The everyday commands</h3>
<table>
  <tr><th>Command</th><th>What it does</th></tr>
  <tr><td><code>docker compose up -d</code></td><td>build if needed, create network + volumes + containers, start in the background. Re-running only recreates what changed</td></tr>
  <tr><td><code>docker compose up -d --build</code></td><td>force a rebuild of <code>build:</code> services first</td></tr>
  <tr><td><code>docker compose ps</code></td><td>containers of <em>this</em> project</td></tr>
  <tr><td><code>docker compose logs -f api</code></td><td>follow one service's logs (omit the name for all, color-prefixed)</td></tr>
  <tr><td><code>docker compose exec api sh</code></td><td>shell in a running service</td></tr>
  <tr><td><code>docker compose run --rm api npm test</code></td><td>one-off container from a service's config</td></tr>
  <tr><td><code>docker compose stop</code> / <code>start</code></td><td>stop / start containers, keep them</td></tr>
  <tr><td><code>docker compose down</code></td><td>stop and <strong>remove</strong> containers and the network. Volumes stay</td></tr>
  <tr><td><code>docker compose down -v</code></td><td>…and delete the named volumes too (your DB data!)</td></tr>
  <tr><td><code>docker compose config</code></td><td>print the final, fully-resolved configuration</td></tr>
</table>

<h3>Project names</h3>
<p>Everything Compose creates is prefixed with the <strong>project name</strong>, which defaults to the folder name.
In a folder <code>shop/</code>: network <code>shop_default</code>, volume <code>shop_pgdata</code>, containers
<code>shop-web-1</code>, <code>shop-api-1</code>. Override it with a top-level <code>name: shop</code> or <code>-p</code>.</p>

<h3>Variables</h3>
<p>Compose substitutes <code>\${VAR}</code> in the file from your shell or from a <code>.env</code> file next to
<code>compose.yaml</code>, with defaults: <code>image: "myapi:\${TAG:-latest}"</code>. That <code>.env</code> is
for the <em>Compose file</em>. To put variables <em>into a container</em>, use <code>environment:</code> or
<code>env_file:</code>.</p>
<div class="tip">Commit <code>compose.yaml</code> to the repo. A new teammate runs <code>git clone</code> + <code>docker compose up</code> and has the whole stack. That's the main point of Compose.</div>
`,
      examples: [
        {
          title: 'Compose up / down simulator',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .wrap { display: flex; gap: 12px; }
  pre.yaml { flex: 0 0 43%; margin: 0; background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 8px 10px;
             font: 11px/1.45 ui-monospace, Menlo, monospace; overflow: auto; max-height: 300px; }
  .stack { flex: 1; display: flex; flex-direction: column; gap: 8px; }
  .svc { border: 2px dashed #cbd5e1; border-radius: 10px; padding: 7px 10px; background: #fff; color: #94a3b8; transition: all .25s; }
  .svc b { font-size: 14px; }
  .svc small { display: block; font: 11.5px ui-monospace, monospace; }
  .svc.running { border: 2px solid #16a34a; background: #f0fdf4; color: #14532d; }
  .svc.exited { border: 2px solid #f59e0b; background: #fffbeb; color: #78350f; }
  .res { border-radius: 8px; padding: 5px 9px; font: 12px ui-monospace, monospace; border: 1px dashed #cbd5e1; color: #94a3b8; background: #fff; }
  .res.running { border: 1px solid #6366f1; color: #3730a3; background: #eef2ff; }
  .arrow { text-align: center; color: #94a3b8; font-size: 11px; margin: -6px 0; }
  .btns { margin-top: 8px; }
  .btns button { font: 12px ui-monospace, monospace; }
</style>

<div class="wrap">
  <pre class="yaml"># shop/compose.yaml
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    depends_on:
      - api
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:example@db:5432/shop
    ports:
      - "3000:3000"
    depends_on:
      - db
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:</pre>
  <div class="stack">
    <div class="svc" id="c-web"><b>web</b> <small id="st-web"></small></div>
    <div class="arrow">↓ http://api:3000</div>
    <div class="svc" id="c-api"><b>api</b> <small id="st-api"></small></div>
    <div class="arrow">↓ db:5432</div>
    <div class="svc" id="c-db"><b>db</b> <small id="st-db"></small></div>
    <div class="res" id="c-net"></div>
    <div class="res" id="c-vol"></div>
  </div>
</div>
<div class="btns">
  <button id="b-up">docker compose up -d</button>
  <button id="b-ps">docker compose ps</button>
  <button id="b-logs">docker compose logs api</button>
  <button id="b-order">POST /orders</button>
  <button id="b-stop">docker compose stop</button>
  <button id="b-down">docker compose down</button>
  <button id="b-downv">docker compose down -v</button>
  <button id="b-reset">Reset</button>
</div>

<script>
(${composeSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>Step by step: up, use, down, up again</summary>
  <table>
    <tr><th>Click</th><th>Console (abridged)</th><th>What changed</th></tr>
    <tr><td>docker compose up -d</td><td><code>[+] Building 8.4s (10/10) FINISHED</code> (api has <code>build:</code>)<br><code>✔ Network shop_default Created</code><br><code>✔ Volume "shop_pgdata" Created</code><br><code>✔ Container shop-db-1 Started</code> … api … web</td><td>All cards green. Started in dependency order: db, api, web</td></tr>
    <tr><td>POST /orders ×2</td><td><code>{"id":2,"status":"created"}   web -&gt; api:3000 -&gt; db:5432 -&gt; volume shop_pgdata</code></td><td>Volume card: <code>2 orders stored</code></td></tr>
    <tr><td>docker compose down</td><td><code>✔ Container shop-web-1 Removed</code> … <code>✔ Network shop_default Removed</code><br><code>(volume shop_pgdata is kept: 2 orders survive…)</code></td><td>Containers and network gone, volume stays</td></tr>
    <tr><td>docker compose up -d</td><td>no build this time; network created again, containers Started</td><td>Volume still says 2 orders</td></tr>
    <tr><td>docker compose up -d (again)</td><td><code>✔ Container shop-db-1 Running</code> …</td><td>Nothing to do: <code>up</code> is idempotent</td></tr>
    <tr><td>docker compose down -v</td><td>… <code>✔ Volume shop_pgdata Removed</code></td><td>Data gone. The next <code>up</code> starts with 0 orders</td></tr>
  </table>
</details>
<details>
  <summary>Try this / common mistakes</summary>
  <ul>
    <li>Click <strong>docker compose stop</strong>, then <strong>docker compose ps</strong>: nothing listed (stopped containers need <code>ps -a</code>), but the cards are orange: containers still exist. <strong>up -d</strong> just starts them again.</li>
    <li>Click <strong>POST /orders</strong> after <strong>stop</strong>: <code>Connection refused</code>, nothing is listening.</li>
    <li>Watch the order: <strong>stop</strong> and <strong>down</strong> go web → api → db, the reverse of startup, because of <code>depends_on</code>.</li>
  </ul>
  <div class="warn"><strong>Common mistake:</strong> running <code>docker compose down -v</code> out of habit to "clean up" and wiping your local database. Plain <code>down</code> is enough to remove containers.</div>
</details>
`,
        },
        {
          title: 'The compose.yaml, as you would commit it',
          runnable: false,
          lang: 'yaml',
          code: `# shop/compose.yaml  (no "version:" key: it's obsolete)
name: shop

services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
    volumes:
      - ./web/nginx.conf:/etc/nginx/conf.d/default.conf:ro
    depends_on:
      - api

  api:
    build:
      context: ./api
      target: runtime            # a stage from a multi-stage Dockerfile
    image: shop-api:\${TAG:-dev} # tag for the built image; TAG from shell or .env
    env_file:
      - ./api/.env               # KEY=value lines, not committed
    environment:
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/shop
      NODE_ENV: production
    ports:
      - "127.0.0.1:3000:3000"
    restart: unless-stopped
    init: true                   # same as docker run --init
    depends_on:
      - db

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?set it in .env}
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:`,
        },
        {
          title: 'A Compose session',
          runnable: false,
          lang: 'bash',
          code: `$ cd shop
$ docker compose up -d
[+] Building 8.4s (10/10) FINISHED
[+] Running 5/5
 ✔ Network shop_default    Created
 ✔ Volume "shop_pgdata"    Created
 ✔ Container shop-db-1     Started
 ✔ Container shop-api-1    Started
 ✔ Container shop-web-1    Started

$ docker compose ps
NAME         IMAGE               SERVICE   STATUS         PORTS
shop-api-1   shop-api:dev        api       Up 5 seconds   127.0.0.1:3000->3000/tcp
shop-db-1    postgres:17         db        Up 6 seconds   5432/tcp
shop-web-1   nginx:1.27-alpine   web       Up 5 seconds   0.0.0.0:8080->80/tcp

$ docker compose logs -f --tail 20 api
api-1  | Server listening on 0.0.0.0:3000

$ docker compose exec db psql -U postgres -c 'select 1'
$ docker compose run --rm api npm test

$ docker compose down            # containers + network removed, volume kept
$ docker compose down -v         # ...and the pgdata volume too`,
        },
      ],
      quiz: [
        {
          q: 'What should the first line of a new <code>compose.yaml</code> be?',
          options: [
            'version: "3.8"',
            'version: "3"',
            'Nothing special: start with services: (the version key is obsolete)',
            'compose: v2',
          ],
          answer: 2,
          why: 'Compose v2 implements the Compose Specification and ignores version:, printing a warning. Start with services: (optionally name:).',
        },
        {
          q: 'What is the difference between <code>image:</code> and <code>build:</code> for a service?',
          options: [
            'None, they are aliases',
            'image uses an existing image (pulled if needed); build builds one from a Dockerfile in the given context',
            'build is only for production',
            'image is required, build is optional',
          ],
          answer: 1,
          why: 'build: ./api builds from ./api/Dockerfile. If you set both, Compose builds and tags the result with the image name.',
        },
        {
          q: 'After <code>docker compose down</code> (no flags), what still exists?',
          options: [
            'Nothing',
            'The containers',
            'The named volumes (e.g. shop_pgdata)',
            'The network',
          ],
          answer: 2,
          why: 'down removes containers and networks. Named volumes are kept unless you add -v.',
        },
        {
          q: 'Your project folder is <code>shop/</code> and has a service <code>api</code>. What is the container called by default?',
          options: ['api', 'shop_api', 'shop-api-1', 'compose-api'],
          answer: 2,
          why: 'Compose v2 names containers <project>-<service>-<index>. The network is shop_default, volumes are shop_<name>.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This compose file is a mix of old habits and bugs. Fix it so that:</p>
<ul>
  <li>there is <strong>no <code>version:</code></strong> key;</li>
  <li><code>web</code> is reachable at <code>http://localhost:8080</code> (nginx listens on 80 inside);</li>
  <li><code>api</code> is <strong>built</strong> from the <code>./api</code> folder (not pulled) and published on port <code>3000</code> (same on both sides);</li>
  <li><code>db</code> gets a <code>POSTGRES_PASSWORD</code>;</li>
  <li>the named volume <code>pgdata</code> is declared at the top level.</li>
</ul>
<p>Edit the compose file in the box below and click <strong>Check</strong>. Use 2-space indentation.</p>`,
        hint: 'Delete the version line. web: - "8080:80". api: build: ./api plus ports: - "3000:3000". db: environment: POSTGRES_PASSWORD: example. At the end, a top-level volumes: with pgdata: under it.',
        starter: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 300, value: `version: "3.8"
services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "80:8080"
  api:
    image: ./api
    environment:
      DATABASE_URL: postgres://postgres:example@db:5432/shop
  db:
    image: postgres:17
    volumes:
      - pgdata:/var/lib/postgresql/data` },
          ],
          basicsRules(), [services, topBlock]
        ),
        solution: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 300, value: `services:
  web:
    image: nginx:1.27-alpine
    ports:
      - "8080:80"
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:example@db:5432/shop
    ports:
      - "3000:3000"
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: example
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:` },
          ],
          basicsRules(), [services, topBlock]
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'compose-networking-deps',
      section: 'Docker Compose',
      title: 'Networking, depends_on & healthchecks',
      explain: `
<h3>Every project gets its own network</h3>
<p>On <code>up</code>, Compose creates a user-defined bridge network called <code>&lt;project&gt;_default</code>
and attaches every service to it. Remember from the networking lesson: user-defined networks have DNS. So each
service can reach the others <strong>by service name</strong>:</p>
<ul>
  <li><code>api</code> connects to <code>db:5432</code>, not <code>localhost:5432</code>. Inside the api container, <code>localhost</code> is the api container itself.</li>
  <li>Use the <strong>container port</strong> (5432), not a published host port. <code>ports:</code> is only for traffic from your host/browser. A database usually needs no <code>ports:</code> at all.</li>
  <li>With <code>deploy.replicas</code> or <code>--scale api=3</code>, the name <code>api</code> resolves to all replicas.</li>
</ul>
<p>Want isolation, e.g. web must not reach db? Declare networks yourself:</p>
<pre><code class="language-yaml">services:
  web:
    networks: [frontend]
  api:
    networks: [frontend, backend]   # api is on both, the bridge between them
  db:
    networks: [backend]

networks:
  frontend:
  backend:</code></pre>

<h3><code>depends_on</code> is about <em>order</em>, not <em>readiness</em></h3>
<p>This is the #1 Compose surprise. The short form:</p>
<pre><code class="language-yaml">    depends_on:
      - db</code></pre>
<p>only means "<strong>start</strong> the db container before the api container" (and stop them in reverse order). A
container being <em>started</em> just means its process was launched. Postgres then needs a few seconds to
initialise before it accepts connections. If api connects immediately, it gets
<code>ECONNREFUSED</code> and crashes. That's a race, and on a fast laptop you may win it by luck and lose it in CI.</p>
<p>Analogy: "the restaurant opened its doors" (started) is not "the kitchen is ready to take orders" (healthy).</p>

<h3>Waiting for real readiness: healthcheck + <code>condition</code></h3>
<pre><code class="language-yaml">services:
  api:
    depends_on:
      db:
        condition: service_healthy     # wait until db's healthcheck passes
        restart: true                  # also restart api if db is restarted
  db:
    image: postgres:17
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -h localhost"]
      interval: 2s        # run the check every 2s
      timeout: 3s         # a single check may take at most 3s
      retries: 15         # unhealthy after 15 consecutive failures
      start_period: 10s   # failures during warm-up don't count</code></pre>
<p>A healthcheck is a command Docker runs <em>inside</em> the container periodically. Exit 0 = healthy. The container
status goes <code>starting</code> → <code>healthy</code> (or <code>unhealthy</code>), visible in <code>docker compose ps</code>.
It can also come from a <code>HEALTHCHECK</code> instruction in the image's Dockerfile.</p>
<table>
  <tr><th><code>condition:</code></th><th>api starts when db…</th><th>Use for</th></tr>
  <tr><td><code>service_started</code> (default, = short form)</td><td>has been started</td><td>ordering only</td></tr>
  <tr><td><code>service_healthy</code></td><td>reports healthy</td><td>databases, brokers, anything with a warm-up</td></tr>
  <tr><td><code>service_completed_successfully</code></td><td>has run and exited with 0</td><td>one-shot jobs: DB migrations, seeding</td></tr>
</table>
<p><code>docker compose up -d --wait</code> also waits until all services are running/healthy before returning, which is handy in CI scripts.</p>
<div class="tip">Still make your app <strong>retry</strong> its DB connection with a backoff. Databases restart, networks blip, and Kubernetes (coming up) has <em>no</em> <code>depends_on</code> at all. Healthchecks make startup clean; retries make the app robust.</div>
`,
      examples: [
        {
          title: 'Startup race: depends_on vs service_healthy',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; }
  .ctl select { font: 12.5px ui-monospace, monospace; }
  .wrap { display: flex; gap: 12px; margin-top: 8px; }
  pre#yaml { flex: 0 0 46%; margin: 0; background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 7px 9px;
             font: 10.5px/1.45 ui-monospace, Menlo, monospace; overflow: auto; max-height: 250px; }
  .tl { flex: 1; }
  .lane { position: relative; height: 34px; margin: 4px 0 4px 34px; background: #fff; border: 1px solid #d5d9e3; border-radius: 6px; }
  .lane:before { content: attr(data-n); position: absolute; left: -34px; top: 8px; font: 600 12px system-ui; color: #475569; }
  .bar { position: absolute; top: 11px; height: 12px; width: 0; border-radius: 3px; }
  #db-init { left: 0; background: #cbd5e1; }
  #db-ok { background: #22c55e; }
  #api-bar.alive { background: #3b82f6; }
  #api-bar.dead { background: #f87171; }
  .mk { position: absolute; top: 0; transform: translateX(-50%); font: 700 12px system-ui; line-height: 12px; }
  .mk.fail { color: #dc2626; font-size: 15px; }
  .mk.ok { color: #16a34a; font-size: 15px; }
  .mk.hc-bad { color: #94a3b8; top: 22px; }
  .mk.hc-ok { color: #16a34a; top: 22px; }
  .mk.ready { color: #15803d; top: 22px; }
  .mk.start { color: #475569; top: 22px; font-size: 10px; }
  .axis { position: relative; height: 14px; margin-left: 34px; font: 10px ui-monospace, monospace; color: #64748b; }
  .axis span { position: absolute; transform: translateX(-50%); }
  #head { position: absolute; top: -84px; width: 2px; height: 84px; background: #f59e0b; left: 0; }
  .legend { font-size: 11.5px; color: #475569; margin-top: 6px; line-height: 1.5; }
  #verdict { margin-top: 6px; font-weight: 600; }
  #verdict.good { color: #15803d; }
  #verdict.bad { color: #b91c1c; }
</style>

<div class="ctl">
  <label>api DATABASE_URL host
    <select id="host">
      <option value="db">db</option>
      <option value="localhost">localhost</option>
    </select>
  </label>
  <label>api waits via
    <select id="dep">
      <option value="none">(no depends_on)</option>
      <option value="started" selected>depends_on: [db]</option>
      <option value="healthy">condition: service_healthy + healthcheck</option>
    </select>
  </label>
  <button id="b-up">docker compose up ▶</button>
</div>

<div class="wrap">
  <pre id="yaml"></pre>
  <div class="tl">
    <div class="lane" id="lane-db" data-n="db">
      <div class="bar" id="db-init"></div>
      <div class="bar" id="db-ok"></div>
    </div>
    <div class="lane" id="lane-api" data-n="api">
      <div class="bar alive" id="api-bar"></div>
    </div>
    <div class="axis">
      <div id="head"></div>
      <span style="left:0%">0s</span><span style="left:16.66%">1s</span><span style="left:33.33%">2s</span>
      <span style="left:50%">3s</span><span style="left:66.66%">4s</span><span style="left:83.33%">5s</span>
      <span style="left:100%">6s</span>
    </div>
    <div class="legend">grey = postgres initialising · green = accepting connections<br>
      ▶ started · ♡ healthcheck failed · ♥ healthy · ● ready · ✓ / ✗ api's connection attempt</div>
    <div id="verdict"></div>
  </div>
</div>

<script>
(${raceSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>The problem: <code>depends_on: [db]</code> still crashes api</summary>
  <p>Keep the defaults (host <code>db</code>, <code>depends_on: [db]</code>) and click <strong>docker compose up ▶</strong>. Postgres takes 3.5 s to initialise; api tries to connect 0.5 s after it starts:</p>
  <table>
    <tr><th>Time</th><th>What happens</th><th>Console</th></tr>
    <tr><td>0.0s</td><td>db container launched. The grey bar grows: postgres is initialising</td><td><code>[0.0s]  ✔ Container shop-db-1   Started</code></td></tr>
    <tr><td>0.2s</td><td><code>depends_on</code> satisfied: db is <em>started</em>, so Compose starts api</td><td><code>[0.2s]  ✔ Container shop-api-1  Started</code></td></tr>
    <tr><td>0.7s</td><td>api connects to <code>db:5432</code>. DNS works (172.20.0.2) but nothing listens yet</td><td><code>[0.7s] api-1  | Error: connect ECONNREFUSED 172.20.0.2:5432</code><br><code>[0.7s] api-1 exited with code 1</code></td></tr>
    <tr><td>3.5s</td><td>postgres ready, too late</td><td><code>[3.5s] db-1   | database system is ready to accept connections</code></td></tr>
  </table>
  <p>Verdict: <code>api exited (1): connection refused ✗</code>. <code>(no depends_on)</code> fails the same way; api just starts at 0.0 s instead of 0.2 s.</p>
</details>
<details>
  <summary>The fix: a healthcheck on db + <code>condition: service_healthy</code> on api</summary>
  <pre><code class="language-yaml">  api:
    depends_on:
      db:
        condition: service_healthy                                  # ③ gate api on db's health
  db:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -h localhost"]    # ① the readiness probe
      interval: 1s                                                  # ② how often to probe
      retries: 10</code></pre>
  <ol>
    <li><strong>①</strong> <code>pg_isready</code> exits 0 only when postgres accepts connections. <code>-h localhost</code> forces a TCP check: during first-time init, the postgres image runs a temporary server on a Unix socket only, and a socket check could say "ready" too early.</li>
    <li><strong>②</strong> Docker runs the probe every second. Until one succeeds, db is <code>health: starting</code>. After 10 failures in a row it would be <code>unhealthy</code> and api would never start (<code>up</code> reports an error).</li>
    <li><strong>③</strong> Compose holds api back until db is <code>healthy</code>.</li>
  </ol>
  <p>Pick <strong>condition: service_healthy + healthcheck</strong> and run again:</p>
  <table>
    <tr><th>Time</th><th>What happens</th><th>Console</th></tr>
    <tr><td>0.0s</td><td>db started, api waiting</td><td><code>[0.0s]  ✔ Container shop-db-1   Started</code></td></tr>
    <tr><td>1.0 / 2.0 / 3.0s</td><td>probes fail (♡ markers)</td><td><code>db-1 healthcheck: pg_isready -&gt; no response (status: starting)</code></td></tr>
    <tr><td>3.5s</td><td>postgres ready</td><td><code>[3.5s] db-1   | database system is ready to accept connections</code></td></tr>
    <tr><td>4.0s</td><td>next probe passes (♥)</td><td><code>[4.0s] db-1 healthcheck: pg_isready -&gt; accepting connections</code><br><code>[4.0s]  ✔ Container shop-db-1   Healthy</code></td></tr>
    <tr><td>4.1s</td><td>now api starts</td><td><code>[4.1s]  ✔ Container shop-api-1  Started</code></td></tr>
    <tr><td>4.6s</td><td>connection succeeds</td><td><code>[4.6s] api-1  | connected to db:5432 ✓ listening on :3000</code></td></tr>
  </table>
</details>
<details>
  <summary>Try this: the other bug, <code>localhost</code></summary>
  <p>Keep <strong>service_healthy</strong> but switch the host to <strong>localhost</strong>. The wait is perfect, db is
  healthy at 4.0 s, and api still dies at 4.6 s with <code>Error: connect ECONNREFUSED 127.0.0.1:5432</code>. Inside
  the api container, 127.0.0.1 is api itself, and nothing listens on 5432 there. Waiting fixes <em>when</em>;
  the service name fixes <em>where</em>. You need both.</p>
  <div class="warn"><strong>Common mistake:</strong> adding <code>condition: service_healthy</code> without a <code>healthcheck:</code> on the db service (or in its image). Compose then refuses to start with an error that the dependency has no healthcheck configured.</div>
</details>
`,
        },
        {
          title: 'API + migrations + DB with proper waiting',
          runnable: false,
          lang: 'yaml',
          code: `services:
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/app   # service name, container port
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
        restart: true                          # restart api when db is restarted by compose
      migrate:
        condition: service_completed_successfully

  migrate:                                     # one-shot job: runs, exits 0, done
    build: ./api
    command: ["npm", "run", "migrate"]
    environment:
      DATABASE_URL: postgres://postgres:\${POSTGRES_PASSWORD}@db:5432/app
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD:?set it in .env}
      POSTGRES_DB: app
    volumes:
      - pgdata:/var/lib/postgresql/data
    # no "ports:": only other services need it, via db:5432
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d app -h localhost"]
      interval: 2s
      timeout: 3s
      retries: 15
      start_period: 10s

volumes:
  pgdata:`,
        },
        {
          title: 'Watching it happen',
          runnable: false,
          lang: 'bash',
          code: `$ docker compose up -d
[+] Running 4/4
 ✔ Network app_default      Created
 ✔ Container app-db-1       Healthy
 ✔ Container app-migrate-1  Exited
 ✔ Container app-api-1      Started

$ docker compose ps -a
NAME            SERVICE   STATUS                     PORTS
app-api-1       api       Up 3 seconds               0.0.0.0:3000->3000/tcp
app-db-1        db        Up 12 seconds (healthy)    5432/tcp
app-migrate-1   migrate   Exited (0) 4 seconds ago

# DNS inside the project network
$ docker compose exec api getent hosts db
172.20.0.2      db

# Health history of a container
$ docker inspect --format '{{json .State.Health.Status}}' app-db-1
"healthy"

# In CI: block until everything is healthy (or fail)
$ docker compose up -d --wait`,
        },
      ],
      quiz: [
        {
          q: 'In Compose, how should the <code>api</code> service connect to the <code>db</code> service\'s Postgres?',
          options: ['localhost:5432', 'db:5432', 'host.docker.internal:5432', '127.0.0.1:5432'],
          answer: 1,
          why: 'All services share the project network, where service names resolve via DNS. localhost inside api is api itself.',
        },
        {
          q: 'api has <code>depends_on: [db]</code> (short form). What does Compose guarantee?',
          options: [
            'db accepts connections before api starts',
            'db\'s container is started before api\'s container; nothing about readiness',
            'api is restarted until db is ready',
            'api and db start in parallel',
          ],
          answer: 1,
          why: 'Short form = condition: service_started. For readiness you need a healthcheck and condition: service_healthy.',
        },
        {
          q: 'You add <code>condition: service_healthy</code> for db, but db has no healthcheck anywhere. What happens?',
          options: [
            'Compose waits forever',
            'Compose treats db as healthy immediately',
            'Compose errors out: the dependency has no healthcheck configured',
            'Compose uses pg_isready automatically',
          ],
          answer: 2,
          why: 'service_healthy requires a healthcheck, in the compose file or the image\'s HEALTHCHECK. Without one, up fails with an error.',
        },
        {
          q: 'Which condition fits a <code>migrate</code> service that must finish before api starts?',
          options: ['service_started', 'service_healthy', 'service_completed_successfully', 'service_exited'],
          answer: 2,
          why: 'service_completed_successfully waits for the dependency to run to completion with exit code 0.',
        },
        {
          q: 'Does db need <code>ports: ["5432:5432"]</code> for api to reach it?',
          options: [
            'Yes, always',
            'No: ports: publishes to the host; containers on the same network use the container port directly',
            'Only on Docker Desktop',
            'Only with depends_on',
          ],
          answer: 1,
          why: 'Publishing is for host/browser access. Leaving the DB unpublished is safer.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>The api crashes on startup with <code>ECONNREFUSED 127.0.0.1:5432</code>. Fix the compose file so that:</p>
<ul>
  <li>api's <code>DATABASE_URL</code> points at the <strong>db service</strong> (port 5432), not localhost;</li>
  <li>api <strong>waits until db is healthy</strong> (long-form <code>depends_on</code> with <code>condition: service_healthy</code>);</li>
  <li>db has a <code>healthcheck</code> that runs <code>pg_isready</code>, with an <code>interval</code> and <code>retries</code>.</li>
</ul>
<p>Edit the compose file in the box below and click <strong>Check</strong>. Use 2-space indentation.</p>`,
        hint: 'DATABASE_URL: postgres://postgres:secret@db:5432/app. Under api: depends_on: / db: / condition: service_healthy. Under db: healthcheck: / test: ["CMD-SHELL", "pg_isready -U postgres -h localhost"] / interval: 2s / retries: 10.',
        starter: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 300, value: `services:
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:secret@localhost:5432/app
    ports:
      - "3000:3000"
    depends_on:
      - db
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret` },
          ],
          depsRules(), [services]
        ),
        solution: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 300, value: `services:
  api:
    build: ./api
    environment:
      DATABASE_URL: postgres://postgres:secret@db:5432/app
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -h localhost"]
      interval: 2s
      timeout: 3s
      retries: 10` },
          ],
          depsRules(), [services]
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'compose-dev-workflow',
      section: 'Docker Compose',
      title: 'Dev workflow: overrides, profiles & watch',
      explain: `
<p>The same stack has to work on your laptop (hot reload, debugger, extra tools) and in CI/production (built
images, no source mounts). Instead of copy-pasting compose files, Compose lets you <strong>layer</strong> them and
<strong>switch parts on and off</strong>.</p>

<h3>Override files</h3>
<p>If you run plain <code>docker compose up</code> and there's a <code>compose.override.yaml</code> next to
<code>compose.yaml</code>, Compose <strong>automatically merges</strong> it on top. That's the standard place for
dev-only settings. Keep the base file production-like, put dev tweaks in the override.</p>
<p>With <code>-f</code> you choose the files yourself (then the override is <em>not</em> auto-loaded). Later files win:</p>
<pre><code class="language-bash">docker compose up                                          # compose.yaml + compose.override.yaml
docker compose -f compose.yaml up                          # base only
docker compose -f compose.yaml -f compose.prod.yaml up     # base + prod, no override
docker compose -f compose.yaml -f compose.prod.yaml config # show the merged result</code></pre>
<p>Merge rules in short:</p>
<ul>
  <li><strong>Single values</strong> (<code>image</code>, <code>command</code>, <code>restart</code>) are <strong>replaced</strong>.</li>
  <li><strong>Maps</strong> (<code>environment</code>, <code>labels</code>) are <strong>merged by key</strong>; the later file wins per key.</li>
  <li><strong>Lists</strong> like <code>ports</code> are <strong>combined</strong>. <code>volumes</code> are merged by container path, so an override can replace a mount at the same target.</li>
  <li>To remove something inherited, use the YAML tags <code>!reset</code> (e.g. <code>ports: !reset []</code>) or <code>!override</code> to replace a whole list.</li>
</ul>
<p>An alternative for big setups is a top-level <code>include:</code> that pulls in other compose files as sub-projects.</p>

<h3>Profiles: optional services</h3>
<pre><code class="language-yaml">services:
  adminer:
    image: adminer
    profiles: [debug]        # only started when the "debug" profile is active
    ports:
      - "8081:8080"</code></pre>
<p>Services <strong>without</strong> <code>profiles</code> always start. Services with a profile start only when you
enable it: <code>docker compose --profile debug up</code> or <code>COMPOSE_PROFILES=debug</code>. Explicitly
targeting a service (<code>docker compose up adminer</code>) also starts it. Great for admin UIs, mail catchers, load-test tools.</p>

<h3>Hot reload option 1: bind mount</h3>
<p>Mount your source into the container (<code>./api/src:/app/src</code>) and run the app in watch mode
(<code>node --watch</code>, nodemon, Vite). Simple and instant, but: file-watching events can be slow or missing on
some setups, and mounting the whole project hides <code>node_modules</code> built for Linux inside the image (see the volumes lesson).</p>

<h3>Hot reload option 2: <code>docker compose watch</code></h3>
<p>Compose Watch <em>copies</em> changed files into the running container, or rebuilds it, according to rules in a
<code>develop.watch</code> section. It's designed for services you build locally (<code>build:</code>).</p>
<pre><code class="language-yaml">services:
  api:
    build: ./api
    develop:
      watch:
        - action: sync             # copy changed files into the container
          path: ./api/src
          target: /app/src
          ignore:
            - "**/*.test.js"
        - action: sync+restart     # copy, then restart the container
          path: ./api/config
          target: /app/config
        - action: rebuild          # rebuild the image and recreate the container
          path: ./api/package.json</code></pre>
<p>Start it with <code>docker compose watch</code> (or <code>docker compose up --watch</code>). Edit a file in
<code>src/</code> and it's synced in about a second, and your in-container dev server (e.g. <code>node --watch</code>)
reloads. Change <code>package.json</code> and the image rebuilds with the new dependencies. Paths are relative to the
compose file; files in <code>.dockerignore</code> are ignored.</p>
<div class="tip">Rule of thumb: <strong>sync</strong> for source code the app hot-reloads, <strong>sync+restart</strong> for config read at startup, <strong>rebuild</strong> for dependency manifests and the Dockerfile.</div>
<div class="warn">For <code>sync</code> to work, the container's user must be allowed to write to <code>target</code>. If your image runs as <code>USER node</code>, <code>COPY --chown=node:node</code> the app directory in the Dockerfile.</div>
`,
      examples: [
        {
          title: 'Which files, which services? Merge & profile simulator',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; }
  .ctl select { font: 12px ui-monospace, monospace; }
  .files { display: flex; gap: 6px; margin-top: 8px; }
  .file { flex: 1; border: 2px dashed #cbd5e1; border-radius: 8px; background: #fff; opacity: .45; transition: all .2s; }
  .file.used { border: 2px solid #6366f1; opacity: 1; }
  .file h5 { margin: 0; padding: 3px 7px; font: 600 11.5px ui-monospace, monospace; background: #eef2ff; border-radius: 6px 6px 0 0; }
  .file pre { margin: 0; padding: 4px 7px; font: 10.5px/1.4 ui-monospace, Menlo, monospace; white-space: pre; overflow-x: auto; }
  .out { margin-top: 8px; background: #1e293b; color: #e2e8f0; border-radius: 8px; padding: 7px 10px;
         font: 11.5px/1.45 ui-monospace, Menlo, monospace; }
  .out div { white-space: pre-wrap; }
  #cmdline { color: #7dd3fc; }
  #loaded, #started { color: #fcd34d; }
  #eff { margin: 4px 0; white-space: pre; }
</style>

<div class="ctl">
  <label>command
    <select id="cmd">
      <option value="default">docker compose up -d</option>
      <option value="base">docker compose -f compose.yaml up -d</option>
      <option value="prod">docker compose -f compose.yaml -f compose.prod.yaml up -d</option>
    </select>
  </label>
  <label><input type="checkbox" id="prof"> --profile debug</label>
</div>

<div class="files">
  <div class="file" id="f-base"><h5>compose.yaml</h5><pre>services:
  api:
    build: ./api
    environment:
      NODE_ENV: production
    command: node server.js
  db:
    image: postgres:17
  adminer:
    image: adminer
    profiles: [debug]
    ports:
      - "8081:8080"</pre></div>
  <div class="file" id="f-override"><h5>compose.override.yaml</h5><pre>services:
  api:
    environment:
      NODE_ENV: development
      DEBUG: "api:*"
    ports:
      - "3000:3000"
      - "9229:9229"
    volumes:
      - ./api/src:/app/src
    command: node --watch
      --inspect=0.0.0.0 server.js</pre></div>
  <div class="file" id="f-prod"><h5>compose.prod.yaml</h5><pre>services:
  api:
    image: ghcr.io/acme/api:1.4.2
    environment:
      LOG_LEVEL: warn
    ports:
      - "80:3000"
    restart: always</pre></div>
</div>

<div class="out">
  <div id="cmdline"></div>
  <div id="loaded"></div>
  <div id="eff"></div>
  <div id="started"></div>
</div>

<script>
(${mergeSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>Step by step: the three commands</summary>
  <table>
    <tr><th>Command</th><th>files loaded</th><th>effective api config</th></tr>
    <tr><td><code>docker compose up -d</code></td><td><code>compose.yaml + compose.override.yaml (auto)</code></td><td><code>NODE_ENV: development</code> (map key replaced), <code>DEBUG</code> added, ports 3000 + 9229, source mounted, <code>command: node --watch --inspect=0.0.0.0 server.js</code> (scalar replaced)</td></tr>
    <tr><td><code>-f compose.yaml</code></td><td><code>compose.yaml</code></td><td>just the base: <code>NODE_ENV: production</code>, <code>node server.js</code>, no ports</td></tr>
    <tr><td><code>-f compose.yaml -f compose.prod.yaml</code></td><td><code>compose.yaml + compose.prod.yaml</code></td><td><code>image</code> added next to <code>build</code>, <code>NODE_ENV: production</code> kept <em>and</em> <code>LOG_LEVEL: warn</code> added (maps merge), <code>ports: 80:3000</code>, <code>restart: always</code>. The override file is <strong>not</strong> loaded</td></tr>
  </table>
  <p>Every change also prints the same result to the console as <code>docker compose … config   # api only</code>, which is exactly the command to use on your machine when you're unsure what the final config is.</p>
</details>
<details>
  <summary>Try this: profiles</summary>
  <p>With the checkbox off, the last line says <code>services started: api, db   (adminer skipped: profile "debug" not active)</code>.
  Tick <strong>--profile debug</strong>: <code>services started: api, db, adminer</code>. api and db have no
  <code>profiles</code>, so they always run. A profile can only <em>add</em> services, never remove the core ones.</p>
  <div class="warn"><strong>Common mistake:</strong> putting production settings in <code>compose.override.yaml</code>. It's picked up automatically by anyone who runs plain <code>docker compose up</code>. Keep the override for dev, and name production layers explicitly (<code>-f compose.prod.yaml</code>).</div>
</details>
`,
        },
        {
          title: 'compose.yaml with Compose Watch',
          runnable: false,
          lang: 'yaml',
          code: `services:
  api:
    build: ./api
    command: ["node", "--watch", "server.js"]   # in-container reloader for synced files
    ports:
      - "3000:3000"
    develop:
      watch:
        - action: sync
          path: ./api/src
          target: /app/src
          ignore:
            - "**/*.test.js"
        - action: rebuild
          path: ./api/package.json
        - action: rebuild
          path: ./api/Dockerfile

  web:
    build: ./web
    ports:
      - "5173:5173"
    develop:
      watch:
        - action: sync
          path: ./web/src
          target: /app/src

  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret

  mailpit:                       # fake SMTP + web UI, only when needed
    image: axllent/mailpit
    profiles: [debug]
    ports:
      - "8025:8025"`,
        },
        {
          title: 'A dev session with watch, overrides and profiles',
          runnable: false,
          lang: 'bash',
          code: `$ docker compose watch
[+] Running 3/3
 ✔ Container shop-db-1   Started
 ✔ Container shop-api-1  Started
 ✔ Container shop-web-1  Started
Watch enabled
# ...edit api/src/routes.js in your editor...
Syncing service "api" after 1 changes were detected
# ...edit api/package.json...
Rebuilding service(s) ["api"] after changes were detected...
 ✔ Container shop-api-1  Recreated

# Or: start normally and watch in the same terminal
$ docker compose up --watch

# Optional services
$ docker compose --profile debug up -d        # also starts mailpit
$ COMPOSE_PROFILES=debug docker compose up -d # same, via env var

# Production-like run: base + prod layer (override NOT loaded)
$ docker compose -f compose.yaml -f compose.prod.yaml config   # check the merge first
$ docker compose -f compose.yaml -f compose.prod.yaml up -d`,
        },
      ],
      quiz: [
        {
          q: 'You run <code>docker compose up</code> in a folder with <code>compose.yaml</code> and <code>compose.override.yaml</code>. Which files are used?',
          options: [
            'Only compose.yaml',
            'Both: the override is merged on top automatically',
            'Only compose.override.yaml',
            'Neither: you must pass -f',
          ],
          answer: 1,
          why: 'Without -f, Compose loads compose.yaml and, if present, compose.override.yaml. With -f you list the files yourself.',
        },
        {
          q: 'Base has <code>environment: {NODE_ENV: production, PORT: "3000"}</code>; a later file has <code>environment: {NODE_ENV: development}</code>. Result?',
          options: [
            'Only NODE_ENV=development (the whole map replaced)',
            'NODE_ENV=development and PORT=3000 (maps merge by key)',
            'NODE_ENV=production and PORT=3000',
            'An error: duplicate key',
          ],
          answer: 1,
          why: 'Maps like environment are merged per key, with the later file winning for keys that exist in both.',
        },
        {
          q: 'A service has <code>profiles: [debug]</code>. When does <code>docker compose up</code> start it?',
          options: [
            'Always',
            'Only when the debug profile is enabled (--profile debug / COMPOSE_PROFILES) or the service is targeted explicitly',
            'Only in production',
            'Never, profiles are for docker compose run only',
          ],
          answer: 1,
          why: 'Services with profiles are opt-in. Services without profiles always start.',
        },
        {
          q: 'In <code>develop.watch</code>, which action fits changes to <code>package.json</code>?',
          options: ['sync', 'sync+restart', 'rebuild', 'ignore'],
          answer: 2,
          why: 'New dependencies must be installed in the image, so the image is rebuilt and the container recreated. sync is for source files the app hot-reloads.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Set up a smooth dev loop in this compose file:</p>
<ul>
  <li>api gets a <code>develop.watch</code> section with a <strong>sync</strong> rule: <code>./api/src</code> → <code>/app/src</code>;</li>
  <li>…and a <strong>rebuild</strong> rule for <code>./api/package.json</code>;</li>
  <li><code>adminer</code> only starts with the <code>debug</code> profile;</li>
  <li>api and db still start without any profile.</li>
</ul>
<p>Edit the compose file in the box below and click <strong>Check</strong>. Use 2-space indentation.</p>`,
        hint: 'Under api: develop: / watch: / - action: sync, path: ./api/src, target: /app/src / - action: rebuild, path: ./api/package.json. Under adminer: profiles: [debug].',
        starter: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 320, value: `services:
  api:
    build: ./api
    ports:
      - "3000:3000"
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
  adminer:
    image: adminer
    ports:
      - "8081:8080"` },
          ],
          devRules(), [services, items]
        ),
        solution: widget(
          [
            { id: 'y', label: 'compose.yaml', height: 320, value: `services:
  api:
    build: ./api
    ports:
      - "3000:3000"
    develop:
      watch:
        - action: sync
          path: ./api/src
          target: /app/src
        - action: rebuild
          path: ./api/package.json
  db:
    image: postgres:17
    environment:
      POSTGRES_PASSWORD: secret
  adminer:
    image: adminer
    profiles: [debug]
    ports:
      - "8081:8080"` },
          ],
          devRules(), [services, items]
        ),
      },
    },
  );

  // ---------- exercise rules (serialized into the widgets) ----------
  function basicsRules() {
    return [
      ['no obsolete version: key', function (v) { return !/^version\s*:/m.test(v('y')); }],
      ['web publishes "8080:80"', function (v) {
        var s = services(v('y')).web || '';
        return /^\s*-\s*["']?(0\.0\.0\.0:|127\.0\.0\.1:)?8080:80["']?\s*$/m.test(s);
      }],
      ['api is built from ./api (build:, not image:)', function (v) {
        var s = services(v('y')).api || '';
        return /^\s+build:\s*["']?\.\/api\/?["']?\s*$/m.test(s) || /^\s+context:\s*["']?\.\/api\/?["']?\s*$/m.test(s)
          ? !/^\s+image:\s*["']?\.\//m.test(s) : false;
      }],
      ['api publishes "3000:3000"', function (v) {
        var s = services(v('y')).api || '';
        return /^\s*-\s*["']?(0\.0\.0\.0:|127\.0\.0\.1:)?3000:3000["']?\s*$/m.test(s);
      }],
      ['db sets POSTGRES_PASSWORD', function (v) {
        var s = services(v('y')).db || '';
        return /POSTGRES_PASSWORD\s*[:=]\s*\S+/.test(s);
      }],
      ['top-level volumes: declares pgdata', function (v) {
        var b = topBlock(v('y'), 'volumes');
        return b !== null && /^ {2}pgdata\s*:/m.test(b);
      }],
    ];
  }
  function depsRules() {
    return [
      ['api DATABASE_URL uses host db:5432', function (v) {
        var s = services(v('y')).api || '';
        return /DATABASE_URL\s*[:=]\s*["']?postgres(ql)?:\/\/[^@\s]+@db:5432\b/.test(s);
      }],
      ['api no longer uses localhost', function (v) {
        var s = services(v('y')).api || '';
        return !/localhost|127\.0\.0\.1/.test(s);
      }],
      ['api depends_on db with condition: service_healthy', function (v) {
        var s = services(v('y')).api || '';
        return /depends_on:\s*\n\s+db:\s*\n\s+condition:\s*service_healthy\b/.test(s);
      }],
      ['db has a healthcheck running pg_isready', function (v) {
        var s = services(v('y')).db || '';
        return /healthcheck:/.test(s) && /test:.*pg_isready/.test(s);
      }],
      ['healthcheck sets interval and retries', function (v) {
        var s = services(v('y')).db || '';
        return /^\s+interval:\s*\d+(\.\d+)?(ms|s|m)\b/m.test(s) && /^\s+retries:\s*\d+\s*$/m.test(s);
      }],
    ];
  }
  function devRules() {
    return [
      ['api has develop: -> watch:', function (v) {
        var s = services(v('y')).api || '';
        return /^ {4}develop:\s*$/m.test(s) && /^\s+watch:\s*$/m.test(s);
      }],
      ['sync rule: ./api/src -> /app/src', function (v) {
        var s = services(v('y')).api || '';
        return items(s).some(function (it) {
          return /action:\s*sync\s*$/m.test(it) && /path:\s*["']?\.\/api\/src\/?["']?\s*$/m.test(it) &&
            /target:\s*["']?\/app\/src\/?["']?\s*$/m.test(it);
        });
      }],
      ['rebuild rule for ./api/package.json', function (v) {
        var s = services(v('y')).api || '';
        return items(s).some(function (it) {
          return /action:\s*rebuild\s*$/m.test(it) && /path:\s*["']?\.\/api\/package\.json["']?\s*$/m.test(it);
        });
      }],
      ['adminer only runs with profile debug', function (v) {
        var s = services(v('y')).adminer || '';
        return /profiles:\s*\[\s*["']?debug["']?\s*\]/.test(s) || /profiles:\s*\n\s+-\s*["']?debug["']?\s*$/m.test(s);
      }],
      ['api and db have no profiles', function (v) {
        var all = services(v('y'));
        return !!all.api && !!all.db && !/profiles:/.test(all.api) && !/profiles:/.test(all.db);
      }],
    ];
  }
})();
