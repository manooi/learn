// Section: Attention
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------
  {
    id: 'attention-intuition',
    section: 'Attention',
    title: 'Attention as Soft Lookup',
    explain: `
      <p>You already know a lookup table: a JavaScript object or a hash map. You give it a <strong>key</strong> and get back the stored <strong>value</strong>, but only on an <em>exact</em> match.</p>
      <pre><code class="language-javascript">const dict = { cat: 'meows', dog: 'barks' };
dict['cat']     // 'meows'
dict['kitten']  // undefined: no partial credit</code></pre>
      <p><strong>Attention is a soft, differentiable version of that lookup.</strong> Keys, values and the query are all <em>vectors</em>. Instead of picking one exact match, we:</p>
      <ol>
        <li>score the query against <strong>every</strong> key with a dot product (similar direction → big score),</li>
        <li>turn the scores into weights that sum to 1 with <strong>softmax</strong> (recall Neural Networks),</li>
        <li>return the <strong>weighted average of all values</strong>.</li>
      </ol>
      <pre><code>weightsᵢ = softmax(query · keyᵢ)
output   = Σᵢ weightsᵢ · valueᵢ</code></pre>
      <p>A query that is "kitten-like" gets mostly the cat value plus a little of the dog value. It never gets <code>undefined</code>. And because every step is smooth, gradients flow through it, so the model can <em>learn</em> what to put in queries, keys and values.</p>
      <div class="tip"><strong>Analogy:</strong> searching a library. Your question is the query. The book spines (titles) are the keys. The book contents are the values. A hard lookup returns the one book with the exact title. Attention reads a little from every book, spending more time on the most relevant ones.</div>

      <h3>Why language needs this</h3>
      <p>Take <em>"The animal didn't cross the street because <strong>it</strong> was too tired."</em> What does "it" mean? To build a good vector for "it", the model should pull information from "animal". Change "tired" to "wide" and "it" now means the street. In a Transformer every token issues a query and softly looks up the other tokens. That's <strong>self-attention</strong>, and it lets each word gather the context it needs in one step, no matter how far away that context is.</p>
      <div class="warn">The weights are not "understanding" by themselves. They are learned numbers that turned out to help predict text. Attention patterns are a useful window into a model, but they don't fully explain what it does.</div>
    `,
    examples: [
      {
        title: 'Soft lookup: values are colours, the output is their blend',
        code: `<div class="card">
  <div class="hint">Drag <b>direction</b> to aim the query arrow at the keys. Drag <b>length</b> to make the lookup sharper (long query) or blurrier (short query). The output colour is the weighted blend of the value colours.</div>
  <div class="row">
    direction <input id="ang" type="range" min="0" max="359" value="30" /> <span id="angv"></span>
    length <input id="len" type="range" min="0.2" max="5" step="0.1" value="1.5" /> <span id="lenv"></span>
    <label><input type="checkbox" id="hard" /> hard lookup (argmax)</label>
  </div>
  <div class="flex">
    <svg id="sv" width="260" height="260" viewBox="-130 -130 260 260"></svg>
    <div class="side">
      <div id="bars"></div>
      <div class="out">output = Σ weight · value <span id="sw"></span></div>
      <div id="rgb"></div>
    </div>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  .row input[type=range] { width: 110px; vertical-align: middle; }
  .flex { display: flex; gap: 16px; align-items: center; margin-top: 8px; }
  .side { flex: 1; }
  .bar { display: flex; align-items: center; gap: 6px; margin: 4px 0; font: 13px ui-monospace, monospace; }
  .bar b { width: 60px; }
  .bar i { display: inline-block; height: 16px; border-radius: 3px; }
  .out { margin-top: 10px; display: flex; align-items: center; gap: 8px; }
  #sw { display: inline-block; width: 60px; height: 30px; border-radius: 6px; border: 1px solid #aaa; }
  #rgb { font: 12px ui-monospace, monospace; color: #555; }
</style>

<script>
  // 4 items: key = a unit vector (direction), value = a colour [r, g, b]
  const ITEMS = [
    { name: 'red', key: [1, 0], value: [230, 50, 50] },
    { name: 'green', key: [0, 1], value: [40, 170, 70] },
    { name: 'blue', key: [-1, 0], value: [40, 90, 220] },
    { name: 'yellow', key: [0, -1], value: [245, 200, 30] },
  ];
  const $ = (id) => document.getElementById(id);

  function softmax(xs) {
    const m = Math.max(...xs);
    const e = xs.map(x => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  }

  function draw() {
    const a = (+$('ang').value * Math.PI) / 180;
    const L = +$('len').value;
    $('angv').textContent = $('ang').value + '°';
    $('lenv').textContent = L.toFixed(1);
    const q = [L * Math.cos(a), L * Math.sin(a)];
    const scores = ITEMS.map(it => q[0] * it.key[0] + q[1] * it.key[1]);
    let w = softmax(scores);
    if ($('hard').checked) {
      const best = scores.indexOf(Math.max(...scores));
      w = w.map((_, i) => (i === best ? 1 : 0));
    }
    const out = [0, 1, 2].map(c => ITEMS.reduce((s, it, i) => s + w[i] * it.value[c], 0));

    let s = '<circle r="90" fill="none" stroke="#eee"/>';
    ITEMS.forEach((it, i) => {
      const col = 'rgb(' + it.value.join(',') + ')';
      const x = it.key[0] * 90;
      const y = -it.key[1] * 90;
      s += '<line x1="0" y1="0" x2="' + x + '" y2="' + y + '" stroke="' + col + '" stroke-width="2" opacity="0.5"/>';
      s += '<circle cx="' + x + '" cy="' + y + '" r="' + (6 + w[i] * 14) + '" fill="' + col + '"/>';
    });
    const qs = 90 * Math.min(L, 5) / 5 + 10;
    s += '<line x1="0" y1="0" x2="' + Math.cos(a) * qs + '" y2="' + -Math.sin(a) * qs +
      '" stroke="#1a1a1a" stroke-width="3"/>';
    s += '<text x="' + Math.cos(a) * (qs + 12) + '" y="' + (-Math.sin(a) * (qs + 12) + 4) +
      '" font-size="12" text-anchor="middle">q</text>';
    $('sv').innerHTML = s;

    $('bars').innerHTML = ITEMS.map((it, i) =>
      '<div class="bar"><b>' + it.name + '</b>score ' + scores[i].toFixed(2).padStart(5) +
      ' <i style="width:' + w[i] * 150 + 'px;background:rgb(' + it.value.join(',') + ')"></i>' +
      w[i].toFixed(2) + '</div>'
    ).join('');
    $('sw').style.background = 'rgb(' + out.map(Math.round).join(',') + ')';
    $('rgb').textContent = 'output rgb = [' + out.map(v => v.toFixed(0)).join(', ') + ']   weights sum = ' +
      w.reduce((x, y) => x + y, 0).toFixed(2);
  }

  ['ang', 'len', 'hard'].forEach(id => ($(id).oninput = draw));
  draw();
</script>`,
      },
      {
        title: 'What does "it" attend to? (hand-designed weights)',
        code: `<div class="card">
  <div class="hint">These are the attention weights of the query token <b>"it"</b> over the sentence (illustrative, hand-designed). Switch the last word and see where "it" looks.</div>
  <div class="row">
    <label><input type="radio" name="w" value="tired" checked /> "…because it was too <b>tired</b>"</label>
    <label><input type="radio" name="w" value="wide" /> "…because it was too <b>wide</b>"</label>
  </div>
  <div id="sent"></div>
  <div id="bars"></div>
  <div id="msg"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  #sent { display: flex; flex-wrap: wrap; gap: 4px; margin: 12px 0; }
  .tok { padding: 4px 7px; border-radius: 5px; font-size: 15px; border: 1px solid #e5e5e5; }
  .tok.q { outline: 2px solid #e8590c; }
  .bar { display: flex; align-items: center; gap: 6px; font: 12px ui-monospace, monospace; margin: 1px 0; }
  .bar span { width: 70px; text-align: right; }
  .bar i { display: inline-block; height: 11px; background: #4c6ef5; border-radius: 2px; }
  #msg { margin-top: 6px; }
</style>

<script>
  const BASE = ['The', 'animal', "didn't", 'cross', 'the', 'street', 'because', 'it', 'was', 'too'];
  // Illustrative weights for the query "it" (each row sums to 1).
  const W = {
    tired: [0.03, 0.58, 0.02, 0.04, 0.02, 0.12, 0.03, 0.08, 0.02, 0.02, 0.04],
    wide: [0.02, 0.13, 0.02, 0.04, 0.05, 0.57, 0.03, 0.08, 0.02, 0.02, 0.02],
  };

  function draw() {
    const last = document.querySelector('input[name=w]:checked').value;
    const toks = [...BASE, last];
    const w = W[last];
    document.getElementById('sent').innerHTML = toks.map((t, i) =>
      '<span class="tok' + (t === 'it' ? ' q' : '') + '" style="background:rgba(76,110,245,' +
      Math.min(1, w[i] * 1.6).toFixed(2) + ');color:' + (w[i] > 0.35 ? '#fff' : '#1a1a1a') + '">' + t + '</span>'
    ).join('');
    document.getElementById('bars').innerHTML = toks.map((t, i) =>
      '<div class="bar"><span>' + t + '</span><i style="width:' + w[i] * 400 + 'px"></i>' + w[i].toFixed(2) + '</div>'
    ).join('');
    const top = w.indexOf(Math.max(...w));
    document.getElementById('msg').innerHTML = 'Query "it" puts <b>' + (w[top] * 100).toFixed(0) +
      '%</b> of its attention on <b>' + toks[top] + '</b>, so the new vector for "it" is mostly built from "' +
      toks[top] + '"\\'s value. Sum of weights = ' + w.reduce((a, b) => a + b, 0).toFixed(2) + '.';
  }

  document.querySelectorAll('input[name=w]').forEach(r => (r.onchange = draw));
  draw();
</script>`,
      },
      {
        title: 'Hard lookup vs soft lookup in numbers',
        lang: 'js',
        code: `// ① A normal dictionary: exact key match or nothing
const dict = { cat: 'meows', dog: 'barks', fish: 'swims' };
console.log('hard lookup "cat" ->', dict['cat']);
console.log('hard lookup "kitten" ->', dict['kitten']);

// ② Soft version: keys and values are vectors
const keys = { cat: [2, 0], dog: [0, 2], fish: [-2, 0] };
const values = { cat: [10, 0], dog: [0, 10], fish: [5, 5] };

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

function softLookup(query) {
  const names = Object.keys(keys);
  const scores = names.map(n => dot(query, keys[n])); // how well each key matches
  const weights = softmax(scores); // turn scores into a distribution
  const out = [0, 0];
  names.forEach((n, i) => {
    out[0] += weights[i] * values[n][0]; // blend ALL values
    out[1] += weights[i] * values[n][1];
  });
  console.log(
    'query ' + JSON.stringify(query) + '  weights ' +
    names.map((n, i) => n + ':' + weights[i].toFixed(2)).join(' ') +
    '  -> output [' + out.map(x => x.toFixed(2)).join(', ') + ']'
  );
}

softLookup([1, 0]); // looks like "cat"
softLookup([0.8, 0.6]); // "kitten": mostly cat, a bit dog
softLookup([3, 0]); // same direction, longer -> sharper, almost a hard lookup`,
      },
    ],
    quiz: [
      {
        q: 'How does attention differ from a hash-map lookup?',
        options: [
          'It only works with string keys',
          'It returns a weighted average of all values, weighted by query–key similarity, instead of one exact match',
          'It returns the key instead of the value',
          'It is non-differentiable',
        ],
        answer: 1,
        why: 'Attention is a soft lookup: softmax(query·keys) gives weights, and the output blends all values.',
      },
      {
        q: 'The attention weights for one query…',
        options: ['Are all equal', 'Sum to 1 (they come from a softmax)', 'Can be negative', 'Sum to the number of tokens'],
        answer: 1,
        why: 'Softmax produces non-negative numbers that sum to 1, so the output is a weighted average (a convex combination) of the values.',
      },
      {
        q: 'Making the query vector longer (same direction) does what to the weights?',
        options: [
          'Nothing, since only the direction matters',
          'Makes them sharper: closer to a hard lookup of the best-matching key',
          'Makes them more uniform',
          'Makes them sum to more than 1',
        ],
        answer: 1,
        why: 'Dot products scale with length, and bigger score gaps make softmax peakier. It is the same effect as lowering the temperature.',
      },
      {
        q: 'In "The animal didn\'t cross the street because it was too tired", a good model\'s "it" token should mostly attend to…',
        options: ['"street"', '"animal"', '"cross"', '"too"'],
        answer: 1,
        why: 'An animal can be tired, a street can\'t. Change "tired" to "wide" and the natural referent flips to "street".',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write <code>attend(query)</code>, which returns <code>{ weights, output }</code> for the soft lookup (dot-product scores → softmax → weighted sum of values). Expected output:</p>
<pre><code>[0,1] weights 0.11 0.79 0.11 -> [1.60, 8.40]
[-1,0.5] weights 0.01 0.27 0.72 -> [3.74, 6.26]</code></pre>`,
      starter: `const keys = [[2, 0], [0, 2], [-2, 0]]; // cat, dog, fish
const values = [[10, 0], [0, 10], [5, 5]];

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

function attend(query) {
  // TODO 1: scores = query · key for every key
  // TODO 2: weights = softmax(scores)
  // TODO 3: output = sum of weights[i] * values[i]
  return { weights: [0, 0, 0], output: [0, 0] };
}

for (const q of [[0, 1], [-1, 0.5]]) {
  const { weights, output } = attend(q);
  console.log(
    JSON.stringify(q) + ' weights ' + weights.map(w => w.toFixed(2)).join(' ') +
    ' -> [' + output.map(x => x.toFixed(2)).join(', ') + ']'
  );
}`,
      hint: 'scores = keys.map(k => query[0]*k[0] + query[1]*k[1]). output = [0, 1].map(j => weights.reduce((s, w, i) => s + w * values[i][j], 0)).',
      solution: `const keys = [[2, 0], [0, 2], [-2, 0]]; // cat, dog, fish
const values = [[10, 0], [0, 10], [5, 5]];

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

function attend(query) {
  const scores = keys.map(k => query[0] * k[0] + query[1] * k[1]);
  const weights = softmax(scores);
  const output = [0, 1].map(j => weights.reduce((s, w, i) => s + w * values[i][j], 0));
  return { weights, output };
}

for (const q of [[0, 1], [-1, 0.5]]) {
  const { weights, output } = attend(q);
  console.log(
    JSON.stringify(q) + ' weights ' + weights.map(w => w.toFixed(2)).join(' ') +
    ' -> [' + output.map(x => x.toFixed(2)).join(', ') + ']'
  );
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'qkv',
    section: 'Attention',
    title: 'Queries, Keys & Values',
    explain: `
      <p>In self-attention every token plays <strong>three roles at once</strong>. It asks a question, it advertises what it contains, and it hands over content if chosen. Using the raw embedding for all three would be limiting, so each role gets its own learned projection matrix:</p>
      <pre><code>q = x · W_Q     // Query: "what am I looking for?"
k = x · W_K     // Key:   "what do I contain / advertise?"
v = x · W_V     // Value: "what do I hand over if you pick me?"</code></pre>
      <p>For a whole sequence we stack the token embeddings into a matrix <code>X</code> of shape <code>(n, d_model)</code> and do all tokens in one matrix multiply (recall matrix multiplication from the Math section):</p>
      <pre><code>X   : (n, d_model)          W_Q, W_K : (d_model, d_k)       W_V : (d_model, d_v)
Q = X·W_Q : (n, d_k)        K = X·W_K : (n, d_k)             V = X·W_V : (n, d_v)</code></pre>
      <div class="tip"><strong>Dating-app analogy.</strong> Your <em>key</em> is your profile ("likes hiking, cats"). Your <em>query</em> is what you're searching for ("someone who likes cats"). Your <em>value</em> is what you actually share once matched. The profile and the search don't have to match each other. A pronoun's query might search for "a noun, singular, animate", while its own key advertises "I'm a pronoun".</div>
      <p>Why separate matrices? The dot product <code>q_i · k_j</code> measures "how relevant is token j to token i". Separate <code>W_Q</code> and <code>W_K</code> make that relevance <strong>asymmetric</strong>: "it" can find "animal" relevant without "animal" finding "it" equally relevant. <code>W_V</code> decouples <em>what makes you findable</em> from <em>what you pass along</em>.</p>
      <p>The three matrices are ordinary weights learned by backprop. In real models they are large. In GPT-2 small, <code>d_model = 768</code> and each head uses <code>d_k = 64</code>. In this lesson we use 3 tokens, <code>d_model = 4</code> and <code>d_k = d_v = 2</code> so you can check every number by hand. The same numbers carry through the next lessons.</p>
    `,
    examples: [
      {
        title: 'Matrix-multiply explorer: where each number in Q, K, V comes from',
        code: `<div class="card">
  <div class="hint">Pick a projection, then hover (or click) any cell of the result. The row of X and the column of W that produce it light up, and the sum is shown below.</div>
  <div class="row">
    <button data-m="Q" class="on">Q = X·W_Q</button>
    <button data-m="K">K = X·W_K</button>
    <button data-m="V">V = X·W_V</button>
  </div>
  <div class="mats">
    <div><div class="cap">X (3×4) embeddings</div><table id="tx"></table></div>
    <div class="op">·</div>
    <div><div class="cap" id="wcap"></div><table id="tw"></table></div>
    <div class="op">=</div>
    <div><div class="cap" id="rcap"></div><table id="tr"></table></div>
  </div>
  <div id="calc"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  button.on { background: #ffe08a; border-color: #d9a400; }
  .mats { display: flex; align-items: center; gap: 10px; margin: 10px 0; }
  .op { font-size: 22px; color: #666; }
  .cap { font-size: 12px; color: #555; margin-bottom: 2px; }
  table { border-collapse: collapse; font: 14px ui-monospace, monospace; }
  td { border: 1px solid #d0d4e0; width: 30px; height: 26px; text-align: center; }
  td.lbl { border: none; color: #666; font-size: 12px; width: 34px; text-align: right; padding-right: 4px; }
  td.hl { background: #d0ebff; }
  td.cell { cursor: pointer; background: #f8f9fa; }
  td.cell.sel { background: #ffd8a8; font-weight: 700; }
  #calc { font: 13px ui-monospace, monospace; min-height: 40px; background: #f8f9fa; padding: 6px 8px; border-radius: 6px; }
</style>

<script>
  const TOK = ['the', 'cat', 'sat'];
  const X = [[1, 0, 1, 0], [0, 2, 0, 1], [1, 1, 0, 1]];
  const W = {
    Q: [[1, 0], [0, 1], [1, 0], [0, 0]],
    K: [[0, 1], [1, 0], [0, 1], [1, 0]],
    V: [[1, 0], [0, 1], [0, 0], [1, 1]],
  };
  let m = 'Q';
  let sel = [0, 0];

  const mul = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, a, k) => s + a * B[k][j], 0)));

  function table(el, M, rowLabels, hlRow, hlCol, cls) {
    el.innerHTML = M.map((r, i) =>
      '<tr>' + (rowLabels ? '<td class="lbl">' + rowLabels[i] + '</td>' : '') + r.map((v, j) =>
        '<td class="' + (cls || '') + ((hlRow === i || hlCol === j) ? ' hl' : '') +
        (cls && sel[0] === i && sel[1] === j ? ' sel' : '') + '" data-i="' + i + '" data-j="' + j + '">' + v + '</td>'
      ).join('') + '</tr>'
    ).join('');
  }

  function draw() {
    const R = mul(X, W[m]);
    const [i, j] = sel;
    table(document.getElementById('tx'), X, TOK, i, -1);
    table(document.getElementById('tw'), W[m], null, -1, j);
    table(document.getElementById('tr'), R, TOK, -1, -1, 'cell');
    document.getElementById('wcap').textContent = 'W_' + m + ' (4×2)';
    document.getElementById('rcap').textContent = m + ' (3×2)';
    const terms = X[i].map((x, k) => x + '·' + W[m][k][j]);
    document.getElementById('calc').innerHTML = m + '[' + TOK[i] + '][' + j + '] = row "' + TOK[i] +
      '" of X · column ' + j + ' of W_' + m + '<br>= ' + terms.join(' + ') + ' = <b>' + R[i][j] + '</b>' +
      '<br>so ' + m.toLowerCase() + '_' + TOK[i] + ' = [' + R[i].join(', ') + ']';
    document.querySelectorAll('#tr td.cell').forEach(td => {
      const pick = () => { sel = [+td.dataset.i, +td.dataset.j]; draw(); };
      td.onmouseenter = pick;
      td.onclick = pick;
    });
  }

  document.querySelectorAll('button[data-m]').forEach(b => (b.onclick = () => {
    m = b.dataset.m;
    document.querySelectorAll('button[data-m]').forEach(x => x.classList.toggle('on', x === b));
    draw();
  }));
  draw();
</script>`,
      },
      {
        title: 'Projecting 3 tokens into Q, K and V',
        lang: 'js',
        code: `const tokens = ['the', 'cat', 'sat'];

// Token embeddings: 3 tokens x d_model=4
const X = [
  [1, 0, 1, 0], // the
  [0, 2, 0, 1], // cat
  [1, 1, 0, 1], // sat
];

// Projection matrices: d_model=4 x d_k=2 (learned in a real model)
const W_Q = [
  [1, 0],
  [0, 1],
  [1, 0],
  [0, 0],
];
const W_K = [
  [0, 1],
  [1, 0],
  [0, 1],
  [1, 0],
];
const W_V = [
  [1, 0],
  [0, 1],
  [0, 0],
  [1, 1],
];

// (n x m) times (m x p) -> (n x p)
function matmul(A, B) {
  return A.map(row =>
    B[0].map((_, j) => row.reduce((sum, a, k) => sum + a * B[k][j], 0))
  );
}

const Q = matmul(X, W_Q);
const K = matmul(X, W_K);
const V = matmul(X, W_V);

function show(name, M) {
  console.log(name + ' (' + M.length + 'x' + M[0].length + ')');
  M.forEach((row, i) => console.log('  ' + tokens[i].padEnd(4) + JSON.stringify(row)));
}
show('Q = X·W_Q', Q);
show('K = X·W_K', K);
show('V = X·W_V', V);`,
        explain: `
          <details>
            <summary>The problem: one embedding, three different jobs</summary>
            <p>Each row of <code>X</code> is a token's embedding (4 numbers). If we used <code>X</code> directly as queries, keys and values, then "how much does <em>the</em> care about <em>cat</em>" would always equal "how much does <em>cat</em> care about <em>the</em>" (<code>x·y = y·x</code>). We also couldn't choose what information gets passed along. Three projections fix that. Each one is a <code>4×2</code> matrix that maps a 4-d embedding to a 2-d vector for one role.</p>
          </details>
          <details>
            <summary>Step by step: every entry (matches the console)</summary>
            <p>Row of X · column of W, for example <code>q_the[0] = 1·1 + 0·0 + 1·1 + 0·0 = 2</code>.</p>
            <table>
              <tr><th>token</th><th>x</th><th>q = x·W_Q</th><th>k = x·W_K</th><th>v = x·W_V</th></tr>
              <tr><td>the</td><td>[1,0,1,0]</td><td>[1+1, 0] = <b>[2,0]</b></td><td>[0, 1+1] = <b>[0,2]</b></td><td>[1, 0] = <b>[1,0]</b></td></tr>
              <tr><td>cat</td><td>[0,2,0,1]</td><td>[0, 2] = <b>[0,2]</b></td><td>[2+1, 0] = <b>[3,0]</b></td><td>[1, 2+1] = <b>[1,3]</b></td></tr>
              <tr><td>sat</td><td>[1,1,0,1]</td><td>[1, 1] = <b>[1,1]</b></td><td>[1+1, 1] = <b>[2,1]</b></td><td>[1+1, 1+1] = <b>[2,2]</b></td></tr>
            </table>
            <p>Console output:</p>
            <pre><code>Q = X·W_Q (3x2)
  the [2,0]
  cat [0,2]
  sat [1,1]
K = X·W_K (3x2)
  the [0,2]
  cat [3,0]
  sat [2,1]
V = X·W_V (3x2)
  the [1,0]
  cat [1,3]
  sat [2,2]</code></pre>
            <p>Notice that <code>q_the = [2,0]</code> points the same way as <code>k_cat = [3,0]</code>. So in the next lesson "the" will attend strongly to "cat". The same token can look for one thing (its query) while advertising something different (its key).</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">B[0].map((_, j) =&gt;                         // ① one output column per column of B
  row.reduce((sum, a, k) =&gt; sum + a * B[k][j], 0)) // ② dot(row of A, column j of B)
const Q = matmul(X, W_Q);                    // ③ all tokens projected at once</code></pre>
            <ol>
              <li><strong>①</strong> <code>W</code> has 2 columns, so each token gets a 2-number output. <code>d_k</code> is simply the number of columns.</li>
              <li><strong>②</strong> Each output number is a dot product of the token's embedding with one column of the weight matrix.</li>
              <li><strong>③</strong> One matmul does all n tokens. On a GPU this is one big parallel operation, unlike an RNN's step-by-step loop.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Change <code>W_Q</code> to equal <code>W_K</code>. Then <code>q_i·k_j = q_j·k_i</code> and the relevance becomes symmetric.</li>
              <li>Add a 4th column to all three W matrices (<code>d_k = 3</code>). Q, K, V become 3×3 but the number of tokens is unchanged.</li>
            </ul>
            <div class="warn">Real layers are usually written <code>nn.Linear(d_model, d_k)</code>, which stores the weight as <code>(d_k, d_model)</code> and computes <code>x · Wᵀ (+ bias)</code>. The math is the same, but the stored matrix is transposed compared to our <code>X · W</code>.</div>
          </details>
        `,
      },
      {
        title: 'Reference: the same projections in PyTorch',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn

d_model, d_k = 4, 2
X = torch.tensor([[1., 0, 1, 0],
                  [0., 2, 0, 1],
                  [1., 1, 0, 1]])        # (n=3, d_model=4)

W_Q = nn.Linear(d_model, d_k, bias=False)  # learned weights, stored as (d_k, d_model)
W_K = nn.Linear(d_model, d_k, bias=False)
W_V = nn.Linear(d_model, d_k, bias=False)

Q, K, V = W_Q(X), W_K(X), W_V(X)          # each (3, 2)
print(Q.shape, K.shape, V.shape)          # torch.Size([3, 2]) x3`,
      },
    ],
    quiz: [
      {
        q: 'If X has shape (n, d_model) and W_Q has shape (d_model, d_k), what is the shape of Q?',
        options: ['(d_model, d_k)', '(n, d_k)', '(n, n)', '(d_k, n)'],
        answer: 1,
        why: '(n × d_model) · (d_model × d_k) = (n × d_k): one query vector of length d_k per token.',
      },
      {
        q: 'Which role matches "what I hand over if someone attends to me"?',
        options: ['Query', 'Key', 'Value', 'Embedding'],
        answer: 2,
        why: 'Values are what gets averaged into the output. Keys only decide how much each value is used.',
      },
      {
        q: 'Why use separate W_Q and W_K instead of one shared matrix?',
        options: [
          'To save memory',
          'So relevance can be asymmetric: what a token looks for can differ from what it advertises',
          'Because softmax needs two inputs',
          'It is required for tokenization',
        ],
        answer: 1,
        why: 'With one shared matrix, q_i·k_j = q_j·k_i for every pair. Separate projections let "it→animal" differ from "animal→it".',
      },
      {
        q: 'In our example q_the = [2,0]. Which key will "the" match best?',
        options: ['k_the = [0,2]', 'k_cat = [3,0]', 'k_sat = [2,1]', 'All equally'],
        answer: 1,
        why: '[2,0]·[3,0] = 6 > [2,0]·[2,1] = 4 > [2,0]·[0,2] = 0.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>A 4th token <code>"down"</code> with embedding <code>[0, 0, 2, 1]</code> joins the sequence. Implement <code>matmul</code> and print the new Q, K and V. Expected last rows:</p>
<pre><code>Q down [2,0]
K down [1,2]
V down [1,1]</code></pre>`,
      starter: `const tokens = ['the', 'cat', 'sat', 'down'];
const X = [
  [1, 0, 1, 0],
  [0, 2, 0, 1],
  [1, 1, 0, 1],
  [0, 0, 2, 1],
];
const W_Q = [[1, 0], [0, 1], [1, 0], [0, 0]];
const W_K = [[0, 1], [1, 0], [0, 1], [1, 0]];
const W_V = [[1, 0], [0, 1], [0, 0], [1, 1]];

function matmul(A, B) {
  // TODO: return an (A.length x B[0].length) matrix
  // entry [i][j] = sum over k of A[i][k] * B[k][j]
  return A.map(() => B[0].map(() => 0));
}

const results = { Q: matmul(X, W_Q), K: matmul(X, W_K), V: matmul(X, W_V) };
for (const name in results) {
  results[name].forEach((row, i) => console.log(name, tokens[i].padEnd(4), JSON.stringify(row)));
}`,
      hint: 'return A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));',
      solution: `const tokens = ['the', 'cat', 'sat', 'down'];
const X = [
  [1, 0, 1, 0],
  [0, 2, 0, 1],
  [1, 1, 0, 1],
  [0, 0, 2, 1],
];
const W_Q = [[1, 0], [0, 1], [1, 0], [0, 0]];
const W_K = [[0, 1], [1, 0], [0, 1], [1, 0]];
const W_V = [[1, 0], [0, 1], [0, 0], [1, 1]];

function matmul(A, B) {
  return A.map(row =>
    B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0))
  );
}

const results = { Q: matmul(X, W_Q), K: matmul(X, W_K), V: matmul(X, W_V) };
for (const name in results) {
  results[name].forEach((row, i) => console.log(name, tokens[i].padEnd(4), JSON.stringify(row)));
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'scaled-dot-product',
    section: 'Attention',
    title: 'Scaled Dot-Product Attention',
    explain: `
      <p>This is the formula at the heart of every Transformer (Vaswani et al., 2017):</p>
      <pre><code>Attention(Q, K, V) = softmax( Q · Kᵀ / √d_k ) · V</code></pre>
      <p>Read it as four steps, and keep the shapes in mind (n tokens):</p>
      <ol>
        <li><strong>Scores</strong> <code>S = Q·Kᵀ</code>, shape <code>(n, n)</code>. Entry <code>S[i][j] = qᵢ·kⱼ</code> says how much token i's query matches token j's key. Row i is "token i looking at everyone".</li>
        <li><strong>Scale</strong>: divide every score by <code>√d_k</code>.</li>
        <li><strong>Softmax each row</strong>, giving the attention weights <code>A</code>, shape <code>(n, n)</code>. Every row sums to 1.</li>
        <li><strong>Weighted sum of values</strong>: <code>A·V</code>, shape <code>(n, d_v)</code>. Row i is token i's new, context-aware vector.</li>
      </ol>
      <p>It's the soft lookup from two lessons ago, done for all n queries at once with two matrix multiplies. That's why it's so fast on GPUs.</p>

      <h3>Why divide by √d_k?</h3>
      <p>If the entries of q and k are roughly independent with mean 0 and variance 1, then <code>q·k = Σ qᵢkᵢ</code> is a sum of d_k such products. Its variance is <strong>d_k</strong>, so its typical size (standard deviation) is <strong>√d_k</strong>. With <code>d_k = 64</code>, raw scores are about ±8, and softmax of numbers that spread out <strong>saturates</strong>: nearly one-hot (recall temperature from the Softmax lesson). A saturated softmax has near-zero gradients, so training stalls. Dividing by √d_k brings the scores back to unit variance no matter the dimension.</p>
      <div class="tip">It is just a fixed temperature: <code>softmax(s / √d_k)</code> is softmax at temperature <code>T = √d_k</code>, chosen so peakiness does not depend on head size.</div>
      <div class="warn">The softmax goes <strong>along each row</strong> (over keys j for a fixed query i), not down the columns. In code: <code>softmax(scores, dim=-1)</code>.</div>
    `,
    examples: [
      {
        title: 'Attention heatmap: step through scores → scale → softmax → output',
        code: `<div class="card">
  <div class="hint">Click the stage buttons in order. Click a row (a query token) to see its numbers in detail. Rows = queries ("who is looking"), columns = keys ("who is looked at").</div>
  <div class="row" id="stages"></div>
  <div class="flex">
    <svg id="sv" width="300" height="250" viewBox="0 0 300 250"></svg>
    <div id="detail"></div>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  button.on { background: #ffe08a; border-color: #d9a400; }
  .flex { display: flex; gap: 14px; align-items: flex-start; margin-top: 8px; }
  #detail { flex: 1; font: 13px ui-monospace, monospace; background: #f8f9fa; border-radius: 6px; padding: 8px; line-height: 1.6; }
  svg text { font: 13px ui-monospace, monospace; }
</style>

<script>
  const TOK = ['the', 'cat', 'sat'];
  const Q = [[2, 0], [0, 2], [1, 1]];
  const K = [[0, 2], [3, 0], [2, 1]];
  const V = [[1, 0], [1, 3], [2, 2]];
  const dk = 2;
  const STAGES = ['① scores Q·Kᵀ', '② ÷ √d_k', '③ softmax rows', '④ weights · V'];
  let stage = 0;
  let row = 0;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const softmax = (r) => {
    const m = Math.max(...r);
    const e = r.map(x => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  };
  const S = Q.map(q => K.map(k => dot(q, k)));
  const SC = S.map(r => r.map(x => x / Math.sqrt(dk)));
  const A = SC.map(softmax);
  const OUT = A.map(w => [0, 1].map(j => w.reduce((s, x, t) => s + x * V[t][j], 0)));

  function draw() {
    const M = stage === 0 ? S : stage === 1 ? SC : A;
    const max = Math.max(...M.flat());
    let s = '';
    TOK.forEach((t, j) => (s += '<text x="' + (95 + j * 64) + '" y="16" text-anchor="middle" fill="#555">' + t + '</text>'));
    s += '<text x="190" y="246" text-anchor="middle" fill="#888" font-size="11">keys →</text>';
    M.forEach((r, i) => {
      s += '<g data-r="' + i + '" style="cursor:pointer"><text x="54" y="' + (58 + i * 64) + '" text-anchor="end" fill="' +
        (i === row ? '#e8590c' : '#555') + '">' + TOK[i] + '</text>';
      r.forEach((v, j) => {
        const a = Math.max(0, v) / max;
        s += '<rect x="' + (63 + j * 64) + '" y="' + (24 + i * 64) + '" width="62" height="62" fill="rgba(76,110,245,' +
          a.toFixed(2) + ')" stroke="' + (i === row ? '#e8590c' : '#fff') + '" stroke-width="2"/>';
        s += '<text x="' + (94 + j * 64) + '" y="' + (60 + i * 64) + '" text-anchor="middle" fill="' +
          (a > 0.55 ? '#fff' : '#1a1a1a') + '">' + (stage === 0 ? v : v.toFixed(3)) + '</text>';
      });
      s += '</g>';
    });
    document.getElementById('sv').innerHTML = s;
    document.querySelectorAll('g[data-r]').forEach(g => (g.onclick = () => { row = +g.dataset.r; draw(); }));

    const t = TOK[row];
    let d = '<b>query "' + t + '"</b> q = [' + Q[row] + ']<br>';
    d += 'scores: ' + K.map((k, j) => 'q·k_' + TOK[j] + '=' + S[row][j]).join(', ') + '<br>';
    if (stage >= 1) d += '÷ √2 → ' + SC[row].map(x => x.toFixed(3)).join(', ') + '<br>';
    if (stage >= 2) d += 'softmax → ' + A[row].map(x => x.toFixed(3)).join(', ') +
      ' (sum ' + A[row].reduce((a, b) => a + b, 0).toFixed(3) + ')<br>';
    if (stage >= 3) d += 'output = ' + A[row].map((w, j) => w.toFixed(3) + '·[' + V[j] + ']').join(' + ') +
      '<br>= <b>[' + OUT[row].map(x => x.toFixed(3)).join(', ') + ']</b>';
    else d += '<span style="color:#888">…press the next stage</span>';
    document.getElementById('detail').innerHTML = d;

    document.getElementById('stages').innerHTML = STAGES.map((n, i) =>
      '<button data-s="' + i + '" class="' + (i === stage ? 'on' : '') + '">' + n + '</button>').join('');
    document.querySelectorAll('button[data-s]').forEach(b => (b.onclick = () => { stage = +b.dataset.s; draw(); }));
  }
  draw();
</script>`,
      },
      {
        title: 'Why √d_k: softmax peakiness vs dimension',
        code: `<div class="card">
  <div class="hint">Drag <b>d_k</b> up. Each query and key has random entries (mean 0, variance 1). Without scaling, the raw dot products grow like √d_k and the softmax collapses onto one key. Tick <b>divide by √d_k</b> to fix it.</div>
  <div class="row">
    d_k = <b id="dv"></b>
    <input id="d" type="range" min="0" max="9" value="3" />
    <label><input type="checkbox" id="scale" /> divide by √d_k</label>
  </div>
  <div id="bars"></div>
  <div id="stats"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  #d { width: 240px; vertical-align: middle; }
  .bar { display: flex; align-items: center; gap: 6px; font: 12px ui-monospace, monospace; margin: 3px 0; }
  .bar span { width: 150px; text-align: right; color: #555; }
  .bar i { display: inline-block; height: 14px; background: #4c6ef5; border-radius: 2px; }
  #stats { margin-top: 8px; font: 13px ui-monospace, monospace; background: #f8f9fa; padding: 6px 8px; border-radius: 6px; }
</style>

<script>
  const DIMS = [2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function gaussian(rand) {
    // Box-Muller: two uniforms -> one standard normal
    const u = 1 - rand();
    const v = rand();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  const vec = (rand, d) => Array.from({ length: d }, () => gaussian(rand));
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const softmax = (r) => {
    const m = Math.max(...r);
    const e = r.map(x => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  };

  function draw() {
    const d = DIMS[+document.getElementById('d').value];
    const scale = document.getElementById('scale').checked;
    document.getElementById('dv').textContent = d;
    const rand = mulberry32(1234 + d); // fixed seed per d -> deterministic
    const q = vec(rand, d);
    const keys = Array.from({ length: 8 }, () => vec(rand, d));
    const raw = keys.map(k => dot(q, k));
    const used = raw.map(s => (scale ? s / Math.sqrt(d) : s));
    const w = softmax(used);
    document.getElementById('bars').innerHTML = w.map((x, i) =>
      '<div class="bar"><span>key ' + (i + 1) + ' score ' + used[i].toFixed(2) + '</span><i style="width:' +
      x * 380 + 'px"></i>' + x.toFixed(3) + '</div>').join('');
    // Empirical spread of q·k over many random pairs
    const r2 = mulberry32(99 + d);
    let sum = 0;
    let sq = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const s = dot(vec(r2, d), vec(r2, d)) / (scale ? Math.sqrt(d) : 1);
      sum += s;
      sq += s * s;
    }
    const std = Math.sqrt(sq / N - (sum / N) ** 2);
    const entropy = -w.reduce((s, x) => s + (x > 0 ? x * Math.log(x) : 0), 0);
    document.getElementById('stats').innerHTML =
      'std of scores over 300 random pairs ≈ <b>' + std.toFixed(2) + '</b>' +
      (scale ? ' (target: 1)' : ' (theory: √' + d + ' = ' + Math.sqrt(d).toFixed(2) + ')') +
      '<br>max weight = <b>' + Math.max(...w).toFixed(3) + '</b> · effective #keys (e^entropy) = ' +
      Math.exp(entropy).toFixed(2) + ' of 8';
  }

  document.getElementById('d').oninput = draw;
  document.getElementById('scale').onchange = draw;
  draw();
</script>`,
      },
      {
        title: 'softmax(QKᵀ/√d_k)·V by hand for 3 tokens',
        lang: 'js',
        code: `const tokens = ['the', 'cat', 'sat'];

// Q, K, V from the previous lesson (3 tokens, d_k = 2)
const Q = [[2, 0], [0, 2], [1, 1]];
const K = [[0, 2], [3, 0], [2, 1]];
const V = [[1, 0], [1, 3], [2, 2]];
const d_k = 2;

const transpose = (M) => M[0].map((_, j) => M.map(row => row[j]));
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));

function softmax(row) {
  const m = Math.max(...row); // subtract max for numerical safety
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

function show(name, M, digits = 3) {
  console.log(name);
  M.forEach((row, i) =>
    console.log('  ' + tokens[i].padEnd(4) + row.map(x => x.toFixed(digits).padStart(7)).join(''))
  );
}

// ① raw scores: every query dotted with every key
const scores = matmul(Q, transpose(K));
show('① scores = Q·Kᵀ', scores, 0);

// ② scale by √d_k
const scaled = scores.map(row => row.map(x => x / Math.sqrt(d_k)));
show('② scaled = scores / √' + d_k, scaled);

// ③ softmax each row -> attention weights
const weights = scaled.map(softmax);
show('③ weights = softmax(row)', weights);
console.log('   row sums:', weights.map(r => r.reduce((a, b) => a + b, 0).toFixed(3)).join(' '));

// ④ weighted sum of the value vectors
const out = matmul(weights, V);
show('④ output = weights·V', out);`,
        explain: `
          <details>
            <summary>The problem: turn Q, K, V into one new vector per token</summary>
            <p>From the previous lesson: <code>Q = [[2,0],[0,2],[1,1]]</code>, <code>K = [[0,2],[3,0],[2,1]]</code>, <code>V = [[1,0],[1,3],[2,2]]</code>. Each token needs to (a) decide how relevant every token is to it, and (b) collect a blend of their values. Without scaling, the scores here are small because <code>d_k = 2</code>. At real sizes (<code>d_k = 64</code>) skipping the scale would make the softmax nearly one-hot.</p>
          </details>
          <details>
            <summary>Step by step: every matrix (matches the console)</summary>
            <table>
              <tr><th>query</th><th>① scores q·k<br>(the, cat, sat)</th><th>② ÷ √2 = 1.414</th><th>③ softmax (row sums to 1)</th><th>④ output = Σ w·v</th></tr>
              <tr><td>the [2,0]</td><td>0, 6, 4</td><td>0.000, 4.243, 2.828</td><td>0.011, <b>0.795</b>, 0.193</td><td>[1.193, 2.772]</td></tr>
              <tr><td>cat [0,2]</td><td>4, 0, 2</td><td>2.828, 0.000, 1.414</td><td><b>0.768</b>, 0.045, 0.187</td><td>[1.187, 0.510]</td></tr>
              <tr><td>sat [1,1]</td><td>2, 3, 3</td><td>1.414, 2.121, 2.121</td><td>0.198, 0.401, 0.401</td><td>[1.401, 2.006]</td></tr>
            </table>
            <p>Check one softmax by hand. For "the": <code>e^0 = 1</code>, <code>e^4.243 = 69.6</code>, <code>e^2.828 = 16.9</code>, total 87.5. That gives 1/87.5 = 0.011, 69.6/87.5 = 0.795 and 16.9/87.5 = 0.193.</p>
            <p>Check one output: "the" = <code>0.011·[1,0] + 0.795·[1,3] + 0.193·[2,2] = [1.193, 2.772]</code>. It is mostly cat's value <code>[1,3]</code>, as the weights predict.</p>
            <p>The console prints <code>row sums: 1.000 1.000 1.000</code>, which confirms each row is a proper distribution.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">matmul(Q, transpose(K))              // ① (3×2)·(2×3) = 3×3 score matrix
x / Math.sqrt(d_k)                   // ② keep scores ~unit variance
scaled.map(softmax)                  // ③ softmax PER ROW (one query at a time)
matmul(weights, V)                   // ④ (3×3)·(3×2) = 3×2, same shape as V</code></pre>
            <ol>
              <li><strong>①</strong> Transposing K turns its rows (keys) into columns, so entry [i][j] = qᵢ·kⱼ.</li>
              <li><strong>②</strong> With d_k = 2 we divide by 1.414. In GPT-2 (d_k = 64) we'd divide by 8.</li>
              <li><strong>③</strong> <code>Math.max</code> is subtracted inside softmax for numerical stability. The result is the same but it can't overflow.</li>
              <li><strong>④</strong> Row i of the output is a convex blend of value rows. The output has one vector per token, the same count as the input.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Remove the scaling (<code>x / 1</code>). "the" becomes 0.002, 0.879, 0.119, which is peakier. Multiply Q by 5 and it becomes basically one-hot.</li>
              <li>Swap <code>K[1]</code> and <code>K[2]</code>. The columns of the weight matrix swap too, but the output only changes if V is left in its original order. Keys and values must stay paired per token.</li>
            </ul>
            <div class="warn">Common bug: taking softmax over the whole matrix, or down columns. Each <em>query row</em> must be its own distribution over keys.</div>
          </details>
        `,
      },
      {
        title: 'Reference: scaled dot-product attention in PyTorch 2.x',
        runnable: false,
        lang: 'python',
        code: `import math
import torch
import torch.nn.functional as F

Q = torch.tensor([[2., 0], [0, 2], [1, 1]])
K = torch.tensor([[0., 2], [3, 0], [2, 1]])
V = torch.tensor([[1., 0], [1, 3], [2, 2]])

# By hand
scores = Q @ K.T / math.sqrt(Q.size(-1))   # (3, 3)
weights = scores.softmax(dim=-1)           # softmax along each row
out = weights @ V                          # (3, 2)

# Built-in fused kernel (uses FlashAttention / memory-efficient kernels when available)
out2 = F.scaled_dot_product_attention(Q, K, V)
print(torch.allclose(out, out2, atol=1e-6))  # True`,
      },
    ],
    quiz: [
      {
        q: 'With n tokens, what is the shape of the attention weight matrix softmax(QKᵀ/√d_k)?',
        options: ['(n, d_k)', '(d_k, d_k)', '(n, n)', '(n, 1)'],
        answer: 2,
        why: 'There is one weight for every (query, key) pair: n × n.',
      },
      {
        q: 'Why divide the scores by √d_k?',
        options: [
          'To make them integers',
          'Dot products of d_k-dim random vectors have std ≈ √d_k. Without scaling, softmax saturates and gradients vanish',
          'To make the rows sum to 1',
          'To speed up the matmul',
        ],
        answer: 1,
        why: 'Variance of q·k grows linearly with d_k. Dividing by √d_k restores unit variance, so softmax stays in a trainable range.',
      },
      {
        q: 'The softmax in attention is applied…',
        options: ['Over the whole matrix', 'Down each column', 'Along each row (over keys, for each query)', 'Only to the diagonal'],
        answer: 2,
        why: 'Each query gets its own distribution over all keys, so each row sums to 1.',
      },
      {
        q: 'In the example, the output for "the" is [1.193, 2.772]. Why is it so close to cat\'s value [1,3]?',
        options: [
          'Because "the" is the first token',
          'Because 79.5% of the weight in the "the" row goes to "cat"',
          'Because V is normalized',
          'Coincidence',
        ],
        answer: 1,
        why: 'q_the·k_cat = 6 is the biggest score in that row, so softmax gives cat 0.795 of the weight.',
      },
      {
        q: 'd_k = 64 and a raw score is 16. What is the scaled score?',
        options: ['0.25', '2', '8', '1024'],
        answer: 1,
        why: '16 / √64 = 16 / 8 = 2.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write a general <code>attention(Q, K, V)</code> that works for any n and d_k and returns <code>{ weights, out }</code>. Run it on the 4-token sequence (with "down" from the last exercise). Expected:</p>
<pre><code>the  w: 0.011 0.760 0.185 0.045  out: [1.185, 2.693]
cat  w: 0.434 0.026 0.106 0.434  out: [1.106, 0.723]
sat  w: 0.141 0.286 0.286 0.286  out: [1.286, 1.718]
down w: 0.011 0.760 0.185 0.045  out: [1.185, 2.693]</code></pre>
<p>(Why are "the" and "down" identical? They have the same query <code>[2,0]</code>. Attention output depends only on the query and the shared K, V.)</p>`,
      starter: `const tokens = ['the', 'cat', 'sat', 'down'];
const Q = [[2, 0], [0, 2], [1, 1], [2, 0]];
const K = [[0, 2], [3, 0], [2, 1], [1, 2]];
const V = [[1, 0], [1, 3], [2, 2], [1, 1]];

const transpose = (M) => M[0].map((_, j) => M.map(row => row[j]));
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));

function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

function attention(Q, K, V) {
  const d_k = K[0].length;
  // TODO: scores -> scale -> softmax per row -> weights · V
  const weights = Q.map(() => K.map(() => 1 / K.length));
  const out = matmul(weights, V);
  return { weights, out };
}

const { weights, out } = attention(Q, K, V);
tokens.forEach((t, i) => {
  console.log(
    t.padEnd(5) + 'w: ' + weights[i].map(x => x.toFixed(3)).join(' ') +
    '  out: [' + out[i].map(x => x.toFixed(3)).join(', ') + ']'
  );
});`,
      hint: 'const scores = matmul(Q, transpose(K)); const weights = scores.map(r => softmax(r.map(x => x / Math.sqrt(d_k))));',
      solution: `const tokens = ['the', 'cat', 'sat', 'down'];
const Q = [[2, 0], [0, 2], [1, 1], [2, 0]];
const K = [[0, 2], [3, 0], [2, 1], [1, 2]];
const V = [[1, 0], [1, 3], [2, 2], [1, 1]];

const transpose = (M) => M[0].map((_, j) => M.map(row => row[j]));
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));

function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

function attention(Q, K, V) {
  const d_k = K[0].length;
  const scores = matmul(Q, transpose(K));
  const weights = scores.map(r => softmax(r.map(x => x / Math.sqrt(d_k))));
  const out = matmul(weights, V);
  return { weights, out };
}

const { weights, out } = attention(Q, K, V);
tokens.forEach((t, i) => {
  console.log(
    t.padEnd(5) + 'w: ' + weights[i].map(x => x.toFixed(3)).join(' ') +
    '  out: [' + out[i].map(x => x.toFixed(3)).join(', ') + ']'
  );
});`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'causal-mask',
    section: 'Attention',
    title: 'Causal Masking',
    explain: `
      <p>A GPT-style model is trained to predict the <strong>next</strong> token. In training we feed the whole sentence at once and ask for a prediction at <em>every</em> position in parallel. Position 1 predicts token 2, position 2 predicts token 3, and so on (recall Next-Token Prediction). One sequence of n tokens gives n training examples in a single forward pass.</p>
      <p>But plain self-attention lets every token look at every other token, <em>including the future</em>. Position "cat" could just attend to "sat" and copy the answer. The model would get a perfect training loss and learn nothing useful, and at generation time the future doesn't exist yet.</p>
      <h3>The fix: mask the upper triangle</h3>
      <p>Before the softmax, set every score where the key comes <strong>after</strong> the query (<code>j &gt; i</code>) to <code>−∞</code>:</p>
      <pre><code>scores[i][j] = −∞   for j &gt; i
weights = softmax(scores)       // e^(−∞) = 0, so future tokens get exactly 0 weight</code></pre>
      <p>Softmax then re-normalizes over the allowed keys, so each row still sums to 1. Token i gets a weighted average of tokens 0…i only. This is called a <strong>causal</strong> (or look-ahead) mask, and it's what makes a Transformer a <em>decoder</em>.</p>
      <div class="tip"><strong>Bonus:</strong> because token i never sees tokens after it, its output never changes when you append more tokens. At generation time you can cache the keys and values of past tokens instead of recomputing them. This is the <strong>KV cache</strong>, covered later.</div>
      <div class="warn">Mask with <code>−∞</code> (or a very large negative number) <strong>before</strong> softmax. Zeroing weights <em>after</em> softmax leaves rows that no longer sum to 1. Using <code>0</code> as the masked score doesn't block anything, because e⁰ = 1.</div>
      <p>Encoder models like BERT use no causal mask (they see both directions). Decoder-only LLMs (GPT, Llama, Claude…) use it in every layer.</p>
    `,
    examples: [
      {
        title: 'Toggle the causal mask on a 4-token heatmap',
        code: `<div class="card">
  <div class="hint">Toggle the <b>causal mask</b>. With it off, the red-bordered cells show "cheating": each position attending to the very token it is supposed to predict. Click a row to see what that position may use.</div>
  <div class="row">
    <label><input type="checkbox" id="mask" checked /> causal mask</label>
  </div>
  <div class="flex">
    <svg id="sv" width="330" height="300" viewBox="0 0 330 300"></svg>
    <div id="detail"></div>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  .flex { display: flex; gap: 14px; align-items: flex-start; margin-top: 6px; }
  #detail { flex: 1; font: 13px ui-monospace, monospace; background: #f8f9fa; border-radius: 6px; padding: 8px; line-height: 1.6; }
  svg text { font: 12px ui-monospace, monospace; }
</style>

<script>
  const TOK = ['the', 'cat', 'sat', 'down'];
  const NEXT = ['cat', 'sat', 'down', '(end)'];
  // Scaled scores for these 4 tokens (from the same Q, K as the code example)
  const S = [
    [0.000, 4.243, 2.828, 1.414],
    [2.828, 0.000, 1.414, 2.828],
    [1.414, 2.121, 2.121, 2.121],
    [0.000, 4.243, 2.828, 1.414],
  ];
  let row = 1;
  const softmax = (r) => {
    const m = Math.max(...r);
    const e = r.map(x => Math.exp(x - m));
    const s = e.reduce((a, b) => a + b, 0);
    return e.map(x => x / s);
  };

  function draw() {
    const masked = document.getElementById('mask').checked;
    const M = S.map((r, i) => r.map((x, j) => (masked && j > i ? -Infinity : x)));
    const W = M.map(softmax);
    const c = 64;
    let s = '';
    TOK.forEach((t, j) => (s += '<text x="' + (80 + j * c) + '" y="14" text-anchor="middle" fill="#555">' + t + '</text>'));
    W.forEach((r, i) => {
      s += '<g data-r="' + i + '" style="cursor:pointer"><text x="44" y="' + (52 + i * c) + '" text-anchor="end" fill="' +
        (i === row ? '#e8590c' : '#555') + '">' + TOK[i] + '</text>';
      r.forEach((w, j) => {
        const x = 48 + j * c;
        const y = 20 + i * c;
        const blocked = M[i][j] === -Infinity;
        const cheat = !masked && j === i + 1;
        s += '<rect x="' + x + '" y="' + y + '" width="' + (c - 2) + '" height="' + (c - 2) + '" fill="' +
          (blocked ? '#e9ecef' : 'rgba(76,110,245,' + w.toFixed(2) + ')') + '" stroke="' +
          (cheat ? '#e03131' : i === row ? '#e8590c' : '#fff') + '" stroke-width="' + (cheat ? 3 : 2) + '"/>';
        s += '<text x="' + (x + 31) + '" y="' + (y + 36) + '" text-anchor="middle" fill="' +
          (blocked ? '#999' : w > 0.55 ? '#fff' : '#1a1a1a') + '">' + (blocked ? '−∞→0' : w.toFixed(2)) + '</text>';
      });
      s += '<text x="' + (54 + 4 * c) + '" y="' + (52 + i * c) + '" fill="#888">Σ=' +
        r.reduce((a, b) => a + b, 0).toFixed(2) + '</text></g>';
    });
    document.getElementById('sv').innerHTML = s;
    document.querySelectorAll('g[data-r]').forEach(g => (g.onclick = () => { row = +g.dataset.r; draw(); }));
    const seen = TOK.filter((_, j) => W[row][j] > 0);
    document.getElementById('detail').innerHTML =
      'Position <b>' + TOK[row] + '</b> is trained to predict <b>' + NEXT[row] + '</b>.<br>' +
      'It may read: ' + seen.join(', ') + '<br><br>' +
      (masked
        ? 'OK: only itself and earlier tokens. Its row still sums to 1 because softmax re-normalizes over the unmasked keys.'
        : (row < 3
          ? '<span style="color:#e03131"><b>Cheating!</b> It can attend to "' + NEXT[row] + '" (weight ' +
            W[row][row + 1].toFixed(2) + '), the very answer it should predict.</span>'
          : 'The last position has no future anyway, but every other row leaks.'));
  }

  document.getElementById('mask').onchange = draw;
  draw();
</script>`,
      },
      {
        title: 'Masked attention in numbers: −∞ before softmax',
        lang: 'js',
        code: `const tokens = ['the', 'cat', 'sat'];
const Q = [[2, 0], [0, 2], [1, 1]];
const K = [[0, 2], [3, 0], [2, 1]];
const V = [[1, 0], [1, 3], [2, 2]];
const d_k = 2;
const n = tokens.length;

const transpose = (M) => M[0].map((_, j) => M.map(row => row[j]));
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m)); // exp(-Infinity) = 0
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}
const f = (x) => (x === -Infinity ? '-inf' : x.toFixed(3)).padStart(7);
function show(name, M) {
  console.log(name);
  M.forEach((row, i) => console.log('  ' + tokens[i].padEnd(4) + row.map(f).join('')));
}

