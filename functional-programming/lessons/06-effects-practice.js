window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ─────────────────────────────────────────────────────────────────── io-task
  {
    id: 'io-task',
    section: 'Effects & FP in Practice',
    title: 'Lazy Effects: IO & Task',
    explain: `
      <p>Real programs must log, read storage, call APIs. Those are side effects, and they break
      purity: calling <code>readName()</code> twice can give two answers. FP's trick is not to
      avoid effects but to <strong>separate describing an effect from running it</strong>.</p>

      <h3>The thunk trick</h3>
      <p>A function that does an effect is impure. A function that <em>returns a function</em>
      that would do the effect is pure: calling it does nothing, and it always returns an
      equivalent description.</p>
      <pre><code>const readName = () =&gt; storage.name;           // calling it = effect happens
const readNameIO = () =&gt; () =&gt; storage.name;   // calling it = you get a recipe</code></pre>

      <h3>IO: a thunk with map and chain</h3>
      <pre><code>const IO = run =&gt; ({
  run,
  map: f =&gt; IO(() =&gt; f(run())),
  chain: f =&gt; IO(() =&gt; f(run()).run()),
});</code></pre>
      <p><code>map</code> and <code>chain</code> do not run anything. They build a
      <em>bigger</em> recipe. The whole program is a single value, and only the very edge of the
      app calls <code>.run()</code>. Everything above that call stays pure and easy to
      test.</p>

      <h3>Task: IO for async (a lazy Promise)</h3>
      <p>A <strong>Task</strong> wraps a function <code>fork(reject, resolve)</code>. Like IO it
      does nothing until you <code>fork</code> it (or call <code>run()</code>, which here
      returns a Promise for convenience). Compared with a Promise:</p>
      <table>
        <tr><th></th><th>Promise</th><th>Task</th></tr>
        <tr><td>Starts work</td><td>immediately at <code>new Promise</code></td>
          <td>only on <code>fork</code>/<code>run</code></td></tr>
        <tr><td>Run twice</td><td>impossible; result is cached</td><td>yes, each run is fresh (retry!)</td></tr>
        <tr><td>map / chain</td><td>both via <code>then</code>, auto-flattening</td>
          <td>separate, lawful</td></tr>
        <tr><td>Can hold a thenable</td><td>no</td><td>yes</td></tr>
      </table>
      <div class="tip">You already use lazy effects: <code>() =&gt; fetch(url)</code> passed to a
      retry helper, React's <code>useEffect(() =&gt; ...)</code>, and test framework callbacks are
      all "describe now, run later". IO/Task just add <code>map</code>/<code>chain</code> so the
      descriptions compose.</div>
      <div class="warn">Laziness only helps if you do not call <code>run()</code> in the middle of
      your logic. Calling <code>.run()</code> inside a <code>map</code> puts you back in eager,
      impure land. Run once, at the edge.</div>
    `,
    examples: [
      {
        title: 'IO: build a program, then run it (twice)',
        code: `const IO = run => ({
  run,
  map: f => IO(() => f(run())),
  chain: f => IO(() => f(run()).run()),
});
IO.of = x => IO(() => x);

// A fake "world" so the demo is self-contained
const storage = { name: 'Ana' };
const effects = [];

const readKey = key =>
  IO(() => {
    effects.push('read ' + key);
    return storage[key];
  });
const writeKey = (key, value) =>
  IO(() => {
    effects.push('write ' + key);
    storage[key] = value;
    return value;
  });
const log = msg =>
  IO(() => {
    console.log('  [effect] ' + msg);
    return msg;
  });

// Building the program is pure: nothing below touches storage or the console
const program = readKey('name')
  .map(name => name.toUpperCase())
  .chain(upper => writeKey('shout', upper))
  .chain(saved => log('saved ' + saved));

console.log('built. effects:', effects.length, '| storage:', JSON.stringify(storage));

console.log('run #1');
program.run();
console.log('effects:', effects.join(', '), '| storage:', JSON.stringify(storage));

console.log('run #2 (same description, runs again)');
program.run();
console.log('effects count:', effects.length);`,
      },
      {
        title: 'Task vs Promise: who starts work, and when?',
        explain: `
          <details>
            <summary>The problem: a Promise starts the moment you create it</summary>
            <p>Both <code>p</code> and <code>t</code> describe "fetch 1, then multiply by 10". But
            the Promise's request starts on the line that creates it, before anyone has asked for
            the value. The Task's request starts only when <code>run()</code> is called, and a
            second <code>run()</code> starts a second request.</p>
          </details>
          <details>
            <summary>Step by step: the real log order</summary>
            <table>
              <tr><th>#</th><th>Console</th><th>Why</th></tr>
              <tr><td>1</td><td><code>A. create promise</code></td><td>sync</td></tr>
              <tr><td>2</td><td><code>  promise: request STARTS</code></td>
                <td>Promise executor runs inside <code>new Promise</code></td></tr>
              <tr><td>3</td><td><code>B. create task</code></td><td>sync</td></tr>
              <tr><td>4</td><td><code>C. both created, waiting 100ms...</code></td>
                <td>Task has <em>not</em> started: no "task: request STARTS" yet</td></tr>
              <tr><td>5</td><td><code>D. promise value: 10 (it already ran)</code></td>
                <td>p finished during the wait (50ms timer)</td></tr>
              <tr><td>6</td><td><code>E. running task now</code></td><td></td></tr>
              <tr><td>7</td><td><code>  task: request STARTS</code></td><td><code>run()</code> calls fork</td></tr>
              <tr><td>8</td><td><code>F. task value: 10</code></td><td>after 50ms</td></tr>
              <tr><td>9</td><td><code>G. run task again</code></td><td></td></tr>
              <tr><td>10</td><td><code>  task: request STARTS</code></td><td>a fresh run, not a cache</td></tr>
              <tr><td>11</td><td><code>H. task value: 10 (fresh request)</code></td><td></td></tr>
              <tr><td>12</td><td><code>I. chained task</code></td><td></td></tr>
              <tr><td>13</td><td><code>  task: request STARTS</code></td><td>first step</td></tr>
              <tr><td>14</td><td><code>  second: request STARTS</code></td>
                <td>second step starts only after the first resolves</td></tr>
              <tr><td>15</td><td><code>J. chained value: 11</code></td><td>10 + 1 from the second step</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>map: f =&gt; Task((rej, res) =&gt; fork(rej, x =&gt; res(f(x)))),            // ①
chain: f =&gt; Task((rej, res) =&gt; fork(rej, x =&gt; f(x).fork(rej, res))), // ②
run: () =&gt; new Promise((res, rej) =&gt; fork(rej, res)),                 // ③</code></pre>
            <ol>
              <li><strong>①</strong> <code>map</code> returns a new Task whose fork calls the old
              fork with a resolve that applies <code>f</code> first. No fork is called yet.</li>
              <li><strong>②</strong> <code>chain</code>: when the first Task resolves with
              <code>x</code>, build the next Task <code>f(x)</code> and fork <em>it</em> with the
              outer callbacks. That is the "flatten" step.</li>
              <li><strong>③</strong> <code>run</code> is the edge of the world. Only here does
              <code>fork</code> finally get called. Each call is a new Promise, so a new run.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Delete the <code>await t.run()</code> lines. "task: request STARTS" never appears:
              an unrun Task costs nothing.</li>
              <li>Write <code>const retry = (task, n) =&gt; ...</code> that forks again on reject.
              It is only possible because a Task can be re-run.</li>
            </ul>
          </details>
        `,
        code: `const sleep = ms => new Promise(r => setTimeout(r, ms));

const Task = fork => ({
  fork,
  map: f => Task((rej, res) => fork(rej, x => res(f(x)))),
  chain: f => Task((rej, res) => fork(rej, x => f(x).fork(rej, res))),
  run: () => new Promise((res, rej) => fork(rej, res)),
});
Task.of = x => Task((_, res) => res(x));

// A fake request in fork(reject, resolve) style
const fakeFetch = (label, value) => (rej, res) => {
  console.log('  ' + label + ': request STARTS');
  setTimeout(() => res(value), 50);
};

console.log('A. create promise');
const p = new Promise((res, rej) => fakeFetch('promise', 1)(rej, res)).then(x => x * 10);

console.log('B. create task');
const t = Task(fakeFetch('task', 1)).map(x => x * 10);

console.log('C. both created, waiting 100ms...');
await sleep(100);
console.log('D. promise value:', await p, '(it already ran)');

console.log('E. running task now');
console.log('F. task value:', await t.run());

console.log('G. run task again');
console.log('H. task value:', await t.run(), '(fresh request)');

console.log('I. chained task');
const both = t.chain(x => Task(fakeFetch('second', x + 1)));
console.log('J. chained value:', await both.run());`,
      },
    ],
    quiz: [
      {
        q: 'Why is <code>const readIO = key =&gt; IO(() =&gt; storage[key])</code> a pure function?',
        options: [
          'Because storage never changes',
          'Calling it only builds a description; no effect happens until .run() is called',
          'Because it uses an arrow function',
          'It is not pure',
        ],
        answer: 1,
        why: 'Same input → an equivalent IO value, every time, with no observable effect. The effect is deferred to run().',
      },
      {
        q: 'What does <code>IO.map(f)</code> do when you call it?',
        options: [
          'Runs the IO and applies f',
          'Returns a new IO that, when run, will run the old one and apply f',
          'Mutates the IO',
          'Throws if the IO was not run',
        ],
        answer: 1,
        why: 'map composes recipes: IO(() => f(run())). Nothing executes until the final run.',
      },
      {
        q: 'In the Task vs Promise demo, when does "task: request STARTS" first appear?',
        options: [
          'Right after "B. create task"',
          'Right after "E. running task now"',
          'Before "A."',
          'Never',
        ],
        answer: 1,
        why: 'Creating and mapping a Task never calls fork. Only run() (step E) does.',
      },
      {
        q: 'Which can you do with a Task but not with an already-created Promise?',
        options: [
          'Get its value with await',
          'Run the same work again (e.g. retry) from the same value',
          'Chain a step after it',
          'Handle errors',
        ],
        answer: 1,
        why: 'A Promise caches its single result. A Task is a description; every run/fork is a new execution.',
      },
      {
        q: 'Where should <code>.run()</code> be called in an IO/Task-based program?',
        options: [
          'Inside every map callback',
          'Once, at the edge (entry point, event handler, test)',
          'In the constructor',
          'Never',
        ],
        answer: 1,
        why: 'Keep the core as pure descriptions; run them at the boundary. Running inside map reintroduces eager, hidden effects.',
      },
    ],
    exercise: {
      task: `
        <p>Implement <code>Task.chain</code>, then build <code>loadProfile(id)</code> that first
        runs <code>fetchUser(id)</code> and then <code>fetchPosts(user.name)</code>, resolving to
        <code>{ name, posts }</code>. The checks also verify that <em>building</em> the task starts
        no requests.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Task = fork => ({
  fork,
  map: f => Task((rej, res) => fork(rej, x => res(f(x)))),
  // TODO: when this task resolves with x, fork f(x) with rej/res
  chain: f => Task(fork),
  run: () => new Promise((res, rej) => fork(rej, res)),
});

let requests = 0;
const fakeTask = value =>
  Task((rej, res) => {
    requests++;
    setTimeout(() => res(value), 10);
  });
const fetchUser = id => fakeTask({ id, name: 'user' + id });
const fetchPosts = name => fakeTask([name + ':hello', name + ':fp']);

// TODO: chain fetchUser -> fetchPosts, map to { name, posts }
const loadProfile = id => fetchUser(id);

const task = loadProfile(7);
check('lazy: no requests yet', requests, 0);
const result = await task.run();
check('profile', result, { name: 'user7', posts: ['user7:hello', 'user7:fp'] });
check('two requests', requests, 2);`,
      hint: 'chain: f => Task((rej, res) => fork(rej, x => f(x).fork(rej, res))). loadProfile: fetchUser(id).chain(u => fetchPosts(u.name).map(posts => ({ name: u.name, posts }))).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Task = fork => ({
  fork,
  map: f => Task((rej, res) => fork(rej, x => res(f(x)))),
  chain: f => Task((rej, res) => fork(rej, x => f(x).fork(rej, res))),
  run: () => new Promise((res, rej) => fork(rej, res)),
});

