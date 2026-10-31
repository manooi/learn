window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── higher-order-functions
  {
    id: 'higher-order-functions',
    section: 'Function Toolkit',
    title: 'Higher-Order Functions, Deeper',
    explain: `
      <p>A <strong>higher-order function</strong> (HOF) takes a function as an argument,
      returns a function, or both. You use the first kind daily (<code>map</code>,
      <code>filter</code>, <code>addEventListener</code>). The second kind, functions that
      <em>return</em> functions, is where FP gets its power.</p>

      <h3>Functions that return functions</h3>
      <pre><code>const greaterThan = (n) =&gt; (x) =&gt; x &gt; n;
[5, 12, 30].filter(greaterThan(10)); // [12, 30]</code></pre>
      <p><code>greaterThan(10)</code> is a <em>function factory</em>: it bakes
      <code>n = 10</code> into a new predicate. The inner function remembers <code>n</code>
      through a closure (its own lesson soon).</p>

      <h3>Decorators: wrap behaviour around any function</h3>
      <p>A decorator takes a function and returns a new function with the same "shape" but
      extra behaviour: logging, timing, caching, running once, retrying, debouncing.</p>
      <pre><code>const logged = (fn) =&gt; (...args) =&gt; {
  console.log('calling', fn.name, args);
  const result = fn(...args);
  console.log('returned', result);
  return result;
};</code></pre>
      <p>The pattern is always: <strong>(1)</strong> take <code>fn</code>, <strong>(2)</strong>
      return <code>(...args) =&gt; { ... fn(...args) ... }</code>, <strong>(3)</strong> pass
      the arguments and the return value through untouched (unless changing them is the
      point).</p>
      <div class="tip">Writing your own <code>map</code> once demystifies it: it's a loop that
      calls a function you gave it. Every HOF is "a loop or a wrapper, with the interesting
      part plugged in".</div>
      <div class="warn">Wrappers built with <code>(...args) =&gt;</code> lose
      <code>fn.length</code> (it becomes 0) and the original <code>this</code>. That matters
      for <code>curry</code> (later) and for wrapping object methods.</div>
    `,
    examples: [
      {
        title: 'Write your own map / filter, and function factories',
        code: `// map and filter are just loops with a pluggable function
const myMap = (fn, xs) => {
  const out = [];
  for (let i = 0; i < xs.length; i++) out.push(fn(xs[i], i));
  return out;
};

const myFilter = (pred, xs) => {
  const out = [];
  for (const x of xs) if (pred(x)) out.push(x);
  return out;
};

console.log('myMap:', myMap((n) => n * 10, [1, 2, 3]));
console.log('myFilter:', myFilter((n) => n % 2 === 0, [1, 2, 3, 4]));

// Function factories: return a configured function
const greaterThan = (n) => (x) => x > n;
const multiplyBy = (k) => (x) => x * k;
const hasKey = (key) => (obj) => key in obj;

console.log('> 10:', myFilter(greaterThan(10), [5, 12, 30]));
console.log('x3:', myMap(multiplyBy(3), [1, 2, 3]));
console.log('has email:', [{ email: 'a' }, { name: 'b' }].filter(hasKey('email')));

// Each call makes an independent function
const gt0 = greaterThan(0);
const gt100 = greaterThan(100);
console.log('gt0(50), gt100(50):', gt0(50), gt100(50));`,
      },
      {
        title: 'Decorators: logged, timed, once',
        code: `const logged = (fn) => (...args) => {
  console.log('-> ' + fn.name, JSON.stringify(args));
  const result = fn(...args);
  console.log('<- ' + fn.name, JSON.stringify(result));
  return result;
};

const timed = (fn) => (...args) => {
  const start = performance.now();
  const result = fn(...args);
  const ms = performance.now() - start;
  console.log(fn.name + ' took ' + (ms < 5 ? 'under 5' : Math.round(ms)) + 'ms');
  return result;
};

const once = (fn) => {
  let done = false;
  let result;
  return (...args) => {
    if (!done) {
      done = true;
      result = fn(...args);
    }
    return result;
  };
};

function add(a, b) {
  return a + b;
}
function sumTo(n) {
  let s = 0;
  for (let i = 1; i <= n; i++) s += i;
  return s;
}

const loggedAdd = logged(add);
loggedAdd(2, 3);

const timedSum = timed(sumTo);
console.log('sum:', timedSum(1000));

const init = once(() => {
  console.log('initialising... (only once)');
  return { ready: true };
});
console.log('init 1:', init());
console.log('init 2:', init());

// Decorators stack: the outer one wraps the inner one
const loggedTimedAdd = logged(timed(add));
loggedTimedAdd(10, 20); // inner function name is lost: timed returns an anonymous fn`,
      },
      {
        title: 'A debounce-like wrapper (timing)',
        code: `// debounce: wait until calls stop for \`wait\` ms, then run once with the LAST args
const debounce = (fn, wait) => {
  let timer = null; // ① private state shared by every call
  return (...args) => {
    clearTimeout(timer); // ② cancel the previous pending run
    timer = setTimeout(() => fn(...args), wait); // ③ schedule a new one
  };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
const at = () => Math.round((Date.now() - t0) / 100) * 100; // rounded to 100ms

const search = (q) => console.log('search("' + q + '") ran at ~' + at() + 'ms');
const debouncedSearch = debounce(search, 200);

console.log('typing "f"');
debouncedSearch('f');
await sleep(50);
console.log('typing "fp"');
debouncedSearch('fp');
await sleep(50);
console.log('typing "fp!"');
debouncedSearch('fp!');

await sleep(500); // user pauses
console.log('typing "x"');
debouncedSearch('x');`,
        explain: `
          <details>
            <summary>The problem: one call per keystroke is too many</summary>
            <p>A search box that calls the server on every keystroke sends "f", "fp", "fp!"...
            and the first two answers are useless. A debounced function waits until calls
            <em>stop</em> for <code>wait</code> ms and then runs once, with the latest
            arguments.</p>
          </details>
          <details>
            <summary>Step by step timeline</summary>
            <table>
              <tr><th>Time</th><th>Event</th><th><code>timer</code></th><th>Console</th></tr>
              <tr><td>0ms</td><td><code>debouncedSearch('f')</code></td><td>A: fires at 200</td><td><code>typing "f"</code></td></tr>
              <tr><td>50ms</td><td><code>debouncedSearch('fp')</code>: clear A</td><td>B: fires at 250</td><td><code>typing "fp"</code></td></tr>
              <tr><td>100ms</td><td><code>debouncedSearch('fp!')</code>: clear B</td><td>C: fires at 300</td><td><code>typing "fp!"</code></td></tr>
              <tr><td>300ms</td><td>C fires</td><td>(done)</td><td><code>search("fp!") ran at ~300ms</code></td></tr>
              <tr><td>600ms</td><td><code>debouncedSearch('x')</code></td><td>D: fires at 800</td><td><code>typing "x"</code></td></tr>
              <tr><td>800ms</td><td>D fires</td><td>(done)</td><td><code>search("x") ran at ~800ms</code></td></tr>
            </table>
            <p>Three calls in quick succession produced <strong>one</strong> run. The times
            are rounded to the nearest 100ms because real timers drift by a few ms.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>timer</code> lives in the closure created by
              <code>debounce</code>. Every call to the returned function sees the same variable,
              but no outside code can touch it.</li>
              <li><strong>②</strong> <code>clearTimeout</code> cancels the run scheduled by the
              previous call. (<code>clearTimeout(null)</code> is a harmless no-op.)</li>
              <li><strong>③</strong> The new timer captures <em>these</em> <code>args</code>,
              so the run that finally happens uses the last arguments.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>debounce(search, 200)</code> to <code>debounce(search, 30)</code>.
              The 50ms gaps are now longer than the wait, so all three searches run.</li>
              <li>Replace <code>debouncedSearch</code> with plain <code>search</code> in the four
              calls to see the undebounced behaviour.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Which of these is a higher-order function?',
        options: [
          '<code>(a, b) =&gt; a + b</code>',
          '<code>(n) =&gt; (x) =&gt; x * n</code>',
          '<code>Math.max</code>',
          '<code>(s) =&gt; s.trim()</code>',
        ],
        answer: 1,
        why: 'It returns a function. A HOF takes and/or returns functions; the others only work with plain values.',
      },
      {
        q: 'What does <code>[5, 12, 30].filter(greaterThan(10))</code> return with <code>greaterThan = n =&gt; x =&gt; x &gt; n</code>?',
        options: ['[5]', '[12, 30]', '[true, true]', 'A function'],
        answer: 1,
        why: 'greaterThan(10) returns the predicate x =&gt; x &gt; 10, which filter calls for each element.',
      },
      {
        q: 'A decorator returns <code>(...args) =&gt; fn(...args)</code> plus extra work. What does it typically lose from <code>fn</code>?',
        options: [
          'Its return value',
          'Its arguments',
          'Its name and <code>length</code> (and <code>this</code> for methods)',
          'Nothing at all',
        ],
        answer: 2,
        why: 'The wrapper is a new function: a rest-parameter arrow has length 0, its own (or empty) name, and arrows don\'t forward this.',
      },
      {
        q: 'A debounced function with <code>wait = 200</code> is called at 0ms, 50ms and 100ms. When does the real function run?',
        options: ['At 0, 50 and 100ms', 'Once, at about 200ms', 'Once, at about 300ms', 'Never'],
        answer: 2,
        why: 'Each call cancels the pending timer and starts a new 200ms one. The last call was at 100ms, so it fires at ~300ms.',
      },
    ],
    exercise: {
      task: `<p>Write a decorator <code>withRetry(fn, times)</code>. The returned function calls
      <code>fn(...args)</code>; if it throws, it tries again, up to <code>times</code> total
      attempts. Return the first successful result. If every attempt throws, rethrow the
      <strong>last</strong> error.</p>`,
      starter: `const withRetry = (fn, times) => (...args) => {
  // TODO: loop up to \`times\` attempts, return on success, rethrow the last error
  return fn(...args);
};

// A function that fails the first N calls
const flaky = (failures) => {
  let calls = 0;
  return (x) => {
    calls++;
    if (calls <= failures) throw new Error('fail #' + calls);
    return x * 2;
  };
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const attempt = (f) => {
  try {
    return f();
  } catch (e) {
    return 'threw ' + e.message;
  }
};

check('succeeds first try', attempt(() => withRetry(flaky(0), 3)(5)), 10);
check('succeeds on 3rd try', attempt(() => withRetry(flaky(2), 3)(5)), 10);
check('gives up after 3', attempt(() => withRetry(flaky(5), 3)(5)), 'threw fail #3');`,
      hint: 'let lastError; for (let i = 0; i < times; i++) { try { return fn(...args); } catch (e) { lastError = e; } } throw lastError;',
      solution: `const withRetry = (fn, times) => (...args) => {
  let lastError;
  for (let i = 0; i < times; i++) {
    try {
      return fn(...args);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
};

// A function that fails the first N calls
const flaky = (failures) => {
  let calls = 0;
  return (x) => {
    calls++;
    if (calls <= failures) throw new Error('fail #' + calls);
    return x * 2;
  };
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const attempt = (f) => {
  try {
    return f();
  } catch (e) {
    return 'threw ' + e.message;
  }
};

check('succeeds first try', attempt(() => withRetry(flaky(0), 3)(5)), 10);
check('succeeds on 3rd try', attempt(() => withRetry(flaky(2), 3)(5)), 10);
check('gives up after 3', attempt(() => withRetry(flaky(5), 3)(5)), 'threw fail #3');`,
    },
  },

  // ───────────────────────────────────────────────────────────── reduce-universal
  {
    id: 'reduce-universal',
    section: 'Function Toolkit',
    title: 'reduce: The Universal Loop',
    explain: `
      <p><code>map</code> transforms each element. <code>filter</code> keeps some.
      <code>reduce</code> does something more general: it walks the array carrying an
      <strong>accumulator</strong>, and at each step computes the <em>next</em> accumulator
      from the current one and the element.</p>
      <pre><code>xs.reduce((acc, x, index, array) =&gt; nextAcc, initialAcc)</code></pre>
      <p>Because the accumulator can be <em>anything</em> (a number, an array, an object, a
      function), almost every loop that "builds a result" can be written as a reduce. That's
      why it's called a <strong>fold</strong> in other languages and treated as the universal
      list operation.</p>

      <h3>Think in accumulator shapes</h3>
      <ul>
        <li>Sum/count/max → accumulator is a <strong>number</strong>.</li>
        <li>map/filter → accumulator is an <strong>array</strong>.</li>
        <li>groupBy/indexBy/countBy → accumulator is an <strong>object</strong> (or Map).</li>
        <li>pipe → accumulator is a <strong>value flowing through functions</strong>.</li>
      </ul>
      <p>Decide the shape first, then the initial value is "the empty version of that shape":
      <code>0</code>, <code>[]</code>, <code>{}</code>, or the input value.</p>

      <h3>Always pass an initial value</h3>
      <p>Without one, reduce uses <code>xs[0]</code> as the accumulator and starts at index 1.
      That throws a <code>TypeError</code> on an empty array, silently skips your reducer for a
      single-element array, and breaks when elements are not the same type as the result.</p>

      <div class="tip">"Can" doesn't mean "should". If a <code>map</code> or
      <code>filter</code> says it, use those: they name the intent. Built-ins exist too:
      <code>Object.groupBy</code> (ES2024) and <code>Map.groupBy</code>. Reach for
      <code>reduce</code> when the result shape is genuinely custom.</div>
      <div class="warn">Spreading the accumulator on every step
      (<code>(acc, x) =&gt; ({ ...acc, [x.id]: x })</code>) is O(n²). For big arrays, mutating
      a <em>fresh accumulator you created in the initial value</em> is fine: it's local
      mutation, invisible to callers.</div>
    `,
    examples: [
      {
        title: 'Watching the accumulator, step by step',
        code: `const nums = [3, 1, 4];

const total = nums.reduce((acc, n, i) => {
  const next = acc + n;
  console.log('sum   i=' + i, '| acc', acc, '+ n', n, '->', next);
  return next;
}, 0);
console.log('total:', total);

const words = ['apple', 'bob', 'avocado', 'cat'];

const byFirstLetter = words.reduce((acc, w, i) => {
  const key = w[0];
  const next = { ...acc, [key]: [...(acc[key] ?? []), w] };
  console.log('group i=' + i, '| acc', acc, '+', w, '->', next);
  return next;
}, {});
console.log('grouped:', byFirstLetter);`,
        explain: `
          <details>
            <summary>Step by step: the sum</summary>
            <table>
              <tr><th>i</th><th>acc (in)</th><th>n</th><th>returned (next acc)</th></tr>
              <tr><td>start</td><td colspan="3">initial value <code>0</code></td></tr>
              <tr><td>0</td><td>0</td><td>3</td><td>3</td></tr>
              <tr><td>1</td><td>3</td><td>1</td><td>4</td></tr>
              <tr><td>2</td><td>4</td><td>4</td><td>8</td></tr>
              <tr><td>end</td><td colspan="3">reduce returns the last accumulator: <code>total: 8</code></td></tr>
            </table>
            <p>The reducer never "stores" anything: it receives the old acc and returns a new
            one. reduce passes that return value back in on the next step.</p>
          </details>
          <details>
            <summary>Step by step: grouping (object accumulator)</summary>
            <table>
              <tr><th>i</th><th>acc (in)</th><th>w</th><th>next acc</th></tr>
              <tr><td>start</td><td colspan="3"><code>{}</code></td></tr>
              <tr><td>0</td><td><code>{}</code></td><td>apple</td><td><code>{"a":["apple"]}</code></td></tr>
              <tr><td>1</td><td><code>{"a":["apple"]}</code></td><td>bob</td><td><code>{"a":["apple"],"b":["bob"]}</code></td></tr>
              <tr><td>2</td><td><code>{"a":["apple"],"b":["bob"]}</code></td><td>avocado</td><td><code>{"a":["apple","avocado"],"b":["bob"]}</code></td></tr>
              <tr><td>3</td><td><code>{"a":["apple","avocado"],"b":["bob"]}</code></td><td>cat</td><td><code>{"a":["apple","avocado"],"b":["bob"],"c":["cat"]}</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const key = w[0];
const next = {
  ...acc,                          // ① copy the groups we have so far
  [key]: [                         // ② computed key, e.g. 'a'
    ...(acc[key] ?? []),           // ③ existing group, or [] the first time
    w,
  ],
};</code></pre>
            <ol>
              <li><strong>①</strong> Each step returns a new object, so every logged
              <code>acc</code> above is a separate snapshot. (Fine for teaching; O(n²) for huge
              arrays.)</li>
              <li><strong>②</strong> <code>[key]:</code> makes the property name dynamic.</li>
              <li><strong>③</strong> <code>??</code> handles the first word of each letter,
              when there is no group yet.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the initial value <code>0</code> to <code>100</code>: every row shifts
              and <code>total</code> is 108.</li>
              <li>Group by length instead: <code>const key = w.length</code>.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'map, filter, groupBy and pipe, all as reduce',
        code: `const map = (fn, xs) => xs.reduce((acc, x) => [...acc, fn(x)], []);

const filter = (pred, xs) => xs.reduce((acc, x) => (pred(x) ? [...acc, x] : acc), []);

// Local mutation of a fresh accumulator: fast, and still pure from outside
const groupBy = (keyFn, xs) =>
  xs.reduce((acc, x) => {
    const k = keyFn(x);
    (acc[k] ??= []).push(x);
    return acc;
  }, {});

// The accumulator is the value flowing through the functions
const pipe = (...fns) => (input) => fns.reduce((value, fn) => fn(value), input);

console.log('map:', map((n) => n * 2, [1, 2, 3]));
console.log('filter:', filter((n) => n > 1, [1, 2, 3]));

const people = [
  { name: 'Ana', team: 'red' },
  { name: 'Ben', team: 'blue' },
  { name: 'Cy', team: 'red' },
];
console.log('groupBy:', groupBy((p) => p.team, people));
console.log('Object.groupBy:', Object.groupBy(people, (p) => p.team));

const shout = pipe(
  (s) => s.trim(),
  (s) => s.toUpperCase(),
  (s) => s + '!',
);
console.log('pipe:', shout('  hello '));`,
      },
      {
        title: 'Initial value pitfalls',
        code: `const add = (a, b) => a + b;

// ① Empty array, no initial value -> TypeError
try {
  [].reduce(add);
} catch (e) {
  console.log('① [].reduce(add):', e.name + ': ' + e.message);
}
console.log('① [].reduce(add, 0):', [].reduce(add, 0));

// ② Elements are objects, result is a number: first acc is an OBJECT
const cart = [{ price: 5 }, { price: 7 }];
console.log('② no init:', cart.reduce((sum, item) => sum + item.price));
console.log('② init 0:', cart.reduce((sum, item) => sum + item.price, 0));

// ③ One element, no initial value: the reducer is never called!
const one = [{ price: 5 }];
console.log('③ no init:', one.reduce((sum, item) => sum + item.price));

// ④ A shared initial value gets mutated across calls
const EMPTY = {};
const countWords = (ws) =>
  ws.reduce((acc, w) => {
    acc[w] = (acc[w] ?? 0) + 1;
    return acc;
  }, EMPTY); // same object every call!

console.log('④ first call:', countWords(['a', 'b']));
console.log('④ second call:', countWords(['a']));`,
        explain: `
          <details>
            <summary>The problem: "no initial value" means "use the first element"</summary>
            <p>When you omit the second argument, reduce takes <code>xs[0]</code> as the
            starting accumulator and begins the loop at index 1. That's only correct when the
            elements already have the same type as the result <em>and</em> the array is never
            empty.</p>
          </details>
          <details>
            <summary>Step by step: what each case does</summary>
            <table>
              <tr><th>Case</th><th>Starting acc</th><th>Reducer calls</th><th>Console</th></tr>
              <tr><td>① <code>[].reduce(add)</code></td><td>none exists</td><td>0</td><td><code>TypeError: Reduce of empty array with no initial value</code></td></tr>
              <tr><td>① with <code>0</code></td><td>0</td><td>0</td><td><code>0</code></td></tr>
              <tr><td>② no init</td><td><code>{price: 5}</code> (an object!)</td><td>1: <code>{price:5} + 7</code></td><td><code>[object Object]7</code></td></tr>
              <tr><td>② init 0</td><td>0</td><td>2: 0+5, 5+7</td><td><code>12</code></td></tr>
              <tr><td>③ one element</td><td><code>{price: 5}</code></td><td>0 (nothing left to visit)</td><td><code>{"price":5}</code> (not 5!)</td></tr>
              <tr><td>④ first call</td><td>EMPTY = <code>{}</code></td><td>2</td><td><code>{"a":1,"b":1}</code></td></tr>
              <tr><td>④ second call</td><td>EMPTY, still holding a:1, b:1</td><td>1</td><td><code>{"a":2,"b":1}</code> ❌</td></tr>
            </table>
            <p>In ②, <code>object + number</code> converts the object to the string
            <code>"[object Object]"</code> and concatenates. No error, just a wrong answer.</p>
          </details>
          <details>
            <summary>Common mistake: mutating a shared accumulator</summary>
            <p>Case ④ shows why "mutate the accumulator" is only OK when the initial value is
            <strong>created fresh on each call</strong>. Write <code>}, {});</code> inside the
            function, not a module-level constant. A fresh <code>{}</code> literal is a new
            object every time the expression runs.</p>
            <div class="tip">Rule of thumb: always pass an initial value, and make it a literal
            (<code>0</code>, <code>[]</code>, <code>{}</code>, <code>new Map()</code>) right
            there in the call.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does <code>[].reduce((a, b) =&gt; a + b)</code> do?',
        options: ['Returns 0', 'Returns undefined', 'Throws a TypeError', 'Returns []'],
        answer: 2,
        why: 'With no initial value, reduce needs at least one element to use as the accumulator. An empty array throws "Reduce of empty array with no initial value".',
      },
      {
        q: 'What is <code>[{ n: 2 }, { n: 3 }].reduce((s, o) =&gt; s + o.n)</code>?',
        options: ['5', '"[object Object]3"', 'NaN', 'TypeError'],
        answer: 1,
        why: 'The first acc is the object { n: 2 }. object + 3 converts the object to "[object Object]" and concatenates. Pass 0 as the initial value.',
      },
      {
        q: 'What is the accumulator in <code>pipe = (...fns) =&gt; x =&gt; fns.reduce((v, f) =&gt; f(v), x)</code>?',
        options: [
          'The list of functions',
          'The current value as it flows through each function',
          'A counter',
          'An empty array',
        ],
        answer: 1,
        why: 'The initial value is the input x; each step applies the next function to the value so far.',
      },
      {
        q: 'When is mutating the accumulator inside a reducer acceptable?',
        options: [
          'Never',
          'Always',
          'When the initial value is a fresh object created for this reduce call',
          'Only with arrays',
        ],
        answer: 2,
        why: 'Then the mutation is local: nobody else holds that object. Mutating a shared initial value leaks state between calls.',
      },
      {
        q: 'With an initial value, how many times is the reducer called for an array of length 4?',
        options: ['3', '4', '5', 'Depends on the values'],
        answer: 1,
        why: 'Once per element. Without an initial value it would be 3, because xs[0] becomes the accumulator.',
      },
    ],
    exercise: {
      task: `<p>Implement each with a single <code>reduce</code> (and an initial value!):</p>
      <ul>
        <li><code>countBy(keyFn, xs)</code> → <code>{ key: count }</code></li>
        <li><code>partition(pred, xs)</code> → <code>[passing, failing]</code></li>
        <li><code>maxBy(fn, xs)</code> → the element with the largest <code>fn(x)</code>, or
        <code>undefined</code> for an empty array</li>
      </ul>`,
      starter: `const countBy = (keyFn, xs) => {
  // TODO
  return {};
};

const partition = (pred, xs) => {
  // TODO
  return [[], []];
};

const maxBy = (fn, xs) => {
  // TODO (hint: start from undefined)
  return undefined;
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const words = ['hi', 'yo', 'hey', 'a'];
check('countBy length', countBy((w) => w.length, words), { 1: 1, 2: 2, 3: 1 });
check('countBy empty', countBy((w) => w, []), {});
check('partition', partition((n) => n % 2 === 0, [1, 2, 3, 4]), [[2, 4], [1, 3]]);
check('maxBy', maxBy((p) => p.age, [{ age: 3 }, { age: 9 }, { age: 5 }]), { age: 9 });
check('maxBy empty', maxBy((p) => p.age, []) === undefined, true);`,
      hint: 'countBy: acc[k] = (acc[k] ?? 0) + 1 with {}. partition: ([yes, no], x) => pred(x) ? [[...yes, x], no] : [yes, [...no, x]] with [[], []]. maxBy: (best, x) => best === undefined || fn(x) > fn(best) ? x : best with undefined.',
      solution: `const countBy = (keyFn, xs) =>
  xs.reduce((acc, x) => {
    const k = keyFn(x);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});

const partition = (pred, xs) =>
  xs.reduce(([yes, no], x) => (pred(x) ? [[...yes, x], no] : [yes, [...no, x]]), [[], []]);

const maxBy = (fn, xs) =>
  xs.reduce((best, x) => (best === undefined || fn(x) > fn(best) ? x : best), undefined);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const words = ['hi', 'yo', 'hey', 'a'];
check('countBy length', countBy((w) => w.length, words), { 1: 1, 2: 2, 3: 1 });
check('countBy empty', countBy((w) => w, []), {});
check('partition', partition((n) => n % 2 === 0, [1, 2, 3, 4]), [[2, 4], [1, 3]]);
check('maxBy', maxBy((p) => p.age, [{ age: 3 }, { age: 9 }, { age: 5 }]), { age: 9 });
check('maxBy empty', maxBy((p) => p.age, []) === undefined, true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── closures-state
  {
    id: 'closures-state',
    section: 'Function Toolkit',
    title: 'Closures as Private State',
    explain: `
      <p>A <strong>closure</strong> is a function together with the variables it can see from
      where it was <em>defined</em>. When <code>makeCounter</code> returns an inner function,
      that inner function keeps access to <code>makeCounter</code>'s local variables, even
      after <code>makeCounter</code> has returned.</p>

      <h3>Closures capture bindings, not values</h3>
      <p>The inner function doesn't take a snapshot. It holds a live link to the
      <em>variable</em>. If the variable changes later, the closure sees the new value.</p>
      <pre><code>let x = 1;
const getX = () =&gt; x;
x = 2;
getX(); // 2, not 1</code></pre>

      <h3>The loop trap</h3>
      <p><code>var</code> is function-scoped: a <code>for (var i ...)</code> loop has
      <strong>one</strong> <code>i</code> shared by every iteration, so every closure created
      in the loop sees its final value. <code>let</code> in a <code>for</code> header creates a
      <strong>fresh binding per iteration</strong>, so each closure gets its own.</p>

      <h3>Closures vs objects</h3>
      <p>"Objects are a poor man's closures, closures are a poor man's objects." Both bundle
      data with behaviour. A closure gives you <strong>truly private</strong> state for free:
      there is no property to reach, not even by reflection. Classes now have
      <code>#private</code> fields for the same purpose. Pick closures for small factories
      and one-off state; classes when you want many methods, <code>instanceof</code>, or
      inheritance.</p>

      <div class="warn">Private state inside a closure is still <em>state</em>. A function that
      reads and writes closed-over variables is not pure (<code>counter.inc()</code> returns
      different values each call). Closures are how FP <em>contains</em> unavoidable state,
      not how it avoids it.</div>
    `,
    examples: [
      {
        title: 'Counter factory: private, independent state',
        code: `const makeCounter = (start = 0) => {
  let count = start; // ① lives as long as some function can still see it

  return {
    inc: () => ++count, // ② these three functions share ONE count
    dec: () => --count,
    get: () => count,
  };
};

const a = makeCounter();
const b = makeCounter(100); // ③ a separate call = a separate count

a.inc();
a.inc();
b.dec();
console.log('a:', a.get(), '| b:', b.get());
console.log('can we reach count?', 'count' in a, Object.keys(a));

// Bindings, not values
let greeting = 'hello';
const greet = () => greeting + '!';
console.log('before:', greet());
greeting = 'bonjour'; // ④ the closure sees the change
console.log('after:', greet());`,
        explain: `
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Line</th><th>a's count</th><th>b's count</th><th>Console</th></tr>
              <tr><td><code>makeCounter()</code></td><td>0</td><td>-</td><td></td></tr>
              <tr><td><code>makeCounter(100)</code></td><td>0</td><td>100</td><td></td></tr>
              <tr><td><code>a.inc()</code> ×2</td><td>2</td><td>100</td><td></td></tr>
              <tr><td><code>b.dec()</code></td><td>2</td><td>99</td><td><code>a: 2 | b: 99</code></td></tr>
              <tr><td><code>'count' in a</code></td><td colspan="2">not a property</td><td><code>can we reach count? false ["inc","dec","get"]</code></td></tr>
              <tr><td><code>greet()</code></td><td colspan="2"><code>greeting = 'hello'</code></td><td><code>before: hello!</code></td></tr>
              <tr><td>④ reassign, <code>greet()</code></td><td colspan="2"><code>greeting = 'bonjour'</code></td><td><code>after: bonjour!</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>count</code> is a local variable of one
              <code>makeCounter</code> call. Normally it would disappear when the call returns,
              but the returned functions still reference it, so it stays alive.</li>
              <li><strong>②</strong> <code>inc</code>, <code>dec</code> and <code>get</code>
              were created in the same call, so they close over the same <code>count</code>.</li>
              <li><strong>③</strong> Each call to <code>makeCounter</code> creates a fresh scope
              with its own <code>count</code>. That's why <code>a</code> and <code>b</code> don't
              interfere.</li>
              <li><strong>④</strong> <code>greet</code> captured the <em>variable</em>
              <code>greeting</code>, not the string <code>'hello'</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>a.count = 999; console.log(a.get())</code>. It's still 2:
              you created a new property, unrelated to the private variable.</li>
              <li>Add a <code>reset</code> method that sets <code>count = start</code>.
              <code>start</code> is captured too.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The var / let loop pitfall',
        code: `// var: ONE binding for the whole loop
const withVar = [];
for (var i = 0; i < 3; i++) {
  withVar.push(() => i); // ① every closure points at the same i
}
console.log('var:', withVar.map((f) => f()));
console.log('i after the loop:', i);

// let: a NEW binding for each iteration
const withLet = [];
for (let j = 0; j < 3; j++) {
  withLet.push(() => j); // ② each closure gets its own j
}
console.log('let:', withLet.map((f) => f()));

// Old-school fix for var: create a scope per iteration with a function
const withIife = [];
for (var k = 0; k < 3; k++) {
  withIife.push(((captured) => () => captured)(k)); // ③
}
console.log('iife:', withIife.map((f) => f()));

// The same bug with timers
for (var t = 0; t < 3; t++) {
  setTimeout(() => console.log('timer var t =', t), 0);
}`,
        explain: `
          <details>
            <summary>The problem: closures see the variable's final value</summary>
            <p>The closures don't run during the loop. They run <em>later</em> (in
            <code>map</code>, or when a timer fires). By then the loop has finished and the
            single <code>var i</code> holds 3, the value that made <code>i &lt; 3</code>
            false.</p>
          </details>
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Iteration</th><th><code>var i</code> (one binding)</th><th><code>let j</code> (binding per iteration)</th></tr>
              <tr><td>0</td><td>i = 0, closure → <em>the</em> i</td><td>j₀ = 0, closure → j₀</td></tr>
              <tr><td>1</td><td>i = 1, closure → <em>the</em> i</td><td>j₁ = 1, closure → j₁</td></tr>
              <tr><td>2</td><td>i = 2, closure → <em>the</em> i</td><td>j₂ = 2, closure → j₂</td></tr>
              <tr><td>exit</td><td>i = 3 (condition fails)</td><td>loop ends</td></tr>
              <tr><td>call all</td><td><code>var: [3,3,3]</code></td><td><code>let: [0,1,2]</code></td></tr>
            </table>
            <p>Full console output (timers log last, after the synchronous code):</p>
            <pre><code>var: [3,3,3]
i after the loop: 3
let: [0,1,2]
iife: [0,1,2]
timer var t = 3
timer var t = 3
timer var t = 3</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>var</code> declares <code>i</code> once for the
              whole module/function. <code>i</code> is even visible after the loop.</li>
              <li><strong>②</strong> The spec gives a <code>for (let ...)</code> loop a fresh
              copy of <code>j</code> each iteration (copied from the previous one before the
              increment). Each closure holds a different binding.</li>
              <li><strong>③</strong> Before <code>let</code> existed, you called a function to
              make a new scope: its parameter <code>captured</code> is a new binding each
              call.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the timer loop's <code>var t</code> to <code>let t</code>: it prints
              0, 1, 2.</li>
              <li>Change <code>let j</code> to a <code>let j</code> declared <em>before</em> the
              loop (<code>let j; for (j = 0; ...)</code>). It's back to <code>[3,3,3]</code>:
              only a <code>let</code> in the loop header gets per-iteration bindings.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Closures vs objects: same account, two ways',
        code: `// Closure version: balance is unreachable
const makeAccount = (initial) => {
  let balance = initial;
  const deposit = (amt) => {
    if (amt <= 0) throw new Error('positive only');
    balance += amt;
    return balance;
  };
  return { deposit, balance: () => balance };
};

// Class version with #private field (ES2022)
class Account {
  #balance;
  constructor(initial) {
    this.#balance = initial;
  }
  deposit(amt) {
    if (amt <= 0) throw new Error('positive only');
    this.#balance += amt;
    return this.#balance;
  }
  balance() {
    return this.#balance;
  }
}

const c = makeAccount(10);
const o = new Account(10);
c.deposit(5);
o.deposit(5);
console.log('closure:', c.balance(), '| class:', o.balance());

// Difference 1: closure methods are plain functions, safe to pass around
const dep = c.deposit;
console.log('detached closure deposit:', dep(1));

// Difference 2: class methods depend on \`this\`
const odep = o.deposit;
try {
  odep(1);
} catch (e) {
  console.log('detached class deposit:', e.name);
}`,
      },
    ],
    quiz: [
      {
        q: '<code>let n = 1; const f = () =&gt; n; n = 5;</code> What does <code>f()</code> return?',
        options: ['1', '5', 'undefined', 'ReferenceError'],
        answer: 1,
        why: 'Closures capture the binding (the variable), not a copy of its value. f reads n when it runs, and n is 5 by then.',
      },
      {
        q: 'What does this log? <code>const fs = []; for (var i = 0; i &lt; 3; i++) fs.push(() =&gt; i); fs.map(f =&gt; f())</code>',
        options: ['[0, 1, 2]', '[3, 3, 3]', '[2, 2, 2]', '[undefined × 3]'],
        answer: 1,
        why: 'var gives one binding for the whole loop. All closures read it after the loop ended, when it is 3.',
      },
      {
        q: 'Two counters from <code>makeCounter()</code>. Why don\'t they share a count?',
        options: [
          'JavaScript copies variables into each closure',
          'Each call to makeCounter creates a new scope with its own count variable',
          'Because of strict mode',
          'They do share it',
        ],
        answer: 1,
        why: 'A closure is tied to the scope of the call that created it. Two calls, two scopes, two independent variables.',
      },
      {
        q: 'Which is an advantage of closure-based objects over class instances?',
        options: [
          'They support inheritance',
          'Methods don\'t depend on <code>this</code>, so they can be passed around detached',
          'They use less memory with thousands of instances',
          'They work with <code>instanceof</code>',
        ],
        answer: 1,
        why: 'Closure methods reference variables, not this. Classes win on shared prototype methods (memory), instanceof and inheritance.',
      },
    ],
    exercise: {
      task: `<p>Write <code>createStack()</code> returning <code>{ push, pop, peek, size,
      toArray }</code>. The items array must be <strong>private</strong> (closed over), and
      <code>toArray()</code> must return a <em>copy</em> so callers can't mutate the
      internals.</p>`,
      starter: `const createStack = () => {
  // TODO: keep items in a closed-over variable
  return {
    push: (x) => {},
    pop: () => undefined,
    peek: () => undefined,
    size: () => 0,
    toArray: () => [],
  };
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const s = createStack();
s.push(1);
s.push(2);
s.push(3);
check('size', s.size(), 3);
check('peek', s.peek(), 3);
check('pop', s.pop(), 3);
check('toArray', s.toArray(), [1, 2]);
s.toArray().push(99); // must not affect the stack
check('copy protects internals', s.size(), 2);
check('no public items', Object.keys(s).includes('items'), false);
const s2 = createStack();
check('independent stacks', s2.size(), 0);`,
      hint: 'const items = []; push: x => { items.push(x) }, pop: () => items.pop(), peek: () => items.at(-1), size: () => items.length, toArray: () => [...items]',
      solution: `const createStack = () => {
  const items = [];
  return {
    push: (x) => {
      items.push(x);
    },
    pop: () => items.pop(),
    peek: () => items.at(-1),
    size: () => items.length,
    toArray: () => [...items],
  };
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const s = createStack();
s.push(1);
s.push(2);
s.push(3);
check('size', s.size(), 3);
check('peek', s.peek(), 3);
check('pop', s.pop(), 3);
check('toArray', s.toArray(), [1, 2]);
s.toArray().push(99); // must not affect the stack
check('copy protects internals', s.size(), 2);
check('no public items', Object.keys(s).includes('items'), false);
const s2 = createStack();
check('independent stacks', s2.size(), 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── currying
  {
    id: 'currying',
    section: 'Function Toolkit',
    title: 'Currying',
    explain: `
      <p><strong>Currying</strong> turns a function of N arguments into a chain of N functions
      of one argument each:</p>
      <pre><code>const add3 = (a, b, c) =&gt; a + b + c;       // add3(1, 2, 3)
const add3c = (a) =&gt; (b) =&gt; (c) =&gt; a + b + c; // add3c(1)(2)(3)</code></pre>
      <p>Why would you want that? Because you can stop early. <code>add3c(1)</code> is a new,
      useful function waiting for the rest. Supply arguments as you learn them, and get
      specialised functions for free.</p>

      <h3>A generic <code>curry</code></h3>
      <p>Writing arrows by hand gets old. A generic <code>curry(fn)</code> collects arguments
      until it has <code>fn.length</code> of them, then calls <code>fn</code>. The JavaScript
      flavour (as in Ramda/Lodash) also lets you pass several at once:
      <code>f(1)(2, 3)</code>, <code>f(1, 2)(3)</code> and <code>f(1, 2, 3)</code> all work.</p>

      <h3>Data last</h3>
      <p>Currying is only useful if the argument you'll supply <em>last</em> is the one that
      varies most: the <strong>data</strong>. Configuration first, data last:</p>
      <pre><code>const map = curry((fn, xs) =&gt; xs.map(fn));   // data last ✅
const doubleAll = map((n) =&gt; n * 2);           // reusable, no data yet
doubleAll([1, 2, 3]);                          // [2, 4, 6]</code></pre>
      <p>That's why Ramda's functions are <code>R.map(fn, list)</code>, the reverse of
      <code>list.map(fn)</code>: it makes them composable with <code>pipe</code>.</p>

      <div class="warn"><code>fn.length</code> counts only parameters <em>before</em> the first
      one with a default value, and never counts a rest parameter.
      <code>((a, b = 1) =&gt; 0).length</code> is 1, <code>((...xs) =&gt; 0).length</code> is
      0. A length-based <code>curry</code> will call such functions too early. Use an explicit
      arity (<code>curryN(2, fn)</code>) for them.</div>
    `,
    examples: [
      {
        title: 'Manual currying, then a generic curry (traced)',
        code: `// Manual
const volumeC = (l) => (w) => (h) => l * w * h;
console.log('manual:', volumeC(2)(3)(4));

// Generic, with a trace so you can see it collecting arguments
const curry = (fn) => {
  const curried = (...args) => {
    if (args.length >= fn.length) {
      console.log('  have', JSON.stringify(args), '-> call', fn.name);
      return fn(...args); // ① enough arguments: call the real function
    }
    console.log('  have', JSON.stringify(args), '-> need', fn.length, ', wait');
    return (...more) => curried(...args, ...more); // ② remember args, wait for more
  };
  return curried;
};

function volume(l, w, h) {
  return l * w * h;
}
const vol = curry(volume);

console.log('A: vol(2)(3)(4)');
console.log('A =', vol(2)(3)(4));

console.log('B: vol(2, 3)(4)');
console.log('B =', vol(2, 3)(4));

console.log('C: reuse a partial');
const base6 = vol(2, 3); // ③ a reusable "area 6" function
console.log('C =', base6(10), base6(1));`,
        explain: `
          <details>
            <summary>The problem: specialising functions by hand is repetitive</summary>
            <p>Without currying, every "volume with a fixed base" needs a wrapper:
            <code>const base6 = (h) =&gt; volume(2, 3, h)</code>. Currying makes that
            automatic: any prefix of the arguments gives you a ready-made specialised
            function.</p>
          </details>
          <details>
            <summary>Step by step: what <code>curried</code> sees</summary>
            <table>
              <tr><th>Call</th><th>args collected</th><th>≥ fn.length (3)?</th><th>Returns</th></tr>
              <tr><td><code>vol(2)</code></td><td>[2]</td><td>no</td><td>a function waiting for more</td></tr>
              <tr><td><code>(3)</code></td><td>[2, 3]</td><td>no</td><td>a function</td></tr>
              <tr><td><code>(4)</code></td><td>[2, 3, 4]</td><td>yes</td><td><code>volume(2, 3, 4)</code> = 24</td></tr>
              <tr><td><code>vol(2, 3)</code></td><td>[2, 3]</td><td>no</td><td>a function</td></tr>
              <tr><td><code>(4)</code></td><td>[2, 3, 4]</td><td>yes</td><td>24</td></tr>
              <tr><td><code>base6(10)</code></td><td>[2, 3, 10]</td><td>yes</td><td>60</td></tr>
              <tr><td><code>base6(1)</code></td><td>[2, 3, 1]</td><td>yes</td><td>6</td></tr>
            </table>
            <pre><code>manual: 24
A: vol(2)(3)(4)
  have [2] -&gt; need 3 , wait
  have [2,3] -&gt; need 3 , wait
  have [2,3,4] -&gt; call volume
A = 24
B: vol(2, 3)(4)
  have [2,3] -&gt; need 3 , wait
  have [2,3,4] -&gt; call volume
B = 24
C: reuse a partial
  have [2,3] -&gt; need 3 , wait
  have [2,3,10] -&gt; call volume
  have [2,3,1] -&gt; call volume
C = 60 6</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> The stop condition uses <code>fn.length</code>, the number
              of declared parameters. That's the whole trick, and also its weak spot (next
              example).</li>
              <li><strong>②</strong> Not enough yet: return a closure that remembers
              <code>args</code>. When called, it calls <code>curried</code> again with old +
              new arguments. A new array each time, so partials never interfere.</li>
              <li><strong>③</strong> <code>base6</code> holds <code>[2, 3]</code>. Calling it
              twice with different heights works because <code>...args, ...more</code> builds
              a fresh array each call.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Call <code>vol()()(2)(3)(4)</code>. Empty calls just return another waiting
              function.</li>
              <li>Call <code>vol(2, 3, 4, 5)</code>. Extra arguments are passed along to
              <code>volume</code>, which ignores the 4th.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'fn.length pitfalls: defaults and rest parameters',
        code: `const curry = (fn) => {
  const curried = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curried(...args, ...more);
  return curried;
};

const withDefault = (a, b = 10) => a + b;
const withRest = (...nums) => nums.reduce((s, n) => s + n, 0);
const mixed = (a, b, ...rest) => [a, b, rest];

console.log('lengths:', withDefault.length, withRest.length, mixed.length); // ①

// ② withDefault: length 1, so ONE argument triggers the call
const cd = curry(withDefault);
console.log('cd(5):', cd(5));
try {
  cd(5)(1);
} catch (e) {
  console.log('cd(5)(1):', e.name, '(15 is not a function)');
}

// ③ withRest: length 0, so it's called immediately, even with no arguments
const cr = curry(withRest);
console.log('cr():', cr());
console.log('cr(1, 2, 3):', cr(1, 2, 3));

// ④ Fix: give the arity explicitly
const curryN = (n, fn) => {
  const curried = (...args) =>
    args.length >= n ? fn(...args) : (...more) => curried(...args, ...more);
  return curried;
};
const add3 = curryN(3, withRest);
console.log('curryN(3, withRest)(1)(2)(3):', add3(1)(2)(3));
const cd2 = curryN(2, withDefault);
console.log('curryN(2, withDefault)(5)(1):', cd2(5)(1));`,
        explain: `
          <details>
            <summary>The problem: <code>fn.length</code> is not "number of arguments it uses"</summary>
            <p><code>length</code> is the number of parameters <strong>before</strong> the first
            default or rest parameter. A generic <code>curry</code> trusts it blindly.</p>
            <table>
              <tr><th>Function</th><th><code>.length</code></th><th>Why</th></tr>
              <tr><td><code>(a, b = 10) =&gt; ...</code></td><td>1</td><td>counting stops at the first default</td></tr>
              <tr><td><code>(...nums) =&gt; ...</code></td><td>0</td><td>rest params are never counted</td></tr>
              <tr><td><code>(a, b, ...rest) =&gt; ...</code></td><td>2</td><td>only a and b</td></tr>
            </table>
            <p>Console: <code>lengths: 1 0 2</code></p>
          </details>
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Call</th><th>args vs needed</th><th>Result</th><th>Console</th></tr>
              <tr><td>② <code>cd(5)</code></td><td>1 ≥ 1</td><td>calls now: 5 + 10 (default)</td><td><code>cd(5): 15</code></td></tr>
              <tr><td><code>cd(5)(1)</code></td><td></td><td><code>15(1)</code></td><td><code>cd(5)(1): TypeError (15 is not a function)</code></td></tr>
              <tr><td>③ <code>cr()</code></td><td>0 ≥ 0</td><td>calls with no numbers</td><td><code>cr(): 0</code></td></tr>
              <tr><td><code>cr(1, 2, 3)</code></td><td>3 ≥ 0</td><td>works, but only all at once</td><td><code>cr(1, 2, 3): 6</code></td></tr>
              <tr><td>④ <code>add3(1)(2)(3)</code></td><td>waits until 3</td><td>6</td><td><code>curryN(3, withRest)(1)(2)(3): 6</code></td></tr>
              <tr><td><code>cd2(5)(1)</code></td><td>waits until 2</td><td>5 + 1</td><td><code>curryN(2, withDefault)(5)(1): 6</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Wrapping a function in a decorator like
            <code>logged(fn)</code> (which returns <code>(...args) =&gt; ...</code>) silently sets
            its length to 0. <code>curry(logged(add))</code> then calls <code>add</code>
            immediately with whatever it got. Curry first, decorate after, or use
            <code>curryN</code>.</div>
          </details>
        `,
      },
      {
        title: 'Why data-last argument order matters',
        code: `const curry = (fn) => {
  const curried = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curried(...args, ...more);
  return curried;
};
const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);

// Data-last: configuration first, data at the end
const map = curry((fn, xs) => xs.map(fn));
const filter = curry((pred, xs) => xs.filter(pred));
const prop = curry((key, obj) => obj[key]);

// Each partially-applied piece is a one-argument function: perfect for pipe
const activeNames = pipe(
  filter(prop('active')),
  map(prop('name')),
);

const users = [
  { name: 'Ana', active: true },
  { name: 'Ben', active: false },
  { name: 'Cy', active: true },
];
console.log('activeNames:', activeNames(users));

// Data-first: currying gives you the wrong thing to reuse
const mapDataFirst = curry((xs, fn) => xs.map(fn));
const overUsers = mapDataFirst(users); // "map over users with... something"
console.log('data-first:', overUsers(prop('name'))); // works, but can't go in a pipe`,
      },
    ],
    quiz: [
      {
        q: 'What is <code>((a, b = 2, c) =&gt; 0).length</code>?',
        options: ['3', '2', '1', '0'],
        answer: 2,
        why: 'length counts parameters before the first one with a default. Only a counts.',
      },
      {
        q: 'With the generic <code>curry</code>, which call does NOT return 6 for <code>curry((a, b, c) =&gt; a + b + c)</code>?',
        options: ['<code>f(1)(2)(3)</code>', '<code>f(1, 2)(3)</code>', '<code>f(1)(2, 3)</code>', '<code>f(1)(2)</code>'],
        answer: 3,
        why: 'f(1)(2) has only two arguments, so it returns a function still waiting for c.',
      },
      {
        q: 'Why do FP libraries put the data argument last (<code>map(fn, xs)</code>)?',
        options: [
          'It is faster',
          'So partially applying the configuration yields a reusable data → result function for pipe/compose',
          'JavaScript requires it',
          'To match Array.prototype.map',
        ],
        answer: 1,
        why: 'map(fn) becomes xs =&gt; mapped, which is exactly the one-argument shape that pipelines need.',
      },
      {
        q: '<code>curry((...xs) =&gt; xs.length)</code> is called as <code>f(1)</code>. What happens?',
        options: [
          'Returns a function waiting for more',
          'Returns 1 immediately because length is 0',
          'Throws',
          'Returns 0',
        ],
        answer: 1,
        why: 'A rest-only function has length 0, so any call satisfies args.length &gt;= 0 and runs it at once.',
      },
      {
        q: 'What is the difference between <code>(a, b) =&gt; ...</code> and its curried form?',
        options: [
          'The curried form is always faster',
          'The curried form takes one argument at a time, returning a function until all are supplied',
          'They are identical',
          'The curried form cannot be called with all arguments',
        ],
        answer: 1,
        why: 'Currying changes the shape from one call with N arguments to a chain of unary calls (JS-style curry also allows several at once).',
      },
    ],
    exercise: {
      task: `<p>Implement <code>curry(fn)</code> using <code>fn.length</code> so that all of
      <code>f(1)(2)(3)</code>, <code>f(1, 2)(3)</code>, <code>f(1)(2, 3)</code> and
      <code>f(1, 2, 3)</code> work, and a partial can be reused safely. Then build
      <code>startsWith</code> as a curried, data-last function.</p>`,
      starter: `const curry = (fn) => {
  // TODO: collect args until args.length >= fn.length
  return fn;
};

const join3 = (a, b, c) => a + '-' + b + '-' + c;

// TODO: curried, data-last: startsWith(prefix)(str) -> boolean
const startsWith = curry((prefix, str) => false);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const j = curry(join3);
const safe = (f) => {
  try {
    return f();
  } catch (e) {
    return e.name;
  }
};
check('one at a time', safe(() => j('a')('b')('c')), 'a-b-c');
check('two then one', safe(() => j('a', 'b')('c')), 'a-b-c');
check('one then two', safe(() => j('a')('b', 'c')), 'a-b-c');
check('all at once', safe(() => j('a', 'b', 'c')), 'a-b-c');
const ja = safe(() => j('x'));
check('reusable partial', safe(() => [ja('1', '2'), ja('3', '4')]), ['x-1-2', 'x-3-4']);
check('startsWith in filter',
  safe(() => ['api/a', 'web/b', 'api/c'].filter(startsWith('api/'))), ['api/a', 'api/c']);`,
      hint: 'const curried = (...args) => args.length >= fn.length ? fn(...args) : (...more) => curried(...args, ...more); return curried. startsWith body: str.startsWith(prefix).',
      solution: `const curry = (fn) => {
  const curried = (...args) =>
    args.length >= fn.length ? fn(...args) : (...more) => curried(...args, ...more);
  return curried;
};

const join3 = (a, b, c) => a + '-' + b + '-' + c;

const startsWith = curry((prefix, str) => str.startsWith(prefix));

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const j = curry(join3);
const safe = (f) => {
  try {
    return f();
  } catch (e) {
    return e.name;
  }
};
check('one at a time', safe(() => j('a')('b')('c')), 'a-b-c');
check('two then one', safe(() => j('a', 'b')('c')), 'a-b-c');
check('one then two', safe(() => j('a')('b', 'c')), 'a-b-c');
check('all at once', safe(() => j('a', 'b', 'c')), 'a-b-c');
const ja = safe(() => j('x'));
check('reusable partial', safe(() => [ja('1', '2'), ja('3', '4')]), ['x-1-2', 'x-3-4']);
check('startsWith in filter',
  safe(() => ['api/a', 'web/b', 'api/c'].filter(startsWith('api/'))), ['api/a', 'api/c']);`,
    },
  },

  // ───────────────────────────────────────────────────────────── partial-application
  {
    id: 'partial-application',
    section: 'Function Toolkit',
    title: 'Partial Application',
    explain: `
      <p><strong>Partial application</strong> fixes <em>some</em> arguments of a function now,
      producing a function that takes the rest later. It's related to currying, but not the
      same:</p>
      <table>
        <tr><th></th><th>Currying</th><th>Partial application</th></tr>
        <tr><td>What it is</td><td>A <em>transformation</em> of a function into a chain of
        unary functions</td><td>An <em>act</em>: supply some arguments, get a function for the
        rest</td></tr>
        <tr><td>Result of <code>f(a)</code></td><td>Waits one argument at a time until all are
        given</td><td>A function of all the <em>remaining</em> arguments at once</td></tr>
        <tr><td>JS built-in</td><td>none</td><td><code>fn.bind(thisArg, ...args)</code></td></tr>
      </table>
      <p>A curried function makes partial application effortless (every call is one), but you
      can partially apply <em>any</em> function without currying it.</p>

      <h3>A placeholder-free <code>partial</code></h3>
      <pre><code>const partial = (fn, ...preset) =&gt; (...later) =&gt;
  fn(...preset, ...later);
const partialRight = (fn, ...preset) =&gt; (...later) =&gt;
  fn(...later, ...preset);</code></pre>
      <p>Libraries like Ramda add placeholders (<code>R.__</code>) to skip positions. You
      rarely need them if your functions are designed with "config first, data last".</p>

      <h3><code>bind</code></h3>
      <p><code>fn.bind(thisArg, a, b)</code> partially applies and fixes <code>this</code>.
      For plain functions pass <code>null</code> as <code>thisArg</code>. Bonus: bound functions
      have a correct <code>length</code> (original minus preset).</p>
      <div class="tip">Partial application is "configuration as code": create
      <code>logWarnDb</code>, <code>fetchFromApi</code>, <code>formatEUR</code> once, then pass
      those small, focused functions around instead of threading config through every
      call.</div>
    `,
    examples: [
      {
        title: 'partial, partialRight and bind',
        code: `const partial = (fn, ...preset) => (...later) => fn(...preset, ...later);
const partialRight = (fn, ...preset) => (...later) => fn(...later, ...preset);

function greet(greeting, punctuation, name) {
  return greeting + ', ' + name + punctuation;
}

// Fix the first two arguments, supply the last later
const hello = partial(greet, 'Hello', '!');
console.log(hello('Ana'));
console.log(hello('Ben'));

// partialRight fixes arguments at the END
const divide = (a, b) => a / b;
const half = partialRight(divide, 2);
console.log('half(10):', half(10));

// bind: built-in partial application (null = no meaningful this)
const hi = greet.bind(null, 'Hi', '?');
console.log(hi('Cy'));
console.log('lengths: greet', greet.length, '| bind', hi.length, '| partial', hello.length);

// Unlike curry, the remaining args come in ONE call
const g = partial(greet, 'Hey');
console.log(g('...', 'Dee')); // both remaining args at once
console.log(typeof g('...')); // not a function: called with name undefined`,
      },
      {
        title: 'Configuring functions: loggers and formatters',
        code: `const partial = (fn, ...preset) => (...later) => fn(...preset, ...later);

// General function, config first
const log = (level, scope, message) => {
  const line = '[' + level + '] ' + scope + ': ' + message;
  if (level === 'WARN') console.warn(line);
  else console.log(line);
};

const dbInfo = partial(log, 'INFO', 'db');
const dbWarn = partial(log, 'WARN', 'db');
const httpInfo = partial(log, 'INFO', 'http');

dbInfo('connected');
httpInfo('GET /users 200');
dbWarn('slow query (1200ms)');

// Formatters: preset Intl options once
const formatMoney = (currency, locale, amount) =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);

const eur = partial(formatMoney, 'EUR', 'de-DE');
const usd = partial(formatMoney, 'USD', 'en-US');
console.log([12.5, 1000].map((n) => eur(n)));
console.log([12.5, 1000].map((n) => usd(n)));

// bind also fixes \`this\` for methods
const counter = {
  step: 5,
  add(n) {
    return n + this.step;
  },
};
const addStep = counter.add.bind(counter);
console.log('bound method:', [1, 2].map(addStep));`,
      },
    ],
    quiz: [
      {
        q: 'Given <code>partial = (fn, ...p) =&gt; (...l) =&gt; fn(...p, ...l)</code>, what is <code>partial((a, b, c) =&gt; a + b + c, 1)(2, 3)</code>?',
        options: ['6', 'A function', 'NaN', '3'],
        answer: 0,
        why: 'The partial supplies 1; the returned function takes all remaining arguments in one call: 1 + 2 + 3.',
      },
      {
        q: 'What is the key difference between currying and partial application?',
        options: [
          'They are the same thing',
          'Currying converts a function into a chain of unary calls; partial application fixes some arguments and returns a function of the rest',
          'Partial application only works with bind',
          'Currying only works with two arguments',
        ],
        answer: 1,
        why: 'Currying is a transformation of the function; partial application is supplying some arguments. Curried functions make partial application trivial.',
      },
      {
        q: 'What does <code>fn.bind(null, x)</code> do?',
        options: [
          'Calls fn with x immediately',
          'Returns a new function with this = null and first argument x preset',
          'Deletes fn\'s first parameter',
          'Throws in strict mode',
        ],
        answer: 1,
        why: 'bind returns a new function. It fixes this and any leading arguments; nothing is called yet.',
      },
      {
        q: '<code>half = partialRight(divide, 2)</code> with <code>divide = (a, b) =&gt; a / b</code>. What is <code>half(10)</code>?',
        options: ['0.2', '5', '20', 'NaN'],
        answer: 1,
        why: 'partialRight appends the preset: divide(10, 2) = 5.',
      },
    ],
    exercise: {
      task: `<p>Implement <code>partial</code> and <code>partialRight</code>, then use them to
      create:</p>
      <ul>
        <li><code>tagLine</code>: wraps text in an HTML tag with <code>wrap(tag, text)</code>
        preset to <code>'li'</code>.</li>
        <li><code>clampPercent</code>: <code>clamp(value, min, max)</code> with
        <code>min = 0, max = 100</code> preset on the right.</li>
      </ul>`,
      starter: `const partial = (fn, ...preset) => {
  // TODO
  return fn;
};
const partialRight = (fn, ...preset) => {
  // TODO
  return fn;
};

const wrap = (tag, text) => '<' + tag + '>' + text + '</' + tag + '>';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const tagLine = partial(wrap /* TODO */);
const clampPercent = partialRight(clamp /* TODO */);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('tagLine', ['a', 'b'].map((t) => tagLine(t)), ['<li>a</li>', '<li>b</li>']);
check('clamp high', clampPercent(150), 100);
check('clamp low', clampPercent(-5), 0);
check('clamp mid', clampPercent(42), 42);
check('partial passes all remaining', partial(Math.max, 1)(5, 3), 5);`,
      hint: 'partial: (...later) => fn(...preset, ...later). partialRight: (...later) => fn(...later, ...preset). Then partial(wrap, "li") and partialRight(clamp, 0, 100).',
      solution: `const partial = (fn, ...preset) => (...later) => fn(...preset, ...later);
const partialRight = (fn, ...preset) => (...later) => fn(...later, ...preset);

const wrap = (tag, text) => '<' + tag + '>' + text + '</' + tag + '>';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const tagLine = partial(wrap, 'li');
const clampPercent = partialRight(clamp, 0, 100);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('tagLine', ['a', 'b'].map((t) => tagLine(t)), ['<li>a</li>', '<li>b</li>']);
check('clamp high', clampPercent(150), 100);
check('clamp low', clampPercent(-5), 0);
check('clamp mid', clampPercent(42), 42);
check('partial passes all remaining', partial(Math.max, 1)(5, 3), 5);`,
    },
  },

  // ───────────────────────────────────────────────────────────── compose-pipe
  {
    id: 'compose-pipe',
    section: 'Function Toolkit',
    title: 'compose & pipe',
    explain: `
      <p><strong>Composition</strong> builds a new function by chaining existing ones: the
      output of one becomes the input of the next. It's the FP equivalent of a Unix pipe
      (<code>cat file | grep x | sort</code>).</p>
      <pre><code>// left → right
const pipe = (...fns) =&gt; (x) =&gt; fns.reduce((v, f) =&gt; f(v), x);

// right → left
const compose = (...fns) =&gt; (x) =&gt; fns.reduceRight((v, f) =&gt; f(v), x);</code></pre>
      <ul>
        <li><code>pipe(f, g, h)(x)</code> = <code>h(g(f(x)))</code>: reads in execution order.
        Most JS code uses this.</li>
        <li><code>compose(h, g, f)(x)</code> = <code>h(g(f(x)))</code>: matches maths notation
        (h ∘ g ∘ f). Same result, arguments listed in reverse.</li>
      </ul>

      <h3>Rules for composable functions</h3>
      <ul>
        <li>Each stage takes <strong>one argument</strong> (the first stage of
        <code>pipe</code> may take more if you implement it that way).</li>
        <li>Each stage's output type must match the next stage's input.</li>
        <li>Use curried, data-last helpers (<code>map(fn)</code>, <code>filter(pred)</code>) to
        turn multi-argument functions into stages.</li>
      </ul>

      <h3>Debugging with <code>tap</code></h3>
      <p>A pipeline hides intermediate values. <code>tap(fn)</code> runs a side effect (like
      logging) and returns its input unchanged, so you can drop it between any two stages.</p>
      <pre><code>const tap = (fn) =&gt; (x) =&gt; { fn(x); return x; };
pipe(trim, tap(console.log), toUpper)</code></pre>

      <div class="warn">You may have seen <code>x |&gt; f |&gt; g</code>. The pipeline operator
      is a TC39 <strong>proposal</strong> (stage 2, Hack-style with a <code>%</code> topic
      token). It is not part of JavaScript and doesn't run in any browser without a
      transpiler. Use a <code>pipe</code> function.</div>
    `,
    examples: [
      {
        title: 'pipe vs compose, with a trace through each stage',
        code: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

const trim = (s) => s.trim();
const lower = (s) => s.toLowerCase();
const words = (s) => s.split(/\\s+/);
const slug = (ws) => ws.join('-');

const slugify = pipe(trim, lower, words, slug); // ① read left to right
const slugify2 = compose(slug, words, lower, trim); // ② same thing, right to left

console.log('pipe:', slugify('  Hello Functional World  '));
console.log('compose:', slugify2('  Hello Functional World  '));

// A tracing pipe: log the value after every stage
const tracePipe = (...fns) => (x) =>
  fns.reduce((v, f, i) => {
    const out = f(v);
    console.log('  stage ' + (i + 1) + ' ' + f.name + ':', JSON.stringify(v), '->',
      JSON.stringify(out));
    return out;
  }, x);

console.log('trace:');
tracePipe(trim, lower, words, slug)('  Hello Functional World  ');

// Order matters: swap two stages and the types no longer line up
try {
  pipe(trim, words, lower, slug)('Hi There'); // ③
} catch (e) {
  console.log('wrong order:', e.name);
}`,
        explain: `
          <details>
            <summary>The problem: nested calls read inside-out</summary>
            <p>Without composition you write <code>slug(words(lower(trim(s))))</code>. You
            have to read from the innermost call outward, and adding a step means finding the
            right pair of parentheses. <code>pipe</code> turns that into a flat list in
            execution order.</p>
          </details>
          <details>
            <summary>Step by step: the value flowing through the pipe</summary>
            <table>
              <tr><th>Stage</th><th>Function</th><th>Input</th><th>Output</th></tr>
              <tr><td>start</td><td colspan="3"><code>reduce</code> initial value = the input string</td></tr>
              <tr><td>1</td><td><code>trim</code></td><td><code>"  Hello Functional World  "</code></td><td><code>"Hello Functional World"</code></td></tr>
              <tr><td>2</td><td><code>lower</code></td><td><code>"Hello Functional World"</code></td><td><code>"hello functional world"</code></td></tr>
              <tr><td>3</td><td><code>words</code></td><td><code>"hello functional world"</code></td><td><code>["hello","functional","world"]</code> (string → array!)</td></tr>
              <tr><td>4</td><td><code>slug</code></td><td><code>["hello","functional","world"]</code></td><td><code>"hello-functional-world"</code></td></tr>
            </table>
            <pre><code>pipe: hello-functional-world
compose: hello-functional-world
trace:
  stage 1 trim: "  Hello Functional World  " -&gt; "Hello Functional World"
  stage 2 lower: "Hello Functional World" -&gt; "hello functional world"
  stage 3 words: "hello functional world" -&gt; ["hello","functional","world"]
  stage 4 slug: ["hello","functional","world"] -&gt; "hello-functional-world"
wrong order: TypeError</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>pipe</code> uses <code>reduce</code>: the
              accumulator is the current value, each step applies the next function.</li>
              <li><strong>②</strong> <code>compose</code> uses <code>reduceRight</code>, so the
              <em>last</em> function listed runs first. Same pipeline, mirrored list.</li>
              <li><strong>③</strong> <code>words</code> returns an array, and
              <code>lower</code> calls <code>.toLowerCase()</code>, which arrays don't have:
              <code>TypeError</code>. Composition is only valid when each output type fits the
              next input type.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add a stage <code>(ws) =&gt; ws.filter((w) =&gt; w.length &gt; 5)</code>
              between <code>words</code> and <code>slug</code> in <code>tracePipe</code>. The
              trace shows it as <code>stage 4 :</code> because an inline arrow passed directly
              as an argument has no name. Give it one: <code>const longOnly = ...</code>.</li>
              <li>Call <code>pipe()('x')</code> with no functions: reduce returns the initial
              value, so it's the identity function.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Debugging a pipeline with tap',
        code: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const tap = (fn) => (x) => {
  fn(x);
  return x; // pass the value through unchanged
};
const map = (fn) => (xs) => xs.map(fn);
const filter = (pred) => (xs) => xs.filter(pred);
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

const orders = [
  { total: 120, status: 'paid' },
  { total: 80, status: 'refunded' },
  { total: 50, status: 'paid' },
];

// "Why is the revenue wrong?" Insert taps to look inside.
const revenue = pipe(
  filter((o) => o.status === 'paid'),
  tap((xs) => console.log('after filter:', xs.length, 'orders')),
  map((o) => o.total),
  tap((xs) => console.log('after map:', xs)),
  sum,
);

console.log('revenue:', revenue(orders));

// tap's return value is ignored: this does NOT change the value
const sneaky = pipe(
  tap((n) => n * 100),
  (n) => n + 1,
);
console.log('sneaky(1):', sneaky(1));`,
      },
    ],
    quiz: [
      {
        q: 'What is <code>pipe(f, g, h)(x)</code>?',
        options: ['<code>f(g(h(x)))</code>', '<code>h(g(f(x)))</code>', '<code>[f(x), g(x), h(x)]</code>', '<code>f(x) + g(x) + h(x)</code>'],
        answer: 1,
        why: 'pipe runs left to right: f first, then g on its result, then h.',
      },
      {
        q: 'Which built-in makes <code>compose</code> run the last listed function first?',
        options: ['<code>reduce</code>', '<code>reduceRight</code>', '<code>reverse</code>', '<code>flatMap</code>'],
        answer: 1,
        why: 'compose = fns.reduceRight((v, f) =&gt; f(v), x). Starting from the right gives maths-style h ∘ g ∘ f order.',
      },
      {
        q: 'What does <code>tap(fn)</code> return when called with x?',
        options: ['fn(x)', 'x, unchanged', 'undefined', 'A promise'],
        answer: 1,
        why: 'tap runs fn for its side effect and passes x through, so it can be inserted anywhere in a pipeline without changing results.',
      },
      {
        q: 'Can you use <code>value |&gt; fn</code> in today\'s browsers?',
        options: [
          'Yes, since ES2022',
          'Yes, but only in modules',
          'No, the pipeline operator is still a TC39 proposal',
          'Only in Node.js',
        ],
        answer: 2,
        why: 'The pipeline operator has been a proposal for years (Hack-style, stage 2). It needs a transpiler; use a pipe function instead.',
      },
    ],
    exercise: {
      task: `<p>Implement <code>pipe</code> with <code>reduce</code> and <code>compose</code>
      with <code>reduceRight</code>. Then build <code>initials</code> with <code>pipe</code>:
      <code>"ada lovelace"</code> → <code>"A.L."</code> (split into words, take the first
      letter of each, uppercase, add a dot after each, join).</p>`,
      starter: `const pipe = (...fns) => (x) => {
  // TODO
  return x;
};
const compose = (...fns) => (x) => {
  // TODO
  return x;
};

const split = (s) => s.split(' ');
const firstLetters = (ws) => ws.map((w) => w[0]);
const upper = (xs) => xs.map((c) => c.toUpperCase());
const dotted = (xs) => xs.map((c) => c + '.');
const join = (xs) => xs.join('');

const initials = pipe(/* TODO */);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const inc = (n) => n + 1;
const dbl = (n) => n * 2;
check('pipe order', pipe(inc, dbl)(5), 12);
check('compose order', compose(inc, dbl)(5), 11);
check('empty pipe is identity', pipe()(7), 7);
check('initials', initials('ada lovelace'), 'A.L.');`,
      hint: 'pipe: fns.reduce((v, f) => f(v), x). compose: fns.reduceRight((v, f) => f(v), x). initials = pipe(split, firstLetters, upper, dotted, join).',
      solution: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const compose = (...fns) => (x) => fns.reduceRight((v, f) => f(v), x);

const split = (s) => s.split(' ');
const firstLetters = (ws) => ws.map((w) => w[0]);
const upper = (xs) => xs.map((c) => c.toUpperCase());
const dotted = (xs) => xs.map((c) => c + '.');
const join = (xs) => xs.join('');

const initials = pipe(split, firstLetters, upper, dotted, join);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const inc = (n) => n + 1;
const dbl = (n) => n * 2;
check('pipe order', pipe(inc, dbl)(5), 12);
check('compose order', compose(inc, dbl)(5), 11);
check('empty pipe is identity', pipe()(7), 7);
check('initials', initials('ada lovelace'), 'A.L.');`,
    },
  },

  // ───────────────────────────────────────────────────────────── point-free
  {
    id: 'point-free',
    section: 'Function Toolkit',
    title: 'Point-Free Style',
    explain: `
      <p><strong>Point-free</strong> (or "tacit") style defines functions without naming
      their arguments (the "points"). Instead of describing what happens to the data, you
      combine functions:</p>
      <pre><code>// pointed
const getNames = (users) =&gt; users.map((u) =&gt; u.name);
// point-free
const getNames = map(prop('name'));</code></pre>

      <h3>When it clarifies</h3>
      <ul>
        <li>Passing a named function directly: <code>xs.filter(isActive)</code> instead of
        <code>xs.filter((x) =&gt; isActive(x))</code>.</li>
        <li>Pipelines of well-named steps: <code>pipe(trim, toLower, slugify)</code>.</li>
        <li>It removes noise variables like <code>x</code>, <code>u</code>, <code>item</code>
        that carry no meaning.</li>
      </ul>

      <h3>When it obscures</h3>
      <ul>
        <li>When you need <code>flip</code>, <code>converge</code>, <code>useWith</code> and
        three nested <code>compose</code>s to avoid writing one arrow function.</li>
        <li>When the function you pass receives <strong>more arguments than you think</strong>
        (the <code>parseInt</code> trap).</li>
        <li>When the function is a <strong>method that needs <code>this</code></strong>:
        <code>xs.map(obj.method)</code> detaches it.</li>
      </ul>

      <div class="warn">Array callbacks receive <code>(element, index, array)</code>.
      Passing a function point-free means it gets <em>all three</em>. That's harmless for
      <code>Number</code> or <code>String</code>, which ignore extra arguments, and a bug for
      <code>parseInt(string, radix)</code>.</div>
      <div class="tip">Rule of thumb: go point-free when the result reads like a sentence. If
      you have to stop and decode it, write the arrow.</div>
    `,
    examples: [
      {
        title: "The ['1','2','3'].map(parseInt) trap",
        code: `const show = (xs) => '[' + xs.join(', ') + ']'; // NaN-friendly printing

console.log('map(parseInt):', show(['1', '2', '3'].map(parseInt)));

// What map actually passes: (element, index, array)
['1', '2', '3'].map((el, i) => {
  const out = parseInt(el, i);
  console.log('  parseInt(' + JSON.stringify(el) + ', ' + i + ') =', String(out));
  return 0;
});

console.log('10s:', show(['10', '10', '10', '10'].map(parseInt)));

// Fixes
const unary = (fn) => (x) => fn(x); // ① only ever pass ONE argument
console.log('arrow fix:', show(['1', '2', '3'].map((s) => parseInt(s, 10)))); // ②
console.log('unary fix:', show(['1', '2', '3'].map(unary(parseInt))));
console.log('Number fix:', show(['1', '2', '3'].map(Number))); // ③`,
        explain: `
          <details>
            <summary>The problem: map calls your function with 3 arguments</summary>
            <p><code>.map(parseInt)</code> looks like "parse each string". But map calls
            <code>parseInt(element, index, array)</code>, and <code>parseInt</code>'s second
            parameter is the <strong>radix</strong> (number base). So the index is used as the
            base.</p>
          </details>
          <details>
            <summary>Step by step: each call</summary>
            <table>
              <tr><th>Element</th><th>Index = radix</th><th>Meaning</th><th>Result</th></tr>
              <tr><td>'1'</td><td>0</td><td>radix 0 means "not given" → base 10</td><td>1</td></tr>
              <tr><td>'2'</td><td>1</td><td>base 1 is invalid (valid: 2 to 36)</td><td>NaN</td></tr>
              <tr><td>'3'</td><td>2</td><td>base 2 only has digits 0 and 1; '3' isn't one</td><td>NaN</td></tr>
            </table>
            <p>With <code>'10'</code> four times: base 10 → 10, base 1 → NaN, base 2 → 2
            (binary 10), base 3 → 3.</p>
            <pre><code>map(parseInt): [1, NaN, NaN]
  parseInt("1", 0) = 1
  parseInt("2", 1) = NaN
  parseInt("3", 2) = NaN
10s: [10, NaN, 2, 3]
arrow fix: [1, 2, 3]
unary fix: [1, 2, 3]
Number fix: [1, 2, 3]</code></pre>
            <p>(The example prints with <code>join</code> because <code>JSON.stringify</code>
            would turn <code>NaN</code> into <code>null</code>.)</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>unary</code> is a combinator that throws away every
              argument except the first. <code>parseInt(x)</code> with no radix parses base 10
              (for strings without a <code>0x</code> prefix).</li>
              <li><strong>②</strong> The explicit arrow is the clearest fix and lets you state
              the radix.</li>
              <li><strong>③</strong> <code>Number</code> ignores extra arguments. Note it's
              stricter: <code>Number('12px')</code> is NaN while
              <code>parseInt('12px', 10)</code> is 12.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Try <code>['1.5', '2.5'].map(parseFloat)</code>. It works, because
              <code>parseFloat</code> takes only one parameter.</li>
              <li>Try <code>['a', 'b'].map(String.prototype.toUpperCase.call)</code>... it
              throws. Point-free with methods is fragile.</li>
            </ul>
            <div class="warn">The same trap hits any function with optional parameters:
            <code>dates.map(formatDate)</code> when <code>formatDate(date, locale)</code>
            receives the index as <code>locale</code>.</div>
          </details>
        `,
      },
      {
        title: 'Clarifies vs obscures',
        code: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const map = (fn) => (xs) => xs.map(fn);
const filter = (pred) => (xs) => xs.filter(pred);
const prop = (key) => (obj) => obj[key];

const users = [
  { name: 'ana', age: 31, active: true },
  { name: 'ben', age: 17, active: true },
  { name: 'cy', age: 45, active: false },
];

// ✅ Clarifies: named steps, reads like a sentence
const isActive = prop('active');
const isAdult = (u) => u.age >= 18;
const activeAdultNames = pipe(filter(isActive), filter(isAdult), map(prop('name')));
console.log('clear:', activeAdultNames(users));

// ❌ Obscures: point-free for its own sake
const flip = (fn) => (a) => (b) => fn(b)(a);
const gte = (a) => (b) => a >= b;
const both = (f, g) => (x) => f(x) && g(x);
const isAdult2 = pipe(prop('age'), flip(gte)(18));
const cryptic = pipe(filter(both(prop('active'), isAdult2)), map(prop('name')));
console.log('cryptic:', cryptic(users)); // same answer, much harder to read

// ❌ Point-free method reference loses \`this\`
const formatter = {
  prefix: '@',
  format(name) {
    return this.prefix + name;
  },
};
try {
  console.log(users.map(prop('name')).map(formatter.format));
} catch (e) {
  console.log('detached method:', e.name);
}
console.log('bound:', users.map(prop('name')).map(formatter.format.bind(formatter)));`,
      },
    ],
    quiz: [
      {
        q: "What is <code>['1', '2', '3'].map(parseInt)</code>?",
        options: ['[1, 2, 3]', '[1, NaN, NaN]', '[NaN, NaN, NaN]', '[1, 2, NaN]'],
        answer: 1,
        why: 'map passes the index as parseInt\'s radix: parseInt("1", 0) = 1, parseInt("2", 1) = NaN (invalid base), parseInt("3", 2) = NaN ("3" is not a binary digit).',
      },
      {
        q: 'Why does <code>parseInt("1", 0)</code> return 1?',
        options: [
          'Radix 0 is treated as "not specified", so base 10 is used',
          'Base 0 means unary',
          'It actually returns NaN',
          '0 is coerced to 1',
        ],
        answer: 0,
        why: 'The spec treats a radix of 0 (or undefined) as missing and defaults to 10 (or 16 for "0x" strings).',
      },
      {
        q: 'Which is a safe point-free replacement for <code>xs.map(s =&gt; parseInt(s, 10))</code>?',
        options: [
          '<code>xs.map(parseInt)</code>',
          '<code>xs.map(unary(parseInt))</code> where unary = fn =&gt; x =&gt; fn(x)',
          '<code>xs.map(parseInt.bind(10))</code>',
          '<code>xs.map(parseInt(10))</code>',
        ],
        answer: 1,
        why: 'unary drops the index and array arguments. bind(10) sets this, not the radix, and parseInt(10) is a number, not a function.',
      },
      {
        q: 'When does point-free style usually hurt readability?',
        options: [
          'When passing a named predicate to filter',
          'When you need several combinators (flip, converge...) just to avoid naming one argument',
          'When using pipe with named steps',
          'Never',
        ],
        answer: 1,
        why: 'Point-free is a tool for clarity. If the tacit version needs decoding, the pointed arrow is better code.',
      },
    ],
    exercise: {
      task: `<p>Write <code>unary(fn)</code>, then define these point-free (no arrow with a
      named data parameter at the top level), using the helpers given:</p>
      <ul>
        <li><code>toInts</code>: array of strings → array of integers (use
        <code>unary(parseInt)</code>).</li>
        <li><code>lengths</code>: array of strings → array of their lengths.</li>
        <li><code>totalLength</code>: <code>pipe</code> of <code>lengths</code> and
        <code>sum</code>.</li>
      </ul>`,
      starter: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const map = (fn) => (xs) => xs.map(fn);
const prop = (key) => (obj) => obj[key];
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

const unary = (fn) => {
  // TODO: return a function that calls fn with only its first argument
  return fn;
};

const toInts = map(parseInt); // TODO: fix the trap
const lengths = (xs) => []; // TODO: point-free with map and prop
const totalLength = (xs) => 0; // TODO: point-free with pipe

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('toInts', toInts(['7', '8', '9', '10']), [7, 8, 9, 10]);
check('unary drops extras', unary((...args) => args.length)(1, 2, 3), 1);
check('lengths', lengths(['a', 'bbb', 'cc']), [1, 3, 2]);
check('totalLength', totalLength(['a', 'bbb', 'cc']), 6);`,
      hint: "unary = fn => x => fn(x). toInts = map(unary(parseInt)). lengths = map(prop('length')). totalLength = pipe(lengths, sum).",
      solution: `const pipe = (...fns) => (x) => fns.reduce((v, f) => f(v), x);
const map = (fn) => (xs) => xs.map(fn);
const prop = (key) => (obj) => obj[key];
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

const unary = (fn) => (x) => fn(x);

const toInts = map(unary(parseInt));
const lengths = map(prop('length'));
const totalLength = pipe(lengths, sum);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('toInts', toInts(['7', '8', '9', '10']), [7, 8, 9, 10]);
check('unary drops extras', unary((...args) => args.length)(1, 2, 3), 1);
check('lengths', lengths(['a', 'bbb', 'cc']), [1, 3, 2]);
check('totalLength', totalLength(['a', 'bbb', 'cc']), 6);`,
    },
  },

  // ───────────────────────────────────────────────────────────── combinators
  {
    id: 'combinators',
    section: 'Function Toolkit',
    title: 'Useful Combinators',
    explain: `
      <p>A <strong>combinator</strong> is a tiny higher-order function that builds new
      functions only from the functions you give it, with no outside state. They're the
      "glue" that makes pipelines and point-free code possible. Each is one or two lines.</p>
      <table>
        <tr><th>Name</th><th>Definition</th><th>Use</th></tr>
        <tr><td><code>identity</code></td><td><code>x =&gt; x</code></td><td>Default callback; "do nothing" stage; <code>filter(identity)</code> drops falsy values</td></tr>
        <tr><td><code>constant</code></td><td><code>x =&gt; () =&gt; x</code></td><td>A function that ignores its input: <code>map(constant(0))</code></td></tr>
        <tr><td><code>tap</code></td><td><code>fn =&gt; x =&gt; (fn(x), x)</code></td><td>Side effect, return input (logging in pipelines)</td></tr>
        <tr><td><code>flip</code></td><td><code>fn =&gt; (a, b) =&gt; fn(b, a)</code></td><td>Swap argument order to make a function data-last</td></tr>
        <tr><td><code>not</code> / <code>complement</code></td><td><code>pred =&gt; (...a) =&gt; !pred(...a)</code></td><td><code>filter(not(isEmpty))</code></td></tr>
        <tr><td><code>converge</code></td><td><code>(after, fns) =&gt; x =&gt; after(...fns.map(f =&gt; f(x)))</code></td><td>Feed one input to several functions, combine results</td></tr>
        <tr><td><code>once</code></td><td>closure + flag</td><td>Run initialisation only the first time</td></tr>
      </table>
      <div class="tip">Names vary between libraries: Ramda has <code>R.identity</code>,
      <code>R.always</code> (constant), <code>R.tap</code>, <code>R.flip</code>,
      <code>R.complement</code>, <code>R.converge</code>, <code>R.once</code>. Classic
      combinatory logic calls identity <strong>I</strong> and constant <strong>K</strong>.</div>
      <div class="warn"><code>tap</code> and <code>once</code> exist for side effects/state.
      They're useful, but they are the impure edges of your toolkit: keep them visible.</div>
    `,
    examples: [
      {
        title: 'identity, constant, tap, flip, not',
        code: `const identity = (x) => x;
const constant = (x) => () => x;
const tap = (fn) => (x) => {
  fn(x);
  return x;
};
const flip = (fn) => (a, b, ...rest) => fn(b, a, ...rest);
const not = (pred) => (...args) => !pred(...args);

// identity: a neutral default, and a "truthy" filter
console.log('compact:', [0, 'a', '', null, 'b', undefined].filter(identity));
const transform = (fn = identity) => (xs) => xs.map(fn);
console.log('default transform:', transform()([1, 2]));

// constant: ignore input
console.log('reset all:', [5, 6, 7].map(constant(0)));

// tap: peek without changing
const result = [1, 2, 3].map(tap((n) => console.log('  saw', n)));
console.log('tap result:', result);

// flip: swap the first two arguments
const minus = (a, b) => a - b;
console.log('minus(10, 3):', minus(10, 3), '| flip(minus)(10, 3):', flip(minus)(10, 3));
const concat = (a, b) => a + b;
console.log('flip concat:', ['x', 'y'].map((s) => flip(concat)(s, '>')));

// not: invert a predicate
const isBlank = (s) => s.trim() === '';
console.log('non-blank:', ['a', ' ', '', 'b'].filter(not(isBlank)));`,
      },
      {
        title: 'converge and once',
        code: `// converge: one input -> several branches -> one combiner
const converge = (after, branches) => (x) => after(...branches.map((f) => f(x)));

const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const length = (xs) => xs.length;
const divide = (a, b) => a / b;

const average = converge(divide, [sum, length]);
console.log('average:', average([2, 4, 9]));

const describe = converge((min, max, n) => n + ' values from ' + min + ' to ' + max, [
  (xs) => Math.min(...xs),
  (xs) => Math.max(...xs),
  length,
]);
console.log(describe([7, 3, 9]));

// once: first call runs, later calls return the cached result
const once = (fn) => {
  let called = false;
  let value;
  return (...args) => {
    if (!called) {
      called = true;
      value = fn(...args);
    }
    return value;
  };
};

const connect = once((url) => {
  console.log('connecting to', url, '(expensive!)');
  return { url, id: 42 };
});
console.log('1:', connect('db://a'));
console.log('2:', connect('db://b')); // ignored: returns the first connection`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>[0, 1, "", "x"].filter(identity)</code> return?',
        options: ['[0, 1, "", "x"]', '[1, "x"]', '[0, ""]', '[]'],
        answer: 1,
        why: 'filter keeps elements whose callback result is truthy. identity returns each element, so falsy ones (0, "") are dropped.',
      },
      {
        q: 'What is <code>flip((a, b) =&gt; a - b)(10, 3)</code>?',
        options: ['7', '-7', '13', '30'],
        answer: 1,
        why: 'flip swaps the arguments, so it computes 3 - 10 = -7.',
      },
      {
        q: 'Which is the definition of <code>constant</code> (Ramda\'s <code>always</code>)?',
        options: ['<code>x =&gt; x</code>', '<code>x =&gt; () =&gt; x</code>', '<code>f =&gt; x =&gt; !f(x)</code>', '<code>() =&gt; undefined</code>'],
        answer: 1,
        why: 'constant(x) returns a function that ignores its arguments and always returns x.',
      },
      {
        q: 'With <code>converge(divide, [sum, length])</code>, what does <code>[2, 4, 9]</code> produce?',
        options: ['15', '3', '5', 'NaN'],
        answer: 2,
        why: 'Both branches get the same array: sum = 15, length = 3. divide(15, 3) = 5.',
      },
      {
        q: 'A function wrapped in <code>once</code> is called with "a" then "b". What does the second call return?',
        options: [
          'The result of fn("b")',
          'The cached result of fn("a")',
          'undefined',
          'It throws',
        ],
        answer: 1,
        why: 'once runs fn only the first time and returns that stored value for every later call, whatever the arguments.',
      },
    ],
    exercise: {
      task: `<p>Implement three combinators and use them:</p>
      <ul>
        <li><code>complement(pred)</code>: returns a predicate that negates <code>pred</code>
        (forward all arguments).</li>
        <li><code>flip(fn)</code>: calls <code>fn</code> with the first two arguments
        swapped.</li>
        <li><code>converge(after, fns)</code>: calls every <code>f</code> in
        <code>fns</code> with the same input and passes the results to
        <code>after</code>.</li>
      </ul>
      <p>Then define <code>range = converge(..., [...])</code> giving
      <code>max - min</code> of an array.</p>`,
      starter: `const complement = (pred) => {
  // TODO
  return pred;
};
const flip = (fn) => {
  // TODO
  return fn;
};
const converge = (after, fns) => {
  // TODO
  return (x) => undefined;
};

const isEven = (n) => n % 2 === 0;
const pow = (base, exp) => base ** exp;
const min = (xs) => Math.min(...xs);
const max = (xs) => Math.max(...xs);

const range = converge((hi, lo) => hi - lo, [max, min]);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('complement', [1, 2, 3, 4].filter(complement(isEven)), [1, 3]);
check('complement forwards args', complement((a, b) => a > b)(1, 2), true);
check('flip', flip(pow)(2, 3), 9);
check('range', range([4, 10, 1, 7]), 9);`,
      hint: 'complement: (...args) => !pred(...args). flip: (a, b, ...rest) => fn(b, a, ...rest). converge: (x) => after(...fns.map((f) => f(x))).',
      solution: `const complement = (pred) => (...args) => !pred(...args);
const flip = (fn) => (a, b, ...rest) => fn(b, a, ...rest);
const converge = (after, fns) => (x) => after(...fns.map((f) => f(x)));

const isEven = (n) => n % 2 === 0;
const pow = (base, exp) => base ** exp;
const min = (xs) => Math.min(...xs);
const max = (xs) => Math.max(...xs);

const range = converge((hi, lo) => hi - lo, [max, min]);

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('complement', [1, 2, 3, 4].filter(complement(isEven)), [1, 3]);
check('complement forwards args', complement((a, b) => a > b)(1, 2), true);
check('flip', flip(pow)(2, 3), 9);
check('range', range([4, 10, 1, 7]), 9);`,
    },
  },
);
