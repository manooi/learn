// Section: ML Foundations
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------
  {
    id: 'what-is-ml',
    section: 'ML Foundations',
    title: 'What is Machine Learning?',
    explain: `
      <p>In normal programming <strong>you write the rules</strong>: <code>if (subject.includes('FREE $$$')) markSpam()</code>. That works until spammers change the wording, and then you need more rules, and even more after that.</p>
      <p>Machine learning flips this around. You give the computer <strong>examples with answers</strong>, and it <strong>finds the rules itself</strong>. You still write code, but it's the code for a <em>learning procedure</em>, not the rules.</p>
      <pre><code>Traditional:   rules + data      →  answers
Machine learning:  data + answers  →  rules (a "model")</code></pre>

      <h3>The vocabulary you'll see everywhere</h3>
      <ul>
        <li><strong>Features</strong> (input, <code>x</code>): the numbers describing one example, e.g. "number of <code>!</code> in the email" or "the pixels of an image". A model only ever sees numbers, so text has to be turned into numbers first. Transformers do this with <em>tokens</em> and <em>embeddings</em>, which come later in the course.</li>
        <li><strong>Label</strong> (target, <code>y</code>): the correct answer for that example ("spam", "7", "the next word").</li>
        <li><strong>Model</strong>: a function <code>f(x)</code> that makes a prediction. It has adjustable numbers inside it.</li>
        <li><strong>Parameters</strong> (weights): those adjustable numbers. <em>Training</em> means searching for parameter values that make predictions match the labels. GPT-style LLMs have billions of them, but each one is still just a number that gets nudged.</li>
      </ul>

      <h3>Three flavours of learning</h3>
      <ul>
        <li><strong>Supervised</strong>: every example comes with a human-provided label (photo → "cat"). It works well, but labels cost money and time.</li>
        <li><strong>Unsupervised</strong>: no labels. The job is to find structure, e.g. clustering customers into groups.</li>
        <li><strong>Self-supervised</strong>: the labels come <em>from the data itself</em>. Hide part of the input and ask the model to predict it. <strong>This is how LLMs are trained.</strong> Take any text, like <code>"the cat sat on the"</code>, and the label is simply the next word, <code>"mat"</code>. The internet provides trillions of these examples for free.</li>
      </ul>
      <div class="tip">An LLM's pre-training objective really is that simple: <strong>predict the next token</strong>. The rest of this course (vectors, neural nets, attention, the transformer block) is about building a function that does this well.</div>
      <div class="warn">"Learning" here isn't magic or understanding in the human sense. It's <strong>numerical optimization</strong>: adjust numbers so a measured error goes down. Keep that picture in mind and the rest becomes much less mysterious.</div>
    `,
    examples: [
      {
        title: 'Rules vs learning: find the spam threshold',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 640px; font: 14px system-ui, sans-serif; }
    .row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin: 6px 0; }
    .acc { font-weight: 600; font-size: 16px; }
    .muted { color: #666; font-size: 13px; }
  </style>
  <div class="row">
    <b>Feature x:</b> number of "!" + suspicious words in an email
  </div>
  <svg id="plot" width="620" height="150" viewBox="0 0 620 150"></svg>
  <div class="row">
    <label>Your rule: spam if x &ge;
      <input id="th" type="range" min="0" max="12" step="0.5" value="2">
      <span id="thv"></span></label>
    <button id="learn">Learn from data</button>
  </div>
  <div class="row"><span class="acc" id="acc"></span></div>
  <div class="muted" id="msg">Drag the slider (you writing a rule), or let the computer search.</div>
</div>
<script>
  // Each email: x = feature value, spam = label (1 spam, 0 not spam)
  const emails = [
    { x: 0, spam: 0 }, { x: 1, spam: 0 }, { x: 1, spam: 0 }, { x: 2, spam: 0 },
    { x: 3, spam: 0 }, { x: 3.5, spam: 1 }, { x: 4, spam: 0 }, { x: 5, spam: 1 },
    { x: 5.5, spam: 0 }, { x: 6, spam: 1 }, { x: 7, spam: 1 }, { x: 8, spam: 1 },
    { x: 9, spam: 1 }, { x: 10.5, spam: 1 }, { x: 11, spam: 1 }, { x: 2.5, spam: 0 },
  ];
  const svg = document.getElementById('plot');
  const th = document.getElementById('th');
  const X = v => 20 + v * 48;

  function accuracy(t) {
    let right = 0;
    for (const e of emails) {
      const pred = e.x >= t ? 1 : 0;
      if (pred === e.spam) right++;
    }
    return right / emails.length;
  }

  function draw() {
    const t = +th.value;
    document.getElementById('thv').textContent = t;
    let s = '<line x1="20" y1="100" x2="600" y2="100" stroke="#999"/>';
    for (let v = 0; v <= 12; v++) {
      s += '<text x="' + X(v) + '" y="120" font-size="11" text-anchor="middle" fill="#555">' +
        v + '</text>';
    }
    s += '<rect x="' + X(t) + '" y="20" width="' + (600 - X(t)) +
      '" height="80" fill="#fde2e2"/>';
    s += '<text x="' + (X(t) + 6) + '" y="34" font-size="12" fill="#b3261e">predicted spam</text>';
    s += '<line x1="' + X(t) + '" y1="15" x2="' + X(t) + '" y2="105" stroke="#b3261e" stroke-width="2"/>';
    const stack = {};
    for (const e of emails) {
      const k = e.x;
      stack[k] = (stack[k] || 0) + 1;
      const y = 100 - stack[k] * 16;
      const wrong = (e.x >= t ? 1 : 0) !== e.spam;
      s += '<circle cx="' + X(e.x) + '" cy="' + y + '" r="7" fill="' +
        (e.spam ? '#e4572e' : '#2e86de') + '" stroke="' + (wrong ? '#000' : 'none') +
        '" stroke-width="2.5"/>';
    }
    s += '<circle cx="30" cy="140" r="6" fill="#e4572e"/><text x="40" y="144" font-size="12">spam</text>';
    s += '<circle cx="100" cy="140" r="6" fill="#2e86de"/><text x="110" y="144" font-size="12">not spam</text>';
    s += '<circle cx="200" cy="140" r="6" fill="#fff" stroke="#000" stroke-width="2.5"/>' +
      '<text x="210" y="144" font-size="12">misclassified</text>';
    svg.innerHTML = s;
    document.getElementById('acc').textContent =
      'Accuracy: ' + (accuracy(t) * 100).toFixed(1) + '%';
  }

  // "Training": try every threshold, keep the one with the best accuracy
  document.getElementById('learn').onclick = () => {
    let best = 0;
    let bestAcc = -1;
    for (let t = 0; t <= 12; t += 0.5) {
      const a = accuracy(t);
      console.log('try threshold ' + t.toFixed(1) + ' -> accuracy ' + a.toFixed(3));
      if (a > bestAcc) {
        bestAcc = a;
        best = t;
      }
    }
    th.value = best;
    document.getElementById('msg').textContent =
      'Searched 25 thresholds and kept the best one (see console). No rule can get 100%: ' +
      'the data overlaps, and that is normal.';
    draw();
  };
  th.oninput = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>What this demo is really showing</summary>
            <p>The "model" here has just <strong>one parameter</strong>: the threshold <code>t</code>. Its prediction is <code>spam if x &ge; t</code>. Moving the slider is <em>you</em> hand-tuning a rule. Clicking <em>Learn from data</em> is the computer trying every value and keeping the one with the best score. That is training, in its crudest form.</p>
            <p>Brute-force search works for 1 parameter and 25 candidates. It is hopeless for an LLM with 10<sup>9</sup> parameters (25<sup>1,000,000,000</sup> combinations). That's why the next lessons build up to <strong>gradient descent</strong>, which finds good parameters without trying them all.</p>
            <div class="tip">Try this: the best possible accuracy is 87.5% (14 of 16). Thresholds 3.5, 4.5, 5 and 6 all tie, and the search keeps the first one it finds, <code>t = 3.5</code>. The ringed dots at <code>x = 4</code> and <code>x = 5.5</code> are legit emails that look spammy. Real data always has cases like these, and a perfect score on training data is often a warning sign (see <em>Overfitting</em>).</div>
          </details>
        `,
      },
      {
        title: 'Self-supervised: text labels itself (next-token pairs)',
        lang: 'js',
        code: `// Any text becomes training data: the label is just "what comes next".
const text = 'the cat sat on the mat . the cat ate the fish .';
const tokens = text.split(' ');

// ① build (context -> next word) pairs
for (let i = 1; i < 6; i++) {
  const context = tokens.slice(0, i).join(' ');
  console.log('input: "' + context + '"  ->  label: "' + tokens[i] + '"');
}

// ② the simplest possible "language model": count what follows each word
const counts = {};
for (let i = 0; i < tokens.length - 1; i++) {
  const cur = tokens[i];
  const next = tokens[i + 1];
  counts[cur] = counts[cur] || {};
  counts[cur][next] = (counts[cur][next] || 0) + 1;
}

// ③ turn counts into probabilities for the word after "the"
const after = counts['the'];
const total = Object.values(after).reduce((a, b) => a + b, 0);
for (const [word, c] of Object.entries(after)) {
  console.log('P(' + word + ' | the) = ' + c + '/' + total + ' = ' + (c / total).toFixed(2));
}`,
      },
    ],
    quiz: [
      {
        q: 'In supervised learning, what is a <strong>label</strong>?',
        options: ['The name of the model', 'The correct answer for a training example', 'A feature that was normalized', 'The learning rate'],
        answer: 1,
        why: 'Features are the inputs <code>x</code>. The label <code>y</code> is the correct answer the model should learn to predict.',
      },
      {
        q: 'How are LLMs like GPT pre-trained?',
        options: [
          'Supervised: humans label every sentence',
          'Unsupervised clustering of documents',
          'Self-supervised: predict the next token of real text',
          'Hand-written grammar rules',
        ],
        answer: 2,
        why: 'The label (next token) comes from the text itself, so no human labeling is needed. That is why they can train on huge amounts of text.',
      },
      {
        q: 'What does "training a model" actually change?',
        options: ['The model\'s source code', 'The training data', 'The numeric parameters (weights) inside the model', 'The labels'],
        answer: 2,
        why: 'The architecture (the code) stays fixed. Training adjusts the parameters so predictions match labels better.',
      },
      {
        q: 'In the counting demo, <code>P(cat | the) = 0.50</code>. What does that mean?',
        options: [
          'Half of all words are "cat"',
          'In this text, "cat" follows "the" in 2 of the 4 cases',
          'The model is 50% trained',
          '"the" and "cat" are similar vectors',
        ],
        answer: 1,
        why: '"the" appears 4 times before another word, and 2 of those times the next word is "cat". An LLM outputs exactly this kind of conditional distribution, but computed by a neural net from the whole context.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>LLMs are trained with a <strong>fixed context window</strong>. Write <code>makePairs(tokens, windowSize)</code> that returns a list of <code>{ context, label }</code> where <code>context</code> is the <em>last</em> <code>windowSize</code> tokens (fewer at the start) and <code>label</code> is the next token.</p>
      <p>For <code>['a','b','c','d']</code> with window 2 you should get: <code>[a]→b</code>, <code>[a,b]→c</code>, <code>[b,c]→d</code>.</p>`,
      starter: `function makePairs(tokens, windowSize) {
  const pairs = [];
  // TODO: for each position i >= 1, context = up to windowSize tokens before i,
  // label = tokens[i]
  return pairs;
}

const tokens = 'to be or not to be'.split(' ');
const pairs = makePairs(tokens, 2);
console.log('pairs:', pairs.length);
for (const p of pairs) {
  console.log('[' + p.context.join(', ') + '] -> ' + p.label);
}`,
      hint: 'Use <code>tokens.slice(Math.max(0, i - windowSize), i)</code> for the context.',
      solution: `function makePairs(tokens, windowSize) {
  const pairs = [];
  for (let i = 1; i < tokens.length; i++) {
    const context = tokens.slice(Math.max(0, i - windowSize), i);
    pairs.push({ context, label: tokens[i] });
  }
  return pairs;
}

const tokens = 'to be or not to be'.split(' ');
const pairs = makePairs(tokens, 2);
console.log('pairs:', pairs.length);
for (const p of pairs) {
  console.log('[' + p.context.join(', ') + '] -> ' + p.label);
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'vectors',
    section: 'ML Foundations',
    title: 'Vectors, Dot Products & Matrices',
    explain: `
      <p>A <strong>vector</strong> is just a list of numbers: <code>[0.2, -1.3, 0.7]</code>. In ML, everything is a vector: an email's features, an image's pixels, and in transformers <strong>every token becomes a vector</strong> (an <em>embedding</em>) of a few hundred to a few thousand numbers.</p>
      <p>You can think of a vector as an <strong>arrow</strong> from the origin. With 2 numbers you can draw it. With 768 you can't draw it, but the same math still works.</p>

      <h3>The dot product: "how aligned are these two?"</h3>
      <p>Multiply matching entries and add them up:</p>
      <pre><code>a · b = a[0]*b[0] + a[1]*b[1] + ... + a[n-1]*b[n-1]
[1, 2] · [3, -1] = 1*3 + 2*(-1) = 1</code></pre>
      <p>Geometrically: <code>a · b = |a| |b| cos(θ)</code>, where <code>θ</code> is the angle between the arrows and <code>|a|</code> is the length.</p>
      <ul>
        <li>Pointing the same way (θ ≈ 0°): <strong>large positive</strong>.</li>
        <li>Perpendicular (θ = 90°): <strong>zero</strong>. The vectors are "unrelated".</li>
        <li>Opposite directions (θ ≈ 180°): <strong>large negative</strong>.</li>
      </ul>
      <p>Divide by both lengths and you get <strong>cosine similarity</strong> <code>cos θ</code>, which is always between -1 and 1.</p>
      <div class="tip">This is the heart of attention. A transformer decides how much token A should "look at" token B by taking the <strong>dot product</strong> of a query vector and a key vector. A big dot product means "relevant". Keep the draggable demo below in mind when you get there.</div>

      <h3>Matrices: many dot products at once</h3>
      <p>A <strong>matrix</strong> is a grid of numbers, <code>rows × cols</code>. Multiplying a matrix by a vector is simply <strong>one dot product per row</strong>:</p>
      <pre><code>W = [[1, 2],       x = [3, 1]
     [0, 1],
     [3, 1]]
W x = [ [1,2]·x, [0,1]·x, [3,1]·x ] = [5, 1, 10]     shape (3,2)·(2) → (3)</code></pre>
      <p>So a matrix is a <strong>function that turns a 2-dim vector into a 3-dim vector</strong>. Neural network layers are exactly this.</p>
      <h3>The shape rule</h3>
      <p>Matrix × matrix <code>A @ B</code>: entry <code>C[i][j]</code> = row <code>i</code> of A · column <code>j</code> of B. The inner dimensions must match:</p>
      <pre><code>(n, k) @ (k, m) → (n, m)
 ↑   └─must match─┘   ↑
 rows of A        cols of B</code></pre>
      <div class="warn">Most real bugs in ML code are <strong>shape bugs</strong>. When reading transformer code, track shapes like <code>(tokens, d_model)</code> on every line. It's the single most useful habit.</div>
    `,
    examples: [
      {
        title: 'Drag the arrows: dot product & angle',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 640px; font: 14px system-ui, sans-serif; display: flex; gap: 14px; flex-wrap: wrap; }
    svg { background: #fafbff; border: 1px solid #dde; border-radius: 6px; touch-action: none; }
    .stats { min-width: 220px; line-height: 1.7; }
    .big { font-size: 20px; font-weight: 700; }
    .a { color: #d9480f; } .b { color: #1971c2; }
    .bar { height: 12px; background: #eee; border-radius: 6px; position: relative; margin-top: 4px; }
    .bar div { position: absolute; top: 0; bottom: 0; border-radius: 6px; }
  </style>
  <svg id="s" width="340" height="340" viewBox="0 0 340 340"></svg>
  <div class="stats">
    <div>Drag the arrow tips.</div>
    <div class="a">a = <span id="av"></span></div>
    <div class="b">b = <span id="bv"></span></div>
    <div>|a| = <span id="al"></span>, |b| = <span id="bl"></span></div>
    <div>angle θ = <span id="ang"></span></div>
    <div>a · b = <span class="big" id="dot"></span></div>
    <div style="font-size:12px;color:#555" id="calc"></div>
    <div>cosine similarity = <b id="cos"></b></div>
    <div class="bar"><div id="cbar"></div></div>
    <div style="font-size:12px;color:#555;display:flex;justify-content:space-between">
      <span>-1 opposite</span><span>0</span><span>+1 same</span></div>
  </div>
</div>
<script>
  const svg = document.getElementById('s');
  const U = 40; // pixels per unit
  const C = 170; // origin in pixels
  const v = { a: [3, 1], b: [1, 2.5] };
  const toPx = p => [C + p[0] * U, C - p[1] * U];

  function draw() {
    const a = v.a;
    const b = v.b;
    let s = '';
    for (let i = -4; i <= 4; i++) {
      s += '<line x1="' + (C + i * U) + '" y1="0" x2="' + (C + i * U) +
        '" y2="340" stroke="' + (i ? '#e6e8f0' : '#aab') + '"/>';
      s += '<line y1="' + (C + i * U) + '" x1="0" y2="' + (C + i * U) +
        '" x2="340" stroke="' + (i ? '#e6e8f0' : '#aab') + '"/>';
    }
    for (const [k, col] of [['a', '#d9480f'], ['b', '#1971c2']]) {
      const [x, y] = toPx(v[k]);
      s += '<line x1="' + C + '" y1="' + C + '" x2="' + x + '" y2="' + y +
        '" stroke="' + col + '" stroke-width="4"/>';
      s += '<circle data-k="' + k + '" cx="' + x + '" cy="' + y + '" r="10" fill="' + col +
        '" style="cursor:grab"/>';
      s += '<text x="' + (x + 12) + '" y="' + (y - 8) + '" fill="' + col +
        '" font-weight="700">' + k + '</text>';
    }
    svg.innerHTML = s;

    const dot = a[0] * b[0] + a[1] * b[1];
    const la = Math.hypot(a[0], a[1]);
    const lb = Math.hypot(b[0], b[1]);
    const cos = la && lb ? dot / (la * lb) : 0;
    const ang = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
    const f = n => n.toFixed(1);
    document.getElementById('av').textContent = '[' + f(a[0]) + ', ' + f(a[1]) + ']';
    document.getElementById('bv').textContent = '[' + f(b[0]) + ', ' + f(b[1]) + ']';
    document.getElementById('al').textContent = la.toFixed(2);
    document.getElementById('bl').textContent = lb.toFixed(2);
    document.getElementById('ang').textContent = ang.toFixed(0) + '°';
    document.getElementById('dot').textContent = dot.toFixed(2);
    document.getElementById('dot').style.color = dot > 0.05 ? '#2b8a3e' : dot < -0.05 ? '#c92a2a' : '#555';
    document.getElementById('calc').textContent =
      f(a[0]) + '×' + f(b[0]) + ' + ' + f(a[1]) + '×' + f(b[1]);
    document.getElementById('cos').textContent = cos.toFixed(3);
    const bar = document.getElementById('cbar');
    const mid = 50;
    const pos = 50 + cos * 50;
    bar.style.left = Math.min(mid, pos) + '%';
    bar.style.width = Math.abs(pos - mid) + '%';
    bar.style.background = cos >= 0 ? '#2b8a3e' : '#c92a2a';
  }

  let dragging = null;
  svg.addEventListener('pointerdown', e => {
    if (e.target.dataset.k) {
      dragging = e.target.dataset.k;
      svg.setPointerCapture(e.pointerId);
    }
  });
  svg.addEventListener('pointermove', e => {
    if (!dragging) return;
    const r = svg.getBoundingClientRect();
    const px = (e.clientX - r.left) * 340 / r.width;
    const py = (e.clientY - r.top) * 340 / r.height;
    // snap to 0.1 so numbers stay readable
    const x = Math.round((px - C) / U * 10) / 10;
    const y = Math.round((C - py) / U * 10) / 10;
    v[dragging] = [Math.max(-4, Math.min(4, x)), Math.max(-4, Math.min(4, y))];
    draw();
  });
  svg.addEventListener('pointerup', () => { dragging = null; });
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Make <code>a</code> and <code>b</code> perpendicular, e.g. <code>[2, 0]</code> and <code>[0, 3]</code>: dot = 0, cosine = 0.</li>
              <li>Point <code>b</code> the opposite way from <code>a</code>: the dot product goes negative.</li>
              <li>Keep the angle fixed and make <code>a</code> longer: the <strong>dot product grows</strong> but the <strong>cosine stays the same</strong>. The dot product mixes "direction agreement" with "size". This matters later: attention divides dot products by <code>√d</code> so they don't get too large when vectors have many dimensions.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Matrix multiply = a grid of dot products (with shapes)',
        lang: 'js',
        code: `function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function shape(M) {
  return '(' + M.length + ', ' + M[0].length + ')';
}

// C = A @ B : row i of A dotted with column j of B
function matmul(A, B) {
  const n = A.length; // rows of A
  const k = A[0].length; // cols of A (must equal rows of B)
  const m = B[0].length; // cols of B
  if (B.length !== k) {
    throw new Error('shape mismatch: ' + shape(A) + ' @ ' + shape(B));
  }
  const C = [];
  for (let i = 0; i < n; i++) {
    C.push([]);
    for (let j = 0; j < m; j++) {
      const col = B.map(row => row[j]); // ① column j of B
      C[i].push(dot(A[i], col)); // ② one dot product per output cell
    }
  }
  return C;
}

// 2 "tokens", each a 3-dim vector (one per row)
const X = [
  [1, 0, 2],
  [0, 1, 1],
];
// weight matrix: maps 3 dims -> 2 dims
const W = [
  [1, 2],
  [0, 1],
  [3, 1],
];

console.log('X shape', shape(X), ' W shape', shape(W));
const Y = matmul(X, W); // ③ (2,3) @ (3,2) -> (2,2)
console.log('Y shape', shape(Y));
console.log('Y =', JSON.stringify(Y));
console.log('Y[0][0] = 1*1 + 0*0 + 2*3 =', dot(X[0], [1, 0, 3]));

try {
  matmul(W, W); // ④ (3,2) @ (3,2): inner dims 2 vs 3
} catch (e) {
  console.log('Error:', e.message);
}`,
        explain: `
          <details>
            <summary>The problem: why do shapes matter so much?</summary>
            <p>In a transformer, a sentence of <code>T</code> tokens is stored as a matrix <code>X</code> of shape <code>(T, d)</code>: one row per token, <code>d</code> numbers per token. A layer with weights <code>W</code> of shape <code>(d, d_out)</code> transforms <strong>every token at once</strong> with a single <code>X @ W</code>. That's why GPUs are so good at this: it's one big grid of independent dot products.</p>
            <p>Here <code>X</code> is 2 tokens × 3 dims and <code>W</code> maps 3 dims → 2 dims. The inner 3s match, so the result is <code>(2, 2)</code>: still 2 tokens, now 2 dims each.</p>
          </details>
          <details>
            <summary>Step by step: every cell of <code>Y = X @ W</code></summary>
            <table>
              <tr><th>Cell</th><th>Row of X</th><th>Column of W</th><th>Dot product</th><th>Value</th></tr>
              <tr><td><code>Y[0][0]</code></td><td>[1, 0, 2]</td><td>[1, 0, 3]</td><td>1·1 + 0·0 + 2·3</td><td><b>7</b></td></tr>
              <tr><td><code>Y[0][1]</code></td><td>[1, 0, 2]</td><td>[2, 1, 1]</td><td>1·2 + 0·1 + 2·1</td><td><b>4</b></td></tr>
              <tr><td><code>Y[1][0]</code></td><td>[0, 1, 1]</td><td>[1, 0, 3]</td><td>0·1 + 1·0 + 1·3</td><td><b>3</b></td></tr>
              <tr><td><code>Y[1][1]</code></td><td>[0, 1, 1]</td><td>[2, 1, 1]</td><td>0·2 + 1·1 + 1·1</td><td><b>2</b></td></tr>
            </table>
            <p>Console output:</p>
            <pre><code>X shape (2, 3)  W shape (3, 2)
Y shape (2, 2)
Y = [[7,4],[3,2]]
Y[0][0] = 1*1 + 0*0 + 2*3 = 7
Error: shape mismatch: (3, 2) @ (3, 2)</code></pre>
          </details>
          <details>
            <summary>Key lines explained ①②③④</summary>
            <ol>
              <li><strong>①</strong> <code>B.map(row =&gt; row[j])</code> pulls out column <code>j</code> of B as a plain vector.</li>
              <li><strong>②</strong> Each output cell is <em>one</em> dot product. <code>(n,k)@(k,m)</code> needs <code>n·m</code> dot products of length <code>k</code>, which is <code>n·m·k</code> multiplications. That count is what makes big models expensive.</li>
              <li><strong>③</strong> Shape check: <code>(2,3) @ (3,2)</code>. Inner 3 = 3 ✓, outer gives <code>(2,2)</code>.</li>
              <li><strong>④</strong> <code>(3,2) @ (3,2)</code>: the inner dims are 2 vs 3, so each row of the first matrix (length 2) can't be dotted with a column of the second (length 3). Libraries like PyTorch throw the same kind of error.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn"><code>A @ B</code> is <strong>not</strong> the same as <code>B @ A</code>. Often only one of them is even valid. Also, <code>A @ B</code> (matrix product) is different from <code>A * B</code> in NumPy/PyTorch, which is <em>element-wise</em> multiplication.</div>
            <p>Try this: change <code>W</code> to have 4 columns (add a number to each row). <code>Y</code> becomes <code>(2, 4)</code>: the number of tokens stays the same and only the per-token dimension changes.</p>
          </details>
        `,
      },
    ],
    quiz: [
      { q: '<code>[2, 1] · [1, -2]</code> = ?', options: ['0', '4', '-1', '3'], answer: 0, why: '2·1 + 1·(-2) = 0. The vectors are perpendicular.' },
      {
        q: 'Two vectors point in nearly opposite directions. Their dot product is…',
        options: ['Large positive', 'Close to zero', 'Negative', 'Always exactly -1'],
        answer: 2,
        why: 'cos θ is near -1, so the dot product is negative. Only <em>cosine similarity</em> is limited to [-1, 1]. The raw dot product also scales with the vector lengths.',
      },
      {
        q: 'Shape of <code>(4, 8) @ (8, 16)</code>?',
        options: ['(8, 8)', '(4, 16)', '(16, 4)', 'Invalid'],
        answer: 1,
        why: 'Inner dims 8 = 8 match. The result takes the outer dims: (4, 16).',
      },
      {
        q: 'A matrix <code>W</code> of shape <code>(3, 5)</code> times a vector of length 5 gives…',
        options: ['A vector of length 3 (3 dot products)', 'A vector of length 5', 'A single number', 'A (5, 3) matrix'],
        answer: 0,
        why: 'Each of the 3 rows is dotted with the length-5 vector, giving 3 numbers.',
      },
      {
        q: 'Why does attention use dot products?',
        options: [
          'They are the only operation GPUs support',
          'They measure how aligned (similar) a query and a key vector are',
          'They normalize vectors to length 1',
          'They make vectors perpendicular',
        ],
        answer: 1,
        why: 'Similar direction → big dot product → "pay attention". You will see <code>Q @ Kᵀ</code> as a matrix of dot products between every pair of tokens.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Toy word embeddings (made up, 3 dims). Implement <code>dot</code>, <code>norm</code> and <code>cosine</code>, then print the cosine similarity between <code>"cat"</code> and every other word, <strong>sorted from most to least similar</strong>. You should find "dog" at the top and "car" at the bottom.</p>`,
      starter: `const emb = {
  cat: [0.9, 0.8, 0.1],
  dog: [0.8, 0.9, 0.2],
  kitten: [0.95, 0.6, 0.05],
  car: [-0.2, 0.1, 0.95],
  banana: [0.1, -0.5, 0.3],
};

function dot(a, b) {
  return 0; // TODO
}

function norm(a) {
  return 1; // TODO: length of a = sqrt(a · a)
}

function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b));
}

const results = Object.keys(emb)
  .filter(w => w !== 'cat')
  .map(w => ({ word: w, sim: cosine(emb.cat, emb[w]) }));
// TODO: sort results by sim, highest first
for (const r of results) console.log(r.word, r.sim.toFixed(3));`,
      hint: '<code>dot</code>: loop and sum <code>a[i]*b[i]</code>. <code>norm</code>: <code>Math.sqrt(dot(a, a))</code>. Sort with <code>results.sort((x, y) =&gt; y.sim - x.sim)</code>.',
      solution: `const emb = {
  cat: [0.9, 0.8, 0.1],
  dog: [0.8, 0.9, 0.2],
  kitten: [0.95, 0.6, 0.05],
  car: [-0.2, 0.1, 0.95],
  banana: [0.1, -0.5, 0.3],
};

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(a) {
  return Math.sqrt(dot(a, a));
}

function cosine(a, b) {
  return dot(a, b) / (norm(a) * norm(b));
}

const results = Object.keys(emb)
  .filter(w => w !== 'cat')
  .map(w => ({ word: w, sim: cosine(emb.cat, emb[w]) }));
results.sort((x, y) => y.sim - x.sim);
for (const r of results) console.log(r.word, r.sim.toFixed(3));`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'models-params',
    section: 'ML Foundations',
    title: 'A Model Is a Function with Knobs',
    explain: `
      <p>Strip away the hype and a model is a <strong>function</strong>: numbers in, numbers out. What makes it a <em>model</em> is that its behaviour depends on <strong>parameters</strong>, knobs we can turn.</p>
      <p>The simplest useful model is a line:</p>
      <pre><code>ŷ = w · x + b</code></pre>
      <ul>
        <li><code>x</code>: the input (feature), e.g. house size.</li>
        <li><code>ŷ</code> ("y-hat"): the model's <em>prediction</em>. <code>y</code> without the hat is the true answer.</li>
        <li><code>w</code> (weight): the slope. How much the output changes per unit of input.</li>
        <li><code>b</code> (bias): the intercept. The output when <code>x = 0</code>.</li>
      </ul>
      <p>Two knobs. Different settings give different lines, and <em>learning</em> means picking the setting that fits the data best. To say what "best" means we need a number that scores the fit. That's the <strong>loss</strong>. Here we use the mean squared error (MSE): the average of <code>(ŷ - y)²</code> over all points.</p>
      <h3>From 2 knobs to billions</h3>
      <p>With many inputs, <code>w · x</code> becomes a <strong>dot product</strong> of a weight vector and an input vector. With many outputs, <code>W</code> becomes a <strong>matrix</strong>: <code>ŷ = W x + b</code>. That's a <em>linear layer</em>, the most common building block in a transformer. A GPT-2-small feed-forward layer maps 768 → 3072 numbers: <code>768 × 3072 + 3072 = 2,362,368</code> parameters in one layer.</p>
      <div class="tip">Everything an LLM "knows" is stored in these parameters. The architecture is the <em>shape</em> of the function. The parameters are the <em>values</em> that training finds.</div>
    `,
    examples: [
      {
        title: 'Turn the knobs: fit a line, watch the loss',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 640px; font: 14px system-ui, sans-serif; }
    .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    input[type=range] { width: 170px; }
    .loss { font-size: 18px; font-weight: 700; }
  </style>
  <div style="color:#555">Drag <b>w</b> and <b>b</b> to fit the line to the dots. Try to get the MSE as low
    as you can, then compare with <b>Show best fit</b>.</div>
  <svg id="s" width="620" height="260" viewBox="0 0 620 260"></svg>
  <div class="row">
    <label>w (slope) <input id="w" type="range" min="-1" max="3" step="0.05" value="0.5">
      <b id="wv"></b></label>
    <label>b (bias) <input id="b" type="range" min="-3" max="5" step="0.1" value="0">
      <b id="bv"></b></label>
  </div>
  <div class="row">
    <span>ŷ = <span id="eq"></span></span>
    <span class="loss">MSE = <span id="mse"></span></span>
    <button id="best">Show best fit</button>
  </div>
</div>
<script>
  const pts = [[0.5, 1.6], [1, 2.2], [1.8, 3.9], [2.5, 3.8], [3, 5.2],
    [3.8, 5.9], [4.5, 7.4], [5.2, 7.6], [6, 9.3]];
  const svg = document.getElementById('s');
  const W = document.getElementById('w');
  const B = document.getElementById('b');
  const X = x => 40 + x * 90; // x in [0, 6.4]
  const Y = y => 240 - y * 20; // y in [0, 11.5]

  function mse(w, b) {
    let s = 0;
    for (const [x, y] of pts) s += (w * x + b - y) ** 2;
    return s / pts.length;
  }

  function draw() {
    const w = +W.value;
    const b = +B.value;
    let s = '<line x1="40" y1="240" x2="610" y2="240" stroke="#999"/>' +
      '<line x1="40" y1="10" x2="40" y2="240" stroke="#999"/>';
    for (let x = 0; x <= 6; x++) {
      s += '<text x="' + X(x) + '" y="254" font-size="11" text-anchor="middle">' + x + '</text>';
    }
    for (let y = 0; y <= 10; y += 2) {
      s += '<text x="32" y="' + (Y(y) + 4) + '" font-size="11" text-anchor="end">' + y + '</text>';
    }
    // residuals: vertical gap between prediction and truth
    for (const [x, y] of pts) {
      s += '<line x1="' + X(x) + '" y1="' + Y(y) + '" x2="' + X(x) + '" y2="' + Y(w * x + b) +
        '" stroke="#e8590c" stroke-dasharray="4 3"/>';
    }
    s += '<line x1="' + X(0) + '" y1="' + Y(b) + '" x2="' + X(6.3) + '" y2="' + Y(w * 6.3 + b) +
      '" stroke="#1971c2" stroke-width="3"/>';
    for (const [x, y] of pts) {
      s += '<circle cx="' + X(x) + '" cy="' + Y(y) + '" r="5" fill="#222"/>';
    }
    s += '<text x="60" y="24" font-size="12" fill="#e8590c">dashed = error (ŷ - y) for each point</text>';
    svg.innerHTML = s;
    document.getElementById('wv').textContent = w.toFixed(2);
    document.getElementById('bv').textContent = b.toFixed(1);
    document.getElementById('eq').textContent = w.toFixed(2) + '·x + ' + b.toFixed(1);
    document.getElementById('mse').textContent = mse(w, b).toFixed(3);
  }

  // Closed-form least squares (only possible for simple models like this one)
  document.getElementById('best').onclick = () => {
    const n = pts.length;
    const mx = pts.reduce((s, p) => s + p[0], 0) / n;
    const my = pts.reduce((s, p) => s + p[1], 0) / n;
    let num = 0;
    let den = 0;
    for (const [x, y] of pts) {
      num += (x - mx) * (y - my);
      den += (x - mx) ** 2;
    }
    const w = num / den;
    const b = my - w * mx;
    console.log('best fit: w=' + w.toFixed(3) + ' b=' + b.toFixed(3) +
      ' mse=' + mse(w, b).toFixed(3));
    W.value = w;
    B.value = b;
    draw();
  };
  W.oninput = draw;
  B.oninput = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Tune the sliders by hand until the MSE is below <code>0.3</code>. Notice how you do it: "the line is too low → raise <code>b</code>", "too flat → raise <code>w</code>". You're following the <em>direction that lowers the loss</em>. Gradient descent does exactly that, but with calculus.</li>
              <li>Click <em>Show best fit</em>. The slider snaps to the nearest step, so the MSE you see may be a hair above the exact optimum printed in the console.</li>
              <li>Squared error punishes big misses: one point off by 2 costs 4, while two points off by 1 cost only 2 in total.</li>
            </ul>
            <div class="tip">The "best fit" button uses a closed-form formula that only exists for linear models. Neural nets have no such formula, so they are always trained iteratively with gradient descent.</div>
          </details>
        `,
      },
      {
        title: 'Counting parameters in linear layers',
        lang: 'js',
        code: `// A linear layer: y = W x + b, W is (outDim, inDim), b is (outDim)
function linearParams(inDim, outDim) {
  return inDim * outDim + outDim;
}

// Our line: 1 input -> 1 output
console.log('line y = w*x + b:', linearParams(1, 1), 'params');

// A small classifier: 4 features -> 3 classes
console.log('4 -> 3 layer:', linearParams(4, 3), 'params');

// GPT-2 small feed-forward block: 768 -> 3072 -> 768
const up = linearParams(768, 3072);
const down = linearParams(3072, 768);
console.log('FFN up  :', up.toLocaleString('en-US'));
console.log('FFN down:', down.toLocaleString('en-US'));
console.log('one FFN :', (up + down).toLocaleString('en-US'), 'params');
console.log('x 12 layers:', (12 * (up + down)).toLocaleString('en-US'), 'params');`,
      },
    ],
    quiz: [
      { q: 'In <code>ŷ = w·x + b</code>, which are the parameters?', options: ['x and ŷ', 'w and b', 'Only x', 'ŷ and b'], answer: 1, why: '<code>x</code> is the input and <code>ŷ</code> the output. <code>w</code> and <code>b</code> are the knobs that training adjusts.' },
      { q: 'What does the bias <code>b</code> do to the line?', options: ['Changes the slope', 'Shifts it up/down', 'Squares the output', 'Nothing'], answer: 1, why: '<code>b</code> is the value of ŷ at x = 0. Changing it moves the whole line up or down.' },
      { q: 'A linear layer from 10 inputs to 5 outputs has how many parameters?', options: ['15', '50', '55', '60'], answer: 2, why: '10 × 5 weights + 5 biases = 55.' },
      {
        q: 'Why do we need a loss function at all?',
        options: ['To make the model run faster', 'To turn "how good is this fit?" into a single number we can minimize', 'To store the parameters', 'To pick the input features'],
        answer: 1,
        why: 'Optimization needs one number to push down. The loss is that number.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement <code>predict(w, b, x)</code> and <code>mse(w, b, data)</code>. Then change <code>w</code> and <code>b</code> by hand (no loops!) until the MSE is below <code>0.1</code>. Hint: look at the data. By how much does <code>y</code> grow when <code>x</code> grows by 1?</p>`,
      starter: `const data = [[0, -1.1], [1, 0.4], [2, 2.1], [3, 3.4], [4, 5.0], [5, 6.6]];

function predict(w, b, x) {
  return 0; // TODO
}

function mse(w, b, data) {
  // TODO: average of (predict - y)^2
  return NaN;
}

const w = 0;
const b = 0;
console.log('w=' + w + ' b=' + b + ' mse=' + mse(w, b, data).toFixed(3));`,
      hint: 'y goes up by about 1.5 per step of x, and at x = 0 it is about -1. Try w = 1.5, b = -1.',
      solution: `const data = [[0, -1.1], [1, 0.4], [2, 2.1], [3, 3.4], [4, 5.0], [5, 6.6]];

function predict(w, b, x) {
  return w * x + b;
}

function mse(w, b, data) {
  let s = 0;
  for (const [x, y] of data) s += (predict(w, b, x) - y) ** 2;
  return s / data.length;
}

const w = 1.5;
const b = -1;
console.log('w=' + w + ' b=' + b + ' mse=' + mse(w, b, data).toFixed(3));`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'loss',
    section: 'ML Foundations',
    title: 'Loss Functions',
    explain: `
      <p>A <strong>loss function</strong> takes the model's prediction and the true answer and returns one number: <strong>how wrong</strong>. Lower is better. Training = making this number small on average across the data.</p>

      <h3>Mean Squared Error (regression)</h3>
      <p>When the answer is a number (price, temperature):</p>
      <pre><code>MSE = average of (ŷ - y)²</code></pre>
      <p>Squaring makes errors positive and punishes big misses much more than small ones.</p>

      <h3>Cross-entropy (classification, and LLMs)</h3>
      <p>When the answer is a <em>category</em> ("cat / dog / bird", or "which of 50,000 tokens comes next"), the model outputs a <strong>probability for every option</strong>. The loss only looks at the probability the model gave to the <strong>correct</strong> answer:</p>
      <pre><code>loss = -log( p_correct )</code></pre>
      <ul>
        <li>Model gave the right answer <code>p = 1.0</code> → loss = <code>-log(1) = 0</code>. Perfect.</li>
        <li><code>p = 0.5</code> → loss ≈ <code>0.69</code>.</li>
        <li><code>p = 0.01</code> (confidently wrong) → loss ≈ <code>4.61</code>. As p → 0 the loss → ∞.</li>
      </ul>
      <p>(<code>log</code> here is the natural log, <code>Math.log</code>.) Why not just use <code>1 - p</code>? Because <code>-log</code> punishes <em>confident mistakes</em> very harshly, and its gradient stays strong when the model is badly wrong, so learning doesn't stall. Mathematically it's also the "maximum likelihood" choice: minimizing average <code>-log p</code> means maximizing the probability the model assigns to the real data.</p>
      <div class="tip"><strong>The LLM training loss is exactly this.</strong> At every position in the text, the model outputs a probability distribution over the vocabulary, and the loss is <code>-log(p of the actual next token)</code>, averaged over all positions. A model that guesses uniformly over a 50,257-token vocabulary has loss <code>ln(50257) ≈ 10.82</code>. Good LLMs get down to roughly 2 or lower. You'll also see <em>perplexity</em> = <code>e<sup>loss</sup></code>: "how many tokens the model is effectively choosing between".</div>
      <div class="warn">Never compute <code>Math.log(0)</code>: it's <code>-Infinity</code>, so the loss becomes <code>Infinity</code> (and later <code>NaN</code>). Real code works in log-space or clamps probabilities (e.g. <code>Math.max(p, 1e-12)</code>).</div>
    `,
    examples: [
      {
        title: 'Slide the predicted probability: cross-entropy vs squared error',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 640px; font: 14px system-ui, sans-serif; }
    .row { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; margin: 6px 0; }
    input[type=range] { width: 260px; }
    .ce { color: #c2255c; font-weight: 700; } .se { color: #1971c2; font-weight: 700; }
  </style>
  <div style="color:#555;font-size:13px">Drag the slider: how much probability did the model give the right answer?
    Compare how the two losses react.</div>
  <div class="row">
    <label>Probability given to the <b>correct</b> answer: p =
      <input id="p" type="range" min="0.01" max="1" step="0.01" value="0.5"> <b id="pv"></b></label>
  </div>
  <svg id="s" width="620" height="270" viewBox="0 0 620 270"></svg>
  <div class="row">
    <span class="ce">cross-entropy −log(p) = <span id="ce"></span></span>
    <span class="se">squared error (1 − p)² = <span id="se"></span></span>
  </div>
  <div id="note" style="color:#555;font-size:13px"></div>
</div>
<script>
  const svg = document.getElementById('s');
  const P = document.getElementById('p');
  const X = p => 50 + p * 550;
  const Y = l => 240 - l * 46; // loss 0..5

  function curve(fn) {
    let d = '';
    for (let p = 0.01; p <= 1.0001; p += 0.005) {
      const y = Math.max(8, Y(fn(p)));
      d += (d ? 'L' : 'M') + X(p).toFixed(1) + ' ' + y.toFixed(1);
    }
    return d;
  }

  function draw() {
    const p = +P.value;
    const ce = -Math.log(p);
    const se = (1 - p) ** 2;
    let s = '<line x1="50" y1="240" x2="610" y2="240" stroke="#999"/>' +
      '<line x1="50" y1="8" x2="50" y2="240" stroke="#999"/>';
    for (let t = 0; t <= 10; t += 2) {
      s += '<text x="' + X(t / 10) + '" y="256" font-size="11" text-anchor="middle">' +
        (t / 10) + '</text>';
    }
    for (let l = 0; l <= 5; l++) {
      s += '<text x="42" y="' + (Y(l) + 4) + '" font-size="11" text-anchor="end">' + l + '</text>';
    }
    s += '<text x="330" y="270" font-size="12" text-anchor="middle">p (correct answer)</text>';
    s += '<path d="' + curve(q => -Math.log(q)) + '" fill="none" stroke="#c2255c" stroke-width="3"/>';
    s += '<path d="' + curve(q => (1 - q) ** 2) + '" fill="none" stroke="#1971c2" stroke-width="3"/>';
    s += '<line x1="' + X(p) + '" y1="8" x2="' + X(p) + '" y2="240" stroke="#aaa" stroke-dasharray="4 3"/>';
    s += '<circle cx="' + X(p) + '" cy="' + Math.max(8, Y(ce)) + '" r="6" fill="#c2255c"/>';
    s += '<circle cx="' + X(p) + '" cy="' + Y(se) + '" r="6" fill="#1971c2"/>';
    svg.innerHTML = s;
    document.getElementById('pv').textContent = p.toFixed(2);
    document.getElementById('ce').textContent = ce.toFixed(3);
    document.getElementById('se').textContent = se.toFixed(3);
    document.getElementById('note').textContent = p < 0.1
      ? 'Confidently wrong: cross-entropy explodes, squared error stays below 1.'
      : p > 0.9 ? 'Nearly right: both losses are close to 0.'
      : 'Move p toward 0 and watch the pink curve shoot up.';
  }
  P.oninput = draw;
  draw();
</script>`,
      },
      {
        title: 'Computing MSE and cross-entropy by hand',
        lang: 'js',
        code: `// Regression: predicted vs true numbers
const yTrue = [3.0, -0.5, 2.0];
const yPred = [2.5, 0.0, 2.0];
let se = 0;
for (let i = 0; i < yTrue.length; i++) se += (yPred[i] - yTrue[i]) ** 2;
console.log('MSE =', (se / yTrue.length).toFixed(4));

// Classification: the model outputs probabilities over 3 classes
const classes = ['cat', 'dog', 'bird'];
function crossEntropy(probs, correct) {
  return -Math.log(probs[correct]); // only the correct class matters
}

const cases = [
  { probs: [0.7, 0.2, 0.1], correct: 0 }, // confident & right
  { probs: [0.4, 0.3, 0.3], correct: 0 }, // unsure & right
  { probs: [0.1, 0.8, 0.1], correct: 0 }, // confident & wrong
  { probs: [1 / 3, 1 / 3, 1 / 3], correct: 2 }, // uniform guess
];
for (const c of cases) {
  console.log(
    'probs=' + JSON.stringify(c.probs.map(p => +p.toFixed(2))) +
    ' correct=' + classes[c.correct] +
    ' loss=' + crossEntropy(c.probs, c.correct).toFixed(3)
  );
}
console.log('uniform over 50257 tokens: loss =', Math.log(50257).toFixed(2));`,
      },
    ],
    quiz: [
      { q: 'The model gives the correct class probability 1.0. Cross-entropy loss is…', options: ['1', '0', '∞', '-1'], answer: 1, why: '-log(1) = 0.' },
      {
        q: 'Which prediction gets the <strong>highest</strong> cross-entropy loss?',
        options: ['p_correct = 0.9', 'p_correct = 0.5', 'p_correct = 0.3', 'p_correct = 0.01'],
        answer: 3,
        why: '-log(0.01) ≈ 4.61, much larger than -log(0.3) ≈ 1.20. Confident mistakes are punished hardest.',
      },
      {
        q: 'For an LLM, cross-entropy at each position is computed from…',
        options: [
          'The probabilities of all tokens averaged',
          'The probability assigned to the actual next token in the text',
          'The squared difference between token IDs',
          'The number of tokens in the vocabulary only',
        ],
        answer: 1,
        why: 'The loss is <code>-log p(actual next token)</code>. Token IDs are arbitrary labels, so taking differences between them (like MSE) would be meaningless.',
      },
      { q: 'MSE of predictions [1, 2] vs truth [0, 4]?', options: ['1.5', '2.5', '5', '3'], answer: 1, why: '((1-0)² + (2-4)²)/2 = (1 + 4)/2 = 2.5.' },
    ],
    exercise: {
      lang: 'js',
      task: `<p>An LLM predicted a distribution over a tiny 4-token vocabulary at 3 positions. Implement <code>avgCrossEntropy(batch)</code> that returns the <strong>mean</strong> of <code>-log(probs[target])</code> over the batch, and print it along with the <strong>perplexity</strong> <code>Math.exp(loss)</code>. Clamp probabilities to at least <code>1e-12</code> so a 0 never gives Infinity.</p>`,
      starter: `const vocab = ['the', 'cat', 'sat', 'mat'];
const batch = [
  { probs: [0.1, 0.6, 0.2, 0.1], target: 1 }, // after "the" -> "cat"
  { probs: [0.05, 0.05, 0.8, 0.1], target: 2 }, // after "the cat" -> "sat"
  { probs: [0.5, 0.2, 0.3, 0.0], target: 3 }, // oops: model gave "mat" 0!
];

function avgCrossEntropy(batch) {
  // TODO
  return NaN;
}

const loss = avgCrossEntropy(batch);
console.log('loss =', loss.toFixed(3));
console.log('perplexity =', Math.exp(loss).toFixed(2));`,
      hint: 'Sum <code>-Math.log(Math.max(item.probs[item.target], 1e-12))</code> over items, then divide by <code>batch.length</code>.',
      solution: `const vocab = ['the', 'cat', 'sat', 'mat'];
const batch = [
  { probs: [0.1, 0.6, 0.2, 0.1], target: 1 }, // after "the" -> "cat"
  { probs: [0.05, 0.05, 0.8, 0.1], target: 2 }, // after "the cat" -> "sat"
  { probs: [0.5, 0.2, 0.3, 0.0], target: 3 }, // oops: model gave "mat" 0!
];

function avgCrossEntropy(batch) {
  let total = 0;
  for (const item of batch) {
    const p = Math.max(item.probs[item.target], 1e-12);
    total += -Math.log(p);
  }
  return total / batch.length;
}

const loss = avgCrossEntropy(batch);
console.log('loss =', loss.toFixed(3));
console.log('perplexity =', Math.exp(loss).toFixed(2));
// One zero-probability mistake dominates the whole average:
// that's how harshly cross-entropy punishes confident errors.`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'gradient-descent',
    section: 'ML Foundations',
    title: 'Gradient Descent',
    explain: `
      <p>We have a loss that measures how wrong the model is. Now we need to find parameters that make it small. Trying every value is impossible with millions of parameters, so we use a smarter trick: <strong>follow the slope downhill</strong>.</p>
      <p>Imagine standing on a foggy hillside. You can't see the valley, but you can feel which way the ground tilts under your feet. Take a step downhill. Repeat. That's gradient descent.</p>

      <h3>The slope is the derivative</h3>
      <p>The <strong>derivative</strong> <code>dL/dw</code> tells you how much the loss changes when you nudge <code>w</code> a tiny bit:</p>
      <ul>
        <li><code>dL/dw &gt; 0</code>: increasing w increases the loss → move w <strong>left</strong> (decrease it).</li>
        <li><code>dL/dw &lt; 0</code>: increasing w decreases the loss → move w <strong>right</strong>.</li>
        <li><code>dL/dw = 0</code>: flat, you're at a minimum (or a plateau).</li>
      </ul>
      <p>Either way: <strong>step in the opposite direction of the derivative</strong>.</p>
      <pre><code>w_new = w - lr * dL/dw</code></pre>
      <p><code>lr</code> is the <strong>learning rate</strong>: how big a step to take. It's the most important "hyperparameter" (a setting <em>you</em> choose, not one the model learns).</p>
      <p>Running example: <code>L(w) = (w - 3)²</code>. The best value is obviously <code>w = 3</code>, and the derivative is <code>dL/dw = 2(w - 3)</code>.</p>

      <h3>Many parameters → the gradient</h3>
      <p>With many parameters, take the derivative with respect to each one. Together they form the <strong>gradient</strong> vector <code>∇L = [∂L/∂w₁, ∂L/∂w₂, …]</code>, which points in the direction of steepest <em>increase</em>. We step against it: <code>θ ← θ - lr · ∇L</code>. An LLM with 7 billion parameters does exactly this, just with a 7-billion-long gradient vector, computed efficiently by <em>backpropagation</em> (coming up in the Neural Networks section).</p>
      <div class="warn">The learning rate is a balancing act. <strong>Too small</strong>: training crawls. <strong>Too big</strong>: each step overshoots the valley, and the loss bounces around or <strong>explodes</strong> (in real training you'll see the loss jump to <code>NaN</code>).</div>
    `,
    examples: [
      {
        title: 'Step through gradient descent on a loss curve',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    table { border-collapse: collapse; font: 12px ui-monospace, monospace; }
    td, th { border: 1px solid #ddd; padding: 2px 8px; text-align: right; }
    th { background: #f3f4f8; }
    .wrap { display: flex; gap: 10px; }
    #status { font-weight: 600; }
  </style>
  <div style="color:#555">Pick a learning rate (slider or preset), then press <b>Step</b> to take one
    gradient step from w = 0. Red dot = current w, blue line = slope.</div>
  <div class="row">
    <label>learning rate <input id="lr" type="range" min="0.01" max="1.1" step="0.01" value="0.1">
      <b id="lrv"></b></label>
    <button data-lr="0.02">too small</button>
    <button data-lr="0.3">good</button>
    <button data-lr="0.95">zig-zag</button>
    <button data-lr="1.05">diverge</button>
  </div>
  <div class="row">
    <button id="step">Step ▶</button>
    <button id="play">Run 10 steps</button>
    <button id="reset">Reset (w = 0)</button>
    <span id="status"></span>
  </div>
  <div class="wrap">
    <svg id="s" width="390" height="300" viewBox="0 0 390 300"></svg>
    <table id="tbl"></table>
  </div>
</div>
<script>
  const loss = w => (w - 3) ** 2;
  const grad = w => 2 * (w - 3);
  const svg = document.getElementById('s');
  const lrIn = document.getElementById('lr');
  const X = w => 20 + (w + 4) * 25; // w in [-4, 10]
  const Y = l => 280 - l * 5.4; // loss in [0, 50]
  let path = [0];
  let rows = [];
  let timer = null;

  function draw() {
    const lr = +lrIn.value;
    document.getElementById('lrv').textContent = lr.toFixed(2);
    let s = '<line x1="20" y1="280" x2="370" y2="280" stroke="#999"/>';
    for (let w = -4; w <= 10; w += 2) {
      s += '<text x="' + X(w) + '" y="294" font-size="10" text-anchor="middle">' + w + '</text>';
    }
    let d = '';
    for (let w = -4; w <= 10.001; w += 0.1) {
      d += (d ? 'L' : 'M') + X(w).toFixed(1) + ' ' + Y(loss(w)).toFixed(1);
    }
    s += '<path d="' + d + '" fill="none" stroke="#868e96" stroke-width="2"/>';
    s += '<text x="' + X(3) + '" y="274" font-size="10" text-anchor="middle" fill="#2b8a3e">min</text>';
    // path of the ball
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1];
      const b = path[i];
      if (Math.abs(a) > 12 || Math.abs(b) > 12) break;
      s += '<line x1="' + X(a) + '" y1="' + Y(loss(a)) + '" x2="' + X(b) + '" y2="' + Y(loss(b)) +
        '" stroke="#f08c00" stroke-width="1.5" stroke-dasharray="3 2"/>';
    }
    path.forEach((w, i) => {
      if (w < -4 || w > 10) return;
      const last = i === path.length - 1;
      s += '<circle cx="' + X(w) + '" cy="' + Y(loss(w)) + '" r="' + (last ? 7 : 3.5) +
        '" fill="' + (last ? '#e03131' : '#f08c00') + '"/>';
    });
    // tangent line at current w: shows the slope
    const w = path[path.length - 1];
    if (w >= -4 && w <= 10) {
      const g = grad(w);
      const x1 = w - 1.5;
      const x2 = w + 1.5;
      s += '<line x1="' + X(x1) + '" y1="' + Y(loss(w) + g * (x1 - w)) + '" x2="' + X(x2) +
        '" y2="' + Y(loss(w) + g * (x2 - w)) + '" stroke="#1971c2" stroke-width="2"/>';
    }
    svg.innerHTML = s;

    let t = '<tr><th>step</th><th>w</th><th>grad</th><th>new w</th><th>loss</th></tr>';
    for (const r of rows.slice(-10)) {
      t += '<tr><td>' + r.step + '</td><td>' + r.w.toFixed(3) + '</td><td>' + r.g.toFixed(3) +
        '</td><td>' + r.nw.toFixed(3) + '</td><td>' + loss(r.nw).toFixed(3) + '</td></tr>';
    }
    document.getElementById('tbl').innerHTML = t;
    const factor = 1 - 2 * lr;
    let msg = 'distance to min is multiplied by (1 − 2·lr) = ' + factor.toFixed(2) + ' each step';
    if (Math.abs(w) > 1e6) msg = 'DIVERGED: w = ' + w.toExponential(2);
    else if (w < -4 || w > 10) msg = 'w = ' + w.toFixed(2) + ' flew off the chart!';
    document.getElementById('status').textContent = msg;
  }

  function step() {
    const lr = +lrIn.value;
    const w = path[path.length - 1];
    const g = grad(w);
    const nw = w - lr * g;
    rows.push({ step: rows.length + 1, w, g, nw });
    path.push(nw);
    draw();
  }

  function reset() {
    clearInterval(timer);
    path = [0];
    rows = [];
    draw();
  }

  document.getElementById('step').onclick = step;
  document.getElementById('reset').onclick = reset;
  document.getElementById('play').onclick = () => {
    clearInterval(timer);
    let n = 0;
    timer = setInterval(() => {
      step();
      if (++n >= 10) clearInterval(timer);
    }, 300);
  };
  for (const btn of document.querySelectorAll('[data-lr]')) {
    btn.onclick = () => {
      lrIn.value = btn.dataset.lr;
      reset();
    };
  }
  lrIn.oninput = reset;
  draw();
</script>`,
        explain: `
          <details>
            <summary>What you're looking at</summary>
            <p>The grey curve is <code>L(w) = (w - 3)²</code>. The red dot is the current <code>w</code> (starting at 0). The blue line is the <strong>tangent</strong>: its slope is the gradient <code>2(w - 3)</code>. Each <em>Step</em> runs exactly <code>w = w - lr * grad(w)</code> and adds a row to the table.</p>
            <p>With <code>lr = 0.1</code> the first rows are: <code>0.000 → 0.600 → 1.080 → 1.464 …</code>. They're identical to the console output of the code example below.</p>
          </details>
          <details>
            <summary>Why the learning rate has "regimes": the factor <code>(1 − 2·lr)</code></summary>
            <p>For this curve we can solve the update exactly. Let <code>d = w - 3</code> be the distance to the minimum:</p>
            <pre><code>w_new - 3 = (w - 3) - lr * 2(w - 3) = (1 - 2·lr) · (w - 3)</code></pre>
            <table>
              <tr><th>lr</th><th>factor 1 − 2·lr</th><th>Behaviour</th></tr>
              <tr><td>0.02</td><td>0.96</td><td>Too small: shrinks 4% per step, crawls</td></tr>
              <tr><td>0.3</td><td>0.40</td><td>Good: fast, smooth convergence</td></tr>
              <tr><td>0.5</td><td>0.00</td><td>Lands exactly on the minimum in 1 step (lucky: only for this curve)</td></tr>
              <tr><td>0.95</td><td>−0.90</td><td>Zig-zag: overshoots to the other side every step, slowly settles</td></tr>
              <tr><td>1.0</td><td>−1.00</td><td>Bounces between 0 and 6 forever</td></tr>
              <tr><td>1.05</td><td>−1.10</td><td>Diverges: each bounce is 10% bigger than the last</td></tr>
            </table>
            <p>Real loss surfaces aren't perfect parabolas, but the lesson carries over. The safe step size depends on how <strong>curved</strong> the loss is, and a step that's too big makes things <em>worse</em>, not faster.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <em>too small</em> then <em>Run 10 steps</em>: after 10 steps w is still only about 1.0.</li>
              <li>Click <em>zig-zag</em>: watch the dot hop from side to side across the valley.</li>
              <li>Click <em>diverge</em> and run: the loss column grows every step and the dot leaves the chart.</li>
              <li>Drag the slider to exactly <code>0.50</code> and take one step.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Gradient descent in code: three learning rates',
        lang: 'js',
        code: `// Loss: L(w) = (w - 3)^2   -> minimum at w = 3
// Gradient: dL/dw = 2 * (w - 3)
function loss(w) {
  return (w - 3) ** 2;
}

function grad(w) {
  return 2 * (w - 3);
}

function descend(lr, steps) {
  let w = 0; // ① start somewhere (a bad guess)
  console.log('--- learning rate ' + lr + ' ---');
  for (let step = 1; step <= steps; step++) {
    const g = grad(w); // ② slope at the current w
    const newW = w - lr * g; // ③ step against the slope
    console.log(
      'step ' + step +
      ': w=' + w.toFixed(3) +
      ' grad=' + g.toFixed(3) +
      ' -> w=' + newW.toFixed(3) +
      ' loss=' + loss(newW).toFixed(3)
    );
    w = newW; // ④ repeat from the new point
  }
}

descend(0.1, 5); // good
descend(0.01, 3); // too small: barely moves
descend(1.1, 4); // too big: overshoots and explodes`,
        explain: `
          <details>
            <summary>The problem: find the <code>w</code> that minimizes <code>(w − 3)²</code> using only the slope</summary>
            <p>We pretend we don't know the answer is 3. All we can do is evaluate the gradient at our current position and step. The code runs the same procedure with three learning rates so you can compare them side by side.</p>
          </details>
          <details>
            <summary>Step by step: <code>lr = 0.1</code> (matches the console)</summary>
            <table>
              <tr><th>step</th><th>w</th><th>grad = 2(w−3)</th><th>lr · grad</th><th>new w = w − lr·grad</th><th>loss(new w)</th></tr>
              <tr><td>1</td><td>0.000</td><td>−6.000</td><td>−0.600</td><td>0.600</td><td>5.760</td></tr>
              <tr><td>2</td><td>0.600</td><td>−4.800</td><td>−0.480</td><td>1.080</td><td>3.686</td></tr>
              <tr><td>3</td><td>1.080</td><td>−3.840</td><td>−0.384</td><td>1.464</td><td>2.359</td></tr>
              <tr><td>4</td><td>1.464</td><td>−3.072</td><td>−0.307</td><td>1.771</td><td>1.510</td></tr>
              <tr><td>5</td><td>1.771</td><td>−2.458</td><td>−0.246</td><td>2.017</td><td>0.966</td></tr>
            </table>
            <p>The gradient is negative (the loss slopes down to the right), so subtracting it moves <code>w</code> <strong>right</strong>, toward 3. The steps also get <strong>smaller on their own</strong> because the slope flattens near the minimum. Each gap <code>3 − w</code> is 0.8× the previous one: 3 → 2.4 → 1.92 → 1.536 → …</p>
            <p>Too small (<code>lr = 0.01</code>): <code>0.000 → 0.060 → 0.119 → 0.176</code>, loss 8.644 → 8.301 → 7.973. It's right direction, just very slow.</p>
            <p>Too big (<code>lr = 1.1</code>):</p>
            <table>
              <tr><th>step</th><th>w</th><th>grad</th><th>new w</th><th>loss</th></tr>
              <tr><td>1</td><td>0.000</td><td>−6.000</td><td>6.600</td><td>12.960</td></tr>
              <tr><td>2</td><td>6.600</td><td>7.200</td><td>−1.320</td><td>18.662</td></tr>
              <tr><td>3</td><td>−1.320</td><td>−8.640</td><td>8.184</td><td>26.874</td></tr>
              <tr><td>4</td><td>8.184</td><td>10.368</td><td>−3.221</td><td>38.698</td></tr>
            </table>
            <p>Each step jumps <em>over</em> the minimum and lands farther away than it started, so the loss grows every step.</p>
          </details>
          <details>
            <summary>Key lines explained ①②③④</summary>
            <ol>
              <li><strong>①</strong> Initialization. Real networks start from small <em>random</em> weights. Here we use 0 so the numbers are easy to follow.</li>
              <li><strong>②</strong> The gradient is computed at the <em>current</em> point. It only tells you the local tilt, not where the minimum is.</li>
              <li><strong>③</strong> The update rule. The minus sign is essential: <code>+</code> would be gradient <em>ascent</em> and walk uphill.</li>
              <li><strong>④</strong> Training is just this loop repeated many times. LLM pre-training runs it hundreds of thousands of times.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Computing the gradient <em>after</em> updating <code>w</code>, or updating some parameters before computing the gradients of others. Always compute <strong>all</strong> gradients at the current point first, then update everything. PyTorch enforces this order: <code>loss.backward()</code> then <code>optimizer.step()</code>.</div>
            <p>Try this: add <code>descend(0.5, 2)</code>. Step 1 lands exactly on <code>w=3.000</code> and the gradient becomes 0, so step 2 doesn't move.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'At the current <code>w</code>, <code>dL/dw = +4</code>. Which way should <code>w</code> move?',
        options: ['Increase w', 'Decrease w', 'Stay put', 'It depends on the loss value'],
        answer: 1,
        why: 'A positive slope means the loss rises to the right, so step left: <code>w - lr·4</code>.',
      },
      {
        q: 'With <code>L = (w-3)²</code>, <code>w = 1</code>, <code>lr = 0.25</code>, what is the next w?',
        options: ['1.5', '2.0', '3.0', '0.0'],
        answer: 1,
        why: 'grad = 2(1-3) = -4. New w = 1 - 0.25·(-4) = 2.0.',
      },
      {
        q: 'Your training loss suddenly jumps to <code>NaN</code> after a few steps. Most likely cause?',
        options: ['Learning rate too small', 'Learning rate too large', 'Too much training data', 'The model is perfect'],
        answer: 1,
        why: 'Steps that are too big overshoot, the loss grows, the numbers overflow, and you get NaN. Lowering the learning rate (or adding warmup / gradient clipping) is the usual fix.',
      },
      {
        q: 'Why do steps get smaller near the minimum even with a fixed learning rate?',
        options: ['The learning rate decays automatically', 'The gradient gets smaller as the curve flattens', 'The loss becomes negative', 'They don\'t'],
        answer: 1,
        why: 'Step size = lr × |gradient|, and the gradient approaches 0 at the minimum.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Fit the model <code>ŷ = w·x</code> (no bias) to the data with gradient descent. The loss is MSE: <code>L = mean((w·x − y)²)</code>. Its gradient is <code>dL/dw = mean(2·(w·x − y)·x)</code>. Implement <code>gradient(w)</code> so that after 20 steps <code>w</code> is close to 2.</p>`,
      starter: `const data = [[1, 2], [2, 4], [3, 6]];

function loss(w) {
  let s = 0;
  for (const [x, y] of data) s += (w * x - y) ** 2;
  return s / data.length;
}

function gradient(w) {
  // TODO: mean of 2 * (w*x - y) * x over the data
  return 0;
}

let w = 0;
const lr = 0.05;
for (let step = 1; step <= 20; step++) {
  w = w - lr * gradient(w);
  if (step % 5 === 0) {
    console.log('step ' + step + ': w=' + w.toFixed(4) + ' loss=' + loss(w).toFixed(5));
  }
}`,
      hint: 'Loop over <code>data</code>, add up <code>2 * (w * x - y) * x</code>, then divide by <code>data.length</code>.',
      solution: `const data = [[1, 2], [2, 4], [3, 6]];

function loss(w) {
  let s = 0;
  for (const [x, y] of data) s += (w * x - y) ** 2;
  return s / data.length;
}

function gradient(w) {
  let g = 0;
  for (const [x, y] of data) g += 2 * (w * x - y) * x;
  return g / data.length;
}

let w = 0;
const lr = 0.05;
for (let step = 1; step <= 20; step++) {
  w = w - lr * gradient(w);
  if (step % 5 === 0) {
    console.log('step ' + step + ': w=' + w.toFixed(4) + ' loss=' + loss(w).toFixed(5));
  }
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'overfitting',
    section: 'ML Foundations',
    title: 'Generalization & Overfitting',
    explain: `
      <p>The goal of ML is <strong>not</strong> to do well on the training data. It's to do well on <strong>new data the model has never seen</strong>. That's called <strong>generalization</strong>.</p>
      <p>Think of a student who memorizes the answers to last year's exam. They'd score 100% on that exam and fail a new one. A model can do the same: with enough parameters, it can <em>memorize</em> the training set, noise included, instead of learning the underlying pattern. That's <strong>overfitting</strong>.</p>
      <h3>Train / test split</h3>
      <p>To catch this, hide some data from training:</p>
      <ul>
        <li><strong>Training set</strong>: used to fit the parameters.</li>
        <li><strong>Test</strong> (or <em>validation</em>) <strong>set</strong>: only used to <em>measure</em>. If training loss keeps going down while test loss goes <em>up</em>, you're overfitting.</li>
      </ul>
      <h3>Underfitting vs overfitting</h3>
      <ul>
        <li><strong>Underfit</strong> (too simple): a straight line through a curve. Bad on train <em>and</em> test.</li>
        <li><strong>Good fit</strong>: captures the pattern and ignores the noise.</li>
        <li><strong>Overfit</strong> (too flexible for the amount of data): wiggles through every training point. Near-zero train error, bad test error.</li>
      </ul>
      <h3>Why this matters for LLMs</h3>
      <p>More parameters = more capacity to fit, including to fit noise. The main cure is <strong>more data</strong>: with lots of points, wiggling through every one of them is no longer possible, so the model has to find the real pattern. That's why LLMs are trained on trillions of tokens, and why "scaling laws" talk about growing parameters and data <em>together</em>. Other tools you'll meet: <em>dropout</em>, <em>weight decay</em>, and <em>early stopping</em> (stop when validation loss stops improving).</p>
      <div class="warn">Never tune your model on the test set. If you keep tweaking until the test score looks good, the test set has quietly become part of training, and your score is no longer an honest estimate.</div>
    `,
    examples: [
      {
        title: 'Polynomial degree slider: underfit → good → overfit',
        code: `<div class="card">
  <style>
    .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px;
      max-width: 660px; font: 13px system-ui, sans-serif; }
    .row { display: flex; gap: 14px; align-items: center; flex-wrap: wrap; margin: 4px 0; }
    .wrap { display: flex; gap: 8px; }
    .tr { color: #1971c2; font-weight: 700; } .te { color: #e8590c; font-weight: 700; }
  </style>
  <div style="color:#555">Drag the degree slider to make the model more flexible. Watch train vs test
    error, then switch to 40 training points.</div>
  <div class="row">
    <label>polynomial degree <input id="deg" type="range" min="0" max="9" value="1"> <b id="dv"></b></label>
    <label>training points
      <select id="n"><option value="10">10</option><option value="40">40</option></select></label>
  </div>
  <div class="wrap">
    <svg id="s" width="400" height="290" viewBox="0 0 400 290"></svg>
    <svg id="e" width="240" height="290" viewBox="0 0 240 290"></svg>
  </div>
  <div class="row">
    <span class="tr">train MSE: <span id="trm"></span></span>
    <span class="te">test MSE: <span id="tem"></span></span>
    <span id="verdict"></span>
  </div>
</div>
<script>
  // Seeded random numbers so the data is identical every run
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const truth = x => Math.sin(Math.PI * x); // the real pattern
  function makeData(n, seed) {
    const r = mulberry32(seed);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const x = -1 + 2 * (i + 0.5) / n + (r() - 0.5) * (1.6 / n);
      pts.push([x, truth(x) + (r() - 0.5) * 0.7]);
    }
    return pts;
  }
  const test = makeData(30, 99);
  const trainSets = { 10: makeData(10, 7), 40: makeData(40, 11) };

  // Least squares via normal equations (A^T A) c = A^T y, Gaussian elimination
  function fit(pts, deg) {
    const m = deg + 1;
    const M = [];
    for (let i = 0; i < m; i++) M.push(new Array(m + 1).fill(0));
    for (const [x, y] of pts) {
      for (let i = 0; i < m; i++) {
        for (let j = 0; j < m; j++) M[i][j] += x ** (i + j);
        M[i][m] += y * x ** i;
      }
    }
    for (let i = 0; i < m; i++) M[i][i] += 1e-9; // tiny ridge for stability
    for (let c = 0; c < m; c++) {
      let p = c;
      for (let r = c + 1; r < m; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      [M[c], M[p]] = [M[p], M[c]];
      for (let r = 0; r < m; r++) {
        if (r === c) continue;
        const f = M[r][c] / M[c][c];
        for (let k = c; k <= m; k++) M[r][k] -= f * M[c][k];
      }
    }
    return M.map((row, i) => row[m] / row[i]);
  }
  const evalPoly = (c, x) => c.reduce((s, ci, i) => s + ci * x ** i, 0);
  const mse = (c, pts) => pts.reduce((s, [x, y]) => s + (evalPoly(c, x) - y) ** 2, 0) / pts.length;

  const X = x => 20 + (x + 1) * 180;
  const Y = y => 145 - y * 70;
  const clampY = y => Math.max(5, Math.min(285, y));

  function draw() {
    const deg = +document.getElementById('deg').value;
    const train = trainSets[document.getElementById('n').value];
    document.getElementById('dv').textContent = deg;
    const c = fit(train, deg);
    let s = '<rect x="0" y="0" width="400" height="290" fill="#fafbff"/>' +
      '<line x1="20" y1="145" x2="380" y2="145" stroke="#ddd"/>';
    let d = '';
    for (let x = -1; x <= 1.0001; x += 0.01) {
      d += (d ? 'L' : 'M') + X(x).toFixed(1) + ' ' + Y(truth(x)).toFixed(1);
    }
    s += '<path d="' + d + '" fill="none" stroke="#adb5bd" stroke-width="2" stroke-dasharray="6 4"/>';
    d = '';
    for (let x = -1; x <= 1.0001; x += 0.005) {
      d += (d ? 'L' : 'M') + X(x).toFixed(1) + ' ' + clampY(Y(evalPoly(c, x))).toFixed(1);
    }
    s += '<path d="' + d + '" fill="none" stroke="#7048e8" stroke-width="2.5"/>';
    for (const [x, y] of test) {
      s += '<rect x="' + (X(x) - 3) + '" y="' + (Y(y) - 3) + '" width="6" height="6" fill="none" stroke="#e8590c"/>';
    }
    for (const [x, y] of train) {
      s += '<circle cx="' + X(x) + '" cy="' + Y(y) + '" r="4" fill="#1971c2"/>';
    }
    s += '<text x="26" y="18" font-size="11"><tspan fill="#1971c2">● train</tspan>' +
      '<tspan fill="#e8590c" dx="8">□ test</tspan><tspan fill="#7048e8" dx="8">— model</tspan>' +
      '<tspan fill="#868e96" dx="8">-- true pattern</tspan></text>';
    document.getElementById('s').innerHTML = s;

    // error vs degree chart (log scale)
    const errs = [];
    for (let k = 0; k <= 9; k++) {
      const ck = fit(train, k);
      errs.push([mse(ck, train), mse(ck, test)]);
    }
    const EY = v => 250 - (Math.log10(Math.max(v, 1e-4)) + 4) * 55; // 1e-4 .. 10
    const EX = k => 30 + k * 21;
    let e = '<text x="120" y="14" font-size="11" text-anchor="middle">error vs degree (log scale)</text>' +
      '<line x1="30" y1="250" x2="225" y2="250" stroke="#999"/>';
    for (let k = 0; k <= 9; k++) {
      e += '<text x="' + EX(k) + '" y="264" font-size="10" text-anchor="middle">' + k + '</text>';
    }
    for (const [v, lbl] of [[10, '10'], [1, '1'], [0.1, '.1'], [0.01, '.01'], [0.001, '.001']]) {
      e += '<text x="26" y="' + (EY(v) + 3) + '" font-size="9" text-anchor="end">' + lbl + '</text>';
    }
    e += '<rect x="' + (EX(deg) - 9) + '" y="20" width="18" height="230" fill="#f1f3f5"/>';
    for (const [idx, col] of [[0, '#1971c2'], [1, '#e8590c']]) {
      let p = '';
      errs.forEach((er, k) => {
        p += (p ? 'L' : 'M') + EX(k) + ' ' + Math.max(20, EY(er[idx])).toFixed(1);
      });
      e += '<path d="' + p + '" fill="none" stroke="' + col + '" stroke-width="2"/>';
    }
    e += '<text x="120" y="282" font-size="11" text-anchor="middle">degree</text>';
    document.getElementById('e').innerHTML = e;

    const [tr, te] = errs[deg];
    document.getElementById('trm').textContent = tr.toFixed(4);
    document.getElementById('tem').textContent = te > 100 ? te.toExponential(1) : te.toFixed(4);
    document.getElementById('verdict').textContent =
      tr > 0.1 ? 'underfitting: too simple'
        : te > 0.15 ? 'overfitting: memorizing noise'
        : te > 2 * tr && te > 0.06 ? 'starting to overfit'
        : 'good fit';
  }
  document.getElementById('deg').oninput = draw;
  document.getElementById('n').onchange = draw;
  draw();
</script>`,
        explain: `
          <details>
            <summary>What the demo does</summary>
            <p>The true pattern is <code>sin(πx)</code> (dashed). The training and test points are that curve plus random noise from a seeded generator, so the data is the same every run. For each degree, the model <code>c₀ + c₁x + … + c_d x^d</code> is fitted to the <strong>training points only</strong> by least squares. A degree-<code>d</code> polynomial has <code>d + 1</code> parameters.</p>
            <p>The right chart shows train (blue) and test (orange) error for every degree. On a log scale, train error keeps falling as the degree goes up. Test error falls, then <strong>rises again</strong>. That U-shape is the classic overfitting picture.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Degree 0–1: a flat or straight line can't bend like a sine. Both errors are high (underfitting).</li>
              <li>Degree 3–4: the curve follows the dashed line nicely and test error is at its lowest.</li>
              <li>Degree 9 with 10 points: 10 parameters for 10 points means the curve goes <strong>exactly through every training point</strong> (train MSE ≈ 0) and swings wildly between them. Test error is huge.</li>
              <li>Now switch to <strong>40 training points</strong> and go back to degree 9. The wiggles mostly disappear and test error stays low. <strong>More data tames a big model.</strong></li>
            </ul>
            <div class="tip">Modern deep nets are hugely over-parameterized yet still generalize well when trained on enough data with the right tricks. The simple U-curve isn't the whole story at LLM scale (look up "double descent"), but train/validation monitoring is still how every LLM run is watched.</div>
          </details>
        `,
      },
      {
        title: 'A memorizer vs a simple rule',
        lang: 'js',
        code: `// True pattern: y = 2x. The data has a little noise.
const train = [[1, 2.1], [2, 3.9], [3, 6.2], [4, 7.8]];
const test = [[1.5, 3.1], [2.5, 4.9], [5, 10.1]];

// Model A: memorize the training set, answer 0 for anything unseen
const table = new Map(train);
const memorizer = x => (table.has(x) ? table.get(x) : 0);

// Model B: one parameter, w = best slope through the origin
let num = 0;
let den = 0;
for (const [x, y] of train) {
  num += x * y;
  den += x * x;
}
const w = num / den;
const line = x => w * x;

function mse(model, data) {
  return data.reduce((s, [x, y]) => s + (model(x) - y) ** 2, 0) / data.length;
}

console.log('learned w =', w.toFixed(3));
console.log('memorizer: train MSE', mse(memorizer, train).toFixed(3),
  ' test MSE', mse(memorizer, test).toFixed(3));
console.log('line:      train MSE', mse(line, train).toFixed(3),
  ' test MSE', mse(line, test).toFixed(3));`,
      },
    ],
    quiz: [
      {
        q: 'Train loss is 0.01 and still falling. Validation loss was 0.30 and is now rising to 0.45. What\'s happening?',
        options: ['Underfitting', 'Overfitting', 'The learning rate is too small', 'Perfect training'],
        answer: 1,
        why: 'The gap between train and validation loss is growing: the model is memorizing training specifics that don\'t transfer.',
      },
      {
        q: 'Which usually helps a large model generalize better?',
        options: ['Evaluating on the training set', 'More (diverse) training data', 'Removing the test set', 'Training until train loss is exactly 0'],
        answer: 1,
        why: 'More data makes memorizing every example harder, so the model has to learn the real pattern.',
      },
      {
        q: 'A degree-9 polynomial through 10 training points gets train MSE ≈ 0. Why is that suspicious?',
        options: [
          'It means the math is broken',
          '10 parameters can pass exactly through 10 points, noise included',
          'Polynomials cannot fit noise',
          'It isn\'t suspicious',
        ],
        answer: 1,
        why: 'With as many parameters as data points, the model can interpolate everything. Zero training error then tells you nothing about new data.',
      },
      {
        q: 'What is the test set for?',
        options: ['Extra training data', 'Tuning the learning rate repeatedly', 'An honest estimate of performance on unseen data', 'Computing gradients'],
        answer: 2,
        why: 'It must stay untouched during training and tuning. Use a separate <em>validation</em> set for tuning.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement a train/test split: put <strong>every 4th point</strong> (index 3, 7, 11, …) in the test set and the rest in train. Then fit a line <code>y = w·x + b</code> on train using the closed-form formulas (given), and print the train and test MSE. Both should be small and similar. That tells you the line generalizes.</p>`,
      starter: `const data = [];
for (let i = 0; i < 16; i++) {
  const x = i * 0.5;
  const noise = ((i * 7) % 5 - 2) * 0.1; // deterministic "noise"
  data.push([x, 1.5 * x + 2 + noise]);
}

// TODO: split
const train = data;
const test = [];

function fitLine(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of pts) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  const w = num / den;
  return { w, b: my - w * mx };
}

function mse(model, pts) {
  if (pts.length === 0) return NaN;
  let s = 0;
  for (const [x, y] of pts) s += (model.w * x + model.b - y) ** 2;
  return s / pts.length;
}

const model = fitLine(train);
console.log('train size', train.length, ' test size', test.length);
console.log('w=' + model.w.toFixed(3) + ' b=' + model.b.toFixed(3));
console.log('train MSE', mse(model, train).toFixed(4), ' test MSE', mse(model, test).toFixed(4));`,
      hint: '<code>data.filter((p, i) =&gt; i % 4 === 3)</code> gives the test set. Use <code>i % 4 !== 3</code> for train.',
      solution: `const data = [];
for (let i = 0; i < 16; i++) {
  const x = i * 0.5;
  const noise = ((i * 7) % 5 - 2) * 0.1; // deterministic "noise"
  data.push([x, 1.5 * x + 2 + noise]);
}

const train = data.filter((p, i) => i % 4 !== 3);
const test = data.filter((p, i) => i % 4 === 3);

function fitLine(pts) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  let num = 0;
  let den = 0;
  for (const [x, y] of pts) {
    num += (x - mx) * (y - my);
    den += (x - mx) ** 2;
  }
  const w = num / den;
  return { w, b: my - w * mx };
}

function mse(model, pts) {
  if (pts.length === 0) return NaN;
  let s = 0;
  for (const [x, y] of pts) s += (model.w * x + model.b - y) ** 2;
  return s / pts.length;
}

const model = fitLine(train);
console.log('train size', train.length, ' test size', test.length);
console.log('w=' + model.w.toFixed(3) + ' b=' + model.b.toFixed(3));
console.log('train MSE', mse(model, train).toFixed(4), ' test MSE', mse(model, test).toFixed(4));`,
    },
  },
);
