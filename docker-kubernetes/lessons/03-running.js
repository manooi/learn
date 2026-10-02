// Section: Running Containers
// Simulator scripts are written as real functions and injected with .toString(),
// so they are syntax-checked when this file loads and need no template escaping.
(function () {
  window.LESSONS = window.LESSONS || [];

  // ---------- shared: exercise checker widget ----------
  const CHECK_CSS = `<style>
  body { background: #f4f6fa; color: #1f2330; }
  label.f { display: block; font-size: 13px; font-weight: 600; margin: 6px 0 2px; }
  textarea { width: 100%; box-sizing: border-box; margin: 0; background: #fff; color: #1f2330;
             font: 13px/1.45 ui-monospace, Menlo, Consolas, monospace; }
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

  // fields: [{ id, label, height, value }], rules: [[label, (val) => bool]]
  // helpers: standalone functions the rules call (serialized into the widget too)
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

  // ---------- simulator 1: lifecycle state machine ----------
  function lifecycleSim() {
    var SPEED = 250; // real ms per simulated second (4x speed)
    var $ = function (id) { return document.getElementById(id); };
    var S;

    function fresh() {
      return { state: 'created', exit: null, manual: false, restarts: 0, stopping: false, run: null, timer: null };
    }
    function cfg() {
      return { form: $('form').value, handler: $('handler').checked, init: $('init').checked, policy: $('policy').value };
    }
    function log(s) { console.log(s); }
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;'); }

    function cmdLine(c) {
      return 'docker create --name web' + (c.init ? ' --init' : '') +
        (c.policy !== 'no' ? ' --restart ' + c.policy : '') + ' myapp';
    }
    function procs(c) {
      var list = [];
      var sh = '/bin/sh -c "node server.js"';
      if (c.init) list.push('/sbin/docker-init -- ' + (c.form === 'shell' ? sh : 'node server.js'));
      if (c.form === 'shell') list.push(sh);
      list.push('node server.js');
      return list.map(function (p, i) { return 'PID ' + (i === 0 ? 1 : i + 6) + '  ' + p; });
    }
    function en(id, on) { $(id).disabled = !on; }

    function render() {
      ['created', 'running', 'paused', 'restarting', 'exited'].forEach(function (s) {
        $('s-' + s).classList.toggle('on', S.state === s);
      });
      var c = S.run || cfg();
      var lines = [];
      if (S.state === 'none') {
        lines.push('STATUS   (no container: it was removed)');
      } else {
        var st = S.state === 'exited' ? 'Exited (' + S.exit + ')'
          : S.stopping ? 'running (stopping...)' : S.state;
        lines.push('STATUS   ' + st + '    RestartCount=' + S.restarts);
        lines.push('CONFIG   ' + cmdLine(c) + '   [' + (c.form === 'exec' ? 'exec' : 'shell') + ' form]');
        if (S.state === 'running' || S.state === 'paused') lines = lines.concat(procs(c));
      }
      $('info').innerHTML = lines.map(esc).join('<br>');
      var locked = !(S.state === 'created' || S.state === 'none');
      ['form', 'handler', 'init', 'policy'].forEach(function (id) { $(id).disabled = locked; });
      $('lockmsg').textContent = locked ? '(settings are fixed once it has started: click Reset)' : '';
      var st2 = S.state;
      var busy = S.stopping;
      en('b-create', st2 === 'none');
      en('b-start', st2 === 'created' || st2 === 'exited');
      en('b-pause', st2 === 'running' && !busy);
      en('b-unpause', st2 === 'paused');
      en('b-stop', st2 === 'running' && !busy);
      en('b-kill', st2 === 'running');
      en('b-crash', st2 === 'running' && !busy);
      en('b-daemon', st2 === 'exited');
      en('b-rm', (st2 === 'created' || st2 === 'exited' || st2 === 'running') && !busy);
    }

    function clearTimers() {
      if (S.timer) { clearTimeout(S.timer); clearInterval(S.timer); S.timer = null; }
    }
    function resetBar() {
      $('grace').style.width = '0';
      $('gracetxt').textContent = 'grace period: idle';
    }
    function later(simSecs, fn) {
      S.timer = setTimeout(function () { S.timer = null; fn(); }, simSecs * SPEED);
    }
    function exitWith(code, msg) {
      clearTimers();
      S.state = 'exited';
      S.exit = code;
      S.stopping = false;
      log(msg);
      render();
    }

    function start() {
      if (!S.run) S.run = cfg();
      resetBar();
      log('$ docker start web');
      S.state = 'running';
      S.exit = null;
      S.manual = false;
      log('web is running. Processes inside the container:');
      procs(S.run).forEach(function (p) { log('  ' + p); });
      render();
    }

    function graceful() {
      log('node: SIGTERM received -> closing HTTP server and DB pool...');
      later(0.4, function () { exitWith(0, 'web exited (0) after 0.4s ✓ graceful shutdown'); });
    }
    function grace() {
      log('... waiting up to the 10s grace period (demo runs at 4x speed)');
      var t = 0;
      S.timer = setInterval(function () {
        t += 0.5;
        $('grace').style.width = (t * 10) + '%';
        $('gracetxt').textContent = 'grace period: ' + t.toFixed(1) + 's / 10s';
        if (t >= 10) {
          clearTimers();
          log('-> 10s grace period over: SIGKILL sent');
          exitWith(137, 'web exited (137) after 10.0s ✗ forced kill, no cleanup');
        }
      }, SPEED / 2);
    }

    function stop() {
      var c = S.run;
      log('$ docker stop web');
      S.manual = true;
      S.stopping = true;
      render();
      var pid1 = c.init ? 'docker-init' : c.form === 'shell' ? '/bin/sh' : 'node';
      log('-> SIGTERM sent to PID 1 (' + pid1 + ')');
      if (c.init && c.form === 'shell') {
        log('docker-init forwards SIGTERM to its child /bin/sh (PID 7)');
        log('/bin/sh is not PID 1 and has no handler -> it dies. node never got SIGTERM');
        later(0.1, function () {
          exitWith(143, 'web exited (143) after 0.1s ⚠ fast, but node was killed abruptly when the container ended');
        });
      } else if (c.init) {
        log('docker-init forwards SIGTERM to node (PID 7)');
        if (c.handler) {
          graceful();
        } else {
          later(0.1, function () {
            exitWith(143, 'node is not PID 1, so the default action terminates it -> web exited (143) after 0.1s');
          });
        }
      } else if (c.form === 'shell') {
        log('/bin/sh is PID 1: it does not forward SIGTERM to node, and PID 1 ignores it');
        grace();
      } else if (c.handler) {
        graceful();
      } else {
        log('node is PID 1 with no SIGTERM handler -> the kernel ignores the signal');
        grace();
      }
    }

    function kill() {
      var during = S.stopping;
      clearTimers();
      log('$ docker kill web');
      log('-> SIGKILL sent to PID 1: it cannot be caught, blocked or ignored');
      S.manual = true;
      exitWith(137, 'web exited (137) immediately' + (during ? ' (you did not wait for the grace period)' : ''));
    }

    function crash() {
      log('node: Error: connect ECONNREFUSED 10.0.0.5:6379 (uncaught exception)');
      exitWith(1, 'web exited (1)');
      var p = S.run.policy;
      if (p === 'no') {
        log('restart policy "no" -> it stays exited');
        return;
      }
      S.restarts++;
      var delay = 100 * Math.pow(2, S.restarts - 1);
      S.state = 'restarting';
      render();
      log('restart policy "' + p + '": exit code 1 is a failure -> restarting after ' + delay +
        'ms backoff (doubles each time)');
      S.timer = setTimeout(function () {
        S.timer = null;
        S.state = 'running';
        S.exit = null;
        log('web is running again (RestartCount=' + S.restarts + ')');
        render();
      }, 700);
    }

    function daemon() {
      log('$ sudo systemctl restart docker');
      var p = S.run ? S.run.policy : cfg().policy;
      if (p === 'always' && S.manual) {
        log('policy "always": the daemon starts it again, even though you stopped it');
        S.state = 'running';
        S.exit = null;
        S.manual = false;
        log('web is running (started by dockerd)');
        render();
      } else if (p === 'unless-stopped' && S.manual) {
        log('policy "unless-stopped": you stopped it, so it stays exited');
      } else {
        log('policy "' + p + '": web stays exited');
      }
    }

    function rm() {
      log('$ docker rm web');
      if (S.state === 'running') {
        log('Error response from daemon: cannot remove container "/web": container is running: ' +
          'stop the container before removing or force remove');
        return;
      }
      log('web');
      S.state = 'none';
      S.run = null;
      S.restarts = 0;
      resetBar();
      render();
    }

    function create() {
      log('$ ' + cmdLine(cfg()));
      log('a1b2c3d4e5f6  (created, not started yet)');
      S.state = 'created';
      render();
    }

    function reset() {
      if (S) clearTimers();
      S = fresh();
      resetBar();
      log('--- reset ---');
      log('$ ' + cmdLine(cfg()));
      log('Container "web" created. Click "docker start".');
      render();
    }

    $('b-create').onclick = create;
    $('b-start').onclick = start;
    $('b-pause').onclick = function () {
      log('$ docker pause web');
      log('cgroup freezer: every process in the container is frozen (no signal is sent)');
      S.state = 'paused';
      render();
    };
    $('b-unpause').onclick = function () {
      log('$ docker unpause web');
      log('processes thawed: they carry on exactly where they were');
      S.state = 'running';
      render();
    };
    $('b-stop').onclick = stop;
    $('b-kill').onclick = kill;
    $('b-crash').onclick = crash;
    $('b-daemon').onclick = daemon;
    $('b-rm').onclick = rm;
    $('b-reset').onclick = reset;
    ['form', 'handler', 'init', 'policy'].forEach(function (id) {
      $(id).onchange = function () { render(); };
    });
    reset();
  }

  // ---------- simulator 2: ports & networks ----------
  function portsSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }

    function conf() {
      var user = $('net').value === 'appnet';
      var webMap = $('webp').value;   // '', '8080:80', '8080:8080', '127.0.0.1:8080:80'
      var apiMap = $('apip').value;   // '', '3000:3000'
      return {
        user: user,
        bind: $('bind').value,
        maps: [parse(webMap, 'web'), parse(apiMap, 'api')].filter(Boolean),
        webMap: webMap,
        apiMap: apiMap,
        ip: { web: user ? '172.18.0.2' : '172.17.0.2', api: user ? '172.18.0.3' : '172.17.0.3' }
      };
    }
    function parse(m, name) {
      if (!m) return null;
      var p = m.split(':');
      if (p.length === 3) return { hostIp: p[0], host: +p[1], cport: +p[2], c: name, raw: m };
      return { hostIp: '0.0.0.0', host: +p[0], cport: +p[1], c: name, raw: m };
    }
    function listen(c, name) {
      return name === 'web' ? { addr: '0.0.0.0', port: 80 } : { addr: c.bind, port: 3000 };
    }

    function render() {
      var c = conf();
      var net = c.user ? ' --network appnet' : '';
      var cmds = [];
      if (c.user) cmds.push('docker network create appnet');
      cmds.push('docker run -d --name web' + net + (c.webMap ? ' -p ' + c.webMap : '') + ' nginx');
      cmds.push('docker run -d --name api' + net + ' -e HOST=' + c.bind +
        (c.apiMap ? ' -p ' + c.apiMap : '') + ' myapi');
      $('cmds').textContent = cmds.join('\n');
      $('pub').textContent = c.maps.length
        ? c.maps.map(function (m) { return m.hostIp + ':' + m.host + ' -> ' + m.c + ':' + m.cport; }).join('   ')
        : '(nothing published)';
      $('netname').textContent = c.user ? 'network: appnet (user-defined bridge, has DNS)' : 'network: bridge (default, no DNS)';
      $('webinfo').textContent = 'IP ' + c.ip.web + '\nlistens 0.0.0.0:80';
      $('apiinfo').textContent = 'IP ' + c.ip.api + '\nlistens ' + c.bind + ':3000';
    }

    function show(target, ok, text, why) {
      ['host', 'web', 'api'].forEach(function (id) { $('box-' + id).className = 'box'; });
      if (target) $('box-' + target).className = 'box ' + (ok ? 'hit' : 'miss');
      $('res').className = ok ? 'res good' : 'res badr';
      $('res').textContent = text + (why ? '\n' + why : '');
      log(text);
      if (why) log('   why: ' + why);
    }

    function fromHost(port, lan) {
      var c = conf();
      var host = lan ? '192.168.1.20' : 'localhost';
      log((lan ? 'phone$ ' : 'laptop$ ') + 'curl ' + host + ':' + port);
      var m = c.maps.filter(function (x) { return x.host === port; })[0];
      if (!m) {
        return show('host', false, 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused',
          'no -p mapping publishes host port ' + port);
      }
      if (lan && m.hostIp === '127.0.0.1') {
        return show('host', false, 'curl: (7) Failed to connect to ' + host + ' port ' + port + ': Connection refused',
          'port ' + port + ' is bound to 127.0.0.1 only: reachable from this laptop, not the network');
      }
      var l = listen(c, m.c);
      if (l.port !== m.cport) {
        return show(m.c, false, 'curl: (56) Recv failure: Connection reset by peer',
          'Docker forwards to ' + m.c + ':' + m.cport + ' but the app listens on port ' + l.port);
      }
      if (l.addr === '127.0.0.1') {
        return show(m.c, false, 'curl: (56) Recv failure: Connection reset by peer',
          'traffic arrives on the container\'s eth0 (' + c.ip[m.c] + '), but the app only listens on its own loopback');
      }
      show(m.c, true, m.c === 'web' ? 'HTTP/1.1 200 OK  <h1>Welcome to nginx!</h1>' : 'HTTP/1.1 200 OK  {"status":"ok"}',
        host + ':' + port + ' -> ' + m.c + ' (' + c.ip[m.c] + ':' + m.cport + ')');
    }

    function fromWeb(target) {
      var c = conf();
      log('$ docker exec web curl http://' + target + ':3000');
      if (target === 'localhost') {
        return show('web', false, 'curl: (7) Failed to connect to localhost port 3000: Connection refused',
          'inside web, localhost is web itself. api is a different container');
      }
      if (!c.user) {
        return show('web', false, 'curl: (6) Could not resolve host: api',
          'the default bridge network has no DNS for container names');
      }
      log('   (Docker DNS 127.0.0.11: api -> ' + c.ip.api + ')');
      if (c.bind === '127.0.0.1') {
        return show('api', false, 'curl: (7) Failed to connect to api port 3000: Connection refused',
          'api only listens on its own 127.0.0.1');
      }
      show('api', true, 'HTTP/1.1 200 OK  {"status":"ok"}',
        'container-to-container uses the container port directly: no -p needed');
    }

    ['net', 'webp', 'apip', 'bind'].forEach(function (id) {
      $(id).onchange = function () { render(); log('# config changed:\n' + $('cmds').textContent); };
    });
    $('r8080').onclick = function () { fromHost(8080, false); };
    $('r3000').onclick = function () { fromHost(3000, false); };
    $('r80').onclick = function () { fromHost(80, false); };
    $('rlan').onclick = function () { fromHost(8080, true); };
    $('rapi').onclick = function () { fromWeb('api'); };
    $('rlocal').onclick = function () { fromWeb('localhost'); };
    render();
    log('# current setup:\n' + $('cmds').textContent);
  }

  // ---------- simulator 3: volumes ----------
  function volumesSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }
    var IDS = ['3f9a1c7e', 'b41d0a22', '7c55e9f0', 'd2e8a613', '90ab4c1d'];
    var S;
    var DIR = '/var/lib/postgresql/data';

    function fresh() {
      return { exists: false, mount: null, anonId: null, anon: {}, named: null, bind: null, tmpfs: 0, nextId: 0 };
    }
    function flag(m) {
      if (m === 'anon') return '';
      if (m === 'named') return ' -v pgdata:' + DIR;
      if (m === 'bind') return ' -v "$(pwd)/data":' + DIR;
      return ' --tmpfs ' + DIR;
    }
    function rows() {
      if (!S.exists) return null;
      if (S.mount === 'anon') return S.anon[S.anonId];
      if (S.mount === 'named') return S.named;
      if (S.mount === 'bind') return S.bind;
      return S.tmpfs;
    }
    function setRows(n) {
      if (S.mount === 'anon') S.anon[S.anonId] = n;
      else if (S.mount === 'named') S.named = n;
      else if (S.mount === 'bind') S.bind = n;
      else S.tmpfs = n;
    }

    function render() {
      $('mount').disabled = S.exists;
      var r = rows();
      $('ctr').className = 'ctr' + (S.exists ? ' up' : '');
      $('ctr').innerHTML = S.exists
        ? '<b>db</b> (postgres:17) running<br>mount: ' + label(S.mount) + '<br>SELECT count(*) FROM notes → <b>' + r + '</b>'
        : '<b>no db container</b><br>click "docker run"';
      var anonKeys = Object.keys(S.anon);
      var items = [];
      items.push(['anonymous volumes', anonKeys.length
        ? anonKeys.map(function (k) { return k + '… (' + S.anon[k] + ' rows)' + (k === S.anonId && S.exists ? ' ← in use' : ' dangling'); }).join('<br>')
        : '(none)']);
      items.push(['named volume pgdata', S.named === null ? '(does not exist)' : S.named + ' rows' + (S.exists && S.mount === 'named' ? ' ← in use' : '')]);
      items.push(['host folder ./data', S.bind === null ? '(does not exist)' : S.bind + ' rows' + (S.exists && S.mount === 'bind' ? ' ← in use' : '')]);
      items.push(['tmpfs (RAM)', S.exists && S.mount === 'tmpfs' ? S.tmpfs + ' rows ← in use' : '(nothing)']);
      $('store').innerHTML = items.map(function (it) {
        return '<div class="st"><div class="h">' + it[0] + '</div><div>' + it[1] + '</div></div>';
      }).join('');
      ['b-insert', 'b-restart', 'b-rm', 'b-rmv'].forEach(function (id) { $(id).disabled = !S.exists; });
    }
    function label(m) {
      return { anon: 'anonymous volume (image VOLUME)', named: 'named volume pgdata', bind: 'bind mount ./data', tmpfs: 'tmpfs (memory)' }[m];
    }

    function run() {
      var m = $('mount').value;
      log('$ docker run -d --name db -e POSTGRES_PASSWORD=secret' + flag(m) + ' postgres:17');
      if (S.exists) {
        log('docker: Error response from daemon: Conflict. The container name "/db" is already in use. ' +
          'You have to remove (or rename) that container to be able to reuse that name.');
        return;
      }
      S.exists = true;
      S.mount = m;
      if (m === 'anon') {
        S.anonId = IDS[S.nextId % IDS.length];
        S.nextId++;
        S.anon[S.anonId] = 0;
        log('image declares VOLUME ' + DIR + ' -> Docker creates a NEW anonymous volume ' + S.anonId + '…');
      } else if (m === 'named') {
        if (S.named === null) {
          S.named = 0;
          log('volume "pgdata" did not exist -> created (empty); postgres initialises a new database');
        } else {
          log('volume "pgdata" already exists -> postgres finds its data: ' + S.named + ' rows');
        }
      } else if (m === 'bind') {
        if (S.bind === null) {
          S.bind = 0;
          log('host folder ./data created -> postgres initialises a new database there');
        } else {
          log('host folder ./data already has files -> postgres finds its data: ' + S.bind + ' rows');
        }
      } else {
        S.tmpfs = 0;
        log('tmpfs mounted in RAM (empty) -> postgres initialises a new database');
      }
      log('db is up. SELECT count(*) FROM notes -> ' + rows());
      render();
    }
    function insert() {
      var n = rows() + 1;
      log('$ docker exec db psql -U postgres -c "INSERT INTO notes VALUES (' + n + ')"');
      log('INSERT 0 1');
      setRows(n);
      render();
    }
    function restart() {
      log('$ docker restart db');
      if (S.mount === 'tmpfs') {
        S.tmpfs = 0;
        log('tmpfs content is gone: the RAM was freed when the container stopped');
      }
      log('db restarted. SELECT count(*) FROM notes -> ' + rows());
      render();
    }
    function rm(v) {
      log('$ docker rm -f' + (v ? 'v' : '') + ' db');
      log('db');
      if (S.mount === 'anon') {
        if (v) {
          delete S.anon[S.anonId];
          log('-v also removed anonymous volume ' + S.anonId + '…');
        } else {
          log('anonymous volume ' + S.anonId + '… is left behind (dangling). A new container will NOT reuse it');
        }
      } else if (S.mount === 'named') {
        log('named volume "pgdata" survives' + (v ? ' (-v only removes anonymous volumes)' : ''));
      } else if (S.mount === 'bind') {
        log('files stay in ./data on your host');
      } else {
        S.tmpfs = 0;
        log('tmpfs is gone together with the container');
      }
      S.exists = false;
      S.mount = null;
      render();
    }
    function volRm() {
      log('$ docker volume rm pgdata');
      if (S.named === null) {
        log('Error response from daemon: get pgdata: no such volume');
      } else if (S.exists && S.mount === 'named') {
        log('Error response from daemon: remove pgdata: volume is in use - [a1b2c3d4e5f6]');
      } else {
        S.named = null;
        log('pgdata   (volume deleted: its data is gone for good)');
      }
      render();
    }
    function volLs() {
      log('$ docker volume ls');
      log('DRIVER    VOLUME NAME');
      Object.keys(S.anon).forEach(function (k) { log('local     ' + k + '5d0c...(anonymous)'); });
      if (S.named !== null) log('local     pgdata');
    }

    $('b-run').onclick = run;
    $('b-insert').onclick = insert;
    $('b-restart').onclick = restart;
    $('b-rm').onclick = function () { rm(false); };
    $('b-rmv').onclick = function () { rm(true); };
    $('b-volrm').onclick = volRm;
    $('b-ls').onclick = volLs;
    $('b-reset').onclick = function () {
      S = fresh();
      log('--- reset: no containers, no volumes ---');
      render();
    };
    S = fresh();
    render();
  }

  // ---------- simulator 4: ARG vs ENV ----------
  function envSim() {
    var $ = function (id) { return document.getElementById(id); };
    function log(s) { console.log(s); }
    var image = null; // { version, persisted }

    function dockerfile() {
      var lines = [
        'FROM node:22-slim',
        'ARG APP_VERSION=dev',
        'ENV NODE_ENV=production'
      ];
      if ($('persist').checked) lines.push('ENV APP_VERSION=$APP_VERSION');
      lines.push('RUN echo "building version $APP_VERSION"');
      lines.push('CMD ["node", "server.js"]');
      return lines.join('\n');
    }
    function parseEnvFile(text) {
      var out = [];
      text.split('\n').forEach(function (l) {
        l = l.trim();
        if (!l || l.charAt(0) === '#' || l.indexOf('=') < 1) return;
        out.push([l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]);
      });
      return out;
    }
    function render() {
      $('df').textContent = dockerfile();
      $('img').textContent = image
        ? 'image myapp: built with APP_VERSION=' + image.version +
          (image.persisted ? ' (copied into ENV)' : ' (ARG only)')
        : 'image myapp: not built yet';
    }

    function build() {
      var v = $('barg').value.trim();
      var version = v || 'dev';
      log('$ docker build' + (v ? ' --build-arg APP_VERSION=' + v : '') + ' -t myapp .');
      log('#5 [2/2] RUN echo "building version $APP_VERSION"');
      log('#5 0.21 building version ' + version);
      log('#6 naming to docker.io/library/myapp:latest done');
      image = { version: version, persisted: $('persist').checked };
      render();
    }

    function run() {
      var e = $('eflag').value.trim();
      var useFile = $('usefile').checked;
      var cmd = '$ docker run --rm' + (useFile ? ' --env-file .env' : '') + (e ? ' -e ' + e : '') + ' myapp printenv';
      log(cmd);
      if (!image) {
        log('Unable to find image \'myapp:latest\' locally ... pull access denied. (Click docker build first.)');
        return;
      }
      var env = {};
      var src = {};
      env.NODE_ENV = 'production';
      src.NODE_ENV = 'image ENV';
      if (image.persisted) {
        env.APP_VERSION = image.version;
        src.APP_VERSION = 'image ENV (copied from ARG at build time)';
      }
      if (useFile) {
        parseEnvFile($('envfile').value).forEach(function (kv) {
          src[kv[0]] = env[kv[0]] !== undefined ? '--env-file (overrides ' + src[kv[0]] + ')' : '--env-file';
          env[kv[0]] = kv[1];
        });
      }
      if (e && e.indexOf('=') > 0) {
        var k = e.slice(0, e.indexOf('='));
        src[k] = env[k] !== undefined ? '-e (overrides ' + src[k] + ')' : '-e';
        env[k] = e.slice(e.indexOf('=') + 1);
      }
      Object.keys(env).forEach(function (k) {
        var line = k + '=' + env[k];
        while (line.length < 26) line += ' ';
        log(line + '<- ' + src[k]);
      });
      if (!image.persisted) log('(no APP_VERSION: an ARG only exists while the image is being built)');
    }

    $('persist').onchange = render;
    $('b-build').onclick = build;
    $('b-run').onclick = run;
    render();
  }

  // ---------- simulator 5: debugging terminal ----------
  function debugSim() {
    var $ = function (id) { return document.getElementById(id); };
    var api = { state: 'exited', mem: 64, exit: 137, oom: true, starts: 1, timer: null };
    var LOGS_BAD = [
      '2026-09-30T09:14:02Z Server listening on 0.0.0.0:3000',
      '2026-09-30T09:14:02Z Loading product catalogue into memory cache...',
      '2026-09-30T09:14:03Z cache: 50000 items (21 MB)',
      '2026-09-30T09:14:04Z cache: 100000 items (42 MB)',
      '2026-09-30T09:14:05Z cache: 150000 items (63 MB)'
    ];
    var LOGS_OK = [
      '2026-09-30T09:31:10Z Server listening on 0.0.0.0:3000',
      '2026-09-30T09:31:10Z Loading product catalogue into memory cache...',
      '2026-09-30T09:31:12Z cache: 200000 items (84 MB)',
      '2026-09-30T09:31:12Z cache ready ✓ serving requests'
    ];
    var logs = LOGS_BAD.slice();

    function out(text, cls) {
      var d = document.createElement('div');
      if (cls) d.className = cls;
      d.textContent = text;
      $('term').appendChild(d);
      $('term').scrollTop = $('term').scrollHeight;
    }
    function status() {
      if (api.state === 'running') return 'Up 3 seconds';
      if (api.state === 'none') return null;
      return 'Exited (' + api.exit + ') 2 minutes ago';
    }
    function crashLater() {
      if (api.timer) clearTimeout(api.timer);
      api.timer = setTimeout(function () {
        api.timer = null;
        if (api.state !== 'running' || api.mem >= 256) return;
        api.state = 'exited';
        api.exit = 137;
        api.oom = true;
        logs = logs.concat(LOGS_BAD.slice(2));
        out('(background) api was just OOM-killed again. Try docker ps -a', 'dim');
      }, 2500);
    }
    function memFlag(parts) {
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        var v = null;
        if (p === '-m' || p === '--memory') v = parts[i + 1];
        else if (p.indexOf('--memory=') === 0) v = p.slice(9);
        else if (p.indexOf('-m=') === 0) v = p.slice(3);
        if (v) {
          var n = parseFloat(v);
          var unit = v.slice(-1).toLowerCase();
          if (unit === 'g') n = n * 1024;
          return n;
        }
      }
      return null;
    }

    var HELP = [
      'Supported: docker ps [-a] | docker logs [--tail N] [-f] api | docker inspect api',
      "  docker inspect -f '{{.State.ExitCode}}' api   (also .State.OOMKilled, .HostConfig.Memory)",
      '  docker exec -it api sh | docker stats --no-stream | docker top api',
      '  docker start api | docker rm [-f] api | docker run -d --name api -m 256m myapi:1.0 | clear'
    ];

    function exec(raw) {
      var line = raw.trim().replace(/\s+/g, ' ');
      if (!line) return;
      out('$ ' + line, 'cmd');
      var parts = line.split(' ');
      var has = function (x) { return parts.indexOf(x) >= 0; };
      if (line === 'clear') { $('term').innerHTML = ''; return; }
      if (line === 'help') { HELP.forEach(function (h) { out(h); }); return; }
      if (parts[0] !== 'docker') { out('only docker commands work here, try: help'); return; }
      var sub = parts[1];
      var target = has('api') ? 'api' : parts[parts.length - 1];

      if (sub === 'ps') {
        out('CONTAINER ID   IMAGE         STATUS                        NAMES');
        if (api.state === 'running' || (has('-a') && api.state !== 'none')) {
          out('3c1f09ab77e2   myapi:1.0     ' + pad(status(), 30) + 'api');
        }
        out('8d02e4c1a9f0   postgres:17   Up 25 minutes                 db');
        if (!has('-a') && api.state === 'exited') out('(api is missing: stopped containers only show with -a)', 'dim');
        return;
      }
      if (target !== 'api' && sub !== 'stats' && sub !== 'run') {
        out('Error response from daemon: No such container: ' + target);
        return;
      }
      if (api.state === 'none' && sub !== 'run' && sub !== 'stats') {
        out('Error response from daemon: No such container: api');
        return;
      }
      if (sub === 'logs') {
        var n = logs.length;
        var ti = parts.indexOf('--tail');
        if (ti > 0) n = parseInt(parts[ti + 1], 10) || n;
        logs.slice(-n).forEach(function (l) { out(l); });
        if (has('-f')) out('(-f would keep following new lines until Ctrl+C)', 'dim');
        return;
      }
      if (sub === 'inspect') {
        var fi = parts.indexOf('-f') > 0 ? parts.indexOf('-f') : parts.indexOf('--format');
        var vals = {
          '.State.ExitCode': String(api.state === 'running' ? 0 : api.exit),
          '.State.OOMKilled': String(api.state === 'running' ? false : api.oom),
          '.State.Status': api.state,
          '.HostConfig.Memory': String(api.mem * 1024 * 1024),
          '.RestartCount': '0'
        };
        if (fi > 0) {
          var f = (parts[fi + 1] || '').replace(/['"{} ]/g, '');
          out(vals[f] !== undefined ? vals[f] : 'template: no such field ' + f);
          return;
        }
        ['[', '  {', '    "Name": "/api",', '    "State": {',
          '      "Status": "' + api.state + '",',
          '      "OOMKilled": ' + vals['.State.OOMKilled'] + ',',
          '      "ExitCode": ' + vals['.State.ExitCode'] + ',',
          '      "FinishedAt": "2026-09-30T09:14:05Z"', '    },',
          '    "HostConfig": { "Memory": ' + vals['.HostConfig.Memory'] + ', "RestartPolicy": { "Name": "no" } },',
          '    "Config": { "Image": "myapi:1.0", "Cmd": ["node", "server.js"] }', '    ...', '  }', ']'
        ].forEach(function (l) { out(l); });
        return;
      }
      if (sub === 'exec') {
        if (api.state !== 'running') {
          out('Error response from daemon: container 3c1f09ab77e2 is not running');
        } else {
          out('/app # (you are inside api, e.g. run: ps aux, env, cat /proc/meminfo; type exit)', 'dim');
        }
        return;
      }
      if (sub === 'stats') {
        out('NAME   CPU %   MEM USAGE / LIMIT     MEM %');
        if (api.state === 'running') {
          out(api.mem >= 256 ? 'api    0.4%    131MiB / 256MiB       51.2%' : 'api    97.1%   61.2MiB / 64MiB       95.6%');
        }
        out('db     0.1%    38MiB / 7.6GiB        0.49%');
        return;
      }
      if (sub === 'top') {
        if (api.state !== 'running') { out('Error response from daemon: container 3c1f09ab77e2 is not running'); return; }
        out('UID    PID     PPID    CMD');
        out('1000   21877   21851   node server.js');
        return;
      }
      if (sub === 'start') {
        api.state = 'running';
        logs = logs.concat(LOGS_BAD.slice(0, 2));
        out('api');
        crashLater();
        return;
      }
      if (sub === 'rm') {
        if (api.state === 'running' && !has('-f')) {
          out('Error response from daemon: cannot remove container "/api": container is running: ' +
            'stop the container before removing or force remove');
          return;
        }
        api.state = 'none';
        out('api');
        return;
      }
      if (sub === 'run') {
        if (!has('--name') || parts[parts.indexOf('--name') + 1] !== 'api') {
          out('give it the name api:  docker run -d --name api -m 256m myapi:1.0', 'dim');
          return;
        }
        if (api.state !== 'none') {
          out('docker: Error response from daemon: Conflict. The container name "/api" is already in use by ' +
            'container "3c1f09ab77e2". You have to remove (or rename) that container to be able to reuse that name.');
          return;
        }
        var mem = memFlag(parts);
        api.mem = mem || 64;
        api.state = 'running';
        api.exit = 0;
        api.oom = false;
        out('9e7b3d1c4a55f0e2b8c6d9a1e3f5b7c9d0e2f4a6b8c0d2e4f6a8b0c2d4e6f8a0');
        if (api.mem >= 256) {
          logs = LOGS_OK.slice();
          out('api is up with ' + api.mem + 'MiB. Check it: docker ps, docker stats --no-stream, docker logs api', 'dim');
        } else {
          logs = LOGS_BAD.slice(0, 2);
          crashLater();
        }
        return;
      }
      out('not supported in this simulator, type help');
    }
    function pad(s, n) {
      while (s.length < n) s += ' ';
      return s;
    }

    $('in').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        exec($('in').value);
        $('in').value = '';
      }
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-cmd]'), function (b) {
      b.onclick = function () { exec(b.getAttribute('data-cmd')); };
    });
    out('Incident: the "api" container keeps dying. Find out why, then fix it.', 'dim');
    out('Type a command (or click one below). Type help for the list.', 'dim');
  }

  // =====================================================================
  window.LESSONS.push(
    // -------------------------------------------------------------------
    {
      id: 'container-lifecycle',
      section: 'Running Containers',
      title: 'Container lifecycle, PID 1 & signals',
      explain: `
<p>A container is not a little VM that "boots". It is <strong>one main process</strong> (plus anything it spawns)
running in isolated namespaces. The container lives exactly as long as that main process, which is
<strong>PID 1</strong> inside the container. When PID 1 exits, the container stops. That's the whole lifecycle.</p>

<h3>The states</h3>
<table>
  <tr><th>State</th><th>How you get there</th><th>What it means</th></tr>
  <tr><td><code>created</code></td><td><code>docker create</code> (or the first half of <code>docker run</code>)</td><td>Filesystem and config ready, no process yet</td></tr>
  <tr><td><code>running</code></td><td><code>docker start</code> / <code>docker run</code></td><td>PID 1 is alive</td></tr>
  <tr><td><code>paused</code></td><td><code>docker pause</code></td><td>All processes frozen by the cgroup freezer. No signal is sent, memory is kept</td></tr>
  <tr><td><code>restarting</code></td><td>A restart policy kicked in</td><td>Docker is waiting (backoff) before starting it again</td></tr>
  <tr><td><code>exited</code></td><td>PID 1 ended (by itself, <code>stop</code>, <code>kill</code>, crash)</td><td>Still exists on disk with its exit code and logs. <code>docker ps -a</code> shows it</td></tr>
</table>
<p><code>docker rm</code> deletes an exited container. <code>docker run --rm</code> does that automatically when it exits.</p>

<h3>What <code>docker stop</code> really does</h3>
<p>Think of a bar at closing time. First the bartender calls "last orders" (<strong>SIGTERM</strong>): polite, you can
finish your drink. If you are still there after a while, the bouncer carries you out (<strong>SIGKILL</strong>): no
arguing, no cleanup.</p>
<ol>
  <li>Docker sends <strong>SIGTERM</strong> (or the image's <code>STOPSIGNAL</code>) to PID 1.</li>
  <li>It waits a <strong>grace period</strong>: 10 seconds by default. Change it per command
    (<code>docker stop -t 30 web</code>) or per container (<code>docker run --stop-timeout 30 …</code>).</li>
  <li>If PID 1 is still alive, Docker sends <strong>SIGKILL</strong>. The kernel ends the process immediately.</li>
</ol>
<p><code>docker kill</code> skips the polite part and sends SIGKILL right away (or another signal with <code>-s</code>).</p>
<p>A well-behaved app catches SIGTERM, stops accepting requests, finishes in-flight work, closes DB connections and exits:</p>
<pre><code class="language-javascript">process.on('SIGTERM', () =&gt; {
  server.close(() =&gt; process.exit(0));   // finish in-flight requests, then exit
});</code></pre>

<h3>Why PID 1 is special</h3>
<p>Linux treats PID 1 of a namespace as the "init" process and protects it: <strong>a signal that PID 1 has no
handler for is simply ignored</strong> (SIGKILL from outside is the exception). A normal process that gets SIGTERM with no handler
dies. The same program as PID 1 shrugs and keeps running. PID 1 is also expected to <strong>reap zombie</strong>
child processes, which most apps never do.</p>

<h3>Shell form vs exec form</h3>
<pre><code class="language-docker"># Shell form: Docker runs  /bin/sh -c "node server.js"
CMD node server.js

# Exec form (JSON array): Docker runs  node server.js  directly
CMD ["node", "server.js"]</code></pre>
<p>With the shell form, <strong><code>/bin/sh</code> becomes PID 1</strong> and node is its child. On Debian-based
images <code>sh</code> is <code>dash</code>, which stays in place and does <strong>not forward</strong> SIGTERM to node.
So <code>docker stop</code> waits the full 10 seconds and then SIGKILLs everything. (Some shells, like bash, replace
themselves with the last command in simple cases. Don't depend on that.) Use the <strong>exec form</strong> for
<code>CMD</code> and <code>ENTRYPOINT</code>. If you need a wrapper script, end it with <code>exec "$@"</code> or
<code>exec node server.js</code> so the app takes over as PID 1.</p>

<h3><code>--init</code>: a tiny real init</h3>
<p><code>docker run --init</code> (Compose: <code>init: true</code>) puts a tiny init program (<code>docker-init</code>,
which is <em>tini</em>) in as PID 1. It forwards signals to your app and reaps zombies. Now your app is <em>not</em>
PID 1, so even without a SIGTERM handler it gets the normal default behaviour (terminate).</p>

<h3>Restart policies</h3>
<table>
  <tr><th><code>--restart</code></th><th>Restarts when…</th><th>After you <code>docker stop</code> it</th></tr>
  <tr><td><code>no</code> (default)</td><td>never</td><td>stays stopped</td></tr>
  <tr><td><code>on-failure[:N]</code></td><td>it exits with a non-zero code (optionally at most N times)</td><td>stays stopped</td></tr>
  <tr><td><code>always</code></td><td>it exits for any reason</td><td>stays stopped… until the Docker daemon restarts (e.g. reboot), then it starts again</td></tr>
  <tr><td><code>unless-stopped</code></td><td>it exits for any reason</td><td>stays stopped, even across daemon restarts</td></tr>
</table>
<p>Docker waits between restarts with a backoff that doubles each time (100&nbsp;ms, 200&nbsp;ms, 400&nbsp;ms …),
so a crash-looping container doesn't hammer your machine.</p>
<div class="tip"><strong>Rule of thumb:</strong> exec-form <code>CMD</code>, handle SIGTERM in the app, add <code>--init</code> if your app spawns child processes or you don't control its signal handling, and use <code>unless-stopped</code> for long-running services on a single host.</div>
<div class="warn">Every "my container takes exactly 10 seconds to stop" report is a signal problem. The app never saw SIGTERM, so Docker had to wait and SIGKILL it. Exit code <code>137</code> after <code>docker stop</code> confirms it.</div>
`,
      examples: [
        {
          title: 'Lifecycle state machine: stop timing, PID 1 & restart policies',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; }
  .row { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center; margin: 3px 0; font-size: 14px; }
  .states { display: flex; gap: 8px; margin: 10px 0 8px; }
  .st { flex: 1; text-align: center; padding: 8px 2px; border: 2px solid #c5c9d6; border-radius: 10px;
        background: #fff; color: #8a90a2; font-weight: 600; font-size: 13px; transition: all .25s; }
  .st.on { border-color: #2563eb; background: #dbeafe; color: #1e3a8a; transform: scale(1.06); }
  #s-exited.on { border-color: #dc2626; background: #fee2e2; color: #7f1d1d; }
  #s-paused.on { border-color: #7c3aed; background: #ede9fe; color: #4c1d95; }
  #s-restarting.on { border-color: #d97706; background: #fef3c7; color: #78350f; }
  .card { background: #fff; border: 1px solid #d5d9e3; border-radius: 8px; padding: 8px 10px;
          font: 12.5px/1.5 ui-monospace, Menlo, monospace; min-height: 58px; }
  .bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 6px 0 2px; }
  .bar i { display: block; height: 100%; width: 0; background: #f59e0b; transition: width .1s; }
  .btns button { font-size: 13px; }
  .muted { color: #667085; font-size: 12px; }
</style>

<div class="row">
  <label>Dockerfile
    <select id="form">
      <option value="exec">CMD ["node", "server.js"]  (exec form)</option>
      <option value="shell">CMD node server.js  (shell form)</option>
    </select>
  </label>
  <label><input type="checkbox" id="handler" checked> app has a SIGTERM handler</label>
</div>
<div class="row">
  <label><input type="checkbox" id="init"> --init</label>
  <label>--restart
    <select id="policy">
      <option>no</option>
      <option>on-failure</option>
      <option>always</option>
      <option>unless-stopped</option>
    </select>
  </label>
  <span class="muted" id="lockmsg"></span>
</div>

<div class="states">
  <div class="st" id="s-created">created</div>
  <div class="st" id="s-running">running</div>
  <div class="st" id="s-paused">paused</div>
  <div class="st" id="s-restarting">restarting</div>
  <div class="st" id="s-exited">exited</div>
</div>

<div class="card" id="info"></div>
<div class="bar"><i id="grace"></i></div>
<div class="muted" id="gracetxt">grace period: idle</div>

<div class="row btns">
  <button id="b-create">docker create</button>
  <button id="b-start">docker start</button>
  <button id="b-pause">docker pause</button>
  <button id="b-unpause">docker unpause</button>
  <button id="b-stop">docker stop</button>
  <button id="b-kill">docker kill</button>
  <button id="b-crash">app crashes</button>
  <button id="b-daemon">restart dockerd</button>
  <button id="b-rm">docker rm</button>
  <button id="b-reset">Reset</button>
</div>

<script>
(${lifecycleSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>The problem: "docker stop takes 10 seconds and exits with 137"</summary>
  <p>Pick <strong>shell form</strong> in the Dockerfile dropdown, keep "app has a SIGTERM handler" ticked, click
  <strong>docker start</strong>, then <strong>docker stop</strong>. Even though the app <em>has</em> a handler, this happens:</p>
  <table>
    <tr><th>Simulated time</th><th>What happens</th><th>Console</th></tr>
    <tr><td>start</td><td>Docker runs <code>/bin/sh -c "node server.js"</code>: sh is PID 1, node is PID 7</td>
      <td><code>PID 1  /bin/sh -c "node server.js"</code><br><code>PID 7  node server.js</code></td></tr>
    <tr><td>0s</td><td><code>docker stop</code> signals PID 1 only</td>
      <td><code>-&gt; SIGTERM sent to PID 1 (/bin/sh)</code></td></tr>
    <tr><td>0s</td><td>sh neither handles nor forwards it; node never hears anything</td>
      <td><code>/bin/sh is PID 1: it does not forward SIGTERM to node, and PID 1 ignores it</code></td></tr>
    <tr><td>0 → 10s</td><td>The bar under the card fills up: Docker is waiting</td>
      <td><code>... waiting up to the 10s grace period (demo runs at 4x speed)</code></td></tr>
    <tr><td>10s</td><td>Patience is over</td>
      <td><code>-&gt; 10s grace period over: SIGKILL sent</code><br><code>web exited (137) after 10.0s ✗ forced kill, no cleanup</code></td></tr>
  </table>
  <p>Exit code <strong>137 = 128 + 9</strong> (signal 9 is SIGKILL). The app's nice shutdown code never ran: open
  requests were cut off, DB connections dropped. In production that is every deploy, every scale-down.</p>
</details>
<details>
  <summary>The fix: exec form makes <em>your app</em> PID 1</summary>
  <pre><code class="language-docker">CMD ["node", "server.js"]        # ① JSON array = exec form, no shell in between</code></pre>
  <pre><code class="language-javascript">process.on('SIGTERM', () =&gt; {   // ② PID 1 must install a handler, or SIGTERM is ignored
  server.close(() =&gt; process.exit(0));   // ③ exit 0 = clean shutdown
});</code></pre>
  <ol>
    <li><strong>①</strong> No <code>/bin/sh -c</code> wrapper: node itself is PID 1 and receives SIGTERM directly.</li>
    <li><strong>②</strong> Because node is PID 1, the kernel won't apply the default "terminate" action. Without a handler the signal is dropped. That's the "app has a SIGTERM handler" checkbox.</li>
    <li><strong>③</strong> The handler finishes work and exits on its own long before the 10s deadline.</li>
  </ol>
  <p>Now Reset, choose <strong>exec form</strong> (handler ticked), start and stop:</p>
  <table>
    <tr><th>Simulated time</th><th>What happens</th><th>Console</th></tr>
    <tr><td>start</td><td>Only one process</td><td><code>PID 1  node server.js</code></td></tr>
    <tr><td>0s</td><td>SIGTERM goes straight to node</td><td><code>-&gt; SIGTERM sent to PID 1 (node)</code><br><code>node: SIGTERM received -&gt; closing HTTP server and DB pool...</code></td></tr>
    <tr><td>0.4s</td><td>Clean exit</td><td><code>web exited (0) after 0.4s ✓ graceful shutdown</code></td></tr>
  </table>
</details>
<details>
  <summary>Try this: all the combinations (and what <code>--init</code> changes)</summary>
  <table>
    <tr><th>Form</th><th>Handler</th><th>--init</th><th>Result in the console</th></tr>
    <tr><td>exec</td><td>✓</td><td></td><td><code>web exited (0) after 0.4s ✓ graceful shutdown</code></td></tr>
    <tr><td>exec</td><td>✗</td><td></td><td><code>node is PID 1 with no SIGTERM handler -&gt; the kernel ignores the signal</code> → 10s → <code>137</code></td></tr>
    <tr><td>exec</td><td>✗</td><td>✓</td><td><code>docker-init forwards SIGTERM to node (PID 7)</code> → <code>web exited (143) after 0.1s</code> (143 = 128 + 15, died from SIGTERM)</td></tr>
    <tr><td>exec</td><td>✓</td><td>✓</td><td>forwarded → graceful, exit <code>0</code></td></tr>
    <tr><td>shell</td><td>any</td><td></td><td>10s wait → <code>137</code></td></tr>
    <tr><td>shell</td><td>any</td><td>✓</td><td><code>web exited (143) after 0.1s ⚠ fast, but node was killed abruptly…</code>: tini forwards to sh, sh dies, the container ends and node is SIGKILLed without cleanup</td></tr>
  </table>
  <p>Restart policies: set <code>--restart on-failure</code>, start, click <strong>app crashes</strong>. You'll see
  <code>restart policy "on-failure": exit code 1 is a failure -&gt; restarting after 100ms backoff</code> and the
  <em>restarting</em> box light up. Crash again: 200ms, then 400ms. Now try <code>always</code> vs
  <code>unless-stopped</code>: <strong>docker stop</strong> the container, then click <strong>restart dockerd</strong>.
  Only <code>always</code> brings it back (<code>policy "always": the daemon starts it again, even though you stopped it</code>).</p>
  <p>Also try <strong>docker rm</strong> while it is running: you get the real daemon error, because only stopped containers can be removed without <code>-f</code>.</p>
  <div class="warn"><strong>Common mistake:</strong> fixing the app's SIGTERM handler but leaving <code>CMD npm start</code> (or shell form). The wrapper, not your app, gets the signal. Run <code>node</code> directly in exec form, or use <code>--init</code>.</div>
</details>
`,
        },
        {
          title: 'Dockerfile with a signal-friendly CMD',
          runnable: false,
          lang: 'docker',
          code: `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
USER node

# Optional: send a different signal on docker stop (default is SIGTERM)
# STOPSIGNAL SIGINT

# Exec form: node is PID 1 (or PID 7 under --init) and receives SIGTERM directly.
# Avoid "CMD npm start" and "CMD node server.js" (shell form): a wrapper gets the signal.
CMD ["node", "server.js"]`,
        },
        {
          title: 'Measuring stop time on your machine',
          runnable: false,
          lang: 'bash',
          code: `# Image built with shell form: CMD node server.js
$ docker run -d --name slow myapp:shell
$ docker exec slow ps -o pid,args
PID   COMMAND
    1 /bin/sh -c node server.js
    7 node server.js
$ time docker stop slow
slow
real    0m10.3s
$ docker inspect -f '{{.State.ExitCode}}' slow
137

# Same app with exec form: CMD ["node", "server.js"]
$ docker run -d --name fast myapp:exec
$ time docker stop fast
fast
real    0m0.4s
$ docker inspect -f '{{.State.ExitCode}}' fast
0

# Restart policies
$ docker run -d --name api --restart unless-stopped myapi
$ docker update --restart on-failure:5 api      # change it later without recreating
$ docker ps -a --format '{{.Names}}  {{.Status}}'
api  Up 3 minutes
fast  Exited (0) 1 minute ago
slow  Exited (137) 2 minutes ago`,
        },
      ],
      quiz: [
        {
          q: 'What does <code>docker stop web</code> do by default?',
          options: [
            'Sends SIGKILL immediately',
            'Sends SIGTERM, waits up to 10 seconds, then sends SIGKILL if it is still running',
            'Freezes the processes with the cgroup freezer',
            'Sends SIGTERM and waits forever',
          ],
          answer: 1,
          why: 'Stop is "polite first": SIGTERM (or STOPSIGNAL), a grace period (default 10s, change with -t / --stop-timeout), then SIGKILL. Freezing is docker pause.',
        },
        {
          q: 'A Dockerfile ends with <code>CMD node server.js</code>. The app has a SIGTERM handler, yet <code>docker stop</code> always takes 10 s. Why?',
          options: [
            'Node ignores SIGTERM on Linux',
            'The shell form makes /bin/sh PID 1; it does not forward SIGTERM to node, so Docker falls back to SIGKILL after the timeout',
            'The default grace period is too short',
            'The image is missing EXPOSE',
          ],
          answer: 1,
          why: 'Shell form = /bin/sh -c "node server.js". The signal goes to PID 1 (sh), which neither handles nor forwards it. Use exec form: CMD ["node", "server.js"].',
        },
        {
          q: '<code>docker ps -a</code> shows <code>Exited (137)</code> right after you ran <code>docker stop</code>. What does that tell you?',
          options: [
            'The app shut down cleanly',
            'The app crashed with an error before stop',
            'The process was SIGKILLed (128 + 9): it did not exit within the grace period',
            'The image could not be found',
          ],
          answer: 2,
          why: '137 = 128 + 9 (SIGKILL). After docker stop that means the grace period expired. A clean handler exit is 0; dying from SIGTERM itself would be 143 (128 + 15).',
        },
        {
          q: 'You want a service to come back after crashes and after a server reboot, but <strong>stay down</strong> if you stopped it yourself. Which policy?',
          options: ['no', 'on-failure', 'always', 'unless-stopped'],
          answer: 3,
          why: 'unless-stopped restarts on any exit and on daemon start, except when you stopped it manually. "always" would start it again when the daemon restarts, even after a manual stop.',
        },
        {
          q: 'What does <code>docker run --init</code> add?',
          options: [
            'A systemd instance inside the container',
            'A tiny init (tini) as PID 1 that forwards signals to your app and reaps zombie processes',
            'An init container that runs before the app, like in Kubernetes',
            'Automatic restarts on failure',
          ],
          answer: 1,
          why: 'docker-init (tini) becomes PID 1, forwards signals, reaps zombies. Your app is no longer PID 1, so default signal actions work again.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This web service takes 10 seconds to stop and doesn't come back after crashes. Fix both boxes:</p>
<ul>
  <li>The Dockerfile's <code>CMD</code> must use the <strong>exec form</strong> and run <code>node server.js</code> directly (not through npm or a shell).</li>
  <li>The <code>docker run</code> command must run detached, be named <code>web</code>, use <code>--init</code>, and restart automatically <strong>unless you stopped it yourself</strong>.</li>
</ul>
<p>Edit both boxes below and click <strong>Check</strong>.</p>`,
        hint: 'Exec form is a JSON array: CMD ["node", "server.js"]. For the run command you need -d, --name web, --init and --restart unless-stopped.',
        starter: widget(
          [
            { id: 'df', label: 'Dockerfile', height: 150, value: `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD npm start` },
            { id: 'run', label: 'docker run command', height: 50, value: 'docker run myapp' },
          ],
          lifecycleRules()
        ),
        solution: widget(
          [
            { id: 'df', label: 'Dockerfile', height: 150, value: `FROM node:22-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
CMD ["node", "server.js"]` },
            { id: 'run', label: 'docker run command', height: 50, value: 'docker run -d --name web --init --restart unless-stopped myapp' },
          ],
          lifecycleRules()
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'ports-and-networking',
      section: 'Running Containers',
      title: 'Ports & networking',
      explain: `
<p>Every container gets its <strong>own network namespace</strong>: its own network interface, its own IP address on
a virtual bridge, and its <strong>own <code>localhost</code></strong>. Think of each container as a separate
apartment in a building. The building (your host) has one street address; to reach an apartment from the street you
need the doorman to forward you. That doorman is <code>-p</code>.</p>

<h3>Publishing ports: <code>-p host:container</code></h3>
<pre><code class="language-bash">docker run -d -p 8080:80 nginx              # host port 8080 -&gt; container port 80
docker run -d -p 127.0.0.1:8080:80 nginx    # only reachable from this machine
docker run -d -p 5353:53/udp dnsmasq         # UDP
docker run -d -P nginx                       # publish all EXPOSEd ports to random host ports
docker port &lt;container&gt;                      # show the mappings</code></pre>
<p>The order is <strong>host first, container second</strong> ("from:to"). The container port is where the app
<em>inside</em> listens. Many images listen on a fixed port (nginx: 80, postgres: 5432), and you pick any free host port.</p>
<div class="warn"><code>-p 8080:80</code> binds on <strong>all host interfaces</strong> (0.0.0.0 and ::), so anyone on your network can reach it. On Linux, Docker's own firewall rules can even bypass <code>ufw</code>. For a local-only database use <code>-p 127.0.0.1:5432:5432</code>.</div>

<h3>The 0.0.0.0 vs 127.0.0.1 pitfall</h3>
<p>Many dev servers default to listening on <code>127.0.0.1</code>. Inside a container that means "only accept
connections from inside this same container". Traffic forwarded by <code>-p</code> arrives on the container's
<code>eth0</code> interface, not its loopback, so it is rejected. You'll typically see
<code>curl: (56) Recv failure: Connection reset by peer</code> or <code>Empty reply from server</code>.
Fix: make the app listen on <code>0.0.0.0</code> (e.g. <code>vite --host 0.0.0.0</code>,
<code>flask run --host=0.0.0.0</code>, <code>app.listen(3000, '0.0.0.0')</code>).</p>

<h3><code>EXPOSE</code> is documentation</h3>
<p><code>EXPOSE 3000</code> in a Dockerfile publishes <strong>nothing</strong>. It records "this image listens on 3000"
as metadata. It's used by <code>-P</code> (capital P) and by humans reading the image. You still need <code>-p</code>
to reach it from the host.</p>

<h3>Networks: default bridge vs user-defined bridge</h3>
<table>
  <tr><th></th><th>Default <code>bridge</code></th><th>User-defined (<code>docker network create appnet</code>)</th></tr>
  <tr><td>Used when</td><td>you don't pass <code>--network</code></td><td><code>--network appnet</code> (Compose creates one per project)</td></tr>
  <tr><td>Find other containers by name</td><td><strong>No</strong>, only by IP (legacy <code>--link</code>)</td><td><strong>Yes</strong>: built-in DNS at <code>127.0.0.11</code> resolves <code>api</code> → its IP</td></tr>
  <tr><td>Isolation</td><td>every container lands on the same network</td><td>only containers you attach</td></tr>
</table>
<p>Between containers on the same network you use the <strong>container port</strong> directly
(<code>http://api:3000</code>). <code>-p</code> is only for traffic coming from <em>outside</em> Docker.</p>

<h3>Other network modes</h3>
<ul>
  <li><code>--network host</code>: no isolation, the container uses the host's network stack directly; <code>-p</code> is ignored. Native on Linux. Docker Desktop has it as an opt-in setting (4.34+).</li>
  <li><code>--network none</code>: only loopback, no network at all.</li>
  <li>Reaching the host from a container: <code>host.docker.internal</code> works out of the box on Docker Desktop. On Linux add <code>--add-host=host.docker.internal:host-gateway</code>.</li>
</ul>
<div class="tip">Remember three separate things: the <strong>app's listen address</strong> (must be 0.0.0.0), the <strong>port mapping</strong> (host → container, for outside traffic), and the <strong>network</strong> (user-defined, for container-to-container by name).</div>
`,
      examples: [
        {
          title: 'Port-mapping & network simulator',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .ctl { display: grid; grid-template-columns: auto 1fr; gap: 3px 10px; align-items: center; }
  .ctl select { font-size: 13px; }
  .host { margin-top: 8px; border: 2px dashed #94a3b8; border-radius: 12px; padding: 8px; background: #fff; }
  .hosttop { display: flex; justify-content: space-between; font-size: 12.5px; color: #475569; }
  .row { display: flex; gap: 10px; margin-top: 6px; }
  .box { flex: 1; border: 2px solid #cbd5e1; border-radius: 10px; padding: 6px 8px; background: #f8fafc;
         font: 12px/1.45 ui-monospace, Menlo, monospace; white-space: pre-line; transition: all .2s; }
  .box b { font-family: system-ui, sans-serif; font-size: 13px; }
  .hit { border-color: #16a34a; background: #dcfce7; }
  .miss { border-color: #dc2626; background: #fee2e2; }
  #box-host { flex: 0 0 auto; }
  .btns { margin-top: 8px; }
  .btns button { font-size: 12.5px; }
  .res { margin-top: 6px; padding: 6px 8px; border-radius: 8px; font: 12.5px/1.45 ui-monospace, monospace;
         white-space: pre-wrap; background: #fff; border: 1px solid #d5d9e3; min-height: 36px; }
  .good { background: #dcfce7; border-color: #86efac; }
  .badr { background: #fee2e2; border-color: #fca5a5; }
  pre#cmds { margin: 6px 0 0; font-size: 11.5px; background: #1e293b; color: #e2e8f0; padding: 6px 8px;
             border-radius: 6px; white-space: pre-wrap; }
</style>

<div class="ctl">
  <span>network</span>
  <select id="net">
    <option value="bridge">default bridge (no --network)</option>
    <option value="appnet">--network appnet (user-defined)</option>
  </select>
  <span>web (nginx)</span>
  <select id="webp">
    <option value="8080:80">-p 8080:80</option>
    <option value="8080:8080">-p 8080:8080</option>
    <option value="127.0.0.1:8080:80">-p 127.0.0.1:8080:80</option>
    <option value="">(no -p)</option>
  </select>
  <span>api (node)</span>
  <span>
    <select id="apip">
      <option value="">(no -p)</option>
      <option value="3000:3000">-p 3000:3000</option>
    </select>
    listens on
    <select id="bind">
      <option value="127.0.0.1">127.0.0.1</option>
      <option value="0.0.0.0">0.0.0.0</option>
    </select>
  </span>
</div>

<div class="host">
  <div class="hosttop"><span>your laptop (localhost, LAN IP 192.168.1.20)</span><span id="netname"></span></div>
  <div class="row">
    <div class="box" id="box-host"><b>published ports</b>
      <span id="pub"></span></div>
  </div>
  <div class="row">
    <div class="box" id="box-web"><b>web</b>
      <span id="webinfo"></span></div>
    <div class="box" id="box-api"><b>api</b>
      <span id="apiinfo"></span></div>
  </div>
</div>

<div class="btns">
  From laptop:
  <button id="r8080">curl localhost:8080</button>
  <button id="r3000">curl localhost:3000</button>
  <button id="r80">curl localhost:80</button>
  <button id="rlan">phone: curl 192.168.1.20:8080</button>
  <br>From inside web:
  <button id="rapi">curl http://api:3000</button>
  <button id="rlocal">curl http://localhost:3000</button>
</div>
<div class="res" id="res">Pick settings, then send a request.</div>
<pre id="cmds"></pre>

<script>
(${portsSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>The problem: "the container is running, but I can't reach it"</summary>
  <p>Start with the defaults: default bridge, web <code>-p 8080:80</code>, api <code>(no -p)</code> listening on
  <code>127.0.0.1</code>. Three different requests fail for three different reasons:</p>
  <table>
    <tr><th>Click</th><th>Result box</th><th>Why</th></tr>
    <tr><td>curl localhost:8080</td><td class="good"><code>HTTP/1.1 200 OK  &lt;h1&gt;Welcome to nginx!&lt;/h1&gt;</code></td><td>8080 is published to web:80 and nginx listens on 0.0.0.0:80</td></tr>
    <tr><td>curl localhost:3000</td><td><code>curl: (7) Failed to connect to localhost port 3000: Connection refused</code></td><td><code>no -p mapping publishes host port 3000</code></td></tr>
    <tr><td>curl localhost:80</td><td><code>curl: (7) … port 80: Connection refused</code></td><td>The container port is 80, but the <em>host</em> port is 8080</td></tr>
    <tr><td>curl http://api:3000 (from web)</td><td><code>curl: (6) Could not resolve host: api</code></td><td><code>the default bridge network has no DNS for container names</code></td></tr>
    <tr><td>curl http://localhost:3000 (from web)</td><td><code>curl: (7) Failed to connect to localhost port 3000: Connection refused</code></td><td><code>inside web, localhost is web itself. api is a different container</code></td></tr>
  </table>
</details>
<details>
  <summary>Step by step: fixing api, one layer at a time</summary>
  <table>
    <tr><th>Step</th><th>Change</th><th>Click</th><th>Result</th></tr>
    <tr><td>1</td><td>api: <code>-p 3000:3000</code></td><td>curl localhost:3000</td><td><code>curl: (56) Recv failure: Connection reset by peer</code>: Docker forwards, but the app only listens on its own loopback</td></tr>
    <tr><td>2</td><td>api listens on <code>0.0.0.0</code></td><td>curl localhost:3000</td><td><code>HTTP/1.1 200 OK  {"status":"ok"}</code></td></tr>
    <tr><td>3</td><td>network: <code>--network appnet</code></td><td>curl http://api:3000</td><td>Console first logs <code>(Docker DNS 127.0.0.11: api -&gt; 172.18.0.3)</code>, then <code>HTTP/1.1 200 OK</code></td></tr>
    <tr><td>4</td><td>api back to <code>(no -p)</code></td><td>curl http://api:3000</td><td>Still 200: <code>container-to-container uses the container port directly: no -p needed</code></td></tr>
  </table>
  <p>Notice the two different failure messages. <strong>Connection refused</strong> = nothing listening at that address
  (no mapping, or wrong host). <strong>Connection reset</strong> = Docker accepted the connection on the host, but
  nothing inside the container answered on that port/interface.</p>
</details>
<details>
  <summary>Key lines explained</summary>
  <pre><code class="language-bash">docker network create appnet                                   # ① user-defined network = DNS by name
docker run -d --name api --network appnet -e HOST=0.0.0.0 myapi   # ② listen on all interfaces, no -p
docker run -d --name web --network appnet -p 8080:80 nginx        # ③ only the entry point is published</code></pre>
  <ol>
    <li><strong>①</strong> On a user-defined bridge, Docker's embedded DNS answers container names (and <code>--network-alias</code>es).</li>
    <li><strong>②</strong> <code>0.0.0.0</code> accepts traffic arriving on eth0, which is where both forwarded and container-to-container traffic land. api isn't published, so it's not reachable from outside Docker, which is a good default for internal services.</li>
    <li><strong>③</strong> Only web is published. Browsers hit <code>localhost:8080</code>; web talks to <code>http://api:3000</code>.</li>
  </ol>
</details>
<details>
  <summary>Try this / common mistakes</summary>
  <ul>
    <li>Pick web <code>-p 8080:8080</code> and curl 8080: <code>Connection reset by peer</code> because <code>the app listens on port 80</code>. The right side of <code>-p</code> must match what the app listens on.</li>
    <li>Pick <code>-p 127.0.0.1:8080:80</code>: from the laptop it works, but "phone: curl 192.168.1.20:8080" is refused. That's what you want for dev databases.</li>
  </ul>
  <div class="warn"><strong>Common mistake:</strong> using <code>localhost</code> in a connection string between containers (<code>DB_HOST=localhost</code>). Inside a container, localhost is <em>that</em> container. Use the other container's name on a shared user-defined network.</div>
</details>
`,
        },
        {
          title: 'Networking commands on your machine',
          runnable: false,
          lang: 'bash',
          code: `$ docker network create appnet
$ docker run -d --name api --network appnet -e HOST=0.0.0.0 myapi
$ docker run -d --name web --network appnet -p 8080:80 nginx

$ docker port web
80/tcp -> 0.0.0.0:8080
80/tcp -> [::]:8080

$ docker exec web getent hosts api        # DNS by container name
172.18.0.3      api

$ docker network ls
NETWORK ID     NAME      DRIVER    SCOPE
3c1e2d9a8b7f   appnet    bridge    local
9a8b7c6d5e4f   bridge    bridge    local
1f2e3d4c5b6a   host      host      local
7a6b5c4d3e2f   none      null      local

$ docker network inspect appnet --format '{{range .Containers}}{{.Name}} {{.IPv4Address}}{{"\\n"}}{{end}}'
api 172.18.0.3/16
web 172.18.0.2/16

# Default bridge: no name resolution
$ docker run --rm busybox nslookup api
** server can't find api: NXDOMAIN

# Attach an existing container to another network
$ docker network connect appnet some-old-container`,
        },
      ],
      quiz: [
        {
          q: 'In <code>docker run -p 8080:80 nginx</code>, which number is the port nginx listens on inside the container?',
          options: ['8080', '80', 'Both', 'Neither: Docker picks one'],
          answer: 1,
          why: 'Format is host:container. The right side (80) must match where the app listens; the left side (8080) is what you type on the host.',
        },
        {
          q: 'Your API in a container listens on <code>127.0.0.1:3000</code> and you ran it with <code>-p 3000:3000</code>. <code>curl localhost:3000</code> on the host gives "Connection reset by peer". Fix?',
          options: [
            'Add EXPOSE 3000 to the Dockerfile',
            'Use -p 127.0.0.1:3000:3000',
            'Make the app listen on 0.0.0.0 inside the container',
            'Use --network none',
          ],
          answer: 2,
          why: 'Forwarded traffic arrives on the container\'s eth0, not its loopback. The app must listen on 0.0.0.0. The host-side bind address (-p 127.0.0.1:...) is a different thing.',
        },
        {
          q: 'What does <code>EXPOSE 3000</code> in a Dockerfile do?',
          options: [
            'Publishes port 3000 on the host',
            'Opens port 3000 in the host firewall',
            'Documents that the image listens on 3000 (used by -P); it publishes nothing by itself',
            'Makes the app listen on port 3000',
          ],
          answer: 2,
          why: 'EXPOSE is metadata only. You still need -p (or -P, which maps all EXPOSEd ports to random host ports).',
        },
        {
          q: 'Two containers started with plain <code>docker run</code> (no <code>--network</code>). Can <code>web</code> reach <code>http://api:3000</code>?',
          options: [
            'Yes, Docker always resolves container names',
            'No: the default bridge has no DNS for names; put both on a user-defined network',
            'Only if api publishes -p 3000:3000',
            'Only with --network host',
          ],
          answer: 1,
          why: 'Automatic name resolution is a feature of user-defined networks (and of Compose, which creates one for you). Publishing ports is irrelevant for container-to-container traffic.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>These two commands start a frontend (<code>web</code>, nginx listening on 80) and a backend (<code>api</code>, which listens on whatever <code>HOST</code> says, port 3000). Nothing works. Rewrite them so that:</p>
<ul>
  <li>a user-defined network <code>appnet</code> is created and <strong>both</strong> containers join it;</li>
  <li>the browser reaches web at <code>http://localhost:8080</code>;</li>
  <li>api listens on all interfaces and is <strong>not</strong> published to the host;</li>
  <li>web finds the backend at <code>API_URL=http://api:3000</code>.</li>
</ul>
<p>Edit the commands in the box below and click <strong>Check</strong>.</p>`,
        hint: 'Start with "docker network create appnet". Add --network appnet to both runs. web needs -p 8080:80. api needs -e HOST=0.0.0.0 and no -p. API_URL should use the container name.',
        starter: widget(
          [
            { id: 'sh', label: 'commands (one per line)', height: 110, value: `docker run -d --name api -e HOST=127.0.0.1 -p 3000:3000 myapi
docker run -d --name web -p 80:8080 -e API_URL=http://localhost:3000 myweb` },
          ],
          portsRules(), [runOf]
        ),
        solution: widget(
          [
            { id: 'sh', label: 'commands (one per line)', height: 110, value: `docker network create appnet
docker run -d --name api --network appnet -e HOST=0.0.0.0 myapi
docker run -d --name web --network appnet -p 8080:80 -e API_URL=http://api:3000 myweb` },
          ],
          portsRules(), [runOf]
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'volumes-and-mounts',
      section: 'Running Containers',
      title: 'Volumes, bind mounts & tmpfs',
      explain: `
<p>Each container gets a thin <strong>writable layer</strong> on top of its image. Anything the app writes there
lives exactly as long as the container. <code>docker rm</code> and it's gone. Containers are meant to be
disposable: you replace them on every deploy. So data that must survive (databases, uploads) has to live
<strong>outside</strong> the container, in a mount.</p>
<p>Analogy: the container is a hotel room, cleaned out completely after you check out. A <strong>volume</strong> is a
storage locker you rent from the hotel. A <strong>bind mount</strong> is your own suitcase you carry in. A
<strong>tmpfs</strong> is a whiteboard: fast, but wiped when you leave.</p>

<h3>The three mount types</h3>
<table>
  <tr><th></th><th>Named volume</th><th>Bind mount</th><th>tmpfs</th></tr>
  <tr><td>Where the data is</td><td>Managed by Docker (<code>/var/lib/docker/volumes/…</code>, inside the VM on Docker Desktop)</td><td>A path on your host you choose</td><td>RAM only</td></tr>
  <tr><td>Survives <code>docker rm</code></td><td>Yes</td><td>Yes (it's your folder)</td><td>No, not even a restart</td></tr>
  <tr><td>Best for</td><td>Databases and app state</td><td>Dev: live source code, config files you edit</td><td>Scratch, caches, secrets you don't want on disk</td></tr>
  <tr><td>Syntax</td><td><code>-v pgdata:/var/lib/postgresql/data</code></td><td><code>-v "$(pwd)/src":/app/src</code></td><td><code>--tmpfs /tmp</code></td></tr>
</table>
<p>If the part before the colon is a <strong>name</strong>, it's a volume. If it's a <strong>path</strong> (starts with
<code>/</code> or <code>./</code>), it's a bind mount. The longer <code>--mount</code> syntax says it explicitly and is
easier to read in scripts:</p>
<pre><code class="language-bash">docker run --mount type=volume,src=pgdata,dst=/var/lib/postgresql/data postgres:17
docker run --mount type=bind,src="$(pwd)"/nginx.conf,dst=/etc/nginx/nginx.conf,readonly nginx
docker run --mount type=tmpfs,dst=/tmp,tmpfs-size=64m myapp</code></pre>
<p>Add <code>:ro</code> (or <code>readonly</code>) whenever the container only needs to read.</p>

<h3>Anonymous volumes (the sneaky one)</h3>
<p>Images like <code>postgres</code> declare <code>VOLUME /var/lib/postgresql/data</code>. If you don't mount
anything there, Docker creates an <strong>anonymous volume</strong> with a random name. It survives <code>docker rm</code>
but a <em>new</em> container gets a <em>new</em> empty one, so your data looks lost (it's just orphaned). Always use a
named volume for data you care about.</p>

<h3>Mounting over an existing directory</h3>
<ul>
  <li><strong>Bind mount</strong> over a directory that has files in the image: the image's files are <strong>hidden</strong> (not deleted) while the mount is there. Classic example: <code>-v "$(pwd)":/app</code> hides the <code>/app/node_modules</code> that <code>npm ci</code> created in the image.</li>
  <li><strong>Empty named volume</strong> mounted over a directory with files: Docker <strong>copies</strong> the image's files into the volume first. Only for volumes, only when the volume is empty.</li>
</ul>

<h3>Ownership & permissions</h3>
<p>Files keep their numeric user/group IDs across the mount. If your image runs as a non-root user (UID 1000)
and the mounted directory belongs to root, the app gets <code>EACCES: permission denied</code>. Fixes:</p>
<ul>
  <li>In the Dockerfile, create and <code>chown</code> the directory <em>before</em> switching <code>USER</code>, so a fresh named volume copies that ownership.</li>
  <li>For bind mounts on Linux, run as your own user: <code>--user "$(id -u):$(id -g)"</code>, or fix the folder's owner on the host.</li>
  <li>Docker Desktop (macOS/Windows) translates ownership for bind mounts, so this bites mostly on Linux and in CI.</li>
</ul>
<div class="tip">Useful commands: <code>docker volume ls</code>, <code>docker volume inspect pgdata</code>, <code>docker volume rm pgdata</code>, <code>docker volume prune</code> (removes unused <em>anonymous</em> volumes; add <code>-a</code> to include unused named ones).</div>
<div class="warn"><code>docker rm -v</code> removes a container's <em>anonymous</em> volumes only. Named volumes are only deleted when you ask explicitly (<code>docker volume rm</code>, or <code>docker compose down -v</code>).</div>
`,
      examples: [
        {
          title: 'Where does the data go? Postgres with different mounts',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .top { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .grid { display: flex; gap: 10px; margin-top: 8px; }
  .ctr { flex: 1; border: 2px dashed #94a3b8; border-radius: 12px; padding: 10px; background: #fff;
         font-size: 13px; line-height: 1.6; min-height: 90px; }
  .ctr.up { border-style: solid; border-color: #2563eb; background: #eff6ff; }
  #store { flex: 1.2; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .st { background: #fff; border: 1px solid #d5d9e3; border-radius: 8px; padding: 5px 7px;
        font: 11.5px/1.45 ui-monospace, Menlo, monospace; }
  .st .h { font: 600 12px system-ui, sans-serif; color: #475569; }
  .btns { margin-top: 8px; }
  .btns button { font-size: 12.5px; }
</style>

<div class="top">
  <label>mount for /var/lib/postgresql/data
    <select id="mount">
      <option value="anon">(no -v): anonymous volume</option>
      <option value="named">-v pgdata:... (named volume)</option>
      <option value="bind">-v "$(pwd)/data":... (bind mount)</option>
      <option value="tmpfs">--tmpfs ... (memory)</option>
    </select>
  </label>
</div>

<div class="grid">
  <div class="ctr" id="ctr"></div>
  <div id="store"></div>
</div>

<div class="btns">
  <button id="b-run">docker run</button>
  <button id="b-insert">INSERT a row</button>
  <button id="b-restart">docker restart db</button>
  <button id="b-rm">docker rm -f db</button>
  <button id="b-rmv">docker rm -fv db</button>
  <button id="b-volrm">docker volume rm pgdata</button>
  <button id="b-ls">docker volume ls</button>
  <button id="b-reset">Reset</button>
</div>

<script>
(${volumesSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>The problem: "I recreated my database container and all data is gone"</summary>
  <p>Keep <strong>(no -v): anonymous volume</strong> selected. Click <strong>docker run</strong>, <strong>INSERT a row</strong> twice, then <strong>docker rm -f db</strong> and <strong>docker run</strong> again:</p>
  <table>
    <tr><th>Step</th><th>Console</th><th>Storage panel</th></tr>
    <tr><td>docker run</td><td><code>image declares VOLUME /var/lib/postgresql/data -&gt; Docker creates a NEW anonymous volume 3f9a1c7e…</code></td><td>anonymous volumes: <code>3f9a1c7e… (0 rows) ← in use</code></td></tr>
    <tr><td>INSERT ×2</td><td><code>INSERT 0 1</code></td><td><code>3f9a1c7e… (2 rows) ← in use</code></td></tr>
    <tr><td>docker rm -f db</td><td><code>anonymous volume 3f9a1c7e… is left behind (dangling). A new container will NOT reuse it</code></td><td><code>3f9a1c7e… (2 rows) dangling</code></td></tr>
    <tr><td>docker run</td><td><code>… creates a NEW anonymous volume b41d0a22…</code><br><code>db is up. SELECT count(*) FROM notes -&gt; 0</code></td><td>two volumes, the new one empty</td></tr>
  </table>
  <p>The data wasn't deleted. It's stranded in a volume nobody knows the name of. On a real machine these pile up
  and eat disk space until <code>docker volume prune</code>.</p>
</details>
<details>
  <summary>Step by step: a named volume survives the container</summary>
  <p>Reset, pick <strong>-v pgdata:... (named volume)</strong>, then run the same sequence:</p>
  <table>
    <tr><th>Step</th><th>Console</th><th>Storage panel</th></tr>
    <tr><td>docker run</td><td><code>volume "pgdata" did not exist -&gt; created (empty); postgres initialises a new database</code></td><td>named volume pgdata: <code>0 rows ← in use</code></td></tr>
    <tr><td>INSERT ×2</td><td><code>INSERT 0 1</code></td><td><code>2 rows ← in use</code></td></tr>
    <tr><td>docker rm -f db</td><td><code>named volume "pgdata" survives</code></td><td><code>2 rows</code> (no container)</td></tr>
    <tr><td>docker run</td><td><code>volume "pgdata" already exists -&gt; postgres finds its data: 2 rows</code></td><td><code>2 rows ← in use</code></td></tr>
    <tr><td>docker volume rm pgdata</td><td><code>Error response from daemon: remove pgdata: volume is in use - [a1b2c3d4e5f6]</code></td><td>unchanged: Docker protects volumes that are in use</td></tr>
  </table>
  <p>Upgrading Postgres (a new image tag), changing env vars, or recovering from a broken container all mean
  "remove the container, run a new one". With a named volume the data simply carries over.</p>
</details>
<details>
  <summary>Try this: bind mount and tmpfs</summary>
  <ul>
    <li><strong>Bind mount</strong>: same behaviour as the named volume (<code>files stay in ./data on your host</code>), but the files are in a folder you can see and back up. On Linux, watch out for ownership: postgres writes them as its own UID.</li>
    <li><strong>tmpfs</strong>: insert rows, then <strong>docker restart db</strong>: <code>tmpfs content is gone: the RAM was freed when the container stopped</code>. Great for scratch data, terrible for a database.</li>
    <li>With the anonymous volume, compare <strong>docker rm -f db</strong> vs <strong>docker rm -fv db</strong> (<code>-v also removed anonymous volume …</code>). Then try <code>rm -fv</code> with the named volume: <code>(-v only removes anonymous volumes)</code>.</li>
  </ul>
  <div class="warn"><strong>Common mistake:</strong> <code>docker run -v "$(pwd)":/app node-app</code> for live reload, then "Cannot find module 'express'". The bind mount hid the image's <code>/app/node_modules</code>. Add an extra anonymous volume just for that folder: <code>-v /app/node_modules</code>, or only bind-mount the source folder (<code>-v "$(pwd)/src":/app/src</code>).</div>
</details>
`,
        },
        {
          title: 'Volumes, bind mounts and permissions on your machine',
          runnable: false,
          lang: 'bash',
          code: `# Named volume for a database
$ docker volume create pgdata
$ docker run -d --name db -e POSTGRES_PASSWORD=secret \\
    -v pgdata:/var/lib/postgresql/data postgres:17
$ docker volume inspect pgdata --format '{{.Mountpoint}}'
/var/lib/docker/volumes/pgdata/_data

# Bind-mount one config file, read-only
$ docker run -d -p 8080:80 -v "$(pwd)"/nginx.conf:/etc/nginx/nginx.conf:ro nginx

# Bind mount hides what the image put there
$ docker run --rm -v "$(pwd)":/app myapp ls /app/node_modules
ls: /app/node_modules: No such file or directory
$ docker run --rm -v "$(pwd)":/app -v /app/node_modules myapp ls /app/node_modules | head -2
express
...

# Permission problem on Linux: image runs as UID 1000, host folder owned by root
$ docker run --rm -v "$(pwd)"/out:/out myapp touch /out/report.csv
touch: /out/report.csv: Permission denied
$ docker run --rm --user "$(id -u):$(id -g)" -v "$(pwd)"/out:/out myapp touch /out/report.csv

# Back up a volume into a tarball
$ docker run --rm -v pgdata:/data:ro -v "$(pwd)":/backup alpine \\
    tar czf /backup/pgdata.tgz -C /data .

# Clean up
$ docker volume ls -f dangling=true
$ docker volume prune          # unused anonymous volumes
$ docker volume prune -a       # ALL unused volumes, including named ones`,
        },
      ],
      quiz: [
        {
          q: 'You run <code>docker run -d --name db postgres:17</code> (no <code>-v</code>), add data, then <code>docker rm -f db</code> and run the same command again. What do you see?',
          options: [
            'The old data, because postgres declares a VOLUME',
            'An empty database: the new container got a new anonymous volume; the old one is dangling',
            'An error: the volume is in use',
            'The old data, because Docker keeps writable layers',
          ],
          answer: 1,
          why: 'The image\'s VOLUME creates an anonymous volume per container. It survives rm (without -v) but is not reused. Use a named volume: -v pgdata:/var/lib/postgresql/data.',
        },
        {
          q: 'Which mount is the best fit for live-editing source code during development?',
          options: ['Named volume', 'Bind mount', 'tmpfs', 'The container writable layer'],
          answer: 1,
          why: 'A bind mount maps your host folder into the container, so edits in your editor are visible immediately.',
        },
        {
          q: 'You bind-mount <code>$(pwd)</code> onto <code>/app</code>, where the image had installed <code>node_modules</code>. What happens to the image\'s <code>/app/node_modules</code>?',
          options: [
            'It is merged with your folder',
            'It is deleted from the image',
            'It is hidden while the mount is active',
            'Docker copies it into your host folder',
          ],
          answer: 2,
          why: 'A mount covers whatever the image had at that path. Nothing is deleted or copied (copy-in only happens for empty named volumes, not bind mounts).',
        },
        {
          q: 'Does <code>docker rm -v db</code> delete the named volume <code>pgdata</code> that db used?',
          options: [
            'Yes, -v removes all its volumes',
            'No, -v only removes anonymous volumes; named volumes need docker volume rm',
            'Only if the volume is empty',
            'Only on Docker Desktop',
          ],
          answer: 1,
          why: 'Named volumes are never removed implicitly by docker rm. Delete them with docker volume rm (or compose down -v).',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Fix this Postgres command so that:</p>
<ul>
  <li>database files in <code>/var/lib/postgresql/data</code> live in a <strong>named volume</strong> called <code>pgdata</code>;</li>
  <li>your host file <code>./init.sql</code> is bind-mounted <strong>read-only</strong> to <code>/docker-entrypoint-initdb.d/init.sql</code>;</li>
  <li><code>/tmp</code> is a <strong>tmpfs</strong>;</li>
  <li>port 5432 is published <strong>only on 127.0.0.1</strong>.</li>
</ul>
<p>You may use <code>-v</code>/<code>--tmpfs</code> or <code>--mount</code> syntax. Keep it on one line or use <code>\\</code> line continuations. Edit the command in the box below and click <strong>Check</strong>.</p>`,
        hint: '-v pgdata:/var/lib/postgresql/data, -v "$(pwd)/init.sql":/docker-entrypoint-initdb.d/init.sql:ro, --tmpfs /tmp, -p 127.0.0.1:5432:5432',
        starter: widget(
          [
            { id: 'sh', label: 'docker run command', height: 110, value: `docker run -d --name db \\
  -e POSTGRES_PASSWORD=secret \\
  -p 5432:5432 \\
  postgres:17` },
          ],
          volumesRules(), [cmd]
        ),
        solution: widget(
          [
            { id: 'sh', label: 'docker run command', height: 110, value: `docker run -d --name db \\
  -e POSTGRES_PASSWORD=secret \\
  -p 127.0.0.1:5432:5432 \\
  -v pgdata:/var/lib/postgresql/data \\
  -v "$(pwd)/init.sql":/docker-entrypoint-initdb.d/init.sql:ro \\
  --tmpfs /tmp \\
  postgres:17` },
          ],
          volumesRules(), [cmd]
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'env-and-config',
      section: 'Running Containers',
      title: 'Environment variables & config',
      explain: `
<p>The same image should run in dev, staging and production. What changes is <strong>configuration</strong>: database
URLs, log levels, feature flags. The standard way to inject it is <strong>environment variables</strong> at
<code>docker run</code> time, so you build once and configure many times.</p>

<h3>Passing env vars at runtime</h3>
<pre><code class="language-bash">docker run -e NODE_ENV=staging -e LOG_LEVEL=debug myapp   # set values
docker run -e AWS_REGION myapp                            # no "=": copy the value from your shell
docker run --env-file .env myapp                          # read KEY=value lines from a file</code></pre>
<p>Precedence (last wins): <strong>image <code>ENV</code></strong> &lt; <strong><code>--env-file</code></strong>
&lt; <strong><code>-e</code></strong>. Check what a container actually got with
<code>docker exec app printenv</code> or <code>docker inspect -f '{{.Config.Env}}' app</code>.</p>
<div class="warn"><code>docker run --env-file</code> reads each line <strong>literally</strong>: <code>TOKEN="abc"</code> gives the value <code>"abc"</code> with quotes. No variable expansion either. (Compose's <code>.env</code> handling is smarter, see the Compose lessons.)</div>

<h3><code>ARG</code> vs <code>ENV</code>: build-time vs runtime</h3>
<table>
  <tr><th></th><th><code>ARG</code></th><th><code>ENV</code></th></tr>
  <tr><td>Exists during</td><td><code>docker build</code> only</td><td>build <em>and</em> every container run from the image</td></tr>
  <tr><td>Set with</td><td><code>--build-arg NAME=value</code> (default in Dockerfile)</td><td>Dockerfile default, overridden by <code>-e</code> / <code>--env-file</code></td></tr>
  <tr><td>Typical use</td><td>versions of tools to install, build flags</td><td>app config defaults (<code>NODE_ENV=production</code>, <code>PORT=3000</code>)</td></tr>
</table>
<pre><code class="language-docker">ARG NODE_VERSION=22            # ARG before FROM: only usable in FROM lines
FROM node:\${NODE_VERSION}-slim

ARG APP_VERSION=dev             # must be (re)declared after FROM to use it in this stage
ENV APP_VERSION=\${APP_VERSION}  # copy into ENV if the running app needs it
ENV NODE_ENV=production</code></pre>
<p>Changing an <code>ARG</code> value invalidates the build cache from the first instruction that uses it.</p>

<h3>Secrets: don't bake them in</h3>
<ul>
  <li><code>ENV API_KEY=…</code> in a Dockerfile ships the key inside the image to everyone who can pull it (<code>docker inspect</code> shows it).</li>
  <li><code>ARG</code> values used in a <code>RUN</code> step can end up in <code>docker history</code> and build metadata. ARGs are not for secrets either.</li>
  <li>For build-time secrets (private npm token), use BuildKit secret mounts: <code>RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci</code> with <code>docker build --secret id=npmrc,src=$HOME/.npmrc .</code>. The secret is never written to a layer.</li>
  <li>For runtime secrets, pass them at run time from a file that's in <code>.gitignore</code> (<code>--env-file .env</code>), or better, mount them as files (Compose <code>secrets:</code>, Kubernetes Secrets). Even <code>-e</code> values are visible to anyone who can run <code>docker inspect</code>.</li>
</ul>
<div class="tip">Also add <code>.env</code> to <code>.dockerignore</code>, so a <code>COPY . .</code> doesn't copy your secrets into the image.</div>
`,
      examples: [
        {
          title: 'ARG vs ENV: build it, run it, see what the container gets',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  .cols { display: flex; gap: 12px; }
  .col { flex: 1; background: #fff; border: 1px solid #d5d9e3; border-radius: 10px; padding: 8px 10px; }
  .col h4 { margin: 0 0 6px; font-size: 13px; color: #475569; }
  pre { margin: 0; font: 12px/1.5 ui-monospace, Menlo, monospace; background: #1e293b; color: #e2e8f0;
        padding: 6px 8px; border-radius: 6px; white-space: pre-wrap; }
  input[type=text], textarea { width: 95%; font: 12px ui-monospace, monospace; }
  textarea { height: 44px; }
  .lbl { font-size: 12.5px; margin-top: 6px; display: block; }
  #img { margin-top: 6px; font: 12px ui-monospace, monospace; color: #1e3a8a; }
</style>

<div class="cols">
  <div class="col">
    <h4>1. Build time</h4>
    <pre id="df"></pre>
    <label class="lbl"><input type="checkbox" id="persist"> add <code>ENV APP_VERSION=$APP_VERSION</code></label>
    <label class="lbl">--build-arg APP_VERSION=
      <input type="text" id="barg" value="1.4.2"></label>
    <button id="b-build">docker build</button>
    <div id="img"></div>
  </div>
  <div class="col">
    <h4>2. Run time</h4>
    <label class="lbl"><input type="checkbox" id="usefile" checked> --env-file .env</label>
    <textarea id="envfile">NODE_ENV=staging
LOG_LEVEL=debug</textarea>
    <label class="lbl">-e
      <input type="text" id="eflag" value="LOG_LEVEL=warn"></label>
    <button id="b-run">docker run ... printenv</button>
  </div>
</div>

<script>
(${envSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>Step by step: the default settings</summary>
  <p>Click <strong>docker build</strong>, then <strong>docker run ... printenv</strong> without changing anything:</p>
  <table>
    <tr><th>Step</th><th>Console</th><th>Why</th></tr>
    <tr><td>build</td><td><code>#5 0.21 building version 1.4.2</code></td><td>The ARG exists while <code>RUN</code> executes</td></tr>
    <tr><td>run</td><td><code>NODE_ENV=staging &lt;- --env-file (overrides image ENV)</code></td><td>Image default <code>production</code> lost to the env file</td></tr>
    <tr><td></td><td><code>LOG_LEVEL=warn &lt;- -e (overrides --env-file)</code></td><td><code>-e</code> beats <code>--env-file</code></td></tr>
    <tr><td></td><td><code>(no APP_VERSION: an ARG only exists while the image is being built)</code></td><td>ARG values don't reach containers</td></tr>
  </table>
</details>
<details>
  <summary>Try this: make the version visible at runtime</summary>
  <ol>
    <li>Tick <strong>add <code>ENV APP_VERSION=$APP_VERSION</code></strong> and click <strong>docker run</strong> <em>without</em> rebuilding. Still no APP_VERSION: the image label says <code>(ARG only)</code>. Dockerfile changes need a rebuild.</li>
    <li>Click <strong>docker build</strong>, then run: <code>APP_VERSION=1.4.2 &lt;- image ENV (copied from ARG at build time)</code>.</li>
    <li>Now add <code>APP_VERSION=hotfix</code> to the env file and run again: the runtime value overrides the baked one.</li>
    <li>Untick <code>--env-file</code> and clear the <code>-e</code> box: you're back to the image defaults (<code>NODE_ENV=production &lt;- image ENV</code>).</li>
  </ol>
  <div class="warn"><strong>Common mistake:</strong> expecting <code>docker run -e APP_VERSION=2.0</code> to change what was <em>built</em>. Runtime env can't re-run <code>RUN</code> steps. Anything used during the build must come from <code>--build-arg</code>.</div>
</details>
`,
        },
        {
          title: 'Build-time secret done right',
          runnable: false,
          lang: 'docker',
          code: `# syntax=docker/dockerfile:1
FROM node:22-slim
WORKDIR /app

ARG APP_VERSION=dev
ENV APP_VERSION=\${APP_VERSION} \\
    NODE_ENV=production \\
    PORT=3000

COPY package*.json ./
# The token is mounted only for this RUN step and never stored in a layer.
# Build with:  docker build --secret id=npmrc,src=$HOME/.npmrc --build-arg APP_VERSION=1.4.2 .
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc npm ci --omit=dev

COPY . .
USER node
CMD ["node", "server.js"]

# Runtime secrets are NOT here. Pass them when running:
#   docker run --env-file .env myapp      (.env is in .gitignore and .dockerignore)`,
        },
      ],
      quiz: [
        {
          q: 'A Dockerfile has <code>ARG GIT_SHA</code> and nothing else about it. You build with <code>--build-arg GIT_SHA=abc123</code>. Does <code>printenv GIT_SHA</code> in a running container print <code>abc123</code>?',
          options: [
            'Yes, build args become env vars',
            'No: ARG only exists during the build; copy it with ENV GIT_SHA=$GIT_SHA if the app needs it',
            'Only if you also pass -e GIT_SHA',
            'Only in multi-stage builds',
          ],
          answer: 1,
          why: 'ARG is build-time only. To keep the value, write it into an ENV (or a file, or a LABEL) during the build.',
        },
        {
          q: 'The image has <code>ENV LOG_LEVEL=info</code>, <code>.env</code> has <code>LOG_LEVEL=debug</code>, and you run <code>docker run --env-file .env -e LOG_LEVEL=warn app</code>. What does the app see?',
          options: ['info', 'debug', 'warn', 'An error: duplicate variable'],
          answer: 2,
          why: 'Runtime settings override image ENV, and -e is applied after --env-file, so -e wins.',
        },
        {
          q: 'Which is the safest way to use a private npm token during <code>docker build</code>?',
          options: [
            'ENV NPM_TOKEN=... in the Dockerfile',
            'ARG NPM_TOKEN and --build-arg',
            'RUN --mount=type=secret,... with docker build --secret',
            'COPY .npmrc into the image and delete it in a later step',
          ],
          answer: 2,
          why: 'Secret mounts are available only to that RUN step and never written to a layer. ENV/ARG leak into image metadata/history, and a file deleted in a later layer still exists in the earlier one.',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>This Dockerfile bakes an API key into the image and the version never reaches the app. Fix it:</p>
<ul>
  <li>Remove the hard-coded <code>API_KEY</code> from the Dockerfile (no <code>API_KEY</code> in any <code>ENV</code> or <code>ARG</code>).</li>
  <li>Declare a build argument <code>APP_VERSION</code> with default <code>dev</code>, and copy it into an <code>ENV APP_VERSION</code> so the running app can read it.</li>
  <li>Keep <code>ENV NODE_ENV=production</code>.</li>
  <li>In the run command, load runtime config from <code>.env</code> with <code>--env-file</code>.</li>
</ul>
<p>Edit both boxes below and click <strong>Check</strong>.</p>`,
        hint: 'ARG APP_VERSION=dev then ENV APP_VERSION=$APP_VERSION (or ${APP_VERSION}). Delete the ENV API_KEY line. Run: docker run -d --env-file .env myapp',
        starter: widget(
          [
            { id: 'df', label: 'Dockerfile', height: 140, value: `FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
ENV API_KEY=sk_live_51Hx9d2
COPY . .
CMD ["node", "server.js"]` },
            { id: 'run', label: 'docker run command', height: 44, value: 'docker run -d -e APP_VERSION=1.4.2 myapp' },
          ],
          envRules()
        ),
        solution: widget(
          [
            { id: 'df', label: 'Dockerfile', height: 140, value: `FROM node:22-slim
WORKDIR /app
ARG APP_VERSION=dev
ENV APP_VERSION=\${APP_VERSION}
ENV NODE_ENV=production
COPY . .
CMD ["node", "server.js"]` },
            { id: 'run', label: 'docker run command', height: 44, value: 'docker run -d --env-file .env myapp' },
          ],
          envRules()
        ),
      },
    },

    // -------------------------------------------------------------------
    {
      id: 'logs-and-debugging',
      section: 'Running Containers',
      title: 'Logs, exec & debugging',
      explain: `
<p>When a container misbehaves you can't just SSH in and look around. You need a small toolkit, and a method.</p>

<h3>Logs: write to stdout/stderr</h3>
<p>Docker captures whatever PID 1 writes to <strong>stdout and stderr</strong>. That's the container convention:
don't write log files inside the container, print to the console and let the platform collect it. (The official
nginx image even symlinks <code>access.log</code> → <code>/dev/stdout</code>.)</p>
<pre><code class="language-bash">docker logs api                 # everything so far
docker logs -f --tail 50 api    # last 50 lines, then follow (Ctrl+C to stop)
docker logs --since 10m -t api  # last 10 minutes, with timestamps</code></pre>
<p>Logs are kept for stopped containers too, which is exactly when you need them. They vanish with <code>docker rm</code>.</p>
<div class="warn">The default <code>json-file</code> log driver has <strong>no size limit</strong>. A chatty container can fill the disk. Set rotation per container (<code>--log-opt max-size=10m --log-opt max-file=3</code>) or globally in <code>/etc/docker/daemon.json</code> (or use the <code>local</code> driver, which rotates by default).</div>

<h3>Look inside</h3>
<table>
  <tr><th>Command</th><th>Use it to…</th></tr>
  <tr><td><code>docker exec -it api sh</code></td><td>open a shell in a <em>running</em> container (<code>bash</code> if the image has it)</td></tr>
  <tr><td><code>docker inspect api</code></td><td>full JSON: state, exit code, OOMKilled, mounts, env, network, restart count</td></tr>
  <tr><td><code>docker inspect -f '{{.State.ExitCode}}' api</code></td><td>pick one field with a Go template</td></tr>
  <tr><td><code>docker stats</code></td><td>live CPU / memory / network per container (<code>--no-stream</code> for one snapshot)</td></tr>
  <tr><td><code>docker top api</code></td><td>processes inside, without needing <code>ps</code> in the image</td></tr>
  <tr><td><code>docker cp api:/app/logs/x.log .</code></td><td>copy files out (or in), works on stopped containers too</td></tr>
  <tr><td><code>docker events</code></td><td>live stream of die / oom / restart events</td></tr>
</table>
<p>Minimal images (distroless, <code>scratch</code>) have no shell. Options: Docker Desktop's <code>docker debug api</code>,
or attach a toolbox container to the same namespaces:
<code>docker run --rm -it --network container:api --pid container:api nicolaka/netshoot</code>.</p>

<h3>Exit codes tell you a lot</h3>
<table>
  <tr><th>Code</th><th>Meaning</th><th>Typical cause</th></tr>
  <tr><td><code>0</code></td><td>exited normally</td><td>job finished, or a graceful stop</td></tr>
  <tr><td><code>1</code></td><td>app error</td><td>uncaught exception, bad config: <strong>read the logs</strong></td></tr>
  <tr><td><code>125</code></td><td><code>docker run</code> itself failed</td><td>bad flag, name conflict</td></tr>
  <tr><td><code>126</code> / <code>127</code></td><td>command not executable / not found</td><td>typo in CMD, missing binary, script without <code>+x</code></td></tr>
  <tr><td><code>137</code></td><td>128 + 9 = SIGKILL</td><td><strong>out of memory</strong> (check <code>OOMKilled</code>) or <code>docker stop</code> timed out</td></tr>
  <tr><td><code>139</code></td><td>128 + 11 = SIGSEGV</td><td>native crash</td></tr>
  <tr><td><code>143</code></td><td>128 + 15 = SIGTERM</td><td>stopped by SIGTERM with no handler (normal-ish shutdown)</td></tr>
</table>

<h3>A debugging recipe</h3>
<ol>
  <li><code>docker ps -a</code>: is it running, restarting, exited? With which code?</li>
  <li><code>docker logs --tail 50 api</code>: what were its last words?</li>
  <li><code>docker inspect</code>: <code>OOMKilled</code>, memory limit, env, mounts, command.</li>
  <li>Still unclear? Start the image by hand with a shell instead of the app:
    <code>docker run --rm -it --entrypoint sh myapi:1.0</code> and run the command yourself.</li>
</ol>
`,
      examples: [
        {
          title: 'Incident terminal: why does api keep dying?',
          lang: 'html',
          code: `<style>
  body { background: #f4f6fa; color: #1f2330; margin: 10px; font-size: 14px; }
  #term { background: #0f172a; color: #e2e8f0; font: 12px/1.45 ui-monospace, Menlo, monospace;
          height: 250px; overflow-y: auto; padding: 8px 10px; border-radius: 8px; white-space: pre-wrap; }
  #term .cmd { color: #7dd3fc; margin-top: 4px; }
  #term .dim { color: #94a3b8; font-style: italic; }
  .prompt { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
  .prompt input { flex: 1; font: 13px ui-monospace, monospace; }
  .quick button { font: 11.5px ui-monospace, monospace; margin: 2px 1px; }
</style>

<div id="term"></div>
<div class="prompt">$ <input id="in" placeholder="type a docker command, Enter to run" autocomplete="off"></div>
<div class="quick">
  <button data-cmd="docker ps">docker ps</button>
  <button data-cmd="docker ps -a">docker ps -a</button>
  <button data-cmd="docker logs --tail 5 api">docker logs --tail 5 api</button>
  <button data-cmd="docker inspect -f '{{.State.OOMKilled}}' api">inspect OOMKilled</button>
  <button data-cmd="docker inspect -f '{{.HostConfig.Memory}}' api">inspect Memory</button>
  <button data-cmd="docker exec -it api sh">docker exec -it api sh</button>
  <button data-cmd="docker stats --no-stream">docker stats --no-stream</button>
  <button data-cmd="help">help</button>
</div>

<script>
(${debugSim.toString()})();
</script>`,
          explain: `
<details>
  <summary>Step by step: one way to solve the incident</summary>
  <table>
    <tr><th>#</th><th>Command</th><th>Output (abridged)</th><th>What you learn</th></tr>
    <tr><td>1</td><td><code>docker ps</code></td><td>only <code>db</code>, plus <code>(api is missing: stopped containers only show with -a)</code></td><td>api isn't running</td></tr>
    <tr><td>2</td><td><code>docker ps -a</code></td><td><code>myapi:1.0 Exited (137) 2 minutes ago api</code></td><td>137 = SIGKILL. Either OOM or a stop timeout. Nobody ran docker stop…</td></tr>
    <tr><td>3</td><td><code>docker logs --tail 5 api</code></td><td>… <code>cache: 150000 items (63 MB)</code> then nothing</td><td>No error message: it was killed from outside mid-work, while memory was growing</td></tr>
    <tr><td>4</td><td>inspect OOMKilled</td><td><code>true</code></td><td>Confirmed: the kernel's OOM killer ended it</td></tr>
    <tr><td>5</td><td>inspect Memory</td><td><code>67108864</code></td><td>The limit is 64 MiB (<code>-m 64m</code>), too small for the cache</td></tr>
    <tr><td>6</td><td><code>docker exec -it api sh</code></td><td><code>Error response from daemon: container 3c1f09ab77e2 is not running</code></td><td>exec only works on running containers</td></tr>
  </table>
</details>
<details>
  <summary>The fix, and what goes wrong on the way</summary>
  <table>
    <tr><th>Command</th><th>Output</th></tr>
    <tr><td><code>docker start api</code></td><td><code>api</code>… and ~2.5 s later <code>(background) api was just OOM-killed again</code>. Same limit, same result.</td></tr>
    <tr><td><code>docker run -d --name api -m 256m myapi:1.0</code></td><td><code>Conflict. The container name "/api" is already in use…</code>: the old exited container still owns the name</td></tr>
    <tr><td><code>docker rm api</code></td><td><code>api</code></td></tr>
    <tr><td><code>docker run -d --name api -m 256m myapi:1.0</code></td><td><code>api is up with 256MiB…</code></td></tr>
    <tr><td><code>docker stats --no-stream</code></td><td><code>api    0.4%    131MiB / 256MiB       51.2%</code></td></tr>
    <tr><td><code>docker logs api</code></td><td>ends with <code>cache ready ✓ serving requests</code></td></tr>
  </table>
  <p>Try <code>-m 128m</code>: it still gets OOM-killed. Memory limits are a real constraint, not a suggestion. The
  alternative fix is making the app use less (a smaller cache, streaming instead of loading everything).</p>
  <div class="tip"><strong>Common mistake:</strong> seeing 137 and assuming "someone stopped it". Always check <code>{{.State.OOMKilled}}</code>. In Kubernetes you'll meet the same thing as <code>OOMKilled</code> in <code>kubectl describe pod</code>.</div>
</details>
`,
        },
        {
          title: 'Debugging toolkit session',
          runnable: false,
          lang: 'bash',
          code: `$ docker ps -a --filter name=api
CONTAINER ID   IMAGE       STATUS                       NAMES
3c1f09ab77e2   myapi:1.0   Exited (137) 2 minutes ago   api

$ docker logs --tail 3 -t api
2026-09-30T09:14:04Z cache: 100000 items (42 MB)
2026-09-30T09:14:05Z cache: 150000 items (63 MB)

$ docker inspect -f 'oom={{.State.OOMKilled}} code={{.State.ExitCode}} mem={{.HostConfig.Memory}}' api
oom=true code=137 mem=67108864

# Copy a file out of a (stopped) container
$ docker cp api:/app/config.json ./config-from-api.json

# Run the image with a shell instead of its CMD to poke around
$ docker run --rm -it --entrypoint sh myapi:1.0
/app $ ls
node_modules  package.json  server.js
/app $ node server.js      # run it by hand, watch it fail
/app $ exit

# Distroless image with no shell: borrow tools from another container
$ docker run --rm -it --network container:api --pid container:api nicolaka/netshoot
~ # ps aux ; ss -ltnp ; curl -s localhost:3000/health

# Live view
$ docker stats --no-stream
NAME   CPU %   MEM USAGE / LIMIT   MEM %
api    0.4%    131MiB / 256MiB     51.2%
db     0.1%    38MiB / 7.6GiB      0.49%

$ docker events --filter container=api --filter event=oom`,
        },
      ],
      quiz: [
        {
          q: 'An app writes its logs to <code>/var/log/app.log</code> inside the container. What does <code>docker logs</code> show?',
          options: [
            'The content of app.log',
            'Nothing from that file: docker logs only captures PID 1\'s stdout/stderr',
            'An error',
            'Only errors from the file',
          ],
          answer: 1,
          why: 'Docker collects stdout/stderr. Log to the console (or symlink the file to /dev/stdout like the nginx image does).',
        },
        {
          q: 'A container exited with code 137 and nobody ran docker stop. What should you check first?',
          options: [
            'docker inspect -f \'{{.State.OOMKilled}}\' — it was likely killed for exceeding its memory limit',
            'The EXPOSE line',
            'Whether the image tag exists',
            'The container\'s DNS settings',
          ],
          answer: 0,
          why: '137 = SIGKILL. Without a stop timeout, the usual culprit is the OOM killer. OOMKilled=true confirms it.',
        },
        {
          q: 'Why does <code>docker exec -it api sh</code> fail with "container is not running"?',
          options: [
            'The image has no sh',
            'exec starts a new process inside an existing running container; an exited container has no namespaces to join',
            'You need sudo',
            'exec only works with --init',
          ],
          answer: 1,
          why: 'exec joins a running container. For a stopped one, read logs, docker cp files out, or start the image with --entrypoint sh.',
        },
        {
          q: 'Exit code <code>127</code> right after start most likely means…',
          options: [
            'Out of memory',
            'The command in CMD/ENTRYPOINT was not found (typo or missing binary)',
            'Graceful shutdown',
            'The port is already in use',
          ],
          answer: 1,
          why: '127 is the shell\'s "command not found". 126 is "found but not executable".',
        },
      ],
      exercise: {
        lang: 'html',
        task: `<p>Write your <strong>incident notes</strong> for the crashing <code>api</code> container (the same incident as the terminal above). Your notes must contain the commands, one per line:</p>
<ul>
  <li>a command that lists containers <strong>including stopped ones</strong>;</li>
  <li>a command that shows only the <strong>last 20 lines</strong> of api's logs;</li>
  <li>a <code>docker inspect</code> that prints whether api was <strong>OOM-killed</strong>;</li>
  <li>the line <code>exit code: …</code> with the code you saw;</li>
  <li>the fix: remove the old container and run <code>myapi:1.0</code> again as <code>api</code> with a memory limit of <strong>at least 256m</strong>.</li>
</ul>
<p>Edit the notes in the box below and click <strong>Check</strong>.</p>`,
        hint: "docker ps -a / docker logs --tail 20 api / docker inspect -f '{{.State.OOMKilled}}' api / exit code: 137 / docker rm api / docker run -d --name api -m 256m myapi:1.0",
        starter: widget(
          [
            { id: 'notes', label: 'incident notes', height: 150, value: `# 1. what is running?
docker ps
# 2. last words
docker logs api
# 3. why was it killed?

exit code: ?
# 4. fix
docker start api` },
          ],
          debugRules(), [lines]
        ),
        solution: widget(
          [
            { id: 'notes', label: 'incident notes', height: 150, value: `# 1. what is running?
docker ps -a
# 2. last words
docker logs --tail 20 api
# 3. why was it killed?
docker inspect -f '{{.State.OOMKilled}}' api
exit code: 137
# 4. fix
docker rm api
docker run -d --name api -m 256m myapi:1.0` },
          ],
          debugRules(), [lines]
        ),
      },
    },
  );

  // ---------- exercise rules (real functions, serialized into the widget) ----------
  function lifecycleRules() {
    return [
      ['CMD uses the exec form (JSON array)', function (v) {
        var cmds = v('df').split('\n').filter(function (l) { return /^\s*CMD\b/i.test(l); });
        return cmds.length > 0 && cmds.every(function (l) { return /^\s*CMD\s*\[/i.test(l); });
      }],
      ['CMD runs node server.js directly (no npm, no sh)', function (v) {
        var m = v('df').match(/^\s*CMD\s*\[(.*)\]\s*$/im);
        if (!m) return false;
        var args = m[1].split(',').map(function (s) { return s.trim().replace(/^["']|["']$/g, ''); });
        return args[0] === 'node' && args[1] === 'server.js';
      }],
      ['docker run is detached and named web', function (v) {
        var r = v('run');
        return /\s-d\b|--detach\b/.test(r) && /--name[ =]web\b/.test(r);
      }],
      ['docker run uses --init', function (v) { return /--init\b/.test(v('run')); }],
      ['restart policy: unless-stopped', function (v) { return /--restart[ =]unless-stopped\b/.test(v('run')); }],
    ];
  }
  function runOf(v, name) {
    return v('sh').split('\n').filter(function (l) {
      return /docker\s+(container\s+)?run\b/.test(l) && new RegExp('--name[ =]' + name + '\\b').test(l);
    })[0] || '';
  }
  function portsRules() {
    return [
      ['creates the network appnet', function (v) { return /docker\s+network\s+create\s+appnet\b/.test(v('sh')); }],
      ['both containers use --network appnet', function (v) {
        return /--network[ =]appnet\b/.test(runOf(v, 'api')) && /--network[ =]appnet\b/.test(runOf(v, 'web'));
      }],
      ['web publishes host 8080 to container 80', function (v) {
        return /(-p|--publish)[ =](0\.0\.0\.0:|127\.0\.0\.1:)?8080:80\b/.test(runOf(v, 'web'));
      }],
      ['api listens on 0.0.0.0 (HOST=0.0.0.0)', function (v) { return /HOST=0\.0\.0\.0\b/.test(runOf(v, 'api')); }],
      ['api is not published (no -p on api)', function (v) {
        var r = runOf(v, 'api');
        return r !== '' && !/\s(-p|--publish)[ =]/.test(r) && !/\s-P\b/.test(r);
      }],
      ['web uses API_URL=http://api:3000', function (v) { return /API_URL=http:\/\/api:3000\b/.test(runOf(v, 'web')); }],
    ];
  }
  function cmd(v) {
    return v('sh').replace(/\\\s*\n/g, ' ');
  }
  function volumesRules() {
    return [
      ['named volume pgdata on /var/lib/postgresql/data', function (v) {
        var c = cmd(v);
        return /(-v|--volume)[ =]pgdata:\/var\/lib\/postgresql\/data\b/.test(c) ||
          /--mount[ =](?=\S*type=volume)(?=\S*(src|source)=pgdata\b)(?=\S*(dst|destination|target)=\/var\/lib\/postgresql\/data\b)/.test(c);
      }],
      ['init.sql bind-mounted read-only', function (v) {
        var c = cmd(v);
        var dst = '\\/docker-entrypoint-initdb\\.d\\/init\\.sql';
        return new RegExp('(-v|--volume)[ =]"?(\\$\\(pwd\\)|\\$PWD|\\$\\{PWD\\}|\\.)"?/init\\.sql"?:' + dst + ':ro\\b').test(c) ||
          (new RegExp('--mount[ =]\\S*type=bind').test(c) && new RegExp('(dst|destination|target)=' + dst).test(c) &&
            /(readonly|ro=true)/.test(c));
      }],
      ['/tmp is a tmpfs', function (v) {
        var c = cmd(v);
        return /--tmpfs[ =]\/tmp\b/.test(c) || /--mount[ =]\S*type=tmpfs\S*(dst|destination|target)=\/tmp\b/.test(c);
      }],
      ['5432 published only on 127.0.0.1', function (v) {
        var c = cmd(v);
        return /(-p|--publish)[ =]127\.0\.0\.1:5432:5432\b/.test(c) && !/(-p|--publish)[ =]5432:5432\b/.test(c);
      }],
      ['still runs postgres:17 with a password', function (v) {
        var c = cmd(v);
        return /POSTGRES_PASSWORD=\S+/.test(c) && /\spostgres:17\s*$/.test(c.trim() + ' ') ;
      }],
    ];
  }
  function envRules() {
    return [
      ['no API_KEY baked into the Dockerfile', function (v) { return !/^\s*(ENV|ARG)\b.*API_KEY/im.test(v('df')); }],
      ['ARG APP_VERSION with default dev', function (v) { return /^\s*ARG\s+APP_VERSION\s*=\s*dev\s*$/im.test(v('df')); }],
      ['ENV APP_VERSION copied from the ARG', function (v) {
        return /^\s*ENV\s+APP_VERSION\s*=\s*"?\$\{?APP_VERSION\}?"?\s*$/im.test(v('df'));
      }],
      ['ARG comes before the ENV that uses it', function (v) {
        var d = v('df');
        var a = d.search(/^\s*ARG\s+APP_VERSION/im);
        var e = d.search(/^\s*ENV\s+APP_VERSION/im);
        return a >= 0 && e > a;
      }],
      ['keeps ENV NODE_ENV=production', function (v) { return /^\s*ENV\s+NODE_ENV\s*=\s*production\s*$/im.test(v('df')); }],
      ['docker run uses --env-file .env', function (v) { return /--env-file[ =]\.?\/?\.env\b/.test(v('run')); }],
    ];
  }
  function lines(v) {
    return v('notes').split('\n').map(function (l) { return l.trim(); })
      .filter(function (l) { return l && l.charAt(0) !== '#'; });
  }
  function debugRules() {
    return [
      ['lists all containers, including stopped (ps -a)', function (v) {
        return lines(v).some(function (l) { return /^docker\s+(container\s+)?(ps|ls)\b.*\s(-a|--all)\b/.test(l); });
      }],
      ['shows the last 20 log lines of api', function (v) {
        return lines(v).some(function (l) { return /^docker\s+(container\s+)?logs\b.*(--tail[ =]|-n\s*)20\b/.test(l) && /\bapi\s*$/.test(l); });
      }],
      ['inspects OOMKilled for api', function (v) {
        return lines(v).some(function (l) { return /^docker\s+(container\s+)?inspect\b.*OOMKilled/.test(l) && /\bapi\b/.test(l); });
      }],
      ['exit code: 137', function (v) { return /exit code:\s*137\b/i.test(v('notes')); }],
      ['removes the old api container', function (v) {
        return lines(v).some(function (l) { return /^docker\s+(container\s+)?rm\b.*\bapi\s*$/.test(l); });
      }],
      ['runs myapi:1.0 as api with >= 256m memory', function (v) {
        return lines(v).some(function (l) {
          if (!/^docker\s+(container\s+)?run\b/.test(l) || !/--name[ =]api\b/.test(l) || !/myapi:1\.0\b/.test(l)) return false;
          var m = l.match(/(?:-m|--memory)[ =](\d+(?:\.\d+)?)([mMgG])/);
          if (!m) return false;
          var mb = parseFloat(m[1]) * (/g/i.test(m[2]) ? 1024 : 1);
          return mb >= 256;
        });
      }],
    ];
  }
})();
