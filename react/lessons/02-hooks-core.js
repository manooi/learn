window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── useState
  {
    id: 'usestate',
    section: 'Core Hooks',
    title: 'useState in depth',
    explain: `
      <p><code>useState</code> gives a component <strong>memory</strong> that survives between renders. It returns a pair: the current value and a <em>setter</em> function. Calling the setter does two things: it stores the new value and it asks React to <strong>re-render</strong> the component.</p>
      <pre><code>const [count, setCount] = useState(0);</code></pre>

      <h3>State is a snapshot</h3>
      <p>Inside one render, <code>count</code> is a fixed number — like a photo taken at that moment. Calling <code>setCount(count + 1)</code> does <em>not</em> change <code>count</code> right away; it schedules the next render, which gets a new snapshot.</p>
      <pre><code>function handleClick() {
  setCount(count + 1); // count is 0 → asks for 1
  setCount(count + 1); // count is STILL 0 → asks for 1
  setCount(count + 1); // still 0 → asks for 1
  console.log(count);  // 0
}
// Result after click: 1, not 3!</code></pre>

      <h3>Updater functions</h3>
      <p>When the next value depends on the previous one, pass a <strong>function</strong> instead. React queues it and feeds it the latest pending value:</p>
      <pre><code>setCount(c =&gt; c + 1); // 0 → 1
setCount(c =&gt; c + 1); // 1 → 2
setCount(c =&gt; c + 1); // 2 → 3  ✅</code></pre>
      <div class="tip">Convention: name the updater argument after the first letter of the state (<code>c</code> for count) or <code>prev</code>.</div>

      <h3>Batching</h3>
      <p>React <strong>batches</strong> all state updates made in the same event (click handler, timeout, promise…) and re-renders <em>once</em> at the end. Like a waiter who takes your whole order before walking to the kitchen. That is why three <code>setCount</code> calls cause one render, not three.</p>

      <h3>Objects and arrays: never mutate, replace</h3>
      <p>React decides whether to re-render by comparing the old and new value with <code>Object.is</code>. If you mutate an object and pass the <em>same</em> object back, React sees "same thing" and may skip the update. Always create a <strong>new</strong> object/array:</p>
      <pre><code>// Objects — copy with spread, then override
setUser({ ...user, name: 'Ana' });
setUser(u =&gt; ({ ...u, address: { ...u.address, city: 'Paris' } }));

// Arrays
setItems([...items, newItem]);                  // add
setItems(items.filter(i =&gt; i.id !== id));       // remove
setItems(items.map(i =&gt; i.id === id ? { ...i, done: !i.done } : i)); // update one</code></pre>
      <div class="warn">Pitfall: <code>items.push(x); setItems(items)</code> mutates the existing array. Methods that mutate: <code>push</code>, <code>pop</code>, <code>splice</code>, <code>sort</code>, <code>reverse</code>, direct assignment <code>obj.x = 1</code>. Prefer <code>[...arr]</code>, <code>map</code>, <code>filter</code>, <code>toSorted()</code>, <code>toReversed()</code>.</div>

      <h3>Lazy initial state</h3>
      <p>The initial value is only used on the first render. If computing it is expensive, pass a function so it runs only once: <code>useState(() =&gt; createInitialTodos())</code> — note: pass the function, don't call it.</p>
    `,
    examples: [
      {
        title: 'Snapshot vs updater function',
        code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  console.log('render, count =', count);

  function addThreeWrong() {
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    console.log('inside handler, count is still', count);
  }

  function addThreeRight() {
    setCount(c => c + 1);
    setCount(c => c + 1);
    setCount(c => c + 1);
  }

  return (
    <div>
      <h2>{count}</h2>
      <button onClick={addThreeWrong}>+3 (value)</button>{' '}
      <button onClick={addThreeRight}>+3 (updater)</button>{' '}
      <button onClick={() => setCount(0)}>Reset</button>
      <p style={{ color: 'gray' }}>Watch the console: one render per click (batching).</p>
    </div>
  );
}`,
      },
      {
        title: 'Updating an object immutably',
        code: `import { useState } from 'react';

export default function App() {
  const [form, setForm] = useState({
    name: 'Ana',
    email: 'ana@example.com',
    address: { city: 'Lisbon' },
  });

  function handleChange(e) {
    // [e.target.name] is a computed key: "name" or "email"
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleCity(e) {
    // nested object: copy every level you change
    setForm({ ...form, address: { ...form.address, city: e.target.value } });
  }

  return (
    <div>
      <label>Name <input name="name" value={form.name} onChange={handleChange} /></label><br />
      <label>Email <input name="email" value={form.email} onChange={handleChange} /></label><br />
      <label>City <input value={form.address.city} onChange={handleCity} /></label>
      <pre style={{ background: '#f4f4f4', padding: 8 }}>{JSON.stringify(form, null, 2)}</pre>
    </div>
  );
}`,
      },
      {
        title: 'Arrays: add, toggle, remove',
        code: `import { useState } from 'react';

let nextId = 3;

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn useState', done: true },
    { id: 2, text: 'Learn useEffect', done: false },
  ]);
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    setTodos([...todos, { id: nextId++, text, done: false }]);
    setText('');
  }

  function toggle(id) {
    setTodos(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function remove(id) {
    setTodos(todos.filter(t => t.id !== id));
  }

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="New todo" />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id}>
            <label style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
              <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} /> {t.text}
            </label>{' '}
            <button onClick={() => remove(t.id)}>✕</button>
          </li>
        ))}
      </ul>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Starting from <code>count = 0</code>, a click runs <code>setCount(count + 1); setCount(count + 1);</code>. What is <code>count</code> after the re-render?',
        options: ['0', '1', '2', 'It throws an error'],
        answer: 1,
        why: 'Both calls read the same snapshot (0), so both ask for 1. Use <code>setCount(c =&gt; c + 1)</code> to chain updates.',
      },
      {
        q: 'Three <code>setX</code> calls in one click handler cause how many re-renders?',
        options: ['Three', 'One — React batches them', 'Zero until you call <code>render()</code>', 'It depends on the browser'],
        answer: 1,
        why: 'React batches updates from the same event and re-renders once after the handler finishes.',
      },
      {
        q: 'Which update correctly adds <code>item</code> to array state <code>list</code>?',
        options: ['<code>list.push(item); setList(list)</code>', '<code>setList([...list, item])</code>', '<code>setList(list.push(item))</code>', '<code>list[list.length] = item</code>'],
        answer: 1,
        why: 'You must pass a new array. <code>push</code> mutates and returns the new length, not an array.',
      },
      {
        q: 'What is the difference between <code>useState(heavy())</code> and <code>useState(heavy)</code>?',
        options: ['None', '<code>heavy()</code> runs on every render; passing <code>heavy</code> runs it only for the first render', '<code>useState(heavy)</code> stores the function itself as state', 'The first is async'],
        answer: 1,
        why: 'Passing a function is "lazy initialization": React calls it once. Writing <code>heavy()</code> calls it every render and throws away the result after the first.',
      },
    ],
    exercise: {
      task: `<p>Build a small "likes" list. Each fruit has a <strong>♥ Like</strong> button that increases <em>only that fruit's</em> likes. Add a <strong>+3</strong> button per fruit that adds three likes using three separate updater-function calls (to prove updaters chain). Update the array immutably.</p>`,
      starter: `import { useState } from 'react';

export default function App() {
  const [fruits, setFruits] = useState([
    { id: 1, name: 'Apple', likes: 0 },
    { id: 2, name: 'Banana', likes: 0 },
    { id: 3, name: 'Cherry', likes: 0 },
  ]);

  function like(id) {
    // TODO: return a NEW array where the matching fruit has likes + 1
  }

  return (
    <ul>
      {fruits.map(f => (
        <li key={f.id}>
          {f.name}: {f.likes}{' '}
          <button onClick={() => like(f.id)}>♥ Like</button>
          {/* TODO: +3 button */}
        </li>
      ))}
    </ul>
  );
}`,
      hint: 'Use setFruits(prev => prev.map(f => f.id === id ? { ...f, likes: f.likes + 1 } : f)). Because it uses the updater form, calling like(id) three times in a row adds 3.',
      solution: `import { useState } from 'react';

export default function App() {
  const [fruits, setFruits] = useState([
    { id: 1, name: 'Apple', likes: 0 },
    { id: 2, name: 'Banana', likes: 0 },
    { id: 3, name: 'Cherry', likes: 0 },
  ]);

  function like(id) {
    setFruits(prev =>
      prev.map(f => (f.id === id ? { ...f, likes: f.likes + 1 } : f))
    );
  }

  function likeThree(id) {
    like(id);
    like(id);
    like(id);
  }

  return (
    <ul>
      {fruits.map(f => (
        <li key={f.id}>
          {f.name}: {f.likes}{' '}
          <button onClick={() => like(f.id)}>♥ Like</button>{' '}
          <button onClick={() => likeThree(f.id)}>+3</button>
        </li>
      ))}
    </ul>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useEffect
  {
    id: 'useeffect',
    section: 'Core Hooks',
    title: 'useEffect',
    explain: `
      <p>Rendering should be <strong>pure</strong>: take props and state, return JSX, nothing else. But sometimes a component must talk to the outside world — start a timer, subscribe to an event, connect to a server. <code>useEffect</code> lets you run that code <strong>after React has updated the screen</strong>.</p>
      <p>Think of an effect as "keep this component <em>synchronized</em> with some external system".</p>
      <pre><code>useEffect(() =&gt; {
  // setup: runs after render
  const id = setInterval(tick, 1000);
  return () =&gt; {
    // cleanup: runs before the next setup, and on unmount
    clearInterval(id);
  };
}, [/* dependencies */]);</code></pre>

      <h3>The dependency array</h3>
      <ul>
        <li><code>useEffect(fn)</code> — no array: runs after <strong>every</strong> render.</li>
        <li><code>useEffect(fn, [])</code> — empty: runs once after the first render (mount).</li>
        <li><code>useEffect(fn, [a, b])</code> — runs on mount and whenever <code>a</code> or <code>b</code> changed (compared with <code>Object.is</code>).</li>
      </ul>
      <p>Every reactive value (prop, state, or something computed from them) used inside the effect must be in the array. The <code>eslint-plugin-react-hooks</code> linter checks this for you. Don't lie to it — missing deps cause stale values.</p>

      <h3>Cleanup</h3>
      <p>If your setup starts something, the cleanup should stop it: clear timers, remove event listeners, disconnect. React runs cleanup before re-running the effect (with new deps) and when the component is removed.</p>
      <div class="tip">In development with <code>&lt;StrictMode&gt;</code>, React runs setup → cleanup → setup once extra on mount. This is a stress test: if your cleanup is correct, users see no difference. If something breaks, your cleanup is missing.<br><em>The examples on this page are <strong>not</strong> in StrictMode, so effects run once here. To see the extra run, wrap the returned JSX in <code>&lt;StrictMode&gt;</code> (import it from <code>'react'</code>), or open the <a href="#/strictmode">StrictMode lesson</a> for a bug-vs-fix demo.</em></div>

      <h3>Fetching data and race conditions</h3>
      <p>If the user switches from item 1 to item 2 quickly, the response for 1 might arrive <em>after</em> the one for 2 and overwrite it. Fix: an <code>ignore</code> flag set by cleanup.</p>
      <pre><code>useEffect(() =&gt; {
  let ignore = false;
  fetchUser(id).then(data =&gt; {
    if (!ignore) setUser(data);
  });
  return () =&gt; { ignore = true; };
}, [id]);</code></pre>
      <p>In real apps prefer a framework or library (React Router, TanStack Query, Next.js) or the <code>use</code> API with Suspense — they handle caching and races for you.</p>

      <h3>You might not need an effect</h3>
      <p>Effects are an escape hatch. Common cases where you should <strong>not</strong> use one:</p>
      <ul>
        <li><strong>Deriving data</strong>: compute it during render instead of syncing it into state.</li>
        <li><strong>Responding to a user event</strong>: put that logic in the event handler — you know exactly what happened there.</li>
        <li><strong>Resetting state when a prop changes</strong>: give the component a different <code>key</code>.</li>
      </ul>
      <pre><code>// ❌ Extra state + effect = extra render, easy to get out of sync
const [fullName, setFullName] = useState('');
useEffect(() =&gt; { setFullName(first + ' ' + last); }, [first, last]);

// ✅ Just calculate it
const fullName = first + ' ' + last;</code></pre>
      <div class="warn">Pitfall: calling <code>setState</code> unconditionally inside an effect that depends on that same state creates an infinite loop.</div>
    `,
    examples: [
      {
        title: 'Render vs effect order & dependencies',
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');

  console.log('1. render', { count, text });

  useEffect(() => {
    console.log('2. effect (every render)');
  });

  useEffect(() => {
    console.log('2. effect [] — only on mount');
  }, []);

  useEffect(() => {
    console.log('2. effect [count] — count is', count);
    return () => console.log('   cleanup [count] — old count was', count);
  }, [count]);

  return (
    <div>
      <button onClick={() => setCount(c => c + 1)}>count: {count}</button>{' '}
      <input value={text} onChange={e => setText(e.target.value)} placeholder="type here" />
      <p style={{ color: 'gray' }}>Typing only re-runs the no-deps effect. Clicking re-runs [count] too.</p>
    </div>
  );
}`,
      },
      {
        title: 'Timer with cleanup',
        code: `import { useState, useEffect } from 'react';

function Clock({ intervalMs }) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    console.log('start interval every', intervalMs, 'ms');
    const id = setInterval(() => {
      setSeconds(s => s + 1); // updater: no need to list seconds as a dep
    }, intervalMs);
    return () => {
      console.log('clear interval', intervalMs);
      clearInterval(id);
    };
  }, [intervalMs]);

  return <h2>Ticks: {seconds}</h2>;
}

export default function App() {
  const [show, setShow] = useState(true);
  const [fast, setFast] = useState(false);

  return (
    <div>
      <button onClick={() => setShow(s => !s)}>{show ? 'Unmount' : 'Mount'} clock</button>{' '}
      <label>
        <input type="checkbox" checked={fast} onChange={e => setFast(e.target.checked)} /> fast
      </label>
      {show && <Clock intervalMs={fast ? 200 : 1000} />}
    </div>
  );
}`,
      },
      {
        title: 'Simulated fetch with race-condition fix',
        code: `import { useState, useEffect } from 'react';

const USERS = { 1: 'Ana (slow: 2s)', 2: 'Ben (fast: 0.3s)', 3: 'Cy (1s)' };
const DELAYS = { 1: 2000, 2: 300, 3: 1000 };

function fakeFetchUser(id) {
  return new Promise(resolve =>
    setTimeout(() => resolve({ id, name: USERS[id] }), DELAYS[id])
  );
}

export default function App() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState(null);
  const [useIgnore, setUseIgnore] = useState(true);

  useEffect(() => {
    let ignore = false;
    setUser(null);
    console.log('fetching user', userId);
    fakeFetchUser(userId).then(data => {
      if (useIgnore && ignore) {
        console.log('ignored stale response for', data.id);
        return;
      }
      console.log('setUser', data.id);
      setUser(data);
    });
    return () => {
      ignore = true;
    };
  }, [userId, useIgnore]);

  return (
    <div>
      <label>
        <input type="checkbox" checked={useIgnore} onChange={e => setUseIgnore(e.target.checked)} />
        use ignore flag
      </label>
      <div style={{ margin: '8px 0' }}>
        {[1, 2, 3].map(id => (
          <button key={id} onClick={() => setUserId(id)} style={{ fontWeight: id === userId ? 'bold' : 'normal', marginRight: 4 }}>
            User {id}
          </button>
        ))}
      </div>
      <p>Selected: {userId}</p>
      <p>Showing: {user ? user.name : 'Loading…'}</p>
      <p style={{ color: 'gray' }}>
        Try: uncheck the flag, click User 1 then quickly User 2. After 2s the old answer (Ana) overwrites Ben!
      </p>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: responses can arrive out of order</summary>
          <p>Each click starts a new fake request. User 1 takes <strong>2s</strong>, User 2 only <strong>0.3s</strong>. Click User 1, then User 2 right away, and <strong>without</strong> the fix this happens:</p>
          <table>
            <tr><th>Time</th><th>What happens</th><th>Screen shows</th></tr>
            <tr><td>0s</td><td>Click User 1 → request A starts (2s)</td><td>Loading…</td></tr>
            <tr><td>0.2s</td><td>Click User 2 → request B starts (0.3s)</td><td>Loading…</td></tr>
            <tr><td>0.5s</td><td>B finishes → <code>setUser(Ben)</code></td><td>Ben ✅</td></tr>
            <tr><td>2s</td><td>A finishes <em>late</em> → <code>setUser(Ana)</code></td><td><strong>Ana ❌</strong> while "Selected: 2"</td></tr>
          </table>
          <p>Request A is stale: the user no longer wants User 1. But its <code>.then</code> still calls <code>setUser</code> and overwrites the correct answer. This is a <strong>race condition</strong>: the result depends on which request happens to finish last.</p>
          </details>
          <details>
            <summary>The fix: each effect run gets its own <code>ignore</code> flag</summary>
          <pre><code>useEffect(() =&gt; {
  let ignore = false;                 // ① a NEW variable for this run only
  fakeFetchUser(userId).then(data =&gt; {
    if (ignore) return;               // ③ this run's result is outdated → drop it
    setUser(data);
  });
  return () =&gt; { ignore = true; };    // ② React calls this when userId changes
}, [userId]);</code></pre>
          <ol>
            <li><strong>①</strong> Every time the effect runs, <code>let ignore = false</code> creates a <em>fresh</em> variable. Run A has its own <code>ignore</code>, and run B has a different one. The <code>.then</code> callback and the cleanup function are closures, so they remember the <code>ignore</code> of the run that created them.</li>
            <li><strong>②</strong> When <code>userId</code> changes from 1 to 2, React runs the <strong>cleanup of run A before</strong> starting run B. That sets <em>A's</em> <code>ignore = true</code>. B's flag stays <code>false</code>.</li>
            <li><strong>③</strong> When A's slow response finally arrives, its callback checks <em>its own</em> flag, finds <code>true</code>, and returns without calling <code>setUser</code>. Only the latest run can update state.</li>
          </ol>
          <table>
            <tr><th>Time</th><th>With the fix</th><th>Screen shows</th></tr>
            <tr><td>0s</td><td>Run A: <code>ignoreA = false</code>, request A starts</td><td>Loading…</td></tr>
            <tr><td>0.2s</td><td>userId → 2: cleanup A sets <code>ignoreA = true</code>. Run B: <code>ignoreB = false</code></td><td>Loading…</td></tr>
            <tr><td>0.5s</td><td>B finishes, <code>ignoreB</code> is false → <code>setUser(Ben)</code></td><td>Ben ✅</td></tr>
            <tr><td>2s</td><td>A finishes, <code>ignoreA</code> is true → ignored</td><td>Ben ✅</td></tr>
          </table>
          </details>
          <details>
            <summary>How the demo lets you compare</summary>
          <p>The checkbox changes the check to <code>if (useIgnore &amp;&amp; ignore)</code>. Unchecked, the condition is always false, so every response is applied: that's the bug. Watch the console: with the flag on you'll see <code>ignored stale response for 1</code>. (<code>useIgnore</code> is in the deps, so toggling it re-runs the effect too.) <code>setUser(null)</code> at the start clears the old user so "Loading…" shows while waiting.</p>

          <div class="tip">The flag doesn't <em>stop</em> the request. It only throws away the stale result. With a real <code>fetch</code>, you can also cancel the request: create an <code>AbortController</code>, pass <code>{ signal: controller.signal }</code> to <code>fetch</code>, and call <code>controller.abort()</code> in the cleanup.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'When does the effect in <code>useEffect(fn, [])</code> run?',
        options: ['Before every render', 'Once, after the component first appears on screen', 'After every render', 'Never'],
        answer: 1,
        why: 'An empty dependency array means "nothing to re-sync on", so it runs only after mount (plus the extra dev-only StrictMode run).',
      },
      {
        q: 'What is the cleanup function for?',
        options: ['Resetting state to its initial value', 'Undoing what the setup did (clear timers, remove listeners) before re-running or unmounting', 'Freeing memory used by JSX', 'Running code before the first render'],
        answer: 1,
        why: 'Cleanup stops whatever setup started so you do not leak timers, subscriptions or connections.',
      },
      {
        q: 'Why does the fetching example use an <code>ignore</code> flag?',
        options: ['To make fetching faster', 'To skip the first render', 'So a response for an outdated request cannot overwrite newer data', 'Because Promises cannot be awaited in effects'],
        answer: 2,
        why: 'When deps change, cleanup sets <code>ignore = true</code> for the old request, so its late response is discarded.',
      },
      {
        q: 'You have <code>items</code> state and want <code>visibleItems</code> (filtered by a search term). Best approach?',
        options: ['Store <code>visibleItems</code> in state and update it in an effect', 'Compute <code>const visibleItems = items.filter(...)</code> during render', 'Use a ref', 'Use <code>setTimeout</code>'],
        answer: 1,
        why: 'Derived data should be calculated during render. An effect would cause an extra render and can get out of sync. (If the filter is slow, <code>useMemo</code> can cache it.)',
      },
      {
        q: 'In development, why might you see your effect run twice on mount?',
        options: ['A bug in React', '<code>&lt;StrictMode&gt;</code> mounts, cleans up, and mounts again to check your cleanup', 'The dependency array is wrong', 'The browser double-clicks'],
        answer: 1,
        why: 'StrictMode intentionally does an extra setup+cleanup cycle in development only, to surface missing cleanups.',
      },
    ],
    exercise: {
      task: `<p>Show the current <strong>mouse position</strong> inside the preview. Use an effect to add a <code>pointermove</code> listener on <code>window</code>, and remove it in the cleanup. A checkbox toggles tracking on and off — when off, the listener must be removed (check the console logs).</p>`,
      starter: `import { useState, useEffect } from 'react';

export default function App() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [tracking, setTracking] = useState(true);

  // TODO: useEffect that adds a 'pointermove' listener when tracking is true
  // and removes it in cleanup. Log 'add' / 'remove'.

  return (
    <div style={{ height: 200 }}>
      <label>
        <input type="checkbox" checked={tracking} onChange={e => setTracking(e.target.checked)} /> track mouse
      </label>
      <p>x: {pos.x}, y: {pos.y}</p>
    </div>
  );
}`,
      hint: 'Inside the effect: if (!tracking) return; define function handle(e) { setPos({ x: e.clientX, y: e.clientY }) }; window.addEventListener(...); return () => window.removeEventListener(...). Dependencies: [tracking].',
      solution: `import { useState, useEffect } from 'react';

