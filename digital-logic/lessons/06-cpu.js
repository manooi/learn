window.LESSONS = window.LESSONS || [];
(function () {
// ======================================================================================
// Section "Building a CPU". All lessons share ONE teaching CPU called TINY-8:
//   8-bit data · 16 bytes RAM (program + data, von Neumann) · registers A, B, PC(4-bit), IR, MAR · flags Z N C
//   1-byte instructions: [opcode 4 bits][operand 4 bits]
// The CPU core + simulator UI below are real functions; their source text is injected into widget iframes
// via ${CPU_SRC} / ${SIM_SRC} (each widget iframe is isolated, so it needs its own copy).
// ======================================================================================
function cpuCore() {
  // ===== TINY-8: the teaching CPU of this course =====
  // 8-bit data, 16 bytes of RAM (program + data), registers A, B, PC (4-bit), IR, MAR, flags Z N C.
  // Every instruction is ONE byte: high nibble = opcode, low nibble = operand (number 0-15 or address 0-15).
  var OPS = [
    { m: 'HLT', arg: '', d: 'Stop the clock' },
    { m: 'LDI A', arg: 'n', d: 'A ← n  (n = 0..15)' },
    { m: 'LDI B', arg: 'n', d: 'B ← n  (n = 0..15)' },
    { m: 'LD A', arg: 'a', d: 'A ← RAM[a]' },
    { m: 'LD B', arg: 'a', d: 'B ← RAM[a]' },
    { m: 'ST A', arg: 'a', d: 'RAM[a] ← A' },
    { m: 'MOV B,A', arg: '', d: 'B ← A' },
    { m: 'ADD', arg: '', d: 'A ← A + B  (sets Z N C)' },
    { m: 'SUB', arg: '', d: 'A ← A − B  (sets Z N C)' },
    { m: 'AND', arg: '', d: 'A ← A AND B  (sets Z N, C=0)' },
    { m: 'OR', arg: '', d: 'A ← A OR B  (sets Z N, C=0)' },
    { m: 'JMP', arg: 'a', d: 'PC ← a' },
    { m: 'JZ', arg: 'a', d: 'if Z=1: PC ← a' },
    { m: 'JNZ', arg: 'a', d: 'if Z=0: PC ← a' },
    { m: 'JC', arg: 'a', d: 'if C=1: PC ← a' },
    { m: 'OUT', arg: '', d: 'Output display ← A' },
  ];
  var SIGS = ['HLT', 'PC_OUT', 'PC_INC', 'PC_LOAD', 'MAR_IN', 'RAM_OUT', 'RAM_IN', 'IR_IN', 'IR_OUT', 'A_IN', 'A_OUT', 'B_IN', 'ALU_OUT', 'FLAGS_IN', 'OUT_IN'];
  var SIG_DESC = {
    HLT: 'stop the clock', PC_OUT: 'PC drives the bus', PC_INC: 'PC counts up by 1', PC_LOAD: 'PC loads from the bus (jump)',
    MAR_IN: 'memory address register loads from bus', RAM_OUT: 'RAM[MAR] drives the bus (memory read)', RAM_IN: 'RAM[MAR] loads from bus (memory write)',
    IR_IN: 'instruction register loads from bus', IR_OUT: 'IR operand (low 4 bits) drives the bus', A_IN: 'A loads from bus (register write)',
    A_OUT: 'A drives the bus', B_IN: 'B loads from bus', ALU_OUT: 'ALU result drives the bus', FLAGS_IN: 'flags register latches Z N C', OUT_IN: 'output display loads from bus',
  };
  var FETCH = [
    { s: ['PC_OUT', 'MAR_IN'], t: 'MAR ← PC' },
    { s: ['RAM_OUT', 'IR_IN', 'PC_INC'], t: 'IR ← RAM[MAR],  PC ← PC + 1' },
  ];
  var ALU = { 7: 'ADD', 8: 'SUB', 9: 'AND', 10: 'OR' };
  var EXEC = [
    [{ s: ['HLT'], t: 'halt: stop the clock' }],
    [{ s: ['IR_OUT', 'A_IN'], t: 'A ← operand' }],
    [{ s: ['IR_OUT', 'B_IN'], t: 'B ← operand' }],
    [{ s: ['IR_OUT', 'MAR_IN'], t: 'MAR ← operand' }, { s: ['RAM_OUT', 'A_IN'], t: 'A ← RAM[MAR]' }],
    [{ s: ['IR_OUT', 'MAR_IN'], t: 'MAR ← operand' }, { s: ['RAM_OUT', 'B_IN'], t: 'B ← RAM[MAR]' }],
    [{ s: ['IR_OUT', 'MAR_IN'], t: 'MAR ← operand' }, { s: ['A_OUT', 'RAM_IN'], t: 'RAM[MAR] ← A' }],
    [{ s: ['A_OUT', 'B_IN'], t: 'B ← A' }],
    [{ s: ['ALU_OUT', 'A_IN', 'FLAGS_IN'], alu: 'ADD', t: 'A ← A + B, latch flags' }],
    [{ s: ['ALU_OUT', 'A_IN', 'FLAGS_IN'], alu: 'SUB', t: 'A ← A − B, latch flags' }],
    [{ s: ['ALU_OUT', 'A_IN', 'FLAGS_IN'], alu: 'AND', t: 'A ← A AND B, latch flags' }],
    [{ s: ['ALU_OUT', 'A_IN', 'FLAGS_IN'], alu: 'OR', t: 'A ← A OR B, latch flags' }],
    [{ s: ['IR_OUT', 'PC_LOAD'], t: 'PC ← operand (jump!)' }],
    [{ s: ['IR_OUT', 'PC_LOAD'], cond: 'Z', t: 'if Z=1: PC ← operand' }],
    [{ s: ['IR_OUT', 'PC_LOAD'], cond: '!Z', t: 'if Z=0: PC ← operand' }],
    [{ s: ['IR_OUT', 'PC_LOAD'], cond: 'C', t: 'if C=1: PC ← operand' }],
    [{ s: ['A_OUT', 'OUT_IN'], t: 'OUT ← A' }],
  ];
  var h2 = function (v) { return '0x' + (v & 255).toString(16).toUpperCase().padStart(2, '0'); };
  var b8 = function (v) { return (v & 255).toString(2).padStart(8, '0'); };
  function alu(op, a, b) {
    var r, c = 0;
    if (op === 'ADD') { r = a + b; c = r > 255 ? 1 : 0; }
    else if (op === 'SUB') { r = a - b; c = a < b ? 1 : 0; }
    else if (op === 'AND') r = a & b;
    else r = a | b;
    r &= 255;
    return { r: r, Z: r === 0 ? 1 : 0, N: r >> 7, C: c };
  }
  function dis(byte) {
    var op = (byte >> 4) & 15, x = byte & 15, o = OPS[op];
    if (!o.arg) return o.m;
    if (o.arg === 'n') return o.m + ', ' + x;
    if (/^(LD|ST)/.test(o.m)) return o.m + ', [' + x + ']';
    return o.m + ' ' + x;
  }
  function condOk(s, c) { return c === 'Z' ? s.Z === 1 : c === '!Z' ? s.Z === 0 : c === 'C' ? s.C === 1 : true; }
  function create(bytes) {
    var mem = []; for (var i = 0; i < 16; i++) mem.push((bytes && bytes[i]) | 0);
    return { mem: mem, A: 0, B: 0, PC: 0, IR: 0, MAR: 0, Z: 0, N: 0, C: 0, out: [], halted: false, t: 0, seq: null, cycles: 0, instrs: 0, bus: null };
  }
  // one clock tick = one micro-step. Returns what happened (for drawing).
  function tick(s) {
    if (s.halted) return null;
    var info = { t: s.t, sigs: [], bus: null, blocked: false, alu: null };
    var st;
    if (s.t < 2) { info.phase = 'fetch'; st = FETCH[s.t]; }
    else if (s.t === 2) {
      info.phase = 'decode';
      var op = s.IR >> 4;
      s.seq = EXEC[op];
      info.text = 'decode: opcode ' + op.toString(2).padStart(4, '0') + ' = ' + OPS[op].m + ', operand ' + (s.IR & 15);
    } else { info.phase = 'execute'; st = s.seq[s.t - 3]; }
    if (st) {
      var sig = st.s.slice();
      if (st.cond && !condOk(s, st.cond)) { sig = sig.filter(function (x) { return x !== 'PC_LOAD' && x !== 'IR_OUT'; }); info.blocked = true; }
      info.sigs = sig; info.text = st.t + (info.blocked ? '  (condition false: no jump)' : ''); info.alu = st.alu || null;
      var on = function (n) { return sig.indexOf(n) >= 0; };
      var bus = null, f = null;
      if (st.alu) f = alu(st.alu, s.A, s.B);
      if (on('PC_OUT')) bus = s.PC;
      if (on('RAM_OUT')) bus = s.mem[s.MAR];
      if (on('IR_OUT')) bus = s.IR & 15;
      if (on('A_OUT')) bus = s.A;
      if (on('ALU_OUT')) bus = f.r;
      info.bus = bus;
      if (on('MAR_IN')) s.MAR = bus & 15;
      if (on('IR_IN')) s.IR = bus;
      if (on('A_IN')) s.A = bus;
      if (on('B_IN')) s.B = bus;
      if (on('RAM_IN')) s.mem[s.MAR] = bus;
      if (on('OUT_IN')) s.out.push(bus);
      if (on('FLAGS_IN')) { s.Z = f.Z; s.N = f.N; s.C = f.C; }
      if (on('PC_INC')) s.PC = (s.PC + 1) & 15;
      if (on('PC_LOAD')) s.PC = bus & 15;
      if (on('HLT')) s.halted = true;
    }
    s.bus = info.bus;
    s.cycles++;
    s.t++;
    if (s.t >= 3 && s.t - 3 >= s.seq.length) { s.t = 0; s.instrs++; }
    return info;
  }
  function step(s) { var last = null; do { last = tick(s) || last; } while (s.t !== 0 && !s.halted); return last; }
  function run(s, max) { max = max || 1000; var n = 0; while (!s.halted && n < max) { step(s); n++; } return n; }

  // ----- assembler -----
  function num(tok, labels) {
    if (tok == null) return NaN;
    tok = tok.trim();
    if (/^-?\d+$/.test(tok)) return parseInt(tok, 10);
    if (/^0x[0-9a-f]+$/i.test(tok)) return parseInt(tok, 16);
    if (/^0b[01]+$/i.test(tok)) return parseInt(tok.slice(2), 2);
    var k = tok.toLowerCase();
    if (labels && Object.prototype.hasOwnProperty.call(labels, k)) return labels[k];
    return NaN;
  }
  function assemble(src) {
    var lines = String(src).split('\n'), items = [], labels = {}, errors = [], addr = 0;
    lines.forEach(function (raw, i) {
      var line = raw.replace(/(;|\/\/|#).*$/, '').trim();
      var m;
      while ((m = /^([A-Za-z_]\w*)\s*:\s*/.exec(line))) {
        var name = m[1].toLowerCase();
        if (labels[name] !== undefined) errors.push({ line: i + 1, msg: 'label "' + m[1] + '" defined twice' });
        labels[name] = addr; line = line.slice(m[0].length);
      }
      if (!line) return;
      items.push({ line: i + 1, text: line, addr: addr }); addr++;
    });
    if (addr > 16) errors.push({ line: items[16].line, msg: 'program is ' + addr + ' bytes but RAM only has 16 (addresses 0-15)' });
    var bytes = []; for (var j = 0; j < 16; j++) bytes.push(0);
    var lineOf = [];
    items.forEach(function (it) {
      if (it.addr > 15) return;
      var err = function (msg) { errors.push({ line: it.line, msg: msg }); };
      var mm = /^([A-Za-z.]+)\s*(.*)$/.exec(it.text);
      var mn = mm ? mm[1].toUpperCase() : '', rest = mm ? mm[2].trim() : it.text;
      var args = rest ? rest.split(',').map(function (x) { return x.trim(); }) : [];
      var byte = 0;
      var addrArg = function (tok) {
        if (tok == null || tok === '') { err(mn + ' needs an address or label'); return 0; }
        var t = tok.replace(/^\[\s*|\s*\]$/g, '');
        var v = num(t, labels);
        if (isNaN(v)) { err('unknown label or number "' + t + '"'); return 0; }
        if (v < 0 || v > 15) { err('address ' + v + ' out of range: RAM addresses are 0-15'); return 0; }
        return v;
      };
      var reg = function (tok, allowed) {
        var r = (tok || '').toUpperCase();
        if (allowed.indexOf(r) < 0) { err(mn + ' needs register ' + allowed.join(' or ') + (tok ? ', got "' + tok + '"' : '')); return null; }
        return r;
      };
      if (mn === 'DB' || mn === '.DB' || mn === '.BYTE' || /^-?(\d|0x|0b)/i.test(it.text)) {
        var tok = mn === 'DB' || mn === '.DB' || mn === '.BYTE' ? rest : it.text;
        var v = num(tok, labels);
        if (isNaN(v)) err('bad data value "' + tok + '"');
        else if (v < -128 || v > 255) err('data byte ' + v + ' does not fit in 8 bits (0-255)');
        byte = v & 255;
      } else if (['HLT', 'ADD', 'SUB', 'AND', 'OR', 'OUT'].indexOf(mn) >= 0) {
        if (args.length) err(mn + ' takes no operands (it always uses A and B)');
        byte = ({ HLT: 0, ADD: 7, SUB: 8, AND: 9, OR: 10, OUT: 15 })[mn] << 4;
      } else if (mn === 'MOV') {
        if (args.length !== 2 || args[0].toUpperCase() !== 'B' || args[1].toUpperCase() !== 'A') err('only MOV B, A exists (copy A into B)');
        byte = 0x60;
      } else if (mn === 'LDI') {
        var r = reg(args[0], ['A', 'B']);
        var n = num(args[1], labels);
        if (args.length !== 2 || isNaN(n)) err('write LDI A, n  or  LDI B, n');
        else if (n < 0 || n > 15) err('LDI only has 4 bits for the number (0-15). Store ' + n + ' in a DB byte and use LD instead');
        byte = ((r === 'B' ? 2 : 1) << 4) | (n & 15);
      } else if (mn === 'LD') {
        var r2 = reg(args[0], ['A', 'B']);
        if (args.length !== 2) err('write LD A, [address]');
        byte = ((r2 === 'B' ? 4 : 3) << 4) | addrArg(args[1]);
      } else if (mn === 'ST') {
        if ((args[0] || '').toUpperCase() === 'B') err('there is no ST B: only A can be stored, so get the value into A first');
        else reg(args[0], ['A']);
        if (args.length !== 2) err('write ST A, [address]');
        byte = (5 << 4) | addrArg(args[1]);
      } else if (['JMP', 'JZ', 'JNZ', 'JC'].indexOf(mn) >= 0) {
        if (args.length !== 1) err(mn + ' needs exactly one address or label');
        byte = (({ JMP: 11, JZ: 12, JNZ: 13, JC: 14 })[mn] << 4) | addrArg(args[0]);
      } else {
        err('unknown instruction "' + (mn || it.text) + '"');
      }
      bytes[it.addr] = byte; lineOf[it.addr] = it.line;
    });
    errors.sort(function (a, b) { return a.line - b.line; });
    return { bytes: bytes, errors: errors, labels: labels, lineOf: lineOf, size: addr };
  }
  window.CPU = { OPS: OPS, SIGS: SIGS, SIG_DESC: SIG_DESC, FETCH: FETCH, EXEC: EXEC, ALU: ALU, alu: alu, dis: dis, create: create, tick: tick, step: step, run: run, assemble: assemble, h2: h2, b8: b8, condOk: condOk };
}

function simUI() {
  // CpuSim.mount(el, opts): RAM table + registers + flags + output + phase indicator + controls.
  // opts: bytes, labels {addr:name}, editable (RAM hex inputs), micro (show micro-step button + phase bar),
  //       speed (ms), title, note (HTML), onTick(sim, info), onReset(sim), compact
  var C = window.CPU;
  function mount(root, opts) {
    if (typeof root === 'string') root = document.querySelector(root);
    opts = opts || {};
    var init = (opts.bytes || []).slice();
    var sim = { s: C.create(init), info: null, timer: null, opts: opts, labels: opts.labels || {} };
    var micro = opts.micro !== false;
    root.innerHTML =
      '<div class="cs">' +
      (opts.title ? '<div class="cs-title">' + opts.title + '</div>' : '') +
      (opts.note ? '<div class="cs-note">' + opts.note + '</div>' : '') +
      '<div class="cs-bar">' +
      (micro ? '<button data-a="tick" title="One clock tick = one micro-step">⏭ Micro-step</button>' : '') +
      '<button data-a="step" title="Run every micro-step of the current instruction">⏩ Step instruction</button>' +
      '<button data-a="run">▶ Run</button>' +
      '<button data-a="reset" title="Reload RAM and clear registers">↺ Reset</button>' +
      '<label class="cs-speed">speed <input type="range" min="0" max="4" value="' + (opts.speedIdx == null ? 2 : opts.speedIdx) + '" data-a="speed"></label>' +
      '<span class="cs-count"></span></div>' +
      (micro ? '<div class="cs-phase"></div>' : '') +
      '<div class="cs-main"><div class="cs-ram"></div><div class="cs-side"></div></div>' +
      '</div>';
    var $ = function (sel) { return root.querySelector(sel); };
    var SPEEDS = [900, 450, 220, 90, 25];
    function speed() { return SPEEDS[+$('[data-a=speed]').value]; }
    function regCard(name, v, hint, bits, raw) {
      bits = bits || 8; if (raw == null) raw = v;
      return '<div class="cs-reg"><div class="cs-rn">' + name + '<span>' + hint + '</span></div><div class="cs-rv">' + v + '</div><div class="cs-rb">' +
        (raw & ((1 << bits) - 1)).toString(2).padStart(bits, '0') + '</div></div>';
    }
    function render() {
      var s = sim.s, info = sim.info, sigs = info ? info.sigs : [];
      var rows = '<table class="cs-tab"><tr><th></th><th>addr</th><th>label</th><th>hex</th><th>binary</th><th>as an instruction</th></tr>';
      for (var a = 0; a < 16; a++) {
        var v = s.mem[a];
        var cls = [];
        if (a === s.PC && !s.halted) cls.push('pc');
        if (info && a === s.MAR && (sigs.indexOf('RAM_OUT') >= 0 || sigs.indexOf('RAM_IN') >= 0)) cls.push(sigs.indexOf('RAM_IN') >= 0 ? 'wr' : 'rd');
        var lab = sim.labels[a] || '';
        var hex = opts.editable ? '<input class="cs-hex" data-addr="' + a + '" value="' + C.h2(v).slice(2) + '" maxlength="2" spellcheck="false" title="Type a new hex byte, then Enter">' : C.h2(v).slice(2);
        rows += '<tr class="' + cls.join(' ') + '"><td class="cs-ptr">' + (a === s.PC && !s.halted ? 'PC▶' : '') + '</td><td>' + a + '</td><td class="cs-lab">' + lab + '</td><td class="cs-h">' + hex + '</td><td class="cs-bin"><b>' +
          C.b8(v).slice(0, 4) + '</b> ' + C.b8(v).slice(4) + '</td><td class="cs-dis">' + C.dis(v) + (lab && opts.dataLabels && opts.dataLabels.indexOf(a) >= 0 ? ' <i>(data = ' + v + ')</i>' : '') + '</td></tr>';
      }
      $('.cs-ram').innerHTML = rows + '</table>';
      var fl = ['Z', 'N', 'C'].map(function (f) { return '<span class="cs-flag' + (s[f] ? ' on' : '') + '" title="' + ({ Z: 'Zero: last ALU result was 0', N: 'Negative: bit 7 of last ALU result', C: 'Carry: ADD overflowed past 255, or SUB borrowed (A < B)' })[f] + '">' + f + '=' + s[f] + '</span>'; }).join('');
      var lit = function (n) { return sigs.indexOf(n) >= 0 ? ' lit' : ''; };
      $('.cs-side').innerHTML =
        '<div class="cs-regs">' +
        '<div class="cs-wrap' + lit('PC_INC') + lit('PC_LOAD') + lit('PC_OUT') + '">' + regCard('PC', s.PC, 'program counter', 4) + '</div>' +
        '<div class="cs-wrap' + lit('IR_IN') + lit('IR_OUT') + '">' + regCard('IR', C.h2(s.IR), C.dis(s.IR), 8, s.IR) + '</div>' +
        '<div class="cs-wrap' + lit('MAR_IN') + '">' + regCard('MAR', s.MAR, 'memory address', 4) + '</div>' +
        '<div class="cs-wrap' + lit('A_IN') + lit('A_OUT') + '">' + regCard('A', s.A, 'register', 8) + '</div>' +
        '<div class="cs-wrap' + lit('B_IN') + '">' + regCard('B', s.B, 'register', 8) + '</div>' +
        '</div>' +
        '<div class="cs-flags' + lit('FLAGS_IN') + '"><b>Flags</b> ' + fl + '</div>' +
        '<div class="cs-out' + lit('OUT_IN') + '"><div class="cs-rn">OUT display</div><div class="cs-big">' + (s.out.length ? s.out[s.out.length - 1] : '—') + '</div><div class="cs-hist">history: ' + (s.out.join(', ') || 'none yet') + '</div></div>' +
        (micro ? '<div class="cs-sigs"><b>Control signals this tick:</b> ' + (sigs.length ? sigs.map(function (x) { return '<span class="cs-sig" title="' + C.SIG_DESC[x] + '">' + x + '</span>'; }).join('') : '<i>none</i>') +
          (info && info.bus != null ? '<div>bus = <b>' + info.bus + '</b> (' + C.h2(info.bus) + ')</div>' : '') + '</div>' : '') +
        (s.halted ? '<div class="cs-halt">⏹ HALTED. Press ↺ Reset to run again.</div>' : '');
      if (micro) {
        var t = s.t, next = t < 2 ? 'fetch' : t === 2 ? 'decode' : 'execute';
        var done = info ? info.phase : null;
        var ph = ['fetch', 'decode', 'execute'].map(function (p) {
          var c = 'cs-ph' + (done === p ? ' done' : '') + (!s.halted && next === p ? ' next' : '');
          return '<span class="' + c + '">' + ({ fetch: '① FETCH', decode: '② DECODE', execute: '③ EXECUTE' })[p] + '</span>';
        }).join('<span class="cs-arr">→</span>');
        $('.cs-phase').innerHTML = ph + '<span class="cs-what">' + (info ? 'last tick (T' + info.t + '): <b>' + info.text + '</b>' : 'Press ⏭ Micro-step to run one clock tick.') + '</span>';
      }
      $('.cs-count').textContent = 'clock ticks: ' + s.cycles + ' · instructions done: ' + s.instrs;
      $('[data-a=run]').textContent = sim.timer ? '⏸ Pause' : '▶ Run';
      if (opts.onRender) opts.onRender(sim);
    }
    function stop() { if (sim.timer) { clearInterval(sim.timer); sim.timer = null; } }
    function doTick() {
      var i = C.tick(sim.s); if (i) sim.info = i;
      if (opts.onTick) opts.onTick(sim, i);
      if (sim.s.halted) stop();
      render();
    }
    function doStep() {
      do { var i = C.tick(sim.s); if (i) sim.info = i; if (opts.onTick) opts.onTick(sim, i); } while (sim.s.t !== 0 && !sim.s.halted);
      if (sim.s.halted) stop();
      render();
    }
    sim.reset = function (bytes) { stop(); if (bytes) init = bytes.slice(); sim.s = C.create(init); sim.info = null; if (opts.onReset) opts.onReset(sim); render(); };
    sim.render = render; sim.stop = stop; sim.tick = doTick; sim.step = doStep;
    sim.bytes = function () { return init.slice(); };
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-a]'); if (!b) return;
      var a = b.dataset.a;
      if (a === 'tick') { stop(); doTick(); }
      else if (a === 'step') { stop(); doStep(); }
      else if (a === 'reset') sim.reset();
      else if (a === 'run') {
        if (sim.timer) { stop(); render(); return; }
        if (sim.s.halted) sim.reset();
        sim.timer = setInterval(function () { micro ? doTick() : doStep(); }, speed());
        render();
      }
    });
    root.addEventListener('input', function (e) {
      if (e.target.dataset.a === 'speed' && sim.timer) { stop(); sim.timer = setInterval(function () { micro ? doTick() : doStep(); }, speed()); }
    });
    root.addEventListener('change', function (e) {
      var inp = e.target.closest('.cs-hex'); if (!inp) return;
      var v = parseInt(inp.value, 16);
      if (isNaN(v) || v < 0 || v > 255) { inp.value = C.h2(sim.s.mem[+inp.dataset.addr]).slice(2); return; }
      var a = +inp.dataset.addr;
      sim.s.mem[a] = v; init[a] = v;
      if (opts.onEdit) opts.onEdit(sim, a, v);
      render();
    });
    render();
    return sim;
  }
  window.CpuSim = { mount: mount };
}

const CPU_SRC = '(' + cpuCore.toString() + ')();';
const SIM_SRC = '(' + simUI.toString() + ')();';
const CPU_CSS = `
body { margin: 0; }
.w { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2330; }
.w h4 { margin: 0 0 4px; font-size: 15px; }
.w .note, .cs-note { font-size: 13px; color: #475066; margin: 0 0 8px; }
.w .card { background: #fff; border: 1px solid #e2e5ee; border-radius: 10px; padding: 10px 12px; }
.w .row { display: flex; gap: 12px; flex-wrap: wrap; align-items: flex-start; }
.w button.pri { background: #2563eb; color: #fff; border-color: #2563eb; font-weight: 600; }
.w button.chk { background: #16a34a; color: #fff; border-color: #16a34a; font-weight: 600; }
.w .res { margin-top: 8px; padding: 7px 10px; border-radius: 8px; font-size: 13.5px; }
.w .res:empty { display: none; }
.w .res.ok { background: #dcfce7; color: #14532d; border: 1px solid #86efac; }
.w .res.bad { background: #fee2e2; color: #7f1d1d; border: 1px solid #fca5a5; }
.w code, .w .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; }
.w code { background: #f1f4f9; padding: 0 4px; border-radius: 4px; }
.cs { font: 13.5px/1.4 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2330; }
.cs-title { font-weight: 700; font-size: 15px; margin-bottom: 2px; }
.cs-bar { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 6px; }
.cs-bar button { margin: 0; font-size: 13px; padding: 3px 10px; }
.cs-speed { font-size: 12px; color: #646b80; margin-left: 6px; display: flex; align-items: center; gap: 4px; }
.cs-speed input { width: 90px; }
.cs-count { font-size: 12px; color: #646b80; margin-left: auto; }
.cs-phase { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; margin-bottom: 6px; padding: 6px 8px; background: #f8fafc; border: 1px solid #e2e5ee; border-radius: 8px; }
.cs-ph { padding: 2px 9px; border-radius: 12px; font-weight: 700; font-size: 12px; background: #eef0f5; color: #8a90a2; border: 2px solid transparent; }
.cs-ph.next { border-color: #2563eb; color: #1e40af; }
.cs-ph.done { background: #fde68a; color: #78350f; }
.cs-arr { color: #9aa3b5; }
.cs-what { font-size: 12.5px; color: #334155; margin-left: 8px; }
.cs-main { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
.cs-ram { flex: 0 1 auto; }
.cs-side { flex: 1 1 300px; display: flex; flex-direction: column; gap: 8px; }
.cs-tab { border-collapse: collapse; font: 12.5px ui-monospace, Menlo, monospace; background: #fff; border: 1px solid #e2e5ee; }
.cs-tab th { font: 600 11.5px system-ui, sans-serif; background: #f1f4f9; padding: 3px 7px; text-align: left; color: #475066; }
.cs-tab td { padding: 1px 7px; border-top: 1px solid #f0f2f6; white-space: nowrap; }
.cs-tab tr.pc td { background: #dbeafe; font-weight: 700; }
.cs-tab tr.rd td.cs-h, .cs-tab tr.rd td.cs-bin { background: #fef3c7; }
.cs-tab tr.wr td.cs-h, .cs-tab tr.wr td.cs-bin { background: #fecaca; }
.cs-tab tr.cur td.cs-dis { color: #1d4ed8; }
.cs-ptr { color: #1d4ed8; font-weight: 800; width: 30px; }
.cs-lab { color: #7c3aed; }
.cs-dis { color: #334155; }
.cs-dis i { color: #8a90a2; }
.cs-hex { width: 34px; font: 12.5px ui-monospace, Menlo, monospace; padding: 0 3px; margin: 0; border: 1px solid #c7d2fe; border-radius: 4px; background: #f5f7ff; }
.cs-regs { display: flex; flex-wrap: wrap; gap: 6px; }
.cs-wrap { border-radius: 9px; border: 2px solid transparent; }
.cs-wrap.lit { border-color: #f59e0b; box-shadow: 0 0 0 3px #fde68a; }
.cs-reg { background: #fff; border: 1px solid #e2e5ee; border-radius: 8px; padding: 4px 9px; min-width: 92px; }
.cs-rn { font-weight: 800; font-size: 13px; }
.cs-rn span { font-weight: 400; color: #8a90a2; font-size: 11px; margin-left: 5px; }
.cs-rv { font: 700 18px ui-monospace, Menlo, monospace; }
.cs-rb { font: 11px ui-monospace, Menlo, monospace; color: #64748b; }
.cs-flags { background: #fff; border: 1px solid #e2e5ee; border-radius: 8px; padding: 5px 9px; }
.cs-flags.lit, .cs-out.lit { border-color: #f59e0b; box-shadow: 0 0 0 3px #fde68a; }
.cs-flag { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 10px; background: #e5e7eb; color: #64748b; font: 700 12px ui-monospace, Menlo, monospace; }
.cs-flag.on { background: #16a34a; color: #fff; }
.cs-out { background: #0f172a; color: #e2e8f0; border-radius: 8px; padding: 6px 10px; border: 1px solid #0f172a; }
.cs-out .cs-rn { color: #94a3b8; }
.cs-big { font: 800 30px ui-monospace, Menlo, monospace; color: #4ade80; }
.cs-hist { font: 11.5px ui-monospace, Menlo, monospace; color: #94a3b8; word-break: break-all; }
.cs-sigs { font-size: 12.5px; background: #fff; border: 1px solid #e2e5ee; border-radius: 8px; padding: 5px 9px; }
.cs-sig { display: inline-block; margin: 2px 3px 0 0; padding: 0 7px; border-radius: 9px; background: #fde68a; color: #78350f; font: 700 11.5px ui-monospace, Menlo, monospace; }
.cs-halt { background: #fee2e2; color: #7f1d1d; border-radius: 8px; padding: 5px 9px; font-weight: 600; }
.asm { width: 100%; box-sizing: border-box; min-height: 300px; font: 13px/1.45 ui-monospace, Menlo, monospace; padding: 8px; border: 1px solid #c5c9d6; border-radius: 8px; resize: vertical; margin: 0; tab-size: 4; }
.errs { font: 12.5px ui-monospace, Menlo, monospace; color: #b91c1c; margin: 4px 0; }
.errs:empty { display: none; }
.okmsg { font-size: 12.5px; color: #15803d; margin: 4px 0; }
`;
const HEAD = '<style>' + CPU_CSS + '</style>';
const LIB = CPU_SRC + '\n' + SIM_SRC;

// ISA reference table (HTML) used in lesson text
const ISA = [
  ['0000', '0', 'HLT', '—', 'Stop the clock'],
  ['0001', '1', 'LDI A, n', 'number n', 'A ← n (n = 0…15)'],
  ['0010', '2', 'LDI B, n', 'number n', 'B ← n'],
  ['0011', '3', 'LD A, [a]', 'address a', 'A ← RAM[a]'],
  ['0100', '4', 'LD B, [a]', 'address a', 'B ← RAM[a]'],
  ['0101', '5', 'ST A, [a]', 'address a', 'RAM[a] ← A'],
  ['0110', '6', 'MOV B, A', '—', 'B ← A'],
  ['0111', '7', 'ADD', '—', 'A ← A + B, sets Z N C'],
  ['1000', '8', 'SUB', '—', 'A ← A − B, sets Z N C'],
  ['1001', '9', 'AND', '—', 'A ← A AND B, sets Z N (C=0)'],
  ['1010', 'A', 'OR', '—', 'A ← A OR B, sets Z N (C=0)'],
  ['1011', 'B', 'JMP a', 'address a', 'PC ← a'],
  ['1100', 'C', 'JZ a', 'address a', 'if Z = 1: PC ← a'],
  ['1101', 'D', 'JNZ a', 'address a', 'if Z = 0: PC ← a'],
  ['1110', 'E', 'JC a', 'address a', 'if C = 1: PC ← a'],
  ['1111', 'F', 'OUT', '—', 'output display ← A'],
];
const ISA_TABLE = '<table><tr><th>opcode (bits 7–4)</th><th>hex</th><th>assembly</th><th>operand (bits 3–0)</th><th>does</th></tr>' +
  ISA.map((r) => `<tr><td><code>${r[0]}</code></td><td><code>${r[1]}x</code></td><td><code>${r[2]}</code></td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('') + '</table>';


// program-counter exercise: starter and solution share the same board
const PC_EX = `<div id="c"></div>
<script>
function bits4(v) { return [v & 1, (v >> 1) & 1, (v >> 2) & 1, (v >> 3) & 1]; }
function val(a, o) { return a[o] + 2 * a[o + 1] + 4 * a[o + 2] + 8 * a[o + 3]; }
Circ.chip('INC4', { label: '+1', ins: ['A0', 'A1', 'A2', 'A3'], outs: ['Y0', 'Y1', 'Y2', 'Y3'], desc: 'Y = A + 1', fn: function (i) { return bits4((val(i, 0) + 1) & 15); } });
Circ.chip('MUX4', { label: 'MUX ×4', ins: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'S'], outs: ['Y0', 'Y1', 'Y2', 'Y3'], desc: '4-bit 2-to-1 MUX: S=0 → Y=A, S=1 → Y=B', fn: function (i) { return bits4(i[8] ? val(i, 4) : val(i, 0)); } });
Circ.chip('REG4', { label: 'PC REGISTER', ins: ['D0', 'D1', 'D2', 'D3', 'CLK'], outs: ['Q0', 'Q1', 'Q2', 'Q3'], stateful: true, clk: 4, desc: 'on rising CLK: Q ← D',
  fn: function (i, m) { if (i[4] && !m.p) m.q = val(i, 0); m.p = i[4]; return bits4(m.q | 0); } });
var parts = [
  { id: 'inc', type: 'INC4', x: 60, y: 40, fixed: true },
  { id: 'reg', type: 'REG4', x: 420, y: 90, fixed: true },
  { id: 'pc', type: 'NUMOUT', label: 'PC', x: 640, y: 100 },
  { id: 'tg', type: 'NUMIN', label: 'TARGET', x: 40, y: 200, value: 12 },
  { id: 'j', type: 'IN', label: 'JUMP', x: 80, y: 330 },
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 330, y: 320 },
];
var wires = [['clk', 'reg.CLK', { mx: 390 }]];
for (var k = 0; k < 4; k++) {
  wires.push(['reg.Q' + k, 'pc.' + k]);
  wires.push(['reg.Q' + k, 'inc.A' + k, { pts: [[540 + 10 * k, 130 + 20 * k], [540 + 10 * k, 30 - 8 * k], [40 - 8 * k, 30 - 8 * k], [40 - 8 * k, 70 + 20 * k]] }]);
}
/*SOLUTION*/
Circ.mount('#c', {
  title: 'Finish the program counter',
  intro: 'Add the MUX that chooses <b>PC + 1</b> (JUMP = 0) or <b>TARGET</b> (JUMP = 1).',
  build: { palette: ['MUX4'], best: 1 },
  parts: parts, wires: wires,
  test: [
    { set: { JUMP: 0, TARGET: 12 }, expect: { PC: 0 }, note: 'reset: PC = 0' },
    { pulse: 'CLK', expect: { PC: 1 }, note: 'count' },
    { pulse: 'CLK', expect: { PC: 2 }, note: 'count' },
    { pulse: 'CLK', expect: { PC: 3 }, note: 'count' },
    { set: { JUMP: 1 }, pulse: 'CLK', expect: { PC: 12 }, note: 'jump to 12' },
    { set: { JUMP: 0 }, pulse: 'CLK', expect: { PC: 13 }, note: 'count from 12' },
    { pulse: 'CLK', expect: { PC: 14 } },
    { pulse: 'CLK', expect: { PC: 15 } },
    { pulse: 'CLK', expect: { PC: 0 }, note: 'wrap 15 → 0' },
    { set: { JUMP: 1, TARGET: 5 }, pulse: 'CLK', expect: { PC: 5 }, note: 'jump to 5' },
    { pulse: 'CLK', expect: { PC: 5 }, note: 'JUMP held: stays at 5' },
  ],
});
<\/script>`;
const PC_EX_SOL = PC_EX.replace('/*SOLUTION*/', `parts.push({ id: 'mux', type: 'MUX4', x: 220, y: 40 });
wires.push(['j', 'mux.S', { mx: 170 }]);
for (var k2 = 0; k2 < 4; k2++) {
  wires.push(['inc.Y' + k2, 'mux.A' + k2]);
  wires.push(['tg.' + k2, 'mux.B' + k2, { mx: 180 - 6 * k2 }]);
  wires.push(['mux.Y' + k2, 'reg.D' + k2]);
}`);

// instructions exercise: hand-encoding; starter = empty boxes, solution = filled
const ENC_EX = (vals) => `${HEAD}
<div class="w">
  <h4>Hand-assemble these instructions</h4>
  <p class="note">Type each instruction's byte in hex (like <code>3E</code> or <code>0x3E</code>), then click <b>✔ Check</b>. The opcode table is below for reference.</p>
  <table id="t" style="border-collapse:collapse"></table>
  <div style="margin-top:8px"><button id="chk" class="chk">✔ Check</button></div>
  <div id="res" class="res"></div>
  <details style="margin-top:8px"><summary style="cursor:pointer;font-weight:600">Opcode table</summary><div id="ops" class="mono" style="columns:2;font-size:12px;margin-top:4px"></div></details>