const scaled = matmul(Q, transpose(K)).map(r => r.map(x => x / Math.sqrt(d_k)));
show('scaled scores (no mask)', scaled);

// ① causal mask: position i may only look at positions j <= i
const mask = Array.from({ length: n }, (_, i) =>
  Array.from({ length: n }, (_, j) => (j <= i ? 0 : -Infinity))
);

// ② add the mask BEFORE softmax
const masked = scaled.map((row, i) => row.map((x, j) => x + mask[i][j]));
show('masked scores', masked);

// ③ softmax: -inf becomes exactly 0, each row still sums to 1
const weights = masked.map(softmax);
show('causal weights', weights);
console.log('row sums:', weights.map(r => r.reduce((a, b) => a + b, 0).toFixed(3)).join(' '));

const out = matmul(weights, V);
show('output = weights·V', out);`,
        explain: `
          <details>
            <summary>The problem: parallel training without peeking</summary>
            <p>We compute all 3 positions in one go. Without a mask, row "the" puts 0.795 of its weight on "cat", and "cat" is exactly the token "the" is supposed to predict. We need row i to ignore columns j &gt; i, while each row still stays a valid probability distribution.</p>
          </details>
          <details>
            <summary>Step by step: masked scores → weights → output (matches the console)</summary>
            <table>
              <tr><th>row</th><th>scaled scores</th><th>masked (j &gt; i → −∞)</th><th>softmax</th><th>output</th></tr>
              <tr><td>the (i=0)</td><td>0.000, 4.243, 2.828</td><td>0.000, −inf, −inf</td><td><b>1.000</b>, 0.000, 0.000</td><td>[1.000, 0.000] = v_the</td></tr>
              <tr><td>cat (i=1)</td><td>2.828, 0.000, 1.414</td><td>2.828, 0.000, −inf</td><td>0.944, 0.056, 0.000</td><td>[1.000, 0.167]</td></tr>
              <tr><td>sat (i=2)</td><td>1.414, 2.121, 2.121</td><td>unchanged</td><td>0.198, 0.401, 0.401</td><td>[1.401, 2.006]</td></tr>
            </table>
            <p>Row "cat" by hand: <code>e^2.828 = 16.92</code>, <code>e^0 = 1</code>, <code>e^−∞ = 0</code>. Sum = 17.92, so the weights are 16.92/17.92 = 0.944 and 1/17.92 = 0.056. Output: <code>0.944·[1,0] + 0.056·[1,3] = [1.000, 0.167]</code>.</p>
            <p>The first token can only see itself, so its output is exactly its own value. The last row has nothing to mask, so it matches the unmasked lesson (0.198, 0.401, 0.401). The console prints <code>row sums: 1.000 1.000 1.000</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">(j &lt;= i ? 0 : -Infinity)                 // ① lower triangle 0, upper −∞