export default function App() {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [tracking, setTracking] = useState(true);

  useEffect(() => {
    if (!tracking) return;
    function handle(e) {
      setPos({ x: e.clientX, y: e.clientY });
    }
    console.log('add listener');
    window.addEventListener('pointermove', handle);
    return () => {
      console.log('remove listener');
      window.removeEventListener('pointermove', handle);
    };
  }, [tracking]);

  return (
    <div style={{ height: 200 }}>
      <label>
        <input type="checkbox" checked={tracking} onChange={e => setTracking(e.target.checked)} /> track mouse
      </label>
      <p>x: {pos.x}, y: {pos.y}</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useRef
  {
    id: 'useref',
    section: 'Core Hooks',
    title: 'useRef',
    explain: `
      <p><code>useRef(initial)</code> returns a plain object <code>{ current: initial }</code> that React keeps for the whole life of the component. You can read and write <code>ref.current</code> freely, and <strong>changing it does not trigger a re-render</strong>.</p>
      <p>Analogy: state is a whiteboard in the classroom — change it and everybody looks up (re-render). A ref is a sticky note in your pocket — you can scribble on it anytime, nobody notices.</p>

      <h3>Use 1: referencing DOM nodes</h3>
      <p>Pass a ref to a JSX element's <code>ref</code> attribute. After React creates the node, it sets <code>ref.current</code> to that DOM element.</p>
      <pre><code>const inputRef = useRef(null);
// ...
&lt;input ref={inputRef} /&gt;
&lt;button onClick={() =&gt; inputRef.current.focus()}&gt;Focus&lt;/button&gt;</code></pre>
      <div class="tip">React 19: <code>ref</code> is a normal prop for your own components too. Write <code>function MyInput({ ref, ...props }) { return &lt;input ref={ref} {...props} /&gt; }</code>. <code>forwardRef</code> is no longer needed (legacy).</div>

      <h3>Use 2: remembering values that don't affect the UI</h3>
      <p>Timer IDs, previous values, "has this run yet?" flags, counters for debugging. Anything the screen doesn't show.</p>
      <pre><code>const intervalRef = useRef(null);
intervalRef.current = setInterval(...);
clearInterval(intervalRef.current);</code></pre>

      <h3>Ref vs state</h3>
      <ul>
        <li>Shown on screen? → <strong>state</strong>.</li>
        <li>Only needed by event handlers/effects, never displayed? → <strong>ref</strong>.</li>
      </ul>
      <div class="warn">Pitfall: don't read or write <code>ref.current</code> during rendering (except lazy init). The UI won't update when it changes, so the screen goes stale. Use refs in event handlers and effects.</div>
      <div class="warn">Pitfall: <code>ref.current</code> is <code>null</code> during the first render — the DOM node doesn't exist yet. It's ready in effects and event handlers.</div>
    `,
    examples: [
      {
        title: 'Focus an input',
        code: `import { useRef } from 'react';

// React 19: ref is a regular prop — no forwardRef needed
function FancyInput({ ref, label }) {
  return (
    <label>
      {label} <input ref={ref} style={{ border: '2px solid rebeccapurple' }} />
    </label>
  );
}

export default function App() {
  const nameRef = useRef(null);
  const cityRef = useRef(null);

  return (
    <div>
      <FancyInput ref={nameRef} label="Name" /><br />
      <FancyInput ref={cityRef} label="City" /><br />
      <button onClick={() => nameRef.current.focus()}>Focus name</button>{' '}
      <button onClick={() => { cityRef.current.focus(); cityRef.current.select(); }}>
        Focus + select city
      </button>
    </div>
  );
}`,
      },
      {
        title: 'Stopwatch: interval ID in a ref',
        code: `import { useState, useRef } from 'react';

export default function App() {
  const [startTime, setStartTime] = useState(null);
  const [now, setNow] = useState(null);
  const intervalRef = useRef(null); // not shown on screen → ref

  function start() {
    setStartTime(Date.now());
    setNow(Date.now());
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setNow(Date.now()), 10);
  }

  function stop() {
    clearInterval(intervalRef.current);
  }

  const elapsed = startTime && now ? (now - startTime) / 1000 : 0;

  return (
    <div>
      <h2>{elapsed.toFixed(2)} s</h2>
      <button onClick={start}>Start</button>{' '}
      <button onClick={stop}>Stop</button>
    </div>
  );
}`,
      },
      {
        title: 'Ref vs state: which re-renders?',
        code: `import { useState, useRef } from 'react';

export default function App() {
  const [stateCount, setStateCount] = useState(0);
  const refCount = useRef(0);
  console.log('render');

  return (
    <div>
      <button onClick={() => setStateCount(c => c + 1)}>state +1</button>{' '}
      <button onClick={() => {
        refCount.current += 1;
        console.log('ref is now', refCount.current, '(no render)');
      }}>ref +1</button>{' '}
      <button onClick={() => alert('ref value: ' + refCount.current)}>show ref</button>
      <p>state: {stateCount}</p>
      <p style={{ color: 'gray' }}>
        The ref changes silently. Its value only shows up here when something else causes a render.
      </p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What happens when you change <code>myRef.current</code>?',
        options: ['The component re-renders', 'Nothing visible — the value is stored but no re-render happens', 'React throws an error', 'All children re-render'],
        answer: 1,
        why: 'Refs are mutable boxes React does not track. Only state updates trigger re-renders.',
      },
      {
        q: 'Where is it safe to read <code>inputRef.current.value</code>?',
        options: ['At the top of the component body during render', 'In an event handler or effect', 'Inside JSX', 'In the useRef initial value'],
        answer: 1,
        why: 'During the first render the DOM node does not exist yet, and reading refs in render makes output unpredictable. Handlers and effects run after the DOM exists.',
      },
      {
        q: 'In React 19, how do you let a parent pass a ref into your <code>MyInput</code> component?',
        options: ['Wrap it in <code>forwardRef</code> (required)', 'Accept <code>ref</code> as a regular prop and put it on the inner element', 'Refs cannot be passed to components', 'Use <code>useContext</code>'],
        answer: 1,
        why: 'Since React 19, <code>ref</code> is a normal prop for function components. <code>forwardRef</code> still works but is legacy.',
      },
      {
        q: 'A stopwatch needs the interval ID to stop it later. Where should the ID live?',
        options: ['A regular <code>let</code> variable in the component', 'State', 'A ref', 'A CSS variable'],
        answer: 2,
        why: 'A local <code>let</code> is reset every render; state would cause pointless re-renders. A ref persists without re-rendering.',
      },
    ],
    exercise: {
      task: `<p>Build a mini chat input. Typing is handled by state. When you click <strong>Send</strong>: log the message to the console, clear the input, and <strong>put focus back into the input</strong> using a ref. Also keep a ref counter of how many messages were sent and log it (it should not cause extra renders).</p>`,
      starter: `import { useState, useRef } from 'react';

export default function App() {
  const [text, setText] = useState('');
  // TODO: create inputRef and sentCount refs

  function send() {
    // TODO: log, clear, focus, count
  }

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="Message" />
      <button onClick={send}>Send</button>
    </div>
  );
}`,
      hint: 'const inputRef = useRef(null); put ref={inputRef} on the input. In send(): sentCount.current += 1; setText(\'\'); inputRef.current.focus().',
      solution: `import { useState, useRef } from 'react';

export default function App() {
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const sentCount = useRef(0);

  function send() {
    if (!text.trim()) return;
    sentCount.current += 1;
    console.log('Sent #' + sentCount.current + ':', text);
    setText('');
    inputRef.current.focus();
  }

  return (
    <div>
      <input ref={inputRef} value={text} onChange={e => setText(e.target.value)} placeholder="Message" />
      <button onClick={send}>Send</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useContext
  {
    id: 'usecontext',
    section: 'Core Hooks',
    title: 'useContext',
    explain: `
      <p>Passing props down one level is great. Passing the same prop through five components that don't use it — just to reach one deep child — is called <strong>prop drilling</strong>, and it gets painful.</p>
      <p><strong>Context</strong> is like a radio broadcast: a parent "broadcasts" a value, and any component below it can "tune in" with <code>useContext</code>, no matter how deep.</p>

      <h3>Three steps</h3>
      <pre><code>// 1. Create (outside components). The argument is the default value.
const ThemeContext = createContext('light');

// 2. Provide — React 19: render the context itself as the provider
&lt;ThemeContext value="dark"&gt;
  &lt;Page /&gt;
&lt;/ThemeContext&gt;

// 3. Consume anywhere below
function Button() {
  const theme = useContext(ThemeContext);
  ...
}</code></pre>
      <div class="tip">React 19: <code>&lt;ThemeContext value={...}&gt;</code> works directly. The older <code>&lt;ThemeContext.Provider value={...}&gt;</code> still works but will be deprecated.</div>

      <h3>How lookup works</h3>
      <ul>
        <li><code>useContext</code> finds the <strong>nearest</strong> provider above the component.</li>
        <li>No provider above? You get the <strong>default</strong> from <code>createContext</code>.</li>
        <li>Providers can be nested to override a value for a subtree.</li>
        <li>When the provided value changes, every component that reads that context re-renders.</li>
      </ul>

      <h3>Making it updatable</h3>
      <p>Context itself is read-only. To change it, keep the value in state in the parent and pass both the value and a setter (or functions) through the context.</p>
      <pre><code>const [user, setUser] = useState(null);
&lt;UserContext value={{ user, setUser }}&gt;...&lt;/UserContext&gt;</code></pre>
      <div class="tip">You can also read context with <code>use(ThemeContext)</code>. Unlike <code>useContext</code>, <code>use</code> may be called inside <code>if</code> statements.</div>
      <div class="warn">Don't reach for context first. If passing props through 1–2 levels works, do that — it's explicit. Also consider passing JSX as <code>children</code>, which often removes drilling without context.</div>
    `,
    examples: [
      {
        title: 'Theme toggle with context',
        code: `import { createContext, useContext, useState } from 'react';

const ThemeContext = createContext('light');

function Panel({ title, children }) {
  const theme = useContext(ThemeContext);
  const style = {
    padding: 12,
    borderRadius: 8,
    background: theme === 'dark' ? '#222' : '#eee',
    color: theme === 'dark' ? '#fff' : '#000',
  };
  return (
    <section style={style}>
      <h3>{title}</h3>
      {children}
    </section>
  );
}

function ThemedButton({ children }) {
  const theme = useContext(ThemeContext);
  return (
    <button style={{ background: theme === 'dark' ? '#555' : '#fff', color: theme === 'dark' ? '#fff' : '#000' }}>
      {children}
    </button>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext value={theme}>
      <label>
        <input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} />
        dark mode
      </label>
      <Panel title="Welcome">
        <ThemedButton>Sign up</ThemedButton> <ThemedButton>Log in</ThemedButton>
      </Panel>
    </ThemeContext>
  );
}`,
      },
      {
        title: 'Nearest provider wins + default value',
        code: `import { createContext, useContext } from 'react';

const LevelContext = createContext(1); // default

function Heading({ children }) {
  const level = useContext(LevelContext);
  const sizes = { 1: 28, 2: 22, 3: 18, 4: 15 };
  return <div style={{ fontSize: sizes[level] || 14, fontWeight: 'bold' }}>h{level}: {children}</div>;
}

function Section({ children }) {
  const level = useContext(LevelContext);
  return (
    <div style={{ borderLeft: '3px solid #aaa', paddingLeft: 10, margin: '4px 0' }}>
      <LevelContext value={level + 1}>{children}</LevelContext>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Heading>No provider → default (1)</Heading>
      <Section>
        <Heading>Inside one Section</Heading>
        <Section>
          <Heading>Nested Section</Heading>
          <Section>
            <Heading>Even deeper</Heading>
          </Section>
        </Section>
      </Section>
    </div>
  );
}`,
      },
      {
        title: 'Updating context: value + setter',
        code: `import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

function AddButton({ product }) {
  const { addItem } = useContext(CartContext);
  return <button onClick={() => addItem(product)}>Add {product}</button>;
}

function CartBadge() {
  const { items } = useContext(CartContext);
  return <strong>🛒 {items.length}</strong>;
}

// Header and ProductList don't need to know about the cart at all
function Header() {
  return <header style={{ marginBottom: 8 }}>My Shop — <CartBadge /></header>;
}
function ProductList() {
  return (
    <div>
      <AddButton product="Tea" /> <AddButton product="Coffee" />
    </div>
  );
}

export default function App() {
  const [items, setItems] = useState([]);
  const addItem = product => setItems(prev => [...prev, product]);

  return (
    <CartContext value={{ items, addItem }}>
      <Header />
      <ProductList />
      <p style={{ color: 'gray' }}>{items.join(', ') || 'Cart is empty'}</p>
    </CartContext>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What value does <code>useContext(MyContext)</code> return if there is no provider above the component?',
        options: ['<code>undefined</code> always', 'The default passed to <code>createContext(default)</code>', 'It throws an error', 'The value of the last provider rendered anywhere'],
        answer: 1,
        why: 'Without a provider, React falls back to the default value given to <code>createContext</code>.',
      },
      {
        q: 'In React 19, what is the preferred way to provide a context value?',
        options: ['<code>&lt;MyContext value={v}&gt;</code>', '<code>MyContext.set(v)</code>', '<code>useContext(MyContext, v)</code>', '<code>&lt;Provider context={MyContext}&gt;</code>'],
        answer: 0,
        why: 'React 19 lets you render the context object directly as a provider. <code>.Provider</code> still works.',
      },
      {
        q: 'Two providers of the same context are nested. Which value does a deep child see?',
        options: ['The outermost one', 'The nearest one above it', 'Both, merged', 'The default'],
        answer: 1,
        why: 'Lookup walks up the tree and stops at the closest provider.',
      },
      {
        q: 'What is prop drilling?',
        options: ['Passing props through many components that don\'t use them, just to reach a deep child', 'Mutating props', 'Using too many hooks', 'Calling setState in render'],
        answer: 0,
        why: 'Context (or passing <code>children</code>) is a common fix for prop drilling.',
      },
    ],
    exercise: {
      task: `<p>Create a <code>UserContext</code>. <code>App</code> holds the current user in state (<code>null</code> or <code>'Ana'</code>). Deep inside <code>Layout → Navbar → UserBadge</code>, show "Hi, Ana" or "Guest". Put a Log in / Log out button inside <code>UserBadge</code> that updates the user via context — without passing any props through <code>Layout</code> or <code>Navbar</code>.</p>`,
      starter: `import { createContext, useContext, useState } from 'react';

// TODO: const UserContext = createContext(...)

function UserBadge() {
  // TODO: read user + setUser from context
  return <span>Guest</span>;
}

function Navbar() {
  return <nav style={{ padding: 8, background: '#eef' }}>Logo | <UserBadge /></nav>;
}

function Layout() {
  return <div><Navbar /><p>Page content</p></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  // TODO: wrap Layout in the provider
  return <Layout />;
}`,
      hint: 'const UserContext = createContext(null); In App: <UserContext value={{ user, setUser }}><Layout /></UserContext>. In UserBadge: const { user, setUser } = useContext(UserContext).',
      solution: `import { createContext, useContext, useState } from 'react';

const UserContext = createContext(null);

function UserBadge() {
  const { user, setUser } = useContext(UserContext);
  return (
    <span>
      {user ? 'Hi, ' + user : 'Guest'}{' '}
      {user ? (
        <button onClick={() => setUser(null)}>Log out</button>
      ) : (
        <button onClick={() => setUser('Ana')}>Log in</button>
      )}
    </span>
  );
}

function Navbar() {
  return <nav style={{ padding: 8, background: '#eef' }}>Logo | <UserBadge /></nav>;
}

function Layout() {
  return <div><Navbar /><p>Page content</p></div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  return (
    <UserContext value={{ user, setUser }}>
      <Layout />
    </UserContext>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── useReducer
  {
    id: 'usereducer',
    section: 'Core Hooks',
    title: 'useReducer',
    explain: `
      <p>When a component has many state updates spread across many handlers, logic gets scattered. <code>useReducer</code> moves all "how state changes" logic into <strong>one function</strong>, the <strong>reducer</strong>.</p>
      <p>Analogy: instead of each employee editing the bank ledger directly, they hand the accountant a slip that says <em>what happened</em> ("deposit 50"). The accountant (reducer) is the only one who writes the ledger.</p>
      <pre><code>function reducer(state, action) {
  switch (action.type) {
    case 'added':   return [...state, action.item];
    case 'removed': return state.filter(i =&gt; i.id !== action.id);
    default: throw new Error('Unknown action: ' + action.type);
  }
}

const [state, dispatch] = useReducer(reducer, initialState);
dispatch({ type: 'added', item });</code></pre>

      <h3>Actions</h3>
      <p>An action is a plain object describing <strong>what happened</strong>, usually with a <code>type</code> plus any data. Name them as events: <code>'added'</code>, <code>'deleted'</code>, <code>'reset'</code> — not "setItems".</p>

      <h3>Reducers must be pure</h3>
      <ul>
        <li>Same <code>(state, action)</code> → same result. No random numbers, no fetches, no timers.</li>
        <li>Never mutate <code>state</code>. Return a new object/array (same rules as <code>useState</code>).</li>
        <li>In StrictMode, React calls reducers twice in development to help catch impurity.</li>
      </ul>

      <h3>useState or useReducer?</h3>
      <ul>
        <li><strong>useState</strong>: a few independent values, simple updates.</li>
        <li><strong>useReducer</strong>: many related values, many kinds of updates, next state depends on previous in complex ways, or you want to test the logic separately (a reducer is a plain function!).</li>
      </ul>
      <div class="tip"><code>dispatch</code> is stable — it never changes between renders, so it's safe to pass down or omit from effect deps. Combine with context to share state + dispatch across a tree.</div>
      <div class="warn">Pitfall: <code>dispatch</code> does not update <code>state</code> immediately in the current handler — same snapshot rule as <code>useState</code>.</div>
    `,
    examples: [
      {
        title: 'Counter with actions (and logging)',
        code: `import { useReducer } from 'react';

function reducer(state, action) {
  console.log('reducer', action, 'prev:', state);
  switch (action.type) {
    case 'incremented':
      return { ...state, count: state.count + state.step };
    case 'decremented':
      return { ...state, count: state.count - state.step };
    case 'stepChanged':
      return { ...state, step: action.step };
    case 'reset':
      return { count: 0, step: 1 };
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, { count: 0, step: 1 });

  return (
    <div>
      <h2>{state.count}</h2>
      <button onClick={() => dispatch({ type: 'decremented' })}>−</button>{' '}
      <button onClick={() => dispatch({ type: 'incremented' })}>+</button>{' '}
      <button onClick={() => dispatch({ type: 'reset' })}>Reset</button>
      <p>
        Step:{' '}
        <input
          type="number"
          value={state.step}
          onChange={e => dispatch({ type: 'stepChanged', step: Number(e.target.value) })}
          style={{ width: 60 }}
        />
      </p>
    </div>
  );
}`,
      },
      {
        title: 'Todo list with a reducer',
        code: `import { useReducer, useState } from 'react';

let nextId = 3;

function todosReducer(todos, action) {
  switch (action.type) {
    case 'added':
      return [...todos, { id: action.id, text: action.text, done: false }];
    case 'toggled':
      return todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'deleted':
      return todos.filter(t => t.id !== action.id);
    case 'clearedDone':
      return todos.filter(t => !t.done);
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

const initial = [
  { id: 1, text: 'Write reducer', done: true },
  { id: 2, text: 'Dispatch actions', done: false },
];

export default function App() {
  const [todos, dispatch] = useReducer(todosReducer, initial);
  const [text, setText] = useState('');

  function handleAdd() {
    if (!text.trim()) return;
    // nextId++ happens HERE (in the handler), keeping the reducer pure
    dispatch({ type: 'added', id: nextId++, text });
    setText('');
  }

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="New todo" />
      <button onClick={handleAdd}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id}>
            <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'toggled', id: t.id })} />
            {t.text}{' '}
            <button onClick={() => dispatch({ type: 'deleted', id: t.id })}>✕</button>
          </li>
        ))}
      </ul>
      <button onClick={() => dispatch({ type: 'clearedDone' })}>Clear done</button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does a reducer function receive and return?',
        options: ['(props) → JSX', '(state, action) → next state', '(action) → nothing, it mutates state', '(dispatch) → action'],
        answer: 1,
        why: 'A reducer takes the current state and an action and returns the next state.',
      },
      {
        q: 'Which of these is OK inside a reducer?',
        options: ['<code>fetch(\'/api\')</code>', '<code>state.items.push(x); return state;</code>', '<code>return { ...state, count: state.count + 1 };</code>', '<code>Math.random()</code> to generate IDs'],
        answer: 2,
        why: 'Reducers must be pure and must not mutate. Generate IDs and do side effects in the event handler, then pass data via the action.',
      },
      {
        q: 'A good action name describes...',
        options: ['What happened, e.g. <code>\'added\'</code>', 'Which setter to call, e.g. <code>\'setItems\'</code>', 'The component name', 'The CSS to apply'],
        answer: 0,
        why: 'Actions describe events; the reducer decides how state changes in response.',
      },
      {
        q: 'When is <code>useReducer</code> usually a better fit than <code>useState</code>?',
        options: ['For a single boolean toggle', 'When many handlers update related state in different ways', 'When you need a ref to the DOM', 'Never — it is deprecated'],
        answer: 1,
        why: 'Centralizing complex, related update logic in one pure function makes it easier to read and test.',
      },
    ],
    exercise: {
      task: `<p>Write a <code>cartReducer</code> for a shopping cart. State is an array of <code>{ name, qty }</code>. Support actions: <code>'added'</code> (if the item exists, increase <code>qty</code>; otherwise add it with qty 1), <code>'removed'</code> (remove the item completely), and <code>'cleared'</code>. Show the total quantity.</p>`,
      starter: `import { useReducer } from 'react';

function cartReducer(cart, action) {
  switch (action.type) {
    // TODO: 'added', 'removed', 'cleared'
    default:
      return cart;
  }
}

const PRODUCTS = ['Apple', 'Bread', 'Milk'];

export default function App() {
  const [cart, dispatch] = useReducer(cartReducer, []);

  return (
    <div>
      {PRODUCTS.map(p => (
        <button key={p} onClick={() => dispatch({ type: 'added', name: p })} style={{ marginRight: 4 }}>
          + {p}
        </button>
      ))}
      <ul>
        {cart.map(item => (
          <li key={item.name}>
            {item.name} × {item.qty}
            {/* TODO: remove button */}
          </li>
        ))}
      </ul>
      {/* TODO: total qty + clear button */}
    </div>
  );
}`,
      hint: 'For "added": if (cart.some(i => i.name === action.name)) return cart.map(i => i.name === action.name ? { ...i, qty: i.qty + 1 } : i); else return [...cart, { name: action.name, qty: 1 }]. Total: cart.reduce((sum, i) => sum + i.qty, 0).',
      solution: `import { useReducer } from 'react';

function cartReducer(cart, action) {
  switch (action.type) {
    case 'added': {
      const exists = cart.some(i => i.name === action.name);
      if (exists) {
        return cart.map(i => (i.name === action.name ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...cart, { name: action.name, qty: 1 }];
    }
    case 'removed':
      return cart.filter(i => i.name !== action.name);
    case 'cleared':
      return [];
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

const PRODUCTS = ['Apple', 'Bread', 'Milk'];

export default function App() {
  const [cart, dispatch] = useReducer(cartReducer, []);
  const total = cart.reduce((sum, i) => sum + i.qty, 0);

  return (
    <div>
      {PRODUCTS.map(p => (
        <button key={p} onClick={() => dispatch({ type: 'added', name: p })} style={{ marginRight: 4 }}>
          + {p}
        </button>
      ))}
      <ul>
        {cart.map(item => (
          <li key={item.name}>
            {item.name} × {item.qty}{' '}
            <button onClick={() => dispatch({ type: 'removed', name: item.name })}>✕</button>
          </li>
        ))}
      </ul>
      <p>Total items: {total}</p>
      <button onClick={() => dispatch({ type: 'cleared' })}>Clear cart</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── Custom hooks
  {
    id: 'custom-hooks',
    section: 'Core Hooks',
    title: 'Custom hooks',
    explain: `
      <p>A <strong>custom hook</strong> is just a JavaScript function whose name starts with <code>use</code> and that calls other hooks. It lets you pull reusable stateful logic out of components — like extracting a helper function, but for hooks.</p>
      <pre><code>function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() =&gt; {
    const on = () =&gt; setIsOnline(true);
    const off = () =&gt; setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () =&gt; {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return isOnline;
}

// Any component:
const isOnline = useOnlineStatus();</code></pre>

      <h3>Key facts</h3>
      <ul>
        <li><strong>Name must start with <code>use</code></strong> + a capital letter (<code>useToggle</code>). This tells React and the linter that the Rules of Hooks apply.</li>
        <li><strong>Hooks share logic, not state.</strong> Each component calling <code>useToggle()</code> gets its own independent state — like two people using the same recipe get two separate cakes.</li>
        <li>A custom hook re-runs on every render of the component that uses it, so it always sees the latest props/state.</li>
        <li>Return whatever is convenient: a value, an array <code>[value, setter]</code>, or an object <code>{ data, loading }</code>.</li>
      </ul>
      <div class="tip">Only call it a hook if it uses hooks. A function that doesn't call any hooks should be a regular function (e.g. <code>formatDate</code>, not <code>useFormatDate</code>).</div>
      <div class="warn">Avoid "lifecycle" hooks like <code>useMount(fn)</code>. Prefer hooks named after a concrete purpose: <code>useChatRoom</code>, <code>useWindowWidth</code>, <code>useFetch</code>.</div>
    `,
    examples: [
      {
        title: 'useToggle — logic shared, state separate',
        code: `import { useState } from 'react';

function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn(v => !v);
  return [on, toggle];
}

function Lamp({ name }) {
  const [on, toggle] = useToggle();
  return (
    <div style={{ margin: 6 }}>
      <span style={{ fontSize: 28, filter: on ? 'none' : 'grayscale(1) opacity(0.4)' }}>💡</span>
      {' '}{name}{' '}
      <button onClick={toggle}>{on ? 'Turn off' : 'Turn on'}</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Lamp name="Kitchen" />
      <Lamp name="Bedroom" />
      <p style={{ color: 'gray' }}>Same hook, independent state per component.</p>
    </div>
  );
}`,
      },
      {
        title: 'useWindowWidth — hook with an effect',
        code: `import { useState, useEffect } from 'react';

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}

export default function App() {
  const width = useWindowWidth();
  const size = width < 400 ? 'small' : width < 700 ? 'medium' : 'large';
  return (
    <div>
      <h2>{width}px</h2>
      <p>Layout: <strong>{size}</strong></p>
      <p style={{ color: 'gray' }}>Resize your browser window to see it update.</p>
    </div>
  );
}`,
      },
      {
        title: 'useFakeFetch — data, loading, race-safe',
        code: `import { useState, useEffect } from 'react';

const DB = { cats: ['Tom', 'Felix', 'Garfield'], dogs: ['Rex', 'Lassie'], birds: ['Tweety'] };

function fakeApi(topic) {
  const delay = 300 + Math.random() * 900;
  return new Promise(r => setTimeout(() => r(DB[topic]), delay));
}

function useFakeFetch(topic) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    fakeApi(topic).then(result => {
      if (!ignore) {
        setData(result);
        setLoading(false);
      }
    });
    return () => { ignore = true; };
  }, [topic]);

  return { data, loading };
}

export default function App() {
  const [topic, setTopic] = useState('cats');
  const { data, loading } = useFakeFetch(topic);

  return (
    <div>
      <select value={topic} onChange={e => setTopic(e.target.value)}>
        <option value="cats">cats</option>
        <option value="dogs">dogs</option>
        <option value="birds">birds</option>
      </select>
      {loading ? <p>Loading…</p> : <ul>{data.map(n => <li key={n}>{n}</li>)}</ul>}
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'Two components both call <code>useCounter()</code>. Do they share the same count?',
        options: ['Yes, custom hooks share state globally', 'No, each call has its own independent state', 'Only if they are siblings', 'Only in StrictMode'],
        answer: 1,
        why: 'Custom hooks share <em>logic</em>. Every call creates its own state. To share state, lift it up or use context.',
      },
      {
        q: 'Why must a custom hook\'s name start with <code>use</code>?',
        options: ['It\'s required for it to be exported', 'So React and the linter know the Rules of Hooks apply to it', 'It makes it faster', 'It\'s just style, nothing checks it'],
        answer: 1,
        why: 'The <code>use</code> prefix signals that the function may call hooks, so lint rules enforce hook rules inside it and where it is called.',
      },
      {
        q: 'Which function should NOT be named as a hook?',
        options: ['One that calls <code>useState</code>', 'One that calls <code>useEffect</code> and <code>useRef</code>', 'One that only formats a date string', 'One that calls another custom hook'],
        answer: 2,
        why: 'If it calls no hooks, make it a regular function. Then it can be called anywhere, even conditionally.',
      },
    ],
    exercise: {
      task: `<p>Write a custom hook <code>useCounter(initial = 0, step = 1)</code> that returns <code>{ count, increment, decrement, reset }</code>. Use it twice in <code>App</code>: one counter stepping by 1, another by 10. Verify they are independent.</p>`,
      starter: `import { useState } from 'react';

function useCounter(initial = 0, step = 1) {
  // TODO
  return { count: initial, increment() {}, decrement() {}, reset() {} };
}

export default function App() {
  const a = useCounter(0, 1);
  // TODO: second counter with step 10

  return (
    <div>
      <p>
        A: {a.count}{' '}
        <button onClick={a.decrement}>−</button>
        <button onClick={a.increment}>+</button>
        <button onClick={a.reset}>reset</button>
      </p>
    </div>
  );
}`,
      hint: 'Inside the hook: const [count, setCount] = useState(initial); const increment = () => setCount(c => c + step); ... return { count, increment, decrement, reset }.',
      solution: `import { useState } from 'react';

function useCounter(initial = 0, step = 1) {
  const [count, setCount] = useState(initial);
  const increment = () => setCount(c => c + step);
  const decrement = () => setCount(c => c - step);
  const reset = () => setCount(initial);
  return { count, increment, decrement, reset };
}

export default function App() {
  const a = useCounter(0, 1);
  const b = useCounter(100, 10);

  return (
    <div>
      <p>
        A: {a.count}{' '}
        <button onClick={a.decrement}>−</button>
        <button onClick={a.increment}>+</button>
        <button onClick={a.reset}>reset</button>
      </p>
      <p>
        B: {b.count}{' '}
        <button onClick={b.decrement}>−10</button>
        <button onClick={b.increment}>+10</button>
        <button onClick={b.reset}>reset</button>
      </p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── Rules of Hooks
  {
    id: 'rules-of-hooks',
    section: 'Core Hooks',
    title: 'Rules of Hooks',
    explain: `
      <p>Hooks have two rules. Break them and you get confusing bugs or errors like <em>"Rendered more hooks than during the previous render."</em></p>
      <h3>Rule 1: Only call hooks at the top level</h3>
      <p>Don't call hooks inside <code>if</code>, loops, nested functions, after an early <code>return</code>, inside <code>try/catch</code>, or in event handlers. Call them at the top of your component, in the same order every render.</p>
      <h3>Rule 2: Only call hooks from React functions</h3>
      <p>Call them from function components or from custom hooks — never from regular JS functions or class components.</p>

      <h3>Why? Order is identity</h3>
      <p>React doesn't know hooks by name. It keeps a list per component and matches them by <strong>call order</strong>: "first <code>useState</code> is slot 1, second is slot 2…". Like a coat check that gives out tickets by number: if you skip a hook once, everyone after it gets the wrong coat.</p>
      <pre><code>// ❌ Render 1: slot1=name, slot2=age
// ❌ Render 2 (show=false): slot1=age?!  → crash / wrong state
function Profile({ show }) {
  if (show) {
    const [name, setName] = useState('');
  }
  const [age, setAge] = useState(0);
}</code></pre>

      <h3>How to fix</h3>
      <ul>
        <li>Move the hook above any condition/early return. Put the <em>condition inside</em> the hook (e.g. inside the effect body).</li>
        <li>Or extract a child component and render it conditionally — each component has its own hook list.</li>
      </ul>
      <pre><code>// ✅
useEffect(() =&gt; {
  if (!enabled) return;
  ...
}, [enabled]);</code></pre>
      <div class="tip">Exception: the <code>use</code> API (<code>use(promise)</code>, <code>use(Context)</code>) is not a hook in this sense and <em>may</em> be called inside conditions and loops. It still must be called inside a component or hook.</div>
      <div class="tip">Install <code>eslint-plugin-react-hooks</code>. It catches these mistakes as you type. The React Compiler relies on these rules too.</div>
    `,
    examples: [
      {
        title: '❌ Broken: hook inside a condition (read-only)',
        runnable: false,
        code: `import { useState } from 'react';

function Greeting({ loggedIn }) {
  if (!loggedIn) {
    return <p>Please log in</p>; // early return BEFORE a hook ❌
  }
  const [name, setName] = useState('Ana');
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

// Toggling loggedIn changes the number of hooks called →
// "Rendered more hooks than during the previous render."`,
      },
      {
        title: '✅ Fixed: hooks first, conditions after',
        code: `import { useState } from 'react';

function Greeting({ loggedIn }) {
  const [name, setName] = useState('Ana'); // always called
  if (!loggedIn) {
    return <p>Please log in</p>;
  }
  return <input value={name} onChange={e => setName(e.target.value)} />;
}

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  return (
    <div>
      <button onClick={() => setLoggedIn(v => !v)}>{loggedIn ? 'Log out' : 'Log in'}</button>
      <Greeting loggedIn={loggedIn} />
    </div>
  );
}`,
      },
      {
        title: '✅ Conditional child component & conditional use()',
        code: `import { useState, use, createContext } from 'react';

const ColorContext = createContext('tomato');

// Child has its own hook list, so it's fine to render it conditionally
function Details() {
  const [likes, setLikes] = useState(0);
  return <button onClick={() => setLikes(l => l + 1)}>♥ {likes}</button>;
}

function Label({ colored, children }) {
  let color = 'black';
  if (colored) {
    color = use(ColorContext); // use() may be called conditionally
  }
  return <span style={{ color }}>{children}</span>;
}

export default function App() {
  const [open, setOpen] = useState(true);
  const [colored, setColored] = useState(true);
  return (
    <div>
      <button onClick={() => setOpen(o => !o)}>{open ? 'Hide' : 'Show'} details</button>{' '}
      <button onClick={() => setColored(c => !c)}>Toggle color</button>
      <p><Label colored={colored}>Post title</Label></p>
      {open && <Details />}
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'How does React know which <code>useState</code> call belongs to which piece of state?',
        options: ['By the variable name', 'By the order the hooks are called in', 'By a hidden ID you pass', 'By the initial value'],
        answer: 1,
        why: 'React relies on call order. That is why the order must be identical on every render.',
      },
      {
        q: 'Which of these is allowed?',
        options: ['<code>if (x) useEffect(...)</code>', '<code>for (...) useState()</code>', '<code>useEffect(() =&gt; { if (x) {...} }, [x])</code>', 'Calling <code>useState</code> inside an <code>onClick</code> handler'],
        answer: 2,
        why: 'Put the condition inside the hook, not around it.',
      },
      {
        q: 'Which one may be called inside an <code>if</code>?',
        options: ['<code>useContext</code>', '<code>useState</code>', '<code>use</code>', '<code>useRef</code>'],
        answer: 2,
        why: 'The <code>use</code> API is special: it can be called conditionally and in loops (but still only inside components/hooks).',
      },
      {
        q: 'Where can you call hooks?',
        options: ['Any JavaScript function', 'Function components and custom hooks', 'Class components', 'Top level of a module'],
        answer: 1,
        why: 'Hooks only work while React is rendering a function component (or a custom hook called from one).',
      },
    ],
    exercise: {
      task: `<p>This <code>Spoiler</code> component breaks the Rules of Hooks: it returns early before calling <code>useState</code>. Click <strong>Reveal</strong> to see the error in the console, then fix it so revealing and hiding works and the counter keeps its value. (Two valid fixes: move the hook up, or extract a child component.)</p>`,
      starter: `import { useState } from 'react';

function Spoiler({ revealed }) {
  if (!revealed) {
    return <p>🙈 Hidden</p>;
  }
  // ❌ This hook only runs sometimes
  const [clicks, setClicks] = useState(0);
  return (
    <p>
      The butler did it! <button onClick={() => setClicks(c => c + 1)}>clicked {clicks}</button>
    </p>
  );
}

export default function App() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <button onClick={() => setRevealed(r => !r)}>{revealed ? 'Hide' : 'Reveal'}</button>
      <Spoiler revealed={revealed} />
    </div>
  );
}`,
      hint: 'Move const [clicks, setClicks] = useState(0) above the if statement so it is called on every render.',
      solution: `import { useState } from 'react';

function Spoiler({ revealed }) {
  const [clicks, setClicks] = useState(0); // ✅ always called
  if (!revealed) {
    return <p>🙈 Hidden</p>;
  }
  return (
    <p>
      The butler did it! <button onClick={() => setClicks(c => c + 1)}>clicked {clicks}</button>
    </p>
  );
}

export default function App() {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <button onClick={() => setRevealed(r => !r)}>{revealed ? 'Hide' : 'Reveal'}</button>
      <Spoiler revealed={revealed} />
    </div>
  );
}`,
    },
  },
);
