window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── lm-head ─────────────────────────────
  {
    id: 'lm-head',
    section: 'From Transformer to LLM',
    title: 'From Vectors to Next Token',
    explain: `
      <p>After the last transformer block, every position holds a vector of size <code>d_model</code> in the residual stream. That vector is the model's "understanding so far", but it is not a word yet. The <strong>LM head</strong> turns it into a probability for every token in the vocabulary.</p>
      <h3>Three small steps</h3>
      <ol>
        <li><strong>Final LayerNorm</strong>: pre-LN models (GPT-2 onward) add one last norm after the final block, because the residual stream itself was never normalized.</li>
        <li><strong>Linear to vocab</strong>: multiply by a matrix <code>W_U</code> of shape <code>[d_model, V]</code>. Output: one <strong>logit</strong> per vocabulary token, shape <code>[T, V]</code>. With V = 50k–250k in real models, this is a big matrix.</li>
        <li><strong>Softmax</strong> over the last axis gives a distribution <code>p(next token | tokens so far)</code> at each position.</li>
      </ol>
      <pre><code>h      = LayerNorm(x_final)      // [T, d_model]
logits = h · W_U                  // [T, V]
probs  = softmax(logits, axis=-1) // [T, V], each row sums to 1</code></pre>
      <h3>Weight tying</h3>
      <p>The embedding matrix <code>E</code> is <code>[V, d_model]</code>: token id → vector. The LM head goes the other way: vector → score per token. Many models simply reuse it: <code>logits = h · Eᵀ</code>. The logit for token <em>t</em> becomes a dot product "how similar is my current state to the embedding of <em>t</em>?". This is called <strong>weight tying</strong>. The original 2017 Transformer and GPT-2 do it; it saves <code>V·d_model</code> parameters (tens of millions or more). Many larger modern models keep a separate, untied output matrix, and small ones often tie. Both work.</p>
      <h3>Training: every position is a training example</h3>
      <p>Take a sequence of token ids. The <strong>inputs</strong> are all tokens except the last, the <strong>targets</strong> are all tokens except the first: the same sequence shifted left by one. Position <em>i</em> sees tokens <code>0..i</code> and must predict token <code>i+1</code>.</p>
      <pre><code>ids     = [&lt;s&gt;, The, cat, sat, on, the, mat]
inputs  = ids[:-1] = [&lt;s&gt;, The, cat, sat, on, the]
targets = ids[1:]  = [The, cat, sat, on, the, mat]
loss    = mean over positions of  -log p(target_i | inputs_0..i)</code></pre>
      <p>Thanks to the <strong>causal mask</strong>, one forward pass computes all T predictions at once, and none of them can peek at its own answer. A 2,048-token training sequence gives 2,047 next-token examples for the price of one pass. This is a big reason transformers train so much faster than RNNs.</p>
      <div class="tip">At <strong>inference</strong> we only need the <em>last</em> row of the logits: that's the prediction for the token that comes next. At <strong>training</strong> we use <em>every</em> row.</div>
      <div class="warn">Off-by-one bugs are the classic mistake here. If you forget the shift (targets = inputs), the model learns to copy the current token, the loss drops to almost zero quickly, and generation is garbage. If training loss looks "too good to be true", check the shift first.</div>
    `,
    examples: [
      {
        title: 'Inputs vs targets: the shift-by-one',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .row { display:flex; gap:6px; align-items:center; margin:6px 0; }
  .lbl { width:70px; font-size:13px; color:#555; }
  .tok { width:72px; text-align:center; padding:6px 0; border-radius:6px; border:1px solid #ccd; font-size:14px; cursor:pointer; background:#f4f5f9; transition:all .15s; }
  .tok.ctx { background:#dbe8ff; border-color:#5b8def; }
  .tok.cur { background:#5b8def; color:#fff; border-color:#3a6fd8; }
  .tok.tgt { background:#ffe2c2; border-color:#f08a24; font-weight:600; }
  .tok.dim { opacity:.35; }
  .arrow { width:72px; text-align:center; color:#999; font-size:12px; }
  .info { margin-top:10px; font-size:14px; min-height:44px; background:#f7f7fa; border-radius:6px; padding:8px; }
  .bar { height:10px; background:#f08a24; border-radius:3px; }
  .note { font-size:12px; color:#666; margin-top:6px; }
</style>
<div class="card">
  <div style="font-weight:600;margin-bottom:4px">One sequence = many training examples (hover or click a position)</div>
  <div class="row"><span class="lbl">input</span><span id="inp" style="display:flex;gap:6px"></span></div>
  <div class="row"><span class="lbl"></span><span id="arr" style="display:flex;gap:6px"></span></div>
  <div class="row"><span class="lbl">target</span><span id="tgt" style="display:flex;gap:6px"></span></div>
  <div class="row"><span class="lbl">p(target)</span><span id="bars" style="display:flex;gap:6px"></span></div>
  <div class="info" id="info"></div>
  <div class="note" id="mean"></div>
  <div class="note">The p(target) values are made up for illustration. The causal mask is what lets all 6 positions train in one forward pass without cheating.</div>
</div>
<script>
  const text = ['<s>', 'The', 'cat', 'sat', 'on', 'the', 'mat'];
  const inputs = text.slice(0, -1);
  const targets = text.slice(1);
  const probs = [0.02, 0.31, 0.44, 0.52, 0.71, 0.18];
  const inp = document.getElementById('inp');
  const arr = document.getElementById('arr');
  const tgt = document.getElementById('tgt');
  const bars = document.getElementById('bars');
  const info = document.getElementById('info');
  const inEls = [];
  const tgEls = [];

  inputs.forEach((t, i) => {
    const a = document.createElement('div');
    a.className = 'tok';
    a.textContent = t;
    inp.appendChild(a);
    inEls.push(a);
    const ar = document.createElement('div');
    ar.className = 'arrow';
    ar.textContent = 'predicts';
    arr.appendChild(ar);
    const b = document.createElement('div');
    b.className = 'tok';
    b.textContent = targets[i];
    tgt.appendChild(b);
    tgEls.push(b);
    const bw = document.createElement('div');
    bw.style.width = '72px';
    bw.style.fontSize = '11px';
    bw.innerHTML = '<div class="bar" style="width:' + Math.round(probs[i] * 72) + 'px"></div>' +
      probs[i].toFixed(2) + ' (loss ' + (-Math.log(probs[i])).toFixed(2) + ')';
    bars.appendChild(bw);
    [a, b].forEach(el => {
      el.addEventListener('mouseenter', () => show(i));
      el.addEventListener('click', () => show(i));
    });
  });

  function show(i) {
    inEls.forEach((el, j) => {
      el.className = 'tok' + (j < i ? ' ctx' : j === i ? ' cur' : ' dim');
    });
    tgEls.forEach((el, j) => {
      el.className = 'tok' + (j === i ? ' tgt' : ' dim');
    });
    const ctx = inputs.slice(0, i + 1).join(' ');
    const loss = -Math.log(probs[i]);
    info.innerHTML = 'Position <b>' + i + '</b>: the model sees <b>"' + ctx.replace('<', '&lt;').replace('>', '&gt;') +
      '"</b> (blue) and must put high probability on <b>"' + targets[i] + '"</b> (orange).<br>' +
      'Loss here = -log(' + probs[i].toFixed(2) + ') = ' + loss.toFixed(2) +
      '. Future tokens (faded) are hidden by the causal mask.';
  }

  const mean = probs.reduce((s, p) => s - Math.log(p), 0) / probs.length;
  document.getElementById('mean').textContent =
    'Training loss for this sequence = mean of the 6 per-position losses = ' + mean.toFixed(2);
  show(2);
</script>`,
      },
      {
        title: 'Cross-entropy at every position (numbers)',
        lang: 'js',
        code: `const vocab = ['the', 'cat', 'sat', 'on', 'mat', '.'];
const text = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
const ids = text.map(t => vocab.indexOf(t));

// ① shift by one: position i sees ids[0..i] and must predict ids[i + 1]
const inputs = ids.slice(0, -1);
const targets = ids.slice(1);

// ② pretend the model produced these logits: one row per input position, one column per vocab word
const logits = [
  [0.1, 2.0, 0.3, 0.2, 0.9, -0.5], // after "the"
  [-0.2, 0.0, 2.5, 0.4, 0.1, 0.3], // after "the cat"
  [0.3, -0.1, 0.0, 1.8, 0.2, 0.9], // after "the cat sat"
  [2.2, 0.4, -0.3, 0.1, 0.6, 0.0], // after "the cat sat on"
  [0.5, 1.2, -0.4, 0.0, 1.5, 0.2], // after "the cat sat on the"
];

const softmax = xs => {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
};

let total = 0;
inputs.forEach((_, i) => {
  const probs = softmax(logits[i]);
  const p = probs[targets[i]]; // ③ probability given to the TRUE next token
  const loss = -Math.log(p); // cross-entropy at this position
  total += loss;
  const context = text.slice(0, i + 1).join(' ');
  console.log(
    'pos ' + i + ': "' + context + '" -> target "' + vocab[targets[i]] + '"',
    '| p = ' + p.toFixed(3) + ' | loss = ' + loss.toFixed(3)
  );
});
console.log('mean loss over ' + inputs.length + ' positions = ' + (total / inputs.length).toFixed(3));`,
      },
      {
        title: 'In PyTorch: LM head with weight tying + parallel loss',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn
import torch.nn.functional as F


class LMHead(nn.Module):
    def __init__(self, embedding: nn.Embedding):
        super().__init__()
        d_model = embedding.embedding_dim
        self.norm = nn.LayerNorm(d_model)  # final LayerNorm
        self.proj = nn.Linear(d_model, embedding.num_embeddings, bias=False)
        self.proj.weight = embedding.weight  # weight tying: the SAME [V, d_model] tensor

    def forward(self, x):  # x: [B, T, d_model]
        return self.proj(self.norm(x))  # logits: [B, T, V]


# Training step: inputs and targets are the same batch shifted by one.
# ids: [B, T+1] token ids
logits = model(ids[:, :-1])  # [B, T, V]
loss = F.cross_entropy(
    logits.reshape(-1, logits.size(-1)),  # [B*T, V]
    ids[:, 1:].reshape(-1),  # [B*T]
)`,
      },
    ],
    quiz: [
      {
        q: 'The LM head output for a sequence of T tokens with vocabulary size V has which shape?',
        options: ['<code>[T, d_model]</code>', '<code>[V]</code>', '<code>[T, V]</code>', '<code>[V, d_model]</code>'],
        answer: 2,
        why: 'Every position gets a full row of V logits. At inference you use only the last row; during training all T rows are scored against their targets.',
      },
      {
        q: 'What does weight tying mean?',
        options: [
          'All transformer blocks share the same weights',
          'The output projection to the vocabulary reuses the input embedding matrix (transposed)',
          'Q, K and V use the same weight matrix',
          'The weights are frozen during finetuning',
        ],
        answer: 1,
        why: 'The embedding is [V, d_model]; using it transposed as the LM head gives logits = h·Eᵀ, saving V·d_model parameters.',
      },
      {
        q: 'For ids = [A, B, C, D], what are the training inputs and targets?',
        options: [
          'inputs [A, B, C, D], targets [A, B, C, D]',
          'inputs [A, B, C], targets [B, C, D]',
          'inputs [B, C, D], targets [A, B, C]',
          'inputs [A], targets [D]',
        ],
        answer: 1,
        why: 'Targets are the inputs shifted left by one: position i predicts token i+1.',
      },
      {
        q: 'Why can a transformer compute the loss for all positions in one forward pass without cheating?',
        options: [
          'Because it uses dropout',
          'Because the causal mask stops each position from attending to later tokens',
          'Because the LM head is tied to the embedding',
          'Because LayerNorm removes future information',
        ],
        answer: 1,
        why: 'With the causal mask, position i can only see tokens 0..i, so predicting token i+1 is a fair test even though all positions are computed together.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>You get a 5-token sequence and the model's probabilities at each of the 4 input positions.</p>
        <ol>
          <li>Build <code>inputs</code> and <code>targets</code> by shifting <code>ids</code> by one.</li>
          <li>For each position print the probability given to the <em>target</em> and the loss <code>-log(p)</code>.</li>
          <li>Print the mean loss. (Expected: <code>0.653</code>.)</li>
        </ol>`,
      starter: `const vocab = ['<s>', 'I', 'like', 'green', 'tea'];
const ids = [0, 1, 2, 3, 4]; // "<s> I like green tea"

// The model's probabilities, one row per INPUT position (4 rows), one column per vocab word.
const probs = [
  [0.05, 0.60, 0.15, 0.10, 0.10], // after "<s>"
  [0.05, 0.05, 0.70, 0.10, 0.10], // after "<s> I"
  [0.05, 0.05, 0.05, 0.25, 0.60], // after "<s> I like"
  [0.05, 0.05, 0.10, 0.10, 0.70], // after "<s> I like green"
];

// TODO 1: build inputs and targets by shifting ids by one
const inputs = ids;
const targets = ids;

// TODO 2: loss at each position = -log(probability of the TARGET token); print it
// TODO 3: print the mean loss
console.log('inputs :', inputs.map(i => vocab[i]).join(' '));
console.log('targets:', targets.map(i => vocab[i]).join(' '));`,
      hint: 'inputs = ids.slice(0, -1), targets = ids.slice(1). Row i of probs belongs to input position i, so the loss is -Math.log(probs[i][targets[i]]).',
      solution: `const vocab = ['<s>', 'I', 'like', 'green', 'tea'];
const ids = [0, 1, 2, 3, 4]; // "<s> I like green tea"

// The model's probabilities, one row per INPUT position (4 rows), one column per vocab word.
const probs = [
  [0.05, 0.60, 0.15, 0.10, 0.10], // after "<s>"
  [0.05, 0.05, 0.70, 0.10, 0.10], // after "<s> I"
  [0.05, 0.05, 0.05, 0.25, 0.60], // after "<s> I like"
  [0.05, 0.05, 0.10, 0.10, 0.70], // after "<s> I like green"
];

const inputs = ids.slice(0, -1); // drop the last token
const targets = ids.slice(1); // drop the first token
console.log('inputs :', inputs.map(i => vocab[i]).join(' '));
console.log('targets:', targets.map(i => vocab[i]).join(' '));

let total = 0;
targets.forEach((t, i) => {
  const loss = -Math.log(probs[i][t]);
  total += loss;
  console.log('pos ' + i + ' target "' + vocab[t] + '" p=' + probs[i][t].toFixed(2) + ' loss=' + loss.toFixed(3));
});
console.log('mean loss = ' + (total / targets.length).toFixed(3));`,
    },
  },

  // ───────────────────────────── sampling ─────────────────────────────
  {
    id: 'sampling',
    section: 'From Transformer to LLM',
    title: 'Decoding Strategies',
    explain: `
      <p>The model gives us a probability distribution over the next token. <strong>Decoding</strong> is the rule for turning that distribution into one actual token. The model is the same in every case; only this final choice changes, and it changes the output a lot.</p>
      <h3>Greedy</h3>
      <p>Always pick the most likely token (<code>argmax</code>). Deterministic and good for short factual answers, but long outputs often get stuck in loops ("I think that I think that I think…") and sound flat.</p>
      <h3>Temperature</h3>
      <p>Divide logits by <code>T</code> before softmax: <code>p = softmax(logits / T)</code> (you met this in the softmax lesson). <code>T &lt; 1</code> sharpens the distribution (closer to greedy), <code>T &gt; 1</code> flattens it (more surprising picks). <code>T → 0</code> becomes greedy.</p>
      <h3>Top-k</h3>
      <p>Keep only the <code>k</code> most likely tokens, set the rest to zero, <strong>renormalize</strong> so the survivors sum to 1, then sample. It cuts off the long tail of silly tokens. Weakness: a fixed <code>k</code> is too many when the model is sure and too few when many words fit.</p>
      <h3>Top-p (nucleus sampling)</h3>
      <p>Sort tokens by probability and keep the smallest set whose total probability reaches <code>p</code> (e.g. 0.9). When the model is confident, that set might be 1–2 tokens; when it is unsure, it might be hundreds. The cut adapts to the model's own uncertainty (Holtzman et al., 2019).</p>
      <pre><code>1. logits / T               // temperature
2. softmax                  // probabilities
3. keep top-k               // optional
4. keep smallest set with cumulative prob ≥ p   // optional
5. renormalize, draw a random number, pick</code></pre>
      <div class="tip">Real APIs apply these in a fixed order, usually temperature first, then filters. Typical chat settings are something like <code>T ≈ 0.7</code>, <code>top_p ≈ 0.9–0.95</code>. For code or math where there's one right answer, lower T (or greedy) is common. Other variants exist too, such as <code>min_p</code>, which keeps tokens whose probability is at least some fraction of the top token's.</div>
      <div class="warn">Sampling is random, so the same prompt gives different outputs. To get reproducible results in code, fix the random seed. Even then, some GPU kernels are not bit-exact across runs.</div>
    `,
    examples: [
      {
        title: 'Playground: temperature, top-k, top-p on 8 candidates',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .ctl { display:grid; grid-template-columns:120px 1fr 60px; align-items:center; gap:4px 10px; font-size:14px; }
  .ctl input[type=range] { width:100%; }
  .val { font-family:ui-monospace, monospace; }
  .out { font-size:14px; margin-top:6px; min-height:22px; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-weight:600">"The cat sat on the ___" : 8 candidate tokens</div>
  <div class="ctl" style="margin-top:8px">
    <label for="t">temperature T</label><input id="t" type="range" min="0.1" max="2" step="0.05" value="1"><span id="tv" class="val"></span>
    <label for="k">top-k</label><input id="k" type="range" min="1" max="8" step="1" value="8"><span id="kv" class="val"></span>
    <label for="p">top-p</label><input id="p" type="range" min="0.05" max="1" step="0.05" value="1"><span id="pv" class="val"></span>
  </div>
  <svg id="svg" width="640" height="220" viewBox="0 0 640 220"></svg>
  <div>
    <button id="greedy">Greedy (T to 0)</button>
    <button id="samp">Sample 1</button>
    <button id="samp100">Sample 100</button>
    <button id="reset">Reset</button>
  </div>
  <div class="out" id="out"></div>
  <div class="muted">Grey = plain softmax at T. Blue = what survives top-k and top-p after renormalizing. Sampling uses a seeded PRNG (mulberry32, seed 1).</div>
</div>
<script>
  const tokens = ['mat', 'sofa', 'floor', 'roof', 'bed', 'table', 'moon', 'piano'];
  const logits = [3.0, 2.2, 1.8, 1.0, 0.8, 0.5, -1.0, -2.0];
  const $ = id => document.getElementById(id);
  const NS = 'http://www.w3.org/2000/svg';
  let seed = 1;
  let counts = tokens.map(() => 0);

  function rand() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function compute() {
    const T = +$('t').value;
    const k = +$('k').value;
    const p = +$('p').value;
    const s = logits.map(x => x / T);
    const m = Math.max(...s);
    const e = s.map(x => Math.exp(x - m));
    const z = e.reduce((a, b) => a + b, 0);
    const raw = e.map(x => x / z);
    const order = raw.map((q, i) => i).sort((a, b) => raw[b] - raw[a]);
    const keep = new Set();
    let cum = 0;
    for (let r = 0; r < order.length && r < k; r++) {
      keep.add(order[r]);
      cum += raw[order[r]];
      if (cum >= p) break;
    }
    const kept = raw.map((q, i) => (keep.has(i) ? q : 0));
    const zz = kept.reduce((a, b) => a + b, 0);
    return { T, k, p, raw, final: kept.map(q => q / zz), n: keep.size };
  }

  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    for (const a in attrs) n.setAttribute(a, attrs[a]);
    if (text != null) n.textContent = text;
    return n;
  }

  function draw() {
    const r = compute();
    $('tv').textContent = r.T.toFixed(2);
    $('kv').textContent = r.k;
    $('pv').textContent = r.p.toFixed(2);
    const svg = $('svg');
    svg.innerHTML = '';
    const top = 20;
    const H = 150 / Math.max(...r.raw, ...r.final); // tallest bar = full height
    tokens.forEach((t, i) => {
      const x = 20 + i * 77;
      const hr = r.raw[i] * H;
      const hf = r.final[i] * H;
      svg.appendChild(el('rect', { x: x, y: top + 150 - hr, width: 26, height: hr, fill: '#c9ccd6' }));
      svg.appendChild(el('rect', { x: x + 28, y: top + 150 - hf, width: 26, height: hf,
        fill: r.final[i] > 0 ? '#3b6fe0' : '#eee' }));
      svg.appendChild(el('text', { x: x + 27, y: top + 166, 'text-anchor': 'middle', 'font-size': 13,
        fill: r.final[i] > 0 ? '#1a1a1a' : '#aaa' }, t));
      svg.appendChild(el('text', { x: x + 27, y: top + 182, 'text-anchor': 'middle', 'font-size': 11,
        fill: '#555' }, r.final[i] > 0 ? r.final[i].toFixed(3) : 'cut'));
      if (counts[i] > 0) {
        svg.appendChild(el('text', { x: x + 41, y: top + 150 - hf - 4, 'text-anchor': 'middle',
          'font-size': 11, fill: '#d0542a' }, 'x' + counts[i]));
      }
    });
    svg.appendChild(el('line', { x1: 10, x2: 630, y1: top + 150, y2: top + 150, stroke: '#999' }));
    return r;
  }

  function pick(probs) {
    const u = rand();
    let cum = 0;
    for (let i = 0; i < probs.length; i++) {
      cum += probs[i];
      if (u < cum) return [i, u];
    }
    return [probs.length - 1, u];
  }

  ['t', 'k', 'p'].forEach(id => $(id).addEventListener('input', () => {
    counts = tokens.map(() => 0);
    const r = draw();
    $('out').textContent = r.n + ' of 8 tokens survive.';
  }));
  $('greedy').onclick = () => {
    const i = logits.indexOf(Math.max(...logits));
    $('out').textContent = 'Greedy always picks the argmax: "' + tokens[i] + '". Same answer every time.';
  };
  $('samp').onclick = () => {
    const r = compute();
    const [i, u] = pick(r.final);
    counts[i]++;
    draw();
    $('out').textContent = 'u = ' + u.toFixed(3) + ' -> sampled "' + tokens[i] + '"';
  };
  $('samp100').onclick = () => {
    const r = compute();
    for (let n = 0; n < 100; n++) counts[pick(r.final)[0]]++;
    draw();
    $('out').textContent = 'Counts shown in red above the bars (running total).';
  };
  $('reset').onclick = () => {
    $('t').value = 1;
    $('k').value = 8;
    $('p').value = 1;
    seed = 1;
    counts = tokens.map(() => 0);
    draw();
    $('out').textContent = '';
  };
  draw();
</script>`,
      },
      {
        title: 'Sampling in code with a seeded PRNG',
        lang: 'js',
        code: `// Next-token candidates after "The cat sat on the"
const tokens = ['mat', 'sofa', 'floor', 'roof', 'bed', 'table', 'moon', 'piano'];
const logits = [3.0, 2.2, 1.8, 1.0, 0.8, 0.5, -1.0, -2.0];

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function softmax(xs, T) {
  const scaled = xs.map(x => x / T); // ① temperature
  const m = Math.max(...scaled);
  const exps = scaled.map(x => Math.exp(x - m));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}

function filter(probs, k, p) {
  const order = probs.map((q, i) => i).sort((a, b) => probs[b] - probs[a]);
  const keep = new Set();
  let cum = 0;
  for (let r = 0; r < order.length; r++) {
    if (r >= k) break; // ② top-k
    keep.add(order[r]);
    cum += probs[order[r]];
    if (cum >= p) break; // ③ top-p
  }
  const kept = probs.map((q, i) => (keep.has(i) ? q : 0));
  const z = kept.reduce((a, b) => a + b, 0);
  return kept.map(q => q / z); // ④ renormalize
}

function sample(probs, rand) {
  const u = rand();
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (u < cum) return i;
  }
  return probs.length - 1;
}

const T = 0.8;
const K = 5;
const P = 0.9;

const raw = softmax(logits, T);
const final = filter(raw, K, P);

console.log('token   logit  softmax(T)  after top-k/top-p');
tokens.forEach((t, i) => {
  console.log(
    t.padEnd(7),
    logits[i].toFixed(1).padStart(5),
    raw[i].toFixed(3).padStart(10),
    final[i].toFixed(3).padStart(12)
  );
});

const greedy = tokens[logits.indexOf(Math.max(...logits))];
console.log('greedy pick:', greedy);

const rand = mulberry32(42);
const picks = [];
for (let n = 0; n < 10; n++) {
  picks.push(tokens[sample(final, rand)]);
}
console.log('10 samples (seed 42):', picks.join(' '));`,
        explain: `
          <details>
            <summary>The problem: one distribution, many possible "next tokens"</summary>
            <p>After "The cat sat on the", the model spreads probability over 8 candidates. Greedy would say <code>mat</code> every time. Plain sampling at <code>T = 1</code> would sometimes say <code>moon</code> or <code>piano</code>. Each unlucky pick like that then becomes part of the context, and the rest of the text follows from it. We want variety, but only among <em>reasonable</em> tokens. This example uses <code>T = 0.8</code>, <code>K = 5</code>, <code>P = 0.9</code>.</p>
          </details>
          <details>
            <summary>Step by step: from logits to the filtered distribution</summary>
            <p>Sorted by probability (already in order here). "cum" is the running total of the <code>softmax(T)</code> column:</p>
            <table>
              <tr><th>token</th><th>logit</th><th>softmax(logit / 0.8)</th><th>cum</th><th>top-k=5?</th><th>top-p=0.9?</th><th>after renormalize</th></tr>
              <tr><td>mat</td><td>3.0</td><td>0.559</td><td>0.559</td><td>keep</td><td>keep</td><td><strong>0.598</strong></td></tr>
              <tr><td>sofa</td><td>2.2</td><td>0.206</td><td>0.765</td><td>keep</td><td>keep</td><td><strong>0.220</strong></td></tr>
              <tr><td>floor</td><td>1.8</td><td>0.125</td><td>0.890</td><td>keep</td><td>keep</td><td><strong>0.133</strong></td></tr>
              <tr><td>roof</td><td>1.0</td><td>0.046</td><td>0.936</td><td>keep</td><td>keep (cum reaches 0.9 here, stop)</td><td><strong>0.049</strong></td></tr>
              <tr><td>bed</td><td>0.8</td><td>0.036</td><td>0.972</td><td>keep</td><td>cut</td><td>0.000</td></tr>
              <tr><td>table</td><td>0.5</td><td>0.025</td><td></td><td>cut</td><td>cut</td><td>0.000</td></tr>
              <tr><td>moon</td><td>-1.0</td><td>0.004</td><td></td><td>cut</td><td>cut</td><td>0.000</td></tr>
              <tr><td>piano</td><td>-2.0</td><td>0.001</td><td></td><td>cut</td><td>cut</td><td>0.000</td></tr>
            </table>
            <p>Top-k=5 would allow 5 tokens, but top-p stops earlier, after 4. The 4 survivors sum to 0.936, so each is divided by 0.936 (e.g. 0.559 / 0.936 ≈ 0.598). The console prints these same columns.</p>
            <p>Sampling uses the <em>cumulative</em> final probabilities as bins: mat <code>[0, 0.598)</code>, sofa <code>[0.598, 0.818)</code>, floor <code>[0.818, 0.951)</code>, roof <code>[0.951, 1)</code>. The first four random numbers from <code>mulberry32(42)</code> are:</p>
            <table>
              <tr><th>draw</th><th>u</th><th>falls in bin</th><th>pick</th></tr>
              <tr><td>1</td><td>0.601</td><td>[0.598, 0.818)</td><td>sofa</td></tr>
              <tr><td>2</td><td>0.448</td><td>[0, 0.598)</td><td>mat</td></tr>
              <tr><td>3</td><td>0.852</td><td>[0.818, 0.951)</td><td>floor</td></tr>
              <tr><td>4</td><td>0.670</td><td>[0.598, 0.818)</td><td>sofa</td></tr>
            </table>
            <p>Console: <code>10 samples (seed 42): sofa mat floor sofa mat mat mat sofa floor mat</code>. Six of the 10 are <code>mat</code>, which fits its 0.598 probability. <code>moon</code> and <code>piano</code> can never appear.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">const scaled = xs.map(x =&gt; x / T);    // ① temperature BEFORE softmax
if (r &gt;= k) break;                    // ② top-k: stop after k tokens
if (cum &gt;= p) break;                  // ③ top-p: stop once the nucleus is full
return kept.map(q =&gt; q / z);          // ④ renormalize survivors to sum to 1</code></pre>
            <ol>
              <li><strong>①</strong> Temperature scales the <em>logits</em>, not the probabilities. Dividing by 0.8 stretches the gaps between logits, so the top token gains probability (0.559 at T=0.8; it would be ≈0.47 at T=1).</li>
              <li><strong>②</strong> The loop walks tokens in descending order. Once <code>k</code> are kept, it stops.</li>
              <li><strong>③</strong> The token that pushes the total <em>past</em> p is kept, then the loop stops. So at least one token always survives, even with a tiny p.</li>
              <li><strong>④</strong> Without renormalizing, the probabilities would sum to 0.936 and the sampling bins would not cover [0, 1).</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Set <code>T = 0.1</code>: <code>mat</code> gets almost all the probability and all 10 samples become <code>mat</code>, which is basically greedy.</li>
              <li>Set <code>T = 2</code>, <code>P = 1</code>, <code>K = 8</code>: the distribution flattens: <code>moon</code> and <code>piano</code> now have about 6% probability together, so with other seeds or more samples they start to show up.</li>
              <li>Set <code>K = 2</code>: now top-k is the tighter filter and only mat/sofa survive.</li>
              <li>Change the seed from 42: you get a different sample sequence, but the same one on every run with that seed.</li>
            </ul>
            <div class="warn">A common bug is to apply top-p to the <em>unsorted</em> list. The nucleus must be built from the most likely tokens downward, or you'll keep random tokens.</div>
          </details>
        `,
      },
      {
        title: 'In PyTorch: temperature + top-k + top-p',
        runnable: false,
        lang: 'python',
        code: `import torch


@torch.no_grad()
def sample_next(logits, temperature=1.0, top_k=None, top_p=None):
    # logits: [V] for the last position
    if temperature == 0:
        return int(torch.argmax(logits))  # greedy
    logits = logits / temperature
    if top_k is not None:
        kth = torch.topk(logits, top_k).values[-1]
        logits = logits.masked_fill(logits < kth, float("-inf"))
    if top_p is not None:
        sorted_logits, idx = torch.sort(logits, descending=True)
        probs = torch.softmax(sorted_logits, dim=-1)
        cum = torch.cumsum(probs, dim=-1)
        remove = (cum - probs) >= top_p  # nucleus already full before this token
        sorted_logits[remove] = float("-inf")
        logits = torch.full_like(logits, float("-inf")).scatter(0, idx, sorted_logits)
    probs = torch.softmax(logits, dim=-1)  # renormalizes the survivors
    return int(torch.multinomial(probs, num_samples=1))`,
      },
    ],
    quiz: [
      {
        q: 'What happens to the distribution when temperature T goes from 1 to 0.3?',
        options: [
          'It becomes flatter (more random)',
          'It becomes sharper: the top token gets more probability',
          'Nothing, temperature only affects training',
          'All probabilities become equal',
        ],
        answer: 1,
        why: 'Dividing logits by a small T makes the gaps between them bigger, so softmax concentrates on the top token. T → 0 is greedy.',
      },
      {
        q: 'Probabilities (sorted) are 0.5, 0.3, 0.1, 0.05, 0.05. With top-p = 0.75, which tokens survive?',
        options: ['Only the first', 'The first two', 'The first three', 'All five'],
        answer: 1,
        why: '0.5 < 0.75, then 0.5 + 0.3 = 0.8 ≥ 0.75, so we stop after the second token. The survivors are renormalized to 0.625 and 0.375.',
      },
      {
        q: 'What advantage does top-p have over top-k?',
        options: [
          'It is deterministic',
          'The number of kept tokens adapts to how confident the model is',
          'It does not need a softmax',
          'It always keeps exactly 10 tokens',
        ],
        answer: 1,
        why: 'When the model is sure, the nucleus is tiny; when many continuations fit, it is large. A fixed k cannot adapt.',
      },
      {
        q: 'Why must you renormalize after filtering?',
        options: [
          'To make the logits positive',
          'So the kept probabilities sum to 1 and form a valid distribution to sample from',
          'To undo the temperature',
          'It is optional and has no effect',
        ],
        answer: 1,
        why: 'After zeroing the tail the sum is below 1. Sampling with cumulative bins needs the bins to cover [0, 1).',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement <code>topP(probs, p)</code>: keep the smallest set of most-likely tokens whose total probability is ≥ <code>p</code>, zero the rest, and renormalize.</p>
        <p>Expected output: <code>p=0.5</code> keeps 2 (mat 0.645, sofa 0.355), <code>p=0.8</code> keeps 4, <code>p=0.95</code> keeps 6.</p>`,
      starter: `const tokens = ['mat', 'sofa', 'floor', 'roof', 'bed', 'table', 'moon', 'piano'];
const probs = [0.40, 0.22, 0.15, 0.09, 0.06, 0.04, 0.03, 0.01];

// TODO: keep the smallest set of most-likely tokens whose total probability >= p,
// zero out the rest, then renormalize so the kept ones sum to 1.
function topP(probs, p) {
  return probs; // placeholder: keeps everything
}

for (const p of [0.5, 0.8, 0.95]) {
  const out = topP(probs, p);
  const kept = tokens.filter((t, i) => out[i] > 0);
  console.log('p=' + p + ' keeps ' + kept.length + ': ' +
    kept.map(t => t + ' ' + out[tokens.indexOf(t)].toFixed(3)).join(', '));
}`,
      hint: 'Sort the indices by probability, descending. Walk them, add each to a Set and to a running sum, and break once sum >= p. Then map: kept ? q / total : 0.',
      solution: `const tokens = ['mat', 'sofa', 'floor', 'roof', 'bed', 'table', 'moon', 'piano'];
const probs = [0.40, 0.22, 0.15, 0.09, 0.06, 0.04, 0.03, 0.01];

function topP(probs, p) {
  const order = probs.map((q, i) => i).sort((a, b) => probs[b] - probs[a]);
  const keep = new Set();
  let cum = 0;
  for (const i of order) {
    keep.add(i); // always keep at least the top token
    cum += probs[i];
    if (cum >= p) break;
  }
  const kept = probs.map((q, i) => (keep.has(i) ? q : 0));
  const z = kept.reduce((a, b) => a + b, 0);
  return kept.map(q => q / z);
}

for (const p of [0.5, 0.8, 0.95]) {
  const out = topP(probs, p);
  const kept = tokens.filter((t, i) => out[i] > 0);
  console.log('p=' + p + ' keeps ' + kept.length + ': ' +
    kept.map(t => t + ' ' + out[tokens.indexOf(t)].toFixed(3)).join(', '));
}`,
    },
  },

  // ───────────────────────────── kv-cache ─────────────────────────────
  {
    id: 'kv-cache',
    section: 'From Transformer to LLM',
    title: 'The KV Cache',
    explain: `
      <p>Generation is <strong>autoregressive</strong>: predict one token, append it, run the model again, predict the next. A 500-token answer means 500 forward passes.</p>
      <h3>The waste</h3>
      <p>At step t the model processes positions <code>0..t</code>. But because of the causal mask, the keys and values at earlier positions <strong>never change</strong>. Position 3's K and V only depend on tokens 0..3, and those tokens are fixed. Without a cache, every step recomputes all of them from scratch, and the total work grows with t².</p>
      <h3>The fix: cache K and V</h3>
      <p>Keep each layer's K and V matrices in memory. At each new step:</p>
      <ol>
        <li>Run <strong>only the new token</strong> through the model.</li>
        <li>In every layer, compute its q, k, v (one row each), <strong>append</strong> k and v to that layer's cache.</li>
        <li>Attention: the new <code>q</code> against <em>all</em> cached keys → weights → weighted sum of cached values.</li>
      </ol>
      <p>We don't cache Q: past queries are never needed again, because only the newest position is predicting anything. Real inference has two phases. <strong>Prefill</strong> processes the whole prompt in parallel and fills the cache. <strong>Decode</strong> then generates one token at a time using the cache.</p>
      <h3>The price: memory</h3>
      <pre><code>KV cache bytes = 2 · n_layers · n_kv_heads · d_head · seq_len · bytes_per_value
                 ↑ K and V                                    ↑ 2 for fp16/bf16
(multiply by batch size when serving several sequences)</code></pre>
      <p>Example: 32 layers, 32 KV heads, <code>d_head</code> = 128, 4,096 tokens, fp16 → <strong>2 GiB per sequence</strong>. That is 512 KiB for every single token. Serve 30 users with long contexts and the cache can outweigh the model itself. This is why modern models shrink it with <strong>GQA/MQA</strong> (fewer KV heads, see "Modern Architecture Tweaks") and why providers often charge less for cached prompt prefixes.</p>
      <div class="tip">With the cache, each decode step does little computation but must <em>read</em> all the weights and the whole cache from GPU memory. So decoding is usually <strong>memory-bandwidth bound</strong>, not compute bound. Batching many users together helps, because they share one read of the weights.</div>
      <div class="warn">The cache is only valid for an exact prefix. Change one early token, e.g. edit the system prompt, and every K/V after it must be recomputed.</div>
    `,
    examples: [
      {
        title: 'Step through: with vs without cache',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .cols { display:flex; gap:16px; }
  .pane { flex:1; border:1px solid #dde; border-radius:8px; padding:8px; }
  .pane h4 { margin:0 0 6px; font-size:14px; }
  .grid { display:flex; flex-direction:column; gap:3px; min-height:200px; }
  .r { display:flex; gap:3px; align-items:center; font-size:12px; }
  .r .w { width:44px; color:#555; }
  .c { width:52px; height:20px; border-radius:4px; font-size:11px; display:flex; align-items:center; justify-content:center; }
  .new { background:#f08a24; color:#fff; }
  .re { background:#e8505b; color:#fff; }
  .old { background:#cfe3cf; color:#245b24; }
  .cnt { font-size:13px; margin-top:6px; }
  .legend span { display:inline-block; width:12px; height:12px; border-radius:3px; vertical-align:middle; margin:0 4px 0 10px; }
</style>
<div class="card">
  <div style="font-weight:600">Generating "The cat sat on the mat" one token at a time</div>
  <div style="margin:6px 0">
    <button id="next">Next step</button>
    <button id="reset">Reset</button>
    <span id="stepl" style="margin-left:8px;font-size:14px"></span>
  </div>
  <div class="cols">
    <div class="pane"><h4>Without cache</h4><div class="grid" id="g0"></div><div class="cnt" id="c0"></div></div>
    <div class="pane"><h4>With KV cache</h4><div class="grid" id="g1"></div><div class="cnt" id="c1"></div></div>
  </div>
  <div class="legend" style="font-size:12px;margin-top:6px">
    <span class="new"></span>computed for the new token
    <span class="re"></span>recomputed (wasted)
    <span class="old"></span>read from cache
  </div>
</div>
<script>
  const words = ['The', 'cat', 'sat', 'on', 'the', 'mat'];
  let step = 0;
  let tot0 = 0;
  let tot1 = 0;
  const $ = id => document.getElementById(id);

  function row(word, cls, label) {
    return '<div class="r"><span class="w">' + word + '</span>' +
      '<span class="c ' + cls + '">K</span><span class="c ' + cls + '">V</span>' +
      '<span style="color:#777;margin-left:4px">' + label + '</span></div>';
  }

  function render() {
    let a = '';
    let b = '';
    for (let i = 0; i < step; i++) {
      const isNew = i === step - 1;
      a += row(words[i], isNew ? 'new' : 're', isNew ? 'new' : 'recomputed');
      b += row(words[i], isNew ? 'new' : 'old', isNew ? 'new' : 'cached');
    }
    $('g0').innerHTML = a;
    $('g1').innerHTML = b;
    $('c0').innerHTML = 'this step: <b>' + step + '</b> K/V rows computed<br>total so far: <b>' + tot0 + '</b>';
    $('c1').innerHTML = 'this step: <b>' + (step ? 1 : 0) + '</b> K/V row computed<br>total so far: <b>' + tot1 + '</b>';
    $('stepl').textContent = step ? 'step ' + step + ': processing "' + words[step - 1] + '"' : 'press Next step';
    $('next').disabled = step >= words.length;
  }

  $('next').onclick = () => {
    step++;
    tot0 += step;
    tot1 += 1;
    render();
  };
  $('reset').onclick = () => {
    step = 0;
    tot0 = 0;
    tot1 = 0;
    render();
  };
  render();
</script>`,
      },
      {
        title: 'Counting the work (and checking the answer is identical)',
        lang: 'js',
        code: `// A tiny 1-head attention with d = 2. Tokens are just 2-number vectors.
const seq = [[1, 0], [0, 1], [1, 1], [0.5, -1], [-1, 0.5], [1, -0.5]];
const PROMPT_LEN = 3;

const Wq = [[1, 0], [0, 1]];
const Wk = [[0.5, 1], [1, -0.5]];
const Wv = [[1, 0.5], [0, 1]];

let projOps = 0; // how many token-vectors we push through Wk and Wv
let dotOps = 0; // how many q·k dot products we compute

const matVec = (W, x) => W.map(row => row[0] * x[0] + row[1] * x[1]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];

function attend(q, K, V) {
  const scores = K.map(k => {
    dotOps++;
    return dot(q, k) / Math.sqrt(2);
  });
  const m = Math.max(...scores);
  const w = scores.map(s => Math.exp(s - m));
  const z = w.reduce((a, b) => a + b, 0);
  return [0, 1].map(j => V.reduce((acc, v, i) => acc + (w[i] / z) * v[j], 0));
}

function kv(x) {
  projOps++;
  return [matVec(Wk, x), matVec(Wv, x)];
}

// ── Without cache: every step re-runs ALL positions (causal) ──
function stepNoCache(tokens) {
  const K = [];
  const V = [];
  let out;
  for (const x of tokens) { // ① recompute K,V for every token again
    const [k, v] = kv(x);
    K.push(k);
    V.push(v);
    out = attend(matVec(Wq, x), K, V); // each position attends to its prefix
  }
  return out; // only the LAST position's output is used to pick the next token
}

// ── With cache: keep K,V from earlier steps, add only the new token ──
const cacheK = [];
const cacheV = [];
function stepWithCache(newTokens) {
  let out;
  for (const x of newTokens) {
    const [k, v] = kv(x); // ② only new tokens get projected
    cacheK.push(k); // ③ append one row
    cacheV.push(v);
    out = attend(matVec(Wq, x), cacheK, cacheV);
  }
  return out;
}

let totalNo = { proj: 0, dot: 0 };
let totalYes = { proj: 0, dot: 0 };

console.log('step len | no-cache proj dots | cache proj dots | same output?');
for (let len = PROMPT_LEN; len <= seq.length; len++) {
  projOps = 0;
  dotOps = 0;
  const a = stepNoCache(seq.slice(0, len));
  const no = { proj: projOps, dot: dotOps };

  projOps = 0;
  dotOps = 0;
  const fresh = len === PROMPT_LEN ? seq.slice(0, len) : [seq[len - 1]];
  const b = stepWithCache(fresh);
  const yes = { proj: projOps, dot: dotOps };

  totalNo.proj += no.proj;
  totalNo.dot += no.dot;
  totalYes.proj += yes.proj;
  totalYes.dot += yes.dot;

  const same = Math.abs(a[0] - b[0]) < 1e-12 && Math.abs(a[1] - b[1]) < 1e-12;
  console.log(
    String(len - PROMPT_LEN + 1).padStart(4),
    String(len).padStart(3),
    ' |',
    String(no.proj).padStart(9),
    String(no.dot).padStart(4),
    ' |',
    String(yes.proj).padStart(9),
    String(yes.dot).padStart(4),
    ' |',
    same ? 'yes' : 'NO',
    '[' + b.map(v => v.toFixed(3)).join(', ') + ']'
  );
}
console.log('TOTAL  no-cache: proj=' + totalNo.proj + ' dots=' + totalNo.dot +
  '   with cache: proj=' + totalYes.proj + ' dots=' + totalYes.dot);

// ── Memory cost of the cache for a real-size model ──
function kvBytes(layers, kvHeads, dHead, seqLen, bytes) {
  return 2 * layers * kvHeads * dHead * seqLen * bytes; // 2 = K and V
}
const GiB = 1024 ** 3;
console.log('32 layers, 32 kv heads, d_head 128, 4096 tokens, fp16:',
  (kvBytes(32, 32, 128, 4096, 2) / GiB).toFixed(2), 'GiB');
console.log('same but 8 kv heads (GQA):',
  (kvBytes(32, 8, 128, 4096, 2) / GiB).toFixed(2), 'GiB');`,
        explain: `
          <details>
            <summary>The problem: recomputing the past at every step</summary>
            <p>The sequence has 6 tokens. The first 3 are the prompt; tokens 4, 5 and 6 are "generated" (hard-coded here so the numbers are easy to follow). At each step we need the attention output for the <em>last</em> position only, because that's what predicts the next token.</p>
            <p><code>stepNoCache</code> runs the whole prefix again: it projects every token to K,V and computes attention for every position. It then throws everything away except the last output.</p>
          </details>
          <details>
            <summary>Step by step: the console table</summary>
            <table>
              <tr><th>step</th><th>len</th><th>no-cache K/V projections</th><th>no-cache dot products</th><th>cache projections</th><th>cache dot products</th><th>last output</th></tr>
              <tr><td>1 (prefill)</td><td>3</td><td>3</td><td>6 = 1+2+3</td><td>3</td><td>6</td><td>[1.160, 0.657]</td></tr>
              <tr><td>2</td><td>4</td><td>4</td><td>10 = 1+2+3+4</td><td><strong>1</strong></td><td><strong>4</strong></td><td>[0.810, 0.679]</td></tr>
              <tr><td>3</td><td>5</td><td>5</td><td>15</td><td><strong>1</strong></td><td><strong>5</strong></td><td>[0.275, -0.260]</td></tr>
              <tr><td>4</td><td>6</td><td>6</td><td>21</td><td><strong>1</strong></td><td><strong>6</strong></td><td>[0.610, 0.578]</td></tr>
              <tr><td>total</td><td></td><td>18</td><td>52</td><td>6</td><td>21</td><td>same? yes, every step</td></tr>
            </table>
            <p>Without the cache, a step at length t costs t projections and 1+2+…+t = t(t+1)/2 dot products, so the total over a whole generation grows like t³ for dot products. With the cache it's 1 projection and t dot products per step. Prefill is the same in both cases, since the prompt has to be processed once either way.</p>
            <p>The last two console lines apply the memory formula: <code>2.00 GiB</code> for 32 KV heads, <code>0.50 GiB</code> for 8 (GQA).</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">for (const x of tokens) {         // ① no cache: loop over the WHOLE prefix again
  const [k, v] = kv(x);
  ...
const [k, v] = kv(x);             // ② cache: only the new token is projected
cacheK.push(k);                   // ③ append one row; old rows are reused as-is
out = attend(matVec(Wq, x), cacheK, cacheV);</code></pre>
            <ol>
              <li><strong>①</strong> The no-cache version has no memory between calls. It rebuilds K and V for positions it has already seen many times.</li>
              <li><strong>②</strong> The cache version only projects tokens it hasn't seen yet: all 3 during prefill, then 1 per step.</li>
              <li><strong>③</strong> The new query attends to all cached keys. Old keys and values are still correct because the causal mask means earlier positions never depend on later tokens. That's why the outputs match exactly (<code>same output? yes</code>).</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Add more rows to <code>seq</code> (e.g. 20 tokens) and compare the totals. The no-cache dot count grows much faster.</li>
              <li>Change <code>kvBytes(32, 32, 128, 4096, 2)</code> to a 128k context (<code>131072</code>): 64 GiB for one sequence with full multi-head attention.</li>
            </ul>
            <div class="warn">The cache trick depends on the causal mask. In a bidirectional encoder (BERT-style), adding a token changes the representations of <em>earlier</em> tokens too, so their K and V can't be reused.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why do we cache K and V but not Q?',
        options: [
          'Q is too large to store',
          'Past queries are never used again; only the newest position needs a query, while all past keys/values are attended to',
          'Q is recomputed from the cache',
          'Q does not exist in decoder-only models',
        ],
        answer: 1,
        why: 'At each decode step only the new token asks "what should I attend to?" (its q). It needs every earlier k and v, which stay unchanged under the causal mask.',
      },
      {
        q: 'A model has 40 layers, 8 KV heads, d_head = 128, fp16. How many bytes of KV cache per token?',
        options: ['81,920', '163,840', '1,310,720', '40,960'],
        answer: 1,
        why: '2 · 40 · 8 · 128 · 2 bytes = 163,840 bytes ≈ 160 KiB per token.',
      },
      {
        q: 'With the KV cache, how does the work per decode step scale with current length t?',
        options: ['Constant', 'Linear in t (new query against t keys)', 'Quadratic in t', 'Exponential in t'],
        answer: 1,
        why: 'Projections are O(1) per step; the attention dot products are one query against t cached keys, so O(t). Without the cache, one step is O(t²).',
      },
      {
        q: 'What is the "prefill" phase?',
        options: [
          'Filling the vocabulary',
          'Processing the whole prompt in one parallel pass to build the KV cache before generating',
          'Pretraining on filler data',
          'Padding the sequence with zeros',
        ],
        answer: 1,
        why: 'The prompt tokens are all known, so they can be processed in parallel like in training. Then decoding continues token by token.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Complete <code>bytesPerToken(c)</code> (KV cache bytes for ONE token, across all layers, K and V, fp16). Then print how many tokens fit in a 16 GiB cache budget for each config.</p>
        <p>Expected: model A 524288 bytes/token → 32768 tokens; model B 131072 bytes/token → 131072 tokens.</p>`,
      starter: `// Two made-up model configs (roughly 7-8B-sized)
const configs = [
  { name: 'model A (MHA)', layers: 32, kvHeads: 32, dHead: 128 },
  { name: 'model B (GQA)', layers: 32, kvHeads: 8, dHead: 128 },
];
const BYTES = 2; // fp16 / bf16
const GiB = 1024 ** 3;

// TODO 1: bytes of KV cache for ONE token (all layers, K and V)
function bytesPerToken(c) {
  return 0;
}

// TODO 2: how many tokens fit in a 16 GiB cache budget?
for (const c of configs) {
  const perTok = bytesPerToken(c);
  console.log(c.name, '| per token:', perTok, 'bytes');
}`,
      hint: 'bytesPerToken = 2 · layers · kvHeads · dHead · BYTES. Tokens that fit = Math.floor(16 · GiB / bytesPerToken).',
      solution: `// Two made-up model configs (roughly 7-8B-sized)
const configs = [
  { name: 'model A (MHA)', layers: 32, kvHeads: 32, dHead: 128 },
  { name: 'model B (GQA)', layers: 32, kvHeads: 8, dHead: 128 },
];
const BYTES = 2; // fp16 / bf16
const GiB = 1024 ** 3;

function bytesPerToken(c) {
  return 2 * c.layers * c.kvHeads * c.dHead * BYTES; // 2 = one K and one V
}

for (const c of configs) {
  const perTok = bytesPerToken(c);
  const fit = Math.floor((16 * GiB) / perTok);
  console.log(c.name, '| per token:', perTok, 'bytes (' + (perTok / 1024).toFixed(0) + ' KiB)',
    '| tokens in 16 GiB:', fit);
}`,
    },
  },

  // ───────────────────────────── pretraining ─────────────────────────────
  {
    id: 'pretraining',
    section: 'From Transformer to LLM',
    title: 'Pretraining at Scale',
    explain: `
      <p><strong>Pretraining</strong> is the loop you already know (next-token prediction, cross-entropy, gradient descent), just run at enormous scale. The objective is the same as in the tiny examples; what changes is how much data and compute you put in.</p>
      <h3>Data</h3>
      <p>Modern LLMs are pretrained on <strong>trillions of tokens</strong>: filtered web crawls (e.g. Common Crawl-derived sets like FineWeb), source code, books, Wikipedia, scientific papers, math, and more and more synthetic data. Much of the engineering goes into the data: deduplication, quality filters, removing boilerplate and toxic or personal data, and mixing sources in the right proportions. Data quality is one of the biggest levers on model quality.</p>
      <h3>Compute</h3>
      <p>A handy rule: training costs about <code>C ≈ 6 · N · D</code> FLOPs. Here <code>N</code> = parameters and <code>D</code> = training tokens; roughly 2ND for the forward pass and 4ND for the backward pass. An 8B model on 15T tokens is ≈ 7·10²³ FLOPs. That means thousands of GPUs running for weeks, in parallel across data, layers and tensors.</p>
      <h3>Scaling laws</h3>
      <ul>
        <li><strong>Kaplan et al. (OpenAI, 2020)</strong> found that loss falls as a smooth <strong>power law</strong> in N, D and C over many orders of magnitude. On a log-log plot these are straight lines. Their reading was that when compute grows, most of it should go into bigger models.</li>
        <li><strong>Hoffmann et al. ("Chinchilla", DeepMind, 2022)</strong> redid the analysis and concluded that N and D should grow <em>together</em>: roughly <strong>~20 training tokens per parameter</strong> is compute-optimal. Their 70B Chinchilla (1.4T tokens) beat the 280B Gopher trained with the same compute.</li>
        <li><strong>Since then</strong>, models are usually trained <em>far past</em> the Chinchilla ratio. Chinchilla optimizes <em>training</em> compute only. But a model is trained once and then served billions of times, so a smaller model trained much longer is cheaper to run. For example, Meta reported training Llama 3 8B on over 15T tokens, which is nearly 1,900 tokens per parameter.</li>
      </ul>
      <div class="tip">Scaling laws let labs run small, cheap experiments, fit a curve, and predict the loss of a run 100× bigger <em>before</em> paying for it. Lower loss usually means better downstream abilities, but specific skills can appear fairly suddenly and are harder to predict than the loss.</div>
      <div class="warn">The widget below uses a made-up formula with the <em>shape</em> of the Chinchilla fit (<code>L = E + A/N^α + B/D^α</code>), with constants chosen so the optimum is exactly 20 tokens/param. It shows the idea, not real measurements.</div>
    `,
    examples: [
      {
        title: 'Illustrative scaling curves: pick a compute budget',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .ctl { font-size:14px; display:flex; align-items:center; gap:8px; }
  .out { font-size:14px; margin-top:4px; }
  .warnlbl { color:#b3261e; font-size:12px; font-weight:600; }
</style>
<div class="card">
  <div style="font-weight:600">Loss vs training compute (log-log) <span class="warnlbl">ILLUSTRATIVE: made-up constants, not real data</span></div>
  <svg id="svg" width="640" height="290" viewBox="0 0 640 290"></svg>
  <div class="ctl">
    <label for="c">compute budget C</label>
    <input id="c" type="range" min="18" max="24" step="0.1" value="21" style="flex:1">
    <span id="cv" style="font-family:ui-monospace,monospace"></span>
  </div>
  <div class="out" id="out"></div>
</div>
<script>
  // Toy law with the Chinchilla shape: L(N, D) = E + A / N^a + B / D^a, and C = 6 N D.
  // B is chosen so the best tokens-per-parameter ratio is exactly 20.
  const E0 = 1.7;
  const a = 0.3;
  const A = 400;
  const B = A * Math.pow(20, a);
  const loss = (N, D) => E0 + A / Math.pow(N, a) + B / Math.pow(D, a);
  const sizes = [1e8, 4e8, 1.6e9, 6.4e9, 2.6e10, 1e11];
  const colors = ['#9aa7c7', '#7f8fbf', '#6478b8', '#4a62b0', '#3149a6', '#1b3290'];
  const NS = 'http://www.w3.org/2000/svg';
  const X0 = 60, X1 = 620, Y0 = 20, Y1 = 250;
  const cmin = 18, cmax = 24, lmin = Math.log10(1.8), lmax = Math.log10(12);
  const sx = lc => X0 + (lc - cmin) / (cmax - cmin) * (X1 - X0);
  const sy = L => Y1 - (Math.log10(L) - lmin) / (lmax - lmin) * (Y1 - Y0);
  const svg = document.getElementById('svg');

  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function fmt(x) {
    const e = Math.floor(Math.log10(x));
    return (x / Math.pow(10, e)).toFixed(1) + 'e' + e;
  }

  function best(lc) {
    const C = Math.pow(10, lc);
    let bestN = 0, bestL = Infinity;
    for (let le = 6; le <= 13; le += 0.01) {
      const N = Math.pow(10, le);
      const L = loss(N, C / (6 * N));
      if (L < bestL) { bestL = L; bestN = N; }
    }
    return { N: bestN, D: C / (6 * bestN), L: bestL };
  }

  function draw() {
    const lc = +document.getElementById('c').value;
    svg.innerHTML = '';
    svg.appendChild(el('line', { x1: X0, y1: Y1, x2: X1, y2: Y1, stroke: '#888' }));
    svg.appendChild(el('line', { x1: X0, y1: Y0, x2: X0, y2: Y1, stroke: '#888' }));
    for (let e = 18; e <= 24; e++) {
      svg.appendChild(el('text', { x: sx(e), y: Y1 + 16, 'font-size': 11, 'text-anchor': 'middle', fill: '#555' }, '1e' + e));
    }
    [2, 3, 5, 8].forEach(L => {
      svg.appendChild(el('text', { x: X0 - 6, y: sy(L) + 4, 'font-size': 11, 'text-anchor': 'end', fill: '#555' }, L));
    });
    svg.appendChild(el('text', { x: (X0 + X1) / 2, y: Y1 + 34, 'font-size': 12, 'text-anchor': 'middle', fill: '#333' },
      'training compute C = 6·N·D (FLOPs)'));
    svg.appendChild(el('text', { x: 14, y: (Y0 + Y1) / 2, 'font-size': 12, fill: '#333',
      transform: 'rotate(-90 14 ' + (Y0 + Y1) / 2 + ')', 'text-anchor': 'middle' }, 'loss'));

    sizes.forEach((N, i) => {
      let d = '';
      let first = null;
      for (let c = cmin; c <= cmax; c += 0.05) {
        const D = Math.pow(10, c) / (6 * N);
        if (D < 1e7) continue;
        const L = loss(N, D);
        if (L > 12) continue;
        if (!first) first = [sx(c), sy(L)];
        d += (d ? 'L' : 'M') + sx(c).toFixed(1) + ' ' + sy(L).toFixed(1);
      }
      svg.appendChild(el('path', { d: d, fill: 'none', stroke: colors[i], 'stroke-width': 2 }));
      // label small models at the right end, big ones at their start (avoids overlap)
      const endY = sy(loss(N, Math.pow(10, cmax) / (6 * N)));
      const lx = i < 2 ? X1 - 2 : first[0] + 4;
      const ly = i < 2 ? endY - 4 : first[1] - 4;
      svg.appendChild(el('text', { x: lx, y: ly, 'font-size': 10, 'text-anchor': i < 2 ? 'end' : 'start',
        fill: colors[i] }, 'N=' + fmt(N)));
    });

    let f = '';
    for (let c = cmin; c <= cmax; c += 0.1) {
      f += (f ? 'L' : 'M') + sx(c).toFixed(1) + ' ' + sy(best(c).L).toFixed(1);
    }
    svg.appendChild(el('path', { d: f, fill: 'none', stroke: '#f08a24', 'stroke-width': 2, 'stroke-dasharray': '5 4' }));
    svg.appendChild(el('text', { x: sx(18.3), y: sy(best(18.3).L) + 16, 'font-size': 11, fill: '#c46a10' },
      'compute-optimal frontier'));

    const b = best(lc);
    svg.appendChild(el('line', { x1: sx(lc), x2: sx(lc), y1: Y0, y2: Y1, stroke: '#f08a24', 'stroke-opacity': 0.5 }));
    svg.appendChild(el('circle', { cx: sx(lc), cy: sy(b.L), r: 5, fill: '#f08a24' }));
    document.getElementById('cv').textContent = fmt(Math.pow(10, lc));
    document.getElementById('out').innerHTML = 'Best use of this budget: N ≈ <b>' + fmt(b.N) + '</b> params, D ≈ <b>' +
      fmt(b.D) + '</b> tokens (D/N ≈ ' + (b.D / b.N).toFixed(0) + '), toy loss ' + b.L.toFixed(2) +
      '.<br><span style="color:#666;font-size:12px">Each blue curve is one model size trained longer and longer: it keeps improving, then flattens. ' +
      'Bigger models flatten lower but cost more per token.</span>';
  }

  document.getElementById('c').addEventListener('input', draw);
  draw();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'Roughly how many FLOPs does it take to train a 1B-parameter model on 20B tokens (C ≈ 6ND)?',
        options: ['1.2·10¹⁹', '1.2·10²⁰', '1.2·10²¹', '2·10¹⁹'],
        answer: 1,
        why: '6 · 10⁹ · 2·10¹⁰ = 1.2·10²⁰ FLOPs.',
      },
      {
        q: 'What is the Chinchilla rule of thumb for compute-optimal training?',
        options: [
          '~1 token per parameter',
          '~20 tokens per parameter',
          '~1,000 tokens per parameter',
          'Always make the model as large as possible',
        ],
        answer: 1,
        why: 'Hoffmann et al. 2022 found params and tokens should scale roughly equally, at around 20 tokens per parameter for the lowest loss per training FLOP.',
      },
      {
        q: 'Why are many modern models trained on far more tokens than Chinchilla-optimal?',
        options: [
          'Chinchilla was proven wrong',
          'Inference cost: a smaller model trained longer is cheaper to serve at similar quality',
          'More tokens reduce the parameter count',
          'To make the KV cache smaller',
        ],
        answer: 1,
        why: 'Chinchilla minimizes training compute only. When a model will be served at huge volume, it can pay off to spend extra training compute to get a smaller model.',
      },
      {
        q: 'On a log-log plot of loss vs compute, a power law looks like…',
        options: ['An exponential curve', 'A straight line', 'A step function', 'A circle'],
        answer: 1,
        why: 'L = a·C^(-b) gives log L = log a − b·log C, which is linear in log C. Real curves bend toward an irreducible loss floor.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Use the rules of thumb <code>C = 6·N·D</code> and <code>D = 20·N</code>.</p>
        <ol>
          <li>For each compute budget, compute the Chinchilla-optimal N and D. (Expected for 1e23: N ≈ 2.89e10, D ≈ 5.77e11.)</li>
          <li>For an 8B model trained on 15T tokens, print tokens per parameter and training FLOPs.</li>
        </ol>`,
      starter: `// Rules of thumb: training FLOPs C ≈ 6 · N · D,  compute-optimal D ≈ 20 · N (Chinchilla)
const budgets = [1e21, 1e23, 1e25]; // FLOPs

// TODO 1: for each budget, find N and D with C = 6·N·D and D = 20·N
for (const C of budgets) {
  const N = 0; // params
  const D = 0; // tokens
  console.log('C=' + C.toExponential(0) + '  N=' + N.toExponential(2) + '  D=' + D.toExponential(2));
}

// TODO 2: an 8B-param model trained on 15T tokens. How many tokens per parameter?`,
      hint: 'Substitute D = 20N into C = 6ND: C = 120·N², so N = sqrt(C / 120).',
      solution: `// Rules of thumb: training FLOPs C ≈ 6 · N · D,  compute-optimal D ≈ 20 · N (Chinchilla)
const budgets = [1e21, 1e23, 1e25]; // FLOPs

// C = 6 · N · 20N = 120 N²  =>  N = sqrt(C / 120)
for (const C of budgets) {
  const N = Math.sqrt(C / 120); // params
  const D = 20 * N; // tokens
  console.log('C=' + C.toExponential(0) + '  N=' + N.toExponential(2) + '  D=' + D.toExponential(2));
}

const ratio = 15e12 / 8e9;
console.log('8B on 15T tokens: ' + ratio.toFixed(0) + ' tokens/param (' +
  (ratio / 20).toFixed(0) + 'x the Chinchilla ratio)');
console.log('training FLOPs ≈ ' + (6 * 8e9 * 15e12).toExponential(2));`,
    },
  },

  // ───────────────────────────── finetuning ─────────────────────────────
  {
    id: 'finetuning',
    section: 'From Transformer to LLM',
    title: 'From Base Model to Assistant',
    explain: `
      <p>A pretrained <strong>base model</strong> is a document completer. It has learned a lot about language, facts and code, but it only knows how to continue text in the style of its training data. Ask it a question and it might write more questions, because on the web a question is often followed by more questions. Turning it into an assistant takes <strong>post-training</strong>.</p>
      <h3>1. Supervised finetuning (SFT)</h3>
      <p>Train on (prompt, good response) pairs, from thousands up to millions of them, written by people or generated and filtered. It's the same next-token loss as pretraining, but usually counted only on the <em>response</em> tokens. The data is wrapped in a <strong>chat template</strong> with special tokens that mark roles (system, user, assistant) and where a turn ends. At inference the app formats your conversation with the <em>same</em> template and stops generating at the end-of-turn token.</p>
      <h3>2. Preference tuning</h3>
      <p>It's often easier to say which of two answers is better than to write the perfect one.</p>
      <ul>
        <li><strong>RLHF</strong> (as in InstructGPT, 2022): people rank model outputs → train a <strong>reward model</strong> that scores responses → optimize the LLM with RL (typically <strong>PPO</strong>) to get high reward. A KL penalty keeps it close to the SFT model so it doesn't drift into nonsense that happens to fool the reward model ("reward hacking").</li>
        <li><strong>DPO</strong> (Direct Preference Optimization, 2023): skips the separate reward model and RL loop. For each (prompt, chosen, rejected) triple, a simple classification-style loss pushes the model to raise the probability of the chosen answer relative to the rejected one, measured against a frozen reference model. It is simpler and more stable, and widely used.</li>
      </ul>
      <h3>3. RL for reasoning (verifiable rewards)</h3>
      <p>For math and code you can often <em>check</em> the answer automatically: compare to the known result, or run unit tests. Training with RL on such <strong>verifiable rewards</strong> encourages models to produce long chains of reasoning before answering. Reasoning-focused models (e.g. DeepSeek-R1, published in 2025, which used the GRPO algorithm) are built this way.</p>
      <h3>LoRA: finetuning on a budget</h3>
      <p>Full finetuning updates every weight and needs optimizer state for all of them. <strong>LoRA</strong> (Hu et al., 2021) freezes the pretrained <code>W</code> and learns a low-rank update: <code>W' = W + (α/r)·B·A</code>, where <code>A</code> is <code>r × d_in</code> and <code>B</code> is <code>d_out × r</code> with small <code>r</code> (4–64). <code>B</code> starts at zero, so training begins exactly at the base model. You typically train well under 1% of the parameters, and the small adapter can be stored separately or merged into <code>W</code> afterwards. <strong>QLoRA</strong> also keeps the frozen base in 4-bit precision to save memory.</p>
      <div class="tip">Rough mental model: pretraining puts in the knowledge and skills, SFT teaches the format and how to follow instructions, and preference tuning or RL adjusts behavior: helpfulness, tone, safety, and reasoning effort.</div>
      <div class="warn">Using the wrong chat template at inference, e.g. a Llama-style template on a model trained with ChatML, gives noticeably worse output even though nothing "errors". Use the tokenizer's own template (for example <code>tokenizer.apply_chat_template</code> in Hugging Face).</div>
    `,
    examples: [
      {
        title: 'Base model vs chat template vs loss mask',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .toks { display:flex; flex-wrap:wrap; gap:4px; margin:10px 0; font-family:ui-monospace, monospace; font-size:13px; }
  .t { padding:3px 6px; border-radius:4px; border:1px solid #d5d8e0; background:#f4f5f9; white-space:pre; }
  .sp { background:#efe3ff; border-color:#9b6ce0; color:#5a2ea6; }
  .loss { outline:2px solid #f08a24; background:#fff1e0; }
  .gen { border-style:dashed; color:#777; }
  .desc { font-size:14px; min-height:60px; background:#f7f7fa; padding:8px; border-radius:6px; }
  .on { background:#3b6fe0; color:#fff; border-color:#3b6fe0; }
  .legend { font-size:12px; color:#555; margin-top:6px; }
</style>
<div class="card">
  <div style="font-weight:600">Same question, three views</div>
  <div style="margin-top:6px">
    <button id="b0">Base model</button>
    <button id="b1">Chat template (SFT data)</button>
    <button id="b2">Loss mask</button>
  </div>
  <div class="toks" id="toks"></div>
  <div class="desc" id="desc"></div>
  <div class="legend">
    <span class="t sp">special token</span>
    <span class="t loss">counted in loss</span>
    <span class="t gen">generated by model</span>
    <div style="margin-top:6px">Template is ChatML-style (as used by e.g. Qwen); every model family defines its own.</div>
  </div>
</div>
<script>
  const views = [
    {
      desc: 'A <b>base model</b> just continues documents. Given a bare question, a plausible continuation on the web is often <i>another question</i> (a quiz list), not an answer.',
      toks: [['What', ''], [' is', ''], [' the', ''], [' capital', ''], [' of', ''], [' France', ''], ['?', ''],
        ['↵', 'gen'], ['What', 'gen'], [' is', 'gen'], [' the', 'gen'], [' capital', 'gen'], [' of', 'gen'], [' Spain', 'gen'], ['?', 'gen']],
    },
    {
      desc: 'After <b>SFT</b>, text is wrapped in a <b>chat template</b>. Special tokens mark who is speaking. The model learns: after <code>&lt;|im_start|&gt;assistant</code> comes a helpful answer, then <code>&lt;|im_end|&gt;</code> (stop).',
      toks: [['<|im_start|>', 'sp'], ['user', ''], ['↵', ''], ['What', ''], [' is', ''], [' the', ''], [' capital', ''], [' of', ''], [' France', ''], ['?', ''],
        ['<|im_end|>', 'sp'], ['↵', ''], ['<|im_start|>', 'sp'], ['assistant', ''], ['↵', ''],
        ['Paris', 'gen'], ['.', 'gen'], ['<|im_end|>', 'sp gen']],
    },
    {
      desc: 'During SFT the loss is usually computed only on the <b>assistant</b> tokens (orange). The prompt is context: we do not train the model to write the user’s question. Same next-token cross-entropy as pretraining, just masked.',
      toks: [['<|im_start|>', 'sp'], ['user', ''], ['↵', ''], ['What', ''], [' is', ''], [' the', ''], [' capital', ''], [' of', ''], [' France', ''], ['?', ''],
        ['<|im_end|>', 'sp'], ['↵', ''], ['<|im_start|>', 'sp'], ['assistant', ''], ['↵', ''],
        ['Paris', 'loss'], ['.', 'loss'], ['<|im_end|>', 'sp loss']],
    },
  ];

  function show(v) {
    const box = document.getElementById('toks');
    box.innerHTML = '';
    views[v].toks.forEach(([text, cls]) => {
      const s = document.createElement('span');
      s.className = 't ' + cls;
      s.textContent = text;
      box.appendChild(s);
    });
    document.getElementById('desc').innerHTML = views[v].desc;
    [0, 1, 2].forEach(i => document.getElementById('b' + i).classList.toggle('on', i === v));
  }

  [0, 1, 2].forEach(i => (document.getElementById('b' + i).onclick = () => show(i)));
  show(0);
</script>`,
      },
      {
        title: 'LoRA forward pass with numbers',
        lang: 'js',
        code: `// LoRA: freeze W (d_out x d_in), learn a low-rank update  W' = W + (alpha / r) · B·A
// A is r x d_in, B is d_out x r.  B starts at zero, so W' = W at step 0.
const dIn = 4;
const dOut = 4;
const r = 1;
const alpha = 2;

const W = [
  [0.5, -0.2, 0.1, 0.0],
  [0.3, 0.8, -0.5, 0.2],
  [0.0, 0.1, 0.9, -0.3],
  [-0.4, 0.2, 0.0, 0.6],
];
const A = [[0.1, 0.3, -0.2, 0.4]]; // r x dIn  (trained)
const B = [[0.5], [0.0], [-1.0], [0.2]]; // dOut x r (trained; pretend training moved it off zero)

const x = [1, 2, 0, -1];
const matVec = (M, v) => M.map(row => row.reduce((s, m, j) => s + m * v[j], 0));

const base = matVec(W, x); // ① frozen path
const low = matVec(B, matVec(A, x)); // ② cheap path: x -> r numbers -> dOut numbers
const out = base.map((v, i) => v + (alpha / r) * low[i]); // ③ add them

console.log('W·x         =', base.map(v => v.toFixed(2)).join(', '));
console.log('B·(A·x)     =', low.map(v => v.toFixed(2)).join(', '));
console.log('LoRA output =', out.map(v => v.toFixed(2)).join(', '));
console.log('trainable params: full = ' + dIn * dOut + ', LoRA = ' + r * (dIn + dOut));`,
      },
      {
        title: 'In PyTorch: a minimal LoRA linear layer',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn


class LoRALinear(nn.Module):
    def __init__(self, base: nn.Linear, r=8, alpha=16):
        super().__init__()
        self.base = base
        for p in self.base.parameters():
            p.requires_grad_(False)  # freeze the pretrained weight
        self.A = nn.Parameter(torch.randn(r, base.in_features) * 0.01)
        self.B = nn.Parameter(torch.zeros(base.out_features, r))  # zero => starts as a no-op
        self.scale = alpha / r

    def forward(self, x):  # x: [..., in_features]
        return self.base(x) + (x @ self.A.T @ self.B.T) * self.scale


# Wrap e.g. every attention projection, then train only A and B:
# block.attn.q_proj = LoRALinear(block.attn.q_proj, r=8)`,
      },
    ],
    quiz: [
      {
        q: 'You prompt a base (non-chat) model with "What is the capital of France?". What is a likely failure?',
        options: [
          'It refuses to answer',
          'It continues the document, e.g. with more quiz questions, instead of answering',
          'It outputs only special tokens',
          'It crashes because there is no chat template',
        ],
        answer: 1,
        why: 'A base model predicts plausible continuations of web-like text. Answering reliably is learned in SFT.',
      },
      {
        q: 'In SFT, which tokens usually contribute to the loss?',
        options: ['All tokens including the prompt', 'Only the assistant response tokens', 'Only special tokens', 'None, SFT has no loss'],
        answer: 1,
        why: 'The prompt is context. Masking it out focuses learning on producing good responses (including the end-of-turn token).',
      },
      {
        q: 'What does DPO remove compared to classic RLHF?',
        options: [
          'The preference data',
          'The separately trained reward model and the RL (PPO) loop',
          'The pretrained model',
          'The tokenizer',
        ],
        answer: 1,
        why: 'DPO optimizes directly on preference pairs with a supervised-style loss, relative to a frozen reference model.',
      },
      {
        q: 'LoRA with rank r on a d×d matrix trains how many parameters?',
        options: ['d²', 'r²', '2·r·d', 'd/r'],
        answer: 2,
        why: 'A is r×d and B is d×r, so r·d + d·r = 2rd. For d=4096 and r=8 that is 65,536 instead of 16.7M.',
      },
      {
        q: 'What makes a reward "verifiable" in RL for reasoning?',
        options: [
          'A human rates every answer',
          'Correctness can be checked automatically, e.g. matching a math answer or passing unit tests',
          'The model rates itself',
          'It is always 1',
        ],
        answer: 1,
        why: 'Automatic checks give cheap and reliable reward signals, which lets RL scale on math and coding problems.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>A 7B-ish model has 32 layers with <code>d_model = 4096</code>. We apply LoRA to the 4 attention projections (q, k, v, o) in every layer.</p>
        <ol>
          <li>Print the parameter count for fully finetuning those matrices.</li>
          <li>Complete <code>loraParams(r)</code> and print it for r = 4, 8, 16, 64 with the % of full. (Expected r=8: 8.39M, 0.39%.)</li>
        </ol>`,
      starter: `// A 7B-ish model: 32 layers, d_model = 4096.
// Say we apply LoRA to the 4 attention projections (q, k, v, o), each 4096 x 4096.
const layers = 32;
const d = 4096;
const matsPerLayer = 4;

// TODO: trainable params for FULL finetuning of those matrices
// TODO: trainable params for LoRA with rank r (each matrix gets A: r x d and B: d x r)
function loraParams(r) {
  return 0;
}

for (const r of [4, 8, 16, 64]) {
  console.log('r=' + r, loraParams(r));
}`,
      hint: 'Full: layers · 4 · d · d. LoRA per matrix: A (r × d) + B (d × r) = 2·r·d.',
      solution: `// A 7B-ish model: 32 layers, d_model = 4096.
// Say we apply LoRA to the 4 attention projections (q, k, v, o), each 4096 x 4096.
const layers = 32;
const d = 4096;
const matsPerLayer = 4;

const full = layers * matsPerLayer * d * d;
console.log('full finetune of q,k,v,o: ' + (full / 1e6).toFixed(1) + 'M params');

function loraParams(r) {
  return layers * matsPerLayer * (r * d + d * r);
}

for (const r of [4, 8, 16, 64]) {
  const n = loraParams(r);
  console.log('r=' + r + ': ' + (n / 1e6).toFixed(2) + 'M params (' + ((100 * n) / full).toFixed(2) + '% of full)');
}`,
    },
  },

  // ───────────────────────────── modern-tricks ─────────────────────────────
  {
    id: 'modern-tricks',
    section: 'From Transformer to LLM',
    title: 'Modern Architecture Tweaks',
    explain: `
      <p>A 2025-era open LLM is still recognizably the 2017 block: attention + FFN + residuals + norms. Most changes since then make it <strong>cheaper to run</strong> or able to handle <strong>longer context</strong>. The main ones are below. Exact recipes differ between models and versions, so treat the model names as examples.</p>
      <h3>MQA / GQA: fewer K/V heads</h3>
      <p>In standard multi-head attention (MHA) every query head has its own K and V head, and the KV cache stores all of them. <strong>Multi-Query Attention</strong> (Shazeer, 2019) shares <em>one</em> K/V head across all query heads. That's a big memory saving, with some quality cost. <strong>Grouped-Query Attention</strong> (Ainslie et al., 2023) is the middle ground: query heads are split into groups, and each group shares one K/V head. With 32 query heads and 8 KV heads, the cache is 4× smaller at close to MHA quality. GQA is standard in many open models (e.g. Llama 2 70B, Llama 3, Mistral, Qwen). DeepSeek went a different way with <em>multi-head latent attention</em>, which compresses K/V into a small latent vector.</p>
      <h3>FlashAttention: same math, less memory traffic</h3>
      <p>Naive attention writes the full <code>T × T</code> score matrix to GPU main memory (HBM), reads it back for softmax, writes it again… On GPUs, moving data is often slower than the arithmetic. <strong>FlashAttention</strong> (Dao et al., 2022, with v2 and v3 after) splits Q, K, V into tiles that fit in fast on-chip SRAM. It computes softmax <em>incrementally</em> with a running max and sum ("online softmax") and never materializes the full T×T matrix. The result is <strong>exactly the same attention output</strong> (up to floating-point rounding), much faster, with memory that grows linearly in T instead of quadratically. It changes how attention is computed, not what the model learns.</p>
      <h3>Mixture of Experts (MoE)</h3>
      <p>Replace the single FFN in a block with <strong>E expert FFNs</strong> and a small <strong>router</strong>. For each token, the router scores all experts, picks the <strong>top-k</strong> (often 1–8), and combines their outputs weighted by softmaxed router scores. Total parameters grow (more capacity and knowledge) while <em>active</em> parameters per token stay small (compute per token stays low). Examples: Mixtral 8x7B picks 2 of 8 experts per layer (~47B total, ~13B active); DeepSeek-V3 reports 671B total with ~37B active. Training needs extra care, e.g. <strong>load balancing</strong> so the router doesn't send every token to the same few experts.</p>
      <h3>Long context</h3>
      <ul>
        <li><strong>RoPE scaling</strong>: a model trained on 4k or 8k positions sees unfamiliar rotation angles beyond that. Position interpolation, "NTK-aware" scaling and <strong>YaRN</strong> rescale the RoPE frequencies. A short finetune on long documents then extends the usable context, often to 128k or more.</li>
        <li><strong>Sliding-window attention</strong>: each token attends only to the last W tokens (Mistral 7B used W = 4096). Cost and cache grow with W instead of T. Information can still travel further through stacked layers, and some models alternate sliding-window and full-attention layers.</li>
      </ul>
      <div class="tip">Other common tweaks: RMSNorm instead of LayerNorm, SwiGLU FFNs, no bias terms, pre-norm, larger vocabularies (100k–250k tokens), and quantized inference (8-bit or 4-bit weights). Every one of them is a small change to the block you already know.</div>
    `,
    examples: [
      {
        title: 'MHA → GQA → MQA: who shares K/V?',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font-family:system-ui, sans-serif; }
  .on { background:#3b6fe0; color:#fff; border-color:#3b6fe0; }
  .out { font-size:14px; }
</style>
<div class="card">
  <div style="font-weight:600">8 query heads sharing K/V heads</div>
  <div style="margin:6px 0">
    <button data-g="8">MHA (8 KV heads)</button>
    <button data-g="4">GQA (4)</button>
    <button data-g="2">GQA (2)</button>
    <button data-g="1">MQA (1)</button>
  </div>
  <svg id="svg" width="640" height="230" viewBox="0 0 640 230"></svg>
  <div class="out" id="out"></div>
</div>
<script>
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.getElementById('svg');
  const Q = 8;
  const hue = ['#3b6fe0', '#e0703b', '#2f9e5b', '#a54fd1', '#d4a017', '#d13f6a', '#1e9bb0', '#6b6b6b'];

  function el(tag, attrs, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    return n;
  }

  function draw(G) {
    svg.innerHTML = '';
    const per = Q / G;
    const qx = i => 40 + i * 75;
    const kx = g => 40 + (g * per + (per - 1) / 2) * 75;
    for (let i = 0; i < Q; i++) {
      const g = Math.floor(i / per);
      svg.appendChild(el('line', { x1: qx(i) + 25, y1: 60, x2: kx(g) + 25, y2: 150, stroke: hue[g], 'stroke-width': 2 }));
    }
    for (let i = 0; i < Q; i++) {
      const g = Math.floor(i / per);
      svg.appendChild(el('rect', { x: qx(i), y: 25, width: 50, height: 35, rx: 6, fill: '#fff', stroke: hue[g], 'stroke-width': 2 }));
      svg.appendChild(el('text', { x: qx(i) + 25, y: 47, 'text-anchor': 'middle', 'font-size': 13 }, 'Q' + i));
    }
    for (let g = 0; g < G; g++) {
      svg.appendChild(el('rect', { x: kx(g), y: 150, width: 50, height: 40, rx: 6, fill: hue[g], opacity: 0.9 }));
      svg.appendChild(el('text', { x: kx(g) + 25, y: 175, 'text-anchor': 'middle', 'font-size': 13, fill: '#fff' }, 'KV' + g));
    }
    svg.appendChild(el('text', { x: 4, y: 15, 'font-size': 12, fill: '#555' }, 'query heads (always 8)'));
    svg.appendChild(el('text', { x: 4, y: 215, 'font-size': 12, fill: '#555' },
      'key/value heads: these are what the KV cache stores'));
    const pct = (G / Q) * 100;
    document.getElementById('out').innerHTML = '<b>' + per + '</b> query head(s) per KV head. KV cache size: <b>' +
      pct.toFixed(1) + '%</b> of full multi-head attention (' + (Q / G) + 'x smaller).';
    document.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.g === G));
  }

  document.querySelectorAll('button').forEach(b => (b.onclick = () => draw(+b.dataset.g)));
  draw(2);
</script>`,
      },
      {
        title: 'A Mixture-of-Experts router (top-2 of 4)',
        lang: 'js',
        code: `// Mixture of Experts layer: 4 experts, each token uses only the top-2.
const TOP_K = 2;

// Each "expert" is a tiny FFN. Here: just scale-and-shift so we can follow by hand.
const experts = [
  x => x.map(v => 2 * v), // expert 0
  x => x.map(v => v + 1), // expert 1
  x => x.map(v => -v), // expert 2
  x => x.map(v => v * v), // expert 3
];

// Router: one score per expert = dot(token, routerRow)
const router = [
  [1.0, 0.0],
  [0.0, 1.0],
  [-1.0, 0.5],
  [0.5, 0.5],
];

const tokens = { cat: [2.0, 0.5], sat: [-0.5, 1.5], mat: [1.0, 0.8] };

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = xs => {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
};

let calls = 0;
for (const [word, x] of Object.entries(tokens)) {
  const scores = router.map(r => dot(x, r)); // ① router logits
  const chosen = scores
    .map((s, i) => i)
    .sort((a, b) => scores[b] - scores[a])
    .slice(0, TOP_K); // ② keep the top-k experts
  const gates = softmax(chosen.map(i => scores[i])); // ③ renormalize over the chosen ones
  let out = [0, 0];
  chosen.forEach((e, j) => {
    const y = experts[e](x); // ④ only these experts run
    calls++;
    out = out.map((v, d) => v + gates[j] * y[d]);
  });
  console.log(
    word.padEnd(4),
    'scores [' + scores.map(s => s.toFixed(2)).join(', ') + ']',
    '-> experts ' + chosen.join(' & '),
    'gates ' + gates.map(g => g.toFixed(2)).join('/'),
    '-> out [' + out.map(v => v.toFixed(2)).join(', ') + ']'
  );
}
console.log('expert calls: ' + calls + ' (a dense layer using all 4 experts would need ' +
  4 * Object.keys(tokens).length + ')');`,
      },
      {
        title: 'In PyTorch: fused attention with GQA',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn.functional as F

B, T, d_head = 1, 1024, 128
q = torch.randn(B, 32, T, d_head)  # 32 query heads
k = torch.randn(B, 8, T, d_head)  # 8 KV heads (GQA): 4 query heads per KV head
v = torch.randn(B, 8, T, d_head)

# One call for mask + scaling + softmax + weighted sum. PyTorch picks a fused
# backend (FlashAttention / memory-efficient) when the device and inputs allow.
# enable_gqa=True (PyTorch 2.5+) lets query-head groups share K/V heads.
out = F.scaled_dot_product_attention(q, k, v, is_causal=True, enable_gqa=True)
print(out.shape)  # torch.Size([1, 32, 1024, 128])`,
      },
    ],
    quiz: [
      {
        q: 'A model has 32 query heads and 8 KV heads. Compared to full MHA, its KV cache is…',
        options: ['The same size', '4× smaller', '8× smaller', '32× smaller'],
        answer: 1,
        why: 'The cache stores one K and V per KV head: 8 instead of 32, so 4× smaller.',
      },
      {
        q: 'What does FlashAttention change?',
        options: [
          'The attention formula, making it approximate',
          'How the computation is scheduled in GPU memory (tiling, online softmax), not the result',
          'The number of heads',
          'It removes the causal mask',
        ],
        answer: 1,
        why: 'It is exact attention made IO-aware: it avoids materializing the T×T matrix in slow memory.',
      },
      {
        q: 'In an MoE layer with 64 experts and top-2 routing, how many expert FFNs run for each token?',
        options: ['1', '2', '32', '64'],
        answer: 1,
        why: 'Only the top-k experts chosen by the router run. That is why active parameters are much smaller than total parameters.',
      },
      {
        q: 'With sliding-window attention of width W, the per-layer KV cache per sequence grows with…',
        options: ['The full sequence length T', 'The window W (it stops growing once T > W)', 'The vocabulary size', 'The number of experts'],
        answer: 1,
        why: 'Each token only attends to the last W tokens, so older K/V can be dropped (a rolling buffer).',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Router scores for 6 tokens over 4 experts are given.</p>
        <ol>
          <li>For each token pick the top-k experts.</li>
          <li>Count the <strong>load</strong>: how many tokens each expert receives.</li>
          <li>Compare <code>TOP_K = 2</code> vs <code>TOP_K = 1</code>. (Expected loads: <code>2 4 2 4</code> and <code>2 4 0 0</code>.) With top-1, experts 2 and 3 get no tokens at all. This is the imbalance that load-balancing losses are meant to prevent.</li>
        </ol>`,
      starter: `// Router scores for 6 tokens over 4 experts (already computed).
const scores = {
  The: [0.2, 1.1, -0.3, 0.4],
  cat: [2.0, 0.5, -1.7, 1.2],
  sat: [-0.5, 1.5, 1.2, 0.5],
  on: [0.1, 1.3, 0.2, 0.0],
  the: [0.3, 1.0, -0.2, 0.5],
  mat: [1.0, 0.8, -0.6, 0.9],
};
const TOP_K = 2;

// TODO 1: for each token pick the TOP_K experts with the highest score
// TODO 2: count how many tokens each expert receives ("load") and print it
// TODO 3: set TOP_K = 1 (Switch-Transformer style) and compare the load
const load = [0, 0, 0, 0];
for (const [word, s] of Object.entries(scores)) {
  console.log(word, s.join(' '));
}
console.log('load per expert:', load.join(' '));`,
      hint: 's.map((v, i) => i).sort((a, b) => s[b] - s[a]).slice(0, TOP_K) gives the chosen expert indices. Then load[e]++ for each.',
      solution: `// Router scores for 6 tokens over 4 experts (already computed).
const scores = {
  The: [0.2, 1.1, -0.3, 0.4],
  cat: [2.0, 0.5, -1.7, 1.2],
  sat: [-0.5, 1.5, 1.2, 0.5],
  on: [0.1, 1.3, 0.2, 0.0],
  the: [0.3, 1.0, -0.2, 0.5],
  mat: [1.0, 0.8, -0.6, 0.9],
};

for (const TOP_K of [2, 1]) {
  const load = [0, 0, 0, 0];
  console.log('--- TOP_K = ' + TOP_K + ' ---');
  for (const [word, s] of Object.entries(scores)) {
    const chosen = s
      .map((v, i) => i)
      .sort((a, b) => s[b] - s[a])
      .slice(0, TOP_K);
    chosen.forEach(e => load[e]++);
    console.log(word.padEnd(4), '-> experts', chosen.join(' & '));
  }
  console.log('load per expert:', load.join(' '));
}`,
    },
  },

  // ───────────────────────────── tiny-gpt ─────────────────────────────
  {
    id: 'tiny-gpt',
    section: 'From Transformer to LLM',
    title: 'Capstone: A Tiny GPT, End to End',
    explain: `
      <p>Time to put everything together in one runnable program: a complete GPT-style model in plain JavaScript. It has a vocabulary of 6 tokens and a residual stream of 4 numbers, but it is the same architecture as GPT-2, only much smaller.</p>
      <pre><code>ids ──► token embedding E[id] + position embedding P[i]      [T, 4]
    ──► LayerNorm ──► causal self-attention (1 head) ──► + residual
    ──► LayerNorm ──► FFN 4→8→4 with GELU             ──► + residual
    ──► final LayerNorm ──► · Eᵀ (tied LM head) ──► logits  [T, 6]
    ──► softmax of the LAST row ──► pick next token ──► append ──► repeat</code></pre>
      <p>The weights were not written by hand. They were <strong>trained</strong> offline with the same training loop covered earlier (next-token cross-entropy, Adam) on a single sentence, "the cat sat on the mat", then rounded to one decimal. So this model has "memorized" one sentence. A real LLM is the same machine with about 10⁹ times more parameters, trained on about 10¹² times more text.</p>
      <p>Things to notice as you read the code:</p>
      <ul>
        <li>The word <code>the</code> appears twice. At step 1 the model predicts <code>cat</code> after it, at step 5 <code>mat</code>. Same token, different prediction: the model uses <strong>position</strong> (the positional embeddings) and <strong>context</strong> (attention over earlier tokens) to tell them apart.</li>
        <li>Every step re-runs the whole prefix (no KV cache) and uses only the last row of logits.</li>
        <li>Parameter count: E 24 + P 20 + Wq/Wk/Wv/Wo 64 + FFN 64 = <strong>172</strong>. GPT-2 small has about 124M.</li>
      </ul>
      <div class="tip">Everything in this program appeared in an earlier lesson: embeddings, positional encoding, LayerNorm, scaled dot-product attention with a causal mask, residual connections, the GELU FFN, weight tying, softmax and greedy decoding.</div>
    `,
    examples: [
      {
        title: 'Tiny GPT: generate 5 tokens greedily',
        lang: 'js',
        code: `// A complete (tiny!) GPT: 6-token vocab, d_model = 4, 1 block, 1 head.
// Weights were trained offline on one sentence, then rounded to 1 decimal.
const vocab = ['.', 'the', 'cat', 'sat', 'on', 'mat'];

const E = [ // token embeddings [6, 4] (also used as the LM head: weight tying)
  [-0.9, 0.3, 0.9, -0.8], [1, -0.2, 0, -1.3], [0.5, -0.8, 0.8, -0.5],
  [-0.6, 0.3, -0.7, 1], [-1.3, 0.8, 0.4, 0.7], [0.6, 1, -1.5, -0.4],
];
const P = [ // learned positional embeddings [5, 4] -> max context = 5
  [-0.4, -0.3, 0.5, 0.2], [0, 0.7, -0.7, 0.7], [-0.5, -0.2, 0.9, 0.1],
  [1, -1, -0.1, -0.5], [-0.3, -0.1, -0.7, 0.3],
];
const Wq = [[-0.4, -0.2, 0.3, 0.6], [0.7, 0.5, -0.6, -0.5], [-0.5, -0.4, 0.7, 0.4], [-0.2, 0.1, -0.1, -0.5]];
const Wk = [[0.2, 0.5, -0.1, 0.3], [0.5, 0.7, -0.8, -0.5], [-0.2, 0, 0.6, 0.4], [-0.4, 0, 0.8, 0.5]];
const Wv = [[0.3, -0.5, 0, 0], [0.5, 0.2, 0.2, 0.5], [-0.1, 0.3, -0.1, 0], [0, -0.1, -0.1, -0.4]];
const Wo = [[-0.7, -0.3, 0.3, 0.4], [0.6, -0.6, 0, 0.1], [0, 0.2, 0.2, 0.4], [0.1, -0.1, 0.3, 0.3]];
const W1 = [ // FFN up-projection [4, 8]
  [-0.3, 0.2, -0.2, 0, -0.3, -0.1, -0.1, -0.1], [0, 0.5, 0.2, 0.3, 0.2, 0.1, 0.6, 0.3],
  [0, -0.1, 0.4, 0.5, -0.1, 0.1, -0.2, -0.1], [-0.2, -0.3, -0.2, -0.3, -0.6, -0.4, -0.5, -0.5],
];
const W2 = [ // FFN down-projection [8, 4]
  [-0.6, -0.2, 0.1, 0], [-0.4, 0, -0.4, 0.4], [-0.1, -0.7, 0.5, 0.3], [0, -0.7, 0.2, 0.4],
  [-0.2, -0.3, -0.3, 0.5], [-0.6, -0.6, 0, 0.7], [0, 0, -0.4, 0.7], [-0.2, -0.2, -0.2, 0.3],
];

// ── helpers (matrices are arrays of rows) ──
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, i) => s + a * B[i][j], 0)));
const add = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = xs => {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
};
const layerNorm = r => { // gamma = 1, beta = 0 for simplicity
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const vari = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
  return r.map(x => (x - mean) / Math.sqrt(vari + 1e-5));
};
const gelu = x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

function forward(ids) {
  // ① embeddings + positions -> residual stream x: [T, 4]
  let x = ids.map((t, i) => E[t].map((e, j) => e + P[i][j]));

  // ② attention sub-layer (pre-LN, causal mask)
  const h = x.map(layerNorm);
  const Q = matmul(h, Wq);
  const K = matmul(h, Wk);
  const V = matmul(h, Wv);
  const attn = Q.map((q, i) => {
    const scores = K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(4) : -Infinity));
    const w = softmax(scores);
    return V[0].map((_, d) => w.reduce((s, wj, j) => s + wj * V[j][d], 0));
  });
  x = add(x, matmul(attn, Wo)); // residual

  // ③ feed-forward sub-layer: 4 -> 8 -> 4
  const h2 = x.map(layerNorm);
  const ffn = matmul(matmul(h2, W1).map(r => r.map(gelu)), W2);
  x = add(x, ffn); // residual

  // ④ final LayerNorm + LM head (tied to E) -> logits [T, 6]
  return x.map(layerNorm).map(r => E.map(e => dot(r, e)));
}

// ⑤ generate greedily, one token at a time
const ids = [vocab.indexOf('the')];
console.log('prompt:', vocab[ids[0]]);
for (let step = 1; step <= 5; step++) {
  const logits = forward(ids);
  const last = logits[logits.length - 1]; // only the last position predicts the future
  const probs = softmax(last);
  const next = probs.indexOf(Math.max(...probs)); // greedy = argmax
  const top = probs
    .map((p, i) => [vocab[i], p])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, p]) => t + ' ' + p.toFixed(2))
    .join(', ');
  ids.push(next);
  console.log('step ' + step + ' | top-3: ' + top + ' | pick "' + vocab[next] + '"');
}
console.log('text:', ids.map(i => vocab[i]).join(' '));`,
        explain: `
          <details>
            <summary>The problem: turn one token into a sentence</summary>
            <p>We start with the prompt <code>["the"]</code> and ask the model for 5 more tokens, one at a time. Each step is a full forward pass over everything generated so far. The model sees the context grow from length 1 to length 5. Its positional table has 5 rows, so 5 is also its maximum context.</p>
          </details>
          <details>
            <summary>Step by step: the real console output</summary>
            <table>
              <tr><th>step</th><th>context fed in</th><th>shapes</th><th>top-3 of softmax(last row)</th><th>greedy pick</th></tr>
              <tr><td>1</td><td>the</td><td>x [1,4] → logits [1,6]</td><td>cat 0.75, the 0.14, . 0.08</td><td><code>cat</code></td></tr>
              <tr><td>2</td><td>the cat</td><td>[2,4] → [2,6]</td><td>sat 0.69, on 0.23, mat 0.05</td><td><code>sat</code></td></tr>
              <tr><td>3</td><td>the cat sat</td><td>[3,4] → [3,6]</td><td>on 0.74, sat 0.15, . 0.10</td><td><code>on</code></td></tr>
              <tr><td>4</td><td>the cat sat on</td><td>[4,4] → [4,6]</td><td>the 0.66, mat 0.20, cat 0.12</td><td><code>the</code></td></tr>
              <tr><td>5</td><td>the cat sat on the</td><td>[5,4] → [5,6]</td><td>mat 0.83, the 0.09, sat 0.06</td><td><code>mat</code></td></tr>
            </table>
            <p>Final line: <code>text: the cat sat on the mat</code>.</p>
            <p>Compare steps 1 and 5. The <em>last token</em> is <code>the</code> both times, yet the prediction flips from <code>cat</code> (0.75) to <code>mat</code> (0.83). In step 5 the last position's vector is <code>E[the] + P[4]</code> instead of <code>E[the] + P[0]</code>, and attention mixes in information from the 4 earlier tokens. A bigram lookup table ("after <em>the</em> comes…") could never do this.</p>
            <p>The probabilities are not 0.99 because training was stopped early and the weights were rounded. That leaves room for the sampling exercise to produce something different.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">let x = ids.map((t, i) =&gt; E[t].map((e, j) =&gt; e + P[i][j]));   // ① embed + position
const scores = K.map((k, j) =&gt; (j &lt;= i ? dot(q, k) / Math.sqrt(4) : -Infinity)); // ② causal
x = add(x, matmul(attn, Wo));                                      // ③ residual
return x.map(layerNorm).map(r =&gt; E.map(e =&gt; dot(r, e)));          // ④ tied head
const last = logits[logits.length - 1];                            // ⑤ only last row</code></pre>
            <ol>
              <li><strong>①</strong> The residual stream starts as token meaning plus position. Learned absolute positions, GPT-2 style.</li>
              <li><strong>②</strong> Scaled dot-product scores with <code>√d = √4 = 2</code>. Future positions get <code>-Infinity</code>, which softmax turns into weight 0.</li>
              <li><strong>③</strong> Each sub-layer <em>adds</em> to the stream (pre-LN: normalize the input, not the stream). The FFN does the same two lines later.</li>
              <li><strong>④</strong> Final LayerNorm, then the logit for each vocab token is a dot product with that token's embedding: weight tying.</li>
              <li><strong>⑤</strong> All T rows are computed (you'd use them all in training), but only the last one predicts the next token.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the prompt to <code>vocab.indexOf('cat')</code>. Positions and context are now "wrong" for this memorized sentence, so watch what the model does.</li>
              <li>Set all of <code>P</code> to zeros. Without position information, what happens at step 5?</li>
              <li>Comment out the attention residual line (<code>x = add(x, matmul(attn, Wo))</code>) and see how much the output depends on attention.</li>
              <li>Asking for a 6th token would crash: <code>P[5]</code> doesn't exist. That's a real limit of learned absolute positions (context length = size of the table).</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Reference: the same model in PyTorch',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn


class TinyGPT(nn.Module):
    def __init__(self, vocab, d_model=64, n_heads=4, n_layers=2, max_len=128):
        super().__init__()
        self.tok = nn.Embedding(vocab, d_model)
        self.pos = nn.Embedding(max_len, d_model)
        # An "encoder" layer + a causal mask = a GPT (decoder-only) block.
        layer = nn.TransformerEncoderLayer(
            d_model, n_heads, 4 * d_model, dropout=0.0,
            activation="gelu", batch_first=True, norm_first=True,  # pre-LN
        )
        self.blocks = nn.TransformerEncoder(layer, n_layers, enable_nested_tensor=False)
        self.norm = nn.LayerNorm(d_model)
        self.head = nn.Linear(d_model, vocab, bias=False)
        self.head.weight = self.tok.weight  # weight tying

    def forward(self, ids):  # ids: [B, T]
        T = ids.size(1)
        x = self.tok(ids) + self.pos(torch.arange(T, device=ids.device))
        mask = nn.Transformer.generate_square_subsequent_mask(T, device=ids.device)
        x = self.blocks(x, mask=mask, is_causal=True)
        return self.head(self.norm(x))  # logits: [B, T, vocab]


@torch.no_grad()
def generate(model, ids, n_new):
    for _ in range(n_new):
        logits = model(ids)[:, -1, :]  # last position only
        nxt = logits.argmax(dim=-1, keepdim=True)  # greedy
        ids = torch.cat([ids, nxt], dim=1)
    return ids`,
      },
    ],
    quiz: [
      {
        q: 'In the tiny GPT, why can "the" be followed by "cat" at step 1 but by "mat" at step 5?',
        options: [
          'Random sampling',
          'Different position embeddings and attention over different earlier tokens change the final vector',
          'The vocabulary changes between steps',
          'The weights are updated during generation',
        ],
        answer: 1,
        why: 'Generation uses fixed weights. The difference comes from position (P[0] vs P[4]) and context mixed in by attention.',
      },
      {
        q: 'At each generation step, which row of the logits matrix is used?',
        options: ['The first', 'The last', 'The average of all rows', 'A random row'],
        answer: 1,
        why: 'The last position is the only one whose "next token" is unknown. Earlier rows predict tokens we already have.',
      },
      {
        q: 'Why would the tiny GPT fail if asked for a 6th new token?',
        options: [
          'The vocabulary is too small',
          'Its learned positional table only has 5 rows, so position 5 has no embedding',
          'Softmax overflows',
          'The causal mask blocks it',
        ],
        answer: 1,
        why: 'Learned absolute positional embeddings cap the context length at the table size. RoPE-based models can be stretched beyond their training length more gracefully.',
      },
      {
        q: 'The tiny GPT recomputes the full prefix every step. Which optimization from this section avoids that?',
        options: ['Weight tying', 'The KV cache', 'LoRA', 'Top-p sampling'],
        answer: 1,
        why: 'Caching each position’s keys and values means each step only processes the new token.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Switch the tiny GPT from greedy decoding to <strong>temperature sampling</strong> with a seeded PRNG.</p>
        <ol>
          <li>Add a <code>mulberry32</code> PRNG with seed <code>42</code>.</li>
          <li>Divide the last row of logits by <code>TEMPERATURE = 1.5</code> before softmax.</li>
          <li>Sample the next token from the probabilities instead of taking the argmax, and print <code>p(pick)</code> each step.</li>
        </ol>
        <p>Expected with seed 42 and T = 1.5: <code>the cat sat on cat the</code>. At step 4 it picks <code>cat</code>, which had only p = 0.17. Then try <code>TEMPERATURE = 0.8</code>: with the same seed you get <code>the cat sat on the mat</code> again.</p>`,
      starter: `// A complete (tiny!) GPT: 6-token vocab, d_model = 4, 1 block, 1 head.
// Weights were trained offline on one sentence, then rounded to 1 decimal.
const vocab = ['.', 'the', 'cat', 'sat', 'on', 'mat'];

const E = [ // token embeddings [6, 4] (also used as the LM head: weight tying)
  [-0.9, 0.3, 0.9, -0.8], [1, -0.2, 0, -1.3], [0.5, -0.8, 0.8, -0.5],
  [-0.6, 0.3, -0.7, 1], [-1.3, 0.8, 0.4, 0.7], [0.6, 1, -1.5, -0.4],
];
const P = [ // learned positional embeddings [5, 4] -> max context = 5
  [-0.4, -0.3, 0.5, 0.2], [0, 0.7, -0.7, 0.7], [-0.5, -0.2, 0.9, 0.1],
  [1, -1, -0.1, -0.5], [-0.3, -0.1, -0.7, 0.3],
];
const Wq = [[-0.4, -0.2, 0.3, 0.6], [0.7, 0.5, -0.6, -0.5], [-0.5, -0.4, 0.7, 0.4], [-0.2, 0.1, -0.1, -0.5]];
const Wk = [[0.2, 0.5, -0.1, 0.3], [0.5, 0.7, -0.8, -0.5], [-0.2, 0, 0.6, 0.4], [-0.4, 0, 0.8, 0.5]];
const Wv = [[0.3, -0.5, 0, 0], [0.5, 0.2, 0.2, 0.5], [-0.1, 0.3, -0.1, 0], [0, -0.1, -0.1, -0.4]];
const Wo = [[-0.7, -0.3, 0.3, 0.4], [0.6, -0.6, 0, 0.1], [0, 0.2, 0.2, 0.4], [0.1, -0.1, 0.3, 0.3]];
const W1 = [ // FFN up-projection [4, 8]
  [-0.3, 0.2, -0.2, 0, -0.3, -0.1, -0.1, -0.1], [0, 0.5, 0.2, 0.3, 0.2, 0.1, 0.6, 0.3],
  [0, -0.1, 0.4, 0.5, -0.1, 0.1, -0.2, -0.1], [-0.2, -0.3, -0.2, -0.3, -0.6, -0.4, -0.5, -0.5],
];
const W2 = [ // FFN down-projection [8, 4]
  [-0.6, -0.2, 0.1, 0], [-0.4, 0, -0.4, 0.4], [-0.1, -0.7, 0.5, 0.3], [0, -0.7, 0.2, 0.4],
  [-0.2, -0.3, -0.3, 0.5], [-0.6, -0.6, 0, 0.7], [0, 0, -0.4, 0.7], [-0.2, -0.2, -0.2, 0.3],
];

// ── helpers (matrices are arrays of rows) ──
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, i) => s + a * B[i][j], 0)));
const add = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = xs => {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
};
const layerNorm = r => { // gamma = 1, beta = 0 for simplicity
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const vari = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
  return r.map(x => (x - mean) / Math.sqrt(vari + 1e-5));
};
const gelu = x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

function forward(ids) {
  // ① embeddings + positions -> residual stream x: [T, 4]
  let x = ids.map((t, i) => E[t].map((e, j) => e + P[i][j]));

  // ② attention sub-layer (pre-LN, causal mask)
  const h = x.map(layerNorm);
  const Q = matmul(h, Wq);
  const K = matmul(h, Wk);
  const V = matmul(h, Wv);
  const attn = Q.map((q, i) => {
    const scores = K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(4) : -Infinity));
    const w = softmax(scores);
    return V[0].map((_, d) => w.reduce((s, wj, j) => s + wj * V[j][d], 0));
  });
  x = add(x, matmul(attn, Wo)); // residual

  // ③ feed-forward sub-layer: 4 -> 8 -> 4
  const h2 = x.map(layerNorm);
  const ffn = matmul(matmul(h2, W1).map(r => r.map(gelu)), W2);
  x = add(x, ffn); // residual

  // ④ final LayerNorm + LM head (tied to E) -> logits [T, 6]
  return x.map(layerNorm).map(r => E.map(e => dot(r, e)));
}

// ⑤ generate greedily, one token at a time
const ids = [vocab.indexOf('the')];
console.log('prompt:', vocab[ids[0]]);
for (let step = 1; step <= 5; step++) {
  const logits = forward(ids);
  const last = logits[logits.length - 1]; // only the last position predicts the future
  const probs = softmax(last);
  const next = probs.indexOf(Math.max(...probs)); // greedy = argmax
  const top = probs
    .map((p, i) => [vocab[i], p])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([t, p]) => t + ' ' + p.toFixed(2))
    .join(', ');
  ids.push(next);
  console.log('step ' + step + ' | top-3: ' + top + ' | pick "' + vocab[next] + '"');
}
console.log('text:', ids.map(i => vocab[i]).join(' '));`,
      hint: 'Draw u = rand(), then walk through probs adding to a running sum; return the first index where u < sum. Use softmax(last.map(z => z / TEMPERATURE)).',
      solution: `// A complete (tiny!) GPT: 6-token vocab, d_model = 4, 1 block, 1 head.
// Weights were trained offline on one sentence, then rounded to 1 decimal.
const vocab = ['.', 'the', 'cat', 'sat', 'on', 'mat'];

const E = [ // token embeddings [6, 4] (also used as the LM head: weight tying)
  [-0.9, 0.3, 0.9, -0.8], [1, -0.2, 0, -1.3], [0.5, -0.8, 0.8, -0.5],
  [-0.6, 0.3, -0.7, 1], [-1.3, 0.8, 0.4, 0.7], [0.6, 1, -1.5, -0.4],
];
const P = [ // learned positional embeddings [5, 4] -> max context = 5
  [-0.4, -0.3, 0.5, 0.2], [0, 0.7, -0.7, 0.7], [-0.5, -0.2, 0.9, 0.1],
  [1, -1, -0.1, -0.5], [-0.3, -0.1, -0.7, 0.3],
];
const Wq = [[-0.4, -0.2, 0.3, 0.6], [0.7, 0.5, -0.6, -0.5], [-0.5, -0.4, 0.7, 0.4], [-0.2, 0.1, -0.1, -0.5]];
const Wk = [[0.2, 0.5, -0.1, 0.3], [0.5, 0.7, -0.8, -0.5], [-0.2, 0, 0.6, 0.4], [-0.4, 0, 0.8, 0.5]];
const Wv = [[0.3, -0.5, 0, 0], [0.5, 0.2, 0.2, 0.5], [-0.1, 0.3, -0.1, 0], [0, -0.1, -0.1, -0.4]];
const Wo = [[-0.7, -0.3, 0.3, 0.4], [0.6, -0.6, 0, 0.1], [0, 0.2, 0.2, 0.4], [0.1, -0.1, 0.3, 0.3]];
const W1 = [ // FFN up-projection [4, 8]
  [-0.3, 0.2, -0.2, 0, -0.3, -0.1, -0.1, -0.1], [0, 0.5, 0.2, 0.3, 0.2, 0.1, 0.6, 0.3],
  [0, -0.1, 0.4, 0.5, -0.1, 0.1, -0.2, -0.1], [-0.2, -0.3, -0.2, -0.3, -0.6, -0.4, -0.5, -0.5],
];
const W2 = [ // FFN down-projection [8, 4]
  [-0.6, -0.2, 0.1, 0], [-0.4, 0, -0.4, 0.4], [-0.1, -0.7, 0.5, 0.3], [0, -0.7, 0.2, 0.4],
  [-0.2, -0.3, -0.3, 0.5], [-0.6, -0.6, 0, 0.7], [0, 0, -0.4, 0.7], [-0.2, -0.2, -0.2, 0.3],
];

// ── helpers (matrices are arrays of rows) ──
const matmul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, i) => s + a * B[i][j], 0)));
const add = (A, B) => A.map((r, i) => r.map((x, j) => x + B[i][j]));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const softmax = xs => {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const z = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / z);
};
const layerNorm = r => { // gamma = 1, beta = 0 for simplicity
  const mean = r.reduce((a, b) => a + b, 0) / r.length;
  const vari = r.reduce((a, b) => a + (b - mean) ** 2, 0) / r.length;
  return r.map(x => (x - mean) / Math.sqrt(vari + 1e-5));
};
const gelu = x => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

function forward(ids) {
  // ① embeddings + positions -> residual stream x: [T, 4]
  let x = ids.map((t, i) => E[t].map((e, j) => e + P[i][j]));

  // ② attention sub-layer (pre-LN, causal mask)
  const h = x.map(layerNorm);
  const Q = matmul(h, Wq);
  const K = matmul(h, Wk);
  const V = matmul(h, Wv);
  const attn = Q.map((q, i) => {
    const scores = K.map((k, j) => (j <= i ? dot(q, k) / Math.sqrt(4) : -Infinity));
    const w = softmax(scores);
    return V[0].map((_, d) => w.reduce((s, wj, j) => s + wj * V[j][d], 0));
  });
  x = add(x, matmul(attn, Wo)); // residual

  // ③ feed-forward sub-layer: 4 -> 8 -> 4
  const h2 = x.map(layerNorm);
  const ffn = matmul(matmul(h2, W1).map(r => r.map(gelu)), W2);
  x = add(x, ffn); // residual

  // ④ final LayerNorm + LM head (tied to E) -> logits [T, 6]
  return x.map(layerNorm).map(r => E.map(e => dot(r, e)));
}

// seeded PRNG so every run gives the same "random" numbers
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
const TEMPERATURE = 1.5;

function sampleIndex(probs) {
  const u = rand();
  let cum = 0;
  for (let i = 0; i < probs.length; i++) {
    cum += probs[i];
    if (u < cum) return i;
  }
  return probs.length - 1;
}

const ids = [vocab.indexOf('the')];
console.log('prompt:', vocab[ids[0]], '| T =', TEMPERATURE);
for (let step = 1; step <= 5; step++) {
  const logits = forward(ids);
  const last = logits[logits.length - 1];
  const probs = softmax(last.map(z => z / TEMPERATURE)); // divide logits by T
  const next = sampleIndex(probs); // sample instead of argmax
  ids.push(next);
  console.log('step ' + step + ' | p(pick) = ' + probs[next].toFixed(2) + ' | pick "' + vocab[next] + '"');
}
console.log('text:', ids.map(i => vocab[i]).join(' '));`,
    },
  },
);