let requests = 0;
const fakeTask = value =>
  Task((rej, res) => {
    requests++;
    setTimeout(() => res(value), 10);
  });
const fetchUser = id => fakeTask({ id, name: 'user' + id });
const fetchPosts = name => fakeTask([name + ':hello', name + ':fp']);

const loadProfile = id =>
  fetchUser(id).chain(user =>
    fetchPosts(user.name).map(posts => ({ name: user.name, posts }))
  );

const task = loadProfile(7);
check('lazy: no requests yet', requests, 0);
const result = await task.run();
check('profile', result, { name: 'user7', posts: ['user7:hello', 'user7:fp'] });
check('two requests', requests, 2);`,
    },
  },

  // ──────────────────────────────────────────────────────────────────── reader
  {
    id: 'reader',
    section: 'Effects & FP in Practice',
    title: 'Reader: Dependency Injection, Functionally',
    explain: `
      <p>Deep inside your code, a function needs the config, the logger, or the current
      locale. Your options are usually: import a global (hard to test), or pass
      <code>config</code> through every function on the way down, even the ones that do not use it
      ("prop drilling").</p>

      <h3>Idea: a function of the environment</h3>
      <p>A <strong>Reader</strong> is just a function <code>env =&gt; value</code> with
      <code>map</code> and <code>chain</code>. You describe computations that <em>need</em> an
      environment, compose them, and supply the environment once at the top with
      <code>.run(env)</code>.</p>
      <pre><code>const Reader = run =&gt; ({
  run,
  map: f =&gt; Reader(env =&gt; f(run(env))),
  chain: f =&gt; Reader(env =&gt; f(run(env)).run(env)), // same env passed to the next step
});
const ask = Reader(env =&gt; env);   // "give me the environment"
const asks = f =&gt; Reader(f);      // "give me part of it"</code></pre>
      <p>The key line is <code>chain</code>: the <strong>same</strong> <code>env</code> is handed
      to every step automatically. Middle layers never mention it.</p>

      <h3>Do you need the wrapper?</h3>
      <p>Honestly, in JavaScript, often not. Two plain-function patterns get you most of the
      benefit:</p>
      <ul>
        <li><strong>Curry the env first:</strong> <code>const greet = env =&gt; name =&gt; ...</code>.
        A Reader without the methods.</li>
        <li><strong>Factory with closures:</strong> <code>const makeService = deps =&gt; ({ ... })</code>.
        Build once with real deps in production and fakes in tests.</li>
      </ul>
      <p>Reader shines when many small env-dependent pieces are composed, because
      <code>chain</code> removes the plumbing. React Context is the same idea, applied to a
      component tree.</p>
      <div class="tip">Reader makes dependencies explicit and swappable: testing becomes
      <code>program.run(fakeEnv)</code>, with no module mocking.</div>
      <div class="warn">Reader is read-only by design. If steps need to <em>update</em> shared data,
      that is the State monad (next lesson). Do not put mutable objects in the env and mutate them
      from steps.</div>
    `,
    examples: [
      {
        title: 'Threading config by hand vs Reader',
        code: `// ❌ By hand: every layer takes config, even if it only passes it on
const greetingA = (config, name) =>
  (config.lang === 'th' ? 'Sawasdee ' : 'Hello ') + name;
const headerA = (config, name) => '[' + config.appName + '] ' + greetingA(config, name);
const pageA = (config, name) => headerA(config, name) + (config.debug ? ' (debug)' : '');

// ✅ Reader: computations that need an env, run later
const Reader = run => ({
  run,
  map: f => Reader(env => f(run(env))),
  chain: f => Reader(env => f(run(env)).run(env)),
});
Reader.of = x => Reader(() => x);
const ask = Reader(env => env);
const asks = f => Reader(f);

const greeting = name => asks(env => (env.lang === 'th' ? 'Sawasdee ' : 'Hello ') + name);
const header = name =>
  greeting(name).chain(g => asks(env => '[' + env.appName + '] ' + g));
const page = name =>
  header(name).chain(h => ask.map(env => h + (env.debug ? ' (debug)' : '')));

const prod = { appName: 'Shop', lang: 'en', debug: false };
const test = { appName: 'Shop-TEST', lang: 'th', debug: true };

console.log('by hand:', pageA(prod, 'Ana'));
console.log('reader prod:', page('Ana').run(prod));
console.log('reader test:', page('Ana').run(test));

// The program is a value: build once, run with many envs
const program = page('Ben');
console.log([prod, test].map(env => program.run(env)));`,
      },
      {
        title: 'Plain-function DI: services from an env',
        code: `// The env holds dependencies (here: fakes so the demo is self-contained)
const makeEnv = (label, users) => ({
  db: { findUser: id => users[id] ?? null },
  logger: { lines: [], info(msg) { this.lines.push(label + ': ' + msg); } },
  now: () => '2026-01-01T00:00:00Z',
});

// Each function is env => args => result (a Reader without the wrapper)
const findUser = env => id => {
  env.logger.info('findUser ' + id);
  return env.db.findUser(id);
};
const welcome = env => id => {
  const user = findUser(env)(id);
  return user ? 'Welcome back, ' + user.name + ' (' + env.now() + ')' : 'Who are you?';
};

const prodEnv = makeEnv('prod', { 1: { name: 'Ana' } });
const testEnv = makeEnv('test', {});

console.log(welcome(prodEnv)(1));
console.log(welcome(testEnv)(1));
console.log('prod log:', prodEnv.logger.lines);
console.log('test log:', testEnv.logger.lines);`,
      },
    ],
    quiz: [
      {
        q: 'What is a Reader, underneath?',
        options: ['A class with a cache', 'A function from an environment to a value', 'A Promise', 'A global variable'],
        answer: 1,
        why: 'Reader wraps env => value and adds map/chain so such functions compose.',
      },
      {
        q: 'In <code>chain: f =&gt; Reader(env =&gt; f(run(env)).run(env))</code>, what is special about <code>env</code>?',
        options: [
          'It is cloned for each step',
          'The same env is passed to the current step and to the next Reader returned by f',
          'It is updated by each step',
          'It is ignored by f',
        ],
        answer: 1,
        why: 'That is the plumbing Reader saves you: every step gets the same environment without mentioning it.',
      },
      {
        q: 'What does <code>ask</code> return when run with <code>{ lang: "th" }</code>?',
        options: ['undefined', '"th"', '{ lang: "th" }', 'a function'],
        answer: 2,
        why: 'ask = Reader(env => env). It exposes the whole environment as the value.',
      },
      {
        q: 'Which is a lightweight plain-JS alternative to a Reader wrapper?',
        options: [
          'Global singletons',
          'Currying the env first: env => args => result, or a factory makeService(deps)',
          'Mutating module exports in tests',
          'Using eval',
        ],
        answer: 1,
        why: 'Both make dependencies explicit and swappable. Reader adds composition helpers on top of the same idea.',
      },
    ],
    exercise: {
      task: `
        <p>Use Reader so <code>receipt(amount)</code> reads <code>currency</code> and
        <code>taxRate</code> from the env. Implement <code>chain</code>, then
        <code>withTax</code> and <code>receipt</code>. Output format:
        <code>"THB 107.00"</code> (two decimals).</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Reader = run => ({
  run,
  map: f => Reader(env => f(run(env))),
  // TODO: run this, pass the value to f, run the resulting Reader with the SAME env
  chain: f => Reader(run),
});
const asks = f => Reader(f);

