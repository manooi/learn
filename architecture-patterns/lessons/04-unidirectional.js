// Section: Unidirectional data flow (Flux, Redux, MVI, Elm, useReducer)
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'why-unidirectional',
    section: 'Unidirectional data flow',
    title: 'Why one-way flow? The cascading-update problem',
    explain: `
      <p>In the MVC and MVVM lessons, data could travel in many directions: a view writes into
      a model through a two-way binding, the model notifies observers, one of those observers
      updates <em>another</em> model, which notifies more observers… For a small screen that is
      fine. For a big app with many models, it becomes a web of updates that nobody can hold in
      their head.</p>

      <h3>The story that is usually told</h3>
      <p>Around 2014, Facebook engineers presented <strong>Flux</strong> (in a talk at F8 2014).
      The example they used was the chat <strong>unread-messages counter</strong>: as the story
      is usually told, the badge kept showing an unread message that the user had already read.
      Engineers fixed it, and later it came back. Their conclusion was that the bug was not in
      one bad line. It came from the <em>structure</em>: many models and views updating each
      other in both directions, so one change set off a <strong>cascade</strong> of further
      changes whose order was hard to predict.</p>

      <h3>The cascading-update problem</h3>
      <ul>
        <li><strong>Many writers:</strong> any view or model can change any other model.</li>
        <li><strong>Hidden order:</strong> the result depends on which listener was registered
        first. That order lives in wiring code spread across files.</li>
        <li><strong>Duplicated state:</strong> the same fact ("how many unread?") is stored in
        two places that must be kept in sync by hand.</li>
        <li><strong>Hard to trace:</strong> when the number is wrong, which of the ten updates
        wrote it?</li>
      </ul>

      <h3>The fix: data flows in one direction, around a loop</h3>
      <p>Unidirectional data flow puts every change on a single one-way road:</p>
      <pre><code>Action  ──►  Dispatcher  ──►  Store  ──►  View
  ▲                                         │
  └──────────── user clicks, types ─────────┘</code></pre>
      <ol>
        <li>The <strong>view never changes state directly</strong>. It only describes what
        happened, as an <strong>action</strong>: a plain object like
        <code>{ type: 'MESSAGE_READ', id: 1 }</code>.</li>
        <li>Every action goes through <strong>one entry point</strong> (a dispatcher, or
        <code>store.dispatch</code> in Redux), one at a time.</li>
        <li>The <strong>store</strong> is the only code that computes the new state.</li>
        <li>The view re-renders from the new state: <code>UI = f(state)</code>, like in the
        Foundations section.</li>
      </ol>
      <p><strong>Analogy:</strong> a tangled app is an office where anyone can phone anyone and
      pass on changes. A one-way app is a newsroom: every story goes to the one editor's desk,
      the editor updates the paper, and the paper is printed again. If a story is wrong, you
      check the editor's log.</p>

      <div class="tip">Because every change is an action object passing through one place, you
      can <strong>log</strong> every change, <strong>replay</strong> a list of actions to
      reproduce a bug, and build tools like "time-travel debugging" (Redux DevTools).</div>
      <div class="warn">One-way flow is not free: there is more code (action types, a
      dispatcher, a store) and more indirection. For a single checkbox that only one component
      cares about, local state is simpler. Use one-way flow for state that many parts of the UI
      share.</div>
      <p>The rest of this section shows the family of patterns built on this idea:
      <strong>Flux</strong>, <strong>Redux</strong>, <strong>MVI</strong>, <strong>The Elm
      Architecture</strong> and React's <code>useReducer</code>.</p>
    `,
    examples: [
      {
        title: 'The tangle: models that update each other',
        code: `// ===== HELPERS: an observable value + indented logging =====
let depth = 0;

function log(role, msg) {
  console.log('  '.repeat(depth) + \`[\${role}] \${msg}\`);
}

function observable(role, value) {
  const listeners = [];
  return {
    get: () => value,
    set(next) {
      log(role, 'set ' + JSON.stringify(next));
      value = next;
      depth++; // everything this set() triggers is logged one level deeper
      listeners.forEach(fn => fn(next));
      depth--;
    },
    on(fn) {
      listeners.push(fn);
    },
  };
}

// ===== MODELS (each one owned by a different "team") =====
const messages = observable('MessageModel', [
  { id: 1, read: false },
  { id: 2, read: false },
]);
const thread = observable('ThreadModel', { unread: 2 });
const badge = observable('BadgeModel', { count: 2 });

// ① Thread team: keep the thread's unread count in sync with the messages
messages.on(list => {
  thread.set({ unread: list.filter(m => !m.read).length });
});

// ② Badge team: the top badge mirrors the thread
thread.on(t => badge.set({ count: t.unread }));

// ③ Someone's "quick fix": messages changed → one was read → count - 1
messages.on(() => badge.set({ count: badge.get().count - 1 }));

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>Chat tab: <b id="t"></b> unread · Top badge: <b id="b"></b></p>
  <button id="r1">Read message 1</button>
  <button id="r2">Read message 2</button>\`;

function render() {
  log('View', \`render thread=\${thread.get().unread} badge=\${badge.get().count}\`);
  root.querySelector('#t').textContent = thread.get().unread;
  root.querySelector('#b').textContent = badge.get().count;
}
thread.on(render);
badge.on(render);

// ===== CONTROLLER: clicks write straight into a model =====
function markRead(id) {
  console.log(\`--- click: read message \${id} ---\`);
  const next = messages.get().map(m => (m.id === id ? { ...m, read: true } : m));
  messages.set(next);
}
root.querySelector('#r1').onclick = () => markRead(1);
root.querySelector('#r2').onclick = () => markRead(2);

render();`,
        explain: `
          <details>
            <summary>The problem: one click, eight log lines, wrong badge</summary>
            <p>Three models hold overlapping facts. Three listeners (①②③) keep them "in sync",
            and the view listens to two of them. Click <strong>Read message 1</strong> once.
            The indentation in the console shows who triggered whom:</p>
            <table>
              <tr><th>#</th><th>Depth</th><th>Console line</th><th>Triggered by</th></tr>
              <tr><td>1</td><td>0</td><td><code>--- click: read message 1 ---</code></td>
                <td><code>markRead(1)</code></td></tr>
              <tr><td>2</td><td>0</td>
                <td><code>[MessageModel] set [{"id":1,"read":true},{"id":2,"read":false}]</code></td>
                <td>the controller</td></tr>
              <tr><td>3</td><td>1</td><td><code>[ThreadModel] set {"unread":1}</code></td>
                <td>listener ① (first listener on messages)</td></tr>
              <tr><td>4</td><td>2</td><td><code>[BadgeModel] set {"count":1}</code></td>
                <td>listener ② (first listener on thread)</td></tr>
              <tr><td>5</td><td>3</td><td><code>[View] render thread=1 badge=1</code></td>
                <td>badge's <code>render</code> listener</td></tr>
              <tr><td>6</td><td>2</td><td><code>[View] render thread=1 badge=1</code></td>
                <td>thread's <code>render</code> listener</td></tr>
              <tr><td>7</td><td>1</td><td><code>[BadgeModel] set {"count":0}</code></td>
                <td>listener ③ (second listener on messages) does <code>1 - 1</code></td></tr>
              <tr><td>8</td><td>2</td><td><code>[View] render thread=1 badge=0</code></td>
                <td>badge's <code>render</code> listener again</td></tr>
            </table>
            <p>Final screen: <strong>Chat tab 1 unread · Top badge 0</strong>. One message is
            still unread, but the badge says 0. The view rendered three times for one click,
            and the first two renders showed a value that was about to be overwritten.</p>
          </details>
          <details>
            <summary>Why it is so hard to find</summary>
            <ul>
              <li>Each listener looks correct <em>on its own</em>. ② mirrors the thread. ③
              decrements when a message is read. The bug only exists in the
              <strong>combination</strong>.</li>
              <li>The result depends on <strong>registration order</strong>. If ③ were registered
              before ①, the badge would end at 1 (② would overwrite ③). Moving an import could
              "fix" or "break" the badge.</li>
              <li>The fact "unread count" is <strong>stored twice</strong> (thread and badge)
              instead of being computed from the messages.</li>
            </ul>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>Read message 1</strong> again. Nothing is new, but the whole
              cascade runs again: the same eight log lines and three more renders.</li>
              <li>Now click <strong>Read message 2</strong>. The thread says 0, and the badge
              says <strong>-1</strong> (② sets 0, then ③ does <code>0 - 1</code>).</li>
              <li>Move the line with ③ above the line with ①, press Run, and click again. The
              final badge changes. Same code, different order, different result.</li>
              <li>Delete ③ entirely. Now the badge is correct. Then ask yourself: in a real app
              with 30 models, how would you have found ③?</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The same app with one-way flow',
        code: `// ===== STORE: the ONLY place where state changes =====
let state = {
  messages: [
    { id: 1, read: false },
    { id: 2, read: false },
  ],
};
const listeners = [];

function update(s, action) {
  if (action.type === 'MESSAGE_READ') {
    return {
      messages: s.messages.map(m => (m.id === action.id ? { ...m, read: true } : m)),
    };
  }
  return s;
}

// ===== DISPATCHER: the single entry point for every change =====
function dispatch(action) {
  console.log('[Dispatcher] action', JSON.stringify(action));
  state = update(state, action);
  console.log('[Store] state changed, notifying', listeners.length, 'view(s)');
  listeners.forEach(fn => fn(state));
}

// Derived value: COMPUTED from state, never stored a second time
const unreadCount = s => s.messages.filter(m => !m.read).length;

// ===== VIEW: reads state, sends actions =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>Chat tab: <b id="t"></b> unread · Top badge: <b id="b"></b></p>
  <button id="r1">Read message 1</button>
  <button id="r2">Read message 2</button>\`;

function render(s) {
  const n = unreadCount(s);
  console.log(\`[View] render thread=\${n} badge=\${n}\`);
  root.querySelector('#t').textContent = n;
  root.querySelector('#b').textContent = n;
}
listeners.push(render);

// The view only DESCRIBES what happened. It never touches state.
root.querySelector('#r1').onclick = () => dispatch({ type: 'MESSAGE_READ', id: 1 });
root.querySelector('#r2').onclick = () => dispatch({ type: 'MESSAGE_READ', id: 2 });

render(state);`,
        explain: `
          <details>
            <summary>Step by step: clicking <em>Read message 1</em></summary>
            <table>
              <tr><th>Step</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>The click handler creates an action and dispatches it</td>
                <td><code>[Dispatcher] action {"type":"MESSAGE_READ","id":1}</code></td></tr>
              <tr><td>2</td><td><code>update</code> returns a new state; one listener is
                notified</td>
                <td><code>[Store] state changed, notifying 1 view(s)</code></td></tr>
              <tr><td>3</td><td>The view computes the unread count from the state and renders
                once</td><td><code>[View] render thread=1 badge=1</code></td></tr>
            </table>
            <p>Three flat lines, no nesting. Click it again and you get
            <code>thread=1 badge=1</code> again: marking an already-read message as read is
            harmless, because the count is <strong>computed</strong>, not decremented.</p>
          </details>
          <details>
            <summary>What changed compared to the tangle</summary>
            <ul>
              <li><strong>One writer:</strong> only <code>update</code> produces new state.</li>
              <li><strong>No duplicated facts:</strong> both numbers come from
              <code>unreadCount(state)</code>, so they can never disagree.</li>
              <li><strong>No listener-order bugs:</strong> the state is final before any view
              hears about it.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Animated: the one-way loop',
        lang: 'html',
        code: `<style>
  .wrap { font-family: system-ui, sans-serif; }
  svg text { font: 600 15px system-ui, sans-serif; fill: #1f2330; }
  .node rect { fill: #f4f5f9; stroke: #c5c9d6; stroke-width: 2; transition: all .3s; }
  .node.active rect { fill: #fff3c4; stroke: #e0a800; }
  .arrow { stroke: #c5c9d6; stroke-width: 3; fill: none; transition: stroke .3s; }
  .arrow.active { stroke: #e0a800; }
  #caption { min-height: 3.2em; margin: 6px 0; }
  code { background: #f1f2f6; padding: 1px 4px; border-radius: 4px; }
</style>

<div class="wrap">
  <svg viewBox="0 0 520 250" width="100%" style="max-width: 520px">
    <defs>
      <marker id="head" markerWidth="10" markerHeight="10" refX="8" refY="4" orient="auto">
        <path d="M0,0 L8,4 L0,8 z" fill="#8a90a2" />
      </marker>
    </defs>
    <path id="a-action-disp" class="arrow" d="M190,48 L322,48" marker-end="url(#head)" />
    <path id="a-disp-store" class="arrow" d="M405,76 L405,160" marker-end="url(#head)" />
    <path id="a-store-view" class="arrow" d="M330,198 L198,198" marker-end="url(#head)" />
    <path id="a-view-action" class="arrow" d="M115,170 L115,86" marker-end="url(#head)" />
    <g id="action" class="node"><rect x="40" y="20" width="150" height="56" rx="10" />
      <text x="115" y="53" text-anchor="middle">Action</text></g>
    <g id="dispatcher" class="node"><rect x="330" y="20" width="150" height="56" rx="10" />
      <text x="405" y="53" text-anchor="middle">Dispatcher</text></g>
    <g id="store" class="node"><rect x="330" y="170" width="150" height="56" rx="10" />
      <text x="405" y="203" text-anchor="middle">Store</text></g>
    <g id="view" class="node"><rect x="40" y="170" width="150" height="56" rx="10" />
      <text x="115" y="203" text-anchor="middle">View</text></g>
  </svg>

  <div id="caption"></div>
  <div>Store state: <code id="state"></code></div>
  <p>
    <button id="back">◀ Back</button>
    <button id="next">Next step ▶</button>
    <button id="play">Auto play</button>
  </p>
</div>

<script>
  const steps = [
    { node: 'view', arrow: null, likes: 0,
      text: '① The View shows the current state: 0 likes. The user clicks "Like".' },
    { node: 'action', arrow: 'a-view-action', likes: 0,
      text: '② The click becomes an Action, a plain object: ' +
        '<code>{ type: "LIKE_CLICKED", postId: 7 }</code>. ' +
        'The View does not change state.' },
    { node: 'dispatcher', arrow: 'a-action-disp', likes: 0,
      text: '③ The Dispatcher sends the action to every registered store, ' +
        'one action at a time.' },
    { node: 'store', arrow: 'a-disp-store', likes: 1,
      text: '④ The Store is the only code that changes state: likes 0 → 1. ' +
        'Then it emits "change".' },
    { node: 'view', arrow: 'a-store-view', likes: 1,
      text: '⑤ The View re-reads the state and re-renders: 1 like. ' +
        'Loop complete. Nothing flows backwards.' },
  ];
  let i = 0;
  let timer = null;

  function show() {
    const s = steps[i];
    const all = document.querySelectorAll('.node, .arrow');
    all.forEach(el => el.classList.remove('active'));
    document.getElementById(s.node).classList.add('active');
    if (s.arrow) document.getElementById(s.arrow).classList.add('active');
    document.getElementById('caption').innerHTML = s.text;
    document.getElementById('state').textContent = JSON.stringify({ likes: s.likes });
  }

  document.getElementById('next').onclick = () => {
    i = (i + 1) % steps.length;
    show();
  };
  document.getElementById('back').onclick = () => {
    i = (i - 1 + steps.length) % steps.length;
    show();
  };
  document.getElementById('play').onclick = e => {
    if (timer) {
      clearInterval(timer);
      timer = null;
      e.target.textContent = 'Auto play';
      return;
    }
    e.target.textContent = 'Stop';
    timer = setInterval(() => document.getElementById('next').click(), 1400);
  };

  show();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'In the tangled example, why does the badge end at 0 while the thread says 1?',
        options: [
          'JSON.stringify rounds numbers down',
          'Two listeners write the badge; the "quick fix" runs last and decrements the value the mirror just set',
          'The view renders before the model changes',
          'Observables always lose the last update',
        ],
        answer: 1,
        why: 'Listener ② sets the badge to 1, then listener ③ (registered later on messages) does 1 - 1 = 0. The final value depends on listener order.',
      },
      {
        q: 'In unidirectional data flow, how does a view cause a state change?',
        options: [
          'It writes directly to the state object inside the store',
          'It updates a sibling view, which updates the store',
          'It dispatches an action that describes what happened',
          'It uses a two-way binding to the store',
        ],
        answer: 2,
        why: 'Views only send actions (plain objects like { type: "MESSAGE_READ", id: 1 }). Only the store code decides the new state.',
      },
      {
        q: 'Why is the unread count in the one-way version computed with <code>unreadCount(state)</code> instead of stored?',
        options: [
          'Computing is faster than reading a property',
          'So the same fact is not stored twice and cannot get out of sync',
          'Because stores are not allowed to hold numbers',
          'Because the dispatcher deletes derived values',
        ],
        answer: 1,
        why: 'Derived data computed from a single source of truth can never disagree with it. Storing it twice is what let the badge and thread disagree.',
      },
      {
        q: 'Which is a real cost of one-way data flow?',
        options: [
          'It makes bugs impossible to reproduce',
          'Views can no longer render lists',
          'More code and indirection (action types, dispatcher, store) for simple things',
          'It forbids using observers anywhere',
        ],
        answer: 2,
        why: 'The trade-off is extra ceremony. It pays off for shared state; for tiny local UI state it can be overkill.',
      },
    ],
    exercise: {
      task: `
        <p>Here is a counter app written in the "tangled" style: two buttons write into two
        separate variables and the view is patched by hand. Rewrite it with one-way flow:</p>
        <ul>
          <li>Keep one <code>state</code> object: <code>{ count: 0 }</code>.</li>
          <li>Write <code>update(state, action)</code> handling <code>'INCREMENT'</code>,
          <code>'DECREMENT'</code> and <code>'RESET'</code>. Return a <strong>new</strong>
          object.</li>
          <li>Write <code>dispatch(action)</code> that logs
          <code>[Dispatcher] action …</code>, updates <code>state</code>, then calls
          <code>render()</code>.</li>
          <li>The buttons must only call <code>dispatch</code>. The label "Is even?" must be
          <strong>computed</strong> from <code>count</code>, not stored.</li>
        </ul>
      `,
      starter: `// ===== TANGLED VERSION (rewrite me) =====
let count = 0;
let isEven = true; // a second copy of a fact, kept in sync by hand

const root = document.getElementById('root');
root.innerHTML = \`
  <p>Count: <b id="c">0</b> · Is even? <b id="e">yes</b></p>
  <button id="inc">+1</button>
  <button id="dec">-1</button>
  <button id="reset">Reset</button>\`;

root.querySelector('#inc').onclick = () => {
  count++;
  isEven = !isEven;
  root.querySelector('#c').textContent = count;
  root.querySelector('#e').textContent = isEven ? 'yes' : 'no';
};
root.querySelector('#dec').onclick = () => {
  count--;
  root.querySelector('#c').textContent = count; // oops: forgot to update isEven
};
root.querySelector('#reset').onclick = () => {
  count = 0;
  root.querySelector('#c').textContent = count; // oops again
};

// TODO: replace all of the above with state + update + dispatch + render
`,
      hint: 'Start with let state = { count: 0 }. update() is a switch on action.type that returns { count: … }. render() reads state.count and computes state.count % 2 === 0 for the label.',
      solution: `// ===== STORE =====
let state = { count: 0 };

function update(s, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { count: s.count + 1 };
    case 'DECREMENT':
      return { count: s.count - 1 };
    case 'RESET':
      return { count: 0 };
    default:
      return s;
  }
}

// ===== DISPATCHER =====
function dispatch(action) {
  console.log('[Dispatcher] action', JSON.stringify(action));
  state = update(state, action);
  render();
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>Count: <b id="c"></b> · Is even? <b id="e"></b></p>
  <button id="inc">+1</button>
  <button id="dec">-1</button>
  <button id="reset">Reset</button>\`;

function render() {
  const isEven = state.count % 2 === 0; // derived, never stored
  console.log(\`[View] render count=\${state.count} even=\${isEven}\`);
  root.querySelector('#c').textContent = state.count;
  root.querySelector('#e').textContent = isEven ? 'yes' : 'no';
}

root.querySelector('#inc').onclick = () => dispatch({ type: 'INCREMENT' });
root.querySelector('#dec').onclick = () => dispatch({ type: 'DECREMENT' });
root.querySelector('#reset').onclick = () => dispatch({ type: 'RESET' });

render();`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'flux',
    section: 'Unidirectional data flow',
    title: 'Flux: actions, dispatcher, stores',
    explain: `
      <p><strong>Flux</strong> is the architecture Facebook described in 2014 to escape the
      cascading-update problem. It is less a library and more a set of rules with four
      parts:</p>
      <ul>
        <li><strong>Action</strong>: a plain object describing <em>what happened</em>, with a
        <code>type</code>: <code>{ type: 'ADD_TODO', text: 'Milk' }</code>. Small helper
        functions that build and send actions are called <strong>action creators</strong>.</li>
        <li><strong>Dispatcher</strong>: <em>one</em> central hub. Stores register a callback
        with it. <code>dispatch(action)</code> calls <strong>every</strong> registered callback
        with the action. It refuses to start a new dispatch while one is still running.</li>
        <li><strong>Store</strong>: holds some state and the logic to update it. A store has
        getters but <strong>no public setters</strong>. The only way to change it is to
        dispatch an action. After changing, it emits a "change" event.</li>
        <li><strong>View</strong> (often a "controller-view"): subscribes to stores, reads
        their state when they change, re-renders, and turns user input into actions.</li>
      </ul>
      <pre><code>View ──(action creator)──► Dispatcher ──► every Store ──(change)──► View</code></pre>

      <h3>Why every store gets every action</h3>
      <p>The dispatcher is like a <strong>radio broadcast</strong>. It does not know which
      store cares about <code>ADD_TODO</code>. Every store listens and decides for itself
      (usually with a <code>switch</code> on <code>action.type</code>). That keeps the
      dispatcher dumb and the logic inside the stores.</p>

      <h3><code>waitFor</code>: ordering between stores</h3>
      <p>Sometimes store B needs store A's <em>new</em> state. For example a stats store
      counts finished todos, so it must run after the todo store. Instead of relying on
      registration order, B calls <code>dispatcher.waitFor([A.token])</code> inside its
      callback. The dispatcher runs A's callback right then (if it has not run yet), and
      then B continues with A's fresh data. Dependencies are explicit in the code.</p>

      <h3>No cascades allowed</h3>
      <p>The rule "no dispatch in the middle of a dispatch" is what kills cascading updates.
      A store cannot react to an action by firing another action. Each action is processed
      fully, all stores settle, views re-render, and only then can the next action start.</p>

      <div class="tip">Compare with MVC from earlier: the store is a bit like a Model, but a
      view (or controller) can't call <code>store.setTitle()</code>. It can only
      <em>ask</em> by dispatching. That single entry point is what makes changes
      traceable.</div>
      <div class="warn">Facebook's original <code>flux</code> npm package is no longer
      actively developed (its repository has been archived). Most apps that want this style
      today use Redux or a similar library. Flux still matters because it introduced the ideas
      those libraries build on.</div>
    `,
    examples: [
      {
        title: 'A Flux todo app from scratch (with waitFor)',
        code: `// ===== DISPATCHER: one hub, every action goes to every store =====
class Dispatcher {
  constructor() {
    this.callbacks = {};
    this.nextId = 1;
    this.isDispatching = false;
  }

  register(callback) {
    const id = 'ID_' + this.nextId++;
    this.callbacks[id] = callback;
    return id; // the store's "token", used by waitFor
  }

  dispatch(action) {
    if (this.isDispatching) {
      throw new Error('Cannot dispatch in the middle of a dispatch');
    }
    console.log('[Dispatcher] dispatch', JSON.stringify(action));
    this.isDispatching = true;
    this.action = action;
    this.handled = {};
    this.pending = {};
    try {
      for (const id in this.callbacks) {
        if (!this.handled[id]) this.invoke(id); // skip stores already run by waitFor
      }
    } finally {
      this.isDispatching = false;
    }
  }

  waitFor(ids) {
    ids.forEach(id => {
      if (this.handled[id]) return;
      if (this.pending[id]) throw new Error('Circular waitFor on ' + id);
      console.log('[Dispatcher] waitFor', id, '→ run it first');
      this.invoke(id);
    });
  }

  invoke(id) {
    this.pending[id] = true;
    this.callbacks[id](this.action);
    this.handled[id] = true;
  }
}
const dispatcher = new Dispatcher();

// ===== STORE base: holds state, emits "change" (no public setters!) =====
class Store {
  constructor(name) {
    this.name = name;
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  emitChange() {
    console.log(\`[Store] \${this.name} emits change\`);
    this.listeners.forEach(fn => fn());
  }
}

// ===== STATS STORE: registered FIRST, but depends on TodoStore =====
const statsStore = new Store('StatsStore');
statsStore.done = 0;
statsStore.token = dispatcher.register(action => {
  console.log('[Store] StatsStore got', action.type);
  if (action.type === 'ADD_TODO' || action.type === 'TOGGLE_TODO') {
    dispatcher.waitFor([todoStore.token]); // make sure the todos are updated first
    statsStore.done = todoStore.getAll().filter(t => t.done).length;
    statsStore.emitChange();
  }
});

// ===== TODO STORE =====
const todoStore = new Store('TodoStore');
let todos = [];
let nextTodoId = 1;
todoStore.getAll = () => todos;
todoStore.token = dispatcher.register(action => {
  console.log('[Store] TodoStore got', action.type);
  switch (action.type) {
    case 'ADD_TODO':
      todos = [...todos, { id: nextTodoId++, text: action.text, done: false }];
      todoStore.emitChange();
      break;
    case 'TOGGLE_TODO':
      todos = todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
      todoStore.emitChange();
      break;
  }
});

// ===== ACTION CREATORS: the only way the UI talks to the app =====
const TodoActions = {
  add: text => dispatcher.dispatch({ type: 'ADD_TODO', text }),
  toggle: id => dispatcher.dispatch({ type: 'TOGGLE_TODO', id }),
};

// ===== VIEWS: read from stores, send actions =====
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="txt" placeholder="New todo">
  <button id="add">Add</button>
  <ul id="list"></ul>
  <p id="stats"></p>\`;
const list = root.querySelector('#list');
const stats = root.querySelector('#stats');

function renderList() {
  console.log('[View] TodoList render', todoStore.getAll().length, 'item(s)');
  list.innerHTML = '';
  todoStore.getAll().forEach(t => {
    const li = document.createElement('li');
    li.textContent = (t.done ? '✅ ' : '⬜ ') + t.text;
    li.style.cursor = 'pointer';
    li.onclick = () => TodoActions.toggle(t.id); // view → action
    list.append(li);
  });
}

function renderStats() {
  console.log('[View] Stats render done =', statsStore.done);
  stats.textContent = \`\${statsStore.done} of \${todoStore.getAll().length} done\`;
}

todoStore.subscribe(renderList);
statsStore.subscribe(renderStats);

root.querySelector('#add').onclick = () => {
  const input = root.querySelector('#txt');
  TodoActions.add(input.value.trim() || 'Untitled');
  input.value = '';
};

renderList();
renderStats();
TodoActions.add('Learn Flux'); // one action on startup so you can read the log`,
        explain: `
          <details>
            <summary>The problem <code>waitFor</code> solves</summary>
            <p><code>StatsStore</code> is registered <strong>first</strong>, so the dispatcher
            calls it first. But it needs the <em>new</em> todo list to count finished items. If
            it simply read <code>todoStore.getAll()</code> right away, it would see the
            <strong>old</strong> list, because <code>TodoStore</code> has not handled the action
            yet. Its count would always be one action behind.</p>
            <p>In the tangled example in the previous lesson, this kind of ordering was an
            accident of wiring. Here the dependency is written down: <code>StatsStore</code>
            says "wait for <code>TodoStore</code>".</p>
          </details>
          <details>
            <summary>Step by step: the startup log (<code>TodoActions.add('Learn Flux')</code>)</summary>
            <table>
              <tr><th>#</th><th>Console</th><th>What is going on</th></tr>
              <tr><td>1</td><td><code>[View] TodoList render 0 item(s)</code></td>
                <td>first manual render</td></tr>
              <tr><td>2</td><td><code>[View] Stats render done = 0</code></td>
                <td>first manual render</td></tr>
              <tr><td>3</td>
                <td><code>[Dispatcher] dispatch {"type":"ADD_TODO","text":"Learn Flux"}</code></td>
                <td>the action creator calls <code>dispatch</code></td></tr>
              <tr><td>4</td><td><code>[Store] StatsStore got ADD_TODO</code></td>
                <td><code>ID_1</code> runs first (registration order)</td></tr>
              <tr><td>5</td><td><code>[Dispatcher] waitFor ID_2 → run it first</code></td>
                <td>StatsStore pauses and asks for TodoStore</td></tr>
              <tr><td>6</td><td><code>[Store] TodoStore got ADD_TODO</code></td>
                <td>TodoStore's callback runs <em>inside</em> <code>waitFor</code></td></tr>
              <tr><td>7</td><td><code>[Store] TodoStore emits change</code></td>
                <td>todos now has 1 item</td></tr>
              <tr><td>8</td><td><code>[View] TodoList render 1 item(s)</code></td>
                <td>the list view re-reads the store</td></tr>
              <tr><td>9</td><td><code>[Store] StatsStore emits change</code></td>
                <td>back in StatsStore: it counted 0 done of the <em>new</em> list</td></tr>
              <tr><td>10</td><td><code>[View] Stats render done = 0</code></td>
                <td>screen: "0 of 1 done"</td></tr>
            </table>
            <p>After StatsStore returns, the dispatcher's loop reaches <code>ID_2</code>, sees
            it is already in <code>handled</code>, and skips it. So TodoStore ran exactly
            once.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>if (this.isDispatching) throw …          // ① one action at a time
for (const id in this.callbacks) {
  if (!this.handled[id]) this.invoke(id);  // ② broadcast, skip ones already run
}
dispatcher.waitFor([todoStore.token]);     // ③ "run TodoStore now, then continue"
if (this.pending[id]) throw …              // ④ A waits for B waits for A → error</code></pre>
            <ol>
              <li><strong>①</strong> A store (or a view during render) can't start a new
              dispatch while one is running. That makes cascades impossible.</li>
              <li><strong>②</strong> Every store sees every action. The
              <code>handled</code> map prevents running a store twice when
              <code>waitFor</code> already ran it.</li>
              <li><strong>③</strong> The token returned by <code>register</code> names the
              store to wait for.</li>
              <li><strong>④</strong> <code>pending</code> means "started but not finished". If
              we are asked to wait for a store that is still pending, the dependencies form a
              circle.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click the "Learn Flux" item. You get <code>TOGGLE_TODO</code> with the same
              waitFor dance, ending in <code>[View] Stats render done = 1</code>.</li>
              <li>Comment out the <code>waitFor</code> line and Run. Toggle the item: the stats
              lag one action behind ("0 of 1 done" while it shows ✅).</li>
              <li>Inside TodoStore's <code>ADD_TODO</code> case, add
              <code>TodoActions.toggle(1);</code>. Run: you get the error
              <code>Cannot dispatch in the middle of a dispatch</code>. Flux refuses the
              cascade.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In Flux, which stores receive an action when you call <code>dispatcher.dispatch(action)</code>?',
        options: [
          'Only the store whose name matches action.type',
          'Every registered store',
          'Only the store that the view is subscribed to',
          'The first store that returns true',
        ],
        answer: 1,
        why: 'The dispatcher broadcasts every action to every registered callback. Each store decides whether to react, usually with a switch on action.type.',
      },
      {
        q: 'What does <code>dispatcher.waitFor([todoStore.token])</code> do inside StatsStore’s callback?',
        options: [
          'Schedules StatsStore to run on the next action',
          'Waits for a network request to finish',
          'Runs TodoStore’s callback for the current action now (if not already run), then continues',
          'Dispatches a new action to TodoStore',
        ],
        answer: 2,
        why: 'waitFor is synchronous: it invokes the listed stores’ callbacks for the same action first, so the caller can read their updated state.',
      },
      {
        q: 'A store handles <code>ADD_TODO</code> and immediately calls <code>dispatcher.dispatch({ type: \'SAVE\' })</code>. What happens?',
        options: [
          'SAVE runs after ADD_TODO finishes',
          'SAVE is silently ignored',
          'An error: cannot dispatch in the middle of a dispatch',
          'ADD_TODO is cancelled and SAVE runs instead',
        ],
        answer: 2,
        why: 'Flux forbids nested dispatches. That rule is what prevents cascading updates.',
      },
      {
        q: 'How should a Flux view change the todo list?',
        options: [
          'Assign todoStore.todos = newList',
          'Call an action creator, which dispatches an action',
          'Call todoStore.emitChange() with the new list',
          'Edit the list DOM and let the store read it',
        ],
        answer: 1,
        why: 'Stores have no public setters. Views describe what happened with actions; stores decide how state changes.',
      },
    ],
    exercise: {
      task: `
        <p>Add a <strong>Clear done</strong> button to the Flux todo app.</p>
        <ul>
          <li>Add an action creator <code>clearDone()</code> that dispatches
          <code>{ type: 'CLEAR_DONE' }</code>.</li>
          <li>TodoStore: on <code>CLEAR_DONE</code>, keep only todos that are not done, then
          emit change.</li>
          <li>StatsStore: also recompute on <code>CLEAR_DONE</code> (using
          <code>waitFor</code>).</li>
          <li>Wire the button's click to <code>TodoActions.clearDone()</code>. Toggle one
          item, click Clear done, and check the stats say "0 of N done".</li>
        </ul>
      `,
      starter: `// ===== DISPATCHER (complete, no changes needed) =====
class Dispatcher {
  constructor() {
    this.callbacks = {};
    this.nextId = 1;
    this.isDispatching = false;
  }
  register(callback) {
    const id = 'ID_' + this.nextId++;
    this.callbacks[id] = callback;
    return id;
  }
  dispatch(action) {
    if (this.isDispatching) throw new Error('Cannot dispatch in the middle of a dispatch');
    console.log('[Dispatcher] dispatch', JSON.stringify(action));
    this.isDispatching = true;
    this.action = action;
    this.handled = {};
    try {
      for (const id in this.callbacks) {
        if (!this.handled[id]) this.invoke(id);
      }
    } finally {
      this.isDispatching = false;
    }
  }
  waitFor(ids) {
    ids.forEach(id => {
      if (!this.handled[id]) this.invoke(id);
    });
  }
  invoke(id) {
    this.callbacks[id](this.action);
    this.handled[id] = true;
  }
}
const dispatcher = new Dispatcher();

function makeStore(name) {
  const listeners = [];
  return {
    subscribe: fn => listeners.push(fn),
    emitChange() {
      console.log(\`[Store] \${name} emits change\`);
      listeners.forEach(fn => fn());
    },
  };
}

// ===== STATS STORE =====
const statsStore = makeStore('StatsStore');
statsStore.done = 0;
statsStore.token = dispatcher.register(action => {
  // TODO: also handle 'CLEAR_DONE'
  if (action.type === 'ADD_TODO' || action.type === 'TOGGLE_TODO') {
    dispatcher.waitFor([todoStore.token]);
    statsStore.done = todoStore.getAll().filter(t => t.done).length;
    statsStore.emitChange();
  }
});

// ===== TODO STORE =====
const todoStore = makeStore('TodoStore');
let todos = [];
let nextTodoId = 1;
todoStore.getAll = () => todos;
todoStore.token = dispatcher.register(action => {
  switch (action.type) {
    case 'ADD_TODO':
      todos = [...todos, { id: nextTodoId++, text: action.text, done: false }];
      todoStore.emitChange();
      break;
    case 'TOGGLE_TODO':
      todos = todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
      todoStore.emitChange();
      break;
    // TODO: case 'CLEAR_DONE'
  }
});

// ===== ACTION CREATORS =====
const TodoActions = {
  add: text => dispatcher.dispatch({ type: 'ADD_TODO', text }),
  toggle: id => dispatcher.dispatch({ type: 'TOGGLE_TODO', id }),
  // TODO: clearDone
};

// ===== VIEWS =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="clear">Clear done</button>
  <ul id="list"></ul>
  <p id="stats"></p>\`;

function renderList() {
  const list = root.querySelector('#list');
  list.innerHTML = '';
  todoStore.getAll().forEach(t => {
    const li = document.createElement('li');
    li.textContent = (t.done ? '✅ ' : '⬜ ') + t.text;
    li.style.cursor = 'pointer';
    li.onclick = () => TodoActions.toggle(t.id);
    list.append(li);
  });
}
function renderStats() {
  root.querySelector('#stats').textContent =
    \`\${statsStore.done} of \${todoStore.getAll().length} done\`;
}
todoStore.subscribe(renderList);
statsStore.subscribe(renderStats);

// TODO: wire #clear to TodoActions.clearDone()

['Buy milk', 'Walk dog', 'Read Flux docs'].forEach(TodoActions.add);`,
      hint: 'In TodoStore: case \'CLEAR_DONE\': todos = todos.filter(t => !t.done); todoStore.emitChange(); break;. In StatsStore, add action.type === \'CLEAR_DONE\' to the if condition.',
      solution: `// ===== DISPATCHER =====
class Dispatcher {
  constructor() {
    this.callbacks = {};
    this.nextId = 1;
    this.isDispatching = false;
  }
  register(callback) {
    const id = 'ID_' + this.nextId++;
    this.callbacks[id] = callback;
    return id;
  }
  dispatch(action) {
    if (this.isDispatching) throw new Error('Cannot dispatch in the middle of a dispatch');
    console.log('[Dispatcher] dispatch', JSON.stringify(action));
    this.isDispatching = true;
    this.action = action;
    this.handled = {};
    try {
      for (const id in this.callbacks) {
        if (!this.handled[id]) this.invoke(id);
      }
    } finally {
      this.isDispatching = false;
    }
  }
  waitFor(ids) {
    ids.forEach(id => {
      if (!this.handled[id]) this.invoke(id);
    });
  }
  invoke(id) {
    this.callbacks[id](this.action);
    this.handled[id] = true;
  }
}
const dispatcher = new Dispatcher();

function makeStore(name) {
  const listeners = [];
  return {
    subscribe: fn => listeners.push(fn),
    emitChange() {
      console.log(\`[Store] \${name} emits change\`);
      listeners.forEach(fn => fn());
    },
  };
}

// ===== STATS STORE =====
const statsStore = makeStore('StatsStore');
statsStore.done = 0;
statsStore.token = dispatcher.register(action => {
  const relevant = ['ADD_TODO', 'TOGGLE_TODO', 'CLEAR_DONE'];
  if (relevant.includes(action.type)) {
    dispatcher.waitFor([todoStore.token]);
    statsStore.done = todoStore.getAll().filter(t => t.done).length;
    statsStore.emitChange();
  }
});

// ===== TODO STORE =====
const todoStore = makeStore('TodoStore');
let todos = [];
let nextTodoId = 1;
todoStore.getAll = () => todos;
todoStore.token = dispatcher.register(action => {
  switch (action.type) {
    case 'ADD_TODO':
      todos = [...todos, { id: nextTodoId++, text: action.text, done: false }];
      todoStore.emitChange();
      break;
    case 'TOGGLE_TODO':
      todos = todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
      todoStore.emitChange();
      break;
    case 'CLEAR_DONE':
      todos = todos.filter(t => !t.done);
      todoStore.emitChange();
      break;
  }
});

// ===== ACTION CREATORS =====
const TodoActions = {
  add: text => dispatcher.dispatch({ type: 'ADD_TODO', text }),
  toggle: id => dispatcher.dispatch({ type: 'TOGGLE_TODO', id }),
  clearDone: () => dispatcher.dispatch({ type: 'CLEAR_DONE' }),
};

// ===== VIEWS =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="clear">Clear done</button>
  <ul id="list"></ul>
  <p id="stats"></p>\`;

function renderList() {
  const list = root.querySelector('#list');
  list.innerHTML = '';
  todoStore.getAll().forEach(t => {
    const li = document.createElement('li');
    li.textContent = (t.done ? '✅ ' : '⬜ ') + t.text;
    li.style.cursor = 'pointer';
    li.onclick = () => TodoActions.toggle(t.id);
    list.append(li);
  });
}
function renderStats() {
  root.querySelector('#stats').textContent =
    \`\${statsStore.done} of \${todoStore.getAll().length} done\`;
}
todoStore.subscribe(renderList);
statsStore.subscribe(renderStats);

root.querySelector('#clear').onclick = () => TodoActions.clearDone();

['Buy milk', 'Walk dog', 'Read Flux docs'].forEach(TodoActions.add);`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'redux',
    section: 'Unidirectional data flow',
    title: 'Redux: one store, pure reducers, immutable updates',
    explain: `
      <p><strong>Redux</strong> (Dan Abramov and Andrew Clark, 2015) took Flux and simplified
      it. Its docs credit two inspirations: Flux, and <strong>The Elm Architecture</strong>
      (a later lesson). Redux removes the dispatcher and the many stores, and replaces store
      logic with a plain function.</p>

      <h3>The three principles</h3>
      <ol>
        <li><strong>Single source of truth.</strong> The whole app state lives in
        <em>one</em> object tree inside <em>one</em> store.</li>
        <li><strong>State is read-only.</strong> The only way to change it is to dispatch an
        action (a plain object with a <code>type</code>).</li>
        <li><strong>Changes are made with pure functions.</strong> A <strong>reducer</strong>
        has the shape <code>(state, action) =&gt; newState</code>. It must not modify its
        arguments, call APIs, or use random values or the current time.</li>
      </ol>
      <p>The name comes from <code>Array.prototype.reduce</code>: if you replay a list of
      actions through the reducer, you get the current state.</p>
      <pre><code>const actions = [{ type: 'inc' }, { type: 'inc' }, { type: 'reset' }, { type: 'inc' }];
actions.reduce(reducer, undefined); // → the same state the store would have</code></pre>

      <h3>The store API is tiny</h3>
      <ul>
        <li><code>getState()</code>: returns the current state.</li>
        <li><code>dispatch(action)</code>: runs <code>state = reducer(state, action)</code>,
        then calls every subscriber.</li>
        <li><code>subscribe(listener)</code>: registers a callback, returns an
        <code>unsubscribe</code> function.</li>
      </ul>
      <p>In the first example you will build all of it in about 20 lines.</p>

      <h3>Immutable updates</h3>
      <p>A reducer returns a <strong>new</strong> object instead of editing the old one. This
      lets anybody check "did something change?" with a quick reference comparison
      <code>prev !== next</code>, instead of a deep comparison. UI bindings (like
      <code>react-redux</code>) rely on exactly that check. The second example shows what
      breaks when you mutate.</p>
      <pre><code>// ❌ mutation: same object, changed in place
state.todos.push(todo);
return state;

// ✅ immutable update: copy each level you change
return { ...state, todos: [...state.todos, todo] };</code></pre>

      <div class="tip">Compared with Flux: one store instead of many, reducers instead of
      store callbacks, and no <code>waitFor</code> (you split a big reducer into smaller ones
      with <code>combineReducers</code>, and each slice gets its own part of the state).</div>
      <div class="warn">You won't usually write Redux by hand today. The Redux team recommends
      <strong>Redux Toolkit</strong> (RTK). Its <code>createSlice</code> uses the Immer library
      so you can <em>write</em> code that looks like mutation while Immer produces a new
      immutable object for you. Learning the hand-written version first makes RTK much
      easier to understand.</div>
    `,
    examples: [
      {
        title: 'createStore from scratch',
        code: `// ===== createStore: the core of Redux in ~20 lines =====
function createStore(reducer) {
  let state;
  let listeners = [];

  function getState() {
    return state;
  }

  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(l => l !== fn); // unsubscribe
    };
  }

  function dispatch(action) {
    console.log('[Store] dispatch', JSON.stringify(action));
    state = reducer(state, action);
    console.log('[Store] new state', JSON.stringify(state));
    listeners.forEach(fn => fn());
    return action;
  }

  dispatch({ type: '@@INIT' }); // fills state with the reducer's default
  return { getState, dispatch, subscribe };
}

// ===== REDUCER: pure (state, action) => newState =====
const initialState = { count: 0, history: [] };

function counterReducer(state = initialState, action) {
  console.log('[Reducer]', action.type);
  switch (action.type) {
    case 'counter/incremented':
      return {
        ...state,
        count: state.count + action.by,
        history: [...state.history, '+' + action.by],
      };
    case 'counter/reset':
      return { ...state, count: 0, history: [...state.history, 'reset'] };
    default:
      return state; // unknown action: return the SAME state
  }
}

const store = createStore(counterReducer);

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <h2 id="count"></h2>
  <button id="inc1">+1</button>
  <button id="inc5">+5</button>
  <button id="reset">Reset</button>
  <p>History: <span id="hist"></span></p>\`;

function render() {
  const { count, history } = store.getState();
  console.log('[View] render count =', count);
  root.querySelector('#count').textContent = count;
  root.querySelector('#hist').textContent = history.join(', ') || '(none)';
}
store.subscribe(render);

root.querySelector('#inc1').onclick = () =>
  store.dispatch({ type: 'counter/incremented', by: 1 });
root.querySelector('#inc5').onclick = () =>
  store.dispatch({ type: 'counter/incremented', by: 5 });
root.querySelector('#reset').onclick = () => store.dispatch({ type: 'counter/reset' });

render();`,
        explain: `
          <details>
            <summary>Step by step: startup, then clicking <strong>+5</strong></summary>
            <table>
              <tr><th>#</th><th>Console</th><th>What is going on</th></tr>
              <tr><td>1</td><td><code>[Store] dispatch {"type":"@@INIT"}</code></td>
                <td><code>createStore</code> dispatches a dummy action. <code>state</code> is
                still <code>undefined</code>.</td></tr>
              <tr><td>2</td><td><code>[Reducer] @@INIT</code></td>
                <td><code>state = initialState</code> (the default parameter kicks in because
                state is undefined), then the <code>default:</code> branch returns it</td></tr>
              <tr><td>3</td><td><code>[Store] new state {"count":0,"history":[]}</code></td>
                <td>no subscribers yet, so nobody is notified</td></tr>
              <tr><td>4</td><td><code>[View] render count = 0</code></td>
                <td>the manual <code>render()</code> at the bottom</td></tr>
              <tr><td colspan="3"><em>click +5</em></td></tr>
              <tr><td>5</td>
                <td><code>[Store] dispatch {"type":"counter/incremented","by":5}</code></td>
                <td>the click handler describes what happened</td></tr>
              <tr><td>6</td><td><code>[Reducer] counter/incremented</code></td>
                <td>returns a <strong>new</strong> object, count 0 + 5</td></tr>
              <tr><td>7</td><td><code>[Store] new state {"count":5,"history":["+5"]}</code></td>
                <td>the store swaps in the new object</td></tr>
              <tr><td>8</td><td><code>[View] render count = 5</code></td>
                <td>the subscriber reads <code>getState()</code> and redraws</td></tr>
            </table>
            <p>Notice the order: the reducer finishes <strong>before</strong> any subscriber
            runs. A subscriber never sees a half-updated state.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>state = reducer(state, action);   // ① the ONLY line that changes state
listeners.forEach(fn =&gt; fn());     // ② then tell everyone
dispatch({ type: '@@INIT' });      // ③ get the initial state from the reducer
default: return state;             // ④ unknown action → same object</code></pre>
            <ol>
              <li><strong>①</strong> All state changes in the whole app pass through this one
              line. That's why logging, undo and time travel are easy in Redux.</li>
              <li><strong>②</strong> Subscribers get no arguments. They call
              <code>getState()</code> to read what they need.</li>
              <li><strong>③</strong> The real Redux dispatches a private init action with a
              random-looking type. Any reducer that doesn't recognise it returns its
              default.</li>
              <li><strong>④</strong> Returning the same object tells everybody "nothing
              changed". Returning a new object tells them "something changed".</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Reducers are plain functions, so you can call one directly. Add
              <code>console.log(counterReducer({ count: 1, history: [] }, { type: 'counter/reset' }))</code>
              at the end. Same input always gives the same output. That's what makes reducers
              easy to test.</li>
              <li>Keep the return value of <code>store.subscribe(render)</code> and call it after
              the first click (<code>const stop = store.subscribe(render)</code>, then
              <code>stop()</code> inside a handler). The store keeps changing, the screen
              doesn't.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The immutability pitfall: mutate and the view never updates',
        code: `// ===== createStore (same idea as before, quieter logs) =====
function createStore(reducer) {
  let state = reducer(undefined, { type: '@@INIT' });
  const listeners = [];
  return {
    getState: () => state,
    subscribe: fn => listeners.push(fn),
    dispatch(action) {
      console.log('[Store] dispatch', action.type);
      state = reducer(state, action);
      listeners.forEach(fn => fn());
    },
  };
}

// ===== REDUCER with a switch between a buggy and a correct toggle =====
let mutate = true; // controlled by the checkbox
let nextId = 3;
const initialState = {
  todos: [
    { id: 1, text: 'Learn Redux', done: false },
    { id: 2, text: 'Write a reducer', done: false },
  ],
};

function todosReducer(state = initialState, action) {
  switch (action.type) {
    case 'todos/toggled':
      if (mutate) {
        console.log('[Reducer] MUTATING todo', action.id);
        const todo = state.todos.find(t => t.id === action.id);
        todo.done = !todo.done; // ❌ edits the existing object in place
        return state; // ❌ same reference as before
      }
      console.log('[Reducer] copying todo', action.id);
      return {
        ...state,
        todos: state.todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t)),
      };
    case 'todos/added':
      console.log('[Reducer] adding todo', nextId);
      return {
        ...state,
        todos: [...state.todos, { id: nextId++, text: action.text, done: false }],
      };
    default:
      return state;
  }
}

const store = createStore(todosReducer);

// ===== CONNECTED VIEW: re-render only if the state reference changed =====
// (this is the same check react-redux / useSelector does)
const root = document.getElementById('root');
root.innerHTML = \`
  <label><input type="checkbox" id="mut" checked> buggy reducer (mutates)</label>
  <ul id="list"></ul>
  <button id="add">Add todo</button>
  <button id="peek">Peek at real state</button>\`;

function render(state) {
  const list = root.querySelector('#list');
  list.innerHTML = '';
  state.todos.forEach(t => {
    const li = document.createElement('li');
    li.textContent = (t.done ? '✅ ' : '⬜ ') + t.text;
    li.style.cursor = 'pointer';
    li.onclick = () => store.dispatch({ type: 'todos/toggled', id: t.id });
    list.append(li);
  });
}

let prev = store.getState();
store.subscribe(() => {
  const next = store.getState();
  if (next === prev) {
    console.log('[View] same reference → skip render');
    return;
  }
  console.log('[View] new reference → render');
  prev = next;
  render(next);
});

root.querySelector('#mut').onchange = e => {
  mutate = e.target.checked;
};
root.querySelector('#add').onclick = () =>
  store.dispatch({ type: 'todos/added', text: 'Todo #' + nextId });
root.querySelector('#peek').onclick = () => {
  const flags = store.getState().todos.map(t => \`\${t.id}:\${t.done}\`);
  console.log('[Debug] real state done flags', flags.join(' '));
};

render(prev);`,
        explain: `
          <details>
            <summary>The problem: the state changed, but nobody noticed</summary>
            <p>With the checkbox <strong>checked</strong> (buggy reducer), click
            <em>Learn Redux</em>, then <em>Peek</em>, then <em>Add todo</em>:</p>
            <table>
              <tr><th>Step</th><th>Console</th><th>Screen shows</th></tr>
              <tr><td>click "Learn Redux"</td>
                <td><code>[Store] dispatch todos/toggled</code><br>
                <code>[Reducer] MUTATING todo 1</code><br>
                <code>[View] same reference → skip render</code></td>
                <td>⬜ Learn Redux ❌ (no change)</td></tr>
              <tr><td>click "Peek"</td>
                <td><code>[Debug] real state done flags 1:true 2:false</code></td>
                <td>still ⬜: the data says done, the screen says not done</td></tr>
              <tr><td>click "Add todo"</td>
                <td><code>[Store] dispatch todos/added</code><br>
                <code>[Reducer] adding todo 3</code><br>
                <code>[View] new reference → render</code></td>
                <td>✅ Learn Redux appears <em>now</em>, plus Todo #3</td></tr>
            </table>
            <p>The mutating reducer changed <code>todo.done</code> inside the <strong>same</strong>
            state object and returned that object. The view compares <code>next === prev</code>:
            same reference, so it assumes nothing changed and skips the render. The change only
            shows up later, when an <em>unrelated</em> correct action creates a new object. Bugs
            like "the UI updates one click late" or "it updates when I click something else"
            are the classic symptom.</p>
            <p>There is a second, sneakier problem: <code>prev</code> and <code>next</code> are
            the same object, so the "previous state" was destroyed too. Undo and time-travel
            debugging have nothing to go back to.</p>
          </details>
          <details>
            <summary>The fix: copy every level on the path to the change</summary>
            <pre><code>return {
  ...state,                              // ① new outer object
  todos: state.todos.map(t =&gt;            // ② new array
    t.id === action.id
      ? { ...t, done: !t.done }          // ③ new object for the changed todo
      : t                                // ④ unchanged todos are reused as-is
  ),
};</code></pre>
            <ol>
              <li><strong>①</strong> The root reference changes, so <code>next !== prev</code>
              and subscribers know to re-render.</li>
              <li><strong>②</strong> <code>map</code> returns a new array, so code that watches
              only <code>state.todos</code> also sees a change.</li>
              <li><strong>③</strong> Only the toggled todo gets a new object.</li>
              <li><strong>④</strong> The other todos keep their old reference, so a list item
              component could skip re-rendering them. This is called
              <strong>structural sharing</strong>.</li>
            </ol>
            <p>Uncheck the checkbox and click a todo:</p>
            <table>
              <tr><th>Console</th><th>Screen</th></tr>
              <tr><td><code>[Store] dispatch todos/toggled</code><br>
                <code>[Reducer] copying todo 1</code><br>
                <code>[View] new reference → render</code></td>
                <td>the checkmark flips immediately ✅</td></tr>
            </table>
          </details>
          <details>
            <summary>Common mistake: "but I used <code>const</code>!"</summary>
            <div class="warn"><code>const</code> only stops you from re-assigning the
            <em>variable</em>. <code>const todo = …; todo.done = true</code> is allowed and still
            mutates. The same goes for <code>push</code>, <code>splice</code>,
            <code>sort</code> and <code>reverse</code> on arrays in state: they change the array
            in place. Use <code>[...arr, x]</code>, <code>filter</code>, <code>map</code>, or
            <code>[...arr].sort()</code> instead.</div>
            <div class="tip">In development, you can catch mutations by freezing state:
            <code>Object.freeze</code> makes writes fail (they throw in strict mode, which ES
            modules always use). Redux Toolkit's <code>configureStore</code> adds a similar check
            for you in development.</div>
          </details>
        `,
      },
      {
        title: 'Today: Redux Toolkit (read-only)',
        runnable: false,
        code: `// Needs the @reduxjs/toolkit package, so this is read-only here.
import { createSlice, configureStore } from '@reduxjs/toolkit';

const todosSlice = createSlice({
  name: 'todos',
  initialState: [],
  reducers: {
    // Looks like mutation, but Immer records the changes
    // and produces a brand-new immutable state for you.
    todoAdded(state, action) {
      state.push({ id: action.payload.id, text: action.payload.text, done: false });
    },
    todoToggled(state, action) {
      const todo = state.find(t => t.id === action.payload);
      todo.done = !todo.done;
    },
  },
});

// Action creators are generated from the reducer names:
export const { todoAdded, todoToggled } = todosSlice.actions;

export const store = configureStore({
  reducer: { todos: todosSlice.reducer },
});

store.dispatch(todoAdded({ id: 1, text: 'Learn RTK' }));
// dispatched: { type: 'todos/todoAdded', payload: { id: 1, text: 'Learn RTK' } }
store.dispatch(todoToggled(1));
console.log(store.getState().todos); // [{ id: 1, text: 'Learn RTK', done: true }]`,
      },
    ],
    quiz: [
      {
        q: 'Which of these is <strong>not</strong> one of Redux’s three principles?',
        options: [
          'Single source of truth',
          'State is read-only',
          'Changes are made with pure functions',
          'Every store must call waitFor',
        ],
        answer: 3,
        why: 'waitFor is a Flux dispatcher feature. Redux has one store and composes reducers instead.',
      },
      {
        q: 'In the from-scratch <code>createStore</code>, when does a subscriber run?',
        options: [
          'Before the reducer, so it can cancel the action',
          'After the reducer has returned the new state',
          'Only when the state is deeply different',
          'Only on @@INIT',
        ],
        answer: 1,
        why: 'dispatch runs state = reducer(state, action) first, then calls every listener. Listeners read the finished state with getState().',
      },
      {
        q: 'A reducer does <code>state.items.push(x); return state;</code>. What goes wrong with a view that re-renders only when <code>next !== prev</code>?',
        options: [
          'Nothing, push is fine in reducers',
          'The reducer throws an error',
          'The reference is the same, so the view skips re-rendering and shows stale data',
          'The view renders twice',
        ],
        answer: 2,
        why: 'Mutation keeps the same object reference. Reference checks say "no change", so the UI does not update until some later action produces a new object.',
      },
      {
        q: 'Which reducer line is a correct immutable update to add a todo?',
        options: [
          'state.todos = [...state.todos, todo]; return state;',
          'return { ...state, todos: [...state.todos, todo] };',
          'return Object.assign(state, { todos: state.todos.concat(todo) });',
          'const s = state; s.todos.push(todo); return s;',
        ],
        answer: 1,
        why: 'Only option B creates a new outer object and a new array. Object.assign(state, …) writes into the existing state object.',
      },
      {
        q: 'Why can Redux Toolkit’s <code>createSlice</code> reducers write <code>todo.done = true</code>?',
        options: [
          'Because RTK disables the immutability rule',
          'Because it uses Immer, which turns those "mutations" into a new immutable state',
          'Because slices store state in a database',
          'They can’t; that code throws',
        ],
        answer: 1,
        why: 'Immer gives the reducer a draft, records changes, and produces a new state object. The real state is never mutated.',
      },
    ],
    exercise: {
      task: `
        <p>Write a <strong>pure</strong> <code>todosReducer(state, action)</code> that never
        mutates. State is an array of <code>{ id, text, done }</code>. Handle:</p>
        <ul>
          <li><code>{ type: 'todos/added', id, text }</code>: append a new todo.</li>
          <li><code>{ type: 'todos/toggled', id }</code>: flip <code>done</code> of that todo.</li>
          <li><code>{ type: 'todos/removed', id }</code>: remove it.</li>
          <li>Anything else: return the same state.</li>
        </ul>
        <p>The tests freeze the input state, so any mutation throws. All tests should print
        <code>✓</code>.</p>
      `,
      starter: `function todosReducer(state = [], action) {
  switch (action.type) {
    // TODO: 'todos/added', 'todos/toggled', 'todos/removed'
    default:
      return state;
  }
}

// ===== TESTS (don't change) =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function deepFreeze(arr) {
  arr.forEach(Object.freeze);
  return Object.freeze(arr);
}

const start = deepFreeze([{ id: 1, text: 'A', done: false }]);

test('added: appends without mutating', () => {
  const next = todosReducer(start, { type: 'todos/added', id: 2, text: 'B' });
  assert(next !== start, 'must return a new array');
  assert(next.length === 2 && next[1].text === 'B', 'B should be appended');
  assert(start.length === 1, 'original must be unchanged');
});

test('toggled: new object for the changed todo only', () => {
  const two = deepFreeze([...start, { id: 2, text: 'B', done: false }]);
  const next = todosReducer(two, { type: 'todos/toggled', id: 1 });
  assert(next !== two, 'must return a new array');
  assert(next[0].done === true, 'todo 1 should be done');
  assert(next[0] !== two[0], 'changed todo must be a new object');
  assert(next[1] === two[1], 'unchanged todo should be reused');
});

test('removed: filters it out', () => {
  const next = todosReducer(start, { type: 'todos/removed', id: 1 });
  assert(next.length === 0, 'should be empty');
});

test('unknown action returns same reference', () => {
  assert(todosReducer(start, { type: 'nope' }) === start, 'should be ===');
});

const root = document.getElementById('root');
root.textContent = 'See the console for test results.';`,
      hint: 'added: return [...state, { id: action.id, text: action.text, done: false }]. toggled: state.map(t => t.id === action.id ? { ...t, done: !t.done } : t). removed: state.filter(t => t.id !== action.id).',
      solution: `function todosReducer(state = [], action) {
  switch (action.type) {
    case 'todos/added':
      return [...state, { id: action.id, text: action.text, done: false }];
    case 'todos/toggled':
      return state.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'todos/removed':
      return state.filter(t => t.id !== action.id);
    default:
      return state;
  }
}

// ===== TESTS (don't change) =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
function deepFreeze(arr) {
  arr.forEach(Object.freeze);
  return Object.freeze(arr);
}

const start = deepFreeze([{ id: 1, text: 'A', done: false }]);

test('added: appends without mutating', () => {
  const next = todosReducer(start, { type: 'todos/added', id: 2, text: 'B' });
  assert(next !== start, 'must return a new array');
  assert(next.length === 2 && next[1].text === 'B', 'B should be appended');
  assert(start.length === 1, 'original must be unchanged');
});

test('toggled: new object for the changed todo only', () => {
  const two = deepFreeze([...start, { id: 2, text: 'B', done: false }]);
  const next = todosReducer(two, { type: 'todos/toggled', id: 1 });
  assert(next !== two, 'must return a new array');
  assert(next[0].done === true, 'todo 1 should be done');
  assert(next[0] !== two[0], 'changed todo must be a new object');
  assert(next[1] === two[1], 'unchanged todo should be reused');
});

test('removed: filters it out', () => {
  const next = todosReducer(start, { type: 'todos/removed', id: 1 });
  assert(next.length === 0, 'should be empty');
});

test('unknown action returns same reference', () => {
  assert(todosReducer(start, { type: 'nope' }) === start, 'should be ===');
});

const root = document.getElementById('root');
root.textContent = 'See the console for test results.';`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'redux-side-effects',
    section: 'Unidirectional data flow',
    title: 'Side effects: middleware & thunks',
    explain: `
      <p>Reducers must be <strong>pure</strong>: no fetching, no timers, no
      <code>localStorage</code>. But real apps need all of those. So where does
      <code>fetch</code> go? Redux's answer is <strong>middleware</strong>: code that sits
      between <code>dispatch(action)</code> and the reducer.</p>
      <pre><code>dispatch(action) ──► middleware 1 ──► middleware 2 ──► reducer ──► subscribers</code></pre>
      <p><strong>Analogy:</strong> airport security lanes. Every passenger (action) walks
      through the same checkpoints in the same order. A checkpoint can look at the passenger
      and wave them on (<code>next(action)</code>), log them, stop them, or send someone else
      through instead.</p>

      <h3>The middleware signature</h3>
      <pre><code>const middleware = store =&gt; next =&gt; action =&gt; {
  // before the reducer
  const result = next(action); // pass it on to the next middleware (or the reducer)
  // after the reducer
  return result;
};</code></pre>
      <ul>
        <li><code>store</code> gives the middleware <code>getState</code> and
        <code>dispatch</code>.</li>
        <li><code>next</code> is "the rest of the chain". Calling it passes the action along.
        Not calling it swallows the action.</li>
        <li><code>action</code> is whatever was dispatched. With middleware, that doesn't
        even have to be a plain object.</li>
      </ul>
      <p>Three nested arrow functions look scary. They exist so each part can be supplied at a
      different time: the store once at setup, <code>next</code> once while the chain is
      built, and the action on every dispatch.</p>

      <h3>Thunks: dispatching a function</h3>
      <p>The <strong>thunk</strong> middleware is tiny: if the action is a function, call it
      with <code>(dispatch, getState)</code> instead of passing it to the reducer. That function
      can then do async work and dispatch <em>plain</em> actions as things happen:</p>
      <ul>
        <li><code>user/fetchPending</code>: started, show a spinner.</li>
        <li><code>user/fetchFulfilled</code>: data arrived.</li>
        <li><code>user/fetchRejected</code>: something failed, show the error.</li>
      </ul>
      <p>The reducer stays pure: it only turns these plain actions into state like
      <code>{ status: 'loading' }</code>. The messy async part lives in the thunk.</p>

      <div class="tip">In Redux Toolkit, <code>configureStore</code> adds the thunk middleware
      by default, and <code>createAsyncThunk</code> generates the pending / fulfilled /
      rejected actions for you. For data fetching specifically, RTK Query can remove most of
      this code. Other side-effect tools you may meet: RTK's listener middleware,
      redux-saga and redux-observable.</div>
      <div class="warn">Order matters. Thunk should come <em>before</em> a logger, so the logger
      only sees plain actions. If the logger came first, it would try to log a function.</div>
    `,
    examples: [
      {
        title: 'applyMiddleware-lite with a logger and a thunk',
        code: `// ===== createStore (from the previous lesson) =====
function createStore(reducer) {
  let state = reducer(undefined, { type: '@@INIT' });
  const listeners = [];
  return {
    getState: () => state,
    subscribe: fn => listeners.push(fn),
    dispatch(action) {
      state = reducer(state, action);
      listeners.forEach(fn => fn());
      return action;
    },
  };
}

// ===== applyMiddleware-lite: wrap dispatch in layers =====
function applyMiddleware(store, ...middlewares) {
  let dispatch = () => {
    throw new Error('Not ready: still building middleware');
  };
  // "dispatch" here always means the FULL chain, even for thunks
  const api = { getState: store.getState, dispatch: action => dispatch(action) };
  const layers = middlewares.map(mw => mw(api));
  // [thunk, logger] → thunk(logger(store.dispatch))
  dispatch = layers.reduceRight((next, layer) => layer(next), store.dispatch);
  return { ...store, dispatch };
}

// ===== MIDDLEWARE =====
const thunk = api => next => action => {
  if (typeof action === 'function') {
    console.log('[Thunk] got a function → calling it');
    return action(api.dispatch, api.getState);
  }
  return next(action); // plain object: pass it on
};

const logger = api => next => action => {
  console.log('[Logger] ▶', action.type, '| status before:', api.getState().status);
  const result = next(action);
  console.log('[Logger] ◀', action.type, '| status after:', api.getState().status);
  return result;
};

// ===== FAKE API (1 second, id 404 fails) =====
function fakeFetchUser(id) {
  console.log('[API] GET /users/' + id);
  return new Promise((resolve, reject) =>
    setTimeout(() => {
      if (id === 404) reject(new Error('User not found'));
      else resolve({ id, name: 'Ada Lovelace' });
    }, 1000)
  );
}

// ===== REDUCER: pure, only plain actions =====
const initialState = { status: 'idle', user: null, error: null };

function userReducer(state = initialState, action) {
  if (action.type !== '@@INIT') console.log('[Reducer]', action.type);
  switch (action.type) {
    case 'user/fetchPending':
      return { ...state, status: 'loading', error: null };
    case 'user/fetchFulfilled':
      return { ...state, status: 'succeeded', user: action.payload };
    case 'user/fetchRejected':
      return { ...state, status: 'failed', user: null, error: action.error };
    default:
      return state;
  }
}

// ===== THUNK ACTION CREATOR: the async logic lives here =====
const fetchUser = id => async (dispatch, getState) => {
  if (getState().status === 'loading') {
    console.log('[Thunk] already loading → skip');
    return;
  }
  dispatch({ type: 'user/fetchPending' });
  try {
    const user = await fakeFetchUser(id);
    dispatch({ type: 'user/fetchFulfilled', payload: user });
  } catch (err) {
    dispatch({ type: 'user/fetchRejected', error: err.message });
  }
};

const store = applyMiddleware(createStore(userReducer), thunk, logger);

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="ok">Load user 1</button>
  <button id="bad">Load user 404</button>
  <p id="out"></p>\`;

function render() {
  const { status, user, error } = store.getState();
  console.log('[View] render status =', status);
  const text = {
    idle: 'Click a button.',
    loading: '⏳ Loading…',
    succeeded: user && '👤 ' + user.name,
    failed: '⚠️ ' + error,
  }[status];
  root.querySelector('#out').textContent = text;
}
store.subscribe(render);

root.querySelector('#ok').onclick = () => store.dispatch(fetchUser(1));
root.querySelector('#bad').onclick = () => store.dispatch(fetchUser(404));

render();`,
        explain: `
          <details>
            <summary>How the chain is built</summary>
            <p><code>applyMiddleware(store, thunk, logger)</code> wraps from the inside out with
            <code>reduceRight</code>:</p>
            <pre><code>next0 = store.dispatch            // the real one: runs the reducer
next1 = logger(api)(next0)        // logger's "next" is the real dispatch
next2 = thunk(api)(next1)         // thunk's "next" is the logger
dispatch = next2                  // what the app calls</code></pre>
            <p>So every action enters <strong>thunk first</strong>, then the logger, then the
            reducer. <code>api.dispatch</code> is a small arrow that calls the <em>final</em>
            <code>dispatch</code>, so when a thunk dispatches, its actions go through the whole
            chain from the top again.</p>
          </details>
          <details>
            <summary>Step by step: clicking <strong>Load user 1</strong></summary>
            <table>
              <tr><th>Time</th><th>Console</th><th>Where we are</th></tr>
              <tr><td>0s</td><td><code>[Thunk] got a function → calling it</code></td>
                <td><code>fetchUser(1)</code> returned a function; thunk calls it instead
                of <code>next</code>. The logger never sees the function.</td></tr>
              <tr><td>0s</td><td><code>[Logger] ▶ user/fetchPending | status before: idle</code></td>
                <td>the thunk dispatched a plain action; it passed through thunk
                (not a function → <code>next</code>) into the logger</td></tr>
              <tr><td>0s</td><td><code>[Reducer] user/fetchPending</code></td>
                <td>the logger called <code>next</code>, the real store dispatch</td></tr>
              <tr><td>0s</td><td><code>[View] render status = loading</code></td>
                <td>subscribers run <em>inside</em> the store dispatch…</td></tr>
              <tr><td>0s</td><td><code>[Logger] ◀ user/fetchPending | status after: loading</code></td>
                <td>…so the logger's "after" line comes after the render</td></tr>
              <tr><td>0s</td><td><code>[API] GET /users/1</code></td>
                <td>back in the thunk: start the fake request, then <code>await</code></td></tr>
              <tr><td colspan="3"><em>1 second passes. Screen: ⏳ Loading…</em></td></tr>
              <tr><td>1s</td>
                <td><code>[Logger] ▶ user/fetchFulfilled | status before: loading</code></td>
                <td>the promise resolved; the thunk continues after <code>await</code></td></tr>
              <tr><td>1s</td><td><code>[Reducer] user/fetchFulfilled</code></td><td></td></tr>
              <tr><td>1s</td><td><code>[View] render status = succeeded</code></td>
                <td>screen: 👤 Ada Lovelace</td></tr>
              <tr><td>1s</td>
                <td><code>[Logger] ◀ user/fetchFulfilled | status after: succeeded</code></td>
                <td></td></tr>
            </table>
            <p>Clicking <strong>Load user 404</strong> gives the same first six lines, then
            <code>user/fetchRejected</code> and <code>[View] render status = failed</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>if (typeof action === 'function')              // ① thunk's whole trick
  return action(api.dispatch, api.getState);
return next(action);                            // ② everything else moves on
const result = next(action);                    // ③ logger: before / after
dispatch = layers.reduceRight(…, store.dispatch);  // ④ build the onion</code></pre>
            <ol>
              <li><strong>①</strong> Functions stop here. They get the full
              <code>dispatch</code>, so they can dispatch more (plain or function) actions
              later.</li>
              <li><strong>②</strong> A middleware that forgets <code>next(action)</code> blocks
              every action. Nothing reaches the reducer.</li>
              <li><strong>③</strong> Code before <code>next</code> runs before the reducer; code
              after runs after the reducer <em>and</em> all subscribers.</li>
              <li><strong>④</strong> <code>reduceRight</code> starts from the last middleware,
              so the first one in the list ends up outermost.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Double-click <strong>Load user 1</strong> quickly. The second click logs
              <code>[Thunk] already loading → skip</code>: the thunk read
              <code>getState()</code> to avoid a duplicate request.</li>
              <li>Swap the order to <code>applyMiddleware(createStore(userReducer), logger, thunk)</code>.
              Now the logger sees the function first and prints
              <code>[Logger] ▶ undefined</code> (a function has no <code>type</code>).</li>
              <li>Delete <code>return next(action);</code> from the thunk. Nothing works any
              more, because no plain action reaches the reducer.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why is <code>fetch</code> not called inside a reducer?',
        options: [
          'Reducers can’t access the network for security reasons',
          'Reducers must be pure: same input, same output, no side effects',
          'fetch only works inside middleware',
          'Reducers run on a server',
        ],
        answer: 1,
        why: 'A reducer should only compute new state from (state, action). Side effects make it unpredictable and impossible to replay.',
      },
      {
        q: 'With <code>applyMiddleware(store, thunk, logger)</code>, which middleware sees a dispatched action first?',
        options: ['logger', 'thunk', 'the reducer', 'they run in parallel'],
        answer: 1,
        why: 'reduceRight makes the first middleware in the list the outermost layer, so thunk runs first and logger second.',
      },
      {
        q: 'In the logger, why does <code>[View] render …</code> appear between the ▶ and ◀ lines?',
        options: [
          'Because the view runs in a separate thread',
          'Because next(action) runs the reducer and then calls subscribers before returning',
          'Because the logger calls render itself',
          'It’s random',
        ],
        answer: 1,
        why: 'next eventually reaches the store dispatch, which runs the reducer and notifies subscribers synchronously. Only then does control return to the logger.',
      },
      {
        q: 'What does the thunk middleware do with a plain object action?',
        options: [
          'Throws an error',
          'Calls it as a function',
          'Passes it on with next(action)',
          'Delays it by one tick',
        ],
        answer: 2,
        why: 'Thunk only intercepts functions. Plain objects pass through untouched.',
      },
    ],
    exercise: {
      task: `
        <p>The starter already has <code>createStore</code>, <code>applyMiddleware</code> and
        <code>thunk</code>. Add two things:</p>
        <ol>
          <li>A <code>limiter</code> middleware: if the action is
          <code>counter/incremented</code> and <code>getState().count</code> is already
          <code>5</code> or more, log <code>[Limiter] blocked</code> and pass
          <code>{ type: 'counter/blocked' }</code> to <code>next</code> <em>instead of</em> the
          original action (a middleware may replace actions). Otherwise pass the action on
          unchanged.</li>
          <li>A thunk action creator <code>incrementLater(ms)</code> that dispatches
          <code>{ type: 'counter/pending' }</code>, waits <code>ms</code> milliseconds, then
          dispatches <code>{ type: 'counter/incremented' }</code>.</li>
        </ol>
        <p>Wire the "+1 in 1s" button to <code>store.dispatch(incrementLater(1000))</code>.
        The counter should stop at 5 and the "pending" note should disappear.</p>
      `,
      starter: `function createStore(reducer) {
  let state = reducer(undefined, { type: '@@INIT' });
  const listeners = [];
  return {
    getState: () => state,
    subscribe: fn => listeners.push(fn),
    dispatch(action) {
      console.log('[Store] dispatch', action.type);
      state = reducer(state, action);
      listeners.forEach(fn => fn());
      return action;
    },
  };
}

function applyMiddleware(store, ...middlewares) {
  let dispatch = () => {
    throw new Error('Not ready');
  };
  const api = { getState: store.getState, dispatch: a => dispatch(a) };
  const layers = middlewares.map(mw => mw(api));
  dispatch = layers.reduceRight((next, layer) => layer(next), store.dispatch);
  return { ...store, dispatch };
}

const thunk = api => next => action =>
  typeof action === 'function' ? action(api.dispatch, api.getState) : next(action);

// TODO 1: const limiter = api => next => action => { ... };

function reducer(state = { count: 0, pending: 0 }, action) {
  switch (action.type) {
    case 'counter/pending':
      return { ...state, pending: state.pending + 1 };
    case 'counter/incremented':
      return { count: state.count + 1, pending: state.pending - 1 };
    case 'counter/blocked':
      return { ...state, pending: state.pending - 1 };
    default:
      return state;
  }
}

// TODO 2: const incrementLater = ms => async dispatch => { ... };

const store = applyMiddleware(createStore(reducer), thunk /* , limiter */);

const root = document.getElementById('root');
root.innerHTML = \`<h2 id="c"></h2><button id="later">+1 in 1s</button>\`;
function render() {
  const { count, pending } = store.getState();
  root.querySelector('#c').textContent = count + (pending ? \` (\${pending} pending)\` : '');
}
store.subscribe(render);
render();

// TODO 3: wire #later`,
      hint: 'limiter: if (action.type === \'counter/incremented\' && api.getState().count >= 5) { console.log(\'[Limiter] blocked\'); return next({ type: \'counter/blocked\' }); } return next(action);. incrementLater: dispatch pending, await new Promise(r => setTimeout(r, ms)), dispatch incremented.',
      solution: `function createStore(reducer) {
  let state = reducer(undefined, { type: '@@INIT' });
  const listeners = [];
  return {
    getState: () => state,
    subscribe: fn => listeners.push(fn),
    dispatch(action) {
      console.log('[Store] dispatch', action.type);
      state = reducer(state, action);
      listeners.forEach(fn => fn());
      return action;
    },
  };
}

function applyMiddleware(store, ...middlewares) {
  let dispatch = () => {
    throw new Error('Not ready');
  };
  const api = { getState: store.getState, dispatch: a => dispatch(a) };
  const layers = middlewares.map(mw => mw(api));
  dispatch = layers.reduceRight((next, layer) => layer(next), store.dispatch);
  return { ...store, dispatch };
}

const thunk = api => next => action =>
  typeof action === 'function' ? action(api.dispatch, api.getState) : next(action);

const limiter = api => next => action => {
  if (action.type === 'counter/incremented' && api.getState().count >= 5) {
    console.log('[Limiter] blocked');
    return next({ type: 'counter/blocked' });
  }
  return next(action);
};

function reducer(state = { count: 0, pending: 0 }, action) {
  switch (action.type) {
    case 'counter/pending':
      return { ...state, pending: state.pending + 1 };
    case 'counter/incremented':
      return { count: state.count + 1, pending: state.pending - 1 };
    case 'counter/blocked':
      return { ...state, pending: state.pending - 1 };
    default:
      return state;
  }
}

const incrementLater = ms => async dispatch => {
  dispatch({ type: 'counter/pending' });
  await new Promise(r => setTimeout(r, ms));
  dispatch({ type: 'counter/incremented' });
};

const store = applyMiddleware(createStore(reducer), thunk, limiter);

const root = document.getElementById('root');
root.innerHTML = \`<h2 id="c"></h2><button id="later">+1 in 1s</button>\`;
function render() {
  const { count, pending } = store.getState();
  root.querySelector('#c').textContent = count + (pending ? \` (\${pending} pending)\` : '');
}
store.subscribe(render);
render();

root.querySelector('#later').onclick = () => store.dispatch(incrementLater(1000));`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvi',
    section: 'Unidirectional data flow',
    title: 'MVI: Model-View-Intent',
    explain: `
      <p><strong>MVI</strong> comes from <strong>Cycle.js</strong>, a reactive framework by
      André Staltz (around 2015). Cycle.js treats an app as a loop of <em>streams</em>:
      the user's events flow in, the screen flows out, and the user reacts to the screen.
      MVI splits the app into three plain functions:</p>
      <ul>
        <li><strong>intent(events)</strong>: turns raw UI events (a click on
        <code>#inc</code>) into <strong>intents</strong>, i.e. what the user <em>means</em>
        (<code>{ type: 'Increment' }</code>). No state here.</li>
        <li><strong>model(intents)</strong>: folds the stream of intents into a stream of
        states. This is a reducer applied over time, often written with a stream operator
        called <code>scan</code>.</li>
        <li><strong>view(states)</strong>: turns each state into what's on screen.</li>
      </ul>
      <pre><code>view(model(intent(domEvents)))

DOM events ──► intent() ──► model() ──► view() ──► DOM ──► (the user) ──┐
    ▲                                                                   │
    └───────────────────────────────────────────────────────────────────┘</code></pre>

      <h3>How is this different from Redux?</h3>
      <p>The flow is the same idea (intent ≈ action, model ≈ reducer + store). The
      difference is the style: MVI is written as a pipeline of <strong>streams</strong>
      (Observables in Cycle.js, <code>Flow</code> in Kotlin) instead of a store object with
      <code>dispatch</code>. The word "Model" here means the <em>state-producing
      function</em>, not a class with setters like in MVC.</p>
      <p><strong>Analogy:</strong> a factory line. Raw material (clicks) enters station 1
      and becomes labelled parts (intents). Station 2 assembles them into the current
      product (state). Station 3 paints it (view). Nothing goes backwards on the belt.</p>

      <h3>MVI on Android</h3>
      <p>MVI became popular in Android development (libraries such as Mosby, and later Orbit
      and MVIKotlin, among others). A common modern shape with Kotlin coroutines:</p>
      <ul>
        <li>The screen state is <strong>one immutable <code>ViewState</code></strong> data
        class, exposed from a ViewModel as a <code>StateFlow</code>. The UI just renders the
        latest one.</li>
        <li>The UI sends intents (sometimes called actions or events) to the ViewModel.</li>
        <li><strong>One-off effects</strong> (show a toast, navigate, vibrate) are
        <em>not</em> put in the ViewState. They go through a separate channel (for example a
        Kotlin <code>Channel</code> or <code>SharedFlow</code>). If "show toast" lived in the
        state, it would show again every time the state was re-rendered (for example after a
        screen rotation).</li>
      </ul>
      <pre><code>// Kotlin (read-only sketch)
data class CounterState(val count: Int = 0, val step: Int = 1)

sealed interface CounterIntent {
  object Increment : CounterIntent
  data class SetStep(val step: Int) : CounterIntent
}

class CounterViewModel : ViewModel() {
  private val _state = MutableStateFlow(CounterState())
  val state: StateFlow&lt;CounterState&gt; = _state      // one ViewState stream

  private val _effects = Channel&lt;String&gt;()
  val effects = _effects.receiveAsFlow()             // one-off effects

  fun onIntent(intent: CounterIntent) {
    when (intent) {
      CounterIntent.Increment -&gt; _state.update { it.copy(count = it.count + it.step) }
      is CounterIntent.SetStep -&gt; _state.update { it.copy(step = intent.step) }
    }
  }
}</code></pre>
      <div class="tip">You don't need a stream library to understand MVI. In the example,
      a 20-line <code>stream()</code> helper with <code>map</code>, <code>filter</code>,
      <code>scan</code> and <code>merge</code> is enough. It is the Observer pattern from the
      Foundations section, with a few helpers for chaining.</div>
      <div class="warn">Keep <code>intent()</code> free of state and <code>view()</code> free
      of logic. If <code>view()</code> starts deciding things ("if count &gt; 10, reset"), you
      have moved business logic out of the model and lost the benefit.</div>
    `,
    examples: [
      {
        title: 'MVI counter with tiny streams and a one-off effect',
        code: `// ===== TINY STREAMS (Observer + chaining helpers) =====
function stream() {
  const subs = [];
  const s = {
    emit: v => subs.forEach(fn => fn(v)),
    subscribe: fn => subs.push(fn),
    map: f => {
      const out = stream();
      s.subscribe(v => out.emit(f(v)));
      return out;
    },
    filter: pred => {
      const out = stream();
      s.subscribe(v => pred(v) && out.emit(v));
      return out;
    },
    // scan = reduce over time: emits the new accumulated value on every input
    scan: (reducer, seed) => {
      const out = stream();
      out.value = seed;
      s.subscribe(v => {
        out.value = reducer(out.value, v);
        out.emit(out.value);
      });
      return out;
    },
  };
  return s;
}

function merge(...streams) {
  const out = stream();
  streams.forEach(s => s.subscribe(out.emit));
  return out;
}

function fromEvent(el, type) {
  const out = stream();
  el.addEventListener(type, out.emit);
  return out;
}

// ===== INTENT: raw DOM events → what the user means (no state!) =====
function intent(dom) {
  const inc$ = fromEvent(dom.inc, 'click').map(() => ({ type: 'Increment' }));
  const dec$ = fromEvent(dom.dec, 'click').map(() => ({ type: 'Decrement' }));
  const step$ = fromEvent(dom.step, 'change').map(e => ({
    type: 'SetStep',
    step: Number(e.target.value) || 1,
  }));
  const save$ = fromEvent(dom.save, 'click').map(() => ({ type: 'Save' }));

  const intent$ = merge(inc$, dec$, step$, save$);
  intent$.subscribe(i => console.log('[Intent]', JSON.stringify(i)));
  return intent$;
}

// ===== MODEL: fold intents into ONE immutable ViewState =====
const initialState = { count: 0, step: 1, saved: null };

function reduce(state, intent) {
  switch (intent.type) {
    case 'Increment':
      return { ...state, count: state.count + state.step };
    case 'Decrement':
      return { ...state, count: state.count - state.step };
    case 'SetStep':
      return { ...state, step: intent.step };
    case 'Save':
      return { ...state, saved: state.count };
    default:
      return state;
  }
}

function model(intent$) {
  const state$ = intent$.scan((state, i) => {
    const next = reduce(state, i);
    console.log('[Model] state', JSON.stringify(next));
    return next;
  }, initialState);

  // One-off effects: happen ONCE, are not part of the state
  const effect$ = intent$
    .filter(i => i.type === 'Save')
    .map(() => ({ type: 'ShowToast', text: 'Saved ' + state$.value.count }));

  return { state$, effect$ };
}

// ===== VIEW: ViewState → DOM, effects → one-time UI actions =====
function view(state$, effect$, dom) {
  function render(s) {
    console.log(\`[View] render count=\${s.count} step=\${s.step} saved=\${s.saved}\`);
    dom.out.textContent = s.count;
    dom.saved.textContent = s.saved === null ? 'never' : s.saved;
  }
  render(initialState);
  state$.subscribe(render);

  effect$.subscribe(e => {
    console.log('[View] effect', e.type, JSON.stringify(e.text));
    dom.toast.textContent = e.text;
    dom.toast.style.opacity = 1;
    setTimeout(() => (dom.toast.style.opacity = 0), 1500);
  });
}

// ===== WIRE THE CYCLE =====
const root = document.getElementById('root');
root.innerHTML = \`
  <h2 id="out"></h2>
  <button id="dec">−</button>
  <button id="inc">+</button>
  step <input id="step" type="number" value="1" style="width: 60px">
  <button id="save">Save</button>
  <p>Last saved: <b id="saved"></b></p>
  <div id="toast" style="opacity: 0; transition: opacity .3s; background: #1f2330;
    color: #fff; padding: 6px 10px; border-radius: 6px; display: inline-block"></div>\`;
const dom = {};
['out', 'dec', 'inc', 'step', 'save', 'saved', 'toast'].forEach(
  id => (dom[id] = root.querySelector('#' + id))
);

const intent$ = intent(dom);
const { state$, effect$ } = model(intent$);
view(state$, effect$, dom);`,
        explain: `
          <details>
            <summary>How the pieces are wired</summary>
            <p>Each helper creates a new stream and subscribes it to the previous one, so
            <code>fromEvent(…).map(…)</code> is a small chain of observers. The whole app is
            three function calls at the bottom:</p>
            <pre><code>const intent$ = intent(dom);                 // ① clicks → intents
const { state$, effect$ } = model(intent$);  // ② intents → states (+ effects)
view(state$, effect$, dom);                  // ③ states → DOM</code></pre>
            <ol>
              <li><strong>①</strong> <code>intent$</code> gets three subscribers, in this order:
              the <code>[Intent]</code> logger, the <code>scan</code> in the model, and the
              <code>filter</code> for effects.</li>
              <li><strong>②</strong> <code>scan</code> keeps the latest state in
              <code>state$.value</code>, runs <code>reduce</code> for each intent and emits the
              new state.</li>
              <li><strong>③</strong> <code>view</code> renders once with the initial state, then
              on every new state. Effects get a separate subscriber.</li>
            </ol>
            <p>The <code>$</code> at the end of a name (<code>intent$</code>) is a common
            convention meaning "this is a stream".</p>
          </details>
          <details>
            <summary>Step by step: click <strong>+</strong> twice, then <strong>Save</strong></summary>
            <table>
              <tr><th>Event</th><th>Console</th><th>Screen</th></tr>
              <tr><td>startup</td>
                <td><code>[View] render count=0 step=1 saved=null</code></td>
                <td>0, Last saved: never</td></tr>
              <tr><td>click +</td>
                <td><code>[Intent] {"type":"Increment"}</code><br>
                <code>[Model] state {"count":1,"step":1,"saved":null}</code><br>
                <code>[View] render count=1 step=1 saved=null</code></td><td>1</td></tr>
              <tr><td>click +</td>
                <td><code>[Intent] {"type":"Increment"}</code><br>
                <code>[Model] state {"count":2,"step":1,"saved":null}</code><br>
                <code>[View] render count=2 step=1 saved=null</code></td><td>2</td></tr>
              <tr><td>click Save</td>
                <td><code>[Intent] {"type":"Save"}</code><br>
                <code>[Model] state {"count":2,"step":1,"saved":2}</code><br>
                <code>[View] render count=2 step=1 saved=2</code><br>
                <code>[View] effect ShowToast "Saved 2"</code></td>
                <td>Last saved: 2, and a toast "Saved 2" fades out after 1.5s</td></tr>
            </table>
            <p>The effect runs <em>after</em> the state render because the effect's
            <code>filter</code> subscribed to <code>intent$</code> after the
            <code>scan</code>, so it reads the already-updated <code>state$.value</code>.</p>
          </details>
          <details>
            <summary>State vs one-off effect: why the toast is not in the state</summary>
            <p><code>saved: 2</code> is <strong>state</strong>: it is true until the next
            save, and re-rendering it any number of times shows the same thing. The toast is an
            <strong>event</strong>: "tell the user once". If we stored
            <code>toast: 'Saved 2'</code> in the state, every later render (clicking +, a
            rotation on Android, a re-subscribe) would show the toast again, unless we added a
            second intent just to clear it.</p>
            <div class="tip">Rule of thumb: if re-rendering the same value twice should look
            the same, it's state. If doing it twice would be a bug (two toasts, navigating twice),
            it's a one-off effect.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Type <code>5</code> in the step box and press Tab (the <code>change</code>
              event). You get <code>[Intent] {"type":"SetStep","step":5}</code>; now + adds 5.</li>
              <li>Click Save twice in a row. The state is identical both times, but you get two
              effect lines: each Save is a separate event.</li>
              <li>See the bug that effects avoid: in <code>reduce</code>, make Save return
              <code>{ ...state, saved: state.count, toast: 'Saved!' }</code> and in
              <code>render</code> set <code>dom.toast.textContent = s.toast || ''</code> with
              opacity 1. Save once, then click +: the "toast" is still there on every render,
              because it is now part of the state.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In MVI, what is the job of <code>intent()</code>?',
        options: [
          'Store the current state',
          'Turn raw UI events into meaningful intents like { type: "Increment" }',
          'Render the DOM',
          'Call the server',
        ],
        answer: 1,
        why: 'intent() only translates events into user intentions. It holds no state and draws nothing.',
      },
      {
        q: 'Which stream operator is the "reducer over time" that model() uses?',
        options: ['map', 'filter', 'scan', 'merge'],
        answer: 2,
        why: 'scan is like Array.reduce, but it emits the accumulated value after every new input, which gives you a stream of states.',
      },
      {
        q: 'Why is "show a toast" usually sent as a one-off effect instead of a field in the ViewState?',
        options: [
          'Toasts cannot be serialised',
          'StateFlow does not allow strings',
          'State is re-rendered many times; a toast stored in state would show again on each re-render',
          'Effects are faster than state',
        ],
        answer: 2,
        why: 'State describes "what is true now" and is safe to render repeatedly. A toast should happen once, so it travels through a separate effects channel.',
      },
      {
        q: 'Where did the MVI pattern originate?',
        options: [
          'Smalltalk-80',
          'Cycle.js, by André Staltz',
          'Angular.js',
          'The Elm compiler',
        ],
        answer: 1,
        why: 'MVI was introduced with Cycle.js (around 2015) and was later adopted widely in Android development.',
      },
    ],
    exercise: {
      task: `
        <p>Extend the MVI counter:</p>
        <ul>
          <li>Add a <strong>Reset</strong> button. In <code>intent()</code>, map its clicks
          to <code>{ type: 'Reset' }</code> and merge it in.</li>
          <li>In <code>reduce</code>, handle <code>'Reset'</code> by setting
          <code>count</code> to 0.</li>
          <li>Add a one-off effect: when the intent is <code>'Reset'</code>, emit
          <code>{ type: 'ShowToast', text: 'Counter reset' }</code> on
          <code>effect$</code>. (Hint: build it the same way as the existing Save effect and
          <code>merge</code> the two effect streams.)</li>
        </ul>
      `,
      starter: `function stream() {
  const subs = [];
  const s = {
    emit: v => subs.forEach(fn => fn(v)),
    subscribe: fn => subs.push(fn),
    map: f => {
      const out = stream();
      s.subscribe(v => out.emit(f(v)));
      return out;
    },
    filter: pred => {
      const out = stream();
      s.subscribe(v => pred(v) && out.emit(v));
      return out;
    },
    scan: (reducer, seed) => {
      const out = stream();
      out.value = seed;
      s.subscribe(v => {
        out.value = reducer(out.value, v);
        out.emit(out.value);
      });
      return out;
    },
  };
  return s;
}
function merge(...streams) {
  const out = stream();
  streams.forEach(s => s.subscribe(out.emit));
  return out;
}
function fromEvent(el, type) {
  const out = stream();
  el.addEventListener(type, out.emit);
  return out;
}

// ===== INTENT =====
function intent(dom) {
  const inc$ = fromEvent(dom.inc, 'click').map(() => ({ type: 'Increment' }));
  const save$ = fromEvent(dom.save, 'click').map(() => ({ type: 'Save' }));
  // TODO: reset$
  const intent$ = merge(inc$, save$);
  intent$.subscribe(i => console.log('[Intent]', JSON.stringify(i)));
  return intent$;
}

// ===== MODEL =====
const initialState = { count: 0, saved: null };
function reduce(state, intent) {
  switch (intent.type) {
    case 'Increment':
      return { ...state, count: state.count + 1 };
    case 'Save':
      return { ...state, saved: state.count };
    // TODO: 'Reset'
    default:
      return state;
  }
}
function model(intent$) {
  const state$ = intent$.scan(reduce, initialState);
  const saveEffect$ = intent$
    .filter(i => i.type === 'Save')
    .map(() => ({ type: 'ShowToast', text: 'Saved ' + state$.value.count }));
  // TODO: resetEffect$, then merge both
  return { state$, effect$: saveEffect$ };
}

// ===== VIEW =====
function view(state$, effect$, dom) {
  function render(s) {
    console.log(\`[View] render count=\${s.count} saved=\${s.saved}\`);
    dom.out.textContent = \`\${s.count} (saved: \${s.saved ?? 'never'})\`;
  }
  render(initialState);
  state$.subscribe(render);
  effect$.subscribe(e => {
    console.log('[View] effect', e.type, JSON.stringify(e.text));
    dom.toast.textContent = e.text;
  });
}

const root = document.getElementById('root');
root.innerHTML = \`
  <h2 id="out"></h2>
  <button id="inc">+</button>
  <button id="save">Save</button>
  <button id="reset">Reset</button>
  <p id="toast" style="color: #087ea4"></p>\`;
const dom = {};
['out', 'inc', 'save', 'reset', 'toast'].forEach(
  id => (dom[id] = root.querySelector('#' + id))
);

const intent$ = intent(dom);
const { state$, effect$ } = model(intent$);
view(state$, effect$, dom);`,
      hint: 'reset$ = fromEvent(dom.reset, \'click\').map(() => ({ type: \'Reset\' })). In model: const resetEffect$ = intent$.filter(i => i.type === \'Reset\').map(() => ({ type: \'ShowToast\', text: \'Counter reset\' })); return { state$, effect$: merge(saveEffect$, resetEffect$) }.',
      solution: `function stream() {
  const subs = [];
  const s = {
    emit: v => subs.forEach(fn => fn(v)),
    subscribe: fn => subs.push(fn),
    map: f => {
      const out = stream();
      s.subscribe(v => out.emit(f(v)));
      return out;
    },
    filter: pred => {
      const out = stream();
      s.subscribe(v => pred(v) && out.emit(v));
      return out;
    },
    scan: (reducer, seed) => {
      const out = stream();
      out.value = seed;
      s.subscribe(v => {
        out.value = reducer(out.value, v);
        out.emit(out.value);
      });
      return out;
    },
  };
  return s;
}
function merge(...streams) {
  const out = stream();
  streams.forEach(s => s.subscribe(out.emit));
  return out;
}
function fromEvent(el, type) {
  const out = stream();
  el.addEventListener(type, out.emit);
  return out;
}

// ===== INTENT =====
function intent(dom) {
  const inc$ = fromEvent(dom.inc, 'click').map(() => ({ type: 'Increment' }));
  const save$ = fromEvent(dom.save, 'click').map(() => ({ type: 'Save' }));
  const reset$ = fromEvent(dom.reset, 'click').map(() => ({ type: 'Reset' }));
  const intent$ = merge(inc$, save$, reset$);
  intent$.subscribe(i => console.log('[Intent]', JSON.stringify(i)));
  return intent$;
}

// ===== MODEL =====
const initialState = { count: 0, saved: null };
function reduce(state, intent) {
  switch (intent.type) {
    case 'Increment':
      return { ...state, count: state.count + 1 };
    case 'Save':
      return { ...state, saved: state.count };
    case 'Reset':
      return { ...state, count: 0 };
    default:
      return state;
  }
}
function model(intent$) {
  const state$ = intent$.scan(reduce, initialState);
  const saveEffect$ = intent$
    .filter(i => i.type === 'Save')
    .map(() => ({ type: 'ShowToast', text: 'Saved ' + state$.value.count }));
  const resetEffect$ = intent$
    .filter(i => i.type === 'Reset')
    .map(() => ({ type: 'ShowToast', text: 'Counter reset' }));
  return { state$, effect$: merge(saveEffect$, resetEffect$) };
}

// ===== VIEW =====
function view(state$, effect$, dom) {
  function render(s) {
    console.log(\`[View] render count=\${s.count} saved=\${s.saved}\`);
    dom.out.textContent = \`\${s.count} (saved: \${s.saved ?? 'never'})\`;
  }
  render(initialState);
  state$.subscribe(render);
  effect$.subscribe(e => {
    console.log('[View] effect', e.type, JSON.stringify(e.text));
    dom.toast.textContent = e.text;
  });
}

const root = document.getElementById('root');
root.innerHTML = \`
  <h2 id="out"></h2>
  <button id="inc">+</button>
  <button id="save">Save</button>
  <button id="reset">Reset</button>
  <p id="toast" style="color: #087ea4"></p>\`;
const dom = {};
['out', 'inc', 'save', 'reset', 'toast'].forEach(
  id => (dom[id] = root.querySelector('#' + id))
);

const intent$ = intent(dom);
const { state$, effect$ } = model(intent$);
view(state$, effect$, dom);`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'elm-architecture',
    section: 'Unidirectional data flow',
    title: 'The Elm Architecture (Model / Update / View)',
    explain: `
      <p><strong>Elm</strong> is a small functional language that compiles to JavaScript
      (current version: 0.19.1). Every Elm web app is built with the same pattern, called
      <strong>The Elm Architecture</strong> (TEA). It was not designed up front. As the Elm
      guide puts it, it emerged naturally from how people wrote Elm programs. Redux's docs
      list Elm as a major inspiration, so much of what you just learned started here.</p>

      <h3>Three parts (plus messages)</h3>
      <ul>
        <li><strong>Model</strong>: the state of the whole app, one immutable value.</li>
        <li><strong>Msg</strong>: a type listing everything that can happen,
        e.g. <code>Increment | Decrement</code>. Like Redux action types, but the compiler
        checks you handled every case.</li>
        <li><strong>update : Msg -&gt; Model -&gt; Model</strong>: given a message and the old
        model, return the new model. Like a reducer (note the argument order: message
        first).</li>
        <li><strong>view : Model -&gt; Html Msg</strong>: given the model, return a description
        of the screen. The <code>Msg</code> in <code>Html Msg</code> means "this HTML can
        produce these messages" (for example a button's <code>onClick Increment</code>).</li>
      </ul>
      <p>The smallest version, <code>Browser.sandbox</code>, looks like this:</p>
      <pre><code>type Msg = Increment | Decrement

update : Msg -&gt; Model -&gt; Model
update msg model =
  case msg of
    Increment -&gt; model + 1
    Decrement -&gt; model - 1

view : Model -&gt; Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , text (String.fromInt model)
    , button [ onClick Increment ] [ text "+" ]
    ]</code></pre>

      <h3>The runtime runs the loop for you</h3>
      <p>You never call <code>update</code> or touch the DOM yourself. The Elm
      <strong>runtime</strong> does it: it calls <code>view</code>, draws the result
      (with a virtual DOM diff), waits for a <code>Msg</code>, calls <code>update</code>, and
      repeats. Your code is just pure functions.</p>

      <h3>Side effects as data: <code>Cmd</code></h3>
      <p>Elm functions can't do side effects at all: no <code>fetch</code>, no
      <code>setTimeout</code>, no <code>Math.random</code>. With <code>Browser.element</code>,
      <code>update</code> returns a pair: <code>( Model, Cmd Msg )</code>. A
      <code>Cmd</code> is a <strong>description</strong> of work ("wait 1 second, then send
      <code>DelayedIncrement</code>"). The runtime performs it and feeds the result back in as
      a new <code>Msg</code>. This is the same idea as Redux thunks/middleware, but built into
      the language, and <code>update</code> stays pure.</p>
      <pre><code>update : Msg -&gt; Model -&gt; ( Model, Cmd Msg )</code></pre>

      <div class="tip">Compared with Redux: Model = state, Msg = action, update = reducer,
      <code>Cmd</code> ≈ what thunks/middleware do, and the runtime = the store plus the UI
      binding. Elm also has <code>Sub</code> (subscriptions) for outside events such as timers
      or window resizes.</div>
      <div class="warn">Elm's pieces are enforced by the type system and the compiler. In the
      JavaScript re-implementation below, nothing stops you from mutating the model or
      calling <code>fetch</code> in <code>update</code>. The discipline is up to you.</div>
    `,
    examples: [
      {
        title: 'The real Elm program (read-only)',
        runnable: false,
        code: `-- Elm 0.19.1 — needs the Elm compiler, so read-only here.
module Main exposing (main)

import Browser
import Html exposing (Html, button, div, text)
import Html.Events exposing (onClick)
import Process
import Task


-- MODEL

type alias Model =
  { count : Int
  , pending : Int
  }

init : () -> ( Model, Cmd Msg )
init _ =
  ( { count = 0, pending = 0 }, Cmd.none )


-- UPDATE

type Msg
  = Increment
  | Decrement
  | IncrementLater
  | DelayedIncrement

update : Msg -> Model -> ( Model, Cmd Msg )
update msg model =
  case msg of
    Increment ->
      ( { model | count = model.count + 1 }, Cmd.none )

    Decrement ->
      ( { model | count = model.count - 1 }, Cmd.none )

    IncrementLater ->
      ( { model | pending = model.pending + 1 }
      , Task.perform (\\_ -> DelayedIncrement) (Process.sleep 1000)
      )

    DelayedIncrement ->
      ( { model | count = model.count + 1, pending = model.pending - 1 }
      , Cmd.none
      )


-- VIEW

view : Model -> Html Msg
view model =
  div []
    [ button [ onClick Decrement ] [ text "-" ]
    , text (String.fromInt model.count)
    , button [ onClick Increment ] [ text "+" ]
    , button [ onClick IncrementLater ] [ text "+1 in 1s" ]
    ]


main : Program () Model Msg
main =
  Browser.element
    { init = init
    , update = update
    , view = view
    , subscriptions = \\_ -> Sub.none
    }`,
      },
      {
        title: 'Re-implemented in JavaScript: a mini Elm runtime',
        code: `// ===== MINI ELM RUNTIME (in real Elm this is built in) =====
// view() returns plain data describing the screen, not DOM nodes.
function h(tag, attrs, ...children) {
  return { tag, attrs, children };
}

function toDom(node, send) {
  if (typeof node !== 'object') return document.createTextNode(String(node));
  const el = document.createElement(node.tag);
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'onClick') el.addEventListener('click', () => send(value));
    else el.setAttribute(key, value);
  }
  node.children.forEach(child => el.append(toDom(child, send)));
  return el;
}

// Cmd = a DESCRIPTION of a side effect. The runtime performs it.
const Cmd = {
  none: { kind: 'none' },
  delay: (ms, msg) => ({ kind: 'delay', ms, msg }),
};

function element({ init, update, view }, root) {
  let model;

  function send(msg) {
    console.log('[Runtime] Msg', msg.type);
    const [nextModel, cmd] = update(msg, model);
    model = nextModel;
    console.log('[Update] model', JSON.stringify(model));
    render();
    perform(cmd);
  }

  function perform(cmd) {
    if (cmd.kind === 'delay') {
      console.log(\`[Runtime] Cmd: in \${cmd.ms}ms send \${cmd.msg.type}\`);
      setTimeout(() => send(cmd.msg), cmd.ms);
    }
  }

  function render() {
    console.log('[View] render count =', model.count);
    root.replaceChildren(toDom(view(model), send)); // real Elm diffs a virtual DOM
  }

  const [firstModel, firstCmd] = init();
  model = firstModel;
  render();
  perform(firstCmd);
}

// ===== MODEL =====
const init = () => [{ count: 0, pending: 0 }, Cmd.none];

// ===== MSG (Elm: type Msg = Increment | Decrement | IncrementLater | ...) =====
const Increment = { type: 'Increment' };
const Decrement = { type: 'Decrement' };
const IncrementLater = { type: 'IncrementLater' };
const DelayedIncrement = { type: 'DelayedIncrement' };

// ===== UPDATE : Msg -> Model -> [Model, Cmd] =====
function update(msg, model) {
  switch (msg.type) {
    case 'Increment':
      return [{ ...model, count: model.count + 1 }, Cmd.none];
    case 'Decrement':
      return [{ ...model, count: model.count - 1 }, Cmd.none];
    case 'IncrementLater':
      return [{ ...model, pending: model.pending + 1 }, Cmd.delay(1000, DelayedIncrement)];
    case 'DelayedIncrement':
      return [{ ...model, count: model.count + 1, pending: model.pending - 1 }, Cmd.none];
    default:
      return [model, Cmd.none];
  }
}

// ===== VIEW : Model -> Html Msg =====
function view(model) {
  return h('div', {},
    h('button', { onClick: Decrement }, '-'),
    h('b', { style: 'margin: 0 10px; font-size: 1.4em' }, model.count),
    h('button', { onClick: Increment }, '+'),
    h('button', { onClick: IncrementLater }, '+1 in 1s'),
    model.pending > 0 ? h('p', {}, '⏳ pending: ' + model.pending) : ''
  );
}

element({ init, update, view }, document.getElementById('root'));`,
        explain: `
          <details>
            <summary>Step by step: click <strong>+</strong>, then <strong>+1 in 1s</strong></summary>
            <table>
              <tr><th>Time</th><th>Console</th><th>Screen</th></tr>
              <tr><td>start</td><td><code>[View] render count = 0</code></td><td>0</td></tr>
              <tr><td>click +</td>
                <td><code>[Runtime] Msg Increment</code><br>
                <code>[Update] model {"count":1,"pending":0}</code><br>
                <code>[View] render count = 1</code></td><td>1</td></tr>
              <tr><td>click +1 in 1s</td>
                <td><code>[Runtime] Msg IncrementLater</code><br>
                <code>[Update] model {"count":1,"pending":1}</code><br>
                <code>[View] render count = 1</code><br>
                <code>[Runtime] Cmd: in 1000ms send DelayedIncrement</code></td>
                <td>1, ⏳ pending: 1</td></tr>
              <tr><td>+1s</td>
                <td><code>[Runtime] Msg DelayedIncrement</code><br>
                <code>[Update] model {"count":2,"pending":0}</code><br>
                <code>[View] render count = 2</code></td><td>2</td></tr>
            </table>
            <p>Look at who did what. <code>update</code> did not start a timer. It returned
            <code>Cmd.delay(1000, DelayedIncrement)</code>, a plain object. The
            <strong>runtime</strong> read that object, started the timer, and later sent the
            message back through the same <code>send → update → render</code> loop as a
            click.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>h('button', { onClick: Increment }, '+')       // ① the view names a Msg
const [nextModel, cmd] = update(msg, model);   // ② pure: returns data only
render();                                       // ③ redraw from the new model
perform(cmd);                                   // ④ the runtime does the effect</code></pre>
            <ol>
              <li><strong>①</strong> The view does not attach a function that changes state.
              It says "when clicked, this Msg happens". <code>toDom</code> turns that into
              <code>send(Increment)</code>.</li>
              <li><strong>②</strong> <code>update</code> can be tested with no DOM and no timers:
              <code>update(IncrementLater, { count: 0, pending: 0 })</code> returns a model and
              a Cmd object you can inspect.</li>
              <li><strong>③</strong> The whole screen is rebuilt from the model:
              <code>UI = view(model)</code>.</li>
              <li><strong>④</strong> Effects happen after rendering, outside
              <code>update</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>+1 in 1s</strong> three times quickly. You'll see
              <code>pending: 3</code>, then three <code>DelayedIncrement</code> messages, one
              per timer.</li>
              <li>Add at the bottom:
              <code>console.log(JSON.stringify(update(IncrementLater, { count: 5, pending: 0 })))</code>.
              It prints the new model and <code>{"kind":"delay",…}</code> without any timer
              running. That's what "effects as data" buys you.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In Elm, what is the type of <code>update</code> in a <code>Browser.sandbox</code> app?',
        options: [
          'Model -> Msg -> Html',
          'Msg -> Model -> Model',
          'Model -> Html Msg',
          'Msg -> Cmd Msg',
        ],
        answer: 1,
        why: 'update takes a message and the current model and returns the new model. (With Browser.element it returns ( Model, Cmd Msg ).)',
      },
      {
        q: 'What is a <code>Cmd</code> in The Elm Architecture?',
        options: [
          'A function that immediately performs an HTTP request',
          'A description of a side effect that the runtime performs, reporting back with a Msg',
          'A CSS class',
          'A way to mutate the model',
        ],
        answer: 1,
        why: 'Cmds are data. update stays pure; the runtime executes the Cmd and sends the result back as a new message.',
      },
      {
        q: 'What does the <code>Msg</code> in <code>view : Model -> Html Msg</code> tell you?',
        options: [
          'The view sends HTTP messages',
          'The HTML it returns can produce messages of type Msg (e.g. from onClick)',
          'The view must be called with a Msg',
          'It is a comment with no meaning',
        ],
        answer: 1,
        why: 'Html Msg is HTML whose event handlers produce Msg values that the runtime feeds into update.',
      },
      {
        q: 'Which mapping from Elm to Redux is right?',
        options: [
          'Msg ≈ reducer, update ≈ action',
          'Model ≈ middleware, view ≈ store',
          'Msg ≈ action, update ≈ reducer, Model ≈ state',
          'Cmd ≈ selector',
        ],
        answer: 2,
        why: 'Redux was inspired by Elm: messages became actions, update became reducers, the model became the single state tree.',
      },
    ],
    exercise: {
      task: `
        <p>Extend the JavaScript Elm-style counter:</p>
        <ul>
          <li>Add a <code>Reset</code> Msg that sets <code>count</code> to 0, and a
          <strong>Reset</strong> button in <code>view</code>.</li>
          <li>Add a <code>ResetLater</code> Msg that returns
          <code>Cmd.delay(2000, Reset)</code> and sets a <code>resetting: true</code> flag in
          the model. <code>Reset</code> should set <code>resetting</code> back to
          <code>false</code>.</li>
          <li>While <code>resetting</code> is true, the view shows "Resetting soon…".</li>
          <li>Keep <code>update</code> pure: no <code>setTimeout</code> in it.</li>
        </ul>
      `,
      starter: `// ===== MINI RUNTIME (no changes needed) =====
function h(tag, attrs, ...children) {
  return { tag, attrs, children };
}
function toDom(node, send) {
  if (typeof node !== 'object') return document.createTextNode(String(node));
  const el = document.createElement(node.tag);
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'onClick') el.addEventListener('click', () => send(value));
    else el.setAttribute(key, value);
  }
  node.children.forEach(child => el.append(toDom(child, send)));
  return el;
}
const Cmd = {
  none: { kind: 'none' },
  delay: (ms, msg) => ({ kind: 'delay', ms, msg }),
};
function element({ init, update, view }, root) {
  let model;
  function send(msg) {
    console.log('[Runtime] Msg', msg.type);
    const [nextModel, cmd] = update(msg, model);
    model = nextModel;
    render();
    if (cmd.kind === 'delay') setTimeout(() => send(cmd.msg), cmd.ms);
  }
  function render() {
    root.replaceChildren(toDom(view(model), send));
  }
  model = init();
  render();
}

// ===== YOUR APP =====
const init = () => ({ count: 0 }); // TODO: add resetting: false

const Increment = { type: 'Increment' };
// TODO: const Reset = ...; const ResetLater = ...;

function update(msg, model) {
  switch (msg.type) {
    case 'Increment':
      return [{ ...model, count: model.count + 1 }, Cmd.none];
    // TODO: 'Reset', 'ResetLater'
    default:
      return [model, Cmd.none];
  }
}

function view(model) {
  return h('div', {},
    h('b', { style: 'margin-right: 10px' }, model.count),
    h('button', { onClick: Increment }, '+')
    // TODO: Reset and "Reset in 2s" buttons, "Resetting soon…" text
  );
}

element({ init, update, view }, document.getElementById('root'));`,
      hint: 'ResetLater returns [{ ...model, resetting: true }, Cmd.delay(2000, Reset)]. Reset returns [{ ...model, count: 0, resetting: false }, Cmd.none]. In view, add model.resetting ? h(\'p\', {}, \'Resetting soon…\') : \'\'.',
      solution: `// ===== MINI RUNTIME (no changes needed) =====
function h(tag, attrs, ...children) {
  return { tag, attrs, children };
}
function toDom(node, send) {
  if (typeof node !== 'object') return document.createTextNode(String(node));
  const el = document.createElement(node.tag);
  for (const [key, value] of Object.entries(node.attrs)) {
    if (key === 'onClick') el.addEventListener('click', () => send(value));
    else el.setAttribute(key, value);
  }
  node.children.forEach(child => el.append(toDom(child, send)));
  return el;
}
const Cmd = {
  none: { kind: 'none' },
  delay: (ms, msg) => ({ kind: 'delay', ms, msg }),
};
function element({ init, update, view }, root) {
  let model;
  function send(msg) {
    console.log('[Runtime] Msg', msg.type);
    const [nextModel, cmd] = update(msg, model);
    model = nextModel;
    render();
    if (cmd.kind === 'delay') setTimeout(() => send(cmd.msg), cmd.ms);
  }
  function render() {
    root.replaceChildren(toDom(view(model), send));
  }
  model = init();
  render();
}

// ===== YOUR APP =====
const init = () => ({ count: 0, resetting: false });

const Increment = { type: 'Increment' };
const Reset = { type: 'Reset' };
const ResetLater = { type: 'ResetLater' };

function update(msg, model) {
  switch (msg.type) {
    case 'Increment':
      return [{ ...model, count: model.count + 1 }, Cmd.none];
    case 'Reset':
      return [{ ...model, count: 0, resetting: false }, Cmd.none];
    case 'ResetLater':
      return [{ ...model, resetting: true }, Cmd.delay(2000, Reset)];
    default:
      return [model, Cmd.none];
  }
}

function view(model) {
  return h('div', {},
    h('b', { style: 'margin-right: 10px' }, model.count),
    h('button', { onClick: Increment }, '+'),
    h('button', { onClick: Reset }, 'Reset'),
    h('button', { onClick: ResetLater }, 'Reset in 2s'),
    model.resetting ? h('p', {}, 'Resetting soon…') : ''
  );
}

element({ init, update, view }, document.getElementById('root'));`,
    },
  },
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'usereducer-in-react',
    section: 'Unidirectional data flow',
    title: 'Unidirectional flow in React: useReducer + Context',
    explain: `
      <p>React itself is one-way: data flows <strong>down</strong> through props, and events
      flow <strong>up</strong> through callbacks. For state shared by many components, React
      has a built-in mini-Redux: <code>useReducer</code>.</p>
      <pre><code class="language-jsx">const [state, dispatch] = useReducer(reducer, initialState);</code></pre>
      <ul>
        <li><code>reducer(state, action)</code> is exactly the pure function from the Redux
        lesson.</li>
        <li><code>dispatch(action)</code> <strong>schedules</strong> an update. It does not
        change <code>state</code> in the current render. React re-renders the component, runs
        the reducer, and gives you the new state on the next render.</li>
        <li>The <code>dispatch</code> function has a <strong>stable identity</strong>: it is the
        same function on every render.</li>
      </ul>

      <h3>Context: getting <code>dispatch</code> to deep children</h3>
      <p>Passing <code>dispatch</code> through five layers of props is tedious ("prop
      drilling"). <strong>Context</strong> lets any component below a
      <code>Provider</code> read a value directly. A common pattern (it appears in the React
      docs) uses <strong>two</strong> contexts:</p>
      <pre><code class="language-jsx">&lt;TodosContext.Provider value={todos}&gt;          // changes on every action
  &lt;DispatchContext.Provider value={dispatch}&gt;  // never changes
    {children}
  &lt;/DispatchContext.Provider&gt;
&lt;/TodosContext.Provider&gt;</code></pre>
      <p>Components that only <em>send</em> actions (a form, a button) read
      <code>DispatchContext</code>. Because <code>dispatch</code> never changes, they don't need
      to re-render when the todos change.</p>

      <h3>The loop, React edition</h3>
      <pre><code>click ──► dispatch(action) ──► React re-renders the reducer's owner
   ▲                              │ reducer(state, action) → new state
   │                              ▼
   └──── components re-render ◄── new value in TodosContext</code></pre>

      <div class="tip">In React 19 you can write <code>&lt;TodosContext value={todos}&gt;</code>
      instead of <code>&lt;TodosContext.Provider value={todos}&gt;</code>. Both work; the
      example uses <code>.Provider</code> because you'll see it in most existing code.</div>
      <div class="warn"><code>useReducer</code> + Context is great for a feature or a
      medium-size app. It is not a full Redux replacement: there is no middleware, no
      DevTools time travel, and every consumer of a context re-renders when its value changes.
      For big shared state, Redux Toolkit or another store library can be a better fit.</div>
    `,
    examples: [
      {
        title: 'Todos with useReducer and two contexts',
        lang: 'react',
        code: `import { createContext, useContext, useReducer, useState, memo } from 'react';

// ===== CONTEXTS: one for data, one for dispatch =====
const TodosContext = createContext(null);
const DispatchContext = createContext(null);

// ===== REDUCER: pure, same as Redux =====
function todosReducer(todos, action) {
  console.log('[Reducer]', action.type);
  switch (action.type) {
    case 'added':
      return [...todos, { id: Date.now(), text: action.text, done: false }];
    case 'toggled':
      return todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

const initialTodos = [
  { id: 1, text: 'Learn useReducer', done: false },
  { id: 2, text: 'Learn Context', done: false },
];

// ===== STORE-LIKE OWNER: holds the state, provides it =====
export default function App() {
  const [todos, dispatch] = useReducer(todosReducer, initialTodos);
  console.log('[App] render,', todos.length, 'todos');
  return (
    <TodosContext.Provider value={todos}>
      <DispatchContext.Provider value={dispatch}>
        <Header />
        <AddTodo />
        <TodoList />
        <Stats />
      </DispatchContext.Provider>
    </TodosContext.Provider>
  );
}

// ===== VIEWS (memo: re-render only if props or used context change) =====
const Header = memo(function Header() {
  console.log('[Header] render');
  return <h3 style={{ margin: '0 0 8px' }}>My todos</h3>;
});

const AddTodo = memo(function AddTodo() {
  const dispatch = useContext(DispatchContext); // only needs dispatch
  const [text, setText] = useState('');
  console.log('[AddTodo] render');

  function handleAdd() {
    console.log('[AddTodo] click → dispatch added');
    dispatch({ type: 'added', text: text || 'Untitled' });
    setText('');
  }

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="New todo" />
      <button onClick={handleAdd}>Add</button>
    </div>
  );
});

const TodoList = memo(function TodoList() {
  const todos = useContext(TodosContext);
  const dispatch = useContext(DispatchContext);
  console.log('[TodoList] render');
  return (
    <ul>
      {todos.map(t => (
        <li
          key={t.id}
          style={{ cursor: 'pointer' }}
          onClick={() => {
            console.log('[TodoList] click → dispatch toggled', t.id);
            dispatch({ type: 'toggled', id: t.id });
            const flags = JSON.stringify(todos.map(x => x.done));
            console.log('[TodoList] after dispatch, todos still', flags);
          }}
        >
          {t.done ? '✅' : '⬜'} {t.text}
        </li>
      ))}
    </ul>
  );
});

const Stats = memo(function Stats() {
  const todos = useContext(TodosContext);
  const done = todos.filter(t => t.done).length;
  console.log('[Stats] render');
  return <p style={{ color: 'gray' }}>{done} of {todos.length} done</p>;
});`,
        explain: `
          <details>
            <summary>Step by step: first render</summary>
            <table>
              <tr><th>#</th><th>Console</th><th>Why</th></tr>
              <tr><td>1</td><td><code>[App] render, 2 todos</code></td>
                <td>React renders parents before children</td></tr>
              <tr><td>2</td><td><code>[Header] render</code></td>
                <td>children in the order they appear in the JSX</td></tr>
              <tr><td>3</td><td><code>[AddTodo] render</code></td><td></td></tr>
              <tr><td>4</td><td><code>[TodoList] render</code></td><td></td></tr>
              <tr><td>5</td><td><code>[Stats] render</code></td><td></td></tr>
            </table>
            <p>No <code>[Reducer]</code> line: on the first render
            <code>useReducer</code> just uses <code>initialTodos</code>.</p>
          </details>
          <details>
            <summary>Step by step: clicking "Learn useReducer"</summary>
            <table>
              <tr><th>#</th><th>Console</th><th>What is going on</th></tr>
              <tr><td>1</td><td><code>[TodoList] click → dispatch toggled 1</code></td>
                <td>the event handler runs</td></tr>
              <tr><td>2</td><td><code>[TodoList] after dispatch, todos still [false,false]</code></td>
                <td><code>dispatch</code> only <strong>queued</strong> the action. This
                render's <code>todos</code> is a constant snapshot and does not change.</td></tr>
              <tr><td>3</td><td><code>[Reducer] toggled</code></td>
                <td>after the handler, React re-renders <code>App</code>; while
                <code>useReducer</code> runs it processes the queued action</td></tr>
              <tr><td>4</td><td><code>[App] render, 2 todos</code></td>
                <td>App got the new array</td></tr>
              <tr><td>5</td><td><code>[TodoList] render</code></td>
                <td>it reads <code>TodosContext</code>, whose value changed</td></tr>
              <tr><td>6</td><td><code>[Stats] render</code></td>
                <td>same reason. Screen: "1 of 2 done"</td></tr>
            </table>
            <p><strong>Missing on purpose:</strong> <code>[Header] render</code> and
            <code>[AddTodo] render</code>. Both are wrapped in <code>memo</code> and have no
            props. Header reads no context. AddTodo reads only <code>DispatchContext</code>,
            whose value (<code>dispatch</code>) is the same function as before. So React skips
            them. That is the payoff of splitting data and dispatch into two contexts.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code class="language-jsx">const [todos, dispatch] = useReducer(todosReducer, initialTodos); // ① the store
&lt;TodosContext.Provider value={todos}&gt;          // ② new array → consumers re-render
&lt;DispatchContext.Provider value={dispatch}&gt;    // ③ same function forever
const AddTodo = memo(function AddTodo() { … }); // ④ skip when nothing it uses changed</code></pre>
            <ol>
              <li><strong>①</strong> <code>App</code> plays the role of the Redux store: it owns
              the state, and the reducer is the only way to change it.</li>
              <li><strong>②</strong> Because the reducer returns a <em>new</em> array, React sees
              a new context value (it compares with <code>Object.is</code>) and re-renders every
              component that reads it.</li>
              <li><strong>③</strong> React guarantees <code>dispatch</code> is stable, so this
              context never triggers re-renders.</li>
              <li><strong>④</strong> Without <code>memo</code>, every child re-renders whenever
              <code>App</code> does, context or not.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Remove <code>memo(…)</code> around <code>Header</code> (keep the inner
              function). Click a todo: now <code>[Header] render</code> appears every time.</li>
              <li>Type in the input. Only <code>[AddTodo] render</code> logs: its
              <code>text</code> is local <code>useState</code>, not shared state. Not everything
              belongs in the reducer.</li>
              <li>Change the reducer's <code>toggled</code> case to mutate
              (<code>todos.find(t =&gt; t.id === action.id).done = true; return todos;</code>). Click a
              todo: only <code>[Reducer] toggled</code> and <code>[App] render, 2 todos</code>
              log. React had to call <code>App</code> to run the reducer, but the result is the
              same object (<code>Object.is</code>), so it bails out: TodoList and Stats don't
              re-render and the screen doesn't change. Click the other todo and the
              "todos still" line shows <code>[true,false]</code>: the data changed behind the
              UI's back, just like the Redux pitfall.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Right after <code>dispatch({ type: \'toggled\', id: 1 })</code> inside a click handler, what is <code>todos</code> in that handler?',
        options: [
          'The new array with todo 1 toggled',
          'The same old array from the current render',
          'undefined until the reducer finishes',
          'A Promise',
        ],
        answer: 1,
        why: 'dispatch queues an update. The todos variable is a snapshot of this render; the new value arrives in the next render.',
      },
      {
        q: 'Why put <code>dispatch</code> in its own context separate from <code>todos</code>?',
        options: [
          'Context can only hold one value type',
          'dispatch is stable, so components that only dispatch don’t re-render when todos change',
          'It makes the reducer run faster',
          'React requires it',
        ],
        answer: 1,
        why: 'A component re-renders when a context it reads changes. The dispatch context never changes, so a memoized AddTodo can skip re-renders.',
      },
      {
        q: 'When you click a todo in the example, which components log a render?',
        options: [
          'All five components',
          'Only TodoList',
          'App, TodoList and Stats',
          'App and Header',
        ],
        answer: 2,
        why: 'App owns the reducer. TodoList and Stats read TodosContext, which changed. Header and AddTodo are memoized and their inputs did not change.',
      },
      {
        q: 'Which feature do you <strong>not</strong> get from <code>useReducer</code> + Context compared with Redux Toolkit?',
        options: [
          'A pure reducer',
          'Dispatching action objects',
          'Middleware and Redux DevTools time travel',
          'One-way data flow',
        ],
        answer: 2,
        why: 'useReducer has reducers, actions and one-way flow, but no middleware pipeline or Redux DevTools integration.',
      },
    ],
    exercise: {
      lang: 'react',
      task: `
        <p>Add a <strong>Clear completed</strong> feature:</p>
        <ul>
          <li>Handle a <code>'clearedDone'</code> action in the reducer that removes all done
          todos (immutably).</li>
          <li>Create a <code>ClearButton</code> component that reads <code>dispatch</code> from
          <code>DispatchContext</code> (not from props) and dispatches
          <code>{ type: 'clearedDone' }</code>.</li>
          <li>Render <code>&lt;ClearButton /&gt;</code> inside the providers.</li>
        </ul>
      `,
      starter: `import { createContext, useContext, useReducer } from 'react';

const TodosContext = createContext(null);
const DispatchContext = createContext(null);

function todosReducer(todos, action) {
  console.log('[Reducer]', action.type);
  switch (action.type) {
    case 'toggled':
      return todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
    // TODO: 'clearedDone'
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

const initialTodos = [
  { id: 1, text: 'Buy milk', done: true },
  { id: 2, text: 'Walk dog', done: false },
  { id: 3, text: 'Read docs', done: true },
];

export default function App() {
  const [todos, dispatch] = useReducer(todosReducer, initialTodos);
  return (
    <TodosContext.Provider value={todos}>
      <DispatchContext.Provider value={dispatch}>
        <TodoList />
        {/* TODO: <ClearButton /> */}
      </DispatchContext.Provider>
    </TodosContext.Provider>
  );
}

function TodoList() {
  const todos = useContext(TodosContext);
  const dispatch = useContext(DispatchContext);
  return (
    <ul>
      {todos.map(t => (
        <li
          key={t.id}
          style={{ cursor: 'pointer' }}
          onClick={() => dispatch({ type: 'toggled', id: t.id })}
        >
          {t.done ? '✅' : '⬜'} {t.text}
        </li>
      ))}
    </ul>
  );
}

// TODO: function ClearButton() { ... }`,
      hint: 'Reducer: case \'clearedDone\': return todos.filter(t => !t.done);. ClearButton: const dispatch = useContext(DispatchContext); return <button onClick={() => dispatch({ type: \'clearedDone\' })}>Clear completed</button>;',
      solution: `import { createContext, useContext, useReducer } from 'react';

const TodosContext = createContext(null);
const DispatchContext = createContext(null);

function todosReducer(todos, action) {
  console.log('[Reducer]', action.type);
  switch (action.type) {
    case 'toggled':
      return todos.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'clearedDone':
      return todos.filter(t => !t.done);
    default:
      throw new Error('Unknown action: ' + action.type);
  }
}

const initialTodos = [
  { id: 1, text: 'Buy milk', done: true },
  { id: 2, text: 'Walk dog', done: false },
  { id: 3, text: 'Read docs', done: true },
];

export default function App() {
  const [todos, dispatch] = useReducer(todosReducer, initialTodos);
  return (
    <TodosContext.Provider value={todos}>
      <DispatchContext.Provider value={dispatch}>
        <TodoList />
        <ClearButton />
      </DispatchContext.Provider>
    </TodosContext.Provider>
  );
}

function TodoList() {
  const todos = useContext(TodosContext);
  const dispatch = useContext(DispatchContext);
  return (
    <ul>
      {todos.map(t => (
        <li
          key={t.id}
          style={{ cursor: 'pointer' }}
          onClick={() => dispatch({ type: 'toggled', id: t.id })}
        >
          {t.done ? '✅' : '⬜'} {t.text}
        </li>
      ))}
    </ul>
  );
}

function ClearButton() {
  const dispatch = useContext(DispatchContext);
  return (
    <button onClick={() => dispatch({ type: 'clearedDone' })}>Clear completed</button>
  );
}`,
    },
  },
);
