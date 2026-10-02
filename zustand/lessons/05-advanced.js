window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── vanilla-store
  {
    id: 'vanilla-store',
    section: 'Advanced & TypeScript',
    title: 'Vanilla store (no React)',
    explain: `
      <p>Every store so far came from <code>create</code>, which hands you a React hook. Under the
      hood, a Zustand store is just a <strong>plain JavaScript object with four methods</strong>.
      No React needed. <code>createStore</code> (from <code>'zustand/vanilla'</code>, also
      re-exported by <code>'zustand'</code>) gives you exactly that object.</p>
      <p>Analogy: the vanilla store is the <em>engine</em>. <code>create</code> is the same engine
      already bolted into a React car.</p>
      <pre><code class="language-javascript">import { createStore } from 'zustand/vanilla';

const counterStore = createStore((set, get, store) =&gt; ({
  count: 0,
  inc: () =&gt; set((s) =&gt; ({ count: s.count + 1 })),
  reset: () =&gt; set(store.getInitialState()),
}));</code></pre>
      <p>The initializer gets the same <code>set</code> and <code>get</code> as before, plus a third
      argument: the <code>store</code> API itself.</p>

      <h3>The store API</h3>
      <table>
        <tr><th>Method</th><th>What it does</th></tr>
        <tr><td><code>getState()</code></td><td>Returns the current state. Doesn't subscribe to anything.</td></tr>
        <tr><td><code>setState(partial | fn, replace?)</code></td><td>Shallow-<strong>merges</strong> the partial into the state.
          With <code>replace = true</code> it swaps the whole state instead.</td></tr>
        <tr><td><code>subscribe(listener)</code></td><td>Calls <code>listener(state, prevState)</code> after every change.
          Returns an <code>unsubscribe</code> function.</td></tr>
        <tr><td><code>getInitialState()</code></td><td>Returns the state the initializer first built. Handy for resets and tests.</td></tr>
      </table>
      <div class="warn"><code>setState(obj, true)</code> replaces <em>everything</em>. If
      <code>obj</code> has no actions, your actions are gone. <code>getInitialState()</code>
      includes the actions, so <code>setState(store.getInitialState(), true)</code> is a safe
      full reset.</div>

      <h3>When is a vanilla store useful?</h3>
      <ul>
        <li>Code outside React: plain DOM widgets, game loops, WebSocket handlers, other frameworks.</li>
        <li>State shared between React and non-React code (a chart library, a map SDK…).</li>
        <li>Stores created per component or per request, handed down with Context (you saw this in
          the <code>createStore</code> + context lesson).</li>
        <li>Tests: store logic can be tested with no rendering at all.</li>
      </ul>

      <h3>Binding a vanilla store to React: <code>useStore</code></h3>
      <pre><code class="language-javascript">import { useStore } from 'zustand';

function Counter() {
  const count = useStore(counterStore, (s) =&gt; s.count); // re-renders when count changes
  return &lt;button onClick={() =&gt; counterStore.getState().inc()}&gt;{count}&lt;/button&gt;;
}

// Nicer: wrap it once in a custom hook
const useCounter = (selector) =&gt; useStore(counterStore, selector);</code></pre>
      <p><code>useStore(store, selector)</code> follows the same rules as the hook from
      <code>create</code>: re-render only when the selected value changes (<code>Object.is</code>),
      and wrap object/array results in <code>useShallow</code>.</p>
      <div class="tip">In fact <code>create(fn)</code> is basically <code>createStore(fn)</code> plus
      a hook bound to it with <code>useStore</code>. That's why a <code>create</code> hook also has
      <code>getState</code>, <code>setState</code>, <code>subscribe</code> and
      <code>getInitialState</code> attached.</div>
    `,
    examples: [
      {
        title: 'A counter in plain DOM (no React at all)',
        lang: 'js',
        code: `import { createStore } from 'zustand/vanilla';

const counter = createStore((set, get, store) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
  reset: () => set(store.getInitialState()),
}));

const root = document.getElementById('root');
root.innerHTML = \`
  <h3>Count: <span id="n"></span></h3>
  <button id="inc">+1</button>
  <button id="reset">Reset</button>
\`;

const n = document.getElementById('n');
const render = (state) => {
  n.textContent = state.count;
};

// 1. draw once with the current state
render(counter.getState());

// 2. redraw on every change
counter.subscribe((state, prev) => {
  console.log(\`count \${prev.count} → \${state.count}\`);
  render(state);
});

// 3. actions live in the state, like in React stores
document.getElementById('inc').onclick = () => counter.getState().inc();
document.getElementById('reset').onclick = () => counter.getState().reset();

// setState merges: the actions survive
counter.setState({ count: 5 });
console.log('keys after merge:', Object.keys(counter.getState()).join(', '));
console.log('initial count was', counter.getInitialState().count);`,
      },
      {
        title: 'Same store, two worlds: plain JS writes, React reads with useStore',
        code: `import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';

const clockStore = createStore(() => ({ ticks: 0, paused: false }));

// Plain JS, outside React: a timer that writes to the store
setInterval(() => {
  const { paused } = clockStore.getState();
  if (!paused) clockStore.setState((s) => ({ ticks: s.ticks + 1 }));
}, 1000);

// A custom hook that binds the vanilla store to React
const useClock = (selector) => useStore(clockStore, selector);

function Ticks() {
  const ticks = useClock((s) => s.ticks);
  return <h3>ticks: {ticks}</h3>;
}

function PauseButton() {
  const paused = useClock((s) => s.paused);
  const toggle = () => clockStore.setState({ paused: !paused });
  return <button onClick={toggle}>{paused ? 'Resume' : 'Pause'}</button>;
}

export default function App() {
  return (
    <div>
      <Ticks />
      <PauseButton />
      <p style={{ color: 'gray' }}>
        The timer is plain JS. React only reads the store via useStore.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>createStore</code> from <code>\'zustand/vanilla\'</code> return?',
        options: [
          'A React hook',
          'A plain object with getState, setState, subscribe and getInitialState',
          'A Context Provider component',
          'A Promise that resolves to the state',
        ],
        answer: 1,
        why: 'A vanilla store is just the store API object. To use it in React, pass it to <code>useStore(store, selector)</code>.',
      },
      {
        q: 'The state is <code>{ count: 0, inc }</code>. What is it after <code>store.setState({ count: 5 })</code>?',
        options: [
          '<code>{ count: 5 }</code>: inc is removed',
          '<code>{ count: 5, inc }</code>: setState merges',
          'It throws because inc is missing',
          'Nothing changes until a React component re-renders',
        ],
        answer: 1,
        why: 'setState shallow-merges by default. Only <code>setState(x, true)</code> replaces the whole state.',
      },
      {
        q: 'How should a React component read <code>count</code> from a vanilla store so it re-renders on change?',
        options: [
          '<code>store.getState().count</code> during render',
          '<code>useStore(store, (s) =&gt; s.count)</code>',
          'Call <code>store.subscribe</code> in the component body',
          '<code>useContext(store)</code>',
        ],
        answer: 1,
        why: '<code>getState()</code> reads once and never subscribes. <code>useStore</code> subscribes and re-renders when the selected value changes.',
      },
      {
        q: 'What does <code>store.subscribe(listener)</code> return?',
        options: [
          'The current state',
          'A Promise',
          'An unsubscribe function',
          'Nothing',
        ],
        answer: 2,
        why: 'Call the returned function to stop listening. In React, return it from <code>useEffect</code> as the cleanup.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `
        <p>Build a tiny todo app with <strong>no React</strong>:</p>
        <ol>
          <li>Create <code>todoStore</code> with <code>createStore</code>: <code>todos: []</code>,
            <code>add(text)</code> and <code>toggle(id)</code>. Update immutably.</li>
          <li>Write <code>render(state)</code> that fills <code>#list</code> with one
            <code>&lt;li&gt;</code> per todo (line-through when done).</li>
          <li>Render once, then <code>subscribe</code> so every change re-renders and logs
            e.g. <code>3 todos, 1 done</code>.</li>
          <li>Wire the Add button. Clicking an <code>&lt;li&gt;</code> toggles it.</li>
        </ol>`,
      starter: `import { createStore } from 'zustand/vanilla';

const root = document.getElementById('root');
root.innerHTML = \`
  <input id="text" placeholder="New todo" />
  <button id="add">Add</button>
  <ul id="list"></ul>
\`;

// TODO 1: add todos: [], add(text), toggle(id)
const todoStore = createStore((set) => ({
  todos: [],
}));

// TODO 2: fill #list with <li> items
function render(state) {}

// TODO 3: render once, then subscribe

// TODO 4: wire the Add button and clicking an <li>
console.log('starter loaded');`,
      hint: 'add: <code>set((s) =&gt; ({ todos: [...s.todos, { id: Date.now(), text, done: false }] }))</code>. For toggling, set <code>li.onclick = () =&gt; todoStore.getState().toggle(todo.id)</code> while building each item.',
      solution: `import { createStore } from 'zustand/vanilla';

const root = document.getElementById('root');
root.innerHTML = \`
  <input id="text" placeholder="New todo" />
  <button id="add">Add</button>
  <ul id="list"></ul>
\`;

let nextId = 1;

const todoStore = createStore((set) => ({
  todos: [],
  add: (text) =>
    set((s) => ({ todos: [...s.todos, { id: nextId++, text, done: false }] })),
  toggle: (id) =>
    set((s) => ({
      todos: s.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

const list = document.getElementById('list');
const input = document.getElementById('text');

function render(state) {
  list.replaceChildren(
    ...state.todos.map((todo) => {
      const li = document.createElement('li');
      li.textContent = todo.text;
      li.style.cursor = 'pointer';
      li.style.textDecoration = todo.done ? 'line-through' : 'none';
      li.onclick = () => todoStore.getState().toggle(todo.id);
      return li;
    })
  );
}

render(todoStore.getState());

todoStore.subscribe((state) => {
  const done = state.todos.filter((t) => t.done).length;
  console.log(\`\${state.todos.length} todos, \${done} done\`);
  render(state);
});

document.getElementById('add').onclick = () => {
  const text = input.value.trim();
  if (!text) return;
  todoStore.getState().add(text);
  input.value = '';
};

todoStore.getState().add('Try a vanilla store');`,
    },
  },

  // ───────────────────────────────────────────────────────────── transient-updates
  {
    id: 'transient-updates',
    section: 'Advanced & TypeScript',
    title: 'Transient updates',
    explain: `
      <p>Some state changes <em>very</em> often: mouse position, scroll offset, drag coordinates,
      audio levels, game loops. That can be 60+ changes per second. If each change re-renders a
      component, React re-runs it and diffs it every time. Usually fine. Sometimes it's jank.</p>
      <p><strong>Transient updates</strong> skip React for those values. The component
      <code>subscribe</code>s to the store directly inside <code>useEffect</code> and writes each
      new value somewhere React doesn't track: a ref, or a DOM node through a ref. The component
      renders <strong>once</strong>, while the store keeps changing.</p>
      <p>Analogy: a reactive component reprints the whole newspaper each time the score changes. A
      transient one is a scoreboard where someone just flips the digits.</p>
      <p>This is the pattern from the Zustand README:</p>
      <pre><code>const useScratchStore = create(() =&gt; ({ scratches: 0 }));

function Component() {
  // ① read the initial value without subscribing
  const scratchRef = useRef(useScratchStore.getState().scratches);

  // ② subscribe on mount; the returned unsubscribe is the cleanup
  useEffect(
    () =&gt;
      useScratchStore.subscribe((state) =&gt; {
        scratchRef.current = state.scratches; // ③ no setState, so no re-render
      }),
    []
  );
  // ...
}</code></pre>
      <ol>
        <li><strong>①</strong> <code>getState()</code> reads the store once. It does not subscribe the component.</li>
        <li><strong>②</strong> <code>subscribe</code> returns an unsubscribe function. Returning it from the
          effect means React cleans up on unmount.</li>
        <li><strong>③</strong> Writing to a ref never triggers a render. To show the value, write to a DOM
          node (<code>el.textContent</code>, <code>el.style.transform</code>) or draw on a canvas.</li>
      </ol>

      <h3>When to use it (and when not)</h3>
      <ul>
        <li>✅ The value changes many times a second and profiling shows re-renders are costly.</li>
        <li>✅ You update things imperatively anyway: CSS transforms, canvas, a chart library.</li>
        <li>❌ Normal UI. You give up React's "UI = f(state)" model, so keep it for hot paths.</li>
      </ul>
      <div class="warn">Don't write <code>textContent</code> into an element whose children React
      renders. React owns those nodes and will get confused on its next update. Render an
      <strong>empty</strong> element (<code>&lt;div ref={el} /&gt;</code>) and fill it yourself, or only
      touch <code>style</code> and attributes.</div>
      <div class="tip">With the <code>subscribeWithSelector</code> middleware you can subscribe to one
      slice: <code>useStore.subscribe((s) =&gt; s.x, (x) =&gt; …)</code>. The listener then only runs
      when <code>x</code> changes.</div>
    `,
    examples: [
      {
        title: 'Reactive vs transient pointer tracker (watch the render counters)',
        code: `import { useEffect, useRef } from 'react';
import { create } from 'zustand';

const usePointer = create(() => ({ x: 0, y: 0 }));

const panel = {
  flex: 1,
  padding: 8,
  border: '1px solid #c5c9d6',
  borderRadius: 6,
};

function ReactivePanel() {
  const renders = useRef(0);
  renders.current++;
  const x = usePointer((s) => s.x);
  const y = usePointer((s) => s.y);

  return (
    <div style={panel}>
      <b>Reactive (selector)</b>
      <div>x: {x}, y: {y}</div>
      <small>renders: {renders.current}</small>
    </div>
  );
}

function TransientPanel() {
  const renders = useRef(0);
  renders.current++;
  const textRef = useRef(null);

  useEffect(() => {
    const paint = (state) => {
      textRef.current.textContent = \`x: \${state.x}, y: \${state.y}\`;
    };
    paint(usePointer.getState());
    console.log('Transient: subscribed');
    return usePointer.subscribe(paint);
  }, []);

  return (
    <div style={panel}>
      <b>Transient (subscribe + ref)</b>
      <div ref={textRef} />
      <small>renders: {renders.current}</small>
    </div>
  );
}

export default function App() {
  const onMove = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    usePointer.setState({
      x: Math.round(e.clientX - box.left),
      y: Math.round(e.clientY - box.top),
    });
  };

  return (
    <div>
      <div
        onMouseMove={onMove}
        style={{
          height: 110,
          background: '#eef1fb',
          border: '2px dashed #8b93b8',
          borderRadius: 8,
          display: 'grid',
          placeItems: 'center',
          color: '#5b6390',
        }}
      >
        Move your mouse here
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <ReactivePanel />
        <TransientPanel />
      </div>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: one re-render per mouse event</summary>
            <p>Each <code>mousemove</code> calls <code>usePointer.setState</code>. The store notifies
            every subscriber. <code>ReactivePanel</code> subscribed with selectors, so whenever
            <code>x</code> or <code>y</code> changes React re-runs the whole component. Wiggle the
            mouse for a second and it renders ~60 times. <code>TransientPanel</code> shows the same
            numbers but stays at <strong>1</strong> render.</p>
            <table>
              <tr><th>Step</th><th>Store</th><th>Reactive renders</th><th>Transient renders</th><th>Console</th></tr>
              <tr><td>Mount</td><td><code>{ x: 0, y: 0 }</code></td><td>1</td><td>1</td><td><code>Transient: subscribed</code></td></tr>
              <tr><td>Move to (10, 5)</td><td><code>{ x: 10, y: 5 }</code></td><td>2</td><td>1 (text updated by <code>paint</code>)</td><td>—</td></tr>
              <tr><td>Move to (11, 5)</td><td><code>{ x: 11, y: 5 }</code></td><td>3</td><td>1</td><td>—</td></tr>
              <tr><td>Wiggle ~1 second (~60 events)</td><td>changes ~60×</td><td>~63</td><td><strong>1</strong></td><td>—</td></tr>
            </table>
            <p>Both panels always show the same coordinates. Only the cost differs.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>useEffect(() =&gt; {
  const paint = (state) =&gt; {
    textRef.current.textContent = \`x: \${state.x}, y: \${state.y}\`; // ①
  };
  paint(usePointer.getState());           // ②
  console.log('Transient: subscribed');
  return usePointer.subscribe(paint);     // ③
}, []);                                   // ④

return &lt;div ref={textRef} /&gt;;            // ⑤</code></pre>
            <ol>
              <li><strong>①</strong> <code>paint</code> writes straight to the DOM node. React never hears about it, so no render.</li>
              <li><strong>②</strong> Paint the current value once on mount. <code>subscribe</code> only fires on <em>future</em> changes.</li>
              <li><strong>③</strong> <code>subscribe(paint)</code> calls <code>paint(state, prevState)</code> on every
                <code>setState</code>. Returning the unsubscribe function makes it the effect cleanup.</li>
              <li><strong>④</strong> Empty deps: subscribe once, never re-subscribe.</li>
              <li><strong>⑤</strong> The element has <strong>no React children</strong>. That makes it safe to set its <code>textContent</code> by hand.</li>
            </ol>
            <p><code>ReactivePanel</code> uses two selectors. When both <code>x</code> and <code>y</code>
            change in one <code>setState</code>, React still does just <strong>one</strong> render.</p>
          </details>
          <details>
            <summary>Try this / common mistakes</summary>
            <ul>
              <li>Add <code>console.log('reactive render')</code> in <code>ReactivePanel</code>'s body and
                move the mouse. The console floods. That flood is what transient updates avoid.</li>
              <li>Add a small dot and move it with
                <code>dot.style.transform = \`translate(\${state.x}px, \${state.y}px)\`</code> inside
                <code>paint</code>. It's smooth, and the render count stays 1.</li>
              <li>Swap <code>&lt;div ref={textRef} /&gt;</code> for
                <code>&lt;div ref={textRef}&gt;{usePointer.getState().x}&lt;/div&gt;</code>. Now React
                and your code fight over the same node. Don't do it.</li>
            </ul>
            <div class="warn">If you forget to <code>return</code> the unsubscribe, every mount adds
            another listener that is never removed. Under StrictMode, which mounts twice in dev, you'd
            get 2 listeners straight away.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In a transient update, how does the component learn about new store values?',
        options: [
          'Through a selector hook like <code>useStore((s) =&gt; s.x)</code>',
          'Through <code>store.subscribe</code> inside <code>useEffect</code>, writing to a ref or DOM node',
          'By calling <code>store.getState()</code> on every render',
          'Through React Context',
        ],
        answer: 1,
        why: 'A direct subscription never calls React\'s setState, so the component doesn\'t re-render. You push the value into a ref, the DOM, a canvas, etc.',
      },
      {
        q: 'Why return <code>useStore.subscribe(...)</code> from the effect?',
        options: [
          'It makes the effect run again on every change',
          'subscribe returns an unsubscribe function, so React uses it as the cleanup on unmount',
          'React requires effects to return something',
          'It returns the initial state',
        ],
        answer: 1,
        why: 'Without the cleanup, listeners pile up on every mount and keep touching DOM nodes that no longer exist.',
      },
      {
        q: 'Which is the WRONG place to write <code>el.textContent</code> in a transient update?',
        options: [
          'An empty <code>&lt;div ref={el} /&gt;</code>',
          'A <code>&lt;span ref={el}&gt;{value}&lt;/span&gt;</code> whose children React renders',
          'A canvas you draw on',
          'A node you created with <code>document.createElement</code>',
        ],
        answer: 1,
        why: 'React owns the children it renders. Changing them behind its back can break its next update. Use an element React leaves empty.',
      },
      {
        q: 'When should you reach for transient updates?',
        options: [
          'Always. Re-renders are bad.',
          'For high-frequency values (pointer, scroll, animation) where re-rendering is measurably costly',
          'For form inputs',
          'Whenever state is an object',
        ],
        answer: 1,
        why: 'Re-renders are usually cheap. Transient updates trade React\'s declarative model for speed, so keep them for hot paths.',
      },
    ],
    exercise: {
      task: `
        <p>The slider updates <code>useVolume</code> on every tiny move, and <code>Meter</code>
        re-renders each time (watch "Meter renders").</p>
        <p>Make <code>Meter</code> <strong>transient</strong>: subscribe in <code>useEffect</code>
        and set the bar's <code>style.width</code> (and a number label) through refs. When you're
        done, dragging the slider should leave <strong>Meter renders: 1</strong>.</p>`,
      starter: `import { useRef } from 'react';
import { create } from 'zustand';

const useVolume = create(() => ({ level: 50 }));

function Meter() {
  const renders = useRef(0);
  renders.current++;

  // TODO: stop re-rendering! Subscribe in useEffect and update the bar via a ref.
  const level = useVolume((s) => s.level);

  return (
    <div>
      <div style={{ height: 16, background: '#e3e6f0', borderRadius: 8 }}>
        <div
          style={{
            width: level + '%',
            height: '100%',
            background: '#6c7ae0',
            borderRadius: 8,
          }}
        />
      </div>
      <p>level: {level}</p>
      <p>Meter renders: {renders.current}</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={50}
        onChange={(e) => useVolume.setState({ level: Number(e.target.value) })}
      />
      <Meter />
    </div>
  );
}`,
      hint: 'Create <code>barRef</code> and <code>labelRef</code>. In <code>useEffect(() =&gt; { … }, [])</code> define <code>paint(state)</code> that sets <code>barRef.current.style.width = state.level + \'%\'</code> and <code>labelRef.current.textContent</code>. Call <code>paint(useVolume.getState())</code>, then <code>return useVolume.subscribe(paint)</code>. Remove the selector and give the label span no React children.',
      solution: `import { useEffect, useRef } from 'react';
import { create } from 'zustand';

const useVolume = create(() => ({ level: 50 }));

function Meter() {
  const renders = useRef(0);
  renders.current++;
  const barRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const paint = (state) => {
      barRef.current.style.width = state.level + '%';
      labelRef.current.textContent = state.level;
    };
    paint(useVolume.getState());
    return useVolume.subscribe(paint);
  }, []);

  return (
    <div>
      <div style={{ height: 16, background: '#e3e6f0', borderRadius: 8 }}>
        <div
          ref={barRef}
          style={{ height: '100%', background: '#6c7ae0', borderRadius: 8 }}
        />
      </div>
      <p>
        level: <span ref={labelRef} />
      </p>
      <p>Meter renders: {renders.current}</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <input
        type="range"
        min="0"
        max="100"
        defaultValue={50}
        onChange={(e) => useVolume.setState({ level: Number(e.target.value) })}
      />
      <Meter />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── useStore-in-effects
  {
    id: 'useStore-in-effects',
    section: 'Advanced & TypeScript',
    title: 'Stale closures & getState in callbacks',
    explain: `
      <p>A <strong>stale closure</strong> is a function created during one render that keeps
      seeing that render's values forever. <code>useEffect(…, [])</code> runs once, so anything
      created inside it (a <code>setInterval</code> callback, an event listener, a WebSocket
      <code>onmessage</code>) sees the values from the <em>first</em> render.</p>
      <p>Analogy: a value from a hook, captured in a closure, is a <em>photo</em> taken at render
      time. <code>useStore.getState()</code> is a <em>live camera</em>: it shows the store as it is
      right now.</p>
      <pre><code>const count = useCounter((s) =&gt; s.count);

useEffect(() =&gt; {
  const id = setInterval(() =&gt; {
    console.log(count);                         // 📷 photo from the first render: stale
    console.log(useCounter.getState().count);   // 🎥 live: always current
  }, 1000);
  return () =&gt; clearInterval(id);
}, []);</code></pre>

      <h3>Three ways to fix it</h3>
      <table>
        <tr><th>Fix</th><th>How</th><th>Trade-off</th></tr>
        <tr><td>Add to deps</td><td><code>[count]</code></td><td>Works, but the effect tears down and restarts on
          every change. Intervals reset their timing and listeners get re-attached.</td></tr>
        <tr><td>Read at call time</td><td><code>useCounter.getState().count</code> inside the callback</td>
          <td>Always fresh, and the effect runs once. The component doesn't even have to subscribe
          if it never renders the value.</td></tr>
        <tr><td>Move the logic into an action</td><td><code>tick: () =&gt; set((s) =&gt; …)</code> or use <code>get()</code></td>
          <td>Usually best. Store logic always reads the latest state, so it can't go stale.</td></tr>
      </table>

      <h3>Why actions don't cause dependency headaches</h3>
      <p>Actions are created <strong>once</strong>, when the store is created. So
      <code>useCounter((s) =&gt; s.inc)</code> returns the same function forever. Putting it in a deps
      array is harmless (the linter is happy and the effect never re-runs). You can also skip the hook
      and call <code>useCounter.getState().inc()</code> directly inside callbacks.</p>
      <div class="warn">Don't replace every selector with <code>getState()</code>.
      <code>getState()</code> in the render body does <strong>not</strong> subscribe, so the UI won't
      update. Use selectors for what you <em>render</em> and <code>getState()</code> for what you
      <em>read inside callbacks</em>.</div>
      <div class="tip">Rule of thumb: if a callback runs "later" (timers, listeners, sockets, async
      code after an <code>await</code>), read store values with <code>getState()</code> at the moment
      it runs.</div>
    `,
    examples: [
      {
        title: 'Stale interval: hook value vs getState()',
        code: `import { useEffect } from 'react';
import { create } from 'zustand';

const useCounter = create((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

export default function App() {
  const count = useCounter((s) => s.count);
  const inc = useCounter((s) => s.inc);

  useEffect(() => {
    // Runs ONCE: this callback closes over \`count\` from the first render
    const id = setInterval(() => {
      const fresh = useCounter.getState().count;
      console.log(\`tick → hook: \${count} | getState: \${fresh}\`);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h3>count: {count}</h3>
      <button onClick={inc}>+1</button>
      <p style={{ color: 'gray' }}>
        Click +1 a few times and watch the console every second.
      </p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: the interval only ever sees render #1</summary>
            <p>The effect has <code>[]</code> deps, so it runs once, after the first render. The
            interval callback is created at that moment and captures that render's
            <code>count</code>, which is <code>0</code>. Later renders make <em>new</em>
            <code>count</code> constants, but the interval still holds the old one.</p>
            <table>
              <tr><th>Time</th><th>What happens</th><th>Screen</th><th>Console</th></tr>
              <tr><td>0s</td><td>Render #1 (<code>count = 0</code>). Effect runs, interval created with <code>count = 0</code> captured.</td><td>count: 0</td><td>—</td></tr>
              <tr><td>1s</td><td>Interval fires</td><td>count: 0</td><td><code>tick → hook: 0 | getState: 0</code></td></tr>
              <tr><td>1.5s</td><td>Click +1 twice. Store → 2. Renders #2 and #3. The effect does <strong>not</strong> re-run.</td><td>count: 2</td><td>—</td></tr>
              <tr><td>2s</td><td>Interval fires with its old closure</td><td>count: 2</td><td><code>tick → hook: 0 | getState: 2</code> ❌ vs ✅</td></tr>
              <tr><td>3s</td><td>Same again</td><td>count: 2</td><td><code>tick → hook: 0 | getState: 2</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const count = useCounter((s) =&gt; s.count);    // ① a new constant every render

useEffect(() =&gt; {
  const id = setInterval(() =&gt; {
    const fresh = useCounter.getState().count; // ② read the store NOW
    console.log(\`tick → hook: \${count} | ...\`); // ③ count from render #1
  }, 1000);
  return () =&gt; clearInterval(id);
}, []);                                        // ④ never re-created</code></pre>
            <ol>
              <li><strong>①</strong> Each render gets its own <code>count</code>. It's a constant, not a live binding.</li>
              <li><strong>②</strong> <code>getState()</code> isn't a value from a render. It's a function
                call that asks the store for its current state every time the timer fires.</li>
              <li><strong>③</strong> The callback was created during render #1, so it sees render #1's <code>count</code>.</li>
              <li><strong>④</strong> With <code>[]</code> deps React never re-creates the interval, so
                it never gets a newer closure.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the deps to <code>[count]</code>. Both numbers now match. But click +1 faster
                than once per second: no tick ever fires, because each click clears the interval and
                starts a fresh 1-second timer. That's the cost of the deps fix.</li>
              <li>Delete the <code>count</code> selector and read only <code>getState()</code> in the
                interval. The console is still correct, but the <code>&lt;h3&gt;</code> no longer
                updates. Rendering needs a subscription.</li>
              <li>Add <code>inc</code> to the deps: <code>[inc]</code>. Nothing changes, because the action is
                the same function forever.</li>
            </ul>
            <div class="tip">An interval that should <em>change</em> state doesn't need any values
            from render. Call <code>useCounter.getState().inc()</code>, or better, an action that uses
            <code>set((s) =&gt; …)</code>.</div>
          </details>
        `,
      },
      {
        title: 'Autosave: logic in an action with get() is never stale',
        code: `import { useEffect } from 'react';
import { create } from 'zustand';

const useDraft = create((set, get) => ({
  text: '',
  savedText: '',
  saves: 0,
  setText: (text) => set({ text }),
  save: () => {
    const { text, savedText } = get(); // always the latest state
    if (text === savedText) return;
    set((s) => ({ savedText: text, saves: s.saves + 1 }));
    console.log('saved:', JSON.stringify(text));
  },
}));

export default function App() {
  const text = useDraft((s) => s.text);
  const setText = useDraft((s) => s.setText);
  const saves = useDraft((s) => s.saves);

  useEffect(() => {
    console.log('autosave effect started (runs once)');
    const id = setInterval(() => useDraft.getState().save(), 1500);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <textarea
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type, then pause…"
      />
      <p>saves: {saves}</p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Why this never goes stale</summary>
            <p>The interval holds no values from render. Every 1.5s it calls
            <code>useDraft.getState().save()</code>, and <code>save</code> reads
            <code>get()</code> <em>when it runs</em>. The effect starts once (one console line),
            yet it always saves the latest text, and only if the text changed.</p>
            <p>Moving the "what to do" into the store action keeps components thin and makes the
            logic testable without React: call <code>useDraft.getState().save()</code> in a test
            and check <code>getState().saves</code>.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: '<code>useEffect(() =&gt; { setInterval(() =&gt; log(count), 1000) }, [])</code>. The store count is now 5. What gets logged?',
        options: [
          '5',
          'The count from the render when the effect ran (e.g. 0)',
          'undefined',
          'It throws',
        ],
        answer: 1,
        why: 'The callback closed over the first render\'s <code>count</code>. With <code>[]</code> deps it\'s never re-created.',
      },
      {
        q: 'Which call always returns the current value inside an old callback?',
        options: [
          '<code>useCounter((s) =&gt; s.count)</code>',
          '<code>useCounter.getState().count</code>',
          '<code>useRef(count).current</code>',
          '<code>useMemo(() =&gt; count, [])</code>',
        ],
        answer: 1,
        why: '<code>getState()</code> asks the store at call time. Hooks can\'t be called inside callbacks anyway.',
      },
      {
        q: 'Why is it safe to put a Zustand action like <code>inc</code> in an effect\'s deps array?',
        options: [
          'Zustand ignores deps',
          'Actions are created once with the store, so their identity never changes',
          'React skips functions in deps',
          'It\'s not safe; it re-runs the effect every render',
        ],
        answer: 1,
        why: 'The selector <code>(s) =&gt; s.inc</code> returns the same function every time, so the effect never re-runs because of it.',
      },
      {
        q: 'What\'s the downside of fixing a stale interval by adding <code>count</code> to deps?',
        options: [
          'None',
          'The interval is torn down and restarted on every change, which resets its timing',
          'It causes an infinite loop',
          'getState stops working',
        ],
        answer: 1,
        why: 'Each change clears and recreates the interval. If changes come faster than the interval period, it may never fire.',
      },
    ],
    exercise: {
      task: `
        <p>This auto-counter adds <code>step</code> to <code>count</code> every second. Pick step
        5 or 10 and… it still adds 1. The interval's closure captured <code>step</code> from the first
        render.</p>
        <p>Fix it <strong>without</strong> adding <code>step</code> to the deps. Best way: add a
        <code>tick</code> action that uses <code>set((s) =&gt; …)</code> with <code>s.step</code>,
        and call it from the interval via <code>useTimer.getState().tick()</code>.</p>`,
      starter: `import { useEffect } from 'react';
import { create } from 'zustand';

const useTimer = create((set) => ({
  count: 0,
  step: 1,
  setStep: (step) => set({ step }),
  // TODO: add a tick action
}));

export default function App() {
  const count = useTimer((s) => s.count);
  const step = useTimer((s) => s.step);
  const setStep = useTimer((s) => s.setStep);

  useEffect(() => {
    const id = setInterval(() => {
      // BUG: \`step\` is stale here (always 1)
      useTimer.setState((s) => ({ count: s.count + step }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h3>count: {count}</h3>
      <p>
        step:{' '}
        {[1, 5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            style={{ fontWeight: n === step ? 'bold' : 'normal' }}
          >
            {n}
          </button>
        ))}
      </p>
    </div>
  );
}`,
      hint: 'In the store: <code>tick: () =&gt; set((s) =&gt; ({ count: s.count + s.step }))</code>. In the effect: <code>setInterval(() =&gt; useTimer.getState().tick(), 1000)</code>. The interval no longer uses any render value.',
      solution: `import { useEffect } from 'react';
import { create } from 'zustand';

const useTimer = create((set) => ({
  count: 0,
  step: 1,
  setStep: (step) => set({ step }),
  tick: () => set((s) => ({ count: s.count + s.step })),
}));

export default function App() {
  const count = useTimer((s) => s.count);
  const step = useTimer((s) => s.step);
  const setStep = useTimer((s) => s.setStep);

  useEffect(() => {
    // No render values inside: the action reads the latest step itself
    const id = setInterval(() => useTimer.getState().tick(), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h3>count: {count}</h3>
      <p>
        step:{' '}
        {[1, 5, 10].map((n) => (
          <button
            key={n}
            onClick={() => setStep(n)}
            style={{ fontWeight: n === step ? 'bold' : 'normal' }}
          >
            {n}
          </button>
        ))}
      </p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── typescript-basics
  {
    id: 'typescript-basics',
    section: 'Advanced & TypeScript',
    title: 'TypeScript: create<State>()(…)',
    explain: `
      <p>Zustand is written in TypeScript and types flow through selectors automatically. There's
      one surprise: you write <strong>two</strong> sets of parentheses.</p>
      <pre><code class="language-javascript">import { create } from 'zustand';

interface BearState {
  bears: number;
  increase: (by: number) =&gt; void;   // actions are typed in the same interface
}

const useBearStore = create&lt;BearState&gt;()((set) =&gt; ({
  //                         ^^ note the extra ()
  bears: 0,
  increase: (by) =&gt; set((state) =&gt; ({ bears: state.bears + by })),
}));</code></pre>

      <h3>Why the curried <code>()(…)</code>?</h3>
      <p><code>create</code> has two generic type parameters: <code>T</code> (your state) and a
      hidden list of <strong>middleware mutators</strong> (<code>devtools</code>, <code>persist</code>,
      <code>immer</code>… change what <code>set</code> and the store look like). You want to
      <em>write</em> <code>T</code> but let TypeScript <em>infer</em> the mutators from whatever
      middleware you wrap.</p>
      <p>TypeScript doesn't allow that: you pass <strong>all</strong> generics or <strong>none</strong>
      (see <code>microsoft/TypeScript#10571</code>). Currying works around it. The first call
      <code>create&lt;BearState&gt;()</code> pins <code>T</code>. The second call
      <code>(…)</code> is a fresh generic function that infers the mutators.</p>
      <p>Why not infer <code>T</code> from the object? <code>set</code> and <code>get</code> need
      <code>T</code> <em>while</em> the object is being written. That's chicken-and-egg, and inference
      breaks down. So you write the type once, up front.</p>
      <div class="tip">Always use the curried form, even without middleware. Then adding
      <code>devtools</code> later needs no refactor. At runtime <code>create()</code> with no
      argument just returns a function that takes the initializer, so <code>create()(fn)</code> also
      runs in plain JS.</div>

      <h3>Getting the type back out</h3>
      <pre><code class="language-javascript">import { type ExtractState } from 'zustand';

type State1 = ExtractState&lt;typeof useBearStore&gt;;            // v5 helper
type State2 = ReturnType&lt;typeof useBearStore.getState&gt;;     // same thing</code></pre>

      <h3>Middleware and vanilla stores</h3>
      <ul>
        <li>Wrap middleware <em>inside</em> the second call:
          <code>create&lt;T&gt;()(devtools(persist((set) =&gt; …, { name })))</code>. Don't annotate
          inner functions; types flow in.</li>
        <li>The docs advise putting <code>devtools</code> as the <strong>outermost</strong> (last applied) middleware.</li>
        <li>Vanilla: <code>createStore&lt;T&gt;()(…)</code> works the same. <code>useStore(store, selector)</code> infers the selector's state type from the store.</li>
        <li><code>combine(initialState, actions)</code> infers everything, so no interface is needed.</li>
      </ul>
      <div class="warn">TypeScript can't run in this site's playgrounds. The TS examples below are
      read-only, and the runnable ones are the JS equivalents.</div>
    `,
    examples: [
      {
        title: 'Typed store with the curried form (TypeScript, read-only)',
        runnable: false,
        code: `import { create } from 'zustand';

interface BearState {
  bears: number;
  lastFed: Date | null;
  increase: (by: number) => void;
  feed: () => void;
  reset: () => void;
}

export const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  lastFed: null,
  increase: (by) => set((state) => ({ bears: state.bears + by })), // by: number
  feed: () => set({ lastFed: new Date() }),
  reset: () => set(useBearStore.getInitialState()),
}));

function BearCounter() {
  const bears = useBearStore((s) => s.bears); // number
  const increase = useBearStore((s) => s.increase); // (by: number) => void
  return <button onClick={() => increase(1)}>{bears} bears</button>;
}

// Errors TypeScript now catches for you:
// set({ bears: 'many' })   → Type 'string' is not assignable to type 'number'
// increase('2')            → Argument of type 'string' is not assignable to 'number'
// useBearStore((s) => s.bearz) → Property 'bearz' does not exist on type 'BearState'`,
      },
      {
        title: 'Middleware, ExtractState, vanilla + useStore, combine (TypeScript, read-only)',
        runnable: false,
        code: `import { create, createStore, useStore, type ExtractState } from 'zustand';
import { combine, devtools, persist } from 'zustand/middleware';

// 1. Middleware: type goes on the first call, middleware in the second
interface PrefsState {
  theme: 'light' | 'dark';
  toggle: () => void;
}

export const usePrefs = create<PrefsState>()(
  devtools(
    persist(
      (set) => ({
        theme: 'light',
        toggle: () =>
          set(
            (s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' }),
            undefined,
            'prefs/toggle', // devtools adds this 3rd "action name" param to set
          ),
      }),
      { name: 'prefs' },
    ),
  ),
);

// 2. Get the state type from an existing store
type Prefs = ExtractState<typeof usePrefs>; // PrefsState

// 3. Vanilla store + typed custom hook
interface CounterState {
  count: number;
  inc: () => void;
}

const counterStore = createStore<CounterState>()((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

export function useCounter<T>(selector: (s: CounterState) => T): T {
  return useStore(counterStore, selector);
}

// 4. combine infers the type: no interface needed
export const useCount = create(
  combine({ count: 0 }, (set) => ({
    inc: () => set((s) => ({ count: s.count + 1 })),
  })),
);`,
      },
      {
        title: 'The curry is just a function call (runs in JS)',
        code: `import { create } from 'zustand';

// In TS you'd write: create<BearState>()(...)
const makeStore = create();
console.log('create() returns a', typeof makeStore);

const useBearStore = makeStore((set) => ({
  bears: 0,
  increase: (by) => set((s) => ({ bears: s.bears + by })),
  reset: () => set(useBearStore.getInitialState()),
}));

console.log('state keys:', Object.keys(useBearStore.getState()).join(', '));

export default function App() {
  const bears = useBearStore((s) => s.bears);
  const increase = useBearStore((s) => s.increase);
  const reset = useBearStore((s) => s.reset);

  return (
    <div>
      <h3>{bears} bears</h3>
      <button onClick={() => increase(1)}>+1</button>
      <button onClick={() => increase(5)}>+5</button>
      <button onClick={reset}>reset</button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Why does Zustand use <code>create&lt;State&gt;()(…)</code> instead of <code>create&lt;State&gt;(…)</code>?',
        options: [
          'The extra call creates the React hook',
          'TypeScript can\'t infer some generics while you pass others. The first call fixes State, the second infers middleware types.',
          'It\'s needed for the store to be reactive',
          'It\'s a leftover from v3 with no purpose',
        ],
        answer: 1,
        why: 'This works around microsoft/TypeScript#10571 (no partial type argument inference). It matters most once middleware is involved.',
      },
      {
        q: 'In plain JS, what does <code>create()</code> (no arguments) return?',
        options: [
          'undefined',
          'An empty hook',
          'A function that takes the state initializer, so <code>create()(fn)</code> works',
          'It throws',
        ],
        answer: 2,
        why: 'In v5: <code>create = (fn) =&gt; fn ? createImpl(fn) : createImpl</code>. The curry is a type-level trick and costs nothing at runtime.',
      },
      {
        q: 'How do you get the state type of an existing <code>useBearStore</code>?',
        options: [
          '<code>typeof useBearStore</code>',
          '<code>ExtractState&lt;typeof useBearStore&gt;</code> (or <code>ReturnType&lt;typeof useBearStore.getState&gt;</code>)',
          '<code>StateOf&lt;useBearStore&gt;</code>',
          'You can\'t',
        ],
        answer: 1,
        why: '<code>typeof useBearStore</code> is the hook type. <code>ExtractState</code> (exported from zustand v5) pulls out what <code>getState</code> returns.',
      },
      {
        q: 'Where do you type actions like <code>increase</code>?',
        options: [
          'In a separate Actions generic of create',
          'As function-typed properties in the same state interface',
          'They can\'t be typed',
          'Only with JSDoc',
        ],
        answer: 1,
        why: 'Actions are just state properties: <code>increase: (by: number) =&gt; void</code>. You can also split them into <code>State &amp; Actions</code> interfaces.',
      },
    ],
    exercise: {
      task: `
        <p>Build a cart store in <strong>JS</strong> using the curried form
        <code>create()((set, get) =&gt; …)</code>, the way you'd write it in TS:</p>
        <ul>
          <li>State: <code>items</code> (array of <code>{ id, name, price }</code>).</li>
          <li>Actions: <code>add(name, price)</code>, <code>remove(id)</code>,
            <code>total()</code> (sum of prices, read via <code>get()</code>).</li>
          <li>Render the item list with a remove button per item, two "add" buttons and the total.</li>
        </ul>
        <p>The hint and solution show the TypeScript interface you'd write for it.</p>`,
      starter: `import { create } from 'zustand';

// TS version would start: create<CartState>()(...)
const useCart = create()((set, get) => ({
  items: [],
  // TODO: add(name, price), remove(id), total()
}));

export default function App() {
  const items = useCart((s) => s.items);

  return (
    <div>
      <p>{items.length} items</p>
      {/* TODO: buttons, list with remove, total */}
    </div>
  );
}`,
      hint: `TS shape: <code>interface CartItem { id: number; name: string; price: number }</code>,
        <code>interface CartState { items: CartItem[]; add: (name: string, price: number) =&gt; void;
        remove: (id: number) =&gt; void; total: () =&gt; number }</code>, then
        <code>create&lt;CartState&gt;()((set, get) =&gt; …)</code>. Total:
        <code>get().items.reduce((sum, i) =&gt; sum + i.price, 0)</code>.`,
      solution: `import { create } from 'zustand';

// TypeScript version of the same store:
// interface CartItem { id: number; name: string; price: number }
// interface CartState {
//   items: CartItem[];
//   add: (name: string, price: number) => void;
//   remove: (id: number) => void;
//   total: () => number;
// }
// const useCart = create<CartState>()((set, get) => ({ ... }));

let nextId = 1;

const useCart = create()((set, get) => ({
  items: [],
  add: (name, price) =>
    set((s) => ({ items: [...s.items, { id: nextId++, name, price }] })),
  remove: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
  total: () => get().items.reduce((sum, i) => sum + i.price, 0),
}));

export default function App() {
  const items = useCart((s) => s.items);
  const add = useCart((s) => s.add);
  const remove = useCart((s) => s.remove);
  // total() reads get(); items is selected above, so we re-render when it changes
  const total = useCart((s) => s.total());

  return (
    <div>
      <button onClick={() => add('Apple', 1.5)}>+ Apple</button>
      <button onClick={() => add('Bread', 3)}>+ Bread</button>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.name} \${i.price}{' '}
            <button onClick={() => remove(i.id)}>✕</button>
          </li>
        ))}
      </ul>
      <p>
        {items.length} items, total: \${total.toFixed(2)}
      </p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── typescript-slices
  {
    id: 'typescript-slices',
    section: 'Advanced & TypeScript',
    title: 'TypeScript slices & middleware mutators',
    explain: `
      <p>Recap: the slices pattern splits one big store into functions like
      <code>createBearSlice(set, get)</code> and spreads them together. In TypeScript each slice is
      typed with <code>StateCreator</code>:</p>
      <pre><code class="language-javascript">import { create, type StateCreator } from 'zustand';

interface BearSlice { bears: number; addBear: () =&gt; void; eatFish: () =&gt; void }
interface FishSlice { fishes: number; addFish: () =&gt; void }

const createBearSlice: StateCreator&lt;BearSlice &amp; FishSlice, [], [], BearSlice&gt; =
  (set) =&gt; ({
    bears: 0,
    addBear: () =&gt; set((s) =&gt; ({ bears: s.bears + 1 })),
    eatFish: () =&gt; set((s) =&gt; ({ fishes: s.fishes - 1 })), // touches the other slice
  });

const createFishSlice: StateCreator&lt;BearSlice &amp; FishSlice, [], [], FishSlice&gt; =
  (set) =&gt; ({
    fishes: 0,
    addFish: () =&gt; set((s) =&gt; ({ fishes: s.fishes + 1 })),
  });

export const useBoundStore = create&lt;BearSlice &amp; FishSlice&gt;()((...a) =&gt; ({
  ...createBearSlice(...a),
  ...createFishSlice(...a),
}));</code></pre>

      <h3>The four generics of <code>StateCreator&lt;T, Mis, Mos, U&gt;</code></h3>
      <table>
        <tr><th>Param</th><th>Meaning</th><th>Typical value</th></tr>
        <tr><td><code>T</code></td><td>The <strong>full</strong> store type, so <code>set</code>/<code>get</code> can reach other slices</td><td><code>BearSlice &amp; FishSlice</code></td></tr>
        <tr><td><code>Mis</code></td><td>Mutators applied by middleware <em>around</em> the store. They change what
          <code>set</code>, <code>get</code> and <code>store</code> look like</td><td><code>[]</code> or <code>[['zustand/devtools', never]]</code></td></tr>
        <tr><td><code>Mos</code></td><td>Mutators this creator adds itself (only if the slice is middleware)</td><td><code>[]</code></td></tr>
        <tr><td><code>U</code></td><td>What this slice returns</td><td><code>BearSlice</code></td></tr>
      </table>

      <h3>Mutator identifiers</h3>
      <table>
        <tr><th>Middleware</th><th>Mutator tuple</th></tr>
        <tr><td><code>devtools</code></td><td><code>['zustand/devtools', never]</code></td></tr>
        <tr><td><code>persist</code></td><td><code>['zustand/persist', YourPersistedState]</code> (or <code>unknown</code>)</td></tr>
        <tr><td><code>immer</code></td><td><code>['zustand/immer', never]</code></td></tr>
        <tr><td><code>subscribeWithSelector</code></td><td><code>['zustand/subscribeWithSelector', never]</code></td></tr>
      </table>
      <p>List them in the same order as the wrapping, <strong>outermost first</strong>:
      <code>devtools(persist(immer(…)))</code> becomes
      <code>[['zustand/devtools', never], ['zustand/persist', unknown], ['zustand/immer', never]]</code>.
      Why does this matter? With <code>immer</code> in the list, TS lets <code>set</code> take a
      mutating draft function. With <code>devtools</code>, <code>set</code> gains a 3rd
      "action name" parameter.</p>
      <div class="tip">Write the tuple once and reuse it:
      <code>type Mws = [['zustand/devtools', never], ['zustand/immer', never]];</code> and
      <code>type Slice&lt;S&gt; = StateCreator&lt;Store, Mws, [], S&gt;;</code></div>
      <div class="warn">Apply middleware <strong>only once, on the combined store</strong>, never
      inside individual slices. The docs warn that middleware inside slices can cause unexpected
      issues. Every slice then declares the same <code>Mis</code>.</div>
    `,
    examples: [
      {
        title: 'Slices with devtools + immer (TypeScript, read-only)',
        runnable: false,
        code: `import { create, type StateCreator } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

interface BearSlice {
  bears: number;
  addBear: () => void;
  eatFish: () => void;
}

interface FishSlice {
  fishes: number;
  addFish: () => void;
}

type Store = BearSlice & FishSlice;

// devtools wraps immer → outermost first
type Mws = [['zustand/devtools', never], ['zustand/immer', never]];
type Slice<S> = StateCreator<Store, Mws, [], S>;

const createBearSlice: Slice<BearSlice> = (set) => ({
  bears: 0,
  // immer mutator: set accepts a draft-mutating function
  // devtools mutator: set accepts an action name (3rd param)
  addBear: () => set((s) => { s.bears += 1 }, undefined, 'bear/addBear'),
  eatFish: () => set((s) => { s.fishes -= 1 }, undefined, 'bear/eatFish'),
});

const createFishSlice: Slice<FishSlice> = (set) => ({
  fishes: 0,
  addFish: () => set((s) => { s.fishes += 1 }, undefined, 'fish/addFish'),
});

export const useBoundStore = create<Store>()(
  devtools(
    immer((...a) => ({
      ...createBearSlice(...a),
      ...createFishSlice(...a),
    })),
  ),
);

// ✗ If a slice declared [] instead of Mws, TS would complain that its set
//   doesn't match the one the middleware provides.`,
      },
      {
        title: 'The same slices, running in JS',
        code: `import { useRef } from 'react';
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// TS: const createBearSlice: StateCreator<Store, Mws, [], BearSlice> = ...
const createBearSlice = (set) => ({
  bears: 0,
  addBear: () => set((s) => { s.bears += 1 }, undefined, 'bear/addBear'),
  eatFish: () => set((s) => { s.fishes -= 1 }, undefined, 'bear/eatFish'),
});

const createFishSlice = (set) => ({
  fishes: 3,
  addFish: () => set((s) => { s.fishes += 1 }, undefined, 'fish/addFish'),
});

// Middleware only here, on the combined store
const useBoundStore = create()(
  devtools(
    immer((...a) => ({
      ...createBearSlice(...a),
      ...createFishSlice(...a),
    })),
    { name: 'lesson-ts-slices' }
  )
);

useBoundStore.subscribe((s, prev) => {
  console.log(\`bears \${prev.bears}→\${s.bears}, fishes \${prev.fishes}→\${s.fishes}\`);
});

export default function App() {
  const bears = useBoundStore((s) => s.bears);
  const fishes = useBoundStore((s) => s.fishes);
  const addBear = useBoundStore((s) => s.addBear);
  const eatFish = useBoundStore((s) => s.eatFish);
  const addFish = useBoundStore((s) => s.addFish);

  return (
    <div>
      <p>🐻 {bears} · 🐟 {fishes}</p>
      <button onClick={addBear}>add bear</button>
      <button onClick={addFish}>add fish</button>
      <button onClick={eatFish} disabled={fishes === 0}>
        bear eats fish
      </button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'In <code>StateCreator&lt;BearSlice &amp; FishSlice, [], [], BearSlice&gt;</code>, why is the first param the FULL store?',
        options: [
          'It\'s required by React',
          'So this slice\'s <code>set</code>/<code>get</code> can read and update other slices',
          'To enable persistence',
          'It isn\'t; it should be BearSlice',
        ],
        answer: 1,
        why: '<code>T</code> is the shape <code>set</code>/<code>get</code> work with. <code>U</code> (the 4th param) is what this slice returns.',
      },
      {
        q: 'The store is <code>create&lt;S&gt;()(devtools(immer(…)))</code>. What goes in each slice\'s second generic?',
        options: [
          '<code>[]</code>',
          '<code>[[\'zustand/immer\', never], [\'zustand/devtools\', never]]</code>',
          '<code>[[\'zustand/devtools\', never], [\'zustand/immer\', never]]</code>',
          '<code>[\'devtools\', \'immer\']</code>',
        ],
        answer: 2,
        why: 'Mutators are listed outermost first, matching the wrapping order: devtools, then immer.',
      },
      {
        q: 'Where should middleware like <code>persist</code> be applied when using slices?',
        options: [
          'Inside each slice',
          'Once, on the combined store',
          'On the React component',
          'Only on the first slice',
        ],
        answer: 1,
        why: 'The docs: apply middleware only in the combined store. Slices just declare the matching mutators in their <code>StateCreator</code> type.',
      },
      {
        q: 'What does adding <code>[\'zustand/immer\', never]</code> to a slice\'s mutators change?',
        options: [
          'Nothing at runtime or type level',
          'The slice\'s <code>set</code> type accepts a function that mutates a draft',
          'It installs immer automatically',
          'It makes state readonly',
        ],
        answer: 1,
        why: 'Mutators are type-level. They describe how middleware changed <code>set</code>/<code>get</code>/<code>store</code>. The actual <code>immer()</code> call is still on the combined store.',
      },
    ],
    exercise: {
      task: `
        <p>In JS, build two slices combined under <code>immer</code>:</p>
        <ul>
          <li><code>createAuthSlice</code>: <code>user: null</code>, <code>login(name)</code>, <code>logout()</code>.</li>
          <li><code>createCartSlice</code>: <code>items: []</code>, <code>addItem(name)</code> (mutate the draft with
            <code>push</code>) and <code>checkout()</code>. <code>checkout</code> reads
            <code>get().user</code> from the <em>other</em> slice: if logged out, log
            <code>login first</code>; otherwise log <code>&lt;user&gt; bought N items</code> and clear items.</li>
        </ul>
        <p>Apply <code>immer</code> only on the combined store. The hint shows the TS types.</p>`,
      starter: `import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const createAuthSlice = (set) => ({
  user: null,
  // TODO: login(name), logout()
});

const createCartSlice = (set, get) => ({
  items: [],
  // TODO: addItem(name), checkout()
});

const useShop = create()(
  immer((...a) => ({
    ...createAuthSlice(...a),
    ...createCartSlice(...a),
  }))
);

export default function App() {
  const user = useShop((s) => s.user);
  const items = useShop((s) => s.items);

  return (
    <div>
      <p>user: {user ?? '(logged out)'}</p>
      <p>cart: {items.join(', ') || '(empty)'}</p>
      {/* TODO: buttons for login / logout / add item / checkout */}
    </div>
  );
}`,
      hint: `TS: <code>type Shop = AuthSlice &amp; CartSlice;</code>
        <code>const createCartSlice: StateCreator&lt;Shop, [['zustand/immer', never]], [], CartSlice&gt; = (set, get) =&gt; …</code>.
        In JS: <code>addItem: (name) =&gt; set((s) =&gt; { s.items.push(name) })</code>, and in checkout
        <code>const { user, items } = get();</code>.`,
      solution: `import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

// TypeScript version:
// interface AuthSlice { user: string | null; login: (n: string) => void; logout: () => void }
// interface CartSlice { items: string[]; addItem: (n: string) => void; checkout: () => void }
// type Shop = AuthSlice & CartSlice;
// type Mws = [['zustand/immer', never]];
// const createAuthSlice: StateCreator<Shop, Mws, [], AuthSlice> = (set) => ({ ... });
// const createCartSlice: StateCreator<Shop, Mws, [], CartSlice> = (set, get) => ({ ... });
// const useShop = create<Shop>()(immer((...a) => ({ ... })));

const createAuthSlice = (set) => ({
  user: null,
  login: (name) => set((s) => { s.user = name }),
  logout: () => set((s) => { s.user = null }),
});

const createCartSlice = (set, get) => ({
  items: [],
  addItem: (name) => set((s) => { s.items.push(name) }),
  checkout: () => {
    const { user, items } = get(); // reads the auth slice too
    if (!user) {
      console.log('login first');
      return;
    }
    console.log(\`\${user} bought \${items.length} items\`);
    set((s) => { s.items = [] });
  },
});

const useShop = create()(
  immer((...a) => ({
    ...createAuthSlice(...a),
    ...createCartSlice(...a),
  }))
);

export default function App() {
  const user = useShop((s) => s.user);
  const items = useShop((s) => s.items);
  const login = useShop((s) => s.login);
  const logout = useShop((s) => s.logout);
  const addItem = useShop((s) => s.addItem);
  const checkout = useShop((s) => s.checkout);

  return (
    <div>
      <p>user: {user ?? '(logged out)'}</p>
      <p>cart: {items.join(', ') || '(empty)'}</p>
      {user ? (
        <button onClick={logout}>logout</button>
      ) : (
        <button onClick={() => login('Ana')}>login as Ana</button>
      )}
      <button onClick={() => addItem('🍎')}>add 🍎</button>
      <button onClick={checkout}>checkout</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── testing
  {
    id: 'testing',
    section: 'Advanced & TypeScript',
    title: 'Testing stores',
    explain: `
      <p>A Zustand store is a plain object, so most store logic can be tested <strong>without
      rendering anything</strong>. Call an action through <code>getState()</code>, then check
      <code>getState()</code>:</p>
      <pre><code>useCounterStore.getState().inc();
expect(useCounterStore.getState().count).toBe(1);</code></pre>

      <h3>The catch: stores are module singletons</h3>
      <p>A store made with <code>create</code> at module level lives for the whole test file (and
      across files if the module is shared). State from test A leaks into test B. Reset between
      tests:</p>
      <pre><code>beforeEach(() =&gt; {
  useCounterStore.setState(useCounterStore.getInitialState(), true);
});</code></pre>
      <p><code>getInitialState()</code> includes the actions, so replacing (<code>true</code>) is safe.</p>

      <h3>Resetting every store automatically (official recommendation)</h3>
      <p>The Zustand testing guide suggests a <code>__mocks__/zustand.ts</code> file. It wraps
      <code>create</code> and <code>createStore</code>, remembers each store's initial state, and
      resets <em>all</em> stores after each test (inside <code>act</code>). With Vitest you enable it
      with <code>vi.mock('zustand')</code> in a setup file. With Jest a root-level
      <code>__mocks__</code> folder is picked up automatically (it uses
      <code>jest.requireActual</code> instead of <code>vi.importActual</code>).</p>

      <h3>Testing components and hooks</h3>
      <ul>
        <li>Components: render with <code>@testing-library/react</code> as usual. The real store is used.</li>
        <li>Hooks: <code>renderHook(() =&gt; useCounterStore((s) =&gt; s.count))</code>, and wrap store
          changes in <code>act(…)</code>.</li>
        <li>Stores from <code>createStore</code> + Context: create a <strong>fresh store per test</strong>
          and pass it to the Provider. No global reset needed.</li>
        <li>Seed any scenario with <code>setState({ … })</code> instead of clicking through the UI.</li>
      </ul>
      <div class="tip">Keep logic in actions (not components). Then most of your tests are plain
      function calls, and fast.</div>
    `,
    examples: [
      {
        title: 'Vitest: store logic + renderHook (read-only)',
        runnable: false,
        code: `// counter-store.ts
import { create } from 'zustand';

interface CounterState {
  count: number;
  inc: () => void;
}

export const useCounterStore = create<CounterState>()((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));

// counter-store.test.ts
import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useCounterStore } from './counter-store';

beforeEach(() => {
  // reset (not needed if you use the __mocks__/zustand.ts file)
  useCounterStore.setState(useCounterStore.getInitialState(), true);
});

describe('counter store', () => {
  it('increments', () => {
    useCounterStore.getState().inc();
    expect(useCounterStore.getState().count).toBe(1);
  });

  it('starts fresh in every test', () => {
    expect(useCounterStore.getState().count).toBe(0);
  });

  it('can be seeded with setState', () => {
    useCounterStore.setState({ count: 41 });
    useCounterStore.getState().inc();
    expect(useCounterStore.getState().count).toBe(42);
  });

  it('works through the hook', () => {
    const { result } = renderHook(() => useCounterStore((s) => s.count));
    expect(result.current).toBe(0);
    act(() => useCounterStore.getState().inc());
    expect(result.current).toBe(1);
  });
});`,
      },
      {
        title: '__mocks__/zustand.ts: reset all stores after each test (read-only, from the docs)',
        runnable: false,
        code: `// __mocks__/zustand.ts  (Vitest version from the Zustand testing guide)
import { act } from '@testing-library/react';
import type * as ZustandExportedTypes from 'zustand';
export * from 'zustand';

const { create: actualCreate, createStore: actualCreateStore } =
  await vi.importActual<typeof ZustandExportedTypes>('zustand');

// a reset function for every store created during tests
export const storeResetFns = new Set<() => void>();

const createUncurried = <T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  const store = actualCreate(stateCreator);
  const initialState = store.getInitialState();
  storeResetFns.add(() => {
    store.setState(initialState, true);
  });
  return store;
};

// supports both create(fn) and create<T>()(fn)
export const create = (<T>(stateCreator: ZustandExportedTypes.StateCreator<T>) => {
  return typeof stateCreator === 'function'
    ? createUncurried(stateCreator)
    : createUncurried;
}) as typeof ZustandExportedTypes.create;

// ...createStore is wrapped the same way with actualCreateStore...

afterEach(() => {
  act(() => {
    storeResetFns.forEach((resetFn) => {
      resetFn();
    });
  });
});

// setup-vitest.ts
//   import '@testing-library/jest-dom/vitest';
//   vi.mock('zustand');
//
// vitest.config.ts → test: { globals: true, environment: 'jsdom',
//                            setupFiles: ['./setup-vitest.ts'] }`,
      },
      {
        title: 'A tiny test runner for a vanilla store (runs here)',
        lang: 'js',
        code: `import { createStore } from 'zustand/vanilla';

// ---------- the store under test ----------
const cartStore = createStore((set, get) => ({
  items: [],
  add: (name, price) =>
    set((s) => {
      const found = s.items.find((i) => i.name === name);
      if (found) {
        return {
          items: s.items.map((i) => (i.name === name ? { ...i, qty: i.qty + 1 } : i)),
        };
      }
      return { items: [...s.items, { name, price, qty: 1 }] };
    }),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
}));

// ---------- a 15-line test runner ----------
const results = [];

function test(name, fn) {
  cartStore.setState(cartStore.getInitialState(), true); // reset before EACH test
  try {
    fn();
    results.push('✓ ' + name);
  } catch (e) {
    results.push('✗ ' + name + ' → ' + e.message);
  }
}

function expectEqual(actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(\`expected \${b}, got \${a}\`);
}

// ---------- the tests ----------
test('starts empty', () => {
  expectEqual(cartStore.getState().items, []);
});

test('add puts an item in the cart', () => {
  cartStore.getState().add('apple', 2);
  expectEqual(cartStore.getState().items.length, 1);
});

test('adding the same item bumps qty', () => {
  cartStore.getState().add('apple', 2);
  cartStore.getState().add('apple', 2);
  expectEqual(cartStore.getState().items, [{ name: 'apple', price: 2, qty: 2 }]);
});

test('total multiplies price by qty (seeded with setState)', () => {
  cartStore.setState({
    items: [
      { name: 'a', price: 2, qty: 3 },
      { name: 'b', price: 5, qty: 1 },
    ],
  });
  expectEqual(cartStore.getState().total(), 11);
});

test('subscribe gets (state, prev)', () => {
  const calls = [];
  const unsub = cartStore.subscribe((s, prev) =>
    calls.push([prev.items.length, s.items.length])
  );
  cartStore.getState().add('pear', 1);
  unsub();
  expectEqual(calls, [[0, 1]]);
});

results.forEach((line) => console.log(line));
const failed = results.filter((r) => r.startsWith('✗')).length;
document.getElementById('root').textContent =
  \`\${results.length - failed} passed, \${failed} failed\`;`,
      },
    ],
    quiz: [
      {
        q: 'Why do tests need to reset a module-level Zustand store?',
        options: [
          'Zustand throws if a store is reused',
          'The store is a singleton, so state from one test leaks into the next',
          'React requires it',
          'To clear localStorage',
        ],
        answer: 1,
        why: 'The module is loaded once, so the store object lives on between tests unless you reset it.',
      },
      {
        q: 'Which line fully resets a store, actions included?',
        options: [
          '<code>store.setState({})</code>',
          '<code>store.setState(store.getInitialState(), true)</code>',
          '<code>store.destroy()</code>',
          '<code>store.subscribe(null)</code>',
        ],
        answer: 1,
        why: '<code>getInitialState()</code> returns the original state (actions included), and <code>true</code> replaces instead of merging. <code>destroy</code> no longer exists in v5.',
      },
      {
        q: 'What does the docs\' <code>__mocks__/zustand.ts</code> do?',
        options: [
          'Replaces Zustand with a fake that never updates',
          'Wraps create/createStore to record each store\'s initial state and resets all stores after each test',
          'Makes stores render faster',
          'Turns off selectors',
        ],
        answer: 1,
        why: 'It keeps a Set of reset functions and runs them in <code>afterEach</code> inside <code>act</code>.',
      },
      {
        q: 'Best way to test that <code>inc</code> works, without React?',
        options: [
          'Render a component and click a button',
          '<code>store.getState().inc()</code> then assert <code>store.getState().count</code>',
          'Snapshot the component',
          'You can\'t test stores without React',
        ],
        answer: 1,
        why: 'Store logic is plain functions. Call them and check the resulting state.',
      },
      {
        q: 'Using <code>createStore</code> + Context, how do you isolate tests?',
        options: [
          'Use the global reset mock only',
          'Create a fresh store in each test and pass it to the Provider',
          'Reload the page',
          'Call <code>useStore.reset()</code>',
        ],
        answer: 1,
        why: 'Each test owns its own store instance, so nothing is shared and nothing needs resetting.',
      },
    ],
    exercise: {
      lang: 'js',
      task: `
        <p>A bank account store is given. Write <strong>at least 3 more tests</strong> using the
        tiny runner:</p>
        <ul>
          <li><code>deposit</code> adds to the balance.</li>
          <li><code>withdraw</code> subtracts and returns <code>true</code> when there's enough money.</li>
          <li><code>withdraw</code> more than the balance returns <code>false</code> and leaves the balance unchanged.</li>
          <li>Bonus: <code>history</code> records each successful operation.</li>
        </ul>
        <p>All lines in the console should start with ✓. The runner resets the store before each
        test.</p>`,
      starter: `import { createStore } from 'zustand/vanilla';

const account = createStore((set, get) => ({
  balance: 0,
  history: [],
  deposit: (amount) =>
    set((s) => ({ balance: s.balance + amount, history: [...s.history, +amount] })),
  withdraw: (amount) => {
    if (amount > get().balance) return false;
    set((s) => ({ balance: s.balance - amount, history: [...s.history, -amount] }));
    return true;
  },
}));

function test(name, fn) {
  account.setState(account.getInitialState(), true);
  try {
    fn();
    console.log('✓ ' + name);
  } catch (e) {
    console.log('✗ ' + name + ' → ' + e.message);
  }
}

function expectEqual(actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(\`expected \${b}, got \${a}\`);
}

test('starts at 0', () => {
  expectEqual(account.getState().balance, 0);
});

// TODO: deposit, withdraw ok, withdraw too much, history`,
      hint: 'Seed with <code>account.getState().deposit(100)</code> (or <code>account.setState({ balance: 100 })</code>), call <code>const ok = account.getState().withdraw(30)</code>, then <code>expectEqual(ok, true)</code> and <code>expectEqual(account.getState().balance, 70)</code>.',
      solution: `import { createStore } from 'zustand/vanilla';

const account = createStore((set, get) => ({
  balance: 0,
  history: [],
  deposit: (amount) =>
    set((s) => ({ balance: s.balance + amount, history: [...s.history, +amount] })),
  withdraw: (amount) => {
    if (amount > get().balance) return false;
    set((s) => ({ balance: s.balance - amount, history: [...s.history, -amount] }));
    return true;
  },
}));

function test(name, fn) {
  account.setState(account.getInitialState(), true);
  try {
    fn();
    console.log('✓ ' + name);
  } catch (e) {
    console.log('✗ ' + name + ' → ' + e.message);
  }
}

function expectEqual(actual, expected) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a !== b) throw new Error(\`expected \${b}, got \${a}\`);
}

test('starts at 0', () => {
  expectEqual(account.getState().balance, 0);
});

test('deposit adds to the balance', () => {
  account.getState().deposit(50);
  expectEqual(account.getState().balance, 50);
});

test('withdraw subtracts and returns true', () => {
  account.getState().deposit(100);
  const ok = account.getState().withdraw(30);
  expectEqual(ok, true);
  expectEqual(account.getState().balance, 70);
});

test('withdraw too much returns false and keeps balance', () => {
  account.setState({ balance: 20 });
  const ok = account.getState().withdraw(50);
  expectEqual(ok, false);
  expectEqual(account.getState().balance, 20);
});

test('history records successful operations only', () => {
  account.getState().deposit(10);
  account.getState().withdraw(4);
  account.getState().withdraw(999);
  expectEqual(account.getState().history, [10, -4]);
});`,
    },
  },

  // ───────────────────────────────────────────────────────────── pitfalls
  {
    id: 'pitfalls',
    section: 'Advanced & TypeScript',
    title: 'Common pitfalls & best practices',
    explain: `
      <p>Most Zustand bugs come from a handful of patterns. Learn to spot them.</p>

      <h3>1. Subscribing to the whole store</h3>
      <pre><code>const { bears } = useBearStore();          // ❌ re-renders on ANY change
const bears = useBearStore((s) =&gt; s.bears);  // ✅ only when bears changes</code></pre>

      <h3>2. Returning a new object/array from a selector</h3>
      <pre><code>useBearStore((s) =&gt; ({ a: s.a, b: s.b }));        // ❌ new object every call
useBearStore((s) =&gt; s.todos.filter((t) =&gt; t.done)); // ❌ new array every call

useBearStore(useShallow((s) =&gt; ({ a: s.a, b: s.b }))); // ✅
const a = useBearStore((s) =&gt; s.a);                  // ✅ or separate selectors</code></pre>
      <p>In v5 selectors are compared with <code>Object.is</code>, so a fresh object always
      looks "changed". Best case that's extra renders. Often it's an infinite loop:
      <em>Maximum update depth exceeded</em>. Use <code>useShallow</code>, or select the raw array
      and derive with <code>useMemo</code>.</p>

      <h3>3. Mutating state</h3>
      <pre><code>set((s) =&gt; { s.todos.push(t); return { todos: s.todos }; }); // ❌ same array reference
set((s) =&gt; ({ todos: [...s.todos, t] }));                    // ✅ new array</code></pre>
      <p>Selectors like <code>(s) =&gt; s.todos</code> see the same reference and skip the
      re-render. The UI goes stale. Copy, or use the <code>immer</code> middleware.</p>

      <h3>4. Storing derived data</h3>
      <p>Don't keep <code>total</code> or <code>doneCount</code> next to the data they come from.
      Sooner or later an action forgets to update them. Compute them in a selector:
      <code>useTodos((s) =&gt; s.todos.filter((t) =&gt; t.done).length)</code> (returns a number, so it's stable).</p>

      <h3>5. Exporting the raw store everywhere</h3>
      <p>Export small <strong>custom hooks</strong> (<code>useCartTotal</code>,
      <code>useCartActions</code>) instead of the store itself. Components can't accidentally
      subscribe to everything, and you can change the store's shape without touching every caller.
      A popular pattern keeps actions in a nested <code>actions</code> object. It never changes, so
      <code>useCartActions()</code> never causes re-renders.</p>

      <h3>6. Putting server data in Zustand</h3>
      <p>Fetched data needs caching, dedupe, refetch-on-focus, invalidation, retries… That's
      <strong>server state</strong>, and TanStack Query does it for you. Keep Zustand for
      <strong>client state</strong>: UI toggles, selections, drafts, preferences.</p>

      <h3>7. Global stores with SSR (Next.js, etc.)</h3>
      <p>On a server, a module-level store is shared by <strong>every request</strong>. One
      user's data can leak into another user's HTML. For SSR, create a store <em>per request</em>:
      a <code>createStore</code> factory plus a Context Provider (the createStore + context lesson),
      and don't read or write global stores during server rendering.</p>

      <h3>8. <code>setState(x, true)</code> by accident</h3>
      <p><code>replace = true</code> throws away every key not in <code>x</code>, including actions.</p>
      <div class="tip">A quick check: add a render counter (<code>useRef</code> incremented in the body)
      to a component you suspect. If it climbs when unrelated state changes, check its selector.</div>
    `,
    examples: [
      {
        title: 'Spot the bugs (use the render counters)',
        code: `import { useRef } from 'react';
import { create } from 'zustand';

const useTodos = create((set) => ({
  todos: [],
  draft: '',
  setDraft: (draft) => set({ draft }),
  addV1: () =>
    set((s) => {
      s.todos.push(s.draft);
      return { todos: s.todos, draft: '' };
    }),
  addV2: () => set((s) => ({ todos: [...s.todos, s.draft], draft: '' })),
}));

function useRenders() {
  const n = useRef(0);
  n.current++;
  return n.current;
}

function Header() {
  const renders = useRenders();
  const { todos } = useTodos();
  return <h4>Header: {todos.length} todos (renders: {renders})</h4>;
}

function Footer() {
  const renders = useRenders();
  const count = useTodos((s) => s.todos.length);
  return <small>Footer: {count} todos (renders: {renders})</small>;
}

function TodoList() {
  const todos = useTodos((s) => s.todos);
  return (
    <ul>
      {todos.map((t, i) => (
        <li key={i}>{t}</li>
      ))}
    </ul>
  );
}

function Editor() {
  const draft = useTodos((s) => s.draft);
  const setDraft = useTodos((s) => s.setDraft);
  const addV1 = useTodos((s) => s.addV1);
  const addV2 = useTodos((s) => s.addV2);
  return (
    <div>
      <input value={draft} onChange={(e) => setDraft(e.target.value)} />
      <button onClick={addV1}>Add (version 1)</button>
      <button onClick={addV2}>Add (version 2)</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Header />
      <Editor />
      <TodoList />
      <Footer />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: type "milk", Add (version 1), type "eggs", Add (version 2)</summary>
            <table>
              <tr><th>Step</th><th>Header renders</th><th>Footer renders</th><th>List shows</th></tr>
              <tr><td>Mount</td><td>1</td><td>1</td><td>(empty)</td></tr>
              <tr><td>Type "milk" (4 keys)</td><td>5 ❗</td><td>1</td><td>(empty)</td></tr>
              <tr><td>Add (version 1)</td><td>6 (shows 1 todos)</td><td>2 (shows 1)</td><td><strong>(empty) ❌</strong></td></tr>
              <tr><td>Type "eggs" (4 keys)</td><td>10 ❗</td><td>2</td><td>(empty)</td></tr>
              <tr><td>Add (version 2)</td><td>11 (2 todos)</td><td>3 (2)</td><td>milk, eggs ✅</td></tr>
            </table>
          </details>
          <details>
            <summary>Answer: bug A, whole-store subscription in <code>Header</code></summary>
            <p><code>const { todos } = useTodos()</code> has no selector, so <code>Header</code>
            subscribes to the <em>entire</em> state, and <code>draft</code> changes on every
            keystroke. Fix: <code>const todos = useTodos((s) =&gt; s.todos)</code>, or better
            <code>(s) =&gt; s.todos.length</code>, like <code>Footer</code>.</p>
          </details>
          <details>
            <summary>Answer: bug B, <code>addV1</code> mutates the array</summary>
            <p><code>s.todos.push(…)</code> changes the existing array and returns the <em>same</em>
            reference. <code>TodoList</code>'s selector <code>(s) =&gt; s.todos</code> returns the
            same array as before, <code>Object.is</code> says "unchanged", and there's no re-render.
            <code>Footer</code> updates only because <code>.length</code> is a new number, and
            <code>Header</code> because it re-renders on everything. Mixed signals like that are
            classic mutation symptoms.</p>
            <p>Fix: <code>addV2</code> builds a new array: <code>[...s.todos, s.draft]</code>. Once
            anything re-renders <code>TodoList</code>, the mutated "milk" shows up too.</p>
            <div class="warn">Bug A can <em>hide</em> bug B. A component that re-renders on
            everything "accidentally" shows mutated data. Fix the selectors, and the mutation bug
            surfaces.</div>
          </details>
        `,
      },
      {
        title: 'Best practice: private store, custom hooks, actions namespace, derived selectors',
        code: `import { useRef } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

let nextId = 1;

// In a real app this lives in cart-store.js and is NOT exported
const useCartStore = create((set) => ({
  items: [],
  actions: {
    add: (name, price) =>
      set((s) => ({ items: [...s.items, { id: nextId++, name, price }] })),
    clear: () => set({ items: [] }),
  },
}));

// ✅ Export these instead
const useCartNames = () => useCartStore(useShallow((s) => s.items.map((i) => i.name)));
const useCartTotal = () =>
  useCartStore((s) => s.items.reduce((sum, i) => sum + i.price, 0));
const useCartActions = () => useCartStore((s) => s.actions); // never changes

function Buttons() {
  const renders = useRef(0);
  renders.current++;
  const { add, clear } = useCartActions();
  return (
    <div>
      <button onClick={() => add('Tea', 3)}>+ Tea</button>
      <button onClick={() => add('Cake', 4.5)}>+ Cake</button>
      <button onClick={clear}>clear</button>
      <small> Buttons renders: {renders.current}</small>
    </div>
  );
}

function Summary() {
  const names = useCartNames();
  const total = useCartTotal();
  return (
    <p>
      {names.join(', ') || '(empty)'}: total \${total.toFixed(2)}
    </p>
  );
}

export default function App() {
  return (
    <div>
      <Buttons />
      <Summary />
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'In v5, what can <code>useStore((s) =&gt; ({ a: s.a, b: s.b }))</code> cause?',
        options: [
          'Nothing; Zustand compares shallowly by default',
          'A new object every call, so it re-renders on every change or loops forever ("Maximum update depth exceeded")',
          'A TypeScript error only',
          'The store to reset',
        ],
        answer: 1,
        why: 'v5 compares selector results with <code>Object.is</code>. Wrap with <code>useShallow</code> or use separate selectors.',
      },
      {
        q: 'An action does <code>s.items.push(x); return { items: s.items }</code>. What happens to a component using <code>(s) =&gt; s.items</code>?',
        options: [
          'It updates normally',
          'It does not re-render: the reference is the same',
          'It throws',
          'It re-renders twice',
        ],
        answer: 1,
        why: 'Same reference means <code>Object.is</code> says unchanged. Create a new array or use immer.',
      },
      {
        q: 'Where should a <code>total</code> computed from <code>items</code> live?',
        options: [
          'As a separate state field updated by every action',
          'Computed in a selector (or a helper) from items',
          'In localStorage',
          'In a useEffect that syncs it',
        ],
        answer: 1,
        why: 'Derived data stored separately goes out of sync. A selector that returns a number is stable and always correct.',
      },
      {
        q: 'Why are module-level stores risky with SSR?',
        options: [
          'They don\'t work on the server at all',
          'The same store instance is shared across all requests, so data can leak between users',
          'They slow down hydration',
          'Selectors are disabled on the server',
        ],
        answer: 1,
        why: 'Create one store per request (createStore factory + Context Provider).',
      },
      {
        q: 'Your app fetches a product list, needs caching and refetch on window focus. Best home for it?',
        options: [
          'A Zustand store with a fetch action',
          'TanStack Query',
          'React Context',
          'localStorage',
        ],
        answer: 1,
        why: 'That\'s server state. TanStack Query handles caching, dedupe, refetching and invalidation. Keep Zustand for client state.',
      },
    ],
    exercise: {
      task: `
        <p>This task list has <strong>three bugs</strong> from this lesson. Fix them all:</p>
        <ol>
          <li><code>TaskList</code> subscribes to the whole store.</li>
          <li><code>toggle</code> mutates a task object in place.</li>
          <li><code>doneCount</code> is stored derived data and never updates ("0 / 2 done" forever).</li>
        </ol>
        <p>Notice that the checkboxes <em>seem</em> to work right now. Bug 1 hides bug 2. After you fix
        bug 1 alone, toggling stops working until you fix bug 2 too.</p>`,
      starter: `import { create } from 'zustand';

const useTasks = create((set) => ({
  tasks: [
    { id: 1, title: 'Learn selectors', done: false },
    { id: 2, title: 'Write tests', done: false },
  ],
  doneCount: 0,
  toggle: (id) =>
    set((s) => {
      const task = s.tasks.find((t) => t.id === id);
      task.done = !task.done;
      return { tasks: s.tasks };
    }),
}));

function TaskList() {
  const { tasks, toggle } = useTasks();
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            {t.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

function Summary() {
  const doneCount = useTasks((s) => s.doneCount);
  const total = useTasks((s) => s.tasks.length);
  return (
    <p>
      {doneCount} / {total} done
    </p>
  );
}

export default function App() {
  return (
    <div>
      <TaskList />
      <Summary />
    </div>
  );
}`,
      hint: 'Selectors: <code>useTasks((s) =&gt; s.tasks)</code> and <code>useTasks((s) =&gt; s.toggle)</code>. Toggle immutably: <code>tasks: s.tasks.map((t) =&gt; (t.id === id ? { ...t, done: !t.done } : t))</code>. Delete <code>doneCount</code> and select <code>(s) =&gt; s.tasks.filter((t) =&gt; t.done).length</code>.',
      solution: `import { create } from 'zustand';

const useTasks = create((set) => ({
  tasks: [
    { id: 1, title: 'Learn selectors', done: false },
    { id: 2, title: 'Write tests', done: false },
  ],
  // ✅ 3: no stored doneCount; it's derived in Summary's selector
  toggle: (id) =>
    set((s) => ({
      // ✅ 2: new array + new task object
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

function TaskList() {
  // ✅ 1: select only what this component needs
  const tasks = useTasks((s) => s.tasks);
  const toggle = useTasks((s) => s.toggle);
  return (
    <ul>
      {tasks.map((t) => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
            {t.title}
          </label>
        </li>
      ))}
    </ul>
  );
}

function Summary() {
  const doneCount = useTasks((s) => s.tasks.filter((t) => t.done).length);
  const total = useTasks((s) => s.tasks.length);
  return (
    <p>
      {doneCount} / {total} done
    </p>
  );
}

export default function App() {
  return (
    <div>
      <TaskList />
      <Summary />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── vs-others
  {
    id: 'vs-others',
    section: 'Advanced & TypeScript',
    title: 'Zustand vs Context, Redux Toolkit, Jotai, TanStack Query',
    explain: `
      <p>None of these tools is "the best". They solve different problems, and many apps use two
      or three together.</p>
      <table>
        <tr><th>Tool</th><th>Mental model</th><th>Re-renders</th><th>Great for</th></tr>
        <tr><td><strong>React Context</strong></td><td>A way to <em>pass</em> a value down the tree
          (dependency injection), not a state manager</td><td>Every consumer re-renders when the value
          changes. No selectors.</td><td>Rarely-changing values: theme, locale, current user,
          injecting a store instance</td></tr>
        <tr><td><strong>Zustand</strong></td><td>One (or a few) external stores + selector hooks</td>
          <td>Only components whose selected value changed</td><td>Global client state with little
          boilerplate. No Provider needed.</td></tr>
        <tr><td><strong>Redux Toolkit</strong></td><td>Single store, actions → reducers, strict conventions</td>
          <td>Selector-based (<code>useSelector</code>), like Zustand</td><td>Large teams that want
          enforced patterns, middleware, time-travel devtools, RTK Query</td></tr>
        <tr><td><strong>Jotai</strong></td><td>Many small <em>atoms</em>, composed bottom-up; derived atoms</td>
          <td>Per atom</td><td>Lots of independent or derived pieces of state (editors, forms,
          dashboards)</td></tr>
        <tr><td><strong>TanStack Query</strong></td><td>A cache for <em>server</em> state</td><td>Per
          query (with select)</td><td>Fetching, caching, dedupe, refetch, invalidation. Not for
          client UI state.</td></tr>
      </table>

      <h3>How to choose</h3>
      <ul>
        <li>Data comes from an API? → <strong>TanStack Query</strong> (or RTK Query).</li>
        <li>Value rarely changes and just needs to reach deep components? → <strong>Context</strong>.</li>
        <li>Shared client state that changes often, read by many components? → <strong>Zustand</strong>.</li>
        <li>Big team, want one prescribed way of doing everything? → <strong>Redux Toolkit</strong>.</li>
        <li>State is naturally a graph of small derived values? → <strong>Jotai</strong>.</li>
      </ul>
      <div class="tip">A very common combo: <strong>TanStack Query</strong> for server data +
      <strong>Zustand</strong> for client state + <strong>Context</strong> only to inject per-request
      or per-component Zustand stores.</div>
      <div class="warn">"Context is slow" is a myth. Context is fine for values that rarely change.
      It becomes a problem when one big, frequently-changing value is read by many components,
      because every consumer re-renders. The demo below shows that.</div>
    `,
    examples: [
      {
        title: 'Context re-renders all consumers; a Zustand selector re-renders one',
        code: `import { createContext, useContext, useRef, useState } from 'react';
import { create } from 'zustand';

function useRenderCount(label) {
  const n = useRef(0);
  n.current++;
  console.log(\`render \${label} #\${n.current}\`);
  return n.current;
}

function Row({ label, value, renders }) {
  return (
    <div>
      {label}: {value} <small style={{ color: 'gray' }}>(renders: {renders})</small>
    </div>
  );
}

// ---------- React Context ----------
const Ctx = createContext(null);

function CtxProvider({ children }) {
  const [state, setState] = useState({ a: 0, b: 0 });
  return (
    <Ctx.Provider value={state}>
      <button onClick={() => setState((s) => ({ ...s, a: s.a + 1 }))}>
        Context: a + 1
      </button>
      {children}
    </Ctx.Provider>
  );
}

function CtxA() {
  const renders = useRenderCount('Ctx A');
  const { a } = useContext(Ctx);
  return <Row label="Ctx A" value={a} renders={renders} />;
}

function CtxB() {
  const renders = useRenderCount('Ctx B');
  const { b } = useContext(Ctx);
  return <Row label="Ctx B" value={b} renders={renders} />;
}

// ---------- Zustand ----------
const useAB = create((set) => ({
  a: 0,
  b: 0,
  incA: () => set((s) => ({ a: s.a + 1 })),
}));

function ZusA() {
  const renders = useRenderCount('Zustand A');
  const a = useAB((s) => s.a);
  return <Row label="Zustand A" value={a} renders={renders} />;
}

function ZusB() {
  const renders = useRenderCount('Zustand B');
  const b = useAB((s) => s.b);
  return <Row label="Zustand B" value={b} renders={renders} />;
}

const box = { flex: 1, padding: 8, border: '1px solid #c5c9d6', borderRadius: 6 };

export default function App() {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <section style={box}>
        <h4>React Context</h4>
        <CtxProvider>
          <CtxA />
          <CtxB />
        </CtxProvider>
      </section>
      <section style={box}>
        <h4>Zustand</h4>
        <button onClick={() => useAB.getState().incA()}>Zustand: a + 1</button>
        <ZusA />
        <ZusB />
      </section>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: Context has no selectors</summary>
            <p>Both sides hold <code>{ a, b }</code>, and both buttons change only <code>a</code>.
            <code>CtxB</code> and <code>ZusB</code> only display <code>b</code>, so ideally they'd
            never re-render. With Context, <code>useContext(Ctx)</code> subscribes a component to the
            <strong>whole value</strong>. When the value changes, every consumer re-renders, whether it
            cares about <code>a</code> or not.</p>
            <p>That's harmless for 2 components and a click. It hurts with 200 consumers and a value
            that changes on every keystroke.</p>
          </details>
          <details>
            <summary>Step by step: mount, click "Context: a + 1", click "Zustand: a + 1"</summary>
            <table>
              <tr><th>Step</th><th>What happens</th><th>Console</th></tr>
              <tr><td>Mount</td><td>Everything renders once</td><td><code>render Ctx A #1</code><br><code>render Ctx B #1</code><br><code>render Zustand A #1</code><br><code>render Zustand B #1</code></td></tr>
              <tr><td>Click <b>Context: a + 1</b></td><td><code>setState</code> creates a new <code>{ a: 1, b: 0 }</code> object → new Provider value → React re-renders <em>every</em> consumer</td><td><code>render Ctx A #2</code><br><code>render Ctx B #2</code> ❗</td></tr>
              <tr><td>Click <b>Zustand: a + 1</b></td><td>Store notifies both subscribers. <code>ZusA</code>'s selector returns 1 (changed) → render. <code>ZusB</code>'s returns 0 (<code>Object.is</code> equal) → skipped.</td><td><code>render Zustand A #2</code></td></tr>
            </table>
            <p>After three more clicks on each button: Ctx A and Ctx B both show <code>renders: 5</code>.
            Zustand A shows 5 and Zustand B stays at <strong>1</strong>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>&lt;Ctx.Provider value={state}&gt;          // ① new object on every setState
const { b } = useContext(Ctx);         // ② subscribes to the WHOLE value

const b = useAB((s) =&gt; s.b);          // ③ subscribes to one field
{children}                             // ④ elements from App, not re-created</code></pre>
            <ol>
              <li><strong>①</strong> <code>setState((s) =&gt; ({ ...s, a: s.a + 1 }))</code> makes a new object. React compares
                Provider values with <code>Object.is</code>, sees a change, and notifies all consumers.</li>
              <li><strong>②</strong> Destructuring <code>b</code> doesn't narrow the subscription. React doesn't know which fields you read.</li>
              <li><strong>③</strong> Zustand runs the selector after each change and re-renders only if its <em>result</em> changed.</li>
              <li><strong>④</strong> <code>CtxA</code>/<code>CtxB</code> are passed as <code>children</code>, so the Provider
                re-rendering doesn't re-render them by itself. The re-renders you see come <em>only</em> from context.
                The comparison is fair.</li>
            </ol>
          </details>
          <details>
            <summary>Try this / common mistakes</summary>
            <ul>
              <li>Wrap <code>CtxB</code> in <code>memo</code>. It still re-renders. <code>memo</code> can't block context updates.</li>
              <li>Split into two contexts (<code>ACtx</code>, <code>BCtx</code>). Now <code>CtxB</code> stays quiet. That
                works, but you need one context (and Provider) per value. Zustand gives you that granularity for free.</li>
              <li>Add <code>incB</code> to the store and a button for it. Now only <code>ZusB</code> re-renders.</li>
            </ul>
            <div class="tip"><code>useMemo</code> on the Provider value only helps when the <em>Provider</em>
            re-renders for unrelated reasons. It doesn't help when the value really changes.</div>
          </details>
        `,
      },
      {
        title: 'The same counter in four libraries (read-only)',
        runnable: false,
        code: `// ── React Context ──────────────────────────────
const CountCtx = createContext(null);
function CountProvider({ children }) {
  const [count, setCount] = useState(0);
  const value = useMemo(() => ({ count, inc: () => setCount((c) => c + 1) }), [count]);
  return <CountCtx.Provider value={value}>{children}</CountCtx.Provider>;
}
// const { count, inc } = useContext(CountCtx);   (needs <CountProvider> above)

// ── Zustand ────────────────────────────────────
const useCount = create((set) => ({
  count: 0,
  inc: () => set((s) => ({ count: s.count + 1 })),
}));
// const count = useCount((s) => s.count);        (no Provider)

// ── Redux Toolkit ──────────────────────────────
const counterSlice = createSlice({
  name: 'counter',
  initialState: { count: 0 },
  reducers: { inc: (state) => { state.count += 1 } },
});
const store = configureStore({ reducer: { counter: counterSlice.reducer } });
// <Provider store={store}> … const count = useSelector((s) => s.counter.count);
// dispatch(counterSlice.actions.inc());

// ── Jotai ──────────────────────────────────────
const countAtom = atom(0);
const doubleAtom = atom((get) => get(countAtom) * 2); // derived atom
// const [count, setCount] = useAtom(countAtom);

// ── TanStack Query (server state, different job) ──
// const { data, isPending } = useQuery({
//   queryKey: ['count'],
//   queryFn: () => fetch('/api/count').then((r) => r.json()),
// });`,
      },
    ],
    quiz: [
      {
        q: 'A Context value <code>{ a, b }</code> changes only <code>a</code>. Which consumers re-render?',
        options: [
          'Only those that read <code>a</code>',
          'All consumers of that context',
          'None until the Provider unmounts',
          'Only memoized ones',
        ],
        answer: 1,
        why: 'Context has no selectors. A new value re-renders every component that calls <code>useContext</code> on it.',
      },
      {
        q: 'Does wrapping a context consumer in <code>React.memo</code> stop context-triggered re-renders?',
        options: [
          'Yes',
          'No. memo only skips renders caused by the parent with equal props.',
          'Only in StrictMode',
          'Only with useMemo on the value',
        ],
        answer: 1,
        why: 'Context updates bypass <code>memo</code>. Split contexts or use a store with selectors.',
      },
      {
        q: 'Best fit for fetching, caching and refetching a list of products from an API?',
        options: ['Zustand', 'React Context', 'TanStack Query', 'Jotai'],
        answer: 2,
        why: 'That\'s server state. TanStack Query handles caching, dedupe, background refetch and invalidation.',
      },
      {
        q: 'A large team wants one enforced pattern (actions, reducers, middleware, time-travel devtools). Which fits best?',
        options: ['Redux Toolkit', 'React Context', 'Plain useState', 'TanStack Query'],
        answer: 0,
        why: 'RTK trades a bit more ceremony for strong conventions and a big ecosystem. Zustand is lighter and less opinionated.',
      },
      {
        q: 'Which is a good use of React Context even in a Zustand app?',
        options: [
          'Storing mouse position',
          'Injecting a per-request or per-component store instance created with <code>createStore</code>',
          'Replacing all selectors',
          'Caching API responses',
        ],
        answer: 1,
        why: 'Context is great at <em>passing</em> a stable value down. A store instance never changes, so it causes no re-renders.',
      },
    ],
    exercise: {
      task: `
        <p>This app keeps <code>user</code> and <code>theme</code> in one Context. Toggling the
        theme also re-renders <code>UserBadge</code> (watch its counter).</p>
        <p>Migrate it to a <strong>Zustand store</strong> with selectors, so:</p>
        <ul>
          <li>"toggle theme" re-renders only <code>ThemeToggle</code>.</li>
          <li>"switch user" re-renders only <code>UserBadge</code>.</li>
          <li>No Provider is needed any more.</li>
        </ul>`,
      starter: `import { createContext, useContext, useRef, useState } from 'react';

const AppCtx = createContext(null);

function AppProvider({ children }) {
  const [user, setUser] = useState('Ana');
  const [theme, setTheme] = useState('light');
  const value = { user, setUser, theme, setTheme };
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

function UserBadge() {
  const renders = useRef(0);
  renders.current++;
  const { user, setUser } = useContext(AppCtx);
  return (
    <p>
      👤 {user}{' '}
      <button onClick={() => setUser(user === 'Ana' ? 'Ben' : 'Ana')}>switch user</button>{' '}
      <small>renders: {renders.current}</small>
    </p>
  );
}

function ThemeToggle() {
  const renders = useRef(0);
  renders.current++;
  const { theme, setTheme } = useContext(AppCtx);
  return (
    <p>
      🎨 {theme}{' '}
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        toggle theme
      </button>{' '}
      <small>renders: {renders.current}</small>
    </p>
  );
}

export default function App() {
  return (
    <AppProvider>
      <UserBadge />
      <ThemeToggle />
    </AppProvider>
  );
}`,
      hint: 'Create <code>useApp = create((set) =&gt; ({ user: \'Ana\', theme: \'light\', switchUser: () =&gt; set((s) =&gt; …), toggleTheme: () =&gt; set((s) =&gt; …) }))</code>. In each component select only its field and action: <code>useApp((s) =&gt; s.user)</code>, <code>useApp((s) =&gt; s.switchUser)</code>. Remove the Provider.',
      solution: `import { useRef } from 'react';
import { create } from 'zustand';

const useApp = create((set) => ({
  user: 'Ana',
  theme: 'light',
  switchUser: () => set((s) => ({ user: s.user === 'Ana' ? 'Ben' : 'Ana' })),
  toggleTheme: () =>
    set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
}));

function UserBadge() {
  const renders = useRef(0);
  renders.current++;
  const user = useApp((s) => s.user);
  const switchUser = useApp((s) => s.switchUser);
  return (
    <p>
      👤 {user} <button onClick={switchUser}>switch user</button>{' '}
      <small>renders: {renders.current}</small>
    </p>
  );
}

function ThemeToggle() {
  const renders = useRef(0);
  renders.current++;
  const theme = useApp((s) => s.theme);
  const toggleTheme = useApp((s) => s.toggleTheme);
  return (
    <p>
      🎨 {theme} <button onClick={toggleTheme}>toggle theme</button>{' '}
      <small>renders: {renders.current}</small>
    </p>
  );
}

export default function App() {
  return (
    <div>
      <UserBadge />
      <ThemeToggle />
    </div>
  );
}`,
    },
  },
);
