window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── what-is-fp
  {
    id: 'what-is-fp',
    section: 'Foundations',
    title: 'What FP Really Is',
    explain: `
      <p>You already use <code>map</code>, <code>filter</code> and <code>reduce</code>. That is
      FP <em>vocabulary</em>. Functional programming is the <em>grammar</em> behind it: a way of
      building programs mostly out of <strong>functions that turn data into new data</strong>,
      with as few hidden changes to the world as possible.</p>

      <h3>Imperative vs declarative</h3>
      <p><strong>Imperative</strong> code says <em>how</em>: make a variable, loop, check, push,
      update. <strong>Declarative</strong> code says <em>what</em>: "the names of paid orders,
      uppercased". The loop still exists, but it is hidden inside a tested, reusable function
      (<code>filter</code>, <code>map</code>) instead of being rewritten by hand every time.</p>
      <pre><code>// imperative: HOW
const out = [];
for (let i = 0; i &lt; orders.length; i++) {
  if (orders[i].paid) out.push(orders[i].name.toUpperCase());
}

// declarative: WHAT
const out = orders.filter(o =&gt; o.paid).map(o =&gt; o.name.toUpperCase());</code></pre>

      <h3>The three big ideas</h3>
      <ul>
        <li><strong>Functions are values.</strong> You can store them in variables, put them in
        arrays, pass them as arguments, and return them from other functions. Almost every FP
        technique (currying, composition, combinators) depends on this.</li>
        <li><strong>Data in → data out.</strong> A function's whole job is described by its
        inputs and its return value. It does not secretly read globals or change things.</li>
        <li><strong>Don't change data, make new data.</strong> Instead of editing an object, return
        an updated copy. The old version stays valid.</li>
      </ul>

      <h3>Why bother?</h3>
      <ul>
        <li><strong>Testability.</strong> A data-in/data-out function needs no mocks: call it,
        compare the result.</li>
        <li><strong>Reasoning.</strong> You can understand a function by reading only that
        function. No "what else touched this object?" detective work.</li>
        <li><strong>Concurrency and caching.</strong> If nothing is mutated, two pieces of code
        can share the same data safely, and results can be cached.</li>
      </ul>

      <div class="tip">FP is not all-or-nothing. Real programs must print, save and fetch. The
      goal is to keep those effects in a thin outer layer and make the big middle pure. You'll
      see this as "Functional Core, Imperative Shell" at the end of this section.</div>

      <div class="warn"><code>forEach</code> is not more functional than a <code>for</code>
      loop. It returns <code>undefined</code>, so it only exists for side effects. If you're
      using <code>forEach</code> to <code>push</code> into an outer array, you wanted
      <code>map</code> or <code>filter</code>.</div>
    `,
    examples: [
      {
        title: 'Before / after: refactoring an imperative loop',
        code: `const orders = [
  { id: 1, customer: 'ana', total: 120, paid: true },
  { id: 2, customer: 'ben', total: 40, paid: true },
  { id: 3, customer: 'cy', total: 300, paid: false },
  { id: 4, customer: 'dee', total: 210, paid: true },
];

// BEFORE: imperative. Reads and writes outer variables.
let bigNames = [];
let bigSum = 0;
for (let i = 0; i < orders.length; i++) {
  const o = orders[i];
  if (o.paid && o.total >= 100) {
    bigNames.push(o.customer.toUpperCase());
    bigSum += o.total;
  }
}
console.log('imperative:', bigNames, bigSum);

// AFTER: declarative. Small named steps, data in -> data out.
const isBigPaid = (o) => o.paid && o.total >= 100;
const shout = (o) => o.customer.toUpperCase();
const add = (sum, o) => sum + o.total;

function bigOrderReport(list) {
  const big = list.filter(isBigPaid);
  return { names: big.map(shout), sum: big.reduce(add, 0) };
}

console.log('declarative:', bigOrderReport(orders));

// Same function, other data: no variables to reset first.
console.log('empty:', bigOrderReport([]));`,
      },
      {
        title: 'Functions are values',
        code: `// Stored in a variable
const double = (n) => n * 2;
const inc = (n) => n + 1;

// Stored in a data structure
const steps = [double, inc, double];

// Passed as an argument
const applyAll = (fns, x) => fns.reduce((acc, f) => f(acc), x);
console.log('applyAll(steps, 5):', applyAll(steps, 5)); // ((5*2)+1)*2

// Returned from a function
const multiplyBy = (k) => (n) => n * k;
const triple = multiplyBy(3);
console.log('triple(7):', triple(7));

// Looked up by name, like any other value
const ops = { double, inc, triple };
console.log('ops.triple(2):', ops['triple'](2));
console.log('a function logged:', triple);`,
      },
    ],
    quiz: [
      {
        q: 'What is the core difference between imperative and declarative code?',
        options: [
          'Declarative code is always faster',
          'Imperative code describes how (step by step); declarative describes what result you want',
          'Declarative code cannot use loops anywhere',
          'Imperative code cannot use functions',
        ],
        answer: 1,
        why: 'Declarative code still runs loops, but they are hidden inside reusable functions like filter/map. You describe the result, not the bookkeeping.',
      },
      {
        q: 'Which property makes currying, composition and callbacks possible?',
        options: [
          'Functions are first-class values',
          'JavaScript has classes',
          'Arrays are objects',
          'Variables are block-scoped',
        ],
        answer: 0,
        why: 'Because functions are values, you can pass them in, return them and store them. Every higher-level FP technique builds on that.',
      },
      {
        q: 'Why is <code>bigOrderReport(list)</code> easier to test than the imperative loop?',
        options: [
          'It uses fewer lines',
          'It uses arrow functions',
          'Its result depends only on its argument, so a test is just "call it, compare the output"',
          'It runs in parallel automatically',
        ],
        answer: 2,
        why: 'The loop writes to outer variables (bigNames, bigSum) that you would have to reset and inspect. The function takes data and returns data.',
      },
      {
        q: 'You see <code>items.forEach(i =&gt; result.push(i.id))</code>. What is the FP refactor?',
        options: [
          'Use a for...of loop instead',
          '<code>const result = items.map(i =&gt; i.id)</code>',
          '<code>items.reduce(i =&gt; result.push(i.id))</code>',
          'Nothing, forEach is already functional',
        ],
        answer: 1,
        why: 'forEach returns undefined and only exists for side effects. Building a new array from an old one is exactly what map does.',
      },
    ],
    exercise: {
      task: `<p>Refactor the imperative <code>loopVersion</code> into a declarative function
      <code>activeEmails(users)</code> that returns the <strong>lowercased emails of active
      users, sorted alphabetically</strong>. Don't mutate <code>users</code>. Use
      <code>filter</code>, <code>map</code> and <code>toSorted</code>.</p>`,
      starter: `const users = [
  { email: 'Zed@x.io', active: true },
  { email: 'amy@X.io', active: false },
  { email: 'Bob@x.io', active: true },
];

function loopVersion(list) {
  const out = [];
  for (const u of list) {
    if (u.active) out.push(u.email.toLowerCase());
  }
  out.sort();
  return out;
}

function activeEmails(list) {
  // TODO: filter -> map -> toSorted
  return undefined;
}

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('same as loop', activeEmails(users), loopVersion(users));
check('empty list', activeEmails([]), []);
check('input untouched', users[0].email, 'Zed@x.io');`,
      hint: 'list.filter(u => u.active).map(u => u.email.toLowerCase()).toSorted()',
      solution: `const users = [
  { email: 'Zed@x.io', active: true },
  { email: 'amy@X.io', active: false },
  { email: 'Bob@x.io', active: true },
];

function loopVersion(list) {
  const out = [];
  for (const u of list) {
    if (u.active) out.push(u.email.toLowerCase());
  }
  out.sort();
  return out;
}

const isActive = (u) => u.active;
const lowerEmail = (u) => u.email.toLowerCase();

function activeEmails(list) {
  return list.filter(isActive).map(lowerEmail).toSorted();
}

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

check('same as loop', activeEmails(users), loopVersion(users));
check('empty list', activeEmails([]), []);
check('input untouched', users[0].email, 'Zed@x.io');`,
    },
  },

  // ───────────────────────────────────────────────────────────── pure-functions
  {
    id: 'pure-functions',
    section: 'Foundations',
    title: 'Pure Functions',
    explain: `
      <p>A function is <strong>pure</strong> when both rules hold:</p>
      <ol>
        <li><strong>Deterministic:</strong> same arguments → same return value, every time.</li>
        <li><strong>No side effects:</strong> calling it changes nothing outside it. No writing
        globals, no mutating arguments, no console, no network, no DOM.</li>
      </ol>
      <p>Think of a pure function as a <strong>lookup table</strong>: <code>add(2, 3)</code>
      <em>is</em> 5, the same way a row in a table is. Nothing about the time of day, the
      contents of a global, or how many times you asked can change the answer.</p>

      <h3>Hidden inputs</h3>
      <p>The sneaky impurities are not the outputs, they're the <em>inputs you don't see in the
      parameter list</em>:</p>
      <ul>
        <li><code>Date.now()</code>, <code>new Date()</code>: the clock is an input.</li>
        <li><code>Math.random()</code>, <code>crypto.randomUUID()</code>: randomness is an input.</li>
        <li>Module-level <code>let</code> variables, <code>window</code>, <code>localStorage</code>,
        environment config.</li>
        <li><code>this</code> when it points to a mutable object.</li>
      </ul>

      <h3>Hidden outputs (side effects)</h3>
      <ul>
        <li>Mutating an argument: <code>arr.push</code>, <code>arr.sort()</code>,
        <code>obj.x = 1</code>.</li>
        <li>Writing a global or a closure variable (<code>count++</code>).</li>
        <li>Logging, network, DOM, file writes, throwing to signal normal outcomes.</li>
      </ul>

      <h3>Making impure functions pure: inject the dependency</h3>
      <p>The fix is almost always the same: turn the hidden input into a <strong>parameter</strong>.
      The caller (an outer, impure layer) reads the clock or random number and passes it in.</p>
      <pre><code>// impure: reads the clock
const isExpired = (token) =&gt; token.expiresAt &lt; Date.now();

// pure: the clock is a parameter
const isExpired = (token, now) =&gt; token.expiresAt &lt; now;
isExpired(token, Date.now()); // impurity moved to the call site</code></pre>

      <div class="tip">A pure function may use mutation <em>internally</em> (a local array it
      builds and returns). Purity is about what callers can observe. "Local mutation, pure
      interface" is fine.</div>
      <div class="warn"><code>arr.sort()</code> inside a function makes it impure if
      <code>arr</code> is a parameter: it reorders the caller's array. Use
      <code>arr.toSorted()</code> (ES2023) or <code>[...arr].sort()</code>.</div>
    `,
    examples: [
      {
        title: 'Hidden inputs make functions lie',
        code: `// Module-level state: a hidden input and a hidden output
let discount = 0.1;
let callCount = 0;

function priceImpure(amount) {
  callCount++; // ① side effect: writes outside itself
  return amount * (1 - discount); // ② hidden input: reads a global
}

console.log('A:', priceImpure(100));
discount = 0.5; // someone else changes the global
console.log('B:', priceImpure(100)); // same argument, different answer!
console.log('calls so far:', callCount);

// Pure version: every input is a parameter, nothing is written outside
const pricePure = (amount, rate) => amount * (1 - rate); // ③

console.log('C:', pricePure(100, 0.1));
console.log('D:', pricePure(100, 0.1));
console.log('E:', pricePure(100, 0.5));

// The clock is a hidden input too
const token = { user: 'ana', expiresAt: 1000 };
const isExpiredImpure = (t) => t.expiresAt < Date.now(); // depends on when you run it
const isExpired = (t, now) => t.expiresAt < now; // ④ clock injected

console.log('impure (real clock):', isExpiredImpure(token));
console.log('pure at now=500:', isExpired(token, 500));
console.log('pure at now=1500:', isExpired(token, 1500));`,
        explain: `
          <details>
            <summary>The problem: the parameter list doesn't tell the whole story</summary>
            <p><code>priceImpure(100)</code> looks like it depends only on <code>100</code>. It
            actually depends on <code>discount</code> too, and it changes
            <code>callCount</code>. Calling it with the same argument gives different answers
            depending on what <em>other</em> code did in between.</p>
            <p>In a real app that "other code" could be a settings screen, a test that forgot to
            reset a global, or an async callback. You can't understand
            <code>priceImpure</code> by reading <code>priceImpure</code>.</p>
          </details>
          <details>
            <summary>Step by step: what the console shows</summary>
            <table>
              <tr><th>Line</th><th>discount</th><th>callCount after</th><th>Console</th></tr>
              <tr><td><code>priceImpure(100)</code></td><td>0.1</td><td>1</td><td><code>A: 90</code></td></tr>
              <tr><td><code>discount = 0.5</code></td><td>0.5</td><td>1</td><td>(nothing)</td></tr>
              <tr><td><code>priceImpure(100)</code></td><td>0.5</td><td>2</td><td><code>B: 50</code> ❌ same input, new answer</td></tr>
              <tr><td>log callCount</td><td>0.5</td><td>2</td><td><code>calls so far: 2</code></td></tr>
              <tr><td><code>pricePure(100, 0.1)</code></td><td>(ignored)</td><td>2</td><td><code>C: 90</code></td></tr>
              <tr><td><code>pricePure(100, 0.1)</code></td><td>(ignored)</td><td>2</td><td><code>D: 90</code> ✅ same input, same answer</td></tr>
              <tr><td><code>pricePure(100, 0.5)</code></td><td>(ignored)</td><td>2</td><td><code>E: 50</code></td></tr>
              <tr><td><code>isExpiredImpure(token)</code></td><td></td><td></td><td><code>impure (real clock): true</code> (today's <code>Date.now()</code> is far past 1000)</td></tr>
              <tr><td><code>isExpired(token, 500)</code></td><td></td><td></td><td><code>pure at now=500: false</code></td></tr>
              <tr><td><code>isExpired(token, 1500)</code></td><td></td><td></td><td><code>pure at now=1500: true</code></td></tr>
            </table>
            <p>Notice the impure clock version can <strong>never</strong> return
            <code>false</code> again: you can't test the "not expired yet" branch without
            faking the system clock. The pure one tests both branches with two plain calls.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>callCount++</code> is a hidden <em>output</em>. Even
              if the return value were stable, calling the function changes the world.</li>
              <li><strong>②</strong> Reading <code>discount</code> is a hidden <em>input</em>.
              This is what breaks determinism.</li>
              <li><strong>③</strong> Moving <code>rate</code> into the parameters makes the
              dependency visible. The caller decides where the rate comes from.</li>
              <li><strong>④</strong> Same trick for time: <code>now</code> is a parameter. The
              one impure call, <code>Date.now()</code>, moves to the outer code that calls
              <code>isExpired(t, Date.now())</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Add <code>discount = 0.9</code> before line C. C, D and E don't change: the
              pure function can't see the global.</li>
              <li>Add <code>console.log('debug')</code> inside <code>pricePure</code>. It's now
              technically impure (it writes to the console). That's fine while debugging, but
              notice how easy purity is to lose.</li>
            </ul>
            <div class="warn">"It doesn't use globals, so it's pure" is not enough. A function
            that does <code>items.sort()</code> or <code>user.visits++</code> on its argument
            has a side effect on the caller's data.</div>
          </details>
        `,
      },
      {
        title: 'Injecting randomness and IDs',
        code: `// Pure core: everything that varies comes in as a parameter.
function createOrder(items, deps) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  return {
    id: deps.makeId(),
    createdAt: deps.now(),
    total,
    luckyDraw: deps.random() < 0.1, // 10% win a prize
  };
}

const items = [
  { name: 'tea', price: 3, qty: 2 },
  { name: 'cake', price: 5, qty: 1 },
];

// In tests: fixed, fake dependencies -> fully predictable output
const fakeDeps = {
  makeId: () => 'order-1',
  now: () => 1700000000000,
  random: () => 0.05,
};
console.log('test run 1:', createOrder(items, fakeDeps));
console.log('test run 2:', createOrder(items, fakeDeps));

// In the app: real dependencies, injected once at the edge
const realDeps = {
  makeId: () => crypto.randomUUID(),
  now: () => Date.now(),
  random: Math.random,
};
const real = createOrder(items, realDeps);
console.log('real total:', real.total, '| id is a', typeof real.id);`,
      },
    ],
    quiz: [
      {
        q: 'Which function is pure?',
        options: [
          '<code>(xs) =&gt; xs.sort()</code>',
          '<code>(xs) =&gt; xs.toSorted()</code>',
          '<code>(x) =&gt; x * Math.random()</code>',
          '<code>(x) =&gt; { console.log(x); return x; }</code>',
        ],
        answer: 1,
        why: 'toSorted returns a new array and leaves xs alone. sort mutates the argument, Math.random is a hidden input, and console.log is a side effect.',
      },
      {
        q: '<code>const isWeekend = () =&gt; [0, 6].includes(new Date().getDay())</code>. How do you make it pure?',
        options: [
          'Wrap it in try/catch',
          'Make it async',
          'Take the date as a parameter: <code>(date) =&gt; [0, 6].includes(date.getDay())</code>',
          'Cache the result in a global',
        ],
        answer: 2,
        why: 'The clock is a hidden input. Injecting the date makes the function deterministic; the caller passes new Date() at the edge.',
      },
      {
        q: 'This function builds a local array with push and returns it. Is it pure? <code>const range = (n) =&gt; { const a = []; for (let i = 0; i &lt; n; i++) a.push(i); return a; }</code>',
        options: [
          'No, push is always impure',
          'Yes: the mutation is local and invisible to callers',
          'No, loops are imperative',
          'Only if n is a constant',
        ],
        answer: 1,
        why: 'Purity is about observable behaviour. The array is created inside and nobody else can see it being mutated, so callers get same-input-same-output with no side effects.',
      },
      {
        q: 'What is the main practical benefit of injecting <code>now</code> and <code>random</code>?',
        options: [
          'The code runs faster',
          'Tests can pass fixed values and check exact outputs without mocking globals',
          'It removes the need for Date entirely',
          'It makes the function async',
        ],
        answer: 1,
        why: 'With dependencies as parameters, a test just passes () =&gt; 0.05 or a fixed timestamp. No monkey-patching Date or Math.random.',
      },
      {
        q: 'A function reads a module-level <code>const TAX = 0.07</code> that is never reassigned. Is that a hidden input that breaks purity?',
        options: [
          'Yes, any outer variable breaks purity',
          'No: a constant primitive can never change, so the function is still deterministic',
          'Yes, because const can be reassigned',
          'Only in strict mode',
        ],
        answer: 1,
        why: 'Determinism is what matters. A const bound to a primitive cannot change, so reading it is like reading a literal. A const bound to a mutable object is different: its contents can change.',
      },
    ],
    exercise: {
      task: `<p><code>makeReceipt</code> reads a global tax rate, reads the clock, and pushes to a
      global log. Write a pure <code>makeReceiptPure(items, taxRate, isoDate)</code> that
      returns <code>{ subtotal, tax, total, date }</code> and touches nothing outside itself.
      Round <code>tax</code> and <code>total</code> to 2 decimals with
      <code>Math.round(x * 100) / 100</code>.</p>`,
      starter: `let TAX_RATE = 0.1;
const auditLog = [];

function makeReceipt(items) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  auditLog.push('receipt made'); // side effect
  return { subtotal, tax, total: subtotal + tax, date: new Date().toISOString() };
}

function makeReceiptPure(items, taxRate, isoDate) {
  // TODO: same maths, but use only the parameters
  return undefined;
}

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const items = [{ price: 10 }, { price: 5.5 }];
check('receipt', makeReceiptPure(items, 0.1, '2026-01-01'), {
  subtotal: 15.5, tax: 1.55, total: 17.05, date: '2026-01-01',
});
check('same input, same output',
  JSON.stringify(makeReceiptPure(items, 0.2, 'd')) ===
  JSON.stringify(makeReceiptPure(items, 0.2, 'd')), true);
check('no global log writes', auditLog.length, 0);`,
      hint: 'Copy the body of makeReceipt, replace TAX_RATE with taxRate, new Date()... with isoDate, delete the auditLog line, and round total too.',
      solution: `let TAX_RATE = 0.1;
const auditLog = [];

function makeReceipt(items) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  auditLog.push('receipt made'); // side effect
  return { subtotal, tax, total: subtotal + tax, date: new Date().toISOString() };
}

const round2 = (x) => Math.round(x * 100) / 100;

function makeReceiptPure(items, taxRate, isoDate) {
  const subtotal = items.reduce((s, i) => s + i.price, 0);
  const tax = round2(subtotal * taxRate);
  return { subtotal, tax, total: round2(subtotal + tax), date: isoDate };
}

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const items = [{ price: 10 }, { price: 5.5 }];
check('receipt', makeReceiptPure(items, 0.1, '2026-01-01'), {
  subtotal: 15.5, tax: 1.55, total: 17.05, date: '2026-01-01',
});
check('same input, same output',
  JSON.stringify(makeReceiptPure(items, 0.2, 'd')) ===
  JSON.stringify(makeReceiptPure(items, 0.2, 'd')), true);
check('no global log writes', auditLog.length, 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── referential-transparency
  {
    id: 'referential-transparency',
    section: 'Foundations',
    title: 'Referential Transparency',
    explain: `
      <p>An expression is <strong>referentially transparent</strong> if you can replace it with
      its value without changing what the program does. <code>square(3)</code> can be replaced
      by <code>9</code> anywhere, so it is transparent. <code>Math.random()</code> cannot be
      replaced by any fixed number, so it is not.</p>
      <p>Pure functions are what give you referential transparency: calling a pure function
      with known arguments is just a long way to write its result.</p>

      <h3>The substitution model</h3>
      <p>You evaluate code like algebra, by rewriting:</p>
      <pre><code>const square = (x) =&gt; x * x;
square(3) + square(3)
= (3 * 3) + (3 * 3)   // substitute the body
= 9 + 9
= 18</code></pre>
      <p>This is <strong>equational reasoning</strong>: if two expressions are equal, you can
      swap one for the other. It's how you'd simplify a maths formula, and it works on code
      only when the code is pure.</p>

      <h3>What it buys you</h3>
      <ul>
        <li><strong>Safe refactoring.</strong> Extract <code>const s = square(3)</code> and use
        <code>s + s</code>: guaranteed identical. Inline it back: still identical.</li>
        <li><strong>Safe memoization.</strong> If <code>f(x)</code> always equals the same value,
        caching it can't change behaviour.</li>
        <li><strong>Laws you can trust.</strong> <code>xs.map(f).map(g)</code> equals
        <code>xs.map(x =&gt; g(f(x)))</code> (one pass instead of two) as long as
        <code>f</code> and <code>g</code> are pure.</li>
      </ul>

      <div class="warn">The moment an expression reads or writes mutable state, "extract a
      variable" and "inline a variable" stop being safe refactors. That's the counter-example
      below: <code>next() + next()</code> is not <code>n + n</code>.</div>
    `,
    examples: [
      {
        title: 'Substitution works... until it meets mutation',
        code: `// 1) A pure function: substitution is safe
const square = (x) => x * x;

const inlined = square(3) + square(3); // ①
const s = square(3);
const extracted = s + s; // ②
console.log('pure  inlined:', inlined, '| extracted:', extracted);

// 2) An impure function: substitution changes the answer
let count = 0;
const next = () => ++count; // reads AND writes count

const twoCalls = next() + next(); // ③
count = 0; // reset so the comparison is fair
const n = next();
const oneCall = n + n; // ④
console.log('impure twoCalls:', twoCalls, '| oneCall:', oneCall);

// 3) Mutation hidden in a "helper"
const addItem = (cart, item) => {
  cart.push(item); // mutates the argument
  return cart.length;
};

const cart = [];
const a = addItem(cart, 'tea');
const b = addItem(cart, 'tea'); // "same call" -> different result
console.log('addItem a:', a, '| b:', b, '| cart:', cart);

// Pure version: return a new cart, never touch the old one
const withItem = (c, item) => [...c, item];
const empty = [];
console.log('withItem x2:', withItem(empty, 'tea'), withItem(empty, 'tea'));`,
        explain: `
          <details>
            <summary>The problem: "extract variable" is only safe for pure code</summary>
            <p>Every IDE has a refactor called "extract variable". It assumes that writing
            <code>f(x)</code> twice is the same as computing it once and reusing it. That
            assumption is exactly referential transparency, and it is false for
            <code>next()</code>.</p>
          </details>
          <details>
            <summary>Step by step: evaluating each line</summary>
            <table>
              <tr><th>Expression</th><th>Rewrites to</th><th>count after</th><th>Value</th></tr>
              <tr><td>① <code>square(3) + square(3)</code></td><td><code>9 + 9</code></td><td>-</td><td>18</td></tr>
              <tr><td>② <code>s + s</code> with <code>s = square(3)</code></td><td><code>9 + 9</code></td><td>-</td><td>18 ✅ same</td></tr>
              <tr><td>③ <code>next() + next()</code></td><td><code>1 + 2</code></td><td>2</td><td>3</td></tr>
              <tr><td><code>count = 0</code></td><td></td><td>0</td><td></td></tr>
              <tr><td>④ <code>n + n</code> with <code>n = next()</code></td><td><code>1 + 1</code></td><td>1</td><td>2 ❌ different</td></tr>
              <tr><td><code>addItem(cart, 'tea')</code></td><td>cart becomes <code>['tea']</code></td><td></td><td>a = 1</td></tr>
              <tr><td><code>addItem(cart, 'tea')</code></td><td>cart becomes <code>['tea','tea']</code></td><td></td><td>b = 2 ❌</td></tr>
            </table>
            <p>Console:</p>
            <pre><code>pure  inlined: 18 | extracted: 18
impure twoCalls: 3 | oneCall: 2
addItem a: 1 | b: 2 | cart: ["tea","tea"]
withItem x2: ["tea"] ["tea"]</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①②</strong> For the pure <code>square</code>, writing it twice or
              computing once and reusing is the same program. You can move it, cache it, or
              inline it freely.</li>
              <li><strong>③</strong> Each <code>next()</code> changes <code>count</code>, so
              the two calls return 1 and then 2. The expression's value depends on how many
              times it has run before.</li>
              <li><strong>④</strong> "Extracting" <code>next()</code> into <code>n</code> runs it
              only once, so you get <code>1 + 1</code>. The refactor silently changed the
              result.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Delete the <code>count = 0</code> line. <code>oneCall</code> becomes
              <code>6</code> (<code>3 + 3</code>), because <code>next()</code> now continues from
              2. With impure code, <em>order and history</em> matter.</li>
              <li>Replace the last line's <code>empty</code> with <code>cart</code>. Both
              <code>withItem</code> results are still equal to each other, because
              <code>withItem</code> is pure.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Why memoization is only safe for transparent functions',
        code: `// Generic single-argument memoize: remember results by argument
const memoize = (fn) => {
  const cache = new Map();
  return (x) => {
    if (cache.has(x)) return cache.get(x); // ① trust the cached value
    const result = fn(x);
    cache.set(x, result);
    return result;
  };
};

// Pure: memoizing can't change behaviour
let slowCalls = 0;
const slowSquare = (x) => {
  slowCalls++; // only for counting in this demo
  return x * x;
};
const fastSquare = memoize(slowSquare);
console.log('fastSquare(4):', fastSquare(4), fastSquare(4), fastSquare(4));
console.log('real computations:', slowCalls);

// Impure: depends on a global, so a cached value can go stale
let rate = 2;
const convert = (amount) => amount * rate; // ② hidden input
const fastConvert = memoize(convert);

console.log('convert(10) with rate 2:', convert(10), '| memo:', fastConvert(10));
rate = 3; // ③ the world changes
console.log('convert(10) with rate 3:', convert(10), '| memo:', fastConvert(10));`,
        explain: `
          <details>
            <summary>The problem: a cache assumes "same input, same output"</summary>
            <p><code>memoize</code> keys the cache by the argument only. That's a promise that the
            argument is the <em>only</em> input. For <code>convert</code>, <code>rate</code> is a
            hidden second input the cache knows nothing about.</p>
          </details>
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Call</th><th>Cache before</th><th>What happens</th><th>Returns</th></tr>
              <tr><td><code>fastSquare(4)</code></td><td>{}</td><td>miss → compute, slowCalls = 1</td><td>16</td></tr>
              <tr><td><code>fastSquare(4)</code></td><td>{4: 16}</td><td>hit</td><td>16</td></tr>
              <tr><td><code>fastSquare(4)</code></td><td>{4: 16}</td><td>hit</td><td>16</td></tr>
              <tr><td><code>fastConvert(10)</code>, rate 2</td><td>{}</td><td>miss → compute</td><td>20</td></tr>
              <tr><td><code>rate = 3</code></td><td>{10: 20}</td><td>cache not told</td><td></td></tr>
              <tr><td><code>convert(10)</code></td><td></td><td>recomputes</td><td>30</td></tr>
              <tr><td><code>fastConvert(10)</code></td><td>{10: 20}</td><td>hit ① → stale</td><td><strong>20 ❌</strong></td></tr>
            </table>
            <pre><code>fastSquare(4): 16 16 16
real computations: 1
convert(10) with rate 2: 20 | memo: 20
convert(10) with rate 3: 30 | memo: 20</code></pre>
          </details>
          <details>
            <summary>The fix and a common mistake</summary>
            <p>Make the hidden input explicit: <code>convert = (amount, rate) =&gt; amount * rate</code>
            and key the cache on both. Once the function is pure, memoizing is safe by
            construction.</p>
            <div class="warn"><code>slowSquare</code> increments <code>slowCalls</code>, so it's
            technically impure: memoizing it <em>does</em> change that counter (1 instead of 3).
            That's exactly the point: memoization changes whether side effects happen. Never
            memoize a function whose effects you rely on.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does "referentially transparent" mean for an expression?',
        options: [
          'It has no variables in it',
          'It can be replaced by its value without changing program behaviour',
          'It is visible in the debugger',
          'It returns a reference type',
        ],
        answer: 1,
        why: 'Transparency is substitutability: square(3) can always become 9. Anything that depends on or changes state fails this test.',
      },
      {
        q: 'With <code>let c = 0; const next = () =&gt; ++c;</code>, what is <code>next() + next()</code> from a fresh start?',
        options: ['2', '3', '1', '0'],
        answer: 1,
        why: 'The first call returns 1, the second returns 2, so 1 + 2 = 3. Extracting const n = next(); n + n would give 2 instead.',
      },
      {
        q: 'When is <code>xs.map(f).map(g)</code> guaranteed equal to <code>xs.map(x =&gt; g(f(x)))</code>?',
        options: [
          'Always',
          'Never',
          'When f and g are pure',
          'Only for arrays of numbers',
        ],
        answer: 2,
        why: 'Fusing two maps changes the order calls happen in (f,f,g,g vs f,g,f,g). That only matters if f or g have side effects or depend on shared state.',
      },
      {
        q: 'Why did <code>fastConvert(10)</code> return 20 after <code>rate = 3</code>?',
        options: [
          'Map is broken',
          'The cache key was the argument only, but convert also depended on the hidden rate',
          'Multiplication is cached by the engine',
          'memoize mutates rate',
        ],
        answer: 1,
        why: 'The memo cache trusted that 10 always maps to the same result. convert broke that promise by reading a global.',
      },
    ],
    exercise: {
      task: `<p>Write <code>memoize(fn)</code> for single-argument pure functions using a
      <code>Map</code>. Then verify with the checks: a pure <code>fib</code> wrapped in
      <code>memoize</code> must return the right value while the underlying function runs only
      once per distinct argument.</p>`,
      starter: `const memoize = (fn) => {
  // TODO: return a function that caches fn's results in a Map
  return fn;
};

let calls = 0;
const slowDouble = (n) => {
  calls++;
  return n * 2;
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const fastDouble = memoize(slowDouble);
check('result', [fastDouble(5), fastDouble(5), fastDouble(6)], [10, 10, 12]);
check('computed once per argument', calls, 2);

// Memoized recursion: fib calls the memoized version of itself
const fib = memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
check('fib(30)', fib(30), 832040);`,
      hint: 'Inside: const cache = new Map(); return (x) => { if (cache.has(x)) return cache.get(x); const r = fn(x); cache.set(x, r); return r; }. Without memoization fib(30) makes about 2.7 million calls; memoized, the inner function runs only 31 times.',
      solution: `const memoize = (fn) => {
  const cache = new Map();
  return (x) => {
    if (cache.has(x)) return cache.get(x);
    const result = fn(x);
    cache.set(x, result);
    return result;
  };
};

let calls = 0;
const slowDouble = (n) => {
  calls++;
  return n * 2;
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const fastDouble = memoize(slowDouble);
check('result', [fastDouble(5), fastDouble(5), fastDouble(6)], [10, 10, 12]);
check('computed once per argument', calls, 2);

// Memoized recursion: fib calls the memoized version of itself
const fib = memoize((n) => (n < 2 ? n : fib(n - 1) + fib(n - 2)));
check('fib(30)', fib(30), 832040);`,
    },
  },

  // ───────────────────────────────────────────────────────────── immutability
  {
    id: 'immutability',
    section: 'Foundations',
    title: 'Immutability in JS',
    explain: `
      <p>Immutability means: once a value is created, it never changes. To "update" it, you
      make a new value. JavaScript primitives (numbers, strings, booleans) are already
      immutable. Objects and arrays are not, and that's where the bugs live.</p>

      <h3><code>const</code> is not immutability</h3>
      <p><code>const</code> freezes the <strong>binding</strong> (the name can't point
      somewhere else), not the <strong>value</strong>:</p>
      <pre><code>const user = { name: 'Ana' };
user.name = 'Ben';     // allowed: the object changed
user = {};             // TypeError: Assignment to constant variable.</code></pre>

      <h3>Shallow vs deep copies</h3>
      <p>Spread (<code>{ ...obj }</code>, <code>[...arr]</code>) and <code>Object.assign</code>
      copy only the <strong>top level</strong>. Nested objects are copied <em>by reference</em>,
      so the copy and the original share them. Mutating a nested field through the copy
      changes the original.</p>
      <ul>
        <li><strong>Update with nested spread</strong>: copy each level on the path you change.
        This is the normal FP way (and it enables structural sharing, next lesson).</li>
        <li><strong><code>structuredClone(obj)</code></strong>: a built-in deep copy (all modern
        browsers, Node 17+). Handles Dates, Maps, Sets and cycles; throws on functions and DOM
        nodes. Good for "I need a fully independent copy", but it copies everything, so it's
        slower and loses sharing.</li>
      </ul>

      <h3><code>Object.freeze</code></h3>
      <p><code>Object.freeze(obj)</code> makes the object's own properties read-only and stops
      new ones being added. Two catches:</p>
      <ul>
        <li>It's <strong>shallow</strong>: nested objects stay mutable unless you freeze them
        too (a recursive <code>deepFreeze</code>).</li>
        <li>In sloppy mode, writes to a frozen object fail <em>silently</em>. In
        <strong>strict mode</strong> they throw a <code>TypeError</code>. ES modules (and
        <code>class</code> bodies) are always strict, so the examples here, which run as
        modules, throw.</li>
      </ul>

      <h3>Array methods: mutating vs copying</h3>
      <table>
        <tr><th>Mutates the array</th><th>Returns a new array (ES2023)</th></tr>
        <tr><td><code>sort()</code></td><td><code>toSorted()</code></td></tr>
        <tr><td><code>reverse()</code></td><td><code>toReversed()</code></td></tr>
        <tr><td><code>splice(i, n, ...items)</code></td><td><code>toSpliced(i, n, ...items)</code></td></tr>
        <tr><td><code>arr[i] = v</code></td><td><code>arr.with(i, v)</code></td></tr>
        <tr><td><code>push</code>, <code>pop</code>, <code>shift</code>, <code>unshift</code>, <code>fill</code>, <code>copyWithin</code></td><td><code>[...arr, x]</code>, <code>slice</code>, <code>concat</code></td></tr>
      </table>
      <div class="warn"><code>sort()</code> and <code>reverse()</code> <em>return</em> the
      array, so <code>const sorted = arr.sort()</code> looks like it makes a copy. It doesn't:
      <code>sorted === arr</code>, and <code>arr</code> is now reordered.</div>
    `,
    examples: [
      {
        title: 'The shared reference bug',
        code: `const DEFAULTS = { theme: 'light', prefs: { fontSize: 14 } };

// ❌ Shallow copies share the nested prefs object
const ana = { ...DEFAULTS };
const ben = { ...DEFAULTS };
ana.theme = 'dark'; // ① top-level: safe, ana has her own theme
ana.prefs.fontSize = 20; // ② nested: writes into the SHARED prefs

console.log('ana:', ana);
console.log('ben:', ben);
console.log('DEFAULTS:', DEFAULTS);
console.log('same prefs object?', ana.prefs === DEFAULTS.prefs);

// ✅ Fix 1: copy every level you change (nested spread)
const DEFAULTS2 = { theme: 'light', prefs: { fontSize: 14 } };
const cy = { ...DEFAULTS2, prefs: { ...DEFAULTS2.prefs, fontSize: 20 } }; // ③
console.log('cy:', cy, '| DEFAULTS2:', DEFAULTS2);

// ✅ Fix 2: deep copy when you need a fully independent object
const dee = structuredClone(DEFAULTS2); // ④
dee.prefs.fontSize = 30;
console.log('dee:', dee.prefs, '| DEFAULTS2:', DEFAULTS2.prefs);`,
        explain: `
          <details>
            <summary>The problem: spread copies one level</summary>
            <p><code>{ ...DEFAULTS }</code> creates a new outer object, but its
            <code>prefs</code> property holds the <em>same</em> object reference as
            <code>DEFAULTS.prefs</code>. After two spreads, three variables point at one
            <code>prefs</code> object:</p>
            <pre><code>DEFAULTS ─┐
ana ──────┼──&gt; { fontSize: 14 }   (one object in memory)
ben ──────┘</code></pre>
            <p>This bug is common with "default settings", Redux reducers that spread only the
            top level, and React state updates with nested objects.</p>
          </details>
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Line</th><th>ana.prefs</th><th>ben.prefs</th><th>DEFAULTS.prefs</th></tr>
              <tr><td>after both spreads</td><td colspan="3">all the same object: <code>{"fontSize":14}</code></td></tr>
              <tr><td>① <code>ana.theme = 'dark'</code></td><td colspan="3">unchanged (theme is a top-level copy)</td></tr>
              <tr><td>② <code>ana.prefs.fontSize = 20</code></td><td>20</td><td>20 ❌</td><td>20 ❌</td></tr>
              <tr><td>③ <code>cy</code> with nested spread</td><td colspan="3">cy.prefs is new <code>{"fontSize":20}</code>; DEFAULTS2.prefs stays 14 ✅</td></tr>
              <tr><td>④ <code>structuredClone</code> then write</td><td colspan="3">dee.prefs is 30; DEFAULTS2.prefs stays 14 ✅</td></tr>
            </table>
            <pre><code>ana: {"theme":"dark","prefs":{"fontSize":20}}
ben: {"theme":"light","prefs":{"fontSize":20}}
DEFAULTS: {"theme":"light","prefs":{"fontSize":20}}
same prefs object? true
cy: {"theme":"light","prefs":{"fontSize":20}} | DEFAULTS2: {"theme":"light","prefs":{"fontSize":14}}
dee: {"fontSize":30} | DEFAULTS2: {"fontSize":14}</code></pre>
            <p>Ben never touched anything, yet his font size changed. That's the shared
            reference bug.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> <code>theme</code> is a string stored directly on
              <code>ana</code>'s own (new) object, so assigning it is safe.</li>
              <li><strong>②</strong> <code>ana.prefs</code> evaluates to the shared object, then
              <code>.fontSize = 20</code> mutates <em>that</em> object.</li>
              <li><strong>③</strong> The FP fix: never mutate, build the new value. Spread each
              level on the path you change (<code>prefs</code>), and override the field.</li>
              <li><strong>④</strong> <code>structuredClone</code> copies every level. Safe, but
              it copies parts you didn't need to (and can't clone functions).</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>const ed = { ...DEFAULTS }</code> at the very end and log
              <code>ed.prefs.fontSize</code>: it's 20. The "defaults" are permanently
              corrupted for every future user.</li>
              <li>Wrap the first line in <code>Object.freeze(...)</code>. Line ② still works:
              freeze is shallow, and <code>prefs</code> wasn't frozen. (Next example.)</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Object.freeze: shallow, and throws in strict mode',
        code: `// This code runs as an ES module, which is always strict mode.
const config = Object.freeze({ env: 'prod', db: { host: 'db1' } });

try {
  config.env = 'dev'; // ① write to a frozen property
} catch (e) {
  console.log('top-level write threw:', e.name);
}

config.db.host = 'HACKED'; // ② nested object is NOT frozen
console.log('nested write worked:', config.db.host);
console.log('isFrozen(config):', Object.isFrozen(config), '| isFrozen(db):',
  Object.isFrozen(config.db));

// Recursive freeze
const deepFreeze = (obj) => {
  for (const value of Object.values(obj)) {
    if (typeof value === 'object' && value !== null) deepFreeze(value); // ③
  }
  return Object.freeze(obj);
};

const safe = deepFreeze({ env: 'prod', db: { host: 'db1' }, tags: ['a'] });
try {
  safe.db.host = 'x';
} catch (e) {
  console.log('deep write threw:', e.name);
}
try {
  safe.tags.push('b'); // ④ frozen arrays can't grow
} catch (e) {
  console.log('push threw:', e.name);
}
console.log('safe:', safe);`,
        explain: `
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Line</th><th>Frozen?</th><th>Result</th><th>Console</th></tr>
              <tr><td>① <code>config.env = 'dev'</code></td><td>config: yes</td><td>throws (strict mode)</td><td><code>top-level write threw: TypeError</code></td></tr>
              <tr><td>② <code>config.db.host = 'HACKED'</code></td><td>db: no</td><td>succeeds</td><td><code>nested write worked: HACKED</code></td></tr>
              <tr><td>isFrozen checks</td><td></td><td></td><td><code>isFrozen(config): true | isFrozen(db): false</code></td></tr>
              <tr><td><code>safe.db.host = 'x'</code></td><td>db: yes</td><td>throws</td><td><code>deep write threw: TypeError</code></td></tr>
              <tr><td>④ <code>safe.tags.push('b')</code></td><td>tags: yes</td><td>throws</td><td><code>push threw: TypeError</code></td></tr>
              <tr><td>log safe</td><td></td><td>unchanged</td><td><code>safe: {"env":"prod","db":{"host":"db1"},"tags":["a"]}</code></td></tr>
            </table>
            <p>The exact message varies by engine. In Chrome/Node it's <em>"Cannot assign to read
            only property 'env' of object '#&lt;Object&gt;'"</em> and <em>"Cannot add property 1,
            object is not extensible"</em>. We log only <code>e.name</code> so the output is the
            same everywhere.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> In a classic, non-strict <code>&lt;script&gt;</code> this
              line would do nothing and throw nothing: a silent failure. Modules, classes and
              files with <code>'use strict'</code> throw a <code>TypeError</code>.</li>
              <li><strong>②</strong> <code>Object.freeze</code> only locks the properties of the
              object you pass. <code>config.db</code> is a separate object.</li>
              <li><strong>③</strong> <code>deepFreeze</code> recurses into every nested object
              (arrays included, since <code>typeof [] === 'object'</code>) before freezing the
              parent.</li>
              <li><strong>④</strong> Mutating methods on frozen arrays (<code>push</code>,
              <code>sort</code>, <code>reverse</code>...) throw too, in any mode, because they
              try to write.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Freezing is a <em>safety net</em> for development, not how FP
            code achieves immutability. The real discipline is: never write
            <code>obj.x = ...</code> on shared data; always return a new object. Freezing large
            objects deeply on every update also costs time.</div>
          </details>
        `,
      },
      {
        title: 'ES2023 copying array methods',
        code: `const scores = [30, 10, 20];

// Mutating methods change the original
const sortedBad = scores.sort((a, b) => a - b);
console.log('after sort:', scores, '| same array?', sortedBad === scores);

// Reset and use the copying versions instead
const nums = [30, 10, 20];
console.log('toSorted:', nums.toSorted((a, b) => a - b));
console.log('toReversed:', nums.toReversed());
console.log('with(1, 99):', nums.with(1, 99));
console.log('toSpliced(1, 1):', nums.toSpliced(1, 1));
console.log('toSpliced(1, 0, 15):', nums.toSpliced(1, 0, 15));
console.log('nums untouched:', nums);

// Classic trap: default sort compares as STRINGS
console.log('default toSorted:', [10, 9, 1, 100].toSorted());
console.log('numeric toSorted:', [10, 9, 1, 100].toSorted((a, b) => a - b));`,
      },
    ],
    quiz: [
      {
        q: 'After <code>const a = { n: { v: 1 } }; const b = { ...a }; b.n.v = 2;</code> what is <code>a.n.v</code>?',
        options: ['1', '2', 'undefined', 'TypeError'],
        answer: 1,
        why: 'Spread is shallow. b.n is the same object as a.n, so writing b.n.v changes a.n.v too.',
      },
      {
        q: 'In an ES module, what happens on <code>Object.freeze(o).x = 5</code> (where <code>x</code> already exists)?',
        options: [
          'It silently does nothing',
          'It throws a TypeError, because modules are strict mode',
          'It works, freeze only blocks new properties',
          'It unfreezes the object',
        ],
        answer: 1,
        why: 'Frozen properties are non-writable. Strict mode (always on in modules) turns failed writes into TypeErrors; sloppy scripts fail silently.',
      },
      {
        q: 'Which call leaves <code>arr</code> unchanged?',
        options: [
          '<code>arr.sort()</code>',
          '<code>arr.reverse()</code>',
          '<code>arr.toSorted()</code>',
          '<code>arr.splice(0, 1)</code>',
        ],
        answer: 2,
        why: 'toSorted (ES2023) returns a new sorted array. sort, reverse and splice all mutate in place.',
      },
      {
        q: 'What does <code>const</code> guarantee?',
        options: [
          'The object can never change',
          'The variable cannot be reassigned to a different value',
          'The object is deeply frozen',
          'Nothing in strict mode',
        ],
        answer: 1,
        why: 'const protects the binding, not the contents. const arr = []; arr.push(1) is perfectly legal.',
      },
      {
        q: 'What is <code>[10, 9, 1].toSorted()</code>?',
        options: ['[1, 9, 10]', '[1, 10, 9]', '[10, 9, 1]', '[9, 10, 1]'],
        answer: 1,
        why: 'Without a comparator, elements are compared as strings: "1" &lt; "10" &lt; "9". Pass (a, b) =&gt; a - b for numbers.',
      },
    ],
    exercise: {
      task: `<p>Write two non-mutating updaters:</p>
      <ul>
        <li><code>setFontSize(user, size)</code>: returns a new user with
        <code>prefs.fontSize = size</code>.</li>
        <li><code>addTag(user, tag)</code>: returns a new user with <code>tag</code> appended to
        <code>tags</code>.</li>
      </ul>
      <p>The original is deep-frozen, so any mutation will throw a <code>TypeError</code>.</p>`,
      starter: `const deepFreeze = (o) => {
  Object.values(o).forEach((v) => typeof v === 'object' && v !== null && deepFreeze(v));
  return Object.freeze(o);
};

const user = deepFreeze({
  name: 'Ana',
  tags: ['admin'],
  prefs: { fontSize: 14, theme: 'dark' },
});

const setFontSize = (u, size) => {
  // TODO: nested spread
  return u;
};

const addTag = (u, tag) => {
  // TODO: spread the tags array
  return u;
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const u2 = setFontSize(user, 20);
check('font updated', u2.prefs, { fontSize: 20, theme: 'dark' });
check('original untouched', user.prefs.fontSize, 14);
const u3 = addTag(user, 'beta');
check('tag added', u3.tags, ['admin', 'beta']);
check('original tags untouched', user.tags, ['admin']);
check('new object', u3 !== user && u2 !== user, true);`,
      hint: '({ ...u, prefs: { ...u.prefs, fontSize: size } }) and ({ ...u, tags: [...u.tags, tag] })',
      solution: `const deepFreeze = (o) => {
  Object.values(o).forEach((v) => typeof v === 'object' && v !== null && deepFreeze(v));
  return Object.freeze(o);
};

const user = deepFreeze({
  name: 'Ana',
  tags: ['admin'],
  prefs: { fontSize: 14, theme: 'dark' },
});

const setFontSize = (u, size) => ({ ...u, prefs: { ...u.prefs, fontSize: size } });

const addTag = (u, tag) => ({ ...u, tags: [...u.tags, tag] });

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const u2 = setFontSize(user, 20);
check('font updated', u2.prefs, { fontSize: 20, theme: 'dark' });
check('original untouched', user.prefs.fontSize, 14);
const u3 = addTag(user, 'beta');
check('tag added', u3.tags, ['admin', 'beta']);
check('original tags untouched', user.tags, ['admin']);
check('new object', u3 !== user && u2 !== user, true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── structural-sharing
  {
    id: 'structural-sharing',
    section: 'Foundations',
    title: 'Structural Sharing',
    explain: `
      <p>"Copy instead of mutate" sounds expensive. Do we deep-copy the whole app state on
      every keystroke? No. An immutable update copies <strong>only the path from the root to
      the changed value</strong>. Every other branch is <em>reused by reference</em>. This is
      <strong>structural sharing</strong>.</p>
      <pre><code>// change state.user.address.city
const next = {
  ...state,                          // new root, reuses settings + todos
  user: {
    ...state.user,                   // new user, reuses name
    address: { ...state.user.address, city: 'Paris' },  // new address
  },
};</code></pre>
      <p>Three new objects (root, user, address). <code>settings</code> and
      <code>todos</code> are the <em>exact same objects</em> as before, no matter how big they
      are. Cost is proportional to the depth of the path, not the size of the state.</p>

      <h3>Free change detection with <code>===</code></h3>
      <p>Because unchanged branches keep their identity, and changed branches always get a new
      object, <code>prev.todos === next.todos</code> answers "did todos change?" in constant
      time, without comparing contents. React's <code>memo</code>, <code>useMemo</code>
      dependencies, Redux selectors and <code>useSyncExternalStore</code> all rely on this.</p>
      <div class="warn">This only works if nobody mutates. If you <code>push</code> into
      <code>state.todos</code>, the array's identity stays the same while its contents change,
      and every <code>===</code> check says "nothing changed". You get stale UI.</div>
      <div class="tip">Libraries like Immer let you write mutation-style code that produces
      structurally shared copies. Persistent data structures (as in Clojure or Immutable.js) go
      further with tries for big collections. The core idea is the one in this lesson.</div>
    `,
    examples: [
      {
        title: 'Which nodes are new, which are shared? (tree view)',
        code: `const state = {
  user: { name: 'Ana', address: { city: 'Lyon', zip: '69001' } },
  settings: { theme: 'dark' },
  todos: [{ id: 1, text: 'learn FP' }],
};

// Immutable update of state.user.address.city
const next = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'Paris' },
  },
};

