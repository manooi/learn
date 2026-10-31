window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────── semigroups-monoids
  {
    id: 'semigroups-monoids',
    section: 'Algebraic Abstractions',
    title: 'Semigroups & Monoids',
    explain: `
      <p>You already use <code>reduce</code> to add numbers, join strings and merge arrays.
      Those look like different jobs, but they share one shape: <strong>take two things of
      the same type and combine them into one thing of that type</strong>. FP gives that
      shape a name so you can write the "combine everything" logic once and reuse it.</p>

      <h3>Semigroup: a type + an associative <code>concat</code></h3>
      <p>A <strong>semigroup</strong> is a type together with a binary operation
      <code>concat(a, b)</code> that is <strong>associative</strong>:</p>
      <pre><code>concat(concat(a, b), c) === concat(a, concat(b, c))</code></pre>
      <p>Grouping does not matter. Order still might (string concat is not commutative:
      <code>'ab' + 'c'</code> vs <code>'c' + 'ab'</code>), but where you put the brackets
      does not.</p>

      <h3>Monoid: a semigroup + an identity <code>empty</code></h3>
      <p>A <strong>monoid</strong> adds a neutral element <code>empty</code> such that
      <code>concat(empty, a) === a</code> and <code>concat(a, empty) === a</code>.
      That is exactly the "initial value" you pass to <code>reduce</code>.</p>
      <table>
        <tr><th>Monoid</th><th><code>concat</code></th><th><code>empty</code></th></tr>
        <tr><td>Sum</td><td><code>a + b</code></td><td><code>0</code></td></tr>
        <tr><td>Product</td><td><code>a * b</code></td><td><code>1</code></td></tr>
        <tr><td>Max</td><td><code>Math.max(a, b)</code></td><td><code>-Infinity</code></td></tr>
        <tr><td>Min</td><td><code>Math.min(a, b)</code></td><td><code>Infinity</code></td></tr>
        <tr><td>All</td><td><code>a &amp;&amp; b</code></td><td><code>true</code></td></tr>
        <tr><td>Any</td><td><code>a || b</code></td><td><code>false</code></td></tr>
        <tr><td>String</td><td><code>a + b</code></td><td><code>''</code></td></tr>
        <tr><td>Array</td><td><code>a.concat(b)</code></td><td><code>[]</code></td></tr>
      </table>
      <p>Notice the same type (numbers) can have several monoids. The monoid is the
      <em>pair</em> (operation, identity), not the type.</p>

      <h3>Why care?</h3>
      <ul>
        <li><strong>Empty input is safe.</strong> <code>[].reduce((a, b) =&gt; a + b)</code>
        throws. A monoid always has <code>empty</code>, so folding nothing returns
        the identity.</li>
        <li><strong>Associativity = free parallelism.</strong> Split a big list into chunks,
        fold each chunk anywhere (worker, server, shard), then fold the partial results.
        You get the same answer. This is the idea behind MapReduce.</li>
        <li><strong>Monoids compose.</strong> An object whose fields are monoids is itself a
        monoid. That lets you compute many statistics in one pass, or merge layered config
        files with clear per-field rules.</li>
      </ul>

      <h3><code>foldMap</code></h3>
      <p><code>foldMap(M, f, xs)</code> maps each item into a monoid value with
      <code>f</code>, then combines them all with <code>M</code>. It is "map then reduce"
      with the reduce part fully determined by the monoid.</p>
      <pre><code>const foldMap = (M, f, xs) =&gt;
  xs.reduce((acc, x) =&gt; M.concat(acc, f(x)), M.empty);</code></pre>

      <div class="tip">Libraries usually give monoids a <code>concat</code> and an
      <code>empty</code> exactly like the objects in this lesson. Once you see the pattern you
      will spot it in config merging, logging, metrics, and CSS-class builders.</div>
      <div class="warn">Not everything that "combines" is associative. Subtraction, division,
      and averaging (<code>(a + b) / 2</code>) are not. Folding them in chunks silently gives a
      different answer. For averages, fold a <code>{ sum, count }</code> pair (a monoid)
      and divide at the end.</div>
    `,
    examples: [
      {
        title: 'Monoids as plain objects + chunked (parallel-style) fold',
        explain: `
          <details>
            <summary>The problem: <code>reduce</code> logic repeated, and unsafe on
            empty input</summary>
            <p>Without monoids you write a slightly different <code>reduce</code> each time:
            <code>(a, b) =&gt; a + b</code> with <code>0</code>,
            <code>Math.max</code> with... what? People often forget the initial value, and
            <code>[].reduce(Math.max)</code> throws <code>TypeError: Reduce of empty array
            with no initial value</code>. Packaging <code>concat</code> and
            <code>empty</code> together means one generic <code>fold(M, xs)</code> works for
            every monoid, and <code>fold(Max, [])</code> returns <code>-Infinity</code>
            instead of crashing.</p>
          </details>
          <details>
            <summary>Step by step: the chunked fold of <code>[3, 1, 4, 1, 5, 9, 2, 6]</code></summary>
            <p><code>chunk(nums, 3)</code> gives <code>[3,1,4]</code>, <code>[1,5,9]</code>,
            <code>[2,6]</code>. Each chunk is folded on its own (imagine three workers), then the
            partial results are folded again.</p>
            <table>
              <tr><th>Monoid</th><th>Chunk results</th><th>Fold of partials</th>
                <th>Sequential fold</th><th>Same?</th></tr>
              <tr><td>Sum</td><td>8, 15, 8</td><td>31</td><td>31</td><td>✅</td></tr>
              <tr><td>Max</td><td>4, 9, 6</td><td>9</td><td>9</td><td>✅</td></tr>
              <tr><td>Sub (not associative)</td><td>-8, -15, -8</td>
                <td>0 - (-8) - (-15) - (-8) = <strong>31</strong></td>
                <td><strong>-31</strong></td><td>❌</td></tr>
            </table>
            <p>Console (array formatting may differ slightly in the browser):</p>
            <pre><code>Sum: 31
Product: 6480
Max: 9 | Min: 1
All &gt; 0: true
Any &gt; 8: true
Str: folded
Arr: [ 1, 2, 3 ]
Max of []: -Infinity (identity, no crash)
--- chunked (size 3) ---
  Sum partials: [ 8, 15, 8 ]
Sum chunked: 31
  Max partials: [ 4, 9, 6 ]
Max chunked: 9
Sub sequential: -31
  Sub partials: [ -8, -15, -8 ]
Sub chunked: 31</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const Sum = { name: 'Sum', empty: 0, concat: (a, b) =&gt; a + b }; // ①
const fold = (M, xs) =&gt; xs.reduce((acc, x) =&gt; M.concat(acc, x), M.empty); // ②
const partials = chunk(xs, n).map(c =&gt; fold(M, c)); // ③
return fold(M, partials);                              // ④</code></pre>
            <ol>
              <li><strong>①</strong> A monoid is just data: an identity and a combine function.
              No classes needed.</li>
              <li><strong>②</strong> <code>fold</code> never mentions numbers or strings. It only
              trusts the monoid's two promises (associative, identity).</li>
              <li><strong>③</strong> Each chunk starts from <code>M.empty</code>. Because
              <code>empty</code> is neutral, the extra starting values do not change the
              answer.</li>
              <li><strong>④</strong> Folding the partials is the same as re-bracketing the whole
              sum: <code>(3+1+4) + (1+5+9) + (2+6)</code>. Associativity says that is
              allowed. For <code>Sub</code> it is not, so the answer flips sign.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the chunk size to <code>2</code> or <code>5</code>. Sum and Max never
              change; Sub changes again.</li>
              <li>Add <code>const Avg = { name: 'Avg', empty: 0, concat: (a, b) =&gt; (a + b) / 2 }</code>
              and compare sequential vs chunked. It is not associative either.</li>
              <li>Fold <code>Str</code> in chunks: still <code>folded</code>, because string
              concat is associative (just not commutative).</li>
            </ul>
          </details>
        `,
        code: `// A monoid = a type + an associative concat + an identity "empty".
const Sum = { name: 'Sum', empty: 0, concat: (a, b) => a + b };
const Product = { name: 'Product', empty: 1, concat: (a, b) => a * b };
const Max = { name: 'Max', empty: -Infinity, concat: (a, b) => Math.max(a, b) };
const Min = { name: 'Min', empty: Infinity, concat: (a, b) => Math.min(a, b) };
const All = { name: 'All', empty: true, concat: (a, b) => a && b };
const Any = { name: 'Any', empty: false, concat: (a, b) => a || b };
const Str = { name: 'Str', empty: '', concat: (a, b) => a + b };
const Arr = { name: 'Arr', empty: [], concat: (a, b) => a.concat(b) };

// One fold for every monoid. Works on empty lists too.
const fold = (M, xs) => xs.reduce((acc, x) => M.concat(acc, x), M.empty);

const nums = [3, 1, 4, 1, 5, 9, 2, 6];
console.log('Sum:', fold(Sum, nums));
console.log('Product:', fold(Product, nums));
console.log('Max:', fold(Max, nums), '| Min:', fold(Min, nums));
console.log('All > 0:', fold(All, nums.map(n => n > 0)));
console.log('Any > 8:', fold(Any, nums.map(n => n > 8)));
console.log('Str:', fold(Str, ['fo', 'ld', 'ed']));
console.log('Arr:', fold(Arr, [[1], [2, 3], []]));
console.log('Max of []:', fold(Max, []), '(identity, no crash)');

// Associativity => split into chunks, fold each chunk, then fold the results.
const chunk = (xs, n) => (xs.length ? [xs.slice(0, n), ...chunk(xs.slice(n), n)] : []);

const chunkedFold = (M, xs, n) => {
  const partials = chunk(xs, n).map(c => fold(M, c)); // could run on separate workers
  console.log('  ' + M.name + ' partials:', partials);
  return fold(M, partials);
};

console.log('--- chunked (size 3) ---');
console.log('Sum chunked:', chunkedFold(Sum, nums, 3));
console.log('Max chunked:', chunkedFold(Max, nums, 3));

// Subtraction is NOT associative: (a - b) - c !== a - (b - c)
const Sub = { name: 'Sub', empty: 0, concat: (a, b) => a - b };
console.log('Sub sequential:', fold(Sub, nums));
console.log('Sub chunked:', chunkedFold(Sub, nums, 3));`,
      },
      {
        title: 'foldMap + struct: one-pass stats and layered config',
        code: `const Sum = { empty: 0, concat: (a, b) => a + b };
const Max = { empty: -Infinity, concat: (a, b) => Math.max(a, b) };
const Any = { empty: false, concat: (a, b) => a || b };
const Arr = { empty: [], concat: (a, b) => a.concat(b) };
// Last: the right-most defined value wins (associative, identity = undefined)
const Last = { empty: undefined, concat: (a, b) => (b === undefined ? a : b) };

// foldMap: turn each item into a monoid value, then combine them all
const foldMap = (M, f, xs) => xs.reduce((acc, x) => M.concat(acc, f(x)), M.empty);

// struct: an object of monoids is itself a monoid (missing keys = that key's empty)
const struct = shape => {
  const keys = Object.keys(shape);
  const pick = (o, k) => (o[k] === undefined ? shape[k].empty : o[k]);
  return {
    empty: Object.fromEntries(keys.map(k => [k, shape[k].empty])),
    concat: (a, b) =>
      Object.fromEntries(keys.map(k => [k, shape[k].concat(pick(a, k), pick(b, k))])),
  };
};

// 1) Several statistics in ONE pass over the data
const orders = [
  { id: 1, total: 40, refunded: false },
  { id: 2, total: 125, refunded: true },
  { id: 3, total: 18, refunded: false },
];
const Stats = struct({ count: Sum, revenue: Sum, biggest: Max, anyRefund: Any });
const toStats = o => ({
  count: 1,
  revenue: o.total,
  biggest: o.total,
  anyRefund: o.refunded,
});
console.log('stats:', foldMap(Stats, toStats, orders));
console.log('stats of []:', foldMap(Stats, toStats, []));

// 2) Layered config: defaults <> file <> CLI flags, with a rule per field
const Config = struct({ host: Last, port: Last, debug: Any, plugins: Arr });
const defaults = { host: 'localhost', port: 3000, debug: false, plugins: ['core'] };
const fromFile = { port: 8080, plugins: ['auth'] };
const fromCli = { debug: true, plugins: ['metrics'] };

const merged = [defaults, fromFile, fromCli].reduce(Config.concat, Config.empty);
console.log('config:', merged);`,
      },
    ],
    quiz: [
      {
        q: 'Which property makes it safe to fold chunks of a list separately and then fold the partial results?',
        options: ['Commutativity', 'Associativity', 'Idempotence', 'Purity of the callback'],
        answer: 1,
        why: 'Associativity means the bracketing does not matter, so (a·b·c)·(d·e) equals a·b·c·d·e. Commutativity (order does not matter) is not required; string concat is not commutative but still chunks fine.',
      },
      {
        q: 'What is the identity (<code>empty</code>) for the Max monoid over numbers?',
        options: ['0', 'Number.MAX_VALUE', '-Infinity', 'There is none'],
        answer: 2,
        why: 'Math.max(-Infinity, x) === x for every number x. 0 fails for negative numbers: Math.max(0, -5) is 0, not -5.',
      },
      {
        q: 'Why is <code>(a, b) =&gt; (a + b) / 2</code> NOT a valid semigroup operation?',
        options: [
          'It returns a number',
          'It is not associative: avg(avg(1,2),3) ≠ avg(1,avg(2,3))',
          'It has no identity',
          'It is impure',
        ],
        answer: 1,
        why: 'avg(avg(1,2),3) = 2.25 but avg(1,avg(2,3)) = 1.75. Use a {sum, count} monoid and divide once at the end.',
      },
      {
        q: 'You fold <code>[]</code> with the All monoid (<code>&amp;&amp;</code>, identity <code>true</code>). What do you get, and why is that reasonable?',
        options: [
          'undefined, because there is nothing to check',
          'false, because nothing passed',
          'true: "all of zero items pass" is vacuously true, same as [].every(...)',
          'It throws',
        ],
        answer: 2,
        why: 'The identity is returned for empty input. JavaScript agrees: [].every(x => false) is true and [].some(x => true) is false (the Any identity).',
      },
      {
        q: 'In the <code>struct</code> config example, why does <code>plugins</code> end up <code>[\'core\', \'auth\', \'metrics\']</code> while <code>port</code> is <code>8080</code>?',
        options: [
          'Arrays are always appended in JavaScript',
          'Each field has its own monoid: plugins uses Array (append), port uses Last (right-most defined wins)',
          'Object spread merges arrays',
          'The CLI layer is ignored',
        ],
        answer: 1,
        why: 'struct combines field by field using each field’s monoid. A plain {...a, ...b} spread would replace plugins instead of appending them.',
      },
    ],
    exercise: {
      task: `
        <p>Build the pieces for a one-pass word report.</p>
        <ol>
          <li>Implement <code>foldMap(M, f, xs)</code>.</li>
          <li>Fix <code>CommaList</code> so it joins with <code>', '</code> and
          <code>''</code> is a true identity (<code>concat('', 'x') === 'x'</code>, no stray
          commas).</li>
          <li>Implement <code>toReport(word)</code> so that folding gives
          <code>{ words, longest, list }</code>.</li>
        </ol>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Sum = { empty: 0, concat: (a, b) => a + b };
const Max = { empty: -Infinity, concat: (a, b) => Math.max(a, b) };
const struct = shape => ({
  empty: Object.fromEntries(Object.keys(shape).map(k => [k, shape[k].empty])),
  concat: (a, b) =>
    Object.fromEntries(Object.keys(shape).map(k => [k, shape[k].concat(a[k], b[k])])),
});

// TODO 1: map each x with f, then combine with M (start from M.empty)
const foldMap = (M, f, xs) => M.empty;

// TODO 2: join with ', ' but treat '' as identity
const CommaList = { empty: '', concat: (a, b) => a + b };

// TODO 3: one word -> { words, longest, list }
const Report = struct({ words: Sum, longest: Max, list: CommaList });
const toReport = word => Report.empty;

const words = ['fold', 'map', 'monoid'];
check('foldMap Sum', foldMap(Sum, x => x * 2, [1, 2, 3]), 12);
check('CommaList join', foldMap(CommaList, x => x, ['a', 'b', 'c']), 'a, b, c');
check('CommaList left identity', CommaList.concat('', 'x'), 'x');
check('CommaList right identity', CommaList.concat('x', ''), 'x');
check(
  'CommaList associative',
  CommaList.concat(CommaList.concat('a', 'b'), 'c'),
  CommaList.concat('a', CommaList.concat('b', 'c'))
);
check('report', foldMap(Report, toReport, words), {
  words: 3,
  longest: 6,
  list: 'fold, map, monoid',
});`,
      hint: 'foldMap is xs.reduce((acc, x) => M.concat(acc, f(x)), M.empty). For CommaList: if either side is empty return the other, else a + ", " + b. toReport returns { words: 1, longest: word.length, list: word }.',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Sum = { empty: 0, concat: (a, b) => a + b };
const Max = { empty: -Infinity, concat: (a, b) => Math.max(a, b) };
const struct = shape => ({
  empty: Object.fromEntries(Object.keys(shape).map(k => [k, shape[k].empty])),
  concat: (a, b) =>
    Object.fromEntries(Object.keys(shape).map(k => [k, shape[k].concat(a[k], b[k])])),
});

const foldMap = (M, f, xs) => xs.reduce((acc, x) => M.concat(acc, f(x)), M.empty);

const CommaList = {
  empty: '',
  concat: (a, b) => (a === '' ? b : b === '' ? a : a + ', ' + b),
};

const Report = struct({ words: Sum, longest: Max, list: CommaList });
const toReport = word => ({ words: 1, longest: word.length, list: word });

const words = ['fold', 'map', 'monoid'];
check('foldMap Sum', foldMap(Sum, x => x * 2, [1, 2, 3]), 12);
check('CommaList join', foldMap(CommaList, x => x, ['a', 'b', 'c']), 'a, b, c');
check('CommaList left identity', CommaList.concat('', 'x'), 'x');
check('CommaList right identity', CommaList.concat('x', ''), 'x');
check(
  'CommaList associative',
  CommaList.concat(CommaList.concat('a', 'b'), 'c'),
  CommaList.concat('a', CommaList.concat('b', 'c'))
);
check('report', foldMap(Report, toReport, words), {
  words: 3,
  longest: 6,
  list: 'fold, map, monoid',
});`,
    },
  },

  // ─────────────────────────────────────────────────────────────────── functors
  {
    id: 'functors',
    section: 'Algebraic Abstractions',
    title: 'Functors & the Functor Laws',
    explain: `
      <p>A <strong>functor</strong> is any container (or context) with a
      <code>map</code> that applies a plain function to the value(s) inside
      <em>without changing the container's shape</em>. You have used one for years:
      <code>Array.prototype.map</code> turns an array of 3 into an array of 3.</p>
      <pre><code>[1, 2, 3].map(inc)          // [2, 3, 4]    Array
Box(1).map(inc)             // Box(2)       one value
Just(1).map(inc)            // Just(2)      maybe a value
Nothing().map(inc)          // Nothing      no value: f is skipped
Promise.resolve(1).then(inc) // Promise(2)  a value later (mostly; see "Are Promises Monads?")
(g =&gt; x =&gt; inc(g(x)))       // functions! map = compose</code></pre>

      <h3>The two laws</h3>
      <p>"Has a <code>map</code> method" is not enough. A real functor obeys two laws, and
      they are what make refactoring safe:</p>
      <ol>
        <li><strong>Identity:</strong> <code>F.map(x =&gt; x)</code> equals <code>F</code>.
        Mapping must not sneak in other changes.</li>
        <li><strong>Composition:</strong> <code>F.map(x =&gt; f(g(x)))</code> equals
        <code>F.map(g).map(f)</code>. You can fuse two maps into one, or split one into two,
        and nothing observable changes.</li>
      </ol>
      <p>Together they say: <em>map only touches the values, never the structure</em>. That
      is the whole contract. It lets you reason "this is just my function, applied inside"
      without knowing how the container works.</p>

      <h3>Why it matters</h3>
      <ul>
        <li><strong>Reuse.</strong> A function <code>n =&gt; n + 1</code> works on an array,
        an optional value, a future value, or a parse result just by <code>map</code>ping it.
        You write logic for plain values and lift it.</li>
        <li><strong>Safe refactors.</strong> The composition law is why
        <code>xs.map(f).map(g)</code> can be fused into <code>xs.map(x =&gt; g(f(x)))</code>
        for speed (one pass, no temporary array).</li>
        <li><strong>A shared vocabulary.</strong> Applicatives and monads (next lessons) are
        functors with extra powers. All of them start here.</li>
      </ul>

      <div class="tip">Checking laws in code is easy: pick a few sample values, apply both
      sides, compare. Property-based testing libraries do exactly this with random inputs.</div>
      <div class="warn">A <code>map</code> that filters, sorts, deduplicates, counts calls, or
      flattens nested results is <strong>not</strong> a lawful functor map, even if it is
      useful. Keep those as separate, explicitly named steps.</div>
    `,
    examples: [
      {
        title: 'Box, Maybe, Array, Promise: map + law checks',
        explain: `
          <details>
            <summary>Step by step: what each container does with the same <code>inc</code></summary>
            <table>
              <tr><th>Expression</th><th>What map does</th><th>Console</th></tr>
              <tr><td><code>Box(20).map(inc).map(double)</code></td><td>apply, re-wrap, twice</td>
                <td><code>Box(42)</code></td></tr>
              <tr><td><code>fromNullable(5).map(inc)</code></td><td>value present → apply</td>
                <td><code>Just(6)</code></td></tr>
              <tr><td><code>fromNullable(null).map(inc)</code></td><td>no value → skip f</td>
                <td><code>Nothing</code></td></tr>
              <tr><td><code>[1, 2, 3].map(inc)</code></td><td>apply to each, keep length</td>
                <td><code>[ 2, 3, 4 ]</code></td></tr>
              <tr><td><code>Promise.resolve(3).then(inc).then(double)</code></td>
                <td>apply when the value arrives</td><td><code>Promise: 8</code> (printed
                <em>last</em>, after all sync logs)</td></tr>
            </table>
            <p>Then the law table. Every row prints <code>identity: true  composition: true</code>:</p>
            <pre><code>Box        identity: true  composition: true
Just       identity: true  composition: true
Nothing    identity: true  composition: true
Array      identity: true  composition: true
Promise: 8</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const Box = x =&gt; ({ map: f =&gt; Box(f(x)), ... });       // ①
const Nothing = () =&gt; ({ map: f =&gt; Nothing(), ... });  // ②
const identity = show(fa.map(id)) === show(fa);        // ③
const composition =
  show(fa.map(compose(double, inc))) === show(fa.map(inc).map(double)); // ④</code></pre>
            <ol>
              <li><strong>①</strong> <code>map</code> returns a <em>new</em> Box of the same kind.
              Never mutate, never unwrap for the caller.</li>
              <li><strong>②</strong> <code>Nothing.map</code> ignores <code>f</code>. The shape
              (Nothing) is preserved, which is exactly what the identity law demands.</li>
              <li><strong>③</strong> Containers are compared by a printed form, because two
              different objects are never <code>===</code>.</li>
              <li><strong>④</strong> <code>compose(double, inc)</code> is
              <code>x =&gt; double(inc(x))</code>: inc first, then double, the same order as
              <code>.map(inc).map(double)</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Break Box on purpose: <code>map: f =&gt; Box(f(x) + 1)</code>. Both laws turn
              <code>false</code> for Box.</li>
              <li>Add a "function functor": <code>const mapFn = (g, f) =&gt; x =&gt; f(g(x))</code>.
              <code>mapFn(inc, double)(1)</code> is 4. Mapping over a function is
              composition.</li>
            </ul>
          </details>
        `,
        code: `// Box: the simplest functor. Holds one value; map applies f inside.
const Box = x => ({
  map: f => Box(f(x)),
  fold: f => f(x),
  inspect: () => 'Box(' + JSON.stringify(x) + ')',
});

// Maybe: map only when there is a value.
const Just = x => ({
  map: f => Just(f(x)),
  inspect: () => 'Just(' + JSON.stringify(x) + ')',
});
const Nothing = () => ({
  map: f => Nothing(),
  inspect: () => 'Nothing',
});
const fromNullable = x => (x == null ? Nothing() : Just(x));

const inc = n => n + 1;
const double = n => n * 2;
const id = x => x;
const compose = (f, g) => x => f(g(x));

console.log(Box(20).map(inc).map(double).inspect());
console.log(fromNullable(5).map(inc).inspect());
console.log(fromNullable(null).map(inc).inspect());
console.log([1, 2, 3].map(inc));

// Promise-ish: then with a plain function behaves like map (async, so it prints last)
Promise.resolve(3)
  .then(inc)
  .then(double)
  .then(v => console.log('Promise:', v));

// Check both functor laws on several containers.
const show = v => (v && v.inspect ? v.inspect() : JSON.stringify(v));
const checkLaws = (label, fa) => {
  const identity = show(fa.map(id)) === show(fa);
  const composition =
    show(fa.map(compose(double, inc))) === show(fa.map(inc).map(double));
  console.log(label.padEnd(10), 'identity:', identity, ' composition:', composition);
};

checkLaws('Box', Box(3));
checkLaws('Just', Just(3));
checkLaws('Nothing', Nothing());
checkLaws('Array', [1, 2, 3]);`,
      },
      {
        title: 'Lawless "functors" and how they bite',
        explain: `
          <details>
            <summary>The problem: a "helpful" map that filters nulls</summary>
            <p><code>CleanList.map</code> drops <code>null</code> results after mapping. It feels
            convenient, but now <code>map(f).map(g)</code> and <code>map(x =&gt; g(f(x)))</code>
            disagree, so the "obvious" refactor of fusing two maps changes behaviour.</p>
            <table>
              <tr><th>Path</th><th>After f</th><th>After filter</th><th>After g</th></tr>
              <tr><td><code>map(f).map(g)</code></td><td>[10, null, 30]</td>
                <td>[10, 30] (null dropped)</td><td><code>["n=10","n=30"]</code></td></tr>
              <tr><td><code>map(x =&gt; g(f(x)))</code></td><td colspan="2">g sees null for 2 and
                returns <code>'missing'</code>; nothing to drop</td>
                <td><code>["n=10","missing","n=30"]</code></td></tr>
            </table>
            <p>Console: <code>composition law holds? false</code>.</p>
          </details>
          <details>
            <summary>The second trap: map that changes the structure</summary>
            <p><code>Counted</code> tracks how many times it was mapped. The value is fine, but the
            container is different after <code>map(id)</code>:</p>
            <pre><code>original:    Counted(5, mapped 0x)
map(id):     Counted(5, mapped 1x)
identity law holds? false</code></pre>
            <p>Any code that relies on "mapping identity changes nothing" (memo caches,
            change detection, tests) now gets surprised.</p>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Do not "improve" map. If you need filtering, call
            <code>.filter</code> explicitly. If you need flattening, that is
            <code>chain</code>/<code>flatMap</code> (the Monads lesson). If you need counting,
            put it in a separate log. The last line of the example shows the lawful Array
            version: both paths give <code>["n=10","missing","n=30"]</code>.</div>
          </details>
        `,
        code: `const id = x => x;
const show = v => JSON.stringify(v);

// ❌ Lawless #1: map that also "helpfully" drops null results
const CleanList = xs => ({
  map: f => CleanList(xs.map(f).filter(x => x != null)),
  value: xs,
});

const f = n => (n === 2 ? null : n * 10); // may return null
const g = n => (n == null ? 'missing' : 'n=' + n);

const twoMaps = CleanList([1, 2, 3]).map(f).map(g).value;
const oneMap = CleanList([1, 2, 3]).map(x => g(f(x))).value;
console.log('map(f).map(g):', show(twoMaps));
console.log('map(g∘f):     ', show(oneMap));
console.log('composition law holds?', show(twoMaps) === show(oneMap));

// ❌ Lawless #2: map that changes the structure (counts calls)
const Counted = (x, count = 0) => ({
  map: f => Counted(f(x), count + 1),
  inspect: () => 'Counted(' + x + ', mapped ' + count + 'x)',
});
const c = Counted(5);
console.log('original:   ', c.inspect());
console.log('map(id):    ', c.map(id).inspect());
console.log('identity law holds?', c.inspect() === c.map(id).inspect());

// ✅ Lawful: plain Array map; filtering would be a separate, explicit step
const ys = [1, 2, 3].map(f).map(g);
const zs = [1, 2, 3].map(x => g(f(x)));
console.log('Array map(f).map(g):', show(ys), '=', show(zs));`,
      },
    ],
    quiz: [
      {
        q: 'What does the functor identity law say?',
        options: [
          'map(f) returns the same object reference',
          'F.map(x => x) is equivalent to F',
          'map can only be called once',
          'f must be the identity function',
        ],
        answer: 1,
        why: 'Mapping the identity function must give back an equivalent container: same shape, same values. It need not be the same reference.',
      },
      {
        q: 'Which law lets you safely rewrite <code>xs.map(f).map(g)</code> as <code>xs.map(x =&gt; g(f(x)))</code>?',
        options: ['Identity', 'Composition', 'Associativity of monoids', 'Left identity'],
        answer: 1,
        why: 'Composition: map(g ∘ f) ≡ map(f).map(g). This is the "map fusion" optimisation.',
      },
      {
        q: 'Why is <code>Nothing().map(f)</code> returning <code>Nothing()</code> lawful even though it never calls f?',
        options: [
          'It is not lawful',
          'Because the structure is preserved and both laws hold: there is no value to change',
          'Because f is pure',
          'Because Nothing is a monoid',
        ],
        answer: 1,
        why: 'Nothing.map(id) is Nothing, and Nothing.map(g∘f) is Nothing = Nothing.map(f).map(g). Skipping f is the whole point of Maybe.',
      },
      {
        q: 'A <code>map</code> that removes duplicates from its result breaks which law most directly?',
        options: [
          'Neither: deduping is harmless',
          'Identity: [1, 1].map(x => x) would give [1], not [1, 1]',
          'Associativity',
          'Left identity',
        ],
        answer: 1,
        why: 'Mapping the identity function must give back the same shape. A deduping map changes the length of any list with duplicates, so map(id) is no longer a no-op. Shape-changing logic belongs in its own step.',
      },
      {
        q: 'What is <code>map</code> for functions (the "function functor")?',
        options: ['Function.prototype.call', 'Composition: map(g, f) = x => f(g(x))', 'Currying', 'Memoization'],
        answer: 1,
        why: 'A function is a container of "a value once you give me an input". Mapping f over it means: run the function, then f. That is composition.',
      },
    ],
    exercise: {
      task: `
        <p>Make a tree a lawful functor. A tree node is <code>{ value, children: [...] }</code>.
        Implement <code>mapTree(f, tree)</code> so it returns a <em>new</em> tree with
        <code>f</code> applied to every value, keeping exactly the same shape. Do not mutate the
        input.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Node = (value, children = []) => ({ value, children });

// TODO: apply f to node.value and recursively to every child
const mapTree = (f, node) => node;

const tree = Node(1, [Node(2, [Node(4)]), Node(3)]);
const id = x => x;
const inc = n => n + 1;
const double = n => n * 2;

check('double', mapTree(double, tree), Node(2, [Node(4, [Node(8)]), Node(6)]));
check('identity law', mapTree(id, tree), tree);
check(
  'composition law',
  mapTree(x => double(inc(x)), tree),
  mapTree(double, mapTree(inc, tree))
);
check('input untouched', tree.children[0].value, 2);`,
      hint: 'Return Node(f(node.value), node.children.map(child => mapTree(f, child))). The recursion is just Array map inside your own map.',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Node = (value, children = []) => ({ value, children });

const mapTree = (f, node) =>
  Node(f(node.value), node.children.map(child => mapTree(f, child)));

const tree = Node(1, [Node(2, [Node(4)]), Node(3)]);
const id = x => x;
const inc = n => n + 1;
const double = n => n * 2;

check('double', mapTree(double, tree), Node(2, [Node(4, [Node(8)]), Node(6)]));
check('identity law', mapTree(id, tree), tree);
check(
  'composition law',
  mapTree(x => double(inc(x)), tree),
  mapTree(double, mapTree(inc, tree))
);
check('input untouched', tree.children[0].value, 2);`,
    },
  },

  // ─────────────────────────────────────────────────────────────── applicatives
  {
    id: 'applicatives',
    section: 'Algebraic Abstractions',
    title: 'Applicatives',
    explain: `
      <p>Functors let you apply a <em>one</em>-argument function inside a container. But what
      about <code>add(a, b)</code> when <code>a</code> and <code>b</code> are both
      <code>Maybe</code>s? Mapping gets you halfway and then you are stuck:</p>
      <pre><code>const add = a =&gt; b =&gt; a + b;      // curried
Just(2).map(add)                   // Just(b =&gt; 2 + b)  a FUNCTION inside a box
// now how do we feed it Just(3)?</code></pre>

      <h3><code>ap</code>: apply a boxed function to a boxed value</h3>
      <p>An <strong>applicative functor</strong> is a functor with two extras:</p>
      <ul>
        <li><code>of(x)</code> (a.k.a. <code>pure</code>): put a plain value in a default box.</li>
        <li><code>ap</code>: given a box holding a function and a box holding a value, apply one
        to the other and return a box. In this course we use the readable style
        <code>boxOfFn.ap(boxOfValue)</code>.</li>
      </ul>
      <pre><code>Just(2).map(add).ap(Just(3))     // Just(5)
Just(2).map(add).ap(Nothing())   // Nothing

const liftA2 = (f, fa, fb) =&gt; fa.map(f).ap(fb);
const liftA3 = (f, fa, fb, fc) =&gt; fa.map(f).ap(fb).ap(fc);</code></pre>
      <p><code>liftA2</code> "lifts" an ordinary 2-argument function into the world of
      containers. Currying is what makes this work: each <code>ap</code> feeds one more
      argument.</p>
      <div class="tip">The spec <em>Fantasy Land</em> defines <code>ap</code> the other way round
      (<code>value.ap(boxOfFn)</code>). Same idea, different argument order. Libraries differ, so
      check which one you are using.</div>

      <h3>The key difference from monads: independence</h3>
      <p>With <code>ap</code>, all the inputs are computed <strong>independently</strong>: no
      input depends on another's result. That freedom is what allows:</p>
      <ul>
        <li><strong>Collecting all errors</strong> (Validation), because every field is checked
        regardless of the others.</li>
        <li><strong>Running things in parallel</strong> (<code>Promise.all</code> is applicative
        in spirit).</li>
      </ul>

      <h3>Either vs Validation</h3>
      <p><code>Either</code> (you built it earlier) stops at the first <code>Left</code>. Great
      for "step 2 needs step 1's result". For a sign-up form that is annoying: the user fixes the
      name, submits, and only then learns the email is wrong too. <strong>Validation</strong> has
      the same shape as Either (<code>Success</code>/<code>Failure</code>) but its
      <code>ap</code> <em>concatenates</em> the error lists when both sides fail. (The error list is
      a monoid. Monoids are everywhere.)</p>
      <div class="warn">Validation is an applicative but <strong>not</strong> a lawful monad. A
      <code>chain</code> must wait for the previous result, so it cannot collect later errors.
      Use <code>ap</code> for independent checks and <code>chain</code> for dependent ones.</div>
    `,
    examples: [
      {
        title: 'ap & liftA2 with Maybe and Array',
        code: `const show = x => (typeof x === 'function' ? '<function>' : JSON.stringify(x));

const Just = x => ({
  map: f => Just(f(x)),
  ap: other => other.map(x), // x is a FUNCTION here; apply it to other's value
  inspect: () => 'Just(' + show(x) + ')',
});
const Nothing = () => ({
  map: () => Nothing(),
  ap: () => Nothing(),
  inspect: () => 'Nothing',
});

const add = a => b => a + b; // curried: one argument at a time

// map alone gets stuck: a function trapped in a box
const stuck = Just(2).map(add);
console.log('Just(2).map(add):', stuck.inspect());
console.log('.ap(Just(3)):    ', stuck.ap(Just(3)).inspect());

// liftA2 / liftA3: lift plain multi-arg functions to work on boxes
const liftA2 = (f, fa, fb) => fa.map(f).ap(fb);
const liftA3 = (f, fa, fb, fc) => fa.map(f).ap(fb).ap(fc);
console.log('liftA2 add J2 J3:', liftA2(add, Just(2), Just(3)).inspect());
console.log('liftA2 add J2 N: ', liftA2(add, Just(2), Nothing()).inspect());

const price = qty => unit => discount => qty * unit - discount;
console.log('liftA3 price:    ', liftA3(price, Just(3), Just(10), Just(5)).inspect());

// Arrays are applicatives too: ap = every function x every value
const arrAp = (fs, xs) => fs.flatMap(f => xs.map(f));
const tshirt = size => color => size + '-' + color;
console.log('array liftA2:', arrAp(['S', 'M'].map(tshirt), ['red', 'blue']));`,
      },
      {
        title: 'Either short-circuits, Validation accumulates (same bad form)',
        explain: `
          <details>
            <summary>The problem: one error at a time is a bad form UX</summary>
            <p>The form <code>{ name: '', email: 'bob.example.com', age: 15 }</code> has
            <strong>three</strong> problems. Validating with Either tells the user about only the
            first one. They fix it, resubmit, learn about the second, and so on. We want every
            message in one go, but with the same tidy
            <code>of(makeUser).ap(name).ap(email).ap(age)</code> code.</p>
          </details>
          <details>
            <summary>Step by step: both traces side by side</summary>
            <p>Each field is validated first (all three run!). Then the results are fed into
            <code>makeUser</code> one <code>ap</code> at a time:</p>
            <table>
              <tr><th>Step</th><th>Either (acc)</th><th>Validation (acc)</th></tr>
              <tr><td>start</td><td><code>Right(&lt;function&gt;)</code></td>
                <td><code>Success(&lt;function&gt;)</code></td></tr>
              <tr><td>ap name (fails)</td><td><code>Left("name is required")</code></td>
                <td><code>Failure(["name is required"])</code></td></tr>
              <tr><td>ap email (fails)</td><td><code>Left("name is required")</code>
                ← email error dropped</td>
                <td><code>Failure(["name is required","email must contain @"])</code></td></tr>
              <tr><td>ap age (fails)</td><td><code>Left("name is required")</code>
                ← age error dropped</td>
                <td><code>Failure([... ,"must be 18+"])</code>, all 3</td></tr>
            </table>
            <p>With a good form both end in a user object:
            <code>Right({"name":"Bob",...})</code> and
            <code>Success({"name":"Bob",...})</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const Left = e =&gt; ({ ap: () =&gt; Left(e), ... });          // ①
const Failure = errs =&gt; ({
  ap: other =&gt;
    other.tag === 'Failure'
      ? Failure(errs.concat(other.errs))                 // ②
      : Failure(errs),
});
const Success = x =&gt; ({ ap: other =&gt; other.map(x), ... }); // ③</code></pre>
            <ol>
              <li><strong>①</strong> Either's <code>Left.ap</code> ignores its argument. The
              email result was computed but never looked at.</li>
              <li><strong>②</strong> Validation's <code>Failure.ap</code> looks at the other side
              and, if it also failed, concatenates the two error arrays (the Array monoid).</li>
              <li><strong>③</strong> <code>Success.ap</code> is identical to
              <code>Right.ap</code>. The <em>only</em> difference between the two types is ②.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>badForm.name</code> to <code>'Bob'</code>. Either now reports the
              email error; Validation reports two errors.</li>
              <li>Change the order of the checks list to <code>['age', 'email', 'name']</code>
              (and <code>makeUser</code> parameters). Either's single error changes to
              <code>must be 18+</code>: short-circuiting depends on order.</li>
            </ul>
          </details>
        `,
        code: `const show = x => (typeof x === 'function' ? '<function>' : JSON.stringify(x));

// Either: stops at the FIRST error
const Right = x => ({
  tag: 'Right',
  map: f => Right(f(x)),
  ap: other => other.map(x),
  inspect: () => 'Right(' + show(x) + ')',
});
const Left = e => ({
  tag: 'Left',
  map: () => Left(e),
  ap: () => Left(e), // ignores the other side completely
  inspect: () => 'Left(' + show(e) + ')',
});

// Validation: same shape, but Failure.ap(Failure) keeps BOTH error lists
const Success = x => ({
  tag: 'Success',
  map: f => Success(f(x)),
  ap: other => other.map(x),
  inspect: () => 'Success(' + show(x) + ')',
});
const Failure = errs => ({
  tag: 'Failure',
  errs,
  map: () => Failure(errs),
  ap: other =>
    other.tag === 'Failure' ? Failure(errs.concat(other.errs)) : Failure(errs),
  inspect: () => 'Failure(' + show(errs) + ')',
});

// Rules return true or an error message
const rules = {
  name: v => v.trim() !== '' || 'name is required',
  email: v => v.includes('@') || 'email must contain @',
  age: v => v >= 18 || 'must be 18+',
};
const validator = (ok, fail) => (field, value) => {
  const r = rules[field](value);
  return r === true ? ok(value) : fail(r);
};
const checkEither = validator(Right, Left);
const checkValidation = validator(Success, msg => Failure([msg]));

const makeUser = name => email => age => ({ name, email, age });
const fields = ['name', 'email', 'age'];

const trace = (label, start, check, form) => {
  console.log('--- ' + label + ' ---');
  let acc = start;
  console.log('start      ', acc.inspect());
  for (const field of fields) {
    acc = acc.ap(check(field, form[field]));
    console.log(('ap ' + field).padEnd(11), acc.inspect());
  }
  return acc;
};

const badForm = { name: '', email: 'bob.example.com', age: 15 };
trace('Either', Right(makeUser), checkEither, badForm);
trace('Validation', Success(makeUser), checkValidation, badForm);

const goodForm = { name: 'Bob', email: 'bob@example.com', age: 30 };
const run = (start, check) =>
  fields.reduce((acc, f) => acc.ap(check(f, goodForm[f])), start);
console.log('--- good form ---');
console.log(run(Right(makeUser), checkEither).inspect());
console.log(run(Success(makeUser), checkValidation).inspect());`,
      },
    ],
    quiz: [
      {
        q: 'What problem does <code>ap</code> solve that <code>map</code> cannot?',
        options: [
          'Mapping over arrays',
          'Applying a function that is itself inside a container to a value inside a container',
          'Flattening nested containers',
          'Running side effects',
        ],
        answer: 1,
        why: 'Just(2).map(add) leaves Just(fn). ap takes that boxed fn and a boxed argument and applies one to the other.',
      },
      {
        q: 'Why must <code>add</code> be curried (<code>a =&gt; b =&gt; a + b</code>) for <code>Just(2).map(add).ap(Just(3))</code>?',
        options: [
          'For performance',
          'map passes one argument, so it must return a function waiting for the next one, which ap then supplies',
          'Because ap only works with arrow functions',
          'It does not need to be curried',
        ],
        answer: 1,
        why: 'Each map/ap step supplies exactly one argument. A curried function returns a new function after each, which is what ends up in the box.',
      },
      {
        q: 'Same bad form with 3 problems. How many errors do Either and Validation report via <code>ap</code>?',
        options: ['3 and 3', '1 and 1', '1 and 3', '0 and 3'],
        answer: 2,
        why: 'Left.ap ignores the rest, so Either keeps only the first error. Failure.ap concatenates error lists, so Validation keeps all three.',
      },
      {
        q: 'Why is Validation not a (lawful) monad?',
        options: [
          'It has no map',
          'chain needs the previous value to continue; after a Failure there is no value, so later errors can never be collected, making chain and ap disagree',
          'Because arrays are not monoids',
          'It is a monad',
        ],
        answer: 1,
        why: 'Monad laws require ap to be derivable from chain. A chain-based ap would short-circuit like Either, contradicting Validation’s accumulating ap.',
      },
      {
        q: 'For arrays, <code>liftA2(f, [1, 2], [10, 20])</code> with <code>f = a =&gt; b =&gt; a + b</code> gives:',
        options: ['[11, 22]', '[11, 21, 12, 22]', '[3, 30]', '[[11, 21], [12, 22]]'],
        answer: 1,
        why: 'Array ap pairs every function with every value (a cartesian product), flattened: 1+10, 1+20, 2+10, 2+20.',
      },
    ],
    exercise: {
      task: `
        <p><code>Failure.ap</code> below behaves like Either (it drops later errors). Fix it so
        errors accumulate, then use <code>liftA3</code> to validate a password with three
        independent rules. The result should be <code>Success(password)</code> or a
        <code>Failure</code> listing <em>every</em> broken rule in order.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Success = value => ({
  tag: 'Success',
  value,
  map: f => Success(f(value)),
  ap: other => other.map(value),
});
const Failure = errs => ({
  tag: 'Failure',
  errs,
  map: () => Failure(errs),
  // TODO: if other is also a Failure, combine both error lists
  ap: other => Failure(errs),
});

const liftA3 = (f, a, b, c) => a.map(f).ap(b).ap(c);
const rule = (ok, msg) => pw => (ok(pw) ? Success(pw) : Failure([msg]));
const minLen = rule(pw => pw.length >= 8, 'min 8 chars');
const hasDigit = rule(pw => /[0-9]/.test(pw), 'needs a digit');
const hasUpper = rule(pw => pw !== pw.toLowerCase(), 'needs uppercase');

// TODO: combine the three rule results with liftA3, keep the password as the value
const validatePassword = pw => Success(pw);

const plain = r => (r.tag === 'Success' ? { ok: r.value } : { errors: r.errs });
check('all bad', plain(validatePassword('abc')), {
  errors: ['min 8 chars', 'needs a digit', 'needs uppercase'],
});
check('two bad', plain(validatePassword('abcdefgh')), {
  errors: ['needs a digit', 'needs uppercase'],
});
check('good', plain(validatePassword('Secret123')), { ok: 'Secret123' });`,
      hint: 'Failure.ap: other.tag === "Failure" ? Failure(errs.concat(other.errs)) : Failure(errs). For validatePassword: liftA3(a => b => c => a, minLen(pw), hasDigit(pw), hasUpper(pw)).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Success = value => ({
  tag: 'Success',
  value,
  map: f => Success(f(value)),
  ap: other => other.map(value),
});
const Failure = errs => ({
  tag: 'Failure',
  errs,
  map: () => Failure(errs),
  ap: other =>
    other.tag === 'Failure' ? Failure(errs.concat(other.errs)) : Failure(errs),
});

