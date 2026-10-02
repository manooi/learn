window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── async-actions
  {
    id: 'async-actions',
    section: 'Structuring stores',
    title: 'Async actions',
    explain: `
      <p>In Redux you need thunks or sagas for async work. In Zustand an action is
      <strong>just a function</strong>, so it can be <code>async</code>. You
      <code>await</code> whatever you like and call <code>set</code> when the data arrives.
      Zustand doesn't care <em>when</em> you call <code>set</code>.</p>
      <pre><code>const useTodoStore = create((set) =&gt; ({
  todos: [],
  status: 'idle',               // 'idle' | 'loading' | 'success' | 'error'
  error: null,
  fetchTodos: async () =&gt; {
    set({ status: 'loading', error: null });
    try {
      const todos = await api.getTodos();
      set({ todos, status: 'success' });
    } catch (err) {
      set({ status: 'error', error: err.message });
    }
  },
}));</code></pre>
      <h3>The loading / error trio</h3>
      <p>Most async actions follow the same recipe: <strong>before</strong> the await,
      mark the store as loading; <strong>after</strong>, store the data or the error.
      Components just select <code>status</code> and render the right thing. They never
      see a promise.</p>
      <div class="tip">Think of the store as a restaurant's order board. The kitchen (async
      action) writes "cooking…", then "ready" or "sold out". Customers (components) only
      read the board. They never go into the kitchen.</div>
      <h3>The catch: requests can overlap</h3>
      <p>If the user clicks fast, two requests run at once. The <em>slow old</em> one can
      finish last and overwrite the <em>fast new</em> one. That's a <strong>race
      condition</strong>. The fix is a <em>latest-wins guard</em>: give each request an id,
      save it in the store, and after the <code>await</code> use <code>get()</code> to check
      that you are still the latest request.</p>
      <div class="warn">Values you read <em>before</em> an <code>await</code> may be stale
      after it. Always call <code>get()</code> again after awaiting if you need the current
      state.</div>
      <p>For a real app with lots of server data (caching, refetching, dedup), a library
      like TanStack Query is often a better fit. Zustand async actions are great for
      small, app-specific flows.</p>
    `,
    examples: [
      {
        title: 'Loading and error state',
        code: `import { create } from 'zustand';

function fakeFetchTodos(shouldFail) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (shouldFail) reject(new Error('Server is down'));
      else resolve(['Buy milk', 'Walk the dog', 'Learn Zustand']);
    }, 800)
  );
}

const useTodoStore = create((set) => ({
  todos: [],
  status: 'idle',
  error: null,
  fetchTodos: async (shouldFail) => {
    set({ status: 'loading', error: null });
    console.log('status: loading');
    try {
      const todos = await fakeFetchTodos(shouldFail);
      set({ todos, status: 'success' });
      console.log('status: success');
    } catch (err) {
      set({ status: 'error', error: err.message, todos: [] });
      console.log('status: error -', err.message);
    }
  },
}));

function TodoList() {
  const status = useTodoStore((s) => s.status);
  const todos = useTodoStore((s) => s.todos);
  const error = useTodoStore((s) => s.error);

  if (status === 'idle') return <p>Click a button to load.</p>;
  if (status === 'loading') return <p>Loading…</p>;
  if (status === 'error') return <p style={{ color: 'crimson' }}>Error: {error}</p>;
  return (
    <ul>
      {todos.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

export default function App() {
  const fetchTodos = useTodoStore((s) => s.fetchTodos);
  return (
    <div>
      <button onClick={() => fetchTodos(false)}>Load (works)</button>{' '}
      <button onClick={() => fetchTodos(true)}>Load (fails)</button>
      <TodoList />
    </div>
  );
}`,
      },
      {
        title: 'Race condition + latest-wins guard',
        code: `import { create } from 'zustand';

const NAMES = { 1: 'Ana (slow: 2s)', 2: 'Ben (fast: 0.3s)' };
const DELAYS = { 1: 2000, 2: 300 };

function fakeFetchUser(id) {
  return new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: NAMES[id] }), DELAYS[id])
  );
}

const useUserStore = create((set, get) => ({
  selectedId: null,
  user: null,
  loading: false,
  requestId: 0,
  guard: true,
  setGuard: (guard) => set({ guard }),

  loadUser: async (id) => {
    const myId = get().requestId + 1;
    set({ requestId: myId, selectedId: id, loading: true, user: null });
    console.log(\`request #\${myId} start: user \${id}\`);

    const data = await fakeFetchUser(id);

    if (get().guard && get().requestId !== myId) {
      console.log(\`request #\${myId} ignored (latest is #\${get().requestId})\`);
      return;
    }
    console.log(\`request #\${myId} done: \${data.name}\`);
    set({ user: data, loading: false });
  },
}));

export default function App() {
  const { selectedId, user, loading, guard } = useUserStore();
  const loadUser = useUserStore((s) => s.loadUser);
  const setGuard = useUserStore((s) => s.setGuard);

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={guard}
          onChange={(e) => setGuard(e.target.checked)}
        />
        use latest-wins guard
      </label>
      <div style={{ margin: '8px 0' }}>
        <button onClick={() => loadUser(1)}>User 1</button>{' '}
        <button onClick={() => loadUser(2)}>User 2</button>
      </div>
      <p>Selected: {selectedId ?? '-'}</p>
      <p>Showing: {loading ? 'Loading…' : user ? user.name : '-'}</p>
      <p style={{ color: 'gray' }}>
        Try: uncheck the guard, click User 1 then quickly User 2.
      </p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: the slow old request finishes last</summary>
            <p>User 1 takes <strong>2s</strong>, User 2 only <strong>0.3s</strong>. Uncheck
            the guard, click User 1, then User 2 right away (say at 0.2s):</p>
            <table>
              <tr><th>Time</th><th>What happens</th><th>Screen</th><th>Console</th></tr>
              <tr><td>0s</td><td>Click User 1 → request #1 starts (2s)</td>
                <td>Selected: 1, Loading…</td><td><code>request #1 start: user 1</code></td></tr>
              <tr><td>0.2s</td><td>Click User 2 → request #2 starts (0.3s)</td>
                <td>Selected: 2, Loading…</td><td><code>request #2 start: user 2</code></td></tr>
              <tr><td>0.5s</td><td>#2 resolves → <code>set({ user: Ben })</code></td>
                <td>Ben ✅</td><td><code>request #2 done: Ben (fast: 0.3s)</code></td></tr>
              <tr><td>2.0s</td><td>#1 resolves <em>late</em> → <code>set({ user: Ana })</code></td>
                <td><strong>Ana ❌</strong> while "Selected: 2"</td>
                <td><code>request #1 done: Ana (slow: 2s)</code></td></tr>
            </table>
            <p>Nothing cancels request #1. When its promise resolves, the code after
            <code>await</code> runs as if nothing changed and overwrites the right answer.</p>
          </details>
          <details>
            <summary>Key lines explained: request ids + <code>get()</code></summary>
            <pre><code>loadUser: async (id) =&gt; {
  const myId = get().requestId + 1;          // ① this call's ticket number
  set({ requestId: myId, /* ... */ });       // ② "I am now the latest"

  const data = await fakeFetchUser(id);      // ... time passes, others may start

  if (get().requestId !== myId) return;      // ③ someone newer exists → drop it
  set({ user: data, loading: false });
},</code></pre>
            <ol>
              <li><strong>①</strong> <code>myId</code> is a local <code>const</code>. Each call
              of <code>loadUser</code> gets its own copy, kept alive by the closure while it
              awaits.</li>
              <li><strong>②</strong> Writing it to the store makes it the "current ticket".
              A newer call overwrites <code>requestId</code> with a bigger number.</li>
              <li><strong>③</strong> After the <code>await</code>, <code>get()</code> reads the
              <em>live</em> store. If <code>requestId</code> moved on, this response is stale.
              (The demo also checks <code>get().guard</code> so you can switch the fix off.)</li>
            </ol>
            <table>
              <tr><th>Time</th><th>With the guard</th><th>Screen</th><th>Console</th></tr>
              <tr><td>0s</td><td>#1 starts, <code>requestId = 1</code></td>
                <td>Loading…</td><td><code>request #1 start: user 1</code></td></tr>
              <tr><td>0.2s</td><td>#2 starts, <code>requestId = 2</code></td>
                <td>Loading…</td><td><code>request #2 start: user 2</code></td></tr>
              <tr><td>0.5s</td><td>#2: <code>requestId (2) === myId (2)</code> → set</td>
                <td>Ben ✅</td><td><code>request #2 done: Ben (fast: 0.3s)</code></td></tr>
              <tr><td>2.0s</td><td>#1: <code>requestId (2) !== myId (1)</code> → return</td>
                <td>Ben ✅</td><td><code>request #1 ignored (latest is #2)</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Click <strong>User 2 then User 1</strong>. No bug even without the guard: the
              slow request is also the latest, so it naturally wins.</li>
              <li>Click User 1 three times fast with the guard on. Only
              <code>request #3</code> is applied; #1 and #2 are ignored.</li>
            </ul>
            <div class="warn">Don't compare against a value captured before the await, like
            <code>const { requestId } = get()</code> at the top and then
            <code>if (requestId !== myId)</code>. That's the <em>old</em> value, so the check
            always passes. You must call <code>get()</code> <strong>after</strong> the
            <code>await</code>.</div>
            <div class="tip">The guard doesn't stop the request, it only ignores the result.
            With real <code>fetch</code> you can also keep an <code>AbortController</code> and
            call <code>abort()</code> on the previous one when a new request starts.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What do you need to make a Zustand action async?',
        options: [
          'The <code>thunk</code> middleware',
          'Nothing: just write an <code>async</code> function and call <code>set</code> when ready',
          'Wrap it in <code>useEffect</code>',
          'Use <code>createAsyncStore</code>',
        ],
        answer: 1,
        why: 'Actions are plain functions. Zustand accepts set calls at any time, sync or async.',
      },
      {
        q: 'Inside an async action, after <code>await</code>, how do you read the <em>current</em> state?',
        options: [
          'Use a variable you destructured before the await',
          'Call <code>get()</code> again',
          'Call the hook <code>useStore()</code>',
          'You can\'t; state is frozen during an action',
        ],
        answer: 1,
        why: 'get() always returns the live state. Values read before the await may be stale, and hooks can\'t be called inside actions.',
      },
      {
        q: 'Request A (slow) starts, then request B (fast). Without a guard, what does the screen show at the end?',
        options: ['B\'s result', 'A\'s result', 'An error', 'Both merged'],
        answer: 1,
        why: 'A resolves last, so its set runs last and overwrites B. That is the race condition.',
      },
      {
        q: 'In the latest-wins guard, why is <code>myId</code> a local <code>const</code>?',
        options: [
          'So each call remembers its own ticket number across the await',
          'Because <code>set</code> can\'t store numbers',
          'To make it faster',
          'It doesn\'t matter; it could be read from the store later',
        ],
        answer: 0,
        why: 'The closure keeps each call\'s own id. Comparing it with the live requestId (via get()) tells you if you are still the latest.',
      },
    ],
    exercise: {
      task: `
        <p>Build a <strong>weather</strong> store with an async action
        <code>fetchWeather(city)</code>:</p>
        <ul>
          <li>State: <code>city</code>, <code>temp</code>, <code>status</code>
          (<code>'idle' | 'loading' | 'success' | 'error'</code>), <code>error</code>.</li>
          <li>Set <code>status: 'loading'</code> before awaiting <code>fakeWeather(city)</code>,
          then <code>'success'</code> with <code>temp</code>, or <code>'error'</code> with the
          message (city <code>'Atlantis'</code> fails).</li>
          <li>Add a latest-wins guard with a <code>requestId</code> so clicking Tokyo (slow)
          then Paris (fast) shows Paris.</li>
        </ul>
      `,
      starter: `import { create } from 'zustand';

const DATA = { Tokyo: 22, Paris: 15 };
const DELAYS = { Tokyo: 1500, Paris: 300, Atlantis: 500 };

function fakeWeather(city) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (city in DATA) resolve(DATA[city]);
      else reject(new Error(\`No city called \${city}\`));
    }, DELAYS[city])
  );
}

const useWeather = create((set, get) => ({
  city: null,
  temp: null,
  status: 'idle',
  error: null,
  // TODO: requestId + async fetchWeather(city)
  fetchWeather: (city) => {},
}));

export default function App() {
  const { city, temp, status, error, fetchWeather } = useWeather();
  return (
    <div>
      {['Tokyo', 'Paris', 'Atlantis'].map((c) => (
        <button key={c} onClick={() => fetchWeather(c)} style={{ marginRight: 4 }}>
          {c}
        </button>
      ))}
      <p>City: {city ?? '-'}</p>
      <p>
        {status === 'loading' && 'Loading…'}
        {status === 'success' && \`\${temp}°C\`}
        {status === 'error' && <span style={{ color: 'crimson' }}>{error}</span>}
        {status === 'idle' && 'Pick a city'}
      </p>
    </div>
  );
}`,
      hint: 'Compute myId = get().requestId + 1 and store it together with status: "loading". After await (inside try and catch), return early if get().requestId !== myId.',
      solution: `import { create } from 'zustand';

const DATA = { Tokyo: 22, Paris: 15 };
const DELAYS = { Tokyo: 1500, Paris: 300, Atlantis: 500 };

function fakeWeather(city) {
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (city in DATA) resolve(DATA[city]);
      else reject(new Error(\`No city called \${city}\`));
    }, DELAYS[city])
  );
}

const useWeather = create((set, get) => ({
  city: null,
  temp: null,
  status: 'idle',
  error: null,
  requestId: 0,

  fetchWeather: async (city) => {
    const myId = get().requestId + 1;
    set({ requestId: myId, city, status: 'loading', error: null });
    try {
      const temp = await fakeWeather(city);
      if (get().requestId !== myId) return;
      set({ temp, status: 'success' });
    } catch (err) {
      if (get().requestId !== myId) return;
      set({ status: 'error', error: err.message });
    }
  },
}));

export default function App() {
  const { city, temp, status, error, fetchWeather } = useWeather();
  return (
    <div>
      {['Tokyo', 'Paris', 'Atlantis'].map((c) => (
        <button key={c} onClick={() => fetchWeather(c)} style={{ marginRight: 4 }}>
          {c}
        </button>
      ))}
      <p>City: {city ?? '-'}</p>
      <p>
        {status === 'loading' && 'Loading…'}
        {status === 'success' && \`\${temp}°C\`}
        {status === 'error' && <span style={{ color: 'crimson' }}>{error}</span>}
        {status === 'idle' && 'Pick a city'}
      </p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── actions-outside
  {
    id: 'actions-outside',
    section: 'Structuring stores',
    title: 'Actions outside the store',
    explain: `
      <p>The usual style keeps actions <em>inside</em> the store, next to the state
      (the docs call this <strong>colocating</strong>, and it's the recommended default).
      But there's an alternative: keep only <strong>data</strong> in the store and write
      actions as plain <strong>module-level functions</strong> that call
      <code>useStore.setState</code>.</p>
      <pre><code>export const useCounter = create(() =&gt; ({
  count: 0,
  text: 'hello',
}));

export const inc = () =&gt;
  useCounter.setState((s) =&gt; ({ count: s.count + 1 }));

export const setText = (text) =&gt; useCounter.setState({ text });</code></pre>
      <p>Now any code can import <code>inc</code> and call it: a component, a
      <code>setTimeout</code>, a WebSocket handler, a test. <strong>No hook needed.</strong></p>
      <h3>Pros</h3>
      <ul>
        <li><strong>No hook to call an action.</strong> A button that only triggers
        <code>inc()</code> doesn't subscribe to the store, so it never re-renders because
        of it.</li>
        <li><strong>Code-splitting.</strong> Actions are separate exports. A lazily loaded
        feature can import only the actions it needs, and bundlers can tree-shake unused
        ones.</li>
        <li>Store state stays "pure data", easy to log or serialize.</li>
      </ul>
      <h3>Cons</h3>
      <ul>
        <li>Less <strong>encapsulation</strong>: state and logic live in different places,
        and you can't discover actions by looking at <code>getState()</code>.</li>
        <li>Only works with a <strong>global</strong> (module-level) store. With a
        per-component store from Context (later lesson), there's no single
        <code>useStore</code> to import, so actions must take the store as an argument.</li>
      </ul>
      <div class="tip">Analogy: colocated actions are like a TV with buttons on it.
      Outside actions are like a remote control: you can use it from anywhere in the room,
      but it's a separate thing you have to keep track of.</div>
      <div class="warn">The docs say this pattern "doesn't offer any downsides", it's just
      a style choice. Pick one style per store and stick with it; mixing both in the same
      store confuses readers.</div>
    `,
    examples: [
      {
        title: 'Module-level actions',
        code: `import { create } from 'zustand';

const useCounter = create(() => ({
  count: 0,
  text: 'hello',
}));

// Actions: plain functions, no hook required
const inc = () => useCounter.setState((s) => ({ count: s.count + 1 }));
const reset = () => useCounter.setState({ count: 0 });
const setText = (text) => useCounter.setState({ text });

// Non-React code can call them too
function incLater() {
  console.log('timer started');
  setTimeout(() => {
    inc();
    console.log('timer fired, count =', useCounter.getState().count);
  }, 1000);
}

function Display() {
  const count = useCounter((s) => s.count);
  const text = useCounter((s) => s.text);
  console.log('Display render');
  return (
    <p>
      {text}: <strong>{count}</strong>
    </p>
  );
}

function Controls() {
  // No useCounter() here: this component never subscribes
  console.log('Controls render');
  return (
    <div>
      <button onClick={inc}>+1</button>{' '}
      <button onClick={reset}>reset</button>{' '}
      <button onClick={incLater}>+1 in 1s</button>{' '}
      <input
        placeholder="label"
        onChange={(e) => setText(e.target.value)}
        style={{ width: 90 }}
      />
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Display />
      <Controls />
      <p style={{ color: 'gray' }}>
        Click around: only "Display render" repeats in the console.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'How does a module-level action update the store?',
        options: [
          'It calls the hook <code>useCounter()</code>',
          'It calls <code>useCounter.setState(...)</code>',
          'It mutates <code>useCounter.getState().count</code>',
          'It dispatches an event',
        ],
        answer: 1,
        why: 'The hook returned by create also carries the store API: setState, getState, subscribe. No hook call needed.',
      },
      {
        q: 'Which is a benefit of actions outside the store, per the docs?',
        options: [
          'Faster set calls',
          'Automatic persistence',
          'No hook needed to call an action, and easier code-splitting',
          'Actions become async automatically',
        ],
        answer: 2,
        why: 'Those are the two advantages listed in the "Practice with no store actions" guide.',
      },
      {
        q: 'A component only renders <code>&lt;button onClick={inc}&gt;</code> and never calls the store hook. When count changes, does it re-render?',
        options: ['Yes, every time', 'No, it is not subscribed', 'Only once', 'Only in StrictMode'],
        answer: 1,
        why: 'Re-renders come from subscriptions (hook + selector). Importing a function subscribes to nothing.',
      },
      {
        q: 'When is this pattern awkward?',
        options: [
          'With a global store made by <code>create</code>',
          'With a per-component store provided through React Context',
          'When using selectors',
          'When the store has numbers',
        ],
        answer: 1,
        why: 'Module-level functions need a module-level store to point at. A Context store only exists inside the tree.',
      },
    ],
    exercise: {
      task: `
        <p>The store below is data-only. Write module-level actions
        <code>addItem(name)</code>, <code>removeItem(name)</code> and <code>clear()</code>
        using <code>useCart.setState</code>, then wire them to the buttons. Also make the
        "Add random in 1s" button call <code>addItem</code> from a <code>setTimeout</code>.</p>
      `,
      starter: `import { create } from 'zustand';

const useCart = create(() => ({
  items: ['apple'],
}));

// TODO: addItem, removeItem, clear

export default function App() {
  const items = useCart((s) => s.items);
  return (
    <div>
      <button>Add banana</button>{' '}
      <button>Add random in 1s</button>{' '}
      <button>Clear</button>
      <ul>
        {items.map((it, i) => (
          <li key={i}>
            {it} <button>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
      hint: 'addItem: useCart.setState((s) => ({ items: [...s.items, name] })). removeItem can filter. Remember setState merges, so you only return { items }.',
      solution: `import { create } from 'zustand';

const useCart = create(() => ({
  items: ['apple'],
}));

const addItem = (name) =>
  useCart.setState((s) => ({ items: [...s.items, name] }));
const removeItem = (name) =>
  useCart.setState((s) => ({ items: s.items.filter((it) => it !== name) }));
const clear = () => useCart.setState({ items: [] });

const FRUITS = ['kiwi', 'mango', 'pear'];
const addRandomLater = () =>
  setTimeout(() => addItem(FRUITS[Math.floor(Math.random() * FRUITS.length)]), 1000);

export default function App() {
  const items = useCart((s) => s.items);
  return (
    <div>
      <button onClick={() => addItem('banana')}>Add banana</button>{' '}
      <button onClick={addRandomLater}>Add random in 1s</button>{' '}
      <button onClick={clear}>Clear</button>
      <ul>
        {items.map((it, i) => (
          <li key={i}>
            {it} <button onClick={() => removeItem(it)}>x</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── slices
  {
    id: 'slices',
    section: 'Structuring stores',
    title: 'The slices pattern',
    explain: `
      <p>One store for the whole app is recommended, but one giant
      <code>create(...)</code> call with 50 fields gets messy. The <strong>slices
      pattern</strong> splits the store <em>definition</em> into small functions, then
      glues them into <strong>one</strong> store.</p>
      <pre><code>const createBearSlice = (set, get, store) =&gt; ({
  bears: 0,
  addBear: () =&gt; set((s) =&gt; ({ bears: s.bears + 1 })),
});

const createFishSlice = (set, get, store) =&gt; ({
  fishes: 0,
  addFish: () =&gt; set((s) =&gt; ({ fishes: s.fishes + 1 })),
});

const useBoundStore = create((...a) =&gt; ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));</code></pre>
      <h3>Why it works</h3>
      <p>A slice has exactly the same signature as the function you pass to
      <code>create</code>: <code>(set, get, store) =&gt; object</code>. Zustand calls this
      a <strong>state creator</strong>. The combined creator just forwards its three
      arguments to every slice and spreads the returned objects into one.</p>
      <ul>
        <li><code>set</code> and <code>get</code> are the <strong>same</strong> functions for
        every slice. They work on the <em>whole</em> store, not a private part.</li>
        <li>Because <code>set</code> merges at the top level, a slice that writes
        <code>{ bears }</code> leaves <code>fishes</code> alone.</li>
        <li>The result is still one store, one hook: <code>useBoundStore((s) =&gt; s.fishes)</code>.</li>
      </ul>
      <div class="tip">Analogy: slices are chapters written by different authors. The
      book (store) is bound into one volume. Every chapter shares the same page numbers
      (<code>set</code>/<code>get</code>).</div>
      <h3>TypeScript note</h3>
      <p>In TS, each slice is typed with <code>StateCreator</code>. The first type argument
      is the <em>whole</em> store, the last is what this slice returns:</p>
      <pre><code class="language-javascript">import { create, StateCreator } from 'zustand';

const createBearSlice: StateCreator&lt;BearSlice &amp; FishSlice, [], [], BearSlice&gt; =
  (set) =&gt; ({ bears: 0, addBear: () =&gt; set((s) =&gt; ({ bears: s.bears + 1 })) });

const useBoundStore = create&lt;BearSlice &amp; FishSlice&gt;()((...a) =&gt; ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));</code></pre>
      <div class="warn">Apply middleware (<code>persist</code>, <code>devtools</code>,
      <code>immer</code>) only on the <strong>combined</strong> store, not inside
      individual slices. Middleware inside slices can behave unexpectedly.</div>
    `,
    examples: [
      {
        title: 'Two slices, one store (what is ...a?)',
        code: `import { create } from 'zustand';

const createBearSlice = (set, get, api) => {
  console.log('bear slice got', typeof set, typeof get, typeof api.getState);
  return {
    bears: 0,
    addBear: () => set((s) => ({ bears: s.bears + 1 })),
  };
};

const createFishSlice = (set) => {
  console.log('fish slice created');
  return {
    fishes: 0,
    addFish: () => set((s) => ({ fishes: s.fishes + 1 })),
  };
};

const useBoundStore = create((...a) => {
  console.log('a.length =', a.length);
  return {
    ...createBearSlice(...a),
    ...createFishSlice(...a),
  };
});

console.log('keys:', Object.keys(useBoundStore.getState()).join(', '));

export default function App() {
  const bears = useBoundStore((s) => s.bears);
  const fishes = useBoundStore((s) => s.fishes);
  const addBear = useBoundStore((s) => s.addBear);
  const addFish = useBoundStore((s) => s.addFish);

  return (
    <div>
      <p>🐻 {bears} bears · 🐟 {fishes} fishes</p>
      <button onClick={addBear}>Add bear</button>{' '}
      <button onClick={addFish}>Add fish</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: one huge state creator</summary>
            <p>Without slices, every field and action lives in one function. Bears, fish,
            user, cart, settings… a 500-line object that everyone edits at once. You'd like
            one file per feature, but <strong>still one store</strong> (one subscription
            system, one place for middleware, easy cross-feature actions).</p>
            <p>Slices give you both: separate functions for writing, one object at the
            end.</p>
          </details>
          <details>
            <summary>Step by step: what happens when the module loads</summary>
            <table>
              <tr><th>Step</th><th>What runs</th><th>Result</th><th>Console</th></tr>
              <tr><td>1</td><td><code>create(fn)</code> builds the store API and calls
                <code>fn(set, get, api)</code>. The rest parameter collects them:
                <code>a = [set, get, api]</code></td><td>-</td>
                <td><code>a.length = 3</code></td></tr>
              <tr><td>2</td><td><code>createBearSlice(...a)</code> is the same as
                <code>createBearSlice(set, get, api)</code></td>
                <td><code>{ bears: 0, addBear }</code></td>
                <td><code>bear slice got function function function</code></td></tr>
              <tr><td>3</td><td><code>createFishSlice(...a)</code> (it only names
                <code>set</code>; extra args are ignored)</td>
                <td><code>{ fishes: 0, addFish }</code></td>
                <td><code>fish slice created</code></td></tr>
              <tr><td>4</td><td>Object spread copies both into one new object</td>
                <td><code>{ bears, addBear, fishes, addFish }</code></td><td>-</td></tr>
              <tr><td>5</td><td>That object becomes the initial state</td>
                <td>one store, one hook</td>
                <td><code>keys: bears, addBear, fishes, addFish</code></td></tr>
            </table>
            <p>Then clicking <strong>Add fish</strong> calls
            <code>set((s) =&gt; ({ fishes: s.fishes + 1 }))</code>. <code>s</code> is the
            <em>whole</em> state, and the merge only replaces <code>fishes</code>, so
            <code>bears</code> is untouched.</p>
          </details>
          <details>
            <summary>Key lines explained: the two different <code>...</code></summary>
            <pre><code>create((...a) =&gt; ({            // ① rest: gather args into array a
  ...createBearSlice(...a),     // ② spread args: call with (set, get, api)
  ...createFishSlice(...a),     // ③ object spread: copy keys into the result
}));</code></pre>
            <ol>
              <li><strong>①</strong> <code>(...a)</code> in a parameter list is a
              <em>rest parameter</em>: "put all arguments in an array called
              <code>a</code>". It's just shorter than writing
              <code>(set, get, api)</code>.</li>
              <li><strong>②</strong> <code>fn(...a)</code> in a call is <em>argument
              spread</em>: unpack the array back into separate arguments.</li>
              <li><strong>③</strong> <code>{ ...obj }</code> is <em>object spread</em>:
              copy all keys. If two slices use the <strong>same key</strong>, the later one
              silently wins (next lesson).</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add a third slice <code>createTreeSlice</code> with <code>trees: 5</code>
              and spread it in. Check the <code>keys:</code> log.</li>
              <li>Swap the order of the two spreads. Keys change order, nothing else
              changes (no collisions yet).</li>
              <li>In the fish slice, log <code>set === </code> the bear's
              <code>set</code> (save it in a variable): it's <code>true</code>, they
              share one <code>set</code>.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In <code>create((...a) =&gt; ...)</code>, what is <code>a</code>?',
        options: [
          'An array of slices',
          'An array <code>[set, get, store]</code>',
          'The initial state',
          'The list of subscribed components',
        ],
        answer: 1,
        why: 'The state creator is called with (set, get, store). The rest parameter collects them into an array.',
      },
      {
        q: 'How many stores does the slices pattern produce?',
        options: ['One per slice', 'Exactly one', 'One per component', 'Two: state and actions'],
        answer: 1,
        why: 'Slices are just functions that return pieces of one state object. They are merged into a single store.',
      },
      {
        q: 'In the bear slice, <code>set((s) =&gt; ({ bears: s.bears + 1 }))</code>. What happens to <code>fishes</code>?',
        options: [
          'It is deleted',
          'It is reset to 0',
          'It is kept, because set merges at the top level',
          'It becomes undefined until the fish slice re-runs',
        ],
        answer: 2,
        why: 'set shallow-merges the returned object into the whole state. Keys you don\'t return are kept.',
      },
      {
        q: 'Where should middleware like <code>persist</code> go?',
        options: [
          'Inside each slice',
          'Only around the combined store creator',
          'Around every action',
          'Middleware can\'t be used with slices',
        ],
        answer: 1,
        why: 'The slices guide recommends applying middleware only at the combined store level.',
      },
    ],
    exercise: {
      task: `
        <p>Split this store into two slices:</p>
        <ul>
          <li><code>createUserSlice</code>: <code>name</code> and <code>setName(name)</code></li>
          <li><code>createThemeSlice</code>: <code>dark</code> (boolean) and
          <code>toggleDark()</code></li>
        </ul>
        <p>Combine them with <code>create((...a) =&gt; ({ ... }))</code>. The UI should
        keep working.</p>
      `,
      starter: `import { create } from 'zustand';

// TODO: turn this into createUserSlice + createThemeSlice
const useAppStore = create((set) => ({
  name: 'Guest',
  setName: (name) => set({ name }),
  dark: false,
  toggleDark: () => set((s) => ({ dark: !s.dark })),
}));

export default function App() {
  const { name, setName, dark, toggleDark } = useAppStore();
  return (
    <div
      style={{
        padding: 12,
        background: dark ? '#222' : '#fff',
        color: dark ? '#eee' : '#222',
      }}
    >
      <p>Hello, {name}!</p>
      <input value={name} onChange={(e) => setName(e.target.value)} />{' '}
      <button onClick={toggleDark}>Toggle theme</button>
    </div>
  );
}`,
      hint: 'Each slice is (set) => ({ ...fields, ...actions }). Then create((...a) => ({ ...createUserSlice(...a), ...createThemeSlice(...a) })).',
      solution: `import { create } from 'zustand';

const createUserSlice = (set) => ({
  name: 'Guest',
  setName: (name) => set({ name }),
});

const createThemeSlice = (set) => ({
  dark: false,
  toggleDark: () => set((s) => ({ dark: !s.dark })),
});

const useAppStore = create((...a) => ({
  ...createUserSlice(...a),
  ...createThemeSlice(...a),
}));

export default function App() {
  const { name, setName, dark, toggleDark } = useAppStore();
  return (
    <div
      style={{
        padding: 12,
        background: dark ? '#222' : '#fff',
        color: dark ? '#eee' : '#222',
      }}
    >
      <p>Hello, {name}!</p>
      <input value={name} onChange={(e) => setName(e.target.value)} />{' '}
      <button onClick={toggleDark}>Toggle theme</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── slices-cross
  {
    id: 'slices-cross',
    section: 'Structuring stores',
    title: 'Slices talking to each other',
    explain: `
      <p>Slices are separate <em>files</em>, but at runtime they're one object. So a
      slice can freely read and write <strong>another slice's</strong> fields: its
      <code>get()</code> and <code>set()</code> see the whole store.</p>
      <pre><code>const createBearSlice = (set, get) =&gt; ({
  bears: 0,
  addBear: () =&gt; set((s) =&gt; ({ bears: s.bears + 1 })),
  eatFish: () =&gt; set((s) =&gt; ({ fishes: s.fishes - 1 })),  // touches fish slice!
});</code></pre>
      <h3>Shared actions</h3>
      <p>For actions that belong to no single slice ("add one of everything", "log out
      and clear all"), make a <strong>shared slice</strong> that calls other slices'
      actions via <code>get()</code>:</p>
      <pre><code>const createSharedSlice = (set, get) =&gt; ({
  addBoth: () =&gt; {
    get().addBear();
    get().addFish();
  },
});</code></pre>
      <div class="tip">Calling <code>get().addBear()</code> reuses the bear slice's logic
      instead of copying it. If the bear rules change, <code>addBoth</code> follows
      automatically.</div>
      <h3>Name collisions</h3>
      <p>Object spread doesn't warn. If two slices both define <code>reset</code> or
      <code>count</code>, the slice spread <strong>last</strong> wins and the other is
      silently gone.</p>
      <div class="warn">Prefix names by feature (<code>bears</code>,
      <code>resetBears</code>, <code>fishes</code>, <code>resetFishes</code>) or nest
      state (<code>bear: { count }</code>). TypeScript catches some collisions if you
      type slices with <code>StateCreator</code>, plain JS catches none.</div>
    `,
    examples: [
      {
        title: 'eatFish + a shared addBoth action',
        code: `import { create } from 'zustand';

const createBearSlice = (set, get) => ({
  bears: 0,
  addBear: () => set((s) => ({ bears: s.bears + 1 })),
  eatFish: () => {
    if (get().fishes === 0) {
      console.log('eatFish: no fish left!');
      return;
    }
    set((s) => ({ fishes: s.fishes - 1 }));
    console.log(\`eatFish: fishes now \${get().fishes}\`);
  },
});

const createFishSlice = (set) => ({
  fishes: 3,
  addFish: () => set((s) => ({ fishes: s.fishes + 1 })),
});

const createSharedSlice = (set, get) => ({
  addBoth: () => {
    get().addBear();
    get().addFish();
    console.log(\`addBoth: bears=\${get().bears}, fishes=\${get().fishes}\`);
  },
});

const useBoundStore = create((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
  ...createSharedSlice(...a),
}));

export default function App() {
  const bears = useBoundStore((s) => s.bears);
  const fishes = useBoundStore((s) => s.fishes);
  const eatFish = useBoundStore((s) => s.eatFish);
  const addBoth = useBoundStore((s) => s.addBoth);

  return (
    <div>
      <p>🐻 {bears} bears · 🐟 {fishes} fishes</p>
      <button onClick={eatFish}>Bear eats a fish</button>{' '}
      <button onClick={addBoth}>Add both</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: features aren't islands</summary>
            <p>Bears eat fish. A bear action needs to change fish state. If slices were
            separate stores, you'd have to import the other store and coordinate two
            updates. With slices it's one store, so <code>set</code> can update
            <code>fishes</code> from the bear slice in a single, atomic update.</p>
          </details>
          <details>
            <summary>Step by step: 4× "Bear eats a fish", then "Add both"</summary>
            <table>
              <tr><th>Click</th><th>What runs</th><th>State after</th><th>Console</th></tr>
              <tr><td>start</td><td>-</td><td>bears 0, fishes 3</td><td>-</td></tr>
              <tr><td>Eat #1</td><td><code>get().fishes</code> is 3 → set fishes 2</td>
                <td>bears 0, fishes 2</td><td><code>eatFish: fishes now 2</code></td></tr>
              <tr><td>Eat #2</td><td>set fishes 1</td>
                <td>bears 0, fishes 1</td><td><code>eatFish: fishes now 1</code></td></tr>
              <tr><td>Eat #3</td><td>set fishes 0</td>
                <td>bears 0, fishes 0</td><td><code>eatFish: fishes now 0</code></td></tr>
              <tr><td>Eat #4</td><td><code>get().fishes === 0</code> → return early</td>
                <td>bears 0, fishes 0</td><td><code>eatFish: no fish left!</code></td></tr>
              <tr><td>Add both</td><td><code>get().addBear()</code> then
                <code>get().addFish()</code> (two <code>set</code> calls)</td>
                <td>bears 1, fishes 1</td>
                <td><code>addBoth: bears=1, fishes=1</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>eatFish: () =&gt; {
  if (get().fishes === 0) return;              // ① read another slice's field
  set((s) =&gt; ({ fishes: s.fishes - 1 }));      // ② write another slice's field
},
addBoth: () =&gt; {
  get().addBear();                             // ③ call another slice's action
  get().addFish();
  console.log(get().bears, get().fishes);      // ④ get() sees the new values
},</code></pre>
            <ol>
              <li><strong>①</strong> <code>get()</code> returns the whole store, so
              <code>fishes</code> is right there even though the bear slice didn't
              define it.</li>
              <li><strong>②</strong> <code>set</code> is shared too. It merges
              <code>{ fishes }</code> into the one store.</li>
              <li><strong>③</strong> Actions are just functions stored in state, so
              <code>get().addBear()</code> calls them.</li>
              <li><strong>④</strong> <code>set</code> is synchronous: right after it,
              <code>get()</code> already returns the updated state.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Add a <code>createSharedSlice</code> action <code>feast()</code> that
              calls <code>eatFish()</code> once per bear.</li>
              <li>Rename <code>addFish</code> in the fish slice to <code>addBear</code>.
              The bear button now adds fish: the last spread wins. That's a name
              collision.</li>
            </ul>
            <div class="warn">Don't destructure <code>const { fishes } = get()</code> once
            and reuse it after calling other actions. It's a snapshot. Call
            <code>get()</code> again to see the latest.</div>
          </details>
        `,
      },
      {
        title: 'Name collision: last spread wins',
        code: `import { create } from 'zustand';

const createCatSlice = (set) => ({
  count: 0,
  reset: () => {
    console.log('cat reset');
    set({ count: 0 });
  },
});

const createDogSlice = (set) => ({
  count: 100, // same key!
  reset: () => {
    console.log('dog reset');
    set({ count: 100 });
  },
});

const useStore = create((...a) => ({
  ...createCatSlice(...a),
  ...createDogSlice(...a),
}));

console.log('keys:', Object.keys(useStore.getState()).join(', '));
console.log('count at start:', useStore.getState().count);

export default function App() {
  const count = useStore((s) => s.count);
  const reset = useStore((s) => s.reset);
  return (
    <div>
      <p>count = {count} (the cat slice's 0 is gone)</p>
      <button onClick={() => useStore.setState({ count: count + 1 })}>+1</button>{' '}
      <button onClick={reset}>reset</button>
      <p style={{ color: 'gray' }}>reset always logs "dog reset".</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Can the bear slice update <code>fishes</code>, a field defined in the fish slice?',
        options: [
          'No, slices are isolated',
          'Yes, set and get work on the whole store',
          'Only with middleware',
          'Only by importing the fish slice',
        ],
        answer: 1,
        why: 'All slices receive the same set/get for the one combined store.',
      },
      {
        q: 'Two slices both define <code>reset</code>. What happens?',
        options: [
          'Zustand throws an error',
          'Both run when you call reset',
          'The one spread last silently overwrites the other',
          'The first one wins',
        ],
        answer: 2,
        why: 'It is plain object spread: later keys overwrite earlier ones with no warning.',
      },
      {
        q: 'Inside <code>addBoth</code>, after <code>get().addBear()</code>, what does <code>get().bears</code> return?',
        options: ['The old value', 'The new value', 'undefined', 'A promise'],
        answer: 1,
        why: 'set updates the store synchronously, so get() immediately reflects it.',
      },
      {
        q: 'Best way to avoid collisions between slices?',
        options: [
          'Put everything in one slice',
          'Use prefixed/feature-specific names or nested objects',
          'Call create twice',
          'Freeze the state',
        ],
        answer: 1,
        why: 'Distinct names like resetBears / resetFishes (or nesting) make collisions impossible.',
      },
    ],
    exercise: {
      task: `
        <p>Add a shared slice with a <code>checkout()</code> action that:</p>
        <ul>
          <li>reads <code>items</code> from the cart slice and <code>balance</code> from the
          wallet slice via <code>get()</code>,</li>
          <li>if the total price is more than the balance, logs
          <code>not enough money</code> and does nothing,</li>
          <li>otherwise subtracts the total from <code>balance</code> and empties
          <code>items</code> in <strong>one</strong> <code>set</code> call.</li>
        </ul>
      `,
      starter: `import { create } from 'zustand';

const createCartSlice = (set) => ({
  items: [],
  addItem: (price) => set((s) => ({ items: [...s.items, price] })),
});

const createWalletSlice = () => ({
  balance: 50,
});

// TODO: createCheckoutSlice with checkout()
const createCheckoutSlice = (set, get) => ({
  checkout: () => {},
});

const useShop = create((...a) => ({
  ...createCartSlice(...a),
  ...createWalletSlice(...a),
  ...createCheckoutSlice(...a),
}));

export default function App() {
  const { items, balance, addItem, checkout } = useShop();
  const total = items.reduce((sum, p) => sum + p, 0);
  return (
    <div>
      <p>Balance: {balance} · Cart: {items.length} items, total {total}</p>
      <button onClick={() => addItem(10)}>Add 10</button>{' '}
      <button onClick={() => addItem(25)}>Add 25</button>{' '}
      <button onClick={checkout}>Checkout</button>
    </div>
  );
}`,
      hint: 'const { items, balance } = get(); compute total with reduce; then set({ balance: balance - total, items: [] }).',
      solution: `import { create } from 'zustand';

const createCartSlice = (set) => ({
  items: [],
  addItem: (price) => set((s) => ({ items: [...s.items, price] })),
});

const createWalletSlice = () => ({
  balance: 50,
});

const createCheckoutSlice = (set, get) => ({
  checkout: () => {
    const { items, balance } = get();
    const total = items.reduce((sum, p) => sum + p, 0);
    if (total > balance) {
      console.log('not enough money');
      return;
    }
    set({ balance: balance - total, items: [] });
  },
});

const useShop = create((...a) => ({
  ...createCartSlice(...a),
  ...createWalletSlice(...a),
  ...createCheckoutSlice(...a),
}));

export default function App() {
  const { items, balance, addItem, checkout } = useShop();
  const total = items.reduce((sum, p) => sum + p, 0);
  return (
    <div>
      <p>Balance: {balance} · Cart: {items.length} items, total {total}</p>
      <button onClick={() => addItem(10)}>Add 10</button>{' '}
      <button onClick={() => addItem(25)}>Add 25</button>{' '}
      <button onClick={checkout}>Checkout</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── multiple-stores
  {
    id: 'multiple-stores',
    section: 'Structuring stores',
    title: 'One big store vs many small stores',
    explain: `
      <p>Zustand lets you call <code>create</code> as many times as you like. So should
      you have <strong>one store with slices</strong>, or <strong>many small
      stores</strong> (<code>useAuthStore</code>, <code>useCartStore</code>, …)?</p>
      <h3>What the docs recommend</h3>
      <p>The <em>Flux inspired practice</em> guide says: "Your application's global state
      should be located in a <strong>single Zustand store</strong>. If you have a large
      application, Zustand supports splitting the store into slices." That said, it's a
      recommendation, not a rule. Many real apps use several independent stores
      happily.</p>
      <table>
        <tr><th></th><th>One store + slices</th><th>Many small stores</th></tr>
        <tr><td>Cross-feature updates</td><td>Easy: one <code>set</code>, atomic</td>
          <td>Two stores, two updates</td></tr>
        <tr><td>Middleware (persist, devtools)</td><td>Configure once</td>
          <td>Per store (can be a plus: persist only some)</td></tr>
        <tr><td>Independence / code-splitting</td><td>Everything loads together</td>
          <td>Each feature owns its store</td></tr>
        <tr><td>Name collisions</td><td>Possible (shared namespace)</td>
          <td>None</td></tr>
      </table>
      <h3>Stores reading each other</h3>
      <p>With several stores, an action in one store can read another with
      <code>getState()</code>. No hook, because actions aren't components:</p>
      <pre><code>const useCartStore = create((set) =&gt; ({
  items: [],
  checkout: () =&gt; {
    const user = useAuthStore.getState().user;   // read another store
    if (!user) return;
    // ...
  },
}));</code></pre>
      <div class="warn"><code>getState()</code> is a one-time read, <strong>not a
      subscription</strong>. If a component needs to re-render when both stores change,
      call both hooks in the component and combine there.</div>
      <div class="tip">Rule of thumb: if two pieces of state are often updated
      <em>together</em>, keep them in one store. If they're truly independent (a theme
      toggle and a chat widget), separate stores are fine.</div>
    `,
    examples: [
      {
        title: 'Two stores: auth + cart',
        code: `import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  login: (name, tier) => set({ user: { name, tier } }),
  logout: () => set({ user: null }),
}));

const useCartStore = create((set, get) => ({
  items: [],
  add: (price) => set((s) => ({ items: [...s.items, price] })),
  checkout: () => {
    const user = useAuthStore.getState().user; // one-time read
    if (!user) {
      console.log('checkout: please log in first');
      return;
    }
    const sum = get().items.reduce((a, b) => a + b, 0);
    const total = user.tier === 'gold' ? sum * 0.9 : sum;
    console.log(\`checkout: \${user.name} pays \${total}\`);
    set({ items: [] });
  },
}));

function CartSummary() {
  // Subscribe to BOTH stores so the discount updates on login/logout
  const items = useCartStore((s) => s.items);
  const tier = useAuthStore((s) => s.user?.tier);
  const sum = items.reduce((a, b) => a + b, 0);
  const total = tier === 'gold' ? sum * 0.9 : sum;
  return (
    <p>
      {items.length} items · total {total}
      {tier === 'gold' && ' (gold -10%)'}
    </p>
  );
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  const { login, logout } = useAuthStore.getState();
  const { add, checkout } = useCartStore.getState();

  return (
    <div>
      <p>User: {user ? \`\${user.name} (\${user.tier})\` : 'guest'}</p>
      <button onClick={() => login('Ana', 'gold')}>Login gold</button>{' '}
      <button onClick={() => login('Ben', 'basic')}>Login basic</button>{' '}
      <button onClick={logout}>Logout</button>
      <div style={{ marginTop: 8 }}>
        <button onClick={() => add(100)}>Add 100</button>{' '}
        <button onClick={checkout}>Checkout</button>
      </div>
      <CartSummary />
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does the Flux-inspired guide recommend for global state?',
        options: [
          'One store per component',
          'A single store, split into slices if large',
          'Always use React Context instead',
          'One store per field',
        ],
        answer: 1,
        why: '"Your application\'s global state should be located in a single Zustand store", with slices for large apps.',
      },
      {
        q: 'Inside a cart store action, how do you read the auth store?',
        options: [
          '<code>useAuthStore()</code>',
          '<code>useAuthStore.getState()</code>',
          '<code>useContext(AuthStore)</code>',
          'You can\'t read another store',
        ],
        answer: 1,
        why: 'Hooks only work in components. getState() works anywhere.',
      },
      {
        q: 'A component calls <code>useAuthStore.getState().user</code> during render. What happens on login?',
        options: [
          'It re-renders with the new user',
          'It does not re-render: getState() doesn\'t subscribe',
          'It throws',
          'It re-renders twice',
        ],
        answer: 1,
        why: 'getState() is a snapshot. To react to changes in a component, use the hook with a selector.',
      },
      {
        q: 'Which is a real advantage of many small stores?',
        options: [
          'Atomic cross-feature updates',
          'No name collisions and features can be split/loaded independently',
          'Fewer re-renders automatically',
          'Middleware configured only once',
        ],
        answer: 1,
        why: 'Separate stores have separate namespaces and can live in separate chunks. Atomic cross-updates favor one store.',
      },
    ],
    exercise: {
      task: `
        <p>There are two stores: <code>useSettings</code> (with <code>currency</code>) and
        <code>usePrices</code>. Implement <code>usePrices.describe()</code> so it logs
        <code>Coffee costs 3 USD</code> using the <strong>current</strong> currency from
        <code>useSettings.getState()</code>. Then make the <code>&lt;Price&gt;</code>
        component re-render when currency changes (hint: it must subscribe to both
        stores).</p>
      `,
      starter: `import { create } from 'zustand';

const useSettings = create((set) => ({
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
}));

const usePrices = create((set, get) => ({
  item: 'Coffee',
  price: 3,
  describe: () => {
    // TODO: log "<item> costs <price> <currency>"
  },
}));

function Price() {
  const item = usePrices((s) => s.item);
  const price = usePrices((s) => s.price);
  const currency = 'USD'; // TODO: subscribe to useSettings
  return <p>{item}: {price} {currency}</p>;
}

export default function App() {
  const setCurrency = useSettings((s) => s.setCurrency);
  const describe = usePrices((s) => s.describe);
  return (
    <div>
      <button onClick={() => setCurrency('USD')}>USD</button>{' '}
      <button onClick={() => setCurrency('EUR')}>EUR</button>{' '}
      <button onClick={describe}>Describe</button>
      <Price />
    </div>
  );
}`,
      hint: 'In describe: const { currency } = useSettings.getState(). In Price: const currency = useSettings((s) => s.currency).',
      solution: `import { create } from 'zustand';

const useSettings = create((set) => ({
  currency: 'USD',
  setCurrency: (currency) => set({ currency }),
}));

const usePrices = create((set, get) => ({
  item: 'Coffee',
  price: 3,
  describe: () => {
    const { currency } = useSettings.getState();
    const { item, price } = get();
    console.log(\`\${item} costs \${price} \${currency}\`);
  },
}));

function Price() {
  const item = usePrices((s) => s.item);
  const price = usePrices((s) => s.price);
  const currency = useSettings((s) => s.currency);
  return <p>{item}: {price} {currency}</p>;
}

export default function App() {
  const setCurrency = useSettings((s) => s.setCurrency);
  const describe = usePrices((s) => s.describe);
  return (
    <div>
      <button onClick={() => setCurrency('USD')}>USD</button>{' '}
      <button onClick={() => setCurrency('EUR')}>EUR</button>{' '}
      <button onClick={describe}>Describe</button>
      <Price />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── reset-state
  {
    id: 'reset-state',
    section: 'Structuring stores',
    title: 'Resetting state',
    explain: `
      <p>"Log out", "new game", "clear form": you often need to put a store back to how it
      started. Two simple ways:</p>
      <h3>1. Keep an <code>initialState</code> object</h3>
      <pre><code>const initialState = { count: 0, name: '' };

const useStore = create((set) =&gt; ({
  ...initialState,
  inc: () =&gt; set((s) =&gt; ({ count: s.count + 1 })),
  reset: () =&gt; set(initialState),
}));</code></pre>
      <p><code>set(initialState)</code> <strong>merges</strong>: it overwrites
      <code>count</code> and <code>name</code> and keeps the actions. That's exactly what
      you want.</p>
      <h3>2. Use <code>store.getInitialState()</code></h3>
      <p>Every Zustand v5 store remembers the state it was created with. The third
      argument of the state creator is the store API:</p>
      <pre><code>const useStore = create((set, get, store) =&gt; ({
  count: 0,
  inc: () =&gt; set((s) =&gt; ({ count: s.count + 1 })),
  reset: () =&gt; set(store.getInitialState()),
}));

// or from outside:
useStore.setState(useStore.getInitialState(), true);</code></pre>
      <div class="warn">Don't share mutable nested objects in <code>initialState</code>.
      If some code mutates <code>state.todos.push(...)</code> (it shouldn't!), it also
      mutates <code>initialState.todos</code>, and "reset" resets to the dirty version.
      Immutable updates keep <code>initialState</code> clean.</div>
      <h3>Resetting all slices</h3>
      <p>With slices, each slice can register its own reset function in a shared
      <code>Set</code>, and one <code>resetAllSlices()</code> runs them all (example 2).
      The docs use the same trick to reset <em>all stores</em> between tests.</p>
      <div class="tip">For tests, a <strong>store factory</strong> is even simpler:
      <code>const createCounterStore = () =&gt; createStore(...)</code>. Each test calls
      the factory and gets a fresh, independent store, so nothing needs resetting.</div>
    `,
    examples: [
      {
        title: 'initialState + reset',
        code: `import { create } from 'zustand';

const initialState = { count: 0, name: '' };

const useFormStore = create((set, get, store) => ({
  ...initialState,
  inc: () => set((s) => ({ count: s.count + 1 })),
  setName: (name) => set({ name }),
  reset: () => set(initialState),
  resetViaApi: () => set(store.getInitialState()),
}));

export default function App() {
  const { count, name, inc, setName, reset, resetViaApi } = useFormStore();
  return (
    <div>
      <input
        value={name}
        placeholder="your name"
        onChange={(e) => setName(e.target.value)}
      />{' '}
      <button onClick={inc}>count: {count}</button>
      <div style={{ marginTop: 8 }}>
        <button onClick={reset}>reset (initialState)</button>{' '}
        <button onClick={resetViaApi}>reset (getInitialState)</button>
      </div>
      <p style={{ color: 'gray' }}>Both resets keep the actions working.</p>
    </div>
  );
}`,
      },
      {
        title: 'Reset all slices at once',
        code: `import { create } from 'zustand';

const sliceResetFns = new Set();

const resetAllSlices = () => {
  console.log(\`resetting \${sliceResetFns.size} slices\`);
  sliceResetFns.forEach((resetFn) => resetFn());
};

const initialBear = { bears: 0 };
const createBearSlice = (set) => {
  sliceResetFns.add(() => set(initialBear));
  return {
    ...initialBear,
    addBear: () => set((s) => ({ bears: s.bears + 1 })),
  };
};

const initialFish = { fishes: 10 };
const createFishSlice = (set) => {
  sliceResetFns.add(() => set(initialFish));
  return {
    ...initialFish,
    eatFish: () => set((s) => ({ fishes: Math.max(0, s.fishes - 1) })),
    resetFishes: () => set(initialFish),
  };
};

const useBoundStore = create((...a) => ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));

export default function App() {
  const { bears, fishes, addBear, eatFish, resetFishes } = useBoundStore();
  return (
    <div>
      <p>🐻 {bears} · 🐟 {fishes}</p>
      <button onClick={addBear}>Add bear</button>{' '}
      <button onClick={eatFish}>Eat fish</button>
      <div style={{ marginTop: 8 }}>
        <button onClick={resetFishes}>Reset fish only</button>{' '}
        <button onClick={resetAllSlices}>Reset everything</button>
      </div>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Why doesn\'t <code>set(initialState)</code> delete the actions?',
        options: [
          'Actions are stored elsewhere',
          'set merges, so keys not in initialState (the actions) are kept',
          'Zustand protects functions',
          'It does delete them',
        ],
        answer: 1,
        why: 'set does a shallow merge by default. Only count and name are overwritten.',
      },
      {
        q: 'What does <code>store.getInitialState()</code> return?',
        options: [
          'The current state',
          'The state the store was created with (including actions)',
          'Only the non-function fields',
          'undefined unless you configured it',
        ],
        answer: 1,
        why: 'It returns the object your state creator produced at creation time, actions included.',
      },
      {
        q: 'Where does <code>store</code> come from in <code>create((set, get, store) =&gt; ...)</code>?',
        options: [
          'It is imported from zustand',
          'It is the third argument: the store API',
          'It is React context',
          'It is created by the reset action',
        ],
        answer: 1,
        why: 'The state creator receives (set, get, store). store has getState, setState, subscribe, getInitialState.',
      },
      {
        q: 'Simplest way to get a clean store in each unit test?',
        options: [
          'Reload the browser',
          'A factory like <code>() =&gt; createStore(...)</code> called per test',
          'Delete the module cache manually',
          'Mutate the state back by hand',
        ],
        answer: 1,
        why: 'A factory returns a brand-new store each call, so tests never share state.',
      },
    ],
    exercise: {
      task: `
        <p>Add a <code>newGame()</code> action that resets <code>score</code>,
        <code>lives</code> and <code>log</code> to their starting values using an
        <code>initialState</code> object. Make sure <code>best</code> is <strong>not</strong>
        reset (it should survive new games).</p>
      `,
      starter: `import { create } from 'zustand';

const useGame = create((set) => ({
  score: 0,
  lives: 3,
  log: [],
  best: 0,
  hit: () =>
    set((s) => {
      const score = s.score + 10;
      return { score, best: Math.max(s.best, score), log: [...s.log, '+10'] };
    }),
  miss: () =>
    set((s) => ({ lives: Math.max(0, s.lives - 1), log: [...s.log, 'miss'] })),
  // TODO: newGame
}));

export default function App() {
  const { score, lives, log, best, hit, miss, newGame } = useGame();
  return (
    <div>
      <p>Score {score} · Lives {lives} · Best {best}</p>
      <button onClick={hit} disabled={lives === 0}>Hit</button>{' '}
      <button onClick={miss} disabled={lives === 0}>Miss</button>{' '}
      <button onClick={() => newGame && newGame()}>New game</button>
      <p style={{ color: 'gray' }}>{log.join(' ')}</p>
    </div>
  );
}`,
      hint: 'const initialState = { score: 0, lives: 3, log: [] }; spread it into the store and use newGame: () => set(initialState). best is not in initialState, so the merge keeps it.',
      solution: `import { create } from 'zustand';

const initialState = { score: 0, lives: 3, log: [] };

const useGame = create((set) => ({
  ...initialState,
  best: 0,
  hit: () =>
    set((s) => {
      const score = s.score + 10;
      return { score, best: Math.max(s.best, score), log: [...s.log, '+10'] };
    }),
  miss: () =>
    set((s) => ({ lives: Math.max(0, s.lives - 1), log: [...s.log, 'miss'] })),
  newGame: () => set(initialState),
}));

export default function App() {
  const { score, lives, log, best, hit, miss, newGame } = useGame();
  return (
    <div>
      <p>Score {score} · Lives {lives} · Best {best}</p>
      <button onClick={hit} disabled={lives === 0}>Hit</button>{' '}
      <button onClick={miss} disabled={lives === 0}>Miss</button>{' '}
      <button onClick={newGame}>New game</button>
      <p style={{ color: 'gray' }}>{log.join(' ')}</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── context-store
  {
    id: 'context-store',
    section: 'Structuring stores',
    title: 'Store per component (createStore + Context)',
    explain: `
      <p>A store made with <code>create</code> at module level is a <strong>singleton</strong>:
      every component in the app shares it. Usually that's what you want. But sometimes
      you need a store <strong>per component instance</strong>:</p>
      <ul>
        <li><strong>Initialize from props.</strong> <code>&lt;Counter initial={10} /&gt;</code>
        should start at 10. A module-level store is created before any props exist.</li>
        <li><strong>Many independent instances.</strong> Two date pickers, three chat
        panels, each with its own state.</li>
        <li><strong>SSR.</strong> On a server, a module-level store is shared between
        <em>all users' requests</em>. A store per request (per render tree) avoids
        leaking data.</li>
      </ul>
      <h3>The recipe (from the docs)</h3>
      <ol>
        <li><code>createStore</code> (vanilla, no hook) inside a <strong>factory</strong>
        that takes initial props.</li>
        <li>A React <strong>Context</strong> to pass the store instance down.</li>
        <li>A <strong>provider</strong> that creates the store <em>once</em> with
        <code>useState(() =&gt; createCounterStore(props))</code>.</li>
        <li>A <strong>custom hook</strong> that reads the context and calls
        <code>useStore(store, selector)</code>, throwing if there's no provider.</li>
      </ol>
      <pre><code>import { createStore, useStore } from 'zustand';   // or createStore from 'zustand/vanilla'

const useCounter = (selector) =&gt; {
  const store = useContext(CounterContext);
  if (!store) throw new Error('Missing CounterContext.Provider in the tree');
  return useStore(store, selector);
};</code></pre>
      <div class="tip">Analogy: <code>create</code> is the office's one shared
      whiteboard. <code>createStore</code> + Context gives every meeting room its own
      whiteboard, and the custom hook means "use the whiteboard of the room you're
      in".</div>
      <div class="warn">Context only passes the <strong>store object</strong>, which never
      changes. Components still subscribe with selectors through <code>useStore</code>,
      so you keep Zustand's fine-grained re-renders. You don't get the "every consumer
      re-renders" problem of putting state directly into Context.</div>
      <p>In React 19 you can also write <code>&lt;CounterContext value={store}&gt;</code>
      instead of <code>&lt;CounterContext.Provider&gt;</code>. Both work.</p>
    `,
    examples: [
      {
        title: 'Two independent Counter providers',
        code: `import { createContext, useContext, useState } from 'react';
import { createStore, useStore } from 'zustand';

// ① factory: a NEW store each call, initialized from props
const createCounterStore = (label, initial = 0) => {
  console.log(\`store created for \${label} (start \${initial})\`);
  return createStore((set) => ({
    count: initial,
    inc: () => set((s) => ({ count: s.count + 1 })),
  }));
};

const CounterContext = createContext(null);

// ② provider: create the store ONCE per instance
function CounterProvider({ label, initial, children }) {
  const [store] = useState(() => createCounterStore(label, initial));
  return (
    <CounterContext.Provider value={store}>{children}</CounterContext.Provider>
  );
}

// ③ custom hook: like the hook from create(), but for "the nearest" store
function useCounter(selector) {
  const store = useContext(CounterContext);
  if (!store) throw new Error('Missing CounterContext.Provider in the tree');
  return useStore(store, selector);
}

function Display({ label }) {
  const count = useCounter((s) => s.count);
  return (
    <span>
      {label}: <strong>{count}</strong>{' '}
    </span>
  );
}

function IncButton() {
  const inc = useCounter((s) => s.inc);
  return <button onClick={inc}>+1</button>;
}

function Counter({ label }) {
  return (
    <div style={{ border: '1px solid #ccc', padding: 8, marginBottom: 6 }}>
      <Display label={label} />
      <IncButton />
    </div>
  );
}

export default function App() {
  return (
    <div>
      <CounterProvider label="A" initial={0}>
        <Counter label="A" />
      </CounterProvider>
      <CounterProvider label="B" initial={10}>
        <Counter label="B" />
      </CounterProvider>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: <code>create</code> gives you one global store</summary>
            <p>With <code>const useCounter = create(...)</code>, both counters would read
            the same <code>count</code>: clicking A would also change B. And there's no
            way to start B at 10, because the store is created when the module loads,
            before React renders anything and before any props exist.</p>
          </details>
          <details>
            <summary>Step by step: mount, then click A's +1 twice and B's +1 once</summary>
            <table>
              <tr><th>Step</th><th>What happens</th><th>Screen</th><th>Console</th></tr>
              <tr><td>Mount A</td><td>Provider A's <code>useState</code> initializer runs
                <code>createCounterStore('A', 0)</code> → store A</td>
                <td>A: 0</td><td><code>store created for A (start 0)</code></td></tr>
              <tr><td>Mount B</td><td>Provider B does the same with 10 → a
                <em>different</em> store B</td>
                <td>B: 10</td><td><code>store created for B (start 10)</code></td></tr>
              <tr><td>Click A +1</td><td><code>IncButton</code> inside A finds store A via
                context → <code>count</code> 1</td><td>A: 1, B: 10</td><td>-</td></tr>
              <tr><td>Click A +1</td><td>store A → 2. Provider A re-renders? No, only
                <code>Display</code> A (its selector changed)</td>
                <td>A: 2, B: 10</td><td>-</td></tr>
              <tr><td>Click B +1</td><td>store B → 11. Store A untouched</td>
                <td>A: 2, B: 11</td><td>-</td></tr>
            </table>
            <p>Note there's <strong>no</strong> "store created" log after clicks: the
            <code>useState</code> initializer only runs on the first render.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const [store] = useState(() =&gt; createCounterStore(label, initial)); // ①
&lt;CounterContext.Provider value={store}&gt;                              // ②
const store = useContext(CounterContext);                             // ③
return useStore(store, selector);                                     // ④</code></pre>
            <ol>
              <li><strong>①</strong> The arrow function is a <em>lazy initializer</em>:
              React calls it once on mount and keeps the result forever. The setter is
              ignored, we never replace the store. (Equivalent: a <code>useRef</code>
              that you fill once with <code>if (!ref.current) ref.current = createCounterStore(...)</code>.)</li>
              <li><strong>②</strong> Context carries the store <em>object</em>. Its
              identity never changes, so the Provider never forces consumers to
              re-render.</li>
              <li><strong>③</strong> Each component gets the store of its
              <strong>nearest</strong> provider. <code>IncButton</code> doesn't know or
              care whether it's in A or B.</li>
              <li><strong>④</strong> <code>useStore(store, selector)</code> is the
              React binding for vanilla stores. It's what the hook from
              <code>create</code> does internally.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Add a third <code>&lt;CounterProvider label="C" initial={100}&gt;</code>.
              A third store is created, independent from A and B.</li>
              <li>Put two <code>&lt;Counter label="A" /&gt;</code> inside the <em>same</em>
              provider: they share store A and move together.</li>
            </ul>
            <div class="warn">Don't write <code>const store = createCounterStore(...)</code>
            directly in the provider body. It would run on <strong>every render</strong>,
            making a fresh store (and losing the count) each time the provider
            re-renders. Always wrap it in <code>useState(() =&gt; ...)</code> or a
            ref.</div>
            <div class="tip">Changing the <code>initial</code> prop later does
            <strong>not</strong> reset the store: it was only used at creation. To start
            over, give the provider a new <code>key</code>, which remounts it.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why use <code>createStore</code> instead of <code>create</code> for a per-instance store?',
        options: [
          'createStore is faster',
          'createStore returns a vanilla store (no hook), which you create per instance and read with useStore',
          'create doesn\'t support actions',
          'createStore persists automatically',
        ],
        answer: 1,
        why: 'create makes one module-level hook+store. createStore just builds a store object you can make many of and pass via context.',
      },
      {
        q: 'Why <code>useState(() =&gt; createCounterStore(props))</code> instead of calling the factory directly in the body?',
        options: [
          'So the store is created only once per component instance',
          'Because hooks must return arrays',
          'To make the store async',
          'It is only a style preference',
        ],
        answer: 0,
        why: 'The lazy initializer runs only on mount. Calling the factory in the body would create a new store every render.',
      },
      {
        q: 'How does a consumer subscribe to a store coming from context?',
        options: [
          '<code>useContext(Ctx).count</code>',
          '<code>useStore(store, selector)</code>',
          '<code>store.subscribe()</code> inside render',
          '<code>create(store)</code>',
        ],
        answer: 1,
        why: 'useStore(store, selector) is the React binding for vanilla stores, with selector-based re-renders.',
      },
      {
        q: 'Which is NOT a reason for a store per component instance?',
        options: [
          'Initializing state from props',
          'Several independent instances on one page',
          'Avoiding shared state between requests in SSR',
          'Making a single global theme toggle',
        ],
        answer: 3,
        why: 'A single global toggle is exactly what a normal module-level create store is for.',
      },
      {
        q: 'Why does the custom hook throw when <code>store</code> is null?',
        options: [
          'To give a clear error when a component is used outside its Provider',
          'React requires it',
          'To reset the store',
          'useStore crashes on numbers',
        ],
        answer: 0,
        why: 'Without a Provider, the context default (null) is returned. A clear message beats a confusing "cannot read getState of null".',
      },
    ],
    exercise: {
      task: `
        <p>Build a per-instance <strong>toggle</strong> store:</p>
        <ul>
          <li><code>createToggleStore(initialOn)</code> using <code>createStore</code> with
          <code>on</code> and <code>toggle()</code>.</li>
          <li>A <code>ToggleProvider</code> that takes an <code>initialOn</code> prop and
          creates the store once.</li>
          <li>A <code>useToggle(selector)</code> hook that throws
          <code>'Missing ToggleContext.Provider'</code> if there is no provider.</li>
        </ul>
        <p>Render three switches (off, on, off) that toggle independently.</p>
      `,
      starter: `import { createContext, useContext, useState } from 'react';
import { createStore, useStore } from 'zustand';

// TODO: createToggleStore(initialOn)

const ToggleContext = createContext(null);

// TODO: ToggleProvider({ initialOn, children })

// TODO: useToggle(selector)

function Switch({ name }) {
  // TODO: read on + toggle with useToggle
  const on = false;
  const toggle = () => {};
  return (
    <button onClick={toggle} style={{ marginRight: 6 }}>
      {name}: {on ? 'ON' : 'off'}
    </button>
  );
}

export default function App() {
  // TODO: wrap each Switch in its own ToggleProvider
  return (
    <div>
      <Switch name="Wi-Fi" />
      <Switch name="Bluetooth" />
      <Switch name="Airplane" />
    </div>
  );
}`,
      hint: 'const [store] = useState(() => createToggleStore(initialOn)); return <ToggleContext.Provider value={store}>{children}</ToggleContext.Provider>. In useToggle: useContext, throw if null, return useStore(store, selector).',
      solution: `import { createContext, useContext, useState } from 'react';
import { createStore, useStore } from 'zustand';

const createToggleStore = (initialOn = false) =>
  createStore((set) => ({
    on: initialOn,
    toggle: () => set((s) => ({ on: !s.on })),
  }));

const ToggleContext = createContext(null);

function ToggleProvider({ initialOn, children }) {
  const [store] = useState(() => createToggleStore(initialOn));
  return <ToggleContext.Provider value={store}>{children}</ToggleContext.Provider>;
}

function useToggle(selector) {
  const store = useContext(ToggleContext);
  if (!store) throw new Error('Missing ToggleContext.Provider');
  return useStore(store, selector);
}

function Switch({ name }) {
  const on = useToggle((s) => s.on);
  const toggle = useToggle((s) => s.toggle);
  return (
    <button onClick={toggle} style={{ marginRight: 6 }}>
      {name}: {on ? 'ON' : 'off'}
    </button>
  );
}

export default function App() {
  return (
    <div>
      <ToggleProvider initialOn={false}>
        <Switch name="Wi-Fi" />
      </ToggleProvider>
      <ToggleProvider initialOn={true}>
        <Switch name="Bluetooth" />
      </ToggleProvider>
      <ToggleProvider initialOn={false}>
        <Switch name="Airplane" />
      </ToggleProvider>
    </div>
  );
}`,
    },
  },
);
