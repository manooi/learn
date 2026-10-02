window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── positional-encoding
  {
    id: 'positional-encoding',
    section: 'The Transformer Block',
    title: 'Positional Information',
    explain: `
      <p>Here's something surprising about attention: <strong>it has no idea what order the tokens are in.</strong> Each token's output is a weighted sum over <em>all</em> tokens, and the weights come from dot products <code>q·k</code>. Nothing in that formula mentions position. Shuffle the input tokens and you get exactly the same outputs, just shuffled the same way. Mathematicians call this <em>permutation equivariance</em>.</p>
      <p>For language that's a disaster. "dog bites man" and "man bites dog" hold the same bag of tokens. An RNN gets order for free because it reads tokens one by one. A transformer reads them all in parallel, so we have to <strong>inject position information</strong> ourselves.</p>
      <div class="tip">The causal mask gives a decoder <em>some</em> weak sense of order, since token 5 sees 5 tokens and token 2 sees 2. Models trained with no positional encoding at all ("NoPE") can partly exploit this. But every mainstream LLM adds explicit positions.</div>

      <h3>1. Sinusoidal encoding (the original 2017 paper)</h3>
      <p>"Attention Is All You Need" <strong>adds</strong> a fixed vector <code>PE(pos)</code> to each token embedding before the first block:</p>
      <pre><code>PE[pos][2i]   = sin(pos / 10000^(2i/d_model))
PE[pos][2i+1] = cos(pos / 10000^(2i/d_model))</code></pre>
      <p>Each pair of dimensions is a clock hand turning at its own speed. The first pairs spin fast (wavelength about 6 positions) and the last pairs crawl (wavelength up to about 63,000 positions). Together they work like a binary counter made of smooth waves, so every position gets a unique fingerprint. And because <code>sin(a+b)</code> expands into sines and cosines of <code>a</code> and <code>b</code>, shifting by k positions is a fixed <em>linear</em> transformation. In principle that makes relative offsets easy for the model to learn. There's nothing to train.</p>

      <h3>2. Learned absolute embeddings (GPT-2, BERT)</h3>
      <p>The simplest option: a second embedding table <code>wpe</code> of shape <code>[max_positions, d_model]</code>, learned like any other weight. The model adds <code>wte[token] + wpe[pos]</code>. GPT-2 uses 1024 positions. The downside is a hard limit: position 1025 has no row in the table, and the model has only seen each position as an <em>absolute</em> slot.</p>

      <h3>3. RoPE: rotary position embedding (Llama, Qwen, Mistral, …)</h3>
      <p>RoPE (Su et al., 2021) doesn't add anything to the embeddings. Instead, inside <em>every</em> attention layer, it <strong>rotates</strong> the query and key vectors by an angle proportional to their position. The vector is split into 2-D pairs, and pair <code>i</code> of the token at position <code>m</code> is rotated by <code>m·θ_i</code>, where <code>θ_i = base^(−2i/d_head)</code>. The original base is 10,000. Some newer models use a much larger base to handle longer contexts.</p>
      <p>Here's why that's clever. The dot product of two vectors depends only on their lengths and the angle <em>between</em> them. Rotate <code>q</code> by <code>mθ</code> and <code>k</code> by <code>nθ</code>, and the angle between them changes by <code>(m−n)θ</code>. So:</p>
      <pre><code>score(q at m, k at n) = f(q, k, m − n)      ← only the OFFSET matters</code></pre>
      <p>The model gets <strong>relative</strong> position for free: "the token 3 to my left" looks the same at position 10 as at position 10,000. Values <code>V</code> are not rotated. Nearly all modern open LLMs (Llama, Qwen, Mistral, Gemma, DeepSeek, …) use RoPE, often with scaling tricks to stretch the context window (see the Modern Architecture Tweaks lesson).</p>
      <pre><code class="language-python"># RoPE in PyTorch (interleaved pairs). x: [T, d] with d even, pos: [T]
def rope(x, pos, base=10000.0):
    d = x.shape[-1]
    inv_freq = base ** (-torch.arange(0, d, 2) / d)    # θ_i, shape [d/2]
    ang = pos[:, None] * inv_freq[None, :]             # m·θ_i, shape [T, d/2]
    cos, sin = ang.cos(), ang.sin()
    x1, x2 = x[..., 0::2], x[..., 1::2]                # the 2-D pairs
    out = torch.stack([x1 * cos - x2 * sin, x1 * sin + x2 * cos], dim=-1)
    return out.flatten(-2)                             # back to [T, d]

q = rope(q, pos)   # applied to queries and keys, NOT values
k = rope(k, pos)</code></pre>
      <div class="warn">Hugging Face's Llama code pairs dimension <code>i</code> with <code>i + d/2</code> ("rotate half") instead of neighbours <code>(2i, 2i+1)</code>. Both are valid RoPE, but the weights only work with the pairing they were trained with. Mixing them up is a classic porting bug.</div>
      <table>
        <tr><th>Method</th><th>Where</th><th>Absolute / relative</th><th>Used by</th></tr>
        <tr><td>Sinusoidal</td><td>added to input embeddings</td><td>absolute (relative is learnable)</td><td>original Transformer (2017)</td></tr>
        <tr><td>Learned</td><td>added to input embeddings</td><td>absolute, fixed max length</td><td>GPT-2, BERT</td></tr>
        <tr><td>RoPE</td><td>rotates Q, K in every layer</td><td>relative (via the dot product)</td><td>Llama, Qwen, Mistral, most modern LLMs</td></tr>
        <tr><td>ALiBi</td><td>adds a distance penalty to scores</td><td>relative</td><td>BLOOM, MPT</td></tr>
      </table>
    `,
    examples: [
      {
        title: 'Sinusoidal encoding heatmap',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .row { display:flex; gap:14px; align-items:center; flex-wrap:wrap; margin:6px 0; }
  canvas { border:1px solid #ccc; border-radius:4px; display:block; }
  .read { font-family:ui-monospace, monospace; font-size:12px; min-height:18px; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Each column is one position's encoding vector (red = +1, blue = −1). Hover a cell to read its value; drag <b>compare with position</b> to see which positions look similar to it.</div>
  <div class="row">
    <label>d_model <input id="d" type="range" min="8" max="64" step="8" value="32"> <b id="dv">32</b></label>
    <label>compare with position <input id="p" type="range" min="0" max="63" value="20"> <b id="pv">20</b></label>
  </div>
  <canvas id="hm" width="640" height="200"></canvas>
  <div class="read" id="read">Hover the heatmap: rows = dimension i, columns = position.</div>
  <canvas id="sim" width="640" height="110"></canvas>
  <div class="muted">Bottom: dot product PE(p) · PE(pos) for every pos (normalized). Nearby positions look similar; far ones less so.</div>
</div>
<script>
  const hm = document.getElementById('hm');
  const sim = document.getElementById('sim');
  const ctx = hm.getContext('2d');
  const sctx = sim.getContext('2d');
  const N = 64;

  function pe(pos, i, d) {
    const pair = Math.floor(i / 2);
    const angle = pos / Math.pow(10000, (2 * pair) / d);
    return i % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
  }

  function color(v) {
    // -1 → blue, 0 → white, +1 → red
    const t = Math.abs(v);
    const r = v > 0 ? 255 : Math.round(255 * (1 - t));
    const b = v < 0 ? 255 : Math.round(255 * (1 - t));
    const g = Math.round(255 * (1 - t));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function draw() {
    const d = +document.getElementById('d').value;
    const p = +document.getElementById('p').value;
    document.getElementById('dv').textContent = d;
    document.getElementById('pv').textContent = p;
    const cw = hm.width / N;
    const ch = hm.height / d;
    for (let pos = 0; pos < N; pos++) {
      for (let i = 0; i < d; i++) {
        ctx.fillStyle = color(pe(pos, i, d));
        ctx.fillRect(pos * cw, i * ch, Math.ceil(cw), Math.ceil(ch));
      }
    }
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 2;
    ctx.strokeRect(p * cw, 0, cw, hm.height);

    const dots = [];
    for (let pos = 0; pos < N; pos++) {
      let s = 0;
      for (let i = 0; i < d; i++) s += pe(p, i, d) * pe(pos, i, d);
      dots.push(s / (d / 2));
    }
    sctx.clearRect(0, 0, sim.width, sim.height);
    sctx.strokeStyle = '#ddd';
    sctx.beginPath();
    sctx.moveTo(0, sim.height / 2);
    sctx.lineTo(sim.width, sim.height / 2);
    sctx.stroke();
    sctx.strokeStyle = '#c0392b';
    sctx.lineWidth = 2;
    sctx.beginPath();
    dots.forEach((v, pos) => {
      const x = pos * cw + cw / 2;
      const y = sim.height / 2 - v * (sim.height / 2 - 6);
      if (pos === 0) sctx.moveTo(x, y);
      else sctx.lineTo(x, y);
    });
    sctx.stroke();
    sctx.fillStyle = '#111';
    sctx.fillRect(p * cw + cw / 2 - 1, 0, 2, sim.height);
  }

  hm.addEventListener('mousemove', e => {
    const d = +document.getElementById('d').value;
    const rect = hm.getBoundingClientRect();
    const pos = Math.floor(((e.clientX - rect.left) / rect.width) * N);
    const i = Math.floor(((e.clientY - rect.top) / rect.height) * d);
    if (pos < 0 || pos >= N || i < 0 || i >= d) return;
    const pair = Math.floor(i / 2);
    const wl = 2 * Math.PI * Math.pow(10000, (2 * pair) / d);
    document.getElementById('read').textContent =
      'pos ' + pos + ', dim ' + i + ' (' + (i % 2 ? 'cos' : 'sin') + '): ' +
      pe(pos, i, d).toFixed(3) + '   wavelength ≈ ' + wl.toFixed(1) + ' positions';
  });
  document.getElementById('d').oninput = draw;
  document.getElementById('p').oninput = draw;
  draw();
</script>`,
      },
      {
        title: 'Order-blind attention, then RoPE fixes it',
        lang: 'js',
        code: `// Attention without positions is order-blind. RoPE fixes that.
const EMB = {
  the: [1.0, 0.0],
  cat: [0.6, 0.8],
  sat: [0.0, 1.0],
};

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

// ① Plain self-attention (Q = K = V = embedding, no mask, no positions)
function attend(words) {
  const X = words.map(w => EMB[w]);
  return X.map(q => {
    const w = softmax(X.map(k => dot(q, k) / Math.sqrt(2)));
    return [0, 1].map(d => w.reduce((s, wi, j) => s + wi * X[j][d], 0));
  });
}

const fmt = v => '[' + v.map(x => x.toFixed(3)).join(', ') + ']';

const a = ['the', 'cat', 'sat'];
const b = ['cat', 'sat', 'the'];
const outA = attend(a);
const outB = attend(b);
console.log('--- no positional info ---');
a.forEach((w, i) => console.log(\`order A  \${w} ->\`, fmt(outA[i])));
b.forEach((w, i) => console.log(\`order B  \${w} ->\`, fmt(outB[i])));

// ② RoPE in 2-D: rotate a vector by angle = position × theta
const THETA = 0.5; // radians per position
function rope(v, pos) {
  const c = Math.cos(pos * THETA);
  const s = Math.sin(pos * THETA);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

// Score of query word at position m against key word at position n
const score = (qw, m, kw, n) => dot(rope(EMB[qw], m), rope(EMB[kw], n));

console.log('--- with RoPE: score(cat -> the) ---');
console.log('no rotation           :', dot(EMB.cat, EMB.the).toFixed(3));
console.log('order A (cat@1, the@0):', score('cat', 1, 'the', 0).toFixed(3));
console.log('order B (cat@0, the@2):', score('cat', 0, 'the', 2).toFixed(3));

// ③ Only the offset m - n matters
console.log('--- same offset, different absolute positions ---');
for (const [m, n] of [[1, 0], [5, 4], [10, 9], [3, 0]]) {
  console.log(\`cat@\${m}, the@\${n}  offset \${m - n}  score \${score('cat', m, 'the', n).toFixed(3)}\`);
}`,
        explain: `
          <details>
            <summary>The problem: shuffling the tokens just shuffles the outputs</summary>
            <p>Part ① runs plain self-attention (Q = K = V = the embedding, no positions) on two orderings of the same three words.</p>
            <table>
              <tr><th>Word</th><th>Order A: the cat sat</th><th>Order B: cat sat the</th></tr>
              <tr><td>the</td><td><code>[0.646, 0.488]</code> (pos 0)</td><td><code>[0.646, 0.488]</code> (pos 2)</td></tr>
              <tr><td>cat</td><td><code>[0.516, 0.636]</code> (pos 1)</td><td><code>[0.516, 0.636]</code> (pos 0)</td></tr>
              <tr><td>sat</td><td><code>[0.429, 0.718]</code> (pos 2)</td><td><code>[0.429, 0.718]</code> (pos 1)</td></tr>
            </table>
            <p>Every word's output is identical in both orders. The model literally cannot tell "the cat sat" from "cat sat the". The reason: the weights for "cat" are <code>softmax(cat·the, cat·cat, cat·sat)</code>, and that set of numbers doesn't depend on where the words sit.</p>
          </details>
          <details>
            <summary>Step by step: what RoPE does to the score <code>cat → the</code></summary>
            <p>With θ = 0.5 rad per position, each vector is rotated by <code>position × 0.5</code>. "cat" = <code>[0.6, 0.8]</code> points at angle 0.927 rad; "the" = <code>[1, 0]</code> points at 0. Both have length 1, so the score is <code>cos(angle between them)</code>.</p>
            <table>
              <tr><th>Case</th><th>cat angle</th><th>the angle</th><th>gap</th><th>console</th></tr>
              <tr><td>no rotation</td><td>0.927</td><td>0</td><td>0.927</td><td><code>0.600</code></td></tr>
              <tr><td>order A: cat@1, the@0</td><td>0.927 + 0.5 = 1.427</td><td>0</td><td>1.427</td><td><code>0.143</code></td></tr>
              <tr><td>order B: cat@0, the@2</td><td>0.927</td><td>1.0</td><td>−0.073</td><td><code>0.997</code></td></tr>
              <tr><td>cat@5, the@4</td><td>0.927 + 2.5</td><td>2.0</td><td>1.427</td><td><code>0.143</code></td></tr>
              <tr><td>cat@10, the@9</td><td>0.927 + 5.0</td><td>4.5</td><td>1.427</td><td><code>0.143</code></td></tr>
              <tr><td>cat@3, the@0</td><td>0.927 + 1.5</td><td>0</td><td>2.427</td><td><code>-0.756</code></td></tr>
            </table>
            <p>Two results stand out. Orders A and B now give <strong>different</strong> scores (0.143 vs 0.997), so order matters again. And every pair with offset 1 scores exactly 0.143, whether it sits at positions 1/0, 5/4 or 10/9. The absolute position cancels out.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>return X.map(q =&gt; { ... softmax(X.map(k =&gt; dot(q, k) / Math.sqrt(2))) ... });  // ①
const c = Math.cos(pos * THETA);                                               // ②
return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
const score = (qw, m, kw, n) =&gt; dot(rope(EMB[qw], m), rope(EMB[kw], n));       // ③</code></pre>
            <ol>
              <li><strong>①</strong> Plain attention. Its only inputs are the vectors, never their indices, so it's order-blind.</li>
              <li><strong>②</strong> A standard 2-D rotation matrix <code>[[c, −s], [s, c]]</code> applied to the vector. Real RoPE does this to every pair of dimensions, each with its own θ_i.</li>
              <li><strong>③</strong> Rotate the query by its position and the key by its own, then dot them. Because <code>R(mθ)ᵀR(nθ) = R((n−m)θ)</code>, only <code>m − n</code> survives.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>THETA = 0</code>. RoPE turns off and every score goes back to 0.600: order-blind again.</li>
              <li>Add <code>[20, 19]</code> to the offset loop. It still prints 0.143.</li>
              <li>With θ = 0.5 the angle wraps around after about 12.6 positions (2π / 0.5), so offsets 1 and 13.57 would look alike. That's why real RoPE mixes many frequencies, some very slow, just like the sinusoidal table.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'RoPE: rotate q and k, the score depends on the offset',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .wrap { display:flex; gap:16px; align-items:flex-start; flex-wrap:wrap; }
  .ctl label { display:block; margin:6px 0; }
  .ctl input[type=range] { width:180px; vertical-align:middle; }
  .out { font-family:ui-monospace, monospace; font-size:13px; margin-top:8px; line-height:1.6; }
  .big { font-size:18px; font-weight:bold; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Drag the <b>m</b> and <b>n</b> sliders to place the query and key. Click <b>shift both +1</b>: both arrows rotate, the offset m − n stays, and the score doesn't change.</div>
  <div class="wrap">
    <svg id="svg" width="300" height="300" viewBox="-150 -150 300 300"></svg>
    <div class="ctl">
      <label>query position m <input id="m" type="range" min="0" max="12" value="3"> <b id="mv"></b></label>
      <label>key position n <input id="n" type="range" min="0" max="12" value="1"> <b id="nv"></b></label>
      <label>θ per position <input id="th" type="range" min="0.1" max="1" step="0.05" value="0.4"> <b id="thv"></b> rad</label>
      <button id="shift">shift both +1</button>
      <button id="reset">reset</button>
      <div class="out" id="out"></div>
    </div>
  </div>
</div>
<script>
  const q0 = [0.9, 0.3];
  const k0 = [0.5, 0.8];
  const svg = document.getElementById('svg');
  const S = 120;
  const $ = id => document.getElementById(id);

  const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];

  function arrow(v, color, label) {
    const x = v[0] * S;
    const y = -v[1] * S;
    return '<line x1="0" y1="0" x2="' + x + '" y2="' + y + '" stroke="' + color +
      '" stroke-width="3" marker-end="url(#h' + color.slice(1) + ')"/>' +
      '<text x="' + (x * 1.12) + '" y="' + (y * 1.12 + 4) + '" fill="' + color +
      '" font-size="13" text-anchor="middle">' + label + '</text>';
  }

  function marker(color) {
    return '<marker id="h' + color.slice(1) + '" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">' +
      '<path d="M0,0 L8,4 L0,8 z" fill="' + color + '"/></marker>';
  }

  function draw() {
    const m = +$('m').value;
    const n = +$('n').value;
    const th = +$('th').value;
    $('mv').textContent = m;
    $('nv').textContent = n;
    $('thv').textContent = th.toFixed(2);
    const q = rot(q0, m * th);
    const k = rot(k0, n * th);
    const dot = q[0] * k[0] + q[1] * k[1];
    let html = '<defs>' + marker('#2e6fd8') + marker('#d35400') + '</defs>';
    html += '<circle r="' + S + '" fill="none" stroke="#ddd"/>';
    html += '<line x1="-140" y1="0" x2="140" y2="0" stroke="#eee"/><line x1="0" y1="-140" x2="0" y2="140" stroke="#eee"/>';
    html += arrow(q0, '#9bb7e8', 'q (raw)').replace(/marker-end="[^"]*"/, 'stroke-dasharray="4 3"');
    html += arrow(k0, '#e8b89b', 'k (raw)').replace(/marker-end="[^"]*"/, 'stroke-dasharray="4 3"');
    html += arrow(q, '#2e6fd8', 'q@' + m);
    html += arrow(k, '#d35400', 'k@' + n);
    svg.innerHTML = html;
    $('out').innerHTML =
      'q rotated by m·θ = ' + (m * th).toFixed(2) + ' rad<br>' +
      'k rotated by n·θ = ' + (n * th).toFixed(2) + ' rad<br>' +
      'offset m − n = <b>' + (m - n) + '</b><br>' +
      'score q·k = <span class="big">' + dot.toFixed(3) + '</span>';
  }

  $('shift').onclick = () => {
    if (+$('m').value < 12 && +$('n').value < 12) {
      $('m').value = +$('m').value + 1;
      $('n').value = +$('n').value + 1;
      draw();
    }
  };
  $('reset').onclick = () => { $('m').value = 3; $('n').value = 1; $('th').value = 0.4; draw(); };
  ['m', 'n', 'th'].forEach(id => { $(id).oninput = draw; });
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>shift both +1</strong> a few times. Both arrows rotate, but the angle between them stays fixed, so the score doesn't change.</li>
              <li>Now move only <code>m</code>. The offset changes, and so does the score.</li>
              <li>Set <code>m = n</code>. The score equals the raw <code>q·k</code> (0.69), because rotating both vectors by the same angle changes nothing.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'You feed a transformer with NO positional information the sequences "A B C" and "C A B". What happens to the output vector for token B?',
        options: ['It changes a lot', 'It is identical in both cases (it just moves to a different row)', 'It becomes zero', 'The model crashes'],
        answer: 1,
        why: 'Without positions (and without a mask), self-attention is permutation-equivariant. B attends over the same set of tokens with the same scores.',
      },
      {
        q: 'What does RoPE rotate?',
        options: ['The token embeddings, once before layer 1', 'Queries and keys, inside every attention layer', 'Values only', 'The output logits'],
        answer: 1,
        why: 'RoPE rotates Q and K by position-dependent angles in each attention layer, so that q·k depends on the relative offset. V is left unrotated.',
      },
      {
        q: 'Why does RoPE make attention scores depend on relative position?',
        options: [
          'Because it adds the offset to the score',
          'Because rotating q by mθ and k by nθ changes the angle between them by (m−n)θ, and the dot product depends only on that angle and the lengths',
          'Because it uses a lookup table of offsets',
          'It does not; RoPE is absolute',
        ],
        answer: 1,
        why: 'Rotations preserve length. The dot product of rotated vectors depends only on the difference of the rotation angles.',
      },
      {
        q: 'What is a limitation of GPT-2 style learned absolute position embeddings?',
        options: ['They need no training', 'There is a fixed maximum length (one row per position), and positions beyond it have no embedding', 'They only work for encoders', 'They make attention quadratic'],
        answer: 1,
        why: 'The wpe table has max_positions rows (1024 for GPT-2). The model has never seen position 1025.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement the sinusoidal positional encoding <code>pe(pos, d)</code> from the 2017 paper. For each dimension <code>k</code>, use pair index <code>i = floor(k/2)</code> and angle <code>pos / 10000^(2i/d)</code>. Even <code>k</code> gets <code>sin</code>, odd <code>k</code> gets <code>cos</code>.</p>
        <p>Expected for <code>d = 4</code>: pos 0 → <code>0.000 1.000 0.000 1.000</code>, pos 1 → <code>0.841 0.540 0.010 1.000</code>. Bonus: check that <code>PE(0)·PE(1)</code> equals <code>PE(7)·PE(8)</code>.</p>`,
      starter: `// Sinusoidal positional encoding (Vaswani et al., 2017)
// PE[pos][2i]   = sin(pos / 10000^(2i/d))
// PE[pos][2i+1] = cos(pos / 10000^(2i/d))
function pe(pos, d) {
  const out = [];
  for (let k = 0; k < d; k++) {
    // TODO: pair index i = Math.floor(k / 2); even k → sin, odd k → cos
    out.push(0);
  }
  return out;
}

const D = 4;
for (let pos = 0; pos < 4; pos++) {
  console.log('pos', pos, pe(pos, D).map(v => v.toFixed(3)).join('  '));
}`,
      hint: 'const i = Math.floor(k / 2); const angle = pos / Math.pow(10000, (2 * i) / d); then push k % 2 === 0 ? Math.sin(angle) : Math.cos(angle).',
      solution: `// Sinusoidal positional encoding (Vaswani et al., 2017)
// PE[pos][2i]   = sin(pos / 10000^(2i/d))
// PE[pos][2i+1] = cos(pos / 10000^(2i/d))
function pe(pos, d) {
  const out = [];
  for (let k = 0; k < d; k++) {
    const i = Math.floor(k / 2);
    const angle = pos / Math.pow(10000, (2 * i) / d);
    out.push(k % 2 === 0 ? Math.sin(angle) : Math.cos(angle));
  }
  return out;
}

const D = 4;
for (let pos = 0; pos < 4; pos++) {
  console.log('pos', pos, pe(pos, D).map(v => v.toFixed(3)).join('  '));
}

// Bonus: PE(pos)·PE(pos+k) depends only on k (for fixed d)
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
console.log('dot(pe0, pe1) =', dot(pe(0, D), pe(1, D)).toFixed(3));
console.log('dot(pe7, pe8) =', dot(pe(7, D), pe(8, D)).toFixed(3));`,
    },
  },

  // ───────────────────────────────────────────────────────────── residual
  {
    id: 'residual',
    section: 'The Transformer Block',
    title: 'Residual Connections',
    explain: `
      <p>A residual (or "skip") connection is one line of code. Instead of <code>x = f(x)</code>, write:</p>
      <pre><code>x = x + f(x)</code></pre>
      <p>The layer no longer <em>replaces</em> its input. It computes a <strong>correction</strong> (a "residual") and adds it on top. The idea comes from ResNet (He et al., 2015), where it let image networks go from about 20 layers to more than 100. Every transformer sub-layer (attention and FFN) is wrapped this way.</p>

      <h3>Why: the gradient highway</h3>
      <p>Backprop multiplies local derivatives layer by layer (chain rule). In a plain stack, the gradient reaching layer 1 is <code>f'₁ · f'₂ · … · f'_N</code>. If each factor is 0.8, then 48 layers give <code>0.8⁴⁸ ≈ 2·10⁻⁵</code>. The gradient <strong>vanishes</strong>, and the bottom layers stop learning. (Factors above 1 make it explode instead.)</p>
      <p>With a residual, each layer's derivative is <code>d(x + f(x))/dx = 1 + f'(x)</code>. That constant <strong>1</strong> is a direct path: expand the product and one term is <code>1 · 1 · … · 1 = 1</code>. The gradient always has an unobstructed route from the loss down to the embeddings, whatever the branches are doing.</p>
      <div class="tip">A new layer whose branch outputs roughly 0 is roughly the identity. So adding depth can't make things much worse at the start of training. Each layer only has to learn a small <em>change</em>. GPT-2 even scales the init of the residual output projections by <code>1/√N</code> to keep the branches small.</div>

      <h3>The residual stream mental model</h3>
      <p>Picture a vector per token (the <strong>residual stream</strong>, width <code>d_model</code>) running straight up through the whole network like a shared bus or a whiteboard. Each attention or FFN sub-layer <strong>reads</strong> the stream (through a LayerNorm), computes something, and <strong>writes</strong> its result back by adding it. Nothing ever overwrites the stream. Later layers can use anything earlier layers wrote, and a layer can "erase" a feature only by adding its negative. Interpretability researchers use this picture heavily (for example Anthropic's "A Mathematical Framework for Transformer Circuits").</p>
      <pre><code>x0 = embed(tokens) + pos
x1 = x0 + attn_1(LN(x0))      # write
x2 = x1 + ffn_1(LN(x1))       # write
...
logits = LM_head(LN(x_final))</code></pre>
      <div class="warn">Adding keeps growing the stream's magnitude layer after layer. That's one reason transformers need <strong>normalization</strong> (next lesson), and why the shape of every sub-layer's output must be exactly <code>[T, d_model]</code>: you can only add tensors of the same shape.</div>
    `,
    examples: [
      {
        title: 'Gradient through a deep stack: plain vs residual',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .row { display:flex; gap:16px; flex-wrap:wrap; margin:4px 0; }
  .row input[type=range] { vertical-align:middle; width:140px; }
  .legend span { display:inline-block; width:12px; height:12px; border-radius:2px; vertical-align:middle; margin:0 4px 0 10px; }
  .out { font-family:ui-monospace, monospace; font-size:13px; margin-top:6px; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Drag <b>depth</b> and the two derivative sliders. Red bars = gradient reaching each layer in a plain stack, green = with residual connections. Watch the bottom-layer readout.</div>
  <div class="row">
    <label>depth N <input id="n" type="range" min="2" max="48" value="24"> <b id="nv"></b></label>
    <label>plain layer derivative a <input id="a" type="range" min="0.5" max="1.2" step="0.05" value="0.8"> <b id="av"></b></label>
    <label>residual branch derivative d <input id="d" type="range" min="-0.2" max="0.2" step="0.01" value="0.02"> <b id="dv"></b></label>
  </div>
  <svg id="svg" width="640" height="250"></svg>
  <div class="legend muted"><span style="background:#c0392b"></span>plain: grad × a per layer
    <span style="background:#2e7d32"></span>residual: grad × (1 + d) per layer</div>
  <div class="out" id="out"></div>
  <div class="muted">Illustrative toy: each layer multiplies the backward gradient by one number. Y axis is log scale (10⁻⁸ … 10⁴).</div>
</div>
<script>
  const $ = id => document.getElementById(id);
  const svg = $('svg');
  const W = 640;
  const H = 250;
  const LO = -8;
  const HI = 4;
  const yOf = g => {
    const l = Math.max(LO, Math.min(HI, Math.log10(g)));
    return 10 + (HI - l) / (HI - LO) * (H - 30);
  };

  function draw() {
    const n = +$('n').value;
    const a = +$('a').value;
    const d = +$('d').value;
    $('nv').textContent = n;
    $('av').textContent = a.toFixed(2);
    $('dv').textContent = (d >= 0 ? '+' : '') + d.toFixed(2);
    let s = '';
    for (let e = LO; e <= HI; e += 2) {
      const y = yOf(Math.pow(10, e));
      s += '<line x1="40" x2="' + W + '" y1="' + y + '" y2="' + y + '" stroke="' + (e === 0 ? '#999' : '#eee') + '"/>';
      s += '<text x="4" y="' + (y + 4) + '" font-size="11" fill="#666">1e' + e + '</text>';
    }
    const bw = (W - 50) / n;
    for (let l = 1; l <= n; l++) {
      // gradient that reaches layer l from the loss at the top (layer n)
      const steps = n - l + 1;
      const gPlain = Math.pow(a, steps);
      const gRes = Math.pow(1 + d, steps);
      const x = 45 + (l - 1) * bw;
      const y1 = yOf(gPlain);
      const y2 = yOf(gRes);
      s += '<rect x="' + x + '" y="' + y1 + '" width="' + Math.max(1, bw * 0.42) + '" height="' + (H - 20 - y1) + '" fill="#c0392b"/>';
      s += '<rect x="' + (x + bw * 0.45) + '" y="' + y2 + '" width="' + Math.max(1, bw * 0.42) + '" height="' + (H - 20 - y2) + '" fill="#2e7d32"/>';
    }
    s += '<text x="45" y="' + (H - 4) + '" font-size="11" fill="#666">layer 1 (bottom)</text>';
    s += '<text x="' + (W - 4) + '" y="' + (H - 4) + '" font-size="11" fill="#666" text-anchor="end">layer ' + n + ' (next to loss)</text>';
    svg.innerHTML = s;
    $('out').textContent = 'gradient reaching layer 1:  plain = ' + Math.pow(a, n).toExponential(2) +
      '   residual = ' + Math.pow(1 + d, n).toExponential(2);
  }
  ['n', 'a', 'd'].forEach(id => { $(id).oninput = draw; });
  draw();
</script>`,
      },
      {
        title: 'The residual stream as a shared bus',
        lang: 'js',
        code: `// The residual stream: every layer READS the stream and ADDS a delta to it.
// One token, d_model = 6. Think of slot groups as "channels" on a shared bus.
let stream = [1.0, 0.5, 0, 0, 0, 0]; // embedding writes slots 0-1

const f2 = v => '[' + v.map(n => n.toFixed(2).padStart(5)).join(' ') + ']';

// Each "layer" looks at some slots and returns a delta (what it wants to add).
const layers = [
  {
    name: 'layer 1 (attn)',
    f: s => [0, 0, 0.8 * s[0], 0.8 * s[1], 0, 0], // reads 0-1, writes 2-3
  },
  {
    name: 'layer 2 (ffn) ',
    f: s => [0, 0, 0, 0, Math.max(0, s[2] - s[3]), 0], // reads 2-3, writes 4
  },
  {
    name: 'layer 3 (ffn) ',
    f: s => [0, 0, -s[2], 0, 0, 2 * s[4]], // erases slot 2, writes 5
  },
];

console.log('embedding       ', f2(stream));
for (const layer of layers) {
  const delta = layer.f(stream); // ① read the current stream
  stream = stream.map((x, i) => x + delta[i]); // ② x = x + f(x)
  console.log(layer.name, ' +', f2(delta), '->', f2(stream));
}

// ③ Remove the residual (x = f(x)) and the early information is gone
let plain = [1.0, 0.5, 0, 0, 0, 0];
for (const layer of layers) plain = layer.f(plain);
console.log('without residual final', f2(plain));`,
      },
    ],
    quiz: [
      {
        q: 'What is the local derivative of a residual layer y = x + f(x)?',
        options: ["f'(x)", "1 + f'(x)", "x · f'(x)", '1'],
        answer: 1,
        why: 'The derivative of x is 1, plus the derivative of the branch. The "1" is the gradient highway.',
      },
      {
        q: 'In a plain 40-layer stack where each layer multiplies the gradient by 0.7, roughly how big is the gradient at the bottom?',
        options: ['0.7', '28', 'about 6·10⁻⁷', 'exactly 0'],
        answer: 2,
        why: '0.7⁴⁰ ≈ 6.4·10⁻⁷, so it vanishes. With residuals, the identity path keeps a term of 1.',
      },
      {
        q: 'In the "residual stream" picture, how does a sub-layer communicate with later layers?',
        options: ['By overwriting the stream', 'By adding its output into the stream, which later layers read', 'Through a separate memory bank', 'It cannot'],
        answer: 1,
        why: 'Every sub-layer reads the stream and writes by addition. Later layers see the sum of everything written before.',
      },
      {
        q: 'Why must attention and FFN outputs have shape [T, d_model]?',
        options: ['For speed', 'So they can be added to the residual stream x, which has that shape', 'Because softmax requires it', 'They don\'t have to'],
        answer: 1,
        why: 'x + f(x) only works if f(x) has the same shape as x.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>30 layers, each with branch <code>f(x) = tanh(0.9x)</code>. The starter tracks the forward value and the gradient (the product of local derivatives) for a plain stack. Make <code>run(true)</code> use residual layers: <code>x = x + f(x)</code>, local derivative <code>1 + f'(x)</code>.</p>
        <p>Expected: plain grad about <code>5.19e-3</code>, residual grad about <code>1.72e+0</code>. Also notice the residual output grows to about 30. That's why the next lesson adds normalization.</p>`,
      starter: `// 30 layers. Each layer's branch is f(x) = tanh(w * x) with w = 0.9.
const N = 30;
const w = 0.9;
const f = x => Math.tanh(w * x);
const df = x => w * (1 - Math.tanh(w * x) ** 2); // f'(x)

function run(useResidual) {
  let x = 1.0;
  let grad = 1.0; // d(output)/d(input), built up with the chain rule
  for (let l = 0; l < N; l++) {
    // TODO: when useResidual is true, the layer is x + f(x),
    // so its local derivative is 1 + f'(x).
    grad *= df(x);
    x = f(x);
  }
  return { x, grad };
}

const p = run(false);
const r = run(true);
console.log('plain    : output', p.x.toFixed(4), ' grad', p.grad.toExponential(2));
console.log('residual : output', r.x.toFixed(4), ' grad', r.grad.toExponential(2));`,
      hint: 'Inside the loop: if (useResidual) { grad *= 1 + df(x); x = x + f(x); } else { ...existing two lines... }. Update grad BEFORE you change x.',
      solution: `// 30 layers. Each layer's branch is f(x) = tanh(w * x) with w = 0.9.
const N = 30;
const w = 0.9;
const f = x => Math.tanh(w * x);
const df = x => w * (1 - Math.tanh(w * x) ** 2); // f'(x)

function run(useResidual) {
  let x = 1.0;
  let grad = 1.0; // d(output)/d(input), built up with the chain rule
  for (let l = 0; l < N; l++) {
    if (useResidual) {
      grad *= 1 + df(x); // derivative of x + f(x)
      x = x + f(x);
    } else {
      grad *= df(x);
      x = f(x);
    }
  }
  return { x, grad };
}

const p = run(false);
const r = run(true);
console.log('plain    : output', p.x.toFixed(4), ' grad', p.grad.toExponential(2));
console.log('residual : output', r.x.toFixed(4), ' grad', r.grad.toExponential(2));`,
    },
  },

  // ───────────────────────────────────────────────────────────── layernorm
  {
    id: 'layernorm',
    section: 'The Transformer Block',
    title: 'Layer Normalization',
    explain: `
      <p>As the residual stream accumulates layer after layer, its values can drift to very different scales. Large activations make softmax spiky and gradients unstable. <strong>Layer normalization</strong> rescales each token's vector to a standard range before a sub-layer uses it.</p>
      <h3>The formula (per token)</h3>
      <p>For one token vector <code>x</code> of length <code>d</code>:</p>
      <pre><code>μ  = mean(x)                         # one number
σ² = mean((x − μ)²)                  # one number (population variance)
x̂  = (x − μ) / √(σ² + ε)             # now mean 0, variance 1
y  = γ ⊙ x̂ + β                       # learned per-dimension scale and shift</code></pre>
      <p><code>ε</code> (like <code>1e-5</code>) prevents division by zero. <code>γ</code> and <code>β</code> are learnable vectors of length <code>d</code>, initialized to 1 and 0. They let the model undo the normalization where that helps.</p>
      <div class="tip"><strong>"Layer" norm normalizes across features, within one token.</strong> Each token is normalized independently of other tokens and other sequences in the batch. That's different from BatchNorm (common in CNNs), which normalizes each feature across the batch. Per-token normalization is exactly what you want for variable-length sequences and for generating one token at a time.</div>

      <h3>RMSNorm (Llama, Qwen, Mistral, T5, …)</h3>
      <p>RMSNorm (Zhang &amp; Sennrich, 2019) drops the mean subtraction and <code>β</code>:</p>
      <pre><code>y = γ ⊙ x / √(mean(x²) + ε)</code></pre>
      <p>It's slightly cheaper and works just as well in practice, so most modern LLMs use it. PyTorch ships it as <code>torch.nn.RMSNorm</code> (since 2.4).</p>

      <h3>Where to put it: post-LN vs pre-LN</h3>
      <pre><code># Post-LN (original 2017 Transformer, BERT)
x = LN(x + attn(x))
x = LN(x + ffn(x))

# Pre-LN (GPT-2 onward, nearly all modern LLMs)
x = x + attn(LN(x))
x = x + ffn(LN(x))
# ...and one final LN after the last block</code></pre>
      <p>In post-LN, the normalization sits <em>on</em> the residual path, so gradients must pass through every LN. Deep post-LN models need a careful learning-rate warmup and can diverge. In pre-LN, the residual path <code>x → x + … → x + …</code> is a clean identity highway, and only the branch inputs get normalized. Training is much more stable (Xiong et al., 2020). That's why GPT-2, GPT-3, Llama and friends all use pre-LN, plus a final norm before the LM head.</p>
      <div class="warn">Normalization is computed over the <strong>last dimension</strong> (<code>d_model</code>) for each token: <code>nn.LayerNorm(d_model)</code>. If you normalize over the sequence dimension instead, token t would depend on future tokens, which silently breaks causality.</div>
    `,
    examples: [
      {
        title: 'LayerNorm and RMSNorm by hand',
        lang: 'js',
        code: `// LayerNorm and RMSNorm on one token vector, by hand.
const x = [2, 4, 6, 8];
const gamma = [1, 1, 2, 0.5]; // learned scale (starts at 1 in real models)
const beta = [0, 0, 0.5, 1]; // learned shift (starts at 0)
const EPS = 1e-5;

const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const f3 = v => '[' + v.map(n => n.toFixed(3)).join(', ') + ']';

function layerNorm(v) {
  const mu = mean(v); // ①
  const variance = mean(v.map(n => (n - mu) ** 2)); // ②
  const xhat = v.map(n => (n - mu) / Math.sqrt(variance + EPS)); // ③
  const y = xhat.map((n, i) => gamma[i] * n + beta[i]); // ④
  return { mu, variance, xhat, y };
}

function rmsNorm(v) {
  const rms = Math.sqrt(mean(v.map(n => n * n)) + EPS); // no mean subtraction
  const xhat = v.map(n => n / rms);
  return { rms, y: xhat.map((n, i) => gamma[i] * n) }; // no beta
}

const ln = layerNorm(x);
console.log('x        =', f3(x));
console.log('mean     =', ln.mu.toFixed(3));
console.log('variance =', ln.variance.toFixed(3), ' std =', Math.sqrt(ln.variance).toFixed(3));
console.log('x_hat    =', f3(ln.xhat));
console.log('check: mean(x_hat) =', mean(ln.xhat).toFixed(3),
  ' var(x_hat) =', mean(ln.xhat.map(n => n * n)).toFixed(3));
console.log('y = γ·x_hat + β =', f3(ln.y));

// Scale invariance: a 10× bigger vector gives the same x_hat
console.log('x_hat of 10·x =', f3(layerNorm(x.map(n => n * 10)).xhat));

const rn = rmsNorm(x);
console.log('--- RMSNorm ---');
console.log('rms =', rn.rms.toFixed(3), ' y =', f3(rn.y));`,
        explain: `
          <details>
            <summary>Check the numbers yourself</summary>
            <table>
              <tr><th>Step</th><th>Computation</th><th>Console</th></tr>
              <tr><td>① mean</td><td>(2+4+6+8)/4</td><td><code>5.000</code></td></tr>
              <tr><td>② variance</td><td>(9+1+1+9)/4</td><td><code>5.000</code>, std √5 = <code>2.236</code></td></tr>
              <tr><td>③ x̂</td><td>(2−5)/2.236 = −1.342, (4−5)/2.236 = −0.447, …</td><td><code>[-1.342, -0.447, 0.447, 1.342]</code></td></tr>
              <tr><td>④ γ, β</td><td>1·(−1.342)+0, 1·(−0.447)+0, 2·0.447+0.5, 0.5·1.342+1</td><td><code>[-1.342, -0.447, 1.394, 1.671]</code></td></tr>
              <tr><td>RMSNorm</td><td>rms = √((4+16+36+64)/4) = √30 = 5.477; x/rms then × γ</td><td><code>[0.365, 0.730, 2.191, 0.730]</code></td></tr>
            </table>
            <p><code>10·x</code> gives the same x̂: normalization throws away the overall scale. Notice too that RMSNorm output is <em>not</em> centered, since all four values stay positive.</p>
          </details>
        `,
      },
      {
        title: 'Normalization playground: scale and shift invariance',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .row { display:flex; gap:14px; flex-wrap:wrap; align-items:center; margin:4px 0; }
  .row input[type=range] { width:120px; vertical-align:middle; }
  .out { font-family:ui-monospace, monospace; font-size:12px; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Drag <b>scale</b> and <b>shift</b>: the input bars change, but the normalized bars on the right stay put. Tick <b>RMSNorm</b> and shift again to see the difference.</div>
  <div class="row">
    <label>scale all × <input id="sc" type="range" min="0.2" max="5" step="0.1" value="1"> <b id="scv"></b></label>
    <label>shift all + <input id="sh" type="range" min="-3" max="3" step="0.1" value="0"> <b id="shv"></b></label>
    <label><input id="rms" type="checkbox"> RMSNorm instead</label>
    <button id="rnd">new vector</button>
  </div>
  <svg id="svg" width="640" height="260"></svg>
  <div class="out" id="out"></div>
  <div class="muted">Left: raw token vector (6 dims). Right: after normalization (γ = 1, β = 0). Scale it: LayerNorm and RMSNorm outputs don't change. Shift it: only LayerNorm ignores the shift.</div>
</div>
<script>
  const $ = id => document.getElementById(id);
  let seed = 7;
  function mulberry32() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  let base = [];
  const newVec = () => { base = Array.from({ length: 6 }, () => +(mulberry32() * 4 - 1).toFixed(1)); };
  newVec();
  const mean = v => v.reduce((a, b) => a + b, 0) / v.length;

  function panel(v, x0, title, lim) {
    const w = 290;
    const h = 200;
    const top = 30;
    const zero = top + h / 2;
    let s = '<text x="' + (x0 + w / 2) + '" y="16" text-anchor="middle" font-size="13" font-weight="bold">' + title + '</text>';
    s += '<rect x="' + x0 + '" y="' + top + '" width="' + w + '" height="' + h + '" fill="#fafafa" stroke="#ddd"/>';
    s += '<line x1="' + x0 + '" x2="' + (x0 + w) + '" y1="' + zero + '" y2="' + zero + '" stroke="#999"/>';
    const bw = w / v.length;
    v.forEach((val, i) => {
      const hh = Math.max(-1, Math.min(1, val / lim)) * (h / 2 - 4);
      const y = hh >= 0 ? zero - hh : zero;
      s += '<rect x="' + (x0 + i * bw + 6) + '" y="' + y + '" width="' + (bw - 12) + '" height="' + Math.abs(hh) +
        '" fill="' + (val >= 0 ? '#2e6fd8' : '#d35400') + '"/>';
      s += '<text x="' + (x0 + i * bw + bw / 2) + '" y="' + (top + h + 16) + '" text-anchor="middle" font-size="11">' + val.toFixed(2) + '</text>';
    });
    s += '<text x="' + (x0 + 4) + '" y="' + (top + 12) + '" font-size="10" fill="#888">+' + lim + '</text>';
    return s;
  }

  function draw() {
    const sc = +$('sc').value;
    const sh = +$('sh').value;
    $('scv').textContent = sc.toFixed(1);
    $('shv').textContent = sh.toFixed(1);
    const x = base.map(v => v * sc + sh);
    const mu = mean(x);
    const vr = mean(x.map(v => (v - mu) ** 2));
    let y;
    let info;
    if ($('rms').checked) {
      const r = Math.sqrt(mean(x.map(v => v * v)) + 1e-5);
      y = x.map(v => v / r);
      info = 'rms = ' + r.toFixed(3) + '  →  y = x / rms';
    } else {
      y = x.map(v => (v - mu) / Math.sqrt(vr + 1e-5));
      info = 'mean = ' + mu.toFixed(3) + '  var = ' + vr.toFixed(3) + '  →  y = (x − mean) / √(var + ε)';
    }
    const my = mean(y);
    info += '\\nout: mean = ' + my.toFixed(3) + '  var = ' + mean(y.map(v => (v - my) ** 2)).toFixed(3);
    $('svg').innerHTML = panel(x, 0, 'input x', 16) + panel(y, 345, $('rms').checked ? 'RMSNorm(x)' : 'LayerNorm(x)', 3);
    $('out').innerText = info;
  }
  $('sc').oninput = draw;
  $('sh').oninput = draw;
  $('rms').onchange = draw;
  $('rnd').onclick = () => { newVec(); draw(); };
  draw();
</script>`,
      },
      {
        title: 'In PyTorch',
        runnable: false,
        lang: 'python',
        code: `import torch
import torch.nn as nn

x = torch.tensor([[2.0, 4.0, 6.0, 8.0]])     # [T=1, d=4]

ln = nn.LayerNorm(4)                          # γ = 1, β = 0 at init
print(ln(x))       # tensor([[-1.3416, -0.4472,  0.4472,  1.3416]], ...)

rms = nn.RMSNorm(4)                           # PyTorch >= 2.4, γ only
print(rms(x))      # tensor([[0.3651, 0.7303, 1.0954, 1.4606]], ...)

# Pre-LN sub-layer (GPT-2 / Llama style):
# x = x + attn(norm1(x))
# x = x + ffn(norm2(x))`,
      },
    ],
    quiz: [
      {
        q: 'LayerNorm in a transformer normalizes over which dimension?',
        options: ['The batch dimension, per feature', 'The sequence dimension, per feature', 'The feature (d_model) dimension, separately for each token', 'All dimensions at once'],
        answer: 2,
        why: 'Each token vector gets its own mean and variance over its d_model features.',
      },
      {
        q: 'What does RMSNorm drop compared to LayerNorm?',
        options: ['The division', 'The mean subtraction and the β shift', 'The learnable γ', 'Epsilon'],
        answer: 1,
        why: 'RMSNorm divides by the root-mean-square and multiplies by γ. There is no centering and no β.',
      },
      {
        q: 'Why did GPT-2 and later models switch from post-LN to pre-LN?',
        options: [
          'Pre-LN has fewer parameters',
          'Pre-LN keeps the residual path a clean identity, so gradients flow easily and deep models train more stably',
          'Post-LN cannot be used with attention',
          'Pre-LN makes inference exact',
        ],
        answer: 1,
        why: 'Post-LN puts a normalization on the main residual path of every layer. Pre-LN only normalizes the input of each branch.',
      },
      {
        q: 'x = [1, 2, 3]. What is LayerNorm(x) with γ=1, β=0 (ignoring ε)?',
        options: ['[0, 0.5, 1]', '[−1.225, 0, 1.225]', '[−1, 0, 1]', '[0.33, 0.67, 1]'],
        answer: 1,
        why: 'Mean 2, variance (1+0+1)/3 = 0.667, std 0.816, so (x−2)/0.816 = [−1.225, 0, 1.225].',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write <code>layerNormRows(M)</code> for a whole sequence <code>M</code> of shape <code>[T, d]</code>. Normalize <strong>each row</strong> (token) using its own mean and variance, then apply <code>γ</code> and <code>β</code>.</p>
        <p>The check prints each output row's mean and variance. You're done when every row shows <code>mean 0.000 var 1.000</code>. Row 0 should be <code>-1.342 -0.447 0.447 1.342</code>.</p>`,
      starter: `// LayerNorm for a whole sequence: M is [T, d]. Normalize EACH ROW (token).
const M = [
  [2, 4, 6, 8],
  [10, 10, 10, 14],
  [-1, 0, 1, 0],
];
const gamma = [1, 1, 1, 1];
const beta = [0, 0, 0, 0];
const EPS = 1e-5;

function layerNormRows(M) {
  // TODO: for each row: mean, variance, (x - mean) / sqrt(var + EPS), then γ·x̂ + β
  return M.map(row => row.slice());
}

const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const out = layerNormRows(M);
out.forEach((row, t) => {
  const mu = mean(row);
  const vr = mean(row.map(x => (x - mu) ** 2));
  console.log('token', t, row.map(x => x.toFixed(3)).join(' '),
    '| mean', mu.toFixed(3), 'var', vr.toFixed(3));
});`,
      hint: 'Inside M.map(row => …): compute mu with reduce, then vr = mean of (x - mu)², then return row.map((x, i) => gamma[i] * (x - mu) / Math.sqrt(vr + EPS) + beta[i]).',
      solution: `// LayerNorm for a whole sequence: M is [T, d]. Normalize EACH ROW (token).
const M = [
  [2, 4, 6, 8],
  [10, 10, 10, 14],
  [-1, 0, 1, 0],
];
const gamma = [1, 1, 1, 1];
const beta = [0, 0, 0, 0];
const EPS = 1e-5;

function layerNormRows(M) {
  return M.map(row => {
    const mu = row.reduce((a, b) => a + b, 0) / row.length;
    const vr = row.reduce((a, x) => a + (x - mu) ** 2, 0) / row.length;
    return row.map((x, i) => gamma[i] * ((x - mu) / Math.sqrt(vr + EPS)) + beta[i]);
  });
}

const mean = v => v.reduce((a, b) => a + b, 0) / v.length;
const out = layerNormRows(M);
out.forEach((row, t) => {
  const mu = mean(row);
  const vr = mean(row.map(x => (x - mu) ** 2));
  console.log('token', t, row.map(x => x.toFixed(3)).join(' '),
    '| mean', mu.toFixed(3), 'var', vr.toFixed(3));
});`,
    },
  },

  // ───────────────────────────────────────────────────────────── ffn
  {
    id: 'ffn',
    section: 'The Transformer Block',
    title: 'The Feed-Forward Network',
    explain: `
      <p>The second sub-layer of every block is a plain 2-layer MLP, the same one you met in the neural-network lessons. It's applied <strong>to each token separately</strong>, with the same weights at every position:</p>
      <pre><code>FFN(x) = W₂ · GELU(W₁ · x + b₁) + b₂
         x: [d_model] → [4·d_model] → [d_model]</code></pre>
      <p>It expands the vector to a hidden size 4× wider (768 → 3072 in GPT-2 small), applies a nonlinearity, then projects back so the result can be added to the residual stream. The original 2017 Transformer used ReLU. GPT-2 and BERT use GELU.</p>
      <div class="tip"><strong>Attention = tokens talk to each other. FFN = each token thinks on its own.</strong> Attention is the only place where information moves between positions. The FFN transforms each token's vector in place, like a function <code>map</code>ped over the sequence. Research suggests many FFN neurons act like key→value memories, for example detecting "this is a French city name" and writing related features into the stream.</div>

      <h3>Most of the parameters live here</h3>
      <p>Per block, ignoring biases: attention has <code>W_q, W_k, W_v, W_o</code> = <code>4·d²</code>, and the FFN has <code>W₁ (d×4d) + W₂ (4d×d)</code> = <code>8·d²</code>. That's a total of <strong>12·d² per block</strong>, and the FFN holds <strong>two thirds</strong> of it. When people say "a 7B model", most of those billions are FFN weights.</p>

      <h3>SwiGLU (Llama, Qwen, Mistral, PaLM, …)</h3>
      <p>Modern LLMs replace <code>GELU(W₁x)</code> with a <em>gated</em> unit (Shazeer, 2020, "GLU Variants Improve Transformer"):</p>
      <pre><code>SwiGLU(x) = W_down · ( SiLU(W_gate · x) ⊙ (W_up · x) )      # ⊙ = element-wise
SiLU(z)   = z · sigmoid(z)                                  # a.k.a. Swish</code></pre>
      <p>One branch decides <em>how much</em> of each hidden unit to let through (the gate), and the other supplies the content. That makes three matrices instead of two, so to keep the parameter count at about <code>8d²</code>, the hidden size is shrunk to about <code>(2/3)·4d = 8d/3</code>, rounded to a hardware-friendly multiple. For example, Llama-2-7B uses d = 4096 and hidden 11008. Empirically this trains to lower loss than GELU at the same size.</p>
      <div class="warn">"Per token" doesn't mean the FFN is small or unimportant. It's where most of the compute and parameters go. It just has no cross-token mixing. So you can run it on all T tokens as one big matrix multiply: <code>[T, d] @ [d, 4d]</code>.</div>
    `,
    examples: [
      {
        title: 'Attention vs FFN, and where the parameters are',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .row { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin:4px 0; }
  .out { font-family:ui-monospace, monospace; font-size:12px; line-height:1.5; }
  button.on { background:#2e6fd8; color:#fff; border-color:#2e6fd8; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Click the two buttons to compare how information flows. Change <b>d_model</b> or tick <b>SwiGLU</b> to see the parameter split per block.</div>
  <div class="row">
    <button id="bA">Attention: tokens talk</button>
    <button id="bF" class="on">FFN: each token thinks alone</button>
    <label>d_model
      <select id="d">
        <option>768</option><option>1024</option><option selected>4096</option><option>8192</option>
      </select></label>
    <label><input type="checkbox" id="swi"> SwiGLU (hidden = 8/3·d)</label>
  </div>
  <svg id="svg" width="640" height="210"></svg>
  <svg id="bar" width="640" height="46"></svg>
  <div class="out" id="out"></div>
</div>
<script>
  const $ = id => document.getElementById(id);
  const words = ['The', 'cat', 'sat', 'down'];
  let mode = 'ffn';

  function diagram() {
    let s = '';
    const xs = words.map((_, i) => 90 + i * 150);
    words.forEach((w, i) => {
      s += '<rect x="' + (xs[i] - 35) + '" y="170" width="70" height="28" rx="5" fill="#eef3fc" stroke="#2e6fd8"/>';
      s += '<text x="' + xs[i] + '" y="189" text-anchor="middle" font-size="13">' + w + '</text>';
      s += '<rect x="' + (xs[i] - 35) + '" y="8" width="70" height="28" rx="5" fill="#eef7ee" stroke="#2e7d32"/>';
      s += '<text x="' + xs[i] + '" y="27" text-anchor="middle" font-size="12">out ' + i + '</text>';
    });
    if (mode === 'attn') {
      // causal: token i reads tokens 0..i
      words.forEach((_, i) => {
        for (let j = 0; j <= i; j++) {
          s += '<line x1="' + xs[j] + '" y1="168" x2="' + xs[i] + '" y2="38" stroke="#d35400" stroke-width="' +
            (i === j ? 2.5 : 1.5) + '" opacity="0.75"/>';
        }
      });
      s += '<text x="320" y="110" text-anchor="middle" font-size="12" fill="#d35400">information moves BETWEEN positions (causal: only from the left)</text>';
    } else {
      xs.forEach(x => {
        s += '<line x1="' + x + '" y1="168" x2="' + x + '" y2="146" stroke="#555"/>';
        s += '<polygon points="' + (x - 18) + ',146 ' + (x + 18) + ',146 ' + (x + 50) + ',104 ' + (x - 50) + ',104" fill="#fdf1e6" stroke="#d35400"/>';
        s += '<polygon points="' + (x - 50) + ',100 ' + (x + 50) + ',100 ' + (x + 18) + ',58 ' + (x - 18) + ',58" fill="#fdf1e6" stroke="#d35400"/>';
        s += '<text x="' + x + '" y="129" text-anchor="middle" font-size="11">W₁ · expand</text>';
        s += '<text x="' + x + '" y="84" text-anchor="middle" font-size="11">GELU · W₂</text>';
        s += '<line x1="' + x + '" y1="58" x2="' + x + '" y2="38" stroke="#555"/>';
      });
      s += '<text x="320" y="160" text-anchor="middle" font-size="11" fill="#666">same weights for every token · no arrows between columns</text>';
    }
    $('svg').innerHTML = s;
  }

  function params() {
    const d = +$('d').value;
    const swi = $('swi').checked;
    const attn = 4 * d * d;
    const hidden = swi ? Math.round((8 * d) / 3) : 4 * d;
    const ffn = swi ? 3 * d * hidden : 2 * d * hidden;
    const tot = attn + ffn;
    const fa = attn / tot;
    $('bar').innerHTML =
      '<rect x="0" y="6" width="' + (640 * fa) + '" height="26" fill="#2e6fd8"/>' +
      '<rect x="' + (640 * fa) + '" y="6" width="' + (640 * (1 - fa)) + '" height="26" fill="#d35400"/>' +
      '<text x="8" y="24" fill="#fff" font-size="12">attention ' + (100 * fa).toFixed(0) + '%</text>' +
      '<text x="632" y="24" fill="#fff" font-size="12" text-anchor="end">FFN ' + (100 * (1 - fa)).toFixed(0) + '%</text>';
    const M = n => (n / 1e6).toFixed(1) + 'M';
    $('out').innerText =
      'per block (weights only, no biases):\\n' +
      '  attention  Wq, Wk, Wv, Wo : 4·d²' + ' = ' + M(attn) + '\\n' +
      (swi
        ? '  FFN SwiGLU W_gate, W_up, W_down : 3·d·' + hidden + ' = ' + M(ffn) + '\\n'
        : '  FFN W1 (d×4d) + W2 (4d×d) : 8·d² = ' + M(ffn) + '\\n') +
      '  total ≈ ' + M(tot) + '  (≈ 12·d²)';
  }

  $('bA').onclick = () => { mode = 'attn'; $('bA').className = 'on'; $('bF').className = ''; diagram(); };
  $('bF').onclick = () => { mode = 'ffn'; $('bF').className = 'on'; $('bA').className = ''; diagram(); };
  $('d').onchange = params;
  $('swi').onchange = params;
  diagram();
  params();
</script>`,
      },
      {
        title: 'The FFN only sees its own token',
        lang: 'js',
        code: `// The FFN runs on each token separately: d_model = 2 → hidden 8 → 2.
const W1 = [
  [1.0, -1.0, 0.5, 0.0, -0.5, 1.0, 0.0, 0.5],
  [0.0, 0.5, 1.0, -1.0, 0.5, 0.0, -0.5, 1.0],
];
const b1 = [0, 0, -0.5, 0, 0, -1, 0, 0];
const W2 = [
  [0.5, 0.0], [-0.5, 0.5], [0.0, 1.0], [0.5, -0.5],
  [0.0, 0.5], [1.0, 0.0], [-0.5, 0.0], [0.0, 0.5],
];

const gelu = x =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

// v (length n) × M (n × m) → length m
const vecMat = (v, M) => M[0].map((_, j) => v.reduce((s, x, k) => s + x * M[k][j], 0));

function ffn(x) {
  const pre = vecMat(x, W1).map((z, j) => z + b1[j]); // ① expand 2 → 8
  const act = pre.map(gelu); // ② nonlinearity
  return vecMat(act, W2); // ③ shrink 8 → 2
}

const f2 = v => '[' + v.map(n => n.toFixed(3)).join(', ') + ']';

const tokens = [[1.0, 0.0], [0.0, 1.0], [0.5, 0.5]];
console.log('Sequence 1');
tokens.forEach((t, i) => console.log(\`  token \${i} \${f2(t)} -> \${f2(ffn(t))}\`));

// Change ONLY token 1. Tokens 0 and 2 give identical outputs.
const tokens2 = [[1.0, 0.0], [-2.0, 3.0], [0.5, 0.5]];
console.log('Sequence 2 (token 1 changed)');
tokens2.forEach((t, i) => console.log(\`  token \${i} \${f2(t)} -> \${f2(ffn(t))}\`));

// Parameter count for a real-sized FFN
const d = 4096;
const params = d * 4 * d + 4 * d + 4 * d * d + d;
console.log('FFN params at d_model = 4096:', params.toLocaleString('en-US'));`,
        explain: `
          <details>
            <summary>What to notice</summary>
            <p>Sequence 2 changes only token 1, to <code>[-2, 3]</code>. Tokens 0 and 2 print exactly the same outputs as before (<code>[0.500, 0.016]</code> and <code>[0.042, 0.467]</code>), because <code>ffn(x)</code> takes one token vector and never looks at its neighbours. In attention, changing one token would change every later token's output.</p>
            <p>The last line is <code>4096·16384 + 16384 + 16384·4096 + 4096 = 134,238,208</code>, about 134M parameters in <em>one</em> block's FFN at d_model = 4096 with the classic 4× expansion. Multiply by 32 blocks and you're past 4B.</p>
          </details>
        `,
      },
      {
        title: 'In PyTorch: classic FFN and SwiGLU',
        runnable: false,
        lang: 'python',
        code: `import torch.nn as nn
import torch.nn.functional as F

class FFN(nn.Module):                     # GPT-2 style
    def __init__(self, d_model):
        super().__init__()
        self.up = nn.Linear(d_model, 4 * d_model)
        self.down = nn.Linear(4 * d_model, d_model)

    def forward(self, x):                 # x: [B, T, d_model]
        return self.down(F.gelu(self.up(x)))


class SwiGLU(nn.Module):                  # Llama style
    def __init__(self, d_model, hidden):  # e.g. hidden ≈ 8 * d_model / 3
        super().__init__()
        self.w_gate = nn.Linear(d_model, hidden, bias=False)
        self.w_up = nn.Linear(d_model, hidden, bias=False)
        self.w_down = nn.Linear(hidden, d_model, bias=False)

    def forward(self, x):
        return self.w_down(F.silu(self.w_gate(x)) * self.w_up(x))`,
      },
    ],
    quiz: [
      {
        q: 'In GPT-2 small (d_model = 768), what is the FFN hidden size?',
        options: ['768', '1536', '3072', '50257'],
        answer: 2,
        why: 'The classic expansion factor is 4: 4 × 768 = 3072.',
      },
      {
        q: 'Which sub-layer moves information BETWEEN token positions?',
        options: ['The FFN', 'LayerNorm', 'Attention', 'Both FFN and attention equally'],
        answer: 2,
        why: 'The FFN is applied to each position independently. Only attention mixes tokens.',
      },
      {
        q: 'Ignoring biases and embeddings, what fraction of a standard block\'s parameters are in the FFN?',
        options: ['About 1/3', 'About 1/2', 'About 2/3', 'About 9/10'],
        answer: 2,
        why: 'The FFN has 8d² and attention has 4d². 8/12 = 2/3.',
      },
      {
        q: 'Why is the SwiGLU hidden size usually about 8d/3 instead of 4d?',
        options: [
          'SiLU needs smaller layers',
          'SwiGLU has three weight matrices instead of two; shrinking the hidden size keeps total parameters about 8d²',
          'To make it faster than attention',
          'It is a bug copied from Llama',
        ],
        answer: 1,
        why: '3 · d · (8d/3) = 8d², the same budget as the two-matrix 4d FFN.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement a SwiGLU FFN: <code>out = W_down( SiLU(x·W_gate) ⊙ (x·W_up) )</code> with <code>d_model = 2</code> and <code>hidden = 3</code>.</p>
        <p>Expected: <code>x [1,0] → 0.887, 0.156</code>, <code>x [0,1] → -0.134, 0.597</code>, <code>x [1,1] → 1.038, -0.189</code>.</p>`,
      starter: `// SwiGLU FFN (Llama-style): out = W_down( SiLU(x·W_gate) ⊙ (x·W_up) )
// d_model = 2, hidden = 3
const W_gate = [
  [1.0, -1.0, 0.5],
  [0.5, 1.0, -1.0],
];
const W_up = [
  [1.0, 0.0, 1.0],
  [0.0, 1.0, 1.0],
];
const W_down = [
  [1.0, 0.0],
  [0.0, 1.0],
  [0.5, 0.5],
];

const vecMat = (v, M) => M[0].map((_, j) => v.reduce((s, x, k) => s + x * M[k][j], 0));
const silu = z => z / (1 + Math.exp(-z)); // a.k.a. swish

function swiglu(x) {
  // TODO 1: gate = SiLU applied to x·W_gate
  // TODO 2: up = x·W_up
  // TODO 3: h = gate ⊙ up (element-wise product)
  // TODO 4: return h·W_down
  return [0, 0];
}

for (const x of [[1, 0], [0, 1], [1, 1]]) {
  console.log('x', JSON.stringify(x), '->', swiglu(x).map(v => v.toFixed(3)).join(', '));
}`,
      hint: 'const gate = vecMat(x, W_gate).map(silu); const up = vecMat(x, W_up); const h = gate.map((g, i) => g * up[i]); return vecMat(h, W_down);',
      solution: `// SwiGLU FFN (Llama-style): out = W_down( SiLU(x·W_gate) ⊙ (x·W_up) )
// d_model = 2, hidden = 3
const W_gate = [
  [1.0, -1.0, 0.5],
  [0.5, 1.0, -1.0],
];
const W_up = [
  [1.0, 0.0, 1.0],
  [0.0, 1.0, 1.0],
];
const W_down = [
  [1.0, 0.0],
  [0.0, 1.0],
  [0.5, 0.5],
];

const vecMat = (v, M) => M[0].map((_, j) => v.reduce((s, x, k) => s + x * M[k][j], 0));
const silu = z => z / (1 + Math.exp(-z)); // a.k.a. swish

function swiglu(x) {
  const gate = vecMat(x, W_gate).map(silu); // ① gate branch
  const up = vecMat(x, W_up); // ② value branch
  const h = gate.map((g, i) => g * up[i]); // ③ gate ⊙ up
  return vecMat(h, W_down); // ④ back to d_model
}

for (const x of [[1, 0], [0, 1], [1, 1]]) {
  console.log('x', JSON.stringify(x), '->', swiglu(x).map(v => v.toFixed(3)).join(', '));
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── block
  {
    id: 'block',
    section: 'The Transformer Block',
    title: 'Putting a Block Together',
    explain: `
      <p>You now have every part. A <strong>transformer block</strong> (decoder-style, pre-LN, as in GPT-2 and Llama) is just two residual sub-layers:</p>
      <pre><code>def block(x):                      # x: [T, d_model]
    x = x + attention(LN1(x))      # tokens talk   (causal multi-head attention)
    x = x + ffn(LN2(x))            # tokens think  (per-token MLP)
    return x                       # still [T, d_model]</code></pre>
      <p>Input and output have the <strong>same shape</strong>, so blocks stack like LEGO. A whole GPT is:</p>
      <pre><code>x = token_embedding[ids] + position_embedding[0..T-1]   # [T, d]  (RoPE models skip the add)
for block in blocks:          # N times: 12 (GPT-2 small) … 80+ (large models)
    x = block(x)
x = final_LN(x)
logits = x @ W_vocab          # [T, vocab]  → next lesson section</code></pre>

      <h3>Shapes through one block</h3>
      <table>
        <tr><th>Stage</th><th>Shape</th><th>Notes</th></tr>
        <tr><td>input x</td><td><code>[T, d]</code></td><td>residual stream</td></tr>
        <tr><td>LN1(x)</td><td><code>[T, d]</code></td><td>per-token normalization</td></tr>
        <tr><td>Q, K, V</td><td><code>[h, T, d/h]</code></td><td>project, then split into h heads</td></tr>
        <tr><td>scores = QKᵀ/√d_head</td><td><code>[h, T, T]</code></td><td>+ causal mask, softmax per row</td></tr>
        <tr><td>weights · V → concat → W_o</td><td><code>[T, d]</code></td><td>attention output</td></tr>
        <tr><td>x + attn</td><td><code>[T, d]</code></td><td>residual #1</td></tr>
        <tr><td>FFN hidden</td><td><code>[T, 4d]</code></td><td>expand + GELU</td></tr>
        <tr><td>x + ffn</td><td><code>[T, d]</code></td><td>residual #2 = block output</td></tr>
      </table>

      <h3>Parameter count ≈ 12·d² per block</h3>
      <p>Attention <code>4d²</code> plus FFN <code>8d²</code> (plus small biases and LayerNorm vectors). For GPT-2 small, d = 768 and N = 12, so <code>12 · 768² · 12 ≈ 85M</code> in the blocks. Add the token embedding (50257 × 768 ≈ 38.6M) and positions (1024 × 768 ≈ 0.8M) to reach the familiar <strong>≈124M</strong>. The same formula explains the big ones: GPT-3's d = 12288 and N = 96 give <code>12 · 12288² · 96 ≈ 174B</code>, close to its advertised 175B.</p>
      <div class="tip">Different blocks tend to specialize: early layers handle local syntax and token identity, middle layers build more abstract features, late layers shape the next-token prediction. But the <em>code</em> of every block is identical. Only the learned weights differ.</div>
      <div class="warn">The causal mask matters most in training, when the model processes all T positions at once and must not peek at the tokens it's asked to predict. Forget it and training loss drops suspiciously fast, but generation is garbage.</div>
    `,
    examples: [
      {
        title: 'Step through a pre-LN decoder block',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .wrap { display:flex; gap:12px; }
  .info { flex:1; font-size:13px; line-height:1.5; }
  .info h4 { margin:0 0 4px; font-size:15px; }
  .shape { font-family:ui-monospace, monospace; background:#f3f4f8; padding:2px 6px; border-radius:4px; }
  .bar { margin-bottom:8px; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Click <b>next ▶</b> (or <b>play</b>) to follow the data up through one block. The highlighted box is the current stage; the text on the right shows its tensor shape.</div>
  <div class="bar">
    <button id="prev">◀ prev</button>
    <button id="next">next ▶</button>
    <button id="play">▶ play</button>
    <span class="muted">T = 5 tokens, d_model = 768, 12 heads (GPT-2 small sizes)</span>
  </div>
  <div class="wrap">
    <svg id="svg" width="300" height="380"></svg>
    <div class="info" id="info"></div>
  </div>
</div>
<script>
  const $ = id => document.getElementById(id);
  const T = 5;
  const D = 768;
  const H = 12;
  const stages = [
    { y: 340, label: 'x (from previous block)', shape: '[T, d] = [' + T + ', ' + D + ']',
      text: 'The residual stream: one d_model-sized vector per token. Block 1 receives token embeddings + positions; later blocks receive the previous block\\'s output.' },
    { y: 290, label: 'LayerNorm 1', shape: '[' + T + ', ' + D + ']',
      text: 'Normalize each token vector separately (mean 0, var 1, then γ, β). Pre-LN: we normalize a <em>copy</em> going into the sub-layer; the stream itself is untouched.' },
    { y: 240, label: 'Multi-head attention (causal)', shape: 'Q,K,V: [' + H + ', ' + T + ', ' + (D / H) + '] · scores: [' + H + ', ' + T + ', ' + T + ']',
      text: 'Project to Q, K, V, split into ' + H + ' heads of d_head = ' + (D / H) + ', causal-masked softmax(QKᵀ/√d_head)·V, concat heads, output projection W_o. Output shape back to [' + T + ', ' + D + ']. <b>Tokens talk to each other here.</b>' },
    { y: 190, label: '⊕  x + attn', shape: '[' + T + ', ' + D + ']', add: true,
      text: 'Residual add #1: the attention result is <em>added</em> to the stream. If attention has nothing useful to say, it can output ~0 and x passes through unchanged.' },
    { y: 140, label: 'LayerNorm 2', shape: '[' + T + ', ' + D + ']',
      text: 'Normalize again before the FFN (a separate LayerNorm with its own γ, β).' },
    { y: 90, label: 'FFN  d → 4d → d (GELU)', shape: 'hidden: [' + T + ', ' + (4 * D) + '] → [' + T + ', ' + D + ']',
      text: 'The same 2-layer MLP applied to every token independently: expand to 4·d = ' + (4 * D) + ', GELU, project back. <b>Each token thinks on its own here.</b>' },
    { y: 40, label: '⊕  x + ffn', shape: '[' + T + ', ' + D + ']', add: true,
      text: 'Residual add #2. The result is the block output: same shape as the input, so blocks stack like LEGO. GPT-2 small stacks 12 of them, then a final LayerNorm + LM head.' },
  ];
  let step = 0;
  let timer = null;

  function draw() {
    let s = '<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#888"/></marker></defs>';
    // main vertical flow
    s += '<line x1="120" y1="355" x2="120" y2="20" stroke="#bbb" stroke-width="2"/>';
    // residual skip lines (right side)
    const skip = (from, to, on) =>
      '<path d="M120,' + from + ' H250 V' + to + ' H212" fill="none" stroke="' + (on ? '#2e7d32' : '#ccc') +
      '" stroke-width="' + (on ? 3 : 2) + '" marker-end="url(#ar)"/>';
    s += skip(322, 190, step === 3);
    s += skip(172, 40, step === 6);
    s += '<text x="256" y="262" font-size="11" fill="#2e7d32" transform="rotate(90 256 262)">residual</text>';
    s += '<text x="256" y="112" font-size="11" fill="#2e7d32" transform="rotate(90 256 112)">residual</text>';
    stages.forEach((st, i) => {
      const on = i === step;
      const done = i < step;
      const fill = on ? '#ffe9b3' : done ? '#eef3fc' : '#f7f7f7';
      const stroke = on ? '#d35400' : '#999';
      if (st.add) {
        s += '<rect x="30" y="' + (st.y - 16) + '" width="180" height="32" rx="16" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (on ? 2.5 : 1) + '"/>';
      } else {
        s += '<rect x="10" y="' + (st.y - 16) + '" width="220" height="32" rx="5" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (on ? 2.5 : 1) + '"/>';
      }
      s += '<text x="120" y="' + (st.y + 5) + '" text-anchor="middle" font-size="12">' + st.label + '</text>';
    });
    $('svg').innerHTML = s;
    const st = stages[step];
    $('info').innerHTML = '<h4>Step ' + (step + 1) + ' / ' + stages.length + ': ' + st.label + '</h4>' +
      '<div>shape: <span class="shape">' + st.shape + '</span></div><p>' + st.text + '</p>';
    $('prev').disabled = step === 0;
    $('next').disabled = step === stages.length - 1;
  }

  $('prev').onclick = () => { step = Math.max(0, step - 1); draw(); };
  $('next').onclick = () => { step = Math.min(stages.length - 1, step + 1); draw(); };
  $('play').onclick = () => {
    if (timer) { clearInterval(timer); timer = null; $('play').textContent = '▶ play'; return; }
    step = 0;
    draw();
    $('play').textContent = '■ stop';
    timer = setInterval(() => {
      if (step >= stages.length - 1) { clearInterval(timer); timer = null; $('play').textContent = '▶ play'; return; }
      step++;
      draw();
    }, 1400);
  };
  draw();
</script>`,
      },
      {
        title: 'A whole tiny block in numbers (T=3, d=4, 1 head)',
        lang: 'js',
        code: `// A whole pre-LN decoder block: T = 3 tokens, d_model = 4, 1 head.
const T = 3;
const D = 4;

// Input: embeddings + positions for 3 tokens (hard-coded)
const X = [
  [1.0, 0.0, 1.0, 0.0],
  [0.0, 2.0, 0.0, 1.0],
  [1.0, 1.0, 2.0, 0.0],
];

// Hard-coded weights (d_model × d_model)
const Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const Wk = [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]];
const Wv = [[1, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0.5]];
const Wo = [[0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5]];

// FFN: 4 → 8 → 4 (real models expand 4×: 4 → 16 → 4)
const W1 = [
  [1, 0, 0, 0, -1, 0, 1, 0],
  [0, 1, 0, 0, 0, -1, 0, 1],
  [0, 0, 1, 0, 1, 0, 0, -1],
  [0, 0, 0, 1, 0, 1, -1, 0],
];
const W2 = [
  [0.5, 0, 0, 0],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0.5, 0, 0, 0],
];

// ---- helpers ----
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const transpose = M => M[0].map((_, j) => M.map(r => r[j]));
const add = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));

function layerNorm(M, eps = 1e-5) {
  return M.map(row => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    const v = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
    return row.map(x => (x - mean) / Math.sqrt(v + eps)); // γ = 1, β = 0
  });
}

function softmaxRow(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

const gelu = x =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const show = (name, M) => {
  console.log(name + '  [' + M.length + ' × ' + M[0].length + ']');
  M.forEach((r, i) => console.log('  t' + i + ': ' + r.map(v => v.toFixed(2).padStart(6)).join(' ')));
};

// ---- the block ----
show('x (input)', X);

// ① Attention sub-layer: LN → attention → add back
const h1 = layerNorm(X);
show('LN1(x)', h1);

const Q = matmul(h1, Wq);
const K = matmul(h1, Wk);
const V = matmul(h1, Wv);

const scores = matmul(Q, transpose(K)).map(r => r.map(s => s / Math.sqrt(D)));
const masked = scores.map((r, i) => r.map((s, j) => (j > i ? -Infinity : s))); // ② causal
const A = masked.map(softmaxRow);
show('attention weights (causal)', A);

const attnOut = matmul(matmul(A, V), Wo);
show('attn output', attnOut);

const x1 = add(X, attnOut); // ③ residual #1
show('x1 = x + attn', x1);

// ④ FFN sub-layer: LN → expand → GELU → shrink → add back
const h2 = layerNorm(x1);
const hidden = matmul(h2, W1).map(r => r.map(gelu));
const ffnOut = matmul(hidden, W2);
show('ffn output', ffnOut);

const out = add(x1, ffnOut); // ⑤ residual #2
show('block output', out);`,
        explain: `
          <details>
            <summary>The problem: "a block" is a lot of moving parts</summary>
            <p>Diagrams hide the details. This example runs every operation of a real pre-LN decoder block with numbers small enough to check by hand: 3 tokens, d_model = 4, 1 head (d_head = 4), FFN 4 → 8 → 4 (real models use 4× expansion, which would be 16 here). The weights are hand-picked: <code>W_q</code> is the identity, <code>W_k</code> swaps dimension pairs, and <code>W_v</code>, <code>W_o</code> are simple scalings. So you can see <em>what</em> happens, not just that numbers change.</p>
          </details>
          <details>
            <summary>Step by step: each printed tensor</summary>
            <table>
              <tr><th>Stage</th><th>Shape</th><th>Row t0 (console)</th><th>Why</th></tr>
              <tr><td>x (input)</td><td>3×4</td><td><code>1.00 0.00 1.00 0.00</code></td><td>hard-coded embeddings + positions</td></tr>
              <tr><td>LN1(x)</td><td>3×4</td><td><code>1.00 -1.00 1.00 -1.00</code></td><td>mean 0.5, var 0.25, std 0.5 → (x−0.5)/0.5</td></tr>
              <tr><td>attention weights</td><td>3×3</td><td><code>1.00 0.00 0.00</code></td><td>t0 can only see itself (causal). t1: <code>0.97 0.03 0.00</code> from scores 1.81 vs −1.64. t2: <code>0.09 0.86 0.05</code> from scores −1.41, 0.85, −2.00</td></tr>
              <tr><td>attn output</td><td>3×4</td><td><code>0.50 -0.25 0.50 -0.25</code></td><td>t0 copies its own V = <code>[1, −0.5, 1, −0.5]</code>, then W_o halves it</td></tr>
              <tr><td>x1 = x + attn</td><td>3×4</td><td><code>1.50 -0.25 1.50 -0.25</code></td><td>residual #1: <code>[1,0,1,0] + [0.5,−0.25,0.5,−0.25]</code></td></tr>
              <tr><td>ffn output</td><td>3×4</td><td><code>0.40 -0.08 0.42 0.90</code></td><td>LN2(x1) ≈ <code>[1,−1,1,−1]</code> → W₁ → GELU → W₂</td></tr>
              <tr><td>block output</td><td>3×4</td><td><code>1.90 -0.33 1.92 0.65</code></td><td>residual #2: x1 + ffn</td></tr>
            </table>
            <p>Full final output: t1 = <code>1.59 2.58 0.36 0.64</code>, t2 = <code>0.50 2.30 2.21 0.39</code>. Notice how t1's attention output (<code>0.47 -0.23 0.47 -0.24</code>) is almost t0's, because t1 put 97% of its attention on t0. Information moved from position 0 to position 1.</p>
          </details>
          <details>
            <summary>Key lines explained ①②③④⑤</summary>
            <pre><code>const h1 = layerNorm(X);                        // ① normalize a COPY
const masked = scores.map((r, i) =&gt;
  r.map((s, j) =&gt; (j &gt; i ? -Infinity : s)));    // ② causal mask
const x1 = add(X, attnOut);                     // ③ residual #1 (adds to the RAW X)
const h2 = layerNorm(x1);                       // ④ FFN sub-layer on its own LN
const out = add(x1, ffnOut);                    // ⑤ residual #2</code></pre>
            <ol>
              <li><strong>①</strong> Pre-LN: the sub-layer sees normalized input, but <code>X</code> itself is not replaced.</li>
              <li><strong>②</strong> Future positions (<code>j &gt; i</code>) get −∞, so <code>exp(−∞) = 0</code>. That's why the upper triangle of the weights is exactly 0.00.</li>
              <li><strong>③</strong> The attention result is added to the <em>un-normalized</em> <code>X</code>. That's the clean identity path.</li>
              <li><strong>④</strong> A second, independent LayerNorm feeds the FFN, which runs row by row (per token).</li>
              <li><strong>⑤</strong> The output has the same shape as the input, ready for the next block.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Delete the mask line (use <code>scores</code> instead of <code>masked</code>). t0's weights stop being <code>1.00 0.00 0.00</code>: it now peeks at the future.</li>
              <li>Replace <code>add(X, attnOut)</code> with just <code>attnOut</code>. Token t0's original identity <code>[1,0,1,0]</code> is lost from the stream.</li>
              <li>Set <code>Wo</code> to all zeros. Attention adds nothing, and <code>x1</code> equals <code>x</code> exactly: a "do-nothing" layer is easy for a residual block.</li>
            </ul>
            <div class="warn">Common mistake: writing <code>x = layerNorm(x)</code> and then <code>x = x + attn(x)</code>. That replaces the stream with its normalized version, which is neither pre-LN nor post-LN. Keep the normalized value in a separate variable (<code>h1</code>).</div>
          </details>
        `,
      },
      {
        title: 'In PyTorch: a GPT-2 style block (~30 lines)',
        runnable: false,
        lang: 'python',
        code: `import torch.nn as nn
import torch.nn.functional as F

class Block(nn.Module):
    def __init__(self, d_model=768, n_heads=12):
        super().__init__()
        self.n_heads = n_heads
        self.ln1 = nn.LayerNorm(d_model)
        self.qkv = nn.Linear(d_model, 3 * d_model)   # W_q, W_k, W_v fused
        self.proj = nn.Linear(d_model, d_model)      # W_o
        self.ln2 = nn.LayerNorm(d_model)
        self.ffn = nn.Sequential(
            nn.Linear(d_model, 4 * d_model),
            nn.GELU(),
            nn.Linear(4 * d_model, d_model),
        )

    def attn(self, x):
        B, T, C = x.shape
        q, k, v = self.qkv(x).split(C, dim=-1)
        # [B, T, C] -> [B, heads, T, d_head]
        q, k, v = (
            t.view(B, T, self.n_heads, C // self.n_heads).transpose(1, 2)
            for t in (q, k, v)
        )
        y = F.scaled_dot_product_attention(q, k, v, is_causal=True)
        y = y.transpose(1, 2).contiguous().view(B, T, C)   # concat heads
        return self.proj(y)

    def forward(self, x):                  # x: [B, T, d_model]
        x = x + self.attn(self.ln1(x))     # residual #1
        x = x + self.ffn(self.ln2(x))      # residual #2
        return x`,
      },
    ],
    quiz: [
      {
        q: 'Which is the correct pre-LN block?',
        options: [
          'x = LN(x + attn(x)); x = LN(x + ffn(x))',
          'x = x + attn(LN(x)); x = x + ffn(LN(x))',
          'x = attn(LN(x)); x = ffn(LN(x))',
          'x = LN(attn(ffn(x)))',
        ],
        answer: 1,
        why: 'Pre-LN normalizes the input of each sub-layer and adds the result back to the un-normalized stream. Option A is post-LN (2017).',
      },
      {
        q: 'A block receives x of shape [T=10, d=512]. What shape does it output?',
        options: ['[10, 2048]', '[10, 10]', '[10, 512]', '[512, 512]'],
        answer: 2,
        why: 'Blocks preserve shape so they can be stacked and so residuals can add.',
      },
      {
        q: 'Roughly how many parameters does one block with d_model = 1024 have (ignoring biases/LN)?',
        options: ['≈ 1M', '≈ 4M', '≈ 12.6M', '≈ 100M'],
        answer: 2,
        why: '12 · 1024² ≈ 12.6M: 4d² for attention plus 8d² for the FFN.',
      },
      {
        q: 'In the tiny block example, why is token t0\'s attention row exactly 1.00 0.00 0.00?',
        options: ['Because W_q is the identity', 'The causal mask: t0 can only attend to itself', 'Because LN made it zero', 'Rounding error'],
        answer: 1,
        why: 'Scores for j > 0 are set to −∞, so softmax puts all weight on position 0.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>The helpers, weights, <code>attention(h)</code> and <code>ffn(h)</code> are written for you. Wire up <code>preLNBlock(x)</code>: <code>x1 = x + attention(LN(x))</code>, then <code>out = x1 + ffn(LN(x1))</code>. The output must match the example exactly: t0 = <code>1.90 -0.33 1.92 0.65</code>.</p>
        <p>Bonus: implement the original post-LN block <code>LN(x + attention(x))</code> → <code>LN(x1 + ffn(x1))</code> and compare. (Expected t0: <code>0.93 -1.41 0.96 -0.48</code>. Post-LN outputs always have mean 0 and variance 1 per token.)</p>`,
      starter: `// Exercise: wire up the block yourself. Same weights as the example above.
const T = 3;
const D = 4;

// Input: embeddings + positions for 3 tokens (hard-coded)
const X = [
  [1.0, 0.0, 1.0, 0.0],
  [0.0, 2.0, 0.0, 1.0],
  [1.0, 1.0, 2.0, 0.0],
];

// Hard-coded weights (d_model × d_model)
const Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const Wk = [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]];
const Wv = [[1, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0.5]];
const Wo = [[0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5]];

// FFN: 4 → 8 → 4 (real models expand 4×: 4 → 16 → 4)
const W1 = [
  [1, 0, 0, 0, -1, 0, 1, 0],
  [0, 1, 0, 0, 0, -1, 0, 1],
  [0, 0, 1, 0, 1, 0, 0, -1],
  [0, 0, 0, 1, 0, 1, -1, 0],
];
const W2 = [
  [0.5, 0, 0, 0],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0.5, 0, 0, 0],
];

// ---- helpers ----
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const transpose = M => M[0].map((_, j) => M.map(r => r[j]));
const add = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));

function layerNorm(M, eps = 1e-5) {
  return M.map(row => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    const v = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
    return row.map(x => (x - mean) / Math.sqrt(v + eps)); // γ = 1, β = 0
  });
}

function softmaxRow(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

const gelu = x =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const show = (name, M) => {
  console.log(name + '  [' + M.length + ' × ' + M[0].length + ']');
  M.forEach((r, i) => console.log('  t' + i + ': ' + r.map(v => v.toFixed(2).padStart(6)).join(' ')));
};

// ---- sub-layers (already written for you) ----
function attention(h) {
  const Q = matmul(h, Wq);
  const K = matmul(h, Wk);
  const V = matmul(h, Wv);
  const scores = matmul(Q, transpose(K)).map(r => r.map(s => s / Math.sqrt(D)));
  const masked = scores.map((r, i) => r.map((s, j) => (j > i ? -Infinity : s)));
  return matmul(matmul(masked.map(softmaxRow), V), Wo);
}

function ffn(h) {
  return matmul(matmul(h, W1).map(r => r.map(gelu)), W2);
}

// TODO: pre-LN block:  x1 = x + attention(LN(x));  out = x1 + ffn(LN(x1))
function preLNBlock(x) {
  return x; // replace me
}

// TODO (bonus): post-LN block (2017 paper):  x1 = LN(x + attention(x));  out = LN(x1 + ffn(x1))
function postLNBlock(x) {
  return x; // replace me
}

show('pre-LN block output', preLNBlock(X));
show('post-LN block output', postLNBlock(X));`,
      hint: 'const x1 = add(x, attention(layerNorm(x))); return add(x1, ffn(layerNorm(x1))); For post-LN, move layerNorm outside: layerNorm(add(x, attention(x))).',
      solution: `// Exercise: wire up the block yourself. Same weights as the example above.
const T = 3;
const D = 4;

// Input: embeddings + positions for 3 tokens (hard-coded)
const X = [
  [1.0, 0.0, 1.0, 0.0],
  [0.0, 2.0, 0.0, 1.0],
  [1.0, 1.0, 2.0, 0.0],
];

// Hard-coded weights (d_model × d_model)
const Wq = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]];
const Wk = [[0, 1, 0, 0], [1, 0, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0]];
const Wv = [[1, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 1, 0], [0, 0, 0, 0.5]];
const Wo = [[0.5, 0, 0, 0], [0, 0.5, 0, 0], [0, 0, 0.5, 0], [0, 0, 0, 0.5]];

// FFN: 4 → 8 → 4 (real models expand 4×: 4 → 16 → 4)
const W1 = [
  [1, 0, 0, 0, -1, 0, 1, 0],
  [0, 1, 0, 0, 0, -1, 0, 1],
  [0, 0, 1, 0, 1, 0, 0, -1],
  [0, 0, 0, 1, 0, 1, -1, 0],
];
const W2 = [
  [0.5, 0, 0, 0],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0, 0.5, 0, 0],
  [0, 0, 0.5, 0],
  [0, 0, 0, 0.5],
  [0.5, 0, 0, 0],
];

// ---- helpers ----
const matmul = (A, B) =>
  A.map(row => B[0].map((_, j) => row.reduce((s, a, k) => s + a * B[k][j], 0)));
const transpose = M => M[0].map((_, j) => M.map(r => r[j]));
const add = (A, B) => A.map((r, i) => r.map((v, j) => v + B[i][j]));

function layerNorm(M, eps = 1e-5) {
  return M.map(row => {
    const mean = row.reduce((a, b) => a + b, 0) / row.length;
    const v = row.reduce((a, b) => a + (b - mean) ** 2, 0) / row.length;
    return row.map(x => (x - mean) / Math.sqrt(v + eps)); // γ = 1, β = 0
  });
}

function softmaxRow(row) {
  const m = Math.max(...row);
  const e = row.map(x => Math.exp(x - m));
  const s = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / s);
}

const gelu = x =>
  0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3)));

const show = (name, M) => {
  console.log(name + '  [' + M.length + ' × ' + M[0].length + ']');
  M.forEach((r, i) => console.log('  t' + i + ': ' + r.map(v => v.toFixed(2).padStart(6)).join(' ')));
};

// ---- sub-layers (already written for you) ----
function attention(h) {
  const Q = matmul(h, Wq);
  const K = matmul(h, Wk);
  const V = matmul(h, Wv);
  const scores = matmul(Q, transpose(K)).map(r => r.map(s => s / Math.sqrt(D)));
  const masked = scores.map((r, i) => r.map((s, j) => (j > i ? -Infinity : s)));
  return matmul(matmul(masked.map(softmaxRow), V), Wo);
}

function ffn(h) {
  return matmul(matmul(h, W1).map(r => r.map(gelu)), W2);
}

function preLNBlock(x) {
  const x1 = add(x, attention(layerNorm(x)));
  return add(x1, ffn(layerNorm(x1)));
}

function postLNBlock(x) {
  const x1 = layerNorm(add(x, attention(x)));
  return layerNorm(add(x1, ffn(x1)));
}

show('pre-LN block output', preLNBlock(X));
show('post-LN block output', postLNBlock(X));`,
    },
  },

  // ───────────────────────────────────────────────────────────── architectures
  {
    id: 'architectures',
    section: 'The Transformer Block',
    title: 'Encoder, Decoder & Encoder-Decoder',
    explain: `
      <p>The same building blocks can be arranged in three ways. The difference comes down to <strong>which tokens may attend to which</strong>, and whether there are one or two stacks.</p>

      <h3>Encoder-decoder: the 2017 original</h3>
      <p>"Attention Is All You Need" was built for <strong>translation</strong>. An <em>encoder</em> stack (6 blocks) reads the whole source sentence with <strong>bidirectional</strong> self-attention. A <em>decoder</em> stack (6 blocks) generates the target one token at a time. Each decoder block has three sub-layers: causal self-attention, then <strong>cross-attention</strong> (queries from the decoder, keys and values from the encoder output), then the FFN. T5 (2019) and BART follow this design, and T5 casts every task as "text in → text out".</p>

      <h3>Encoder-only: BERT (2018)</h3>
      <p>Only the encoder stack, with bidirectional attention: every token sees the whole input. It's trained with <strong>masked language modeling</strong>: hide about 15% of tokens (<code>[MASK]</code>) and predict them from both sides. BERT gives excellent representations for classification, named-entity tagging and search embeddings. But it doesn't naturally <em>generate</em> text left to right.</p>

      <h3>Decoder-only: GPT (2018 →)</h3>
      <p>Only the decoder stack, <em>without</em> cross-attention, and with a <strong>causal mask</strong>. It's trained on plain next-token prediction. The prompt and the answer live in the same sequence. GPT-2/3/4, Llama, Mistral, Qwen, Gemma, Claude-style assistants: essentially all of today's general-purpose LLMs are decoder-only.</p>

      <table>
        <tr><th></th><th>Encoder-only</th><th>Decoder-only</th><th>Encoder-decoder</th></tr>
        <tr><td>Examples</td><td>BERT, RoBERTa</td><td>GPT, Llama, Mistral, Qwen</td><td>original Transformer, T5, BART</td></tr>
        <tr><td>Self-attention</td><td>bidirectional</td><td>causal</td><td>enc: bidirectional; dec: causal</td></tr>
        <tr><td>Cross-attention</td><td>no</td><td>no</td><td>yes (decoder → encoder)</td></tr>
        <tr><td>Training objective</td><td>masked LM (fill in blanks)</td><td>next-token prediction</td><td>seq-to-seq (e.g. span corruption, translation)</td></tr>
        <tr><td>Good at</td><td>understanding, embeddings, classification</td><td>generation, in-context learning, chat</td><td>input → output transforms (translate, summarize)</td></tr>
      </table>

      <h3>Why decoder-only won for LLMs</h3>
      <ul>
        <li><strong>Every token is a training signal.</strong> Next-token prediction gets a loss at <em>every</em> position. MLM only learns from the ~15% of tokens that were masked.</li>
        <li><strong>One model, one format.</strong> Any task becomes "continue this text": the prompt, few-shot examples and answer are all one sequence. There's no separate input/output split to design.</li>
        <li><strong>Generation is native</strong>, and the causal structure enables the KV cache (next section), which makes long generation cheap.</li>
        <li><strong>Simplicity scales.</strong> One stack, one mask, one objective. At large scale, the extra inductive bias of an encoder didn't seem to pay off for general-purpose models. Encoder-decoders remain strong for specific input→output tasks, and encoders still dominate embeddings and retrieval.</li>
      </ul>
      <div class="tip">"Decoder" here just means "causal-masked self-attention stack". A GPT block is the original decoder block with the cross-attention sub-layer removed, which is exactly the block you built in the previous lesson.</div>
    `,
    examples: [
      {
        title: 'Attention masks: bidirectional vs causal vs cross',
        code: `<style>
  .card { background:#fff; color:#1a1a1a; padding:12px; border-radius:8px; max-width:660px; font:14px system-ui, sans-serif; }
  .row { margin-bottom:8px; }
  button.on { background:#2e6fd8; color:#fff; border-color:#2e6fd8; }
  .wrap { display:flex; gap:14px; }
  .info { flex:1; font-size:13px; line-height:1.5; }
  .muted { color:#666; font-size:12px; }
</style>
<div class="card">
  <div style="font-size:13px;color:#444;margin-bottom:8px;">Click a button to switch architecture, then hover any cell. ✓ = the query (row) may attend to the key (column); −∞ = blocked.</div>
  <div class="row">
    <button data-m="enc" class="on">Encoder (BERT)</button>
    <button data-m="dec">Decoder (GPT)</button>
    <button data-m="cross">Cross-attention (T5 / 2017)</button>
  </div>
  <div class="wrap">
    <svg id="svg" width="330" height="330"></svg>
    <div class="info">
      <div id="desc"></div>
      <p id="hover" class="muted">Hover a cell: row = the query token (who is looking), column = the key token (who is being looked at).</p>
    </div>
  </div>
</div>
<script>
  const $ = id => document.getElementById(id);
  const SRC = ['Le', 'chat', 'est', 'noir'];
  const TGT = ['The', 'cat', 'is', 'black'];
  const ENC = ['The', 'cat', '[MASK]', 'black'];
  let mode = 'enc';
  const DESC = {
    enc: '<b>Bidirectional self-attention.</b> Every token sees every token, left and right. Great for understanding a whole input (classification, search embeddings). BERT is trained to fill in [MASK]: to guess it, "[MASK]" looks at both "cat" and "black".',
    dec: '<b>Causal self-attention.</b> Token i sees only tokens 0…i. Required for next-token prediction: if "cat" could see "is", predicting "is" would be cheating. GPT and nearly all modern LLMs are decoder-only.',
    cross: '<b>Cross-attention.</b> Queries come from the decoder (target, English), keys/values from the encoder output (source, French). No mask needed across: the whole source is known. The decoder ALSO has its own causal self-attention in a separate sub-layer.',
  };

  function draw() {
    const rows = mode === 'enc' ? ENC : TGT;
    const cols = mode === 'enc' ? ENC : mode === 'dec' ? TGT : SRC;
    const allowed = (i, j) => (mode === 'dec' ? j <= i : true);
    const c = 56;
    const ox = 70;
    const oy = 70;
    let s = '';
    cols.forEach((w, j) => {
      s += '<text x="' + (ox + j * c + c / 2) + '" y="' + (oy - 10) + '" text-anchor="middle" font-size="12" fill="' +
        (mode === 'cross' ? '#8e44ad' : '#1a1a1a') + '">' + w + '</text>';
    });
    s += '<text x="' + (ox + 2 * c) + '" y="18" text-anchor="middle" font-size="11" fill="#666">keys / values' +
      (mode === 'cross' ? ' (encoder output, French)' : '') + '</text>';
    rows.forEach((w, i) => {
      s += '<text x="' + (ox - 8) + '" y="' + (oy + i * c + c / 2 + 4) + '" text-anchor="end" font-size="12">' + w + '</text>';
      cols.forEach((_, j) => {
        const ok = allowed(i, j);
        s += '<rect class="cell" data-i="' + i + '" data-j="' + j + '" x="' + (ox + j * c + 2) + '" y="' + (oy + i * c + 2) +
          '" width="' + (c - 4) + '" height="' + (c - 4) + '" rx="4" fill="' + (ok ? (mode === 'cross' ? '#b18bd0' : '#5b8def') : '#eee') +
          '" stroke="#ccc"/>';
        s += '<text x="' + (ox + j * c + c / 2) + '" y="' + (oy + i * c + c / 2 + 5) + '" text-anchor="middle" font-size="13" fill="' +
          (ok ? '#fff' : '#aaa') + '" pointer-events="none">' + (ok ? '✓' : '−∞') + '</text>';
      });
    });
    s += '<text x="14" y="' + (oy + 2 * c) + '" font-size="11" fill="#666" transform="rotate(-90 14 ' + (oy + 2 * c) + ')" text-anchor="middle">queries</text>';
    $('svg').innerHTML = s;
    $('desc').innerHTML = DESC[mode];
    document.querySelectorAll('.cell').forEach(el => {
      el.onmouseenter = () => {
        const i = +el.dataset.i;
        const j = +el.dataset.j;
        const ok = allowed(i, j);
        $('hover').innerHTML = '"' + rows[i] + '" → "' + cols[j] + '": ' +
          (ok ? '<b>allowed</b> (score kept)' : '<b>blocked</b> (score set to −∞ → weight 0 after softmax)');
      };
    });
  }

  document.querySelectorAll('button[data-m]').forEach(b => {
    b.onclick = () => {
      mode = b.dataset.m;
      document.querySelectorAll('button[data-m]').forEach(x => x.classList.toggle('on', x === b));
      draw();
    };
  });
  draw();
</script>`,
      },
      {
        title: 'Building the masks in code',
        lang: 'js',
        code: `// Build the three attention patterns as 0/1 matrices (1 = allowed).
const T = 4;

const bidirectional = Array.from({ length: T }, () => Array(T).fill(1));
const causal = Array.from({ length: T }, (_, i) =>
  Array.from({ length: T }, (_, j) => (j <= i ? 1 : 0))
);
// Cross-attention: T_tgt = 4 queries × T_src = 3 keys, all allowed
const cross = Array.from({ length: T }, () => Array(3).fill(1));

const show = (name, M) => {
  console.log(name);
  M.forEach((r, i) => console.log('  q' + i + ' ' + r.join(' ')));
};

show('encoder (bidirectional)', bidirectional);
show('decoder (causal)', causal);
show('cross (4 target × 3 source)', cross);

// How masks are applied: blocked scores become -Infinity before softmax
const scores = [2.0, 1.0, 0.5, 3.0];
const row = scores.map((s, j) => (causal[1][j] ? s : -Infinity));
const e = row.map(Math.exp);
const sum = e.reduce((a, b) => a + b, 0);
console.log('row q1 masked scores:', row.join(', '));
console.log('row q1 weights:', e.map(x => (x / sum).toFixed(3)).join(', '));`,
        explain: `
          <details>
            <summary>What to notice</summary>
            <p>The cross-attention matrix isn't square: 4 target queries × 3 source keys. That's fine, because <code>Q·Kᵀ</code> is <code>[T_tgt, d] · [d, T_src]</code>. The last two lines show how a mask is applied in practice: blocked scores become <code>-Infinity</code>, and row q1's weights are <code>softmax(2, 1) = 0.731, 0.269</code> with exact zeros for the future.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Which model family is encoder-only and trained with masked language modeling?',
        options: ['GPT', 'BERT', 'T5', 'Llama'],
        answer: 1,
        why: 'BERT uses bidirectional attention and predicts masked tokens from both sides.',
      },
      {
        q: 'In cross-attention in an encoder-decoder model, where do Q, K and V come from?',
        options: [
          'All from the encoder',
          'All from the decoder',
          'Q from the decoder; K and V from the encoder output',
          'Q from the encoder; K and V from the decoder',
        ],
        answer: 2,
        why: 'The decoder asks the questions (queries) about the source sentence (keys/values from the encoder).',
      },
      {
        q: 'Why can\'t a BERT-style bidirectional model be trained on plain next-token prediction?',
        options: [
          'It has no FFN',
          'Every position can see the future tokens, so predicting the next token would be trivial copying',
          'It has no embeddings',
          'It can, and that is how BERT is trained',
        ],
        answer: 1,
        why: 'Without a causal mask, the answer is visible in the input. That is why BERT masks tokens instead.',
      },
      {
        q: 'Which is NOT a reason decoder-only models became the default for LLMs?',
        options: [
          'Loss at every token position',
          'Any task can be phrased as text continuation',
          'They see the whole input bidirectionally, including future tokens',
          'Simple architecture that scales well, plus a natural KV cache',
        ],
        answer: 2,
        why: 'Decoder-only models are causal: they explicitly do NOT see future tokens.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Build a <strong>prefix-LM</strong> mask: the first <code>P</code> tokens (the prompt) attend to each other bidirectionally, and every later token is causal. Key <code>j</code> is allowed for query <code>i</code> if <code>j ≤ i</code> <em>or</em> <code>j &lt; P</code>.</p>
        <p>Expected with T = 5, P = 2: rows <code>q0 1 1 0 0 0</code>, <code>q1 1 1 0 0 0</code>, <code>q2 1 1 1 0 0</code>, …</p>`,
      starter: `// Prefix-LM mask (used by e.g. some T5/UL2 variants): the first P tokens
// (the "prompt") see each other bidirectionally; the rest is causal.
const T = 5;
const P = 2;

function prefixMask(T, P) {
  // TODO: allowed if j <= i (causal) OR ... (both inside the prefix?)
  return Array.from({ length: T }, (_, i) =>
    Array.from({ length: T }, (_, j) => (j <= i ? 1 : 0))
  );
}

prefixMask(T, P).forEach((r, i) => console.log('q' + i, r.join(' ')));`,
      hint: 'Change the condition to (j <= i || j < P ? 1 : 0).',
      solution: `// Prefix-LM mask (used by e.g. some T5/UL2 variants): the first P tokens
// (the "prompt") see each other bidirectionally; the rest is causal.
const T = 5;
const P = 2;

function prefixMask(T, P) {
  // allowed if causal OR the key is inside the prefix
  return Array.from({ length: T }, (_, i) =>
    Array.from({ length: T }, (_, j) => (j <= i || j < P ? 1 : 0))
  );
}

prefixMask(T, P).forEach((r, i) => console.log('q' + i, r.join(' ')));`,
    },
  },
);