const liftA3 = (f, a, b, c) => a.map(f).ap(b).ap(c);
const rule = (ok, msg) => pw => (ok(pw) ? Success(pw) : Failure([msg]));
const minLen = rule(pw => pw.length >= 8, 'min 8 chars');
const hasDigit = rule(pw => /[0-9]/.test(pw), 'needs a digit');
const hasUpper = rule(pw => pw !== pw.toLowerCase(), 'needs uppercase');

const keepFirst = a => b => c => a;
const validatePassword = pw => liftA3(keepFirst, minLen(pw), hasDigit(pw), hasUpper(pw));

const plain = r => (r.tag === 'Success' ? { ok: r.value } : { errors: r.errs });
check('all bad', plain(validatePassword('abc')), {
  errors: ['min 8 chars', 'needs a digit', 'needs uppercase'],
});
check('two bad', plain(validatePassword('abcdefgh')), {
  errors: ['needs a digit', 'needs uppercase'],
});
check('good', plain(validatePassword('Secret123')), { ok: 'Secret123' });`,
    },
  },

  // ───────────────────────────────────────────────────────────────────── monads
  {
    id: 'monads',
    section: 'Algebraic Abstractions',
    title: 'Monads Without the Mystery',
    explain: `
      <p>Forget burritos. A <strong>monad</strong> is a functor with one extra operation,
      usually called <code>chain</code> (also <code>flatMap</code>, <code>bind</code>,
      <code>&gt;&gt;=</code>), plus <code>of</code> to wrap a plain value. That is it.</p>

      <h3>The problem chain solves: boxes inside boxes</h3>
      <p>Functors are great when your function returns a plain value. But many useful functions
      return a <em>container</em> themselves: <code>safeProp</code> returns a Maybe,
      <code>parseJSON</code> returns an Either, <code>fetchUser</code> returns a Promise,
      <code>s.split(' ')</code> returns an Array. Map one of those over a container and you get
      a box inside a box:</p>
      <pre><code>findUser('ana').map(prop('address'))   // Just(Just({ street: ... }))