// TODO: amount -> Reader of amount * (1 + taxRate)
const withTax = amount => asks(env => amount);

// TODO: amount -> Reader of "CUR 0.00" using withTax(...).chain(...)
const receipt = amount => asks(env => 'TODO');

const th = { currency: 'THB', taxRate: 0.07 };
const au = { currency: 'AUD', taxRate: 0.1 };
check('withTax th', withTax(100).run(th), 107);
check('receipt th', receipt(100).run(th), 'THB 107.00');
check('receipt au', receipt(20).run(au), 'AUD 22.00');
check('same program, two envs', [th, au].map(e => receipt(10).run(e)), [
  'THB 10.70',
  'AUD 11.00',
]);`,
      hint: 'chain: f => Reader(env => f(run(env)).run(env)). withTax = amount => asks(env => amount * (1 + env.taxRate)). receipt = amount => withTax(amount).chain(total => asks(env => env.currency + " " + total.toFixed(2))).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Reader = run => ({
  run,
  map: f => Reader(env => f(run(env))),
  chain: f => Reader(env => f(run(env)).run(env)),
});
const asks = f => Reader(f);

const withTax = amount => asks(env => amount * (1 + env.taxRate));

const receipt = amount =>
  withTax(amount).chain(total => asks(env => env.currency + ' ' + total.toFixed(2)));

const th = { currency: 'THB', taxRate: 0.07 };
const au = { currency: 'AUD', taxRate: 0.1 };
check('withTax th', withTax(100).run(th), 107);
check('receipt th', receipt(100).run(th), 'THB 107.00');
check('receipt au', receipt(20).run(au), 'AUD 22.00');
check('same program, two envs', [th, au].map(e => receipt(10).run(e)), [
  'THB 10.70',
  'AUD 11.00',
]);`,
    },
  },

  // ─────────────────────────────────────────────────────────────── state-monad
  {
    id: 'state-monad',
    section: 'Effects & FP in Practice',
    title: 'The State Monad',
    explain: `
      <p>Some computations need a value that changes as they go: a counter for fresh IDs, the
      seed of a random-number generator, a parser's position. The impure way is a
      <code>let</code> outside the function that each call mutates. That makes results depend on
      call history and makes tests order-sensitive.</p>

      <h3>The pure way: return the new state</h3>
      <p>Make each step a function <code>state =&gt; [value, newState]</code>. Nothing is
      mutated; the caller passes the new state to the next step. That is correct but tedious:
      </p>
      <pre><code>const [id1, s1] = nextId(s0);
const [id2, s2] = nextId(s1);   // easy to pass s1 twice by mistake
const [id3, s3] = nextId(s2);</code></pre>

      <h3>State: let chain do the threading</h3>
      <pre><code>const State = run =&gt; ({
  run,                                    // s =&gt; [value, newState]
  map: f =&gt; State(s =&gt; {
    const [a, s2] = run(s);
    return [f(a), s2];
  }),
  chain: f =&gt; State(s =&gt; {
    const [a, s2] = run(s);               // run this step
    return f(a).run(s2);                  // feed the NEW state into the next step
  }),
});
const get = State(s =&gt; [s, s]);
const put = s =&gt; State(() =&gt; [undefined, s]);
const modify = f =&gt; State(s =&gt; [undefined, f(s)]);</code></pre>
      <p>It looks like Reader, with one difference: Reader passes the <em>same</em> env to every
      step; State passes the <em>updated</em> state. Your program is again a value: run it with
      any starting state and get <code>[result, finalState]</code> back. Same start, same answer,
      always.</p>
      <div class="tip">You have seen this shape before: a Redux reducer is
      <code>(state, action) =&gt; newState</code>, and <code>useReducer</code> threads it for you.
      State monad is the same idea for a <em>sequence of steps</em> that also produce values.</div>
      <div class="warn">Pseudo-random from a seed is deterministic on purpose: great for tests,
      replays, and games. It is <strong>not</strong> cryptographically secure. Use
      <code>crypto.getRandomValues</code> for anything security-related.</div>
    `,
    examples: [
      {
        title: 'Fresh IDs and seeded dice, threaded by chain',
        explain: `
          <details>
            <summary>The problem: a hidden mutable counter</summary>
            <p>With <code>let nextId = 1; const makeUser = name =&gt; ({ id: nextId++, name })</code>
            every call changes a global. Tests that create users get different IDs depending on
            what ran before. Here, the counter is the <em>state</em>, passed in and returned out.</p>
          </details>
          <details>
            <summary>Step by step: the ID generator, run from state 1</summary>
            <table>
              <tr><th>Step</th><th>State in</th><th>Value</th><th>State out</th></tr>
              <tr><td>makeUser('ana')</td><td>1</td><td><code>{ id: 'id-1', name: 'ana' }</code></td><td>2</td></tr>
              <tr><td>makeUser('ben')</td><td>2</td><td><code>{ id: 'id-2', name: 'ben' }</code></td><td>3</td></tr>
              <tr><td>makeUser('cy')</td><td>3</td><td><code>{ id: 'id-3', name: 'cy' }</code></td><td>4</td></tr>
            </table>
            <p>Console: <code>users: id-1 ana, id-2 ben, id-3 cy | next free id: 4</code>. Running the
            <em>same</em> program from 100 prints <code>id-100, id-101, id-102</code>.</p>
          </details>
          <details>
            <summary>Step by step: dice from seed 42</summary>
            <p><code>nextSeed(s) = (s * 75 + 74) % 65537</code> and the die is
            <code>1 + (newSeed % 6)</code>. The by-hand loop prints one row per roll:</p>
            <table>
              <tr><th>Roll</th><th>Seed in</th><th>Seed out</th><th>Die</th></tr>
              <tr><td>1</td><td>42</td><td>3224</td><td>3</td></tr>
              <tr><td>2</td><td>3224</td><td>45263</td><td>6</td></tr>
              <tr><td>3</td><td>45263</td><td>52412</td><td>3</td></tr>
            </table>
            <p>Then the chain version prints <code>chain: [3,6,3] final seed: 52412</code>: identical,
            because chain does exactly the threading the loop did by hand. Running it again from 42
            gives the same rolls; from seed 7 it gives a different, but again repeatable, sequence.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const nextId = State(n =&gt; ['id-' + n, n + 1]);          // ① value + next state
const [a, s2] = run(s);                                   // ② inside chain
return f(a).run(s2);                                      // ③ next step gets s2
const sequence = ms =&gt; ms.reduce(                         // ④
  (acc, m) =&gt; acc.chain(xs =&gt; m.map(x =&gt; [...xs, x])), State.of([]));</code></pre>
            <ol>
              <li><strong>①</strong> A step is pure: same <code>n</code> in, same pair out.</li>
              <li><strong>②</strong> Run the current step with the incoming state.</li>
              <li><strong>③</strong> The next step receives the <em>updated</em> state. This line
              is the whole State monad.</li>
              <li><strong>④</strong> Combining a list of steps: the same traverse/sequence pattern
              as before, now with State.</li>
            </ol>
          </details>
        `,
        code: `const State = run => ({
  run, // s => [value, newState]
  map: f =>
    State(s => {
      const [a, s2] = run(s);
      return [f(a), s2];
    }),
  chain: f =>
    State(s => {
      const [a, s2] = run(s);
      return f(a).run(s2);
    }),
});
State.of = a => State(s => [a, s]);
const sequence = ms =>
  ms.reduce((acc, m) => acc.chain(xs => m.map(x => [...xs, x])), State.of([]));

// 1) ID generator: the state is the next free number
const nextId = State(n => ['id-' + n, n + 1]);
const makeUser = name => nextId.map(id => ({ id, name }));

const threeUsers = makeUser('ana').chain(a =>
  makeUser('ben').chain(b => makeUser('cy').map(c => [a, b, c]))
);
const [users, nextFree] = threeUsers.run(1);
const fmt = us => us.map(u => u.id + ' ' + u.name).join(', ');
console.log('users:', fmt(users), '| next free id:', nextFree);
console.log('same program from 100:', threeUsers.run(100)[0].map(u => u.id).join(', '));

// 2) Seeded dice: the state is the RNG seed
const nextSeed = s => (s * 75 + 74) % 65537;
const rollDie = State(seed => {
  const s2 = nextSeed(seed);
  return [1 + (s2 % 6), s2];
});

console.log('--- by hand ---');
let seed = 42;
for (let i = 1; i <= 3; i++) {
  const [die, next] = rollDie.run(seed);
  console.log('roll ' + i + ': seed ' + seed + ' -> ' + next + ', die ' + die);
  seed = next;
}

console.log('--- with chain ---');
const threeRolls = sequence([rollDie, rollDie, rollDie]);
const [rolls, finalSeed] = threeRolls.run(42);
console.log('chain:', JSON.stringify(rolls), 'final seed:', finalSeed);
console.log('again from 42:', JSON.stringify(threeRolls.run(42)[0]));
console.log('from seed 7:  ', JSON.stringify(threeRolls.run(7)[0]));`,
      },
    ],
    quiz: [
      {
        q: 'What is the shape of a State step?',
        options: ['state => newState', 'state => [value, newState]', '(value, state) => void', 'env => value'],
        answer: 1,
        why: 'Each step returns both a result value and the updated state, without mutating anything.',
      },
      {
        q: 'What is the key difference between Reader.chain and State.chain?',
        options: [
          'None',
          'Reader passes the same env to the next step; State passes the updated state',
          'State is asynchronous',
          'Reader mutates the env',
        ],
        answer: 1,
        why: 'Reader: f(run(env)).run(env). State: const [a, s2] = run(s); f(a).run(s2).',
      },
      {
        q: 'You run <code>threeRolls.run(42)</code> twice. What happens?',
        options: [
          'Different rolls each time',
          'Identical rolls and final seed: the program is pure',
          'The second run continues from the first run’s seed',
          'It throws',
        ],
        answer: 1,
        why: 'No hidden state is mutated. Same starting state → same result, which makes tests and replays deterministic.',
      },
      {
        q: 'What does <code>get</code> (<code>State(s =&gt; [s, s])</code>) do inside a chain?',
        options: [
          'Resets the state',
          'Exposes the current state as the value, without changing it',
          'Increments the state',
          'Ends the computation',
        ],
        answer: 1,
        why: 'It copies the state into the value slot so the next step can read it.',
      },
      {
        q: 'Which everyday JS pattern is closest to the State monad idea?',
        options: [
          'A global counter with ++',
          'A reducer: (state, action) => newState, threaded by useReducer/Redux',
          'setTimeout',
          'Object.freeze',
        ],
        answer: 1,
        why: 'Reducers return the next state instead of mutating; the framework threads it. State monad also returns a value per step.',
      },
    ],
    exercise: {
      task: `
        <p>Implement <code>chain</code> for State, then use <code>push</code> and <code>pop</code>
        (a stack stored in the state as an array) to write <code>addTopTwo</code>: pop two numbers
        and push their sum. <code>pop</code> returns the popped value.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const State = run => ({
  run,
  map: f =>
    State(s => {
      const [a, s2] = run(s);
      return [f(a), s2];
    }),
  // TODO: run this step, then run f(value) with the NEW state
  chain: f => State(s => [undefined, s]),
});

const push = x => State(stack => [undefined, [...stack, x]]);
const pop = State(stack => [stack.at(-1), stack.slice(0, -1)]);

// TODO: pop a, pop b, push a + b, and return the sum as the value
const addTopTwo = pop;

check('push then pop', push(5).chain(() => pop).run([1]), [5, [1]]);
check('addTopTwo', addTopTwo.run([1, 2, 3]), [5, [1, 5]]);
const before = [4, 6];
addTopTwo.run(before);
check('input untouched', before, [4, 6]);
check('twice', addTopTwo.chain(() => addTopTwo).run([1, 2, 3]), [6, [6]]);`,
      hint: 'chain: f => State(s => { const [a, s2] = run(s); return f(a).run(s2); }). addTopTwo = pop.chain(a => pop.chain(b => push(a + b).map(() => a + b))).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const State = run => ({
  run,
  map: f =>
    State(s => {
      const [a, s2] = run(s);
      return [f(a), s2];
    }),
  chain: f =>
    State(s => {
      const [a, s2] = run(s);
      return f(a).run(s2);
    }),
});

