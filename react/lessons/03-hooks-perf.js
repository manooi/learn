window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── memo
  {
    id: 'memo',
    section: 'Performance',
    title: 'memo',
    explain: `
      <p>By default, when a component re-renders, <strong>all of its children re-render too</strong> — even if their props didn't change. Usually that's fine: React is fast, and re-rendering is not the same as touching the DOM. But when a child is slow to render, it adds up.</p>
      <p><code>memo</code> wraps a component and tells React: "if the props are the same as last time, skip re-rendering me and reuse the previous result."</p>
      <pre><code>import { memo } from 'react';

const Greeting = memo(function Greeting({ name }) {
  console.log('Greeting rendered');
  return &lt;h1&gt;Hello, {name}&lt;/h1&gt;;
});</code></pre>
      <p>Analogy: a chef who remembers "table 4 ordered the same dish as before" and hands over the plate already made instead of cooking again.</p>

      <h3>How "same props" is decided</h3>
      <p>React compares each prop with <code>Object.is</code> (shallow comparison). Numbers and strings compare by value. <strong>Objects, arrays and functions compare by identity</strong> — a new <code>{}</code> or <code>() =&gt; {}</code> created during render is a <em>different</em> value every time, so it breaks memo.</p>
      <pre><code>// ❌ new object and new function every render → memo is useless
&lt;Chart options={{ color: 'red' }} onClick={() =&gt; select(id)} /&gt;</code></pre>
      <p>Fixes: pass primitives, move constants outside the component, or keep them stable with <code>useMemo</code> / <code>useCallback</code> (next lessons).</p>

      <h3>What memo does NOT stop</h3>
      <ul>
        <li>A memoized component still re-renders when <strong>its own state</strong> changes.</li>
        <li>It still re-renders when a <strong>context</strong> it reads changes.</li>
        <li>Passing <code>children</code> JSX is a new object each render, so it breaks memo too.</li>
      </ul>
      <div class="tip"><strong>React Compiler</strong>: if your project uses the React Compiler (a build-time plugin, stable since v1.0), it automatically memoizes components and values for you, so you rarely write <code>memo</code> by hand. It's still worth understanding what it does.</div>
      <div class="warn">Don't wrap everything in <code>memo</code> "just in case". Measure first. Often a better fix is moving state down into the component that needs it, or passing JSX as <code>children</code>.</div>
    `,
    examples: [
      {
        title: 'Without vs with memo (watch the console)',
        code: `import { useState, memo } from 'react';

const counts = { plain: 0, memo: 0 };

function PlainChild({ name }) {
  counts.plain++;
  console.log('PlainChild render #' + counts.plain);
  return <p>Plain: hello {name}</p>;
}

const MemoChild = memo(function MemoChild({ name }) {
  counts.memo++;
  console.log('MemoChild render #' + counts.memo);
  return <p>Memo: hello {name}</p>;
});

export default function App() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState('Ana');

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Unrelated count: {count}</button>{' '}
      <button onClick={() => setName(n => (n === 'Ana' ? 'Ben' : 'Ana'))}>Change name</button>
      <PlainChild name={name} />
      <MemoChild name={name} />
      <p style={{ color: 'gray' }}>Clicking "Unrelated count" re-renders only PlainChild.</p>
    </div>
  );
}`,
      },
      {
        title: 'Memo broken by a new object prop',
        code: `import { useState, memo } from 'react';

const STABLE_STYLE = { color: 'teal' }; // created once, outside the component

const Badge = memo(function Badge({ label, style }) {
  console.log('Badge render:', label);
  return <span style={{ ...style, marginRight: 8, fontWeight: 'bold' }}>{label}</span>;
});

export default function App() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>Re-render parent ({count})</button>
      <p>
        {/* new object literal each render → memo can't skip */}
        <Badge label="inline object" style={{ color: 'crimson' }} />
        {/* same object every render → memo skips */}
        <Badge label="stable object" style={STABLE_STYLE} />
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>memo(Component)</code> do?',
        options: ['Caches the result of a function call', 'Skips re-rendering the component when its props are unchanged', 'Prevents the component from ever re-rendering', 'Makes state updates synchronous'],
        answer: 1,
        why: 'memo compares props shallowly and reuses the last render if they are all the same.',
      },
      {
        q: 'Why does <code>&lt;MemoChild onClick={() =&gt; go()} /&gt;</code> re-render every time the parent renders?',
        options: ['Arrow functions are not allowed as props', 'A new function is created each render, so the prop is never "the same"', 'memo ignores function props', 'onClick always forces a render'],
        answer: 1,
        why: 'Functions compare by identity. A fresh arrow function is a different value each render. <code>useCallback</code> can keep it stable.',
      },
      {
        q: 'A <code>memo</code> component will still re-render when...',
        options: ['Its own state changes or a context it reads changes', 'Never', 'Only when the page reloads', 'Only when its key changes'],
        answer: 0,
        why: 'memo only skips renders caused by the parent with identical props. Own state and context changes still re-render it.',
      },
      {
        q: 'With the React Compiler enabled, what happens to manual <code>memo</code> calls?',
        options: ['They cause errors', 'They are mostly unnecessary — the compiler memoizes automatically', 'They become twice as fast', 'The compiler requires them everywhere'],
        answer: 1,
        why: 'The compiler analyzes your components at build time and inserts memoization, so manual memo/useMemo/useCallback are rarely needed.',
      },
    ],
    exercise: {
      task: `<p>Each <code>SlowItem</code> takes ~1ms to render (40 items ≈ 40ms+). Typing in the "Note" input re-renders the whole list, so typing feels sluggish and the console fills with renders. Wrap <code>SlowItem</code> in <code>memo</code> so typing no longer re-renders the items. Clicking an item's ★ should still work.</p>`,
      starter: `import { useState } from 'react';

function SlowItem({ id, starred, onToggle }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // simulate slow render
  console.log('render item', id);
  return (
    <li>
      Item {id}{' '}
      <button onClick={() => onToggle(id)}>{starred ? '★' : '☆'}</button>
    </li>
  );
}

export default function App() {
  const [note, setNote] = useState('');
  const [starred, setStarred] = useState([]);

  // Hint: this function is recreated every render — that matters for memo!
  function toggle(id) {
    setStarred(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  }

  const ids = Array.from({ length: 40 }, (_, i) => i + 1);

  return (
    <div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (type fast)" />
      <ul style={{ maxHeight: 250, overflow: 'auto' }}>
        {ids.map(id => (
          <SlowItem key={id} id={id} starred={starred.includes(id)} onToggle={toggle} />
        ))}
      </ul>
    </div>
  );
}`,
      hint: 'const SlowItem = memo(function SlowItem(...) {...}). But memo alone is not enough: toggle is a new function each render. Wrap it in useCallback(…, []) — since it uses the updater form of setStarred it needs no dependencies.',
      solution: `import { useState, memo, useCallback } from 'react';

const SlowItem = memo(function SlowItem({ id, starred, onToggle }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // simulate slow render
  console.log('render item', id);
  return (
    <li>
      Item {id}{' '}
      <button onClick={() => onToggle(id)}>{starred ? '★' : '☆'}</button>
    </li>
  );
});

const ids = Array.from({ length: 40 }, (_, i) => i + 1);

export default function App() {
  const [note, setNote] = useState('');
  const [starred, setStarred] = useState([]);

  const toggle = useCallback(id => {
    setStarred(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]));
  }, []);

  return (
    <div>
      <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note (type fast)" />
      <ul style={{ maxHeight: 250, overflow: 'auto' }}>
        {ids.map(id => (
          <SlowItem key={id} id={id} starred={starred.includes(id)} onToggle={toggle} />
        ))}
      </ul>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useMemo
  {
    id: 'usememo',
    section: 'Performance',
    title: 'useMemo',
    explain: `
      <p><code>useMemo</code> caches the <strong>result of a calculation</strong> between renders. React re-runs the calculation only when one of the dependencies changed.</p>
      <pre><code>const visibleTodos = useMemo(
  () =&gt; filterTodos(todos, tab), // calculation
  [todos, tab]                    // dependencies
);</code></pre>
      <p>Analogy: you solved a long math problem on paper. If someone asks the <em>same</em> question again, you read the answer off the page instead of solving it again. New question (deps changed) → solve again.</p>

      <h3>Two reasons to use it</h3>
      <ul>
        <li><strong>Skip slow calculations</strong> — filtering/sorting big lists, heavy math — when an unrelated state change re-renders the component.</li>
        <li><strong>Keep an object/array stable</strong> so a <code>memo</code> child or an effect dependency doesn't see a "new" value every render.</li>
      </ul>

      <h3>How do I know it's slow?</h3>
      <pre><code>console.time('filter');
const visible = filterTodos(todos, tab);
console.timeEnd('filter'); // if &gt; ~1ms consistently, consider useMemo</code></pre>
      <div class="warn">Pitfalls:
        <ul>
          <li>The function must be <strong>pure</strong> — no side effects, no setState.</li>
          <li>Forgetting dependencies gives stale results; the linter warns you.</li>
          <li><code>useMemo</code> is a performance hint, not a guarantee. React may throw the cache away. Your code must still work without it.</li>
          <li>Don't wrap cheap things like <code>a + b</code> — the bookkeeping costs more than it saves.</li>
        </ul>
      </div>
      <div class="tip"><strong>React Compiler</strong> memoizes calculations like these automatically. Without the compiler, reach for <code>useMemo</code> only when you've measured a real slowdown.</div>
    `,
    examples: [
      {
        title: 'Skip a slow filter when toggling theme',
        code: `import { useState, useMemo } from 'react';

const todos = Array.from({ length: 100 }, (_, i) => ({
  id: i,
  text: 'Todo ' + (i + 1),
  done: i % 3 === 0,
}));

function slowFilter(list, tab) {
  console.log('⏳ filtering for tab:', tab);
  return list.filter(t => {
    const start = performance.now();
    while (performance.now() - start < 1) {} // 1ms per item → ~100ms
    return tab === 'all' ? true : tab === 'done' ? t.done : !t.done;
  });
}

export default function App() {
  const [tab, setTab] = useState('all');
  const [dark, setDark] = useState(false);
  const [useCache, setUseCache] = useState(true);

  const cached = useMemo(() => (useCache ? slowFilter(todos, tab) : null), [tab, useCache]);
  const visible = useCache ? cached : slowFilter(todos, tab);

  return (
    <div style={{ background: dark ? '#222' : '#fff', color: dark ? '#eee' : '#000', padding: 10 }}>
      <label>
        <input type="checkbox" checked={useCache} onChange={e => setUseCache(e.target.checked)} /> use useMemo
      </label>{' '}
      <label>
        <input type="checkbox" checked={dark} onChange={e => setDark(e.target.checked)} /> dark theme
      </label>
      <div style={{ margin: '6px 0' }}>
        {['all', 'active', 'done'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ fontWeight: t === tab ? 'bold' : 'normal', marginRight: 4 }}>
            {t}
          </button>
        ))}
      </div>
      <p>{visible.length} todos shown</p>
      <p style={{ opacity: 0.6 }}>With useMemo on, the theme toggle is instant — no "filtering" log.</p>
    </div>
  );
}`,
      },
      {
        title: 'Stable object for a memo child',
        code: `import { useState, useMemo, memo } from 'react';