['hi there'].map(s =&gt; s.split(' '))     // [['hi', 'there']]</code></pre>
      <p>Each further step adds another layer, and your next function receives a box instead of
      the value it expects.</p>

      <h3><code>chain = map, then flatten one layer</code></h3>
      <pre><code>// join: unwrap exactly one layer (Just(Just(x)) -&gt; Just(x))
m.chain(f) === m.map(f).join()</code></pre>
      <p>For Arrays you already know this: <code>xs.flatMap(f)</code> is
      <code>xs.map(f).flat()</code>. <strong><code>Array.prototype.flatMap</code> is monadic
      bind.</strong></p>

      <h3>What chain gives you: dependent sequencing</h3>
      <p>Applicative <code>ap</code> combines independent results. <code>chain</code> lets
      <strong>the next step depend on the previous value</strong>, and lets the container decide
      whether to continue: Maybe stops on Nothing, Either stops on Left, Array runs the next step
      once per element, Promise waits. Same code shape, different "effect". That is the reason
      monads are worth a name.</p>

      <h3>The three monad laws</h3>
      <ol>
        <li><strong>Left identity:</strong> <code>of(a).chain(f) ≡ f(a)</code>. Wrapping then
        chaining adds nothing.</li>
        <li><strong>Right identity:</strong> <code>m.chain(of) ≡ m</code>. Chaining with
        "just wrap it" changes nothing.</li>
        <li><strong>Associativity:</strong>
        <code>m.chain(f).chain(g) ≡ m.chain(x =&gt; f(x).chain(g))</code>. You can extract a
        sub-pipeline into a helper function without changing behaviour.</li>
      </ol>
      <div class="tip">Associativity is the practical one: it is why refactoring a long
      <code>.chain().chain()</code> into named helpers, or a long <code>async</code> function into
      smaller <code>async</code> functions, is safe.</div>
      <div class="warn">Common mistake: using <code>map</code> where you needed
      <code>chain</code>. Symptom: you see <code>Just(Just(...))</code>, <code>[[...]]</code>, or
      a function receives a container when it expected a value. Rule of thumb: <em>if your
      function returns a container, chain it; otherwise map it.</em></div>
    `,
    examples: [
      {
        title: 'Maybe<Maybe<x>>: the nesting problem and chain',
        explain: `
          <details>
            <summary>The problem: <code>map</code> with a Maybe-returning function nests</summary>
            <p><code>prop(key)</code> returns a Maybe so missing keys are safe. But each
            <code>map</code> wraps its result again:</p>
            <table>
              <tr><th>Code</th><th>Console</th><th>What went wrong</th></tr>
              <tr><td><code>findUser('ana').map(prop('address'))</code></td>
                <td><code>Just(Just({"street":"Main St"}))</code></td>
                <td>two layers</td></tr>
              <tr><td><code>step1.map(prop('street'))</code></td>
                <td><code>Just(Nothing)</code></td>
                <td>prop looked for <code>street</code> on the inner <em>box</em>, not the address.
                Ana has a street, yet we got Nothing!</td></tr>
              <tr><td><code>step1.map(inner =&gt; inner.map(prop('street')))</code></td>
                <td><code>Just(Just(Just("Main St")))</code></td>
                <td>correct, but three layers and ugly nested lambdas</td></tr>
              <tr><td><code>deep.join().join()</code></td><td><code>Just("Main St")</code></td>
                <td>manually peeling layers</td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: <code>street(id)</code> with chain</summary>
            <table>
              <tr><th>id</th><th>findUser</th><th>.chain(prop('address'))</th>
                <th>.chain(prop('street'))</th><th>Console</th></tr>
              <tr><td>ana</td><td>Just(user)</td><td>Just(address)</td><td>Just("Main St")</td>
                <td><code>chain ana: Just("Main St")</code></td></tr>
              <tr><td>ben</td><td>Just(user)</td><td>Nothing (no address)</td>
                <td>Nothing (skipped)</td><td><code>chain ben: Nothing</code></td></tr>
              <tr><td>zoe</td><td>Nothing (no user)</td><td>Nothing (skipped)</td>
                <td>Nothing (skipped)</td><td><code>chain zoe: Nothing</code></td></tr>
            </table>
            <p>One flat Maybe at every step, and the first missing piece short-circuits the rest.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>join: () =&gt; x,                          // ① Just(Just(v)).join() -&gt; Just(v)
