window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── recursion
  {
    id: 'recursion',
    section: 'Recursion & Laziness',
    title: 'Thinking Recursively',
    explain: `
      <p>A loop says <em>how</em> to walk through data step by step. Recursion says <em>what the
      answer is</em> in terms of a smaller version of the same question. Every recursive function
      has exactly two parts:</p>
      <ul>
        <li><strong>Base case</strong>: the input is so small that the answer is obvious
        (empty list → sum is <code>0</code>, a file → its size).</li>
        <li><strong>Recursive case</strong>: split the input into a piece you can handle now plus a
        <em>smaller</em> problem of the same shape, and trust the function to solve that.</li>
      </ul>
      <p>That "trust" is the mental trick, sometimes called the <strong>recursive leap of
      faith</strong>. When writing <code>sum</code>, you don't trace every call in your head. You
      just say: "if <code>sum(tail)</code> is correct, then <code>head + sum(tail)</code> is
      correct". If the base case is right and every call gets smaller, the whole thing is right
      (this is mathematical induction in disguise).</p>

      <h3>Lists: head and tail</h3>
      <pre><code>const sum = xs =&gt; {
  if (xs.length === 0) return 0;      // base case
  const [head, ...tail] = xs;         // one piece + a smaller list
  return head + sum(tail);            // same problem, smaller input
};</code></pre>
      <p>Destructuring <code>[head, ...tail]</code> makes the list shape obvious. Note the base
      case checks <code>xs.length</code>, not <code>head === undefined</code>: an array can
      legally contain <code>undefined</code>.</p>

      <h3>Trees: where recursion really shines</h3>
      <p>Folders contain files and folders. Comments contain replies that contain replies. The
      data is <em>defined</em> recursively, so the code that walks it is naturally recursive too:
      the shape of the function mirrors the shape of the data.</p>
      <pre><code>const totalSize = node =&gt;
  node.children
    ? node.children.reduce((acc, child) =&gt; acc + totalSize(child), 0)
    : node.size;</code></pre>
      <p>Writing that with a loop means managing your own stack of "folders still to visit".
      Recursion lets the JavaScript call stack do that bookkeeping for you.</p>

      <h3>Recursion vs loops</h3>
      <ul>
        <li><strong>Loops</strong> are better for long flat lists in JS: no stack limit, no
        array copies. <code>[head, ...tail]</code> copies the tail on every call, so the list
        version is O(n²) and fine only for small inputs.</li>
        <li><strong>Recursion</strong> is better for nested/branching data (trees, JSON, ASTs,
        menus) and for definitions that are naturally self-similar.</li>
      </ul>
      <div class="tip">Every loop can be written as recursion and vice versa. Pick the one whose
      shape matches the data. Flat data → loop or <code>reduce</code>. Nested data → recursion.</div>
      <div class="warn">Forgetting the base case, or recursing on something that is <em>not</em>
      smaller, gives infinite recursion. In JS that ends with
      <code>RangeError: Maximum call stack size exceeded</code> (next lesson).</div>
    `,
    examples: [
      {
        title: 'Recursion over arrays: [head, ...tail]',
        code: `// Recursion = base case + the same problem on a smaller input.

const sum = xs => {
  if (xs.length === 0) return 0; // base case: empty list
  const [head, ...tail] = xs;
  return head + sum(tail); // smaller problem: the tail
};

const map = (f, xs) => {
  if (xs.length === 0) return [];
  const [head, ...tail] = xs;
  return [f(head), ...map(f, tail)];
};

const filter = (pred, xs) => {
  if (xs.length === 0) return [];
  const [head, ...tail] = xs;
  return pred(head) ? [head, ...filter(pred, tail)] : filter(pred, tail);
};

const reverse = xs => {
  if (xs.length === 0) return [];
  const [head, ...tail] = xs;
  return [...reverse(tail), head];
};

console.log('sum:', sum([1, 2, 3, 4]));
console.log('map:', map(x => x * 10, [1, 2, 3]));
console.log('filter:', filter(x => x % 2 === 0, [1, 2, 3, 4, 5, 6]));
console.log('reverse:', reverse(['a', 'b', 'c']));

// Watch the calls go down to the base case, then come back up
const traceSum = (xs, depth = 0) => {
  const pad = '  '.repeat(depth);
  console.log(pad + 'sum(' + JSON.stringify(xs) + ')');
  if (xs.length === 0) {
    console.log(pad + '= 0 (base case)');
    return 0;
  }
  const [head, ...tail] = xs;
  const result = head + traceSum(tail, depth + 1);
  console.log(pad + '= ' + head + ' + ' + (result - head) + ' = ' + result);
  return result;
};

traceSum([1, 2, 3]);`,
      },
      {
        title: 'Recursion over trees: folder sizes and comment threads',
        code: `const fileTree = {
  name: 'project',
  children: [
    { name: 'README.md', size: 120 },
    {
      name: 'src',
      children: [
        { name: 'index.js', size: 300 },
        {
          name: 'utils',
          children: [
            { name: 'math.js', size: 80 },
            { name: 'str.js', size: 50 },
          ],
        },
      ],
    },
    { name: 'package.json', size: 40 },
  ],
};

// A folder's size = sum of its children's sizes. A file's size = its size.
const totalSize = node =>
  node.children
    ? node.children.reduce((acc, child) => acc + totalSize(child), 0)
    : node.size;

const printTree = (node, depth = 0) => {
  const icon = node.children ? '📁 ' : '📄 ';
  console.log('  '.repeat(depth) + icon + node.name + ' (' + totalSize(node) + ')');
  (node.children ?? []).forEach(child => printTree(child, depth + 1));
};

console.log('total size:', totalSize(fileTree));
printTree(fileTree);

// Comments: a list of comments, each with a list of replies (same shape!)
const comments = [
  {
    text: 'Nice post',
    replies: [
      { text: 'Thanks!', replies: [{ text: 'np', replies: [] }] },
      { text: '+1', replies: [] },
    ],
  },
  { text: 'Typo in paragraph 2', replies: [] },
];

const countComments = list =>
  list.reduce((n, c) => n + 1 + countComments(c.replies), 0);

const deepest = list =>
  list.length === 0 ? 0 : 1 + Math.max(...list.map(c => deepest(c.replies)));

console.log('comment count:', countComments(comments));
console.log('deepest thread:', deepest(comments));`,
      },
    ],
    quiz: [
      {
        q: `What are the two parts every recursive function needs?`,
        options: [
          'A loop and a counter',
          'A base case and a recursive case on a smaller input',
          'A cache and a key',
          'A generator and a yield',
        ],
        answer: 1,
        why: `The base case stops the recursion; the recursive case makes progress by calling
        itself on a strictly smaller problem. Without both you get wrong results or infinite
        recursion.`,
      },
      {
        q: `Why is <code>xs.length === 0</code> a better base case than
        <code>head === undefined</code>?`,
        options: [
          'It is faster',
          'Arrays may contain undefined as a real element, which would stop recursion early',
          'Destructuring does not work on empty arrays',
          'There is no difference',
        ],
        answer: 1,
        why: `<code>[1, undefined, 3]</code> would "end" at index 1 with the head check. Checking
        length tests the structure, not the values.`,
      },
      {
        q: `For a long flat array (say 100,000 numbers), which is the best choice in JavaScript?`,
        options: [
          'Recursive [head, ...tail] sum',
          'A loop or reduce',
          'Either, they are identical',
          'A recursive function with memoization',
        ],
        answer: 1,
        why: `The recursive version uses one stack frame per element (overflow around ~10k
        frames) and copies the tail each call (O(n²)). <code>reduce</code> or a loop is linear
        and uses constant stack.`,
      },
      {
        q: `Why is recursion a natural fit for a folder tree?`,
        options: [
          'Because recursion is always faster',
          'Because the data is defined in terms of itself: a folder contains folders',
          'Because loops cannot read objects',
          'Because trees have no base case',
        ],
        answer: 1,
        why: `The function's shape mirrors the data's shape: one branch for "file" (base case),
        one for "folder" (recurse on children). A loop would need a manual stack.`,
      },
      {
        q: `In <code>countComments</code>, what plays the role of the base case?`,
        options: [
          'There is none, so it recurses forever',
          'An empty replies list: reduce over [] returns the initial 0',
          'The first comment',
          'Math.max',
        ],
        answer: 1,
        why: `<code>[].reduce(fn, 0)</code> returns <code>0</code> without calling
        <code>fn</code>, so leaves stop the recursion naturally. The base case is hidden inside
        reduce's initial value.`,
      },
    ],
    exercise: {
      task: `<p>Write two recursive functions:</p>
      <ul>
        <li><code>flatten(xs)</code>: flattens arbitrarily nested arrays.
        <code>flatten([1, [2, [3, [4]]], 5])</code> → <code>[1, 2, 3, 4, 5]</code>.
        Don't use <code>Array.prototype.flat</code>.</li>
        <li><code>findPath(node, name)</code>: in a file tree like the example, return the path
        to the node with that name as an array of names (e.g.
        <code>['project', 'src', 'index.js']</code>), or <code>null</code> if not found.</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const flatten = xs => {
  // TODO: base case = empty array.
  // Otherwise: take head; if it's an array, flatten it too.
  return xs;
};

const findPath = (node, name) => {
  // TODO: if node.name === name → [node.name]
  // else search each child; if a child returns a path, prepend node.name
  return null;
};

const tree = {
  name: 'project',
  children: [
    { name: 'README.md' },
    {
      name: 'src',
      children: [{ name: 'index.js' }, { name: 'utils', children: [{ name: 'math.js' }] }],
    },
  ],
};

check('flatten simple', flatten([1, [2, 3]]), [1, 2, 3]);
check('flatten deep', flatten([1, [2, [3, [4]]], 5]), [1, 2, 3, 4, 5]);
check('flatten empty', flatten([[], [[]]]), []);
check('findPath root', findPath(tree, 'project'), ['project']);
check('findPath deep', findPath(tree, 'math.js'), ['project', 'src', 'utils', 'math.js']);
check('findPath missing', findPath(tree, 'nope.txt'), null);`,
      hint: `flatten: <code>const [head, ...tail] = xs;</code> then
      <code>Array.isArray(head) ? [...flatten(head), ...flatten(tail)] : [head, ...flatten(tail)]</code>.
      findPath: loop over <code>node.children ?? []</code>, call findPath on each, and return
      <code>[node.name, ...path]</code> for the first non-null result.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const flatten = xs => {
  if (xs.length === 0) return [];
  const [head, ...tail] = xs;
  return Array.isArray(head)
    ? [...flatten(head), ...flatten(tail)]
    : [head, ...flatten(tail)];
};

const findPath = (node, name) => {
  if (node.name === name) return [node.name];
  for (const child of node.children ?? []) {
    const path = findPath(child, name);
    if (path) return [node.name, ...path];
  }
  return null;
};

const tree = {
  name: 'project',
  children: [
    { name: 'README.md' },
    {
      name: 'src',
      children: [{ name: 'index.js' }, { name: 'utils', children: [{ name: 'math.js' }] }],
    },
  ],
};

check('flatten simple', flatten([1, [2, 3]]), [1, 2, 3]);
check('flatten deep', flatten([1, [2, [3, [4]]], 5]), [1, 2, 3, 4, 5]);
check('flatten empty', flatten([[], [[]]]), []);
check('findPath root', findPath(tree, 'project'), ['project']);
check('findPath deep', findPath(tree, 'math.js'), ['project', 'src', 'utils', 'math.js']);
check('findPath missing', findPath(tree, 'nope.txt'), null);`,
    },
  },

  // ───────────────────────────────────────────────────────────── stack-and-trampolines
  {
    id: 'stack-and-trampolines',
    section: 'Recursion & Laziness',
    title: 'Stack Limits, TCO & Trampolines',
    explain: `
      <p>Every function call pushes a <strong>stack frame</strong>: a small record holding the
      arguments, local variables and "where to continue when this returns". When the function
      returns, its frame is popped. In <code>n + sumTo(n - 1)</code> the outer call
      <em>can't</em> finish until the inner one returns (it still has to do the
      <code>+</code>), so its frame must stay on the stack. Recursing 100,000 levels deep means
      100,000 frames alive at once.</p>
      <p>The stack is small (a few MB). When it runs out, the engine throws:</p>
      <ul>
        <li>Chrome / Node / Edge (V8) and Safari (JavaScriptCore):
        <code>RangeError: Maximum call stack size exceeded</code></li>
        <li>Firefox (SpiderMonkey): <code>InternalError: too much recursion</code></li>
      </ul>
      <p>The exact depth limit depends on the engine and on how big each frame is. Around
      10,000 frames is a typical ballpark for a simple function in V8. Don't rely on any number.</p>

      <h3>Tail calls and TCO</h3>
      <p>A call is in <strong>tail position</strong> when it's the very last thing the function
      does: <code>return f(x)</code> with nothing left to compute afterwards. Then the current
      frame isn't needed any more, and an engine <em>could</em> reuse it. That's
      <strong>tail call optimization</strong>. Rewriting with an accumulator puts the call in
      tail position:</p>
      <pre><code>// not a tail call: + happens after the inner call returns
const sumTo = n =&gt; (n === 0 ? 0 : n + sumTo(n - 1));

// tail call: the recursive call IS the return value
const sumToTail = (n, acc = 0) =&gt;
  n === 0 ? acc : sumToTail(n - 1, acc + n);</code></pre>
      <div class="warn">ES2015 <em>does</em> specify proper tail calls (in strict mode). But only
      <strong>Safari / JavaScriptCore</strong> implements them. <strong>V8</strong> (Chrome,
      Node, Edge, Deno) and <strong>SpiderMonkey</strong> (Firefox) don't, and have no plans to.
      So <code>sumToTail(100000)</code> still overflows in Chrome and Firefox. You cannot rely
      on TCO in portable JavaScript.</div>

      <h3>Trampolines: TCO by hand</h3>
      <p>Instead of <em>making</em> the next call, return a tiny function (a
      <strong>thunk</strong>) that <em>would</em> make it. A loop, the trampoline, keeps calling
      thunks until it gets a non-function value. Each thunk returns before the next one runs, so
      the stack never grows past a couple of frames.</p>
      <pre><code>const trampoline = fn =&gt; (...args) =&gt; {
  let result = fn(...args);
  while (typeof result === 'function') result = result();
  return result;
};

const sumStep = (n, acc) =&gt; (n === 0 ? acc : () =&gt; sumStep(n - 1, acc + n));
const sumTo = n =&gt; trampoline(sumStep)(n, 0);</code></pre>
      <div class="tip">Trampolines trade stack space for a heap allocation per step (one closure
      each). They're slower than a plain loop. Reach for them when the recursive formulation is
      much clearer (mutual recursion, interpreters, state machines), otherwise just write a
      loop.</div>
    `,
    examples: [
      {
        title: 'Watching the stack grow (and overflow)',
        explain: `
          <details>
            <summary>Step by step: frames for <code>factorial(4)</code></summary>
            <p>Each <code>→ push</code> line is a new frame. None of them can finish until the
            one below returns, because each still has to multiply by <code>n</code>.</p>
            <table>
              <tr><th>Step</th><th>Stack (top on the right)</th><th>Console</th></tr>
              <tr><td>1</td><td>f(4)</td><td><code>→ push factorial(4)   stack depth: 1</code></td></tr>
              <tr><td>2</td><td>f(4) f(3)</td><td><code>→ push factorial(3)   stack depth: 2</code></td></tr>
              <tr><td>3</td><td>f(4) f(3) f(2)</td><td><code>→ push factorial(2)   stack depth: 3</code></td></tr>
              <tr><td>4</td><td>f(4) f(3) f(2) f(1)</td><td><code>→ push factorial(1)   stack depth: 4</code></td></tr>
              <tr><td>5</td><td>f(4) f(3) f(2)</td><td><code>← pop  factorial(1) = 1</code> (base case)</td></tr>
              <tr><td>6</td><td>f(4) f(3)</td><td><code>← pop  factorial(2) = 2</code></td></tr>
              <tr><td>7</td><td>f(4)</td><td><code>← pop  factorial(3) = 6</code></td></tr>
              <tr><td>8</td><td>(empty)</td><td><code>← pop  factorial(4) = 24</code></td></tr>
            </table>
            <p>Peak depth = 4 = n. For <code>sumTo(100000)</code> the peak would be 100,000
            frames, which is far past the limit.</p>
          </details>
          <details>
            <summary>What the rest of the console shows (and why it differs per browser)</summary>
            <table>
              <tr><th>Line</th><th>Chrome / Node / Firefox</th><th>Safari</th></tr>
              <tr><td><code>sumTo(1000)</code></td><td><code>500500</code></td><td><code>500500</code></td></tr>
              <tr><td><code>sumTo(100000)</code></td><td>threw RangeError (Firefox: InternalError)</td><td>threw RangeError</td></tr>
              <tr><td><code>sumToTail(100000)</code></td><td>threw: no TCO</td><td><code>5000050000</code>: JSC reuses the frame</td></tr>
              <tr><td>probe</td><td>"about N frames", N ≈ 10k in V8</td><td>engine specific</td></tr>
            </table>
            <p>The playground runs your code as an ES module, and modules are always strict
            mode, which is exactly where the spec's proper tail calls apply. That's why Safari can
            run <code>sumToTail</code> and the others can't.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>100000</code> to <code>5000</code>. Both versions succeed: you're
              under the limit.</li>
              <li>Add a few unused local variables inside <code>probe</code>
              (<code>const a = 1, b = 2, c = 3;</code>). The frame count often drops: bigger
              frames, fewer fit.</li>
            </ul>
            <div class="warn">Rewriting into tail form is a good habit (it's the first step to a
            trampoline), but on its own it fixes nothing outside Safari.</div>
          </details>
        `,
        code: `function factorial(n, depth = 0) {
  const pad = '  '.repeat(depth);
  console.log(pad + '→ push factorial(' + n + ')   stack depth: ' + (depth + 1));
  if (n <= 1) {
    console.log(pad + '← pop  factorial(1) = 1');
    return 1;
  }
  const result = n * factorial(n - 1, depth + 1); // must wait for the inner call
  console.log(pad + '← pop  factorial(' + n + ') = ' + result);
  return result;
}

factorial(4);

const sumTo = n => (n === 0 ? 0 : n + sumTo(n - 1));
const sumToTail = (n, acc = 0) => (n === 0 ? acc : sumToTail(n - 1, acc + n));

console.log('sumTo(1000):', sumTo(1000));

for (const [label, fn] of [['sumTo', sumTo], ['sumToTail', sumToTail]]) {
  try {
    console.log(label + '(100000):', fn(100000));
  } catch (e) {
    console.log(label + '(100000) threw', e.name + ':', e.message);
  }
}

let frames = 0;
const probe = () => {
  frames++;
  probe();
};
try {
  probe();
} catch {
  console.log('this engine allowed about', frames, 'frames');
}`,
      },
      {
        title: 'A trampoline: deep recursion in constant stack',
        explain: `
          <details>
            <summary>The problem: the recursive call keeps the old frame alive</summary>
            <p>In the previous example even the tail-recursive <code>sumToTail</code> overflowed
            in V8 and SpiderMonkey. We need a way to say "the next step is
            <code>sumStep(n - 1, acc + n)</code>" <em>without</em> calling it from inside the
            current frame.</p>
            <p>Answer: return the next step as a value, <code>() =&gt; sumStep(n - 1, acc + n)</code>,
            and let someone else call it after we've returned.</p>
          </details>
          <details>
            <summary>Step by step: the bounce trace for <code>sumTo(3)</code></summary>
            <table>
              <tr><th>Bounce</th><th>Call made by the loop</th><th>Returns</th><th>Stack depth during call</th><th>Console</th></tr>
              <tr><td>start</td><td><code>sumStep(3, 0)</code></td><td>thunk</td><td>2 (trampoline + sumStep)</td><td><code>  sumStep(3, 0)</code></td></tr>
              <tr><td>1</td><td>thunk → <code>sumStep(2, 3)</code></td><td>thunk</td><td>3 (trampoline + thunk + sumStep)</td><td><code>  sumStep(2, 3)</code></td></tr>
              <tr><td>2</td><td>thunk → <code>sumStep(1, 5)</code></td><td>thunk</td><td>3</td><td><code>  sumStep(1, 5)</code></td></tr>
              <tr><td>3</td><td>thunk → <code>sumStep(0, 6)</code></td><td><code>6</code> (not a function)</td><td>3</td><td><code>  sumStep(0, 6)</code></td></tr>
              <tr><td>end</td><td>loop exits</td><td><code>6</code></td><td>1</td><td><code>  (trampoline: 3 bounces)</code> then <code>result: 6</code></td></tr>
            </table>
            <p>The depth never goes above 3, no matter how big <code>n</code> is. So
            <code>sumTo(1000000)</code> prints <code>(trampoline: 1000000 bounces)</code> and
            <code>sumTo(1000000): 500000500000</code> in every browser.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const sumStep = (n, acc) =&gt; {
  if (n === 0) return acc;                // ① done: return a plain value
  return () =&gt; sumStep(n - 1, acc + n);   // ② not done: return a THUNK, don't call
};

while (typeof result === 'function') {    // ③ keep bouncing while we get thunks
  result = result();
}</code></pre>
            <ol>
              <li><strong>①</strong> The base case returns the answer, which ends the loop.</li>
              <li><strong>②</strong> The recursive case describes the next call but returns
              immediately, so this <code>sumStep</code> frame is popped.</li>
              <li><strong>③</strong> The loop, not the function, drives the iteration. One thunk
              runs at a time, on top of the trampoline's single frame.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: when the real result is a function</summary>
            <div class="warn">This trampoline uses <code>typeof result === 'function'</code> to
            mean "keep going". If your recursion's final answer is itself a function, the
            trampoline will call it by mistake. Fix: tag the thunks, e.g. return
            <code>{ tag: 'More', next: () =&gt; ... }</code> vs <code>{ tag: 'Done', value }</code>,
            and loop while <code>tag === 'More'</code>.</div>
          </details>
        `,
        code: `const trampoline = fn => (...args) => {
  let result = fn(...args);
  let bounces = 0;
  while (typeof result === 'function') {
    result = result(); // call the thunk; the previous frame is already gone
    bounces++;
  }
  console.log('  (trampoline: ' + bounces + ' bounces)');
  return result;
};

let TRACE = true;

const sumStep = (n, acc) => {
  if (TRACE) console.log('  sumStep(' + n + ', ' + acc + ')');
  if (n === 0) return acc; // done → plain value
  return () => sumStep(n - 1, acc + n); // not done → a thunk for the next call
};

const sumTo = n => trampoline(sumStep)(n, 0);

console.log('sumTo(3):');
console.log('result:', sumTo(3));

TRACE = false;
console.log('sumTo(100000):', sumTo(100000));
console.log('sumTo(1000000):', sumTo(1000000));`,
      },
    ],
    quiz: [
      {
        q: `Why does <code>n + sumTo(n - 1)</code> need one stack frame per level?`,
        options: [
          'Because JavaScript copies the number n',
          'Because the + runs after the inner call returns, so the outer frame must wait',
          'Because arrow functions cannot be optimized',
          'It does not; JS reuses frames automatically',
        ],
        answer: 1,
        why: `The outer call still has work to do (the addition) after the inner call, so it
        can't be discarded. That's what "not in tail position" means.`,
      },
      {
        q: `Which engines implement ES2015 proper tail calls today?`,
        options: [
          'All modern browsers',
          'V8 (Chrome/Node) only',
          'Only JavaScriptCore (Safari)',
          'None, it was removed from the spec',
        ],
        answer: 2,
        why: `It's still in the spec, but only JavaScriptCore ships it. V8 and SpiderMonkey don't,
        so portable code can't depend on it.`,
      },
      {
        q: `Which of these is a tail call?`,
        options: [
          '<code>return 1 + f(x)</code>',
          '<code>return f(x) * 2</code>',
          '<code>return f(x - 1, acc * x)</code>',
          '<code>const r = f(x); return r;</code> with a <code>finally</code> block',
        ],
        answer: 2,
        why: `Only option C returns the call's result directly with nothing left to do. A
        <code>finally</code> block also runs after the call, so it's not a tail position.`,
      },
      {
        q: `In a trampoline, what does the recursive step return instead of calling itself?`,
        options: [
          'A Promise',
          'A thunk: a zero-argument function that will make the next call',
          'An array of frames',
          'undefined',
        ],
        answer: 1,
        why: `Returning <code>() =&gt; step(n - 1, ...)</code> lets the current frame finish. The
        trampoline's loop calls the thunk afterwards, so frames never pile up.`,
      },
      {
        q: `What error does Firefox throw on stack overflow?`,
        options: [
          'RangeError: Maximum call stack size exceeded',
          'InternalError: too much recursion',
          'StackOverflowError',
          'It never throws, it freezes',
        ],
        answer: 1,
        why: `SpiderMonkey uses the non-standard <code>InternalError</code> with the message "too
        much recursion". V8 and JSC throw a <code>RangeError</code>. Catch broadly if you must.`,
      },
    ],
    exercise: {
      task: `<p><code>isEven</code> / <code>isOdd</code> defined by <em>mutual</em> recursion
      (each calls the other with <code>n - 1</code>) overflow for big <code>n</code>. Write
      <code>isEvenStep</code> and <code>isOddStep</code> so they return thunks instead of
      calling each other, then wrap them with the given <code>trampoline</code>. The checks
      include <code>n = 100001</code>.</p>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const trampoline = fn => (...args) => {
  let result = fn(...args);
  while (typeof result === 'function') result = result();
  return result;
};

// Plain mutual recursion (overflows for big n):
// const isEven = n => (n === 0 ? true : isOdd(n - 1));
// const isOdd = n => (n === 0 ? false : isEven(n - 1));

const isEvenStep = n => {
  // TODO: base case true; otherwise return a thunk that calls isOddStep
  return undefined;
};

const isOddStep = n => {
  // TODO: base case false; otherwise return a thunk that calls isEvenStep
  return undefined;
};

const isEven = trampoline(isEvenStep);
const isOdd = trampoline(isOddStep);

check('isEven(10)', isEven(10), true);
check('isOdd(7)', isOdd(7), true);
check('isEven(0)', isEven(0), true);
check('isEven(100001)', isEven(100001), false);
check('isOdd(100001)', isOdd(100001), true);`,
      hint: `<code>const isEvenStep = n =&gt; (n === 0 ? true : () =&gt; isOddStep(n - 1));</code>
      and the mirror image for <code>isOddStep</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const trampoline = fn => (...args) => {
  let result = fn(...args);
  while (typeof result === 'function') result = result();
  return result;
};

const isEvenStep = n => (n === 0 ? true : () => isOddStep(n - 1));
const isOddStep = n => (n === 0 ? false : () => isEvenStep(n - 1));

const isEven = trampoline(isEvenStep);
const isOdd = trampoline(isOddStep);

check('isEven(10)', isEven(10), true);
check('isOdd(7)', isOdd(7), true);
check('isEven(0)', isEven(0), true);
check('isEven(100001)', isEven(100001), false);
check('isOdd(100001)', isOdd(100001), true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── memoization
  {
    id: 'memoization',
    section: 'Recursion & Laziness',
    title: 'Memoization',
    explain: `
      <p><strong>Memoization</strong> wraps a function with a cache: the first call with some
      arguments computes the result and stores it; later calls with the same arguments return
      the stored result without recomputing.</p>
      <pre><code>const memoize = fn =&gt; {
  const cache = new Map();
  return arg =&gt; {
    if (cache.has(arg)) return cache.get(arg);
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
};</code></pre>

      <h3>Only for pure functions</h3>
      <p>Caching is only safe if the same arguments <em>always</em> give the same result and
      calling the function has no side effects. Memoize <code>() =&gt; Date.now()</code> and time
      stops. Memoize <code>sendEmail(user)</code> and the second email never goes out. This is
      where purity pays off: for a pure function, "return the cached value" is
      indistinguishable from "call it again", just faster.</p>

      <h3>The cache key is the hard part</h3>
      <ul>
        <li><strong>One primitive argument</strong> (number, string): use it directly as a
        <code>Map</code> key.</li>
        <li><strong>Several arguments</strong>: build a key such as
        <code>JSON.stringify(args)</code>, or nest Maps (one level per argument).</li>
        <li><strong>Object arguments</strong>: <code>Map</code> compares keys by
        <em>identity</em> (<code>===</code>), not by content. Two equal-looking objects are two
        different keys. And if you mutate a cached object, the cache happily returns a stale
        answer.</li>
      </ul>
      <h3><code>WeakMap</code> for object keys</h3>
      <p>A <code>Map</code> holds its keys strongly: cache results for 10,000 request objects
      and none of them can ever be garbage collected. A <code>WeakMap</code> only accepts objects
      (and non-registered symbols) as keys and holds them weakly: when nothing else references
      the key, the entry can disappear. The price: you can't iterate it or ask its size.</p>
      <div class="tip">Memoization trades memory for time. An unbounded cache is a memory leak
      with good intentions. For long-running apps, cap it (LRU: drop the least recently used
      entry) or use a WeakMap.</div>
    `,
    examples: [
      {
        title: 'Memoized fib: counting calls',
        explain: `
          <details>
            <summary>The problem: naive fib recomputes the same values again and again</summary>
            <p><code>fib(5)</code> calls <code>fib(4)</code> and <code>fib(3)</code>. But
            <code>fib(4)</code> <em>also</em> calls <code>fib(3)</code>. The work doubles at
            every level: <code>fib(25)</code> makes 242,785 calls to compute values that are
            only 26 distinct numbers (<code>fib(0)</code> … <code>fib(25)</code>).</p>
          </details>
          <details>
            <summary>Step by step: what each line prints and why</summary>
            <table>
              <tr><th>Console</th><th>Why</th></tr>
              <tr><td><code>slowFib(25) = 75025 | calls: 242785</code></td><td>Exponential tree
              of calls, nothing cached.</td></tr>
              <tr><td><code>wrapped(25) = 75025 | calls: 242785</code></td><td>❌ Only the
              <em>outer</em> call goes through the cache. Inside, <code>slowFib</code> calls
              <code>slowFib</code> directly, not <code>wrapped</code>.</td></tr>
              <tr><td><code>wrapped(25) again = 75025 | calls: 0</code></td><td>The top-level
              answer for 25 is cached, so nothing runs. But <code>wrapped(24)</code> would
              recompute everything.</td></tr>
              <tr><td><code>fastFib(25) = 75025 | calls: 26</code></td><td>✅ The recursion goes
              through the memoized function: each n from 0 to 25 is computed exactly once.</td></tr>
              <tr><td><code>fastFib(26) = 121393 | calls: 1</code></td><td>Only 26 is new;
              <code>fastFib(25)</code> and <code>fastFib(24)</code> are cache hits.</td></tr>
              <tr><td><code>fastFib(70) = 190392490709135 | calls: 44</code></td><td>27 … 70 are
              new: 44 calls. Naive fib(70) would make about 6×10¹⁴ calls.</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const wrapped = memoize(slowFib);   // ① caches only the outside door

const fastFib = memoize(n =&gt;        // ② the function being memoized...
  n &lt; 2 ? n : fastFib(n - 1) + fastFib(n - 2)  // ③ ...recurses through the cache
);</code></pre>
            <ol>
              <li><strong>①</strong> <code>memoize</code> returns a <em>new</em> function. The
              original <code>slowFib</code> is unchanged and still refers to itself.</li>
              <li><strong>②</strong> We define the body inline and memoize it immediately.</li>
              <li><strong>③</strong> Inner calls use the name <code>fastFib</code>, i.e. the
              cached version. That's what turns 242,785 calls into 26.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>slowFib(25)</code> to <code>slowFib(32)</code>: about 7 million
              calls and a noticeable pause. <code>fastFib(32)</code> is instant.</li>
              <li>Call <code>fastFib(5000)</code>. Even memoized, the first call recurses 5000
              deep and may overflow the stack. Warm the cache bottom-up
              (<code>for (let i = 0; i &lt;= 5000; i++) fastFib(i)</code>) and it works (the
              number is <code>Infinity</code> by then, but no crash).</li>
            </ul>
          </details>
        `,
        code: `const memoize = fn => {
  const cache = new Map();
  return n => {
    if (cache.has(n)) return cache.get(n);
    const result = fn(n);
    cache.set(n, result);
    return result;
  };
};

let calls = 0;

const slowFib = n => {
  calls++;
  return n < 2 ? n : slowFib(n - 1) + slowFib(n - 2);
};

calls = 0;
console.log('slowFib(25) =', slowFib(25), '| calls:', calls);

// ❌ Wrapping from outside: the inner recursive calls still hit slowFib
const wrapped = memoize(slowFib);
calls = 0;
console.log('wrapped(25) =', wrapped(25), '| calls:', calls);
calls = 0;
console.log('wrapped(25) again =', wrapped(25), '| calls:', calls);

// ✅ Recursion goes THROUGH the memoized function
const fastFib = memoize(n => {
  calls++;
  return n < 2 ? n : fastFib(n - 1) + fastFib(n - 2);
});

calls = 0;
console.log('fastFib(25) =', fastFib(25), '| calls:', calls);
calls = 0;
console.log('fastFib(26) =', fastFib(26), '| calls:', calls);
calls = 0;
console.log('fastFib(70) =', fastFib(70), '| calls:', calls);`,
      },
      {
        title: 'Cache keys: object identity, JSON keys and WeakMap',
        explain: `
          <details>
            <summary>Step by step: hits and misses</summary>
            <table>
              <tr><th>Section</th><th>Call</th><th>Console</th><th>Why</th></tr>
              <tr><td>1</td><td><code>memoName(ada)</code></td><td><code>  MISS</code></td><td>First time we see this object.</td></tr>
              <tr><td>1</td><td><code>memoName(ada)</code></td><td><code>  HIT</code></td><td>Same reference → same Map key.</td></tr>
              <tr><td>2</td><td><code>memoName({ ...Ada })</code></td><td><code>  MISS</code></td><td>A brand-new object: different identity.</td></tr>
              <tr><td>2</td><td><code>memoName({ ...Ada })</code></td><td><code>  MISS</code></td><td>Another new object. Equal content doesn't matter to a Map.</td></tr>
              <tr><td>3</td><td><code>ada.last = 'King'</code> then <code>memoName(ada)</code></td><td><code>  HIT</code>, <code>  result: Ada Lovelace</code></td><td>⚠️ Stale! Same key, but the content changed under the cache.</td></tr>
              <tr><td>4</td><td><code>area(2, 3)</code> ×2, <code>area(3, 2)</code></td><td>MISS, HIT, MISS</td><td>JSON key <code>"[2,3]"</code> compares by value; <code>"[3,2]"</code> is a different string.</td></tr>
              <tr><td>5</td><td><code>weakName(ada)</code> ×2</td><td>MISS, HIT</td><td>Same identity rules as Map, but entries can be garbage collected.</td></tr>
              <tr><td>5</td><td><code>WeakMap.set('ada', …)</code></td><td><code>  WeakMap with a string key → TypeError</code></td><td>Weak keys must be objects (or non-registered symbols).</td></tr>
            </table>
          </details>
          <details>
            <summary>Common mistakes with keys</summary>
            <ul>
              <li><strong>Memoizing on mutable objects.</strong> Section 3 shows the stale
              answer. Memoization pairs with immutability: if you never mutate, identity
              <em>is</em> content.</li>
              <li><strong>JSON keys aren't perfect.</strong> <code>{ a: 1, b: 2 }</code> and
              <code>{ b: 2, a: 1 }</code> stringify differently; functions and
              <code>undefined</code> disappear; <code>NaN</code> becomes <code>null</code>;
              and stringifying big objects on every call can cost more than the work you're
              caching.</li>
            </ul>
            <div class="tip">This is exactly why React's <code>useMemo</code>,
            <code>React.memo</code> and selector libraries compare by reference: it's cheap, and
            it's correct as long as you update state immutably.</div>
          </details>
        `,
        code: `const memoize = (fn, cache = new Map()) => arg => {
  if (cache.has(arg)) {
    console.log('  HIT');
    return cache.get(arg);
  }
  console.log('  MISS');
  const result = fn(arg);
  cache.set(arg, result);
  return result;
};

const fullName = user => user.first + ' ' + user.last;
const memoName = memoize(fullName);

console.log('1) same object twice');
const ada = { first: 'Ada', last: 'Lovelace' };
memoName(ada);
memoName(ada);

console.log('2) two equal-looking new objects');
memoName({ first: 'Ada', last: 'Lovelace' });
memoName({ first: 'Ada', last: 'Lovelace' });

console.log('3) mutate the cached object ⚠️');
ada.last = 'King';
console.log('  result:', memoName(ada));

console.log('4) multi-arg with a JSON key (compares by value)');
const memoizeJSON = fn => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    console.log('  ' + (cache.has(key) ? 'HIT ' : 'MISS') + ' key=' + key);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key);
  };
};
const area = memoizeJSON((w, h) => w * h);
area(2, 3);
area(2, 3);
area(3, 2);