const Chart = memo(function Chart({ config }) {
  console.log('Chart render', config);
  return (
    <div style={{ width: config.size, height: 20, background: config.color, transition: 'width .2s' }} />
  );
});

export default function App() {
  const [size, setSize] = useState(100);
  const [clicks, setClicks] = useState(0);

  // Without useMemo, this would be a new object every render,
  // and Chart would re-render on every "clicks" change.
  const config = useMemo(() => ({ size, color: 'orange' }), [size]);

  return (
    <div>
      <button onClick={() => setClicks(c => c + 1)}>Unrelated click ({clicks})</button>{' '}
      <button onClick={() => setSize(s => (s >= 250 ? 50 : s + 50))}>Change size</button>
      <Chart config={config} />
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'When does <code>useMemo(fn, [a, b])</code> call <code>fn</code> again?',
        options: ['Every render', 'Only when <code>a</code> or <code>b</code> changed since the last render', 'Only once ever', 'When the component unmounts'],
        answer: 1,
        why: 'React reuses the cached value while all dependencies are the same (by <code>Object.is</code>).',
      },
      {
        q: 'Which is a good use of <code>useMemo</code>?',
        options: ['<code>useMemo(() =&gt; a + b, [a, b])</code>', 'Filtering 10,000 items that re-renders on every keystroke in an unrelated input', 'Fetching data from a server', 'Calling <code>setState</code>'],
        answer: 1,
        why: 'useMemo pays off for measurably slow, pure calculations. Cheap math is not worth it; side effects belong in handlers/effects.',
      },
      {
        q: 'What is the difference between <code>useMemo</code> and <code>memo</code>?',
        options: ['They are the same', '<code>useMemo</code> caches a value inside a component; <code>memo</code> skips re-rendering a whole component', '<code>memo</code> is for classes only', '<code>useMemo</code> caches components; <code>memo</code> caches values'],
        answer: 1,
        why: 'useMemo is a hook that caches a computed value. memo is a wrapper around a component that compares props.',
      },
      {
        q: 'Can your code rely on <code>useMemo</code> to prevent a calculation from ever running twice?',
        options: ['Yes, it is guaranteed', 'No — it is a performance optimization; React may discard the cache', 'Only in production', 'Only with StrictMode'],
        answer: 1,
        why: 'Treat it as an optimization. Your component must still be correct if the calculation re-runs.',
      },
    ],
    exercise: {
      task: `<p><code>computeStats</code> is slow (~1ms per order). Clicking the unrelated <strong>Like</strong> button re-runs it and feels laggy. Use <code>useMemo</code> so the stats are only recalculated when <code>orders</code> or <code>taxRate</code> change. Check the console to confirm.</p>`,
      starter: `import { useState } from 'react';

const ORDERS = Array.from({ length: 80 }, (_, i) => ({ id: i, price: (i % 10) + 5 }));

function computeStats(orders, taxRate) {
  console.log('⏳ computing stats…');
  let total = 0;
  for (const o of orders) {
    const start = performance.now();
    while (performance.now() - start < 1) {} // slow!
    total += o.price;
  }
  return { count: orders.length, total: total * (1 + taxRate) };
}

export default function App() {
  const [taxRate, setTaxRate] = useState(0.1);
  const [likes, setLikes] = useState(0);

  const stats = computeStats(ORDERS, taxRate); // TODO: wrap in useMemo

  return (
    <div>
      <p>{stats.count} orders, total with tax: \${stats.total.toFixed(2)}</p>
      <label>
        Tax:{' '}
        <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
          <option value={0.1}>10%</option>
          <option value={0.2}>20%</option>
        </select>
      </label>{' '}
      <button onClick={() => setLikes(l => l + 1)}>♥ Like ({likes})</button>
    </div>
  );
}`,
      hint: "import { useMemo } from 'react'; const stats = useMemo(() => computeStats(ORDERS, taxRate), [taxRate]); (ORDERS is a module constant, so it doesn't need to be a dependency.)",
      solution: `import { useState, useMemo } from 'react';

const ORDERS = Array.from({ length: 80 }, (_, i) => ({ id: i, price: (i % 10) + 5 }));

function computeStats(orders, taxRate) {
  console.log('⏳ computing stats…');
  let total = 0;
  for (const o of orders) {
    const start = performance.now();
    while (performance.now() - start < 1) {} // slow!
    total += o.price;
  }
  return { count: orders.length, total: total * (1 + taxRate) };
}

export default function App() {
  const [taxRate, setTaxRate] = useState(0.1);
  const [likes, setLikes] = useState(0);

  const stats = useMemo(() => computeStats(ORDERS, taxRate), [taxRate]);

  return (
    <div>
      <p>{stats.count} orders, total with tax: \${stats.total.toFixed(2)}</p>
      <label>
        Tax:{' '}
        <select value={taxRate} onChange={e => setTaxRate(Number(e.target.value))}>
          <option value={0.1}>10%</option>
          <option value={0.2}>20%</option>
        </select>
      </label>{' '}
      <button onClick={() => setLikes(l => l + 1)}>♥ Like ({likes})</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useCallback
  {
    id: 'usecallback',
    section: 'Performance',
    title: 'useCallback',
    explain: `
      <p>Every render creates brand-new function objects for your handlers. Usually harmless. But if you pass a handler to a <code>memo</code> child, the "new" function makes memo think props changed, so the child re-renders anyway.</p>
      <p><code>useCallback</code> returns the <strong>same function</strong> between renders until a dependency changes.</p>
      <pre><code>const handleSubmit = useCallback(order =&gt; {
  post('/buy', { order, productId });
}, [productId]);</code></pre>
      <p>It's exactly <code>useMemo</code> for functions: <code>useCallback(fn, deps)</code> ≡ <code>useMemo(() =&gt; fn, deps)</code>.</p>

      <h3>When is it useful?</h3>
      <ul>
        <li>Passing a callback to a component wrapped in <code>memo</code>.</li>
        <li>The function is a dependency of another hook (e.g. an effect or <code>useMemo</code>).</li>
        <li>Returning functions from a custom hook, so callers can rely on them being stable.</li>
      </ul>
      <p>Without one of those, <code>useCallback</code> does nothing useful.</p>

      <h3>Tip: use the updater form to drop dependencies</h3>
      <pre><code>// Needs todos in deps → new function every time todos changes
const add = useCallback(t =&gt; setTodos([...todos, t]), [todos]);
// ✅ Never changes
const add = useCallback(t =&gt; setTodos(prev =&gt; [...prev, t]), []);</code></pre>
      <div class="tip"><strong>React Compiler</strong> automatically keeps functions stable where it matters, so compiled code rarely needs <code>useCallback</code>. Setter functions from <code>useState</code> and <code>dispatch</code> from <code>useReducer</code> are always stable already.</div>
      <div class="warn">Pitfall: <code>useCallback</code> doesn't make the function run faster and doesn't stop it from being created — it just hands back the old one. Alone, without a <code>memo</code> child or hook dependency, it's pure overhead.</div>
    `,
    examples: [
      {
        title: 'Inline handler vs useCallback with a memo child',
        code: `import { useState, useCallback, memo } from 'react';

const counts = { A: 0, B: 0 };

const FancyButton = memo(function FancyButton({ name, onClick }) {
  counts[name]++;
  console.log('FancyButton ' + name + ' render #' + counts[name]);
  return <button onClick={onClick} style={{ marginRight: 6 }}>Button {name}</button>;
});

export default function App() {
  const [text, setText] = useState('');
  const [clicks, setClicks] = useState(0);

  // A: new function on every render → memo can't skip
  const inlineHandler = () => setClicks(c => c + 1);

  // B: same function every render → memo skips
  const stableHandler = useCallback(() => setClicks(c => c + 1), []);

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Type to re-render App" />
      <p>
        <FancyButton name="A" onClick={inlineHandler} />
        <FancyButton name="B" onClick={stableHandler} />
      </p>
      <p>Clicks: {clicks}</p>
      <p style={{ color: 'gray' }}>Type in the box: only Button A re-renders.</p>
    </div>
  );
}`,
      },
      {
        title: 'Dependencies and the updater form',
        code: `import { useState, useCallback, useEffect } from 'react';