chain: f =&gt; Just(x).map(f).join(),      // ② map, then flatten ONE layer
chain: () =&gt; Nothing(),                 // ③ Nothing: skip f entirely</code></pre>
            <ol>
              <li><strong>①</strong> <code>join</code> returns the inner value, which (when
              f returned a Maybe) is itself a Maybe. One layer removed.</li>
              <li><strong>②</strong> Written literally as map + join to show the definition. In
              practice <code>chain: f =&gt; f(x)</code> is the same thing.</li>
              <li><strong>③</strong> The short-circuit lives in the container, not in your code.
              No <code>if (x == null)</code> anywhere in <code>street</code>.</li>
            </ol>
          </details>
        `,
        code: `const show = x => (x && x.inspect ? x.inspect() : JSON.stringify(x));

const Just = x => ({
  map: f => Just(f(x)),
  join: () => x, // unwrap one layer
  chain: f => Just(x).map(f).join(), // = map, then flatten
  inspect: () => 'Just(' + show(x) + ')',
});
const Nothing = () => ({
  map: () => Nothing(),
  join: () => Nothing(),
  chain: () => Nothing(),
  inspect: () => 'Nothing',
});
const fromNullable = x => (x == null ? Nothing() : Just(x));
const prop = key => obj => fromNullable(obj[key]); // returns a Maybe