const push = x => State(stack => [undefined, [...stack, x]]);
const pop = State(stack => [stack.at(-1), stack.slice(0, -1)]);

const addTopTwo = pop.chain(a => pop.chain(b => push(a + b).map(() => a + b)));

check('push then pop', push(5).chain(() => pop).run([1]), [5, [1]]);
check('addTopTwo', addTopTwo.run([1, 2, 3]), [5, [1, 5]]);
const before = [4, 6];
addTopTwo.run(before);
check('input untouched', before, [4, 6]);
check('twice', addTopTwo.chain(() => addTopTwo).run([1, 2, 3]), [6, [6]]);`,
    },
  },

  // ──────────────────────────────────────────────────────────────────── lenses
  {
    id: 'lenses',
    section: 'Effects & FP in Practice',
    title: 'Lenses',
    explain: `
      <p>Immutable updates of nested data are noisy. Changing one city means copying every
      level on the path:</p>
      <pre><code>const next = {
  ...state,
  user: {
    ...state.user,
    address: { ...state.user.address, city: 'Chiang Mai' },
  },
};</code></pre>
      <p>And you repeat that path in every function that touches the city.</p>

      <h3>A lens = a getter + a setter, as a value</h3>
      <pre><code>const lens = (get, set) =&gt; ({ get, set });   // set: (newValue, whole) =&gt; newWhole
const view = (l, s) =&gt; l.get(s);
const set  = (l, v, s) =&gt; l.set(v, s);
const over = (l, f, s) =&gt; l.set(f(l.get(s)), s);  // update with a function

const lensProp = k =&gt; lens(o =&gt; o[k], (v, o) =&gt; ({ ...o, [k]: v }));
const lensIndex = i =&gt; lens(xs =&gt; xs[i], (v, xs) =&gt; xs.with(i, v));</code></pre>
      <p>The setter never mutates: it returns a new whole. <code>Array.prototype.with</code>
      (ES2023) is the immutable "replace at index".</p>

      <h3>Lenses compose</h3>
      <p>Focusing on <code>user</code> and then on <code>address</code> and then on
      <code>city</code> is one lens: get goes down the path; set rebuilds each level on the way
      back up. <code>lensPath(['user', 'address', 'city'])</code> is just the composition of three
      <code>lensProp</code>s.</p>
      <p>Because only the levels on the path are copied, everything else is <strong>shared</strong>
      with the old state (structural sharing). <code>next.settings === state.settings</code> stays
      true, which is exactly what React's and Redux's reference checks want.</p>

      <h3>The lens laws</h3>
      <ol>
        <li><strong>get-set:</strong> <code>set(l, view(l, s), s)</code> equals <code>s</code>.
        Putting back what you read changes nothing.</li>
        <li><strong>set-get:</strong> <code>view(l, set(l, v, s)) === v</code>. You read what you
        wrote.</li>
        <li><strong>set-set:</strong> <code>set(l, b, set(l, a, s))</code> equals
        <code>set(l, b, s)</code>. The last write wins; earlier ones leave no trace.</li>
      </ol>
      <div class="tip">Lenses are first-class: you can store them, pass them to generic functions
      (form field bindings, "toggle any boolean at this path"), and compose them. That is what
      plain spreads cannot do.</div>
      <div class="warn">A "setter" that also validates, trims, or clamps breaks set-get: you do
      not read back what you wrote. Do normalisation as a separate step, or call it something
      other than a lens.</div>
    `,
    examples: [
      {
        title: 'lens, view, set, over, lensPath + law checks',
        explain: `
          <details>
            <summary>The problem: the path is repeated in every update</summary>
            <p>Three nested spreads to change one string, and the path <code>user.address.city</code>
            is hard-coded in each function that changes it. Typos (spreading the wrong level) silently
            drop data. A lens captures the path once.</p>
          </details>
          <details>
            <summary>Step by step: <code>set(cityL, 'Chiang Mai', state)</code></summary>
            <p><code>cityL</code> is <code>composeL(composeL(lensProp('user'), lensProp('address')),
            lensProp('city'))</code>. The setter reads down, then rebuilds up:</p>
            <table>
              <tr><th>Phase</th><th>Level</th><th>What happens</th><th>New object?</th></tr>
              <tr><td>down</td><td>state → user</td><td>get <code>state.user</code></td><td></td></tr>
              <tr><td>down</td><td>user → address</td><td>get <code>user.address</code></td><td></td></tr>
              <tr><td>up</td><td>address</td><td><code>{ ...address, city: 'Chiang Mai' }</code></td><td>yes</td></tr>
              <tr><td>up</td><td>user</td><td><code>{ ...user, address: newAddress }</code></td><td>yes</td></tr>
              <tr><td>up</td><td>state</td><td><code>{ ...state, user: newUser }</code></td><td>yes</td></tr>
              <tr><td></td><td>settings</td><td>not on the path</td><td>no: shared</td></tr>
            </table>
            <p>Console:</p>
            <pre><code>view city: Bangkok
after set: Chiang Mai | original: Bangkok
user copied: true | settings shared: true
over upper: BANGKOK
todo #1 done: true | todo #0 shared: true
get-set: true
set-get: true
set-set: true
trimming lens set-get: false</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const composeL = (outer, inner) =&gt;
  lens(
    s =&gt; inner.get(outer.get(s)),                        // ① get: down twice
    (v, s) =&gt; outer.set(inner.set(v, outer.get(s)), s)   // ② set: inner first, then outer
  );
