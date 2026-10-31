window.LESSONS = window.LESSONS || [];
{
  // ---------- helpers (block-scoped) ----------
  // Widget code = real JS functions serialised with Function#toString and run as IIFEs in the preview iframe.
  const src = (list) => list.map((f) => (typeof f === 'function' ? '(' + f.toString() + ')();' : String(f))).join('\n');
  const READOUT_CSS = '<style>.rd{margin:8px 2px 0;padding:8px 12px;border-radius:8px;background:#f1f5f9;font:14px system-ui;color:#1e293b}.rd b{color:#0f766e}.rd code{background:#e2e8f0;padding:1px 5px;border-radius:4px}</style>';
  const W = (fns, html) => (html || '') + '<div id="c"></div>\n<script>\n' + src([].concat(fns)) + '\n<\/script>';
  const WR = (fns, html) => READOUT_CSS + (html || '') + '<div id="c"></div><div id="r" class="rd"></div>\n<script>\n' + src([].concat(fns)) + '\n<\/script>';
  const CUSTOM = (html, fn, arg) => html + '\n<script>\n(' + fn.toString() + ')(' + (arg === undefined ? '' : JSON.stringify(arg)) + ');\n<\/script>';

  // ---------- chips: "you built it, now it's a component" ----------
  const DEF_ADD4 = function () {
    Circ.chip('ADD4', {
      label: '4-BIT ADDER', w: 110,
      ins: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Cin'], outs: ['S0', 'S1', 'S2', 'S3', 'Cout'],
      desc: '4 full adders in a ripple chain: S = A + B + Cin, Cout = carry out of bit 3',
      fn: (i) => { const a = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3], b = i[4] + 2 * i[5] + 4 * i[6] + 8 * i[7]; const s = a + b + i[8]; return [s & 1, (s >> 1) & 1, (s >> 2) & 1, (s >> 3) & 1, (s >> 4) & 1]; },
    });
  };
  const DEF_ALU4 = function () {
    // OP1 OP0: 00 ADD, 01 SUB, 10 AND, 11 OR. Flags: Z zero, N negative (bit 3), C carry out, V signed overflow.
    window.ALU = (a, b, op) => {
      let r, c = 0, v = 0;
      if (op < 2) {
        const bb = op ? (~b & 15) : b;
        const s = a + bb + op;
        r = s & 15; c = s >> 4;
        const sa = a >> 3, sb = bb >> 3, sr = r >> 3;
        v = sa === sb && sr !== sa ? 1 : 0;
      } else r = op === 2 ? a & b : a | b;
      return { r, z: r === 0 ? 1 : 0, n: r >> 3, c, v };
    };
    Circ.chip('ALU4', {
      label: '4-BIT ALU', w: 120,
      ins: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'OP0', 'OP1'], outs: ['R0', 'R1', 'R2', 'R3', 'Z', 'N', 'C', 'V'],
      desc: 'OP1 OP0: 00 = ADD, 01 = SUB, 10 = AND, 11 = OR. Flags Z, N, C, V.',
      fn: (i) => { const a = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3], b = i[4] + 2 * i[5] + 4 * i[6] + 8 * i[7]; const o = window.ALU(a, b, i[8] + 2 * i[9]); return [o.r & 1, (o.r >> 1) & 1, (o.r >> 2) & 1, (o.r >> 3) & 1, o.z, o.n, o.c, o.v]; },
    });
  };

  // =====================================================================
  // half-adder
  // =====================================================================
  const HA_GATES = function () {
    const r = document.getElementById('r');
    Circ.mount('#c', {
      title: 'Half adder: XOR for the sum, AND for the carry',
      intro: 'Add two 1-bit numbers. The answer can be 0, 1 or 2, so it needs two output bits: <b>C S</b>.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 10, value: 1 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 90, value: 1 },
        { id: 'x', type: 'XOR', x: 160, y: 10 },
        { id: 'g', type: 'AND', x: 160, y: 90 },
        { id: 's', type: 'OUT', label: 'S (sum)', x: 300, y: 10, color: '#3b82f6' },
        { id: 'c', type: 'OUT', label: 'C (carry)', x: 300, y: 90, color: '#f59e0b' },
      ],
      wires: [['a', 'x.0', { mx: 100 }], ['a', 'g.0', { mx: 100 }], ['b', 'x.1', { mx: 120 }], ['b', 'g.1', { mx: 120 }], ['x', 's'], ['g', 'c']],
      onChange(api) {
        const a = api.get('A'), b = api.get('B');
        r.innerHTML = a + ' + ' + b + ' = <b>' + (a + b) + '</b> = binary <code>' + api.get('C (carry)') + api.get('S (sum)') + '</code> (C S). ' + (a && b ? 'Just like 5 + 5 = 10 in decimal: write 0, carry 1.' : '');
      },
    });
  };
  const COLADD_HTML = `<style>
.ca{font:14px system-ui;color:#1e293b}.ca .grid{display:grid;grid-template-columns:110px repeat(5,44px);gap:4px 6px;align-items:center;margin:8px 0}
.ca .lbl{font-weight:700;text-align:right;padding-right:6px;font-size:13px}
.ca .cell{font:700 18px ui-monospace,Menlo,monospace;text-align:center;height:34px;line-height:34px;border-radius:6px}
.ca button.cell{border:1px solid #94a3b8;background:#e5e7eb;cursor:pointer;padding:0}.ca button.cell.one{background:#16a34a;color:#fff;border-color:#15803d}
.ca .carry{color:#d97706;font-size:14px}.ca .sum{background:#eef2ff}.ca .hl{outline:3px solid #f59e0b}
.ca .rule{grid-column:1/-1;border-top:2px solid #334155;height:0}
.ca .note{padding:8px 12px;border-radius:8px;background:#f1f5f9;min-height:44px}
.ca .ctl button{font:600 13px system-ui;padding:4px 10px;border-radius:6px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer;margin-right:4px}
</style>
<div class="ca"><div class="ctl"><button id="prev">◀ column</button><button id="next">column ▶</button> <span id="where"></span></div>
<div class="grid" id="g"></div><div class="note" id="n"></div></div>`;
  const COLADD_JS = function () {
    let A = 0b0111, B = 0b0101, col = 0;
    const g = document.getElementById('g'), n = document.getElementById('n');
    function render() {
      const carries = [0], sums = [];
      for (let k = 0; k < 4; k++) { const t = ((A >> k) & 1) + ((B >> k) & 1) + carries[k]; sums.push(t & 1); carries.push(t >> 1); }
      const colX = (k) => 5 - k; // grid column (1 = label); bit k sits at column 6-k
      let h = '<div class="lbl">carry in</div>';
      for (let c = 4; c >= 0; c--) h += `<div class="cell carry ${c === col ? 'hl' : ''}">${c === 0 ? '0' : c <= col ? carries[c] : ''}</div>`;
      h += '<div class="lbl">A</div><div></div>';
      for (let k = 3; k >= 0; k--) h += `<button class="cell ${(A >> k) & 1 ? 'one' : ''} ${k === col ? 'hl' : ''}" data-v="A" data-k="${k}">${(A >> k) & 1}</button>`;
      h += '<div class="lbl">+ B</div><div></div>';
      for (let k = 3; k >= 0; k--) h += `<button class="cell ${(B >> k) & 1 ? 'one' : ''} ${k === col ? 'hl' : ''}" data-v="B" data-k="${k}">${(B >> k) & 1}</button>`;
      h += '<div class="rule"></div><div class="lbl">sum</div>';
      for (let c = 4; c >= 0; c--) {
        const shown = c === 4 ? (col >= 4 ? carries[4] : '') : c <= col ? sums[c] : '';
        h += `<div class="cell sum ${c === col ? 'hl' : ''}">${shown}</div>`;
      }
      g.innerHTML = h;
      g.querySelectorAll('button.cell').forEach((b) => (b.onclick = () => { if (b.dataset.v === 'A') A ^= 1 << +b.dataset.k; else B ^= 1 << +b.dataset.k; render(); }));
      document.getElementById('where').textContent = col < 4 ? 'Column ' + col + (col === 0 ? ' (rightmost)' : '') : 'Done';
      if (col < 4) {
        const a = (A >> col) & 1, b = (B >> col) & 1, ci = carries[col], t = a + b + ci;
        n.innerHTML = col === 0
          ? `Column 0: <b>${a} + ${b} = ${t}</b> = binary ${t >> 1}${t & 1} → write <b>${t & 1}</b>, carry <b>${t >> 1}</b> to column 1. Only <b>two</b> inputs here: a <b>half adder</b> is enough.`
          : `Column ${col}: <b>${a} + ${b} + carry ${ci} = ${t}</b> = binary ${t >> 1}${t & 1} → write <b>${t & 1}</b>, carry <b>${t >> 1}</b>. <b>Three</b> inputs (A, B and the carry in): a half adder is not enough. We need a <b>full adder</b> (next lesson).`;
      } else n.innerHTML = `Result: ${A} + ${B} = <b>${A + B}</b> = binary <code>${(A + B).toString(2).padStart(5, '0')}</code>. The final carry became the 5th bit.`;
    }
    document.getElementById('next').onclick = () => { col = Math.min(4, col + 1); render(); };
    document.getElementById('prev').onclick = () => { col = Math.max(0, col - 1); render(); };
    render();
  };
  const HA_EX = (solved) => {
    const parts = [
      "{ id: 'a', type: 'IN', label: 'A', x: 40, y: 80 }",
      "{ id: 'b', type: 'IN', label: 'B', x: 40, y: 220 }",
      "{ id: 's', type: 'OUT', label: 'S', x: 660, y: 80, color: '#3b82f6' }",
      "{ id: 'c', type: 'OUT', label: 'C', x: 660, y: 240, color: '#f59e0b' }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'n1', type: 'NAND', x: 200, y: 150 }", "{ id: 'n2', type: 'NAND', x: 340, y: 70 }",
        "{ id: 'n3', type: 'NAND', x: 340, y: 200 }", "{ id: 'n4', type: 'NAND', x: 500, y: 90 }", "{ id: 'n5', type: 'NAND', x: 500, y: 250 }");
      wires = "wires: [['a','n1.0',{mx:140}],['b','n1.1',{mx:160}],['a','n2.0'],['n1','n2.1',{mx:300}],['n1','n3.0',{mx:300}],['b','n3.1'],['n2','n4.0',{mx:440}],['n3','n4.1',{mx:440}],['n1','n5.0',{mx:280}],['n1','n5.1',{mx:280}],['n4','s',{mx:600}],['n5','c']],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a half adder from NAND gates only',
  intro: 'S = A XOR B and C = A AND B, using nothing but NAND. Purple 🎯 column = goal.',
  build: { palette: ['NAND'], best: 5 },
  target: ({ A, B }) => ({ S: A ^ B, C: A & B }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // full-adder
  // =====================================================================
  const FA_GATES = function () {
    const r = document.getElementById('r');
    Circ.mount('#c', {
      title: 'Full adder = two half adders + OR',
      intro: 'Adds three bits: A + B + Cin. Half adder 1 adds A and B; half adder 2 adds that partial sum and Cin.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0, value: 1 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 60 },
        { id: 'ci', type: 'IN', label: 'Cin', x: 20, y: 200, value: 1 },
        { id: 'x1', type: 'XOR', x: 140, y: 10 },
        { id: 'a1', type: 'AND', x: 140, y: 90 },
        { id: 'x2', type: 'XOR', x: 300, y: 20 },
        { id: 'a2', type: 'AND', x: 300, y: 160 },
        { id: 'o', type: 'OR', x: 440, y: 130 },
        { id: 's', type: 'OUT', label: 'S', x: 560, y: 20, color: '#3b82f6' },
        { id: 'co', type: 'OUT', label: 'Cout', x: 560, y: 130, color: '#f59e0b' },
        { type: 'TEXT', text: 'half adder 1', x: 140, y: -8, size: 11.5, color: '#7c3aed', bold: true },
        { type: 'TEXT', text: 'half adder 2', x: 300, y: 2, size: 11.5, color: '#7c3aed', bold: true },
        { type: 'TEXT', text: 'A⊕B', x: 218, y: 24, size: 10.5, color: '#64748b' },
      ],
      wires: [
        ['a', 'x1.0'], ['a', 'a1.0', { mx: 90 }], ['b', 'x1.1', { mx: 110 }], ['b', 'a1.1', { mx: 110 }],
        ['x1', 'x2.0'], ['x1', 'a2.0', { mx: 240 }], ['ci', 'x2.1', { mx: 270 }], ['ci', 'a2.1', { mx: 270 }],
        ['a1', 'o.0', { mx: 400 }], ['a2', 'o.1', { mx: 400 }], ['x2', 's'], ['o', 'co'],
      ],
      onChange(api) {
        const a = api.get('A'), b = api.get('B'), c = api.get('Cin');
        r.innerHTML = a + ' + ' + b + ' + ' + c + ' = <b>' + (a + b + c) + '</b> = binary <code>' + api.get('Cout') + api.get('S') + '</code> (Cout S). Carry comes from ' +
          (a & b ? '<b>half adder 1</b> (A and B both 1)' : (a ^ b) & c ? '<b>half adder 2</b> (one of A, B is 1, plus Cin)' : 'nowhere (sum ≤ 1)') + '.';
      },
    });
  };
  const FA_CHIP = function () {
    const r = document.getElementById('r');
    Circ.mount('#c', {
      title: 'Now it\'s a chip: FA',
      intro: 'Same 5 gates, hidden inside a box with pins A, B, Cin → S, Cout. Compare its truth table with the gate version above.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 60 },
        { id: 'ci', type: 'IN', label: 'Cin', x: 20, y: 120 },
        { id: 'fa', type: 'FA', x: 180, y: 20 },
        { id: 's', type: 'OUT', label: 'S', x: 360, y: 20, color: '#3b82f6' },
        { id: 'co', type: 'OUT', label: 'Cout', x: 360, y: 80, color: '#f59e0b' },
      ],
      wires: [['a', 'fa.A', { mx: 120 }], ['b', 'fa.B', { mx: 140 }], ['ci', 'fa.Cin', { mx: 120 }], ['fa.S', 's', { mx: 320 }], ['fa.Cout', 'co', { mx: 320 }]],
      onChange(api) { r.innerHTML = 'A + B + Cin = ' + (api.get('A') + api.get('B') + api.get('Cin')) + ' → Cout S = <code>' + api.get('Cout') + api.get('S') + '</code>. From now on, this box is the <b>FA</b> part in your palette.'; },
    });
  };
  const FA_EX = (solved) => {
    const parts = [
      "{ id: 'a', type: 'IN', label: 'A', x: 40, y: 40 }",
      "{ id: 'b', type: 'IN', label: 'B', x: 40, y: 140 }",
      "{ id: 'ci', type: 'IN', label: 'Cin', x: 40, y: 260 }",
      "{ id: 's', type: 'OUT', label: 'S', x: 660, y: 60, color: '#3b82f6' }",
      "{ id: 'co', type: 'OUT', label: 'Cout', x: 660, y: 220, color: '#f59e0b' }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'x1', type: 'XOR', x: 200, y: 50 }", "{ id: 'a1', type: 'AND', x: 200, y: 150 }",
        "{ id: 'x2', type: 'XOR', x: 380, y: 60 }", "{ id: 'a2', type: 'AND', x: 380, y: 230 }", "{ id: 'o', type: 'OR', x: 520, y: 210 }");
      wires = "wires: [['a','x1.0'],['a','a1.0',{mx:130}],['b','x1.1',{mx:150}],['b','a1.1',{mx:150}],['x1','x2.0',{mx:300}],['x1','a2.0',{mx:300}],['ci','x2.1',{mx:340}],['ci','a2.1',{mx:340}],['a1','o.0',{mx:470}],['a2','o.1',{mx:470}],['x2','s'],['o','co']],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a full adder from XOR, AND, OR',
  intro: 'Cout S must equal A + B + Cin in binary. Check tests all 8 cases.',
  build: { palette: ['XOR', 'AND', 'OR'], best: 5 },
  target: ({ A, B, Cin }) => ({ S: (A + B + Cin) & 1, Cout: (A + B + Cin) >> 1 }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // ripple-carry
  // =====================================================================
  // Shared layout for a 4-bit stack of full-adder chips fed by NUMIN A/B. Declared as a global in the iframe.
  const RIPPLE_LAYOUT = function rippleLayout(o) {
    o = o || {};
    const X = o.x || 260;
    const parts = [
      { id: 'A', type: 'NUMIN', label: 'A', x: 20, y: 0, value: o.a || 0, signed: o.signed },
      { id: 'B', type: 'NUMIN', label: 'B', x: 20, y: 220, value: o.b || 0, signed: o.signed },
    ];
    const wires = [];
    const AMX = [200, 150, 140, 130];
    for (let k = 0; k < 4; k++) {
      parts.push({ id: 'fa' + k, type: 'FA', x: X, y: 100 * k, label: 'FA bit ' + k });
      wires.push(['A.' + k, 'fa' + k + '.A', { mx: AMX[k] }]);
      if (!o.noB) wires.push(['B.' + k, 'fa' + k + '.B', { mx: 190 + 10 * k }]);
      if (k) wires.push(['fa' + (k - 1) + '.Cout', 'fa' + k + '.Cin', { pts: [[X + 110, 100 * k - 40], [X + 110, 100 * k - 10], [X - 15, 100 * k - 10], [X - 15, 100 * k + 70]] }]);
    }
    return { parts, wires };
  };
  const RIPPLE = function () {
    const r = document.getElementById('r');
    const L = rippleLayout({ a: 15, b: 0 });
    L.parts.push({ id: 'S', type: 'NUMOUT', bits: 5, label: 'SUM', x: 480, y: 120 });
    const SMX = [400, 380, 380, 400];
    for (let k = 0; k < 4; k++) L.wires.push(['fa' + k + '.S', 'S.' + k, { mx: SMX[k] }]);
    L.wires.push(['fa3.Cout', 'S.4', { mx: 420 }]);
    L.parts.push({ type: 'TEXT', text: 'carry ripples down ↓', x: 380, y: 404, size: 11.5, color: '#b45309', bold: true });
    Circ.mount('#c', {
      title: '4-bit ripple-carry adder: four FA chips in a chain',
      intro: 'Each FA\'s <b>Cout</b> feeds the next FA\'s <b>Cin</b>. Turn on <b>🐢 Slow-mo</b>, then click B\'s ▲ (0 → 1) and watch the carry travel down.',
      parts: L.parts, wires: L.wires, scale: 1.15, slowMs: 650,
      onChange(api) {
        const a = api.get('A'), b = api.get('B'), s = api.get('SUM');
        r.innerHTML = a + ' + ' + b + ' = <b>' + s + '</b> (binary <code>' + s.toString(2).padStart(5, '0') + '</code>). ' + (api.delays ? 'Settled after <b>' + api.delays + '</b> steps: 1 for the input itself, then one per full adder the carry had to pass through.' : 'Change A or B to measure the delay.');
      },
    });
  };
  const SPEED_HTML = `<style>
.sp{font:14px system-ui;color:#1e293b}.sp label{display:flex;gap:10px;align-items:center;margin:6px 0}.sp input[type=range]{width:260px}
.sp .bar{height:22px;border-radius:5px;margin:3px 0;display:flex;align-items:center;padding-left:8px;color:#fff;font:600 12px system-ui;white-space:nowrap}
.sp .rd{margin-top:8px;padding:8px 12px;border-radius:8px;background:#f1f5f9}.sp .bad{color:#b91c1c;font-weight:700}.sp .ok{color:#15803d;font-weight:700}
</style>
<div class="sp">
<label>Adder width: <input id="w" type="range" min="4" max="64" step="4" value="64"> <b id="wv"></b> bits</label>
<label>Gate delay: <input id="d" type="range" min="5" max="50" step="5" value="15"> <b id="dv"></b> ps (rough modern value: ~10–20 ps)</label>
<label>Clock: <input id="f" type="range" min="1" max="6" step="0.5" value="4"> <b id="fv"></b> GHz</label>
<div id="bars"></div><div class="rd" id="r"></div></div>`;
  const SPEED_JS = function () {
    const $ = (id) => document.getElementById(id);
    function upd() {
      const n = +$('w').value, d = +$('d').value, f = +$('f').value;
      $('wv').textContent = n; $('dv').textContent = d; $('fv').textContent = f;
      const ripple = (2 * n + 1) * d;             // ~2 gate delays per bit on the carry path
      const fast = (2 * Math.ceil(Math.log2(n)) + 3) * d; // parallel-prefix adder: ~log2(n) levels
      const cyc = 1000 / f;
      const max = Math.max(ripple, cyc, fast) * 1.05;
      const bar = (label, ps, col) => `<div style="display:flex;align-items:center;gap:8px"><span style="width:240px;flex:none;font-size:13px">${label}: <b>${ps.toFixed(0)} ps</b></span><div style="flex:1"><div class="bar" style="width:${Math.max(1, (ps / max) * 100)}%;background:${col}"></div></div></div>`;
      $('bars').innerHTML = bar('Ripple-carry', ripple, '#ef4444') + bar('Lookahead / prefix adder', fast, '#16a34a') + bar('One clock cycle', cyc, '#3b82f6');
      $('r').innerHTML = `A ${n}-bit ripple adder needs about 2 gate delays per bit for the carry: ≈ ${2 * n + 1} gate delays = <b>${(ripple / 1000).toFixed(2)} ns</b>. One clock cycle at ${f} GHz lasts <b>${(cyc / 1000).toFixed(3)} ns</b>. ` +
        (ripple > cyc ? `<span class="bad">The ripple adder is ${(ripple / cyc).toFixed(1)}× too slow</span>: the CPU would read a half-finished sum.` : `<span class="ok">Fits in one cycle.</span>`) +
        ` A lookahead/prefix adder needs only ~${2 * Math.ceil(Math.log2(n)) + 3} gate delays (${(fast / 1000).toFixed(2)} ns). (Rough model for intuition, not real chip data.)`;
    }
    ['w', 'd', 'f'].forEach((id) => ($(id).oninput = upd));
    upd();
  };
  const RIPPLE_EX = (solved) => {
    const parts = [
      "{ id: 'A', type: 'NUMIN', label: 'A', x: 40, y: 20 }",
      "{ id: 'B', type: 'NUMIN', label: 'B', x: 40, y: 260 }",
      "{ id: 'S', type: 'NUMOUT', bits: 5, label: 'SUM', x: 640, y: 150 }",
    ];
    let wires = '';
    if (solved) {
      const w = [];
      for (let k = 0; k < 4; k++) {
        parts.push(`{ id: 'f${k}', type: 'FA', x: 340, y: ${105 * k + 10} }`);
        w.push(`['A.${k}','f${k}.A',{mx:${240 - 10 * k}}]`, `['B.${k}','f${k}.B',{mx:${260 + 10 * k}}]`, `['f${k}.S','S.${k}',{mx:${k < 2 ? 590 - 20 * k : 550 + 20 * (k - 2)}}]`);
        if (k) w.push(`['f${k - 1}.Cout','f${k}.Cin',{pts:[[450,${105 * (k - 1) + 70}],[450,${105 * k}],[325,${105 * k}],[325,${105 * k + 80}]]}]`);
      }
      w.push("['f3.Cout','S.4',{mx:610}]");
      wires = 'wires: [' + w.join(',') + '],';
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 4-bit adder from FA chips',
  intro: 'SUM (5 bits) must equal A + B for all 256 pairs. Bit 0 of a number is the top pin (b0 = least significant).',
  build: { palette: ['FA', 'HA', 'XOR', 'AND', 'OR'], best: 4 },
  w: 760, h: 460,
  target: ({ A, B }) => ({ SUM: A + B }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // twos-complement
  // =====================================================================
  const WHEEL_HTML = `<style>
.wh{font:14px system-ui;color:#1e293b;display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start}
.wh .side{flex:1;min-width:300px;display:flex;flex-direction:column;gap:8px}
.wh button{font:600 13px system-ui;padding:5px 11px;border-radius:7px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer;margin:0 4px 4px 0}
.wh button.neg{background:#ede9fe;border-color:#a78bfa}
.wh .big{font:800 26px ui-monospace,Menlo,monospace;letter-spacing:3px}
.wh .card{padding:8px 12px;border-radius:8px;background:#f1f5f9}
.wh .log{font:12.5px ui-monospace,Menlo,monospace;background:#0f172a;color:#e2e8f0;border-radius:8px;padding:8px 10px;height:150px;overflow:auto;white-space:pre-wrap}
.wh .log .w{color:#fca5a5}.wh .log .c{color:#93c5fd}.wh .log .n{color:#c4b5fd}
</style>
<div class="wh"><svg id="sv" width="400" height="400" viewBox="0 0 400 400"></svg>
<div class="side">
<div class="card">Pointer at <span class="big" id="bits"></span><br>unsigned: <b id="u"></b> · signed (two's complement): <b id="s"></b></div>
<div><button data-d="1">+1</button><button data-d="-1">−1</button><button data-d="3">+3</button><button data-d="-3">−3</button><button data-d="5">+5</button>
<button class="neg" id="neg">negate: invert + 1</button></div>
<div class="log" id="log"></div>
<div style="font-size:12.5px;color:#64748b">Outer labels = signed value, inner grey = unsigned. Click any position on the wheel to jump there.</div>
</div></div>`;
  const WHEEL_JS = function () {
    let x = 3, busy = false;
    const sv = document.getElementById('sv'), logEl = document.getElementById('log');
    const sg = (v) => (v >= 8 ? v - 16 : v);
    const b4 = (v) => (v & 15).toString(2).padStart(4, '0');
    const ang = (i) => ((-90 + i * 22.5) * Math.PI) / 180;
    const P = (i, r) => [200 + r * Math.cos(ang(i)), 200 + r * Math.sin(ang(i))];
    function log(t, cls) { logEl.innerHTML += `<span class="${cls || ''}">${t}</span>\n`; logEl.scrollTop = 1e9; }
    function draw(hl) {
      let s = '<circle cx="200" cy="200" r="140" fill="none" stroke="#e2e8f0" stroke-width="14"/>';
      const line = (i, col, txt, ty) => { const [x1, y1] = P(i, 100), [x2, y2] = P(i, 182); return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${col}" stroke-width="3" stroke-dasharray="6 4"/><text x="200" y="${ty}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${col}">${txt}</text>`; };
      s += line(15.5, '#2563eb', 'carry wrap: 15 ↔ 0', 165);
      s += line(7.5, '#dc2626', 'signed overflow: 7 ↔ −8', 245);
      for (let i = 0; i < 16; i++) {
        const [cx, cy] = P(i, 140), [ox, oy] = P(i, 182), [ix, iy] = P(i, 104);
        const on = i === x, h = hl === i;
        s += `<g data-i="${i}" style="cursor:pointer"><circle cx="${cx}" cy="${cy}" r="21" fill="${on ? '#fde047' : h ? '#fef9c3' : i >= 8 ? '#fee2e2' : '#dcfce7'}" stroke="${on ? '#a16207' : '#94a3b8'}" stroke-width="${on ? 3 : 1.2}"/>`;
        s += `<text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="11" font-weight="700" font-family="ui-monospace,Menlo,monospace">${b4(i)}</text></g>`;
        s += `<text x="${ox}" y="${oy + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="${i >= 8 ? '#b91c1c' : '#15803d'}">${sg(i)}</text>`;
        s += `<text x="${ix}" y="${iy + 4}" text-anchor="middle" font-size="10.5" fill="#94a3b8">${i}</text>`;
      }
      s += `<text x="200" y="196" text-anchor="middle" font-size="12" fill="#64748b">4-bit wheel</text><text x="200" y="212" text-anchor="middle" font-size="11" fill="#94a3b8">(like an odometer)</text>`;
      sv.innerHTML = s;
      sv.querySelectorAll('[data-i]').forEach((g) => (g.onclick = () => { if (!busy) { x = +g.dataset.i; draw(); info(); } }));
    }
    function info() {
      document.getElementById('bits').textContent = b4(x);
      document.getElementById('u').textContent = x;
      document.getElementById('s').textContent = sg(x);
    }
    function add(d) {
      if (busy) return;
      busy = true;
      const from = x, raw = from + (d & 15), res = raw & 15;
      const C = raw >> 4, trueSigned = sg(from) + d, V = trueSigned < -8 || trueSigned > 7 ? 1 : 0;
      let step = 0;
      const dir = d > 0 ? 1 : -1;
      const tick = () => {
        if (step === Math.abs(d)) {
          busy = false; draw(); info();
          let msg = `${b4(from)} + ${b4(d)} (${d > 0 ? '+' : ''}${d}) = ${C ? '1 ' : ''}${b4(res)}   signed: ${sg(from)} ${d < 0 ? '−' : '+'} ${Math.abs(d)} → ${sg(res)}`;
          log(msg);
          if (V) log(`  ⚠ crossed the RED line: signed overflow (V=1). True answer ${trueSigned} doesn't fit in −8..7.`, 'w');
          if (C) log(`  carry out C=1 (the unsigned sum ${raw} > 15 wrapped). ${d < 0 ? 'Normal when adding a negative number: ignore it for signed math.' : ''}`, 'c');
          return;
        }
        x = (x + dir + 16) & 15; step++; draw(); info();
        setTimeout(tick, 160);
      };
      tick();
    }
    document.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => add(+b.dataset.d)));
    document.getElementById('neg').onclick = () => {
      if (busy) return;
      const from = x, inv = ~x & 15, res = (inv + 1) & 15;
      busy = true;
      log(`negate ${b4(from)} (${sg(from)}):`, 'n');
      x = inv; draw(); info();
      log(`  ① invert every bit → ${b4(inv)} (= ${sg(inv)}, always −x − 1)`, 'n');
      setTimeout(() => {
        x = res; draw(); info(); busy = false;
        log(`  ② add 1          → ${b4(res)} (= ${sg(res)})` + (from === 8 ? '   ⚠ −(−8) = +8 doesn\'t fit: you get −8 back!' : from === 0 ? '   (−0 = 0: only one zero)' : ''), from === 8 ? 'w' : 'n');
      }, 700);
    };
    draw(); info();
    log('Start at 0011 (3). Try: negate, then +3. Or walk past 7 with +1.');
  };
  const NEG_CIRCUIT = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'X', type: 'NUMIN', label: 'X (signed)', x: 20, y: 30, value: 3, signed: true },
      { id: 'inc', type: 'CHIP', label: '+1', ins: ['I0', 'I1', 'I2', 'I3'], outs: ['O0', 'O1', 'O2', 'O3'], x: 340, y: 80,
        desc: 'Adds 1 (an ADD4 with B = 0 and Cin = 1 would do the same)', fn: (i) => { const v = (i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3] + 1) & 15; return [v & 1, (v >> 1) & 1, (v >> 2) & 1, v >> 3]; } },
      { id: 'N', type: 'NUMOUT', label: '−X', x: 520, y: 80, signed: true },
      { type: 'TEXT', text: '~X (inverted)', x: 252, y: 12, size: 11, color: '#7c3aed', bold: true },
    ];
    const wires = [];
    const XMX = [160, 140, 130, 120], NMX = [300, 280, 280, 300];
    for (let k = 0; k < 4; k++) {
      parts.push({ id: 'n' + k, type: 'NOT', x: 180, y: 70 * k });
      wires.push(['X.' + k, 'n' + k, { mx: XMX[k] }], ['n' + k, 'inc.I' + k, { mx: NMX[k] }], ['inc.O' + k, 'N.' + k]);
    }
    Circ.mount('#c', {
      title: 'Negation circuit: invert, then add 1',
      intro: 'Pick X with ▲▼. Four NOT gates flip every bit, then a +1 box finishes the job.',
      parts, wires,
      onChange(api) {
        const x = api.signed('X'), u = api.get('X'), inv = ~u & 15, n = api.get('−X');
        const s = (v) => (v >= 8 ? v - 16 : v), b = (v) => v.toString(2).padStart(4, '0');
        r.innerHTML = 'X = <code>' + b(u) + '</code> (' + x + ') → invert → <code>' + b(inv) + '</code> (' + s(inv) + ') → +1 → <code>' + b(n) + '</code> = <b>' + s(n) + '</b>' + (u === 8 ? ' ⚠ −(−8) overflows back to −8.' : '');
      },
    });
  };
  const NEG_EX = (solved) => {
    const parts = [
      "{ id: 'X', type: 'NUMIN', label: 'X', x: 40, y: 40, signed: true, value: 3 }",
      "{ id: 'N', type: 'NUMOUT', label: '-X', x: 660, y: 120, signed: true }",
    ];
    let wires = '';
    if (solved) {
      const w = ["['X.0','N.0',{pts:[[140,70],[140,20],[620,20],[620,150]]}]"];
      parts.push("{ id: 'n0', type: 'NOT', x: 200, y: 60 }");
      w.push("['X.0','n0.0',{mx:160}]");
      for (let k = 1; k < 4; k++) {
        parts.push(`{ id: 'n${k}', type: 'NOT', x: 200, y: ${80 * k + 60} }`, `{ id: 'h${k}', type: 'HA', x: 360, y: ${80 * k + 30} }`);
        w.push(`['X.${k}','n${k}.0',{mx:${160 - 10 * k}}]`, `['n${k}','h${k}.B']`, `['h${k}.S','N.${k}',{mx:${560 + 10 * k}}]`);
        w.push(k === 1 ? "['n0','h1.A',{mx:300}]" : `['h${k - 1}.C','h${k}.A',{pts:[[470,${80 * (k - 1) + 80}],[470,${80 * k + 15}],[330,${80 * k + 15}],[330,${80 * k + 60}]]}]`);
      }
      wires = 'wires: [' + w.join(',') + '],';
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: build −X from NOT gates and half adders',
  intro: 'Output must be the two\\'s-complement negative of X for all 16 values (−(−8) is allowed to wrap to −8).',
  build: { palette: ['NOT', 'HA', 'AND', 'XOR'], best: 7 },
  target: ({ X }) => ({ '-X': (16 - X) & 15 }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // subtractor
  // =====================================================================
  const XOR_INV = function () {
    Circ.mount('#c', {
      title: 'XOR as a controllable NOT',
      intro: 'With SUB = 0 the XOR passes B unchanged. With SUB = 1 it outputs NOT B.',
      parts: [
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 0 },
        { id: 's', type: 'IN', label: 'SUB', x: 20, y: 70, value: 1 },
        { id: 'x', type: 'XOR', x: 160, y: 10 },
        { id: 'o', type: 'OUT', label: 'B or NOT B', x: 300, y: 10, color: '#a855f7' },
      ],
      wires: [['b', 'x.0'], ['s', 'x.1', { mx: 110 }], ['x', 'o']],
    });
  };
  const ADDSUB = function () {
    const r = document.getElementById('r');
    const X = 380;
    const parts = [
      { id: 'A', type: 'NUMIN', label: 'A', x: 20, y: 0, value: 5, signed: true },
      { id: 'B', type: 'NUMIN', label: 'B', x: 20, y: 220, value: 3, signed: true },
      { id: 'sub', type: 'IN', label: 'SUB', x: 120, y: 400, value: 1 },
      { id: 'R', type: 'NUMOUT', label: 'RESULT', x: 600, y: 120, signed: true },
      { id: 'co', type: 'OUT', label: 'Cout', x: 600, y: 300, color: '#f59e0b' },
    ];
    const wires = [];
    const AMX = [200, 150, 140, 130], RMX = [540, 520, 520, 540];
    for (let k = 0; k < 4; k++) {
      parts.push({ id: 'fa' + k, type: 'FA', x: X, y: 100 * k }, { id: 'x' + k, type: 'XOR', x: 260, y: 100 * k + 40, showType: false });
      wires.push(['A.' + k, 'fa' + k + '.A', { mx: AMX[k] }], ['B.' + k, 'x' + k + '.0', { mx: 180 + 10 * k }],
        ['sub', 'x' + k + '.1', { pts: [[230, 420], [230, 100 * k + 70]] }], ['x' + k, 'fa' + k + '.B', { mx: 340 }],
        ['fa' + k + '.S', 'R.' + k, { mx: RMX[k] }]);
      if (k) wires.push(['fa' + (k - 1) + '.Cout', 'fa' + k + '.Cin', { pts: [[X + 110, 100 * k - 40], [X + 110, 100 * k - 10], [X - 20, 100 * k - 10], [X - 20, 100 * k + 70]] }]);
    }
    wires.push(['sub', 'fa0.Cin', { pts: [[230, 420], [230, 92], [350, 92], [350, 70]] }], ['fa3.Cout', 'co', { mx: 560 }]);
    parts.push({ type: 'TEXT', text: 'XOR: invert B when SUB = 1', x: 200, y: -10, size: 11, color: '#7c3aed', bold: true },
      { type: 'TEXT', text: 'SUB also = Cin of bit 0 (the "+1")', x: 168, y: 452, size: 11, color: '#7c3aed', bold: true });
    Circ.mount('#c', {
      title: '4-bit adder-subtractor',
      intro: 'SUB = 0: RESULT = A + B. SUB = 1: RESULT = A + (NOT B) + 1 = A − B. All numbers shown as signed (−8..7).',
      parts, wires, scale: 1.1,
      onChange(api) {
        const a = api.signed('A'), b = api.signed('B'), s = api.get('SUB'), res = api.signed('RESULT');
        const ua = api.get('A'), ub = api.get('B');
        const bin = (v) => (v & 15).toString(2).padStart(4, '0');
        const want = s ? a - b : a + b;
        r.innerHTML = (s ? 'SUB = 1: <code>' + bin(ua) + '</code> + <code>' + bin(~ub) + '</code> (NOT B) + 1 = ' : 'SUB = 0: <code>' + bin(ua) + '</code> + <code>' + bin(ub) + '</code> = ') +
          '<code>' + api.get('Cout') + ' ' + bin(api.get('RESULT')) + '</code> → RESULT = <b>' + res + '</b> (' + a + (s ? ' − ' : ' + ') + (b < 0 ? '(' + b + ')' : b) + ' = ' + want + ')' +
          (want !== res ? ' ⚠ overflow: ' + want + ' doesn\'t fit in 4 signed bits.' : ' ✓');
      },
    });
  };
  const ADDSUB_EX = (solved) => {
    const parts = [
      "{ id: 'A', type: 'NUMIN', bits: 2, label: 'A', x: 40, y: 30 }",
      "{ id: 'B', type: 'NUMIN', bits: 2, label: 'B', x: 40, y: 170 }",
      "{ id: 's', type: 'IN', label: 'SUB', x: 40, y: 310 }",
      "{ id: 'R', type: 'NUMOUT', bits: 2, label: 'R', x: 660, y: 130 }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'x0', type: 'XOR', x: 220, y: 160 }", "{ id: 'x1', type: 'XOR', x: 220, y: 240 }",
        "{ id: 'f0', type: 'FA', x: 400, y: 30 }", "{ id: 'f1', type: 'FA', x: 400, y: 170 }");
      wires = "wires: [['A.0','f0.A',{mx:340}],['A.1','f1.A',{mx:310}],['B.0','x0.0',{mx:180}],['B.1','x1.0',{mx:190}],['s','x0.1',{mx:160}],['s','x1.1',{mx:160}],['x0','f0.B',{mx:340}],['x1','f1.B',{mx:350}],['s','f0.Cin',{pts:[[160,330],[160,380],[365,380],[365,100]]}],['f0.Cout','f1.Cin',{pts:[[510,90],[510,150],[385,150],[385,240]]}],['f0.S','R.0',{mx:600}],['f1.S','R.1',{mx:620}]],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 2-bit adder-subtractor',
  intro: 'SUB = 0 → R = A + B. SUB = 1 → R = A − B. Results wrap around in 2 bits (e.g. 0 − 1 = 3 = 11).',
  build: { palette: ['FA', 'XOR', 'NOT', 'AND', 'OR'], best: 4 },
  w: 760, h: 400,
  target: ({ A, B, SUB }) => ({ R: (SUB ? A - B : A + B) & 3 }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // carry-lookahead: two gate-level 4-bit adders, same inputs, compare the delay readout
  // =====================================================================
  const GL_LEFT = function glLeft(parts, wires, ROW) {
    // per bit: switches A_i, B_i (A = 1111, B = 0000 to start) → p_i = A⊕B (XOR), g_i = A·B (AND)
    for (let i = 0; i < 4; i++) {
      const y0 = ROW * i;
      parts.push({ id: 'a' + i, type: 'IN', label: 'A' + i, x: 20, y: y0, value: 1 }, { id: 'b' + i, type: 'IN', label: 'B' + i, x: 20, y: y0 + 60 },
        { id: 'p' + i, type: 'XOR', x: 140, y: y0 + 10, label: 'p' + i }, { id: 'g' + i, type: 'AND', x: 140, y: y0 + 70, label: 'g' + i });
      wires.push(['a' + i, 'p' + i + '.0'], ['b' + i, 'p' + i + '.1', { pts: [[115, y0 + 80], [115, y0 + 40]] }],
        ['b' + i, 'g' + i + '.0'], ['a' + i, 'g' + i + '.1', { pts: [[100, y0 + 20], [100, y0 + 100]] }]);
    }
  };
  const GL_READOUT = function glReadout(api, el, kind) {
    let a = 0, b = 0, s = 0;
    for (let i = 0; i < 4; i++) { a += api.get('A' + i) << i; b += api.get('B' + i) << i; s += api.get('S' + i) << i; }
    s += api.get('C4') << 4;
    el.innerHTML = 'A = ' + a + ', B = ' + b + ' → SUM = <b>' + s + '</b> (C4 S3 S2 S1 S0 = <code>' + s.toString(2).padStart(5, '0') + '</code>). ' + (api.delays ? kind + ' settled after <b>' + api.delays + '</b> gate delays.' : 'Click B0 to measure the delay.');
  };
  const CLA_RIPPLE = function () {
    const r = document.getElementById('r');
    const ROW = 160, parts = [], wires = [];
    glLeft(parts, wires, ROW);
    parts.push({ id: 'c0', type: 'CONST', value: 0, label: 'Cin', x: 220, y: -60 });
    for (let i = 0; i < 4; i++) {
      const y0 = ROW * i;
      parts.push({ id: 's' + i, type: 'XOR', x: 300, y: y0 }, { id: 't' + i, type: 'AND', x: 300, y: y0 + 60 }, { id: 'o' + i, type: 'OR', x: 420, y: y0 + 70, label: 'c' + (i + 1) },
        { id: 'S' + i, type: 'OUT', label: 'S' + i, x: 420, y: y0, color: '#3b82f6' });
      wires.push(['p' + i, 's' + i + '.0', { pts: [[240, y0 + 30], [240, y0 + 10]] }], ['p' + i, 't' + i + '.0', { pts: [[240, y0 + 30], [240, y0 + 70]] }],
        ['t' + i, 'o' + i + '.0'], ['g' + i, 'o' + i + '.1', { pts: [[215, y0 + 90], [215, y0 + 125], [400, y0 + 125], [400, y0 + 100]] }], ['s' + i, 'S' + i]);
      const cin = i ? 'o' + (i - 1) : 'c0';
      const lane = i ? [[495, y0 - 70], [495, y0 - 15], [270, y0 - 15]] : [[270, -40]];
      wires.push([cin, 's' + i + '.1', { pts: lane.concat([[270, y0 + 30]]) }], [cin, 't' + i + '.1', { pts: lane.concat([[270, y0 + 90]]) }]);
    }
    parts.push({ id: 'C4', type: 'OUT', label: 'C4', x: 540, y: 3 * ROW + 70, color: '#f59e0b' });
    wires.push(['o3', 'C4']);
    Circ.mount('#c', {
      title: 'Ripple-carry, gate level (20 gates)',
      intro: 'Starts at A = 1111, B = 0000. Click <b>B0</b> (15 + 1): the carry has to pass through an AND and an OR in every bit.',
      parts, wires, scale: 1, table: false, slowMs: 450,
      onChange(api) { glReadout(api, r, 'Ripple'); },
    });
  };
  const CLA_FAST = function () {
    const r = document.getElementById('r');
    const ROW = 160, parts = [], wires = [];
    glLeft(parts, wires, ROW);
    // rails: vertical buses carrying p/g signals to the lookahead gates
    const RAIL = { g0: 240, p1: 260, g1: 280, p2: 300, g2: 320, p3: 340, g3: 360 };
    const SRCY = (n) => ROW * +n[1] + (n[0] === 'p' ? 30 : 90);
    const TOP = {};
    const tap = (sig, to, y) => { TOP[sig] = Math.min(TOP[sig] === undefined ? 1e9 : TOP[sig], y, SRCY(sig)); wires.push([sig, to, { pts: [[RAIL[sig], SRCY(sig)], [RAIL[sig], y]] }]); };
    const G = (id, type, n, x, y, label) => { parts.push({ id, type, n, x, y, label }); return (k) => y + 10 + 20 * k; };
    // sums: S0 = p0; Si = pi XOR ci
    parts.push({ id: 'S0', type: 'OUT', label: 'S0', x: 780, y: 10, color: '#3b82f6' });
    wires.push(['p0', 'S0']);
    // c1 = g0
    const s1 = G('s1', 'XOR', 2, 660, ROW + 20, 'S1 = p1⊕c1');
    wires.push(['p1', 's1.0']); tap('g0', 's1.1', s1(1));
    // c2 = g1 + p1·g0
    const t21 = G('t21', 'AND', 2, 420, 2 * ROW + 70, 'p1·g0');
    tap('p1', 't21.0', t21(0)); tap('g0', 't21.1', t21(1));
    const o2 = G('o2', 'OR', 2, 540, 2 * ROW + 40, 'c2');
    tap('g1', 'o2.0', o2(0)); wires.push(['t21', 'o2.1', { mx: 510 }]);
    const s2 = G('s2', 'XOR', 2, 660, 2 * ROW + 20, 'S2');
    wires.push(['p2', 's2.0'], ['o2', 's2.1', { mx: 630 }]);
    // c3 = g2 + p2·g1 + p2·p1·g0
    const o3 = G('o3', 'OR', 3, 540, 3 * ROW + 40, 'c3');
    const t31 = G('t31', 'AND', 2, 420, 3 * ROW + 60, 'p2·g1');
    const t32 = G('t32', 'AND', 3, 420, 3 * ROW + 120, 'p2·p1·g0');
    tap('g2', 'o3.0', o3(0)); tap('p2', 't31.0', t31(0)); tap('g1', 't31.1', t31(1));
    tap('p2', 't32.0', t32(0)); tap('p1', 't32.1', t32(1)); tap('g0', 't32.2', t32(2));
    wires.push(['t31', 'o3.1', { mx: 510 }], ['t32', 'o3.2', { mx: 520 }]);
    const s3 = G('s3', 'XOR', 2, 660, 3 * ROW + 20, 'S3');
    wires.push(['p3', 's3.0'], ['o3', 's3.1', { mx: 630 }]);
    // c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0   (placed up top, computed in parallel)
    const o4 = G('o4', 'OR', 4, 540, 50, 'c4');
    const t43 = G('t43', 'AND', 4, 420, 90, 'p3·p2·p1·g0');
    const t42 = G('t42', 'AND', 3, 420, 230, 'p3·p2·g1');
    const t41 = G('t41', 'AND', 2, 420, 450, 'p3·g2');
    tap('g3', 'o4.0', o4(0));
    tap('p3', 't43.0', t43(0)); tap('p2', 't43.1', t43(1)); tap('p1', 't43.2', t43(2)); tap('g0', 't43.3', t43(3));
    tap('p3', 't42.0', t42(0)); tap('p2', 't42.1', t42(1)); tap('g1', 't42.2', t42(2));
    tap('p3', 't41.0', t41(0)); tap('g2', 't41.1', t41(1));
    wires.push(['t43', 'o4.1', { mx: 510 }], ['t42', 'o4.2', { mx: 520 }], ['t41', 'o4.3', { mx: 530 }]);
    for (let i = 1; i < 4; i++) { parts.push({ id: 'S' + i, type: 'OUT', label: 'S' + i, x: 780, y: ROW * i + 20, color: '#3b82f6' }); wires.push(['s' + i, 'S' + i]); }
    parts.push({ id: 'C4', type: 'OUT', label: 'C4', x: 780, y: 80, color: '#f59e0b' });
    wires.push(['o4', 'C4']);
    Object.keys(RAIL).forEach((k) => parts.push({ type: 'TEXT', text: k, x: RAIL[k] + 3, y: TOP[k] - 3, size: 10, color: '#7c3aed', bold: true }));
    Circ.mount('#c', {
      title: 'Carry-lookahead, gate level (also 20 gates)',
      intro: 'Same inputs, same start (A = 1111, B = 0000). Click <b>B0</b> and compare the delay count with the ripple adder.',
      parts, wires, scale: 0.9, table: false, slowMs: 450,
      onChange(api) { glReadout(api, r, 'Lookahead'); },
    });
  };
  const CLA_EX_HTML = `<style>
.cx{font:14px system-ui;color:#1e293b}.cx table{border-collapse:collapse;margin:8px 0}.cx td,.cx th{border:1px solid #e2e8f0;padding:5px 10px;text-align:center}
.cx th{background:#f1f5f9}.cx button.b{font:700 14px ui-monospace,Menlo,monospace;width:30px;height:28px;border-radius:6px;border:1px solid #94a3b8;background:#e5e7eb;cursor:pointer}
.cx button.b.one{background:#16a34a;color:#fff;border-color:#15803d}.cx select{font:600 14px system-ui;padding:3px 6px;border-radius:6px}
.cx .chk{font:700 14px system-ui;padding:6px 16px;border-radius:8px;border:1px solid #16a34a;background:#16a34a;color:#fff;cursor:pointer}
.cx .circ-result{margin-top:8px;padding:8px 12px;border-radius:8px}.cx .circ-result:empty{display:none}
.cx .circ-result.ok{background:#dcfce7;color:#14532d;border:1px solid #86efac}.cx .circ-result.bad{background:#fee2e2;color:#7f1d1d;border:1px solid #fca5a5}
</style>
<div class="cx"><div>Numbers: <b>A = <span id="av"></span></b>, <b>B = <span id="bv"></span></b> (click bits to change)</div>
<table id="t"></table>
<button class="chk" id="chk">✔ Check</button><div class="circ-result" id="res"></div></div>`;
  const CLA_EX_JS = function (init) {
    let A = 0b1011, B = 0b0110;
    const ans = JSON.parse(JSON.stringify(init)); // ans.g[i], ans.p[i], ans.c[i] (i = 1..4) as 'G','K','P' choices or 0/1
    const t = document.getElementById('t');
    const bit = (v, i) => (v >> i) & 1;
    function render() {
      document.getElementById('av').textContent = A; document.getElementById('bv').textContent = B;
      let h = '<tr><th>bit i</th>' + [3, 2, 1, 0].map((i) => `<th>${i}</th>`).join('') + '</tr>';
      h += '<tr><td>A<sub>i</sub></td>' + [3, 2, 1, 0].map((i) => `<td><button class="b ${bit(A, i) ? 'one' : ''}" data-v="A" data-i="${i}">${bit(A, i)}</button></td>`).join('') + '</tr>';
      h += '<tr><td>B<sub>i</sub></td>' + [3, 2, 1, 0].map((i) => `<td><button class="b ${bit(B, i) ? 'one' : ''}" data-v="B" data-i="${i}">${bit(B, i)}</button></td>`).join('') + '</tr>';
      const sel = (k, i) => `<select data-k="${k}" data-i="${i}">${['?', '0', '1'].map((o) => `<option ${String(ans[k][i]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select>`;
      h += '<tr><td>g<sub>i</sub> = A·B (generate)</td>' + [3, 2, 1, 0].map((i) => `<td>${sel('g', i)}</td>`).join('') + '</tr>';
      h += '<tr><td>p<sub>i</sub> = A⊕B (propagate)</td>' + [3, 2, 1, 0].map((i) => `<td>${sel('p', i)}</td>`).join('') + '</tr>';
      h += '<tr><td>carry into bit i+1: c<sub>i+1</sub></td>' + [3, 2, 1, 0].map((i) => `<td>${sel('c', i)}</td>`).join('') + '</tr>';
      t.innerHTML = h;
      t.querySelectorAll('button.b').forEach((b) => (b.onclick = () => { if (b.dataset.v === 'A') A ^= 1 << +b.dataset.i; else B ^= 1 << +b.dataset.i; render(); }));
      t.querySelectorAll('select').forEach((s) => (s.onchange = () => { ans[s.dataset.k][+s.dataset.i] = s.value; }));
    }
    document.getElementById('chk').onclick = () => {
      const res = document.getElementById('res');
      const errs = [];
      let c = 0;
      for (let i = 0; i < 4; i++) {
        const g = bit(A, i) & bit(B, i), p = bit(A, i) ^ bit(B, i);
        c = g | (p & c);
        if (String(ans.g[i]) !== String(g)) errs.push(`g${i} should be ${g} (A${i}·B${i} = ${bit(A, i)}·${bit(B, i)})`);
        if (String(ans.p[i]) !== String(p)) errs.push(`p${i} should be ${p} (A${i}⊕B${i})`);
        if (String(ans.c[i]) !== String(c)) errs.push(`c${i + 1} should be ${c} (= g${i} + p${i}·c${i})`);
      }
      if (!errs.length) {
        res.className = 'circ-result ok';
        res.innerHTML = `✅ All 12 values right. Check: ${A} + ${B} = ${A + B}, and the sum bits are p<sub>i</sub> ⊕ c<sub>i</sub>. Lookahead hardware computes every c<sub>i+1</sub> from the g and p rows <i>at once</i>.`;
        console.log('✅ Check passed: generate/propagate table correct');
      } else {
        res.className = 'circ-result bad';
        res.innerHTML = '❌ ' + errs.length + ' wrong:<br>' + errs.slice(0, 6).join('<br>');
        console.log('❌ Check failed: ' + errs.length + ' wrong');
      }
    };
    render();
  };
  const CLA_EX = (solved) => {
    if (!solved) return CUSTOM(CLA_EX_HTML, CLA_EX_JS, { g: ['?', '?', '?', '?'], p: ['?', '?', '?', '?'], c: ['?', '?', '?', '?'] });
    // A = 1011, B = 0110: g = 0010 → g[i]: i0:0 i1:1 i2:0 i3:0 ; p = 1101 → i0:1 i1:0 i2:1 i3:1 ; carries c1..c4: 0,1,1,1
    return CUSTOM(CLA_EX_HTML, CLA_EX_JS, { g: [0, 1, 0, 0], p: [1, 0, 1, 1], c: [0, 1, 1, 1] });
  };

  // =====================================================================
  // alu
  // =====================================================================
  const ALU_BLOCK = function () {
    const r = document.getElementById('r');
    const OPS = ['ADD', 'SUB', 'AND', 'OR'];
    const parts = [
      { id: 'A', type: 'NUMIN', label: 'A', x: 20, y: 20, value: 6 },
      { id: 'B', type: 'NUMIN', label: 'B', x: 20, y: 150, value: 3 },
      { id: 'op', type: 'NUMIN', bits: 2, label: 'OP (OP1 OP0)', x: 20, y: 290 },
      { id: 'alu', type: 'ALU4', x: 240, y: 20 },
      { id: 'R', type: 'NUMOUT', label: 'R', x: 420, y: 40 },
    ];
    const wires = [];
    const FL = ['Z', 'N', 'C', 'V'], FY = [175, 220, 265, 310], FMX = [380, 370, 360, 350], FC = ['#0ea5e9', '#a855f7', '#f59e0b', '#ef4444'];
    for (let k = 0; k < 4; k++) {
      wires.push(['A.' + k, 'alu.A' + k], ['B.' + k, 'alu.B' + k, { mx: 140 + 10 * k }], ['alu.R' + k, 'R.' + k]);
      parts.push({ id: 'f' + FL[k], type: 'OUT', label: FL[k], x: 420, y: FY[k], color: FC[k] });
      wires.push(['alu.' + FL[k], 'f' + FL[k], { mx: FMX[k] }]);
    }
    wires.push(['op.0', 'alu.OP0', { mx: 190 }], ['op.1', 'alu.OP1', { mx: 200 }]);
    Circ.mount('#c', {
      title: 'A 4-bit ALU as one chip',
      intro: 'OP picks the operation: <b>0 = ADD, 1 = SUB, 2 = AND, 3 = OR</b>. The four flag LEDs describe the result.',
      parts, wires,
      onChange(api) {
        const a = api.get('A'), b = api.get('B'), op = api.get('op'), R = api.get('R');
        const bin = (v) => v.toString(2).padStart(4, '0'), sg = (v) => (v >= 8 ? v - 16 : v);
        const sym = ['+', '−', 'AND', 'OR'][op];
        r.innerHTML = 'OP = ' + op + ' → <b>' + OPS[op] + '</b>: <code>' + bin(a) + ' ' + sym + ' ' + bin(b) + ' = ' + bin(R) + '</code>' +
          (op < 2 ? ' (unsigned ' + a + ' ' + sym + ' ' + b + ' → ' + R + ', signed ' + sg(a) + ' ' + sym + ' ' + sg(b) + ' → ' + sg(R) + ')' : '') +
          '<br>Flags: Z=' + api.get('Z') + ' (result is zero?) · N=' + api.get('N') + ' (bit 3 set: negative if signed) · C=' + api.get('C') + ' (carry out of the adder) · V=' + api.get('V') + ' (signed overflow)';
      },
    });
  };
  const ALU_LOGIC = function () {
    Circ.mount('#c', {
      title: 'Inside an ALU: compute everything, then select',
      intro: 'Both the AND and the OR are always computing. The <b>MUX</b> (from the multiplexer lesson) picks which answer leaves, based on OP.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0, value: 1 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 80 },
        { id: 'op', type: 'IN', label: 'OP', x: 20, y: 180 },
        { id: 'and', type: 'AND', x: 160, y: 10 },
        { id: 'or', type: 'OR', x: 160, y: 90 },
        { id: 'm', type: 'MUX2', x: 320, y: 40 },
        { id: 'r', type: 'OUT', label: 'R', x: 470, y: 70, color: '#f59e0b' },
        { type: 'TEXT', text: 'OP = 0 → AND, OP = 1 → OR', x: 300, y: 152, size: 11, color: '#7c3aed', bold: true },
      ],
      wires: [['a', 'and.0'], ['b', 'and.1', { mx: 120 }], ['b', 'or.0'], ['a', 'or.1', { mx: 100 }],
        ['and', 'm.A', { mx: 260 }], ['or', 'm.B', { mx: 270 }], ['op', 'm.S', { mx: 290 }], ['m', 'r']],
    });
  };
  const ALU_EX = (solved) => {
    const parts = [
      "{ id: 'a', type: 'IN', label: 'A', x: 40, y: 20 }",
      "{ id: 'b', type: 'IN', label: 'B', x: 40, y: 90 }",
      "{ id: 'ci', type: 'IN', label: 'Cin', x: 40, y: 160 }",
      "{ id: 'o0', type: 'IN', label: 'OP0', x: 40, y: 250 }",
      "{ id: 'o1', type: 'IN', label: 'OP1', x: 40, y: 330 }",
      "{ id: 'r', type: 'OUT', label: 'R', x: 680, y: 130, color: '#f59e0b' }",
      "{ id: 'co', type: 'OUT', label: 'Cout', x: 680, y: 250, color: '#ef4444' }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'x', type: 'XOR', x: 180, y: 120 }", "{ id: 'fa', type: 'FA', x: 300, y: 10 }",
        "{ id: 'and', type: 'AND', x: 300, y: 150 }", "{ id: 'or', type: 'OR', x: 300, y: 230 }",
        "{ id: 'm1', type: 'MUX2', x: 440, y: 170 }", "{ id: 'm2', type: 'MUX2', x: 560, y: 90 }");
      wires = "wires: [['b','x.0',{mx:120}],['o0','x.1',{mx:130}],['a','fa.A',{mx:250}],['x','fa.B',{mx:260}],['ci','fa.Cin',{mx:150}],['a','and.0',{mx:100}],['b','and.1',{mx:110}],['a','or.0',{mx:100}],['b','or.1',{mx:110}],['and','m1.A',{mx:390}],['or','m1.B',{mx:400}],['o0','m1.S',{pts:[[140,270],[140,300],[420,300],[420,240]]}],['fa.S','m2.A',{mx:510}],['m1','m2.B',{mx:540}],['o1','m2.S',{pts:[[530,350],[530,160]]}],['m2','r'],['fa.Cout','co',{mx:650}]],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 1-bit ALU slice',
  intro: 'OP1 OP0 = 00 → R = sum bit of A + B + Cin, Cout = its carry · 01 → A + (NOT B) + Cin (subtract) · 10 → A AND B · 11 → A OR B. (Cout is only checked for 00 and 01.)',
  build: { palette: ['FA', 'MUX2', 'XOR', 'AND', 'OR', 'NOT'], best: 6 },
  w: 780, h: 400,
  target: ({ A, B, Cin, OP0, OP1 }) => { if (OP1) return { R: OP0 ? A | B : A & B }; const s = A + (B ^ OP0) + Cin; return { R: s & 1, Cout: s >> 1 }; },
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // flags
  // =====================================================================
  const FLAGS_HTML = `<style>
.fx{font:14px system-ui;color:#1e293b}.fx .row{display:flex;align-items:center;gap:8px;margin:4px 0;flex-wrap:wrap}
.fx .op button,.fx .pre button{font:600 13px system-ui;padding:4px 10px;border-radius:6px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer}
.fx .op button.on{background:#0f766e;color:#fff;border-color:#0f766e}
.fx table.sum{border-collapse:collapse;margin:6px 0}
.fx table.sum td{padding:2px 3px;text-align:center;font:700 15px ui-monospace,Menlo,monospace;height:32px}
.fx table.sum td.l{font:700 14px system-ui;text-align:right;padding-right:10px;min-width:60px}
.fx table.sum td.v{font:13px system-ui;color:#475569;text-align:left;padding-left:14px}
.fx table.sum tr.car td{color:#d97706;font-size:12.5px;height:20px}
.fx table.sum tr.res td{border-top:2px solid #334155}
.fx table.sum tr.res td.l,.fx table.sum tr.res td.v{border-top:0}
.fx button.b{font:700 15px ui-monospace,Menlo,monospace;width:32px;height:30px;border-radius:6px;border:1px solid #94a3b8;background:#e5e7eb;cursor:pointer;padding:0}
.fx button.b.one{background:#16a34a;color:#fff;border-color:#15803d}
.fx .flags{display:grid;grid-template-columns:repeat(4,minmax(150px,1fr));gap:8px;margin-top:8px}
.fx .flag{border:2px solid #e2e8f0;border-radius:10px;padding:6px 10px;background:#fff;font-size:12.5px}
.fx .flag b.n{display:block;font-size:18px}.fx .flag.on{border-color:#f59e0b;background:#fffbeb}
</style>
<div class="fx">
<div class="row op"><b>op</b><button data-op="add">A + B</button><button data-op="sub">A − B</button>
<span class="pre" style="margin-left:14px">presets: <button data-p="7,1,add">7 + 1</button> <button data-p="15,1,add">15 + 1</button> <button data-p="8,15,add">−8 + −1</button> <button data-p="3,4,add">3 + 4</button> <button data-p="5,3,sub">5 − 3</button> <button data-p="3,5,sub">3 − 5</button> <button data-p="8,1,sub">−8 − 1</button></span></div>
<table class="sum" id="tb"></table>
<div class="flags" id="fl"></div></div>`;
  const FLAGS_JS = function () {
    let A = 7, B = 1, op = 'add';
    const $ = (id) => document.getElementById(id);
    const sg = (v) => (v >= 8 ? v - 16 : v);
    const bits = (v) => [3, 2, 1, 0].map((k) => (v >> k) & 1);
    function render() {
      const bb = op === 'sub' ? ~B & 15 : B, cin = op === 'sub' ? 1 : 0;
      const car = [cin];
      for (let k = 0; k < 4; k++) car.push((((A >> k) & 1) + ((bb >> k) & 1) + car[k]) >> 1);
      const raw = A + bb + cin, R = raw & 15;
      const C = raw >> 4, Z = R === 0 ? 1 : 0, N = R >> 3;
      const sTrue = op === 'add' ? sg(A) + sg(B) : sg(A) - sg(B);
      const uTrue = op === 'add' ? A + B : A - B;
      const V = sTrue !== sg(R) ? 1 : 0;
      const btn = (v, who) => bits(v).map((b, i) => `<td><button class="b ${b ? 'one' : ''}" data-w="${who}" data-k="${3 - i}">${b}</button></td>`).join('');
      // columns: label | carry-out | b3 b2 b1 b0 | info
      let h = `<tr class="car"><td class="l">carries</td><td title="carry out of bit 3">${car[4]}</td>${[3, 2, 1, 0].map((k) => `<td title="carry into bit ${k}">${k ? car[k] : cin ? '+1' : '0'}</td>`).join('')}<td class="v">${op === 'sub' ? 'Cin = 1 (the +1 of −B)' : ''}</td></tr>`;
      h += `<tr><td class="l">A</td><td></td>${btn(A, 'A')}<td class="v">unsigned ${A} · signed ${sg(A)}</td></tr>`;
      h += `<tr><td class="l">${op === 'add' ? '+ B' : '− B'}</td><td></td>${btn(B, 'B')}<td class="v">unsigned ${B} · signed ${sg(B)}${op === 'sub' ? ` → adder gets NOT B = ${bits(bb).join('')}` : ''}</td></tr>`;
      h += `<tr class="res"><td class="l">result</td><td style="color:#d97706" title="carry out">${C}</td>${bits(R).map((b) => `<td>${b}</td>`).join('')}<td class="v">unsigned ${R} (true: ${uTrue}) · signed ${sg(R)} (true: ${sTrue})</td></tr>`;
      $('tb').innerHTML = h;
      document.querySelectorAll('[data-op]').forEach((b) => b.classList.toggle('on', b.dataset.op === op));
      const f = (name, v, on, off) => `<div class="flag ${v ? 'on' : ''}"><b class="n">${name} = ${v}</b>${v ? on : off}</div>`;
      $('fl').innerHTML =
        f('Z', Z, 'result is 0000', 'result is not zero') +
        f('N', N, 'top bit is 1 (negative if you read it as signed)', 'top bit is 0') +
        f('C', C, op === 'add' ? 'carry out: the <b>unsigned</b> sum didn\'t fit (> 15)' : 'carry out = 1: no borrow, A ≥ B as unsigned', op === 'add' ? 'no carry: unsigned result is correct' : 'carry out = 0: borrow! A < B as unsigned') +
        f('V', V, '<b>signed</b> overflow: true result ' + sTrue + ' is outside −8..7', 'signed result is correct');
      document.querySelectorAll('button.b').forEach((b) => (b.onclick = () => { if (b.dataset.w === 'A') A ^= 1 << +b.dataset.k; else B ^= 1 << +b.dataset.k; render(); }));
    }
    document.querySelectorAll('[data-op]').forEach((b) => (b.onclick = () => { op = b.dataset.op; render(); }));
    document.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { const [a, c, o] = b.dataset.p.split(','); A = +a; B = +c; op = o; render(); }));
    render();
  };
  const BRANCH_HTML = `<style>
.br{font:14px system-ui;color:#1e293b;display:flex;gap:18px;flex-wrap:wrap}
.br .col{min-width:300px;flex:1}
.br pre{background:#0f172a;color:#e2e8f0;padding:10px 12px;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;margin:6px 0}
.br .k{color:#93c5fd}.br .cm{color:#64748b}
.br button.b{font:700 15px ui-monospace,Menlo,monospace;width:30px;height:28px;border-radius:6px;border:1px solid #94a3b8;background:#e5e7eb;cursor:pointer;padding:0}
.br button.b.one{background:#16a34a;color:#fff;border-color:#15803d}
.br table{border-collapse:collapse;font-size:13px}.br td,.br th{border:1px solid #e2e8f0;padding:3px 8px}.br th{background:#f1f5f9}
.br tr.yes td{background:#dcfce7;font-weight:600}.br .fl span{display:inline-block;margin-right:8px;padding:2px 8px;border-radius:6px;background:#e2e8f0;font:700 13px ui-monospace,Menlo,monospace}
.br .fl span.on{background:#f59e0b;color:#fff}
</style>
<div class="br"><div class="col">
<div>a = <span id="ba"></span> <span id="va"></span></div><div style="margin-top:4px">b = <span id="bb"></span> <span id="vb"></span></div>
<pre><span class="cm">// C source</span>
<span class="k">if</span> (a &lt; b) { … }

<span class="cm">// ARM assembly: the compiler emits ONE of the two</span>
<span class="cm">// branches below, chosen by the variables' type</span>
CMP  r0, r1      <span class="cm">; compute a − b, keep only the flags</span>
<span id="br1"></span></pre>
<div class="fl" id="fl"></div></div>
<div class="col"><b>Conditional branches after CMP a, b</b><table id="t"></table></div></div>`;
  const BRANCH_JS = function () {
    let a = 0b1111, b = 0b0001;
    const $ = (id) => document.getElementById(id);
    const sg = (v) => (v >= 8 ? v - 16 : v);
    function render() {
      const raw = a + (~b & 15) + 1, R = raw & 15;
      const C = raw >> 4, Z = R === 0 ? 1 : 0, N = R >> 3, V = sg(a) - sg(b) !== sg(R) ? 1 : 0;
      const btns = (v, w) => [3, 2, 1, 0].map((k) => `<button class="b ${(v >> k) & 1 ? 'one' : ''}" data-w="${w}" data-k="${k}">${(v >> k) & 1}</button>`).join('');
      $('ba').innerHTML = btns(a, 'a'); $('bb').innerHTML = btns(b, 'b');
      $('va').textContent = ` = ${a} unsigned / ${sg(a)} signed`; $('vb').textContent = ` = ${b} unsigned / ${sg(b)} signed`;
      $('fl').innerHTML = 'Flags of a − b = ' + R.toString(2).padStart(4, '0') + ': ' + [['N', N], ['Z', Z], ['C', C], ['V', V]].map(([n, v]) => `<span class="${v ? 'on' : ''}">${n}=${v}</span>`).join('');
      const rows = [
        ['BEQ', 'a == b', 'Z = 1', Z === 1],
        ['BNE', 'a != b', 'Z = 0', Z === 0],
        ['BLT', 'a < b  (signed int)', 'N ≠ V', N !== V],
        ['BGE', 'a >= b (signed int)', 'N = V', N === V],
        ['BLO', 'a < b  (unsigned)', 'C = 0', C === 0],
        ['BHS', 'a >= b (unsigned)', 'C = 1', C === 1],
      ];
      $('t').innerHTML = '<tr><th>instr.</th><th>means</th><th>tests</th><th>taken?</th></tr>' + rows.map(([i, m, t, y]) => `<tr class="${y ? 'yes' : ''}"><td><code>${i}</code></td><td>${m}</td><td>${t}</td><td>${y ? '✅ jump' : '—'}</td></tr>`).join('');
      const sLt = sg(a) < sg(b), uLt = a < b;
      $('br1').innerHTML = `BLT  inside      <span class="cm">; int a, b:      ${sg(a)} &lt; ${sg(b)}? ${sLt ? 'yes → jump' : 'no'}</span>\nBLO  inside      <span class="cm">; unsigned a, b: ${a} &lt; ${b}? ${uLt ? 'yes → jump' : 'no'}</span>`;
      document.querySelectorAll('button.b').forEach((x) => (x.onclick = () => { if (x.dataset.w === 'a') a ^= 1 << +x.dataset.k; else b ^= 1 << +x.dataset.k; render(); }));
    }
    render();
  };
  const FLAGS_EX = (solved) => {
    let extra = '', wires = '';
    if (solved) {
      extra = ",\n    { id: 'x1', type: 'XOR', x: 520, y: 220 }, { id: 'x2', type: 'XOR', x: 520, y: 300 }, { id: 'g', type: 'AND', x: 640, y: 260 }";
      wires = ",['A.3','x1.0',{pts:[[140,110],[140,230]]}],['add.S3','x1.1',{mx:440}],['B.3','x2.1',{pts:[[230,250],[230,330]]}],['add.S3','x2.0',{mx:440}],['x1','g.0',{mx:600}],['x2','g.1',{mx:600}],['g','v',{mx:710}]";
    }
    return `<div id="c"></div>
<script>
(${DEF_ADD4.toString()})();
const wires = [];
for (let k = 0; k < 4; k++) wires.push(['A.' + k, 'add.A' + k], ['B.' + k, 'add.B' + k, { mx: 160 + 10 * k }], ['add.S' + k, 'S.' + k]);
Circ.mount('#c', {
  title: 'Puzzle: build the V (signed overflow) flag',
  intro: 'The adder is done. Add gates that light <b>V</b> exactly when A + B overflows as a signed number. Use the sign bits: A.b3, B.b3 and the adder\\'s S3 output pin.',
  build: { palette: ['XOR', 'XNOR', 'AND', 'OR', 'NOT'], best: 3 },
  w: 820, h: 420,
  target: ({ A, B }) => { const s = (v) => (v >= 8 ? v - 16 : v); const t = s(A) + s(B); return { V: t < -8 || t > 7 ? 1 : 0 }; },
  parts: [
    { id: 'A', type: 'NUMIN', label: 'A', x: 40, y: 20, signed: true, value: 7 },
    { id: 'B', type: 'NUMIN', label: 'B', x: 40, y: 160, signed: true, value: 1 },
    { id: 'add', type: 'ADD4', x: 260, y: 20, fixed: true },
    { id: 'S', type: 'NUMOUT', label: 'SUM', x: 460, y: 60, signed: true },
    { id: 'v', type: 'OUT', label: 'V', x: 740, y: 260, color: '#ef4444' }${extra}
  ],
  wires: wires.concat([${wires.replace(/^,/, '')}]),
});
<\/script>`;
  };

  // =====================================================================
  // LESSONS
  // =====================================================================
  window.LESSONS.push(
    {
      id: 'half-adder',
      section: 'Arithmetic',
      title: 'Half adder: 1 + 1 = 10',
      explain: `
        <p>Time to make the gates do <strong>math</strong>. Start with the smallest possible addition: two single bits.</p>
        <pre><code>0 + 0 = 0      →  00
0 + 1 = 1      →  01
1 + 0 = 1      →  01
1 + 1 = 2      →  10   ("one-zero": write 0, carry 1)</code></pre>
        <p>The answer needs <strong>two</strong> bits: a <strong>sum</strong> bit S (right) and a <strong>carry</strong> bit C (left). It's the same as decimal 5 + 5 = 10: write 0, carry 1. Now look at each column of the table as its own truth table:</p>
        <ul>
          <li><strong>S</strong> is 1 when exactly one input is 1: that's <strong>XOR</strong>.</li>
          <li><strong>C</strong> is 1 only when both are 1: that's <strong>AND</strong>.</li>
        </ul>
        <p>Two gates. That pair is called a <strong>half adder</strong>. It's "half" because it can't accept a carry coming in from a lower column, so on its own it only works for the rightmost column (try it in the second demo).</p>
        <div class="tip">In code: <code>sum = a ^ b; carry = a &amp; b;</code>. These are the same operators you use for bit tricks in JavaScript and C. A classic puzzle adds two integers with no <code>+</code> at all: repeat <code>(a ^ b, (a &amp; b) &lt;&lt; 1)</code> until the carry is 0. That's a software half adder applied to all bits at once.</div>
        <div class="world">
          <ul>
            <li>Every CPU's ALU is built on adders, and the half adder is the smallest piece. Chains of half adders make <em>incrementers</em> (+1 circuits). A program counter moves to the next instruction this way, and digital counters in clocks and timers do the same.</li>
            <li>Early machines did this with relays and vacuum tubes. Konrad Zuse's Z3 (1941) did binary floating-point arithmetic with about 2,600 telephone relays.</li>
            <li>The same XOR + AND pair shows up in checksum and CRC hardware: network cards and disks compute these on every packet and sector.</li>
          </ul>
        </div>
      `,
      examples: [
        { title: 'Half adder', code: WR(HA_GATES) },
        {
          title: 'Binary addition by hand, column by column',
          code: CUSTOM(COLADD_HTML, COLADD_JS),
          explain: `
            <details>
              <summary>Try this: why the half adder isn't enough</summary>
              <ol>
                <li>Click <b>column ▶</b> to add one column at a time, right to left, like on paper. Click any bit of A or B to change the numbers.</li>
                <li>Column 0 only adds A0 + B0: two inputs, so a half adder works.</li>
                <li>From column 1 on, there are <b>three</b> things to add: A<sub>i</sub>, B<sub>i</sub> and the carry from the right. 1 + 1 + 1 = 3 = binary 11 (write 1, carry 1). A half adder has only two inputs, which is why the next lesson builds the <b>full adder</b>.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'In binary, 1 + 1 equals…', options: ['2', '10', '11', '0 with no carry'], answer: 1, why: 'Two is written 10 in binary: sum bit 0, carry 1.' },
        { q: 'Which gate gives the half adder\'s sum bit?', options: ['AND', 'OR', 'XOR', 'NAND'], answer: 2, why: 'S = 1 exactly when one (not both) of the inputs is 1.' },
        { q: 'Which gate gives the carry?', options: ['AND', 'OR', 'XOR', 'NOR'], answer: 0, why: 'There is a carry only for 1 + 1.' },
        { q: 'Why is it called a "half" adder?', options: ['It adds half a bit', 'It has no carry input, so it only handles the rightmost column', 'It uses half as many transistors as needed', 'It only works half of the time'], answer: 1, why: 'Middle columns must add a carry coming in from the right. That needs three inputs: a full adder.' },
      ],
      exercise: {
        task: `<p>Using only <strong>NAND</strong> gates, build a half adder on the board below: <b>S</b> = A XOR B and <b>C</b> = A AND B. Click <b>✔ Check</b> when done. Best known: 5 NANDs.</p>`,
        hint: 'XOR from NAND takes 4 gates: n1 = NAND(A,B), n2 = NAND(A,n1), n3 = NAND(B,n1), S = NAND(n2,n3). For C you need AND = NOT(NAND). You already have NAND(A,B) = n1, so C = NAND(n1, n1).',
        starter: HA_EX(false),
        solution: HA_EX(true),
      },
    },

    {
      id: 'full-adder',
      section: 'Arithmetic',
      title: 'Full adder: adding three bits',
      explain: `
        <p>Every column except the rightmost has <strong>three</strong> bits to add: A<sub>i</sub>, B<sub>i</sub> and the <strong>carry in</strong> (Cin) from the column to its right. The total is 0 to 3, which still fits in two bits: <strong>Cout S</strong>.</p>
        <table>
          <tr><th>A</th><th>B</th><th>Cin</th><th>total</th><th>Cout</th><th>S</th></tr>
          <tr><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
          <tr><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1</td></tr>
          <tr><td>0</td><td>1</td><td>0</td><td>1</td><td>0</td><td>1</td></tr>
          <tr><td>0</td><td>1</td><td>1</td><td>2</td><td>1</td><td>0</td></tr>
          <tr><td>1</td><td>0</td><td>0</td><td>1</td><td>0</td><td>1</td></tr>
          <tr><td>1</td><td>0</td><td>1</td><td>2</td><td>1</td><td>0</td></tr>
          <tr><td>1</td><td>1</td><td>0</td><td>2</td><td>1</td><td>0</td></tr>
          <tr><td>1</td><td>1</td><td>1</td><td>3</td><td>1</td><td>1</td></tr>
        </table>
        <h3>Build it from two half adders</h3>
        <p>Add in two steps, the way you'd add three numbers by hand: first A + B, then add Cin to that result.</p>
        <ol>
          <li><strong>Half adder 1</strong>: A + B → partial sum <code>A ⊕ B</code> and carry <code>A·B</code>.</li>
          <li><strong>Half adder 2</strong>: partial sum + Cin → final <code>S = A ⊕ B ⊕ Cin</code> and a second carry <code>(A ⊕ B)·Cin</code>.</li>
          <li>If <em>either</em> half adder produced a carry, there's a carry out: <code>Cout = A·B + (A ⊕ B)·Cin</code> (one OR gate).</li>
        </ol>
        <p>That's 5 gates: 2 XOR, 2 AND, 1 OR. Then we put a box around it and call it <strong>FA</strong>. From now on it's one part in your toolbox, just like a function you wrote and can now call.</p>
        <div class="tip">S is the <strong>parity</strong> of the three inputs (1 if an odd number are 1). Cout is the <strong>majority</strong> (1 if at least two are 1): <code>Cout = AB + ACin + BCin</code> is an equivalent formula.</div>
        <div class="world">
          <ul>
            <li>A textbook CMOS "mirror adder" full adder uses <strong>28 transistors</strong>. A 64-bit adder therefore needs thousands of transistors, a tiny fraction of a modern CPU's billions.</li>
            <li>The <a href="https://www.ti.com/product/SN74HC283" target="_blank">74HC283</a> chip contains a 4-bit adder (four full adders with fast internal carry logic) in one package. Hobby CPUs like Ben Eater's 8-bit breadboard computer use two of them.</li>
            <li>Full adders aren't only in the ALU. They fill <em>multiplier</em> arrays (a 64×64-bit multiplier contains thousands of them) and GPU shader cores.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'Full adder from gates',
          code: WR(FA_GATES),
          explain: `
            <details>
              <summary>The problem: three inputs, two outputs</summary>
              <p>A half adder adds two bits, but a middle column has three: A, B and the carry from the right. We can't just widen the XOR and AND. The trick is to add in two steps, the way you'd add 1 + 0 + 1 on paper: first 1 + 0 = 1, then 1 + 1 = 10. Each step is a half adder. At most one of the two steps can produce a carry, so one OR gate combines them.</p>
            </details>
            <details>
              <summary>Step by step: A = 1, B = 0, Cin = 1 (the starting state)</summary>
              <table>
                <tr><th>gate</th><th>computes</th><th>value</th></tr>
                <tr><td>XOR (half adder 1)</td><td>A ⊕ B = 1 ⊕ 0</td><td><b>1</b> (partial sum)</td></tr>
                <tr><td>AND (half adder 1)</td><td>A · B = 1 · 0</td><td>0 (no carry yet)</td></tr>
                <tr><td>XOR (half adder 2)</td><td>partial ⊕ Cin = 1 ⊕ 1</td><td><b>0</b> → S</td></tr>
                <tr><td>AND (half adder 2)</td><td>partial · Cin = 1 · 1</td><td><b>1</b></td></tr>
                <tr><td>OR</td><td>0 + 1</td><td><b>1</b> → Cout</td></tr>
              </table>
              <p>Cout S = <code>10</code> = 2 ✓ (1 + 0 + 1 = 2). The readout under the board tells you which half adder produced the carry.</p>
            </details>
            <details>
              <summary>Try this: count the gate delays</summary>
              <ol>
                <li>Turn on <b>🐢 Slow-mo</b>. With A = 1, B = 0, Cin = 1, click <b>Cin</b> (to 0). The status shows <b>3</b> gate delays: the switch, then half adder 2, then the OR.</li>
                <li>Click Cin back to 1, then click <b>A</b> (to 0). Now it's <b>4</b>: the switch, half adder 1, half adder 2, the OR. A change on A or B has a longer path than a change on Cin.</li>
              </ol>
              <p>The simulator counts the switch itself as the first step. Remember the carry path: when we chain full adders, the carry is the signal that has to travel through every one of them.</p>
            </details>
            <details>
              <summary>Common mistake</summary>
              <p>Using XOR instead of OR for the final gate works too, because the two carries can never both be 1. (If A·B = 1 then A ⊕ B = 0, so the second AND is 0.) But using only <em>one</em> half adder's carry is wrong: with A = 0, B = 1, Cin = 1 the carry comes only from half adder 2.</p>
            </details>
          `,
        },
        { title: 'Now it\'s a chip: FA', code: WR(FA_CHIP) },
      ],
      quiz: [
        { q: 'A full adder receives A = 1, B = 1, Cin = 1. What are Cout and S?', options: ['Cout = 1, S = 0', 'Cout = 1, S = 1', 'Cout = 0, S = 1', 'Cout = 0, S = 0'], answer: 1, why: '1 + 1 + 1 = 3 = binary 11.' },
        { q: 'How do you build a full adder from half adders?', options: ['One half adder and a NOT', 'Two half adders and an OR for the carries', 'Three half adders', 'Two half adders and an AND'], answer: 1, why: 'HA1 adds A + B, HA2 adds Cin; either carry means Cout = 1.' },
        { q: 'S of a full adder equals…', options: ['A·B·Cin', 'A + B + Cin (OR)', 'A ⊕ B ⊕ Cin', 'majority(A, B, Cin)'], answer: 2, why: 'The sum bit is the parity of the three inputs.' },
        { q: 'Cout is 1 when…', options: ['all three inputs are 1', 'at least two inputs are 1', 'exactly one input is 1', 'Cin is 1'], answer: 1, why: 'Two or more ones add up to 2 or 3, which needs the carry bit: Cout is the majority function.' },
      ],
      exercise: {
        task: `<p>Using <strong>XOR, AND and OR</strong>, build a full adder on the board below: <b>Cout S</b> = A + B + Cin. Click <b>✔ Check</b> to test all 8 cases. Best known: 5 gates. Once it passes, it's the same thing as the built-in <b>FA</b> chip you'll use from now on.</p>`,
        hint: 'x1 = A XOR B, S = x1 XOR Cin. Carries: A AND B, and x1 AND Cin. Cout = OR of the two carries.',
        starter: FA_EX(false),
        solution: FA_EX(true),
      },
    },

    {
      id: 'ripple-carry',
      section: 'Arithmetic',
      title: 'Ripple-carry adder',
      explain: `
        <p>To add two 4-bit numbers, do exactly what you do on paper: one full adder per column, and each column's <strong>carry out</strong> wired to the next column's <strong>carry in</strong>. Bit 0's carry in is 0 (nothing comes from the right).</p>
        <pre><code>  A3 B3     A2 B2     A1 B1     A0 B0
   │ │       │ │       │ │       │ │
 ┌─┴─┴─┐   ┌─┴─┴─┐   ┌─┴─┴─┐   ┌─┴─┴─┐
 │ FA3 │◀──│ FA2 │◀──│ FA1 │◀──│ FA0 │◀── 0
 └──┬──┘ c3└──┬──┘ c2└──┬──┘ c1└──┬──┘
 C4 S3        S2        S1        S0</code></pre>
        <p>That's a <strong>ripple-carry adder</strong>. It's simple and small: an n-bit adder is just n full adders. The sum has n + 1 bits, because the last carry becomes the top bit (15 + 15 = 30 needs 5 bits).</p>
        <h3>The catch: carries travel one stage at a time</h3>
        <p>FA3 can't know its answer until FA2's carry arrives, FA2 waits for FA1, and so on. In the worst case (like <code>1111 + 0001</code>) a carry starts at bit 0 and ripples through <em>every</em> stage. The delay grows linearly with the width: a 64-bit ripple adder is 16× slower than a 4-bit one.</p>
        <div class="tip">While the carry is still travelling, the outputs show <strong>wrong intermediate sums</strong>. Watch the SUM display in slow motion: it goes 15 → 14 → 12 → 8 → 16. Real circuits do this too. The CPU's clock must be slow enough that nobody reads the sum before the worst-case carry has arrived.</div>
        <div class="world">
          <ul>
            <li>The 74LS83 / 74HC283 4-bit adder chips have a carry-in and carry-out pin, so you can chain them: two give 8 bits, four give 16. Between chips, the carry ripples.</li>
            <li>A modern CPU at 4–5 GHz has about 0.2–0.25 ns per clock cycle. A 64-bit ripple adder would need over a hundred gate delays, far more than one cycle. Real 64-bit ALUs use the faster carry-lookahead designs from the lesson after next.</li>
            <li>Ripple adders are still used where speed doesn't matter but area and power do: small microcontrollers, and low-precision blocks in chip designs.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: '4-bit ripple-carry adder: watch the carry move',
          code: WR([RIPPLE_LAYOUT.toString(), RIPPLE]),
          explain: `
            <details>
              <summary>The problem: each stage waits for the one before</summary>
              <p>A full adder's outputs depend on its Cin, and Cin is the previous stage's Cout. So the stages can't all finish at the same moment. The carry is passed along like a bucket in a bucket brigade. The worst case is a carry created at bit 0 that every later stage has to pass on: A = 1111 (15), B = 0001.</p>
            </details>
            <details>
              <summary>Step by step: 15 + 0 → 15 + 1 (click B's ▲ once)</summary>
              <p>The board starts at A = 15, B = 0, SUM = 15. Clicking ▲ makes B = 1. With <b>🐢 Slow-mo</b> on you'll see:</p>
              <table>
                <tr><th>step</th><th>what changes</th><th>carry wires lit</th><th>SUM display</th></tr>
                <tr><td>1</td><td>B's bit b0 switches to 1</td><td>none</td><td>15 (01111)</td></tr>
                <tr><td>2</td><td>FA bit 0: 1 + 1 → S0 = 0, Cout = 1</td><td>c1</td><td>14 (01110) ✗</td></tr>
                <tr><td>3</td><td>FA bit 1: 1 + 0 + 1 → S1 = 0, Cout = 1</td><td>c1 c2</td><td>12 (01100) ✗</td></tr>
                <tr><td>4</td><td>FA bit 2: same → S2 = 0, Cout = 1</td><td>c1 c2 c3</td><td>8 (01000) ✗</td></tr>
                <tr><td>5</td><td>FA bit 3: same → S3 = 0, Cout = 1 → SUM bit 4</td><td>all</td><td><b>16 (10000)</b> ✓</td></tr>
              </table>
              <p>The status says <b>settled after 5 gate delays</b>: 1 for the input and 4 for the FA chain. The simulator counts each FA chip as a single delay. Inside a real full adder the carry path is about 2 gates (AND then OR), so the true delay is roughly 2 per bit.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ol>
                <li>With Slow-mo on, click B's ▼ to go back to 0: the "un-carry" ripples down the same way.</li>
                <li>Set A = 5, B = 2 (no carries at all): it settles after just 2 steps. Ripple adders are fast on easy inputs and slow on the worst case, and the clock has to be set for the worst case.</li>
                <li>Try A = 15, B = 15 → 30 (11110). The top bit of SUM is FA bit 3's carry out.</li>
              </ol>
            </details>
          `,
        },
        { title: 'How bad is it at 64 bits?', code: CUSTOM(SPEED_HTML, SPEED_JS) },
      ],
      quiz: [
        { q: 'In a ripple-carry adder, FA bit k\'s Cin is connected to…', options: ['Ak', 'FA bit k−1\'s Cout', 'FA bit k+1\'s Cout', 'Ground'], answer: 1, why: 'Carries flow from less significant to more significant bits.' },
        { q: 'How many full adders does a 32-bit ripple adder need?', options: ['5', '16', '32', '64'], answer: 2, why: 'One per bit position (bit 0 can use a half adder, or an FA with Cin = 0).' },
        { q: 'Which addition takes the longest in a 4-bit ripple adder?', options: ['0000 + 0000', '0101 + 0010', '1111 + 0001', '1000 + 1000'], answer: 2, why: 'A carry is created at bit 0 and must pass through all four stages.' },
        { q: 'How does ripple adder delay grow with the number of bits n?', options: ['Constant', 'Proportional to log n', 'Proportional to n', 'Proportional to n²'], answer: 2, why: 'Each extra bit adds one more stage to the carry chain.' },
      ],
      exercise: {
        task: `<p>Build a <strong>4-bit adder</strong> from <b>FA</b> chips on the board below: SUM (5 bits) = A + B. Wire A.b<sub>k</sub> and B.b<sub>k</sub> into FA number k, each S into SUM.b<sub>k</sub>, chain the carries, and send the last Cout to SUM.b4. Click <b>✔ Check</b> to test all 256 pairs. Best known: 4 parts.</p>`,
        hint: 'Place four FA chips in a column. FA0 gets A.b0 and B.b0 (leave its Cin unconnected = 0). FAk.Cin ← FA(k−1).Cout. FA3.Cout → SUM.b4.',
        starter: RIPPLE_EX(false),
        solution: RIPPLE_EX(true),
      },
    },

    {
      id: 'twos-complement',
      section: 'Arithmetic',
      title: 'Negative numbers: two\'s complement',
      explain: `
        <p>Wires only carry 0s and 1s: there's no "minus" wire. So how does a computer store −3? We need a rule for which bit patterns mean negative numbers, and the best rule is one where <strong>the adder we already built just works</strong>.</p>
        <h3>Think of a car odometer</h3>
        <p>A 4-digit odometer at 0000 that rolls back one km shows 9999. Rolling forward from 9999 gives 0000 again. So "9999" behaves exactly like −1: add 1 and you get 0. Binary works the same way. With 4 bits, <code>1111</code> + 1 = <code>1 0000</code>, the extra carry falls off, and you get <code>0000</code>. So <code>1111</code> can <em>mean</em> −1.</p>
        <p><strong>Two's complement</strong> applies this to all patterns: the 16 patterns of 4 bits sit on a wheel. Top half (MSB = 0) are 0…7. Bottom half (MSB = 1) are −8…−1.</p>
        <pre><code>0111 =  7      1111 = −1
0110 =  6      1110 = −2
…              …
0000 =  0      1000 = −8</code></pre>
        <p>With n bits the range is −2<sup>n−1</sup> to 2<sup>n−1</sup>−1. For 8 bits that's −128…127, and for 32 bits it's −2,147,483,648…2,147,483,647. The top bit is the <strong>sign bit</strong>: 1 means negative.</p>
        <h3>How to negate: invert, then add 1</h3>
        <pre><code> 3 = 0011
     1100   ← invert every bit (this is −3 − 1 = −4)
   + 0001   ← add 1
−3 = 1101</code></pre>
        <p>Check: 1101 + 0011 = 1 0000 → drop the carry → 0000 ✓. The same adder, the same wires. The circuit doesn't even know whether you meant the bits as signed or unsigned. Only <em>you</em> (and the flags, two lessons later) interpret them.</p>
        <div class="warn">The range is lopsided: there's −8 but no +8. Negating −8 gives −8 again: invert 1000 → 0111, +1 → 1000. In 32-bit code, <code>-INT_MIN</code> overflows and gives INT_MIN back, and <code>Math.abs(Integer.MIN_VALUE)</code> in Java returns a negative number.</div>
        <div class="world">
          <ul>
            <li>That's why <code>-1</code> as a 32-bit int is <code>0xFFFFFFFF</code>, and why casting −1 to <code>unsigned</code> in C gives 4,294,967,295. Same bits, different interpretation.</li>
            <li>In 2014 YouTube's view counter, a signed 32-bit integer, got close to its maximum of 2,147,483,647 views on "Gangnam Style". YouTube switched to 64-bit counters before it overflowed into negative numbers.</li>
            <li>The <a href="https://en.wikipedia.org/wiki/Year_2038_problem" target="_blank">Year 2038 problem</a>: Unix time stored as a signed 32-bit count of seconds since 1970 overflows on 19 January 2038 at 03:14:07 UTC and wraps to a date in 1901.</li>
            <li>The Ariane 5 rocket (flight 501, 1996) was destroyed about 40 seconds after launch when a 64-bit floating-point velocity value was converted to a 16-bit signed integer. The value was too large for −32,768…32,767, which caused an exception that shut down the guidance computers.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'The 4-bit number wheel',
          code: CUSTOM(WHEEL_HTML, WHEEL_JS),
          explain: `
            <details>
              <summary>The problem: where do negative numbers go?</summary>
              <p>A naive idea is "sign-magnitude": use the top bit as a minus sign, so −3 = <code>1011</code>. But then there are two zeros (<code>0000</code> and <code>1000</code>), and the adder gives nonsense: <code>1011</code> + <code>0011</code> = <code>1110</code>, which would be −6, not 0. We'd need separate subtraction hardware.</p>
              <p>Two's complement picks the pattern for −x so that <strong>x + (−x) = 0 using the normal adder</strong>, with the final carry discarded. On the wheel, that just means "count backwards from 0000".</p>
            </details>
            <details>
              <summary>Step by step: negating 3, and why invert + 1 works</summary>
              <table>
                <tr><th>step</th><th>bits</th><th>signed value</th><th>why</th></tr>
                <tr><td>start</td><td>0011</td><td>3</td><td></td></tr>
                <tr><td>① invert</td><td>1100</td><td>−4</td><td>x + ~x = 1111 = −1 always, so ~x = −1 − x</td></tr>
                <tr><td>② +1</td><td>1101</td><td>−3</td><td>(−1 − x) + 1 = −x</td></tr>
                <tr><td>check</td><td>1101 + 0011 = <s>1</s>0000</td><td>0</td><td>carry falls off the 4-bit wheel</td></tr>
              </table>
              <p>Click <b>negate</b> in the widget: the pointer first jumps to the inverted pattern (step ①), then moves one step clockwise (step ②). The log shows both steps.</p>
            </details>
            <details>
              <summary>Try this: two different "edges" of the wheel</summary>
              <ol>
                <li>Click 0111 (7) on the wheel, then <b>+1</b>. You land on 1000 = <b>−8</b> after crossing the <span style="color:#dc2626">red line</span>. That's <b>signed overflow</b>: 7 + 1 = 8 doesn't fit in −8…7.</li>
                <li>Click 1111, then <b>+1</b>. You cross the <span style="color:#2563eb">blue line</span> into 0000. For unsigned math that's a wrap (15 + 1 = 16 doesn't fit, carry = 1). For signed math it's just −1 + 1 = 0, which is correct!</li>
                <li>Click 1000 (−8) and <b>negate</b>: you get −8 back.</li>
                <li>Click 0101 (5) and <b>−3</b>: the log shows the adder actually computed 0101 + 1101 with a carry out, and the answer 2 is correct.</li>
              </ol>
            </details>
            <details>
              <summary>Common mistake</summary>
              <p>Forgetting the <b>+1</b>. Inverting alone gives "one's complement", where 1111 means −0 and every negative number is off by one. Also: the bits don't say whether a number is signed. <code>1101</code> is 13 <em>and</em> −3. The programmer chooses the meaning, e.g. <code>int</code> vs <code>unsigned</code>.</p>
            </details>
          `,
        },
        { title: 'A negation circuit', code: WR(NEG_CIRCUIT) },
      ],
      quiz: [
        { q: 'What is −1 in 8-bit two\'s complement?', options: ['10000001', '11111110', '11111111', '00000001'], answer: 2, why: 'Invert 00000001 → 11111110, add 1 → 11111111 (0xFF).' },
        { q: 'What does 1010 mean as a 4-bit signed number?', options: ['10', '−2', '−6', '−5'], answer: 2, why: 'Negate it: invert → 0101, +1 → 0110 = 6, so 1010 = −6. (Unsigned it would be 10.)' },
        { q: 'What is the range of an 8-bit signed (two\'s complement) number?', options: ['−127 … 127', '−128 … 127', '0 … 255', '−255 … 255'], answer: 1, why: '−2⁷ … 2⁷−1. One more negative value than positive.' },
        { q: 'Why do computers use two\'s complement instead of a simple sign bit?', options: ['It is easier to print', 'The ordinary adder works for negative numbers too, and there is only one zero', 'It stores larger numbers', 'It is required by the C standard'], answer: 1, why: 'x + (−x) wraps to 0 with the same adder. (C only required two\'s complement from C23 on; hardware chose it long before.)' },
        { q: 'In 4-bit two\'s complement, 0111 + 0001 = 1000. What happened?', options: ['Nothing unusual: 7 + 1 = 8', 'Signed overflow: 8 doesn\'t fit, the result reads as −8', 'Unsigned overflow', 'A carry out of bit 3'], answer: 1, why: 'Unsigned 7 + 1 = 8 is fine (no carry), but as signed numbers the result wrapped to −8.' },
      ],
      exercise: {
        task: `<p>Build a circuit that outputs <strong>−X</strong> (two's complement negation) for every 4-bit X, using <b>NOT</b> gates and <b>half adders (HA)</b>. Remember: −X = (NOT X) + 1. A chain of half adders adds 1 if you feed the 1 into the first one… or you can be clever about bit 0. Click <b>✔ Check</b> to test all 16 values. Best known: 7 parts.</p>`,
        hint: 'Bit 0 of −X is just X.b0 (inverting and adding 1 flips it back), and the carry into bit 1 is NOT X.b0. For bits 1–3: NOT the input bit, then a half adder with the carry from below. S goes to the output, C goes on to the next half adder.',
        starter: NEG_EX(false),
        solution: NEG_EX(true),
      },
    },

    {
      id: 'subtractor',
      section: 'Arithmetic',
      title: 'Subtraction = adding the negative',
      explain: `
        <p>We don't need a new circuit for subtraction. Two's complement gives it to us for free:</p>
        <pre><code>A − B  =  A + (−B)  =  A + (NOT B) + 1</code></pre>
        <p>The adder already has a spare input that adds 1: bit 0's <strong>carry in</strong>. So subtraction is "invert B and set Cin = 1".</p>
        <h3>XOR: the controllable inverter</h3>
        <p>We want one circuit that can do both. A control wire <strong>SUB</strong> decides: 0 = add, 1 = subtract. Look at XOR's truth table with one input as a control:</p>
        <pre><code>B XOR 0 = B          (pass through)
B XOR 1 = NOT B      (invert)</code></pre>
        <p>So put an XOR on each B bit, with SUB as its other input, and wire SUB into Cin as well. That's the <strong>adder-subtractor</strong>, 4 FA + 4 XOR:</p>
        <ul>
          <li>SUB = 0: B passes unchanged, Cin = 0 → A + B.</li>
          <li>SUB = 1: every B bit is inverted, Cin = 1 → A + NOT B + 1 = A − B.</li>
        </ul>
        <div class="tip">The carry out after a subtraction has a meaning too: Cout = 1 means "no borrow" (A ≥ B as unsigned numbers), Cout = 0 means A &lt; B. That's how CPUs compare unsigned numbers (see "Status flags").</div>
        <div class="world">
          <ul>
            <li>CPUs don't have a separate subtractor. <code>SUB</code>, <code>CMP</code> (compare) and <code>NEG</code> (negate) on x86 and ARM all run through the same adder with this invert-and-carry trick.</li>
            <li>The 6502 (Apple II, Commodore 64, NES) shows this directly: its <code>SBC</code> instruction computes A + NOT M + C. Programmers write <code>SEC</code> (set carry = 1) before a subtraction, which is exactly our Cin = 1.</li>
            <li>The classic 74181 ALU chip (next lesson) does subtraction the same way, selected by its mode pins.</li>
          </ul>
        </div>
      `,
      examples: [
        { title: 'XOR as a controllable NOT', code: W(XOR_INV) },
        {
          title: '4-bit adder-subtractor',
          code: WR(ADDSUB),
          explain: `
            <details>
              <summary>The problem: one circuit, two operations</summary>
              <p>We could build an adder <em>and</em> a separate subtractor and pick one with a mux, but that doubles the hardware. Two's complement says A − B = A + NOT B + 1. So we only need a way to optionally invert B (the purple XOR column), and a way to optionally add 1 (bit 0's Cin, wired to the same SUB switch).</p>
            </details>
            <details>
              <summary>Step by step: 5 − 3 (the starting state, SUB = 1)</summary>
              <p>B = 0011. The XORs (with SUB = 1) turn it into 1100, and Cin of bit 0 = 1:</p>
              <table>
                <tr><th>FA</th><th>A bit</th><th>NOT B bit</th><th>carry in</th><th>S</th><th>carry out</th></tr>
                <tr><td>bit 0</td><td>1</td><td>0</td><td>1 (SUB)</td><td>0</td><td>1</td></tr>
                <tr><td>bit 1</td><td>0</td><td>0</td><td>1</td><td>1</td><td>0</td></tr>
                <tr><td>bit 2</td><td>1</td><td>1</td><td>0</td><td>0</td><td>1</td></tr>
                <tr><td>bit 3</td><td>0</td><td>1</td><td>1</td><td>0</td><td>1 → Cout</td></tr>
              </table>
              <p>RESULT = <code>0010</code> = <b>2</b> ✓. The Cout LED is on: that means "no borrow", because 5 ≥ 3. The final carry isn't part of the 4-bit answer.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Click B's ▲ twice to make B = 5: 5 − 5 = 0. Then once more for 5 − 6 = −1 (<code>1111</code>). Cout goes off: a borrow was needed.</li>
                <li>Flip <b>SUB</b> to 0: the purple XOR wires now copy B, Cin = 0, and the same board adds.</li>
                <li>Set A = 7, B = −1 with SUB = 1: 7 − (−1) = 8 doesn't fit in 4 signed bits. The readout warns about overflow. The next two lessons show how the CPU detects this.</li>
              </ol>
            </details>
            <details>
              <summary>Common mistake</summary>
              <p>Inverting B but forgetting Cin = 1 computes A + NOT B = A − B − 1. For 5 − 3 you'd get 1. Both halves of the trick (invert <em>and</em> +1) come from the same SUB wire, so they can never get out of sync.</p>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'In two\'s complement, A − B equals…', options: ['A + B', 'A + NOT B', 'A + NOT B + 1', 'NOT (A + B)'], answer: 2, why: '−B = NOT B + 1.' },
        { q: 'Why use XOR gates on the B inputs?', options: ['XOR is faster than NOT', 'B XOR SUB passes B when SUB = 0 and inverts it when SUB = 1', 'To compute the sum', 'To detect overflow'], answer: 1, why: 'XOR with a control bit is a switchable inverter.' },
        { q: 'Where does the "+1" of the negation come from?', options: ['An extra adder', 'The carry in of bit 0, driven by SUB', 'The last carry out', 'A constant on B'], answer: 1, why: 'Cin = 1 adds exactly 1 to the sum, at no extra cost.' },
        { q: 'How many separate subtraction circuits does a typical CPU ALU contain?', options: ['One per register', 'One', 'None: it reuses the adder with inverted B and Cin = 1', 'Two (signed and unsigned)'], answer: 2, why: 'SUB, CMP and NEG are all done by the adder.' },
      ],
      exercise: {
        task: `<p>Build a <strong>2-bit adder-subtractor</strong> on the board below. With SUB = 0, R = A + B. With SUB = 1, R = A − B (both wrap around in 2 bits). Use <b>FA</b> chips and <b>XOR</b> gates, then click <b>✔ Check</b> to test all 32 cases. Best known: 4 parts.</p>`,
        hint: 'Each B bit goes through an XOR with SUB before entering its FA. FA0\'s Cin also gets SUB. Chain FA0.Cout → FA1.Cin. R.b0 = FA0.S, R.b1 = FA1.S.',
        starter: ADDSUB_EX(false),
        solution: ADDSUB_EX(true),
      },
    },

    {
      id: 'carry-lookahead',
      section: 'Arithmetic',
      title: 'Faster adders: carry lookahead',
      explain: `
        <p>The ripple adder is slow because bit 3 has to <em>wait</em> to hear about bit 0's carry. But the carry into bit 3 is just a Boolean function of the inputs, so we can compute it directly from A and B without waiting. The question is how to do that without a huge circuit.</p>
        <h3>Generate and propagate</h3>
        <p>Ask two questions about each bit position <em>i</em>. Both can be answered immediately, in parallel, with one gate each:</p>
        <ul>
          <li><strong>Generate</strong> g<sub>i</sub> = A<sub>i</sub>·B<sub>i</sub>: "this bit creates a carry no matter what" (1 + 1).</li>
          <li><strong>Propagate</strong> p<sub>i</sub> = A<sub>i</sub> ⊕ B<sub>i</sub>: "this bit passes an incoming carry on" (1 + 0 or 0 + 1, plus a carry = 10).</li>
        </ul>
        <p>Then a carry comes out of bit i if bit i generates one, or if it propagates one that came in: <code>c<sub>i+1</sub> = g<sub>i</sub> + p<sub>i</sub>·c<sub>i</sub></code>. That's still a chain, but now we <strong>expand</strong> it:</p>
        <pre><code>c1 = g0
c2 = g1 + p1·g0
c3 = g2 + p2·g1 + p2·p1·g0
c4 = g3 + p3·g2 + p3·p2·g1 + p3·p2·p1·g0</code></pre>
        <p>Read c4 out loud: "bit 3 generates, <em>or</em> bit 2 generates and bit 3 passes it on, <em>or</em> bit 1 generates and bits 2 and 3 pass it on…". Every carry is now an AND layer and an OR layer, no matter how far it has to travel. The sums are <code>S<sub>i</sub> = p<sub>i</sub> ⊕ c<sub>i</sub></code>.</p>
        <div class="warn">The price is gates. The formula for c<sub>n</sub> has n + 1 terms, the biggest with n + 1 inputs, so a flat 64-bit lookahead is impractical. Real designs use groups: 4-bit lookahead blocks whose own "group generate/propagate" feed a second level of lookahead. Or they use <em>parallel-prefix</em> trees that take about log<sub>2</sub>(n) levels.</div>
        <div class="tip">Software analogy: the ripple carry is a sequential loop where each iteration depends on the last. Lookahead is like rewriting it as a <em>parallel prefix scan</em>, the same trick GPUs use to compute running sums over millions of elements in log(n) steps.</div>
        <div class="world">
          <ul>
            <li>The <a href="https://en.wikipedia.org/wiki/Lookahead_carry_unit" target="_blank">74182</a> lookahead carry generator was the companion chip to the 74181 ALU: four ALU chips plus one 74182 made a fast 16-bit adder in 1970s minicomputers.</li>
            <li>The <a href="https://en.wikipedia.org/wiki/Kogge%E2%80%93Stone_adder" target="_blank">Kogge–Stone</a> adder (1973) computes all carries in log<sub>2</sub>(n) levels: 6 levels for 64 bits. It and related prefix adders (Brent–Kung, Han–Carlson) are the basis of fast adders in modern CPUs.</li>
            <li>That's why a 64-bit <code>add</code> finishes in a single clock cycle (≈ 0.2–0.3 ns) on today's 4–5 GHz processors, often with several adders working side by side in each core.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'Ripple-carry at gate level',
          code: WR([GL_LEFT.toString(), GL_READOUT.toString(), CLA_RIPPLE]),
          explain: `
            <details>
              <summary>The problem: 15 + 1 at gate level</summary>
              <p>Each bit is the full adder from before: p (XOR) and g (AND) on the left, then the sum XOR, the AND that checks "propagate and carry in", and the OR that makes the carry out (labelled c1…c4). Starting from A = 1111, B = 0000, click <b>B0</b>:</p>
              <table>
                <tr><th>delay</th><th>what changes</th></tr>
                <tr><td>1</td><td>switch B0 → 1</td></tr>
                <tr><td>2</td><td>p0 → 0, g0 → 1</td></tr>
                <tr><td>3</td><td>c1 (OR of bit 0) → 1, S0 → 0</td></tr>
                <tr><td>4</td><td>bit 1's AND (p1·c1) → 1, S1 → 0</td></tr>
                <tr><td>5</td><td>c2 → 1</td></tr>
                <tr><td>6</td><td>bit 2's AND → 1, S2 → 0</td></tr>
                <tr><td>7</td><td>c3 → 1</td></tr>
                <tr><td>8</td><td>bit 3's AND → 1, S3 → 0</td></tr>
                <tr><td>9</td><td>c4 → 1. Done: 10000 = 16</td></tr>
              </table>
              <p>The readout says <b>9 gate delays</b>: 1 for the switch, 1 for p/g, then <b>2 per bit</b> (AND + OR) as the carry crawls down. Use 🐢 Slow-mo to watch the green carry move from block to block.</p>
            </details>
          `,
        },
        {
          title: 'Carry-lookahead at gate level',
          code: WR([GL_LEFT.toString(), GL_READOUT.toString(), CLA_FAST]),
          explain: `
            <details>
              <summary>How to read this board</summary>
              <p>The left side is identical: switches and the p<sub>i</sub>/g<sub>i</sub> gates. Their outputs run down purple-labelled vertical <b>rails</b> (g0, p1, g1, p2, g2, p3, g3). Each AND gate taps the rails named in its label, e.g. <code>p3·p2·p1·g0</code>. The ORs combine the terms into c2, c3, c4. The far-right XORs make the sums. c1 is simply g0, and S0 is simply p0.</p>
            </details>
            <details>
              <summary>Step by step: the same 15 + 1</summary>
              <table>
                <tr><th>delay</th><th>what changes</th></tr>
                <tr><td>1</td><td>switch B0 → 1</td></tr>
                <tr><td>2</td><td>p0 → 0 (so S0 → 0), g0 → 1</td></tr>
                <tr><td>3</td><td><b>all at once</b>: p1·g0, p2·p1·g0, p3·p2·p1·g0 → 1, and S1 = p1 ⊕ g0 → 0</td></tr>
                <tr><td>4</td><td><b>all at once</b>: c2, c3, c4 → 1</td></tr>
                <tr><td>5</td><td>S2, S3 → 0. Done: 16</td></tr>
              </table>
              <p>The readout says <b>5 gate delays</b> instead of 9. With 4 bits the gain is small, but the lookahead delay stays about the same as the width grows, while ripple adds 2 delays per bit.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Click B0 in both widgets, with and without 🐢 Slow-mo. In the lookahead board, notice how c2, c3 and c4 light up in the <em>same</em> step.</li>
                <li>Count gates: both boards have 20 gates. Lookahead isn't free, though. For 8 bits the c8 formula alone would need a 9-input OR and a 9-input AND, and the gate count grows roughly with n². Hence the grouped and prefix designs in real chips.</li>
                <li>Try other inputs, e.g. A = 0101 and B = 0101 (5 + 5). Both boards agree on every sum; only the timing differs.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'What does "generate" g<sub>i</sub> = A<sub>i</sub>·B<sub>i</sub> mean?', options: ['Bit i passes a carry on', 'Bit i produces a carry by itself', 'Bit i sum is 1', 'Bit i is zero'], answer: 1, why: '1 + 1 always produces a carry, whatever comes in.' },
        { q: 'c<sub>i+1</sub> in terms of generate and propagate is…', options: ['g<sub>i</sub> · p<sub>i</sub>', 'g<sub>i</sub> + p<sub>i</sub>·c<sub>i</sub>', 'p<sub>i</sub> ⊕ c<sub>i</sub>', 'g<sub>i</sub> ⊕ c<sub>i</sub>'], answer: 1, why: 'A carry comes out if this bit generates one, or propagates the incoming one.' },
        { q: 'Why is lookahead faster than ripple?', options: ['It uses fewer gates', 'Every carry is computed directly from g and p in a fixed number of gate levels instead of waiting for the previous carry', 'It uses a faster clock', 'It skips the sum bits'], answer: 1, why: 'Expanding the recurrence flattens the chain into AND-OR layers of fixed depth.' },
        { q: 'What is the main cost of a flat (single-level) lookahead for wide adders?', options: ['It gives wrong answers', 'Gates with very many inputs and rapidly growing gate count', 'It needs a clock', 'It cannot handle carry out'], answer: 1, why: 'c<sub>n</sub> has n+1 terms; real designs use hierarchical or prefix (Kogge–Stone) structures.' },
      ],
      exercise: {
        task: `<p>Fill in the <strong>generate/propagate table</strong> in the widget below for A = 1011, B = 0110 (or click bits to pick your own numbers). For each bit, set g<sub>i</sub>, p<sub>i</sub> and the carry out c<sub>i+1</sub> = g<sub>i</sub> + p<sub>i</sub>·c<sub>i</sub> (c<sub>0</sub> = 0). Then click <b>✔ Check</b>.</p>`,
        hint: 'Bit 0: A0 = 1, B0 = 0 → g0 = 0, p0 = 1, c1 = 0 + 1·0 = 0. Bit 1: A1 = 1, B1 = 1 → g1 = 1, p1 = 0, c2 = 1. Bit 2: 0 and 1 → g2 = 0, p2 = 1, c3 = 0 + 1·1 = 1. Bit 3: 1 and 0 → g3 = 0, p3 = 1, c4 = 1.',
        starter: CLA_EX(false),
        solution: CLA_EX(true),
      },
    },

    {
      id: 'alu',
      section: 'Arithmetic',
      title: 'The ALU',
      explain: `
        <p>The <strong>ALU</strong> (arithmetic logic unit) is the calculator at the heart of a CPU. It takes two numbers A and B and an <strong>operation code</strong> (OP) and produces a result R plus a few <strong>status flags</strong>. Our 4-bit ALU has four operations:</p>
        <table>
          <tr><th>OP1 OP0</th><th>operation</th><th>how</th></tr>
          <tr><td>00</td><td>ADD: A + B</td><td>adder, SUB = 0</td></tr>
          <tr><td>01</td><td>SUB: A − B</td><td>adder with XOR-inverted B, Cin = 1</td></tr>
          <tr><td>10</td><td>AND: A &amp; B</td><td>4 AND gates</td></tr>
          <tr><td>11</td><td>OR: A | B</td><td>4 OR gates</td></tr>
        </table>
        <h3>Compute everything, then choose</h3>
        <p>Like the mux lesson: hardware doesn't "call" one function. All the units compute <em>at the same time</em> on every input, and a <strong>multiplexer</strong> per bit, driven by OP, selects which result leaves the ALU. OP0 also doubles as the SUB line of the adder-subtractor. Notice how every building block so far shows up: adders, XOR inverters, muxes, and a comparator-like zero detector.</p>
        <h3>Flags</h3>
        <ul>
          <li><strong>Z</strong> (zero): R = 0000. A NOR of all result bits.</li>
          <li><strong>N</strong> (negative): the top bit of R.</li>
          <li><strong>C</strong> (carry): the adder's carry out.</li>
          <li><strong>V</strong> (overflow): the signed result is wrong. The next lesson is all about C vs V.</li>
        </ul>
        <div class="tip">The CPU's instruction decoder turns <code>add</code>, <code>sub</code>, <code>and</code>, <code>orr</code> into the right OP bits. That's what "executing an instruction" means at this level: setting a few control wires and letting the gates settle.</div>
        <div class="world">
          <ul>
            <li>The <a href="https://en.wikipedia.org/wiki/74181" target="_blank">74181</a> (Texas Instruments, 1970) was the first complete ALU on a single chip: 4 bits, 32 operations (16 logic + 16 arithmetic) chosen by 5 select pins. Chained 74181s were the ALU of many 1970s minicomputers, including several DEC PDP-11 models and the Xerox Alto.</li>
            <li>A modern CPU core has several ALUs working in parallel (often 4 or more integer ALUs per core) so it can execute multiple instructions per clock cycle.</li>
            <li>GPUs contain thousands of simple ALUs. That's how they do graphics and machine-learning math at huge throughput.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'A 4-bit ALU as one chip',
          code: WR([DEF_ALU4, ALU_BLOCK]),
          explain: `
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Starting at A = 6, B = 3: click OP's ▲ to step through ADD (9), SUB (3), AND (2 = <code>0010</code>), OR (7 = <code>0111</code>).</li>
                <li>ADD with A = 6, B = 3 gives 9 = <code>1001</code>: N = 1 and V = 1. As signed numbers 6 + 3 = 9 doesn't fit (the result reads as −7). As unsigned numbers 9 is fine (C = 0).</li>
                <li>SUB with A = B gives 0: Z lights. That's how a CPU checks equality.</li>
                <li>SUB with A = 3, B = 6: R = <code>1101</code> (−3), C = 0 (borrow: 3 &lt; 6 unsigned).</li>
              </ol>
            </details>
          `,
        },
        { title: 'Inside an ALU: compute everything, then select', code: W(ALU_LOGIC) },
      ],
      quiz: [
        { q: 'With OP selecting AND, what are the ALU\'s adder gates doing?', options: ['They are switched off', 'They still compute A + B; the mux just doesn\'t select it', 'They compute A AND B', 'They store the previous sum'], answer: 1, why: 'All units are always active; the output mux decides which answer is used.' },
        { q: 'Which building block lets the ALU choose between results?', options: ['Decoder', 'Multiplexer', 'Priority encoder', 'Comparator'], answer: 1, why: 'One mux per result bit, with OP as the select.' },
        { q: 'How is the Z (zero) flag computed for a 4-bit result?', options: ['AND of all result bits', 'NOR of all result bits', 'The carry out', 'The top bit'], answer: 1, why: 'NOR is 1 only when every input is 0.' },
        { q: 'What was special about the 74181?', options: ['It was the first microprocessor', 'It was a complete 4-bit ALU on one chip', 'It was the first RAM chip', 'It was a 64-bit adder'], answer: 1, why: 'A single TTL chip offering 32 arithmetic/logic functions on 4-bit operands, chainable to wider words.' },
      ],
      exercise: {
        task: `<p>Build a <strong>1-bit ALU slice</strong> on the board below. Inputs: A, B, Cin and the op code OP1 OP0. Outputs: R and Cout.</p>
          <ul><li>00: R = sum bit of A + B + Cin, Cout = its carry</li><li>01: same but with B inverted (subtract)</li><li>10: R = A AND B</li><li>11: R = A OR B</li></ul>
          <p>Four of these chained through Cin/Cout make a 4-bit ALU. Click <b>✔ Check</b>. Best known: 6 parts.</p>`,
        hint: 'XOR B with OP0, then a full adder with A and Cin. An AND and an OR for the logic ops, and MUX #1 (S = OP0) picks between them. MUX #2 (S = OP1) picks the adder\'s S (A input) or the logic result (B input). Cout comes straight from the FA.',
        starter: ALU_EX(false),
        solution: ALU_EX(true),
      },
    },

    {
      id: 'flags',
      section: 'Arithmetic',
      title: 'Status flags: carry vs overflow',
      explain: `
        <p>After every ALU operation, the CPU stores four bits of extra information about the result in a <strong>flags register</strong>. They answer "what kind of result was that?", and they're how <code>if</code> statements work.</p>
        <ul>
          <li><strong>Z</strong> (zero): the result is 0.</li>
          <li><strong>N</strong> (negative, x86 calls it SF, "sign"): the top bit of the result.</li>
          <li><strong>C</strong> (carry): the adder's carry out. For <em>unsigned</em> numbers: "the true result didn't fit".</li>
          <li><strong>V</strong> (overflow, x86: OF): for <em>signed</em> numbers: "the true result didn't fit".</li>
        </ul>
        <h3>The same bits, two different questions</h3>
        <p>The adder doesn't know whether you meant <code>1111</code> as 15 or −1, so the CPU computes <strong>both</strong> warnings and lets your program check the one it cares about:</p>
        <table>
          <tr><th>4-bit add</th><th>unsigned view</th><th>signed view</th><th>C</th><th>V</th></tr>
          <tr><td>0111 + 0001 = 1000</td><td>7 + 1 = 8 ✓</td><td>7 + 1 = −8 ✗</td><td>0</td><td>1</td></tr>
          <tr><td>1111 + 0001 = <s>1</s>0000</td><td>15 + 1 = 0 ✗</td><td>−1 + 1 = 0 ✓</td><td>1</td><td>0</td></tr>
          <tr><td>1000 + 1111 = <s>1</s>0111</td><td>8 + 15 = 7 ✗</td><td>−8 + −1 = 7 ✗</td><td>1</td><td>1</td></tr>
          <tr><td>0011 + 0100 = 0111</td><td>3 + 4 = 7 ✓</td><td>3 + 4 = 7 ✓</td><td>0</td><td>0</td></tr>
        </table>
        <h3>The overflow rule</h3>
        <p>Signed overflow can only happen when you add two numbers with the <strong>same sign</strong> and the result has the <strong>other sign</strong>: two positives giving a "negative", or two negatives giving a "positive". Adding numbers with different signs can never overflow, because the result lies between them.</p>
        <pre><code>V = (A3 == B3) AND (S3 != A3)       // for addition</code></pre>
        <div class="warn">In C and C++, signed integer overflow is <em>undefined behaviour</em>: the compiler may assume it never happens and optimise accordingly. Unsigned overflow is defined to wrap around. In Rust, debug builds panic on overflow. In Java and JavaScript's typed arrays, ints wrap silently. The hardware flags are the same everywhere; languages just choose different policies.</div>
        <div class="world">
          <ul>
            <li>x86 has CF, ZF, SF, OF in its FLAGS register. ARM has N, Z, C, V in its status register. Same four ideas, different letters. (One detail: after a subtraction, ARM's C = 1 means "no borrow", while x86's CF = 1 means "borrow". It's the same adder, with the bit stored inverted.)</li>
            <li><code>if (a &lt; b)</code> compiles to <code>CMP a, b</code> (a subtraction that only keeps the flags) and a conditional branch. For <code>int</code> the compiler uses <code>BLT</code> on ARM (taken when N ≠ V) or <code>JL</code> on x86 (SF ≠ OF). For <code>unsigned</code> it uses <code>BLO</code>/<code>JB</code> (carry/borrow). That's why mixing signed and unsigned in a comparison can flip the answer.</li>
            <li>RISC-V has no flags register at all. It has compare-and-branch instructions (<code>blt</code>, <code>bltu</code>) and <code>slt</code> ("set if less than"), which avoids a shared flags register that every instruction would compete for.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'Flag explorer',
          code: CUSTOM(FLAGS_HTML, FLAGS_JS),
          explain: `
            <details>
              <summary>The problem: one result, two meanings</summary>
              <p>An add instruction just adds bit patterns. Whether <code>1000</code> is "8" or "−8" depends on your variable's type, and the ALU doesn't know your types. So it reports <b>C</b> ("wrong if you meant unsigned") and <b>V</b> ("wrong if you meant signed") every time. Your compiled code checks the one that matches the type.</p>
            </details>
            <details>
              <summary>Step by step: the presets</summary>
              <table>
                <tr><th>preset</th><th>bits</th><th>unsigned</th><th>signed</th><th>C</th><th>V</th><th>why</th></tr>
                <tr><td>7 + 1</td><td>0111 + 0001 = 1000</td><td>8 ✓</td><td>−8 ✗</td><td>0</td><td>1</td><td>two positives → "negative"</td></tr>
                <tr><td>15 + 1</td><td>1111 + 0001 = 1 0000</td><td>0 ✗</td><td>0 ✓</td><td>1</td><td>0</td><td>carry out, but −1 + 1 = 0 is right</td></tr>
                <tr><td>−8 + −1</td><td>1000 + 1111 = 1 0111</td><td>7 ✗</td><td>7 ✗</td><td>1</td><td>1</td><td>both wrong</td></tr>
                <tr><td>3 + 4</td><td>0011 + 0100 = 0111</td><td>7 ✓</td><td>7 ✓</td><td>0</td><td>0</td><td>fits either way</td></tr>
                <tr><td>5 − 3</td><td>0101 + 1100 + 1 = 1 0010</td><td>2 ✓</td><td>2 ✓</td><td>1</td><td>0</td><td>C = 1: no borrow</td></tr>
                <tr><td>3 − 5</td><td>0011 + 1010 + 1 = 0 1110</td><td>14 ✗</td><td>−2 ✓</td><td>0</td><td>0</td><td>C = 0: borrow, 3 &lt; 5 unsigned</td></tr>
                <tr><td>−8 − 1</td><td>1000 + 1110 + 1 = 1 0111</td><td>7 ✓</td><td>7 ✗</td><td>1</td><td>1</td><td>−9 doesn't fit</td></tr>
              </table>
              <p>Click each preset and compare with the four flag cards. The orange "carries" row shows the carry into every column. Here's a neat fact: V = 1 exactly when the carry <em>into</em> bit 3 differs from the carry <em>out</em> of bit 3.</p>
            </details>
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Pick any A and B with <em>different</em> top bits and click A + B. V is never 1, whatever the other bits are.</li>
                <li>Find an addition with C = 1 and V = 0 that isn't a preset (e.g. 1110 + 0011: −2 + 3 = 1).</li>
                <li>For A − B, C = 1 whenever A ≥ B as unsigned numbers. Click bits to test that claim.</li>
              </ol>
            </details>
            <details>
              <summary>Common mistake</summary>
              <p>Thinking "carry = overflow". The carry flag is about <b>unsigned</b> numbers only. For signed numbers a carry out is normal and harmless (every time you add a negative number to a positive one, like 5 + (−3), C = 1). Check <b>V</b> for signed overflow.</p>
            </details>
          `,
        },
        {
          title: 'How "if (a < b)" uses the flags',
          code: CUSTOM(BRANCH_HTML, BRANCH_JS),
          explain: `
            <details>
              <summary>Try this</summary>
              <ol>
                <li>The start is a = 1111, b = 0001. Signed: −1 &lt; 1, so BLT jumps. Unsigned: 15 &lt; 1 is false, so BLO doesn't jump. Same bits, same CMP, same flags. Only the branch instruction differs.</li>
                <li>Make a = b: only BEQ, BGE, BHS are taken (Z = 1, C = 1).</li>
                <li>Try a = 0111 (7), b = 1000 (−8 signed): a − b = 15 overflows in signed math (V = 1, N = 1). BLT correctly says "not less" because it tests N ≠ V instead of just N.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: '4-bit: 0110 + 0011 = 1001. Which flags are set?', options: ['C only', 'V and N', 'Z', 'C and V'], answer: 1, why: '6 + 3 = 9 as unsigned is fine (no carry), but as signed two positives gave a negative (−7): V = 1, and the top bit is 1: N = 1.' },
        { q: 'Which flag tells you an unsigned addition overflowed?', options: ['Z', 'N', 'C', 'V'], answer: 2, why: 'The carry out of the top bit means the unsigned result needed one more bit.' },
        { q: 'When can adding two signed numbers overflow?', options: ['Whenever there is a carry out', 'Only when both have the same sign and the result has the other sign', 'When the result is zero', 'When one of them is negative'], answer: 1, why: 'Numbers of different sign can never overflow: the sum lies between them.' },
        { q: '<code>if (a &lt; b)</code> with signed ints compiles on ARM to CMP followed by…', options: ['BEQ', 'BLO (C = 0)', 'BLT (N ≠ V)', 'BMI (N = 1)'], answer: 2, why: 'BLT checks N ≠ V so it stays correct even when a − b overflows. Unsigned would use BLO.' },
        { q: 'After CMP 3, 5 (computing 3 − 5) on ARM, what is C?', options: ['1, no borrow', '0, a borrow was needed (3 < 5 unsigned)', 'Undefined', 'Same as V'], answer: 1, why: '3 + NOT 5 + 1 = 0011 + 1010 + 1 = 1110 with no carry out → C = 0.' },
      ],
      exercise: {
        task: `<p>The 4-bit adder below is finished, and its SUM is shown as a signed number. Add gates that light <b>V</b> exactly when <b>A + B overflows as signed numbers</b>. You can tap A.b3, B.b3 (the sign bits) and the adder's <b>S3</b> output pin. Click <b>✔ Check</b> to test all 256 pairs. Best known: 3 gates.</p>`,
        hint: 'Overflow = "the result\'s sign differs from A\'s sign AND differs from B\'s sign". (If A and B had different signs, the result can\'t differ from both.) That\'s (A3 XOR S3) AND (B3 XOR S3).',
        starter: FLAGS_EX(false),
        solution: FLAGS_EX(true),
      },
    },
  );
}