const users = {
  ana: { name: 'Ana', address: { street: 'Main St' } },
  ben: { name: 'Ben' },
};
const findUser = id => fromNullable(users[id]);

// ❌ map + Maybe-returning function = nesting
const step1 = findUser('ana').map(prop('address'));
console.log('map once:  ', step1.inspect());
const wrong = step1.map(prop('street'));
console.log('map twice: ', wrong.inspect(), '<- prop looked inside the BOX');
const deep = step1.map(inner => inner.map(prop('street')));
console.log('map inside:', deep.inspect());
console.log('join twice:', deep.join().join().inspect());

// ✅ chain keeps it flat and short-circuits on the first Nothing
const street = id => findUser(id).chain(prop('address')).chain(prop('street'));
for (const id of ['ana', 'ben', 'zoe']) {
  console.log('chain ' + id + ':', street(id).inspect());
}`,
      },
      {
        title: 'Array.flatMap is bind + the monad laws in code',
        explain: `
          <details>
            <summary>What the law checks print</summary>
            <pre><code>Array left identity:  true
Array right identity: true
Array associativity:  true
Maybe left identity:  true
Maybe right identity: true
Maybe associativity:  true
deepChain right identity: false   [[1],[2]] became [1,2]</code></pre>
            <p><code>deepChain</code> flattens <em>all</em> levels (<code>flat(Infinity)</code>)
            instead of exactly one. <code>m.chain(of)</code> should give <code>m</code> back, but
            it squashed the inner arrays that were part of the data. "Flatten one layer" is the
            rule, not "flatten everything".</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>g</code> to return <code>n &gt; 5 ? [n, n] : []</code>. All laws
              still hold.</li>
              <li>Write <code>pairs</code> with three arrays (sizes × colors × fits). Nested
              flatMaps behave like nested for-loops: this is the "list monad".</li>
            </ul>
          </details>
        `,
        code: `const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// Array: of = x => [x], chain = flatMap
const of = x => [x];
const words = ['hi there', 'fp'];
console.log('map:    ', JSON.stringify(words.map(s => s.split(' '))));
console.log('flatMap:', JSON.stringify(words.flatMap(s => s.split(' '))));

// flatMap sequences choices like nested loops
const pairs = [1, 2].flatMap(a => ['x', 'y'].map(b => a + b));
console.log('pairs:', JSON.stringify(pairs));

// Monad laws for Array
const f = n => [n, n * 10];
const g = n => (n > 5 ? [n] : []);
const m = [1, 2, 3];
console.log('Array left identity: ', eq(of(3).flatMap(f), f(3)));
console.log('Array right identity:', eq(m.flatMap(of), m));
const arrLhs = m.flatMap(f).flatMap(g);
const arrRhs = m.flatMap(x => f(x).flatMap(g));
console.log('Array associativity: ', eq(arrLhs, arrRhs));