const paths = [
  ['root', (s) => s],
  ['user', (s) => s.user],
  ['user.address', (s) => s.user.address],
  ['settings', (s) => s.settings],
  ['todos', (s) => s.todos],
  ['todos[0]', (s) => s.todos[0]],
];

for (const [label, get] of paths) {
  console.log(label.padEnd(13), get(state) === get(next) ? 'shared' : 'NEW');
}
console.log('old city:', state.user.address.city, '| new city:', next.user.address.city);

// Draw the tree: orange = new object, green = shared with the old state
const node = (label, isNew, depth) =>
  '<div style="margin-left:' + depth * 22 + 'px;padding:4px 8px;margin-top:4px;' +
  'border-radius:6px;display:inline-block;font:13px monospace;color:#111;background:' +
  (isNew ? '#fdba74' : '#86efac') + '">' + label + (isNew ? ' (new)' : ' (shared)') +
  '</div><br>';

const depthOf = (label) => (label === 'root' ? 0 : label.split(/[.[]/).length);
document.getElementById('root').innerHTML = paths
  .map(([label, get]) => node(label, get(state) !== get(next), depthOf(label)))
  .join('');`,
        explain: `
          <details>
            <summary>The problem: deep-copying everything is wasteful and loses identity</summary>
            <p>You could <code>structuredClone(state)</code> and then set the city. It's
            correct, but every object becomes new, including the untouched <code>todos</code>.
            Now <code>prev.todos !== next.todos</code> even though nothing in todos changed, so
            every memoized component or selector depending on todos recomputes.</p>
          </details>
          <details>
            <summary>Step by step: what the update creates</summary>
            <table>
              <tr><th>Node</th><th>How it's built</th><th><code>state.x === next.x</code></th><th>Console</th></tr>
              <tr><td>root</td><td><code>{ ...state, user }</code></td><td>false</td><td><code>root          NEW</code></td></tr>
              <tr><td>user</td><td><code>{ ...state.user, address }</code></td><td>false</td><td><code>user          NEW</code></td></tr>
              <tr><td>user.address</td><td><code>{ ...address, city: 'Paris' }</code></td><td>false</td><td><code>user.address  NEW</code></td></tr>
              <tr><td>settings</td><td>copied by the root spread (a reference)</td><td>true</td><td><code>settings      shared</code></td></tr>
              <tr><td>todos</td><td>copied by the root spread (a reference)</td><td>true</td><td><code>todos         shared</code></td></tr>
              <tr><td>todos[0]</td><td>inside a shared array</td><td>true</td><td><code>todos[0]      shared</code></td></tr>
            </table>
            <p>Last line: <code>old city: Lyon | new city: Paris</code>. The old state is
            still fully intact: you get "undo" for free by keeping a reference to it.</p>
          </details>
          <details>
            <summary>Key idea: copy the path, share the rest</summary>
            <pre><code>      root*                  * = new object
     /  |  \\
 user*  settings  todos      settings, todos: same references
   |
 address*                    only the path to 'city' is copied</code></pre>
            <p>Each <code>...spread</code> copies <em>references</em> to the children of one
            node. The one child we override gets a new object; the others are the originals.
            That's why the update is cheap: 3 small objects, regardless of how many todos
            there are.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Replace the update with <code>const next = structuredClone(state);
              next.user.address.city = 'Paris';</code>. Every node turns orange.</li>
              <li>Add a todo immutably as well:
              <code>todos: [...state.todos, { id: 2, text: 'x' }]</code> inside the root
              object. Now <code>todos</code> is NEW but <code>todos[0]</code> is still shared.</li>
            </ul>
          </details>
        `,
      },
      {
        title: '=== as cheap change detection (and how mutation breaks it)',
        code: `// A selector that only recomputes when its input array changes identity
let computeCount = 0;
let lastTodos = null;
let lastResult = null;

const selectOpenCount = (state) => {
  if (state.todos === lastTodos) return lastResult; // ① O(1) check
  computeCount++;
  lastTodos = state.todos;
  lastResult = state.todos.filter((t) => !t.done).length;
  return lastResult;
};

let state = { filter: 'all', todos: [{ text: 'a', done: false }] };
console.log('1. open:', selectOpenCount(state), '| computed:', computeCount);

state = { ...state, filter: 'done' }; // ② unrelated change: todos shared
console.log('2. open:', selectOpenCount(state), '| computed:', computeCount);

state = { ...state, todos: [...state.todos, { text: 'b', done: false }] }; // ③
console.log('3. open:', selectOpenCount(state), '| computed:', computeCount);

state.todos.push({ text: 'c', done: false }); // ④ MUTATION: same identity
console.log('4. open:', selectOpenCount(state), '| computed:', computeCount,
  '| real:', state.todos.length);`,
        explain: `
          <details>
            <summary>Step by step</summary>
            <table>
              <tr><th>Step</th><th>todos identity</th><th>Selector</th><th>Console</th></tr>
              <tr><td>1. first call</td><td>A (first time seen)</td><td>computes</td><td><code>1. open: 1 | computed: 1</code></td></tr>
              <tr><td>2. change <code>filter</code></td><td>A (shared)</td><td>cache hit ✅</td><td><code>2. open: 1 | computed: 1</code></td></tr>
              <tr><td>3. add todo immutably</td><td>B (new array)</td><td>recomputes ✅</td><td><code>3. open: 2 | computed: 2</code></td></tr>
              <tr><td>4. <code>push</code> in place</td><td>B (same array, new contents)</td><td>cache hit ❌ stale</td><td><code>4. open: 2 | computed: 2 | real: 3</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><strong>①</strong> Instead of comparing every todo, compare one reference. Only
              valid if "same reference" really means "same contents", i.e. nobody mutates.</li>
              <li><strong>②</strong> Changing <code>filter</code> creates a new root but keeps the
              <code>todos</code> reference, so the selector correctly skips work.</li>
              <li><strong>③</strong> A new array means "changed" and the selector recomputes.</li>
              <li><strong>④</strong> <code>push</code> changes contents but not identity. The
              selector can't tell, and returns 2 while there are 3 open todos. This is the
              classic "I updated state but React didn't re-render" bug.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Immutability and <code>===</code> change detection are a
            <em>contract</em>. One mutation anywhere breaks every cache that relies on it, and
            the symptom (stale screen) shows up far away from the cause (the
            <code>push</code>).</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'After an immutable update of <code>state.user.name</code>, which is true?',
        options: [
          '<code>next.settings !== state.settings</code>',
          '<code>next.user === state.user</code>',
          '<code>next.settings === state.settings</code> and <code>next.user !== state.user</code>',
          'Every nested object is new',
        ],
        answer: 2,
        why: 'Only the path root → user is copied. settings is reused by reference via the spread.',
      },
      {
        q: 'Why is <code>prev.todos === next.todos</code> a valid "did todos change?" check?',
        options: [
          '=== compares contents deeply',
          'With immutable updates, any change creates a new array, and no change keeps the same one',
          'Arrays are primitives',
          'It is not valid',
        ],
        answer: 1,
        why: '=== compares identity. Immutability guarantees identity changes exactly when contents change, making identity a cheap proxy for equality.',
      },
      {
        q: 'What does <code>state.todos.push(x)</code> do to identity-based change detection?',
        options: [
          'Nothing, it still works',
          'It breaks it: contents changed but the reference is the same, so caches return stale data',
          'It makes every check return false',
          'It throws',
        ],
        answer: 1,
        why: 'push mutates in place. Any selector or memo comparing references thinks nothing changed.',
      },
      {
        q: 'How much work does an immutable update of a value 3 levels deep do in a state with 10,000 todos (not on the path)?',
        options: [
          'Copies all 10,000 todos',
          'Creates about 3 new small objects; todos are shared',
          'Deep clones the state',
          'Depends on the browser',
        ],
        answer: 1,
        why: 'Cost is proportional to the path length. Unchanged branches are copied by reference only.',
      },
    ],
    exercise: {
      task: `<p>Write a recursive <code>setIn(obj, path, value)</code> that returns a new object
      with <code>value</code> at <code>path</code> (an array of keys), copying only the objects
      along the path. Siblings must be shared (same reference). Plain objects only; you don't
      need to handle arrays.</p>`,
      starter: `const setIn = (obj, path, value) => {
  // TODO: if path is empty, return value
  // otherwise copy obj and recurse into obj[path[0]] with the rest of the path
  return obj;
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const state = { a: { b: { c: 1 }, sib: { x: 1 } }, other: { y: 2 } };
const next = setIn(state, ['a', 'b', 'c'], 99);

check('value set', next.a.b.c, 99);
check('original untouched', state.a.b.c, 1);
check('path copied', [next !== state, next.a !== state.a, next.a.b !== state.a.b],
  [true, true, true]);
check('siblings shared', [next.other === state.other, next.a.sib === state.a.sib],
  [true, true]);
check('top-level key', setIn({ k: 1 }, ['k'], 2), { k: 2 });`,
      hint: 'const [key, ...rest] = path; return path.length === 0 ? value : { ...obj, [key]: setIn(obj[key], rest, value) };',
      solution: `const setIn = (obj, path, value) => {
  if (path.length === 0) return value;
  const [key, ...rest] = path;
  return { ...obj, [key]: setIn(obj[key], rest, value) };
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const state = { a: { b: { c: 1 }, sib: { x: 1 } }, other: { y: 2 } };
const next = setIn(state, ['a', 'b', 'c'], 99);

check('value set', next.a.b.c, 99);
check('original untouched', state.a.b.c, 1);
check('path copied', [next !== state, next.a !== state.a, next.a.b !== state.a.b],
  [true, true, true]);
check('siblings shared', [next.other === state.other, next.a.sib === state.a.sib],
  [true, true]);
check('top-level key', setIn({ k: 1 }, ['k'], 2), { k: 2 });`,
    },
  },

  // ───────────────────────────────────────────────────────────── functional-core
  {
    id: 'functional-core',
    section: 'Foundations',
    title: 'Functional Core, Imperative Shell',
    explain: `
      <p>Programs must have effects: print, save, send email, read the clock. FP doesn't ban
      them, it <strong>moves them to the edges</strong>. The architecture is:</p>
      <ul>
        <li><strong>Functional core</strong>: pure functions holding all the decisions and
        business rules. Takes plain data (including "what time is it" and "what's in the
        database"), returns plain data, often a <em>description</em> of what should happen.</li>
        <li><strong>Imperative shell</strong>: a thin layer that gathers inputs (read the DB,
        the clock), calls the core, then <em>performs</em> the effects the core described.
        Little or no logic.</li>
      </ul>
      <pre><code>shell: read inputs  ──&gt;  core: decide (pure)  ──&gt;  shell: perform effects
       (IO)                  data in → data out           (IO)</code></pre>

      <h3>Effects as data</h3>
      <p>The trick is to have the core return <em>commands</em> rather than doing things:
      <code>{ type: 'email', to: 'ana@x.io', text: '...' }</code> instead of calling
      <code>sendEmail()</code>. A list of commands is just an array: you can log it, test it,
      dry-run it, or execute it.</p>

      <h3>Why it pays off</h3>
      <ul>
        <li><strong>Tests without mocks.</strong> The core is where bugs live, and it's pure:
        call it with data, assert on data.</li>
        <li><strong>The shell is boring.</strong> So boring it barely needs tests: a loop that
        turns commands into calls.</li>
        <li><strong>Easy to change effects.</strong> Swap console for a real mailer, or add a
        "dry run" mode, without touching the rules.</li>
      </ul>
      <div class="tip">You'll see this shape everywhere: Redux reducers (pure) + middleware
      (effects), Elm's update + commands, React render (pure) + effects. The term comes from Gary
      Bernhardt's talk "Boundaries".</div>
    `,
    examples: [
      {
        title: 'Overdue invoice reminders: pure decisions, thin shell',
        code: `// ───── Functional core (pure) ─────
const DAY = 24 * 60 * 60 * 1000;
const FINANCE = 'finance@shop.io';

const daysOverdue = (invoice, now) => Math.floor((now - invoice.dueAt) / DAY);

// Returns a LIST OF COMMANDS. It never sends anything itself.
function planReminders(invoices, now) {
  return invoices
    .filter((inv) => !inv.paid)
    .map((inv) => ({ inv, days: daysOverdue(inv, now) }))
    .filter(({ days }) => days > 0)
    .map(({ inv, days }) =>
      days > 30
        ? { type: 'escalate', to: FINANCE, text: inv.id + ' is ' + days + 'd late' }
        : { type: 'email', to: inv.email, text: 'Friendly reminder: ' + inv.id });
}

// ───── Imperative shell (effects) ─────
const effects = {
  email: (cmd) => console.log('📧 to', cmd.to + ':', cmd.text),
  escalate: (cmd) => console.warn('🚨 to', cmd.to + ':', cmd.text),
};

function runShell() {
  const now = Date.UTC(2026, 0, 31); // in a real app: Date.now()
  const invoices = [ // in a real app: await db.query(...)
    { id: 'INV-1', email: 'ana@x.io', paid: false, dueAt: Date.UTC(2026, 0, 20) },
    { id: 'INV-2', email: 'ben@x.io', paid: true, dueAt: Date.UTC(2025, 11, 1) },
    { id: 'INV-3', email: 'cy@x.io', paid: false, dueAt: Date.UTC(2025, 11, 1) },
    { id: 'INV-4', email: 'dee@x.io', paid: false, dueAt: Date.UTC(2026, 1, 15) },
  ];

  const commands = planReminders(invoices, now); // the only "thinking" step
  for (const cmd of commands) effects[cmd.type](cmd); // dumb executor
}

runShell();`,
      },
      {
        title: 'Testing the core: just data in, data out',
        code: `const DAY = 24 * 60 * 60 * 1000;
const FINANCE = 'finance@shop.io';
const daysOverdue = (invoice, now) => Math.floor((now - invoice.dueAt) / DAY);

function planReminders(invoices, now) {
  return invoices
    .filter((inv) => !inv.paid)
    .map((inv) => ({ inv, days: daysOverdue(inv, now) }))
    .filter(({ days }) => days > 0)
    .map(({ inv, days }) =>
      days > 30
        ? { type: 'escalate', to: FINANCE, text: inv.id + ' is ' + days + 'd late' }
        : { type: 'email', to: inv.email, text: 'Friendly reminder: ' + inv.id });
}

// Table-driven tests. No mocks, no fake mailer, no fake clock library.
const now = 100 * DAY;
const inv = (over) => ({ id: 'X', email: 'x@x.io', paid: false, dueAt: now, ...over });

const cases = [
  ['not due yet', [inv({ dueAt: now + DAY })], []],
  ['paid is ignored', [inv({ paid: true, dueAt: 0 })], []],
  ['5 days late -> email', [inv({ dueAt: now - 5 * DAY })], ['email']],
  ['31 days late -> escalate', [inv({ dueAt: now - 31 * DAY })], ['escalate']],
  ['exactly 30 -> email', [inv({ dueAt: now - 30 * DAY })], ['email']],
];

for (const [name, input, expectedTypes] of cases) {
  const types = planReminders(input, now).map((c) => c.type);
  const ok = JSON.stringify(types) === JSON.stringify(expectedTypes);
  console.log(ok ? '✅' : '❌', name, types);
}`,
      },
    ],
    quiz: [
      {
        q: 'In "functional core, imperative shell", where should the business rules live?',
        options: [
          'In the shell, next to the IO',
          'In the core, as pure functions',
          'Split evenly',
          'In global variables',
        ],
        answer: 1,
        why: 'The core holds the decisions and is pure, so it is easy to test. The shell only gathers inputs and performs effects.',
      },
      {
        q: 'Why does <code>planReminders</code> return command objects instead of calling <code>sendEmail</code>?',
        options: [
          'Objects are faster than function calls',
          'So the decision stays pure: it can be tested, logged or dry-run without sending anything',
          'Because JavaScript cannot send email',
          'To use less memory',
        ],
        answer: 1,
        why: 'Describing effects as data keeps the core pure. The shell decides when and how to actually execute them.',
      },
      {
        q: 'Where does <code>Date.now()</code> belong in this architecture?',
        options: [
          'Inside every core function that needs time',
          'In the shell, passed into the core as a parameter',
          'Nowhere, FP forbids time',
          'In a global constant set at startup',
        ],
        answer: 1,
        why: 'Reading the clock is an effect (a hidden input). The shell reads it once and passes now to the pure core.',
      },
      {
        q: 'What is a sign your shell is too thick?',
        options: [
          'It contains a for loop over commands',
          'It contains if/else business decisions like "escalate when over 30 days"',
          'It calls console.log',
          'It reads the database',
        ],
        answer: 1,
        why: 'Decisions in the shell can only be tested by faking IO. Move them into the core and let the shell just execute.',
      },
    ],
    exercise: {
      task: `<p>Write a pure core function <code>checkout(cart, stock)</code>:</p>
      <ul>
        <li>If any item's <code>qty</code> exceeds <code>stock[item.sku]</code>, return
        <code>{ ok: false, commands: [{ type: 'show', text: 'Out of stock: ' + sku }] }</code>
        for the <strong>first</strong> failing item.</li>
        <li>Otherwise return <code>{ ok: true, stock: newStock, commands: [{ type: 'show',
        text: 'Order placed' }, { type: 'charge', amount }] }</code> where <code>newStock</code>
        is a <em>new</em> object with quantities subtracted and <code>amount</code> is
        <code>sum(price * qty)</code>.</li>
      </ul>
      <p>The shell at the bottom is already written. Don't mutate <code>stock</code>.</p>`,
      starter: `function checkout(cart, stock) {
  // TODO: pure decision. Return { ok, stock?, commands }
  return { ok: false, commands: [] };
}

// ───── shell (done for you) ─────
const run = (commands) => {
  for (const c of commands) {
    if (c.type === 'show') console.log('UI:', c.text);
    if (c.type === 'charge') console.log('PAYMENT: charging', c.amount);
  }
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const stock = { tea: 5, cake: 1 };
const good = checkout([{ sku: 'tea', qty: 2, price: 3 }], stock);
run(good.commands);
check('ok', good.ok, true);
check('new stock', good.stock, { tea: 3, cake: 1 });
check('charge', good.commands, [
  { type: 'show', text: 'Order placed' },
  { type: 'charge', amount: 6 },
]);
check('stock untouched', stock, { tea: 5, cake: 1 });

const bad = checkout([{ sku: 'tea', qty: 1, price: 3 }, { sku: 'cake', qty: 2, price: 5 }],
  stock);
check('out of stock', bad, {
  ok: false,
  commands: [{ type: 'show', text: 'Out of stock: cake' }],
});`,
      hint: 'const missing = cart.find(i => i.qty > (stock[i.sku] ?? 0)); if (missing) return {...}. Build newStock with cart.reduce((s, i) => ({ ...s, [i.sku]: s[i.sku] - i.qty }), stock).',
      solution: `function checkout(cart, stock) {
  const missing = cart.find((i) => i.qty > (stock[i.sku] ?? 0));
  if (missing) {
    const text = 'Out of stock: ' + missing.sku;
    return { ok: false, commands: [{ type: 'show', text }] };
  }
  const newStock = cart.reduce((s, i) => ({ ...s, [i.sku]: s[i.sku] - i.qty }), stock);
  const amount = cart.reduce((sum, i) => sum + i.price * i.qty, 0);
  return {
    ok: true,
    stock: newStock,
    commands: [{ type: 'show', text: 'Order placed' }, { type: 'charge', amount }],
  };
}

// ───── shell (done for you) ─────
const run = (commands) => {
  for (const c of commands) {
    if (c.type === 'show') console.log('UI:', c.text);
    if (c.type === 'charge') console.log('PAYMENT: charging', c.amount);
  }
};

const check = (name, actual, expected) =>
  console.log(JSON.stringify(actual) === JSON.stringify(expected) ? '✅' : '❌', name,
    JSON.stringify(actual));

const stock = { tea: 5, cake: 1 };
const good = checkout([{ sku: 'tea', qty: 2, price: 3 }], stock);
run(good.commands);
check('ok', good.ok, true);
check('new stock', good.stock, { tea: 3, cake: 1 });
check('charge', good.commands, [
  { type: 'show', text: 'Order placed' },
  { type: 'charge', amount: 6 },
]);
check('stock untouched', stock, { tea: 5, cake: 1 });

const bad = checkout([{ sku: 'tea', qty: 1, price: 3 }, { sku: 'cake', qty: 2, price: 5 }],
  stock);
check('out of stock', bad, {
  ok: false,
  commands: [{ type: 'show', text: 'Out of stock: cake' }],
});`,
    },
  },
);
