window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── lazy + Suspense ─────────────────────────────
  {
    id: 'lazy-suspense',
    section: 'Advanced APIs',
    title: 'lazy & Suspense',
    explain: `
      <p>Big apps ship a lot of JavaScript. <strong>Code splitting</strong> means loading a component's code only when it's needed. <code>lazy</code> does this for components:</p>
      <pre><code>import { lazy, Suspense } from 'react';

const Settings = lazy(() =&gt; import('./Settings.js'));

&lt;Suspense fallback={&lt;Spinner /&gt;}&gt;
  &lt;Settings /&gt;
&lt;/Suspense&gt;</code></pre>
      <ul>
        <li><code>lazy(load)</code> takes a function returning a <strong>Promise</strong> that resolves to a module with a <code>default</code> export (a component).</li>
        <li>The first time <code>&lt;Settings /&gt;</code> renders, React calls <code>load()</code> and <strong>suspends</strong> until it resolves.</li>
        <li>The nearest <code>&lt;Suspense&gt;</code> shows its <code>fallback</code> meanwhile.</li>
        <li>After loading, the result is cached; later renders are instant.</li>
      </ul>
      <p>This sandbox has no real modules, so examples fake a slow <code>import()</code>:</p>
      <pre><code>const Settings = lazy(() =&gt;
  new Promise(r =&gt; setTimeout(() =&gt; r({ default: SettingsImpl }), 1000))
);</code></pre>
      <h3>Suspense boundaries</h3>
      <p>Place <code>&lt;Suspense&gt;</code> where a loading state makes sense to the user. One boundary around several lazy components shows <strong>one</strong> fallback until <strong>all</strong> are ready. Nested boundaries reveal content piece by piece.</p>
      <div class="warn"><strong>Pitfall:</strong> always declare <code>lazy</code> at the <strong>top level of a module</strong>. Calling <code>lazy()</code> inside a component creates a new component type each render, which resets state and reloads forever.</div>
      <div class="tip">If a component that already showed content suspends again (e.g. switching tabs), wrap the update in <code>startTransition</code> to keep the old UI visible instead of flashing the fallback.</div>
    `,
    examples: [
      {
        title: 'Lazy-load a component on demand',
        code: `import { lazy, Suspense, useState } from 'react';

function ChartImpl() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80 }}>
      {[30, 60, 45, 80, 20].map((h, i) => (
        <div key={i} style={{ width: 20, height: h, background: 'steelblue' }} />
      ))}
    </div>
  );
}

// Fake dynamic import: resolves after 1s with { default: Component }
const Chart = lazy(() => {
  console.log('⬇️ loading Chart "module"…');
  return new Promise(r => setTimeout(() => r({ default: ChartImpl }), 1000));
});

export default function App() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => setShow(s => !s)}>{show ? 'Hide' : 'Show'} chart</button>
      {show && (
        <Suspense fallback={<p>⏳ Loading chart…</p>}>
          <Chart />
        </Suspense>
      )}
      <p style={{ fontSize: 13 }}>Hide and show again: no loading the second time (cached).</p>
    </div>
  );
}`,
      },
      {
        title: 'Nested boundaries reveal progressively',
        code: `import { lazy, Suspense } from 'react';

function fakeImport(Comp, ms) {
  return () => new Promise(r => setTimeout(() => r({ default: Comp }), ms));
}

const Header = lazy(fakeImport(() => <h2>📰 Header (0.5s)</h2>, 500));
const Comments = lazy(fakeImport(() => <p>💬 Comments (2s)</p>, 2000));

export default function App() {
  return (
    <Suspense fallback={<p>Loading page…</p>}>
      <Header />
      <Suspense fallback={<p>Loading comments…</p>}>
        <Comments />
      </Suspense>
    </Suspense>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What must the function passed to <code>lazy</code> return?', options: ['A component', 'A Promise resolving to a module with a default export', 'A string path', 'JSX'], answer: 1, why: 'lazy expects a Promise of { default: Component }.' },
      { q: 'What shows while a lazy component loads?', options: ['Nothing', 'The nearest Suspense fallback', 'An error', 'The previous page'], answer: 1, why: 'The lazy component suspends and Suspense shows its fallback.' },
      { q: 'Where should you call <code>lazy()</code>?', options: ['Inside the component body', 'At module top level', 'Inside useEffect', 'In an event handler'], answer: 1, why: 'Calling it inside a component creates a new type each render, resetting state.' },
      { q: 'A second render of an already-loaded lazy component...', options: ['Reloads the code', 'Is instant because the result is cached', 'Throws', 'Shows fallback again'], answer: 1, why: 'lazy caches the resolved module.' },
    ],
    exercise: {
      task: `<p>Create two "pages", <code>Home</code> and <code>Profile</code>, each loaded with <code>lazy</code> using a fake 800ms import. Add two buttons to switch pages, and one <code>&lt;Suspense&gt;</code> with a "Loading page…" fallback.</p>`,
      starter: `import { lazy, Suspense, useState } from 'react';

function HomeImpl() { return <h2>🏠 Home</h2>; }
function ProfileImpl() { return <h2>👤 Profile</h2>; }

// TODO: const Home = lazy(...); const Profile = lazy(...);

export default function App() {
  const [page, setPage] = useState('home');
  return (
    <div>
      <button onClick={() => setPage('home')}>Home</button>{' '}
      <button onClick={() => setPage('profile')}>Profile</button>
      {/* TODO: Suspense + lazy pages */}
      <p>Current: {page}</p>
    </div>
  );
}`,
      hint: 'const Home = lazy(() => new Promise(r => setTimeout(() => r({ default: HomeImpl }), 800)));',
      solution: `import { lazy, Suspense, useState } from 'react';

function HomeImpl() { return <h2>🏠 Home</h2>; }
function ProfileImpl() { return <h2>👤 Profile</h2>; }

function fakeImport(Comp) {
  return () => new Promise(r => setTimeout(() => r({ default: Comp }), 800));
}

const Home = lazy(fakeImport(HomeImpl));
const Profile = lazy(fakeImport(ProfileImpl));

export default function App() {
  const [page, setPage] = useState('home');
  return (
    <div>
      <button onClick={() => setPage('home')}>Home</button>{' '}
      <button onClick={() => setPage('profile')}>Profile</button>
      <Suspense fallback={<p>Loading page…</p>}>
        {page === 'home' ? <Home /> : <Profile />}
      </Suspense>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Error boundaries ─────────────────────────────
  {
    id: 'error-boundaries',
    section: 'Advanced APIs',
    title: 'Error boundaries',
    explain: `
      <p>By default, if any component throws while rendering, React removes the <strong>whole app</strong> from the screen. An <strong>error boundary</strong> catches errors in its subtree and shows a fallback UI instead — like a circuit breaker for one part of the house.</p>
      <p>Error boundaries are (still) <strong>class components</strong> that implement one or both of:</p>
      <pre><code>class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };               // update state → render fallback
  }

  componentDidCatch(error, info) {
    logToService(error, info.componentStack); // side effects (logging)
  }

  render() {
    if (this.state.error) return this.props.fallback;
    return this.props.children;
  }
}</code></pre>
      <ul>
        <li><code>static getDerivedStateFromError</code> — runs during render; return new state to show the fallback.</li>
        <li><code>componentDidCatch(error, info)</code> — runs after commit; good for logging. <code>info.componentStack</code> shows where it failed.</li>
      </ul>
      <h3>What they do NOT catch</h3>
      <ul>
        <li>Errors in <strong>event handlers</strong> (use try/catch there).</li>
        <li>Errors in async code like <code>setTimeout</code> callbacks (unless you re-throw them during render via state).</li>
        <li>Errors thrown in the boundary itself.</li>
        <li>Server-side rendering errors.</li>
      </ul>
      <div class="tip">You can write one boundary and reuse it everywhere. Many apps use the <code>react-error-boundary</code> package so they don't write classes. Also: a rejected promise read with <code>use()</code> is caught by error boundaries.</div>
      <div class="warn">In development, React also logs caught errors to the console. That's expected — the UI still shows your fallback.</div>
    `,
    examples: [
      {
        title: 'Boundary around a buggy widget',
        code: `import { Component, useState } from 'react';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.log('Logged to "service":', error.message);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 10, background: '#fee', border: '1px solid #f99' }}>
          <strong>Something went wrong:</strong> {this.state.error.message}
          <div>
            <button onClick={() => this.setState({ error: null })}>Try again</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function BuggyCounter() {
  const [count, setCount] = useState(0);
  if (count === 3) {
    throw new Error('Counter crashed at 3!');
  }
  return <button onClick={() => setCount(c => c + 1)}>Count: {count} (crashes at 3)</button>;
}

export default function App() {
  return (
    <div>
      <p>This text is outside the boundary and stays visible.</p>
      <ErrorBoundary>
        <BuggyCounter />
      </ErrorBoundary>
    </div>
  );
}`,
      },
      {
        title: 'Event handler errors are NOT caught',
        code: `import { Component, useState } from 'react';

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    return this.state.error ? <p style={{ color: 'crimson' }}>Boundary caught: {this.state.error.message}</p> : this.props.children;
  }
}

function Widget() {
  const [renderError, setRenderError] = useState(null);
  if (renderError) throw renderError; // re-throw during render → boundary catches

  function handleClick() {
    try {
      throw new Error('Oops in handler');
    } catch (e) {
      console.warn('Handled in try/catch:', e.message);
    }
  }

  return (
    <div>
      <button onClick={handleClick}>Throw in handler (try/catch)</button>{' '}
      <button onClick={() => setRenderError(new Error('Forwarded to render'))}>Forward error to boundary</button>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Widget />
    </ErrorBoundary>
  );
}`,
      },
    ],
    quiz: [
      { q: 'How do you write an error boundary in React 19?', options: ['A function component with useError', 'A class component with getDerivedStateFromError / componentDidCatch', 'A Suspense component', 'Using createPortal'], answer: 1, why: 'Error boundaries are still class components (or come from a library).' },
      { q: 'Which method should update state to show the fallback?', options: ['componentDidCatch', 'static getDerivedStateFromError', 'render', 'componentDidMount'], answer: 1, why: 'getDerivedStateFromError returns the new state for the fallback render.' },
      { q: 'Which error is NOT caught by an error boundary?', options: ['Error thrown during a child\'s render', 'Error thrown in an onClick handler', 'Rejected promise read with use()', 'Error in a child\'s lifecycle method'], answer: 1, why: 'Event handler errors don\'t happen during rendering; use try/catch.' },
      { q: 'What is <code>componentDidCatch</code> best for?', options: ['Rendering the fallback', 'Logging the error to a service', 'Fetching data', 'Resetting props'], answer: 1, why: 'It is for side effects like logging.' },
    ],
    exercise: {
      task: `<p>Write a reusable <code>ErrorBoundary</code> that accepts a <code>fallback</code> prop. Render <strong>two</strong> <code>Product</code> cards, each wrapped in its own boundary. <code>Product</code> throws if its <code>price</code> prop is negative. Show that one broken card doesn't break the other.</p>`,
      starter: `import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };
  // TODO: static getDerivedStateFromError, componentDidCatch
  render() {
    return this.props.children;
  }
}

function Product({ name, price }) {
  // TODO: throw if price < 0
  return <p>{name}: \${price}</p>;
}

export default function App() {
  return (
    <div>
      <Product name="Book" price={12} />
    </div>
  );
}`,
      hint: 'static getDerivedStateFromError() { return { hasError: true }; } and in render: if (this.state.hasError) return this.props.fallback;',
      solution: `import { Component } from 'react';

class ErrorBoundary extends Component {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error) {
    console.log('caught:', error.message);
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function Product({ name, price }) {
  if (price < 0) throw new Error('Invalid price for ' + name);
  return <p>{name}: \${price}</p>;
}

export default function App() {
  return (
    <div>
      <ErrorBoundary fallback={<p style={{ color: 'crimson' }}>⚠️ Could not show product</p>}>
        <Product name="Book" price={12} />
      </ErrorBoundary>
      <ErrorBoundary fallback={<p style={{ color: 'crimson' }}>⚠️ Could not show product</p>}>
        <Product name="Broken lamp" price={-5} />
      </ErrorBoundary>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Portals ─────────────────────────────
  {
    id: 'portals',
    section: 'Advanced APIs',
    title: 'createPortal',
    explain: `
      <p><code>createPortal</code> (from <code>'react-dom'</code>) renders children into a <strong>different DOM node</strong> — outside the parent's DOM — while keeping them in the same <strong>React tree</strong>.</p>
      <pre><code>import { createPortal } from 'react-dom';

return createPortal(
  &lt;div className="modal"&gt;...&lt;/div&gt;,
  document.body
);</code></pre>
      <h3>Why?</h3>
      <p>Modals, tooltips, toasts and dropdowns must escape parents that have <code>overflow: hidden</code>, <code>z-index</code> stacking, or <code>transform</code>. Rendering into <code>document.body</code> avoids clipping.</p>
      <h3>React tree vs DOM tree</h3>
      <ul>
        <li>Context, state and props work normally: a portal child can read context from its React parent.</li>
        <li><strong>Events bubble through the React tree</strong>, not the DOM tree. A click inside a portal triggers <code>onClick</code> on its React ancestors, even though in the DOM it lives elsewhere.</li>
      </ul>
      <div class="warn"><strong>Pitfall:</strong> the target node must exist when rendering. <code>document.body</code> always does; for a custom container, create it first. For accessibility, modals also need focus management and Escape-to-close.</div>
      <div class="tip">Optional third argument: a <code>key</code> for the portal.</div>
    `,
    examples: [
      {
        title: 'Modal rendered into document.body',
        code: `import { useState } from 'react';
import { createPortal } from 'react-dom';

function Modal({ onClose, children }) {
  return createPortal(
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', padding: 20, borderRadius: 8, minWidth: 200 }}>
        {children}
        <p><button onClick={onClose}>Close</button></p>
      </div>
    </div>,
    document.body
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ overflow: 'hidden', height: 80, border: '2px dashed #999', padding: 10 }}>
      <p>This box has overflow: hidden.</p>
      <button onClick={() => {
        setOpen(true);
        setTimeout(() => console.log('modal parent in DOM:', document.body.lastElementChild.tagName), 0);
      }}>Open modal</button>
      {open && <Modal onClose={() => setOpen(false)}><h3>Hello from a portal 👋</h3></Modal>}
    </div>
  );
}`,
      },
      {
        title: 'Events bubble through the React tree',
        code: `import { createPortal } from 'react-dom';

export default function App() {
  return (
    <div
      onClick={e => console.log('Parent div caught click from:', e.target.textContent)}
      style={{ border: '1px solid #ccc', padding: 10 }}
    >
      <p>Parent (React) container</p>
      <button>Normal child</button>
      {createPortal(
        <button style={{ position: 'fixed', bottom: 10, right: 10 }}>Portal child</button>,
        document.body
      )}
      <p style={{ fontSize: 13 }}>Click both buttons; parent onClick fires for both.</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Where is <code>createPortal</code> imported from?', options: ["'react'", "'react-dom'", "'react-dom/client'", "'react-portal'"], answer: 1, why: 'createPortal comes from react-dom.' },
      { q: 'A click in a portal child bubbles to...', options: ['Only DOM ancestors', 'React tree ancestors', 'Nothing', 'window only'], answer: 1, why: 'React events propagate through the React tree.' },
      { q: 'Can portal children read Context from their React parents?', options: ['No', 'Yes', 'Only with forwardRef', 'Only in class components'], answer: 1, why: 'Portals stay in the React tree, so context works normally.' },
      { q: 'Main reason to use a portal for a modal?', options: ['Faster renders', 'Escape overflow/z-index clipping from parent containers', 'SEO', 'To avoid state'], answer: 1, why: 'Rendering into body avoids CSS containment issues.' },
    ],
    exercise: {
      task: `<p>Build a <code>Toast</code> component that uses <code>createPortal</code> to render a message fixed at the top-right of <code>document.body</code>. Clicking "Show toast" displays it; it disappears after 2 seconds (use an effect with cleanup).</p>`,
      starter: `import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function Toast({ message, onDone }) {
  // TODO: auto-hide after 2s, render via portal
  return <div>{message}</div>;
}

export default function App() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => setShow(true)}>Show toast</button>
      {show && <Toast message="Saved!" onDone={() => setShow(false)} />}
    </div>
  );
}`,
      hint: 'useEffect(() => { const id = setTimeout(onDone, 2000); return () => clearTimeout(id); }, [onDone]); return createPortal(<div style={{ position: "fixed", top: 10, right: 10 }}>...</div>, document.body);',
      solution: `import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

function Toast({ message, onDone }) {
  useEffect(() => {
    const id = setTimeout(onDone, 2000);
    return () => clearTimeout(id);
  }, [onDone]);

  return createPortal(
    <div style={{ position: 'fixed', top: 10, right: 10, background: '#333', color: 'white', padding: '8px 14px', borderRadius: 6 }}>
      {message}
    </div>,
    document.body
  );
}

export default function App() {
  const [show, setShow] = useState(false);
  return (
    <div>
      <button onClick={() => setShow(true)}>Show toast</button>
      {show && <Toast message="Saved!" onDone={() => setShow(false)} />}
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── StrictMode ─────────────────────────────
  {
    id: 'strictmode',
    section: 'Advanced APIs',
    title: 'StrictMode',
    explain: `
      <p><code>&lt;StrictMode&gt;</code> is a development-only helper that <strong>finds bugs early</strong>. It renders nothing visible and does nothing in production.</p>
      <pre><code>import { StrictMode } from 'react';

root.render(
  &lt;StrictMode&gt;
    &lt;App /&gt;
  &lt;/StrictMode&gt;
);</code></pre>
      <h3>What it does in development</h3>
      <ul>
        <li><strong>Renders components twice</strong> — to catch impure render logic (e.g. mutating a variable outside the component).</li>
        <li><strong>Runs effects twice on mount</strong>: setup → cleanup → setup. This catches missing cleanups (a subscription that's never removed, a connection opened twice).</li>
        <li><strong>Runs ref callbacks twice</strong> on mount (attach → cleanup → attach).</li>
        <li>Warns about deprecated APIs.</li>
      </ul>
      <p>Why double effects? In real life, components mount and unmount often (navigation, <code>&lt;Activity&gt;</code>, dev fast-refresh). If your effect breaks when run twice, it's a bug that would appear in production eventually. StrictMode just makes it show up immediately.</p>
      <h3>What breaks when cleanup is missing?</h3>
      <p>The extra setup → cleanup → setup is a <strong>stress test</strong>: if your cleanup correctly undoes the setup, users see no difference. If the effect starts something and never stops it, the second setup creates a <em>second copy</em> running at the same time:</p>
      <table>
        <tr><th>Setup without cleanup</th><th>Visible symptom</th><th>Cleanup</th></tr>
        <tr><td><code>setInterval</code></td><td>Timer ticks 2× fast</td><td><code>clearInterval(id)</code></td></tr>
        <tr><td><code>addEventListener</code></td><td>Every key/click handled twice</td><td><code>removeEventListener</code></td></tr>
        <tr><td>Chat / WebSocket <code>connect()</code></td><td>Two connections, duplicate messages</td><td><code>disconnect()</code></td></tr>
        <tr><td>Append DOM node / push to external list</td><td>Item shown twice</td><td>Remove it again</td></tr>
      </table>
      <p>These are real bugs even without StrictMode — they'd appear when the user navigates away and back, or when a dependency like <code>roomId</code> changes and the old connection is never closed. Compare the two examples below: <em>Bug: missing cleanup</em> vs <em>Fixed with cleanup</em>.</p>
      <div class="tip">Seeing "effect ran twice" is not the bug — it's the <em>test</em>. The fix is a correct cleanup function, <strong>not</strong> a ref flag to skip the second run.</div>
      <div class="warn">This site's runner does <strong>not</strong> use StrictMode by default. When your code contains <code>&lt;StrictMode&gt;</code>, the runner also wraps the root in StrictMode — React 19 only double-runs effects on mount when StrictMode is at the root. In the browser DevTools the second render's logs may appear dimmed.</div>
    `,
    examples: [
      {
        title: 'Double render + double effect',
        code: `import { StrictMode, useEffect, useState } from 'react';

function Chat() {
  const [n, setN] = useState(0);
  console.log('render Chat', n);

  useEffect(() => {
    console.log('✅ connect');
    return () => console.log('❌ disconnect (cleanup)');
  }, []);

  return <button onClick={() => setN(x => x + 1)}>Re-render ({n})</button>;
}

export default function App() {
  return (
    <StrictMode>
      <Chat />
      <p style={{ fontSize: 13 }}>Console on mount: connect → disconnect → connect.</p>
    </StrictMode>
  );
}`,
      },
      {
        title: 'Bug: missing cleanup (timer 2× fast, keys logged twice)',
        code: `import { StrictMode, useEffect, useState } from 'react';

function Timer() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    console.log('setup: start interval');
    setInterval(() => setSec(s => s + 1), 1000);
    // ❌ no cleanup → StrictMode's extra setup starts a SECOND interval
  }, []);

  useEffect(() => {
    console.log('setup: add keydown listener');
    const onKey = (e) => console.log('key pressed:', e.key);
    window.addEventListener('keydown', onKey);
    // ❌ no cleanup → listener added twice
  }, []);

  return (
    <div>
      <h2 style={{ color: 'crimson' }}>{sec}s</h2>
      <p style={{ fontSize: 13 }}>
        Goes up by <strong>2</strong> every second. Click here, then press a key:
        each key is logged <strong>twice</strong>.
      </p>
    </div>
  );
}

export default function App() {
  return <StrictMode><Timer /></StrictMode>;
}`,
      },
      {
        title: 'Fixed with cleanup (StrictMode run is invisible)',
        code: `import { StrictMode, useEffect, useState } from 'react';

function Timer() {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    console.log('setup: start interval');
    const id = setInterval(() => setSec(s => s + 1), 1000);
    return () => {
      console.log('cleanup: clear interval');
      clearInterval(id); // ✅ undo exactly what setup did
    };
  }, []);

  useEffect(() => {
    console.log('setup: add keydown listener');
    const onKey = (e) => console.log('key pressed:', e.key);
    window.addEventListener('keydown', onKey);
    return () => {
      console.log('cleanup: remove keydown listener');
      window.removeEventListener('keydown', onKey); // ✅
    };
  }, []);

  return (
    <div>
      <h2 style={{ color: 'green' }}>{sec}s</h2>
      <p style={{ fontSize: 13 }}>
        Console shows setup → cleanup → setup, but the timer goes up by 1 and
        each key is logged once. Setup → cleanup → setup behaves the same as
        a single setup.
      </p>
    </div>
  );
}

export default function App() {
  return <StrictMode><Timer /></StrictMode>;
}`,
      },
      {
        title: 'Catching an impure render',
        code: `import { StrictMode } from 'react';

let guestCount = 0; // ❌ mutated during render

function Guest() {
  guestCount = guestCount + 1;
  return <li>Guest #{guestCount}</li>;
}

export default function App() {
  return (
    <StrictMode>
      <ul>
        <Guest />
        <Guest />
        <Guest />
      </ul>
      <p style={{ fontSize: 13 }}>
        Expected 1, 2, 3, but StrictMode's double render exposes the bug.
        Fix: pass the number as a prop instead.
      </p>
    </StrictMode>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Does StrictMode affect production builds?', options: ['Yes, it slows them down', 'No, its checks are development-only', 'It removes console logs', 'It disables effects'], answer: 1, why: 'StrictMode checks only run in development.' },
      { q: 'In StrictMode, an effect with <code>[]</code> deps logs on mount:', options: ['setup', 'setup, cleanup, setup', 'cleanup, setup', 'setup, setup'], answer: 1, why: 'React mounts, simulates unmount (cleanup), and mounts again.' },
      { q: 'Your effect breaks when run twice. Best fix?', options: ['Add a ref to skip the second run', 'Write a proper cleanup function', 'Remove StrictMode', 'Use useLayoutEffect'], answer: 1, why: 'The double run reveals a missing/incorrect cleanup.' },
      { q: 'Why does StrictMode render components twice?', options: ['To improve performance', 'To detect impure rendering logic', 'To warm the cache', 'It is a bug'], answer: 1, why: 'Pure components produce the same output; double rendering exposes side effects.' },
    ],
    exercise: {
      task: `<p>The starter is wrapped in <code>StrictMode</code>. <code>Ticker</code> starts an interval but never clears it, so in StrictMode the count goes up by <strong>2</strong> every second. Fix it with a cleanup so it counts by 1.</p>`,
      starter: `import { StrictMode, useEffect, useState } from 'react';

function Ticker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log('start interval');
    setInterval(() => setCount(c => c + 1), 1000);
    // BUG: no cleanup
  }, []);
  return <h2>{count}</h2>;
}

export default function App() {
  return (
    <StrictMode>
      <Ticker />
    </StrictMode>
  );
}`,
      hint: 'Save the id: const id = setInterval(...); return () => clearInterval(id);',
      solution: `import { StrictMode, useEffect, useState } from 'react';

function Ticker() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    console.log('start interval');
    const id = setInterval(() => setCount(c => c + 1), 1000);
    return () => {
      console.log('clear interval');
      clearInterval(id);
    };
  }, []);
  return <h2>{count}</h2>;
}

export default function App() {
  return (
    <StrictMode>
      <Ticker />
    </StrictMode>
  );
}`,
    },
  },

  // ───────────────────────────── Profiler ─────────────────────────────
  {
    id: 'profiler',
    section: 'Advanced APIs',
    title: 'Profiler',
    explain: `
      <p><code>&lt;Profiler&gt;</code> measures <strong>how often</strong> a part of the tree renders and <strong>how long</strong> it takes, programmatically.</p>
      <pre><code>&lt;Profiler id="Sidebar" onRender={onRender}&gt;
  &lt;Sidebar /&gt;
&lt;/Profiler&gt;

function onRender(id, phase, actualDuration, baseDuration, startTime, commitTime) {
  console.log(id, phase, actualDuration);
}</code></pre>
      <ul>
        <li><code>id</code> — the string you passed, to tell profilers apart.</li>
        <li><code>phase</code> — <code>"mount"</code>, <code>"update"</code>, or <code>"nested-update"</code>.</li>
        <li><code>actualDuration</code> — ms spent rendering this commit (lower with memoization).</li>
        <li><code>baseDuration</code> — estimated ms to re-render the whole subtree without any memoization (worst case).</li>
        <li><code>startTime</code>, <code>commitTime</code> — timestamps.</li>
      </ul>
      <p>Why it matters: before optimizing with <code>memo</code>/<code>useMemo</code>, <strong>measure</strong>. Profiler tells you whether a subtree is actually slow or re-rendering too often.</p>
      <div class="warn">Profiling adds overhead and is <strong>disabled in production builds</strong> by default (a special profiling build enables it). For interactive analysis, the React DevTools <em>Profiler</em> tab is usually easier.</div>
      <div class="tip"><code>onRender</code> is called on every commit of that subtree, so keep it cheap — push results to an array or send them in batches.</div>
    `,
    examples: [
      {
        title: 'Log renders of two subtrees',
        code: `import { Profiler, useState } from 'react';

function onRender(id, phase, actualDuration, baseDuration) {
  console.log(id + ' ' + phase + ': actual ' + actualDuration.toFixed(2) + 'ms, base ' + baseDuration.toFixed(2) + 'ms');
}

function SlowList({ count }) {
  const start = performance.now();
  while (performance.now() - start < 20) {} // simulate 20ms of work
  return <p>Slow list rendered for count {count}</p>;
}

export default function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('');
  return (
    <div>
      <Profiler id="Input" onRender={onRender}>
        <input value={text} onChange={e => setText(e.target.value)} placeholder="Type (re-renders App)" />
      </Profiler>
      <Profiler id="SlowList" onRender={onRender}>
        <SlowList count={count} />
      </Profiler>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
    </div>
  );
}`,
      },
      {
        title: 'memo lowers actualDuration',
        code: `import { Profiler, useState, memo } from 'react';

function work() {
  const start = performance.now();
  while (performance.now() - start < 15) {}
}

function Heavy() {
  work();
  return <p>Heavy (not memoized)</p>;
}

const HeavyMemo = memo(function HeavyMemo() {
  work();
  return <p>Heavy (memoized)</p>;
});

function log(id, phase, actual) {
  console.log(id, phase, actual.toFixed(1) + 'ms');
}

export default function App() {
  const [n, setN] = useState(0);
  return (
    <div>
      <button onClick={() => setN(x => x + 1)}>Re-render parent ({n})</button>
      <Profiler id="plain" onRender={log}><Heavy /></Profiler>
      <Profiler id="memo" onRender={log}><HeavyMemo /></Profiler>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>actualDuration</code> measure?', options: ['Network time', 'Time spent rendering the profiled subtree in this commit', 'Time since page load', 'Time the user was idle'], answer: 1, why: 'It is the render time for the current commit.' },
      { q: 'Which values can <code>phase</code> be?', options: ['"start" | "end"', '"mount" | "update" | "nested-update"', '"render" | "commit"', '"fast" | "slow"'], answer: 1, why: 'Phase tells you if it was a mount or an update (or nested update).' },
      { q: 'Is Profiler active in normal production builds?', options: ['Yes', 'No, it is disabled unless you use a profiling build', 'Only on mobile', 'Only with StrictMode'], answer: 1, why: 'Profiling adds overhead so it is off in standard production builds.' },
      { q: 'What is <code>baseDuration</code>?', options: ['Estimated time to render the whole subtree without memoization', 'Time of the first render only', 'Network latency', 'Time since last commit'], answer: 0, why: 'baseDuration approximates the worst-case cost.' },
    ],
    exercise: {
      task: `<p>Wrap a <code>Clock</code> component (re-renders every second) in a <code>&lt;Profiler id="Clock"&gt;</code>. In <code>onRender</code>, keep a running <strong>count</strong> of commits and log <code>"Clock commit #N (phase)"</code>.</p>`,
      starter: `import { Profiler, useState, useEffect } from 'react';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <h2>{now.toLocaleTimeString()}</h2>;
}

export default function App() {
  // TODO: wrap Clock in Profiler with an onRender callback
  return <Clock />;
}`,
      hint: 'Keep a module-level let commits = 0; in onRender: commits++; console.log("Clock commit #" + commits + " (" + phase + ")");',
      solution: `import { Profiler, useState, useEffect } from 'react';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return <h2>{now.toLocaleTimeString()}</h2>;
}

let commits = 0;
function onRender(id, phase) {
  commits++;
  console.log(id + ' commit #' + commits + ' (' + phase + ')');
}

export default function App() {
  return (
    <Profiler id="Clock" onRender={onRender}>
      <Clock />
    </Profiler>
  );
}`,
    },
  },

  // ───────────────────────────── flushSync ─────────────────────────────
  {
    id: 'flushsync',
    section: 'Advanced APIs',
    title: 'flushSync',
    explain: `
      <p>React normally <strong>batches</strong> state updates and applies them to the DOM a bit later. Usually that's great. But sometimes you need the DOM updated <strong>right now</strong>, on the next line of code. <code>flushSync</code> (from <code>'react-dom'</code>) forces that:</p>
      <pre><code>import { flushSync } from 'react-dom';

flushSync(() =&gt; {
  setTodos([...todos, newTodo]);
});
// DOM is updated here — the new &lt;li&gt; exists
listRef.current.lastChild.scrollIntoView();</code></pre>
      <h3>Typical uses</h3>
      <ul>
        <li>Scroll to or focus an element that was just added.</li>
        <li>Integrating with non-React code or browser APIs that read the DOM synchronously (e.g. <code>onbeforeprint</code>).</li>
      </ul>
      <div class="warn"><strong>Pitfalls:</strong> <code>flushSync</code> can hurt performance (it skips batching) and may force pending Suspense boundaries to show fallbacks. Don't call it during render or inside effects (React will warn). Use it rarely — most of the time, an effect or a ref callback is enough.</div>
      <div class="tip">Rule of thumb: reach for <code>flushSync</code> only when you'd otherwise write "setState, then read the DOM" in the same event handler and see stale DOM.</div>
    `,
    examples: [
      {
        title: 'Scroll to the newly added item',
        code: `import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';

export default function App() {
  const [items, setItems] = useState(['Item 1', 'Item 2', 'Item 3']);
  const [useFlush, setUseFlush] = useState(true);
  const listRef = useRef(null);

  function add() {
    const next = 'Item ' + (items.length + 1);
    if (useFlush) {
      flushSync(() => setItems(prev => [...prev, next]));
    } else {
      setItems(prev => [...prev, next]);
    }
    const last = listRef.current.lastElementChild;
    console.log('last item in DOM:', last.textContent);
    last.scrollIntoView({ block: 'nearest' });
  }

  return (
    <div>
      <label>
        <input type="checkbox" checked={useFlush} onChange={e => setUseFlush(e.target.checked)} /> use flushSync
      </label>{' '}
      <button onClick={add}>Add item</button>
      <ul ref={listRef} style={{ height: 100, overflowY: 'auto', border: '1px solid #ccc' }}>
        {items.map(i => <li key={i}>{i}</li>)}
      </ul>
      <p style={{ fontSize: 13 }}>Without flushSync, the console shows the PREVIOUS last item and scrolling lags one behind.</p>
    </div>
  );
}`,
      },
      {
        title: 'Reading DOM text right after an update',
        code: `import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';

export default function App() {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  function normal() {
    setCount(c => c + 1);
    console.log('normal → DOM says', ref.current.textContent);
  }

  function flushed() {
    flushSync(() => setCount(c => c + 1));
    console.log('flushSync → DOM says', ref.current.textContent);
  }

  return (
    <div>
      <h2 ref={ref}>{count}</h2>
      <button onClick={normal}>+1 (normal)</button>{' '}
      <button onClick={flushed}>+1 (flushSync)</button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Where is <code>flushSync</code> imported from?', options: ["'react'", "'react-dom'", "'react-dom/client'", "'scheduler'"], answer: 1, why: 'flushSync is exported from react-dom.' },
      { q: 'What does <code>flushSync</code> guarantee?', options: ['Updates inside it are applied to the DOM before it returns', 'Faster rendering', 'Updates are delayed', 'Effects are skipped'], answer: 0, why: 'It synchronously flushes the updates in its callback.' },
      { q: 'Which is a good use case?', options: ['Every state update', 'Scrolling to an item right after adding it', 'Inside render', 'Data fetching'], answer: 1, why: 'It lets you read the updated DOM immediately.' },
      { q: 'Why use it sparingly?', options: ['It is deprecated', 'It bypasses batching and can hurt performance', 'It only works in class components', 'It breaks refs'], answer: 1, why: 'Forcing synchronous renders reduces React\'s ability to optimize.' },
    ],
    exercise: {
      task: `<p>Build a chat box: an input and "Send" button that appends the message to a scrollable list (fixed height ~120px). After sending, the list must <strong>immediately scroll to the bottom</strong> so the new message is visible. Use <code>flushSync</code> + a ref.</p>`,
      starter: `import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';

export default function App() {
  const [messages, setMessages] = useState(['Welcome!']);
  const [text, setText] = useState('');
  const boxRef = useRef(null);

  function send() {
    // TODO: add message with flushSync, then scroll boxRef to bottom
  }

  return (
    <div>
      <div ref={boxRef} style={{ height: 120, overflowY: 'auto', border: '1px solid #ccc', padding: 6 }}>
        {messages.map((m, i) => <div key={i}>{m}</div>)}
      </div>
      <input value={text} onChange={e => setText(e.target.value)} />
      <button onClick={send}>Send</button>
    </div>
  );
}`,
      hint: 'flushSync(() => { setMessages(m => [...m, text]); setText(""); }); then boxRef.current.scrollTop = boxRef.current.scrollHeight;',
      solution: `import { useState, useRef } from 'react';
import { flushSync } from 'react-dom';

export default function App() {
  const [messages, setMessages] = useState(['Welcome!']);
  const [text, setText] = useState('');
  const boxRef = useRef(null);

  function send() {
    if (!text.trim()) return;
    flushSync(() => {
      setMessages(m => [...m, text]);
      setText('');
    });
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }

  return (
    <div>
      <div ref={boxRef} style={{ height: 120, overflowY: 'auto', border: '1px solid #ccc', padding: 6 }}>
        {messages.map((m, i) => <div key={i}>{m}</div>)}
      </div>
      <input value={text} onChange={e => setText(e.target.value)} />{' '}
      <button onClick={send}>Send</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Server Components ─────────────────────────────
  {
    id: 'server-components',
    section: 'Advanced APIs',
    title: 'Server Components & Server Functions',
    explain: `
      <p><strong>React Server Components (RSC)</strong> are components that run <strong>only on the server</strong> (at build time or per request). Their code never ships to the browser. They need a framework that supports them (e.g. Next.js App Router, React Router with RSC, Waku) — they <strong>can't run in this sandbox</strong>, so examples here are read-only.</p>
      <h3>Server Components</h3>
      <ul>
        <li>Can be <code>async</code> and <code>await</code> data directly: databases, files, secrets.</li>
        <li>Send only their rendered output to the client — zero JS bundle cost for the component itself.</li>
        <li><strong>Cannot</strong> use state, effects, event handlers, or browser APIs (<code>useState</code>, <code>useEffect</code>, <code>onClick</code>, <code>window</code>).</li>
        <li>In RSC frameworks, components are Server Components <strong>by default</strong>.</li>
      </ul>
      <h3><code>'use client'</code></h3>
      <p>Put <code>'use client'</code> at the top of a file to mark it (and everything it imports) as <strong>client code</strong>: it's bundled for the browser and can use hooks and events. Server Components can render Client Components and pass them <strong>serializable props</strong> (strings, numbers, objects, arrays, promises, JSX — not regular functions).</p>
      <h3>Server Functions — <code>'use server'</code></h3>
      <p>Mark an async function with <code>'use server'</code> and it runs on the server, but the client can call it (the framework turns the call into a network request). Pass them to <code>&lt;form action&gt;</code>, <code>useActionState</code>, or call them in a transition. When used as a form action, they were historically called "Server Actions".</p>
      <div class="warn"><strong>Common confusion:</strong> <code>'use server'</code> is <strong>not</strong> how you mark a Server Component. Server Components need no directive. <code>'use server'</code> is only for Server Functions.</div>
      <div class="warn"><strong>Security:</strong> a Server Function is effectively a public API endpoint. Always validate input and check authorization inside it.</div>
      <div class="tip">Mental model: Server Components = the kitchen (prepares data, unseen), Client Components = the waiter (interactive at your table), Server Functions = a bell the waiter rings to ask the kitchen to do something.</div>
    `,
    examples: [
      {
        title: 'Async Server Component (framework only)',
        runnable: false,
        code: `// app/notes/page.js — a Server Component (no directive needed)
import db from './db';
import LikeButton from './LikeButton';

export default async function NotesPage() {
  const notes = await db.notes.findMany(); // runs on the server only
  return (
    <ul>
      {notes.map(note => (
        <li key={note.id}>
          {note.title}
          <LikeButton noteId={note.id} initialLikes={note.likes} />
        </li>
      ))}
    </ul>
  );
}`,
      },
      {
        title: "Client Component with 'use client'",
        runnable: false,
        code: `// app/notes/LikeButton.js
'use client';

import { useState } from 'react';

export default function LikeButton({ noteId, initialLikes }) {
  const [likes, setLikes] = useState(initialLikes);
  return <button onClick={() => setLikes(l => l + 1)}>❤️ {likes}</button>;
}`,
      },
      {
        title: "Server Function with 'use server' + useActionState",
        runnable: false,
        code: `// app/notes/actions.js
'use server';

import db from './db';

export async function addNote(prevState, formData) {
  const title = formData.get('title');
  if (!title) return { error: 'Title required' };
  await db.notes.create({ title });
  return { error: null };
}

// app/notes/NewNoteForm.js
'use client';

import { useActionState } from 'react';
import { addNote } from './actions';

export default function NewNoteForm() {
  const [state, formAction, isPending] = useActionState(addNote, { error: null });
  return (
    <form action={formAction}>
      <input name="title" />
      <button disabled={isPending}>Add</button>
      {state.error && <p>{state.error}</p>}
    </form>
  );
}`,
      },
    ],
    quiz: [
      { q: 'How do you mark a Server Component in an RSC framework?', options: ["'use server' at the top", 'No directive: components are Server Components by default', "'use client'", 'export const server = true'], answer: 1, why: "Server Components are the default; 'use server' is for Server Functions." },
      { q: 'What does <code>\'use client\'</code> do?', options: ['Runs the file only on the client and never on the server', 'Marks the file (and its imports) as client code bundled for the browser', 'Disables SSR entirely', 'Makes a Server Function'], answer: 1, why: 'It marks the server→client boundary; client components can use hooks and events.' },
      { q: 'Which can a Server Component use?', options: ['useState', 'onClick handlers', 'await on a database call', 'window.localStorage'], answer: 2, why: 'Server Components can be async and access server resources, but not state, events or browser APIs.' },
      { q: 'Which prop can NOT be passed from a Server to a Client Component?', options: ['A string', 'A plain object', 'A regular (non-server) function', 'A promise'], answer: 2, why: "Props must be serializable; regular functions aren't (Server Functions are the exception)." },
      { q: 'Why validate input inside a Server Function?', options: ['It is optional style', 'It is callable from the client like a public endpoint', 'React requires it', 'To improve rendering speed'], answer: 1, why: 'Anyone can call it with any data, so treat it like an API route.' },
    ],
    exercise: {
      task: `<p>Simulate the RSC flow on the client. Write a fake "server" <code>getNotes()</code> that returns a cached promise (600ms) of notes, and a fake Server Function <code>addNoteOnServer(title)</code> (400ms) that validates the title and pushes into a server-side array. Build a <code>NotesList</code> that reads notes with <code>use()</code> inside <code>Suspense</code> (like a Server Component's data), and a form using <code>useActionState</code> that calls the fake Server Function and then refreshes the list.</p>`,
      starter: `import { use, useState, Suspense, useActionState } from 'react';

// ---- pretend this is the server ----
const serverNotes = ['Learn RSC'];

function getNotes() {
  // TODO: return a promise of a copy of serverNotes after 600ms
  return Promise.resolve([...serverNotes]);
}

async function addNoteOnServer(title) {
  // TODO: validate, wait 400ms, push into serverNotes
}

// ---- client ----
function NotesList({ notesPromise }) {
  // TODO: use(notesPromise)
  return <p>Notes go here</p>;
}

export default function App() {
  const [notesPromise, setNotesPromise] = useState(() => getNotes());
  return (
    <div>
      <NotesList notesPromise={notesPromise} />
    </div>
  );
}`,
      hint: 'Keep notesPromise in state (created outside render). In the action: const result = await addNoteOnServer(formData.get("title")); if ok, setNotesPromise(getNotes()); return an error/null state.',
      solution: `import { use, useState, Suspense, useActionState } from 'react';

// ---- pretend this is the server ----
const serverNotes = ['Learn RSC'];

function getNotes() {
  return new Promise(resolve => setTimeout(() => resolve([...serverNotes]), 600));
}

async function addNoteOnServer(title) {
  // "use server" — always validate on the server
  const clean = String(title || '').trim();
  if (!clean) return { ok: false, error: 'Title is required' };
  await new Promise(r => setTimeout(r, 400));
  serverNotes.push(clean);
  console.log('server saved:', clean);
  return { ok: true, error: null };
}

// ---- client ----
function NotesList({ notesPromise }) {
  const notes = use(notesPromise);
  return <ul>{notes.map((n, i) => <li key={i}>{n}</li>)}</ul>;
}

export default function App() {
  const [notesPromise, setNotesPromise] = useState(() => getNotes());

  const [state, formAction, isPending] = useActionState(async (prev, formData) => {
    const result = await addNoteOnServer(formData.get('title'));
    if (result.ok) setNotesPromise(getNotes()); // "revalidate"
    return result;
  }, { ok: true, error: null });

  return (
    <div>
      <form action={formAction}>
        <input name="title" placeholder="New note" />{' '}
        <button type="submit" disabled={isPending}>{isPending ? 'Saving…' : 'Add note'}</button>
      </form>
      {state.error && <p style={{ color: 'crimson' }}>{state.error}</p>}
      <Suspense fallback={<p>Loading notes…</p>}>
        <NotesList notesPromise={notesPromise} />
      </Suspense>
    </div>
  );
}`,
    },
  },
);