console.log('5) WeakMap: object keys only, garbage-collectable');
const weakName = memoize(fullName, new WeakMap());
weakName(ada);
weakName(ada);
try {
  new WeakMap().set('ada', 1);
} catch (e) {
  console.log('  WeakMap with a string key → ' + e.name);
}`,
      },
    ],
    quiz: [
      {
        q: `Which function is safe to memoize?`,
        options: [
          '<code>() =&gt; Math.random()</code>',
          '<code>user =&gt; db.save(user)</code>',
          '<code>(a, b) =&gt; a * b</code>',
          '<code>() =&gt; new Date().getHours()</code>',
        ],
        answer: 2,
        why: `Only a pure function (same input → same output, no side effects) can have its calls
        replaced with cached results without changing behaviour.`,
      },
      {
        q: `<code>const fast = memoize(slowFib)</code> where <code>slowFib</code> calls itself.
        Why is <code>fast(30)</code> still slow the first time?`,
        options: [
          'Map lookups are slow',
          'The recursive calls inside slowFib bypass the cache',
          'memoize only works on arrow functions',
          'It is not slow',
        ],
        answer: 1,
        why: `Only the outer call is cached. The inner <code>slowFib(n - 1)</code> calls refer to
        the original, uncached function.`,
      },
      {
        q: `A Map-based memoized function is called twice with
        <code>{ id: 1 }</code> literals. How many cache hits?`,
        options: ['0', '1', '2', 'It throws'],
        answer: 0,
        why: `Each literal creates a new object. Map keys compare with SameValueZero (like
        <code>===</code> for objects), so both calls are misses.`,
      },
      {
        q: `What is the main advantage of a WeakMap cache keyed by objects?`,
        options: [
          'It is iterable',
          'It compares keys by content',
          'Entries don\'t keep their key objects alive, so they can be garbage collected',
          'It accepts string keys',
        ],
        answer: 2,
        why: `WeakMap holds keys weakly. When the object is unreachable elsewhere, its cache entry
        can go away, so the cache can't leak memory. It still compares by identity.`,
      },
      {
        q: `Why can <code>JSON.stringify(args)</code> be a flawed cache key?`,
        options: [
          'It is always slower than computing',
          'Property order, functions, undefined and NaN can make different values collide or equal values differ',
          'It only works in Node',
          'It mutates the arguments',
        ],
        answer: 1,
        why: `<code>{a:1,b:2}</code> vs <code>{b:2,a:1}</code> give different keys;
        <code>[undefined]</code> and <code>[null]</code> both give <code>"[null]"</code>. Fine
        for simple primitives, risky for rich objects.`,
      },
    ],
    exercise: {
      task: `<p>Count the lattice paths in a grid: from the top-left you may only move right or
      down. <code>gridPaths(r, c)</code> = <code>gridPaths(r - 1, c) + gridPaths(r, c - 1)</code>,
      with <code>1</code> when <code>r === 0</code> or <code>c === 0</code>.</p>
      <p>Write <code>memoize2</code> for two-argument functions (use a string key like
      <code>r + ',' + c</code>) and make <code>gridPaths</code> recurse <em>through</em> the
      memoized version. The last check requires at most 13 × 13 = 169 real computations for
      <code>gridPaths(12, 12)</code>.</p>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

let computed = 0;

const memoize2 = fn => {
  // TODO: return (a, b) => ... with a Map cache keyed by a + ',' + b
  return fn;
};

const gridPaths = memoize2((r, c) => {
  computed++;
  if (r === 0 || c === 0) return 1;
  return gridPaths(r - 1, c) + gridPaths(r, c - 1);
});

check('gridPaths(2, 2)', gridPaths(2, 2), 6);
check('gridPaths(3, 3)', gridPaths(3, 3), 20);

computed = 0;
check('gridPaths(12, 12)', gridPaths(12, 12), 2704156);
console.log('computed:', computed);
check('at most 169 computations', computed <= 169, true);`,
      hint: `Inside the returned function: <code>const key = a + ',' + b;</code>, return
      <code>cache.get(key)</code> if <code>cache.has(key)</code>, otherwise compute
      <code>fn(a, b)</code>, store it, return it.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

let computed = 0;

const memoize2 = fn => {
  const cache = new Map();
  return (a, b) => {
    const key = a + ',' + b;
    if (cache.has(key)) return cache.get(key);
    const result = fn(a, b);
    cache.set(key, result);
    return result;
  };
};

const gridPaths = memoize2((r, c) => {
  computed++;
  if (r === 0 || c === 0) return 1;
  return gridPaths(r - 1, c) + gridPaths(r, c - 1);
});

check('gridPaths(2, 2)', gridPaths(2, 2), 6);
check('gridPaths(3, 3)', gridPaths(3, 3), 20);

computed = 0;
check('gridPaths(12, 12)', gridPaths(12, 12), 2704156);
console.log('computed:', computed);
check('at most 169 computations', computed <= 169, true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── lazy-generators
  {
    id: 'lazy-generators',
    section: 'Recursion & Laziness',
    title: 'Laziness with Generators',
    explain: `
      <p>Array methods are <strong>eager</strong>: <code>.map</code> processes every element
      and builds a whole new array before <code>.filter</code> even starts. That's wasteful if
      you only need the first two results, and impossible if the data is infinite.</p>
      <p><strong>Lazy</strong> evaluation flips it around: nothing is computed until someone
      asks for a value, and then only as much as needed to produce <em>that one</em> value. In
      JavaScript the tool for this is the <strong>generator function</strong>.</p>
      <pre><code>function* naturals() {
  let n = 1;
  while (true) yield n++;   // infinite, but that's fine
}

const it = naturals();      // nothing runs yet
it.next();                  // { value: 1, done: false }
it.next();                  // { value: 2, done: false }</code></pre>
      <ul>
        <li>Calling a generator function doesn't run its body. It returns an
        <strong>iterator</strong>.</li>
        <li>Each <code>next()</code> runs the body until the next <code>yield</code>, hands
        out that value, and <em>pauses</em> there, keeping all local variables.</li>
        <li><code>for...of</code>, spread <code>[...it]</code> and destructuring all call
        <code>next()</code> for you. Spreading an infinite generator never ends, so
        <code>take</code> first.</li>
      </ul>

      <h3>Lazy map / filter / take</h3>
      <p>Each helper is itself a generator that pulls from the one before it:</p>
      <pre><code>const map = f =&gt; function* (iter) {
  for (const x of iter) yield f(x);
};
const filter = pred =&gt; function* (iter) {
  for (const x of iter) if (pred(x)) yield x;
};
const take = n =&gt; function* (iter) {
  if (n &lt;= 0) return;
  let i = 0;
  for (const x of iter) {
    yield x;
    if (++i === n) return;  // stop pulling: upstream is never asked again
  }
};</code></pre>
      <p>This is <strong>pull-based</strong>: the consumer at the end asks <code>take</code>
      for a value, <code>take</code> asks <code>filter</code>, <code>filter</code> asks
      <code>map</code>, <code>map</code> asks <code>naturals</code>. One value travels the
      whole pipeline before the next one is even created.</p>
      <div class="warn">Iterators are <strong>one-shot</strong>. Once consumed, a second
      <code>for...of</code> over the same iterator sees nothing. Keep the generator
      <em>function</em> around and call it again to get a fresh sequence.</div>
      <div class="tip">ES2025 adds built-in lazy helpers (<code>.map</code>,
      <code>.filter</code>, <code>.take</code> ...) directly on iterators. Next lesson. Writing
      them by hand first shows you exactly how they work.</div>
    `,
    examples: [
      {
        title: 'A generator pauses at every yield',
        explain: `
          <details>
            <summary>Step by step: who runs when</summary>
            <table>
              <tr><th>Your code</th><th>Generator body runs…</th><th>Console</th></tr>
              <tr><td><code>countdown(2)</code></td><td>nothing yet</td><td><code>created, nothing ran yet</code></td></tr>
              <tr><td>1st <code>next()</code></td><td>start → first <code>yield 2</code>, pause</td><td><code>  [gen] started</code>, <code>  [gen] about to yield 2</code>, <code>next(): 2 done: false</code></td></tr>
              <tr><td>2nd <code>next()</code></td><td>resume after yield 2 → <code>yield 1</code>, pause</td><td><code>  [gen] resumed after 2</code>, <code>  [gen] about to yield 1</code>, <code>next(): 1 done: false</code></td></tr>
              <tr><td>3rd <code>next()</code></td><td>resume → loop ends → function returns</td><td><code>  [gen] resumed after 1</code>, <code>  [gen] finished</code>, <code>next(): undefined done: true</code></td></tr>
              <tr><td>4th <code>next()</code></td><td>nothing: already finished</td><td><code>next(): undefined done: true</code></td></tr>
              <tr><td><code>[...countdown(3)]</code></td><td>a fresh run to completion</td><td><code>spread a fresh one: [ 3, 2, 1 ]</code> (after its [gen] lines)</td></tr>
            </table>
            <p>Note how the "resumed" line for a value only appears on the <em>next</em> call. The
            generator really is frozen at <code>yield</code> in between.</p>
          </details>
        `,
        code: `function* countdown(from) {
  console.log('  [gen] started');
  for (let i = from; i > 0; i--) {
    console.log('  [gen] about to yield', i);
    yield i;
    console.log('  [gen] resumed after', i);
  }
  console.log('  [gen] finished');
}

const it = countdown(2);
console.log('created, nothing ran yet');

for (let call = 1; call <= 4; call++) {
  const { value, done } = it.next();
  console.log('next():', value, 'done:', done);
}

console.log('spread a fresh one:', [...countdown(3)]);`,
      },
      {
        title: 'Lazy vs eager pipeline: who runs first?',
        explain: `
          <details>
            <summary>The problem: eager chains do all the work, step by step</summary>
            <p>With arrays, each method finishes completely before the next one starts. We
            want the first 2 multiples of 20 from <code>x * 10</code>, but the eager chain maps
            all 6 numbers, filters all 6 results, and only then slices. On an infinite source
            the very first <code>.map</code> would never finish.</p>
          </details>
          <details>
            <summary>Step by step: the real console order</summary>
            <table>
              <tr><th>#</th><th>Eager (arrays)</th><th>Lazy (generators)</th></tr>
              <tr><td>1</td><td><code>map 1</code></td><td><code>pipeline built, nothing has run yet</code></td></tr>
              <tr><td>2</td><td><code>map 2</code></td><td><code>map 1</code></td></tr>
              <tr><td>3</td><td><code>map 3</code></td><td><code>filter 10</code> ✗</td></tr>
              <tr><td>4</td><td><code>map 4</code></td><td><code>map 2</code></td></tr>
              <tr><td>5</td><td><code>map 5</code></td><td><code>filter 20</code> ✓ → take #1</td></tr>
              <tr><td>6</td><td><code>map 6</code></td><td><code>map 3</code></td></tr>
              <tr><td>7</td><td><code>filter 10</code></td><td><code>filter 30</code> ✗</td></tr>
              <tr><td>8</td><td><code>filter 20</code></td><td><code>map 4</code></td></tr>
              <tr><td>9</td><td><code>filter 30</code></td><td><code>filter 40</code> ✓ → take #2, take returns</td></tr>
              <tr><td>10</td><td><code>filter 40</code></td><td><code>lazy result: [ 20, 40 ]</code></td></tr>
              <tr><td>11</td><td><code>filter 50</code></td><td></td></tr>
              <tr><td>12</td><td><code>filter 60</code></td><td></td></tr>
              <tr><td>13</td><td><code>eager result: [ 20, 40 ]</code></td><td></td></tr>
            </table>
            <p>Eager: 12 callback calls, grouped by stage ("breadth first"). Lazy: 8 calls,
            interleaved per value ("depth first"), from an <em>infinite</em> source.
            <code>naturals()</code> never produced 5.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const lazy = pipe(naturals(), map(f), filter(p), take(2)); // ① just wiring
console.log('pipeline built, nothing has run yet');
[...lazy]                                   // ② spread pulls from take

if (++i === n) return;                      // ③ in take: stop after n values</code></pre>
            <ol>
              <li><strong>①</strong> Each helper call only creates a paused generator wrapping
              the previous one. No callback has run.</li>
              <li><strong>②</strong> Spread calls <code>take.next()</code>, which pulls
              <code>filter.next()</code>, which pulls <code>map.next()</code> until
              <code>filter</code> finds a match.</li>
              <li><strong>③</strong> Returning right after the n-th value matters. If
              <code>take</code> checked the count <em>before</em> yielding, it would pull one
              extra value from upstream (you'd see <code>map 5</code>, <code>filter 50</code>).
              When <code>take</code> returns, <code>for...of</code> also calls
              <code>return()</code> on the upstream generators, closing them.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>take(2)</code> to <code>take(4)</code>: lazy runs through
              <code>map 8</code> / <code>filter 80</code> and stops.</li>
              <li>Remove <code>take(2)</code> from the lazy pipeline. Don't run it: the spread
              would pull forever and freeze the tab. That's the one rule of infinite
              sequences: limit before you collect.</li>
              <li>Swap <code>map</code> and <code>filter</code> (filter on <code>x % 2 === 0</code>
              first) and predict the order before running.</li>
            </ul>
          </details>
        `,
        code: `const pipe = (x, ...fns) => fns.reduce((v, f) => f(v), x);

function* naturals() {
  let n = 1;
  while (true) yield n++;
}

const map = f => function* (iter) {
  for (const x of iter) yield f(x);
};

const filter = pred => function* (iter) {
  for (const x of iter) if (pred(x)) yield x;
};

const take = n => function* (iter) {
  if (n <= 0) return;
  let i = 0;
  for (const x of iter) {
    yield x;
    if (++i === n) return;
  }
};

const times10 = x => {
  console.log('map', x);
  return x * 10;
};
const multipleOf20 = x => {
  console.log('filter', x);
  return x % 20 === 0;
};

console.log('--- eager (arrays) ---');
const eager = [1, 2, 3, 4, 5, 6].map(times10).filter(multipleOf20).slice(0, 2);
console.log('eager result:', eager);

console.log('--- lazy (generators) ---');
const lazy = pipe(naturals(), map(times10), filter(multipleOf20), take(2));
console.log('pipeline built, nothing has run yet');
console.log('lazy result:', [...lazy]);`,
      },
    ],
    quiz: [
      {
        q: `What happens when you call <code>naturals()</code> (a generator function with
        <code>while (true)</code>)?`,
        options: [
          'It loops forever',
          'It returns an iterator immediately; the body hasn\'t started',
          'It returns an array',
          'It throws because of the infinite loop',
        ],
        answer: 1,
        why: `Generator bodies only run on <code>next()</code>, and only up to the next
        <code>yield</code>. An infinite loop is fine as long as consumers pull a finite
        number of values.`,
      },
      {
        q: `In the lazy pipeline, why does <code>filter 10</code> print before
        <code>map 2</code>?`,
        options: [
          'Generators run in parallel',
          'Each value is pulled through every stage before the next value is created',
          'filter runs before map in generators',
          'Console output is reordered',
        ],
        answer: 1,
        why: `Pull-based evaluation is depth-first: value 1 goes map → filter, is rejected, and
        only then does filter ask map for the next one.`,
      },
      {
        q: `You spread the same generator object twice: <code>[...g]</code> then
        <code>[...g]</code>. The second result is…`,
        options: [
          'The same values again',
          'An empty array',
          'A TypeError',
          'The values reversed',
        ],
        answer: 1,
        why: `Iterators are one-shot. After the first spread it's done, and further
        <code>next()</code> calls return <code>{ done: true }</code>. Call the generator function
        again for a fresh iterator.`,
      },
      {
        q: `Which of these will hang forever?`,
        options: [
          '<code>take(3)(naturals())</code>',
          '<code>[...take(3)(naturals())]</code>',
          '<code>const [a, b] = naturals()</code>',
          '<code>[...take(3)(filter(x =&gt; x &lt; 0)(naturals()))]</code>',
        ],
        answer: 3,
        why: `No natural number is negative, so <code>filter</code> keeps pulling forever looking
        for the first match. <code>take</code> only limits how many values come out, not how
        long upstream searches. Destructuring <code>[a, b]</code> only pulls two values.`,
      },
      {
        q: `What's the main reason eager array chains can't work on infinite data?`,
        options: [
          'Arrays have a max length',
          'Each stage must finish the whole input before the next stage starts',
          'Array methods are asynchronous',
          'map cannot return numbers',
        ],
        answer: 1,
        why: `Eager = stage by stage. With an infinite input the first stage never finishes.
        Lazy = value by value, so the consumer decides when to stop.`,
      },
    ],
    exercise: {
      task: `<p>Write two lazy helpers:</p>
      <ul>
        <li><code>iterate(f, seed)</code>: infinite generator yielding
        <code>seed, f(seed), f(f(seed)), ...</code></li>
        <li><code>takeWhile(pred)</code>: returns a generator function that yields values from
        an iterable while <code>pred</code> is true and stops at the first false (without
        yielding it).</li>
      </ul>
      <p>The last check generates the Collatz sequence from 6 until it reaches 1.</p>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const take = n => function* (iter) {
  if (n <= 0) return;
  let i = 0;
  for (const x of iter) {
    yield x;
    if (++i === n) return;
  }
};

function* iterate(f, seed) {
  // TODO: yield seed, then f(seed), then f(f(seed)), ... forever
}

const takeWhile = pred => function* (iter) {
  // TODO: yield x while pred(x) is true; return at the first false
};

check('powers of 2', [...take(5)(iterate(x => x * 2, 1))], [1, 2, 4, 8, 16]);
const powersOf3 = iterate(x => x * 3, 1);
check('powers of 3 below 50', [...takeWhile(x => x < 50)(powersOf3)], [1, 3, 9, 27]);

const collatz = n => (n % 2 === 0 ? n / 2 : 3 * n + 1);
check(
  'collatz from 6',
  [...takeWhile(n => n !== 1)(iterate(collatz, 6))],
  [6, 3, 10, 5, 16, 8, 4, 2],
);`,
      hint: `iterate: <code>let x = seed; while (true) { yield x; x = f(x); }</code>.
      takeWhile: <code>for (const x of iter) { if (!pred(x)) return; yield x; }</code>.
      The early <code>return</code> is what makes it safe on an infinite source.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const take = n => function* (iter) {
  if (n <= 0) return;
  let i = 0;
  for (const x of iter) {
    yield x;
    if (++i === n) return;
  }
};

function* iterate(f, seed) {
  let x = seed;
  while (true) {
    yield x;
    x = f(x);
  }
}

const takeWhile = pred => function* (iter) {
  for (const x of iter) {
    if (!pred(x)) return;
    yield x;
  }
};

check('powers of 2', [...take(5)(iterate(x => x * 2, 1))], [1, 2, 4, 8, 16]);
const powersOf3 = iterate(x => x * 3, 1);
check('powers of 3 below 50', [...takeWhile(x => x < 50)(powersOf3)], [1, 3, 9, 27]);

const collatz = n => (n % 2 === 0 ? n / 2 : 3 * n + 1);
check(
  'collatz from 6',
  [...takeWhile(n => n !== 1)(iterate(collatz, 6))],
  [6, 3, 10, 5, 16, 8, 4, 2],
);`,
    },
  },

  // ───────────────────────────────────────────────────────────── iterator-helpers
  {
    id: 'iterator-helpers',
    section: 'Recursion & Laziness',
    title: 'Iterator Helpers',
    explain: `
      <p>ES2025 standardised <strong>Iterator helpers</strong>: the lazy
      <code>map</code>/<code>filter</code>/<code>take</code> you wrote by hand, now built into
      <code>Iterator.prototype</code>. Every generator object and every built-in iterator
      (<code>array.values()</code>, <code>map.entries()</code>, <code>set.keys()</code>,
      <code>string[Symbol.iterator]()</code>) inherits them.</p>
      <ul>
        <li><strong>Lazy, return a new iterator:</strong> <code>map</code>,
        <code>filter</code>, <code>take</code>, <code>drop</code>, <code>flatMap</code></li>
        <li><strong>Eager, consume the iterator:</strong> <code>toArray</code>,
        <code>reduce</code>, <code>forEach</code>, <code>some</code>, <code>every</code>,
        <code>find</code></li>
        <li><strong><code>Iterator.from(x)</code></strong>: wraps any iterable, or any object
        with a <code>next()</code> method, so it gets the helpers.</li>
      </ul>
      <p>Support: <strong>Chrome/Edge 122+, Firefox 131+, Safari 18.4+, Node 22+</strong>. On
      older engines <code>Iterator</code> may not exist at all, so feature-detect:</p>
      <pre><code>const hasHelpers =
  typeof Iterator !== 'undefined' &amp;&amp; Iterator.prototype.take;</code></pre>

      <h3>Differences from array methods</h3>
      <ul>
        <li>Arrays don't get these methods. <code>[1, 2].take</code> is
        <code>undefined</code>. Go through <code>.values()</code>:
        <code>arr.values().map(f).take(3).toArray()</code>.</li>
        <li>Callbacks get <code>(value, counter)</code>, not <code>(value, index, array)</code>.
        There is no underlying array to pass.</li>
        <li><code>flatMap</code>'s callback must return an iterator or iterable, and
        <em>strings are rejected</em> (TypeError), to avoid accidentally splitting into
        characters.</li>
        <li><code>take</code>/<code>drop</code> throw a <code>RangeError</code> for negative
        or <code>NaN</code> limits.</li>
        <li>Same one-shot rule as any iterator: once consumed, it's empty.</li>
      </ul>
      <div class="tip">Rule of thumb: if the data is already a small array, plain array methods
      are fine and clearer. Reach for iterator helpers when the source is lazy (generators,
      huge or infinite sequences, <code>Map</code>/<code>Set</code> iterators) or when you want
      to stop early without building intermediate arrays.</div>
      <div class="warn">There's also a separate proposal for <em>async</em> iterator helpers.
      That's not part of ES2025, so don't expect <code>.map</code> on async generators yet.</div>
    `,
    examples: [
      {
        title: 'Built-in lazy pipelines',
        code: `const hasHelpers = typeof Iterator !== 'undefined' && Iterator.prototype.take;

if (!hasHelpers) {
  console.log('⚠️ Iterator helpers are not supported in this browser.');
  console.log('Need Chrome 122+, Firefox 131+, Safari 18.4+ or Node 22+.');
} else {
  function* naturals() {
    let n = 1;
    while (true) yield n++;
  }

  const oddSquares = naturals()
    .map(n => n * n)
    .filter(n => n % 2 === 1)
    .take(4)
    .toArray();
  console.log('first 4 odd squares:', oddSquares);

  console.log('drop(3).take(3):', naturals().drop(3).take(3).toArray());
  console.log('sum of 1..100:', naturals().take(100).reduce((a, b) => a + b, 0));

  const tags = ['fp,js', 'lazy', 'gen,iter'];
  console.log('flatMap:', tags.values().flatMap(s => s.split(',')).toArray());

  // Works on any built-in iterator: Map, Set, ...
  const prices = new Map([['tea', 3], ['cake', 5], ['coffee', 4]]);
  const pricey = prices
    .entries()
    .filter(([, price]) => price >= 4)
    .map(([item]) => item)
    .toArray();
  console.log('items >= 4:', pricey);

  // Iterator.from: give helpers to a hand-made { next() } object
  let i = 0;
  const countTo3 = { next: () => (i < 3 ? { value: i++, done: false } : { done: true }) };
  console.log('Iterator.from:', Iterator.from(countTo3).map(x => x + 100).toArray());
}`,
      },
      {
        title: 'Same pull order, one-shot iterators',
        explain: `
          <details>
            <summary>What the console shows</summary>
            <table>
              <tr><th>Console</th><th>Why</th></tr>
              <tr><td><code>built: true</code></td><td>Building the chain runs no callbacks.</td></tr>
              <tr><td><code>map 1</code>, <code>filter 2</code>, <code>map 2</code>, <code>filter 4</code>,
              <code>map 3</code>, <code>filter 6</code>, <code>map 4</code>, <code>filter 8</code></td><td>Same depth-first, value-by-value order as the hand-made generators.</td></tr>
              <tr><td><code>result: [ 4, 8 ]</code></td><td><code>take(2)</code> stopped pulling after the second match; 5, 6, 7, 8 were never mapped.</td></tr>
              <tr><td><code>map counter: [ 'a#0', 'b#1', 'c#2' ]</code></td><td>The second callback argument is a counter, not an array index.</td></tr>
              <tr><td><code>first spread: [ 2, 4 ]</code> / <code>second spread: []</code></td><td>One-shot: the iterator was used up.</td></tr>
              <tr><td><code>flatMap with a string → TypeError</code></td><td>Strings are rejected on purpose.</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Replace <code>.take(2)</code> with <code>.find(x =&gt; x &gt; 5)</code>. It
              stops as soon as it finds one, and returns a value instead of an iterator.</li>
              <li>Fix the flatMap error by returning <code>[s]</code> or <code>s.split('')</code>
              instead of <code>s</code>.</li>
            </ul>
          </details>
        `,
        code: `const hasHelpers = typeof Iterator !== 'undefined' && Iterator.prototype.take;

if (!hasHelpers) {
  console.log('⚠️ Iterator helpers are not supported in this browser.');
} else {
  const lazy = [1, 2, 3, 4, 5, 6, 7, 8]
    .values()
    .map(x => {
      console.log('map', x);
      return x * 2;
    })
    .filter(x => {
      console.log('filter', x);
      return x % 4 === 0;
    })
    .take(2);
  console.log('built:', typeof lazy.next === 'function');
  console.log('result:', lazy.toArray());

  const labels = ['a', 'b', 'c'].values().map((x, counter) => x + '#' + counter);
  console.log('map counter:', labels.toArray());

  const evens = [1, 2, 3, 4].values().filter(x => x % 2 === 0);
  console.log('first spread:', [...evens]);
  console.log('second spread:', [...evens]);

  try {
    ['ab', 'cd'].values().flatMap(s => s).toArray();
  } catch (e) {
    console.log('flatMap with a string → ' + e.name);
  }
}`,
      },
    ],
    quiz: [
      {
        q: `What does <code>[1, 2, 3].take(2)</code> do?`,
        options: [
          'Returns [1, 2]',
          'Throws TypeError: take is not a function',
          'Returns an iterator',
          'Returns undefined',
        ],
        answer: 1,
        why: `Arrays don't inherit from <code>Iterator.prototype</code>. Use
        <code>[1, 2, 3].values().take(2)</code>.`,
      },
      {
        q: `Which helpers are lazy (return a new iterator without consuming)?`,
        options: [
          'toArray, reduce, forEach',
          'map, filter, take, drop, flatMap',
          'some, every, find',
          'All of them',
        ],
        answer: 1,
        why: `The transforming helpers are lazy. <code>toArray/reduce/forEach/some/every/find</code>
        pull values and produce a final result.`,
      },
      {
        q: `What is the second argument passed to an iterator <code>.map</code> callback?`,
        options: [
          'The index in the original array',
          'The source array',
          'A counter of how many values have been seen so far',
          'Nothing',
        ],
        answer: 2,
        why: `Iterators have no array behind them, so you get a 0-based counter and no third
        argument.`,
      },
      {
        q: `What does <code>Iterator.from(obj)</code> accept?`,
        options: [
          'Only arrays',
          'Any iterable, or any object with a next() method',
          'Only generator functions',
          'Promises',
        ],
        answer: 1,
        why: `It wraps iterables (via <code>Symbol.iterator</code>) or bare iterator-like objects
        so they gain the helper methods.`,
      },
      {
        q: `Which feature check is correct for older browsers?`,
        options: [
          '<code>Iterator.prototype.take !== undefined</code>',
          '<code>typeof Iterator !== \'undefined\' &amp;&amp; Iterator.prototype.take</code>',
          '<code>Array.prototype.take</code>',
          '<code>\'take\' in []</code>',
        ],
        answer: 1,
        why: `On engines without the global <code>Iterator</code>, referencing it throws a
        ReferenceError. <code>typeof</code> is safe on undeclared names.`,
      },
    ],
    exercise: {
      task: `<p>Use iterator helpers only (no array <code>.map/.filter/.slice</code>):</p>
      <ul>
        <li><code>longWords</code>: the first 3 words longer than 4 letters, upper-cased.</li>
        <li><code>primes</code>: the first 6 primes, from an infinite <code>naturals()</code>
        (an <code>isPrime</code> helper is given).</li>
        <li><code>letters</code>: all letters of the first 2 words, via <code>flatMap</code>
        (remember: return an array, not a string).</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const hasHelpers = typeof Iterator !== 'undefined' && Iterator.prototype.take;

function* naturals() {
  let n = 1;
  while (true) yield n++;
}

const isPrime = n => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

const words = ['map', 'filter', 'take', 'reduce', 'lazy', 'iterator', 'flatMap'];

if (!hasHelpers) {
  console.log('⚠️ Iterator helpers not supported here. Try Chrome 122+ / Firefox 131+.');
} else {
  const longWords = undefined; // TODO: words.values()...
  const primes = undefined; // TODO: naturals()...
  const letters = undefined; // TODO: words.values().take(2).flatMap(...)...

  check('longWords', longWords, ['FILTER', 'REDUCE', 'ITERATOR']);
  check('primes', primes, [2, 3, 5, 7, 11, 13]);
  check('letters', letters, ['m', 'a', 'p', 'f', 'i', 'l', 't', 'e', 'r']);
}`,
      hint: `<code>words.values().filter(w =&gt; w.length &gt; 4).map(w =&gt; w.toUpperCase()).take(3).toArray()</code>.
      For letters: <code>.flatMap(w =&gt; w.split(''))</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const hasHelpers = typeof Iterator !== 'undefined' && Iterator.prototype.take;

function* naturals() {
  let n = 1;
  while (true) yield n++;
}

const isPrime = n => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

const words = ['map', 'filter', 'take', 'reduce', 'lazy', 'iterator', 'flatMap'];

if (!hasHelpers) {
  console.log('⚠️ Iterator helpers not supported here. Try Chrome 122+ / Firefox 131+.');
} else {
  const longWords = words
    .values()
    .filter(w => w.length > 4)
    .map(w => w.toUpperCase())
    .take(3)
    .toArray();
  const primes = naturals().filter(isPrime).take(6).toArray();
  const letters = words
    .values()
    .take(2)
    .flatMap(w => w.split(''))
    .toArray();

  check('longWords', longWords, ['FILTER', 'REDUCE', 'ITERATOR']);
  check('primes', primes, [2, 3, 5, 7, 11, 13]);
  check('letters', letters, ['m', 'a', 'p', 'f', 'i', 'l', 't', 'e', 'r']);
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── transducers
  {
    id: 'transducers',
    section: 'Recursion & Laziness',
    title: 'Transducers',
    explain: `
      <p><code>data.map(f).filter(p).map(g)</code> reads nicely but walks the data three
      times and allocates two throwaway arrays. For big data that's real memory and time.
      Generators fix it with laziness. <strong>Transducers</strong> fix it differently: they
      fuse all the steps into <em>one reducer</em>, so a single <code>reduce</code> does
      everything in one pass.</p>

      <h3>The key idea: transform the reducer, not the data</h3>
      <p>A reducer is <code>(acc, x) =&gt; newAcc</code>. Both <code>map</code> and
      <code>filter</code> can be expressed as "take a reducer, return a new reducer":</p>
      <pre><code>// a transducer: reducer → reducer
const mapT = f =&gt; next =&gt; (acc, x) =&gt; next(acc, f(x));
const filterT = pred =&gt; next =&gt; (acc, x) =&gt;
  pred(x) ? next(acc, x) : acc;</code></pre>
      <ul>
        <li><code>mapT(f)</code> builds a reducer that transforms <code>x</code> and passes it
        on to <code>next</code>.</li>
        <li><code>filterT(pred)</code> builds a reducer that either passes <code>x</code> on or
        skips it by returning <code>acc</code> unchanged.</li>
        <li>Neither knows about arrays. <code>next</code> might push into an array, add to a
        sum, or insert into a Set.</li>
      </ul>
      <p>Because a transducer is just a function <code>reducer → reducer</code>, transducers
      compose with plain <code>compose</code>. Then <code>transduce</code> runs it:</p>
      <pre><code>const xform = compose(mapT(x =&gt; x + 1), filterT(isEven));
const result = data.reduce(xform(pushReducer), []); // one pass, no temp arrays</code></pre>
      <div class="tip">Surprise: with <code>compose</code> (normally right-to-left), the
      transducers run <strong>left-to-right</strong> on each element, in the order you wrote
      them. The walkthrough below shows why.</div>
      <div class="tip">Real libraries (Clojure's core, Ramda's <code>R.transduce</code> /
      <code>R.into</code>, transducers-js) add two things we skip here: an
      <code>init</code>/<code>result</code> protocol, and a "reduced" wrapper so
      <code>takeT(n)</code> can stop the reduction early.</div>
      <div class="warn">Don't reach for transducers by default. For a few hundred items,
      chained array methods are clearer and the intermediate arrays cost nothing measurable.
      Transducers pay off for large data, streams, or when one recipe must feed many different
      outputs.</div>
    `,
    examples: [
      {
        title: 'Intermediate arrays vs one pass',
        explain: `
          <details>
            <summary>Step by step: the real console order</summary>
            <table>
              <tr><th>#</th><th>Chained array methods</th><th>Transducer</th></tr>
              <tr><td>1</td><td><code>map 1</code></td><td><code>map 1</code></td></tr>
              <tr><td>2</td><td><code>map 2</code></td><td><code>filter 2</code> ✓ push</td></tr>
              <tr><td>3</td><td><code>map 3</code></td><td><code>map 2</code></td></tr>
              <tr><td>4</td><td><code>map 4</code> → temp array <code>[2,3,4,5]</code></td><td><code>filter 3</code> ✗ skip</td></tr>
              <tr><td>5</td><td><code>filter 2</code></td><td><code>map 3</code></td></tr>
              <tr><td>6</td><td><code>filter 3</code></td><td><code>filter 4</code> ✓ push</td></tr>
              <tr><td>7</td><td><code>filter 4</code></td><td><code>map 4</code></td></tr>
              <tr><td>8</td><td><code>filter 5</code></td><td><code>filter 5</code> ✗ skip</td></tr>
              <tr><td></td><td><code>result: [ 2, 4 ]</code></td><td><code>result: [ 2, 4 ]</code></td></tr>
            </table>
            <p>Same number of callback calls, same answer. The difference: the chain walked the
            data twice and built a temporary 4-element array; the transducer walked it once and
            built only the final array.</p>
          </details>
          <details>
            <summary>Why compose order looks reversed</summary>
            <p><code>compose(a, b)(r)</code> means <code>a(b(r))</code>: <code>b</code> is
            applied first. But what's being built is a <em>reducer</em>, not a value, and the
            outer wrapper is the one that sees each element first.</p>
            <table>
              <tr><th>Build step</th><th>Expression</th><th>Result</th></tr>
              <tr><td>1 (innermost)</td><td><code>filterT(isEven)(pushReducer)</code></td><td><code>filterStep</code>: "if even, push"</td></tr>
              <tr><td>2 (outer)</td><td><code>mapT(inc)(filterStep)</code></td><td><code>mapStep</code>: "add 1, then call filterStep"</td></tr>
              <tr><td>3</td><td><code>data.reduce(mapStep, [])</code></td><td>each element enters <code>mapStep</code> first</td></tr>
            </table>
            <p>Building happens right-to-left (inside out), running happens left-to-right
            (outside in). Like wrapping a gift: you put the box inside the paper last, but the
            person opening it hits the paper first.</p>
            <pre><code>const mapT = f =&gt; next =&gt; (acc, x) =&gt;
  next(acc, f(x));                       // ① transform, then hand to the INNER reducer
const filterT = pred =&gt; next =&gt; (acc, x) =&gt;
  pred(x) ? next(acc, x) : acc;          // ② pass on or skip
const xform = compose(mapT(inc), filterT(isEven));
// ③ xform(push) === mapT(inc)(filterT(isEven)(push))
data.reduce(xform(pushReducer), []);</code></pre>
            <ol>
              <li><strong>①</strong> <code>next</code> is whatever reducer is wrapped inside,
              here the filter step.</li>
              <li><strong>②</strong> Skipping means returning <code>acc</code> without
              calling <code>next</code>: the element never reaches <code>pushReducer</code>.</li>
              <li><strong>③</strong> The outermost transducer (first in the list) receives
              each element first.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Swap the order: <code>compose(filterT(isEven), mapT(inc))</code>. Now filter
              sees 1, 2, 3, 4, keeps 2 and 4, then map adds 1 → <code>[ 3, 5 ]</code>.</li>
              <li>Replace <code>pushReducer</code> with <code>(acc, x) =&gt; acc + x</code> and
              <code>[]</code> with <code>0</code>. Same transducer, now it sums:
              <code>6</code>.</li>
            </ul>
            <div class="warn"><code>pushReducer</code> mutates <code>acc</code>. That's
            fine here because the accumulator is created fresh by this <code>reduce</code> and
            nobody else sees it. It's a common, contained performance trade-off.</div>
          </details>
        `,
        code: `const data = [1, 2, 3, 4];

const inc = x => {
  console.log('map', x);
  return x + 1;
};
const isEven = x => {
  console.log('filter', x);
  return x % 2 === 0;
};

console.log('--- chained array methods ---');
const chained = data.map(inc).filter(isEven);
console.log('result:', chained);

// Transducers: functions from reducer to reducer
const mapT = f => next => (acc, x) => next(acc, f(x));
const filterT = pred => next => (acc, x) => (pred(x) ? next(acc, x) : acc);
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

const pushReducer = (acc, x) => {
  acc.push(x);
  return acc;
};

console.log('--- transducer ---');
const xform = compose(mapT(inc), filterT(isEven));
const once = data.reduce(xform(pushReducer), []);
console.log('result:', once);`,
      },
      {
        title: 'One recipe, many outputs',
        code: `const mapT = f => next => (acc, x) => next(acc, f(x));
const filterT = pred => next => (acc, x) => (pred(x) ? next(acc, x) : acc);
const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);

// Works on ANY iterable: arrays, Sets, generators...
const transduce = (xform, reducer, init, iterable) => {
  const step = xform(reducer);
  let acc = init;
  for (const x of iterable) acc = step(acc, x);
  return acc;
};

// The recipe: keep multiples of 3, square them
const recipe = compose(
  filterT(n => n % 3 === 0),
  mapT(n => n * n),
);

const nums = Array.from({ length: 12 }, (_, i) => i + 1);

const toArray = (acc, x) => [...acc, x];
const sum = (acc, x) => acc + x;
const toSet = (acc, x) => acc.add(x);
const csv = (acc, x) => (acc === '' ? String(x) : acc + ',' + x);

console.log('array:', transduce(recipe, toArray, [], nums));
console.log('sum:', transduce(recipe, sum, 0, nums));
console.log('csv:', transduce(recipe, csv, '', nums));
console.log('set (from dupes):', transduce(recipe, toSet, new Set(), [3, 3, 6, 6, 7]));

function* naturalsTo(n) {
  for (let i = 1; i <= n; i++) yield i;
}
console.log('from a generator:', transduce(recipe, sum, 0, naturalsTo(12)));`,
      },
    ],
    quiz: [
      {
        q: `What is a transducer, in one line?`,
        options: [
          'A lazy array',
          'A function that takes a reducer and returns a new reducer',
          'A generator that yields reducers',
          'A memoized reduce',
        ],
        answer: 1,
        why: `<code>mapT(f)</code> and <code>filterT(p)</code> both have the shape
        <code>reducer =&gt; reducer</code>, which is why they compose with ordinary function
        composition.`,
      },
      {
        q: `<code>compose(mapT(inc), filterT(isEven))</code> — which runs first on each
        element?`,
        options: [
          'filterT(isEven), because compose is right-to-left',
          'mapT(inc): the outer reducer receives each element first',
          'They run in parallel',
          'It depends on the data',
        ],
        answer: 1,
        why: `Composition builds <code>mapT(inc)(filterT(isEven)(push))</code>. The outermost
        reducer is the map step, so every element goes through map, then filter, then push.`,
      },
      {
        q: `How does <code>filterT</code> drop an element?`,
        options: [
          'It throws',
          'It returns acc unchanged without calling next',
          'It calls next with undefined',
          'It splices the array',
        ],
        answer: 1,
        why: `Not calling <code>next</code> means the element never reaches the inner reducers.
        Returning <code>acc</code> keeps the accumulation going.`,
      },
      {
        q: `What do transducers save compared to <code>arr.map(f).filter(p)</code>?`,
        options: [
          'Callback calls',
          'The intermediate array and the second pass over the data',
          'Nothing, they are just style',
          'They make the result lazy',
        ],
        answer: 1,
        why: `The number of <code>f</code>/<code>p</code> calls is the same. What disappears is
        the temporary array between steps and the extra traversal.`,
      },
      {
        q: `Why can the same <code>recipe</code> produce an array, a sum and a Set?`,
        options: [
          'Because transduce checks the type of init',
          'Because the transducer never touches the accumulator itself; the final reducer decides what "add" means',
          'Because Sets are arrays',
          'It can\'t',
        ],
        answer: 1,
        why: `Transducers only decide <em>which</em> values reach the final reducer and
        <em>in what form</em>. Building the output is entirely the final reducer's job.`,
      },
    ],
    exercise: {
      task: `<p>Implement <code>mapT</code> and <code>filterT</code> (the starter versions
      just pass the reducer through unchanged). Then the checks compute:</p>
      <ul>
        <li>the sum of squares of odd numbers from 1 to 10</li>
        <li>two pipelines with the same steps in different order, to prove you understand
        which runs first</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const transduce = (xform, reducer, init, xs) => xs.reduce(xform(reducer), init);
const push = (acc, x) => [...acc, x];
const sum = (acc, x) => acc + x;

// TODO: return a reducer that calls next with f(x)
const mapT = f => next => next;

// TODO: return a reducer that calls next only when pred(x) is true
const filterT = pred => next => next;

const oneToTen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const isOdd = x => x % 2 === 1;
const isEven = x => x % 2 === 0;
const square = x => x * x;
const inc = x => x + 1;

const oddSquares = compose(filterT(isOdd), mapT(square));
check('sum of odd squares', transduce(oddSquares, sum, 0, oneToTen), 165);

const mapThenFilter = compose(mapT(inc), filterT(isEven));
check('map then filter', transduce(mapThenFilter, push, [], [1, 2, 3, 4, 5]), [2, 4, 6]);

const filterThenMap = compose(filterT(isEven), mapT(inc));
check('filter then map', transduce(filterThenMap, push, [], [1, 2, 3, 4, 5]), [3, 5]);`,
      hint: `<code>mapT = f =&gt; next =&gt; (acc, x) =&gt; next(acc, f(x))</code>. For filter,
      return <code>acc</code> unchanged when the predicate fails.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const compose = (...fns) => x => fns.reduceRight((v, f) => f(v), x);
const transduce = (xform, reducer, init, xs) => xs.reduce(xform(reducer), init);
const push = (acc, x) => [...acc, x];
const sum = (acc, x) => acc + x;

const mapT = f => next => (acc, x) => next(acc, f(x));

const filterT = pred => next => (acc, x) => (pred(x) ? next(acc, x) : acc);

const oneToTen = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const isOdd = x => x % 2 === 1;
const isEven = x => x % 2 === 0;
const square = x => x * x;
const inc = x => x + 1;

const oddSquares = compose(filterT(isOdd), mapT(square));
check('sum of odd squares', transduce(oddSquares, sum, 0, oneToTen), 165);

const mapThenFilter = compose(mapT(inc), filterT(isEven));
check('map then filter', transduce(mapThenFilter, push, [], [1, 2, 3, 4, 5]), [2, 4, 6]);

const filterThenMap = compose(filterT(isEven), mapT(inc));
check('filter then map', transduce(filterThenMap, push, [], [1, 2, 3, 4, 5]), [3, 5]);`,
    },
  },
);
