window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── feedback
  {
    id: 'feedback',
    section: 'Memory & Time',
    title: 'Feedback loops: circuits that remember',
    explain: `
      <p>Every circuit you have built so far is <strong>combinational</strong>: its output depends only on the inputs <em>right now</em>. In code terms it is a pure function, <code>out = f(a, b)</code>. Flip the switches back and the output goes back too. It has no memory at all.</p>
      <p>A computer needs to <strong>remember</strong>: the variable <code>x</code>, which instruction comes next, the pixels on screen. So we need a circuit whose output depends on its <em>history</em>, the way a variable keeps its value after the assignment line has finished running.</p>
      <h3>The trick: feed the output back in</h3>
      <p>Take a gate's output and wire it back into one of its own inputs. Now the gate "sees" what it did a moment ago. That loop is called <strong>feedback</strong>, and it is the seed of every memory bit in your computer.</p>
      <pre><code>// combinational: no memory
q = set;

// with feedback: q appears on both sides
q = set || q;    // once q is 1, it stays 1 forever</code></pre>
      <p>Look at the second line. It reads its own previous value. In hardware that line runs <em>continuously</em>, and the result keeps itself alive.</p>
      <h3>Two kinds of loops</h3>
      <ul>
        <li><strong>An even number of inversions (0, 2, 4…)</strong> around the loop: the signal agrees with itself, so the loop locks into a value and holds it. Such a circuit has two stable states, so it is called <strong>bistable</strong>. That is memory.</li>
        <li><strong>An odd number of inversions (1, 3, 5…)</strong>: the signal disagrees with itself every trip around the loop, so it flips forever. That is the <strong>ring oscillator</strong> from the gate-delay lesson. It is useless for memory, but it can serve as a crude clock.</li>
      </ul>
      <p>Picture a ball on a hill with two valleys. An even loop is like the valleys: the ball rolls into one and stays there until something kicks it. An odd loop is like a ball on a ridge where every resting place pushes it to the other side.</p>
      <div class="tip">The simulator models time honestly. Each tick, every gate recomputes from the values of the previous tick (one gate delay). A feedback loop keeps going round until nothing changes. If it never stops changing, you see <strong>⚠ Oscillating</strong>.</div>
      <div class="warn">A loop with no way in is not useful memory. You also need a way to <strong>write</strong> a new value and a way to <strong>erase</strong> it. The first example has only half of that, on purpose.</div>
      <div class="world">
        <p>Every bit of your CPU's cache (SRAM) is literally two inverters wired in a loop. That is an even loop, so it holds a 0 or a 1 for as long as the power is on. Cut the power and the loop collapses, which is why RAM forgets when you switch off.</p>
        <p>When the power comes back, each loop falls into whichever valley its tiny manufacturing imperfections favour. That power-up pattern is random-looking but repeatable per chip, so it is used as a hardware fingerprint, a <a href="https://en.wikipedia.org/wiki/Physical_unclonable_function" target="_blank">physical unclonable function (SRAM PUF)</a>.</p>
      </div>
    `,
    examples: [
      {
        title: 'The sticky bit: an OR gate that feeds itself',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Sticky bit: OR gate with its output fed back',
  intro: 'Hold the <b>SET</b> push-button for a moment, then let go. Watch the LED and the oscilloscope.',
  scope: ['SET', 'Q'],
  parts: [
    { id: 'set', type: 'BUTTON', label: 'SET', x: 20, y: 10 },
    { id: 'or', type: 'OR', x: 140, y: 20 },
    { id: 'q', type: 'OUT', label: 'Q', x: 300, y: 20, color: '#f59e0b' },
    { id: 't', type: 'TEXT', text: 'feedback: Q goes back into the OR', x: 110, y: 125, size: 11.5, color: '#7c3aed' },
  ],
  wires: [
    ['set', 'or.0'],
    ['or', 'q'],
    ['or', 'or.1', { pts: [[230, 40], [230, 100], [110, 100], [110, 50]] }],
  ],
  help: 'Hold the PUSH button with the mouse (it is 1 only while held). Use ↺ Reset above the widget to "cut the power".',
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: a gate that only knows "now"</summary>
            <p>A plain OR gate outputs 1 while <code>SET</code> is held and 0 the moment you let go. We want the 1 to <em>stay</em>. So we wire the output <code>Q</code> back into the OR's second input. Now the gate computes <code>Q = SET OR Q</code>, using its own previous output.</p>
          </details>
          <details>
            <summary>Step by step: press and release SET</summary>
            <table>
              <tr><th>Moment</th><th>SET</th><th>OR inputs (SET, Q)</th><th>Q</th></tr>
              <tr><td>Start</td><td>0</td><td>0, 0</td><td>0: the loop holds 0, which is stable too</td></tr>
              <tr><td>Press SET</td><td>1</td><td>1, 0</td><td>0 → <strong>1</strong> after 1 gate delay</td></tr>
              <tr><td>Next tick</td><td>1</td><td>1, 1</td><td>1, nothing changes any more: settled</td></tr>
              <tr><td>Release SET</td><td>0</td><td>0, <strong>1</strong></td><td><strong>1</strong>: the fed-back 1 keeps the OR on</td></tr>
              <tr><td>Press again</td><td>1</td><td>1, 1</td><td>1 (no change)</td></tr>
            </table>
            <p>After the release, the only thing keeping <code>Q</code> at 1 is <code>Q</code> itself. The circuit <strong>remembers</strong> that SET was pressed at some point. The scope shows SET as a short blip and Q as a step that never comes down.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Hold <strong>SET</strong> and release it. The LED stays on. On release only the button itself changes (the status counts it as 1 step). The OR gate does not change at all.</li>
              <li>Try to turn it off. You can't: no input can force an OR gate's output to 0 while one of its inputs is 1.</li>
              <li>Click <strong>↺ Reset</strong> (top right of the widget) to "cut the power". That is the only way to make this bit forget.</li>
              <li>Turn on <strong>🐢 Slow-mo</strong> and press SET again after a reset. You see the 1 travel through the OR and then around the loop.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: "a loop is always unstable"</summary>
            <p>Feedback only oscillates when the loop <em>inverts</em> an odd number of times. The OR loop does not invert at all (0 inversions, an even number), so it settles. Loops are not bad. They just need to agree with themselves.</p>
          </details>
        `,
      },
      {
        title: 'Even vs odd loops: memory or oscillator?',
        code: `<style>
  .pick { display:flex; gap:6px; align-items:center; margin:0 0 8px; font:14px system-ui; flex-wrap:wrap; }
  .pick button { padding:4px 12px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; }
  .pick button.on { background:#0f766e; color:#fff; border-color:#0f766e; }
  #verdict { margin:6px 0 0; padding:8px 12px; border-radius:8px; font:14px system-ui; }
</style>
<div class="pick">Inverters in the loop:
  <button data-n="1">1</button><button data-n="2">2</button><button data-n="3">3</button><button data-n="4">4</button><button data-n="5">5</button>
</div>
<div id="c"></div>
<div id="verdict"></div>
<script>
function show(n) {
  document.querySelectorAll('.pick button').forEach(function (b) { b.classList.toggle('on', +b.dataset.n === n); });
  var parts = [], wires = [];
  for (var k = 0; k < n; k++) {
    parts.push({ id: 'n' + k, type: 'NOT', x: 40 + 110 * k, y: 0 });
    if (k > 0) wires.push(['n' + (k - 1), 'n' + k + '.0']);
  }
  wires.push(['n' + (n - 1), 'n0.0', { my: 70, mx2: 20 }]);
  parts.push({ id: 't', type: 'TEXT', text: n % 2 ? 'odd: every trip round the loop flips the signal' : 'even: the signal agrees with itself', x: 0, y: 105, size: 12, color: n % 2 ? '#b45309' : '#15803d' });
  window.api = Circ.mount('#c', { title: 'A ring of ' + n + ' inverter' + (n > 1 ? 's' : ''), parts: parts, wires: wires, table: false,
    help: 'Green wire = 1, grey = 0. Pick a different loop length above.' });
  var v = document.getElementById('verdict');
  if (window.api.unstable) { v.style.background = '#fef3c7'; v.innerHTML = '⚠ <b>Never settles.</b> ' + n + ' inversion' + (n > 1 ? 's' : '') + ' = odd, so the value contradicts itself on every lap: this is a <b>ring oscillator</b>, not memory.'; }
  else { v.style.background = '#dcfce7'; v.innerHTML = '✅ <b>Stable.</b> ' + n + ' inversions = even. The loop settled into an alternating 1/0 pattern and will hold it forever: this is <b>bistable</b>, the basis of a memory bit.'; }
}
document.querySelectorAll('.pick button').forEach(function (b) { b.onclick = function () { show(+b.dataset.n); }; });
show(2);
<\/script>`,
        explain: `
          <details>
            <summary>What to look for</summary>
            <p>Click <strong>1</strong>, <strong>2</strong>, <strong>3</strong>, <strong>4</strong> and <strong>5</strong> in turn. With an even count, the wires settle into a fixed green/grey alternating pattern, and the status says "settled". With an odd count the status shows <strong>⚠ Oscillating</strong>. Follow one wire round the loop: if it starts at 1, after an odd number of NOTs it must come back as 0, which contradicts where it started.</p>
            <table>
              <tr><th>Inverters</th><th>Trip round the loop</th><th>Result</th></tr>
              <tr><td>1, 3, 5</td><td>1 → … → 0 (contradiction)</td><td>Oscillates (ring oscillator, a crude clock)</td></tr>
              <tr><td>2, 4</td><td>1 → … → 1 (consistent)</td><td>Holds a value: 2 possible patterns = 1 bit of memory</td></tr>
            </table>
          </details>
          <details>
            <summary>Why the 2-inverter ring matters</summary>
            <p>Two inverters in a loop is exactly the core of an <strong>SRAM cell</strong>, the memory inside CPU caches. It can rest in "left = 1, right = 0" or "left = 0, right = 1", and it stays there. The catch: this ring has no inputs, so you can't <em>write</em> to it. The next lessons add the doors (S and R inputs) that let you push the loop into the state you want.</p>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What makes a circuit able to remember?', options: ['Using more AND gates', 'Feeding an output back into an input (feedback)', 'Using a faster clock', 'Adding an LED'], answer: 1, why: 'Feedback lets the circuit\'s past output influence its present output: that is state.' },
      { q: 'In the sticky OR bit, what happens when you release SET after pressing it?', options: ['Q goes back to 0', 'Q stays 1 because the OR sees its own 1', 'Q oscillates', 'Q becomes random'], answer: 1, why: 'Q = SET OR Q. With SET = 0 and Q = 1 the OR still outputs 1, so it holds itself on.' },
      { q: 'A loop of 3 inverters…', options: ['holds a bit forever', 'oscillates, because an odd number of inversions contradicts itself', 'outputs a constant 1', 'is the same as 1 buffer'], answer: 1, why: 'Odd inversions: 1 comes back as 0 and so on forever. That is a ring oscillator.' },
      { q: 'Why does the sticky OR bit make poor memory?', options: ['It cannot store a 1', 'It can never be reset to 0 (except by cutting power)', 'It oscillates', 'It needs a clock'], answer: 1, why: 'Once Q = 1, no input can make an OR output 0. We need a way to break the loop: a RESET.' },
      { q: '"Bistable" means…', options: ['two inputs', 'two stable states the circuit can rest in', 'it switches twice per second', 'it uses two transistors'], answer: 1, why: 'A bistable circuit has two resting states, 0 and 1. That is exactly one bit.' },
    ],
    exercise: {
      task: `<p>Fix the sticky bit so it can also <strong>forget</strong>. Using only <strong>OR</strong>, <strong>AND</strong> and <strong>NOT</strong> gates, build a memory bit:</p>
        <ul>
          <li>Pressing <strong>SET</strong> makes <code>Q = 1</code>, and Q stays 1 after release.</li>
          <li>Pressing <strong>RESET</strong> makes <code>Q = 0</code>, and Q stays 0 after release.</li>
        </ul>
        <p>Build it in the board below, then click <strong>✔ Check</strong>. The check presses the buttons in a sequence and reads Q after each step.</p>`,
      hint: 'Start from the sticky bit: Q = SET OR (something fed back). Instead of feeding Q straight back, feed back "Q AND NOT RESET". While RESET is held, the fed-back value is forced to 0, which breaks the loop. In code: q = set || (q && !reset).',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: a memory bit with SET and RESET',
  build: { palette: ['OR', 'AND', 'NOT'], best: 3 },
  parts: [
    { id: 'set', type: 'BUTTON', label: 'SET', x: 70, y: 60 },
    { id: 'rst', type: 'BUTTON', label: 'RESET', x: 70, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 140, color: '#f59e0b' },
  ],
  test: [
    { expect: { Q: 0 }, note: 'power on: Q = 0' },
    { set: { SET: 1 }, expect: { Q: 1 }, note: 'press SET' },
    { set: { SET: 0 }, expect: { Q: 1 }, note: 'release SET: remember 1' },
    { set: { RESET: 1 }, expect: { Q: 0 }, note: 'press RESET' },
    { set: { RESET: 0 }, expect: { Q: 0 }, note: 'release RESET: remember 0' },
    { set: { SET: 1 }, expect: { Q: 1 }, note: 'press SET again' },
    { set: { SET: 0 }, expect: { Q: 1 }, note: 'release SET again' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: a memory bit with SET and RESET',
  build: { palette: ['OR', 'AND', 'NOT'], best: 3 },
  parts: [
    { id: 'set', type: 'BUTTON', label: 'SET', x: 70, y: 60 },
    { id: 'rst', type: 'BUTTON', label: 'RESET', x: 70, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 140, color: '#f59e0b' },
    { id: 'inv', type: 'NOT', x: 160, y: 240 },
    { id: 'and', type: 'AND', x: 320, y: 250 },
    { id: 'or', type: 'OR', x: 480, y: 70 },
  ],
  wires: [
    ['set', 'or.0'],
    ['rst', 'inv'],
    ['inv', 'and.0'],
    ['and', 'or.1', { mx: 420 }],
    ['or', 'q', { mx: 600 }],
    ['or', 'and.1', { pts: [[560, 90], [560, 330], [300, 330], [300, 280]] }],
  ],
  test: [
    { expect: { Q: 0 }, note: 'power on: Q = 0' },
    { set: { SET: 1 }, expect: { Q: 1 }, note: 'press SET' },
    { set: { SET: 0 }, expect: { Q: 1 }, note: 'release SET: remember 1' },
    { set: { RESET: 1 }, expect: { Q: 0 }, note: 'press RESET' },
    { set: { RESET: 0 }, expect: { Q: 0 }, note: 'release RESET: remember 0' },
    { set: { SET: 1 }, expect: { Q: 1 }, note: 'press SET again' },
    { set: { SET: 0 }, expect: { Q: 1 }, note: 'release SET again' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── sr-latch
  {
    id: 'sr-latch',
    section: 'Memory & Time',
    title: 'SR latch: set, reset, remember',
    explain: `
      <p>The sticky bit could only remember a 1. The <strong>SR latch</strong> (Set/Reset) fixes that with two NOR gates that feed each other, <em>cross-coupled</em>. Each gate's output is one input of the other gate. That makes it a 2-inverter ring (an even loop, so stable) with a door on each side:</p>
      <ul>
        <li><strong>S</strong> (Set): pulse it and <code>Q</code> becomes 1.</li>
        <li><strong>R</strong> (Reset): pulse it and <code>Q</code> becomes 0.</li>
        <li>Neither pressed: <code>Q</code> <strong>keeps</strong> whatever it was. That is the memory.</li>
        <li>There is a second output, <code>Q̄</code> ("Q bar"), which is normally the opposite of Q.</li>
      </ul>
      <table>
        <tr><th>S</th><th>R</th><th>Q next</th><th>Meaning</th></tr>
        <tr><td>0</td><td>0</td><td>Q (unchanged)</td><td>hold / remember</td></tr>
        <tr><td>1</td><td>0</td><td>1</td><td>set</td></tr>
        <tr><td>0</td><td>1</td><td>0</td><td>reset</td></tr>
        <tr><td>1</td><td>1</td><td>0 (and Q̄ = 0 too!)</td><td><strong>forbidden</strong></td></tr>
      </table>
      <p>Why NOR? A NOR outputs 1 only when <em>both</em> inputs are 0. So a 1 on either input forces it to 0. That forcing is how S and R "kick" the loop into a new valley.</p>
      <div class="warn"><strong>S = R = 1 is forbidden.</strong> Both outputs become 0, so Q̄ is no longer the opposite of Q. Worse, if you release both at the <em>same instant</em>, the two gates race. The second example lets you watch that happen.</div>
      <div class="tip">In code the SR latch is: <code>if (s) q = 1; else if (r) q = 0;</code> with no <code>else</code>. The missing <code>else</code> is the memory: when neither input is active, nothing assigns <code>q</code>, so it keeps its value.</div>
      <h3>NAND version: S̄R̄ latch</h3>
      <p>Cross-couple two <strong>NAND</strong> gates instead and the inputs become <strong>active-low</strong>: they rest at 1, and you pull one down to 0 to set or reset. The bar in S̄ and R̄ marks "active when 0". Here the forbidden input is S̄ = R̄ = 0.</p>
      <div class="world">
        <p><strong>Switch debouncing.</strong> A mechanical switch bounces: its metal contact chatters on and off for a few milliseconds, so a CPU would see dozens of presses. The classic fix wires a two-way (SPDT) switch to the S and R of a latch. The first touch sets the latch, and the bounces only repeat "set" or "hold", so the output is one clean edge. Chips like the <a href="https://en.wikipedia.org/wiki/List_of_7400-series_integrated_circuits" target="_blank">74HC279</a> pack four S̄R̄ latches for exactly this kind of job.</p>
        <p><strong>SRAM.</strong> One bit of the cache in your CPU is a <a href="https://en.wikipedia.org/wiki/Static_random-access_memory" target="_blank">6-transistor (6T) cell</a>: two cross-coupled inverters (4 transistors, the latch) plus 2 "access" transistors that connect it to the bit lines when that row is selected. A modern CPU holds tens of megabytes of cache, which means hundreds of millions of these little latches.</p>
      </div>
    `,
    examples: [
      {
        title: 'Cross-coupled NOR latch (push buttons)',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'SR latch from two NOR gates',
  intro: 'Press and release <b>S</b>, then <b>R</b>. Q remembers which one you pressed last.',
  scope: ['S', 'R', 'Q', 'Q̄'],
  parts: [
    { id: 'r', type: 'BUTTON', label: 'R', x: 20, y: 0 },
    { id: 's', type: 'BUTTON', label: 'S', x: 20, y: 140 },
    { id: 'n2', type: 'NOR', x: 180, y: 130 },
    { id: 'n1', type: 'NOR', x: 180, y: 10 },
    { id: 'q', type: 'OUT', label: 'Q', x: 340, y: 10, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 340, y: 130, color: '#64748b' },
  ],
  wires: [
    ['r', 'n1.0'],
    ['s', 'n2.1'],
    ['n1', 'q'],
    ['n2', 'qn'],
    ['n1', 'n2.0', { pts: [[260, 30], [260, 70], [160, 70], [160, 140]] }],
    ['n2', 'n1.1', { pts: [[280, 150], [280, 90], [150, 90], [150, 40]] }],
  ],
  help: 'Hold a PUSH button with the mouse: it is 1 only while held. Each NOR\\'s output is fed into the other NOR.',
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: a loop we can push both ways</summary>
            <p>Two NORs in a ring: <code>Q = NOR(R, Q̄)</code> and <code>Q̄ = NOR(S, Q)</code>. With S = R = 0, a NOR with one input at 0 is just a NOT gate. So the ring is two inverters chasing each other, which is stable. S and R are the doors: a 1 on either input forces that gate's output to 0, whatever the loop says.</p>
          </details>
          <details>
            <summary>Step by step: press S (starting from Q = 0)</summary>
            <table>
              <tr><th>Tick</th><th>S</th><th>R</th><th>Q̄ = NOR(S, Q)</th><th>Q = NOR(R, Q̄)</th></tr>
              <tr><td>start</td><td>0</td><td>0</td><td>1</td><td>0</td></tr>
              <tr><td>press</td><td>1</td><td>0</td><td>NOR(1, 0) = <strong>0</strong></td><td>NOR(0, 1) = 0 (still sees the old Q̄)</td></tr>
              <tr><td>+1</td><td>1</td><td>0</td><td>0</td><td>NOR(0, 0) = <strong>1</strong></td></tr>
              <tr><td>+2</td><td>1</td><td>0</td><td>NOR(1, 1) = 0</td><td>1: stable</td></tr>
              <tr><td>release S</td><td>0</td><td>0</td><td>NOR(0, <strong>1</strong>) = 0: Q holds it at 0</td><td>1: <strong>remembered</strong></td></tr>
            </table>
            <p>It takes <strong>two gate delays</strong> for the set to reach Q: first Q̄ falls, then Q rises. (The ⏱ status line says 3, because the simulator also counts one step for the button itself.) Pressing R is the mirror image: Q falls first, then Q̄ rises. On the scope, S and R are short blips while Q is a long level: the latch turns a momentary press into a lasting state.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Press <strong>S</strong>: Q lights. Release: Q stays lit.</li>
              <li>Press <strong>S</strong> again: nothing changes, because it is already set.</li>
              <li>Press <strong>R</strong>: Q goes off and Q̄ lights.</li>
              <li>Turn on <strong>🐢 Slow-mo</strong> and press S. Watch Q̄ go grey <em>before</em> Q goes green, one gate delay apart.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: wiring S to the gate that drives Q</summary>
            <p>In a NOR latch, <strong>R</strong> goes into the gate whose output is <strong>Q</strong>, because a 1 on that input forces Q to 0. That's a reset. S goes into the Q̄ gate. Swap them and your "set" button resets. (In the NAND version it is the other way round: S̄ goes into the Q gate.)</p>
          </details>
        `,
      },
      {
        title: 'The forbidden input: S = R = 1 and the race',
        code: `<style>
  .row { display:flex; flex-wrap:wrap; gap:6px; margin:8px 0 0; font:14px system-ui; align-items:center; }
  .row button { padding:5px 12px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; }
  .row button.hot { background:#fee2e2; border-color:#fca5a5; }
  #out { margin-top:8px; padding:8px 12px; border-radius:8px; background:#f1f5f9; font:13.5px system-ui; min-height:22px; }
</style>
<div id="c"></div>
<div class="row">
  <button id="both" class="hot">① Set S = R = 1 (forbidden)</button>
  <button id="same" class="hot">② Release both at the same instant</button>
  <button id="sfirst">Release S first, then R</button>
  <button id="rfirst">Release R first, then S</button>
</div>
<div id="out">Race results so far: none. Click ① then ② several times.</div>
<script>
var tally = { 0: 0, 1: 0 };
window.api = Circ.mount('#c', {
  title: 'SR latch with toggle switches',
  intro: 'These are <b>toggle switches</b>, so both can be 1 at once. Use the buttons below to release them exactly together.',
  scope: ['S', 'R', 'Q', 'Q̄'],
  parts: [
    { id: 'r', type: 'IN', label: 'R', x: 20, y: 0 },
    { id: 's', type: 'IN', label: 'S', x: 20, y: 140 },
    { id: 'n2', type: 'NOR', x: 180, y: 130 },
    { id: 'n1', type: 'NOR', x: 180, y: 10 },
    { id: 'q', type: 'OUT', label: 'Q', x: 340, y: 10, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 340, y: 130, color: '#64748b' },
  ],
  wires: [
    ['r', 'n1.0'], ['s', 'n2.1'], ['n1', 'q'], ['n2', 'qn'],
    ['n1', 'n2.0', { pts: [[260, 30], [260, 70], [160, 70], [160, 140]] }],
    ['n2', 'n1.1', { pts: [[280, 150], [280, 90], [150, 90], [150, 40]] }],
  ],
  help: 'Click a switch to toggle it. The orange ⚠ line appears when the loop never settles.',
});
function setBoth(s, r) { api.find('S').value = s; api.find('R').value = r; api.update(); }
var out = document.getElementById('out');
document.getElementById('both').onclick = function () { setBoth(1, 1); out.innerHTML = 'S = R = 1: <b>Q = ' + api.get('Q') + ' and Q̄ = ' + api.get('Q̄') + '</b>. Both 0, so Q̄ is no longer "not Q". Now click ②.'; };
document.getElementById('same').onclick = function () {
  if (!(api.get('S') && api.get('R'))) { out.innerHTML = 'First click ① so that both switches are 1.'; return; }
  setBoth(0, 0);
  var q = api.get('Q'); tally[q]++;
  out.innerHTML = (api.unstable ? '⚠ <b>Race!</b> The two NORs flipped together for 120 gate delays and never settled. The simulator then picked a random winner: ' : 'Settled: ') +
    '<b>Q = ' + q + '</b>. Race results so far: Q=1 ×' + tally[1] + ', Q=0 ×' + tally[0] + '. Unpredictable!';
};
document.getElementById('sfirst').onclick = function () { setBoth(1, 1); setBoth(0, 1); setBoth(0, 0); out.innerHTML = 'S released first → R was still 1 for a moment → <b>Q = ' + api.get('Q') + '</b> (reset wins). No race.'; };
document.getElementById('rfirst').onclick = function () { setBoth(1, 1); setBoth(1, 0); setBoth(0, 0); out.innerHTML = 'R released first → S was still 1 for a moment → <b>Q = ' + api.get('Q') + '</b> (set wins). No race.'; };
<\/script>`,
        explain: `
          <details>
            <summary>The problem: two gates releasing in perfect sync</summary>
            <p>With S = R = 1, both NORs are forced to 0. That's odd (Q and Q̄ should be opposites) but it is stable. The trouble starts when S and R drop to 0 at <em>exactly</em> the same moment. Both gates now see two 0s and both decide to output 1. On the next tick both see a 1 and both output 0. They stay perfectly in step:</p>
            <table>
              <tr><th>Tick</th><th>S, R</th><th>Q</th><th>Q̄</th></tr>
              <tr><td>holding ①</td><td>1, 1</td><td>0</td><td>0</td></tr>
              <tr><td>release ②</td><td>0, 0</td><td>NOR(0, 0) = 1</td><td>NOR(0, 0) = 1</td></tr>
              <tr><td>+1</td><td>0, 0</td><td>NOR(0, 1) = 0</td><td>NOR(0, 1) = 0</td></tr>
              <tr><td>+2</td><td>0, 0</td><td>1</td><td>1</td></tr>
              <tr><td>…</td><td>0, 0</td><td>0, 1, 0, 1, …</td><td>0, 1, 0, 1, …</td></tr>
            </table>
            <p>The loop is perfectly symmetric, so nothing breaks the tie. After 120 ticks the simulator gives up, shows <strong>⚠ Oscillating / race</strong>, and picks a random stable state. Click ① then ② several times: the tally shows Q = 1 and Q = 0 both turning up.</p>
          </details>
          <details>
            <summary>What real hardware does: metastability</summary>
            <p>Real gates are never perfectly identical, so in practice one gate is a hair faster and wins. But <em>which</em> one depends on tiny manufacturing differences, temperature and noise. For a while the output can also hover at an in-between voltage that is neither a clean 0 nor a clean 1. This is called <strong>metastability</strong>, like a coin landing on its edge before it falls. The time it takes to resolve is unbounded in principle (long waits are just exponentially unlikely). Our simulator cannot show half-voltages, so it shows the endless flip-flopping instead. Both pictures say the same thing: <strong>the result is unpredictable</strong>.</p>
            <p>Releasing one input first (the other two buttons) gives a clean, predictable result: whichever input was still 1 a moment longer wins.</p>
          </details>
          <details>
            <summary>How engineers avoid it</summary>
            <ul>
              <li><strong>Don't allow S = R = 1.</strong> The next lesson's <em>D latch</em> generates S and R from a single data bit, so they can never both be 1.</li>
              <li>When a signal comes from outside, such as a button or another chip with its own clock, designers pass it through <strong>two flip-flops in a row</strong> (a synchronizer). That gives a metastable value a whole clock cycle to settle before anyone reads it.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'NAND version: the S̄R̄ latch (active-low)',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'S̄R̄ latch from two NAND gates',
  intro: 'Inputs rest at <b>1</b>. Flip <b>S̄</b> to 0 and back to 1 to set; flip <b>R̄</b> to 0 and back to reset.',
  scope: ['S̄', 'R̄', 'Q', 'Q̄'],
  parts: [
    { id: 's', type: 'IN', label: 'S̄', x: 20, y: 0, value: 1 },
    { id: 'r', type: 'IN', label: 'R̄', x: 20, y: 140, value: 1 },
    { id: 'n2', type: 'NAND', x: 180, y: 130 },
    { id: 'n1', type: 'NAND', x: 180, y: 10 },
    { id: 'q', type: 'OUT', label: 'Q', x: 340, y: 10, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 340, y: 130, color: '#64748b' },
  ],
  wires: [
    ['s', 'n1.0'], ['r', 'n2.1'], ['n1', 'q'], ['n2', 'qn'],
    ['n1', 'n2.0', { pts: [[260, 30], [260, 70], [160, 70], [160, 140]] }],
    ['n2', 'n1.1', { pts: [[280, 150], [280, 90], [150, 90], [150, 40]] }],
  ],
  help: 'Active-low: 0 means "pressed". A NAND with a 0 input always outputs 1, so S̄ = 0 forces Q = 1.',
});
<\/script>`,
        explain: `
          <details>
            <summary>Why the inputs are upside down</summary>
            <p>A NAND outputs 0 only when <em>both</em> inputs are 1. So a 0 on any input forces its output to <strong>1</strong>. That's why S̄ goes into the gate that drives <strong>Q</strong>: pulling S̄ low forces Q = 1, which is a set. At rest (S̄ = R̄ = 1) each NAND acts as a NOT of the other's output, the same 2-inverter ring as before.</p>
            <table>
              <tr><th>S̄</th><th>R̄</th><th>Q</th><th>Meaning</th></tr>
              <tr><td>1</td><td>1</td><td>unchanged</td><td>hold</td></tr>
              <tr><td>0</td><td>1</td><td>1</td><td>set</td></tr>
              <tr><td>1</td><td>0</td><td>0</td><td>reset</td></tr>
              <tr><td>0</td><td>0</td><td>1 (Q̄ = 1 too)</td><td>forbidden</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <strong>S̄</strong> (it becomes 0): Q lights. Click it back to 1: Q stays lit.</li>
              <li>Click <strong>R̄</strong> to 0 and back: Q goes off.</li>
              <li>Set both to 0: now Q and Q̄ are <em>both</em> 1, the NAND version of the forbidden state.</li>
            </ol>
            <div class="tip">Active-low signals are everywhere on real chips: <code>RESET̄</code>, <code>CS̄</code> (chip select), <code>WĒ</code> (write enable). One reason is that a wire that floats or gets disconnected tends to read as 1, so making 0 mean "do something" is the safer default.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In a NOR SR latch, S = 0 and R = 0. What is Q?', options: ['Always 0', 'Always 1', 'Whatever it was before (hold)', 'It oscillates'], answer: 2, why: 'With both inputs 0, each NOR acts as an inverter of the other: the loop holds its state.' },
      { q: 'Why is S = R = 1 "forbidden" in a NOR latch?', options: ['It burns the chip', 'Q and Q̄ are both 0, and releasing both together causes an unpredictable race', 'It sets Q to 1 forever', 'NOR gates cannot take two 1s'], answer: 1, why: 'Both outputs are forced to 0 (not complements). Releasing both at once makes the symmetric gates race, and the winner is unpredictable (metastability).' },
      { q: 'Pressing S on a NOR latch that has Q = 0: which output changes first?', options: ['Q rises first', 'Q̄ falls first, then Q rises one gate delay later', 'Both at the same time', 'Neither'], answer: 1, why: 'S goes into the Q̄ gate, forcing Q̄ to 0. Only then does the Q gate see two 0s and output 1.' },
      { q: 'In the NAND S̄R̄ latch, how do you set Q = 1?', options: ['Put S̄ = 1', 'Pulse S̄ to 0 then back to 1', 'Put both to 0', 'Pulse R̄ to 0'], answer: 1, why: 'Inputs are active-low: a 0 on S̄ forces its NAND (the Q gate) to output 1.' },
      { q: 'An SRAM cell in a CPU cache is…', options: ['a capacitor', 'two cross-coupled inverters plus 2 access transistors (6 transistors)', 'a floating-gate transistor', 'a single NOR gate'], answer: 1, why: 'The 6T SRAM cell = a latch (4 transistors forming two inverters) plus two access transistors connecting it to the bit lines.' },
    ],
    exercise: {
      task: `<p>Using only <strong>NOR</strong> gates, build an SR latch: pressing <strong>S</strong> sets Q = 1, pressing <strong>R</strong> resets Q = 0, and releasing a button keeps the value. <code>Q̄</code> must always be the opposite of <code>Q</code>.</p>
        <p>Build it in the board below, then click <strong>✔ Check</strong>. To make a feedback wire, drag from a gate's output pin to the other gate's input pin. The wire routes itself backwards.</p>`,
      hint: 'Two NORs. Q = NOR(R, Q̄) and Q̄ = NOR(S, Q). So R and Q̄ go into the Q gate, and S and Q go into the Q̄ gate. Each gate\'s output also goes to the other gate\'s free input.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: SR latch from NOR gates',
  build: { palette: ['NOR'], best: 2 },
  parts: [
    { id: 'r', type: 'BUTTON', label: 'R', x: 60, y: 80 },
    { id: 's', type: 'BUTTON', label: 'S', x: 60, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 640, y: 90, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 640, y: 230, color: '#64748b' },
  ],
  test: [
    { set: { S: 1 }, expect: { Q: 1, 'Q̄': 0 }, note: 'press S' },
    { set: { S: 0 }, expect: { Q: 1, 'Q̄': 0 }, note: 'release S: hold 1' },
    { set: { R: 1 }, expect: { Q: 0, 'Q̄': 1 }, note: 'press R' },
    { set: { R: 0 }, expect: { Q: 0, 'Q̄': 1 }, note: 'release R: hold 0' },
    { set: { S: 1 }, expect: { Q: 1, 'Q̄': 0 }, note: 'press S again' },
    { set: { S: 0 }, expect: { Q: 1, 'Q̄': 0 }, note: 'release S again' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: SR latch from NOR gates',
  build: { palette: ['NOR'], best: 2 },
  parts: [
    { id: 'r', type: 'BUTTON', label: 'R', x: 60, y: 80 },
    { id: 's', type: 'BUTTON', label: 'S', x: 60, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 640, y: 90, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 640, y: 230, color: '#64748b' },
    { id: 'gqn', type: 'NOR', x: 320, y: 230 },
    { id: 'gq', type: 'NOR', x: 320, y: 90 },
  ],
  wires: [
    ['r', 'gq.0', { mx: 200 }],
    ['s', 'gqn.1', { mx: 200 }],
    ['gq', 'q'],
    ['gqn', 'qn'],
    ['gq', 'gqn.0', { pts: [[400, 110], [400, 160], [300, 160], [300, 240]] }],
    ['gqn', 'gq.1', { pts: [[420, 250], [420, 190], [290, 190], [290, 120]] }],
  ],
  test: [
    { set: { S: 1 }, expect: { Q: 1, 'Q̄': 0 }, note: 'press S' },
    { set: { S: 0 }, expect: { Q: 1, 'Q̄': 0 }, note: 'release S: hold 1' },
    { set: { R: 1 }, expect: { Q: 0, 'Q̄': 1 }, note: 'press R' },
    { set: { R: 0 }, expect: { Q: 0, 'Q̄': 1 }, note: 'release R: hold 0' },
    { set: { S: 1 }, expect: { Q: 1, 'Q̄': 0 }, note: 'press S again' },
    { set: { S: 0 }, expect: { Q: 1, 'Q̄': 0 }, note: 'release S again' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── d-latch
  {
    id: 'd-latch',
    section: 'Memory & Time',
    title: 'Gated D latch: store one data bit on command',
    explain: `
      <p>The SR latch works, but it is awkward. You need two separate signals to store one bit, and one combination (S = R = 1) is forbidden. What we really want is closer to a variable assignment:</p>
      <pre><code>if (E) q = D;    // E = "enable" (also called "gate" or "write")</code></pre>
      <p>That is the <strong>gated D latch</strong> ("D" for data). It has two inputs:</p>
      <ul>
        <li><strong>D</strong>: the bit you want to store.</li>
        <li><strong>E</strong> (enable): while E = 1, the latch is <strong>transparent</strong> and Q simply follows D. When E drops to 0, the latch <strong>closes</strong> and Q keeps the last value D had.</li>
      </ul>
      <h3>How it's built</h3>
      <p>Put two AND gates in front of an SR latch:</p>
      <ul>
        <li><code>S = D AND E</code></li>
        <li><code>R = (NOT D) AND E</code></li>
      </ul>
      <p>Because S uses D and R uses NOT D, they can <strong>never both be 1</strong>, so the forbidden state is gone by design. When E = 0 both ANDs output 0, which means S = R = 0: hold.</p>
      <p>Think of a camera with the shutter held open. While E = 1 the sensor shows whatever is in front of it, live. Let go of E and the last frame stays frozen.</p>
      <div class="warn"><strong>Transparent means "follows", not "snapshots".</strong> While E = 1, every wiggle on D passes straight through to Q. If D changes three times while E is high, Q changes three times too. That is often a problem, and the next lessons fix it with the clock and the <em>flip-flop</em>.</div>
      <div class="tip">You built the D latch, so from now on it is a component. The built-in <code>DLATCH</code> chip (D, E → Q, Q̄) behaves exactly like the gate-level circuit in the first example.</div>
      <div class="world">
        <p>The <a href="https://en.wikipedia.org/wiki/List_of_7400-series_integrated_circuits" target="_blank">74HC573</a> is a real chip that holds 8 D latches with one shared enable pin (it calls it LE, "latch enable"). It was classically used on microprocessor buses, where one set of pins carries the memory address first and then the data. The latch grabs the address while LE is high and holds it while the pins move on to carrying data.</p>
        <p>Inside CPUs, some high-speed pipeline designs use latches instead of flip-flops between stages ("latch-based" or two-phase design). Transparency lets a slow stage borrow a little time from the next one.</p>
      </div>
    `,
    examples: [
      {
        title: 'D latch from gates: AND + NOT in front of an SR latch',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Gated D latch (gate level)',
  intro: 'Set <b>E = 1</b> and toggle <b>D</b>: Q follows. Now set <b>E = 0</b> and toggle D: Q ignores it.',
  scope: ['D', 'E', 'Q'],
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 20, y: 0 },
    { id: 'e', type: 'IN', label: 'E', x: 20, y: 160 },
    { id: 'inv', type: 'NOT', x: 120, y: 0 },
    { id: 'ar', type: 'AND', x: 240, y: 10 },
    { id: 'as', type: 'AND', x: 240, y: 150 },
    { id: 'nqn', type: 'NOR', x: 380, y: 140 },
    { id: 'nq', type: 'NOR', x: 380, y: 20 },
    { id: 'q', type: 'OUT', label: 'Q', x: 540, y: 20, color: '#f59e0b' },
    { id: 'qn', type: 'OUT', label: 'Q̄', x: 540, y: 140, color: '#64748b' },
    { id: 't1', type: 'TEXT', text: 'R = D̄·E', x: 306, y: 22, size: 11, color: '#7c3aed' },
    { id: 't2', type: 'TEXT', text: 'S = D·E', x: 306, y: 162, size: 11, color: '#7c3aed' },
    { id: 't3', type: 'TEXT', text: 'SR latch', x: 384, y: 125, size: 11, color: '#94a3b8' },
  ],
  wires: [
    ['d', 'inv'],
    ['d', 'as.0', { pts: [[90, 20], [90, 160]] }],
    ['e', 'as.1'],
    ['e', 'ar.1', { pts: [[210, 180], [210, 40]] }],
    ['inv', 'ar.0'],
    ['ar', 'nq.0'],
    ['as', 'nqn.1'],
    ['nq', 'q'],
    ['nqn', 'qn'],
    ['nq', 'nqn.0', { pts: [[460, 40], [460, 80], [360, 80], [360, 150]] }],
    ['nqn', 'nq.1', { pts: [[480, 160], [480, 100], [350, 100], [350, 50]] }],
  ],
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: SR needs two signals and has a forbidden state</summary>
            <p>An SR latch needs a "set" signal <em>and</em> a "reset" signal. We'd rather say "store <em>this</em> bit, now". So we generate S and R from a single data bit D: S = D·E and R = D̄·E. When D = 1 only S can be 1, and when D = 0 only R can be 1. They can never both be 1. The E input works like a gatekeeper: with E = 0 both AND gates output 0, so the SR latch just holds.</p>
          </details>
          <details>
            <summary>Step by step: a timing table</summary>
            <table>
              <tr><th>#</th><th>Action</th><th>D</th><th>E</th><th>S = D·E</th><th>R = D̄·E</th><th>Q</th><th>Why</th></tr>
              <tr><td>1</td><td>start</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td><td>hold (power-on value)</td></tr>
              <tr><td>2</td><td>click D</td><td>1</td><td>0</td><td>0</td><td>0</td><td>0</td><td>E = 0: closed, D ignored</td></tr>
              <tr><td>3</td><td>click E</td><td>1</td><td>1</td><td>1</td><td>0</td><td><strong>1</strong></td><td>open: set</td></tr>
              <tr><td>4</td><td>click D</td><td>0</td><td>1</td><td>0</td><td>1</td><td><strong>0</strong></td><td>still open: Q follows D</td></tr>
              <tr><td>5</td><td>click D</td><td>1</td><td>1</td><td>1</td><td>0</td><td><strong>1</strong></td><td>follows again (transparent)</td></tr>
              <tr><td>6</td><td>click E</td><td>1</td><td>0</td><td>0</td><td>0</td><td>1</td><td>closed: 1 is stored</td></tr>
              <tr><td>7</td><td>click D</td><td>0</td><td>0</td><td>0</td><td>0</td><td>1</td><td>closed: D = 0 has no effect</td></tr>
            </table>
            <p>On the oscilloscope, Q copies D during the stretches where E is high and stays flat where E is low.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Follow rows 2 → 7 of the table by clicking the D and E switches. Watch the purple S and R wires: at most one of them is ever green.</li>
              <li>Turn on <strong>🐢 Slow-mo</strong> with E = 1 and flip D from 0 to 1. For one tick both S and R are green, because the NOT gate is one delay slower than the direct wire. The latch shrugs it off and Q still ends at 1. Real designers still worry about small timing glitches like this one.</li>
              <li>Leave E = 1 and click D quickly several times: Q copies every click. That's transparency.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: thinking E = 1 takes a snapshot</summary>
            <p>Many beginners expect the latch to grab D at the moment E becomes 1. It doesn't. It keeps copying D for the whole time E is 1, and the value that's stored is whatever D was at the moment E <strong>fell</strong> to 0. If you want "store D at exactly one instant", you need an <em>edge-triggered flip-flop</em>, two lessons from now.</p>
          </details>
        `,
      },
      {
        title: 'Four latches, one enable: a 4-bit latch (like the 74HC573)',
        code: `<div id="c"></div>
<script>
var parts = [
  { id: 'D', type: 'NUMIN', label: 'D', x: 0, y: 0, value: 5 },
  { id: 'e', type: 'IN', label: 'E', x: 20, y: 310 },
  { id: 'Q', type: 'NUMOUT', label: 'Q', x: 400, y: 60 },
];
var wires = [];
var mxIn = [0, 150, 130, 110], mxOut = [330, 0, 320, 340];
for (var k = 0; k < 4; k++) {
  parts.push({ id: 'l' + k, type: 'DLATCH', x: 200, y: 80 * k });
  wires.push(['D.' + k, 'l' + k + '.D', k ? { mx: mxIn[k] } : {}]);
  wires.push(['e', 'l' + k + '.E', { pts: [[180, 330], [180, 80 * k + 50]] }]);
  wires.push(['l' + k + '.Q', 'Q.' + k, k === 1 ? {} : { mx: mxOut[k] }]);
}
window.api = Circ.mount('#c', {
  title: '4-bit latch: 4 DLATCH chips sharing one E',
  intro: 'Pick a number with ▲▼ while <b>E = 1</b>: Q follows. Set <b>E = 0</b>, then change D: Q keeps the stored number.',
  parts: parts, wires: wires, scope: ['E', 'D', 'Q'],
  help: 'Click ▲▼ or individual bits of D. E is a toggle switch.',
});
<\/script>`,
        explain: `
          <details>
            <summary>From one bit to a number</summary>
            <p>One D latch stores one bit. Put four side by side and connect all their <strong>E</strong> pins to one wire, and you can store a 4-bit number in one go. Bit <em>k</em> of D goes to latch <em>k</em>, and latch <em>k</em>'s Q goes to bit <em>k</em> of the display.</p>
            <table>
              <tr><th>Action</th><th>E</th><th>D</th><th>Q shows</th></tr>
              <tr><td>start</td><td>0</td><td>5</td><td>0 (nothing stored yet)</td></tr>
              <tr><td>click E</td><td>1</td><td>5</td><td>5: transparent</td></tr>
              <tr><td>click ▲ twice</td><td>1</td><td>7</td><td>7: follows</td></tr>
              <tr><td>click E</td><td>0</td><td>7</td><td>7: latched</td></tr>
              <tr><td>click ▲ / ▼</td><td>0</td><td>anything</td><td>still 7</td></tr>
            </table>
            <p>The scope shows D and Q as bus values (one box per value). Q copies D only while E is high.</p>
            <div class="tip">The 74HC573 is this circuit times two: 8 latches, one LE pin, plus an output-enable pin that can disconnect the outputs from the bus.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In a gated D latch with E = 1, what does Q do?', options: ['Holds its old value', 'Follows D (transparent)', 'Toggles', 'Becomes 0'], answer: 1, why: 'While enabled, the latch is transparent: Q = D, continuously.' },
      { q: 'E falls from 1 to 0 while D = 1. Then D changes to 0. What is Q?', options: ['0', '1', 'Random', 'It oscillates'], answer: 1, why: 'The latch stores the value D had when E fell (1). With E = 0 later changes of D are ignored.' },
      { q: 'Why can\'t the D latch reach the forbidden S = R = 1 state?', options: ['It has no NOR gates', 'S = D·E and R = D̄·E: D and NOT D are never both 1', 'E prevents oscillation', 'It can, it is just rare'], answer: 1, why: 'S and R are derived from D and its inverse, so at most one of them is 1.' },
      { q: 'What does the 74HC573 chip contain?', options: ['8 transparent D latches sharing a latch-enable pin', 'A 4-bit adder', 'An oscillator', '8 NAND gates'], answer: 0, why: 'It is an octal transparent latch, used for example to hold an address on a multiplexed bus.' },
    ],
    exercise: {
      task: `<p>You already built the SR latch, so now it is a component (<strong>SR LATCH</strong> chip: S, R → Q, Q̄). Using only <strong>SR LATCH</strong>, <strong>AND</strong> and <strong>NOT</strong>, build a gated D latch:</p>
        <ul><li>E = 1: Q follows D.</li><li>E = 0: Q holds, whatever D does.</li></ul>
        <p>Build it in the board below, then click <strong>✔ Check</strong>.</p>`,
      hint: 'S = D AND E, R = (NOT D) AND E. Feed those two AND outputs into the SR chip\'s S and R pins, and take Q from the chip.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: gated D latch',
  build: { palette: ['SR', 'AND', 'NOT'], best: 4 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 40, y: 60 },
    { id: 'e', type: 'IN', label: 'E', x: 40, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 110, color: '#f59e0b' },
  ],
  test: [
    { set: { D: 1, E: 1 }, expect: { Q: 1 }, note: 'E=1, D=1: Q follows → 1' },
    { set: { E: 0 }, expect: { Q: 1 }, note: 'close the latch' },
    { set: { D: 0 }, expect: { Q: 1 }, note: 'E=0: D ignored, hold 1' },
    { set: { E: 1 }, expect: { Q: 0 }, note: 'open again: follows D=0' },
    { set: { D: 1 }, expect: { Q: 1 }, note: 'still open: follows D=1' },
    { set: { D: 0 }, expect: { Q: 0 }, note: 'still open: follows D=0' },
    { set: { E: 0 }, expect: { Q: 0 }, note: 'close with 0 stored' },
    { set: { D: 1 }, expect: { Q: 0 }, note: 'E=0: hold 0' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: gated D latch',
  build: { palette: ['SR', 'AND', 'NOT'], best: 4 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 40, y: 60 },
    { id: 'e', type: 'IN', label: 'E', x: 40, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 110, color: '#f59e0b' },
    { id: 'inv', type: 'NOT', x: 160, y: 160 },
    { id: 'as', type: 'AND', x: 300, y: 70 },
    { id: 'ar', type: 'AND', x: 300, y: 170 },
    { id: 'sr', type: 'SR', x: 440, y: 100 },
  ],
  wires: [
    ['d', 'as.0'],
    ['d', 'inv', { mx: 120 }],
    ['inv', 'ar.0'],
    ['e', 'as.1', { mx: 260 }],
    ['e', 'ar.1', { mx: 260 }],
    ['as', 'sr.S', { mx: 400 }],
    ['ar', 'sr.R', { mx: 410 }],
    ['sr.Q', 'q'],
  ],
  test: [
    { set: { D: 1, E: 1 }, expect: { Q: 1 }, note: 'E=1, D=1: Q follows → 1' },
    { set: { E: 0 }, expect: { Q: 1 }, note: 'close the latch' },
    { set: { D: 0 }, expect: { Q: 1 }, note: 'E=0: D ignored, hold 1' },
    { set: { E: 1 }, expect: { Q: 0 }, note: 'open again: follows D=0' },
    { set: { D: 1 }, expect: { Q: 1 }, note: 'still open: follows D=1' },
    { set: { D: 0 }, expect: { Q: 0 }, note: 'still open: follows D=0' },
    { set: { E: 0 }, expect: { Q: 0 }, note: 'close with 0 stored' },
    { set: { D: 1 }, expect: { Q: 0 }, note: 'E=0: hold 0' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── clock
  {
    id: 'clock',
    section: 'Memory & Time',
    title: 'The clock: one heartbeat for the whole chip',
    explain: `
      <p>Gates are not instant. Every gate takes one <strong>gate delay</strong> to react, and a signal passing through 20 gates arrives 20 delays later. While it travels, the output can show <strong>wrong values</strong> for a moment (a glitch), because some paths are faster than others. If memory blindly stored whatever it saw, it would sometimes store that garbage.</p>
      <h3>The fix: agree on when to look</h3>
      <p>A <strong>clock</strong> is a signal that ticks 0, 1, 0, 1… forever at a steady rate. The design rule of almost every chip, <strong>synchronous design</strong>, is:</p>
      <ol>
        <li>All memory updates <strong>only on the clock tick</strong> (the moment the clock rises from 0 to 1, called the <em>rising edge</em>).</li>
        <li>Between ticks the combinational logic (adders, muxes…) is allowed to glitch and settle however it likes. Nobody is looking.</li>
        <li>The clock <strong>period</strong> must be longer than the slowest path through the logic, plus a little margin. Then every result is settled before the next tick grabs it.</li>
      </ol>
      <p>It works like a rowing team with a drummer. The rowers (gates) are not equally fast, but nobody moves to the next stroke until the drum beats. The drum just has to be slow enough for the slowest rower.</p>
      <pre><code>// a game loop is a software clock
while (true) {
  waitForTick();             // the rising edge
  state = nextState(state);  // everything updates together
}</code></pre>
      <div class="tip"><strong>Frequency = 1 / period.</strong> A 1 GHz clock ticks 1,000,000,000 times per second, so one period is 1 ns = 1000 ps (picoseconds). At 5 GHz the period is just 200 ps.</div>
      <div class="warn">The clock does not make logic faster. It makes logic <strong>predictable</strong>. The price is that every cycle must wait for the slowest path, called the <em>critical path</em>. Making that path shorter (for example with carry-lookahead instead of ripple carry) is how designers raise the clock speed.</div>
      <div class="world">
        <p><strong>GHz.</strong> A 5 GHz CPU core ticks 5 billion times per second. In one tick (0.2 ns), light travels only about 6 cm, so even wire length matters inside a chip.</p>
        <p><strong>Quartz.</strong> Watches use a quartz tuning-fork crystal that vibrates at <strong>32,768 Hz = 2<sup>15</sup></strong>. Halve that 15 times with flip-flops (see the Counters lesson) and you get exactly 1 tick per second. PCs start from a reference clock (around 100 MHz on many desktops) and multiply it up inside the CPU with a <a href="https://en.wikipedia.org/wiki/Phase-locked_loop" target="_blank">PLL</a>.</p>
        <p><strong>Overclocking</strong> means raising that multiplier. If the period drops below the critical path, the chip computes garbage and crashes. Raising the voltage makes transistors switch faster, but dynamic power grows roughly with <em>voltage² × frequency</em>, so it gets hot.</p>
        <p><strong>Clock distribution.</strong> The clock has to reach billions of flip-flops at almost the same instant, through a tree of buffers. That network can use a large share of a chip's power, so idle blocks get their clock switched off (<a href="https://en.wikipedia.org/wiki/Clock_gating" target="_blank">clock gating</a>).</p>
      </div>
    `,
    examples: [
      {
        title: 'Why we wait: a glitch from unequal paths',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'A AND (NOT A): should always be 0… right?',
  intro: 'Turn on <b>🐢 Slow-mo</b>, then flip <b>A</b> from 0 to 1. Watch Y.',
  table: false,
  parts: [
    { id: 'a', type: 'IN', label: 'A', x: 20, y: 10 },
    { id: 'inv', type: 'NOT', x: 120, y: 40 },
    { id: 'g', type: 'AND', x: 260, y: 20 },
    { id: 'y', type: 'OUT', label: 'Y', x: 400, y: 20, color: '#ef4444' },
    { id: 't', type: 'TEXT', text: 'slow path: 1 extra gate delay', x: 104, y: 116, size: 11, color: '#7c3aed' },
  ],
  wires: [
    ['a', 'g.0'],
    ['a', 'inv', { pts: [[90, 30], [90, 60]] }],
    ['inv', 'g.1', { mx: 220 }],
    ['g', 'y'],
  ],
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: two paths, two speeds</summary>
            <p>Logically, <code>A AND (NOT A)</code> is always 0. But the signal reaches the AND gate by two routes: directly (fast) and through the NOT (one gate delay slower). For a moment after A changes, the AND sees the <em>new</em> A together with the <em>old</em> NOT A.</p>
            <table>
              <tr><th>Tick</th><th>A</th><th>NOT A</th><th>Y = A AND NOT A</th></tr>
              <tr><td>before</td><td>0</td><td>1</td><td>0</td></tr>
              <tr><td>flip A</td><td>1</td><td>1 (not updated yet)</td><td>0 (still computing)</td></tr>
              <tr><td>+1</td><td>1</td><td>0</td><td><strong>1</strong> ← glitch!</td></tr>
              <tr><td>+2</td><td>1</td><td>0</td><td>0: settled</td></tr>
            </table>
            <p>Flipping A from 1 to 0 doesn't glitch, because the direct path forces the AND to 0 first. A glitch like this is called a <strong>hazard</strong>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Turn on <strong>🐢 Slow-mo</strong>. Flip A to 1: the red LED flashes for one step, then goes out.</li>
              <li>Flip A back to 0: no flash.</li>
              <li>Turn Slow-mo off: now everything settles instantly and you never see the glitch. In real hardware it lasts picoseconds, but a latch that happens to be open at that moment <em>would</em> store it.</li>
            </ol>
          </details>
          <details>
            <summary>How the clock saves us</summary>
            <p>A synchronous design never looks at Y in the middle of a change. It only samples on the next clock edge, and by then Y has settled to 0. Glitches between ticks are harmless. That is the whole idea of a clock: <strong>wait until everything has settled, then everyone updates at once</strong>.</p>
          </details>
        `,
      },
      {
        title: 'The CLOCK part (and clock gating)',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'A clock and a clock gate',
  intro: 'Press <b>▶ Clock</b> to start ticking, or <b>⏭ Pulse</b> for one full tick (0 → 1 → 0). Turn <b>EN</b> off to "gate" the clock.',
  scope: ['CLK', 'EN', 'GCLK'],
  clockMs: 600,
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 0 },
    { id: 'en', type: 'IN', label: 'EN', x: 20, y: 70, value: 1 },
    { id: 'g', type: 'AND', x: 180, y: 10 },
    { id: 'o', type: 'OUT', label: 'GCLK', x: 320, y: 10, color: '#6366f1' },
  ],
  wires: [['clk', 'g.0'], ['en', 'g.1', { mx: 130 }], ['g', 'o']],
  help: 'You can also click the CLK part itself to flip it by hand. The 🔁 counter counts rising edges.',
});
<\/script>`,
        explain: `
          <details>
            <summary>What you are looking at</summary>
            <p>The <strong>CLK</strong> part is a square-wave generator. <strong>▶ Clock</strong> flips it every 0.6 s. A real CPU clock flips about ten billion times faster. <strong>⏭ Pulse</strong> does exactly one cycle: 0 → 1 (the <em>rising edge</em>, the moment memory updates) → 0. The <strong>🔁 clock cycles</strong> counter in the status line counts rising edges.</p>
            <p>The AND gate is a <strong>clock gate</strong>: with EN = 1, GCLK copies CLK. With EN = 0, GCLK stays flat, so anything connected to GCLK freezes and stops using power. On the scope you'll see GCLK's pulses vanish while EN is low.</p>
          </details>
          <details>
            <summary>Common mistake: gating with a plain AND in real chips</summary>
            <p>If EN changes <em>while CLK is 1</em>, the AND output can produce a chopped, extra-short pulse, which is a fake clock edge. Try it: stop the clock while CLK is high (click the CLK part until it is green), then flip EN off and on. GCLK jumps up without CLK doing anything. Real chips use special "integrated clock gating" cells, which contain a latch that only lets EN change while CLK is low. You'll meet this exact bug again in the Registers lesson.</p>
          </details>
        `,
      },
      {
        title: 'How fast can the clock go? (timing diagram)',
        code: `<style>
  .tw { font:14px system-ui; color:#1f2330; }
  .tw .ctl { display:grid; grid-template-columns: 210px 1fr 90px; gap:6px 10px; align-items:center; max-width:760px; }
  .tw input[type=range] { width:100%; }
  .tw .val { font-weight:700; font-variant-numeric: tabular-nums; }
  .tw .card { background:#fff; border:1px solid #e2e5ee; border-radius:10px; padding:10px 12px; margin-top:8px; }
  .tw .ok { color:#15803d; font-weight:700; } .tw .bad { color:#b91c1c; font-weight:700; }
  .tw .presets button { margin:6px 6px 0 0; padding:4px 10px; border-radius:7px; border:1px solid #c7cede; background:#fff; cursor:pointer; }
</style>
<div class="tw">
  <div class="ctl">
    <label>Clock frequency</label><input id="f" type="range" min="0.5" max="8" step="0.1" value="2"><span class="val" id="fv"></span>
    <label>Longest path (gates in a row)</label><input id="n" type="range" min="2" max="40" step="1" value="16"><span class="val" id="nv"></span>
    <label>One gate delay</label><input id="g" type="range" min="5" max="50" step="1" value="20"><span class="val" id="gv"></span>
  </div>
  <div class="presets">Presets:
    <button data-p="2,16,20">safe 2 GHz</button><button data-p="4,16,20">overclocked 4 GHz</button><button data-p="4,8,20">shorter path (pipelining)</button><button data-p="4,16,12">more voltage (faster gates)</button>
  </div>
  <div class="card"><svg id="sv" width="900" height="190" viewBox="0 0 900 190"></svg></div>
  <div class="card" id="rd"></div>
</div>
<script>
var SETUP = 30;
function $(id) { return document.getElementById(id); }
function draw() {
  var f = +$('f').value, n = +$('n').value, gd = +$('g').value;
  $('fv').textContent = f.toFixed(1) + ' GHz'; $('nv').textContent = n + ' gates'; $('gv').textContent = gd + ' ps';
  var T = 1000 / f, path = n * gd, need = path + SETUP, ok = need <= T;
  var x0 = 90, W = 780, per = W / 3, s = '';
  function X(t) { return x0 + t / T * per; }
  // rows
  var rows = [['CLK', 25], ['register out', 85], ['logic result', 145]];
  rows.forEach(function (r) { s += '<text x="6" y="' + (r[1] + 5) + '" font-size="12" font-weight="700" fill="#334155">' + r[0] + '</text>'; });
  // clock
  var d = 'M' + x0 + ' 40';
  for (var c = 0; c < 3; c++) { var a = x0 + c * per; d += ' V10 H' + (a + per / 2) + ' V40 H' + (a + per); }
  s += '<path d="' + d + '" fill="none" stroke="#4f46e5" stroke-width="2.5"/>';
  for (var c = 0; c <= 3; c++) { var a = x0 + c * per; s += '<line x1="' + a + '" y1="5" x2="' + a + '" y2="175" stroke="#a5b4fc" stroke-dasharray="3 3"/><text x="' + (a + 3) + '" y="186" font-size="10.5" fill="#6366f1">edge ' + c + '</text>'; }
  // register output: changes at each edge
  for (var c = 0; c < 3; c++) { var a = x0 + c * per; s += '<rect x="' + (a + 2) + '" y="72" width="' + (per - 4) + '" height="26" rx="6" fill="#eef2ff" stroke="#818cf8"/><text x="' + (a + 10) + '" y="89" font-size="11.5" fill="#3730a3">value ' + (c + 1) + ' (new inputs)</text>'; }
  // logic result: settling then valid
  for (var c = 0; c < 3; c++) {
    var a = x0 + c * per, end = a + per;
    var sw = Math.min(path / T * per, per * 1.6), sx2 = a + sw;
    s += '<rect x="' + (a + 2) + '" y="132" width="' + Math.max(0, Math.min(sw, x0 + W - a) - 2) + '" height="26" rx="5" fill="url(#hatch)" stroke="#f59e0b"/>';
    if (sw < per) s += '<rect x="' + (sx2 + 1) + '" y="132" width="' + (end - sx2 - 3) + '" height="26" rx="5" fill="#dcfce7" stroke="#22c55e"/><text x="' + (sx2 + 5) + '" y="149" font-size="11" fill="#166534">' + (end - sx2 > 100 ? 'valid result ' + (c + 1) : '✓') + '</text>';
    // setup window before next edge
    var sp = SETUP / T * per;
    s += '<rect x="' + (end - sp) + '" y="126" width="' + sp + '" height="38" fill="' + (ok ? 'rgba(34,197,94,.18)' : 'rgba(239,68,68,.25)') + '"/>';
  }
  s += '<text x="' + (x0 + per - 4) + '" y="122" text-anchor="end" font-size="11" fill="' + (ok ? '#15803d' : '#b91c1c') + '" font-weight="700">' + (ok ? 'edge 1 captures a settled value ✓' : 'edge 1 captures garbage ✗') + '</text>';
  $('sv').innerHTML = '<defs><pattern id="hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="#fef3c7"/><line x1="0" y1="0" x2="0" y2="8" stroke="#f59e0b" stroke-width="3"/></pattern></defs>' + s;
  var fmax = 1000 / need;
  $('rd').innerHTML = 'Period = 1 / ' + f.toFixed(1) + ' GHz = <b>' + T.toFixed(0) + ' ps</b>. Needed = ' + n + ' × ' + gd + ' ps (settling, hatched) + ' + SETUP + ' ps setup (shaded) = <b>' + need + ' ps</b>.<br>' +
    (ok ? '<span class="ok">✅ Works.</span> Slack = ' + (T - need).toFixed(0) + ' ps to spare.' : '<span class="bad">❌ Too fast!</span> The logic is still settling when the next edge arrives, so the register stores a half-computed value.') +
    ' Max safe clock for this path: <b>' + fmax.toFixed(2) + ' GHz</b>. In one period light travels ' + (T * 0.03).toFixed(1) + ' cm.';
}
['f', 'n', 'g'].forEach(function (id) { $(id).oninput = draw; });
document.querySelectorAll('.presets button').forEach(function (b) { b.onclick = function () { var p = b.dataset.p.split(','); $('f').value = p[0]; $('n').value = p[1]; $('g').value = p[2]; draw(); }; });
draw();
<\/script>`,
        explain: `
          <details>
            <summary>Reading the diagram</summary>
            <p>At every rising <strong>edge</strong>, the registers present new values to the logic (blue row). The logic then needs <code>gates × gate delay</code> to settle (hatched orange). Only after that is the result valid (green). The next edge must not come until the result is valid <strong>plus a setup time</strong> (shaded strip), because the flip-flop needs its input stable for a moment before the edge.</p>
            <p>The rule: <code>period ≥ longest path + setup</code>, so <code>max frequency = 1 / (longest path + setup)</code>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <strong>safe 2 GHz</strong>: 500 ps period, 16 × 20 + 30 = 350 ps needed. ✅</li>
              <li>Click <strong>overclocked 4 GHz</strong>: 250 ps period, still 350 ps needed. ❌ The hatched bar runs past the next edge.</li>
              <li>Two real fixes: <strong>shorter path (pipelining)</strong> splits the logic into 8-gate stages with a register in between, and <strong>more voltage (faster gates)</strong> makes each gate switch in 12 ps instead of 20, at the cost of heat.</li>
              <li>Drag the frequency slider slowly upward and find the exact point where ✅ turns into ❌. It matches the "max safe clock" readout.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In synchronous design, when does memory (registers) update?', options: ['Whenever any input changes', 'Only on the clock edge (e.g. rising edge)', 'Every gate delay', 'When the output glitches'], answer: 1, why: 'All state changes happen together on the clock tick. Between ticks the logic settles undisturbed.' },
      { q: 'A clock runs at 2 GHz. How long is one period?', options: ['2 ns', '0.5 ns (500 ps)', '50 ps', '2 ps'], answer: 1, why: 'Period = 1 / frequency = 1 / (2 × 10⁹) s = 0.5 ns.' },
      { q: 'What limits the maximum clock frequency?', options: ['The number of LEDs', 'The slowest (critical) path through the logic plus setup time', 'The fastest path', 'The size of the RAM'], answer: 1, why: 'Every result must settle before the next edge, so the slowest path sets the minimum period.' },
      { q: 'Why do watches use a 32,768 Hz crystal?', options: ['It is the speed of sound', 'It equals 2¹⁵, so 15 divide-by-2 stages give exactly 1 Hz', 'It is the fastest quartz possible', 'Random tradition'], answer: 1, why: '32,768 = 2¹⁵. A chain of 15 flip-flops halving the frequency produces a 1-second tick.' },
      { q: 'What happens if you overclock past the critical path?', options: ['The CPU gets slower but correct', 'Registers capture half-settled values: wrong results and crashes', 'Nothing', 'The clock stops'], answer: 1, why: 'If the period is shorter than the settling time, the flip-flops sample garbage.' },
    ],
    exercise: {
      task: `<p>A pipeline stage of a CPU has the three logic paths shown in the box below. Each gate takes <strong>25 ps</strong>, and the flip-flop at the end needs <strong>50 ps setup time</strong>.</p>
        <p>What is the <strong>highest clock frequency</strong> (in GHz) at which this stage still works? Type it in the box below and click <strong>✔ Check</strong>.</p>`,
      hint: 'Find the longest path (count its gates). Period = gates × 25 ps + 50 ps. Frequency in GHz = 1000 / period in ps.',
      starter: `<style>
  .ex { font:14px system-ui; color:#1f2330; }
  .ex .path { display:flex; align-items:center; gap:3px; margin:6px 0; }
  .ex .path b { width:70px; }
  .ex .g { width:22px; height:18px; border-radius:4px; background:#e0e7ff; border:1px solid #818cf8; }
  .ex .ff { padding:2px 8px; border-radius:5px; background:#fff7ed; border:1px solid #fb923c; font-size:12px; font-weight:700; }
  .ex .ans { margin-top:12px; display:flex; gap:8px; align-items:center; }
  .ex input { width:90px; padding:5px 8px; font-size:15px; border:1px solid #c7cede; border-radius:7px; }
  .ex button { padding:5px 14px; border-radius:7px; border:1px solid #16a34a; background:#16a34a; color:#fff; font-weight:700; cursor:pointer; }
</style>
<div class="ex">
  <div id="paths"></div>
  <div style="font-size:12.5px;color:#64748b">Each blue box = 1 gate (25 ps). REG = flip-flop that needs 50 ps setup time.</div>
  <div class="ans">Max clock = <input id="ans" value=""> GHz <button id="chk">✔ Check</button></div>
  <div class="circ-result" id="res"></div>
</div>
<script>
var P = [['path A', 12], ['path B', 18], ['path C', 15]];
document.getElementById('paths').innerHTML = P.map(function (p) {
  var g = ''; for (var i = 0; i < p[1]; i++) g += '<span class="g"></span>';
  return '<div class="path"><b>' + p[0] + '</b><span class="ff">REG</span>' + g + '<span class="ff">REG</span></div>';
}).join('');
document.getElementById('chk').onclick = function () {
  var r = document.getElementById('res'), v = parseFloat(document.getElementById('ans').value.replace(',', '.'));
  function bad(m) { r.className = 'circ-result bad'; r.innerHTML = '❌ ' + m; console.log('❌ ' + m); }
  if (isNaN(v)) return bad('Type a number in GHz, e.g. 1.5');
  if (Math.abs(v - 2) <= 0.03) { r.className = 'circ-result ok'; r.innerHTML = '✅ Correct! Path B is critical: 18 × 25 = 450 ps + 50 ps setup = 500 ps → 1 / 500 ps = 2 GHz.'; console.log('✅ Correct: 2 GHz'); return; }
  if (Math.abs(v - 1000 / 450) < 0.05) return bad('Close, but you forgot the 50 ps setup time.');
  if (Math.abs(v - 1000 / 350) < 0.05 || Math.abs(v - 1000 / 425) < 0.05) return bad('That is the speed of a shorter path. The clock must wait for the slowest one.');
  if (Math.abs(v - 0.5) < 0.03) return bad('500 is the period in ps. Now convert: f = 1000 / 500 ps in GHz.');
  bad('Not quite. Count the gates in the longest path, multiply by 25 ps, add 50 ps, then take 1000 / that.');
};
<\/script>`,
      solution: `<style>
  .ex { font:14px system-ui; color:#1f2330; }
  .ex .path { display:flex; align-items:center; gap:3px; margin:6px 0; }
  .ex .path b { width:70px; }
  .ex .g { width:22px; height:18px; border-radius:4px; background:#e0e7ff; border:1px solid #818cf8; }
  .ex .ff { padding:2px 8px; border-radius:5px; background:#fff7ed; border:1px solid #fb923c; font-size:12px; font-weight:700; }
  .ex .ans { margin-top:12px; display:flex; gap:8px; align-items:center; }
  .ex input { width:90px; padding:5px 8px; font-size:15px; border:1px solid #c7cede; border-radius:7px; }
  .ex button { padding:5px 14px; border-radius:7px; border:1px solid #16a34a; background:#16a34a; color:#fff; font-weight:700; cursor:pointer; }
</style>
<div class="ex">
  <div id="paths"></div>
  <div style="font-size:12.5px;color:#64748b">Each blue box = 1 gate (25 ps). REG = flip-flop that needs 50 ps setup time.</div>
  <div class="ans">Max clock = <input id="ans" value="2"> GHz <button id="chk">✔ Check</button></div>
  <div class="circ-result" id="res"></div>
</div>
<script>
var P = [['path A', 12], ['path B', 18], ['path C', 15]];
document.getElementById('paths').innerHTML = P.map(function (p) {
  var g = ''; for (var i = 0; i < p[1]; i++) g += '<span class="g"></span>';
  return '<div class="path"><b>' + p[0] + '</b><span class="ff">REG</span>' + g + '<span class="ff">REG</span></div>';
}).join('');
document.getElementById('chk').onclick = function () {
  var r = document.getElementById('res'), v = parseFloat(document.getElementById('ans').value.replace(',', '.'));
  function bad(m) { r.className = 'circ-result bad'; r.innerHTML = '❌ ' + m; console.log('❌ ' + m); }
  if (isNaN(v)) return bad('Type a number in GHz, e.g. 1.5');
  if (Math.abs(v - 2) <= 0.03) { r.className = 'circ-result ok'; r.innerHTML = '✅ Correct! Path B is critical: 18 × 25 = 450 ps + 50 ps setup = 500 ps → 1 / 500 ps = 2 GHz.'; console.log('✅ Correct: 2 GHz'); return; }
  if (Math.abs(v - 1000 / 450) < 0.05) return bad('Close, but you forgot the 50 ps setup time.');
  if (Math.abs(v - 1000 / 350) < 0.05 || Math.abs(v - 1000 / 425) < 0.05) return bad('That is the speed of a shorter path. The clock must wait for the slowest one.');
  if (Math.abs(v - 0.5) < 0.03) return bad('500 is the period in ps. Now convert: f = 1000 / 500 ps in GHz.');
  bad('Not quite. Count the gates in the longest path, multiply by 25 ps, add 50 ps, then take 1000 / that.');
};
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── d-flip-flop
  {
    id: 'd-flip-flop',
    section: 'Memory & Time',
    title: 'Edge-triggered D flip-flop: a snapshot on the tick',
    explain: `
      <p>The D latch is <em>transparent</em>: while E = 1, Q follows every change of D. For synchronous design we want something stricter. Memory should take <strong>one snapshot of D at the exact instant the clock rises</strong> and ignore D the rest of the time. That's the <strong>edge-triggered D flip-flop</strong> (DFF).</p>
      <pre><code>// latch:      while (E) q = D;            // copies for as long as E is high
// flip-flop:  on rising edge of CLK: q = D; // copies once per tick</code></pre>
      <h3>The trick: two latches back to back (master–slave)</h3>
      <p>Chain two D latches and give them <strong>opposite</strong> enables:</p>
      <ul>
        <li><strong>Master</strong> latch: enabled when CLK = 0 (through a NOT). It follows D while the clock is low.</li>
        <li><strong>Slave</strong> latch: enabled when CLK = 1. It copies the master while the clock is high.</li>
      </ul>
      <p>At any moment exactly one of the two is open, so D can never run straight through to Q. At the rising edge the master <em>closes</em> (freezing the value D had just before the edge) and the slave <em>opens</em> to show that frozen value. It's an airlock with two doors that are never open at the same time.</p>
      <div class="tip">From now on we use the built-in <code>DFF</code> chip (D, CLK → Q, Q̄). The little <strong>▷</strong> on its CLK pin is the standard symbol for "edge-triggered".</div>
      <div class="warn"><strong>Setup and hold time.</strong> A real flip-flop needs D to be stable for a short time <em>before</em> the edge (setup) and <em>after</em> it (hold). If D changes inside that window, the flip-flop may capture the wrong value or even go metastable. The first example has a button that breaks the hold rule on purpose.</div>
      <div class="world">
        <p>Every bit of every <strong>register</strong> in a CPU, every pipeline stage boundary and every state machine is built from edge-triggered flip-flops (or close relatives). A modern CPU core has hundreds of thousands of them. Chip-design tools spend much of their effort on <em>static timing analysis</em>, checking that every path between two flip-flops meets setup and hold time at the target clock.</p>
        <p>As a discrete part, the classic <a href="https://en.wikipedia.org/wiki/List_of_7400-series_integrated_circuits" target="_blank">74HC74</a> holds two positive-edge-triggered D flip-flops, each with extra asynchronous set/reset pins.</p>
      </div>
    `,
    examples: [
      {
        title: 'Master–slave flip-flop from two D latches',
        code: `<style>
  .hv { margin:8px 0 0; display:flex; gap:8px; align-items:center; flex-wrap:wrap; font:13.5px system-ui; }
  .hv button { padding:5px 12px; border-radius:8px; border:1px solid #fca5a5; background:#fee2e2; cursor:pointer; font-weight:600; }
  #hvout { color:#7f1d1d; }
</style>
<div id="c"></div>
<div class="hv"><button id="hold">⚡ Change D at the exact instant of a rising edge</button><span id="hvout"></span></div>
<script>
window.api = Circ.mount('#c', {
  title: 'D flip-flop = master latch + slave latch',
  intro: 'Click the <b>CLK</b> part to flip the clock by hand, and toggle <b>D</b> in between. <b>M</b> shows the master latch, <b>Q</b> the slave.',
  scope: ['CLK', 'D', 'M', 'Q'],
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 20, y: 0 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 100 },
    { id: 'inv', type: 'NOT', x: 120, y: 100 },
    { id: 'm', type: 'DLATCH', label: 'MASTER', x: 200, y: -10 },
    { id: 's', type: 'DLATCH', label: 'SLAVE', x: 380, y: -10 },
    { id: 'mo', type: 'OUT', label: 'M', x: 330, y: -70, color: '#a855f7' },
    { id: 'q', type: 'OUT', label: 'Q', x: 540, y: 0, color: '#f59e0b' },
    { id: 't1', type: 'TEXT', text: 'open while CLK = 0', x: 196, y: 70, size: 11, color: '#7c3aed' },
    { id: 't2', type: 'TEXT', text: 'open while CLK = 1', x: 376, y: 70, size: 11, color: '#7c3aed' },
  ],
  wires: [
    ['d', 'm.D'],
    ['clk', 'inv'],
    ['inv', 'm.E', { pts: [[190, 120], [190, 40]] }],
    ['clk', 's.E', { pts: [[90, 120], [90, 170], [350, 170], [350, 40]] }],
    ['m.Q', 's.D'],
    ['m.Q', 'mo', { pts: [[310, 20], [310, -50]] }],
    ['s.Q', 'q'],
  ],
  help: 'Click CLK to flip it 0↔1, or use ⏭ Pulse for a full 0→1→0 tick. D is a toggle switch.',
});
document.getElementById('hold').onclick = function () {
  if (api.get('CLK')) { api.find('CLK').value = 0; api.update(); }
  var old = api.get('D');
  api.find('CLK').value = 1; api.find('D').value = old ^ 1; api.update();
  var q = api.get('Q');
  document.getElementById('hvout').innerHTML = 'D was ' + old + ' just before the edge and changed to ' + (old ^ 1) + ' at the same instant. Q = <b>' + q + '</b>: ' +
    (q === old ? 'it kept the old value.' : 'it grabbed the <b>new</b> value, because the master stayed open for one extra gate delay (the NOT). That is a <b>hold-time violation</b>.');
};
<\/script>`,
        explain: `
          <details>
            <summary>The problem: a transparent latch lets D race through</summary>
            <p>If registers were plain latches enabled by the clock, then during the whole high half of the clock a result could pass through one register, through the next logic and into the next register, all in one cycle. Nothing would happen "one step per tick". We need storage that reacts to the clock's <strong>edge</strong>, not its level.</p>
          </details>
          <details>
            <summary>Step by step: timing table</summary>
            <table>
              <tr><th>#</th><th>Click</th><th>CLK</th><th>D</th><th>M (master)</th><th>Q (slave)</th><th>What happens</th></tr>
              <tr><td>1</td><td>(start)</td><td>0</td><td>0</td><td>0</td><td>0</td><td>master open, slave closed</td></tr>
              <tr><td>2</td><td>D</td><td>0</td><td>1</td><td><strong>1</strong></td><td>0</td><td>master follows D; Q unaffected</td></tr>
              <tr><td>3</td><td>CLK ↑</td><td>1</td><td>1</td><td>1</td><td><strong>1</strong></td><td><strong>rising edge</strong>: master closes, slave opens and shows M</td></tr>
              <tr><td>4</td><td>D</td><td>1</td><td>0</td><td>1</td><td>1</td><td>master is closed: D ignored</td></tr>
              <tr><td>5</td><td>CLK ↓</td><td>0</td><td>0</td><td><strong>0</strong></td><td>1</td><td>falling edge: slave closes (keeps 1), master opens and follows D</td></tr>
              <tr><td>6</td><td>D</td><td>0</td><td>1</td><td>1</td><td>1</td><td>master follows, Q still unaffected</td></tr>
              <tr><td>7</td><td>D</td><td>0</td><td>0</td><td>0</td><td>1</td><td>…Q changes only at the next rising edge</td></tr>
            </table>
            <p>Q changes <strong>only</strong> at row 3, the rising edge. On the scope, M wiggles with D while CLK is low, and Q steps only where CLK goes up.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Follow the table: click D, then CLK, then D, then CLK, then D. Compare M and Q.</li>
              <li>With CLK = 1 (green), toggle D several times. Q does not move. That's the difference from a latch.</li>
              <li>Click <strong>⚡ Change D at the exact instant of a rising edge</strong>. The flip-flop captures the <em>new</em> D. The master's enable comes through a NOT, which is one gate delay late, so for one tick both latches are open. Real flip-flops have the same kind of window, which is why datasheets specify a <strong>hold time</strong>: keep D steady a little after the edge.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: "it triggers on both edges"</summary>
            <p>The falling edge does change M (the master opens), but Q never changes on the falling edge, because the slave closes at that same moment. Only the rising edge moves Q. Swap which latch gets the NOT and you get a <em>falling</em>-edge flip-flop instead.</p>
          </details>
        `,
      },
      {
        title: 'Latch vs flip-flop on the oscilloscope',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Same D, same clock: D latch vs D flip-flop',
  intro: 'Click <b>CLK</b> to 1, then toggle <b>D</b> a few times. Then click CLK back to 0 and toggle D again. Compare the two LEDs and the scope.',
  scope: ['CLK', 'D', 'LATCH', 'FF'],
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 20, y: 0 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 140 },
    { id: 'l', type: 'DLATCH', x: 200, y: -10 },
    { id: 'f', type: 'DFF', x: 200, y: 110 },
    { id: 'ql', type: 'OUT', label: 'LATCH', x: 360, y: 0, color: '#a855f7' },
    { id: 'qf', type: 'OUT', label: 'FF', x: 360, y: 120, color: '#f59e0b' },
  ],
  wires: [
    ['d', 'l.D'],
    ['d', 'f.D', { pts: [[160, 20], [160, 140]] }],
    ['clk', 'f.CLK'],
    ['clk', 'l.E', { pts: [[120, 160], [120, 40]] }],
    ['l.Q', 'ql'],
    ['f.Q', 'qf'],
  ],
  help: 'The latch\\'s E and the flip-flop\\'s CLK are the same wire.',
});
<\/script>`,
        explain: `
          <details>
            <summary>What to expect</summary>
            <table>
              <tr><th>Situation</th><th>D latch (E = CLK)</th><th>D flip-flop</th></tr>
              <tr><td>CLK = 1, D toggles</td><td>follows every toggle (transparent)</td><td>does nothing</td></tr>
              <tr><td>CLK = 0, D toggles</td><td>holds</td><td>holds</td></tr>
              <tr><td>CLK rises 0 → 1</td><td>starts following D</td><td><strong>takes one snapshot of D</strong></td></tr>
              <tr><td>CLK falls 1 → 0</td><td>freezes the last D</td><td>nothing</td></tr>
            </table>
            <p>On the scope, the LATCH trace looks like a copy of D with the low-clock parts cut out. The FF trace is a staircase that only steps where CLK rises. In timing diagrams, flip-flops are often called "edge-sensitive" and latches "level-sensitive".</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Press <strong>▶ Clock</strong> and toggle D at random moments. FF changes only on rising edges, even if you flip D in the middle of a high phase.</li>
              <li>Stop the clock. Use <strong>⏭ Pulse</strong> to step one tick at a time. Each pulse copies D into FF exactly once.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'When does an edge-triggered D flip-flop change Q?', options: ['Whenever D changes', 'While CLK = 1', 'Only at the rising edge of CLK', 'At both edges'], answer: 2, why: 'It samples D at the 0 → 1 transition and ignores D the rest of the time.' },
      { q: 'In the master–slave design, which latch is open while CLK = 0?', options: ['The slave', 'The master', 'Both', 'Neither'], answer: 1, why: 'The master gets NOT CLK, so it is open (following D) while CLK is low. The slave is open while CLK is high.' },
      { q: 'CLK is held at 1 and D toggles three times. What does the flip-flop\'s Q do?', options: ['Toggles three times', 'Nothing', 'Toggles once', 'Goes metastable'], answer: 1, why: 'No rising edge happened, so a flip-flop ignores D. A latch would follow it.' },
      { q: '"Hold time" means…', options: ['how long Q stays valid', 'how long D must stay stable after the clock edge', 'the clock period', 'the time until power-off'], answer: 1, why: 'Setup = stable before the edge, hold = stable after the edge. Violations can capture the wrong value or cause metastability.' },
    ],
    exercise: {
      task: `<p>Using only <strong>D LATCH</strong> chips and <strong>NOT</strong> gates, build a rising-edge-triggered D flip-flop. Q must change only when CLK goes 0 → 1, and must ignore D while CLK is held high.</p>
        <p>Build it in the board below, then click <strong>✔ Check</strong>. The check pulses CLK and also holds it high while changing D.</p>`,
      hint: 'Master latch: D from the D switch, E from NOT CLK. Slave latch: D from the master\'s Q, E straight from CLK. Q comes from the slave\'s Q.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: D flip-flop from two latches',
  build: { palette: ['DLATCH', 'NOT'], best: 3 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 40, y: 60 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 60, color: '#f59e0b' },
  ],
  test: [
    { set: { D: 1 }, pulse: 'CLK', expect: { Q: 1 }, note: 'D=1, tick → Q=1' },
    { set: { D: 0 }, expect: { Q: 1 }, note: 'D changes, no tick: hold' },
    { pulse: 'CLK', expect: { Q: 0 }, note: 'tick → Q=0' },
    { set: { CLK: 1 }, expect: { Q: 0 }, note: 'clock goes high (D=0)' },
    { set: { D: 1 }, expect: { Q: 0 }, note: 'CLK held high, D → 1: must NOT pass through' },
    { set: { CLK: 0 }, expect: { Q: 0 }, note: 'falling edge: no change' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'tick → Q=1' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: D flip-flop from two latches',
  build: { palette: ['DLATCH', 'NOT'], best: 3 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 40, y: 60 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 240 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 60, color: '#f59e0b' },
    { id: 'inv', type: 'NOT', x: 140, y: 240 },
    { id: 'm', type: 'DLATCH', x: 240, y: 50 },
    { id: 's', type: 'DLATCH', x: 440, y: 50 },
  ],
  wires: [
    ['d', 'm.D'],
    ['clk', 'inv'],
    ['inv', 'm.E', { pts: [[220, 260], [220, 100]] }],
    ['clk', 's.E', { pts: [[110, 260], [110, 320], [400, 320], [400, 100]] }],
    ['m.Q', 's.D'],
    ['s.Q', 'q'],
  ],
  test: [
    { set: { D: 1 }, pulse: 'CLK', expect: { Q: 1 }, note: 'D=1, tick → Q=1' },
    { set: { D: 0 }, expect: { Q: 1 }, note: 'D changes, no tick: hold' },
    { pulse: 'CLK', expect: { Q: 0 }, note: 'tick → Q=0' },
    { set: { CLK: 1 }, expect: { Q: 0 }, note: 'clock goes high (D=0)' },
    { set: { D: 1 }, expect: { Q: 0 }, note: 'CLK held high, D → 1: must NOT pass through' },
    { set: { CLK: 0 }, expect: { Q: 0 }, note: 'falling edge: no change' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'tick → Q=1' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── register
  {
    id: 'register',
    section: 'Memory & Time',
    title: 'Registers: a variable made of flip-flops',
    explain: `
      <p>One flip-flop stores one bit. Line up <strong>n</strong> flip-flops that share the same clock and you can store an <strong>n-bit number</strong>. That's a <strong>register</strong>, the hardware version of a variable.</p>
      <pre><code>let r = 0;              // a 4-bit register
on every clock tick:
  if (LOAD) r = D;      // otherwise r keeps its value</code></pre>
      <h3>Why it needs a LOAD (write-enable) input</h3>
      <p>A bare flip-flop copies D on <em>every</em> tick. But a CPU has many registers, and an instruction like <code>ADD R1, R2</code> should change only R1. Every other register must <strong>keep</strong> its value through the tick. So each register gets a <strong>LOAD</strong> input:</p>
      <ul>
        <li>LOAD = 1: on the next rising edge, store D.</li>
        <li>LOAD = 0: on the next rising edge, store… its own current value. In other words, nothing changes.</li>
      </ul>
      <p>The trick is a <strong>MUX</strong> in front of each flip-flop. It chooses between "new data D" and "my own Q, fed back". The flip-flop still ticks every cycle, but when LOAD = 0 it just re-stores what it already had. The built-in <code>DFFE</code> chip ("REG BIT": D, LOAD, CLK → Q) is exactly that MUX plus a DFF, and you will build it yourself in the exercise.</p>
      <div class="warn"><strong>Don't AND the clock with LOAD.</strong> It looks simpler (no tick, no store), but it creates fake clock edges and timing skew. The second example shows the bug in action.</div>
      <div class="tip">"Register" here is the same word as in "CPU registers" in assembly language. When you write <code>mov eax, 5</code>, the CPU drives the number 5 onto the D inputs of the 32 flip-flops of EAX and sets that register's LOAD = 1 for one tick.</div>
      <div class="world">
        <p><strong>x86-64</strong> (Intel/AMD PCs) has <strong>16</strong> general-purpose 64-bit registers: RAX, RBX, RCX, RDX, RSI, RDI, RBP, RSP and R8–R15. <strong>ARM64</strong> (phones, Apple Silicon Macs) has <strong>31</strong>: X0–X30. Each one is 64 flip-flops (or equivalent storage cells) with a shared load control. Modern out-of-order CPUs actually have hundreds of <em>physical</em> registers behind the scenes and rename the architectural ones onto them (<a href="https://en.wikipedia.org/wiki/Register_renaming" target="_blank">register renaming</a>).</p>
        <p>Registers are the fastest storage in a computer. They are read and written within a single clock cycle, compared with ~4 cycles for L1 cache and hundreds of cycles for main memory.</p>
      </div>
    `,
    examples: [
      {
        title: 'A 4-bit register: 4 REG BITs, shared LOAD and CLK',
        code: `<div id="c"></div>
<script>
var parts = [
  { id: 'D', type: 'NUMIN', label: 'D', x: 0, y: 0, value: 9 },
  { id: 'ld', type: 'IN', label: 'LOAD', x: 20, y: 390 },
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 440 },
  { id: 'Q', type: 'NUMOUT', label: 'Q', x: 440, y: 100 },
];
var wires = [], mxIn = [0, 150, 130, 110], mxOut = [370, 0, 370, 400];
for (var k = 0; k < 4; k++) {
  parts.push({ id: 'b' + k, type: 'DFFE', label: 'BIT ' + k, x: 220, y: 100 * k });
  wires.push(['D.' + k, 'b' + k + '.D', k ? { mx: mxIn[k] } : {}]);
  wires.push(['ld', 'b' + k + '.LOAD', { pts: [[190, 410], [190, 100 * k + 50]] }]);
  wires.push(['clk', 'b' + k + '.CLK', { pts: [[205, 460], [205, 100 * k + 70]] }]);
  wires.push(['b' + k + '.Q', 'Q.' + k, k === 1 ? {} : { mx: mxOut[k] }]);
}
window.api = Circ.mount('#c', {
  title: '4-bit register',
  intro: 'Pick a number for <b>D</b>, then press <b>⏭ Pulse</b>. With <b>LOAD = 0</b> nothing is stored. Set LOAD = 1 and pulse again.',
  parts: parts, wires: wires, scope: ['CLK', 'LOAD', 'D', 'Q'], scale: 1.1,
  help: 'D: click ▲▼ or a bit. LOAD: toggle switch. ⏭ Pulse = one clock tick.',
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: many registers, one clock</summary>
            <p>All registers in a CPU tick on the same clock, but most of them must <em>not</em> change on a given tick. LOAD decides which ones take the new value. Here, 4 REG BIT chips share one LOAD wire and one CLK wire, so the 4 bits always move together as one number.</p>
          </details>
          <details>
            <summary>Step by step: timing table</summary>
            <table>
              <tr><th>#</th><th>Action</th><th>D</th><th>LOAD</th><th>Q after</th><th>Why</th></tr>
              <tr><td>1</td><td>start</td><td>9</td><td>0</td><td>0</td><td>power-on value</td></tr>
              <tr><td>2</td><td>⏭ Pulse</td><td>9</td><td>0</td><td>0</td><td>tick, but LOAD = 0: keep</td></tr>
              <tr><td>3</td><td>LOAD → 1</td><td>9</td><td>1</td><td>0</td><td>no tick yet: nothing happens</td></tr>
              <tr><td>4</td><td>⏭ Pulse</td><td>9</td><td>1</td><td><strong>9</strong></td><td>rising edge + LOAD: store</td></tr>
              <tr><td>5</td><td>D ▲ (10)</td><td>10</td><td>1</td><td>9</td><td>edge-triggered: waits for a tick</td></tr>
              <tr><td>6</td><td>LOAD → 0, Pulse</td><td>10</td><td>0</td><td>9</td><td>keep</td></tr>
              <tr><td>7</td><td>LOAD → 1, Pulse</td><td>10</td><td>1</td><td><strong>10</strong></td><td>store</td></tr>
            </table>
            <p>On the scope, Q (a bus value) changes only at a rising CLK edge <em>while</em> LOAD is high.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Follow the table above.</li>
              <li>Press <strong>▶ Clock</strong> to keep it ticking. Now Q copies D on every tick while LOAD = 1, and freezes the moment you set LOAD = 0. That is a variable being written versus just held.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'The wrong way: gating the clock with AND',
        code: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Buggy "register bit": CLK AND LOAD → flip-flop clock',
  intro: 'It seems to work with ⏭ Pulse. Now break it: click <b>CLK</b> so it is <b>1</b>, set <b>D = 1</b>, then flip <b>LOAD</b> on.',
  scope: ['CLK', 'LOAD', 'D', 'Q'],
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 20, y: 0 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 70 },
    { id: 'ld', type: 'IN', label: 'LOAD', x: 20, y: 140 },
    { id: 'g', type: 'AND', x: 160, y: 80 },
    { id: 'f', type: 'DFF', x: 300, y: 50 },
    { id: 'q', type: 'OUT', label: 'Q', x: 460, y: 60, color: '#f59e0b' },
  ],
  wires: [
    ['d', 'f.D', { mx: 260 }],
    ['clk', 'g.0'],
    ['ld', 'g.1', { mx: 120 }],
    ['g', 'f.CLK'],
    ['f.Q', 'q'],
  ],
  help: 'Click the CLK part to hold it high. No ⏭ Pulse needed to see the bug.',
});
<\/script>`,
        explain: `
          <details>
            <summary>The bug: a fake clock edge</summary>
            <p>The flip-flop sees <code>CLK AND LOAD</code> as its clock. If LOAD rises <em>while CLK is already 1</em>, the AND output jumps 0 → 1. To the flip-flop that is a rising edge, so it stores D, even though the real clock didn't tick.</p>
            <table>
              <tr><th>#</th><th>Click</th><th>CLK</th><th>LOAD</th><th>AND (flip-flop clock)</th><th>Q</th></tr>
              <tr><td>1</td><td>CLK</td><td>1</td><td>0</td><td>0</td><td>0</td></tr>
              <tr><td>2</td><td>D</td><td>1</td><td>0</td><td>0</td><td>0</td></tr>
              <tr><td>3</td><td>LOAD</td><td>1</td><td>1</td><td><strong>0 → 1</strong>: fake edge!</td><td><strong>1</strong> (stored without a tick)</td></tr>
            </table>
          </details>
          <details>
            <summary>Why real chips avoid it</summary>
            <p>Besides fake edges, the AND gate delays the clock for this one flip-flop, so it ticks slightly later than its neighbours (<em>clock skew</em>). That can break hold times. The clean solution keeps the clock untouched and puts a MUX on the <strong>data</strong> side: <code>D_ff = LOAD ? D : Q</code>. That is your exercise. (Chips do switch clocks off to save power, but only with special glitch-free clock-gating cells.)</p>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'A 64-bit register is made of…', options: ['one big flip-flop', '64 flip-flops sharing a clock (and load control)', '64 latches with separate clocks', 'a 64-input AND gate'], answer: 1, why: 'One flip-flop per bit, all clocked together so the number updates as a whole.' },
      { q: 'LOAD = 0 and a rising clock edge arrives. What does the register store?', options: ['D', '0', 'Its own current value (no change)', 'Random'], answer: 2, why: 'The MUX feeds Q back to D, so the flip-flop re-stores its current value.' },
      { q: 'Why not just AND the clock with LOAD?', options: ['AND gates are too slow to build', 'If LOAD changes while CLK = 1, it creates a fake clock edge (and adds clock skew)', 'It uses too many transistors', 'It would count instead of store'], answer: 1, why: 'Messing with the clock creates glitches and skew. A data-side MUX keeps the clock clean.' },
      { q: 'How many general-purpose registers does ARM64 (AArch64) have?', options: ['8', '16', '31', '256'], answer: 2, why: 'X0–X30: 31 general-purpose 64-bit registers. x86-64 has 16.' },
    ],
    exercise: {
      task: `<p>Build your own <strong>REG BIT</strong>, a 1-bit register with load enable. Use only one <strong>D FLIP-FLOP</strong> and one <strong>MUX</strong> (MUX: S = 0 picks A, S = 1 picks B).</p>
        <ul><li>LOAD = 1: on a clock tick, Q becomes D.</li><li>LOAD = 0: on a clock tick, Q keeps its value.</li><li>No fake edges: changing LOAD while CLK is high must not store anything.</li></ul>
        <p>Build it in the board below, then click <strong>✔ Check</strong>.</p>`,
      hint: 'Feed the flip-flop\'s D from the MUX output. MUX A = the flip-flop\'s own Q (feedback: "keep"), MUX B = the D switch ("new"), MUX S = LOAD. Connect CLK straight to the flip-flop, no gates on the clock.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 1-bit register with LOAD',
  build: { palette: ['DFF', 'MUX2'], best: 2 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 70, y: 40 },
    { id: 'ld', type: 'IN', label: 'LOAD', x: 70, y: 150 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 70, y: 260 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 100, color: '#f59e0b' },
  ],
  test: [
    { set: { D: 1, LOAD: 1 }, pulse: 'CLK', expect: { Q: 1 }, note: 'LOAD=1, D=1, tick → 1' },
    { set: { D: 0, LOAD: 0 }, pulse: 'CLK', expect: { Q: 1 }, note: 'LOAD=0, tick → keep 1' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'another tick → still 1' },
    { set: { LOAD: 1 }, pulse: 'CLK', expect: { Q: 0 }, note: 'LOAD=1, D=0, tick → 0' },
    { set: { D: 1, LOAD: 0 }, pulse: 'CLK', expect: { Q: 0 }, note: 'LOAD=0, tick → keep 0' },
    { set: { CLK: 1 }, expect: { Q: 0 }, note: 'hold CLK high' },
    { set: { LOAD: 1 }, expect: { Q: 0 }, note: 'LOAD rises while CLK high: no fake edge' },
    { set: { CLK: 0 }, expect: { Q: 0 }, note: 'CLK low again' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'real tick with LOAD=1, D=1 → 1' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 1-bit register with LOAD',
  build: { palette: ['DFF', 'MUX2'], best: 2 },
  parts: [
    { id: 'd', type: 'IN', label: 'D', x: 70, y: 40 },
    { id: 'ld', type: 'IN', label: 'LOAD', x: 70, y: 150 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 70, y: 260 },
    { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 100, color: '#f59e0b' },
    { id: 'mux', type: 'MUX2', x: 240, y: 70 },
    { id: 'ff', type: 'DFF', x: 420, y: 90 },
  ],
  wires: [
    ['d', 'mux.B', { mx: 160 }],
    ['ld', 'mux.S', { mx: 180 }],
    ['mux', 'ff.D'],
    ['clk', 'ff.CLK', { pts: [[380, 280], [380, 140]] }],
    ['ff.Q', 'q'],
    ['ff.Q', 'mux.A', { pts: [[560, 120], [560, 40], [220, 40], [220, 100]] }],
  ],
  test: [
    { set: { D: 1, LOAD: 1 }, pulse: 'CLK', expect: { Q: 1 }, note: 'LOAD=1, D=1, tick → 1' },
    { set: { D: 0, LOAD: 0 }, pulse: 'CLK', expect: { Q: 1 }, note: 'LOAD=0, tick → keep 1' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'another tick → still 1' },
    { set: { LOAD: 1 }, pulse: 'CLK', expect: { Q: 0 }, note: 'LOAD=1, D=0, tick → 0' },
    { set: { D: 1, LOAD: 0 }, pulse: 'CLK', expect: { Q: 0 }, note: 'LOAD=0, tick → keep 0' },
    { set: { CLK: 1 }, expect: { Q: 0 }, note: 'hold CLK high' },
    { set: { LOAD: 1 }, expect: { Q: 0 }, note: 'LOAD rises while CLK high: no fake edge' },
    { set: { CLK: 0 }, expect: { Q: 0 }, note: 'CLK low again' },
    { pulse: 'CLK', expect: { Q: 1 }, note: 'real tick with LOAD=1, D=1 → 1' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── counter
  {
    id: 'counter',
    section: 'Memory & Time',
    title: 'Counters: registers that add one every tick',
    explain: `
      <p>A <strong>counter</strong> is a register whose next value is its current value + 1:</p>
      <pre><code>on every clock tick:  count = (count + 1) % 16;   // 4 bits: 0…15, then wraps to 0</code></pre>
      <p>Look at binary counting and you'll spot a pattern:</p>
      <table>
        <tr><th>count</th><th>Q3 Q2 Q1 Q0</th></tr>
        <tr><td>0</td><td>0 0 0 0</td></tr><tr><td>1</td><td>0 0 0 1</td></tr><tr><td>2</td><td>0 0 1 0</td></tr><tr><td>3</td><td>0 0 1 1</td></tr><tr><td>4</td><td>0 1 0 0</td></tr><tr><td>…</td><td>…</td></tr>
      </table>
      <ul>
        <li><strong>Q0</strong> flips on <em>every</em> tick.</li>
        <li><strong>Q1</strong> flips every time Q0 goes 1 → 0 (a carry).</li>
        <li>In general, bit <em>k</em> flips when all lower bits are 1.</li>
      </ul>
      <p>The perfect part for "flip" is the <strong>T flip-flop</strong> (TFF, for <em>toggle</em>). On a rising clock edge, if T = 1 it inverts Q, and if T = 0 it keeps Q. (Inside it's just a DFF with an XOR in front: <code>D = Q XOR T</code>.)</p>
      <h3>Two ways to build it</h3>
      <ul>
        <li><strong>Ripple counter</strong>: each flip-flop is clocked by the previous one's output. It's tiny, but the bits update one after another, like falling dominoes, so for a moment the count shows wrong values.</li>
        <li><strong>Synchronous counter</strong>: every flip-flop gets the <em>same</em> clock, and AND gates decide which bits toggle. All bits change at once, on the tick. This is the kind CPUs use, as is the "register + adder" version: <code>PC ← PC + 1</code>.</li>
      </ul>
      <div class="tip">Each stage of a counter <strong>halves</strong> the frequency: Q0 ticks at half the clock rate, Q1 at a quarter, and so on. That's why a counter is also a <strong>frequency divider</strong>.</div>
      <div class="world">
        <p><strong>Program counter.</strong> Every CPU has a register called the PC (x86 calls it RIP), which holds the address of the next instruction. After each instruction it is incremented (PC + instruction length), unless a jump loads a new value. That's a counter with a parallel-load input.</p>
        <p><strong>Watches and timers.</strong> A quartz watch divides 32,768 Hz by 2<sup>15</sup> with a 15-stage counter to get 1 Hz. Microcontrollers such as the Arduino's ATmega328P have hardware <em>timer/counter</em> peripherals that count clock ticks for delays, PWM and measuring pulses.</p>
        <p><strong>Chips.</strong> The classic <a href="https://en.wikipedia.org/wiki/List_of_7400-series_integrated_circuits" target="_blank">7493</a> is a 4-bit binary <em>ripple</em> counter. The 74HC163 is a 4-bit <em>synchronous</em> counter with load and clear.</p>
      </div>
    `,
    examples: [
      {
        title: 'Ripple counter: 4 T flip-flops like dominoes',
        code: `<div id="c"></div>
<script>
var parts = [
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 30 },
  { id: 'COUNT', type: 'NUMOUT', label: 'COUNT', x: 780, y: -110 },
];
var wires = [['clk', 'Q0.CLK']];
for (var k = 0; k < 4; k++) {
  parts.push({ id: 'Q' + k, type: 'TFF', label: 'TFF ' + k, x: 140 + 160 * k, y: 0 });
  parts.push({ id: 'one' + k, type: 'CONST', value: 1, x: 90 + 160 * k, y: 10 });
  wires.push(['one' + k, 'Q' + k + '.T', { pts: [] }]);
  if (k < 3) wires.push(['Q' + k + '.Q̄', 'Q' + (k + 1) + '.CLK']);
  wires.push(['Q' + k + '.Q', 'COUNT.' + k, { pts: [[240 + 160 * k, 30], [240 + 160 * k, -80 + 20 * k]] }]);
}
window.api = Circ.mount('#c', {
  title: '4-bit ripple counter',
  intro: 'Press <b>⏭ Pulse</b> a few times and watch COUNT go 1, 2, 3… Then try <b>🐢 Slow-mo</b> and click the <b>CLK</b> part itself.',
  parts: parts, wires: wires, scope: ['CLK', 'Q0', 'Q1', 'Q2', 'Q3', 'COUNT'], scale: 1,
  help: 'Every T is tied to constant 1, so each flip-flop toggles on each rising edge of its own clock. Q̄ of one stage clocks the next.',
});
<\/script>`,
        explain: `
          <details>
            <summary>How the dominoes fall</summary>
            <p>TFF 0 is clocked by CLK and toggles on every tick. Each later stage is clocked by the previous stage's <strong>Q̄</strong>. Q̄ rises exactly when Q falls 1 → 0, which is the moment a binary carry happens. So bit <em>k+1</em> flips whenever bit <em>k</em> rolls over from 1 to 0.</p>
            <table>
              <tr><th>Pulse</th><th>Q3 Q2 Q1 Q0</th><th>COUNT</th><th>Which stages toggled</th></tr>
              <tr><td>0</td><td>0 0 0 0</td><td>0</td><td>(start)</td></tr>
              <tr><td>1</td><td>0 0 0 1</td><td>1</td><td>TFF 0</td></tr>
              <tr><td>2</td><td>0 0 1 0</td><td>2</td><td>TFF 0 (1→0) → TFF 1</td></tr>
              <tr><td>3</td><td>0 0 1 1</td><td>3</td><td>TFF 0</td></tr>
              <tr><td>4</td><td>0 1 0 0</td><td>4</td><td>TFF 0 → TFF 1 → TFF 2</td></tr>
              <tr><td>…</td><td></td><td></td><td></td></tr>
              <tr><td>16</td><td>0 0 0 0</td><td>0</td><td>all four: wraps around</td></tr>
            </table>
            <p>On the scope, each Q row is a square wave at <strong>half</strong> the frequency of the row above: a frequency divider.</p>
          </details>
          <details>
            <summary>Try this: catch the ripple in slow motion</summary>
            <ol>
              <li>Press <strong>⏭ Pulse</strong> 7 times so COUNT = 7 (0111).</li>
              <li>Turn on <strong>🐢 Slow-mo</strong>. Click the <strong>CLK</strong> part so it goes from 0 to 1.</li>
              <li>Watch COUNT step through <strong>7 → 6 → 4 → 0 → 8</strong>, one gate delay at a time, as each stage knocks over the next.</li>
              <li>Click CLK again to bring it back to 0 (nothing changes on the falling edge), then repeat from 8 → 9: only one step, because only TFF 0 flips.</li>
            </ol>
            <p>Those in-between values (6, 4, 0) are <strong>glitches</strong>. Any circuit reading COUNT at that moment would get the wrong number. With 32 stages the ripple takes 32 delays. That's why fast systems use <em>synchronous</em> counters (next example).</p>
          </details>
        `,
      },
      {
        title: 'Synchronous counter: one clock for every bit',
        code: `<div id="c"></div>
<script>
var parts = [
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 150 },
  { id: 'one', type: 'CONST', value: 1, x: 90, y: 70 },
  { id: 'a1', type: 'AND', x: 460, y: 70 },
  { id: 'a2', type: 'AND', x: 660, y: 70 },
  { id: 'COUNT', type: 'NUMOUT', label: 'COUNT', x: 960, y: -90 },
];
var wires = [
  ['one', 'Q0.T', { pts: [] }],
  ['Q0.Q', 'Q1.T'],
  ['Q0.Q', 'a1.0', { pts: [[240, 90], [240, 20], [450, 20], [450, 80]] }],
  ['Q1.Q', 'a1.1', { pts: [[440, 90], [440, 100]] }],
  ['a1', 'Q2.T'],
  ['a1', 'a2.0', { pts: [[530, 90], [530, 40], [650, 40], [650, 80]] }],
  ['Q2.Q', 'a2.1', { pts: [[640, 90], [640, 100]] }],
  ['a2', 'Q3.T'],
  ['Q0.Q', 'COUNT.0', { pts: [[240, 90], [240, -60]] }],
  ['Q1.Q', 'COUNT.1', { pts: [[440, 90], [440, -40]] }],
  ['Q2.Q', 'COUNT.2', { pts: [[640, 90], [640, -20]] }],
  ['Q3.Q', 'COUNT.3', { pts: [[850, 90], [850, 0]] }],
];
for (var k = 0; k < 4; k++) {
  parts.push({ id: 'Q' + k, type: 'TFF', label: 'TFF ' + k, x: 140 + 200 * k, y: 60 });
  wires.push(['clk', 'Q' + k + '.CLK', { pts: [[120 + 200 * k, 170], [120 + 200 * k, 110]] }]);
}
parts.push({ id: 't', type: 'TEXT', text: 'T3 = Q0·Q1·Q2', x: 690, y: 150, size: 11, color: '#7c3aed' });
parts.push({ id: 't2', type: 'TEXT', text: 'T2 = Q0·Q1', x: 480, y: 150, size: 11, color: '#7c3aed' });
window.api = Circ.mount('#c', {
  title: '4-bit synchronous counter (TFFs + AND chain)',
  intro: 'Same counting, but every flip-flop shares <b>CLK</b>. Try the same Slow-mo experiment at COUNT = 7.',
  parts: parts, wires: wires, scope: ['CLK', 'COUNT'], scale: 0.95,
  help: 'Bit k toggles only when all lower bits are 1: T0 = 1, T1 = Q0, T2 = Q0·Q1, T3 = Q0·Q1·Q2.',
});
<\/script>`,
        explain: `
          <details>
            <summary>The idea: decide first, then flip together</summary>
            <p>Instead of waiting for a carry to ripple through, every stage computes in advance whether it <em>should</em> toggle on the next tick. Bit <em>k</em> toggles when all lower bits are 1, so <code>T<sub>k</sub> = Q0 · Q1 · … · Q<sub>k−1</sub></code>. The AND chain settles <em>between</em> ticks, while nobody is looking. Then the shared clock edge flips all the chosen bits at the same instant.</p>
            <table>
              <tr><th>COUNT now</th><th>T3 T2 T1 T0</th><th>after the tick</th></tr>
              <tr><td>5 = 0101</td><td>0 0 1 1</td><td><strong>6 = 0110</strong>: bits 0 and 1 flip together (T1 = Q0 = 1, T2 = Q0·Q1 = 0)</td></tr>
              <tr><td>7 = 0111</td><td>1 1 1 1</td><td><strong>8 = 1000</strong>: all four flip at once</td></tr>
              <tr><td>15 = 1111</td><td>1 1 1 1</td><td><strong>0</strong>: wraps</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Pulse to 7. Turn on <strong>🐢 Slow-mo</strong> and click the <strong>CLK</strong> part. COUNT jumps <strong>7 → 8</strong> in a single step, with no 6, 4 or 0 in between.</li>
              <li>Watch the AND gates afterwards: they recompute the T values for the <em>next</em> tick while the count sits still.</li>
            </ol>
            <div class="tip">The CPU's program counter works the same way, except that the "+1" logic is an adder feeding a register: <code>PC ← PC + 4</code> on every tick.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'A T flip-flop with T = 1 receives a rising clock edge. What happens?', options: ['Q becomes 1', 'Q becomes 0', 'Q toggles (inverts)', 'Nothing'], answer: 2, why: 'T = 1 means toggle on the edge. T = 0 means keep.' },
      { q: 'In a binary counter, when does bit 2 flip?', options: ['Every tick', 'When bits 0 and 1 are both 1 (a carry into bit 2)', 'When bit 1 is 0', 'Every 3 ticks'], answer: 1, why: 'Counting up, bit k flips when all lower bits are 1 (…011 → …100).' },
      { q: 'Why can a ripple counter show wrong values briefly?', options: ['Its flip-flops are faulty', 'Each stage is clocked by the previous one, so bits change one after another (7 → 6 → 4 → 0 → 8)', 'It has no clock', 'It counts down'], answer: 1, why: 'The carry ripples through the stages one delay at a time, creating transient wrong counts.' },
      { q: 'Q0 of a counter clocked at 1 MHz toggles at what frequency (full square-wave cycles)?', options: ['2 MHz', '1 MHz', '500 kHz', '250 kHz'], answer: 2, why: 'Each stage divides by 2: Q0 = 500 kHz, Q1 = 250 kHz, …' },
      { q: 'Which CPU register is basically a counter?', options: ['The program counter (PC / RIP)', 'The flags register', 'RAX', 'The stack'], answer: 0, why: 'The PC advances to the next instruction every cycle unless a jump loads a new value.' },
    ],
    exercise: {
      task: `<p>A countdown timer needs to count <strong>down</strong>: 7, 6, 5, 4, 3, 2, 1, 0, 7, … Using only <strong>T FLIP-FLOP</strong> chips, build a 3-bit ripple <strong>down</strong>-counter. The CLK, a constant 1 and the COUNT display are already on the board.</p>
        <p>Build it in the board below, then click <strong>✔ Check</strong>. The check pulses CLK 9 times from 0.</p>`,
      hint: 'Start from the ripple up-counter. There, Q̄ of each stage clocks the next. Counting down, a bit must "borrow" when the lower bit goes 0 → 1, which is a rising edge on Q, not Q̄. So clock each stage from the previous stage\'s Q. All T inputs go to the constant 1.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 3-bit down-counter',
  build: { palette: ['TFF'], best: 3 },
  parts: [
    { id: 'one', type: 'CONST', value: 1, x: 40, y: 90 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 170 },
    { id: 'COUNT', type: 'NUMOUT', label: 'COUNT', bits: 3, x: 660, y: 20 },
  ],
  test: [
    { pulse: 'CLK', expect: { COUNT: 7 }, note: '0 → 7 (wraps)' },
    { pulse: 'CLK', expect: { COUNT: 6 }, note: '7 → 6' },
    { pulse: 'CLK', expect: { COUNT: 5 }, note: '6 → 5' },
    { pulse: 'CLK', expect: { COUNT: 4 }, note: '5 → 4' },
    { pulse: 'CLK', expect: { COUNT: 3 }, note: '4 → 3' },
    { pulse: 'CLK', expect: { COUNT: 2 }, note: '3 → 2' },
    { pulse: 'CLK', expect: { COUNT: 1 }, note: '2 → 1' },
    { pulse: 'CLK', expect: { COUNT: 0 }, note: '1 → 0' },
    { pulse: 'CLK', expect: { COUNT: 7 }, note: '0 → 7 again' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 3-bit down-counter',
  build: { palette: ['TFF'], best: 3 },
  parts: [
    { id: 'one', type: 'CONST', value: 1, x: 40, y: 90 },
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 170 },
    { id: 'COUNT', type: 'NUMOUT', label: 'COUNT', bits: 3, x: 660, y: 20 },
    { id: 't0', type: 'TFF', x: 180, y: 140 },
    { id: 't1', type: 'TFF', x: 340, y: 140 },
    { id: 't2', type: 'TFF', x: 500, y: 140 },
  ],
  wires: [
    ['clk', 't0.CLK'],
    ['one', 't0.T', { pts: [[160, 110], [160, 170]] }],
    ['one', 't1.T', { pts: [[320, 110], [320, 170]] }],
    ['one', 't2.T', { pts: [[480, 110], [480, 170]] }],
    ['t0.Q', 't1.CLK', { pts: [[300, 170], [300, 190]] }],
    ['t1.Q', 't2.CLK', { pts: [[460, 170], [460, 190]] }],
    ['t0.Q', 'COUNT.0', { pts: [[300, 170], [300, 50]] }],
    ['t1.Q', 'COUNT.1', { pts: [[460, 170], [460, 70]] }],
    ['t2.Q', 'COUNT.2', { pts: [[620, 170], [620, 90]] }],
  ],
  test: [
    { pulse: 'CLK', expect: { COUNT: 7 }, note: '0 → 7 (wraps)' },
    { pulse: 'CLK', expect: { COUNT: 6 }, note: '7 → 6' },
    { pulse: 'CLK', expect: { COUNT: 5 }, note: '6 → 5' },
    { pulse: 'CLK', expect: { COUNT: 4 }, note: '5 → 4' },
    { pulse: 'CLK', expect: { COUNT: 3 }, note: '4 → 3' },
    { pulse: 'CLK', expect: { COUNT: 2 }, note: '3 → 2' },
    { pulse: 'CLK', expect: { COUNT: 1 }, note: '2 → 1' },
    { pulse: 'CLK', expect: { COUNT: 0 }, note: '1 → 0' },
    { pulse: 'CLK', expect: { COUNT: 7 }, note: '0 → 7 again' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── shift-register
  {
    id: 'shift-register',
    section: 'Memory & Time',
    title: 'Shift registers: bits on a conveyor belt',
    explain: `
      <p>Chain D flip-flops so that each one's <strong>Q feeds the next one's D</strong>, and give them all the same clock. On every tick, every bit moves one place along. That's a <strong>shift register</strong>, a conveyor belt for bits.</p>
      <pre><code>on every clock tick:
  [q0, q1, q2, q3] = [DIN, q0, q1, q2];   // all at once</code></pre>
      <p>Why doesn't a bit race through all four flip-flops in one tick? Because they are <strong>edge-triggered</strong>. At the rising edge each flip-flop grabs the value its neighbour had <em>just before</em> the edge. The new values only appear after the edge, when every snapshot has already been taken. (With transparent latches the bit would race straight through, and that is exactly why we needed flip-flops.)</p>
      <h3>Serial ↔ parallel</h3>
      <ul>
        <li><strong>Serial in, parallel out (SIPO)</strong>: feed bits one at a time into DIN. After 4 ticks all 4 bits sit side by side on Q0…Q3. One data wire becomes 4 outputs.</li>
        <li><strong>Parallel in, serial out (PISO)</strong>: load 4 bits at once, then shift them out one per tick down a single wire.</li>
      </ul>
      <p>That is how most data travels between chips: <strong>one wire, one bit per tick</strong>, turned back into parallel words at the other end.</p>
      <div class="tip">A shift by one position is also <strong>multiply/divide by 2</strong> when the bits are read as a number. That's the hardware behind <code>x &lt;&lt; 1</code> and <code>x &gt;&gt; 1</code>.</div>
      <div class="world">
        <p><strong>74HC595.</strong> The Arduino's favourite chip for driving lots of LEDs: an 8-bit serial-in shift register plus an 8-bit <em>storage</em> register. You send 8 bits down one data pin (SER) with a clock pin (SRCLK), then pulse a latch pin (RCLK) to copy them to the outputs all at once. Three Arduino pins drive 8 LEDs, and chips can be daisy-chained for 16, 24 and more. Arduino's built-in <code>shiftOut()</code> function does exactly this bit-by-bit clocking.</p>
        <p><strong>SPI, UART, USB, PCIe.</strong> <a href="https://en.wikipedia.org/wiki/Serial_Peripheral_Interface" target="_blank">SPI</a> is basically two shift registers in a ring, one in each chip, sharing a clock. A UART (the serial port) shifts out a start bit, 8 data bits and a stop bit. Fast links like USB, SATA and PCIe use a <em>SerDes</em> (serializer/deserializer), a very fast shift register at each end of the wire.</p>
      </div>
    `,
    examples: [
      {
        title: '4-bit shift register: serial in, parallel out',
        code: `<div id="c"></div>
<script>
var parts = [
  { id: 'din', type: 'IN', label: 'DIN', x: 20, y: 50 },
  { id: 'clk', type: 'CLOCK', label: 'CLK', x: 20, y: 130 },
];
var wires = [['din', 'd0.D']];
for (var k = 0; k < 4; k++) {
  var x = 140 + 160 * k;
  parts.push({ id: 'd' + k, type: 'DFF', label: 'DFF ' + k, x: x, y: 40 });
  parts.push({ id: 'o' + k, type: 'OUT', label: 'Q' + k, x: x + 110, y: -20, color: '#22c55e' });
  if (k < 3) wires.push(['d' + k + '.Q', 'd' + (k + 1) + '.D']);
  wires.push(['d' + k + '.Q', 'o' + k, { pts: [[x + 100, 70], [x + 100, 0]] }]);
  wires.push(['clk', 'd' + k + '.CLK', { pts: [[x - 20, 150], [x - 20, 90]] }]);
}
window.api = Circ.mount('#c', {
  title: 'Shift register: 4 D flip-flops in a chain',
  intro: 'Set <b>DIN</b>, press <b>⏭ Pulse</b>, repeat. Send the pattern 1, 0, 1, 1 and watch it march to the right.',
  parts: parts, wires: wires, scope: ['CLK', 'DIN', 'Q0', 'Q1', 'Q2', 'Q3'], scale: 1.1,
  help: 'DIN is a toggle switch. Each ⏭ Pulse moves every bit one flip-flop to the right.',
});
<\/script>`,
        explain: `
          <details>
            <summary>Step by step: sending 1, 0, 1, 1</summary>
            <table>
              <tr><th>#</th><th>Click</th><th>DIN</th><th>Q0</th><th>Q1</th><th>Q2</th><th>Q3</th></tr>
              <tr><td>0</td><td>(start)</td><td>0</td><td>0</td><td>0</td><td>0</td><td>0</td></tr>
              <tr><td>1</td><td>DIN, Pulse</td><td>1</td><td><strong>1</strong></td><td>0</td><td>0</td><td>0</td></tr>
              <tr><td>2</td><td>DIN, Pulse</td><td>0</td><td><strong>0</strong></td><td>1</td><td>0</td><td>0</td></tr>
              <tr><td>3</td><td>DIN, Pulse</td><td>1</td><td><strong>1</strong></td><td>0</td><td>1</td><td>0</td></tr>
              <tr><td>4</td><td>Pulse (DIN stays 1)</td><td>1</td><td><strong>1</strong></td><td>1</td><td>0</td><td>1</td></tr>
            </table>
            <p>After 4 pulses the whole pattern sits on the four LEDs. The <em>first</em> bit you sent has travelled furthest (Q3), and the last is at Q0. On the scope, each Q row is a copy of the row above it, delayed by one clock cycle.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Follow the table above.</li>
              <li>Keep pulsing with DIN = 0. The pattern slides off the right end and is gone: a shift register only remembers the last 4 bits.</li>
              <li>Press <strong>▶ Clock</strong> and flip DIN now and then. You are a serial transmitter, and the LEDs are the receiver's parallel output.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: expecting the bit to jump straight to Q3</summary>
            <p>One tick moves every bit exactly <strong>one</strong> place, because every flip-flop samples its neighbour's <em>old</em> value at the same edge. If you used D latches with E = CLK instead, a bit could rush through all of them while the clock is high, and the "belt" would collapse into a single wire.</p>
          </details>
        `,
      },
      {
        title: '74HC595: drive 8 LEDs from 3 pins',
        code: `<style>
  .sr { font:14px system-ui; color:#1f2330; }
  .sr .top { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:8px; }
  .sr input { width:46px; font-size:18px; text-align:center; padding:3px; border:1px solid #c7cede; border-radius:7px; }
  .sr button { padding:5px 11px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; }
  .sr button.main { background:#0f766e; color:#fff; border-color:#0f766e; }
  .sr .bits span { display:inline-block; width:22px; text-align:center; font:700 14px ui-monospace,Menlo,monospace; border-radius:4px; margin-right:2px; }
  .sr .bits span.next { background:#fde68a; }
  .sr .bits span.sent { color:#a3a9b8; }
  .sr .chip { border:2px solid #334155; border-radius:10px; padding:10px 12px; background:#fff7ed; display:inline-block; }
  .sr .row { display:flex; gap:6px; align-items:center; margin:4px 0; }
  .sr .row .lab { width:150px; font-size:12.5px; color:#475066; }
  .sr .cell { width:38px; height:30px; border-radius:6px; display:flex; align-items:center; justify-content:center; font:700 14px ui-monospace,monospace; border:1px solid #cbd5e1; background:#fff; }
  .sr .cell.one { background:#dcfce7; border-color:#22c55e; }
  .sr .led { width:30px; height:30px; border-radius:50%; margin:0 4px; background:#e2e8f0; border:2px solid #94a3b8; }
  .sr .led.on { background:#ef4444; border-color:#b91c1c; box-shadow:0 0 10px #ef4444; }
  .sr .names span { width:40px; text-align:center; font-size:11px; color:#64748b; }
  .sr #wave { margin-top:8px; background:#0f1320; border-radius:8px; }
  .sr #msg { margin-top:6px; font-size:13.5px; color:#334155; min-height:20px; }
</style>
<div class="sr">
  <div class="top">Character to send: <input id="ch" maxlength="1" value="K">
    <span class="bits" id="bits"></span>
    <button id="one" class="main">Shift 1 bit (SRCLK ↑)</button><button id="all">Shift all 8</button><button id="latch">Latch (RCLK ↑)</button><button id="clr">Clear</button>
  </div>
  <div class="chip">
    <div style="font:800 12px system-ui;color:#7c2d12;margin-bottom:4px">74HC595</div>
    <div class="row"><span class="lab">shift register (moves on SRCLK)</span><span id="sh" style="display:flex;gap:6px"></span></div>
    <div class="row"><span class="lab">storage register → pins</span><span id="st" style="display:flex;gap:6px"></span></div>
    <div class="row"><span class="lab">LEDs</span><span id="leds" style="display:flex;gap:6px"></span></div>
    <div class="row"><span class="lab"></span><span class="names" style="display:flex;gap:6px"><span>QA</span><span>QB</span><span>QC</span><span>QD</span><span>QE</span><span>QF</span><span>QG</span><span>QH</span></span></div>
  </div>
  <svg id="wave" width="760" height="86"></svg>
  <div id="msg"></div>
</div>
<script>
var sh = [0,0,0,0,0,0,0,0], st = [0,0,0,0,0,0,0,0], sent = 0, hist = [];
function $(i) { return document.getElementById(i); }
function code() { var c = $('ch').value || ' '; return c.charCodeAt(0) & 255; }
function bitsMSB() { var v = code(), b = []; for (var i = 7; i >= 0; i--) b.push((v >> i) & 1); return b; }
function render() {
  var b = bitsMSB();
  $('bits').innerHTML = '= ' + code() + ' = ' + b.map(function (x, i) { return '<span class="' + (i < sent ? 'sent' : i === sent ? 'next' : '') + '">' + x + '</span>'; }).join('') + ' <small style="color:#64748b">(MSB first)</small>';
  $('sh').innerHTML = sh.map(function (x) { return '<span class="cell ' + (x ? 'one' : '') + '">' + x + '</span>'; }).join('');
  $('st').innerHTML = st.map(function (x) { return '<span class="cell ' + (x ? 'one' : '') + '">' + x + '</span>'; }).join('');
  $('leds').innerHTML = st.map(function (x) { return '<span class="led ' + (x ? 'on' : '') + '" style="margin:0 3px"></span>'; }).join('');
  var s = '<text x="6" y="26" fill="#e2e8f0" font-size="12" font-weight="700">SER</text><text x="6" y="66" fill="#e2e8f0" font-size="12" font-weight="700">SRCLK</text>';
  var d1 = '', d2 = '';
  hist.forEach(function (v, i) { var x = 60 + i * 42, y = v ? 12 : 34; d1 += (i ? ' V' + y : 'M' + x + ' ' + y) + ' H' + (x + 42); d2 += (i ? '' : 'M' + x + ' 76') + ' H' + (x + 14) + ' V52 H' + (x + 32) + ' V76 H' + (x + 42);
    s += '<text x="' + (x + 21) + '" y="47" text-anchor="middle" fill="#94a3b8" font-size="10">' + v + '</text>'; });
  if (d1) s += '<path d="' + d1 + '" fill="none" stroke="#4ade80" stroke-width="2"/><path d="' + d2 + '" fill="none" stroke="#a5b4fc" stroke-width="2"/>';
  $('wave').innerHTML = s;
}
function shift() {
  var b = bitsMSB();
  if (sent >= 8) { $('msg').innerHTML = 'All 8 bits are in. Click <b>Latch</b> to show them on the LEDs (or change the character).'; return; }
  var v = b[sent++];
  sh = [v].concat(sh.slice(0, 7)); hist.push(v);
  $('msg').innerHTML = 'SER = ' + v + ', SRCLK rises: every bit moves one place right and ' + v + ' enters QA. The LEDs did <b>not</b> change: the storage register still holds the old pattern.';
  render();
}
$('one').onclick = shift;
$('all').onclick = function () { var n = 0; var t = setInterval(function () { if (sent >= 8 || n++ > 8) { clearInterval(t); return; } shift(); }, 180); };
$('latch').onclick = function () { st = sh.slice(); var ok = sent === 8; $('msg').innerHTML = 'RCLK rises: the storage register copies all 8 bits at once.' + (ok ? ' QH = the first bit sent (MSB), QA = the last (LSB). The LEDs show ' + code() + ' in binary (QA on the left is bit 0, so read them right to left).' : ' (Only ' + sent + ' of 8 bits were shifted in, so the pattern is incomplete.)'); render(); };
$('clr').onclick = function () { sh = [0,0,0,0,0,0,0,0]; st = sh.slice(); sent = 0; hist = []; $('msg').textContent = ''; render(); };
$('ch').oninput = function () { sent = 0; hist = []; render(); };
render();
<\/script>`,
        explain: `
          <details>
            <summary>What the chip does</summary>
            <p>The 74HC595 has <strong>two</strong> 8-bit registers. The <em>shift register</em> takes one bit from SER on every rising edge of SRCLK. The <em>storage register</em> copies all 8 shift bits at once on a rising edge of RCLK, and drives the output pins QA…QH. Because the LEDs are connected to the storage register, they don't flicker while you shift. They switch cleanly when you latch.</p>
            <table>
              <tr><th>Arduino pin</th><th>595 pin</th><th>Role</th></tr>
              <tr><td>dataPin</td><td>SER (14)</td><td>the serial bit</td></tr>
              <tr><td>clockPin</td><td>SRCLK (11)</td><td>shift clock</td></tr>
              <tr><td>latchPin</td><td>RCLK (12)</td><td>copy to outputs</td></tr>
            </table>
            <pre><code>digitalWrite(latchPin, LOW);
shiftOut(dataPin, clockPin, MSBFIRST, 'K');  // 8 × (set SER, pulse SRCLK)
digitalWrite(latchPin, HIGH);                // RCLK rising edge → LEDs update</code></pre>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <strong>Shift 1 bit</strong> 8 times. Watch the yellow "next bit" marker, the waveform (green = SER, blue = SRCLK pulses) and the shift register filling up from the left.</li>
              <li>Click <strong>Latch</strong>: the LEDs show the character's ASCII code, 'K' = 75 = 01001011. Read it from QH back to QA, because QA (on the left) is bit 0.</li>
              <li>Type another letter, click <strong>Shift all 8</strong>, and notice the LEDs keep showing the <em>old</em> letter until you latch.</li>
              <li>Latch after only 3 shifts to see a half-delivered byte, the glitch the storage register exists to prevent.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In a shift register, what does one clock tick do?', options: ['Clears all bits', 'Moves every bit one position along (and takes a new bit in)', 'Moves the first bit to the end', 'Adds 1'], answer: 1, why: 'Each flip-flop copies its neighbour\'s previous value, so the whole pattern moves one place.' },
      { q: 'Why must a shift register use edge-triggered flip-flops rather than transparent latches?', options: ['Latches are bigger', 'With latches open, a bit would race through several stages in one clock phase', 'Latches cannot hold 1', 'Flip-flops are faster'], answer: 1, why: 'Edge-triggering means every stage samples the old neighbour value at the same instant.' },
      { q: 'After sending 4 bits into a 4-bit SIPO shift register, where is the FIRST bit you sent?', options: ['Q0 (nearest the input)', 'Q3 (the far end)', 'It was lost', 'In all four'], answer: 1, why: 'The first bit has been shifted the most times, so it is furthest along.' },
      { q: 'Why does the 74HC595 have a separate storage register (RCLK)?', options: ['To double the capacity', 'So the outputs change all at once instead of showing every intermediate shift', 'To count pulses', 'It is required by SPI'], answer: 1, why: 'The LEDs stay stable during shifting and update cleanly when you latch.' },
    ],
    exercise: {
      task: `<p>Close the conveyor belt into a twisted loop. Using only <strong>D FLIP-FLOP</strong> chips (and no data input at all), build a 3-bit <strong>Johnson counter</strong>. It is a shift register whose last stage's <strong>Q̄</strong> feeds back into the first stage's D. Starting from 000, every tick it must step through:</p>
        <p><code>Q0 Q1 Q2: 000 → 100 → 110 → 111 → 011 → 001 → 000 → …</code></p>
        <p>(Real world: the CD4017 "decade counter" chip, beloved of LED-chaser kits, is a 5-stage Johnson counter, which has 10 states.)</p>
        <p>Build it in the board below, then click <strong>✔ Check</strong>.</p>`,
      hint: 'Three DFFs in a row: Q0 → D1, Q1 → D2. All CLK pins on CLK. Then wire DFF 2\'s Q̄ (bottom-right pin) back to DFF 0\'s D. Each Q also goes to its LED.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: Johnson counter (twisted ring)',
  build: { palette: ['DFF'], best: 3 },
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 260 },
    { id: 'o0', type: 'OUT', label: 'Q0', x: 290, y: 40, color: '#22c55e' },
    { id: 'o1', type: 'OUT', label: 'Q1', x: 460, y: 40, color: '#22c55e' },
    { id: 'o2', type: 'OUT', label: 'Q2', x: 630, y: 40, color: '#22c55e' },
  ],
  test: [
    { expect: { Q0: 0, Q1: 0, Q2: 0 }, note: 'start 000' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 0, Q2: 0 }, note: '→ 100' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 1, Q2: 0 }, note: '→ 110' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 1, Q2: 1 }, note: '→ 111' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 1, Q2: 1 }, note: '→ 011' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 0, Q2: 1 }, note: '→ 001' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 0, Q2: 0 }, note: '→ 000' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 0, Q2: 0 }, note: '→ 100 again' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: Johnson counter (twisted ring)',
  build: { palette: ['DFF'], best: 3 },
  parts: [
    { id: 'clk', type: 'CLOCK', label: 'CLK', x: 40, y: 260 },
    { id: 'o0', type: 'OUT', label: 'Q0', x: 290, y: 40, color: '#22c55e' },
    { id: 'o1', type: 'OUT', label: 'Q1', x: 460, y: 40, color: '#22c55e' },
    { id: 'o2', type: 'OUT', label: 'Q2', x: 630, y: 40, color: '#22c55e' },
    { id: 'd0', type: 'DFF', x: 180, y: 120 },
    { id: 'd1', type: 'DFF', x: 350, y: 120 },
    { id: 'd2', type: 'DFF', x: 520, y: 120 },
  ],
  wires: [
    ['d0.Q', 'd1.D'],
    ['d1.Q', 'd2.D'],
    ['d0.Q', 'o0', { pts: [[280, 150], [280, 60]] }],
    ['d1.Q', 'o1', { pts: [[450, 150], [450, 60]] }],
    ['d2.Q', 'o2', { pts: [[620, 150], [620, 60]] }],
    ['clk', 'd0.CLK', { pts: [[130, 280], [130, 170]] }],
    ['clk', 'd1.CLK', { pts: [[320, 280], [320, 170]] }],
    ['clk', 'd2.CLK', { pts: [[490, 280], [490, 170]] }],
    ['d2.Q̄', 'd0.D', { pts: [[640, 170], [640, 330], [160, 330], [160, 150]] }],
  ],
  test: [
    { expect: { Q0: 0, Q1: 0, Q2: 0 }, note: 'start 000' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 0, Q2: 0 }, note: '→ 100' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 1, Q2: 0 }, note: '→ 110' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 1, Q2: 1 }, note: '→ 111' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 1, Q2: 1 }, note: '→ 011' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 0, Q2: 1 }, note: '→ 001' },
    { pulse: 'CLK', expect: { Q0: 0, Q1: 0, Q2: 0 }, note: '→ 000' },
    { pulse: 'CLK', expect: { Q0: 1, Q1: 0, Q2: 0 }, note: '→ 100 again' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── ram
  {
    id: 'ram',
    section: 'Memory & Time',
    title: 'RAM: memory you can address',
    explain: `
      <p>A register stores one number. A program needs thousands or billions of them. <strong>RAM</strong> (random-access memory) is a big grid of storage cells where every row of cells (a <em>word</em>) has a number, its <strong>address</strong>. In code it is simply an array:</p>
      <pre><code>const mem = new Uint8Array(16);   // 16 addresses × 8 bits
mem[addr] = data;                 // write
out = mem[addr];                  // read</code></pre>
      <h3>Built from parts you already know</h3>
      <ul>
        <li><strong>Storage</strong>: one register per address (REG BIT chips with LOAD).</li>
        <li><strong>Write</strong>: a <strong>decoder</strong> turns the address into "one-hot" select lines (exactly one output is 1). That line drives the LOAD of the chosen register, so on the WRITE tick <em>only that word</em> stores the data.</li>
        <li><strong>Read</strong>: a <strong>multiplexer</strong> uses the same address to pick which register's output reaches the data-out pin.</li>
      </ul>
      <p>"Random access" means any address takes the same time to reach, unlike a tape or the shift register, where you wait for the data to come round.</p>
      <h3>Address bits → memory size</h3>
      <p><code>n</code> address wires can name <code>2ⁿ</code> different words. 2 bits → 4 words, 4 bits → 16, 10 bits → 1024, 32 bits → 4,294,967,296. Each extra address wire <strong>doubles</strong> the memory you can reach.</p>
      <div class="tip">Real memory chips don't build a giant 2ⁿ-way decoder. They arrange cells in a square grid: some address bits pick the <strong>row</strong> (word line), the rest pick the <strong>column</strong> (bit lines through a mux). A 1-million-cell array is only 1024 × 1024.</div>
      <div class="world">
        <p><strong>The 4 GiB limit.</strong> A 32-bit CPU's addresses are 32 bits, so it can name 2³² bytes = 4 GiB. That's why 32-bit Windows couldn't use more than about 4 GB of RAM, and why everything moved to 64-bit. Today's x86-64 chips implement 48-bit (256 TiB) or 57-bit virtual addresses.</p>
        <p><strong>Real chips.</strong> Early DRAM chips were one bit wide. The original <a href="https://en.wikipedia.org/wiki/Commodore_64" target="_blank">Commodore 64</a> used eight 4164 chips (64K × 1 bit each) side by side, one per bit of every byte: the same "stack 1-bit RAMs to make a word" idea as in the first example. A modern <strong>DDR5</strong> stick has 288 pins and several DRAM chips that all receive the same row/column address, and together they deliver 64 data bits per transfer, split into two independent 32-bit channels.</p>
      </div>
    `,
    examples: [
      {
        title: '4 × 1-bit RAM: decoder for write, mux for read',
        code: `<style>
  #mem { margin-top:8px; border-collapse:collapse; font:13px ui-monospace,Menlo,monospace; }
  #mem td, #mem th { border:1px solid #e2e5ee; padding:3px 12px; text-align:center; }
  #mem th { background:#f1f4f9; font:600 12px system-ui; }
  #mem tr.sel td { background:#fff4c2; font-weight:700; }
</style>
<div id="c"></div>
<table id="mem"></table>
<script>
Circ.chip('MUX4', { label: '4:1 MUX', ins: ['S0', 'S1', 'D0', 'D1', 'D2', 'D3'], outs: ['Y'], w: 90,
  desc: 'Y = D[S1 S0]: passes the input selected by the 2-bit address',
  fn: function (i) { return [i[2 + i[0] + 2 * i[1]]]; } });
var parts = [
  { id: 'A', type: 'NUMIN', label: 'ADDR', bits: 2, x: 0, y: 40 },
  { id: 'dec', type: 'DEC2', x: 180, y: 20 },
  { id: 'din', type: 'IN', label: 'DIN', x: 20, y: 440 },
  { id: 'wr', type: 'BUTTON', label: 'WRITE', x: 20, y: 500 },
  { id: 'mux', type: 'MUX4', x: 620, y: 60 },
  { id: 'dout', type: 'OUT', label: 'DOUT', x: 780, y: 120, color: '#2563eb' },
  { id: 'tb', type: 'TEXT', text: 'the same address also drives the read mux', x: 230, y: -48, size: 11, color: '#7c3aed' },
];
var wires = [
  ['A.0', 'dec.A0'], ['A.1', 'dec.A1'],
  ['A.0', 'mux.S0', { pts: [[110, 70], [110, -40], [600, -40], [600, 90]] }],
  ['A.1', 'mux.S1', { pts: [[120, 90], [120, -20], [590, -20], [590, 110]] }],
  ['mux', 'dout'],
];
var mxY = [0, 340, 320, 300], mxQ = [550, 570, 560, 580];
for (var k = 0; k < 4; k++) {
  parts.push({ id: 'c' + k, type: 'DFFE', label: 'ADDR ' + k, x: 420, y: 110 * k });
  wires.push(['dec.Y' + k, 'c' + k + '.LOAD', k ? { mx: mxY[k] } : {}]);
  wires.push(['din', 'c' + k + '.D', { pts: [[380, 460], [380, 110 * k + 30]] }]);
  wires.push(['wr', 'c' + k + '.CLK', { pts: [[400, 520], [400, 110 * k + 70]] }]);
  wires.push(['c' + k + '.Q', 'mux.D' + k, { mx: mxQ[k] }]);
}
window.api = Circ.mount('#c', {
  title: '4 words × 1 bit of RAM', parts: parts, wires: wires, scale: 0.95,
  intro: 'Choose <b>ADDR</b>, set <b>DIN</b>, press <b>WRITE</b>. Then change ADDR to read the other cells on <b>DOUT</b>.',
  help: 'WRITE is a push button: pressing it is the clock edge. The decoder enables LOAD on exactly one cell.',
  onChange: function (a) {
    var addr = a.get('ADDR'), h = '<tr><th>address</th><th>stored bit</th><th>decoder line</th></tr>';
    for (var k = 0; k < 4; k++) h += '<tr class="' + (k === addr ? 'sel' : '') + '"><td>' + k + ' (' + (k >> 1) + '' + (k & 1) + ')</td><td>' + a.get('ADDR ' + k) + '</td><td>' + (k === addr ? 'Y' + k + ' = 1 → LOAD' : 'Y' + k + ' = 0') + '</td></tr>';
    var t = document.getElementById('mem'); if (t) t.innerHTML = h;
  },
});
<\/script>`,
        explain: `
          <details>
            <summary>The problem: one data wire, four places to put it</summary>
            <p>All four cells are wired to the same <strong>DIN</strong> and the same <strong>WRITE</strong> clock. If nothing else were connected, every WRITE would store DIN into all four. The <strong>decoder</strong> fixes that: it turns the 2-bit address into four select lines Y0…Y3, and exactly one of them is 1. That line is the LOAD of one cell. The others have LOAD = 0 and ignore the tick.</p>
            <p>On the read side the <strong>4:1 MUX</strong> uses the same two address bits to connect the selected cell's Q to DOUT. Reading needs no clock: DOUT changes as soon as you change ADDR.</p>
          </details>
          <details>
            <summary>Step by step: write 1 to address 2, then read around</summary>
            <table>
              <tr><th>#</th><th>Click</th><th>ADDR</th><th>DIN</th><th>Decoder</th><th>Cells 0 1 2 3</th><th>DOUT</th></tr>
              <tr><td>1</td><td>(start)</td><td>0</td><td>0</td><td>Y0</td><td>0 0 0 0</td><td>0</td></tr>
              <tr><td>2</td><td>ADDR ▲ ▲</td><td>2</td><td>0</td><td>Y2</td><td>0 0 0 0</td><td>0</td></tr>
              <tr><td>3</td><td>DIN</td><td>2</td><td>1</td><td>Y2</td><td>0 0 0 0</td><td>0 (not written yet)</td></tr>
              <tr><td>4</td><td>WRITE</td><td>2</td><td>1</td><td>Y2</td><td>0 0 <strong>1</strong> 0</td><td><strong>1</strong></td></tr>
              <tr><td>5</td><td>ADDR ▼</td><td>1</td><td>1</td><td>Y1</td><td>0 0 1 0</td><td>0 (reading cell 1)</td></tr>
              <tr><td>6</td><td>ADDR ▲</td><td>2</td><td>1</td><td>Y2</td><td>0 0 1 0</td><td>1 (it remembered)</td></tr>
            </table>
            <p>The table under the circuit shows all four cells and which decoder line is active.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Store the pattern 1, 0, 1, 1 into addresses 0…3 (set ADDR and DIN, then press WRITE, four times).</li>
              <li>Now click through ADDR 0 → 3 and read it back on DOUT. Nothing changes until you press WRITE again.</li>
              <li>Notice the address goes to <em>two</em> places: the decoder (where to write) and the MUX (what to read).</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: "width" vs "depth"</summary>
            <p>This RAM is 4 words <strong>deep</strong> and 1 bit <strong>wide</strong>. To store bytes, put 8 of these side by side, all sharing ADDR and WRITE, each with its own DIN/DOUT bit. That's how the Commodore 64 got 64 KB out of eight 64K × 1 chips. Depth costs address bits, width costs data wires.</p>
          </details>
        `,
      },
      {
        title: 'A 16-byte RAM explorer (address → row select)',
        code: `<style>
  .rx { font:14px system-ui; color:#1f2330; display:flex; gap:16px; flex-wrap:wrap; }
  .rx .panel { background:#fff; border:1px solid #e2e5ee; border-radius:10px; padding:10px 12px; }
  .rx .bits button { width:34px; height:30px; margin-right:3px; border-radius:6px; border:1px solid #93c5fd; background:#eff6ff; font:700 14px ui-monospace,monospace; cursor:pointer; }
  .rx .bits button.one { background:#2563eb; color:#fff; }
  .rx .act button { margin:8px 6px 0 0; padding:5px 12px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:700; }
  .rx .act button.w { background:#dc2626; color:#fff; border-color:#dc2626; }
  .rx .act button.r { background:#16a34a; color:#fff; border-color:#16a34a; }
  .rx table { border-collapse:collapse; font:12.5px ui-monospace,Menlo,monospace; }
  .rx td { padding:1px 0; text-align:center; }
  .rx td.cell { width:18px; height:18px; border:1px solid #e5e7eb; }
  .rx td.cell.on { background:#86efac; }
  .rx tr.sel td.cell { border-color:#f59e0b; }
  .rx tr.sel td.cell.on { background:#22c55e; }
  .rx td.line { width:46px; } .rx td.line div { height:3px; background:#e2e8f0; margin:0 4px; }
  .rx tr.sel td.line div { background:#f59e0b; height:4px; }
  .rx td.addr { width:84px; white-space:nowrap; color:#64748b; text-align:right; padding-right:6px; }
  .rx tr.sel td.addr { color:#b45309; font-weight:800; }
  .rx td.asc { width:44px; color:#475569; } .rx td.hex { width:36px; color:#7c3aed; }
  .rx .big { font:800 20px ui-monospace,monospace; }
  .rx .log { font-size:13px; color:#475066; margin-top:8px; max-width:300px; min-height:36px; }
  .rx input[type=range] { width:240px; }
</style>
<div class="rx">
  <div class="panel">
    <div><b>Address</b> (A3 A2 A1 A0): <span class="bits" id="ab"></span></div>
    <div style="margin-top:8px"><b>Data in</b> (D7…D0): <span class="bits" id="db"></span></div>
    <div style="margin-top:6px">Data in = <span id="dv"></span></div>
    <div class="act"><button class="w" id="w">WRITE</button><button class="r" id="r">READ</button></div>
    <div style="margin-top:10px">Data out: <span class="big" id="out">–</span></div>
    <div class="log" id="log"></div>
    <hr style="border:0;border-top:1px solid #e2e5ee">
    <div><b>How far can n address bits reach?</b></div>
    <input type="range" id="n" min="1" max="64" value="32"> <span id="nv"></span>
    <div class="log" id="nl" style="min-height:40px"></div>
  </div>
  <div class="panel">
    <table id="grid"></table>
    <div style="font-size:12px;color:#64748b;margin-top:4px">decoder row lines → 16 words × 8 bits = 128 bits</div>
  </div>
</div>
<script>
var mem = [], addr = 0, din = 65;
var init = 'HELLO, RAM!';
for (var i = 0; i < 16; i++) mem.push(i < init.length ? init.charCodeAt(i) : 0);
function $(i) { return document.getElementById(i); }
function hex(v) { return '0x' + (v < 16 ? '0' : '') + v.toString(16).toUpperCase(); }
function asc(v) { return v >= 32 && v < 127 ? "'" + String.fromCharCode(v) + "'" : '·'; }
function render() {
  var a = ''; for (var b = 3; b >= 0; b--) a += '<button data-a="' + b + '" class="' + ((addr >> b) & 1 ? 'one' : '') + '">' + ((addr >> b) & 1) + '</button>';
  $('ab').innerHTML = a + ' = ' + addr;
  var d = ''; for (var b = 7; b >= 0; b--) d += '<button data-d="' + b + '" class="' + ((din >> b) & 1 ? 'one' : '') + '" style="width:26px">' + ((din >> b) & 1) + '</button>';
  $('db').innerHTML = d; $('dv').innerHTML = din + ' = ' + hex(din) + ' = ' + asc(din);
  var h = '<tr><td></td><td></td>'; for (var b = 7; b >= 0; b--) h += '<td style="font-size:10px;color:#94a3b8">' + b + '</td>'; h += '<td></td><td></td></tr>';
  for (var r = 0; r < 16; r++) {
    h += '<tr class="' + (r === addr ? 'sel' : '') + '"><td class="addr">' + r + ' (' + (r >> 3 & 1) + (r >> 2 & 1) + (r >> 1 & 1) + (r & 1) + ')</td><td class="line"><div></div></td>';
    for (var b = 7; b >= 0; b--) h += '<td class="cell ' + ((mem[r] >> b) & 1 ? 'on' : '') + '"></td>';
    h += '<td class="hex">' + hex(mem[r]) + '</td><td class="asc">' + asc(mem[r]) + '</td></tr>';
  }
  $('grid').innerHTML = h;
  document.querySelectorAll('[data-a]').forEach(function (e) { e.onclick = function () { addr ^= 1 << +e.dataset.a; render(); }; });
  document.querySelectorAll('[data-d]').forEach(function (e) { e.onclick = function () { din ^= 1 << +e.dataset.d; render(); }; });
}
$('w').onclick = function () { mem[addr] = din; $('log').innerHTML = 'mem[' + addr + '] = ' + din + ' ' + asc(din) + '. Only row ' + addr + '\\'s LOAD line was active, so only that row changed.'; render(); };
$('r').onclick = function () { $('out').textContent = mem[addr] + ' = ' + hex(mem[addr]) + ' ' + asc(mem[addr]); $('log').innerHTML = 'Row ' + addr + ' selected: its 8 bits go through the mux to Data out.'; };
function units(n) {
  var u = ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB'], i = Math.min(6, Math.floor(n / 10)), v = Math.pow(2, n - 10 * i);
  return v.toLocaleString() + ' ' + u[i];
}
var NOTES = { 8: '256 B: one "page", e.g. the 6502 zero page', 16: '64 KiB: 8-bit machines (6502 in the Apple II / NES / C64, Z80)', 20: '1 MiB: the original 8086 / IBM PC', 24: '16 MiB: the 80286', 32: '4 GiB: the 32-bit limit', 36: '64 GiB: PAE on later 32-bit x86', 48: '256 TiB: x86-64 virtual address space (4-level paging)', 57: '128 PiB: 5-level paging', 64: '16 EiB: the full 64-bit space' };
function nrender() { var n = +$('n').value; $('nv').innerHTML = '<b>' + n + ' bits</b> → 2<sup>' + n + '</sup> = <b>' + units(n) + '</b>'; $('nl').innerHTML = NOTES[n] ? '📌 ' + NOTES[n] : (n === 4 ? 'This explorer: 4 bits → 16 bytes.' : ''); }
$('n').oninput = nrender;
render(); nrender();
<\/script>`,
        explain: `
          <details>
            <summary>What the explorer shows</summary>
            <p>Each row of the grid is one 8-bit word (8 storage cells) with its address on the left. The 4 address bits feed a 4-to-16 decoder, drawn as the orange row line: exactly one row is selected at a time. <strong>WRITE</strong> stores "Data in" into that row only. <strong>READ</strong> sends that row's 8 bits to "Data out". The memory starts holding the text <code>HELLO, RAM!</code>, one ASCII character per address. A string in your program is laid out in RAM exactly like this.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click the address bits to select address 4 (0100): the row with 'O'. Press <strong>READ</strong>: 79 = 0x4F.</li>
              <li>Data in starts as 65 = 'A'. Press <strong>WRITE</strong>: the text now reads <code>HELLA, RAM!</code>. Only one row changed.</li>
              <li>Drag the "address bits" slider to 16, 20, 32 and 48 bits and read the notes. Every extra address line doubles the reachable memory.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'A RAM has 10 address lines. How many words can it address?', options: ['10', '100', '1024', '2048'], answer: 2, why: '2¹⁰ = 1024. Each address line doubles the count.' },
      { q: 'During a write, what selects which word stores the data?', options: ['The multiplexer', 'The decoder: its one-hot output enables LOAD on exactly one word', 'The clock speed', 'The data bits'], answer: 1, why: 'The decoder turns the address into one active select line, which drives that word\'s LOAD.' },
      { q: 'What does the read path use to pick one word\'s output?', options: ['A decoder', 'A multiplexer controlled by the address', 'An adder', 'A shift register'], answer: 1, why: 'A mux connects the addressed word to the data-out pins.' },
      { q: 'Why can a 32-bit CPU address at most 4 GiB (without tricks)?', options: ['RAM sticks max out at 4 GB', '2³² byte addresses = 4,294,967,296 bytes = 4 GiB', 'Windows limits it', 'The clock is too slow'], answer: 1, why: 'With 32-bit addresses there are only 2³² distinct byte addresses.' },
      { q: 'You have eight 64K × 1-bit RAM chips. How do you make 64 KB of byte-wide memory?', options: ['Chain them for 512K × 1', 'Put them side by side: same address to all, one data bit each', 'Use only one', 'It is impossible'], answer: 1, why: 'Shared address + 8 data bits in parallel = 64K × 8, as in the Commodore 64.' },
    ],
    exercise: {
      task: `<p>Build a <strong>2-word × 1-bit RAM</strong>. Address <strong>A</strong> (one bit) chooses word 0 or word 1. Pressing <strong>WRITE</strong> stores <strong>DIN</strong> into the selected word only. <strong>DOUT</strong> always shows the selected word.</p>
        <p>Use only <strong>REG BIT</strong> (DFFE: D, LOAD, CLK → Q), <strong>MUX</strong> and <strong>NOT</strong>. Build it in the board below, then click <strong>✔ Check</strong>.</p>`,
      hint: 'Two REG BITs. Both get D = DIN and CLK = WRITE. Their LOAD inputs act as a 1-bit decoder: word 0 gets LOAD = NOT A, word 1 gets LOAD = A. For reading, a MUX with A = word 0\'s Q, B = word 1\'s Q and S = the address A.',
      starter: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 2 × 1-bit RAM',
  build: { palette: ['DFFE', 'MUX2', 'NOT'], best: 4 },
  parts: [
    { id: 'a', type: 'IN', label: 'A', x: 70, y: 40 },
    { id: 'din', type: 'IN', label: 'DIN', x: 70, y: 160 },
    { id: 'wr', type: 'BUTTON', label: 'WRITE', x: 70, y: 280 },
    { id: 'dout', type: 'OUT', label: 'DOUT', x: 680, y: 160, color: '#2563eb' },
  ],
  test: [
    { set: { A: 0, DIN: 1 }, pulse: 'WRITE', expect: { DOUT: 1 }, note: 'write 1 to word 0' },
    { set: { A: 1 }, expect: { DOUT: 0 }, note: 'read word 1: still 0' },
    { set: { DIN: 1 }, pulse: 'WRITE', expect: { DOUT: 1 }, note: 'write 1 to word 1' },
    { set: { A: 0, DIN: 0 }, expect: { DOUT: 1 }, note: 'read word 0 (no write)' },
    { pulse: 'WRITE', expect: { DOUT: 0 }, note: 'write 0 to word 0' },
    { set: { A: 1 }, expect: { DOUT: 1 }, note: 'word 1 unaffected' },
    { set: { DIN: 0 }, expect: { DOUT: 1 }, note: 'DIN changes without WRITE' },
    { pulse: 'WRITE', expect: { DOUT: 0 }, note: 'write 0 to word 1' },
    { set: { A: 0, DIN: 1 }, expect: { DOUT: 0 }, note: 'read word 0' },
  ],
});
<\/script>`,
      solution: `<div id="c"></div>
<script>
window.api = Circ.mount('#c', {
  title: 'Build: 2 × 1-bit RAM',
  build: { palette: ['DFFE', 'MUX2', 'NOT'], best: 4 },
  parts: [
    { id: 'a', type: 'IN', label: 'A', x: 70, y: 40 },
    { id: 'din', type: 'IN', label: 'DIN', x: 70, y: 160 },
    { id: 'wr', type: 'BUTTON', label: 'WRITE', x: 70, y: 280 },
    { id: 'dout', type: 'OUT', label: 'DOUT', x: 680, y: 160, color: '#2563eb' },
    { id: 'inv', type: 'NOT', x: 160, y: 40 },
    { id: 'w0', type: 'DFFE', label: 'WORD 0', x: 320, y: 100 },
    { id: 'w1', type: 'DFFE', label: 'WORD 1', x: 320, y: 220 },
    { id: 'mux', type: 'MUX2', x: 520, y: 130 },
  ],
  wires: [
    ['a', 'inv'],
    ['inv', 'w0.LOAD', { pts: [[240, 60], [240, 150]] }],
    ['a', 'w1.LOAD', { pts: [[120, 60], [120, 270]] }],
    ['din', 'w0.D', { pts: [[270, 180], [270, 130]] }],
    ['din', 'w1.D', { pts: [[270, 180], [270, 250]] }],
    ['wr', 'w0.CLK', { pts: [[290, 300], [290, 170]] }],
    ['wr', 'w1.CLK', { pts: [[290, 300], [290, 290]] }],
    ['w0.Q', 'mux.A', { mx: 460 }],
    ['w1.Q', 'mux.B', { mx: 460 }],
    ['a', 'mux.S', { pts: [[130, 60], [130, 20], [490, 20], [490, 200]] }],
    ['mux', 'dout'],
  ],
  test: [
    { set: { A: 0, DIN: 1 }, pulse: 'WRITE', expect: { DOUT: 1 }, note: 'write 1 to word 0' },
    { set: { A: 1 }, expect: { DOUT: 0 }, note: 'read word 1: still 0' },
    { set: { DIN: 1 }, pulse: 'WRITE', expect: { DOUT: 1 }, note: 'write 1 to word 1' },
    { set: { A: 0, DIN: 0 }, expect: { DOUT: 1 }, note: 'read word 0 (no write)' },
    { pulse: 'WRITE', expect: { DOUT: 0 }, note: 'write 0 to word 0' },
    { set: { A: 1 }, expect: { DOUT: 1 }, note: 'word 1 unaffected' },
    { set: { DIN: 0 }, expect: { DOUT: 1 }, note: 'DIN changes without WRITE' },
    { pulse: 'WRITE', expect: { DOUT: 0 }, note: 'write 0 to word 1' },
    { set: { A: 0, DIN: 1 }, expect: { DOUT: 0 }, note: 'read word 0' },
  ],
});
<\/script>`,
    },
  },
  // ───────────────────────────────────────────── sram-dram-flash
  {
    id: 'sram-dram-flash',
    section: 'Memory & Time',
    title: 'Real memory: SRAM vs DRAM vs Flash',
    explain: `
      <p>Our RAM stored each bit in a flip-flop of about 20 gates. That works, but it is far too big to fit billions of bits on a chip. Real memory comes in three main technologies, each trading <strong>speed</strong>, <strong>size per bit</strong> and <strong>volatility</strong> (whether it forgets when the power goes off).</p>
      <h3>SRAM: static RAM (a latch)</h3>
      <p>A <strong>6-transistor</strong> cell: two cross-coupled inverters (the SR-latch idea, an even loop) plus two access transistors. It holds its bit as long as power is on, with no maintenance, and it is very fast. But 6 transistors per bit is big and expensive. <strong>CPU caches and registers</strong> are built this way.</p>
      <h3>DRAM: dynamic RAM (a leaky bucket)</h3>
      <p>A <strong>1-transistor, 1-capacitor (1T1C)</strong> cell. The bit is a tiny charge on a capacitor: charged = 1, empty = 0. It's tiny, so you can fit billions per chip, which makes it cheap. But the charge <strong>leaks away</strong> within milliseconds, so the memory controller must <strong>refresh</strong> every row (read it and write it back) about every 64 ms. That's the "dynamic". Reading also drains the capacitor, so every read is followed by a rewrite. <strong>Main memory</strong> (DDR4/DDR5 sticks) is DRAM.</p>
      <h3>Flash: trapped electrons (non-volatile)</h3>
      <p>A transistor with an extra, fully insulated <strong>floating gate</strong>. A high voltage forces electrons through the insulator by quantum tunnelling, and once there they stay trapped for years with <strong>no power at all</strong>. Trapped electrons change how easily the transistor turns on, which is how the bit is read. Writing is slow, it erases in large blocks, and the insulator wears out after thousands of program/erase cycles. <strong>SSDs, phones, USB sticks and SD cards</strong> use NAND flash.</p>
      <table>
        <tr><th></th><th>SRAM</th><th>DRAM</th><th>NAND Flash</th></tr>
        <tr><td>Cell</td><td>6 transistors (latch)</td><td>1 transistor + 1 capacitor</td><td>1 floating-gate transistor, several bits per cell</td></tr>
        <tr><td>Access time</td><td>~1–10 ns (cache)</td><td>~50–100 ns</td><td>~20–100 µs read, slower write</td></tr>
        <tr><td>Cost per GB</td><td>highest</td><td>medium</td><td>lowest</td></tr>
        <tr><td>Power off</td><td>forgets</td><td>forgets</td><td><strong>keeps data</strong></td></tr>
        <tr><td>Maintenance</td><td>none</td><td>refresh every ~64 ms</td><td>wear levelling (limited writes)</td></tr>
        <tr><td>Used for</td><td>CPU caches (L1/L2/L3)</td><td>main memory, GPU memory</td><td>SSDs, phones, USB sticks</td></tr>
      </table>
      <div class="tip">That's why computers have a <strong>memory hierarchy</strong>: a small amount of fast, expensive memory close to the CPU, backed by larger, slower, cheaper layers. Caches keep the data you are using right now in SRAM so the CPU rarely has to wait for DRAM.</div>
      <div class="world">
        <p><strong>Your laptop right now:</strong> registers and L1/L2/L3 caches inside the CPU are SRAM (tens of MB at most). The 16 or 32 GB of "RAM" is DRAM, and its controller quietly refreshes every row many times per second. The SSD is NAND flash, and modern "3D NAND" stacks well over 200 layers of cells on top of each other.</p>
        <p><strong>Rowhammer.</strong> DRAM cells are now so small and close together that reading one row extremely often can make charge leak in the <em>neighbouring</em> rows and flip their bits. Researchers showed this in 2014 (<a href="https://en.wikipedia.org/wiki/Row_hammer" target="_blank">Row hammer</a>). In 2015 Google's Project Zero used it to break out of a sandbox and gain kernel privileges. Memory makers responded with in-DRAM mitigations ("target row refresh") and ECC, but variants keep appearing.</p>
      </div>
    `,
    examples: [
      {
        title: 'SRAM latch vs leaky DRAM capacitor (refresh!)',
        code: `<style>
  .mm { font:14px system-ui; color:#1f2330; display:flex; gap:14px; flex-wrap:wrap; }
  .mm .card { background:#fff; border:1px solid #e2e5ee; border-radius:12px; padding:10px 14px; flex:1 1 380px; }
  .mm h4 { margin:0 0 4px; font-size:15px; }
  .mm button { margin:4px 4px 0 0; padding:4px 11px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; }
  .mm button.on { background:#0f766e; color:#fff; border-color:#0f766e; }
  .mm .rd { margin-top:6px; font-size:13.5px; min-height:38px; }
  .mm .val { font:800 18px ui-monospace,monospace; }
  .mm .bad { color:#b91c1c; font-weight:700; } .mm .ok { color:#15803d; font-weight:700; }
  .mm select { padding:3px; border-radius:6px; }
</style>
<div class="mm">
  <div class="card">
    <h4>SRAM cell (6 transistors)</h4>
    <svg id="ssv" width="360" height="150" viewBox="0 0 360 150"></svg>
    <div><button id="s0">Write 0</button><button id="s1">Write 1</button><button id="sr">Read</button><button id="sp">Power: ON</button></div>
    <div class="rd" id="srd"></div>
  </div>
  <div class="card">
    <h4>DRAM cell (1 transistor + 1 capacitor)</h4>
    <svg id="dsv" width="360" height="150" viewBox="0 0 360 150"></svg>
    <div><button id="d1">Write 1</button><button id="d0">Write 0</button><button id="dr">Read</button><button id="drf">Refresh now</button></div>
    <div style="margin-top:6px;font-size:13px">Auto-refresh: <select id="ar"><option value="0">off</option><option value="64" selected>every 64 ms</option><option value="32">every 32 ms</option></select>
      &nbsp; Chip temperature: <select id="tmp"><option value="1">45 °C (normal)</option><option value="2">95 °C (hot)</option></select></div>
    <div class="rd" id="drd"></div>
  </div>
</div>
<script>
function $(i) { return document.getElementById(i); }
// ---- SRAM ----
var sq = 0, spow = true;
function inv(x, y, flip, v) {
  var d = flip ? 'M' + (x + 40) + ' ' + (y - 16) + ' L' + x + ' ' + y + ' L' + (x + 40) + ' ' + (y + 16) + ' Z' : 'M' + x + ' ' + (y - 16) + ' L' + (x + 40) + ' ' + y + ' L' + x + ' ' + (y + 16) + ' Z';
  var bx = flip ? x - 5 : x + 45;
  return '<path d="' + d + '" fill="' + (v ? '#ecfdf3' : '#fff') + '" stroke="#334155" stroke-width="2"/><circle cx="' + bx + '" cy="' + y + '" r="4.5" fill="#fff" stroke="#334155" stroke-width="2"/>';
}
function sdraw() {
  var on = spow, q = sq, c1 = on ? (q ? '#16a34a' : '#9aa3b5') : '#e2e8f0', c0 = on ? (q ? '#9aa3b5' : '#16a34a') : '#e2e8f0';
  var s = '<text x="6" y="14" font-size="11" fill="#64748b">BL</text><line x1="14" y1="20" x2="14" y2="140" stroke="#94a3b8" stroke-width="3"/>' +
    '<text x="336" y="14" font-size="11" fill="#64748b">BL̄</text><line x1="346" y1="20" x2="346" y2="140" stroke="#94a3b8" stroke-width="3"/>' +
    '<text x="120" y="146" font-size="11" fill="#64748b">word line (row select)</text><line x1="40" y1="134" x2="320" y2="134" stroke="#c4b5fd" stroke-width="3"/>' +
    '<rect x="34" y="62" width="22" height="16" rx="3" fill="#ede9fe" stroke="#7c3aed"/><rect x="304" y="62" width="22" height="16" rx="3" fill="#ede9fe" stroke="#7c3aed"/>' +
    '<line x1="45" y1="78" x2="45" y2="134" stroke="#c4b5fd" stroke-width="2"/><line x1="315" y1="78" x2="315" y2="134" stroke="#c4b5fd" stroke-width="2"/>' +
    '<line x1="14" y1="70" x2="34" y2="70" stroke="#94a3b8" stroke-width="2"/><line x1="326" y1="70" x2="346" y2="70" stroke="#94a3b8" stroke-width="2"/>';
  // nodes Q (left) and Q̄ (right)
  s += '<path d="M56 70 H100 M100 70 V40 H140 M100 70 V100 H130" fill="none" stroke="' + c1 + '" stroke-width="3"/>';
  s += '<path d="M304 70 H260 M260 70 V100 H220 M260 70 V40 H230" fill="none" stroke="' + c0 + '" stroke-width="3"/>';
  s += inv(140, 40, false, on && q) + inv(180, 100, true, on && !q);
  s += '<line x1="185" y1="40" x2="230" y2="40" stroke="' + c0 + '" stroke-width="3"/><line x1="130" y1="100" x2="175" y2="100" stroke="' + c1 + '" stroke-width="3"/>';
  s += '<text x="60" y="63" font-size="13" font-weight="800" fill="#1f2330">Q=' + (on ? q : '?') + '</text><text x="265" y="63" font-size="13" font-weight="800" fill="#1f2330">Q̄=' + (on ? 1 - q : '?') + '</text>';
  s += '<text x="160" y="76" font-size="10" fill="#64748b">2 inverters</text><text x="150" y="88" font-size="10" fill="#64748b">in a loop (4 T)</text>';
  $('ssv').innerHTML = s;
}
$('s0').onclick = function () { if (!spow) return; sq = 0; $('srd').innerHTML = 'Word line on, bit lines driven to 0/1: the loop is forced to <b>Q = 0</b>. It holds by itself, no refresh needed.'; sdraw(); };
$('s1').onclick = function () { if (!spow) return; sq = 1; $('srd').innerHTML = 'Forced to <b>Q = 1</b>. The two inverters keep each other in that state.'; sdraw(); };
$('sr').onclick = function () { $('srd').innerHTML = spow ? 'Read: word line on, the cell pulls one bit line down a little. A sense amplifier sees <span class="val">' + sq + '</span>. The cell is not disturbed.' : '<span class="bad">No power: there is no value to read.</span>'; };
$('sp').onclick = function () {
  spow = !spow; this.textContent = 'Power: ' + (spow ? 'ON' : 'OFF'); this.classList.toggle('on', !spow);
  if (spow) { sq = Math.random() < 0.5 ? 0 : 1; $('srd').innerHTML = 'Power back on: the loop fell into a <b>random</b> state (Q = ' + sq + '). The old data is gone: SRAM is <b>volatile</b>.'; }
  else $('srd').innerHTML = '<span class="bad">Power off: the inverters stop driving and the stored bit is lost.</span>';
  sdraw();
};
sdraw();
// ---- DRAM ----
var charge = 0, stored = 0, simT = 0, lastRef = 0, lost = false, TAU = 96 / Math.log(2);
function ddraw() {
  var pct = Math.max(0, Math.min(1, charge)), h = 90 * pct, col = pct > 0.5 ? '#22c55e' : pct > 0.25 ? '#f59e0b' : '#ef4444';
  var s = '<text x="6" y="14" font-size="11" fill="#64748b">bit line</text><line x1="30" y1="20" x2="30" y2="140" stroke="#94a3b8" stroke-width="3"/>' +
    '<line x1="30" y1="60" x2="70" y2="60" stroke="#94a3b8" stroke-width="2"/><rect x="70" y="50" width="26" height="20" rx="3" fill="#ede9fe" stroke="#7c3aed"/><text x="74" y="44" font-size="10" fill="#7c3aed">transistor</text>' +
    '<line x1="96" y1="60" x2="130" y2="60" stroke="#94a3b8" stroke-width="2"/>' +
    '<rect x="130" y="25" width="60" height="100" rx="6" fill="#f8fafc" stroke="#334155" stroke-width="2"/>' +
    '<rect x="132" y="' + (123 - h) + '" width="56" height="' + h + '" rx="4" fill="' + col + '" opacity=".75"/>' +
    '<line x1="126" y1="75" x2="194" y2="75" stroke="#334155" stroke-dasharray="4 3"/><text x="198" y="79" font-size="10.5" fill="#334155">50% threshold</text>' +
    '<text x="140" y="140" font-size="11" fill="#475569">capacitor ' + Math.round(pct * 100) + '%</text>';
  var since = simT - lastRef;
  s += '<text x="210" y="30" font-size="12" fill="#1f2330">sim time: <tspan font-weight="700">' + simT.toFixed(0) + ' ms</tspan></text>';
  s += '<text x="210" y="48" font-size="12" fill="#1f2330>since last refresh: <tspan font-weight="700">' + since.toFixed(0) + ' ms</tspan></text>';
  s += '<text x="210" y="102" font-size="12" fill="#1f2330">stored: <tspan font-weight="800">' + stored + '</tspan>, would read: <tspan font-weight="800" fill="' + ((pct > 0.5 ? 1 : 0) === stored ? '#15803d' : '#b91c1c') + '">' + (pct > 0.5 ? 1 : 0) + '</tspan></text>';
  if (lost) s += '<text x="210" y="122" font-size="12" font-weight="800" fill="#b91c1c">⚠ bit lost (leaked below 50%)</text>';
  $('dsv').innerHTML = s;
}
function settle(v) { charge = v ? 1 : 0; lastRef = simT; }
$('d1').onclick = function () { stored = 1; lost = false; settle(1); $('drd').innerHTML = 'Capacitor charged to 100%. Now watch it <b>leak</b>…'; ddraw(); };
$('d0').onclick = function () { stored = 0; lost = false; settle(0); $('drd').innerHTML = 'Capacitor emptied (0). A 0 has nothing to leak, so it stays a 0.'; ddraw(); };
function readCell(why) { var bit = charge > 0.5 ? 1 : 0; settle(bit); if (bit !== stored) lost = true; $('drd').innerHTML = why + ': the sense amplifier compares the charge with 50% → <span class="val">' + bit + '</span>. Reading drains the capacitor, so the value is <b>written back</b> at full strength.' + (lost ? ' <span class="bad">Too late: the 1 had already leaked into a 0.</span>' : ''); ddraw(); }
$('dr').onclick = function () { readCell('Read'); };
$('drf').onclick = function () { readCell('Refresh'); };
setInterval(function () {
  var dt = 32 * 0.1, k = +$('tmp').value;
  simT += dt; charge *= Math.exp(-dt * k / TAU);
  if (stored === 1 && charge <= 0.5 && !lost) { lost = true; $('drd').innerHTML = '<span class="bad">The charge leaked below 50% before a refresh came. The bit now reads as 0: data corrupted.</span>'; }
  var ar = +$('ar').value;
  if (ar && simT - lastRef >= ar) { var bit = charge > 0.5 ? 1 : 0; if (bit !== stored) lost = true; settle(bit); }
  ddraw();
}, 100);
ddraw();
<\/script>`,
        explain: `
          <details>
            <summary>The problem: a capacitor is a leaky bucket</summary>
            <p>The DRAM bit is a few femtocoulombs of charge on a microscopic capacitor. Charge slowly leaks through the transistor and the insulation, so a stored 1 droops toward 0. The chip can tell a 1 from a 0 only while the charge is above about half. The fix is to <strong>refresh</strong>: read every row (the sense amplifier decides 0 or 1) and write it back at full strength, before it gets near the threshold. In this widget 1 real second = 32 simulated ms, and a 1 left alone at normal temperature crosses 50% after about 96 ms.</p>
            <table>
              <tr><th>Setting</th><th>Leak: 100% → 50% in</th><th>Refresh every</th><th>Result</th></tr>
              <tr><td>45 °C</td><td>~96 ms</td><td>64 ms</td><td class="ok">✅ safe</td></tr>
              <tr><td>45 °C</td><td>~96 ms</td><td>off</td><td class="bad">❌ lost after ~3 s</td></tr>
              <tr><td>95 °C</td><td>~48 ms</td><td>64 ms</td><td class="bad">❌ lost</td></tr>
              <tr><td>95 °C</td><td>~48 ms</td><td>32 ms</td><td class="ok">✅ safe</td></tr>
            </table>
            <p>That mirrors real DRAM rules: DDR4 must refresh every row within 64 ms, and the interval halves to 32 ms above 85 °C, because leakage grows fast with temperature.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>DRAM: set Auto-refresh to <strong>off</strong> and click <strong>Write 1</strong>. Watch the bar drain and turn orange and red. Around 96 ms it crosses 50% and the bit is lost.</li>
              <li>Write 1 again with auto-refresh <strong>every 64 ms</strong>: the bar saw-tooths between 100% and ~63% forever. That's what a DRAM controller does to every row of your RAM.</li>
              <li>Switch the temperature to <strong>95 °C</strong>: 64 ms is no longer enough. Choose <strong>32 ms</strong> to save it.</li>
              <li>SRAM: write a 1 and wait as long as you like. It never changes. Then toggle <strong>Power</strong> off and on: the value is random. Both SRAM and DRAM are volatile.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Flash: electrons trapped on a floating gate',
        code: `<style>
  .fl { font:14px system-ui; color:#1f2330; }
  .fl .card { background:#fff; border:1px solid #e2e5ee; border-radius:12px; padding:10px 14px; }
  .fl button { margin:4px 4px 0 0; padding:4px 11px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; }
  .fl button.on { background:#0f766e; color:#fff; border-color:#0f766e; }
  .fl .rd { margin-top:6px; font-size:13.5px; min-height:40px; }
  .fl .wear { height:12px; border-radius:6px; background:#e5e7eb; overflow:hidden; width:300px; display:inline-block; vertical-align:middle; }
  .fl .wear div { height:100%; background:linear-gradient(90deg,#22c55e,#f59e0b,#ef4444); }
</style>
<div class="fl"><div class="card">
  <svg id="fsv" width="620" height="210" viewBox="0 0 620 210"></svg>
  <div><button id="pg">Program (store 0)</button><button id="er">Erase block (→ 1)</button><button id="rd">Read</button><button id="pw">Power: ON</button><button id="cy">Run 1000 program/erase cycles</button></div>
  <div style="margin-top:8px;font-size:13px">Cell type: <select id="ty"><option value="1">SLC: 1 bit/cell (~100,000 cycles)</option><option value="3" selected>TLC: 3 bits/cell (~3,000 cycles)</option><option value="4">QLC: 4 bits/cell (~1,000 cycles)</option></select>
    &nbsp; Wear: <span class="wear"><div id="wb" style="width:0%"></div></span> <span id="wt"></span></div>
  <div class="rd" id="frd"></div>
</div></div>
<script>
function $(i) { return document.getElementById(i); }
var e = 0, pow = true, cyc = 0;   // e = electrons on floating gate (0..12)
var LIFE = { 1: 100000, 3: 3000, 4: 1000 };
function draw(arrow) {
  var s = '';
  s += '<rect x="80" y="150" width="460" height="50" fill="#e0f2fe" stroke="#7dd3fc"/><text x="300" y="192" text-anchor="middle" font-size="11" fill="#0369a1">silicon</text>';
  s += '<rect x="90" y="140" width="90" height="22" rx="4" fill="#bae6fd" stroke="#0284c7"/><text x="135" y="155" text-anchor="middle" font-size="11">source</text>';
  s += '<rect x="440" y="140" width="90" height="22" rx="4" fill="#bae6fd" stroke="#0284c7"/><text x="485" y="155" text-anchor="middle" font-size="11">drain</text>';
  var conduct = pow && e < 6;
  s += '<rect x="180" y="146" width="260" height="8" fill="' + (arrow === 'read' ? (conduct ? '#22c55e' : '#fecaca') : '#e0f2fe') + '"/>';
  s += '<rect x="190" y="126" width="240" height="14" fill="#fef9c3" stroke="#facc15"/><text x="440" y="137" font-size="10" fill="#a16207">thin oxide (tunnel)</text>';
  s += '<rect x="200" y="96" width="220" height="30" rx="4" fill="#fde68a" stroke="#d97706" stroke-width="2"/><text x="430" y="114" font-size="11" fill="#92400e" font-weight="700">floating gate</text>';
  for (var i = 0; i < e; i++) s += '<circle cx="' + (215 + (i % 12) * 17) + '" cy="111" r="6" fill="#2563eb"/><text x="' + (215 + (i % 12) * 17) + '" y="114.5" text-anchor="middle" font-size="9" fill="#fff">−</text>';
  s += '<rect x="190" y="82" width="240" height="14" fill="#fef9c3" stroke="#facc15"/>';
  s += '<rect x="200" y="50" width="220" height="32" rx="4" fill="#cbd5e1" stroke="#334155" stroke-width="2"/><text x="310" y="71" text-anchor="middle" font-size="12" font-weight="700">control gate (word line)</text>';
  if (arrow === 'prog') s += '<text x="40" y="40" font-size="12" fill="#2563eb" font-weight="700">+20 V on control gate → electrons tunnel UP ↑</text>';
  if (arrow === 'erase') s += '<text x="40" y="40" font-size="12" fill="#dc2626" font-weight="700">+20 V on the substrate → electrons pulled OUT ↓</text>';
  if (arrow === 'read') s += '<text x="40" y="40" font-size="12" fill="#15803d" font-weight="700">small read voltage: ' + (conduct ? 'channel conducts → reads 1' : 'trapped electrons block the channel → reads 0') + '</text>';
  s += '<text x="40" y="20" font-size="12" fill="#475569">electrons trapped: <tspan font-weight="800">' + e + '</tspan> · bit = <tspan font-weight="800">' + (e >= 6 ? 0 : 1) + '</tspan>' + (pow ? '' : ' · <tspan fill="#b91c1c" font-weight="700">power OFF</tspan>') + '</text>';
  $('fsv').innerHTML = s;
  var life = LIFE[$('ty').value], w = Math.min(1, cyc / life);
  $('wb').style.width = (w * 100) + '%'; $('wt').textContent = cyc.toLocaleString() + ' / ~' + life.toLocaleString() + ' P/E cycles';
}
function worn() { return cyc >= LIFE[$('ty').value]; }
$('pg').onclick = function () {
  if (!pow) { $('frd').textContent = 'No power: cannot program.'; return; }
  if (worn()) { e = Math.random() < 0.5 ? 12 : 3; $('frd').innerHTML = '<b style="color:#b91c1c">Worn out!</b> The oxide is damaged: electrons leak, so the cell can no longer hold a reliable value. The SSD controller retires this block.'; draw('prog'); return; }
  e = 12; cyc += 0.5; $('frd').innerHTML = 'Programming: a high voltage pulls electrons through the thin oxide onto the floating gate (quantum tunnelling). They are now <b>trapped</b>. This is slow (hundreds of µs) and damages the oxide a tiny bit each time.'; draw('prog');
};
$('er').onclick = function () {
  if (!pow) { $('frd').textContent = 'No power: cannot erase.'; return; }
  e = 0; cyc += 0.5; $('frd').innerHTML = 'Erase: the electrons are pulled back out. In NAND flash this happens to a whole <b>block</b> (often megabytes) at once. Erased cells read as 1.'; draw('erase');
};
$('rd').onclick = function () { if (!pow) { $('frd').textContent = 'No power: nothing can be read right now, but the electrons are still there.'; draw(); return; } $('frd').innerHTML = 'Read: apply a small voltage to the control gate. ' + (e >= 6 ? 'The trapped negative charge cancels it, the transistor stays OFF → <b>0</b>.' : 'No trapped charge, the transistor turns ON → <b>1</b>.'); draw('read'); };
$('pw').onclick = function () { pow = !pow; this.textContent = 'Power: ' + (pow ? 'ON' : 'OFF'); this.classList.toggle('on', !pow); $('frd').innerHTML = pow ? 'Power back: the electrons never left. The data survived: flash is <b>non-volatile</b>.' : 'Power off. The floating gate is completely surrounded by insulator, so the electrons have nowhere to go. They stay for years.'; draw(); };
$('cy').onclick = function () { cyc += 1000; $('frd').innerHTML = 'Simulated 1000 more erase/program cycles. Each one damages the tunnel oxide a little. SSD controllers spread writes over all blocks (<b>wear levelling</b>) so no single block wears out early.'; draw(); };
$('ty').onchange = function () { draw(); };
draw();
<\/script>`,
        explain: `
          <details>
            <summary>How a floating gate stores a bit</summary>
            <p>A flash cell is a transistor with an extra gate sandwiched in insulator. Electrons on that <strong>floating gate</strong> repel the channel underneath, so it takes a higher voltage to switch the transistor on. A read applies a medium voltage: no electrons means it conducts (1), trapped electrons mean it stays off (0).</p>
            <table>
              <tr><th>Operation</th><th>What happens</th><th>Speed</th></tr>
              <tr><td>Read</td><td>small voltage, check whether current flows</td><td>~tens of µs per page</td></tr>
              <tr><td>Program</td><td>~20 V pushes electrons in (tunnelling) → 0</td><td>~hundreds of µs</td></tr>
              <tr><td>Erase</td><td>pull electrons out of a whole block → all 1s</td><td>~milliseconds</td></tr>
            </table>
            <p><strong>Multi-level cells.</strong> TLC stores 3 bits per cell by trapping 8 different <em>amounts</em> of charge, and QLC uses 16 levels for 4 bits. That is denser and cheaper, but the levels sit closer together, so the cell tolerates fewer write cycles.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li><strong>Program</strong>, then <strong>Read</strong>: 0. <strong>Erase</strong>, then Read: 1.</li>
              <li>Program, switch <strong>Power</strong> off, then back on, then Read. It is still 0: non-volatile.</li>
              <li>Choose <strong>QLC</strong> and click <strong>Run 1000 cycles</strong>. Now Program: the worn cell misbehaves. Switch to SLC to see how much longer single-bit cells last.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'The memory hierarchy: how long does the CPU wait?',
        code: `<style>
  .mh { font:14px system-ui; color:#1f2330; }
  .mh table { border-collapse:collapse; width:100%; max-width:940px; }
  .mh td, .mh th { padding:5px 8px; border-bottom:1px solid #eef0f5; text-align:left; font-size:13px; }
  .mh th { font-size:12px; color:#64748b; }
  .mh tr.l { cursor:pointer; } .mh tr.l:hover { background:#f8fafc; } .mh tr.sel { background:#fff7ed; }
  .mh .bar { height:14px; border-radius:7px; }
  .mh .tg button { padding:4px 11px; border-radius:8px; border:1px solid #c7cede; background:#fff; cursor:pointer; font-weight:600; margin:0 4px 8px 0; }
  .mh .tg button.on { background:#0f766e; color:#fff; border-color:#0f766e; }
  .mh #det { margin-top:8px; padding:8px 12px; background:#f1f5f9; border-radius:8px; min-height:40px; font-size:13.5px; max-width:916px; }
</style>
<div class="mh">
  <div class="tg">Show latency as: <button id="u0" class="on">real time</button><button id="u1">CPU cycles (4 GHz)</button><button id="u2">human scale (1 cycle = 1 second)</button></div>
  <table id="t"></table>
  <div id="det">Click a row for details.</div>
</div>
<script>
var L = [
  ['Register', 'flip-flops', '~1 KB per core', 0.25, '#16a34a', 'Inside the execution units. Read and written in a single cycle.'],
  ['L1 cache', 'SRAM', '32–64 KB per core', 1, '#22c55e', 'About 4 cycles. Split into instruction and data caches, right next to the core.'],
  ['L2 cache', 'SRAM', '1–2 MB per core', 3.5, '#84cc16', 'Roughly 12–16 cycles.'],
  ['L3 cache', 'SRAM', '8–64 MB shared', 12, '#eab308', 'Shared by all cores, roughly 40–60 cycles.'],
  ['Main memory', 'DRAM (DDR5)', '16–64 GB', 90, '#f97316', 'Leaves the CPU chip: memory controller → DIMM → row activate, column read. ~80–100 ns.'],
  ['NVMe SSD', 'NAND flash', '1–4 TB', 60000, '#ef4444', 'Random read ~50–100 µs through the PCIe bus and the SSD controller.'],
  ['Hard disk', 'magnetic platter', '4–20 TB', 8000000, '#991b1b', 'Mechanical: wait for the head to move and the platter to spin round, ~5–10 ms.'],
];
var unit = 0, sel = -1;
function fmt(ns) {
  if (unit === 1) { var c = ns * 4; return c < 10 ? c.toFixed(0) + ' cycle' + (c === 1 ? '' : 's') : Math.round(c).toLocaleString() + ' cycles'; }
  if (unit === 2) { var s = ns * 4; if (s < 120) return s.toFixed(0) + ' s'; if (s < 7200) return (s / 60).toFixed(0) + ' min'; if (s < 172800) return (s / 3600).toFixed(1) + ' hours'; if (s < 3e7) return (s / 86400).toFixed(1) + ' days'; return (s / 3.15e7).toFixed(1) + ' years'; }
  if (ns < 1000) return ns + ' ns'; if (ns < 1e6) return (ns / 1000) + ' µs'; return (ns / 1e6) + ' ms';
}
function draw() {
  var max = Math.log10(L[L.length - 1][3] / 0.2);
  var h = '<tr><th>Level</th><th>Technology</th><th>Typical size</th><th>Latency</th><th style="width:40%">(log scale)</th></tr>';
  L.forEach(function (r, i) {
    var w = Math.max(2, Math.log10(r[3] / 0.2) / max * 100);
    h += '<tr class="l ' + (i === sel ? 'sel' : '') + '" data-i="' + i + '"><td><b>' + r[0] + '</b></td><td>' + r[1] + '</td><td>' + r[2] + '</td><td><b>' + fmt(r[3]) + '</b></td><td><div class="bar" style="width:' + w + '%;background:' + r[4] + '"></div></td></tr>';
  });
  document.getElementById('t').innerHTML = h;
  document.querySelectorAll('tr.l').forEach(function (tr) { tr.onclick = function () { sel = +tr.dataset.i; var r = L[sel]; document.getElementById('det').innerHTML = '<b>' + r[0] + '</b> (' + r[1] + '): ' + r[5] + (r[3] < 1 ? ' About <b>' + Math.round(1 / r[3]) + '× faster</b> than L1.' : r[3] === 1 ? ' (This is the reference row.)' : ' Compared with L1, it is <b>' + Math.round(r[3]).toLocaleString() + '×</b> slower.'); draw(); }; });
}
[0, 1, 2].forEach(function (u) { document.getElementById('u' + u).onclick = function () { unit = u; [0, 1, 2].forEach(function (k) { document.getElementById('u' + k).classList.toggle('on', k === u); }); draw(); }; });
draw();
<\/script>`,
        explain: `
          <details>
            <summary>Why the hierarchy exists</summary>
            <p>Fast memory is expensive and has to sit physically close to the core, so there can't be much of it. Each level down is roughly 10× bigger and 3–10× slower. Programs mostly reuse the same data and walk through memory in order (<em>locality</em>). So keeping recently used data in the small, fast SRAM caches means the CPU usually finds what it needs in L1, and only rarely waits the ~100 ns for DRAM.</p>
            <p>Click <strong>human scale</strong>: if one CPU cycle took 1 second, an L1 hit takes 4 s, a DRAM access about 6 minutes, an SSD read about 3 days, and a hard-disk seek about a year. That's why "cache-friendly" code (arrays walked in order) can be many times faster than code that jumps around memory.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Switch between the three units and compare the L1 and Main memory rows.</li>
              <li>Click each row for what is going on at that level. The numbers are typical round figures for a modern desktop CPU. Exact values vary by chip.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Why does DRAM need refreshing?', options: ['Its transistors wear out', 'Each bit is charge on a tiny capacitor that leaks away within milliseconds', 'To keep the clock running', 'Because reads are slow'], answer: 1, why: 'The capacitor charge leaks, so every row is read and rewritten periodically (~64 ms, less when hot).' },
      { q: 'Which memory technology keeps its data with the power off?', options: ['SRAM', 'DRAM', 'NAND flash', 'CPU registers'], answer: 2, why: 'Electrons trapped on the insulated floating gate stay put without power. SRAM and DRAM are volatile.' },
      { q: 'CPU caches (L1/L2/L3) are built from…', options: ['DRAM', 'SRAM (6-transistor latch cells)', 'Flash', 'Magnetic cells'], answer: 1, why: 'SRAM is fast and needs no refresh, but its 6 transistors per bit make it expensive, so it is used for small caches.' },
      { q: 'Why is DRAM cheaper per bit than SRAM?', options: ['It uses fewer wires', 'A DRAM cell is 1 transistor + 1 capacitor vs 6 transistors for SRAM', 'It is made of plastic', 'It runs slower'], answer: 1, why: 'A smaller cell means more bits per mm² of silicon.' },
      { q: 'What is Rowhammer?', options: ['A DRAM refresh standard', 'Repeatedly accessing a DRAM row can flip bits in neighbouring rows, which is exploitable', 'A flash wear-levelling algorithm', 'A cache replacement policy'], answer: 1, why: 'Tiny, densely packed DRAM cells disturb their neighbours. Shown in 2014 and exploited by Google Project Zero in 2015.' },
    ],
    exercise: {
      task: `<p>For each part of a real computer, pick the storage technology it is built from. Use the dropdowns in the box below, then click <strong>✔ Check</strong>.</p>`,
      hint: 'Inside the CPU core: flip-flops. Caches: SRAM. Anything called "RAM", DDR or GDDR: DRAM. Anything that keeps data with the power off (SSD, USB stick, firmware chip, phone storage): flash.',
      starter: `<style>
  .mx { font:14px system-ui; color:#1f2330; }
  .mx table { border-collapse:collapse; }
  .mx td { padding:5px 10px; border-bottom:1px solid #eef0f5; }
  .mx select { padding:4px; border-radius:6px; border:1px solid #c7cede; font-size:13.5px; }
  .mx td.bad select { border-color:#ef4444; background:#fee2e2; }
  .mx td.ok select { border-color:#22c55e; background:#dcfce7; }
  .mx button { margin-top:10px; padding:6px 14px; border-radius:7px; border:1px solid #16a34a; background:#16a34a; color:#fff; font-weight:700; cursor:pointer; }
</style>
<div class="mx"><table id="t"></table><button id="chk">✔ Check</button><div class="circ-result" id="res"></div></div>
<script>
var PRE = {};
var ITEMS = [
  ['RAX register inside the CPU core', 'ff'],
  ['L1 data cache (48 KB)', 'sram'],
  ['L3 cache (32 MB, shared by cores)', 'sram'],
  ['32 GB DDR5 memory sticks', 'dram'],
  ['GDDR6 memory on a graphics card', 'dram'],
  ['2 TB NVMe SSD', 'flash'],
  ['USB stick / SD card', 'flash'],
  ['UEFI / BIOS firmware chip on the motherboard', 'flash'],
];
var OPT = [['', '— choose —'], ['ff', 'Flip-flops / latches'], ['sram', 'SRAM (6T cells)'], ['dram', 'DRAM (1T1C, refreshed)'], ['flash', 'Flash (floating gate)']];
document.getElementById('t').innerHTML = ITEMS.map(function (it, i) {
  return '<tr><td>' + it[0] + '</td><td id="c' + i + '"><select id="s' + i + '">' + OPT.map(function (o) { return '<option value="' + o[0] + '"' + (PRE[i] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td></tr>';
}).join('');
document.getElementById('chk').onclick = function () {
  var bad = 0, empty = 0;
  ITEMS.forEach(function (it, i) { var v = document.getElementById('s' + i).value; if (!v) empty++; var ok = v === it[1]; if (!ok) bad++; document.getElementById('c' + i).className = v ? (ok ? 'ok' : 'bad') : ''; });
  var r = document.getElementById('res');
  if (!bad) { r.className = 'circ-result ok'; r.innerHTML = '✅ All 8 correct! Fast and small near the core (flip-flops, SRAM), big and refreshed in the middle (DRAM), persistent at the bottom (flash).'; console.log('✅ All 8 correct'); }
  else { r.className = 'circ-result bad'; r.innerHTML = '❌ ' + bad + ' of 8 not right yet' + (empty ? ' (' + empty + ' still unchosen)' : '') + '. Red rows are wrong.'; console.log('❌ ' + bad + ' wrong'); }
};
<\/script>`,
      solution: `<style>
  .mx { font:14px system-ui; color:#1f2330; }
  .mx table { border-collapse:collapse; }
  .mx td { padding:5px 10px; border-bottom:1px solid #eef0f5; }
  .mx select { padding:4px; border-radius:6px; border:1px solid #c7cede; font-size:13.5px; }
  .mx td.bad select { border-color:#ef4444; background:#fee2e2; }
  .mx td.ok select { border-color:#22c55e; background:#dcfce7; }
  .mx button { margin-top:10px; padding:6px 14px; border-radius:7px; border:1px solid #16a34a; background:#16a34a; color:#fff; font-weight:700; cursor:pointer; }
</style>
<div class="mx"><table id="t"></table><button id="chk">✔ Check</button><div class="circ-result" id="res"></div></div>
<script>
var PRE = { 0: 'ff', 1: 'sram', 2: 'sram', 3: 'dram', 4: 'dram', 5: 'flash', 6: 'flash', 7: 'flash' };
var ITEMS = [
  ['RAX register inside the CPU core', 'ff'],
  ['L1 data cache (48 KB)', 'sram'],
  ['L3 cache (32 MB, shared by cores)', 'sram'],
  ['32 GB DDR5 memory sticks', 'dram'],
  ['GDDR6 memory on a graphics card', 'dram'],
  ['2 TB NVMe SSD', 'flash'],
  ['USB stick / SD card', 'flash'],
  ['UEFI / BIOS firmware chip on the motherboard', 'flash'],
];
var OPT = [['', '— choose —'], ['ff', 'Flip-flops / latches'], ['sram', 'SRAM (6T cells)'], ['dram', 'DRAM (1T1C, refreshed)'], ['flash', 'Flash (floating gate)']];
document.getElementById('t').innerHTML = ITEMS.map(function (it, i) {
  return '<tr><td>' + it[0] + '</td><td id="c' + i + '"><select id="s' + i + '">' + OPT.map(function (o) { return '<option value="' + o[0] + '"' + (PRE[i] === o[0] ? ' selected' : '') + '>' + o[1] + '</option>'; }).join('') + '</select></td></tr>';
}).join('');
document.getElementById('chk').onclick = function () {
  var bad = 0, empty = 0;
  ITEMS.forEach(function (it, i) { var v = document.getElementById('s' + i).value; if (!v) empty++; var ok = v === it[1]; if (!ok) bad++; document.getElementById('c' + i).className = v ? (ok ? 'ok' : 'bad') : ''; });
  var r = document.getElementById('res');
  if (!bad) { r.className = 'circ-result ok'; r.innerHTML = '✅ All 8 correct! Fast and small near the core (flip-flops, SRAM), big and refreshed in the middle (DRAM), persistent at the bottom (flash).'; console.log('✅ All 8 correct'); }
  else { r.className = 'circ-result bad'; r.innerHTML = '❌ ' + bad + ' of 8 not right yet' + (empty ? ' (' + empty + ' still unchosen)' : '') + '. Red rows are wrong.'; console.log('❌ ' + bad + ' wrong'); }
};
<\/script>`,
    },
  },
);
