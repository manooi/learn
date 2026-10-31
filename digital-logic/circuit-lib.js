// Shared digital-logic circuit simulator, injected into every `html` preview iframe (see runner.js buildDoc).
// Provides window.Circ:
//   Circ.mount(selector, cfg) → api   — interactive SVG circuit: switches, gates, chips, LEDs, displays,
//                                       live wire colours, auto truth table, slow-mo propagation, clock,
//                                       oscilloscope, sandbox build mode with palette + Check.
//   Circ.chip(name, def)              — register a reusable black-box chip type.
//   Circ.GATES                        — gate truth functions.
// Documented in lessons/SCHEMA.md. Stored as source text (window.CIRC_LIB_SRC).
window.CIRC_LIB_SRC = '(' + function () {
  const CSS = `
.circ { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2330; }
.circ * { box-sizing: border-box; }
.circ-title { font-weight: 700; font-size: 15px; margin: 0 0 4px; }
.circ-intro { font-size: 13.5px; color: #475066; margin: 0 0 6px; }
.circ-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin: 0 0 6px; }
.circ-bar button { margin: 0; font-size: 13px; padding: 3px 10px; }
.circ-bar button.on { background: #0f766e; color: #fff; border-color: #0f766e; }
.circ-bar .pal { background: #eef6ff; border-color: #9cc3ef; font-weight: 600; }
.circ-bar .chk { background: #16a34a; color: #fff; border-color: #16a34a; font-weight: 600; }
.circ-bar .sep { width: 1px; height: 20px; background: #d5d9e3; margin: 0 4px; }
.circ-main { display: flex; flex-wrap: wrap; gap: 10px; align-items: flex-start; }
.circ-board { flex: 1 1 480px; min-width: 300px; border: 1px solid #e2e5ee; border-radius: 10px; background: #fbfcfe; overflow: auto; }
.circ-board svg { display: block; width: 100%; height: auto; margin: 0 auto; touch-action: none; user-select: none; }
.circ-side { flex: 0 1 auto; padding-left: 2px; display: flex; flex-direction: column; gap: 8px; }
.circ-tt { border-collapse: collapse; font: 12.5px ui-monospace, Menlo, monospace; background: #fff; border: 1px solid #e2e5ee; border-radius: 8px; overflow: hidden; }
.circ-tt th { background: #f1f4f9; font: 600 12px system-ui, sans-serif; padding: 3px 9px; border-bottom: 1px solid #e2e5ee; }
.circ-tt th.o, .circ-tt td.o { border-left: 2px solid #d5d9e3; }
.circ-tt td { padding: 2px 9px; text-align: center; cursor: pointer; }
.circ-tt tr.cur td { background: #fff4c2; font-weight: 700; }
.circ-tt tr:hover td { background: #eef6ff; }
.circ-tt td.one { color: #15803d; }
.circ-tt td.zero { color: #8a90a2; }
.circ-tt td.want { color: #7c3aed; font-weight: 700; }
.circ-tt tr.bad td { background: #fee2e2; }
.circ-tt tr.bad.cur td { background: #fecaca; }
.circ-tt caption { padding-left: 3px !important; font: 600 11.5px system-ui; color: #646b80; text-align: left; padding: 0 0 3px; caption-side: top; }
.circ-status { font-size: 12.5px; color: #646b80; margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px 14px; }
.circ-status .warn { color: #b45309; font-weight: 600; }
.circ-help { font-size: 11.5px; color: #8a90a2; margin-top: 3px; }
.circ-result { margin-top: 6px; padding: 7px 10px; border-radius: 8px; font-size: 13.5px; }
.circ-result:empty { display: none; }
.circ-result.ok { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
.circ-result.bad { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }
.circ-result table { border-collapse: collapse; margin-top: 4px; font: 12px ui-monospace, Menlo, monospace; }
.circ-result td, .circ-result th { padding: 1px 7px; border: 1px solid #f3b4b4; }
.circ-scope { border: 1px solid #e2e5ee; border-radius: 10px; background: #0f1320; margin-top: 8px; overflow-x: auto; }
.circ-scope svg { display: block; }
.circ-part { cursor: default; }
.circ-part.click { cursor: pointer; }
.circ.build .circ-part.mov { cursor: grab; }
.circ.build .circ-wire:not(.locked):hover path.w { stroke: #ef4444 !important; cursor: pointer; }
.circ.build .pin { cursor: crosshair; }
.circ.build .pin:hover { fill: #fde047; }
`;

  const ON = '#16a34a', OFF = '#9aa3b5', INK = '#334155', BUSC = '#2563eb';
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const GATES = {
    NOT: (a) => a[0] ^ 1,
    BUF: (a) => a[0],
    AND: (a) => (a.every((v) => v) ? 1 : 0),
    OR: (a) => (a.some((v) => v) ? 1 : 0),
    NAND: (a) => (a.every((v) => v) ? 0 : 1),
    NOR: (a) => (a.some((v) => v) ? 0 : 1),
    XOR: (a) => a.reduce((x, y) => x ^ y, 0),
    XNOR: (a) => a.reduce((x, y) => x ^ y, 0) ^ 1,
  };
  const GATE_DESC = {
    NOT: 'NOT: output is the opposite of the input',
    BUF: 'BUFFER: output = input (amplifies / delays)',
    AND: 'AND: 1 only if ALL inputs are 1',
    OR: 'OR: 1 if ANY input is 1',
    NAND: 'NAND: 0 only if ALL inputs are 1 (NOT-AND)',
    NOR: 'NOR: 1 only if ALL inputs are 0 (NOT-OR)',
    XOR: 'XOR: 1 if an ODD number of inputs are 1 (2 inputs: they differ)',
    XNOR: 'XNOR: 1 if an EVEN number of inputs are 1 (2 inputs: they match)',
  };
  const SRC = new Set(['IN', 'CLOCK', 'BUTTON', 'CONST', 'NUMIN']);

  // ---------- chips ----------
  const CHIPS = {};
  function chip(name, def) { CHIPS[name] = def; }
  const b2 = (v) => (v ? 1 : 0);
  chip('HA', { label: 'HALF ADD', ins: ['A', 'B'], outs: ['S', 'C'], fn: ([a, b]) => [a ^ b, a & b] });
  chip('FA', { label: 'FULL ADD', ins: ['A', 'B', 'Cin'], outs: ['S', 'Cout'], fn: ([a, b, c]) => [a ^ b ^ c, (a & b) | (c & (a ^ b))] });
  chip('MUX2', { label: 'MUX', ins: ['A', 'B', 'S'], outs: ['Y'], fn: ([a, b, s]) => [s ? b : a] });
  chip('DEMUX2', { label: 'DEMUX', ins: ['D', 'S'], outs: ['Y0', 'Y1'], fn: ([d, s]) => [s ? 0 : d, s ? d : 0] });
  chip('DEC2', { label: 'DECODER', ins: ['A0', 'A1'], outs: ['Y0', 'Y1', 'Y2', 'Y3'],
    fn: ([a0, a1]) => { const n = a0 + 2 * a1; return [0, 1, 2, 3].map((i) => b2(i === n)); } });
  chip('SR', { label: 'SR LATCH', ins: ['S', 'R'], outs: ['Q', 'Q̄'], stateful: true,
    fn: ([s, r], m) => { if (s && !r) m.q = 1; else if (r && !s) m.q = 0; else if (s && r) m.q = 0; return [m.q | 0, (m.q | 0) ^ 1]; } });
  chip('DLATCH', { label: 'D LATCH', ins: ['D', 'E'], outs: ['Q', 'Q̄'], stateful: true,
    fn: ([d, e], m) => { if (e) m.q = d; return [m.q | 0, (m.q | 0) ^ 1]; } });
  chip('DFF', { label: 'D FLIP-FLOP', ins: ['D', 'CLK'], outs: ['Q', 'Q̄'], stateful: true, clk: 1,
    fn: ([d, c], m) => { if (c && !m.p) m.q = d; m.p = c; return [m.q | 0, (m.q | 0) ^ 1]; } });
  chip('DFFE', { label: 'REG BIT', ins: ['D', 'LOAD', 'CLK'], outs: ['Q'], stateful: true, clk: 2,
    fn: ([d, l, c], m) => { if (c && !m.p && l) m.q = d; m.p = c; return [m.q | 0]; } });
  chip('TFF', { label: 'T FLIP-FLOP', ins: ['T', 'CLK'], outs: ['Q', 'Q̄'], stateful: true, clk: 1,
    fn: ([t, c], m) => { if (c && !m.p && t) m.q = (m.q | 0) ^ 1; m.p = c; return [m.q | 0, (m.q | 0) ^ 1]; } });

  // ---------- geometry ----------
  function gateN(p) { return p.n || (p.type === 'NOT' || p.type === 'BUF' ? 1 : 2); }
  function chipDef(p) {
    if (p.type === 'CHIP') return p;
    return CHIPS[p.type];
  }
  function geom(p) {
    if (p._g) return p._g;
    const t = p.type;
    let g;
    if (SRC.has(t) && t !== 'NUMIN') g = { w: 40, h: 40, ins: [], outs: [{ x: 40, y: 20 }] };
    else if (t === 'OUT') g = { w: 40, h: 40, ins: [{ x: 0, y: 20 }], outs: [] };
    else if (t === 'TEXT') g = { w: 0, h: 0, ins: [], outs: [] };
    else if (GATES[t]) {
      const n = gateN(p);
      const h = n === 1 ? 40 : 20 * n;
      const w = Math.max(60, h / 2 + 40);
      g = { w, h, ins: [...Array(n)].map((_, k) => ({ x: 0, y: n === 1 ? 20 : 10 + 20 * k })), outs: [{ x: w, y: h / 2 }] };
    } else if (t === 'NUMIN' || t === 'NUMOUT') {
      const n = p.bits || 4;
      const h = 20 * n + 20;
      const pins = [...Array(n)].map((_, k) => ({ x: t === 'NUMIN' ? 80 : 0, y: 30 + 20 * k, name: 'b' + k }));
      g = { w: 80, h, ins: t === 'NUMOUT' ? pins : [], outs: t === 'NUMIN' ? pins : [] };
    } else if (t === 'SEG7') {
      g = { w: 90, h: 160, ins: 'abcdefg'.split('').map((c, k) => ({ x: 0, y: 20 + 20 * k, name: c })), outs: [] };
    } else {
      const c = chipDef(p);
      if (!c) throw new Error('Circ: unknown part type "' + t + '" (id ' + p.id + ')');
      const m = Math.max(c.ins.length, c.outs.length, 1);
      const h = 20 * m + 20;
      const w = p.w || c.w || 90;
      const place = (list, x) => list.map((name, k) => ({ x, y: 30 + 20 * (k + (m - list.length) / 2), name }));
      g = { w, h, ins: place(c.ins, 0), outs: place(c.outs, w) };
    }
    p._g = g;
    return g;
  }
  function pinIndex(p, side, ref) {
    if (ref === undefined || ref === '') return 0;
    if (/^\d+$/.test(ref)) return +ref;
    const list = geom(p)[side];
    const i = list.findIndex((q) => q.name === ref);
    if (i < 0) throw new Error('Circ: part "' + p.id + '" has no ' + (side === 'ins' ? 'input' : 'output') + ' pin "' + ref + '"');
    return i;
  }

  // ---------- gate shapes (local coords, body box w×h) ----------
  function orBack(h, y) { const c = 12, t = y / h; return 2 * c * t * (1 - t); }
  function gateSVG(p, outv) {
    const g = geom(p), { w, h } = g, t = p.type;
    const inv = t === 'NOT' || t === 'NAND' || t === 'NOR' || t === 'XNOR';
    const bw = inv ? w - 10 : w; // body width without bubble
    const fill = outv ? '#ecfdf3' : '#fff';
    const st = `fill="${fill}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"`;
    let s = '';
    const base = t.replace(/^N(?=AND|OR)/, '').replace(/^XN/, 'X');
    if (t === 'NOT' || t === 'BUF') {
      s += `<path d="M6 4 L${bw} ${h / 2} L6 ${h - 4} Z" ${st}/>`;
      s += `<line x1="0" y1="${h / 2}" x2="6" y2="${h / 2}" stroke="${INK}" stroke-width="2"/>`;
    } else if (base === 'AND') {
      const r = h / 2;
      s += `<path d="M8 0 H${bw - r} A${r} ${r} 0 0 1 ${bw - r} ${h} H8 Z" ${st}/>`;
      for (const q of g.ins) s += `<line x1="0" y1="${q.y}" x2="8" y2="${q.y}" stroke="${INK}" stroke-width="2"/>`;
    } else {
      const x0 = base === 'XOR' ? 14 : 8;
      s += `<path d="M${x0} 0 Q${x0 + 12} ${h / 2} ${x0} ${h} Q${x0 + (bw - x0) * 0.62} ${h} ${bw} ${h / 2} Q${x0 + (bw - x0) * 0.62} 0 ${x0} 0 Z" ${st}/>`;
      if (base === 'XOR') s += `<path d="M6 0 Q18 ${h / 2} 6 ${h}" fill="none" stroke="${INK}" stroke-width="2"/>`;
      for (const q of g.ins) s += `<line x1="0" y1="${q.y}" x2="${x0 + orBack(h, q.y)}" y2="${q.y}" stroke="${INK}" stroke-width="2"/>`;
    }
    if (inv) s += `<circle cx="${bw + 5}" cy="${h / 2}" r="4.5" fill="#fff" stroke="${INK}" stroke-width="2"/>`;
    if (p.showType !== false) s += `<text x="${bw / 2 + 2}" y="${h + 13}" text-anchor="middle" font-size="10.5" fill="#64748b" font-weight="600">${esc(p.label || t)}</text>`;
    return s;
  }

  // ---------- mount ----------
  function mount(sel, cfg) {
    const root = typeof sel === 'string' ? document.querySelector(sel) : sel;
    if (!root) throw new Error('Circ.mount: element not found: ' + sel);
    cfg = cfg || {};
    const build = cfg.build || null;
    const parts = [];
    const byId = new Map();
    let wires = []; // {from:{id,k}, to:{id,k}, opt}
    let uid = 0;
    let unstable = false, delays = 0, slow = false, anim = null, clockTimer = null, cycles = 0;
    let wiring = null; // {from:{id,k,side}, x, y}
    let drag = null;
    let lastClick = {};
    const scopeSamples = [];

    function addPart(spec) {
      const p = Object.assign({}, spec);
      if (!p.id) p.id = (p.type || 'p').toLowerCase() + '_' + (++uid);
      if (byId.has(p.id)) throw new Error('Circ: duplicate part id "' + p.id + '"');
      p.x = p.x || 0; p.y = p.y || 0;
      if (p.value === undefined) p.value = 0;
      if (p.type === 'NUMIN') p.value = (p.value | 0) & ((1 << (p.bits || 4)) - 1);
      p.mem = {};
      const g = geom(p);
      p.out = g.outs.map(() => 0);
      if (build && p.fixed === undefined) p.fixed = SRC.has(p.type) || p.type === 'OUT' || p.type === 'NUMOUT' || p.type === 'SEG7' || p.type === 'TEXT';
      parts.push(p); byId.set(p.id, p);
      return p;
    }
    function parseEnd(ref, side) {
      const [id, pin] = String(ref).split('.');
      const p = byId.get(id) || parts.find((q) => q.label === id);
      if (!p) throw new Error('Circ: wire refers to unknown part "' + id + '"');
      const k = pinIndex(p, side, pin);
      if (k >= geom(p)[side].length) throw new Error('Circ: part "' + p.id + '" has no ' + side.slice(0, -1) + ' pin ' + k);
      return { id: p.id, k };
    }
    function connect(from, to, opt) {
      wires = wires.filter((w) => !(w.to.id === to.id && w.to.k === to.k)); // one driver per input
      wires.push({ from, to, opt: opt || {} });
    }
    (cfg.parts || []).forEach(addPart);
    for (const w of cfg.wires || []) {
      const a = parseEnd(w[0], 'outs'), b = parseEnd(w[1], 'ins');
      connect(a, b, w[2]);
      if (build && byId.get(a.id).fixed && byId.get(b.id).fixed) wires[wires.length - 1].locked = true;
    }

    // ---------- simulation ----------
    function driverMap() {
      const m = new Map();
      for (const w of wires) m.set(w.to.id + '.' + w.to.k, w.from);
      return m;
    }
    let drv = driverMap();
    const rewire = () => { drv = driverMap(); };
    function inputsOf(p) {
      return geom(p).ins.map((_, k) => {
        const d = drv.get(p.id + '.' + k);
        if (!d) return 0;
        const s = byId.get(d.id);
        return s ? s.out[d.k] | 0 : 0;
      });
    }
    function compute(p, ins) {
      const t = p.type;
      if (t === 'NUMIN') return geom(p).outs.map((_, k) => (p.value >> k) & 1);
      if (SRC.has(t)) return [p.value ? 1 : 0];
      if (GATES[t]) return [GATES[t](ins)];
      if (t === 'OUT' || t === 'NUMOUT' || t === 'SEG7' || t === 'TEXT') return [];
      const c = chipDef(p);
      const r = c.fn(ins, p.mem, p);
      return geom(p).outs.map((_, k) => (r && r[k] ? 1 : 0));
    }
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    function tick() { // synchronous: every part reacts to values from the previous tick (1 gate delay)
      const next = parts.map((p) => compute(p, inputsOf(p)));
      let ch = false;
      parts.forEach((p, i) => { if (!same(p.out, next[i])) { ch = true; p.out = next[i]; } });
      return ch;
    }
    function settleSeq(shuffle) { // sequential sweep (resolves races deterministically / randomly)
      const order = parts.slice();
      if (shuffle) order.sort(() => Math.random() - 0.5);
      for (let pass = 0; pass < 200; pass++) {
        let ch = false;
        for (const p of order) { const o = compute(p, inputsOf(p)); if (!same(o, p.out)) { p.out = o; ch = true; } }
        if (!ch) return true;
      }
      return false;
    }
    const MAXT = cfg.maxTicks || 120;
    function settleNow() {
      let n = 0;
      unstable = false;
      while (n < MAXT && tick()) n++;
      if (n >= MAXT) { unstable = true; settleSeq(true); }
      delays = n;
    }
    function hasCycle() {
      const adj = new Map(parts.map((p) => [p.id, []]));
      for (const w of wires) adj.get(w.from.id).push(w.to.id);
      const st = new Map();
      const dfs = (id) => {
        st.set(id, 1);
        for (const n of adj.get(id) || []) { if (st.get(n) === 1) return true; if (!st.get(n) && dfs(n)) return true; }
        st.set(id, 2); return false;
      };
      return parts.some((p) => !st.get(p.id) && dfs(p.id));
    }
    const isSeq = () => hasCycle() || parts.some((p) => { const c = !GATES[p.type] && !SRC.has(p.type) && chipDef(p); return c && c.stateful; });

    function update() { // called after any user action
      if (anim) { clearTimeout(anim); anim = null; }
      if (!slow) { settleNow(); afterSettle(); return; }
      let n = 0;
      unstable = false;
      const step = () => {
        const ch = tick();
        if (ch) n++;
        delays = n;
        if (ch) sample();
        render();
        status(ch ? `⚡ propagating… gate delay ${n}` : '');
        if (ch && n < MAXT) anim = setTimeout(step, cfg.slowMs || 380);
        else { anim = null; if (n >= MAXT) { unstable = true; settleSeq(true); } afterSettle(); }
      };
      step();
    }
    function afterSettle() {
      sample();
      render();
      status();
      if (cfg.onChange) try { cfg.onChange(api); } catch (e) { console.error(e); }
    }

    // ---------- values / api ----------
    function find(name) { return byId.get(name) || parts.find((p) => p.label === name); }
    function valueOf(p) {
      if (!p) return undefined;
      if (SRC.has(p.type)) return p.type === 'NUMIN' ? p.value : (p.value ? 1 : 0);
      if (p.type === 'OUT') return inputsOf(p)[0];
      if (p.type === 'NUMOUT') { const v = inputsOf(p).reduce((a, b, k) => a + (b << k), 0); return v; }
      return p.out[0];
    }
    function signedOf(p, v) { const n = p.bits || 4; return v >= 1 << (n - 1) ? v - (1 << n) : v; }

    // ---------- rendering ----------
    const board = document.createElement('div');
    board.className = 'circ-board';
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    board.append(svg);

    function pinPos(id, side, k) {
      const p = byId.get(id), q = geom(p)[side][k];
      return { x: p.x + q.x, y: p.y + q.y };
    }
    function route(a, b, opt) {
      if (opt.pts) return 'M' + [a, ...opt.pts.map(([x, y]) => ({ x, y })), b].map((q) => q.x + ' ' + q.y).join(' L');
      if (b.x > a.x) {
        const mx = opt.mx !== undefined ? opt.mx : Math.round(a.x + Math.min(Math.max(10, (b.x - a.x) / 2), b.x - a.x));
        return `M${a.x} ${a.y} H${mx} V${b.y} H${b.x}`;
      }
      const yy = opt.my !== undefined ? opt.my : Math.max(a.y, b.y) + 40;
      const x1 = opt.mx !== undefined ? opt.mx : a.x + 15;
      const x2 = opt.mx2 !== undefined ? opt.mx2 : b.x - 15;
      return `M${a.x} ${a.y} H${x1} V${yy} H${x2} V${b.y} H${b.x}`;
    }
    function bbox() {
      if (cfg.w && cfg.h) return [0, 0, cfg.w, cfg.h];
      if (build) return [0, 0, cfg.w || 760, cfg.h || 380];
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const p of parts) {
        const g = geom(p);
        const lw = p.type === 'TEXT' ? String(p.text || '').length * 7 : 0;
        const left = p.x - (SRC.has(p.type) && p.type !== 'NUMIN' ? 8 + 8 * String(p.label || '').length : 0);
        const right = p.x + g.w + lw + (p.type === 'OUT' ? 10 + 8 * String(p.label || '').length : 0);
        x0 = Math.min(x0, left); y0 = Math.min(y0, p.y - (p.type === 'TEXT' ? 14 : 4));
        x1 = Math.max(x1, right); y1 = Math.max(y1, p.y + g.h + 16);
      }
      for (const w of wires) {
        const a = pinPos(w.from.id, 'outs', w.from.k), b = pinPos(w.to.id, 'ins', w.to.k);
        if (b.x <= a.x) y1 = Math.max(y1, (w.opt.my !== undefined ? w.opt.my : Math.max(a.y, b.y) + 40) + 8);
        if (w.opt.my !== undefined) y0 = Math.min(y0, w.opt.my - 8);
        for (const [px, py] of w.opt.pts || []) { x0 = Math.min(x0, px - 8); x1 = Math.max(x1, px + 8); y0 = Math.min(y0, py - 8); y1 = Math.max(y1, py + 8); }
        for (const k of ['mx', 'mx2']) if (w.opt[k] !== undefined) { x0 = Math.min(x0, w.opt[k] - 8); x1 = Math.max(x1, w.opt[k] + 8); }
        if (b.x <= a.x && !w.opt.pts) { x1 = Math.max(x1, a.x + 23); x0 = Math.min(x0, b.x - 23); }
      }
      if (x0 > x1) return [0, 0, 400, 200];
      const m = 18;
      return [Math.floor(x0 - m), Math.floor(y0 - m), Math.ceil(x1 - x0 + 2 * m), Math.ceil(y1 - y0 + 2 * m)];
    }

    function partSVG(p) {
      const g = geom(p), t = p.type;
      const ins = inputsOf(p);
      let s = '';
      const lab = esc(p.label || '');
      const clickable = SRC.has(t) && t !== 'CONST' && !p.locked;
      const cls = 'circ-part' + (clickable ? ' click' : '') + (build && !p.fixed ? ' mov' : '');
      let title = '';
      if (t === 'IN') {
        const v = p.value ? 1 : 0;
        s += `<rect x="0" y="4" width="40" height="32" rx="7" fill="${v ? ON : '#e5e7eb'}" stroke="${v ? '#15803d' : '#94a3b8'}" stroke-width="2"/>`;
        s += `<circle cx="${v ? 28 : 12}" cy="20" r="9" fill="#fff" stroke="#64748b" stroke-width="1"/>`;
        s += `<text x="${v ? 11 : 29}" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="${v ? '#fff' : '#475569'}">${v}</text>`;
        if (lab) s += `<text x="-6" y="25" text-anchor="end" font-size="14" font-weight="700" fill="#1f2330">${lab}</text>`;
        title = 'Switch ' + (p.label || '') + ' — click to toggle';
      } else if (t === 'BUTTON') {
        const v = p.value ? 1 : 0;
        s += `<rect x="0" y="4" width="40" height="32" rx="16" fill="${v ? ON : '#fde68a'}" stroke="${v ? '#15803d' : '#d97706'}" stroke-width="2"/>`;
        s += `<text x="20" y="25" text-anchor="middle" font-size="11" font-weight="700" fill="${v ? '#fff' : '#92400e'}">${v ? 'ON' : 'PUSH'}</text>`;
        if (lab) s += `<text x="-6" y="25" text-anchor="end" font-size="14" font-weight="700">${lab}</text>`;
        title = 'Push button ' + (p.label || '') + ' — 1 only while held';
      } else if (t === 'CLOCK') {
        const v = p.value ? 1 : 0;
        s += `<rect x="0" y="4" width="40" height="32" rx="5" fill="${v ? ON : '#e0e7ff'}" stroke="${v ? '#15803d' : '#6366f1'}" stroke-width="2"/>`;
        s += `<path d="M7 26 H13 V13 H20 V26 H27 V13 H33" fill="none" stroke="${v ? '#fff' : '#4f46e5'}" stroke-width="2"/>`;
        if (lab) s += `<text x="-6" y="25" text-anchor="end" font-size="14" font-weight="700">${lab}</text>`;
        title = 'Clock ' + (p.label || '') + ' — click to flip, or use ▶ Clock';
      } else if (t === 'CONST') {
        const v = p.value ? 1 : 0;
        s += `<rect x="8" y="8" width="32" height="24" rx="4" fill="${v ? ON : '#e5e7eb'}" stroke="#64748b"/>`;
        s += `<text x="24" y="25" text-anchor="middle" font-size="13" font-weight="700" fill="${v ? '#fff' : '#475569'}">${v}</text>`;
        if (lab) s += `<text x="2" y="25" text-anchor="end" font-size="12" fill="#475569">${lab}</text>`;
        title = 'Constant ' + v + (v ? ' (VCC / +5V)' : ' (GND / 0V)');
      } else if (t === 'OUT') {
        const v = ins[0];
        const col = p.color || '#ef4444';
        s += `<line x1="0" y1="20" x2="8" y2="20" stroke="${v ? ON : OFF}" stroke-width="3"/>`;
        if (v) s += `<circle cx="22" cy="20" r="17" fill="${col}" opacity=".25"/>`;
        s += `<circle cx="22" cy="20" r="12" fill="${v ? col : '#e2e8f0'}" stroke="${v ? col : '#94a3b8'}" stroke-width="2"/>`;
        if (v) s += `<circle cx="18" cy="16" r="3.5" fill="#fff" opacity=".7"/>`;
        if (lab) s += `<text x="40" y="25" font-size="14" font-weight="700">${lab}</text>`;
        title = 'LED ' + (p.label || '') + ' = ' + v;
      } else if (t === 'NUMIN' || t === 'NUMOUT') {
        const n = p.bits || 4;
        const v = t === 'NUMIN' ? p.value : ins.reduce((a, b, k) => a + (b << k), 0);
        const bits = t === 'NUMIN' ? g.outs.map((_, k) => (p.value >> k) & 1) : ins;
        s += `<rect x="0" y="0" width="80" height="${g.h}" rx="7" fill="${t === 'NUMIN' ? '#eff6ff' : '#f5f3ff'}" stroke="${t === 'NUMIN' ? '#3b82f6' : '#8b5cf6'}" stroke-width="2"/>`;
        const shown = p.signed ? signedOf(p, v) : v;
        s += `<text x="${t === 'NUMIN' ? 30 : 40}" y="20" text-anchor="middle" font-size="16" font-weight="800" fill="#1e293b">${shown}</text>`;
        if (t === 'NUMIN' && !p.locked) {
          s += `<g data-act="inc" class="click" style="cursor:pointer"><rect x="56" y="2" width="20" height="11" rx="2" fill="#dbeafe"/><text x="66" y="11" text-anchor="middle" font-size="9">▲</text></g>`;
          s += `<g data-act="dec" class="click" style="cursor:pointer"><rect x="56" y="14" width="20" height="11" rx="2" fill="#dbeafe"/><text x="66" y="23" text-anchor="middle" font-size="9">▼</text></g>`;
        }
        g[t === 'NUMIN' ? 'outs' : 'ins'].forEach((q, k) => {
          const bx = t === 'NUMIN' ? 46 : 12;
          s += `<g ${t === 'NUMIN' && !p.locked ? `data-act="bit${k}" style="cursor:pointer"` : ''}><rect x="${bx}" y="${q.y - 8}" width="22" height="16" rx="3" fill="${bits[k] ? ON : '#e5e7eb'}"/>`;
          s += `<text x="${bx + 11}" y="${q.y + 4}" text-anchor="middle" font-size="11" font-weight="700" fill="${bits[k] ? '#fff' : '#64748b'}">${bits[k]}</text></g>`;
          s += `<text x="${t === 'NUMIN' ? 8 : 40}" y="${q.y + 4}" font-size="10" fill="#64748b">b${k}</text>`;
        });
        if (lab) s += `<text x="40" y="${g.h + 14}" text-anchor="middle" font-size="12.5" font-weight="700">${lab}</text>`;
        title = (t === 'NUMIN' ? 'Number input ' : 'Number display ') + (p.label || '') + ' — ' + n + ' bits (b0 = least significant)' + (t === 'NUMIN' ? '. Click ▲▼ or a bit.' : '');
      } else if (t === 'SEG7') {
        const on = (i) => (ins[i] ? '#ef4444' : '#f1d5d5');
        s += `<rect x="0" y="0" width="90" height="160" rx="8" fill="#1f1f1f"/>`;
        'abcdefg'.split('').forEach((c, k) => { s += `<text x="5" y="${24 + 20 * k}" font-size="9" fill="#aaa">${c}</text>`; });
        const X = 32, Y = 22, L = 40, T = 7;
        const hs = (x, y, i) => `<rect x="${x}" y="${y}" width="${L}" height="${T}" rx="3" fill="${on(i)}"/>`;
        const vs = (x, y, i) => `<rect x="${x}" y="${y}" width="${T}" height="${L + 4}" rx="3" fill="${on(i)}"/>`;
        s += hs(X + 4, Y, 0) + vs(X + L + 4, Y + 5, 1) + vs(X + L + 4, Y + L + 14, 2) + hs(X + 4, Y + 2 * L + 18, 3) +
          vs(X - 3, Y + L + 14, 4) + vs(X - 3, Y + 5, 5) + hs(X + 4, Y + L + 9, 6);
        if (lab) s += `<text x="45" y="176" text-anchor="middle" font-size="12.5" font-weight="700">${lab}</text>`;
        title = '7-segment display (segments a–g)';
      } else if (t === 'TEXT') {
        s += `<text x="0" y="0" font-size="${p.size || 12.5}" fill="${p.color || '#64748b'}" font-weight="${p.bold ? 700 : 400}">${esc(p.text || '')}</text>`;
      } else if (GATES[t]) {
        s += gateSVG(p, p.out[0]);
        title = GATE_DESC[t];
      } else {
        const c = chipDef(p);
        s += `<rect x="0" y="0" width="${g.w}" height="${g.h}" rx="6" fill="${p.fill || c.fill || '#fff7ed'}" stroke="${INK}" stroke-width="2"/>`;
        s += `<text x="${g.w / 2}" y="16" text-anchor="middle" font-size="11" font-weight="800" fill="#7c2d12">${esc(p.label || c.label || t)}</text>`;
        g.ins.forEach((q, k) => { s += `<text x="6" y="${q.y + 4}" font-size="10.5" fill="${ins[k] ? '#15803d' : '#475569'}" font-weight="600">${esc(q.name)}</text>`; });
        g.outs.forEach((q, k) => { s += `<text x="${g.w - 6}" y="${q.y + 4}" text-anchor="end" font-size="10.5" fill="${p.out[k] ? '#15803d' : '#475569'}" font-weight="600">${esc(q.name)}</text>`; });
        if (c.clk !== undefined) { const q = g.ins[c.clk]; s += `<path d="M0 ${q.y - 6} L8 ${q.y} L0 ${q.y + 6}" fill="none" stroke="${INK}" stroke-width="1.5"/>`; }
        title = c.desc || ((p.label || c.label || t) + ': ' + c.ins.join(', ') + ' → ' + c.outs.join(', '));
      }
      // pins
      g.ins.forEach((q, k) => {
        const v = ins[k];
        s += `<circle class="pin" data-pin="${p.id}|ins|${k}" cx="${q.x}" cy="${q.y}" r="${build ? 5 : 3}" fill="${v ? ON : '#fff'}" stroke="${v ? ON : '#64748b'}" stroke-width="1.5"/>`;
        if (build) s += `<circle class="pin" data-pin="${p.id}|ins|${k}" cx="${q.x}" cy="${q.y}" r="10" fill="transparent"/>`;
      });
      g.outs.forEach((q, k) => {
        const v = p.out[k];
        s += `<circle class="pin" data-pin="${p.id}|outs|${k}" cx="${q.x}" cy="${q.y}" r="${build ? 5 : 3.5}" fill="${v ? ON : '#fff'}" stroke="${v ? ON : '#64748b'}" stroke-width="1.5"/>`;
        if (build) s += `<circle class="pin" data-pin="${p.id}|outs|${k}" cx="${q.x}" cy="${q.y}" r="10" fill="transparent"/>`;
      });
      const hit = t === 'TEXT' ? '' : `<rect x="0" y="0" width="${g.w}" height="${g.h}" fill="transparent" class="hit"/>`;
      return `<g class="${cls}" data-part="${p.id}" transform="translate(${p.x} ${p.y})">${title ? `<title>${esc(title)}</title>` : ''}${hit}${s}</g>`;
    }

    function render() {
      const [vx, vy, vw, vh] = bbox();
      svg.setAttribute('viewBox', `${vx} ${vy} ${vw} ${vh}`);
      svg.style.maxWidth = Math.round(vw * (cfg.scale || (build ? 1 : 1.35))) + 'px';
      let s = '';
      if (build || cfg.grid) {
        s += `<defs><pattern id="cg" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="0" cy="0" r="1" fill="#d5dbe6"/></pattern></defs>`;
        s += `<rect x="${vx}" y="${vy}" width="${vw}" height="${vh}" fill="url(#cg)"/>`;
      }
      // wires
      const fan = new Map();
      for (const w of wires) { const key = w.from.id + '.' + w.from.k; fan.set(key, (fan.get(key) || 0) + 1); }
      wires.forEach((w, i) => {
        const src = byId.get(w.from.id); if (!src) return;
        const v = src.out[w.from.k];
        const a = pinPos(w.from.id, 'outs', w.from.k), b = pinPos(w.to.id, 'ins', w.to.k);
        const d = route(a, b, w.opt);
        s += `<g class="circ-wire${w.locked ? ' locked' : ''}" data-wire="${i}">`;
        if (build && !w.locked) s += `<path d="${d}" fill="none" stroke="transparent" stroke-width="10"/>`;
        s += `<path class="w" d="${d}" fill="none" stroke="${v ? ON : OFF}" stroke-width="${v ? 3.2 : 2.2}" stroke-linejoin="round" stroke-linecap="round"/></g>`;
      });
      for (const [key, n] of fan) if (n > 1) {
        const [id, k] = key.split('.'); const a = pinPos(id, 'outs', +k);
        const v = byId.get(id).out[+k];
        s += `<circle cx="${a.x}" cy="${a.y}" r="4" fill="${v ? ON : OFF}"/>`;
      }
      for (const p of parts) s += partSVG(p);
      if (wiring) {
        const a = pinPos(wiring.id, wiring.side, wiring.k);
        s += `<line x1="${a.x}" y1="${a.y}" x2="${wiring.x}" y2="${wiring.y}" stroke="#f59e0b" stroke-width="2.5" stroke-dasharray="6 4" pointer-events="none"/>`;
      }
      svg.innerHTML = s;
      renderTable();
      renderScope();
      if (build) renderCount();
    }

    // ---------- truth table ----------
    const side = document.createElement('div');
    side.className = 'circ-side';
    const ttHost = document.createElement('div');
    side.append(ttHost);
    const srcParts = () => parts.filter((p) => p.type === 'IN' || p.type === 'NUMIN' || p.type === 'BUTTON');
    const outParts = () => parts.filter((p) => p.type === 'OUT' || p.type === 'NUMOUT');
    const nameOf = (p) => p.label || p.id;
    function tableOn() {
      if (cfg.table === false) return false;
      const ins = srcParts(), outs = outParts();
      const bits = ins.reduce((a, p) => a + (p.type === 'NUMIN' ? p.bits || 4 : 1), 0);
      if (!ins.length || !outs.length || bits > (cfg.table === true || cfg.target ? 6 : 4) || ins.some((p) => p.type === 'NUMIN')) return false;
      if (cfg.table === true) return true;
      return !isSeq();
    }
    function snapshot() { return parts.map((p) => ({ v: p.value, out: p.out.slice(), mem: JSON.stringify(p.mem) })); }
    function restore(s) { parts.forEach((p, i) => { p.value = s[i].v; p.out = s[i].out; p.mem = JSON.parse(s[i].mem); }); }
    function combos(ins) {
      const sizes = ins.map((p) => (p.type === 'NUMIN' ? 1 << (p.bits || 4) : 2));
      const total = sizes.reduce((a, b) => a * b, 1);
      const list = [];
      const N = Math.min(total, 1024);
      for (let i = 0; i < N; i++) {
        let r = total <= 1024 ? i : Math.floor(Math.random() * total);
        const vals = [];
        for (let j = ins.length - 1; j >= 0; j--) { vals[j] = r % sizes[j]; r = Math.floor(r / sizes[j]); }
        list.push(vals);
      }
      return list;
    }
    function evalCombo(ins, vals) {
      ins.forEach((p, j) => { p.value = vals[j]; });
      let n = 0; while (n < MAXT && tick()) n++;
      if (n >= MAXT) settleSeq(true);
      return outParts().map((p) => valueOf(p));
    }
    function renderTable() {
      if (!tableOn()) { ttHost.innerHTML = ''; return; }
      const ins = srcParts(), outs = outParts();
      const snap = snapshot();
      const cur = ins.map((p) => (p.value ? 1 : 0)).join('');
      const rows = combos(ins).map((vals) => ({ vals, out: evalCombo(ins, vals) }));
      restore(snap);
      const cell = (v) => `<td class="${v ? 'one' : 'zero'}">${v}</td>`;
      let want = null;
      if (cfg.target) {
        want = rows.map((r) => {
          const o = {}; ins.forEach((p, j) => { o[nameOf(p)] = r.vals[j]; });
          let e = {}; try { e = cfg.target(o) || {}; } catch (err) { /* ignore */ }
          return outs.map((p) => (e[nameOf(p)] === undefined ? null : +e[nameOf(p)]));
        });
      }
      let h = `<table class="circ-tt"><caption>Truth table · click a row</caption><tr>${ins.map((p) => `<th>${esc(nameOf(p))}</th>`).join('')}${outs.map((p, i) => `<th class="${i ? '' : 'o'}">${esc(nameOf(p))}</th>`).join('')}${want ? outs.map((p, i) => `<th class="${i ? '' : 'o'}" title="What the goal circuit should output">🎯 ${esc(nameOf(p))}</th>`).join('') : ''}</tr>`;
      rows.forEach((r, ri) => {
        const key = r.vals.join('');
        const bad = want && want[ri].some((v, i) => v !== null && v !== r.out[i]);
        h += `<tr data-row="${key}" class="${key === cur ? 'cur' : ''}${bad ? ' bad' : ''}">${r.vals.map(cell).join('')}${r.out.map((v, i) => cell(v).replace('<td class="', `<td class="${i ? '' : 'o '}`)).join('')}`;
        if (want) h += want[ri].map((v, i) => `<td class="${i ? '' : 'o '}want">${v === null ? '·' : v}</td>`).join('');
        h += '</tr>';
      });
      if (want) h += `<caption style="caption-side:bottom;padding-top:3px">🎯 = goal. Red rows don't match yet.</caption>`;
      ttHost.innerHTML = h + '</table>';
    }
    ttHost.addEventListener('click', (e) => {
      const tr = e.target.closest('tr[data-row]'); if (!tr) return;
      srcParts().forEach((p, j) => { p.value = +tr.dataset.row[j]; });
      update();
    });

    // ---------- scope ----------
    const scopeHost = document.createElement('div');
    function sample() {
      if (!cfg.scope) return;
      const vals = cfg.scope.map((n) => valueOf(find(n)));
      const last = scopeSamples[scopeSamples.length - 1];
      if (last && same(last, vals)) return;
      scopeSamples.push(vals);
      if (scopeSamples.length > 48) scopeSamples.shift();
    }
    function renderScope() {
      if (!cfg.scope) return;
      const names = cfg.scope, rowH = 30, lw = 54, sw = 20;
      const W = lw + 48 * sw + 10, H = names.length * rowH + 22;
      let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><text x="6" y="14" font-size="10.5" fill="#7d869c">📈 Oscilloscope — time →  (one step per change)</text>`;
      names.forEach((n, r) => {
        const y0 = 22 + r * rowH, hi = y0 + 5, lo = y0 + rowH - 7;
        const p = find(n);
        const multi = p && (p.type === 'NUMIN' || p.type === 'NUMOUT');
        s += `<text x="6" y="${y0 + 17}" font-size="12" font-weight="700" fill="#e2e8f0">${esc(n)}</text>`;
        if (multi) {
          scopeSamples.forEach((vals, i) => {
            const x = lw + i * sw;
            s += `<path d="M${x + 2} ${(hi + lo) / 2} L${x + 5} ${hi} H${x + sw - 1} L${x + sw + 2} ${(hi + lo) / 2} L${x + sw - 1} ${lo} H${x + 5} Z" fill="none" stroke="#60a5fa" stroke-width="1.5"/>`;
            s += `<text x="${x + sw / 2 + 2}" y="${(hi + lo) / 2 + 4}" text-anchor="middle" font-size="9.5" fill="#bfdbfe">${vals[r]}</text>`;
          });
        } else {
          let d = '';
          scopeSamples.forEach((vals, i) => {
            const x = lw + i * sw, y = vals[r] ? hi : lo;
            d += (i === 0 ? `M${x} ${y}` : ` V${y}`) + ` H${x + sw}`;
          });
          s += `<line x1="${lw}" y1="${lo}" x2="${W}" y2="${lo}" stroke="#1e293b"/>`;
          if (d) s += `<path d="${d}" fill="none" stroke="#4ade80" stroke-width="2"/>`;
        }
      });
      scopeHost.className = 'circ-scope';
      scopeHost.innerHTML = s + '</svg>';
    }

    // ---------- toolbar / status ----------
    root.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'circ' + (build ? ' build' : '');
    if (cfg.title) wrap.insertAdjacentHTML('beforeend', `<div class="circ-title">${esc(cfg.title)}</div>`);
    if (cfg.intro) wrap.insertAdjacentHTML('beforeend', `<div class="circ-intro">${cfg.intro}</div>`);
    const bar = document.createElement('div');
    bar.className = 'circ-bar';
    const btn = (label, cls, fn, title) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; if (title) b.title = title; b.onclick = fn; bar.append(b); return b; };
    if (build) {
      for (const t of build.palette || ['AND', 'OR', 'NOT']) {
        const [type, n] = String(t).split(':');
        btn('+ ' + (CHIPS[type] ? CHIPS[type].label || type : type) + (n ? ' (' + n + ')' : ''), 'pal', () => {
          const spec = { type };
          if (n) spec.n = +n;
          const p = addPart(spec);
          const g = geom(p);
          const [, , W, H] = bbox();
          let x = 200, y = 30;
          const hitAny = () => parts.some((q) => q !== p && x < q.x + geom(q).w + 20 && x + g.w + 20 > q.x && y < q.y + geom(q).h + 20 && y + g.h + 20 > q.y);
          outer: for (x = 180; x < W - g.w - 60; x += 40) for (y = 30; y < H - g.h - 20; y += 40) if (!hitAny()) break outer;
          p.x = Math.min(x, W - g.w - 60); p.y = Math.min(y, H - g.h - 20);
          update();
        }, CHIPS[type] ? (CHIPS[type].desc || '') : GATE_DESC[type]);
      }
      bar.insertAdjacentHTML('beforeend', '<span class="sep"></span>');
      btn('🗑 Clear', '', () => {
        for (const p of parts.slice()) if (!p.fixed) removePart(p);
        wires = wires.filter((w) => w.locked); rewire(); update();
      }, 'Remove all placed parts and wires');
    }
    const slowBtn = btn('🐢 Slow-mo', '', () => { slow = !slow; slowBtn.classList.toggle('on', slow); update(); }, 'Animate signal propagation one gate delay at a time');
    let clkBtn = null;
    if (parts.some((p) => p.type === 'CLOCK')) {
      clkBtn = btn('▶ Clock', '', () => {
        if (clockTimer) { clearInterval(clockTimer); clockTimer = null; clkBtn.textContent = '▶ Clock'; clkBtn.classList.remove('on'); return; }
        clkBtn.textContent = '⏸ Clock'; clkBtn.classList.add('on');
        clockTimer = setInterval(() => { flipClocks(); }, cfg.clockMs || 700);
      }, 'Run the clock automatically');
      btn('⏭ Pulse', '', () => pulse(), 'One full clock cycle: 0 → 1 (rising edge) → 0');
    }
    const resultBox = document.createElement('div');
    resultBox.className = 'circ-result';
    if (cfg.target || cfg.test) btn('✔ Check', 'chk', () => check(), 'Test your circuit against every input combination');
    function flipClocks() {
      for (const p of parts) if (p.type === 'CLOCK') { p.value ^= 1; if (p.value) cycles++; }
      update();
    }
    function pulse() {
      for (const p of parts) if (p.type === 'CLOCK') p.value = 0;
      settleNow(); sample();
      for (const p of parts) if (p.type === 'CLOCK') p.value = 1;
      cycles++;
      settleNow(); sample();
      for (const p of parts) if (p.type === 'CLOCK') p.value = 0;
      update();
    }
    const stat = document.createElement('div');
    stat.className = 'circ-status';
    const help = document.createElement('div');
    help.className = 'circ-help';
    if (build) help.innerHTML = 'Drag from a pin ● to another pin to wire (output → input). Drag gates to move. Click a wire to delete it. Double-click a gate to delete it.';
    else if (cfg.help !== false) help.innerHTML = cfg.help || 'Click the switches. <span style="color:' + ON + '">Green</span> = 1 (high voltage), grey = 0. Hover any part for what it does.';
    let countEl = null;
    function renderCount() {
      if (!countEl) return;
      const counts = {};
      for (const p of parts) if (!p.fixed && p.type !== 'TEXT') counts[p.type] = (counts[p.type] || 0) + 1;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      countEl.innerHTML = `🧱 Parts: <b>${total}</b>${total ? ' (' + Object.entries(counts).map(([k, v]) => k + '×' + v).join(', ') + ')' : ''}${build.best ? ' · ⭐ best known: ' + build.best : ''}${build.max ? ' · limit: ' + build.max : ''}`;
    }
    function status(msg) {
      const bits = [];
      if (msg) bits.push(msg);
      else {
        bits.push(unstable ? `⏱ never settled (gave up after <b>${delays}</b> gate delays)` : `⏱ settled after <b>${delays}</b> gate delay${delays === 1 ? '' : 's'}`);
        if (clkBtn || cycles) bits.push(`🔁 clock cycles: <b>${cycles}</b>`);
        if (unstable) bits.push('<span class="warn">⚠ Oscillating / race! Signals never settled (feedback loop fighting itself). Picked a random stable state — real hardware goes metastable.</span>');
      }
      stat.innerHTML = bits.map((b) => `<span>${b}</span>`).join('') + (build ? '<span class="cnt"></span>' : '');
      if (build) { countEl = stat.querySelector('.cnt'); renderCount(); }
    }

    // ---------- check ----------
    function partsFor(names) { return names.map((n) => { const p = find(n); if (!p) throw new Error('Circ check: no part labelled "' + n + '"'); return p; }); }
    function check() {
      const snap = snapshot();
      const keepD = delays, keepU = unstable;
      let fails = [], total = 0, msg = '';
      try {
        if (build && build.max) {
          const n = parts.filter((p) => !p.fixed && p.type !== 'TEXT').length;
          if (n > build.max) msg = `Too many parts: ${n} (limit ${build.max}).`;
        }
        if (!msg && cfg.target) {
          const ins = srcParts(), outs = outParts();
          for (const vals of combos(ins)) {
            total++;
            const got = evalCombo(ins, vals);
            const inObj = {}; ins.forEach((p, j) => { inObj[nameOf(p)] = vals[j]; });
            const exp = cfg.target(Object.assign({}, inObj));
            const expArr = outs.map((p) => (exp[nameOf(p)] === undefined ? null : +exp[nameOf(p)]));
            const ok = expArr.every((v, i) => v === null || v === got[i]);
            if (!ok) fails.push({ inObj, exp: expArr, got });
          }
        } else if (!msg && cfg.test) {
          for (const p of parts) { p.mem = {}; p.out = p.out.map(() => 0); }
          settleSeq(false);
          cfg.test.forEach((st, i) => {
            for (const [k, v] of Object.entries(st.set || {})) find(k).value = v;
            settleNow();
            if (st.pulse) { const c = find(st.pulse); c.value = 1; settleNow(); c.value = 0; settleNow(); }
            if (st.expect) {
              total++;
              const names = Object.keys(st.expect);
              const got = names.map((n) => valueOf(find(n)));
              const exp = names.map((n) => +st.expect[n]);
              if (!same(got, exp)) fails.push({ step: i + 1, note: st.note || '', inObj: st.set || {}, names, exp, got });
            }
          });
        }
      } catch (e) { msg = e.message; }
      restore(snap); settleNow(); delays = keepD; unstable = keepU; render(); status();
      if (msg) { resultBox.className = 'circ-result bad'; resultBox.innerHTML = '❌ ' + esc(msg); return false; }
      if (!fails.length) {
        resultBox.className = 'circ-result ok';
        resultBox.innerHTML = `✅ All ${total} ${cfg.test ? 'test steps' : 'input combinations'} pass!` + (build && build.best ? ` Parts used: ${parts.filter((p) => !p.fixed && p.type !== 'TEXT').length} (best known: ${build.best}).` : '');
        console.log('✅ Check passed');
        return true;
      }
      resultBox.className = 'circ-result bad';
      const outs = cfg.test ? null : outParts().map(nameOf);
      let h = `❌ ${fails.length} of ${total} ${cfg.test ? 'test steps' : 'cases'} wrong. First failures:<table><tr><th>${cfg.test ? 'step' : 'inputs'}</th><th>expected</th><th>got</th></tr>`;
      for (const f of fails.slice(0, 6)) {
        const names = f.names || outs;
        const fmt = (arr) => names.map((n, i) => n + '=' + (arr[i] === null ? '·' : arr[i])).join(' ');
        h += `<tr><td>${cfg.test ? '#' + f.step + ' ' + esc(f.note) : esc(Object.entries(f.inObj).map(([k, v]) => k + '=' + v).join(' '))}</td><td>${esc(fmt(f.exp))}</td><td>${esc(fmt(f.got))}</td></tr>`;
      }
      resultBox.innerHTML = h + '</table>';
      console.log('❌ Check failed: ' + fails.length + ' wrong');
      return false;
    }

    // ---------- interaction ----------
    function svgPt(e) {
      const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
      const r = pt.matrixTransform(svg.getScreenCTM().inverse());
      return { x: r.x, y: r.y };
    }
    function removePart(p) {
      const i = parts.indexOf(p); if (i >= 0) parts.splice(i, 1);
      byId.delete(p.id);
      wires = wires.filter((w) => w.from.id !== p.id && w.to.id !== p.id);
      rewire();
    }
    function clickPart(p, act) {
      if (p.locked) return;
      if (p.type === 'IN' || p.type === 'CLOCK') { p.value ^= 1; if (p.type === 'CLOCK' && p.value) cycles++; update(); }
      else if (p.type === 'NUMIN') {
        const n = p.bits || 4, max = (1 << n) - 1;
        if (act === 'inc') p.value = (p.value + 1) & max;
        else if (act === 'dec') p.value = (p.value - 1) & max;
        else if (act && act.startsWith('bit')) p.value ^= 1 << +act.slice(3);
        else p.value = (p.value + 1) & max;
        update();
      }
    }
    svg.addEventListener('pointerdown', (e) => {
      const pt = svgPt(e);
      const pinEl = e.target.closest('[data-pin]');
      if (build && pinEl) {
        const [id, sd, k] = pinEl.dataset.pin.split('|');
        wiring = { id, side: sd, k: +k, x: pt.x, y: pt.y };
        svg.setPointerCapture(e.pointerId);
        render(); e.preventDefault(); return;
      }
      const g = e.target.closest('[data-part]');
      if (!g) return;
      const p = byId.get(g.dataset.part);
      const actEl = e.target.closest('[data-act]');
      drag = { p, dx: pt.x - p.x, dy: pt.y - p.y, sx: pt.x, sy: pt.y, moved: false, act: actEl && actEl.dataset.act };
      if (p.type === 'BUTTON' && !p.locked) { p.value = 1; update(); }
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    svg.addEventListener('pointermove', (e) => {
      if (wiring) { const pt = svgPt(e); wiring.x = pt.x; wiring.y = pt.y; render(); return; }
      if (!drag) return;
      const pt = svgPt(e);
      if (Math.abs(pt.x - drag.sx) + Math.abs(pt.y - drag.sy) > 5) drag.moved = true;
      if (drag.moved && build && !drag.p.fixed) {
        drag.p.x = Math.round((pt.x - drag.dx) / 10) * 10;
        drag.p.y = Math.round((pt.y - drag.dy) / 10) * 10;
        render();
      }
    });
    svg.addEventListener('pointerup', (e) => {
      if (wiring) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const pinEl = el && el.closest && el.closest('[data-pin]');
        if (pinEl) {
          const [id, sd, k] = pinEl.dataset.pin.split('|');
          const a = { id: wiring.id, k: wiring.k }, b = { id, k: +k };
          if (wiring.side === 'outs' && sd === 'ins') connect(a, b);
          else if (wiring.side === 'ins' && sd === 'outs') connect(b, a);
          rewire();
        }
        wiring = null; update(); return;
      }
      if (!drag) return;
      const d = drag; drag = null;
      if (d.p.type === 'BUTTON' && !d.p.locked) { d.p.value = 0; update(); return; }
      if (!d.moved) {
        const now = Date.now();
        if (build && !d.p.fixed && lastClick.p === d.p && now - lastClick.t < 400) { removePart(d.p); lastClick = {}; update(); return; }
        lastClick = { p: d.p, t: now };
        clickPart(d.p, d.act);
      }
    });
    svg.addEventListener('click', (e) => {
      if (!build) return;
      const w = e.target.closest('[data-wire]');
      if (w && !e.target.closest('[data-part]') && !wires[+w.dataset.wire].locked) { wires.splice(+w.dataset.wire, 1); rewire(); update(); }
    });

    // ---------- assemble ----------
    const mainEl = document.createElement('div');
    mainEl.className = 'circ-main';
    const left = document.createElement('div');
    left.style.cssText = 'flex:1 1 480px;min-width:300px';
    left.append(board, stat, help, resultBox);
    board.style.minWidth = '0';
    mainEl.append(left, side);
    wrap.append(bar, mainEl);
    if (cfg.scope) wrap.append(scopeHost);
    root.append(wrap);

    const api = {
      parts, get wires() { return wires; },
      get: (n) => valueOf(find(n)),
      signed: (n) => { const p = find(n); return signedOf(p, valueOf(p)); },
      set: (n, v) => { const p = find(n); p.value = v; update(); },
      pulse, check, update, render, find,
      get delays() { return delays; },
      get unstable() { return unstable; },
      get cycles() { return cycles; },
      stop: () => { if (clockTimer) clearInterval(clockTimer); clockTimer = null; },
    };
    // initial state: sequential sweep so feedback loops (latches) start in a stable state
    settleSeq(false);
    settleNow();
    afterSettle();
    return api;
  }

  window.Circ = { mount, chip, GATES, CHIPS };
  const st = document.createElement('style');
  st.textContent = CSS;
  (document.head || document.documentElement).appendChild(st);
}.toString() + ')();';
