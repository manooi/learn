window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-intro',
    section: 'MVVM',
    title: 'MVVM: Model-View-ViewModel',
    explain: `
      <p><strong>MVVM</strong> was described by <strong>John Gossman</strong> at Microsoft in
      <strong>2005</strong>, for building apps with <strong>WPF</strong> and its XML markup
      language <strong>XAML</strong>. WPF had a powerful <em>data binding</em> engine, and MVVM is
      the pattern that makes the most of it.</p>

      <h3>The three parts</h3>
      <ul>
        <li><strong>Model</strong>: your data and business rules (same as in MVC/MVP).</li>
        <li><strong>View</strong>: the screen. Ideally it is <em>just markup</em>: "this input shows
        <code>celsiusText</code>", "this button runs <code>reset</code>".</li>
        <li><strong>ViewModel</strong>: the <em>"model of the view"</em>. It holds everything the
        screen needs, already prepared for display: strings, flags like <code>isValid</code>,
        error messages, and <strong>commands</strong> (actions the screen can trigger).</li>
      </ul>
      <p>The piece that connects View and ViewModel is <strong>binding</strong>. When the
      ViewModel changes, bound elements update. When the user types, the bound ViewModel
      property is written. You met one-way and two-way binding in Foundations: MVVM is built
      on top of them.</p>

      <div class="tip"><strong>Analogy:</strong> the ViewModel is a <em>car dashboard's
      computer</em>. It calculates "speed: 88 km/h" and "fuel warning: on". It has no idea
      whether those values end up on an analog needle, a digital display, or a phone app.
      The display (View) simply shows whatever the computer exposes.</div>

      <h3>MVVM vs MVP: who holds a reference to whom?</h3>
      <p>In <strong>MVP</strong> the Presenter holds a reference to the View and <em>calls</em>
      it: <code>view.showFahrenheit('68.0 °F')</code>. In <strong>MVVM</strong> the ViewModel
      <strong>never references the View</strong>. It just changes its own properties and
      announces "I changed". The binding (written by you, or by a framework) pushes those
      values into the screen.</p>
      <pre><code>// MVP: presenter pushes into the view
presenter.onCelsiusTyped('100');   // → calls view.showFahrenheit('212.0 °F')

// MVVM: the view model only changes itself
vm.setCelsiusText('100');          // → vm.fahrenheitText is now '212.0 °F'
                                   //   the binding notices and updates the DOM</code></pre>
      <p>Because the ViewModel has no DOM and no View reference, you can test it with plain
      function calls, and you could put two different Views on the same ViewModel.</p>

      <div class="warn">"The ViewModel knows nothing about the View" does <strong>not</strong>
      mean the ViewModel is generic. It is shaped <em>for one screen</em>: it exposes
      <code>fahrenheitText</code> (a formatted string), not just a raw number. It just doesn't
      know <em>how</em> that string is drawn.</div>
    `,
    examples: [
      {
        title: 'Temperature converter in vanilla MVVM',
        code: `// ===== MODEL =====
// Plain data + rules. Knows nothing about screens.
const temperatureModel = {
  celsius: 20,
  setCelsius(value) {
    this.celsius = value;
    console.log('[Model] celsius =', value);
  },
};

// ===== VIEWMODEL =====
// "Model of the view": view-ready state + commands.
// It never touches the DOM and has no reference to the View.
class TemperatureViewModel {
  constructor(model) {
    this.model = model;
    this.celsiusText = String(model.celsius); // exactly what the input shows
    this.listeners = [];
  }

  get isValid() {
    const text = this.celsiusText.trim();
    return text !== '' && !Number.isNaN(Number(text));
  }

  get fahrenheitText() {
    if (!this.isValid) return '—';
    return (Number(this.celsiusText) * 9 / 5 + 32).toFixed(1) + ' °F';
  }

  get errorText() {
    return this.isValid ? '' : 'Please type a number';
  }

  // Called by the binding when the user types
  setCelsiusText(text) {
    console.log('[ViewModel] setCelsiusText', JSON.stringify(text));
    this.celsiusText = text;
    if (this.isValid) this.model.setCelsius(Number(text));
    this.notify();
  }

  // A "command": an action the View can trigger
  reset() {
    console.log('[ViewModel] reset command');
    this.setCelsiusText('0');
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener());
  }
}

// ===== VIEW =====
// Just markup. No logic.
const root = document.getElementById('root');
root.innerHTML = \`
  <label>Celsius: <input id="celsius" size="6"></label>
  <p>Fahrenheit: <strong id="fahrenheit"></strong></p>
  <p id="error" style="color: crimson; min-height: 1.2em"></p>
  <button id="reset">Reset to 0</button>
\`;

// ===== BINDING (the glue a framework would write for you) =====
function bind(vm) {
  const input = document.getElementById('celsius');
  const fahrenheit = document.getElementById('fahrenheit');
  const error = document.getElementById('error');
  const resetButton = document.getElementById('reset');

  // View → ViewModel
  input.addEventListener('input', () => vm.setCelsiusText(input.value));
  resetButton.addEventListener('click', () => vm.reset());

  // ViewModel → View
  function render() {
    if (input.value !== vm.celsiusText) input.value = vm.celsiusText;
    fahrenheit.textContent = vm.fahrenheitText;
    error.textContent = vm.errorText;
    console.log('[View] rendered', vm.fahrenheitText);
  }
  vm.subscribe(render);
  render();
}

bind(new TemperatureViewModel(temperatureModel));`,
        explain: `
          <details>
            <summary>Who knows whom? (the dependency arrows)</summary>
            <p>Read the code top to bottom and notice which names each part mentions:</p>
            <table>
              <tr><th>Part</th><th>Knows about</th><th>Never mentions</th></tr>
              <tr><td>Model</td><td>only its own data</td><td>ViewModel, DOM</td></tr>
              <tr><td>ViewModel</td><td>the Model</td><td><code>document</code>, inputs,
              the <code>render</code> function</td></tr>
              <tr><td>View (markup)</td><td>nothing: it's a string of HTML</td>
              <td>everything</td></tr>
              <tr><td>Binding (<code>bind</code>)</td><td>the DOM elements <em>and</em> the
              ViewModel</td><td>the Model</td></tr>
            </table>
            <p>The ViewModel says "I changed" through <code>notify()</code>, but it has no idea
            who is listening. The binding is the only code that touches both worlds. In WPF or
            Knockout, the framework writes this <code>bind</code> part for you. That's why
            MVVM feels "magic" there.</p>
          </details>
          <details>
            <summary>Step by step: press Backspace twice, then type <code>3</code></summary>
            <p>The input starts as <code>20</code>. On load, <code>bind()</code> calls
            <code>render()</code> once, so the console shows
            <code>[View] rendered 68.0 °F</code>.</p>
            <table>
              <tr><th>Step</th><th>Input shows</th><th>VM state</th><th>Console</th></tr>
              <tr><td>Backspace</td><td><code>2</code></td>
              <td><code>celsiusText "2"</code>, valid → Model updated</td>
              <td><code>[ViewModel] setCelsiusText "2"</code><br>
              <code>[Model] celsius = 2</code><br>
              <code>[View] rendered 35.6 °F</code></td></tr>
              <tr><td>Backspace</td><td>(empty)</td>
              <td><code>celsiusText ""</code>, <strong>invalid</strong> → Model untouched</td>
              <td><code>[ViewModel] setCelsiusText ""</code><br>
              <code>[View] rendered —</code></td></tr>
              <tr><td>type 3</td><td><code>3</code></td>
              <td><code>celsiusText "3"</code>, valid</td>
              <td><code>[ViewModel] setCelsiusText "3"</code><br>
              <code>[Model] celsius = 3</code><br>
              <code>[View] rendered 37.4 °F</code></td></tr>
              <tr><td>click Reset</td><td><code>0</code></td>
              <td><code>celsiusText "0"</code></td>
              <td><code>[ViewModel] reset command</code><br>
              <code>[ViewModel] setCelsiusText "0"</code><br>
              <code>[Model] celsius = 0</code><br>
              <code>[View] rendered 32.0 °F</code></td></tr>
            </table>
            <p>Notice the empty-input step: the ViewModel keeps the <em>raw text</em> the user
            typed (<code>""</code>) even though it isn't a valid temperature. The Model only
            ever receives clean numbers. Holding "in-between" UI state like this is a core job
            of a ViewModel.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>get fahrenheitText() {                     // ① derived, view-ready
  if (!this.isValid) return '—';
  return (...).toFixed(1) + ' °F';
}
input.addEventListener('input',
  () =&gt; vm.setCelsiusText(input.value));  // ② View → ViewModel
vm.subscribe(render);                      // ③ ViewModel → View
if (input.value !== vm.celsiusText)        // ④ don't fight the user's typing
  input.value = vm.celsiusText;</code></pre>
            <ol>
              <li><strong>①</strong> The VM hands out a finished string, not a raw number. The
              View never does maths or formatting.</li>
              <li><strong>②</strong> One direction of the two-way binding: every keystroke
              writes into the VM.</li>
              <li><strong>③</strong> The other direction: whenever the VM notifies,
              <code>render</code> copies VM values into the DOM.</li>
              <li><strong>④</strong> When the user types, the input already equals
              <code>celsiusText</code>, so it is left alone. Only when the VM changes it
              itself (Reset) is the input overwritten.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Type <code>abc</code>: the error appears, the Model never logs.</li>
              <li>Add a second "view" on the same VM: create a
              <code>&lt;p id="kelvin"&gt;</code> and a second
              <code>vm.subscribe(() =&gt; ...)</code> that shows Kelvin. You didn't have to
              change the ViewModel's rules, only add a getter. Two Views, one ViewModel.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'For contrast: the same screen in MVP',
        code: `// ===== PRESENTER (MVP) =====
// Holds a reference to the view and CALLS it.
class TemperaturePresenter {
  constructor(view) {
    this.view = view;
  }

  onCelsiusTyped(text) {
    console.log('[Presenter] onCelsiusTyped', JSON.stringify(text));
    const n = Number(text.trim());
    if (text.trim() === '' || Number.isNaN(n)) {
      this.view.showFahrenheit('—');
      this.view.showError('Please type a number');
      return;
    }
    this.view.showFahrenheit((n * 9 / 5 + 32).toFixed(1) + ' °F');
    this.view.showError('');
  }
}

// ===== VIEW (MVP) =====
// Exposes methods the presenter calls: showFahrenheit, showError.
const root = document.getElementById('root');
root.innerHTML = \`
  <label>Celsius: <input id="celsius" size="6" value="20"></label>
  <p>Fahrenheit: <strong id="fahrenheit"></strong></p>
  <p id="error" style="color: crimson; min-height: 1.2em"></p>
\`;

const input = document.getElementById('celsius');
const view = {
  showFahrenheit(text) {
    console.log('[View] showFahrenheit', text);
    document.getElementById('fahrenheit').textContent = text;
  },
  showError(text) {
    document.getElementById('error').textContent = text;
  },
};

const presenter = new TemperaturePresenter(view);
input.addEventListener('input', () => presenter.onCelsiusTyped(input.value));
presenter.onCelsiusTyped(input.value);

// Compare with the MVVM version:
//  MVP : presenter → view.showFahrenheit(...)   (presenter knows the view)
//  MVVM: vm.fahrenheitText changes → binding updates DOM (vm knows nothing)`,
      },
    ],
    quiz: [
      {
        q: 'Who described MVVM, and for which technology?',
        options: [
          'Trygve Reenskaug, for Smalltalk-80',
          'John Gossman at Microsoft, for WPF/XAML (2005)',
          'Facebook engineers, for React',
          'Martin Fowler, for Java Swing',
        ],
        answer: 1,
        why: 'Gossman blogged about MVVM in 2005 while working on WPF. Reenskaug is the father of MVC.',
      },
      {
        q: 'What is the main structural difference between a Presenter (MVP) and a ViewModel?',
        options: [
          'A ViewModel can talk to the Model, a Presenter cannot',
          'A Presenter has no state, a ViewModel has lots',
          'A Presenter holds a reference to the View and calls it; a ViewModel never references the View',
          'There is no difference, they are two names for the same thing',
        ],
        answer: 2,
        why: 'In MVVM the dependency points one way: View (via binding) → ViewModel. The VM only changes its own state and notifies.',
      },
      {
        q: 'Which property best belongs on a ViewModel for a temperature screen?',
        options: [
          '<code>fahrenheitText: "68.0 °F"</code>',
          '<code>inputElement: HTMLInputElement</code>',
          '<code>renderToDom()</code>',
          '<code>databaseConnection</code>',
        ],
        answer: 0,
        why: 'The VM exposes view-ready state (formatted text, flags). DOM elements and rendering belong to the View; database access belongs to the Model/services.',
      },
      {
        q: 'In the example, why does <code>render()</code> check <code>input.value !== vm.celsiusText</code> before writing?',
        options: [
          'Because writing to an input is slow',
          'So that typing is not interrupted: the input already shows what the user typed, so it is only overwritten when the VM changed it (e.g. Reset)',
          'Because <code>input.value</code> is read-only',
          'It is required by the browser for security',
        ],
        answer: 1,
        why: 'Overwriting an input the user is typing into can move the cursor. The check makes two-way binding only write when the values really differ.',
      },
    ],
    exercise: {
      task: `
        <p>Build a <strong>login form</strong> in MVVM style. The ViewModel must expose:</p>
        <ul>
          <li><code>email</code> and <code>password</code> (strings) plus a setter method that
          notifies.</li>
          <li><code>canSubmit</code>: <code>true</code> only when email contains
          <code>@</code> and password has at least 6 characters.</li>
          <li><code>statusText</code>: <code>'Fill in the form'</code> or
          <code>'Ready to log in'</code>, and after the <code>login()</code> command
          <code>'Logged in as …'</code>.</li>
        </ul>
        <p>The binding code is written for you. Fill in the ViewModel TODOs so the button gets
        enabled at the right moment.</p>
      `,
      starter: `// ===== VIEWMODEL =====
class LoginViewModel {
  constructor() {
    this.email = '';
    this.password = '';
    this.loggedInAs = null;
    this.listeners = [];
  }

  get canSubmit() {
    // TODO: email contains '@' AND password.length >= 6
    return false;
  }

  get statusText() {
    // TODO: 'Logged in as <email>' / 'Ready to log in' / 'Fill in the form'
    return 'Fill in the form';
  }

  setField(name, value) {
    this[name] = value;
    console.log('[ViewModel]', name, 'changed; canSubmit =', this.canSubmit);
    this.notify();
  }

  login() {
    // TODO: only if canSubmit: set loggedInAs to email, log, notify
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p><input id="email" placeholder="email"></p>
  <p><input id="password" type="password" placeholder="password"></p>
  <button id="login">Log in</button>
  <p id="status"></p>
\`;

// ===== BINDING =====
const vm = new LoginViewModel();
const $ = (id) => document.getElementById(id);
$('email').addEventListener('input', (e) => vm.setField('email', e.target.value));
$('password').addEventListener('input', (e) => vm.setField('password', e.target.value));
$('login').addEventListener('click', () => vm.login());

function render() {
  $('login').disabled = !vm.canSubmit;
  $('status').textContent = vm.statusText;
}
vm.subscribe(render);
render();`,
      hint: 'canSubmit is one line: <code>return this.email.includes("@") &amp;&amp; this.password.length &gt;= 6;</code>. statusText checks <code>loggedInAs</code> first, then canSubmit. login() should return early when <code>!this.canSubmit</code>.',
      solution: `// ===== VIEWMODEL =====
class LoginViewModel {
  constructor() {
    this.email = '';
    this.password = '';
    this.loggedInAs = null;
    this.listeners = [];
  }

  get canSubmit() {
    return this.email.includes('@') && this.password.length >= 6;
  }

  get statusText() {
    if (this.loggedInAs) return 'Logged in as ' + this.loggedInAs;
    return this.canSubmit ? 'Ready to log in' : 'Fill in the form';
  }

  setField(name, value) {
    this[name] = value;
    console.log('[ViewModel]', name, 'changed; canSubmit =', this.canSubmit);
    this.notify();
  }

  login() {
    if (!this.canSubmit) return;
    this.loggedInAs = this.email;
    console.log('[ViewModel] login command for', this.email);
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p><input id="email" placeholder="email"></p>
  <p><input id="password" type="password" placeholder="password"></p>
  <button id="login">Log in</button>
  <p id="status"></p>
\`;

// ===== BINDING =====
const vm = new LoginViewModel();
const $ = (id) => document.getElementById(id);
$('email').addEventListener('input', (e) => vm.setField('email', e.target.value));
$('password').addEventListener('input', (e) => vm.setField('password', e.target.value));
$('login').addEventListener('click', () => vm.login());

function render() {
  $('login').disabled = !vm.canSubmit;
  $('status').textContent = vm.statusText;
}
vm.subscribe(render);
render();`,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-binding-engine',
    section: 'MVVM',
    title: 'Build a tiny binding engine',
    explain: `
      <p>In the previous lesson we wrote the glue by hand: "when the VM changes, set this
      element's text". Real MVVM frameworks let you write the glue <strong>declaratively in the
      markup</strong> instead. <strong>Knockout.js</strong> (2010) popularised this on the web:</p>
      <pre><code class="language-html">&lt;input data-bind="value: first"&gt;
&lt;span data-bind="text: fullName"&gt;&lt;/span&gt;
&lt;button data-bind="click: save"&gt;Save&lt;/button&gt;</code></pre>
      <p>A <strong>binder</strong> (Knockout calls it <code>ko.applyBindings(vm)</code>) scans
      the page for <code>data-bind</code> attributes and wires each element to the matching
      ViewModel property. In this lesson we build one in about 40 lines.</p>

      <h3>Ingredients</h3>
      <ul>
        <li><strong>Observable property</strong>: a function you call with no arguments to
        <em>read</em> (<code>vm.first()</code>) and with one argument to <em>write</em>
        (<code>vm.first('Grace')</code>). Writing notifies subscribers. This is the observer
        pattern from Foundations, wrapped in a function.</li>
        <li><strong>Binding handlers</strong>: one small function per binding type.
        <code>text</code> is one-way (VM → element), <code>value</code> is two-way
        (VM ↔ input), <code>click</code> is an event (element → VM method).</li>
        <li><strong>The binder</strong>: loops over <code>[data-bind]</code> elements, parses
        <code>"type: key"</code>, and calls the handler with <code>vm[key]</code>.</li>
      </ul>

      <div class="tip">Notice what's missing: the ViewModel has <strong>zero</strong>
      <code>document</code> calls, and the markup has <strong>zero</strong> logic. All the
      connecting happens in one generic place, the binder, which you write once and reuse
      for every screen.</div>

      <div class="warn">Our <code>fullName</code> uses a helper <code>derived(name, [first,
      last], calc)</code> where we <strong>list the inputs by hand</strong>. Forget one and
      <code>fullName</code> silently goes stale. The next lesson fixes this with automatic
      dependency tracking.</div>
    `,
    examples: [
      {
        title: 'Knockout-style data-bind in 40 lines',
        code: `// ===== TINY OBSERVABLE (Knockout-style) =====
// obs() reads, obs(newValue) writes and notifies subscribers.
function observable(name, initialValue) {
  let value = initialValue;
  const subscribers = [];

  function obs(...args) {
    if (args.length === 0) return value; // read
    const next = args[0];
    if (next === value) return; // same value → nothing to do
    console.log(\`[ViewModel] \${name}: \${JSON.stringify(value)} → \${JSON.stringify(next)}\`);
    value = next;
    subscribers.forEach((fn) => fn(value));
  }

  obs.subscribe = (fn) => subscribers.push(fn);
  return obs;
}

// A derived observable whose inputs we list BY HAND (next lesson automates this)
function derived(name, inputs, calc) {
  const result = observable(name, calc());
  inputs.forEach((input) => input.subscribe(() => result(calc())));
  return result;
}

// ===== VIEWMODEL =====
class PersonViewModel {
  constructor() {
    this.first = observable('first', 'Ada');
    this.last = observable('last', 'Lovelace');
    this.fullName = derived('fullName', [this.first, this.last], () =>
      \`\${this.first()} \${this.last()}\`.trim()
    );
    this.saved = observable('saved', 'nothing yet');
  }

  save() {
    console.log('[ViewModel] save command');
    this.saved(this.fullName());
  }

  resetFirst() {
    console.log('[ViewModel] resetFirst command');
    this.first('Ada');
  }
}

// ===== BINDER =====
const tag = (el) => '<' + el.tagName.toLowerCase() + '>';

const bindingHandlers = {
  // one-way: VM → element text
  text(el, obs) {
    el.textContent = obs();
    obs.subscribe((v) => {
      el.textContent = v;
      console.log(\`[Binder] text of \${tag(el)} = \${JSON.stringify(v)}\`);
    });
  },
  // two-way: VM ↔ input
  value(el, obs) {
    el.value = obs();
    el.addEventListener('input', () => {
      console.log(\`[Binder] input event → write \${JSON.stringify(el.value)}\`);
      obs(el.value);
    });
    obs.subscribe((v) => {
      if (el.value === v) return; // already shows it (user just typed it)
      el.value = v;
      console.log(\`[Binder] value of \${tag(el)} = \${JSON.stringify(v)}\`);
    });
  },
  // event: element → VM method
  click(el, method, vm) {
    el.addEventListener('click', () => method.call(vm));
  },
};

function applyBindings(vm, rootEl) {
  rootEl.querySelectorAll('[data-bind]').forEach((el) => {
    const [type, key] = el.dataset.bind.split(':').map((s) => s.trim());
    console.log(\`[Binder] \${type}: \${key} on \${tag(el)}\`);
    bindingHandlers[type](el, vm[key], vm);
  });
}

// ===== VIEW (declarative markup, no logic) =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>First: <input data-bind="value: first"></p>
  <p>Last: <input data-bind="value: last"></p>
  <h3>Hello, <span data-bind="text: fullName"></span>!</h3>
  <button data-bind="click: save">Save</button>
  <button data-bind="click: resetFirst">Reset first name</button>
  <p>Saved: <em data-bind="text: saved"></em></p>
\`;

applyBindings(new PersonViewModel(), root);`,
        explain: `
          <details>
            <summary>Setup: what <code>applyBindings</code> does on load</summary>
            <p><code>querySelectorAll('[data-bind]')</code> returns elements in document order.
            For each one, the binder splits <code>"value: first"</code> into
            <code>type = 'value'</code> and <code>key = 'first'</code>, logs it, and calls
            <code>bindingHandlers.value(el, vm.first, vm)</code>. The console shows:</p>
            <pre><code>[Binder] value: first on &lt;input&gt;
[Binder] value: last on &lt;input&gt;
[Binder] text: fullName on &lt;span&gt;
[Binder] click: save on &lt;button&gt;
[Binder] click: resetFirst on &lt;button&gt;
[Binder] text: saved on &lt;em&gt;</code></pre>
            <p>After this, the subscriber lists look like this (order matters later):</p>
            <table>
              <tr><th>Observable</th><th>Subscribers, in order</th></tr>
              <tr><td><code>first</code></td><td>① <code>derived</code>'s recalc (added in
              the VM constructor) ② the input's <code>value</code> binding</td></tr>
              <tr><td><code>last</code></td><td>① recalc ② the second input's binding</td></tr>
              <tr><td><code>fullName</code></td><td>the <code>&lt;span&gt;</code>'s
              <code>text</code> binding</td></tr>
              <tr><td><code>saved</code></td><td>the <code>&lt;em&gt;</code>'s
              <code>text</code> binding</td></tr>
            </table>
            <p><code>click</code> bindings don't subscribe to anything. They only add a DOM
            listener that calls <code>method.call(vm)</code>, so <code>this</code> inside
            <code>save()</code> is the ViewModel.</p>
          </details>
          <details>
            <summary>Step by step: type <code>m</code> at the end of "Ada"</summary>
            <table>
              <tr><th>#</th><th>What runs</th><th>Console</th></tr>
              <tr><td>1</td><td>The browser fires <code>input</code>; the value binding's
              listener reads <code>el.value</code> ("Adam")</td>
              <td><code>[Binder] input event → write "Adam"</code></td></tr>
              <tr><td>2</td><td><code>obs("Adam")</code> on <code>first</code>: the value
              differs, so it's stored and subscribers run</td>
              <td><code>[ViewModel] first: "Ada" → "Adam"</code></td></tr>
              <tr><td>3</td><td>Subscriber ①: <code>derived</code> recalculates and writes
              <code>fullName("Adam Lovelace")</code></td>
              <td><code>[ViewModel] fullName: "Ada Lovelace" → "Adam Lovelace"</code></td></tr>
              <tr><td>4</td><td><code>fullName</code>'s subscriber: the span's text
              binding</td><td><code>[Binder] text of &lt;span&gt; = "Adam Lovelace"</code></td></tr>
              <tr><td>5</td><td>Subscriber ② of <code>first</code>: the input's own binding.
              <code>el.value === "Adam"</code> already → returns early</td>
              <td>(nothing)</td></tr>
            </table>
            <p>Step 5 is the important guard. Without it, the input would write its own value
            back into itself on every keystroke. With some bindings that causes cursor jumps
            or even infinite loops.</p>
          </details>
          <details>
            <summary>Step by step: Save, Save again, Reset first name</summary>
            <table>
              <tr><th>Click</th><th>Console</th><th>Why</th></tr>
              <tr><td>Save</td><td><code>[ViewModel] save command</code><br>
              <code>[ViewModel] saved: "nothing yet" → "Adam Lovelace"</code><br>
              <code>[Binder] text of &lt;em&gt; = "Adam Lovelace"</code></td>
              <td><code>save()</code> reads <code>fullName()</code> and writes it into
              <code>saved</code></td></tr>
              <tr><td>Save again</td><td><code>[ViewModel] save command</code></td>
              <td>Same value → <code>if (next === value) return;</code> → no subscribers run
              </td></tr>
              <tr><td>Reset first name</td><td><code>[ViewModel] resetFirst command</code><br>
              <code>[ViewModel] first: "Adam" → "Ada"</code><br>
              <code>[ViewModel] fullName: "Adam Lovelace" → "Ada Lovelace"</code><br>
              <code>[Binder] text of &lt;span&gt; = "Ada Lovelace"</code><br>
              <code>[Binder] value of &lt;input&gt; = "Ada"</code></td>
              <td>This time the change came <em>from the VM</em>, so the input still shows
              "Adam" and the value binding does write "Ada" into it. That's the VM → View
              half of two-way binding.</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>this.title = observable('title', 'Dr.')</code> and change the calc to
              include <code>this.title()</code>, but <em>don't</em> add it to the inputs list.
              Add an input bound to <code>title</code>. Typing in it changes nothing on the
              heading: the hand-written dependency list is stale. That's exactly what the next
              lesson automates away.</li>
              <li>Misspell a key: <code>data-bind="text: fulName"</code>. The handler receives
              <code>undefined</code> and throws. The pitfalls lesson shows how to make a binder
              report this nicely.</li>
            </ul>
            <div class="tip">Real Knockout supports several bindings on one element
            (<code>data-bind="value: first, enable: canEdit"</code>) and full JavaScript
            expressions. Our <code>split(':')</code> handles only one simple binding, which is
            enough to see the idea.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In the Knockout-style observable, how do you <em>write</em> a new value?',
        options: [
          '<code>vm.first = "Grace"</code>',
          '<code>vm.first.value = "Grace"</code>',
          '<code>vm.first("Grace")</code>',
          '<code>vm.set("first", "Grace")</code>',
        ],
        answer: 2,
        why: 'The observable is a function: no arguments reads, one argument writes and notifies. Plain assignment would replace the function and break every binding.',
      },
      {
        q: 'Which binding in our engine is two-way?',
        options: ['<code>text</code>', '<code>value</code>', '<code>click</code>', 'All of them'],
        answer: 1,
        why: '<code>value</code> listens to the input event (View → VM) and subscribes to the observable (VM → View). <code>text</code> is one-way; <code>click</code> only calls a method.',
      },
      {
        q: 'You type one letter into the First input. Which console line appears FIRST?',
        options: [
          '<code>[Binder] text of &lt;span&gt; = ...</code>',
          '<code>[ViewModel] fullName: ...</code>',
          '<code>[ViewModel] first: ...</code>',
          '<code>[Binder] input event → write ...</code>',
        ],
        answer: 3,
        why: 'The input event handler logs before it writes the observable. Then first changes, then fullName is recalculated, then the span updates.',
      },
      {
        q: 'You click Save twice without typing in between. Why does the second click log only <code>[ViewModel] save command</code>?',
        options: [
          'The click binding is removed after one use',
          'The observable ignores writes of the same value, so no subscribers run',
          'The browser debounces double clicks',
          'save() throws an error the second time',
        ],
        answer: 1,
        why: '<code>if (next === value) return;</code> skips notifying when nothing changed. That avoids pointless DOM updates.',
      },
    ],
    exercise: {
      task: `
        <p>Add two new binding handlers to the engine:</p>
        <ul>
          <li><code>checked</code>: two-way binding for a checkbox
          (<code>el.checked</code> ↔ a boolean observable, listen to the <code>change</code>
          event).</li>
          <li><code>visible</code>: one-way; hides the element
          (<code>el.style.display = 'none'</code>) when the observable is falsy.</li>
        </ul>
        <p>The markup already uses them. When it works, ticking the box shows the hint.</p>
      `,
      starter: `function observable(name, initialValue) {
  let value = initialValue;
  const subscribers = [];
  function obs(...args) {
    if (args.length === 0) return value;
    if (args[0] === value) return;
    console.log('[ViewModel]', name, '=', args[0]);
    value = args[0];
    subscribers.forEach((fn) => fn(value));
  }
  obs.subscribe = (fn) => subscribers.push(fn);
  return obs;
}

// ===== VIEWMODEL =====
const vm = {
  showHint: observable('showHint', false),
};

// ===== BINDER =====
const bindingHandlers = {
  text(el, obs) {
    el.textContent = obs();
    obs.subscribe((v) => (el.textContent = v));
  },
  // TODO: checked(el, obs) { ... }
  // TODO: visible(el, obs) { ... }
};

function applyBindings(vm, rootEl) {
  rootEl.querySelectorAll('[data-bind]').forEach((el) => {
    const [type, key] = el.dataset.bind.split(':').map((s) => s.trim());
    if (!bindingHandlers[type]) {
      console.warn('[Binder] no handler for', type);
      return;
    }
    bindingHandlers[type](el, vm[key], vm);
  });
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <label><input type="checkbox" data-bind="checked: showHint"> Show hint</label>
  <p data-bind="visible: showHint">💡 Bindings are just subscriptions.</p>
\`;
applyBindings(vm, root);`,
      hint: 'checked: set <code>el.checked = obs()</code>, listen to <code>change</code> and call <code>obs(el.checked)</code>, subscribe to set <code>el.checked = v</code>. visible: write an <code>update(v)</code> function that sets <code>el.style.display = v ? "" : "none"</code>, call it once, then subscribe it.',
      solution: `function observable(name, initialValue) {
  let value = initialValue;
  const subscribers = [];
  function obs(...args) {
    if (args.length === 0) return value;
    if (args[0] === value) return;
    console.log('[ViewModel]', name, '=', args[0]);
    value = args[0];
    subscribers.forEach((fn) => fn(value));
  }
  obs.subscribe = (fn) => subscribers.push(fn);
  return obs;
}

// ===== VIEWMODEL =====
const vm = {
  showHint: observable('showHint', false),
};

// ===== BINDER =====
const bindingHandlers = {
  text(el, obs) {
    el.textContent = obs();
    obs.subscribe((v) => (el.textContent = v));
  },
  checked(el, obs) {
    el.checked = obs();
    el.addEventListener('change', () => obs(el.checked));
    obs.subscribe((v) => (el.checked = v));
  },
  visible(el, obs) {
    const update = (v) => {
      el.style.display = v ? '' : 'none';
      console.log('[Binder] visible =', Boolean(v));
    };
    update(obs());
    obs.subscribe(update);
  },
};

function applyBindings(vm, rootEl) {
  rootEl.querySelectorAll('[data-bind]').forEach((el) => {
    const [type, key] = el.dataset.bind.split(':').map((s) => s.trim());
    if (!bindingHandlers[type]) {
      console.warn('[Binder] no handler for', type);
      return;
    }
    bindingHandlers[type](el, vm[key], vm);
  });
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <label><input type="checkbox" data-bind="checked: showHint"> Show hint</label>
  <p data-bind="visible: showHint">💡 Bindings are just subscriptions.</p>
\`;
applyBindings(vm, root);`,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-computed',
    section: 'MVVM',
    title: 'Computed properties & automatic dependency tracking',
    explain: `
      <p>In the last lesson <code>fullName</code> needed a hand-written list of inputs:
      <code>derived('fullName', [first, last], ...)</code>. That is fragile. Add a
      <code>title</code> field, forget to list it, and the name silently stops updating.</p>
      <p><strong>Automatic dependency tracking</strong> removes the list. The trick: while a
      computed value is being calculated, every signal it <em>reads</em> writes down "this
      computed depends on me". The reads <em>are</em> the dependency list.</p>

      <h3>Three building blocks (the "signals" API)</h3>
      <ul>
        <li><code>signal(value)</code>: a box holding a value. Read with
        <code>count()</code>, write with <code>count.set(5)</code>.</li>
        <li><code>computed(fn)</code>: a value derived from other signals.
        Cached, and recalculated only when something it read has changed.</li>
        <li><code>effect(fn)</code>: code that runs now and again whenever something it read
        changes. In a UI, <em>effects are the bindings</em> that update the DOM.</li>
      </ul>
      <p>This idea is old: Knockout had <code>ko.observable</code> / <code>ko.computed</code>
      around 2010. Today you find it in Vue (<code>ref</code>, <code>computed</code>,
      <code>watchEffect</code>), SolidJS (<code>createSignal</code>), Preact Signals, and
      Angular signals (<code>signal</code>, <code>computed</code>, <code>effect</code>, added
      in Angular 16). There is even a TC39 proposal to add signals to JavaScript itself
      (still an early-stage proposal at the time of writing).</p>

      <div class="tip"><strong>Analogy:</strong> a spreadsheet. Cell C1 has
      <code>=A1*B1</code>. You never tell Excel "C1 depends on A1 and B1": it figures that out
      from the formula. Change A1 and C1 updates. Signals are spreadsheet cells for your
      ViewModel.</div>

      <h3>How the tracking works (the one global variable)</h3>
      <pre><code>let currentObserver = null;        // ① who is running right now?

function read() {
  if (currentObserver) {           // ② someone is listening…
    subscribers.add(currentObserver); // …remember them
  }
  return value;
}</code></pre>
      <ol>
        <li><strong>①</strong> Before running a computed or effect function, the engine sets
        <code>currentObserver</code> to it. After, it restores the old value.</li>
        <li><strong>②</strong> Every signal read checks that variable. If it's set, the
        reader is recorded as a subscriber. No list needed.</li>
      </ol>
      <div class="warn">Because tracking only happens <em>during</em> a computed/effect run, a
      signal read <strong>outside</strong> one (e.g. <code>const q = qty();</code> at the top
      level) is just a plain value. It will never update. The first example shows this.</div>
    `,
    examples: [
      {
        title: 'signal, computed, effect from scratch',
        code: `// ===== TINY SIGNALS ENGINE =====
let currentObserver = null; // the computed/effect running right now
const pendingEffects = new Set();

function track(source) {
  if (!currentObserver) return; // read outside any effect → not tracked
  if (!source.observers.has(currentObserver)) {
    console.log(\`[Track] \${currentObserver.name} depends on \${source.name}\`);
  }
  source.observers.add(currentObserver);
  currentObserver.sources.add(source);
}

function runTracked(observer, fn) {
  // forget last run's dependencies, then record fresh ones
  observer.sources.forEach((s) => s.observers.delete(observer));
  observer.sources.clear();
  const previous = currentObserver;
  currentObserver = observer;
  try {
    return fn();
  } finally {
    currentObserver = previous;
  }
}

function signal(name, initialValue) {
  const node = { name, value: initialValue, observers: new Set() };
  function read() {
    track(node);
    return node.value;
  }
  read.set = (next) => {
    if (Object.is(next, node.value)) return;
    console.log(\`[Signal] \${name} = \${next}\`);
    node.value = next;
    [...node.observers].forEach((o) => o.markDirty()); // phase 1: mark
    flushEffects(); // phase 2: run effects
  };
  return read;
}

function computed(name, fn) {
  const node = {
    name,
    value: undefined,
    dirty: true,
    observers: new Set(),
    sources: new Set(),
    markDirty() {
      if (node.dirty) return;
      node.dirty = true;
      [...node.observers].forEach((o) => o.markDirty());
    },
  };
  return function read() {
    if (node.dirty) {
      node.value = runTracked(node, fn); // lazy: recalc only when read
      node.dirty = false;
      console.log(\`[Computed] \${name} = \${node.value}\`);
    }
    track(node);
    return node.value;
  };
}

function effect(name, fn) {
  const node = {
    name,
    sources: new Set(),
    markDirty: () => pendingEffects.add(node),
    run() {
      console.log(\`[Effect] \${name} runs\`);
      runTracked(node, fn);
    },
  };
  node.run();
}

function flushEffects() {
  const effects = [...pendingEffects];
  pendingEffects.clear();
  effects.forEach((e) => e.run());
}

// ===== VIEWMODEL =====
const price = signal('price', 5);
const qty = signal('qty', 1);
const total = computed('total', () => price() * qty());

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>$<span id="price"></span> × <span id="qty"></span> = <strong id="total"></strong></p>
  <button id="more">qty + 1</button>
  <button id="pricier">price + 1</button>
  <button id="same">set qty to same value</button>
\`;
const $ = (id) => document.getElementById(id);

effect('render', () => {
  $('price').textContent = price();
  $('qty').textContent = qty();
  $('total').textContent = '$' + total();
});

$('more').onclick = () => qty.set(qty() + 1);
$('pricier').onclick = () => price.set(price() + 1);
$('same').onclick = () => qty.set(qty());

// ❌ COMMON MISTAKE: read outside any effect → a frozen snapshot
const qtyAtStart = qty();
effect('stale', () => console.log('[View] stale qty =', qtyAtStart));`,
        explain: `
          <details>
            <summary>How the dependency graph gets recorded during a read</summary>
            <p>On load, <code>effect('render', ...)</code> runs immediately. Here is exactly what
            happens, line by line, with the console output:</p>
            <table>
              <tr><th>#</th><th><code>currentObserver</code></th><th>What runs</th>
              <th>Console</th></tr>
              <tr><td>1</td><td><code>null</code> → render</td>
              <td><code>node.run()</code> → <code>runTracked(render, fn)</code></td>
              <td><code>[Effect] render runs</code></td></tr>
              <tr><td>2</td><td>render</td><td><code>price()</code> → <code>track</code>
              adds render to price's observers</td>
              <td><code>[Track] render depends on price</code></td></tr>
              <tr><td>3</td><td>render</td><td><code>qty()</code></td>
              <td><code>[Track] render depends on qty</code></td></tr>
              <tr><td>4</td><td>render → <strong>total</strong></td><td><code>total()</code>
              is dirty, so it runs its own fn inside <code>runTracked(total, ...)</code></td>
              <td><code>[Track] total depends on price</code><br>
              <code>[Track] total depends on qty</code></td></tr>
              <tr><td>5</td><td>total → render (restored)</td><td>total caches 5,
              <code>dirty = false</code></td><td><code>[Computed] total = 5</code></td></tr>
              <tr><td>6</td><td>render</td><td>back in <code>total</code>'s read:
              <code>track(total)</code></td><td><code>[Track] render depends on total</code></td></tr>
              <tr><td>7</td><td>null</td><td>effect 'stale' runs; reads only a plain variable
              </td><td><code>[Effect] stale runs</code><br><code>[View] stale qty = 1</code></td></tr>
            </table>
            <p>Step 4 is the clever part: <code>runTracked</code> <em>saves</em> the previous
            observer and restores it in <code>finally</code>. It works like a stack, so nested
            computeds record their own dependencies, and then the outer effect continues where
            it left off. The resulting graph:</p>
            <pre><code>price ──┬──────────► render (effect)
qty ────┼──────────►   ▲
        └─► total ─────┘</code></pre>
          </details>
          <details>
            <summary>Update propagation: click <code>qty + 1</code></summary>
            <p><code>qty.set(2)</code> works in two phases:</p>
            <ol>
              <li><strong>Mark</strong>: qty's observers are <code>{render, total}</code>.
              render's <code>markDirty</code> puts it in <code>pendingEffects</code>. total's
              <code>markDirty</code> sets <code>dirty = true</code> and marks <em>its</em>
              observer (render again, but a Set holds it only once). Nothing is recalculated
              yet.</li>
              <li><strong>Flush</strong>: each pending effect runs once. Reading
              <code>total()</code> finds it dirty and recalculates it on demand
              (<em>lazy</em>, or "pull").</li>
            </ol>
            <pre><code>[Signal] qty = 2
[Effect] render runs
[Track] render depends on price
[Track] render depends on qty
[Track] total depends on price
[Track] total depends on qty
[Computed] total = 10
[Track] render depends on total</code></pre>
            <p>Why do the <code>[Track]</code> lines appear again? <code>runTracked</code>
            <strong>clears</strong> old dependencies before every run and records them fresh.
            That's how dependencies can change between runs: an effect with
            <code>if (open()) details()</code> stops depending on <code>details</code> once
            <code>open</code> becomes false.</p>
            <p><code>price + 1</code> is the same story with <code>[Signal] price = 6</code> and
            <code>[Computed] total = 12</code>. <code>set qty to same value</code> logs
            <strong>nothing</strong>: <code>Object.is(next, node.value)</code> bails out before
            marking anything.</p>
          </details>
          <details>
            <summary>Common mistake: reading a signal outside a tracking context</summary>
            <pre><code>const qtyAtStart = qty();        // ① currentObserver is null here
effect('stale', () =&gt;
  console.log('[View] stale qty =', qtyAtStart)); // ② reads a plain number</code></pre>
            <ol>
              <li><strong>①</strong> At the top level no effect is running, so
              <code>track()</code> returns immediately. You just get the number 1.</li>
              <li><strong>②</strong> The effect reads a plain variable, not a signal. Its
              dependency list is empty, so it never runs again. Click <code>qty + 1</code>
              as often as you like: <code>[View] stale qty = 1</code> appears only once, on
              load.</li>
            </ol>
            <div class="warn">The same trap appears in real libraries: destructuring a Vue
            <code>reactive()</code> object into plain variables, reading a Solid signal
            outside JSX/effects, or reading a signal <em>after</em> an <code>await</code>
            inside an effect (by then the effect has finished its synchronous run, so the
            read is no longer tracked in most libraries). Fix: read the signal <em>inside</em>
            the effect or computed.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change the stale effect to <code>() =&gt; console.log('[View] live qty =',
              qty())</code>. Now it re-runs on every qty click (and adds a
              <code>[Track] stale depends on qty</code> line).</li>
              <li>Delete the <code>$('total')</code> line from render and click
              <code>qty + 1</code>: no <code>[Computed] total</code> line. Nobody reads total,
              so it's never recalculated. Lazy computeds do no wasted work.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The diamond problem: glitch vs glitch-free',
        code: `// Flip this to true and press Run again ↓
const GLITCH_FREE = false;

// ===== SIGNALS ENGINE with two update strategies =====
let currentObserver = null;
const pendingEffects = new Set();

function track(source) {
  if (!currentObserver) return;
  source.observers.add(currentObserver);
  currentObserver.sources.add(source);
}

function runTracked(observer, fn) {
  observer.sources.forEach((s) => s.observers.delete(observer));
  observer.sources.clear();
  const previous = currentObserver;
  currentObserver = observer;
  try {
    return fn();
  } finally {
    currentObserver = previous;
  }
}

function signal(name, initialValue) {
  const node = { name, value: initialValue, observers: new Set() };
  const read = () => {
    track(node);
    return node.value;
  };
  read.set = (next) => {
    console.log(\`[Signal] \${name} = "\${next}"\`);
    node.value = next;
    [...node.observers].forEach((o) => o.notify());
    if (GLITCH_FREE) flushEffects();
  };
  return read;
}

function computed(name, fn) {
  const node = { name, dirty: true, observers: new Set(), sources: new Set() };
  const recompute = () => {
    node.value = runTracked(node, fn);
    node.dirty = false;
    console.log(\`[Computed] \${name} = \${JSON.stringify(node.value)}\`);
  };
  node.notify = () => {
    if (GLITCH_FREE) {
      if (node.dirty) return;
      node.dirty = true; // just mark; recalc later when read
    } else {
      recompute(); // naive: recalc RIGHT NOW
    }
    [...node.observers].forEach((o) => o.notify());
  };
  return () => {
    if (node.dirty) recompute();
    track(node);
    return node.value;
  };
}

function effect(fn) {
  const node = { sources: new Set() };
  node.run = () => runTracked(node, fn);
  // naive: run immediately; glitch-free: queue, run once after marking
  node.notify = () => (GLITCH_FREE ? pendingEffects.add(node) : node.run());
  node.run();
}

function flushEffects() {
  const effects = [...pendingEffects];
  pendingEffects.clear();
  effects.forEach((e) => e.run());
}

// ===== THE DIAMOND =====
//          name
//         /    \\
//     upper    length
//         \\    /
//         effect
const name = signal('name', 'Alice');
const upper = computed('upper', () => name().toUpperCase());
const length = computed('length', () => name().length);

console.log('GLITCH_FREE =', GLITCH_FREE);
effect(() => {
  const u = upper();
  const n = length();
  const broken = u.length !== n;
  console.log(\`[Effect] \${u} has \${n} letters\${broken ? '  ⚠ GLITCH!' : ''}\`);
});

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>Mode: <strong>\${GLITCH_FREE ? 'glitch-free' : 'naive'}</strong></p>
  <button id="bob">name = "Bob"</button>
  <button id="christina">name = "Christina"</button>
\`;
document.getElementById('bob').onclick = () => name.set('Bob');
document.getElementById('christina').onclick = () => name.set('Christina');`,
        explain: `
          <details>
            <summary>The problem: a diamond-shaped dependency graph</summary>
            <p><code>upper</code> and <code>length</code> both depend on <code>name</code>, and
            the effect depends on both. That shape (one source, two paths, joining again) is
            called a <strong>diamond</strong>. It's very common: <code>fullName</code> and
            <code>initials</code> both from <code>user</code>, a table's <code>rows</code> and
            <code>count</code> both from <code>filter</code>…</p>
            <p>The effect's whole job is to show one consistent sentence. If it ever runs while
            one branch is updated and the other isn't, it shows nonsense. That in-between
            moment is a <strong>glitch</strong>.</p>
          </details>
          <details>
            <summary>Step by step: naive mode (<code>GLITCH_FREE = false</code>), click
            <code>name = "Bob"</code></summary>
            <p>On load: <code>[Computed] upper = "ALICE"</code>,
            <code>[Computed] length = 5</code>, <code>[Effect] ALICE has 5 letters</code>. name's
            observers are <code>[upper, length]</code>, in the order they were first read.</p>
            <table>
              <tr><th>#</th><th>What runs</th><th>upper</th><th>length</th><th>Console</th></tr>
              <tr><td>1</td><td><code>name.set('Bob')</code></td><td>ALICE</td><td>5</td>
              <td><code>[Signal] name = "Bob"</code></td></tr>
              <tr><td>2</td><td>name notifies upper → it recalculates <em>immediately</em>
              </td><td><strong>BOB</strong></td><td>5</td>
              <td><code>[Computed] upper = "BOB"</code></td></tr>
              <tr><td>3</td><td>upper notifies the effect → it runs <em>immediately</em>
              </td><td>BOB</td><td><strong>5 (stale!)</strong></td>
              <td><code>[Effect] BOB has 5 letters  ⚠ GLITCH!</code></td></tr>
              <tr><td>4</td><td>only now does name notify length</td><td>BOB</td>
              <td><strong>3</strong></td><td><code>[Computed] length = 3</code></td></tr>
              <tr><td>5</td><td>length notifies the effect → runs again</td><td>BOB</td><td>3</td>
              <td><code>[Effect] BOB has 3 letters</code></td></tr>
            </table>
            <p>Two problems: the effect ran <strong>twice</strong> for one change, and the first
            run saw a mix of new and old values. If that effect sent an analytics event or
            wrote to a server, "BOB has 5 letters" would really have been sent.</p>
          </details>
          <details>
            <summary>The fix: mark first, run later (<code>GLITCH_FREE = true</code>)</summary>
            <pre><code>node.notify = () =&gt; {
  if (node.dirty) return;
  node.dirty = true;                  // ① computed: only mark, don't recalc
  ...
};
node.notify = () =&gt; pendingEffects.add(node);   // ② effect: queue, don't run
if (GLITCH_FREE) flushEffects();                // ③ after ALL marking: run queue</code></pre>
            <ol>
              <li><strong>①</strong> Phase 1 walks the graph and marks <code>upper</code> and
              <code>length</code> dirty. No values change yet.</li>
              <li><strong>②</strong> The effect is reached twice (via upper and via length),
              but <code>pendingEffects</code> is a Set, so it's queued once.</li>
              <li><strong>③</strong> Phase 2 runs the effect once. When it reads
              <code>upper()</code> and <code>length()</code>, each sees
              <code>dirty</code> and recalculates from the <em>new</em> name.</li>
            </ol>
            <table>
              <tr><th>#</th><th>Glitch-free, click "Bob"</th><th>Console</th></tr>
              <tr><td>1</td><td>set name</td><td><code>[Signal] name = "Bob"</code></td></tr>
              <tr><td>2</td><td>mark upper, length dirty; queue effect (once)</td>
              <td>(nothing)</td></tr>
              <tr><td>3</td><td>flush: effect reads upper → recalc</td>
              <td><code>[Computed] upper = "BOB"</code></td></tr>
              <tr><td>4</td><td>effect reads length → recalc</td>
              <td><code>[Computed] length = 3</code></td></tr>
              <tr><td>5</td><td>effect logs a consistent sentence</td>
              <td><code>[Effect] BOB has 3 letters</code></td></tr>
            </table>
            <div class="tip">This "push dirty flags, pull values" approach is the core idea
            behind glitch-free computeds in modern signal libraries (Preact Signals, SolidJS,
            Vue, Angular). Real engines add more tricks: version numbers to skip recalcs when
            a value didn't really change, batching several <code>set</code>s into one flush,
            and scheduling effects (e.g. before the next paint).</div>
          </details>
          <details>
            <summary>How to use the demo</summary>
            <p>Run it as is and click both buttons: every click logs a
            <code>⚠ GLITCH!</code> line followed by the correct one. Then change the first
            line to <code>const GLITCH_FREE = true;</code>, press Run, and click again: one
            effect line per click, never a glitch. The glitch detector is simply
            <code>u.length !== n</code>: the uppercase name must have as many letters as
            <code>length</code> says.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'How does <code>computed(() =&gt; price() * qty())</code> know that it depends on <code>price</code> and <code>qty</code>?',
        options: [
          'It parses the function source code',
          'You must pass <code>[price, qty]</code> as a second argument',
          'While the function runs, <code>currentObserver</code> points to the computed, and each signal read registers it as a subscriber',
          'It subscribes to every signal in the program',
        ],
        answer: 2,
        why: 'Reads during a tracked run record the dependency. That is the whole trick behind Vue, Solid, Preact, Angular signals and Knockout.',
      },
      {
        q: '<code>const q = qty(); effect(() =&gt; console.log(q));</code> Then <code>qty.set(9)</code>. What happens?',
        options: [
          'The effect logs 9',
          'Nothing: <code>qty</code> was read outside the effect, so the effect has no dependency on it',
          'An error is thrown',
          'The effect logs the old value again',
        ],
        answer: 1,
        why: 'The effect only reads the plain variable <code>q</code>. No signal was read during its run, so nothing triggers it again.',
      },
      {
        q: 'What is a "glitch" in reactive systems?',
        options: [
          'A crash caused by a circular dependency',
          'An observer briefly seeing a mix of new and old values (e.g. "BOB has 5 letters") before everything has updated',
          'A memory leak',
          'A binding typo',
        ],
        answer: 1,
        why: 'In a diamond, the naive engine runs the effect after the first branch updates but before the second one does. The effect sees an inconsistent state.',
      },
      {
        q: 'How does the glitch-free engine in the example avoid glitches?',
        options: [
          'It updates computeds in alphabetical order',
          'It uses setTimeout for every update',
          'Phase 1 only marks things dirty; phase 2 runs each queued effect once, and computeds recalculate lazily when read',
          'It forbids diamonds',
        ],
        answer: 2,
        why: 'Marking first, running later means no effect runs until the whole graph knows what changed. Computeds are pulled fresh when read.',
      },
      {
        q: 'Why does <code>runTracked</code> clear the old dependencies before each run?',
        options: [
          'To save memory only',
          'Dependencies can change between runs (e.g. inside an <code>if</code>), so the list must reflect the latest run',
          'Because Sets cannot hold duplicates',
          'It is not necessary; it is just a style choice',
        ],
        answer: 1,
        why: 'If an effect reads <code>details()</code> only when <code>open()</code> is true, then after <code>open</code> becomes false it should stop reacting to <code>details</code>.',
      },
    ],
    exercise: {
      task: `
        <p>Sometimes you want to read a signal inside an effect <strong>without</strong>
        subscribing to it. Most libraries call this <code>untrack</code> (Solid, Angular
        <code>untracked</code>, Preact <code>peek()</code>).</p>
        <p>Implement <code>untrack(fn)</code>: run <code>fn</code> with
        <code>currentObserver</code> temporarily set to <code>null</code>, then restore it,
        and return <code>fn</code>'s result.</p>
        <p>Goal: the effect should re-run when <code>qty</code> changes but <strong>not</strong>
        when <code>price</code> changes. Click both buttons and watch the console.</p>
      `,
      starter: `let currentObserver = null;
const pendingEffects = new Set();

function signal(name, value) {
  const observers = new Set();
  const read = () => {
    if (currentObserver) observers.add(currentObserver);
    return value;
  };
  read.set = (next) => {
    value = next;
    console.log('[Signal]', name, '=', next);
    [...observers].forEach((o) => pendingEffects.add(o));
    const effects = [...pendingEffects];
    pendingEffects.clear();
    effects.forEach((run) => run());
  };
  return read;
}

function effect(fn) {
  const run = () => {
    const previous = currentObserver;
    currentObserver = run;
    try {
      fn();
    } finally {
      currentObserver = previous;
    }
  };
  run();
}

function untrack(fn) {
  // TODO: run fn with currentObserver = null, restore it, return the result
  return fn();
}

// ===== VIEWMODEL =====
const qty = signal('qty', 1);
const price = signal('price', 10);

effect(() => {
  const p = untrack(() => price()); // should NOT subscribe to price
  console.log('[Effect] qty =', qty(), '(price seen:', p + ')');
});

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="q">qty + 1</button>
  <button id="p">price + 1</button>
\`;
document.getElementById('q').onclick = () => qty.set(qty() + 1);
document.getElementById('p').onclick = () => price.set(price() + 1);`,
      hint: 'Same shape as the effect\'s <code>run</code>: save <code>previous</code>, set <code>currentObserver = null</code>, <code>try { return fn(); } finally { currentObserver = previous; }</code>.',
      solution: `let currentObserver = null;
const pendingEffects = new Set();

function signal(name, value) {
  const observers = new Set();
  const read = () => {
    if (currentObserver) observers.add(currentObserver);
    return value;
  };
  read.set = (next) => {
    value = next;
    console.log('[Signal]', name, '=', next);
    [...observers].forEach((o) => pendingEffects.add(o));
    const effects = [...pendingEffects];
    pendingEffects.clear();
    effects.forEach((run) => run());
  };
  return read;
}

function effect(fn) {
  const run = () => {
    const previous = currentObserver;
    currentObserver = run;
    try {
      fn();
    } finally {
      currentObserver = previous;
    }
  };
  run();
}

function untrack(fn) {
  const previous = currentObserver;
  currentObserver = null; // nobody is listening during fn
  try {
    return fn();
  } finally {
    currentObserver = previous;
  }
}

// ===== VIEWMODEL =====
const qty = signal('qty', 1);
const price = signal('price', 10);

effect(() => {
  const p = untrack(() => price()); // does NOT subscribe to price
  console.log('[Effect] qty =', qty(), '(price seen:', p + ')');
});

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="q">qty + 1</button>
  <button id="p">price + 1</button>
\`;
document.getElementById('q').onclick = () => qty.set(qty() + 1);
document.getElementById('p').onclick = () => price.set(price() + 1);`,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-commands-testing',
    section: 'MVVM',
    title: 'Commands, validation & testing a ViewModel',
    explain: `
      <h3>Commands: an action plus "may I run right now?"</h3>
      <p>In WPF, buttons bind to objects implementing <code>ICommand</code>. An
      <code>ICommand</code> has two key members: <code>Execute()</code> (do the thing) and
      <code>CanExecute()</code> (is it allowed right now?), plus a
      <code>CanExecuteChanged</code> event. A bound button disables itself automatically
      when <code>CanExecute</code> returns false.</p>
      <p>Why an object and not just a method? Because the <strong>rule</strong> ("Submit is
      allowed only when the form is valid and we are not already saving") lives
      <strong>in the ViewModel, next to the action</strong>. The View just asks. And
      <code>execute()</code> double-checks, so even a sneaky double-click can't bypass it.</p>
      <pre><code>const submitCommand = createCommand('submit', {
  canExecute: () =&gt; vm.isValid &amp;&amp; !vm.isBusy,
  execute: () =&gt; vm.submit(),
});

button.disabled = !submitCommand.canExecute();   // binding
button.onclick = () =&gt; submitCommand.execute();  // binding</code></pre>

      <h3>Validation errors are just more ViewModel state</h3>
      <p>"Email needs an @" is view-ready text, so it belongs on the ViewModel as a derived
      property (<code>errors.email</code>). A common extra piece of UI state is
      <code>touched</code>: don't shout at the user before they've typed anything.</p>

      <h3>Testing without a browser</h3>
      <p>This is MVVM's biggest practical win. The ViewModel has no DOM, so a test is just:
      create VM → call methods → check properties. Real projects use Jest, Vitest, xUnit,
      JUnit or XCTest. Here we use a tiny <code>test()</code> helper. Dependencies like the
      API are passed into the constructor, so tests can hand in a <strong>fake</strong>.</p>

      <div class="tip">Rule of thumb: if you can't test a behaviour of your screen without
      rendering it, that behaviour is probably living in the View and wants to move into
      the ViewModel.</div>
      <div class="warn">Don't forget to <strong>re-evaluate</strong> <code>canExecute</code>
      when its inputs change. In WPF that's the <code>CanExecuteChanged</code> event; in our
      demo it's simply re-rendering after every <code>notify()</code>. A button that stays
      disabled after the form becomes valid is a classic MVVM bug.</div>
    `,
    examples: [
      {
        title: 'Sign-up form: commands + validation',
        code: `// ===== COMMAND (like .NET ICommand) =====
function createCommand(name, { execute, canExecute = () => true }) {
  return {
    canExecute,
    execute() {
      if (!canExecute()) {
        console.log(\`[Command] \${name} blocked (canExecute = false)\`);
        return;
      }
      console.log(\`[Command] \${name} execute\`);
      return execute();
    },
  };
}

// ===== MODEL / SERVICE (fake API) =====
const fakeApi = {
  register(email) {
    console.log('[Model] register', email);
    const result = email === 'taken@x.com'
      ? { ok: false, error: 'Email already registered' }
      : { ok: true };
    return new Promise((resolve) => setTimeout(() => resolve(result), 800));
  },
};

// ===== VIEWMODEL =====
class SignupViewModel {
  constructor(api) {
    this.api = api; // injected → tests can pass a fake
    this.email = '';
    this.password = '';
    this.touched = { email: false, password: false };
    this.isBusy = false;
    this.message = '';
    this.listeners = [];

    this.submitCommand = createCommand('submit', {
      canExecute: () => this.isValid && !this.isBusy,
      execute: () => this.submit(),
    });
  }

  // validation = derived state
  get errors() {
    const errors = {};
    if (!this.email.includes('@')) errors.email = 'Email needs an @';
    if (this.password.length < 6) errors.password = 'At least 6 characters';
    return errors;
  }

  get isValid() {
    return Object.keys(this.errors).length === 0;
  }

  visibleError(field) {
    return this.touched[field] ? this.errors[field] || '' : '';
  }

  setField(field, value) {
    this[field] = value;
    this.touched[field] = true;
    console.log(\`[ViewModel] \${field} changed, isValid = \${this.isValid}\`);
    this.notify();
  }

  async submit() {
    this.isBusy = true;
    this.message = 'Saving…';
    this.notify();
    const result = await this.api.register(this.email);
    this.isBusy = false;
    this.message = result.ok ? 'Welcome, ' + this.email + '!' : result.error;
    console.log('[ViewModel] submit finished:', this.message);
    this.notify();
  }

  subscribe(fn) {
    this.listeners.push(fn);
  }

  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <style>
    .err { color: crimson; font-size: 0.85em; margin: 2px 0 8px; min-height: 1em; }
  </style>
  <input id="email" placeholder="email (try taken@x.com)">
  <div class="err" id="emailErr"></div>
  <input id="password" type="password" placeholder="password">
  <div class="err" id="passwordErr"></div>
  <button id="submit">Sign up</button>
  <p id="message"></p>
\`;

// ===== BINDING =====
const vm = new SignupViewModel(fakeApi);
const $ = (id) => document.getElementById(id);
$('email').oninput = (e) => vm.setField('email', e.target.value);
$('password').oninput = (e) => vm.setField('password', e.target.value);
$('submit').onclick = () => vm.submitCommand.execute();

function render() {
  $('emailErr').textContent = vm.visibleError('email');
  $('passwordErr').textContent = vm.visibleError('password');
  $('submit').disabled = !vm.submitCommand.canExecute();
  $('message').textContent = vm.message;
}
vm.subscribe(render);
render();`,
      },
      {
        title: 'Testing the ViewModel with no DOM at all',
        code: `// ===== TEST HELPER =====
async function test(name, fn) {
  try {
    await fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}
function expectEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
  }
}

// ===== CODE UNDER TEST (same as previous example, minus logs) =====
function createCommand({ execute, canExecute = () => true }) {
  return {
    canExecute,
    execute: () => (canExecute() ? execute() : undefined),
  };
}

class SignupViewModel {
  constructor(api) {
    this.api = api;
    this.email = '';
    this.password = '';
    this.touched = { email: false, password: false };
    this.isBusy = false;
    this.message = '';
    this.listeners = [];
    this.submitCommand = createCommand({
      canExecute: () => this.isValid && !this.isBusy,
      execute: () => this.submit(),
    });
  }
  get errors() {
    const errors = {};
    if (!this.email.includes('@')) errors.email = 'Email needs an @';
    if (this.password.length < 6) errors.password = 'At least 6 characters';
    return errors;
  }
  get isValid() {
    return Object.keys(this.errors).length === 0;
  }
  visibleError(field) {
    return this.touched[field] ? this.errors[field] || '' : '';
  }
  setField(field, value) {
    this[field] = value;
    this.touched[field] = true;
    this.notify();
  }
  async submit() {
    this.isBusy = true;
    this.message = 'Saving…';
    this.notify();
    const result = await this.api.register(this.email);
    this.isBusy = false;
    this.message = result.ok ? 'Welcome, ' + this.email + '!' : result.error;
    this.notify();
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

// ===== FAKE API: records calls, answers instantly =====
function makeFakeApi(result = { ok: true }) {
  const calls = [];
  return {
    calls,
    register(email) {
      calls.push(email);
      return Promise.resolve(result);
    },
  };
}

// ===== TESTS =====
console.log('[Test] running ViewModel tests (no DOM used)');

await test('no errors are shown before the user types', () => {
  const vm = new SignupViewModel(makeFakeApi());
  expectEqual(vm.visibleError('email'), '');
  expectEqual(vm.submitCommand.canExecute(), false);
});

await test('invalid email shows an error after typing', () => {
  const vm = new SignupViewModel(makeFakeApi());
  vm.setField('email', 'ana');
  expectEqual(vm.visibleError('email'), 'Email needs an @');
});

await test('valid form enables the submit command', () => {
  const vm = new SignupViewModel(makeFakeApi());
  vm.setField('email', 'ana@x.com');
  vm.setField('password', 'secret1');
  expectEqual(vm.submitCommand.canExecute(), true);
});

await test('submit is blocked while busy (no double submit)', () => {
  const api = makeFakeApi();
  const vm = new SignupViewModel(api);
  vm.setField('email', 'ana@x.com');
  vm.setField('password', 'secret1');
  vm.submitCommand.execute();
  expectEqual(vm.isBusy, true);
  expectEqual(vm.submitCommand.canExecute(), false);
  vm.submitCommand.execute(); // second click
  expectEqual(api.calls.length, 1);
});

await test('shows the API error message', async () => {
  const api = makeFakeApi({ ok: false, error: 'Email already registered' });
  const vm = new SignupViewModel(api);
  vm.setField('email', 'taken@x.com');
  vm.setField('password', 'secret1');
  await vm.submitCommand.execute();
  expectEqual(vm.message, 'Email already registered');
  expectEqual(vm.isBusy, false);
});

await test('notifies listeners on change', () => {
  const vm = new SignupViewModel(makeFakeApi());
  let count = 0;
  vm.subscribe(() => count++);
  vm.setField('email', 'a');
  expectEqual(count, 1);
});`,
        explain: `
          <details>
            <summary>What the console should show</summary>
            <pre><code>[Test] running ViewModel tests (no DOM used)
✓ no errors are shown before the user types
✓ invalid email shows an error after typing
✓ valid form enables the submit command
✓ submit is blocked while busy (no double submit)
✓ shows the API error message
✓ notifies listeners on change</code></pre>
            <p>Every test follows <strong>Arrange → Act → Assert</strong>: create a VM with a
            fake API, call methods the View would call (<code>setField</code>,
            <code>submitCommand.execute()</code>), then check properties the View would read
            (<code>visibleError</code>, <code>canExecute()</code>, <code>message</code>).</p>
          </details>
          <details>
            <summary>Key test: "submit is blocked while busy"</summary>
            <pre><code>vm.submitCommand.execute();   // ① starts submit(); runs until the await
expectEqual(vm.isBusy, true); // ② we are "in flight"
vm.submitCommand.execute();   // ③ canExecute() is false → ignored
expectEqual(api.calls.length, 1);</code></pre>
            <ol>
              <li><strong>①</strong> An <code>async</code> function runs
              <em>synchronously</em> up to its first <code>await</code>. So
              <code>isBusy = true</code> and <code>api.register</code> have already happened
              when <code>execute()</code> returns.</li>
              <li><strong>②</strong> The promise from the fake API hasn't resolved yet (that
              needs a microtask), so the VM is still busy.</li>
              <li><strong>③</strong> The double-submit guard lives in the command, so the second
              call does nothing. The fake API's <code>calls</code> array proves it.</li>
            </ol>
            <p>The "API error" test instead <code>await</code>s the command, so the promise
            resolves and the VM finishes before we check <code>message</code>.</p>
          </details>
          <details>
            <summary>Try this: break the VM and watch a test fail</summary>
            <ul>
              <li>Remove <code>&amp;&amp; !this.isBusy</code> from <code>canExecute</code>. You'll
              see <code>✗ submit is blocked while busy (no double submit) expected false, got
              true</code>.</li>
              <li>Change <code>visibleError</code> to ignore <code>touched</code>. The first test
              fails: the error would show before the user typed.</li>
            </ul>
            <div class="tip">These tests run in milliseconds and never open a browser. In a
            real project they'd live in a <code>*.test.js</code> file run by Vitest or Jest.
            That speed is why teams push as much screen logic as possible into
            ViewModels.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Which two members are at the heart of the .NET <code>ICommand</code> interface?',
        options: [
          '<code>Run()</code> and <code>Stop()</code>',
          '<code>Execute()</code> and <code>CanExecute()</code>',
          '<code>Bind()</code> and <code>Unbind()</code>',
          '<code>Get()</code> and <code>Set()</code>',
        ],
        answer: 1,
        why: '<code>ICommand</code> has <code>Execute</code>, <code>CanExecute</code> and the <code>CanExecuteChanged</code> event. A bound WPF button uses <code>CanExecute</code> to enable/disable itself.',
      },
      {
        q: 'Where should the error text "Email needs an @" come from in MVVM?',
        options: [
          'Hard-coded in the HTML',
          'A derived property on the ViewModel (e.g. <code>errors.email</code>)',
          'The database',
          'A CSS pseudo-element',
        ],
        answer: 1,
        why: 'Validation messages are view-ready state. Putting them on the VM makes them testable without a DOM.',
      },
      {
        q: 'Why is the API passed into the ViewModel constructor instead of imported directly inside it?',
        options: [
          'It is faster',
          'So tests can pass a fake API that records calls and answers instantly',
          'Because classes cannot use imports',
          'To make the View smaller',
        ],
        answer: 1,
        why: 'Dependency injection lets tests control the outside world. <code>makeFakeApi()</code> lets us check "register was called exactly once".',
      },
      {
        q: 'Why does <code>execute()</code> check <code>canExecute()</code> again, even though the button is disabled?',
        options: [
          'It doesn\'t need to; it is redundant',
          'The command can be triggered in other ways (keyboard shortcut, double-click race, test code), so the rule is enforced in one place',
          'Browsers ignore <code>disabled</code>',
          'To make it slower on purpose',
        ],
        answer: 1,
        why: 'The disabled button is a UI hint. The command itself is the real guard, and the "blocked while busy" test proves it.',
      },
    ],
    exercise: {
      task: `
        <p>Add a <code>clearCommand</code> to the ViewModel:</p>
        <ul>
          <li><code>canExecute</code>: true when <em>either</em> field is non-empty.</li>
          <li><code>execute</code>: empties both fields, resets <code>touched</code>, and
          notifies.</li>
        </ul>
        <p>Then write the two missing tests. All tests should print ✓.</p>
      `,
      starter: `function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}
function expectEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
  }
}

function createCommand({ execute, canExecute = () => true }) {
  return { canExecute, execute: () => (canExecute() ? execute() : undefined) };
}

class FormViewModel {
  constructor() {
    this.email = '';
    this.password = '';
    this.touched = { email: false, password: false };
    this.listeners = [];
    // TODO: this.clearCommand = createCommand({ ... })
  }
  setField(field, value) {
    this[field] = value;
    this.touched[field] = true;
    this.notify();
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

test('clear is disabled on an empty form', () => {
  const vm = new FormViewModel();
  expectEqual(vm.clearCommand.canExecute(), false);
});

test('clear is enabled after typing', () => {
  // TODO
  throw new Error('not written yet');
});

test('clear empties fields and resets touched', () => {
  // TODO
  throw new Error('not written yet');
});`,
      hint: 'canExecute: <code>() =&gt; this.email !== "" || this.password !== ""</code>. In the tests: create a VM, call <code>vm.setField("email", "a")</code>, then check <code>canExecute()</code> or call <code>vm.clearCommand.execute()</code> and check <code>vm.email</code> and <code>vm.touched.email</code>.',
      solution: `function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}
function expectEqual(actual, expected) {
  if (actual !== expected) {
    throw new Error(\`expected \${JSON.stringify(expected)}, got \${JSON.stringify(actual)}\`);
  }
}

function createCommand({ execute, canExecute = () => true }) {
  return { canExecute, execute: () => (canExecute() ? execute() : undefined) };
}

class FormViewModel {
  constructor() {
    this.email = '';
    this.password = '';
    this.touched = { email: false, password: false };
    this.listeners = [];
    this.clearCommand = createCommand({
      canExecute: () => this.email !== '' || this.password !== '',
      execute: () => {
        console.log('[ViewModel] clear');
        this.email = '';
        this.password = '';
        this.touched = { email: false, password: false };
        this.notify();
      },
    });
  }
  setField(field, value) {
    this[field] = value;
    this.touched[field] = true;
    this.notify();
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  notify() {
    this.listeners.forEach((fn) => fn());
  }
}

test('clear is disabled on an empty form', () => {
  const vm = new FormViewModel();
  expectEqual(vm.clearCommand.canExecute(), false);
});

test('clear is enabled after typing', () => {
  const vm = new FormViewModel();
  vm.setField('email', 'a');
  expectEqual(vm.clearCommand.canExecute(), true);
});

test('clear empties fields and resets touched', () => {
  const vm = new FormViewModel();
  vm.setField('email', 'a@b.c');
  vm.setField('password', 'secret');
  vm.clearCommand.execute();
  expectEqual(vm.email, '');
  expectEqual(vm.password, '');
  expectEqual(vm.touched.email, false);
  expectEqual(vm.clearCommand.canExecute(), false);
});`,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-in-the-wild',
    section: 'MVVM',
    title: 'MVVM in the wild: WPF, Knockout, Vue, Angular, SwiftUI, Android Jetpack',
    explain: `
      <p>You've built the parts by hand. Here's how real platforms name them. Details differ,
      but look for the same three things: <strong>observable state</strong>,
      <strong>derived values</strong>, and <strong>binding</strong>.</p>

      <h3>WPF / .NET (the original, 2005)</h3>
      <p>The ViewModel implements <code>INotifyPropertyChanged</code> and raises
      <code>PropertyChanged</code> in its setters. XAML binds with
      <code>{Binding FullName}</code> against the element's <code>DataContext</code>.
      Buttons bind to <code>ICommand</code> properties. The same idea is used in newer
      .NET UI stacks like .NET MAUI, and libraries such as CommunityToolkit.Mvvm generate
      much of the boilerplate for you.</p>

      <h3>Knockout.js (web, 2010)</h3>
      <p><code>ko.observable</code>, <code>ko.computed</code> / <code>ko.pureComputed</code>,
      <code>data-bind="text: fullName"</code> and <code>ko.applyBindings(vm)</code>: exactly
      what we built in the binding-engine lesson. It is still around but sees little new
      development today; its ideas live on in modern signals.</p>

      <h3>Vue</h3>
      <p>Vue's docs have long said it was <em>partly inspired by MVVM</em> without strictly
      following it. The component's reactive state (<code>ref</code>, <code>reactive</code>,
      <code>computed</code>) plays the ViewModel role; the template is the View;
      <code>v-model</code> is two-way binding. Vue 3's reactivity uses JavaScript Proxies
      plus automatic dependency tracking, like our <code>computed</code> lesson.</p>

      <h3>Angular</h3>
      <p>A component class with its template has always felt MVVM-ish
      (<code>[value]</code> one-way, <code>(click)</code> events,
      <code>[(ngModel)]</code> two-way). Since Angular 16, <strong>signals</strong>
      (<code>signal()</code>, <code>computed()</code>, <code>effect()</code>) give
      fine-grained reactive state, very close to what we implemented.</p>
      <pre><code>count = signal(0);
double = computed(() =&gt; this.count() * 2);
increment() { this.count.update(c =&gt; c + 1); }</code></pre>

      <h3>SwiftUI (Apple)</h3>
      <p>Classic style: a class conforming to <code>ObservableObject</code> with
      <code>@Published</code> properties, owned by a view via <code>@StateObject</code>
      (or passed in with <code>@ObservedObject</code>). Since <strong>iOS 17</strong>, the
      <code>@Observable</code> macro (Observation framework) replaces most of that: views
      track exactly the properties they read, much like signals.</p>
      <pre><code>@Observable class CounterViewModel {
  var count = 0
  func increment() { count += 1 }
}</code></pre>

      <h3>Android Jetpack</h3>
      <p>Jetpack's <code>androidx.lifecycle.ViewModel</code> class holds screen state and
      <strong>survives configuration changes</strong> such as rotating the phone. It exposes
      state as <code>StateFlow</code> (Kotlin coroutines, the current recommendation) or the
      older <code>LiveData</code>. A Compose UI collects it with
      <code>collectAsStateWithLifecycle()</code>, and <code>viewModelScope</code> cancels
      running work when the ViewModel is cleared.</p>
      <div class="tip">Google's Android architecture guide actually recommends
      <em>unidirectional data flow</em>: one immutable <code>UiState</code> flowing down and
      events flowing up. That's closer to MVI (a later section) wearing a class called
      "ViewModel". Names and patterns don't always line up!</div>

      <h3>React?</h3>
      <p>React isn't an MVVM framework (it's closer to UI = f(state)), but a
      <strong>custom hook</strong> can play the ViewModel role: it owns state, exposes
      view-ready values and commands, and knows nothing about the JSX that uses it. The
      component becomes a "dumb" View. See the example below.</p>

      <div class="warn"><strong>"MMVC"?</strong> That isn't a standard pattern name. If you
      saw it somewhere, it was most likely a typo or mix-up for <strong>MVVM</strong> (or
      MVC). A later lesson tours the naming zoo: MVC, MVP, MVVM, MVI, MVU and friends.</div>
    `,
    examples: [
      {
        title: 'React: a custom hook as the ViewModel',
        lang: 'react',
        code: `import { useState } from 'react';

// ===== VIEWMODEL: a custom hook =====
// Owns state, exposes view-ready values + commands. No JSX in here.
let nextId = 2;

function useTodoViewModel() {
  const [todos, setTodos] = useState([{ id: 1, text: 'Learn MVVM', done: false }]);
  const [draft, setDraft] = useState('');

  const remaining = todos.filter((t) => !t.done).length;
  const canAdd = draft.trim().length > 0;

  function add() {
    if (!canAdd) return;
    const text = draft.trim();
    console.log('[ViewModel] add', text);
    const id = nextId++;
    setTodos((ts) => [...ts, { id, text, done: false }]);
    setDraft('');
  }

  function toggle(id) {
    console.log('[ViewModel] toggle', id);
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  return {
    todos,
    draft,
    setDraft,
    canAdd,
    add,
    toggle,
    summary: \`\${remaining} of \${todos.length} left\`,
  };
}

// ===== VIEW: a dumb component (props in, events out) =====
function TodoView({ vm }) {
  console.log('[View] render', vm.summary);
  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          vm.add();
        }}
      >
        <input
          value={vm.draft}
          onChange={(e) => vm.setDraft(e.target.value)}
          placeholder="New todo"
        />
        <button disabled={!vm.canAdd}>Add</button>
      </form>
      <ul>
        {vm.todos.map((t) => (
          <li key={t.id}>
            <label style={{ textDecoration: t.done ? 'line-through' : 'none' }}>
              <input type="checkbox" checked={t.done} onChange={() => vm.toggle(t.id)} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      <p>{vm.summary}</p>
    </div>
  );
}

export default function App() {
  const vm = useTodoViewModel();
  return <TodoView vm={vm} />;
}`,
      },
    ],
    quiz: [
      {
        q: 'What is special about Android Jetpack\'s <code>ViewModel</code> class?',
        options: [
          'It renders the UI',
          'It survives configuration changes like screen rotation, and its <code>viewModelScope</code> is cancelled when it is cleared',
          'It is only for Java, not Kotlin',
          'It replaces the Model layer',
        ],
        answer: 1,
        why: 'The ViewModel outlives the Activity/Fragment across rotations, so state isn\'t lost. It usually exposes state via StateFlow or LiveData.',
      },
      {
        q: 'In SwiftUI on iOS 17+, what is the modern way to make a view model observable?',
        options: [
          'The <code>@Observable</code> macro',
          'Subclassing <code>UIViewController</code>',
          '<code>NotificationCenter</code> only',
          'It is not possible',
        ],
        answer: 0,
        why: '<code>@Observable</code> (Observation framework) replaces most uses of <code>ObservableObject</code> + <code>@Published</code>, and views track only the properties they read.',
      },
      {
        q: 'In WPF, which interface does a ViewModel implement so bindings know a property changed?',
        options: [
          '<code>IDisposable</code>',
          '<code>INotifyPropertyChanged</code>',
          '<code>IEnumerable</code>',
          '<code>ICommand</code>',
        ],
        answer: 1,
        why: '<code>INotifyPropertyChanged</code> raises <code>PropertyChanged</code>. <code>ICommand</code> is for actions, not state.',
      },
      {
        q: 'In the React example, what makes <code>TodoView</code> a "dumb" View?',
        options: [
          'It uses no JSX',
          'It has no state or rules: it only reads <code>vm</code> values and forwards events to <code>vm</code> commands',
          'It is a class component',
          'It never re-renders',
        ],
        answer: 1,
        why: 'All logic (canAdd, summary, add, toggle) lives in <code>useTodoViewModel</code>. You could swap the View for a different design without touching the rules.',
      },
      {
        q: 'Someone says their app uses "MMVC". What\'s the best reading?',
        options: [
          'A well-known pattern from the Gang of Four book',
          'Not a standard name; most likely a mix-up for MVVM (or MVC)',
          'Model-Model-View-Controller, used by Android',
          'The official name of Vue\'s architecture',
        ],
        answer: 1,
        why: 'There is no widely recognised "MMVC" pattern. Ask what they mean; usually it is MVVM.',
      },
    ],
    exercise: {
      lang: 'react',
      task: `
        <p>Extend <code>useTodoViewModel</code> with a <strong>clear completed</strong>
        command:</p>
        <ul>
          <li><code>canClear</code>: true when at least one todo is done.</li>
          <li><code>clearCompleted()</code>: removes all done todos.</li>
        </ul>
        <p>Then add a button to the View that is disabled when <code>!vm.canClear</code>.
        Keep the View dumb: no <code>filter</code> calls in the JSX.</p>
      `,
      starter: `import { useState } from 'react';

let nextId = 3;

function useTodoViewModel() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn MVVM', done: true },
    { id: 2, text: 'Build a binder', done: false },
  ]);

  function toggle(id) {
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  // TODO: canClear + clearCompleted

  return { todos, toggle };
}

function TodoView({ vm }) {
  return (
    <div>
      <ul>
        {vm.todos.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => vm.toggle(t.id)} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      {/* TODO: Clear completed button */}
    </div>
  );
}

export default function App() {
  const vm = useTodoViewModel();
  return <TodoView vm={vm} />;
}`,
      hint: '<code>const canClear = todos.some((t) =&gt; t.done);</code> and <code>setTodos((ts) =&gt; ts.filter((t) =&gt; !t.done))</code>. Return both from the hook.',
      solution: `import { useState } from 'react';

let nextId = 3;

function useTodoViewModel() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn MVVM', done: true },
    { id: 2, text: 'Build a binder', done: false },
  ]);

  function toggle(id) {
    setTodos((ts) => ts.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  const canClear = todos.some((t) => t.done);

  function clearCompleted() {
    if (!canClear) return;
    console.log('[ViewModel] clearCompleted');
    setTodos((ts) => ts.filter((t) => !t.done));
  }

  return { todos, toggle, canClear, clearCompleted };
}

function TodoView({ vm }) {
  return (
    <div>
      <ul>
        {vm.todos.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => vm.toggle(t.id)} />
              {t.text}
            </label>
          </li>
        ))}
      </ul>
      <button disabled={!vm.canClear} onClick={vm.clearCompleted}>
        Clear completed
      </button>
    </div>
  );
}

export default function App() {
  const vm = useTodoViewModel();
  return <TodoView vm={vm} />;
}`,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'mvvm-pitfalls',
    section: 'MVVM',
    title: 'MVVM pitfalls: god ViewModels, binding magic, memory leaks',
    explain: `
      <p>MVVM is great for testable screens, but it has three classic ways to go wrong.</p>

      <h3>1. The god ViewModel</h3>
      <p>The ViewModel is "everything the screen needs", so it's tempting to put
      <em>everything</em> in it: fetching, caching, validation, formatting, navigation,
      analytics… Soon one file has 2,000 lines and 40 properties. Signs: tests need huge
      setups, and unrelated features break each other.</p>
      <p>Fixes: move business rules down into the Model / services (the VM should
      <em>coordinate</em>, not <em>know everything</em>), and split big screens into
      <strong>child ViewModels</strong>, one per panel:</p>
      <pre><code>class CheckoutViewModel {
  constructor(services) {
    this.cart = new CartViewModel(services.cart);            // cart panel
    this.address = new AddressFormViewModel(services.geo);   // address form
    this.payment = new PaymentViewModel(services.payments);  // payment panel
  }
  get canPlaceOrder() {
    return this.address.isValid &amp;&amp; this.payment.isValid &amp;&amp; !this.cart.isEmpty;
  }
}</code></pre>

      <h3>2. Binding magic that's hard to debug</h3>
      <p>Bindings are strings in markup (<code>data-bind="text: fulName"</code>). A typo
      often fails <strong>quietly</strong>: the element stays empty and nobody tells you.
      WPF, for example, reports binding errors to the debug output window rather than
      crashing. Long chains of computeds and two-way bindings can also make "why did this
      change?" hard to answer.</p>
      <p>Fixes: make your binder <strong>loud</strong> about unknown keys (second example),
      prefer one-way bindings unless you really need two-way, and use typed/compiled
      bindings when your platform has them (e.g. compiled bindings in WPF/MAUI, typed
      templates in Angular and Vue with TypeScript).</p>

      <h3>3. Memory leaks from subscriptions</h3>
      <p>A ViewModel often subscribes to something that <strong>lives longer</strong> than
      the screen: a global store, a websocket, a timer. The long-lived thing keeps a
      reference to the VM's callback, and the callback keeps the VM alive. Close the screen,
      and the VM is still there, still reacting to every message. Open it ten times: ten
      zombie VMs.</p>
      <div class="tip"><strong>Rule:</strong> every <code>subscribe</code> needs a matching
      unsubscribe. Collect them and release them in a <code>dispose()</code> method, then
      make sure whoever closes the screen calls it. Frameworks give you hooks for this:
      Knockout's <code>subscription.dispose()</code>, Angular's <code>DestroyRef</code> /
      <code>takeUntilDestroyed()</code>, Android's <code>onCleared()</code> and
      <code>viewModelScope</code>, React's effect cleanup function.</div>
      <div class="warn">The subscription direction matters. A VM subscribing to its
      <em>own</em> short-lived child is fine: both die together. The leak happens when a
      <strong>long-lived</strong> object holds a callback of a <strong>short-lived</strong>
      one.</div>
    `,
    examples: [
      {
        title: 'Zombie ViewModels and dispose()',
        code: `// ===== MODEL: an app-wide price feed that lives forever =====
const priceFeed = {
  price: 100,
  listeners: new Set(),
  subscribe(fn) {
    this.listeners.add(fn);
    console.log(\`[Model] subscribe → \${this.listeners.size} listener(s)\`);
    return () => {
      this.listeners.delete(fn);
      console.log(\`[Model] unsubscribe → \${this.listeners.size} listener(s)\`);
    };
  },
  tick() {
    this.price += 1;
    console.log(\`[Model] price \${this.price}, notifying \${this.listeners.size}\`);
    this.listeners.forEach((fn) => fn(this.price));
  },
};

// ===== VIEWMODEL for one "stock screen" =====
let nextScreenId = 1;

class StockScreenViewModel {
  constructor(feed) {
    this.id = nextScreenId++;
    this.priceText = '$' + feed.price;
    this.unsubscribe = feed.subscribe((price) => {
      this.priceText = '$' + price;
      console.log(\`[ViewModel #\${this.id}] got price \${price}\`);
    });
  }

  dispose() {
    console.log(\`[ViewModel #\${this.id}] dispose\`);
    this.unsubscribe();
  }
}

// ===== VIEW + screen navigation =====
const root = document.getElementById('root');
root.innerHTML = \`
  <label><input type="checkbox" id="useDispose"> call dispose() on close</label>
  <p>
    <button id="open">Open screen</button>
    <button id="close">Close screen</button>
    <button id="tick">Price tick</button>
  </p>
  <p id="status"></p>
\`;
const $ = (id) => document.getElementById(id);
let current = null;

function render() {
  const screen = current ? \`#\${current.id} showing \${current.priceText}\` : 'none';
  $('status').textContent =
    \`Open screen: \${screen} · feed listeners: \${priceFeed.listeners.size}\`;
}

$('open').onclick = () => {
  if (current) return;
  current = new StockScreenViewModel(priceFeed);
  console.log(\`[View] opened screen #\${current.id}\`);
  render();
};

$('close').onclick = () => {
  if (!current) return;
  console.log(\`[View] closed screen #\${current.id}\`);
  if ($('useDispose').checked) current.dispose();
  current = null; // we drop our reference… but does the feed?
  render();
};

$('tick').onclick = () => {
  priceFeed.tick();
  render();
};

render();`,
        explain: `
          <details>
            <summary>The problem: open and close 3 times, open a 4th, then tick</summary>
            <p>Leave "call dispose() on close" <strong>unchecked</strong>.</p>
            <table>
              <tr><th>Action</th><th>Console</th><th>Status line</th></tr>
              <tr><td>Open</td><td><code>[Model] subscribe → 1 listener(s)</code><br>
              <code>[View] opened screen #1</code></td>
              <td>#1 showing $100 · listeners: 1</td></tr>
              <tr><td>Close</td><td><code>[View] closed screen #1</code></td>
              <td>none · listeners: <strong>1</strong></td></tr>
              <tr><td>Open / Close</td><td><code>[Model] subscribe → 2 listener(s)</code> …
              </td><td>none · listeners: <strong>2</strong></td></tr>
              <tr><td>Open / Close</td><td><code>[Model] subscribe → 3 listener(s)</code> …
              </td><td>none · listeners: <strong>3</strong></td></tr>
              <tr><td>Open</td><td><code>[Model] subscribe → 4 listener(s)</code><br>
              <code>[View] opened screen #4</code></td><td>#4 · listeners: 4</td></tr>
              <tr><td>Price tick</td><td><code>[Model] price 101, notifying 4</code><br>
              <code>[ViewModel #1] got price 101</code><br>
              <code>[ViewModel #2] got price 101</code><br>
              <code>[ViewModel #3] got price 101</code><br>
              <code>[ViewModel #4] got price 101</code></td>
              <td>#4 showing $101 · listeners: 4</td></tr>
            </table>
            <p>Screens #1–#3 are gone from the page, yet they still receive prices. They are
            <strong>zombies</strong>. <code>current = null</code> only dropped <em>our</em>
            reference. The feed's <code>listeners</code> Set still holds each callback, and each
            callback (an arrow function using <code>this</code>) holds its whole ViewModel. The
            garbage collector can't free any of them.</p>
            <p>In a real app this means wasted CPU, growing memory, and bugs such as a closed
            screen still firing network calls or showing alerts.</p>
          </details>
          <details>
            <summary>The fix: keep the unsubscribe function, call it in <code>dispose()</code></summary>
            <pre><code>this.unsubscribe = feed.subscribe((price) =&gt; { ... });  // ①

dispose() {
  this.unsubscribe();                                    // ②
}

if ($('useDispose').checked) current.dispose();          // ③
current = null;</code></pre>
            <ol>
              <li><strong>①</strong> <code>subscribe</code> returns a function that removes
              exactly this listener. The VM stores it.</li>
              <li><strong>②</strong> <code>dispose()</code> is the VM's "I'm done" method: it
              releases everything it subscribed to (feeds, timers, sockets).</li>
              <li><strong>③</strong> The code that <em>owns</em> the screen's lifetime (the
              navigation) must call it. A dispose method nobody calls fixes nothing.</li>
            </ol>
          </details>
          <details>
            <summary>Same demo with dispose on</summary>
            <p>Continuing from above (screen #4 open, 4 listeners), tick the checkbox and
            then:</p>
            <table>
              <tr><th>Action</th><th>Console</th><th>Listeners</th></tr>
              <tr><td>Close</td><td><code>[View] closed screen #4</code><br>
              <code>[ViewModel #4] dispose</code><br>
              <code>[Model] unsubscribe → 3 listener(s)</code></td><td>3</td></tr>
              <tr><td>Open</td><td><code>[Model] subscribe → 4 listener(s)</code><br>
              <code>[View] opened screen #5</code></td><td>4</td></tr>
              <tr><td>Close</td><td><code>[View] closed screen #5</code><br>
              <code>[ViewModel #5] dispose</code><br>
              <code>[Model] unsubscribe → 3 listener(s)</code></td><td>3</td></tr>
              <tr><td>Price tick</td><td><code>[Model] price 102, notifying 3</code><br>
              <code>[ViewModel #1] got price 102</code> … <code>#3</code></td><td>3</td></tr>
            </table>
            <p>Disposed screens clean up after themselves: the count goes back down. But the
            three zombies from before are still there: nobody kept their
            <code>unsubscribe</code>, so they can never be removed. Leaks are cheap to prevent
            and very hard to fix afterwards. Press <strong>Run</strong> to start fresh, check
            the box first, and the count never goes above 1.</p>
            <div class="tip">When you find yourself calling <code>subscribe</code>,
            <code>addEventListener</code>, <code>setInterval</code> or opening a socket inside a
            ViewModel, write the matching cleanup line in <code>dispose()</code>
            <em>right away</em>.</div>
          </details>
        `,
      },
      {
        title: 'A loud binder: catch binding typos early',
        code: `// ===== VIEWMODEL =====
const vm = {
  fullName: 'Ada Lovelace',
  city: 'London',
};

// ===== VIEW (with a typo!) =====
const root = document.getElementById('root');
root.innerHTML = \`
  <p>Name: <strong data-bind="text: fulName"></strong></p>
  <p>City: <strong data-bind="text: city"></strong></p>
\`;

// ===== BINDER =====
function applyBindings(vm, rootEl, { strict }) {
  rootEl.querySelectorAll('[data-bind]').forEach((el) => {
    const [type, key] = el.dataset.bind.split(':').map((s) => s.trim());
    if (!(key in vm)) {
      if (strict) {
        console.error(
          \`[Binder] data-bind="\${el.dataset.bind}": vm has no "\${key}".\`,
          'Available:',
          Object.keys(vm).join(', ')
        );
        el.style.outline = '2px dashed crimson';
      }
      return; // a quiet binder just skips it: empty element, no clue why
    }
    if (type === 'text') el.textContent = vm[key];
  });
}

// Try strict: false to see how silent a typo can be.
applyBindings(vm, root, { strict: true });`,
      },
    ],
    quiz: [
      {
        q: 'What typically causes a memory leak in an MVVM app?',
        options: [
          'Using too many computed properties',
          'A long-lived object (store, socket, timer) keeps a callback of a ViewModel that should have been thrown away',
          'Two-way binding on text inputs',
          'Using classes instead of functions',
        ],
        answer: 1,
        why: 'The long-lived object holds the callback, and the callback holds the VM. Nothing can be garbage-collected until you unsubscribe.',
      },
      {
        q: 'In the zombie demo (dispose unchecked), you open and close 3 screens, then tick. How many <code>[ViewModel #…] got price</code> lines appear?',
        options: ['0', '1', '3', 'It depends on the browser'],
        answer: 2,
        why: 'All three VMs are still subscribed to the feed. <code>current = null</code> only removed <em>our</em> reference, not the feed\'s.',
      },
      {
        q: 'Which is a good way to shrink a god ViewModel?',
        options: [
          'Move logic into the View',
          'Split it into child ViewModels per panel and push business rules into the Model/services',
          'Replace all properties with one big object',
          'Use more two-way bindings',
        ],
        answer: 1,
        why: 'Child VMs keep each panel small and testable; the parent only coordinates (e.g. <code>canPlaceOrder</code>).',
      },
      {
        q: 'Why are binding typos like <code>text: fulName</code> dangerous?',
        options: [
          'They crash the browser',
          'They are often silent: the element just stays empty, so the bug is easy to miss',
          'They delete the ViewModel',
          'They cause infinite loops',
        ],
        answer: 1,
        why: 'Because bindings are strings, the compiler can\'t check them. Make your binder loud, or use typed/compiled bindings.',
      },
    ],
    exercise: {
      task: `
        <p>This clock screen leaks: every time you close and reopen it, one more
        <code>setInterval</code> keeps running and the console gets noisier.</p>
        <p>Add a <code>dispose()</code> method to <code>ClockViewModel</code> that stops the
        timer, and call it when the screen is closed. After the fix, only one
        <code>[ViewModel #…] tick</code> line should appear per second no matter how often
        you reopen.</p>
      `,
      starter: `// ===== VIEWMODEL =====
let nextId = 1;

class ClockViewModel {
  constructor(onChange) {
    this.id = nextId++;
    this.seconds = 0;
    this.timer = setInterval(() => {
      this.seconds++;
      console.log(\`[ViewModel #\${this.id}] tick \${this.seconds}\`);
      onChange();
    }, 1000);
  }

  // TODO: dispose() { ... }
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="toggle">Open / close clock</button>
  <p id="out">closed</p>
\`;
let vm = null;
const out = document.getElementById('out');
const render = () => {
  out.textContent = vm ? \`Clock #\${vm.id}: \${vm.seconds}s\` : 'closed';
};

document.getElementById('toggle').onclick = () => {
  if (vm) {
    // TODO: release the ViewModel's resources before dropping it
    vm = null;
  } else {
    vm = new ClockViewModel(render);
  }
  render();
};`,
      hint: 'dispose() calls <code>clearInterval(this.timer)</code>. In the click handler call <code>vm.dispose()</code> before <code>vm = null</code>.',
      solution: `// ===== VIEWMODEL =====
let nextId = 1;

class ClockViewModel {
  constructor(onChange) {
    this.id = nextId++;
    this.seconds = 0;
    this.timer = setInterval(() => {
      this.seconds++;
      console.log(\`[ViewModel #\${this.id}] tick \${this.seconds}\`);
      onChange();
    }, 1000);
  }

  dispose() {
    clearInterval(this.timer);
    console.log(\`[ViewModel #\${this.id}] disposed\`);
  }
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML = \`
  <button id="toggle">Open / close clock</button>
  <p id="out">closed</p>
\`;
let vm = null;
const out = document.getElementById('out');
const render = () => {
  out.textContent = vm ? \`Clock #\${vm.id}: \${vm.seconds}s\` : 'closed';
};

document.getElementById('toggle').onclick = () => {
  if (vm) {
    vm.dispose();
    vm = null;
  } else {
    vm = new ClockViewModel(render);
  }
  render();
};`,
    },
  },
);