// Monad laws for Maybe
const Just = x => ({ chain: fn => fn(x), toJSON: () => ['Just', x] });
const Nothing = () => ({ chain: () => Nothing(), toJSON: () => ['Nothing'] });
const half = n => (n % 2 === 0 ? Just(n / 2) : Nothing());
const dec = n => (n > 0 ? Just(n - 1) : Nothing());
const mm = Just(8);
console.log('Maybe left identity: ', eq(Just(8).chain(half), half(8)));
console.log('Maybe right identity:', eq(mm.chain(Just), mm));
const mLhs = mm.chain(half).chain(dec);
const mRhs = mm.chain(x => half(x).chain(dec));
console.log('Maybe associativity: ', eq(mLhs, mRhs));

// ❌ A lawless chain: flattens ALL levels instead of one
const deepChain = (xs, fn) => xs.map(fn).flat(Infinity);
const nested = [[1], [2]];
const back = deepChain(nested, of);
console.log('deepChain right identity:', eq(back, nested), ' ', JSON.stringify(nested),
  'became', JSON.stringify(back));`,
      },
    ],
    quiz: [
      {
        q: 'Which definition of <code>chain</code> is correct?',
        options: ['map twice', 'map, then flatten one layer', 'flatten, then map', 'map, then flatten every layer'],
        answer: 1,
        why: 'chain(f) = map(f).join(). Exactly one layer is removed: the one that f added.',
      },
      {
        q: 'You see <code>Just(Just(42))</code> in your logs. What most likely happened?',
        options: [
          'Maybe is broken',
          'You used map with a function that returns a Maybe; use chain instead',
          'You used chain with a plain function',
          'You called of twice by design',
        ],
        answer: 1,
        why: 'Box-returning functions need chain. map would wrap the returned box in another box.',
      },
      {
        q: 'Which monad law guarantees you can extract <code>x =&gt; f(x).chain(g)</code> into a named helper without changing behaviour?',
        options: ['Left identity', 'Right identity', 'Associativity', 'Functor identity'],
        answer: 2,
        why: 'm.chain(f).chain(g) ≡ m.chain(x => f(x).chain(g)). Regrouping the steps is safe.',
      },
      {
        q: 'What does <code>[1, 2].flatMap(n =&gt; n === 1 ? [] : [n, n])</code> return, and what does it show?',
        options: [
          '[[], [2, 2]]: flatMap does not flatten',
          '[2, 2]: returning [] drops an element, returning many adds them; the array monad expresses "zero or more results"',
          '[1, 2, 2]',
          'It throws',
        ],
        answer: 1,
        why: 'The returned array’s length decides how many results each input produces. [] acts like Nothing; [a, b] like two branches.',
      },
      {
        q: 'What can <code>chain</code> do that <code>ap</code> cannot?',
        options: [
          'Combine two independent containers',
          'Let the next computation depend on the previous result (and pick which container to return)',
          'Accumulate errors',
          'Run in parallel',
        ],
        answer: 1,
        why: 'With chain, f sees the value and decides what to do next. ap fixes both computations up front, which is why ap can be parallel or accumulate errors.',
      },
    ],
    exercise: {
      task: `
        <p>Implement <code>chain</code> for <code>Ok</code> and <code>Err</code> (an Either)
        so the pipeline <code>parseJSON → field('age') → positive</code> stays flat and stops at the
        first error. The starter's <code>chain</code> wraps the result again (that is the map
        mistake). <code>Err</code> is already correct: it skips <code>f</code>.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = x => ({
  map: f => Ok(f(x)),
  chain: f => Ok(f(x)), // TODO: wrong, this nests
  toJSON: () => ({ ok: x }),
});
const Err = e => ({
  map: () => Err(e),
  chain: () => Err(e), // correct: an Err skips f
  toJSON: () => ({ err: e }),
});

const parseJSON = s => {
  try {
    return Ok(JSON.parse(s));
  } catch {
    return Err('bad json');
  }
};
const field = key => obj => (key in obj ? Ok(obj[key]) : Err('no ' + key));
const positive = n => (n > 0 ? Ok(n) : Err('age must be positive'));

const getAge = s => parseJSON(s).chain(field('age')).chain(positive);

