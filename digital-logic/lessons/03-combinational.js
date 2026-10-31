window.LESSONS = window.LESSONS || [];
{
  // ---------- helpers (block-scoped: nothing leaks into the page) ----------
  // Widget code is written as real JS functions and serialised with Function#toString,
  // so the iframe gets exactly this source. Each fn runs as an IIFE inside the preview.
  const src = (list) => list.map((f) => (typeof f === 'function' ? '(' + f.toString() + ')();' : String(f))).join('\n');
  const W = (fns, html) => (html || '') + '<div id="c"></div>\n<script>\n' + src([].concat(fns)) + '\n<\/script>';
  const READOUT_CSS = '<style>.rd{margin:8px 2px 0;padding:8px 12px;border-radius:8px;background:#f1f5f9;font:14px system-ui;color:#1e293b}.rd b{color:#0f766e}.rd code{background:#e2e8f0;padding:1px 5px;border-radius:4px}</style>';
  // widget with a live text readout (#r) under the board
  const WR = (fns, html) => READOUT_CSS + (html || '') + '<div id="c"></div><div id="r" class="rd"></div>\n<script>\n' + src([].concat(fns)) + '\n<\/script>';

  // ---------- chip definitions shared by several widgets ----------
  const DEF_BCD7 = function () {
    window.SEG_BITS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f];
    Circ.chip('BCD7', {
      label: 'BCD → 7SEG', w: 110, ins: ['D0', 'D1', 'D2', 'D3'], outs: ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      desc: 'BCD to 7-segment decoder (like the CD4511): digit 0–9 in, segment lines a–g out. 10–15 = blank.',
      fn: (i) => { const n = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3]; const m = n < 10 ? window.SEG_BITS[n] : 0; return [0, 1, 2, 3, 4, 5, 6].map((k) => (m >> k) & 1); },
    });
  };
  const DEF_PRIO4 = function () {
    Circ.chip('PRIO4', {
      label: 'PRIORITY ENC', w: 110, ins: ['I0', 'I1', 'I2', 'I3'], outs: ['Y0', 'Y1', 'V'],
      desc: '4→2 priority encoder (like half a 74HC148): outputs the number of the HIGHEST active input; V = any input active',
      fn: ([a, b, c, d]) => { const n = d ? 3 : c ? 2 : b ? 1 : 0; return [n & 1, n >> 1, a | b | c | d]; },
    });
  };
  const DEF_CMP4 = function () {
    Circ.chip('CMP4', {
      label: '4-BIT COMPARE', w: 120, ins: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3'], outs: ['A>B', 'A=B', 'A<B'],
      desc: '4-bit magnitude comparator (like the 74HC85)',
      fn: (i) => { const a = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3], b = i[4] + 2 * i[5] + 4 * i[6] + 8 * i[7]; return [+(a > b), +(a === b), +(a < b)]; },
    });
  };

  // =====================================================================
  // multiplexer
  // =====================================================================
  const MUX2_GATES = function () {
    const r = document.getElementById('r');
    Circ.mount('#c', {
      title: '2:1 multiplexer from AND / OR / NOT',
      intro: 'Y = S ? B : A. Flip <b>S</b> to choose which input reaches Y, then flip A and B and watch only the chosen one matter.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0, value: 1 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 160 },
        { id: 's', type: 'IN', label: 'S', x: 20, y: 70 },
        { id: 'n', type: 'NOT', x: 140, y: 70 },
        { id: 'g1', type: 'AND', x: 280, y: 10 },
        { id: 'g2', type: 'AND', x: 280, y: 150 },
        { id: 'o', type: 'OR', x: 420, y: 70 },
        { id: 'y', type: 'OUT', label: 'Y', x: 560, y: 70, color: '#f59e0b' },
        { type: 'TEXT', text: 'top AND: lets A through when S = 0', x: 230, y: 2, size: 11.5 },
        { type: 'TEXT', text: 'bottom AND: lets B through when S = 1', x: 230, y: 222, size: 11.5 },
        { type: 'TEXT', text: 'NOT S', x: 212, y: 84, size: 11, color: '#7c3aed' },
      ],
      wires: [
        ['a', 'g1.0'], ['n', 'g1.1', { mx: 240 }], ['s', 'n.0'], ['s', 'g2.0', { mx: 100 }], ['b', 'g2.1'],
        ['g1', 'o.0', { mx: 380 }], ['g2', 'o.1', { mx: 380 }], ['o', 'y'],
      ],
      onChange(api) {
        const s = api.get('S');
        r.innerHTML = 'S = <b>' + s + '</b> → Y copies <b>' + (s ? 'B' : 'A') + '</b> (= ' + api.get('Y') + '). The other input is ignored: try flipping it.';
      },
    });
  };
  const MUX4_CHIPS = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'sel', type: 'NUMIN', bits: 2, label: 'SEL (S1 S0)', x: 20, y: 290, value: 1 },
      { id: 'm0', type: 'MUX2', x: 200, y: 0 },
      { id: 'm1', type: 'MUX2', x: 200, y: 140 },
      { id: 'm2', type: 'MUX2', x: 380, y: 70 },
      { id: 'y', type: 'OUT', label: 'Y', x: 540, y: 100, color: '#f59e0b' },
      { type: 'TEXT', text: 'S0 picks within each pair', x: 170, y: 252, size: 11, color: '#7c3aed' },
      { type: 'TEXT', text: 'S1 picks the pair', x: 360, y: 182, size: 11, color: '#7c3aed' },
    ];
    const init = [0, 1, 1, 0];
    [10, 70, 150, 210].forEach((y, k) => parts.unshift({ id: 'd' + k, type: 'IN', label: 'D' + k, x: 20, y, value: init[k] }));
    Circ.mount('#c', {
      title: '4:1 multiplexer = three 2:1 MUX chips',
      intro: 'Pick an input with <b>SEL</b> (click ▲▼ or its bits). Each MUX chip is the 4-gate circuit above, packaged as a black box.',
      parts,
      wires: [
        ['d0', 'm0.A'], ['d1', 'm0.B', { pts: [[110, 90], [110, 50]] }],
        ['d2', 'm1.A'], ['d3', 'm1.B', { pts: [[110, 230], [110, 190]] }],
        ['sel.0', 'm0.S', { pts: [[160, 320], [160, 70]] }], ['sel.0', 'm1.S', { pts: [[160, 320], [160, 210]] }],
        ['sel.1', 'm2.S', { pts: [[350, 340], [350, 140]] }],
        ['m0', 'm2.A', { mx: 320 }], ['m1', 'm2.B', { mx: 330 }], ['m2', 'y'],
      ],
      onChange(api) {
        const s = api.get('sel');
        r.innerHTML = 'SEL = ' + s + ' (binary <code>' + s.toString(2).padStart(2, '0') + '</code>) → Y follows <b>D' + s + '</b> = ' + api.get('Y') + '. Flip D' + s + ' and Y follows; flip any other D and nothing happens.';
      },
    });
  };
  const MUX_EX = (solved) => {
    const parts = [
      "{ id: 'a', type: 'IN', label: 'A', x: 40, y: 60 }",
      "{ id: 'b', type: 'IN', label: 'B', x: 40, y: 160 }",
      "{ id: 's', type: 'IN', label: 'S', x: 40, y: 260 }",
      "{ id: 'y', type: 'OUT', label: 'Y', x: 660, y: 140, color: '#f59e0b' }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'n', type: 'NOT', x: 180, y: 260 }", "{ id: 'g1', type: 'AND', x: 340, y: 70 }",
        "{ id: 'g2', type: 'AND', x: 340, y: 190 }", "{ id: 'o', type: 'OR', x: 500, y: 130 }");
      wires = "wires: [['a','g1.0'],['n','g1.1',{mx:280}],['s','n.0'],['b','g2.0',{mx:200}],['s','g2.1',{mx:120}],['g1','o.0',{mx:440}],['g2','o.1',{mx:440}],['o','y']],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 2:1 MUX from AND, OR, NOT',
  intro: 'Goal: Y = A when S = 0, Y = B when S = 1. Purple 🎯 column = goal.',
  build: { palette: ['AND', 'OR', 'NOT'], best: 4 },
  target: ({ A, B, S }) => ({ Y: S ? B : A }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // demux-decoder
  // =====================================================================
  const DEC_GATES = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'a1', type: 'IN', label: 'A1', x: 20, y: 140 },
      { id: 'a0', type: 'IN', label: 'A0', x: 20, y: 0 },
      { id: 'n0', type: 'NOT', x: 100, y: 50 },
      { id: 'n1', type: 'NOT', x: 100, y: 190 },
      { type: 'TEXT', text: 'A0', x: 192, y: -6, size: 11, color: '#7c3aed', bold: true },
      { type: 'TEXT', text: 'Ā0', x: 212, y: 56, size: 11, color: '#7c3aed', bold: true },
      { type: 'TEXT', text: 'A1', x: 232, y: 152, size: 11, color: '#7c3aed', bold: true },
      { type: 'TEXT', text: 'Ā1', x: 252, y: 202, size: 11, color: '#7c3aed', bold: true },
    ];
    const RAIL = { a0: 200, n0: 220, a1: 240, n1: 260 };
    const SRCY = { a0: 20, n0: 70, a1: 160, n1: 210 };
    const USE = [['n0', 'n1'], ['a0', 'n1'], ['n0', 'a1'], ['a0', 'a1']]; // Yk = AND of these
    const wires = [['a0', 'n0.0', { pts: [[80, 20], [80, 70]] }], ['a1', 'n1.0', { pts: [[80, 160], [80, 210]] }]];
    USE.forEach((pair, k) => {
      const y = 70 * k;
      parts.push({ id: 'g' + k, type: 'AND', x: 320, y }, { id: 'y' + k, type: 'OUT', label: 'Y' + k, x: 440, y, color: '#f59e0b' });
      pair.forEach((s, j) => wires.push([s, 'g' + k + '.' + j, { pts: [[RAIL[s], SRCY[s]], [RAIL[s], y + 10 + 20 * j]] }]));
      wires.push(['g' + k, 'y' + k]);
    });
    Circ.mount('#c', {
      title: '2 → 4 decoder from NOT + AND',
      intro: 'The 2-bit number <b>A1 A0</b> picks exactly one of four output lines. Every AND gate is a "detector" for one pattern.',
      parts, wires,
      onChange(api) {
        const n = api.get('A0') + 2 * api.get('A1');
        r.innerHTML = 'A1 A0 = <code>' + api.get('A1') + api.get('A0') + '</code> = ' + n + ' → only <b>Y' + n + '</b> is on. Outputs: <code>' + [3, 2, 1, 0].map((k) => api.get('Y' + k)).join('') + '</code> (Y3..Y0), "one-hot".';
      },
    });
  };
  const DEC_ADDR = function () {
    const r = document.getElementById('r'), inp = document.getElementById('addr'), sl = document.getElementById('sl');
    const NAMES = ['RAM', 'VIDEO', 'I/O', 'ROM'];
    const RANGES = ['0000–3FFF', '4000–7FFF', '8000–BFFF', 'C000–FFFF'];
    const parts = [
      { id: 'sel', type: 'NUMIN', bits: 2, label: 'A15 A14', x: 20, y: 20, value: 3 },
      { id: 'dec', type: 'DEC2', x: 200, y: 0 },
    ];
    const OY = [-40, 10, 60, 110], MX = [320, 340, 340, 320];
    const wires = [['sel.0', 'dec.A0'], ['sel.1', 'dec.A1']];
    OY.forEach((y, k) => {
      parts.push({ id: 'cs' + k, type: 'OUT', label: NAMES[k] + '  ' + RANGES[k], x: 400, y, color: ['#3b82f6', '#a855f7', '#f97316', '#16a34a'][k] });
      wires.push(['dec.Y' + k, 'cs' + k, { mx: MX[k] }]);
    });
    let addr = 0xc123;
    let api;
    const hex = (v) => v.toString(16).toUpperCase().padStart(4, '0');
    const show = () => {
      const top = addr >> 14;
      inp.value = hex(addr); sl.value = addr;
      const bits = addr.toString(2).padStart(16, '0');
      r.innerHTML = 'Address <b>0x' + hex(addr) + '</b> = <code><b>' + bits.slice(0, 2) + '</b>' + bits.slice(2) + '</code><br>Top 2 bits <code>' + bits.slice(0, 2) +
        '</code> → decoder lights <b>' + NAMES[top] + '</b> (its "chip select"). The other 14 bits, 0x' + hex(addr & 0x3fff) + ', pick one of the 16 384 bytes inside that chip.';
    };
    api = Circ.mount('#c', {
      title: 'Address decoding: which chip answers?',
      intro: 'A 16-bit CPU address bus (0000–FFFF). The top two address lines go into a 2→4 decoder; each output enables one chip.',
      parts, wires, table: false,
      onChange(a) { const t = a.get('sel'); if (t !== addr >> 14) addr = (t << 14) | (addr & 0x3fff); show(); },
    });
    const setAddr = (v) => { addr = Math.max(0, Math.min(0xffff, v | 0)); api.set('sel', addr >> 14); show(); };
    inp.addEventListener('change', () => { const v = parseInt(inp.value.replace(/^0x/i, ''), 16); if (!isNaN(v)) setAddr(v); else show(); });
    sl.addEventListener('input', () => setAddr(+sl.value));
    show();
  };
  const ADDR_HTML = `<style>.ctl{font:14px system-ui;margin:0 0 8px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.ctl input[type=text]{width:80px;font:600 15px ui-monospace,Menlo,monospace;padding:3px 6px}.ctl input[type=range]{flex:1;min-width:220px}</style>
<div class="ctl">CPU address: 0x<input id="addr" type="text" value="C123"> <input id="sl" type="range" min="0" max="65535" step="1"></div>`;
  const DEMUX_EX = (solved) => {
    const parts = [
      "{ id: 'd', type: 'IN', label: 'D', x: 40, y: 20, value: 1 }",
      "{ id: 's0', type: 'IN', label: 'S0', x: 40, y: 150 }",
      "{ id: 's1', type: 'IN', label: 'S1', x: 40, y: 230 }",
    ];
    for (let k = 0; k < 4; k++) parts.push(`{ id: 'y${k}', type: 'OUT', label: 'Y${k}', x: 660, y: ${80 * k + 20}, color: '#f59e0b' }`);
    let wires = '';
    if (solved) {
      parts.push("{ id: 'dec', type: 'DEC2', x: 200, y: 120 }");
      const w = ["['s0','dec.A0']", "['s1','dec.A1']"];
      for (let k = 0; k < 4; k++) {
        parts.push(`{ id: 'g${k}', type: 'AND', x: 480, y: ${80 * k + 20} }`);
        w.push(`['d','g${k}.0',{mx:${420 - 10 * k}}]`, `['dec.Y${k}','g${k}.1',{mx:${360 + 10 * k}}]`, `['g${k}','y${k}']`);
      }
      wires = 'wires: [' + w.join(',') + '],';
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 1 → 4 demultiplexer from a DECODER chip',
  intro: 'Send data bit <b>D</b> to output number <b>S1 S0</b>; all other outputs stay 0.',
  build: { palette: ['DEC2', 'AND', 'OR', 'NOT'], best: 5 },
  target: ({ D, S0, S1 }) => { const n = S0 + 2 * S1, o = {}; for (let k = 0; k < 4; k++) o['Y' + k] = D && n === k ? 1 : 0; return o; },
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // encoder
  // =====================================================================
  const ENC_NAIVE = function () {
    const r = document.getElementById('r');
    Circ.mount('#c', {
      title: 'A plain 4 → 2 encoder (just two OR gates)',
      intro: 'Turn on exactly one input: Y1 Y0 spell its number. Then turn on <b>two</b> at once and see the nonsense.',
      parts: [
        { id: 'i0', type: 'IN', label: 'I0', x: 20, y: 0 },
        { id: 'i1', type: 'IN', label: 'I1', x: 20, y: 60 },
        { id: 'i2', type: 'IN', label: 'I2', x: 20, y: 120, value: 1 },
        { id: 'i3', type: 'IN', label: 'I3', x: 20, y: 180 },
        { id: 'o0', type: 'OR', x: 200, y: 70 },
        { id: 'o1', type: 'OR', x: 200, y: 150 },
        { id: 'y0', type: 'OUT', label: 'Y0', x: 340, y: 70, color: '#f59e0b' },
        { id: 'y1', type: 'OUT', label: 'Y1', x: 340, y: 150, color: '#f59e0b' },
        { type: 'TEXT', text: '← I0 is not connected to anything!', x: 70, y: 25, size: 11.5, color: '#b45309' },
      ],
      wires: [['i1', 'o0.0'], ['i3', 'o0.1', { mx: 120 }], ['i2', 'o1.0', { mx: 160 }], ['i3', 'o1.1', { mx: 160 }], ['o0', 'y0'], ['o1', 'y1']],
      onChange(api) {
        const on = [0, 1, 2, 3].filter((k) => api.get('I' + k));
        const code = api.get('Y0') + 2 * api.get('Y1');
        let msg = 'Inputs on: ' + (on.length ? on.map((k) => 'I' + k).join(', ') : 'none') + ' → code Y1 Y0 = <code>' + api.get('Y1') + api.get('Y0') + '</code> = ' + code + '. ';
        if (on.length === 1) msg += on[0] === code ? '✅ correct.' : '';
        else if (on.length === 0) msg += '⚠ Same code as "I0 pressed": you can\'t tell them apart.';
        else msg += code === Math.max(...on) ? '🤔 Happens to match the highest one — by luck.' : '❌ Garbage: ' + code + ' was not even pressed!';
        r.innerHTML = msg;
      },
    });
  };
  const ENC_IRQ = function () {
    const r = document.getElementById('r');
    const DEV = ['🐭 mouse', '⌨️ keyboard', '💽 disk', '⏰ timer'];
    Circ.mount('#c', {
      title: 'Interrupt controller: who gets the CPU first?',
      intro: 'Each device raises its line to ask for attention. The priority encoder outputs the number of the <b>most urgent</b> one, plus <b>V</b> ("someone is asking").',
      parts: [
        { id: 'i0', type: 'IN', label: 'I0 ' + DEV[0], x: 40, y: -20, value: 1 },
        { id: 'i1', type: 'IN', label: 'I1 ' + DEV[1], x: 40, y: 40 },
        { id: 'i2', type: 'IN', label: 'I2 ' + DEV[2], x: 40, y: 100, value: 1 },
        { id: 'i3', type: 'IN', label: 'I3 ' + DEV[3], x: 40, y: 160 },
        { id: 'pe', type: 'PRIO4', x: 260, y: 20 },
        { id: 'irq', type: 'NUMOUT', bits: 2, label: 'IRQ #', x: 440, y: 30 },
        { id: 'v', type: 'OUT', label: 'V (interrupt!)', x: 440, y: 120, color: '#ef4444' },
      ],
      wires: [['i0', 'pe.I0', { mx: 130 }], ['i1', 'pe.I1', { mx: 170 }], ['i2', 'pe.I2', { mx: 170 }], ['i3', 'pe.I3', { mx: 130 }],
        ['pe.Y0', 'irq.0'], ['pe.Y1', 'irq.1'], ['pe.V', 'v', { mx: 400 }]],
      onChange(api) {
        const on = [0, 1, 2, 3].filter((k) => api.get('i' + k));
        if (!on.length) { r.innerHTML = 'V = 0: nobody needs the CPU, it keeps running the normal program.'; return; }
        const n = api.get('irq');
        const wait = on.filter((k) => k !== n).map((k) => DEV[k]);
        r.innerHTML = 'V = 1 → CPU pauses and runs the handler for IRQ <b>' + n + '</b> (' + DEV[n] + ').' + (wait.length ? ' Still waiting: ' + wait.join(', ') + '. They are served once ' + DEV[n] + ' lowers its line.' : '');
      },
    });
  };
  const ENC_EX = (solved) => {
    const ys = [20, 100, 180, 260];
    const parts = [3, 2, 1, 0].map((k, j) => `{ id: 'i${k}', type: 'IN', label: 'I${k}', x: 40, y: ${ys[j]} }`);
    parts.push("{ id: 'y1', type: 'OUT', label: 'Y1', x: 660, y: 20, color: '#f59e0b' }",
      "{ id: 'y0', type: 'OUT', label: 'Y0', x: 660, y: 140, color: '#f59e0b' }",
      "{ id: 'v', type: 'OUT', label: 'V', x: 660, y: 260, color: '#ef4444' }");
    let wires = '';
    if (solved) {
      parts.push("{ id: 'oy1', type: 'OR', x: 300, y: 30 }", "{ id: 'n2', type: 'NOT', x: 180, y: 160 }",
        "{ id: 'a', type: 'AND', x: 300, y: 170 }", "{ id: 'oy0', type: 'OR', x: 460, y: 150 }",
        "{ id: 'ov', type: 'OR', n: 3, x: 460, y: 250 }");
      wires = "wires: [['i3','oy1.0'],['i2','oy1.1',{mx:150}],['i2','n2.0',{mx:150}],['n2','a.0',{mx:260}],['i1','a.1'],['i3','oy0.0',{mx:420}],['a','oy0.1',{mx:400}],['oy1','y1'],['oy0','y0'],['oy1','ov.0',{mx:380}],['i1','ov.1',{mx:250}],['i0','ov.2'],['ov','v']],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: a 4 → 2 priority encoder',
  intro: 'Y1 Y0 = number of the highest input that is on (I3 beats I2 beats I1 beats I0). V = 1 if any input is on.',
  build: { palette: ['AND', 'OR', 'NOT', 'OR:3'], best: 5 },
  target: ({ I0, I1, I2, I3 }) => { const n = I3 ? 3 : I2 ? 2 : I1 ? 1 : 0; return { Y1: n >> 1, Y0: n & 1, V: I0 | I1 | I2 | I3 }; },
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // comparator
  // =====================================================================
  const CMP1 = function () {
    Circ.mount('#c', {
      title: '1-bit comparator',
      intro: 'Three questions about two bits, each answered by one or two gates.',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0, value: 1 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 150 },
        { id: 'nb', type: 'NOT', x: 140, y: 20 },
        { id: 'na', type: 'NOT', x: 140, y: 130 },
        { id: 'gt', type: 'AND', x: 280, y: 10 },
        { id: 'eq', type: 'XNOR', x: 280, y: 70 },
        { id: 'lt', type: 'AND', x: 280, y: 140 },
        { id: 'ogt', type: 'OUT', label: 'A>B', x: 420, y: 10, color: '#3b82f6' },
        { id: 'oeq', type: 'OUT', label: 'A=B', x: 420, y: 70, color: '#16a34a' },
        { id: 'olt', type: 'OUT', label: 'A<B', x: 420, y: 140, color: '#ef4444' },
      ],
      wires: [
        ['a', 'gt.0', { mx: 240 }], ['nb', 'gt.1'], ['a', 'eq.0', { mx: 240 }], ['b', 'eq.1', { mx: 250 }],
        ['a', 'na.0', { mx: 110 }], ['b', 'nb.0', { mx: 100 }], ['na', 'lt.0', { mx: 240 }], ['b', 'lt.1'],
        ['gt', 'ogt'], ['eq', 'oeq'], ['lt', 'olt'],
      ],
    });
  };
  const CMP_EQ4 = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'A', type: 'NUMIN', label: 'A', x: 20, y: 0, value: 9 },
      { id: 'B', type: 'NUMIN', label: 'B', x: 20, y: 190, value: 11 },
      { id: 'all', type: 'AND', n: 4, x: 420, y: 100 },
      { id: 'eq', type: 'OUT', label: 'A=B', x: 560, y: 120, color: '#16a34a' },
    ];
    const wires = [['all', 'eq']];
    const AMX = [180, 170, 160, 150], BMX = [200, 210, 220, 230], OMX = [380, 360, 360, 380];
    for (let k = 0; k < 4; k++) {
      parts.push({ id: 'x' + k, type: 'XNOR', x: 260, y: 60 * k + 20, label: 'bit ' + k + ' same?' });
      wires.push(['A.' + k, 'x' + k + '.0', { mx: AMX[k] }], ['B.' + k, 'x' + k + '.1', { mx: BMX[k] }], ['x' + k, 'all.' + k, { mx: OMX[k] }]);
    }
    Circ.mount('#c', {
      title: '4-bit equality: XNOR every bit pair, then AND them all',
      intro: 'Click ▲▼ or individual bits. A=B lights only when <b>every</b> XNOR says "same".',
      parts, wires,
      onChange(api) {
        const a = api.get('A'), b = api.get('B');
        const diff = [0, 1, 2, 3].filter((k) => ((a >> k) & 1) !== ((b >> k) & 1));
        r.innerHTML = a + ' vs ' + b + ': ' + (diff.length ? 'bits differ at position ' + diff.join(', ') + ' → that XNOR outputs 0 → the AND outputs 0.' : 'all four bits match → <b>A = B</b>.');
      },
    });
  };
  const CMP_MAG = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'A', type: 'NUMIN', label: 'A', x: 20, y: 0, value: 6 },
      { id: 'B', type: 'NUMIN', label: 'B', x: 20, y: 140, value: 5 },
      { id: 'cmp', type: 'CMP4', x: 240, y: 0 },
      { id: 'gt', type: 'OUT', label: 'A>B', x: 440, y: 40, color: '#3b82f6' },
      { id: 'eq', type: 'OUT', label: 'A=B', x: 440, y: 90, color: '#16a34a' },
      { id: 'lt', type: 'OUT', label: 'A<B', x: 440, y: 140, color: '#ef4444' },
    ];
    const wires = [['cmp.A>B', 'gt', { mx: 400 }], ['cmp.A=B', 'eq', { mx: 380 }], ['cmp.A<B', 'lt', { mx: 400 }]];
    for (let k = 0; k < 4; k++) {
      wires.push(['A.' + k, 'cmp.A' + k, { mx: 190 - 10 * k }], ['B.' + k, 'cmp.B' + k, { mx: 200 + 10 * k }]);
    }
    Circ.mount('#c', {
      title: '4-bit magnitude comparator chip',
      intro: 'Same job as a 74HC85 chip. Below the board, see the MSB-first decision it makes.',
      parts, wires,
      onChange(api) {
        const a = api.get('A'), b = api.get('B');
        const ab = a.toString(2).padStart(4, '0'), bb = b.toString(2).padStart(4, '0');
        let k = 0; while (k < 4 && ab[k] === bb[k]) k++;
        r.innerHTML = 'A = <code>' + ab + '</code>, B = <code>' + bb + '</code>. ' + (k === 4 ? 'All bits equal → <b>A = B</b>.' :
          'Scan from the left (MSB): ' + (k ? 'bit' + (k > 1 ? 's' : '') + ' ' + [3, 2, 1, 0].slice(0, k).join(', ') + ' tie; ' : '') + 'first difference at bit ' + (3 - k) + ': A has ' + ab[k] + ', B has ' + bb[k] + ' → <b>' + (ab[k] === '1' ? 'A > B' : 'A < B') + '</b>. Lower bits no longer matter.');
      },
    });
  };
  const CMP_EX = (solved) => {
    const parts = [
      "{ id: 'A', type: 'NUMIN', bits: 2, label: 'A', x: 40, y: 40 }",
      "{ id: 'B', type: 'NUMIN', bits: 2, label: 'B', x: 40, y: 220 }",
      "{ id: 'gt', type: 'OUT', label: 'A>B', x: 680, y: 150, color: '#3b82f6' }",
    ];
    let wires = '';
    if (solved) {
      parts.push("{ id: 'nb1', type: 'NOT', x: 180, y: 0 }", "{ id: 'hi', type: 'AND', x: 320, y: 40 }",
        "{ id: 'x', type: 'XNOR', x: 320, y: 120 }", "{ id: 'nb0', type: 'NOT', x: 180, y: 300 }",
        "{ id: 'lo', type: 'AND', n: 3, x: 440, y: 200 }", "{ id: 'o', type: 'OR', x: 580, y: 130 }");
      wires = "wires: [['B.1','nb1.0',{mx:150}],['A.1','hi.0',{mx:280}],['nb1','hi.1',{mx:260}],['A.1','x.0',{mx:280}],['B.1','x.1',{mx:300}],['x','lo.0',{mx:400}],['A.0','lo.1',{mx:240}],['B.0','nb0.0',{mx:150}],['nb0','lo.2',{mx:400}],['hi','o.0',{mx:500}],['lo','o.1',{mx:540}],['o','gt']],";
    }
    return `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Puzzle: 2-bit "A > B"',
  intro: 'A and B are 2-bit numbers (0–3). Light A>B exactly when A is bigger. Check tests all 16 pairs.',
  build: { palette: ['AND', 'OR', 'NOT', 'XNOR', 'AND:3'], best: 6 },
  target: ({ A, B }) => ({ 'A>B': A > B ? 1 : 0 }),
  parts: [${parts.join(',\n    ')}],
  ${wires}
});
<\/script>`;
  };

  // =====================================================================
  // seven-segment
  // =====================================================================
  const SEG_CHIP = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'n', type: 'NUMIN', label: 'BCD digit', x: 20, y: 30, value: 7 },
      { id: 'dec', type: 'BCD7', x: 220, y: 0 },
      { id: 'disp', type: 'SEG7', label: 'display', x: 420, y: 10 },
    ];
    const wires = [];
    for (let k = 0; k < 4; k++) wires.push(['n.' + k, 'dec.D' + k]);
    'abcdefg'.split('').forEach((s) => wires.push(['dec.' + s, 'disp.' + s]));
    const L = 'abcdefg'.split('');
    const table = (cur) => {
      let h = '<table class="st"><tr><th>digit</th>' + L.map((s) => '<th>' + s + '</th>').join('') + '</tr>';
      for (let d = 0; d < 10; d++) h += '<tr class="' + (d === cur ? 'cur' : '') + '"><td>' + d + '</td>' + L.map((s, k) => '<td class="' + ((window.SEG_BITS[d] >> k) & 1 ? 'on' : '') + '">' + ((window.SEG_BITS[d] >> k) & 1) + '</td>').join('') + '</tr>';
      h += '<tr class="' + (cur > 9 ? 'cur' : '') + '"><td>10–15</td><td colspan="7">blank (not a decimal digit)</td></tr>';
      return h + '</table>';
    };
    Circ.mount('#c', {
      title: 'BCD → 7-segment decoder',
      intro: 'Click ▲▼ on the digit. The decoder turns 4 bits into 7 segment lines. Hover the display: segments are named a–g.',
      parts, wires,
      onChange(api) {
        const d = api.get('n');
        const lit = L.filter((s, k) => d < 10 && (window.SEG_BITS[d] >> k) & 1);
        r.innerHTML = '<div>Input <code>' + d.toString(2).padStart(4, '0') + '</code> = ' + d + (d < 10 ? ' → segments lit: <b>' + lit.join(' ') + '</b>' : ' → not valid BCD, the chip blanks the display') +
          '</div><div style="margin-top:6px">The whole decoder is just this table, one column = one Boolean function of 4 inputs:</div>' + table(d);
      },
    });
  };
  const SEG_CSS = '<style>.st{border-collapse:collapse;margin-top:4px;font:12.5px ui-monospace,Menlo,monospace;background:#fff}.st td,.st th{border:1px solid #e2e8f0;padding:1px 8px;text-align:center}.st th{background:#f1f5f9;font-family:system-ui}.st td.on{color:#dc2626;font-weight:700}.st tr.cur td{background:#fff4c2}</style>';
  const SEG_G = function () {
    const r = document.getElementById('r');
    const parts = [
      { id: 'n', type: 'NUMIN', label: 'BCD digit', x: 20, y: 20, value: 6 },
      { id: 'af', type: 'CHIP', label: 'SEGMENTS a–f', w: 120, ins: ['D0', 'D1', 'D2', 'D3'], outs: ['a', 'b', 'c', 'd', 'e', 'f'], x: 240, y: 0,
        fn: (i) => { const n = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3]; const m = n < 10 ? window.SEG_BITS[n] : 0; return [0, 1, 2, 3, 4, 5].map((k) => (m >> k) & 1); } },
      { id: 'x', type: 'XOR', x: 240, y: 190, label: 'D2 ⊕ D1' },
      { id: 'nd0', type: 'NOT', x: 150, y: 250 },
      { id: 'an', type: 'AND', x: 240, y: 260, label: 'D1·D̄0' },
      { id: 'o', type: 'OR', n: 3, x: 360, y: 200 },
      { id: 'disp', type: 'SEG7', label: 'display', x: 480, y: 10 },
      { type: 'TEXT', text: 'segment g, built from gates:', x: 240, y: 178, size: 11.5, color: '#7c3aed', bold: true },
    ];
    const wires = [];
    for (let k = 0; k < 4; k++) wires.push(['n.' + k, 'af.D' + k]);
    'abcdef'.split('').forEach((s) => wires.push(['af.' + s, 'disp.' + s]));
    wires.push(['n.3', 'o.0', { pts: [[220, 110], [220, 170], [340, 170], [340, 210]] }], ['n.2', 'x.0', { pts: [[130, 90], [130, 200]] }], ['n.1', 'x.1', { pts: [[120, 70], [120, 220]] }],
      ['n.1', 'an.0', { pts: [[120, 70], [120, 270]] }], ['n.0', 'nd0.0', { pts: [[110, 50], [110, 270]] }], ['nd0', 'an.1', { mx: 225 }],
      ['x', 'o.1', { mx: 330 }], ['an', 'o.2', { mx: 330 }], ['o', 'disp.g', { mx: 450 }]);
    Circ.mount('#c', {
      title: 'One segment = one little circuit',
      intro: 'A chip drives segments a–f; segment <b>g</b> (the middle bar) is wired from gates: g = D3 + (D2 ⊕ D1) + D1·D̄0.',
      parts, wires,
      onChange(api) {
        const d = api.get('n');
        const b = [3, 2, 1, 0].map((k) => (d >> k) & 1);
        r.innerHTML = 'D3 D2 D1 D0 = <code>' + b.join('') + '</code> (' + d + '): D3 = ' + b[0] + ', D2⊕D1 = ' + (b[1] ^ b[2]) + ', D1·D̄0 = ' + (b[2] & (b[3] ^ 1)) + ' → g = <b>' + (b[0] | (b[1] ^ b[2]) | (b[2] & (b[3] ^ 1))) + '</b>. ' + (d > 9 ? '(10–15 are "don\'t care": no real digit, so g may do anything.)' : 'Off for 0, 1, 7 only.');
      },
    });
  };
  const SEG_EX = (solved) => {
    const def = DEF_BCD7.toString();
    let extra = '', wires = '';
    if (solved) {
      extra = ",\n    { id: 'x', type: 'XNOR', x: 280, y: 260 }, { id: 'o', type: 'OR', n: 3, x: 440, y: 250 }";
      wires = ",['n.3','o.0',{pts:[[180,130],[180,230],[420,230],[420,260]]}],['n.2','x.0',{pts:[[160,110],[160,270]]}],['n.0','x.1',{pts:[[140,70],[140,290]]}],['n.1','o.2',{pts:[[150,90],[150,340],[420,340],[420,300]]}],['x','o.1',{mx:380}],['o','a',{mx:540}],['o','disp.a',{pts:[[540,280],[540,30]]}]";
    }
    return `<div id="c"></div>
<script>
(${def})();
const bg = (i) => { const n = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3]; const m = n < 10 ? window.SEG_BITS[n] : 0; return [1, 2, 3, 4, 5, 6].map((k) => (m >> k) & 1); };
const wires = [];
for (let k = 0; k < 4; k++) wires.push(['n.' + k, 'bg.D' + k]);
'bcdefg'.split('').forEach((s) => wires.push(['bg.' + s, 'disp.' + s]));
Circ.mount('#c', {
  title: 'Puzzle: drive segment a (the top bar)',
  intro: 'Segment a is lit for digits 0, 2, 3, 5, 6, 7, 8, 9 and off for 1 and 4. Inputs 10–15 are "don\\'t care". Wire your result to LED <b>a</b> (and to the display\\'s <b>a</b> pin to see full digits).',
  build: { palette: ['AND', 'OR', 'NOT', 'XOR', 'XNOR', 'OR:3'], best: 2 },
  w: 820, h: 400,
  target: ({ BCD }) => (BCD > 9 ? {} : { a: [1, 0, 1, 1, 0, 1, 1, 1, 1, 1][BCD] }),
  parts: [
    { id: 'n', type: 'NUMIN', label: 'BCD', x: 40, y: 40 },
    { id: 'bg', type: 'CHIP', label: 'SEG b–g (done)', fixed: true, w: 130, ins: ['D0', 'D1', 'D2', 'D3'], outs: ['b', 'c', 'd', 'e', 'f', 'g'], x: 260, y: 20, fn: bg },
    { id: 'disp', type: 'SEG7', label: 'display', x: 640, y: 10 },
    { id: 'a', type: 'OUT', label: 'a', x: 640, y: 260, color: '#ef4444' }${extra}
  ],
  wires: wires.concat([${wires.replace(/^,/, '')}]),
});
<\/script>`;
  };

  // =====================================================================
  // buses-tristate
  // =====================================================================
  const TRI_HTML = `<style>
.tw{font:14px system-ui;color:#1e293b;display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}
.tw .ctl{display:flex;flex-direction:column;gap:10px;min-width:220px}
.tw button{font:600 14px system-ui;padding:6px 12px;border-radius:8px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer}
.tw button.on{background:#16a34a;color:#fff;border-color:#15803d}
.tw table{border-collapse:collapse;font:13px ui-monospace,Menlo,monospace}.tw td,.tw th{border:1px solid #e2e8f0;padding:2px 10px;text-align:center}
.tw tr.cur td{background:#fff4c2;font-weight:700}.tw .rd{margin-top:8px;padding:8px 12px;border-radius:8px;background:#f1f5f9;max-width:560px}
</style>
<div class="tw"><svg id="sv" width="480" height="300" viewBox="0 0 480 300"></svg>
<div class="ctl"><div><b>Data in A</b><br><button id="ba">A = 0</button></div>
<div><b>Enable EN</b> (output enable)<br><button id="be">EN = 0</button></div>
<table id="tt"></table></div></div><div class="tw"><div class="rd" id="r"></div></div>`;
  const TRI_JS = function () {
    let A = 0, EN = 0;
    const sv = document.getElementById('sv'), r = document.getElementById('r');
    const G = '#16a34a', GR = '#9aa3b5', Y = '#f59e0b';
    function draw() {
      const up = EN && A, dn = EN && !A;
      const out = EN ? A : 'Z';
      const oc = out === 'Z' ? Y : out ? G : GR;
      const sw = (y, closed, lbl) => `<g><circle cx="300" cy="${y}" r="4" fill="#334155"/><circle cx="300" cy="${y + 50}" r="4" fill="#334155"/>
        <line x1="300" y1="${y}" x2="${closed ? 300 : 325}" y2="${y + 46}" stroke="${closed ? '#334155' : '#94a3b8'}" stroke-width="4" stroke-linecap="round"/>
        <text x="335" y="${y + 30}" font-size="12" fill="${closed ? '#15803d' : '#64748b'}" font-weight="700">${lbl}: ${closed ? 'ON (closed)' : 'off (open)'}</text></g>`;
      sv.innerHTML = `
        <text x="10" y="18" font-size="13" font-weight="700">Symbol</text>
        <line x1="20" y1="90" x2="60" y2="90" stroke="${A ? G : GR}" stroke-width="3"/>
        <text x="14" y="84" font-size="13" font-weight="700">A</text>
        <path d="M60 65 L110 90 L60 115 Z" fill="${EN ? '#ecfdf3' : '#fff'}" stroke="#334155" stroke-width="2"/>
        <line x1="85" y1="140" x2="85" y2="103" stroke="${EN ? G : GR}" stroke-width="3"/>
        <text x="72" y="158" font-size="13" font-weight="700">EN</text>
        <line x1="110" y1="90" x2="160" y2="90" stroke="${oc}" stroke-width="3" ${out === 'Z' ? 'stroke-dasharray="6 5"' : ''}/>
        <text x="130" y="80" font-size="15" font-weight="800" fill="${oc}">${out}</text>
        <text x="200" y="18" font-size="13" font-weight="700">Inside (two switches)</text>
        <text x="282" y="40" font-size="12" font-weight="700" fill="#dc2626">+5V (1)</text>
        <line x1="300" y1="45" x2="300" y2="60" stroke="#dc2626" stroke-width="3"/>
        ${sw(60, up, 'top')}
        <line x1="300" y1="110" x2="300" y2="190" stroke="${oc}" stroke-width="3"/>
        <line x1="300" y1="150" x2="230" y2="150" stroke="${oc}" stroke-width="3" ${out === 'Z' ? 'stroke-dasharray="6 5"' : ''}/>
        <text x="200" y="145" font-size="13" font-weight="800" fill="${oc}">OUT</text>
        ${sw(190, dn, 'bottom')}
        <line x1="300" y1="240" x2="300" y2="255" stroke="#334155" stroke-width="3"/>
        <line x1="285" y1="258" x2="315" y2="258" stroke="#334155" stroke-width="3"/><line x1="291" y1="264" x2="309" y2="264" stroke="#334155" stroke-width="2"/>
        <text x="320" y="270" font-size="12" font-weight="700">GND (0)</text>
        <text x="10" y="200" font-size="12" fill="#64748b">dashed = floating (Z):</text><text x="10" y="216" font-size="12" fill="#64748b">connected to nothing</text>`;
      document.getElementById('ba').textContent = 'A = ' + A; document.getElementById('ba').className = A ? 'on' : '';
      document.getElementById('be').textContent = 'EN = ' + EN; document.getElementById('be').className = EN ? 'on' : '';
      let t = '<tr><th>EN</th><th>A</th><th>OUT</th></tr>';
      [[0, 0], [0, 1], [1, 0], [1, 1]].forEach(([e, a]) => { t += `<tr class="${e === EN && a === A ? 'cur' : ''}"><td>${e}</td><td>${a}</td><td>${e ? a : 'Z'}</td></tr>`; });
      document.getElementById('tt').innerHTML = t;
      r.innerHTML = EN ? `EN = 1: the buffer <b>drives</b> the wire. ${A ? 'Top switch connects OUT to +5V → OUT = 1.' : 'Bottom switch connects OUT to GND → OUT = 0.'}`
        : 'EN = 0: <b>both</b> switches are open. OUT is connected to neither +5V nor GND: it is <b>Z</b> ("high impedance", floating). The buffer has politely let go of the wire so someone else can use it.';
    }
    document.getElementById('ba').onclick = () => { A ^= 1; draw(); };
    document.getElementById('be').onclick = () => { EN ^= 1; draw(); };
    draw();
  };

  const BUS_HTML = `<style>
.bw{font:14px system-ui;color:#1e293b}
.bw .devs{display:flex;gap:10px;flex-wrap:wrap}
.bw .dev{border:2px solid #cbd5e1;border-radius:10px;padding:8px 10px;background:#fff;width:170px;box-sizing:border-box}
.bw .dev.drv{border-color:#16a34a;background:#f0fdf4}
.bw .dev h4{margin:0 0 6px;font-size:14px}
.bw .bits button{font:700 13px ui-monospace,Menlo,monospace;width:26px;height:26px;margin-right:3px;border-radius:5px;border:1px solid #94a3b8;background:#e5e7eb;cursor:pointer;padding:0}
.bw .bits button.one{background:#16a34a;color:#fff;border-color:#15803d}
.bw .oe{margin-top:6px;font:600 13px system-ui;padding:4px 10px;border-radius:6px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer}
.bw .oe.on{background:#0f766e;color:#fff;border-color:#0f766e}
.bw .rd{margin-top:8px;padding:8px 12px;border-radius:8px;background:#f1f5f9}
.bw .rd.bad{background:#fee2e2;color:#7f1d1d}.bw .rd.meh{background:#fef3c7;color:#78350f}
@keyframes zap{0%,100%{opacity:1}50%{opacity:.25}} .zap{animation:zap .35s infinite}
</style>
<div class="bw"><div class="devs" id="devs"></div><svg id="sv" width="760" height="150" viewBox="0 0 760 150" style="display:block"></svg><div class="rd" id="r"></div></div>`;
  const BUS_JS = function () {
    const devs = [
      { name: '🧠 CPU', v: 0b0011, oe: 0 },
      { name: '🗄 RAM', v: 0b1010, oe: 1 },
      { name: '📀 ROM', v: 0b0110, oe: 0 },
      { name: '⌨️ Keyboard', v: 0b1100, oe: 0 },
    ];
    const host = document.getElementById('devs'), sv = document.getElementById('sv'), r = document.getElementById('r');
    function render() {
      host.innerHTML = '';
      devs.forEach((d, i) => {
        const el = document.createElement('div');
        el.className = 'dev' + (d.oe ? ' drv' : '');
        el.innerHTML = `<h4>${d.name}</h4><div class="bits">${[3, 2, 1, 0].map((k) => `<button data-k="${k}" class="${(d.v >> k) & 1 ? 'one' : ''}" title="bit ${k}">${(d.v >> k) & 1}</button>`).join('')}</div>
          <button class="oe ${d.oe ? 'on' : ''}">${d.oe ? 'OE = 1: driving' : 'OE = 0: Z (let go)'}</button>`;
        el.querySelectorAll('.bits button').forEach((b) => (b.onclick = () => { d.v ^= 1 << +b.dataset.k; render(); }));
        el.querySelector('.oe').onclick = () => { d.oe ^= 1; render(); };
        host.append(el);
      });
      const drivers = devs.filter((d) => d.oe);
      const lines = [3, 2, 1, 0].map((k) => {
        const vals = drivers.map((d) => (d.v >> k) & 1);
        if (!vals.length) return 'Z';
        if (vals.every((v) => v === vals[0])) return vals[0];
        return 'X';
      });
      const col = (s) => (s === 'Z' ? '#f59e0b' : s === 'X' ? '#dc2626' : s ? '#16a34a' : '#9aa3b5');
      let s = '<text x="36" y="140" font-size="12" font-weight="700" fill="#475569">shared 4-wire data bus (D3 … D0)</text>';
      lines.forEach((v, i) => {
        const y = 36 + i * 26;
        s += `<text x="6" y="${y + 5}" font-size="12" font-weight="700">D${3 - i}</text>`;
        s += `<line x1="36" y1="${y}" x2="690" y2="${y}" stroke="${col(v)}" stroke-width="${v === 'X' ? 5 : 3.5}" ${v === 'Z' ? 'stroke-dasharray="8 6"' : ''} class="${v === 'X' ? 'zap' : ''}"/>`;
        s += `<text x="700" y="${y + 5}" font-size="14" font-weight="800" fill="${col(v)}">${v === 'X' ? '⚡' : v}</text>`;
        devs.forEach((d, j) => {
          const x = 85 + j * 180;
          s += `<line x1="${x}" y1="22" x2="${x}" y2="${y}" stroke="${d.oe ? '#334155' : '#cbd5e1'}" stroke-width="1.5" ${d.oe ? '' : 'stroke-dasharray="3 4"'}/><circle cx="${x}" cy="${y}" r="3" fill="${d.oe ? '#334155' : '#cbd5e1'}"/>`;
        });
      });
      sv.innerHTML = s;
      const bin = lines.join('');
      if (!drivers.length) { r.className = 'rd meh'; r.innerHTML = 'Nobody is driving: every line is <b>floating (Z)</b>. A reader would see random noise. (Real buses add weak "pull-up" resistors so idle lines read 1.)'; }
      else if (lines.includes('X')) {
        const bad = lines.map((v, i) => (v === 'X' ? 'D' + (3 - i) : null)).filter(Boolean);
        r.className = 'rd bad';
        r.innerHTML = `⚡ <b>Bus contention</b> on ${bad.join(', ')}: ${drivers.map((d) => d.name).join(' and ')} are both driving, one to +5V and one to GND. That is a short circuit through two transistors: big current, heat, garbage value, maybe a dead chip. Turn one OE off!`;
      } else if (drivers.length > 1) { r.className = 'rd meh'; r.innerHTML = `Two drivers (${drivers.map((d) => d.name).join(', ')}) happen to agree on every bit, so no short <i>right now</i>. Change one bit and it fries. Rule: <b>exactly one</b> OE at a time.`; }
      else { r.className = 'rd'; r.innerHTML = `✅ Exactly one driver: <b>${drivers[0].name}</b> puts <code>${bin}</code> (= ${parseInt(bin, 2)}) on the bus. Everyone else is Z, so every chip on the bus can read it.`; }
    }
    render();
  };

  const SCHED_HTML = `<style>
.sw{font:14px system-ui;color:#1e293b}
.sw table{border-collapse:collapse;margin:6px 0}
.sw td,.sw th{border:1px solid #e2e8f0;padding:4px 8px;text-align:center}
.sw th{background:#f1f5f9}.sw th.sel{background:#fde68a;cursor:pointer}.sw th.step{cursor:pointer}
.sw .t{font:600 12px system-ui;padding:3px 8px;margin:1px;border-radius:6px;border:1px solid #94a3b8;background:#f8fafc;cursor:pointer}
.sw .t.oe.on{background:#0f766e;color:#fff;border-color:#0f766e}.sw .t.ld.on{background:#7c3aed;color:#fff;border-color:#7c3aed}
.sw .chk{font:700 14px system-ui;padding:6px 16px;border-radius:8px;border:1px solid #16a34a;background:#16a34a;color:#fff;cursor:pointer}
.sw .circ-result{margin-top:8px;padding:8px 12px;border-radius:8px}.sw .circ-result:empty{display:none}
.sw .circ-result.ok{background:#dcfce7;color:#14532d;border:1px solid #86efac}.sw .circ-result.bad{background:#fee2e2;color:#7f1d1d;border:1px solid #fca5a5}
.sw .bus{font:13px ui-monospace,Menlo,monospace;background:#0f172a;color:#e2e8f0;padding:8px 12px;border-radius:8px;margin-top:6px}
</style>
<div class="sw">
<div><b>The program needs three bus transfers, one per clock step:</b>
<ol style="margin:4px 0"><li><b>T1</b>: ROM → CPU (fetch an instruction)</li><li><b>T2</b>: Keyboard → CPU (read a key)</li><li><b>T3</b>: CPU → RAM (store a result)</li></ol></div>
<div>For each step, switch on <b class="oe">OE</b> (output enable: "I drive the bus") for the source and <b>LD</b> (load: "I copy the bus at the clock edge") for the destination. Click a step header to preview its bus.</div>
<table id="g"></table>
<button class="chk" id="chk">✔ Check</button>
<div class="bus" id="bus"></div>
<div class="circ-result" id="res"></div></div>`;
  const SCHED_JS = function (init) {
    const DEV = ['CPU', 'RAM', 'ROM', 'Keyboard'];
    const VAL = { CPU: '0111', RAM: '0000', ROM: '1001', Keyboard: '0100' };
    const GOAL = [['ROM', 'CPU'], ['Keyboard', 'CPU'], ['CPU', 'RAM']];
    const st = JSON.parse(JSON.stringify(init)); // st[step][dev] = {oe, ld}
    let cur = 0;
    const g = document.getElementById('g'), bus = document.getElementById('bus'), res = document.getElementById('res');
    function busOf(t) {
      const drv = DEV.filter((d) => st[t][d].oe);
      if (!drv.length) return { txt: 'ZZZZ (floating!)', drv };
      const vals = drv.map((d) => VAL[d]);
      const v = vals[0].split('').map((b, i) => (vals.every((x) => x[i] === b) ? b : '⚡')).join('');
      return { txt: v, drv };
    }
    function render() {
      let h = '<tr><th>device (holds)</th>' + [0, 1, 2].map((t) => `<th class="step ${t === cur ? 'sel' : ''}" data-t="${t}">T${t + 1}</th>`).join('') + '</tr>';
      DEV.forEach((d) => {
        h += `<tr><td style="text-align:left"><b>${d}</b> <code>${VAL[d]}</code></td>`;
        for (let t = 0; t < 3; t++) h += `<td><button class="t oe ${st[t][d].oe ? 'on' : ''}" data-t="${t}" data-d="${d}" data-k="oe">OE</button><button class="t ld ${st[t][d].ld ? 'on' : ''}" data-t="${t}" data-d="${d}" data-k="ld">LD</button></td>`;
        h += '</tr>';
      });
      g.innerHTML = h;
      g.querySelectorAll('button.t').forEach((b) => (b.onclick = () => { const c = st[+b.dataset.t][b.dataset.d]; c[b.dataset.k] ^= 1; cur = +b.dataset.t; render(); }));
      g.querySelectorAll('th.step').forEach((th) => (th.onclick = () => { cur = +th.dataset.t; render(); }));
      const b = busOf(cur);
      const lds = DEV.filter((d) => st[cur][d].ld);
      bus.innerHTML = `T${cur + 1}: bus = <b>${b.txt}</b>  · driving: ${b.drv.join(' + ') || 'nobody'}  · loading: ${lds.join(', ') || 'nobody'}`;
    }
    document.getElementById('chk').onclick = () => {
      const errs = [];
      GOAL.forEach(([from, to], t) => {
        const drv = DEV.filter((d) => st[t][d].oe), lds = DEV.filter((d) => st[t][d].ld);
        const T = 'T' + (t + 1) + ': ';
        if (!drv.length) errs.push(T + 'nobody drives the bus (floating) — ' + to + ' would load garbage.');
        else if (drv.length > 1) errs.push(T + drv.join(' and ') + ' drive at the same time → bus contention ⚡.');
        else if (drv[0] !== from) errs.push(T + 'the bus carries ' + drv[0] + "'s value, but this step needs " + from + "'s.");
        if (!lds.includes(to)) errs.push(T + to + ' must have LD on to receive the value.');
        lds.filter((d) => d !== to).forEach((d) => errs.push(T + d + ' has LD on: it would overwrite its own contents.'));
      });
      if (!errs.length) {
        res.className = 'circ-result ok';
        res.innerHTML = '✅ All 3 transfers work: exactly one driver per step, and only the destination loads. This OE/LD table is what a CPU control unit generates every clock cycle.';
        console.log('✅ Check passed: bus schedule correct');
      } else {
        res.className = 'circ-result bad';
        res.innerHTML = '❌ ' + errs.length + ' problem' + (errs.length > 1 ? 's' : '') + ':<br>' + errs.join('<br>');
        console.log('❌ Check failed: ' + errs.length + ' problem(s)');
      }
    };
    render();
  };
  const blankSched = () => [0, 1, 2].map(() => ({ CPU: { oe: 0, ld: 0 }, RAM: { oe: 0, ld: 0 }, ROM: { oe: 0, ld: 0 }, Keyboard: { oe: 0, ld: 0 } }));
  const solvedSched = () => {
    const s = blankSched();
    s[0].ROM.oe = 1; s[0].CPU.ld = 1;
    s[1].Keyboard.oe = 1; s[1].CPU.ld = 1;
    s[2].CPU.oe = 1; s[2].RAM.ld = 1;
    return s;
  };
  const SCHED = (init) => SCHED_HTML + '\n<script>\n(' + SCHED_JS.toString() + ')(' + JSON.stringify(init) + ');\n<\/script>';

  // =====================================================================
  // LESSONS
  // =====================================================================
  window.LESSONS.push(
    {
      id: 'multiplexer',
      section: 'Building Blocks',
      title: 'Multiplexer: a hardware if/else',
      explain: `
        <p>So far every circuit computed <em>one</em> answer from its inputs. Real machines constantly need to <strong>choose</strong>: "use this value or that one". In code you'd write:</p>
        <pre><code>Y = S ? B : A;      // if (S) Y = B; else Y = A;</code></pre>
        <p>The circuit that does this is a <strong>multiplexer</strong> ("mux"). It has data inputs (A, B), a <strong>select</strong> input S, and one output Y. Think of a railway switch: the select lever decides which track continues to the station.</p>
        <h3>The trick: gates can't "skip" anything</h3>
        <p>Hardware has no <code>if</code>. Every gate computes all the time. So instead of skipping a branch, we compute <em>both</em> options and <strong>mask</strong> the one we don't want with AND (<code>x AND 0 = 0</code>, <code>x AND 1 = x</code>):</p>
        <pre><code>Y = (A AND NOT S) OR (B AND S)</code></pre>
        <p>When S = 0, the B term is forced to 0 and the A term equals A. When S = 1 it's the other way round. That's 4 gates: one NOT, two AND, one OR.</p>
        <h3>Bigger muxes</h3>
        <p>A <strong>4:1 mux</strong> picks one of four inputs using a 2-bit select number. You can build it from three 2:1 muxes: S0 picks within each pair, S1 picks between the pairs. In general, <em>n</em> select bits choose among 2<sup>n</sup> inputs. Muxes also work on whole numbers: an 8-bit 2:1 mux is just eight 1-bit muxes sharing the same S.</p>
        <div class="tip">A mux is the hardware version of an array lookup: the select bits are the index, the data inputs are the array: <code>Y = D[sel]</code>.</div>
        <div class="world">
          <ul>
            <li>Inside every CPU, muxes choose the ALU's second operand: <em>a register</em> (<code>add r1, r2</code>) or <em>a constant from the instruction</em> (<code>add r1, 5</code>). The same instruction decoder bit that says "immediate" drives the mux's S.</li>
            <li>The <a href="https://www.ti.com/product/SN74HC157" target="_blank">74HC157</a> is a cheap chip with four 2:1 muxes sharing one select pin, and the 74HC153 holds two 4:1 muxes. Both are still sold for hobby and retro-computer builds.</li>
            <li>An HDMI switch box with "input 1 / 2 / 3" buttons is a mux for very high-speed signals.</li>
            <li>FPGAs (reprogrammable chips) are built from <em>look-up tables</em>: a k-input LUT is basically a 2<sup>k</sup>:1 mux whose data inputs are memory bits. Load different bits and it becomes any gate you like.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: '2:1 mux from gates',
          code: WR(MUX2_GATES),
          explain: `
            <details>
              <summary>The problem: an "if" with no way to skip</summary>
              <p>We want <code>Y = S ? B : A</code>. Software jumps over the branch it doesn't need. A circuit can't: both A and B are wired in, and every gate reacts to them all the time. So the design is <strong>"compute both, then blank out the wrong one"</strong>:</p>
              <ul>
                <li>The <strong>top AND</strong> gets A and S̄ (NOT S). It passes A only while S = 0.</li>
                <li>The <strong>bottom AND</strong> gets S and B. It passes B only while S = 1.</li>
                <li>Since S and S̄ are always opposite, <em>at most one</em> AND can be non-zero. The <strong>OR</strong> simply lets that one through.</li>
              </ul>
            </details>
            <details>
              <summary>Step by step: every gate for both values of S</summary>
              <table>
                <tr><th>S</th><th>NOT S (S̄)</th><th>top AND = A·S̄</th><th>bottom AND = B·S</th><th>Y = OR</th></tr>
                <tr><td>0</td><td>1</td><td>A·1 = <b>A</b></td><td>B·0 = 0</td><td><b>A</b></td></tr>
                <tr><td>1</td><td>0</td><td>A·0 = 0</td><td>B·1 = <b>B</b></td><td><b>B</b></td></tr>
              </table>
              <p>The truth table next to the board shows all 8 combinations. Click rows where S = 0: Y always equals the A column. Rows with S = 1: Y equals the B column.</p>
            </details>
            <details>
              <summary>Try this: catch a glitch in slow motion</summary>
              <ol>
                <li>Set <b>A = 1</b>, <b>B = 1</b>, <b>S = 1</b>. Y = 1 (it copies B).</li>
                <li>Click <b>🐢 Slow-mo</b>, then click <b>S</b> to switch it to 0. Y "should" stay 1: A and B are both 1.</li>
                <li>Watch the steps: ① the switch S changes. ② NOT S rises to 1 <em>and</em> the bottom AND drops to 0 at the same time. ③ the top AND rises to 1, but the OR is still reacting to the previous step, where both ANDs were 0, so <b>Y blinks to 0</b>. ④ the OR sees the top AND and Y returns to 1. The status reads "settled after 4 gate delays".</li>
              </ol>
              <p>The cause: the path through the NOT gate is one gate longer than the direct path. This short wrong pulse is called a <strong>hazard</strong> (or glitch). It's harmless here because Y settles, and clocked circuits (later lessons) only look at signals after they've settled. That is a big reason computers have clocks.</p>
            </details>
            <details>
              <summary>Common mistake</summary>
              <p>Wiring S straight into <em>both</em> AND gates (forgetting the NOT) gives <code>Y = S·(A + B)</code>: with S = 0 the output is always 0, and with S = 1 it's "A or B". You need one AND enabled by S and the other by <strong>NOT S</strong>, so exactly one is open at any time.</p>
            </details>
          `,
        },
        {
          title: '4:1 mux from three MUX chips',
          code: WR(MUX4_CHIPS),
        },
      ],
      quiz: [
        { q: 'A 2:1 mux has inputs A = 0, B = 1 and select S = 1. What is Y?', options: ['0', '1', 'A AND B', 'It depends on the previous value'], answer: 1, why: 'S = 1 selects B, and B = 1. A mux is purely combinational: no memory of earlier values.' },
        { q: 'How many select bits does a mux need to choose among 16 inputs?', options: ['2', '4', '8', '16'], answer: 1, why: 'n select bits can name 2ⁿ inputs; 2⁴ = 16.' },
        { q: 'Why does the 2:1 mux need a NOT gate?', options: ['To make the output stronger', 'So that exactly one of the two AND gates is enabled at a time', 'To invert the output', 'It doesn\'t; it\'s optional'], answer: 1, why: 'One AND is enabled by S, the other by NOT S. Without the NOT both would open together.' },
        { q: 'You need to pick between two 8-bit numbers. What do you build?', options: ['One 2:1 mux with 8 select bits', 'Eight 2:1 muxes sharing one select line', 'An 8:1 mux', 'A 256:1 mux'], answer: 1, why: 'Each bit position gets its own 1-bit mux, and all eight listen to the same S. That\'s exactly what a 74HC157 (four muxes, one select) does.' },
      ],
      exercise: {
        task: `<p>Using only <strong>AND, OR and NOT</strong>, build a 2:1 multiplexer on the board below: <code>Y = A</code> when S = 0, <code>Y = B</code> when S = 1. Click <b>+ AND</b> etc. to add gates, drag from a pin to another pin to wire, then click <b>✔ Check</b>. Best known: 4 gates.</p>`,
        hint: 'One AND should see A and NOT S. The other AND should see B and S. OR the two AND outputs together.',
        starter: MUX_EX(false),
        solution: MUX_EX(true),
      },
    },

    {
      id: 'demux-decoder',
      section: 'Building Blocks',
      title: 'Demultiplexer & decoder',
      explain: `
        <p>A mux squeezes many inputs into one output. A <strong>demultiplexer</strong> (demux) does the reverse: one data input D, a select number S, and many outputs. D is sent to output number S; all the others stay 0. Picture a mail sorter dropping a letter into pigeonhole number S.</p>
        <h3>The decoder: "which one?" as wires</h3>
        <p>A <strong>decoder</strong> takes an <em>n</em>-bit number and turns on exactly one of 2<sup>n</sup> output lines: the line with that number. A 2→4 decoder turns <code>10</code> (2) into outputs Y3..Y0 = <code>0100</code>. Exactly one output is 1; this is called <strong>one-hot</strong> encoding.</p>
        <p>Each output is one AND gate that detects one bit pattern. Y2 must be 1 only for A1 A0 = <code>10</code>, so it's <code>A1 AND (NOT A0)</code>. That's the "sum of products" recipe from earlier: each output is a single product term.</p>
        <pre><code>Y0 = Ā1·Ā0    Y1 = Ā1·A0    Y2 = A1·Ā0    Y3 = A1·A0</code></pre>
        <h3>Decoder + AND = demux</h3>
        <p>AND each decoder output with the data bit D and you get a demux: the chosen output carries D, the rest are 0. Real decoder chips have an <strong>enable</strong> input for the same reason: with enable = 0, all outputs stay off.</p>
        <div class="tip">Code analogy: a decoder turns an index into a one-hot array. <code>decode(2) → [0, 0, 1, 0]</code>. Software uses the same idea (one-hot vectors in machine learning, bit flags).</div>
        <div class="world">
          <ul>
            <li><strong>Address decoding.</strong> A CPU puts an address on its address bus, and several memory chips sit on that bus. A decoder looks at the top address bits and enables (selects) exactly one chip. The others ignore the bus. In the second demo you'll see this for a 16-bit address space.</li>
            <li>The <a href="https://www.ti.com/product/SN74HC138" target="_blank">74HC138</a> 3→8 decoder (active-low outputs, three enable pins) was the standard glue chip for this in 1980s home computers and is still used in hobby builds such as Ben Eater's 6502 breadboard computer.</li>
            <li>Inside a RAM chip, a row decoder turns the row address into one active "word line". A 1-gigabit DRAM has decoders choosing among tens of thousands of rows.</li>
            <li>A CPU's instruction decoder turns an opcode into one-hot control signals ("this is an ADD", "this is a LOAD").</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: '2 → 4 decoder from gates',
          code: WR(DEC_GATES),
          explain: `
            <details>
              <summary>How to read this board</summary>
              <p>A0 and A1 are inverted by the two NOT gates, giving four signals: A0, Ā0, A1, Ā1. They run down four vertical "rails" (labelled in purple). Each AND gate taps the two rails that describe its pattern. A wire that ends on a rail (a ⊤ shape) is connected. Lines that just cross (+) are not.</p>
              <table>
                <tr><th>output</th><th>pattern A1 A0</th><th>AND of</th></tr>
                <tr><td>Y0</td><td>00</td><td>Ā1 · Ā0</td></tr>
                <tr><td>Y1</td><td>01</td><td>Ā1 · A0</td></tr>
                <tr><td>Y2</td><td>10</td><td>A1 · Ā0</td></tr>
                <tr><td>Y3</td><td>11</td><td>A1 · A0</td></tr>
              </table>
              <p>Click through the truth table: every row has exactly one 1 among the outputs, the diagonal pattern of one-hot encoding.</p>
            </details>
          `,
        },
        {
          title: 'Address decoder: which memory chip answers?',
          code: WR(DEC_ADDR, ADDR_HTML),
        },
      ],
      quiz: [
        { q: 'A 3→8 decoder receives 101. Which outputs are 1?', options: ['Y1 and Y3', 'Only Y5', 'Y0, Y2', 'Only Y3'], answer: 1, why: '101 = 5 and a decoder is one-hot: only Y5 turns on.' },
        { q: 'Which gate implements output Y1 of a 2→4 decoder (A1 A0 = 01)?', options: ['A1 AND A0', 'NOT A1 AND A0', 'A1 OR A0', 'A1 XOR A0'], answer: 1, why: 'Y1 must detect A1 = 0 and A0 = 1: Ā1 · A0.' },
        { q: 'How do you turn a 2→4 decoder into a 1→4 demultiplexer?', options: ['Add an OR gate', 'AND each decoder output with the data bit D', 'Invert all outputs', 'Swap inputs and outputs'], answer: 1, why: 'The decoder picks the line; ANDing with D makes that line carry D while the others stay 0.' },
        { q: 'In a 16-bit address space split into four 16 KB chips, which bits does the chip-select decoder look at?', options: ['The lowest 2 bits', 'The top 2 bits (A15, A14)', 'All 16 bits', 'Bits 7 and 8'], answer: 1, why: 'The top two bits split 64 KB into four 16 KB blocks. The remaining 14 bits address a byte inside the selected chip.' },
      ],
      exercise: {
        task: `<p>Build a <strong>1 → 4 demultiplexer</strong>: data bit <b>D</b> must appear on output <b>Y<sub>S</sub></b> (S = S1 S0 as a number), and all other outputs must be 0. You now have a <b>DECODER</b> chip in the palette: it's the 2→4 circuit from the demo, packaged. Build it on the board, then click <b>✔ Check</b>. Best known: 5 parts.</p>`,
        hint: 'Connect S0 → A0 and S1 → A1 of the decoder. Then use four AND gates: output Yk = D AND (decoder Yk).',
        starter: DEMUX_EX(false),
        solution: DEMUX_EX(true),
      },
    },

    {
      id: 'encoder',
      section: 'Building Blocks',
      title: 'Encoders & priority encoders',
      explain: `
        <p>An <strong>encoder</strong> is a decoder in reverse: 2<sup>n</sup> input lines in, an <em>n</em>-bit number out. If input line I2 is on, the output is <code>10</code> (2). A 4→2 encoder is just two OR gates:</p>
        <pre><code>Y0 = I1 + I3     (odd numbers have bit 0 set)
Y1 = I2 + I3     (2 and 3 have bit 1 set)</code></pre>
        <p>That works only if <strong>exactly one</strong> input is on. Two problems show up quickly:</p>
        <ul>
          <li><strong>Two inputs at once</strong>: I1 + I2 gives <code>11</code> = 3, a line nobody pressed.</li>
          <li><strong>Nothing pressed</strong> gives <code>00</code>, the same code as "I0 pressed".</li>
        </ul>
        <h3>Priority encoder</h3>
        <p>The fix is to give inputs a <strong>priority</strong>: the output is the number of the <em>highest</em> active input, and an extra <strong>V</strong> ("valid") output says whether any input is on at all. In code:</p>
        <pre><code>V = I0 || I1 || I2 || I3;
Y = I3 ? 3 : I2 ? 2 : I1 ? 1 : 0;   // a chain of ifs, highest first</code></pre>
        <p>Each lower input only counts when no higher one is on. For 4 inputs: <code>Y1 = I3 + I2</code>, <code>Y0 = I3 + I1·Ī2</code>.</p>
        <div class="tip">Software analogy: an <code>if / else if</code> chain, or "find the index of the highest set bit". CPUs even have an instruction for that (<code>LZCNT</code>/<code>BSR</code> on x86, <code>CLZ</code> on ARM), and inside it is a wide priority encoder.</div>
        <div class="world">
          <ul>
            <li><strong>Interrupts.</strong> Timer, disk, keyboard and network card can all request the CPU at the same instant. An interrupt controller (originally the Intel 8259 in the IBM PC, today the APIC inside the processor) uses priority logic to decide which handler runs first.</li>
            <li>The <a href="https://www.ti.com/product/SN74HC148" target="_blank">74HC148</a> is an 8→3 priority encoder chip, with enable in/out pins so several can be chained for 16 or more inputs.</li>
            <li>Keyboards scan a matrix of keys and encode the pressed position into a key code. Many cheap keyboards can't report some 3-key combinations correctly ("ghosting"), an encoding limitation you can feel.</li>
            <li>Floating-point hardware uses a priority encoder ("leading-zero counter") to normalise results after subtraction.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'Plain encoder and its failure',
          code: WR(ENC_NAIVE),
          explain: `
            <details>
              <summary>Try this: find the bad rows</summary>
              <ol>
                <li>Turn on only I1, then only I2, then only I3: the code is right each time.</li>
                <li>Now turn on <b>I1 and I2</b> together: Y1 Y0 = 11 = 3, but I3 is off. In the truth table, look at row I0 I1 I2 I3 = 0110.</li>
                <li>Turn everything off: the code is 00, the same as "only I0". The circuit can't tell "I0" from "nobody".</li>
              </ol>
              <p>The OR gates mix bits from different inputs. The next demo solves both problems.</p>
            </details>
          `,
        },
        {
          title: 'Priority encoder as an interrupt controller',
          code: WR([DEF_PRIO4, ENC_IRQ]),
        },
      ],
      quiz: [
        { q: 'A 4→2 priority encoder (I3 highest) has I0 and I2 on. What does it output?', options: ['Y = 0, V = 1', 'Y = 2, V = 1', 'Y = 3, V = 1', 'Y = 2, V = 0'], answer: 1, why: 'The highest active input wins: I2 → 10. Something is on, so V = 1.' },
        { q: 'What is the V (valid) output for?', options: ['It doubles the speed', 'It tells "nothing pressed" apart from "input 0 pressed"', 'It enables the clock', 'It is the parity bit'], answer: 1, why: 'Both cases give code 00; V = 0 means "ignore the code, nobody is asking".' },
        { q: 'With a plain (non-priority) OR-gate encoder, I1 and I2 on at once gives…', options: ['2', '1', '3 (a wrong answer)', '0'], answer: 2, why: 'Y0 = I1 + I3 = 1 and Y1 = I2 + I3 = 1 → 11 = 3.' },
        { q: 'In a priority encoder, Y0 = I3 + I1·Ī2. Why the Ī2?', options: ['To save power', 'So I1 only counts when the higher-priority I2 is off', 'It is a typo; Y0 = I1 + I3', 'To invert the output'], answer: 1, why: 'If I2 is on, the answer is 2 (Y0 = 0), even when I1 is also on. I1 may only set bit 0 if I2 is off.' },
      ],
      exercise: {
        task: `<p>Build a <strong>4 → 2 priority encoder</strong> on the board below. Outputs: <b>Y1 Y0</b> = number of the highest active input (I3 &gt; I2 &gt; I1 &gt; I0), <b>V</b> = 1 if any input is on. When nothing is on, Y1 Y0 = 00. Click <b>✔ Check</b> to test all 16 cases. Best known: 5 gates (OR:3 is a 3-input OR).</p>`,
        hint: 'Y1 = I3 OR I2. Y0 = I3 OR (I1 AND NOT I2). V = Y1 OR I1 OR I0: reuse the Y1 gate as one input of the 3-input OR.',
        starter: ENC_EX(false),
        solution: ENC_EX(true),
      },
    },

    {
      id: 'comparator',
      section: 'Building Blocks',
      title: 'Comparators: =, <, >',
      explain: `
        <p>Every <code>if (a == b)</code> and <code>while (i &lt; n)</code> in your code needs hardware that compares numbers. Let's build it from what we know.</p>
        <h3>Equality</h3>
        <p>Two bits are equal when <strong>XNOR</strong> gives 1 (XNOR = "same"). Two numbers are equal when <em>every</em> bit pair is equal, so XNOR each pair and AND the results:</p>
        <pre><code>A == B  =  (A3 ⊙ B3) · (A2 ⊙ B2) · (A1 ⊙ B1) · (A0 ⊙ B0)      ⊙ = XNOR</code></pre>
        <h3>Greater than</h3>
        <p>For single bits, A &gt; B only when A = 1 and B = 0: <code>A·B̄</code>. For multi-bit numbers, compare the way you compare words in a dictionary: start at the <strong>most significant</strong> bit. The first position where they differ decides. Lower bits only matter if all higher bits tie.</p>
        <pre><code>A > B  =  A3·B̄3
        + (A3⊙B3) · A2·B̄2
        + (A3⊙B3)(A2⊙B2) · A1·B̄1
        + (A3⊙B3)(A2⊙B2)(A1⊙B1) · A0·B̄0</code></pre>
        <div class="tip">That's string comparison! <code>"cat" &lt; "cow"</code> is decided at the second letter; the rest doesn't matter. A magnitude comparator does the same with bits.</div>
        <div class="warn">Comparing <strong>signed</strong> numbers needs different logic: as you'll see in the two's complement lesson, <code>1111</code> is 15 unsigned but −1 signed. CPUs handle this by subtracting and reading the status flags (lesson "Status flags").</div>
        <div class="world">
          <ul>
            <li><strong>Branches.</strong> <code>if (x &lt; 10)</code> compiles to a compare instruction (<code>CMP</code> on x86 and ARM) followed by a conditional jump. Most CPUs compare by <em>subtracting</em> in the ALU and checking flags, so they reuse the adder instead of a separate comparator.</li>
            <li><strong>Cache tag match.</strong> Each time your CPU reads memory, its L1 cache compares the address's tag bits with the tags stored in several "ways" <em>at the same time</em>, using wide equality comparators like the XNOR+AND circuit below. That runs billions of times per second.</li>
            <li>The <a href="https://www.ti.com/product/SN74HC85" target="_blank">74HC85</a> is a 4-bit magnitude comparator chip with cascade inputs so you can chain several for 8, 12, 16 bits.</li>
          </ul>
        </div>
      `,
      examples: [
        { title: '1-bit comparator', code: W(CMP1) },
        { title: '4-bit equality', code: WR(CMP_EQ4) },
        {
          title: '4-bit magnitude comparator: MSB first',
          code: WR([DEF_CMP4, CMP_MAG]),
          explain: `
            <details>
              <summary>Try this: the most significant difference wins</summary>
              <ol>
                <li>Set A = 8 (<code>1000</code>) and B = 7 (<code>0111</code>). B has more 1s, yet A &gt; B: bit 3 decides on its own.</li>
                <li>Set A = 6 (<code>0110</code>) and B = 5 (<code>0101</code>). Bits 3 and 2 tie, so bit 1 decides: A wins.</li>
                <li>Click individual bits of A from the bottom (b0) up and see when the answer flips.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'Which gate tells you two bits are equal?', options: ['XOR', 'XNOR', 'NAND', 'OR'], answer: 1, why: 'XNOR outputs 1 when its inputs are the same.' },
        { q: '1-bit A > B is…', options: ['A + B', 'A·B̄', 'Ā·B', 'A ⊕ B'], answer: 1, why: 'Only A = 1, B = 0 makes A bigger.' },
        { q: 'Comparing A = 1001 and B = 0111, which bit decides?', options: ['bit 0', 'bit 1', 'bit 2', 'bit 3'], answer: 3, why: 'Start at the MSB: bit 3 already differs (1 vs 0), so A > B (9 > 7).' },
        { q: 'A 32-bit equality comparator needs how many XNOR gates?', options: ['1', '5', '32', '64'], answer: 2, why: 'One XNOR per bit pair, then a big AND (a tree of smaller ANDs) of all 32 results.' },
      ],
      exercise: {
        task: `<p>Build a <strong>2-bit "A &gt; B"</strong> comparator on the board below. A and B are 2-bit numbers (0–3). Use the MSB-first idea: A &gt; B if (A1 &gt; B1), or (A1 = B1 and A0 &gt; B0). Click <b>✔ Check</b> to test all 16 pairs. Best known: 6 gates.</p>`,
        hint: 'High part: A1 AND NOT B1. Tie test: A1 XNOR B1. Low part: a 3-input AND of (tie, A0, NOT B0). Finally OR the high part and the low part.',
        starter: CMP_EX(false),
        solution: CMP_EX(true),
      },
    },

    {
      id: 'seven-segment',
      section: 'Building Blocks',
      title: '7-segment display decoder',
      explain: `
        <p>Look at a microwave or an alarm clock: each digit is made of 7 bars called <strong>segments</strong>, named a to g:</p>
        <pre><code> aaa
f   b
f   b
 ggg
e   c
e   c
 ddd</code></pre>
        <p>To show "7" you light a, b, c. To show "2" you light a, b, g, e, d. The computer stores the digit as a 4-bit number, usually <strong>BCD</strong> (binary-coded decimal: one decimal digit 0–9 per 4 bits). A <strong>7-segment decoder</strong> turns those 4 bits into 7 on/off lines.</p>
        <h3>Seven truth tables in one</h3>
        <p>Each segment is its own Boolean function of the same 4 inputs. Segment g (middle bar) is on for 2, 3, 4, 5, 6, 8, 9. You already know how to turn any truth table into gates (sum of products). And there's a bonus: inputs 10–15 are never valid BCD digits, so they're <strong>don't cares</strong>. We may output anything there, which lets the formulas shrink. For example:</p>
        <pre><code>g = D3 + (D2 ⊕ D1) + D1·D̄0</code></pre>
        <div class="tip">In software this would be a lookup table: <code>const SEG = [0x3F, 0x06, 0x5B, …]; out = SEG[digit];</code>. The decoder is that table "compiled" into gates. Microcontrollers often do exactly that in software and drive the segments straight from output pins.</div>
        <div class="world">
          <ul>
            <li>The <a href="https://www.ti.com/product/CD4511B" target="_blank">CD4511</a> is a classic BCD-to-7-segment latch/decoder/driver chip: 4 BCD inputs, 7 segment outputs, and it blanks the display for inputs 10–15, just like the demo. The 74LS47 is a similar chip for common-anode displays.</li>
            <li>Displays come as <em>common cathode</em> (segment lights when its pin is high) or <em>common anode</em> (lights when low), so decoder chips exist with active-high and active-low outputs.</li>
            <li>Multi-digit clocks often <em>multiplex</em>: one decoder, and the digits are switched on one after another hundreds of times per second. Your eye blends it into a steady display.</li>
          </ul>
        </div>
      `,
      examples: [
        { title: 'BCD → 7-segment decoder chip', code: WR([DEF_BCD7, SEG_CHIP], SEG_CSS) },
        {
          title: 'Segment g built from gates',
          code: WR([DEF_BCD7, SEG_G]),
          explain: `
            <details>
              <summary>Where g = D3 + (D2 ⊕ D1) + D1·D̄0 comes from</summary>
              <table>
                <tr><th>digit</th><th>D3 D2 D1 D0</th><th>g</th><th>which term covers it</th></tr>
                <tr><td>0</td><td>0000</td><td>0</td><td>none (correct: off)</td></tr>
                <tr><td>1</td><td>0001</td><td>0</td><td>none</td></tr>
                <tr><td>2, 3</td><td>001x</td><td>1</td><td>D2 ⊕ D1 (D2 = 0, D1 = 1)</td></tr>
                <tr><td>4, 5</td><td>010x</td><td>1</td><td>D2 ⊕ D1 (D2 = 1, D1 = 0)</td></tr>
                <tr><td>6</td><td>0110</td><td>1</td><td>D1·D̄0</td></tr>
                <tr><td>7</td><td>0111</td><td>0</td><td>none (D2 ⊕ D1 = 0, D0 = 1)</td></tr>
                <tr><td>8, 9</td><td>100x</td><td>1</td><td>D3</td></tr>
              </table>
              <p>Just "D3" covers 8 and 9 because 10–15 are don't-cares: we're allowed to light g for them too. Click ▲ through 0–9 and check that the middle bar from the gates matches the shape of each digit.</p>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'Which segments light for the digit 1?', options: ['a, b', 'b, c', 'e, f', 'c, d'], answer: 1, why: 'The two right-hand vertical bars: b (top-right) and c (bottom-right).' },
        { q: 'What does BCD mean?', options: ['Binary-coded decimal: each decimal digit stored in 4 bits', 'Base-converted data', 'A type of display', 'Byte-coded data'], answer: 0, why: '0–9 each fit in 4 bits; codes 10–15 are unused.' },
        { q: 'Why can BCD decoder formulas be smaller than a general 4-input function?', options: ['Because 7 < 16', 'Inputs 10–15 never occur, so they are "don\'t care" and can be chosen freely', 'Because XOR is free', 'They can\'t'], answer: 1, why: 'Don\'t-care rows let you pick whichever output makes the expression simplest.' },
        { q: 'How many separate Boolean functions does a 7-segment decoder compute?', options: ['1', '4', '7', '10'], answer: 2, why: 'One per segment, all from the same 4 input bits.' },
      ],
      exercise: {
        task: `<p>A finished chip already drives segments b–g. Build the logic for <strong>segment a</strong> (top bar) from gates and wire it to the LED <b>a</b>. Wire it to the display's <b>a</b> pin too, so you can see full digits. Segment a is <b>on</b> for 0, 2, 3, 5, 6, 7, 8, 9 and <b>off</b> for 1 and 4. Inputs 10–15 don't matter. Click <b>✔ Check</b>. Best known: just 2 gates!</p>`,
        hint: 'Look at the digits where a is on: D3 covers 8–9, D1 covers 2, 3, 6, 7. That leaves 0 (D2 = 0, D0 = 0) and 5 (D2 = 1, D0 = 1), the cases where D2 equals D0. Which gate means "equal"?',
        starter: SEG_EX(false),
        solution: SEG_EX(true),
      },
    },

    {
      id: 'buses-tristate',
      section: 'Building Blocks',
      title: 'Buses & tri-state outputs',
      explain: `
        <p>A computer has a CPU, RAM, ROM, a keyboard controller… and they all need to exchange 8, 16 or 64-bit values. Giving every pair its own private wires would take a huge number of wires. Instead, they share one set of wires: a <strong>bus</strong>. It works like a group call: everyone can hear, but only one should talk at a time.</p>
        <h3>The problem: a normal output always shouts</h3>
        <p>Every gate output you've seen is always connecting its wire to either +5V (1) or ground (0). Connect two such outputs together and let one say 1 while the other says 0, and you've connected +5V straight to ground through two transistors. That's a <strong>short circuit</strong>, called <strong>bus contention</strong>: lots of current, heat, an undefined voltage, and eventually a damaged chip.</p>
        <h3>The fix: a third state, "Z"</h3>
        <p>A <strong>tri-state buffer</strong> has a data input A and an <strong>enable</strong> (EN, also called OE, output enable):</p>
        <ul>
          <li>EN = 1: output = A (drives 0 or 1 as usual).</li>
          <li>EN = 0: output is <strong>Z</strong>, "high impedance". Both output transistors are off, so the chip is electrically disconnected from the wire, as if it weren't there.</li>
        </ul>
        <p>Every device connects to the bus through tri-state buffers. The control logic (often a <em>decoder</em> from two lessons ago) makes sure <strong>exactly one</strong> device has OE = 1 at a time. The reader(s) use a "load" signal to copy the bus value into their memory at the right moment.</p>
        <div class="warn">Our simulator's wires are simple 1-bit signals with one driver each, so the demos in this lesson are custom widgets. Z isn't a third logic value you compute with. It means "this output isn't taking part right now".</div>
        <div class="tip">Software analogy: a shared variable with many writers needs a lock. On a bus, OE is the lock: if two writers hold it at the same time, you don't get a race condition, you get smoke.</div>
        <div class="world">
          <ul>
            <li>The classic home computers (Apple II, Commodore 64, the Z80- and 6502-based machines) had one shared 8-bit data bus between CPU, RAM, ROM and I/O chips. Memory chips have an "output enable" pin for exactly this. Chips like the <a href="https://www.ti.com/product/SN74HC245" target="_blank">74HC245</a> are 8-bit tri-state bus transceivers.</li>
            <li><a href="https://en.wikipedia.org/wiki/I%C2%B2C" target="_blank">I²C</a> (used for sensors, and the chip on your RAM stick that tells the PC its size and speed) uses <em>open-drain</em> outputs instead: devices can only pull a line to 0 or let go, and a resistor pulls it to 1. Two devices talking at once can't short anything, and the bus works as a "wired AND".</li>
            <li>Modern high-speed links went the other way. PCI was a shared parallel bus, and PCI Express replaced it with point-to-point serial <em>lanes</em> through a switch. At GHz speeds, a long shared wire with many taps causes too many signal reflections. DDR memory, however, is still a shared bus between the memory controller and several chips.</li>
          </ul>
        </div>
      `,
      examples: [
        {
          title: 'One tri-state buffer, inside and out',
          code: TRI_HTML + '\n<script>\n(' + TRI_JS.toString() + ')();\n<\/script>',
          explain: `
            <details>
              <summary>Try this</summary>
              <ol>
                <li>With EN = 1, toggle A: exactly one of the two switches is closed. The top one connects OUT to +5V and the bottom one connects OUT to GND. That's a normal CMOS output, like the inverter from the transistor lesson.</li>
                <li>Set EN = 0: both switches open and OUT becomes a dashed yellow Z. Toggle A: nothing changes on OUT.</li>
                <li>Imagine closing <em>both</em> switches at once: +5V would connect straight to GND. A normal gate never does that. Two gates fighting over one wire do, which is what the next demo shows.</li>
              </ol>
            </details>
          `,
        },
        {
          title: 'A shared bus: one talker at a time',
          code: BUS_HTML + '\n<script>\n(' + BUS_JS.toString() + ')();\n<\/script>',
          explain: `
            <details>
              <summary>Try this</summary>
              <ol>
                <li>Only RAM has OE on: the bus shows RAM's value <code>1010</code> in clean green/grey.</li>
                <li>Also switch on ROM's OE. Wherever RAM and ROM disagree (bits 3, 2, 0) the line turns red and flashes: <b>contention</b>.</li>
                <li>Edit ROM's bits until they match RAM's: the red goes away, but the warning stays. Two drivers that agree only by luck are still a bug.</li>
                <li>Switch all OE off: every line floats (Z). Reading a floating bus gives random noise, and that's why real buses add pull-up resistors.</li>
              </ol>
            </details>
          `,
        },
      ],
      quiz: [
        { q: 'What does "Z" (high impedance) mean for an output?', options: ['It outputs 0', 'It outputs 1', 'It is electrically disconnected: drives neither 0 nor 1', 'It oscillates'], answer: 2, why: 'Both output transistors are off; the pin lets go of the wire.' },
        { q: 'Two enabled outputs on the same bus line drive 1 and 0. What happens?', options: ['The line reads 1 (OR)', 'The line reads 0 (AND)', 'Bus contention: a short from +5V to GND, undefined voltage, heat', 'Nothing, buses handle it'], answer: 2, why: 'Push-pull outputs fight each other. (Open-drain buses like I²C are designed so this can\'t happen.)' },
        { q: 'How many devices may have their output enable on at the same time on a shared bus?', options: ['Zero', 'At most one', 'Any number', 'Exactly two'], answer: 1, why: 'One talker; any number of listeners. Zero is allowed but then the bus floats.' },
        { q: 'Which earlier building block is a natural fit for generating the OE signals?', options: ['Comparator', 'Decoder', 'Encoder', '7-segment decoder'], answer: 1, why: 'A decoder is one-hot: its outputs guarantee exactly one enable is active.' },
      ],
      exercise: {
        task: `<p>You're the CPU's control unit. In the widget below, set the <b>OE</b> and <b>LD</b> switches for each of the three clock steps so that every listed transfer happens: one driver per step, and only the destination loads. Then click <b>✔ Check</b>.</p>`,
        hint: 'T1: ROM OE + CPU LD. T2: Keyboard OE + CPU LD. T3: CPU OE + RAM LD. Everything else off.',
        starter: SCHED(blankSched()),
        solution: SCHED(solvedSched()),
      },
    },
  );
}