const lensPath = keys =&gt; keys.map(toLens).reduce(composeL); // ③</code></pre>
            <ol>
              <li><strong>①</strong> Viewing through a composed lens is function composition of
              the getters.</li>
              <li><strong>②</strong> To set the inner part we need the current inner whole
              (<code>outer.get(s)</code>), update it with the inner setter, then put that back with
              the outer setter.</li>
              <li><strong>③</strong> <code>composeL</code> is associative, so reducing a list of
              lenses works (yes, lenses under composition form a monoid-like structure).</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Make a generic <code>toggle = l =&gt; s =&gt; over(l, b =&gt; !b, s)</code> and use it
              with <code>secondDone</code>.</li>
              <li>Point <code>cityL</code> at a missing path like <code>['user', 'phone', 'home']</code>.
              <code>view</code> crashes on undefined: this simple lens assumes the path exists.
              Libraries offer optional lenses (often called "optics" or "prisms") for that.</li>
            </ul>
          </details>
        `,
        code: `const lens = (get, set) => ({ get, set });
const view = (l, s) => l.get(s);
const set = (l, v, s) => l.set(v, s);
const over = (l, f, s) => l.set(f(l.get(s)), s);

const lensProp = k => lens(o => o[k], (v, o) => ({ ...o, [k]: v }));
const lensIndex = i => lens(xs => xs[i], (v, xs) => xs.with(i, v));
const composeL = (outer, inner) =>
  lens(
    s => inner.get(outer.get(s)),
    (v, s) => outer.set(inner.set(v, outer.get(s)), s)
  );
const toLens = k => (typeof k === 'number' ? lensIndex(k) : lensProp(k));
const lensPath = keys => keys.map(toLens).reduce(composeL);

const state = {
  user: { name: 'Ana', address: { city: 'Bangkok', zip: '10110' } },
  settings: { theme: 'dark' },
  todos: [
    { text: 'learn lenses', done: false },
    { text: 'ship it', done: false },
  ],
};

const cityL = lensPath(['user', 'address', 'city']);
console.log('view city:', view(cityL, state));

const moved = set(cityL, 'Chiang Mai', state);
console.log('after set:', moved.user.address.city,
  '| original:', state.user.address.city);
console.log('user copied:', moved.user !== state.user, '| settings shared:',
  moved.settings === state.settings);

console.log('over upper:', view(cityL, over(cityL, s => s.toUpperCase(), state)));

const secondDone = lensPath(['todos', 1, 'done']);
const toggled = over(secondDone, b => !b, state);
console.log('todo #1 done:', toggled.todos[1].done, '| todo #0 shared:',
  toggled.todos[0] === state.todos[0]);

// Laws (compare structurally)
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
console.log('get-set:', eq(set(cityL, view(cityL, state), state), state));
console.log('set-get:', view(cityL, set(cityL, 'Phuket', state)) === 'Phuket');
const setTwice = set(cityL, 'B', set(cityL, 'A', state));
console.log('set-set:', eq(setTwice, set(cityL, 'B', state)));

// ❌ A "lens" whose setter trims breaks set-get
const nameTrim = lens(o => o.name, (v, o) => ({ ...o, name: v.trim() }));
const readBack = view(nameTrim, set(nameTrim, ' Bo ', {}));
console.log('trimming lens set-get:', readBack === ' Bo ');`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>over(l, f, s)</code> do?',
        options: [
          'Mutates the focused value with f',
          'Returns a new s where the focused value is replaced by f(old value)',
          'Returns f applied to s',
          'Checks the lens laws',
        ],
        answer: 1,
        why: 'over = set(l, f(view(l, s)), s): read, transform, write back immutably.',
      },
      {
        q: 'After <code>set(cityL, "X", state)</code>, which objects are new?',
        options: [
          'Everything, it is a deep clone',
          'Only the objects on the path: state, user, address; the rest is shared',
          'Only address',
          'None, it mutates',
        ],
        answer: 1,
        why: 'Each level on the path is shallow-copied; siblings like settings keep their identity (structural sharing).',
      },
      {
        q: 'Which law does a setter that trims whitespace break?',
        options: ['get-set', 'set-get', 'set-set', 'None'],
        answer: 1,
        why: 'You set " Bo " but view returns "Bo". You do not read back what you wrote.',
      },
      {
        q: 'Why use <code>xs.with(i, v)</code> in <code>lensIndex</code> instead of <code>xs[i] = v</code>?',
        options: [
          'It is faster',
          'with returns a new array and leaves the original untouched (ES2023)',
          'Assignment does not work on arrays',
          'with deep-clones the array',
        ],
        answer: 1,
        why: 'Lens setters must be immutable. Array.prototype.with copies the array with one slot replaced. It is a shallow copy, so other items stay shared.',
      },
      {
        q: 'What do lenses give you that a hand-written nested spread does not?',
        options: [
          'Better performance always',
          'A first-class, composable value for "this path" that you can store, pass to generic helpers, and reuse for get/set/over',
          'Automatic deep freezing',
          'Mutation',
        ],
        answer: 1,
        why: 'The path becomes data. One lens supports view, set and over, and lenses compose into longer paths.',
      },
    ],
    exercise: {
      task: `
        <p>Implement <code>over</code> and <code>composeL</code>, then define
        <code>zipL = lensPath(['order', 'shipping', 'zip'])</code>. Use it to write
        <code>normalizeZip(s)</code> that trims the zip, without touching anything else.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const lens = (get, set) => ({ get, set });
const view = (l, s) => l.get(s);
const set = (l, v, s) => l.set(v, s);
// TODO: read with l.get, apply f, write back with l.set
const over = (l, f, s) => s;

const lensProp = k => lens(o => o[k], (v, o) => ({ ...o, [k]: v }));
// TODO: get goes down outer then inner; set updates inner then outer
const composeL = (outer, inner) => outer;
const lensPath = keys => keys.map(lensProp).reduce(composeL);

const zipL = lensPath(['order', 'shipping', 'zip']);
const normalizeZip = s => over(zipL, z => z.trim(), s);