row.map((x, j) =&gt; x + mask[i][j])         // ② additive mask on the SCORES
Math.exp(x - m)                           // ③ exp(−∞ − m) = 0 exactly</code></pre>
            <ol>
              <li><strong>①</strong> The mask depends only on positions, not on content, so it can be built once and reused for every layer and batch.</li>
              <li><strong>②</strong> Adding 0 leaves a score untouched. Adding −∞ removes it. This "additive mask" form is what frameworks use.</li>
              <li><strong>③</strong> The row max <code>m</code> is always a finite, unmasked score (the diagonal is never masked), so no <code>NaN</code> appears.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Change the mask to <code>j &lt;= i &amp;&amp; j &gt;= i - 1</code>. Each token now sees only itself and the previous one (a "sliding window" mask, used by some long-context models).</li>
              <li>Mask the diagonal too (<code>j &lt; i</code>). Row "the" becomes all −∞, and softmax yields <code>NaN</code> (0/0). That's why the diagonal must stay visible.</li>
            </ul>
            <div class="warn">Don't compute a normal softmax and then zero out the future weights. Row "the" would become [0.011, 0, 0], which sums to 0.011 instead of 1, and the outputs shrink. Mask the scores <em>first</em>.</div>
          </details>
        `,
      },
      {
        title: 'Reference: causal attention in PyTorch 2.x',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn.functional as F

n, d_k = 3, 2
Q, K, V = torch.randn(n, d_k), torch.randn(n, d_k), torch.randn(n, d_k)

# By hand: boolean upper-triangle mask -> -inf
scores = Q @ K.T / d_k ** 0.5
future = torch.triu(torch.ones(n, n, dtype=torch.bool), diagonal=1)  # True where j > i
scores = scores.masked_fill(future, float('-inf'))
out = scores.softmax(dim=-1) @ V

# Built-in
out2 = F.scaled_dot_product_attention(Q, K, V, is_causal=True)
print(torch.allclose(out, out2, atol=1e-6))  # True`,
      },
    ],
    quiz: [
      {
        q: 'Why do decoder (GPT-style) models need a causal mask during training?',
        options: [
          'To reduce memory',
          'All positions are trained in parallel, and without the mask a position could attend to the future token it must predict',
          'To make softmax faster',
          'Because tokenization requires it',
        ],
        answer: 1,
        why: 'The mask prevents information from future tokens leaking into each prediction, while still allowing one parallel pass over the sequence.',
      },
      {
        q: 'Which entries of the n×n score matrix are masked?',
        options: ['The diagonal', 'Below the diagonal (j < i)', 'Above the diagonal (j > i)', 'The first column'],
        answer: 2,
        why: 'Row i is the query position, and keys j > i are in the future.',
      },
      {
        q: 'What value is put into masked scores, and when?',
        options: [
          '0, after softmax',
          '−∞ (or a huge negative number), before softmax',
          '1, before softmax',
          'NaN, after softmax',
        ],
        answer: 1,
        why: 'e^(−∞) = 0, so after softmax the future weights are exactly 0 and the rest re-normalize to sum to 1.',
      },
      {
        q: 'With a causal mask, what does the very first token attend to?',
        options: ['Nothing', 'Only itself (weight 1)', 'All tokens equally', 'The last token'],
        answer: 1,
        why: 'Row 0 has only one unmasked entry, the diagonal, so its weight is 1.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement <code>causalAttention(Q, K, V)</code> for the 4-token sequence. Then notice that the first three rows are <strong>identical</strong> to the 3-token masked result (adding "down" can't change the past). Expected:</p>
<pre><code>the  w: 1.000 0.000 0.000 0.000  out: [1.000, 0.000]
cat  w: 0.944 0.056 0.000 0.000  out: [1.000, 0.167]
sat  w: 0.198 0.401 0.401 0.000  out: [1.401, 2.006]
down w: 0.011 0.760 0.185 0.045  out: [1.185, 2.693]</code></pre>`,
      starter: `const tokens = ['the', 'cat', 'sat', 'down'];
const Q = [[2, 0], [0, 2], [1, 1], [2, 0]];
const K = [[0, 2], [3, 0], [2, 1], [1, 2]];
const V = [[1, 0], [1, 3], [2, 2], [1, 1]];

const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

function causalAttention(Q, K, V) {
  const d_k = K[0].length;
  const weights = Q.map((q, i) => {
    const scores = K.map(k => dot(q, k) / Math.sqrt(d_k));
    // TODO: set scores[j] = -Infinity for every j > i
    return softmax(scores);
  });
  return { weights, out: matmul(weights, V) };
}

const { weights, out } = causalAttention(Q, K, V);
tokens.forEach((t, i) => {
  console.log(
    t.padEnd(5) + 'w: ' + weights[i].map(x => x.toFixed(3)).join(' ') +
    '  out: [' + out[i].map(x => x.toFixed(3)).join(', ') + ']'
  );
});`,
      hint: 'Replace the K.map line with: K.map((k, j) => (j > i ? -Infinity : dot(q, k) / Math.sqrt(d_k))).',
      solution: `const tokens = ['the', 'cat', 'sat', 'down'];
const Q = [[2, 0], [0, 2], [1, 1], [2, 0]];
const K = [[0, 2], [3, 0], [2, 1], [1, 2]];
const V = [[1, 0], [1, 3], [2, 2], [1, 1]];

const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

function causalAttention(Q, K, V) {
  const d_k = K[0].length;
  const weights = Q.map((q, i) => {
    const scores = K.map((k, j) => (j > i ? -Infinity : dot(q, k) / Math.sqrt(d_k)));
    return softmax(scores);
  });
  return { weights, out: matmul(weights, V) };
}

const { weights, out } = causalAttention(Q, K, V);
tokens.forEach((t, i) => {
  console.log(
    t.padEnd(5) + 'w: ' + weights[i].map(x => x.toFixed(3)).join(' ') +
    '  out: [' + out[i].map(x => x.toFixed(3)).join(', ') + ']'
  );
});`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'multi-head',
    section: 'Attention',
    title: 'Multi-Head Attention',
    explain: `
      <p>One attention operation produces one set of weights per token: a single "way of looking" at the sentence. But a token usually needs several kinds of context at once. "sat" wants to know <em>who</em> sat (the subject), <em>what came right before</em>, maybe <em>where</em>. One softmax row can't put 90% of its weight in three places.</p>
      <p><strong>Multi-head attention</strong> runs <code>h</code> attention operations ("heads") side by side. Each has its <strong>own</strong> <code>W_Q, W_K, W_V</code>:</p>
      <pre><code>d_head = d_model / h
for each head i:   headᵢ = Attention(X·W_Qⁱ, X·W_Kⁱ, X·W_Vⁱ)     // each (n, d_head)
MultiHead(X) = Concat(head₁, …, head_h) · W_O                  // (n, d_model)</code></pre>
      <ul>
        <li>Each head works in a smaller space (<code>d_head</code>), so the total compute is about the same as one big head.</li>
        <li>Heads run in parallel. In practice it's one big matmul, reshaped into h slices.</li>
        <li><strong>Concat</strong> glues the h outputs back to width <code>h · d_head = d_model</code>.</li>
        <li><strong><code>W_O</code></strong> (d_model × d_model) mixes information across heads and returns the same shape as the input, so layers can be stacked.</li>
      </ul>
      <h3>Heads specialize</h3>
      <p>Nobody assigns roles, but trained models show recognizable heads. <strong>Previous-token heads</strong> always look one step back. <strong>Duplicate-token / induction heads</strong> find an earlier copy of the current token and look at what followed it (a key mechanism behind in-context learning). Others track syntax, such as a verb attending to its subject.</p>
      <div class="tip"><strong>Shape bookkeeping, GPT-2 small:</strong> d_model = 768, h = 12 heads, d_head = 768 / 12 = <strong>64</strong>. Per layer, W_Q, W_K, W_V, W_O are each 768×768 (all heads packed together) = 4 × 589,824 ≈ <strong>2.36M</strong> attention parameters, plus biases. The weights tensor per layer is (12, n, n).</div>
    `,
    examples: [
      {
        title: 'Three heads, same sentence, different patterns (hand-designed)',
        code: `<div class="card">
  <div class="hint">Pick a head. Each shows a different (hand-designed, causal) attention pattern over the same sentence. Click a row to see where that token looks. Below, change the number of heads and watch the shapes.</div>
  <div class="row" id="tabs"></div>
  <div class="flex">
    <svg id="sv" width="300" height="270" viewBox="0 0 300 270"></svg>
    <div id="detail"></div>
  </div>
  <div class="shapes">
    GPT-2 small: d_model = 768, n = 1024 tokens. Heads h =
    <input id="h" type="range" min="0" max="7" value="5" /> <b id="hv"></b>
    <div id="shape"></div>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  button.on { background: #ffe08a; border-color: #d9a400; }
  .flex { display: flex; gap: 12px; align-items: flex-start; }
  #detail { flex: 1; font-size: 13px; background: #f8f9fa; border-radius: 6px; padding: 8px; line-height: 1.5; }
  svg text { font: 12px ui-monospace, monospace; }
  .shapes { margin-top: 6px; font-size: 13px; }
  #shape { font: 12px ui-monospace, monospace; background: #f8f9fa; border-radius: 6px; padding: 6px 8px; margin-top: 4px; }
</style>

<script>
  const TOK = ['the', 'cat', 'sat', 'on', 'the', 'mat'];
  const n = TOK.length;
  // Raw preferences -> causal -> normalized rows. Hand-designed to illustrate typical heads.
  function build(pref) {
    return TOK.map((_, i) => {
      const r = TOK.map((_, j) => (j > i ? 0 : pref(i, j)));
      const s = r.reduce((a, b) => a + b, 0);
      return r.map(x => x / s);
    });
  }
  const HEADS = [
    {
      name: 'Head 1: previous token',
      about: 'Almost all weight on the token right before. Useful for copying local patterns such as bigrams.',
      W: build((i, j) => (j === i - 1 ? 8 : j === i ? (i === 0 ? 1 : 1) : 0.2)),
    },
    {
      name: 'Head 2: same word earlier',
      about: 'Looks for an earlier copy of the current word (the second "the" finds the first). Duplicate / induction heads use this to repeat patterns seen earlier in the context.',
      W: build((i, j) => (j < i && TOK[j] === TOK[i] ? 9 : j === i ? 2 : 0.2)),
    },
    {
      name: 'Head 3: who did it? (subject)',
      about: 'Later words look back at the subject "cat". This helps with verb agreement and knowing who "sat".',
      W: build((i, j) => (j === 1 && i > 1 ? 7 : j === i ? 1.5 : 0.3)),
    },
  ];
  let head = 0;
  let row = 4;

  function draw() {
    const W = HEADS[head].W;
    const c = 40;
    let s = '';
    TOK.forEach((t, j) => (s += '<text x="' + (70 + j * c) + '" y="14" text-anchor="middle" fill="#555">' + t + '</text>'));
    W.forEach((r, i) => {
      s += '<g data-r="' + i + '" style="cursor:pointer"><text x="44" y="' + (45 + i * c) + '" text-anchor="end" fill="' +
        (i === row ? '#e8590c' : '#555') + '">' + TOK[i] + '</text>';
      r.forEach((w, j) => {
        s += '<rect x="' + (50 + j * c) + '" y="' + (20 + i * c) + '" width="' + (c - 2) + '" height="' + (c - 2) +
          '" fill="' + (j > i ? '#f1f3f5' : 'rgba(76,110,245,' + w.toFixed(2) + ')') + '" stroke="' +
          (i === row ? '#e8590c' : '#fff') + '" stroke-width="2"/>';
        if (j <= i) s += '<text x="' + (69 + j * c) + '" y="' + (44 + i * c) + '" text-anchor="middle" font-size="10" fill="' +
          (w > 0.55 ? '#fff' : '#333') + '">' + w.toFixed(2) + '</text>';
      });
      s += '</g>';
    });
    document.getElementById('sv').innerHTML = s;
    document.querySelectorAll('g[data-r]').forEach(g => (g.onclick = () => { row = +g.dataset.r; draw(); }));
    const top = W[row].indexOf(Math.max(...W[row]));
    document.getElementById('detail').innerHTML = '<b>' + HEADS[head].name + '</b><br>' + HEADS[head].about +
      '<br><br>Row <b>' + TOK[row] + ' (#' + row + ')</b> looks mostly at <b>' + TOK[top] + ' (#' + top + ')</b> with weight ' +
      W[row][top].toFixed(2) + '.<br><br>Each head outputs a (6 × d_head) matrix. The 3 outputs are concatenated and mixed by W_O.';
    document.getElementById('tabs').innerHTML = HEADS.map((h, i) =>
      '<button data-h="' + i + '" class="' + (i === head ? 'on' : '') + '">' + h.name.split(':')[0] + '</button>').join('');
    document.querySelectorAll('button[data-h]').forEach(b => (b.onclick = () => { head = +b.dataset.h; draw(); }));
  }

  const HS = [1, 2, 3, 4, 6, 12, 24, 48];
  function drawShape() {
    const h = HS[+document.getElementById('h').value];
    const d = 768;
    const dh = d / h;
    document.getElementById('hv').textContent = h;
    document.getElementById('shape').innerHTML =
      'd_head = 768 / ' + h + ' = <b>' + dh + '</b> · per-head Q, K, V: (1024 × ' + dh + ')<br>' +
      'attention weights: (' + h + ' × 1024 × 1024) = ' + (h * 1024 * 1024).toLocaleString('en-US') + ' numbers<br>' +
      'concat: (1024 × ' + h + '·' + dh + ') = (1024 × 768) → W_O (768 × 768) → (1024 × 768)<br>' +
      'attention weight params (no bias): 4 × 768² = ' + (4 * d * d).toLocaleString('en-US') + ' (same for any h!)';
  }

  document.getElementById('h').oninput = drawShape;
  draw();
  drawShape();
</script>`,
      },
      {
        title: 'Two heads on "the cat sat": run, concatenate, project',
        lang: 'js',
        code: `const tokens = ['the', 'cat', 'sat'];
const X = [
  [1, 0, 1, 0],
  [0, 2, 0, 1],
  [1, 1, 0, 1],
]; // n=3, d_model=4
const h = 2;
const d_head = 4 / h; // = 2

// Each head has its OWN W_Q, W_K, W_V (4 x 2)
const heads = [
  {
    W_Q: [[1, 0], [0, 1], [1, 0], [0, 0]],
    W_K: [[0, 1], [1, 0], [0, 1], [1, 0]],
    W_V: [[1, 0], [0, 1], [0, 0], [1, 1]],
  },
  {
    W_Q: [[0, 0], [0, 0], [1, 0], [0, 1]],
    W_K: [[0, 0], [1, 0], [0, 1], [0, 0]],
    W_V: [[0, 1], [1, 0], [1, 0], [0, 1]],
  },
];
// Output projection: (h * d_head) x d_model = 4 x 4
const W_O = [
  [1, 0, 0, 1],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [1, 0, 0, 1],
];

const shape = (M) => M.length + 'x' + M[0].length;
const transpose = (M) => M[0].map((_, j) => M.map(row => row[j]));
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
function softmax(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}
const fmtRow = (r) => r.map(x => x.toFixed(2).padStart(6)).join('');

function attention(Q, K, V) {
  const d = Q[0].length;
  const scores = matmul(Q, transpose(K)).map(r => r.map(x => x / Math.sqrt(d)));
  const weights = scores.map(softmax);
  return { weights, out: matmul(weights, V) };
}

// ① run every head independently (in a GPU these run in parallel)
const headOuts = heads.map((hd, i) => {
  const Q = matmul(X, hd.W_Q);
  const K = matmul(X, hd.W_K);
  const V = matmul(X, hd.W_V);
  const { weights, out } = attention(Q, K, V);
  console.log('head ' + (i + 1) + ': Q,K,V ' + shape(Q) + '  weights ' + shape(weights));
  weights.forEach((r, t) => console.log('   ' + tokens[t].padEnd(4) + fmtRow(r)));
  return out;
});

// ② concatenate head outputs side by side: 3x2 + 3x2 -> 3x4
const concat = X.map((_, t) => [...headOuts[0][t], ...headOuts[1][t]]);
console.log('concat ' + shape(concat));
concat.forEach((r, t) => console.log('   ' + tokens[t].padEnd(4) + fmtRow(r)));

// ③ mix the heads with W_O: 3x4 · 4x4 -> 3x4 (same shape as X)
const Y = matmul(concat, W_O);
console.log('output = concat·W_O ' + shape(Y));
Y.forEach((r, t) => console.log('   ' + tokens[t].padEnd(4) + fmtRow(r)));`,
        explain: `
          <details>
            <summary>Step by step: shapes and numbers (matches the console)</summary>
            <table>
              <tr><th>stage</th><th>shape</th><th>what you see</th></tr>
              <tr><td>X</td><td>3×4</td><td>same embeddings as before</td></tr>
              <tr><td>head 1 weights</td><td>3×3</td><td>the → cat 0.80. This is exactly the previous lesson's head (rounded to 2 decimals)</td></tr>
              <tr><td>head 2 weights</td><td>3×3</td><td>the → cat 0.58. Rows "cat" and "sat" are both 0.50, 0.25, 0.25. It's a different pattern from different W's</td></tr>
              <tr><td>concat</td><td>3×(2+2) = 3×4</td><td>row "the" = [1.19, 2.77 | 1.58, 1.28]: head 1's output, then head 2's</td></tr>
              <tr><td>concat · W_O</td><td>3×4</td><td>row "the" = [2.48, 2.77, 1.58, 2.48]. W_O's first and last columns add head-1 dim 0 and head-2 dim 1 (1.19 + 1.28 ≈ 2.48), mixing the heads</td></tr>
            </table>
            <p>The output has the same shape as X (3×4). That's why attention blocks can be stacked, and why a residual connection <code>X + MultiHead(X)</code> (next section) works.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">heads.map((hd) =&gt; attention(X·hd.W_Q, X·hd.W_K, X·hd.W_V))  // ① independent heads
[...headOuts[0][t], ...headOuts[1][t]]                        // ② concat per token
matmul(concat, W_O)                                           // ③ mix back to d_model</code></pre>
            <ol>
              <li><strong>①</strong> Same X, different projections, so each head gets a different view of the sentence. No head sees another head's weights.</li>
              <li><strong>②</strong> Concatenation is along the feature axis: width 2 + 2 = 4 = d_model.</li>
              <li><strong>③</strong> Without W_O, head 1's info would stay in dims 0–1 and head 2's in dims 2–3. W_O lets later layers combine them freely.</li>
            </ol>
            <div class="tip">Real code doesn't loop over heads. It computes one big <code>X·W_Q</code> of width d_model, then reshapes <code>(n, d_model) → (h, n, d_head)</code> and runs batched attention. See the PyTorch reference.</div>
          </details>
        `,
      },
      {
        title: 'Reference: multi-head attention with reshapes (PyTorch 2.x)',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class MultiHeadSelfAttention(nn.Module):
    def __init__(self, d_model=768, n_heads=12):
        super().__init__()
        self.h, self.d_head = n_heads, d_model // n_heads
        self.qkv = nn.Linear(d_model, 3 * d_model)   # W_Q, W_K, W_V for all heads at once
        self.out = nn.Linear(d_model, d_model)       # W_O

    def forward(self, x):                            # x: (B, n, d_model)
        B, n, d = x.shape
        q, k, v = self.qkv(x).split(d, dim=-1)       # each (B, n, d_model)
        # (B, n, d_model) -> (B, h, n, d_head): split the features into heads
        q, k, v = (t.view(B, n, self.h, self.d_head).transpose(1, 2) for t in (q, k, v))
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)  # (B, h, n, d_head)
        y = y.transpose(1, 2).reshape(B, n, d)       # concat heads -> (B, n, d_model)
        return self.out(y)

x = torch.randn(2, 10, 768)
print(MultiHeadSelfAttention()(x).shape)             # torch.Size([2, 10, 768])`,
      },
    ],
    quiz: [
      {
        q: 'GPT-2 small has d_model = 768 and 12 heads. What is d_head?',
        options: ['12', '64', '768', '9216'],
        answer: 1,
        why: '768 / 12 = 64.',
      },
      {
        q: 'What is W_O for?',
        options: [
          'It computes the attention weights',
          'It projects the concatenated head outputs back to d_model and mixes information across heads',
          'It masks future tokens',
          'It is the embedding table',
        ],
        answer: 1,
        why: 'Concat gives (n, h·d_head). W_O (d_model × d_model) mixes the heads and keeps the shape stackable.',
      },
      {
        q: 'Why use several small heads instead of one big one?',
        options: [
          'Fewer parameters overall',
          'Each head can attend to different things (e.g. previous token vs subject) at the same time',
          'Softmax only works on small vectors',
          'It removes the need for a causal mask',
        ],
        answer: 1,
        why: 'One softmax row is one distribution. Several heads give several independent distributions, so different relations can be tracked at once for about the same compute.',
      },
      {
        q: 'With h heads and sequence length n, the attention weights of one layer have shape…',
        options: ['(n, n)', '(h, n, n)', '(h, d_head)', '(n, d_model)'],
        answer: 1,
        why: 'Each head has its own n × n weight matrix.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write <code>mhaInfo(d_model, h, n)</code>, which prints d_head, the per-head Q shape, the attention-weights shape, and the parameter count of W_Q, W_K, W_V, W_O <em>including biases</em> (<code>4·d² + 4·d</code>). Expected:</p>
<pre><code>d_model=768 h=12: d_head=64, Q/head=(1024x64), weights=(12x1024x1024), params=2,362,368
d_model=12288 h=96: d_head=128, Q/head=(2048x128), weights=(96x2048x2048), params=604,028,928</code></pre>
<p>(The second line is GPT-3 175B's attention per layer.)</p>`,
      starter: `function mhaInfo(d_model, h, n) {
  const d_head = 0; // TODO
  const params = 0; // TODO: 4 weight matrices d_model x d_model + 4 bias vectors
  console.log(
    'd_model=' + d_model + ' h=' + h + ': d_head=' + d_head +
    ', Q/head=(' + n + 'x' + d_head + ')' +
    ', weights=(' + h + 'x' + n + 'x' + n + ')' +
    ', params=' + params.toLocaleString('en-US')
  );
}

mhaInfo(768, 12, 1024);
mhaInfo(12288, 96, 2048);`,
      hint: 'd_head = d_model / h; params = 4 * d_model * d_model + 4 * d_model.',
      solution: `function mhaInfo(d_model, h, n) {
  const d_head = d_model / h;
  const params = 4 * d_model * d_model + 4 * d_model;
  console.log(
    'd_model=' + d_model + ' h=' + h + ': d_head=' + d_head +
    ', Q/head=(' + n + 'x' + d_head + ')' +
    ', weights=(' + h + 'x' + n + 'x' + n + ')' +
    ', params=' + params.toLocaleString('en-US')
  );
}

mhaInfo(768, 12, 1024);
mhaInfo(12288, 96, 2048);`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'self-vs-cross',
    section: 'Attention',
    title: 'Self-Attention vs Cross-Attention',
    explain: `
      <p>The attention formula doesn't care where Q, K and V come from. That gives two flavours:</p>
      <ul>
        <li><strong>Self-attention</strong>: Q, K and V are all computed from the <em>same</em> sequence X. Every token looks at the other tokens of its own sequence. The weights matrix is <code>n × n</code>. This is what everything so far has been, and it's the only kind in decoder-only LLMs like GPT and Llama.</li>
        <li><strong>Cross-attention</strong>: the <strong>queries come from one sequence</strong> (e.g. the decoder's output so far), while the <strong>keys and values come from another</strong> (e.g. the encoder's output). The weights matrix is <code>m × n</code>: m target tokens by n source tokens.</li>
      </ul>
      <pre><code>self :  Q = X·W_Q,   K = X·W_K,   V = X·W_V
cross:  Q = Y·W_Q,   K = Z·W_K,   V = Z·W_V     // Y = decoder states, Z = encoder output</code></pre>
      <p>Cross-attention is the Transformer version of Bahdanau's decoder "looking back" at the source sentence (see Where Attention Came From). The original 2017 Transformer and <strong>T5</strong> are encoder–decoder models. Each decoder layer has (1) causal self-attention over the target so far, then (2) cross-attention into the encoder output. Cross-attention is also how many <strong>multimodal</strong> models connect modalities, for example text queries attending to image-patch features (Flamingo), or an image generator's pixels attending to the text prompt (Stable Diffusion).</p>

      <h3>The cost: O(n²)</h3>
      <p>Self-attention compares every token with every token, so the score matrix has <code>n²</code> entries per head per layer. Double the context and the attention work quadruples. At 1k tokens it's cheap. At 128k tokens a single head's score matrix has 17 billion entries. Tricks like <strong>FlashAttention</strong> avoid ever storing the full matrix in memory (computing it in tiles), but the compute is still quadratic. This is why long context is expensive, and why researchers keep exploring sparse, sliding-window and linear-attention variants.</p>
      <div class="tip">The rest of a Transformer (the MLPs, the projections) scales <em>linearly</em> in n. For short contexts those usually dominate the cost. The n² term takes over as context grows.</div>
    `,
    examples: [
      {
        title: 'Where do Q, K, V come from? Self vs cross',
        code: `<div class="card">
  <div class="hint">Switch between the two modes. Arrows show which sequence feeds the queries (orange) and which feeds the keys and values (blue). The weight-matrix shape is shown on the right.</div>
  <div class="row">
    <label><input type="radio" name="m" value="self" checked /> self-attention (decoder, causal)</label>
    <label><input type="radio" name="m" value="cross" /> cross-attention (decoder → encoder)</label>
  </div>
  <svg id="sv" width="640" height="250" viewBox="0 0 640 250"></svg>
  <div id="msg"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  svg text { font: 13px system-ui, sans-serif; }
  #msg { min-height: 36px; }
</style>

<script>
  const SRC = ['the', 'cat', 'sat'];
  const TGT = ['le', 'chat', 'assis'];

  function box(x, y, label, fill, stroke) {
    return '<rect x="' + x + '" y="' + y + '" width="70" height="30" rx="6" fill="' + fill + '" stroke="' + stroke +
      '"/><text x="' + (x + 35) + '" y="' + (y + 20) + '" text-anchor="middle">' + label + '</text>';
  }
  function grid(x, y, rows, cols, rl, cl, maskUpper) {
    let s = '';
    cl.forEach((c, j) => (s += '<text x="' + (x + 16 + j * 34) + '" y="' + (y - 4) + '" font-size="10" text-anchor="middle">' + c + '</text>'));
    for (let i = 0; i < rows; i++) {
      s += '<text x="' + (x - 4) + '" y="' + (y + 20 + i * 34) + '" font-size="10" text-anchor="end">' + rl[i] + '</text>';
      for (let j = 0; j < cols; j++) {
        const off = maskUpper && j > i;
        s += '<rect x="' + (x + j * 34) + '" y="' + (y + i * 34) + '" width="32" height="32" fill="' +
          (off ? '#f1f3f5' : 'rgba(76,110,245,0.45)') + '"/>';
      }
    }
    return s;
  }

  function draw() {
    const mode = document.querySelector('input[name=m]:checked').value;
    let s = '<text x="10" y="40" fill="#555">encoder</text><text x="10" y="200" fill="#555">decoder</text>';
    SRC.forEach((w, j) => (s += box(90 + j * 90, 20, w, '#e7f5ff', '#74c0fc')));
    TGT.forEach((w, i) => (s += box(90 + i * 90, 180, w, '#fff4e6', '#ffa94d')));
    const arrow = (x1, y1, x2, y2, col) =>
      '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + col + '" stroke-width="1.6" opacity="0.8"/>';
    if (mode === 'self') {
      // chat (i=1) looks at le and itself
      s += '<path d="M125,180 Q170,120 215,180" fill="none" stroke="#1971c2" stroke-width="2"/>';
      s += '<path d="M205,180 C190,145 240,145 225,180" fill="none" stroke="#1971c2" stroke-width="2"/>';
      s += '<text x="160" y="135" fill="#1971c2" font-size="12">K,V from the SAME sequence</text>';
      s += '<text x="215" y="228" fill="#e8590c" font-size="12" text-anchor="middle">Q from "chat"</text>';
      s += '<text x="420" y="50" font-size="12" fill="#555">weights 3×3 (target × target)</text>';
      s += grid(500, 80, 3, 3, TGT, TGT, true);
    } else {
      SRC.forEach((_, j) => (s += arrow(125 + j * 90, 50, 215, 180, '#1971c2')));
      s += '<text x="330" y="120" fill="#1971c2" font-size="12">K,V from the ENCODER</text>';
      s += '<text x="215" y="228" fill="#e8590c" font-size="12" text-anchor="middle">Q from decoder "chat"</text>';
      s += '<text x="420" y="50" font-size="12" fill="#555">weights 3×3 (target × source)</text>';
      s += grid(500, 80, 3, 3, TGT, SRC, false);
    }
    document.getElementById('sv').innerHTML = s;
    document.getElementById('msg').innerHTML = mode === 'self'
      ? 'Self-attention: "chat" attends to "le" and itself (causal, so not "assis"). Used in every layer of GPT-style models.'
      : 'Cross-attention: "chat" asks the English sentence "which source word matters for me?". No causal mask here, because the whole source is known. Rows = target tokens, columns = source tokens, and the counts can differ.';
  }

  document.querySelectorAll('input[name=m]').forEach(r => (r.onchange = draw));
  draw();
</script>`,
      },
      {
        title: 'The n² cost: slide the sequence length',
        code: `<div class="card">
  <div class="hint">Drag <b>n</b> (tokens). Every cell is one query–key score that must be computed. Doubling n quadruples the cells. The table shows real context lengths.</div>
  <div class="row">
    n = <b id="nv"></b> <input id="n" type="range" min="1" max="48" value="8" />
    <span id="cnt"></span>
  </div>
  <div class="flex">
    <canvas id="cv" width="260" height="260"></canvas>
    <table id="tbl"></table>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  #n { width: 260px; vertical-align: middle; }
  .flex { display: flex; gap: 16px; align-items: flex-start; margin-top: 8px; }
  canvas { border: 1px solid #e0e3ee; border-radius: 4px; }
  table { border-collapse: collapse; font: 12px ui-monospace, monospace; }
  td, th { border-bottom: 1px solid #eee; padding: 3px 6px; text-align: right; }
  th { color: #555; font-weight: 600; }
</style>

<script>
  const cv = document.getElementById('cv');
  const ctx = cv.getContext('2d');

  function draw() {
    const n = +document.getElementById('n').value;
    document.getElementById('nv').textContent = n;
    document.getElementById('cnt').innerHTML = ' → <b>' + (n * n) + '</b> scores' +
      (n > 1 ? ' (n=' + Math.floor(n / 2) + ' had ' + Math.floor(n / 2) ** 2 + ')' : '');
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 260, 260);
    const c = 260 / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ctx.fillStyle = j > i ? '#dbe4ff' : '#4c6ef5';
        ctx.fillRect(j * c + 0.5, i * c + 0.5, Math.max(1, c - 1), Math.max(1, c - 1));
      }
    }
  }

  // Real lengths: entries per head per layer, and fp16 memory if the matrix were stored
  const rows = [1024, 8192, 32768, 131072].map(n => {
    const e = n * n;
    const gb = (e * 2) / 1e9;
    return '<tr><td>' + n.toLocaleString('en-US') + '</td><td>' + e.toExponential(2) + '</td><td>' +
      (gb < 1 ? (gb * 1000).toFixed(1) + ' MB' : gb.toFixed(1) + ' GB') + '</td></tr>';
  });
  document.getElementById('tbl').innerHTML =
    '<tr><th>n tokens</th><th>n² scores</th><th>fp16, 1 head</th></tr>' + rows.join('') +
    '<tr><td colspan="3" style="text-align:left;color:#555;white-space:normal;width:260px">Per head, per layer. ' +
    'Light cells = masked in a causal model, which still costs about half. FlashAttention avoids storing this matrix, but the compute is still n².</td></tr>';

  document.getElementById('n').oninput = draw;
  draw();
</script>`,
      },
      {
        title: 'Cross-attention in numbers: 2 French queries over 3 English keys',
        lang: 'js',
        code: `// Encoder side: the English source, already encoded (3 tokens, d=2)
const src = ['the', 'cat', 'sat'];
const encoderOut = [
  [1, 0],
  [0, 2],
  [1, 1],
];
// Decoder side: the French output so far (2 tokens, d=2)
const tgt = ['le', 'chat'];
const decoderState = [
  [2, -1],
  [0, 2],
];

// Keep projections as identity so the numbers stay readable
const Q = decoderState; // ① queries come from the DECODER
const K = encoderOut; // ② keys ...
const V = encoderOut; //    ... and values come from the ENCODER

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

const d_k = 2;
console.log('weights shape: ' + Q.length + ' x ' + K.length + ' (target x source)');
Q.forEach((q, i) => {
  const w = softmax(K.map(k => dot(q, k) / Math.sqrt(d_k))); // ③ one row per decoder token
  const out = [0, 1].map(j => w.reduce((s, wi, t) => s + wi * V[t][j], 0));
  console.log(
    tgt[i].padEnd(5) + src.map((s, t) => s + ':' + w[t].toFixed(2)).join('  ') +
    '  -> [' + out.map(x => x.toFixed(2)).join(', ') + ']'
  );
});`,
      },
    ],
    quiz: [
      {
        q: 'In cross-attention, where do the queries and the keys/values come from?',
        options: [
          'All from the encoder',
          'Queries from the decoder sequence, keys and values from the encoder output',
          'Queries from the encoder, keys from the decoder, values from the embeddings',
          'All from the decoder',
        ],
        answer: 1,
        why: 'The decoder asks the questions (Q), and the source sequence provides what can be found (K) and retrieved (V).',
      },
      {
        q: 'A decoder has 5 target tokens and cross-attends to 12 source tokens. What is the shape of the cross-attention weights (one head)?',
        options: ['5 × 5', '12 × 12', '5 × 12', '12 × 5'],
        answer: 2,
        why: 'One row per query (5 target tokens) and one column per key (12 source tokens).',
      },
      {
        q: 'Which model family uses only self-attention (no cross-attention)?',
        options: ['T5', 'The original 2017 Transformer', 'Decoder-only LLMs like GPT and Llama', 'Encoder–decoder translation models'],
        answer: 2,
        why: 'Decoder-only models have a single sequence (prompt + generated text) and use causal self-attention in every layer.',
      },
      {
        q: 'Going from 4k to 16k tokens multiplies the self-attention score computations by about…',
        options: ['4×', '8×', '16×', '2×'],
        answer: 2,
        why: 'n² scaling: (16k/4k)² = 4² = 16.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>If the full attention matrix were stored in fp16 (2 bytes per number), how much memory would <em>one layer</em> need across all heads? Write <code>attnMemoryGB(n, heads)</code> = <code>n² · heads · 2 / 1e9</code>. Expected:</p>
<pre><code>n=1024 heads=12 -> 0.025 GB
n=8192 heads=32 -> 4.295 GB
n=131072 heads=64 -> 2199.023 GB</code></pre>
<p>The last line is why FlashAttention-style kernels, which never store the matrix, are essential for long context.</p>`,
      starter: `function attnMemoryGB(n, heads) {
  // TODO: n * n scores per head, 2 bytes each, all heads, in GB (1e9 bytes)
  return 0;
}

for (const [n, h] of [[1024, 12], [8192, 32], [131072, 64]]) {
  console.log('n=' + n + ' heads=' + h + ' -> ' + attnMemoryGB(n, h).toFixed(3) + ' GB');
}`,
      hint: 'return (n * n * heads * 2) / 1e9;',
      solution: `function attnMemoryGB(n, heads) {
  return (n * n * heads * 2) / 1e9;
}

for (const [n, h] of [[1024, 12], [8192, 32], [131072, 64]]) {
  console.log('n=' + n + ' heads=' + h + ' -> ' + attnMemoryGB(n, h).toFixed(3) + ' GB');
}`,
    },
  },
);
