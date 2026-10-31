# Lesson file format

Each file in `lessons/` is a plain browser script (no modules, no build) loaded by `index.html`.

```js
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  {
    id: 'jsx',                       // unique kebab-case, used in URL hash #/jsx
    section: 'Basics',               // sidebar group name (exact string given per file)
    title: 'JSX',
    explain: `
      <p>HTML string. Use <code>inline code</code>, <strong>, <ul>/<li>, <h3> subheadings.</p>
      <pre><code>static non-runnable snippet (escape &lt; &gt; &amp;)</code></pre>
      <div class="tip">Tip box</div>
      <div class="warn">Pitfall box</div>
    `,
    examples: [
      {
        title: 'Hello JSX',
        runnable: true,              // default true; false = shown as read-only code only
        explain: `                   // optional walkthrough under the playground — REQUIRED for hard examples (see below)
          <details>
            <summary>The problem: …</summary>
            <p>…</p>
          </details>
          <details>
            <summary>Step by step: what happens when you click …</summary>
            <table><tr><th>Step</th><th>State</th><th>Screen / console</th></tr> … </table>
          </details>
        `,
        code: `import { useState } from 'react';

export default function App() {
  return <h1>Hello</h1>;
}`,
      },
    ],
    quiz: [
      { q: 'Question text (may contain <code>)', options: ['A', 'B', 'C', 'D'], answer: 1, why: 'Explanation shown after answering.' },
    ],
    exercise: {
      task: `<p>HTML describing what to build.</p>`,
      starter: `export default function App() {\n  // TODO\n}`,
      hint: 'Plain text or HTML hint.',
      solution: `...full working code...`,
    },
  },
);
```

## `editor` (per example and per exercise; falls back to `SITE.editor`, default true)
- `true` — code editor + preview side by side (learner reads/edits the code; the code IS the lesson).
- `false` — **widget mode**: preview only, full width, ↺ Reset button. Use for interaction-only demos (simulators,
  diagrams, step-throughs). The learner never sees the widget's source, so: put every knob worth exploring in the
  widget as a control; walkthrough "Try this" = click/slide/type instructions, never "edit the code".
  Widget exercises: input lives inside the widget (textarea + Check); task text says "edit … in the box below and
  click Check". "Show solution" reloads the widget with `solution`.

## `lang` (per example and per exercise; falls back to `SITE.defaultLang` in `site.js`)
- `react` — JSX ES module, must `export default` a component. Rules below.
- `html` — HTML fragment put into `<body>`; may include `<style>` and `<script>`. Best for visual widgets on non-code topics (SVG, canvas, sliders, step-through animations, simulations).
- `js` — plain ES module; `<div id="root">` exists; `console.*` shows in console panel.

## Runtime rules (this site: `html` mode, `editor: false` widgets everywhere)
Topic = digital logic, from transistors to a CPU. Audience = beginner software dev (knows code, not electronics).
Every example + exercise is an interactive HTML widget (preview only, full width, ~1000px wide iframe, light theme).
Code = HTML fragment with `<style>`/`<script>` (classic script, not module). Never show code editors.

### `Circ.mount(selector, cfg)` — interactive circuit simulator (USE IT for every circuit)
Pre-loaded global (from `../circuit-lib.js`; read that file if unsure). Renders an SVG schematic with clickable
switches, live wire colours (green = 1, grey = 0), auto truth table (combinational circuits ≤ 4 input bits),
🐢 Slow-mo (animates one gate delay per step), "settled after N gate delays" readout, ▶ Clock / ⏭ Pulse buttons
(when a CLOCK exists), optional oscilloscope, and a sandbox **build mode** with ✔ Check.

```js
const api = Circ.mount('#c', {
  title: 'XOR from 4 NANDs',          // optional
  intro: 'HTML line under title',      // optional
  parts: [                             // see part types below; x,y = top-left, multiples of 10
    { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
    { id: 'g', type: 'AND', x: 140, y: 10 },          // gates: n inputs (default 2; NOT/BUF 1)
    { id: 'q', type: 'OUT', label: 'Q', x: 280, y: 10, color: '#ef4444' },
  ],
  wires: [                             // [from, to, opt?]  from = 'id' | 'id.k' | 'id.PinName' (output pin)
    ['a', 'g.0'], ['b', 'g.1'],         //                   to   = 'id.k' | 'id.PinName' (input pin)
    ['g', 'q'],
    ['n1', 'n2.0', { mx: 230 }],        // opt.mx: x of the vertical segment; opt.pts: [[x,y],...] explicit corners
  ],                                    // backwards (feedback) wires auto-route below: right 15 → down to opt.my
                                        //  (default max(y)+40) → left → up; set { my: <y> } to route above/below.
  table: undefined,  // default auto; false = hide; true = force (also for sequential, ≤ 6 input bits)
  scope: ['CLK', 'D', 'Q'],   // optional oscilloscope rows (part labels/ids; NUMIN/NUMOUT shown as bus values)
  target: ({ A, B }) => ({ Q: A ^ B }),   // combinational goal: inputs by IN/NUMIN label → outputs by OUT/NUMOUT label
                                          //  → adds ✔ Check (tests ALL combos, ≤1024) + 🎯 goal column in truth table
  test: [ { set: { D: 1 }, pulse: 'CLK', expect: { Q: 1 }, note: 'store 1' } ],  // sequential goal (instead of target):
                                          //  resets all state, then per step: set values, settle, optional clock pulse
                                          //  (0→1→0), compare expect.
  build: { palette: ['NAND'], best: 4, max: 10 },  // sandbox: learner adds parts from palette, drags, wires.
                                          //  palette entries: gate type, 'AND:3' (3-input), or chip names ('FA', 'MUX2', custom)
                                          //  IN/OUT/NUMIN/NUMOUT/CLOCK/TEXT parts from cfg are fixed; other cfg parts are editable.
                                          //  best = shown "⭐ best known" part count; max = hard limit enforced by Check.
  onChange(api) {},  // after every settle — update your own extra readouts (api.get('SUM'), api.signed('X'))
  help: 'custom help line' | false,
  w: 760, h: 380,     // optional fixed viewBox (default: auto-fit; build mode default 760×380 canvas)
  scale: 1.35,        // optional display scale (default 1.35, build 1)
  clockMs: 700, slowMs: 380,
});
// api: get(name) → value (bit or number), signed(name), set(name, v), pulse(), check() → bool, update(), find(name), parts, wires
```

#### Part types and pin geometry (relative to part x,y — use to align straight wires)
| type | size w×h | pins |
|---|---|---|
| `IN` toggle switch, `CLOCK`, `BUTTON` (1 only while held), `CONST` (`value:0/1`) | 40×40 | out (40,20). Label drawn LEFT. |
| `OUT` LED (`color`) | 40×40 | in (0,20). Label drawn RIGHT. |
| `NOT`, `BUF` | 60×40 | in (0,20) · out (60,20) |
| `AND OR NAND NOR XOR XNOR`, n inputs (n=2 default) | 60×(20n) (n≥4: w=h/2+40) | in k at (0, 10+20k) · out (w, 10n) — 2-input: ins y+10, y+30, out y+20 |
| `NUMIN` (`bits`=4, `value`, `signed`) number input, click ▲▼ or a bit | 80×(20·bits+20) | out bit k at (80, 30+20k) (b0 = LSB at top) |
| `NUMOUT` (`bits`=4, `signed:true` shows two's complement) | 80×(20·bits+20) | in bit k at (0, 30+20k) |
| `SEG7` 7-segment display | 90×160 | in a..g at (0, 20+20k), pin names 'a'..'g' |
| `TEXT` annotation (`text`, `size`, `color`, `bold`) | — | none; y = text baseline |
| chips (built-in or `CHIP`) | w=90 (or `w`), h = 20·m+20, m = max(#ins,#outs) | in/out k at (0 or w, 30+20(k+(m−count)/2)) — fewer pins are centred |

So a 2-input gate at (x,y) aligns straight with an IN at (x', y−10) on pin 0, and (x', y+10) on pin 1.
Leave ≥ 40px horizontal gap between columns for wire bends; ≥ 20px vertical between parts (gate type label sits 13px
below). Typical columns: inputs x=20, gates x=140 / 280 / 420, outputs at last column + 140.

#### Built-in chips (black boxes, `type: 'FA'` etc.; pin names usable in wires: `'fa1.Cin'`)
`HA` (A,B → S,C) · `FA` (A,B,Cin → S,Cout) · `MUX2` (A,B,S → Y; S=0 picks A) · `DEMUX2` (D,S → Y0,Y1) ·
`DEC2` (A0,A1 → Y0..Y3) · `SR` latch (S,R → Q,Q̄) · `DLATCH` (D,E → Q,Q̄) · `DFF` rising-edge (D,CLK → Q,Q̄) ·
`DFFE` register bit (D,LOAD,CLK → Q) · `TFF` (T,CLK → Q,Q̄). Clock pins show the ▷ edge marker.

Custom chips — the "you built it, now it's a component" step:
```js
Circ.chip('ADD4', { label: '4-BIT ADDER', ins: ['A0','A1','A2','A3','B0','B1','B2','B3','Cin'],
  outs: ['S0','S1','S2','S3','Cout'], w: 110, desc: 'hover text',
  stateful: false,      // true if fn keeps memory in `m` (disables auto truth table)
  clk: undefined,       // index of clock input → draws ▷ marker
  fn: (ins, m) => { /* ins = array of 0/1; m = per-instance memory object */ return [/* 0/1 per out */]; } });
// or inline: { id:'x', type:'CHIP', label:'ALU', ins:[...], outs:[...], fn, x, y }
```
Wires are 1-bit. Buses = one wire per bit (build them in a loop in your script).

#### Simulation model (explain this honestly in lessons)
Synchronous unit-delay: every tick, every part recomputes from the previous tick's values (= 1 gate delay). Repeats
until stable → "settled after N gate delays" (critical path). If it never settles (>120 ticks: ring oscillator,
SR latch S=R=1→0,0 race), shows ⚠ Oscillating and picks a random stable state. Unconnected inputs read 0.
Initial state is resolved with a sequential sweep so latches start stable.

### Other widgets (beyond Circ) — write custom HTML/SVG/JS where it teaches better
E.g. transistor/switch-level CMOS views (click gate voltage, watch channel conduct), binary/hex converters, voltage
level meters, timing diagrams, RAM grid explorer, CPU simulator (registers, memory table, step/run, assembly editor
as a `<textarea>` inside the widget). Self-explanatory: labels, instructions, live readouts. No network.
Style inside widgets: light theme, rounded cards, system font, total height ≤ ~850px.

### Exercises (widget mode, sandbox like a puzzle game)
Prefer `build` + `target`/`test` puzzles: "Using only NAND gates, build …". `starter` = fixed IN/OUT parts + empty
board; `solution` = same config with the gates and wires placed (must pass ✔ Check — verify it!). Task text says
"Build … in the board below, then click ✔ Check". Give `best` part counts when you know the optimum.

### Real-world links (required in every lesson)
Every lesson's `explain` ends with at least one `<div class="world">…</div>` box connecting the concept to real
hardware/products (e.g. 74HC00 quad-NAND chip, Apollo Guidance Computer built from NOR gates, carry-lookahead in CPUs,
SRAM in CPU caches vs DRAM sticks, NAND flash in SSDs, 6502 in the NES/Apple II). Use accurate, verifiable facts;
`<a href="https://en.wikipedia.org/wiki/...">` links are fine (they open in the top page).