const data = {
  order: { id: 9, shipping: { zip: '  10110 ', city: 'BKK' } },
  user: { id: 1 },
};
const fixed = normalizeZip(data);
check('view zip', view(zipL, data), '  10110 ');
check('normalized', fixed.order.shipping.zip, '10110');
check('city kept', fixed.order.shipping.city, 'BKK');
check('original untouched', data.order.shipping.zip, '  10110 ');
check('user shared', fixed.user === data.user, true);`,
      hint: 'over = (l, f, s) => l.set(f(l.get(s)), s). composeL = (outer, inner) => lens(s => inner.get(outer.get(s)), (v, s) => outer.set(inner.set(v, outer.get(s)), s)).',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const lens = (get, set) => ({ get, set });
const view = (l, s) => l.get(s);
const set = (l, v, s) => l.set(v, s);
const over = (l, f, s) => l.set(f(l.get(s)), s);

const lensProp = k => lens(o => o[k], (v, o) => ({ ...o, [k]: v }));
const composeL = (outer, inner) =>
  lens(
    s => inner.get(outer.get(s)),
    (v, s) => outer.set(inner.set(v, outer.get(s)), s)
  );
const lensPath = keys => keys.map(lensProp).reduce(composeL);

const zipL = lensPath(['order', 'shipping', 'zip']);
const normalizeZip = s => over(zipL, z => z.trim(), s);

const data = {
  order: { id: 9, shipping: { zip: '  10110 ', city: 'BKK' } },
  user: { id: 1 },
};
const fixed = normalizeZip(data);
check('view zip', view(zipL, data), '  10110 ');
check('normalized', fixed.order.shipping.zip, '10110');
check('city kept', fixed.order.shipping.city, 'BKK');
check('original untouched', data.order.shipping.zip, '  10110 ');
check('user shared', fixed.user === data.user, true);`,
    },
  },

  // ─────────────────────────────────────────────────────────── fp-architecture
  {
    id: 'fp-architecture',
    section: 'Effects & FP in Practice',
    title: 'FP Architecture: Reducers & Elm-style Updates',
    explain: `
      <p>Everything so far comes together in one app architecture, popularised by the Elm
      language and adopted by Redux and React's <code>useReducer</code>:</p>
      <pre><code>update : (state, msg) -&gt; [newState, commands]
view   : state -&gt; UI
runtime: holds state, calls update on each msg, renders view, runs commands</code></pre>

      <h3>The pieces</h3>
      <ul>
        <li><strong>State</strong>: one immutable value describing the whole app.</li>
        <li><strong>Messages</strong>: plain data describing what happened
        (<code>{ type: 'add', text }</code>), not what to do.</li>
        <li><strong>update</strong>: a <em>pure</em> function. Same state + same msg → same result.
        No fetch, no console, no DOM inside it.</li>
        <li><strong>Commands (effects as data)</strong>: when update wants an effect, it
        <em>returns a description</em> such as <code>{ type: 'save', key, value }</code>. The
        runtime interprets it and may dispatch a follow-up message
        (<code>{ type: 'saved' }</code>). This is the IO idea from earlier: describe effects, run
        them at the edge.</li>
        <li><strong>dispatch</strong>: the only way anything changes.</li>
      </ul>

      <h3>What you get</h3>
      <ul>
        <li><strong>Trivial tests:</strong> call <code>update</code> with data, compare the
        returned data, including which commands it asked for. No mocks.</li>
        <li><strong>Replay:</strong> <code>msgs.reduce(update, init)</code> recomputes any state.
        Bug reports become "here is the message log".</li>
        <li><strong>Time travel:</strong> keep an array of states; move a cursor to view any past
        state. Old states are never mutated, so they stay valid.</li>
      </ul>
      <div class="tip">Redux reducers are the <code>update</code> without the commands (effects are
      handled by middleware). Elm returns <code>(model, Cmd msg)</code>, exactly the tuple used
      here.</div>
      <div class="warn">The most common bug: an "innocent" <code>Date.now()</code>,
      <code>Math.random()</code>, or <code>fetch</code> inside update. It breaks replay and tests.
      Pass time/randomness in via the message, or request it with a command.</div>
    `,
    examples: [
      {
        title: 'Pure update + commands + a tiny runtime (console)',
        explain: `
          <details>
            <summary>The problem: effects tangled with state changes</summary>
            <p>A typical handler does <code>count--; if (count &lt; 0) console.warn(...);
            localStorage.setItem(...)</code> all at once. To test it you mock the console and storage,
            and you cannot replay what happened. Here <code>update</code> only returns data; the
            <code>runtime</code> is the single place that performs effects.</p>
          </details>
          <details>
            <summary>Step by step: the message log</summary>
            <table>
              <tr><th>#</th><th>msg</th><th>new state</th><th>commands returned</th></tr>
              <tr><td>1</td><td>inc</td><td><code>count 1</code></td><td>none</td></tr>
              <tr><td>2</td><td>inc</td><td><code>count 2</code></td><td>none</td></tr>
              <tr><td>3</td><td>dec</td><td><code>count 1</code></td><td>none</td></tr>
              <tr><td>4</td><td>dec</td><td><code>count 0</code></td><td>none</td></tr>
              <tr><td>5</td><td>dec</td><td><code>count 0</code> (unchanged)</td>
                <td><code>log "already at 0"</code></td></tr>
              <tr><td>6</td><td>inc</td><td><code>count 1</code></td><td>none</td></tr>
              <tr><td>7</td><td>save</td><td><code>saving: true</code></td>
                <td><code>save count=1</code></td></tr>
              <tr><td>8</td><td>saved (from the runtime)</td>
                <td><code>saving: false, lastSaved: 1</code></td><td>none</td></tr>
            </table>
            <p>Each row is printed as <code>#5 dec    {"count":0,...} cmds: log</code>. Step 5's command
            prints <code>[cmd] already at 0</code>; step 7's writes to the fake storage and dispatches
            step 8. After the run:</p>
            <pre><code>storage: {"count":1}
states kept: 9
time travel, state #2: {"count":2,"saving":false,"lastSaved":null}
replay equals final: true
pure test of save: [{"type":"save","key":"count","value":5}]</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>case 'save':
  return [{ ...state, saving: true },
          [{ type: 'save', key: 'count', value: state.count }]];   // ① effect as data

const runCmd = cmd =&gt; { ... dispatch({ type: 'saved' }) };      // ② runtime does it
history.push(next);                                              // ③ every state kept
msgs.reduce((s, m) =&gt; update(s, m)[0], init)                     // ④ replay</code></pre>
            <ol>
              <li><strong>①</strong> update does not save; it <em>asks</em> for a save. That request
              can be asserted in a test (last console line).</li>
              <li><strong>②</strong> The runtime is the impure shell. Results come back as new
              messages, so the next state change still goes through update.</li>
              <li><strong>③</strong> States are immutable, so storing all of them is safe: that is
              time travel.</li>
              <li><strong>④</strong> Replaying the message log through the pure update rebuilds the
              exact final state.</li>
            </ol>
          </details>
        `,
        code: `const init = { count: 0, saving: false, lastSaved: null };

// Pure: (state, msg) -> [newState, commands]
const update = (state, msg) => {
  switch (msg.type) {
    case 'inc':
      return [{ ...state, count: state.count + 1 }, []];
    case 'dec':
      if (state.count === 0) return [state, [{ type: 'log', text: 'already at 0' }]];
      return [{ ...state, count: state.count - 1 }, []];
    case 'save':
      return [
        { ...state, saving: true },
        [{ type: 'save', key: 'count', value: state.count }],
      ];
    case 'saved':
      return [{ ...state, saving: false, lastSaved: state.count }, []];
    default:
      return [state, []];
  }
};

// Impure shell: the only place effects happen
const storage = {};
const history = [init];
const msgLog = [];

const dispatch = msg => {
  const [next, cmds] = update(history.at(-1), msg);
  history.push(next);
  msgLog.push(msg);
  const cmdNames = cmds.map(c => c.type).join(',') || '-';
  const step = '#' + msgLog.length;
  console.log(step, msg.type.padEnd(6), JSON.stringify(next), 'cmds:', cmdNames);
  cmds.forEach(runCmd);
};

const runCmd = cmd => {
  if (cmd.type === 'log') console.log('   [cmd] ' + cmd.text);
  if (cmd.type === 'save') {
    storage[cmd.key] = cmd.value; // pretend this is localStorage / an API
    dispatch({ type: 'saved' });
  }
};

['inc', 'inc', 'dec', 'dec', 'dec', 'inc', 'save'].forEach(type => dispatch({ type }));

console.log('storage:', JSON.stringify(storage));
console.log('states kept:', history.length);
console.log('time travel, state #2:', JSON.stringify(history[2]));

const replayed = msgLog.reduce((s, m) => update(s, m)[0], init);
const sameAsFinal = JSON.stringify(replayed) === JSON.stringify(history.at(-1));
console.log('replay equals final:', sameAsFinal);

// Testing update needs no mocks: just data in, data out
const [, cmds] = update({ ...init, count: 5 }, { type: 'save' });
console.log('pure test of save:', JSON.stringify(cmds));`,
      },
      {
        title: 'Todo app in #root with a time-travel slider',
        explain: `
          <details>
            <summary>How it works</summary>
            <p>The app starts with three dispatched messages (two adds and a toggle), so the slider
            already has 4 states (0 to 3). Add todos, click one to toggle it, then drag the
            slider left: the list shows each past state. Dispatching while you are in the past
            drops the "future" states, like undo then a new edit in a text editor.</p>
            <ul>
              <li><code>update</code> is pure and has no DOM code.</li>
              <li><code>render</code> reads <code>history[cursor]</code> and only touches the DOM.</li>
              <li>Moving the slider changes <code>cursor</code>, never a state.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>Clear done</strong>, then slide back one step: the cleared todos are
              back, because the old state object was never mutated.</li>
              <li>Watch the console: every dispatch logs the message, so you have a full replayable
              log.</li>
              <li>Add an <code>'edit'</code> message and a double-click handler. Only update and
              render change; the runtime stays the same.</li>
            </ul>
          </details>
        `,
        code: `const init = { todos: [], nextId: 1 };

const update = (state, msg) => {
  switch (msg.type) {
    case 'add':
      if (!msg.text) return state;
      return {
        todos: [...state.todos, { id: state.nextId, text: msg.text, done: false }],
        nextId: state.nextId + 1,
      };
    case 'toggle':
      return {
        ...state,
        todos: state.todos.map(t => (t.id === msg.id ? { ...t, done: !t.done } : t)),
      };
    case 'clearDone':
      return { ...state, todos: state.todos.filter(t => !t.done) };
    default:
      return state;
  }
};

// Runtime: history of states + a cursor for time travel
let history = [init];
let cursor = 0;

const root = document.getElementById('root');
root.innerHTML =
  '<div style="font-family:sans-serif;max-width:360px">' +
  '<form id="add" style="display:flex;gap:6px">' +
  '<input id="text" placeholder="New todo" style="flex:1;padding:4px">' +
  '<button>Add</button><button type="button" id="clear">Clear done</button></form>' +
  '<ul id="list" style="padding-left:18px;min-height:80px"></ul>' +
  '<label>Time travel: <span id="label"></span><br>' +
  '<input id="time" type="range" min="0" step="1" style="width:100%"></label></div>';

const list = root.querySelector('#list');
const slider = root.querySelector('#time');
const label = root.querySelector('#label');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

const render = () => {
  const state = history[cursor];
  list.innerHTML = state.todos
    .map(t =>
      '<li data-id="' + t.id + '" style="cursor:pointer;' +
      (t.done ? 'text-decoration:line-through;color:#888' : '') + '">' +
      esc(t.text) + '</li>')
    .join('');
  slider.max = String(history.length - 1);
  slider.value = String(cursor);
  label.textContent = 'state ' + cursor + ' of ' + (history.length - 1);
};

const dispatch = msg => {
  const next = update(history[cursor], msg);
  history = [...history.slice(0, cursor + 1), next]; // drop the "future" if we went back
  cursor = history.length - 1;
  console.log('dispatch', JSON.stringify(msg), '-> todos:', next.todos.length);
  render();
};

root.addEventListener('submit', e => {
  e.preventDefault();
  const input = root.querySelector('#text');
  dispatch({ type: 'add', text: input.value.trim() });
  input.value = '';
});
root.addEventListener('click', e => {
  if (e.target.id === 'clear') dispatch({ type: 'clearDone' });
  const id = e.target.dataset && e.target.dataset.id;
  if (id) dispatch({ type: 'toggle', id: Number(id) });
});
root.addEventListener('input', e => {
  if (e.target.id !== 'time') return;
  cursor = Number(e.target.value);
  render();
});

dispatch({ type: 'add', text: 'learn monoids' });
dispatch({ type: 'add', text: 'build a reducer' });
dispatch({ type: 'toggle', id: 1 });`,
      },
    ],
    quiz: [
      {
        q: 'In this architecture, what does <code>update</code> return when the app needs to save data?',
        options: [
          'It calls localStorage directly and returns the new state',
          'The new state plus a command object describing the save',
          'A Promise',
          'Nothing; the view saves',
        ],
        answer: 1,
        why: 'Effects are returned as data. The runtime performs them and feeds results back as messages.',
      },
      {
        q: 'Why does keeping every past state in an array (time travel) work safely?',
        options: [
          'Because arrays are fast',
          'Because update never mutates: each state is a separate immutable value',
          'Because of deep cloning on every render',
          'It does not work safely',
        ],
        answer: 1,
        why: 'Old states are untouched by later updates (structural sharing, not mutation), so they stay valid forever.',
      },
      {
        q: 'Which of these is a bug inside <code>update</code>?',
        options: [
          'Returning { ...state, count: state.count + 1 }',
          'Calling Date.now() to timestamp a todo',
          'Returning [state, []] for unknown messages',
          'Using a switch on msg.type',
        ],
        answer: 1,
        why: 'Date.now() makes update impure: replaying the same messages gives different states. Put the timestamp in the message instead.',
      },
      {
        q: 'How do you test that "save" asks to persist the count, without any mocks?',
        options: [
          'Spy on localStorage',
          'Call update(state, { type: "save" }) and assert on the returned commands array',
          'Render the DOM and check it',
          'You cannot test it',
        ],
        answer: 1,
        why: 'Commands are plain data, so the assertion is just a comparison.',
      },
      {
        q: 'What does <code>msgs.reduce((s, m) =&gt; update(s, m)[0], init)</code> give you?',
        options: [
          'The first state',
          'A replay: the exact final state rebuilt from the message log',
          'A list of commands',
          'An error',
        ],
        answer: 1,
        why: 'Because update is pure, the message log fully determines the state. That enables bug repro, sync, and undo.',
      },
    ],
    exercise: {
      task: `
        <p>Write a pure <code>update(state, msg)</code> for a shopping cart that returns
        <code>[newState, commands]</code>:</p>
        <ul>
          <li><code>{ type: 'add', item: { id, price } }</code>: append the item.</li>
          <li><code>{ type: 'remove', id }</code>: remove items with that id.</li>
          <li><code>{ type: 'checkout' }</code>: if the cart is empty return the same state and a
          <code>{ type: 'alert', text: 'cart is empty' }</code> command; otherwise set
          <code>status: 'paying'</code> and return
          <code>{ type: 'charge', amount: total }</code>.</li>
        </ul>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const init = { items: [], status: 'shopping' };

// TODO: handle add, remove, checkout. Never mutate state.
const update = (state, msg) => {
  switch (msg.type) {
    default:
      return [state, []];
  }
};

const run = msgs => msgs.reduce(([s], m) => update(s, m), [init, []]);

const [s1] = update(init, { type: 'add', item: { id: 'a', price: 30 } });
check('add', s1.items, [{ id: 'a', price: 30 }]);
check('init untouched', init.items.length, 0);
check('empty checkout', update(init, { type: 'checkout' }), [
  init,
  [{ type: 'alert', text: 'cart is empty' }],
]);
check(
  'checkout charges total',
  run([
    { type: 'add', item: { id: 'a', price: 30 } },
    { type: 'add', item: { id: 'b', price: 12 } },
    { type: 'checkout' },
  ]),
  [
    { items: [{ id: 'a', price: 30 }, { id: 'b', price: 12 }], status: 'paying' },
    [{ type: 'charge', amount: 42 }],
  ]
);
check('remove', update(s1, { type: 'remove', id: 'a' })[0].items, []);`,
      hint: "add: [{ ...state, items: [...state.items, msg.item] }, []]. remove: filter by id. checkout: compute total with reduce; if items.length === 0 return [state, [{ type: 'alert', text: 'cart is empty' }]].",
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const init = { items: [], status: 'shopping' };

const update = (state, msg) => {
  switch (msg.type) {
    case 'add':
      return [{ ...state, items: [...state.items, msg.item] }, []];
    case 'remove':
      return [{ ...state, items: state.items.filter(i => i.id !== msg.id) }, []];
    case 'checkout': {
      if (state.items.length === 0) {
        return [state, [{ type: 'alert', text: 'cart is empty' }]];
      }
      const amount = state.items.reduce((sum, i) => sum + i.price, 0);
      return [{ ...state, status: 'paying' }, [{ type: 'charge', amount }]];
    }
    default:
      return [state, []];
  }
};

const run = msgs => msgs.reduce(([s], m) => update(s, m), [init, []]);

const [s1] = update(init, { type: 'add', item: { id: 'a', price: 30 } });
check('add', s1.items, [{ id: 'a', price: 30 }]);
check('init untouched', init.items.length, 0);
check('empty checkout', update(init, { type: 'checkout' }), [
  init,
  [{ type: 'alert', text: 'cart is empty' }],
]);
check(
  'checkout charges total',
  run([
    { type: 'add', item: { id: 'a', price: 30 } },
    { type: 'add', item: { id: 'b', price: 12 } },
    { type: 'checkout' },
  ]),
  [
    { items: [{ id: 'a', price: 30 }, { id: 'b', price: 12 }], status: 'paying' },
    [{ type: 'charge', amount: 42 }],
  ]
);
check('remove', update(s1, { type: 'remove', id: 'a' })[0].items, []);`,
    },
  },

  // ───────────────────────────────────────────────────────────── fp-in-the-wild
  {
    id: 'fp-in-the-wild',
    section: 'Effects & FP in Practice',
    title: 'FP in the Real World',
    explain: `
      <p>You now know the core toolkit: pure functions, immutability, composition, monoids,
      functors, applicatives, monads, lazy effects, lenses and reducer architecture. The
      remaining skill is judgement: <strong>where does this pay off in JavaScript, and where
      does it cost more than it gives?</strong></p>

      <h3>Where FP clearly helps</h3>
      <ul>
        <li><strong>Data transformation</strong>: pipelines of small pure functions over arrays and
        objects are easy to read and test.</li>
        <li><strong>State management</strong>: reducers + immutable updates give you predictable
        UIs, undo, and cheap change detection (<code>prev !== next</code>).</li>
        <li><strong>Error handling and validation</strong>: Either/Validation make failure paths
        explicit instead of try/catch spaghetti.</li>
        <li><strong>Concurrency</strong>: no shared mutable state means fewer races.</li>
      </ul>

      <h3>Where it can hurt</h3>
      <ul>
        <li><strong>Performance of naive immutability.</strong> Spreading inside a loop
        (<code>acc =&gt; [...acc, x]</code>) copies the whole array every iteration: O(n²). The
        example below counts the copies.</li>
        <li><strong>Allocation and closures.</strong> Every <code>map</code> creates a new array,
        every wrapper (<code>Just</code>, <code>Task</code>) a new object, every curried call a
        closure. Usually negligible; in hot loops over millions of items it is not.</li>
        <li><strong>No tail-call optimisation.</strong> Only Safari implements proper tail calls,
        so deep recursion overflows the stack in Chrome/Node. Prefer loops or <code>reduce</code>
        for big inputs.</li>
        <li><strong>Team readability.</strong> <code>traverse(Either.of)</code> chains are clear to
        you now, but maybe not to the next person. Introduce abstractions where they remove more
        code than they add concepts.</li>
      </ul>

      <h3>Pragmatic rule: pure on the outside</h3>
      <p>A function is pure if callers cannot observe mutation. A local <code>for</code> loop
      that pushes into an array <em>it created itself</em> is invisible from outside. "Functional
      core, imperative shell" is the usual architecture: pure logic in the middle, effects at the
      edges (the runtime from the previous lesson).</p>

      <h3>The library landscape (verify versions before adopting)</h3>
      <ul>
        <li><strong>Ramda</strong>: auto-curried, data-last utility functions
        (<code>pipe</code>, <code>map</code>, lenses). Plain JS values, no wrapper types.</li>
        <li><strong>fp-ts</strong>: typed FP for TypeScript (Option, Either, Task, ...). The
        project has officially merged into the <strong>Effect</strong> ecosystem; its README says
        Effect can be seen as the successor to fp-ts v2, effectively "fp-ts v3". fp-ts 2.x is still
        published and used widely.</li>
        <li><strong>Effect</strong>: a full TypeScript effect system: lazy, typed errors,
        dependency injection (Reader-like), concurrency, retries, resource safety. Think "Task +
        Either + Reader" grown into a framework.</li>
        <li><strong>Immer</strong>: write "mutating" code against a draft; get a new immutable
        state with structural sharing. Used inside Redux Toolkit.</li>
        <li><strong>Immutable.js</strong>: persistent data structures (<code>Map</code>,
        <code>List</code>) with efficient structural sharing. Since v5 there is no default export;
        use named imports.</li>
      </ul>

      <h3>A glimpse of Haskell</h3>
      <p>In Haskell, everything in this course is built in. <code>Maybe</code> is a standard type,
      <code>&gt;&gt;=</code> is <code>chain</code>, and <code>do</code>-notation is what
      <code>async</code>/<code>await</code> imitates:</p>
      <pre><code class="language-haskell">safeDiv :: Int -&gt; Int -&gt; Maybe Int
safeDiv _ 0 = Nothing
safeDiv a b = Just (div a b)

calc1 = safeDiv 100 5 &gt;&gt;= safeDiv 60        -- Just 3   (60 / 20)
calc2 = safeDiv 100 0 &gt;&gt;= safeDiv 60        -- Nothing

calc3 = do
  x &lt;- safeDiv 100 5      -- like: const x = await ...
  y &lt;- safeDiv 60 x
  return (y + 1)          -- Just 4</code></pre>

      <h3>Pragmatic checklist</h3>
      <ul>
        <li>Default to pure functions and immutable data at module boundaries.</li>
        <li>Use built-ins first: <code>map</code>/<code>filter</code>/<code>reduce</code>,
        <code>toSorted</code>, <code>with</code>, <code>structuredClone</code>,
        <code>Object.groupBy</code>.</li>
        <li>Push effects to the edges; pass dependencies in (Reader-style) rather than importing
        singletons.</li>
        <li>Model "might be missing" and "might fail" explicitly (Maybe/Either or a
        <code>{ ok, error }</code> result), not with <code>null</code> and throws everywhere.</li>
        <li>Mutate locally when profiling says so, keeping the function pure from the outside.</li>
        <li>Adopt a library (Immer for state, Effect for effect-heavy TS) when the team agrees
        on it, not to show off.</li>
      </ul>
      <div class="tip">You do not have to choose "FP or not". Most good JS code is a mix:
      immutable data and pure functions by default, a few well-named abstractions where they
      remove real complexity.</div>
      <div class="warn">The pipeline operator <code>|&gt;</code> is still a TC39 proposal, not
      usable syntax. Use a <code>pipe</code> function.</div>
    `,
    examples: [
      {
        title: 'The cost of naive immutability (and the pragmatic fix)',
        code: `const N = 5000;
const items = Array.from({ length: N }, (_, i) => i);

// ❌ "Pure" but O(n^2): spreads copy the whole accumulator each time
let copiedSpread = 0;
const viaSpread = items.reduce((acc, x) => {
  if (x % 2 !== 0) return acc;
  copiedSpread += acc.length; // elements copied by [...acc]
  return [...acc, x * 2];
}, []);

// ✅ Pure from the outside: local mutation of an array we created
const evensDoubled = xs => {
  const out = [];
  for (const x of xs) if (x % 2 === 0) out.push(x * 2);
  return out; // caller cannot observe the pushes
};
const viaLoop = evensDoubled(items);

// ✅ Idiomatic: built-ins already allocate once per step
const viaBuiltins = items.filter(x => x % 2 === 0).map(x => x * 2);

const same = JSON.stringify(viaSpread) === JSON.stringify(viaLoop) &&
  JSON.stringify(viaLoop) === JSON.stringify(viaBuiltins);
console.log('same result:', same, '| length:', viaLoop.length);
console.log('elements copied by spread version:', copiedSpread.toLocaleString('en-US'));
console.log('elements copied by loop version:  ', 0);

// Rough timings (they vary by machine; the ratio is what matters)
const time = (label, fn) => {
  const t0 = performance.now();
  fn();
  console.log(label.padEnd(10), (performance.now() - t0).toFixed(2), 'ms');
};
time('spread', () => items.reduce((a, x) => (x % 2 === 0 ? [...a, x * 2] : a), []));
time('loop', () => evensDoubled(items));
time('builtins', () => items.filter(x => x % 2 === 0).map(x => x * 2));`,
      },
      {
        title: 'Library snippets: Ramda, fp-ts, Effect (not runnable)',
        runnable: false,
        code: `// ── Ramda: auto-curried, data-last helpers on plain JS values
import * as R from 'ramda';

const activeEmails = R.pipe(
  R.filter(R.propEq(true, 'active')), // propEq(value, key) in current Ramda
  R.map(R.prop('email')),
  R.uniq
);
activeEmails(users);

const cityL = R.lensPath(['user', 'address', 'city']);
R.view(cityL, state);
R.over(cityL, R.toUpper, state); // immutable update via a lens

// ── fp-ts (TypeScript): Option / Either with pipe
import { pipe } from 'fp-ts/function';
import * as O from 'fp-ts/Option';

const street = (u: User): string =>
  pipe(
    O.fromNullable(u.address),
    O.chain(a => O.fromNullable(a.street)),
    O.getOrElse(() => 'unknown')
  );

// ── Effect (TypeScript): lazy, typed effects. Nothing runs until runPromise.
import { Effect } from 'effect';

const getUser = (id: number) =>
  Effect.tryPromise({
    try: () => fetch('/api/users/' + id).then(r => r.json()),
    catch: () => new Error('request failed'),
  });

const program = Effect.gen(function* () {
  const user = yield* getUser(1); // like await, but for Effect
  return user.name;
});

Effect.runPromise(program).then(console.log);`,
      },
      {
        title: 'Library snippets: Immer & Immutable.js (not runnable)',
        runnable: false,
        code: `// ── Immer: write "mutations" against a draft, get a new immutable state
import { produce } from 'immer';

const next = produce(state, draft => {
  draft.user.address.city = 'Chiang Mai';
  draft.todos[1].done = true;
});
// state is unchanged; untouched branches are shared: next.settings === state.settings

// ── Immutable.js: persistent collections with structural sharing
import { Map, List, fromJS } from 'immutable'; // named imports (no default export in v5)

const m1 = Map({ a: 1, b: 2 });
const m2 = m1.set('a', 99);
m1.get('a'); // 1  (old version still intact)
m2.get('a'); // 99

const list = List([1, 2, 3]).push(4); // a new List; the original is unchanged

const tree = fromJS({ user: { address: { city: 'Bangkok' } } });
const moved = tree.setIn(['user', 'address', 'city'], 'Chiang Mai');
moved.getIn(['user', 'address', 'city']); // 'Chiang Mai'`,
      },
    ],
    quiz: [
      {
        q: 'Why is <code>xs.reduce((acc, x) =&gt; [...acc, x], [])</code> slow for large arrays?',
        options: [
          'reduce is slow',
          'Each step copies the whole accumulator, so total work is O(n²)',
          'Spread is not supported',
          'It mutates xs',
        ],
        answer: 1,
        why: 'Step k copies k elements, so n steps copy about n²/2 elements. A local push or built-in map/filter is O(n).',
      },
      {
        q: 'Is a function that pushes into an array it created locally, then returns it, pure?',
        options: [
          'No, push is mutation',
          'Yes: the mutation is not observable by callers; same input gives same output',
          'Only if the array is frozen',
          'Only in strict mode',
        ],
        answer: 1,
        why: 'Purity is about observable behaviour. Local, unshared mutation is a fine implementation detail.',
      },
      {
        q: 'What is the relationship between fp-ts and Effect today?',
        options: [
          'They are unrelated competitors',
          'fp-ts has merged into the Effect ecosystem; Effect is described as the successor to fp-ts v2 ("fp-ts v3")',
          'Effect is a plugin for fp-ts',
          'fp-ts v3 replaced Effect',
        ],
        answer: 1,
        why: 'The fp-ts README announces the merge with Effect-TS. fp-ts 2.x remains available.',
      },
      {
        q: 'Why should you avoid deep recursion over very large inputs in most JS engines?',
        options: [
          'Recursion is impure',
          'Most engines (V8 in Chrome/Node) do not implement proper tail calls, so deep recursion can overflow the stack',
          'Recursion is always slower than loops by 100x',
          'It is a syntax error',
        ],
        answer: 1,
        why: 'Proper tail calls are in the spec but only Safari/JavaScriptCore ships them. Use loops, reduce, or trampolines for big inputs.',
      },
      {
        q: 'In Haskell, which operator corresponds to <code>chain</code>/<code>flatMap</code>?',
        options: ['&lt;$&gt;', '&gt;&gt;=', '++', '.'],
        answer: 1,
        why: '>>= (bind) is chain. &lt;$&gt; is fmap (map), . is composition, ++ is list concatenation (a monoid!).',
      },
    ],
    exercise: {
      task: `
        <p><code>applyDiscounts</code> below works but mutates its input. Rewrite it so it is pure:
        return a new cart, leave the original untouched, and keep it O(n) (no spreading inside a
        loop). Items with <code>qty &gt;= 3</code> get 10% off their line total; the result has a
        <code>total</code>.</p>
      `,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

// TODO: make this pure (currently mutates cart and its items)
const applyDiscounts = cart => {
  cart.total = 0;
  for (const item of cart.items) {
    item.line = item.price * item.qty * (item.qty >= 3 ? 0.9 : 1);
    cart.total += item.line;
  }
  return cart;
};

const makeCart = () => ({
  items: [
    { sku: 'tea', price: 10, qty: 3 },
    { sku: 'mug', price: 50, qty: 1 },
  ],
});

const cart = makeCart();
const result = applyDiscounts(cart);
check('total', result.total, 77);
check('lines', result.items.map(i => i.line), [27, 50]);
check('input untouched', cart, makeCart());
check('deterministic', applyDiscounts(makeCart()), applyDiscounts(makeCart()));`,
      hint: 'Map items to new objects: items.map(i => ({ ...i, line: ... })). Then total = items.reduce((s, i) => s + i.line, 0). Return { ...cart, items, total }.',
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log((ok ? '✅ ' : '❌ ') + name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const lineTotal = item => item.price * item.qty * (item.qty >= 3 ? 0.9 : 1);

const applyDiscounts = cart => {
  const items = cart.items.map(item => ({ ...item, line: lineTotal(item) }));
  const total = items.reduce((sum, item) => sum + item.line, 0);
  return { ...cart, items, total };
};

const makeCart = () => ({
  items: [
    { sku: 'tea', price: 10, qty: 3 },
    { sku: 'mug', price: 50, qty: 1 },
  ],
});

const cart = makeCart();
const result = applyDiscounts(cart);
check('total', result.total, 77);
check('lines', result.items.map(i => i.line), [27, 50]);
check('input untouched', cart, makeCart());
check('deterministic', applyDiscounts(makeCart()), applyDiscounts(makeCart()));`,
    },
  },
);
