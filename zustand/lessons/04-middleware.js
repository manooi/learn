window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── middleware-intro
  {
    id: 'middleware-intro',
    section: 'Middleware',
    title: 'What is middleware?',
    explain: `
      <p>You already know the <strong>state creator</strong>: the function you hand to
      <code>create</code>. Zustand calls it once with <code>(set, get, api)</code> and uses the
      object it returns as the initial state.</p>
      <pre><code>const useStore = create((set, get, api) =&gt; ({ bears: 0 }));
//                      └──────── state creator ────────┘</code></pre>
      <p>A <strong>middleware</strong> is just a function that takes a state creator and returns
      a <em>new</em> state creator. The new one usually calls the original, but first it can
      swap in a different <code>set</code>, a different <code>get</code>, or add things to
      <code>api</code>.</p>
      <pre><code>const logger = (config) =&gt; (set, get, api) =&gt;
  config(
    (...args) =&gt; {                  // a wrapped set
      console.log('before', get());
      set(...args);                    // call the real set
      console.log('after', get());
    },
    get,
    api,
  );

const useStore = create(logger((set) =&gt; ({ ... })));</code></pre>
      <p>Think of it like a <strong>gift wrap</strong>: the present (your state creator) is still
      inside, unchanged. The wrapping adds something on the outside, and you can wrap many
      times. Zustand's built-in middlewares (<code>persist</code>, <code>devtools</code>,
      <code>immer</code>, <code>subscribeWithSelector</code>, <code>combine</code>) all follow
      exactly this shape.</p>
      <h3>What a middleware can do</h3>
      <ul>
        <li><strong>Wrap <code>set</code></strong>: log, validate, save to storage, send to devtools.</li>
        <li><strong>Change what <code>set</code> accepts</strong>: <code>immer</code> lets you
          pass a function that mutates a draft.</li>
        <li><strong>Add to <code>api</code></strong>: <code>persist</code> adds
          <code>useStore.persist.*</code>. <code>subscribeWithSelector</code> replaces
          <code>api.subscribe</code>.</li>
        <li><strong>Change the initial state</strong>: <code>persist</code> merges in saved data.</li>
      </ul>
      <div class="warn">The <code>set</code> passed to your creator and
      <code>useStore.setState</code> are <strong>two different doors</strong>. If your middleware
      only wraps the <code>set</code> argument, calls to <code>useStore.setState(...)</code> from
      outside skip it. To cover both, also replace <code>api.setState</code> (the built-in
      <code>persist</code> and <code>immer</code> do this).</div>
      <div class="tip">Always forward <strong>all</strong> arguments with
      <code>(...args) =&gt; set(...args)</code>. <code>set</code> takes more than the new state:
      the 2nd argument is <code>replace</code>, and <code>devtools</code> reads a 3rd one (the
      action name). Dropping them breaks the middlewares around yours.</div>
    `,
    examples: [
      {
        title: 'A tiny logger middleware',
        code: `import { create } from 'zustand';

// ① takes a state creator (config) ...
const logger = (config, label) => (set, get, api) => {
  // ② ... and builds a wrapped set
  const loggedSet = (...args) => {
    const before = get();
    set(...args); // ③ the real set
    console.log(label + ':', JSON.stringify(before), '→', JSON.stringify(get()));
  };
  // ④ calls the original creator with the wrapped set
  return config(loggedSet, get, api);
};

const useBearStore = create(
  logger(
    (set) => ({
      bears: 0,
      fish: 10,
      addBear: () => set((s) => ({ bears: s.bears + 1 })),
      eatFish: () => set((s) => ({ fish: s.fish - 1 })),
    }),
    'bears',
  ),
);

export default function App() {
  const bears = useBearStore((s) => s.bears);
  const fish = useBearStore((s) => s.fish);
  const addBear = useBearStore((s) => s.addBear);
  const eatFish = useBearStore((s) => s.eatFish);

  function resetFromOutside() {
    console.log('outside setState →');
    useBearStore.setState({ bears: 0, fish: 10 });
  }

  return (
    <div>
      <p>🐻 bears: {bears} &nbsp; 🐟 fish: {fish}</p>
      <button onClick={addBear}>Add bear</button>
      <button onClick={eatFish}>Eat fish</button>
      <button onClick={resetFromOutside}>Reset via setState</button>
      <p style={{ color: 'gray' }}>Watch the console. Which button is NOT logged?</p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: you want to see every state change</summary>
            <p>Without middleware you would add a <code>console.log</code> inside every action.
            With 20 actions that is 20 copies, and you'd forget one. A middleware wraps
            <code>set</code> <strong>once</strong>, so every action that calls <code>set</code>
            gets logged automatically.</p>
            <p>(<code>JSON.stringify</code> skips functions, so the log shows only the data:
            <code>bears</code> and <code>fish</code>.)</p>
          </details>
          <details>
            <summary>Step by step: what happens on load and on each click</summary>
            <table>
              <tr><th>Step</th><th>What runs</th><th>Console</th></tr>
              <tr><td>Load</td><td><code>logger(config, 'bears')</code> returns a new
                creator. <code>create</code> calls it with the real <code>(set, get, api)</code>.
                It builds <code>loggedSet</code> and calls <code>config(loggedSet, ...)</code>, so
                the actions close over <code>loggedSet</code>.</td><td>(nothing)</td></tr>
              <tr><td>Click <em>Add bear</em></td><td><code>addBear</code> →
                <code>loggedSet(fn)</code> → saves <code>before</code> → real <code>set</code> →
                logs</td><td><code>bears: {"bears":0,"fish":10} → {"bears":1,"fish":10}</code></td></tr>
              <tr><td>Click <em>Eat fish</em></td><td>same path</td>
                <td><code>bears: {"bears":1,"fish":10} → {"bears":1,"fish":9}</code></td></tr>
              <tr><td>Click <em>Reset via setState</em></td><td><code>useBearStore.setState</code>
                is <code>api.setState</code>, the <em>real</em> set. It never goes through
                <code>loggedSet</code>.</td><td><code>outside setState →</code> (and no logger line!)</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const logger = (config, label) =&gt; (set, get, api) =&gt; { // ①
  const loggedSet = (...args) =&gt; {                      // ②
    const before = get();
    set(...args);                                       // ③
    console.log(label + ':', ...);
  };
  return config(loggedSet, get, api);                   // ④
};</code></pre>
            <ol>
              <li><strong>①</strong> Two arrows: the outer one receives your creator (plus any
                options, here <code>label</code>); the inner one <em>is</em> the new creator that
                Zustand will call.</li>
              <li><strong>②</strong> <code>...args</code> collects every argument
                (<code>partial</code>, <code>replace</code>, maybe an action name) so nothing
                gets lost.</li>
              <li><strong>③</strong> The real <code>set</code> updates the state synchronously,
                so <code>get()</code> right after it already returns the new state.</li>
              <li><strong>④</strong> The original creator runs with our wrapped set. Its return
                value (the initial state) is passed straight back to Zustand.</li>
            </ol>
          </details>
          <details>
            <summary>Try this: make the logger catch outside calls too</summary>
            <p>Add <code>api.setState = loggedSet;</code> just before the <code>return</code>
            line. Run again and click <em>Reset via setState</em>: now it is logged too. No
            infinite loop: <code>loggedSet</code> calls the captured <code>set</code>, not
            <code>api.setState</code>.</p>
            <div class="tip">This is exactly why <code>persist</code> saves even when you call
            <code>useStore.setState(...)</code>: it replaces <code>api.setState</code>.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What is a Zustand middleware, in one sentence?',
        options: [
          'A React component that wraps the store provider',
          'A function that takes a state creator and returns a new state creator',
          'A hook that runs after every render',
          'A special kind of selector',
        ],
        answer: 1,
        why: 'Shape: <code>(config) =&gt; (set, get, api) =&gt; config(newSet, get, api)</code>. It wraps the creator before <code>create</code> calls it.',
      },
      {
        q: 'Your middleware wraps only the <code>set</code> argument. Which call is NOT seen by it?',
        options: [
          'An action calling <code>set(...)</code>',
          'An action calling <code>get().otherAction()</code>, which calls <code>set</code>',
          '<code>useStore.setState({ x: 1 })</code> from a component',
          'All of them are seen',
        ],
        answer: 2,
        why: '<code>useStore.setState</code> is <code>api.setState</code>. Unless the middleware also replaces <code>api.setState</code>, it skips the wrapper.',
      },
      {
        q: 'Why write <code>(...args) =&gt; set(...args)</code> instead of <code>(partial) =&gt; set(partial)</code>?',
        options: [
          'It is faster',
          'So <code>replace</code> and the devtools action name are passed through too',
          'Because <code>set</code> only works with spread arguments',
          'It makes the state immutable',
        ],
        answer: 1,
        why: '<code>set(partial, replace, actionName)</code>. Dropping the extra arguments silently breaks <code>replace</code> and devtools action names.',
      },
      {
        q: 'Inside the wrapped set, right after calling the real <code>set(...)</code>, what does <code>get()</code> return?',
        options: [
          'The old state; updates are batched until the next render',
          'The new state; <code>set</code> updates synchronously',
          '<code>undefined</code>',
          'A promise of the new state',
        ],
        answer: 1,
        why: 'Zustand\'s <code>set</code> is synchronous. React re-renders later, but the store itself already holds the new state.',
      },
    ],
    exercise: {
      task: `
        <p>Write a <code>noNegative</code> middleware. It wraps <code>set</code> so that any
        update that would make <code>fish</code> go below 0 is <strong>blocked</strong> and
        logs <code>blocked: fish would be -1</code>. Other updates go through normally.</p>
        <p>Hint for the shape: work out the next partial yourself (<code>set</code> can get a
        function or an object), check it, then call the real <code>set</code>.</p>
      `,
      starter: `import { create } from 'zustand';

// TODO: (config) => (set, get, api) => config(guardedSet, get, api)
const noNegative = (config) => config;

const useFishStore = create(
  noNegative((set) => ({
    fish: 2,
    eat: () => set((s) => ({ fish: s.fish - 1 })),
    refill: () => set({ fish: 2 }),
  })),
);

export default function App() {
  const fish = useFishStore((s) => s.fish);
  const eat = useFishStore((s) => s.eat);
  const refill = useFishStore((s) => s.refill);
  return (
    <div>
      <p>🐟 fish: {fish}</p>
      <button onClick={eat}>Eat</button>
      <button onClick={refill}>Refill</button>
    </div>
  );
}`,
      hint: 'const next = typeof partial === "function" ? partial(get()) : partial; if (next.fish < 0) { console.log(...); return; } set(next, ...rest);',
      solution: `import { create } from 'zustand';

const noNegative = (config) => (set, get, api) => {
  const guardedSet = (partial, ...rest) => {
    const next = typeof partial === 'function' ? partial(get()) : partial;
    if (next.fish < 0) {
      console.log('blocked: fish would be', next.fish);
      return;
    }
    set(next, ...rest);
  };
  return config(guardedSet, get, api);
};

const useFishStore = create(
  noNegative((set) => ({
    fish: 2,
    eat: () => set((s) => ({ fish: s.fish - 1 })),
    refill: () => set({ fish: 2 }),
  })),
);

export default function App() {
  const fish = useFishStore((s) => s.fish);
  const eat = useFishStore((s) => s.eat);
  const refill = useFishStore((s) => s.refill);
  return (
    <div>
      <p>🐟 fish: {fish}</p>
      <button onClick={eat}>Eat</button>
      <button onClick={refill}>Refill</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── persist
  {
    id: 'persist',
    section: 'Middleware',
    title: 'persist: save state across reloads',
    explain: `
      <p><code>persist</code> saves your store to storage (by default
      <code>localStorage</code>) every time the state changes, and loads it back when the
      store is created. Reload the page and the cart, theme or draft is still there.</p>
      <pre><code>import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useCounter = create(
  persist(
    (set) =&gt; ({
      count: 0,
      inc: () =&gt; set((s) =&gt; ({ count: s.count + 1 })),
    }),
    {
      name: 'counter',                                    // required: storage key
      storage: createJSONStorage(() =&gt; localStorage),    // optional: this is the default
    },
  ),
);</code></pre>
      <h3>What gets saved</h3>
      <p>Under the key <code>name</code>, as JSON:
      <code>{"state":{"count":2},"version":0}</code>. Functions (your actions) are dropped by
      <code>JSON.stringify</code>. That's fine: on load, saved data is
      <strong>shallow-merged</strong> over the fresh initial state, so the actions come from
      your code as usual.</p>
      <h3>When it saves, when it loads</h3>
      <ul>
        <li><strong>Save</strong>: after every <code>set</code> (also after
          <code>useStore.setState</code>).</li>
        <li><strong>v5 change</strong>: persist does <strong>not</strong> write the initial
          state when the store is created (removed in v5, and v4.5.5). Storage stays empty until
          the first <code>set</code>.</li>
        <li><strong>Load (hydration)</strong>: when the store is created. With a synchronous
          storage like <code>localStorage</code>, hydration finishes <em>during</em>
          <code>create</code>, so the very first render already shows the saved values. With an
          async storage (IndexedDB, React Native AsyncStorage) the first render shows the initial
          state and the saved state arrives a moment later.</li>
      </ul>
      <h3>Clearing</h3>
      <p><code>useStore.persist.clearStorage()</code> removes the saved item. It does
      <strong>not</strong> reset the state in memory. The next <code>set</code> writes it
      again.</p>
      <div class="tip"><strong>In this playground</strong>, storage survives ▶ Run. Clicking
      ▶ Run re-creates the store from scratch, just like reloading the page. That's how you'll
      watch rehydration happen. (Reloading the whole browser tab clears it.)</div>
      <div class="warn">Every persisted store needs its <strong>own unique</strong>
      <code>name</code>. Two stores with the same name overwrite each other's data.</div>
    `,
    examples: [
      {
        title: 'Persisted counter: change, ▶ Run, rehydrate',
        code: `import { useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const KEY = 'lesson-persist-counter';

console.log('module start, storage has:', localStorage.getItem(KEY));

const useCounter = create(
  persist(
    (set) => ({
      count: 0,
      inc: () => set((s) => ({ count: s.count + 1 })),
    }),
    { name: KEY }, // default storage: localStorage
  ),
);

console.log('store created, count =', useCounter.getState().count);

export default function App() {
  const count = useCounter((s) => s.count);
  const inc = useCounter((s) => s.inc);
  const [, rerender] = useState(0);
  const raw = localStorage.getItem(KEY);

  function clear() {
    useCounter.persist.clearStorage();
    const now = useCounter.getState().count;
    console.log('storage cleared (count in memory is still ' + now + ')');
    rerender((n) => n + 1); // re-read storage for the display
  }

  return (
    <div>
      <p style={{ fontSize: 22 }}>count: {count}</p>
      <button onClick={inc}>+1</button>
      <button onClick={clear}>Clear storage</button>
      <p>
        <small>localStorage["{KEY}"]:</small>
        <br />
        <code>{raw ?? 'null'}</code>
      </p>
      <p style={{ color: 'gray' }}>Click +1 a few times, then ▶ Run (= reload).</p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: a reload wipes the store</summary>
            <p>A Zustand store is just a JavaScript variable. Reload the page and it is created
            again from the initial state: <code>count: 0</code>. Users lose their cart, their
            dark-mode choice, their half-written message.</p>
            <p><code>persist</code> fixes this with two jobs: <strong>save</strong> after every
            change, and <strong>load</strong> (hydrate) when the store is created.</p>
          </details>
          <details>
            <summary>Step by step: first run → change → ▶ Run → rehydrate → clear</summary>
            <p>Assuming storage starts empty (open the page fresh):</p>
            <table>
              <tr><th>Step</th><th>localStorage[KEY]</th><th>Screen</th><th>Console</th></tr>
              <tr><td>1. First run</td><td><code>null</code> (v5 does not save initial state)</td>
                <td>count: 0</td><td><code>module start, storage has: null</code><br>
                <code>store created, count = 0</code></td></tr>
              <tr><td>2. Click +1 twice</td><td><code>{"state":{"count":2},"version":0}</code></td>
                <td>count: 2</td><td>(nothing)</td></tr>
              <tr><td>3. Click ▶ Run ("reload")</td><td>same</td><td>count: 2 on the very
                first render</td><td><code>module start, storage has:
                {"state":{"count":2},"version":0}</code><br><code>store created, count =
                2</code></td></tr>
              <tr><td>4. Click <em>Clear storage</em></td><td><code>null</code></td>
                <td>count: 2 (memory untouched)</td>
                <td><code>storage cleared (count in memory is still 2)</code></td></tr>
              <tr><td>5. Click ▶ Run</td><td><code>null</code></td><td>count: 0</td>
                <td><code>module start, storage has: null</code><br>
                <code>store created, count = 0</code></td></tr>
            </table>
            <p>Step 3 is the key: the line right after <code>create(...)</code> already logs
            <code>2</code>. With <code>localStorage</code>, hydration is
            <strong>synchronous</strong>, so it is done before <code>create</code> returns.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>persist(creator, { name: KEY })          // ①
useCounter.persist.clearStorage();        // ②
localStorage.getItem(KEY)                 // ③</code></pre>
            <ol>
              <li><strong>①</strong> Wrap the creator; <code>name</code> is the only required
                option. Storage defaults to <code>createJSONStorage(() =&gt; localStorage)</code>.</li>
              <li><strong>②</strong> <code>persist</code> adds a <code>persist</code> object to
                the store API with helpers: <code>clearStorage</code>, <code>rehydrate</code>,
                <code>hasHydrated</code>, <code>onFinishHydration</code>, ...</li>
              <li><strong>③</strong> Reading the raw string shows the saved format:
                <code>{ state, version }</code>. The <code>inc</code> function is not in it.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>After step 4 (cleared, count still 2), click +1 instead of ▶ Run. Storage comes
                back with <code>3</code>: clearing does not stop future saves.</li>
              <li>Change <code>count: 0</code> to <code>count: 100</code> and ▶ Run while storage
                holds <code>2</code>. You still see 2: saved data wins over the initial state.</li>
            </ul>
            <div class="warn">"I changed the initial state in code but the app ignores it!"
            That's persist doing its job: the old saved value is merged on top. Clear the
            storage, or use <code>version</code> + <code>migrate</code> (next lesson).</div>
          </details>
        `,
      },
      {
        title: 'Persisted todo list',
        code: `import { useState } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTodos = create(
  persist(
    (set) => ({
      todos: [],
      add: (text) =>
        set((s) => ({ todos: [...s.todos, { id: Date.now(), text }] })),
      remove: (id) =>
        set((s) => ({ todos: s.todos.filter((t) => t.id !== id) })),
    }),
    { name: 'lesson-persist-todos' },
  ),
);

export default function App() {
  const todos = useTodos((s) => s.todos);
  const add = useTodos((s) => s.add);
  const remove = useTodos((s) => s.remove);
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    add(text.trim());
    setText('');
  }

  return (
    <div>
      <form onSubmit={submit}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="New todo"
        />
        <button>Add</button>
      </form>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.text} <button onClick={() => remove(t.id)}>✕</button>
          </li>
        ))}
      </ul>
      <p style={{ color: 'gray' }}>
        Add a few todos, then ▶ Run. The list survives; the input text doesn't
        (it's React state, not in the store).
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Which storage does <code>persist</code> use if you only pass <code>{ name }</code>?',
        options: ['sessionStorage', 'localStorage (via createJSONStorage)', 'IndexedDB', 'Cookies'],
        answer: 1,
        why: 'The default is <code>createJSONStorage(() =&gt; localStorage)</code>.',
      },
      {
        q: 'In Zustand v5, you create a persisted store and never call <code>set</code>. What is in storage?',
        options: [
          'The initial state',
          'Nothing; v5 only writes after a state change',
          'An empty object <code>{}</code>',
          'Only the version number',
        ],
        answer: 1,
        why: 'v5 (and v4.5.5) removed writing the initial state at store creation. The first <code>set</code> writes the item.',
      },
      {
        q: 'What does <code>useStore.persist.clearStorage()</code> do to the state in memory?',
        options: [
          'Resets it to the initial state',
          'Nothing; it only removes the stored item',
          'Sets it to <code>undefined</code>',
          'Reloads it from storage',
        ],
        answer: 1,
        why: 'It only calls <code>storage.removeItem(name)</code>. Reset the state yourself if you need that.',
      },
      {
        q: 'With <code>localStorage</code>, does the first React render see the saved value?',
        options: [
          'No, it always shows the initial state first',
          'Yes, sync storage hydrates during <code>create</code>',
          'Only in StrictMode',
          'Only if you call <code>rehydrate()</code>',
        ],
        answer: 1,
        why: 'Sync storage → sync hydration: the store is already hydrated when <code>create</code> returns. Async storage hydrates later, so the first render shows the initial state.',
      },
      {
        q: 'Your state has actions (functions). How do they survive a reload?',
        options: [
          'persist serializes functions as strings',
          'They don\'t; you must re-add them manually',
          'They are not stored; saved data is merged over the fresh state, which has the actions',
          'persist throws an error on functions',
        ],
        answer: 2,
        why: 'JSON drops functions. The default merge is <code>{ ...currentState, ...persistedState }</code>, so actions come from your creator.',
      },
    ],
    exercise: {
      task: `
        <p>Make the theme choice survive a reload. Wrap the store with <code>persist</code>
        using the name <code>'exercise-persist-theme'</code>. Toggle to dark, click ▶ Run, and
        the page should still be dark.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import persist

const useTheme = create((set) => ({
  theme: 'light',
  toggle: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));

export default function App() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const dark = theme === 'dark';
  return (
    <div style={{ padding: 16, borderRadius: 8,
      background: dark ? '#222' : '#f4f4f4', color: dark ? '#eee' : '#222' }}>
      <p>Theme: {theme}</p>
      <button onClick={toggle}>Toggle theme</button>
    </div>
  );
}`,
      hint: "create(persist((set) => ({ ... }), { name: 'exercise-persist-theme' }))",
      solution: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useTheme = create(
  persist(
    (set) => ({
      theme: 'light',
      toggle: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    }),
    { name: 'exercise-persist-theme' },
  ),
);

export default function App() {
  const theme = useTheme((s) => s.theme);
  const toggle = useTheme((s) => s.toggle);
  const dark = theme === 'dark';
  return (
    <div style={{ padding: 16, borderRadius: 8,
      background: dark ? '#222' : '#f4f4f4', color: dark ? '#eee' : '#222' }}>
      <p>Theme: {theme}</p>
      <button onClick={toggle}>Toggle theme</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── persist-options
  {
    id: 'persist-options',
    section: 'Middleware',
    title: 'persist options: partialize, migrate, hydration',
    explain: `
      <p><code>persist(creator, options)</code> has a handful of options you'll reach for in
      real apps.</p>
      <h3><code>partialize</code>: save only some keys</h3>
      <pre><code>partialize: (state) =&gt; ({ draft: state.draft }),   // don't save isOpen, tokens...</code></pre>
      <h3><code>storage</code>: where to save</h3>
      <pre><code>storage: createJSONStorage(() =&gt; sessionStorage),  // gone when the tab closes</code></pre>
      <h3><code>version</code> + <code>migrate</code>: change the shape safely</h3>
      <p>Every save stores <code>version</code> (default <code>0</code>). If the stored version
      differs from the current one, persist calls <code>migrate(persistedState, oldVersion)</code>
      and uses what it returns. Then it saves the migrated state with the new version.</p>
      <pre><code>version: 1,
migrate: (persisted, version) =&gt; {
  if (version === 0) {
    // v0 stored { name: 'Ada Lovelace' }, v1 wants { firstName, lastName }
    const [firstName, lastName] = persisted.name.split(' ');
    return { firstName, lastName };
  }
  return persisted;
},</code></pre>
      <div class="warn">If versions differ and there's no <code>migrate</code>, persist logs
      <code>console.error("State loaded from storage couldn't be migrated since no migrate
      function was provided")</code> and ignores the saved data.</div>
      <h3>Hydration hooks</h3>
      <ul>
        <li><code>onRehydrateStorage: (state) =&gt; (state, error) =&gt; {...}</code>. The outer
          function runs when hydration <em>starts</em>; the returned one runs when it
          <em>finishes</em> (or fails, with <code>error</code>).</li>
        <li><code>useStore.persist.hasHydrated()</code>: <code>true</code> once done.</li>
        <li><code>useStore.persist.onFinishHydration(cb)</code>: subscribe to "done";
          returns an unsubscribe function. (<code>onHydrate(cb)</code> for "started".)</li>
        <li><code>skipHydration: true</code> + <code>useStore.persist.rehydrate()</code>: don't
          load on creation; load when <em>you</em> say so (common with SSR, e.g. in a
          <code>useEffect</code>).</li>
        <li><code>merge: (persisted, current) =&gt; ...</code>: default is a shallow
          <code>{ ...current, ...persisted }</code>. Write your own for deep merging.</li>
      </ul>
      <h3>Map, Set, Date</h3>
      <p>Storage holds JSON, and JSON has no Map, Set or Date: a Map becomes <code>{}</code>
      and a Date turns into a string. Use <code>createJSONStorage</code>'s
      <code>replacer</code> / <code>reviver</code> (passed to <code>JSON.stringify</code> /
      <code>JSON.parse</code>), or write a custom storage.</p>
      <pre><code>storage: createJSONStorage(() =&gt; localStorage, {
  replacer: (key, value) =&gt;
    value instanceof Map ? { __map: [...value] } : value,
  reviver: (key, value) =&gt;
    value &amp;&amp; value.__map ? new Map(value.__map) : value,
}),</code></pre>
      <div class="tip">Rule of thumb: keep persisted state small and plain (strings, numbers,
      arrays, plain objects). Use <code>partialize</code> to keep out anything derived,
      temporary or secret.</div>
    `,
    examples: [
      {
        title: 'partialize + sessionStorage',
        code: `import { useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const KEY = 'lesson-persist-partialize';

const useComposer = create(
  persist(
    (set) => ({
      draft: '',
      panelOpen: false,
      setDraft: (draft) => set({ draft }),
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
    }),
    {
      name: KEY,
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ draft: state.draft }), // only the draft
    },
  ),
);

export default function App() {
  const { draft, panelOpen, setDraft, togglePanel } = useComposer();
  return (
    <div>
      <textarea
        rows={2}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type, toggle the panel, then ▶ Run"
      />
      <br />
      <button onClick={togglePanel}>{panelOpen ? 'Close' : 'Open'} panel</button>
      {panelOpen && <div style={{ padding: 8, background: '#eef' }}>Panel content</div>}
      <p>
        <small>sessionStorage["{KEY}"]:</small>
        <br />
        <code>{sessionStorage.getItem(KEY) ?? 'null'}</code>
      </p>
    </div>
  );
}`,
      },
      {
        title: 'version + migrate + onRehydrateStorage',
        code: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const KEY = 'lesson-persist-migrate';
const OLD_V0 = JSON.stringify({ state: { name: 'Ada Lovelace' }, version: 0 });

// Pretend a user saved data with last month's app (version 0).
if (!localStorage.getItem(KEY)) {
  localStorage.setItem(KEY, OLD_V0);
  console.log('seeded old v0 data:', OLD_V0);
}

const useProfile = create(
  persist(
    (set) => ({
      firstName: '',
      lastName: '',
      rename: (firstName, lastName) => set({ firstName, lastName }),
    }),
    {
      name: KEY,
      version: 1, // ① current shape
      migrate: (persisted, version) => {
        // ② only runs when stored version !== 1
        console.log('migrate from version', version, persisted);
        if (version === 0) {
          const [firstName, lastName] = persisted.name.split(' ');
          return { firstName, lastName };
        }
        return persisted;
      },
      onRehydrateStorage: () => {
        console.log('hydration starts'); // ③
        return (state, error) => {
          if (error) console.log('hydration failed', error);
          else console.log('hydration finished:', state.firstName, '/', state.lastName);
        };
      },
    },
  ),
);

console.log('storage now:', localStorage.getItem(KEY));

export default function App() {
  const { firstName, lastName, rename } = useProfile();

  function simulateOldUser() {
    localStorage.setItem(KEY, OLD_V0);
    console.log('wrote v0 data again, now click ▶ Run');
  }

  return (
    <div>
      <p>
        First: <b>{firstName}</b> &nbsp; Last: <b>{lastName}</b>
      </p>
      <p>hasHydrated(): {String(useProfile.persist.hasHydrated())}</p>
      <button onClick={() => rename('Grace', 'Hopper')}>Rename to Grace Hopper</button>
      <button onClick={simulateOldUser}>Simulate a v0 user</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: you changed the state's shape, but users have old data</summary>
            <p>Version 0 of your app saved <code>{ name: 'Ada Lovelace' }</code>. Version 1
            splits it into <code>firstName</code> and <code>lastName</code>. Without a
            migration, the old <code>name</code> key is merged into the state, while
            <code>firstName</code>/<code>lastName</code> stay empty. The user's profile looks
            wiped.</p>
            <p><code>version</code> + <code>migrate</code> let you convert old saved data into
            the new shape <strong>once</strong>, while it's being loaded.</p>
          </details>
          <details>
            <summary>Step by step: first run → ▶ Run → simulate old user → ▶ Run</summary>
            <p>Assuming storage for this key starts empty:</p>
            <table>
              <tr><th>Step</th><th>Stored item</th><th>Console</th></tr>
              <tr><td>1. First run: seed</td><td><code>{"state":{"name":"Ada Lovelace"},"version":0}</code></td>
                <td><code>seeded old v0 data: {"state":{"name":"Ada Lovelace"},"version":0}</code></td></tr>
              <tr><td>1b. create → hydrate</td><td>stored version 0 ≠ 1 → <code>migrate</code> runs</td>
                <td><code>hydration starts</code><br>
                <code>migrate from version 0 {"name":"Ada Lovelace"}</code><br>
                <code>hydration finished: Ada / Lovelace</code></td></tr>
              <tr><td>1c. after create</td><td>migrated state saved with version 1</td>
                <td><code>storage now: {"state":{"firstName":"Ada","lastName":"Lovelace"},"version":1}</code></td></tr>
              <tr><td>2. ▶ Run again</td><td>version 1 = 1 → no migrate</td>
                <td><code>hydration starts</code><br><code>hydration finished: Ada / Lovelace</code><br>
                <code>storage now: {"state":{"firstName":"Ada",...},"version":1}</code></td></tr>
              <tr><td>3. Click <em>Simulate a v0 user</em></td><td>v0 data again</td>
                <td><code>wrote v0 data again, now click ▶ Run</code></td></tr>
              <tr><td>4. ▶ Run</td><td>not empty → no seed; version 0 → migrate</td>
                <td>same three lines as 1b, then <code>storage now: ...version":1}</code></td></tr>
            </table>
            <p>The screen shows <code>First: Ada  Last: Lovelace</code> and
            <code>hasHydrated(): true</code> on the first render every time.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>version: 1,                                    // ①
migrate: (persisted, version) =&gt; { ... },     // ②
onRehydrateStorage: () =&gt; {                    // ③
  console.log('hydration starts');
  return (state, error) =&gt; { ... };            // ③ finished
},</code></pre>
            <ol>
              <li><strong>①</strong> The version of the <em>current</em> code. Bump it
                every time you change the persisted shape in a breaking way.</li>
              <li><strong>②</strong> Receives the <em>stored</em> state and the
                <em>stored</em> version. Return the state in the current shape. Handle each old
                version (<code>if (version &lt; 1) ...; if (version &lt; 2) ...</code>) so users
                who skipped releases still upgrade. It may also return a Promise.</li>
              <li><strong>③</strong> Outer function: hydration starts. Inner function: hydration
                done, with the final merged <code>state</code>, or an <code>error</code>. It runs
                during <code>create</code> here (sync storage), so use the <code>state</code>
                argument, not <code>useProfile.getState()</code>: <code>useProfile</code> isn't
                assigned yet at that moment.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Delete the <code>migrate</code> option and do step 3 + ▶ Run: you'll get a red
                <code>console.error</code> ("couldn't be migrated since no migrate function was
                provided") and empty names.</li>
              <li>Click <em>Rename to Grace Hopper</em>, then ▶ Run: no migrate, Grace survives.</li>
            </ul>
            <div class="warn">Don't forget to bump <code>version</code>. If you change the
            shape but keep the same version, <code>migrate</code> never runs and old data is
            merged in as-is.</div>
          </details>
        `,
      },
      {
        title: 'skipHydration + rehydrate() + onFinishHydration',
        code: `import { useState, useEffect } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useNotes = create(
  persist(
    (set) => ({
      notes: 0,
      addNote: () => set((s) => ({ notes: s.notes + 1 })),
    }),
    { name: 'lesson-persist-skip', skipHydration: true }, // don't load yet
  ),
);

function useHydrated() {
  const [done, setDone] = useState(useNotes.persist.hasHydrated());
  useEffect(() => {
    const unsub = useNotes.persist.onFinishHydration((state) => {
      console.log('finished hydrating, notes =', state.notes);
      setDone(true);
    });
    return unsub;
  }, []);
  return done;
}

export default function App() {
  const hydrated = useHydrated();
  const notes = useNotes((s) => s.notes);
  const addNote = useNotes((s) => s.addNote);

  useEffect(() => {
    console.log('mounted, hasHydrated =', useNotes.persist.hasHydrated());
    const t = setTimeout(() => useNotes.persist.rehydrate(), 800); // load "later"
    return () => clearTimeout(t);
  }, []);

  if (!hydrated) return <p>Loading saved notes…</p>;
  return (
    <div>
      <p>📝 notes: {notes}</p>
      <button onClick={addNote}>Add note</button>
      <p style={{ color: 'gray' }}>Add some, then ▶ Run.</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'You want to persist <code>cart</code> but not <code>isCartOpen</code>. Which option?',
        options: ['merge', 'partialize', 'migrate', 'skipHydration'],
        answer: 1,
        why: '<code>partialize: (s) =&gt; ({ cart: s.cart })</code> picks what gets saved.',
      },
      {
        q: 'Stored version is 0, your code says <code>version: 2</code>. What does <code>migrate</code> receive?',
        options: [
          '<code>(currentState, 2)</code>',
          '<code>(persistedState, 0)</code>',
          '<code>(persistedState, 2)</code>',
          'It is called twice: once for 1, once for 2',
        ],
        answer: 1,
        why: 'It gets the stored state and the stored version, once. You handle each step inside.',
      },
      {
        q: 'How do you persist to <code>sessionStorage</code>?',
        options: [
          "<code>storage: 'session'</code>",
          '<code>getStorage: () =&gt; sessionStorage</code>',
          '<code>storage: createJSONStorage(() =&gt; sessionStorage)</code>',
          '<code>storage: sessionStorage</code>',
        ],
        answer: 2,
        why: '<code>getStorage</code> was removed in v5. <code>storage</code> expects a PersistStorage, which <code>createJSONStorage</code> builds from a Web Storage.',
      },
      {
        q: 'With <code>skipHydration: true</code>, when is saved data loaded?',
        options: [
          'Never',
          'On the first render',
          'When you call <code>useStore.persist.rehydrate()</code>',
          'After the first <code>set</code>',
        ],
        answer: 2,
        why: 'Skipping hydration means you trigger it yourself, e.g. in a <code>useEffect</code> after mount.',
      },
      {
        q: 'Your state holds a <code>Map</code>. After reload with the default storage it is...',
        options: [
          'The same Map',
          'A plain empty object <code>{}</code>',
          'An array of entries',
          'An error is thrown',
        ],
        answer: 1,
        why: '<code>JSON.stringify(new Map([[1, 2]]))</code> is <code>"{}"</code>. Use <code>replacer</code>/<code>reviver</code> or a custom storage.',
      },
    ],
    exercise: {
      task: `
        <p>Persist the settings to <strong>sessionStorage</strong> under
        <code>'exercise-persist-settings'</code>, saving only <code>volume</code> and
        <code>muted</code> (not <code>panelOpen</code>). Change things, ▶ Run, and check that
        volume and muted survive but the panel is closed again.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import persist, createJSONStorage

const useSettings = create((set) => ({
  volume: 50,
  muted: false,
  panelOpen: false,
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
  togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
}));

export default function App() {
  const s = useSettings();
  return (
    <div>
      <button onClick={s.togglePanel}>{s.panelOpen ? 'Hide' : 'Show'} settings</button>
      {s.panelOpen && (
        <div style={{ padding: 8, background: '#f4f4f4' }}>
          <input type="range" min="0" max="100" value={s.volume}
            onChange={(e) => s.setVolume(Number(e.target.value))} />
          <label>
            <input type="checkbox" checked={s.muted} onChange={s.toggleMute} /> muted
          </label>
        </div>
      )}
      <p>volume {s.volume}, {s.muted ? 'muted' : 'sound on'}</p>
    </div>
  );
}`,
      hint: "persist(creator, { name, storage: createJSONStorage(() => sessionStorage), partialize: (s) => ({ volume: s.volume, muted: s.muted }) })",
      solution: `import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useSettings = create(
  persist(
    (set) => ({
      volume: 50,
      muted: false,
      panelOpen: false,
      setVolume: (volume) => set({ volume }),
      toggleMute: () => set((s) => ({ muted: !s.muted })),
      togglePanel: () => set((s) => ({ panelOpen: !s.panelOpen })),
    }),
    {
      name: 'exercise-persist-settings',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (s) => ({ volume: s.volume, muted: s.muted }),
    },
  ),
);

export default function App() {
  const s = useSettings();
  return (
    <div>
      <button onClick={s.togglePanel}>{s.panelOpen ? 'Hide' : 'Show'} settings</button>
      {s.panelOpen && (
        <div style={{ padding: 8, background: '#f4f4f4' }}>
          <input type="range" min="0" max="100" value={s.volume}
            onChange={(e) => s.setVolume(Number(e.target.value))} />
          <label>
            <input type="checkbox" checked={s.muted} onChange={s.toggleMute} /> muted
          </label>
        </div>
      )}
      <p>volume {s.volume}, {s.muted ? 'muted' : 'sound on'}</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── devtools
  {
    id: 'devtools',
    section: 'Middleware',
    title: 'devtools: Redux DevTools for Zustand',
    explain: `
      <p>The <a href="https://github.com/reduxjs/redux-devtools" target="_blank">Redux DevTools</a>
      browser extension shows a timeline of every action and the state after it, and lets you
      "time travel" back. The <code>devtools</code> middleware connects a Zustand store to it,
      no Redux needed.</p>
      <pre><code>import { devtools } from 'zustand/middleware';

const useBearStore = create(
  devtools(
    (set) =&gt; ({
      bears: 0,
      increase: () =&gt;
        set((s) =&gt; ({ bears: s.bears + 1 }), undefined, 'bears/increase'),
    }),
    { name: 'BearStore', enabled: import.meta.env.DEV },
  ),
);</code></pre>
      <h3>Action names: the third argument of <code>set</code></h3>
      <p>Inside <code>devtools</code>, <code>set</code> takes
      <code>set(partial, replace, actionName)</code>. Pass <code>undefined</code> (or
      <code>false</code>) for <code>replace</code> to keep the normal merge. The name can be a
      string or an object with a <code>type</code> (<code>{ type: 'bears/add', by: 5 }</code>).
      Without a name, v5.0.15 tries to guess one from the call stack and falls back to
      <code>'anonymous'</code>; change the fallback with the <code>anonymousActionType</code>
      option.</p>
      <h3>Options</h3>
      <ul>
        <li><code>name</code>: label of this store in the extension.</li>
        <li><code>enabled</code>: default is <code>true</code> in development and
          <code>false</code> in production (it checks <code>import.meta.env.MODE</code>).
          Set it explicitly to be sure.</li>
        <li><code>store</code>: group several stores under one connection
          <code>name</code>.</li>
      </ul>
      <h3>Where it goes: outermost</h3>
      <p>Put <code>devtools</code> <strong>last</strong> (outermost):
      <code>devtools(persist(immer(...)))</code>. The docs explain that <code>devtools</code>
      changes <code>setState</code> and adds the action-name parameter, which can get lost if
      other middlewares change <code>setState</code> before it.</p>
      <div class="warn"><strong>No extension in this playground.</strong> Without the
      extension, <code>devtools</code> simply returns your creator unchanged: no errors, no
      warnings, the store works normally (checked in the v5.0.15 source). The example below
      plugs in a tiny <em>fake</em> extension that prints to the console what the real one
      would receive.</div>
    `,
    examples: [
      {
        title: 'Named actions (with a fake DevTools extension)',
        code: `import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// The real Redux DevTools extension isn't in this sandbox.
// This fake prints what the extension would receive.
window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect(options) {
    console.log('[devtools] connect', options.name);
    return {
      init: (state) => console.log('[devtools] init', JSON.stringify(state)),
      send: (action, state) =>
        console.log('[devtools]', action.type, JSON.stringify(state)),
      subscribe: () => () => {},
    };
  },
};

const useBearStore = create(
  devtools(
    (set) => ({
      bears: 0,
      increase: () =>
        set((s) => ({ bears: s.bears + 1 }), undefined, 'bears/increase'),
      addMany: (by) =>
        set((s) => ({ bears: s.bears + by }), undefined, { type: 'bears/addMany', by }),
      unnamed: () => set({ bears: 0 }),
    }),
    { name: 'BearStore', anonymousActionType: 'unknown' },
  ),
);

export default function App() {
  const bears = useBearStore((s) => s.bears);
  const { increase, addMany, unnamed } = useBearStore.getState();
  return (
    <div>
      <p>🐻 bears: {bears}</p>
      <button onClick={increase}>increase</button>
      <button onClick={() => addMany(5)}>addMany(5)</button>
      <button onClick={unnamed}>reset (no name)</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>What the console shows</summary>
            <table>
              <tr><th>Step</th><th>Console</th></tr>
              <tr><td>Load</td><td><code>[devtools] connect BearStore</code><br>
                <code>[devtools] init {"bears":0}</code></td></tr>
              <tr><td>Click <em>increase</em></td><td><code>[devtools] bears/increase {"bears":1}</code></td></tr>
              <tr><td>Click <em>addMany(5)</em></td><td><code>[devtools] bears/addMany {"bears":6}</code></td></tr>
              <tr><td>Click <em>reset (no name)</em></td><td><code>[devtools] unknown {"bears":0}</code></td></tr>
            </table>
            <p>In the real extension, each <code>send</code> is one row in the action list;
            clicking it shows the state and the diff.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Delete the whole <code>window.__REDUX_DEVTOOLS_EXTENSION__ = ...</code> block
                and ▶ Run. The app works exactly the same with an empty console: that's
                <code>devtools</code> without an extension.</li>
              <li>Add <code>enabled: false</code> to the options: no <code>connect</code>
                line, even with the fake present.</li>
              <li>Remove <code>anonymousActionType</code>: the reset shows the name v5 guesses
                from the call stack (or <code>anonymous</code>).</li>
            </ul>
            <div class="tip">Use a <code>slice/action</code> naming style
            (<code>'cart/addItem'</code>) so the timeline is easy to scan and filter.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'How do you name an action for devtools in v5?',
        options: [
          "<code>set({ ... }, 'bears/add')</code>",
          "<code>set({ ... }, undefined, 'bears/add')</code>",
          "<code>set.name = 'bears/add'</code>",
          "<code>devtools.action('bears/add')</code>",
        ],
        answer: 1,
        why: 'The 2nd argument is <code>replace</code>, so the name is the 3rd. Passing a string as 2nd would be treated as a truthy <code>replace</code>.',
      },
      {
        q: 'What happens when the Redux DevTools extension is not installed?',
        options: [
          'The store throws an error',
          'devtools logs an error on every set',
          'devtools returns your creator unchanged; the store works normally',
          'The store is read-only',
        ],
        answer: 2,
        why: 'In v5.0.15, if <code>window.__REDUX_DEVTOOLS_EXTENSION__</code> is missing (or <code>enabled</code> is false) it just calls your creator.',
      },
      {
        q: 'Where should <code>devtools</code> go when combined with other middleware?',
        options: [
          'Innermost: <code>persist(devtools(...))</code>',
          'Outermost: <code>devtools(persist(...))</code>',
          'It doesn\'t matter at all',
          'It can\'t be combined',
        ],
        answer: 1,
        why: 'The docs recommend devtools as last as possible (outermost), so no other middleware changes <code>setState</code> before it.',
      },
      {
        q: 'How do you turn devtools off in production explicitly?',
        options: [
          'Remove the extension',
          '<code>devtools(fn, { enabled: false })</code> (e.g. <code>enabled: import.meta.env.DEV</code>)',
          '<code>devtools(fn, { name: null })</code>',
          'You can\'t',
        ],
        answer: 1,
        why: '<code>enabled</code> controls whether it connects. Default: on in dev, off in production.',
      },
    ],
    exercise: {
      task: `
        <p>Wrap the todo store with <code>devtools</code> (name <code>'TodoStore'</code>) and
        give every <code>set</code> an action name: <code>'todos/add'</code> and
        <code>'todos/toggle'</code>. The fake extension is already there. The console should show
        <code>[devtools] todos/add ...</code> instead of nothing.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import devtools

window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect: () => ({
    init: (state) => console.log('[devtools] init', JSON.stringify(state)),
    send: (action) => console.log('[devtools]', action.type),
    subscribe: () => () => {},
  }),
};

let nextId = 1;

const useTodos = create((set) => ({
  todos: [],
  add: (text) =>
    set((s) => ({ todos: [...s.todos, { id: nextId++, text, done: false }] })),
  toggle: (id) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

export default function App() {
  const todos = useTodos((s) => s.todos);
  const { add, toggle } = useTodos.getState();
  return (
    <div>
      <button onClick={() => add('Todo ' + nextId)}>Add todo</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
            {t.done ? '✅' : '⬜'} {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}`,
      hint: "devtools((set) => ({ ... set(fn, undefined, 'todos/add') ... }), { name: 'TodoStore' })",
      solution: `import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect: () => ({
    init: (state) => console.log('[devtools] init', JSON.stringify(state)),
    send: (action) => console.log('[devtools]', action.type),
    subscribe: () => () => {},
  }),
};

let nextId = 1;

const useTodos = create(
  devtools(
    (set) => ({
      todos: [],
      add: (text) =>
        set(
          (s) => ({ todos: [...s.todos, { id: nextId++, text, done: false }] }),
          undefined,
          'todos/add',
        ),
      toggle: (id) =>
        set(
          (s) => ({
            todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
          }),
          undefined,
          'todos/toggle',
        ),
    }),
    { name: 'TodoStore' },
  ),
);

export default function App() {
  const todos = useTodos((s) => s.todos);
  const { add, toggle } = useTodos.getState();
  return (
    <div>
      <button onClick={() => add('Todo ' + nextId)}>Add todo</button>
      <ul>
        {todos.map((t) => (
          <li key={t.id} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
            {t.done ? '✅' : '⬜'} {t.text}
          </li>
        ))}
      </ul>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── immer
  {
    id: 'immer',
    section: 'Middleware',
    title: 'immer: write updates as mutations',
    explain: `
      <p>Zustand wants <strong>immutable</strong> updates: build a new object instead of
      changing the old one. For flat state that's easy. For nested state it becomes a spread
      pyramid:</p>
      <pre><code>// manual: toggle one todo inside a nested list
set((s) =&gt; ({
  project: {
    ...s.project,
    todos: s.project.todos.map((t) =&gt;
      t.id === id ? { ...t, done: !t.done } : t,
    ),
  },
}));</code></pre>
      <p>The <code>immer</code> middleware lets you <em>write</em> it as a mutation on a
      <strong>draft</strong>. Immer records what you changed and produces a new immutable
      state for you, copying only the parts that changed.</p>
      <pre><code>import { immer } from 'zustand/middleware/immer';   // needs the 'immer' package

const useStore = create(
  immer((set) =&gt; ({
    project: { name: 'Site', todos: [] },
    toggle: (id) =&gt;
      set((state) =&gt; {
        const todo = state.project.todos.find((t) =&gt; t.id === id);
        todo.done = !todo.done;            // looks like mutation, is safe
      }),
  })),
);</code></pre>
      <p>Analogy: you scribble on a <strong>photocopy</strong> (the draft). Immer compares it
      with the original and hands Zustand a clean new version.</p>
      <h3>Rules</h3>
      <ul>
        <li><strong>Mutate the draft OR return a new object, never both.</strong> Immer throws
          "An immer producer returned a new value *and* modified its draft".</li>
        <li>Watch arrow shorthands: <code>set((s) =&gt; s.count++)</code> mutates
          <em>and</em> returns a number. Use braces: <code>set((s) =&gt; { s.count++; })</code>.</li>
        <li>Object form still works: <code>set({ loading: true })</code> is merged as usual.</li>
        <li>The draft only lives during the function. Don't keep it for later (e.g. in a
          <code>setTimeout</code>); Immer revokes it.</li>
        <li>Map/Set in state need <code>enableMapSet()</code> from <code>'immer'</code>.</li>
      </ul>
      <div class="tip">Immer shines for <strong>nested</strong> objects and arrays. For
      flat state like <code>{ count }</code> the plain version is just as short, and you don't
      need the extra dependency.</div>
    `,
    examples: [
      {
        title: 'Nested updates: spread vs immer, side by side',
        code: `import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const initial = {
  user: { name: 'Ana', address: { city: 'Lima', zip: '15001' } },
  todos: [
    { id: 1, text: 'Learn persist', done: true },
    { id: 2, text: 'Learn immer', done: false },
  ],
};

// A) manual immutable updates
const useManual = create((set) => ({
  ...initial,
  moveTo: (city) =>
    set((s) => ({
      user: { ...s.user, address: { ...s.user.address, city } },
    })),
  toggle: (id) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

// B) the same with immer
const useImmer = create(
  immer((set) => ({
    ...initial,
    moveTo: (city) =>
      set((s) => {
        s.user.address.city = city;
      }),
    toggle: (id) =>
      set((s) => {
        const todo = s.todos.find((t) => t.id === id);
        todo.done = !todo.done;
      }),
  })),
);

function Panel({ title, useStore }) {
  const user = useStore((s) => s.user);
  const todos = useStore((s) => s.todos);
  const { moveTo, toggle } = useStore.getState();
  return (
    <div style={{ flex: 1, padding: 8, background: '#f6f7fb', borderRadius: 6 }}>
      <b>{title}</b>
      <p>{user.name} lives in {user.address.city}</p>
      <button onClick={() => moveTo(user.address.city === 'Lima' ? 'Oslo' : 'Lima')}>
        Move
      </button>
      {todos.map((t) => (
        <div key={t.id} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
          {t.done ? '✅' : '⬜'} {t.text}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Panel title="Manual spread" useStore={useManual} />
      <Panel title="immer" useStore={useImmer} />
    </div>
  );
}`,
      },
      {
        title: 'Structural sharing + the "return AND mutate" mistake',
        code: `import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useStore = create(
  immer((set) => ({
    count: 0,
    settings: { theme: 'light' },
    good: () =>
      set((s) => {
        s.count += 1;
      }),
    alsoGood: () => set((s) => ({ count: s.count + 1 })), // return only: fine
    bad: () => set((s) => s.count++), // mutates AND returns a number!
  })),
);

export default function App() {
  const count = useStore((s) => s.count);

  function run(name) {
    const before = useStore.getState();
    try {
      useStore.getState()[name]();
    } catch (e) {
      console.log(name + ' threw:', e.message);
      return;
    }
    const after = useStore.getState();
    console.log(
      name + ': count', before.count, '→', after.count,
      '| state is new object:', before !== after,
      '| settings reused:', before.settings === after.settings,
    );
  }

  return (
    <div>
      <p>count: {count}</p>
      <button onClick={() => run('good')}>good (mutate)</button>
      <button onClick={() => run('alsoGood')}>alsoGood (return)</button>
      <button onClick={() => run('bad')}>bad (both)</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: click each button once</summary>
            <table>
              <tr><th>Click</th><th>What Immer sees</th><th>Console</th></tr>
              <tr><td><em>good</em></td><td>draft changed, returned <code>undefined</code> → new
                state built from the draft</td><td><code>good: count 0 → 1 | state is new object:
                true | settings reused: true</code></td></tr>
              <tr><td><em>alsoGood</em></td><td>draft untouched, returned an object → that
                object is used (then merged by Zustand)</td><td><code>alsoGood: count 1 → 2 |
                state is new object: true | settings reused: true</code></td></tr>
              <tr><td><em>bad</em></td><td><code>s.count++</code> changed the draft <em>and</em>
                the arrow returned the old number</td><td><code>bad threw: [Immer] An immer
                producer returned a new value *and* modified its draft. Either return a new value
                *or* modify the draft.</code></td></tr>
            </table>
            <p><strong>settings reused: true</strong> is structural sharing: Immer only copies
            what changed. <code>settings</code> keeps its identity, so components selecting it
            don't re-render.</p>
          </details>
          <details>
            <summary>Common mistake: arrow shorthand</summary>
            <pre><code>set((s) =&gt; s.count++)          // ✗ returns a number and mutates
set((s) =&gt; (s.done = true))    // ✗ returns true and mutates
set((s) =&gt; { s.count++; })     // ✓ braces: returns undefined
set((s) =&gt; void s.count++)     // ✓ also OK, but less readable</code></pre>
            <div class="warn">The error is thrown from inside <code>set</code>, so in a real
            app it crashes the click handler. The demo wraps it in <code>try/catch</code> only
            to show the message.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Where do you import the immer middleware from?',
        options: [
          "<code>'zustand/middleware'</code>",
          "<code>'zustand/middleware/immer'</code>",
          "<code>'immer'</code>",
          "<code>'zustand/immer'</code>",
        ],
        answer: 1,
        why: "It lives in its own entry, <code>'zustand/middleware/immer'</code>, and requires the <code>immer</code> package to be installed.",
      },
      {
        q: 'Which update is WRONG with the immer middleware?',
        options: [
          '<code>set((s) =&gt; { s.todos.push(todo); })</code>',
          '<code>set({ loading: true })</code>',
          '<code>set((s) =&gt; ({ count: s.count + 1 }))</code>',
          '<code>set((s) =&gt; s.todos.push(todo))</code>',
        ],
        answer: 3,
        why: '<code>push</code> mutates the draft AND returns the new length, so Immer throws. Add braces.',
      },
      {
        q: 'After an immer update that only changes <code>user.name</code>, is <code>state.todos</code> the same reference as before?',
        options: [
          'Yes, unchanged parts are shared',
          'No, Immer deep-copies everything',
          'Only if todos is empty',
          'It becomes a draft proxy',
        ],
        answer: 0,
        why: 'Structural sharing: only changed branches (<code>user</code> and the root) get new objects.',
      },
      {
        q: 'Is immer required for nested updates in Zustand?',
        options: [
          'Yes, Zustand can\'t update nested state otherwise',
          'No, it just saves you from writing spreads by hand',
          'Yes, in v5',
          'Only for arrays',
        ],
        answer: 1,
        why: 'Manual spreads work fine. Immer is a convenience for deep/nested structures.',
      },
    ],
    exercise: {
      task: `
        <p>Rewrite the store with the <code>immer</code> middleware so both actions
        <strong>mutate the draft</strong> instead of spreading. <code>addTag</code> pushes to
        <code>post.meta.tags</code>; <code>like</code> increments
        <code>post.stats.likes</code>.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import immer and rewrite the actions with mutations

const usePost = create((set) => ({
  post: { title: 'Hello', meta: { tags: ['intro'] }, stats: { likes: 0 } },
  addTag: (tag) =>
    set((s) => ({
      post: { ...s.post, meta: { ...s.post.meta, tags: [...s.post.meta.tags, tag] } },
    })),
  like: () =>
    set((s) => ({
      post: { ...s.post, stats: { ...s.post.stats, likes: s.post.stats.likes + 1 } },
    })),
}));

export default function App() {
  const post = usePost((s) => s.post);
  const { addTag, like } = usePost.getState();
  return (
    <div>
      <h3>{post.title}</h3>
      <p>tags: {post.meta.tags.join(', ')}</p>
      <p>👍 {post.stats.likes}</p>
      <button onClick={() => addTag('tag' + post.meta.tags.length)}>Add tag</button>
      <button onClick={like}>Like</button>
    </div>
  );
}`,
      hint: 'create(immer((set) => ({ ..., addTag: (tag) => set((s) => { s.post.meta.tags.push(tag); }) })))',
      solution: `import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const usePost = create(
  immer((set) => ({
    post: { title: 'Hello', meta: { tags: ['intro'] }, stats: { likes: 0 } },
    addTag: (tag) =>
      set((s) => {
        s.post.meta.tags.push(tag);
      }),
    like: () =>
      set((s) => {
        s.post.stats.likes += 1;
      }),
  })),
);

export default function App() {
  const post = usePost((s) => s.post);
  const { addTag, like } = usePost.getState();
  return (
    <div>
      <h3>{post.title}</h3>
      <p>tags: {post.meta.tags.join(', ')}</p>
      <p>👍 {post.stats.likes}</p>
      <button onClick={() => addTag('tag' + post.meta.tags.length)}>Add tag</button>
      <button onClick={like}>Like</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── subscribe-with-selector
  {
    id: 'subscribe-with-selector',
    section: 'Middleware',
    title: 'subscribeWithSelector: react to one slice',
    explain: `
      <p>You met <code>useStore.subscribe(listener)</code>: it calls
      <code>listener(state, prevState)</code> on <strong>every</strong> change. Often you only
      care about one field, e.g. "when <code>count</code> changes, update the tab title". With
      plain <code>subscribe</code> you'd compare by hand each time.</p>
      <p><code>subscribeWithSelector</code> upgrades <code>subscribe</code> with a selector
      version:</p>
      <pre><code>import { subscribeWithSelector } from 'zustand/middleware';

const useStore = create(subscribeWithSelector((set) =&gt; ({ ... })));

const unsub = useStore.subscribe(
  (state) =&gt; state.count,               // selector
  (count, prevCount) =&gt; { ... },         // listener: only when the slice changes
  {
    equalityFn: Object.is,               // default; use shallow for objects/arrays
    fireImmediately: false,              // true = also call once right now
  },
);</code></pre>
      <p>Analogy: plain <code>subscribe</code> is a doorbell that rings for every visitor;
      the selector version only rings when <em>your</em> package arrives.</p>
      <h3>Use cases: side effects outside React</h3>
      <ul>
        <li>Sync to <code>document.title</code>, a URL, a canvas, a non-React widget.</li>
        <li>Analytics: "user changed plan".</li>
        <li>Play a sound when <code>unread</code> goes up.</li>
        <li>Keep another store in sync.</li>
      </ul>
      <p>The old one-argument form still works: <code>subscribe(listener)</code>.</p>
      <div class="tip">Subscribing inside a component? Do it in <code>useEffect</code> and
      return the unsubscribe function: <code>useEffect(() =&gt; useStore.subscribe(sel, fn),
      [])</code>. For showing data in the UI, just use the hook with a selector.</div>
      <div class="warn">A selector that builds a new object/array (<code>(s) =&gt; ({ a: s.a
      })</code>) is "changed" on every update with the default <code>Object.is</code>. Pass
      <code>{ equalityFn: shallow }</code> (from <code>'zustand/shallow'</code>).</div>
    `,
    examples: [
      {
        title: 'plain subscribe vs selector subscribe',
        code: `import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { shallow } from 'zustand/shallow';

const useStore = create(
  subscribeWithSelector((set) => ({
    count: 0,
    text: '',
    inc: () => set((s) => ({ count: s.count + 1 })),
    setText: (text) => set({ text }),
  })),
);

// A plain DOM element, NOT managed by React
const badge = document.createElement('div');
badge.style.cssText = 'margin:8px 12px;padding:4px 8px;background:#eef;border-radius:6px';
document.body.append(badge);

// ① plain subscribe: fires on EVERY change
useStore.subscribe(() => console.log('plain: something changed'));

// ② selector subscribe: fires only when count changes
useStore.subscribe(
  (s) => s.count,
  (count, prevCount) => {
    console.log('count:', prevCount, '→', count);
    badge.textContent = 'Badge outside React: count is ' + count;
  },
  { fireImmediately: true }, // ③ also run once right now
);

// ④ object selector needs shallow, or it fires every time
useStore.subscribe(
  (s) => ({ count: s.count, hasText: s.text.length > 0 }),
  (summary) => console.log('summary:', JSON.stringify(summary)),
  { equalityFn: shallow },
);

export default function App() {
  const count = useStore((s) => s.count);
  const text = useStore((s) => s.text);
  const { inc, setText } = useStore.getState();
  return (
    <div>
      <button onClick={inc}>count +1 ({count})</button>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="type here"
      />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: plain <code>subscribe</code> is too chatty</summary>
            <p>Plain <code>subscribe</code> runs for every <code>set</code>. Typing
            <code>hello</code> in the input fires it five times, though <code>count</code>
            never changed. To react only to <code>count</code> you'd keep a "previous" variable
            and compare by hand in every listener. <code>subscribeWithSelector</code> does that
            comparison for you.</p>
          </details>
          <details>
            <summary>Step by step: load, click, type "h", type "i"</summary>
            <p>Listeners run in the order they subscribed: ① then ② then ④.</p>
            <table>
              <tr><th>Step</th><th>State change</th><th>Console</th><th>Badge</th></tr>
              <tr><td>Load</td><td>none</td><td><code>count: 0 → 0</code>
                (<code>fireImmediately</code> calls with current and "previous" = current)</td>
                <td>count is 0</td></tr>
              <tr><td>Click <em>count +1</em></td><td>count 0 → 1</td>
                <td><code>plain: something changed</code><br><code>count: 0 → 1</code><br>
                <code>summary: {"count":1,"hasText":false}</code></td><td>count is 1</td></tr>
              <tr><td>Type <em>h</em></td><td>text '' → 'h'</td>
                <td><code>plain: something changed</code><br>
                <code>summary: {"count":1,"hasText":true}</code></td><td>(unchanged)</td></tr>
              <tr><td>Type <em>i</em></td><td>text 'h' → 'hi'</td>
                <td><code>plain: something changed</code> only</td><td>(unchanged)</td></tr>
            </table>
            <p>On the last step, <code>summary</code> is a new object
            <code>{ count: 1, hasText: true }</code>, but <code>shallow</code> sees the same
            keys with the same values, so the listener is skipped.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>useStore.subscribe(() =&gt; ...)                              // ①
useStore.subscribe((s) =&gt; s.count, (count, prev) =&gt; ...)   // ②
{ fireImmediately: true }                                  // ③
{ equalityFn: shallow }                                    // ④</code></pre>
            <ol>
              <li><strong>①</strong> One argument: the old behaviour, every change.</li>
              <li><strong>②</strong> Selector + listener. The middleware remembers the last
                selected value and calls the listener with <code>(next, previous)</code> only
                when <code>equalityFn(previous, next)</code> is false.</li>
              <li><strong>③</strong> Handy for "set up the initial value" (the badge) without
                duplicating code.</li>
              <li><strong>④</strong> The selector returns a fresh object each time. With the
                default <code>Object.is</code> that's always "different".</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Remove <code>{ equalityFn: shallow }</code> from ④ and ▶ Run. Now
                <code>summary:</code> logs on every keystroke.</li>
              <li>Remove <code>fireImmediately</code>: the badge stays empty until the first
                click.</li>
              <li>Keep the return value: <code>const unsub = useStore.subscribe(...)</code> and
                call <code>unsub()</code> to stop listening.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'With subscribeWithSelector, what arguments does the listener receive?',
        options: [
          '<code>(state, prevState)</code>',
          '<code>(selectedValue, previousSelectedValue)</code>',
          '<code>(selectedValue)</code> only',
          '<code>(action, state)</code>',
        ],
        answer: 1,
        why: 'The selector form passes the selected slice and the previous selected slice.',
      },
      {
        q: 'What does <code>fireImmediately: true</code> do?',
        options: [
          'Skips the equality check',
          'Calls the listener once right away with the current value',
          'Runs the listener synchronously instead of async',
          'Fires before the state changes',
        ],
        answer: 1,
        why: 'It calls <code>listener(current, current)</code> at subscribe time, then as normal.',
      },
      {
        q: 'Selector <code>(s) =&gt; [s.a, s.b]</code> fires on every change. Fix?',
        options: [
          'Use <code>fireImmediately</code>',
          'Pass <code>{ equalityFn: shallow }</code>',
          'Wrap it in <code>useShallow</code>',
          'Use plain subscribe instead',
        ],
        answer: 1,
        why: 'A new array is never <code>Object.is</code>-equal. <code>shallow</code> compares items. (<code>useShallow</code> is for the React hook, not for subscribe.)',
      },
      {
        q: 'Best use case for selector subscriptions?',
        options: [
          'Rendering values in components',
          'Side effects outside React: document.title, analytics, non-React widgets',
          'Replacing actions',
          'Persisting state',
        ],
        answer: 1,
        why: 'For UI, use the hook. Subscriptions are for imperative side effects.',
      },
    ],
    exercise: {
      task: `
        <p>When <code>theme</code> changes, set <code>document.body.style.background</code>
        (<code>'#222'</code> for dark, <code>'#fff'</code> for light) and log
        <code>theme changed: dark</code>. It should <strong>not</strong> fire when
        <code>fontSize</code> changes, and it should apply the theme once at start.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import subscribeWithSelector and wrap the creator

const useUi = create((set) => ({
  theme: 'light',
  fontSize: 15,
  toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
  bigger: () => set((s) => ({ fontSize: s.fontSize + 1 })),
}));

// TODO: useUi.subscribe(selector, listener, { fireImmediately: true })

export default function App() {
  const theme = useUi((s) => s.theme);
  const fontSize = useUi((s) => s.fontSize);
  const { toggleTheme, bigger } = useUi.getState();
  return (
    <div style={{ fontSize, color: theme === 'dark' ? '#eee' : '#222' }}>
      <p>theme: {theme}, font: {fontSize}px</p>
      <button onClick={toggleTheme}>Toggle theme</button>
      <button onClick={bigger}>Bigger text</button>
    </div>
  );
}`,
      hint: "useUi.subscribe((s) => s.theme, (theme) => { ... }, { fireImmediately: true })",
      solution: `import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

const useUi = create(
  subscribeWithSelector((set) => ({
    theme: 'light',
    fontSize: 15,
    toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
    bigger: () => set((s) => ({ fontSize: s.fontSize + 1 })),
  })),
);

useUi.subscribe(
  (s) => s.theme,
  (theme) => {
    console.log('theme changed:', theme);
    document.body.style.background = theme === 'dark' ? '#222' : '#fff';
  },
  { fireImmediately: true },
);

export default function App() {
  const theme = useUi((s) => s.theme);
  const fontSize = useUi((s) => s.fontSize);
  const { toggleTheme, bigger } = useUi.getState();
  return (
    <div style={{ fontSize, color: theme === 'dark' ? '#eee' : '#222' }}>
      <p>theme: {theme}, font: {fontSize}px</p>
      <button onClick={toggleTheme}>Toggle theme</button>
      <button onClick={bigger}>Bigger text</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── combine
  {
    id: 'combine',
    section: 'Middleware',
    title: 'combine: state + actions, typed for free',
    explain: `
      <p><code>combine(initialState, (set, get) =&gt; actions)</code> splits a store into two
      parts: a plain data object and a function that returns the actions. It then
      <strong>shallow-merges</strong> them into one state.</p>
      <pre><code>import { combine } from 'zustand/middleware';

const useBear = create(
  combine(
    { bears: 0, name: 'Bruno' },                 // initial state
    (set, get) =&gt; ({                             // actions
      add: () =&gt; set((s) =&gt; ({ bears: s.bears + 1 })),
      describe: () =&gt; get().name + ' has ' + get().bears,
    }),
  ),
);</code></pre>
      <p>At runtime it's tiny: <code>Object.assign({}, initialState, actions(set, get,
      api))</code>. If an action has the same key as a state field, the action wins.</p>
      <h3>Why use it? TypeScript inference</h3>
      <p>In TypeScript, <code>create</code> normally needs a hand-written type:
      <code>create&lt;BearState&gt;()(...)</code>. With <code>combine</code>, TS infers the type
      from the initial object, so you write no interface at all:</p>
      <pre><code>// TypeScript
const useBear = create(
  combine({ bears: 0 }, (set) =&gt; ({
    add: (by: number) =&gt; set((s) =&gt; ({ bears: s.bears + by })),  // s is { bears: number }
  })),
);
// useBear: { bears: number } &amp; { add: (by: number) =&gt; void }</code></pre>
      <div class="warn">Inside the actions function, <code>set</code> and <code>get</code> are
      typed with the <strong>initial state only</strong>. <code>get().add</code> works at
      runtime but TS doesn't know about it. Also, types are inferred from values:
      <code>{ user: null }</code> becomes type <code>null</code>; write
      <code>{ user: null as User | null }</code>.</div>
      <div class="tip">In plain JavaScript, <code>combine</code> is mostly a style choice:
      "data up top, actions below". It works with other middleware too:
      <code>devtools(combine(...))</code>.</div>
    `,
    examples: [
      {
        title: 'A store built with combine',
        code: `import { create } from 'zustand';
import { combine } from 'zustand/middleware';

const useBear = create(
  combine(
    { bears: 0, name: 'Bruno' }, // ① plain data
    (set, get) => ({
      // ② actions, get the same set/get as always
      add: () => set((s) => ({ bears: s.bears + 1 })),
      rename: (name) => set({ name }),
      describe: () => console.log(get().name + ' has ' + get().bears + ' bears'),
    }),
  ),
);

console.log('keys:', Object.keys(useBear.getState()).join(', ')); // ③

export default function App() {
  const bears = useBear((s) => s.bears);
  const name = useBear((s) => s.name);
  const { add, rename, describe } = useBear.getState();
  return (
    <div>
      <p>{name}: {bears} 🐻</p>
      <button onClick={add}>add</button>
      <button onClick={() => rename(name === 'Bruno' ? 'Bella' : 'Bruno')}>rename</button>
      <button onClick={describe}>describe</button>
    </div>
  );
}`,
      },
      {
        title: 'TypeScript: with and without combine',
        runnable: false,
        code: `// Without combine: write the type yourself
interface BearState {
  bears: number;
  add: (by: number) => void;
}
const useBearA = create<BearState>()((set) => ({
  bears: 0,
  add: (by) => set((s) => ({ bears: s.bears + by })),
}));

// With combine: inferred from the initial object
const useBearB = create(
  combine({ bears: 0 }, (set) => ({
    add: (by: number) => set((s) => ({ bears: s.bears + by })),
  })),
);`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>combine(a, fn)</code> return as the initial state?',
        options: [
          'Only <code>a</code>',
          'A deep merge of <code>a</code> and <code>fn(...)</code>',
          'A shallow merge: <code>Object.assign({}, a, fn(set, get, api))</code>',
          'An array <code>[a, fn]</code>',
        ],
        answer: 2,
        why: 'The source is one line: <code>(...args) =&gt; Object.assign({}, initialState, create(...args))</code>.',
      },
      {
        q: 'Main benefit of <code>combine</code> in TypeScript?',
        options: [
          'Faster renders',
          'State type is inferred, no interface needed',
          'Automatic persistence',
          'Deep merging',
        ],
        answer: 1,
        why: 'TS infers the store type from the initial state object plus the returned actions.',
      },
      {
        q: 'Inside the actions function, what does <code>get()</code> contain at runtime?',
        options: [
          'Only the initial state fields',
          'The full current state, including actions',
          '<code>undefined</code>',
          'A frozen copy',
        ],
        answer: 1,
        why: 'Runtime <code>get</code> is the normal store <code>get</code>. Only the TS type is limited to the initial state.',
      },
    ],
    exercise: {
      task: `
        <p>Rewrite the store using <code>combine</code>: the data
        (<code>items</code>, <code>coupon</code>) as the first argument, the actions
        (<code>addItem</code>, <code>applyCoupon</code>) as the second. The app should behave the
        same.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import combine and split data / actions

const useCart = create((set) => ({
  items: [],
  coupon: null,
  addItem: (item) => set((s) => ({ items: [...s.items, item] })),
  applyCoupon: (code) => set({ coupon: code }),
}));

export default function App() {
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const { addItem, applyCoupon } = useCart.getState();
  return (
    <div>
      <p>{items.length} items, coupon: {coupon ?? 'none'}</p>
      <button onClick={() => addItem('🍎')}>Add 🍎</button>
      <button onClick={() => applyCoupon('SAVE10')}>Apply SAVE10</button>
      <p>{items.join(' ')}</p>
    </div>
  );
}`,
      hint: 'create(combine({ items: [], coupon: null }, (set) => ({ addItem: ..., applyCoupon: ... })))',
      solution: `import { create } from 'zustand';
import { combine } from 'zustand/middleware';

const useCart = create(
  combine({ items: [], coupon: null }, (set) => ({
    addItem: (item) => set((s) => ({ items: [...s.items, item] })),
    applyCoupon: (code) => set({ coupon: code }),
  })),
);

export default function App() {
  const items = useCart((s) => s.items);
  const coupon = useCart((s) => s.coupon);
  const { addItem, applyCoupon } = useCart.getState();
  return (
    <div>
      <p>{items.length} items, coupon: {coupon ?? 'none'}</p>
      <button onClick={() => addItem('🍎')}>Add 🍎</button>
      <button onClick={() => applyCoupon('SAVE10')}>Apply SAVE10</button>
      <p>{items.join(' ')}</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── middleware-composition
  {
    id: 'middleware-composition',
    section: 'Middleware',
    title: 'Composing middlewares',
    explain: `
      <p>Middlewares are functions that take and return state creators, so you can
      <strong>nest</strong> them. The usual stack:</p>
      <pre><code>const useStore = create(
  devtools(                                  // outermost
    persist(
      immer((set) =&gt; ({ ... })),             // innermost: your code
      { name: 'app-store' },
    ),
    { name: 'AppStore' },
  ),
);
// TypeScript: create&lt;State&gt;()(devtools(persist(immer(...), ...)))</code></pre>
      <h3>The onion</h3>
      <pre><code>┌─ devtools ──────────────────────────────────┐
│ ┌─ persist ───────────────────────────────┐ │
│ │ ┌─ immer ─────────────────────────────┐ │ │
│ │ │   your (set, get) =&gt; ({ ... })       │ │ │
│ │ └─────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘</code></pre>
      <p>Each layer hands its own wrapped <code>set</code> to the layer inside. So your code
      gets <em>immer's</em> set; immer calls <em>persist's</em> set; persist calls
      <em>devtools'</em> set; devtools calls the real one. A call travels <strong>in</strong>
      from outside to the real store, then each layer does its work on the way back
      <strong>out</strong>.</p>
      <h3>Order rules of thumb</h3>
      <ul>
        <li><strong>devtools outermost</strong> (docs: "as last as possible"). It changes
          <code>setState</code> and adds the action-name parameter; other middlewares changing
          <code>setState</code> before it can lose that.</li>
        <li><strong>immer innermost</strong>, right around your creator, so the
          <code>set</code> <em>you</em> call understands draft functions. By the time the call
          reaches persist and devtools it's a plain update.</li>
        <li><strong>persist</strong> in between, so devtools also sees the hydration.</li>
        <li>TypeScript is picky: mutator types only line up when middlewares are used
          <em>directly inside</em> <code>create</code>, not in separate helper functions.</li>
      </ul>
      <h3>Slices + middleware</h3>
      <p>Apply middlewares <strong>once, on the combined store</strong>, never inside a
      single slice. The docs: "you should only apply middlewares in the combined store.
      Applying them inside individual slices can lead to unexpected issues."</p>
      <pre><code>const useBoundStore = create(
  devtools(
    persist(
      (...a) =&gt; ({
        ...createBearSlice(...a),
        ...createFishSlice(...a),
      }),
      { name: 'bound-store' },
    ),
  ),
);</code></pre>
      <div class="warn">Don't do <code>createBearSlice = persist((set) =&gt; ...)</code>. Two
      slices would each try to hydrate and save the whole store, fighting over it.</div>
    `,
    examples: [
      {
        title: 'Trace one set through devtools → persist → immer',
        code: `import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Fake DevTools extension (the real one isn't in the sandbox)
window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect: (opts) => {
    console.log('[devtools] connect', opts.name);
    return {
      init: (state) => console.log('[devtools] init', JSON.stringify(state)),
      send: (action, state) =>
        console.log('[devtools]', action.type, JSON.stringify(state)),
      subscribe: () => () => {},
    };
  },
};

// localStorage with logging, so we can see persist's work
const loggedStorage = {
  getItem: (key) => {
    const value = localStorage.getItem(key);
    console.log('[persist] load', value);
    return value;
  },
  setItem: (key, value) => {
    console.log('[persist] save', value);
    localStorage.setItem(key, value);
  },
  removeItem: (key) => localStorage.removeItem(key),
};

const useStore = create(
  devtools( // ① outermost
    persist( // ②
      immer((set) => ({ // ③ innermost
        bears: 0,
        addBear: () =>
          set(
            (draft) => {
              console.log('[immer] recipe runs on a draft');
              draft.bears += 1;
            },
            undefined,
            'bears/add',
          ),
      })),
      { name: 'lesson-compose-onion', storage: createJSONStorage(() => loggedStorage) },
    ),
    { name: 'OnionStore', anonymousActionType: 'unknown' },
  ),
);

useStore.subscribe((s) => console.log('[store] listeners notified: bears =', s.bears));

export default function App() {
  const bears = useStore((s) => s.bears);
  const addBear = useStore((s) => s.addBear);
  function clear() {
    useStore.persist.clearStorage();
    console.log('storage cleared, click ▶ Run');
  }
  return (
    <div>
      <p>🐻 bears: {bears}</p>
      <button onClick={addBear}>Add bear</button>
      <button onClick={clear}>Clear storage</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: "which <code>set</code> am I even calling?"</summary>
            <p>With three middlewares there are four different <code>set</code> functions.
            If you don't know which layer wraps which, bugs look like magic: action names
            missing in devtools, draft functions saved as garbage, and so on. The fake
            extension and the logging storage in this demo make every layer visible.</p>
          </details>
          <details>
            <summary>Step by step: which <code>set</code> each layer sees</summary>
            <table>
              <tr><th>Layer</th><th>Receives as <code>set</code></th><th>Hands inward</th></tr>
              <tr><td>① devtools</td><td>the real store <code>setState</code></td>
                <td>its own set: calls real set, then <code>send(action, state)</code></td></tr>
              <tr><td>② persist</td><td>devtools' set</td>
                <td>its own set: calls devtools' set, then saves to storage</td></tr>
              <tr><td>③ immer</td><td>persist's set</td>
                <td>its own set: turns a draft recipe into <code>produce(recipe)</code>, then
                calls persist's set</td></tr>
              <tr><td>your creator</td><td>immer's set</td><td>—</td></tr>
            </table>
            <p><strong>First run</strong> (empty storage). Console:</p>
            <table>
              <tr><th>#</th><th>Console</th><th>Why</th></tr>
              <tr><td>1</td><td><code>[devtools] connect OnionStore</code></td><td>devtools runs
                first (outermost) and connects before calling the inner layers</td></tr>
              <tr><td>2</td><td><code>[persist] load null</code></td><td>persist hydrates while
                the store is being created</td></tr>
              <tr><td>3</td><td><code>[devtools] unknown {"bears":0}</code></td><td>hydration
                calls persist's outer set = devtools' set, with no name</td></tr>
              <tr><td>4</td><td><code>[devtools] init {"bears":0}</code></td><td>the inner layers
                returned; devtools sends the initial (hydrated) state</td></tr>
            </table>
            <p><strong>Click <em>Add bear</em></strong>. The call goes in:
            immer → persist → devtools → real set. Effects come out in reverse:</p>
            <table>
              <tr><th>#</th><th>Console</th><th>Layer</th></tr>
              <tr><td>1</td><td><code>[immer] recipe runs on a draft</code></td><td>real set runs
                <code>produce(recipe)(state)</code></td></tr>
              <tr><td>2</td><td><code>[store] listeners notified: bears = 1</code></td>
                <td>real set, state replaced</td></tr>
              <tr><td>3</td><td><code>[devtools] bears/add {"bears":1}</code></td>
                <td>devtools, after the real set returned</td></tr>
              <tr><td>4</td><td><code>[persist] save {"state":{"bears":1},"version":0}</code></td>
                <td>persist, after devtools' set returned</td></tr>
            </table>
            <p><strong>▶ Run again</strong>: <code>[persist] load
            {"state":{"bears":1},"version":0}</code>, then <code>[devtools] unknown
            {"bears":1}</code> and <code>[devtools] init {"bears":1}</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>devtools(                                   // ①
  persist(                                  // ②
    immer((set) =&gt; ({                       // ③
      addBear: () =&gt; set(recipe, undefined, 'bears/add'),
    })),
    { name, storage: createJSONStorage(() =&gt; loggedStorage) },
  ),
  { name: 'OnionStore' },
)</code></pre>
            <ol>
              <li><strong>①</strong> devtools is outside, so it sees <em>every</em> update,
                including persist's hydration, and gets the action name. Immer and persist both
                forward the extra arguments.</li>
              <li><strong>②</strong> persist in the middle saves after each update.
                <code>createJSONStorage</code> accepts any object with
                <code>getItem/setItem/removeItem</code>, which is how the logging wrapper plugs in.</li>
              <li><strong>③</strong> immer innermost, so your <code>set</code> accepts a draft
                recipe. Outer layers only see a normal updater function.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Remove <code>anonymousActionType: 'unknown'</code>: the hydration row shows
                the name v5 guesses from the stack (or <code>anonymous</code>).</li>
              <li>Swap to <code>persist(devtools(immer(...)), ...)</code> (move the option
                objects too). It still works at runtime, but now devtools is inside persist.
                In TypeScript the recommended order avoids type errors and lost action names.</li>
              <li>Click <em>Clear storage</em>, then ▶ Run: back to <code>load null</code>.</li>
            </ul>
            <div class="tip">You can't see <code>set</code>-order bugs by reading the code
            once. When in doubt, add a tiny logging middleware (lesson 1) between two layers
            and watch the console.</div>
          </details>
        `,
      },
      {
        title: 'Slices + middleware on the combined store',
        code: `import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// Slices are plain creators: NO middleware inside them
const createBearSlice = (set) => ({
  bears: 0,
  addBear: () =>
    set((s) => {
      s.bears += 1;
    }),
});

const createFishSlice = (set, get) => ({
  fish: 5,
  eatFish: () =>
    set((s) => {
      if (s.fish > 0) s.fish -= 1;
    }),
  feedBears: () => {
    get().eatFish();
    get().addBear();
  },
});

// Middlewares wrap the combined store once
const useBoundStore = create(
  persist(
    immer((...a) => ({
      ...createBearSlice(...a),
      ...createFishSlice(...a),
    })),
    { name: 'lesson-compose-slices' },
  ),
);

export default function App() {
  const bears = useBoundStore((s) => s.bears);
  const fish = useBoundStore((s) => s.fish);
  const { addBear, feedBears } = useBoundStore.getState();
  return (
    <div>
      <p>🐻 {bears} &nbsp; 🐟 {fish}</p>
      <button onClick={addBear}>add bear</button>
      <button onClick={feedBears}>feed bears (fish → bear)</button>
      <button onClick={() => useBoundStore.persist.clearStorage()}>clear storage</button>
      <p style={{ color: 'gray' }}>
        Both slices use immer's set and are persisted. ▶ Run to check.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'In <code>devtools(persist(immer(creator)))</code>, which <code>set</code> does <code>creator</code> receive?',
        options: ['The real store set', "devtools' set", "persist's set", "immer's set"],
        answer: 3,
        why: 'Each layer passes its own wrapped set inward; the innermost (immer) wraps your creator.',
      },
      {
        q: 'Why is immer usually innermost?',
        options: [
          'It is the slowest',
          'So the set you call accepts draft recipes, and outer layers get normal updates',
          'Because persist cannot store drafts',
          'It must run before devtools connects',
        ],
        answer: 1,
        why: 'immer converts a recipe into <code>produce(recipe)</code> before passing it on.',
      },
      {
        q: 'Where do you apply <code>persist</code> when using slices?',
        options: [
          'Inside each slice',
          'Only in the biggest slice',
          'Once, around the combined store',
          'Slices can\'t be persisted',
        ],
        answer: 2,
        why: 'Docs: only apply middlewares in the combined store; inside slices leads to unexpected issues.',
      },
      {
        q: 'Which order do the docs recommend for devtools?',
        options: [
          'First / innermost',
          'As last as possible / outermost',
          'Directly around immer',
          'Order never matters',
        ],
        answer: 1,
        why: '<code>devtools(immer(...))</code>, not <code>immer(devtools(...))</code>: devtools changes setState and adds an action-name parameter that could otherwise be lost.',
      },
    ],
    exercise: {
      task: `
        <p>Compose the store as <code>devtools(persist(immer(...)))</code>:</p>
        <ul>
          <li><code>immer</code> so <code>addTodo</code> can <code>push</code> into the draft.</li>
          <li><code>persist</code> with name <code>'exercise-compose-todos'</code>.</li>
          <li><code>devtools</code> with name <code>'Todos'</code>, and name the action
            <code>'todos/add'</code>.</li>
        </ul>
        <p>The fake extension is already there. After adding a todo you should see
        <code>[devtools] todos/add</code>, and the list should survive ▶ Run.</p>
      `,
      starter: `import { create } from 'zustand';
// TODO: import devtools, persist, immer

window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect: () => ({
    init: () => {},
    send: (action) => console.log('[devtools]', action.type),
    subscribe: () => () => {},
  }),
};

const useTodos = create((set) => ({
  todos: [],
  addTodo: (text) => set((s) => ({ todos: [...s.todos, text] })),
}));

export default function App() {
  const todos = useTodos((s) => s.todos);
  const addTodo = useTodos((s) => s.addTodo);
  return (
    <div>
      <button onClick={() => addTodo('Todo ' + (todos.length + 1))}>Add todo</button>
      <ul>
        {todos.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}`,
      hint: "create(devtools(persist(immer((set) => ({ addTodo: (text) => set((s) => { s.todos.push(text); }, undefined, 'todos/add') })), { name: 'exercise-compose-todos' }), { name: 'Todos' }))",
      solution: `import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

window.__REDUX_DEVTOOLS_EXTENSION__ = {
  connect: () => ({
    init: () => {},
    send: (action) => console.log('[devtools]', action.type),
    subscribe: () => () => {},
  }),
};

const useTodos = create(
  devtools(
    persist(
      immer((set) => ({
        todos: [],
        addTodo: (text) =>
          set(
            (s) => {
              s.todos.push(text);
            },
            undefined,
            'todos/add',
          ),
      })),
      { name: 'exercise-compose-todos' },
    ),
    { name: 'Todos' },
  ),
);

export default function App() {
  const todos = useTodos((s) => s.todos);
  const addTodo = useTodos((s) => s.addTodo);
  return (
    <div>
      <button onClick={() => addTodo('Todo ' + (todos.length + 1))}>Add todo</button>
      <ul>
        {todos.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}`,
    },
  },
);
