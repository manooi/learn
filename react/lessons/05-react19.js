window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── use() ─────────────────────────────
  {
    id: 'use-api',
    section: 'React 19',
    title: 'use() — promises & context',
    explain: `
      <p><code>use</code> is a React 19 API that <strong>reads the value of a resource</strong>: either a <strong>Promise</strong> or a <strong>Context</strong>.</p>
      <pre><code>import { use } from 'react';

const user = use(userPromise);   // suspends until resolved
const theme = use(ThemeContext); // like useContext</code></pre>
      <h3>use(promise) + Suspense</h3>
      <p>When you call <code>use(promise)</code> and the promise is still pending, the component <strong>suspends</strong>: React shows the nearest <code>&lt;Suspense fallback={...}&gt;</code> until it resolves, then renders again with the value. If the promise rejects, the nearest <strong>error boundary</strong> shows.</p>
      <pre><code>&lt;Suspense fallback={&lt;p&gt;Loading…&lt;/p&gt;}&gt;
  &lt;Profile userPromise={userPromise} /&gt;
&lt;/Suspense&gt;</code></pre>
      <div class="warn"><strong>Biggest pitfall:</strong> never create a new promise <em>during render</em> and pass it straight to <code>use</code>:
      <pre><code>function Profile() {
  const user = use(fetchUser(1)); // ❌ new promise every render → suspends forever
}</code></pre>
      Each render makes a fresh pending promise, so React keeps suspending. Instead create the promise <strong>outside render</strong> (module scope, event handler, parent state) or <strong>cache</strong> it so the same id returns the same promise object.</div>
      <h3>use(Context)</h3>
      <p><code>use(SomeContext)</code> works like <code>useContext</code>, but unlike other hooks <strong>it can be called conditionally</strong> — inside <code>if</code> blocks or loops (still not inside try/catch, and still only in components/hooks).</p>
      <div class="tip">React 19 also lets you render <code>&lt;ThemeContext value="dark"&gt;</code> directly as a provider — <code>.Provider</code> is no longer needed.</div>
      <div class="tip">In real apps, promises usually come from a framework or a data library (cached for you), or from Server Components passing a promise down to a Client Component.</div>
    `,
    examples: [
      {
        title: 'use(promise) with a cache',
        code: `import { use, useState, Suspense } from 'react';

const cache = new Map();
function fetchUser(id) {
  // Same id → same promise object. This is what makes use() safe.
  if (!cache.has(id)) {
    console.log('fetching user', id);
    cache.set(id, new Promise(resolve =>
      setTimeout(() => resolve({ id, name: ['Ada', 'Linus', 'Grace'][id - 1] }), 1000)
    ));
  }
  return cache.get(id);
}

function Profile({ id }) {
  const user = use(fetchUser(id));
  return <h2>👤 {user.name} (id {user.id})</h2>;
}

export default function App() {
  const [id, setId] = useState(1);
  return (
    <div>
      {[1, 2, 3].map(n => (
        <button key={n} onClick={() => setId(n)} style={{ marginRight: 6 }}>User {n}</button>
      ))}
      <Suspense fallback={<p>⏳ Loading user…</p>}>
        <Profile id={id} />
      </Suspense>
      <p style={{ fontSize: 13 }}>Revisit a user: instant, because the promise is cached.</p>
    </div>
  );
}`,
      },
      {
        title: 'Promise created in an event handler, passed as a prop',
        code: `import { use, useState, Suspense } from 'react';

function fetchQuote() {
  return new Promise(resolve =>
    setTimeout(() => resolve('Quote #' + Math.floor(Math.random() * 100)), 800)
  );
}

function Quote({ quotePromise }) {
  const text = use(quotePromise);
  return <blockquote style={{ fontSize: 20 }}>“{text}”</blockquote>;
}

export default function App() {
  // Promise is created OUTSIDE render: once initially, then in the click handler.
  const [quotePromise, setQuotePromise] = useState(() => fetchQuote());
  return (
    <div>
      <button onClick={() => setQuotePromise(fetchQuote())}>New quote</button>
      <Suspense fallback={<p>Loading quote…</p>}>
        <Quote quotePromise={quotePromise} />
      </Suspense>
    </div>
  );
}`,
      },
      {
        title: 'use(Context) conditionally',
        code: `import { use, createContext, useState } from 'react';

const ThemeContext = createContext('light');

function Hint({ show }) {
  if (!show) return null;
  // ✅ allowed: use() after an early return / inside a condition
  const theme = use(ThemeContext);
  return (
    <p style={{ padding: 8, background: theme === 'dark' ? '#333' : '#eee', color: theme === 'dark' ? 'white' : 'black' }}>
      Hint rendered with {theme} theme
    </p>
  );
}

export default function App() {
  const [theme, setTheme] = useState('light');
  const [show, setShow] = useState(true);
  return (
    <ThemeContext value={theme}>
      <button onClick={() => setTheme(t => (t === 'light' ? 'dark' : 'light'))}>Toggle theme</button>{' '}
      <button onClick={() => setShow(s => !s)}>Toggle hint</button>
      <Hint show={show} />
    </ThemeContext>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What happens when <code>use(promise)</code> is called with a pending promise?', options: ['It returns undefined', 'The component suspends and the nearest Suspense fallback shows', 'It throws an error to the console', 'It blocks the browser'], answer: 1, why: 'use suspends the component until the promise settles.' },
      { q: 'Why is <code>use(fetchData())</code> directly in render a bug?', options: ['use only works with context', 'A new promise is created each render, so it never stays resolved', 'fetchData is not allowed in React', 'It works fine'], answer: 1, why: 'Promises must be created outside render or cached; otherwise React keeps suspending.' },
      { q: 'Which is true about <code>use</code> vs other hooks?', options: ['use can be called conditionally', 'use must be called in class components', 'use can be called in try/catch', 'use only works on the server'], answer: 0, why: 'use can be called inside if statements and loops, unlike useState/useContext.' },
      { q: 'What handles a rejected promise read with <code>use</code>?', options: ['Suspense fallback', 'The nearest error boundary', 'useEffect cleanup', 'Nothing, it is ignored'], answer: 1, why: 'Rejections propagate to the nearest error boundary.' },
      { q: 'In React 19, how can you provide a context value?', options: ['Only &lt;Ctx.Provider value&gt;', '&lt;Ctx value={...}&gt; directly', 'useProvide(Ctx)', 'Context cannot be provided'], answer: 1, why: 'React 19 lets you render the context itself as the provider.' },
    ],
    exercise: {
      task: `<p>Build a product viewer. <code>fetchProduct(id)</code> should return a promise that resolves after 700ms with <code>{ id, title }</code>, and must be <strong>cached per id</strong>. Render buttons for products 1–3 and a <code>Product</code> component that reads the data with <code>use()</code>, wrapped in <code>Suspense</code> with a "Loading product…" fallback.</p>`,
      starter: `import { use, useState, Suspense } from 'react';

const cache = new Map();
function fetchProduct(id) {
  // TODO: return a cached promise
  return Promise.resolve({ id, title: 'TODO' });
}

function Product({ id }) {
  // TODO: read with use()
  return <p>Product {id}</p>;
}

export default function App() {
  const [id, setId] = useState(1);
  return (
    <div>
      <button onClick={() => setId(1)}>1</button>
      <Product id={id} />
    </div>
  );
}`,
      hint: 'if (!cache.has(id)) cache.set(id, new Promise(r => setTimeout(() => r({ id, title: "Product " + id }), 700))); return cache.get(id);',
      solution: `import { use, useState, Suspense } from 'react';

const cache = new Map();
function fetchProduct(id) {
  if (!cache.has(id)) {
    cache.set(id, new Promise(resolve =>
      setTimeout(() => resolve({ id, title: ['Keyboard', 'Mouse', 'Monitor'][id - 1] }), 700)
    ));
  }
  return cache.get(id);
}

function Product({ id }) {
  const product = use(fetchProduct(id));
  return <h3>#{product.id}: {product.title}</h3>;
}

export default function App() {
  const [id, setId] = useState(1);
  return (
    <div>
      {[1, 2, 3].map(n => (
        <button key={n} onClick={() => setId(n)} style={{ marginRight: 6 }}>{n}</button>
      ))}
      <Suspense fallback={<p>Loading product…</p>}>
        <Product id={id} />
      </Suspense>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Actions ─────────────────────────────
  {
    id: 'actions',
    section: 'React 19',
    title: 'Actions & <form action>',
    explain: `
      <p>An <strong>Action</strong> is a function that runs inside a <strong>transition</strong> and may be <strong>async</strong>. React 19 tracks it for you: pending state, errors, and (with other hooks) optimistic updates.</p>
      <h3>Async transitions</h3>
      <pre><code>const [isPending, startTransition] = useTransition();

function handleSave() {
  startTransition(async () =&gt; {
    await saveName(name);          // isPending is true while this runs
    startTransition(() =&gt; setSaved(true));
  });
}</code></pre>
      <div class="tip">After an <code>await</code>, wrap state updates in another <code>startTransition</code> if you want them marked as a transition too (a current JavaScript limitation). A plain <code>setState</code> still works; it's just treated as urgent.</div>
      <h3><code>&lt;form action={fn}&gt;</code></h3>
      <p>In React 19 you can pass a <strong>function</strong> to a form's <code>action</code> prop (and to <code>formAction</code> on a button). When submitted:</p>
      <ul>
        <li>React calls <code>fn(formData)</code> with a <code>FormData</code> object — no <code>e.preventDefault()</code> needed.</li>
        <li>It runs as a transition (an Action).</li>
        <li>After a successful action, React <strong>resets uncontrolled form fields</strong> automatically.</li>
      </ul>
      <pre><code>async function signup(formData) {
  const email = formData.get('email');
  await api.signup(email);
}

&lt;form action={signup}&gt;
  &lt;input name="email" /&gt;
  &lt;button type="submit"&gt;Sign up&lt;/button&gt;
&lt;/form&gt;</code></pre>
      <p>Why it matters: less boilerplate (no manual loading flags, no <code>onSubmit</code> + <code>preventDefault</code>), and it works with <code>useActionState</code>, <code>useFormStatus</code> and <code>useOptimistic</code> — covered next.</p>
      <div class="warn"><strong>Pitfall:</strong> inputs need a <code>name</code> attribute or they won't appear in <code>FormData</code>.</div>
    `,
    examples: [
      {
        title: 'Form action with FormData',
        code: `import { useState } from 'react';

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default function App() {
  const [names, setNames] = useState([]);

  async function addName(formData) {
    const name = formData.get('name');
    console.log('action called with', name);
    await wait(600); // pretend to save on server
    setNames(n => [...n, name]);
  }

  return (
    <div>
      <form action={addName}>
        <input name="name" placeholder="Your name" required />{' '}
        <button type="submit">Add</button>
      </form>
      <p style={{ fontSize: 13 }}>Notice: the input clears automatically after the action finishes.</p>
      <ul>{names.map((n, i) => <li key={i}>{n}</li>)}</ul>
    </div>
  );
}`,
      },
      {
        title: 'Async transition with isPending',
        code: `import { useState, useTransition } from 'react';

function saveToServer(value) {
  return new Promise(r => setTimeout(() => r(value.toUpperCase()), 1000));
}

export default function App() {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState('(nothing)');
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await saveToServer(text);
      startTransition(() => setSaved(result));
    });
  }

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} />{' '}
      <button onClick={handleSave} disabled={isPending}>
        {isPending ? 'Saving…' : 'Save'}
      </button>
      <p>Saved value: <strong>{saved}</strong></p>
    </div>
  );
}`,
      },
      {
        title: 'Different buttons, different actions (formAction)',
        code: `import { useState } from 'react';

export default function App() {
  const [log, setLog] = useState([]);

  function publish(formData) {
    setLog(l => [...l, 'Published: ' + formData.get('title')]);
  }
  function saveDraft(formData) {
    setLog(l => [...l, 'Draft saved: ' + formData.get('title')]);
  }

  return (
    <div>
      <form action={publish}>
        <input name="title" placeholder="Post title" />{' '}
        <button type="submit">Publish</button>{' '}
        <button type="submit" formAction={saveDraft}>Save draft</button>
      </form>
      <ul>{log.map((l, i) => <li key={i}>{l}</li>)}</ul>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does React pass to a function used as <code>&lt;form action&gt;</code>?', options: ['The submit event', 'A FormData object', 'The form DOM node', 'Nothing'], answer: 1, why: 'Form actions receive FormData.' },
      { q: 'Do you need <code>e.preventDefault()</code> with <code>&lt;form action={fn}&gt;</code>?', options: ['Yes', 'No, React handles submission', 'Only for async functions', 'Only in Strict Mode'], answer: 1, why: 'React intercepts the submission and calls your function.' },
      { q: 'What happens to uncontrolled inputs after a successful form action?', options: ['Nothing', 'They are reset automatically', 'They are disabled', 'They are removed'], answer: 1, why: 'React 19 resets the form after the action succeeds.' },
      { q: 'Why might an input\'s value be missing from FormData?', options: ['It has no name attribute', 'It is controlled', 'It is inside a div', 'FormData ignores text inputs'], answer: 0, why: 'FormData keys come from the name attribute.' },
      { q: 'With <code>startTransition(async () =&gt; {...})</code>, what is <code>isPending</code> during the await?', options: ['false', 'true', 'undefined', 'It throws'], answer: 1, why: 'Async transitions keep isPending true until they finish.' },
    ],
    exercise: {
      task: `<p>Make a "Todo" form using <code>&lt;form action={fn}&gt;</code>. The action reads <code>todo</code> from <code>FormData</code>, waits 500ms, then appends it to a list. Ignore empty strings. The input should clear automatically.</p>`,
      starter: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);

  // TODO: async function addTodo(formData) { ... }

  return (
    <div>
      <form>
        <input placeholder="What to do?" />
        <button type="submit">Add</button>
      </form>
      <ul>{todos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}`,
      hint: 'Give the input name="todo". In addTodo: const todo = formData.get("todo").trim(); if (!todo) return; await new Promise(r => setTimeout(r, 500)); setTodos(t => [...t, todo]);',
      solution: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([]);

  async function addTodo(formData) {
    const todo = String(formData.get('todo')).trim();
    if (!todo) return;
    await new Promise(r => setTimeout(r, 500));
    setTodos(t => [...t, todo]);
  }

  return (
    <div>
      <form action={addTodo}>
        <input name="todo" placeholder="What to do?" />{' '}
        <button type="submit">Add</button>
      </form>
      <ul>{todos.map((t, i) => <li key={i}>{t}</li>)}</ul>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── useActionState ─────────────────────────────
  {
    id: 'useactionstate',
    section: 'React 19',
    title: 'useActionState',
    explain: `
      <p><code>useActionState</code> is <code>useState</code> + an Action: the state is updated to whatever your action <strong>returns</strong>. Perfect for forms that show a result or error message.</p>
      <pre><code>const [state, formAction, isPending] = useActionState(action, initialState);

async function action(previousState, formData) {
  // ...do work
  return newState;
}

&lt;form action={formAction}&gt;...&lt;/form&gt;</code></pre>
      <ul>
        <li><strong>state</strong> — last value returned by the action (starts as <code>initialState</code>).</li>
        <li><strong>formAction</strong> — pass to <code>&lt;form action&gt;</code> or <code>formAction</code> on a button.</li>
        <li><strong>isPending</strong> — true while the action runs.</li>
      </ul>
      <div class="warn"><strong>Pitfall:</strong> your action's signature changes! The first argument is the <strong>previous state</strong>, and <code>formData</code> is the <strong>second</strong>. Forgetting this is the #1 bug.</div>
      <h3>Typical pattern: return errors as state</h3>
      <pre><code>async function signup(prev, formData) {
  const email = formData.get('email');
  if (!email.includes('@')) return { error: 'Invalid email' };
  await api.signup(email);
  return { message: 'Welcome!' };
}</code></pre>
      <div class="tip">Multiple submissions are queued: each call receives the result of the previous one as <code>previousState</code>.</div>
      <p>An optional third argument, <code>permalink</code>, is used with Server Functions for progressive enhancement (before JS loads).</p>
    `,
    examples: [
      {
        title: 'Add to cart with a result message',
        code: `import { useActionState } from 'react';

function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function addToCart(prevState, formData) {
  const qty = Number(formData.get('qty'));
  await wait(700);
  if (qty < 1) return { ...prevState, error: 'Quantity must be at least 1' };
  if (qty > 5) return { ...prevState, error: 'Max 5 per order' };
  return { total: prevState.total + qty, error: null };
}

export default function App() {
  const [state, formAction, isPending] = useActionState(addToCart, { total: 0, error: null });
  return (
    <form action={formAction}>
      <input name="qty" type="number" defaultValue={1} style={{ width: 60 }} />{' '}
      <button type="submit" disabled={isPending}>{isPending ? 'Adding…' : 'Add to cart'}</button>
      <p>🛒 Items in cart: <strong>{state.total}</strong></p>
      {state.error && <p style={{ color: 'crimson' }}>{state.error}</p>}
    </form>
  );
}`,
      },
      {
        title: 'Counter without a form',
        code: `import { useActionState, startTransition } from 'react';

async function increment(prev, amount) {
  await new Promise(r => setTimeout(r, 300));
  console.log('prev', prev, '+', amount);
  return prev + amount;
}

export default function App() {
  const [count, dispatch, isPending] = useActionState(increment, 0);
  return (
    <div>
      <h2>{count} {isPending && '⏳'}</h2>
      {/* Calling the action outside a form: wrap it in startTransition */}
      <button onClick={() => startTransition(() => dispatch(1))}>+1</button>{' '}
      <button onClick={() => startTransition(() => dispatch(10))}>+10</button>
      <p style={{ fontSize: 13 }}>Click fast: calls are queued and each gets the previous result.</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What are the arguments of an action used with <code>useActionState</code>?', options: ['(formData)', '(previousState, formData)', '(event, state)', '(state)'], answer: 1, why: 'The previous state comes first, then the submitted payload.' },
      { q: 'What does <code>useActionState</code> return?', options: ['[state, setState]', '[state, formAction, isPending]', '[isPending, startTransition]', 'A promise'], answer: 1, why: 'It returns the state, a wrapped action, and a pending flag.' },
      { q: 'How does state get updated?', options: ['You call setState', 'It becomes the value returned by the action', 'It is reset each submit', 'From the URL'], answer: 1, why: 'The return value of the action becomes the new state.' },
      { q: 'How should you call the dispatch function from a button onClick (no form)?', options: ['Directly, no wrapper', 'Inside startTransition', 'Inside useEffect', 'You cannot'], answer: 1, why: 'Outside of form actions, wrap the call in startTransition so isPending works and React does not warn.' },
    ],
    exercise: {
      task: `<p>Build a login form with <code>useActionState</code>. The action waits 600ms; if <code>password</code> is <code>"react19"</code> return <code>{ ok: true, message: 'Logged in!' }</code>, otherwise <code>{ ok: false, message: 'Wrong password' }</code>. Show the message (green/red) and disable the button while pending.</p>`,
      starter: `import { useActionState } from 'react';

async function login(prevState, formData) {
  // TODO
  return prevState;
}

export default function App() {
  // TODO: useActionState(login, { ok: false, message: '' })
  return (
    <form>
      <input name="password" type="password" placeholder="Password" />
      <button type="submit">Log in</button>
    </form>
  );
}`,
      hint: 'const [state, formAction, isPending] = useActionState(login, { ok: false, message: "" }); <form action={formAction}>',
      solution: `import { useActionState } from 'react';

async function login(prevState, formData) {
  await new Promise(r => setTimeout(r, 600));
  if (formData.get('password') === 'react19') {
    return { ok: true, message: 'Logged in!' };
  }
  return { ok: false, message: 'Wrong password' };
}

export default function App() {
  const [state, formAction, isPending] = useActionState(login, { ok: false, message: '' });
  return (
    <form action={formAction}>
      <input name="password" type="password" placeholder="Password" />{' '}
      <button type="submit" disabled={isPending}>{isPending ? 'Checking…' : 'Log in'}</button>
      {state.message && (
        <p style={{ color: state.ok ? 'green' : 'crimson' }}>{state.message}</p>
      )}
    </form>
  );
}`,
    },
  },

  // ───────────────────────────── useFormStatus ─────────────────────────────
  {
    id: 'useformstatus',
    section: 'React 19',
    title: 'useFormStatus',
    explain: `
      <p><code>useFormStatus</code> gives a component information about the <strong>parent form's</strong> last submission. It's imported from <strong><code>'react-dom'</code></strong>, not <code>'react'</code>.</p>
      <pre><code>import { useFormStatus } from 'react-dom';

function SubmitButton() {
  const { pending, data, method, action } = useFormStatus();
  return &lt;button disabled={pending}&gt;{pending ? 'Sending…' : 'Send'}&lt;/button&gt;;
}</code></pre>
      <ul>
        <li><code>pending</code> — true while the parent form's action is running.</li>
        <li><code>data</code> — the <code>FormData</code> being submitted (or <code>null</code>).</li>
        <li><code>method</code> — <code>'get'</code> or <code>'post'</code>.</li>
        <li><code>action</code> — the function passed to the form's <code>action</code>.</li>
      </ul>
      <p>Why it matters: design systems can ship a <code>&lt;SubmitButton /&gt;</code> that shows a spinner automatically, without the form passing any props down. It works like context provided by <code>&lt;form&gt;</code>.</p>
      <div class="warn"><strong>Pitfall:</strong> it must be called in a component rendered <strong>inside</strong> the <code>&lt;form&gt;</code>. Calling it in the same component that renders the <code>&lt;form&gt;</code> always returns <code>pending: false</code>.
      <pre><code>function Form() {
  const { pending } = useFormStatus(); // ❌ always false here
  return &lt;form action={submit}&gt;...&lt;/form&gt;;
}</code></pre></div>
    `,
    examples: [
      {
        title: 'Reusable SubmitButton',
        code: `import { useFormStatus } from 'react-dom';

function SubmitButton({ children }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}>
      {pending ? '⏳ Please wait…' : children}
    </button>
  );
}

async function subscribe(formData) {
  await new Promise(r => setTimeout(r, 1200));
  console.log('subscribed', formData.get('email'));
}

async function sendFeedback(formData) {
  await new Promise(r => setTimeout(r, 800));
  console.log('feedback:', formData.get('text'));
}

export default function App() {
  return (
    <div>
      <form action={subscribe} style={{ marginBottom: 12 }}>
        <input name="email" type="email" placeholder="Email" />{' '}
        <SubmitButton>Subscribe</SubmitButton>
      </form>
      <form action={sendFeedback}>
        <input name="text" placeholder="Feedback" />{' '}
        <SubmitButton>Send</SubmitButton>
      </form>
      <p style={{ fontSize: 13 }}>Each button only reacts to its own form.</p>
    </div>
  );
}`,
      },
      {
        title: 'Reading the submitted data',
        code: `import { useFormStatus } from 'react-dom';

function Status() {
  const { pending, data, method } = useFormStatus();
  if (!pending) return <p>Idle</p>;
  return <p>Submitting "{data.get('username')}" via {method}…</p>;
}

async function register(formData) {
  await new Promise(r => setTimeout(r, 1500));
  console.log('registered', formData.get('username'));
}

export default function App() {
  return (
    <form action={register}>
      <input name="username" placeholder="Username" />{' '}
      <button type="submit">Register</button>
      <Status />
    </form>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Which package exports <code>useFormStatus</code>?', options: ["'react'", "'react-dom'", "'react-dom/client'", "'react-form'"], answer: 1, why: 'useFormStatus lives in react-dom.' },
      { q: 'Where must <code>useFormStatus</code> be called to work?', options: ['In the component that renders the form', 'In a component rendered inside the form', 'In any component on the page', 'In useEffect'], answer: 1, why: 'It reads status from the nearest parent form.' },
      { q: 'What is <code>data</code> while a submission is pending?', options: ['The event', 'The FormData being submitted', 'The return value of the action', 'Always null'], answer: 1, why: 'It exposes the FormData of the in-flight submission.' },
      { q: 'Two forms each contain a SubmitButton using useFormStatus. Submitting form A makes...', options: ['Both buttons pending', 'Only the button in form A pending', 'No buttons pending', 'An error'], answer: 1, why: 'Each call reads only its own parent form.' },
    ],
    exercise: {
      task: `<p>Create a comment form whose action waits 1 second. Build two child components that use <code>useFormStatus</code>: a <code>SubmitButton</code> that shows "Posting…" and is disabled while pending, and a <code>Preview</code> that shows <em>"Posting: &lt;comment text&gt;"</em> while pending.</p>`,
      starter: `import { useFormStatus } from 'react-dom';

async function postComment(formData) {
  await new Promise(r => setTimeout(r, 1000));
  console.log('posted', formData.get('comment'));
}

function SubmitButton() {
  // TODO
  return <button type="submit">Post</button>;
}

export default function App() {
  return (
    <form action={postComment}>
      <input name="comment" placeholder="Comment" />
      <SubmitButton />
    </form>
  );
}`,
      hint: 'const { pending, data } = useFormStatus(); in Preview: if (!pending) return null; return <p>Posting: {data.get("comment")}</p>;',
      solution: `import { useFormStatus } from 'react-dom';

async function postComment(formData) {
  await new Promise(r => setTimeout(r, 1000));
  console.log('posted', formData.get('comment'));
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button type="submit" disabled={pending}>{pending ? 'Posting…' : 'Post'}</button>;
}

function Preview() {
  const { pending, data } = useFormStatus();
  if (!pending) return null;
  return <p style={{ color: '#666' }}>Posting: {data.get('comment')}</p>;
}

export default function App() {
  return (
    <form action={postComment}>
      <input name="comment" placeholder="Comment" />{' '}
      <SubmitButton />
      <Preview />
    </form>
  );
}`,
    },
  },

  // ───────────────────────────── useOptimistic ─────────────────────────────
  {
    id: 'useoptimistic',
    section: 'React 19',
    title: 'useOptimistic',
    explain: `
      <p><strong>Optimistic UI</strong> means showing the result of an action <em>immediately</em>, before the server confirms it. Like buttons, chat messages, and todo checkboxes feel instant this way.</p>
      <pre><code>const [optimisticState, addOptimistic] = useOptimistic(state, updateFn);

// updateFn(currentState, optimisticValue) =&gt; newState</code></pre>
      <h3>How it works</h3>
      <ul>
        <li>Normally <code>optimisticState</code> equals <code>state</code>.</li>
        <li>Inside an Action (form action or <code>startTransition</code>), call <code>addOptimistic(value)</code>. React immediately renders <code>updateFn(state, value)</code>.</li>
        <li>When the Action finishes, the optimistic value is thrown away and React shows the real <code>state</code> again. If you updated <code>state</code> with the server result, it looks seamless. If the action failed and you didn't update state, the UI <strong>reverts automatically</strong>.</li>
      </ul>
      <pre><code>async function send(formData) {
  addOptimistic({ text: formData.get('msg'), sending: true });
  const saved = await api.send(formData.get('msg'));
  setMessages(m =&gt; [...m, saved]);
}</code></pre>
      <div class="warn"><strong>Pitfall:</strong> <code>addOptimistic</code> must be called inside an Action/transition. Calling it in a plain event handler logs a warning and the optimistic value disappears immediately.</div>
      <div class="tip">Show a subtle "sending…" style for optimistic items so users know they aren't confirmed yet.</div>
    `,
    examples: [
      {
        title: 'Optimistic chat messages',
        code: `import { useState, useOptimistic } from 'react';

async function deliver(text) {
  await new Promise(r => setTimeout(r, 1200));
  return { text, id: Math.random() };
}

export default function App() {
  const [messages, setMessages] = useState([{ text: 'Hi there!', id: 1 }]);
  const [optimisticMessages, addOptimistic] = useOptimistic(
    messages,
    (current, newText) => [...current, { text: newText, id: 'temp', sending: true }]
  );

  async function sendAction(formData) {
    const text = formData.get('msg');
    addOptimistic(text);             // shows instantly
    const saved = await deliver(text);
    setMessages(m => [...m, saved]); // real state after "server"
  }

  return (
    <div>
      <ul>
        {optimisticMessages.map((m, i) => (
          <li key={i} style={{ opacity: m.sending ? 0.5 : 1 }}>
            {m.text} {m.sending && <small>(sending…)</small>}
          </li>
        ))}
      </ul>
      <form action={sendAction}>
        <input name="msg" placeholder="Message" required />{' '}
        <button type="submit">Send</button>
      </form>
    </div>
  );
}`,
      },
      {
        title: 'Like button that reverts on failure',
        code: `import { useState, useOptimistic, startTransition } from 'react';

async function likeOnServer(shouldFail) {
  await new Promise(r => setTimeout(r, 1000));
  if (shouldFail) throw new Error('Server error');
}

export default function App() {
  const [likes, setLikes] = useState(10);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(likes, (cur, delta) => cur + delta);
  const [fail, setFail] = useState(false);

  function handleLike() {
    startTransition(async () => {
      addOptimisticLike(1);
      try {
        await likeOnServer(fail);
        startTransition(() => setLikes(l => l + 1));
      } catch (e) {
        console.warn('Like failed, reverting:', e.message);
      }
    });
  }

  return (
    <div>
      <button onClick={handleLike}>❤️ {optimisticLikes}</button>
      <label style={{ marginLeft: 10 }}>
        <input type="checkbox" checked={fail} onChange={e => setFail(e.target.checked)} /> Make server fail
      </label>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>useOptimistic</code> return?', options: ['[state, setState]', '[optimisticState, addOptimistic]', '[isPending, start]', 'A promise'], answer: 1, why: 'It returns the optimistic state and a function to apply optimistic updates.' },
      { q: 'What happens to the optimistic value when the Action finishes?', options: ['It is saved permanently', 'It is discarded and the real state is shown', 'It throws', 'It becomes the initial state'], answer: 1, why: 'Optimistic values only live while the action is pending.' },
      { q: 'If the server request fails and you don\'t update state, the UI...', options: ['Stays with the optimistic value', 'Reverts to the real state automatically', 'Crashes', 'Shows a Suspense fallback'], answer: 1, why: 'Since the real state never changed, React shows it again.' },
      { q: 'Where must <code>addOptimistic</code> be called?', options: ['During render', 'Inside an Action or startTransition', 'In useEffect only', 'Anywhere'], answer: 1, why: 'Optimistic updates must happen inside a transition/Action.' },
    ],
    exercise: {
      task: `<p>Make a todo list where toggling a todo's checkbox updates <strong>optimistically</strong>. The fake server <code>saveDone(id, done)</code> takes 1 second. Use <code>useOptimistic</code> with an update function that flips the matching todo's <code>done</code>. Show pending todos in gray.</p>`,
      starter: `import { useState, useOptimistic, startTransition } from 'react';

function saveDone(id, done) {
  return new Promise(r => setTimeout(r, 1000));
}

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn use()', done: false },
    { id: 2, text: 'Learn Actions', done: false },
  ]);
  // TODO: useOptimistic

  function toggle(todo) {
    // TODO
  }

  return (
    <ul>
      {todos.map(t => (
        <li key={t.id}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} /> {t.text}
          </label>
        </li>
      ))}
    </ul>
  );
}`,
      hint: 'useOptimistic(todos, (cur, id) => cur.map(t => t.id === id ? { ...t, done: !t.done, pending: true } : t)). In toggle: startTransition(async () => { addOptimistic(todo.id); await saveDone(...); startTransition(() => setTodos(...)); });',
      solution: `import { useState, useOptimistic, startTransition } from 'react';

function saveDone(id, done) {
  return new Promise(r => setTimeout(r, 1000));
}

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn use()', done: false },
    { id: 2, text: 'Learn Actions', done: false },
  ]);
  const [optimisticTodos, toggleOptimistic] = useOptimistic(todos, (cur, id) =>
    cur.map(t => (t.id === id ? { ...t, done: !t.done, pending: true } : t))
  );

  function toggle(todo) {
    startTransition(async () => {
      toggleOptimistic(todo.id);
      await saveDone(todo.id, !todo.done);
      startTransition(() => {
        setTodos(list => list.map(t => (t.id === todo.id ? { ...t, done: !t.done } : t)));
      });
    });
  }

  return (
    <ul>
      {optimisticTodos.map(t => (
        <li key={t.id} style={{ color: t.pending ? 'gray' : 'black' }}>
          <label>
            <input type="checkbox" checked={t.done} onChange={() => toggle(t)} /> {t.text}
          </label>
        </li>
      ))}
    </ul>
  );
}`,
    },
  },

  // ───────────────────────────── ref as a prop ─────────────────────────────
  {
    id: 'ref-as-prop',
    section: 'React 19',
    title: 'ref as a prop & ref cleanup',
    explain: `
      <p>In React 19, <code>ref</code> is a <strong>regular prop</strong> for function components. You can read it from props and pass it to a DOM element:</p>
      <pre><code>function MyInput({ placeholder, ref }) {
  return &lt;input placeholder={placeholder} ref={ref} /&gt;;
}

&lt;MyInput ref={inputRef} placeholder="Name" /&gt;</code></pre>
      <h3>forwardRef is legacy</h3>
      <p>Before React 19 you needed:</p>
      <pre><code>const MyInput = forwardRef(function MyInput(props, ref) {
  return &lt;input {...props} ref={ref} /&gt;;
});</code></pre>
      <p>This still works but isn't needed anymore, and will be deprecated in a future version. New code should use <code>ref</code> as a prop. (Class components still don't receive <code>ref</code> as a prop — there it refers to the instance.)</p>
      <h3>Ref callback cleanup</h3>
      <p>A <strong>ref callback</strong> is a function passed as <code>ref</code>. React calls it with the DOM node when it attaches. In React 19, it can <strong>return a cleanup function</strong>, which React calls when the element is removed (or the callback changes):</p>
      <pre><code>&lt;div ref={node =&gt; {
  const observer = new ResizeObserver(...);
  observer.observe(node);
  return () =&gt; observer.disconnect();   // ✅ new in 19
}} /&gt;</code></pre>
      <p>Before, React called the callback again with <code>null</code> on detach. If you return a cleanup, React skips the <code>null</code> call.</p>
      <div class="warn"><strong>Pitfall:</strong> an inline ref callback is a new function every render, so React runs cleanup + setup on every re-render. Wrap it in <code>useCallback</code> if setup is expensive. Also avoid implicit returns like <code>ref={n =&gt; (instance = n)}</code> — returning a non-function value is now ambiguous; use a block body.</div>
    `,
    examples: [
      {
        title: 'ref as a regular prop',
        code: `import { useRef } from 'react';

function MyInput({ label, ref }) {
  return (
    <label>
      {label}: <input ref={ref} />
    </label>
  );
}

export default function App() {
  const inputRef = useRef(null);
  return (
    <div>
      <MyInput label="Name" ref={inputRef} />{' '}
      <button onClick={() => {
        inputRef.current.focus();
        console.log('ref.current is', inputRef.current.tagName);
      }}>Focus</button>
    </div>
  );
}`,
      },
      {
        title: 'Legacy forwardRef (still works)',
        code: `import { forwardRef, useRef } from 'react';

// Old style — fine to read, no need to write in React 19
const OldInput = forwardRef(function OldInput(props, ref) {
  return <input {...props} ref={ref} />;
});

// New style
function NewInput({ ref, ...props }) {
  return <input {...props} ref={ref} />;
}

export default function App() {
  const a = useRef(null);
  const b = useRef(null);
  return (
    <div>
      <OldInput ref={a} placeholder="forwardRef" />{' '}
      <NewInput ref={b} placeholder="ref prop" />
      <p>
        <button onClick={() => a.current.focus()}>Focus old</button>{' '}
        <button onClick={() => b.current.focus()}>Focus new</button>
      </p>
    </div>
  );
}`,
      },
      {
        title: 'Ref callback with cleanup',
        code: `import { useState, useCallback } from 'react';

export default function App() {
  const [show, setShow] = useState(true);
  const [width, setWidth] = useState(0);
  const [big, setBig] = useState(false);

  // useCallback: stable callback, so it only runs on mount/unmount
  const measureRef = useCallback(node => {
    console.log('ref attached to', node.tagName);
    const observer = new ResizeObserver(entries => {
      setWidth(Math.round(entries[0].contentRect.width));
    });
    observer.observe(node);
    return () => {
      console.log('ref cleanup: observer disconnected');
      observer.disconnect();
    };
  }, []);

  return (
    <div>
      <button onClick={() => setShow(s => !s)}>{show ? 'Unmount' : 'Mount'} box</button>{' '}
      <button onClick={() => setBig(b => !b)}>Resize box</button>
      {show && (
        <div ref={measureRef} style={{ width: big ? 300 : 150, height: 50, background: 'skyblue', marginTop: 8, transition: 'width 0.3s' }}>
          {width}px wide
        </div>
      )}
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'In React 19, how do you pass a ref to a function component\'s inner input?', options: ['Must use forwardRef', 'Accept ref as a prop and pass it to the input', 'Use context', 'Impossible'], answer: 1, why: 'ref is a regular prop for function components in React 19.' },
      { q: 'What can a ref callback return in React 19?', options: ['Nothing, ever', 'A cleanup function', 'A promise', 'A new ref'], answer: 1, why: 'Returning a function registers it as cleanup.' },
      { q: 'If a ref callback returns a cleanup, does React still call it with <code>null</code> on unmount?', options: ['Yes', 'No, it calls the cleanup instead', 'Only in Strict Mode', 'Only for class components'], answer: 1, why: 'The cleanup replaces the null call.' },
      { q: 'Why can an inline ref callback cause repeated setup/cleanup?', options: ['It is a new function every render', 'Refs are async', 'React bug', 'Only with forwardRef'], answer: 0, why: 'A changed callback is detached (cleanup) and re-attached. Use useCallback to stabilize.' },
    ],
    exercise: {
      task: `<p>Create a <code>AutoFocusInput</code> component that takes <code>ref</code> as a prop and forwards it to an <code>&lt;input&gt;</code>. In <code>App</code>, pass a <strong>ref callback</strong> that focuses the node, logs <code>"mounted"</code>, and returns a cleanup that logs <code>"unmounted"</code>. Add a toggle button to mount/unmount the input.</p>`,
      starter: `import { useState } from 'react';

function AutoFocusInput({ placeholder }) {
  // TODO: accept ref and pass it to input
  return <input placeholder={placeholder} />;
}

export default function App() {
  const [show, setShow] = useState(true);
  return (
    <div>
      <button onClick={() => setShow(s => !s)}>Toggle</button>
      {show && <AutoFocusInput placeholder="I focus myself" />}
    </div>
  );
}`,
      hint: 'Define const focusRef = useCallback(node => { node.focus(); console.log("mounted"); return () => console.log("unmounted"); }, []); and pass ref={focusRef}.',
      solution: `import { useState, useCallback } from 'react';

function AutoFocusInput({ placeholder, ref }) {
  return <input placeholder={placeholder} ref={ref} />;
}

export default function App() {
  const [show, setShow] = useState(true);
  const focusRef = useCallback(node => {
    node.focus();
    console.log('mounted');
    return () => console.log('unmounted');
  }, []);

  return (
    <div>
      <button onClick={() => setShow(s => !s)}>Toggle</button>{' '}
      {show && <AutoFocusInput placeholder="I focus myself" ref={focusRef} />}
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Document metadata ─────────────────────────────
  {
    id: 'document-metadata',
    section: 'React 19',
    title: 'Document metadata',
    explain: `
      <p>In React 19 you can render <code>&lt;title&gt;</code>, <code>&lt;meta&gt;</code> and <code>&lt;link&gt;</code> tags <strong>anywhere in your component tree</strong>. React automatically <strong>hoists</strong> them into the document <code>&lt;head&gt;</code>.</p>
      <pre><code>function BlogPost({ post }) {
  return (
    &lt;article&gt;
      &lt;title&gt;{post.title}&lt;/title&gt;
      &lt;meta name="author" content={post.author} /&gt;
      &lt;link rel="canonical" href={post.url} /&gt;
      &lt;h1&gt;{post.title}&lt;/h1&gt;
    &lt;/article&gt;
  );
}</code></pre>
      <p>Why it matters: metadata lives next to the component that knows about it. Previously you needed a library like <code>react-helmet</code> or effects that set <code>document.title</code> by hand. It also works with server rendering and streaming.</p>
      <h3>Rules &amp; tips</h3>
      <ul>
        <li><code>&lt;title&gt;</code> should have a <strong>single string</strong> child. Write <code>{'Inbox (' + count + ')'}</code>, not <code>Inbox ({count})</code> (that's multiple children and React warns).</li>
        <li>Render only one <code>&lt;title&gt;</code> at a time; if several are rendered, the browser uses the first one in <code>&lt;head&gt;</code>.</li>
        <li>When the component unmounts, React removes its tags.</li>
        <li>Stylesheets with <code>precedence</code> (<code>&lt;link rel="stylesheet" precedence="default" /&gt;</code>) are also hoisted and de-duplicated.</li>
      </ul>
      <div class="warn">The preview runs in an iframe, so you <strong>can't see</strong> its tab title. The examples log <code>document.title</code> and the head's meta tags to the console instead.</div>
    `,
    examples: [
      {
        title: 'Title that follows state',
        code: `import { useState, useEffect } from 'react';

export default function App() {
  const [unread, setUnread] = useState(3);

  useEffect(() => {
    console.log('document.title =', JSON.stringify(document.title));
  }, [unread]);

  return (
    <div>
      <title>{unread > 0 ? 'Inbox (' + unread + ')' : 'Inbox'}</title>
      <h2>📬 {unread} unread</h2>
      <button onClick={() => setUnread(u => u + 1)}>New mail</button>{' '}
      <button onClick={() => setUnread(0)}>Mark all read</button>
    </div>
  );
}`,
      },
      {
        title: 'Per-page title and meta tags',
        code: `import { useState, useEffect } from 'react';

function HomePage() {
  return (
    <>
      <title>Home – My Site</title>
      <meta name="description" content="Welcome to the home page" />
      <h2>🏠 Home</h2>
    </>
  );
}

function AboutPage() {
  return (
    <>
      <title>About – My Site</title>
      <meta name="description" content="Learn about us" />
      <h2>ℹ️ About</h2>
    </>
  );
}

export default function App() {
  const [page, setPage] = useState('home');

  useEffect(() => {
    const desc = document.head.querySelector('meta[name="description"]');
    console.log('title:', document.title, '| description:', desc && desc.content);
  }, [page]);

  return (
    <div>
      <button onClick={() => setPage('home')}>Home</button>{' '}
      <button onClick={() => setPage('about')}>About</button>
      {page === 'home' ? <HomePage /> : <AboutPage />}
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Where does React 19 put a <code>&lt;title&gt;</code> rendered inside a component?', options: ['Where it was rendered in body', 'Hoisted into document &lt;head&gt;', 'It is ignored', 'In a portal'], answer: 1, why: 'React hoists title, meta and link tags into head.' },
      { q: 'Which title children are correct?', options: ['&lt;title&gt;Inbox ({count})&lt;/title&gt;', "&lt;title&gt;{'Inbox (' + count + ')'}&lt;/title&gt;", 'Both are equally fine', 'Neither, titles need an effect'], answer: 1, why: 'title should receive a single string child; mixing text and expressions creates multiple children.' },
      { q: 'What happens to a component\'s &lt;meta&gt; tag when it unmounts?', options: ['It stays forever', 'React removes it', 'It moves to body', 'The page reloads'], answer: 1, why: 'React manages these tags and removes them on unmount.' },
      { q: 'What library did many apps use for this before React 19?', options: ['react-helmet', 'redux', 'react-router', 'immer'], answer: 0, why: 'react-helmet (and similar) managed head tags before native support.' },
    ],
    exercise: {
      task: `<p>Build a tiny timer: a counter that increases every second while running. Render a <code>&lt;title&gt;</code> of <code>"⏱ N s"</code> while running and <code>"Paused"</code> when paused. Log <code>document.title</code> in an effect whenever it changes.</p>`,
      starter: `import { useState, useEffect } from 'react';

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  // TODO: render <title> and log document.title

  return (
    <div>
      <h2>{seconds}s</h2>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
    </div>
  );
}`,
      hint: "const title = running ? '⏱ ' + seconds + ' s' : 'Paused'; render <title>{title}</title> and useEffect(() => console.log(document.title), [title]);",
      solution: `import { useState, useEffect } from 'react';

export default function App() {
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  const title = running ? '⏱ ' + seconds + ' s' : 'Paused';

  useEffect(() => {
    console.log('document.title =', document.title);
  }, [title]);

  return (
    <div>
      <title>{title}</title>
      <h2>{seconds}s</h2>
      <button onClick={() => setRunning(r => !r)}>{running ? 'Pause' : 'Start'}</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────── Activity ─────────────────────────────
  {
    id: 'activity',
    section: 'React 19',
    title: '<Activity>',
    explain: `
      <p><code>&lt;Activity&gt;</code> (stable in <strong>React 19.2</strong>, <code>import { Activity } from 'react'</code>) lets you <strong>hide</strong> part of the UI while <strong>keeping its state</strong>.</p>
      <pre><code>&lt;Activity mode={isVisible ? 'visible' : 'hidden'}&gt;
  &lt;Sidebar /&gt;
&lt;/Activity&gt;</code></pre>
      <h3>Compared to conditional rendering</h3>
      <ul>
        <li><code>{show &amp;&amp; &lt;Tab /&gt;}</code> — hiding <strong>unmounts</strong>: state is lost (typed text, scroll, counters).</li>
        <li><code>&lt;Activity mode="hidden"&gt;</code> — the children stay in the tree, their <strong>state is preserved</strong>, and the DOM is hidden with <code>display: none</code>.</li>
      </ul>
      <h3>What happens in <code>hidden</code> mode</h3>
      <ul>
        <li>DOM is kept but hidden.</li>
        <li><strong>Effects are cleaned up</strong> (like unmount), so subscriptions/timers stop. When visible again, effects are re-created.</li>
        <li>Updates to hidden children are still processed, but at <strong>low priority</strong>, after visible work.</li>
        <li>React can <strong>pre-render</strong> hidden content in the background, e.g. the next tab the user will likely open.</li>
      </ul>
      <p>Analogy: conditional rendering throws the tab in the bin; <code>&lt;Activity&gt;</code> puts it in a drawer. Everything is where you left it when you open the drawer.</p>
      <div class="warn"><strong>Pitfall:</strong> things that aren't effects keep going. A <code>&lt;video&gt;</code> keeps playing when hidden unless you pause it in an effect cleanup. Also, hidden trees still use memory — don't hide hundreds of screens.</div>
    `,
    examples: [
      {
        title: 'Tabs that keep their state',
        code: `import { useState, Activity } from 'react';

function Counter({ name }) {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{name}: {count}</button>;
}

function Notes() {
  return <textarea placeholder="Type, switch tabs, come back…" rows={3} style={{ width: 250 }} />;
}

export default function App() {
  const [tab, setTab] = useState('counter');
  return (
    <div>
      <button onClick={() => setTab('counter')}>Counter tab</button>{' '}
      <button onClick={() => setTab('notes')}>Notes tab</button>
      <div style={{ marginTop: 10 }}>
        <Activity mode={tab === 'counter' ? 'visible' : 'hidden'}>
          <Counter name="Clicks" />
        </Activity>
        <Activity mode={tab === 'notes' ? 'visible' : 'hidden'}>
          <Notes />
        </Activity>
      </div>
      <p style={{ fontSize: 13 }}>Both tabs keep their state when hidden.</p>
    </div>
  );
}`,
      },
      {
        title: 'Effects stop when hidden, state stays',
        code: `import { useState, useEffect, Activity } from 'react';

function Clock() {
  const [ticks, setTicks] = useState(0);
  useEffect(() => {
    console.log('▶️ effect: start timer');
    const id = setInterval(() => setTicks(t => t + 1), 1000);
    return () => {
      console.log('⏹ cleanup: stop timer');
      clearInterval(id);
    };
  }, []);
  return <h3>Ticks: {ticks}</h3>;
}

export default function App() {
  const [visible, setVisible] = useState(true);
  const [useActivity, setUseActivity] = useState(true);
  return (
    <div>
      <button onClick={() => setVisible(v => !v)}>{visible ? 'Hide' : 'Show'}</button>{' '}
      <label>
        <input type="checkbox" checked={useActivity} onChange={e => setUseActivity(e.target.checked)} /> use &lt;Activity&gt;
      </label>
      {useActivity ? (
        <Activity mode={visible ? 'visible' : 'hidden'}>
          <Clock />
        </Activity>
      ) : (
        visible && <Clock />
      )}
      <p style={{ fontSize: 13 }}>With Activity: ticks resume from where they paused. Without: they reset to 0.</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>&lt;Activity mode="hidden"&gt;</code> do to its children\'s state?', options: ['Resets it', 'Preserves it', 'Deletes the component', 'Saves it to localStorage'], answer: 1, why: 'Hidden Activity keeps component state alive.' },
      { q: 'What happens to effects inside a hidden Activity?', options: ['They keep running', 'They are cleaned up, and re-run when visible again', 'They run twice', 'They throw'], answer: 1, why: 'Effects are unmounted while hidden and remounted when shown.' },
      { q: 'How is hidden content hidden in the DOM?', options: ['Removed from DOM', 'display: none', 'opacity: 0', 'Moved to a portal'], answer: 1, why: 'React keeps the DOM and hides it with display: none.' },
      { q: 'Where do you import Activity from in React 19.2?', options: ["'react'", "'react-dom'", "'react/unstable'", "'react-activity'"], answer: 0, why: 'Activity is exported from react as of 19.2.' },
      { q: 'Which is a benefit of Activity over <code>{show &amp;&amp; &lt;X /&gt;}</code>?', options: ['Smaller bundle', 'State is kept and content can be pre-rendered in the background', 'No re-renders ever', 'Works without React'], answer: 1, why: 'Activity preserves state and allows low-priority pre-rendering.' },
    ],
    exercise: {
      task: `<p>Build a two-step signup: <strong>Step 1</strong> has a "Name" input, <strong>Step 2</strong> has an "Email" input. "Next"/"Back" buttons switch steps. Use <code>&lt;Activity&gt;</code> so typed values survive switching steps (inputs can be uncontrolled or use state inside each step).</p>`,
      starter: `import { useState, Activity } from 'react';

function StepOne() {
  return <label>Name: <input /></label>;
}

function StepTwo() {
  return <label>Email: <input type="email" /></label>;
}

export default function App() {
  const [step, setStep] = useState(1);
  return (
    <div>
      {/* TODO: use Activity instead of conditional rendering */}
      {step === 1 ? <StepOne /> : <StepTwo />}
      <p>
        <button onClick={() => setStep(1)}>Back</button>{' '}
        <button onClick={() => setStep(2)}>Next</button>
      </p>
    </div>
  );
}`,
      hint: 'Render both steps, each wrapped in <Activity mode={step === 1 ? "visible" : "hidden"}>.',
      solution: `import { useState, Activity } from 'react';

function StepOne() {
  const [name, setName] = useState('');
  return <label>Name: <input value={name} onChange={e => setName(e.target.value)} /></label>;
}

function StepTwo() {
  const [email, setEmail] = useState('');
  return <label>Email: <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>;
}

export default function App() {
  const [step, setStep] = useState(1);
  return (
    <div>
      <p>Step {step} of 2</p>
      <Activity mode={step === 1 ? 'visible' : 'hidden'}>
        <StepOne />
      </Activity>
      <Activity mode={step === 2 ? 'visible' : 'hidden'}>
        <StepTwo />
      </Activity>
      <p>
        <button onClick={() => setStep(1)} disabled={step === 1}>Back</button>{' '}
        <button onClick={() => setStep(2)} disabled={step === 2}>Next</button>
      </p>
    </div>
  );
}`,
    },
  },
);
