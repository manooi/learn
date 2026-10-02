window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── what-is-llm
  {
    id: 'what-is-llm',
    section: 'LLM Foundations',
    title: 'What an LLM really is',
    explain: `
      <p>Before we build a coding agent, we need an honest picture of the engine inside it.
      A <strong>Large Language Model (LLM)</strong> is, at its core, a <strong>next-token
      predictor</strong>. You give it some text. It returns a guess for the <em>next small
      piece</em> of text (a <em>token</em>), with a probability for every possible piece.</p>

      <p>To write a whole answer, the model's predictions are used in a loop:</p>
      <ol>
        <li>Look at all the text so far.</li>
        <li>Predict the next token.</li>
        <li>Append it to the text.</li>
        <li>Repeat until a "stop" token or a length limit.</li>
      </ol>
      <p>This is called <strong>autoregressive generation</strong>. "Auto" (self) +
      "regressive" (uses its own previous outputs as input).</p>

      <h3>Analogy: the world's best autocomplete</h3>
      <p>Your phone keyboard suggests the next word. An LLM is the same idea, trained on a huge
      amount of text with billions of parameters, so its guesses are good enough to write code,
      explain bugs and hold a conversation.</p>

      <h3>What an LLM is <em>not</em></h3>
      <ul>
        <li><strong>No memory.</strong> Each call starts from zero. It only knows what is in the
        text you send <em>this time</em> (plus what it learned in training).</li>
        <li><strong>No hands.</strong> It cannot read your files, run <code>npm test</code> or
        browse the web. It can only <em>output text</em>. If that text says "please run
        <code>ls</code>", some other program must actually run it.</li>
        <li><strong>No guaranteed truth.</strong> It predicts <em>plausible</em> text. Plausible
        is not the same as correct, so it can confidently invent things (a "hallucination").</li>
      </ul>

      <div class="tip">That "other program" is the <strong>harness</strong>. A coding agent like
      <strong>pi</strong> is a harness: it sends text to the model, reads the model's reply, runs
      tools (read files, edit files, run bash), and feeds the results back. This whole course is
      about how that harness works, one layer at a time.</div>

      <div class="warn">Real LLMs are neural networks, not word-count tables. The toy below only
      demonstrates the <em>shape</em> of the process (predict → append → repeat), not how a real
      model computes its guesses.</div>
    `,
    examples: [
      {
        title: 'A toy next-token predictor (bigram model)',
        explain: `
          <details>
            <summary>Step by step: what the generation loop does</summary>
            <p>The "training" step counts which word follows which. After <code>the</code> we saw
            <code>cat</code> 2 times and <code>mat</code>, <code>fish</code>, <code>dog</code>,
            <code>log</code> once each, so <code>cat</code> wins with 2/6 = 0.33.</p>
            <table>
              <tr><th>Step</th><th>Last token</th><th>Best guess</th><th>Console</th></tr>
              <tr><td>1</td><td><code>the</code></td><td>cat (2 of 6)</td>
                <td><code>step 1: "the" → "cat" (p=0.33)</code></td></tr>
              <tr><td>2</td><td><code>cat</code></td><td>sat (tie with ate, first wins)</td>
                <td><code>step 2: "cat" → "sat" (p=0.50)</code></td></tr>
              <tr><td>3</td><td><code>sat</code></td><td>on (2 of 2)</td>
                <td><code>step 3: "sat" → "on" (p=1.00)</code></td></tr>
              <tr><td>4</td><td><code>on</code></td><td>the (2 of 2)</td>
                <td><code>step 4: "on" → "the" (p=1.00)</code></td></tr>
              <tr><td>5</td><td><code>the</code></td><td>cat again</td>
                <td><code>step 5: "the" → "cat" (p=0.33)</code></td></tr>
              <tr><td>6</td><td><code>cat</code></td><td>sat again</td>
                <td><code>step 6: "cat" → "sat" (p=0.50)</code></td></tr>
            </table>
            <p>Final line: <code>generated: the cat sat on the cat sat</code>. It loops because
            this toy only looks at <em>one</em> previous word and always picks the top guess.
            Real models look at thousands of previous tokens and usually sample (next lessons).</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>the cat ate the fish .</code> twice more to the corpus. Now
              <code>ate</code> beats <code>sat</code> after <code>cat</code>.</li>
              <li>Start from <code>['dog']</code> instead of <code>['the']</code>.</li>
              <li>Notice: the model never "decides" anything. It only follows statistics.</li>
            </ul>
          </details>
        `,
        code: `const corpus = 'the cat sat on the mat . the cat ate the fish . the dog sat on the log .';

// ① "Training": count which word follows which
const counts = {};
const words = corpus.split(' ');
for (let i = 0; i < words.length - 1; i++) {
  const cur = words[i];
  const next = words[i + 1];
  counts[cur] = counts[cur] || {};
  counts[cur][next] = (counts[cur][next] || 0) + 1;
}
console.log('after "the":', JSON.stringify(counts['the']));

// ② Predict: pick the most likely next word and its probability
function predictNext(word) {
  const options = counts[word] || {};
  const total = Object.values(options).reduce((a, b) => a + b, 0);
  let best = null;
  for (const [tok, n] of Object.entries(options)) {
    if (!best || n > best.n) best = { tok, n, p: n / total };
  }
  return best;
}

// ③ Generate: predict → append → repeat
const output = ['the'];
for (let step = 1; step <= 6; step++) {
  const last = output[output.length - 1];
  const guess = predictNext(last);
  if (!guess) break;
  console.log('step ' + step + ': "' + last + '" → "' + guess.tok + '" (p=' +
    guess.p.toFixed(2) + ')');
  output.push(guess.tok);
  if (guess.tok === '.') break;
}
console.log('generated:', output.join(' '));

// Render each token as a box
const box = t => '<span style="display:inline-block;margin:3px;padding:4px 8px;' +
  'border-radius:6px;background:#e0e7ff;font-family:monospace">' + t + '</span>';
document.getElementById('root').innerHTML =
  '<p><b>Generated tokens:</b></p>' + output.map(box).join('');`,
      },
      {
        title: 'No hands: the model can only produce text',
        code: `// Pretend project on disk (the model can NOT see this by itself)
const fs = {
  'package.json': '{ "name": "shop", "dependencies": { "vue": "3.4.0" } }',
};

// A fake LLM: text in → text out. It only knows the prompt text.
function fakeLLM(prompt) {
  if (prompt.includes('"vue"')) {
    return 'Your project uses Vue 3.4.0.';
  }
  // Without the file contents it can only guess something plausible
  return 'Your project probably uses React 18.';
}

// ① Ask directly: the model has no way to open package.json
const q = 'Which framework does my package.json use?';
console.log('model alone:', fakeLLM(q));

// ② A harness does the "hands" part: read the file, paste it into the prompt
const withFile = q + '\\n\\nContents of package.json:\\n' + fs['package.json'];
console.log('with harness:', fakeLLM(withFile));

document.getElementById('root').innerHTML =
  '<p>❌ Model alone: <i>' + fakeLLM(q) + '</i> (a confident guess)</p>' +
  '<p>✅ Harness + model: <i>' + fakeLLM(withFile) + '</i></p>';`,
      },
    ],
    quiz: [
      {
        q: 'At its core, what does an LLM compute on each step?',
        options: [
          'A database lookup of the correct answer',
          'A probability for each possible next token',
          'A compiled program',
          'The whole answer at once',
        ],
        answer: 1,
        why: 'An LLM predicts the next token. Longer answers come from repeating that in a loop.',
      },
      {
        q: 'You ask a raw LLM API "what files are in my repo?". What happens?',
        options: [
          'It lists your files',
          'It asks your OS for permission',
          'It can only output text; it cannot see the repo unless something sends the contents',
          'It returns an error',
        ],
        answer: 2,
        why: 'The model has no hands. A harness (like pi) must read files or run tools and send the results back as text.',
      },
      {
        q: 'What does "autoregressive" mean here?',
        options: [
          'The model trains itself while answering',
          'Each new token is predicted from the text so far, including the tokens it just produced',
          'It automatically fixes bugs',
          'It regresses to an earlier version',
        ],
        answer: 1,
        why: 'Generated tokens are appended to the input and fed back in to predict the next one.',
      },
      {
        q: 'In this course, what is a "harness"?',
        options: [
          'The GPU the model runs on',
          'The program around the model that sends prompts, runs tools and feeds results back',
          'A type of neural network layer',
          'The training dataset',
        ],
        answer: 1,
        why: 'pi is a coding agent harness: it builds requests, executes tool calls and stores sessions.',
      },
    ],
    exercise: {
      task: `<p>Make the generator stop on its own. Start from <code>'dog'</code>, loop up
      to <strong>20</strong> steps, and <code>break</code> as soon as the model outputs
      <code>'.'</code>. Log the final sentence.</p>
      <p>Problem: pure greedy picking loops forever (<code>dog sat on the cat sat on the cat
      ...</code>) and never reaches <code>.</code>. So add a rule: when the last word is
      <code>'the'</code> and the output already has 8+ tokens, force the next token to be
      <code>'log'</code>. Expected: <code>dog sat on the cat sat on the log .</code></p>`,
      starter: `const corpus = 'the cat sat on the mat . the cat ate the fish . the dog sat on the log .';
const counts = {};
const words = corpus.split(' ');
for (let i = 0; i < words.length - 1; i++) {
  counts[words[i]] = counts[words[i]] || {};
  counts[words[i]][words[i + 1]] = (counts[words[i]][words[i + 1]] || 0) + 1;
}

function predictNext(word) {
  const options = counts[word] || {};
  let best = null;
  for (const [tok, n] of Object.entries(options)) {
    if (!best || n > best.n) best = { tok, n };
  }
  return best ? best.tok : null;
}

const output = ['dog'];
// TODO: loop up to 20 steps, stop on '.'
console.log(output.join(' '));`,
      hint: 'Inside the loop: compute next = predictNext(last); if output.length >= 8 and last is "the", use "log" instead. Push it, then break if it is ".".',
      solution: `const corpus = 'the cat sat on the mat . the cat ate the fish . the dog sat on the log .';
const counts = {};
const words = corpus.split(' ');
for (let i = 0; i < words.length - 1; i++) {
  counts[words[i]] = counts[words[i]] || {};
  counts[words[i]][words[i + 1]] = (counts[words[i]][words[i + 1]] || 0) + 1;
}

function predictNext(word) {
  const options = counts[word] || {};
  let best = null;
  for (const [tok, n] of Object.entries(options)) {
    if (!best || n > best.n) best = { tok, n };
  }
  return best ? best.tok : null;
}

const output = ['dog'];
for (let step = 0; step < 20; step++) {
  const last = output[output.length - 1];
  let next = predictNext(last);
  if (last === 'the' && output.length >= 8) next = 'log';
  if (!next) break;
  output.push(next);
  if (next === '.') break;
}
console.log(output.join(' '));`,
    },
  },

  // ───────────────────────────────────────────────────────────── tokens
  {
    id: 'tokens',
    section: 'LLM Foundations',
    title: 'Tokens & the context window',
    explain: `
      <p>Models don't read letters or whole words. They read <strong>tokens</strong>: chunks
      of text from a fixed vocabulary (often ~100k–200k entries). Common words are usually one
      token. Rare words get split into several pieces:
      <code>unbelievable</code> might become <code>un</code> + <code>believ</code> +
      <code>able</code>.</p>

      <div class="tip"><strong>Rule of thumb</strong> for English text and code: about
      <strong>4 characters ≈ 1 token</strong>, or ~¾ of a word. It's only an estimate; the exact
      count depends on each provider's tokenizer.</div>

      <h3>The context window</h3>
      <p>Every model has a <strong>context window</strong>: the maximum number of tokens it can
      handle in one call, counting <em>both</em> the input you send <em>and</em> the output it
      writes. Modern models range from tens of thousands to around a million tokens.</p>
      <p>Think of it as a <strong>desk</strong>. Everything the model should consider (system
      prompt, the whole chat so far, file contents, tool results) must fit on the desk at the
      same time. Anything not on the desk does not exist for the model.</p>

      <h3>Why tokens matter to you</h3>
      <ul>
        <li><strong>Cost:</strong> providers bill per token (input and output, usually priced per
        million tokens; output often costs more).</li>
        <li><strong>Speed:</strong> more tokens take longer to process and generate.</li>
        <li><strong>Limits:</strong> a coding agent that reads many big files can fill the window.
        pi's footer shows current context usage for exactly this reason.</li>
      </ul>

      <div class="warn">Pasting a 5,000-line log "just in case" is not free: it costs money on
      <em>every</em> later call in that conversation, because (as you'll see soon) the full
      history is sent again each time.</div>
    `,
    examples: [
      {
        title: 'A toy tokenizer (greedy longest match)',
        code: `// A tiny vocabulary. Real tokenizers (BPE) learn ~100k+ pieces from data.
const VOCAB = [
  'un', 'believ', 'able', 'token', 'iz', 'ation', 'the', 'cat', 'sat',
  'read', 'er', 's', 'ing', ' ',
];

// Greedy: at each position take the LONGEST vocab piece that matches
function tokenize(text) {
  const tokens = [];
  let i = 0;
  while (i < text.length) {
    let match = null;
    for (const piece of VOCAB) {
      if (text.startsWith(piece, i) && (!match || piece.length > match.length)) {
        match = piece;
      }
    }
    if (!match) match = text[i]; // unknown → one character per token
    tokens.push(match);
    i += match.length;
  }
  return tokens;
}

const samples = ['the cat sat', 'unbelievable', 'tokenization', 'readers', 'xyz'];
const colors = ['#fde68a', '#bfdbfe', '#bbf7d0', '#fbcfe8'];
let html = '';

for (const text of samples) {
  const toks = tokenize(text);
  console.log(JSON.stringify(text) + ' → ' + toks.length + ' tokens: ' + JSON.stringify(toks));
  const boxes = toks.map((t, i) =>
    '<span style="background:' + colors[i % 4] + ';padding:2px 4px;margin:1px;' +
    'border-radius:4px;font-family:monospace;white-space:pre">' +
    (t === ' ' ? '␣' : t) + '</span>');
  html += '<div style="margin:6px 0">' + boxes.join('') +
    ' <small>(' + toks.length + ')</small></div>';
}

document.getElementById('root').innerHTML = html;`,
      },
      {
        title: 'Filling the context window (and the bill)',
        code: `const CONTEXT_WINDOW = 200;         // toy limit (real models: 100k+)
const PRICE_PER_MILLION_INPUT = 3;  // illustrative $ per 1M input tokens

// Rough estimate: ~4 characters per token
const estimateTokens = text => Math.ceil(text.length / 4);

const pieces = [
  ['system prompt', 'You are a helpful coding assistant. Be concise.'],
  ['user', 'Why does my test fail?'],
  ['file: app.test.js', 'x'.repeat(320)],
  ['file: app.js', 'y'.repeat(360)],
  ['user', 'Also check utils.js please'],
];

let used = 0;
for (const [label, text] of pieces) {
  const t = estimateTokens(text);
  used += t;
  const pct = Math.round((used / CONTEXT_WINDOW) * 100);
  console.log(label.padEnd(18) + '+' + String(t).padStart(3) + ' → ' + used + '/' +
    CONTEXT_WINDOW + ' (' + pct + '%)' + (used > CONTEXT_WINDOW ? '  ⚠ over limit!' : ''));
}

const cost = (used / 1e6) * PRICE_PER_MILLION_INPUT;
console.log('input cost for this ONE call: $' + cost.toFixed(6));

const pct = Math.min(100, (used / CONTEXT_WINDOW) * 100);
document.getElementById('root').innerHTML =
  '<p>Context used: ' + used + ' / ' + CONTEXT_WINDOW + ' tokens</p>' +
  '<div style="width:100%;height:22px;background:#eee;border-radius:6px;overflow:hidden">' +
  '<div style="width:' + pct + '%;height:100%;background:' +
  (used > CONTEXT_WINDOW ? '#ef4444' : '#22c55e') + '"></div></div>';`,
      },
    ],
    quiz: [
      {
        q: 'Roughly how many tokens is 400 characters of English text?',
        options: ['About 4', 'About 100', 'About 400', 'About 1600'],
        answer: 1,
        why: 'Rule of thumb: ~4 characters per token, so 400 / 4 ≈ 100. Exact counts depend on the tokenizer.',
      },
      {
        q: 'What counts toward the context window?',
        options: [
          'Only your latest message',
          'Only the model output',
          'Everything sent (system prompt, history, files, tool results) plus the output',
          'Only the system prompt',
        ],
        answer: 2,
        why: 'All input tokens and the generated output must fit within the window.',
      },
      {
        q: 'Why might a rare word cost more tokens than a common one?',
        options: [
          'Rare words are billed at a higher rate',
          'The tokenizer splits words not in its vocabulary into several smaller pieces',
          'Rare words are always sent twice',
          'They are not; every word is exactly one token',
        ],
        answer: 1,
        why: 'Common words are single vocab entries; rare words get broken into sub-word pieces.',
      },
      {
        q: 'You paste a huge log early in a chat. Why does it keep costing money?',
        options: [
          'Providers charge storage fees',
          'Because the whole conversation, including the log, is resent as input on every later call',
          'Logs are billed as output tokens',
          'It does not; it is only billed once',
        ],
        answer: 1,
        why: 'The API is stateless (next lessons), so the history is resent each call. Prompt caching can make repeated input cheaper, but it still takes up context.',
      },
    ],
    exercise: {
      task: `<p>Write <code>fits(messages, window, reserve)</code>. It returns
      <code>true</code> if the estimated tokens of all messages (chars / 4, rounded up per
      message) plus <code>reserve</code> tokens for the answer fit in <code>window</code>.
      Log the result for the given data with window 40 and reserve 10 (expected
      <code>false</code>), and with reserve 0 (expected <code>true</code>).</p>`,
      starter: `const estimateTokens = text => Math.ceil(text.length / 4);

const messages = [
  'Hello! Can you help me with a bug?',  // 34 chars
  'Sure, paste the error.',              // 22 chars
  'TypeError: x is undefined at app.js:12', // 38 chars
  'Check where x is assigned.',          // 26 chars
];

function fits(msgs, window, reserve) {
  // TODO
  return true;
}

console.log(fits(messages, 40, 10));
console.log(fits(messages, 40, 0));`,
      hint: 'Sum estimateTokens(m) for each message (9 + 6 + 10 + 7 = 32), then compare total + reserve <= window.',
      solution: `const estimateTokens = text => Math.ceil(text.length / 4);

const messages = [
  'Hello! Can you help me with a bug?',  // 34 chars
  'Sure, paste the error.',              // 22 chars
  'TypeError: x is undefined at app.js:12', // 38 chars
  'Check where x is assigned.',          // 26 chars
];

function fits(msgs, window, reserve) {
  const total = msgs.reduce((sum, m) => sum + estimateTokens(m), 0);
  console.log('estimated tokens:', total, '+ reserve', reserve, 'vs window', window);
  return total + reserve <= window;
}

console.log(fits(messages, 40, 10));
console.log(fits(messages, 40, 0));`,
    },
  },

  // ───────────────────────────────────────────────────────────── sampling
  {
    id: 'sampling',
    section: 'LLM Foundations',
    title: 'Temperature & sampling',
    explain: `
      <p>The model doesn't output one token. It outputs a <strong>score for every token in the
      vocabulary</strong>. These raw scores are called <strong>logits</strong>. A function called
      <strong>softmax</strong> turns them into probabilities that add up to 100%.</p>
      <p>Then something must <em>choose</em> one token. That's <strong>sampling</strong>:</p>
      <ul>
        <li><strong>Greedy</strong>: always take the most likely token. Deterministic, but can be
        repetitive (remember the looping bigram).</li>
        <li><strong>Sampling</strong>: roll a weighted die. A 60% token is picked about 60% of
        the time.</li>
      </ul>

      <h3>Temperature</h3>
      <p><strong>Temperature</strong> reshapes the probabilities before the die is rolled. We
      divide each logit by the temperature <code>T</code> before softmax:</p>
      <pre><code>p(token) = exp(logit / T) / sum(exp(other_logit / T))</code></pre>
      <ul>
        <li><strong>Low T (e.g. 0.2)</strong>: differences get exaggerated → the top token takes
        almost everything → focused, predictable.</li>
        <li><strong>T = 1</strong>: the model's "natural" distribution.</li>
        <li><strong>High T (e.g. 2)</strong>: differences shrink → unlikely tokens get a real
        chance → creative, but more mistakes.</li>
      </ul>

      <div class="tip">Analogy: temperature is a <strong>contrast knob</strong> on the
      probability chart. Low temperature = high contrast (one bright bar). High temperature =
      washed out (all bars similar).</div>

      <div class="warn">Because of sampling, the same prompt can give different answers on each
      call. Don't assume a model is deterministic. Also, many reasoning models fix or ignore the
      temperature setting; coding harnesses like pi usually just use provider defaults and expose
      a <em>thinking level</em> instead.</div>
    `,
    examples: [
      {
        title: 'Softmax with temperature, greedy vs sampled',
        explain: `
          <details>
            <summary>The problem: "the model said something different this time!"</summary>
            <p>Beginners expect a model to always give the same answer. But the model only
            produces a <em>distribution</em>. If the harness samples from it, each run is a new
            roll of the die. Temperature controls how "loaded" the die is.</p>
          </details>
          <details>
            <summary>Step by step: logits → probabilities at three temperatures</summary>
            <p>Logits for the token after "The sky is": blue 3.0, clear 2.0, grey 1.5,
            falling 0.2. The code divides by <code>T</code>, exponentiates, and normalizes:</p>
            <table>
              <tr><th>T</th><th>blue</th><th>clear</th><th>grey</th><th>falling</th>
                <th>Meaning</th></tr>
              <tr><td>0.2</td><td>99.3%</td><td>0.7%</td><td>0.1%</td><td>0.0%</td>
                <td>Almost greedy</td></tr>
              <tr><td>1.0</td><td>60.5%</td><td>22.3%</td><td>13.5%</td><td>3.7%</td>
                <td>Model's natural odds</td></tr>
              <tr><td>2.0</td><td>43.0%</td><td>26.1%</td><td>20.3%</td><td>10.6%</td>
                <td>Flattened: "falling" is now 1 in 10</td></tr>
            </table>
            <p>Console prints these as lines like
            <code>T=1.0: blue 60.5%, clear 22.3%, grey 13.5%, falling 3.7%</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>exps = entries.map(([tok, s]) =&gt; [tok, Math.exp(s / temperature)]); // ①
const rand = makeRng(42);                                  // ②
if (r &lt; acc) return tok;                                   // ③</code></pre>
            <ol>
              <li><strong>①</strong> Dividing by a small <code>T</code> makes logits far apart
              (3/0.2 = 15 vs 2/0.2 = 10), and <code>exp</code> turns a gap of 5 into a factor of
              ~148. Dividing by a big <code>T</code> shrinks the gaps.</li>
              <li><strong>②</strong> We use a <em>seeded</em> random generator, and reset it to
              the same seed for each temperature. So all three rows use the <em>same</em> 8
              random numbers; only the distribution changes. Real APIs don't do this.</li>
              <li><strong>③</strong> Sampling = lay the probabilities side by side on a 0–1
              ruler, drop the random number on it, and return the slice it lands in.</li>
            </ol>
            <p>Compare the three <code>x8</code> lines in the console (same 8 random numbers
            each time):</p>
            <table>
              <tr><th>Console line</th><th>What you see</th></tr>
              <tr><td><code>T=0.2 x8: blue blue blue blue blue blue blue blue</code></td>
                <td>Low T: the top token wins every roll</td></tr>
              <tr><td><code>T=1.0 x8: blue blue clear blue blue blue falling blue</code></td>
                <td>Mostly blue; the unlikely "falling" sneaks in once</td></tr>
              <tr><td><code>T=2.0 x8: blue clear grey blue blue blue falling clear</code></td>
                <td>Flatter odds: every token shows up</td></tr>
            </table>
            <p><code>greedy (T=0): blue</code> never changes, no matter the seed.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the seed in <code>makeRng(42)</code> and watch the sampled lines
              change while the probability lines stay the same.</li>
              <li>Add <code>5.0</code> to the temperature list: everything becomes nearly
              uniform.</li>
            </ul>
          </details>
        `,
        code: `// Raw scores ("logits") for the next token after "The sky is"
const logits = { blue: 3.0, clear: 2.0, grey: 1.5, falling: 0.2 };

// ① softmax with temperature: scores → probabilities that sum to 1
function softmax(scores, temperature) {
  const entries = Object.entries(scores);
  const exps = entries.map(([tok, s]) => [tok, Math.exp(s / temperature)]);
  const total = exps.reduce((sum, [, e]) => sum + e, 0);
  return Object.fromEntries(exps.map(([tok, e]) => [tok, e / total]));
}

// ② Seeded random numbers, so every run prints the same "random" picks
function makeRng(seed) {
  return function () {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

// ③ Sample: find which probability "slice" the random number lands in
function sample(probs, rand) {
  const r = rand();
  let acc = 0;
  for (const [tok, p] of Object.entries(probs)) {
    acc += p;
    if (r < acc) return tok;
  }
  return Object.keys(probs).pop();
}

function greedy(probs) {
  return Object.entries(probs).sort((a, b) => b[1] - a[1])[0][0];
}

const temps = [0.2, 1.0, 2.0];
for (const t of temps) {
  const probs = softmax(logits, t);
  const pretty = Object.entries(probs)
    .map(([tok, p]) => tok + ' ' + (p * 100).toFixed(1) + '%')
    .join(', ');
  console.log('T=' + t.toFixed(1) + ': ' + pretty);
}

console.log('greedy (T=0):', greedy(softmax(logits, 1)));

for (const t of temps) {
  const rand = makeRng(42);
  const probs = softmax(logits, t);
  const picks = [];
  for (let i = 0; i < 8; i++) picks.push(sample(probs, rand));
  console.log('T=' + t.toFixed(1) + ' x8:', picks.join(' '));
}

// Draw bars for each temperature
let html = '';
for (const t of temps) {
  const probs = softmax(logits, t);
  html += '<div style="margin-bottom:8px"><b>T=' + t + '</b>';
  for (const [tok, p] of Object.entries(probs)) {
    html += '<div style="display:flex;align-items:center;gap:6px;font:12px monospace">' +
      '<span style="width:56px">' + tok + '</span>' +
      '<span style="height:12px;background:#6366f1;width:' + (p * 240) + 'px"></span>' +
      (p * 100).toFixed(1) + '%</div>';
  }
  html += '</div>';
}
document.getElementById('root').innerHTML = html;`,
      },
      {
        title: 'Temperature slider (visual widget)',
        lang: 'html',
        code: `<style>
  body { font-family: system-ui, sans-serif; }
  .row { display: flex; align-items: center; gap: 8px; margin: 4px 0; font: 13px monospace; }
  .bar { height: 14px; background: #6366f1; border-radius: 3px; }
</style>

<label>Temperature: <b id="tval">1.0</b></label><br>
<input id="t" type="range" min="0.1" max="3" step="0.1" value="1" style="width:260px">
<p style="color:gray;font-size:13px">Next token after "The sky is":</p>
<div id="bars"></div>

<script>
  const logits = { blue: 3.0, clear: 2.0, grey: 1.5, falling: 0.2 };

  function softmax(scores, t) {
    const exps = Object.entries(scores).map(([k, s]) => [k, Math.exp(s / t)]);
    const total = exps.reduce((a, [, e]) => a + e, 0);
    return exps.map(([k, e]) => [k, e / total]);
  }

  function draw() {
    const t = Number(document.getElementById('t').value);
    document.getElementById('tval').textContent = t.toFixed(1);
    document.getElementById('bars').innerHTML = softmax(logits, t)
      .map(([k, p]) =>
        '<div class="row"><span style="width:60px">' + k + '</span>' +
        '<span class="bar" style="width:' + (p * 260) + 'px"></span>' +
        (p * 100).toFixed(1) + '%</div>')
      .join('');
  }

  document.getElementById('t').addEventListener('input', draw);
  draw();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'What does softmax do?',
        options: [
          'Picks the top token',
          'Turns raw scores (logits) into probabilities that sum to 1',
          'Counts tokens',
          'Compresses the context',
        ],
        answer: 1,
        why: 'Softmax exponentiates and normalizes logits into a probability distribution.',
      },
      {
        q: 'Lowering temperature toward 0 makes output...',
        options: [
          'More random',
          'More focused on the most likely token (close to greedy)',
          'Longer',
          'Cheaper per token',
        ],
        answer: 1,
        why: 'Small T exaggerates gaps between logits so the top token dominates.',
      },
      {
        q: 'At T=2 in the demo, "falling" rises from 3.7% to 10.6%. Why?',
        options: [
          'The model learned something new',
          'Dividing logits by 2 shrinks the gaps between them, flattening the distribution',
          'Temperature adds random noise to the text',
          'A bug in softmax',
        ],
        answer: 1,
        why: 'Temperature only reshapes the same logits; higher T = flatter distribution.',
      },
      {
        q: 'You run the same prompt twice and get different answers. Most likely reason?',
        options: [
          'The model remembered the first call',
          'The next tokens are sampled from a probability distribution',
          'The API is broken',
          'The tokenizer changed',
        ],
        answer: 1,
        why: 'Sampling makes generation non-deterministic unless you use greedy decoding (and even then providers may vary slightly).',
      },
    ],
    exercise: {
      task: `<p>Implement <strong>top-k sampling</strong>: keep only the <code>k</code> most
      likely tokens, renormalize them so they sum to 1, and return the new distribution.
      Log <code>topK(softmax(logits, 1), 2)</code>. Expected: only <code>blue</code> (~73%)
      and <code>clear</code> (~27%).</p>`,
      starter: `const logits = { blue: 3.0, clear: 2.0, grey: 1.5, falling: 0.2 };

function softmax(scores, t) {
  const exps = Object.entries(scores).map(([k, s]) => [k, Math.exp(s / t)]);
  const total = exps.reduce((a, [, e]) => a + e, 0);
  return Object.fromEntries(exps.map(([k, e]) => [k, e / total]));
}

function topK(probs, k) {
  // TODO: sort, keep k, renormalize
  return probs;
}

console.log(topK(softmax(logits, 1), 2));`,
      hint: 'Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, k), then divide each by the sum of the kept ones.',
      solution: `const logits = { blue: 3.0, clear: 2.0, grey: 1.5, falling: 0.2 };

function softmax(scores, t) {
  const exps = Object.entries(scores).map(([k, s]) => [k, Math.exp(s / t)]);
  const total = exps.reduce((a, [, e]) => a + e, 0);
  return Object.fromEntries(exps.map(([k, e]) => [k, e / total]));
}

function topK(probs, k) {
  const kept = Object.entries(probs).sort((a, b) => b[1] - a[1]).slice(0, k);
  const sum = kept.reduce((a, [, p]) => a + p, 0);
  return Object.fromEntries(kept.map(([tok, p]) => [tok, p / sum]));
}

console.log(topK(softmax(logits, 1), 2));`,
    },
  },

  // ───────────────────────────────────────────────────────────── stateless-api
  {
    id: 'stateless-api',
    section: 'LLM Foundations',
    title: 'The API is stateless',
    explain: `
      <p>This is the single most important idea for understanding agent harnesses:</p>
      <p style="font-size:1.1em"><strong>The model API remembers nothing between calls.</strong></p>
      <p>When you chat with an AI and it "remembers" your name from 10 messages ago, that's not
      the model's memory. The <strong>app</strong> (the harness) stored the conversation and
      <strong>sent the entire history again</strong> with your new message.</p>

      <h3>Analogy: a brilliant consultant with amnesia</h3>
      <p>Imagine a consultant who forgets everything the moment you hang up. To continue a
      discussion, you must hand them the <em>full transcript</em> every time you call. They
      read it all, answer, and forget again. The transcript is the <code>messages</code>
      array; you (the harness) keep it.</p>

      <pre><code>// Call 1
request({ messages: [user: "My name is Ana"] })
// Call 2 — the harness resends everything
request({ messages: [user: "My name is Ana", assistant: "Nice to meet you!",
                     user: "What is my name?"] })</code></pre>

      <h3>Why this matters for pi</h3>
      <ul>
        <li>pi keeps the conversation in a <strong>session</strong> (saved as a JSONL file). For
        each model request it rebuilds the context from the session's active branch: system
        prompt + messages + tool definitions.</li>
        <li>Because pi owns the history, it can do tricks the model never sees: branch a
        conversation, switch models mid-chat, or <strong>compact</strong> old messages into a
        summary (later lessons).</li>
        <li>Each call re-sends all history, so cost and context usage grow with every turn.</li>
      </ul>

      <div class="warn">Common beginner belief: "the model learns from my chat". It does not.
      Model weights don't change during your conversation. Drop a message from the array and,
      for the model, it never happened.</div>
      <div class="tip">Providers offer <strong>prompt caching</strong> to make resending the same
      prefix cheaper and faster. That's a billing/speed optimization, not memory: you still
      send the full history.</div>
    `,
    examples: [
      {
        title: 'A fake LLM that only knows the messages array',
        explain: `
          <details>
            <summary>The problem: "but ChatGPT remembers me!"</summary>
            <p>The <code>fakeLLM</code> here behaves like a real API: it's a pure function of
            the <code>messages</code> you pass. There is no hidden variable where it could keep
            your name. We call it three times with different arrays.</p>
          </details>
          <details>
            <summary>Step by step: three calls, three arrays</summary>
            <table>
              <tr><th>Call</th><th>What the harness sends</th><th>Console</th></tr>
              <tr><td>1</td><td>1 message: <code>user: My name is Ana.</code></td>
                <td><code>call 1 (1 msgs) → Nice to meet you, Ana!</code></td></tr>
              <tr><td>2 (bad harness)</td><td>1 message: only
                <code>user: What is my name?</code> (history dropped)</td>
                <td><code>call 2 (1 msgs) → I don't know your name. You haven't told me.</code>
                </td></tr>
              <tr><td>3 (good harness)</td><td>3 messages: user, assistant, user (full
                history)</td>
                <td><code>call 3 (3 msgs) → Your name is Ana.</code></td></tr>
            </table>
            <p>Same model, same question in calls 2 and 3. The only difference is the array.
            Call 2 "forgot" because the harness didn't send the earlier message.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const everything = messages.map(m =&gt; m.content).join('\\n'); // ①
const found = everything.match(/my name is (\\w+)/i);          // ②
history.push(reply1);                                         // ③</code></pre>
            <ol>
              <li><strong>①</strong> The only input the model has. No globals, no database.</li>
              <li><strong>②</strong> It can "remember" a name only if the name text is inside
              the array for <em>this</em> call.</li>
              <li><strong>③</strong> The harness's job: store every user and assistant message so
              it can resend them next time.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In call 3, remove the first element of <code>history</code> before calling:
              the model forgets again.</li>
              <li>Edit the first message to "My name is Bo." before call 3. The model now
              "remembers" Bo. The history is just data you control.</li>
            </ul>
          </details>
        `,
        code: `// A fake, scripted LLM. Like a real API, it is a pure function of its input.
function fakeLLM(messages) {
  const everything = messages.map(m => m.content).join('\\n');
  const last = messages[messages.length - 1].content;

  if (/what is my name/i.test(last)) {
    const found = everything.match(/my name is (\\w+)/i);
    return found ? 'Your name is ' + found[1] + '.' :
      "I don't know your name. You haven't told me.";
  }
  const intro = last.match(/my name is (\\w+)/i);
  if (intro) return 'Nice to meet you, ' + intro[1] + '!';
  return 'OK.';
}

function call(n, messages) {
  const reply = fakeLLM(messages);
  console.log('call ' + n + ' (' + messages.length + ' msgs) → ' + reply);
  return { role: 'assistant', content: reply };
}

// Call 1
const history = [{ role: 'user', content: 'My name is Ana.' }];
const reply1 = call(1, history);
history.push(reply1);

// Call 2: a BAD harness only sends the newest message
const question = { role: 'user', content: 'What is my name?' };
const reply2 = call(2, [question]);

// Call 3: a GOOD harness resends the whole history
history.push(question);
const reply3 = call(3, history);

const row = (label, text, color) =>
  '<div style="margin:4px 0;padding:6px 10px;border-radius:8px;background:' + color + '">' +
  '<b>' + label + '</b> ' + text + '</div>';
document.getElementById('root').innerHTML =
  row('call 2 (history dropped):', reply2.content, '#fee2e2') +
  row('call 3 (full history):', reply3.content, '#dcfce7');`,
      },
    ],
    quiz: [
      {
        q: 'Where does the "memory" of a chat actually live?',
        options: [
          'Inside the model weights',
          'On the provider’s server, automatically',
          'In the messages array that the harness stores and resends each call',
          'In the tokenizer',
        ],
        answer: 2,
        why: 'The API is stateless. The harness (e.g. pi’s session) keeps history and sends it every time.',
      },
      {
        q: 'A harness sends only the latest user message each call. What happens?',
        options: [
          'Works fine, the model remembers',
          'The model loses all earlier context and may contradict itself',
          'The request fails',
          'It becomes cheaper and smarter',
        ],
        answer: 1,
        why: 'Anything not in the array doesn’t exist for the model on that call.',
      },
      {
        q: 'Why does cost grow as a conversation gets longer?',
        options: [
          'Providers charge a loyalty fee',
          'Every call resends the full history as input tokens',
          'The model gets slower with age',
          'Output tokens get more expensive',
        ],
        answer: 1,
        why: 'Input size grows each turn because all prior messages are included again.',
      },
      {
        q: 'Because pi owns the history, it can...',
        options: [
          'Retrain the model on your code',
          'Branch conversations and compact old messages into summaries',
          'Make the model stateful',
          'Skip sending the system prompt',
        ],
        answer: 1,
        why: 'pi rebuilds the context from its session for each request, so it can branch, switch models and compact.',
      },
    ],
    exercise: {
      task: `<p>Build a tiny harness: write <code>send(text)</code> that appends a user message
      to <code>history</code>, calls <code>fakeLLM(history)</code>, appends the assistant reply,
      and returns the reply text. The three calls at the bottom should print
      <code>Nice to meet you, Kim!</code>, <code>OK.</code>, <code>Your name is Kim.</code></p>`,
      starter: `function fakeLLM(messages) {
  const everything = messages.map(m => m.content).join('\\n');
  const last = messages[messages.length - 1].content;
  if (/what is my name/i.test(last)) {
    const found = everything.match(/my name is (\\w+)/i);
    return found ? 'Your name is ' + found[1] + '.' : "I don't know your name.";
  }
  const intro = last.match(/my name is (\\w+)/i);
  if (intro) return 'Nice to meet you, ' + intro[1] + '!';
  return 'OK.';
}

const history = [];

function send(text) {
  // TODO: keep history, call fakeLLM, store the reply
  return fakeLLM([{ role: 'user', content: text }]);
}

console.log(send('My name is Kim.'));
console.log(send('I like tea.'));
console.log(send('What is my name?'));`,
      hint: 'history.push({ role: "user", content: text }); const reply = fakeLLM(history); history.push({ role: "assistant", content: reply }); return reply;',
      solution: `function fakeLLM(messages) {
  const everything = messages.map(m => m.content).join('\\n');
  const last = messages[messages.length - 1].content;
  if (/what is my name/i.test(last)) {
    const found = everything.match(/my name is (\\w+)/i);
    return found ? 'Your name is ' + found[1] + '.' : "I don't know your name.";
  }
  const intro = last.match(/my name is (\\w+)/i);
  if (intro) return 'Nice to meet you, ' + intro[1] + '!';
  return 'OK.';
}

const history = [];

function send(text) {
  history.push({ role: 'user', content: text });
  const reply = fakeLLM(history);
  history.push({ role: 'assistant', content: reply });
  return reply;
}

console.log(send('My name is Kim.'));
console.log(send('I like tea.'));
console.log(send('What is my name?'));
console.log('history length:', history.length);`,
    },
  },

  // ───────────────────────────────────────────────────────────── system-prompt
  {
    id: 'system-prompt',
    section: 'LLM Foundations',
    title: 'The system prompt',
    explain: `
      <p>Besides the chat messages, every request carries a <strong>system prompt</strong>: a
      block of instructions from the <em>app</em>, not the user. It sets the model's role, rules
      and knowledge about the environment ("you are a coding assistant", "be concise", "the
      current directory is ...").</p>

      <p>Analogy: the system prompt is the <strong>job briefing</strong> a new employee gets
      before talking to customers. Customers (user messages) come and go; the briefing is
      handed over again at the start of every call (remember: stateless!).</p>

      <h3>Where it goes in the request</h3>
      <p>Providers put it in different places. Anthropic's Messages API has a separate
      top-level <code>system</code> field. OpenAI's APIs use a <code>system</code> (or
      <code>developer</code>) role message / <code>instructions</code>. pi's AI library,
      <code>@earendil-works/pi-ai</code>, hides this: you give it a <code>Context</code> with a
      <code>systemPrompt</code> string plus <code>messages</code>, and each provider adapter
      converts it to the right wire format.</p>
      <pre><code>const context = {
  systemPrompt: 'You are a helpful assistant.',
  messages: [{ role: 'user', content: 'What time is it?', timestamp: Date.now() }],
};</code></pre>

      <h3>How pi builds its system prompt</h3>
      <p>pi assembles the system prompt from its <strong>base instructions</strong> and
      discovered <strong>context files</strong>:</p>
      <ul>
        <li>A default preamble ("You are an expert coding assistant operating inside pi, a coding
        agent harness...") plus the list of available tools and some rules.</li>
        <li><code>AGENTS.md</code> (or <code>CLAUDE.md</code>) files: one from the agent
        directory (<code>~/.pi/agent/</code>) for global instructions, then from the parent
        directories down to the working directory. They are added as "Project-specific
        instructions".</li>
        <li><code>APPEND_SYSTEM.md</code> adds instructions; <code>SYSTEM.md</code> replaces the
        default prompt entirely (in <code>~/.pi/agent/</code> or the project's
        <code>.pi/</code>).</li>
        <li>The current working directory, and short descriptions of available skills.</li>
      </ul>
      <pre><code class="language-markdown"># AGENTS.md (in your repo root)
- Use pnpm, not npm.
- Run \`pnpm test\` after editing code.
- Never edit files in generated/.</code></pre>

      <div class="tip">An <code>AGENTS.md</code> is the cheapest way to "teach" pi about your
      project. The model reads it on every call because it's part of the system prompt.</div>
      <div class="warn">Context files are loaded even in folders you haven't trusted (pi's docs
      warn to treat them as untrusted input). A malicious repo can put instructions in its
      <code>AGENTS.md</code>. Also, every line costs tokens on every call.</div>
    `,
    examples: [
      {
        title: 'Same user message, two system prompts',
        code: `// Fake LLM that receives a pi-ai-like context: { systemPrompt, messages }
function fakeLLM(context) {
  const sys = context.systemPrompt.toLowerCase();
  const last = context.messages[context.messages.length - 1].content;

  if (/undo.*commit/i.test(last)) {
    if (sys.includes('only the command')) return 'git reset --soft HEAD~1';
    if (sys.includes('pirate')) return 'Arr! Run git reset --soft HEAD~1, matey.';
    return 'Run "git reset --soft HEAD~1". It undoes the last commit but keeps ' +
      'your changes staged, so nothing is lost.';
  }
  return 'OK.';
}

const messages = [{ role: 'user', content: 'How do I undo my last git commit?' }];

const prompts = [
  'You are a friendly teacher. Explain your answers.',
  'You are a terminal helper. Reply with only the command.',
  'You are a pirate.',
];

let html = '';
for (const systemPrompt of prompts) {
  const reply = fakeLLM({ systemPrompt, messages });
  console.log('system: ' + systemPrompt + '\\n  → ' + reply);
  html += '<div style="margin:6px 0;padding:6px;border-left:4px solid #6366f1">' +
    '<small style="color:gray">system: ' + systemPrompt + '</small><br>' + reply + '</div>';
}
document.getElementById('root').innerHTML = html;`,
      },
      {
        title: 'Assembling a system prompt like pi (simulated files)',
        explain: `
          <details>
            <summary>Step by step: which files end up in the prompt, in what order</summary>
            <p>Working directory: <code>/work/shop/web</code>. The toy (like pi's
            <code>loadProjectContextFiles</code>) collects context files in this order:</p>
            <table>
              <tr><th>#</th><th>Where</th><th>Found?</th><th>Console</th></tr>
              <tr><td>1</td><td>agent dir <code>~/.pi/agent</code></td><td>yes (global)</td>
                <td><code>context file: ~/.pi/agent/AGENTS.md</code></td></tr>
              <tr><td>2</td><td><code>/</code></td><td>no</td><td>–</td></tr>
              <tr><td>3</td><td><code>/work</code></td><td>no</td><td>–</td></tr>
              <tr><td>4</td><td><code>/work/shop</code> (repo root)</td><td>yes</td>
                <td><code>context file: /work/shop/AGENTS.md</code></td></tr>
              <tr><td>5</td><td><code>/work/shop/web</code> (cwd)</td><td>yes (CLAUDE.md)</td>
                <td><code>context file: /work/shop/web/CLAUDE.md</code></td></tr>
            </table>
            <p>Global first, then outermost folder → innermost. More specific instructions come
            later in the prompt. Then the whole assembled prompt is logged and shown.</p>
          </details>
          <details>
            <summary>Simplifications in this toy</summary>
            <p>Real pi also lists tools, rules, docs paths and skills, supports
            <code>AGENTS.override.md</code>, <code>SYSTEM.md</code> and
            <code>APPEND_SYSTEM.md</code>, and wraps sections in tags. The file tag format
            <code>&lt;project_instructions path="..."&gt;</code> matches pi's source, but treat
            the rest as a sketch, not pi's exact text.</p>
          </details>
        `,
        code: `// Simulated disk. Real pi reads these from your file system.
const fs = {
  '~/.pi/agent/AGENTS.md': 'Always answer in British English.',
  '/work/shop/AGENTS.md': 'This repo uses pnpm. Run pnpm test after edits.',
  '/work/shop/web/CLAUDE.md': 'Frontend is Vue 3 (script setup style).',
};

const BASE = 'You are an expert coding assistant operating inside pi, ' +
  'a coding agent harness.';

// Look for one context file per directory
function contextFileIn(dir) {
  for (const name of ['AGENTS.md', 'CLAUDE.md']) {
    const path = (dir === '/' ? '' : dir) + '/' + name;
    if (fs[path]) return { path, content: fs[path] };
  }
  return null;
}

function loadContextFiles(cwd, agentDir) {
  const files = [];
  const global = contextFileIn(agentDir);
  if (global) files.push(global);

  // Walk from cwd up to "/", then reverse so outer folders come first
  const ancestors = [];
  let dir = cwd;
  while (true) {
    const f = contextFileIn(dir);
    if (f) ancestors.unshift(f);
    if (dir === '/') break;
    dir = dir.slice(0, dir.lastIndexOf('/')) || '/';
  }
  return files.concat(ancestors);
}

function buildSystemPrompt(cwd) {
  const files = loadContextFiles(cwd, '~/.pi/agent');
  files.forEach(f => console.log('context file: ' + f.path));
  const project = files.map(f =>
    '<project_instructions path="' + f.path + '">\\n' + f.content +
    '\\n</project_instructions>');
  return [BASE, 'Project-specific instructions and guidelines:', ...project,
    'Current working directory: ' + cwd].join('\\n\\n');
}

const prompt = buildSystemPrompt('/work/shop/web');
console.log('--- system prompt ---\\n' + prompt);

const pre = document.createElement('pre');
pre.style.cssText = 'white-space:pre-wrap;font-size:12px;background:#f4f4f5;padding:8px';
pre.textContent = prompt;
document.getElementById('root').appendChild(pre);`,
      },
    ],
    quiz: [
      {
        q: 'Who writes the system prompt?',
        options: [
          'The end user in each message',
          'The app / harness (possibly including your config files like AGENTS.md)',
          'The model itself',
          'The tokenizer',
        ],
        answer: 1,
        why: 'The system prompt is the app’s instruction layer. In pi it comes from base instructions plus context files.',
      },
      {
        q: 'In pi, what does a project <code>AGENTS.md</code> do?',
        options: [
          'Installs agents from npm',
          'Its contents are added to the system prompt as project instructions',
          'It lists allowed bash commands',
          'It stores the session history',
        ],
        answer: 1,
        why: 'pi discovers AGENTS.md / CLAUDE.md files and includes them in the system prompt.',
      },
      {
        q: 'Difference between <code>SYSTEM.md</code> and <code>APPEND_SYSTEM.md</code> in pi?',
        options: [
          'None',
          'SYSTEM.md replaces the default system prompt; APPEND_SYSTEM.md adds to it',
          'SYSTEM.md is for Windows',
          'APPEND_SYSTEM.md replaces it; SYSTEM.md adds to it',
        ],
        answer: 1,
        why: 'Per pi’s configuration docs: SYSTEM.md replaces, APPEND_SYSTEM.md appends.',
      },
      {
        q: 'Why is the system prompt sent on every call?',
        options: [
          'For logging',
          'Because the API is stateless; the model has no memory of the last call’s instructions',
          'It is only sent once per day',
          'To warm up the GPU',
        ],
        answer: 1,
        why: 'Statelessness applies to instructions too; every request must carry them.',
      },
    ],
    exercise: {
      task: `<p>Add support for an <code>APPEND_SYSTEM.md</code>-style addendum. Change
      <code>buildSystemPrompt(base, append, contextFiles)</code> so the result is: base, then
      the <code>append</code> text (only if non-empty), then each context file's content. Join
      with blank lines and log it.</p>`,
      starter: `const contextFiles = [
  { path: '/repo/AGENTS.md', content: 'Use pnpm.' },
];

function buildSystemPrompt(base, append, files) {
  // TODO: include append (if any) and file contents
  return base;
}

console.log(buildSystemPrompt('You are a coding assistant.', 'Reply in Thai.', contextFiles));
console.log('---');
console.log(buildSystemPrompt('You are a coding assistant.', '', contextFiles));`,
      hint: 'Build an array [base], push append if it is truthy, push each file.content, then .join("\\n\\n").',
      solution: `const contextFiles = [
  { path: '/repo/AGENTS.md', content: 'Use pnpm.' },
];

function buildSystemPrompt(base, append, files) {
  const parts = [base];
  if (append) parts.push(append);
  for (const f of files) parts.push(f.content);
  return parts.join('\\n\\n');
}

console.log(buildSystemPrompt('You are a coding assistant.', 'Reply in Thai.', contextFiles));
console.log('---');
console.log(buildSystemPrompt('You are a coding assistant.', '', contextFiles));`,
    },
  },
);
