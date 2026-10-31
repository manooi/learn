window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── singleton
  {
    id: 'singleton',
    section: 'Creational patterns',
    title: 'Singleton',
    explain: `
      <p><strong>Intent:</strong> ensure a class has <em>exactly one</em> instance, and give everyone a single place to get it.</p>

      <h3>The problem</h3>
      <p>Some things should exist once per application: the loaded configuration, an in-memory cache, a connection
      pool, a clock. If every class did <code>new AppConfig()</code>, you'd parse the config file 50 times and two parts
      of the app could disagree about the settings.</p>

      <h3>The classic (GoF) solution</h3>
      <pre><code>public sealed class AppConfig
{
  private static AppConfig? _instance;          // ① the one instance
  private AppConfig() { }                       // ② nobody else can call new

  public static AppConfig Instance              // ③ global access point
  {
    get
    {
      if (_instance == null)                    // ⚠ NOT thread-safe
        _instance = new AppConfig();
      return _instance;
    }
  }
}</code></pre>
      <p>Participants: just the <strong>Singleton</strong> class itself, with a private constructor, a static field holding
      the instance, and a static accessor.</p>

      <h3>The thread-safety trap</h3>
      <p>In a web server, many threads call <code>Instance</code> at the same time. Two of them can both see
      <code>_instance == null</code> and both create an object. The C# program below forces that race so you can see it,
      and its walkthrough steps through it line by line.</p>

      <h3>Thread-safe versions in modern C#</h3>
      <pre><code>// A) static readonly: the CLR runs a static initializer exactly once, thread-safely
public sealed class Clock
{
  public static readonly Clock Instance = new();
  private Clock() { }
}

// B) Lazy&lt;T&gt;: also created once, but only on first use
public sealed class AppConfig
{
  private static readonly Lazy&lt;AppConfig&gt; _lazy = new(() =&gt; new AppConfig());
  public static AppConfig Instance =&gt; _lazy.Value;
  private AppConfig() { /* expensive: read files */ }
}</code></pre>
      <p>Both are correct. Use <code>Lazy&lt;T&gt;</code> when creation is expensive or might not be needed. The old
      "double-checked locking" with <code>lock</code> also works, but <code>Lazy&lt;T&gt;</code> does it for you.</p>

      <h3>Why most .NET code prefers a DI singleton</h3>
      <p>The "global access point" part is the problem. <code>AppConfig.Instance</code> can be called from anywhere, so:</p>
      <ul>
        <li><strong>Hidden dependencies</strong>: you can't see from a constructor that a class uses the config.</li>
        <li><strong>Hard to test</strong>: you can't replace a static instance with a fake, and state leaks between tests
        that share it.</li>
        <li><strong>Hard to change</strong>: "there's only one" often stops being true (one config per tenant...).</li>
      </ul>
      <p>The DI container gives you the "only one" part without the "global" part:</p>
      <pre><code>builder.Services.AddSingleton&lt;IAppConfig, AppConfig&gt;();   // one instance per container

class PriceService(IAppConfig config) { ... }                   // dependency is visible + fakeable</code></pre>
      <p><code>AppConfig</code> is now an ordinary class with a public constructor. Tests just do
      <code>new PriceService(new FakeConfig())</code>.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✓ Stateless or immutable shared objects: <code>EqualityComparer&lt;T&gt;.Default</code>,
        <code>StringComparer.Ordinal</code>, <code>Array.Empty&lt;T&gt;()</code>, <code>NullLogger.Instance</code>.</li>
        <li>✓ App-wide services, but registered with <code>AddSingleton</code> rather than a static <code>Instance</code>.</li>
        <li>✗ Mutable global state "for convenience". That's a global variable in a nice suit.</li>
      </ul>
      <div class="warn">A DI singleton must be thread-safe too: every request shares it. And never inject a
      <em>scoped</em> service (like a <code>DbContext</code>) into a singleton: the singleton would keep one
      <code>DbContext</code> alive forever (the "captive dependency" bug).</div>
    `,
    examples: [
      {
        title: 'C#: forcing the naive race, then Lazy<T> and static readonly',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Collections.Concurrent;

// 1) Naive singleton, with a hook that forces the classic race
var gate = new Barrier(2);
NaiveConfig.BeforeCreate = () => gate.SignalAndWait();

var t1 = new Thread(() => NaiveConfig.GetInstance());
var t2 = new Thread(() => NaiveConfig.GetInstance());
t1.Start();
t2.Start();
t1.Join();
t2.Join();
Console.WriteLine($"Naive: constructor calls = {NaiveConfig.Constructed} (expected 1)");

// 2) Lazy<T>: 8 parallel callers, still one instance
var seen = new ConcurrentBag<AppConfig>();
Parallel.For(0, 8, _ => seen.Add(AppConfig.Instance));
Console.WriteLine($"Lazy: constructor calls = {AppConfig.Constructed}");
Console.WriteLine($"Lazy: distinct instances = {seen.Distinct().Count()}");
Console.WriteLine($"Lazy: environment = {AppConfig.Instance.Environment}");

// 3) static readonly: the CLR runs the initializer exactly once
Console.WriteLine($"Static: same object? {ReferenceEquals(Clock.Instance, Clock.Instance)}");

class NaiveConfig
{
  private static NaiveConfig? _instance;
  public static Action? BeforeCreate; // demo hook: widens the race window
  public static int Constructed;

  private NaiveConfig() => Interlocked.Increment(ref Constructed);

  public static NaiveConfig GetInstance()
  {
    if (_instance == null)
    {
      BeforeCreate?.Invoke();
      _instance = new NaiveConfig();
    }
    return _instance;
  }
}

sealed class AppConfig
{
  private static readonly Lazy<AppConfig> _lazy = new(() => new AppConfig());
  public static AppConfig Instance => _lazy.Value;
  public static int Constructed;

  public string Environment { get; } = "Production";

  private AppConfig() => Interlocked.Increment(ref Constructed);
}

sealed class Clock
{
  public static readonly Clock Instance = new();
  private Clock() { }
}`,
        output: `Naive: constructor calls = 2 (expected 1)
Lazy: constructor calls = 1
Lazy: distinct instances = 1
Lazy: environment = Production
Static: same object? True`,
        explain: `
          <details>
            <summary>The problem: two threads, one <code>if</code>, two instances</summary>
            <p>The naive check-then-create is two separate actions: <em>read</em> <code>_instance</code>, then <em>write</em>
            it. Nothing stops another thread from running in between. In production that gap is a few nanoseconds, so the
            bug shows up rarely (worst kind of bug). The program uses a <code>Barrier(2)</code> as
            <code>BeforeCreate</code>: each thread must wait there until the other one arrives too, which guarantees both
            have already passed the <code>if</code>:</p>
            <table>
              <tr><th>Step</th><th>Thread A</th><th>Thread B</th><th><code>_instance</code></th><th><code>Constructed</code></th></tr>
              <tr><td>1</td><td><code>_instance == null</code> → <strong>true</strong></td><td></td><td>null</td><td>0</td></tr>
              <tr><td>2</td><td>waits at <code>gate.SignalAndWait()</code></td><td><code>_instance == null</code> → <strong>true</strong> (A hasn't written yet)</td><td>null</td><td>0</td></tr>
              <tr><td>3</td><td colspan="2">B arrives at the barrier → both released</td><td>null</td><td>0</td></tr>
              <tr><td>4</td><td><code>new NaiveConfig()</code> → object #1, assigned</td><td></td><td>#1</td><td>1</td></tr>
              <tr><td>5</td><td></td><td><code>new NaiveConfig()</code> → object #2, <em>overwrites</em></td><td>#2</td><td>2</td></tr>
              <tr><td>6</td><td colspan="4">prints <code>Naive: constructor calls = 2 (expected 1)</code> ❌</td></tr>
            </table>
            <p>Steps 4 and 5 may happen in either order (or truly in parallel), but either way the constructor runs twice.
            If the constructor opened a connection pool or loaded a 50&nbsp;MB file, you just did it twice, and code that
            grabbed object #1 early now holds a different "singleton" from everyone else.</p>
          </details>
          <details>
            <summary>The fix: let <code>Lazy&lt;T&gt;</code> (or the CLR) do the locking</summary>
            <pre><code>private static readonly Lazy&lt;AppConfig&gt; _lazy =
  new(() =&gt; new AppConfig());                    // ① factory, not run yet
public static AppConfig Instance =&gt; _lazy.Value;  // ② first caller runs the factory
private AppConfig() { ... }                       // ③ private: Lazy is the only creator</code></pre>
            <ol>
              <li><strong>①</strong> The default <code>Lazy&lt;T&gt;</code> mode is
              <code>LazyThreadSafetyMode.ExecutionAndPublication</code>: the factory runs at most once, under a lock.</li>
              <li><strong>②</strong> If 8 threads call <code>.Value</code> at once, one runs the factory and the other 7
              <em>wait</em>, then all get the same object. After that, <code>.Value</code> is a cheap read with no lock.</li>
              <li><strong>③</strong> With the constructor private, there is no other way to make an <code>AppConfig</code>.</li>
            </ol>
            <table>
              <tr><th>Step</th><th>Thread A</th><th>Thread B</th><th>Lazy state</th><th><code>Constructed</code></th></tr>
              <tr><td>1</td><td><code>_lazy.Value</code> → starts the factory</td><td></td><td>initialising (A)</td><td>0</td></tr>
              <tr><td>2</td><td><code>new AppConfig()</code></td><td><code>_lazy.Value</code> → <strong>blocks</strong></td><td>initialising (A)</td><td>1</td></tr>
              <tr><td>3</td><td>returns #1</td><td>wakes up, returns #1</td><td>created #1</td><td>1</td></tr>
            </table>
            <p>Hence <code>Lazy: constructor calls = 1</code> and <code>distinct instances = 1</code>, even though
            <code>Parallel.For</code> called <code>Instance</code> 8 times from several threads.
            <code>Clock</code>'s <code>static readonly</code> field works for the same reason: the CLR guarantees a type's
            static initialisation runs once, so <code>Static: same object? True</code>.</p>
          </details>
          <details>
            <summary>How the widget lets you compare</summary>
            <p>In the widget below, pick <strong>Naive</strong> and click <strong>Step A</strong>, <strong>Step B</strong>
            (both pass the <code>if</code>), then <strong>Step A</strong> twice and <strong>Step B</strong> twice: A ends
            up holding Config #1 and B holds Config #2. Switch to <strong>lock (double-checked)</strong> and do the same
            clicks: B's step on <code>lock</code> shows "waiting", and the inner check finds the instance A already made.
            <strong>Lazy&lt;T&gt;</strong> behaves like the table above.</p>
            <div class="tip">You almost never need to write this yourself in ASP.NET Core. Register the class with
            <code>AddSingleton</code>: the container creates it once (thread-safely) and injects it.</div>
          </details>
        `,
      },
      {
        title: 'Widget: step two threads through GetInstance()',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .modes button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  .wrap { display: flex; gap: 8px; margin: 8px 0; flex-wrap: wrap; }
  .th { flex: 1 1 200px; border: 2px solid #ccd; border-radius: 10px; padding: 6px 8px; font-size: 12.5px; }
  .th h4 { margin: 0 0 4px; font-size: 13px; }
  .th.A { border-color: #3858e9; } .th.B { border-color: #d35400; }
  .ln { font-family: ui-monospace, Menlo, monospace; padding: 2px 4px; border-radius: 4px; white-space: pre; }
  .A .ln.cur { background: #dfe6ff; } .B .ln.cur { background: #fde3cf; }
  .st { margin-top: 4px; font-size: 12px; color: #555; min-height: 16px; }
  .mid { flex: 1 1 170px; background: #f6f7fb; border-radius: 10px; padding: 6px 8px; font-size: 12.5px; }
  .obj { display: inline-block; padding: 3px 8px; margin: 3px; border-radius: 6px; background: #fff; border: 1.5px solid #888; }
  .verdict { padding: 6px 10px; border-radius: 8px; font-size: 13px; margin: 6px 0; }
  .verdict.bad { background: #fdecec; color: #a11; } .verdict.good { background: #e6f6ea; color: #17733a; }
  .log { font-family: ui-monospace, Menlo, monospace; font-size: 12px; background: #1f2330; color: #d7f5d0; border-radius: 8px; padding: 6px 8px; height: 76px; overflow: auto; }
</style>
<div class="top">Pick an implementation. Click <b>Step A</b> / <b>Step B</b> to run one line on that thread, or <b>Play the race</b>. Count the Config objects.</div>
<div class="modes" id="modes"></div>
<div class="wrap">
  <div class="th A" id="thA"></div>
  <div class="mid" id="mid"></div>
  <div class="th B" id="thB"></div>
</div>
<div>
  <button id="sa">Step A</button>
  <button id="sb">Step B</button>
  <button id="play">\\u25B6 Play the race</button>
  <button id="rs">Reset</button>
</div>
<div class="verdict" id="verdict"></div>
<div class="log" id="log"></div>
<script>
var MODES = {
  naive: { label: 'Naive', lines: ['if (_instance == null)', '  _instance = new Config();', 'return _instance;'] },
  lock: { label: 'lock (double-checked)', lines: ['if (_instance == null)', '  lock (_sync) {', '    if (_instance == null)', '      _instance = new Config();', '  } // release lock', 'return _instance;'] },
  lazy: { label: 'Lazy<T>', lines: ['return _lazy.Value;', '  [Lazy] runs factory: new Config()', '  [Lazy] publishes value'] }
};
var mode = 'naive', S;
function el(id) { return document.getElementById(id); }
function reset() {
  S = { inst: null, created: 0, lockOwner: null, lazy: 'none', lazyOwner: null, playing: false,
    T: { A: { pc: 0, done: false, result: null, msg: 'ready' }, B: { pc: 0, done: false, result: null, msg: 'ready' } } };
  el('log').innerHTML = '';
  render();
}
function log(t) {
  var d = document.createElement('div'); d.textContent = t; el('log').appendChild(d); el('log').scrollTop = 1e6; console.log(t);
}
function create(name) {
  S.created++; S.inst = S.created;
  return 'new Config() \\u2192 Config #' + S.created + ' (constructor call ' + S.created + ')';
}
function step(name) {
  var t = S.T[name];
  if (t.done) return;
  var line = MODES[mode].lines[t.pc], m;
  if (mode === 'naive') {
    if (t.pc === 0) { var isNull = S.inst === null; t.pc = isNull ? 1 : 2; m = '_instance == null \\u2192 ' + isNull; }
    else if (t.pc === 1) { m = create(name); t.pc = 2; }
    else { t.result = S.inst; t.done = true; m = 'returns Config #' + S.inst; }
  } else if (mode === 'lock') {
    if (t.pc === 0) { var n0 = S.inst === null; t.pc = n0 ? 1 : 5; m = '_instance == null \\u2192 ' + n0 + (n0 ? '' : ' (fast path, no lock)'); }
    else if (t.pc === 1) {
      if (S.lockOwner && S.lockOwner !== name) { m = 'waiting: lock held by Thread ' + S.lockOwner; }
      else { S.lockOwner = name; t.pc = 2; m = 'acquired the lock'; }
    }
    else if (t.pc === 2) { var n2 = S.inst === null; t.pc = n2 ? 3 : 4; m = 'inside lock: _instance == null \\u2192 ' + n2; }
    else if (t.pc === 3) { m = create(name); t.pc = 4; }
    else if (t.pc === 4) { S.lockOwner = null; t.pc = 5; m = 'released the lock'; }
    else { t.result = S.inst; t.done = true; m = 'returns Config #' + S.inst; }
  } else {
    if (t.pc === 0) {
      if (S.lazy === 'none') { S.lazy = 'running'; S.lazyOwner = name; t.pc = 1; m = 'Value not created yet: this thread runs the factory'; }
      else if (S.lazy === 'running') { m = 'waiting: Thread ' + S.lazyOwner + ' is creating the value'; }
      else { t.result = S.inst; t.done = true; m = 'value ready \\u2192 returns Config #' + S.inst; }
    }
    else if (t.pc === 1) { m = create(name); t.pc = 2; }
    else { S.lazy = 'done'; t.result = S.inst; t.done = true; m = 'returns Config #' + S.inst; }
  }
  t.msg = m;
  log(name + ': ' + line.trim() + '   // ' + m);
  render();
}
function render() {
  var mb = el('modes'); mb.innerHTML = '';
  Object.keys(MODES).forEach(function (k) {
    var b = document.createElement('button'); b.textContent = MODES[k].label;
    if (k === mode) b.className = 'on';
    b.onclick = function () { mode = k; reset(); };
    mb.appendChild(b);
  });
  ['A', 'B'].forEach(function (n) {
    var t = S.T[n], box = el('th' + n);
    box.innerHTML = '<h4>Thread ' + n + (t.done ? ' \\u2713 holds Config #' + t.result : '') + '</h4>';
    MODES[mode].lines.forEach(function (l, i) {
      var d = document.createElement('div');
      d.className = 'ln' + (!t.done && i === t.pc ? ' cur' : '');
      d.textContent = (!t.done && i === t.pc ? '\\u25B6 ' : '  ') + l;
      box.appendChild(d);
    });
    var st = document.createElement('div'); st.className = 'st'; st.textContent = t.msg; box.appendChild(st);
  });
  var h = '<b>Shared state</b><br>_instance = ' + (S.inst ? 'Config #' + S.inst : 'null') +
    '<br>constructor calls = <b>' + S.created + '</b>';
  if (mode === 'lock') h += '<br>lock owner = ' + (S.lockOwner || 'none');
  if (mode === 'lazy') h += '<br>Lazy state = ' + (S.lazy === 'running' ? 'creating (Thread ' + S.lazyOwner + ')' : S.lazy === 'done' ? 'created' : 'not created');
  h += '<br>';
  for (var i = 1; i <= S.created; i++) h += '<span class="obj">Config #' + i + '</span>';
  el('mid').innerHTML = h;
  var v = el('verdict');
  if (S.T.A.done && S.T.B.done) {
    if (S.created > 1) { v.className = 'verdict bad'; v.textContent = '\\u2717 ' + S.created + ' instances created. A holds #' + S.T.A.result + ', B holds #' + S.T.B.result + '. Not a singleton!'; }
    else { v.className = 'verdict good'; v.textContent = '\\u2713 Exactly one instance. Both threads hold Config #1.'; }
  } else { v.className = 'verdict'; v.textContent = ''; }
  el('sa').disabled = S.T.A.done || S.playing;
  el('sb').disabled = S.T.B.done || S.playing;
  el('play').disabled = S.playing;
}
el('sa').onclick = function () { step('A'); };
el('sb').onclick = function () { step('B'); };
el('rs').onclick = reset;
el('play').onclick = function () {
  reset();
  S.playing = true;
  var seq = ['A', 'B', 'A', 'A', 'B', 'B'], i = 0;
  var tick = function () {
    if (S.T.A.done && S.T.B.done) { S.playing = false; render(); return; }
    var n = i < seq.length ? seq[i] : (i % 2 === 0 ? 'A' : 'B');
    i++;
    if (S.T[n].done) n = n === 'A' ? 'B' : 'A';
    step(n);
    if (i > 30) { S.playing = false; render(); return; }
    setTimeout(tick, 650);
  };
  render();
  setTimeout(tick, 300);
};
reset();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li><strong>Naive</strong> → <strong>Play the race</strong>. The order is A, B, A, A, B, B: both threads see
              <code>null</code>, then each creates its own Config. Verdict: 2 instances.</li>
              <li>Still Naive, Reset, then <strong>Step A</strong> three times before touching B. B now sees Config #1 and
              returns it. The bug only appears when the threads interleave, which is why it's hard to reproduce.</li>
              <li><strong>lock (double-checked)</strong> → Play. Watch B print "waiting: lock held by Thread A", then find
              the instance already made by the <em>second</em> check.</li>
              <li><strong>Lazy&lt;T&gt;</strong> → Play. B waits while A runs the factory, then both hold Config #1.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'Why is the naive <code>if (_instance == null) _instance = new X();</code> not thread-safe?', options: ['<code>new</code> is slow', 'Two threads can both read null before either writes, so both create an instance', 'Static fields are per thread', 'The constructor is private'], answer: 1, why: 'Check-then-act is two steps. Without synchronisation another thread can run between them.' },
      { q: 'What does the default <code>Lazy&lt;T&gt;</code> guarantee?', options: ['The value is created on a background thread', 'The factory runs at most once even with concurrent callers; others wait and get the same value', 'The value is re-created every call', 'Nothing about threads'], answer: 1, why: 'The default mode, <code>ExecutionAndPublication</code>, locks during creation so only one value is ever created and published.' },
      { q: 'Which is the main testability problem with <code>AppConfig.Instance</code> used inside <code>PriceService</code>?', options: ['It\'s slow', 'You can\'t substitute a fake config, and its state is shared across tests', 'It needs a NuGet package', 'Records can\'t be singletons'], answer: 1, why: 'The dependency is hidden and static. A DI singleton (<code>AddSingleton</code>) injected through the constructor keeps one instance <em>and</em> lets tests pass a fake.' },
      { q: 'You register <code>services.AddSingleton&lt;ReportCache&gt;()</code>. What must <code>ReportCache</code> be?', options: ['A static class', 'Thread-safe, because all requests share the one instance', 'Sealed with a private constructor', 'Scoped'], answer: 1, why: 'A singleton lifetime means concurrent requests use the same object. Use thread-safe collections (e.g. <code>ConcurrentDictionary</code>) or locks.' },
      { q: 'Which BCL member is a reasonable, harmless singleton?', options: ['<code>StringComparer.Ordinal</code>', 'A static <code>List&lt;Order&gt;</code> everyone adds to', 'A static <code>DbContext</code>', 'A static <code>HttpContext</code>'], answer: 0, why: 'Stateless/immutable shared objects are the safe use of Singleton. Shared mutable state (lists, DbContext) causes races and leaks.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>Settings</code> has a public constructor (anyone can make a second one) and a naive, non-thread-safe
      <code>Instance</code>. Make it a proper singleton: <code>sealed</code>, a <strong>private</strong> constructor, and an
      <code>Instance</code> backed by <code>Lazy&lt;Settings&gt;</code>. Edit the C# in the box below and click
      <strong>Check</strong>.</p>`,
      hint: 'private static readonly Lazy<Settings> _lazy = new(() => new Settings()); public static Settings Instance => _lazy.Value; private Settings() { }',
      starter: `var s1 = Settings.Instance;
var s2 = Settings.Instance;

Console.WriteLine($"Same object? {ReferenceEquals(s1, s2)}");
Console.WriteLine($"Theme: {s1.Theme}");

class Settings
{
  private static Settings? _instance;

  public static Settings Instance
  {
    get
    {
      if (_instance == null)
        _instance = new Settings();
      return _instance;
    }
  }

  public Settings() { } // anyone can call new Settings()!

  public string Theme { get; } = "dark";
}`,
      solution: `var s1 = Settings.Instance;
var s2 = Settings.Instance;

Console.WriteLine($"Same object? {ReferenceEquals(s1, s2)}");
Console.WriteLine($"Theme: {s1.Theme}");

sealed class Settings
{
  private static readonly Lazy<Settings> _lazy = new(() => new Settings());

  public static Settings Instance => _lazy.Value;

  private Settings() { }

  public string Theme { get; } = "dark";
}`,
      checks: [
        { label: 'Settings is sealed', re: /sealed\s+class\s+Settings\b/ },
        { label: 'Private constructor', re: /private\s+Settings\s*\(\s*\)/ },
        { label: 'Uses Lazy<Settings>', re: /Lazy\s*<\s*Settings\s*>/ },
        { label: 'No naive null check left', re: /_instance\s*==\s*null/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── factory-method
  {
    id: 'factory-method',
    section: 'Creational patterns',
    title: 'Factory Method',
    explain: `
      <p><strong>Intent:</strong> define a method for creating an object, but let <em>subclasses</em> decide which concrete
      class to instantiate.</p>

      <h3>The problem</h3>
      <p>A logistics app was built for trucks. <code>PlanDelivery()</code> does route checks, pricing and tracking, and
      somewhere in the middle it says <code>new Truck()</code>. Now the company adds sea freight. Copy-pasting
      <code>PlanDelivery</code> for ships duplicates all the business logic; adding <code>if (sea) new Ship()</code>
      spreads type checks everywhere.</p>

      <h3>The solution</h3>
      <p>Keep the shared algorithm in a base class and turn the <code>new</code> into an overridable method:</p>
      <pre><code>abstract class Logistics                         // Creator
{
  protected abstract ITransport CreateTransport();  // ← the factory method

  public string PlanDelivery(string cargo)          // uses the product, never names it
  {
    var transport = CreateTransport();
    return transport.Deliver(cargo);
  }
}

class RoadLogistics : Logistics                      // ConcreteCreator
{
  protected override ITransport CreateTransport() =&gt; new Truck();
}</code></pre>
      <p>Participants:</p>
      <pre><code>  Logistics (Creator)            ITransport (Product)
  + PlanDelivery()  ──uses──▶   + Deliver()
  # CreateTransport() ◇               ▲          ▲
        ▲          ▲                Truck       Ship
  RoadLogistics  SeaLogistics       (ConcreteProducts)
  (ConcreteCreators: override CreateTransport)</code></pre>

      <h3>"Simple factory" and static factory methods are not the same thing</h3>
      <p>Three things get called "factory" in everyday C#:</p>
      <table>
        <tr><th>Name</th><th>Shape</th><th>Example</th></tr>
        <tr><td><strong>Factory Method (GoF)</strong></td><td>Overridable method; subclass picks the product.</td>
          <td><code>IEnumerable&lt;T&gt;.GetEnumerator()</code> (each collection creates its own enumerator),
          <code>ILoggerProvider.CreateLogger()</code></td></tr>
        <tr><td><strong>Simple factory</strong></td><td>One method with a <code>switch</code> that returns different types.
          Not a GoF pattern, but very common.</td><td><code>TransportFactory.Create("sea")</code></td></tr>
        <tr><td><strong>Static factory method</strong></td><td>A named "constructor" on the type itself.</td>
          <td><code>TimeSpan.FromMinutes(90)</code>, <code>Task.Run(...)</code>, <code>Enumerable.Range</code>,
          <code>IHttpClientFactory.CreateClient("github")</code> (an object factory you inject)</td></tr>
      </table>
      <p>A simple factory is fine when the set of products is small and stable. When new products keep arriving, each one
      edits the <code>switch</code> (an OCP violation). With Factory Method, a new product is a new subclass.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✓ A base class/framework has an algorithm that needs "some object of type X" and extensions should choose which.</li>
        <li>✓ You want to hide constructors behind meaningful names (<code>FromMinutes</code> reads better than
        <code>new TimeSpan(0, 90, 0)</code>).</li>
        <li>✗ You'd create a subclass just to change one <code>new</code>. In modern C# a <code>Func&lt;ITransport&gt;</code>
        parameter or DI often does the same job with less ceremony.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: Logistics creators, a simple factory, and BCL static factories',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Factory Method: each creator subclass decides which product to make
Logistics[] apps = [new RoadLogistics(), new SeaLogistics(), new AirLogistics()];

foreach (var app in apps)
  Console.WriteLine(app.PlanDelivery("Order #42"));

// "Simple factory": one static method with a switch (not the GoF pattern)
ITransport t = TransportFactory.Create("sea");
Console.WriteLine($"Simple factory made a {t.GetType().Name}");

// Static factory methods in the BCL: named ways to create objects
Console.WriteLine(TimeSpan.FromMinutes(90));
Console.WriteLine(Task.Run(() => 6 * 7).Result);
Console.WriteLine(string.Join(",", Enumerable.Range(1, 3)));

interface ITransport
{
  string Deliver(string cargo);
}

class Truck : ITransport
{
  public string Deliver(string cargo) => $"Truck drives {cargo} by road";
}

class Ship : ITransport
{
  public string Deliver(string cargo) => $"Ship sails {cargo} in a container";
}

class Plane : ITransport
{
  public string Deliver(string cargo) => $"Plane flies {cargo} overnight";
}

abstract class Logistics
{
  // The factory method: subclasses decide the concrete product
  protected abstract ITransport CreateTransport();

  // Shared business logic that works with ANY product
  public string PlanDelivery(string cargo)
  {
    var transport = CreateTransport();
    return $"{GetType().Name}: {transport.Deliver(cargo)}";
  }
}

class RoadLogistics : Logistics
{
  protected override ITransport CreateTransport() => new Truck();
}

class SeaLogistics : Logistics
{
  protected override ITransport CreateTransport() => new Ship();
}

class AirLogistics : Logistics
{
  protected override ITransport CreateTransport() => new Plane();
}

static class TransportFactory
{
  public static ITransport Create(string kind) => kind switch
  {
    "road" => new Truck(),
    "sea" => new Ship(),
    "air" => new Plane(),
    _ => throw new ArgumentException($"Unknown transport '{kind}'"),
  };
}`,
        output: `RoadLogistics: Truck drives Order #42 by road
SeaLogistics: Ship sails Order #42 in a container
AirLogistics: Plane flies Order #42 overnight
Simple factory made a Ship
01:30:00
42
1,2,3`,
        explain: `
          <details>
            <summary>Step by step: one <code>PlanDelivery</code> call</summary>
            <table>
              <tr><th>Step</th><th>Code running</th><th>Why</th></tr>
              <tr><td>1</td><td><code>app.PlanDelivery("Order #42")</code> with <code>app</code> = <code>SeaLogistics</code></td><td>Defined once in <code>Logistics</code>.</td></tr>
              <tr><td>2</td><td><code>CreateTransport()</code> → virtual dispatch to <code>SeaLogistics.CreateTransport</code></td><td>The subclass decides.</td></tr>
              <tr><td>3</td><td>returns <code>new Ship()</code> typed as <code>ITransport</code></td><td><code>PlanDelivery</code> never names <code>Ship</code>.</td></tr>
              <tr><td>4</td><td><code>transport.Deliver(cargo)</code> → <code>SeaLogistics: Ship sails Order #42 in a container</code></td><td>Product does its job.</td></tr>
            </table>
            <p>Adding drones = <code>class Drone : ITransport</code> + <code>class DroneLogistics : Logistics</code>.
            <code>Logistics</code> and the other creators are untouched. With <code>TransportFactory</code> you'd have to edit
            its <code>switch</code> instead.</p>
          </details>
        `,
      },
      {
        title: 'Widget: call PlanDelivery() on different creators',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .cr button.on, .mode button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  .flow { display: flex; gap: 6px; align-items: stretch; margin: 10px 0; flex-wrap: wrap; }
  .st { flex: 1 1 120px; border: 1.5px solid #ccd; border-radius: 8px; padding: 6px; font-size: 12px; background: #fafbfe; transition: all .25s; }
  .st b { display: block; font-size: 12.5px; margin-bottom: 2px; }
  .st.on { background: #fff4c2; border-color: #e0a800; transform: translateY(-2px); }
  .arrow { align-self: center; color: #888; }
  .log { font-family: ui-monospace, Menlo, monospace; font-size: 12px; background: #1f2330; color: #d7f5d0; border-radius: 8px; padding: 6px 8px; height: 66px; overflow: auto; }
  .files { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; font-size: 12px; }
  .f { padding: 3px 8px; border-radius: 6px; background: #f1f3f7; }
  .f.edit { background: #fdecec; color: #a11; } .f.add { background: #e6f6ea; color: #17733a; }
  .sec { margin-top: 10px; font-size: 13px; }
</style>
<div class="top">Pick a creator and click <b>PlanDelivery()</b>. Then try adding a new transport in both styles.</div>
<div class="cr" id="cr"></div>
<div><button id="go">\\u25B6 app.PlanDelivery("Order #42")</button></div>
<div class="flow" id="flow"></div>
<div class="log" id="log"></div>
<div class="sec"><b>Add a new transport (Drone):</b>
  <span class="mode" id="mode"></span> <button id="add">+ Add Drone</button></div>
<div class="files" id="files"></div>
<script>
var CREATORS = [
  { name: 'RoadLogistics', product: 'Truck', text: 'Truck drives Order #42 by road' },
  { name: 'SeaLogistics', product: 'Ship', text: 'Ship sails Order #42 in a container' },
  { name: 'AirLogistics', product: 'Plane', text: 'Plane flies Order #42 overnight' }
];
var DRONE = { name: 'DroneLogistics', product: 'Drone', text: 'Drone drops Order #42 on the doorstep' };
var cur = 0, style = 'fm', added = { fm: false, sf: false }, busy = false;
function el(id) { return document.getElementById(id); }
function log(t) { var d = document.createElement('div'); d.textContent = t; el('log').appendChild(d); el('log').scrollTop = 1e6; console.log(t); }
function list() { return added.fm ? CREATORS.concat([DRONE]) : CREATORS; }
function renderCreators() {
  var c = el('cr'); c.innerHTML = 'Creator: ';
  list().forEach(function (x, i) {
    var b = document.createElement('button'); b.textContent = x.name;
    if (i === cur) b.className = 'on';
    b.onclick = function () { if (busy) return; cur = i; renderCreators(); renderFlow(-1); };
    c.appendChild(b);
  });
}
function renderFlow(active) {
  var x = list()[cur];
  var steps = [
    ['Client', 'app.PlanDelivery(cargo)'],
    ['Logistics (base)', 'PlanDelivery calls CreateTransport()'],
    [x.name, 'override CreateTransport() \\u2192 new ' + x.product + '()'],
    [x.product + ' : ITransport', 'Deliver(cargo)']
  ];
  var f = el('flow'); f.innerHTML = '';
  steps.forEach(function (s, i) {
    if (i) { var a = document.createElement('div'); a.className = 'arrow'; a.textContent = '\\u2192'; f.appendChild(a); }
    var d = document.createElement('div'); d.className = 'st' + (i === active ? ' on' : '');
    d.innerHTML = '<b></b><span></span>';
    d.firstChild.textContent = s[0]; d.lastChild.textContent = s[1];
    f.appendChild(d);
  });
}
el('go').onclick = function () {
  if (busy) return; busy = true;
  var x = list()[cur], i = 0;
  var tick = function () {
    renderFlow(i);
    if (i === 3) { log(x.name + ': ' + x.text); busy = false; setTimeout(function () { renderFlow(-1); }, 700); return; }
    i++; setTimeout(tick, 450);
  };
  tick();
};
function renderMode() {
  var m = el('mode'); m.innerHTML = '';
  [['fm', 'Factory Method'], ['sf', 'Simple factory (switch)']].forEach(function (x) {
    var b = document.createElement('button'); b.textContent = x[1];
    if (x[0] === style) b.className = 'on';
    b.onclick = function () { style = x[0]; renderMode(); renderFiles(); };
    m.appendChild(b);
  });
  el('add').disabled = added[style];
}
function renderFiles() {
  var files = style === 'fm'
    ? [['Logistics.cs', 'same'], ['RoadLogistics.cs', 'same'], ['SeaLogistics.cs', 'same'], ['AirLogistics.cs', 'same'], ['Drone.cs', 'add'], ['DroneLogistics.cs', 'add']]
    : [['TransportFactory.cs (switch)', 'edit'], ['Drone.cs', 'add']];
  var f = el('files'); f.innerHTML = '';
  files.forEach(function (x) {
    if (!added[style] && x[1] !== 'same') return;
    var d = document.createElement('span'); d.className = 'f ' + x[1];
    d.textContent = (x[1] === 'edit' ? '\\u270E edited: ' : x[1] === 'add' ? '+ ' : '\\u2713 ') + x[0];
    f.appendChild(d);
  });
  if (!added[style] && style === 'sf') { var d2 = document.createElement('span'); d2.className = 'f'; d2.textContent = '\\u2713 TransportFactory.cs'; f.appendChild(d2); }
}
el('add').onclick = function () {
  added[style] = true;
  if (style === 'fm') log('Added class Drone : ITransport and class DroneLogistics : Logistics. No existing file edited.');
  else log('Added class Drone, then edited TransportFactory.Create: "drone" => new Drone(). Existing code changed.');
  renderCreators(); renderMode(); renderFiles();
};
renderCreators(); renderFlow(-1); renderMode(); renderFiles();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>SeaLogistics</strong> then <strong>PlanDelivery()</strong>. The highlight walks Client →
              Logistics → SeaLogistics.CreateTransport → Ship, and the log matches the program's second line.</li>
              <li>With <strong>Factory Method</strong> selected, click <strong>+ Add Drone</strong>: two green files, every
              existing file still ✓. A <strong>DroneLogistics</strong> creator appears; run it.</li>
              <li>Switch to <strong>Simple factory (switch)</strong> and add Drone: <code>TransportFactory.cs</code> turns red.
              Small cost here, but it's the same file every time a product is added.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'In Factory Method, who decides which concrete product is created?', options: ['The client, with a switch', 'A subclass of the creator, by overriding the factory method', 'The product itself', 'The DI container, always'], answer: 1, why: 'The creator declares an abstract/virtual factory method; each concrete creator overrides it to return its product.' },
      { q: '<code>TimeSpan.FromMinutes(90)</code> is best described as…', options: ['GoF Factory Method', 'A static factory method (a named constructor)', 'Abstract Factory', 'Builder'], answer: 1, why: 'It\'s a static method on the type that returns a new instance with a clear name. No subclass overriding involved.' },
      { q: 'Each .NET collection returns its own enumerator from <code>GetEnumerator()</code>. Which pattern is that?', options: ['Factory Method', 'Singleton', 'Prototype', 'Facade'], answer: 0, why: '<code>IEnumerable&lt;T&gt;</code> declares the creation method; <code>List&lt;T&gt;</code>, <code>HashSet&lt;T&gt;</code>, etc. each decide which concrete enumerator to create.' },
      { q: 'Why might a simple factory with a <code>switch</code> become a problem?', options: ['Switches are slow', 'Every new product type requires editing the same method (an OCP violation)', 'It can\'t return interfaces', 'It forces singletons'], answer: 1, why: 'It\'s fine for a small, stable set. As products are added, the switch is a hotspot of change.' },
      { q: 'What does <code>PlanDelivery</code> in <code>Logistics</code> know about <code>Ship</code>?', options: ['Everything: it creates it', 'Nothing: it only sees <code>ITransport</code> returned by <code>CreateTransport()</code>', 'Its constructor parameters', 'It inherits from it'], answer: 1, why: 'That\'s the point: shared logic depends on the product interface, and the concrete class is chosen in the subclass.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>NotificationService.Notify</code> picks the channel with a <code>switch</code>. Refactor to Factory Method:
      an <strong>abstract</strong> <code>Notifier</code> class with a <code>protected abstract IChannel CreateChannel()</code>
      and a shared <code>Notify(string to)</code> method; subclasses <code>EmailNotifier</code> and <code>SmsNotifier</code>
      override <code>CreateChannel</code>. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'abstract class Notifier { protected abstract IChannel CreateChannel(); public void Notify(string to) { Console.WriteLine("Preparing notification..."); CreateChannel().Send(to); } } class EmailNotifier : Notifier { protected override IChannel CreateChannel() => new EmailChannel(); }',
      starter: `var service = new NotificationService();
service.Notify("email", "Ana");
service.Notify("sms", "Ben");

interface IChannel
{
  void Send(string to);
}

class EmailChannel : IChannel
{
  public void Send(string to) => Console.WriteLine($"Email to {to}");
}

class SmsChannel : IChannel
{
  public void Send(string to) => Console.WriteLine($"SMS to {to}");
}

class NotificationService
{
  public void Notify(string kind, string to)
  {
    IChannel channel = kind switch
    {
      "email" => new EmailChannel(),
      "sms" => new SmsChannel(),
      _ => throw new ArgumentException(kind),
    };

    Console.WriteLine("Preparing notification...");
    channel.Send(to);
  }
}`,
      solution: `Notifier[] notifiers = [new EmailNotifier(), new SmsNotifier()];

notifiers[0].Notify("Ana");
notifiers[1].Notify("Ben");

interface IChannel
{
  void Send(string to);
}

class EmailChannel : IChannel
{
  public void Send(string to) => Console.WriteLine($"Email to {to}");
}

class SmsChannel : IChannel
{
  public void Send(string to) => Console.WriteLine($"SMS to {to}");
}

abstract class Notifier
{
  protected abstract IChannel CreateChannel();

  public void Notify(string to)
  {
    Console.WriteLine("Preparing notification...");
    CreateChannel().Send(to);
  }
}

class EmailNotifier : Notifier
{
  protected override IChannel CreateChannel() => new EmailChannel();
}

class SmsNotifier : Notifier
{
  protected override IChannel CreateChannel() => new SmsChannel();
}`,
      checks: [
        { label: 'Has an abstract creator class', re: /abstract\s+class\s+\w+/ },
        { label: 'Declares abstract IChannel Create…() factory method', re: /abstract\s+IChannel\s+Create\w*\s*\(\s*\)/ },
        { label: 'A subclass overrides the factory method', re: /override\s+IChannel\s+Create\w*\s*\(\s*\)/ },
        { label: 'No switch on the kind any more', re: /\bswitch\b/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── abstract-factory
  {
    id: 'abstract-factory',
    section: 'Creational patterns',
    title: 'Abstract Factory',
    explain: `
      <p><strong>Intent:</strong> provide an interface for creating <em>families</em> of related objects without naming
      their concrete classes, so the objects you get always belong together.</p>

      <h3>The problem</h3>
      <p>An app supports a Light and a Dark theme. A settings screen needs a button and a checkbox. If the screen writes
      <code>new DarkButton()</code> and <code>new LightCheckbox()</code> itself, sooner or later somebody mixes them up:
      white checkbox on a black page. Every screen also has to know about every theme.</p>

      <h3>The solution</h3>
      <pre><code>interface IUiFactory                    // AbstractFactory
{
  IButton CreateButton();
  ICheckbox CreateCheckbox();
}

class DarkFactory : IUiFactory          // ConcreteFactory: one per family
{
  public IButton CreateButton() =&gt; new DarkButton();
  public ICheckbox CreateCheckbox() =&gt; new DarkCheckbox();
}

class SettingsScreen(IUiFactory ui)     // Client: only knows the interfaces
{
  public void Render() { var b = ui.CreateButton(); var c = ui.CreateCheckbox(); ... }
}</code></pre>
      <p>Pick the factory once at startup (<code>new SettingsScreen(isDark ? new DarkFactory() : new LightFactory())</code>)
      and every widget is guaranteed to match. Adding a High Contrast theme = one new factory + its products; screens don't
      change.</p>
      <pre><code>            IUiFactory ───────────────▶ IButton      ICheckbox
            ▲        ▲                      ▲  ▲          ▲  ▲
   LightFactory   DarkFactory      LightButton DarkButton  LightCheckbox DarkCheckbox
   (makes Light*)  (makes Dark*)</code></pre>

      <h3>Abstract Factory vs Factory Method</h3>
      <table>
        <tr><th></th><th>Factory Method</th><th>Abstract Factory</th></tr>
        <tr><td>Creates</td><td>One product</td><td>A family of related products</td></tr>
        <tr><td>How</td><td>Inheritance: subclass overrides a method</td><td>Composition: client is given a factory object</td></tr>
        <tr><td>Guarantee</td><td>The right product for this creator</td><td>Products that are consistent with each other</td></tr>
      </table>
      <p>They often combine: each <code>Create…</code> method of a concrete factory is itself a little factory method.</p>

      <h3>In .NET</h3>
      <p><code>System.Data.Common.DbProviderFactory</code> is the textbook example: <code>SqlClientFactory.Instance</code>
      creates a matching <code>SqlConnection</code>, <code>SqlCommand</code> and <code>SqlParameter</code>;
      <code>NpgsqlFactory</code> creates the PostgreSQL family. Code written against <code>DbProviderFactory</code> can't
      accidentally pair a SQL Server command with a PostgreSQL connection.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✓ Several products that must be used together, with several interchangeable families (themes, cloud providers
        with blob + queue + secrets clients, database providers).</li>
        <li>✗ Only one product: use Factory Method or just DI.</li>
        <li>✗ Families that keep growing new <em>kinds</em> of product: adding <code>CreateSlider()</code> changes the
        interface and every concrete factory.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: Light and Dark UI factories',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Pick ONE factory; every widget it makes is guaranteed to match
IUiFactory[] themes = [new LightFactory(), new DarkFactory()];

foreach (var factory in themes)
  new SettingsScreen(factory).Render();

interface IButton
{
  string Render(string label);
}

interface ICheckbox
{
  string Render(string label, bool isChecked);
}

interface IUiFactory
{
  string Name { get; }
  IButton CreateButton();
  ICheckbox CreateCheckbox();
}

class LightButton : IButton
{
  public string Render(string label) => $"[ {label} ] white button, dark text";
}

class DarkButton : IButton
{
  public string Render(string label) => $"[ {label} ] black button, light text";
}

class LightCheckbox : ICheckbox
{
  public string Render(string label, bool isChecked) =>
    (isChecked ? "[x] " : "[ ] ") + label + " (light checkbox)";
}

class DarkCheckbox : ICheckbox
{
  public string Render(string label, bool isChecked) =>
    (isChecked ? "[x] " : "[ ] ") + label + " (dark checkbox)";
}

class LightFactory : IUiFactory
{
  public string Name => "Light";
  public IButton CreateButton() => new LightButton();
  public ICheckbox CreateCheckbox() => new LightCheckbox();
}

class DarkFactory : IUiFactory
{
  public string Name => "Dark";
  public IButton CreateButton() => new DarkButton();
  public ICheckbox CreateCheckbox() => new DarkCheckbox();
}

// The client never mentions Light* or Dark* classes
class SettingsScreen(IUiFactory ui)
{
  public void Render()
  {
    var notify = ui.CreateCheckbox();
    var save = ui.CreateButton();

    Console.WriteLine($"--- {ui.Name} theme ---");
    Console.WriteLine(notify.Render("Email me", true));
    Console.WriteLine(save.Render("Save"));
  }
}`,
        output: `--- Light theme ---
[x] Email me (light checkbox)
[ Save ] white button, dark text
--- Dark theme ---
[x] Email me (dark checkbox)
[ Save ] black button, light text`,
      },
      {
        title: 'Widget: theme factories vs mix-and-match',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .fx button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  .row { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
  .screen { flex: 1 1 240px; border-radius: 10px; padding: 12px; min-height: 120px; border: 1px solid #ccd; transition: background .3s; }
  .screen h4 { margin: 0 0 8px; }
  .w { display: inline-block; padding: 6px 14px; border-radius: 6px; margin: 4px 0; font-size: 14px; }
  .cb { display: flex; align-items: center; gap: 6px; margin: 6px 0; font-size: 14px; padding: 4px 6px; border-radius: 6px; }
  .tick { width: 16px; height: 16px; border-radius: 3px; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; }
  .side { flex: 1 1 220px; font-size: 13px; }
  .badge { padding: 6px 10px; border-radius: 8px; margin: 6px 0; }
  .badge.ok { background: #e6f6ea; color: #17733a; } .badge.bad { background: #fdecec; color: #a11; }
  .log { font-family: ui-monospace, Menlo, monospace; font-size: 12px; background: #1f2330; color: #d7f5d0; border-radius: 8px; padding: 6px 8px; height: 80px; overflow: auto; }
  .mix { margin-top: 6px; font-size: 13px; }
</style>
<div class="top">Choose a factory and click <b>Render screen</b>. Then try <b>No factory</b> and pick widgets by hand.</div>
<div class="fx" id="fx"></div>
<div class="mix" id="mix"></div>
<div><button id="render">\\u25B6 new SettingsScreen(factory).Render()</button></div>
<div class="row">
  <div class="screen" id="screen"></div>
  <div class="side"><div class="badge" id="badge"></div><div class="log" id="log"></div></div>
</div>
<script>
var THEMES = {
  Light: { page: '#ffffff', fg: '#1f2330', btn: 'background:#fff;color:#1f2330;border:1.5px solid #1f2330', cb: 'background:#f4f6fa;color:#1f2330', tick: 'background:#fff;border:1.5px solid #1f2330;color:#1f2330' },
  Dark: { page: '#1f2330', fg: '#f1f1f1', btn: 'background:#000;color:#eee;border:1.5px solid #666', cb: 'background:#2c3140;color:#eee', tick: 'background:#000;border:1.5px solid #aaa;color:#eee' },
  HighContrast: { page: '#000000', fg: '#ffff00', btn: 'background:#000;color:#ffff00;border:3px solid #ffff00;font-weight:700', cb: 'background:#000;color:#ffff00;border:2px solid #ffff00', tick: 'background:#ffff00;color:#000;border:2px solid #ffff00' }
};
var mode = 'Light', mixBtn = 'Dark', mixCb = 'Light';
function el(id) { return document.getElementById(id); }
function log(t) { var d = document.createElement('div'); d.textContent = t; el('log').appendChild(d); el('log').scrollTop = 1e6; console.log(t); }
function renderControls() {
  var f = el('fx'); f.innerHTML = 'Factory: ';
  ['Light', 'Dark', 'HighContrast', 'none'].forEach(function (k) {
    var b = document.createElement('button');
    b.textContent = k === 'none' ? 'No factory (mix & match)' : k + 'Factory';
    if (k === mode) b.className = 'on';
    b.onclick = function () { mode = k; renderControls(); };
    f.appendChild(b);
  });
  var m = el('mix');
  if (mode !== 'none') { m.innerHTML = ''; return; }
  m.innerHTML = 'Button: <select id="sb"></select> Checkbox: <select id="sc"></select>';
  ['sb', 'sc'].forEach(function (id) {
    var s = el(id);
    Object.keys(THEMES).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = 'new ' + k + (id === 'sb' ? 'Button()' : 'Checkbox()'); s.appendChild(o); });
    s.value = id === 'sb' ? mixBtn : mixCb;
    s.onchange = function () { if (id === 'sb') mixBtn = s.value; else mixCb = s.value; };
  });
}
function render() {
  var b = mode === 'none' ? mixBtn : mode, c = mode === 'none' ? mixCb : mode;
  var page = mode === 'none' ? 'Dark' : mode;
  var T = THEMES[page];
  if (mode === 'none') log('// screen picks classes itself (page theme: Dark)');
  else log('var ui = new ' + mode + 'Factory();');
  log((mode === 'none' ? 'new ' + c + 'Checkbox()' : 'ui.CreateCheckbox() \\u2192 ' + c + 'Checkbox'));
  log((mode === 'none' ? 'new ' + b + 'Button()' : 'ui.CreateButton()   \\u2192 ' + b + 'Button'));
  var s = el('screen');
  s.style.background = T.page; s.style.color = T.fg;
  s.innerHTML = '<h4>Settings (' + page + ' page)</h4>' +
    '<div class="cb" style="' + THEMES[c].cb + '"><span class="tick" style="' + THEMES[c].tick + '">\\u2713</span>Email me</div>' +
    '<span class="w" style="' + THEMES[b].btn + '">Save</span>';
  var ok = b === page && c === page;
  var bd = el('badge');
  bd.className = 'badge ' + (ok ? 'ok' : 'bad');
  bd.textContent = ok ? '\\u2713 Consistent: every widget came from ' + page + 'Factory.' : '\\u2717 Mixed family: ' + c + 'Checkbox + ' + b + 'Button on a ' + page + ' page.';
}
el('render').onclick = render;
renderControls();
render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>DarkFactory</strong> → Render. The log shows the client only calls
              <code>ui.CreateCheckbox()</code> and <code>ui.CreateButton()</code>; the factory decides the classes.</li>
              <li>Click <strong>HighContrastFactory</strong> → Render. A whole new family, and <code>SettingsScreen</code>
              didn't change.</li>
              <li>Click <strong>No factory</strong>, leave Button = Dark and Checkbox = Light, Render. The badge turns red:
              that inconsistency is exactly what Abstract Factory makes impossible.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What does Abstract Factory guarantee that separate <code>new</code> calls don\'t?', options: ['Faster object creation', 'All products created together come from the same family and work together', 'Only one instance exists', 'Objects are immutable'], answer: 1, why: 'The client gets every product from one factory object, so it can\'t mix a DarkButton with a LightCheckbox.' },
      { q: 'Main structural difference between Factory Method and Abstract Factory?', options: ['None', 'Factory Method relies on a subclass overriding one creation method; Abstract Factory is an object with several creation methods passed to the client', 'Abstract Factory must be static', 'Factory Method creates families'], answer: 1, why: 'Factory Method = inheritance, one product. Abstract Factory = composition, a family of products.' },
      { q: 'Which .NET type is a classic Abstract Factory?', options: ['<code>StringBuilder</code>', '<code>DbProviderFactory</code>', '<code>Lazy&lt;T&gt;</code>', '<code>List&lt;T&gt;</code>'], answer: 1, why: 'It creates a matching connection, command, parameter, etc. for one database provider.' },
      { q: 'You must add a <code>Slider</code> to every theme. What changes?', options: ['Only the client', '<code>IUiFactory</code> gains <code>CreateSlider()</code> and every concrete factory must implement it', 'Nothing', 'Only <code>LightFactory</code>'], answer: 1, why: 'Adding a new product kind is the weak spot of Abstract Factory: the interface and all factories change. Adding a new family is the easy direction.' },
      { q: 'Your app talks to AWS or Azure (blob storage + queue + secrets), chosen at startup. Which pattern fits?', options: ['Singleton', 'Abstract Factory: an <code>ICloudFactory</code> with <code>CreateBlobStore()</code>, <code>CreateQueue()</code>, <code>CreateSecrets()</code>', 'Prototype', 'Builder'], answer: 1, why: 'Several related products, several interchangeable families, chosen once: textbook Abstract Factory.' },
    ],
    exercise: window.csExercise({
      task: `<p>The code below picks widget classes by hand and has a bug: the checkbox ignores the theme. Introduce an
      <code>IUiFactory</code> with <code>IButton CreateButton()</code> and <code>ICheckbox CreateCheckbox()</code>, a
      <code>LightFactory</code> and a <code>DarkFactory</code>, and a method that takes an <code>IUiFactory</code> parameter
      and renders the screen. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'interface IUiFactory { IButton CreateButton(); ICheckbox CreateCheckbox(); } class DarkFactory : IUiFactory { ... } then: void RenderScreen(IUiFactory ui) { Console.WriteLine(ui.CreateButton().Render("Save")); ... } RenderScreen(dark ? new DarkFactory() : new LightFactory());',
      starter: `var dark = true;

IButton button = dark ? new DarkButton() : new LightButton();
ICheckbox checkbox = new LightCheckbox(); // bug: forgot the theme!

Console.WriteLine(button.Render("Save"));
Console.WriteLine(checkbox.Render("Email me"));

interface IButton
{
  string Render(string label);
}

interface ICheckbox
{
  string Render(string label);
}

class LightButton : IButton
{
  public string Render(string label) => $"[{label}] light";
}

class DarkButton : IButton
{
  public string Render(string label) => $"[{label}] dark";
}

class LightCheckbox : ICheckbox
{
  public string Render(string label) => $"[x] {label} light";
}

class DarkCheckbox : ICheckbox
{
  public string Render(string label) => $"[x] {label} dark";
}`,
      solution: `var dark = true;

RenderScreen(dark ? new DarkFactory() : new LightFactory());

void RenderScreen(IUiFactory ui)
{
  Console.WriteLine(ui.CreateButton().Render("Save"));
  Console.WriteLine(ui.CreateCheckbox().Render("Email me"));
}

interface IButton
{
  string Render(string label);
}

interface ICheckbox
{
  string Render(string label);
}

interface IUiFactory
{
  IButton CreateButton();
  ICheckbox CreateCheckbox();
}

class LightFactory : IUiFactory
{
  public IButton CreateButton() => new LightButton();
  public ICheckbox CreateCheckbox() => new LightCheckbox();
}

class DarkFactory : IUiFactory
{
  public IButton CreateButton() => new DarkButton();
  public ICheckbox CreateCheckbox() => new DarkCheckbox();
}

class LightButton : IButton
{
  public string Render(string label) => $"[{label}] light";
}

class DarkButton : IButton
{
  public string Render(string label) => $"[{label}] dark";
}

class LightCheckbox : ICheckbox
{
  public string Render(string label) => $"[x] {label} light";
}

class DarkCheckbox : ICheckbox
{
  public string Render(string label) => $"[x] {label} dark";
}`,
      checks: [
        { label: 'Declares interface IUiFactory', re: /interface\s+IUiFactory\b/ },
        { label: 'Has IButton CreateButton()', re: /IButton\s+CreateButton\s*\(\s*\)/ },
        { label: 'Has ICheckbox CreateCheckbox()', re: /ICheckbox\s+CreateCheckbox\s*\(\s*\)/ },
        { label: 'At least two classes implement IUiFactory', re: /class\s+\w+[^{]*:\s*IUiFactory\b[\s\S]*class\s+\w+[^{]*:\s*IUiFactory\b/ },
        { label: 'Something takes an IUiFactory parameter', re: /\(\s*IUiFactory\s+\w+/ },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── builder
  {
    id: 'builder',
    section: 'Creational patterns',
    title: 'Builder',
    explain: `
      <p><strong>Intent:</strong> construct a complex object step by step, keeping the construction readable, and produce
      the finished (often immutable and validated) object at the end.</p>

      <h3>The problem</h3>
      <p>An HTTP request has a method, a URL, any number of headers, an optional body, a timeout... A constructor for all
      of that is unreadable and grows forever (the "telescoping constructor"):</p>
      <pre><code>new HttpRequestSpec("POST", url, headers, body, TimeSpan.FromSeconds(5), true, false, null);
//                                                           what are these? ▲     ▲     ▲</code></pre>
      <p>And some rules involve several fields at once ("a GET can't have a body"), so they can't be checked by any one
      setter.</p>

      <h3>The solution</h3>
      <pre><code>var request = new HttpRequestBuilder()
  .Post("https://api.example.com/orders")   // each step returns the builder (fluent)
  .Header("Accept", "application/json")
  .JsonBody(json)
  .Build();                                 // validate everything, create the product</code></pre>
      <p>Participants: the <strong>Builder</strong> (mutable, collects settings, methods return <code>this</code>), the
      <strong>Product</strong> (often an immutable record), and optionally a <strong>Director</strong>: code that knows a
      standard recipe, e.g. <code>static HttpRequestBuilder JsonApiCall(string url)</code> that pre-sets common headers.
      In C# the director is usually just a helper method or an extension method.</p>

      <h3>Builders in .NET</h3>
      <ul>
        <li><code>StringBuilder</code>: many cheap <code>Append</code> steps, one <code>ToString()</code> at the end.</li>
        <li><code>UriBuilder</code>: set scheme, host, path, query separately, then read <code>.Uri</code>.</li>
        <li><code>WebApplication.CreateBuilder(args)</code>: configure <code>builder.Services</code>,
        <code>builder.Configuration</code>, then <code>builder.Build()</code> returns the immutable app.</li>
        <li><code>ImmutableArray.CreateBuilder&lt;T&gt;()</code>, <code>HostBuilder</code>, EF Core's <code>ModelBuilder</code>.</li>
      </ul>

      <h3>Do you even need one? Object initializers, <code>required</code>, records</h3>
      <p>Modern C# solved the "many optional parameters" half of the problem:</p>
      <pre><code>public record Email
{
  public required string To { get; init; }      // compiler forces you to set it
  public required string Subject { get; init; }
  public string? Cc { get; init; }
}

var mail = new Email { To = "ana@example.com", Subject = "Hi" };   // readable, immutable</code></pre>
      <p>Use initializers + <code>required</code> when the object is a plain bag of values. Reach for a builder when:</p>
      <ul>
        <li>validation spans several fields (Build() can check them together),</li>
        <li>construction has steps or repetition (<code>.Header()</code> many times, <code>Append</code> in a loop),</li>
        <li>you want a fluent, discoverable API or several standard recipes (director),</li>
        <li>the product must not exist in a half-configured state.</li>
      </ul>
      <div class="warn">A builder that just mirrors every property with a <code>WithX</code> method and has no validation
      is boilerplate. An object initializer does the same in one line.</div>
    `,
    examples: [
      {
        title: 'C#: fluent HTTP request builder + StringBuilder + UriBuilder',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Text;

var request = new HttpRequestBuilder()
  .Post("https://api.example.com/orders")
  .Header("Authorization", "Bearer abc123")
  .Header("Accept", "application/json")
  .JsonBody("""{ "sku": "BOOK-1", "qty": 2 }""")
  .Timeout(TimeSpan.FromSeconds(5))
  .Build();

Console.WriteLine(request);

// Build() validates rules that span several steps
TryBuild(new HttpRequestBuilder().Get("https://api.example.com").JsonBody("{}"));
TryBuild(new HttpRequestBuilder().Header("Accept", "text/plain"));

// Builders you already use
var sb = new StringBuilder();
sb.Append("Order ").Append(42).Append(" shipped");
Console.WriteLine(sb.ToString());

var uri = new UriBuilder("https", "api.example.com") { Path = "orders", Query = "page=2" };
Console.WriteLine(uri.Uri);

static void TryBuild(HttpRequestBuilder builder)
{
  try
  {
    builder.Build();
  }
  catch (InvalidOperationException ex)
  {
    Console.WriteLine($"Build failed: {ex.Message}");
  }
}

// The product: immutable once built
record HttpRequestSpec(
  string Method, string Url, IReadOnlyDictionary<string, string> Headers,
  string? Body, TimeSpan Timeout)
{
  public override string ToString()
  {
    var lines = new List<string> { $"{Method} {Url}" };
    lines.AddRange(Headers.Select(h => $"  {h.Key}: {h.Value}"));
    lines.Add($"  (timeout {Timeout.TotalSeconds}s)");
    if (Body is not null)
      lines.Add($"  {Body}");
    return string.Join(Environment.NewLine, lines);
  }
}

class HttpRequestBuilder
{
  private string _method = "GET";
  private string? _url;
  private string? _body;
  private TimeSpan _timeout = TimeSpan.FromSeconds(30);
  private readonly Dictionary<string, string> _headers = [];

  public HttpRequestBuilder Get(string url) => Set(() => (_method, _url) = ("GET", url));
  public HttpRequestBuilder Post(string url) => Set(() => (_method, _url) = ("POST", url));
  public HttpRequestBuilder Header(string name, string value) => Set(() => _headers[name] = value);
  public HttpRequestBuilder Timeout(TimeSpan timeout) => Set(() => _timeout = timeout);

  public HttpRequestBuilder JsonBody(string json)
  {
    _body = json;
    _headers["Content-Type"] = "application/json";
    return this;
  }

  public HttpRequestSpec Build()
  {
    if (_url is null)
      throw new InvalidOperationException("URL is required");
    if (_method == "GET" && _body is not null)
      throw new InvalidOperationException("GET requests can't have a body");

    return new HttpRequestSpec(_method, _url, new Dictionary<string, string>(_headers), _body, _timeout);
  }

  private HttpRequestBuilder Set(Action change)
  {
    change();
    return this; // returning the builder is what makes the API fluent
  }
}`,
        output: `POST https://api.example.com/orders
  Authorization: Bearer abc123
  Accept: application/json
  Content-Type: application/json
  (timeout 5s)
  { "sku": "BOOK-1", "qty": 2 }
Build failed: GET requests can't have a body
Build failed: URL is required
Order 42 shipped
https://api.example.com/orders?page=2`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li>Every step method returns <code>this</code> (via the small <code>Set</code> helper), so calls chain:
              <code>.Post(...).Header(...).JsonBody(...)</code>.</li>
              <li><code>JsonBody</code> does <em>two</em> things: stores the body and adds <code>Content-Type</code>. That's
              why the output shows a third header nobody wrote explicitly. Builders can encode such conventions.</li>
              <li><code>Build()</code> checks rules that involve several steps (method + body), then copies the headers into a
              new dictionary so later builder calls can't mutate the finished request.</li>
              <li>The second <code>TryBuild</code> never set a URL, so it fails with <code>URL is required</code>. The product
              can't exist in an invalid state.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Widget: build a request step by step',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .steps button { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  .pane { flex: 1 1 250px; }
  .pane h5 { margin: 0 0 4px; font-size: 12.5px; color: #555; }
  pre { margin: 0; background: #f6f7fb; border: 1px solid #dde1ea; border-radius: 8px; padding: 8px; font-size: 12px; white-space: pre-wrap; min-height: 110px; }
  .res { margin-top: 8px; border-radius: 8px; padding: 8px; font-family: ui-monospace, Menlo, monospace; font-size: 12px; white-space: pre-wrap; min-height: 20px; background: #f4f6fa; }
  .res.ok { background: #e6f6ea; color: #17733a; } .res.bad { background: #fdecec; color: #a11; }
  .build { background: #3858e9; color: #fff; border-color: #3858e9; }
</style>
<div class="top">Click steps in any order to configure the builder, then click <b>Build()</b>. Try to build something invalid.</div>
<div class="steps" id="steps"></div>
<div class="row">
  <div class="pane"><h5>Your fluent chain</h5><pre id="chain"></pre></div>
  <div class="pane"><h5>Builder state (mutable, private fields)</h5><pre id="state"></pre></div>
</div>
<div class="res" id="res">Not built yet.</div>
<script>
var URL = 'https://api.example.com/orders';
var B;
var STEPS = [
  ['.Get(url)', function () { B.method = 'GET'; B.url = URL; }],
  ['.Post(url)', function () { B.method = 'POST'; B.url = URL; }],
  ['.Header("Authorization", "Bearer abc123")', function () { B.headers.Authorization = 'Bearer abc123'; }],
  ['.Header("Accept", "application/json")', function () { B.headers.Accept = 'application/json'; }],
  ['.JsonBody(json)', function () { B.body = '{ "sku": "BOOK-1", "qty": 2 }'; B.headers['Content-Type'] = 'application/json'; }],
  ['.Timeout(5s)', function () { B.timeout = 5; }]
];
function el(id) { return document.getElementById(id); }
function reset() {
  B = { method: 'GET', url: null, headers: {}, body: null, timeout: 30, calls: [] };
  el('res').className = 'res'; el('res').textContent = 'Not built yet.';
  render();
}
function render() {
  el('chain').textContent = 'var request = new HttpRequestBuilder()' + B.calls.map(function (c) { return '\\n  ' + c; }).join('');
  var h = Object.keys(B.headers).map(function (k) { return '    [' + k + '] = ' + B.headers[k]; }).join('\\n');
  el('state').textContent = '_method  = "' + B.method + '"\\n_url     = ' + (B.url ? '"' + B.url + '"' : 'null') +
    '\\n_body    = ' + (B.body ? B.body : 'null') + '\\n_timeout = ' + B.timeout + 's\\n_headers = {' + (h ? '\\n' + h + '\\n  ' : ' ') + '}';
}
var st = el('steps');
STEPS.forEach(function (s) {
  var b = document.createElement('button'); b.textContent = s[0];
  b.onclick = function () { s[1](); B.calls.push(s[0]); render(); console.log('builder' + s[0]); };
  st.appendChild(b);
});
var bb = document.createElement('button'); bb.textContent = '.Build()'; bb.className = 'build';
bb.onclick = function () {
  var r = el('res');
  var err = null;
  if (!B.url) err = 'URL is required';
  else if (B.method === 'GET' && B.body) err = "GET requests can't have a body";
  if (err) {
    r.className = 'res bad'; r.textContent = 'Build failed: ' + err + '\\n(InvalidOperationException, no HttpRequestSpec was created)';
    console.log('Build failed: ' + err);
    return;
  }
  var lines = [B.method + ' ' + B.url];
  Object.keys(B.headers).forEach(function (k) { lines.push('  ' + k + ': ' + B.headers[k]); });
  lines.push('  (timeout ' + B.timeout + 's)');
  if (B.body) lines.push('  ' + B.body);
  r.className = 'res ok'; r.textContent = 'HttpRequestSpec (immutable):\\n' + lines.join('\\n');
  console.log(lines.join('\\n'));
};
var rb = document.createElement('button'); rb.textContent = 'Reset builder'; rb.onclick = reset;
st.appendChild(bb); st.appendChild(rb);
reset();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>.Build()</strong> straight away: <code>Build failed: URL is required</code>.</li>
              <li>Click <strong>.Get(url)</strong>, <strong>.JsonBody(json)</strong>, <strong>.Build()</strong>: <code>GET requests
              can't have a body</code>. Neither step was wrong alone; only <code>Build()</code> sees the combination.</li>
              <li>Reset, then <strong>.Post</strong>, both <strong>.Header</strong> buttons, <strong>.JsonBody</strong>,
              <strong>.Timeout(5s)</strong>, <strong>.Build()</strong>: the green result is exactly the first block the C#
              program prints. Notice <code>Content-Type</code> appeared in the state when you clicked <code>.JsonBody</code>.</li>
              <li>Click <strong>.Get</strong> after <strong>.Post</strong>: the last call wins, just like reassigning a field.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What makes a builder API "fluent"?', options: ['It uses async methods', 'Each step method returns the builder itself, so calls can be chained', 'It has no Build() method', 'It is static'], answer: 1, why: 'Returning <code>this</code> lets you write <code>.Post(url).Header(...).Build()</code>.' },
      { q: 'Which rule is best enforced in <code>Build()</code> rather than in a single step?', options: ['URL must not be empty string', '"A GET request can\'t have a body"', 'Header names are strings', 'Timeout is a TimeSpan'], answer: 1, why: 'It involves two settings (method and body) that can be set in any order. Only Build() sees the final combination.' },
      { q: 'A <code>record Email</code> with three <code>required init</code> properties and no cross-field rules. Builder or object initializer?', options: ['Builder, always', 'Object initializer: <code>required</code> + <code>init</code> already give readable, immutable, complete construction', 'Singleton', 'Prototype'], answer: 1, why: 'Modern C# covers this case without extra classes. Builders pay off with validation, steps or recipes.' },
      { q: 'Which is NOT an example of Builder in .NET?', options: ['<code>StringBuilder</code>', '<code>UriBuilder</code>', '<code>WebApplication.CreateBuilder(args)</code>', '<code>EqualityComparer&lt;T&gt;.Default</code>'], answer: 3, why: '<code>EqualityComparer&lt;T&gt;.Default</code> is a cached shared instance (singleton-ish), not step-by-step construction.' },
      { q: 'What is a Director in the Builder pattern?', options: ['The finished product', 'Code that drives a builder through a standard sequence of steps (a recipe)', 'A thread', 'The base class of all builders'], answer: 1, why: 'E.g. a <code>JsonApiCall(url)</code> helper that always adds Accept + Authorization. Optional; in C# often an extension method.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>new Pizza("large", true, false, true, "thin")</code>: nobody can read those booleans. Write a fluent
      <code>PizzaBuilder</code> with step methods that <code>return this</code> (e.g. <code>Size</code>, <code>Crust</code>,
      <code>AddTopping</code>) and a <code>Pizza Build()</code> that <strong>throws</strong> if no size was chosen. Edit the C#
      in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class PizzaBuilder { private string? _size; private string _crust = "classic"; private readonly List<string> _toppings = []; public PizzaBuilder Size(string s) { _size = s; return this; } ... public Pizza Build() { if (_size is null) throw new InvalidOperationException("Size is required"); return new Pizza(_size, _crust, [.. _toppings]); } }',
      starter: `var pizza = new Pizza("large", true, false, true, "thin"); // what do these mean?
Console.WriteLine(pizza);

class Pizza(string size, bool cheese, bool pepperoni, bool mushrooms, string crust)
{
  public override string ToString() =>
    $"{size} {crust} pizza: cheese={cheese}, pepperoni={pepperoni}, mushrooms={mushrooms}";
}`,
      solution: `var pizza = new PizzaBuilder()
  .Size("large")
  .Crust("thin")
  .AddTopping("cheese")
  .AddTopping("mushrooms")
  .Build();

Console.WriteLine(pizza);

try
{
  new PizzaBuilder().AddTopping("cheese").Build();
}
catch (InvalidOperationException ex)
{
  Console.WriteLine($"Build failed: {ex.Message}");
}

record Pizza(string Size, string Crust, List<string> Toppings)
{
  public override string ToString() =>
    $"{Size} {Crust} pizza with {string.Join(", ", Toppings)}";
}

class PizzaBuilder
{
  private string? _size;
  private string _crust = "classic";
  private readonly List<string> _toppings = [];

  public PizzaBuilder Size(string size)
  {
    _size = size;
    return this;
  }

  public PizzaBuilder Crust(string crust)
  {
    _crust = crust;
    return this;
  }

  public PizzaBuilder AddTopping(string topping)
  {
    _toppings.Add(topping);
    return this;
  }

  public Pizza Build()
  {
    if (_size is null)
      throw new InvalidOperationException("Size is required");

    return new Pizza(_size, _crust, [.. _toppings]);
  }
}`,
      checks: [
        { label: 'Declares class PizzaBuilder', re: /class\s+PizzaBuilder\b/ },
        { label: 'Has a fluent step method returning PizzaBuilder', re: /public\s+PizzaBuilder\s+\w+\s*\(/ },
        { label: 'Step methods return this', re: /return\s+this\s*;/ },
        { label: 'Has Pizza Build()', re: /Pizza\s+Build\s*\(\s*\)/ },
        { label: 'Build() can throw on invalid input', re: /throw\s+new\s+\w*Exception\s*\(/ },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── prototype
  {
    id: 'prototype',
    section: 'Creational patterns',
    title: 'Prototype',
    explain: `
      <p><strong>Intent:</strong> create new objects by <em>copying</em> an existing, pre-configured object (the prototype)
      instead of building them from scratch.</p>

      <h3>The problem</h3>
      <p>A document editor has templates: "Monthly report" with a title, standard sections, styles. A game spawns 200
      goblins that share stats and equipment. Building each from scratch repeats a lot of setup (maybe loaded from disk or
      a database), and the code creating the copy might not even know the object's concrete class.</p>

      <h3>The solution</h3>
      <pre><code>abstract class Shape { public abstract Shape Clone(); }   // Prototype

var template = LoadReportTemplate();     // expensive, done once
var march = template.Clone();            // cheap copy, then customise
march.Title = "March report";</code></pre>
      <p>Participants: the <strong>Prototype</strong> (declares <code>Clone()</code>), <strong>ConcretePrototypes</strong>
      (implement it), and the <strong>Client</strong> that asks an object to copy itself. Often there's a
      <strong>registry</strong> of named prototypes (<code>Dictionary&lt;string, Document&gt;</code>).</p>

      <h3>The hard part: shallow vs deep copy</h3>
      <ul>
        <li><strong>Shallow copy</strong>: copies each field's value. For value types and immutable things (<code>int</code>,
        <code>string</code>, <code>DateTime</code>) that's a real copy. For a <strong>reference</strong> to a mutable object
        (a <code>List&lt;T&gt;</code>, an array, another class), only the <em>reference</em> is copied: both objects
        now point to the same list.</li>
        <li><strong>Deep copy</strong>: also copies the objects those references point to, so the clone shares nothing
        mutable with the original.</li>
      </ul>
      <p>In C#:</p>
      <ul>
        <li><code>object.MemberwiseClone()</code> (protected) makes a <strong>shallow</strong> copy.</li>
        <li><code>ICloneable.Clone()</code> exists but doesn't say whether it's shallow or deep, which is why Microsoft's
        guidelines recommend <em>not</em> implementing it in public APIs. Name your methods
        <code>ShallowCopy()</code>/<code>DeepCopy()</code> instead.</li>
        <li>A <code>record</code>'s <code>with</code> expression is a built-in prototype: <code>inv with { Number = "2" }</code>.
        It is <strong>also shallow</strong>.</li>
      </ul>
      <div class="warn">The classic bug: clone a template, add an item to the clone's list, and the item appears in the
      template and in every other clone. The program and widget below show exactly that.</div>

      <h3>When to use / when not</h3>
      <ul>
        <li>✓ Creating an object is expensive (parsing, I/O) and many similar copies are needed.</li>
        <li>✓ You need copies of objects whose concrete type you don't know (call <code>Clone()</code> through the base type).</li>
        <li>✓ Immutable records + <code>with</code> for "same but different" values: safe <em>if</em> all members are immutable
        (use <code>ImmutableList&lt;T&gt;</code> / <code>IReadOnlyList&lt;T&gt;</code> instead of <code>List&lt;T&gt;</code>).</li>
        <li>✗ Deep graphs with cycles: deep copying gets complicated. A factory or builder may be clearer.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: shallow vs deep clone, and records with `with`',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Shallow copy: MemberwiseClone copies fields; the List reference is SHARED
var original = new Document("Report", ["Intro", "Results"]);
var shallow = original.ShallowCopy();
shallow.Title = "Report (copy)";
shallow.Sections.Add("Appendix");

Console.WriteLine($"original: {original}");
Console.WriteLine($"shallow:  {shallow}");
Console.WriteLine($"same list? {ReferenceEquals(original.Sections, shallow.Sections)}");

// Deep copy: clone the list too
var deep = original.DeepCopy();
deep.Sections.Add("Draft notes");

Console.WriteLine($"original: {original}");
Console.WriteLine($"deep:     {deep}");
Console.WriteLine($"same list? {ReferenceEquals(original.Sections, deep.Sections)}");

// Records: 'with' is ALSO a shallow copy
var inv1 = new Invoice("INV-1", ["Book"]);
var inv2 = inv1 with { Number = "INV-2" };
inv2.Lines.Add("Pen");

Console.WriteLine($"{inv1.Number} lines: {string.Join(", ", inv1.Lines)}");
Console.WriteLine($"{inv2.Number} lines: {string.Join(", ", inv2.Lines)}");

class Document(string title, List<string> sections)
{
  public string Title { get; set; } = title;
  public List<string> Sections { get; private set; } = sections;

  public Document ShallowCopy() => (Document)MemberwiseClone();

  public Document DeepCopy()
  {
    var copy = (Document)MemberwiseClone();
    copy.Sections = [.. Sections]; // new list; strings are immutable, so sharing them is fine
    return copy;
  }

  public override string ToString() => $"{Title} [{string.Join(", ", Sections)}]";
}

record Invoice(string Number, List<string> Lines);`,
        output: `original: Report [Intro, Results, Appendix]
shallow:  Report (copy) [Intro, Results, Appendix]
same list? True
original: Report [Intro, Results, Appendix]
deep:     Report [Intro, Results, Appendix, Draft notes]
same list? False
INV-1 lines: Book, Pen
INV-2 lines: Book, Pen`,
        explain: `
          <details>
            <summary>The problem: what <code>MemberwiseClone</code> really copies</summary>
            <p><code>MemberwiseClone</code> allocates a new object and copies every <em>field</em> bit-for-bit. A
            <code>Document</code> has two fields (the auto-property backing fields): a reference to a string and a
            reference to a list. So the clone gets <em>copies of the references</em>, not copies of the list:</p>
            <table>
              <tr><th>After line</th><th><code>original</code> (Doc@1)</th><th><code>shallow</code> (Doc@2)</th><th>List@A contents</th></tr>
              <tr><td><code>new Document(...)</code></td><td>Title → "Report", Sections → <strong>List@A</strong></td><td></td><td>Intro, Results</td></tr>
              <tr><td><code>ShallowCopy()</code></td><td>Title → "Report", Sections → <strong>List@A</strong></td><td>Title → "Report", Sections → <strong>List@A</strong></td><td>Intro, Results</td></tr>
              <tr><td><code>shallow.Title = "Report (copy)"</code></td><td>Title → "Report"</td><td>Title → <strong>"Report (copy)"</strong></td><td>Intro, Results</td></tr>
              <tr><td><code>shallow.Sections.Add("Appendix")</code></td><td>Sections → List@A</td><td>Sections → List@A</td><td>Intro, Results, <strong>Appendix</strong></td></tr>
            </table>
            <p>Changing the <code>Title</code> only affected the clone, because that line <em>re-points</em> Doc@2's field at a
            new string. But <code>Sections.Add</code> <em>mutates</em> the one shared list, so the original prints
            <code>Report [Intro, Results, Appendix]</code> too, and <code>same list? True</code>.</p>
          </details>
          <details>
            <summary>The fix: copy the mutable parts yourself (<code>DeepCopy</code>)</summary>
            <pre><code>public Document DeepCopy()
{
  var copy = (Document)MemberwiseClone();  // ① shallow: copies Title + list reference
  copy.Sections = [.. Sections];           // ② replace the shared reference with a NEW list
  return copy;                             // ③ strings inside are shared, but they're immutable
}</code></pre>
            <ol>
              <li><strong>①</strong> Start from a shallow copy: all value-ish fields are done.</li>
              <li><strong>②</strong> The collection expression with a spread <code>[.. Sections]</code> builds a new
              <code>List&lt;string&gt;</code> with the same items (same as <code>new List&lt;string&gt;(Sections)</code>).</li>
              <li><strong>③</strong> Sharing the <em>strings</em> is safe because nobody can mutate a string. If the list held
              mutable objects (e.g. <code>Section</code> classes), you'd have to clone each item too.</li>
            </ol>
            <table>
              <tr><th>After line</th><th><code>original</code> (Doc@1)</th><th><code>deep</code> (Doc@3)</th><th>Lists</th></tr>
              <tr><td><code>DeepCopy()</code></td><td>Sections → List@A</td><td>Sections → <strong>List@B</strong></td><td>A: Intro, Results, Appendix<br>B: Intro, Results, Appendix</td></tr>
              <tr><td><code>deep.Sections.Add("Draft notes")</code></td><td>Sections → List@A</td><td>Sections → List@B</td><td>A: unchanged<br>B: …, <strong>Draft notes</strong></td></tr>
            </table>
            <p>Note the original already contained "Appendix" from the shallow-copy bug, so the deep copy starts with it.
            Afterwards only <code>deep</code> has "Draft notes": <code>same list? False</code>.</p>
          </details>
          <details>
            <summary>Records and <code>with</code>: shallow too</summary>
            <p><code>inv1 with { Number = "INV-2" }</code> calls the record's compiler-generated copy constructor, which copies
            every field (shallow), then sets <code>Number</code>. <code>Lines</code> still points to the same
            <code>List&lt;string&gt;</code>, so after <code>inv2.Lines.Add("Pen")</code> both print <code>Book, Pen</code>.</p>
            <div class="tip">Make records safe for <code>with</code> by using immutable members:
            <code>record Invoice(string Number, ImmutableList&lt;string&gt; Lines)</code>. Then "adding" returns a new list
            (<code>inv2 = inv2 with { Lines = inv2.Lines.Add("Pen") }</code>) and sharing the old one is harmless.</div>
          </details>
          <details>
            <summary>How the widget lets you compare</summary>
            <p>The widget draws the same object graph. Click <strong>Shallow clone</strong> and watch both arrows go to one
            list box; click <strong>clone.Sections.Add</strong> and both objects light up. Reset, use <strong>Deep clone</strong>
            instead, and the clone gets its own list box. <strong>record with</strong> behaves like Shallow.</p>
          </details>
        `,
      },
      {
        title: 'Widget: object graph after shallow / deep clone',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  svg { width: 100%; max-width: 640px; height: 250px; display: block; }
  .ctl { display: flex; flex-wrap: wrap; gap: 2px; }
  .read { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; margin: 4px 0; }
  .read b.t { color: #a11; } .read b.f { color: #17733a; }
  .log { font-family: ui-monospace, Menlo, monospace; font-size: 12px; background: #1f2330; color: #d7f5d0; border-radius: 8px; padding: 6px 8px; height: 60px; overflow: auto; }
</style>
<div class="top">1) Make a clone. 2) Mutate the clone. Watch which list the arrows point to, and whether the original changes.</div>
<div class="ctl">
  <button id="sh">Shallow clone (MemberwiseClone)</button>
  <button id="dp">Deep clone</button>
  <button id="rw">record with { Title = ... }</button>
</div>
<div class="ctl">
  <button id="add">clone.Sections.Add("Appendix")</button>
  <button id="ren">clone.Title = "Copy"</button>
  <button id="oadd">original.Sections.Add("Summary")</button>
  <button id="rs">Reset</button>
</div>
<svg viewBox="0 0 640 250" id="svg"></svg>
<div class="read" id="read"></div>
<div class="log" id="log"></div>
<script>
var S, flash = {};
function el(id) { return document.getElementById(id); }
function log(t) { var d = document.createElement('div'); d.textContent = t; el('log').appendChild(d); el('log').scrollTop = 1e6; console.log(t); }
function reset() {
  S = { lists: { A: ['Intro', 'Results'] }, orig: { title: 'Report', list: 'A' }, clone: null, kind: '', nextList: 'B' };
  flash = {};
  el('log').innerHTML = '';
  draw();
}
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
function objBox(x, y, name, o, hl) {
  var s = '<rect x="' + x + '" y="' + y + '" width="200" height="78" rx="8" fill="' + (hl ? '#fff4c2' : '#eef2ff') + '" stroke="#3858e9" stroke-width="' + (hl ? 3 : 1.5) + '"/>';
  s += '<text x="' + (x + 10) + '" y="' + (y + 18) + '" font-size="13" font-weight="700">' + esc(name) + '</text>';
  s += '<text x="' + (x + 10) + '" y="' + (y + 40) + '" font-size="12">Title = "' + esc(o.title) + '"</text>';
  s += '<text x="' + (x + 10) + '" y="' + (y + 62) + '" font-size="12">Sections = \\u2192 List@' + o.list + '</text>';
  return s;
}
function draw() {
  var ids = Object.keys(S.lists);
  var ly = {};
  ids.forEach(function (id, i) { ly[id] = ids.length === 1 ? 85 : 20 + i * 130; });
  var s = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#444"/></marker></defs>';
  var oh = flash.orig, ch = flash.clone;
  s += objBox(10, 15, 'original (Doc@1)', S.orig, oh);
  if (S.clone) s += objBox(10, 150, 'clone (Doc@2)' + (S.kind ? ' \\u2014 ' + S.kind : ''), S.clone, ch);
  ids.forEach(function (id) {
    var items = S.lists[id], y = ly[id], h = 30 + items.length * 18;
    var hl = flash['L' + id];
    s += '<rect x="400" y="' + y + '" width="220" height="' + h + '" rx="8" fill="' + (hl ? '#fde3cf' : '#f2fbf4') + '" stroke="#27ae60" stroke-width="' + (hl ? 3 : 1.5) + '"/>';
    s += '<text x="410" y="' + (y + 18) + '" font-size="12.5" font-weight="700">List@' + id + ' (List&lt;string&gt;)</text>';
    items.forEach(function (it, i) { s += '<text x="420" y="' + (y + 38 + i * 18) + '" font-size="12">[' + i + '] "' + esc(it) + '"</text>'; });
  });
  var arrow = function (fy, id, color) {
    var ty = ly[id] + 20;
    s += '<path d="M210,' + fy + ' C300,' + fy + ' 310,' + ty + ' 398,' + ty + '" fill="none" stroke="' + color + '" stroke-width="2" marker-end="url(#ar)"/>';
  };
  arrow(72, S.orig.list, '#3858e9');
  if (S.clone) arrow(207, S.clone.list, '#d35400');
  el('svg').innerHTML = s;
  var r = el('read');
  if (S.clone) {
    var same = S.orig.list === S.clone.list;
    r.innerHTML = 'ReferenceEquals(original.Sections, clone.Sections) = <b class="' + (same ? 't' : 'f') + '">' + (same ? 'True' : 'False') + '</b>' +
      '<br>original: ' + esc(S.orig.title) + ' [' + esc(S.lists[S.orig.list].join(', ')) + ']' +
      '<br>clone:    ' + esc(S.clone.title) + ' [' + esc(S.lists[S.clone.list].join(', ')) + ']';
  } else r.textContent = 'No clone yet. original: ' + S.orig.title + ' [' + S.lists[S.orig.list].join(', ') + ']';
  ['add', 'ren'].forEach(function (b) { el(b).disabled = !S.clone; });
  ['sh', 'dp', 'rw'].forEach(function (b) { el(b).disabled = !!S.clone; });
}
function pulse(keys) { flash = {}; keys.forEach(function (k) { flash[k] = true; }); draw(); setTimeout(function () { flash = {}; draw(); }, 700); }
el('sh').onclick = function () { S.clone = { title: S.orig.title, list: S.orig.list }; S.kind = 'shallow'; log('var clone = original.ShallowCopy();  // copies the reference to List@' + S.orig.list); pulse(['clone']); };
el('rw').onclick = function () { S.clone = { title: 'Report v2', list: S.orig.list }; S.kind = 'record with'; log('var clone = original with { Title = "Report v2" };  // shallow: Sections still -> List@' + S.orig.list); pulse(['clone']); };
el('dp').onclick = function () {
  var id = S.nextList; S.nextList = String.fromCharCode(S.nextList.charCodeAt(0) + 1);
  S.lists[id] = S.lists[S.orig.list].slice();
  S.clone = { title: S.orig.title, list: id }; S.kind = 'deep';
  log('var clone = original.DeepCopy();  // new List@' + id + ' with the same items'); pulse(['clone', 'L' + id]);
};
el('add').onclick = function () {
  S.lists[S.clone.list].push('Appendix');
  var shared = S.clone.list === S.orig.list;
  log('clone.Sections.Add("Appendix")  // mutates List@' + S.clone.list + (shared ? ': the ORIGINAL sees it too!' : ': original unaffected'));
  pulse(shared ? ['clone', 'orig', 'L' + S.clone.list] : ['clone', 'L' + S.clone.list]);
};
el('ren').onclick = function () { S.clone.title = 'Copy'; log('clone.Title = "Copy"  // re-points the clone\\'s field; original keeps "' + S.orig.title + '"'); pulse(['clone']); };
el('oadd').onclick = function () {
  S.lists[S.orig.list].push('Summary');
  var shared = S.clone && S.clone.list === S.orig.list;
  log('original.Sections.Add("Summary")' + (S.clone ? (shared ? '  // clone sees it too' : '  // clone unaffected') : ''));
  pulse(shared ? ['orig', 'clone', 'L' + S.orig.list] : ['orig', 'L' + S.orig.list]);
};
el('rs').onclick = reset;
reset();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li><strong>Shallow clone</strong> → <strong>clone.Sections.Add</strong>. One list box, two arrows; both objects
              flash and the readout shows the original now contains "Appendix" (same as the C# program's first block).</li>
              <li>Then <strong>clone.Title = "Copy"</strong>: only the clone changes. Reassigning a field is not mutating a
              shared object.</li>
              <li><strong>Reset</strong> → <strong>Deep clone</strong> → <strong>clone.Sections.Add</strong>. A second list box
              appears and only it grows. <code>ReferenceEquals</code> = False.</li>
              <li><strong>Reset</strong> → <strong>record with</strong> → add: same as shallow. <code>with</code> doesn't deep-copy.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What does <code>MemberwiseClone()</code> do with a <code>List&lt;string&gt;</code> field?', options: ['Creates a new list with copied items', 'Copies the reference, so original and clone share the same list', 'Sets it to null', 'Throws'], answer: 1, why: 'It\'s a shallow, field-by-field copy. Reference-type fields are copied as references.' },
      { q: 'After <code>var b = a with { Name = "B" };</code> on <code>record R(string Name, List&lt;int&gt; Items)</code>, <code>b.Items.Add(1)</code>…', options: ['only changes b', 'also changes <code>a.Items</code>, because <code>with</code> is a shallow copy', 'doesn\'t compile', 'throws because records are immutable'], answer: 1, why: 'Records are only as immutable as their members. <code>with</code> copies the reference to the same list.' },
      { q: 'After a shallow copy, why does <code>clone.Title = "X"</code> NOT change the original?', options: ['Strings are copied deeply', 'The assignment re-points the clone\'s own field at a new string; the shared string object itself is never mutated', 'Title is static', 'MemberwiseClone skips strings'], answer: 1, why: 'Both fields initially point to the same immutable string. Assigning a new value changes only the clone\'s field.' },
      { q: 'Why do .NET guidelines discourage implementing <code>ICloneable</code> in public APIs?', options: ['It\'s obsolete and doesn\'t compile', 'It doesn\'t specify shallow vs deep, and returns <code>object</code>, so callers can\'t know what they get', 'It\'s slow', 'It only works on structs'], answer: 1, why: 'Prefer explicit, typed methods like <code>DeepCopy()</code> or immutable records.' },
      { q: 'When is Prototype a good fit?', options: ['When each object needs a completely different setup', 'When creating an object is expensive and many similar copies are needed, e.g. templates or spawning game entities', 'To ensure only one instance exists', 'To convert between interfaces'], answer: 1, why: 'Build or load the prototype once, then clone and tweak.' },
    ],
    exercise: window.csExercise({
      task: `<p>Cloning the goblin template with <code>Clone()</code> makes the boss's "Crown" appear in the template's
      inventory too. Add a <code>Character DeepClone()</code> method that gives the copy its own <code>Inventory</code> list,
      and use it for the boss. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'public Character DeepClone() { var copy = (Character)MemberwiseClone(); copy.Inventory = [.. Inventory]; return copy; } and then: var boss = template.DeepClone();',
      starter: `var template = new Character("Goblin", 10, ["Club"]);

var boss = template.Clone();
boss.Name = "Goblin King";
boss.Inventory.Add("Crown");

// Bug: the template now has a Crown too
Console.WriteLine($"{template.Name}: {string.Join(", ", template.Inventory)}");
Console.WriteLine($"{boss.Name}: {string.Join(", ", boss.Inventory)}");

class Character(string name, int hp, List<string> inventory)
{
  public string Name { get; set; } = name;
  public int Hp { get; set; } = hp;
  public List<string> Inventory { get; set; } = inventory;

  public Character Clone() => (Character)MemberwiseClone();
}`,
      solution: `var template = new Character("Goblin", 10, ["Club"]);

var boss = template.DeepClone();
boss.Name = "Goblin King";
boss.Inventory.Add("Crown");

Console.WriteLine($"{template.Name}: {string.Join(", ", template.Inventory)}");
Console.WriteLine($"{boss.Name}: {string.Join(", ", boss.Inventory)}");

class Character(string name, int hp, List<string> inventory)
{
  public string Name { get; set; } = name;
  public int Hp { get; set; } = hp;
  public List<string> Inventory { get; set; } = inventory;

  public Character Clone() => (Character)MemberwiseClone();

  public Character DeepClone()
  {
    var copy = (Character)MemberwiseClone();
    copy.Inventory = [.. Inventory];
    return copy;
  }
}`,
      checks: [
        { label: 'Declares Character DeepClone()', re: /Character\s+DeepClone\s*\(\s*\)/ },
        { label: 'Copy gets a new Inventory list', re: /\.Inventory\s*=\s*(\[|new\b|[\w.]+\.ToList\s*\()/ },
        { label: 'Boss is created with DeepClone()', re: /\.DeepClone\s*\(\s*\)/ },
      ],
    }),
  },
);