</div>
<script>
${LIB}
var Q = ['LDI A, 9', 'LD B, [14]', 'SUB', 'JNZ 3', 'ST A, [12]'];
var V = ${JSON.stringify(vals)};
var t = '<tr><th style="text-align:left;padding:3px 8px">assembly</th><th style="padding:3px 8px">your byte (hex)</th><th style="padding:3px 8px">bits of your answer</th><th></th></tr>';
Q.forEach(function (q, i) {
  t += '<tr><td class="mono" style="padding:3px 8px"><b>' + q + '</b></td><td style="padding:3px 8px"><input id="i' + i + '" class="mono" style="width:70px" value="' + (V[i] || '') + '" placeholder="??"></td><td class="mono" id="b' + i + '" style="padding:3px 8px;color:#64748b"></td><td id="m' + i + '"></td></tr>';
});
document.getElementById('t').innerHTML = t;
document.getElementById('ops').innerHTML = CPU.OPS.map(function (o, i) { return '<div>' + i.toString(2).padStart(4, '0') + ' (' + i.toString(16).toUpperCase() + ') ' + o.m + (o.arg === 'n' ? ', n' : o.arg === 'a' ? (/^(LD|ST)/.test(o.m) ? ', [a]' : ' a') : '') + '</div>'; }).join('');
function parse(s) { s = String(s).trim().replace(/^0x/i, ''); if (!/^[0-9a-f]{1,2}$/i.test(s)) return NaN; return parseInt(s, 16); }
function show() {
  Q.forEach(function (q, i) {
    var v = parse(document.getElementById('i' + i).value);
    document.getElementById('b' + i).innerHTML = isNaN(v) ? '' : '<b style="color:#c2410c">' + CPU.b8(v).slice(0, 4) + '</b> <b style="color:#1d4ed8">' + CPU.b8(v).slice(4) + '</b> = ' + CPU.dis(v);
  });
}
document.getElementById('t').addEventListener('input', show);
document.getElementById('chk').onclick = function () {
  var ok = 0;
  Q.forEach(function (q, i) {
    var want = CPU.assemble(q).bytes[0], v = parse(document.getElementById('i' + i).value);
    var good = v === want;
    if (good) ok++;
    document.getElementById('m' + i).innerHTML = good ? '✅' : '❌ ' + (isNaN(v) ? 'not a hex byte' : 'that byte means <code>' + CPU.dis(v) + '</code>');
  });
  var r = document.getElementById('res');
  if (ok === Q.length) { r.className = 'res ok'; r.innerHTML = '✅ All 5 correct. You just did what an assembler does.'; console.log('✅ All 5 instructions encoded correctly'); }
  else { r.className = 'res bad'; r.innerHTML = '❌ ' + ok + ' of 5 correct. Opcode goes in the high nibble, operand in the low nibble.'; console.log('❌ ' + ok + '/5 correct'); }
};
show();
<\/script>`;

// datapath exercise: choose bus driver + loaders per micro-step
const DP_EX = (sol) => `${HEAD}
<div class="w">
  <h4>Route the data: write the execute micro-steps</h4>
  <p class="note">Fetch and decode are done: the instruction sits in IR and the PC already points to the next one. For each execute step <b>T3</b> and <b>T4</b>, pick <b>one</b> part that drives the bus and tick the parts that load from it. Leave a step empty if it isn't needed. Then click <b>✔ Check</b>, which runs your steps on the datapath.</p>
  <div id="tasks"></div>
  <button id="chk" class="chk">✔ Check</button>
  <div id="res" class="res"></div>
</div>
<script>
${LIB}
var DRV = ['none', 'PC', 'RAM[MAR]', 'IR operand', 'A', 'ALU (A+B)'];
var LD = ['MAR', 'IR', 'A', 'B', 'RAM[MAR]', 'OUT', 'PC'];
var TASKS = [
  { asm: 'LD B, [13]', goal: 'B must end up holding RAM[13] (= 42).' },
  { asm: 'ST A, [12]', goal: 'RAM[12] must end up holding A (= 7).' },
  { asm: 'OUT', goal: 'The OUT display must show A (= 7).' },
];
var SOL = ${JSON.stringify(sol)};
var h = '';
TASKS.forEach(function (t, i) {
  h += '<div class="card" style="margin-bottom:8px"><b>Task ' + (i + 1) + ': <code>' + t.asm + '</code></b> <span style="color:#475066;font-size:13px">' + t.goal + '</span> <span id="m' + i + '"></span>';
  h += '<table style="border-collapse:collapse;margin-top:4px;font-size:13px"><tr><th style="padding:2px 6px">step</th><th style="padding:2px 6px">drives the bus</th><th style="padding:2px 6px;text-align:left">loads from the bus</th></tr>';
  [0, 1].forEach(function (k) {
    var pre = SOL[i] ? SOL[i][k] : null;
    h += '<tr><td style="padding:2px 6px"><b>T' + (k + 3) + '</b></td><td style="padding:2px 6px"><select id="d' + i + k + '">' + DRV.map(function (d) { return '<option' + (pre && pre[0] === d ? ' selected' : '') + '>' + d + '</option>'; }).join('') + '</select></td><td style="padding:2px 6px">' +
      LD.map(function (l) { return '<label style="margin-right:8px;white-space:nowrap"><input type="checkbox" data-l="' + l + '" id="l' + i + k + l + '"' + (pre && pre[1].indexOf(l) >= 0 ? ' checked' : '') + '> ' + l + '</label>'; }).join('') + '</td></tr>';
  });
  h += '</table></div>';
});
document.getElementById('tasks').innerHTML = h;
function runTask(i) {
  var s = CPU.create([]);
  s.mem[3] = CPU.assemble(TASKS[i].asm).bytes[0]; s.mem[13] = 42; s.A = 7; s.B = 0; s.PC = 4; s.IR = s.mem[3]; s.MAR = 3;
  var before = JSON.stringify(s), log = [], err = null;
  [0, 1].forEach(function (k) {
    if (err) return;
    var d = document.getElementById('d' + i + k).value;
    var loads = LD.filter(function (l) { return document.getElementById('l' + i + k + l).checked; });
    if (d === 'none' && loads.length) { err = 'T' + (k + 3) + ': ' + loads.join(', ') + ' would load from a bus that nothing drives (floating wires = garbage).'; return; }
    if (d === 'none') return;
    var bus = d === 'PC' ? s.PC : d === 'RAM[MAR]' ? s.mem[s.MAR] : d === 'IR operand' ? s.IR & 15 : d === 'A' ? s.A : (s.A + s.B) & 255;
    loads.forEach(function (l) {
      if (l === 'MAR') s.MAR = bus & 15; else if (l === 'IR') s.IR = bus; else if (l === 'A') s.A = bus; else if (l === 'B') s.B = bus;
      else if (l === 'RAM[MAR]') s.mem[s.MAR] = bus; else if (l === 'OUT') s.out.push(bus); else if (l === 'PC') s.PC = bus & 15;
    });
    log.push('T' + (k + 3) + ': bus = ' + bus + ' (from ' + d + ')' + (loads.length ? ' → ' + loads.join(', ') : ''));
  });
  if (err) return { ok: false, msg: err };
  var b = JSON.parse(before), problems = [];
  var want = i === 0 ? { B: 42 } : i === 1 ? { mem12: 7 } : { out: 7 };
  if (i === 0 && s.B !== 42) problems.push('B = ' + s.B + ', expected 42');
  if (i === 1 && s.mem[12] !== 7) problems.push('RAM[12] = ' + s.mem[12] + ', expected 7');
  if (i === 2 && !(s.out.length === 1 && s.out[0] === 7)) problems.push('OUT shows ' + (s.out.join(',') || 'nothing') + ', expected 7');
  if (i !== 0 && s.B !== b.B) problems.push('B was changed');
  if (s.A !== b.A) problems.push('A was changed to ' + s.A);
  if (s.PC !== b.PC) problems.push('PC was changed to ' + s.PC + ' (the program would jump!)');
  if (s.IR !== b.IR) problems.push('IR was overwritten');
  if (i !== 2 && s.out.length) problems.push('OUT was changed');
  s.mem.forEach(function (v, a) { if (!(i === 1 && a === 12) && v !== b.mem[a]) problems.push('RAM[' + a + '] was overwritten'); });
  return { ok: !problems.length, msg: (problems.join('; ') || 'correct') + (log.length ? ' <span style="color:#64748b">[' + log.join(' · ') + ']</span>' : '') };
}
document.getElementById('chk').onclick = function () {
  var n = 0;
  TASKS.forEach(function (t, i) { var r = runTask(i); if (r.ok) n++; document.getElementById('m' + i).innerHTML = (r.ok ? ' ✅ ' : ' ❌ ') + '<span style="font-size:12.5px">' + r.msg + '</span>'; });
  var res = document.getElementById('res');
  if (n === 3) { res.className = 'res ok'; res.innerHTML = '✅ All 3 instructions route correctly. You just wrote microcode!'; console.log('✅ All 3 micro-step programs work'); }
  else { res.className = 'res bad'; res.innerHTML = '❌ ' + n + ' of 3 tasks correct. Hint: RAM always reads or writes the address held in MAR.'; console.log('❌ ' + n + '/3 tasks correct'); }
};
<\/script>`;

// fetch-decode-execute: shared program + exercise widget
const ADD_PROG = [0x3E, 0x4F, 0x70, 0x5D, 0xF0, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 7, 5];
const ADD_LABELS = { 13: 'sum', 14: 'x', 15: 'y' };
const FDE_EX = (bytes) => `${HEAD}
<div class="w">
  <div id="sim"></div>
  <div style="margin-top:8px"><button id="chk" class="chk">✔ Check</button> <span style="font-size:12.5px;color:#64748b">Check reloads your RAM into a fresh CPU, runs it to HLT and inspects what happened.</span></div>
  <div id="res" class="res"></div>
</div>
<script>
${LIB}
var sim = CpuSim.mount('#sim', { bytes: ${JSON.stringify(bytes)}, labels: ${JSON.stringify(ADD_LABELS)}, dataLabels: [13, 14, 15], editable: true,
  title: 'Patch the program: make it output 9 − 4',
  note: 'Click a <b>hex</b> cell, type a new byte (e.g. <code>80</code>) and press Enter or Tab. Then Run to test, and ✔ Check.' });
