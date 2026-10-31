window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── DEPENDENCY INJECTION ─────────────────────────────
  {
    id: 'dependency-injection',
    section: 'Modern .NET patterns',
    title: 'Dependency Injection & lifetimes',
    explain: `
      <p><strong>Intent:</strong> a class <em>receives</em> the objects it depends on (usually through its constructor) instead of creating or looking them up itself. One place in the app, the <strong>composition root</strong>, decides which concrete classes to use.</p>
      <h3>The problem</h3>
      <pre><code>// ❌ before: hard-wired dependencies
public class CheckoutService
{
  private readonly SqlCartStore cart = new SqlCartStore("Server=prod;...");
  private readonly SmtpMailer mailer = new SmtpMailer("smtp.example.com");
}</code></pre>
      <p><code>CheckoutService</code> can't be tested without a database and a mail server. Switching to another mailer means editing it, and every class repeats the configuration.</p>
      <h3>The solution: constructor injection</h3>
      <pre><code>public class CheckoutService(ICart cart, IClock clock)   // "I need these"
{
  // uses cart and clock; never calls new on them
}

// composition root (Program.cs): the ONLY place that knows concrete types
var checkout = new CheckoutService(new Cart(), new SystemClock());</code></pre>
      <p>Wiring everything by hand ("pure DI") works fine for small apps. A <strong>DI container</strong> automates it: you <em>register</em> "interface → class + lifetime", and the container builds whole object graphs by looking at constructor parameters. In ASP.NET Core it's <code>Microsoft.Extensions.DependencyInjection</code>:</p>
      <pre><code>var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton&lt;IClock, SystemClock&gt;();   // one for the whole app
builder.Services.AddScoped&lt;ICart, Cart&gt;();             // one per HTTP request
builder.Services.AddTransient&lt;CheckoutService&gt;();        // new every time it's asked for
var app = builder.Build();

app.MapPost("/checkout", (CheckoutService checkout) =&gt; checkout.Run());   // injected per request</code></pre>
      <h3>Lifetimes</h3>
      <table>
        <tr><th>Lifetime</th><th>One instance per…</th><th>Typical use</th></tr>
        <tr><td><strong>Transient</strong></td><td>every resolve</td><td>lightweight, stateless services</td></tr>
        <tr><td><strong>Scoped</strong></td><td>scope (= one HTTP request in ASP.NET Core)</td><td><code>DbContext</code>, unit of work, per-request user context, a cart</td></tr>
        <tr><td><strong>Singleton</strong></td><td>the whole application</td><td>caches, configuration, <code>HttpClient</code> factories, clocks. Must be thread-safe!</td></tr>
      </table>
      <h3>The captive dependency bug</h3>
      <p>A service must not depend on something that lives <em>shorter</em> than itself. If a <strong>singleton</strong> takes a <strong>scoped</strong> <code>ICart</code> in its constructor, it grabs the cart of the <em>first</em> request and keeps it forever. Every later user shares that stale (even disposed) cart. Same story for a singleton holding a <code>DbContext</code>. ASP.NET Core turns on <code>ValidateScopes</code> in the Development environment, so this throws <code>InvalidOperationException: Cannot consume scoped service … from singleton …</code> at startup. That's why the bug often slips through in other environments.</p>
      <div class="tip">Rule of thumb: dependencies may only point to the <strong>same or longer</strong> lifetime. Transient → anything. Scoped → scoped or singleton. Singleton → singleton only. If a singleton really needs scoped work, inject <code>IServiceScopeFactory</code> and create a scope per operation.</div>
      <h3>DI vs Service Locator</h3>
      <pre><code>// Service Locator: the class pulls what it needs from a global registry
public class CheckoutService
{
  public void Run()
  {
    var cart = ServiceLocator.Get&lt;ICart&gt;();   // hidden dependency!
  }
}</code></pre>
      <p>It looks similar, but the dependencies are <strong>hidden</strong>. The constructor doesn't tell you what the class needs, tests must configure a global, and a missing registration only fails at runtime deep inside a method. With DI, dependencies are explicit in the constructor and the compiler helps you. Injecting <code>IServiceProvider</code> and calling <code>GetService</code> everywhere is Service Locator in disguise. Keep that to framework code and factories.</p>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Any app with several services, external resources (DB, HTTP, clock, file system) or tests. That's practically every ASP.NET Core, worker, or MAUI app.</li>
        <li>❌ Don't inject simple value objects or helpers with no dependencies (<code>Money</code>, <code>StringBuilder</code>). Just <code>new</code> them.</li>
        <li>❌ Avoid constructors with 8+ parameters. That's a sign the class does too much, and the container just hides the pain.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: a tiny hand-rolled DI container (how MS.DI works)',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`. No NuGet: the container is ~50 lines of reflection.',
        code: `var container = new MiniContainer();
container.Register<IClock, SystemClock>(Lifetime.Singleton);
container.Register<ICart, Cart>(Lifetime.Scoped);
container.Register<CheckoutService, CheckoutService>(Lifetime.Transient);
container.Register<PromoEngine, PromoEngine>(Lifetime.Singleton);  // BUG: needs a scoped ICart

Console.WriteLine("--- request 1 (scope 1) ---");
using (var scope = container.CreateScope())
{
  var c1 = scope.Resolve<CheckoutService>();
  var c2 = scope.Resolve<CheckoutService>();
  Console.WriteLine($"c1={c1} c2={c2}");
  Console.WriteLine($"same cart: {c1.Cart == c2.Cart}, same clock: {c1.Clock == c2.Clock}");
  Console.WriteLine($"promo uses {scope.Resolve<PromoEngine>().Cart}");
}

Console.WriteLine("--- request 2 (scope 2) ---");
using (var scope = container.CreateScope())
{
  var c3 = scope.Resolve<CheckoutService>();
  Console.WriteLine($"c3 uses {c3.Cart} and {c3.Clock}");
  var promo = scope.Resolve<PromoEngine>();
  Console.WriteLine($"promo uses {promo.Cart} (disposed: {promo.Cart.IsDisposed})  <-- captive!");
}

Console.WriteLine("--- same registrations, ValidateScopes = true ---");
var strict = new MiniContainer { ValidateScopes = true };
strict.Register<ICart, Cart>(Lifetime.Scoped);
strict.Register<PromoEngine, PromoEngine>(Lifetime.Singleton);
try
{
  using var scope = strict.CreateScope();
  scope.Resolve<PromoEngine>();
}
catch (InvalidOperationException ex)
{
  Console.WriteLine($"error: {ex.Message}");
}

public enum Lifetime { Transient, Scoped, Singleton }

public class MiniContainer
{
  private readonly Dictionary<Type, (Type Impl, Lifetime Life)> registrations = [];
  private readonly Dictionary<Type, object> singletons = [];
  private Type? buildingSingleton;

  public bool ValidateScopes { get; init; }

  public void Register<TService, TImpl>(Lifetime life) where TImpl : class, TService =>
    registrations[typeof(TService)] = (typeof(TImpl), life);

  public Scope CreateScope() => new(this);

  internal object Resolve(Type service, Scope scope)
  {
    var (impl, life) = registrations[service];
    switch (life)
    {
      case Lifetime.Singleton:                                   // ① one per container
        if (!singletons.TryGetValue(service, out var single))
        {
          var previous = buildingSingleton;
          buildingSingleton = service;
          singletons[service] = single = Create(impl, scope);
          buildingSingleton = previous;
        }
        return single;

      case Lifetime.Scoped:                                      // ② one per scope
        if (ValidateScopes && buildingSingleton is not null)
          throw new InvalidOperationException(
            $"Cannot consume scoped service '{service.Name}' from singleton '{buildingSingleton.Name}'.");
        if (!scope.Instances.TryGetValue(service, out var scoped))
          scope.Instances[service] = scoped = Create(impl, scope);
        return scoped;

      default:                                                   // ③ new every time
        return Create(impl, scope);
    }
  }

  // Constructor injection: resolve every parameter, then call the constructor
  private object Create(Type impl, Scope scope)
  {
    var ctor = impl.GetConstructors().Single();
    var args = ctor.GetParameters().Select(p => Resolve(p.ParameterType, scope)).ToArray();
    var instance = ctor.Invoke(args);
    Console.WriteLine($"  new {instance}");
    return instance;
  }
}

public sealed class Scope(MiniContainer root) : IDisposable
{
  internal Dictionary<Type, object> Instances { get; } = [];

  public T Resolve<T>() => (T)root.Resolve(typeof(T), this);

  public void Dispose()
  {
    foreach (var d in Instances.Values.OfType<IDisposable>())
      d.Dispose();
  }
}

// ── services (every instance gets a number so we can see sharing) ──
public abstract class Tracked
{
  private static int next;
  public int Id { get; } = ++next;
  public override string ToString() => $"{GetType().Name}#{Id}";
}

public interface IClock;
public interface ICart
{
  bool IsDisposed { get; }
}

public class SystemClock : Tracked, IClock;

public class Cart : Tracked, ICart, IDisposable
{
  public bool IsDisposed { get; private set; }

  public void Dispose()
  {
    IsDisposed = true;
    Console.WriteLine($"  dispose {this}");
  }
}

public class CheckoutService(ICart cart, IClock clock) : Tracked
{
  public ICart Cart => cart;
  public IClock Clock => clock;
}

public class PromoEngine(ICart cart) : Tracked
{
  public ICart Cart => cart;
}`,
        output: `--- request 1 (scope 1) ---
  new Cart#1
  new SystemClock#2
  new CheckoutService#3
  new CheckoutService#4
c1=CheckoutService#3 c2=CheckoutService#4
same cart: True, same clock: True
  new PromoEngine#5
promo uses Cart#1
  dispose Cart#1
--- request 2 (scope 2) ---
  new Cart#6
  new CheckoutService#7
c3 uses Cart#6 and SystemClock#2
promo uses Cart#1 (disposed: True)  <-- captive!
  dispose Cart#6
--- same registrations, ValidateScopes = true ---
error: Cannot consume scoped service 'ICart' from singleton 'PromoEngine'.`,
        explain: `
          <details>
            <summary>How the container builds an object graph</summary>
            <p><code>scope.Resolve&lt;CheckoutService&gt;()</code> starts a recursive walk. <code>Create</code> asks reflection for the constructor <code>(ICart cart, IClock clock)</code> and resolves each parameter <em>first</em>. That's why the numbers run from the inside out:</p>
            <table>
              <tr><th>#</th><th>Resolving</th><th>Lifetime rule</th><th>Console</th></tr>
              <tr><td>1</td><td><code>CheckoutService</code> → needs <code>ICart</code>, <code>IClock</code></td><td>transient: always create, but resolve params first</td><td></td></tr>
              <tr><td>2</td><td><code>ICart</code></td><td>scoped: not in <code>scope.Instances</code> yet → create, store</td><td><code>new Cart#1</code></td></tr>
              <tr><td>3</td><td><code>IClock</code></td><td>singleton: not in <code>singletons</code> → create, store</td><td><code>new SystemClock#2</code></td></tr>
              <tr><td>4</td><td><code>ctor.Invoke([Cart#1, SystemClock#2])</code></td><td></td><td><code>new CheckoutService#3</code></td></tr>
              <tr><td>5</td><td>second <code>Resolve&lt;CheckoutService&gt;()</code></td><td>cart found in scope, clock found in singletons. Only the transient is new.</td><td><code>new CheckoutService#4</code></td></tr>
            </table>
            <p>That's all <code>Microsoft.Extensions.DependencyInjection</code> does at its core: a dictionary of registrations, caches per lifetime, and constructor parameters resolved recursively. The real one adds compiled expression trees for speed, <code>IEnumerable&lt;T&gt;</code> for multiple registrations, open generics, and disposal of transients.</p>
          </details>
          <details>
            <summary>Step by step: the captive dependency</summary>
            <table>
              <tr><th>When</th><th>What happens</th><th>Console</th></tr>
              <tr><td>scope 1</td><td><code>PromoEngine</code> is a singleton, created now. Its constructor needs <code>ICart</code> → gets <strong>scope 1's</strong> Cart#1.</td><td><code>new PromoEngine#5</code>, <code>promo uses Cart#1</code></td></tr>
              <tr><td>end of scope 1</td><td><code>Scope.Dispose</code> disposes its scoped instances</td><td><code>dispose Cart#1</code></td></tr>
              <tr><td>scope 2</td><td>CheckoutService gets a fresh Cart#6 ✅</td><td><code>c3 uses Cart#6…</code></td></tr>
              <tr><td>scope 2</td><td>PromoEngine is cached, so it is <strong>not</strong> rebuilt. It still holds Cart#1: another user's cart, already disposed ❌</td><td><code>promo uses Cart#1 (disposed: True)</code></td></tr>
            </table>
            <p>Nothing crashes, which makes this bug dangerous. In a web app, user B sees user A's cart, or a disposed <code>DbContext</code> throws <code>ObjectDisposedException</code> hours later.</p>
          </details>
          <details>
            <summary>The fix: validate scopes (or fix the lifetimes)</summary>
            <pre><code>case Lifetime.Scoped:
  if (ValidateScopes &amp;&amp; buildingSingleton is not null)       // ① are we inside a singleton's constructor?
    throw new InvalidOperationException(...);                  // ② fail fast, at first resolve
</code></pre>
            <ol>
              <li><strong>①</strong> While a singleton is being built, <code>buildingSingleton</code> holds its type. Any scoped resolve during that time would be captured forever.</li>
              <li><strong>②</strong> So the container refuses. The last block of output shows the message, worded like the real one from MS.DI.</li>
            </ol>
            <p>The real container: <code>builder.Host.UseDefaultServiceProvider(o =&gt; { o.ValidateScopes = true; o.ValidateOnBuild = true; })</code>. Both are on by default in Development. To actually <em>fix</em> it, make <code>PromoEngine</code> scoped, or pass the cart as a method argument (<code>promo.Apply(cart)</code>) instead of a constructor dependency.</p>
            <div class="warn">The real MS.DI resolves a singleton's dependencies from the <em>root</em> scope, not the current request's scope, so you'd capture a root-level cart that is never disposed. The details differ but the bug is the same: one long-lived object shared by everyone.</div>
          </details>
          <details>
            <summary>Try it in the widget below</summary>
            <p>Click <b>Begin request</b>, resolve CheckoutService twice and PromoEngine once, <b>End request</b>, then repeat. You'll reproduce the instance numbers above. Then tick <em>ValidateScopes</em>, or change PromoEngine to Scoped, and see the bug disappear.</p>
          </details>
        `,
      },
      {
        title: 'Widget: lifetimes, scopes and the captive dependency',
        lang: 'html',
        code: `<style>
.di { font-size: 14px; }
.di .hint { color: #555; margin: 0 0 6px; }
.di table { border-collapse: collapse; width: 100%; font-size: 13px; }
.di td, .di th { border-bottom: 1px solid #eef0f5; padding: 2px 6px; text-align: left; }
.di th { font-size: 12px; color: #666; font-weight: 600; }
.di .mono { font-family: ui-monospace, Menlo, monospace; font-size: 12px; }
.di .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.di .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.di .panel { border: 2px solid #dde3ee; border-radius: 10px; padding: 4px 8px; min-height: 56px; }
.di .panel h4 { margin: 0 0 2px; font-size: 12.5px; }
.di .panel.live { border-color: #0ea5e9; }
.di .chip { display: inline-block; padding: 0 7px; margin: 2px; border-radius: 12px; font: 12px ui-monospace, Menlo, monospace;
  border: 1px solid; }
.di .Singleton { background: #f3e8ff; border-color: #a855f7; }
.di .Scoped { background: #e0f2fe; border-color: #0ea5e9; }
.di .Transient { background: #fef9c3; border-color: #ca8a04; }
.di .chip.dead { text-decoration: line-through; opacity: .55; }
.di .sub { font-size: 11.5px; color: #777; }
.di .graph { font: 12px ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 4px 8px; margin-top: 6px; }
.di .alert { border-radius: 8px; padding: 5px 8px; margin-top: 6px; font-size: 13px; display: none; }
.di .alert.amber { display: block; background: #fff7e6; border: 1px solid #f0b44c; color: #7a4b00; }
.di .alert.red { display: block; background: #fdecec; border: 1px solid #fca5a5; color: #991b1b; }
.di .log { font: 12px/1.4 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 92px; overflow: auto; padding: 4px 8px; white-space: pre; margin-top: 6px; }
</style>
<div class="di">
  <p class="hint">Set lifetimes, click <b>Begin request</b>, resolve services, end the request and begin another. Instance numbers show what is shared.</p>
  <table>
    <tr><th>service</th><th>implementation</th><th>constructor needs</th><th>lifetime</th></tr>
    <tbody id="reg"></tbody>
  </table>
  <div class="ctl">
    <button id="begin">Begin request</button>
    <button id="rc">Resolve CheckoutService</button>
    <button id="rp">Resolve PromoEngine</button>
    <button id="end">End request</button>
    <label><input type="checkbox" id="validate"> ValidateScopes</label>
    <button id="reset">Reset container</button>
  </div>
  <div class="cols">
    <div class="panel"><h4>Root: singletons</h4><div id="pRoot"></div></div>
    <div class="panel" id="pScopeBox"><h4 id="scopeTitle">No active request</h4><div id="pScope"></div></div>
  </div>
  <div class="sub" id="ended"></div>
  <div class="graph" id="graph">last resolve: (none)</div>
  <div class="alert" id="alert"></div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var REG = [
  { key: 'IClock', impl: 'SystemClock', deps: [], life: 'Singleton' },
  { key: 'ICart', impl: 'Cart', deps: [], life: 'Scoped' },
  { key: 'CheckoutService', impl: 'CheckoutService', deps: ['ICart', 'IClock'], life: 'Transient' },
  { key: 'PromoEngine', impl: 'PromoEngine', deps: ['ICart'], life: 'Singleton' },
];
var S;

function reg(key) { return REG.filter(function (r) { return r.key === key; })[0]; }

function log(t) {
  var d = document.createElement('div');
  d.textContent = t;
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(t);
}

function label(i) { return i.name + '#' + i.id; }

function chip(i) {
  var c = document.createElement('span');
  c.className = 'chip ' + i.life + (i.disposed ? ' dead' : '');
  c.textContent = label(i);
  c.title = i.life + (i.scope ? ' (scope ' + i.scope.no + ')' : '');
  return c;
}

function reset(msg) {
  S = { next: 1, singletons: {}, scope: null, scopeNo: 0, ended: [] };
  $('graph').textContent = 'last resolve: (none)';
  $('alert').className = 'alert';
  if (msg) log('--- ' + msg + ' ---');
  render();
}

function buildReg() {
  var tb = $('reg');
  tb.innerHTML = '';
  REG.forEach(function (r) {
    var tr = document.createElement('tr');
    var sel = document.createElement('select');
    ['Transient', 'Scoped', 'Singleton'].forEach(function (l) {
      var o = document.createElement('option');
      o.textContent = l;
      if (l === r.life) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = function () { r.life = sel.value; reset('container rebuilt: ' + r.key + ' is now ' + r.life); };
    var cells = [r.key, r.impl, r.deps.length ? r.deps.join(', ') : '()'];
    cells.forEach(function (t) {
      var td = document.createElement('td');
      td.className = 'mono';
      td.textContent = t;
      tr.appendChild(td);
    });
    var td4 = document.createElement('td');
    td4.appendChild(sel);
    tr.appendChild(td4);
    tb.appendChild(tr);
  });
}

function render() {
  var root = $('pRoot');
  root.innerHTML = '';
  Object.keys(S.singletons).forEach(function (k) { root.appendChild(chip(S.singletons[k])); });
  var sc = $('pScope');
  sc.innerHTML = '';
  if (S.scope) {
    $('scopeTitle').textContent = 'Scope ' + S.scope.no + ' (current request)';
    $('pScopeBox').classList.add('live');
    Object.keys(S.scope.inst).forEach(function (k) { sc.appendChild(chip(S.scope.inst[k])); });
    if (S.scope.transients.length) {
      var s = document.createElement('div');
      s.className = 'sub';
      s.textContent = 'transients created in this request (not cached):';
      sc.appendChild(s);
      S.scope.transients.forEach(function (t) { sc.appendChild(chip(t)); });
    }
  } else {
    $('scopeTitle').textContent = 'No active request';
    $('pScopeBox').classList.remove('live');
  }
  var e = $('ended');
  e.innerHTML = '';
  if (S.ended.length) {
    e.appendChild(document.createTextNode('ended requests: '));
    S.ended.forEach(function (sc2) {
      e.appendChild(document.createTextNode(' scope ' + sc2.no + ': '));
      Object.keys(sc2.inst).forEach(function (k) { e.appendChild(chip(sc2.inst[k])); });
    });
  }
  ['rc', 'rp', 'end'].forEach(function (id) { $(id).disabled = !S.scope; });
  $('begin').disabled = !!S.scope;
}

function create(r, building) {
  var deps = r.deps.map(function (d) { return resolve(d, building); });
  var inst = { name: r.impl, id: S.next++, life: r.life, scope: r.life === 'Scoped' ? S.scope : null, deps: deps, disposed: false };
  log('  new ' + label(inst));
  return inst;
}

function resolve(key, building) {
  var r = reg(key);
  if (r.life === 'Singleton') {
    if (!S.singletons[key]) S.singletons[key] = create(r, key);
    return S.singletons[key];
  }
  if (r.life === 'Scoped') {
    if ($('validate').checked && building) {
      throw new Error("Cannot consume scoped service '" + key + "' from singleton '" + building + "'.");
    }
    if (!S.scope.inst[key]) S.scope.inst[key] = create(r, building);
    return S.scope.inst[key];
  }
  var t = create(r, building);
  if (!building) S.scope.transients.push(t);
  return t;
}

function describe(i) {
  var s = label(i) + ' [' + i.life + (i.scope ? ', scope ' + i.scope.no : '') + (i.disposed ? ', DISPOSED' : '') + ']';
  if (!i.deps.length) return s;
  return s + ' { ' + i.deps.map(describe).join(', ') + ' }';
}

function findCaptive(i, owner) {
  // owner = nearest singleton above us in the graph
  var o = i.life === 'Singleton' ? i : owner;
  for (var k = 0; k < i.deps.length; k++) {
    var d = i.deps[k];
    if (o && d.life !== 'Singleton') return { owner: o, dep: d };
    var deeper = findCaptive(d, o);
    if (deeper) return deeper;
  }
  return null;
}

function doResolve(key) {
  var a = $('alert');
  a.className = 'alert';
  try {
    var inst = resolve(key, null);
    log('resolved ' + key + ' -> ' + label(inst));
    $('graph').textContent = 'last resolve: ' + describe(inst);
    var cap = findCaptive(inst, null);
    if (cap) {
      var stale = cap.dep.disposed || (cap.dep.scope && cap.dep.scope !== S.scope);
      a.className = 'alert ' + (stale ? 'red' : 'amber');
      a.textContent = stale
        ? '⚠ Captive dependency: ' + label(cap.owner) + ' (Singleton) still holds ' + label(cap.dep) +
          (cap.dep.scope ? ' from scope ' + cap.dep.scope.no : '') + (cap.dep.disposed ? ', which is DISPOSED' : '') +
          '. Every request now shares it.'
        : '⚠ ' + label(cap.owner) + ' (Singleton) just captured ' + label(cap.dep) + ' (' + cap.dep.life +
          '). It will keep it after this request ends.';
    } else if (reg('ICart').life === 'Singleton') {
      a.className = 'alert amber';
      a.textContent = 'Note: Cart is a Singleton, so every user shares one cart. No captive bug, but probably wrong for a cart!';
    }
  } catch (e) {
    log('error: ' + e.message);
    a.className = 'alert red';
    a.textContent = 'InvalidOperationException: ' + e.message;
  }
  render();
}

$('begin').onclick = function () {
  S.scopeNo++;
  S.scope = { no: S.scopeNo, inst: {}, transients: [] };
  log('--- request ' + S.scopeNo + ' (scope ' + S.scopeNo + ') ---');
  render();
};
$('end').onclick = function () {
  Object.keys(S.scope.inst).forEach(function (k) {
    var i = S.scope.inst[k];
    if (i.name === 'Cart') {
      i.disposed = true;
      log('  dispose ' + label(i));
    }
  });
  S.ended.push(S.scope);
  S.scope = null;
  render();
};
$('rc').onclick = function () { doResolve('CheckoutService'); };
$('rp').onclick = function () { doResolve('PromoEngine'); };
$('reset').onclick = function () { reset('container reset'); };
$('validate').onchange = function () { reset('container rebuilt, ValidateScopes = ' + $('validate').checked); };

buildReg();
reset(null);
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li><b>Begin request</b> → <b>Resolve CheckoutService</b> twice → <b>Resolve PromoEngine</b> → <b>End request</b>. The log matches the C# output (Cart#1, SystemClock#2, CheckoutService#3/#4, PromoEngine#5). An amber warning appears when the singleton captures the cart.</li>
              <li><b>Begin request</b> again → resolve both. CheckoutService gets Cart#6, but PromoEngine still shows the crossed-out Cart#1. The red alert is the captive dependency.</li>
              <li>Tick <em>ValidateScopes</em> (this rebuilds the container), begin a request and resolve PromoEngine: you get the same exception text as the last line of the C# program.</li>
              <li>Fix it for real: set PromoEngine to <em>Scoped</em>. Each request now gets its own PromoEngine and cart.</li>
              <li>Set Cart to <em>Singleton</em> to see a different mistake: no captive bug, but every user shares one cart.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In ASP.NET Core, what does <code>AddScoped&lt;ICart, Cart&gt;()</code> mean?',
        options: ['A new Cart every time it is injected', 'One Cart per HTTP request, shared by everything in that request', 'One Cart for the whole application', 'Cart is created only when the app starts'],
        answer: 1,
        why: 'Scoped = one instance per scope, and ASP.NET Core creates one scope per request. Transient would be "every time", singleton "whole app".',
      },
      {
        q: 'A singleton <code>ReportCache</code> takes <code>AppDbContext</code> (scoped) in its constructor. What is this?',
        options: ['Fine, DbContext is thread-safe', 'A captive dependency: one DbContext gets trapped inside the singleton and shared by every request', 'A Service Locator', 'An adapter'],
        answer: 1,
        why: 'The longer-lived singleton captures a shorter-lived scoped service. DbContext isn\'t thread-safe and isn\'t meant to live forever, so concurrent requests will corrupt it or hit ObjectDisposedException.',
      },
      {
        q: 'Why is Service Locator (<code>ServiceLocator.Get&lt;T&gt;()</code> inside methods) considered an anti-pattern?',
        options: ['It is slower than DI', 'Dependencies are hidden: the constructor doesn\'t show them, tests must set up a global, and missing registrations fail late', 'It can\'t resolve interfaces', 'It only works with singletons'],
        answer: 1,
        why: 'With constructor injection the class declares what it needs. A locator hides that, so you only find out at runtime, deep inside a method.',
      },
      {
        q: 'What is the "composition root"?',
        options: ['The base class of all services', 'The one place near the app entry point (Program.cs) where concrete types are chosen and wired together', 'The root folder of the solution', 'The first scope created'],
        answer: 1,
        why: 'Only the composition root knows concrete classes (<code>builder.Services.Add…</code> or manual <code>new</code>). Everything else depends on abstractions.',
      },
      {
        q: 'Which dependency direction is SAFE?',
        options: ['Singleton → Scoped', 'Singleton → Transient that holds a DbContext', 'Scoped → Singleton', 'Singleton → per-request user context'],
        answer: 2,
        why: 'Depending on something that lives the same time or longer is safe. A scoped service using a singleton clock or cache is the normal case.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>OrderService</code> pulls its email sender from a global <code>ServiceLocator</code>. Refactor to <strong>constructor injection</strong>: <code>OrderService</code> receives an <code>IEmailSender</code>; the top-level code (composition root) does <code>new OrderService(new SmtpEmailSender())</code>; add a <code>FakeEmailSender : IEmailSender</code> that records messages so a "test" can check them. Remove all <code>ServiceLocator.Get</code> calls. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'public class OrderService(IEmailSender email) { public void Place(string id) => email.Send(...); }  and  class FakeEmailSender : IEmailSender { public List&lt;string&gt; Sent { get; } = []; ... }',
      starter: `var service = new OrderService();
service.Place("A-1");

public interface IEmailSender
{
  void Send(string to, string body);
}

public class SmtpEmailSender : IEmailSender
{
  public void Send(string to, string body) => Console.WriteLine($"SMTP to {to}: {body}");
}

public static class ServiceLocator
{
  private static readonly Dictionary<Type, object> services = new()
  {
    [typeof(IEmailSender)] = new SmtpEmailSender(),
  };

  public static T Get<T>() => (T)services[typeof(T)];
}

// TODO: stop pulling the dependency from the ServiceLocator
public class OrderService
{
  public void Place(string orderId)
  {
    var email = ServiceLocator.Get<IEmailSender>();
    email.Send("customer@example.com", $"Order {orderId} placed");
  }
}`,
      solution: `// Composition root: the only place that picks concrete classes
var service = new OrderService(new SmtpEmailSender());
service.Place("A-1");

// A "test": swap in a fake without touching OrderService
var fake = new FakeEmailSender();
new OrderService(fake).Place("T-1");
Console.WriteLine($"fake recorded {fake.Sent.Count} message(s): {fake.Sent[0]}");

public interface IEmailSender
{
  void Send(string to, string body);
}

public class SmtpEmailSender : IEmailSender
{
  public void Send(string to, string body) => Console.WriteLine($"SMTP to {to}: {body}");
}

public class FakeEmailSender : IEmailSender
{
  public List<string> Sent { get; } = [];

  public void Send(string to, string body) => Sent.Add($"{to}: {body}");
}

public class OrderService(IEmailSender email)
{
  public void Place(string orderId) =>
    email.Send("customer@example.com", $"Order {orderId} placed");
}`,
      checks: [
        { label: 'OrderService receives IEmailSender in its constructor', re: /OrderService\s*\(\s*IEmailSender\s+\w+\s*\)/ },
        { label: 'No ServiceLocator.Get calls left', re: /ServiceLocator\s*\.\s*Get/, absent: true },
        { label: 'FakeEmailSender implements IEmailSender', re: /class\s+FakeEmailSender\b[^{]*:\s*IEmailSender\b/ },
        { label: 'Composition root: new OrderService(new SmtpEmailSender())', re: /new\s+OrderService\s*\(\s*new\s+SmtpEmailSender\s*\(/ },
      ],
    }),
  },

  // ───────────────────────────── REPOSITORY + UNIT OF WORK ─────────────────────────────
  {
    id: 'repository-unit-of-work',
    section: 'Modern .NET patterns',
    title: 'Repository & Unit of Work',
    explain: `
      <p><strong>Repository intent:</strong> give domain code a collection-like interface (<code>Get</code>, <code>Add</code>, <code>Remove</code>) for one kind of entity, hiding how it's stored.<br>
      <strong>Unit of Work intent:</strong> track every change made during one business operation and save them <em>together</em>: all succeed or none do.</p>
      <h3>The problem</h3>
      <p>Placing an order must (1) insert an <code>Order</code> and (2) decrease the product's stock. If step 2 fails (stock would go negative) after step 1 was already saved, you have an order for goods you don't have. Meanwhile, SQL strings and connection handling are scattered through your services, and nothing can be tested without a database.</p>
      <h3>The solution</h3>
      <pre><code>public interface IRepository&lt;T&gt; where T : IEntity
{
  T? Get(int id);
  void Add(T entity);
  void Update(T entity);
}

public class UnitOfWork
{
  public IRepository&lt;Product&gt; Products { get; }
  public IRepository&lt;Order&gt; Orders { get; }
  public void Commit();   // apply all staged changes atomically, or roll back
}</code></pre>
      <ul>
        <li>Repositories <strong>stage</strong> changes in the unit of work instead of writing immediately.</li>
        <li><code>Commit()</code> applies everything in one transaction. Any failure rolls back all of it.</li>
        <li>Services depend on <code>IRepository&lt;T&gt;</code>, so tests use an in-memory implementation.</li>
      </ul>
      <h3>EF Core already is both</h3>
      <pre><code>public async Task PlaceOrder(AppDbContext db, int productId, int qty)
{
  var product = await db.Products.FindAsync(productId);   // DbSet&lt;Product&gt; ≈ repository
  product!.Stock -= qty;                                   // change tracker notices
  db.Orders.Add(new Order { ProductId = productId, Qty = qty });
  await db.SaveChangesAsync();                             // DbContext ≈ unit of work: one transaction
}</code></pre>
      <p><code>DbSet&lt;T&gt;</code> is a repository and <code>DbContext</code> is a unit of work (its change tracker stages, and <code>SaveChanges</code> commits in a transaction). So there's a long-running debate:</p>
      <ul>
        <li><strong>Don't wrap EF</strong>: a generic <code>IRepository&lt;T&gt;</code> over <code>DbSet&lt;T&gt;</code> often just forwards calls, hides useful features (<code>Include</code>, projections, <code>AsNoTracking</code>), and leaks <code>IQueryable</code> anyway. Use the <code>DbContext</code> directly in application services and test with SQLite in-memory or Testcontainers.</li>
        <li><strong>Do wrap</strong>, with <em>specific</em> repositories (<code>IOrderRepository.GetPendingForCustomer(id)</code>) when you follow Domain-Driven Design, want to keep EF out of the domain layer, or might switch storage.</li>
      </ul>
      <div class="tip">If you write a repository, prefer intention-revealing methods (<code>FindOverdueInvoices()</code>) over a generic CRUD interface that every entity must implement.</div>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Multiple writes that must succeed together. Storage you want to hide or swap (files, an HTTP API, Dapper SQL).</li>
        <li>❌ A thin generic wrapper around EF Core "just because". You pay for it in features and indirection.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: in-memory repositories + atomic commit / rollback',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var db = new FakeDb();
db.Products.Seed(new Product(1, "Keyboard", Stock: 5));
db.Products.Seed(new Product(2, "Mouse", Stock: 1));
db.Print();

Console.WriteLine("--- order 100: 2 x Keyboard ---");
PlaceOrder(db, orderId: 100, productId: 1, qty: 2);
db.Print();

Console.WriteLine("--- order 101: 3 x Mouse (only 1 in stock) ---");
PlaceOrder(db, orderId: 101, productId: 2, qty: 3);
db.Print();

static void PlaceOrder(FakeDb db, int orderId, int productId, int qty)
{
  var uow = new UnitOfWork(db);
  var product = uow.Products.Get(productId)!;
  uow.Orders.Add(new Order(orderId, productId, qty));
  uow.Products.Update(product with { Stock = product.Stock - qty });
  Console.WriteLine($"  orders in DB before commit: {db.Orders.Count}");
  uow.Commit();
}

public interface IEntity
{
  int Id { get; }
}

public record Product(int Id, string Name, int Stock) : IEntity;
public record Order(int Id, int ProductId, int Qty) : IEntity;

// Repository: collection-like access to one entity type
public interface IRepository<T> where T : IEntity
{
  T? Get(int id);
  void Add(T entity);
  void Update(T entity);
}

// Reads come from committed data; writes are only STAGED in the unit of work
public class Repository<T>(Table<T> table, UnitOfWork uow) : IRepository<T> where T : IEntity
{
  public T? Get(int id) => table.Find(id);
  public void Add(T entity) => uow.Stage($"INSERT {typeof(T).Name} {entity.Id}", () => table.Upsert(entity));
  public void Update(T entity) => uow.Stage($"UPDATE {typeof(T).Name} {entity.Id}", () => table.Upsert(entity));
}

// Unit of Work: collects changes, then commits all of them or none
public class UnitOfWork
{
  private readonly FakeDb db;
  private readonly List<(string Sql, Action Apply)> pending = [];

  public UnitOfWork(FakeDb db)
  {
    this.db = db;
    Products = new Repository<Product>(db.Products, this);
    Orders = new Repository<Order>(db.Orders, this);
  }

  public IRepository<Product> Products { get; }
  public IRepository<Order> Orders { get; }

  internal void Stage(string sql, Action apply)
  {
    pending.Add((sql, apply));
    Console.WriteLine($"  staged: {sql}");
  }

  public void Commit()
  {
    var products = db.Products.Snapshot();                 // ① remember current state
    var orders = db.Orders.Snapshot();
    try
    {
      foreach (var (_, apply) in pending)                  // ② apply every change
        apply();
      Console.WriteLine($"  COMMIT: {pending.Count} change(s) saved");
    }
    catch (InvalidOperationException ex)
    {
      db.Products.Restore(products);                       // ③ any failure: undo ALL
      db.Orders.Restore(orders);
      Console.WriteLine($"  ROLLBACK: {ex.Message}");
    }
    pending.Clear();
  }
}

// ── a tiny fake database: tables with an optional CHECK constraint ──
public class Table<T>(Func<T, bool>? check = null) where T : IEntity
{
  private Dictionary<int, T> rows = [];

  public int Count => rows.Count;
  public IEnumerable<T> All => rows.Values;
  public T? Find(int id) => rows.GetValueOrDefault(id);
  public void Seed(T entity) => rows[entity.Id] = entity;

  public void Upsert(T entity)
  {
    if (check is not null && !check(entity))
      throw new InvalidOperationException($"CHECK constraint failed on {typeof(T).Name} {entity.Id}");
    rows[entity.Id] = entity;
  }

  public Dictionary<int, T> Snapshot() => new(rows);
  public void Restore(Dictionary<int, T> snapshot) => rows = snapshot;
}

public class FakeDb
{
  public Table<Product> Products { get; } = new(p => p.Stock >= 0);
  public Table<Order> Orders { get; } = new();

  public void Print()
  {
    var products = string.Join(", ", Products.All.Select(p => $"{p.Name}={p.Stock}"));
    var orders = Orders.Count == 0
      ? "(none)"
      : string.Join(", ", Orders.All.Select(o => $"#{o.Id}: {o.Qty} x product {o.ProductId}"));
    Console.WriteLine($"DB products: {products}");
    Console.WriteLine($"DB orders:   {orders}");
  }
}`,
        output: `DB products: Keyboard=5, Mouse=1
DB orders:   (none)
--- order 100: 2 x Keyboard ---
  staged: INSERT Order 100
  staged: UPDATE Product 1
  orders in DB before commit: 0
  COMMIT: 2 change(s) saved
DB products: Keyboard=3, Mouse=1
DB orders:   #100: 2 x product 1
--- order 101: 3 x Mouse (only 1 in stock) ---
  staged: INSERT Order 101
  staged: UPDATE Product 2
  orders in DB before commit: 1
  ROLLBACK: CHECK constraint failed on Product 2
DB products: Keyboard=3, Mouse=1
DB orders:   #100: 2 x product 1`,
        explain: `
          <details>
            <summary>The problem: half-saved operations</summary>
            <p>Imagine each repository call wrote to the database immediately:</p>
            <table>
              <tr><th>Step</th><th>Call</th><th>DB afterwards</th></tr>
              <tr><td>1</td><td><code>Orders.Add(#101: 3 x Mouse)</code></td><td>order #101 saved</td></tr>
              <tr><td>2</td><td><code>Products.Update(Mouse, Stock = -2)</code></td><td>❌ CHECK fails, throws</td></tr>
              <tr><td>result</td><td></td><td><strong>Order #101 exists but stock never changed</strong>. You've sold three mice you don't have.</td></tr>
            </table>
            <p>The unit of work exists to prevent exactly this.</p>
          </details>
          <details>
            <summary>Step by step: order 101 with the Unit of Work</summary>
            <table>
              <tr><th>Step</th><th>What happens</th><th>Real DB</th><th>Console</th></tr>
              <tr><td>1</td><td><code>Orders.Add</code> → <code>uow.Stage(...)</code>. Only a lambda is stored.</td><td>unchanged</td><td><code>staged: INSERT Order 101</code></td></tr>
              <tr><td>2</td><td><code>Products.Update</code> → staged</td><td>unchanged</td><td><code>staged: UPDATE Product 2</code></td></tr>
              <tr><td>3</td><td>check the DB before committing</td><td>still 1 order</td><td><code>orders in DB before commit: 1</code></td></tr>
              <tr><td>4</td><td>① <code>Commit</code> snapshots both tables</td><td>unchanged</td><td></td></tr>
              <tr><td>5</td><td>② apply INSERT Order 101</td><td>temporarily 2 orders</td><td></td></tr>
              <tr><td>6</td><td>② apply UPDATE Mouse → Stock -2 → <code>check</code> throws</td><td></td><td></td></tr>
              <tr><td>7</td><td>③ catch → restore both snapshots</td><td>back to 1 order, Mouse=1</td><td><code>ROLLBACK: CHECK constraint failed on Product 2</code></td></tr>
            </table>
            <p>Order 100 went through the same steps without an exception, so it ended with <code>COMMIT: 2 change(s) saved</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>public void Add(T entity) =&gt;
  uow.Stage($"INSERT …", () =&gt; table.Upsert(entity));   // ① defer the write as a lambda

foreach (var (_, apply) in pending) apply();             // ② run them all at commit time
catch (InvalidOperationException) { …Restore(…); }      // ③ all or nothing</code></pre>
            <ol>
              <li><strong>①</strong> The repository doesn't write. It hands the unit of work a <em>deferred</em> action. That's the same idea as EF Core's change tracker.</li>
              <li><strong>②</strong> All changes run at commit time, in the order they were staged.</li>
              <li><strong>③</strong> Snapshots stand in for a database transaction. In real code you'd use <code>BeginTransaction</code>/<code>Commit</code>/<code>Rollback</code>, or let <code>SaveChanges</code> do it.</li>
            </ol>
            <div class="warn">Notice <code>Get</code> reads <em>committed</em> data. If you staged an update and then call <code>Get</code> again, you'd see the old value. EF Core solves this with an identity map: the same tracked object is returned, and it already has your changes.</div>
          </details>
        `,
      },
      {
        title: 'Widget: stage changes, then commit or roll back',
        lang: 'html',
        code: `<style>
.uw { font-size: 14px; }
.uw .hint { color: #555; margin: 0 0 6px; }
.uw .cols { display: grid; grid-template-columns: 1.4fr 1fr; gap: 10px; }
.uw table { border-collapse: collapse; width: 100%; font-size: 13px; }
.uw td, .uw th { border-bottom: 1px solid #eef0f5; padding: 3px 5px; text-align: left; }
.uw th { font-size: 12px; color: #666; }
.uw td button { padding: 0 6px; margin: 0 1px; font-size: 12px; }
.uw tr.flash td { background: #dcfce7; transition: background .3s; }
.uw tr.bad td { background: #fdecec; }
.uw .pend { color: #b45309; font-weight: 600; }
.uw .gone { text-decoration: line-through; color: #999; }
.uw .box { border: 2px solid #dde3ee; border-radius: 10px; padding: 4px 8px; }
.uw .box h4 { margin: 2px 0 4px; font-size: 13px; }
.uw ol.staged { margin: 0; padding-left: 22px; font: 12px ui-monospace, Menlo, monospace; min-height: 40px; }
.uw ol.staged li { padding: 1px 4px; border-radius: 4px; }
.uw ol.staged li.run { background: #eaf2ff; }
.uw ol.staged li.ok { background: #effaf2; }
.uw ol.staged li.fail { background: #fdecec; color: #991b1b; }
.uw .ctl { display: flex; gap: 6px; flex-wrap: wrap; align-items: center; margin: 6px 0; }
.uw .log { font: 12px/1.4 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 92px; overflow: auto; padding: 4px 8px; white-space: pre; margin-top: 6px; }
</style>
<div class="uw">
  <p class="hint">Use the row buttons to <em>stage</em> changes (nothing is saved yet). Then click <b>Commit</b> (all or nothing) or <b>Rollback</b>. Stock has a CHECK constraint: it can't go below 0.</p>
  <div class="cols">
    <div class="box">
      <h4>"Database": Products</h4>
      <table><thead><tr><th>Id</th><th>Name</th><th>Stock</th><th>after commit</th><th>stage…</th></tr></thead>
        <tbody id="prod"></tbody></table>
      <div class="ctl">
        <input id="pname" value="Webcam" style="width:90px">
        stock <input id="pstock" type="number" value="3" style="width:50px">
        <button id="addP">stage INSERT</button>
      </div>
      <h4>"Database": Orders</h4>
      <table><thead><tr><th>Id</th><th>Product</th><th>Qty</th></tr></thead><tbody id="ord"></tbody></table>
    </div>
    <div class="box">
      <h4>Unit of Work: staged changes</h4>
      <ol class="staged" id="staged"></ol>
      <div class="ctl">
        <button id="commit">✔ Commit</button>
        <button id="rollback">↺ Rollback</button>
      </div>
      <div id="sum" style="font-size:12.5px;color:#555"></div>
    </div>
  </div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var db = { products: [{ id: 1, name: 'Keyboard', stock: 5 }, { id: 2, name: 'Mouse', stock: 1 }, { id: 3, name: 'Monitor', stock: 2 }], orders: [] };
var pending = [];
var nextOrder = 100;
var nextProduct = 4;
var busy = false;
var commits = 0;
var rollbacks = 0;

function clone(d) { return JSON.parse(JSON.stringify(d)); }

function log(t) {
  var x = document.createElement('div');
  x.textContent = t;
  $('log').appendChild(x);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(t);
}

// Apply one change to a database copy. Throws like a CHECK constraint.
function apply(d, c) {
  if (c.op === 'INSERT Product') d.products.push({ id: c.id, name: c.name, stock: c.stock });
  if (c.op === 'INSERT Order') d.orders.push({ id: c.id, productId: c.productId, qty: c.qty });
  if (c.op === 'DELETE Product') d.products = d.products.filter(function (p) { return p.id !== c.id; });
  if (c.op === 'UPDATE Product') {
    d.products.forEach(function (p) { if (p.id === c.id) p.stock = c.stock; });
  }
  d.products.forEach(function (p) {
    if (p.stock < 0) throw new Error('CHECK constraint failed on Product ' + p.id);
  });
}

// What the entity would look like with staged changes (no checks), like a change tracker.
function tracked() {
  var d = clone(db);
  pending.forEach(function (c) {
    try { apply(d, c); } catch (e) { /* ignore in preview */ }
  });
  return d;
}

function stage(c) {
  if (busy) return;
  pending.push(c);
  log('  staged: ' + c.op + ' ' + c.id);
  render();
}

function render(flashIds) {
  var t = tracked();
  var tb = $('prod');
  tb.innerHTML = '';
  var ids = db.products.map(function (p) { return p.id; });
  t.products.forEach(function (p) { if (ids.indexOf(p.id) < 0) ids.push(p.id); });
  ids.forEach(function (id) {
    var real = db.products.filter(function (p) { return p.id === id; })[0];
    var after = t.products.filter(function (p) { return p.id === id; })[0];
    var tr = document.createElement('tr');
    if (flashIds && flashIds.indexOf(id) >= 0) tr.className = 'flash';
    var cells = [
      String(id),
      (real || after).name,
      real ? String(real.stock) : '-',
    ];
    cells.forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
    var td = document.createElement('td');
    if (!after) { td.textContent = 'deleted'; td.className = 'gone'; }
    else if (!real || after.stock !== real.stock) { td.textContent = String(after.stock); td.className = 'pend'; }
    else td.textContent = '';
    tr.appendChild(td);
    var act = document.createElement('td');
    if (after) {
      [['sell 1', function () {
        var o = nextOrder++;
        stage({ op: 'INSERT Order', id: o, productId: id, qty: 1 });
        stage({ op: 'UPDATE Product', id: id, stock: tracked().products.filter(function (p) { return p.id === id; })[0].stock - 1 });
      }], ['+5', function () {
        stage({ op: 'UPDATE Product', id: id, stock: tracked().products.filter(function (p) { return p.id === id; })[0].stock + 5 });
      }], ['delete', function () {
        stage({ op: 'DELETE Product', id: id });
      }]].forEach(function (b) {
        var btn = document.createElement('button');
        btn.textContent = b[0];
        btn.onclick = b[1];
        act.appendChild(btn);
      });
    }
    tr.appendChild(act);
    tb.appendChild(tr);
  });
  var ob = $('ord');
  ob.innerHTML = '';
  if (!db.orders.length) ob.innerHTML = '<tr><td colspan="3" style="color:#999">(none)</td></tr>';
  db.orders.forEach(function (o) {
    var tr = document.createElement('tr');
    if (flashIds && flashIds.indexOf('o' + o.id) >= 0) tr.className = 'flash';
    [String(o.id), String(o.productId), String(o.qty)].forEach(function (v) {
      var td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
    });
    ob.appendChild(tr);
  });
  var ol = $('staged');
  ol.innerHTML = '';
  if (!pending.length) ol.innerHTML = '<li style="list-style:none;color:#999;margin-left:-18px">(nothing staged: DB is the truth)</li>';
  pending.forEach(function (c, i) {
    var li = document.createElement('li');
    li.id = 'c' + i;
    var extra = c.op === 'UPDATE Product' ? ' (Stock = ' + c.stock + ')' : (c.op === 'INSERT Order' ? ' (product ' + c.productId + ')' : '');
    li.textContent = c.op + ' ' + c.id + extra;
    ol.appendChild(li);
  });
  $('sum').textContent = 'staged: ' + pending.length + ' · commits: ' + commits + ' · rollbacks: ' + rollbacks;
}

$('addP').onclick = function () {
  stage({ op: 'INSERT Product', id: nextProduct++, name: $('pname').value || 'Item', stock: Number($('pstock').value) || 0 });
};

$('rollback').onclick = function () {
  if (busy) return;
  log('  discarded ' + pending.length + ' staged change(s)');
  pending = [];
  render();
};

$('commit').onclick = function () {
  if (busy || !pending.length) return;
  busy = true;
  var work = clone(db);
  var i = 0;
  function step() {
    if (i > 0) $('c' + (i - 1)).className = 'ok';
    if (i >= pending.length) {
      var changed = [];
      pending.forEach(function (c) { changed.push(c.op === 'INSERT Order' ? 'o' + c.id : c.id); });
      db = work;
      log('  COMMIT: ' + pending.length + ' change(s) saved');
      commits++;
      pending = [];
      busy = false;
      render(changed);
      return;
    }
    var li = $('c' + i);
    li.className = 'run';
    try {
      apply(work, pending[i]);
    } catch (e) {
      li.className = 'fail';
      log('  ROLLBACK: ' + e.message);
      rollbacks++;
      setTimeout(function () {
        pending = [];
        busy = false;
        render();
      }, 1200);
      return;
    }
    i++;
    setTimeout(step, 450);
  }
  step();
};

render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <b>sell 1</b> on Keyboard. Two changes are staged (INSERT Order + UPDATE Product), and "after commit" shows 4 in orange, but the Stock column and the Orders table are unchanged. Click <b>Commit</b>: both apply together.</li>
              <li>Click <b>sell 1</b> on Mouse <em>twice</em> (stock 1). The preview shows −1. Commit: the first sale applies, then the second UPDATE breaks the CHECK constraint, and <strong>everything</strong> rolls back, including the first sale. Same as order 101 in the C# program.</li>
              <li>Stage a few changes and click <b>Rollback</b>: they're discarded and the DB never saw them.</li>
              <li>Stage an INSERT for a new product plus <b>+5</b> on it, then commit. Several entity types are saved in one unit of work.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does a Unit of Work guarantee?',
        options: ['Every repository call is saved immediately', 'All changes from one business operation are committed together, or none are', 'Entities are cached forever', 'Only one user can use the database'],
        answer: 1,
        why: 'It tracks changes and commits them atomically. A failure in any change rolls back the whole operation.',
      },
      {
        q: 'In EF Core, which types play the Repository and Unit of Work roles?',
        options: ['<code>DbSet&lt;T&gt;</code> ≈ repository, <code>DbContext</code> ≈ unit of work', '<code>IQueryable</code> and <code>IEnumerable</code>', '<code>DbConnection</code> and <code>DbCommand</code>', 'EF Core has neither'],
        answer: 0,
        why: 'DbSet gives collection-like access per entity type, and DbContext tracks changes and saves them in one transaction with <code>SaveChanges</code>.',
      },
      {
        q: 'A common criticism of a generic <code>IRepository&lt;T&gt;</code> over EF Core is…',
        options: ['It\'s impossible to implement', 'It often just forwards to DbSet while hiding useful features like Include, projections and AsNoTracking', 'It makes code run in parallel', 'It forbids unit tests'],
        answer: 1,
        why: 'EF already provides the abstraction. A thin generic wrapper adds indirection and loses power. Specific, intention-revealing repositories are the stronger case.',
      },
      {
        q: 'In the C# example, why is "orders in DB before commit" still the old count after <code>Orders.Add</code>?',
        options: ['Add is asynchronous', 'The repository only staged the insert; it runs when Commit() is called', 'The order was invalid', 'Console output is delayed'],
        answer: 1,
        why: 'Writes are deferred as lambdas in the unit of work. Nothing touches the tables until Commit applies them.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>CustomerService</code> writes straight into a static list. Introduce a generic <code>IRepository&lt;T&gt;</code> (with <code>Add</code>, <code>All</code> and <code>SaveChanges()</code>), an <code>InMemoryRepository&lt;T&gt; : IRepository&lt;T&gt; where T : IEntity</code> that stages adds until <code>SaveChanges()</code> is called, and make <code>CustomerService</code> receive an <code>IRepository&lt;Customer&gt;</code>. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'Keep two lists in the repository: pending and saved. Add() goes to pending; SaveChanges() moves pending into saved.',
      starter: `var service = new CustomerService();
service.Register("Ana");
service.Register("Ben");
Console.WriteLine($"customers: {service.Count()}");

public class Customer(int id, string name)
{
  public int Id => id;
  public string Name => name;
}

// TODO: hide storage behind IRepository<T> and commit with SaveChanges()
public class CustomerService
{
  private static readonly List<Customer> Db = [];

  public void Register(string name) => Db.Add(new Customer(Db.Count + 1, name));
  public int Count() => Db.Count;
}`,
      solution: `var repo = new InMemoryRepository<Customer>();
var service = new CustomerService(repo);
service.Register("Ana");
service.Register("Ben");
Console.WriteLine($"before save: {repo.All().Count}");
repo.SaveChanges();
Console.WriteLine($"after save: {repo.All().Count}");

public interface IEntity
{
  int Id { get; }
}

public class Customer(int id, string name) : IEntity
{
  public int Id => id;
  public string Name => name;
}

public interface IRepository<T>
{
  void Add(T entity);
  IReadOnlyList<T> All();
  void SaveChanges();
}

public class InMemoryRepository<T> : IRepository<T> where T : IEntity
{
  private readonly List<T> saved = [];
  private readonly List<T> pending = [];

  public void Add(T entity) => pending.Add(entity);
  public IReadOnlyList<T> All() => saved;

  public void SaveChanges()
  {
    saved.AddRange(pending);
    pending.Clear();
  }
}

public class CustomerService(IRepository<Customer> customers)
{
  private int nextId = 1;

  public void Register(string name) => customers.Add(new Customer(nextId++, name));
}`,
      checks: [
        { label: 'Declares interface IRepository<T>', re: /interface\s+IRepository\s*<\s*T\s*>/ },
        { label: 'InMemoryRepository<T> implements IRepository<T>', re: /class\s+InMemoryRepository\s*<\s*T\s*>[^{]*:\s*IRepository\s*<\s*T\s*>/ },
        { label: 'Constrains T to IEntity', re: /where\s+T\s*:\s*IEntity\b/ },
        { label: 'Has void SaveChanges()', re: /void\s+SaveChanges\s*\(\s*\)/ },
        { label: 'CustomerService receives IRepository<Customer>', re: /CustomerService\s*\(\s*IRepository\s*<\s*Customer\s*>\s+\w+/ },
        { label: 'No static List<Customer> left', re: /static\s+readonly\s+List\s*<\s*Customer\s*>/, absent: true },
      ],
    }),
  },

  // ───────────────────────────── RESULT + NULL OBJECT ─────────────────────────────
  {
    id: 'result-and-null-object',
    section: 'Modern .NET patterns',
    title: 'Result & Null Object',
    explain: `
      <p>Two small patterns that remove a lot of defensive noise. <strong>Null Object</strong> replaces "maybe nothing" with an object that safely does nothing. <strong>Result&lt;T&gt;</strong> replaces exceptions for <em>expected</em> failures with a return value that is either a success or an error.</p>
      <h3>Null Object</h3>
      <pre><code>// ❌ before: every use is guarded
if (logger != null) logger.Info("parsing");
logger?.Info("parsing");   // shorter, but you must remember it everywhere</code></pre>
      <p>Instead, give the "nothing" case a real implementation:</p>
      <pre><code>public sealed class NullLogger : IAppLogger
{
  public static readonly NullLogger Instance = new();   // one shared, stateless instance
  private NullLogger() { }
  public void Info(string message) { }                  // intentionally does nothing
}

var service = new QuoteService(NullLogger.Instance);      // never null, no checks inside</code></pre>
      <p>.NET ships this idea: <code>NullLogger.Instance</code> / <code>NullLogger&lt;T&gt;.Instance</code> (in <code>Microsoft.Extensions.Logging.Abstractions</code>) for tests and optional logging, <code>Stream.Null</code>, <code>TextWriter.Null</code>, <code>Task.CompletedTask</code>, and <code>Enumerable.Empty&lt;T&gt;()</code> (return an empty list, not <code>null</code>).</p>
      <div class="warn">Use a Null Object only when "do nothing" is a correct behaviour. A <code>NullPaymentGateway</code> that silently "succeeds" in production hides a real configuration bug. Fail loudly instead.</div>
      <h3>Result&lt;T&gt;</h3>
      <p>Exceptions are for <em>exceptional</em> situations: the database is down, a file is locked, there's a bug. But "the user typed <code>abc</code> into the quantity box" is <em>expected</em>. Using exceptions for that makes failures invisible in method signatures, costs a stack trace each time, and turns normal control flow into <code>try/catch</code>.</p>
      <pre><code>public readonly record struct Result&lt;T&gt;(bool IsSuccess, T? Value, string? Error)
{
  public static Result&lt;T&gt; Ok(T value) =&gt; new(true, value, null);
  public static Result&lt;T&gt; Fail(string error) =&gt; new(false, default, error);

  public Result&lt;TOut&gt; Map&lt;TOut&gt;(Func&lt;T, TOut&gt; f) =&gt; …;            // transform the value
  public Result&lt;TOut&gt; Bind&lt;TOut&gt;(Func&lt;T, Result&lt;TOut&gt;&gt; f) =&gt; …;   // next step that may fail
}</code></pre>
      <p>Chaining with <code>Bind</code>/<code>Map</code> gives "railway-oriented" code. Values ride the <strong>success track</strong> through each step. The first failure switches to the <strong>failure track</strong>, and the remaining steps are skipped automatically:</p>
      <pre><code>Parse(text).Bind(Positive).Bind(Available).Map(qty =&gt; qty * UnitPrice)</code></pre>
      <p>Consume a result with a <code>switch</code> expression or a <code>Match(onOk, onFail)</code> method. In ASP.NET Core that usually maps to <code>Results.Ok(...)</code> vs <code>Results.ValidationProblem(...)</code>. You already know a built-in result-ish API: <code>int.TryParse(text, out var n)</code> returns <code>bool</code> instead of throwing like <code>int.Parse</code>.</p>
      <h3>Result vs exceptions</h3>
      <table>
        <tr><th></th><th>Exceptions</th><th>Result&lt;T&gt;</th></tr>
        <tr><td>Best for</td><td>unexpected / unrecoverable (I/O down, bugs)</td><td>expected business failures (validation, "not found", "out of stock")</td></tr>
        <tr><td>Visible in signature?</td><td>no</td><td>yes: <code>Result&lt;decimal&gt;</code> says "may fail"</td></tr>
        <tr><td>Forgetting to handle</td><td>crashes later, somewhere else</td><td>you can't get the value without checking</td></tr>
        <tr><td>Cost</td><td>stack trace capture, slow when frequent</td><td>a struct</td></tr>
      </table>
      <div class="tip">Don't catch every exception and convert it into a <code>Result</code>. Keep exceptions for the truly exceptional. Libraries like FluentResults, ErrorOr and OneOf offer richer versions. The hand-written one here is enough to learn the idea.</div>
    `,
    examples: [
      {
        title: 'C#: a validation pipeline with Result<T> and NullLogger',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var quotes = new QuoteService(new ConsoleLogger());
string[] inputs = ["4", "abc", "-1", "50"];

foreach (var input in inputs)
{
  var message = quotes.Quote(input) switch
  {
    { IsSuccess: true, Value: var total } => $"OK   '{input}' -> total {total}",
    { Error: var error } => $"FAIL '{input}' -> {error}",
  };
  Console.WriteLine(message);
}

Console.WriteLine("--- same service with NullLogger.Instance (no null checks inside) ---");
var silent = new QuoteService(NullLogger.Instance);
Console.WriteLine(silent.Quote("2").Match(t => $"total {t}", e => $"error: {e}"));

// ── Result<T>: success with a value, or failure with an error ──
public readonly record struct Result<T>(bool IsSuccess, T? Value, string? Error)
{
  public static Result<T> Ok(T value) => new(true, value, null);
  public static Result<T> Fail(string error) => new(false, default, error);

  public Result<TOut> Map<TOut>(Func<T, TOut> f) =>
    IsSuccess ? Result<TOut>.Ok(f(Value!)) : Result<TOut>.Fail(Error!);

  public Result<TOut> Bind<TOut>(Func<T, Result<TOut>> f) =>
    IsSuccess ? f(Value!) : Result<TOut>.Fail(Error!);

  public TOut Match<TOut>(Func<T, TOut> ok, Func<string, TOut> fail) =>
    IsSuccess ? ok(Value!) : fail(Error!);
}

// ── Null Object ──
public interface IAppLogger
{
  void Info(string message);
}

public class ConsoleLogger : IAppLogger
{
  public void Info(string message) => Console.WriteLine($"  [log] {message}");
}

public sealed class NullLogger : IAppLogger
{
  public static readonly NullLogger Instance = new();
  private NullLogger() { }
  public void Info(string message) { }   // does nothing, on purpose
}

// ── the pipeline: each step returns a Result ──
public class QuoteService(IAppLogger log)
{
  private const decimal UnitPrice = 2.50m;
  private const int InStock = 12;

  public Result<decimal> Quote(string qtyText) =>
    Parse(qtyText)
      .Bind(Positive)
      .Bind(Available)
      .Map(qty => qty * UnitPrice);

  private Result<int> Parse(string text)
  {
    log.Info($"parse '{text}'");
    return int.TryParse(text, out var n)
      ? Result<int>.Ok(n)
      : Result<int>.Fail($"'{text}' is not a number");
  }

  private Result<int> Positive(int qty)
  {
    log.Info($"check {qty} > 0");
    return qty > 0 ? Result<int>.Ok(qty) : Result<int>.Fail("quantity must be > 0");
  }

  private Result<int> Available(int qty)
  {
    log.Info($"check stock for {qty}");
    return qty <= InStock ? Result<int>.Ok(qty) : Result<int>.Fail($"only {InStock} in stock");
  }
}`,
        output: `  [log] parse '4'
  [log] check 4 > 0
  [log] check stock for 4
OK   '4' -> total 10.00
  [log] parse 'abc'
FAIL 'abc' -> 'abc' is not a number
  [log] parse '-1'
  [log] check -1 > 0
FAIL '-1' -> quantity must be > 0
  [log] parse '50'
  [log] check 50 > 0
  [log] check stock for 50
FAIL '50' -> only 12 in stock
--- same service with NullLogger.Instance (no null checks inside) ---
total 5.00`,
        explain: `
          <details>
            <summary>The railway, input by input</summary>
            <p><code>Parse → Bind(Positive) → Bind(Available) → Map(× 2.50)</code>. ✅ = step ran and stayed on the success track, ❌ = step ran and switched to failure, ⏭ = skipped:</p>
            <table>
              <tr><th>Input</th><th>Parse</th><th>Positive</th><th>Available</th><th>Map</th><th>Final result</th></tr>
              <tr><td><code>"4"</code></td><td>✅ 4</td><td>✅ 4</td><td>✅ 4</td><td>✅ 10.00</td><td><code>OK … total 10.00</code></td></tr>
              <tr><td><code>"abc"</code></td><td>❌</td><td>⏭</td><td>⏭</td><td>⏭</td><td><code>'abc' is not a number</code></td></tr>
              <tr><td><code>"-1"</code></td><td>✅ -1</td><td>❌</td><td>⏭</td><td>⏭</td><td><code>quantity must be &gt; 0</code></td></tr>
              <tr><td><code>"50"</code></td><td>✅ 50</td><td>✅ 50</td><td>❌</td><td>⏭</td><td><code>only 12 in stock</code></td></tr>
            </table>
            <p>Count the <code>[log]</code> lines in the output: 3, 1, 2, 3. Skipped steps never run, so they never log. Nobody wrote an <code>if (failed) return</code>. <code>Bind</code> does it:</p>
            <pre><code>public Result&lt;TOut&gt; Bind&lt;TOut&gt;(Func&lt;T, Result&lt;TOut&gt;&gt; f) =&gt;
  IsSuccess ? f(Value!)                    // ① on the success track: run the next step
            : Result&lt;TOut&gt;.Fail(Error!);   // ② already failed: pass the error along untouched</code></pre>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <ol>
              <li><code>.Bind(Positive)</code> is for steps that can <strong>fail</strong> (they return <code>Result&lt;int&gt;</code>). <code>.Map(qty =&gt; qty * UnitPrice)</code> is for steps that <strong>can't fail</strong> (they return a plain value). Using <code>Map</code> with a Result-returning function would give you a <code>Result&lt;Result&lt;int&gt;&gt;</code>.</li>
              <li><code>{ IsSuccess: true, Value: var total }</code> is a property pattern. The switch arm only matches successes and pulls the value out in the same step. The second arm <code>{ Error: var error }</code> catches the rest.</li>
              <li><code>Match(ok, fail)</code> forces the caller to say what happens in <em>both</em> cases. There's no way to get <code>Value</code> while forgetting the error.</li>
              <li><code>new QuoteService(NullLogger.Instance)</code>: the service code is identical, yet nothing is logged. <code>log</code> is never null, so there's not a single <code>?.</code> in <code>QuoteService</code>.</li>
            </ol>
            <div class="tip">Compare with the exception version: <code>int.Parse</code> throws <code>FormatException</code>, and you'd need <code>try/catch</code> around each step or one big catch that can't tell which step failed. With Result, the error message is designed for the user and travels with the value.</div>
          </details>
        `,
      },
      {
        title: 'Widget: railway-oriented validation pipeline',
        lang: 'html',
        code: `<style>
.rw { font-size: 14px; }
.rw .hint { color: #555; margin: 0 0 6px; }
.rw .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 6px; }
.rw svg { width: 100%; height: auto; display: block; background: #fbfcfe; border: 1px solid #e3e7ef; border-radius: 10px; }
.rw .st rect { fill: #fff; stroke: #94a3b8; stroke-width: 2; transition: all .2s; }
.rw .st.ok rect { fill: #dcfce7; stroke: #16a34a; }
.rw .st.fail rect { fill: #fee2e2; stroke: #dc2626; }
.rw .st.skip rect { fill: #f1f5f9; stroke: #cbd5e1; stroke-dasharray: 4 3; }
.rw .st.skip text { fill: #94a3b8; }
.rw .st text { font: 600 12px system-ui, sans-serif; fill: #1f2330; }
.rw .st .sub { font: 11px ui-monospace, Menlo, monospace; fill: #555; }
.rw .res { margin: 6px 0; padding: 6px 10px; border-radius: 8px; font: 13px ui-monospace, Menlo, monospace; background: #f4f6fa; }
.rw .res.ok { background: #dcfce7; color: #166534; }
.rw .res.fail { background: #fee2e2; color: #991b1b; }
.rw .log { font: 12px/1.4 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 96px; overflow: auto; padding: 4px 8px; white-space: pre; }
</style>
<div class="rw">
  <p class="hint">Type a quantity (or click a preset) and press <b>Run Quote</b>. The train stays on the green track until a step fails, then it switches to red and skips the rest.</p>
  <div class="ctl">
    qty <input id="qty" value="4" style="width:70px">
    <button id="run">▶ Run Quote</button>
    presets:
    <button class="pre">4</button><button class="pre">abc</button><button class="pre">-1</button><button class="pre">50</button><button class="pre">12</button>
    in stock <input id="stock" type="number" value="12" style="width:55px">
    logger <select id="lg"><option value="console">ConsoleLogger</option><option value="null">NullLogger.Instance</option></select>
  </div>
  <svg viewBox="0 0 680 190" id="svg">
    <text x="10" y="36" font-size="11" fill="#16a34a" font-weight="700">success track</text>
    <text x="10" y="176" font-size="11" fill="#dc2626" font-weight="700">failure track</text>
    <line x1="20" y1="70" x2="660" y2="70" stroke="#16a34a" stroke-width="5" stroke-linecap="round" opacity=".35"/>
    <line x1="20" y1="150" x2="660" y2="150" stroke="#dc2626" stroke-width="5" stroke-linecap="round" opacity=".35"/>
    <g id="stations"></g>
    <circle id="train" cx="20" cy="70" r="9" fill="#2563eb" stroke="#fff" stroke-width="2"/>
  </svg>
  <div class="res" id="res">result: (not run yet)</div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var NS = 'http://www.w3.org/2000/svg';
var ST = [
  { name: 'Parse', sub: 'int.TryParse', x: 110 },
  { name: 'Bind(Positive)', sub: 'qty > 0', x: 260 },
  { name: 'Bind(Available)', sub: 'qty <= stock', x: 410 },
  { name: 'Map(x 2.50)', sub: 'qty * UnitPrice', x: 560 },
];
var busy = false;

function el(tag, attrs, parent) {
  var e = document.createElementNS(NS, tag);
  Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
  if (parent) parent.appendChild(e);
  return e;
}

ST.forEach(function (s, i) {
  var g = el('g', { 'class': 'st', id: 'st' + i }, $('stations'));
  el('rect', { x: s.x - 58, y: 50, width: 116, height: 40, rx: 8 }, g);
  var t = el('text', { x: s.x, y: 67, 'text-anchor': 'middle' }, g);
  t.textContent = s.name;
  var t2 = el('text', { x: s.x, y: 82, 'text-anchor': 'middle', 'class': 'sub' }, g);
  t2.textContent = s.sub;
  s.val = el('text', { x: s.x, y: 112, 'text-anchor': 'middle', 'class': 'sub', id: 'v' + i }, g);
});

function log(t) {
  var d = document.createElement('div');
  d.textContent = t;
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(t);
}

// The same pipeline as the C# QuoteService. Returns the step list.
function evaluate(text, stock) {
  var steps = [];
  var trimmed = text.trim();
  var n = /^[-+]?[0-9]+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
  steps.push({ log: "parse '" + text + "'", ok: !isNaN(n), val: isNaN(n) ? '' : String(n), err: "'" + text + "' is not a number" });
  if (isNaN(n)) return steps;
  steps.push({ log: 'check ' + n + ' > 0', ok: n > 0, val: String(n), err: 'quantity must be > 0' });
  if (n <= 0) return steps;
  steps.push({ log: 'check stock for ' + n, ok: n <= stock, val: String(n), err: 'only ' + stock + ' in stock' });
  if (n > stock) return steps;
  steps.push({ log: null, ok: true, val: (n * 2.5).toFixed(2) });
  return steps;
}

function moveTrain(from, to, ms, done) {
  var t0 = null;
  function frame(ts) {
    if (t0 === null) t0 = ts;
    var k = Math.min(1, (ts - t0) / ms);
    $('train').setAttribute('cx', from[0] + (to[0] - from[0]) * k);
    $('train').setAttribute('cy', from[1] + (to[1] - from[1]) * k);
    if (k < 1) requestAnimationFrame(frame); else done();
  }
  requestAnimationFrame(frame);
}

function run() {
  if (busy) return;
  busy = true;
  var text = $('qty').value;
  var stock = Number($('stock').value) || 0;
  var useLog = $('lg').value === 'console';
  var steps = evaluate(text, stock);
  ST.forEach(function (s, i) { $('st' + i).setAttribute('class', 'st'); $('v' + i).textContent = ''; });
  $('res').className = 'res';
  $('res').textContent = 'running…';
  $('train').setAttribute('fill', '#2563eb');
  var pos = [20, 70];
  var i = 0;
  function next() {
    if (i >= steps.length) return finish();
    var s = steps[i];
    var target = [ST[i].x, 70];
    moveTrain(pos, target, 450, function () {
      pos = target;
      if (s.log && useLog) log('  [log] ' + s.log);
      $('st' + i).setAttribute('class', 'st ' + (s.ok ? 'ok' : 'fail'));
      $('v' + i).textContent = s.ok ? '→ ' + s.val : '✗';
      if (!s.ok) {
        $('train').setAttribute('fill', '#dc2626');
        for (var k = i + 1; k < ST.length; k++) $('st' + k).setAttribute('class', 'st skip');
        var down = [ST[i].x + 45, 150];
        moveTrain(pos, down, 350, function () {
          moveTrain(down, [660, 150], 600, function () { finish(s.err); });
        });
        return;
      }
      i++;
      setTimeout(next, 150);
    });
  }
  function finish(err) {
    if (err === undefined) {
      moveTrain(pos, [660, 70], 300, function () {
        var total = steps[steps.length - 1].val;
        $('res').className = 'res ok';
        $('res').textContent = "Result.Ok(" + total + ")   →   OK   '" + text + "' -> total " + total;
        log("OK   '" + text + "' -> total " + total);
        busy = false;
      });
      return;
    }
    $('res').className = 'res fail';
    $('res').textContent = 'Result.Fail("' + err + '")   →   FAIL ' + "'" + text + "' -> " + err;
    log("FAIL '" + text + "' -> " + err);
    busy = false;
  }
  next();
}

$('run').onclick = run;
document.querySelectorAll('.rw .pre').forEach(function (b) {
  b.onclick = function () { if (busy) return; $('qty').value = b.textContent; run(); };
});
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click the presets <code>4</code>, <code>abc</code>, <code>-1</code>, <code>50</code> in order. The log reproduces the C# output line for line. Note how many stations each run visits.</li>
              <li>Watch the dashed stations after a failure: they're skipped and don't log, because <code>Bind</code> never calls them.</li>
              <li>Change <em>in stock</em> to 60 and run <code>50</code> again: now it reaches <code>Map</code> and succeeds.</li>
              <li>Switch the logger to <em>NullLogger.Instance</em> and run anything. The pipeline is identical, but no <code>[log]</code> lines appear and the service never checks for null.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What is a Null Object?',
        options: ['A variable set to null', 'An implementation of an interface whose methods safely do nothing, used instead of null', 'An object that throws NullReferenceException', 'A nullable struct'],
        answer: 1,
        why: 'Callers always get a real object, so they never need <code>if (x != null)</code>. Examples: <code>NullLogger.Instance</code>, <code>Stream.Null</code>.',
      },
      {
        q: 'Which failure is the best fit for <code>Result&lt;T&gt;</code> rather than an exception?',
        options: ['The database server is unreachable', 'A user enters a quantity larger than the stock', 'A null reference bug in your code', 'Out of memory'],
        answer: 1,
        why: 'Out-of-stock is an expected business outcome that the caller should handle. Infrastructure failures and bugs are exceptional, so exceptions fit them.',
      },
      {
        q: 'In <code>Parse(t).Bind(Positive).Bind(Available)</code>, Parse fails. What happens?',
        options: ['Positive and Available still run with a default value', 'An exception is thrown', 'Positive and Available are skipped; the Parse error is returned', 'Only Available is skipped'],
        answer: 2,
        why: 'Bind only calls the next function when the current result is a success. Otherwise it forwards the existing error, so the result stays on the failure track.',
      },
      {
        q: 'When should you use <code>Map</code> instead of <code>Bind</code>?',
        options: ['When the next step cannot fail and returns a plain value', 'When the next step can fail', 'Never, they are the same', 'Only for strings'],
        answer: 0,
        why: 'Map wraps a plain value back into a Result. Bind expects a function that already returns a Result. Mixing them up gives Result&lt;Result&lt;T&gt;&gt;.',
      },
      {
        q: 'When is a Null Object a BAD idea?',
        options: ['For optional logging', 'For an empty list of discounts', 'For a payment gateway in production, where "do nothing" hides a misconfiguration', 'In unit tests'],
        answer: 2,
        why: 'If doing nothing is wrong, a Null Object hides the bug. Payments silently "succeeding" is far worse than a startup error.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>QuantityParser</code> throws <code>ArgumentException</code> for bad user input and guards a nullable logger with <code>if (logger != null)</code>. Refactor:</p>
        <ul><li>add a <code>Result&lt;T&gt;</code> type and make <code>Parse</code> return <code>Result&lt;int&gt;</code> (no <code>throw</code> for bad input);</li>
        <li>add <code>NullLog : ILog</code> with a static <code>Instance</code>, make the logger non-nullable, and remove the null check;</li>
        <li>handle the result in the loop with a <code>switch</code> or <code>if (r.IsSuccess)</code>.</li></ul>
        <p>Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'public readonly record struct Result&lt;T&gt;(bool IsSuccess, T? Value, string? Error) { public static Result&lt;T&gt; Ok(T v) => new(true, v, null); public static Result&lt;T&gt; Fail(string e) => new(false, default, e); }',
      starter: `ILog? logger = null;   // sometimes there is no logger
var parser = new QuantityParser(logger);

foreach (var input in new[] { "3", "x", "0" })
{
  try
  {
    Console.WriteLine($"ok: {parser.Parse(input)}");
  }
  catch (ArgumentException ex)
  {
    Console.WriteLine($"error: {ex.Message}");
  }
}

public interface ILog
{
  void Write(string message);
}

public class QuantityParser(ILog? logger)
{
  public int Parse(string text)
  {
    if (logger != null) logger.Write($"parsing {text}");
    if (!int.TryParse(text, out var n)) throw new ArgumentException($"'{text}' is not a number");
    if (n <= 0) throw new ArgumentException("must be positive");
    return n;
  }
}`,
      solution: `var parser = new QuantityParser(NullLog.Instance);

foreach (var input in new[] { "3", "x", "0" })
{
  var r = parser.Parse(input);
  Console.WriteLine(r.IsSuccess ? $"ok: {r.Value}" : $"error: {r.Error}");
}

public readonly record struct Result<T>(bool IsSuccess, T? Value, string? Error)
{
  public static Result<T> Ok(T value) => new(true, value, null);
  public static Result<T> Fail(string error) => new(false, default, error);
}

public interface ILog
{
  void Write(string message);
}

public sealed class NullLog : ILog
{
  public static readonly NullLog Instance = new();
  private NullLog() { }
  public void Write(string message) { }
}

public class QuantityParser(ILog logger)
{
  public Result<int> Parse(string text)
  {
    logger.Write($"parsing {text}");
    if (!int.TryParse(text, out var n)) return Result<int>.Fail($"'{text}' is not a number");
    if (n <= 0) return Result<int>.Fail("must be positive");
    return Result<int>.Ok(n);
  }
}`,
      checks: [
        { label: 'Parse returns Result<int>', re: /Result\s*<\s*int\s*>\s+Parse\s*\(/ },
        { label: 'No throw new ArgumentException for bad input', re: /throw\s+new\s+ArgumentException/, absent: true },
        { label: 'NullLog implements ILog', re: /class\s+NullLog\b[^{]*:\s*ILog\b/ },
        { label: 'NullLog exposes a static Instance', re: /static\s+readonly\s+\w+\s+Instance\b|static\s+\w+\s+Instance\s*\{/ },
        { label: 'No null check on the logger', re: /logger\s*(!=|is\s+not)\s*null|logger\s*\?\./, absent: true },
      ],
    }),
  },

  // ───────────────────────────── CHOOSING PATTERNS (CAPSTONE) ─────────────────────────────
  {
    id: 'choosing-patterns',
    section: 'Modern .NET patterns',
    title: 'Choosing the right pattern',
    explain: `
      <p>Patterns are a <strong>vocabulary for solutions to recurring problems</strong>, not a checklist. Start from the problem you actually have, reach for the simplest code that solves it, and use a pattern when you feel the specific pain it removes.</p>
      <h3>"I need to…" → pattern</h3>
      <table>
        <tr><th>I need to…</th><th>Reach for</th></tr>
        <tr><td>swap an algorithm at runtime (pricing, shipping cost, sorting)</td><td><strong>Strategy</strong></td></tr>
        <tr><td>change behaviour based on internal state (order: Draft → Paid → Shipped)</td><td><strong>State</strong></td></tr>
        <tr><td>tell many parts "this happened" without knowing them</td><td><strong>Observer</strong> (<code>event</code>, <code>IObservable&lt;T&gt;</code>)</td></tr>
        <tr><td>stop objects talking to each other directly (chat room, UI dialog, MediatR)</td><td><strong>Mediator</strong></td></tr>
        <tr><td>decide which concrete class to create in one place</td><td><strong>Factory Method</strong> / simple factory</td></tr>
        <tr><td>create whole families of matching objects (light/dark UI kit, SQL Server/Postgres providers)</td><td><strong>Abstract Factory</strong></td></tr>
        <tr><td>build a complex object step by step</td><td><strong>Builder</strong></td></tr>
        <tr><td>add logging/caching/retry around something</td><td><strong>Decorator</strong></td></tr>
        <tr><td>use a class whose interface doesn't fit mine</td><td><strong>Adapter</strong></td></tr>
        <tr><td>control access: lazy, permission, remote</td><td><strong>Proxy</strong></td></tr>
        <tr><td>one simple call over a messy subsystem</td><td><strong>Facade</strong></td></tr>
        <tr><td>treat trees of things uniformly</td><td><strong>Composite</strong></td></tr>
        <tr><td>queue / undo / log user actions</td><td><strong>Command</strong></td></tr>
        <tr><td>pass a request along a pipeline of handlers</td><td><strong>Chain of Responsibility</strong> (middleware)</td></tr>
        <tr><td>get dependencies in without <code>new</code>-ing them</td><td><strong>Dependency Injection</strong></td></tr>
        <tr><td>save several changes atomically</td><td><strong>Unit of Work</strong></td></tr>
        <tr><td>return expected failures without exceptions</td><td><strong>Result&lt;T&gt;</strong></td></tr>
      </table>
      <h3>Look-alikes: tell them apart by intent</h3>
      <table>
        <tr><th>Pair</th><th>Same structure…</th><th>…different intent</th></tr>
        <tr><td><strong>Decorator vs Proxy vs Adapter</strong></td><td>all wrap another object</td><td>Decorator <em>adds</em> behaviour, same interface. Proxy <em>controls access</em>, same interface. Adapter <em>changes</em> the interface.</td></tr>
        <tr><td><strong>Strategy vs State</strong></td><td>context delegates to an interface with swappable implementations</td><td>With Strategy the <em>client</em> picks the algorithm. With State the <em>states switch themselves</em> as the object's state changes.</td></tr>
        <tr><td><strong>Factory Method vs Abstract Factory</strong></td><td>both hide <code>new</code></td><td>Factory Method creates <em>one</em> product (often via an overridable method). Abstract Factory creates a <em>family</em> of related products that must match.</td></tr>
        <tr><td><strong>Observer vs Mediator</strong></td><td>both decouple senders from receivers</td><td>Observer: a subject broadcasts to whoever subscribed (one-to-many). Mediator: a central object <em>coordinates</em> the conversation between colleagues (many-to-many through one hub).</td></tr>
        <tr><td><strong>Facade vs Adapter</strong></td><td>both wrap</td><td>Facade defines a <em>new simpler</em> interface over many classes. Adapter makes one class fit an <em>existing</em> interface.</td></tr>
      </table>
      <h3>Anti-patterns to avoid</h3>
      <ul>
        <li><strong>Pattern-itis</strong>: <code>IOrderFactoryProviderStrategy</code> for a class with one implementation. Every abstraction costs reading time. If there's one implementation and no test seam needed, an interface may be noise.</li>
        <li><strong>God Singleton</strong>: a static <code>AppManager.Instance</code> holding config, DB, cache and the current user. It's global mutable state that can't be tested or run in parallel. Use DI with a singleton <em>lifetime</em> instead of the Singleton <em>pattern</em>.</li>
        <li><strong>Service Locator</strong>: hidden dependencies pulled from a global container (see the DI lesson).</li>
        <li><strong>Speculative generality</strong>: a plugin system "in case we need it".</li>
      </ul>
      <div class="tip"><strong>YAGNI</strong> ("You Aren't Gonna Need It"): write the straightforward version first. When the <em>second</em> or <em>third</em> variation arrives (a new payment method, another notification channel), refactor toward the pattern. By then you know which axis really changes.</div>
    `,
    examples: [
      {
        title: 'C#: one order pipeline, four patterns',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `// Decorator: logging wraps the real payment
var processor = new OrderProcessor(new LoggingPayment(new CardPayment()));

// Observer: subscribers react to OrderPlaced; OrderProcessor doesn't know them
processor.OrderPlaced += order => Console.WriteLine($"  [email] receipt for {order.Id}");
processor.OrderPlaced += order => Console.WriteLine($"  [stock] reserve {order.Items} item(s)");

processor.Process(new Order("A1", Subtotal: 40m, Items: 2, Shipping: "standard"));
processor.Process(new Order("A2", Subtotal: 120m, Items: 1, Shipping: "standard"));
processor.Process(new Order("A3", Subtotal: 15m, Items: 1, Shipping: "express"));
processor.Process(new Order("A4", Subtotal: 9m, Items: 1, Shipping: "drone"));

public record Order(string Id, decimal Subtotal, int Items, string Shipping);

// ── STRATEGY: interchangeable shipping-cost algorithms ──
public interface IShippingStrategy
{
  decimal Cost(Order order);
}

public class StandardShipping : IShippingStrategy
{
  public decimal Cost(Order order) => order.Subtotal >= 100m ? 0m : 5m;
}

public class ExpressShipping : IShippingStrategy
{
  public decimal Cost(Order order) => 15m;
}

// ── FACTORY: the one place that maps a name to a strategy ──
public static class ShippingFactory
{
  public static IShippingStrategy Create(string kind) => kind switch
  {
    "standard" => new StandardShipping(),
    "express" => new ExpressShipping(),
    _ => throw new ArgumentException($"unknown shipping '{kind}'"),
  };
}

// ── DECORATOR: same interface, adds logging around any payment ──
public interface IPayment
{
  void Pay(decimal amount);
}

public class CardPayment : IPayment
{
  public void Pay(decimal amount) => Console.WriteLine($"  [card] charged {amount}");
}

public class LoggingPayment(IPayment inner) : IPayment
{
  public void Pay(decimal amount)
  {
    Console.WriteLine($"  [log] paying {amount}");
    inner.Pay(amount);
    Console.WriteLine("  [log] payment done");
  }
}

// ── the client: depends only on abstractions ──
public class OrderProcessor(IPayment payment)
{
  public event Action<Order>? OrderPlaced;            // OBSERVER: the subject's event

  public void Process(Order order)
  {
    try
    {
      var shipping = ShippingFactory.Create(order.Shipping);   // FACTORY picks…
      var cost = shipping.Cost(order);                          // …the STRATEGY
      Console.WriteLine($"Order {order.Id}: {order.Subtotal} + {cost} shipping ({shipping.GetType().Name})");
      payment.Pay(order.Subtotal + cost);                       // DECORATED payment
      OrderPlaced?.Invoke(order);                               // notify OBSERVERS
    }
    catch (ArgumentException ex)
    {
      Console.WriteLine($"Order {order.Id} rejected: {ex.Message}");
    }
  }
}`,
        output: `Order A1: 40 + 5 shipping (StandardShipping)
  [log] paying 45
  [card] charged 45
  [log] payment done
  [email] receipt for A1
  [stock] reserve 2 item(s)
Order A2: 120 + 0 shipping (StandardShipping)
  [log] paying 120
  [card] charged 120
  [log] payment done
  [email] receipt for A2
  [stock] reserve 1 item(s)
Order A3: 15 + 15 shipping (ExpressShipping)
  [log] paying 30
  [card] charged 30
  [log] payment done
  [email] receipt for A3
  [stock] reserve 1 item(s)
Order A4 rejected: unknown shipping 'drone'`,
        explain: `
          <details>
            <summary>Where each pattern earns its place</summary>
            <table>
              <tr><th>Pattern</th><th>Code</th><th>Change it absorbs</th></tr>
              <tr><td>Strategy</td><td><code>IShippingStrategy</code> + 2 classes</td><td>New shipping rule = new class, no edits to <code>OrderProcessor</code>. A2 shows the "free over 100" rule living inside <code>StandardShipping</code>.</td></tr>
              <tr><td>Factory</td><td><code>ShippingFactory.Create</code></td><td>The string → class mapping lives in one <code>switch</code>. A4 shows the unknown case handled in one place.</td></tr>
              <tr><td>Decorator</td><td><code>LoggingPayment(new CardPayment())</code></td><td>Add retry or fraud checks by wrapping again. <code>CardPayment</code> stays untouched.</td></tr>
              <tr><td>Observer</td><td><code>event Action&lt;Order&gt; OrderPlaced</code></td><td>Add SMS, analytics or loyalty points by subscribing. The processor doesn't change.</td></tr>
            </table>
          </details>
          <details>
            <summary>Would YAGNI remove any of them?</summary>
            <p>Honestly, maybe. With <em>one</em> shipping rule, a <code>decimal ShippingCost(Order o)</code> method is simpler than Strategy + Factory. With one subscriber, a direct <code>mailer.SendReceipt(order)</code> call is clearer than an event. The patterns pay off here because the program has <em>several</em> variations of each axis. Scale the design to the variation you really have.</p>
            <div class="tip">In a real ASP.NET Core app the composition at the top would be DI registrations: <code>services.AddScoped&lt;IPayment, CardPayment&gt;()</code> plus a decorator, and the observers might be <code>INotificationHandler</code>s in MediatR, which uses the Mediator pattern for the dispatch.</div>
          </details>
        `,
      },
      {
        title: 'Widget: scenario → pick the pattern',
        lang: 'html',
        code: `<style>
.qz { font-size: 14px; }
.qz .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px; }
.qz .score { font-weight: 700; }
.qz .bar { height: 6px; background: #eef1f6; border-radius: 4px; overflow: hidden; margin-bottom: 8px; }
.qz .bar div { height: 100%; background: #2563eb; width: 0; transition: width .3s; }
.qz .card { border: 2px solid #dde3ee; border-radius: 12px; padding: 10px 12px; background: #fbfcfe; }
.qz .scn { font-size: 15px; margin: 0 0 8px; }
.qz .opts { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 6px; }
.qz .opts button { margin: 0; text-align: left; padding: 6px 8px; }
.qz .opts button.right { background: #dcfce7; border-color: #16a34a; }
.qz .opts button.wrong { background: #fee2e2; border-color: #dc2626; }
.qz .fb { margin-top: 8px; padding: 6px 10px; border-radius: 8px; display: none; font-size: 13.5px; }
.qz .fb.ok { display: block; background: #effaf2; border: 1px solid #86efac; }
.qz .fb.no { display: block; background: #fff7e6; border: 1px solid #f0b44c; }
.qz .done { text-align: center; padding: 20px; }
</style>
<div class="qz">
  <div class="top">
    <span id="prog">Scenario 1 / 10</span>
    <span class="score" id="score">score 0</span>
    <button id="restart">Restart</button>
  </div>
  <div class="bar"><div id="bar"></div></div>
  <div class="card" id="card">
    <p class="scn" id="scn"></p>
    <div class="opts" id="opts"></div>
    <div class="fb" id="fb"></div>
    <div style="text-align:right;margin-top:8px"><button id="next" disabled>Next →</button></div>
  </div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var Q = [
  { s: 'Checkout must support card, PayPal and bank transfer, chosen by the user at runtime. Each has a different fee calculation.',
    o: ['Strategy', 'State', 'Observer', 'Facade'], a: 0,
    why: 'Strategy: interchangeable algorithms behind one interface, picked by the client. It is not State, because the order does not switch the algorithm by itself as its status changes.' },
  { s: 'An Order behaves differently when Draft, Paid, Shipped or Cancelled. Cancel() is allowed only in some of them, and each transition moves it to the next status.',
    o: ['Strategy', 'State', 'Command', 'Builder'], a: 1,
    why: 'State: the object delegates to a state object, and the states themselves trigger transitions. If the client chose the behaviour from outside, it would be Strategy.' },
  { s: 'You must call a vendor SDK that returns XML and amounts in cents, but your code expects IPaymentGateway.Charge(orderId, decimal).',
    o: ['Facade', 'Proxy', 'Adapter', 'Decorator'], a: 2,
    why: 'Adapter: make an incompatible interface fit the one you already use. A Facade would invent a new simpler API instead of matching an existing one.' },
  { s: 'Add caching and logging around IProductService without touching its implementation, and be able to combine them in any order.',
    o: ['Decorator', 'Adapter', 'Composite', 'Singleton'], a: 0,
    why: 'Decorator: same interface, wraps the real service, adds behaviour, and stacks. A caching wrapper is sometimes called a caching proxy, but stacking extra behaviour is Decorator.' },
  { s: 'Thumbnails should not load the 8 MB image until the user actually opens it. Admin-only photos must be refused for guests.',
    o: ['Proxy', 'Decorator', 'Flyweight', 'Memento'], a: 0,
    why: 'Proxy: virtual (lazy) plus protection. The intent is controlling access to the real object, not adding features.' },
  { s: 'When an order is placed, email, analytics and the warehouse must react. More listeners will be added later by other teams.',
    o: ['Mediator', 'Observer', 'Chain of Responsibility', 'Visitor'], a: 1,
    why: 'Observer: one subject broadcasts an event to any number of subscribers (a C# event or IObservable). Mediator would be a hub that coordinates two-way interactions between colleagues.' },
  { s: 'A dialog has 8 controls. Ticking "ship to billing address" disables 4 fields, changing country updates the postcode rules, and so on. Controls currently reference each other directly.',
    o: ['Observer', 'Mediator', 'Composite', 'Adapter'], a: 1,
    why: 'Mediator: move the many-to-many interactions into one coordinator so the controls only talk to it.' },
  { s: 'Your app must run on SQL Server or PostgreSQL. Each needs its own matching connection, command and parameter types.',
    o: ['Factory Method', 'Abstract Factory', 'Builder', 'Prototype'], a: 1,
    why: 'Abstract Factory: create a family of related objects that must match (this is exactly ADO.NET DbProviderFactory). Factory Method makes one product.' },
  { s: 'A menu has items and sub-menus nested to any depth. You need the total price of a "combo" that may contain other combos.',
    o: ['Composite', 'Decorator', 'Iterator', 'Facade'], a: 0,
    why: 'Composite: leaf items and groups share one interface, and groups sum their children recursively.' },
  { s: 'Placing an order touches inventory, payments, shipping and email in a fixed order. Five controllers copy the same six calls.',
    o: ['Facade', 'Mediator', 'Adapter', 'Proxy'], a: 0,
    why: 'Facade: one task-shaped method (PlaceOrder) over the subsystem. Clients make one call.' },
  { s: 'A singleton service needs the per-request DbContext, so the developer injects it in the constructor.',
    o: ['Good DI', 'Captive dependency (bug)', 'Unit of Work', 'Null Object'], a: 1,
    why: 'A singleton capturing a scoped service is the captive dependency bug. Make the service scoped, or create a scope per operation with IServiceScopeFactory.' },
  { s: 'Validation of a signup form can fail for 5 expected reasons. Callers must show the message to the user, and exceptions are currently caught everywhere.',
    o: ['Result<T>', 'Null Object', 'Singleton', 'Proxy'], a: 0,
    why: 'Result<T>: expected failures become return values that the caller must handle. Keep exceptions for unexpected failures.' },
];
var order = [];
var idx = 0;
var score = 0;
var answered = false;

function start() {
  order = Q.map(function (_, i) { return i; });
  idx = 0;
  score = 0;
  show();
}

function show() {
  var total = order.length;
  $('bar').style.width = Math.round(idx / total * 100) + '%';
  $('score').textContent = 'score ' + score + ' / ' + idx;
  if (idx >= total) {
    $('prog').textContent = 'Finished';
    $('card').innerHTML = '<div class="done"><h3>' + score + ' / ' + total + ' correct</h3><p>' +
      (score >= total - 2 ? 'Great pattern sense! 🎉' : 'Review the look-alikes table above, then try again.') + '</p></div>';
    console.log('quiz finished: ' + score + '/' + total);
    return;
  }
  var q = Q[order[idx]];
  $('prog').textContent = 'Scenario ' + (idx + 1) + ' / ' + total;
  $('scn').textContent = q.s;
  $('fb').className = 'fb';
  $('fb').textContent = '';
  $('next').disabled = true;
  answered = false;
  var box = $('opts');
  box.innerHTML = '';
  q.o.forEach(function (name, i) {
    var b = document.createElement('button');
    b.textContent = name;
    b.onclick = function () { pick(i, b); };
    box.appendChild(b);
  });
}

function pick(i, btn) {
  if (answered) return;
  answered = true;
  var q = Q[order[idx]];
  var buttons = $('opts').querySelectorAll('button');
  buttons[q.a].classList.add('right');
  if (i === q.a) {
    score++;
    $('fb').className = 'fb ok';
    $('fb').textContent = '✓ ' + q.why;
  } else {
    btn.classList.add('wrong');
    $('fb').className = 'fb no';
    $('fb').textContent = '✗ Not ' + q.o[i] + '. ' + q.why;
  }
  console.log('scenario ' + (idx + 1) + ': picked ' + q.o[i] + (i === q.a ? ' (correct)' : ' (answer: ' + q.o[q.a] + ')'));
  $('score').textContent = 'score ' + score + ' / ' + (idx + 1);
  $('next').disabled = false;
}

$('next').onclick = function () { idx++; show(); };
$('restart').onclick = function () {
  if (!$('scn')) {
    $('card').innerHTML = '<p class="scn" id="scn"></p><div class="opts" id="opts"></div><div class="fb" id="fb"></div>' +
      '<div style="text-align:right;margin-top:8px"><button id="next" disabled>Next →</button></div>';
    $('next').onclick = function () { idx++; show(); };
  }
  start();
};
start();
</script>`,
        explain: `
          <details>
            <summary>How to use it</summary>
            <p>Read each scenario and pick a pattern. The explanation always names the closest look-alike and why it doesn't fit, which is the skill that matters in code reviews. Scenarios 11 and 12 recap the DI and Result lessons. Click <b>Restart</b> to play again.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Decorator, Proxy and Adapter all wrap another object. Which one changes the interface?',
        options: ['Decorator', 'Proxy', 'Adapter', 'All of them'],
        answer: 2,
        why: 'Adapter converts to a different interface. Decorator and Proxy keep the same interface: one adds behaviour, the other controls access.',
      },
      {
        q: 'What distinguishes State from Strategy?',
        options: ['State uses interfaces, Strategy doesn\'t', 'In State, the state objects drive transitions as the context\'s status changes; in Strategy, the client chooses the algorithm', 'Strategy can only have two implementations', 'They are unrelated'],
        answer: 1,
        why: 'The structure is nearly identical. The difference is who switches the implementation and why.',
      },
      {
        q: 'A codebase has <code>IUserServiceFactoryProvider</code> with one implementation that returns one <code>UserService</code>. What is the smell?',
        options: ['Captive dependency', 'Pattern-itis / speculative generality', 'Missing Unit of Work', 'Not enough singletons'],
        answer: 1,
        why: 'Abstractions without a real second variation or test need add reading cost and no value. YAGNI: introduce them when the variation shows up.',
      },
      {
        q: 'You need "one shared instance for the whole app" of a cache in ASP.NET Core. Best approach?',
        options: ['A static Singleton class with <code>Instance</code>', 'Register it with <code>AddSingleton&lt;ICache, MemoryCache&gt;()</code> and inject it', 'Create a new one in every controller', 'Use a Service Locator'],
        answer: 1,
        why: 'A singleton <em>lifetime</em> via DI gives one instance while keeping dependencies explicit and testable. The classic static Singleton pattern is global state.',
      },
      {
        q: 'Observer vs Mediator: which statement is right?',
        options: ['Observer: subject broadcasts to subscribers; Mediator: a hub coordinates interactions between colleagues', 'They are the same pattern', 'Mediator is only for UIs', 'Observer requires a message queue'],
        answer: 0,
        why: 'Observer is one-to-many notification. Mediator centralises many-to-many communication so colleagues don\'t reference each other.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>PriceCalculator</code> mixes two concerns: a <code>switch</code> on customer type (the algorithm varies) and logging (a cross-cutting extra). Pick the right patterns:</p>
        <ul><li><strong>Strategy</strong>: <code>interface IPricing { decimal Price(decimal amount); }</code> with <code>RegularPricing</code>, <code>VipPricing</code>, <code>StaffPricing</code>;</li>
        <li><strong>Decorator</strong>: <code>LoggingPricing</code> implements <code>IPricing</code> and wraps another <code>IPricing</code>;</li>
        <li>remove the <code>switch (customerType)</code> statement from the pricing logic (a small factory with a switch <em>expression</em> is fine).</li></ul>
        <p>Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class LoggingPricing(IPricing inner, string name) : IPricing { public decimal Price(decimal a) { Console.WriteLine($"pricing {name}"); return inner.Price(a); } }',
      starter: `var calc = new PriceCalculator();
Console.WriteLine(calc.Price("regular", 100m));
Console.WriteLine(calc.Price("vip", 100m));
Console.WriteLine(calc.Price("staff", 100m));

public class PriceCalculator
{
  public decimal Price(string customerType, decimal amount)
  {
    Console.WriteLine($"pricing {customerType}");   // logging mixed into the algorithm
    switch (customerType)
    {
      case "vip":
        return amount * 0.8m;
      case "staff":
        return amount * 0.5m;
      default:
        return amount;
    }
  }
}`,
      solution: `foreach (var type in new[] { "regular", "vip", "staff" })
{
  IPricing pricing = new LoggingPricing(PricingFactory.For(type), type);
  Console.WriteLine(pricing.Price(100m));
}

public interface IPricing
{
  decimal Price(decimal amount);
}

public class RegularPricing : IPricing
{
  public decimal Price(decimal amount) => amount;
}

public class VipPricing : IPricing
{
  public decimal Price(decimal amount) => amount * 0.8m;
}

public class StaffPricing : IPricing
{
  public decimal Price(decimal amount) => amount * 0.5m;
}

// Decorator: adds logging around any pricing strategy
public class LoggingPricing(IPricing inner, string name) : IPricing
{
  public decimal Price(decimal amount)
  {
    Console.WriteLine($"pricing {name}");
    return inner.Price(amount);
  }
}

// Simple factory: the one place that maps a name to a strategy
public static class PricingFactory
{
  public static IPricing For(string customerType) => customerType switch
  {
    "vip" => new VipPricing(),
    "staff" => new StaffPricing(),
    _ => new RegularPricing(),
  };
}`,
      checks: [
        { label: 'Declares interface IPricing', re: /interface\s+IPricing\b/ },
        { label: 'At least three classes implement IPricing', re: /(class\s+\w+[^{]*:\s*IPricing\b[\s\S]*){3,}/ },
        { label: 'A decorator implements IPricing and wraps an IPricing', re: /class\s+\w+\s*\(\s*IPricing\s+\w+[^)]*\)\s*:\s*IPricing\b|class\s+\w+[^{]*:\s*IPricing\s*\{[^}]*IPricing\s+\w+/ },
        { label: 'No switch (customerType) statement left', re: /switch\s*\(\s*customerType\s*\)/, absent: true },
      ],
    }),
  },
);