check('good', getAge('{"age": 30}'), { ok: 30 });
check('bad json', getAge('{oops'), { err: 'bad json' });
check('missing', getAge('{"name": "Ana"}'), { err: 'no age' });
check('negative', getAge('{"age": -1}'), { err: 'age must be positive' });
check('left identity', Ok(5).chain(positive), positive(5));`,
      hint: 'Ok: chain: f => f(x) (f already returns an Ok/Err). Err: chain: () => Err(e).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = x => ({
  map: f => Ok(f(x)),
  chain: f => f(x),
  toJSON: () => ({ ok: x }),
});
const Err = e => ({
  map: () => Err(e),
  chain: () => Err(e),
  toJSON: () => ({ err: e }),
});

const parseJSON = s => {
  try {
    return Ok(JSON.parse(s));
  } catch {
    return Err('bad json');
  }
};
const field = key => obj => (key in obj ? Ok(obj[key]) : Err('no ' + key));
const positive = n => (n > 0 ? Ok(n) : Err('age must be positive'));

const getAge = s => parseJSON(s).chain(field('age')).chain(positive);

check('good', getAge('{"age": 30}'), { ok: 30 });
check('bad json', getAge('{oops'), { err: 'bad json' });
check('missing', getAge('{"name": "Ana"}'), { err: 'no age' });
check('negative', getAge('{"age": -1}'), { err: 'age must be positive' });
check('left identity', Ok(5).chain(positive), positive(5));`,
    },
  },

  // ──────────────────────────────────────────────────────────── promises-monads
  {
    id: 'promises-monads',
    section: 'Algebraic Abstractions',
    title: 'Are Promises Monads?',
    explain: `
      <p>You will often hear "a Promise is a monad". It is <em>close</em>, and the intuition is
      useful: <code>Promise.resolve</code> is <code>of</code>, <code>then</code> is
      <code>map</code>/<code>chain</code>, and <code>async</code>/<code>await</code> is
      basically do-notation. But strictly speaking, no. Here is why, and why you usually should
      not care.</p>

      <h3><code>then</code> is both map and chain</h3>
      <p>A monad has two separate operations. <code>then</code> merges them and decides at runtime:</p>
      <ul>
        <li>callback returns a plain value → behaves like <code>map</code></li>
        <li>callback returns a promise (or <em>any</em> object with a <code>then</code>
        method, a "thenable") → behaves like <code>chain</code>: it waits and flattens</li>
      </ul>

      <h3>You cannot build <code>Promise&lt;Promise&lt;x&gt;&gt;</code></h3>
      <p>Resolving a promise with another promise (or thenable) <strong>adopts</strong> it.
      <code>Promise.resolve(p)</code> even returns <code>p</code> itself. A real monad must be able
      to hold <em>any</em> value, including another monad value. Promises cannot hold a thenable,
      so the type "is a value of type <code>x</code>" quietly depends on whether <code>x</code> has
      a <code>then</code> property.</p>

      <h3>The laws break, but only around thenables</h3>
      <ul>
        <li><strong>Left identity</strong> <code>of(a).chain(f) ≡ f(a)</code> fails when
        <code>a</code> is a thenable: <code>Promise.resolve(a)</code> unwraps it, so
        <code>f</code> never sees <code>a</code>.</li>
        <li><strong>Functor composition</strong> fails when the middle function returns a
        thenable: <code>.then(g).then(h)</code> flattens between the steps; <code>.then(x =&gt;
        h(g(x)))</code> does not.</li>
      </ul>
      <p>With ordinary data (numbers, strings, plain objects without <code>then</code>) the laws
      hold in practice.</p>

      <h3>Eager, not lazy</h3>
      <p>The other non-FP property: <code>new Promise(executor)</code> runs the executor
      <strong>immediately</strong>, and the result is cached. A Promise is a <em>running
      computation</em>, not a <em>description</em> of one. You cannot build a Promise pipeline now
      and decide later whether to run it, or run it twice (retry) without wrapping it in a function.
      The Task type in the next section fixes exactly this.</p>

      <div class="tip"><strong>Practical takeaway.</strong> Treat Promise as "monad-ish": use
      <code>then</code>/<code>await</code> freely; prefer returning promises from
      <code>then</code> callbacks over nesting. Never put an object with a <code>then</code>
      method into a promise unless you mean it. If you need laziness (retry, cancel, describe
      then run) wrap it: <code>() =&gt; fetch(...)</code> is already a tiny Task.</div>
      <div class="warn">Because adoption looks for any <code>then</code> property, a plain object
      like <code>{ then: 'tomorrow' }</code> is fine (not a function), but an object with a
      <code>then()</code> method (some query builders, some ORMs) will be <em>executed</em> when
      you <code>await</code> it or return it from <code>then</code>.</div>
    `,
    examples: [
      {
        title: 'then = map + chain, no nesting, broken laws',
        explain: `
          <details>
            <summary>Step by step: what each block prints</summary>
            <table>
              <tr><th>Block</th><th>Console</th><th>Meaning</th></tr>
              <tr><td>1</td><td><code>then as map  : 3</code></td><td>plain return → map</td></tr>
              <tr><td>2</td><td><code>then as chain: 20</code></td>
                <td>promise return → flattened, not a promise of a promise</td></tr>
              <tr><td>3</td><td><code>Promise.resolve(p) === p ? true</code></td>
                <td>no new layer is even created</td></tr>
              <tr><td>3</td><td><code>new Promise(res(inner)) gives: 1</code></td>
                <td>constructor also adopts</td></tr>
              <tr><td>4</td><td><code>f(thenable)                     : object</code></td>
                <td>f sees the object</td></tr>
              <tr><td>4</td><td><code>Promise.resolve(thenable).then(f): number</code></td>
                <td>f sees 42: the thenable was unwrapped</td></tr>
              <tr><td>4</td><td><code>left identity holds? false</code></td><td></td></tr>
              <tr><td>5</td><td><code>then(g).then(h): number | then(x =&gt; h(g(x))): object</code></td>
                <td>functor composition broken too</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const thenable = { then: resolve =&gt; resolve(42) };     // ①
Promise.resolve(thenable).then(f);                       // ②
const g = x =&gt; ({ then: r =&gt; r(x * 100) });               // ③</code></pre>
            <ol>
              <li><strong>①</strong> Not a promise, just an object with a <code>then</code>
              method. Promises treat it as "a promise from another library" and call it.</li>
              <li><strong>②</strong> <code>of(a)</code> should hold <code>a</code> untouched. It
              doesn't: it called <code>a.then</code> and holds 42 instead.</li>
              <li><strong>③</strong> In the two-step version the thenable returned by
              <code>g</code> is adopted between steps, so <code>h</code> sees the number
              100. In the fused version <code>h</code> receives the object directly.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Rename the <code>then</code> key in <code>thenable</code> to
              <code>next</code>. Now both sides print <code>object</code> and the law holds:
              the problem only exists for thenables.</li>
              <li>Try <code>await thenable</code> directly. It prints 42: <code>await</code>
              adopts thenables too.</li>
            </ul>
          </details>
        `,
        code: `const log = (...args) => console.log(...args);

// 1) then as map: callback returns a plain value
const a = await Promise.resolve(2).then(x => x + 1);
log('then as map  :', a);

// 2) then as chain: callback returns a promise -> flattened automatically
const b = await Promise.resolve(2).then(x => Promise.resolve(x * 10));
log('then as chain:', b);

// 3) Try to build Promise<Promise<number>>
const inner = Promise.resolve(1);
const outer = Promise.resolve(inner);
log('Promise.resolve(p) === p ?', outer === inner);
const viaCtor = new Promise(res => res(inner));
log('new Promise(res(inner)) gives:', await viaCtor);

// 4) Left identity: of(a).chain(f) should equal f(a)
const thenable = { then: resolve => resolve(42) };
const f = x => Promise.resolve(typeof x);
const lhs = await Promise.resolve(thenable).then(f);
const rhs = await f(thenable);
log('f(thenable)                     :', rhs);
log('Promise.resolve(thenable).then(f):', lhs);
log('left identity holds?', lhs === rhs);

// 5) Functor composition breaks when the middle value is a thenable
const g = x => ({ then: r => r(x * 100) });
const h = v => typeof v;
const twoThens = await Promise.resolve(1).then(g).then(h);
const oneThen = await Promise.resolve(1).then(x => h(g(x)));
log('then(g).then(h):', twoThens, '| then(x => h(g(x))):', oneThen);`,
      },
      {
        title: 'Eager Promise vs lazy function: log order',
        explain: `
          <details>
            <summary>The problem: "creating" a promise already runs it</summary>
            <p>People expect <code>const p = new Promise(...)</code> to be a recipe. It isn't. The
            executor runs synchronously, on the spot, before the next line. And it runs exactly
            once: every <code>.then</code> reads the cached result.</p>
          </details>
          <details>
            <summary>Step by step: the real console order</summary>
            <table>
              <tr><th>#</th><th>Console</th><th>Why now?</th><th>runs</th></tr>
              <tr><td>1</td><td><code>1. start</code></td><td>sync</td><td>0</td></tr>
              <tr><td>2</td><td><code>2. eager executor runs NOW (run #1)</code></td>
                <td><code>new Promise</code> calls the executor synchronously</td><td>1</td></tr>
              <tr><td>3</td><td><code>3. eager promise created; nobody asked for it yet</code></td>
                <td>sync</td><td>1</td></tr>
              <tr><td>4</td><td><code>4. lazy defined; nothing ran. runs = 1</code></td>
                <td>defining a function runs nothing</td><td>1</td></tr>
              <tr><td>5</td><td><code>lazy executor runs (run #2)</code></td>
                <td>first <code>lazy()</code> call</td><td>2</td></tr>
              <tr><td>6</td><td><code>lazy executor runs (run #3)</code></td>
                <td>second <code>lazy()</code> call: a fresh run</td><td>3</td></tr>
              <tr><td>7</td><td><code>5. sync code finished. runs = 3</code></td><td>sync</td><td>3</td></tr>
              <tr><td>8</td><td><code>6. eager.then #1: eager data</code></td>
                <td>microtask (callbacks queue in registration order)</td><td>3</td></tr>
              <tr><td>9</td><td><code>7. eager.then #2: eager data (cached, ...)</code></td>
                <td>microtask, no re-run</td><td>3</td></tr>
              <tr><td>10</td><td><code>8. lazy().then #1: lazy data</code></td><td>microtask</td><td>3</td></tr>
              <tr><td>11</td><td><code>9. lazy().then #2: lazy data</code></td><td>microtask</td><td>3</td></tr>
            </table>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Writing a retry helper as <code>retry(fetchUser(id), 3)</code>.
            The promise already ran (and failed) once; retrying it just re-reads the same
            rejection. Pass a <em>function</em>: <code>retry(() =&gt; fetchUser(id), 3)</code>. That
            thunk is the lazy version, and the next lesson section turns it into a proper Task
            with <code>map</code>/<code>chain</code>.</div>
          </details>
        `,
        code: `let runs = 0;

console.log('1. start');
const eager = new Promise(resolve => {
  runs++;
  console.log('2. eager executor runs NOW (run #' + runs + ')');
  resolve('eager data');
});
console.log('3. eager promise created; nobody asked for it yet');

const lazy = () =>
  new Promise(resolve => {
    runs++;
    console.log('   lazy executor runs (run #' + runs + ')');
    resolve('lazy data');
  });
console.log('4. lazy defined; nothing ran. runs =', runs);

eager.then(v => console.log('6. eager.then #1:', v));
eager.then(v => console.log('7. eager.then #2:', v, '(cached, executor not re-run)'));
lazy().then(v => console.log('8. lazy().then #1:', v));
lazy().then(v => console.log('9. lazy().then #2:', v));
console.log('5. sync code finished. runs =', runs);`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>Promise.resolve(p) === p</code> evaluate to when <code>p</code> is a native promise?',
        options: ['false: it wraps p', 'true: it returns p itself', 'It throws', 'Depends on whether p is settled'],
        answer: 1,
        why: 'Promise.resolve returns its argument unchanged if it is already a native promise from the same constructor. No nesting is ever created.',
      },
      {
        q: 'Why does <code>Promise.resolve(a).then(f)</code> not always equal <code>f(a)</code>?',
        options: [
          'Because then is asynchronous',
          'If a is a thenable, Promise.resolve unwraps it, so f receives the inner value instead of a',
          'Because f might throw',
          'It always equals f(a)',
        ],
        answer: 1,
        why: 'This is the left identity law failing. Timing aside, f sees a different value when a has a then method.',
      },
      {
        q: 'When does <code>then</code> act like <code>chain</code> rather than <code>map</code>?',
        options: [
          'Never',
          'When the callback returns a promise or any thenable',
          'When the callback is async',
          'Only on the second then in a chain',
        ],
        answer: 1,
        why: 'then inspects the return value at runtime. Thenables get adopted (chain); other values get wrapped (map). An async callback returns a promise, so it is a special case of this rule.',
      },
      {
        q: 'In the log-order demo, why does <code>2. eager executor runs NOW</code> print before <code>3.</code>?',
        options: [
          'Because of a microtask',
          'The Promise constructor calls the executor synchronously during new Promise(...)',
          'Because resolve was called',
          'Console output is reordered',
        ],
        answer: 1,
        why: 'Only the then callbacks are async (microtasks). The executor itself runs immediately, which is what "eager" means.',
      },
      {
        q: 'What is the pragmatic way to get a lazy, re-runnable async computation in plain JS?',
        options: [
          'Store the promise in a variable',
          'Wrap it in a function: const task = () => fetchThing()',
          'Use Promise.all',
          'Use await at the top level',
        ],
        answer: 1,
        why: 'A thunk delays creation (and therefore execution) until called, and each call is a fresh run. Task builds map/chain on top of this idea.',
      },
    ],
    exercise: {
      task: `
        <p>Make a <em>lawful</em> promise wrapper. Store values inside a small box
        <code>{ value }</code> so a thenable is never adopted. Implement
        <code>P.of</code>, <code>P.map</code> and <code>P.chain</code>, where
        <code>chain</code>'s <code>f</code> returns another <code>P</code> value (a promise of a box).
        The checks are async; they <code>await</code> before comparing.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

// A P value is a Promise<{ value }>
const P = {
  of: x => Promise.resolve({ value: undefined }), // TODO: box x
  map: (p, f) => p, // TODO: apply f to box.value, re-box
  chain: (p, f) => p, // TODO: call f with box.value (f returns a P)
};
const run = async p => (await p).value;

const thenable = { then: r => r(42) };
const f = x => P.of(typeof x);
const g = x => ({ then: r => r(x * 100) });
const h = v => typeof v;

check('map', await run(P.map(P.of(1), x => x + 1)), 2);
check('left identity', await run(P.chain(P.of(thenable), f)), await run(f(thenable)));
check(
  'composition',
  await run(P.map(P.map(P.of(1), g), h)),
  await run(P.map(P.of(1), x => h(g(x))))
);
// (read the box directly: an async function returning a thenable would adopt it!)
const box = await P.of(thenable);
check('holds a thenable', typeof box.value?.then, 'function');`,
      hint: 'of: x => Promise.resolve({ value: x }). map: p.then(box => ({ value: f(box.value) })). chain: p.then(box => f(box.value)). The box object has no then, so nothing inside is ever adopted.',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

// A P value is a Promise<{ value }>
const P = {
  of: x => Promise.resolve({ value: x }),
  map: (p, f) => p.then(box => ({ value: f(box.value) })),
  chain: (p, f) => p.then(box => f(box.value)),
};
const run = async p => (await p).value;

const thenable = { then: r => r(42) };
const f = x => P.of(typeof x);
const g = x => ({ then: r => r(x * 100) });
const h = v => typeof v;

check('map', await run(P.map(P.of(1), x => x + 1)), 2);
check('left identity', await run(P.chain(P.of(thenable), f)), await run(f(thenable)));
check(
  'composition',
  await run(P.map(P.map(P.of(1), g), h)),
  await run(P.map(P.of(1), x => h(g(x))))
);
// (read the box directly: an async function returning a thenable would adopt it!)
const box = await P.of(thenable);
check('holds a thenable', typeof box.value?.then, 'function');`,
    },
  },

  // ─────────────────────────────────────────────────────────────────── traverse
  {
    id: 'traverse',
    section: 'Algebraic Abstractions',
    title: 'Traverse & Sequence',
    explain: `
      <p>You map a Maybe-returning parser over a list and get
      <code>[Just(1), Nothing, Just(3)]</code>: an <code>Array&lt;Maybe&lt;number&gt;&gt;</code>.
      But what you usually want is the opposite nesting: <em>"either all of them parsed, or
      tell me it failed"</em>, a <code>Maybe&lt;Array&lt;number&gt;&gt;</code>.</p>

      <h3>sequence: flip the layers</h3>
      <pre><code>sequence([Just(1), Just(2), Just(3)])   // Just([1, 2, 3])
sequence([Just(1), Nothing, Just(3)])   // Nothing</code></pre>
      <p>You already know one <code>sequence</code>:
      <strong><code>Promise.all</code></strong> turns <code>Array&lt;Promise&lt;x&gt;&gt;</code>
      into <code>Promise&lt;Array&lt;x&gt;&gt;</code>, and rejects if any one rejects.</p>

      <h3>traverse: map + sequence in one pass</h3>
      <pre><code>traverse(of, f, xs) ≡ sequence(of, xs.map(f))
// promises: Promise.all(xs.map(fetchUser)) is traverse</code></pre>

      <h3>How it works: reduce + liftA2</h3>
      <p>Start with <code>of([])</code> (a box holding an empty array). For each item, run
      <code>f</code> to get a box, and use the applicative <code>liftA2</code> to combine
      "box of array so far" with "box of new value" into "box of longer array". If any box is
      Nothing/Left, applicative <code>ap</code> makes the whole result Nothing/Left.</p>
      <pre><code>const traverse = (of, f, xs) =&gt;
  xs.reduce(
    (acc, x) =&gt; liftA2(arr =&gt; v =&gt; [...arr, v], acc, f(x)),
    of([])
  );</code></pre>
      <p>Because it only needs <code>of</code>, <code>map</code> and <code>ap</code>, the
      <strong>same</strong> traverse works for Maybe, Either, Validation, Promise, and more. You
      pick the behaviour by picking the applicative:</p>
      <ul>
        <li>Maybe: all-or-nothing</li>
        <li>Either: all, or the first error</li>
        <li>Validation: all, or <em>every</em> error</li>
        <li>Promise: all, concurrently (or the first rejection)</li>
      </ul>
      <div class="tip">Whenever you write <code>xs.map(f)</code> and then immediately inspect the
      results with <code>every</code>/<code>find</code> to decide success, you are hand-rolling
      traverse.</div>
      <div class="warn"><code>Promise.all(xs.map(f))</code> starts <em>all</em> requests at once
      (because promises are eager). For 10,000 items that can overwhelm a server. Batch them or
      run them one by one with a loop of <code>await</code>s.</div>
    `,
    examples: [
      {
        title: 'Array<Maybe> → Maybe<Array> with traverse',
        explain: `
          <details>
            <summary>The problem: a list of boxes is awkward</summary>
            <p><code>['1', 'x', '3'].map(parseNum)</code> gives three separate Maybes. To answer
            "did everything parse?" you must loop, check each, and unwrap. That is the job of
            <code>traverse</code>.</p>
          </details>
          <details>
            <summary>Step by step: the accumulator after each item</summary>
            <table>
              <tr><th>Item</th><th><code>parseNum(item)</code></th>
                <th>acc for <code>["1","2","3"]</code></th>
                <th>acc for <code>["1","x","3"]</code></th></tr>
              <tr><td>(start)</td><td></td><td><code>Just([])</code></td><td><code>Just([])</code></td></tr>
              <tr><td>"1"</td><td>Just(1)</td><td><code>Just([1])</code></td><td><code>Just([1])</code></td></tr>
              <tr><td>"2" / "x"</td><td>Just(2) / Nothing</td><td><code>Just([1,2])</code></td>
                <td><code>Nothing</code> ← liftA2 with a Nothing</td></tr>
              <tr><td>"3"</td><td>Just(3)</td><td><code>Just([1,2,3])</code></td>
                <td><code>Nothing</code> (stays Nothing)</td></tr>
            </table>
            <p>Console lines: <code>after "1"   -&gt; Just([1])</code>, ..., then
            <code>=&gt; Just([1,2,3])</code> and <code>=&gt; Nothing</code>. Finally
            <code>sequence([Just(1), Just(2)]): Just([1,2])</code> and
            <code>sequence([]): Just([])</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>of([])                                        // ① start: success with no items
liftA2(arr =&gt; v =&gt; [...arr, v], acc, f(x))    // ② combine two boxes with ap
const sequence = (of, xs) =&gt; traverse(of, x =&gt; x, xs); // ③</code></pre>
            <ol>
              <li><strong>①</strong> An empty list trivially "all parsed", so it is
              <code>Just([])</code>, not Nothing.</li>
              <li><strong>②</strong> <code>acc.map(appendFn).ap(nextBox)</code>. If either box is
              Nothing, <code>map</code>/<code>ap</code> produce Nothing.</li>
              <li><strong>③</strong> sequence is traverse with the identity function: the items
              already are boxes.</li>
            </ol>
          </details>
        `,
        code: `const Just = x => ({
  map: f => Just(f(x)),
  ap: other => other.map(x),
  inspect: () => 'Just(' + JSON.stringify(x) + ')',
});
const Nothing = () => ({
  map: () => Nothing(),
  ap: () => Nothing(),
  inspect: () => 'Nothing',
});
const of = Just;
const liftA2 = (f, fa, fb) => fa.map(f).ap(fb);

const parseNum = s =>
  s.trim() !== '' && Number.isInteger(Number(s)) ? Just(Number(s)) : Nothing();

// traverse: map each item with f, folding the boxes together with liftA2
const traverse = (of, f, xs, trace = false) =>
  xs.reduce((acc, x) => {
    const next = liftA2(arr => v => [...arr, v], acc, f(x));
    if (trace) {
      console.log('  after', JSON.stringify(x).padEnd(5), '->', next.inspect());
    }
    return next;
  }, of([]));
const sequence = (of, xs) => traverse(of, x => x, xs);

const boxes = ['1', 'x', '3'].map(parseNum);
console.log('map gives Array<Maybe>:', boxes.map(m => m.inspect()));

console.log('traverse ["1","2","3"]:');
console.log('=>', traverse(of, parseNum, ['1', '2', '3'], true).inspect());

console.log('traverse ["1","x","3"]:');
console.log('=>', traverse(of, parseNum, ['1', 'x', '3'], true).inspect());

console.log('sequence([Just(1), Just(2)]):', sequence(of, [Just(1), Just(2)]).inspect());
console.log('sequence([]):', sequence(of, []).inspect());`,
      },
      {
        title: 'Traverse with Either: validate a whole list',
        code: `const Right = x => ({
  isRight: true,
  map: f => Right(f(x)),
  ap: other => other.map(x),
  inspect: () => 'Right(' + JSON.stringify(x) + ')',
});
const Left = e => ({
  isRight: false,
  map: () => Left(e),
  ap: () => Left(e),
  inspect: () => 'Left(' + JSON.stringify(e) + ')',
});
const liftA2 = (f, fa, fb) => fa.map(f).ap(fb);
const traverse = (of, f, xs) =>
  xs.reduce((acc, x, i) => liftA2(arr => v => [...arr, v], acc, f(x, i)), of([]));

// validate one row, with its index in the message
const toUser = (row, i) => {
  const [name, age] = row.split(',');
  if (!name) return Left('row ' + i + ': missing name');
  if (!(Number(age) >= 0)) return Left('row ' + i + ': bad age "' + age + '"');
  return Right({ name, age: Number(age) });
};

const good = ['ana,31', 'ben,27'];
const bad = ['ana,31', ',40', 'cy,old'];

console.log('good:', traverse(Right, toUser, good).inspect());
console.log('bad: ', traverse(Right, toUser, bad).inspect());

// The same list, mapped without traverse, is harder to use:
console.log('map only:', bad.map(toUser).map(e => e.inspect()));`,
      },
      {
        title: 'Promise.all is sequence (and traverse)',
        code: `const sleep = (ms, v) => new Promise(r => setTimeout(() => r(v), ms));
const fetchPrice = id => sleep(100, { id, price: id * 10 }); // fake async lookup
const ids = [1, 2, 3];

const t0 = Date.now();
const promises = ids.map(fetchPrice); // Array<Promise<x>>
const prices = await Promise.all(promises); // Promise<Array<x>>: sequence!
console.log('Promise.all ->', JSON.stringify(prices));
console.log('ran concurrently?', Date.now() - t0 < 250);

// traverse for promises = Promise.all(xs.map(f))
const traverseP = (f, xs) => Promise.all(xs.map(f));

// The same reduce + liftA2 shape as the Maybe version also works for promises
const liftA2P = (f, pa, pb) => Promise.all([pa, pb]).then(([a, b]) => f(a)(b));
const sequenceP = ps =>
  ps.reduce((acc, p) => liftA2P(arr => v => [...arr, v], acc, p), Promise.resolve([]));
console.log('hand-made sequence:', JSON.stringify(await sequenceP(ids.map(fetchPrice))));

// One rejection fails the whole thing, like Nothing / Left
const flaky = id =>
  id === 2 ? Promise.reject(new Error('no price for ' + id)) : fetchPrice(id);
try {
  await traverseP(flaky, ids);
} catch (e) {
  console.log('rejected:', e.message);
}

// allSettled never rejects: closer to "collect every result"
const settled = await Promise.allSettled(ids.map(flaky));
console.log('allSettled:', settled.map(s => s.status).join(', '));`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>sequence</code> do to <code>[Just(1), Just(2)]</code>?',
        options: ['[1, 2]', 'Just([1, 2])', '[Just([1]), Just([2])]', 'Just(Just([1, 2]))'],
        answer: 1,
        why: 'It flips Array&lt;Maybe&lt;x&gt;&gt; into Maybe&lt;Array&lt;x&gt;&gt;.',
      },
      {
        q: 'Which built-in is <code>sequence</code> for promises?',
        options: ['Promise.race', 'Promise.all', 'Promise.any', 'Promise.resolve'],
        answer: 1,
        why: 'Promise.all: Array&lt;Promise&lt;x&gt;&gt; → Promise&lt;Array&lt;x&gt;&gt;, rejecting if any element rejects.',
      },
      {
        q: 'Why does <code>traverse</code> start the fold with <code>of([])</code>?',
        options: [
          'To avoid a TypeError',
          'An empty list is a success with no items; of([]) is the identity for combining with liftA2',
          'Because Nothing is not allowed',
          'It is arbitrary',
        ],
        answer: 1,
        why: 'traverse(of, f, []) should be "success, nothing to report". Starting from Nothing would make every traverse fail.',
      },
      {
        q: 'You traverse a list of 3 bad rows with <strong>Either</strong>. How many errors come back? With <strong>Validation</strong>?',
        options: ['3 and 3', '1 and 1', '1 and 3', '0 and 3'],
        answer: 2,
        why: 'traverse only uses ap, so it inherits the applicative’s behaviour: Either keeps the first Left, Validation accumulates all Failures.',
      },
      {
        q: 'What minimal operations does a container need for the generic <code>traverse</code> in this lesson?',
        options: ['map only', 'of, map and ap (an applicative)', 'chain only', 'concat and empty'],
        answer: 1,
        why: 'The fold uses of([]) to start and liftA2 (map + ap) to combine. No chain needed, which is why Validation works too.',
      },
    ],
    exercise: {
      task: `
        <p>Implement <code>traverseResult(f, xs)</code> for the <code>Ok</code>/<code>Err</code>
        type below, then use it in <code>parseLines</code> to turn <code>"key=value"</code> lines
        into one object. Any line without exactly one <code>=</code> should make the whole result
        <code>Err('bad line: ' + line)</code> (the first bad line).</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = x => ({ map: f => Ok(f(x)), ap: o => o.map(x), toJSON: () => ({ ok: x }) });
const Err = e => ({ map: () => Err(e), ap: () => Err(e), toJSON: () => ({ err: e }) });
const liftA2 = (f, a, b) => a.map(f).ap(b);

// TODO: reduce xs, starting from Ok([]), appending each f(x) with liftA2
const traverseResult = (f, xs) => Ok([]);

const parseLine = line => {
  const parts = line.split('=');
  return parts.length === 2 ? Ok(parts) : Err('bad line: ' + line);
};

// TODO: traverse the lines, then map the pairs into an object
const parseLines = lines => traverseResult(parseLine, lines);

check('traverse ok', traverseResult(x => Ok(x * 2), [1, 2, 3]), { ok: [2, 4, 6] });
check('traverse empty', traverseResult(x => Err('never'), []), { ok: [] });
check('parse good', parseLines(['host=db', 'port=5432']), {
  ok: { host: 'db', port: '5432' },
});
check('parse bad', parseLines(['host=db', 'oops', 'a=b=c']), { err: 'bad line: oops' });`,
      hint: 'traverseResult = (f, xs) => xs.reduce((acc, x) => liftA2(arr => v => [...arr, v], acc, f(x)), Ok([])). parseLines = lines => traverseResult(parseLine, lines).map(Object.fromEntries).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = x => ({ map: f => Ok(f(x)), ap: o => o.map(x), toJSON: () => ({ ok: x }) });
const Err = e => ({ map: () => Err(e), ap: () => Err(e), toJSON: () => ({ err: e }) });
const liftA2 = (f, a, b) => a.map(f).ap(b);

const traverseResult = (f, xs) =>
  xs.reduce((acc, x) => liftA2(arr => v => [...arr, v], acc, f(x)), Ok([]));

const parseLine = line => {
  const parts = line.split('=');
  return parts.length === 2 ? Ok(parts) : Err('bad line: ' + line);
};

const parseLines = lines => traverseResult(parseLine, lines).map(Object.fromEntries);

check('traverse ok', traverseResult(x => Ok(x * 2), [1, 2, 3]), { ok: [2, 4, 6] });
check('traverse empty', traverseResult(x => Err('never'), []), { ok: [] });
check('parse good', parseLines(['host=db', 'port=5432']), {
  ok: { host: 'db', port: '5432' },
});
check('parse bad', parseLines(['host=db', 'oops', 'a=b=c']), { err: 'bad line: oops' });`,
    },
  },
);