document.getElementById('chk').onclick = function () {
  var s = CPU.create(sim.bytes()), sawSub = false, n = 0;
  while (!s.halted && n < 300) {
    var op = s.mem[s.PC] >> 4;
    if (op === 8 && s.A === 9 && s.B === 4) sawSub = true;
    CPU.step(s); n++;
  }
  var r = document.getElementById('res'), msg = [];
  if (!s.halted) msg.push('the program never reached HLT');
  if (s.out.indexOf(5) < 0) msg.push('OUT never showed 5 (it showed: ' + (s.out.join(', ') || 'nothing') + ')');
  if (!sawSub) msg.push('no SUB ran with A = 9 and B = 4. Change the data bytes x and y, and the ADD byte');
  if (!msg.length) { r.className = 'res ok'; r.innerHTML = '✅ Output ' + s.out.join(', ') + ' after ' + s.cycles + ' clock ticks. You reprogrammed a CPU by editing raw machine code!'; console.log('✅ Program computes 9 - 4 = 5'); }
  else { r.className = 'res bad'; r.innerHTML = '❌ ' + msg.join('; ') + '.'; console.log('❌ ' + msg.join('; ')); }
};
<\/script>`;

// jumps-loops: C-code-beside-assembly widget (o = {title, note, src (assembly), c: [C lines], map: [addr→C line], labels})
const LOOP_W = (o) => `${HEAD}
<style>
.cpanel { font: 13px/1.6 ui-monospace, Menlo, monospace; background: #0f172a; color: #cbd5e1; border-radius: 8px; padding: 6px 0; white-space: pre; min-width: 270px; }
.cpanel div { padding: 0 12px; }
.cpanel div.cur { background: #1e3a8a; color: #fff; font-weight: 700; }
.apanel { font: 12.5px/1.6 ui-monospace, Menlo, monospace; background: #fff; border: 1px solid #e2e5ee; border-radius: 8px; padding: 6px 0; white-space: pre; }
.apanel div { padding: 0 10px; }
.apanel div.cur { background: #dbeafe; font-weight: 700; }
.apanel span.c { color: #94a3b8; }
.jmp { font-size: 13px; margin-top: 6px; min-height: 20px; }
</style>
<div class="w">
  <h4>${o.title}</h4>
  <p class="note">${o.note}</p>
  <div class="row" style="margin-bottom:8px">
    <div><div style="font-size:12px;font-weight:700;color:#475066">C source</div><div class="cpanel" id="cp"></div></div>
    <div><div style="font-size:12px;font-weight:700;color:#475066">TINY-8 assembly (what a compiler would emit)</div><div class="apanel" id="ap"></div></div>
    <div class="card" style="flex:1 1 160px"><b>Loop stats</b><div id="stats" style="font-size:13px"></div><div class="jmp" id="jm"></div></div>
  </div>
  <div id="sim"></div>
</div>
<script>
${LIB}
var SRC = ${JSON.stringify(o.src)};
var CL = ${JSON.stringify(o.c)}, MAP = ${JSON.stringify(o.map)};
var asm = CPU.assemble(SRC);
var lines = SRC.split('\\n');
var lab = {}; Object.keys(asm.labels).forEach(function (k) { lab[asm.labels[k]] = k; });
var jumps = 0, taken = 0, lastMsg = '';
function draw(sim) {
  var pc = sim.s.halted ? -1 : sim.s.PC;
  document.getElementById('cp').innerHTML = CL.map(function (l, i) { return '<div class="' + (pc >= 0 && MAP[pc] === i ? 'cur' : '') + '">' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</div>'; }).join('');
  document.getElementById('ap').innerHTML = lines.map(function (l, i) {
    var a = asm.lineOf.indexOf(i + 1);
    var parts = l.split(';');
    return '<div class="' + (a >= 0 && a === pc ? 'cur' : '') + '">' + (a >= 0 ? String(a).padStart(2) + '  ' : '    ') + parts[0].replace(/</g, '&lt;') + (parts[1] ? '<span class="c">;' + parts.slice(1).join(';') + '</span>' : '') + '</div>';
  }).join('');
  document.getElementById('stats').innerHTML = 'conditional jumps run: <b>' + jumps + '</b><br>taken: <b>' + taken + '</b> · not taken: <b>' + (jumps - taken) + '</b><br>OUT: <b>' + (sim.s.out.join(', ') || '—') + '</b>';
  document.getElementById('jm').innerHTML = lastMsg;
}
var sim = CpuSim.mount('#sim', { bytes: asm.bytes, labels: lab, dataLabels: ${JSON.stringify(o.data || [])}, editable: true, micro: false, speedIdx: 1,
  onTick: function (sim, info) {
    if (info && info.phase === 'execute') {
      var op = sim.s.IR >> 4;
      if (op >= 12 && op <= 14) { jumps++; if (!info.blocked) taken++; lastMsg = '<b>' + CPU.dis(sim.s.IR) + '</b>: ' + (info.blocked ? '<span style="color:#b91c1c">condition false → fall through</span>' : '<span style="color:#15803d">condition true → jump taken</span>') + ' (Z=' + sim.s.Z + ', C=' + sim.s.C + ')'; }
      else if (op === 11) lastMsg = '<b>' + CPU.dis(sim.s.IR) + '</b>: unconditional jump back';
    }
  },
  onReset: function () { jumps = 0; taken = 0; lastMsg = ''; },
  onRender: draw });
<\/script>`;

const JMP_EX = (p1, p2a, p2b) => `${HEAD}
<div class="w">
  <h4>Fill in the jumps</h4>
  <p class="note">Both programs must print <b>5, 4, 3, 2, 1</b> and then reach <b>HLT</b>. Choose the jump instruction and target address for each blank, then click <b>✔ Check</b>.</p>
  <div class="row">
    <div class="card"><b>Program 1</b>: one conditional jump at the bottom
      <table class="mono" id="t1" style="border-collapse:collapse;margin-top:4px"></table><div id="r1" style="font-size:13px;margin-top:4px"></div></div>
    <div class="card"><b>Program 2</b>: exit test + jump back
      <table class="mono" id="t2" style="border-collapse:collapse;margin-top:4px"></table><div id="r2" style="font-size:13px;margin-top:4px"></div></div>
  </div>
  <div style="margin-top:8px"><button id="chk" class="chk">✔ Check</button></div>
  <div id="res" class="res"></div>
</div>
<script>
${LIB}
var P1 = ['LDI A, 5', 'LDI B, 1', 'OUT', 'SUB', null, 'HLT'];
var P2 = ['LDI A, 5', 'LDI B, 1', 'OUT', 'SUB', null, null, 'HLT'];
var INIT = { 1: [${JSON.stringify(p1)}], 2: [${JSON.stringify(p2a)}, ${JSON.stringify(p2b)}] };
function sel(id, v, max) {
  return '<select id="' + id + 'o">' + ['JMP', 'JZ', 'JNZ', 'JC'].map(function (o) { return '<option' + (v[0] === o ? ' selected' : '') + '>' + o + '</option>'; }).join('') + '</select> <select id="' + id + 't">' +
    Array.from({ length: max }, function (_, i) { return '<option' + (v[1] === i ? ' selected' : '') + '>' + i + '</option>'; }).join('') + '</select>';
}
function render(n, P) {
  var k = 0, h = '';
  P.forEach(function (l, a) { h += '<tr><td style="padding:2px 8px;color:#64748b">' + a + '</td><td style="padding:2px 8px">' + (l || sel('p' + n + '_' + a, INIT[n][k++], P.length)) + '</td></tr>'; });
  document.getElementById('t' + n).innerHTML = h;
}
render(1, P1); render(2, P2);
function build(n, P) { return P.map(function (l, a) { return l || document.getElementById('p' + n + '_' + a + 'o').value + ' ' + document.getElementById('p' + n + '_' + a + 't').value; }).join('\\n'); }
function test(n, P) {
  var s = CPU.create(CPU.assemble(build(n, P)).bytes), k = 0;
  while (!s.halted && k < 300 && s.out.length < 12) { CPU.step(s); k++; }
  var ok = s.halted && s.out.join(',') === '5,4,3,2,1';
  document.getElementById('r' + n).innerHTML = (ok ? '✅ ' : '❌ ') + 'printed: ' + (s.out.join(', ') || 'nothing') + (s.out.length >= 12 ? ', …' : '') + (s.halted ? ' then halted' : ' and never halted (infinite loop?)');
  return ok;
}
document.getElementById('chk').onclick = function () {
  var a = test(1, P1), b = test(2, P2), r = document.getElementById('res');
  if (a && b) { r.className = 'res ok'; r.innerHTML = '✅ Both loops work. Bottom-tested (do-while) and top-exit (while) loops are the two shapes every compiler emits.'; console.log('✅ Both countdown loops print 5,4,3,2,1 and halt'); }
  else { r.className = 'res bad'; r.innerHTML = '❌ ' + ((a ? 1 : 0) + (b ? 1 : 0)) + ' of 2 programs correct. SUB sets Z = 1 exactly when A reaches 0.'; console.log('❌ not yet'); }
};
<\/script>`;

// assembly: assembler + simulator widget. o = { title, note, src, presets (bool), check (bool) }
const ASM_PRESETS = {
  'add x + y': '; add two numbers from RAM\n        LD A, [x]\n        LD B, [y]\n        ADD\n        ST A, [sum]\n        OUT\n        HLT\nx:      DB 7\ny:      DB 5\nsum:    DB 0',
  'countdown 5..1': '; do-while countdown\n        LDI A, 5\n        LDI B, 1\nloop:   OUT\n        SUB           ; A = A - 1, sets Z\n        JNZ loop      ; repeat until A == 0\n        HLT',
  'multiply 6 x 7': '; res = x * cnt by repeated addition\nloop:   LD A, [res]\n        LD B, [x]\n        ADD\n        ST A, [res]\n        LD A, [cnt]\n        LDI B, 1\n        SUB\n        ST A, [cnt]\n        JNZ loop\n        LD A, [res]\n        OUT\n        HLT\nx:      DB 6\ncnt:    DB 7\nres:    DB 0',
  'fibonacci': '; print Fibonacci numbers until the sum overflows 8 bits\nloop:   LD A, [x]\n        OUT\n        LD B, [y]\n        ADD           ; A = x + y\n        JC done       ; carry: result > 255\n        ST A, [x]     ; x = x + y\n        MOV B, A\n        LD A, [y]\n        OUT\n        ADD           ; A = y + x\n        JC done\n        ST A, [y]     ; y = y + x\n        JMP loop\ndone:   HLT\nx:      DB 0\ny:      DB 1',
  'errors demo': '; this program has mistakes. Click Assemble to see them\n        LDI A, 20     ; too big for 4 bits\n        LD B, [nowhere]\n        ST B, [3]\n        MUL\n        JMP loop',
};
const ASM_W = (o) => `${HEAD}
<div class="w">
  <h4>${o.title}</h4>
  <p class="note">${o.note}</p>
  <div class="row" style="align-items:stretch">
    <div style="flex:0 0 380px;display:flex;flex-direction:column">
      <textarea id="src" class="asm" spellcheck="false" style="flex:1">${o.src.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>
      <div style="margin-top:6px">
        <button id="as" class="pri">⚙ Assemble &amp; load</button>
        ${o.check ? '<button id="chk" class="chk">✔ Check</button>' : ''}
        ${o.presets ? '<select id="pre"><option value="">load example…</option>' + Object.keys(ASM_PRESETS).map((k) => '<option>' + k + '</option>').join('') + '</select>' : ''}
      </div>
      <div id="errs" class="errs"></div><div id="okm" class="okmsg"></div>
      ${o.check ? '<div id="res" class="res"></div>' : ''}
    </div>
    <div style="flex:1 1 380px;font-size:12.5px;color:#475066" class="card">
      <b>Cheat sheet</b> (one byte each; n = 0–15, a = address 0–15 or a label)
      <div class="mono" style="columns:2;margin-top:4px;line-height:1.6">LDI A, n<br>LDI B, n<br>LD A, [a]<br>LD B, [a]<br>ST A, [a]<br>MOV B, A<br>ADD &nbsp;(A=A+B)<br>SUB &nbsp;(A=A−B)<br>AND / OR<br>JMP a<br>JZ a / JNZ a<br>JC a<br>OUT<br>HLT<br>DB value (data)</div>
      <div style="margin-top:4px"><code>label:</code> names the address of the next byte · <code>;</code> starts a comment · only ALU ops set flags · 16 bytes total</div>
    </div>
  </div>
  <div id="sim" style="margin-top:8px"></div>
</div>
<script>
${LIB}
var sim = CpuSim.mount('#sim', { bytes: [], micro: true, speedIdx: 3 });
var last = null;
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function asmNow() {
  var r = CPU.assemble(document.getElementById('src').value);
  last = r;
  var e = document.getElementById('errs'), ok = document.getElementById('okm');
  if (r.errors.length) { e.innerHTML = r.errors.map(function (x) { return '✖ line ' + x.line + ': ' + esc(x.msg); }).join('<br>'); ok.textContent = ''; return null; }
  e.innerHTML = '';
  ok.textContent = '✔ assembled ' + r.size + ' byte' + (r.size === 1 ? '' : 's') + ' (' + (16 - r.size) + ' free). Loaded into RAM. Press ▶ Run.';
  var lab = {}; Object.keys(r.labels).forEach(function (k) { lab[r.labels[k]] = k; });
  sim.labels = lab;
  sim.reset(r.bytes);
  return r;
}
document.getElementById('as').onclick = asmNow;
var pre = document.getElementById('pre');
if (pre) pre.onchange = function () { if (!pre.value) return; document.getElementById('src').value = ASM_PRESETS_[pre.value]; pre.value = ''; asmNow(); };
var ASM_PRESETS_ = ${JSON.stringify(ASM_PRESETS)};
document.getElementById('src').addEventListener('keydown', function (e) {
  if (e.key === 'Tab') { e.preventDefault(); var t = e.target, a = t.selectionStart; t.value = t.value.slice(0, a) + '    ' + t.value.slice(t.selectionEnd); t.selectionStart = t.selectionEnd = a + 4; }
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) asmNow();
});
asmNow();
${o.check ? `
document.getElementById('chk').onclick = function () {
  var res = document.getElementById('res');
  var r = asmNow();
  if (!r) { res.className = 'res bad'; res.innerHTML = '❌ Fix the assembler errors first.'; console.log('❌ assembler errors'); return; }
  if (r.labels.n === undefined) { res.className = 'res bad'; res.innerHTML = '❌ Keep the label <code>n:</code> on the data byte that holds N; the checker writes different N values there.'; console.log('❌ no label n'); return; }
  var tests = [1, 4, 5, 10, 22], rows = [], pass = 0;
  tests.forEach(function (N) {
    var b = r.bytes.slice(); b[r.labels.n] = N;
    var s = CPU.create(b), k = 0;
    while (!s.halted && k < 6000) { CPU.step(s); k++; }
    var want = N * (N + 1) / 2, got = s.out.length ? s.out[s.out.length - 1] : null;
    var ok = s.halted && got === want;
    if (ok) pass++;
    rows.push('<tr><td>N = ' + N + '</td><td>want ' + want + '</td><td>' + (got === null ? 'no OUT' : 'got ' + got) + (s.halted ? '' : ' (never halted)') + '</td><td>' + (ok ? '✅' : '❌') + '</td><td style="color:#64748b">' + s.cycles + ' ticks</td></tr>');
  });
  res.className = 'res ' + (pass === tests.length ? 'ok' : 'bad');
  res.innerHTML = (pass === tests.length ? '✅ All ' + tests.length + ' tests pass. Your program computes 1 + 2 + … + N!' : '❌ ' + pass + ' of ' + tests.length + ' tests pass.') + '<table style="border-collapse:collapse;margin-top:4px;font:12px ui-monospace,monospace">' + rows.join('') + '</table>';
  console.log(pass === tests.length ? '✅ sum 1..N correct for N = ' + tests.join(', ') : '❌ ' + pass + '/' + tests.length + ' tests pass');
};` : ''}
<\/script>`;

const SUM_STARTER = `; Compute 1 + 2 + ... + N and OUT the result.
; N is the data byte at label n. The checker tries
; N = 1, 4, 5, 10, 22 by overwriting that byte.
;
; Plan:  sum = sum + n ;  n = n - 1 ;  repeat while n != 0

loop:   ; TODO: sum = sum + n   (LD A, LD B, ADD, ST A)

        ; TODO: n = n - 1       (LD A, LDI B, SUB, ST A)

        ; TODO: jump back to loop while n != 0

        LD A, [sum]
        OUT
        HLT

n:      DB 5
sum:    DB 0`;
const SUM_SOLUTION = `; Compute 1 + 2 + ... + N and OUT the result.
loop:   LD A, [sum]     ; sum = sum + n
        LD B, [n]
        ADD
        ST A, [sum]
        LD A, [n]       ; n = n - 1
        LDI B, 1
        SUB             ; sets Z when n reaches 0
        ST A, [n]
        JNZ loop        ; repeat while n != 0
        LD A, [sum]
        OUT
        HLT

n:      DB 5
sum:    DB 0`;

// real-cpus: 5-stage pipeline scheduler, shared by the pipeline widget and the reorder exercise
function pipeCore() {
  // instr: { t: text, d: dest reg or null, s: [source regs], load: bool }
  // returns { rows: [{ IF:[a,b], ID:[a,b], EX, MEM, WB, stalls }], cycles, stalls }
  function sched(ins, opt) {
    var rows = [], total = 0, stalls = 0;
    ins.forEach(function (x, i) {
      var r = {};
      if (!opt.pipe) {
        var st = i * 5 + 1;
        r = { IF: [st, st], ID: [st + 1, st + 1], EX: st + 2, MEM: st + 3, WB: st + 4, stalls: 0 };
      } else {
        var p = rows[i - 1];
        var ifs = i ? p.ID[0] : 1;
        var ids = Math.max(ifs + 1, i ? p.EX : 0);
        var ex = Math.max(ids + 1, i ? p.EX + 1 : 0);
        if (opt.haz) x.s.forEach(function (reg) {
          for (var j = i - 1; j >= 0; j--) if (ins[j].d === reg) { ex = Math.max(ex, rows[j].EX + (opt.fwd ? (ins[j].load ? 2 : 1) : 3)); break; }
        });
        r = { IF: [ifs, ids - 1], ID: [ids, ex - 1], EX: ex, MEM: ex + 1, WB: ex + 2 };
        r.stalls = (ids - ifs - 1) + (ex - ids - 1);
      }
      stalls += r.stalls; total = Math.max(total, r.WB); rows.push(r);
    });
    // lost cycles compared with a perfectly full pipeline (one bubble delays everything behind it, so count it once)
    return { rows: rows, cycles: total, stalls: opt.pipe ? total - (ins.length + 4) : 0 };
  }
  function parse(t) {
    var m = /^(\w+)\s+(x\d+),\s*(.*)$/.exec(t), op = m[1], d = m[2], rest = m[3];
    var src = (rest.match(/x\d+/g) || []).filter(function (r) { return r !== 'x0'; });
    return { t: t, d: d, s: src, load: op === 'lw' };
  }
  function grid(ins, res, cur) {
    var C = { IF: '#bfdbfe', ID: '#c7d2fe', EX: '#fde68a', MEM: '#fecaca', WB: '#bbf7d0' };
    var n = res.cycles, h = '<table style="border-collapse:collapse;font:12px ui-monospace,Menlo,monospace"><tr><th style="text-align:left;padding:2px 6px">instruction</th>';
    for (var c = 1; c <= n; c++) h += '<th style="width:30px;padding:2px 0;' + (c === cur ? 'background:#fde047' : '') + '">' + c + '</th>';
    h += '</tr>';
    ins.forEach(function (x, i) {
      var r = res.rows[i];
      h += '<tr><td style="padding:2px 6px;white-space:nowrap">' + x.t + '</td>';
      for (var c = 1; c <= n; c++) {
        var st = '', stall = false;
        if (c >= r.IF[0] && c <= r.IF[1]) { st = 'IF'; stall = c > r.IF[0]; }
        else if (c >= r.ID[0] && c <= r.ID[1]) { st = 'ID'; stall = c > r.ID[0]; }
        else if (c === r.EX) st = 'EX'; else if (c === r.MEM) st = 'MEM'; else if (c === r.WB) st = 'WB';
        var bg = stall ? 'repeating-linear-gradient(45deg,#e5e7eb,#e5e7eb 4px,#f8fafc 4px,#f8fafc 8px)' : st ? C[st] : '';
        h += '<td title="' + (stall ? 'stall (bubble): waiting for a result' : st) + '" style="text-align:center;padding:3px 0;border:1px solid #fff;background:' + bg + ';' + (c === cur ? 'outline:2px solid #ca8a04;' : '') + (c > cur ? 'opacity:.35;' : '') + 'font-size:10.5px;font-weight:700;color:#334155">' + (stall ? '⏸' : st) + '</td>';
      }
      h += '</tr>';
    });
    return h + '</table>';
  }
  window.PIPE = { sched: sched, parse: parse, grid: grid };
}
const PIPE_SRC = '(' + pipeCore.toString() + ')();';

const PIPE_EX = (order) => `${HEAD}
<div class="w">
  <h4>Reorder to remove the stalls</h4>
  <p class="note">5-stage pipeline <b>with forwarding</b>. A <code>lw</code> result is only ready after MEM, so an instruction that uses it right away must wait 1 cycle (⏸). Move instructions with ↑ ↓ so that there are <b>0 stalls</b>, without breaking any dependency (an instruction must still come after the one that produces its inputs). Then click <b>✔ Check</b>.</p>
  <div class="row">
    <div class="card"><div id="list"></div></div>
    <div class="card" style="flex:1 1 420px;overflow-x:auto"><div id="stat" style="margin-bottom:6px"></div><div id="g"></div></div>
  </div>
  <button id="chk" class="chk" style="margin-top:8px">✔ Check</button>
  <div id="res" class="res"></div>
</div>
<script>
${PIPE_SRC}
var BASE = ['lw   x1, 0(x10)', 'add  x2, x1, x1', 'lw   x3, 4(x10)', 'add  x4, x3, x3', 'add  x5, x2, x4'].map(function (t) { return PIPE.parse(t.replace(/\\s+/, ' ')); });
var NAMES = ['A', 'B', 'C', 'D', 'E'];
var order = ${JSON.stringify(order)};
function cur() { return order.map(function (k) { return BASE[k]; }); }
function valid() {
  var seen = {};
  for (var i = 0; i < order.length; i++) { var x = BASE[order[i]]; for (var j = 0; j < x.s.length; j++) { var reg = x.s[j]; var prod = BASE.findIndex(function (y) { return y.d === reg; }); if (prod >= 0 && !seen[prod]) return NAMES[order[i]] + ' (' + x.t + ') runs before ' + NAMES[prod] + ', which produces ' + reg; } seen[order[i]] = true; }
  return null;
}
function draw() {
  document.getElementById('list').innerHTML = order.map(function (k, i) { return '<div style="display:flex;gap:4px;align-items:center;margin:3px 0"><button data-u="' + i + '" ' + (i ? '' : 'disabled') + '>↑</button><button data-d="' + i + '" ' + (i < order.length - 1 ? '' : 'disabled') + '>↓</button><b style="width:18px;text-align:center">' + NAMES[k] + '</b><code>' + BASE[k].t + '</code></div>'; }).join('');
  var r = PIPE.sched(cur(), { pipe: 1, haz: 1, fwd: 1 });
  var v = valid();
  document.getElementById('stat').innerHTML = 'cycles: <b>' + r.cycles + '</b> · stalls: <b style="color:' + (r.stalls ? '#b91c1c' : '#15803d') + '">' + r.stalls + '</b>' + (v ? ' · <b style="color:#b91c1c">⚠ wrong result: ' + v + '</b>' : '');
  document.getElementById('g').innerHTML = PIPE.grid(cur(), r, 999);
}
document.getElementById('list').onclick = function (e) {
  var b = e.target.closest('button'); if (!b) return;
  var i = +(b.dataset.u || b.dataset.d), j = b.dataset.u ? i - 1 : i + 1;
  var t = order[i]; order[i] = order[j]; order[j] = t; draw();
};
document.getElementById('chk').onclick = function () {
  var r = PIPE.sched(cur(), { pipe: 1, haz: 1, fwd: 1 }), v = valid(), res = document.getElementById('res');
  if (v) { res.className = 'res bad'; res.innerHTML = '❌ That order computes the wrong answer: ' + v + '.'; console.log('❌ dependency broken'); }
  else if (r.stalls) { res.className = 'res bad'; res.innerHTML = '❌ Correct order, but still ' + r.stalls + ' stall cycle(s). Put an independent instruction between each lw and its first use.'; console.log('❌ ' + r.stalls + ' stalls'); }
  else { res.className = 'res ok'; res.innerHTML = '✅ 0 stalls, ' + r.cycles + ' cycles, same results. This is instruction scheduling, which compilers and out-of-order CPUs do for you.'; console.log('✅ No stalls: ' + r.cycles + ' cycles'); }
};
draw();
<\/script>`;

window.LESSONS.push(
// ---------------------------------------------------------------- state-machines
{
  id: 'state-machines',
  section: 'Building a CPU',
  title: 'Finite state machines',
  explain: `
    <p>You now own two kinds of parts. <strong>Combinational logic</strong> (gates, adders, muxes) computes an answer from its inputs right now. <strong>Registers</strong> (flip-flops) remember a value until the next clock edge. Wire them in a loop and you get the most useful pattern in hardware: the <strong>finite state machine</strong> (FSM).</p>
    <pre><code>        ┌──────────────────────────────────────┐
        ▼                                      │
 inputs ─► NEXT-STATE LOGIC ─► STATE REGISTER ─┴─► OUTPUT LOGIC ─► outputs
          (gates)               (flip-flops, CLK)    (gates)</code></pre>
    <ul>
      <li>The <strong>state register</strong> holds "where am I?" as a binary number. 2 flip-flops give 4 possible states, 3 give 8, and so on.</li>
      <li>The <strong>next-state logic</strong> computes "where do I go next?" from the current state and the inputs.</li>
      <li>On every <strong>rising clock edge</strong> the register loads that next state. Between edges, nothing moves.</li>
      <li>The <strong>output logic</strong> turns the state into actions: which lamp is on, whether to drop a can of soda.</li>
    </ul>
    <p>As a programmer you've written this already: a <code>switch (state)</code> inside a loop, where each <code>case</code> sets <code>state = …</code> for the next pass. Hardware does the same thing, but the "loop" is the clock and <code>state</code> is a row of flip-flops.</p>
    <div class="tip"><strong>Why this matters for the CPU:</strong> a CPU's control unit is an FSM. Its states are "fetch", "decode" and "execute", and the clock moves it through them forever. You'll build exactly that in the next lessons.</div>
    <h3>Drawing an FSM</h3>
    <p>Designers sketch FSMs as <strong>state diagrams</strong>: circles are states, arrows are transitions labelled with the input that causes them. Then they give each state a binary code, write a truth table for the next state, and turn it into gates using the Boolean algebra you already know.</p>
    <div class="warn">A machine whose outputs depend only on the current state is a <strong>Moore machine</strong> (the traffic light below). One whose outputs also depend on the current input, for example "dispense when a coin arrives in state 10¢", is a <strong>Mealy machine</strong> (the vending machine). Both are FSMs.</div>
    <div class="world">
      <ul>
        <li><strong>Networking:</strong> every TCP connection in your OS kernel is an FSM with 11 states defined in <a href="https://en.wikipedia.org/wiki/Transmission_Control_Protocol#Protocol_operation" target="_blank">RFC 793</a> (LISTEN, SYN-SENT, ESTABLISHED, FIN-WAIT-1, TIME-WAIT…). <code>netstat</code> shows you those states.</li>
        <li><strong>Regex engines</strong> such as Google's <a href="https://en.wikipedia.org/wiki/RE2_(software)" target="_blank">RE2</a> compile a pattern into a finite automaton, which is a state machine that reads one character per step.</li>
        <li><strong>Embedded controllers</strong> in elevators, washing machines, traffic lights and USB ports are FSMs, often built straight in hardware or on a tiny microcontroller.</li>
        <li><strong>Game AI:</strong> the ghosts in <em>Pac-Man</em> switch between chase, scatter and frightened modes, which is a classic FSM.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'Traffic light: 2 flip-flops + 1 gate',
      explain: `
        <details>
          <summary>The problem: a light that cycles GREEN → YELLOW → RED → GREEN by itself</summary>
          <p>Gates alone can't do this, because the output must depend on <em>what happened before</em>. So we store the current phase in a 2-bit <strong>state register</strong> (S1 S0) and pick a binary code for each state:</p>
          <table>
            <tr><th>State</th><th>S1 S0</th><th>Next state</th><th>next S1 S0</th></tr>
            <tr><td>GREEN</td><td>0 0</td><td>YELLOW</td><td>0 1</td></tr>
            <tr><td>YELLOW</td><td>0 1</td><td>RED</td><td>1 0</td></tr>
            <tr><td>RED</td><td>1 0</td><td>GREEN</td><td>0 0</td></tr>
          </table>
          <p>Read the "next" columns as Boolean functions: <strong>next S1 = S0</strong> (just a wire!), and <strong>next S0 = 1 only when S1 = S0 = 0</strong>, which is <code>NOR(S1, S0)</code>. The output logic is just as small: <code>RED = S1</code>, <code>YELLOW = S0</code>, and <code>GREEN = NOR(S1, S0)</code>, so the NOR gate does double duty.</p>
        </details>
        <details>
          <summary>Step by step: press ⏭ Pulse three times</summary>
          <table>
            <tr><th>Moment</th><th>S1 S0 (state)</th><th>D1 = S0</th><th>D0 = NOR(S1,S0)</th><th>Lamp</th></tr>
            <tr><td>Power-on</td><td>0 0</td><td>0</td><td>1</td><td>🟢 GREEN</td></tr>
            <tr><td>Pulse 1 (rising edge)</td><td>0 1</td><td>1</td><td>0</td><td>🟡 YELLOW</td></tr>
            <tr><td>Pulse 2</td><td>1 0</td><td>0</td><td>0</td><td>🔴 RED</td></tr>
            <tr><td>Pulse 3</td><td>0 0</td><td>0</td><td>1</td><td>🟢 GREEN (cycle repeats)</td></tr>
          </table>
          <p>Notice the D inputs always show the <em>next</em> state, computed ahead of time. The flip-flops only copy D → Q at the instant the clock rises. That's why the circuit can't "race ahead" through several states at once.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Press <strong>⏭ Pulse</strong> and watch the oscilloscope: S0 and S1 change only on clock rising edges.</li>
            <li>Press <strong>▶ Clock</strong> to let it run on its own. A real traffic light controller is the same circuit with a slow clock (a timer) and different times per state.</li>
            <li>Hover the flip-flops: the green Q pins are the current state, the D pins are the state you'll be in after the next edge.</li>
          </ul>
          <div class="tip">State 1 1 is never used. A careful designer checks where it leads anyway: here next = (S0, NOR) = (1, 0) = RED, so even after a glitch the light recovers in one tick.</div>
        </details>
      `,
      code: `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: 'Traffic light FSM',
  intro: 'State register = 2 D flip-flops (S1 S0). Next-state logic = 1 NOR gate + 1 wire. Press <b>⏭ Pulse</b> for one clock tick, or <b>▶ Clock</b> to run.',
  scope: ['CLK', 'S1', 'S0', 'RED', 'YELLOW', 'GREEN'],
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 230 },
    { id: 's0', type: 'DFF', label: 'S0', x: 200, y: 0 },
    { id: 's1', type: 'DFF', label: 'S1', x: 200, y: 120 },
    { id: 'nor', type: 'NOR', x: 360, y: 70 },
    { id: 'y', type: 'OUT', label: 'YELLOW', x: 540, y: 10, color: '#eab308' },
    { id: 'g', type: 'OUT', label: 'GREEN', x: 540, y: 70, color: '#22c55e' },
    { id: 'r', type: 'OUT', label: 'RED', x: 540, y: 130, color: '#ef4444' },
    { id: 't1', type: 'TEXT', text: 'state register', x: 200, y: -32, bold: true },
    { id: 't2', type: 'TEXT', text: 'next-state + output logic (NOR)', x: 320, y: 215, bold: true },
  ],
  wires: [
    ['clk', 's0.CLK', { mx: 130 }], ['clk', 's1.CLK', { mx: 130 }],
    ['s0.Q', 'nor.0', { mx: 330 }], ['s1.Q', 'nor.1', { mx: 340 }],
    ['nor', 's0.D', { pts: [[450, 90], [450, -20], [170, -20], [170, 30]] }],
    ['s0.Q', 's1.D', { pts: [[310, 30], [310, 98], [180, 98], [180, 150]] }],
    ['s0.Q', 'y'], ['nor', 'g'], ['s1.Q', 'r'],
  ],
});
<\/script>`,
    },
    {
      title: 'Vending machine state diagram',
      explain: `
        <details>
          <summary>The problem: remember how much money is inside</summary>
          <p>Gum costs <strong>15¢</strong>. The machine accepts 5¢ and 10¢ coins one at a time, so it must remember the running total. That total is the state: <strong>0¢, 5¢ or 10¢</strong> (3 states, so 2 flip-flops). Reaching 15¢ or more dispenses and goes back to 0¢.</p>
        </details>
        <details>
          <summary>Step by step: insert 5¢, 5¢, 10¢</summary>
          <table>
            <tr><th>Input</th><th>State before</th><th>State after</th><th>Output</th></tr>
            <tr><td>5¢</td><td>0¢</td><td>5¢</td><td>none</td></tr>
            <tr><td>5¢</td><td>5¢</td><td>10¢</td><td>none</td></tr>
            <tr><td>10¢</td><td>10¢</td><td>0¢</td><td>🍬 gum + 5¢ change</td></tr>
          </table>
          <p>The output depends on the state <em>and</em> the coin, so this is a Mealy machine. The transition table on the right is exactly the truth table you'd turn into gates.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Insert coins and watch the highlighted circle (current state) and arrow (the transition just taken).</li>
            <li>Find every path that gives change. There are two: 10¢ in state 10¢ gives 5¢ back, and so does <strong>Refund</strong> from 5¢ or 10¢, which returns everything.</li>
            <li>Look at the table: every (state, input) pair has exactly one row. That's what makes it <em>deterministic</em>.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>Vending machine FSM: gum costs 15¢</h4>
  <p class="note">Click a coin. The <b style="color:#2563eb">blue circle</b> is the current state, the <b style="color:#f59e0b">orange arrow</b> is the transition just taken.</p>
  <div class="row">
    <div class="card" style="flex:1 1 520px">
      <svg id="sd" viewBox="0 0 560 300" style="width:100%;max-width:600px"></svg>
      <div style="margin-top:6px">
        <button id="c5" class="pri">Insert 5¢</button>
        <button id="c10" class="pri">Insert 10¢</button>
        <button id="ref">Refund</button>
      </div>
      <div id="msg" style="margin-top:8px;font-size:15px;min-height:24px"></div>
    </div>
    <div class="card" style="flex:0 1 330px">
      <b>Transition table</b>
      <table id="tt" class="mono" style="border-collapse:collapse;margin-top:6px"></table>
      <div style="margin-top:8px"><b>History</b><div id="log" class="mono" style="font-size:12px;max-height:120px;overflow:auto;color:#475066"></div></div>
    </div>
  </div>
</div>
<script>
var S = { 0: { x: 90, y: 170, code: '00' }, 5: { x: 280, y: 55, code: '01' }, 10: { x: 470, y: 170, code: '10' } };
var T = [
  [0, '5¢', 5, ''], [0, '10¢', 10, ''],
  [5, '5¢', 10, ''], [5, '10¢', 0, '🍬 gum'],
  [10, '5¢', 0, '🍬 gum'], [10, '10¢', 0, '🍬 gum + 5¢ change'],
  [5, 'refund', 0, '5¢ back'], [10, 'refund', 0, '10¢ back'], [0, 'refund', 0, ''],
];
var state = 0, last = -1;
function arrow(a, b, lab, on, bend) {
  var A = S[a], B = S[b];
  var col = on ? '#f59e0b' : '#94a3b8', w = on ? 4 : 2;
  var dx = B.x - A.x, dy = B.y - A.y, L = Math.sqrt(dx * dx + dy * dy), ux = dx / L, uy = dy / L;
  var px = -uy, py = ux;
  var sx = A.x + ux * 38 + px * 10, sy = A.y + uy * 38 + py * 10, ex = B.x - ux * 44 + px * 10, ey = B.y - uy * 44 + py * 10;
  var mx = (sx + ex) / 2 + px * bend * 2, my = (sy + ey) / 2 + py * bend * 2;
  var lx = (sx + ex) / 2 + px * (bend + (bend >= 0 ? 12 : -12)), ly = (sy + ey) / 2 + py * (bend + (bend >= 0 ? 12 : -12)) + 4;
  return '<path d="M' + sx + ' ' + sy + ' Q ' + mx + ' ' + my + ' ' + ex + ' ' + ey + '" fill="none" stroke="' + col + '" stroke-width="' + w + '" marker-end="url(#m' + (on ? 1 : 0) + ')"/>' +
    '<text x="' + lx + '" y="' + ly + '" text-anchor="middle" font-size="12.5" fill="' + (on ? '#b45309' : '#475569') + '" font-weight="' + (on ? 700 : 400) + '">' + lab + '</text>';
}
var DRAWN = [
  { a: 0, b: 5, lab: '5¢', bend: -22, ids: [0] },
  { a: 0, b: 10, lab: '10¢', bend: 55, ids: [1] },
  { a: 5, b: 10, lab: '5¢', bend: -22, ids: [2] },
  { a: 5, b: 0, lab: '10¢ / 🍬', bend: -12, ids: [3] },
  { a: 10, b: 0, lab: '5¢ / 🍬   or   10¢ / 🍬+5¢', bend: 4, ids: [4, 5] },
];
function draw() {
  var s = '<defs>' + [0, 1].map(function (k) { return '<marker id="m' + k + '" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0 0 L10 5 L0 10 z" fill="' + (k ? '#f59e0b' : '#94a3b8') + '"/></marker>'; }).join('') + '</defs>';
  DRAWN.forEach(function (d) { s += arrow(d.a, d.b, d.lab, d.ids.indexOf(last) >= 0, d.bend); });
  Object.keys(S).forEach(function (k) {
    var n = S[k], cur = +k === state;
    s += '<circle cx="' + n.x + '" cy="' + n.y + '" r="38" fill="' + (cur ? '#dbeafe' : '#fff') + '" stroke="' + (cur ? '#2563eb' : '#64748b') + '" stroke-width="' + (cur ? 4 : 2) + '"/>' +
      '<text x="' + n.x + '" y="' + (n.y + 2) + '" text-anchor="middle" font-size="18" font-weight="800">' + k + '¢</text>' +
      '<text x="' + n.x + '" y="' + (n.y + 20) + '" text-anchor="middle" font-size="11" fill="#64748b">S1S0=' + n.code + '</text>';
  });
  s += '<text x="10" y="290" font-size="11.5" fill="#64748b">Refund (not drawn): any state → 0¢, returns the coins. Arrow labels: input / output.</text>';
  document.getElementById('sd').innerHTML = s;
  var h = '<tr><th style="text-align:left;padding:2px 8px">state</th><th style="padding:2px 8px">input</th><th style="padding:2px 8px">next</th><th style="padding:2px 8px">output</th></tr>';
  T.forEach(function (t, i) {
    var bg = i === last ? '#fde68a' : t[0] === state ? '#eff6ff' : '';
    h += '<tr style="background:' + bg + '"><td style="padding:1px 8px">' + t[0] + '¢</td><td style="padding:1px 8px">' + t[1] + '</td><td style="padding:1px 8px">' + t[2] + '¢</td><td style="padding:1px 8px">' + (t[3] || '·') + '</td></tr>';
  });
  document.getElementById('tt').innerHTML = h;
}
function input(inp) {
  var i = T.findIndex(function (t) { return t[0] === state && t[1] === inp; });
  var t = T[i];
  last = i;
  var m = state + '¢ --' + inp + '--> ' + t[2] + '¢' + (t[3] ? '  ' + t[3] : '');
  state = t[2];
  document.getElementById('msg').innerHTML = t[3] ? '<b>Output:</b> ' + t[3] : 'Inside: <b>' + state + '¢</b>. Need ' + (15 - state) + '¢ more.';
  var log = document.getElementById('log');
  log.innerHTML = m + '<br>' + log.innerHTML;
  draw();
}
document.getElementById('c5').onclick = function () { input('5¢'); };
document.getElementById('c10').onclick = function () { input('10¢'); };
document.getElementById('ref').onclick = function () { input('refund'); };
document.getElementById('msg').innerHTML = 'Inside: <b>0¢</b>. Insert a coin.';
draw();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'What are the two essential pieces of every finite state machine?', options: ['An ALU and a RAM', 'A state register (flip-flops) and next-state logic (gates)', 'A clock and a 7-segment display', 'A decoder and a multiplexer only'], answer: 1, why: 'The register remembers the current state. Combinational logic computes the next state from the current state and inputs. The clock moves the machine from one state to the next.' },
    { q: 'An FSM needs 5 different states. What is the minimum number of flip-flops?', options: ['2', '3', '5', '8'], answer: 1, why: '2 flip-flops give 4 states, too few. 3 give 8 ≥ 5. In general you need ⌈log₂(states)⌉ flip-flops.' },
    { q: 'In the traffic light, when exactly does the state change?', options: ['As soon as the NOR gate output changes', 'On the rising edge of the clock', 'Whenever any LED turns on', 'Continuously, as fast as the gates allow'], answer: 1, why: 'The D inputs already hold the next state, but D flip-flops copy D → Q only at the rising clock edge. That is what keeps the machine moving exactly one step per tick.' },
    { q: 'The vending machine dispenses when a 10¢ coin arrives in state 10¢. Its output depends on the input too. What kind of FSM is that?', options: ['Moore machine', 'Mealy machine', 'Not an FSM: FSMs cannot have outputs', 'A combinational circuit'], answer: 1, why: 'Mealy machine outputs depend on state + input (they live on the arrows). Moore machine outputs depend on state only (they live in the circles), like the traffic light.' },
  ],
  exercise: {
    task: `<p>Upgrade the traffic light to <strong>4 phases</strong> with a pedestrian signal: <strong>GREEN → YELLOW → RED → RED + WALK → GREEN …</strong></p>
      <p>Use binary state codes 00 → 01 → 10 → 11 → 00. That's a 2-bit counter. The board has the clock, both flip-flops (S0, S1) and the 4 lamps already. Add gates and wires:</p>
      <ul>
        <li><strong>Next-state logic:</strong> next S0 = NOT S0, next S1 = S1 XOR S0. Each flip-flop also has a <code>Q̄</code> (NOT Q) output you can use for free.</li>
        <li><strong>Output logic:</strong> GREEN only in 00, YELLOW only in 01, RED in 10 and 11, WALK only in 11.</li>
      </ul>
      <p>Build it in the board below, then click <strong>✔ Check</strong>. It resets to state 00 and pulses the clock 5 times.</p>`,
    hint: 'D0 ← S0.Q̄ (a plain wire). D1 ← XOR(S1.Q, S0.Q). GREEN = NOR(S1, S0). YELLOW = AND(S1.Q̄, S0.Q). RED = S1.Q (a wire). WALK = AND(S1.Q, S0.Q). That is 4 gates in total.',
    starter: `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: '4-phase pedestrian traffic light',
  intro: 'Flip-flops and lamps are fixed. Wire the next-state logic (into the D pins) and the output logic (into the lamps).',
  build: { palette: ['NOT', 'AND', 'OR', 'XOR', 'NOR'], best: 4 },
  test: [
    { expect: { GREEN: 1, YELLOW: 0, RED: 0, WALK: 0 }, note: 'state 00 after reset' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 1, RED: 0, WALK: 0 }, note: '01 yellow' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 0, RED: 1, WALK: 0 }, note: '10 red' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 0, RED: 1, WALK: 1 }, note: '11 red + walk' },
    { pulse: 'CLK', expect: { GREEN: 1, YELLOW: 0, RED: 0, WALK: 0 }, note: 'back to 00' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 1, RED: 0, WALK: 0 }, note: '01 again' },
  ],
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 300 },
    { id: 's0', type: 'DFF', label: 'S0', x: 140, y: 40, fixed: true },
    { id: 's1', type: 'DFF', label: 'S1', x: 140, y: 200, fixed: true },
    { id: 'g', type: 'OUT', label: 'GREEN', x: 640, y: 20, color: '#22c55e' },
    { id: 'y', type: 'OUT', label: 'YELLOW', x: 640, y: 100, color: '#eab308' },
    { id: 'r', type: 'OUT', label: 'RED', x: 640, y: 180, color: '#ef4444' },
    { id: 'wk', type: 'OUT', label: 'WALK', x: 640, y: 260, color: '#3b82f6' },
  ],
  wires: [['clk', 's0.CLK', { mx: 100 }], ['clk', 's1.CLK', { mx: 100 }]],
});
<\/script>`,
    solution: `<div id="c"></div>
