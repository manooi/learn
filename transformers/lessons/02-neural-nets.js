// Section: Neural Networks
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------
  {
    id: 'neuron',
    section: 'Neural Networks',
    title: 'A Single Neuron',
    explain: `
      <p>A <strong>neuron</strong> (or "unit") is the smallest building block of a neural network. Despite the biological name, it's three lines of arithmetic:</p>
      <pre><code>z = w₁·x₁ + w₂·x₂ + … + wₙ·xₙ + b     // ① weighted sum = dot product w · x, plus bias
a = f(z)                              // ② activation function
output a</code></pre>
      <ul>
        <li>The <strong>weights</strong> <code>w</code> say how much each input matters, and whether it pushes the output up (positive weight) or down (negative weight).</li>
        <li>The <strong>bias</strong> <code>b</code> shifts the threshold: how much total input is needed before the neuron "fires".</li>
        <li>The <strong>activation</strong> <code>f</code> bends the result. For example, sigmoid squashes <code>z</code> into (0, 1), which you can read as a "yes-probability".</li>
      </ul>
      <p>You already know part ①. It's the linear model <code>w · x + b</code> from the ML Foundations section. The activation is the only new thing, and it's what makes stacking neurons powerful (next lesson).</p>
      <h3>What one neuron can decide</h3>
      <p>With 2 inputs, <code>w₁x₁ + w₂x₂ + b = 0</code> is a <strong>straight line</strong> in the (x₁, x₂) plane. The neuron says "high" on one side and "low" on the other. So a single neuron is a <strong>linear classifier</strong>. It can do AND and OR, but famously <strong>not XOR</strong>: no single straight line separates XOR's classes. That limitation is why we need <em>layers</em> of neurons.</p>
      <div class="tip">In a transformer you almost never see a lone neuron. You see thousands of them side by side as one matrix multiply (a <em>layer</em>). But every output number of every layer is one of these: a dot product, plus a bias, often followed by an activation.</div>
    `,
    examples: [
      {
        title: 'Play with a 2-input neuron',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .grid { display: grid; grid-template-columns: 90px 150px 44px; gap: 2px 6px; align-items: center; }
    .wrap { display: flex; gap: 14px; flex-wrap: wrap; align-items: flex-start; }
    .out { font-size: 16px; font-weight: 700; }
    canvas { border: 1px solid #ccd; border-radius: 4px; }
  </style>
  <div style="color:#555;margin-bottom:6px">Move the sliders. Left: the neuron's arithmetic.
    Right: its output for every (x₁, x₂). The black dot is your current input and the dashed line is where z = 0.</div>
  <div class="wrap">
    <div>
      <div class="grid" id="ctl"></div>
      <div style="margin:6px 0">activation
        <select id="act">
          <option value="sigmoid">sigmoid</option>
          <option value="relu">ReLU</option>
          <option value="none">none (linear)</option>
        </select></div>
      <svg id="d" width="300" height="150" viewBox="0 0 300 150"></svg>
      <div class="out" id="out"></div>
    </div>
    <div>
      <canvas id="c" width="220" height="220"></canvas>
      <div style="font-size:12px;color:#555">x₁ →  (−2 … 2), x₂ ↑.  dark = high output</div>
    </div>
  </div>
</div>
<script>
  const params = [
    ['x1', 'x₁ (input)', -2, 2, 1],
    ['x2', 'x₂ (input)', -2, 2, 0.5],
    ['w1', 'w₁ (weight)', -3, 3, 1.5],
    ['w2', 'w₂ (weight)', -3, 3, -1],
    ['b', 'b (bias)', -3, 3, 0.5],
  ];
  const ctl = document.getElementById('ctl');
  const val = {};
  for (const [k, label, min, max, v] of params) {
    ctl.insertAdjacentHTML('beforeend', '<span>' + label + '</span><input id="' + k +
      '" type="range" min="' + min + '" max="' + max + '" step="0.1" value="' + v +
      '"><b id="' + k + 'v"></b>');
  }
  const acts = {
    sigmoid: z => 1 / (1 + Math.exp(-z)),
    relu: z => Math.max(0, z),
    none: z => z,
  };
  const f = n => n.toFixed(2);

  function draw() {
    for (const [k] of params) {
      val[k] = +document.getElementById(k).value;
      document.getElementById(k + 'v').textContent = val[k].toFixed(1);
    }
    const act = acts[document.getElementById('act').value];
    const { x1, x2, w1, w2, b } = val;
    const z = w1 * x1 + w2 * x2 + b;
    const a = act(z);
    const col = w => (w >= 0 ? '#2b8a3e' : '#c92a2a');
    let s = '';
    s += '<line x1="40" y1="35" x2="170" y2="75" stroke="' + col(w1) + '" stroke-width="' +
      (1 + Math.abs(w1) * 1.5) + '"/>';
    s += '<line x1="40" y1="115" x2="170" y2="75" stroke="' + col(w2) + '" stroke-width="' +
      (1 + Math.abs(w2) * 1.5) + '"/>';
    s += '<line x1="195" y1="75" x2="260" y2="75" stroke="#555" stroke-width="2"/>';
    s += '<circle cx="30" cy="35" r="18" fill="#e7f5ff" stroke="#1971c2"/>';
    s += '<circle cx="30" cy="115" r="18" fill="#e7f5ff" stroke="#1971c2"/>';
    s += '<text x="30" y="39" text-anchor="middle" font-size="11">' + f(x1) + '</text>';
    s += '<text x="30" y="119" text-anchor="middle" font-size="11">' + f(x2) + '</text>';
    s += '<text x="100" y="40" font-size="11" fill="' + col(w1) + '">×' + f(w1) + '</text>';
    s += '<text x="100" y="118" font-size="11" fill="' + col(w2) + '">×' + f(w2) + '</text>';
    s += '<circle cx="185" cy="75" r="24" fill="#fff4e6" stroke="#e8590c"/>';
    s += '<text x="185" y="72" text-anchor="middle" font-size="10">Σ + b</text>';
    s += '<text x="185" y="85" text-anchor="middle" font-size="10">z=' + f(z) + '</text>';
    s += '<text x="228" y="68" text-anchor="middle" font-size="10">f(z)</text>';
    s += '<rect x="258" y="60" width="40" height="30" rx="4" fill="#f3f0ff" stroke="#7048e8"/>';
    s += '<text x="278" y="80" text-anchor="middle" font-size="11">' + f(a) + '</text>';
    document.getElementById('d').innerHTML = s;
    document.getElementById('out').textContent =
      'z = ' + f(w1) + '·' + f(x1) + ' + ' + f(w2) + '·' + f(x2) + ' + ' + f(b) + ' = ' + f(z) +
      '   →   a = ' + f(a);

    // heatmap of the output over the input plane
    const c = document.getElementById('c');
    const g = c.getContext('2d');
    if (!g) return;
    const N = 44;
    const cell = c.width / N;
    const outs = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const px = -2 + 4 * (i + 0.5) / N;
        const py = 2 - 4 * (j + 0.5) / N;
        outs.push([i, j, act(w1 * px + w2 * py + b)]);
      }
    }
    const lo = Math.min(...outs.map(o => o[2]));
    const hi = Math.max(...outs.map(o => o[2]));
    for (const [i, j, o] of outs) {
      const t = hi > lo ? (o - lo) / (hi - lo) : 0.5;
      const l = Math.round(95 - t * 60);
      g.fillStyle = 'hsl(265, 60%, ' + l + '%)';
      g.fillRect(i * cell, j * cell, cell + 1, cell + 1);
    }
    const P = (x, y) => [(x + 2) / 4 * c.width, (2 - y) / 4 * c.height];
    // boundary z = 0: w1*x + w2*y + b = 0
    g.setLineDash([5, 4]);
    g.strokeStyle = '#000';
    g.beginPath();
    if (Math.abs(w2) > 1e-6) {
      const [ax, ay] = P(-2, (-b - w1 * -2) / w2);
      const [bx, by] = P(2, (-b - w1 * 2) / w2);
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
    } else if (Math.abs(w1) > 1e-6) {
      const [ax, ay] = P(-b / w1, 2);
      const [bx, by] = P(-b / w1, -2);
      g.moveTo(ax, ay);
      g.lineTo(bx, by);
    }
    g.stroke();
    g.setLineDash([]);
    const [dx, dy] = P(x1, x2);
    g.fillStyle = '#000';
    g.beginPath();
    g.arc(dx, dy, 5, 0, Math.PI * 2);
    g.fill();
  }
  ctl.addEventListener('input', draw);
  document.getElementById('act').onchange = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Move <b>x₁</b> and <b>x₂</b>: the black dot moves on the map, and the output changes as the dot crosses the dashed line.</li>
              <li>Move <b>w₁</b> or <b>w₂</b>: the dashed line <em>rotates</em>. The weights set the direction the neuron "listens" to.</li>
              <li>Move <b>b</b>: the line <em>slides</em> without rotating. The bias sets the threshold.</li>
              <li>Switch the activation to <b>none</b>: the map becomes a plain linear ramp. With <b>ReLU</b>, everything on the negative side of the line is exactly 0 (flat white).</li>
            </ul>
            <div class="tip">Whatever you do, the boundary stays a <strong>straight line</strong>. One neuron can only split the plane in two with a line. Curved boundaries need several neurons in layers.</div>
          </details>
        `,
      },
      {
        title: 'A neuron that computes AND',
        lang: 'js',
        code: `const sigmoid = z => 1 / (1 + Math.exp(-z));

function neuron(x, w, b) {
  let z = b;
  for (let i = 0; i < x.length; i++) z += w[i] * x[i]; // ① weighted sum + bias
  return sigmoid(z); // ② activation
}

// Hand-picked weights: fires only when BOTH inputs are 1
const w = [5, 5];
const b = -7.5;

for (const x of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  const z = w[0] * x[0] + w[1] * x[1] + b;
  const a = neuron(x, w, b);
  console.log('x=' + JSON.stringify(x) + ' z=' + z.toFixed(1) + ' output=' + a.toFixed(4) +
    ' -> ' + (a > 0.5 ? 1 : 0));
}`,
      },
    ],
    quiz: [
      {
        q: 'Neuron with <code>w = [2, -1]</code>, <code>b = 1</code>, ReLU, input <code>x = [1, 3]</code>. Output?',
        options: ['0', '1', '2', '-0'],
        answer: 0,
        why: 'z = 2·1 + (-1)·3 + 1 = 0, and ReLU(0) = 0.',
      },
      {
        q: 'What does changing only the bias do to a 2-input neuron\'s decision line?',
        options: ['Rotates it', 'Shifts it parallel to itself', 'Makes it curved', 'Nothing'],
        answer: 1,
        why: 'The line is <code>w·x + b = 0</code>. Changing <code>b</code> moves it without changing its direction, which the weights control.',
      },
      {
        q: 'Why can\'t a single neuron compute XOR?',
        options: [
          'XOR needs more than 2 inputs',
          'A single neuron\'s decision boundary is a straight line, and XOR\'s classes aren\'t linearly separable',
          'Sigmoid can\'t output 0',
          'It can, with a big enough bias',
        ],
        answer: 1,
        why: '(0,1) and (1,0) must be "1", and (0,0) and (1,1) must be "0". They sit on opposite diagonals, so no straight line separates them.',
      },
      {
        q: 'The weighted sum inside a neuron is the same operation as…',
        options: ['A dot product w · x (plus b)', 'A matrix inverse', 'Sorting the inputs', 'Softmax'],
        answer: 0,
        why: 'Σ wᵢxᵢ is exactly the dot product from the Vectors lesson.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Change <code>w</code> and <code>b</code> so the neuron computes <strong>OR</strong>: output &gt; 0.5 when at least one input is 1. Keep the sigmoid activation. All four rows should print <code>✓</code>.</p>`,
      starter: `const sigmoid = z => 1 / (1 + Math.exp(-z));

function neuron(x, w, b) {
  let z = b;
  for (let i = 0; i < x.length; i++) z += w[i] * x[i];
  return sigmoid(z);
}

// TODO: pick weights and bias for OR (these are the AND values)
const w = [5, 5];
const b = -7.5;

const target = { '0,0': 0, '0,1': 1, '1,0': 1, '1,1': 1 };
for (const x of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  const a = neuron(x, w, b);
  const pred = a > 0.5 ? 1 : 0;
  const ok = pred === target[x.join(',')];
  console.log(JSON.stringify(x), a.toFixed(4), pred, ok ? '✓' : '✗');
}`,
      hint: 'For OR, one active input (z = 5 + b) should already be positive, but zero active inputs (z = b) must be negative. Any b between -5 and 0 works, e.g. -2.5.',
      solution: `const sigmoid = z => 1 / (1 + Math.exp(-z));

function neuron(x, w, b) {
  let z = b;
  for (let i = 0; i < x.length; i++) z += w[i] * x[i];
  return sigmoid(z);
}

// OR: a single active input is enough to cross 0
const w = [5, 5];
const b = -2.5;

const target = { '0,0': 0, '0,1': 1, '1,0': 1, '1,1': 1 };
for (const x of [[0, 0], [0, 1], [1, 0], [1, 1]]) {
  const a = neuron(x, w, b);
  const pred = a > 0.5 ? 1 : 0;
  const ok = pred === target[x.join(',')];
  console.log(JSON.stringify(x), a.toFixed(4), pred, ok ? '✓' : '✗');
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'activations',
    section: 'Neural Networks',
    title: 'Activation Functions',
    explain: `
      <p>The activation <code>f(z)</code> is applied to each neuron's weighted sum. It looks like a detail, but <strong>without it, deep networks would be pointless</strong>.</p>
      <h3>Why nonlinearity matters</h3>
      <p>A linear layer computes <code>W x</code>. Stack two of them: <code>W₂ (W₁ x) = (W₂ W₁) x</code>. That's just <em>one</em> linear layer with matrix <code>W₂W₁</code>. A hundred linear layers stacked still collapse into one: still a straight-line classifier, still unable to do XOR. Put a nonlinear <code>f</code> between the layers (<code>W₂ f(W₁ x)</code>) and the collapse no longer happens. Now the network can bend and fold space to fit curved boundaries.</p>
      <h3>The common ones</h3>
      <table>
        <tr><th>Name</th><th>Formula</th><th>Range</th><th>Where you'll see it</th></tr>
        <tr><td><strong>ReLU</strong></td><td><code>max(0, z)</code></td><td>[0, ∞)</td><td>The default for years. Cheap. The gradient is 1 or 0.</td></tr>
        <tr><td><strong>Sigmoid</strong></td><td><code>1 / (1 + e<sup>−z</sup>)</code></td><td>(0, 1)</td><td>Probabilities for yes/no outputs, and "gates" (e.g. in LSTMs and GLU variants)</td></tr>
        <tr><td><strong>Tanh</strong></td><td><code>(e<sup>z</sup> − e<sup>−z</sup>) / (e<sup>z</sup> + e<sup>−z</sup>)</code></td><td>(−1, 1)</td><td>Older RNNs. Zero-centered sigmoid: <code>tanh(z) = 2·sigmoid(2z) − 1</code></td></tr>
        <tr><td><strong>GELU</strong></td><td><code>z · Φ(z)</code> (Φ = standard normal CDF)</td><td>≈ [−0.17, ∞)</td><td><strong>GPT-2, BERT</strong> and many transformer feed-forward layers. A smooth ReLU.</td></tr>
      </table>
      <p>A common GELU approximation (used in GPT-2): <code>0.5·z·(1 + tanh(√(2/π)·(z + 0.044715·z³)))</code>. Many newer LLMs (e.g. Llama) use <strong>SwiGLU</strong>, a gated variant built from <code>SiLU(z) = z·sigmoid(z)</code>. You'll meet the transformer's feed-forward block later.</p>
      <div class="warn"><strong>Saturation:</strong> sigmoid and tanh flatten out for large |z|, so their slope → 0. Gradients flowing back through many of them shrink toward zero (the <em>vanishing gradient</em> problem). ReLU and GELU don't saturate for positive inputs, which is a big reason they won for deep networks.</div>
    `,
    examples: [
      {
        title: 'Plot the activations (and their slopes)',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    table { border-collapse: collapse; font: 12px ui-monospace, monospace; }
    td, th { border: 1px solid #ddd; padding: 2px 8px; text-align: right; }
  </style>
  <div style="color:#555">Toggle functions, drag <b>z</b> to read exact values, and tick
    <b>show slope</b> to see each function's derivative (what backprop multiplies by).</div>
  <div class="row" id="toggles"></div>
  <div class="row">
    <label>z = <input id="z" type="range" min="-4" max="4" step="0.05" value="1"> <b id="zv"></b></label>
    <label><input id="deriv" type="checkbox"> show slope f'(z) instead</label>
  </div>
  <div class="row" style="align-items:flex-start">
    <svg id="s" width="420" height="300" viewBox="0 0 420 300"></svg>
    <table id="tbl"></table>
  </div>
</div>
<script>
  // erf approximation (Abramowitz & Stegun 7.1.26, error < 1.5e-7)
  function erf(x) {
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x);
    const t = 1 / (1 + 0.3275911 * x);
    const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t +
      0.254829592) * t * Math.exp(-x * x);
    return sign * y;
  }
  const sig = z => 1 / (1 + Math.exp(-z));
  const fns = [
    { name: 'ReLU', color: '#e8590c', f: z => Math.max(0, z), d: z => (z > 0 ? 1 : 0) },
    { name: 'sigmoid', color: '#1971c2', f: sig, d: z => sig(z) * (1 - sig(z)) },
    { name: 'tanh', color: '#2b8a3e', f: Math.tanh, d: z => 1 - Math.tanh(z) ** 2 },
    {
      name: 'GELU', color: '#9c36b5',
      f: z => 0.5 * z * (1 + erf(z / Math.SQRT2)),
      d: z => 0.5 * (1 + erf(z / Math.SQRT2)) + z * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI),
    },
  ];
  const on = { ReLU: true, sigmoid: true, tanh: false, GELU: true };
  const tg = document.getElementById('toggles');
  for (const fn of fns) {
    tg.insertAdjacentHTML('beforeend', '<label style="color:' + fn.color +
      ';font-weight:600"><input type="checkbox" data-n="' + fn.name + '"' +
      (on[fn.name] ? ' checked' : '') + '> ' + fn.name + '</label>');
  }
  tg.addEventListener('change', e => {
    on[e.target.dataset.n] = e.target.checked;
    draw();
  });
  const X = z => 20 + (z + 4) * 47.5;
  const Y = v => 170 - v * 40; // v in [-1.5, 4]

  function draw() {
    const z0 = +document.getElementById('z').value;
    const der = document.getElementById('deriv').checked;
    document.getElementById('zv').textContent = z0.toFixed(2);
    let s = '<line x1="20" y1="' + Y(0) + '" x2="400" y2="' + Y(0) + '" stroke="#999"/>' +
      '<line x1="' + X(0) + '" y1="5" x2="' + X(0) + '" y2="295" stroke="#999"/>';
    for (let z = -4; z <= 4; z++) {
      s += '<text x="' + X(z) + '" y="' + (Y(0) + 13) + '" font-size="10" text-anchor="middle">' +
        z + '</text>';
    }
    for (const v of [-1, 1, 2, 3, 4]) {
      s += '<line x1="' + (X(0) - 3) + '" y1="' + Y(v) + '" x2="' + (X(0) + 3) + '" y2="' + Y(v) +
        '" stroke="#999"/><text x="' + (X(0) - 6) + '" y="' + (Y(v) + 3) +
        '" font-size="10" text-anchor="end">' + v + '</text>';
    }
    let t = '<tr><th>fn</th><th>' + (der ? "f'(z)" : 'f(z)') + '</th></tr>';
    for (const fn of fns) {
      if (!on[fn.name]) continue;
      const g = der ? fn.d : fn.f;
      let d = '';
      for (let z = -4; z <= 4.0001; z += 0.04) {
        d += (d ? 'L' : 'M') + X(z).toFixed(1) + ' ' + Math.max(2, Y(g(z))).toFixed(1);
      }
      s += '<path d="' + d + '" fill="none" stroke="' + fn.color + '" stroke-width="2.5"/>';
      s += '<circle cx="' + X(z0) + '" cy="' + Math.max(2, Y(g(z0))) + '" r="4.5" fill="' +
        fn.color + '"/>';
      t += '<tr><td style="color:' + fn.color + '">' + fn.name + '</td><td>' + g(z0).toFixed(4) +
        '</td></tr>';
    }
    s += '<line x1="' + X(z0) + '" y1="5" x2="' + X(z0) + '" y2="295" stroke="#bbb" stroke-dasharray="3 3"/>';
    document.getElementById('s').innerHTML = s;
    document.getElementById('tbl').innerHTML = t;
  }
  document.getElementById('z').oninput = draw;
  document.getElementById('deriv').onchange = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Drag <b>z</b> to −1: ReLU gives exactly 0, while GELU gives a small negative value (≈ −0.159). GELU lets a little signal through for slightly negative inputs.</li>
              <li>Tick <b>show slope</b> and drag <b>z</b> to 4: the sigmoid slope is ≈ 0.018 (and it's at most 0.25, at z = 0). Multiply 10 of those together during backprop and the gradient practically vanishes. ReLU's slope is 1 for every positive z.</li>
              <li>Turn on <b>tanh</b> and compare it with sigmoid: same S-shape, but centered at 0 with range (−1, 1).</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Proof: two linear layers collapse into one',
        lang: 'js',
        code: `const matvec = (W, x) => W.map(row => row.reduce((s, w, i) => s + w * x[i], 0));
const matmul = (A, B) => A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const relu = v => v.map(z => Math.max(0, z));
const show = v => '[' + v.map(n => n.toFixed(2)).join(', ') + ']';

const W1 = [[1, -2], [0.5, 1]];
const W2 = [[2, 1], [-1, 3]];

// ① the combined matrix W = W2 @ W1
const W = matmul(W2, W1);
console.log('W2 @ W1 =', JSON.stringify(W));

for (const x of [[1, 1], [2, -1], [-1, 0.5]]) {
  const twoLayers = matvec(W2, matvec(W1, x)); // ② layer by layer
  const oneLayer = matvec(W, x); // ③ single combined layer
  const withRelu = matvec(W2, relu(matvec(W1, x))); // ④ nonlinearity in between
  console.log('x=' + show(x) + '  W2(W1x)=' + show(twoLayers) + '  (W2W1)x=' + show(oneLayer) +
    '  W2 relu(W1x)=' + show(withRelu));
}
// Note: for x=[2,-1], W1x = [4, 0] has no negatives, so ReLU changes nothing there.`,
      },
    ],
    quiz: [
      { q: 'ReLU(−3) = ?', options: ['−3', '0', '3', '0.05'], answer: 1, why: 'ReLU is max(0, z), so every negative input becomes 0.' },
      {
        q: 'You stack 10 linear layers with no activation functions. The result is equivalent to…',
        options: ['A 10× more powerful model', 'A single linear layer', 'A ReLU network', 'Nothing: it can\'t be computed'],
        answer: 1,
        why: 'Products of matrices are a matrix: W₁₀…W₂W₁ is one matrix. Without nonlinearity, depth adds nothing expressive.',
      },
      { q: 'Which activation do GPT-2 and BERT use in their feed-forward layers?', options: ['Sigmoid', 'Tanh', 'GELU', 'Step function'], answer: 2, why: 'GELU, a smooth ReLU-like curve. Many newer LLMs use SwiGLU instead.' },
      {
        q: 'Why do sigmoids cause vanishing gradients in deep networks?',
        options: [
          'Their output can be negative',
          'Their slope is at most 0.25 and nearly 0 for large |z|, so multiplying many of them shrinks gradients',
          'They are not differentiable',
          'They are too expensive to compute',
        ],
        answer: 1,
        why: 'Backprop multiplies local slopes along the path. Many factors ≤ 0.25 multiply to almost 0.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement <code>relu</code>, <code>sigmoid</code> and the GPT-2 <code>gelu</code> approximation:</p>
      <pre><code>gelu(z) = 0.5 · z · (1 + tanh( √(2/π) · (z + 0.044715 · z³) ))</code></pre>
      <p>Print a table for <code>z = -2, -1, 0, 1, 2</code>. Check: <code>gelu(1) ≈ 0.8412</code>, <code>gelu(-1) ≈ -0.1588</code>, <code>sigmoid(0) = 0.5</code>.</p>`,
      starter: `function relu(z) {
  return 0; // TODO
}

function sigmoid(z) {
  return 0; // TODO
}

function gelu(z) {
  return 0; // TODO (use Math.tanh, Math.sqrt, Math.PI)
}

for (const z of [-2, -1, 0, 1, 2]) {
  console.log(
    'z=' + z +
    '  relu=' + relu(z).toFixed(4) +
    '  sigmoid=' + sigmoid(z).toFixed(4) +
    '  gelu=' + gelu(z).toFixed(4)
  );
}`,
      hint: '<code>Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3)</code> goes inside <code>Math.tanh</code>.',
      solution: `function relu(z) {
  return Math.max(0, z);
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function gelu(z) {
  const inner = Math.sqrt(2 / Math.PI) * (z + 0.044715 * z ** 3);
  return 0.5 * z * (1 + Math.tanh(inner));
}

for (const z of [-2, -1, 0, 1, 2]) {
  console.log(
    'z=' + z +
    '  relu=' + relu(z).toFixed(4) +
    '  sigmoid=' + sigmoid(z).toFixed(4) +
    '  gelu=' + gelu(z).toFixed(4)
  );
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'mlp',
    section: 'Neural Networks',
    title: 'Layers & the Forward Pass',
    explain: `
      <p>Put many neurons side by side and they form a <strong>layer</strong>. Each neuron in the layer reads the same inputs but has its own weights. Stack layers and you get a <strong>multi-layer perceptron (MLP)</strong>, also called a feed-forward network.</p>
      <pre><code>input x        (2 numbers)
  ↓  h = relu(x @ W1 + b1)    W1: (2, 3)  b1: (3)   → 3 hidden numbers
  ↓  y = h @ W2 + b2          W2: (3, 1)  b2: (1)   → 1 output
output y</code></pre>
      <p>A whole layer is <strong>one matrix multiply</strong>: column <code>j</code> of <code>W1</code> holds the weights of hidden neuron <code>j</code>. Running inputs through the layers, left to right, is the <strong>forward pass</strong>.</p>
      <h3>Shapes and batches</h3>
      <p>Put a batch of examples in the rows of a matrix <code>X</code> with shape <code>(batch, 2)</code>. Then <code>X @ W1</code> has shape <code>(batch, 3)</code>, and the same code processes all examples at once. The bias <code>b1</code> is added to every row (this is called <em>broadcasting</em>).</p>
      <pre><code>X      (4, 2)
X @ W1 (4, 2) @ (2, 3) → (4, 3)   + b1 (3) broadcast to every row
relu   (4, 3)
@ W2   (4, 3) @ (3, 1) → (4, 1)</code></pre>
      <div class="tip"><strong>Transformer connection:</strong> every transformer block contains exactly this, a 2-layer MLP called the <strong>feed-forward network (FFN)</strong>. It's applied to each token's vector independently. Shapes: <code>(tokens, d_model) @ (d_model, 4·d_model)</code> → GELU → <code>@ (4·d_model, d_model)</code>. With 12 tokens and d_model = 768, that's <code>(12, 768) → (12, 3072) → (12, 768)</code>. Rows are tokens instead of examples, but the matrix code is the same.</div>
      <p>Why does a hidden layer help? Each hidden ReLU neuron draws its own line and "folds" the space along it. The output layer combines those pieces, so the network can build curved or piecewise decision boundaries, XOR included. With enough hidden neurons, an MLP can approximate essentially any continuous function (the <em>universal approximation theorem</em>). Finding the right weights is the job of training.</p>
    `,
    examples: [
      {
        title: 'A 2-3-1 network with every number visible',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
  </style>
  <div style="color:#555">Drag the inputs and watch the numbers flow left → right. Edge color: green =
    positive weight, red = negative. Thickness = |weight|. Untick ReLU to make the hidden layer linear.</div>
  <div class="row">
    <label>x₁ <input id="x1" type="range" min="-2" max="2" step="0.5" value="1"> <b id="x1v"></b></label>
    <label>x₂ <input id="x2" type="range" min="-2" max="2" step="0.5" value="2"> <b id="x2v"></b></label>
    <label><input id="relu" type="checkbox" checked> ReLU on hidden layer</label>
  </div>
  <svg id="s" width="640" height="300" viewBox="0 0 640 300"></svg>
  <div id="eq" style="font:12px ui-monospace,monospace;white-space:pre"></div>
</div>
<script>
  // Same weights as the code example below
  const W1 = [[0.5, -1.0, 1.0], [1.0, 0.5, -0.5]]; // (2, 3)
  const b1 = [0.0, 0.5, 0.0];
  const W2 = [[1.0], [-1.0], [0.5]]; // (3, 1)
  const b2 = [0.1];
  const inPos = [[70, 100], [70, 200]];
  const hidPos = [[320, 60], [320, 150], [320, 240]];
  const outPos = [570, 150];
  const f = n => (Math.abs(n) < 0.005 ? 0 : n).toFixed(2);

  function draw() {
    const x = [+document.getElementById('x1').value, +document.getElementById('x2').value];
    const useRelu = document.getElementById('relu').checked;
    document.getElementById('x1v').textContent = x[0];
    document.getElementById('x2v').textContent = x[1];
    const z = [0, 1, 2].map(j => x[0] * W1[0][j] + x[1] * W1[1][j] + b1[j]);
    const h = z.map(v => (useRelu ? Math.max(0, v) : v));
    const y = h[0] * W2[0][0] + h[1] * W2[1][0] + h[2] * W2[2][0] + b2[0];
    const col = w => (w >= 0 ? '#2b8a3e' : '#c92a2a');
    let s = '';
    for (let i = 0; i < 2; i++) {
      for (let j = 0; j < 3; j++) {
        const w = W1[i][j];
        const [ax, ay] = inPos[i];
        const [bx, by] = hidPos[j];
        s += '<line x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' +
          col(w) + '" stroke-width="' + (1 + 2.5 * Math.abs(w)) + '" opacity="0.7"/>';
        const mx = ax + (bx - ax) * 0.3;
        const my = ay + (by - ay) * 0.3;
        s += '<text x="' + mx + '" y="' + (my - 3) + '" font-size="10" fill="' + col(w) + '">' +
          w + '</text>';
      }
    }
    for (let j = 0; j < 3; j++) {
      const w = W2[j][0];
      const [ax, ay] = hidPos[j];
      s += '<line x1="' + ax + '" y1="' + ay + '" x2="' + outPos[0] + '" y2="' + outPos[1] +
        '" stroke="' + col(w) + '" stroke-width="' + (1 + 2.5 * Math.abs(w)) + '" opacity="0.7"/>';
      s += '<text x="' + (ax + (outPos[0] - ax) * 0.55) + '" y="' +
        (ay + (outPos[1] - ay) * 0.55 - 4) + '" font-size="10" fill="' + col(w) + '">' + w + '</text>';
    }
    inPos.forEach(([cx, cy], i) => {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="26" fill="#e7f5ff" stroke="#1971c2" stroke-width="2"/>';
      s += '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="14" font-weight="700">' +
        f(x[i]) + '</text>';
      s += '<text x="' + cx + '" y="' + (cy - 32) + '" text-anchor="middle" font-size="11">x' + (i + 1) + '</text>';
    });
    hidPos.forEach(([cx, cy], j) => {
      const dead = useRelu && z[j] <= 0;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="30" fill="' + (dead ? '#f1f3f5' : '#fff4e6') +
        '" stroke="#e8590c" stroke-width="2"/>';
      s += '<text x="' + cx + '" y="' + (cy - 5) + '" text-anchor="middle" font-size="10" fill="#555">z=' +
        f(z[j]) + '</text>';
      s += '<text x="' + cx + '" y="' + (cy + 12) + '" text-anchor="middle" font-size="14" font-weight="700">' +
        f(h[j]) + '</text>';
      s += '<text x="' + (cx + 36) + '" y="' + (cy - 20) + '" font-size="10" fill="#555">b=' + b1[j] + '</text>';
    });
    s += '<circle cx="' + outPos[0] + '" cy="' + outPos[1] + '" r="32" fill="#f3f0ff" stroke="#7048e8" stroke-width="2"/>';
    s += '<text x="' + outPos[0] + '" y="' + (outPos[1] + 6) + '" text-anchor="middle" font-size="16" font-weight="700">' +
      f(y) + '</text>';
    s += '<text x="' + outPos[0] + '" y="' + (outPos[1] + 50) + '" text-anchor="middle" font-size="10" fill="#555">b=' +
      b2[0] + '</text>';
    s += '<text x="70" y="290" text-anchor="middle" font-size="11">input (2)</text>' +
      '<text x="320" y="296" text-anchor="middle" font-size="11">hidden (3)' + (useRelu ? ' + ReLU' : '') + '</text>' +
      '<text x="570" y="290" text-anchor="middle" font-size="11">output (1)</text>';
    document.getElementById('s').innerHTML = s;
    document.getElementById('eq').textContent =
      'z = x @ W1 + b1 = [' + z.map(f).join(', ') + ']\\n' +
      'h = ' + (useRelu ? 'relu(z)' : 'z') + '       = [' + h.map(f).join(', ') + ']\\n' +
      'y = h @ W2 + b2 = ' + f(h[0]) + '*1 + ' + f(h[1]) + '*(-1) + ' + f(h[2]) + '*0.5 + 0.1 = ' + f(y);
  }
  for (const id of ['x1', 'x2', 'relu']) document.getElementById(id).oninput = draw;
  document.getElementById('relu').onchange = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>At the start (x = [1, 2]) the third hidden neuron has <code>z = 1·1 + 2·(−0.5) + 0 = 0</code>, so ReLU outputs 0 and the neuron is greyed out: it contributes nothing to this input.</li>
              <li>Set <b>x₁ = −1, x₂ = 1</b>: now <code>z = [0.5, 2, −1.5]</code>, so neuron 3 switches off and <code>y = 0.5·1 + 2·(−1) + 0·0.5 + 0.1 = −1.4</code>. That's the 4th row of the code example's output below.</li>
              <li>Untick <b>ReLU</b>: negative z values pass through unchanged, and the output becomes a straight linear function of the inputs, like one big neuron.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Forward pass with matrices (a batch of 4)',
        lang: 'js',
        code: `const shape = M => '(' + M.length + ', ' + M[0].length + ')';
const fmt = M => JSON.stringify(M.map(r => r.map(v => +v.toFixed(3))));

function matmul(A, B) {
  return A.map(row =>
    B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0))
  );
}
const addBias = (M, b) => M.map(row => row.map((v, j) => v + b[j]));
const relu = M => M.map(row => row.map(v => Math.max(0, v)));

// 2 inputs -> 3 hidden (ReLU) -> 1 output
const W1 = [
  [0.5, -1.0, 1.0],
  [1.0, 0.5, -0.5],
]; // shape (2, 3)
const b1 = [0.0, 0.5, 0.0];
const W2 = [[1.0], [-1.0], [0.5]]; // shape (3, 1)
const b2 = [0.1];

// A batch of 4 examples, one per row
const X = [
  [1, 2],
  [0, 1],
  [2, 0],
  [-1, 1],
]; // shape (4, 2)

const Z1 = addBias(matmul(X, W1), b1); // ① (4,2) @ (2,3) -> (4,3)
const H = relu(Z1); // ② nonlinearity, same shape
const Y = addBias(matmul(H, W2), b2); // ③ (4,3) @ (3,1) -> (4,1)

console.log('X ', shape(X), fmt(X));
console.log('Z1', shape(Z1), fmt(Z1));
console.log('H ', shape(H), fmt(H));
console.log('Y ', shape(Y), fmt(Y));`,
      },
    ],
    quiz: [
      {
        q: 'A layer maps 64 inputs to 128 outputs. Shape of its weight matrix (using the <code>x @ W</code> convention)?',
        options: ['(128, 64)', '(64, 128)', '(64, 64)', '(1, 128)'],
        answer: 1,
        why: '<code>(batch, 64) @ (64, 128) → (batch, 128)</code>. PyTorch\'s <code>nn.Linear</code> stores it transposed, as (out, in), but the math is the same.',
      },
      {
        q: 'In <code>X @ W1 + b1</code> with X of shape (32, 10) and W1 (10, 20), what is b1\'s shape?',
        options: ['(32, 20)', '(20)', '(10)', '(32)'],
        answer: 1,
        why: 'One bias per output neuron, broadcast (added) to each of the 32 rows.',
      },
      {
        q: 'What is the "forward pass"?',
        options: [
          'Computing gradients from the loss back to the weights',
          'Running the input through the layers to produce an output',
          'Shuffling the training data',
          'Increasing the learning rate',
        ],
        answer: 1,
        why: 'Forward = input → output. The backward pass (backprop) goes the other way to compute gradients.',
      },
      {
        q: 'In a transformer\'s feed-forward network, what plays the role of the "batch" rows?',
        options: ['The vocabulary', 'The tokens in the sequence (each one processed independently)', 'The attention heads', 'The layers'],
        answer: 1,
        why: 'The FFN is applied to each token vector separately, so a (tokens, d_model) matrix goes through the same matmuls a batch would.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write <code>dense(X, W, b, act)</code>, which computes <code>act(X @ W + b)</code> for a whole batch. Then build a <strong>2 → 4 → 2</strong> network with the given weights and run the batch through it. Print the shape and values after each layer. The final shape must be <code>(3, 2)</code>.</p>`,
      starter: `const shape = M => '(' + M.length + ', ' + M[0].length + ')';
const fmt = M => JSON.stringify(M.map(r => r.map(v => +v.toFixed(2))));
const relu = v => Math.max(0, v);
const identity = v => v;

function dense(X, W, b, act) {
  // TODO: return act(X @ W + b), applying act to every element
  return X;
}

const W1 = [[1, -1, 0.5, 0], [0, 1, 0.5, -1]]; // (2, 4)
const b1 = [0, 0, -0.5, 1];
const W2 = [[1, 0], [0, 1], [1, 1], [-1, 0.5]]; // (4, 2)
const b2 = [0, 0];

const X = [[1, 0], [0, 1], [2, 2]]; // (3, 2)
const H = dense(X, W1, b1, relu);
const Y = dense(H, W2, b2, identity);
console.log('H', shape(H), fmt(H));
console.log('Y', shape(Y), fmt(Y));`,
      hint: 'For each row of X and each column j of W: <code>let z = b[j]; for (k...) z += row[k] * W[k][j]; out.push(act(z))</code>.',
      solution: `const shape = M => '(' + M.length + ', ' + M[0].length + ')';
const fmt = M => JSON.stringify(M.map(r => r.map(v => +v.toFixed(2))));
const relu = v => Math.max(0, v);
const identity = v => v;

function dense(X, W, b, act) {
  return X.map(row => {
    const out = [];
    for (let j = 0; j < W[0].length; j++) {
      let z = b[j];
      for (let k = 0; k < row.length; k++) z += row[k] * W[k][j];
      out.push(act(z));
    }
    return out;
  });
}

const W1 = [[1, -1, 0.5, 0], [0, 1, 0.5, -1]]; // (2, 4)
const b1 = [0, 0, -0.5, 1];
const W2 = [[1, 0], [0, 1], [1, 1], [-1, 0.5]]; // (4, 2)
const b2 = [0, 0];

const X = [[1, 0], [0, 1], [2, 2]]; // (3, 2)
const H = dense(X, W1, b1, relu);
const Y = dense(H, W2, b2, identity);
console.log('H', shape(H), fmt(H));
console.log('Y', shape(Y), fmt(Y));`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'softmax',
    section: 'Neural Networks',
    title: 'Softmax: Scores → Probabilities',
    explain: `
      <p>A network's last layer produces raw scores called <strong>logits</strong>: any real numbers, like <code>[2.0, 1.0, 0.1]</code>. To use cross-entropy (or to sample a token) we need a <strong>probability distribution</strong>: all values positive, summing to 1. <strong>Softmax</strong> does the conversion:</p>
      <pre><code>softmax(z)ᵢ = e^(zᵢ) / Σⱼ e^(zⱼ)</code></pre>
      <ol>
        <li><strong>Exponentiate</strong> every score: <code>e^z</code> is always positive, and bigger scores get <em>much</em> bigger (a gap of 1 in logits means a factor of e ≈ 2.72 in probability).</li>
        <li><strong>Normalize</strong>: divide by the total so the values add to 1.</li>
      </ol>
      <p>It's a "soft" version of <em>argmax</em>. The largest score gets the largest share, but the others keep some probability. Only the <strong>differences</strong> between logits matter: adding the same constant to every logit gives exactly the same output.</p>
      <h3>Temperature</h3>
      <p>Divide the logits by a temperature <code>T</code> before softmax: <code>softmax(z / T)</code>.</p>
      <ul>
        <li><code>T &lt; 1</code> → sharper, more confident (T → 0 approaches argmax, i.e. greedy decoding).</li>
        <li><code>T = 1</code> → the model's actual distribution.</li>
        <li><code>T &gt; 1</code> → flatter, more random ("creative").</li>
      </ul>
      <h3>Numerical stability</h3>
      <p><code>Math.exp(1000)</code> is <code>Infinity</code> in floating point, and <code>Infinity / Infinity = NaN</code>. Because only differences matter, we <strong>subtract the max logit first</strong>. The largest exponent becomes <code>e⁰ = 1</code> and nothing overflows. Every real implementation does this.</p>
      <div class="tip"><strong>You'll see softmax twice more in this course:</strong> (1) inside <em>attention</em>, where it turns query·key similarity scores into attention weights that sum to 1; and (2) at the output of an LLM, where it turns logits over the whole vocabulary (~50k–200k tokens) into next-token probabilities. The <code>temperature</code> knob in LLM APIs is exactly the <code>T</code> above.</div>
    `,
    examples: [
      {
        title: 'Logits → probabilities, with a temperature knob',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .cols { display: grid; grid-template-columns: 60px 150px 1fr 1fr; gap: 4px 10px; align-items: center; }
    .bar { height: 18px; border-radius: 3px; }
    .hdr { font-weight: 700; color: #444; }
    .mono { font: 12px ui-monospace, monospace; }
  </style>
  <div style="color:#555;margin-bottom:6px">The model is choosing the next word after
    "The cat sat on the …". Drag each <b>logit</b> (raw score) and the <b>temperature</b>, and watch the probabilities.</div>
  <div class="cols" id="rows"></div>
  <div style="margin:10px 0 4px">
    <label>temperature T = <input id="T" type="range" min="0.1" max="3" step="0.05" value="1">
      <b id="Tv"></b></label>
    <button id="reset">reset</button>
    <button id="shift">add +5 to all logits</button>
  </div>
  <div class="mono" id="info"></div>
</div>
<script>
  const words = ['mat', 'floor', 'sofa', 'moon', 'banana'];
  const init = [3.0, 2.0, 1.5, -1.0, -2.0];
  const colors = ['#1971c2', '#2b8a3e', '#e8590c', '#9c36b5', '#c92a2a'];
  const rows = document.getElementById('rows');
  rows.innerHTML = '<span class="hdr">token</span><span class="hdr">logit</span>' +
    '<span class="hdr">exp(z/T − max)</span><span class="hdr">probability</span>';
  words.forEach((w, i) => {
    rows.insertAdjacentHTML('beforeend',
      '<b>' + w + '</b>' +
      '<span><input type="range" id="z' + i + '" min="-6" max="10" step="0.1" value="' + init[i] +
      '" style="width:100px"> <span class="mono" id="zv' + i + '"></span></span>' +
      '<span><div class="bar" id="e' + i + '" style="background:#ced4da"></div>' +
      '<span class="mono" id="ev' + i + '"></span></span>' +
      '<span><div class="bar" id="p' + i + '" style="background:' + colors[i] + '"></div>' +
      '<span class="mono" id="pv' + i + '"></span></span>');
  });

  function softmax(z, T) {
    const s = z.map(v => v / T);
    const m = Math.max(...s);
    const e = s.map(v => Math.exp(v - m));
    const sum = e.reduce((a, b) => a + b, 0);
    return { e, p: e.map(v => v / sum), sum, m };
  }

  function draw() {
    const T = +document.getElementById('T').value;
    document.getElementById('Tv').textContent = T.toFixed(2);
    const z = words.map((_, i) => +document.getElementById('z' + i).value);
    const { e, p, sum, m } = softmax(z, T);
    words.forEach((_, i) => {
      document.getElementById('zv' + i).textContent = z[i].toFixed(1);
      document.getElementById('e' + i).style.width = (e[i] * 100) + '%';
      document.getElementById('ev' + i).textContent = e[i].toFixed(3);
      document.getElementById('p' + i).style.width = (p[i] * 100) + '%';
      document.getElementById('pv' + i).textContent = (p[i] * 100).toFixed(1) + '%';
    });
    const best = p.indexOf(Math.max(...p));
    const entropy = -p.reduce((s, q) => s + (q > 0 ? q * Math.log(q) : 0), 0);
    document.getElementById('info').textContent =
      'max(z/T) = ' + m.toFixed(2) + ' is subtracted, so the top exp is always 1.000.  Σexp = ' +
      sum.toFixed(3) + '\\nargmax (greedy pick): "' + words[best] + '"   entropy = ' +
      entropy.toFixed(3) + ' nats (0 = certain, ' + Math.log(5).toFixed(3) + ' = uniform)';
  }
  rows.addEventListener('input', draw);
  document.getElementById('T').oninput = draw;
  document.getElementById('reset').onclick = () => {
    init.forEach((v, i) => { document.getElementById('z' + i).value = v; });
    document.getElementById('T').value = 1;
    draw();
  };
  document.getElementById('shift').onclick = () => {
    words.forEach((_, i) => {
      const el = document.getElementById('z' + i);
      el.value = Math.min(10, +el.value + 5);
    });
    draw();
  };
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <b>add +5 to all logits</b>: the logits change, but the probabilities stay exactly the same. Softmax only cares about <em>differences</em>. (If a slider hits its max of 10, the differences change, and so do the probabilities.)</li>
              <li>Drag <b>T</b> down to 0.1: "mat" goes to about 100%. That's greedy decoding. Drag <b>T</b> to 3: "moon" and "banana" get real probability, which is why high-temperature text gets weird.</li>
              <li>Drag "floor" up to 3.0 so it ties with "mat": they split the probability evenly.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Softmax in code: stable version, temperature, overflow',
        lang: 'js',
        code: `function softmaxNaive(logits) {
  const exps = logits.map(z => Math.exp(z));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function softmax(logits, temperature = 1) {
  const scaled = logits.map(z => z / temperature); // ① divide by T
  const max = Math.max(...scaled); // ② find the biggest score
  const exps = scaled.map(z => Math.exp(z - max)); // ③ shift so max -> 0
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum); // ④ normalize to sum 1
}

const fmt = arr => '[' + arr.map(v => v.toFixed(3)).join(', ') + ']';

const logits = [2.0, 1.0, 0.1];
const max = Math.max(...logits);
console.log('logits      ', fmt(logits));
console.log('z - max     ', fmt(logits.map(z => z - max)));
console.log('exp(z - max)', fmt(logits.map(z => Math.exp(z - max))));
console.log('probs       ', fmt(softmax(logits)));

for (const T of [0.5, 1, 2]) {
  console.log('T=' + T + ' ->', fmt(softmax(logits, T)));
}

const big = [1000, 1001, 1002];
console.log('naive  big ->', fmt(softmaxNaive(big)));
console.log('stable big ->', fmt(softmax(big)));`,
        explain: `
          <details>
            <summary>The problem: naive softmax overflows</summary>
            <p>The textbook formula calls <code>Math.exp(z)</code> directly. Logits in real models can easily reach the hundreds, and <code>Math.exp(710)</code> is already <code>Infinity</code> in 64-bit floats (float16, whose max is 65504, overflows just past <code>e^11</code>). Then:</p>
            <pre><code>exp([1000, 1001, 1002]) = [Infinity, Infinity, Infinity]
Infinity / Infinity      = NaN</code></pre>
            <p>One NaN in the output spreads NaN into the loss, the gradients and every weight. Training is ruined.</p>
          </details>
          <details>
            <summary>Step by step: <code>softmax([2.0, 1.0, 0.1])</code> (matches the console)</summary>
            <table>
              <tr><th>Step</th><th>token 0</th><th>token 1</th><th>token 2</th><th>Note</th></tr>
              <tr><td>logits z</td><td>2.000</td><td>1.000</td><td>0.100</td><td>max = 2.0</td></tr>
              <tr><td>② z − max</td><td>0.000</td><td>−1.000</td><td>−1.900</td><td>all ≤ 0, so exp ≤ 1</td></tr>
              <tr><td>③ exp(z − max)</td><td>1.000</td><td>0.368</td><td>0.150</td><td>sum ≈ 1.518</td></tr>
              <tr><td>④ ÷ sum</td><td><b>0.659</b></td><td><b>0.242</b></td><td><b>0.099</b></td><td>sums to 1</td></tr>
            </table>
            <p>Temperature (① divides the logits first):</p>
            <table>
              <tr><th>T</th><th>z / T</th><th>probs</th><th>Effect</th></tr>
              <tr><td>0.5</td><td>[4.0, 2.0, 0.2]</td><td>[0.864, 0.117, 0.019]</td><td>gaps doubled → sharper</td></tr>
              <tr><td>1</td><td>[2.0, 1.0, 0.1]</td><td>[0.659, 0.242, 0.099]</td><td>unchanged</td></tr>
              <tr><td>2</td><td>[1.0, 0.5, 0.05]</td><td>[0.502, 0.304, 0.194]</td><td>gaps halved → flatter</td></tr>
            </table>
            <p>Big logits:</p>
            <table>
              <tr><th>Version</th><th>Output</th></tr>
              <tr><td>naive</td><td><code>[NaN, NaN, NaN]</code></td></tr>
              <tr><td>stable</td><td><code>[0.090, 0.245, 0.665]</code>. Same as <code>softmax([0, 1, 2])</code>, since only differences matter.</td></tr>
            </table>
            <p>Full console output:</p>
            <pre><code>logits       [2.000, 1.000, 0.100]
z - max      [0.000, -1.000, -1.900]
exp(z - max) [1.000, 0.368, 0.150]
probs        [0.659, 0.242, 0.099]
T=0.5 -&gt; [0.864, 0.117, 0.019]
T=1 -&gt; [0.659, 0.242, 0.099]
T=2 -&gt; [0.502, 0.304, 0.194]
naive  big -&gt; [NaN, NaN, NaN]
stable big -&gt; [0.090, 0.245, 0.665]</code></pre>
          </details>
          <details>
            <summary>Key lines explained ①②③④</summary>
            <ol>
              <li><strong>①</strong> Temperature scales the <em>gaps</em> between logits. <code>T = 0.5</code> doubles every gap, and since probability ratios are <code>e^gap</code>, the leader pulls far ahead.</li>
              <li><strong>②③</strong> Subtracting the max is mathematically free: <code>e^(z−m) / Σ e^(zⱼ−m) = (e^z · e^−m) / (Σ e^zⱼ · e^−m)</code>, and the <code>e^−m</code> cancels. Numerically, the largest exponent is now exactly 0, so no overflow. The very negative ones may underflow to 0, which is harmless.</li>
              <li><strong>④</strong> Dividing by the sum guarantees the outputs add up to 1 (up to rounding).</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Computing <code>Math.log(softmax(z)[target])</code> for the loss. If that probability underflows to 0 you get <code>-Infinity</code>. Libraries fuse the two into <strong>log-softmax</strong>: <code>log p_i = z_i − max − log(Σ e^(z_j − max))</code>, which never takes the log of 0. PyTorch's <code>F.cross_entropy</code> takes <em>logits</em> for exactly this reason. You'll implement it in the exercise.</div>
            <p>Try this: replace <code>1002</code> with <code>1010</code> in <code>big</code>. The stable version gives ≈ <code>[0.000, 0.000, 1.000]</code> because the gap is now 9–10.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: '<code>softmax([1, 1, 1, 1])</code> = ?',
        options: ['[1, 1, 1, 1]', '[0.25, 0.25, 0.25, 0.25]', '[0, 0, 0, 1]', 'NaN'],
        answer: 1,
        why: 'Equal logits give equal probabilities, and they must sum to 1.',
      },
      {
        q: 'What happens to softmax\'s output if you add 100 to every logit?',
        options: ['All probabilities increase', 'Nothing changes', 'It becomes uniform', 'The largest becomes 1'],
        answer: 1,
        why: 'The constant cancels in numerator and denominator. That\'s also why subtracting the max is safe.',
      },
      {
        q: 'Lowering the temperature from 1.0 to 0.2 makes next-token sampling…',
        options: ['More random', 'More deterministic (closer to always picking the top token)', 'Unchanged', 'Invalid'],
        answer: 1,
        why: 'Dividing by 0.2 multiplies logit gaps by 5, so the top token dominates.',
      },
      {
        q: 'Why subtract the max logit before exponentiating?',
        options: [
          'To make the output sum to 1',
          'To avoid overflow (exp of large numbers → Infinity → NaN), without changing the result',
          'To make probabilities sharper',
          'To make all logits positive',
        ],
        answer: 1,
        why: 'It\'s a pure numerical-stability trick. The math result is identical.',
      },
      {
        q: 'Where does softmax appear in a transformer?',
        options: ['Only in the tokenizer', 'In attention (scores → weights) and at the output (logits → next-token probabilities)', 'Only in the loss', 'Nowhere'],
        answer: 1,
        why: 'Both places need "turn scores into weights that sum to 1".',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>This is how LLM training loss is actually computed. Implement <code>logSoftmax(logits)</code> using the stable formula</p>
      <pre><code>log p_i = (z_i − max) − log( Σ_j e^(z_j − max) )</code></pre>
      <p>and <code>crossEntropyFromLogits(logits, target) = −logSoftmax(logits)[target]</code>. It must give a finite answer even for the huge logits in the last case. Expected output: <code>0.1967</code>, <code>2.1967</code>, and <code>0.0000</code> (the model is essentially certain and correct). The naive <code>-Math.log(softmax(...)[0])</code> would give <code>NaN</code> on the last case.</p>`,
      starter: `function logSoftmax(logits) {
  // TODO: stable log-softmax
  return logits.map(() => 0);
}

function crossEntropyFromLogits(logits, target) {
  return -logSoftmax(logits)[target];
}

const cases = [
  { logits: [3, 1, 0.5], target: 0 },
  { logits: [3, 1, 0.5], target: 1 },
  { logits: [1000, 10, -1000], target: 0 },
];
for (const c of cases) {
  const loss = crossEntropyFromLogits(c.logits, c.target);
  console.log('logits=' + JSON.stringify(c.logits) + ' target=' + c.target + ' loss=' + loss.toFixed(4));
}`,
      hint: 'Compute <code>m = Math.max(...logits)</code>, then <code>lse = Math.log(sum of Math.exp(z - m))</code>, and return <code>logits.map(z =&gt; z - m - lse)</code>.',
      solution: `function logSoftmax(logits) {
  const m = Math.max(...logits);
  let sum = 0;
  for (const z of logits) sum += Math.exp(z - m);
  const lse = Math.log(sum); // log-sum-exp of the shifted logits
  return logits.map(z => z - m - lse);
}

function crossEntropyFromLogits(logits, target) {
  return -logSoftmax(logits)[target];
}

const cases = [
  { logits: [3, 1, 0.5], target: 0 },
  { logits: [3, 1, 0.5], target: 1 },
  { logits: [1000, 10, -1000], target: 0 },
];
for (const c of cases) {
  const loss = crossEntropyFromLogits(c.logits, c.target);
  console.log('logits=' + JSON.stringify(c.logits) + ' target=' + c.target + ' loss=' + loss.toFixed(4));
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'backprop',
    section: 'Neural Networks',
    title: 'Backpropagation & the Chain Rule',
    explain: `
      <p>Gradient descent needs <code>∂L/∂w</code> for <strong>every</strong> parameter. With billions of parameters we can't nudge each one separately and re-run the model (that would take billions of forward passes per step). <strong>Backpropagation</strong> gets <em>all</em> the gradients in about the cost of one extra pass.</p>
      <h3>Step 1: break the computation into a graph</h3>
      <p>Any model is a chain of tiny operations. For <code>L = (w·x + b − y)²</code>:</p>
      <pre><code>u = w * x      // multiply
z = u + b      // add
e = z - y      // subtract
L = e * e      // square</code></pre>
      <p>Each node only needs to know its own <strong>local derivative</strong>: how its output changes when its input changes. <code>d(e²)/de = 2e</code>. <code>d(u+b)/du = 1</code>. <code>d(w·x)/dw = x</code>.</p>
      <h3>Step 2: the chain rule</h3>
      <p>If <code>L</code> depends on <code>e</code>, which depends on <code>z</code>, and so on, the effects <strong>multiply</strong>:</p>
      <pre><code>∂L/∂w = ∂L/∂e · ∂e/∂z · ∂z/∂u · ∂u/∂w</code></pre>
      <p>Intuition: if turning knob A by 1 moves B by 3, and moving B by 1 moves C by 2, then turning A by 1 moves C by 6.</p>
      <h3>Step 3: go backward, reusing work</h3>
      <p>Start at the loss with <code>∂L/∂L = 1</code> and walk the graph <strong>in reverse</strong>. At each node, multiply the gradient arriving from above by the local derivative and pass it down. Every intermediate gradient (like <code>∂L/∂z</code>) is computed once and shared by everything below it. That reuse is why backprop is cheap.</p>
      <ul>
        <li><strong>Add</strong> nodes pass the gradient through unchanged to both inputs.</li>
        <li><strong>Multiply</strong> nodes send each input the gradient × <em>the other input</em>.</li>
        <li>If a value feeds into several places, its gradients from each place are <strong>summed</strong>.</li>
      </ul>
      <div class="tip">This is exactly what <code>loss.backward()</code> does in PyTorch (<em>autograd</em>). During the forward pass it records every operation, then walks the graph backwards. A transformer's graph is huge (attention, softmax, layer norm, the MLP) but made of the same kinds of local rules.</div>
    `,
    examples: [
      {
        title: 'Step through forward and backward on a computational graph',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    #msg { min-height: 40px; background: #f8f9fa; border-radius: 6px; padding: 6px 10px; }
    input[type=number] { width: 52px; }
  </style>
  <div style="color:#555">Press <b>Next ▶</b> to run the forward pass (values in <b style="color:#1971c2">blue</b>),
    then the backward pass (gradients in <b style="color:#c92a2a">red</b>). You can change the inputs and start again.</div>
  <div class="row">
    w <input id="w" type="number" value="2" step="0.5">
    x <input id="x" type="number" value="3" step="0.5">
    b <input id="b" type="number" value="1" step="0.5">
    y <input id="y" type="number" value="10" step="0.5">
    <button id="prev">◀ Back</button>
    <button id="next">Next ▶</button>
    <button id="restart">Restart</button>
    <span id="stepn"></span>
  </div>
  <svg id="s" width="640" height="250" viewBox="0 0 640 250"></svg>
  <div id="msg"></div>
</div>
<script>
  const pos = {
    w: [50, 50], x: [50, 140], b: [200, 200], y: [350, 200],
    u: [200, 95], z: [350, 110], e: [480, 125], L: [590, 125],
  };
  const edges = [['w', 'u'], ['x', 'u'], ['u', 'z'], ['b', 'z'], ['z', 'e'], ['y', 'e'], ['e', 'L']];
  const ops = { u: '×', z: '+', e: '−', L: '²' };
  let step = 0;

  function compute() {
    const v = {};
    for (const k of ['w', 'x', 'b', 'y']) v[k] = +document.getElementById(k).value;
    v.u = v.w * v.x;
    v.z = v.u + v.b;
    v.e = v.z - v.y;
    v.L = v.e * v.e;
    const g = {};
    g.L = 1;
    g.e = 2 * v.e * g.L;
    g.z = g.e * 1;
    g.y = g.e * -1;
    g.u = g.z * 1;
    g.b = g.z * 1;
    g.w = g.u * v.x;
    g.x = g.u * v.w;
    return { v, g };
  }
  const n = x => +x.toFixed(3);

  function steps(v, g) {
    return [
      { fv: ['w', 'x', 'b', 'y'], fg: [], msg: 'Inputs: w=' + n(v.w) + ', x=' + n(v.x) + ', b=' + n(v.b) + ', y=' + n(v.y) + '. Goal: L and ∂L/∂(every input).' },
      { fv: ['u'], fg: [], msg: 'Forward ×: u = w·x = ' + n(v.w) + '·' + n(v.x) + ' = ' + n(v.u) },
      { fv: ['z'], fg: [], msg: 'Forward +: z = u + b = ' + n(v.u) + ' + ' + n(v.b) + ' = ' + n(v.z) + '  (the prediction ŷ)' },
      { fv: ['e'], fg: [], msg: 'Forward −: e = z − y = ' + n(v.z) + ' − ' + n(v.y) + ' = ' + n(v.e) + '  (the error)' },
      { fv: ['L'], fg: [], msg: 'Forward ²: L = e² = ' + n(v.L) + '. Forward pass done. Now go backward.' },
      { fv: [], fg: ['L'], msg: 'Seed: ∂L/∂L = 1' },
      { fv: [], fg: ['e'], msg: 'Square node, local derivative 2e = ' + n(2 * v.e) + '.  ∂L/∂e = 1 · ' + n(2 * v.e) + ' = ' + n(g.e) },
      { fv: [], fg: ['z', 'y'], msg: 'Minus node: ∂e/∂z = 1, ∂e/∂y = −1.  ∂L/∂z = ' + n(g.z) + ', ∂L/∂y = ' + n(g.y) },
      { fv: [], fg: ['u', 'b'], msg: 'Plus node passes the gradient through unchanged: ∂L/∂u = ' + n(g.u) + ', ∂L/∂b = ' + n(g.b) },
      { fv: [], fg: ['w', 'x'], msg: 'Times node sends each input grad × the OTHER input: ∂L/∂w = ' + n(g.u) + '·x = ' + n(g.w) + ', ∂L/∂x = ' + n(g.u) + '·w = ' + n(g.x) },
      { fv: [], fg: [], msg: 'Done! Gradient descent would now do w ← w − lr·(' + n(g.w) + '), b ← b − lr·(' + n(g.b) + '). Both push the prediction toward y.' },
    ];
  }

  function draw() {
    const { v, g } = compute();
    const all = steps(v, g);
    step = Math.max(0, Math.min(step, all.length - 1));
    const shownV = new Set();
    const shownG = new Set();
    for (let i = 0; i <= step; i++) {
      all[i].fv.forEach(k => shownV.add(k));
      all[i].fg.forEach(k => shownG.add(k));
    }
    const cur = new Set([...all[step].fv, ...all[step].fg]);
    let s = '<defs><marker id="ar" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#adb5bd"/></marker></defs>';
    for (const [a, b] of edges) {
      const [x1, y1] = pos[a];
      const [x2, y2] = pos[b];
      const dx = x2 - x1;
      const dy = y2 - y1;
      const len = Math.hypot(dx, dy);
      s += '<line x1="' + (x1 + dx / len * 26) + '" y1="' + (y1 + dy / len * 26) + '" x2="' +
        (x2 - dx / len * 28) + '" y2="' + (y2 - dy / len * 28) +
        '" stroke="#adb5bd" stroke-width="2" marker-end="url(#ar)"/>';
    }
    for (const k of Object.keys(pos)) {
      const [cx, cy] = pos[k];
      const isOp = k in ops;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="26" fill="' + (isOp ? '#fff4e6' : '#e7f5ff') +
        '" stroke="' + (cur.has(k) ? '#000' : isOp ? '#e8590c' : '#1971c2') + '" stroke-width="' +
        (cur.has(k) ? 3 : 1.5) + '"/>';
      s += '<text x="' + cx + '" y="' + (cy + 4) + '" text-anchor="middle" font-size="13" font-weight="700">' +
        k + (isOp ? ' ' + ops[k] : '') + '</text>';
      if (shownV.has(k)) {
        s += '<text x="' + cx + '" y="' + (cy - 32) + '" text-anchor="middle" font-size="12" fill="#1971c2" font-weight="700">' +
          k + '=' + n(v[k]) + '</text>';
      }
      if (shownG.has(k)) {
        s += '<text x="' + cx + '" y="' + (cy + 42) + '" text-anchor="middle" font-size="12" fill="#c92a2a" font-weight="700">' +
          '∂L/∂' + k + '=' + n(g[k]) + '</text>';
      }
    }
    document.getElementById('s').innerHTML = s;
    document.getElementById('msg').textContent = all[step].msg;
    document.getElementById('stepn').textContent = 'step ' + step + ' / ' + (all.length - 1);
  }
  document.getElementById('next').onclick = () => { step++; draw(); };
  document.getElementById('prev').onclick = () => { step--; draw(); };
  document.getElementById('restart').onclick = () => { step = 0; draw(); };
  for (const k of ['w', 'x', 'b', 'y']) {
    document.getElementById(k).oninput = () => { step = 0; draw(); };
  }
  draw();
</script>`,
        explain: `
          <details>
            <summary>The problem: how does changing <code>w</code> affect <code>L</code>?</summary>
            <p><code>w</code> doesn't touch <code>L</code> directly. It goes through three other operations first. We could nudge <code>w</code> and re-run everything (the finite-difference check in the next example does this), but that costs one forward pass per parameter. Backprop computes every <code>∂L/∂input</code> in one backward sweep using only local derivatives.</p>
          </details>
          <details>
            <summary>Step by step with the default inputs <code>w=2, x=3, b=1, y=10</code></summary>
            <table>
              <tr><th>Step</th><th>Pass</th><th>Computation</th><th>Result</th></tr>
              <tr><td>1</td><td>forward</td><td>u = w·x = 2·3</td><td>u = 6</td></tr>
              <tr><td>2</td><td>forward</td><td>z = u + b = 6 + 1</td><td>z = 7</td></tr>
              <tr><td>3</td><td>forward</td><td>e = z − y = 7 − 10</td><td>e = −3</td></tr>
              <tr><td>4</td><td>forward</td><td>L = e² = (−3)²</td><td>L = 9</td></tr>
              <tr><td>5</td><td>backward</td><td>seed</td><td>∂L/∂L = 1</td></tr>
              <tr><td>6</td><td>backward</td><td>∂L/∂e = 1 · 2e = 2·(−3)</td><td>−6</td></tr>
              <tr><td>7</td><td>backward</td><td>∂L/∂z = −6 · 1, ∂L/∂y = −6 · (−1)</td><td>−6, +6</td></tr>
              <tr><td>8</td><td>backward</td><td>∂L/∂u = −6 · 1, ∂L/∂b = −6 · 1</td><td>−6, −6</td></tr>
              <tr><td>9</td><td>backward</td><td>∂L/∂w = −6 · x = −6·3, ∂L/∂x = −6 · w = −6·2</td><td>−18, −12</td></tr>
            </table>
            <p>Reading the result: <code>∂L/∂w = −18</code> is negative, so <em>increasing</em> w lowers the loss. That makes sense: the prediction 7 is below the target 10, and a bigger w raises the prediction. Gradient descent with <code>lr = 0.01</code> would set <code>w ← 2 − 0.01·(−18) = 2.18</code>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <b>y = 7</b> (a perfect prediction), then step through: <code>e = 0</code>, so every gradient after the seed is 0. There's nothing to fix.</li>
              <li>Set <b>x = 0</b>: <code>∂L/∂w = 0</code>, because w had no effect on the output for this input. But <code>∂L/∂b</code> is still non-zero.</li>
              <li>Watch the step at the × node: the gradient for <code>w</code> is multiplied by <code>x</code>'s value, and vice versa. That's why the forward values must be <strong>stored</strong> for the backward pass. That's where most training memory goes.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Backprop by hand, checked with finite differences',
        lang: 'js',
        code: `// L = (w*x + b - y)^2, built from tiny steps
function forward(w, x, b, y) {
  const u = w * x; // multiply node
  const z = u + b; // add node
  const e = z - y; // error node
  const L = e * e; // square node
  return { u, z, e, L };
}

const w = 2, x = 3, b = 1, y = 10;
const f = forward(w, x, b, y);
console.log('forward: u=' + f.u + ' z=' + f.z + ' e=' + f.e + ' L=' + f.L);

// Backward pass: start at L, multiply local gradients going left
const dL_dL = 1;
const dL_de = dL_dL * 2 * f.e; // ① d(e^2)/de = 2e
const dL_dz = dL_de * 1; // ② d(z - y)/dz = 1
const dL_db = dL_dz * 1; // ③ d(u + b)/db = 1
const dL_du = dL_dz * 1; //    d(u + b)/du = 1
const dL_dw = dL_du * x; // ④ d(w*x)/dw = x
const dL_dx = dL_du * w; //    d(w*x)/dx = w
console.log('backward: dL/de=' + dL_de + ' dL/dz=' + dL_dz + ' dL/du=' + dL_du);
console.log('analytic: dL/dw=' + dL_dw + ' dL/db=' + dL_db + ' dL/dx=' + dL_dx);

// ⑤ Check with finite differences: nudge one input, watch L change
const h = 1e-4;
const L = (w, x, b) => forward(w, x, b, y).L;
const num_dw = (L(w + h, x, b) - L(w - h, x, b)) / (2 * h);
const num_db = (L(w, x, b + h) - L(w, x, b - h)) / (2 * h);
const num_dx = (L(w, x + h, b) - L(w, x - h, b)) / (2 * h);
console.log(
  'numeric:  dL/dw=' + num_dw.toFixed(4) +
  ' dL/db=' + num_db.toFixed(4) +
  ' dL/dx=' + num_dx.toFixed(4)
);`,
        explain: `
          <details>
            <summary>The problem: how do you know your gradients are right?</summary>
            <p>A wrong gradient doesn't crash anything. The model just trains badly and you never find out why. The classic safety net is a <strong>gradient check</strong>: estimate the derivative the slow, obvious way (nudge the input by a tiny <code>h</code> in both directions, measure the change in L) and compare it with backprop's answer.</p>
            <pre><code>∂L/∂w ≈ ( L(w + h) − L(w − h) ) / (2h)</code></pre>
          </details>
          <details>
            <summary>Step by step: console output explained</summary>
            <table>
              <tr><th>Console line</th><th>Where it comes from</th></tr>
              <tr><td><code>forward: u=6 z=7 e=-3 L=9</code></td><td>2·3 = 6, 6+1 = 7, 7−10 = −3, (−3)² = 9</td></tr>
              <tr><td><code>backward: dL/de=-6 dL/dz=-6 dL/du=-6</code></td><td>2·(−3) = −6, then passed unchanged through − and +</td></tr>
              <tr><td><code>analytic: dL/dw=-18 dL/db=-6 dL/dx=-12</code></td><td>−6·x = −18, −6·1 = −6, −6·w = −12</td></tr>
              <tr><td><code>numeric:  dL/dw=-18.0000 dL/db=-6.0000 dL/dx=-12.0000</code></td><td>Finite differences agree ✓</td></tr>
            </table>
            <p>Sanity check by hand: <code>L(w) = (3w + 1 − 10)² = (3w − 9)²</code>, so <code>dL/dw = 2·(3w − 9)·3 = 6·(−3) = −18</code> at w = 2. ✓</p>
          </details>
          <details>
            <summary>Key lines explained ①–⑤</summary>
            <ol>
              <li><strong>①</strong> Square node: <code>d(e²)/de = 2e</code>. It's multiplied by the gradient arriving from above (<code>dL_dL = 1</code>).</li>
              <li><strong>②</strong> Subtracting a constant <code>y</code> doesn't change slopes, so the local derivative is 1.</li>
              <li><strong>③</strong> The add node copies its incoming gradient to <em>both</em> inputs.</li>
              <li><strong>④</strong> The multiply node swaps: <code>w</code>'s gradient uses <code>x</code>'s value, and vice versa. This is why frameworks keep forward activations in memory.</li>
              <li><strong>⑤</strong> A central difference with <code>h = 1e-4</code>. For this quadratic it's exact up to floating-point rounding. For general functions it's accurate to about <code>h²</code>. Numeric gradients need 2 forward passes <em>per parameter</em>, which is fine for checking and hopeless for training.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Forgetting that gradients <strong>accumulate</strong>. If a value is used twice (e.g. <code>L = e * e</code> treated as a multiply with both inputs = e), its gradient is the <em>sum</em> from both uses: <code>e + e = 2e</code>. PyTorch also accumulates across calls. That's why training loops call <code>optimizer.zero_grad()</code> before each <code>backward()</code>.</div>
            <p>Try this: change <code>y</code> to <code>7</code> in the code. Every gradient becomes 0 (the prediction is perfect), and the numeric check agrees.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'For <code>u = w · x</code>, what is <code>∂u/∂w</code>?',
        options: ['w', 'x', '1', 'w · x'],
        answer: 1,
        why: 'Treat x as a constant: the derivative of w·x with respect to w is x.',
      },
      {
        q: 'An add node <code>z = u + b</code> receives gradient <code>∂L/∂z = 5</code>. What does it send to <code>u</code> and <code>b</code>?',
        options: ['5 and 5', '2.5 and 2.5', 'u and b', '0 and 5'],
        answer: 0,
        why: 'Both local derivatives are 1, so the gradient passes through unchanged to each input.',
      },
      {
        q: 'Why is backprop much cheaper than finite differences for training?',
        options: [
          'It uses less precise numbers',
          'It gets all gradients in one backward pass by reusing intermediate results, instead of 2 forward passes per parameter',
          'It skips the forward pass',
          'It only computes the gradient of the last layer',
        ],
        answer: 1,
        why: 'With N parameters, finite differences need about 2N forward passes. Backprop costs roughly one forward plus one backward pass, whatever N is.',
      },
      {
        q: 'With <code>w=1, x=2, b=0, y=5</code> and <code>L = (w·x + b − y)²</code>, what is <code>∂L/∂w</code>?',
        options: ['−6', '−12', '−3', '9'],
        answer: 1,
        why: 'e = 2 − 5 = −3, ∂L/∂e = −6, ∂L/∂w = −6 · x = −6 · 2 = −12.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Add a sigmoid: <code>L = (sigmoid(w·x + b) − y)²</code>. Compute <code>∂L/∂w</code> and <code>∂L/∂b</code> with the chain rule and check them against finite differences. Useful fact: <code>sigmoid'(z) = s·(1 − s)</code> where <code>s = sigmoid(z)</code>. The analytic and numeric columns should match to about 6 decimals.</p>`,
      starter: `const sigmoid = z => 1 / (1 + Math.exp(-z));

function loss(w, b, x, y) {
  const z = w * x + b;
  const s = sigmoid(z);
  return (s - y) ** 2;
}

const w = 0.5, b = -1, x = 2, y = 1;

// Forward (keep intermediates for backward)
const z = w * x + b;
const s = sigmoid(z);
const L = (s - y) ** 2;

// TODO: backward
const dL_ds = 0; // d((s-y)^2)/ds
const ds_dz = 0; // sigmoid'(z)
const dL_dz = dL_ds * ds_dz;
const dL_dw = 0; // chain through z = w*x + b
const dL_db = 0;

const h = 1e-5;
const num_dw = (loss(w + h, b, x, y) - loss(w - h, b, x, y)) / (2 * h);
const num_db = (loss(w, b + h, x, y) - loss(w, b - h, x, y)) / (2 * h);
console.log('L =', L.toFixed(6));
console.log('dL/dw analytic', dL_dw.toFixed(6), ' numeric', num_dw.toFixed(6));
console.log('dL/db analytic', dL_db.toFixed(6), ' numeric', num_db.toFixed(6));`,
      hint: '<code>dL_ds = 2 * (s - y)</code>, <code>ds_dz = s * (1 - s)</code>, <code>dL_dw = dL_dz * x</code>, <code>dL_db = dL_dz * 1</code>.',
      solution: `const sigmoid = z => 1 / (1 + Math.exp(-z));

function loss(w, b, x, y) {
  const z = w * x + b;
  const s = sigmoid(z);
  return (s - y) ** 2;
}

const w = 0.5, b = -1, x = 2, y = 1;

// Forward (keep intermediates for backward)
const z = w * x + b;
const s = sigmoid(z);
const L = (s - y) ** 2;

// Backward
const dL_ds = 2 * (s - y);
const ds_dz = s * (1 - s);
const dL_dz = dL_ds * ds_dz;
const dL_dw = dL_dz * x;
const dL_db = dL_dz * 1;

const h = 1e-5;
const num_dw = (loss(w + h, b, x, y) - loss(w - h, b, x, y)) / (2 * h);
const num_db = (loss(w, b + h, x, y) - loss(w, b - h, x, y)) / (2 * h);
console.log('L =', L.toFixed(6));
console.log('dL/dw analytic', dL_dw.toFixed(6), ' numeric', num_dw.toFixed(6));
console.log('dL/db analytic', dL_db.toFixed(6), ' numeric', num_db.toFixed(6));`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'training-loop',
    section: 'Neural Networks',
    title: 'The Training Loop',
    explain: `
      <p>You now have every piece. Training any neural net, from a single neuron to a 70B-parameter LLM, is this loop:</p>
      <pre><code>for each epoch:                      // one full pass over the data
  shuffle the data
  for each mini-batch:
    predictions = model(batch.x)       // 1. forward pass
    loss = lossFn(predictions, batch.y) // 2. how wrong?
    grads = backprop(loss)             // 3. backward pass
    params -= lr * grads               // 4. update (optimizer step)</code></pre>
      <h3>Batches and epochs</h3>
      <ul>
        <li><strong>Full-batch</strong> gradient descent computes the gradient over the <em>entire</em> dataset per step. It's accurate, but far too slow for big data.</li>
        <li><strong>Stochastic / mini-batch</strong> (SGD): estimate the gradient from a small random <strong>batch</strong> (e.g. 32 examples) and update right away. The estimate is noisy but much cheaper, so you get many more updates for the same compute. The noise even helps escape bad spots.</li>
        <li>An <strong>epoch</strong> is one pass through all the training data. Small datasets are seen for many epochs. LLM pre-training often sees most text only about <strong>once</strong>: the dataset is that big.</li>
        <li><strong>Shuffle</strong> each epoch so batches aren't always the same and ordering effects don't bias the model.</li>
      </ul>
      <h3>Optimizers: SGD, momentum, Adam</h3>
      <ul>
        <li><strong>SGD</strong>: <code>θ ← θ − lr·g</code>. Simple, but one learning rate for every parameter. It struggles when some directions are steep and others flat (it zig-zags).</li>
        <li><strong>Momentum</strong>: keep a running average of past gradients (a "velocity") and move along it. It smooths out the zig-zag and speeds up along consistent directions.</li>
        <li><strong>Adam / AdamW</strong>: momentum <em>plus</em> a per-parameter step size. Each parameter's step is divided by a running average of its recent gradient magnitude, so rarely-updated or small-gradient parameters still move. <strong>AdamW</strong> (Adam with decoupled weight decay) is the standard optimizer for training transformers.</li>
      </ul>
      <h3>The learning rate, again</h3>
      <p>It's still the #1 knob. LLM training uses a <strong>schedule</strong>: a short <em>warmup</em> (the learning rate ramps up from ~0 over the first steps, which keeps early training stable), then a slow <em>decay</em> (often cosine) toward a small value.</p>
      <div class="tip">Watch the loss curve, not individual numbers. A healthy run drops fast, then flattens. A spike or NaN usually means the learning rate is too high or there's a data bug. If validation loss rises while training loss falls, you're overfitting (see the <em>Generalization</em> lesson).</div>
    `,
    examples: [
      {
        title: 'Mini-batch SGD training a tiny linear model',
        lang: 'js',
        code: `// Tiny seeded random generator so every run is identical
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

// Data: y = 2x + 1 plus a little noise. The model must discover 2 and 1.
const data = [];
for (let i = 0; i < 16; i++) {
  const x = i / 4 - 2; // x from -2 to 1.75
  const noise = (rand() - 0.5) * 0.4;
  data.push({ x, y: 2 * x + 1 + noise });
}

let w = 0; // parameters start at a bad guess
let b = 0;
const lr = 0.05; // learning rate
const batchSize = 4;
const epochs = 50;

function datasetLoss() {
  let s = 0;
  for (const p of data) s += (w * p.x + b - p.y) ** 2;
  return s / data.length;
}

console.log('epoch 0: loss=' + datasetLoss().toFixed(4));

for (let epoch = 1; epoch <= epochs; epoch++) {
  // ① shuffle the data each epoch (Fisher-Yates)
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  // ② walk through the data in mini-batches
  for (let start = 0; start < data.length; start += batchSize) {
    const batch = data.slice(start, start + batchSize);
    let gw = 0;
    let gb = 0;
    for (const p of batch) {
      const err = w * p.x + b - p.y; // ③ forward + error
      gw += (2 * err * p.x) / batch.length; // ④ gradient of mean squared error
      gb += (2 * err) / batch.length;
    }
    w -= lr * gw; // ⑤ one update per batch
    b -= lr * gb;
  }
  if ([1, 2, 5, 10, 20, 50].includes(epoch)) {
    console.log(
      'epoch ' + epoch + ': loss=' + datasetLoss().toFixed(4) +
      ' w=' + w.toFixed(3) + ' b=' + b.toFixed(3)
    );
  }
}`,
        explain: `
          <details>
            <summary>What the output shows</summary>
            <pre><code>epoch 0: loss=5.8274
epoch 1: loss=2.0610 w=0.851 b=0.282
epoch 2: loss=0.7557 w=1.338 b=0.493
epoch 5: loss=0.0549 w=1.859 b=0.834
epoch 10: loss=0.0091 w=1.976 b=0.983
epoch 20: loss=0.0084 w=1.989 b=1.009
epoch 50: loss=0.0084 w=1.987 b=1.005</code></pre>
            <p>16 points with batch size 4 means <strong>4 updates per epoch</strong>, so 200 updates in total. The loss drops fast, then <strong>plateaus around 0.0084</strong>. That floor is the noise in the data: no line can explain random noise, so the loss can't reach 0. <code>w</code> and <code>b</code> keep jiggling slightly (1.989 → 1.987) because each mini-batch gradient is a noisy estimate. That's the "stochastic" in SGD.</p>
          </details>
          <details>
            <summary>Key lines explained ①–⑤</summary>
            <ol>
              <li><strong>①</strong> Fisher–Yates shuffle with a seeded PRNG: random but reproducible.</li>
              <li><strong>②</strong> Mini-batches: <code>slice</code> 4 examples at a time.</li>
              <li><strong>③</strong> The forward pass for this model is one line: <code>w·x + b</code>.</li>
              <li><strong>④</strong> Backprop for MSE: <code>∂/∂w (w·x + b − y)² = 2·err·x</code> and <code>∂/∂b = 2·err</code>, averaged over the batch.</li>
              <li><strong>⑤</strong> The optimizer step. Swap in momentum or Adam here without touching anything else.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li><code>batchSize = 16</code> (full batch): only 1 update per epoch. After 10 epochs the loss is still <code>0.4992</code> (vs <code>0.0091</code> with batches of 4). Same compute, far fewer steps.</li>
              <li><code>batchSize = 1</code>: 16 noisy updates per epoch. The loss is already <code>0.0964</code> after epoch 1, but the parameters jiggle more (the loss floor wobbles between 0.0085 and 0.0093).</li>
              <li><code>lr = 0.5</code>: it still gets close, but bounces around (loss between 0.011 and 0.021). <code>lr = 1.5</code>: the loss is 648 after one epoch and around 10<sup>140</sup> by epoch 50. It has diverged, and a longer run ends in <code>Infinity</code> then <code>NaN</code>.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'SGD vs momentum vs Adam on a stretched valley',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    .leg span { margin-right: 12px; font-weight: 600; }
    .mono { font: 12px ui-monospace, monospace; }
  </style>
  <div style="color:#555">Loss L(a, b) = 0.05·a² + 5·b²: a long valley, 100× more curved in b than in a.
    All three optimizers start at the black dot. Press <b>Step</b> or <b>Run</b> and compare how they reach the minimum (+).</div>
  <div class="row">
    <label>learning rate <input id="lr" type="range" min="0.02" max="0.2" step="0.01" value="0.18">
      <b id="lrv"></b></label>
    <button id="step">Step</button>
    <button id="run">Run 60</button>
    <button id="reset">Reset</button>
    <span class="mono" id="t"></span>
  </div>
  <svg id="s" width="640" height="260" viewBox="0 0 640 260"></svg>
  <div class="row leg">
    <span style="color:#e8590c">● SGD</span>
    <span style="color:#1971c2">● Momentum (β=0.9)</span>
    <span style="color:#2b8a3e">● Adam (own lr = 0.3)</span>
  </div>
  <div class="mono" id="loss"></div>
</div>
<script>
  const L = (a, b) => 0.05 * a * a + 5 * b * b;
  const G = (a, b) => [0.1 * a, 10 * b]; // gradient
  const start = [-9, 2];
  const X = a => 320 + a * 30;
  const Y = b => 130 - b * 50;
  const ADAM_LR = 0.3;
  let opt;
  let t;
  let timer = null;

  function reset() {
    clearInterval(timer);
    t = 0;
    opt = {
      sgd: { p: start.slice(), path: [start.slice()] },
      mom: { p: start.slice(), v: [0, 0], path: [start.slice()] },
      adam: { p: start.slice(), m: [0, 0], s: [0, 0], path: [start.slice()] },
    };
    draw();
  }

  function step() {
    const lr = +document.getElementById('lr').value;
    t++;
    // SGD
    let o = opt.sgd;
    let g = G(o.p[0], o.p[1]);
    o.p = [o.p[0] - lr * g[0], o.p[1] - lr * g[1]];
    o.path.push(o.p);
    // Momentum (as in PyTorch SGD): v = beta*v + g ; p -= lr*v
    o = opt.mom;
    g = G(o.p[0], o.p[1]);
    o.v = [0.9 * o.v[0] + g[0], 0.9 * o.v[1] + g[1]];
    o.p = [o.p[0] - lr * o.v[0], o.p[1] - lr * o.v[1]];
    o.path.push(o.p);
    // Adam
    o = opt.adam;
    g = G(o.p[0], o.p[1]);
    const b1 = 0.9;
    const b2 = 0.999;
    const next = [0, 0];
    for (let i = 0; i < 2; i++) {
      o.m[i] = b1 * o.m[i] + (1 - b1) * g[i];
      o.s[i] = b2 * o.s[i] + (1 - b2) * g[i] * g[i];
      const mh = o.m[i] / (1 - b1 ** t);
      const sh = o.s[i] / (1 - b2 ** t);
      next[i] = o.p[i] - ADAM_LR * mh / (Math.sqrt(sh) + 1e-8);
    }
    o.p = next;
    o.path.push(o.p);
    draw();
  }

  function draw() {
    const lr = +document.getElementById('lr').value;
    document.getElementById('lrv').textContent = lr.toFixed(2);
    let s = '<rect width="640" height="260" fill="#fafbff"/>';
    for (const lv of [0.1, 0.5, 1.5, 3, 5, 8]) {
      // ellipse 0.05a^2 + 5b^2 = lv  -> a = sqrt(lv/0.05), b = sqrt(lv/5)
      s += '<ellipse cx="' + X(0) + '" cy="' + Y(0) + '" rx="' + (Math.sqrt(lv / 0.05) * 30) +
        '" ry="' + (Math.sqrt(lv / 5) * 50) + '" fill="none" stroke="#dee2e6"/>';
    }
    s += '<text x="' + (X(0) + 5) + '" y="' + (Y(0) - 5) + '" font-size="14">+</text>';
    const cols = { sgd: '#e8590c', mom: '#1971c2', adam: '#2b8a3e' };
    for (const k of ['sgd', 'mom', 'adam']) {
      const pts = opt[k].path
        .filter(p => Math.abs(p[0]) < 12 && Math.abs(p[1]) < 3)
        .map(p => X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1)).join(' ');
      s += '<polyline points="' + pts + '" fill="none" stroke="' + cols[k] + '" stroke-width="2"/>';
      const p = opt[k].p;
      if (Math.abs(p[0]) < 12 && Math.abs(p[1]) < 3) {
        s += '<circle cx="' + X(p[0]) + '" cy="' + Y(p[1]) + '" r="5" fill="' + cols[k] + '"/>';
      }
    }
    s += '<circle cx="' + X(start[0]) + '" cy="' + Y(start[1]) + '" r="5" fill="#000"/>';
    s += '<text x="8" y="16" font-size="11" fill="#555">b ↑</text>' +
      '<text x="600" y="250" font-size="11" fill="#555">a →</text>';
    document.getElementById('s').innerHTML = s;
    document.getElementById('t').textContent = 'step ' + t;
    const f = k => {
      const v = L(opt[k].p[0], opt[k].p[1]);
      return isFinite(v) && v < 1e6 ? v.toFixed(4) : 'diverged';
    };
    document.getElementById('loss').textContent =
      'loss  SGD=' + f('sgd') + '   Momentum=' + f('mom') + '   Adam=' + f('adam');
  }

  document.getElementById('step').onclick = step;
  document.getElementById('reset').onclick = reset;
  document.getElementById('run').onclick = () => {
    clearInterval(timer);
    let n = 0;
    timer = setInterval(() => {
      step();
      if (++n >= 60) clearInterval(timer);
    }, 80);
  };
  document.getElementById('lr').oninput = reset;
  reset();
</script>`,
        explain: `
          <details>
            <summary>What to look for</summary>
            <ul>
              <li><b>SGD</b> (orange): the learning rate must stay small enough for the <em>steep</em> b-direction. With lr = 0.18, each step in b multiplies the offset by <code>1 − 0.18·10 = −0.8</code>, so it zig-zags. In the shallow a-direction it only shrinks by <code>1 − 0.18·0.1 = 0.982</code> per step, so it crawls. After 60 steps its loss is still ≈ 0.46.</li>
              <li><b>Momentum</b> (blue): the up/down gradients cancel out in the running velocity, while the consistent "go right" direction keeps adding up. It shoots along the valley, overshoots a little, and settles: loss ≈ 0.02 by step 40.</li>
              <li><b>Adam</b> (green): divides each coordinate's step by its own recent gradient size, so both directions move at a similar pace (about 0.3 per step) regardless of curvature. The path heads fairly straight for the minimum.</li>
              <li>Drag the learning rate to <b>0.2</b>: SGD's b-factor becomes <code>1 − 2 = −1</code>. It bounces between b = ±2 forever and its loss stays above 20.</li>
            </ul>
            <div class="tip">Adam has its own fixed learning rate here (0.3) because its step size means something different: roughly "distance per step" rather than "multiple of the gradient". The betas are the real defaults: <code>β₁ = 0.9, β₂ = 0.999, ε = 1e-8</code>. Momentum uses PyTorch's form <code>v = 0.9·v + g; θ -= lr·v</code>.</div>
          </details>
        `,
      },
      {
        title: 'The same loop in PyTorch (reference)',
        lang: 'python',
        runnable: false,
        code: `import torch
import torch.nn as nn

model = nn.Sequential(nn.Linear(2, 16), nn.GELU(), nn.Linear(16, 1))
optimizer = torch.optim.AdamW(model.parameters(), lr=1e-3, weight_decay=0.01)
loss_fn = nn.MSELoss()

for epoch in range(10):
    for xb, yb in loader:              # DataLoader(shuffle=True, batch_size=32)
        pred = model(xb)               # 1. forward
        loss = loss_fn(pred, yb)       # 2. loss
        optimizer.zero_grad()          # clear old (accumulated) gradients
        loss.backward()                # 3. backprop: fills p.grad for every parameter
        optimizer.step()               # 4. update
    print(epoch, loss.item())`,
      },
    ],
    quiz: [
      {
        q: 'Dataset of 1,000 examples, batch size 50. How many parameter updates per epoch?',
        options: ['1', '50', '20', '1000'],
        answer: 2,
        why: '1000 / 50 = 20 mini-batches, with one update each.',
      },
      {
        q: 'What does Adam add on top of plain SGD?',
        options: [
          'It removes the need for gradients',
          'Momentum plus a per-parameter step size scaled by recent gradient magnitudes',
          'A fixed learning rate of 0.001',
          'Automatic data shuffling',
        ],
        answer: 1,
        why: 'Adam keeps running averages of the gradient (m) and squared gradient (v) and steps by <code>m / √v</code>. AdamW additionally decouples weight decay, and it\'s the transformer default.',
      },
      {
        q: 'Why use mini-batches instead of the whole dataset per step?',
        options: [
          'The gradient is more accurate',
          'Many cheap, slightly noisy updates beat few expensive exact ones, and the batch fits in memory',
          'It\'s required by backprop',
          'It prevents overfitting completely',
        ],
        answer: 1,
        why: 'The mini-batch gradient is an unbiased (noisy) estimate of the full gradient at a fraction of the cost.',
      },
      {
        q: 'In PyTorch, why call <code>optimizer.zero_grad()</code> every step?',
        options: ['To reset the weights', 'Because gradients accumulate (add up) across backward() calls', 'To lower the learning rate', 'To shuffle the batch'],
        answer: 1,
        why: '<code>.grad</code> is summed into, not overwritten. Without zeroing, you\'d apply stale gradients from earlier batches.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Train a <strong>single sigmoid neuron</strong> to classify points: label 1 if <code>x₁ + x₂ &gt; 1</code>, else 0. The loss is <strong>binary cross-entropy</strong>. Its gradient w.r.t. <code>z</code> is simply <code>(p − y)</code>, so <code>∂L/∂wᵢ = (p − y)·xᵢ</code> and <code>∂L/∂b = (p − y)</code>. Fill in the update step inside the loop. The printed loss should go down, and the final accuracy should be 100%.</p>`,
      starter: `const sigmoid = z => 1 / (1 + Math.exp(-z));

// Deterministic grid of points in [0,1]x[0,1], label = x1 + x2 > 1
const data = [];
for (let i = 0; i <= 5; i++) {
  for (let j = 0; j <= 5; j++) {
    const x = [i / 5, j / 5];
    if (Math.abs(x[0] + x[1] - 1) < 1e-9) continue; // skip points exactly on the line
    data.push({ x, y: x[0] + x[1] > 1 ? 1 : 0 });
  }
}

let w = [0, 0];
let b = 0;
const lr = 0.5;
const batchSize = 8;

function predict(x) {
  return sigmoid(w[0] * x[0] + w[1] * x[1] + b);
}

function bce() {
  let s = 0;
  for (const { x, y } of data) {
    const p = Math.min(Math.max(predict(x), 1e-12), 1 - 1e-12);
    s += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return s / data.length;
}

for (let epoch = 1; epoch <= 200; epoch++) {
  for (let start = 0; start < data.length; start += batchSize) {
    const batch = data.slice(start, start + batchSize);
    let gw = [0, 0];
    let gb = 0;
    // TODO: accumulate gradients over the batch (average them),
    // then update w and b with the learning rate
  }
  if (epoch % 50 === 0) console.log('epoch ' + epoch + ' loss=' + bce().toFixed(4));
}

const acc = data.filter(d => (predict(d.x) > 0.5 ? 1 : 0) === d.y).length / data.length;
console.log('w=' + w.map(v => v.toFixed(2)) + ' b=' + b.toFixed(2) + ' accuracy=' + (acc * 100).toFixed(1) + '%');`,
      hint: 'Inside the batch loop: <code>const err = predict(x) - y; gw[0] += err * x[0] / batch.length; …</code> then <code>w[0] -= lr * gw[0]</code> etc.',
      solution: `const sigmoid = z => 1 / (1 + Math.exp(-z));

// Deterministic grid of points in [0,1]x[0,1], label = x1 + x2 > 1
const data = [];
for (let i = 0; i <= 5; i++) {
  for (let j = 0; j <= 5; j++) {
    const x = [i / 5, j / 5];
    if (Math.abs(x[0] + x[1] - 1) < 1e-9) continue; // skip points exactly on the line
    data.push({ x, y: x[0] + x[1] > 1 ? 1 : 0 });
  }
}

let w = [0, 0];
let b = 0;
const lr = 0.5;
const batchSize = 8;

function predict(x) {
  return sigmoid(w[0] * x[0] + w[1] * x[1] + b);
}

function bce() {
  let s = 0;
  for (const { x, y } of data) {
    const p = Math.min(Math.max(predict(x), 1e-12), 1 - 1e-12);
    s += -(y * Math.log(p) + (1 - y) * Math.log(1 - p));
  }
  return s / data.length;
}

for (let epoch = 1; epoch <= 200; epoch++) {
  for (let start = 0; start < data.length; start += batchSize) {
    const batch = data.slice(start, start + batchSize);
    let gw = [0, 0];
    let gb = 0;
    for (const { x, y } of batch) {
      const err = predict(x) - y; // dL/dz for sigmoid + BCE
      gw[0] += (err * x[0]) / batch.length;
      gw[1] += (err * x[1]) / batch.length;
      gb += err / batch.length;
    }
    w[0] -= lr * gw[0];
    w[1] -= lr * gw[1];
    b -= lr * gb;
  }
  if (epoch % 50 === 0) console.log('epoch ' + epoch + ' loss=' + bce().toFixed(4));
}

const acc = data.filter(d => (predict(d.x) > 0.5 ? 1 : 0) === d.y).length / data.length;
console.log('w=' + w.map(v => v.toFixed(2)) + ' b=' + b.toFixed(2) + ' accuracy=' + (acc * 100).toFixed(1) + '%');`,
    },
  },
);
