// Section: Language as Numbers
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------
  {
    id: 'tokenization',
    section: 'Language as Numbers',
    title: 'Tokenization',
    explain: `
      <p>Neural networks eat numbers, not text. So step one for any language model is to chop text into pieces called <strong>tokens</strong> and give each piece an integer <strong>id</strong>. The component that does this is the <strong>tokenizer</strong>, and it is fixed before the model is trained.</p>
      <pre><code>"Tokenizers are fun"  →  ["Token", "izers", " are", " fun"]  →  [15001, 11341, 389, 1257]</code></pre>
      <p>(The ids above are made up. Every tokenizer has its own vocabulary.)</p>

      <h3>Three ways to chop</h3>
      <ul>
        <li><strong>Characters</strong>: vocabulary is tiny (~100–300 symbols) and nothing is ever "unknown". But sequences get very long (a 1,000-word essay ≈ 5,000+ tokens) and each token carries almost no meaning. The model has to spend its effort learning spelling.</li>
        <li><strong>Words</strong>: short sequences and meaningful tokens. But the vocabulary explodes (<code>run, runs, running, runner…</code>), and any word not seen in training (a typo, a new product name, <code>ChatGPT</code>) becomes a useless <code>&lt;UNK&gt;</code> token.</li>
        <li><strong>Subwords</strong> (the winner): frequent words stay whole (<code>" the"</code>), rare words are built from frequent pieces (<code>"token" + "ization"</code>), and in the worst case you fall back to single characters or bytes. There is no unknown word and sequences stay reasonably short.</li>
      </ul>

      <h3>Byte Pair Encoding (BPE)</h3>
      <p>BPE is the most common way to <em>learn</em> a subword vocabulary from a corpus. The idea is simple and greedy:</p>
      <ol>
        <li>Start with every word split into characters (plus an end-of-word marker).</li>
        <li>Count every adjacent pair of symbols across the corpus.</li>
        <li>Merge the most frequent pair into one new symbol and add it to the vocabulary.</li>
        <li>Repeat until the vocabulary reaches the target size.</li>
      </ol>
      <p>The output is an ordered <strong>list of merges</strong>. To tokenize new text, you split it into characters and replay the merges in the same order. It works a bit like a compression algorithm, and that's where BPE comes from (Gage, 1994). Sennrich et al. adapted it for neural translation in 2015.</p>

      <div class="tip"><strong>Real-world sizes.</strong> GPT-2 uses byte-level BPE with 50,257 tokens. Llama 2 uses 32,000. Llama 3 uses about 128k. OpenAI's <code>cl100k_base</code> (GPT-4) has about 100k and <code>o200k_base</code> (GPT-4o) about 200k. For English, one token is roughly ¾ of a word, or about 4 characters. "Byte-level" means the base alphabet is the 256 byte values, so <em>any</em> string (emoji, Thai, code) can be encoded.</div>

      <h3>Token ≠ word</h3>
      <p>Tokens often include the leading space (<code>" cat"</code> and <code>"cat"</code> are different tokens!), common words are single tokens, and rare words, numbers and non-English text split into several. That's why API pricing and context limits are counted in tokens, not words.</p>
      <div class="warn"><strong>Why LLMs struggle to count letters.</strong> Ask "how many r's in strawberry?" The model never sees the letters. It sees something like <code>["str", "aw", "berry"]</code> as three opaque ids. Counting letters means it has to <em>remember</em> how each token is spelled, and that information is only indirectly present in training data. The same goes for reversing strings and for arithmetic on long numbers.</div>
    `,
    examples: [
      {
        title: 'Tokenizer playground: characters vs words vs subwords',
        code: `<div class="card">
  <div class="hint">Type any text, then switch between the three modes and compare the token count. The small number under each chip is a (fake) token id.</div>
  <input id="txt" value="Tokenizers are unbelievably useful for transformers" />
  <div class="modes">
    <label><input type="radio" name="m" value="char" /> characters</label>
    <label><input type="radio" name="m" value="word" /> words</label>
    <label><input type="radio" name="m" value="sub" checked /> subwords (toy vocab)</label>
    <button id="straw">try "strawberry"</button>
  </div>
  <div id="chips"></div>
  <div id="stats"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  #txt { width: 96%; }
  .modes { margin: 8px 0; font-size: 14px; }
  .modes label { margin-right: 10px; }
  #chips { display: flex; flex-wrap: wrap; gap: 4px; min-height: 40px; margin: 8px 0; }
  .chip { padding: 3px 6px; border-radius: 5px; font: 14px ui-monospace, monospace; }
  .chip small { display: block; font-size: 10px; color: #555; text-align: center; }
  #stats { font-size: 14px; color: #333; }
</style>

<script>
  // A tiny hand-made subword vocabulary. Real ones are learned (BPE) and have 32k-200k entries.
  const SUB = ['token', 'izer', 'ize', 'ation', 'un', 'believ', 'able', 'ably', 'use', 'ful',
    'for', 'trans', 'form', 'er', 's', 'are', 'the', 'straw', 'berry', 'ing', 'ly', 'cat', 'ed'];
  const COLORS = ['#ffd6a5', '#caffbf', '#9bf6ff', '#bdb2ff', '#ffc6ff', '#fdffb6'];

  function greedySplit(word) {
    // Longest-match-first: take the longest vocab piece that fits, else one character.
    const out = [];
    let i = 0;
    const lower = word.toLowerCase();
    while (i < word.length) {
      let best = 1;
      for (const piece of SUB) {
        if (piece.length > best && lower.startsWith(piece, i)) best = piece.length;
      }
      out.push(word.slice(i, i + best));
      i += best;
    }
    return out;
  }

  function tokenize(text, mode) {
    if (mode === 'char') return [...text].map(c => (c === ' ' ? '␣' : c));
    const words = text.split(' ').filter(Boolean);
    if (mode === 'word') return words.map((w, i) => (i ? '␣' : '') + w);
    const toks = [];
    words.forEach((w, i) => {
      const parts = greedySplit(w);
      parts[0] = (i ? '␣' : '') + parts[0]; // leading space glued to the first piece
      toks.push(...parts);
    });
    return toks;
  }

  function idOf(tok) {
    // Fake but stable id: a small hash of the string.
    let h = 7;
    for (const c of tok) h = (h * 31 + c.charCodeAt(0)) % 50257;
    return h;
  }

  function render() {
    const text = document.getElementById('txt').value;
    const mode = document.querySelector('input[name=m]:checked').value;
    const toks = tokenize(text, mode);
    const box = document.getElementById('chips');
    box.innerHTML = '';
    toks.forEach((t, i) => {
      const d = document.createElement('span');
      d.className = 'chip';
      d.style.background = COLORS[i % COLORS.length];
      d.innerHTML = t.replace(/</g, '&lt;') + '<small>' + idOf(t) + '</small>';
      box.appendChild(d);
    });
    const nWords = text.split(' ').filter(Boolean).length;
    document.getElementById('stats').textContent =
      toks.length + ' tokens for ' + nWords + ' words (' + text.length + ' characters). ' +
      '␣ = a leading space, which is part of the token.';
  }

  document.getElementById('txt').oninput = render;
  document.querySelectorAll('input[name=m]').forEach(r => (r.onchange = render));
  document.getElementById('straw').onclick = () => {
    document.getElementById('txt').value = 'how many r in strawberry';
    render();
  };
  render();
</script>`,
      },
      {
        title: 'BPE step by step: watch merges build a vocabulary',
        code: `<div class="card">
  <div class="hint">Press <b>Next merge</b>. BPE counts every adjacent pair (weighted by word count), merges the orange winner into a new symbol (highlighted), and repeats.</div>
  <div class="row">
    <button id="next">Next merge ▶</button>
    <button id="reset">Reset</button>
    <span id="info"></span>
  </div>
  <div id="words"></div>
  <div class="cols">
    <div>
      <b>Pair counts (top 6)</b>
      <div id="pairs"></div>
    </div>
    <div>
      <b>Merges learned (in order)</b>
      <ol id="merges"></ol>
    </div>
  </div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  .row { margin-bottom: 8px; }
  #info { margin-left: 8px; color: #444; }
  .word { margin: 4px 0; display: flex; align-items: center; gap: 3px; }
  .word .lbl { width: 80px; color: #555; font-size: 12px; }
  .sym { font: 14px ui-monospace, monospace; padding: 2px 6px; border: 1px solid #b8c0d8; border-radius: 4px; background: #eef1fa; }
  .sym.new { background: #ffe08a; border-color: #d9a400; }
  .cols { display: flex; gap: 20px; margin-top: 10px; }
  .cols > div { flex: 1; }
  .bar { display: flex; align-items: center; gap: 6px; margin: 2px 0; font: 13px ui-monospace, monospace; }
  .bar i { display: inline-block; height: 12px; background: #7aa2f7; border-radius: 2px; }
  .bar.best i { background: #e0a000; }
  ol { margin: 4px 0; padding-left: 22px; font: 13px ui-monospace, monospace; }
</style>

<script>
  // Same corpus and algorithm as the code example below: word -> count
  const CORPUS = { low: 5, lower: 2, newest: 6, widest: 3 };
  let words, merges, lastNew;

  function reset() {
    words = Object.entries(CORPUS).map(([w, n]) => ({ w, n, symbols: [...w, '_'] }));
    merges = [];
    lastNew = null;
    draw();
  }

  function countPairs() {
    const pairs = new Map();
    for (const { symbols, n } of words) {
      for (let i = 0; i < symbols.length - 1; i++) {
        const key = symbols[i] + ' ' + symbols[i + 1];
        pairs.set(key, (pairs.get(key) || 0) + n);
      }
    }
    return pairs;
  }

  function bestPair(pairs) {
    let best = null;
    let bestCount = 0;
    for (const [k, c] of pairs) if (c > bestCount) { best = k; bestCount = c; }
    return best;
  }

  function step() {
    const pairs = countPairs();
    const best = bestPair(pairs);
    if (!best) return;
    const [a, b] = best.split(' ');
    for (const wd of words) {
      const out = [];
      for (let i = 0; i < wd.symbols.length; i++) {
        if (wd.symbols[i] === a && wd.symbols[i + 1] === b) { out.push(a + b); i++; }
        else out.push(wd.symbols[i]);
      }
      wd.symbols = out;
    }
    merges.push(a + ' + ' + b + ' → ' + a + b + '  (' + pairs.get(best) + ')');
    lastNew = a + b;
    draw();
  }

  function draw() {
    const W = document.getElementById('words');
    W.innerHTML = '';
    for (const { w, n, symbols } of words) {
      const row = document.createElement('div');
      row.className = 'word';
      row.innerHTML = '<span class="lbl">' + w + ' ×' + n + '</span>' + symbols
        .map(s => '<span class="sym' + (s === lastNew ? ' new' : '') + '">' + s + '</span>')
        .join('');
      W.appendChild(row);
    }
    const pairs = countPairs();
    const best = bestPair(pairs);
    const top = [...pairs].sort((x, y) => y[1] - x[1]).slice(0, 6);
    document.getElementById('pairs').innerHTML = top.map(([k, c]) =>
      '<div class="bar' + (k === best ? ' best' : '') + '"><span style="width:70px">' +
      k.replace(' ', ' + ') + '</span><i style="width:' + c * 14 + 'px"></i>' + c + '</div>'
    ).join('') || '<i>no pairs left</i>';
    document.getElementById('merges').innerHTML = merges.map(m => '<li>' + m + '</li>').join('');
    const vocab = new Set(Object.keys(CORPUS).flatMap(w => [...w, '_']));
    merges.forEach(m => vocab.add(m.split(' → ')[1].split(' ')[0]));
    document.getElementById('info').textContent =
      'vocab size: ' + vocab.size + ' · next merge: ' + (best ? best.replace(' ', ' + ') : 'none');
    document.getElementById('next').disabled = !best;
  }

  document.getElementById('next').onclick = step;
  document.getElementById('reset').onclick = reset;
  reset();
</script>`,
      },
      {
        title: 'BPE in code: learn 6 merges, then tokenize unseen words',
        lang: 'js',
        code: `// Tiny corpus: word -> how many times it appears
const corpus = { low: 5, lower: 2, newest: 6, widest: 3 };

// ① Start from characters. "_" marks the end of a word.
let words = Object.entries(corpus).map(([w, n]) => ({
  symbols: [...w, '_'],
  count: n,
}));

function countPairs(words) {
  const pairs = new Map();
  for (const { symbols, count } of words) {
    for (let i = 0; i < symbols.length - 1; i++) {
      const key = symbols[i] + ' ' + symbols[i + 1];
      pairs.set(key, (pairs.get(key) || 0) + count); // ② weighted by word count
    }
  }
  return pairs;
}

function mergePair(words, a, b) {
  return words.map(({ symbols, count }) => {
    const out = [];
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === a && symbols[i + 1] === b) {
        out.push(a + b); // ③ glue the pair into one new token
        i++;
      } else {
        out.push(symbols[i]);
      }
    }
    return { symbols: out, count };
  });
}

const merges = [];
const vocab = new Set(words.flatMap(w => w.symbols));
console.log('start vocab (' + vocab.size + '):', [...vocab].join(' '));

for (let step = 1; step <= 6; step++) {
  const pairs = countPairs(words);
  let best = null;
  let bestCount = 0;
  for (const [key, n] of pairs) {
    if (n > bestCount) { best = key; bestCount = n; } // first max wins ties
  }
  const [a, b] = best.split(' ');
  words = mergePair(words, a, b);
  vocab.add(a + b);
  merges.push([a, b]);
  console.log(
    'merge ' + step + ': "' + a + '" + "' + b + '" -> "' + a + b + '" (count ' + bestCount + ')'
  );
  console.log('   ' + words.map(w => w.symbols.join(' ')).join(' | '));
}

console.log('final vocab size:', vocab.size);

// ④ Tokenize a word we never saw: replay the merges in the learned order.
function tokenize(word) {
  let symbols = [...word, '_'];
  for (const [a, b] of merges) {
    symbols = mergePair([{ symbols, count: 1 }], a, b)[0].symbols;
  }
  return symbols;
}

console.log('tokenize("lowest") ->', tokenize('lowest').join(' '));
console.log('tokenize("newer")  ->', tokenize('newer').join(' '));`,
        explain: `
          <details>
            <summary>The problem: pick a vocabulary without hand-writing it</summary>
            <p>We want a vocabulary that keeps frequent chunks whole and can still spell anything. Nobody wants to hand-pick 50,000 pieces. BPE learns them from data. Our corpus has 4 distinct words with counts: <code>low ×5, lower ×2, newest ×6, widest ×3</code> (16 word occurrences). We start with 11 symbols: <code>l o w _ e r n s t i d</code>, where <code>_</code> means "end of word". This lets the tokenizer tell a word-final <code>est_</code> apart from an <code>est</code> in the middle of a word.</p>
          </details>
          <details>
            <summary>Step by step: the 6 merges (matches the console)</summary>
            <table>
              <tr><th>Merge</th><th>Winning pair (count)</th><th>Why that count</th><th>Corpus afterwards</th></tr>
              <tr><td>1</td><td><code>e + s → es</code> (9)</td><td>newest ×6 + widest ×3. Tied with <code>s t</code> = 9, but <code>e s</code> was seen first</td><td><code>l o w _ | l o w e r _ | n e w es t _ | w i d es t _</code></td></tr>
              <tr><td>2</td><td><code>es + t → est</code> (9)</td><td>same two words</td><td><code>… | n e w est _ | w i d est _</code></td></tr>
              <tr><td>3</td><td><code>est + _ → est_</code> (9)</td><td>"est" at the end of the word</td><td><code>… | n e w est_ | w i d est_</code></td></tr>
              <tr><td>4</td><td><code>l + o → lo</code> (7)</td><td>low ×5 + lower ×2</td><td><code>lo w _ | lo w e r _ | …</code></td></tr>
              <tr><td>5</td><td><code>lo + w → low</code> (7)</td><td>same</td><td><code>low _ | low e r _ | …</code></td></tr>
              <tr><td>6</td><td><code>n + e → ne</code> (6)</td><td>newest ×6. Ties with <code>e w</code>, <code>w est_</code> (6), <code>n</code> seen first</td><td><code>low _ | low e r _ | ne w est_ | w i d est_</code></td></tr>
            </table>
            <p>Final vocabulary: 11 + 6 = <strong>17</strong>. Then the unseen words:</p>
            <table>
              <tr><th>Input</th><th>Merges that fire</th><th>Output</th></tr>
              <tr><td><code>lowest</code></td><td>1 (es), 2 (est), 3 (est_), 4 (lo), 5 (low)</td><td><code>low est_</code>: 2 tokens, and it was never in the corpus!</td></tr>
              <tr><td><code>newer</code></td><td>only 6 (ne). No <code>es</code> here</td><td><code>ne w e r _</code>: rare → more pieces</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">symbols: [...w, '_'],                      // ① characters + end-of-word marker
pairs.set(key, (pairs.get(key) || 0) + count); // ② a pair in "newest" counts 6 times
out.push(a + b); i++;                       // ③ replace the pair with the merged symbol
for (const [a, b] of merges) ...            // ④ encode = replay merges IN ORDER</code></pre>
            <ol>
              <li><strong>①</strong> Every word starts fully split, so every character is in the vocab. That's why BPE never produces "unknown". Byte-level BPE goes further and starts from the 256 bytes.</li>
              <li><strong>②</strong> Counts are weighted by word frequency, so merges follow what's <em>common</em> in the corpus.</li>
              <li><strong>③</strong> The <code>i++</code> skips the second half of the pair so it isn't reused.</li>
              <li><strong>④</strong> The learned artifact is the ordered merge list. Order matters: <code>est</code> can only exist after <code>es</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the loop to <code>step &lt;= 10</code>. Merges 7–8 build <code>new</code> then <code>newest_</code>. Frequent words become single tokens.</li>
              <li>Add <code>lowest: 4</code> to the corpus. Now <code>low</code> + <code>est_</code> competes early.</li>
              <li>Tokenize <code>"xyz"</code>. You get single characters again. Nothing is ever unknown <em>if</em> the characters were in the base vocab.</li>
            </ul>
            <div class="warn">Real tokenizers also pre-split text on spaces and punctuation (and treat the leading space as part of the token) before running BPE. That's why <code>" cat"</code> and <code>"cat"</code> get different ids.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why do modern LLMs use subword tokens instead of whole words?',
        options: [
          'Subwords make the model run on CPUs',
          'They avoid unknown words while keeping sequences short and the vocabulary a manageable size',
          'Words cannot be converted to integers',
          'Subwords are required by the softmax function',
        ],
        answer: 1,
        why: 'Word vocabularies explode and cannot handle new words. Characters make sequences very long. Subwords sit in between: common words stay whole, and rare ones are built from pieces.',
      },
      {
        q: 'In BPE training, what does each iteration do?',
        options: [
          'Splits the longest token in half',
          'Removes the least frequent character',
          'Merges the most frequent adjacent pair of symbols into a new symbol',
          'Assigns random ids to words',
        ],
        answer: 2,
        why: 'Count adjacent pairs (weighted by word counts), merge the top one, add it to the vocab, and repeat.',
      },
      {
        q: 'Roughly how large are real LLM vocabularies?',
        options: ['~256', '~2,000', '~32k to ~200k', '~10 million'],
        answer: 2,
        why: 'For example: Llama 2 has 32k, GPT-2 has 50,257, GPT-4 (cl100k) has about 100k, Llama 3 has about 128k, and GPT-4o (o200k) has about 200k.',
      },
      {
        q: 'Why might an LLM miscount the letter "r" in "strawberry"?',
        options: [
          'Its softmax temperature is too high',
          'It sees a few token ids (e.g. "str","aw","berry"), not individual letters',
          'The letter r is not in its vocabulary',
          'Transformers cannot count anything',
        ],
        answer: 1,
        why: 'Spelling is hidden inside each token id. The model has to have memorized how every token is spelled to count letters.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Write <code>encode(word, merges)</code> that applies a learned merge list to a new word (with <code>_</code> end marker), and use it on three words. Expected output:</p>
<pre><code>lowest  -> low est_
widest  -> w i d est_
slow    -> s low _</code></pre>`,
      starter: `const merges = [
  ['e', 's'],
  ['es', 't'],
  ['est', '_'],
  ['l', 'o'],
  ['lo', 'w'],
  ['n', 'e'],
];

function encode(word, merges) {
  let symbols = [...word, '_'];
  // TODO: for each merge [a, b] (in order), replace every adjacent a,b with a+b
  return symbols;
}

for (const w of ['lowest', 'widest', 'slow']) {
  console.log(w.padEnd(7), '->', encode(w, merges).join(' '));
}`,
      hint: 'Loop over merges in order. For each one, build a new array: walk i from 0, and if symbols[i] === a and symbols[i+1] === b, push a+b and skip i by an extra 1. Otherwise push symbols[i].',
      solution: `const merges = [
  ['e', 's'],
  ['es', 't'],
  ['est', '_'],
  ['l', 'o'],
  ['lo', 'w'],
  ['n', 'e'],
];

function encode(word, merges) {
  let symbols = [...word, '_'];
  for (const [a, b] of merges) {
    const out = [];
    for (let i = 0; i < symbols.length; i++) {
      if (symbols[i] === a && symbols[i + 1] === b) {
        out.push(a + b);
        i++;
      } else {
        out.push(symbols[i]);
      }
    }
    symbols = out;
  }
  return symbols;
}

for (const w of ['lowest', 'widest', 'slow']) {
  console.log(w.padEnd(7), '->', encode(w, merges).join(' '));
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'embeddings',
    section: 'Language as Numbers',
    title: 'Embeddings',
    explain: `
      <p>A token id like <code>6</code> is just a name tag. The number itself means nothing: token 6 is not "bigger" than token 5. We need a representation where <em>similar tokens are close</em>. The fix is an <strong>embedding table</strong>: a matrix <code>E</code> with one row per token in the vocabulary.</p>
      <pre><code>E has shape (vocab_size, d_model)
embedding(token_id) = E[token_id]      // just pick a row</code></pre>
      <p>That's the whole operation: a <strong>lookup</strong>. Mathematically it equals multiplying a one-hot vector by <code>E</code> (recall matrix multiplication from the Math section). A one-hot row with a single 1 picks out exactly one row of the matrix. Libraries skip the multiply and index directly.</p>

      <h3>The numbers are learned</h3>
      <p>At the start, <code>E</code> is random. During training, backprop nudges the rows (recall gradient descent) like any other weight. Tokens used in similar contexts ("cat" and "dog" both appear before "sat", "ate", "is cute") get pushed toward similar vectors, because that helps predict the next token. Nobody tells the model "cat and dog are animals". It works that out because it helps reduce the loss.</p>
      <div class="tip">GPT-2 small: vocab 50,257 × d_model 768 ≈ <strong>38.6M</strong> parameters, just for the embedding table. Many models reuse the same matrix at the output to turn vectors back into token scores. This is called <em>weight tying</em>.</div>

      <h3>Measuring similarity</h3>
      <ul>
        <li><strong>Dot product</strong> <code>a·b = Σ aᵢbᵢ</code>: big when vectors point the same way <em>and</em> are long.</li>
        <li><strong>Cosine similarity</strong> <code>cos(a,b) = a·b / (|a||b|)</code>: only the angle matters. It runs from −1 (opposite) through 0 (unrelated) to 1 (same direction).</li>
      </ul>
      <p>Attention (coming up) uses the dot product to decide which tokens are relevant to each other, so "similar direction = related" is the key intuition to take forward.</p>

      <h3>The famous analogy</h3>
      <p>With word2vec (Mikolov et al., 2013), people found that <code>king − man + woman</code> lands near <code>queen</code>. Directions in the space can encode relationships like gender or tense.</p>
      <div class="warn"><strong>Caveat.</strong> This is intuition, not a law. In real embeddings the nearest vector to <code>king − man + woman</code> is often <code>king</code> itself, and papers exclude the input words before reporting "queen". Many analogies simply fail. Also, an LLM's <em>input</em> embedding gives "bank" the same vector in "river bank" and "bank account". Only the attention layers make representations <em>contextual</em>.</div>
    `,
    examples: [
      {
        title: 'Toy 2D embedding space: click a word to see its neighbours',
        code: `<div class="card">
  <div class="hint">Click any word to draw lines to its 3 nearest neighbours. Switch the similarity measure, or press the analogy button.</div>
  <div class="row">
    <label><input type="radio" name="m" value="cos" checked /> cosine</label>
    <label><input type="radio" name="m" value="euc" /> euclidean distance</label>
    <button id="ana">show king − man + woman</button>
  </div>
  <svg id="sv" width="640" height="330" viewBox="0 0 640 330"></svg>
  <div id="out">Click a word.</div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  svg { background: #fafbff; border: 1px solid #e0e3ee; border-radius: 6px; display: block; margin: 6px 0; }
  text { font: 13px system-ui, sans-serif; cursor: pointer; }
  #out { min-height: 40px; }
</style>

<script>
  // Hand-placed 2D "embeddings". Real ones have hundreds of dimensions and are learned.
  const W = {
    cat: [3.0, 0.9], dog: [3.3, 1.4], tiger: [2.6, 1.6],
    apple: [-0.4, 3.0], banana: [-0.9, 2.8], mango: [-0.2, 2.4],
    run: [-2.6, 1.0], walk: [-2.9, 0.5], swim: [-2.3, 1.5],
    man: [-1.0, -2.0], woman: [0.4, -2.0], king: [-1.8, -2.8], queen: [-0.4, -2.8],
  };
  const GROUP = { cat: 0, dog: 0, tiger: 0, apple: 1, banana: 1, mango: 1,
    run: 2, walk: 2, swim: 2, man: 3, woman: 3, king: 3, queen: 3 };
  const COL = ['#d9480f', '#2b8a3e', '#1971c2', '#9c36b5'];
  const sv = document.getElementById('sv');
  const X = (x) => 320 + x * 70;
  const Y = (y) => 165 - y * 42;
  let selected = null;
  let analogy = false;

  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const len = (a) => Math.hypot(a[0], a[1]);
  const cos = (a, b) => dot(a, b) / (len(a) * len(b));
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

  function neighbours(vec, exclude) {
    const metric = document.querySelector('input[name=m]:checked').value;
    return Object.keys(W)
      .filter(w => !exclude.includes(w))
      .map(w => [w, metric === 'cos' ? cos(vec, W[w]) : dist(vec, W[w])])
      .sort((a, b) => (metric === 'cos' ? b[1] - a[1] : a[1] - b[1]))
      .slice(0, 3);
  }

  function line(x1, y1, x2, y2, color, width, dash) {
    return '<line x1="' + X(x1) + '" y1="' + Y(y1) + '" x2="' + X(x2) + '" y2="' + Y(y2) +
      '" stroke="' + color + '" stroke-width="' + width + '"' + (dash ? ' stroke-dasharray="4 3"' : '') +
      ' marker-end="url(#arr)"/>';
  }

  function draw() {
    let s = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="#555"/></marker></defs>';
    s += '<line x1="0" y1="165" x2="640" y2="165" stroke="#ddd"/><line x1="320" y1="0" x2="320" y2="330" stroke="#ddd"/>';
    s += '<text x="324" y="160" fill="#999" font-size="11">origin</text>';
    const out = document.getElementById('out');
    if (analogy) {
      const t = [W.king[0] - W.man[0] + W.woman[0], W.king[1] - W.man[1] + W.woman[1]];
      s += line(W.man[0], W.man[1], W.woman[0], W.woman[1], '#e8590c', 2, false);
      s += line(W.king[0], W.king[1], t[0], t[1], '#e8590c', 2, true);
      s += '<circle cx="' + X(t[0]) + '" cy="' + Y(t[1]) + '" r="9" fill="none" stroke="#e8590c" stroke-width="2"/>';
      const nb = neighbours(t, ['king', 'man', 'woman']);
      out.innerHTML = 'king − man + woman = [' + t.map(v => v.toFixed(1)).join(', ') +
        ']. The same "man → woman" arrow is applied to king. Nearest (excluding the inputs): <b>' +
        nb[0][0] + '</b> (' + nb[0][1].toFixed(3) + ')';
    } else if (selected) {
      const nb = neighbours(W[selected], [selected]);
      nb.forEach(([w]) => {
        s += '<line x1="' + X(W[selected][0]) + '" y1="' + Y(W[selected][1]) + '" x2="' + X(W[w][0]) +
          '" y2="' + Y(W[w][1]) + '" stroke="#f59f00" stroke-width="2"/>';
      });
      const metric = document.querySelector('input[name=m]:checked').value;
      out.innerHTML = '<b>' + selected + '</b> = [' + W[selected].join(', ') + ']. Nearest by ' +
        (metric === 'cos' ? 'cosine (higher = closer)' : 'distance (lower = closer)') + ': ' +
        nb.map(([w, v]) => w + ' ' + v.toFixed(3)).join(', ');
    }
    for (const w in W) {
      const [x, y] = W[w];
      const on = w === selected;
      s += '<g data-w="' + w + '"><circle cx="' + X(x) + '" cy="' + Y(y) + '" r="' + (on ? 7 : 5) +
        '" fill="' + COL[GROUP[w]] + '"/><text x="' + (X(x) + 8) + '" y="' + (Y(y) + 4) + '" fill="' +
        COL[GROUP[w]] + '" font-weight="' + (on ? 700 : 400) + '">' + w + '</text></g>';
    }
    sv.innerHTML = s;
    sv.querySelectorAll('g[data-w]').forEach(g => {
      g.onclick = () => { selected = g.dataset.w; analogy = false; draw(); };
    });
  }

  document.getElementById('ana').onclick = () => { analogy = !analogy; draw(); };
  document.querySelectorAll('input[name=m]').forEach(r => (r.onchange = draw));
  draw();
</script>`,
      },
      {
        title: 'Lookup, cosine similarity and an analogy in numbers',
        lang: 'js',
        code: `// A toy embedding table: 8 tokens x 4 dims.
// (Real models learn these numbers; we hand-picked them so you can read them.)
const vocab = ['king', 'queen', 'man', 'woman', 'apple', 'banana', 'cat', 'dog'];
const E = [
  [0.9, 0.7, 0.1, 0.0], // king
  [0.9, -0.6, 0.1, 0.1], // queen
  [0.1, 0.8, 0.0, 0.2], // man
  [0.2, -0.7, 0.0, 0.2], // woman
  [0.0, 0.0, 0.9, 0.1], // apple
  [0.1, 0.1, 0.8, 0.0], // banana
  [0.0, 0.2, 0.1, 0.9], // cat
  [0.1, 0.3, 0.0, 0.8], // dog
];

// ① Embedding lookup = pick a row by token id
const embed = (word) => E[vocab.indexOf(word)];

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const norm = (a) => Math.sqrt(dot(a, a));
// ② cosine similarity: angle only, ignores length
const cosine = (a, b) => dot(a, b) / (norm(a) * norm(b));

console.log('id of "cat" =', vocab.indexOf('cat'), '-> row', JSON.stringify(embed('cat')));

function nearest(vec, exclude = []) {
  return vocab
    .filter(w => !exclude.includes(w))
    .map(w => [w, cosine(vec, embed(w))])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([w, s]) => w + ' ' + s.toFixed(3))
    .join(', ');
}

console.log('nearest to cat  :', nearest(embed('cat'), ['cat']));
console.log('nearest to apple:', nearest(embed('apple'), ['apple']));

// ③ Analogy: king - man + woman
const target = embed('king').map((x, i) => x - embed('man')[i] + embed('woman')[i]);
console.log('king - man + woman =', JSON.stringify(target.map(x => +x.toFixed(2))));
console.log('nearest (excluding inputs):', nearest(target, ['king', 'man', 'woman']));
console.log('nearest (including inputs):', nearest(target));`,
      },
    ],
    quiz: [
      {
        q: 'What does an embedding layer actually compute for token id 42?',
        options: [
          'A softmax over 42 classes',
          'Row 42 of a learned matrix E (a table lookup)',
          'The binary representation of 42',
          'A random vector each time',
        ],
        answer: 1,
        why: 'An embedding is a lookup: E[42]. It equals one-hot(42) · E, but indexing is much cheaper.',
      },
      {
        q: 'Where do the embedding values come from?',
        options: [
          'Hand-written by linguists',
          'A dictionary of synonyms',
          'They are trained by gradient descent along with the rest of the model',
          'They are the token ids divided by vocab size',
        ],
        answer: 2,
        why: 'They start random and are updated by backprop like any other weight, because good embeddings help predict the next token.',
      },
      {
        q: 'Cosine similarity of two vectors pointing in exactly opposite directions is…',
        options: ['0', '1', '−1', 'Depends on their lengths'],
        answer: 2,
        why: 'cos(180°) = −1. Cosine ignores length and only depends on the angle.',
      },
      {
        q: 'Which statement about "king − man + woman ≈ queen" is most accurate?',
        options: [
          'It is guaranteed for every embedding model',
          'It is a useful intuition that directions can encode relations, but it often fails and usually needs the input words excluded',
          'It proves the model understands monarchy',
          'It only works in 2 dimensions',
        ],
        answer: 1,
        why: 'Analogies are a nice illustration from word2vec, but they are brittle. Treat them as intuition, not a guarantee.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Implement <code>cosine(a, b)</code> and <code>mostSimilar(word)</code>, which returns the other word with the highest cosine similarity. Expected:</p>
<pre><code>cat -> dog (0.978)
apple -> banana (0.979)
queen -> woman (0.753)</code></pre>`,
      starter: `const vocab = ['king', 'queen', 'man', 'woman', 'apple', 'banana', 'cat', 'dog'];
const E = [
  [0.9, 0.7, 0.1, 0.0],
  [0.9, -0.6, 0.1, 0.1],
  [0.1, 0.8, 0.0, 0.2],
  [0.2, -0.7, 0.0, 0.2],
  [0.0, 0.0, 0.9, 0.1],
  [0.1, 0.1, 0.8, 0.0],
  [0.0, 0.2, 0.1, 0.9],
  [0.1, 0.3, 0.0, 0.8],
];

function cosine(a, b) {
  // TODO: dot(a, b) / (|a| * |b|)
  return 0;
}

function mostSimilar(word) {
  const v = E[vocab.indexOf(word)];
  let best = null;
  let bestScore = -Infinity;
  // TODO: loop over the other words and keep the highest cosine
  return [best, bestScore];
}

for (const w of ['cat', 'apple', 'queen']) {
  const [b, s] = mostSimilar(w);
  console.log(w + ' -> ' + b + ' (' + s.toFixed(3) + ')');
}`,
      hint: 'dot = a.reduce((s, x, i) => s + x * b[i], 0). The norm is Math.sqrt(dot(a, a)). In mostSimilar, skip i where vocab[i] === word.',
      solution: `const vocab = ['king', 'queen', 'man', 'woman', 'apple', 'banana', 'cat', 'dog'];
const E = [
  [0.9, 0.7, 0.1, 0.0],
  [0.9, -0.6, 0.1, 0.1],
  [0.1, 0.8, 0.0, 0.2],
  [0.2, -0.7, 0.0, 0.2],
  [0.0, 0.0, 0.9, 0.1],
  [0.1, 0.1, 0.8, 0.0],
  [0.0, 0.2, 0.1, 0.9],
  [0.1, 0.3, 0.0, 0.8],
];

const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);

function cosine(a, b) {
  return dot(a, b) / (Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b)));
}

function mostSimilar(word) {
  const v = E[vocab.indexOf(word)];
  let best = null;
  let bestScore = -Infinity;
  vocab.forEach((w, i) => {
    if (w === word) return;
    const s = cosine(v, E[i]);
    if (s > bestScore) {
      best = w;
      bestScore = s;
    }
  });
  return [best, bestScore];
}

for (const w of ['cat', 'apple', 'queen']) {
  const [b, s] = mostSimilar(w);
  console.log(w + ' -> ' + b + ' (' + s.toFixed(3) + ')');
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'language-modeling',
    section: 'Language as Numbers',
    title: 'Next-Token Prediction',
    explain: `
      <p>A <strong>language model</strong> assigns a probability to the next token given all previous tokens:</p>
      <pre><code>P(next token | previous tokens)        e.g.  P(" mat" | "the cat sat on the") = 0.31</code></pre>
      <p>That's the whole job of GPT-style LLMs. Chain the predictions together and you get a probability for an entire text (the chain rule of probability):</p>
      <pre><code>P(the, cat, sat) = P(the) · P(cat | the) · P(sat | the, cat)</code></pre>

      <h3>Self-supervised: text is its own label</h3>
      <p>Where do the labels come from? From the text itself. Take any sentence, and at each position the "correct answer" is simply the token that actually comes next. One sentence of n tokens gives n training examples for free. No humans need to label anything, which is why we can train on trillions of tokens scraped from books, code and the web.</p>
      <pre><code>input :  &lt;s&gt;   the   cat   sat   on
target:  the   cat   sat   on    the      ← same text, shifted by one</code></pre>

      <h3>The loss: cross-entropy per token</h3>
      <p>Recall cross-entropy from ML Basics. For each position the loss is <code>−log P(correct next token)</code>. If the model gave the right token probability 1, the loss is 0. If it gave 0.01, the loss is 4.6. Average it over all tokens:</p>
      <pre><code>CE = −(1/N) Σ log P(tokenₜ | tokens before t)</code></pre>
      <p><strong>Perplexity</strong> = <code>exp(CE)</code> is the same number made human-friendly. It is the "effective number of choices" the model is torn between at each step. A model guessing uniformly over a 50k vocabulary has perplexity 50,000. A perfect model has perplexity 1.</p>

      <h3>Generating text = repeated sampling</h3>
      <p>To generate, predict a distribution, <strong>sample</strong> a token from it (recall temperature from the Softmax lesson), append it, and repeat. This is called <em>autoregressive</em> generation. Below we build the simplest possible language model, a <strong>bigram</strong> model that only looks at the previous token, from raw counts. Transformers do the same job, but condition on the whole context.</p>
      <div class="tip">A bigram model can't know that "the cat that I saw yesterday ___" needs a verb about the cat. It only sees "yesterday". Handling long context well is exactly what the rest of this course builds toward.</div>
    `,
    examples: [
      {
        title: 'Bigram predictor: pick a word, see P(next | word), sample text',
        code: `<div class="card">
  <div class="hint">Click a current word to see the model's next-word probabilities (counted from the corpus). Then generate sentences: small numbers show the probability of each chosen word.</div>
  <div id="corpus"></div>
  <div>Current word: <span id="btns"></span></div>
  <div id="bars"></div>
  <div class="row">
    <button id="samp">Sample a sentence</button>
    <button id="greedy">Greedy (always most likely)</button>
  </div>
  <div id="gen"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  #corpus { font: 13px ui-monospace, monospace; color: #555; margin-bottom: 6px; }
  #btns button { padding: 2px 8px; font-size: 13px; }
  #btns button.on { background: #ffe08a; border-color: #d9a400; }
  .bar { display: flex; align-items: center; gap: 6px; margin: 3px 0; font: 13px ui-monospace, monospace; }
  .bar span { width: 50px; text-align: right; }
  .bar i { height: 14px; background: #7aa2f7; border-radius: 2px; display: inline-block; }
  #bars { margin: 8px 0; min-height: 60px; }
  #gen { margin-top: 8px; font: 13px ui-monospace, monospace; line-height: 1.7; }
</style>

<script>
  const TEXT = ['the cat sat on the mat', 'the dog sat on the log', 'the cat ate the fish'];
  const counts = {};
  for (const line of TEXT) {
    const t = ['<s>', ...line.split(' '), '</s>'];
    for (let i = 0; i < t.length - 1; i++) {
      counts[t[i]] = counts[t[i]] || {};
      counts[t[i]][t[i + 1]] = (counts[t[i]][t[i + 1]] || 0) + 1;
    }
  }
  const esc = (s) => s.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  function probs(prev) {
    const row = counts[prev] || {};
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    return Object.entries(row).map(([w, c]) => [w, c / total, c]).sort((a, b) => b[1] - a[1]);
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(7);
  let current = 'the';

  function drawBars() {
    const btns = document.getElementById('btns');
    btns.innerHTML = '';
    Object.keys(counts).forEach(w => {
      const b = document.createElement('button');
      b.textContent = w;
      b.className = w === current ? 'on' : '';
      b.onclick = () => { current = w; drawBars(); };
      btns.appendChild(b);
    });
    document.getElementById('bars').innerHTML = probs(current).map(([w, p, c]) =>
      '<div class="bar"><span>' + esc(w) + '</span><i style="width:' + p * 380 + 'px"></i>' +
      p.toFixed(2) + ' <small>(' + c + ' of ' + probs(current).reduce((s, x) => s + x[2], 0) + ')</small></div>'
    ).join('');
  }

  function generate(greedy) {
    let w = '<s>';
    const steps = [];
    let logp = 0;
    while (steps.length < 12) {
      const p = probs(w);
      let pick = p[0];
      if (!greedy) {
        let r = rand();
        for (const x of p) { r -= x[1]; if (r <= 0) { pick = x; break; } }
      }
      logp += Math.log(pick[1]);
      steps.push(pick);
      w = pick[0];
      if (w === '</s>') break;
    }
    const ppl = Math.exp(-logp / steps.length);
    document.getElementById('gen').innerHTML = steps.map(([t, p]) =>
      '<b>' + esc(t) + '</b><sub>' + p.toFixed(2) + '</sub>').join(' ') +
      '<br>avg cross-entropy ' + (-logp / steps.length).toFixed(3) + ' nats · perplexity ' + ppl.toFixed(2);
  }

  document.getElementById('corpus').textContent = 'corpus: ' + TEXT.join(' | ');
  document.getElementById('samp').onclick = () => generate(false);
  document.getElementById('greedy').onclick = () => generate(true);
  drawBars();
  generate(false);
</script>`,
      },
      {
        title: 'Bigram language model from counts: probabilities, sampling, perplexity',
        lang: 'js',
        code: `// A tiny corpus. <s> = start of sentence, </s> = end.
const text = [
  'the cat sat on the mat',
  'the dog sat on the log',
  'the cat ate the fish',
];

// ① Count every (previous word -> next word) pair
const counts = {};
for (const line of text) {
  const toks = ['<s>', ...line.split(' '), '</s>'];
  for (let i = 0; i < toks.length - 1; i++) {
    const prev = toks[i];
    const next = toks[i + 1];
    counts[prev] = counts[prev] || {};
    counts[prev][next] = (counts[prev][next] || 0) + 1;
  }
}

// ② Turn counts into probabilities P(next | prev)
function probs(prev) {
  const row = counts[prev] || {};
  const total = Object.values(row).reduce((a, b) => a + b, 0);
  const out = {};
  for (const w in row) out[w] = row[w] / total;
  return out;
}

const fmt = (p) => Object.entries(p).map(([w, x]) => w + ':' + x.toFixed(2)).join('  ');
console.log('P(. | the) ->', fmt(probs('the')));
console.log('P(. | sat) ->', fmt(probs('sat')));

// ③ Sample: seeded PRNG so every run gives the same "random" text
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);

function sample(prev) {
  const p = probs(prev);
  let r = rand();
  for (const w in p) {
    r -= p[w];
    if (r <= 0) return w;
  }
  return Object.keys(p).pop();
}

for (let s = 0; s < 3; s++) {
  let w = '<s>';
  const out = [];
  while (true) {
    w = sample(w);
    if (w === '</s>' || out.length > 10) break;
    out.push(w);
  }
  console.log('sample ' + (s + 1) + ':', out.join(' '));
}

// ④ Score a sentence: cross-entropy per token and perplexity
function evaluate(sentence) {
  const toks = ['<s>', ...sentence.split(' '), '</s>'];
  let nll = 0;
  for (let i = 0; i < toks.length - 1; i++) {
    const p = probs(toks[i])[toks[i + 1]] || 1e-6; // unseen pair -> tiny prob
    nll += -Math.log(p);
  }
  const n = toks.length - 1;
  const ce = nll / n;
  console.log(
    '"' + sentence + '"  tokens=' + n + '  CE=' + ce.toFixed(3) + ' nats  PPL=' + Math.exp(ce).toFixed(2)
  );
}
evaluate('the cat sat on the log');
evaluate('the dog ate the mat');
evaluate('the fish sat on the cat');`,
        explain: `
          <details>
            <summary>The problem: turn raw text into a probability machine</summary>
            <p>We have 3 sentences and no labels. We want <code>P(next | prev)</code>. A bigram model says: <em>count how often each word follows each other word, then divide by the row total</em>. "the" appears 6 times as a previous word: followed by cat ×2, mat, dog, log, fish ×1 each. So <code>P(cat | the) = 2/6 = 0.33</code>, and the others are <code>1/6 = 0.17</code>. "sat" is always followed by "on", so <code>P(on | sat) = 1.00</code>. Those are the first two console lines.</p>
          </details>
          <details>
            <summary>Step by step: scoring "the cat sat on the log"</summary>
            <p>7 predictions (6 words + the end marker). The loss at each step is <code>−ln P</code>:</p>
            <table>
              <tr><th>t</th><th>prev → next</th><th>count / total</th><th>P</th><th>−ln P</th></tr>
              <tr><td>1</td><td>&lt;s&gt; → the</td><td>3/3</td><td>1.000</td><td>0.000</td></tr>
              <tr><td>2</td><td>the → cat</td><td>2/6</td><td>0.333</td><td>1.099</td></tr>
              <tr><td>3</td><td>cat → sat</td><td>1/2</td><td>0.500</td><td>0.693</td></tr>
              <tr><td>4</td><td>sat → on</td><td>2/2</td><td>1.000</td><td>0.000</td></tr>
              <tr><td>5</td><td>on → the</td><td>2/2</td><td>1.000</td><td>0.000</td></tr>
              <tr><td>6</td><td>the → log</td><td>1/6</td><td>0.167</td><td>1.792</td></tr>
              <tr><td>7</td><td>log → &lt;/s&gt;</td><td>1/1</td><td>1.000</td><td>0.000</td></tr>
              <tr><td colspan="4"><b>sum 3.584 / 7 tokens</b></td><td><b>CE = 0.512</b></td></tr>
            </table>
            <p>Perplexity = <code>e<sup>0.512</sup> = 1.67</code>: on average the model is only torn between ~1.7 options. Matches <code>CE=0.512 nats  PPL=1.67</code>.</p>
            <p>For <code>"the dog ate the mat"</code>, the pair <code>dog → ate</code> never occurred, so it gets our fallback <code>1e-6</code> (−ln = 13.8). That one surprise pushes CE to 2.900 and PPL to 18.17. <code>"the fish sat on the cat"</code> has two unseen pairs (<code>fish → sat</code>, <code>cat → &lt;/s&gt;</code>), which gives PPL 78.27.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">counts[prev][next] = (counts[prev][next] || 0) + 1; // ① text labels itself
out[w] = row[w] / total;                            // ② each row sums to 1
r -= p[w]; if (r &lt;= 0) return w;                   // ③ sampling by "walking" the CDF
const p = probs(...)[...] || 1e-6;                  // ④ unseen = near-zero prob</code></pre>
            <ol>
              <li><strong>①</strong> Every position is a training example. The "label" is just the next word. This is self-supervision.</li>
              <li><strong>②</strong> A count table normalized per row is a valid conditional distribution. A neural LM outputs such a row with a softmax instead.</li>
              <li><strong>③</strong> Draw <code>r ∈ [0,1)</code> and subtract probabilities until it goes ≤ 0. Tokens with bigger probability "cover" more of the interval. Seeded PRNG → same 3 samples every run: <code>the mat</code>, <code>the cat ate the dog sat on the fish</code>, … (the third one hits the 11-word cap).</li>
              <li><strong>④</strong> Counting models give zero to anything unseen. Neural models <em>generalize</em>: they would give "dog ate" a decent probability because dog ≈ cat in embedding space.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the seed <code>mulberry32(42)</code> to <code>1</code>. You get different but equally "grammatical-ish" samples.</li>
              <li>Notice sample 2: "the cat ate the dog sat on the fish". Each <em>pair</em> is plausible, but the sentence isn't. That's what a one-word memory gets you.</li>
              <li>Add the sentence <code>'the dog ate the bone'</code> to <code>text</code>. The PPL of "the dog ate the mat" drops a lot.</li>
            </ul>
            <div class="warn">Perplexities are only comparable with the <strong>same tokenizer</strong>. A model with bigger tokens makes fewer predictions per sentence, so its per-token numbers aren't apples-to-apples.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Where do the training labels for a language model come from?',
        options: [
          'Human annotators tag each sentence',
          'The text itself: each position\'s label is the token that actually comes next',
          'A separate classifier',
          'Random noise',
        ],
        answer: 1,
        why: 'This is self-supervised learning. Shift the text by one position and you have inputs and targets.',
      },
      {
        q: 'A model assigns probability 0.25 to the correct next token at every position. What is its perplexity?',
        options: ['0.25', '1.39', '4', '25'],
        answer: 2,
        why: 'CE = −ln 0.25 = 1.386, and exp(1.386) = 4. It is like choosing uniformly among 4 options.',
      },
      {
        q: 'What does a bigram model condition on?',
        options: ['The whole preceding text', 'Only the previous token', 'The next token', 'Nothing'],
        answer: 1,
        why: 'Bigram means pairs: P(next | previous token). That is why it produces locally plausible but globally nonsensical text.',
      },
      {
        q: 'How does autoregressive generation work?',
        options: [
          'Predict all tokens at once',
          'Predict a distribution, pick a token, append it, feed everything back in, repeat',
          'Retrieve a sentence from the training data',
          'Sort the vocabulary by frequency',
        ],
        answer: 1,
        why: 'Generation is a loop of next-token predictions, each one conditioned on everything generated so far.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>Unseen pairs get probability 0, which gives infinite loss. Fix it with <strong>add-one (Laplace) smoothing</strong>: <code>P(next | prev) = (count + 1) / (total + V)</code>, where <code>V</code> is the number of possible next tokens (all words plus <code>&lt;/s&gt;</code>). Print the perplexity of both sentences. Expected:</p>
<pre><code>V = 10
"the cat sat on the log"  PPL=4.95
"the dog ate the mat"  PPL=6.41</code></pre>`,
      starter: `const text = ['the cat sat on the mat', 'the dog sat on the log', 'the cat ate the fish'];

const counts = {};
const nextVocab = new Set();
for (const line of text) {
  const toks = ['<s>', ...line.split(' '), '</s>'];
  for (let i = 0; i < toks.length - 1; i++) {
    counts[toks[i]] = counts[toks[i]] || {};
    counts[toks[i]][toks[i + 1]] = (counts[toks[i]][toks[i + 1]] || 0) + 1;
    nextVocab.add(toks[i + 1]);
  }
}
const V = nextVocab.size;
console.log('V =', V);

function smoothedProb(prev, next) {
  // TODO: (count + 1) / (total + V)
  return 1;
}

function perplexity(sentence) {
  const toks = ['<s>', ...sentence.split(' '), '</s>'];
  let nll = 0;
  for (let i = 0; i < toks.length - 1; i++) {
    nll += -Math.log(smoothedProb(toks[i], toks[i + 1]));
  }
  return Math.exp(nll / (toks.length - 1));
}

for (const s of ['the cat sat on the log', 'the dog ate the mat']) {
  console.log('"' + s + '"  PPL=' + perplexity(s).toFixed(2));
}`,
      hint: 'const row = counts[prev] || {}; const total = sum of Object.values(row); return ((row[next] || 0) + 1) / (total + V);',
      solution: `const text = ['the cat sat on the mat', 'the dog sat on the log', 'the cat ate the fish'];

const counts = {};
const nextVocab = new Set();
for (const line of text) {
  const toks = ['<s>', ...line.split(' '), '</s>'];
  for (let i = 0; i < toks.length - 1; i++) {
    counts[toks[i]] = counts[toks[i]] || {};
    counts[toks[i]][toks[i + 1]] = (counts[toks[i]][toks[i + 1]] || 0) + 1;
    nextVocab.add(toks[i + 1]);
  }
}
const V = nextVocab.size;
console.log('V =', V);

function smoothedProb(prev, next) {
  const row = counts[prev] || {};
  const total = Object.values(row).reduce((a, b) => a + b, 0);
  return ((row[next] || 0) + 1) / (total + V);
}

function perplexity(sentence) {
  const toks = ['<s>', ...sentence.split(' '), '</s>'];
  let nll = 0;
  for (let i = 0; i < toks.length - 1; i++) {
    nll += -Math.log(smoothedProb(toks[i], toks[i + 1]));
  }
  return Math.exp(nll / (toks.length - 1));
}

for (const s of ['the cat sat on the log', 'the dog ate the mat']) {
  console.log('"' + s + '"  PPL=' + perplexity(s).toFixed(2));
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'rnn-limits',
    section: 'Language as Numbers',
    title: 'Before Transformers: RNNs & Their Limits',
    explain: `
      <p>Before 2017, the standard neural model for sequences was the <strong>recurrent neural network (RNN)</strong> and its gated versions, the <strong>LSTM</strong> (Hochreiter &amp; Schmidhuber, 1997) and the <strong>GRU</strong> (Cho et al., 2014). The idea: read tokens one at a time, and carry a <strong>hidden state</strong> vector <code>h</code> that summarizes everything read so far.</p>
      <pre><code>h_t = tanh(W_h · h_{t−1} + W_x · x_t + b)       // same weights at every step
prediction_t = softmax(W_out · h_t)</code></pre>
      <p>Think of reading a book while taking notes on a single sticky note. After each word you rewrite the note from the old note plus the new word. At the end, the sticky note is all you have.</p>

      <h3>Three problems</h3>
      <ol>
        <li><strong>Sequential = slow to train.</strong> <code>h_5</code> needs <code>h_4</code>, which needs <code>h_3</code>… You can't compute step 1000 until steps 1–999 are done. GPUs are great at doing thousands of things in parallel, and RNNs leave most of that power unused.</li>
        <li><strong>Long-range information fades.</strong> Information about word 1 has to survive being squashed through <code>tanh</code> and multiplied by <code>W_h</code> at every step. In the backward pass (recall backprop and the chain rule), the gradient from step t back to step 1 is a <em>product</em> of t per-step factors. If each factor is &lt; 1, the product shrinks exponentially: <strong>vanishing gradients</strong>. If each is &gt; 1, it blows up: <strong>exploding gradients</strong>. LSTMs' gates help a lot, but don't fully solve it.</li>
        <li><strong>Fixed-size bottleneck.</strong> Whether the input is 5 words or 500, everything must fit in one vector of, say, 512 numbers. Earlier details get overwritten.</li>
      </ol>
      <div class="tip">Transformers fix all three. All positions are processed <strong>in parallel</strong>. Any token can look <strong>directly</strong> at any earlier token in one step (path length 1 instead of t). And there is no single summary vector, because every token keeps its own representation.</div>
    `,
    examples: [
      {
        title: 'Hidden state passed step by step: watch early words fade',
        code: `<div class="card">
  <div class="hint">Press <b>Step</b> to feed one word at a time into the RNN. The bars show how much of each earlier word is left in the hidden state. Drag <b>keep factor</b> to change how much memory survives each step.</div>
  <div class="row">
    <button id="step">Step ▶</button>
    <button id="reset">Reset</button>
    keep factor
    <input id="keep" type="range" min="0.3" max="0.98" step="0.01" value="0.6" />
    <span id="kv"></span>
  </div>
  <svg id="sv" width="640" height="270" viewBox="0 0 640 270"></svg>
  <div id="msg"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  svg { display: block; margin-top: 6px; }
  #msg { min-height: 40px; }
</style>

<script>
  // The classic agreement problem: to choose "are" the model must remember "keys" (plural).
  const WORDS = ['The', 'keys', 'to', 'the', 'old', 'wooden', 'cabinet', 'are'];
  const COL = ['#adb5bd', '#e8590c', '#adb5bd', '#adb5bd', '#74c0fc', '#63e6be', '#b197fc', '#ffd43b'];
  let t = 0;
  const sv = document.getElementById('sv');

  function draw() {
    const keep = +document.getElementById('keep').value;
    document.getElementById('kv').textContent = keep.toFixed(2);
    let s = '';
    const cw = 76;
    WORDS.forEach((w, i) => {
      const x = 12 + i * cw;
      const done = i < t;
      // RNN cell box
      s += '<rect x="' + x + '" y="150" width="62" height="34" rx="6" fill="' + (done ? '#e7f5ff' : '#f1f3f5') +
        '" stroke="' + (i === t - 1 ? '#1971c2' : '#ced4da') + '" stroke-width="2"/>';
      s += '<text x="' + (x + 31) + '" y="172" text-anchor="middle" font-size="12">RNN</text>';
      s += '<text x="' + (x + 31) + '" y="210" text-anchor="middle" font-size="13" fill="' +
        (done ? '#1a1a1a' : '#aaa') + '">' + w + '</text>';
      s += '<line x1="' + (x + 31) + '" y1="196" x2="' + (x + 31) + '" y2="186" stroke="#999"/>';
      if (i < WORDS.length - 1) {
        s += '<line x1="' + (x + 62) + '" y1="167" x2="' + (x + cw) + '" y2="167" stroke="' +
          (i < t - 1 ? '#1971c2' : '#ccc') + '" stroke-width="2"/>';
      }
    });
    // Memory contribution of each word inside h_t: keep^(t-1-i)
    if (t > 0) {
      s += '<text x="12" y="16" font-size="12" fill="#555">what h' + t +
        ' still remembers of each word (share of memory)</text>';
      for (let i = 0; i < t; i++) {
        const c = Math.pow(keep, t - 1 - i);
        const x = 12 + i * cw + 16;
        const hgt = c * 110;
        s += '<rect x="' + x + '" y="' + (135 - hgt) + '" width="30" height="' + hgt + '" fill="' + COL[i] + '"/>';
        s += '<text x="' + (x + 15) + '" y="' + (130 - hgt) + '" text-anchor="middle" font-size="11">' +
          c.toFixed(2) + '</text>';
      }
    }
    sv.innerHTML = s;
    const msg = document.getElementById('msg');
    if (t === 0) msg.textContent = 'Press Step to feed words one at a time. Each step must wait for the previous one.';
    else if (t < WORDS.length) msg.textContent = 'Step ' + t + ': h' + t + ' = f(h' + (t - 1) + ', "' + WORDS[t - 1] + '"). ' +
      'Older words have been multiplied by ' + keep.toFixed(2) + ' once per step since they were read.';
    else msg.innerHTML = 'To pick <b>"are"</b> (not "is") the RNN needs "keys" from 6 steps ago. It kept only ' +
      '<b>' + Math.pow(keep, 6).toFixed(3) + '</b> of it (= ' + keep.toFixed(2) + '<sup>6</sup>), and ' +
      'the gradient flowing back to "keys" shrinks by the same kind of product. ' +
      'Try a keep factor near 0.95, then imagine 500 steps instead of 6.';
  }

  document.getElementById('step').onclick = () => { if (t < WORDS.length) t++; draw(); };
  document.getElementById('reset').onclick = () => { t = 0; draw(); };
  document.getElementById('keep').oninput = draw;
  draw();
</script>`,
      },
      {
        title: 'A 1-number RNN: how fast does the first word fade?',
        lang: 'js',
        code: `// A 1-number RNN: h_t = tanh(w * h_{t-1} + u * x_t)
const w = 0.5; // how much of the old memory is kept
const u = 1.0; // how much the new input matters

function run(xs) {
  let h = 0;
  const hs = [];
  let grad = 1; // ① d h_t / d h_1, built up one step at a time
  const grads = [];
  for (let t = 0; t < xs.length; t++) {
    const hNew = Math.tanh(w * h + u * xs[t]); // ② the only path from past to future
    if (t > 0) grad *= w * (1 - hNew * hNew); // ③ chain rule: multiply per step
    h = hNew;
    hs.push(h);
    grads.push(grad);
  }
  return { hs, grads };
}

// Two sequences that differ ONLY in the first input.
const a = [1, 0, 0, 0, 0, 0, 0, 0];
const b = [-1, 0, 0, 0, 0, 0, 0, 0];
const ra = run(a);
const rb = run(b);

console.log('t | h (x1=+1) | h (x1=-1) | difference | dh_t/dh_1');
for (let t = 0; t < a.length; t++) {
  console.log(
    (t + 1) + ' | ' + ra.hs[t].toFixed(4).padStart(8) + ' | ' + rb.hs[t].toFixed(4).padStart(8) +
    ' | ' + (ra.hs[t] - rb.hs[t]).toFixed(4).padStart(8) + ' | ' + ra.grads[t].toFixed(4)
  );
}`,
        explain: `
          <details>
            <summary>The problem: can step 8 still tell what word 1 was?</summary>
            <p>We run the same tiny RNN on two inputs that differ <em>only</em> in the first token (+1 vs −1), followed by zeros. If the network still "remembered" word 1 at the end, the two final hidden states would be clearly different. The <code>dh_t/dh_1</code> column is the gradient signal that would reach step 1 during training.</p>
          </details>
          <details>
            <summary>Step by step (matches the console)</summary>
            <table>
              <tr><th>t</th><th>h (x₁=+1)</th><th>h (x₁=−1)</th><th>difference</th><th>dh_t/dh_1</th></tr>
              <tr><td>1</td><td>0.7616</td><td>−0.7616</td><td>1.5232</td><td>1.0000</td></tr>
              <tr><td>2</td><td>0.3634</td><td>−0.3634</td><td>0.7268</td><td>0.4340</td></tr>
              <tr><td>3</td><td>0.1797</td><td>−0.1797</td><td>0.3595</td><td>0.2100</td></tr>
              <tr><td>4</td><td>0.0896</td><td>−0.0896</td><td>0.1792</td><td>0.1041</td></tr>
              <tr><td>5</td><td>0.0448</td><td>−0.0448</td><td>0.0896</td><td>0.0520</td></tr>
              <tr><td>6</td><td>0.0224</td><td>−0.0224</td><td>0.0448</td><td>0.0260</td></tr>
              <tr><td>7</td><td>0.0112</td><td>−0.0112</td><td>0.0224</td><td>0.0130</td></tr>
              <tr><td>8</td><td>0.0056</td><td>−0.0056</td><td>0.0112</td><td>0.0065</td></tr>
            </table>
            <p>Step 1: <code>tanh(1) = 0.7616</code>. Step 2: <code>tanh(0.5 · 0.7616) = tanh(0.3808) = 0.3634</code>. Each step roughly halves the signal (w = 0.5). After 8 steps less than 1% of the difference survives. Real sentences have hundreds of steps.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-javascript">let grad = 1;                                // ① start of the chain
const hNew = Math.tanh(w * h + u * xs[t]);  // ② word 1 only reaches step t through h
grad *= w * (1 - hNew * hNew);              // ③ d tanh(z)/dz = 1 − tanh², times w</code></pre>
            <ol>
              <li><strong>①</strong> We track how much a tiny change in h₁ changes h_t.</li>
              <li><strong>②</strong> There's no shortcut: information must pass through every intermediate h.</li>
              <li><strong>③</strong> Chain rule: multiply the local derivative of each step. <code>|w · (1−h²)| ≤ |w|</code>, so with w = 0.5 each step multiplies by ≤ 0.5. That's exponential decay, i.e. vanishing gradients.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>w = 0.95</code>. The memory lasts longer, but it still decays.</li>
              <li>Set <code>w = 3</code>. The <code>h</code> values saturate near ±1 and the gradient column still vanishes (tanh' ≈ 0 when saturated). With a linear RNN (drop the tanh), w &gt; 1 would <em>explode</em> instead.</li>
            </ul>
            <div class="tip">An attention layer connects step 8 to step 1 <em>directly</em>, with one weighted-sum hop. The gradient doesn't have to travel through 7 multiplications.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why are RNNs slow to train on GPUs compared with Transformers?',
        options: [
          'They have more parameters',
          'Each hidden state depends on the previous one, so time steps must be computed one after another',
          'They cannot use backprop',
          'They require character-level tokens',
        ],
        answer: 1,
        why: 'h_t = f(h_{t−1}, x_t) is inherently sequential. Transformers process all positions of a training sequence at once.',
      },
      {
        q: 'In a vanilla RNN, the gradient from step 100 back to step 1 is…',
        options: [
          'A sum of 99 terms, so it grows steadily',
          'A product of ~99 per-step factors, so it tends to vanish (or explode)',
          'Always exactly 1',
          'Independent of the weights',
        ],
        answer: 1,
        why: 'Chain rule through 99 steps gives a long product. Factors below 1 make it shrink exponentially, and factors above 1 make it blow up.',
      },
      {
        q: 'What is the "fixed-size bottleneck"?',
        options: [
          'The vocabulary size limit',
          'All information about the past must be squeezed into one hidden vector of fixed length',
          'The batch size',
          'The number of layers',
        ],
        answer: 1,
        why: 'Whether the input is 5 or 500 tokens, the RNN summary h has the same size. Details get overwritten.',
      },
      {
        q: 'What did LSTMs add to plain RNNs?',
        options: [
          'Attention heads',
          'Gates that control what to keep, forget and output, which helps gradients survive longer',
          'Parallel processing of all steps',
          'Tokenization',
        ],
        answer: 1,
        why: 'The gated cell state creates an easier gradient path. It helps a lot, but the model is still sequential and still has a bottleneck.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>For a <em>linear</em> RNN (<code>h_t = w·h_{t−1} + x_t</code>) the influence of step 1 on step t is <code>w<sup>t−1</sup></code>. Write <code>stepsUntilForgotten(w)</code>, which returns the first t at which the influence drops below 0.01. Expected:</p>
<pre><code>w=0.5 -> 8 steps
w=0.9 -> 45 steps
w=0.99 -> 460 steps</code></pre>`,
      starter: `function stepsUntilForgotten(w) {
  let influence = 1; // at t = 1
  let t = 1;
  // TODO: multiply by w each step until influence < 0.01
  return t;
}

for (const w of [0.5, 0.9, 0.99]) {
  console.log('w=' + w + ' -> ' + stepsUntilForgotten(w) + ' steps');
}`,
      hint: 'while (influence >= 0.01) { influence *= w; t++; } and then return t.',
      solution: `function stepsUntilForgotten(w) {
  let influence = 1; // at t = 1
  let t = 1;
  while (influence >= 0.01) {
    influence *= w;
    t++;
  }
  return t;
}

for (const w of [0.5, 0.9, 0.99]) {
  console.log('w=' + w + ' -> ' + stepsUntilForgotten(w) + ' steps');
}`,
    },
  },

  // ------------------------------------------------------------------
  {
    id: 'attention-origins',
    section: 'Language as Numbers',
    title: 'Where Attention Came From',
    explain: `
      <h3>2014: encoder–decoder translation</h3>
      <p>Neural machine translation used two RNNs (Sutskever, Vinyals &amp; Le, 2014; Cho et al., 2014). An <strong>encoder</strong> reads the English sentence and ends in one final hidden state. A <strong>decoder</strong> starts from that vector and writes the French sentence one token at a time.</p>
      <pre><code>"the black cat sat"  →  encoder  →  [ one vector c ]  →  decoder  →  "le chat noir s'est assis"</code></pre>
      <p>The whole sentence has to squeeze through that <strong>single vector</strong>. It's like translating a paragraph after being allowed to read it once and write one sticky note. Quality dropped sharply on long sentences.</p>

      <h3>2014: Bahdanau attention: let the decoder look back</h3>
      <p>Bahdanau, Cho &amp; Bengio (<em>"Neural Machine Translation by Jointly Learning to Align and Translate"</em>, 2014, published at ICLR 2015) kept <strong>all</strong> encoder hidden states <code>h₁…hₙ</code>. At each output step the decoder:</p>
      <ol>
        <li>scores every encoder state against its current state (how relevant is source word j right now?),</li>
        <li>turns the scores into weights with a <strong>softmax</strong> (recall Neural Networks) called <em>alignment</em> weights <code>α</code>,</li>
        <li>builds a <strong>context vector</strong> <code>c = Σ αⱼ hⱼ</code> (a weighted average) and uses it to predict the next word.</li>
      </ol>
      <p>When writing "noir", the decoder can put most of its weight on "black", even though the word order differs. The alignment is learned end-to-end from translation pairs alone. Nobody labels which word aligns with which.</p>
      <div class="tip">Bahdanau's score was a small MLP ("additive attention"). Luong et al. (2015) showed a simple <strong>dot product</strong> works well too. That's the version Transformers use, and the one in the code below.</div>

      <h3>2017: "Attention Is All You Need"</h3>
      <p>Vaswani et al. (Google, NeurIPS 2017) asked: if attention is what makes it work, why keep the slow recurrent part at all? The <strong>Transformer</strong> dropped recurrence entirely:</p>
      <ul>
        <li><strong>Self-attention</strong>: every token attends to every other token in the <em>same</em> sequence, so each word builds its representation from the whole context.</li>
        <li>No step-by-step dependency during training, so all positions are computed in parallel on GPUs.</li>
        <li>Word order comes from <em>positional encodings</em> added to the embeddings (covered later).</li>
      </ul>
      <p>It beat the best translation systems on WMT 2014 English–German and English–French with much less training time. The same architecture became the basis for BERT and GPT (2018) and every major LLM since. The next section builds its core, scaled dot-product attention, from scratch.</p>
    `,
    examples: [
      {
        title: 'Bottleneck vs attention: click a French word',
        code: `<div class="card">
  <div class="hint">Click a French word (bottom row) to see which English encoder states it reads from. Switch modes to compare with the old one-vector design.</div>
  <div class="row">
    <label><input type="radio" name="m" value="s2s" /> seq2seq (one vector)</label>
    <label><input type="radio" name="m" value="att" checked /> with attention (Bahdanau)</label>
  </div>
  <svg id="sv" width="640" height="300" viewBox="0 0 640 300"></svg>
  <div id="msg"></div>
</div>

<style>
  .card { background: #fff; color: #1a1a1a; padding: 12px; border-radius: 8px; max-width: 660px; font-size: 14px; }
  .hint { font-size: 13px; color: #444; background: #f1f5ff; border-left: 3px solid #4c6ef5; padding: 4px 8px; margin-bottom: 8px; border-radius: 4px; }
  text { font: 13px system-ui, sans-serif; }
  #msg { min-height: 40px; }
</style>

<script>
  const SRC = ['the', 'black', 'cat', 'sat'];
  const TGT = ['le', 'chat', 'noir', "s'est", 'assis'];
  // Hand-designed alignment weights (rows = French word, cols = English word; rows sum to 1).
  const A = [
    [0.85, 0.05, 0.08, 0.02],
    [0.05, 0.15, 0.75, 0.05],
    [0.03, 0.85, 0.10, 0.02],
    [0.05, 0.05, 0.20, 0.70],
    [0.02, 0.03, 0.10, 0.85],
  ];
  let sel = 2;
  const sv = document.getElementById('sv');
  const ex = (j) => 60 + j * 110; // encoder x
  const dx = (i) => 40 + i * 110; // decoder x

  function draw() {
    const mode = document.querySelector('input[name=m]:checked').value;
    let s = '<text x="0" y="36" fill="#555">encoder</text><text x="0" y="266" fill="#555">decoder</text>';
    if (mode === 's2s') {
      s += '<rect x="500" y="115" width="110" height="40" rx="8" fill="#fff3bf" stroke="#f08c00"/>';
      s += '<text x="555" y="140" text-anchor="middle">one vector c</text>';
      s += '<line x1="' + (ex(3) + 45) + '" y1="75" x2="540" y2="115" stroke="#f08c00" stroke-width="3"/>';
      TGT.forEach((_, i) => {
        s += '<line x1="540" y1="155" x2="' + (dx(i) + 40) + '" y2="215" stroke="#f08c00" stroke-width="' +
          (i === sel ? 3 : 1.2) + '" opacity="' + (i === sel ? 1 : 0.5) + '"/>';
      });
    } else {
      SRC.forEach((_, j) => {
        const w = A[sel][j];
        s += '<line x1="' + (ex(j) + 40) + '" y1="75" x2="' + (dx(sel) + 40) + '" y2="215" stroke="#1971c2" ' +
          'stroke-width="' + (1 + w * 10) + '" opacity="' + (0.25 + w * 0.75) + '"/>';
      });
      SRC.forEach((_, j) => {
        s += '<rect x="' + (ex(j) + 18) + '" y="86" width="44" height="16" rx="3" fill="#fff" stroke="#d0ebff"/>';
        s += '<text x="' + (ex(j) + 40) + '" y="98" text-anchor="middle" font-size="12" fill="#1971c2">α=' +
          A[sel][j].toFixed(2) + '</text>';
      });
      // mini alignment matrix
      s += '<text x="520" y="120" font-size="11" fill="#555">alignment α</text>';
      A.forEach((row, i) => row.forEach((w, j) => {
        s += '<rect x="' + (520 + j * 22) + '" y="' + (126 + i * 14) + '" width="21" height="13" fill="rgba(25,113,194,' +
          w + ')" stroke="' + (i === sel ? '#e8590c' : '#eee') + '"/>';
      }));
    }
    SRC.forEach((w, j) => {
      s += '<rect x="' + ex(j) + '" y="40" width="80" height="34" rx="6" fill="#e7f5ff" stroke="#74c0fc"/>';
      s += '<text x="' + (ex(j) + 40) + '" y="62" text-anchor="middle">h' + (j + 1) + ' ' + w + '</text>';
      if (j < 3) s += '<line x1="' + (ex(j) + 80) + '" y1="57" x2="' + ex(j + 1) + '" y2="57" stroke="#74c0fc" stroke-width="2"/>';
    });
    TGT.forEach((w, i) => {
      s += '<g data-i="' + i + '" style="cursor:pointer"><rect x="' + dx(i) + '" y="216" width="80" height="34" rx="6" fill="' +
        (i === sel ? '#ffe8cc' : '#f8f9fa') + '" stroke="' + (i === sel ? '#e8590c' : '#ced4da') + '" stroke-width="2"/>' +
        '<text x="' + (dx(i) + 40) + '" y="238" text-anchor="middle">' + w + '</text></g>';
    });
    sv.innerHTML = s;
    sv.querySelectorAll('g[data-i]').forEach(g => (g.onclick = () => { sel = +g.dataset.i; draw(); }));
    const top = A[sel].indexOf(Math.max(...A[sel]));
    document.getElementById('msg').innerHTML = mode === 's2s'
      ? 'Every French word is produced from the <b>same</b> final vector. Anything the encoder forgot is gone for good.'
      : 'Writing <b>' + TGT[sel] + '</b>: context = Σ α·h. Most weight goes to <b>' + SRC[top] +
        '</b>. Note "noir" looks back at "black" even though the word order is swapped.';
  }

  document.querySelectorAll('input[name=m]').forEach(r => (r.onchange = draw));
  draw();
</script>`,
      },
      {
        title: 'One attention step in numbers: scores → α → context vector',
        lang: 'js',
        code: `// Encoder hidden states for "the cat sat" (one vector per source word)
const src = ['the', 'cat', 'sat'];
const H = [
  [1.0, 0.0, 0.2],
  [0.1, 1.0, 0.3],
  [0.2, 0.3, 1.0],
];

// Decoder state while it is about to write "chat"
const s = [0.2, 1.5, 0.1];

const dot = (a, b) => a.reduce((acc, x, i) => acc + x * b[i], 0);
function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

// ① score each encoder state against the decoder state
const scores = H.map(h => dot(s, h));
// ② normalize to alignment weights
const alpha = softmax(scores);
// ③ context = weighted sum of ALL encoder states
const context = H[0].map((_, j) => H.reduce((acc, h, t) => acc + alpha[t] * h[j], 0));

src.forEach((w, t) =>
  console.log(w.padEnd(4) + ' score ' + scores[t].toFixed(2) + '  alpha ' + alpha[t].toFixed(3))
);
console.log('context vector:', context.map(x => x.toFixed(3)).join(', '));
console.log('old seq2seq would only use the last state:', H[2].join(', '));`,
      },
    ],
    quiz: [
      {
        q: 'What was the main weakness of the 2014 RNN encoder–decoder that attention fixed?',
        options: [
          'It could not use GPUs at all',
          'The whole source sentence had to be compressed into one fixed-size vector',
          'It had no softmax',
          'It could only translate into English',
        ],
        answer: 1,
        why: 'The single context vector is a bottleneck, and quality dropped on long sentences. Attention lets the decoder read all encoder states.',
      },
      {
        q: 'In Bahdanau attention, the context vector at each decoder step is…',
        options: [
          'The last encoder state',
          'A weighted average of all encoder states, with weights from a softmax over relevance scores',
          'The sum of the word embeddings',
          'A random sample of an encoder state',
        ],
        answer: 1,
        why: 'c = Σ αⱼ hⱼ with α = softmax(scores). It is recomputed for every output word.',
      },
      {
        q: 'What did "Attention Is All You Need" (Vaswani et al., 2017) remove?',
        options: ['The softmax', 'Embeddings', 'Recurrence (RNNs) entirely', 'The decoder'],
        answer: 2,
        why: 'The Transformer uses only attention plus feed-forward layers. There is no recurrence, so it can be trained in parallel across positions.',
      },
      {
        q: 'Who supervised which French word aligns with which English word?',
        options: [
          'Linguists labelled alignments',
          'Nobody: the alignment weights are learned end-to-end from translation pairs',
          'A dictionary lookup',
          'A separate alignment model trained first',
        ],
        answer: 1,
        why: 'The weights are just a differentiable part of the network, trained by backprop on the translation loss.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `<p>The decoder is now about to write "assis" with state <code>s = [0.1, 0.2, 2.0]</code>. Compute the dot-product scores, the softmax weights α and the context vector over the same encoder states. Expected:</p>
<pre><code>alpha: the 0.139, cat 0.189, sat 0.673
context: 0.292, 0.391, 0.757</code></pre>`,
      starter: `const src = ['the', 'cat', 'sat'];
const H = [
  [1.0, 0.0, 0.2],
  [0.1, 1.0, 0.3],
  [0.2, 0.3, 1.0],
];
const s = [0.1, 0.2, 2.0];

const dot = (a, b) => a.reduce((acc, x, i) => acc + x * b[i], 0);

function softmax(xs) {
  // TODO: exponentiate (subtract max first) and normalize
  return xs.map(() => 1 / xs.length);
}

const alpha = softmax(H.map(h => dot(s, h)));
// TODO: context[j] = sum over t of alpha[t] * H[t][j]
const context = [0, 0, 0];

console.log('alpha: ' + src.map((w, t) => w + ' ' + alpha[t].toFixed(3)).join(', '));
console.log('context: ' + context.map(x => x.toFixed(3)).join(', '));`,
      hint: 'softmax: const m = Math.max(...xs); const e = xs.map(x => Math.exp(x - m)); divide each by the sum. context: H[0].map((_, j) => H.reduce((acc, h, t) => acc + alpha[t] * h[j], 0)).',
      solution: `const src = ['the', 'cat', 'sat'];
const H = [
  [1.0, 0.0, 0.2],
  [0.1, 1.0, 0.3],
  [0.2, 0.3, 1.0],
];
const s = [0.1, 0.2, 2.0];

const dot = (a, b) => a.reduce((acc, x, i) => acc + x * b[i], 0);

function softmax(xs) {
  const m = Math.max(...xs);
  const e = xs.map(x => Math.exp(x - m));
  const sum = e.reduce((a, b) => a + b, 0);
  return e.map(x => x / sum);
}

const alpha = softmax(H.map(h => dot(s, h)));
const context = H[0].map((_, j) => H.reduce((acc, h, t) => acc + alpha[t] * h[j], 0));

console.log('alpha: ' + src.map((w, t) => w + ' ' + alpha[t].toFixed(3)).join(', '));
console.log('context: ' + context.map(x => x.toFixed(3)).join(', '));`,
    },
  },
);
