// Section: Foundations — the ideas every UI architecture pattern is built from.
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------ 1
  {
    id: 'why-architecture',
    section: 'Foundations',
    title: 'Why architecture? The spaghetti problem',
    explain: `
      <p>Almost every app starts small. A button, a list, one click handler. You write the code
      that reads the input, updates the page and does the maths <em>all in the same place</em>,
      because it is fast and it works.</p>
      <p>Then the app grows. A new feature arrives, and to add it you have to touch every click
      handler. You change one thing and something unrelated breaks. This is what programmers call
      <strong>spaghetti code</strong>: every strand is tangled with every other strand, and you
      can't pull one out without dragging the rest along.</p>

      <h3>Three kinds of code hide in every UI</h3>
      <ul>
        <li><strong>Data</strong>: what the app knows. <em>"There are 3 todos; #2 is done."</em></li>
        <li><strong>Display</strong>: how that data looks on screen. <em>"Draw a list, strike
        through done items."</em></li>
        <li><strong>Decisions</strong>: what happens when the user acts. <em>"When Add is clicked,
        ignore empty text, otherwise create a todo."</em></li>
      </ul>
      <p>In spaghetti code these three are mixed on the same lines. Every architecture pattern in
      this course (MVC, MVP, MVVM, Redux, MVI, Elm, Clean) is, at heart, a different answer to
      <em>"how do we keep those three apart, and how do they talk?"</em></p>

      <h3>Analogy: a restaurant</h3>
      <p>Picture a tiny restaurant where one person takes your order, runs to the pantry, cooks,
      washes up and writes the bill. It works with two customers. With fifty, orders get lost,
      and if you want to add a dessert menu you have to retrain the one person who does
      everything.</p>
      <p>A real restaurant splits the jobs: the <strong>waiter</strong> talks to customers
      (display), the <strong>chef</strong> decides how an order becomes a dish (decisions), and
      the <strong>pantry</strong> holds the ingredients (data). You can hire a new waiter without
      touching the pantry. That is what architecture buys you.</p>

      <div class="tip">Architecture is not about making small apps "proper". It is about making
      the <strong>next change</strong> cheap. If your app will never change, spaghetti is fine.
      </div>

      <h3>Symptoms you are in spaghetti</h3>
      <ul>
        <li>The only copy of your data is <strong>inside the DOM</strong> (you read it back with
        <code>querySelectorAll</code>).</li>
        <li>The same code is <strong>copy-pasted</strong> into several event handlers.</li>
        <li>You can't test a rule ("no empty todos") without clicking buttons.</li>
        <li>Adding one feature means editing <strong>every</strong> handler.</li>
      </ul>
      <p>Play with the example below, then open the walkthrough under it.</p>
    `,
    examples: [
      {
        title: 'A tangled todo app (with a hidden bug)',
        code: `// A "spaghetti" todo app: data, display and decisions are all tangled.
// The ONLY place the todos exist is... the DOM itself.
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="text" placeholder="New todo">
  <button id="add">Add</button>
  <p id="left">0 items left</p>
  <ul id="list"></ul>
\`;

const input = document.getElementById('text');
const addBtn = document.getElementById('add');

addBtn.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  console.log('[App] add', JSON.stringify(text));

  // build the DOM for one todo, right here in the click handler
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text + ' ';
  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'done';
  const delBtn = document.createElement('button');
  delBtn.textContent = 'x';
  li.append(span, doneBtn, delBtn);

  doneBtn.addEventListener('click', () => {
    li.classList.toggle('done'); // the "is it done?" data is a CSS class!
    span.style.textDecoration = li.classList.contains('done') ? 'line-through' : '';
    console.log('[App] toggle', JSON.stringify(text));
    // feature "items left" - copy #2 of the same counting code
    const left = document.querySelectorAll('#list li:not(.done)').length;
    document.getElementById('left').textContent = left + ' items left';
    console.log('[App] counted the DOM:', left, 'left');
  });

  delBtn.addEventListener('click', () => {
    li.remove();
    console.log('[App] delete', JSON.stringify(text));
    // oops: forgot to copy the counting code here. Counter is now wrong!
  });

  document.getElementById('list').append(li);
  input.value = '';

  // feature "items left" - copy #1 of the counting code
  const left = document.querySelectorAll('#list li:not(.done)').length;
  document.getElementById('left').textContent = left + ' items left';
  console.log('[App] counted the DOM:', left, 'left');
});

// Seed data by... pretending to type and click. There is nowhere else to put it.
for (const t of ['Buy milk', 'Walk the dog']) {
  input.value = t;
  addBtn.click();
}`,
        explain: `
          <details>
            <summary>The problem: one feature, three places to edit</summary>
            <p>The "items left" counter looks like one small feature. But the app has no single
            place where the todos live, so the counter has to <strong>count DOM nodes</strong>
            (<code>#list li:not(.done)</code>). And it has to do that after
            <em>every</em> change: add, toggle <em>and</em> delete.</p>
            <p>The author copy-pasted the counting code into <code>add</code> and
            <code>done</code>, and forgot <code>x</code> (delete). Nothing warns you. The counter
            is just silently wrong.</p>
          </details>
          <details>
            <summary>Step by step: reproduce the bug</summary>
            <table>
              <tr><th>Step</th><th>Screen</th><th>Console</th></tr>
              <tr><td>Page loads (seed loop "types" 2 todos)</td><td>2 items left</td>
                <td><code>[App] add "Buy milk"</code><br><code>[App] counted the DOM: 1 left</code>
                <br><code>[App] add "Walk the dog"</code><br>
                <code>[App] counted the DOM: 2 left</code></td></tr>
              <tr><td>Click <b>done</b> on Buy milk</td><td>1 items left ✅</td>
                <td><code>[App] toggle "Buy milk"</code><br>
                <code>[App] counted the DOM: 1 left</code></td></tr>
              <tr><td>Click <b>x</b> on Walk the dog</td><td><strong>1 items left ❌</strong>
                (really 0)</td><td><code>[App] delete "Walk the dog"</code> (no count!)</td></tr>
            </table>
          </details>
          <details>
            <summary>Why this keeps happening</summary>
            <ol>
              <li><strong>Data lives in the DOM.</strong> "Is it done?" is a CSS class. To ask a
              question about your data you must search the page.</li>
              <li><strong>Display is mixed with decisions.</strong> Each handler both decides what
              changed <em>and</em> patches the screen by hand.</li>
              <li><strong>No single source of truth.</strong> Each new feature (counter, "clear
              done", saving to storage...) must be added to every handler.</li>
            </ol>
            <div class="warn">Seeding the data by filling the input and calling
            <code>addBtn.click()</code> is a giveaway: the app has nowhere to put data except the
            screen.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add a "Clear done" button. Count how many places you have to update so the
              counter stays right.</li>
              <li>Fix the delete bug by copying the counter code a third time. Notice how you are
              now maintaining three copies.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In the tangled todo app, where is the list of todos actually stored?',
        options: ['In a JavaScript array', 'In localStorage', 'Only in the DOM (li elements)',
          'In the counter paragraph'],
        answer: 2,
        why: 'There is no array. The only record of the todos is the li elements, and "done" is a CSS class. That is why counting needs querySelectorAll.',
      },
      {
        q: 'Why is the "items left" counter wrong after deleting?',
        options: ['querySelectorAll is buggy', 'The counting code was copy-pasted into add and toggle but forgotten in delete',
          'The browser caches the old count', 'li.remove() does not really remove the element'],
        answer: 1,
        why: 'With no single place that recomputes the display from the data, every handler must remember to update every piece of UI. One was forgotten.',
      },
      {
        q: 'In the restaurant analogy, the pantry (ingredients) corresponds to...',
        options: ['The display (View)', 'The data (Model)', 'The decisions', 'The customer'],
        answer: 1,
        why: 'The pantry holds the raw stuff the kitchen works with: the data. The waiter is the display and the chef makes the decisions.',
      },
      {
        q: 'What is the main goal of a UI architecture pattern?',
        options: ['Make code run faster', 'Use fewer files',
          'Keep data, display and decisions apart so changes stay cheap', 'Avoid using the DOM'],
        answer: 2,
        why: 'Patterns are about organising responsibilities so a change in one place does not ripple everywhere. Performance is not the main point.',
      },
    ],
    exercise: {
      task: `
        <p>Untangle the todo app. Keep the same features (add, done, delete, "items left") but:</p>
        <ol>
          <li>Store the todos in an array <code>todos</code> of <code>{ text, done }</code>.</li>
          <li>Write <strong>one</strong> <code>render()</code> function that rebuilds the list
          and the counter from the array.</li>
          <li>Each handler only changes the array and then calls <code>render()</code>.</li>
        </ol>
        <p>The delete bug should disappear on its own, because the counter is now computed in
        exactly one place.</p>
      `,
      starter: `// A "spaghetti" todo app: data, display and decisions are all tangled.
// The ONLY place the todos exist is... the DOM itself.
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="text" placeholder="New todo">
  <button id="add">Add</button>
  <p id="left">0 items left</p>
  <ul id="list"></ul>
\`;

const input = document.getElementById('text');
const addBtn = document.getElementById('add');

addBtn.addEventListener('click', () => {
  const text = input.value.trim();
  if (!text) return;
  console.log('[App] add', JSON.stringify(text));

  // build the DOM for one todo, right here in the click handler
  const li = document.createElement('li');
  const span = document.createElement('span');
  span.textContent = text + ' ';
  const doneBtn = document.createElement('button');
  doneBtn.textContent = 'done';
  const delBtn = document.createElement('button');
  delBtn.textContent = 'x';
  li.append(span, doneBtn, delBtn);

  doneBtn.addEventListener('click', () => {
    li.classList.toggle('done'); // the "is it done?" data is a CSS class!
    span.style.textDecoration = li.classList.contains('done') ? 'line-through' : '';
    console.log('[App] toggle', JSON.stringify(text));
    // feature "items left" - copy #2 of the same counting code
    const left = document.querySelectorAll('#list li:not(.done)').length;
    document.getElementById('left').textContent = left + ' items left';
    console.log('[App] counted the DOM:', left, 'left');
  });

  delBtn.addEventListener('click', () => {
    li.remove();
    console.log('[App] delete', JSON.stringify(text));
    // oops: forgot to copy the counting code here. Counter is now wrong!
  });

  document.getElementById('list').append(li);
  input.value = '';

  // feature "items left" - copy #1 of the counting code
  const left = document.querySelectorAll('#list li:not(.done)').length;
  document.getElementById('left').textContent = left + ' items left';
  console.log('[App] counted the DOM:', left, 'left');
});

// Seed data by... pretending to type and click. There is nowhere else to put it.
for (const t of ['Buy milk', 'Walk the dog']) {
  input.value = t;
  addBtn.click();
}`,
      hint: 'Start with let todos = [...]. In render(), clear list.innerHTML, loop over todos, create an li per todo, and compute todos.filter(t => !t.done).length for the counter. Buttons can call toggle(i) / remove(i) which change the array then call render().',
      solution: `// Untangled: the data lives in ONE array, and ONE function draws everything.
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="text" placeholder="New todo">
  <button id="add">Add</button>
  <p id="left"></p>
  <ul id="list"></ul>
\`;

const input = document.getElementById('text');
const list = document.getElementById('list');

// ① the data
let todos = [
  { text: 'Buy milk', done: false },
  { text: 'Walk the dog', done: false },
];

// ② the ONLY code that touches the list and the counter
function render() {
  list.innerHTML = '';
  todos.forEach((todo, i) => {
    const li = document.createElement('li');
    const span = document.createElement('span');
    span.textContent = todo.text + ' ';
    span.style.textDecoration = todo.done ? 'line-through' : '';
    const doneBtn = document.createElement('button');
    doneBtn.textContent = 'done';
    doneBtn.onclick = () => toggle(i);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'x';
    delBtn.onclick = () => remove(i);
    li.append(span, doneBtn, delBtn);
    list.append(li);
  });
  const left = todos.filter(t => !t.done).length;
  document.getElementById('left').textContent = left + ' items left';
  console.log('[App] render:', todos.length, 'todos,', left, 'left');
}

// ③ handlers only change the data, then call render()
function add(text) {
  todos.push({ text, done: false });
  render();
}

function toggle(i) {
  todos[i].done = !todos[i].done;
  render();
}

function remove(i) {
  todos.splice(i, 1);
  render();
}

document.getElementById('add').onclick = () => {
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  add(text);
};

render();`,
    },
  },

  // ------------------------------------------------------------------ 2
  {
    id: 'separation-of-concerns',
    section: 'Foundations',
    title: 'Separation of concerns: data, display, decisions',
    explain: `
      <p><strong>Separation of concerns</strong> means: each piece of code has one job and
      doesn't meddle in the others. For a UI we split the three kinds of code from the last
      lesson into three parts:</p>
      <ul>
        <li><strong>Model</strong> (data): holds the todos and the rules about them
        (<em>"no empty todos"</em>). It knows <strong>nothing</strong> about HTML, buttons or
        the DOM.</li>
        <li><strong>View</strong> (display): draws the data and reports what the user did
        (<em>"Add was clicked with text X"</em>). It makes <strong>no</strong> decisions.</li>
        <li><strong>The thing in between</strong> (decisions): listens to the View, asks the
        Model to change, then tells the View to redraw.</li>
      </ul>
      <p>The "thing in between" is exactly where the patterns disagree. MVC calls it a
      <strong>Controller</strong>, MVP a <strong>Presenter</strong>, MVVM a
      <strong>ViewModel</strong>. For now we just call it <em>the glue</em>, and log it as
      <code>[Glue]</code>.</p>

      <h3>The restaurant again</h3>
      <p>The waiter (View) never cooks. The pantry (Model) never talks to customers. The head
      waiter / chef (in between) turns "table 4 wants soup" into actions on the kitchen and
      tells the waiter what to bring out.</p>

      <h3>What you get</h3>
      <ul>
        <li><strong>One place per change.</strong> A new rule? Model. A new look? View.</li>
        <li><strong>Testable rules.</strong> The Model is plain JavaScript, so you can test it
        with no browser at all (example 2).</li>
        <li><strong>Replaceable views.</strong> The same Model can feed a web page, a text
        report, or a mobile screen.</li>
      </ul>
      <pre><code>// Direction of knowledge (who "knows about" whom):
View   ──reports "user did X"──►  Glue  ──calls──►  Model
View   ◄──"render these todos"──  Glue  ◄─reads───  Model
// The Model knows about NOBODY. That is what makes it reusable.</code></pre>
      <div class="tip">A quick test for "is this Model code?": could it run in Node.js with no
      <code>document</code>? If yes, it belongs in the Model (or at least not in the View).
      </div>
      <div class="warn">Splitting code into three files is not enough. If the View still decides
      things (<code>if (text === '') return</code>) or the Model builds HTML, the concerns are
      still mixed, just in more files.</div>
    `,
    examples: [
      {
        title: 'The todo app, separated into Model / View / Glue',
        code: `// The same todo app, split into three parts with ONE job each.

// ===== MODEL (data + rules; knows nothing about the screen) =====
const model = {
  todos: [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk the dog', done: true },
  ],
  nextId: 3,

  add(text) {
    text = text.trim();
    if (!text) {
      console.log('[Model] rejected: empty todo');
      return false;
    }
    this.todos.push({ id: this.nextId++, text, done: false });
    const n = this.todos.length;
    console.log('[Model] added', JSON.stringify(text), '- now', n, 'todos');
    return true;
  },

  toggle(id) {
    const todo = this.todos.find(t => t.id === id);
    todo.done = !todo.done;
    console.log('[Model] toggled', id, '- done =', todo.done);
  },

  remove(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    console.log('[Model] removed', id);
  },
};

// ===== VIEW (draws data, reports clicks; makes NO decisions) =====
const view = {
  root: document.getElementById('root'),

  render(todos) {
    console.log('[View] render', todos.length, 'todos');
    this.list.innerHTML = '';
    for (const todo of todos) {
      const li = document.createElement('li');
      li.dataset.id = todo.id;
      const span = document.createElement('span');
      span.textContent = todo.text + ' ';
      span.style.textDecoration = todo.done ? 'line-through' : '';
      li.append(span);
      li.insertAdjacentHTML('beforeend',
        '<button data-act="toggle">done</button><button data-act="remove">x</button>');
      this.list.append(li);
    }
  },

  // The view doesn't know WHAT should happen on a click. It just reports it.
  bind(handlers) {
    this.root.innerHTML = \`
      <input id="text" placeholder="New todo">
      <button id="add">Add</button>
      <ul id="list"></ul>
    \`;
    this.input = this.root.querySelector('#text');
    this.list = this.root.querySelector('#list');
    this.root.querySelector('#add').onclick = () => handlers.onAdd(this.input.value);
    this.list.onclick = (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      const id = Number(e.target.closest('li').dataset.id);
      if (act === 'toggle') handlers.onToggle(id);
      if (act === 'remove') handlers.onRemove(id);
    };
  },

  clearInput() {
    this.input.value = '';
  },
};

// ===== THE THING IN BETWEEN (turns "user clicked" into "change the data") =====
function refresh() {
  view.render(model.todos);
}

view.bind({
  onAdd(text) {
    console.log('[Glue] user wants to add', JSON.stringify(text));
    if (model.add(text)) view.clearInput();
    refresh();
  },
  onToggle(id) {
    console.log('[Glue] user wants to toggle', id);
    model.toggle(id);
    refresh();
  },
  onRemove(id) {
    console.log('[Glue] user wants to remove', id);
    model.remove(id);
    refresh();
  },
});

refresh();`,
        explain: `
          <details>
            <summary>Step by step: clicking <b>Add</b> with "Code"</summary>
            <table>
              <tr><th>#</th><th>Who</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>View</td><td>Button click handler reads the input and reports
                it: <code>handlers.onAdd("Code")</code></td><td></td></tr>
              <tr><td>2</td><td>Glue</td><td>Decides what to do</td>
                <td><code>[Glue] user wants to add "Code"</code></td></tr>
              <tr><td>3</td><td>Model</td><td>Checks the rule, stores the todo</td>
                <td><code>[Model] added "Code" - now 3 todos</code></td></tr>
              <tr><td>4</td><td>Glue</td><td>Model said OK → <code>view.clearInput()</code>,
                then <code>refresh()</code></td><td></td></tr>
              <tr><td>5</td><td>View</td><td>Redraws the whole list from the data</td>
                <td><code>[View] render 3 todos</code></td></tr>
            </table>
            <p>Click Add with an empty box and step 3 becomes
            <code>[Model] rejected: empty todo</code>: the rule lives in the Model, not in the
            View.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>// VIEW
this.root.querySelector('#add').onclick =
  () =&gt; handlers.onAdd(this.input.value);   // ① report, don't decide

// GLUE
onAdd(text) {
  if (model.add(text)) view.clearInput();     // ② ask the Model
  refresh();                                   // ③ redraw from the data
}</code></pre>
            <ol>
              <li><strong>①</strong> The View doesn't know what "Add" means. It passes the raw
              text to whatever handler it was given.</li>
              <li><strong>②</strong> The Model returns <code>true</code>/<code>false</code>; the
              glue uses that to decide whether to clear the input.</li>
              <li><strong>③</strong> After any change, the View is redrawn from
              <code>model.todos</code>. There is a single source of truth, so no counter can go
              stale.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Payoff: test the Model and reuse it with a different View',
        code: `// Payoff: a separated Model can be tested and reused WITHOUT any screen.

// ===== MODEL (copied unchanged from the previous example, minus the logs) =====
function createModel() {
  return {
    todos: [],
    nextId: 1,
    add(text) {
      text = text.trim();
      if (!text) return false;
      this.todos.push({ id: this.nextId++, text, done: false });
      return true;
    },
    toggle(id) {
      const todo = this.todos.find(t => t.id === id);
      todo.done = !todo.done;
    },
    remove(id) {
      this.todos = this.todos.filter(t => t.id !== id);
    },
  };
}

// ===== TESTS (no DOM, no clicking, instant) =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (actual !== expected) throw new Error(\`expected \${expected}, got \${actual}\`);
}

test('add() stores a trimmed todo', () => {
  const m = createModel();
  m.add('  Buy milk ');
  assertEqual(m.todos[0].text, 'Buy milk');
});

test('add() rejects empty text', () => {
  const m = createModel();
  assertEqual(m.add('   '), false);
  assertEqual(m.todos.length, 0);
});

test('toggle() flips done', () => {
  const m = createModel();
  m.add('A');
  m.toggle(1);
  assertEqual(m.todos[0].done, true);
});

// ===== A SECOND, completely different VIEW for the same model =====
function textView(todos) {
  return todos.map(t => (t.done ? '[x] ' : '[ ] ') + t.text).join('\\n');
}

const m = createModel();
m.add('Learn MVC');
m.add('Learn MVVM');
m.toggle(1);
console.log('[View:text]\\n' + textView(m.todos));

document.getElementById('root').innerHTML =
  '<pre>' + textView(m.todos) + '</pre><p>(see the console for test results)</p>';`,
      },
      {
        title: 'Diagram: the three boxes (click each one)',
        lang: 'html',
        code: `<style>
  .boxes { display: flex; gap: 10px; align-items: center; justify-content: center; }
  .box {
    width: 140px; padding: 14px 8px; border: 2px solid #8a93b0; border-radius: 10px;
    text-align: center; cursor: pointer; background: #f4f5f9; transition: .2s;
  }
  .box b { display: block; font-size: 17px; }
  .box small { color: #666; }
  .box.on { border-color: #4f6bed; background: #e6ebff; transform: translateY(-3px); }
  .arrow { font-size: 13px; color: #555; text-align: center; line-height: 1.3; }
  #info { margin-top: 14px; padding: 10px 14px; border-left: 4px solid #4f6bed;
    background: #f7f8fc; min-height: 90px; }
  #info h4 { margin: 0 0 6px; }
  #info ul { margin: 4px 0; }
</style>

<div class="boxes">
  <div class="box" data-k="view"><b>View</b><small>display</small></div>
  <div class="arrow">user did X &rarr;<br>&larr; show this</div>
  <div class="box" data-k="between">
    <b>The thing<br>in between</b><small>decisions</small>
  </div>
  <div class="arrow">change data &rarr;<br>&larr; data changed</div>
  <div class="box" data-k="model"><b>Model</b><small>data + rules</small></div>
</div>
<div id="info">Click a box.</div>

<script>
  const INFO = {
    view: {
      title: 'View = the waiter / the menu (what the customer sees)',
      does: ['Draws the data on screen', 'Reports user actions ("Add clicked")'],
      never: ['Decides what happens', 'Stores the real data'],
    },
    between: {
      title: 'The thing in between = the head waiter taking orders',
      does: [
        'Receives "user did X"',
        'Asks the Model to change',
        'Tells the View to refresh',
      ],
      never: ['Holds business rules that belong to the Model', 'Builds HTML'],
      note: 'MVC calls it Controller, MVP calls it Presenter, MVVM calls it ViewModel.',
    },
    model: {
      title: 'Model = the kitchen + pantry (the real work and the ingredients)',
      does: ['Holds the data (todos)', 'Enforces rules ("no empty todos")'],
      never: ['Touches the DOM', 'Knows which buttons exist'],
    },
  };
  const info = document.getElementById('info');
  document.querySelectorAll('.box').forEach(box => {
    box.addEventListener('click', () => {
      document.querySelectorAll('.box').forEach(b => b.classList.toggle('on', b === box));
      const d = INFO[box.dataset.k];
      info.innerHTML = '<h4>' + d.title + '</h4>' +
        '<b>Does:</b><ul>' + d.does.map(x => '<li>' + x + '</li>').join('') + '</ul>' +
        '<b>Never:</b><ul>' + d.never.map(x => '<li>' + x + '</li>').join('') + '</ul>' +
        (d.note ? '<em>' + d.note + '</em>' : '');
      console.log('clicked', box.dataset.k);
    });
  });
</script>`,
      },
    ],
    quiz: [
      {
        q: 'Where should the rule "a todo cannot be empty" live?',
        options: ['In the View, before calling the handler', 'In the Model',
          'In the HTML as a required attribute only', 'In the CSS'],
        answer: 1,
        why: 'It is a rule about the data, so it belongs in the Model. Then every caller (web view, tests, a future mobile view) gets the same rule for free.',
      },
      {
        q: 'Which part should know about the DOM?',
        options: ['Model', 'View', 'Both Model and View', 'None of them'],
        answer: 1,
        why: 'Only the View touches document/HTML. That is what lets the Model run in tests with no browser.',
      },
      {
        q: 'In example 2, why can the tests run without clicking anything?',
        options: ['Because they mock the DOM', 'Because the Model is plain JavaScript with no DOM dependency',
          'Because console.log is fake', 'Because tests always skip the Model'],
        answer: 1,
        why: 'createModel() never touches document, so calling add/toggle directly is enough.',
      },
      {
        q: 'MVC, MVP and MVVM mostly differ in...',
        options: ['What the Model stores', 'Which CSS framework they use',
          'What the "thing in between" is called and how it talks to the View', 'Whether they use JavaScript'],
        answer: 2,
        why: 'All three have a Model and a View. The Controller / Presenter / ViewModel are different answers to the "in between" question.',
      },
    ],
    exercise: {
      task: `
        <p>Add an <strong>"N items left"</strong> counter to the separated app. Respect the
        split:</p>
        <ul>
          <li>The <strong>Model</strong> gets a <code>remaining()</code> method (a rule about
          data).</li>
          <li>The <strong>View</strong> gets a place to show the number (it only displays it).
          </li>
          <li>The <strong>glue</strong> passes <code>model.remaining()</code> to the View.</li>
        </ul>
        <p>Notice you don't touch <code>onAdd</code>, <code>onToggle</code> or
        <code>onRemove</code> at all. Compare that with the spaghetti version.</p>
      `,
      starter: `// The same todo app, split into three parts with ONE job each.

// ===== MODEL (data + rules; knows nothing about the screen) =====
const model = {
  todos: [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk the dog', done: true },
  ],
  nextId: 3,

  add(text) {
    text = text.trim();
    if (!text) {
      console.log('[Model] rejected: empty todo');
      return false;
    }
    this.todos.push({ id: this.nextId++, text, done: false });
    const n = this.todos.length;
    console.log('[Model] added', JSON.stringify(text), '- now', n, 'todos');
    return true;
  },

  toggle(id) {
    const todo = this.todos.find(t => t.id === id);
    todo.done = !todo.done;
    console.log('[Model] toggled', id, '- done =', todo.done);
  },

  remove(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    console.log('[Model] removed', id);
  },
};

// ===== VIEW (draws data, reports clicks; makes NO decisions) =====
const view = {
  root: document.getElementById('root'),

  render(todos) {
    console.log('[View] render', todos.length, 'todos');
    this.list.innerHTML = '';
    for (const todo of todos) {
      const li = document.createElement('li');
      li.dataset.id = todo.id;
      const span = document.createElement('span');
      span.textContent = todo.text + ' ';
      span.style.textDecoration = todo.done ? 'line-through' : '';
      li.append(span);
      li.insertAdjacentHTML('beforeend',
        '<button data-act="toggle">done</button><button data-act="remove">x</button>');
      this.list.append(li);
    }
  },

  // The view doesn't know WHAT should happen on a click. It just reports it.
  bind(handlers) {
    this.root.innerHTML = \`
      <input id="text" placeholder="New todo">
      <button id="add">Add</button>
      <ul id="list"></ul>
    \`;
    this.input = this.root.querySelector('#text');
    this.list = this.root.querySelector('#list');
    this.root.querySelector('#add').onclick = () => handlers.onAdd(this.input.value);
    this.list.onclick = (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      const id = Number(e.target.closest('li').dataset.id);
      if (act === 'toggle') handlers.onToggle(id);
      if (act === 'remove') handlers.onRemove(id);
    };
  },

  clearInput() {
    this.input.value = '';
  },
};

// ===== THE THING IN BETWEEN (turns "user clicked" into "change the data") =====
function refresh() {
  view.render(model.todos);
}

view.bind({
  onAdd(text) {
    console.log('[Glue] user wants to add', JSON.stringify(text));
    if (model.add(text)) view.clearInput();
    refresh();
  },
  onToggle(id) {
    console.log('[Glue] user wants to toggle', id);
    model.toggle(id);
    refresh();
  },
  onRemove(id) {
    console.log('[Glue] user wants to remove', id);
    model.remove(id);
    refresh();
  },
});

refresh();`,
      hint: 'remaining() { return this.todos.filter(t => !t.done).length; }. Change view.render(todos) to view.render(todos, left), add a &lt;p id="left"&gt; in bind(), and update refresh().',
      solution: `// Solution: the counter touched only the Model (a rule) and the View (a display).

// ===== MODEL (data + rules; knows nothing about the screen) =====
const model = {
  todos: [
    { id: 1, text: 'Buy milk', done: false },
    { id: 2, text: 'Walk the dog', done: true },
  ],
  nextId: 3,

  add(text) {
    text = text.trim();
    if (!text) {
      console.log('[Model] rejected: empty todo');
      return false;
    }
    this.todos.push({ id: this.nextId++, text, done: false });
    const n = this.todos.length;
    console.log('[Model] added', JSON.stringify(text), '- now', n, 'todos');
    return true;
  },

  toggle(id) {
    const todo = this.todos.find(t => t.id === id);
    todo.done = !todo.done;
    console.log('[Model] toggled', id, '- done =', todo.done);
  },

  remove(id) {
    this.todos = this.todos.filter(t => t.id !== id);
    console.log('[Model] removed', id);
  },

  // NEW: a rule about the data lives in the Model
  remaining() {
    return this.todos.filter(t => !t.done).length;
  },
};

// ===== VIEW (draws data, reports clicks; makes NO decisions) =====
const view = {
  root: document.getElementById('root'),

  render(todos, left) {
    console.log('[View] render', todos.length, 'todos,', left, 'left');
    this.left.textContent = left + ' items left'; // NEW: just display a number
    this.list.innerHTML = '';
    for (const todo of todos) {
      const li = document.createElement('li');
      li.dataset.id = todo.id;
      const span = document.createElement('span');
      span.textContent = todo.text + ' ';
      span.style.textDecoration = todo.done ? 'line-through' : '';
      li.append(span);
      li.insertAdjacentHTML('beforeend',
        '<button data-act="toggle">done</button><button data-act="remove">x</button>');
      this.list.append(li);
    }
  },

  // The view doesn't know WHAT should happen on a click. It just reports it.
  bind(handlers) {
    this.root.innerHTML = \`
      <input id="text" placeholder="New todo">
      <button id="add">Add</button>
      <p id="left"></p>
      <ul id="list"></ul>
    \`;
    this.input = this.root.querySelector('#text');
    this.list = this.root.querySelector('#list');
    this.left = this.root.querySelector('#left');
    this.root.querySelector('#add').onclick = () => handlers.onAdd(this.input.value);
    this.list.onclick = (e) => {
      const act = e.target.dataset.act;
      if (!act) return;
      const id = Number(e.target.closest('li').dataset.id);
      if (act === 'toggle') handlers.onToggle(id);
      if (act === 'remove') handlers.onRemove(id);
    };
  },

  clearInput() {
    this.input.value = '';
  },
};

// ===== THE THING IN BETWEEN (turns "user clicked" into "change the data") =====
function refresh() {
  view.render(model.todos, model.remaining()); // NEW: pass the count along
}

view.bind({
  onAdd(text) {
    console.log('[Glue] user wants to add', JSON.stringify(text));
    if (model.add(text)) view.clearInput();
    refresh();
  },
  onToggle(id) {
    console.log('[Glue] user wants to toggle', id);
    model.toggle(id);
    refresh();
  },
  onRemove(id) {
    console.log('[Glue] user wants to remove', id);
    model.remove(id);
    refresh();
  },
});

refresh();`,
    },
  },

  // ------------------------------------------------------------------ 3
  {
    id: 'observer-pattern',
    section: 'Foundations',
    title: 'The Observer pattern (the engine under every pattern)',
    explain: `
      <p>In the last lesson the glue had to remember to call <code>refresh()</code> after every
      change. That works for one View. But real apps have many views of the same data: a list,
      a counter in the header, a badge on a tab. Who tells all of them that something changed?
      </p>
      <p>The <strong>Observer pattern</strong> (one of the classic "Gang of Four" design
      patterns from 1994) answers this: the thing that changes, called the
      <strong>subject</strong>, keeps a list of interested functions, called
      <strong>observers</strong> or <strong>listeners</strong>. When it changes, it calls them
      all. The subject does not know what they do.</p>

      <h3>Analogy: a newsletter</h3>
      <p>You <strong>subscribe</strong> to a newsletter. When a new issue is published, every
      subscriber gets it. The publisher doesn't know if you read it on a phone or print it. And
      if you move house without <strong>unsubscribing</strong>, the letters keep piling up at
      your old address.</p>

      <h3>The whole API is three functions</h3>
      <pre><code>const off = model.on('change', fn); // subscribe; returns "unsubscribe"
model.emit('change', data);         // notify every subscriber, in order
off();                              // unsubscribe</code></pre>
      <p>You'll see this engine everywhere under different names: DOM
      <code>addEventListener</code>, Node's <code>EventEmitter</code>, Smalltalk's
      <code>changed</code>/<code>update:</code> (classic MVC), RxJS
      <code>subscribe</code>, Redux's <code>store.subscribe</code>, Vue and MobX reactivity,
      Android <code>LiveData.observe</code>.</p>
      <div class="tip">The key benefit is <strong>decoupling</strong>: the Model can notify
      views it has never heard of. You can add a new View without editing the Model.</div>
      <div class="warn">The key danger is <strong>forgetting to unsubscribe</strong>. A removed
      View that still listens keeps running code, keeps memory alive (a <em>leak</em>) and can
      cause double updates.</div>
    `,
    examples: [
      {
        title: 'One model, three views, and a subscription bug',
        code: `// ===== OBSERVER (a tiny EventEmitter) =====
class Emitter {
  constructor() {
    this.listeners = {}; // { eventName: [fn, fn, ...] }
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    console.log(\`[Emitter] +listener "\${event}" (total \${this.listeners[event].length})\`);
    return () => this.off(event, fn); // give back an "unsubscribe" function
  }

  off(event, fn) {
    this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn);
    console.log(\`[Emitter] -listener "\${event}" (total \${this.listeners[event].length})\`);
  }

  emit(event, data) {
    const list = this.listeners[event] || [];
    console.log(\`[Emitter] emit "\${event}" to \${list.length} listener(s)\`);
    // loop over a copy: safe even if a listener unsubscribes mid-loop
    list.slice().forEach(fn => fn(data));
  }
}

// ===== MODEL (the "subject": it has no idea who is listening) =====
class CounterModel extends Emitter {
  constructor() {
    super();
    this.count = 0;
  }

  increment() {
    this.count++;
    console.log('[Model] count =', this.count);
    this.emit('change', this.count);
  }
}

// ===== VIEWS (the "observers") =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="inc">+1</button>
  <button id="unsub">Unsubscribe history</button>
  <button id="sub">Subscribe history</button>
  <h1 id="big">0</h1>
  <p id="parity">even</p>
  History: <span id="history"></span>
\`;

const model = new CounterModel();

function showBig(n) {
  console.log('[View:Big] show', n);
  document.getElementById('big').textContent = n;
}

function showParity(n) {
  const text = n % 2 === 0 ? 'even' : 'odd';
  console.log('[View:Parity]', text);
  document.getElementById('parity').textContent = text;
}

function addHistory(n) {
  console.log('[View:History] add', n);
  document.getElementById('history').textContent += n + ' ';
}

model.on('change', showBig);
model.on('change', showParity);
let unsubHistory = model.on('change', n => addHistory(n));

// ===== WIRING the buttons =====
document.getElementById('inc').onclick = () => model.increment();
document.getElementById('unsub').onclick = () => unsubHistory();
document.getElementById('sub').onclick = () => {
  // BUG on purpose: a new arrow each time, and the old unsubscribe is overwritten
  unsubHistory = model.on('change', n => addHistory(n));
};`,
        explain: `
          <details>
            <summary>The problem: without Observer, the Model must know every View</summary>
            <p>Without an emitter, <code>increment()</code> would have to look like this:</p>
            <pre><code>increment() {
  this.count++;
  showBig(this.count);     // Model knows about the big number view
  showParity(this.count);  // ...and the parity view
  addHistory(this.count);  // ...and the history view
}</code></pre>
            <p>Every new screen means editing the Model, and you can't test the Model without
            those views. With Observer, <code>increment()</code> just says
            <code>this.emit('change', this.count)</code> and has no idea who listens.</p>
          </details>
          <details>
            <summary>Step by step: subscribe, then click <b>+1</b></summary>
            <table>
              <tr><th>Step</th><th>listeners["change"]</th><th>Console</th></tr>
              <tr><td>Page load: <code>on(showBig)</code></td><td>[showBig]</td>
                <td><code>[Emitter] +listener "change" (total 1)</code></td></tr>
              <tr><td><code>on(showParity)</code></td><td>[showBig, showParity]</td>
                <td><code>[Emitter] +listener "change" (total 2)</code></td></tr>
              <tr><td><code>on(n =&gt; addHistory(n))</code></td><td>[showBig, showParity, arrow1]</td>
                <td><code>[Emitter] +listener "change" (total 3)</code></td></tr>
              <tr><td>Click <b>+1</b></td><td>(unchanged)</td>
                <td><code>[Model] count = 1</code><br>
                <code>[Emitter] emit "change" to 3 listener(s)</code><br>
                <code>[View:Big] show 1</code><br><code>[View:Parity] odd</code><br>
                <code>[View:History] add 1</code></td></tr>
            </table>
            <p>Notice the order: listeners run <strong>synchronously</strong> and <strong>in the
            order they subscribed</strong>. All three views are updated before
            <code>increment()</code> returns.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>on(event, fn) {
  (this.listeners[event] ||= []).push(fn);   // ① remember fn
  return () =&gt; this.off(event, fn);          // ② hand back an unsubscribe
}

off(event, fn) {
  this.listeners[event] = (this.listeners[event] || [])
    .filter(f =&gt; f !== fn);                  // ③ remove by identity
}

emit(event, data) {
  list.slice().forEach(fn =&gt; fn(data));      // ④ loop over a copy
}</code></pre>
            <ol>
              <li><strong>①</strong> <code>||=</code> creates the array the first time an event
              is used.</li>
              <li><strong>②</strong> The returned function closes over <em>this exact</em>
              <code>fn</code>. Keep it: it's your only handle for unsubscribing an inline
              arrow.</li>
              <li><strong>③</strong> Removal compares function identity (<code>!==</code>). Two
              arrows with identical source are still two different functions.</li>
              <li><strong>④</strong> A listener may unsubscribe <em>while</em> we are looping
              (that's how <code>once()</code> works). Our <code>off()</code> already builds a
              new array with <code>filter</code>, but if someone later "optimises" it to
              <code>splice()</code> in place, the loop would silently skip the next listener.
              Looping over a copy makes <code>emit</code> safe either way.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: double subscription and the leak</summary>
            <p>Click in this order and watch the <code>total</code>:</p>
            <table>
              <tr><th>Click</th><th>Console</th><th>What went wrong</th></tr>
              <tr><td>+1 (count 1)</td><td>... <code>[View:History] add 1</code></td><td>fine
                </td></tr>
              <tr><td>Unsubscribe history</td>
                <td><code>[Emitter] -listener "change" (total 2)</code></td><td>fine</td></tr>
              <tr><td>+1 (count 2)</td><td><code>emit "change" to 2 listener(s)</code>, no
                history line</td><td>fine: history skipped 2</td></tr>
              <tr><td>Subscribe history</td><td><code>+listener "change" (total 3)</code></td>
                <td>fine</td></tr>
              <tr><td>Subscribe history <em>again</em></td>
                <td><code>+listener "change" (total 4)</code></td><td>second arrow added;
                <code>unsubHistory</code> now only points at the <em>newest</em> one</td></tr>
              <tr><td>+1 (count 3)</td><td><code>[View:History] add 3</code> <strong>twice</strong>
                </td><td><strong>double update</strong></td></tr>
              <tr><td>Unsubscribe history</td><td><code>-listener "change" (total 3)</code></td>
                <td>only the newest one is removed</td></tr>
              <tr><td>+1 (count 4)</td><td><code>[View:History] add 4</code></td>
                <td><strong>leak</strong>: the first arrow can never be removed now. History
                shows <code>1 3 3 4</code></td></tr>
            </table>
            <div class="warn">In real apps this happens when a component subscribes every time it
            is shown but never unsubscribes when it is hidden. Rule: <strong>every
            <code>on()</code> needs a matching <code>off()</code></strong> when the view goes
            away (React's effect cleanup, Angular's <code>ngOnDestroy</code>, Android's
            lifecycle-aware observers all exist for this).</div>
            <div class="tip">Fix the demo: in the Subscribe handler, call
            <code>unsubHistory()</code> before subscribing again, or skip if already subscribed.
            </div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In what order are listeners called by <code>emit()</code> in the example?',
        options: ['Random order', 'Reverse subscription order', 'The order they subscribed',
          'Alphabetical by function name'],
        answer: 2,
        why: 'emit loops over the array in insertion order, so Big, then Parity, then History. Synchronously, before emit returns.',
      },
      {
        q: 'Why does <code>model.off("change", n =&gt; addHistory(n))</code> NOT remove the history listener?',
        options: ['off() only works on the first listener', 'It creates a brand-new arrow function, which is not === the subscribed one',
          'Arrow functions cannot be listeners', 'The event name is wrong'],
        answer: 1,
        why: 'Removal compares function identity. A new arrow is a different object even if the code looks the same. That is why on() returns an unsubscribe function.',
      },
      {
        q: 'You click "Subscribe history" twice without unsubscribing, then +1. What do you see?',
        options: ['One history entry', 'Two identical history entries', 'An error', 'No history entry'],
        answer: 1,
        why: 'Two listeners are registered, so emit calls addHistory twice: a double update.',
      },
      {
        q: 'What does the Model know about its views in the Observer pattern?',
        options: ['Their names and DOM elements', 'Only how many there are and which functions to call, nothing about what they do',
          'Everything', 'It imports them'],
        answer: 1,
        why: 'The subject just holds a list of functions. It never knows they are views, what they draw or where.',
      },
      {
        q: 'Why does <code>emit</code> loop over <code>list.slice()</code> instead of <code>list</code>?',
        options: ['It is faster', 'So a listener that unsubscribes during emit does not break the loop',
          'slice() sorts the listeners', 'To make a deep copy of data'],
        answer: 1,
        why: 'Listeners (like once()) may unsubscribe during emit. Iterating a stable copy guarantees every listener present at emit time is called exactly once, however off() is implemented.',
      },
    ],
    exercise: {
      task: `
        <p>Add a <code>once(event, fn)</code> method to <code>Emitter</code>: it calls
        <code>fn</code> on the <strong>next</strong> emit only, then unsubscribes itself. It
        should also return an unsubscribe function so it can be cancelled before firing.</p>
        <p>Then write a test <code>'once() fires only one time'</code> using the
        <code>test()</code> helper: emit twice and expect exactly 1 call.</p>
      `,
      starter: `// ===== OBSERVER =====
class Emitter {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn);
  }

  emit(event, data) {
    (this.listeners[event] || []).slice().forEach(fn => fn(data));
  }

  // TODO: once(event, fn) - call fn on the NEXT emit only, then stop listening.
  // It should also return an unsubscribe function (like on()).
  once(event, fn) {
    return () => {};
  }
}

// ===== TESTS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('on() + emit() calls the listener', () => {
  const e = new Emitter();
  let got = null;
  e.on('ping', x => (got = x));
  e.emit('ping', 42);
  if (got !== 42) throw new Error('got ' + got);
});

test('unsubscribe stops calls', () => {
  const e = new Emitter();
  let calls = 0;
  const off = e.on('ping', () => calls++);
  e.emit('ping');
  off();
  e.emit('ping');
  if (calls !== 1) throw new Error('calls = ' + calls);
});

// TODO: write a test 'once() fires only one time' and uncomment it:
// test('once() fires only one time', () => {
//   ...emit twice, expect exactly 1 call
// });

document.getElementById('root').textContent = 'Open the console to see test results.';`,
      hint: 'Inside once(), subscribe a wrapper with this.on(). The wrapper first calls the unsubscribe function that on() returned, then calls fn(data). Return that same unsubscribe function.',
      solution: `// ===== OBSERVER =====
class Emitter {
  constructor() {
    this.listeners = {};
  }

  on(event, fn) {
    (this.listeners[event] ||= []).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this.listeners[event] = (this.listeners[event] || []).filter(f => f !== fn);
  }

  emit(event, data) {
    (this.listeners[event] || []).slice().forEach(fn => fn(data));
  }

  once(event, fn) {
    // wrap fn: the wrapper unsubscribes ITSELF, then calls the real listener
    const off = this.on(event, (data) => {
      off();
      fn(data);
    });
    return off;
  }
}

// ===== TESTS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('on() + emit() calls the listener', () => {
  const e = new Emitter();
  let got = null;
  e.on('ping', x => (got = x));
  e.emit('ping', 42);
  if (got !== 42) throw new Error('got ' + got);
});

test('unsubscribe stops calls', () => {
  const e = new Emitter();
  let calls = 0;
  const off = e.on('ping', () => calls++);
  e.emit('ping');
  off();
  e.emit('ping');
  if (calls !== 1) throw new Error('calls = ' + calls);
});

test('once() fires only one time', () => {
  const e = new Emitter();
  let calls = 0;
  e.once('ping', () => calls++);
  e.emit('ping');
  e.emit('ping');
  if (calls !== 1) throw new Error('calls = ' + calls);
});

test('once() can be cancelled before it fires', () => {
  const e = new Emitter();
  let calls = 0;
  const off = e.once('ping', () => calls++);
  off();
  e.emit('ping');
  if (calls !== 0) throw new Error('calls = ' + calls);
});

document.getElementById('root').textContent = 'Open the console to see test results.';`,
    },
  },

  // ------------------------------------------------------------------ 4
  {
    id: 'data-binding',
    section: 'Foundations',
    title: 'One-way vs two-way data binding',
    explain: `
      <p><strong>Data binding</strong> means: a piece of the screen is automatically kept in
      sync with a piece of data, so you don't write "copy this value over there" by hand.</p>
      <ul>
        <li><strong>Manual sync</strong>: no binding. You copy model → view and view → model
        yourself, and it is easy to forget one.</li>
        <li><strong>One-way binding</strong> (model → view): when the data changes, the screen
        updates. Typing in an input does <em>not</em> change the data by itself; you handle the
        event explicitly. React and Elm work this way.</li>
        <li><strong>Two-way binding</strong> (model ↔ view): the screen follows the data
        <em>and</em> user input writes straight back into the data. Angular's
        <code>[(ngModel)]</code>, Vue's <code>v-model</code>, Svelte's <code>bind:value</code>
        and WPF / .NET MAUI bindings with <code>Mode=TwoWay</code> are examples.</li>
      </ul>
      <p>Under the hood, binding is just the Observer pattern from the last lesson, wired up for
      you: one subscription for model → view, and (for two-way) one DOM event listener for
      view → model.</p>

      <h3>Analogy</h3>
      <p>One-way is a <strong>TV broadcast</strong>: the station changes, every TV shows it,
      but shouting at your TV changes nothing. Two-way is a <strong>shared Google Doc</strong>:
      anyone's edit shows up everywhere, and everyone can edit.</p>

      <table>
        <tr><th></th><th>One-way</th><th>Two-way</th></tr>
        <tr><td>Data flow</td><td>Easy to trace: one direction</td>
          <td>Changes can come from either side</td></tr>
        <tr><td>Boilerplate for forms</td><td>More (write the onChange yourself)</td>
          <td>Less</td></tr>
        <tr><td>Main risk</td><td>Forgetting to handle input</td>
          <td>Update loops, "who changed this?"</td></tr>
        <tr><td>Used by</td><td>React, Elm, Redux-style apps</td>
          <td>Angular forms, Vue v-model, MVVM (WPF, Knockout)</td></tr>
      </table>
      <div class="warn">The classic two-way bug is an <strong>update loop</strong>: A changes
      → updates B → B's change updates A → ... The cure is a <strong>guard</strong>: don't
      notify if the value didn't actually change (example 2).</div>
    `,
    examples: [
      {
        title: 'Manual vs one-way vs two-way (switch the mode)',
        code: `// ===== MODEL =====
class NameModel {
  constructor(name) {
    this.name = name;
    this.listeners = [];
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  setName(name) {
    this.name = name;
    console.log('[Model] name =', JSON.stringify(name));
    this.listeners.forEach(fn => fn(name));
  }
}

const model = new NameModel('Ada');

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>
    <label><input type="radio" name="mode" value="manual" checked> manual</label>
    <label><input type="radio" name="mode" value="one-way"> one-way</label>
    <label><input type="radio" name="mode" value="two-way"> two-way</label>
  </p>
  <input id="name"> <b id="greeting"></b>
  <p>
    <button id="server">Model changes (server update)</button>
    <button id="pull">Manual: model &rarr; view</button>
    <button id="push">Manual: view &rarr; model</button>
  </p>
\`;
const input = document.getElementById('name');
const greeting = document.getElementById('greeting');

function renderFromModel() {
  console.log('[View] render from model:', JSON.stringify(model.name));
  if (input.value !== model.name) input.value = model.name; // don't touch it if equal
  greeting.textContent = 'Hello, ' + model.name + '!';
}

// ===== BINDER (decides what syncs automatically) =====
let mode = 'manual';

// direction 1: model -> view
model.subscribe(() => {
  if (mode === 'manual') {
    console.log('[Binder] model changed, but nothing is bound -> view is stale');
    return;
  }
  renderFromModel();
});

// direction 2: view -> model
input.addEventListener('input', () => {
  if (mode !== 'two-way') {
    const typed = JSON.stringify(input.value);
    console.log('[View] typed', typed, '(not bound -> model unchanged)');
    return;
  }
  console.log('[View] typed', JSON.stringify(input.value), '-> model');
  model.setName(input.value);
});

root.querySelectorAll('[name=mode]').forEach(radio => {
  radio.onchange = () => {
    mode = radio.value;
    console.log('[Binder] mode =', mode);
    if (mode !== 'manual') renderFromModel(); // start in sync
  };
});

// ===== buttons =====
const names = ['Grace', 'Linus', 'Ada'];
let i = 0;
document.getElementById('server').onclick = () => {
  model.setName(names[i++ % names.length]);
};
document.getElementById('pull').onclick = () => renderFromModel();
document.getElementById('push').onclick = () => model.setName(input.value);

renderFromModel();`,
        explain: `
          <details>
            <summary>Manual mode: you are the binder</summary>
            <table>
              <tr><th>Action</th><th>Console</th><th>Screen</th></tr>
              <tr><td>Load</td><td><code>[View] render from model: "Ada"</code></td>
                <td>input "Ada", Hello, Ada!</td></tr>
              <tr><td>Type "Bob"</td>
                <td><code>[View] typed "Bob" (not bound -&gt; model unchanged)</code></td>
                <td>Hello, Ada! (stale)</td></tr>
              <tr><td>Manual: view → model</td><td><code>[Model] name = "Bob"</code><br>
                <code>[Binder] model changed, but nothing is bound -&gt; view is stale</code></td>
                <td>still Hello, Ada!</td></tr>
              <tr><td>Manual: model → view</td>
                <td><code>[View] render from model: "Bob"</code></td><td>Hello, Bob!</td></tr>
            </table>
            <p>Two buttons for one change. Forget either one and the screen lies. That's the
            spaghetti bug from lesson 1 in a new costume.</p>
          </details>
          <details>
            <summary>One-way vs two-way: event order on each keystroke</summary>
            <p><b>One-way</b>: click "Model changes" and the screen follows by itself:</p>
            <pre><code>[Model] name = "Grace"
[View] render from model: "Grace"</code></pre>
            <p>But typing only logs <code>[View] typed "..." (not bound -&gt; model
            unchanged)</code>. The greeting doesn't move. In React you'd add an
            <code>onChange</code> that updates state; that's one-way plus an explicit event.</p>
            <p><b>Two-way</b>: type a letter, e.g. making it "Kay". Everything happens
            synchronously inside the single <code>input</code> event:</p>
            <table>
              <tr><th>#</th><th>Code running</th><th>Console</th></tr>
              <tr><td>1</td><td>DOM fires <code>input</code> → our listener</td>
                <td><code>[View] typed "Kay" -&gt; model</code></td></tr>
              <tr><td>2</td><td><code>model.setName("Kay")</code></td>
                <td><code>[Model] name = "Kay"</code></td></tr>
              <tr><td>3</td><td>Model notifies → <code>renderFromModel()</code></td>
                <td><code>[View] render from model: "Kay"</code></td></tr>
              <tr><td>4</td><td><code>input.value === "Kay"</code> already → skip writing it
                </td><td>(greeting becomes Hello, Kay!)</td></tr>
            </table>
          </details>
          <details>
            <summary>Why step 4 has a guard</summary>
            <pre><code>if (input.value !== model.name) input.value = model.name;</code></pre>
            <p>In two-way mode, the value you just typed comes back to the same input. Writing
            it again is pointless and, in some setups, harmful: overwriting an input while the
            user types can move the cursor or drop characters. Luckily, setting
            <code>input.value</code> from code does <strong>not</strong> fire an
            <code>input</code> event, so the DOM itself won't loop. Two models bound to each
            other have no such luck: see the next example.</p>
          </details>
        `,
      },
      {
        title: 'The two-way loop: Celsius ↔ Fahrenheit (toggle the guard)',
        code: `// Two models bound to EACH OTHER: Celsius <-> Fahrenheit.
// Without a guard, every update causes another update... forever.

// ===== MODEL =====
let bounces = 0; // safety fuse so the demo can't freeze your tab
const MAX_BOUNCES = 6;

class Value {
  constructor(label, value) {
    this.label = label;
    this.value = value;
    this.listeners = [];
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  set(v) {
    if (guard.checked && v === this.value) {
      console.log(\`[Model \${this.label}] already \${v} -> stop (guard)\`);
      return;
    }
    if (++bounces > MAX_BOUNCES) {
      console.log(\`[Binder] FUSE BLOWN after \${MAX_BOUNCES} updates: infinite loop!\`);
      return;
    }
    this.value = v;
    console.log(\`[Model \${this.label}] = \${v}\`);
    this.listeners.forEach(fn => fn(v));
  }
}

const round1 = x => Math.round(x * 10) / 10;
const c = new Value('C', 0);
const f = new Value('F', 32);

// ===== TWO-WAY BINDING between the two models =====
c.subscribe(v => f.set(round1(v * 9 / 5 + 32)));
f.subscribe(v => c.set(round1((v - 32) * 5 / 9)));

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <label><input type="checkbox" id="guard"> guard: skip if value unchanged</label>
  <p>
    <button id="boil">Set C = 100</button>
    <button id="cold">Set F = 50</button>
  </p>
  <p id="out"></p>
\`;
const guard = document.getElementById('guard');

function show() {
  document.getElementById('out').textContent = \`\${c.value} °C = \${f.value} °F\`;
}

document.getElementById('boil').onclick = () => {
  bounces = 0;
  console.log('--- click: set C = 100, guard', guard.checked ? 'ON' : 'OFF');
  c.set(100);
  show();
};

document.getElementById('cold').onclick = () => {
  bounces = 0;
  console.log('--- click: set F = 50, guard', guard.checked ? 'ON' : 'OFF');
  f.set(50);
  show();
};

show();`,
        explain: `
          <details>
            <summary>The problem: A updates B updates A updates B...</summary>
            <p>Each value's subscriber sets the <em>other</em> value. And <code>set()</code>
            always notifies, even when nothing changed. With the guard <strong>OFF</strong>,
            click <b>Set C = 100</b>:</p>
            <table>
              <tr><th>Bounce</th><th>Call</th><th>Console</th></tr>
              <tr><td>1</td><td><code>c.set(100)</code> → notifies</td>
                <td><code>[Model C] = 100</code></td></tr>
              <tr><td>2</td><td>→ <code>f.set(212)</code> → notifies</td>
                <td><code>[Model F] = 212</code></td></tr>
              <tr><td>3</td><td>→ <code>c.set(100)</code> <em>again</em></td>
                <td><code>[Model C] = 100</code></td></tr>
              <tr><td>4-6</td><td>...and so on</td>
                <td><code>[Model F] = 212</code>, <code>[Model C] = 100</code>,
                <code>[Model F] = 212</code></td></tr>
              <tr><td>7</td><td>fuse</td>
                <td><code>[Binder] FUSE BLOWN after 6 updates: infinite loop!</code></td></tr>
            </table>
            <p>Without our demo fuse, these nested calls would keep going until the browser
            throws <code>RangeError: Maximum call stack size exceeded</code>.</p>
          </details>
          <details>
            <summary>The fix: stop when nothing changed</summary>
            <pre><code>set(v) {
  if (guard.checked &amp;&amp; v === this.value) return;  // ① same value → stay quiet
  this.value = v;                                 // ② store
  this.listeners.forEach(fn =&gt; fn(v));            // ③ only real changes notify
}</code></pre>
            <p>Reload (so C starts at 0), tick the guard, click <b>Set C = 100</b>:</p>
            <pre><code>--- click: set C = 100, guard ON
[Model C] = 100
[Model F] = 212
[Model C] already 100 -&gt; stop (guard)</code></pre>
            <p>Then <b>Set F = 50</b>:</p>
            <pre><code>--- click: set F = 50, guard ON
[Model F] = 50
[Model C] = 10
[Model F] already 50 -&gt; stop (guard)</code></pre>
          </details>
          <details>
            <summary>Common mistake: guards and floating point</summary>
            <div class="warn">The guard only works if the round trip lands on the
            <em>exact same</em> value. 37 °C → 98.6 °F → back to °C can give
            <code>36.99999999999999</code> in floating point, which is "different", so the loop
            continues. That's why the example rounds with <code>round1()</code>. Frameworks
            face the same issue; Angular, for example, throws
            <code>ExpressionChangedAfterItHasBeenCheckedError</code> in dev mode when a binding
            keeps changing.</div>
            <div class="tip">Try it: remove <code>round1(...)</code> from both subscribers, tick
            the guard, and set a value like 37 by editing <code>c.set(100)</code>.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In one-way (model → view) mode, what happens when the user types in the input?',
        options: ['The model updates automatically', 'Nothing changes in the model unless you handle the event yourself',
          'The page reloads', 'The input is locked'],
        answer: 1,
        why: 'One-way binding only pushes data to the screen. User input must be handled explicitly (e.g. an onChange that updates state).',
      },
      {
        q: 'Which is an example of two-way binding?',
        options: ["Vue's v-model", 'document.title = x', 'console.log(model)', 'A CSS class'],
        answer: 0,
        why: 'v-model both displays the value and writes user input back into it. Angular [(ngModel)] and Svelte bind:value are similar.',
      },
      {
        q: 'Why does the Celsius/Fahrenheit demo loop forever without the guard?',
        options: ['setTimeout is misused', 'Each set() notifies even when the value is unchanged, and each side sets the other',
          'Math.round is recursive', 'The browser re-fires input events'],
        answer: 1,
        why: 'C notifies F, F notifies C, forever. The values never even change; the loop comes from notifying on every set.',
      },
      {
        q: 'Does setting <code>input.value = "x"</code> from JavaScript fire an <code>input</code> event?',
        options: ['Yes, always', 'No, only real user input (or dispatchEvent) fires it', 'Only in Chrome', 'Only for number inputs'],
        answer: 1,
        why: 'Programmatic value changes do not fire input events, so a DOM input bound to a model does not loop by itself.',
      },
    ],
    exercise: {
      task: `
        <p>Build a <strong>two-way bound font size</strong>: a range slider and a number box are
        both bound to one <code>model.size</code>. Moving either one updates the other and the
        preview text's <code>font-size</code>.</p>
        <ol>
          <li>Finish <code>render(size)</code> (model → view).</li>
          <li>Subscribe <code>render</code> to the model.</li>
          <li>Listen to <code>input</code> on both controls and call
          <code>model.setSize(Number(...))</code> (view → model).</li>
          <li>Add a guard in <code>setSize</code> so an unchanged value doesn't notify.</li>
        </ol>
      `,
      starter: `// ===== MODEL =====
const model = {
  size: 16,
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  setSize(size) {
    // TODO: add a guard so an unchanged value does not notify again
    this.size = size;
    console.log('[Model] size =', size);
    this.listeners.forEach(fn => fn(size));
  },
};

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="slider" type="range" min="10" max="40">
  <input id="num" type="number" min="10" max="40" style="width: 60px">
  <p id="preview">Preview text</p>
\`;
const slider = document.getElementById('slider');
const num = document.getElementById('num');
const preview = document.getElementById('preview');

function render(size) {
  console.log('[View] render', size);
  // TODO: put size into slider.value, num.value and preview.style.fontSize
}

// ===== BINDINGS =====
// TODO 1 (model -> view): subscribe render to the model
// TODO 2 (view -> model): on 'input' of slider AND num, call model.setSize(Number(...))

render(model.size);`,
      hint: 'render sets slider.value, num.value and preview.style.fontSize = size + "px". The guard is: if (size === this.size) return;',
      solution: `// ===== MODEL =====
const model = {
  size: 16,
  listeners: [],
  subscribe(fn) {
    this.listeners.push(fn);
  },
  setSize(size) {
    if (size === this.size) return; // guard: nothing changed -> no notification
    this.size = size;
    console.log('[Model] size =', size);
    this.listeners.forEach(fn => fn(size));
  },
};

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <input id="slider" type="range" min="10" max="40">
  <input id="num" type="number" min="10" max="40" style="width: 60px">
  <p id="preview">Preview text</p>
\`;
const slider = document.getElementById('slider');
const num = document.getElementById('num');
const preview = document.getElementById('preview');

function render(size) {
  console.log('[View] render', size);
  slider.value = size;
  num.value = size;
  preview.style.fontSize = size + 'px';
}

// ===== BINDINGS =====
model.subscribe(render); // model -> view

// view -> model
slider.addEventListener('input', () => model.setSize(Number(slider.value)));
num.addEventListener('input', () => model.setSize(Number(num.value)));

render(model.size);`,
    },
  },

  // ------------------------------------------------------------------ 5
  {
    id: 'ui-is-function-of-state',
    section: 'Foundations',
    title: 'UI = f(state): retained vs re-render',
    explain: `
      <p>There are two basic ways to keep a screen up to date.</p>
      <h3>1. Imperative / retained: patch what changed</h3>
      <p>The DOM is a long-lived ("retained") tree. Each event handler figures out
      <em>which</em> nodes to change and changes them: append this <code>li</code>, update
      that counter, hide that message. This is how most jQuery-era code, and classic MVC views,
      work.</p>
      <p>The problem: with <em>N</em> events and <em>M</em> pieces of UI, you have to get up to
      <em>N × M</em> little updates right. Miss one and the screen drifts away from the data.
      </p>

      <h3>2. Declarative: UI = f(state)</h3>
      <p>Keep all the data in one <strong>state</strong> object and write a single function
      <code>view(state)</code> that returns what the <em>whole</em> screen should look like.
      Every event just produces a new state and calls <code>view</code> again. The same state
      always gives the same screen, just like <code>f(x)</code> in maths.</p>
      <pre><code>state ──► view(state) ──► screen
  ▲                         │
  └──── event: new state ◄──┘</code></pre>
      <p>This idea was popularised for the web by React (2013) and is the heart of Elm, Redux,
      MVI, SwiftUI, Jetpack Compose and Flutter. Instead of "how do I get from the old screen
      to the new one?", you only answer "what should the screen look like for this state?"
      </p>

      <h3>Analogy</h3>
      <p>Imperative is <strong>editing a painting</strong>: to show a new scene, you paint over
      only the bits that changed and hope you didn't miss a spot. Declarative is a
      <strong>photocopier</strong>: every time the original changes, print a fresh copy. The
      copy can never be "half updated".</p>

      <div class="warn">Throwing away and rebuilding the DOM has costs: it can be slow for big
      pages, and it loses anything the DOM remembered that you didn't keep in state (typed text,
      focus, scroll position). Real libraries (React, Vue, Elm...) compare the new description
      with the old one (a <strong>virtual DOM diff</strong>, or compiled fine-grained updates
      in Svelte / Solid) and patch only the differences, so you <em>write</em> declarative code
      but the browser gets minimal imperative patches.</div>
    `,
    examples: [
      {
        title: 'Same cart, two styles (find the imperative bug)',
        code: `// Same mini cart, built two ways. Click the same buttons on both sides and compare.
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="display: flex; gap: 16px">
    <div id="imp" style="flex: 1; border: 1px solid #ccc; padding: 8px">
      <b>A. Imperative (patch the DOM)</b><br>
      <button id="impAdd">Add</button> <button id="impClear">Clear</button>
      <p>Items: <span id="impCount">0</span></p>
      <p id="impEmpty">Cart is empty</p>
      <ul id="impList"></ul>
    </div>
    <div id="decl" style="flex: 1; border: 1px solid #ccc; padding: 8px"></div>
  </div>
\`;

// ===== A. IMPERATIVE / RETAINED: every handler must patch the right nodes =====
const imp = { items: [] };
const $ = id => document.getElementById(id);

$('impAdd').onclick = () => {
  imp.items.push('Item ' + (imp.items.length + 1));
  const li = document.createElement('li');
  li.textContent = imp.items[imp.items.length - 1];
  $('impList').append(li); // patch 1
  $('impCount').textContent = imp.items.length; // patch 2
  $('impEmpty').hidden = true; // patch 3
  console.log('[Imperative] add: patched 3 DOM nodes');
};

$('impClear').onclick = () => {
  imp.items = [];
  $('impList').innerHTML = ''; // patch 1
  $('impCount').textContent = 0; // patch 2
  // forgot: $('impEmpty').hidden = false;
  console.log('[Imperative] clear: patched 2 DOM nodes (forgot one!)');
};

// ===== B. DECLARATIVE: UI = f(state). One function draws everything. =====
let state = { items: [] };

function view(s) {
  return \`
    <b>B. Declarative (re-render)</b><br>
    <button data-act="add">Add</button> <button data-act="clear">Clear</button>
    <p>Items: \${s.items.length}</p>
    \${s.items.length === 0 ? '<p>Cart is empty</p>' : ''}
    <ul>\${s.items.map(item => \`<li>\${item}</li>\`).join('')}</ul>
  \`;
}

function setState(next) {
  state = next;
  console.log('[Render] state =', JSON.stringify(state));
  $('decl').innerHTML = view(state); // throw away old DOM, draw new DOM
}

// one listener on the container: survives every re-render ("event delegation")
$('decl').onclick = (e) => {
  const act = e.target.dataset.act;
  const nextItem = 'Item ' + (state.items.length + 1);
  if (act === 'add') setState({ items: [...state.items, nextItem] });
  if (act === 'clear') setState({ items: [] });
};

setState(state);`,
        explain: `
          <details>
            <summary>The problem: every handler must remember every node</summary>
            <p>Click <b>Add</b>, <b>Add</b>, <b>Clear</b> on both sides:</p>
            <table>
              <tr><th>Click</th><th>A. Imperative</th><th>B. Declarative</th></tr>
              <tr><td>Load</td><td>Items: 0, "Cart is empty"</td>
                <td><code>[Render] state = {"items":[]}</code> → Items: 0, "Cart is empty"</td></tr>
              <tr><td>Add</td><td><code>[Imperative] add: patched 3 DOM nodes</code><br>
                Items: 1, message hidden</td>
                <td><code>[Render] state = {"items":["Item 1"]}</code></td></tr>
              <tr><td>Add</td><td>same log, Items: 2</td>
                <td><code>[Render] state = {"items":["Item 1","Item 2"]}</code></td></tr>
              <tr><td>Clear</td>
                <td><code>[Imperative] clear: patched 2 DOM nodes (forgot one!)</code><br>
                Items: 0 but <strong>no "Cart is empty" ❌</strong></td>
                <td><code>[Render] state = {"items":[]}</code><br>Items: 0, "Cart is empty" ✅
                </td></tr>
            </table>
            <p>The imperative side needs to know the <em>previous</em> screen to compute the
            next one. The declarative side only needs the current state.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>function view(s) {                           // ① pure: state in, HTML out
  return \`... \${s.items.length === 0 ? '&lt;p&gt;Cart is empty&lt;/p&gt;' : ''} ...\`;
}

function setState(next) {
  state = next;                                // ② replace the state
  $('decl').innerHTML = view(state);           // ③ redraw EVERYTHING
}

$('decl').onclick = (e) =&gt; { ... };            // ④ one listener on the container</code></pre>
            <ol>
              <li><strong>①</strong> The "empty" message is a plain <code>if</code> on state. It
              can't be forgotten because it is recomputed on every render.</li>
              <li><strong>②</strong> Handlers create a <em>new</em> state object
              (<code>[...state.items, x]</code>) rather than poking at the DOM.</li>
              <li><strong>③</strong> The old buttons and list are destroyed and rebuilt.</li>
              <li><strong>④</strong> Because the buttons are recreated, listeners attached to
              them would be lost. <strong>Event delegation</strong> puts one listener on the
              container, which survives, and checks <code>e.target.dataset.act</code>.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'The cost of re-rendering: the DOM forgets what state does not hold',
        code: `// The price of "throw away and redraw": the DOM forgets things YOU didn't store in state.
// Type in the box, then click "Tick" (a re-render). Watch what happens to your text.
let state = { ticks: 0, keepDraft: false, draft: '' };
const esc = t => t.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function view(s) {
  return \`
    <p>Ticks: \${s.ticks}</p>
    <input id="draft" placeholder="type here" value="\${s.keepDraft ? esc(s.draft) : ''}">
    <button id="tick">Tick (re-render)</button>
    <label><input type="checkbox" id="keep" \${s.keepDraft ? 'checked' : ''}>
      store the draft in state</label>
  \`;
}

const root = document.getElementById('root');

function render() {
  console.log('[Render]', JSON.stringify(state));
  root.innerHTML = view(state);
}

root.addEventListener('input', (e) => {
  // remember the text in state, but don't re-render while typing
  if (e.target.id === 'draft' && state.keepDraft) state.draft = e.target.value;
});

root.addEventListener('click', (e) => {
  if (e.target.id === 'tick') {
    state = { ...state, ticks: state.ticks + 1 };
    render();
  }
  if (e.target.id === 'keep') {
    state = { ...state, keepDraft: e.target.checked, draft: '' };
    render();
  }
});

render();`,
        explain: `
          <details>
            <summary>Step by step: where did my text go?</summary>
            <table>
              <tr><th>Action</th><th>state</th><th>Input shows</th></tr>
              <tr><td>Load</td><td><code>{"ticks":0,"keepDraft":false,"draft":""}</code></td>
                <td>empty</td></tr>
              <tr><td>Type "hi"</td><td>unchanged (draft isn't stored)</td><td>hi</td></tr>
              <tr><td>Tick</td><td><code>{"ticks":1,...,"draft":""}</code></td>
                <td><strong>empty ❌</strong>: a brand-new input was created</td></tr>
              <tr><td>Tick the checkbox, type "hi", Tick</td>
                <td><code>{"ticks":2,"keepDraft":true,"draft":"hi"}</code></td>
                <td>hi ✅: the text lives in state, so view() puts it back</td></tr>
            </table>
            <div class="tip">Rule of thumb for UI = f(state): <strong>anything that must
            survive a re-render must live in state</strong>. That is why React forms use
            "controlled inputs" (value + onChange). Libraries with DOM diffing keep the same
            input element when it didn't change, so focus and cursor survive too; our naive
            <code>innerHTML</code> version can't.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does "UI = f(state)" mean?',
        options: ['The UI is written in a functional language', 'The screen is computed from the current state by one function; same state, same screen',
          'Every button needs a function', 'The UI stores the state'],
        answer: 1,
        why: 'You describe the whole screen for a given state. Events change state, and the view is recomputed.',
      },
      {
        q: 'Why did the imperative Clear forget the "Cart is empty" message?',
        options: ['innerHTML is buggy', 'Each handler must manually patch every affected node, and one was missed',
          'hidden does not work', 'The state was wrong'],
        answer: 1,
        why: 'Imperative updates depend on remembering every node each event affects. The state was fine; the screen drifted.',
      },
      {
        q: 'In the declarative panel, why is the click listener on the container instead of each button?',
        options: ['It is faster to type', 'Buttons are destroyed and recreated on every render, so their listeners would be lost',
          'Buttons cannot have listeners', 'To avoid event bubbling'],
        answer: 1,
        why: 'innerHTML replaces the buttons. The container survives, and clicks bubble up to it (event delegation).',
      },
      {
        q: 'What is a real downside of naive "rebuild everything" rendering?',
        options: ['It cannot show lists', 'It loses DOM-only state like typed text and focus, and can be slow for big pages',
          'It needs a server', 'It only works with React'],
        answer: 1,
        why: 'Anything not in state is thrown away. Real libraries diff and patch to keep DOM nodes that did not change.',
      },
    ],
    exercise: {
      task: `
        <p>Extend the declarative cart:</p>
        <ul>
          <li>A <b>Remove last</b> button (<code>data-act="pop"</code>) that removes the last
          item. Bonus: disable it when the cart is empty.</li>
          <li>A line <b>Total: $N</b> where each item costs $3.</li>
        </ul>
        <p>You should only need to touch <code>view()</code> and the click handler. No DOM
        patching!</p>
      `,
      starter: `// ===== STATE =====
let state = { items: [] };

// ===== VIEW: a pure function of state =====
// TODO 1: add a "Remove last" button with data-act="pop"
// TODO 2: show "Total: $N" where every item costs $3
function view(s) {
  return \`
    <button data-act="add">Add</button>
    <button data-act="clear">Clear</button>
    <p>Items: \${s.items.length}</p>
    \${s.items.length === 0 ? '<p>Cart is empty</p>' : ''}
    <ul>\${s.items.map(item => \`<li>\${item}</li>\`).join('')}</ul>
  \`;
}

// ===== RENDER LOOP =====
const root = document.getElementById('root');

function setState(next) {
  state = next;
  console.log('[Render] state =', JSON.stringify(state));
  root.innerHTML = view(state);
}

root.onclick = (e) => {
  const act = e.target.dataset.act;
  const nextItem = 'Item ' + (state.items.length + 1);
  if (act === 'add') setState({ items: [...state.items, nextItem] });
  if (act === 'clear') setState({ items: [] });
  // TODO 3: handle 'pop' -> a NEW array without the last item
};

setState(state);`,
      hint: 'In view(): add the button and &lt;p&gt;Total: $${s.items.length * 3}&lt;/p&gt; (inside a template literal, "$" followed by "${" prints a dollar sign then the value). In the handler: if (act === "pop") setState({ items: state.items.slice(0, -1) }).',
      solution: `// ===== STATE =====
let state = { items: [] };
const PRICE = 3;

// ===== VIEW: a pure function of state =====
function view(s) {
  return \`
    <button data-act="add">Add</button>
    <button data-act="clear">Clear</button>
    <button data-act="pop" \${s.items.length === 0 ? 'disabled' : ''}>Remove last</button>
    <p>Items: \${s.items.length}</p>
    <p>Total: $\${s.items.length * PRICE}</p>
    \${s.items.length === 0 ? '<p>Cart is empty</p>' : ''}
    <ul>\${s.items.map(item => \`<li>\${item}</li>\`).join('')}</ul>
  \`;
}

// ===== RENDER LOOP =====
const root = document.getElementById('root');

function setState(next) {
  state = next;
  console.log('[Render] state =', JSON.stringify(state));
  root.innerHTML = view(state);
}

root.onclick = (e) => {
  const act = e.target.dataset.act;
  const nextItem = 'Item ' + (state.items.length + 1);
  if (act === 'add') setState({ items: [...state.items, nextItem] });
  if (act === 'clear') setState({ items: [] });
  if (act === 'pop') setState({ items: state.items.slice(0, -1) });
};

setState(state);`,
    },
  },
);
