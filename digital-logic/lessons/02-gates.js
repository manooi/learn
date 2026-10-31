window.LESSONS = window.LESSONS || [];
(function () {
  // Widgets are real functions stringified into the iframe (so they may use template literals).
  // W(fn, arg, deps) → HTML fragment running fn(rootEl, arg); deps = helper function declarations to include.
  const WCSS = `<style>
.wd{font:14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2330}
.wd .card{border:1px solid #e2e5ee;border-radius:10px;padding:10px 12px;background:#fbfcfe;margin:0 0 10px}
.wd .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.wd .muted{color:#646b80;font-size:13px}
.wd h4{margin:0 0 6px;font-size:15px}
.wd button.on{background:#0f766e;color:#fff;border-color:#0f766e}
.wd button.chk{background:#16a34a;color:#fff;border-color:#16a34a;font-weight:600}
.wd .big{font-size:20px;font-weight:800}
.wd .mono{font-family:ui-monospace,Menlo,monospace}
.wd table.tt{border-collapse:collapse;font:13px ui-monospace,Menlo,monospace;background:#fff}
.wd table.tt td,.wd table.tt th{border:1px solid #e2e5ee;padding:3px 10px;text-align:center}
.wd table.tt th{background:#f1f4f9;font:600 12px system-ui}
.wd table.tt tr.cur td{background:#fff4c2;font-weight:700}
.wd table.tt tr.bad td{background:#fee2e2}
.wd svg text{font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
</style>`;
  const W = (fn, arg, deps) => `${WCSS}<div class="wd" id="w"></div>
<script>${(deps || []).map(String).join('\n')}
(${fn.toString()})(document.getElementById('w')${arg === undefined ? '' : ', ' + JSON.stringify(arg)});<\/script>`;
  const C = (fn, arg) => `<div id="c"></div>
<script>Circ.mount('#c', (${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)}));<\/script>`;

  // ---------------------------------------------------------------- shared Boolean expression engine
  function exprLib() {
    const MAP = { '·': '&', '*': '&', '&': '&', '∧': '&', '+': '|', '|': '|', '∨': '|', '!': '!', '~': '!', '¬': '!', "'": "'", '’': "'", '^': '^', '⊕': '^', '(': '(', ')': ')' };
    function tokenize(s) {
      const t = [];
      for (let i = 0; i < s.length;) {
        const c = s[i], two = s.slice(i, i + 2);
        if (/\s/.test(c)) { i++; continue; }
        if (two === '&&' || two === '||') { t.push(two[0]); i += 2; continue; }
        if (/[A-Za-z]/.test(c)) { t.push({ v: c.toUpperCase() }); i++; continue; }
        if (c === '0' || c === '1') { t.push({ k: +c }); i++; continue; }
        if (MAP[c]) { t.push(MAP[c]); i++; continue; }
        throw new Error('Unexpected character "' + c + '"');
      }
      return t;
    }
    function parse(s) {
      const t = tokenize(s);
      let p = 0;
      const peek = () => t[p];
      const startsAtom = (x) => x !== undefined && (typeof x === 'object' || x === '(' || x === '!');
      const or = () => { let l = xor(); while (peek() === '|') { p++; l = { op: '|', a: l, b: xor() }; } return l; };
      const xor = () => { let l = and(); while (peek() === '^') { p++; l = { op: '^', a: l, b: and() }; } return l; };
      const and = () => { let l = un(); while (peek() === '&' || startsAtom(peek())) { if (peek() === '&') p++; l = { op: '&', a: l, b: un() }; } return l; };
      const un = () => { if (peek() === '!') { p++; return { op: '!', a: un() }; } let a = atom(); while (peek() === "'") { p++; a = { op: '!', a }; } return a; };
      const atom = () => {
        const x = t[p++];
        if (x === undefined) throw new Error('Expression ends too early');
        if (typeof x === 'object') return x.v ? { v: x.v } : { k: x.k };
        if (x === '(') { const e = or(); if (t[p++] !== ')') throw new Error('Missing )'); return e; }
        throw new Error('Unexpected "' + x + '"');
      };
      if (!t.length) throw new Error('Empty expression');
      const e = or();
      if (p < t.length) throw new Error('Unexpected "' + (typeof t[p] === 'object' ? (t[p].v || t[p].k) : t[p]) + '"');
      return e;
    }
    function ev(e, env) {
      if (e.v) return env[e.v] | 0;
      if (e.op === undefined) return e.k;
      if (e.op === '!') return ev(e.a, env) ^ 1;
      const a = ev(e.a, env), b = ev(e.b, env);
      return e.op === '&' ? a & b : e.op === '|' ? a | b : a ^ b;
    }
    function vars(e, s) { s = s || new Set(); if (e.v) s.add(e.v); if (e.a) vars(e.a, s); if (e.b) vars(e.b, s); return s; }
    function gates(e) { return e.op ? 1 + gates(e.a) + (e.b ? gates(e.b) : 0) : 0; }
    return { parse, ev, vars, gates };
  }

  function exprWidget(root, opts) {
    const X = exprLib();
    root.innerHTML = `<div class="card">
  <div class="row"><b>Left</b> <input id="l" class="mono" size="26"> <b style="font-size:18px">=?</b> <b>Right</b> <input id="r" class="mono" size="26"></div>
  <div class="muted" style="margin-top:4px">Variables A–D (any case). AND: <code>A·B</code> <code>A*B</code> <code>A&amp;&amp;B</code> or just <code>AB</code> · OR: <code>A+B</code> <code>A||B</code> · NOT: <code>!A</code> <code>~A</code> <code>A'</code> · XOR: <code>A^B</code> · constants <code>0</code> <code>1</code></div>
  <div class="row" id="pre" style="margin-top:8px;gap:4px"></div></div>
<div class="row" style="align-items:flex-start"><div class="card"><table class="tt" id="tt"></table></div>
  <div class="card" style="flex:1;min-width:260px"><div id="verdict" style="font-weight:700;font-size:16px"></div><div id="note" style="margin-top:6px"></div><div id="cost" class="muted" style="margin-top:6px"></div></div></div>`;
    const $ = (s) => root.querySelector(s);
    let note = '';
    $('#pre').innerHTML = opts.presets.map(([name], i) => `<button data-i="${i}" style="font-size:12.5px;padding:2px 8px">${name}</button>`).join('');
    $('#pre').onclick = (e) => {
      const b = e.target.closest('button'); if (!b) return;
      const pr = opts.presets[+b.dataset.i];
      $('#l').value = pr[1]; $('#r').value = pr[2]; note = pr[3] || '';
      root.querySelectorAll('#pre button').forEach((x) => x.classList.toggle('on', x === b));
      draw();
    };
    function draw() {
      let L, R;
      try { L = X.parse($('#l').value); R = X.parse($('#r').value); } catch (err) {
        $('#verdict').innerHTML = '<span style="color:#b45309">⚠ ' + err.message + '</span>'; $('#tt').innerHTML = ''; $('#cost').textContent = ''; return;
      }
      const vs = [...new Set([...X.vars(L), ...X.vars(R)])].sort();
      if (vs.length > 4) { $('#verdict').textContent = 'Use at most 4 variables (A–D).'; return; }
      let h = `<tr>${vs.map((v) => `<th>${v}</th>`).join('')}<th>Left</th><th>Right</th><th></th></tr>`, bad = 0;
      const n = 1 << vs.length;
      for (let i = 0; i < n; i++) {
        const env = {};
        vs.forEach((v, j) => { env[v] = (i >> (vs.length - 1 - j)) & 1; });
        const a = X.ev(L, env), b = X.ev(R, env);
        if (a !== b) bad++;
        h += `<tr class="${a !== b ? 'bad' : ''}">${vs.map((v) => `<td>${env[v]}</td>`).join('')}<td><b>${a}</b></td><td><b>${b}</b></td><td>${a === b ? '✓' : '✗'}</td></tr>`;
      }
      $('#tt').innerHTML = h;
      $('#verdict').innerHTML = bad ? `<span style="color:#dc2626">❌ Not equivalent: ${bad} of ${n} rows differ (red).</span>` : `<span style="color:#15803d">✅ Equivalent: identical on all ${n} rows.</span>`;
      $('#note').innerHTML = note;
      $('#cost').innerHTML = `Gate cost if built literally: left <b>${X.gates(L)}</b>, right <b>${X.gates(R)}</b> (each AND/OR/XOR/NOT operator = 1 gate).`;
    }
    $('#l').oninput = () => { note = ''; draw(); }; $('#r').oninput = () => { note = ''; draw(); };
    $('#l').value = opts.presets[0][1]; $('#r').value = opts.presets[0][2]; note = opts.presets[0][3] || '';
    root.querySelector('#pre button').classList.add('on');
    draw();
  }

  // ---------------------------------------------------------------- not-and-or
  function basicCfg() {
    return {
      title: 'NOT, AND, OR side by side',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 140 },
        { id: 'n', type: 'NOT', x: 160, y: 0 },
        { id: 'g1', type: 'AND', x: 160, y: 70 },
        { id: 'g2', type: 'OR', x: 160, y: 140 },
        { id: 'y0', type: 'OUT', label: 'NOT A', x: 300, y: 0 },
        { id: 'y1', type: 'OUT', label: 'A AND B', x: 300, y: 70 },
        { id: 'y2', type: 'OUT', label: 'A OR B', x: 300, y: 140 },
      ],
      wires: [['a', 'n'], ['a', 'g1.0', { mx: 100 }], ['b', 'g1.1', { mx: 120 }], ['b', 'g2.0', { mx: 120 }], ['a', 'g2.1', { mx: 100 }], ['n', 'y0'], ['g1', 'y1'], ['g2', 'y2']],
    };
  }
  function ifCfg() {
    return {
      title: 'if (login && (admin || owner)) showEditButton()',
      intro: 'Your <code>if</code> condition as hardware: the <code>||</code> becomes an OR gate, the <code>&amp;&amp;</code> an AND gate.',
      parts: [
        { id: 'l', type: 'IN', label: 'login', x: 20, y: 0 },
        { id: 'a', type: 'IN', label: 'admin', x: 20, y: 60 },
        { id: 'o', type: 'IN', label: 'owner', x: 20, y: 120 },
        { id: 'g1', type: 'OR', x: 160, y: 70 },
        { id: 'g2', type: 'AND', x: 300, y: 10 },
        { id: 'y', type: 'OUT', label: 'canEdit', x: 420, y: 10 },
      ],
      wires: [['a', 'g1.0', { mx: 110 }], ['o', 'g1.1', { mx: 110 }], ['l', 'g2.0'], ['g1', 'g2.1', { mx: 260 }], ['g2', 'y']],
    };
  }
  function bitwiseWidget(root) {
    root.innerHTML = `<div class="card"><div class="row" style="margin-bottom:6px"><b>Operation</b>
  <button data-op="&" class="on">a &amp; b (AND)</button><button data-op="|">a | b (OR)</button><button data-op="~">~a (NOT)</button></div>
  <div id="g" class="mono"></div>
  <div class="muted" id="m" style="margin-top:6px"></div>
  <div class="row" style="margin-top:6px"><span class="muted">Try:</span><button data-pre="mask">test bit 2: flags &amp; 0b00000100</button><button data-pre="set">set bit 7: flags | 0x80</button><button data-pre="low">keep low nibble: x &amp; 0x0F</button></div></div>`;
    const $ = (s) => root.querySelector(s);
    let a = 0b10110110, b = 0b00001111, op = '&';
    const row = (name, v, k, click) => `<div class="row" style="gap:4px;margin:3px 0"><span style="width:60px;font-family:system-ui;font-weight:700">${name}</span>${[7, 6, 5, 4, 3, 2, 1, 0].map((i) => `<button ${click ? `data-r="${k}" data-k="${i}"` : 'disabled style="opacity:1"'} style="width:36px;font:700 15px ui-monospace,monospace;${(v >> i) & 1 ? 'background:#16a34a;color:#fff;border-color:#15803d' : ''}">${(v >> i) & 1}</button>`).join('')}<span style="margin-left:8px">= ${v}</span><span class="muted">(0x${v.toString(16).toUpperCase().padStart(2, '0')})</span></div>`;
    function draw() {
      const r = op === '&' ? a & b : op === '|' ? a | b : ~a & 255;
      $('#g').innerHTML = row('a', a, 'a', true) + (op === '~' ? '' : row('b', b, 'b', true)) + '<div style="border-top:2px solid #cbd5e1;width:420px;margin:4px 0 4px 64px"></div>' + row(op === '~' ? '~a' : 'a ' + op + ' b', r, 'r', false);
      $('#m').innerHTML = op === '~' ? 'One NOT gate per bit: 8 inverters working at the same time.' : `Eight ${op === '&' ? 'AND' : 'OR'} gates side by side, one per column. Column k only looks at bit k of a and bit k of b. A 64-bit CPU does this for 64 columns in one instruction.`;
      root.querySelectorAll('button[data-op]').forEach((x) => x.classList.toggle('on', x.dataset.op === op));
    }
    root.onclick = (e) => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.op) op = t.dataset.op;
      else if (t.dataset.r === 'a') a ^= 1 << +t.dataset.k;
      else if (t.dataset.r === 'b') b ^= 1 << +t.dataset.k;
      else if (t.dataset.pre === 'mask') { a = 0b01100101; b = 0b00000100; op = '&'; }
      else if (t.dataset.pre === 'set') { a = 0b00010011; b = 0x80; op = '|'; }
      else if (t.dataset.pre === 'low') { a = 0xb7; b = 0x0f; op = '&'; }
      draw();
    };
    draw();
  }
  function beltEx(sol) {
    const cfg = {
      build: { palette: ['AND', 'OR', 'NOT'], best: 3 },
      target: ({ E, D, P }) => ({ W: E & ((D & P) ^ 1) }),
      parts: [
        { id: 'e', type: 'IN', label: 'E', x: 40, y: 40 },
        { id: 'd', type: 'IN', label: 'D', x: 40, y: 150 },
        { id: 'p', type: 'IN', label: 'P', x: 40, y: 230 },
        { id: 't', type: 'TEXT', text: 'E = engine on · D = driver belt · P = passenger belt', x: 20, y: 350 },
        { id: 'w', type: 'OUT', label: 'W', x: 660, y: 110 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'g1', type: 'AND', x: 200, y: 170 }, { id: 'n1', type: 'NOT', x: 330, y: 170 }, { id: 'g2', type: 'AND', x: 480, y: 110 });
      cfg.wires = [['d', 'g1.0'], ['p', 'g1.1'], ['g1', 'n1'], ['e', 'g2.0'], ['n1', 'g2.1'], ['g2', 'w']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- nand-nor
  function fourCfg() {
    const G = [['AND', 'AND'], ['NAND', 'NAND = NOT AND'], ['OR', 'OR'], ['NOR', 'NOR = NOT OR']];
    const parts = [{ id: 'a', type: 'IN', label: 'A', x: 20, y: 40 }, { id: 'b', type: 'IN', label: 'B', x: 20, y: 180 }];
    const wires = [];
    G.forEach(([t, lab], i) => {
      parts.push({ id: 'g' + i, type: t, x: 180, y: i * 70 }, { id: 'y' + i, type: 'OUT', label: lab, x: 320, y: i * 70 });
      wires.push(['a', 'g' + i + '.0', { mx: 100 }], ['b', 'g' + i + '.1', { mx: 130 }], ['g' + i, 'y' + i]);
    });
    return { title: 'AND vs NAND, OR vs NOR: the bubble flips the output', parts, wires };
  }
  function cmosNandWidget(root) {
    root.innerHTML = `<div class="row" style="margin-bottom:6px"><button id="mN" class="on">CMOS NAND</button><button id="mR">CMOS NOR</button>
  <span style="margin-left:12px"></span><button id="bA">A = 0</button><button id="bB">B = 0</button></div>
<div class="row" style="align-items:flex-start"><div class="card"><svg id="s" viewBox="0 0 470 340" width="470" height="340"></svg></div>
<div class="card" style="flex:1;min-width:240px"><h4 id="h"></h4><div id="r"></div><table class="tt" id="tt" style="margin-top:8px"></table></div></div>`;
    const $ = (s) => root.querySelector(s);
    let mode = 'nand', A = 0, B = 0;
    const fet = (x, y, t, inp, v, side) => { // channel x, y..y+50
      const on = t === 'n' ? v : !v, d = side === 'R' ? 1 : -1, px = x + 14 * d;
      let s = `<rect x="${x - 4}" y="${y}" width="8" height="50" rx="2" fill="${on ? (t === 'n' ? '#2563eb' : '#16a34a') : '#cbd5e1'}"/><path d="M${px} ${y + 4} V${y + 46}" stroke="#334155" stroke-width="3"/>`;
      if (t === 'p') s += `<circle cx="${px + 6 * d}" cy="${y + 25}" r="4.5" fill="#fff" stroke="#334155" stroke-width="2"/>`;
      s += `<path d="M${t === 'p' ? px + 10 * d : px} ${y + 25} H${x + 44 * d}" stroke="#334155" stroke-width="2"/>`;
      s += `<g data-in="${inp}" style="cursor:pointer"><circle cx="${x + 56 * d}" cy="${y + 25}" r="12" fill="${v ? '#16a34a' : '#fff'}" stroke="#334155" stroke-width="2"/><text x="${x + 56 * d}" y="${y + 30}" text-anchor="middle" font-size="12" font-weight="800" fill="${v ? '#fff' : '#334155'}">${inp}</text></g>`;
      s += `<text x="${x + 8 * -d}" y="${y + 66}" text-anchor="middle" font-size="10" fill="${on ? '#15803d' : '#64748b'}">${t}MOS ${on ? 'ON' : 'off'}</text>`;
      return s;
    };
    const W2 = (d, on, col) => `<path d="${d}" stroke="${on ? col : '#94a3b8'}" stroke-width="2.5" fill="none"/>`;
    function draw() {
      const nand = mode === 'nand';
      let s = `<path d="M120 25 H340" stroke="#dc2626" stroke-width="3"/><text x="120" y="17" font-size="12" font-weight="700" fill="#dc2626">VDD</text>`;
      let up, down, oy;
      if (nand) {
        const pa = !A, pb = !B; up = pa || pb; down = A && B; oy = 125;
        s += W2('M170 25 V50 M170 100 V125', pa, '#16a34a') + W2('M290 25 V50 M290 100 V125', pb, '#16a34a') + W2('M170 125 H290', up, '#16a34a');
        s += W2('M230 125 V160 M230 210 V230 M230 280 V300', down, '#2563eb');
        s += fet(170, 50, 'p', 'A', A, 'L') + fet(290, 50, 'p', 'B', B, 'R') + fet(230, 160, 'n', 'A', A, 'L') + fet(230, 230, 'n', 'B', B, 'L');
        s += `<text x="300" y="195" font-size="11" fill="#475569">nMOS in SERIES:</text><text x="300" y="209" font-size="11" fill="#475569">pull down only if A AND B</text>`;
        s += `<text x="306" y="148" font-size="11" fill="#475569">pMOS in PARALLEL</text>`;
      } else {
        const pa = !A, pb = !B; up = pa && pb; down = A || B; oy = 190;
        s += W2('M230 25 V45 M230 95 V115 M230 165 V190', up, '#16a34a');
        s += W2('M230 190 V210 M170 210 H290', down, '#2563eb') + W2('M170 210 V220 M170 270 V285', A, '#2563eb') + W2('M290 210 V220 M290 270 V285', B, '#2563eb') + W2('M170 285 H290 M230 285 V300', down, '#2563eb');
        s += fet(230, 45, 'p', 'A', A, 'L') + fet(230, 115, 'p', 'B', B, 'L') + fet(170, 220, 'n', 'A', A, 'L') + fet(290, 220, 'n', 'B', B, 'R');
        s += `<text x="270" y="80" font-size="11" fill="#475569">pMOS in SERIES:</text><text x="270" y="94" font-size="11" fill="#475569">pull up only if A=0 AND B=0</text>`;
      }
      s += `<path d="M220 300 H240 M224 306 H236 M228 312 H232" stroke="#334155" stroke-width="2"/><text x="246" y="312" font-size="11" fill="#475569">GND</text>`;
      const out = up ? 1 : 0;
      s += `<path d="M${nand ? 290 : 230} ${oy} H420" stroke="${out ? '#16a34a' : '#94a3b8'}" stroke-width="2.5"/><circle cx="${nand ? 290 : 230}" cy="${oy}" r="4" fill="#334155"/>`;
      s += `<circle cx="434" cy="${oy}" r="12" fill="${out ? '#ef4444' : '#e2e8f0'}" stroke="#334155" stroke-width="2"/><text x="434" y="${oy - 18}" text-anchor="middle" font-size="13" font-weight="800">OUT = ${out}</text>`;
      $('#s').innerHTML = s;
      $('#bA').textContent = 'A = ' + A; $('#bA').classList.toggle('on', !!A);
      $('#bB').textContent = 'B = ' + B; $('#bB').classList.toggle('on', !!B);
      $('#mN').classList.toggle('on', nand); $('#mR').classList.toggle('on', !nand);
      $('#h').textContent = nand ? 'NAND: 4 transistors' : 'NOR: 4 transistors';
      $('#r').innerHTML = `Pull-up network (pMOS): <b style="color:${up ? '#15803d' : '#64748b'}">${up ? 'conducts → OUT tied to VDD' : 'open'}</b><br>Pull-down network (nMOS): <b style="color:${down ? '#1d4ed8' : '#64748b'}">${down ? 'conducts → OUT tied to GND' : 'open'}</b><br>
        <span class="muted">Exactly one network conducts for every input: the CMOS rule. An AND gate would need this NAND plus a 2-transistor NOT = 6 transistors.</span>`;
      $('#tt').innerHTML = `<tr><th>A</th><th>B</th><th>${nand ? 'NAND' : 'NOR'}</th></tr>` + [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => `<tr class="${x === A && y === B ? 'cur' : ''}"><td>${x}</td><td>${y}</td><td>${nand ? 1 - (x & y) : 1 - (x | y)}</td></tr>`).join('');
    }
    $('#mN').onclick = () => { mode = 'nand'; draw(); }; $('#mR').onclick = () => { mode = 'nor'; draw(); };
    $('#bA').onclick = () => { A ^= 1; draw(); }; $('#bB').onclick = () => { B ^= 1; draw(); };
    $('#s').onclick = (e) => { const g = e.target.closest('[data-in]'); if (!g) return; if (g.dataset.in === 'A') A ^= 1; else B ^= 1; draw(); };
    draw();
  }
  function andFromNandCfg() {
    return {
      title: 'AND = NAND + NOT (4 + 2 = 6 transistors)',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 40 },
        { id: 'n', type: 'NAND', x: 160, y: 10 },
        { id: 'i', type: 'NOT', x: 300, y: 10 },
        { id: 't1', type: 'TEXT', text: '4 transistors', x: 160, y: 82 },
        { id: 't2', type: 'TEXT', text: '+ 2 transistors', x: 300, y: 82 },
        { id: 'y', type: 'OUT', label: 'A AND B', x: 440, y: 10 },
      ],
      wires: [['a', 'n.0', { mx: 110 }], ['b', 'n.1', { mx: 110 }], ['n', 'i'], ['i', 'y']],
    };
  }
  function norAndEx(sol) {
    const cfg = {
      build: { palette: ['NOR'], best: 3 },
      target: ({ A, B }) => ({ Y: A & B }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 80 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 240 },
        { id: 'y', type: 'OUT', label: 'Y', x: 660, y: 150 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'n1', type: 'NOR', x: 200, y: 80 }, { id: 'n2', type: 'NOR', x: 200, y: 240 }, { id: 'n3', type: 'NOR', x: 400, y: 150 });
      cfg.wires = [['a', 'n1.0'], ['a', 'n1.1'], ['b', 'n2.0'], ['b', 'n2.1'], ['n1', 'n3.0'], ['n2', 'n3.1'], ['n3', 'y']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- xor-xnor
  function xorCfg() {
    return {
      title: 'XOR asks "different?", XNOR asks "same?"',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 100 },
        { id: 'g1', type: 'XOR', x: 160, y: 10 },
        { id: 'g2', type: 'XNOR', x: 160, y: 90 },
        { id: 'y1', type: 'OUT', label: 'A XOR B', x: 300, y: 10 },
        { id: 'y2', type: 'OUT', label: 'A XNOR B', x: 300, y: 90 },
      ],
      wires: [['a', 'g1.0'], ['b', 'g1.1', { mx: 120 }], ['a', 'g2.0', { mx: 100 }], ['b', 'g2.1'], ['g1', 'y1'], ['g2', 'y2']],
    };
  }
  function invCfg() {
    const parts = [
      { id: 'd', type: 'NUMIN', label: 'DATA', bits: 4, value: 5, x: 0, y: 0 },
      { id: 'inv', type: 'IN', label: 'INVERT', x: 0, y: 260 },
      { id: 'o', type: 'NUMOUT', label: 'OUT', bits: 4, x: 380, y: 0 },
    ];
    const wires = [];
    const mxIn = [170, 150, 130, 110], mxOut = [0, 300, 320, 340];
    for (let k = 0; k < 4; k++) {
      parts.push({ id: 'x' + k, type: 'XOR', x: 200, y: 60 * k + 10 });
      wires.push(['d.' + k, 'x' + k + '.0', { mx: mxIn[k] }], ['inv', 'x' + k + '.1', { mx: 185 }], ['x' + k, 'o.' + k, k ? { mx: mxOut[k] } : {}]);
    }
    return { title: 'XOR as a controlled inverter (one XOR per bit)', intro: 'INVERT = 0: OUT = DATA unchanged. INVERT = 1: every bit flipped (OUT = NOT DATA). Click ▲▼ or a bit of DATA.', parts, wires };
  }
  function raidWidget(root) {
    root.innerHTML = `<div class="row" id="disks" style="align-items:stretch"></div><div class="card" id="rb"></div>`;
    const $ = (s) => root.querySelector(s);
    const d = [0b01001000, 0b01101001, 0b00100001]; // "H", "i", "!"
    let failed = null, rebuilt = null;
    const bits = (v, k, click) => [7, 6, 5, 4, 3, 2, 1, 0].map((i) => `<span ${click ? `data-d="${k}" data-k="${i}"` : ''} style="display:inline-block;width:20px;text-align:center;border-radius:4px;margin:1px;cursor:${click ? 'pointer' : 'default'};${(v >> i) & 1 ? 'background:#16a34a;color:#fff' : 'background:#e5e7eb'}">${(v >> i) & 1}</span>`).join('');
    function draw() {
      const p = d[0] ^ d[1] ^ d[2];
      const all = [...d, p];
      $('#disks').innerHTML = all.map((v, k) => {
        const dead = failed === k;
        return `<div class="card" style="width:210px;${dead ? 'background:#fee2e2;border-color:#fca5a5' : rebuilt === k ? 'background:#dcfce7' : ''}"><b>${k < 3 ? '💾 Disk ' + (k + 1) : '🛡 Parity disk'}</b>
        <div class="muted">${k < 3 ? 'data byte' : 'P = D1 ⊕ D2 ⊕ D3'}</div>
        <div class="mono" style="margin:6px 0">${dead ? '<span style="color:#b91c1c;font-weight:700">💥 FAILED: ? ? ? ? ? ? ? ?</span>' : bits(v, k, k < 3 && failed === null)}</div>
        <div class="mono muted">${dead ? '' : `0x${v.toString(16).toUpperCase().padStart(2, '0')} ${k < 3 ? `'${String.fromCharCode(v)}'` : ''}`}</div>
        <button data-f="${k}" ${failed !== null ? 'disabled' : ''}>💥 Fail this disk</button></div>`;
      }).join('');
      if (failed === null) {
        $('#rb').innerHTML = `<b>All disks healthy.</b> <span class="muted">Click data bits to change them: the parity disk updates so each column has an <b>even</b> number of 1s. Then fail any one disk.</span>`;
      } else {
        const survivors = all.map((v, k) => [v, k]).filter(([, k]) => k !== failed);
        const rec = survivors.reduce((x, [v]) => x ^ v, 0);
        $('#rb').innerHTML = `<b>Rebuild disk ${failed < 3 ? failed + 1 : '(parity)'} = XOR of the three survivors</b>
          <div class="mono" style="margin-top:6px">${survivors.map(([v, k]) => `<div>${bits(v, -1, false)} ${k < 3 ? 'Disk ' + (k + 1) : 'Parity'}</div>`).join('')}
          <div style="border-top:2px solid #94a3b8;width:200px;margin:3px 0"></div><div>${bits(rec, -1, false)} <b>= recovered 0x${rec.toString(16).toUpperCase().padStart(2, '0')}</b></div></div>
          <div class="row" style="margin-top:6px"><button id="fix">🔧 Replace disk &amp; rebuild</button><span class="muted">Each column: x ⊕ x = 0, so XORing everything that survived cancels out all but the missing value.</span></div>`;
        $('#fix').onclick = () => { rebuilt = failed; failed = null; draw(); };
      }
    }
    $('#disks').onclick = (e) => {
      const f = e.target.closest('[data-f]');
      if (f && !f.disabled) { failed = +f.dataset.f; rebuilt = null; draw(); return; }
      const b = e.target.closest('[data-d]');
      if (b && +b.dataset.d >= 0) { d[+b.dataset.d] ^= 1 << +b.dataset.k; rebuilt = null; draw(); }
    };
    draw();
  }
  function parityEx(sol) {
    const cfg = {
      build: { palette: ['XOR'], best: 3 },
      target: ({ A, B, C, D }) => ({ P: A ^ B ^ C ^ D }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 30 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 110 },
        { id: 'c', type: 'IN', label: 'C', x: 40, y: 210 },
        { id: 'd', type: 'IN', label: 'D', x: 40, y: 290 },
        { id: 'p', type: 'OUT', label: 'P', x: 660, y: 150 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'x1', type: 'XOR', x: 200, y: 50 }, { id: 'x2', type: 'XOR', x: 200, y: 240 }, { id: 'x3', type: 'XOR', x: 400, y: 150 });
      cfg.wires = [['a', 'x1.0'], ['b', 'x1.1'], ['c', 'x2.0'], ['d', 'x2.1'], ['x1', 'x3.0'], ['x2', 'x3.1'], ['x3', 'p']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- boolean-algebra
  const LAWS = {
    presets: [
      ['Absorption', 'A + A·B', 'A', 'If A is 1 the left side is 1; if A is 0, A·B is 0 too. B never matters. 2 gates → just a wire!'],
      ['Identity', 'A·1', 'A', 'AND with 1 or OR with 0 changes nothing, like <code>x * 1</code> or <code>x + 0</code>.'],
      ['Null', 'A + 1', '1', 'OR with 1 is always 1 and AND with 0 is always 0: the other input is "dominated".'],
      ['Idempotent', 'A·A', 'A', 'Repeating yourself changes nothing: A·A = A and A + A = A (unlike numbers, where a + a = 2a).'],
      ['Complement', "A + A'", '1', 'A thing OR its opposite is always true; A·A\' is always false. Like <code>x || !x</code>.'],
      ['Double NOT', "(A')'", 'A', 'Two inversions cancel: <code>!!x</code> (two NOT gates = a buffer).'],
      ['Commutative', 'A·B', 'B·A', 'Order doesn\'t matter for AND, OR, XOR.'],
      ['Associative', '(A+B)+C', 'A+(B+C)', 'Grouping doesn\'t matter, so you can build a 3-input OR from two 2-input ORs any way you like.'],
      ['Distributive', 'A·(B+C)', 'A·B + A·C', 'Factor out common terms, like algebra: 3 gates → 2 gates.'],
      ['Distributive 2 (surprise!)', 'A + B·C', '(A+B)·(A+C)', 'Unlike normal algebra, OR also distributes over AND. a + b·c ≠ (a+b)(a+c) for numbers, but it holds for bits.'],
      ['De Morgan', "(A·B)'", "A' + B'", 'Next lesson: break the bar, change the operator.'],
      ['Spot the fake ✗', 'A + B·C', '(A+B)·C', 'Not a law! Check the red rows: A = 1, C = 0 gives 1 on the left but 0 on the right.'],
    ],
  };
  function distCfg() {
    return {
      title: 'Distributive law in hardware: AB + AC uses 3 gates, A(B + C) uses 2',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 100 },
        { id: 'c', type: 'IN', label: 'C', x: 20, y: 200 },
        { id: 'g1', type: 'AND', x: 180, y: 0 },
        { id: 'g2', type: 'AND', x: 180, y: 60 },
        { id: 'g3', type: 'OR', x: 300, y: 20 },
        { id: 'g4', type: 'OR', x: 180, y: 150 },
        { id: 'g5', type: 'AND', x: 300, y: 130 },
        { id: 'y1', type: 'OUT', label: 'AB + AC', x: 420, y: 20 },
        { id: 'y2', type: 'OUT', label: 'A(B + C)', x: 420, y: 130 },
      ],
      wires: [
        ['a', 'g1.0', { mx: 90 }], ['b', 'g1.1', { mx: 110 }], ['a', 'g2.0', { mx: 90 }], ['c', 'g2.1', { mx: 130 }], ['g1', 'g3.0', { mx: 270 }], ['g2', 'g3.1', { mx: 270 }], ['g3', 'y1'],
        ['b', 'g4.0', { mx: 110 }], ['c', 'g4.1', { mx: 130 }], ['a', 'g5.0', { mx: 90 }], ['g4', 'g5.1', { mx: 270 }], ['g5', 'y2'],
      ],
    };
  }
  function simplifyEx(sol) {
    const cfg = {
      build: { palette: ['AND', 'OR', 'NOT'], best: 2, max: 2 },
      target: ({ A, B, C }) => ({ Y: (A | B) & (A | C) }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 60 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 170 },
        { id: 'c', type: 'IN', label: 'C', x: 40, y: 270 },
        { id: 't', type: 'TEXT', text: 'Goal: Y = (A + B)·(A + C), using at most 2 gates', x: 20, y: 30, bold: true },
        { id: 'y', type: 'OUT', label: 'Y', x: 660, y: 120 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'g1', type: 'AND', x: 240, y: 180 }, { id: 'g2', type: 'OR', x: 420, y: 120 });
      cfg.wires = [['b', 'g1.0'], ['c', 'g1.1'], ['a', 'g2.0'], ['g1', 'g2.1'], ['g2', 'y']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- de-morgan
  function dm1Cfg() {
    return {
      title: 'De Morgan #1: NOT(A AND B) = (NOT A) OR (NOT B)',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 140 },
        { id: 'g1', type: 'AND', x: 180, y: 0 },
        { id: 'n1', type: 'NOT', x: 300, y: 0 },
        { id: 'na', type: 'NOT', x: 180, y: 80, label: 'NOT A' },
        { id: 'nb', type: 'NOT', x: 180, y: 140, label: 'NOT B' },
        { id: 'g2', type: 'OR', x: 300, y: 110 },
        { id: 'x', type: 'OUT', label: 'NOT(A·B)', x: 420, y: 0 },
        { id: 'y', type: 'OUT', label: 'Ā + B̄', x: 420, y: 110 },
      ],
      wires: [['a', 'g1.0', { mx: 100 }], ['b', 'g1.1', { mx: 120 }], ['g1', 'n1'], ['n1', 'x'], ['a', 'na', { mx: 100 }], ['b', 'nb'], ['na', 'g2.0', { mx: 270 }], ['nb', 'g2.1', { mx: 270 }], ['g2', 'y']],
    };
  }
  function dm2Cfg() {
    return {
      title: 'De Morgan #2: NOT(A OR B) = (NOT A) AND (NOT B)',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 140 },
        { id: 'g1', type: 'OR', x: 180, y: 0 },
        { id: 'n1', type: 'NOT', x: 300, y: 0 },
        { id: 'na', type: 'NOT', x: 180, y: 80, label: 'NOT A' },
        { id: 'nb', type: 'NOT', x: 180, y: 140, label: 'NOT B' },
        { id: 'g2', type: 'AND', x: 300, y: 110 },
        { id: 'x', type: 'OUT', label: 'NOT(A+B)', x: 420, y: 0 },
        { id: 'y', type: 'OUT', label: 'Ā·B̄', x: 420, y: 110 },
      ],
      wires: [['a', 'g1.0', { mx: 100 }], ['b', 'g1.1', { mx: 120 }], ['g1', 'n1'], ['n1', 'x'], ['a', 'na', { mx: 100 }], ['b', 'nb'], ['na', 'g2.0', { mx: 270 }], ['nb', 'g2.1', { mx: 270 }], ['g2', 'y']],
    };
  }
  const REFACTORS = {
    presets: [
      ['!(a && b)  →  !a || !b', '!(a && b)', '!a || !b', '✅ De Morgan #1. Safe refactor.'],
      ['!(a && b)  →  !a && !b ?', '!(a && b)', '!a && !b', '❌ The classic bug: the NOT got pushed in but the operator wasn\'t flipped.'],
      ['!(a || b)  →  !a && !b', '!(a || b)', '!a && !b', '✅ De Morgan #2. "Neither a nor b".'],
      ['!(a || !b)  →  !a && b', '!(a || !b)', '!a && b', '✅ The inner NOT cancels: !!b = b.'],
      ['3 terms', '!(a && b && c)', '!a || !b || !c', '✅ Works for any number of inputs: flip every operator, invert every term.'],
      ['!(a && b) || c  →  ?', '!(a && b) || c', '!a || !b || c', '✅ Only the bracket under the NOT changes.'],
    ],
  };
  function orFromAndEx(sol) {
    const cfg = {
      build: { palette: ['AND', 'NOT'], best: 4 },
      target: ({ A, B }) => ({ Y: A | B }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 80 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 240 },
        { id: 'y', type: 'OUT', label: 'Y', x: 660, y: 150 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'na', type: 'NOT', x: 180, y: 80 }, { id: 'nb', type: 'NOT', x: 180, y: 240 }, { id: 'g', type: 'AND', x: 340, y: 150 }, { id: 'n', type: 'NOT', x: 480, y: 150 });
      cfg.wires = [['a', 'na'], ['b', 'nb'], ['na', 'g.0'], ['nb', 'g.1'], ['g', 'n'], ['n', 'y']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- nand-universal
  function nandBasicsCfg() {
    return {
      title: 'NOT and AND made only of NAND',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 140 },
        { id: 'n0', type: 'NAND', x: 180, y: 0, label: 'NAND as NOT' },
        { id: 'n1', type: 'NAND', x: 180, y: 130 },
        { id: 'n2', type: 'NAND', x: 320, y: 130, label: 'NAND as NOT' },
        { id: 'y0', type: 'OUT', label: 'NOT A', x: 320, y: 0 },
        { id: 'y1', type: 'OUT', label: 'A AND B', x: 460, y: 130 },
      ],
      wires: [['a', 'n0.0', { mx: 100 }], ['a', 'n0.1', { mx: 100 }], ['n0', 'y0'], ['a', 'n1.0', { mx: 100 }], ['b', 'n1.1'], ['n1', 'n2.0'], ['n1', 'n2.1'], ['n2', 'y1']],
    };
  }
  function nandXorCfg() {
    return {
      title: 'XOR from 4 NAND gates',
      intro: 'Turn on 🐢 Slow-mo, then click A and B. Each step lights up one more layer of gates.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 120 },
        { id: 'n1', type: 'NAND', x: 160, y: 60, label: 'n1' },
        { id: 'n2', type: 'NAND', x: 300, y: 10, label: 'n2' },
        { id: 'n3', type: 'NAND', x: 300, y: 110, label: 'n3' },
        { id: 'n4', type: 'NAND', x: 440, y: 60, label: 'n4' },
        { id: 'y', type: 'OUT', label: 'A XOR B', x: 580, y: 60 },
      ],
      wires: [['a', 'n1.0', { mx: 100 }], ['b', 'n1.1', { mx: 120 }], ['a', 'n2.0'], ['n1', 'n2.1', { mx: 260 }], ['n1', 'n3.0', { mx: 260 }], ['b', 'n3.1'], ['n2', 'n4.0', { mx: 400 }], ['n3', 'n4.1', { mx: 400 }], ['n4', 'y']],
    };
  }
  function nandOrEx(sol) {
    const cfg = {
      build: { palette: ['NAND'], best: 3 },
      target: ({ A, B }) => ({ Y: A | B }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 80 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 240 },
        { id: 'y', type: 'OUT', label: 'Y', x: 660, y: 150 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'n1', type: 'NAND', x: 200, y: 80 }, { id: 'n2', type: 'NAND', x: 200, y: 240 }, { id: 'n3', type: 'NAND', x: 400, y: 150 });
      cfg.wires = [['a', 'n1.0'], ['a', 'n1.1'], ['b', 'n2.0'], ['b', 'n2.1'], ['n1', 'n3.0'], ['n2', 'n3.1'], ['n3', 'y']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- truth-table-to-circuit
  function sopWidget(root) {
    root.innerHTML = `<div class="row" style="align-items:flex-start">
  <div class="card"><h4>① Click the Y column to set your truth table</h4><table class="tt" id="tt"></table>
    <div class="row" style="margin-top:6px;gap:4px"><span class="muted">Presets:</span><button data-p="23">majority</button><button data-p="105">odd parity</button><button data-p="3">A·B</button><button data-p="0">all 0</button></div></div>
  <div class="card" style="flex:1;min-width:330px"><h4>② Sum of products</h4><div id="mt" class="mono" style="font-size:13px"></div>
    <div style="margin-top:8px"><b>SOP:</b> <span id="sop" class="mono"></span></div>
    <div class="muted" id="cnt"></div>
    <div style="margin-top:8px"><b>Simplified:</b> <span id="min" class="mono"></span></div><div class="muted" id="cnt2"></div>
    <div style="margin-top:8px"><b>Karnaugh map</b> <span class="muted">(neighbours differ in one bit; adjacent 1s can merge)</span><table class="tt" id="km" style="margin-top:4px"></table></div></div></div>
<div class="card"><h4>③ The generated circuit (flip the switches to test it)</h4><div id="c"></div></div>`;
    const $ = (s) => root.querySelector(s);
    let Y = [0, 0, 0, 1, 0, 1, 1, 1]; // majority; row index = A*4 + B*2 + C
    const V = ['A', 'B', 'C'];
    const lit = (v, bit) => (bit ? v : v + '̄');
    const term = (i) => V.map((v, j) => lit(v, (i >> (2 - j)) & 1)).join('·');
    function minimize() { // prime implicants by brute force over the 27 cubes, then smallest cover
      const ones = Y.map((y, i) => (y ? i : -1)).filter((i) => i >= 0);
      if (!ones.length) return '0';
      if (ones.length === 8) return '1';
      const cubes = [];
      for (let c = 0; c < 27; c++) {
        const d = [Math.floor(c / 9), Math.floor(c / 3) % 3, c % 3]; // 0,1 or 2 = don't care
        const cov = [...Array(8).keys()].filter((i) => d.every((x, j) => x === 2 || x === ((i >> (2 - j)) & 1)));
        if (cov.every((i) => Y[i])) cubes.push({ d, cov });
      }
      const primes = cubes.filter((a) => !cubes.some((b) => b !== a && b.cov.length > a.cov.length && a.cov.every((i) => b.cov.includes(i))));
      let best = null;
      for (let m = 1; m < 1 << primes.length; m++) {
        const pick = primes.filter((_, k) => (m >> k) & 1);
        if (!ones.every((i) => pick.some((p) => p.cov.includes(i)))) continue;
        const lits = pick.reduce((s, p) => s + p.d.filter((x) => x !== 2).length, 0);
        if (!best || pick.length < best.pick.length || (pick.length === best.pick.length && lits < best.lits)) best = { pick, lits };
      }
      return best.pick.map((p) => p.d.map((x, j) => (x === 2 ? '' : lit(V[j], x))).filter(Boolean).join('·')).join(' + ');
    }
    function circuit(ones) {
      const parts = [
        { id: 'A', type: 'IN', label: 'A', x: 20, y: 0 }, { id: 'B', type: 'IN', label: 'B', x: 20, y: 80 }, { id: 'C', type: 'IN', label: 'C', x: 20, y: 160 },
        { id: 'nA', type: 'NOT', x: 100, y: 50, showType: false }, { id: 'nB', type: 'NOT', x: 100, y: 130, showType: false }, { id: 'nC', type: 'NOT', x: 100, y: 210, showType: false },
        { id: 'Y', type: 'OUT', label: 'Y', x: 0, y: 0 },
      ];
      const wires = [['A', 'nA', { mx: 80 }], ['B', 'nB', { mx: 80 }], ['C', 'nC', { mx: 80 }]];
      const rail = { A: 184, nA: 198, B: 212, nB: 226, C: 240, nC: 254 };
      const k = ones.length, y = parts[6];
      if (!k) { parts.push({ id: 'z', type: 'CONST', value: 0, x: 320, y: 60 }); wires.push(['z', 'Y']); y.x = 440; y.y = 60; }
      ones.forEach((i, j) => {
        parts.push({ id: 'm' + j, type: 'AND', n: 3, x: 300, y: 80 * j, label: 'm' + i });
        V.forEach((v, t) => { const src = (i >> (2 - t)) & 1 ? v : 'n' + v; wires.push([src, 'm' + j + '.' + t, { mx: rail[src] }]); });
      });
      if (k === 1) { wires.push(['m0', 'Y']); y.x = 440; y.y = 10; }
      if (k > 1) {
        const oy = Math.round(((80 * k - 20) / 2 - 10 * k) / 10) * 10;
        const ow = Math.max(60, 10 * k + 40);
        parts.push({ id: 'or', type: 'OR', n: k, x: 450, y: oy });
        ones.forEach((_, j) => wires.push(['m' + j, 'or.' + j, { mx: 372 + 9 * j }]));
        wires.push(['or', 'Y']); y.x = 450 + ow + 60; y.y = oy + 10 * k - 20;
      }
      return { parts, wires, scale: 1, help: 'Click A, B, C. The three NOT gates make the inverted rails Ā, B̄, C̄; each AND (labelled m + row number) fires on exactly one row.' };
    }
    function draw() {
      $('#tt').innerHTML = '<tr><th>row</th><th>A</th><th>B</th><th>C</th><th>Y</th><th>minterm</th></tr>' + Y.map((y, i) => `<tr><td class="muted">${i}</td><td>${i >> 2}</td><td>${(i >> 1) & 1}</td><td>${i & 1}</td>
        <td data-i="${i}" style="cursor:pointer;font-weight:800;${y ? 'background:#dcfce7;color:#15803d' : 'color:#94a3b8'}">${y}</td><td style="font-size:12px">${y ? term(i) : ''}</td></tr>`).join('');
      const ones = Y.map((v, i) => (v ? i : -1)).filter((i) => i >= 0);
      $('#mt').innerHTML = ones.length ? ones.map((i) => `row ${i} (A=${i >> 2} B=${(i >> 1) & 1} C=${i & 1}) → <b>${term(i)}</b>`).join('<br>') : '<span class="muted">No rows are 1, so Y is always 0.</span>';
      $('#sop').textContent = 'Y = ' + (ones.length ? ones.map(term).join(' + ') : '0');
      const nots = new Set(); ones.forEach((i) => V.forEach((v, t) => { if (!((i >> (2 - t)) & 1)) nots.add(v); }));
      $('#cnt').textContent = ones.length ? `Literal build: ${nots.size} NOT + ${ones.length} three-input AND${ones.length > 1 ? ' + 1 OR' : ''} = ${nots.size + ones.length + (ones.length > 1 ? 1 : 0)} gates` : '';
      const mn = minimize();
      $('#min').textContent = 'Y = ' + mn;
      $('#cnt2').textContent = mn === ones.map(term).join(' + ') ? 'Already minimal.' : 'Same truth table, fewer and smaller terms (found by merging neighbouring 1s).';
      const gray = [0, 1, 3, 2];
      $('#km').innerHTML = `<tr><th>A \\ BC</th>${gray.map((g) => `<th>${g >> 1}${g & 1}</th>`).join('')}</tr>` + [0, 1].map((a) => `<tr><th>${a}</th>${gray.map((g) => { const v = Y[a * 4 + g]; return `<td style="${v ? 'background:#dcfce7;color:#15803d;font-weight:800' : 'color:#94a3b8'}">${v}</td>`; }).join('')}</tr>`).join('');
      Circ.mount($('#c'), circuit(ones));
    }
    $('#tt').onclick = (e) => { const td = e.target.closest('td[data-i]'); if (td) { Y[+td.dataset.i] ^= 1; draw(); } };
    root.querySelector('.card .row').onclick = (e) => { const b = e.target.closest('button[data-p]'); if (b) { const p = +b.dataset.p; Y = [...Array(8)].map((_, i) => (p >> (7 - i)) & 1); draw(); } };
    draw();
  }
  function mintermCfg() {
    return {
      title: 'One minterm = a detector for one row (here: row 101)',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 80 },
        { id: 'c', type: 'IN', label: 'C', x: 20, y: 160 },
        { id: 'nb', type: 'NOT', x: 120, y: 80 },
        { id: 'g', type: 'AND', n: 3, x: 270, y: 80, label: 'A·B̄·C' },
        { id: 'y', type: 'OUT', label: 'row 101?', x: 400, y: 90 },
      ],
      wires: [['a', 'g.0', { mx: 210 }], ['b', 'nb'], ['nb', 'g.1', { mx: 225 }], ['c', 'g.2', { mx: 240 }], ['g', 'y']],
    };
  }
  function majorityEx(sol) {
    const cfg = {
      build: { palette: ['AND', 'OR', 'NOT', 'AND:3'], best: 4 },
      target: ({ A, B, C }) => ({ M: (A & B) | (B & C) | (A & C) }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 40 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 150 },
        { id: 'c', type: 'IN', label: 'C', x: 40, y: 280 },
        { id: 'y', type: 'OUT', label: 'M', x: 660, y: 120 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'g1', type: 'AND', x: 200, y: 50 }, { id: 'g2', type: 'OR', x: 200, y: 160 }, { id: 'g3', type: 'AND', x: 360, y: 230 }, { id: 'g4', type: 'OR', x: 500, y: 120 });
      cfg.wires = [['a', 'g1.0'], ['b', 'g1.1'], ['b', 'g2.0'], ['a', 'g2.1'], ['g2', 'g3.0'], ['c', 'g3.1'], ['g1', 'g4.0'], ['g3', 'g4.1'], ['g4', 'y']];
    }
    return cfg;
  }

  // ---------------------------------------------------------------- gate-delay
  function chainCfg() {
    const parts = [
      { id: 'a', type: 'IN', label: 'A', x: 20, y: 60 },
      { id: 'f', type: 'NOT', x: 140, y: 0, label: 'NOT' },
      { id: 'y1', type: 'OUT', label: 'Y1 (1 gate)', x: 680, y: 0 },
      { id: 'y5', type: 'OUT', label: 'Y5 (5 gates)', x: 680, y: 60 },
    ];
    const wires = [['a', 'f', { mx: 100 }], ['f', 'y1']];
    for (let k = 0; k < 5; k++) {
      parts.push({ id: 's' + k, type: 'NOT', x: 140 + 100 * k, y: 60, label: 'NOT ' + (k + 1) });
      wires.push([k ? 's' + (k - 1) : 'a', 's' + k]);
    }
    wires.push(['s4', 'y5']);
    return { title: 'Short path vs long path', intro: 'Turn on <b>🐢 Slow-mo</b>, then click <b>A</b>. Y1 flips almost at once; Y5 has to wait for the change to ripple through five gates.', parts, wires };
  }
  function glitchWidget(root) {
    root.innerHTML = '<div id="c"></div><div class="card" id="g" style="margin-top:8px"></div>';
    let glitches = 0, last = 0;
    const api = Circ.mount(root.querySelector('#c'), {
      title: 'Y = A AND (NOT A): "always 0"… or is it?',
      intro: 'Logically Y can never be 1. Turn on <b>🐢 Slow-mo</b> and click <b>A</b> from 0 to 1.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 30 },
        { id: 'n', type: 'NOT', x: 140, y: 80 },
        { id: 'g', type: 'AND', x: 300, y: 40 },
        { id: 'y', type: 'OUT', label: 'Y', x: 420, y: 40 },
      ],
      wires: [['a', 'g.0'], ['a', 'n', { mx: 100 }], ['n', 'g.1', { mx: 250 }], ['g', 'y']],
    });
    const box = root.querySelector('#g');
    const show = (flash) => { box.innerHTML = `<b>Glitch detector:</b> Y has wrongly been 1 <b style="color:${glitches ? '#dc2626' : '#15803d'}">${glitches}</b> time${glitches === 1 ? '' : 's'}. ${flash ? '<b style="color:#dc2626">⚡ GLITCH right now!</b>' : '<span class="muted">(only visible in slow-mo; in real chips it lasts picoseconds)</span>'}`; };
    setInterval(() => { const v = api.get('Y'); if (v && !last) glitches++; if (v !== last) show(v); last = v; }, 25);
    show(0);
  }
  function ringWidget(root) {
    root.innerHTML = '<div id="c"></div><div class="card" style="margin-top:8px"><h4>Timing diagram: the same circuit, tick by tick (EN switched on at tick 1)</h4><svg id="td" viewBox="0 0 760 150" width="760" height="150"></svg><div class="muted">Each column is one gate delay. Q flips every 3 ticks, so one full cycle (high + low) = 6 gate delays.</div></div>';
    Circ.mount(root.querySelector('#c'), {
      title: 'Ring oscillator: 3 inverting gates chasing their own tail',
      intro: 'EN = 0: the NAND is forced to 1, so the ring is stable. Click <b>EN</b> → 1, then switch on <b>🐢 Slow-mo</b> and click EN off and on again to watch it run.',
      parts: [
        { id: 'en', type: 'IN', label: 'EN', x: 20, y: 20 },
        { id: 'g1', type: 'NAND', x: 140, y: 30, label: 'NAND' },
        { id: 'g2', type: 'NOT', x: 260, y: 30 },
        { id: 'g3', type: 'NOT', x: 380, y: 30 },
        { id: 'q', type: 'OUT', label: 'Q', x: 540, y: 30 },
      ],
      wires: [['en', 'g1.0'], ['g3', 'g1.1', { my: 110 }], ['g1', 'g2'], ['g2', 'g3'], ['g3', 'q']],
    });
    const T = 30, rows = { EN: [], NAND: [], 'NOT 1': [], 'Q (NOT 2)': [] };
    let en = 0, g1 = 1, g2 = 0, g3 = 1;
    for (let t = 0; t < T; t++) {
      const ne = t >= 1 ? 1 : 0, n1 = 1 - (en & g3), n2 = 1 - g1, n3 = 1 - g2;
      if (t > 0) { en = ne; g1 = n1; g2 = n2; g3 = n3; }
      rows.EN.push(en); rows.NAND.push(g1); rows['NOT 1'].push(g2); rows['Q (NOT 2)'].push(g3);
    }
    let s = '';
    Object.entries(rows).forEach(([name, v], r) => {
      const y0 = 10 + r * 32, hi = y0 + 4, lo = y0 + 24;
      s += `<text x="4" y="${y0 + 19}" font-size="12" font-weight="700" fill="#334155">${name}</text><path d="M80 ${lo} H${80 + 22 * T}" stroke="#e2e5ee"/>`;
      let d = '';
      v.forEach((b, i) => { const x = 80 + i * 22; d += (i ? ` V${b ? hi : lo}` : `M${x} ${b ? hi : lo}`) + ` H${x + 22}`; });
      s += `<path d="${d}" fill="none" stroke="${r === 3 ? '#dc2626' : '#16a34a'}" stroke-width="2"/>`;
    });
    for (let i = 0; i < T; i += 3) s += `<text x="${80 + i * 22 + 11}" y="146" text-anchor="middle" font-size="9.5" fill="#94a3b8">${i}</text>`;
    root.querySelector('#td').innerHTML = s;
  }
  function fastAndWidget(root, sol) {
    root.innerHTML = '<style>#c .circ-bar .chk{display:none}</style><div id="c"></div><div class="row" style="margin-top:6px"><button class="chk" id="chk">✔ Check (logic + speed)</button><span class="muted">Speed rule: longest path from any input to Y must be ≤ 2 gates.</span></div><div class="circ-result" id="sp"></div>';
    const cfg = {
      build: { palette: ['AND'], best: 3 },
      target: ({ A, B, C, D }) => ({ Y: A & B & C & D }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 20 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 110 },
        { id: 'c', type: 'IN', label: 'C', x: 40, y: 200 },
        { id: 'd', type: 'IN', label: 'D', x: 40, y: 290 },
        { id: 'y', type: 'OUT', label: 'Y', x: 660, y: 120 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'g1', type: 'AND', x: 200, y: 30 }, { id: 'g2', type: 'AND', x: 200, y: 210 }, { id: 'g3', type: 'AND', x: 400, y: 120 });
      cfg.wires = [['a', 'g1.0'], ['b', 'g1.1'], ['c', 'g2.0'], ['d', 'g2.1'], ['g1', 'g3.0'], ['g2', 'g3.1'], ['g3', 'y']];
    }
    const api = Circ.mount(root.querySelector('#c'), cfg);
    function depth() {
      const memo = {}, byId = {};
      api.parts.forEach((p) => { byId[p.id] = p; });
      const dep = (id, seen) => {
        if (memo[id] !== undefined) return memo[id];
        if (seen.has(id)) return 99;
        seen.add(id);
        const p = byId[id], drivers = api.wires.filter((w) => w.to.id === id).map((w) => w.from.id);
        const d = (p.type === 'IN' ? 0 : p.type === 'OUT' ? 0 : 1) + drivers.reduce((m, x) => Math.max(m, dep(x, seen)), 0);
        seen.delete(id);
        return (memo[id] = d);
      };
      return dep('y', new Set());
    }
    root.querySelector('#chk').onclick = () => {
      const ok = api.check();
      const d = depth(), box = root.querySelector('#sp');
      if (d <= 2 && ok) { box.className = 'circ-result ok'; box.textContent = `✅ Fast enough: the longest path is ${d} gates. A chain would be 3.`; console.log('✅ depth ' + d); }
      else if (!ok) { box.className = 'circ-result bad'; box.textContent = `❌ Fix the logic first (see the table above). Longest path right now: ${d} gates.`; }
      else { box.className = 'circ-result bad'; box.textContent = `❌ Correct logic, but the longest path is ${d} gates. Rearrange so no signal passes through more than 2.`; }
    };
  }

  window.LESSONS.push(
    // =============================================================== not-and-or
    {
      id: 'not-and-or',
      section: 'Logic Gates',
      title: 'NOT, AND, OR',
      explain: `
<p>You've built these from switches. From now on they're <strong>components</strong>, with standard symbols:</p>
<table><tr><th>Gate</th><th>Output is 1 when…</th><th>Boolean notation</th><th>Code</th></tr>
<tr><td><strong>NOT</strong> (triangle + bubble)</td><td>the input is 0</td><td><code>Ā</code> or <code>A'</code> or <code>¬A</code></td><td><code>!a</code></td></tr>
<tr><td><strong>AND</strong> (D shape)</td><td><em>all</em> inputs are 1</td><td><code>A·B</code> or just <code>AB</code></td><td><code>a &amp;&amp; b</code></td></tr>
<tr><td><strong>OR</strong> (curved shield)</td><td><em>any</em> input is 1</td><td><code>A + B</code></td><td><code>a || b</code></td></tr></table>
<p>The notation borrows from arithmetic because it behaves similarly: AND is like multiplication (anything × 0 = 0) and OR is <em>almost</em> like addition (except 1 + 1 = 1, there's no "2"). Precedence also matches: <code>A + B·C</code> means <code>A + (B·C)</code>, just like <code>&amp;&amp;</code> binds tighter than <code>||</code> in JavaScript.</p>
<p>Gates can have more than 2 inputs: a 3-input AND is 1 only when all three are 1. Every input you add doubles the truth table (2<sup>n</sup> rows).</p>
<div class="tip">Logical vs bitwise: <code>a &amp;&amp; b</code> works on whole true/false values. <code>a &amp; b</code> on integers runs one AND gate per bit position, all at once. That's literally a row of 32 or 64 AND gates inside the CPU (third demo).</div>
<div class="world">
<ul>
<li><strong>TTL chips</strong>: you can buy these gates as 14-pin chips. The <strong>7404</strong> holds six NOT gates, the <strong>7408</strong> four 2-input ANDs, the <strong>7432</strong> four 2-input ORs. Hobbyists still build whole CPUs from them on breadboards (Ben Eater's 8-bit breadboard computer is a famous one).</li>
<li><strong>Your if-statements</strong>: a compiler turns <code>if (a &amp;&amp; b)</code> into compare-and-branch instructions, and bitwise <code>x &amp; mask</code> into a single CPU <code>AND</code> instruction, executed by a row of AND gates in the ALU.</li>
</ul></div>`,
      examples: [
        { title: 'NOT, AND, OR with live truth table', code: C(basicCfg),
          explain: `<details><summary>Try this</summary><p>Click <b>A</b> and <b>B</b>, or click rows of the truth table on the right. Check the AND column has a single 1 (only row A=1, B=1) and the OR column has a single 0 (only row A=0, B=0). That's the easiest way to remember them: <b>AND is picky, OR is generous</b>.</p></details>` },
        { title: 'An if-statement as a circuit', code: C(ifCfg),
          explain: `<details><summary>Try this</summary><p>Set <b>admin</b> = 1 but leave <b>login</b> = 0: the OR output is lit, but the AND blocks it, so <b>canEdit</b> stays off. The truth table (8 rows for 3 inputs) is the exhaustive test suite for your condition: 3 of the 8 rows are 1.</p></details>` },
        { title: 'Bitwise operators = rows of gates', code: W(bitwiseWidget) },
      ],
      quiz: [
        { q: 'A 3-input AND gate has inputs 1, 1, 0. Output?', options: ['0', '1'], answer: 0, why: 'AND needs all inputs to be 1.' },
        { q: 'What does <code>A + B·C</code> mean?', options: ['(A + B)·C', 'A + (B·C)', 'A·B + C', 'It is ambiguous'], answer: 1, why: 'AND (·) binds tighter than OR (+), like × before + in arithmetic and && before || in code.' },
        { q: 'In Boolean algebra, 1 + 1 = ?', options: ['0', '1', '2', '10'], answer: 1, why: 'OR: if any input is 1 the output is 1. There is no carry here (that comes with adders).' },
        { q: '<code>0b1100 &amp; 0b1010</code> = ?', options: ['0b1110', '0b1000', '0b0110', '0b0100'], answer: 1, why: 'Column by column AND: only the top bit is 1 in both.' },
      ],
      exercise: {
        task: `<p><b>Seat-belt chime.</b> The warning <b>W</b> should sound when the engine is on (<b>E</b>) and the driver (<b>D</b>) and passenger (<b>P</b>) aren't <em>both</em> buckled. Using AND, OR and NOT, build it in the board below, then click <b>✔ Check</b>. Can you do it in 3 gates?</p>`,
        hint: 'First compute "both buckled" = D AND P. Invert it to get "not both buckled". Then AND with E.',
        starter: C(beltEx, false),
        solution: C(beltEx, true),
      },
    },
    // =============================================================== nand-nor
    {
      id: 'nand-nor',
      section: 'Logic Gates',
      title: 'NAND & NOR',
      explain: `
<p><strong>NAND</strong> = NOT AND: output is 0 only when all inputs are 1. <strong>NOR</strong> = NOT OR: output is 1 only when all inputs are 0. The symbols are AND and OR with the inversion bubble ○ on the output.</p>
<table><tr><th>A</th><th>B</th><th>AND</th><th>NAND</th><th>OR</th><th>NOR</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>1</td><td>0</td><td>1</td></tr><tr><td>0</td><td>1</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
<tr><td>1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td></tr><tr><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td><td>0</td></tr></table>
<h3>Why the "inverted" gates are the natural ones</h3>
<p>Remember the CMOS inverter: a high input turns the nMOS on and pulls the output <em>low</em>. CMOS gates invert by nature. Extend the inverter to two inputs and you get NAND with just <strong>4 transistors</strong>:</p>
<ul>
<li>Pull-down: two nMOS in <strong>series</strong> → OUT goes to 0 only if A AND B are 1.</li>
<li>Pull-up: two pMOS in <strong>parallel</strong> → OUT goes to 1 if A OR B is 0.</li>
</ul>
<p>A plain AND has no direct CMOS form. It's built as NAND followed by NOT: 4 + 2 = <strong>6 transistors</strong>, and it's slower because the signal passes through two stages. So chip designers think in NANDs and NORs. NAND is usually preferred over NOR because NOR puts the pMOS transistors in series, and pMOS conduct less well than nMOS, so a series pair of them is slow.</p>
<div class="tip">Reading trick: a bubble anywhere means "invert here". A NAND is literally an AND symbol followed by a NOT bubble.</div>
<div class="world">
<ul>
<li><strong>7400</strong>: the very first chip of the famous 7400 TTL family (Texas Instruments, 1960s) is a quad 2-input NAND: four NAND gates in one 14-pin package. The <strong>7402</strong> is the quad NOR.</li>
<li><strong>NAND flash</strong> (SSDs, phones, USB sticks) is named after this gate. Its memory cells are chained in series like the transistors in a NAND's pull-down network, which packs them densely. NOR flash wires cells in parallel like a NOR, which is faster to read but less dense. NAND flash was invented by Fujio Masuoka's team at Toshiba in the 1980s.</li>
<li><strong>Apollo Guidance Computer</strong>, which flew astronauts to the Moon, was built almost entirely from one kind of chip: a dual 3-input NOR gate. The Block II computer used about 2,800 of them.</li>
</ul></div>`,
      examples: [
        { title: 'AND vs NAND, OR vs NOR', code: C(fourCfg) },
        { title: 'Inside a CMOS NAND and NOR: 4 transistors each', code: W(cmosNandWidget),
          explain: `<details><summary>Try this</summary>
<ol><li>In <b>CMOS NAND</b>, set A = 1 and B = 1: both nMOS (blue) conduct in series and pull OUT to 0. Flip either input to 0 and its pMOS (green) opens a path from VDD. One pMOS is enough because they're in parallel.</li>
<li>Switch to <b>CMOS NOR</b>: the networks swap. Now the pMOS are in series (both inputs must be 0 to pull up) and the nMOS in parallel (any 1 pulls down).</li>
<li>For every input combination, check that exactly one network conducts, never both and never neither. That's what makes CMOS outputs always well defined and idle power near zero.</li></ol></details>` },
        { title: 'AND costs more than NAND', code: C(andFromNandCfg) },
      ],
      quiz: [
        { q: 'NAND(1, 1) = ?', options: ['0', '1'], answer: 0, why: 'AND(1,1) = 1, inverted = 0. It is the only input that gives 0.' },
        { q: 'NOR(0, 0) = ?', options: ['0', '1'], answer: 1, why: 'OR(0,0) = 0, inverted = 1. It is the only input that gives 1.' },
        { q: 'How many transistors does a CMOS 2-input AND gate need?', options: ['2', '4', '6', '8'], answer: 2, why: 'A 4-transistor NAND plus a 2-transistor inverter.' },
        { q: 'In a CMOS NAND, how are the nMOS transistors connected?', options: ['In parallel', 'In series', 'Not used', 'Crossed'], answer: 1, why: 'Series: the output is pulled down only if A AND B are both 1.' },
        { q: 'What was the Apollo Guidance Computer\'s logic built from?', options: ['Vacuum tubes', '3-input NOR gate chips', 'A single microprocessor', 'Relays'], answer: 1, why: 'Thousands of identical dual 3-input NOR chips. One gate type was enough (more on that in "NAND is universal").' },
      ],
      exercise: {
        task: `<p><b>Apollo challenge.</b> The Apollo engineers had only NOR gates. Using only NOR, build <b>Y = A AND B</b> in the board below, then click <b>✔ Check</b>.</p>`,
        hint: 'NOR(X, X) = NOT X. And NOR(NOT A, NOT B) = NOT(NOT A OR NOT B), which is 1 only when A and B are both 1.',
        starter: C(norAndEx, false),
        solution: C(norAndEx, true),
      },
    },
    // =============================================================== xor-xnor
    {
      id: 'xor-xnor',
      section: 'Logic Gates',
      title: 'XOR & XNOR',
      explain: `
<p><strong>XOR</strong> (exclusive OR, written <code>A ⊕ B</code>, in code <code>a ^ b</code>) is 1 when the inputs are <strong>different</strong>. It's "OR, but not both". <strong>XNOR</strong> is its inverse: 1 when the inputs are <strong>the same</strong>, an equality detector.</p>
<table><tr><th>A</th><th>B</th><th>A ⊕ B</th><th>XNOR</th></tr><tr><td>0</td><td>0</td><td>0</td><td>1</td></tr><tr><td>0</td><td>1</td><td>1</td><td>0</td></tr><tr><td>1</td><td>0</td><td>1</td><td>0</td></tr><tr><td>1</td><td>1</td><td>0</td><td>1</td></tr></table>
<p>Three ways to think about XOR, all useful later:</p>
<ul>
<li><strong>"Different?" detector</strong>: XNOR each pair of bits and AND the results, and you've built an equality comparator <code>a == b</code>.</li>
<li><strong>Controlled inverter</strong>: <code>A ⊕ 0 = A</code> and <code>A ⊕ 1 = NOT A</code>. One input decides whether the other passes through or gets flipped. Adders use this trick for subtraction.</li>
<li><strong>Parity / odd counter</strong>: chain XORs and the output is 1 if an <em>odd</em> number of inputs are 1. Also, <code>x ⊕ x = 0</code>, so XORing the same value twice undoes it.</li>
</ul>
<p>XOR is also the "sum" bit of binary addition: 1 + 1 = 10, and the low digit is 0 = 1 ⊕ 1. You'll see it again when you build an adder.</p>
<div class="world">
<ul>
<li><strong>Hallway light</strong>: a switch at the bottom and the top of the stairs, where either one toggles the light. The light is A ⊕ B. (Electricians call them "two-way" or "3-way" switches.)</li>
<li><strong>RAID 5</strong>: disk arrays store <code>D1 ⊕ D2 ⊕ D3</code> as parity. If any one disk dies, XOR the survivors to rebuild it (demo 3).</li>
<li><strong>Cryptography</strong>: the one-time pad is <code>message ⊕ key</code>; XOR with the same key again decrypts. Stream ciphers like ChaCha20 (used in TLS) and AES's CTR mode encrypt by XORing data with a pseudo-random keystream.</li>
<li><strong>7486</strong>: the TTL quad 2-input XOR chip.</li>
</ul></div>`,
      examples: [
        { title: 'XOR and XNOR', code: C(xorCfg) },
        { title: 'Controlled inverter: XOR every bit with INVERT', code: C(invCfg),
          explain: `<details><summary>Try this</summary><p>With <b>INVERT</b> = 0, OUT copies DATA (5 → 5). Click INVERT: every bit flips (0101 → 1010, so 5 → 10). Change DATA with ▲▼ while INVERT is on: OUT is always 15 − DATA. That's bitwise NOT, which you'll use to build subtraction in the arithmetic section.</p></details>` },
        { title: 'RAID 5: survive a dead disk with XOR', code: W(raidWidget),
          explain: `<details><summary>Try this</summary><p>Click <b>💥 Fail this disk</b> on Disk 2. Its data ('i') is gone, but XORing Disk 1, Disk 3 and Parity gives back exactly 0x69 = 'i'. It works for <em>any</em> single disk, including the parity disk. Change a few data bits first, then fail a disk: it still works, because parity is recomputed on every write.</p></details>` },
      ],
      quiz: [
        { q: '1 ⊕ 1 = ?', options: ['0', '1', '2'], answer: 0, why: 'XOR is 1 only when the inputs differ.' },
        { q: 'You want a gate that outputs 1 when two bits are equal. Which?', options: ['XOR', 'XNOR', 'NAND', 'OR'], answer: 1, why: 'XNOR = NOT XOR = "same?".' },
        { q: 'What is <code>A ⊕ 1</code>?', options: ['A', 'NOT A', '1', '0'], answer: 1, why: 'XOR with 1 flips the bit. XOR with 0 leaves it alone: a controlled inverter.' },
        { q: 'Parity P = A ⊕ B ⊕ C ⊕ D. If A=1, B=1, C=1, D=0, then P = ?', options: ['0', '1'], answer: 1, why: 'Three 1s is an odd count, so P = 1.' },
        { q: 'RAID 5 has data 0x0F and 0xF0 with parity 0xFF. The 0x0F disk dies. How do you rebuild it?', options: ['0xF0 AND 0xFF', '0xF0 XOR 0xFF', '0xF0 OR 0xFF', 'Impossible'], answer: 1, why: '0xF0 ⊕ 0xFF = 0x0F. XOR the survivors.' },
      ],
      exercise: {
        task: `<p><b>Parity bit.</b> Memory and serial links add a parity bit so they can detect a single flipped bit. Using only XOR gates, build <b>P = 1 when an odd number of A, B, C, D are 1</b> in the board below, then click <b>✔ Check</b>.</p>`,
        hint: 'XOR is associative: A ⊕ B ⊕ C ⊕ D = (A ⊕ B) ⊕ (C ⊕ D). 3 gates.',
        starter: C(parityEx, false),
        solution: C(parityEx, true),
      },
    },
    // =============================================================== boolean-algebra
    {
      id: 'boolean-algebra',
      section: 'Logic Gates',
      title: 'Boolean algebra laws',
      explain: `
<p>Because gates are math, you can <strong>rewrite</strong> a circuit like an equation. If two expressions have identical truth tables, they're the same circuit logically, and you can build whichever is cheaper or faster. These are the rules (each has an AND form and an OR form):</p>
<table><tr><th>Law</th><th>AND form</th><th>OR form</th></tr>
<tr><td>Identity</td><td>A·1 = A</td><td>A + 0 = A</td></tr>
<tr><td>Null (domination)</td><td>A·0 = 0</td><td>A + 1 = 1</td></tr>
<tr><td>Idempotent</td><td>A·A = A</td><td>A + A = A</td></tr>
<tr><td>Complement</td><td>A·Ā = 0</td><td>A + Ā = 1</td></tr>
<tr><td>Double negation</td><td colspan="2">NOT(NOT A) = A</td></tr>
<tr><td>Commutative</td><td>A·B = B·A</td><td>A + B = B + A</td></tr>
<tr><td>Associative</td><td>(A·B)·C = A·(B·C)</td><td>(A + B) + C = A + (B + C)</td></tr>
<tr><td>Distributive</td><td>A·(B + C) = A·B + A·C</td><td>A + B·C = (A + B)·(A + C) ← not true for numbers!</td></tr>
<tr><td>Absorption</td><td>A·(A + B) = A</td><td>A + A·B = A</td></tr></table>
<p>Code analogy: <code>if (isAdmin || (isAdmin &amp;&amp; isOwner))</code> is just <code>if (isAdmin)</code>. That's absorption, and a linter that flags it is doing Boolean algebra.</p>
<div class="tip">You never need to <em>trust</em> a law: with n variables there are only 2<sup>n</sup> cases, so you can check every one. That's exactly what the equivalence checker below does.</div>
<div class="world">
<ul>
<li>George Boole published this algebra in 1854 as "laws of thought", with no electronics in mind. In 1937 Claude Shannon's master's thesis at MIT showed it describes relay switching circuits exactly, which is the founding idea of digital design.</li>
<li>Today <strong>logic synthesis</strong> tools do this automatically. You write <code>assign y = (a | b) &amp; (a | c);</code> in Verilog, and a tool like the open-source <a href="https://github.com/YosysHQ/yosys" target="_blank">Yosys</a> (with its ABC optimizer) or Synopsys Design Compiler rewrites it to the cheapest equivalent gates for the target chip.</li>
<li>Your JavaScript/C compiler does the same with conditions: optimizers simplify Boolean expressions and remove dead branches.</li>
</ul></div>`,
      examples: [
        { title: 'Equivalence checker: test any law yourself', code: W(exprWidget, LAWS, [exprLib]),
          explain: `<details><summary>Try this</summary>
<ol><li>Click through the law buttons. Every real law shows <b>✅ Equivalent</b>, and the gate-cost line shows how many gates each side would need.</li>
<li>Click <b>Spot the fake ✗</b>: two rows go red. A wrong "simplification" usually fails on only a few rows, which is why you check all of them.</li>
<li>Type your own: Left <code>A·B + A·B'</code>, Right <code>A</code>. Equivalent! (Factor out A: A·(B + B') = A·1 = A.)</li></ol></details>` },
        { title: 'Same truth table, fewer gates', code: C(distCfg),
          explain: `<details><summary>Try this</summary><p>Click through all 8 rows of the truth table: <b>AB + AC</b> and <b>A(B + C)</b> always match. The top circuit uses 3 gates, the bottom only 2, and the bottom also has one fewer wire from A. Across a chip with millions of gates, savings like this mean less area, less power and shorter delays.</p></details>` },
      ],
      quiz: [
        { q: 'Simplify <code>A + A·B</code>', options: ['A·B', 'A', 'B', 'A + B'], answer: 1, why: 'Absorption: if A = 1 it\'s 1; if A = 0, A·B = 0. B never matters.' },
        { q: 'Simplify <code>A·Ā</code>', options: ['A', '1', '0', 'Ā'], answer: 2, why: 'Complement: something AND its opposite is never true.' },
        { q: 'Which is TRUE in Boolean algebra but false for ordinary numbers?', options: ['A·B = B·A', 'A + B·C = (A + B)·(A + C)', 'A·1 = A', 'A + 0 = A'], answer: 1, why: 'OR distributes over AND only for bits. Try A=1: left = 1, right = 1·1 = 1.' },
        { q: 'Simplify <code>A·B + A·B̄</code>', options: ['A', 'B', 'A·B', '1'], answer: 0, why: 'Factor: A·(B + B̄) = A·1 = A.' },
      ],
      exercise: {
        task: `<p><b>Gate budget.</b> Build <b>Y = (A + B)·(A + C)</b> in the board below, but you may use <b>at most 2 gates</b> (built literally it needs 3). Click <b>✔ Check</b> when done. It also enforces the limit.</p>`,
        hint: 'Use the second distributive law backwards: (A + B)·(A + C) = A + B·C.',
        starter: C(simplifyEx, false),
        solution: C(simplifyEx, true),
      },
    },
    // =============================================================== de-morgan
    {
      id: 'de-morgan',
      section: 'Logic Gates',
      title: "De Morgan's laws",
      explain: `
<p>Two laws tell you how a NOT passes through AND and OR:</p>
<pre><code>NOT(A AND B) = (NOT A) OR  (NOT B)        !(a &amp;&amp; b) === !a || !b
NOT(A OR  B) = (NOT A) AND (NOT B)        !(a || b) === !a &amp;&amp; !b</code></pre>
<p>Mnemonic: <strong>"break the bar, change the sign"</strong>. Push the NOT onto each input, and AND ↔ OR swap.</p>
<p>In plain English, "not (rich and famous)" means "not rich, or not famous (or both)". And "not (rain or snow)" means "no rain and no snow".</p>
<h3>Bubble pushing</h3>
<p>In circuits this means a <strong>NAND is the same as an OR with inverted inputs</strong>, and a NOR is an AND with inverted inputs. Designers slide bubbles from outputs to inputs to turn any mix of gates into all-NAND or all-NOR circuits, which you'll do next lesson.</p>
<div class="warn">The most common bug: writing <code>!(a &amp;&amp; b)</code> as <code>!a &amp;&amp; !b</code>. You must flip the operator too. Demo 3 shows the rows where the wrong version fails.</div>
<div class="world">
<ul>
<li>Augustus De Morgan stated these laws in 19th-century logic. They appear constantly in code reviews: <code>if (!(user &amp;&amp; user.isActive))</code> → <code>if (!user || !user.isActive)</code>. Linters like ESLint and IDE "invert condition" refactorings apply De Morgan for you.</li>
<li>Chip design libraries are full of NAND/NOR and AOI/OAI cells (AND-OR-INVERT), and synthesis tools use De Morgan to map logic onto them.</li>
<li>Database query planners and search engines use it too: <code>NOT (a OR b)</code> is rewritten as <code>NOT a AND NOT b</code> to use indexes better.</li>
</ul></div>`,
      examples: [
        {
          title: 'Law #1 side by side',
          code: C(dm1Cfg),
          explain: `
<details><summary>The problem: where does the NOT go?</summary>
<p>The top circuit computes <b>NOT(A·B)</b>: AND first, invert at the end. The bottom one inverts each input first, then combines with OR. They look nothing alike, and the bottom one even uses a different gate type. Can they really be the same function? Check every case.</p></details>
<details><summary>Step by step: all four rows</summary>
<table><tr><th>A</th><th>B</th><th>A·B</th><th>NOT(A·B)</th><th>NOT A</th><th>NOT B</th><th>Ā + B̄</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td><b>1</b></td><td>1</td><td>1</td><td><b>1</b></td></tr>
<tr><td>0</td><td>1</td><td>0</td><td><b>1</b></td><td>1</td><td>0</td><td><b>1</b></td></tr>
<tr><td>1</td><td>0</td><td>0</td><td><b>1</b></td><td>0</td><td>1</td><td><b>1</b></td></tr>
<tr><td>1</td><td>1</td><td>1</td><td><b>0</b></td><td>0</td><td>0</td><td><b>0</b></td></tr></table>
<p>Both columns are 1, 1, 1, 0. Why: "A·B is false" means at least one of A, B is 0, which is the same as "at least one of Ā, B̄ is 1", which is exactly what Ā + B̄ says.</p></details>
<details><summary>Try this</summary>
<p>Click the truth-table rows one at a time and watch the wire colours. In the bottom circuit the NOT A / NOT B wires are green exactly when the switches are off. The two LEDs always agree. The only row where both go dark is A = 1, B = 1.</p></details>
<details><summary>Common mistake: forgetting to swap the operator</summary>
<p><code>!(a &amp;&amp; b)</code> is <b>not</b> <code>!a &amp;&amp; !b</code>. In row A=0, B=1, NOT(A·B) = 1 but Ā·B̄ = 1·0 = 0. Real bug example: <code>if (!(isWeekend &amp;&amp; isHoliday))</code> refactored to <code>if (!isWeekend &amp;&amp; !isHoliday)</code> silently stops running on ordinary weekends. Demo 3 lets you see the failing rows.</p></details>`,
        },
        { title: 'Law #2 side by side', code: C(dm2Cfg),
          explain: `<details><summary>Try this</summary><p>Same idea with OR and AND swapped. Both LEDs are lit only in row A=0, B=0 ("neither A nor B"). Notice the top circuit is just a NOR gate drawn as two gates, and the bottom is an AND with inverted inputs: a NOR is an AND with bubbles on its inputs.</p></details>` },
        { title: 'Refactor checker for code conditions', code: W(exprWidget, REFACTORS, [exprLib]) },
      ],
      quiz: [
        { q: '<code>!(a || b)</code> equals…', options: ['!a || !b', '!a && !b', 'a && b', '!a || b'], answer: 1, why: 'Break the bar, change the sign: OR becomes AND, both inputs inverted.' },
        { q: 'A NAND gate is equivalent to…', options: ['AND with inverted inputs', 'OR with inverted inputs', 'NOR', 'XOR'], answer: 1, why: 'NOT(A·B) = Ā + B̄.' },
        { q: 'Which refactor of <code>if (!(loggedIn && verified))</code> is correct?', options: ['if (!loggedIn && !verified)', 'if (!loggedIn || !verified)', 'if (loggedIn || verified)', 'if (!loggedIn || verified)'], answer: 1, why: 'De Morgan #1.' },
        { q: '<code>NOT(A·B·C)</code> = ?', options: ['Ā·B̄·C̄', 'Ā + B̄ + C̄', 'A + B + C', 'Ā + B + C'], answer: 1, why: 'De Morgan works for any number of terms.' },
      ],
      exercise: {
        task: `<p><b>No OR allowed.</b> Using only AND and NOT gates, build <b>Y = A OR B</b> in the board below, then click <b>✔ Check</b>.</p>`,
        hint: 'De Morgan #2 rearranged: A + B = NOT( NOT A · NOT B ). That is 2 NOTs, 1 AND, 1 NOT.',
        starter: C(orFromAndEx, false),
        solution: C(orFromAndEx, true),
      },
    },
    // =============================================================== nand-universal
    {
      id: 'nand-universal',
      section: 'Logic Gates',
      title: 'NAND is universal',
      explain: `
<p>Here's a remarkable fact: <strong>NAND alone can build every other gate</strong>, and therefore every digital circuit, including a whole computer. A gate with this property is called <strong>functionally complete</strong> (or universal). NOR is universal too, which is why Apollo could use only NOR chips.</p>
<table><tr><th>Want</th><th>NAND recipe</th><th>NANDs</th></tr>
<tr><td>NOT A</td><td>NAND(A, A)</td><td>1</td></tr>
<tr><td>A AND B</td><td>NOT(NAND(A, B)) = NAND(n, n) where n = NAND(A, B)</td><td>2</td></tr>
<tr><td>A OR B</td><td>NAND(NOT A, NOT B), by De Morgan</td><td>3</td></tr>
<tr><td>A XOR B</td><td>n1 = NAND(A,B); NAND(NAND(A,n1), NAND(n1,B))</td><td>4</td></tr></table>
<p>Why it works: NAND can make NOT, and NAND + NOT makes AND. With AND and NOT, De Morgan gives you OR. AND, OR and NOT can express any truth table (next lesson proves it), so NAND can too.</p>
<div class="tip">Puzzle-game mindset: from here on, every new thing you build becomes a component you can reuse. The course mirrors the famous "From NAND to Tetris" journey: NAND → gates → adder → memory → CPU.</div>
<div class="world">
<ul>
<li><strong><a href="https://www.nand2tetris.org/" target="_blank">nand2tetris</a></strong> (Nisan &amp; Schocken, "The Elements of Computing Systems") is a famous course where you build a working computer, assembler, compiler and Tetris, starting from a single NAND gate.</li>
<li><strong>Standard cell libraries</strong>: real chips are built from a library of pre-designed cells (INV, NAND2, NAND3, NOR2, AOI21, flip-flops…). NAND and NOR cells are the smallest and fastest after the inverter, so synthesis tools lean on them heavily.</li>
<li>Early integrated-circuit computers leaned on this: the Apollo Guidance Computer used one chip type, a dual 3-input NOR, for all its logic, so NASA only had to qualify and stockpile a single part.</li>
</ul></div>`,
      examples: [
        { title: 'NOT and AND from NAND', code: C(nandBasicsCfg),
          explain: `<details><summary>Try this</summary><p>NAND with both inputs tied to A gives NAND(A, A) = NOT(A·A) = NOT A. In the lower circuit the first NAND gives NOT(A·B), and the second, used as a NOT, flips it back to A·B. Click through the truth table: the columns match NOT and AND exactly.</p></details>` },
        {
          title: 'XOR from 4 NANDs',
          code: C(nandXorCfg),
          explain: `
<details><summary>The problem: "different?" from a gate that only says "not both"</summary>
<p>NAND(A, B) is 1 for three rows, including A = B = 0. XOR must be 0 there. We need a way to say "<em>at least one</em> is 1, but <em>not both</em>". The middle gate n1 = NAND(A, B) is the "not both" signal, and it's shared by two other gates.</p></details>
<details><summary>Step by step: values at every gate</summary>
<table><tr><th>A</th><th>B</th><th>n1 = NAND(A,B)</th><th>n2 = NAND(A,n1)</th><th>n3 = NAND(n1,B)</th><th>n4 = NAND(n2,n3) = A⊕B</th></tr>
<tr><td>0</td><td>0</td><td>1</td><td>1</td><td>1</td><td><b>0</b></td></tr>
<tr><td>0</td><td>1</td><td>1</td><td>1</td><td>0</td><td><b>1</b></td></tr>
<tr><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td><td><b>1</b></td></tr>
<tr><td>1</td><td>1</td><td>0</td><td>1</td><td>1</td><td><b>0</b></td></tr></table>
<p>Read n2 as "A is 1 and not both" (inverted): it goes to 0 only when A = 1, B = 0. n3 does the same for B. n4 is an OR of those two conditions (NAND of inverted signals = OR, by De Morgan).</p></details>
<details><summary>Try this: watch it ripple in slow-mo</summary>
<ol><li>Click <b>🐢 Slow-mo</b>. Start at A = 0, B = 0.</li>
<li>Click <b>A</b>. Step 1: switch A turns green. Step 2: n2 drops to 0. Step 3: n4 rises to 1 and the LED lights. Status: <b>settled after 3 gate delays</b> (the switch flipping counts as the first step).</li>
<li>Now click <b>B</b> (A = 1, B = 1). Step 2: n1 drops to 0 and n3 briefly drops to 0 too, because it still sees the old n1 = 1. Step 3: n2 and n3 both come back to 1. Step 4: n4 falls to 0. <b>settled after 4 gate delays</b>. That brief wrong value on n3 is a <em>glitch</em>, and the gate-delay lesson shows why it matters.</li></ol></details>
<details><summary>Common mistake: using 5 gates</summary>
<p>The obvious approach, XOR = (A + B)·NAND(A, B), built from NAND-only parts costs 3 (OR) + 1 (NAND) + 2 (AND) = 6 NANDs. The 4-gate version wins by <b>sharing</b> n1: one gate's output feeds two others. Sharing sub-results is the hardware version of storing a value in a variable instead of recomputing it.</p></details>`,
        },
      ],
      quiz: [
        { q: 'How do you make NOT A from a NAND gate?', options: ['NAND(A, 0)', 'NAND(A, A)', 'NAND(A, NOT A)', "You can't"], answer: 1, why: 'NAND(A, A) = NOT(A·A) = NOT A. (NAND(A, 1) also works.)' },
        { q: 'Minimum number of NANDs for an OR gate?', options: ['1', '2', '3', '4'], answer: 2, why: 'Invert both inputs (2 NANDs), then NAND them: NAND(Ā, B̄) = A + B.' },
        { q: 'What does "functionally complete" mean?', options: ['The gate is very fast', 'Any Boolean function can be built using only that gate', 'It has every input', 'It has no delay'], answer: 1, why: 'NAND and NOR are each functionally complete on their own.' },
        { q: 'Which gate is NOT universal on its own?', options: ['NAND', 'NOR', 'AND'], answer: 2, why: 'With only AND (no inversion) you can never produce a 1 from all-0 inputs, so NOT is impossible.' },
      ],
      exercise: {
        task: `<p><b>NAND-only puzzle.</b> Using only NAND gates, build <b>Y = A OR B</b> in the board below, then click <b>✔ Check</b>. ⭐ Best known: 3 gates.</p>`,
        hint: 'De Morgan: A + B = NOT(Ā · B̄) = NAND(Ā, B̄). Make Ā with NAND(A, A) and B̄ with NAND(B, B).',
        starter: C(nandOrEx, false),
        solution: C(nandOrEx, true),
      },
    },
    // =============================================================== truth-table-to-circuit
    {
      id: 'truth-table-to-circuit',
      section: 'Logic Gates',
      title: 'Any truth table → circuit',
      explain: `
<p>Given any truth table (any function you can describe as "for these inputs, output this"), there's a mechanical recipe to build it from AND, OR and NOT. It's called <strong>sum of products</strong> (SOP):</p>
<ol>
<li>Find every row where the output is <strong>1</strong>.</li>
<li>For each such row, write an AND of all inputs, putting a NOT on each input that is <strong>0</strong> in that row. This product (a <strong>minterm</strong>) is 1 for that row and no other.</li>
<li>OR all the minterms together.</li>
</ol>
<pre><code>Row A B C → Y        minterm
 3  0 1 1 → 1        Ā·B·C
 5  1 0 1 → 1        A·B̄·C
 6  1 1 0 → 1        A·B·C̄
 7  1 1 1 → 1        A·B·C
Y = Ā·B·C + A·B̄·C + A·B·C̄ + A·B·C        (majority vote)</code></pre>
<p>This is the proof behind "NAND is universal": every function has an SOP form, and SOP only needs AND, OR, NOT, which NAND can build.</p>
<h3>Simplifying: Karnaugh maps</h3>
<p>The raw SOP is often wasteful. A <strong>Karnaugh map</strong> lays out the truth table so that neighbouring cells differ in exactly one input (columns go 00, 01, 11, 10). Two neighbouring 1s can merge into one shorter term, because the input that differs drops out (X·B + X·B̄ = X). The majority function shrinks to <code>A·B + B·C + A·C</code>.</p>
<div class="world">
<ul>
<li><strong>FPGAs</strong> (reprogrammable chips) don't contain fixed gates at all. They contain thousands of <strong>lookup tables (LUTs)</strong>, tiny memories that literally store a truth table. A Xilinx/AMD 6-input LUT is 64 bits of memory: your inputs form the address, and the stored bit is the output. Any 6-input function, one LUT.</li>
<li><strong>PAL/PLA chips</strong> (1970s–80s) implemented sum of products directly: a programmable AND array feeding an OR array, which is exactly the generated circuit in demo 1.</li>
<li>Synthesis tools (Yosys/ABC) use much more advanced versions of K-map-style minimisation on functions with hundreds of inputs.</li>
</ul></div>`,
      examples: [
        {
          title: 'Truth table → SOP → circuit generator',
          code: W(sopWidget),
          explain: `
<details><summary>The problem: you know WHAT you want, not HOW to wire it</summary>
<p>A spec like "output 1 when at least two of three voters say yes" is easy to write as a table but not obvious as gates. SOP turns <em>any</em> table into a circuit without any cleverness: one AND per 1-row, one OR to combine them.</p></details>
<details><summary>Step by step: the majority preset</summary>
<table><tr><th>Step</th><th>What the widget shows</th></tr>
<tr><td>1. Find the 1-rows</td><td>Rows 3, 5, 6, 7 are green in the Y column</td></tr>
<tr><td>2. Write a minterm per row</td><td>row 3 (A=0 B=1 C=1) → <b>Ā·B·C</b>: A is 0 in that row, so it gets the bar</td></tr>
<tr><td>3. OR them</td><td>SOP: Y = Ā·B·C + A·B̄·C + A·B·C̄ + A·B·C</td></tr>
<tr><td>4. Count</td><td>Literal build: 3 NOT + 4 three-input AND + 1 OR = 8 gates</td></tr>
<tr><td>5. Simplify</td><td>Simplified: Y = A·B + B·C + A·C (row 7 is shared by all three pairs)</td></tr>
<tr><td>6. Generated circuit</td><td>Gates m3, m5, m6, m7 each fire on one row. Click A, B, C and only one AND lights at a time.</td></tr></table></details>
<details><summary>Try this</summary>
<ol><li>Click Y cells to design your own function. The SOP, the K-map and the circuit regenerate instantly.</li>
<li>Click <b>odd parity</b>: the SOP has 4 terms and the "simplified" version is the same, because XOR-like functions have no neighbouring 1s in the K-map (look: it's a checkerboard). That's why XOR deserves its own gate.</li>
<li>Click <b>A·B</b>: two minterms A·B·C̄ + A·B·C merge into A·B, since C drops out.</li></ol></details>
<details><summary>Common mistake: barring the wrong inputs</summary>
<p>In a minterm the bar goes on inputs that are <b>0</b> in that row, not 1. Row 5 is A=1, B=0, C=1 → A·B̄·C. Check: plug in A=1, B=0, C=1 and it gives 1·1·1 = 1. Plug in any other row and at least one factor is 0. Each minterm is a detector for exactly one row (demo 2).</p></details>`,
        },
        { title: 'A minterm detects exactly one row', code: C(mintermCfg),
          explain: `<details><summary>Try this</summary><p>Look at the truth table: the LED column has a single 1, at A=1, B=0, C=1. The NOT on B is what makes "B = 0" count as a match. Any other combination makes at least one AND input 0.</p></details>` },
      ],
      quiz: [
        { q: 'The minterm for row A=0, B=1, C=0 is…', options: ['A·B̄·C', 'Ā·B·C̄', 'Ā + B + C̄', 'A·B·C'], answer: 1, why: 'Bar the inputs that are 0: A and C.' },
        { q: 'A 3-input truth table has five 1-rows. A raw SOP needs how many AND gates?', options: ['3', '5', '8', '1'], answer: 1, why: 'One minterm (AND) per 1-row.' },
        { q: 'Simplify <code>A·B·C + A·B·C̄</code>', options: ['A·B', 'A·C', 'C', 'A·B·C'], answer: 0, why: 'The two terms differ only in C, so C drops out: A·B·(C + C̄) = A·B.' },
        { q: 'What is inside an FPGA LUT?', options: ['A fixed NAND gate', 'A small memory storing the truth table', 'A CPU', 'An analog amplifier'], answer: 1, why: 'The inputs address a tiny memory; the stored bit is the output.' },
      ],
      exercise: {
        task: `<p><b>Majority vote.</b> Three judges A, B, C. <b>M</b> = 1 when at least two say yes. Build it in the board below, then click <b>✔ Check</b>. Any working circuit passes; ⭐ best known is 4 gates (you'll need some algebra on top of the K-map result: A·B + C·(A + B)).</p>`,
        hint: 'Easy version: three 2-input ANDs (A·B, B·C, A·C) and two ORs = 5 gates. Better: A·B + C·(A + B) = 4 gates.',
        starter: C(majorityEx, false),
        solution: C(majorityEx, true),
      },
    },
    // =============================================================== gate-delay
    {
      id: 'gate-delay',
      section: 'Logic Gates',
      title: 'Gates take time: propagation delay',
      explain: `
<p>So far gates seemed instant. They aren't. When an input changes, transistors must charge or discharge the output wire's capacitance, which takes a small time called the <strong>propagation delay</strong>. A signal crossing several gates in a row adds up their delays.</p>
<ul>
<li>The slowest input-to-output path is the <strong>critical path</strong>. Nothing downstream can trust the output until it has settled.</li>
<li>A CPU's clock must tick slower than its critical path, so <strong>clock speed is limited by the longest chain of gates</strong> between registers. Designers make paths wide and shallow (trees, not chains) to go faster.</li>
<li>While signals race along paths of different lengths, outputs can briefly show wrong values: <strong>glitches</strong> (hazards).</li>
</ul>
<h3>How this simulator models time</h3>
<p>The simulator uses a <strong>unit-delay</strong> model: on every tick, every part (including the switches) recomputes from the values of the previous tick. One tick = one gate delay. The <b>⏱ settled after N gate delays</b> readout counts ticks until nothing changes. The switch itself takes the first tick, so a change that passes through k gates reports <b>k + 1</b>. 🐢 Slow-mo shows one tick at a time.</p>
<div class="warn">If a circuit's output feeds back into its own input through an odd number of inverters, it can <em>never</em> settle. The simulator then shows ⚠ Oscillating. That's usually a bug… or a deliberately built clock (demo 3).</div>
<div class="world">
<ul>
<li><strong>Numbers</strong>: a 74HC00 NAND chip has a propagation delay of roughly 10 ns. A gate inside a modern CPU switches in roughly 10 picoseconds, a thousand times faster. At 5 GHz a clock cycle is 200 ps, so only a couple of dozen gate delays fit in one cycle. Even light only travels about 6 cm in 200 ps.</li>
<li><strong>Pipelining</strong>: CPUs split work into stages with registers between them so each stage's critical path is short. That's how clock speeds went from 1 MHz to 5 GHz.</li>
<li><strong>Ring oscillators</strong> are used on real chips as built-in speed sensors (process monitors: a faster-than-expected ring means "fast silicon"), as voltage-controlled oscillators in clock generators, and their timing jitter is a source of true randomness in hardware random number generators.</li>
</ul></div>`,
      examples: [
        {
          title: 'Short path vs long path',
          code: C(chainCfg),
          explain: `
<details><summary>The problem: two outputs, same logic, different timing</summary>
<p>Both Y1 and Y5 compute NOT A: five inverters in a row is the same as one, since four of them cancel out in pairs. The truth table says they're identical. But the change has to physically travel through five gates to reach Y5, so for a short while after A changes, Y1 and Y5 disagree.</p></details>
<details><summary>Step by step: click A (0 → 1) with 🐢 Slow-mo on</summary>
<table><tr><th>Tick</th><th>What changes</th><th>Y1</th><th>Y5</th></tr>
<tr><td>start</td><td>A = 0, settled</td><td>1</td><td>1</td></tr>
<tr><td>1</td><td>switch A becomes 1 ("⚡ propagating… gate delay 1")</td><td>1</td><td>1</td></tr>
<tr><td>2</td><td>top NOT and NOT 1 flip</td><td><b>0</b> ✓</td><td>1 (stale)</td></tr>
<tr><td>3</td><td>NOT 2 flips</td><td>0</td><td>1 (stale)</td></tr>
<tr><td>4</td><td>NOT 3</td><td>0</td><td>1 (stale)</td></tr>
<tr><td>5</td><td>NOT 4</td><td>0</td><td>1 (stale)</td></tr>
<tr><td>6</td><td>NOT 5 flips</td><td>0</td><td><b>0</b> ✓</td></tr>
<tr><td>7</td><td>nothing changes → <b>settled after 6 gate delays</b></td><td>0</td><td>0</td></tr></table>
<p>6 = 1 tick for the switch + 5 gates on the longest path. For ticks 2 to 5 the outputs disagree: any circuit reading Y5 during that window gets the old value.</p></details>
<details><summary>Try this</summary>
<ol><li>Turn on 🐢 Slow-mo and click A. Watch the green wave move right, one NOT per step.</li>
<li>Turn slow-mo off and click A: the board updates at once, but the readout still says <b>6 gate delays</b>. The delay is real even when the animation isn't shown.</li>
<li>Count the critical path yourself in other demos in this course: the readout is always (gates on the longest path the change travelled) + 1.</li></ol></details>`,
        },
        {
          title: 'A glitch: Y = A AND NOT A',
          code: W(glitchWidget),
          explain: `
<details><summary>Step by step: why a "never 1" output blinks</summary>
<p>The AND gets A directly (fast path) and NOT A through an inverter (slow path, one extra gate).</p>
<table><tr><th>Tick</th><th>A</th><th>NOT A</th><th>Y = A·(NOT A)</th></tr>
<tr><td>start</td><td>0</td><td>1</td><td>0</td></tr>
<tr><td>1</td><td>1 (switch flips)</td><td>1 (not updated yet)</td><td>0</td></tr>
<tr><td>2</td><td>1</td><td>0</td><td><b style="color:#dc2626">1 ⚡ glitch</b>: the AND saw A = 1 and the stale NOT A = 1</td></tr>
<tr><td>3</td><td>1</td><td>0</td><td>0, settled after 3 gate delays</td></tr></table>
<p>Clicking A back to 0 gives no glitch (2 gate delays): the fast path drops the AND to 0 immediately, and a 0 on one AND input wins regardless of the other.</p></details>
<details><summary>Try this</summary><p>With 🐢 Slow-mo on, click A from 0 to 1 a few times. The glitch counter goes up once per rising click and never on falling clicks. In real hardware the pulse lasts one gate delay (picoseconds), too short to see but long enough to wrongly trigger a counter or memory. That's why real designs only sample signals on clock edges, after everything has settled (Memory section).</p></details>`,
        },
        {
          title: 'Ring oscillator: an odd loop never settles',
          code: W(ringWidget),
          explain: `
<details><summary>The problem: a loop that contradicts itself</summary>
<p>Feed an odd number of inverting gates back into themselves. If Q is 1, after going around the loop it comes back as 0. Then 0 comes back as 1… There is no stable answer, so the circuit flips forever. With an even number of inverters the loop would be stable: that's the basis of memory, coming later.</p></details>
<details><summary>Step by step: the timing diagram</summary>
<table><tr><th>Tick</th><th>EN</th><th>NAND</th><th>NOT 1</th><th>Q</th></tr>
<tr><td>0</td><td>0</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>2</td><td>1</td><td><b>0</b></td><td>0</td><td>1</td></tr>
<tr><td>3</td><td>1</td><td>0</td><td><b>1</b></td><td>1</td></tr>
<tr><td>4</td><td>1</td><td>0</td><td>1</td><td><b>0</b></td></tr>
<tr><td>5</td><td>1</td><td><b>1</b></td><td>1</td><td>0</td></tr>
<tr><td>7</td><td>1</td><td>1</td><td>0</td><td><b>1</b></td></tr></table>
<p>A change takes 3 ticks to go once around the loop and comes back inverted, so Q flips every 3 gate delays and repeats every <b>6</b>. Frequency = 1 / (2 × 3 × gate delay). With 10 ps gates that's about 17 GHz. Real ring oscillators use more stages to slow it down.</p></details>
<details><summary>Try this</summary>
<ol><li>Click <b>EN</b> → 1 with slow-mo off. The status shows <b>⚠ Oscillating</b> and the counter gives up at 120 gate delays. That's not a bug in your thinking: this circuit has no stable state. The simulator freezes a random snapshot.</li>
<li>Turn on <b>🐢 Slow-mo</b>, click EN to 0, then to 1 again. Watch the green pulse chase around the loop: NAND, NOT, NOT, back into the NAND, forever (the animation stops after 120 steps).</li>
<li>Click EN → 0: the NAND output is forced to 1 whatever the loop says, so everything settles. EN is an on/off switch for the clock.</li></ol></details>
<details><summary>Common mistake: "oscillation is always bad"</summary>
<p>An accidental feedback loop in combinational logic is a bug. But oscillating on purpose is how you make a <b>clock</b>. Real computers use a quartz crystal oscillator for an accurate reference, then on-chip circuits (PLLs, built around a voltage-controlled ring-style oscillator) multiply it up to GHz. The ▶ Clock button you'll meet in the Memory section is this idea.</p></details>`,
        },
      ],
      quiz: [
        { q: 'In this simulator, a change passes through 4 gates in a row. What does the readout show?', options: ['settled after 4 gate delays', 'settled after 5 gate delays', 'settled after 1 gate delay', 'settled after 8 gate delays'], answer: 1, why: 'The switch itself takes the first tick, then one per gate: 1 + 4 = 5.' },
        { q: 'What limits how fast a CPU\'s clock can run?', options: ['The number of transistors', 'The longest (critical) gate path between registers', 'The amount of RAM', 'The shortest path'], answer: 1, why: 'Every path must settle within one clock cycle, so the slowest one sets the limit.' },
        { q: 'Why does <code>A AND NOT A</code> briefly output 1 when A rises?', options: ['The AND gate is broken', 'NOT A arrives one gate delay late, so the AND briefly sees A = 1 and the old NOT A = 1', 'Noise', 'It is a ring oscillator'], answer: 1, why: 'Different path lengths cause a race, and the stale value creates a glitch.' },
        { q: 'A ring of 3 inverting gates, each with delay d. The oscillation period is…', options: ['3d', '6d', 'd', 'It settles'], answer: 1, why: 'The signal goes around once (3d) to flip, and around again (3d) to flip back: 6d.' },
        { q: 'Same 4-input AND function: a chain of 3 gates vs a balanced tree of 3 gates. Which is faster?', options: ['Chain', 'Tree: longest path 2 gates instead of 3', 'Same speed'], answer: 1, why: 'Same gate count, but the tree is shallower, so the critical path is shorter.' },
      ],
      exercise: {
        task: `<p><b>Speed run.</b> Build a 4-input AND (<b>Y = A·B·C·D</b>) from 2-input ANDs in the board below, where the <b>longest path from any input to Y is at most 2 gates</b>. Click <b>✔ Check (logic + speed)</b>. (Toggling an input will show at most "settled after 3 gate delays": the switch plus 2 gates.)</p>`,
        hint: 'A chain ((A·B)·C)·D is 3 deep. Pair them up instead: (A·B)·(C·D).',
        starter: W(fastAndWidget, false),
        solution: W(fastAndWidget, true),
      },
    },
  );
})();