export default function App() {
  const [items, setItems] = useState(['a']);
  const [other, setOther] = useState(0);

  // Depends on items → identity changes whenever items changes
  const addWithDep = useCallback(() => setItems([...items, 'x']), [items]);

  // Updater form → never changes
  const addStable = useCallback(() => setItems(prev => [...prev, 'y']), []);

  useEffect(() => {
    console.log('addWithDep is a NEW function');
  }, [addWithDep]);

  useEffect(() => {
    console.log('addStable is a NEW function');
  }, [addStable]);

  return (
    <div>
      <button onClick={addWithDep}>Add x</button>{' '}
      <button onClick={addStable}>Add y</button>{' '}
      <button onClick={() => setOther(o => o + 1)}>Other state ({other})</button>
      <p>{items.join(' ')}</p>
      <p style={{ color: 'gray' }}>
        Adding items changes addWithDep, never addStable. "Other state" changes neither.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: '<code>useCallback(fn, deps)</code> is equivalent to…',
        options: ['<code>useMemo(fn, deps)</code>', '<code>useMemo(() =&gt; fn, deps)</code>', '<code>useRef(fn)</code>', '<code>memo(fn)</code>'],
        answer: 1,
        why: 'useCallback caches the function itself; useMemo caches whatever the callback returns — so you wrap fn in another arrow.',
      },
      {
        q: 'When does <code>useCallback</code> actually help?',
        options: ['Always, on every handler', 'When the function is passed to a <code>memo</code> child or used as a hook dependency', 'When the function is slow', 'When the function is async'],
        answer: 1,
        why: 'Stable identity only matters to something that compares it: memo props or dependency arrays.',
      },
      {
        q: 'How can you write <code>useCallback(() =&gt; setCount(count + 1), [count])</code> so it never changes?',
        options: ['<code>useCallback(() =&gt; setCount(c =&gt; c + 1), [])</code>', 'Remove the array', 'Use <code>useRef</code> for count', 'You cannot'],
        answer: 0,
        why: 'The updater form reads the latest state from React, so the callback no longer needs <code>count</code> as a dependency.',
      },
      {
        q: 'Which of these is already stable and never needs <code>useCallback</code>?',
        options: ['An inline arrow function', 'The <code>setX</code> function returned by <code>useState</code>', 'A function that reads props', 'A function defined in render'],
        answer: 1,
        why: 'React guarantees state setters (and useReducer\'s dispatch) keep the same identity forever.',
      },
    ],
    exercise: {
      task: `<p><code>TodoList</code> is wrapped in <code>memo</code>, but typing in the search box still re-renders it (see console). Fix <code>App</code> with <code>useCallback</code> so <code>onDelete</code> is stable and <code>TodoList</code> only re-renders when <code>todos</code> changes.</p>`,
      starter: `import { useState, memo } from 'react';

const TodoList = memo(function TodoList({ todos, onDelete }) {
  console.log('TodoList render');
  return (
    <ul>
      {todos.map(t => (
        <li key={t}>{t} <button onClick={() => onDelete(t)}>✕</button></li>
      ))}
    </ul>
  );
});

export default function App() {
  const [search, setSearch] = useState('');
  const [todos, setTodos] = useState(['Walk dog', 'Buy milk', 'Read book']);

  // TODO: make this stable
  function handleDelete(todo) {
    setTodos(todos.filter(t => t !== todo));
  }

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (not wired up)" />
      <TodoList todos={todos} onDelete={handleDelete} />
    </div>
  );
}`,
      hint: 'const handleDelete = useCallback(todo => setTodos(prev => prev.filter(t => t !== todo)), []); The updater form means no dependencies are needed.',
      solution: `import { useState, memo, useCallback } from 'react';

const TodoList = memo(function TodoList({ todos, onDelete }) {
  console.log('TodoList render');
  return (
    <ul>
      {todos.map(t => (
        <li key={t}>{t} <button onClick={() => onDelete(t)}>✕</button></li>
      ))}
    </ul>
  );
});

export default function App() {
  const [search, setSearch] = useState('');
  const [todos, setTodos] = useState(['Walk dog', 'Buy milk', 'Read book']);

  const handleDelete = useCallback(todo => {
    setTodos(prev => prev.filter(t => t !== todo));
  }, []);

  return (
    <div>
      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search (not wired up)" />
      <TodoList todos={todos} onDelete={handleDelete} />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useTransition
  {
    id: 'usetransition',
    section: 'Performance',
    title: 'useTransition',
    explain: `
      <p>Some updates are <strong>urgent</strong> (typing, clicking — the user expects instant feedback). Others are <strong>not urgent</strong> (showing a big new tab of results). Normally React treats every update as urgent: while it renders a slow screen, the page freezes.</p>
      <p><code>useTransition</code> lets you mark an update as a <strong>transition</strong> — low priority and interruptible. React renders it in the background, keeps the old UI on screen meanwhile, and <em>abandons</em> the work if a more urgent update comes in.</p>
      <pre><code>const [isPending, startTransition] = useTransition();

function selectTab(next) {
  startTransition(() =&gt; {
    setTab(next); // non-blocking update
  });
}</code></pre>
      <p>Analogy: you're painting a large mural (transition). When a customer walks in (a click), you put the brush down, help them, then continue — you don't make them wait until the mural is finished.</p>

      <h3>isPending</h3>
      <p><code>isPending</code> is <code>true</code> while the transition is still rendering. Use it to show a hint: dim the old content, show a spinner.</p>

      <h3>Async transitions (Actions) — React 19</h3>
      <p>In React 19 you can pass an <strong>async</strong> function. <code>isPending</code> stays <code>true</code> for the whole async work. Functions used like this are called <em>Actions</em>.</p>
      <pre><code>startTransition(async () =&gt; {
  await saveName(name);
  startTransition(() =&gt; {   // state set after an await must be
    setSaved(name);         // wrapped again (current limitation)
  });
});</code></pre>

      <h3>Rules and limits</h3>
      <ul>
        <li>The function you pass runs <strong>immediately</strong>; only the state updates inside it are marked as transitions.</li>
        <li><strong>Don't</strong> use a transition to update a controlled text input's value — typing must be urgent. Split into two states, or use <code>useDeferredValue</code>.</li>
        <li>No hook available (outside a component)? Import the standalone <code>startTransition</code> from <code>'react'</code> (no <code>isPending</code>).</li>
      </ul>
      <div class="tip">Transitions help when the slow part is <em>rendering</em> many components. Each component in the slow tree is a chance for React to pause and check for urgent work. They don't make a single slow calculation faster.</div>
    `,
    examples: [
      {
        title: 'Slow tab: with and without a transition',
        code: `import { useState, useTransition, memo } from 'react';

function SlowPost({ index }) {
  const start = performance.now();
  while (performance.now() - start < 1.5) {} // ~1.5ms each
  return <li>Post #{index + 1}</li>;
}

const PostsTab = memo(function PostsTab() {
  console.log('rendering 150 slow posts…');
  const items = [];
  for (let i = 0; i < 150; i++) items.push(<SlowPost key={i} index={i} />);
  return <ul style={{ maxHeight: 160, overflow: 'auto' }}>{items}</ul>;
});

function AboutTab() {
  return <p>Welcome to my profile!</p>;
}

function ContactTab() {
  return <p>Email: me@example.com</p>;
}

export default function App() {
  const [tab, setTab] = useState('about');
  const [useIt, setUseIt] = useState(true);
  const [isPending, startTransition] = useTransition();

  function selectTab(next) {
    if (useIt) {
      startTransition(() => setTab(next));
    } else {
      setTab(next);
    }
  }

  return (
    <div>
      <label>
        <input type="checkbox" checked={useIt} onChange={e => setUseIt(e.target.checked)} /> use transition
      </label>
      <div style={{ margin: '6px 0' }}>
        {['about', 'posts', 'contact'].map(t => (
          <button key={t} onClick={() => selectTab(t)} style={{ fontWeight: t === tab ? 'bold' : 'normal', marginRight: 4 }}>
            {t}
          </button>
        ))}
        {isPending && <span> ⏳ loading…</span>}
      </div>
      <div style={{ opacity: isPending ? 0.5 : 1 }}>
        {tab === 'about' && <AboutTab />}
        {tab === 'posts' && <PostsTab />}
        {tab === 'contact' && <ContactTab />}
      </div>
      <p style={{ color: 'gray' }}>
        Click "posts" then immediately "contact". With the transition, the click on "contact" responds right away.
      </p>
    </div>
  );
}`,
      },
      {
        title: 'Async transition (React 19 Action)',
        code: `import { useState, useTransition } from 'react';

function fakeSave(name) {
  return new Promise(resolve => setTimeout(() => resolve(name.trim()), 1200));
}

export default function App() {
  const [name, setName] = useState('');
  const [saved, setSaved] = useState('(nothing yet)');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      console.log('saving…');
      const result = await fakeSave(name);
      // updates after an await need their own startTransition
      startTransition(() => {
        setSaved(result);
      });
      console.log('saved!');
    });
  }

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
      <button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </button>
      <p>Saved name: <strong>{saved}</strong></p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does wrapping <code>setTab(next)</code> in <code>startTransition</code> do?',
        options: ['Delays it by a fixed timeout', 'Marks it as non-urgent so React can render it in the background and interrupt it', 'Runs it in a Web Worker', 'Makes the render faster'],
        answer: 1,
        why: 'Transitions are low-priority, interruptible renders. The UI stays responsive while React works on them.',
      },
      {
        q: 'What is <code>isPending</code>?',
        options: ['Whether the component is mounted', '<code>true</code> while the transition hasn\'t finished rendering (or its async work is still running)', 'Whether a fetch failed', 'The number of pending updates'],
        answer: 1,
        why: 'Use it to show feedback such as a spinner or dimmed content while the transition is in progress.',
      },
      {
        q: 'Why shouldn\'t you update a controlled text input\'s value inside a transition?',
        options: ['It throws an error', 'Typing must feel instant; a deferred value would make the input lag or drop characters', 'Inputs don\'t support state', 'Transitions only work with buttons'],
        answer: 1,
        why: 'Input value updates must be urgent. Keep the input state urgent and put only the slow part into a transition (or use useDeferredValue).',
      },
      {
        q: 'In React 19, what happens when you pass an async function to <code>startTransition</code>?',
        options: ['Not allowed', '<code>isPending</code> stays true until the async work finishes', 'The function runs later', 'It automatically retries on error'],
        answer: 1,
        why: 'React 19 supports async transitions (Actions). Remember to wrap state updates that come after an <code>await</code> in another <code>startTransition</code>.',
      },
    ],
    exercise: {
      task: `<p>Dragging the slider re-renders 120 slow bars and the slider feels stuck. Keep <code>value</code> urgent (for the slider itself) but add a second state <code>shownValue</code> that is updated inside <code>startTransition</code> and passed to <code>Bars</code>. Show "updating…" while <code>isPending</code>.</p>`,
      starter: `import { useState, memo } from 'react';

function Bar({ i, value }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // slow
  const width = ((i * value) % 100) + 5;
  return <div style={{ height: 2, width: width + '%', background: 'steelblue', marginBottom: 1 }} />;
}

const Bars = memo(function Bars({ value }) {
  const bars = [];
  for (let i = 0; i < 120; i++) bars.push(<Bar key={i} i={i} value={value} />);
  return <div>{bars}</div>;
});

export default function App() {
  const [value, setValue] = useState(1);
  // TODO: shownValue state + useTransition

  function handleChange(e) {
    const v = Number(e.target.value);
    setValue(v);
    // TODO: update shownValue in a transition
  }

  return (
    <div>
      <input type="range" min="1" max="50" value={value} onChange={handleChange} /> {value}
      <Bars value={value} />
    </div>
  );
}`,
      hint: 'const [shownValue, setShownValue] = useState(1); const [isPending, startTransition] = useTransition(); in handleChange: startTransition(() => setShownValue(v)); render <Bars value={shownValue} />.',
      solution: `import { useState, memo, useTransition } from 'react';

function Bar({ i, value }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // slow
  const width = ((i * value) % 100) + 5;
  return <div style={{ height: 2, width: width + '%', background: 'steelblue', marginBottom: 1 }} />;
}

const Bars = memo(function Bars({ value }) {
  const bars = [];
  for (let i = 0; i < 120; i++) bars.push(<Bar key={i} i={i} value={value} />);
  return <div>{bars}</div>;
});

export default function App() {
  const [value, setValue] = useState(1);
  const [shownValue, setShownValue] = useState(1);
  const [isPending, startTransition] = useTransition();

  function handleChange(e) {
    const v = Number(e.target.value);
    setValue(v); // urgent: the slider moves right away
    startTransition(() => {
      setShownValue(v); // non-urgent: the slow bars
    });
  }

  return (
    <div>
      <input type="range" min="1" max="50" value={value} onChange={handleChange} /> {value}
      {isPending && <span style={{ color: 'gray' }}> updating…</span>}
      <div style={{ opacity: isPending ? 0.6 : 1 }}>
        <Bars value={shownValue} />
      </div>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useDeferredValue
  {
    id: 'usedeferredvalue',
    section: 'Performance',
    title: 'useDeferredValue',
    explain: `
      <p><code>useDeferredValue(value)</code> gives you a copy of a value that is allowed to <strong>lag behind</strong>. On an urgent update, React first re-renders with the <em>old</em> deferred value (fast), then re-renders in the background with the new one — and abandons that background render if the value changes again.</p>
      <pre><code>const [query, setQuery] = useState('');
const deferredQuery = useDeferredValue(query);

&lt;input value={query} onChange={e =&gt; setQuery(e.target.value)} /&gt;
&lt;SlowList query={deferredQuery} /&gt;   // SlowList wrapped in memo!</code></pre>
      <p>Analogy: a live translator. You keep talking at normal speed (the input stays snappy); the translation (slow list) follows a moment behind and skips ahead when you've said more.</p>

      <h3>useDeferredValue vs useTransition</h3>
      <ul>
        <li><code>useTransition</code>: you control the <strong>state update</strong> (you call the setter).</li>
        <li><code>useDeferredValue</code>: you only have a <strong>value</strong> (e.g. a prop or state you don't want to split). Same background-rendering idea.</li>
      </ul>

      <h3>Showing stale content</h3>
      <p>While the background render is in progress, <code>query !== deferredQuery</code>. Use that to dim the old results:</p>
      <pre><code>const isStale = query !== deferredQuery;
&lt;div style={{ opacity: isStale ? 0.5 : 1 }}&gt;...&lt;/div&gt;</code></pre>

      <h3>Initial value (React 19)</h3>
      <p><code>useDeferredValue(value, initialValue)</code> — on the first render, use <code>initialValue</code> (e.g. <code>''</code>) and then render with the real value in the background.</p>
      <div class="warn">Pitfall: the slow child <strong>must be wrapped in <code>memo</code></strong>. Otherwise it re-renders with the parent on every keystroke anyway, and deferring gives no benefit. (The React Compiler does this memoization for you.)</div>
      <div class="tip">Unlike debouncing, there's no fixed delay. On a fast device the deferred render finishes almost instantly; on a slow one it lags just as much as needed.</div>
    `,
    examples: [
      {
        title: 'Responsive input, lagging slow list',
        code: `import { useState, useDeferredValue, memo } from 'react';

function SlowItem({ text }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // 1ms per item
  return <li>{text}</li>;
}

const SlowList = memo(function SlowList({ text }) {
  console.log('SlowList render for "' + text + '"');
  const items = [];
  for (let i = 0; i < 150; i++) items.push(<SlowItem key={i} text={'Result ' + i + ': ' + text} />);
  return <ul style={{ maxHeight: 200, overflow: 'auto' }}>{items}</ul>;
});

export default function App() {
  const [text, setText] = useState('');
  const [useDeferred, setUseDeferred] = useState(true);
  const deferredText = useDeferredValue(text);
  const listText = useDeferred ? deferredText : text;
  const isStale = listText !== text;

  return (
    <div>
      <label>
        <input type="checkbox" checked={useDeferred} onChange={e => setUseDeferred(e.target.checked)} /> use useDeferredValue
      </label>
      <br />
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Type quickly…" />
      {isStale && <span style={{ color: 'gray' }}> updating…</span>}
      <div style={{ opacity: isStale ? 0.5 : 1, transition: 'opacity .2s' }}>
        <SlowList text={listText} />
      </div>
    </div>
  );
}`,
      },
      {
        title: 'Deferred search with an initial value',
        code: `import { useState, useDeferredValue, memo } from 'react';

const WORDS = ['apple', 'apricot', 'banana', 'blueberry', 'cherry', 'coconut', 'date', 'fig', 'grape',
  'guava', 'kiwi', 'lemon', 'lime', 'mango', 'melon', 'orange', 'papaya', 'peach', 'pear', 'plum'];

function Row({ word }) {
  const start = performance.now();
  while (performance.now() - start < 2) {} // 2ms per row
  return <li>{word}</li>;
}

const Results = memo(function Results({ query }) {
  const matches = WORDS.filter(w => w.includes(query.toLowerCase()));
  console.log('Results render, query="' + query + '", ' + matches.length + ' matches');
  if (matches.length === 0) return <p>No matches.</p>;
  return <ul>{matches.map(w => <Row key={w} word={w} />)}</ul>;
});

export default function App() {
  const [query, setQuery] = useState('');
  // First render uses '' immediately, then catches up in the background
  const deferredQuery = useDeferredValue(query, '');

  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search fruit" />
      <div style={{ opacity: query !== deferredQuery ? 0.5 : 1, maxHeight: 220, overflow: 'auto' }}>
        <Results query={deferredQuery} />
      </div>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>useDeferredValue(query)</code> return right after the user types a new character?',
        options: ['The new query', 'The previous query at first, then the new one after a background render', '<code>undefined</code>', 'A Promise'],
        answer: 1,
        why: 'React first renders with the old deferred value so the urgent update (the input) is fast, then renders again with the new value in the background.',
      },
      {
        q: 'Why must the slow child be wrapped in <code>memo</code>?',
        options: ['memo is required by useDeferredValue', 'Otherwise it re-renders during the urgent render anyway, so nothing is gained', 'To avoid a Rules of Hooks error', 'It isn\'t necessary'],
        answer: 1,
        why: 'memo lets the child skip the urgent render (its deferred prop hasn\'t changed yet). Without it, the child is slow on every keystroke.',
      },
      {
        q: 'How can you detect that the displayed results are stale?',
        options: ['<code>value !== deferredValue</code>', '<code>isPending</code> from useDeferredValue', 'Check <code>document.readyState</code>', 'You cannot'],
        answer: 0,
        why: 'While the background render hasn\'t committed, the deferred value still differs from the latest value.',
      },
      {
        q: 'Main difference from debouncing?',
        options: ['None', 'No fixed delay — it adapts to device speed and interrupted renders are abandoned', 'Debouncing is built into React', 'useDeferredValue waits 300ms'],
        answer: 1,
        why: 'Debounce always waits a set time. useDeferredValue renders as soon as possible in the background and stays interruptible.',
      },
    ],
    exercise: {
      task: `<p>Typing in the filter box is laggy because <code>ProductList</code> renders 150 slow rows on every keystroke. Use <code>useDeferredValue</code> (and <code>memo</code>) so the input stays responsive. Dim the list while it is stale.</p>`,
      starter: `import { useState } from 'react';

const PRODUCTS = Array.from({ length: 150 }, (_, i) => 'Product ' + (i + 1));

function Row({ name }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // slow row
  return <li>{name}</li>;
}

function ProductList({ filter }) {
  const visible = PRODUCTS.filter(p => p.includes(filter));
  return <ul style={{ maxHeight: 220, overflow: 'auto' }}>{visible.map(p => <Row key={p} name={p} />)}</ul>;
}

export default function App() {
  const [filter, setFilter] = useState('');
  // TODO: deferred filter

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter, e.g. 1" />
      <ProductList filter={filter} />
    </div>
  );
}`,
      hint: 'Wrap ProductList with memo(...). In App: const deferredFilter = useDeferredValue(filter); pass deferredFilter to ProductList; wrap it in a div with opacity filter !== deferredFilter ? 0.5 : 1.',
      solution: `import { useState, useDeferredValue, memo } from 'react';

const PRODUCTS = Array.from({ length: 150 }, (_, i) => 'Product ' + (i + 1));

function Row({ name }) {
  const start = performance.now();
  while (performance.now() - start < 1) {} // slow row
  return <li>{name}</li>;
}

const ProductList = memo(function ProductList({ filter }) {
  const visible = PRODUCTS.filter(p => p.includes(filter));
  return <ul style={{ maxHeight: 220, overflow: 'auto' }}>{visible.map(p => <Row key={p} name={p} />)}</ul>;
});

export default function App() {
  const [filter, setFilter] = useState('');
  const deferredFilter = useDeferredValue(filter);
  const isStale = filter !== deferredFilter;

  return (
    <div>
      <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter, e.g. 1" />
      <div style={{ opacity: isStale ? 0.5 : 1 }}>
        <ProductList filter={deferredFilter} />
      </div>
    </div>
  );
}`,
    },
  },
);