<script>
Circ.mount('#c', {
  title: '4-phase pedestrian traffic light',
  intro: 'Flip-flops and lamps are fixed. Wire the next-state logic (into the D pins) and the output logic (into the lamps).',
  build: { palette: ['NOT', 'AND', 'OR', 'XOR', 'NOR'], best: 4 },
  test: [
    { expect: { GREEN: 1, YELLOW: 0, RED: 0, WALK: 0 }, note: 'state 00 after reset' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 1, RED: 0, WALK: 0 }, note: '01 yellow' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 0, RED: 1, WALK: 0 }, note: '10 red' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 0, RED: 1, WALK: 1 }, note: '11 red + walk' },
    { pulse: 'CLK', expect: { GREEN: 1, YELLOW: 0, RED: 0, WALK: 0 }, note: 'back to 00' },
    { pulse: 'CLK', expect: { GREEN: 0, YELLOW: 1, RED: 0, WALK: 0 }, note: '01 again' },
  ],
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 300 },
    { id: 's0', type: 'DFF', label: 'S0', x: 140, y: 40, fixed: true },
    { id: 's1', type: 'DFF', label: 'S1', x: 140, y: 200, fixed: true },
    { id: 'g', type: 'OUT', label: 'GREEN', x: 640, y: 20, color: '#22c55e' },
    { id: 'y', type: 'OUT', label: 'YELLOW', x: 640, y: 100, color: '#eab308' },
    { id: 'r', type: 'OUT', label: 'RED', x: 640, y: 180, color: '#ef4444' },
    { id: 'wk', type: 'OUT', label: 'WALK', x: 640, y: 260, color: '#3b82f6' },
    { id: 'nor', type: 'NOR', x: 480, y: 20 },
    { id: 'ay', type: 'AND', x: 480, y: 100 },
    { id: 'aw', type: 'AND', x: 480, y: 260 },
    { id: 'xo', type: 'XOR', x: 320, y: 300 },
  ],
  wires: [['clk', 's0.CLK', { mx: 100 }], ['clk', 's1.CLK', { mx: 100 }],
    ['s0.Q̄', 's0.D', { pts: [[250, 90], [250, 20], [120, 20], [120, 70]] }],
    ['s1.Q', 'xo.0', { mx: 280 }], ['s0.Q', 'xo.1', { mx: 300 }],
    ['xo', 's1.D', { pts: [[400, 320], [400, 365], [115, 365], [115, 230]] }],
    ['s1.Q', 'nor.0', { mx: 440 }], ['s0.Q', 'nor.1', { mx: 420 }],
    ['s1.Q̄', 'ay.0', { mx: 450 }], ['s0.Q', 'ay.1', { mx: 420 }],
    ['s1.Q', 'r'],
    ['s1.Q', 'aw.0', { mx: 440 }], ['s0.Q', 'aw.1', { mx: 420 }],
    ['nor', 'g'], ['ay', 'y'], ['aw', 'wk'],
  ],
});
<\/script>`,
  },
},
// ---------------------------------------------------------------- program-counter
{
  id: 'program-counter',
  section: 'Building a CPU',
  title: 'The program counter',
  explain: `
    <p>A program is a list of instructions sitting in RAM at addresses 0, 1, 2, … The CPU needs to know <em>which one is next</em>. That's the job of one small register: the <strong>program counter (PC)</strong>. It holds the address of the next instruction.</p>
    <p>You already built the two parts it needs:</p>
    <ul>
      <li>A <strong>counter</strong> (register + adder): normally, after each instruction, <code>PC ← PC + 1</code>. Programs run top to bottom.</li>
      <li>A <strong>register with LOAD</strong> plus a <strong>MUX</strong>: to <em>jump</em>, the PC loads a brand-new address instead, <code>PC ← target</code>. That gives you loops, <code>if</code>, function calls and <code>goto</code>.</li>
    </ul>
    <pre><code>             JUMP ──────────┐
                            ▼
  PC ──► [ +1 ] ──► PC+1 ─► │MUX│ ──► next PC ──► [PC register] ──► PC
  target address ─────────► │   │                      ▲
                                                      CLK</code></pre>
    <p>The MUX picks between "the next address in line" and "the jump target". On the clock edge the register loads whichever one won. In software terms it's one line: <code>pc = jump ? target : pc + 1;</code>, run once per instruction.</p>
    <div class="tip">Our teaching CPU (called <strong>TINY-8</strong> in this section) has 16 bytes of RAM, so its PC is only <strong>4 bits</strong> (addresses 0–15). After 15 comes 0: the counter wraps around, just like a 4-bit adder overflowing.</div>
    <div class="warn">The jump is not instant. Setting JUMP and the target only changes the MUX <em>output</em>. The PC itself changes at the next rising clock edge, like every other register.</div>
    <div class="world">
      <ul>
        <li>On x86-64 the PC is called <strong>RIP</strong> (instruction pointer). On 32-bit ARM it is register <strong>R15</strong>, and on RISC-V it is simply <code>pc</code>. Same idea, wider: 64 bits instead of 4.</li>
        <li>Every <code>if</code>, <code>while</code>, <code>for</code>, function call and <code>return</code> in your code compiles to instructions that <em>load the PC</em>. At the hardware level, they're all a <code>goto</code>.</li>
        <li>At power-on the PC must start somewhere. The <a href="https://en.wikipedia.org/wiki/MOS_Technology_6502" target="_blank">6502</a> (NES, Apple II) reads a 2-byte <em>reset vector</em> from addresses $FFFC–$FFFD and loads it into its PC. x86 CPUs start executing at the fixed address FFFFFFF0h, where the firmware lives.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'PC = register + incrementer + MUX',
      explain: `
        <details>
          <summary>The problem: count up, but jump when told</summary>
          <p>The register's input is driven by a MUX. With JUMP = 0 the MUX passes <strong>PC + 1</strong> (from the <code>+1</code> chip, which is just a 4-bit adder with B = 1). With JUMP = 1 it passes the <strong>TARGET</strong> number. Each clock edge, the PC register stores the MUX output. The wires looping from the PC back to the <code>+1</code> chip make this a state machine: the next state depends on the current one.</p>
        </details>
        <details>
          <summary>Step by step: 3 pulses, then a jump to 9</summary>
          <table>
            <tr><th>Action</th><th>JUMP</th><th>TARGET</th><th>PC before</th><th>MUX outputs</th><th>PC after edge</th></tr>
            <tr><td>⏭ Pulse</td><td>0</td><td>9</td><td>0</td><td>PC+1 = 1</td><td>1</td></tr>
            <tr><td>⏭ Pulse</td><td>0</td><td>9</td><td>1</td><td>PC+1 = 2</td><td>2</td></tr>
            <tr><td>⏭ Pulse</td><td>0</td><td>9</td><td>2</td><td>PC+1 = 3</td><td>3</td></tr>
            <tr><td>flip JUMP → 1</td><td>1</td><td>9</td><td>3</td><td>TARGET = 9</td><td>3 (no edge yet!)</td></tr>
            <tr><td>⏭ Pulse</td><td>1</td><td>9</td><td>3</td><td>TARGET = 9</td><td><strong>9</strong></td></tr>
            <tr><td>flip JUMP → 0, ⏭ Pulse</td><td>0</td><td>9</td><td>9</td><td>PC+1 = 10</td><td>10</td></tr>
          </table>
          <p>The memory strip under the circuit shows which RAM address the PC points to. It skipped from 3 to 9: addresses 4–8 were never executed. That's a jump.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Leave JUMP = 1 and pulse several times. The PC stays on 9 forever: an <strong>infinite loop</strong> (<code>9: goto 9</code>). Some programs end exactly like this on purpose.</li>
            <li>Set TARGET to the current PC value minus 2 (click its ▲▼) and alternate JUMP. You've made a loop that repeats 3 addresses.</li>
            <li>Pulse until the PC reaches 15, then pulse once more: it wraps to 0.</li>
          </ul>
          <div class="tip">Common mistake: thinking a jump "skips" instantly when JUMP flips. Watch the <em>next PC</em> readout change at once, while the PC display waits for the clock edge.</div>
        </details>
      `,
      code: `<div id="c"></div>
<div id="mem" style="font:13px system-ui;margin-top:6px"></div>
<script>
function bits4(v) { return [v & 1, (v >> 1) & 1, (v >> 2) & 1, (v >> 3) & 1]; }
function val(a, o) { return a[o] + 2 * a[o + 1] + 4 * a[o + 2] + 8 * a[o + 3]; }
Circ.chip('INC4', { label: '+1', ins: ['A0', 'A1', 'A2', 'A3'], outs: ['Y0', 'Y1', 'Y2', 'Y3'], w: 90, desc: 'Incrementer: Y = A + 1 (a 4-bit adder with B = 1)', fn: function (i) { return bits4((val(i, 0) + 1) & 15); } });
Circ.chip('MUX4', { label: 'MUX ×4', ins: ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'S'], outs: ['Y0', 'Y1', 'Y2', 'Y3'], w: 90, desc: '4-bit 2-to-1 multiplexer: S=0 → Y=A, S=1 → Y=B', fn: function (i) { return bits4(i[8] ? val(i, 4) : val(i, 0)); } });
Circ.chip('REG4', { label: 'PC REGISTER', ins: ['D0', 'D1', 'D2', 'D3', 'CLK'], outs: ['Q0', 'Q1', 'Q2', 'Q3'], w: 100, stateful: true, clk: 4, desc: '4 D flip-flops: on the rising CLK edge Q ← D',
  fn: function (i, m) { if (i[4] && !m.p) m.q = val(i, 0); m.p = i[4]; return bits4(m.q | 0); } });
var parts = [
  { id: 'inc', type: 'INC4', x: 40, y: 0 },
  { id: 'mux', type: 'MUX4', x: 180, y: 0 },
  { id: 'reg', type: 'REG4', x: 340, y: 50 },
  { id: 'pc', type: 'NUMOUT', label: 'PC', x: 580, y: 60 },
  { id: 'tg', type: 'NUMIN', label: 'TARGET', x: 40, y: 140, value: 9 },
  { id: 'j', type: 'IN', label: 'JUMP', x: 100, y: 260 },
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 270, y: 230 },
  { id: 'tx', type: 'TEXT', text: 'feedback: the PC value loops back into the +1 chip', x: -20, y: -58, color: '#94a3b8' },
];
var wires = [['j', 'mux.S', { mx: 160 }], ['clk', 'reg.CLK', { mx: 320 }]];
for (var k = 0; k < 4; k++) {
  wires.push(['inc.Y' + k, 'mux.A' + k]);
  wires.push(['tg.' + k, 'mux.B' + k, { mx: 150 }]);
  wires.push(['mux.Y' + k, 'reg.D' + k]);
  wires.push(['reg.Q' + k, 'pc.' + k]);
  wires.push(['reg.Q' + k, 'inc.A' + k, { pts: [[460 + 10 * k, 90 + 20 * k], [460 + 10 * k, -20 - 10 * k], [20 - 10 * k, -20 - 10 * k], [20 - 10 * k, 30 + 20 * k]] }]);
}
Circ.mount('#c', {
  title: 'Program counter',
  intro: 'JUMP = 0: the PC counts 0, 1, 2… JUMP = 1: it loads TARGET. Press <b>⏭ Pulse</b> for one clock edge.',
  parts: parts, wires: wires, scope: ['CLK', 'JUMP', 'PC'],
  help: 'Click JUMP to toggle, click TARGET ▲▼ or its bits to change the jump address. Hover a chip to see what it does.',
  onChange: function (api) {
    var pc = api.get('PC'), j = api.get('JUMP'), t = api.get('TARGET');
    var nx = j ? t : (pc + 1) & 15;
    var h = '<div style="margin-bottom:4px">PC = <b>' + pc + '</b> · MUX picks <b>' + (j ? 'TARGET' : 'PC + 1') + '</b> → next PC after the edge = <b style="color:#2563eb">' + nx + '</b></div><div style="display:flex;gap:3px;flex-wrap:wrap">';
    for (var a = 0; a < 16; a++) {
      var bg = a === pc ? '#2563eb' : a === nx ? '#dbeafe' : '#f1f4f9', fg = a === pc ? '#fff' : '#334155';
      h += '<div style="width:44px;text-align:center;padding:3px 0;border-radius:6px;background:' + bg + ';color:' + fg + ';font:12px ui-monospace,monospace">' + (a === pc ? 'PC▶' : 'addr') + '<br><b>' + a + '</b></div>';
    }
    document.getElementById('mem').innerHTML = h + '</div><div style="font-size:11.5px;color:#8a90a2;margin-top:3px">RAM addresses: dark blue = where the PC points now, light blue = where it will point after the next clock edge.</div>';
  },
});
<\/script>`,
    },
    {
      title: 'Watch the PC run a real program',
      explain: `
        <details>
          <summary>The problem: what does the PC do during a loop?</summary>
          <p>This is a real TINY-8 program (you'll learn to write these soon). It prints 3, 2, 1. Address 4 holds <code>JNZ 2</code>, "jump to address 2 if the last result was Not Zero". When the jump is taken the MUX picks the target. Otherwise it picks PC + 1.</p>
        </details>
        <details>
          <summary>Step by step: the PC sequence</summary>
          <table>
            <tr><th>Step</th><th>PC</th><th>Instruction</th><th>A after</th><th>Z flag</th><th>MUX picks</th><th>next PC</th></tr>
            <tr><td>1</td><td>0</td><td>LDI A, 3</td><td>3</td><td>0</td><td>PC+1</td><td>1</td></tr>
            <tr><td>2</td><td>1</td><td>LDI B, 1</td><td>3</td><td>0</td><td>PC+1</td><td>2</td></tr>
            <tr><td>3</td><td>2</td><td>OUT → prints 3</td><td>3</td><td>0</td><td>PC+1</td><td>3</td></tr>
            <tr><td>4</td><td>3</td><td>SUB</td><td>2</td><td>0</td><td>PC+1</td><td>4</td></tr>
            <tr><td>5</td><td>4</td><td>JNZ 2</td><td>2</td><td>0</td><td><strong>TARGET</strong></td><td><strong>2</strong></td></tr>
            <tr><td>6–8</td><td>2, 3, 4</td><td>OUT (prints 2), SUB, JNZ 2</td><td>1</td><td>0</td><td>TARGET</td><td>2</td></tr>
            <tr><td>9–11</td><td>2, 3, 4</td><td>OUT (prints 1), SUB, JNZ 2</td><td>0</td><td><strong>1</strong></td><td>PC+1 (not taken)</td><td>5</td></tr>
            <tr><td>12</td><td>5</td><td>HLT</td><td>0</td><td>1</td><td>(stops)</td><td>6</td></tr>
          </table>
          <p>The PC visits 0 1 2 3 4 2 3 4 2 3 4 5. The loop is nothing more than the PC being sent back to 2.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Click <strong>Step</strong> repeatedly. Before each step, the MUX diagram predicts which input it will choose.</li>
            <li>Change the start value with the <strong>A starts at</strong> selector, press Reset, and count how many times the loop body runs.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>The PC during a loop</h4>
  <p class="note">Each <b>Step</b> runs one whole instruction. Watch the PC's MUX choose between <b>PC + 1</b> and the <b>jump target</b>.</p>
  <div style="margin-bottom:8px"><button id="st" class="pri">⏩ Step</button> <button id="rs">↺ Reset</button>
   <label style="margin-left:10px">A starts at <select id="n"><option>2</option><option selected>3</option><option>4</option><option>5</option></select></label></div>
  <div class="row">
    <div class="card"><table id="lst" class="mono" style="border-collapse:collapse"></table></div>
    <div class="card" style="flex:1 1 380px">
      <svg id="mx" viewBox="0 0 420 170" style="width:100%;max-width:440px"></svg>
      <div id="regs" class="mono" style="margin-top:4px"></div>
      <div style="margin-top:6px"><b>PC history:</b> <span id="hist" class="mono"></span></div>
    </div>
  </div>
</div>
<script>
${LIB}
var ENG = ['load the number into A', 'B = 1 (amount to subtract)', 'print A', 'A = A − B (sets the Z flag)', 'if Z = 0, jump back to address 2', 'stop'];
var s, hist;
function prog() { var n = +document.getElementById('n').value; return [0x10 | n, 0x21, 0xF0, 0x80, 0xD2, 0x00]; }
function reset() { s = CPU.create(prog()); hist = [0]; draw(); }
function predict() {
  var b = s.mem[s.PC], op = b >> 4;
  if (op >= 11 && op <= 14) { var cond = ['', 'Z', '!Z', 'C'][op - 11]; return { jump: CPU.condOk(s, cond || 'x'), t: b & 15, isJ: true }; }
  return { jump: false, t: b & 15, isJ: false };
}
function draw() {
  var h = '<tr><th></th><th style="padding:2px 6px">addr</th><th style="padding:2px 6px">hex</th><th style="padding:2px 6px;text-align:left">instruction</th><th style="padding:2px 6px;text-align:left">meaning</th></tr>';
  for (var a = 0; a < 6; a++) {
    var cur = a === s.PC && !s.halted;
    h += '<tr style="background:' + (cur ? '#dbeafe' : '') + ';font-weight:' + (cur ? 700 : 400) + '"><td style="color:#1d4ed8;padding:2px 4px">' + (cur ? 'PC▶' : '') + '</td><td style="padding:2px 6px">' + a + '</td><td style="padding:2px 6px">' + CPU.h2(s.mem[a]).slice(2) + '</td><td style="padding:2px 6px">' + CPU.dis(s.mem[a]) + '</td><td style="padding:2px 6px;font-family:system-ui;color:#475066">' + ENG[a] + '</td></tr>';
  }
  document.getElementById('lst').innerHTML = h;
  var p = predict(), j = p.jump && !s.halted;
  var on = '#2563eb', off = '#cbd5e1';
  var sv = '<text x="0" y="14" font-size="12.5" fill="#475066">' + (s.halted ? 'CPU halted.' : 'Next step: ' + CPU.dis(s.mem[s.PC]) + (p.isJ ? (j ? ' → condition TRUE, jump' : ' → condition FALSE, no jump') : ' → not a jump')) + '</text>';
  sv += '<rect x="10" y="40" width="110" height="34" rx="6" fill="#fff" stroke="' + (!j ? on : off) + '" stroke-width="2"/><text x="65" y="62" text-anchor="middle" font-size="13" font-weight="700">PC+1 = ' + ((s.PC + 1) & 15) + '</text>';
  sv += '<rect x="10" y="100" width="110" height="34" rx="6" fill="#fff" stroke="' + (j ? on : off) + '" stroke-width="2"/><text x="65" y="122" text-anchor="middle" font-size="13" font-weight="700">target = ' + (p.isJ ? p.t : '—') + '</text>';
  sv += '<path d="M120 57 H180" stroke="' + (!j ? on : off) + '" stroke-width="' + (!j ? 4 : 2) + '"/><path d="M120 117 H180" stroke="' + (j ? on : off) + '" stroke-width="' + (j ? 4 : 2) + '"/>';
  sv += '<path d="M180 35 L240 55 L240 120 L180 140 Z" fill="#fff7ed" stroke="#334155" stroke-width="2"/><text x="210" y="92" text-anchor="middle" font-size="12" font-weight="800">MUX</text>';
  sv += '<text x="210" y="165" text-anchor="middle" font-size="12" fill="#475066">JUMP = ' + (j ? 1 : 0) + '</text><path d="M210 150 V132" stroke="#f59e0b" stroke-width="2"/>';
  sv += '<path d="M240 87 H300" stroke="' + on + '" stroke-width="4"/><rect x="300" y="68" width="110" height="38" rx="6" fill="#dbeafe" stroke="#2563eb" stroke-width="2"/><text x="355" y="85" text-anchor="middle" font-size="11" fill="#1e40af">PC now ' + s.PC + '</text><text x="355" y="100" text-anchor="middle" font-size="13" font-weight="800" fill="#1e40af">next PC = ' + (s.halted ? '—' : j ? p.t : (s.PC + 1) & 15) + '</text>';
  document.getElementById('mx').innerHTML = sv;
  document.getElementById('regs').innerHTML = 'A = <b>' + s.A + '</b> · B = <b>' + s.B + '</b> · Z flag = <b>' + s.Z + '</b> · OUT: <b>' + (s.out.join(', ') || '—') + '</b>' + (s.halted ? ' · <b style="color:#b91c1c">HALTED</b>' : '');
  document.getElementById('hist').textContent = hist.join(' → ');
  document.getElementById('st').disabled = s.halted;
}
document.getElementById('st').onclick = function () { CPU.step(s); if (!s.halted) hist.push(s.PC); draw(); };
document.getElementById('rs').onclick = reset;
document.getElementById('n').onchange = reset;
reset();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'What does the program counter hold?', options: ['The number of instructions executed so far', 'The address of the next instruction to fetch', 'The result of the last addition', 'The number of clock cycles since power-on'], answer: 1, why: 'Despite the name, it is not a statistic. It is a pointer: the RAM address of the next instruction.' },
    { q: 'In the PC circuit, what does the JUMP signal control?', options: ['The clock speed', 'The MUX select line: PC+1 or the target address', 'Whether RAM is read or written', 'The +1 chip turns into a −1 chip'], answer: 1, why: 'JUMP is the MUX select. 0 = continue to PC+1, 1 = load the target. The register then stores the MUX output on the clock edge.' },
    { q: 'TINY-8 has a 4-bit PC. The PC is 15 and the instruction there is not a jump. What is the next PC?', options: ['16', '0', '15', 'The CPU crashes'], answer: 1, why: '15 + 1 = 16 = 1 0000₂, which needs 5 bits. The 4-bit register keeps only 0000, so the PC wraps to 0.' },
    { q: 'A loop in a compiled program is, at the hardware level…', options: ['A special loop circuit inside the ALU', 'An instruction that loads an earlier address into the PC', 'The clock running backwards', 'Copying the loop body many times into RAM'], answer: 1, why: 'Loops are backwards jumps: the PC is set to an earlier address, so the same instructions are fetched again.' },
  ],
  exercise: {
    task: `<p>Finish the program counter. The <code>+1</code> chip, the PC register and the PC display are already wired in a loop. Add a <strong>MUX ×4</strong> from the palette, then wire it up:</p>
      <ul>
        <li><code>+1</code> outputs Y0–Y3 → MUX inputs A0–A3 (chosen when S = 0)</li>
        <li>TARGET bits b0–b3 → MUX inputs B0–B3 (chosen when S = 1)</li>
        <li>JUMP → MUX S</li>
        <li>MUX Y0–Y3 → PC REGISTER D0–D3</li>
      </ul>
      <p>Then click <strong>✔ Check</strong>. It pulses the clock with JUMP off and on and checks that the PC counts, jumps to TARGET, and wraps from 15 to 0.</p>`,
    hint: 'Drag from a pin to a pin. Match bit numbers: Y0→A0, b0→B0, Y0→D0 and so on. 13 wires in total. If the PC never changes, check that MUX Y goes to the register D pins.',
    starter: PC_EX,
    solution: PC_EX_SOL,
  },
},
// ---------------------------------------------------------------- instructions
{
  id: 'instructions',
  section: 'Building a CPU',
  title: 'Instructions are just numbers',
  explain: `
    <p>RAM only stores bytes. So a program must be bytes too. An <strong>instruction set architecture (ISA)</strong> is the agreement about what each byte pattern <em>means</em>: "if the CPU fetches <code>0111 0000</code>, it adds B to A". The CPU's control unit is the circuit that does that interpretation.</p>
    <p>Here is the complete ISA of <strong>TINY-8</strong>, the CPU we build in this section. Every instruction is exactly <strong>one byte</strong>:</p>
    <pre><code>  bit:   7  6  5  4   3  2  1  0
        [  opcode   ] [  operand  ]
         which action   a number 0–15 or an address 0–15</code></pre>
    ${ISA_TABLE}
    <p>The machine has 8-bit registers <strong>A</strong> and <strong>B</strong>, a 4-bit <strong>PC</strong>, an <strong>IR</strong> (instruction register, holds the byte being executed) and flags <strong>Z</strong> (result was zero), <strong>N</strong> (bit 7 set, so negative in two's complement) and <strong>C</strong> (ADD carried past 255, or SUB had to borrow because A &lt; B). Only the ALU instructions change the flags.</p>
    <h3>Encoding by hand</h3>
    <p><code>LD A, [14]</code>: opcode for <code>LD A</code> is 3 = <code>0011</code>, address 14 = <code>1110</code>, so the byte is <code>0011 1110</code> = <strong>0x3E</strong>. Going backwards (0x3E → <code>LD A, [14]</code>) is <strong>disassembling</strong>.</p>
    <p>Writing the human-readable form (<code>LD A, [14]</code>) is called <strong>assembly language</strong>. A program called an <strong>assembler</strong> converts it to bytes (<strong>machine code</strong>). There's a one-to-one match: one line → one instruction → one byte here.</p>
    <div class="tip"><strong>Von Neumann architecture:</strong> program and data share the same RAM. Nothing marks a byte as "code" or "data". If the PC points at your data, the CPU happily executes it. 0x07 is the number 7, and it is also <code>HLT</code> (opcode 0, operand ignored). Computers that keep code and data in separate memories instead (many microcontrollers) are called <strong>Harvard architecture</strong>.</div>
    <div class="warn">Design trade-off: with 4 operand bits, <code>LDI</code> can only load 0–15 and jumps can only reach 16 addresses. Real ISAs spend more bits per instruction to get bigger numbers and more registers. That's why ARM and RISC-V instructions are 32 bits wide.</div>
    <div class="world">
      <ul>
        <li><strong>x86</strong> (Intel/AMD) uses <em>variable-length</em> instructions from 1 to 15 bytes. <code>mov eax, 5</code> = <code>B8 05 00 00 00</code> (5 bytes), <code>add eax, 3</code> = <code>83 C0 03</code> (3 bytes), <code>ret</code> = <code>C3</code> (1 byte). Decoding them is hard, and that difficulty shapes Intel and AMD front-end designs.</li>
        <li><strong>ARM</strong> (AArch64) and <strong>RISC-V</strong> use <em>fixed 32-bit</em> instructions (RISC-V also has an optional 16-bit "compressed" form). Fixed fields make the decoder simple and fast.</li>
        <li>Run <code>objdump -d /bin/ls</code> on Linux (or <code>otool -tv</code> on macOS) to see a real program as hex bytes next to its disassembly. It's the same idea as the RAM table in the widgets here.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'Instruction encoder / decoder',
      explain: `
        <details>
          <summary>The problem: the CPU only ever sees 8 bits</summary>
          <p>When the CPU fetches a byte, there is no text and no label, just 8 wires that are high or low. The control unit splits them into two groups. The top 4 bits choose the action, and the bottom 4 bits are data for that action.</p>
        </details>
        <details>
          <summary>Step by step: decoding a few bytes</summary>
          <table>
            <tr><th>Byte</th><th>Binary</th><th>Opcode → instruction</th><th>Operand</th><th>Meaning</th></tr>
            <tr><td>0x3E</td><td><code>0011 1110</code></td><td>3 → LD A</td><td>14 (address)</td><td>A ← RAM[14]</td></tr>
            <tr><td>0x15</td><td><code>0001 0101</code></td><td>1 → LDI A</td><td>5 (number)</td><td>A ← 5</td></tr>
            <tr><td>0x70</td><td><code>0111 0000</code></td><td>7 → ADD</td><td>ignored</td><td>A ← A + B</td></tr>
            <tr><td>0xD2</td><td><code>1101 0010</code></td><td>13 → JNZ</td><td>2 (address)</td><td>if Z = 0: PC ← 2</td></tr>
            <tr><td>0x07</td><td><code>0000 0111</code></td><td>0 → HLT</td><td>ignored</td><td>stop (even if you meant "the number 7")</td></tr>
          </table>
          <p>The same operand bits mean a <em>number</em> for LDI, an <em>address</em> for LD/ST/jumps, and nothing at all for ADD. The opcode decides how the rest is interpreted.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Click the 8 bit buttons and watch the instruction change. Flip only bit 4 of <code>0x3E</code> (LD A) and you get <code>0x2E</code> = <code>LDI B, 14</code>. One bit, totally different action.</li>
            <li>Type <code>JMP 9</code> in the assembly box and press Enter. Then try <code>LDI A, 20</code>: the assembler refuses, because 20 doesn't fit in 4 bits.</li>
            <li>Click rows of the opcode table to set the top nibble directly.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>TINY-8 instruction decoder</h4>
  <p class="note">Click bits to build a byte, or type assembly and press Enter. <b style="color:#c2410c">Orange</b> = opcode (what to do), <b style="color:#1d4ed8">blue</b> = operand (number or address).</p>
  <div class="row">
    <div class="card" style="flex:1 1 520px">
      <div id="bits" style="display:flex;gap:5px;margin:4px 0 2px"></div>
      <div class="mono" style="display:flex;gap:5px;font-size:11px;color:#64748b" id="bl"></div>
      <div style="margin-top:10px;font-size:15px" id="out"></div>
      <div style="margin-top:12px">Assembly: <input id="asm" class="mono" style="width:180px" value="LD A, [14]"> <button id="go" class="pri">Encode ↵</button> <span id="err" style="color:#b91c1c;font-size:12.5px"></span></div>
    </div>
    <div class="card" style="flex:0 1 300px"><b>Opcode table</b> <span style="font-size:12px;color:#64748b">(click a row)</span>
      <table id="ops" class="mono" style="border-collapse:collapse;font-size:12px;margin-top:4px;cursor:pointer"></table></div>
  </div>
</div>
<script>
${LIB}
var v = 0x3E;
function draw() {
  var h = '', l = '';
  for (var b = 7; b >= 0; b--) {
    var on = (v >> b) & 1, op = b >= 4;
    h += '<button data-b="' + b + '" style="width:48px;height:48px;margin:0;font:800 20px ui-monospace,monospace;border-radius:8px;border:2px solid ' + (op ? '#fb923c' : '#60a5fa') + ';background:' + (on ? (op ? '#f97316' : '#2563eb') : '#fff') + ';color:' + (on ? '#fff' : '#94a3b8') + '">' + on + '</button>' + (b === 4 ? '<span style="width:14px"></span>' : '');
    l += '<span style="width:48px;text-align:center">bit ' + b + '</span>' + (b === 4 ? '<span style="width:14px"></span>' : '');
  }
  document.getElementById('bits').innerHTML = h;
  document.getElementById('bl').innerHTML = l;
  var op = v >> 4, x = v & 15, o = CPU.OPS[op];
  var kind = o.arg === 'n' ? 'the number ' + x : o.arg === 'a' ? 'the address ' + x : 'unused (ignored)';
  var mean = o.d.replace(/\\bn\\b/, x).replace(/\\ba\\b/, x);
  document.getElementById('out').innerHTML =
    '<div>hex <b class="mono">' + CPU.h2(v) + '</b> · decimal <b class="mono">' + v + '</b></div>' +
    '<div style="margin-top:6px">opcode <b class="mono" style="color:#c2410c">' + CPU.b8(v).slice(0, 4) + '</b> = ' + op + ' → <b>' + o.m + '</b></div>' +
    '<div>operand <b class="mono" style="color:#1d4ed8">' + CPU.b8(v).slice(4) + '</b> = ' + kind + '</div>' +
    '<div style="margin-top:8px;font-size:20px" class="mono"><b>' + CPU.dis(v) + '</b></div>' +
    '<div style="color:#475066">' + mean + '</div>';
  document.getElementById('ops').innerHTML = CPU.OPS.map(function (o, i) {
    return '<tr data-op="' + i + '" style="background:' + (i === op ? '#ffedd5' : '') + ';font-weight:' + (i === op ? 700 : 400) + '"><td style="padding:1px 6px;color:#c2410c">' + i.toString(2).padStart(4, '0') + '</td><td style="padding:1px 6px">' + i.toString(16).toUpperCase() + '</td><td style="padding:1px 6px">' + o.m + (o.arg === 'n' ? ', n' : o.arg === 'a' ? (/^(LD|ST)/.test(o.m) ? ', [a]' : ' a') : '') + '</td></tr>';
  }).join('');
}
document.getElementById('bits').onclick = function (e) { var b = e.target.closest('button'); if (!b) return; v ^= 1 << +b.dataset.b; document.getElementById('asm').value = CPU.dis(v); document.getElementById('err').textContent = ''; draw(); };
document.getElementById('ops').onclick = function (e) { var r = e.target.closest('tr[data-op]'); if (!r) return; v = (+r.dataset.op << 4) | (v & 15); document.getElementById('asm').value = CPU.dis(v); draw(); };
function enc() {
  var r = CPU.assemble(document.getElementById('asm').value);
  var e = document.getElementById('err');
  if (r.errors.length) { e.textContent = '✖ ' + r.errors[0].msg; return; }
  if (r.size !== 1) { e.textContent = '✖ type exactly one instruction'; return; }
  e.textContent = ''; v = r.bytes[0]; draw();
}
document.getElementById('go').onclick = enc;
document.getElementById('asm').onkeydown = function (e) { if (e.key === 'Enter') enc(); };
draw();
<\/script>`,
    },
    {
      title: 'A real ISA: RISC-V ADDI encoder',
      explain: `
        <details>
          <summary>The problem: same idea, bigger fields</summary>
          <p>RISC-V packs each instruction into 32 bits. <code>addi rd, rs1, imm</code> means "rd ← rs1 + imm". Its format (called I-type) is: <code>imm[11:0] | rs1 | funct3 | rd | opcode</code>. There are 5 bits per register, because RISC-V has 32 registers (x0–x31), and 12 bits of immediate (−2048 to 2047). The 7-bit opcode <code>0010011</code> plus funct3 <code>000</code> together mean "ADDI".</p>
        </details>
        <details>
          <summary>Step by step: <code>addi x1, x0, 5</code></summary>
          <table>
            <tr><th>Field</th><th>Bits</th><th>Value</th><th>Binary</th></tr>
            <tr><td>imm[11:0]</td><td>31–20</td><td>5</td><td><code>000000000101</code></td></tr>
            <tr><td>rs1</td><td>19–15</td><td>x0 = 0</td><td><code>00000</code></td></tr>
            <tr><td>funct3</td><td>14–12</td><td>ADDI</td><td><code>000</code></td></tr>
            <tr><td>rd</td><td>11–7</td><td>x1 = 1</td><td><code>00001</code></td></tr>
            <tr><td>opcode</td><td>6–0</td><td>OP-IMM</td><td><code>0010011</code></td></tr>
          </table>
          <p>Concatenated: <code>0000 0000 0101 0000 0000 0000 1001 0011</code> = <strong>0x00500093</strong>. Register x0 always reads as 0, so this is how RISC-V does "load the constant 5 into x1". The assembler shortcut <code>li x1, 5</code> produces exactly this word.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Click the preset <code>addi sp, sp, -16</code>. sp is x2, and −16 in 12-bit two's complement is <code>1111 1111 0000</code>. The result <code>0xFF010113</code> starts many compiled RISC-V functions (it reserves 16 bytes of stack).</li>
            <li>Drag the immediate slider and watch only the top 12 bits change. Fixed field positions are what make RISC decoders simple.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>RISC-V <code>addi rd, rs1, imm</code> → 32-bit machine code</h4>
  <p class="note">Same idea as TINY-8, but 32 bits: fixed fields for the opcode, two 5-bit register numbers and a 12-bit immediate.</p>
  <div class="card">
    <div class="row" style="gap:18px;align-items:center">
      <label>rd: x<input id="rd" type="number" min="0" max="31" value="1" style="width:56px"></label>
      <label>rs1: x<input id="rs" type="number" min="0" max="31" value="0" style="width:56px"></label>
      <label>imm: <input id="im" type="range" min="-2048" max="2047" value="5" style="width:200px"> <b id="imv" class="mono"></b></label>
    </div>
    <div style="margin-top:8px">Presets:
      <button data-p="1,0,5">addi x1, x0, 5</button>
      <button data-p="2,2,-16">addi sp, sp, -16</button>
      <button data-p="10,10,1">addi a0, a0, 1</button>
      <button data-p="0,0,0">addi x0, x0, 0 (= nop)</button></div>
    <div id="strip" style="display:flex;margin-top:12px;font:12px ui-monospace,monospace"></div>
    <div id="res" style="margin-top:10px;font-size:16px"></div>
  </div>
</div>
<script>
var F = [['imm[11:0]', 12, '#fde68a'], ['rs1', 5, '#bfdbfe'], ['funct3', 3, '#e9d5ff'], ['rd', 5, '#bbf7d0'], ['opcode', 7, '#fecaca']];
var ABI = ['zero', 'ra', 'sp', 'gp', 'tp', 't0', 't1', 't2', 's0', 's1', 'a0', 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 's11', 't3', 't4', 't5', 't6'];
function g(id) { return document.getElementById(id); }
function draw() {
  var rd = Math.max(0, Math.min(31, +g('rd').value | 0)), rs = Math.max(0, Math.min(31, +g('rs').value | 0)), im = +g('im').value;
  g('imv').textContent = im;
  var vals = [im & 0xFFF, rs, 0, rd, 0x13];
  var word = (((im & 0xFFF) << 20) | (rs << 15) | (0 << 12) | (rd << 7) | 0x13) >>> 0;
  var h = '';
  F.forEach(function (f, i) {
    var b = vals[i].toString(2).padStart(f[1], '0');
    h += '<div style="flex:' + f[1] + ' 1 0;background:' + f[2] + ';border:1px solid #94a3b8;padding:4px 2px;text-align:center"><div style="font-weight:700;font-family:system-ui">' + f[0] + '</div><div style="letter-spacing:1px">' + b + '</div><div style="color:#475569">' + (i === 0 ? im : i === 1 ? 'x' + rs : i === 2 ? 'ADDI' : i === 3 ? 'x' + rd : 'OP-IMM') + '</div></div>';
  });
  g('strip').innerHTML = h;
  g('res').innerHTML = '<span class="mono"><b>addi x' + rd + ', x' + rs + ', ' + im + '</b></span> <span style="color:#64748b">(ABI names: addi ' + ABI[rd] + ', ' + ABI[rs] + ', ' + im + ')</span><br>machine code = <b class="mono" style="font-size:22px">0x' + word.toString(16).toUpperCase().padStart(8, '0') + '</b>' +
    '<div style="font-size:12.5px;color:#64748b;margin-top:4px">Stored in RAM little-endian as bytes: <span class="mono">' + [0, 8, 16, 24].map(function (s) { return ((word >>> s) & 255).toString(16).toUpperCase().padStart(2, '0'); }).join(' ') + '</span></div>';
}
['rd', 'rs', 'im'].forEach(function (id) { g(id).oninput = draw; });
document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = function () { var p = b.dataset.p.split(','); g('rd').value = p[0]; g('rs').value = p[1]; g('im').value = p[2]; draw(); }; });
draw();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'In TINY-8, what is the byte for <code>LDI B, 7</code>?', options: ['0x17', '0x27', '0x72', '0x47'], answer: 1, why: 'LDI B has opcode 2 (0010), operand 7 (0111) → 0010 0111 = 0x27. 0x17 would be LDI A, 7, and 0x47 is LD B, [7].' },
    { q: 'What instruction is <code>0xB5</code>?', options: ['LD A, [5]', 'JMP 5', 'JZ 5', 'OUT'], answer: 1, why: 'B = 1011 = opcode 11 = JMP, operand 5. So PC ← 5.' },
    { q: 'The CPU fetches a byte you meant as data (the number 0x70 = 112). What happens?', options: ['The CPU detects data and skips it', 'It executes it as ADD, because code and data look identical in a von Neumann machine', 'It crashes with an error', 'It prints 112'], answer: 1, why: 'Bytes carry no type. 0x70 has opcode 7 = ADD. Many real-world exploits work this way: they trick the CPU into executing bytes that were supposed to be data.' },
    { q: 'Why can\'t TINY-8 do <code>LDI A, 200</code> in one instruction?', options: ['200 is negative', 'The operand field has only 4 bits (max 15)', 'A can only hold 4 bits', 'LDI only works with B'], answer: 1, why: 'A is 8 bits and holds 200 fine. The instruction format leaves only 4 bits for the number. Workaround: store 200 as a data byte and use LD A, [addr].' },
    { q: 'Which is a key difference between x86 and RISC-V encodings?', options: ['x86 uses decimal, RISC-V binary', 'x86 instructions vary from 1 to 15 bytes, while RISC-V base instructions are a fixed 32 bits', 'RISC-V has no opcodes', 'x86 cannot encode immediates'], answer: 1, why: 'Variable length keeps x86 code compact but makes decoding harder. Fixed-width RISC-V and ARM instructions are easy to decode in parallel.' },
  ],
  exercise: {
    task: `<p>Be the assembler. Encode each TINY-8 instruction as one hex byte in the boxes below, then click <strong>✔ Check</strong>. The bits of your answer and what they decode to are shown live, so you can check yourself as you type.</p>`,
    hint: 'Look up the opcode number (0–F) for the high nibble; the operand (0–15 → 0–F) is the low nibble. SUB and other no-operand instructions have low nibble 0. Example: LDI A, 9 → opcode 1, operand 9 → 0x19.',
    starter: ENC_EX(['', '', '', '', '']),
    solution: ENC_EX(['19', '4E', '80', 'D3', '5C']),
  },
},
// ---------------------------------------------------------------- datapath
{
  id: 'datapath',
  section: 'Building a CPU',
  title: 'The datapath',
  explain: `
    <p>Time to put the components on one board. The <strong>datapath</strong> is every part that holds or transforms data, plus the wires between them:</p>
    <ul>
      <li><strong>Registers:</strong> PC, IR (instruction register), MAR (memory address register), A and B.</li>
      <li>The <strong>ALU</strong> from the arithmetic section (ADD, SUB, AND, OR) and its <strong>flags</strong> register (Z, N, C).</li>
      <li><strong>RAM</strong>: 16 bytes. It always reads or writes the address held in <strong>MAR</strong>.</li>
      <li>An <strong>8-bit bus</strong>: one shared set of 8 wires that connects them all.</li>
    </ul>
    <p>Why a single bus? Wiring every register to every other register would take a huge number of wires. Instead, everyone hangs off the same 8 wires using <strong>tri-state buffers</strong> (from the buses lesson). In each clock tick, exactly one part <strong>drives</strong> the bus (its <code>…_OUT</code> signal is on) and any number of parts <strong>load</strong> from it (their <code>…_IN</code> signal is on, so they store the value at the clock edge). Moving data from A to B is one tick: <code>A_OUT</code> + <code>B_IN</code>.</p>
    <div class="tip">Analogy: the bus is a single conference call. At any moment only one person may talk (drive), and anyone who wants to can take notes (load). The control unit, coming next, is the moderator who says "A, talk now. B, write this down."</div>
    <p>One instruction takes several ticks, called <strong>micro-steps</strong> (T0, T1, …). For TINY-8 every instruction starts the same way:</p>
    <table>
      <tr><th>Tick</th><th>Micro-step</th><th>Drives bus</th><th>Loads</th></tr>
      <tr><td>T0</td><td>MAR ← PC</td><td>PC</td><td>MAR</td></tr>
      <tr><td>T1</td><td>IR ← RAM[MAR], PC ← PC+1</td><td>RAM</td><td>IR (and PC counts up)</td></tr>
      <tr><td>T2</td><td>decode (control unit reads the opcode in IR)</td><td>nothing</td><td>nothing</td></tr>
      <tr><td>T3, T4</td><td>execute: depends on the instruction</td><td>…</td><td>…</td></tr>
    </table>
    <div class="warn">Two parts driving the bus at once is a real short circuit: one pushes a wire to 5 V while the other pulls it to 0 V. The control unit must never allow it.</div>
    <div class="world">
      <ul>
        <li>This one-bus design is close to the classic textbook "SAP-1" computer and to Ben Eater's <a href="https://eater.net/8bit" target="_blank">8-bit breadboard computer</a>. Their buses are literally 8 wires running down the middle of the breadboards.</li>
        <li>Real high-performance cores use many separate buses and multi-ported register files so several transfers can happen in the same tick. Block diagrams of designs like Arm Cortex or AMD Zen show dozens of these paths, but every block is still a register, an ALU, a mux or memory.</li>
        <li>The <a href="http://www.visual6502.org/" target="_blank">Visual 6502</a> project photographed a real 6502 die and simulates its datapath transistor by transistor in your browser. You can watch its buses change in each clock phase.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'Animated datapath: watch the bus',
      explain: `
        <details>
          <summary>The problem: how does <code>ADD</code> actually move bits?</summary>
          <p>"A ← A + B" sounds like one action, but the hardware has to (1) find the instruction, (2) bring it into IR, (3) decode it, and (4) route the ALU result into A. Each of those is a tick where specific parts talk on the bus.</p>
        </details>
        <details>
          <summary>Step by step: program "Add &amp; store", instructions 1 and 3</summary>
          <p>Every tick of the first instruction, <code>LD A, [14]</code> (RAM[14] = 9):</p>
          <table>
            <tr><th>Tick</th><th>Signals</th><th>Bus value</th><th>Effect</th></tr>
            <tr><td>T0</td><td>PC_OUT, MAR_IN</td><td>0</td><td>MAR = 0 (address of the instruction)</td></tr>
            <tr><td>T1</td><td>RAM_OUT, IR_IN, PC_INC</td><td>0x3E</td><td>IR = 0x3E, PC = 1</td></tr>
            <tr><td>T2</td><td>(decode)</td><td>none</td><td>control unit sees opcode 0011 = LD A</td></tr>
            <tr><td>T3</td><td>IR_OUT, MAR_IN</td><td>14</td><td>MAR = 14 (the operand)</td></tr>
            <tr><td>T4</td><td>RAM_OUT, A_IN</td><td>9</td><td>A = 9</td></tr>
          </table>
          <p>And the third instruction, <code>ADD</code> (A = 9, B = 3):</p>
          <table>
            <tr><th>Tick</th><th>Signals</th><th>Bus value</th><th>Effect</th></tr>
            <tr><td>T0</td><td>PC_OUT, MAR_IN</td><td>2</td><td>MAR = 2</td></tr>
            <tr><td>T1</td><td>RAM_OUT, IR_IN, PC_INC</td><td>0x70</td><td>IR = 0x70, PC = 3</td></tr>
            <tr><td>T2</td><td>(decode)</td><td>none</td><td>opcode 0111 = ADD</td></tr>
            <tr><td>T3</td><td>ALU_OUT, A_IN, FLAGS_IN</td><td>12</td><td>A = 12, flags Z=0 N=0 C=0</td></tr>
          </table>
          <p>The ALU is wired <em>directly</em> to A and B, so it always shows A + B. The bus is only needed to carry its result back into A.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Press <strong>⏭ Micro-step</strong> slowly. The <span style="color:#2563eb">blue</span> arrow is the part driving the bus, <span style="color:#16a34a">green</span> arrows are parts loading.</li>
            <li>At <code>ST A, [15]</code>, watch RAM cell 15 turn red: that's a memory <em>write</em> (RAM_IN).</li>
            <li>Switch to the <strong>Counting loop</strong> program. At <code>JMP 2</code>, the IR operand drives the bus into the PC. A jump is just "load PC from the bus".</li>
          </ul>
          <div class="tip">Count ticks: LD takes 5, ADD takes 4. That's why real CPU manuals list a "cycles per instruction" for every opcode.</div>
        </details>
      `,
      code: `${HEAD}
<style>
.dp text { font-family: system-ui, sans-serif; }
.steps td { padding: 2px 7px; font-size: 12.5px; border-top: 1px solid #f0f2f6; }
.steps tr.now td { background: #fde68a; font-weight: 700; }
.steps tr.done td { color: #94a3b8; }
</style>
<div class="w">
  <h4>TINY-8 datapath</h4>
  <p class="note"><b style="color:#2563eb">Blue</b> = drives the bus this tick. <b style="color:#16a34a">Green</b> = loads from the bus at the clock edge. Yellow tags are the control signals that are on.</p>
  <div style="margin-bottom:6px">
    <button id="tk" class="pri">⏭ Micro-step</button> <button id="st">⏩ Step instruction</button> <button id="rs">↺ Reset</button>
    <label style="margin-left:10px">Program <select id="pg"><option value="0">Add &amp; store</option><option value="1">Counting loop</option></select></label>
  </div>
  <div class="row">
    <svg id="dp" class="dp" viewBox="0 0 740 400" style="flex:1 1 600px;max-width:740px;background:#fbfcfe;border:1px solid #e2e5ee;border-radius:10px"></svg>
    <div class="card" style="flex:1 1 220px">
      <b>Current instruction</b>
      <div id="ci" class="mono" style="font-size:15px;margin:4px 0"></div>
      <table class="steps" id="steps" style="border-collapse:collapse"></table>
      <div id="say" style="margin-top:8px;font-size:13px;color:#334155"></div>
    </div>
  </div>
</div>
<script>
${LIB}
var PROGS = [
  ['LD A, [14]', 'LDI B, 3', 'ADD', 'ST A, [15]', 'OUT', 'HLT', '', '', '', '', '', '', '', '', '9', '0'],
  ['LDI A, 1', 'LDI B, 1', 'OUT', 'ADD', 'JMP 2'],
];
var s, info, cur;
function load() {
  var src = PROGS[+document.getElementById('pg').value].map(function (l) { return l || '0'; }).join('\\n');
  s = CPU.create(CPU.assemble(src).bytes); info = null; cur = { pc: 0, ir: null }; draw();
}
var BOX = {
  PC: [220, 30, 110, 50], MAR: [220, 110, 110, 50], RAM: [150, 190, 180, 130], IR: [220, 338, 110, 46], CU: [20, 330, 160, 60],
  A: [430, 30, 110, 50], B: [430, 200, 110, 50], ALU: [590, 105, 120, 70], FL: [640, 215, 90, 44], OUT: [430, 300, 160, 74],
};
var DRV = { PC_OUT: 'PC', RAM_OUT: 'RAM', IR_OUT: 'IR', A_OUT: 'A', ALU_OUT: 'ALU' };
var LDS = { MAR_IN: 'MAR', IR_IN: 'IR', A_IN: 'A', B_IN: 'B', RAM_IN: 'RAM', OUT_IN: 'OUT', PC_LOAD: 'PC' };
function box(k, title, val, extra) {
  var b = BOX[k];
  return '<rect x="' + b[0] + '" y="' + b[1] + '" width="' + b[2] + '" height="' + b[3] + '" rx="8" fill="' + (extra || '#fff') + '" stroke="#334155" stroke-width="2"/>' +
    '<text x="' + (b[0] + 8) + '" y="' + (b[1] + 17) + '" font-size="12.5" font-weight="800" fill="#334155">' + title + '</text>' +
    (val != null ? '<text x="' + (b[0] + b[2] - 8) + '" y="' + (b[1] + b[3] - 12) + '" text-anchor="end" font-size="18" font-weight="800" font-family="ui-monospace,monospace" fill="#0f172a">' + val + '</text>' : '');
}
function stub(k, side, y, role) {
  var b = BOX[k], x1 = side === 'L' ? b[0] + b[2] : b[0], x2 = 380;
  var col = role === 'drv' ? '#2563eb' : role === 'ld' ? '#16a34a' : '#cbd5e1', w = role ? 5 : 3;
  var s2 = '<line x1="' + x1 + '" y1="' + y + '" x2="' + x2 + '" y2="' + y + '" stroke="' + col + '" stroke-width="' + w + '"/>';
  if (role) {
    var tip = role === 'drv' ? x2 : x1, dir = (role === 'drv') === (side === 'L') ? 1 : -1;
    s2 += '<path d="M' + (tip - dir * 12) + ' ' + (y - 7) + ' L' + tip + ' ' + y + ' L' + (tip - dir * 12) + ' ' + (y + 7) + ' Z" fill="' + col + '"/>';
  }
  return s2;
}
function tag(x, y, t) { return '<g><rect x="' + x + '" y="' + (y - 12) + '" width="' + (t.length * 7.2 + 8) + '" height="16" rx="8" fill="#fde68a"/><text x="' + (x + 4) + '" y="' + y + '" font-size="11" font-weight="700" font-family="ui-monospace,monospace" fill="#78350f">' + t + '</text></g>'; }
function draw() {
  var sig = info ? info.sigs : [], on = function (n) { return sig.indexOf(n) >= 0; };
  var role = function (k) { for (var d in DRV) if (DRV[d] === k && on(d)) return 'drv'; for (var l in LDS) if (LDS[l] === k && on(l)) return 'ld'; return null; };
  var busOn = info && info.bus != null;
  var g = '<line x1="380" y1="20" x2="380" y2="392" stroke="' + (busOn ? '#2563eb' : '#94a3b8') + '" stroke-width="' + (busOn ? 12 : 9) + '" stroke-linecap="round"/>';
  g += '<text x="380" y="14" text-anchor="middle" font-size="11.5" font-weight="700" fill="#475066">8-bit BUS' + (busOn ? ' = ' + info.bus + ' (' + CPU.h2(info.bus) + ')' : '') + '</text>';
  g += stub('PC', 'L', 55, role('PC')) + stub('MAR', 'L', 135, role('MAR')) + stub('RAM', 'L', 255, role('RAM')) + stub('IR', 'L', 361, role('IR'));
  g += stub('A', 'R', 55, role('A')) + stub('B', 'R', 225, role('B')) + stub('OUT', 'R', 337, role('OUT'));
  // ALU output path to bus (between A and B)
  var ar = role('ALU');
  g += '<path d="M590 150 H380" fill="none" stroke="' + (ar ? '#2563eb' : '#cbd5e1') + '" stroke-width="' + (ar ? 5 : 3) + '"/>';
  if (ar) g += '<path d="M392 143 L380 150 L392 157 Z" fill="#2563eb"/>';
  // direct wires
  var aluUse = info && info.alu;
  g += '<path d="M540 55 H565 V120 H590" fill="none" stroke="' + (aluUse ? '#7c3aed' : '#cbd5e1') + '" stroke-width="3"/><path d="M540 225 H620 V175" fill="none" stroke="' + (aluUse ? '#7c3aed' : '#cbd5e1') + '" stroke-width="3"/>';
  g += '<path d="M685 175 V215" stroke="' + (on('FLAGS_IN') ? '#16a34a' : '#cbd5e1') + '" stroke-width="' + (on('FLAGS_IN') ? 5 : 3) + '"/>';
  var mr = on('RAM_OUT') || on('RAM_IN');
  g += '<path d="M275 160 V190" stroke="' + (mr ? '#f59e0b' : '#cbd5e1') + '" stroke-width="' + (mr ? 5 : 3) + '"/><text x="282" y="180" font-size="10" fill="#92400e">address</text>';
  g += '<path d="M220 361 H180" stroke="' + (info && info.phase === 'decode' ? '#f59e0b' : '#cbd5e1') + '" stroke-width="' + (info && info.phase === 'decode' ? 5 : 3) + '"/><text x="186" y="355" font-size="10" fill="#92400e">opcode</text>';
  // boxes
  var lit = function (k) { var r = role(k); return r === 'drv' ? '#dbeafe' : r === 'ld' ? '#dcfce7' : '#fff'; };
  g += box('PC', 'PC', s.PC, lit('PC')) + box('MAR', 'MAR', s.MAR, lit('MAR')) + box('A', 'A', s.A, lit('A')) + box('B', 'B', s.B, lit('B'));
  g += box('IR', 'IR', CPU.h2(s.IR), lit('IR')) + '<text x="228" y="378" font-size="10.5" fill="#64748b" font-family="ui-monospace,monospace">' + CPU.dis(s.IR) + '</text>';
  var al = CPU.alu(aluUse || 'ADD', s.A, s.B);
  g += box('ALU', 'ALU ' + (aluUse || ''), null, ar ? '#dbeafe' : '#fff7ed') + '<text x="660" y="145" text-anchor="middle" font-size="12" font-family="ui-monospace,monospace" fill="#475066">' + s.A + ' ' + ({ ADD: '+', SUB: '−', AND: '&amp;', OR: '|' })[aluUse || 'ADD'] + ' ' + s.B + ' = ' + al.r + '</text>';
  g += box('FL', 'FLAGS', null, on('FLAGS_IN') ? '#dcfce7' : '#fff') + ['Z', 'N', 'C'].map(function (f, i) { return '<text x="' + (645 + i * 28) + '" y="250" font-size="11.5" font-weight="800" font-family="ui-monospace,monospace" fill="' + (s[f] ? '#16a34a' : '#94a3b8') + '">' + f + '=' + s[f] + '</text>'; }).join('');
  g += box('OUT', 'OUT display', null, on('OUT_IN') ? '#dcfce7' : '#0f172a').replace('fill="#334155">OUT', 'fill="' + (on('OUT_IN') ? '#334155' : '#94a3b8') + '">OUT') + '<text x="580" y="362" text-anchor="end" font-size="28" font-weight="800" font-family="ui-monospace,monospace" fill="' + (on('OUT_IN') ? '#15803d' : '#4ade80') + '">' + (s.out.length ? s.out[s.out.length - 1] : '—') + '</text>';
  g += box('CU', 'CONTROL UNIT', null, info && info.phase === 'decode' ? '#fef3c7' : '#f8fafc') + '<text x="28" y="372" font-size="11" fill="#475066">' + (info ? info.phase.toUpperCase() + ' (T' + info.t + ')' : 'ready') + '</text>';
  // RAM grid
  g += box('RAM', 'RAM', null, lit('RAM'));
  for (var a = 0; a < 16; a++) {
    var x = 158 + (a % 4) * 43, y = 214 + Math.floor(a / 4) * 25;
    var isM = a === s.MAR && mr, isW = isM && on('RAM_IN');
    g += '<rect x="' + x + '" y="' + y + '" width="40" height="22" rx="4" fill="' + (isW ? '#fecaca' : isM ? '#fde68a' : a === s.PC ? '#e0e7ff' : '#f1f5f9') + '" stroke="' + (a === s.PC ? '#6366f1' : '#e2e8f0') + '"/>' +
      '<text x="' + (x + 3) + '" y="' + (y + 9) + '" font-size="7.5" fill="#94a3b8">' + a + '</text><text x="' + (x + 36) + '" y="' + (y + 17) + '" text-anchor="end" font-size="11" font-family="ui-monospace,monospace" fill="#0f172a">' + CPU.h2(s.mem[a]).slice(2) + '</text>';
  }
  if (on('PC_INC')) g += tag(250, 98, '+1 PC_INC');
  // signal tags near parts
  var spots = { PC_OUT: [335, 47], PC_LOAD: [335, 47], MAR_IN: [335, 127], RAM_OUT: [335, 247], RAM_IN: [335, 247], IR_IN: [335, 353], IR_OUT: [335, 353], A_IN: [430, 22], A_OUT: [430, 22], B_IN: [430, 192], ALU_OUT: [590, 97], FLAGS_IN: [692, 200], OUT_IN: [430, 292], HLT: [28, 350] };
  sig.forEach(function (n) { if (spots[n]) g += tag(spots[n][0], spots[n][1], n); });
  document.getElementById('dp').innerHTML = g;
  // steps panel
  var ir = s.t >= 2 || (info && info.phase !== 'fetch') ? s.IR : null;
  var op = ir == null ? null : ir >> 4;
  var list = [['T0', 'MAR ← PC', 'PC_OUT MAR_IN'], ['T1', 'IR ← RAM[MAR], PC+1', 'RAM_OUT IR_IN PC_INC'], ['T2', 'decode', '—']];
  if (op != null && (s.t >= 3 || s.t === 0 && info && info.phase !== 'fetch')) CPU.EXEC[op].forEach(function (e, i) { list.push(['T' + (3 + i), e.t, e.s.join(' ') + (e.cond ? ' (if ' + e.cond + ')' : '')]); });
  else list.push(['T3…', 'execute (known after decode)', '?']);
  var curT = info ? info.t : -1;
  document.getElementById('steps').innerHTML = list.map(function (r, i) { return '<tr class="' + (i === curT ? 'now' : i < curT ? 'done' : '') + '"><td>' + r[0] + '</td><td>' + r[1] + '</td><td class="mono" style="font-size:11px">' + r[2] + '</td></tr>'; }).join('');
  document.getElementById('ci').textContent = s.halted ? 'HALTED' : info && (info.phase !== 'fetch' || info.t === 1) || s.t >= 2 ? CPU.h2(s.IR) + '  ' + CPU.dis(s.IR) : '(fetching from address ' + s.PC + '…)';
  document.getElementById('say').innerHTML = info ? 'Last tick: <b>' + info.text + '</b>' : 'Press ⏭ Micro-step to run tick T0 of the first instruction.';
  document.getElementById('tk').disabled = document.getElementById('st').disabled = s.halted;
}
document.getElementById('tk').onclick = function () { var i = CPU.tick(s); if (i) info = i; draw(); };
document.getElementById('st').onclick = function () { do { var i = CPU.tick(s); if (i) info = i; } while (s.t !== 0 && !s.halted); draw(); };
document.getElementById('rs').onclick = load;
document.getElementById('pg').onchange = load;
load();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'During one clock tick on a shared bus, how many parts may drive it?', options: ['Any number', 'Exactly one (or none)', 'Two: one source per direction', 'Only registers A and B'], answer: 1, why: 'Two drivers would fight over the wires (a short circuit). Tri-state buffers let all other parts disconnect. Any number of parts may load the value.' },
    { q: 'Why does every instruction start with <code>MAR ← PC</code>?', options: ['To save the PC for later', 'RAM always reads the address in MAR, so the PC value must get there to fetch the instruction', 'To add 1 to the PC', 'Because the ALU needs it'], answer: 1, why: 'The MAR feeds the RAM\'s address input. Copying PC into MAR selects the instruction\'s address; on the next tick RAM_OUT puts that byte on the bus for the IR.' },
    { q: 'In TINY-8, how does the ALU get its inputs for ADD?', options: ['Both through the bus in two ticks', 'Wired directly from registers A and B; only the result uses the bus', 'From RAM', 'From the IR operand'], answer: 1, why: 'A and B are hard-wired into the ALU, so its output is always A op B. ALU_OUT puts that result on the bus, and A_IN stores it.' },
    { q: 'What are the execute micro-steps of <code>JMP 7</code>?', options: ['PC_INC seven times', 'IR_OUT + PC_LOAD: the operand 7 goes over the bus into the PC', 'RAM_OUT + PC_LOAD', 'ALU_OUT + A_IN'], answer: 1, why: 'The target address is the low 4 bits of the IR. IR_OUT drives it onto the bus, and PC_LOAD makes the PC store it. The next fetch then comes from address 7.' },
  ],
  exercise: {
    task: `<p>You are the control unit now. For each instruction, choose which part drives the bus and which parts load in the execute steps <strong>T3</strong> and <strong>T4</strong>, so that the instruction does its job without changing anything else. Fill in the steps in the box below and click <strong>✔ Check</strong>.</p>`,
    hint: 'RAM only knows the address in MAR. After fetch, MAR still points at the instruction itself, so first copy the operand into MAR (drive: IR operand, load: MAR), then read or write RAM[MAR]. OUT needs only one step.',
    starter: DP_EX([]),
    solution: DP_EX([[['IR operand', ['MAR']], ['RAM[MAR]', ['B']]], [['IR operand', ['MAR']], ['A', ['RAM[MAR]']]], [['A', ['OUT']], ['none', []]]]),
  },
},
// ---------------------------------------------------------------- control-unit
{
  id: 'control-unit',
  section: 'Building a CPU',
  title: 'The control unit',
  explain: `
    <p>The datapath can do anything, but only if someone flips the right switches at the right time. That's the <strong>control unit</strong>. Its inputs are the <strong>opcode</strong> (top 4 bits of IR), the <strong>step counter</strong> (which tick T0, T1, T2… of the instruction we're in) and the <strong>flags</strong>. Its outputs are the <strong>control signals</strong>, one wire per switch in the datapath:</p>
    <table>
      <tr><th>TINY-8 signal</th><th>What it does</th><th>Textbook name</th></tr>
      <tr><td><code>PC_OUT</code>, <code>A_OUT</code>, <code>IR_OUT</code>, <code>RAM_OUT</code>, <code>ALU_OUT</code></td><td>enable that part's tri-state buffer onto the bus</td><td>MEM_READ (for RAM_OUT)</td></tr>
      <tr><td><code>A_IN</code>, <code>B_IN</code>, <code>IR_IN</code>, <code>MAR_IN</code></td><td>LOAD input of that register</td><td>REG_WRITE</td></tr>
      <tr><td><code>RAM_IN</code></td><td>write the bus into RAM[MAR]</td><td>MEM_WRITE</td></tr>
      <tr><td><code>PC_INC</code> / <code>PC_LOAD</code></td><td>PC counts up / loads a jump target</td><td>PC_WRITE, BRANCH</td></tr>
      <tr><td><code>ALU_OP</code> (2 bits)</td><td>select ADD / SUB / AND / OR</td><td>ALU_OP</td></tr>
      <tr><td><code>FLAGS_IN</code>, <code>OUT_IN</code>, <code>HLT</code></td><td>latch flags, update the display, stop the clock</td><td></td></tr>
    </table>
    <p>So the control unit is a function: <code>signals = f(opcode, step, flags)</code>, plus a small counter for the step. It's the FSM from the first lesson again: the step counter is the state, and the clock advances it.</p>
    <h3>Two ways to build it</h3>
    <ul>
      <li><strong>Hardwired:</strong> derive a Boolean equation per signal and build it from gates. For example <code>A_IN = T4·LD_A + T3·(LDI_A + ADD + SUB + AND + OR)</code>, where <code>LD_A</code> is one output of a 4→16 decoder on the opcode. Fast, but changing the ISA means redesigning the gates.</li>
      <li><strong>Microcoded:</strong> store the signals in a ROM. The address is <code>opcode × 8 + step</code>, and the data is a <strong>control word</strong> with one bit per signal. Each row of the table below is one ROM word. To change an instruction you change the ROM contents, which is software for the hardware.</li>
    </ul>
    <div class="tip">Both are just the truth table of <code>f(opcode, step, flags)</code>. A ROM <em>is</em> a truth table stored as data, which is exactly how the EEPROM in Ben Eater's breadboard computer is used.</div>
    <div class="warn">Conditional jumps are where the flags come in: <code>PC_LOAD = T3 · (JMP + JZ·Z + JNZ·Z̄ + JC·C)</code>. If the condition is false, the control unit simply doesn't raise PC_LOAD, and the PC keeps the PC+1 it got during fetch.</div>
    <div class="world">
      <ul>
        <li>Intel and AMD x86 CPUs translate most instructions into internal <strong>micro-ops</strong> with fast hardwired decoders. Complex or rare instructions are handled by a <strong>microcode ROM</strong>. That microcode can be <strong>patched</strong>: your BIOS and OS load updates at every boot (on Linux, the <code>intel-ucode</code> / <code>amd-ucode</code> packages).</li>
        <li>Microcode updates were the fix for many hardware security bugs: new branch-speculation controls after <a href="https://en.wikipedia.org/wiki/Spectre_(security_vulnerability)" target="_blank">Spectre</a> (2018), Intel's <a href="https://en.wikipedia.org/wiki/Downfall_(security_vulnerability)" target="_blank">Downfall</a> (2023) and AMD's Zenbleed (2023).</li>
        <li>IBM's System/360 (1964) used microcode so cheap and expensive models could run the same programs. RISC designs (MIPS, most ARM and RISC-V cores) mostly use hardwired control, because their simple instructions don't need microcode.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'Control signal table (= microcode ROM)',
      explain: `
        <details>
          <summary>The problem: which wires go high, and when?</summary>
          <p>Every instruction shares T0 and T1 (fetch) and T2 (decode). After that, the opcode picks which signals fire in T3 and T4. This table shows them for the instruction you pick. Each row is one control word, which is exactly what a microcode ROM stores.</p>
        </details>
        <details>
          <summary>Step by step: reading the <code>LD A, [a]</code> rows</summary>
          <table>
            <tr><th>Step</th><th>Signals = 1</th><th>Meaning</th></tr>
            <tr><td>T0</td><td>PC_OUT, MAR_IN</td><td>address of the instruction → MAR</td></tr>
            <tr><td>T1</td><td>RAM_OUT, IR_IN, PC_INC</td><td>instruction → IR, PC moves on</td></tr>
            <tr><td>T2</td><td>none</td><td>decoder settles on "LD A"</td></tr>
            <tr><td>T3</td><td>IR_OUT, MAR_IN</td><td>operand (the address) → MAR</td></tr>
            <tr><td>T4</td><td>RAM_OUT, A_IN</td><td>RAM[address] → A</td></tr>
          </table>
          <p>Switch to <strong>Hardwired</strong> view: <code>A_IN</code>'s equation contains a <code>T4·LD_A</code> term. That's the same "1" in the table, written as logic.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Pick <code>JZ</code> and toggle the <strong>Z</strong> flag. The PC_LOAD cell switches between <b>1</b> and blocked. That's the only place the flags enter the control unit.</li>
            <li>Compare <code>ADD</code> and <code>SUB</code>: same signals, only the 2-bit ALU_OP field differs.</li>
            <li>Find the instruction with the fewest ticks. <code>HLT</code>, <code>MOV</code>, the ALU ops and the jumps all take 4.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<style>
.ct { border-collapse: collapse; font: 12px ui-monospace, Menlo, monospace; }
.ct th { background: #f1f4f9; padding: 3px 2px; font-weight: 700; border: 1px solid #e2e5ee; }
.ct th.v { writing-mode: vertical-rl; transform: rotate(180deg); height: 72px; font-size: 11px; }
.ct td { border: 1px solid #e2e5ee; text-align: center; padding: 2px 4px; min-width: 22px; }
.ct td.on { background: #fde68a; color: #78350f; font-weight: 800; }
.ct td.blk { background: #fee2e2; color: #b91c1c; }
.ct td.l { text-align: left; font-family: system-ui; white-space: nowrap; }
.ib button { font: 12px ui-monospace, Menlo, monospace; padding: 2px 7px; margin: 1px; }
.ib button.sel { background: #2563eb; color: #fff; border-color: #2563eb; }
.eq { font: 12.5px ui-monospace, Menlo, monospace; line-height: 1.7; }
.eq .hit { background: #fde68a; border-radius: 4px; padding: 0 2px; font-weight: 700; }
</style>
<div class="w">
  <h4>Control unit: opcode + step → control signals</h4>
  <p class="note">Pick an instruction. Yellow cells are signals set to 1 in that tick.</p>
  <div class="ib" id="ib"></div>
  <div style="margin:6px 0">Flags: <label><input type="checkbox" id="fz"> Z</label> <label><input type="checkbox" id="fc"> C</label>
   <span style="margin-left:14px">View: <button id="v1" class="pri">Microcode table</button> <button id="v2">Hardwired equations</button></span></div>
  <div id="view" class="card" style="overflow-x:auto"></div>
</div>
<script>
${LIB}
var op = 3, view = 1;
var NAMES = CPU.OPS.map(function (o) { return o.m.replace(/[ ,]+/g, '_'); });
var ALUC = { ADD: '00', SUB: '01', AND: '10', OR: '11' };
function flags() { return { Z: document.getElementById('fz').checked ? 1 : 0, C: document.getElementById('fc').checked ? 1 : 0 }; }
function rows(o) {
  var r = [{ t: 'T0', e: CPU.FETCH[0] }, { t: 'T1', e: CPU.FETCH[1] }, { t: 'T2', e: { s: [], t: 'decode' } }];
  CPU.EXEC[o].forEach(function (e, i) { r.push({ t: 'T' + (3 + i), e: e }); });
  return r;
}
function drawIB() {
  document.getElementById('ib').innerHTML = CPU.OPS.map(function (o, i) { return '<button data-op="' + i + '" class="' + (i === op ? 'sel' : '') + '">' + i.toString(16).toUpperCase() + ' ' + o.m + '</button>'; }).join('');
}
function table() {
  var f = flags();
  var h = '<table class="ct"><tr><th>step</th><th>micro-step</th>' + CPU.SIGS.map(function (s) { return '<th class="v" title="' + CPU.SIG_DESC[s] + '">' + s + '</th>'; }).join('') + '<th class="v">ALU_OP</th><th>control word (ROM data)</th></tr>';
  rows(op).forEach(function (r, ri) {
    var bits = '';
    h += '<tr><td><b>' + r.t + '</b></td><td class="l">' + r.e.t + '</td>';
    CPU.SIGS.forEach(function (s) {
      var on = r.e.s.indexOf(s) >= 0, blocked = on && r.e.cond && (s === 'PC_LOAD' || s === 'IR_OUT') && !CPU.condOk(f, r.e.cond);
      bits += on && !blocked ? '1' : '0';
      h += '<td class="' + (blocked ? 'blk' : on ? 'on' : '') + '" title="' + s + (blocked ? ': blocked because condition ' + r.e.cond + ' is false' : '') + '">' + (blocked ? '✗' : on ? '1' : '·') + '</td>';
    });
    var a = r.e.alu ? ALUC[r.e.alu] : '00';
    bits += a;
    h += '<td class="' + (r.e.alu ? 'on' : '') + '">' + (r.e.alu ? r.e.alu : '·') + '</td><td class="l mono">' + bits.slice(0, 15).replace(/(.{5})/g, '$1 ') + '| ' + a + ' = 0x' + parseInt(bits, 2).toString(16).toUpperCase().padStart(5, '0') + '</td></tr>';
  });
  var e = CPU.EXEC[op][0];
  h += '</table><div style="margin-top:6px;font-size:12.5px;color:#475066">ROM address for row Tn = opcode × 8 + n = ' + op + ' × 8 + n. ' + (e.cond ? '<b>Conditional:</b> PC_LOAD only fires if ' + e.cond.replace('!Z', 'Z = 0').replace(/^Z$/, 'Z = 1').replace(/^C$/, 'C = 1') + ' (currently ' + (CPU.condOk(flags(), e.cond) ? '<b style="color:#15803d">true → jump</b>' : '<b style="color:#b91c1c">false → no jump</b>') + ').' : '') + '</div>';
  return h;
}
function equations() {
  var f = flags(), out = '';
  CPU.SIGS.forEach(function (s) {
    var terms = [];
    CPU.FETCH.forEach(function (e, i) { if (e.s.indexOf(s) >= 0) terms.push({ txt: 'T' + i, hit: true }); });
    var byStep = {};
    CPU.EXEC.forEach(function (list, o) { list.forEach(function (e, i) { if (e.s.indexOf(s) >= 0) { var k = 'T' + (3 + i); (byStep[k] = byStep[k] || []).push({ n: NAMES[o] + (e.cond && (s === 'PC_LOAD' || s === 'IR_OUT') ? '·' + (e.cond === '!Z' ? 'Z̄' : e.cond) : ''), o: o, ok: !e.cond || CPU.condOk(f, e.cond) || (s !== 'PC_LOAD' && s !== 'IR_OUT') }); } }); });
    Object.keys(byStep).forEach(function (k) {
      var l = byStep[k];
      var inner = l.map(function (x) { return x.o === op && x.ok ? '<span class="hit">' + x.n + '</span>' : x.n; }).join(' + ');
      terms.push({ txt: k + '·' + (l.length > 1 ? '(' + inner + ')' : inner) });
    });
    out += '<div><b>' + s + '</b> = ' + terms.map(function (t) { return t.hit ? '<span class="hit">' + t.txt + '</span>' : t.txt; }).join(' + ') + '</div>';
  });
  return '<div class="eq">' + out + '</div><div style="margin-top:6px;font-size:12.5px;color:#475066">Highlighted = the terms that are true for <b>' + CPU.OPS[op].m + '</b> with the current flags (T0/T1 are true for every instruction). Each name like <code>LD_A</code> is one output of a 4→16 opcode decoder. Each equation is a few AND gates feeding an OR gate.</div>';
}
function draw() { drawIB(); document.getElementById('view').innerHTML = view === 1 ? table() : equations(); document.getElementById('v1').className = view === 1 ? 'pri' : ''; document.getElementById('v2').className = view === 2 ? 'pri' : ''; }
document.getElementById('ib').onclick = function (e) { var b = e.target.closest('button'); if (b) { op = +b.dataset.op; draw(); } };
document.getElementById('fz').onchange = document.getElementById('fc').onchange = draw;
document.getElementById('v1').onclick = function () { view = 1; draw(); };
document.getElementById('v2').onclick = function () { view = 2; draw(); };
draw();
<\/script>`,
    },
    {
      title: 'Hardwired control: the PC_LOAD circuit',
      explain: `
        <details>
          <summary>The problem: turn one equation into gates</summary>
          <p><code>PC_LOAD = EXEC · (JMP + JZ·Z + JNZ·Z̄ + JC·C)</code>. The opcode decoder (a 4→16 decoder; only its 4 jump outputs are drawn) raises exactly one line for the current opcode. AND gates combine each conditional jump with its flag, an OR merges them, and a final AND makes sure it only fires in the execute step (EXEC = "we are in T3").</p>
        </details>
        <details>
          <summary>Step by step: a few cases</summary>
          <table>
            <tr><th>OPCODE</th><th>Instruction</th><th>Z</th><th>C</th><th>EXEC</th><th>PC_LOAD</th><th>Why</th></tr>
            <tr><td>11</td><td>JMP</td><td>any</td><td>any</td><td>1</td><td>1</td><td>unconditional</td></tr>
            <tr><td>12</td><td>JZ</td><td>0</td><td>any</td><td>1</td><td>0</td><td>JZ·Z = 0</td></tr>
            <tr><td>12</td><td>JZ</td><td>1</td><td>any</td><td>1</td><td>1</td><td>JZ·Z = 1</td></tr>
            <tr><td>13</td><td>JNZ</td><td>0</td><td>any</td><td>1</td><td>1</td><td>JNZ·Z̄ = 1</td></tr>
            <tr><td>14</td><td>JC</td><td>any</td><td>1</td><td>1</td><td>1</td><td>JC·C = 1</td></tr>
            <tr><td>7</td><td>ADD</td><td>any</td><td>any</td><td>1</td><td>0</td><td>no jump line is high</td></tr>
            <tr><td>11</td><td>JMP</td><td>any</td><td>any</td><td>0</td><td>0</td><td>wrong step (e.g. during fetch)</td></tr>
          </table>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Set OPCODE to 12 (JZ), EXEC = 1, and toggle Z. Watch the signal flow through one AND gate to the output.</li>
            <li>Turn on 🐢 Slow-mo and change OPCODE: count the gate delays through decoder → AND → OR → AND. That delay limits how fast the clock can tick.</li>
          </ul>
        </details>
      `,
      code: `<div id="c"></div>
<script>
Circ.chip('JDEC', { label: 'OPCODE DECODER', ins: ['O0', 'O1', 'O2', 'O3'], outs: ['JMP', 'JZ', 'JNZ', 'JC'], w: 110, desc: '4→16 decoder, only the jump outputs shown: JMP=1011, JZ=1100, JNZ=1101, JC=1110',
  fn: function (i) { var v = i[0] + 2 * i[1] + 4 * i[2] + 8 * i[3]; return [v === 11 ? 1 : 0, v === 12 ? 1 : 0, v === 13 ? 1 : 0, v === 14 ? 1 : 0]; } });
Circ.mount('#c', {
  title: 'Hardwired PC_LOAD = EXEC · (JMP + JZ·Z + JNZ·Z̄ + JC·C)',
  intro: 'OPCODE is the top 4 bits of IR (11 = JMP, 12 = JZ, 13 = JNZ, 14 = JC). EXEC = 1 during the execute tick.',
  parts: [
    { id: 'op', type: 'NUMIN', label: 'OPCODE', x: 0, y: 0, value: 12 },
    { id: 'dec', type: 'JDEC', x: 120, y: 0 },
    { id: 'z', type: 'IN', label: 'Z', x: 120, y: 150, value: 1 },
    { id: 'cf', type: 'IN', label: 'C', x: 120, y: 230 },
    { id: 'ex', type: 'IN', label: 'EXEC', x: 120, y: 310, value: 1 },
    { id: 'nz', type: 'NOT', x: 220, y: 190 },
    { id: 'az', type: 'AND', x: 340, y: 60 },
    { id: 'anz', type: 'AND', x: 340, y: 140 },
    { id: 'ac', type: 'AND', x: 340, y: 230 },
    { id: 'or', type: 'OR', n: 4, x: 460, y: 80 },
    { id: 'fin', type: 'AND', x: 590, y: 120 },
    { id: 'pl', type: 'OUT', label: 'PC_LOAD', x: 700, y: 120, color: '#2563eb' },
  ],
  wires: [
    ['op.0', 'dec.O0'], ['op.1', 'dec.O1'], ['op.2', 'dec.O2'], ['op.3', 'dec.O3'],
    ['dec.JZ', 'az.0', { mx: 290 }], ['z', 'az.1', { mx: 310 }],
    ['z', 'nz', { mx: 195 }], ['dec.JNZ', 'anz.0', { mx: 280 }], ['nz', 'anz.1', { mx: 320 }],
    ['dec.JC', 'ac.0', { mx: 270 }], ['cf', 'ac.1', { mx: 325 }],
    ['dec.JMP', 'or.0', { mx: 430 }], ['az', 'or.1', { mx: 420 }], ['anz', 'or.2', { mx: 430 }], ['ac', 'or.3', { mx: 440 }],
    ['or', 'fin.0', { mx: 565 }], ['ex', 'fin.1', { mx: 565 }], ['fin', 'pl'],
  ],
});
<\/script>`,
    },
  ],
  quiz: [
    { q: 'What are the inputs of TINY-8\'s control unit?', options: ['Only the clock', 'The opcode, the step counter (T0, T1, …) and the flags', 'Registers A and B', 'The RAM contents'], answer: 1, why: 'signals = f(opcode, step, flags). The step counter is the FSM state; the opcode and flags select which signals fire in each step.' },
    { q: 'In a microcoded control unit, what is stored in the microcode ROM?', options: ['The user\'s program', 'Control words: one bit per control signal, addressed by opcode and step', 'The values of A and B', 'The flag history'], answer: 1, why: 'Address = (opcode, step), data = which signals are on. It\'s the truth table of the control unit stored as data instead of gates.' },
    { q: '<code>JZ 5</code> executes with Z = 0. What does the control unit do in T3?', options: ['Raises PC_LOAD anyway', 'Does not raise PC_LOAD, so the PC keeps the PC+1 from fetch', 'Halts the CPU', 'Sets Z = 1'], answer: 1, why: 'The flags gate PC_LOAD. With the condition false, nothing loads the PC, and the next fetch simply continues with the following instruction.' },
    { q: 'Why can Intel ship a fix for a CPU bug as a "microcode update"?', options: ['Microcode updates replace the transistors', 'Part of the control logic is a writable table of control words, which can be reloaded at boot', 'The OS emulates the whole CPU', 'They can\'t, that is a myth'], answer: 1, why: 'x86 CPUs load patches into their microcode at boot. That changes how certain instructions are sequenced, enough to add new security controls without new silicon.' },
  ],
  exercise: {
    task: `<p>Build TINY-8's jump logic for the three most common jumps: <strong>PC_LOAD = JMP + JZ·Z + JNZ·Z̄</strong>.</p>
      <p>Inputs: decoder lines <code>JMP</code>, <code>JZ</code>, <code>JNZ</code> (1 when that is the current instruction) and the <code>Z</code> flag. Build it in the board below, then click <strong>✔ Check</strong> (it tests all 16 input combinations).</p>`,
    hint: 'You need Z̄ (NOT Z). Then AND(JZ, Z), AND(JNZ, Z̄), and a 3-input OR that combines those with JMP. That is 4 parts.',
    starter: `<div id="c"></div>
<script>
Circ.mount('#c', {
  build: { palette: ['AND', 'OR', 'OR:3', 'NOT'], best: 4 },
  title: 'Jump logic: PC_LOAD = JMP + JZ·Z + JNZ·Z̄',
  target: function (x) { return { PC_LOAD: x.JMP | (x.JZ & x.Z) | (x.JNZ & (1 - x.Z)) }; },
  parts: [
    { id: 'jmp', type: 'IN', label: 'JMP', x: 40, y: 40 },
    { id: 'jz', type: 'IN', label: 'JZ', x: 40, y: 120 },
    { id: 'jnz', type: 'IN', label: 'JNZ', x: 40, y: 200 },
    { id: 'z', type: 'IN', label: 'Z', x: 40, y: 280 },
    { id: 'pl', type: 'OUT', label: 'PC_LOAD', x: 640, y: 150, color: '#2563eb' },
  ],
});
<\/script>`,
    solution: `<div id="c"></div>
<script>
Circ.mount('#c', {
  build: { palette: ['AND', 'OR', 'OR:3', 'NOT'], best: 4 },
  title: 'Jump logic: PC_LOAD = JMP + JZ·Z + JNZ·Z̄',
  target: function (x) { return { PC_LOAD: x.JMP | (x.JZ & x.Z) | (x.JNZ & (1 - x.Z)) }; },
  parts: [
    { id: 'jmp', type: 'IN', label: 'JMP', x: 40, y: 40 },
    { id: 'jz', type: 'IN', label: 'JZ', x: 40, y: 120 },
    { id: 'jnz', type: 'IN', label: 'JNZ', x: 40, y: 200 },
    { id: 'z', type: 'IN', label: 'Z', x: 40, y: 280 },
    { id: 'pl', type: 'OUT', label: 'PC_LOAD', x: 640, y: 150, color: '#2563eb' },
    { id: 'nz', type: 'NOT', x: 180, y: 280 },
    { id: 'a1', type: 'AND', x: 300, y: 130 },
    { id: 'a2', type: 'AND', x: 300, y: 210 },
    { id: 'o3', type: 'OR', n: 3, x: 460, y: 140 },
  ],
  wires: [
    ['z', 'nz'], ['jz', 'a1.0', { mx: 200 }], ['z', 'a1.1', { mx: 150 }],
    ['jnz', 'a2.0', { mx: 200 }], ['nz', 'a2.1', { mx: 270 }],
    ['jmp', 'o3.0', { mx: 420 }], ['a1', 'o3.1'], ['a2', 'o3.2', { mx: 410 }], ['o3', 'pl'],
  ],
});
<\/script>`,
  },
},
// ---------------------------------------------------------------- fetch-decode-execute
{
  id: 'fetch-decode-execute',
  section: 'Building a CPU',
  title: 'Fetch → decode → execute',
  explain: `
    <p>All the pieces are in place: the PC, the instruction encoding, the datapath and the control unit. Connect a clock and the machine runs one loop, over and over, until it reaches <code>HLT</code>:</p>
    <pre><code>while (!halted) {
  IR = RAM[PC];  PC = PC + 1;     // ① FETCH    (T0, T1)
  op = IR &gt;&gt; 4;  x = IR &amp; 0xF;    // ② DECODE   (T2)
  switch (op) { … }               // ③ EXECUTE  (T3, T4)
}</code></pre>
    <p>That's the <strong>instruction cycle</strong>, also called the <strong>fetch–decode–execute cycle</strong>. It's the heartbeat of every CPU ever made. Below is the complete TINY-8, built from everything in this course: registers, the ALU, RAM, the PC with its MUX, and the microcode from the last lesson. It runs a program that adds two numbers stored in RAM.</p>
    <div class="tip">Notice that the PC is incremented during <em>fetch</em>, before the instruction executes. So while an instruction runs, the PC already points to the <em>next</em> one. A jump then simply overwrites it. (Real CPUs do the same: on x86, <code>RIP</code>-relative addresses are measured from the next instruction.)</div>
    <div class="warn">The CPU doesn't "know" where your program ends. Without <code>HLT</code> it keeps fetching whatever follows, here the data bytes, and executes them as instructions. 0x07 would run as <code>HLT</code> by luck, but 0x70 would run as <code>ADD</code>.</div>
    <div class="world">
      <ul>
        <li>Every CPU in your laptop, phone and car does this loop. A 4 GHz core ticks 4 billion times per second, and modern cores fetch, decode and execute <strong>several</strong> instructions per tick (more in the last lesson).</li>
        <li>The <a href="https://en.wikipedia.org/wiki/MOS_Technology_6502" target="_blank">6502</a> in the Apple II ran at about 1.02 MHz and needed 2–7 clock cycles per instruction, very much like TINY-8's 4–5.</li>
        <li>Emulators (for the NES, Game Boy, or QEMU for whole PCs) are this loop written in software: <code>fetch</code>, <code>switch (opcode)</code>, repeat.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'THE CPU SIMULATOR: TINY-8',
      explain: `
        <details>
          <summary>The problem: compute x + y and store the result</summary>
          <p>RAM holds a 6-instruction program at addresses 0–5 and data at 13–15 (<code>sum = 0</code>, <code>x = 7</code>, <code>y = 5</code>). The program is <code>LD A,[x]</code> · <code>LD B,[y]</code> · <code>ADD</code> · <code>ST A,[sum]</code> · <code>OUT</code> · <code>HLT</code>. When it finishes, RAM[13] = 12 and the display shows 12.</p>
        </details>
        <details>
          <summary>Step by step: every instruction (press ⏩ Step instruction)</summary>
          <table>
            <tr><th>#</th><th>PC before</th><th>IR</th><th>Instruction</th><th>PC after</th><th>A</th><th>B</th><th>Z N C</th><th>OUT</th><th>Clock ticks</th></tr>
            <tr><td>1</td><td>0</td><td>0x3E</td><td>LD A, [14]</td><td>1</td><td>7</td><td>0</td><td>0 0 0</td><td>—</td><td>1–5</td></tr>
            <tr><td>2</td><td>1</td><td>0x4F</td><td>LD B, [15]</td><td>2</td><td>7</td><td>5</td><td>0 0 0</td><td>—</td><td>6–10</td></tr>
            <tr><td>3</td><td>2</td><td>0x70</td><td>ADD</td><td>3</td><td>12</td><td>5</td><td>0 0 0</td><td>—</td><td>11–14</td></tr>
            <tr><td>4</td><td>3</td><td>0x5D</td><td>ST A, [13]</td><td>4</td><td>12</td><td>5</td><td>0 0 0</td><td>—</td><td>15–19</td></tr>
            <tr><td>5</td><td>4</td><td>0xF0</td><td>OUT</td><td>5</td><td>12</td><td>5</td><td>0 0 0</td><td>12</td><td>20–23</td></tr>
            <tr><td>6</td><td>5</td><td>0x00</td><td>HLT</td><td>6</td><td>12</td><td>5</td><td>0 0 0</td><td>12</td><td>24–27</td></tr>
          </table>
          <p>Total: 6 instructions in 27 clock ticks. After HLT the PC is 6, because fetch already incremented it.</p>
        </details>
        <details>
          <summary>Step by step: the ticks of instruction 1 (press ⏭ Micro-step)</summary>
          <table>
            <tr><th>Tick</th><th>Phase</th><th>Control signals</th><th>Bus</th><th>Result</th></tr>
            <tr><td>T0</td><td>fetch</td><td>PC_OUT, MAR_IN</td><td>0</td><td>MAR = 0</td></tr>
            <tr><td>T1</td><td>fetch</td><td>RAM_OUT, IR_IN, PC_INC</td><td>62 = 0x3E</td><td>IR = 0x3E, PC = 1</td></tr>
            <tr><td>T2</td><td>decode</td><td>none</td><td>—</td><td>opcode 0011 = LD A, operand 14</td></tr>
            <tr><td>T3</td><td>execute</td><td>IR_OUT, MAR_IN</td><td>14</td><td>MAR = 14</td></tr>
            <tr><td>T4</td><td>execute</td><td>RAM_OUT, A_IN</td><td>7</td><td>A = 7</td></tr>
          </table>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Click the hex cell of address 14 (<code>x</code>), type <code>FF</code> and press Enter, then Reset and Run. 255 + 5 overflows: OUT shows 4 and the <strong>C</strong> flag lights up.</li>
            <li>Change address 2 from <code>70</code> (ADD) to <code>90</code> (AND) or <code>A0</code> (OR). Same program, different ALU operation.</li>
            <li>Change address 5 from <code>00</code> (HLT) to <code>B0</code> (JMP 0). Now the program loops forever, adding and storing again and again.</li>
          </ul>
          <div class="tip">Common mistake: expecting "Step instruction" to show the fetch. Use <strong>⏭ Micro-step</strong> and watch the phase bar: ① FETCH lights for 2 ticks, ② DECODE for 1, ③ EXECUTE for 1–2.</div>
        </details>
      `,
      code: `${HEAD}
<div class="w"><div id="sim"></div></div>
<script>
${LIB}
CpuSim.mount('#sim', { bytes: ${JSON.stringify(ADD_PROG)}, labels: ${JSON.stringify(ADD_LABELS)}, dataLabels: [13, 14, 15], editable: true,
  title: 'TINY-8 computer: program = add x + y',
  note: '⏭ Micro-step = one clock tick. ⏩ = one whole instruction. ▶ Run uses the speed slider. The <b>PC▶</b> row is the next instruction to fetch. You can click any <b>hex</b> cell to change RAM.' });
<\/script>`,
    },
    {
      title: 'How fast is "fast"?',
      explain: `
        <details>
          <summary>What this shows</summary>
          <p>TINY-8 needs a fixed number of clock ticks per program (27 for the adder). Multiply by the clock period to get the run time. Real CPUs differ in two ways: the clock (Hz) and the work done per tick (instructions per cycle, IPC).</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Pick "hand-cranked" (pressing a button once per second, like Ben Eater's manual clock mode). The adder takes 27 seconds.</li>
            <li>Pick 4 GHz with IPC 4: in one second it could run the adder about 600 million times.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>Clock speed calculator</h4>
  <div class="card">
    <div class="row" style="align-items:center">
      <label>Program <select id="pr"><option value="27">add x + y (27 ticks)</option><option value="423">sum 1..10 loop (423 ticks)</option><option value="368">Fibonacci to 144 (368 ticks)</option></select></label>
      <label>Clock <select id="hz">
        <option value="1">hand-cranked: 1 Hz</option>
        <option value="1022727">Apple II 6502: 1.023 MHz</option>
        <option value="1789773">NES 2A03: 1.79 MHz</option>
        <option value="4000000000" selected>modern desktop: 4 GHz</option></select></label>
      <label>instructions per tick <select id="ipc"><option value="1">TINY-8 style (1 tick = 1 micro-step)</option><option value="4">modern superscalar (≈ 4× more work per tick)</option></select></label>
    </div>
    <div id="o" style="margin-top:10px;font-size:16px"></div>
  </div>
</div>
<script>
function fmt(t) { if (t >= 1) return t.toFixed(2) + ' s'; if (t >= 1e-3) return (t * 1e3).toFixed(2) + ' ms'; if (t >= 1e-6) return (t * 1e6).toFixed(2) + ' µs'; return (t * 1e9).toFixed(2) + ' ns'; }
function draw() {
  var ticks = +document.getElementById('pr').value, hz = +document.getElementById('hz').value, ipc = +document.getElementById('ipc').value;
  var t = ticks / hz / ipc;
  document.getElementById('o').innerHTML = 'One clock tick lasts <b>' + fmt(1 / hz) + '</b>.<br>The program takes <b>' + fmt(t) + '</b>.<br>It could run <b>' + Math.floor(1 / t).toLocaleString() + '</b> times per second.' +
    '<div style="font-size:12.5px;color:#64748b;margin-top:6px">In 1 ns, light travels about 30 cm. At 4 GHz a signal can only cross a few centimetres of wire per tick, which is one reason chips are small and dense.</div>';
}
['pr', 'hz', 'ipc'].forEach(function (id) { document.getElementById(id).onchange = draw; });
draw();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'What happens during the FETCH phase?', options: ['The ALU computes', 'The byte at RAM[PC] is copied into IR and the PC is incremented', 'The opcode is split from the operand', 'The result is written to RAM'], answer: 1, why: 'Fetch = MAR ← PC, then IR ← RAM[MAR] and PC ← PC + 1. Decode then looks at IR; execute does the work.' },
    { q: 'While <code>ADD</code> at address 2 is executing, what is the PC?', options: ['2', '3', '0', 'Undefined'], answer: 1, why: 'The PC was incremented during fetch (T1), so it already points to the next instruction, address 3.' },
    { q: 'How many clock ticks does the adder program take on TINY-8?', options: ['6 (one per instruction)', '27', '16', '3'], answer: 1, why: 'LD 5 + LD 5 + ADD 4 + ST 5 + OUT 4 + HLT 4 = 27. Each instruction takes several micro-steps.' },
    { q: 'You change RAM[5] from <code>00</code> (HLT) to <code>B0</code>. What happens?', options: ['Syntax error', 'JMP 0: the program restarts forever', 'The CPU halts at address 0', 'Nothing, data cannot be changed'], answer: 1, why: '0xB0 = opcode B (JMP), operand 0. After OUT, the PC jumps back to 0 and the program runs again and again.' },
  ],
  exercise: {
    task: `<p>The CPU below is loaded with the add program. <strong>Patch the machine code</strong> (click hex cells, type, press Enter) so it computes <strong>9 − 4</strong> and shows <strong>5</strong> on OUT:</p>
      <ul>
        <li>change the data bytes <code>x</code> and <code>y</code>,</li>
        <li>and change one instruction byte so the ALU subtracts instead of adding.</li>
      </ul>
      <p>Run it to test, then click <strong>✔ Check</strong>.</p>`,
    hint: 'x is address 14 → 09, y is address 15 → 04. ADD is 0x70 at address 2; SUB has opcode 8, so the byte is 0x80.',
    starter: FDE_EX(ADD_PROG),
    solution: FDE_EX([0x3E, 0x4F, 0x80, 0x5D, 0xF0, 0x00, 0, 0, 0, 0, 0, 0, 0, 0, 9, 4]),
  },
},
// ---------------------------------------------------------------- jumps-loops
{
  id: 'jumps-loops',
  section: 'Building a CPU',
  title: 'Jumps, conditions & loops',
  explain: `
    <p>A CPU that only runs top to bottom is a calculator. What turns it into a computer is the <strong>conditional jump</strong>: "load the PC with a new address <em>only if</em> a flag is set". With that one trick you can build every <code>if</code>, <code>while</code>, <code>for</code> and recursive function.</p>
    <h3>Flags carry the "condition"</h3>
    <p>Every ALU instruction (ADD, SUB, AND, OR) updates the flags. The next conditional jump reads them:</p>
    <table>
      <tr><th>Flag</th><th>Set to 1 when the ALU result…</th><th>Jump that uses it</th></tr>
      <tr><td><b>Z</b> (zero)</td><td>is 0</td><td><code>JZ a</code> (jump if zero), <code>JNZ a</code> (jump if not zero)</td></tr>
      <tr><td><b>C</b> (carry)</td><td>ADD went past 255, or SUB borrowed (A &lt; B)</td><td><code>JC a</code></td></tr>
      <tr><td><b>N</b> (negative)</td><td>has bit 7 set</td><td>(no TINY-8 jump, but real CPUs have one)</td></tr>
    </table>
    <p>So <code>if (a == b)</code> compiles to "<code>SUB</code> then <code>JZ</code>": subtract and check whether the result was zero. <code>if (a &lt; b)</code> is "<code>SUB</code> then <code>JC</code>", because a borrow means A was smaller.</p>
    <h3>The two loop shapes</h3>
    <pre><code>// while: test at the top                     // do-while: test at the bottom
loop:  (set flags from n)                      loop:  body…
       JZ done        ; exit if n == 0                (ALU op sets flags)
       body…                                          JNZ loop  ; repeat if n != 0
       JMP loop
done:</code></pre>
    <div class="tip">Compilers like GCC and Clang often turn a <code>while</code> into the bottom-tested shape ("loop inversion"), with one check before the loop starts. That runs only one jump per iteration instead of two.</div>
    <div class="warn">The flags are only as fresh as the last ALU instruction. On TINY-8, <code>LD</code> and <code>LDI</code> do <em>not</em> touch the flags, so you can't test a value right after loading it. That's why the <code>while</code> example does <code>OR</code> with B = 0: <code>n | 0 = n</code>, but it sets Z. x86 compilers do the same with <code>test eax, eax</code>.</div>
    <div class="world">
      <ul>
        <li><strong>Branch prediction:</strong> a modern CPU starts fetching instructions <em>before</em> it knows whether a jump is taken. It guesses, using predictor tables that remember each branch's history. Good predictors are right more than 95% of the time on typical code. A wrong guess throws away work, often 15–20 clock cycles on deep pipelines.</li>
        <li>That's the famous Stack Overflow question "<a href="https://stackoverflow.com/questions/11227809" target="_blank">Why is processing a sorted array faster than an unsorted array?</a>": on sorted data the <code>if (x &gt;= 128)</code> branch becomes predictable.</li>
        <li>Branch prediction also enabled the <strong>Spectre</strong> attacks: code that is executed speculatively after a wrong guess still leaves traces in the cache.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'A C while loop, compiled',
      explain: `
        <details>
          <summary>The problem: <code>while (n != 0) { print(n); n = n - 1; }</code></summary>
          <p>The C loop has three parts: a <strong>test</strong> at the top, a <strong>body</strong>, and an implicit <strong>jump back</strong>. In assembly each part is explicit: <code>LDI B,0 · OR · JZ done</code> is the test, <code>OUT · LDI B,1 · SUB</code> is the body, and <code>JMP loop</code> jumps back. The highlighted C line follows the PC.</p>
        </details>
        <details>
          <summary>Step by step: the trace with n = 3</summary>
          <table>
            <tr><th>Instr #</th><th>PC</th><th>Instruction</th><th>A</th><th>B</th><th>Z</th><th>OUT</th><th>Jump?</th></tr>
            <tr><td>1</td><td>0</td><td>LDI A, 3</td><td>3</td><td>0</td><td>0</td><td></td><td></td></tr>
            <tr><td>2–4</td><td>1–3</td><td>LDI B,0 · OR · JZ 8</td><td>3</td><td>0</td><td>0</td><td></td><td>JZ not taken</td></tr>
            <tr><td>5–7</td><td>4–6</td><td>OUT · LDI B,1 · SUB</td><td>2</td><td>1</td><td>0</td><td>3</td><td></td></tr>
            <tr><td>8</td><td>7</td><td>JMP 1</td><td>2</td><td>1</td><td>0</td><td></td><td>always → PC = 1</td></tr>
            <tr><td>9–15</td><td>1–7</td><td>second pass</td><td>1</td><td>1</td><td>0</td><td>2</td><td>JZ not taken</td></tr>
            <tr><td>16–22</td><td>1–7</td><td>third pass (SUB makes A = 0)</td><td>0</td><td>1</td><td><b>1</b></td><td>1</td><td>JZ not taken</td></tr>
            <tr><td>23–25</td><td>1–3</td><td>LDI B,0 · OR · JZ 8</td><td>0</td><td>0</td><td>1</td><td></td><td><b>JZ taken → PC = 8</b></td></tr>
            <tr><td>26</td><td>8</td><td>HLT</td><td>0</td><td>0</td><td>1</td><td>3, 2, 1</td><td></td></tr>
          </table>
          <p>26 instructions, 104 clock ticks. The JZ ran 4 times: 3 not taken, 1 taken.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Change address 0 from <code>13</code> to <code>15</code> (LDI A, 5), then Reset and Run. It prints 5…1.</li>
            <li>Change it to <code>10</code> (n = 0). The body never runs, because the test at the top fails immediately. That's the difference between <code>while</code> and <code>do-while</code>.</li>
            <li>Watch the "Loop stats" panel. Every iteration costs a conditional jump <em>and</em> a JMP.</li>
          </ul>
        </details>
      `,
      code: LOOP_W({
        title: 'while (n != 0): C beside assembly',
        note: 'Press ⏩ Step instruction. The highlighted C line and assembly line follow the PC. Edit the hex at address 0 to change the start value.',
        src: 'start: LDI A, 3     ; n = 3\nloop:  LDI B, 0     ; B = 0 for the test\n       OR          ; n | 0 -> sets Z if n == 0\n       JZ done     ; exit the loop\n       OUT         ; print(n)\n       LDI B, 1\n       SUB         ; n = n - 1\n       JMP loop    ; back to the test\ndone:  HLT',
        c: ['int n = 3;', 'while (n != 0) {', '    print(n);', '    n = n - 1;', '}', '// done'],
        map: [0, 1, 1, 1, 2, 3, 3, 4, 5],
      }),
    },
    {
      title: 'Multiply by repeated addition',
      explain: `
        <details>
          <summary>The problem: TINY-8 has no MUL instruction</summary>
          <p>3 × 4 = 3 + 3 + 3 + 3. Keep a running total <code>res</code> and a counter <code>cnt</code> in RAM. Add <code>x</code> to <code>res</code>, subtract 1 from <code>cnt</code>, and repeat while <code>cnt != 0</code>. The early ARM1 (1985) had no multiply instruction at all; ARM2 added one.</p>
        </details>
        <details>
          <summary>Step by step: the state after each iteration</summary>
          <table>
            <tr><th>Iteration</th><th>res (RAM[14])</th><th>cnt (RAM[13])</th><th>Z after SUB</th><th>JNZ 0</th></tr>
            <tr><td>start</td><td>0</td><td>4</td><td>0</td><td></td></tr>
            <tr><td>1</td><td>3</td><td>3</td><td>0</td><td>taken</td></tr>
            <tr><td>2</td><td>6</td><td>2</td><td>0</td><td>taken</td></tr>
            <tr><td>3</td><td>9</td><td>1</td><td>0</td><td>taken</td></tr>
            <tr><td>4</td><td>12</td><td>0</td><td><b>1</b></td><td><b>not taken</b> → falls through to address 9</td></tr>
          </table>
          <p>Then <code>LD A,[res] · OUT · HLT</code> prints 12. In total: 39 instructions in 177 clock ticks. Each extra unit of <code>cnt</code> costs 9 more instructions.</p>
        </details>
        <details>
          <summary>Common mistake: cnt = 0</summary>
          <p>This is a do-while: the body runs <em>before</em> the test. Set address 13 (<code>cnt</code>) to <code>00</code> and run. SUB turns 0 into 255 (with C = 1), Z stays 0, and the loop keeps going: 256 iterations instead of 0. The printed answer happens to be right anyway (3 × 256 wraps to 0 in 8 bits), but it took about 2,300 instructions. In a loop with a visible side effect, like printing, the bug would be obvious. Real compilers add a guard <code>if (cnt == 0) skip</code> before a bottom-tested loop.</p>
        </details>
      `,
      code: LOOP_W({
        title: 'res = x × cnt by repeated addition',
        note: 'Data lives in RAM at x (12), cnt (13) and res (14). Change them in the hex column, then ↺ Reset and ▶ Run.',
        src: 'loop:  LD A, [res]   ; res = res + x\n       LD B, [x]\n       ADD\n       ST A, [res]\n       LD A, [cnt]   ; cnt = cnt - 1\n       LDI B, 1\n       SUB\n       ST A, [cnt]\n       JNZ loop      ; repeat while cnt != 0\n       LD A, [res]\n       OUT           ; print(res)\n       HLT\nx:     3\ncnt:   4\nres:   0',
        c: ['int x = 3, cnt = 4, res = 0;', 'do {', '    res = res + x;', '    cnt = cnt - 1;', '} while (cnt != 0);', 'print(res);'],
        map: [2, 2, 2, 2, 3, 3, 3, 3, 4, 5, 5, 5],
        data: [12, 13, 14],
      }),
    },
    {
      title: 'Branch prediction: guessing the jump',
      explain: `
        <details>
          <summary>The problem: fast CPUs can't wait for the flags</summary>
          <p>A pipelined CPU fetches the next instruction while the jump is still being worked out (next lesson). So it must <em>guess</em> the next PC. This widget feeds three simple predictors the same sequence of branch outcomes (T = taken, N = not taken):</p>
          <ul>
            <li><b>Always taken</b>: the simplest static guess. Loops jump back most of the time.</li>
            <li><b>1-bit</b>: predict whatever happened last time.</li>
            <li><b>2-bit counter</b>: a tiny 4-state FSM (strongly/weakly taken/not-taken). It must be wrong <em>twice</em> in a row to change its mind.</li>
          </ul>
        </details>
        <details>
          <summary>Step by step: a loop branch that runs 8 times (T T T T T T T N)</summary>
          <table>
            <tr><th>Predictor</th><th>Misses per 8 branches</th><th>Accuracy</th><th>Why</th></tr>
            <tr><td>Always taken</td><td>1</td><td>87.5%</td><td>wrong only at the loop exit</td></tr>
            <tr><td>1-bit</td><td>2</td><td>75%</td><td>wrong at the exit, then wrong again at the next first iteration</td></tr>
            <tr><td>2-bit</td><td>1</td><td>87.5%</td><td>the single N only moves it to "weakly taken"</td></tr>
          </table>
          <p>Accuracy settles at these values after a couple of loops. The first iterations depend on the starting state.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Pick <b>random</b> and press Run 50 a few times: every predictor drops to about 50%. Unpredictable data defeats prediction, which is why sorting can make code faster.</li>
            <li>Try <b>alternating</b> T N T N: the 1-bit predictor is wrong almost every time.</li>
          </ul>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>Branch predictor race</h4>
  <p class="note">Each step = the CPU reaches one conditional jump. Green = correct guess, red = miss (the pipeline must be flushed).</p>
  <div style="margin-bottom:6px">Pattern <select id="pat"><option value="loop">loop of 8: TTTTTTTN …</option><option value="always">always taken</option><option value="alt">alternating T N</option><option value="rand">random 50/50</option></select>
    <button id="s1" class="pri">Step 1</button> <button id="s50">Run 50</button> <button id="rs">↺ Reset</button> <span id="cnt" style="margin-left:8px;color:#64748b"></span></div>
  <div id="rows"></div>
  <div class="card" style="margin-top:8px"><b>2-bit counter state</b> (it is a state machine!)<div id="fsm" style="display:flex;gap:6px;margin-top:6px"></div></div>
</div>
<script>
var P = [
  { name: 'Always taken', pred: function () { return 1; }, upd: function () {} },
  { name: '1-bit (last outcome)', st: 1, pred: function () { return this.st; }, upd: function (t) { this.st = t; } },
  { name: '2-bit counter', st: 2, pred: function () { return this.st >= 2 ? 1 : 0; }, upd: function (t) { this.st = Math.max(0, Math.min(3, this.st + (t ? 1 : -1))); } },
];
var hist, i, rnd;
function outcome(k) { var p = document.getElementById('pat').value; if (p === 'loop') return k % 8 === 7 ? 0 : 1; if (p === 'always') return 1; if (p === 'alt') return k % 2 ? 0 : 1; return Math.random() < 0.5 ? 1 : 0; }
function reset() { i = 0; P[1].st = 1; P[2].st = 2; hist = P.map(function () { return []; }); draw(); }
function step() { var t = outcome(i++); P.forEach(function (p, k) { var g = p.pred(); hist[k].push({ g: g, t: t }); p.upd(t); }); }
function draw() {
  document.getElementById('rows').innerHTML = P.map(function (p, k) {
    var h = hist[k], ok = h.filter(function (x) { return x.g === x.t; }).length;
    var cells = h.slice(-60).map(function (x) { return '<span title="guess ' + (x.g ? 'T' : 'N') + ', actual ' + (x.t ? 'T' : 'N') + '" style="display:inline-block;width:12px;height:18px;margin:1px;border-radius:2px;background:' + (x.g === x.t ? '#22c55e' : '#ef4444') + ';color:#fff;font:9px/18px ui-monospace,monospace;text-align:center">' + (x.t ? 'T' : 'N') + '</span>'; }).join('');
    return '<div class="card" style="margin-bottom:6px"><div style="display:flex;justify-content:space-between"><b>' + p.name + '</b><span>accuracy <b>' + (h.length ? (100 * ok / h.length).toFixed(1) + '%' : '—') + '</b> (' + ok + '/' + h.length + ')</span></div><div style="margin-top:3px;min-height:20px">' + cells + '</div></div>';
  }).join('');
  var names = ['strongly not-taken', 'weakly not-taken', 'weakly taken', 'strongly taken'];
  document.getElementById('fsm').innerHTML = names.map(function (n, k) { var on = P[2].st === k; return '<div style="flex:1;text-align:center;padding:6px;border-radius:8px;border:2px solid ' + (on ? '#2563eb' : '#e2e5ee') + ';background:' + (on ? '#dbeafe' : '#fff') + ';font-size:12.5px"><b>' + k.toString(2).padStart(2, '0') + '</b><br>' + n + '<br><span style="color:#64748b">predict ' + (k >= 2 ? 'T' : 'N') + '</span></div>'; }).join('<div style="align-self:center;color:#94a3b8">⇄</div>');
  document.getElementById('cnt').textContent = 'branches so far: ' + i;
}
document.getElementById('s1').onclick = function () { step(); draw(); };
document.getElementById('s50').onclick = function () { for (var k = 0; k < 50; k++) step(); draw(); };
document.getElementById('rs').onclick = reset;
document.getElementById('pat').onchange = reset;
reset();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'Which pair implements <code>if (a == b) goto L</code> on TINY-8 (A = a, B = b)?', options: ['ADD then JC L', 'SUB then JZ L', 'OR then JNZ L', 'SUB then JC L'], answer: 1, why: 'a − b is 0 exactly when a == b, so SUB sets Z = 1 and JZ jumps. SUB + JC would test a < b.' },
    { q: 'Why does the while-loop example execute <code>OR</code> with B = 0?', options: ['To clear A', 'Because LDI does not set flags; OR with 0 leaves A unchanged but sets Z from it', 'To set the carry flag', 'OR is faster than SUB'], answer: 1, why: 'Only ALU instructions update the flags. A | 0 = A, so the value survives and Z tells you whether it is 0. x86 does the same with test eax, eax.' },
    { q: 'A do-while countdown starts with cnt = 0 and uses <code>SUB</code> + <code>JNZ</code>. What happens?', options: ['The loop body never runs', 'It runs once', 'cnt wraps to 255 and the loop runs 256 times', 'The CPU halts with an error'], answer: 2, why: 'The body runs before the first test. 0 − 1 = 255 in 8 bits (C = 1, Z = 0), so the loop continues for 255 more iterations.' },
    { q: 'Why do CPUs predict branches?', options: ['To save RAM', 'To keep fetching instructions before the jump outcome is known, instead of stalling', 'To make programs deterministic', 'Because flags are slow to read from RAM'], answer: 1, why: 'In a pipeline the next instructions are fetched while the branch is still in flight. Guessing well keeps the pipeline full; a miss costs a flush.' },
  ],
  exercise: {
    task: `<p>Both programs below should print <strong>5, 4, 3, 2, 1</strong> and then halt. Pick the right jump instruction and target for each blank in the box below, then click <strong>✔ Check</strong>. The checker runs each program on TINY-8.</p>
      <ul><li><b>Program 1:</b> one conditional jump at the bottom (a do-while).</li><li><b>Program 2:</b> leave the loop when A hits 0, otherwise jump back.</li></ul>`,
    hint: 'After SUB, Z = 1 exactly when A became 0. Program 1: "jump back to OUT (address 2) if not zero". Program 2: "if zero, jump to HLT (address 6)", followed by an unconditional jump back to address 2.',
    starter: JMP_EX(['JMP', 0], ['JMP', 0], ['JMP', 0]),
    solution: JMP_EX(['JNZ', 2], ['JZ', 6], ['JMP', 2]),
  },
},
// ---------------------------------------------------------------- assembly
{
  id: 'assembly',
  section: 'Building a CPU',
  title: 'Writing assembly',
  explain: `
    <p>Typing hex bytes gets old fast. <strong>Assembly language</strong> gives every byte a readable name, and an <strong>assembler</strong> program converts it back to machine code. It's the thinnest possible layer above the hardware: each line still becomes exactly one byte in RAM.</p>
    <h3>TINY-8 assembly syntax</h3>
    <pre><code>; comments start with a semicolon
loop:   LD A, [count]    ; "loop:" is a LABEL = the address of this byte
        LDI B, 1         ; immediate number 0–15
        SUB              ; A = A − B, sets flags
        ST A, [count]    ; [ ] = memory at that address
        JNZ loop         ; labels work as jump targets…
        HLT
count:  DB 3             ; …and as data addresses. DB = "define byte"</code></pre>
    <p>The assembler works in <strong>two passes</strong>:</p>
    <ol>
      <li><strong>Pass 1:</strong> walk the lines and count bytes, recording each label's address (<code>loop</code> = 0, <code>count</code> = 6).</li>
      <li><strong>Pass 2:</strong> encode each line, replacing labels with their addresses: <code>JNZ loop</code> → <code>JNZ 0</code> → <code>0xD0</code>.</li>
    </ol>
    <p>Two passes are needed because a jump can refer to a label that appears <em>later</em> (a "forward reference", like <code>JZ done</code>).</p>
    <div class="tip">Programming in assembly is a puzzle with tight rules: 16 bytes, two registers, and flags that only ALU instructions set. Plan with a comment for each C-like statement, then translate. Keep variables in RAM with <code>DB</code> and labels.</div>
    <div class="warn">The assembler can't catch logic errors. A program that assembles fine can still loop forever (forgot the HLT? jumped to the wrong label?). The simulator stops a runaway program only when you press Pause.</div>
    <div class="world">
      <ul>
        <li>Real assemblers (GNU <code>as</code>, NASM, the LLVM integrated assembler) do the same two jobs: resolve labels and encode instructions, plus linking and relocation. Compilers like GCC and Clang emit assembly text as an intermediate step. Run <code>gcc -S file.c</code> to see it, or try <a href="https://godbolt.org" target="_blank">Compiler Explorer (godbolt.org)</a>.</li>
        <li>Classic games were written straight in assembly: <em>Super Mario Bros.</em> (6502, NES) and <em>RollerCoaster Tycoon</em> (1999, x86, written almost entirely in assembly by Chris Sawyer).</li>
        <li>Assembly is still written today for boot code, OS kernels, cryptography inner loops and video codecs (for example in FFmpeg).</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: 'Assembler + CPU: write and run programs',
      explain: `
        <details>
          <summary>The problem: from text to running machine code</summary>
          <p>Type a program in the editor and click <strong>⚙ Assemble &amp; load</strong>. The assembler checks every line, resolves labels, writes the bytes into the simulator's RAM (label names appear in the RAM table) and resets the CPU. Errors list the line number and the reason.</p>
        </details>
        <details>
          <summary>Step by step: what the assembler does with the countdown example</summary>
          <table>
            <tr><th>Line</th><th>Pass 1: address</th><th>Pass 2: encoding</th><th>Byte</th></tr>
            <tr><td><code>LDI A, 5</code></td><td>0</td><td>opcode 1, n = 5</td><td>0x15</td></tr>
            <tr><td><code>LDI B, 1</code></td><td>1</td><td>opcode 2, n = 1</td><td>0x21</td></tr>
            <tr><td><code>loop: OUT</code></td><td>2 (loop = 2)</td><td>opcode F</td><td>0xF0</td></tr>
            <tr><td><code>SUB</code></td><td>3</td><td>opcode 8</td><td>0x80</td></tr>
            <tr><td><code>JNZ loop</code></td><td>4</td><td>opcode D, loop → 2</td><td>0xD2</td></tr>
            <tr><td><code>HLT</code></td><td>5</td><td>opcode 0</td><td>0x00</td></tr>
          </table>
          <p>Running it prints 5, 4, 3, 2, 1 in 18 instructions: 2 setup, 5 loop passes × 3, and HLT.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Pick <strong>load example… → errors demo</strong> and read each error. Fix them one by one.</li>
            <li>Load <strong>fibonacci</strong> and Run at full speed: 0 1 1 2 3 5 8 … 144. It stops when the next sum (144 + 233 = 377) carries out of 8 bits, so the JC exits.</li>
            <li>Load <strong>multiply 6 x 7</strong>, Run, then change <code>x:</code> to <code>DB 9</code> and <code>cnt:</code> to <code>DB 9</code>. 81 fits, but try 16 × 16 = 256: it wraps to 0.</li>
            <li>Press <strong>Ctrl/⌘ + Enter</strong> in the editor to assemble without reaching for the mouse.</li>
          </ul>
        </details>
      `,
      code: ASM_W({
        title: 'TINY-8 assembler',
        note: 'Edit the program, then <b>⚙ Assemble &amp; load</b> and <b>▶ Run</b>. Use <b>load example…</b> for ready-made programs.',
        src: ASM_PRESETS['countdown 5..1'],
        presets: true,
      }),
    },
  ],
  quiz: [
    { q: 'What does a label like <code>loop:</code> become in machine code?', options: ['A special LABEL instruction', 'Nothing by itself. It names an address, and the assembler substitutes that number wherever the label is used', 'A comment', 'A jump'], answer: 1, why: 'Labels take no space in RAM. They only exist for the assembler, which replaces them with addresses in pass 2.' },
    { q: 'Why does the assembler need two passes?', options: ['To double-check for typos', 'Because a jump may refer to a label defined later in the file (forward reference)', 'One pass per register', 'To compress the code'], answer: 1, why: 'When the assembler meets JZ done, it doesn\'t know done\'s address yet. Pass 1 records all label addresses; pass 2 encodes with them.' },
    { q: 'How many bytes does this program occupy: <code>LDI A, 1</code> · <code>x: DB 9</code> · <code>OUT</code> · <code>HLT</code>?', options: ['3', '4', '5', '16'], answer: 1, why: 'Every instruction and every DB is one byte; the label is free. 4 bytes.' },
    { q: 'Which line will the TINY-8 assembler reject?', options: ['LD B, [15]', 'LDI A, 16', 'JMP 0', 'MOV B, A'], answer: 1, why: 'LDI has only 4 operand bits (0–15). For 16, store it with DB and load it with LD.' },
  ],
  exercise: {
    task: `<p>Write a program that computes <strong>1 + 2 + … + N</strong> and shows it on OUT. N is the data byte labelled <code>n:</code>. The checker overwrites it with N = 1, 4, 5, 10 and 22 and runs your program each time (22 → 253 still fits in 8 bits).</p>
      <p>Edit the program in the box below (replace the TODOs), use <strong>⚙ Assemble &amp; load</strong> and <strong>▶ Run</strong> to test, then click <strong>✔ Check</strong>.</p>`,
    hint: 'Same shape as the multiply example: loop: LD A,[sum] · LD B,[n] · ADD · ST A,[sum] · LD A,[n] · LDI B,1 · SUB · ST A,[n] · JNZ loop. The SUB sets Z when n reaches 0. That is 9 + 3 + 2 data = 14 bytes, which fits.',
    starter: ASM_W({ title: 'Exercise: sum 1..N', note: 'Fill in the TODOs. Keep the <code>n:</code> label: the checker writes N there.', src: SUM_STARTER, check: true }),
    solution: ASM_W({ title: 'Exercise: sum 1..N', note: 'Fill in the TODOs. Keep the <code>n:</code> label: the checker writes N there.', src: SUM_SOLUTION, check: true }),
  },
},
// ---------------------------------------------------------------- real-cpus
{
  id: 'real-cpus',
  section: 'Building a CPU',
  title: 'From your CPU to real CPUs',
  explain: `
    <p>TINY-8 is a real computer: registers, ALU, bus, RAM, PC, control unit, and the fetch–decode–execute loop. Every CPU has these. What separates it from the chip in your phone is mostly about <strong>doing more per tick, and ticking faster</strong>:</p>
    <ul>
      <li><strong>Wider and bigger:</strong> 64-bit registers, 16–32 general registers, gigabytes of address space instead of 16 bytes.</li>
      <li><strong>Pipelining:</strong> split the instruction cycle into stages (fetch, decode, execute, memory, write-back) and work on 5 instructions at once, like a laundry where the washer, dryer and folding table are all busy. Throughput approaches 1 instruction per clock even though each instruction still takes 5 clocks.</li>
      <li><strong>Caches:</strong> DRAM is slow, often around 100 ns, which is hundreds of clock cycles. Small, fast SRAM caches (L1, L2, L3) next to the core keep recently used data, and an L1 hit takes only a few cycles.</li>
      <li><strong>Branch prediction:</strong> guess jump outcomes so the pipeline never waits (you met this in the jumps lesson).</li>
      <li><strong>Superscalar + out-of-order execution:</strong> fetch several instructions per clock, find the independent ones, and run them in parallel on multiple ALUs, out of program order, while still producing the same results as in-order execution.</li>
      <li><strong>Multiple cores:</strong> several complete CPUs on one die, plus GPUs and accelerators. SIMD instructions (SSE, AVX, NEON) let one instruction work on 4, 8 or 16 numbers at a time.</li>
    </ul>
    <h3>Pipeline hazards</h3>
    <p>Overlapping instructions creates conflicts. If instruction 2 needs the result of instruction 1 before it's written back, that's a <strong>data hazard</strong>. The pipeline must <strong>stall</strong> (insert a "bubble") or <strong>forward</strong> the result straight from the ALU output to the next instruction's ALU input. A branch is a <strong>control hazard</strong>: until it resolves, which instruction should be fetched next? Prediction is the answer.</p>
    <h3>Scale: then and now</h3>
    <table>
      <tr><th>Chip</th><th>Year</th><th>Transistors</th><th>Found in</th></tr>
      <tr><td>Intel 4004</td><td>1971</td><td>~2,300</td><td>Busicom calculator, the first commercial microprocessor</td></tr>
      <tr><td>MOS 6502</td><td>1975</td><td>4,528 (3,510 switching + 1,018 pull-ups)</td><td>Apple II, Commodore 64 (6510 variant), NES (Ricoh 2A03)</td></tr>
      <tr><td>Zilog Z80</td><td>1976</td><td>~8,500</td><td>ZX Spectrum, Game Boy (a close relative)</td></tr>
      <tr><td>Intel 8086</td><td>1978</td><td>~29,000</td><td>the start of x86</td></tr>
      <tr><td>Intel Pentium</td><td>1993</td><td>3.1 million</td><td>first superscalar x86</td></tr>
      <tr><td>Apple M1</td><td>2020</td><td>16 billion</td><td>MacBook Air (ARM-based)</td></tr>
      <tr><td>Apple M1 Ultra</td><td>2022</td><td>114 billion</td><td>Mac Studio</td></tr>
    </table>
    <p>TINY-8 would need very roughly a couple of thousand transistors, the same league as the 4004. A modern chip has millions of times more, but every single one is still a switch, wired into gates, wired into exactly the components you built.</p>
    <div class="world">
      <ul>
        <li><strong>Where they live:</strong> Intel and AMD x86 in most PCs and servers. ARM in practically every smartphone, Apple's M-series Macs and many cloud servers (AWS Graviton). <strong>RISC-V</strong>, an open ISA anyone can implement without a license, in microcontrollers and accelerators. The Raspberry Pi Pico 2's RP2350 chip even includes RISC-V cores next to its Arm cores.</li>
        <li><strong>Where to go next:</strong>
          <a href="https://www.nand2tetris.org/" target="_blank">nand2tetris</a> (build a computer from NAND gates up to an OS, free course and the book <em>The Elements of Computing Systems</em>) ·
          <a href="https://eater.net/8bit" target="_blank">Ben Eater's 8-bit breadboard computer</a> (videos plus kits, very close to TINY-8) ·
          an <strong>FPGA</strong> board with <strong>Verilog</strong> or VHDL to turn your designs into real hardware ·
          <a href="http://www.visual6502.org/" target="_blank">Visual 6502</a> to watch a real CPU's transistors switch.</li>
      </ul>
    </div>
  `,
  examples: [
    {
      title: '5-stage pipeline: throughput, stalls and forwarding',
      explain: `
        <details>
          <summary>The problem: each instruction needs 5 steps, but most hardware sits idle</summary>
          <p>Without pipelining, while one instruction is in EX, the fetch unit, decoder, memory port and register write-back are all idle. 6 instructions × 5 stages = <strong>30 cycles</strong>. With pipelining a new instruction enters every cycle: 5 + (6 − 1) = <strong>10 cycles</strong> if nothing gets in the way, so 3× the throughput from the same parts.</p>
        </details>
        <details>
          <summary>Step by step: this program with hazards on</summary>
          <table>
            <tr><th>Setting</th><th>Cycles</th><th>Lost (stall) cycles</th><th>What happens</th></tr>
            <tr><td>Pipelining off</td><td>30</td><td>0</td><td>one instruction at a time</td></tr>
            <tr><td>Pipelined, hazards ignored (unrealistic)</td><td>10</td><td>0</td><td>wrong results! add would read x1 before lw wrote it</td></tr>
            <tr><td>Pipelined, no forwarding</td><td>16</td><td>6</td><td>each dependent instruction waits in ID until the value is written back</td></tr>
            <tr><td>Pipelined + forwarding</td><td>12</td><td>2</td><td>ALU results are forwarded at once. Only "load-use" (lw then use) still costs 1 bubble each</td></tr>
          </table>
          <p>Hatched ⏸ cells are bubbles. The instruction is stuck, and so is everything behind it.</p>
        </details>
        <details>
          <summary>Try this</summary>
          <ul>
            <li>Press <strong>⏭ Next cycle</strong> repeatedly and read the "in the pipeline now" line: up to 5 instructions are in flight at once.</li>
            <li>Toggle <strong>forwarding</strong> on and off and count the bubbles after each <code>lw</code>.</li>
            <li>Read the <b>Dependencies</b> line: which registers each instruction reads from earlier instructions. The exercise asks you to reorder instructions so the dependent ones are not back to back.</li>
          </ul>
          <div class="tip">Real numbers: the classic MIPS R2000 had 5 stages, Intel's Pentium 4 "Prescott" had 31. Deeper pipelines allow higher clock speeds but make every branch mispredict more expensive.</div>
        </details>
      `,
      code: `${HEAD}
<div class="w">
  <h4>5-stage pipeline: IF → ID → EX → MEM → WB</h4>
  <p class="note">IF = fetch, ID = decode + read registers, EX = ALU, MEM = data memory, WB = write the result to a register. Each row is one instruction, each column one clock cycle.</p>
  <div class="row" style="align-items:center;margin-bottom:6px">
    <label><input type="checkbox" id="pp" checked> pipelining</label>
    <label><input type="checkbox" id="hz" checked> respect data dependencies</label>
    <label><input type="checkbox" id="fw" checked> forwarding</label>
    <button id="nx" class="pri">⏭ Next cycle</button> <button id="all">show all</button> <button id="rs">↺ from cycle 1</button>
  </div>
  <div class="card" style="overflow-x:auto"><div id="g"></div></div>
  <div class="row" style="margin-top:8px">
    <div class="card" style="flex:1 1 300px"><div id="now" class="mono" style="font-size:12.5px"></div></div>
    <div class="card" style="flex:1 1 300px"><div id="st"></div></div>
  </div>
</div>
<script>
${PIPE_SRC}
var INS = ['lw x1, 0(x10)', 'add x2, x1, x1', 'addi x3, x0, 5', 'sub x4, x3, x2', 'lw x5, 4(x10)', 'add x6, x5, x4'].map(PIPE.parse);
var cur = 1;
function opt() { return { pipe: document.getElementById('pp').checked, haz: document.getElementById('hz').checked, fwd: document.getElementById('fw').checked }; }
function draw() {
  var o = opt(), r = PIPE.sched(INS, o);
  if (cur > r.cycles) cur = r.cycles;
  document.getElementById('fw').disabled = !o.pipe || !o.haz;
  document.getElementById('g').innerHTML = PIPE.grid(INS, r, cur);
  var stages = ['IF', 'ID', 'EX', 'MEM', 'WB'].map(function (s) {
    var who = INS.map(function (x, i) { var q = r.rows[i]; var inS = s === 'IF' || s === 'ID' ? cur >= q[s][0] && cur <= q[s][1] : q[s] === cur; return inS ? x.t : null; }).filter(Boolean);
    return '<div><b style="display:inline-block;width:38px">' + s + '</b>' + (who.join(' · ') || '<span style="color:#94a3b8">(empty / bubble)</span>') + '</div>';
  }).join('');
  document.getElementById('now').innerHTML = '<b style="font-family:system-ui">In the pipeline now (cycle ' + cur + '):</b>' + stages;
  var base = INS.length * 5;
  document.getElementById('st').innerHTML = 'total cycles: <b>' + r.cycles + '</b><br>stall cycles: <b>' + r.stalls + '</b><br>cycles per instruction: <b>' + (r.cycles / INS.length).toFixed(2) + '</b><br>speed-up vs no pipeline: <b>' + (base / r.cycles).toFixed(2) + '×</b>' +
    (o.pipe && !o.haz ? '<div style="color:#b91c1c;margin-top:4px">⚠ Ignoring dependencies is fast but WRONG: instructions read registers before they are written.</div>' : '') +
    '<div style="margin-top:6px;font-size:12px;color:#475066">Dependencies: ' + INS.map(function (x, i) { var d = x.s.filter(function (s) { return INS.slice(0, i).some(function (y) { return y.d === s; }); }); return d.length ? '<code>' + x.t.split(' ')[0] + ' ' + x.d + '</code> reads ' + d.join(', ') : null; }).filter(Boolean).join(' · ') + '</div>';
}
['pp', 'hz', 'fw'].forEach(function (id) { document.getElementById(id).onchange = draw; });
document.getElementById('nx').onclick = function () { cur++; draw(); };
document.getElementById('all').onclick = function () { cur = 99; draw(); };
document.getElementById('rs').onclick = function () { cur = 1; draw(); };
draw();
<\/script>`,
    },
  ],
  quiz: [
    { q: 'A 5-stage pipeline runs 100 independent instructions. About how many cycles does it take?', options: ['500', '104', '100', '20'], answer: 1, why: 'The first instruction takes 5 cycles to complete; after that one finishes every cycle: 5 + 99 = 104. Without pipelining it would be 500.' },
    { q: 'What does forwarding (bypassing) do?', options: ['Predicts branches', 'Sends an ALU result directly to the next instruction\'s ALU input, before it is written back to the register file', 'Skips the WB stage', 'Moves instructions to another core'], answer: 1, why: 'The result exists at the end of EX. Forwarding wires it straight back to the ALU input so dependent instructions don\'t have to wait for WB.' },
    { q: 'Why do CPUs have caches?', options: ['DRAM is too small', 'DRAM takes hundreds of clock cycles to access; small SRAM caches near the core answer in a few', 'To store the microcode', 'To hold branch predictions only'], answer: 1, why: 'Main memory latency (~100 ns) is huge compared to a ~0.25 ns clock period. Caches exploit the fact that programs reuse nearby data.' },
    { q: 'Roughly how many transistors did the 6502 (Apple II, NES) have?', options: ['About 4,500', 'About 450,000', 'About 45 million', 'About 16 billion'], answer: 0, why: '4,528 in total, 3,510 of them used as switches. An Apple M1 has 16 billion, millions of times more, built from the same kind of gates.' },
    { q: 'What is RISC-V?', options: ['A brand of Intel CPU', 'An open, royalty-free instruction set architecture that anyone can implement', 'A GPU', 'A programming language'], answer: 1, why: 'RISC-V is an ISA specification (like x86 or ARM) that is free to implement. It is used in microcontrollers, accelerators and increasingly in larger chips.' },
  ],
  exercise: {
    task: `<p>Be the compiler's instruction scheduler. The 5 instructions below run on a pipeline <strong>with forwarding</strong>, but each <code>lw</code> is immediately followed by an instruction that uses its result (a "load-use" hazard, 1 stall each).</p>
      <p>Reorder them in the box below with ↑ ↓ until the pipeline has <strong>0 stall cycles</strong> and every instruction still comes after the instructions it depends on. Then click <strong>✔ Check</strong>.</p>`,
    hint: 'Both loads are independent of each other. Do both lw instructions first, then the two adds that use them, then the final add: A, C, B, D, E.',
    starter: PIPE_EX([0, 1, 2, 3, 4]),
    solution: PIPE_EX([0, 2, 1, 3, 4]),
  },
},

);
})();
