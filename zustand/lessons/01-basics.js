window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── why-zustand
  {
    id: 'why-zustand',
    section: 'Getting started',
    title: 'What is Zustand & why',
    explain: `
      <p><strong>Zustand</strong> (German for "state") is a tiny state-management library for
      React. This course uses <strong>Zustand v5.0.15</strong> with <strong>React 19.2</strong>.</p>

      <h3>The problem it solves</h3>
      <p>With plain React, shared state lives in a parent component. To reach a deep child you
      either <strong>prop-drill</strong> (pass it through every layer) or put it in
      <strong>Context</strong>. Context fixes the drilling, but it has a catch: when the
      context value changes, <em>every</em> component that reads that context re-renders, even
      if it only cares about a field that did not change.</p>

      <p>Analogy: Context is a group chat. Every message pings everyone. Zustand is a
      newsletter where you subscribe to <em>one topic</em>: you only get pinged when your topic
      changes.</p>

      <h3>What Zustand gives you</h3>
      <ul>
        <li><strong>The store is a hook.</strong> <code>create()</code> returns a hook such as
        <code>useCounterStore</code>. Call it in any component.</li>
        <li><strong>No provider.</strong> The store lives in a normal JS module, outside React.
        No <code>&lt;Provider&gt;</code> wrapping your app.</li>
        <li><strong>Selective re-renders.</strong> A component picks a slice with a
        <em>selector</em> and re-renders only when that slice changes.</li>
        <li><strong>Tiny and unopinionated.</strong> About 1&nbsp;KB, no reducers, no action
        types, no boilerplate. State and the functions that change it sit in one object.</li>
      </ul>

      <pre><code>import { create } from 'zustand';

const useCounterStore = create((set) =&gt; ({
  count: 0,
  increment: () =&gt; set((state) =&gt; ({ count: state.count + 1 })),
}));

function Counter() {
  const count = useCounterStore((state) =&gt; state.count);
  return &lt;p&gt;{count}&lt;/p&gt;;
}</code></pre>

      <div class="tip">Zustand is great for <strong>client state</strong> (UI, carts, settings,
      editors). For <em>server</em> data (fetching, caching) a tool like TanStack Query is often
      a better fit, and the two work well together.</div>

      <p>The two examples below build the same tiny app. Open the console under each preview
      and click <strong>+1</strong> to compare who re-renders.</p>
    `,
    examples: [
      {
        title: 'Context: every consumer re-renders',
        code: `import { createContext, useContext, useState } from 'react';

const AppContext = createContext(null);

function CountView() {
  const { count } = useContext(AppContext);
  console.log('render <CountView>');
  return <p>Count: {count}</p>;
}

function NameView() {
  const { name } = useContext(AppContext);
  console.log('render <NameView>');
  return <p>Name: {name} (never changes)</p>;
}

function Buttons() {
  const { setCount } = useContext(AppContext);
  console.log('render <Buttons>');
  return <button onClick={() => setCount((c) => c + 1)}>+1</button>;
}

export default function App() {
  const [count, setCount] = useState(0);
  const [name] = useState('Ana');
  console.log('render <App>');

  return (
    <AppContext.Provider value={{ count, name, setCount }}>
      <CountView />
      <NameView />
      <Buttons />
    </AppContext.Provider>
  );
}`,
      },
      {
        title: 'Zustand: only the component that uses count re-renders',
        code: `import { create } from 'zustand';

// The store lives OUTSIDE React. No provider needed.
const useAppStore = create((set) => ({
  count: 0,
  name: 'Ana',
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

function CountView() {
  const count = useAppStore((state) => state.count);
  console.log('render <CountView>');
  return <p>Count: {count}</p>;
}

function NameView() {
  const name = useAppStore((state) => state.name);
  console.log('render <NameView>');
  return <p>Name: {name} (never changes)</p>;
}

function Buttons() {
  const increment = useAppStore((state) => state.increment);
  console.log('render <Buttons>');
  return <button onClick={increment}>+1</button>;
}

export default function App() {
  console.log('render <App>');
  return (
    <div>
      <CountView />
      <NameView />
      <Buttons />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: the console for both examples</summary>
            <table>
              <tr><th>Step</th><th>Context example logs</th><th>Zustand example logs</th></tr>
              <tr><td>First render</td>
                <td><code>render &lt;App&gt;</code>, <code>render &lt;CountView&gt;</code>,
                <code>render &lt;NameView&gt;</code>, <code>render &lt;Buttons&gt;</code></td>
                <td>the same four lines</td></tr>
              <tr><td>Click +1</td>
                <td>all four again: App's state changed, so App and every child re-render</td>
                <td>only <code>render &lt;CountView&gt;</code></td></tr>
              <tr><td>Click +1 again</td><td>all four again</td>
                <td>only <code>render &lt;CountView&gt;</code></td></tr>
            </table>
            <p>In the Zustand version <code>&lt;App&gt;</code> holds no state, so it never
            re-renders. Each child subscribes to its own slice: <code>NameView</code> only cares
            about <code>name</code>, and <code>Buttons</code> only about the
            <code>increment</code> function, which never changes.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const useAppStore = create((set) =&gt; ({   // ① create a store, get a hook
  count: 0,
  increment: () =&gt; set((state) =&gt; ({ count: state.count + 1 })), // ②
}));

const count = useAppStore((state) =&gt; state.count);  // ③ subscribe to one slice</code></pre>
            <ol>
              <li><strong>①</strong> <code>create</code> builds the store once, at module level,
              and returns a hook. The store exists before any component renders.</li>
              <li><strong>②</strong> Actions live in the store next to the data. <code>set</code>
              updates the store and notifies subscribers.</li>
              <li><strong>③</strong> The function you pass is a <em>selector</em>. After every
              change Zustand re-runs it and re-renders the component only if the result
              changed. You will dig into this in the next lessons.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does <code>create()</code> from Zustand return?',
        options: [
          'A Provider component you wrap around your app',
          'A React hook bound to the store',
          'A reducer function',
          'A plain object with the state',
        ],
        answer: 1,
        why: '<code>create</code> returns a hook (e.g. <code>useBearStore</code>). The hook also has store methods such as <code>getState</code> attached.',
      },
      {
        q: 'Do you need a <code>&lt;Provider&gt;</code> to use a store made with <code>create()</code>?',
        options: ['Yes, always at the root', 'Only in React 19', 'No, the store lives in a module outside React', 'Only when using selectors'],
        answer: 2,
        why: 'The store is a module-level object. Any component that imports the hook can use it.',
      },
      {
        q: 'Why can Context cause extra re-renders compared to Zustand selectors?',
        options: [
          'Context is slower to read',
          'Every consumer re-renders when the context value changes, even if it uses an unchanged field',
          'Context cannot hold functions',
          'Context re-renders only the provider',
        ],
        answer: 1,
        why: 'Context has no built-in way to subscribe to part of the value. Zustand selectors let each component subscribe to only the slice it needs.',
      },
      {
        q: 'Which is the correct v5 import?',
        options: [
          "import create from 'zustand'",
          "import { create } from 'zustand'",
          "import { createHook } from 'zustand'",
          "import zustand from 'zustand/react'",
        ],
        answer: 1,
        why: 'v4 deprecated the default export and v5 removed it. Use the named export <code>create</code>.',
      },
    ],
    exercise: {
      task: `<p>The starter shares a <code>theme</code> via prop drilling: <code>App</code> →
      <code>Toolbar</code> → <code>ThemeButton</code>. <code>Toolbar</code> doesn't use the
      prop at all, it just passes it down.</p>
      <p>Replace it with a Zustand store <code>useThemeStore</code> holding
      <code>theme: 'light'</code> and an action <code>toggle()</code>. Remove all the props.
      <code>ThemeButton</code> and <code>Panel</code> should read from the store.</p>`,
      starter: `import { useState } from 'react';

function ThemeButton({ theme, onToggle }) {
  return <button onClick={onToggle}>Theme: {theme}</button>;
}

function Toolbar({ theme, onToggle }) {
  // Toolbar doesn't care about theme, it only passes it on
  return (
    <div>
      <ThemeButton theme={theme} onToggle={onToggle} />
    </div>
  );
}

function Panel({ theme }) {
  const dark = theme === 'dark';
  return (
    <p style={{ background: dark ? '#222' : '#eee', color: dark ? '#fff' : '#000' }}>
      Panel in {theme} mode
    </p>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const toggle = () => setTheme((t) => (t === 'light' ? 'dark' : 'light'));

  return (
    <div>
      <Toolbar theme={theme} onToggle={toggle} />
      <Panel theme={theme} />
    </div>
  );
}`,
      hint: "create((set) => ({ theme: 'light', toggle: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })) })). Then in each component call useThemeStore((s) => s.theme) or (s) => s.toggle.",
      solution: `import { create } from 'zustand';

const useThemeStore = create((set) => ({
  theme: 'light',
  toggle: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

function ThemeButton() {
  const theme = useThemeStore((state) => state.theme);
  const toggle = useThemeStore((state) => state.toggle);
  return <button onClick={toggle}>Theme: {theme}</button>;
}

function Toolbar() {
  return (
    <div>
      <ThemeButton />
    </div>
  );
}

function Panel() {
  const theme = useThemeStore((state) => state.theme);
  const dark = theme === 'dark';
  return (
    <p style={{ background: dark ? '#222' : '#eee', color: dark ? '#fff' : '#000' }}>
      Panel in {theme} mode
    </p>
  );
}

export default function App() {
  return (
    <div>
      <Toolbar />
      <Panel />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── create-store
  {
    id: 'create-store',
    section: 'Getting started',
    title: 'create(): your first store',
    explain: `
      <p>A store is built with <code>create</code>. You pass it a function that receives
      <code>set</code> (and <code>get</code>, covered soon) and returns the
      <strong>initial state object</strong>. That object holds both <em>data</em> and
      <em>actions</em> (functions that call <code>set</code>).</p>

      <pre><code>import { create } from 'zustand';

const useBearStore = create((set) =&gt; ({
  bears: 0,                                                   // data
  increase: () =&gt; set((state) =&gt; ({ bears: state.bears + 1 })), // action
  removeAll: () =&gt; set({ bears: 0 }),                         // action
}));</code></pre>

      <h3>Using the hook</h3>
      <p>Call the hook with a <strong>selector</strong>: a function that gets the whole state
      and returns the part you need.</p>
      <pre><code>const bears = useBearStore((state) =&gt; state.bears);
const increase = useBearStore((state) =&gt; state.increase);</code></pre>

      <h3>Where the store lives</h3>
      <p>The store is created <strong>once, when the module loads</strong>, not inside a
      component. Think of it as a small global "database" with a hook as the doorway. Because
      of that:</p>
      <ul>
        <li>Any number of components can share it. They all see the same values.</li>
        <li>State survives when components unmount and mount again.</li>
      </ul>

      <div class="tip">Naming convention: start the hook name with <code>use</code> and end
      with <code>Store</code> (<code>useCartStore</code>, <code>useAuthStore</code>) so it is
      obviously a hook and obviously global.</div>

      <div class="warn">Do not call <code>create</code> inside a component. That would build a
      brand new store on every render and the state would reset. Create stores at the top
      level of a module.</div>
    `,
    examples: [
      {
        title: 'Your first store',
        code: `import { create } from 'zustand';

const useBearStore = create((set) => ({
  bears: 0,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  removeAll: () => set({ bears: 0 }),
}));

function BearCounter() {
  const bears = useBearStore((state) => state.bears);
  return <h2>{bears} bears around here</h2>;
}

function Controls() {
  const increase = useBearStore((state) => state.increase);
  const removeAll = useBearStore((state) => state.removeAll);

  return (
    <div>
      <button onClick={increase}>Add a bear</button>{' '}
      <button onClick={removeAll}>Remove all</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <BearCounter />
      <Controls />
    </div>
  );
}`,
      },
      {
        title: 'State lives outside components (survives unmount)',
        code: `import { useState } from 'react';
import { create } from 'zustand';

const useClickStore = create((set) => ({
  clicks: 0,
  click: () => set((state) => ({ clicks: state.clicks + 1 })),
}));

function StoreCounter() {
  const clicks = useClickStore((state) => state.clicks);
  const click = useClickStore((state) => state.click);
  return <button onClick={click}>Zustand clicks: {clicks}</button>;
}

function LocalCounter() {
  const [clicks, setClicks] = useState(0);
  return (
    <button onClick={() => setClicks((c) => c + 1)}>useState clicks: {clicks}</button>
  );
}

export default function App() {
  const [show, setShow] = useState(true);

  return (
    <div>
      <label>
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
        show counters
      </label>
      {show && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <StoreCounter />
          <LocalCounter />
        </div>
      )}
      <p style={{ color: 'gray' }}>
        Click both a few times, hide them, show them again.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does the function passed to <code>create</code> return?',
        options: [
          'A JSX element',
          'The initial state object (data and actions)',
          'A reducer',
          'Nothing, it only calls set',
        ],
        answer: 1,
        why: 'The initializer returns the initial state. Actions are just functions stored in that same object.',
      },
      {
        q: 'Two components call <code>useBearStore((s) =&gt; s.bears)</code>. One calls <code>increase()</code>. What does the other see?',
        options: ['Its own copy, still 0', 'The new value; they share one store', 'An error', 'The new value only after a page reload'],
        answer: 1,
        why: 'There is one store per <code>create</code> call. Every component using the hook reads from it.',
      },
      {
        q: 'A component using a Zustand store unmounts and mounts again. What happens to the store state?',
        options: ['It resets to the initial value', 'It is kept, because the store lives outside React', 'It becomes undefined', 'It depends on StrictMode'],
        answer: 1,
        why: 'Unlike <code>useState</code>, the store is not owned by a component, so mounting/unmounting does not affect it.',
      },
      {
        q: 'Where should you call <code>create</code>?',
        options: ['Inside the component body', 'Inside useEffect', 'At the top level of a module', 'Inside an event handler'],
        answer: 2,
        why: 'Create the store once at module level. Inside a component it would re-create (and reset) the store on each render.',
      },
    ],
    exercise: {
      task: `<p>Create a store <code>useLikeStore</code> with <code>likes: 0</code> and two
      actions: <code>like()</code> adds 1, <code>reset()</code> sets it back to 0.</p>
      <p>Use it in <code>LikeButton</code> (a "👍 Like" button) and in <code>LikeCount</code>
      (shows "N likes"), plus a Reset button in <code>App</code>.</p>`,
      starter: `import { create } from 'zustand';

// TODO: const useLikeStore = create(...)

function LikeButton() {
  // TODO: read like() from the store
  return <button>👍 Like</button>;
}

function LikeCount() {
  // TODO: read likes from the store
  return <p>0 likes</p>;
}

export default function App() {
  return (
    <div>
      <LikeButton />
      <LikeCount />
      <button>Reset</button>
    </div>
  );
}`,
      hint: 'like: () => set((state) => ({ likes: state.likes + 1 })) and reset: () => set({ likes: 0 }).',
      solution: `import { create } from 'zustand';

const useLikeStore = create((set) => ({
  likes: 0,
  like: () => set((state) => ({ likes: state.likes + 1 })),
  reset: () => set({ likes: 0 }),
}));

function LikeButton() {
  const like = useLikeStore((state) => state.like);
  return <button onClick={like}>👍 Like</button>;
}

function LikeCount() {
  const likes = useLikeStore((state) => state.likes);
  return <p>{likes} likes</p>;
}

export default function App() {
  const reset = useLikeStore((state) => state.reset);

  return (
    <div>
      <LikeButton />
      <LikeCount />
      <button onClick={reset}>Reset</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── reading-state
  {
    id: 'reading-state',
    section: 'Getting started',
    title: 'Reading state with selectors',
    explain: `
      <p>A <strong>selector</strong> is the function you pass to the store hook:</p>
      <pre><code>const bears = useBearStore((state) =&gt; state.bears);</code></pre>
      <p>It receives the <em>whole</em> state and returns the part your component needs.
      Zustand runs it after every store change and re-renders the component
      <strong>only if the returned value changed</strong> (compared with
      <code>Object.is</code>).</p>

      <h3>No selector = subscribe to everything</h3>
      <p>You can call the hook without a selector:</p>
      <pre><code>const state = useBearStore();          // the whole state object
const { bears } = useBearStore();      // same thing, destructured</code></pre>
      <p>That works, but every <code>set</code> produces a new state object, so this component
      re-renders on <strong>every</strong> change, even changes to fields it never uses.
      Destructuring does not help: the hook still returned the whole object.</p>

      <p>Analogy: a selector is like telling the mail room "only bring me letters about
      bears". No selector means "bring me every letter".</p>

      <h3>Selecting actions</h3>
      <p>Actions are created once and never change, so a selector that returns an action never
      triggers a re-render:</p>
      <pre><code>const increase = useBearStore((state) =&gt; state.increase);</code></pre>

      <div class="tip">Rule of thumb: <strong>one selector per value</strong>, and keep
      selectors returning primitives or existing references. Picking several values at once is
      covered in the next section.</div>
    `,
    examples: [
      {
        title: 'Selector vs no selector',
        code: `import { create } from 'zustand';

const useZooStore = create((set) => ({
  bears: 0,
  fish: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  addFish: () => set((state) => ({ fish: state.fish + 1 })),
}));

function WholeState() {
  const { bears } = useZooStore(); // no selector!
  console.log('render <WholeState>');
  return <p>WholeState sees {bears} bears</p>;
}

function BearsOnly() {
  const bears = useZooStore((state) => state.bears);
  console.log('render <BearsOnly>');
  return <p>BearsOnly sees {bears} bears</p>;
}

function Controls() {
  const addBear = useZooStore((state) => state.addBear);
  const addFish = useZooStore((state) => state.addFish);
  return (
    <div>
      <button onClick={addBear}>+ bear</button>{' '}
      <button onClick={addFish}>+ fish</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <WholeState />
      <BearsOnly />
      <Controls />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: who re-renders?</summary>
            <table>
              <tr><th>Step</th><th>State</th><th>Console</th></tr>
              <tr><td>First render</td><td>bears 0, fish 0</td>
                <td><code>render &lt;WholeState&gt;</code><br><code>render &lt;BearsOnly&gt;</code></td></tr>
              <tr><td>Click + fish</td><td>bears 0, fish 1</td>
                <td><code>render &lt;WholeState&gt;</code> only</td></tr>
              <tr><td>Click + fish</td><td>bears 0, fish 2</td>
                <td><code>render &lt;WholeState&gt;</code> only</td></tr>
              <tr><td>Click + bear</td><td>bears 1, fish 2</td>
                <td><code>render &lt;WholeState&gt;</code><br><code>render &lt;BearsOnly&gt;</code></td></tr>
            </table>
            <p><code>WholeState</code> shows only bears, yet it re-renders for fish. Its "slice" is
            the entire state object, which is a new object after every <code>set</code>.
            <code>BearsOnly</code>'s slice is the number <code>0</code>, and
            <code>Object.is(0, 0)</code> is true, so it is skipped.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>WholeState</code> to
              <code>useZooStore((state) =&gt; state.bears)</code>. Now clicking + fish logs
              nothing at all.</li>
              <li><code>Controls</code> has no log, add
              <code>console.log('render &lt;Controls&gt;')</code>. It logs once and never again,
              because its selectors return functions that never change.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'When does a component using <code>useStore((s) =&gt; s.bears)</code> re-render?',
        options: [
          'On every set() call',
          'Only when the value of s.bears changes (Object.is)',
          'Only when the component calls set',
          'Never, selectors are read once',
        ],
        answer: 1,
        why: 'Zustand re-runs the selector after each change and compares old and new result with <code>Object.is</code>.',
      },
      {
        q: '<code>const { bears } = useStore();</code> — when does this component re-render?',
        options: [
          'Only when bears changes',
          'On every state change, because it subscribes to the whole state',
          'Never',
          'Only on first render',
        ],
        answer: 1,
        why: 'Without a selector the hook returns the whole state object, which is new after every set. Destructuring happens after the subscription is made.',
      },
      {
        q: 'A component only selects an action: <code>useStore((s) =&gt; s.increase)</code>. What happens when <code>bears</code> changes?',
        options: ['It re-renders', 'It does not re-render; the function reference is stable', 'It throws', 'It re-renders twice'],
        answer: 1,
        why: 'Actions are created once in the initializer and <code>set</code> merges state, so the same function reference stays in the store.',
      },
    ],
    exercise: {
      task: `<p><code>Header</code> only shows the user's name, but it re-renders every time the
      cart count changes (watch the console). Fix <code>Header</code> and
      <code>CartBadge</code> to use selectors so clicking "Add to cart" only logs
      <code>render &lt;CartBadge&gt;</code>.</p>`,
      starter: `import { create } from 'zustand';

const useShopStore = create((set) => ({
  userName: 'Ana',
  cartCount: 0,
  addToCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),
}));

function Header() {
  const { userName } = useShopStore();
  console.log('render <Header>');
  return <h3>Hi, {userName}</h3>;
}

function CartBadge() {
  const { cartCount, addToCart } = useShopStore();
  console.log('render <CartBadge>');
  return <button onClick={addToCart}>Add to cart ({cartCount})</button>;
}

export default function App() {
  return (
    <div>
      <Header />
      <CartBadge />
    </div>
  );
}`,
      hint: 'Use one hook call per value: useShopStore((state) => state.userName), and two calls in CartBadge.',
      solution: `import { create } from 'zustand';

const useShopStore = create((set) => ({
  userName: 'Ana',
  cartCount: 0,
  addToCart: () => set((state) => ({ cartCount: state.cartCount + 1 })),
}));

function Header() {
  const userName = useShopStore((state) => state.userName);
  console.log('render <Header>');
  return <h3>Hi, {userName}</h3>;
}

function CartBadge() {
  const cartCount = useShopStore((state) => state.cartCount);
  const addToCart = useShopStore((state) => state.addToCart);
  console.log('render <CartBadge>');
  return <button onClick={addToCart}>Add to cart ({cartCount})</button>;
}

export default function App() {
  return (
    <div>
      <Header />
      <CartBadge />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── actions
  {
    id: 'actions',
    section: 'Getting started',
    title: 'Actions: set() and get()',
    explain: `
      <p>The initializer receives two helpers: <code>set</code> to write state and
      <code>get</code> to read the current state.</p>
      <pre><code>const useStore = create((set, get) =&gt; ({ ... }));</code></pre>

      <h3>Two ways to call <code>set</code></h3>
      <ul>
        <li><strong>Object:</strong> <code>set({ bears: 0 })</code>. Use when the new value
        does not depend on the old one.</li>
        <li><strong>Function:</strong> <code>set((state) =&gt; ({ bears: state.bears + 1 }))</code>.
        Use when it does. You get the latest state, just like
        <code>setCount((c) =&gt; c + 1)</code> in React.</li>
      </ul>
      <p>Either way you return <strong>only the fields you change</strong>; Zustand merges them
      into the rest (details in the next lesson).</p>

      <h3><code>get()</code>: read state inside an action</h3>
      <p>Use <code>get()</code> when an action needs current state but isn't directly computing
      the new value with <code>set</code>: guards, logging, calling another action, or
      async code after an <code>await</code>.</p>
      <pre><code>addItem: (name) =&gt; {
  if (get().items.length &gt;= 3) return;       // guard using current state
  set((state) =&gt; ({ items: [...state.items, name] }));
},</code></pre>

      <h3>Actions are plain functions</h3>
      <p>Actions can take arguments, be <code>async</code>, and call <code>set</code> as many
      times as they like. Call them from event handlers like any function:
      <code>onClick={() =&gt; addItem('Tea')}</code>.</p>

      <div class="tip">Unlike <code>useState</code>, <code>get()</code> is never stale. After
      <code>set(...)</code> runs, <code>get()</code> immediately returns the new state, even
      in the same function.</div>
      <div class="warn">Don't call <code>set</code> during render. Call actions from event
      handlers, effects, timers or other actions.</div>
    `,
    examples: [
      {
        title: 'Object set, functional set, arguments, and get()',
        code: `import { create } from 'zustand';

const useCartStore = create((set, get) => ({
  items: [],
  max: 3,

  // arguments + guard with get()
  addItem: (name) => {
    if (get().items.length >= get().max) {
      console.log('cart full, ignored', name);
      return;
    }
    set((state) => ({ items: [...state.items, name] }));
    console.log('after add, get().items =', get().items.join(', '));
  },

  // object form: new value does not depend on old
  clear: () => set({ items: [] }),

  // one action calling another through get()
  checkout: () => {
    const count = get().items.length;
    console.log('checking out', count, 'items');
    get().clear();
  },
}));

export default function App() {
  const items = useCartStore((state) => state.items);
  const max = useCartStore((state) => state.max);
  const addItem = useCartStore((state) => state.addItem);
  const checkout = useCartStore((state) => state.checkout);

  return (
    <div>
      <p>Cart ({items.length}/{max}): {items.join(', ') || 'empty'}</p>
      {['Tea', 'Cake', 'Milk', 'Jam'].map((name) => (
        <button key={name} onClick={() => addItem(name)} style={{ marginRight: 4 }}>
          + {name}
        </button>
      ))}
      <div style={{ marginTop: 8 }}>
        <button onClick={checkout}>Checkout</button>
      </div>
    </div>
  );
}`,
      },
      {
        title: 'Async action: set() several times',
        code: `import { create } from 'zustand';

const fakeFetchUser = (id) =>
  new Promise((resolve) =>
    setTimeout(() => resolve({ id, name: id === 1 ? 'Ana' : 'Ben' }), 800)
  );

const useUserStore = create((set, get) => ({
  user: null,
  loading: false,

  loadUser: async (id) => {
    set({ loading: true });
    console.log('loading user', id);
    const user = await fakeFetchUser(id);
    set({ user, loading: false });
    console.log('loaded', get().user.name);
  },
}));

export default function App() {
  const user = useUserStore((state) => state.user);
  const loading = useUserStore((state) => state.loading);
  const loadUser = useUserStore((state) => state.loadUser);

  return (
    <div>
      <button onClick={() => loadUser(1)}>Load user 1</button>{' '}
      <button onClick={() => loadUser(2)}>Load user 2</button>
      <p>{loading ? 'Loading…' : user ? 'Hello, ' + user.name : 'No user yet'}</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Which call is correct for "add 1 to count" based on the latest state?',
        options: [
          'set(count + 1)',
          'set((state) => ({ count: state.count + 1 }))',
          'set((state) => state.count + 1)',
          'get().count++',
        ],
        answer: 1,
        why: 'The function form receives current state and must return an object with the changed fields.',
      },
      {
        q: 'Inside an action, right after <code>set({ n: 5 })</code>, what does <code>get().n</code> return?',
        options: ['The old value', '5', 'undefined', 'A Promise'],
        answer: 1,
        why: 'Zustand updates the store synchronously. <code>get()</code> always reads the latest state.',
      },
      {
        q: 'Can a Zustand action be <code>async</code>?',
        options: [
          'No, set must be called synchronously',
          'Only with middleware',
          'Yes, just call set whenever the data is ready',
          'Only if it returns a Promise to React',
        ],
        answer: 2,
        why: 'Actions are plain functions. You can await anything and call set as many times as needed.',
      },
      {
        q: 'How can one action call another action in the same store?',
        options: ['this.otherAction()', 'get().otherAction()', 'set.otherAction()', "It can't"],
        answer: 1,
        why: '<code>get()</code> returns the whole state, including the action functions.',
      },
    ],
    exercise: {
      task: `<p>Finish the score store:</p>
      <ul>
        <li><code>add(n)</code> adds <code>n</code> to <code>score</code> (use functional set).</li>
        <li><code>double()</code> doubles the score, but <strong>only if</strong> score is
        below 100. Otherwise it logs <code>too big to double</code> (use <code>get()</code>).</li>
      </ul>`,
      starter: `import { create } from 'zustand';

const useScoreStore = create((set, get) => ({
  score: 0,
  add: (n) => {
    // TODO
  },
  double: () => {
    // TODO
  },
}));

export default function App() {
  const score = useScoreStore((state) => state.score);
  const add = useScoreStore((state) => state.add);
  const double = useScoreStore((state) => state.double);

  return (
    <div>
      <h2>Score: {score}</h2>
      <button onClick={() => add(1)}>+1</button>{' '}
      <button onClick={() => add(10)}>+10</button>{' '}
      <button onClick={double}>x2</button>
    </div>
  );
}`,
      hint: 'add: set((state) => ({ score: state.score + n })). double: if (get().score >= 100) { console.log(...); return; } then set(...).',
      solution: `import { create } from 'zustand';

const useScoreStore = create((set, get) => ({
  score: 0,
  add: (n) => set((state) => ({ score: state.score + n })),
  double: () => {
    if (get().score >= 100) {
      console.log('too big to double');
      return;
    }
    set((state) => ({ score: state.score * 2 }));
  },
}));

export default function App() {
  const score = useScoreStore((state) => state.score);
  const add = useScoreStore((state) => state.add);
  const double = useScoreStore((state) => state.double);

  return (
    <div>
      <h2>Score: {score}</h2>
      <button onClick={() => add(1)}>+1</button>{' '}
      <button onClick={() => add(10)}>+10</button>{' '}
      <button onClick={double}>x2</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── set-merge
  {
    id: 'set-merge',
    section: 'Getting started',
    title: 'How set() merges',
    explain: `
      <p>When you call <code>set(partial)</code>, Zustand does roughly this:</p>
      <pre><code>newState = Object.assign({}, oldState, partial);</code></pre>
      <p>So the fields you pass <strong>replace</strong> those keys, and every other top-level
      key is copied over unchanged. That's why you can write <code>set({ bears: 0 })</code>
      without losing your actions or other fields.</p>

      <h3>Only one level deep</h3>
      <p>The merge is <strong>shallow</strong>. If a key holds an object, the new object
      replaces the old one completely. Zustand does not merge inside it:</p>
      <pre><code>// state: { user: { name: 'Ana', age: 30 } }
set({ user: { name: 'Ben' } });
// state: { user: { name: 'Ben' } }      ← age is gone!</code></pre>
      <p>To change one nested field, copy the rest yourself with spread:</p>
      <pre><code>set((state) =&gt; ({ user: { ...state.user, name: 'Ben' } }));</code></pre>

      <h3>The replace flag: <code>set(state, true)</code></h3>
      <p>A second argument <code>true</code> turns merging off: the store becomes
      <em>exactly</em> the object you pass. Everything not in it disappears, including your
      <strong>actions</strong>, because actions are just keys in the state object.</p>
      <pre><code>set({ count: 0 }, true);   // state is now ONLY { count: 0 }</code></pre>

      <div class="warn">Using <code>replace</code> to "reset" a store is a classic bug: the
      actions vanish and the next click throws <code>increment is not a function</code>. For a
      full reset use the initial state, which still contains the actions:
      <code>useStore.setState(useStore.getInitialState(), true)</code>. Or skip
      <code>replace</code> and just merge the data fields back.</div>

      <div class="tip">Analogy: <code>set(partial)</code> is editing a few cells in a spreadsheet
      row. <code>set(obj, true)</code> is deleting the row and typing a new one.</div>
    `,
    examples: [
      {
        title: 'Top-level merge vs nested objects',
        code: `import { create } from 'zustand';

const useProfileStore = create((set) => ({
  user: { name: 'Ana', age: 30 },
  theme: 'dark',
  setTheme: () => set({ theme: 'light' }),
  renameBad: () => set({ user: { name: 'Ben' } }),
  renameGood: () => set((state) => ({ user: { ...state.user, name: 'Ben' } })),
  reset: () => set({ user: { name: 'Ana', age: 30 }, theme: 'dark' }),
}));

function logState(label) {
  const { user, theme } = useProfileStore.getState();
  console.log(label, '->', JSON.stringify({ user, theme }));
}

export default function App() {
  const user = useProfileStore((state) => state.user);
  const theme = useProfileStore((state) => state.theme);
  const actions = useProfileStore.getState();

  const run = (name) => {
    actions[name]();
    logState(name);
  };

  return (
    <div>
      <p>
        user: <code>{JSON.stringify(user)}</code>
        <br />
        theme: <code>{theme}</code>
      </p>
      {['setTheme', 'renameBad', 'renameGood', 'reset'].map((name) => (
        <button key={name} onClick={() => run(name)} style={{ marginRight: 4 }}>
          {name}()
        </button>
      ))}
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: "I only changed the name, where did age go?"</summary>
            <p><code>set</code> merges <strong>top-level keys only</strong>. For the key
            <code>user</code>, the value you pass wins, whole. Zustand never looks inside it.
            <code>renameBad</code> passes <code>{ name: 'Ben' }</code>, so that object
            <em>becomes</em> <code>user</code>, and <code>age</code> is lost.</p>
          </details>
          <details>
            <summary>Step by step: click setTheme → renameBad → reset → renameGood</summary>
            <table>
              <tr><th>Click</th><th>Console</th><th>What happened</th></tr>
              <tr><td>setTheme()</td>
                <td><code>setTheme -&gt; {"user":{"name":"Ana","age":30},"theme":"light"}</code></td>
                <td>Only <code>theme</code> replaced; <code>user</code> copied over ✅</td></tr>
              <tr><td>renameBad()</td>
                <td><code>renameBad -&gt; {"user":{"name":"Ben"},"theme":"light"}</code></td>
                <td><code>user</code> replaced by <code>{ name: 'Ben' }</code>, age lost ❌</td></tr>
              <tr><td>reset()</td>
                <td><code>reset -&gt; {"user":{"name":"Ana","age":30},"theme":"dark"}</code></td>
                <td>Both keys set back (a merge, so actions stay)</td></tr>
              <tr><td>renameGood()</td>
                <td><code>renameGood -&gt; {"user":{"name":"Ben","age":30},"theme":"dark"}</code></td>
                <td>Spread copied <code>age</code> into the new user ✅</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>renameBad: () =&gt; set({ user: { name: 'Ben' } }),           // ①
renameGood: () =&gt;
  set((state) =&gt; ({ user: { ...state.user, name: 'Ben' } })), // ②
const actions = useProfileStore.getState();                  // ③</code></pre>
            <ol>
              <li><strong>①</strong> Top-level merge: <code>theme</code> and the actions are kept,
              but <code>user</code> is swapped for this brand-new object.</li>
              <li><strong>②</strong> Functional <code>set</code> gives you the current
              <code>user</code>; <code>...state.user</code> copies <code>name</code> and
              <code>age</code>, then <code>name: 'Ben'</code> overrides one field.</li>
              <li><strong>③</strong> Reading actions with <code>getState()</code> is fine here
              because actions never change. (It does not subscribe, so never read
              <em>data</em> this way in render.)</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'The replace flag wipes your actions',
        code: `import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  step: 1,
  increment: () => set((state) => ({ count: state.count + state.step })),
  setStep5: () => set({ step: 5 }),
  resetBad: () => set({ count: 0 }, true),
  resetGood: () => set({ count: 0, step: 1 }),
}));

function logKeys(label) {
  const keys = Object.keys(useCounterStore.getState()).join(', ');
  console.log(label + ' -> keys: ' + keys);
}

function ActionButton({ name }) {
  const fn = useCounterStore((state) => state[name]);
  const gone = typeof fn !== 'function';

  return (
    <button
      disabled={gone}
      onClick={() => {
        fn();
        logKeys(name);
      }}
      style={{ marginRight: 4 }}
    >
      {gone ? name + ' (gone!)' : name + '()'}
    </button>
  );
}

function restore() {
  useCounterStore.setState(useCounterStore.getInitialState(), true);
  logKeys('restore');
}

export default function App() {
  const count = useCounterStore((state) => state.count);
  const step = useCounterStore((state) => state.step);

  return (
    <div>
      <p>count: {count} | step: {String(step)}</p>
      <ActionButton name="increment" />
      <ActionButton name="setStep5" />
      <ActionButton name="resetGood" />
      <ActionButton name="resetBad" />
      <p>
        <button onClick={restore}>restore initial state</button>
      </p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: replace means replace <em>everything</em></summary>
            <p>Actions are not special in Zustand: they are just keys on the same state object
            as <code>count</code>. <code>set({ count: 0 }, true)</code> says "the new state is
            exactly <code>{ count: 0 }</code>", so <code>step</code>, <code>increment</code>,
            <code>setStep5</code>, and even <code>resetBad</code> itself disappear.</p>
          </details>
          <details>
            <summary>Step by step: increment → setStep5 → resetBad → restore</summary>
            <table>
              <tr><th>Click</th><th>Screen</th><th>Console</th></tr>
              <tr><td>increment()</td><td>count: 1 | step: 1</td>
                <td><code>increment -&gt; keys: count, step, increment, setStep5, resetBad, resetGood</code></td></tr>
              <tr><td>setStep5()</td><td>count: 1 | step: 5</td>
                <td><code>setStep5 -&gt; keys: count, step, increment, setStep5, resetBad, resetGood</code></td></tr>
              <tr><td>resetBad()</td><td>count: 0 | step: undefined, all four buttons "(gone!)"</td>
                <td><code>resetBad -&gt; keys: count</code></td></tr>
              <tr><td>restore initial state</td><td>count: 0 | step: 1, buttons back</td>
                <td><code>restore -&gt; keys: count, step, increment, setStep5, resetBad, resetGood</code></td></tr>
            </table>
            <p>Try <code>resetGood()</code> instead of <code>resetBad()</code> after
            setStep5: count and step go back to 0 and 1, and all keys stay.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>resetBad: () =&gt; set({ count: 0 }, true),       // ①
resetGood: () =&gt; set({ count: 0, step: 1 }),   // ②
useCounterStore.setState(
  useCounterStore.getInitialState(), true      // ③
);</code></pre>
            <ol>
              <li><strong>①</strong> <code>true</code> = replace. The store is now only
              <code>{ count: 0 }</code>.</li>
              <li><strong>②</strong> A normal merge that lists every data field. Actions
              survive. This is the simplest safe reset.</li>
              <li><strong>③</strong> <code>getInitialState()</code> (v5) returns the object your
              initializer first returned, actions included, so replacing with it is a
              complete, safe reset.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">In a real app there is no <code>disabled</code> guard. After a bad
            replace, the next click crashes with
            <code>TypeError: increment is not a function</code>. If you reach for
            <code>set(x, true)</code>, make sure <code>x</code> contains the actions too.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'State is <code>{ a: 1, b: 2 }</code>. After <code>set({ b: 3 })</code> it is…',
        options: ['{ b: 3 }', '{ a: 1, b: 3 }', '{ a: 1, b: 2, b: 3 }', 'unchanged'],
        answer: 1,
        why: 'set shallow-merges: new keys override, other top-level keys are kept.',
      },
      {
        q: 'State is <code>{ user: { name: "Ana", age: 30 } }</code>. After <code>set({ user: { age: 31 } })</code>, what is <code>user</code>?',
        options: ['{ name: "Ana", age: 31 }', '{ age: 31 }', '{ name: "Ana", age: 30 }', 'undefined'],
        answer: 1,
        why: 'The merge is one level deep. The new <code>user</code> object replaces the old one entirely.',
      },
      {
        q: 'What does <code>set({ count: 0 }, true)</code> do to a store that also has <code>increment</code>?',
        options: [
          'Resets count and keeps increment',
          'Replaces the whole state with { count: 0 }, so increment is removed',
          'Throws an error',
          'Merges deeply',
        ],
        answer: 1,
        why: 'The second argument is <code>replace</code>. Actions are part of the state object, so they are dropped too.',
      },
      {
        q: 'Which is a safe way to fully reset a store in v5?',
        options: [
          'set({}, true)',
          'useStore.setState(useStore.getInitialState(), true)',
          'set(null)',
          'useStore.reset()',
        ],
        answer: 1,
        why: '<code>getInitialState()</code> returns the original state including actions.',
      },
    ],
    exercise: {
      task: `<p>The settings store has a nested <code>prefs</code> object. The two toggle actions
      are buggy: toggling sound wipes <code>fontSize</code> and <code>darkMode</code>.</p>
      <p>Fix <code>toggleSound</code> and <code>toggleDark</code> so they change one field and
      keep the others (spread <code>state.prefs</code>).</p>`,
      starter: `import { create } from 'zustand';

const useSettingsStore = create((set) => ({
  prefs: { sound: true, darkMode: false, fontSize: 16 },
  toggleSound: () => set((state) => ({ prefs: { sound: !state.prefs.sound } })),
  toggleDark: () => set((state) => ({ prefs: { darkMode: !state.prefs.darkMode } })),
}));

export default function App() {
  const prefs = useSettingsStore((state) => state.prefs);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const toggleDark = useSettingsStore((state) => state.toggleDark);

  return (
    <div>
      <p><code>{JSON.stringify(prefs)}</code></p>
      <button onClick={toggleSound}>Toggle sound</button>{' '}
      <button onClick={toggleDark}>Toggle dark mode</button>
    </div>
  );
}`,
      hint: 'prefs: { ...state.prefs, sound: !state.prefs.sound }',
      solution: `import { create } from 'zustand';

const useSettingsStore = create((set) => ({
  prefs: { sound: true, darkMode: false, fontSize: 16 },
  toggleSound: () =>
    set((state) => ({ prefs: { ...state.prefs, sound: !state.prefs.sound } })),
  toggleDark: () =>
    set((state) => ({ prefs: { ...state.prefs, darkMode: !state.prefs.darkMode } })),
}));

export default function App() {
  const prefs = useSettingsStore((state) => state.prefs);
  const toggleSound = useSettingsStore((state) => state.toggleSound);
  const toggleDark = useSettingsStore((state) => state.toggleDark);

  return (
    <div>
      <p><code>{JSON.stringify(prefs)}</code></p>
      <button onClick={toggleSound}>Toggle sound</button>{' '}
      <button onClick={toggleDark}>Toggle dark mode</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── immutable-updates
  {
    id: 'immutable-updates',
    section: 'Getting started',
    title: 'Updating nested state & arrays immutably',
    explain: `
      <p>Zustand decides "did this change?" with <code>Object.is</code>, which compares
      <strong>references</strong> for objects and arrays. If you mutate an object in place,
      its reference stays the same, so every selector that returns it says "no change" and
      <strong>nothing re-renders</strong>. The data changed, the screen did not.</p>

      <p>Analogy: you rewrote a page inside a book but kept the same cover. Zustand only looks
      at the cover.</p>

      <h3>Rule: make a new object for every level you change</h3>
      <pre><code>// nested object: copy each level on the path to the change
set((state) =&gt; ({
  profile: {
    ...state.profile,
    address: { ...state.profile.address, city: 'Sydney' },
  },
}));</code></pre>

      <h3>Array cheat sheet</h3>
      <table>
        <tr><th>Goal</th><th>❌ Mutates</th><th>✅ Returns a new array</th></tr>
        <tr><td>add</td><td><code>push</code>, <code>unshift</code></td>
          <td><code>[...list, item]</code></td></tr>
        <tr><td>remove</td><td><code>splice</code></td>
          <td><code>list.filter((x) =&gt; x.id !== id)</code></td></tr>
        <tr><td>update one</td><td><code>list[i].done = true</code></td>
          <td><code>list.map((x) =&gt; x.id === id ? { ...x, done: true } : x)</code></td></tr>
        <tr><td>sort</td><td><code>sort</code>, <code>reverse</code></td>
          <td><code>list.toSorted()</code> or <code>[...list].sort()</code></td></tr>
      </table>

      <div class="tip">Deep spreads get noisy. Later you will meet the <code>immer</code>
      middleware, which lets you write <code>state.profile.address.city = 'Sydney'</code> and
      turns it into an immutable update for you.</div>
      <div class="warn">A mutation is often hidden, not obviously broken: the screen catches up
      later when some <em>other</em> update creates a new reference. These bugs are confusing,
      so always copy.</div>
    `,
    examples: [
      {
        title: 'Nested object: mutate vs spread',
        code: `import { create } from 'zustand';

const useProfileStore = create((set) => ({
  profile: { name: 'Ana', address: { city: 'Bangkok', zip: '10110' } },

  moveBad: () =>
    set((state) => {
      state.profile.address.city = 'Sydney'; // mutates in place!
      console.log('moveBad: city is now', state.profile.address.city);
      return { profile: state.profile }; // same reference
    }),

  moveGood: () =>
    set((state) => ({
      profile: {
        ...state.profile,
        address: { ...state.profile.address, city: 'Sydney' },
      },
    })),

  renameGood: () =>
    set((state) => ({ profile: { ...state.profile, name: 'Ben' } })),
}));

function ProfileCard() {
  const profile = useProfileStore((state) => state.profile);
  console.log('render <ProfileCard>');
  return (
    <p>
      {profile.name} lives in {profile.address.city}
    </p>
  );
}

function Controls() {
  const moveBad = useProfileStore((state) => state.moveBad);
  const moveGood = useProfileStore((state) => state.moveGood);
  const renameGood = useProfileStore((state) => state.renameGood);

  return (
    <div>
      <button onClick={moveBad}>Move (mutate)</button>{' '}
      <button onClick={moveGood}>Move (spread)</button>{' '}
      <button onClick={renameGood}>Rename (spread)</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <ProfileCard />
      <Controls />
      <p style={{ color: 'gray' }}>Press ▶ Run to start over.</p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: the data changed but the screen didn't</summary>
            <p><code>ProfileCard</code> selects <code>state.profile</code>. After
            <code>moveBad</code>, the store's profile <em>is</em> the same object it was before
            (just edited inside), so <code>Object.is(oldProfile, newProfile)</code> is
            <code>true</code> and Zustand skips the re-render.</p>
          </details>
          <details>
            <summary>Step by step: Move (mutate) → Rename (spread)</summary>
            <table>
              <tr><th>Click</th><th>Profile reference</th><th>Screen</th><th>Console</th></tr>
              <tr><td>First render</td><td>P1</td><td>Ana lives in Bangkok</td>
                <td><code>render &lt;ProfileCard&gt;</code></td></tr>
              <tr><td>Move (mutate)</td><td>still P1 (city edited inside)</td>
                <td><strong>Ana lives in Bangkok</strong> (stale ❌)</td>
                <td><code>moveBad: city is now Sydney</code> and no render</td></tr>
              <tr><td>Rename (spread)</td><td>P2 = <code>{ ...P1, name: 'Ben' }</code></td>
                <td>Ben lives in Sydney</td>
                <td><code>render &lt;ProfileCard&gt;</code></td></tr>
            </table>
            <p>"Sydney" shows up only when an <em>unrelated</em> update happens: P2 copies the
            already-mutated address. Run again and use <strong>Move (spread)</strong> instead:
            it logs <code>render &lt;ProfileCard&gt;</code> right away and shows Sydney.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>set((state) =&gt; ({
  profile: {                                   // ① new outer object
    ...state.profile,                          // ② copy name
    address: {                                 // ③ new inner object
      ...state.profile.address,                // ④ copy zip
      city: 'Sydney',                          // ⑤ the actual change
    },
  },
}));</code></pre>
            <ol>
              <li><strong>①</strong> The selector returns <code>state.profile</code>, so this
              must be a new object for the card to re-render.</li>
              <li><strong>②</strong> Without this spread, <code>name</code> would be lost
              (set only merges one level).</li>
              <li><strong>③④</strong> Same idea one level deeper: new address, other fields
              copied.</li>
              <li><strong>⑤</strong> Only then override the one field you are changing.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Arrays: add, toggle, remove, and the push bug',
        code: `import { create } from 'zustand';

let nextId = 3;

const useTodoStore = create((set, get) => ({
  todos: [
    { id: 1, text: 'Learn create()', done: true },
    { id: 2, text: 'Learn set()', done: false },
  ],

  add: () => {
    const id = nextId++;
    set((state) => ({
      todos: [...state.todos, { id, text: 'Todo #' + id, done: false }],
    }));
  },

  addBad: () => {
    const id = nextId++;
    const todos = get().todos;
    todos.push({ id, text: 'Pushed #' + id, done: false }); // mutates!
    set({ todos }); // same array reference
    console.log('addBad: pushed, length is now', todos.length);
  },

  toggle: (id) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),

  remove: (id) =>
    set((state) => ({ todos: state.todos.filter((t) => t.id !== id) })),
}));

function TodoList() {
  const todos = useTodoStore((state) => state.todos);
  const toggle = useTodoStore((state) => state.toggle);
  const remove = useTodoStore((state) => state.remove);
  console.log('render <TodoList> with ' + todos.length + ' todos');

  return (
    <ul>
      {todos.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            {t.text}
          </label>{' '}
          <button onClick={() => remove(t.id)}>×</button>
        </li>
      ))}
    </ul>
  );
}

function Controls() {
  const add = useTodoStore((state) => state.add);
  const addBad = useTodoStore((state) => state.addBad);
  return (
    <div>
      <button onClick={add}>Add (spread)</button>{' '}
      <button onClick={addBad}>Add (push)</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Controls />
      <TodoList />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: Add (push) → toggle "Learn set()" → Add (spread)</summary>
            <table>
              <tr><th>Click</th><th>Array</th><th>Screen</th><th>Console</th></tr>
              <tr><td>First render</td><td>A1 (2 items)</td><td>2 todos</td>
                <td><code>render &lt;TodoList&gt; with 2 todos</code></td></tr>
              <tr><td>Add (push)</td><td>still A1, now 3 items</td>
                <td>still 2 todos ❌</td>
                <td><code>addBad: pushed, length is now 3</code> and no render</td></tr>
              <tr><td>Toggle "Learn set()"</td><td>A2 = <code>A1.map(...)</code></td>
                <td>3 todos: "Pushed #3" suddenly appears</td>
                <td><code>render &lt;TodoList&gt; with 3 todos</code></td></tr>
              <tr><td>Add (spread)</td><td>A3 = <code>[...A2, new]</code></td>
                <td>4 todos, "Todo #4"</td>
                <td><code>render &lt;TodoList&gt; with 4 todos</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>todos.push(item); set({ todos });                        // ①
todos: [...state.todos, item]                            // ②
todos: state.todos.map((t) =&gt;
  t.id === id ? { ...t, done: !t.done } : t)             // ③
todos: state.todos.filter((t) =&gt; t.id !== id)            // ④</code></pre>
            <ol>
              <li><strong>①</strong> <code>set</code> does run and the store object is new, but
              the <code>todos</code> key still points to the <em>same</em> array. The selector
              <code>(state) =&gt; state.todos</code> returns an equal reference, so no
              re-render.</li>
              <li><strong>②</strong> Spread makes a new array with the new item at the end.</li>
              <li><strong>③</strong> <code>map</code> returns a new array. The changed todo is a
              new object too; the others keep their references.</li>
              <li><strong>④</strong> <code>filter</code> returns a new array without the item.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn">Toggling with <code>t.done = !t.done</code> inside
            <code>map</code> mutates the todo object. The array is new so the list re-renders,
            but memoized rows (<code>React.memo</code>) that received the same object will not.
            Always copy the item: <code>{ ...t, done: !t.done }</code>.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'You run <code>state.items.push(x); set({ items: state.items })</code>. A component uses <code>(s) =&gt; s.items</code>. What happens?',
        options: [
          'It re-renders with the new item',
          'It does not re-render: the array reference is the same',
          'Zustand throws an error',
          'The item is removed',
        ],
        answer: 1,
        why: 'Object.is compares references. The same array means "no change" for that selector.',
      },
      {
        q: 'Which update toggles todo 2 immutably?',
        options: [
          'state.todos[1].done = true',
          'todos: state.todos.map((t) => t.id === 2 ? { ...t, done: !t.done } : t)',
          'todos: state.todos.splice(1, 1)',
          'todos: state.todos.sort()',
        ],
        answer: 1,
        why: '<code>map</code> returns a new array and the spread creates a new todo object.',
      },
      {
        q: 'To change <code>state.a.b.c</code>, how many new objects must you create?',
        options: ['None', 'Only c', 'One for a and one for b (every level on the path)', 'One for the whole state'],
        answer: 2,
        why: 'Every object on the path to the change needs a new reference: <code>{ a: { ...a, b: { ...b, c } } }</code>. Zustand handles the top-level state object.',
      },
    ],
    exercise: {
      task: `<p>Implement two actions immutably:</p>
      <ul>
        <li><code>rename(id, text)</code>: change the text of one todo (use <code>map</code>).</li>
        <li><code>clearDone()</code>: remove all done todos (use <code>filter</code>).</li>
      </ul>
      <p>"Shout" should uppercase a todo's text; "Clear done" should remove checked items.</p>`,
      starter: `import { create } from 'zustand';

const useTodoStore = create((set) => ({
  todos: [
    { id: 1, text: 'buy milk', done: true },
    { id: 2, text: 'walk dog', done: false },
    { id: 3, text: 'read book', done: true },
  ],
  rename: (id, text) => {
    // TODO
  },
  clearDone: () => {
    // TODO
  },
}));

export default function App() {
  const todos = useTodoStore((state) => state.todos);
  const rename = useTodoStore((state) => state.rename);
  const clearDone = useTodoStore((state) => state.clearDone);

  return (
    <div>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.done ? '✔ ' : ''}
            {t.text}{' '}
            <button onClick={() => rename(t.id, t.text.toUpperCase())}>Shout</button>
          </li>
        ))}
      </ul>
      <button onClick={clearDone}>Clear done</button>
    </div>
  );
}`,
      hint: 'rename: set((state) => ({ todos: state.todos.map((t) => (t.id === id ? { ...t, text } : t)) }))',
      solution: `import { create } from 'zustand';

const useTodoStore = create((set) => ({
  todos: [
    { id: 1, text: 'buy milk', done: true },
    { id: 2, text: 'walk dog', done: false },
    { id: 3, text: 'read book', done: true },
  ],
  rename: (id, text) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, text } : t)),
    })),
  clearDone: () =>
    set((state) => ({ todos: state.todos.filter((t) => !t.done) })),
}));

export default function App() {
  const todos = useTodoStore((state) => state.todos);
  const rename = useTodoStore((state) => state.rename);
  const clearDone = useTodoStore((state) => state.clearDone);

  return (
    <div>
      <ul>
        {todos.map((t) => (
          <li key={t.id}>
            {t.done ? '✔ ' : ''}
            {t.text}{' '}
            <button onClick={() => rename(t.id, t.text.toUpperCase())}>Shout</button>
          </li>
        ))}
      </ul>
      <button onClick={clearDone}>Clear done</button>
    </div>
  );
}`,
    },
  },
);
