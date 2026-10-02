window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── useLayoutEffect ─────────────────────────────
  {
    id: 'uselayouteffect',
    section: 'Advanced Hooks',
    title: 'useLayoutEffect',
    explain: `
      <p><code>useLayoutEffect</code> is a version of <code>useEffect</code> that runs <strong>after React updates the DOM but before the browser paints</strong> the screen. The signature is identical:</p>
      <pre><code>useLayoutEffect(() =&gt; {
  // read layout (sizes, positions) and maybe setState
  return () =&gt; { /* cleanup */ };
}, [deps]);</code></pre>
      <h3>Timeline of one update</h3>
      <ul>
        <li>1. React renders your components (calls the functions).</li>
        <li>2. React commits changes to the DOM.</li>
        <li>3. <strong><code>useLayoutEffect</code> runs</strong> (synchronously). If it calls <code>setState</code>, React re-renders <em>before</em> painting.</li>
        <li>4. The browser paints pixels.</li>
        <li>5. <code>useEffect</code> runs (usually after paint).</li>
      </ul>
      <p>Analogy: <code>useEffect</code> is rearranging furniture after guests arrive; <code>useLayoutEffect</code> is rearranging it while the door is still closed. Guests never see the messy version.</p>
      <h3>When to use it</h3>
      <p>Only when you must <strong>measure the DOM</strong> and adjust something before the user sees it — e.g. positioning a tooltip based on its own height, or scrolling to a position without a visible jump. With <code>useEffect</code> the user could see a one-frame "flicker" of the wrong position.</p>
      <div class="warn"><strong>Pitfall:</strong> <code>useLayoutEffect</code> blocks painting. Heavy work in it makes your app feel slow. Default to <code>useEffect</code>; switch only when you see flicker.</div>
      <div class="tip">On the server (SSR), layout effects don't run, since there is no layout. That's another reason to prefer <code>useEffect</code> unless you truly need measurements.</div>
    `,
    examples: [
      {
        title: 'Order: layout effect vs effect',
        code: `import { useState, useEffect, useLayoutEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  console.log('1. render', count);

  useLayoutEffect(() => {
    console.log('2. useLayoutEffect (before paint)', count);
  }, [count]);

  useEffect(() => {
    console.log('3. useEffect (after paint)', count);
  }, [count]);

  return <button onClick={() => setCount(c => c + 1)}>Count: {count}</button>;
}`,
      },
      {
        title: 'Measure a tooltip before paint',
        code: `import { useState, useRef, useLayoutEffect } from 'react';

function Tooltip({ text, anchorTop }) {
  const ref = useRef(null);
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    // Measure real height, then position ABOVE the anchor.
    const h = ref.current.getBoundingClientRect().height;
    console.log('measured tooltip height:', h);
    setHeight(h);
  }, [text]);

  return (
    <div
      ref={ref}
      style={{
        position: 'absolute',
        top: anchorTop - height - 8,
        left: 10,
        background: '#222',
        color: 'white',
        padding: '6px 10px',
        borderRadius: 6,
        maxWidth: 200,
      }}
    >
      {text}
    </div>
  );
}

export default function App() {
  const [long, setLong] = useState(false);
  const text = long
    ? 'This is a much longer tooltip that wraps onto several lines, so its height changes.'
    : 'Short tip';
  return (
    <div style={{ position: 'relative', height: 220 }}>
      <Tooltip text={text} anchorTop={160} />
      <button style={{ position: 'absolute', top: 160, left: 10 }} onClick={() => setLong(l => !l)}>
        Toggle tooltip text
      </button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'When does <code>useLayoutEffect</code> run?', options: ['Before React renders', 'After DOM updates, before the browser paints', 'After the browser paints', 'Only on the server'], answer: 1, why: 'Layout effects fire synchronously after the DOM commit and before paint.' },
      { q: 'What is the main reason to choose <code>useLayoutEffect</code> over <code>useEffect</code>?', options: ['It is faster', 'To measure layout and update before the user sees a flicker', 'To fetch data', 'It runs fewer times'], answer: 1, why: 'Use it only when you need to read layout and adjust before paint.' },
      { q: 'What happens if you do heavy computation in <code>useLayoutEffect</code>?', options: ['Nothing, it runs in the background', 'The browser paint is delayed, so the UI feels slow', 'React throws an error', 'It gets moved to useEffect automatically'], answer: 1, why: 'It blocks painting until it finishes.' },
      { q: 'Given logs from render, useEffect and useLayoutEffect, which order appears?', options: ['effect, layout, render', 'render, effect, layout', 'render, layout, effect', 'layout, render, effect'], answer: 2, why: 'Render first, then layout effect (pre-paint), then effect.' },
    ],
    exercise: {
      task: `<p>Build a box whose width you can toggle between 100px and 250px. Under it, show the text <code>Width: N px</code> where N is measured from the DOM using a ref and <code>useLayoutEffect</code> (not hard-coded). Log the measured width to the console.</p>`,
      starter: `import { useState, useRef, useLayoutEffect } from 'react';

export default function App() {
  const [wide, setWide] = useState(false);
  const boxRef = useRef(null);
  const [measured, setMeasured] = useState(0);

  // TODO: measure boxRef.current width in useLayoutEffect

  return (
    <div>
      <div ref={boxRef} style={{ width: wide ? 250 : 100, height: 40, background: 'tomato' }} />
      <p>Width: {measured} px</p>
      <button onClick={() => setWide(w => !w)}>Toggle</button>
    </div>
  );
}`,
      hint: 'Inside useLayoutEffect, call boxRef.current.getBoundingClientRect().width and setMeasured with it. Put wide in the dependency array.',
      solution: `import { useState, useRef, useLayoutEffect } from 'react';

export default function App() {
  const [wide, setWide] = useState(false);
  const boxRef = useRef(null);
  const [measured, setMeasured] = useState(0);

  useLayoutEffect(() => {
    const w = boxRef.current.getBoundingClientRect().width;
    console.log('measured width', w);
    setMeasured(w);
  }, [wide]);

  return (
    <div>
      <div ref={boxRef} style={{ width: wide ? 250 : 100, height: 40, background: 'tomato' }} />
      <p>Width: {measured} px</p>
      <button onClick={() => setWide(w => !w)}>Toggle</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useId ─────────────────────────────
  {
    id: 'useid',
    section: 'Advanced Hooks',
    title: 'useId',
    explain: `
      <p><code>useId()</code> returns a <strong>unique, stable string ID</strong> for the component instance. It's mainly for accessibility attributes like <code>htmlFor</code>, <code>id</code>, <code>aria-describedby</code>.</p>
      <pre><code>function Field({ label }) {
  const id = useId();
  return (
    &lt;&gt;
      &lt;label htmlFor={id}&gt;{label}&lt;/label&gt;
      &lt;input id={id} /&gt;
    &lt;/&gt;
  );
}</code></pre>
      <h3>Why not hard-code IDs?</h3>
      <p>HTML IDs must be unique on the page. If you render <code>&lt;Field /&gt;</code> twice with <code>id="email"</code>, the second label points at the wrong input. <code>useId</code> gives every instance its own ID.</p>
      <h3>Why not <code>Math.random()</code> or a counter?</h3>
      <p>Random IDs change each render and differ between server and client HTML (hydration mismatch). <code>useId</code> is derived from the component's position in the tree, so it's the same on server and client, and stable across re-renders.</p>
      <div class="tip">Need several IDs in one component? Call <code>useId()</code> once and add suffixes: <code>id + '-name'</code>, <code>id + '-email'</code>.</div>
      <div class="warn"><strong>Pitfall:</strong> Do <strong>not</strong> use <code>useId</code> for list <code>key</code>s. Keys should come from your data.</div>
      <p>IDs look like <code>«r0»</code> or <code>_r_0_</code> (format may change) — treat them as opaque strings. In React 19.2 the format is <code>_r_…_</code> so it's valid in CSS selectors too.</p>
    `,
    examples: [
      {
        title: 'Reusable field with unique IDs',
        code: `import { useId } from 'react';

function Field({ label, type = 'text' }) {
  const id = useId();
  console.log(label, 'got id', id);
  return (
    <div style={{ marginBottom: 8 }}>
      <label htmlFor={id} style={{ display: 'block' }}>{label}</label>
      <input id={id} type={type} />
    </div>
  );
}

export default function App() {
  return (
    <form>
      <Field label="First name" />
      <Field label="Email" type="email" />
      <p style={{ fontSize: 13 }}>Click a label: focus jumps to the right input.</p>
    </form>
  );
}`,
      },
      {
        title: 'One id, many suffixes + aria-describedby',
        code: `import { useId } from 'react';

function PasswordField() {
  const id = useId();
  return (
    <div>
      <label htmlFor={id + '-input'}>Password</label>
      <input id={id + '-input'} type="password" aria-describedby={id + '-hint'} />
      <p id={id + '-hint'} style={{ fontSize: 12, color: '#666' }}>
        At least 8 characters.
      </p>
    </div>
  );
}

export default function App() {
  return (
    <>
      <PasswordField />
      <PasswordField />
    </>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What is <code>useId</code> mainly for?', options: ['List keys', 'Unique IDs for accessibility attributes', 'Database IDs', 'Generating random numbers'], answer: 1, why: 'It creates stable unique IDs to link labels, inputs, and ARIA attributes.' },
      { q: 'Why is <code>Math.random()</code> a bad ID source?', options: ['It is slow', 'It changes each render and mismatches between server and client', 'It returns numbers only', 'It is not allowed in JSX'], answer: 1, why: 'Random IDs are unstable and break hydration.' },
      { q: 'Should you use <code>useId</code> to generate list keys?', options: ['Yes, always', 'No, keys should come from your data', 'Only for long lists', 'Only in Strict Mode'], answer: 1, why: 'The React docs say explicitly not to use useId for keys.' },
      { q: 'A component needs IDs for 3 inputs. Best approach?', options: ['Call useId three times or once with suffixes — both work; suffixes are common', 'Use the same ID for all', 'Use array index', 'Use Date.now()'], answer: 0, why: 'One useId plus suffixes is idiomatic, and calling it multiple times is also fine.' },
    ],
    exercise: {
      task: `<p>Make a <code>Checkbox</code> component with a <code>label</code> prop. Clicking the label text must toggle the checkbox. Render three checkboxes (<em>Apples</em>, <em>Bananas</em>, <em>Cherries</em>) and make sure each label controls its own box.</p>`,
      starter: `import { useId } from 'react';

function Checkbox({ label }) {
  // TODO: use useId to connect label and input
  return (
    <div>
      <input type="checkbox" />
      <label>{label}</label>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Checkbox label="Apples" />
    </div>
  );
}`,
      hint: 'const id = useId(); then <input id={id} ... /> and <label htmlFor={id}>.',
      solution: `import { useId } from 'react';

function Checkbox({ label }) {
  const id = useId();
  return (
    <div>
      <input id={id} type="checkbox" />
      <label htmlFor={id}>{label}</label>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Checkbox label="Apples" />
      <Checkbox label="Bananas" />
      <Checkbox label="Cherries" />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useImperativeHandle ─────────────────────────────
  {
    id: 'useimperativehandle',
    section: 'Advanced Hooks',
    title: 'useImperativeHandle',
    explain: `
      <p>Sometimes a parent needs to <em>command</em> a child: "focus yourself", "scroll to top", "play". Refs let you do that. <code>useImperativeHandle</code> lets a child <strong>customize what the parent's ref receives</strong> — instead of the raw DOM node, you expose a small, deliberate API.</p>
      <h3>React 19: <code>ref</code> is a regular prop</h3>
      <p>In React 19, function components receive <code>ref</code> like any other prop. No <code>forwardRef</code> needed:</p>
      <pre><code>function FancyInput({ ref, ...props }) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () =&gt; ({
    focus() { inputRef.current.focus(); },
    clear() { inputRef.current.value = ''; },
  }), []);

  return &lt;input ref={inputRef} {...props} /&gt;;
}

// Parent
const fancyRef = useRef(null);
&lt;FancyInput ref={fancyRef} /&gt;
fancyRef.current.focus();</code></pre>
      <p>Arguments: <code>useImperativeHandle(ref, createHandle, deps?)</code>. The object returned by <code>createHandle</code> becomes <code>ref.current</code> in the parent. It's recreated when <code>deps</code> change.</p>
      <h3>Why expose a handle instead of the DOM node?</h3>
      <ul>
        <li><strong>Encapsulation:</strong> parent can only call what you allow (e.g. <code>focus</code>), not mess with styles.</li>
        <li><strong>Combining actions:</strong> one method can do several things (e.g. scroll + highlight).</li>
      </ul>
      <div class="warn"><strong>Pitfall:</strong> Don't overuse refs. If something can be expressed as a prop (<code>isOpen</code>, <code>value</code>), use a prop. Imperative handles are for actions that aren't state: focus, scroll, animations, media playback.</div>
      <div class="tip">Older code wraps components in <code>forwardRef((props, ref) =&gt; ...)</code>. That still works in 19 but is legacy — prefer <code>ref</code> as a prop.</div>
    `,
    examples: [
      {
        title: 'Expose focus() and clear()',
        code: `import { useRef, useImperativeHandle } from 'react';

function FancyInput({ ref, placeholder }) {
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    focus() {
      inputRef.current.focus();
    },
    clear() {
      inputRef.current.value = '';
      inputRef.current.focus();
    },
  }), []);

  return <input ref={inputRef} placeholder={placeholder} />;
}

export default function App() {
  const fancyRef = useRef(null);

  function logHandle() {
    // Only our methods exist — no .style, no .value
    console.log('handle keys:', Object.keys(fancyRef.current));
  }

  return (
    <div>
      <FancyInput ref={fancyRef} placeholder="Type something" />
      <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
        <button onClick={() => fancyRef.current.focus()}>Focus</button>
        <button onClick={() => fancyRef.current.clear()}>Clear</button>
        <button onClick={logHandle}>Log handle</button>
      </div>
    </div>
  );
}`,
      },
      {
        title: 'Scrollable list with scrollToBottom()',
        code: `import { useRef, useImperativeHandle, useState } from 'react';

function MessageList({ ref, messages }) {
  const boxRef = useRef(null);
  useImperativeHandle(ref, () => ({
    scrollToTop() { boxRef.current.scrollTop = 0; },
    scrollToBottom() { boxRef.current.scrollTop = boxRef.current.scrollHeight; },
  }), []);

  return (
    <div ref={boxRef} style={{ height: 120, overflowY: 'auto', border: '1px solid #ccc', padding: 6 }}>
      {messages.map((m, i) => <div key={i}>{m}</div>)}
    </div>
  );
}

export default function App() {
  const listRef = useRef(null);
  const [messages] = useState(() => Array.from({ length: 30 }, (_, i) => 'Message #' + (i + 1)));
  return (
    <div>
      <MessageList ref={listRef} messages={messages} />
      <button onClick={() => listRef.current.scrollToTop()}>Top</button>{' '}
      <button onClick={() => listRef.current.scrollToBottom()}>Bottom</button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'In React 19, how does a function component receive a ref?', options: ['Only via forwardRef', 'As a regular prop named ref', 'Through context', 'It cannot'], answer: 1, why: 'React 19 passes ref as a normal prop to function components.' },
      { q: 'What does the parent\'s <code>ref.current</code> become when a child uses <code>useImperativeHandle</code>?', options: ['The DOM node', 'The object returned by createHandle', 'undefined', 'The child\'s props'], answer: 1, why: 'The handle object replaces the default ref value.' },
      { q: 'Which is a good use for an imperative handle?', options: ['Controlling whether a modal is open', 'Focusing an input', 'Passing a list of items', 'Changing a theme color'], answer: 1, why: 'Focus is an action, not state. Open/closed, items, and theme should be props.' },
      { q: 'What is the status of <code>forwardRef</code> in React 19?', options: ['Removed', 'Required for all refs', 'Still works but legacy; ref as prop is preferred', 'Only for class components'], answer: 2, why: 'forwardRef still works but is no longer needed for function components.' },
    ],
    exercise: {
      task: `<p>Create a <code>Counter</code> child component that keeps its own count in state and exposes <code>increment()</code> and <code>reset()</code> through <code>useImperativeHandle</code>. The parent has two buttons, "+1 from parent" and "Reset from parent", that call those methods through a ref.</p>`,
      starter: `import { useRef, useState, useImperativeHandle } from 'react';

function Counter({ ref }) {
  const [count, setCount] = useState(0);
  // TODO: expose increment() and reset()
  return <p>Count: {count}</p>;
}

export default function App() {
  const counterRef = useRef(null);
  return (
    <div>
      <Counter ref={counterRef} />
      {/* TODO: buttons */}
    </div>
  );
}`,
      hint: 'useImperativeHandle(ref, () => ({ increment() { setCount(c => c + 1); }, reset() { setCount(0); } }), []);',
      solution: `import { useRef, useState, useImperativeHandle } from 'react';

function Counter({ ref }) {
  const [count, setCount] = useState(0);
  useImperativeHandle(ref, () => ({
    increment() { setCount(c => c + 1); },
    reset() { setCount(0); },
  }), []);
  return <p>Count: {count}</p>;
}

export default function App() {
  const counterRef = useRef(null);
  return (
    <div>
      <Counter ref={counterRef} />
      <button onClick={() => counterRef.current.increment()}>+1 from parent</button>{' '}
      <button onClick={() => counterRef.current.reset()}>Reset from parent</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useSyncExternalStore ─────────────────────────────
  {
    id: 'usesyncexternalstore',
    section: 'Advanced Hooks',
    title: 'useSyncExternalStore',
    explain: `
      <p>Most state lives in React (<code>useState</code>, <code>useReducer</code>). But some data lives <strong>outside</strong> React: browser APIs (window size, online status), third-party stores, a global variable. <code>useSyncExternalStore</code> lets a component <strong>subscribe</strong> to such a store safely.</p>
      <pre><code>const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot?);</code></pre>
      <ul>
        <li><code>subscribe(callback)</code> — start listening; call <code>callback</code> whenever the store changes; <strong>return an unsubscribe function</strong>.</li>
        <li><code>getSnapshot()</code> — return the current value. Must return the <strong>same value</strong> (same reference) if nothing changed.</li>
        <li><code>getServerSnapshot()</code> — optional, value used during server rendering/hydration.</li>
      </ul>
      <h3>Why not <code>useEffect</code> + <code>useState</code>?</h3>
      <p>That works, but with concurrent rendering, different parts of the UI could read the store at different moments and show inconsistent values ("tearing"). <code>useSyncExternalStore</code> guarantees every component sees the same snapshot. It's also less code.</p>
      <div class="warn"><strong>Pitfall 1:</strong> <code>getSnapshot</code> must not return a new object each call (e.g. <code>return { width, height }</code>). React compares with <code>Object.is</code> and will think it changed every time → infinite re-render error. Return primitives, or cache the object.</div>
      <div class="warn"><strong>Pitfall 2:</strong> Define <code>subscribe</code> <strong>outside</strong> the component (or memoize it). A new function each render makes React resubscribe every render.</div>
      <div class="tip">Wrap it in a custom hook like <code>useOnlineStatus()</code> or <code>useWindowWidth()</code> so components don't care where data comes from.</div>
    `,
    examples: [
      {
        title: 'Window width',
        code: `import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getSnapshot() {
  return window.innerWidth; // primitive: safe
}

function useWindowWidth() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

export default function App() {
  const width = useWindowWidth();
  console.log('render with width', width);
  return (
    <div>
      <h2>Window width: {width}px</h2>
      <p>Resize the preview pane / browser window to see it update.</p>
    </div>
  );
}`,
      },
      {
        title: 'Online status',
        code: `import { useSyncExternalStore } from 'react';

function subscribe(callback) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function useOnlineStatus() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true // server snapshot
  );
}

export default function App() {
  const online = useOnlineStatus();
  return (
    <h2 style={{ color: online ? 'green' : 'crimson' }}>
      {online ? '✅ Online' : '❌ Offline'}
    </h2>
  );
}`,
      },
      {
        title: 'A tiny global store shared by two components',
        code: `import { useSyncExternalStore } from 'react';

// --- a minimal store, living outside React ---
function createStore(initial) {
  let state = initial;
  const listeners = new Set();
  return {
    getState: () => state,
    setState(updater) {
      state = typeof updater === 'function' ? updater(state) : updater;
      listeners.forEach(l => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

const counterStore = createStore({ count: 0 });

function useCounter() {
  // getState returns the SAME object until setState replaces it
  return useSyncExternalStore(counterStore.subscribe, counterStore.getState);
}

function Display() {
  const { count } = useCounter();
  console.log('Display render', count);
  return <h2>Count: {count}</h2>;
}

function Controls() {
  return (
    <div>
      <button onClick={() => counterStore.setState(s => ({ count: s.count + 1 }))}>+1</button>{' '}
      <button onClick={() => counterStore.setState({ count: 0 })}>Reset</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Display />
      <Display />
      <Controls />
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What must <code>subscribe</code> return?', options: ['The current value', 'An unsubscribe function', 'A promise', 'Nothing'], answer: 1, why: 'React calls the returned function to clean up the subscription.' },
      { q: 'Why is <code>getSnapshot: () =&gt; ({ w: innerWidth })</code> a bug?', options: ['Objects are not allowed', 'It returns a new object every call, so React thinks the store always changed', 'innerWidth is undefined', 'It is too slow'], answer: 1, why: 'React compares snapshots with Object.is; new objects are never equal, causing infinite re-renders.' },
      { q: 'What problem does this hook solve compared to useEffect + useState?', options: ['Styling', 'Tearing: inconsistent values across components during concurrent rendering', 'Routing', 'Memory leaks in class components'], answer: 1, why: 'It keeps all readers consistent with a single snapshot.' },
      { q: 'Where should <code>subscribe</code> ideally be defined?', options: ['Inside the component body, recreated each render', 'Outside the component (or memoized)', 'Inside JSX', 'In a useEffect'], answer: 1, why: 'A new subscribe function each render causes resubscribing every render.' },
    ],
    exercise: {
      task: `<p>Create a tiny store for a <strong>theme</strong> (<code>'light'</code> or <code>'dark'</code>) outside React. Write a <code>useTheme()</code> hook using <code>useSyncExternalStore</code>. Render a <code>Panel</code> that shows the theme with matching background, and a <code>ToggleButton</code> (a separate component) that flips the theme via the store.</p>`,
      starter: `import { useSyncExternalStore } from 'react';

let theme = 'light';
const listeners = new Set();

function setTheme(next) {
  theme = next;
  // TODO: notify listeners
}

function subscribe(listener) {
  // TODO
  return () => {};
}

function useTheme() {
  // TODO: useSyncExternalStore
  return 'light';
}

function Panel() {
  const t = useTheme();
  return <div style={{ padding: 20 }}>Theme: {t}</div>;
}

export default function App() {
  return <Panel />;
}`,
      hint: 'subscribe: listeners.add(listener); return () => listeners.delete(listener). setTheme: listeners.forEach(l => l()). useTheme: useSyncExternalStore(subscribe, () => theme).',
      solution: `import { useSyncExternalStore } from 'react';

let theme = 'light';
const listeners = new Set();

function setTheme(next) {
  theme = next;
  listeners.forEach(l => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return theme;
}

function useTheme() {
  return useSyncExternalStore(subscribe, getSnapshot);
}

function Panel() {
  const t = useTheme();
  return (
    <div style={{ padding: 20, background: t === 'dark' ? '#222' : '#f4f4f4', color: t === 'dark' ? 'white' : 'black' }}>
      Theme: {t}
    </div>
  );
}

function ToggleButton() {
  const t = useTheme();
  return <button onClick={() => setTheme(t === 'dark' ? 'light' : 'dark')}>Toggle theme</button>;
}

export default function App() {
  return (
    <div>
      <Panel />
      <ToggleButton />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useInsertionEffect ─────────────────────────────
  {
    id: 'useinsertioneffect',
    section: 'Advanced Hooks',
    title: 'useInsertionEffect',
    explain: `
      <p><code>useInsertionEffect</code> is a special-purpose hook for <strong>authors of CSS-in-JS libraries</strong> (like styled-components or Emotion). It lets you insert <code>&lt;style&gt;</code> tags into the document <strong>before any layout effects run</strong>.</p>
      <pre><code>useInsertionEffect(() =&gt; {
  // inject &lt;style&gt; rules here
  return () =&gt; { /* optional cleanup */ };
}, [deps]);</code></pre>
      <h3>Effect timing</h3>
      <ul>
        <li><code>useInsertionEffect</code> → fires first, before layout effects</li>
        <li><code>useLayoutEffect</code> → can now measure elements <em>with</em> the correct styles</li>
        <li><code>useEffect</code> → after paint</li>
      </ul>
      <p>Why it matters: if styles were injected in a layout effect, another component's layout effect might measure an element <em>before</em> its styles exist, giving wrong sizes. Inserting styles earlier avoids that and avoids expensive style recalculations.</p>
      <div class="warn"><strong>Limits:</strong> inside <code>useInsertionEffect</code> you <strong>cannot update state</strong>, and refs aren't attached yet. It only runs on the client.</div>
      <div class="tip">You will almost never write this in app code. Learn it so you recognize it in library source and know which effect runs first.</div>
    `,
    examples: [
      {
        title: 'Effect order: insertion → layout → effect',
        code: `import { useEffect, useLayoutEffect, useInsertionEffect } from 'react';

export default function App() {
  useEffect(() => console.log('3. useEffect'));
  useLayoutEffect(() => console.log('2. useLayoutEffect'));
  useInsertionEffect(() => console.log('1. useInsertionEffect'));
  return <p>Check the console: insertion effect fires first, even though it is declared last.</p>;
}`,
      },
      {
        title: 'Mini CSS-in-JS hook',
        code: `import { useState, useInsertionEffect } from 'react';

const inserted = new Set();

function useCss(className, rule) {
  useInsertionEffect(() => {
    if (inserted.has(className)) return;
    inserted.add(className);
    const style = document.createElement('style');
    style.textContent = '.' + className + ' { ' + rule + ' }';
    document.head.appendChild(style);
    console.log('injected style for', className);
  }, [className, rule]);
  return className;
}

function Badge({ color, children }) {
  const cls = useCss('badge-' + color, 'background:' + color + ';color:white;padding:4px 10px;border-radius:999px;margin-right:6px;');
  return <span className={cls}>{children}</span>;
}

export default function App() {
  const [showMore, setShowMore] = useState(false);
  return (
    <div>
      <Badge color="teal">New</Badge>
      <Badge color="teal">Hot</Badge>
      {showMore && <Badge color="purple">Sale</Badge>}
      <p><button onClick={() => setShowMore(s => !s)}>Toggle purple badge</button></p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Who is <code>useInsertionEffect</code> designed for?', options: ['Every app component', 'CSS-in-JS library authors', 'Data fetching', 'Server Components'], answer: 1, why: 'It is intended for injecting styles in CSS-in-JS libraries.' },
      { q: 'Which effect fires first?', options: ['useEffect', 'useLayoutEffect', 'useInsertionEffect', 'They run in declaration order'], answer: 2, why: 'Insertion effects run before layout effects, which run before regular effects.' },
      { q: 'What can\'t you do inside <code>useInsertionEffect</code>?', options: ['Create DOM elements', 'Update state', 'Read variables', 'Return a cleanup'], answer: 1, why: 'State updates are not allowed, and refs are not attached yet.' },
    ],
    exercise: {
      task: `<p>Write a <code>useGlobalStyle(css)</code> hook that uses <code>useInsertionEffect</code> to append a <code>&lt;style&gt;</code> tag with the given CSS text, and removes it in the cleanup. Use it in a <code>Highlighter</code> component that makes all <code>.hl</code> elements yellow. Add a button to mount/unmount <code>Highlighter</code> and watch the highlight turn on/off.</p>`,
      starter: `import { useState, useInsertionEffect } from 'react';

function useGlobalStyle(css) {
  // TODO: insert <style> in useInsertionEffect, remove it on cleanup
}

function Highlighter() {
  useGlobalStyle('.hl { background: yellow; }');
  return <p>Highlighter is mounted</p>;
}

export default function App() {
  const [on, setOn] = useState(false);
  return (
    <div>
      <p>Some <span className="hl">important</span> text.</p>
      <button onClick={() => setOn(o => !o)}>Toggle highlighter</button>
      {on && <Highlighter />}
    </div>
  );
}`,
      hint: 'Create a style element, set textContent = css, document.head.appendChild(style); return () => style.remove();',
      solution: `import { useState, useInsertionEffect } from 'react';

function useGlobalStyle(css) {
  useInsertionEffect(() => {
    const style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);
    console.log('style inserted');
    return () => {
      style.remove();
      console.log('style removed');
    };
  }, [css]);
}

function Highlighter() {
  useGlobalStyle('.hl { background: yellow; }');
  return <p>Highlighter is mounted</p>;
}

export default function App() {
  const [on, setOn] = useState(false);
  return (
    <div>
      <p>Some <span className="hl">important</span> text.</p>
      <button onClick={() => setOn(o => !o)}>Toggle highlighter</button>
      {on && <Highlighter />}
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useDebugValue ─────────────────────────────
  {
    id: 'usedebugvalue',
    section: 'Advanced Hooks',
    title: 'useDebugValue',
    explain: `
      <p><code>useDebugValue</code> adds a <strong>label to your custom hook</strong> in React DevTools. It has no effect on what your app renders — it's purely a debugging aid.</p>
      <pre><code>function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, () =&gt; navigator.onLine);
  useDebugValue(isOnline ? 'Online' : 'Offline');
  return isOnline;
}</code></pre>
      <p>In the DevTools Components panel, a component using this hook shows <code>OnlineStatus: "Online"</code> instead of only the raw internal state.</p>
      <h3>Deferred formatting</h3>
      <p>If computing the label is expensive, pass a formatter as the second argument. DevTools only calls it when you actually inspect the component:</p>
      <pre><code>useDebugValue(date, d =&gt; d.toDateString());</code></pre>
      <div class="tip">Use it in <strong>shared/library custom hooks</strong> whose internal state is hard to read. Don't sprinkle it into every hook.</div>
      <div class="warn">This sandbox has no DevTools, so the examples log to the console to show what the label <em>would</em> be. Open the site in a normal React app with the React DevTools extension to see labels for real.</div>
    `,
    examples: [
      {
        title: 'Label a custom hook',
        code: `import { useState, useDebugValue } from 'react';

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  // Shows as  Toggle: "ON"  in React DevTools
  useDebugValue(on ? 'ON' : 'OFF');
  return [on, () => setOn(v => !v)];
}

export default function App() {
  const [on, toggle] = useToggle();
  console.log('DevTools label would be:', on ? 'ON' : 'OFF');
  return <button onClick={toggle}>Light is {on ? 'on 💡' : 'off'}</button>;
}`,
      },
      {
        title: 'Deferred formatter',
        code: `import { useState, useDebugValue } from 'react';

function useLastClicked() {
  const [time, setTime] = useState(null);
  // Formatter only runs when DevTools inspects this component
  useDebugValue(time, t => (t ? 'clicked at ' + t.toLocaleTimeString() : 'never clicked'));
  return [time, () => setTime(new Date())];
}

export default function App() {
  const [time, click] = useLastClicked();
  return (
    <div>
      <button onClick={click}>Click me</button>
      <p>{time ? 'Last click: ' + time.toLocaleTimeString() : 'No clicks yet'}</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>useDebugValue</code> affect?', options: ['What the app renders', 'Only the label shown in React DevTools', 'Performance of rendering', 'The console output'], answer: 1, why: 'It only annotates custom hooks in DevTools.' },
      { q: 'Where should you call <code>useDebugValue</code>?', options: ['In event handlers', 'At the top level of a custom hook', 'Inside useEffect', 'In class components'], answer: 1, why: 'It is a hook: call it at the top level of your custom hook.' },
      { q: 'Why pass a formatter as the second argument?', options: ['To change rendered output', 'To defer expensive formatting until the hook is inspected', 'To log to console', 'It is required'], answer: 1, why: 'DevTools calls the formatter lazily, only when inspecting.' },
    ],
    exercise: {
      task: `<p>Write a <code>useCounter(start)</code> custom hook that returns <code>[count, increment]</code> and uses <code>useDebugValue</code> to label itself as <code>"even"</code> or <code>"odd"</code> using a formatter function. Also <code>console.log</code> the same label on each render so you can see it here.</p>`,
      starter: `import { useState, useDebugValue } from 'react';

function useCounter(start) {
  const [count, setCount] = useState(start);
  // TODO: useDebugValue with a formatter
  return [count, () => setCount(c => c + 1)];
}

export default function App() {
  const [count, inc] = useCounter(0);
  return <button onClick={inc}>Count: {count}</button>;
}`,
      hint: 'useDebugValue(count, c => (c % 2 === 0 ? "even" : "odd"));',
      solution: `import { useState, useDebugValue } from 'react';

function parity(c) {
  return c % 2 === 0 ? 'even' : 'odd';
}

function useCounter(start) {
  const [count, setCount] = useState(start);
  useDebugValue(count, parity);
  console.log('debug label:', parity(count));
  return [count, () => setCount(c => c + 1)];
}

export default function App() {
  const [count, inc] = useCounter(0);
  return <button onClick={inc}>Count: {count}</button>;
}`,
    },
  },

  // ───────────────────────────── useEffectEvent ─────────────────────────────
  {
    id: 'useeffectevent',
    section: 'Advanced Hooks',
    title: 'useEffectEvent',
    explain: `
      <p><code>useEffectEvent</code> (stable since <strong>React 19.2</strong>, <code>import { useEffectEvent } from 'react'</code>) solves a classic effect problem: <em>"I need to read the latest value of some prop/state inside my effect, but I don't want the effect to re-run when it changes."</em></p>
      <h3>The problem</h3>
      <pre><code>useEffect(() =&gt; {
  const conn = connect(roomId);
  conn.on('connected', () =&gt; showToast('Connected!', theme));
  return () =&gt; conn.disconnect();
}, [roomId, theme]); // 😩 changing theme reconnects to the chat!</code></pre>
      <p>The linter forces you to add <code>theme</code> to dependencies, but reconnecting because the theme changed is wrong. The connection only depends on <code>roomId</code>.</p>
      <h3>The fix</h3>
      <pre><code>const onConnected = useEffectEvent(() =&gt; {
  showToast('Connected!', theme); // always reads latest theme
});

useEffect(() =&gt; {
  const conn = connect(roomId);
  conn.on('connected', () =&gt; onConnected());
  return () =&gt; conn.disconnect();
}, [roomId]); // ✅ only roomId</code></pre>
      <p>Think of an Effect Event as the <strong>non-reactive part</strong> of your effect: logic that is triggered <em>by</em> the effect, but should always see fresh props/state without causing re-syncs. It's like an event handler that fires from inside an effect.</p>
      <h3>Rules</h3>
      <ul>
        <li>Only call Effect Events <strong>from inside effects</strong> (or from functions called by effects, like timers/subscriptions set up there).</li>
        <li><strong>Don't</strong> list them in dependency arrays — they aren't reactive.</li>
        <li><strong>Don't</strong> pass them to other components or hooks.</li>
        <li>Declare them right next to the effect that uses them.</li>
      </ul>
      <div class="warn"><strong>Pitfall:</strong> Don't use <code>useEffectEvent</code> just to silence the linter. If the effect genuinely should re-run when a value changes, keep it as a dependency.</div>
    `,
    examples: [
      {
        title: 'Chat room: theme change does NOT reconnect',
        code: `import { useState, useEffect, useEffectEvent } from 'react';

function createConnection(roomId) {
  let timer;
  return {
    connect(onConnected) {
      console.log('🔌 connecting to', roomId);
      timer = setTimeout(onConnected, 500);
    },
    disconnect() {
      clearTimeout(timer);
      console.log('❌ disconnected from', roomId);
    },
  };
}

function ChatRoom({ roomId, theme }) {
  const onConnected = useEffectEvent(() => {
    console.log('✅ Connected to ' + roomId + ' (toast theme: ' + theme + ')');
  });

  useEffect(() => {
    const conn = createConnection(roomId);
    conn.connect(() => onConnected());
    return () => conn.disconnect();
  }, [roomId]); // theme is NOT a dependency

  return <h3 style={{ color: theme === 'dark' ? 'white' : 'black', background: theme === 'dark' ? '#333' : '#eee', padding: 10 }}>Room: {roomId}</h3>;
}

export default function App() {
  const [roomId, setRoomId] = useState('general');
  const [theme, setTheme] = useState('light');
  return (
    <div>
      <select value={roomId} onChange={e => setRoomId(e.target.value)}>
        <option>general</option>
        <option>travel</option>
        <option>music</option>
      </select>{' '}
      <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>Toggle theme</button>
      <ChatRoom roomId={roomId} theme={theme} />
      <p style={{ fontSize: 13 }}>Toggle theme: no reconnect. Change room: reconnect.</p>
    </div>
  );
}`,
      },
      {
        title: 'Interval that reads the latest step',
        code: `import { useState, useEffect, useEffectEvent } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [step, setStep] = useState(1);
  const [running, setRunning] = useState(true);

  const onTick = useEffectEvent(() => {
    setCount(c => c + step); // latest step, no interval restart
  });

  useEffect(() => {
    if (!running) return;
    console.log('interval started');
    const id = setInterval(() => onTick(), 1000);
    return () => {
      clearInterval(id);
      console.log('interval cleared');
    };
  }, [running]);

  return (
    <div>
      <h2>{count}</h2>
      <label>
        Step:{' '}
        <input type="number" value={step} onChange={e => setStep(Number(e.target.value))} style={{ width: 60 }} />
      </label>{' '}
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Resume'}</button>
      <p style={{ fontSize: 13 }}>Change step: interval is NOT restarted (see console).</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What problem does <code>useEffectEvent</code> solve?', options: ['Fetching data faster', 'Reading latest values in an effect without making the effect re-run when they change', 'Running effects on the server', 'Replacing useState'], answer: 1, why: 'It separates non-reactive logic from the reactive effect.' },
      { q: 'Should you put an Effect Event in the dependency array?', options: ['Yes, always', 'No, Effect Events are not reactive', 'Only if it reads state', 'Only in Strict Mode'], answer: 1, why: 'Effect Events are intentionally excluded from dependencies.' },
      { q: 'Where may you call an Effect Event?', options: ['During render', 'In a child component via props', 'From inside effects (including callbacks set up by them)', 'Anywhere'], answer: 2, why: 'They are only meant to be called from effects.' },
      { q: 'Where do you import <code>useEffectEvent</code> from in React 19.2?', options: ["'react-dom'", "'react'", "'react/experimental'", "'react-effect-event'"], answer: 1, why: 'It is stable in React 19.2 and exported from react.' },
      { q: 'When is using <code>useEffectEvent</code> a mistake?', options: ['When the effect should truly re-sync on that value', 'When logging analytics', 'When reading theme in a connection callback', 'When reading latest state in an interval'], answer: 0, why: 'If a value should trigger re-sync, it belongs in dependencies.' },
    ],
    exercise: {
      task: `<p>A page logs a "visit" to an analytics function each time <code>url</code> changes. The log must include the current <code>cartCount</code>, but changing the cart should <strong>not</strong> log a new visit. Use <code>useEffectEvent</code> to fix the starter so adding items doesn't log visits.</p>`,
      starter: `import { useState, useEffect } from 'react';

function logVisit(url, cartCount) {
  console.log('📈 visit', url, 'cart items:', cartCount);
}

function Page({ url, cartCount }) {
  useEffect(() => {
    logVisit(url, cartCount);
  }, [url, cartCount]); // BUG: logs a visit when cart changes

  return <h3>Page: {url}</h3>;
}

export default function App() {
  const [url, setUrl] = useState('/home');
  const [cart, setCart] = useState(0);
  return (
    <div>
      <button onClick={() => setUrl('/home')}>Home</button>{' '}
      <button onClick={() => setUrl('/shop')}>Shop</button>{' '}
      <button onClick={() => setCart(c => c + 1)}>Add to cart ({cart})</button>
      <Page url={url} cartCount={cart} />
    </div>
  );
}`,
      hint: 'const onVisit = useEffectEvent(visitedUrl => logVisit(visitedUrl, cartCount)); then useEffect(() => { onVisit(url); }, [url]);',
      solution: `import { useState, useEffect, useEffectEvent } from 'react';

function logVisit(url, cartCount) {
  console.log('📈 visit', url, 'cart items:', cartCount);
}

function Page({ url, cartCount }) {
  const onVisit = useEffectEvent(visitedUrl => {
    logVisit(visitedUrl, cartCount);
  });

  useEffect(() => {
    onVisit(url);
  }, [url]);

  return <h3>Page: {url}</h3>;
}

export default function App() {
  const [url, setUrl] = useState('/home');
  const [cart, setCart] = useState(0);
  return (
    <div>
      <button onClick={() => setUrl('/home')}>Home</button>{' '}
      <button onClick={() => setUrl('/shop')}>Shop</button>{' '}
      <button onClick={() => setCart(c => c + 1)}>Add to cart ({cart})</button>
      <Page url={url} cartCount={cart} />
    </div>
  );
}`,
    },
  },
);
