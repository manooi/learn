// Section: MVC family — classic MVC, web MVC, its pitfalls, and MVP.
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ------------------------------------------------------------------ 1
  {
    id: 'mvc-classic',
    section: 'MVC family',
    title: 'Classic MVC (Smalltalk, 1979)',
    explain: `
      <p><strong>Model-View-Controller</strong> is the grandparent of every pattern in this
      course. It was formulated by <strong>Trygve Reenskaug</strong>, a Norwegian computer
      scientist, while he was a visiting scientist at <strong>Xerox PARC</strong> in 1978–79,
      working with the Smalltalk group. His first note called it "Thing-Model-View-Editor";
      by his December 1979 note it had become "Models-Views-Controllers". MVC then became part
      of the <strong>Smalltalk-80</strong> class library, and was later explained to the wider
      world in Krasner &amp; Pope's 1988 "cookbook" article.</p>
      <p>Reenskaug's goal was to let a user see and manipulate the computer's information
      ("the model") in a way that matched their own mental picture of it, through several
      views at once.</p>

      <h3>The three roles</h3>
      <ul>
        <li><strong>Model</strong>: the data and the rules. When it changes, it
        <em>announces</em> "I changed" to everyone that depends on it. (In Smalltalk-80:
        <code>self changed</code>, and each dependent receives <code>update:</code>.) It knows
        nothing about how it is shown.</li>
        <li><strong>View</strong>: draws (part of) the model on screen. It
        <strong>observes the model directly</strong>, and on <code>update</code> it
        <em>reads</em> what it needs from the model and redraws. It never changes the model.
        </li>
        <li><strong>Controller</strong>: handles user input (mouse, keyboard) and turns it into
        calls on the model: <code>model.increment()</code>. It does not draw.</li>
      </ul>
      <pre><code>  user input
      │
      ▼
 Controller ──increment()──► Model
                               │ changed → update()   (observer)
                               ▼
                             View ──reads model.count──► screen</code></pre>
      <p>Note the triangle: the View gets its information from the <strong>Model</strong>,
      not from the Controller. That's the "classic" part. Many later "MVC"s (Apple's Cocoa,
      web frameworks) route everything through the Controller instead, which is quite a
      different design with the same name.</p>

      <h3>Analogy: a scoreboard</h3>
      <p>The referee (Controller) watches the game and says "goal for home!". The official
      score sheet (Model) is updated and a bell rings. Every scoreboard in the stadium (Views)
      hears the bell, looks at the score sheet and shows the new score. The referee never
      touches the scoreboards.</p>

      <div class="tip">In Smalltalk-80, Views and Controllers came in <strong>pairs</strong>:
      each view on screen had its own controller for the input over that area. With modern
      widgets (a button already handles its own clicks), that split feels artificial, which is
      one reason MVP and MVVM appeared.</div>
      <div class="warn">"MVC" is the most overloaded name in software. When someone says MVC,
      ask: <em>does the View observe the Model (classic), or does the Controller hand data to
      the View (Cocoa / web)?</em></div>
    `,
    examples: [
      {
        title: 'Counter: one Model, two Views, one Controller',
        code: `// Classic (Smalltalk-style) MVC: a counter with TWO views of one model.
// Smalltalk-80 names: the model calls changed(); each dependent view gets update().

// ===== MODEL (data + rules + list of dependents; knows no DOM) =====
class CounterModel {
  constructor() {
    this.count = 0;
    this.dependents = []; // the observers (views)
  }

  addDependent(view) {
    this.dependents.push(view);
  }

  changed() {
    console.log(\`[Model] changed -> notify \${this.dependents.length} view(s)\`);
    this.dependents.forEach(view => view.update(this));
  }

  increment() {
    this.count++;
    console.log('[Model] increment -> count =', this.count);
    this.changed();
  }

  reset() {
    this.count = 0;
    console.log('[Model] reset -> count = 0');
    this.changed();
  }
}

// ===== VIEWS (read the model and draw; never change it) =====
class NumberView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Number] update, reads model.count =', model.count);
    this.el.textContent = model.count;
  }
}

class StarsView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Stars] update, reads model.count =', model.count);
    this.el.textContent = '★'.repeat(model.count) || '(none)';
  }
}

// ===== CONTROLLER (handles user input; tells the model what to do) =====
class CounterController {
  constructor(model, buttons) {
    this.model = model;
    buttons.plus.addEventListener('click', () => {
      console.log('[Controller] click "+1" -> model.increment()');
      this.model.increment();
    });
    buttons.reset.addEventListener('click', () => {
      console.log('[Controller] click "Reset" -> model.reset()');
      this.model.reset();
    });
  }
}

// ===== WIRING =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="plus">+1</button> <button id="reset">Reset</button>
  <h1 id="number"></h1>
  <p id="stars"></p>
\`;

const model = new CounterModel();
const numberView = new NumberView(document.getElementById('number'));
const starsView = new StarsView(document.getElementById('stars'));
model.addDependent(numberView);
model.addDependent(starsView);
new CounterController(model, {
  plus: document.getElementById('plus'),
  reset: document.getElementById('reset'),
});

model.changed(); // first draw`,
        explain: `
          <details>
            <summary>Step by step: from the click on <b>+1</b> to the screen</summary>
            <p>Page load first registers the two views as dependents, then calls
            <code>model.changed()</code> once to draw:</p>
            <pre><code>[Model] changed -&gt; notify 2 view(s)
[View:Number] update, reads model.count = 0
[View:Stars] update, reads model.count = 0</code></pre>
            <p>Now click <b>+1</b>:</p>
            <table>
              <tr><th>#</th><th>Who runs</th><th>What it does</th><th>Console</th></tr>
              <tr><td>1</td><td>Browser</td><td>fires <code>click</code> on the +1 button
                </td><td></td></tr>
              <tr><td>2</td><td>Controller</td><td>its listener translates the click into a
                model call</td><td><code>[Controller] click "+1" -&gt; model.increment()</code>
                </td></tr>
              <tr><td>3</td><td>Model</td><td><code>count++</code> (0 → 1)</td>
                <td><code>[Model] increment -&gt; count = 1</code></td></tr>
              <tr><td>4</td><td>Model</td><td><code>changed()</code> loops over dependents
                </td><td><code>[Model] changed -&gt; notify 2 view(s)</code></td></tr>
              <tr><td>5</td><td>NumberView</td><td><code>update(model)</code>: reads
                <code>model.count</code>, sets the h1</td>
                <td><code>[View:Number] update, reads model.count = 1</code></td></tr>
              <tr><td>6</td><td>StarsView</td><td><code>update(model)</code>: reads, draws
                ★</td><td><code>[View:Stars] update, reads model.count = 1</code></td></tr>
              <tr><td>7</td><td>Browser</td><td>the click handler returns; the browser paints
                "1" and "★"</td><td></td></tr>
            </table>
            <p>All of steps 2–6 run <strong>synchronously</strong> inside one click handler.
            The screen updates once, at the end.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>// MODEL
changed() {
  this.dependents.forEach(view =&gt; view.update(this));   // ① broadcast, pass itself
}

// VIEW
update(model) {
  this.el.textContent = model.count;                    // ② PULL what I need
}

// CONTROLLER
buttons.plus.addEventListener('click', () =&gt; {
  this.model.increment();                               // ③ input → model call
});</code></pre>
            <ol>
              <li><strong>①</strong> The Model doesn't say <em>what</em> changed or
              <em>how</em> to draw it. It just says "I changed" and passes itself.</li>
              <li><strong>②</strong> Each View decides what to read. NumberView reads
              <code>count</code>; a different view could read something else from the same
              model.</li>
              <li><strong>③</strong> The Controller never calls
              <code>numberView.update()</code>. It only talks to the Model; the observer
              mechanism does the rest.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>setTimeout(() =&gt; model.increment(), 2000);</code> at the bottom.
              Both views update, even though no controller was involved. Any change to the
              model, from anywhere, reaches every view.</li>
              <li>Comment out <code>model.addDependent(starsView);</code>. The stars stop
              updating, but nothing else breaks.</li>
            </ul>
            <div class="warn">Common mistake: letting the Controller also set
            <code>el.textContent</code> "to be quick". Now there are two ways the screen
            changes, and a change that comes from somewhere else (the timer above) won't go
            through the controller's shortcut.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Who formulated MVC, and where?',
        options: ['Martin Fowler at ThoughtWorks', 'Trygve Reenskaug at Xerox PARC',
          'Alan Turing at Bletchley Park', 'DHH at 37signals'],
        answer: 1,
        why: 'Trygve Reenskaug, as a visiting scientist at Xerox PARC in 1978–79, working with the Smalltalk group.',
      },
      {
        q: 'In classic MVC, how does a View find out that it must redraw?',
        options: ['The Controller calls view.render()', 'It observes the Model and gets update() when the Model changes',
          'It polls every second', 'The user refreshes the page'],
        answer: 1,
        why: 'Views register as dependents (observers) of the Model. The Model broadcasts changed; each View pulls the new data.',
      },
      {
        q: 'What is the Controller responsible for in classic MVC?',
        options: ['Drawing the UI', 'Storing the data', 'Handling user input and calling the Model',
          'Talking to the database only'],
        answer: 2,
        why: 'It interprets mouse/keyboard input and turns it into Model operations. It does not draw.',
      },
      {
        q: 'In the example, which log line comes right after <code>[Model] increment -&gt; count = 1</code>?',
        options: ['[View:Number] update, reads model.count = 1', '[Controller] click "+1" -> model.increment()',
          '[Model] changed -> notify 2 view(s)', '[View:Stars] update, reads model.count = 1'],
        answer: 2,
        why: 'increment() calls changed(), which logs before it loops over the views.',
      },
    ],
    exercise: {
      task: `
        <p>Extend the classic MVC counter:</p>
        <ol>
          <li>Add a <b>-1</b> button, handled by the Controller.</li>
          <li>The rule <em>"the count can never go below 0"</em> must live in the
          <strong>Model</strong> (<code>decrement()</code>), not in the Controller.</li>
          <li>Add a third View, <code>ParityView</code>, that shows "even" or "odd". You should
          not need to change the Model to support it.</li>
        </ol>
      `,
      starter: `// Classic (Smalltalk-style) MVC: a counter with TWO views of one model.
// Smalltalk-80 names: the model calls changed(); each dependent view gets update().

// ===== MODEL (data + rules + list of dependents; knows no DOM) =====
class CounterModel {
  constructor() {
    this.count = 0;
    this.dependents = []; // the observers (views)
  }

  addDependent(view) {
    this.dependents.push(view);
  }

  changed() {
    console.log(\`[Model] changed -> notify \${this.dependents.length} view(s)\`);
    this.dependents.forEach(view => view.update(this));
  }

  increment() {
    this.count++;
    console.log('[Model] increment -> count =', this.count);
    this.changed();
  }

  reset() {
    this.count = 0;
    console.log('[Model] reset -> count = 0');
    this.changed();
  }
}

// ===== VIEWS (read the model and draw; never change it) =====
class NumberView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Number] update, reads model.count =', model.count);
    this.el.textContent = model.count;
  }
}

class StarsView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Stars] update, reads model.count =', model.count);
    this.el.textContent = '★'.repeat(model.count) || '(none)';
  }
}

// ===== CONTROLLER (handles user input; tells the model what to do) =====
class CounterController {
  constructor(model, buttons) {
    this.model = model;
    buttons.plus.addEventListener('click', () => {
      console.log('[Controller] click "+1" -> model.increment()');
      this.model.increment();
    });
    buttons.reset.addEventListener('click', () => {
      console.log('[Controller] click "Reset" -> model.reset()');
      this.model.reset();
    });
  }
}

// ===== WIRING =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="plus">+1</button> <button id="reset">Reset</button>
  <h1 id="number"></h1>
  <p id="stars"></p>
\`;

const model = new CounterModel();
const numberView = new NumberView(document.getElementById('number'));
const starsView = new StarsView(document.getElementById('stars'));
model.addDependent(numberView);
model.addDependent(starsView);
new CounterController(model, {
  plus: document.getElementById('plus'),
  reset: document.getElementById('reset'),
});

model.changed(); // first draw`,
      hint: 'decrement() { if (this.count === 0) return; this.count--; this.changed(); }. ParityView is a copy of NumberView whose update() writes model.count % 2 === 0 ? "even" : "odd". Register it with model.addDependent(...).',
      solution: `// Classic (Smalltalk-style) MVC: a counter with TWO views of one model.
// Smalltalk-80 names: the model calls changed(); each dependent view gets update().

// ===== MODEL (data + rules + list of dependents; knows no DOM) =====
class CounterModel {
  constructor() {
    this.count = 0;
    this.dependents = []; // the observers (views)
  }

  addDependent(view) {
    this.dependents.push(view);
  }

  changed() {
    console.log(\`[Model] changed -> notify \${this.dependents.length} view(s)\`);
    this.dependents.forEach(view => view.update(this));
  }

  increment() {
    this.count++;
    console.log('[Model] increment -> count =', this.count);
    this.changed();
  }

  // NEW: the "never below zero" rule lives in the MODEL
  decrement() {
    if (this.count === 0) {
      console.log('[Model] decrement refused: already 0');
      return;
    }
    this.count--;
    console.log('[Model] decrement -> count =', this.count);
    this.changed();
  }

  reset() {
    this.count = 0;
    console.log('[Model] reset -> count = 0');
    this.changed();
  }
}

// ===== VIEWS (read the model and draw; never change it) =====
class NumberView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Number] update, reads model.count =', model.count);
    this.el.textContent = model.count;
  }
}

class StarsView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    console.log('[View:Stars] update, reads model.count =', model.count);
    this.el.textContent = '★'.repeat(model.count) || '(none)';
  }
}

// NEW: a third view. The model did not change at all to support it.
class ParityView {
  constructor(el) {
    this.el = el;
  }

  update(model) {
    const text = model.count % 2 === 0 ? 'even' : 'odd';
    console.log('[View:Parity] update ->', text);
    this.el.textContent = text;
  }
}

// ===== CONTROLLER (handles user input; tells the model what to do) =====
class CounterController {
  constructor(model, buttons) {
    this.model = model;
    buttons.plus.addEventListener('click', () => {
      console.log('[Controller] click "+1" -> model.increment()');
      this.model.increment();
    });
    buttons.minus.addEventListener('click', () => {
      console.log('[Controller] click "-1" -> model.decrement()');
      this.model.decrement();
    });
    buttons.reset.addEventListener('click', () => {
      console.log('[Controller] click "Reset" -> model.reset()');
      this.model.reset();
    });
  }
}

// ===== WIRING =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="minus">-1</button> <button id="plus">+1</button>
  <button id="reset">Reset</button>
  <h1 id="number"></h1>
  <p id="stars"></p>
  <p id="parity"></p>
\`;

const model = new CounterModel();
const numberView = new NumberView(document.getElementById('number'));
const starsView = new StarsView(document.getElementById('stars'));
model.addDependent(numberView);
model.addDependent(starsView);
model.addDependent(new ParityView(document.getElementById('parity')));
new CounterController(model, {
  plus: document.getElementById('plus'),
  minus: document.getElementById('minus'),
  reset: document.getElementById('reset'),
});

model.changed(); // first draw`,
    },
  },

  // ------------------------------------------------------------------ 2
  {
    id: 'mvc-web',
    section: 'MVC family',
    title: 'Web MVC: Rails, Express, Spring, ASP.NET, Laravel, Django (MTV)',
    explain: `
      <p>When MVC moved to the web server, the names stayed but the shape changed. A web page
      isn't a live window on the model. It's a <strong>request</strong> followed by a
      <strong>response</strong>, and then the server forgets about you.</p>
      <pre><code>Browser ─HTTP request─► Router ─► Controller ─► Model (DB)
                                    │
                                    ▼
Browser ◄─HTML response─────── View (template)</code></pre>
      <ol>
        <li>The <strong>router</strong> maps method + URL (<code>GET /posts/2</code>) to a
        controller action (<code>PostsController#show</code>).</li>
        <li>The <strong>controller action</strong> reads the request (params, form body),
        calls the <strong>model</strong>, and picks a view.</li>
        <li>The <strong>model</strong> holds rules and talks to the database (often through an
        ORM: ActiveRecord, Eloquent, Entity Framework, Django ORM, JPA/Hibernate...).</li>
        <li>The <strong>view</strong> is a <em>template</em> that turns data into HTML.</li>
        <li>The HTML goes back and the browser draws a <strong>whole new page</strong>.</li>
      </ol>
      <div class="warn">The big difference from classic MVC: there is <strong>no live
      observer</strong>. The View doesn't watch the Model. The Controller fetches data and
      hands it to the template once per request. If the data changes a second later, nobody
      is notified; you see it on the next request.</div>

      <h3>Same shape, different frameworks</h3>
      <table>
        <tr><th>Framework</th><th>Router</th><th>Controller</th><th>Model</th><th>View</th></tr>
        <tr><td>Ruby on Rails</td><td><code>config/routes.rb</code></td>
          <td><code>PostsController#show</code></td><td>ActiveRecord</td><td>ERB templates</td></tr>
        <tr><td>Laravel (PHP)</td><td><code>routes/web.php</code></td><td>Controller classes</td>
          <td>Eloquent</td><td>Blade</td></tr>
        <tr><td>Spring MVC (Java)</td><td><code>@GetMapping</code> on methods</td>
          <td><code>@Controller</code> classes (behind a <code>DispatcherServlet</code>)</td>
          <td>your classes + JPA</td><td>Thymeleaf, JSP...</td></tr>
        <tr><td>ASP.NET Core MVC (C#)</td><td>route templates / attributes</td>
          <td><code>Controller</code> classes</td><td>your classes + EF Core</td>
          <td>Razor <code>.cshtml</code></td></tr>
        <tr><td>Express (Node.js)</td><td><code>app.get('/posts/:id', ...)</code></td>
          <td>route handler functions</td><td>whatever you choose</td>
          <td><code>res.render()</code> + Pug/EJS...</td></tr>
        <tr><td>Django (Python)</td><td><code>urls.py</code></td><td>a <em>"view"</em>
          function/class!</td><td>Django models</td><td><em>"template"</em></td></tr>
      </table>
      <p><strong>Express</strong> is deliberately minimal and unopinionated: it gives you a
      router and <code>res.render</code>, and MVC is a folder convention you choose to follow.
      </p>
      <p><strong>Django calls it MTV</strong>: Model-Template-View. What Rails calls a
      "controller", Django calls a <em>view</em> (it decides <em>which</em> data you see), and
      what Rails calls a "view", Django calls a <em>template</em> (it decides <em>how</em> it
      looks). Django's FAQ says that, if anything, the framework itself plays the controller.
      Same ideas, different labels.</p>
      <div class="tip">Historical note: this request/response flavour spread through Java's
      "Model 2" (servlets + JSP) and Struts around 1999–2000, and Rails (2004) made it
      mainstream. Rails' conventions then inspired many frameworks, including Laravel and
      ASP.NET MVC.</div>
    `,
    examples: [
      {
        title: 'Animation: an HTTP request travelling through the boxes',
        lang: 'html',
        code: `<style>
  .row { display: flex; gap: 6px; align-items: stretch; margin: 10px 0; }
  .node {
    flex: 1; padding: 10px 4px; border: 2px solid #b8bdd0; border-radius: 10px;
    text-align: center; font-size: 13px; background: #f4f5f9; transition: .25s;
  }
  .node b { display: block; font-size: 15px; }
  .node.active { border-color: #e07b00; background: #fff1dc; transform: scale(1.06); }
  .node.done { border-color: #6aa36f; background: #eef8ef; }
  #msg { padding: 10px 14px; border-left: 4px solid #e07b00; background: #fafafa;
    min-height: 64px; font-size: 14px; }
  #msg code { background: #eee; padding: 0 4px; border-radius: 4px; }
  .controls { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
</style>

<div class="controls">
  <select id="scenario">
    <option value="show">GET /posts/2 (show a post)</option>
    <option value="create">POST /posts (create, then redirect)</option>
  </select>
  <button id="prev">&larr; Prev</button>
  <button id="next">Next &rarr;</button>
  <button id="play">Play</button>
  <span id="count"></span>
</div>

<div class="row">
  <div class="node" id="browser"><b>Browser</b>user</div>
  <div class="node" id="router"><b>Router</b>URL &rarr; action</div>
  <div class="node" id="controller"><b>Controller</b>action method</div>
  <div class="node" id="model"><b>Model</b>+ database</div>
  <div class="node" id="view"><b>View</b>template</div>
</div>
<div id="msg"></div>

<script>
  const SCENARIOS = {
    show: [
      ['browser', 'You click a link. The browser sends ' +
        '<code>GET /posts/2</code> over HTTP.'],
      ['router', 'The router matches <code>GET /posts/:id</code> and picks ' +
        '<code>PostsController#show</code> with <code>params = { id: "2" }</code>.'],
      ['controller', '<code>show()</code> runs. It reads <code>params.id</code> ' +
        'and asks the Model for that post.'],
      ['model', '<code>Post.find(2)</code> runs a query, e.g. ' +
        '<code>SELECT * FROM posts WHERE id = 2</code>, and returns an object.'],
      ['controller', 'The controller got the post. It chooses a template ' +
        '(<code>posts/show</code>) and hands it the data.'],
      ['view', 'The template fills the post into HTML. ' +
        'It only displays; it decides nothing.'],
      ['browser', 'The response <code>200 OK</code> + HTML goes back. ' +
        'The browser draws a <strong>whole new page</strong>. ' +
        'The server forgets you until the next request.'],
    ],
    create: [
      ['browser', 'You submit the form: <code>POST /posts</code> with ' +
        '<code>title=Hello</code> in the body.'],
      ['router', 'Router matches <code>POST /posts</code> &rarr; ' +
        '<code>PostsController#create</code>.'],
      ['controller', '<code>create()</code> passes the submitted fields to the Model.'],
      ['model', '<code>Post.create()</code> validates (title required) and ' +
        '<code>INSERT</code>s a row. Returns the new post (id 3).'],
      ['controller', 'Success! Instead of rendering, it answers ' +
        '<code>303 See Other, Location: /posts/3</code> (redirect after POST).'],
      ['browser', 'The browser automatically sends a new request: ' +
        '<code>GET /posts/3</code>. ' +
        'Refreshing now won\\'t re-submit the form.'],
      ['router', 'A brand-new request/response cycle starts: ' +
        '<code>PostsController#show</code> ... &rarr; View &rarr; HTML.'],
    ],
  };

  let steps = SCENARIOS.show;
  let i = 0;
  let timer = null;

  function draw() {
    const [active, text] = steps[i];
    const seen = steps.slice(0, i).map(s => s[0]);
    document.querySelectorAll('.node').forEach(n => {
      n.classList.toggle('active', n.id === active);
      n.classList.toggle('done', n.id !== active && seen.includes(n.id));
    });
    document.getElementById('msg').innerHTML = text;
    document.getElementById('count').textContent = \`step \${i + 1} / \${steps.length}\`;
    console.log(\`step \${i + 1}: \${active}\`);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    document.getElementById('play').textContent = 'Play';
  }

  document.getElementById('next').onclick = () => {
    stop();
    i = Math.min(i + 1, steps.length - 1);
    draw();
  };
  document.getElementById('prev').onclick = () => {
    stop();
    i = Math.max(i - 1, 0);
    draw();
  };
  document.getElementById('play').onclick = () => {
    if (timer) return stop();
    if (i === steps.length - 1) i = -1;
    document.getElementById('play').textContent = 'Pause';
    timer = setInterval(() => {
      if (i >= steps.length - 1) return stop();
      i++;
      draw();
    }, 1400);
  };
  document.getElementById('scenario').onchange = (e) => {
    stop();
    steps = SCENARIOS[e.target.value];
    i = 0;
    draw();
  };

  draw();
</script>`,
      },
      {
        title: 'A tiny simulated Rails/Express-style app (click links, submit the form)',
        code: `// A tiny server-side MVC framework, simulated in the browser.
// Every click is a "request"; every page is a freshly rendered HTML "response".

// ===== MODEL (data + rules; in real life: ActiveRecord, Eloquent, Django ORM...) =====
const db = {
  posts: [
    { id: 1, title: 'Hello MVC' },
    { id: 2, title: 'Routers are just lookup tables' },
  ],
};

const Post = {
  all() {
    console.log('[Model] Post.all() ->', db.posts.length, 'rows');
    return db.posts;
  },
  find(id) {
    const post = db.posts.find(p => p.id === id);
    console.log('[Model] Post.find(' + id + ') ->', post ? 'found' : 'null');
    return post;
  },
  create(fields) {
    const title = (fields.title || '').trim();
    if (!title) {
      console.log('[Model] Post.create rejected: title is required');
      return { errors: ['Title is required'] };
    }
    const post = { id: db.posts.length + 1, title };
    db.posts.push(post);
    console.log('[Model] Post.create -> id', post.id);
    return { post };
  },
};

// ===== VIEWS (templates: data in, HTML string out; no decisions) =====
const esc = s => String(s).replace(/[&<>"]/g, c => \`&#\${c.charCodeAt(0)};\`);

const templates = {
  'posts/index': ({ posts, errors = [] }) => \`
    <h3>All posts</h3>
    <ul>
      \${posts.map(p => \`<li><a href="/posts/\${p.id}">\${esc(p.title)}</a></li>\`).join('')}
    </ul>
    \${errors.map(e => \`<p style="color: crimson">\${esc(e)}</p>\`).join('')}
    <form method="post" action="/posts">
      <input name="title" placeholder="New title"> <button>Create</button>
    </form>
  \`,
  'posts/show': ({ post }) => \`
    <h3>\${esc(post.title)}</h3>
    <p>Post #\${post.id}</p>
    <a href="/posts">&larr; all posts</a>
  \`,
  'errors/404': ({ path }) => \`
    <h3>404 Not Found</h3>
    <p>No page at \${esc(path)}</p>
    <a href="/posts">home</a>
  \`,
};

function render(name, data) {
  console.log('[View] render template', JSON.stringify(name));
  return templates[name](data);
}

// ===== CONTROLLER (one method per action: read request, call model, pick a view) =====
const PostsController = {
  index() {
    return { status: 200, body: render('posts/index', { posts: Post.all() }) };
  },
  show(req) {
    const post = Post.find(Number(req.params.id));
    if (!post) return { status: 404, body: render('errors/404', { path: req.path }) };
    return { status: 200, body: render('posts/show', { post }) };
  },
  create(req) {
    const result = Post.create(req.body);
    if (result.errors) {
      const body = render('posts/index', { posts: Post.all(), errors: result.errors });
      return { status: 422, body };
    }
    return { status: 303, location: '/posts/' + result.post.id }; // redirect after POST
  },
};

// ===== ROUTER (method + URL pattern -> controller action) =====
const routes = [
  ['GET', '/posts', 'PostsController#index', PostsController.index],
  ['GET', '/posts/:id', 'PostsController#show', PostsController.show],
  ['POST', '/posts', 'PostsController#create', PostsController.create],
];

function route(req) {
  for (const [method, pattern, name, action] of routes) {
    const re = new RegExp('^' + pattern.replace(/:(\\w+)/g, '(?<$1>[^/]+)') + '$');
    const match = req.path.match(re);
    if (method === req.method && match) {
      req.params = { ...match.groups };
      const params = JSON.stringify(req.params);
      console.log(\`[Router] \${method} \${req.path} -> \${name} \${params}\`);
      return action(req);
    }
  }
  console.log(\`[Router] \${req.method} \${req.path} -> no route\`);
  return { status: 404, body: render('errors/404', { path: req.path }) };
}

// ===== "BROWSER" (address bar + page; sends requests, shows responses) =====
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="display: flex; gap: 4px">
    <input id="url" style="flex: 1; font-family: monospace"><button id="go">Go</button>
  </div>
  <div id="page" style="border: 1px solid #ccc; padding: 4px 10px; margin-top: 6px"></div>
\`;
const urlBar = document.getElementById('url');
const page = document.getElementById('page');

function request(method, path, body = {}) {
  const shown = method === 'POST' ? ' ' + JSON.stringify(body) : '';
  console.log(\`[Browser] \${method} \${path}\${shown}\`);
  const res = route({ method, path, body });
  console.log('[Browser] <- response', res.status);
  if (res.status === 303) {
    console.log('[Browser] redirected to', res.location);
    return request('GET', res.location);
  }
  urlBar.value = path;
  page.innerHTML = res.body; // the whole page is replaced: no live observer here
}

page.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  e.preventDefault();
  request('GET', link.getAttribute('href'));
});

page.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(e.target));
  request('POST', e.target.getAttribute('action'), fields);
});

document.getElementById('go').onclick = () => request('GET', urlBar.value);

request('GET', '/posts');`,
        explain: `
          <details>
            <summary>Step by step: the request lifecycle of <code>GET /posts/2</code></summary>
            <p>Click "Routers are just lookup tables" in the preview:</p>
            <table>
              <tr><th>#</th><th>Layer</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>Browser</td><td>link click intercepted → a request object
                <code>{ method: 'GET', path: '/posts/2' }</code></td>
                <td><code>[Browser] GET /posts/2</code></td></tr>
              <tr><td>2</td><td>Router</td><td>tries each route; <code>/posts/:id</code> becomes
                the regex <code>^/posts/(?&lt;id&gt;[^/]+)$</code> and matches</td>
                <td><code>[Router] GET /posts/2 -&gt; PostsController#show {"id":"2"}</code>
                </td></tr>
              <tr><td>3</td><td>Controller</td><td><code>show(req)</code> converts
                <code>"2"</code> to a number and asks the model</td><td></td></tr>
              <tr><td>4</td><td>Model</td><td>looks up the row</td>
                <td><code>[Model] Post.find(2) -&gt; found</code></td></tr>
              <tr><td>5</td><td>View</td><td>controller picks <code>posts/show</code>; the
                template returns an HTML string</td>
                <td><code>[View] render template "posts/show"</code></td></tr>
              <tr><td>6</td><td>Browser</td><td>gets <code>{ status: 200, body }</code>, replaces
                the whole page</td><td><code>[Browser] &lt;- response 200</code></td></tr>
            </table>
            <p>Type <code>/posts/9</code> in the address bar and press Go: step 4 logs
            <code>Post.find(9) -&gt; null</code>, and the controller picks the
            <code>errors/404</code> template instead, with status 404.</p>
          </details>
          <details>
            <summary>Step by step: <code>POST /posts</code> and redirect-after-POST</summary>
            <p>Type a title and click Create:</p>
            <pre><code>[Browser] POST /posts {"title":"My post"}
[Router] POST /posts -&gt; PostsController#create {}
[Model] Post.create -&gt; id 3
[Browser] &lt;- response 303
[Browser] redirected to /posts/3
[Browser] GET /posts/3
[Router] GET /posts/3 -&gt; PostsController#show {"id":"3"}
[Model] Post.find(3) -&gt; found
[View] render template "posts/show"
[Browser] &lt;- response 200</code></pre>
            <p>The create action does <em>not</em> render a page. It answers "go look at
            <code>/posts/3</code>" (a 303 redirect), and the browser makes a <strong>second,
            separate request</strong>. This <em>Post/Redirect/Get</em> pattern means
            refreshing the page won't submit the form twice.</p>
            <p>Submit an empty title: the model refuses (<code>[Model] Post.create rejected:
            title is required</code>), and the controller re-renders <code>posts/index</code>
            with the error and status 422.</p>
          </details>
          <details>
            <summary>Who is allowed to do what</summary>
            <ul>
              <li>The <strong>template</strong> only formats data it was given. It never calls
              <code>Post.find</code> itself.</li>
              <li>The <strong>model</strong> owns the rule "title is required". The controller
              just reports what the model said.</li>
              <li>The <strong>controller</strong> is glue: params in → model call → choose a
              template or a redirect.</li>
            </ul>
            <div class="warn">Templates in real frameworks (ERB, Blade, Razor, Django
            templates, Thymeleaf...) <strong>HTML-escape</strong> values by default. That's
            what <code>esc()</code> does here: try a title like <code>&lt;b&gt;hi&lt;/b&gt;</code>
            and it shows as text, not bold. Skipping escaping is how XSS bugs happen.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In web MVC, how does the View get its data?',
        options: ['It observes the Model live', 'The Controller passes data to the template once per request',
          'It queries the database itself', 'From the browser cookies'],
        answer: 1,
        why: 'There is no live observer. Each request, the controller fetches data from the model and hands it to the template.',
      },
      {
        q: 'In Django terms, what does a Django "view" roughly correspond to in Rails?',
        options: ['A template', 'A controller action', 'A model', 'A route'],
        answer: 1,
        why: 'Django uses Model-Template-View (MTV): the Django view decides which data to show (controller-like), and the template decides how it looks.',
      },
      {
        q: 'What does the router do?',
        options: ['Renders HTML', 'Maps an HTTP method + URL to a controller action', 'Validates form fields',
          'Stores sessions'],
        answer: 1,
        why: 'For example GET /posts/:id → PostsController#show with params { id }.',
      },
      {
        q: 'Why does the create action answer with a 303 redirect instead of rendering the page?',
        options: ['It is faster', 'So refreshing the resulting page does not re-submit the form (Post/Redirect/Get)',
          'Templates cannot render after POST', 'Browsers require it'],
        answer: 1,
        why: 'After the redirect the browser is on a normal GET page; refresh just repeats the GET.',
      },
      {
        q: 'Which of these is true about Express?',
        options: ['It forces a strict MVC folder structure', 'It is minimal; MVC is a convention you can choose to follow',
          'It has a built-in ORM', 'It is a Python framework'],
        answer: 1,
        why: 'Express gives you routing and res.render, but leaves models, folders and structure to you.',
      },
    ],
    exercise: {
      task: `
        <p>Add a <b>Delete</b> feature to the mini framework. It must touch every layer:</p>
        <ol>
          <li><strong>View</strong>: a form in <code>posts/show</code> that POSTs to
          <code>/posts/:id/delete</code>.</li>
          <li><strong>Router</strong>: a route <code>POST /posts/:id/delete</code> →
          <code>PostsController#destroy</code>.</li>
          <li><strong>Controller</strong>: <code>destroy(req)</code> calls the model, then
          redirects (303) to <code>/posts</code>.</li>
          <li><strong>Model</strong>: <code>Post.destroy(id)</code> removes the row.</li>
        </ol>
        <p>Bonus: once rows can be deleted, <code>db.posts.length + 1</code> can reuse an id.
        Fix <code>create</code> to use "highest id + 1".</p>
      `,
      starter: `// A tiny server-side MVC framework, simulated in the browser.
// Every click is a "request"; every page is a freshly rendered HTML "response".

// ===== MODEL (data + rules; in real life: ActiveRecord, Eloquent, Django ORM...) =====
const db = {
  posts: [
    { id: 1, title: 'Hello MVC' },
    { id: 2, title: 'Routers are just lookup tables' },
  ],
};

const Post = {
  all() {
    console.log('[Model] Post.all() ->', db.posts.length, 'rows');
    return db.posts;
  },
  find(id) {
    const post = db.posts.find(p => p.id === id);
    console.log('[Model] Post.find(' + id + ') ->', post ? 'found' : 'null');
    return post;
  },
  create(fields) {
    const title = (fields.title || '').trim();
    if (!title) {
      console.log('[Model] Post.create rejected: title is required');
      return { errors: ['Title is required'] };
    }
    const post = { id: db.posts.length + 1, title };
    db.posts.push(post);
    console.log('[Model] Post.create -> id', post.id);
    return { post };
  },
};

// ===== VIEWS (templates: data in, HTML string out; no decisions) =====
const esc = s => String(s).replace(/[&<>"]/g, c => \`&#\${c.charCodeAt(0)};\`);

const templates = {
  'posts/index': ({ posts, errors = [] }) => \`
    <h3>All posts</h3>
    <ul>
      \${posts.map(p => \`<li><a href="/posts/\${p.id}">\${esc(p.title)}</a></li>\`).join('')}
    </ul>
    \${errors.map(e => \`<p style="color: crimson">\${esc(e)}</p>\`).join('')}
    <form method="post" action="/posts">
      <input name="title" placeholder="New title"> <button>Create</button>
    </form>
  \`,
  'posts/show': ({ post }) => \`
    <h3>\${esc(post.title)}</h3>
    <p>Post #\${post.id}</p>
    <a href="/posts">&larr; all posts</a>
  \`,
  'errors/404': ({ path }) => \`
    <h3>404 Not Found</h3>
    <p>No page at \${esc(path)}</p>
    <a href="/posts">home</a>
  \`,
};

function render(name, data) {
  console.log('[View] render template', JSON.stringify(name));
  return templates[name](data);
}

// ===== CONTROLLER (one method per action: read request, call model, pick a view) =====
const PostsController = {
  index() {
    return { status: 200, body: render('posts/index', { posts: Post.all() }) };
  },
  show(req) {
    const post = Post.find(Number(req.params.id));
    if (!post) return { status: 404, body: render('errors/404', { path: req.path }) };
    return { status: 200, body: render('posts/show', { post }) };
  },
  create(req) {
    const result = Post.create(req.body);
    if (result.errors) {
      const body = render('posts/index', { posts: Post.all(), errors: result.errors });
      return { status: 422, body };
    }
    return { status: 303, location: '/posts/' + result.post.id }; // redirect after POST
  },
};

// ===== ROUTER (method + URL pattern -> controller action) =====
const routes = [
  ['GET', '/posts', 'PostsController#index', PostsController.index],
  ['GET', '/posts/:id', 'PostsController#show', PostsController.show],
  ['POST', '/posts', 'PostsController#create', PostsController.create],
];

function route(req) {
  for (const [method, pattern, name, action] of routes) {
    const re = new RegExp('^' + pattern.replace(/:(\\w+)/g, '(?<$1>[^/]+)') + '$');
    const match = req.path.match(re);
    if (method === req.method && match) {
      req.params = { ...match.groups };
      const params = JSON.stringify(req.params);
      console.log(\`[Router] \${method} \${req.path} -> \${name} \${params}\`);
      return action(req);
    }
  }
  console.log(\`[Router] \${req.method} \${req.path} -> no route\`);
  return { status: 404, body: render('errors/404', { path: req.path }) };
}

// ===== "BROWSER" (address bar + page; sends requests, shows responses) =====
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="display: flex; gap: 4px">
    <input id="url" style="flex: 1; font-family: monospace"><button id="go">Go</button>
  </div>
  <div id="page" style="border: 1px solid #ccc; padding: 4px 10px; margin-top: 6px"></div>
\`;
const urlBar = document.getElementById('url');
const page = document.getElementById('page');

function request(method, path, body = {}) {
  const shown = method === 'POST' ? ' ' + JSON.stringify(body) : '';
  console.log(\`[Browser] \${method} \${path}\${shown}\`);
  const res = route({ method, path, body });
  console.log('[Browser] <- response', res.status);
  if (res.status === 303) {
    console.log('[Browser] redirected to', res.location);
    return request('GET', res.location);
  }
  urlBar.value = path;
  page.innerHTML = res.body; // the whole page is replaced: no live observer here
}

page.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  e.preventDefault();
  request('GET', link.getAttribute('href'));
});

page.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(e.target));
  request('POST', e.target.getAttribute('action'), fields);
});

document.getElementById('go').onclick = () => request('GET', urlBar.value);

request('GET', '/posts');`,
      hint: 'In the show template: &lt;form method="post" action="/posts/${post.id}/delete"&gt;&lt;button&gt;Delete&lt;/button&gt;&lt;/form&gt;. The submit listener already turns any form into a POST request. The route pattern /posts/:id/delete gives req.params.id.',
      solution: `// A tiny server-side MVC framework, simulated in the browser.
// Every click is a "request"; every page is a freshly rendered HTML "response".

// ===== MODEL (data + rules; in real life: ActiveRecord, Eloquent, Django ORM...) =====
const db = {
  posts: [
    { id: 1, title: 'Hello MVC' },
    { id: 2, title: 'Routers are just lookup tables' },
  ],
};

const Post = {
  all() {
    console.log('[Model] Post.all() ->', db.posts.length, 'rows');
    return db.posts;
  },
  find(id) {
    const post = db.posts.find(p => p.id === id);
    console.log('[Model] Post.find(' + id + ') ->', post ? 'found' : 'null');
    return post;
  },
  create(fields) {
    const title = (fields.title || '').trim();
    if (!title) {
      console.log('[Model] Post.create rejected: title is required');
      return { errors: ['Title is required'] };
    }
    const post = { id: Math.max(0, ...db.posts.map(p => p.id)) + 1, title };
    db.posts.push(post);
    console.log('[Model] Post.create -> id', post.id);
    return { post };
  },
  // NEW (model): remove a row
  destroy(id) {
    db.posts = db.posts.filter(p => p.id !== id);
    console.log('[Model] Post.destroy(' + id + ')');
  },
};

// ===== VIEWS (templates: data in, HTML string out; no decisions) =====
const esc = s => String(s).replace(/[&<>"]/g, c => \`&#\${c.charCodeAt(0)};\`);

const templates = {
  'posts/index': ({ posts, errors = [] }) => \`
    <h3>All posts</h3>
    <ul>
      \${posts.map(p => \`<li><a href="/posts/\${p.id}">\${esc(p.title)}</a></li>\`).join('')}
    </ul>
    \${errors.map(e => \`<p style="color: crimson">\${esc(e)}</p>\`).join('')}
    <form method="post" action="/posts">
      <input name="title" placeholder="New title"> <button>Create</button>
    </form>
  \`,
  'posts/show': ({ post }) => \`
    <h3>\${esc(post.title)}</h3>
    <p>Post #\${post.id}</p>
    <form method="post" action="/posts/\${post.id}/delete"><button>Delete</button></form>
    <a href="/posts">&larr; all posts</a>
  \`,
  'errors/404': ({ path }) => \`
    <h3>404 Not Found</h3>
    <p>No page at \${esc(path)}</p>
    <a href="/posts">home</a>
  \`,
};

function render(name, data) {
  console.log('[View] render template', JSON.stringify(name));
  return templates[name](data);
}

// ===== CONTROLLER (one method per action: read request, call model, pick a view) =====
const PostsController = {
  index() {
    return { status: 200, body: render('posts/index', { posts: Post.all() }) };
  },
  show(req) {
    const post = Post.find(Number(req.params.id));
    if (!post) return { status: 404, body: render('errors/404', { path: req.path }) };
    return { status: 200, body: render('posts/show', { post }) };
  },
  create(req) {
    const result = Post.create(req.body);
    if (result.errors) {
      const body = render('posts/index', { posts: Post.all(), errors: result.errors });
      return { status: 422, body };
    }
    return { status: 303, location: '/posts/' + result.post.id }; // redirect after POST
  },
  // NEW (controller): call the model, then redirect back to the list
  destroy(req) {
    Post.destroy(Number(req.params.id));
    return { status: 303, location: '/posts' };
  },
};

// ===== ROUTER (method + URL pattern -> controller action) =====
const routes = [
  ['GET', '/posts', 'PostsController#index', PostsController.index],
  ['GET', '/posts/:id', 'PostsController#show', PostsController.show],
  ['POST', '/posts', 'PostsController#create', PostsController.create],
  // NEW (router): map the URL to the new action
  ['POST', '/posts/:id/delete', 'PostsController#destroy', PostsController.destroy],
];

function route(req) {
  for (const [method, pattern, name, action] of routes) {
    const re = new RegExp('^' + pattern.replace(/:(\\w+)/g, '(?<$1>[^/]+)') + '$');
    const match = req.path.match(re);
    if (method === req.method && match) {
      req.params = { ...match.groups };
      const params = JSON.stringify(req.params);
      console.log(\`[Router] \${method} \${req.path} -> \${name} \${params}\`);
      return action(req);
    }
  }
  console.log(\`[Router] \${req.method} \${req.path} -> no route\`);
  return { status: 404, body: render('errors/404', { path: req.path }) };
}

// ===== "BROWSER" (address bar + page; sends requests, shows responses) =====
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="display: flex; gap: 4px">
    <input id="url" style="flex: 1; font-family: monospace"><button id="go">Go</button>
  </div>
  <div id="page" style="border: 1px solid #ccc; padding: 4px 10px; margin-top: 6px"></div>
\`;
const urlBar = document.getElementById('url');
const page = document.getElementById('page');

function request(method, path, body = {}) {
  const shown = method === 'POST' ? ' ' + JSON.stringify(body) : '';
  console.log(\`[Browser] \${method} \${path}\${shown}\`);
  const res = route({ method, path, body });
  console.log('[Browser] <- response', res.status);
  if (res.status === 303) {
    console.log('[Browser] redirected to', res.location);
    return request('GET', res.location);
  }
  urlBar.value = path;
  page.innerHTML = res.body; // the whole page is replaced: no live observer here
}

page.addEventListener('click', (e) => {
  const link = e.target.closest('a');
  if (!link) return;
  e.preventDefault();
  request('GET', link.getAttribute('href'));
});

page.addEventListener('submit', (e) => {
  e.preventDefault();
  const fields = Object.fromEntries(new FormData(e.target));
  request('POST', e.target.getAttribute('action'), fields);
});

document.getElementById('go').onclick = () => request('GET', urlBar.value);

request('GET', '/posts');`,
    },
  },

  // ------------------------------------------------------------------ 3
  {
    id: 'mvc-pitfalls',
    section: 'MVC family',
    title: 'MVC pitfalls: Massive View Controller & fat models',
    explain: `
      <p>MVC gives you three boxes, but it doesn't stop you from putting everything in one of
      them. The two classic ways it goes wrong:</p>

      <h3>1. Massive View Controller</h3>
      <p>In Apple's Cocoa / UIKit version of MVC, the controller sits <em>between</em> model
      and view (they don't talk directly), and <code>UIViewController</code> also owns the
      screen's lifecycle (<code>viewDidLoad</code>...). So it becomes the default home for
      <em>everything</em>: networking, validation, formatting dates and prices, table view
      data sources, navigation. iOS developers joke that MVC stands for
      <strong>"Massive View Controller"</strong>: 1,000+ line controllers that nobody can
      test, because the logic is welded to UIKit.</p>
      <p>The same thing happens in any framework: a Rails controller with 200-line actions, or
      the JS "controller" in example 1 below.</p>

      <h3>2. "Fat model, skinny controller" (and its own trap)</h3>
      <p>The Rails community's answer, popularised around 2006 (for example in Jamis Buck's
      post "Skinny Controller, Fat Model"), was: push business logic <em>down</em> into the
      model. Controllers should be a few lines: read params, call a model method, pick a
      response.</p>
      <p>That's usually right. But taken too far you get <strong>fat models</strong>: one
      <code>User</code> class that handles validation, billing, emails, CSV export and search.
      Then the fix is to split the model layer itself into smaller objects (service objects,
      domain objects, value objects), which leads toward the Clean/Hexagonal ideas at the end
      of this course.</p>

      <h3>Where does each kind of code belong?</h3>
      <table>
        <tr><th>Code</th><th>Belongs in</th><th>Why</th></tr>
        <tr><td>"Quantity must be 1-10", coupon rules, totals, rounding</td><td>Model</td>
          <td>Business rules; must be the same everywhere and testable without a UI</td></tr>
        <tr><td>Formatting <code>1250</code> as <code>$12.50</code>, building DOM</td>
          <td>View (or a formatter/presenter)</td><td>Presentation only</td></tr>
        <tr><td>"Add clicked → read fields → call cart.add → show error"</td>
          <td>Controller</td><td>Glue between input and model</td></tr>
        <tr><td>Sending emails, calling payment APIs</td><td>Separate service objects</td>
          <td>Keeps the model from getting fat</td></tr>
      </table>
      <div class="tip">A quick smell test: <strong>can you unit-test the rule without a
      DOM / UIKit / HTTP request?</strong> If not, the rule is in the wrong place.</div>
    `,
    examples: [
      {
        title: 'Before: a Massive View Controller',
        code: `// A "Massive View Controller": it works, but EVERYTHING lives in the controller.
const root = document.getElementById('root');
root.innerHTML = \`
  <select id="product">
    <option value="book">Book ($12.50)</option>
    <option value="pen">Pen ($1.99)</option>
    <option value="mug">Mug ($8.00)</option>
  </select>
  <input id="qty" type="number" value="1" style="width: 50px">
  <button id="add">Add</button>
  <input id="coupon" placeholder="coupon (try SAVE10)" style="width: 150px">
  <button id="apply">Apply</button>
  <ul id="lines"></ul>
  <p id="total"></p>
  <p id="error" style="color: crimson"></p>
\`;

// ===== CONTROLLER (and model, and view, and formatter, and validator...) =====
class CheckoutController {
  constructor() {
    this.lines = []; // data... stored in the controller
    this.discount = 0;
    document.getElementById('add').onclick = () => this.onAdd();
    document.getElementById('apply').onclick = () => this.onApply();
    this.redraw();
  }

  onAdd() {
    // 1. read input (fine for a controller)
    const product = document.getElementById('product').value;
    const qty = Number(document.getElementById('qty').value);
    // 2. business rules (should be in the model!)
    const prices = { book: 12.5, pen: 1.99, mug: 8 };
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      document.getElementById('error').textContent = 'Quantity must be 1-10';
      console.log('[Controller] rejected qty', qty);
      return;
    }
    const existing = this.lines.find(l => l.product === product);
    if (existing) existing.qty += qty;
    else this.lines.push({ product, qty, price: prices[product] });
    console.log('[Controller] added', qty, product);
    document.getElementById('error').textContent = '';
    this.redraw();
  }

  onApply() {
    const code = document.getElementById('coupon').value.trim().toUpperCase();
    // more business rules...
    if (code === 'SAVE10') this.discount = 0.1;
    else {
      this.discount = 0;
      document.getElementById('error').textContent = 'Unknown coupon';
    }
    console.log('[Controller] coupon', code, '-> discount', this.discount);
    this.redraw();
  }

  redraw() {
    // 3. maths (model) + 4. formatting and DOM building (view), all in one method
    let subtotal = 0;
    const ul = document.getElementById('lines');
    ul.innerHTML = '';
    for (const l of this.lines) {
      subtotal += l.qty * l.price;
      const li = document.createElement('li');
      li.textContent = \`\${l.qty} x \${l.product} = $\${(l.qty * l.price).toFixed(2)}\`;
      ul.append(li);
    }
    const total = subtotal * (1 - this.discount);
    document.getElementById('total').textContent =
      'Total: $' + total.toFixed(2) + (this.discount ? ' (10% off)' : '');
    console.log('[Controller] redraw, total =', total.toFixed(2));
  }
}

new CheckoutController();`,
      },
      {
        title: 'After: fat(ish) model, dumb view, skinny controller',
        code: `// The same checkout, refactored: a smart Model, a dumb View, a skinny Controller.

// ===== MODEL (all the business rules; no DOM; money in integer cents) =====
const PRICES = { book: 1250, pen: 199, mug: 800 };
const COUPONS = { SAVE10: 0.1 };

class Cart {
  constructor() {
    this.lines = [];
    this.discount = 0;
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  changed() {
    this.listeners.forEach(fn => fn(this));
  }

  add(product, qty) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      console.log('[Model] rejected qty', qty);
      return 'Quantity must be 1-10';
    }
    const existing = this.lines.find(l => l.product === product);
    if (existing) existing.qty += qty;
    else this.lines.push({ product, qty, price: PRICES[product] });
    console.log('[Model] added', qty, product);
    this.changed();
    return null; // null = no error
  }

  applyCoupon(code) {
    this.discount = COUPONS[code.trim().toUpperCase()] || 0;
    console.log('[Model] coupon', JSON.stringify(code), '-> discount', this.discount);
    this.changed();
    return this.discount ? null : 'Unknown coupon';
  }

  subtotal() {
    return this.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  }

  total() {
    return Math.round(this.subtotal() * (1 - this.discount));
  }
}

// ===== VIEW (draws the cart and formats money; decides nothing) =====
const money = cents => '$' + (cents / 100).toFixed(2);

class CartView {
  constructor(root) {
    root.innerHTML = \`
      <select id="product">
        <option value="book">Book ($12.50)</option>
        <option value="pen">Pen ($1.99)</option>
        <option value="mug">Mug ($8.00)</option>
      </select>
      <input id="qty" type="number" value="1" style="width: 50px">
      <button id="add">Add</button>
      <input id="coupon" placeholder="coupon (try SAVE10)" style="width: 150px">
      <button id="apply">Apply</button>
      <ul id="lines"></ul>
      <p id="total"></p>
      <p id="error" style="color: crimson"></p>
    \`;
    this.$ = id => root.querySelector('#' + id);
  }

  render(cart) {
    console.log('[View] render', cart.lines.length, 'line(s)');
    this.$('lines').innerHTML = cart.lines
      .map(l => \`<li>\${l.qty} x \${l.product} = \${money(l.qty * l.price)}</li>\`)
      .join('');
    const off = cart.discount ? \` (\${cart.discount * 100}% off)\` : '';
    this.$('total').textContent = 'Total: ' + money(cart.total()) + off;
  }

  showError(message) {
    this.$('error').textContent = message || '';
  }
}

// ===== CONTROLLER (skinny: read input -> call model -> report errors) =====
class CheckoutController {
  constructor(cart, view) {
    view.$('add').onclick = () => {
      const qty = Number(view.$('qty').value);
      console.log('[Controller] add clicked');
      view.showError(cart.add(view.$('product').value, qty));
    };
    view.$('apply').onclick = () => {
      console.log('[Controller] apply clicked');
      view.showError(cart.applyCoupon(view.$('coupon').value));
    };
  }
}

// ===== WIRING =====
const cart = new Cart();
const view = new CartView(document.getElementById('root'));
cart.onChange(c => view.render(c)); // the view observes the model (classic MVC)
new CheckoutController(cart, view);
view.render(cart);

// ===== PAYOFF: the rules are testable without any DOM =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('SAVE10 takes 10% off', () => {
  const c = new Cart();
  c.add('book', 2); // 2500 cents
  c.applyCoupon('save10');
  if (c.total() !== 2250) throw new Error('total ' + c.total());
});

test('qty 0 is rejected', () => {
  const c = new Cart();
  if (c.add('pen', 0) === null) throw new Error('should return an error');
});`,
        explain: `
          <details>
            <summary>Where did each line go?</summary>
            <table>
              <tr><th>In the Massive controller</th><th>Moved to</th></tr>
              <tr><td><code>const prices = { book: 12.5, ... }</code></td>
                <td>Model: <code>PRICES</code>, now in integer <strong>cents</strong> (1250) to
                avoid floating-point money bugs, which is itself a business rule</td></tr>
              <tr><td>qty 1-10 validation</td><td>Model: <code>Cart.add()</code> returns an
                error string or <code>null</code></td></tr>
              <tr><td>"merge into existing line"</td><td>Model: <code>Cart.add()</code></td></tr>
              <tr><td><code>if (code === 'SAVE10') ...</code></td>
                <td>Model: <code>COUPONS</code> table + <code>applyCoupon()</code></td></tr>
              <tr><td>subtotal / discount maths in <code>redraw()</code></td>
                <td>Model: <code>subtotal()</code>, <code>total()</code></td></tr>
              <tr><td><code>toFixed(2)</code>, <code>createElement</code>, error text</td>
                <td>View: <code>money()</code>, <code>render()</code>, <code>showError()</code>
                </td></tr>
              <tr><td>reading inputs, calling things</td><td>Controller: two 3-line handlers
                </td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: add 2 books, then apply SAVE10</summary>
            <table>
              <tr><th>Action</th><th>Console</th></tr>
              <tr><td>Load (after the tests run)</td><td><code>[View] render 0 line(s)</code>,
                then the test logs and <code>✓ SAVE10 takes 10% off</code>,
                <code>✓ qty 0 is rejected</code></td></tr>
              <tr><td>Qty 2, Add</td><td><code>[Controller] add clicked</code><br>
                <code>[Model] added 2 book</code><br><code>[View] render 1 line(s)</code></td></tr>
              <tr><td>Type save10, Apply</td><td><code>[Controller] apply clicked</code><br>
                <code>[Model] coupon "save10" -&gt; discount 0.1</code><br>
                <code>[View] render 1 line(s)</code> → "Total: $22.50 (10% off)"</td></tr>
            </table>
            <p>The controller didn't call <code>view.render()</code>; the view observes the
            cart (<code>cart.onChange(...)</code>), classic-MVC style. The controller only
            passes the model's error message to <code>view.showError()</code>.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does the iOS joke "Massive View Controller" describe?',
        options: ['A very big screen', 'A view controller that has absorbed networking, formatting, validation and more',
          'A controller that controls many views correctly', 'An Apple framework'],
        answer: 1,
        why: 'UIViewController becomes the dumping ground for all logic, making it huge and hard to test.',
      },
      {
        q: 'Where should "a coupon gives 10% off" live?',
        options: ['In the click handler', 'In the view template', 'In the Model', 'In CSS'],
        answer: 2,
        why: 'It is a business rule. In the Model it is testable without a UI and reused by every screen.',
      },
      {
        q: 'Where should formatting 1250 cents as "$12.50" live?',
        options: ['Model', 'View (or a presentation helper)', 'Database', 'Router'],
        answer: 1,
        why: 'How a number looks is presentation. The model keeps the number; the view decides how to show it.',
      },
      {
        q: 'What is the risk of taking "fat model, skinny controller" too far?',
        options: ['Controllers become too big', 'God-object models that do everything (emails, billing, export...)',
          'Views stop rendering', 'None, it is always correct'],
        answer: 1,
        why: 'Huge models are just as hard to change. Split them into service/domain objects.',
      },
    ],
    exercise: {
      task: `
        <p>The shop adds a new rule: <strong>shipping is $4.99, free when the (discounted)
        total is $20 or more</strong>. An empty cart has no shipping.</p>
        <ul>
          <li>Put the rule in the <strong>Model</strong> (<code>shipping()</code>, and include
          it in <code>total()</code>).</li>
          <li>Show a "Shipping: $4.99 / FREE" line in the <strong>View</strong>.</li>
          <li>Add a <code>test()</code> proving both cases. The Controller should not change at
          all.</li>
        </ul>
      `,
      starter: `// The same checkout, refactored: a smart Model, a dumb View, a skinny Controller.

// ===== MODEL (all the business rules; no DOM; money in integer cents) =====
const PRICES = { book: 1250, pen: 199, mug: 800 };
const COUPONS = { SAVE10: 0.1 };

class Cart {
  constructor() {
    this.lines = [];
    this.discount = 0;
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  changed() {
    this.listeners.forEach(fn => fn(this));
  }

  add(product, qty) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      console.log('[Model] rejected qty', qty);
      return 'Quantity must be 1-10';
    }
    const existing = this.lines.find(l => l.product === product);
    if (existing) existing.qty += qty;
    else this.lines.push({ product, qty, price: PRICES[product] });
    console.log('[Model] added', qty, product);
    this.changed();
    return null; // null = no error
  }

  applyCoupon(code) {
    this.discount = COUPONS[code.trim().toUpperCase()] || 0;
    console.log('[Model] coupon', JSON.stringify(code), '-> discount', this.discount);
    this.changed();
    return this.discount ? null : 'Unknown coupon';
  }

  subtotal() {
    return this.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  }

  total() {
    return Math.round(this.subtotal() * (1 - this.discount));
  }
}

// ===== VIEW (draws the cart and formats money; decides nothing) =====
const money = cents => '$' + (cents / 100).toFixed(2);

class CartView {
  constructor(root) {
    root.innerHTML = \`
      <select id="product">
        <option value="book">Book ($12.50)</option>
        <option value="pen">Pen ($1.99)</option>
        <option value="mug">Mug ($8.00)</option>
      </select>
      <input id="qty" type="number" value="1" style="width: 50px">
      <button id="add">Add</button>
      <input id="coupon" placeholder="coupon (try SAVE10)" style="width: 150px">
      <button id="apply">Apply</button>
      <ul id="lines"></ul>
      <p id="total"></p>
      <p id="error" style="color: crimson"></p>
    \`;
    this.$ = id => root.querySelector('#' + id);
  }

  render(cart) {
    console.log('[View] render', cart.lines.length, 'line(s)');
    this.$('lines').innerHTML = cart.lines
      .map(l => \`<li>\${l.qty} x \${l.product} = \${money(l.qty * l.price)}</li>\`)
      .join('');
    const off = cart.discount ? \` (\${cart.discount * 100}% off)\` : '';
    this.$('total').textContent = 'Total: ' + money(cart.total()) + off;
  }

  showError(message) {
    this.$('error').textContent = message || '';
  }
}

// ===== CONTROLLER (skinny: read input -> call model -> report errors) =====
class CheckoutController {
  constructor(cart, view) {
    view.$('add').onclick = () => {
      const qty = Number(view.$('qty').value);
      console.log('[Controller] add clicked');
      view.showError(cart.add(view.$('product').value, qty));
    };
    view.$('apply').onclick = () => {
      console.log('[Controller] apply clicked');
      view.showError(cart.applyCoupon(view.$('coupon').value));
    };
  }
}

// ===== WIRING =====
const cart = new Cart();
const view = new CartView(document.getElementById('root'));
cart.onChange(c => view.render(c)); // the view observes the model (classic MVC)
new CheckoutController(cart, view);
view.render(cart);

// ===== PAYOFF: the rules are testable without any DOM =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('SAVE10 takes 10% off', () => {
  const c = new Cart();
  c.add('book', 2); // 2500 cents
  c.applyCoupon('save10');
  if (c.total() !== 2250) throw new Error('total ' + c.total());
});

test('qty 0 is rejected', () => {
  const c = new Cart();
  if (c.add('pen', 0) === null) throw new Error('should return an error');
});`,
      hint: 'Split total() into discounted() (the old formula) and shipping() (0 if discounted() is 0 or >= 2000 cents, else 499). total() = discounted() + shipping(). In render(), add a &lt;p id="shipping"&gt; line.',
      solution: `// Solution: shipping is a business rule, so it went into the MODEL (+ one test).

// ===== MODEL (all the business rules; no DOM; money in integer cents) =====
const PRICES = { book: 1250, pen: 199, mug: 800 };
const COUPONS = { SAVE10: 0.1 };

class Cart {
  constructor() {
    this.lines = [];
    this.discount = 0;
    this.listeners = [];
  }

  onChange(fn) {
    this.listeners.push(fn);
  }

  changed() {
    this.listeners.forEach(fn => fn(this));
  }

  add(product, qty) {
    if (!Number.isInteger(qty) || qty < 1 || qty > 10) {
      console.log('[Model] rejected qty', qty);
      return 'Quantity must be 1-10';
    }
    const existing = this.lines.find(l => l.product === product);
    if (existing) existing.qty += qty;
    else this.lines.push({ product, qty, price: PRICES[product] });
    console.log('[Model] added', qty, product);
    this.changed();
    return null; // null = no error
  }

  applyCoupon(code) {
    this.discount = COUPONS[code.trim().toUpperCase()] || 0;
    console.log('[Model] coupon', JSON.stringify(code), '-> discount', this.discount);
    this.changed();
    return this.discount ? null : 'Unknown coupon';
  }

  subtotal() {
    return this.lines.reduce((sum, l) => sum + l.qty * l.price, 0);
  }

  // NEW: free shipping from $20 (after discount), otherwise $4.99. Empty cart ships free.
  discounted() {
    return Math.round(this.subtotal() * (1 - this.discount));
  }

  shipping() {
    const d = this.discounted();
    return d === 0 || d >= 2000 ? 0 : 499;
  }

  total() {
    return this.discounted() + this.shipping();
  }
}

// ===== VIEW (draws the cart and formats money; decides nothing) =====
const money = cents => '$' + (cents / 100).toFixed(2);

class CartView {
  constructor(root) {
    root.innerHTML = \`
      <select id="product">
        <option value="book">Book ($12.50)</option>
        <option value="pen">Pen ($1.99)</option>
        <option value="mug">Mug ($8.00)</option>
      </select>
      <input id="qty" type="number" value="1" style="width: 50px">
      <button id="add">Add</button>
      <input id="coupon" placeholder="coupon (try SAVE10)" style="width: 150px">
      <button id="apply">Apply</button>
      <ul id="lines"></ul>
      <p id="shipping"></p>
      <p id="total"></p>
      <p id="error" style="color: crimson"></p>
    \`;
    this.$ = id => root.querySelector('#' + id);
  }

  render(cart) {
    console.log('[View] render', cart.lines.length, 'line(s)');
    this.$('lines').innerHTML = cart.lines
      .map(l => \`<li>\${l.qty} x \${l.product} = \${money(l.qty * l.price)}</li>\`)
      .join('');
    const ship = cart.shipping();
    this.$('shipping').textContent = 'Shipping: ' + (ship ? money(ship) : 'FREE');
    const off = cart.discount ? \` (\${cart.discount * 100}% off)\` : '';
    this.$('total').textContent = 'Total: ' + money(cart.total()) + off;
  }

  showError(message) {
    this.$('error').textContent = message || '';
  }
}

// ===== CONTROLLER (skinny: read input -> call model -> report errors) =====
class CheckoutController {
  constructor(cart, view) {
    view.$('add').onclick = () => {
      const qty = Number(view.$('qty').value);
      console.log('[Controller] add clicked');
      view.showError(cart.add(view.$('product').value, qty));
    };
    view.$('apply').onclick = () => {
      console.log('[Controller] apply clicked');
      view.showError(cart.applyCoupon(view.$('coupon').value));
    };
  }
}

// ===== WIRING =====
const cart = new Cart();
const view = new CartView(document.getElementById('root'));
cart.onChange(c => view.render(c)); // the view observes the model (classic MVC)
new CheckoutController(cart, view);
view.render(cart);

// ===== PAYOFF: the rules are testable without any DOM =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('SAVE10 takes 10% off', () => {
  const c = new Cart();
  c.add('book', 2); // 2500 cents
  c.applyCoupon('save10');
  if (c.total() !== 2250) throw new Error('total ' + c.total());
});

test('shipping is $4.99 under $20, free from $20', () => {
  const c = new Cart();
  c.add('mug', 1); // 800
  if (c.total() !== 800 + 499) throw new Error('total ' + c.total());
  c.add('book', 1); // 800 + 1250 = 2050
  if (c.total() !== 2050) throw new Error('total ' + c.total());
});

test('qty 0 is rejected', () => {
  const c = new Cart();
  if (c.add('pen', 0) === null) throw new Error('should return an error');
});`,
    },
  },

  // ------------------------------------------------------------------ 4
  {
    id: 'mvp',
    section: 'MVC family',
    title: 'MVP: Model-View-Presenter',
    explain: `
      <p><strong>Model-View-Presenter</strong> keeps the Model, but rearranges the other two:</p>
      <ul>
        <li>The <strong>View</strong> is <em>passive</em>. It receives the user's clicks
        (widgets already do that) and immediately forwards them:
        <code>presenter.onLoginClicked()</code>. It has no logic.</li>
        <li>The <strong>Presenter</strong> holds all the UI logic: reads values from the view,
        validates, calls the model, and then tells the view exactly what to show:
        <code>view.showError('Wrong password')</code>.</li>
        <li>The View implements an <strong>interface</strong>, a list of methods like
        <code>getUsername()</code>, <code>showError(msg)</code>,
        <code>setLoginEnabled(on)</code>. The Presenter only knows that interface, not the
        DOM.</li>
      </ul>
      <pre><code>user ─click─► View ──onLoginClicked()──► Presenter ──login()──► Model
               ▲                               │
               └──── showError("...") ─────────┘</code></pre>

      <h3>Where it came from</h3>
      <p>MVP was described by <strong>Taligent</strong> (a 1990s Apple/IBM joint venture) in
      Mike Potel's 1996 paper, and adopted by <strong>Dolphin Smalltalk</strong>, whose authors
      explained why they "twisted the MVC triad" (2000). It became widespread in .NET
      <strong>WinForms</strong> and ASP.NET Web Forms apps, was written up by
      <strong>Martin Fowler</strong> around 2004–2006 (who later split it into "Supervising
      Controller" and "Passive View", next lesson), and was hugely popular on
      <strong>Android</strong> in the mid-2010s, before Google's Architecture Components
      (2017) pushed Android toward MVVM.</p>

      <h3>Why people love it: testing</h3>
      <p>Because the Presenter only talks to an <em>interface</em>, a test can hand it a
      <strong>fake view</strong>: a plain object that returns canned input and records which
      methods were called. No browser, no emulator, no clicking. Example 2 does exactly that.
      </p>
      <h3>Analogy: a TV and its remote</h3>
      <p>The TV (View) has buttons, but pressing one just sends a signal. The set-top box
      (Presenter) decides what that means, fetches the channel (Model), and tells the screen
      exactly what to display. You could test the box with a fake screen that just writes
      down what it was told.</p>
      <div class="warn">The cost is boilerplate: every piece of UI needs an interface method
      and the presenter has to call it. And a presenter that touches <code>document</code>
      directly has broken the pattern; it's no longer testable with a fake.</div>
    `,
    examples: [
      {
        title: 'Login form with MVP (try ada / lovelace, or a wrong password 3x)',
        code: `// MVP login form. Try: ada / lovelace (works), or a wrong password 3 times.

// ===== MODEL (data + business rules; would call a server in real life) =====
const AuthModel = {
  users: { ada: 'lovelace', grace: 'hopper' },
  login(username, password) {
    const ok = this.users[username] === password;
    console.log('[Model] login', JSON.stringify(username), '->', ok ? 'ok' : 'denied');
    return ok;
  },
};

// ===== PRESENTER (all UI logic; talks to the view ONLY through its interface) =====
class LoginPresenter {
  constructor(view, auth) {
    this.view = view;
    this.auth = auth;
    this.failures = 0;
  }

  onLoginClicked() {
    const user = this.view.getUsername().trim().toLowerCase();
    const pass = this.view.getPassword();
    console.log('[Presenter] onLoginClicked, user =', JSON.stringify(user));
    if (!user || !pass) {
      this.view.showError('Please fill in both fields');
      return;
    }
    if (this.auth.login(user, pass)) {
      this.failures = 0;
      this.view.showError('');
      this.view.showWelcome(user[0].toUpperCase() + user.slice(1));
      return;
    }
    this.failures++;
    if (this.failures >= 3) {
      this.view.showError('Too many attempts. Locked.');
      this.view.setLoginEnabled(false);
    } else {
      this.view.showError(\`Wrong password (tries left: \${3 - this.failures})\`);
    }
  }
}

// ===== VIEW (passive: implements the interface, forwards clicks, zero logic) =====
// Interface: getUsername() getPassword() showError(msg) showWelcome(name)
//            setLoginEnabled(on)
class DomLoginView {
  constructor(root) {
    root.innerHTML = \`
      <input id="user" placeholder="username"><br>
      <input id="pass" type="password" placeholder="password"><br>
      <button id="login">Log in</button>
      <p id="error" style="color: crimson"></p>
      <h3 id="welcome"></h3>
    \`;
    this.$ = id => root.querySelector('#' + id);
  }

  bindPresenter(presenter) {
    this.$('login').onclick = () => {
      console.log('[View] click -> presenter.onLoginClicked()');
      presenter.onLoginClicked();
    };
  }

  getUsername() {
    return this.$('user').value;
  }

  getPassword() {
    return this.$('pass').value;
  }

  showError(msg) {
    console.log('[View] showError(' + JSON.stringify(msg) + ')');
    this.$('error').textContent = msg;
  }

  showWelcome(name) {
    console.log('[View] showWelcome(' + JSON.stringify(name) + ')');
    this.$('welcome').textContent = 'Welcome, ' + name + '!';
  }

  setLoginEnabled(on) {
    console.log('[View] setLoginEnabled(' + on + ')');
    this.$('login').disabled = !on;
  }
}

// ===== WIRING =====
const view = new DomLoginView(document.getElementById('root'));
const presenter = new LoginPresenter(view, AuthModel);
view.bindPresenter(presenter);`,
        explain: `
          <details>
            <summary>Who calls whom: a wrong password</summary>
            <p>Type <code>Ada</code> / <code>x</code> and click Log in:</p>
            <table>
              <tr><th>#</th><th>Caller → callee</th><th>Console</th></tr>
              <tr><td>1</td><td>DOM → View's click listener → <code>presenter.onLoginClicked()</code>
                </td><td><code>[View] click -&gt; presenter.onLoginClicked()</code></td></tr>
              <tr><td>2</td><td>Presenter → <code>view.getUsername()</code>,
                <code>view.getPassword()</code> (pull input through the interface), normalises
                "Ada" → "ada"</td>
                <td><code>[Presenter] onLoginClicked, user = "ada"</code></td></tr>
              <tr><td>3</td><td>Presenter → <code>auth.login("ada", "x")</code></td>
                <td><code>[Model] login "ada" -&gt; denied</code></td></tr>
              <tr><td>4</td><td>Presenter: <code>failures = 1</code> → <code>view.showError(...)</code>
                </td><td><code>[View] showError("Wrong password (tries left: 2)")</code></td></tr>
            </table>
            <p>Click twice more: the 3rd failure logs
            <code>[View] showError("Too many attempts. Locked.")</code> and
            <code>[View] setLoginEnabled(false)</code>.</p>
            <p>With <code>ada</code> / <code>lovelace</code>:</p>
            <pre><code>[View] click -&gt; presenter.onLoginClicked()
[Presenter] onLoginClicked, user = "ada"
[Model] login "ada" -&gt; ok
[View] showError("")
[View] showWelcome("Ada")</code></pre>
          </details>
          <details>
            <summary>The view interface is the contract</summary>
            <pre><code>getUsername()        // ① input: the presenter PULLS values
getPassword()
showError(msg)       // ② output: the presenter PUSHES decisions
showWelcome(name)
setLoginEnabled(on)</code></pre>
            <ol>
              <li><strong>①</strong> The presenter asks the view for raw input. Trimming and
              lower-casing happen in the presenter, not the view.</li>
              <li><strong>②</strong> Every visible change is a named method. The view never
              decides <em>whether</em> to show an error, only <em>how</em>.</li>
            </ol>
            <p>Anything with these five methods can be "the view": the DOM class here, a fake
            in a test, or a completely different UI toolkit.</p>
          </details>
          <details>
            <summary>Compared with classic MVC</summary>
            <ul>
              <li>Classic MVC: the View <em>observes the Model</em> and reads it. MVP: the View
              doesn't need to know the Model at all; the Presenter tells it what to show.</li>
              <li>Classic MVC: a Controller handles input. MVP: the View receives input (widgets
              do that anyway) and forwards it to the Presenter.</li>
              <li>Presentation logic ("3 tries then lock", "capitalise the name") lives in one
              testable class.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The same Presenter, unit-tested with a fake view',
        code: `// The SAME presenter, tested with a FAKE view. No DOM, no clicks, instant.

// ===== MODEL (a fake too: we control exactly what it answers) =====
const fakeAuth = {
  login(user, pass) {
    return user === 'ada' && pass === 'lovelace';
  },
};

// ===== PRESENTER (copied unchanged from the previous example) =====
class LoginPresenter {
  constructor(view, auth) {
    this.view = view;
    this.auth = auth;
    this.failures = 0;
  }

  onLoginClicked() {
    const user = this.view.getUsername().trim().toLowerCase();
    const pass = this.view.getPassword();
    if (!user || !pass) {
      this.view.showError('Please fill in both fields');
      return;
    }
    if (this.auth.login(user, pass)) {
      this.failures = 0;
      this.view.showError('');
      this.view.showWelcome(user[0].toUpperCase() + user.slice(1));
      return;
    }
    this.failures++;
    if (this.failures >= 3) {
      this.view.showError('Too many attempts. Locked.');
      this.view.setLoginEnabled(false);
    } else {
      this.view.showError(\`Wrong password (tries left: \${3 - this.failures})\`);
    }
  }
}

// ===== FAKE VIEW (implements the same interface; just records calls) =====
class FakeView {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.calls = []; // e.g. ['showError:Please fill in both fields']
  }
  getUsername() { return this.username; }
  getPassword() { return this.password; }
  showError(msg) { this.calls.push('showError:' + msg); }
  showWelcome(name) { this.calls.push('showWelcome:' + name); }
  setLoginEnabled(on) { this.calls.push('setLoginEnabled:' + on); }
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

function expectCalls(view, expected) {
  const got = JSON.stringify(view.calls);
  if (got !== JSON.stringify(expected)) throw new Error('got ' + got);
}

test('empty fields show an error', () => {
  const view = new FakeView('', '');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:Please fill in both fields']);
});

test('good login clears error and welcomes with a capital letter', () => {
  const view = new FakeView('  ADA ', 'lovelace');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:', 'showWelcome:Ada']);
});

test('3 wrong passwords lock the button', () => {
  const view = new FakeView('ada', 'nope');
  const presenter = new LoginPresenter(view, fakeAuth);
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  expectCalls(view, [
    'showError:Wrong password (tries left: 2)',
    'showError:Wrong password (tries left: 1)',
    'showError:Too many attempts. Locked.',
    'setLoginEnabled:false',
  ]);
});

document.getElementById('root').textContent = 'Tests ran: see the console.';`,
        explain: `
          <details>
            <summary>Why this is so easy to test</summary>
            <p>The presenter's constructor takes <code>(view, auth)</code>. In the app we pass
            the DOM view and the real model; in the test we pass a <code>FakeView</code> and a
            <code>fakeAuth</code>. The presenter can't tell the difference, because it only
            calls interface methods. This is called <strong>dependency injection</strong>.</p>
            <table>
              <tr><th>Test</th><th>Fake view records</th></tr>
              <tr><td>empty fields</td><td><code>["showError:Please fill in both fields"]</code>
                </td></tr>
              <tr><td>good login <code>"  ADA "</code></td>
                <td><code>["showError:", "showWelcome:Ada"]</code></td></tr>
              <tr><td>3 wrong passwords</td><td>2 × "tries left", then "Locked." and
                <code>"setLoginEnabled:false"</code></td></tr>
            </table>
            <p>Console: <code>✓ empty fields show an error</code>,
            <code>✓ good login clears error and welcomes with a capital letter</code>,
            <code>✓ 3 wrong passwords lock the button</code>.</p>
            <div class="tip">Try this: change <code>failures &gt;= 3</code> to
            <code>failures &gt;= 4</code> in the presenter. The lock test fails instantly
            with a message showing the calls it got, with no clicking needed.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In MVP, what does the View do when the user clicks "Log in"?',
        options: ['Validates the fields itself', 'Calls the Model directly',
          'Forwards the event to the Presenter (presenter.onLoginClicked())', 'Nothing'],
        answer: 2,
        why: 'The View is passive: it just forwards user events to the Presenter.',
      },
      {
        q: 'How does the Presenter show an error?',
        options: ['document.getElementById("error").textContent = ...', 'By calling a view interface method like view.showError(msg)',
          'By throwing an exception', 'By updating the Model and waiting'],
        answer: 1,
        why: 'The Presenter only knows the view interface. That is what lets tests swap in a fake view.',
      },
      {
        q: 'Why is a Presenter easy to unit-test?',
        options: ['It has no code', 'It depends on an interface, so a fake view can record calls without any UI',
          'It runs on the server', 'Tests can click its buttons'],
        answer: 1,
        why: 'Inject a FakeView (and fake model), call presenter methods, assert on the recorded calls.',
      },
      {
        q: 'Which company first described MVP in the 1990s?',
        options: ['Google', 'Taligent (an Apple/IBM joint venture)', 'Microsoft', 'Xerox PARC'],
        answer: 1,
        why: "Mike Potel's 1996 Taligent paper; Dolphin Smalltalk and later Fowler's writing spread it.",
      },
    ],
    exercise: {
      task: `
        <p>Test-first: add a rule <em>"passwords shorter than 6 characters are rejected
        <strong>before</strong> calling the model"</em>, with the error
        <code>Password must be at least 6 characters</code>. It should not count as a failed
        attempt.</p>
        <ol>
          <li>Write the test (fake view + check the recorded calls). Watch it fail.</li>
          <li>Add the rule to <code>LoginPresenter.onLoginClicked()</code>.</li>
          <li>Bonus: prove the model was never called (count calls in <code>fakeAuth</code>).
          </li>
          <li>Does an existing test break? Fix its data so it still tests what it meant to.</li>
        </ol>
      `,
      starter: `// Exercise: add a "password too short" rule to the presenter, test-first.

// ===== MODEL (a fake too: we control exactly what it answers) =====
const fakeAuth = {
  login(user, pass) {
    return user === 'ada' && pass === 'lovelace';
  },
};

// ===== PRESENTER (copied unchanged from the previous example) =====
class LoginPresenter {
  constructor(view, auth) {
    this.view = view;
    this.auth = auth;
    this.failures = 0;
  }

  onLoginClicked() {
    const user = this.view.getUsername().trim().toLowerCase();
    const pass = this.view.getPassword();
    if (!user || !pass) {
      this.view.showError('Please fill in both fields');
      return;
    }
    if (this.auth.login(user, pass)) {
      this.failures = 0;
      this.view.showError('');
      this.view.showWelcome(user[0].toUpperCase() + user.slice(1));
      return;
    }
    this.failures++;
    if (this.failures >= 3) {
      this.view.showError('Too many attempts. Locked.');
      this.view.setLoginEnabled(false);
    } else {
      this.view.showError(\`Wrong password (tries left: \${3 - this.failures})\`);
    }
  }
}

// ===== FAKE VIEW (implements the same interface; just records calls) =====
class FakeView {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.calls = []; // e.g. ['showError:Please fill in both fields']
  }
  getUsername() { return this.username; }
  getPassword() { return this.password; }
  showError(msg) { this.calls.push('showError:' + msg); }
  showWelcome(name) { this.calls.push('showWelcome:' + name); }
  setLoginEnabled(on) { this.calls.push('setLoginEnabled:' + on); }
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

function expectCalls(view, expected) {
  const got = JSON.stringify(view.calls);
  if (got !== JSON.stringify(expected)) throw new Error('got ' + got);
}

test('empty fields show an error', () => {
  const view = new FakeView('', '');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:Please fill in both fields']);
});

test('good login clears error and welcomes with a capital letter', () => {
  const view = new FakeView('  ADA ', 'lovelace');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:', 'showWelcome:Ada']);
});

test('3 wrong passwords lock the button', () => {
  const view = new FakeView('ada', 'nope');
  const presenter = new LoginPresenter(view, fakeAuth);
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  expectCalls(view, [
    'showError:Wrong password (tries left: 2)',
    'showError:Wrong password (tries left: 1)',
    'showError:Too many attempts. Locked.',
    'setLoginEnabled:false',
  ]);
});

// TODO: write this test, watch it fail (✗), then make the presenter pass it.
// test('short password (< 6 chars) is rejected before calling the model', () => {
//   const view = new FakeView('ada', 'abc');
//   ...
//   expectCalls(view, ['showError:Password must be at least 6 characters']);
// });

document.getElementById('root').textContent = 'Tests ran: see the console.';`,
      hint: 'After the empty-fields check: if (pass.length &lt; 6) { this.view.showError("Password must be at least 6 characters"); return; }. The "3 wrong passwords" test uses "nope" (4 chars), so it now hits the new rule: change it to a 6+ char wrong password.',
      solution: `// Solution: a new presenter rule, pinned down by a test with a fake view.

// ===== MODEL (a fake too: we control exactly what it answers) =====
const fakeAuth = {
  calls: 0,
  login(user, pass) {
    this.calls++;
    return user === 'ada' && pass === 'lovelace';
  },
};

// ===== PRESENTER (copied unchanged from the previous example) =====
class LoginPresenter {
  constructor(view, auth) {
    this.view = view;
    this.auth = auth;
    this.failures = 0;
  }

  onLoginClicked() {
    const user = this.view.getUsername().trim().toLowerCase();
    const pass = this.view.getPassword();
    if (!user || !pass) {
      this.view.showError('Please fill in both fields');
      return;
    }
    if (pass.length < 6) {
      this.view.showError('Password must be at least 6 characters');
      return; // not a failed attempt: we never asked the model
    }
    if (this.auth.login(user, pass)) {
      this.failures = 0;
      this.view.showError('');
      this.view.showWelcome(user[0].toUpperCase() + user.slice(1));
      return;
    }
    this.failures++;
    if (this.failures >= 3) {
      this.view.showError('Too many attempts. Locked.');
      this.view.setLoginEnabled(false);
    } else {
      this.view.showError(\`Wrong password (tries left: \${3 - this.failures})\`);
    }
  }
}

// ===== FAKE VIEW (implements the same interface; just records calls) =====
class FakeView {
  constructor(username, password) {
    this.username = username;
    this.password = password;
    this.calls = []; // e.g. ['showError:Please fill in both fields']
  }
  getUsername() { return this.username; }
  getPassword() { return this.password; }
  showError(msg) { this.calls.push('showError:' + msg); }
  showWelcome(name) { this.calls.push('showWelcome:' + name); }
  setLoginEnabled(on) { this.calls.push('setLoginEnabled:' + on); }
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

function expectCalls(view, expected) {
  const got = JSON.stringify(view.calls);
  if (got !== JSON.stringify(expected)) throw new Error('got ' + got);
}

test('empty fields show an error', () => {
  const view = new FakeView('', '');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:Please fill in both fields']);
});

test('good login clears error and welcomes with a capital letter', () => {
  const view = new FakeView('  ADA ', 'lovelace');
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:', 'showWelcome:Ada']);
});

test('3 wrong passwords lock the button', () => {
  const view = new FakeView('ada', 'nope!!');
  const presenter = new LoginPresenter(view, fakeAuth);
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  presenter.onLoginClicked();
  expectCalls(view, [
    'showError:Wrong password (tries left: 2)',
    'showError:Wrong password (tries left: 1)',
    'showError:Too many attempts. Locked.',
    'setLoginEnabled:false',
  ]);
});

test('short password (< 6 chars) is rejected before calling the model', () => {
  const view = new FakeView('ada', 'abc');
  fakeAuth.calls = 0;
  new LoginPresenter(view, fakeAuth).onLoginClicked();
  expectCalls(view, ['showError:Password must be at least 6 characters']);
  if (fakeAuth.calls !== 0) throw new Error('model was called');
});

document.getElementById('root').textContent = 'Tests ran: see the console.';`,
    },
  },

  // ------------------------------------------------------------------ 5
  {
    id: 'mvp-vs-mvc',
    section: 'MVC family',
    title: 'MVC vs MVP: Passive View & Supervising Controller',
    explain: `
      <p>In 2006 Martin Fowler retired his single "Model View Presenter" write-up and split it
      into two patterns, because people meant two different things by MVP. The question is:
      <strong>how much does the View know about the Model?</strong></p>
      <ul>
        <li><strong>Supervising Controller</strong>: the View does simple things itself via
        <em>data binding</em> to the Model (show this field, this number). The Presenter
        ("controller") handles user input and <em>only the complex</em> view logic: colours,
        enabling buttons, cross-field rules. Less code, a bit less testable.</li>
        <li><strong>Passive View</strong>: the View knows <em>nothing</em> about the Model.
        The Presenter pushes every value into the View. Most code, most testable: with a fake
        view you can test every pixel of logic.</li>
      </ul>
      <p>Use the interactive diagram below to compare the arrows.</p>

      <table>
        <tr><th></th><th>Classic MVC</th><th>MVP: Supervising Controller</th>
          <th>MVP: Passive View</th></tr>
        <tr><td>Who receives user input?</td><td>Controller</td><td>View → forwards to
          Presenter</td><td>View → forwards to Presenter</td></tr>
        <tr><td>Does the View know the Model?</td><td>Yes: observes and reads it</td>
          <td>Yes, for simple data binding</td><td><strong>No</strong></td></tr>
        <tr><td>Who updates the screen?</td><td>View, after Model notifies</td>
          <td>Binding for simple data; Presenter for complex</td><td>Presenter, always</td></tr>
        <tr><td>Test without a UI</td><td>Model yes; view logic hard</td>
          <td>Complex logic yes; bindings no</td><td>Almost everything</td></tr>
        <tr><td>Boilerplate</td><td>Low</td><td>Medium</td><td>High</td></tr>
        <tr><td>Typical home</td><td>Smalltalk-80</td><td>WinForms/WPF with binding</td>
          <td>Android MVP, WinForms, GWT apps</td></tr>
      </table>
      <div class="tip">Supervising Controller's "View binds to the Model, logic lives
      elsewhere" is one step away from <strong>MVVM</strong>, where the View binds to a
      ViewModel that exposes ready-to-display state. That's the next section.</div>
      <div class="warn">Don't worry about getting the labels exactly right in code reviews.
      Real codebases mix these. What matters is being deliberate about <em>which</em> logic
      is in the View (hard to test) and which is in the Presenter (easy to test).</div>
    `,
    examples: [
      {
        title: 'Interactive diagram: switch the pattern and watch the arrows',
        lang: 'html',
        code: `<style>
  .tabs button.on { background: #4f6bed; color: #fff; border-color: #4f6bed; }
  svg { display: block; margin: 6px auto; max-width: 100%; }
  .node rect { fill: #f4f5f9; stroke: #8a93b0; stroke-width: 2; }
  .node text {
    font: bold 14px system-ui; text-anchor: middle; dominant-baseline: middle;
  }
  .arrow line { stroke: #e07b00; stroke-width: 2.2; }
  .arrow.dashed line { stroke-dasharray: 6 4; stroke: #6a7cc9; }
  .arrow text { font: 12px system-ui; fill: #333; text-anchor: middle; }
  #desc { padding: 8px 12px; border-left: 4px solid #4f6bed; background: #f7f8fc;
    font-size: 14px; }
</style>

<div class="tabs">
  <button data-p="mvc" class="on">Classic MVC</button>
  <button data-p="sc">MVP: Supervising Controller</button>
  <button data-p="pv">MVP: Passive View</button>
</div>
<svg id="svg" width="520" height="300" viewBox="0 0 520 300"></svg>
<div id="desc"></div>

<script>
  const NODES = {
    M: [260, 40, 'Model'],
    V: [95, 180, 'View'],
    X: [425, 180, 'Controller'],
    U: [260, 270, 'User'],
  };

  // [from, to, label, dashed?]  dashed = observer / data-binding notification
  const PATTERNS = {
    mvc: {
      x: 'Controller',
      arrows: [
        ['U', 'X', 'mouse / keys'],
        ['X', 'M', 'update data'],
        ['M', 'V', 'changed (observer)', true],
        ['V', 'M', 'read data'],
        ['V', 'U', 'sees'],
      ],
      desc: '<b>Classic MVC</b>: the <b>Controller</b> receives input and changes the Model. ' +
        'The Model notifies its dependent Views (observer), and each View reads the Model ' +
        'and redraws itself. View and Controller come in pairs.',
    },
    sc: {
      x: 'Presenter',
      arrows: [
        ['U', 'V', 'clicks'],
        ['V', 'X', 'onLoginClicked()'],
        ['X', 'M', 'update data'],
        ['M', 'V', 'simple data binding', true],
        ['X', 'V', 'complex view logic'],
      ],
      desc: '<b>Supervising Controller</b>: the View handles input and forwards it to the ' +
        '<b>Presenter</b>. Simple display is <em>data-bound</em> straight to the Model; the ' +
        'Presenter steps in only for the complex stuff (colours, enabling, errors).',
    },
    pv: {
      x: 'Presenter',
      arrows: [
        ['U', 'V', 'clicks'],
        ['V', 'X', 'onLoginClicked()'],
        ['X', 'M', 'update data'],
        ['M', 'X', 'changed', true],
        ['X', 'V', 'view.showError(...)'],
      ],
      desc: '<b>Passive View</b>: the View knows <em>nothing</em> about the Model. The ' +
        '<b>Presenter</b> pushes every single value into the View through its interface. ' +
        'Most testable (fake the whole View), most boilerplate.',
    },
  };

  function arrowSvg([from, to, label, dashed], all) {
    let [x1, y1] = NODES[from];
    let [x2, y2] = NODES[to];
    const len = Math.hypot(x2 - x1, y2 - y1);
    const [ux, uy] = [(x2 - x1) / len, (y2 - y1) / len];
    // if there is also an arrow going the other way, shift both sideways
    const twin = all.some(a => a[0] === to && a[1] === from);
    const off = twin ? 9 : 0;
    const [px, py] = [-uy * off, ux * off];
    // stop the line at the edge of the 110x40 box (+ a small gap)
    const pad = Math.min(55 / Math.abs(ux || 1e-9), 20 / Math.abs(uy || 1e-9)) + 6;
    x1 += ux * pad + px; y1 += uy * pad + py;
    x2 -= ux * pad - px; y2 -= uy * pad - py;
    const [mx, my] = [(x1 + x2) / 2 - uy * 14 * (twin ? 1.8 : 1),
      (y1 + y2) / 2 + ux * 14 * (twin ? 1.8 : 1)];
    return \`<g class="arrow\${dashed ? ' dashed' : ''}">
      <line x1="\${x1}" y1="\${y1}" x2="\${x2}" y2="\${y2}"
        marker-end="url(#\${dashed ? 'hb' : 'ho'})"/>
      <text x="\${mx}" y="\${my}">\${label}</text></g>\`;
  }

  function draw(p) {
    const pat = PATTERNS[p];
    const defs = \`<defs>
      <marker id="ho" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
        orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#e07b00"/></marker>
      <marker id="hb" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7"
        orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#6a7cc9"/></marker></defs>\`;
    const nodes = Object.entries(NODES).map(([k, [x, y, name]]) => \`
      <g class="node"><rect x="\${x - 55}" y="\${y - 20}" width="110" height="40" rx="10"/>
      <text x="\${x}" y="\${y}">\${k === 'X' ? pat.x : name}</text></g>\`).join('');
    const arrows = pat.arrows.map(a => arrowSvg(a, pat.arrows)).join('');
    document.getElementById('svg').innerHTML = defs + arrows + nodes;
    document.getElementById('desc').innerHTML = pat.desc;
    document.querySelectorAll('.tabs button').forEach(b =>
      b.classList.toggle('on', b.dataset.p === p));
    console.log('pattern:', p, '-', pat.arrows.map(a => a[0] + '->' + a[1]).join(', '));
  }

  document.querySelectorAll('.tabs button').forEach(b => {
    b.onclick = () => draw(b.dataset.p);
  });
  draw('mvc');
</script>`,
      },
      {
        title: 'Same thermostat, two MVP flavours side by side',
        code: `// One Model, two MVP flavours side by side. Both panels share the SAME thermostat.
// Rule (presentation logic): above 30 °C, show the reading in red with a warning.

// ===== MODEL =====
class Thermostat {
  constructor() {
    this.temp = 25;
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  change(delta) {
    this.temp += delta;
    console.log('[Model] temp =', this.temp);
    this.listeners.forEach(fn => fn(this.temp));
  }
}

const model = new Thermostat();
const root = document.getElementById('root');
root.innerHTML = \`
  <div style="display: flex; gap: 12px">
    <div id="sc" style="flex: 1; border: 1px solid #ccc; padding: 8px"></div>
    <div id="pv" style="flex: 1; border: 1px solid #ccc; padding: 8px"></div>
  </div>
\`;

function panelHtml(title) {
  return \`<b>\${title}</b><br>
    <button class="down">-5</button> <button class="up">+5</button>
    <h2 class="temp"></h2><p class="warn"></p>\`;
}

// ===== A. SUPERVISING CONTROLLER =====
// The view binds SIMPLE data straight to the model...
class ScView {
  constructor(el, model) {
    el.innerHTML = panelHtml('Supervising Controller');
    this.el = el;
    model.subscribe(t => this.showTemp(t)); // <- view knows the model (data binding)
    this.showTemp(model.temp);
  }
  showTemp(t) {
    console.log('[View:SC] bound to model, shows', t);
    this.el.querySelector('.temp').textContent = t + ' °C';
  }
  bindPresenter(p) {
    this.el.querySelector('.up').onclick = () => p.onChange(5);
    this.el.querySelector('.down').onclick = () => p.onChange(-5);
  }
  setWarning(on) {
    this.el.querySelector('.temp').style.color = on ? 'crimson' : '';
    this.el.querySelector('.warn').textContent = on ? 'Too hot!' : '';
  }
}

// ...and the presenter only handles input and the COMPLEX bit (the warning).
class ScPresenter {
  constructor(view, model) {
    model.subscribe(t => {
      console.log('[Presenter:SC] warning?', t > 30);
      view.setWarning(t > 30);
    });
    view.bindPresenter({ onChange: d => model.change(d) });
    view.setWarning(model.temp > 30);
  }
}

// ===== B. PASSIVE VIEW =====
// The view has NO model reference. It only has setters.
class PvView {
  constructor(el) {
    el.innerHTML = panelHtml('Passive View');
    this.el = el;
  }
  bindPresenter(p) {
    this.el.querySelector('.up').onclick = () => p.onChange(5);
    this.el.querySelector('.down').onclick = () => p.onChange(-5);
  }
  setTempText(text) {
    this.el.querySelector('.temp').textContent = text;
  }
  setWarning(on) {
    this.el.querySelector('.temp').style.color = on ? 'crimson' : '';
    this.el.querySelector('.warn').textContent = on ? 'Too hot!' : '';
  }
}

// The presenter formats and pushes EVERYTHING.
class PvPresenter {
  constructor(view, model) {
    this.view = view;
    model.subscribe(t => this.present(t));
    view.bindPresenter({ onChange: d => model.change(d) });
    this.present(model.temp);
  }
  present(t) {
    console.log(\`[Presenter:PV] setTempText("\${t} °C"), setWarning(\${t > 30})\`);
    this.view.setTempText(t + ' °C');
    this.view.setWarning(t > 30);
  }
}

// ===== WIRING =====
new ScPresenter(new ScView(document.getElementById('sc'), model), model);
new PvPresenter(new PvView(document.getElementById('pv')), model);`,
        explain: `
          <details>
            <summary>Step by step: click +5 twice (25 → 30 → 35)</summary>
            <p>Both panels share one model, so clicking either panel's button updates both.
            Subscribers run in the order they subscribed: the SC view, then the SC presenter,
            then the PV presenter.</p>
            <table>
              <tr><th>Click</th><th>Console</th></tr>
              <tr><td>Load</td><td><code>[View:SC] bound to model, shows 25</code><br>
                <code>[Presenter:PV] setTempText("25 °C"), setWarning(false)</code></td></tr>
              <tr><td>+5</td><td><code>[Model] temp = 30</code><br>
                <code>[View:SC] bound to model, shows 30</code><br>
                <code>[Presenter:SC] warning? false</code><br>
                <code>[Presenter:PV] setTempText("30 °C"), setWarning(false)</code></td></tr>
              <tr><td>+5</td><td><code>[Model] temp = 35</code><br>
                <code>[View:SC] bound to model, shows 35</code><br>
                <code>[Presenter:SC] warning? true</code><br>
                <code>[Presenter:PV] setTempText("35 °C"), setWarning(true)</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Spot the difference in the code</summary>
            <ul>
              <li><code>ScView</code>'s constructor takes the <code>model</code> and subscribes
              to it: <em>simple</em> display (the number) is bound directly.
              <code>ScPresenter</code> only computes the warning.</li>
              <li><code>PvView</code> has no model parameter at all. <code>PvPresenter</code>
              formats the text (<code>t + ' °C'</code>) and pushes both values.</li>
              <li>To unit-test "the text says 35 °C" you need a real DOM for SC (the
              formatting is inside the view), but just a fake view for PV.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In Passive View, does the View hold a reference to the Model?',
        options: ['Yes, it subscribes to it', 'No, the Presenter pushes everything into the View',
          'Only in tests', 'Only for reading'],
        answer: 1,
        why: 'That is the defining feature: the View is completely passive and model-agnostic.',
      },
      {
        q: 'In Supervising Controller, what does the View handle itself?',
        options: ['Nothing', 'Simple data binding to the Model', 'All business rules', 'Database access'],
        answer: 1,
        why: 'Simple mapping of model fields to widgets is done via binding; the controller/presenter handles complex view logic.',
      },
      {
        q: 'Which variant is the most testable without a UI, and why?',
        options: ['Classic MVC, because Views observe the Model', 'Supervising Controller, because it has less code',
          'Passive View, because all view logic sits in the Presenter behind an interface', 'They are equal'],
        answer: 2,
        why: 'With Passive View, a fake view can check every piece of presentation logic.',
      },
      {
        q: 'In classic MVC, who receives user input?',
        options: ['The View', 'The Controller', 'The Model', 'The Presenter'],
        answer: 1,
        why: 'Classic MVC controllers handle input. In MVP, the View receives input and forwards it to the Presenter.',
      },
    ],
    exercise: {
      task: `
        <p>The starter is a <strong>Supervising Controller</strong>: <code>CartView</code>
        subscribes to the model and formats <code>"N items"</code> itself (and says "1 items",
        oops). Convert it to <strong>Passive View</strong>:</p>
        <ol>
          <li>Remove the <code>model</code> parameter from <code>CartView</code>; replace
          <code>render(n)</code> with a dumb <code>setBadgeText(text)</code>.</li>
          <li>The presenter subscribes to the model and calls
          <code>view.setBadgeText(...)</code> and <code>view.setAddEnabled(n &lt; 5)</code>.
          It formats "1 item" / "N items".</li>
          <li>Bonus: test the presenter with a fake view object.</li>
        </ol>
      `,
      starter: `// Supervising Controller today. Your job: turn it into a Passive View.

// ===== MODEL =====
class Cart {
  constructor() {
    this.count = 0;
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  add() {
    this.count++;
    console.log('[Model] count =', this.count);
    this.listeners.forEach(fn => fn(this.count));
  }
}

// ===== VIEW =====
class CartView {
  constructor(root, model) {
    root.innerHTML = '<button id="add">Add item</button> <b id="badge"></b>';
    this.root = root;
    // TODO: the view should NOT know the model. Remove this binding...
    model.subscribe(n => this.render(n));
    this.render(model.count);
  }
  // ...and replace render(n) with a dumb setter: setBadgeText(text)
  render(n) {
    this.root.querySelector('#badge').textContent = n + ' items';
  }
  setAddEnabled(on) {
    this.root.querySelector('#add').disabled = !on;
  }
  bindPresenter(p) {
    this.root.querySelector('#add').onclick = () => p.onAddClicked();
  }
}

// ===== PRESENTER =====
class CartPresenter {
  constructor(view, model) {
    this.view = view;
    this.model = model;
    // TODO: subscribe here and push the badge text AND the enabled state to the view.
    //       Format "1 item" / "2 items" here (that's presentation logic).
    model.subscribe(n => view.setAddEnabled(n < 5));
    view.bindPresenter(this);
  }
  onAddClicked() {
    this.model.add();
  }
}

// ===== WIRING =====
const model = new Cart();
new CartPresenter(new CartView(document.getElementById('root'), model), model);

// TODO (bonus): with a FakeView, test that after one add the badge text is "1 item".`,
      hint: 'Give the presenter a present(n) method: const text = n === 1 ? "1 item" : n + " items"; view.setBadgeText(text); view.setAddEnabled(n &lt; 5). Call it from model.subscribe and once at startup.',
      solution: `// Passive View: the view has no model; the presenter pushes every value.

// ===== MODEL =====
class Cart {
  constructor() {
    this.count = 0;
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  add() {
    this.count++;
    console.log('[Model] count =', this.count);
    this.listeners.forEach(fn => fn(this.count));
  }
}

// ===== VIEW (only setters + forwarding clicks) =====
class CartView {
  constructor(root) {
    root.innerHTML = '<button id="add">Add item</button> <b id="badge"></b>';
    this.root = root;
  }
  setBadgeText(text) {
    this.root.querySelector('#badge').textContent = text;
  }
  setAddEnabled(on) {
    this.root.querySelector('#add').disabled = !on;
  }
  bindPresenter(p) {
    this.root.querySelector('#add').onclick = () => p.onAddClicked();
  }
}

// ===== PRESENTER (all presentation logic) =====
class CartPresenter {
  constructor(view, model) {
    this.view = view;
    this.model = model;
    model.subscribe(n => this.present(n));
    view.bindPresenter(this);
    this.present(model.count);
  }
  present(n) {
    const text = n === 1 ? '1 item' : n + ' items';
    console.log('[Presenter] badge =', JSON.stringify(text), '| add enabled =', n < 5);
    this.view.setBadgeText(text);
    this.view.setAddEnabled(n < 5);
  }
  onAddClicked() {
    this.model.add();
  }
}

// ===== WIRING =====
const model = new Cart();
new CartPresenter(new CartView(document.getElementById('root')), model);

// ===== TEST with a fake view =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

test('one add shows "1 item"; five adds disable the button', () => {
  const fake = {
    badge: '',
    enabled: true,
    setBadgeText(t) { this.badge = t; },
    setAddEnabled(on) { this.enabled = on; },
    bindPresenter() {},
  };
  const cart = new Cart();
  const p = new CartPresenter(fake, cart);
  p.onAddClicked();
  if (fake.badge !== '1 item') throw new Error('badge = ' + fake.badge);
  for (let i = 0; i < 4; i++) p.onAddClicked();
  if (fake.enabled !== false) throw new Error('button still enabled');
});`,
    },
  },
);
