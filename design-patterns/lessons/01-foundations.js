window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── what-are-patterns
  {
    id: 'what-are-patterns',
    section: 'Foundations',
    title: 'What design patterns are (and aren\'t)',
    explain: `
      <p>A <strong>design pattern</strong> is a named, reusable solution to a design problem that keeps coming back.
      It is not a library you install or code you copy. It is a <em>shape</em> of classes and objects that experienced
      developers kept reinventing, written down so the rest of us can recognise it and talk about it.</p>

      <h3>Where they come from</h3>
      <p>In 1994 Erich Gamma, Richard Helm, Ralph Johnson and John Vlissides (the "Gang of Four", GoF) published
      <em>Design Patterns: Elements of Reusable Object-Oriented Software</em>. It catalogued <strong>23 patterns</strong>
      with examples in C++ and Smalltalk. C# didn't exist yet, but the ideas carried over almost unchanged, and .NET
      itself is full of them.</p>

      <h3>The four parts of every pattern</h3>
      <table>
        <tr><th>Part</th><th>Question it answers</th><th>Example (Observer)</th></tr>
        <tr><td><strong>Intent</strong></td><td>What does it do, in one sentence?</td>
          <td>When one object changes, notify everything that depends on it.</td></tr>
        <tr><td><strong>Problem</strong></td><td>When would I need it?</td>
          <td>A button must tell the logger, the toolbar and the analytics module it was clicked, without knowing
          any of them.</td></tr>
        <tr><td><strong>Solution</strong></td><td>Which classes, which relationships?</td>
          <td>The subject keeps a list of subscribers and calls each one. In C#: an <code>event</code>.</td></tr>
        <tr><td><strong>Consequences</strong></td><td>What does it cost?</td>
          <td>Loose coupling, but the order of notifications is easy to forget and forgotten unsubscribes leak memory.</td></tr>
      </table>

      <h3>Three families</h3>
      <ul>
        <li><strong>Creational</strong> (5): <em>how objects get created</em>. Singleton, Factory Method, Abstract
        Factory, Builder, Prototype.</li>
        <li><strong>Structural</strong> (7): <em>how objects are composed into bigger structures</em>. Adapter,
        Bridge, Composite, Decorator, Facade, Flyweight, Proxy.</li>
        <li><strong>Behavioral</strong> (11): <em>how objects talk and share responsibility</em>. Chain of
        Responsibility, Command, Interpreter, Iterator, Mediator, Memento, Observer, State, Strategy, Template Method,
        Visitor.</li>
      </ul>
      <p>Modern .NET adds a few that the GoF book doesn't list as such but you will meet every day: Dependency
      Injection, Repository, Unit of Work, the Options pattern, Null Object, middleware pipelines.</p>

      <h3>Patterns are vocabulary</h3>
      <p>The biggest win is not the code, it's the words. "Wrap the stream in a <strong>decorator</strong> that
      counts bytes" or "make the payment providers <strong>strategies</strong>" carries a whole design in one
      sentence. Code reviews get faster, and you start seeing the same shapes in the framework you already use:</p>
      <pre><code>foreach (var order in orders) { }          // Iterator (IEnumerable&lt;T&gt;)
button.Click += OnClick;                    // Observer (event)
var sb = new StringBuilder().Append("a");   // Builder
using var gz = new GZipStream(file, mode);  // Decorator (wraps a Stream)
services.AddSingleton&lt;IClock, Clock&gt;();     // Singleton lifetime via DI</code></pre>

      <h3>What patterns are not</h3>
      <ul>
        <li><strong>Not a goal.</strong> Nobody gets paid for "using the Visitor pattern". You get paid for code that
        is easy to change. A pattern is only good if it makes <em>this</em> code simpler.</li>
        <li><strong>Not a checklist.</strong> Patterns are recognised after the fact, not sprinkled up front.</li>
        <li><strong>Not frozen.</strong> Some GoF patterns are now a language feature: Iterator is <code>yield return</code>,
        Observer is <code>event</code>, a one-method Strategy is often just a <code>Func&lt;T&gt;</code>.</li>
      </ul>

      <div class="warn"><strong>Over-engineering warning.</strong> The classic beginner mistake after reading about
      patterns is <code>IOrderProcessorStrategyFactoryProvider</code>: five interfaces around code that has exactly one
      implementation and no planned variation. Start with the simple thing. Reach for a pattern when you feel the
      pain it solves: a growing <code>switch</code>, a class that keeps changing for unrelated reasons, a test you
      can't write.</div>

      <div class="tip">How to use this course: each pattern lesson has the problem, a complete C# 14 / .NET 10
      program you can paste into <code>dotnet new console</code>, a live diagram to poke, a quiz and a refactoring
      exercise.</div>
    `,
    examples: [
      {
        title: 'C#: two patterns you already use (Iterator and Observer)',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Collections;

// Iterator: foreach works on anything that implements IEnumerable<T>
var playlist = new Playlist(["Intro", "Verse", "Chorus"]);

foreach (var song in playlist)
  Console.WriteLine($"Playing {song}");

// Roughly what the compiler turns that foreach into
using (var it = playlist.GetEnumerator())
{
  while (it.MoveNext())
    Console.WriteLine($"Manual: {it.Current}");
}

// Observer: an event lets any number of subscribers react
var button = new SaveButton();
button.Clicked += (_, _) => Console.WriteLine("Logger: save clicked");
button.Clicked += (_, _) => Console.WriteLine("Toolbar: show 'Saved!'");
button.Click();

class Playlist(string[] songs) : IEnumerable<string>
{
  public IEnumerator<string> GetEnumerator()
  {
    foreach (var song in songs)
      yield return song;
  }

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}

class SaveButton
{
  public event EventHandler? Clicked;

  public void Click()
  {
    Console.WriteLine("Button: clicked, notifying subscribers...");
    Clicked?.Invoke(this, EventArgs.Empty);
  }
}`,
        output: `Playing Intro
Playing Verse
Playing Chorus
Manual: Intro
Manual: Verse
Manual: Chorus
Button: clicked, notifying subscribers...
Logger: save clicked
Toolbar: show 'Saved!'`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>class Playlist(string[] songs) : IEnumerable&lt;string&gt;   // ① the "aggregate"
  public IEnumerator&lt;string&gt; GetEnumerator()           // ② creates an iterator
    yield return song;                                // ③ compiler builds the iterator class
public event EventHandler? Clicked;                     // ④ the subscriber list
Clicked?.Invoke(this, EventArgs.Empty);                 // ⑤ notify every subscriber</code></pre>
            <ol>
              <li><strong>①</strong> <code>Playlist</code> is the collection. In GoF terms it is the <em>Aggregate</em>.</li>
              <li><strong>②</strong> <code>GetEnumerator()</code> hands out an <em>Iterator</em> object
              (<code>IEnumerator&lt;string&gt;</code>) with <code>MoveNext()</code> and <code>Current</code>.
              The caller never sees the array inside.</li>
              <li><strong>③</strong> <code>yield return</code> makes the compiler generate that iterator class for
              you. That's why the pattern feels invisible in C#.</li>
              <li><strong>④</strong> An <code>event</code> is a list of delegates. <code>+=</code> subscribes.
              <code>SaveButton</code> knows nothing about the logger or the toolbar: that's Observer.</li>
              <li><strong>⑤</strong> Subscribers are called <em>in the order they subscribed</em>, so "Logger" prints
              before "Toolbar".</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <p>Paste the program into a console app and add a third subscriber,
            <code>button.Clicked += (_, _) =&gt; Console.WriteLine("Analytics: +1");</code>. <code>SaveButton</code>
            doesn't change at all. Then replace the <code>Playlist</code> array with a <code>List&lt;string&gt;</code>:
            the <code>foreach</code> loops still work, because they only depend on <code>IEnumerable&lt;string&gt;</code>.</p>
          </details>
        `,
      },
      {
        title: 'Pattern map: the 23 GoF patterns + modern .NET ones',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .filters button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  .grid { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0; }
  .chip { padding: 5px 10px; border-radius: 14px; font-size: 13px; cursor: pointer; border: 2px solid transparent; }
  .chip.sel { border-color: #1f2330; }
  .c { background: #e3edff; } .s { background: #e5f6e8; } .b { background: #fdf0dc; } .m { background: #f1e6fb; }
  .card { border: 1px solid #d5d9e4; border-radius: 10px; padding: 10px 12px; min-height: 96px; background: #fbfcfe; }
  .card h4 { margin: 0 0 4px; } .fam { font-size: 12px; color: #666; }
  .net { margin-top: 6px; font-size: 13px; } .net code { background: #eef0f6; padding: 1px 4px; border-radius: 4px; }
</style>
<div class="top">Filter by family, then click a pattern to see its intent and where .NET already uses it.</div>
<div class="filters" id="filters"></div>
<div class="grid" id="grid"></div>
<div class="card" id="card"><span class="fam">Click a pattern above.</span></div>
<script>
var FAM = { c: 'Creational', s: 'Structural', b: 'Behavioral', m: 'Modern .NET' };
var P = [
  ['Abstract Factory', 'c', 'Create families of related objects without naming their concrete classes.', 'DbProviderFactory: CreateConnection(), CreateCommand(), CreateParameter() for one database vendor'],
  ['Builder', 'c', 'Construct a complex object step by step, then produce it in one go.', 'StringBuilder, UriBuilder, WebApplication.CreateBuilder(args)'],
  ['Factory Method', 'c', 'Let a subclass decide which concrete product to create.', 'IEnumerable<T>.GetEnumerator(): each collection creates its own enumerator; ILoggerProvider.CreateLogger()'],
  ['Prototype', 'c', 'Create new objects by copying an existing one.', 'record with-expressions, object.MemberwiseClone(), ICloneable'],
  ['Singleton', 'c', 'Ensure a class has exactly one instance with a global access point.', 'services.AddSingleton<T>(), EqualityComparer<T>.Default, Array.Empty<T>()'],
  ['Adapter', 's', 'Convert one interface into another that clients expect.', 'StreamReader adapts a byte Stream to a TextReader; Stream.Synchronized'],
  ['Bridge', 's', 'Split an abstraction from its implementation so both can vary.', 'ILogger (abstraction) with many ILoggerProvider back-ends (console, debug, event log)'],
  ['Composite', 's', 'Treat single objects and groups of objects the same way, as a tree.', 'IConfigurationSection trees, UI control trees, System.Linq.Expressions'],
  ['Decorator', 's', 'Wrap an object to add behaviour without changing its class.', 'BufferedStream / GZipStream / CryptoStream wrapping a Stream; DelegatingHandler'],
  ['Facade', 's', 'Give a simple front door to a complicated subsystem.', 'File.ReadAllText hides FileStream + StreamReader + encoding detection'],
  ['Flyweight', 's', 'Share many small identical objects instead of duplicating them.', 'string.Intern, cached Task.CompletedTask, small boxed values cached by the runtime'],
  ['Proxy', 's', 'Stand in for another object to control access to it.', 'EF Core lazy-loading proxies, DispatchProxy, generated gRPC clients'],
  ['Chain of Responsibility', 'b', 'Pass a request along a chain of handlers until one handles it.', 'ASP.NET Core middleware, HttpMessageHandler / DelegatingHandler chain'],
  ['Command', 'b', 'Turn a request into an object you can queue, log or undo.', 'ICommand in WPF / MAUI, request objects in MediatR-style libraries'],
  ['Interpreter', 'b', 'Represent a small language as a tree of objects and evaluate it.', 'Regex, LINQ expression trees translated to SQL by EF Core'],
  ['Iterator', 'b', 'Walk a collection without exposing how it is stored.', 'IEnumerable<T> / IEnumerator<T>, foreach, yield return'],
  ['Mediator', 'b', 'Let objects talk through one central object instead of to each other.', 'MediatR library (IMediator.Send), chat-room / dialog coordinators'],
  ['Memento', 'b', 'Capture an object\\'s state so it can be restored later (undo).', 'Immutable records as snapshots, serialised state for undo stacks'],
  ['Observer', 'b', 'Notify all dependents automatically when something changes.', 'event / EventHandler, IObservable<T>, INotifyPropertyChanged'],
  ['State', 'b', 'Let an object change behaviour when its internal state changes.', 'Order / connection workflows; compiler-generated async state machines are a cousin'],
  ['Strategy', 'b', 'Make a family of algorithms interchangeable.', 'IComparer<T> passed to List.Sort, Func<T> delegates, IEqualityComparer<T>'],
  ['Template Method', 'b', 'Fix the skeleton of an algorithm; let subclasses fill in steps.', 'BackgroundService.ExecuteAsync, Stream (CopyTo calls your Read)'],
  ['Visitor', 'b', 'Add operations to a class hierarchy without changing it.', 'ExpressionVisitor, Roslyn CSharpSyntaxWalker'],
  ['Dependency Injection', 'm', 'Pass dependencies in from outside instead of creating them inside.', 'IServiceCollection / IServiceProvider, constructor injection in ASP.NET Core'],
  ['Repository', 'm', 'Hide data access behind a collection-like interface.', 'EF Core DbSet<T> is repository-like; custom IOrderRepository'],
  ['Unit of Work', 'm', 'Track changes and commit them together as one transaction.', 'EF Core DbContext.SaveChanges()'],
  ['Options', 'm', 'Bind configuration to strongly typed classes.', 'IOptions<T>, IOptionsMonitor<T>'],
  ['Null Object', 'm', 'Use a do-nothing implementation instead of null checks.', 'NullLogger.Instance, Stream.Null, TextWriter.Null'],
  ['Middleware pipeline', 'm', 'Compose request handling from small reusable steps.', 'app.Use(...) in ASP.NET Core, HttpClient handler pipeline']
];
var filter = 'all', selected = null;
function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function renderFilters() {
  var f = document.getElementById('filters');
  f.innerHTML = '';
  [['all', 'All (' + P.length + ')'], ['c', 'Creational'], ['s', 'Structural'], ['b', 'Behavioral'], ['m', 'Modern .NET']].forEach(function (x) {
    var b = document.createElement('button');
    b.textContent = x[1];
    if (x[0] === filter) b.className = 'on';
    b.onclick = function () { filter = x[0]; renderFilters(); renderGrid(); console.log('filter: ' + x[1]); };
    f.appendChild(b);
  });
}
function renderGrid() {
  var g = document.getElementById('grid');
  g.innerHTML = '';
  P.filter(function (p) { return filter === 'all' || p[1] === filter; }).forEach(function (p) {
    var d = document.createElement('span');
    d.className = 'chip ' + p[1] + (selected === p[0] ? ' sel' : '');
    d.textContent = p[0];
    d.onclick = function () { selected = p[0]; renderGrid(); showCard(p); };
    g.appendChild(d);
  });
}
function showCard(p) {
  document.getElementById('card').innerHTML =
    '<h4>' + esc(p[0]) + '</h4><div class="fam">' + FAM[p[1]] + (p[1] === 'm' ? '' : ' (GoF 1994)') + '</div>' +
    '<div><strong>Intent:</strong> ' + esc(p[2]) + '</div>' +
    '<div class="net"><strong>You already use it in .NET as:</strong> <code>' + esc(p[3]) + '</code></div>';
  console.log(p[0] + ' -> ' + p[3]);
}
renderFilters();
renderGrid();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>Creational</strong>: only 5 chips remain. Click <strong>Behavioral</strong>: 11. Together with
              7 structural ones that's the 23 GoF patterns.</li>
              <li>Click <strong>Iterator</strong> and <strong>Observer</strong>: these are the two in the C# program above.</li>
              <li>Click <strong>Decorator</strong>, then <strong>Chain of Responsibility</strong>: both wrap one object
              around another, but a decorator always passes the call on, while a chain member may stop it.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What are the four parts the GoF use to describe a pattern?', options: ['Name, class, method, test', 'Intent, problem, solution, consequences', 'Interface, abstract class, subclass, client', 'Create, compose, communicate, cache'], answer: 1, why: 'Every GoF pattern states its intent, the problem it addresses, the solution structure, and the consequences (trade-offs) of using it.' },
      { q: 'A <code>foreach</code> loop over a <code>List&lt;T&gt;</code> is an everyday use of which pattern?', options: ['Composite', 'Visitor', 'Iterator', 'Strategy'], answer: 2, why: '<code>foreach</code> calls <code>GetEnumerator()</code> and then <code>MoveNext()</code>/<code>Current</code> on the returned <code>IEnumerator&lt;T&gt;</code>. That is the Iterator pattern.' },
      { q: 'Which family is the Decorator pattern in?', options: ['Creational', 'Structural', 'Behavioral', 'Modern .NET'], answer: 1, why: 'Decorator is about how objects are <em>composed</em>: one object wraps another with the same interface. That makes it structural.' },
      { q: 'Your class has one implementation and no expected variation. A colleague wants to add an interface, a factory and a strategy "to follow patterns". Best response?', options: ['Agree: more patterns means better design', 'Keep it simple now; introduce the abstraction when a second variant or a testing need actually appears', 'Use a Singleton instead', 'Patterns are only for C++'], answer: 1, why: 'Patterns cost indirection. Without the problem they solve, they are over-engineering. Refactor towards a pattern when the pain shows up.' },
      { q: 'Why is a C# <code>event</code> an example of Observer?', options: ['It runs on a background thread', 'The publisher keeps a list of subscribers and notifies them without knowing their concrete types', 'It creates objects lazily', 'It copies the publisher'], answer: 1, why: 'The publisher (subject) only holds delegates. Any number of observers subscribe with <code>+=</code> and get called when the event is raised.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>Countdown</code> forces callers to call <code>ToArray()</code> first. Make it a proper
      <strong>Iterator</strong>: implement <code>IEnumerable&lt;int&gt;</code> using <code>yield return</code> so that
      <code>foreach (var n in countdown)</code> works directly. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'Add `using System.Collections;`, declare `class Countdown(int from) : IEnumerable<int>`, write `public IEnumerator<int> GetEnumerator()` with a for loop that does `yield return i;`, and the non-generic `IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();`.',
      starter: `var countdown = new Countdown(3);

// TODO: make this work as: foreach (var n in countdown)
foreach (var n in countdown.ToArray())
  Console.WriteLine(n);

Console.WriteLine("Liftoff!");

class Countdown(int from)
{
  public int[] ToArray()
  {
    var result = new List<int>();
    for (var i = from; i >= 1; i--)
      result.Add(i);
    return result.ToArray();
  }
}`,
      solution: `using System.Collections;

var countdown = new Countdown(3);

foreach (var n in countdown)
  Console.WriteLine(n);

Console.WriteLine("Liftoff!");

class Countdown(int from) : IEnumerable<int>
{
  public IEnumerator<int> GetEnumerator()
  {
    for (var i = from; i >= 1; i--)
      yield return i;
  }

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}`,
      checks: [
        { label: 'Countdown implements IEnumerable<int>', re: /class\s+Countdown\b[^{]*:\s*IEnumerable\s*<\s*int\s*>/ },
        { label: 'Has IEnumerator<int> GetEnumerator()', re: /IEnumerator\s*<\s*int\s*>\s+GetEnumerator\s*\(\s*\)/ },
        { label: 'Uses yield return', re: /yield\s+return\b/ },
        { label: 'No ToArray() needed any more', re: /ToArray\s*\(/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── solid
  {
    id: 'solid',
    section: 'Foundations',
    title: 'SOLID in 10 minutes',
    explain: `
      <p>SOLID is five design principles collected by Robert C. Martin around 2000 (the acronym came from Michael
      Feathers). Most patterns in this course are just SOLID applied to a specific problem, so it's worth having
      them in your head first. Each one is a guard against a specific kind of pain <em>when requirements change</em>.</p>

      <h3>S: Single Responsibility Principle</h3>
      <p><em>A class should have one reason to change.</em> "Reason" means one stakeholder or one concern.</p>
      <pre><code>// ✗ tax rules, SQL and email in one class: three reasons to change
class Invoice { decimal Total(); void Save(); void EmailPdf(); }

// ✓ each concern can change on its own
class InvoiceCalculator { decimal Total(Invoice i); }
class InvoiceRepository { void Save(Invoice i); }
class InvoiceMailer     { void Send(Invoice i); }</code></pre>

      <h3>O: Open/Closed Principle</h3>
      <p><em>Open for extension, closed for modification.</em> Adding a feature should mean adding code, not editing
      code that already works.</p>
      <pre><code>// ✗ every new shape edits this switch (and every other switch like it)
double Area(Shape s) =&gt; s.Kind switch { "circle" =&gt; ..., "square" =&gt; ... };

// ✓ a new shape is a new class; nothing existing changes
interface IShape { double Area(); }
record Circle(double R) : IShape { public double Area() =&gt; Math.PI * R * R; }</code></pre>

      <h3>L: Liskov Substitution Principle</h3>
      <p><em>A subtype must be usable anywhere its base type is expected, without surprises.</em></p>
      <pre><code>// ✗ Square : Rectangle. Setting Width also changes Height.
Rectangle r = new Square();
r.Width = 5; r.Height = 4;
Console.WriteLine(r.Area);   // caller expects 20, gets 16

// ✓ don't inherit just because "a square is a rectangle" in maths
record Rect(double W, double H) : IShape { ... }
record Square(double Side) : IShape { ... }</code></pre>

      <h3>I: Interface Segregation Principle</h3>
      <p><em>Clients shouldn't depend on methods they don't use.</em> Prefer several small interfaces.</p>
      <pre><code>// ✗ a cheap printer must "implement" Fax by throwing
interface IMachine { void Print(Doc d); void Scan(Doc d); void Fax(Doc d); }

// ✓ implement only what you can do
interface IPrinter { void Print(Doc d); }
interface IScanner { void Scan(Doc d); }
class CheapPrinter : IPrinter { ... }</code></pre>

      <h3>D: Dependency Inversion Principle</h3>
      <p><em>High-level code should depend on abstractions, not on concrete low-level classes.</em> The
      <code>OrderService</code> (business rule) shouldn't <code>new</code> up a <code>SqlOrderRepository</code> (detail).</p>
      <pre><code>// ✗ hard-wired: can't test without a database
class OrderService { readonly SqlOrderRepository _repo = new(); }

// ✓ depends on an interface; the caller chooses the implementation
class OrderService(IOrderRepository repo) { ... }</code></pre>

      <div class="tip">Rule of thumb: O and D are the two you'll use the most. Together they say
      "put variation behind an interface, and have someone else pass the implementation in". That's the core of
      Strategy, Factory, Decorator, and dependency injection in ASP.NET Core.</div>
      <div class="warn">SOLID principles are guidelines, not laws. Splitting a 20-line class into five
      single-method classes "for SRP" usually makes code harder to read. Apply them where change actually happens.</div>
    `,
    examples: [
      {
        title: 'C#: OCP + DIP with notification senders',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Composition root: the only place that knows the concrete classes
INotificationSender[] senders =
[
  new EmailSender(),
  new SmsSender(),
  new SlackSender("#orders"), // added later: OrderService did not change
];

var service = new OrderService(senders);
service.PlaceOrder(new Order("A-100", "Ana", 3));
service.PlaceOrder(new Order("A-101", "Ben", 1));

record Order(string Id, string Customer, int Items);

// D: OrderService depends on this abstraction, not on SMTP or Slack
interface INotificationSender
{
  void Send(string to, string message);
}

class EmailSender : INotificationSender
{
  public void Send(string to, string message) =>
    Console.WriteLine($"  [email] {to}: {message}");
}

class SmsSender : INotificationSender
{
  public void Send(string to, string message) =>
    Console.WriteLine($"  [sms] {to}: {message}");
}

// O: a new channel is a new class, not an edit to OrderService
class SlackSender(string channel) : INotificationSender
{
  public void Send(string to, string message) =>
    Console.WriteLine($"  [slack {channel}] {to}: {message}");
}

// S: OrderService only places orders; sending is someone else's job
class OrderService(IEnumerable<INotificationSender> senders)
{
  public void PlaceOrder(Order order)
  {
    Console.WriteLine($"Order {order.Id} placed, items: {order.Items}");
    var message = $"order {order.Id} confirmed";

    foreach (var sender in senders)
      sender.Send(order.Customer, message);
  }
}`,
        output: `Order A-100 placed, items: 3
  [email] Ana: order A-100 confirmed
  [sms] Ana: order A-100 confirmed
  [slack #orders] Ana: order A-100 confirmed
Order A-101 placed, items: 1
  [email] Ben: order A-101 confirmed
  [sms] Ben: order A-101 confirmed
  [slack #orders] Ben: order A-101 confirmed`,
        explain: `
          <details>
            <summary>The "before": what this replaces</summary>
            <pre><code>class OrderService
{
  public void PlaceOrder(Order order, string channel)
  {
    // ...
    if (channel == "email") new SmtpClient(...).Send(...);
    else if (channel == "sms") new TwilioClient(...).Send(...);
    // adding Slack = editing this method, retesting order placement
  }
}</code></pre>
            <p>That version breaks O (every channel edits <code>PlaceOrder</code>), D (it creates SMTP and Twilio clients
            itself) and S (it knows about orders <em>and</em> every messaging API).</p>
          </details>
          <details>
            <summary>Which principle is where</summary>
            <ul>
              <li><strong>D</strong>: <code>OrderService</code>'s constructor takes <code>IEnumerable&lt;INotificationSender&gt;</code>.
              It never writes <code>new EmailSender()</code>.</li>
              <li><strong>O</strong>: <code>SlackSender</code> was "added later" by adding one class and one line in the
              array at the top. <code>OrderService</code> is closed for modification.</li>
              <li><strong>L</strong>: every sender can stand in for <code>INotificationSender</code>; the loop treats them all the same.</li>
              <li><strong>I</strong>: the interface has one method, so no sender has to fake methods it doesn't need.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Widget: violate or follow each principle, then change the requirement',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .tabs button.on, .mode button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  .mode button.on.bad { background: #c0392b; border-color: #c0392b; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 8px; }
  pre { background: #f6f7fb; border: 1px solid #dde1ea; border-radius: 8px; padding: 8px; font-size: 12px; margin: 0; flex: 1 1 260px; white-space: pre-wrap; }
  .files { flex: 1 1 220px; font-size: 13px; }
  .f { padding: 4px 8px; border-radius: 6px; margin: 3px 0; background: #f1f3f7; }
  .f.edit { background: #fdecec; color: #a11; } .f.add { background: #e6f6ea; color: #17733a; }
  .res { margin-top: 8px; padding: 8px 10px; border-radius: 8px; font-size: 13px; background: #f4f6fa; min-height: 20px; }
  .res.bad { background: #fdecec; } .res.good { background: #e6f6ea; }
  .req { font-size: 13px; margin-top: 6px; }
</style>
<div class="top">Pick a principle, choose <b>Violating</b> or <b>Following</b>, then click <b>Apply requirement change</b>.</div>
<div class="tabs" id="tabs"></div>
<div class="mode" id="mode"></div>
<div class="req" id="req"></div>
<div class="row"><pre id="code"></pre><div class="files" id="files"></div></div>
<div class="res" id="res">Nothing changed yet.</div>
<script>
var D = {
  S: { name: 'Single Responsibility', req: 'Marketing wants a new invoice email template.',
    bad: { code: 'class Invoice\\n{\\n  decimal Total() { /* tax rules */ }\\n  void Save()     { /* SQL */ }\\n  void EmailPdf() { /* template + SMTP */ }\\n}',
      files: [['Invoice.cs', 'edit']], res: 'You edited Invoice.cs, which also holds tax rules and SQL. Finance and DBA code must be re-tested for an email change.' },
    good: { code: 'class InvoiceCalculator { decimal Total(Invoice i); }\\nclass InvoiceRepository { void Save(Invoice i); }\\nclass InvoiceMailer     { void Send(Invoice i); }',
      files: [['InvoiceCalculator.cs', 'same'], ['InvoiceRepository.cs', 'same'], ['InvoiceMailer.cs', 'edit']], res: 'Only InvoiceMailer.cs changed. Tax and storage code are untouched.' } },
  O: { name: 'Open/Closed', req: 'Support a new shape: Triangle.',
    bad: { code: 'double Area(Shape s) => s.Kind switch\\n{\\n  "circle" => Math.PI * s.A * s.A,\\n  "rect"   => s.A * s.B,\\n  _ => throw new NotSupportedException()\\n};',
      files: [['AreaCalculator.cs', 'edit'], ['PerimeterCalculator.cs', 'edit'], ['ShapeRenderer.cs', 'edit']], res: 'Three switches on Kind had to be found and edited. Miss one and Triangle throws NotSupportedException at runtime.' },
    good: { code: 'interface IShape { double Area(); }\\nrecord Circle(double R) : IShape { ... }\\nrecord Rect(double W, double H) : IShape { ... }',
      files: [['IShape.cs', 'same'], ['Circle.cs', 'same'], ['Rect.cs', 'same'], ['Triangle.cs', 'add']], res: 'One new file. No existing code edited, so nothing that worked can break.' } },
  L: { name: 'Liskov Substitution', req: 'Resize code (written for Rectangle) now receives a Square.',
    bad: { code: 'class Square : Rectangle\\n{\\n  public override double Width\\n  { set { base.Width = value; base.Height = value; } }\\n}\\n\\nRectangle r = new Square();\\nr.Width = 5; r.Height = 4;',
      files: [['Resize.cs', 'same'], ['Square.cs', 'same']], res: 'r.Area is 16, the caller expected 20. No file changed, yet existing code is now wrong: the subtype broke the base type\\'s promise.' },
    good: { code: 'interface IShape { double Area(); }\\nrecord Rect(double W, double H) : IShape { ... }\\nrecord Square(double Side) : IShape { ... }',
      files: [['Resize.cs', 'same'], ['Square.cs', 'same']], res: 'Square is not a Rectangle, so it can\\'t be passed to resize code. The compiler stops the bug.' } },
  I: { name: 'Interface Segregation', req: 'Add a cheap printer that cannot scan or fax.',
    bad: { code: 'interface IMachine\\n{\\n  void Print(Doc d);\\n  void Scan(Doc d);\\n  void Fax(Doc d);\\n}',
      files: [['CheapPrinter.cs', 'add'], ['FaxScreen.cs', 'same']], res: 'CheapPrinter must implement Scan() and Fax() by throwing NotSupportedException. FaxScreen accepts it and crashes when used.' },
    good: { code: 'interface IPrinter { void Print(Doc d); }\\ninterface IScanner { void Scan(Doc d); }\\ninterface IFax     { void Fax(Doc d); }',
      files: [['CheapPrinter.cs', 'add'], ['FaxScreen.cs', 'same']], res: 'CheapPrinter : IPrinter only. FaxScreen asks for IFax, so the compiler refuses a CheapPrinter.' } },
  D: { name: 'Dependency Inversion', req: 'Tests must run without a SQL database.',
    bad: { code: 'class OrderService\\n{\\n  readonly SqlOrderRepository _repo = new();\\n  public void Place(Order o) => _repo.Add(o);\\n}',
      files: [['OrderService.cs', 'edit'], ['OrderServiceTests.cs', 'edit']], res: 'OrderService creates its own SqlOrderRepository. You must edit it (or spin up a database) just to test it.' },
    good: { code: 'class OrderService(IOrderRepository repo)\\n{\\n  public void Place(Order o) => repo.Add(o);\\n}\\n\\n// test:\\nnew OrderService(new InMemoryOrderRepository());',
      files: [['OrderService.cs', 'same'], ['InMemoryOrderRepository.cs', 'add']], res: 'The test passes an in-memory fake. OrderService is untouched.' } }
};
var cur = 'S', mode = 'bad', applied = false;
function el(id) { return document.getElementById(id); }
function render() {
  var t = el('tabs'); t.innerHTML = '';
  Object.keys(D).forEach(function (k) {
    var b = document.createElement('button');
    b.textContent = k + ': ' + D[k].name;
    if (k === cur) b.className = 'on';
    b.onclick = function () { cur = k; applied = false; render(); };
    t.appendChild(b);
  });
  var m = el('mode'); m.innerHTML = '';
  [['bad', 'Violating'], ['good', 'Following']].forEach(function (x) {
    var b = document.createElement('button');
    b.textContent = x[1];
    if (x[0] === mode) b.className = 'on' + (x[0] === 'bad' ? ' bad' : '');
    b.onclick = function () { mode = x[0]; applied = false; render(); };
    m.appendChild(b);
  });
  var go = document.createElement('button');
  go.textContent = '\\u26A1 Apply requirement change';
  go.onclick = function () { applied = true; render(); console.log(cur + ' [' + mode + ']: ' + D[cur][mode].res); };
  m.appendChild(go);
  var v = D[cur][mode];
  el('req').innerHTML = '<b>Requirement change:</b> ' + D[cur].req;
  el('code').textContent = v.code;
  var f = el('files'); f.innerHTML = '<b>Files</b>';
  v.files.forEach(function (x) {
    var d = document.createElement('div');
    var st = applied ? x[1] : 'same';
    d.className = 'f ' + st;
    d.textContent = (st === 'edit' ? '\\u270E edited  ' : st === 'add' ? '+ added  ' : '\\u2713 untouched  ') + x[0];
    f.appendChild(d);
  });
  var r = el('res');
  r.textContent = applied ? v.res : 'Nothing changed yet.';
  r.className = 'res' + (applied ? (mode === 'bad' ? ' bad' : ' good') : '');
}
render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Tab <strong>O</strong>, <strong>Violating</strong>, then <strong>Apply</strong>: three files turn red. Switch to
              <strong>Following</strong> and apply again: one green "added" file and nothing red.</li>
              <li>Tab <strong>L</strong>, <strong>Violating</strong>: no file is edited, yet the result is wrong. LSP bugs
              hide in code that looks untouched.</li>
              <li>Tab <strong>D</strong>: compare "edit OrderService to test it" with "pass a fake in". The next lesson's
              widget builds on exactly this.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'A <code>ReportService</code> formats PDFs, queries SQL and sends emails. Which principle does it most obviously violate?', options: ['Liskov Substitution', 'Single Responsibility', 'Interface Segregation', 'None'], answer: 1, why: 'It has three unrelated reasons to change (layout, schema, mail provider), so it violates SRP.' },
      { q: 'Adding a new payment provider requires editing a <code>switch</code> in <code>CheckoutService</code>. Which principle is violated?', options: ['Open/Closed', 'Liskov Substitution', 'Interface Segregation', 'Dependency Inversion only'], answer: 0, why: 'The code is not closed for modification: new behaviour means editing existing, working code. Putting providers behind an interface fixes it.' },
      { q: '<code>ReadOnlyList : MyList</code> overrides <code>Add</code> to throw <code>NotSupportedException</code>. Code that takes a <code>MyList</code> crashes. Which principle?', options: ['SRP', 'OCP', 'LSP', 'ISP'], answer: 2, why: 'The subtype can\'t be substituted for its base type without breaking callers: a Liskov violation.' },
      { q: 'What does Dependency Inversion ask of <code>OrderService</code>?', options: ['Inherit from <code>SqlOrderRepository</code>', 'Depend on an <code>IOrderRepository</code> abstraction and receive the implementation from outside', 'Be a static class', 'Create its repository in a static constructor'], answer: 1, why: 'High-level policy depends on an abstraction. Whoever builds <code>OrderService</code> decides which repository to pass in.' },
      { q: 'In the notification program, which change would require editing <code>OrderService</code>?', options: ['Adding a <code>PushSender</code>', 'Removing <code>SmsSender</code> from the array', 'Changing what text the order confirmation says', 'Changing the Slack channel name'], answer: 2, why: 'Senders are plugged in from outside, so adding/removing them or configuring them doesn\'t touch <code>OrderService</code>. The message text is <code>OrderService</code>\'s own responsibility.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>AreaCalculator</code> violates the Open/Closed Principle: every new shape edits its
      <code>switch</code>. Introduce an <code>IShape</code> interface with <code>double Area()</code>, make
      <code>Circle</code> and <code>Rectangle</code> implement it, then <strong>add a <code>Triangle</code></strong>
      without any <code>switch</code>. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'interface IShape { string Name { get; } double Area(); } then e.g. record Circle(double Radius) : IShape { public string Name => "circle"; public double Area() => Math.PI * Radius * Radius; }. The loop just calls s.Area().',
      starter: `var shapes = new List<Shape>
{
  new Shape("circle", 1, 0),
  new Shape("rectangle", 2, 3),
};

foreach (var s in shapes)
  Console.WriteLine($"{s.Kind}: {AreaCalculator.Area(s):F2}");

record Shape(string Kind, double A, double B);

static class AreaCalculator
{
  // Every new shape means editing this switch
  public static double Area(Shape s) => s.Kind switch
  {
    "circle" => Math.PI * s.A * s.A,
    "rectangle" => s.A * s.B,
    _ => throw new NotSupportedException(s.Kind),
  };
}`,
      solution: `List<IShape> shapes = [new Circle(1), new Rectangle(2, 3), new Triangle(3, 4)];

foreach (var s in shapes)
  Console.WriteLine($"{s.Name}: {s.Area():F2}");

interface IShape
{
  string Name { get; }
  double Area();
}

record Circle(double Radius) : IShape
{
  public string Name => "circle";
  public double Area() => Math.PI * Radius * Radius;
}

record Rectangle(double Width, double Height) : IShape
{
  public string Name => "rectangle";
  public double Area() => Width * Height;
}

// Added without touching any existing type
record Triangle(double Base, double Height) : IShape
{
  public string Name => "triangle";
  public double Area() => Base * Height / 2;
}`,
      checks: [
        { label: 'Declares interface IShape', re: /interface\s+IShape\b/ },
        { label: 'IShape has double Area()', re: /double\s+Area\s*\(\s*\)/ },
        { label: 'Circle implements IShape', re: /\bCircle\b[^{;]*:\s*IShape\b/ },
        { label: 'Triangle implements IShape', re: /\bTriangle\b[^{;]*:\s*IShape\b/ },
        { label: 'No switch left', re: /\bswitch\b/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── composition-over-inheritance
  {
    id: 'composition-over-inheritance',
    section: 'Foundations',
    title: 'Composition over inheritance',
    explain: `
      <p>The GoF book's second big principle (after "program to an interface") is: <strong>favour object
      composition over class inheritance</strong>. Inheritance says "a <code>X</code> <em>is a</em> <code>Y</code>"
      and is fixed at compile time. Composition says "a <code>X</code> <em>has a</em> <code>Y</code>" and can be
      changed at runtime by plugging in a different object.</p>

      <h3>The problem: class explosion</h3>
      <p>A coffee shop starts with <code>Espresso</code> and <code>Latte</code>. Then customers want milk, sugar,
      caramel... With inheritance every <em>combination</em> needs its own class:</p>
      <pre><code>class Espresso { }
class EspressoWithMilk : Espresso { }
class EspressoWithSugar : Espresso { }
class EspressoWithMilkAndSugar : EspressoWithMilk { }   // or : EspressoWithSugar? pick one...
class EspressoWithMilkAndSugarAndCaramel : ... { }
// 2 drinks × 2^3 add-on combinations = 16 classes, and it doubles with every new add-on</code></pre>
      <p>Same story with ducks: <code>Duck</code> → <code>MallardDuck</code> flies and quacks,
      <code>RubberDuck</code> squeaks and <em>must override <code>Fly()</code> to do nothing</em>,
      <code>DecoyDuck</code> does neither... The behaviours don't line up with a single tree.</p>

      <h3>The solution: compose behaviours</h3>
      <pre><code>interface IFly   { string Fly(); }
interface IQuack { string Sound(); }

class Duck(string name, IFly flying, IQuack quacking) { ... }

var rubber = new Duck("Rubber duck", new NoFly(), new Squeak());</code></pre>
      <p>Now there are 3 flying behaviours + 2 sounds = 5 small classes, and any duck is any combination.
      New behaviour = one new class. You can even swap a behaviour at runtime.</p>

      <h3>The hidden cost of inheritance: the fragile base class</h3>
      <p>A subclass that overrides methods depends on <em>how the base class calls its own methods</em>, which is
      an implementation detail. When the base class changes internally, subclasses break without a single line of
      theirs changing. The C# program below shows it with a counting tag set (walkthrough included).</p>

      <h3>When inheritance is still right</h3>
      <ul>
        <li>A real, stable "is-a" relationship that passes the Liskov test (<code>FileStream</code> <em>is a</em> <code>Stream</code>).</li>
        <li>Framework base classes designed for it: <code>BackgroundService</code>, <code>ControllerBase</code>,
        <code>DbContext</code>. Their authors document which methods are meant to be overridden.</li>
        <li>Shallow hierarchies (one level) with abstract bases are fine. Deep trees of concrete classes are the smell.</li>
      </ul>
      <div class="tip">C# nudges you here already: classes aren't <code>virtual</code> by default, and marking classes
      <code>sealed</code> unless they're designed for inheritance is good practice (Microsoft's own analyzers suggest it).</div>
      <p>Patterns built on this idea: Strategy (swap an algorithm), Decorator (wrap to add features, the real fix for
      the coffee shop), Bridge, State, Composite.</p>
    `,
    examples: [
      {
        title: 'C#: composed ducks + the fragile base class',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Part 1: compose behaviours instead of a subclass per combination
var mallard = new Duck("Mallard", new FlyWithWings(), new Quack());
var rubber = new Duck("Rubber duck", new NoFly(), new Squeak());
Duck[] ducks = [mallard, rubber];

foreach (var duck in ducks)
  duck.Show();

rubber.Flying = new FlyWithRocket(); // swap a behaviour at runtime
rubber.Show();

// Part 2: the fragile base class problem
var inherited = new CountingTagSet();
inherited.AddRange(["c#", "patterns", "solid"]);
Console.WriteLine($"Inheritance: added {inherited.Added}, actual {inherited.Count}");

var composed = new CountingTags(new TagSet());
composed.AddRange(["c#", "patterns", "solid"]);
Console.WriteLine($"Composition: added {composed.Added}, actual {composed.Count}");

interface IFly { string Fly(); }
interface IQuack { string Sound(); }

class FlyWithWings : IFly { public string Fly() => "flaps its wings"; }
class FlyWithRocket : IFly { public string Fly() => "zooms on a rocket"; }
class NoFly : IFly { public string Fly() => "can't fly"; }
class Quack : IQuack { public string Sound() => "Quack!"; }
class Squeak : IQuack { public string Sound() => "Squeak!"; }

class Duck(string name, IFly flying, IQuack quacking)
{
  public IFly Flying { get; set; } = flying;

  public void Show() =>
    Console.WriteLine($"{name}: {Flying.Fly()}, says {quacking.Sound()}");
}

class TagSet
{
  private readonly List<string> _items = [];
  public int Count => _items.Count;

  public virtual void Add(string tag) => _items.Add(tag);

  public virtual void AddRange(IEnumerable<string> tags)
  {
    foreach (var tag in tags)
      Add(tag); // self-call: an implementation detail
  }
}

class CountingTagSet : TagSet
{
  public int Added { get; private set; }

  public override void Add(string tag)
  {
    Added++;
    base.Add(tag);
  }

  public override void AddRange(IEnumerable<string> tags)
  {
    Added += tags.Count();
    base.AddRange(tags); // base calls OUR Add again
  }
}

class CountingTags(TagSet inner)
{
  public int Added { get; private set; }
  public int Count => inner.Count;

  public void Add(string tag)
  {
    Added++;
    inner.Add(tag);
  }

  public void AddRange(IEnumerable<string> tags)
  {
    var list = tags.ToList();
    Added += list.Count;
    inner.AddRange(list);
  }
}`,
        output: `Mallard: flaps its wings, says Quack!
Rubber duck: can't fly, says Squeak!
Rubber duck: zooms on a rocket, says Squeak!
Inheritance: added 6, actual 3
Composition: added 3, actual 3`,
        explain: `
          <details>
            <summary>The problem: why does inheritance count 6 tags?</summary>
            <p><code>CountingTagSet</code> wants to count how many tags were ever added. It overrides both
            <code>Add</code> and <code>AddRange</code>. Looks reasonable. But <code>TagSet.AddRange</code> secretly
            calls <code>Add</code> for each tag, and because <code>Add</code> is <code>virtual</code>, that call goes to
            the <em>subclass's</em> override:</p>
            <table>
              <tr><th>Step</th><th>Running code</th><th><code>Added</code></th><th><code>Count</code></th></tr>
              <tr><td>1</td><td><code>CountingTagSet.AddRange</code>: <code>Added += 3</code></td><td>3</td><td>0</td></tr>
              <tr><td>2</td><td><code>base.AddRange</code> loops, calls <code>Add("c#")</code> → dispatches to <code>CountingTagSet.Add</code></td><td>4</td><td>1</td></tr>
              <tr><td>3</td><td><code>Add("patterns")</code> → <code>CountingTagSet.Add</code> again</td><td>5</td><td>2</td></tr>
              <tr><td>4</td><td><code>Add("solid")</code> → <code>CountingTagSet.Add</code> again</td><td>6</td><td>3</td></tr>
              <tr><td>5</td><td>prints</td><td colspan="2"><code>Inheritance: added 6, actual 3</code> ❌</td></tr>
            </table>
            <p>The subclass's correctness depends on a detail of the base class it can't see: <em>"does AddRange call
            Add?"</em>. That's the <strong>fragile base class</strong> problem.</p>
          </details>
          <details>
            <summary>It gets worse: the base class "improves"</summary>
            <p>Suppose the <code>TagSet</code> author later optimises <code>AddRange</code>:</p>
            <pre><code>public virtual void AddRange(IEnumerable&lt;string&gt; tags) =&gt; _items.AddRange(tags);</code></pre>
            <p>No public signature changed, all of <code>TagSet</code>'s own tests pass. But now a subclass that "fixed" the
            double count by <em>not</em> overriding <code>AddRange</code> silently counts <strong>0</strong> for every
            <code>AddRange</code> call. Either way, every change in the base class can break subclasses you've never seen.</p>
          </details>
          <details>
            <summary>The fix: wrap, don't extend (<code>CountingTags</code>)</summary>
            <pre><code>class CountingTags(TagSet inner)        // ① HAS a TagSet, isn't one
{
  public void AddRange(IEnumerable&lt;string&gt; tags)
  {
    var list = tags.ToList();           // ② enumerate once
    Added += list.Count;                // ③ count here, exactly once
    inner.AddRange(list);               // ④ whatever inner does internally, it can't call back into us
  }
}</code></pre>
            <ol>
              <li><strong>①</strong> <code>CountingTags</code> holds a <code>TagSet</code> and only uses its <em>public</em> API.</li>
              <li><strong>②</strong> <code>ToList()</code> so a lazy sequence isn't enumerated twice.</li>
              <li><strong>③④</strong> <code>inner.AddRange</code> calling <code>inner.Add</code> runs <code>TagSet.Add</code>,
              not ours, because nothing is overridden. Result: <code>Composition: added 3, actual 3</code> ✅, and it stays
              correct whichever way <code>TagSet.AddRange</code> is implemented.</li>
            </ol>
            <div class="tip">This wrapper is the <strong>Decorator</strong> pattern in miniature. Give <code>TagSet</code> and
            <code>CountingTags</code> a shared <code>ITagSet</code> interface and callers can't tell them apart.</div>
          </details>
          <details>
            <summary>Part 1: why the ducks print what they print</summary>
            <p><code>Duck</code> never asks "what kind of duck am I?". It delegates to whatever <code>IFly</code> and
            <code>IQuack</code> it was given. Assigning <code>rubber.Flying = new FlyWithRocket()</code> changes the
            third line to <code>zooms on a rocket</code> without a new class. With inheritance you'd need a
            <code>RocketRubberDuck</code> subclass and couldn't change it after construction.</p>
          </details>
        `,
      },
      {
        title: 'Widget: subclass explosion vs composition',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .ctl { display: flex; gap: 16px; flex-wrap: wrap; align-items: center; font-size: 14px; }
  .ctl input { vertical-align: middle; }
  .bars { margin-top: 10px; }
  .bar { height: 26px; border-radius: 6px; color: #fff; font-size: 13px; line-height: 26px; padding: 0 8px; margin: 5px 0; white-space: nowrap; transition: width .3s; min-width: 36px; box-sizing: border-box; }
  .inh { background: #c0392b; } .comp { background: #27ae60; }
  .lab { font-size: 13px; margin-top: 6px; }
  .cols { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }
  .col { flex: 1 1 240px; font-size: 12px; background: #f6f7fb; border: 1px solid #dde1ea; border-radius: 8px; padding: 6px 8px; max-height: 170px; overflow: auto; font-family: ui-monospace, Menlo, monospace; }
  .col b { font-family: system-ui, sans-serif; }
</style>
<div class="top">Drag the sliders. Red = classes needed with inheritance (one per combination). Green = classes with composition.</div>
<div class="ctl">
  <label>Base drinks: <input type="range" id="bases" min="1" max="4" value="2"> <b id="bv"></b></label>
  <label>Add-ons: <input type="range" id="addons" min="0" max="8" value="2"> <b id="av"></b></label>
</div>
<div class="bars">
  <div class="lab">Inheritance: <span id="it"></span></div>
  <div class="bar inh" id="ib"></div>
  <div class="lab">Composition: <span id="ct"></span></div>
  <div class="bar comp" id="cb"></div>
</div>
<div class="cols">
  <div class="col" id="il"></div>
  <div class="col" id="cl"></div>
</div>
<script>
var DRINKS = ['Espresso', 'Latte', 'Mocha', 'Tea'];
var ADD = ['Milk', 'Sugar', 'Caramel', 'Vanilla', 'Soy', 'Cream', 'Cinnamon', 'Honey'];
function el(id) { return document.getElementById(id); }
function update() {
  var b = +el('bases').value, a = +el('addons').value;
  el('bv').textContent = b; el('av').textContent = a;
  var inh = b * Math.pow(2, a);
  var comp = b + a + 1;
  el('it').textContent = b + ' drinks \\u00D7 2^' + a + ' combinations = ' + inh + ' classes';
  el('ct').textContent = b + ' drinks + ' + a + ' add-ons + 1 IAddOn interface = ' + comp + ' classes';
  var max = 4 * 256;
  var w = function (n) { return Math.max(4, Math.sqrt(n / max) * 100) + '%'; };
  el('ib').style.width = w(inh); el('ib').textContent = inh;
  el('cb').style.width = w(comp); el('cb').textContent = comp;
  var names = [];
  for (var d = 0; d < b; d++) {
    for (var mask = 0; mask < Math.pow(2, a); mask++) {
      var parts = [];
      for (var i = 0; i < a; i++) if (mask & (1 << i)) parts.push(ADD[i]);
      names.push('class ' + DRINKS[d] + (parts.length ? 'With' + parts.join('And') : ''));
    }
  }
  var shown = names.slice(0, 40);
  el('il').innerHTML = '<b>Inheritance classes</b><br>' + shown.join('<br>') + (names.length > 40 ? '<br>... and ' + (names.length - 40) + ' more' : '');
  var cl = ['interface IAddOn'];
  for (var d2 = 0; d2 < b; d2++) cl.push('class ' + DRINKS[d2]);
  for (var j = 0; j < a; j++) cl.push('class ' + ADD[j] + ' : IAddOn');
  el('cl').innerHTML = '<b>Composition classes</b><br>' + cl.join('<br>') +
    '<br><br>// any order, at runtime:<br>new Coffee(new Espresso(), [' + ADD.slice(0, Math.min(a, 2)).map(function (x) { return 'new ' + x + '()'; }).join(', ') + '])';
  console.log('drinks=' + b + ' addons=' + a + ' inheritance=' + inh + ' composition=' + comp);
}
el('bases').oninput = update;
el('addons').oninput = update;
update();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Keep 2 drinks and move <strong>Add-ons</strong> from 2 to 3: inheritance goes from 8 to 16 classes,
              composition from 5 to 6.</li>
              <li>Drag add-ons to 8 with 4 drinks: 1,024 subclasses vs 13 classes. The red list stops at 40 names.</li>
              <li>Look at the inheritance names: <code>EspressoWithMilkAndSugar</code> and "sugar then milk" would be the
              same class, and there's no way to ask for <em>double</em> milk. Composition handles both, because add-ons are
              objects in a list.</li>
            </ul>
            <div class="tip">The "real" pattern for the coffee shop is Decorator: each add-on wraps the drink and adds to
            <code>Cost()</code>. You'll build it in the Structural section.</div>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What is the "fragile base class" problem?', options: ['Base classes can\'t have constructors', 'Changes to a base class\'s internal implementation can break subclasses even though no public API changed', 'Base classes are slow', 'Abstract classes can\'t be instantiated'], answer: 1, why: 'Subclasses that override methods depend on how the base calls its own virtual methods, an implementation detail. When it changes, subclasses break.' },
      { q: 'With 3 base drinks and 4 independent add-ons, how many classes does the "one subclass per combination" approach need?', options: ['7', '12', '48', '81'], answer: 2, why: 'Each add-on is on or off: 2^4 = 16 combinations per drink, times 3 drinks = 48.' },
      { q: 'Which is a sign you should use composition instead of inheritance?', options: ['A subclass overrides a method only to throw or do nothing', 'The base class is <code>abstract</code>', 'The class has a constructor', 'You need a <code>List&lt;T&gt;</code>'], answer: 0, why: 'A <code>RubberDuck</code> overriding <code>Fly()</code> to do nothing means the behaviour doesn\'t really belong in the base type. Make it a pluggable component.' },
      { q: 'In the C# program, why does <code>CountingTags</code> report 3 while <code>CountingTagSet</code> reports 6?', options: ['<code>ToList()</code> removes duplicates', '<code>CountingTags</code> wraps a <code>TagSet</code>, so the base\'s internal call to <code>Add</code> runs <code>TagSet.Add</code>, not the counting one', '<code>CountingTagSet</code> is a record', 'Composition runs on a different thread'], answer: 1, why: 'Without overriding there is no virtual dispatch back into the counter. Each tag is counted exactly once.' },
      { q: 'When is inheritance a good choice?', options: ['To reuse a single helper method', 'For a stable is-a relationship or a framework base class designed for extension, like <code>BackgroundService</code>', 'Whenever two classes share a field', 'Always: it\'s faster than interfaces'], answer: 1, why: 'Inheritance is fine when the subtype truly is substitutable and the base is designed (and documented) for overriding.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>RubberDuck</code> inherits <code>Fly()</code> and has to override it to "turn it off". Replace the
      hierarchy with composition: add an <code>IFlyBehavior</code> interface (with e.g. <code>FlyWithWings</code> and
      <code>NoFly</code>), make <code>Duck</code> a single concrete class that receives its fly behaviour in the
      constructor, and delete the subclasses. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'interface IFlyBehavior { string Fly(); } … class Duck(string name, IFlyBehavior flying) { public string Name => name; public string Fly() => flying.Fly(); }. Then: new Duck("Mallard", new FlyWithWings()).',
      starter: `Duck[] ducks = [new MallardDuck(), new RubberDuck()];

foreach (var d in ducks)
  Console.WriteLine($"{d.Name}: {d.Fly()}");

abstract class Duck
{
  public abstract string Name { get; }
  public virtual string Fly() => "flaps its wings";
}

class MallardDuck : Duck
{
  public override string Name => "Mallard";
}

class RubberDuck : Duck
{
  public override string Name => "Rubber duck";

  // Smell: overriding just to switch inherited behaviour off
  public override string Fly() => "can't fly";
}`,
      solution: `Duck[] ducks =
[
  new Duck("Mallard", new FlyWithWings()),
  new Duck("Rubber duck", new NoFly()),
];

foreach (var d in ducks)
  Console.WriteLine($"{d.Name}: {d.Fly()}");

interface IFlyBehavior
{
  string Fly();
}

class FlyWithWings : IFlyBehavior
{
  public string Fly() => "flaps its wings";
}

class NoFly : IFlyBehavior
{
  public string Fly() => "can't fly";
}

sealed class Duck(string name, IFlyBehavior flying)
{
  public string Name => name;
  public string Fly() => flying.Fly();
}`,
      checks: [
        { label: 'Declares a fly-behaviour interface (IFly…)', re: /interface\s+IFly\w*/ },
        { label: 'Duck receives the behaviour in its constructor', re: /Duck\s*\([^)]*\bIFly\w*\s+\w+/ },
        { label: 'No subclasses of Duck', re: /class\s+\w+\s*(\([^)]*\))?\s*:\s*Duck\b/, absent: true },
        { label: 'No override needed', re: /\boverride\b/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────────────────────── program-to-interface
  {
    id: 'program-to-interface',
    section: 'Foundations',
    title: 'Program to an interface (and inject it)',
    explain: `
      <p>The GoF book's first principle: <strong>program to an interface, not an implementation</strong>. Code that
      calls <code>IMessageSender.Send</code> works with <em>any</em> sender. Code that calls
      <code>new SmtpEmailSender().Send</code> works with exactly one, forever.</p>

      <h3>The problem</h3>
      <pre><code>class WelcomeService
{
  private readonly SmtpEmailSender _email = new();   // hard-wired

  public void Register(string user) =&gt; _email.Send(user, "Welcome!");
}</code></pre>
      <ul>
        <li>Want SMS instead? Edit <code>WelcomeService</code>.</li>
        <li>Want to unit-test <code>Register</code>? Every test run sends a real email.</li>
        <li>The business rule ("welcome new users") is welded to an infrastructure detail (SMTP).</li>
      </ul>

      <h3>The solution: interface + constructor injection</h3>
      <pre><code>interface IMessageSender { void Send(string to, string body); }

class WelcomeService(IMessageSender sender)       // ① depends on the abstraction
{
  public void Register(string user) =&gt; sender.Send(user, "Welcome!");
}

// ② the composition root (Program.cs) picks the implementation
var service = new WelcomeService(new EmailSender());</code></pre>
      <p>This is <strong>Dependency Inversion</strong> (the D in SOLID) done with <strong>manual constructor
      injection</strong>. "Injection" sounds fancy: it just means "pass it in as a constructor parameter". The place
      where you finally write <code>new EmailSender()</code> is called the <em>composition root</em>, usually
      <code>Program.cs</code>.</p>

      <h3>Testing with fakes</h3>
      <p>A <strong>fake</strong> is a tiny hand-written implementation for tests that records what happened instead of
      doing it:</p>
      <pre><code>class FakeSender : IMessageSender
{
  public List&lt;string&gt; Sent { get; } = [];
  public void Send(string to, string body) =&gt; Sent.Add(to);
}</code></pre>
      <p>Now a test can call <code>Register</code> and assert <code>fake.Sent.Count == 1</code>. No network, no mocking
      library, milliseconds per test.</p>

      <h3>In .NET</h3>
      <p>ASP.NET Core does the composition root for you with its built-in DI container:</p>
      <pre><code>builder.Services.AddScoped&lt;IMessageSender, EmailSender&gt;();
builder.Services.AddScoped&lt;WelcomeService&gt;();
// the container sees WelcomeService(IMessageSender) and passes an EmailSender in</code></pre>
      <p>Everywhere in .NET you see this: <code>ILogger&lt;T&gt;</code>, <code>IOptions&lt;T&gt;</code>,
      <code>IHttpClientFactory</code>, <code>TimeProvider</code> (inject it instead of calling <code>DateTime.Now</code>
      so tests can control time).</p>

      <div class="warn">Don't create an interface for every class "just in case". Interfaces pay off at
      <strong>boundaries</strong>: I/O (database, HTTP, email, files, clock), things with several implementations,
      and things you need to fake in tests. A <code>PriceCalculator</code> that is pure math rarely needs an
      <code>IPriceCalculator</code>.</div>
    `,
    examples: [
      {
        title: 'C#: one service, three senders (email, SMS, fake)',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Production wiring
var prod = new WelcomeService(new EmailSender());
prod.Register("ana@example.com");

// Same service, different implementation: zero changes to WelcomeService
var sms = new WelcomeService(new SmsSender());
sms.Register("+61 400 000 000");

// "Unit test": a fake records calls instead of sending anything
var fake = new FakeSender();
var underTest = new WelcomeService(fake);
underTest.Register("ben@example.com");
underTest.Register("cy@example.com");

Console.WriteLine($"Fake recorded {fake.Sent.Count} messages");
Console.WriteLine($"First: {fake.Sent[0]}");
Console.WriteLine(fake.Sent.Count == 2 ? "TEST PASSED" : "TEST FAILED");

interface IMessageSender
{
  void Send(string to, string body);
}

class EmailSender : IMessageSender
{
  public void Send(string to, string body) =>
    Console.WriteLine($"[SMTP] to {to}: {body}");
}

class SmsSender : IMessageSender
{
  public void Send(string to, string body) =>
    Console.WriteLine($"[SMS] to {to}: {body}");
}

class FakeSender : IMessageSender
{
  public List<string> Sent { get; } = [];

  public void Send(string to, string body) => Sent.Add($"{to} | {body}");
}

class WelcomeService(IMessageSender sender)
{
  public void Register(string user)
  {
    // ...save the user to the database...
    sender.Send(user, "Welcome aboard!");
  }
}`,
        output: `[SMTP] to ana@example.com: Welcome aboard!
[SMS] to +61 400 000 000: Welcome aboard!
Fake recorded 2 messages
First: ben@example.com | Welcome aboard!
TEST PASSED`,
        explain: `
          <details>
            <summary>Why the fake prints nothing</summary>
            <p><code>FakeSender.Send</code> only adds a string to its <code>Sent</code> list. So the two
            <code>underTest.Register</code> calls produce no console output at all; the program then <em>inspects</em>
            the fake: 2 recorded messages, the first one is <code>ben@example.com | Welcome aboard!</code>. That's exactly
            what a unit test with xUnit/NUnit would assert, minus the framework.</p>
          </details>
          <details>
            <summary>Where the decisions live</summary>
            <p>The top of the file is the <strong>composition root</strong>: the only lines that mention
            <code>EmailSender</code>, <code>SmsSender</code> or <code>FakeSender</code>. <code>WelcomeService</code>
            mentions only <code>IMessageSender</code>. That's why it could be reused three times without a single edit.</p>
          </details>
        `,
      },
      {
        title: 'Widget: swap the implementation behind IMessageSender',
        lang: 'html',
        code: `<style>
  .top { font-size: 13px; color: #555; margin-bottom: 6px; }
  .impl button.on { background: #3858e9; color: #fff; border-color: #3858e9; }
  svg { width: 100%; max-width: 620px; height: 150px; display: block; }
  .root { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; background: #f6f7fb; border: 1px solid #dde1ea; border-radius: 8px; padding: 6px 8px; margin: 6px 0; }
  .log { font-family: ui-monospace, Menlo, monospace; font-size: 12.5px; background: #1f2330; color: #d7f5d0; border-radius: 8px; padding: 6px 8px; min-height: 60px; max-height: 110px; overflow: auto; }
  .note { font-size: 13px; margin-top: 6px; }
  .ok { color: #17733a; font-weight: 600; }
</style>
<div class="top">Choose an implementation, then click <b>Register user</b>. WelcomeService never changes.</div>
<div class="impl" id="impl"></div>
<svg viewBox="0 0 620 150" id="svg"></svg>
<div class="root" id="root"></div>
<div><button id="reg">Register user</button> <button id="assert">Assert (fake only)</button></div>
<div class="log" id="log"></div>
<div class="note" id="note"></div>
<script>
var IMPL = { EmailSender: '[SMTP] to ', SmsSender: '[SMS] to ', FakeSender: '' };
var users = { EmailSender: ['ana@example.com', 'ben@example.com', 'cy@example.com'], SmsSender: ['+61 400 000 000', '+61 400 111 111', '+61 400 222 222'], FakeSender: ['ben@example.com', 'cy@example.com', 'dee@example.com'] };
var cur = 'EmailSender', n = 0, fakeSent = [], edits = 0;
function el(id) { return document.getElementById(id); }
function box(x, y, w, h, fill, stroke, lines, bold) {
  var s = '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="8" fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (bold ? 3 : 1.5) + '"/>';
  lines.forEach(function (t, i) { s += '<text x="' + (x + w / 2) + '" y="' + (y + 20 + i * 16) + '" text-anchor="middle" font-size="12" fill="#1f2330">' + t + '</text>'; });
  return s;
}
function draw(flash) {
  var s = '<defs><marker id="ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#555"/></marker></defs>';
  s += box(10, 50, 140, 46, flash ? '#fff4c2' : '#eef2ff', '#3858e9', ['WelcomeService', 'Register(user)'], flash);
  s += box(220, 50, 150, 46, '#f7f7f7', '#888', ['\\u00ABinterface\\u00BB', 'IMessageSender']);
  s += '<line x1="150" y1="73" x2="218" y2="73" stroke="#555" stroke-width="1.5" marker-end="url(#ar)"/>';
  var names = ['EmailSender', 'SmsSender', 'FakeSender'];
  names.forEach(function (nm, i) {
    var y = 8 + i * 48, on = nm === cur;
    s += box(450, y, 150, 38, on ? (flash ? '#fff4c2' : '#e6f6ea') : '#fafafa', on ? '#27ae60' : '#ccc', [nm], on);
    s += '<line x1="448" y1="' + (y + 19) + '" x2="372" y2="73" stroke="' + (on ? '#27ae60' : '#ddd') + '" stroke-width="' + (on ? 2.5 : 1) + '" stroke-dasharray="' + (on ? '' : '4 3') + '"/>';
  });
  el('svg').innerHTML = s;
}
function render() {
  var b = el('impl'); b.innerHTML = '';
  Object.keys(IMPL).forEach(function (k) {
    var x = document.createElement('button');
    x.textContent = k;
    if (k === cur) x.className = 'on';
    x.onclick = function () { cur = k; n = 0; fakeSent = []; el('log').innerHTML = ''; render(); console.log('composition root now uses ' + k); };
    b.appendChild(x);
  });
  el('root').textContent = '// Program.cs (composition root)\\nvar service = new WelcomeService(new ' + cur + '());';
  el('root').style.whiteSpace = 'pre';
  el('assert').disabled = cur !== 'FakeSender';
  el('note').innerHTML = 'Lines changed in WelcomeService.cs: <b>' + edits + '</b>' + (cur === 'FakeSender' ? ' \\u2022 fake.Sent.Count = <b>' + fakeSent.length + '</b>' : '');
  draw(false);
}
function line(t, cls) {
  var d = document.createElement('div');
  d.textContent = t;
  if (cls) d.className = cls;
  el('log').appendChild(d);
  el('log').scrollTop = 1e6;
  console.log(t);
}
el('reg').onclick = function () {
  var u = users[cur][n % 3]; n++;
  draw(true);
  setTimeout(function () { draw(false); }, 400);
  if (cur === 'FakeSender') {
    fakeSent.push(u + ' | Welcome aboard!');
    line('(nothing printed: fake recorded "' + u + ' | Welcome aboard!")');
  } else {
    line(IMPL[cur] + u + ': Welcome aboard!');
  }
  render();
};
el('assert').onclick = function () {
  var ok = fakeSent.length > 0;
  line('Assert fake.Sent.Count == ' + fakeSent.length + (ok ? '  \\u2192 TEST PASSED' : '  \\u2192 register someone first'), ok ? 'ok' : '');
};
render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>With <strong>EmailSender</strong> selected, click <strong>Register user</strong> twice: two <code>[SMTP]</code> lines.</li>
              <li>Click <strong>SmsSender</strong>: only the composition root line changes. Register again: <code>[SMS]</code>.</li>
              <li>Click <strong>FakeSender</strong>, register twice, then <strong>Assert</strong>. Nothing was "sent", the fake
              just counted. That's how you unit-test <code>WelcomeService</code>.</li>
              <li>Watch "Lines changed in WelcomeService.cs": it stays at <b>0</b> the whole time.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      { q: 'What does "manual constructor injection" mean?', options: ['Using reflection to set private fields', 'Passing a dependency (usually an interface) into a class through its constructor, written by hand in the composition root', 'Calling <code>new</code> inside the constructor', 'Using a static service locator'], answer: 1, why: 'The class declares what it needs as constructor parameters; the caller (composition root) decides and passes the implementation.' },
      { q: 'Why is a <code>FakeSender</code> useful?', options: ['It sends emails faster', 'It lets tests verify behaviour without real I/O by recording calls', 'It replaces the interface', 'It makes the class sealed'], answer: 1, why: 'Fakes implement the same interface but just record what happened, so tests are fast, deterministic and offline.' },
      { q: 'Which dependency is most worth putting behind an interface?', options: ['A pure function that adds two numbers', 'The system clock (<code>DateTime.Now</code>) used in billing rules', 'A private helper method', 'A string constant'], answer: 1, why: 'Time is I/O-like and non-deterministic. Injecting <code>TimeProvider</code> (or an <code>IClock</code>) lets tests control "now".' },
      { q: 'In ASP.NET Core, <code>builder.Services.AddScoped&lt;IMessageSender, EmailSender&gt;()</code> does what?', options: ['Creates an EmailSender immediately', 'Tells the DI container to pass an EmailSender wherever an IMessageSender is requested, one per request scope', 'Makes EmailSender a singleton', 'Registers a middleware'], answer: 1, why: 'The container becomes the composition root: it resolves constructor parameters by type, with the lifetime you chose.' },
      { q: 'Where should <code>new EmailSender()</code> appear in a well-structured app?', options: ['Inside every service that sends email', 'In the composition root (Program.cs / DI registration) only', 'In the interface', 'In a static field of WelcomeService'], answer: 1, why: 'Concrete choices are made in one place. Everything else depends on abstractions.' },
    ],
    exercise: window.csExercise({
      task: `<p><code>CheckoutService</code> creates its own <code>StripeGateway</code>, so it can't be tested without
      charging a real card. Introduce an <code>IPaymentGateway</code> interface, inject it through
      <code>CheckoutService</code>'s constructor, keep <code>StripeGateway</code> as one implementation, and add a
      <code>FakeGateway</code> that records charges. Use the fake in Program.cs. Edit the C# in the box below and click
      <strong>Check</strong>.</p>`,
      hint: 'interface IPaymentGateway { string Charge(string orderId, int amount); } class StripeGateway : IPaymentGateway {...} class FakeGateway : IPaymentGateway { public List<string> Charged { get; } = []; ... } class CheckoutService(IPaymentGateway gateway) {...}',
      starter: `var checkout = new CheckoutService();
Console.WriteLine(checkout.Pay("A-100", 40));
Console.WriteLine(checkout.Pay("A-101", 0));

class StripeGateway
{
  public string Charge(string orderId, int amount) => $"Stripe charged {amount} for {orderId}";
}

class CheckoutService
{
  private readonly StripeGateway _gateway = new StripeGateway(); // hard-wired!

  public string Pay(string orderId, int amount)
  {
    if (amount <= 0)
      return "Rejected: amount must be positive";

    return _gateway.Charge(orderId, amount);
  }
}`,
      solution: `var fake = new FakeGateway();
var checkout = new CheckoutService(fake);

Console.WriteLine(checkout.Pay("A-100", 40));
Console.WriteLine(checkout.Pay("A-101", 0));
Console.WriteLine(fake.Charged.Count == 1 ? "TEST PASSED" : "TEST FAILED");

interface IPaymentGateway
{
  string Charge(string orderId, int amount);
}

class StripeGateway : IPaymentGateway
{
  public string Charge(string orderId, int amount) => $"Stripe charged {amount} for {orderId}";
}

class FakeGateway : IPaymentGateway
{
  public List<string> Charged { get; } = [];

  public string Charge(string orderId, int amount)
  {
    Charged.Add(orderId);
    return $"Fake charged {amount} for {orderId}";
  }
}

class CheckoutService(IPaymentGateway gateway)
{
  public string Pay(string orderId, int amount)
  {
    if (amount <= 0)
      return "Rejected: amount must be positive";

    return gateway.Charge(orderId, amount);
  }
}`,
      checks: [
        { label: 'Declares interface IPaymentGateway', re: /interface\s+IPaymentGateway\b/ },
        { label: 'StripeGateway implements it', re: /class\s+StripeGateway\b[^{]*:\s*IPaymentGateway\b/ },
        { label: 'A Fake… gateway implements it', re: /class\s+Fake\w*[^{]*:\s*IPaymentGateway\b/ },
        { label: 'CheckoutService takes IPaymentGateway in its constructor', re: /CheckoutService\s*\(\s*IPaymentGateway\s+\w+/ },
        { label: 'No hard-wired StripeGateway field', re: /readonly\s+StripeGateway\b/, absent: true },
      ],
    }),
  },
);
