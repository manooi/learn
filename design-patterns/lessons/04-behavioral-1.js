window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── STRATEGY ─────────────────────────────────────────────
  {
    id: 'strategy',
    section: 'Behavioral patterns I',
    title: 'Strategy',
    explain: `
      <p><strong>Intent:</strong> put each variant of an algorithm in its own class behind a shared interface, so the
      code that uses it can swap algorithms without changing.</p>

      <h3>The problem</h3>
      <p>A checkout has to quote shipping. At first there is one rule. Then marketing wants "express", then
      "free over $100", then a flat-rate promo for December. Each new rule lands in the same method:</p>
      <pre><code>// ❌ Before: every new rule edits (and risks breaking) this method
decimal Quote(Order o, string method) =&gt; method switch
{
  "standard" =&gt; 5m + 1.5m * o.WeightKg,
  "express"  =&gt; 15m + 3m * o.WeightKg,
  "free100"  =&gt; o.Subtotal &gt;= 100 ? 0 : 5m + 1.5m * o.WeightKg,   // copy-pasted!
  "flat"     =&gt; 4.99m,
  _          =&gt; throw new ArgumentException(method),
};</code></pre>
      <p>The method grows forever, every rule is tested through it, and you can't add a rule from another project
      without editing this file.</p>

      <h3>The solution</h3>
      <p>Pull each rule out into a class implementing <code>IShippingStrategy</code>. The calculator (the
      <em>context</em>) holds one strategy object and simply delegates: it knows <strong>when</strong> to ask for a
      price, the strategy knows <strong>how</strong> to compute it.</p>
      <pre><code>ShippingCalculator ──has-a──▶ «interface» IShippingStrategy
   Quote(order)                     Calculate(order)
     └─ Strategy.Calculate(order)        ▲
                         ┌───────────────┼────────────────┐
                 StandardShipping  ExpressShipping  FreeOverThreshold</code></pre>
      <ul>
        <li><strong>Strategy</strong> — the interface (<code>IShippingStrategy</code>).</li>
        <li><strong>Concrete strategies</strong> — one class per algorithm.</li>
        <li><strong>Context</strong> — the class that uses a strategy (<code>ShippingCalculator</code>); usually
        receives it through the constructor (often from DI) or a property.</li>
      </ul>

      <h3>Lightweight strategies: delegates</h3>
      <p>If a strategy is a single method with no state, a delegate is a perfectly good strategy:
      <code>Func&lt;Order, decimal&gt;</code>. LINQ is full of these — the lambda you pass to
      <code>OrderBy</code> or <code>Where</code> <em>is</em> the strategy. Use a full interface when the strategy
      needs a name, several methods, dependencies, or registration in DI.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Several interchangeable ways to do one job, chosen by config, user choice, country, A/B test…</li>
        <li>✅ You want to unit-test each algorithm alone, or add new ones without touching existing code.</li>
        <li>❌ Two fixed cases that will never grow — an <code>if</code> is clearer.</li>
      </ul>

      <h3>In .NET</h3>
      <ul>
        <li><code>IComparer&lt;T&gt;</code> / <code>Comparison&lt;T&gt;</code> passed to <code>List&lt;T&gt;.Sort</code>
        — how to compare is a strategy.</li>
        <li><code>IEqualityComparer&lt;T&gt;</code> for <code>Dictionary</code>/<code>HashSet</code>
        (e.g. <code>StringComparer.OrdinalIgnoreCase</code>).</li>
        <li>Registering one of several implementations of an interface in DI and injecting it.</li>
      </ul>
      <div class="tip">Strategy is mostly "programming to an interface + composition". If you've ever injected an
      <code>IPaymentGateway</code>, you've used it.</div>
    `,
    examples: [
      {
        title: 'C#: shipping strategies, a lambda strategy and IComparer<T>',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var order = new Order("A-100", WeightKg: 3.5m, Subtotal: 120m);
var calc = new ShippingCalculator(new StandardShipping());
Quote();

calc.Strategy = new ExpressShipping();
Quote();

calc.Strategy = new FreeOverThreshold(100m, new StandardShipping());
Quote();
Console.WriteLine($"  cheap order instead: {calc.Quote(order with { Subtotal = 40m }):0.00}");

// A lambda is a one-method strategy: no class needed.
calc.Strategy = new LambdaShipping("Flat 4.99", _ => 4.99m);
Quote();

// The BCL is full of strategies: IComparer<T> tells Sort() HOW to compare.
List<Order> orders = [new("A-1", 5m, 300m), new("A-2", 1m, 40m), new("A-3", 2.5m, 90m)];
orders.Sort(new ByWeight());
Console.WriteLine("By weight:   " + string.Join(", ", orders.Select(o => o.Id)));
orders.Sort((a, b) => b.Subtotal.CompareTo(a.Subtotal));
Console.WriteLine("By subtotal: " + string.Join(", ", orders.Select(o => o.Id)));

void Quote() =>
  Console.WriteLine($"{calc.Strategy.Name,-14} {calc.Quote(order),6:0.00}");

record Order(string Id, decimal WeightKg, decimal Subtotal);

interface IShippingStrategy
{
  string Name { get; }
  decimal Calculate(Order order);
}

class StandardShipping : IShippingStrategy
{
  public string Name => "Standard";
  public decimal Calculate(Order o) => 5m + 1.5m * o.WeightKg;
}

class ExpressShipping : IShippingStrategy
{
  public string Name => "Express";
  public decimal Calculate(Order o) => 15m + 3m * o.WeightKg;
}

class FreeOverThreshold(decimal threshold, IShippingStrategy fallback) : IShippingStrategy
{
  public string Name => $"Free over {threshold}";
  public decimal Calculate(Order o) => o.Subtotal >= threshold ? 0m : fallback.Calculate(o);
}

class LambdaShipping(string name, Func<Order, decimal> calculate) : IShippingStrategy
{
  public string Name => name;
  public decimal Calculate(Order o) => calculate(o);
}

// The context: knows WHEN to ask for a price, not HOW it is computed.
class ShippingCalculator(IShippingStrategy strategy)
{
  public IShippingStrategy Strategy { get; set; } = strategy;
  public decimal Quote(Order order) => Strategy.Calculate(order);
}

class ByWeight : IComparer<Order>
{
  public int Compare(Order? a, Order? b) => a!.WeightKg.CompareTo(b!.WeightKg);
}`,
        output: `Standard        10.25
Express         25.50
Free over 100    0.00
  cheap order instead: 10.25
Flat 4.99        4.99
By weight:   A-2, A-3, A-1
By subtotal: A-1, A-3, A-2`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>class ShippingCalculator(IShippingStrategy strategy)
{
  public IShippingStrategy Strategy { get; set; } = strategy;     // ①
  public decimal Quote(Order order) =&gt; Strategy.Calculate(order);  // ②
}

class FreeOverThreshold(decimal threshold, IShippingStrategy fallback) // ③
calc.Strategy = new LambdaShipping("Flat 4.99", _ =&gt; 4.99m);          // ④
orders.Sort(new ByWeight());                                          // ⑤</code></pre>
            <ol>
              <li><strong>①</strong> The context only depends on the interface. Swapping is a one-line assignment;
              in real apps it's usually a constructor parameter filled by DI.</li>
              <li><strong>②</strong> Delegation: <code>Quote</code> contains no pricing logic at all.</li>
              <li><strong>③</strong> Strategies can wrap other strategies — "free over 100, otherwise standard" reuses
              <code>StandardShipping</code> instead of copy-pasting its formula.</li>
              <li><strong>④</strong> An adapter that turns any <code>Func&lt;Order, decimal&gt;</code> into a strategy.
              Good for one-off rules and tests.</li>
              <li><strong>⑤</strong> <code>List&lt;T&gt;.Sort</code> is the context, <code>IComparer&lt;T&gt;</code> the
              strategy. The next line passes a <code>Comparison&lt;T&gt;</code> lambda instead — same idea.</li>
            </ol>
          </details>
          <details>
            <summary>Interface or <code>Func</code>?</summary>
            <table>
              <tr><th></th><th><code>interface IShippingStrategy</code></th><th><code>Func&lt;Order, decimal&gt;</code></th></tr>
              <tr><td>Extra members (Name, Validate…)</td><td>Yes</td><td>No</td></tr>
              <tr><td>Own dependencies (repositories, options)</td><td>Constructor injection</td><td>Closures only</td></tr>
              <tr><td>Register in DI by type</td><td>Easy</td><td>Awkward</td></tr>
              <tr><td>Ceremony</td><td>A class per variant</td><td>One lambda</td></tr>
            </table>
            <div class="tip">Start with a lambda when a method just needs "a way to do X"; promote it to an
            interface once it needs a name, state or dependencies.</div>
          </details>
        `,
      },
      {
        title: 'Widget: swap the strategy, keep the context',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 8px; }
  .row { display: flex; gap: 14px; flex-wrap: wrap; align-items: center; margin-bottom: 10px; }
  .diag { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 6px 0 10px; }
  .box { border: 2px solid #c5c9d6; border-radius: 10px; padding: 8px 12px; background: #f8f9fc;
    text-align: center; min-width: 120px; }
  .box small { display: block; color: #646b80; font-size: 11px; font-family: ui-monospace, Menlo, monospace; }
  .box.ctx { border-color: #4f6bed; background: #eef1ff; }
  .box.str { border-color: #1a7f37; background: #e9f7ee; }
  .arr { color: #646b80; font-size: 12px; text-align: center; min-width: 80px;
    font-family: ui-monospace, Menlo, monospace; }
  .arr.on { color: #4f6bed; font-weight: 700; }
  .pulse { animation: pulse .7s; }
  @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(79,107,237,.8); } 100% { box-shadow: 0 0 0 12px rgba(79,107,237,0); } }
  .quote { font-size: 24px; font-weight: 700; color: #1a7f37; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 120px; overflow: auto; white-space: pre; }
</style>
<div class="hint">Pick a strategy and move the sliders. The ShippingCalculator (context) never changes: it just
delegates <code>Quote(order)</code> to whichever strategy object it currently holds.</div>
<div class="row">
  <label>Strategy
    <select id="sel">
      <option value="standard">StandardShipping</option>
      <option value="express">ExpressShipping</option>
      <option value="free">FreeOverThreshold(100, Standard)</option>
      <option value="flat">LambdaShipping (Func)</option>
    </select>
  </label>
  <label>Weight <input type="range" id="kg" min="0.5" max="20" step="0.5" value="3.5"> <b id="kgv"></b> kg</label>
  <label>Subtotal <input type="range" id="sub" min="10" max="300" step="10" value="120"> <b id="subv"></b></label>
</div>
<div class="diag">
  <div class="box" id="client">Client<small>calc.Quote(order)</small></div>
  <div class="arr" id="a1">Quote(order) →</div>
  <div class="box ctx" id="ctx">ShippingCalculator<small id="ctxs"></small></div>
  <div class="arr" id="a2">Calculate(order) →</div>
  <div class="box str" id="str"><b id="sname"></b><small id="formula"></small></div>
</div>
<div>Quote: <span class="quote" id="q"></span> <span id="back" style="color:#646b80;font-size:13px"></span></div>
<div class="log" id="log"></div>
<script>
  var S = {
    standard: { cls: 'StandardShipping', name: 'Standard', f: '5 + 1.5 × kg',
      calc: function (o) { return 5 + 1.5 * o.kg; } },
    express: { cls: 'ExpressShipping', name: 'Express', f: '15 + 3 × kg',
      calc: function (o) { return 15 + 3 * o.kg; } },
    free: { cls: 'FreeOverThreshold', name: 'Free over 100', f: 'subtotal ≥ 100 ? 0 : fallback',
      calc: function (o) { return o.sub >= 100 ? 0 : 5 + 1.5 * o.kg; } },
    flat: { cls: 'LambdaShipping', name: 'Flat 4.99', f: '_ => 4.99m   (a Func)',
      calc: function () { return 4.99; } }
  };
  var $ = function (id) { return document.getElementById(id); };
  var current = 'standard';
  var logEl = $('log');

  function log(line) {
    logEl.textContent += line + String.fromCharCode(10);
    logEl.scrollTop = logEl.scrollHeight;
    console.log(line);
  }

  function pulse(el) {
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
  }

  function flowStep(ids, i) {
    if (i >= ids.length) return;
    var el = $(ids[i]);
    if (el.classList.contains('arr')) {
      el.classList.add('on');
      setTimeout(function () { el.classList.remove('on'); }, 350);
    } else {
      pulse(el);
    }
    setTimeout(function () { flowStep(ids, i + 1); }, 160);
  }

  function quote() {
    var o = { kg: Number($('kg').value), sub: Number($('sub').value) };
    $('kgv').textContent = o.kg;
    $('subv').textContent = o.sub;
    var s = S[current];
    var price = s.calc(o).toFixed(2);
    $('sname').textContent = s.cls;
    $('formula').textContent = s.f;
    $('ctxs').textContent = 'Strategy = ' + s.cls;
    $('q').textContent = price;
    $('back').textContent = '← returned by ' + s.cls + '.Calculate';
    flowStep(['client', 'a1', 'ctx', 'a2', 'str'], 0);
    log('calc.Quote(kg=' + o.kg + ', subtotal=' + o.sub + ') -> ' + s.cls + '.Calculate -> ' + price);
  }

  $('sel').onchange = function () {
    current = $('sel').value;
    log('calc.Strategy = new ' + S[current].cls + '(...)');
    quote();
  };
  $('kg').oninput = quote;
  $('sub').oninput = quote;
  quote();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Choose <strong>FreeOverThreshold</strong>, then drag <em>Subtotal</em> below 100: the price jumps from
              0.00 to the standard formula — the strategy delegates to its fallback strategy.</li>
              <li>Choose <strong>LambdaShipping</strong> and drag <em>Weight</em>: nothing changes, because the lambda
              ignores the order entirely (<code>_ =&gt; 4.99m</code>).</li>
              <li>Watch the blue box: its code is identical for every choice. Only the green box is replaced.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In the Strategy pattern, what does the <em>context</em> (e.g. <code>ShippingCalculator</code>) know?',
        options: [
          'The formula of every strategy, so it can pick the right one',
          'Only the strategy interface: when to call it, not how it computes',
          'Nothing — the client calls the strategy directly',
          'Which concrete strategy classes exist, via a switch',
        ],
        answer: 1,
        why: 'The context depends only on the interface and delegates. That is what lets you add strategies without editing it.',
      },
      {
        q: 'An app lets each country pick a tax calculation rule at startup from config. Which pattern fits best?',
        options: ['Observer', 'Strategy', 'Template Method', 'Command'],
        answer: 1,
        why: 'Several interchangeable algorithms for the same job, chosen at runtime → Strategy (an <code>ITaxCalculator</code> registered per country).',
      },
      {
        q: 'Which BCL type is a textbook Strategy?',
        options: [
          '<code>IComparer&lt;T&gt;</code> passed to <code>List&lt;T&gt;.Sort</code>',
          '<code>StringBuilder</code>',
          '<code>Lazy&lt;T&gt;</code>',
          '<code>IDisposable</code>',
        ],
        answer: 0,
        why: '<code>Sort</code> is the fixed algorithm (context); the comparer is the pluggable "how to compare" strategy.',
      },
      {
        q: 'When is a <code>Func&lt;Order, decimal&gt;</code> a better strategy than an interface?',
        options: [
          'When the strategy needs several methods and its own injected services',
          'Never — delegates are not real strategies',
          'When it is one stateless operation and you want minimal ceremony',
          'Only in async code',
        ],
        answer: 2,
        why: 'A delegate is a one-method strategy. Once you need names, multiple members or DI-injected dependencies, an interface reads better.',
      },
      {
        q: 'You have exactly two shipping options that have not changed in five years. What is the pragmatic choice?',
        options: [
          'Always introduce Strategy — it is best practice',
          'A simple <code>if</code>/switch; introduce Strategy when variants start multiplying',
          'Use inheritance: <code>ExpressOrder : Order</code>',
          'Use Observer so options can subscribe',
        ],
        answer: 1,
        why: 'Patterns cost indirection. Refactor to Strategy when the switch starts growing or variants need separate testing.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>PriceCalculator</code> switches on a customer-type string. Refactor it to Strategy:
      declare <code>IDiscountStrategy</code> with a method like <code>decimal Apply(decimal price)</code>, write one class per
      customer type, and make <code>PriceCalculator</code> receive an <code>IDiscountStrategy</code> (constructor or property)
      instead of the string. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class PriceCalculator(IDiscountStrategy discount) { public decimal Final(decimal price) => discount.Apply(price); } — then RegularDiscount, VipDiscount, StaffDiscount each implement Apply.',
      starter: `var calc = new PriceCalculator();
Console.WriteLine(calc.Final(100m, "regular"));
Console.WriteLine(calc.Final(100m, "vip"));
Console.WriteLine(calc.Final(100m, "staff"));

class PriceCalculator
{
  public decimal Final(decimal price, string customerType)
  {
    switch (customerType)
    {
      case "regular": return price;
      case "vip": return price * 0.8m;
      case "staff": return price * 0.5m;
      default: throw new ArgumentException(customerType);
    }
  }
}`,
      solution: `Console.WriteLine(new PriceCalculator(new RegularDiscount()).Final(100m));
Console.WriteLine(new PriceCalculator(new VipDiscount()).Final(100m));
Console.WriteLine(new PriceCalculator(new StaffDiscount()).Final(100m));

interface IDiscountStrategy
{
  decimal Apply(decimal price);
}

class RegularDiscount : IDiscountStrategy
{
  public decimal Apply(decimal price) => price;
}

class VipDiscount : IDiscountStrategy
{
  public decimal Apply(decimal price) => price * 0.8m;
}

class StaffDiscount : IDiscountStrategy
{
  public decimal Apply(decimal price) => price * 0.5m;
}

class PriceCalculator(IDiscountStrategy discount)
{
  public decimal Final(decimal price) => discount.Apply(price);
}`,
      checks: [
        { label: 'Declares interface IDiscountStrategy', re: /interface\s+IDiscountStrategy\b/ },
        { label: 'At least two classes implement IDiscountStrategy', re: /:\s*IDiscountStrategy\b[\s\S]*:\s*IDiscountStrategy\b/ },
        { label: 'PriceCalculator receives an IDiscountStrategy', re: /[(,]\s*IDiscountStrategy\s+\w+|IDiscountStrategy\??\s+\w+\s*\{\s*get/ },
        { label: 'No switch on customerType left', re: /switch\s*\(\s*customerType/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────── OBSERVER ─────────────────────────────────────────────
  {
    id: 'observer',
    section: 'Behavioral patterns I',
    title: 'Observer',
    explain: `
      <p><strong>Intent:</strong> let one object (the <em>subject</em>) notify any number of other objects
      (<em>observers</em>) when something happens, without knowing who they are.</p>

      <h3>The problem</h3>
      <p>A stock ticker gets a new price. The chart must redraw, the audit log must record it, the mobile app must
      push an alert. If the ticker calls them directly, it has to reference every one of them, and adding a new
      listener means editing the ticker:</p>
      <pre><code>// ❌ Before: the ticker knows every consumer
public void Update(decimal price)
{
  _chart.Redraw(price);
  _audit.Write(price);
  _push.Send(price);      // new feature = edit the ticker again
}</code></pre>

      <h3>The solution</h3>
      <p>The subject exposes a <em>subscription point</em>. Observers register themselves; the subject just loops over
      "whoever is registered" and notifies them. Dependencies point <em>from</em> the observers <em>to</em> the subject,
      never the other way.</p>
      <pre><code>StockTicker (subject)                 observers
  event PriceChanged ── notifies ──▶  audit lambda
                      ── notifies ──▶  ChartWindow.OnPrice
                      ── notifies ──▶  …anyone who did +=</code></pre>

      <h3>C# has it built in: <code>event</code></h3>
      <pre><code>public event EventHandler&lt;PriceChangedEventArgs&gt;? PriceChanged;   // subscription point

PriceChanged?.Invoke(this, new PriceChangedEventArgs("ACME", 101m)); // notify all

ticker.PriceChanged += OnPrice;   // subscribe
ticker.PriceChanged -= OnPrice;   // unsubscribe</code></pre>
      <p>An event is a multicast delegate with protection: outsiders can only <code>+=</code> and <code>-=</code>, only
      the owning class can invoke it. Handlers run <strong>synchronously, one after another, in subscription
      order</strong>.</p>

      <h3>The push-stream flavour: <code>IObservable&lt;T&gt;</code></h3>
      <pre><code>public interface IObservable&lt;out T&gt; { IDisposable Subscribe(IObserver&lt;T&gt; observer); }
public interface IObserver&lt;in T&gt;
{
  void OnNext(T value);
  void OnError(Exception error);
  void OnCompleted();
}</code></pre>
      <p>Same pattern as an interface pair. <code>Subscribe</code> returns an <code>IDisposable</code> — disposing it
      unsubscribes, which makes cleanup harder to forget. It is the basis of Rx.NET (<code>System.Reactive</code>).</p>

      <h3>Three pitfalls (see the walkthrough)</h3>
      <ul>
        <li><strong>Memory leaks</strong> — the subject holds a strong reference to every handler. A "closed" window that
        never unsubscribes stays alive and keeps running code.</li>
        <li><strong>Order</strong> — handlers run in subscription order; don't let one depend on another having run.</li>
        <li><strong>Exceptions</strong> — if one handler throws, <code>Invoke</code> stops and later handlers never run.</li>
      </ul>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ One-to-many notifications where the source shouldn't know the listeners (UI events, domain events,
        <code>INotifyPropertyChanged</code>, file watchers).</li>
        <li>❌ When you need a reply or a guaranteed single handler — call a method or use a mediator instead.</li>
        <li>❌ Long chains of events triggering events: control flow becomes very hard to follow.</li>
      </ul>
      <h3>In .NET</h3>
      <p>Every <code>event</code> (<code>Button.Click</code>, <code>FileSystemWatcher.Changed</code>),
      <code>INotifyPropertyChanged</code> in WPF/MAUI data binding, <code>IObservable&lt;T&gt;</code>,
      <code>IOptionsMonitor&lt;T&gt;.OnChange</code>, <code>CancellationToken.Register</code>.</p>
    `,
    examples: [
      {
        title: 'C#: events, a leak, and a throwing handler',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var ticker = new StockTicker("ACME");
ticker.PriceChanged += (_, e) => Console.WriteLine($"  [audit] {e.Symbol} = {e.Price}");
var chart = new ChartWindow(ticker);

Console.WriteLine("1) publish to 2 subscribers (in subscription order)");
ticker.Update(101m);

Console.WriteLine("2) chart closed, but it forgot to unsubscribe");
chart.Close();
ticker.Update(102m);
Console.WriteLine($"  subscribers: {ticker.SubscriberCount}");

Console.WriteLine("3) Dispose() unsubscribes with -=");
chart.Dispose();
ticker.Update(103m);
Console.WriteLine($"  subscribers: {ticker.SubscriberCount}");

Console.WriteLine("4) a handler throws: later handlers never run");
ticker.PriceChanged += Boom;
ticker.PriceChanged += Late;
try
{
  ticker.Update(104m);
}
catch (InvalidOperationException ex)
{
  Console.WriteLine($"  caught: {ex.Message}");
}

Console.WriteLine("5) SafeUpdate: each handler in its own try/catch");
ticker.SafeUpdate(105m);

static void Boom(object? sender, PriceChangedEventArgs e) =>
  throw new InvalidOperationException("boom handler failed");

static void Late(object? sender, PriceChangedEventArgs e) =>
  Console.WriteLine($"  [late] {e.Symbol} = {e.Price}");

record PriceChangedEventArgs(string Symbol, decimal Price);

class StockTicker(string symbol)
{
  public event EventHandler<PriceChangedEventArgs>? PriceChanged;

  public int SubscriberCount => PriceChanged?.GetInvocationList().Length ?? 0;

  public void Update(decimal price) =>
    PriceChanged?.Invoke(this, new PriceChangedEventArgs(symbol, price));

  public void SafeUpdate(decimal price)
  {
    if (PriceChanged is null) return;
    var args = new PriceChangedEventArgs(symbol, price);
    foreach (EventHandler<PriceChangedEventArgs> handler in PriceChanged.GetInvocationList())
    {
      try
      {
        handler(this, args);
      }
      catch (Exception ex)
      {
        Console.WriteLine($"  (a handler failed: {ex.Message}; carrying on)");
      }
    }
  }
}

class ChartWindow : IDisposable
{
  private readonly StockTicker _ticker;
  private bool _open = true;

  public ChartWindow(StockTicker ticker)
  {
    _ticker = ticker;
    _ticker.PriceChanged += OnPrice;   // the ticker now holds a reference to this window
  }

  public void Close() => _open = false; // BUG: hidden from screen, still subscribed

  public void Dispose()
  {
    _open = false;
    _ticker.PriceChanged -= OnPrice;
  }

  private void OnPrice(object? sender, PriceChangedEventArgs e) =>
    Console.WriteLine($"  [chart] redraw {e.Price}" + (_open ? "" : "  <- closed window still runs!"));
}`,
        output: `1) publish to 2 subscribers (in subscription order)
  [audit] ACME = 101
  [chart] redraw 101
2) chart closed, but it forgot to unsubscribe
  [audit] ACME = 102
  [chart] redraw 102  <- closed window still runs!
  subscribers: 2
3) Dispose() unsubscribes with -=
  [audit] ACME = 103
  subscribers: 1
4) a handler throws: later handlers never run
  [audit] ACME = 104
  caught: boom handler failed
5) SafeUpdate: each handler in its own try/catch
  [audit] ACME = 105
  (a handler failed: boom handler failed; carrying on)
  [late] ACME = 105`,
        explain: `
          <details>
            <summary>The problem: the subject keeps observers alive (memory leak)</summary>
            <p><code>ticker.PriceChanged += OnPrice</code> stores a delegate inside the ticker. That delegate points at
            the <code>ChartWindow</code> instance (<code>OnPrice</code> is an instance method). So as long as the ticker
            lives, the window can't be garbage-collected — <em>even if nothing else references it</em>.</p>
            <table>
              <tr><th>Step</th><th>Invocation list of <code>PriceChanged</code></th><th>Console</th></tr>
              <tr><td>1) <code>Update(101)</code></td><td>[audit lambda, chart.OnPrice]</td><td><code>[audit] ACME = 101</code><br><code>[chart] redraw 101</code></td></tr>
              <tr><td>2) <code>chart.Close()</code> then <code>Update(102)</code></td><td>[audit lambda, chart.OnPrice] — unchanged!</td><td><code>[chart] redraw 102  &lt;- closed window still runs!</code><br><code>subscribers: 2</code></td></tr>
              <tr><td>3) <code>chart.Dispose()</code> then <code>Update(103)</code></td><td>[audit lambda]</td><td>only <code>[audit] ACME = 103</code><br><code>subscribers: 1</code></td></tr>
            </table>
            <p>In a real app the "closed" window keeps redrawing an invisible chart on every tick, and each window you
            open and close adds another one. Classic WPF/WinForms leak: a short-lived object subscribes to a long-lived
            one (a singleton service, a static event) and never unsubscribes.</p>
            <div class="tip">Rule of thumb: whoever does <code>+=</code> is responsible for <code>-=</code>, usually in
            <code>Dispose()</code>. With <code>IObservable&lt;T&gt;</code>, keep the <code>IDisposable</code> returned by
            <code>Subscribe</code> and dispose it.</div>
          </details>
          <details>
            <summary>Step by step: order and the throwing handler</summary>
            <p>Before step 4 the list is <code>[audit]</code>. Then <code>Boom</code> and <code>Late</code> are added,
            giving <code>[audit, Boom, Late]</code>. <code>Invoke</code> calls them one by one, on the same thread:</p>
            <table>
              <tr><th>#</th><th>Handler</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>audit lambda</td><td>runs normally</td><td><code>[audit] ACME = 104</code></td></tr>
              <tr><td>2</td><td><code>Boom</code></td><td>throws <code>InvalidOperationException</code></td><td>—</td></tr>
              <tr><td>3</td><td><code>Late</code></td><td><strong>never called</strong>: the exception unwinds out of <code>Invoke</code> and <code>Update</code></td><td>—</td></tr>
              <tr><td></td><td>caller's <code>catch</code></td><td>catches it</td><td><code>caught: boom handler failed</code></td></tr>
            </table>
            <p>So one buggy subscriber silently "unsubscribes" everyone after it — and if nobody catches, it also
            crashes the publisher.</p>
          </details>
          <details>
            <summary>The fix: isolate each handler with <code>GetInvocationList()</code></summary>
            <pre><code>foreach (EventHandler&lt;PriceChangedEventArgs&gt; handler in PriceChanged.GetInvocationList()) // ①
{
  try { handler(this, args); }                                                               // ②
  catch (Exception ex) { Console.WriteLine($"  (a handler failed: {ex.Message}; carrying on)"); } // ③
}</code></pre>
            <ol>
              <li><strong>①</strong> <code>GetInvocationList()</code> returns a snapshot array of the individual
              delegates, in subscription order. The typed <code>foreach</code> casts each one.</li>
              <li><strong>②</strong> Each handler is called separately, so…</li>
              <li><strong>③</strong> …a failure is logged and the loop continues: step 5 prints audit, the failure note,
              and then <code>[late] ACME = 105</code>.</li>
            </ol>
            <div class="warn"><code>PriceChanged?.Invoke(...)</code> copies the delegate before calling it, so it is safe
            even if another thread unsubscribes the last handler in between. Don't write
            <code>if (PriceChanged != null) PriceChanged(...)</code> in multi-threaded code.</div>
          </details>
        `,
      },
      {
        title: 'Widget: subscribe, publish, break things',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  svg { width: 100%; max-width: 620px; height: auto; display: block; }
  .ctl { display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: center; margin: 6px 0; font-size: 13px; }
  .obs { display: flex; flex-wrap: wrap; gap: 6px; margin: 4px 0; }
  .obs div { border: 1px solid #d5d9e5; border-radius: 8px; padding: 3px 6px; font-size: 13px; background: #fafbfd; }
  .obs button { font-size: 12px; padding: 2px 8px; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 105px; overflow: auto; white-space: pre; }
  .order { font: 12px ui-monospace, Menlo, monospace; color: #4f6bed; }
</style>
<div class="hint">Subscribe (+=) or unsubscribe (-=) observers, then click <b>Publish price</b>. Messages are delivered one
by one, in subscription order. Try the "Boom throws" and "close window" toggles.</div>
<div class="ctl">
  <button id="pub" style="font-weight:700">▶ Publish price</button>
  <label><input type="checkbox" id="boomOn" checked> Boom handler throws</label>
  <label><input type="checkbox" id="safe"> Safe publish (try/catch each handler)</label>
</div>
<div class="obs" id="obs"></div>
<div class="order" id="order"></div>
<svg viewBox="0 0 600 230" id="svg"></svg>
<div class="log" id="log"></div>
<script>
  var NS = 'http://www.w3.org/2000/svg';
  var ALL = [
    { id: 'audit', label: 'Audit log' },
    { id: 'chart', label: 'ChartWindow' },
    { id: 'mobile', label: 'Mobile push' },
    { id: 'boom', label: 'Boom' },
    { id: 'late', label: 'Late' }
  ];
  var subs = ['audit', 'chart'];
  var chartClosed = false;
  var price = 100;
  var busy = false;
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('svg');
  var hstate = {};

  function el(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    svg.appendChild(e);
    return e;
  }

  function log(line) {
    var l = $('log');
    l.textContent += line + String.fromCharCode(10);
    l.scrollTop = l.scrollHeight;
    console.log(line);
  }

  function yOf(i) { return 8 + i * 44; }
  function label(id) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i].label;
    return id;
  }

  function draw() {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    el('rect', { x: 10, y: 80, width: 150, height: 66, rx: 10, fill: '#eef1ff', stroke: '#4f6bed', 'stroke-width': 2 });
    el('text', { x: 85, y: 105, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 14 }, 'StockTicker');
    el('text', { x: 85, y: 124, 'text-anchor': 'middle', 'font-size': 11, fill: '#646b80' }, 'event PriceChanged');
    el('text', { x: 85, y: 139, 'text-anchor': 'middle', 'font-size': 11, fill: '#646b80' }, 'price = ' + price);
    ALL.forEach(function (o, i) {
      var y = yOf(i);
      var idx = subs.indexOf(o.id);
      var on = idx >= 0;
      el('line', { x1: 160, y1: 113, x2: 400, y2: y + 18, stroke: on ? '#4f6bed' : '#d5d9e5',
        'stroke-width': on ? 2 : 1, 'stroke-dasharray': on ? '' : '4 4' });
      if (on) {
        var mx = 160 + (400 - 160) * 0.62, my = 113 + (y + 18 - 113) * 0.62;
        el('circle', { cx: mx, cy: my, r: 9, fill: '#4f6bed' });
        el('text', { x: mx, y: my + 4, 'text-anchor': 'middle', 'font-size': 11, fill: '#fff', 'font-weight': 700 }, String(idx + 1));
      }
      var st = hstate[o.id];
      var fill = !on ? '#f6f7fa' : st === 'ok' ? '#e6f6ea' : st === 'err' ? '#fdecec' : st === 'skip' ? '#eceef3' : '#fff';
      var stroke = !on ? '#d5d9e5' : st === 'err' ? '#b42318' : st === 'ok' ? '#1a7f37' : '#8a93a8';
      el('rect', { x: 400, y: y, width: 190, height: 36, rx: 8, fill: fill, stroke: stroke, 'stroke-width': 1.5, id: 'box-' + o.id });
      var name = o.label + (o.id === 'chart' && chartClosed ? ' (closed!)' : '');
      el('text', { x: 410, y: y + 15, 'font-size': 13, 'font-weight': 600, fill: on ? '#1f2330' : '#9aa1b3' }, name);
      var sub = !on ? 'not subscribed' : st === 'ok' ? 'handled' : st === 'err' ? 'threw exception' :
        st === 'skip' ? 'never called' : (o.id === 'boom' && $('boomOn').checked ? 'will throw' : 'waiting');
      el('text', { x: 410, y: y + 30, 'font-size': 11, fill: st === 'err' ? '#b42318' : '#646b80' }, sub);
    });
    $('order').textContent = 'Invocation list: [' + subs.map(label).join(', ') + ']';
  }

  function renderControls() {
    var box = $('obs');
    box.innerHTML = '';
    ALL.forEach(function (o) {
      var d = document.createElement('div');
      var on = subs.indexOf(o.id) >= 0;
      var b = document.createElement('button');
      b.textContent = (on ? '-= ' : '+= ') + o.label;
      b.disabled = busy;
      b.onclick = function () {
        if (on) {
          subs.splice(subs.indexOf(o.id), 1);
          log('ticker.PriceChanged -= ' + o.label);
        } else {
          subs.push(o.id);
          log('ticker.PriceChanged += ' + o.label + '   (now #' + subs.length + ')');
        }
        hstate = {};
        renderControls();
        draw();
      };
      d.appendChild(b);
      if (o.id === 'chart') {
        var c = document.createElement('button');
        c.textContent = chartClosed ? 'reopen' : 'close window';
        c.disabled = busy;
        c.onclick = function () {
          chartClosed = !chartClosed;
          log(chartClosed ? 'chart.Close()   (no -= !)' : 'chart reopened');
          renderControls();
          draw();
        };
        d.appendChild(c);
      }
      box.appendChild(d);
    });
  }

  function dot(x2, y2, color) {
    return new Promise(function (resolve) {
      var c = el('circle', { cx: 160, cy: 113, r: 7, fill: color });
      var t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var p = Math.min(1, (t - t0) / 380);
        c.setAttribute('cx', 160 + (x2 - 160) * p);
        c.setAttribute('cy', 113 + (y2 - 113) * p);
        if (p < 1) requestAnimationFrame(frame); else { svg.removeChild(c); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  async function publish() {
    if (busy) return;
    busy = true;
    renderControls();
    price += 1;
    hstate = {};
    draw();
    log('ticker.Update(' + price + ')' + ($('safe').checked ? '  [safe]' : ''));
    if (subs.length === 0) log('  PriceChanged is null: nobody to notify');
    var order = subs.slice();
    for (var i = 0; i < order.length; i++) {
      var id = order[i];
      var y = yOf(ALL.map(function (o) { return o.id; }).indexOf(id));
      await dot(400, y + 18, '#4f6bed');
      if (id === 'boom' && $('boomOn').checked) {
        hstate[id] = 'err';
        draw();
        if ($('safe').checked) {
          log('  (a handler failed: boom handler failed; carrying on)');
        } else {
          for (var j = i + 1; j < order.length; j++) hstate[order[j]] = 'skip';
          draw();
          var skipped = order.slice(i + 1).map(label);
          log('  Boom threw! Invoke() aborted' + (skipped.length ? '; never called: ' + skipped.join(', ') : ''));
          break;
        }
      } else {
        hstate[id] = 'ok';
        draw();
        if (id === 'chart') log('  [chart] redraw ' + price + (chartClosed ? '  <- closed window still runs!' : ''));
        else if (id === 'boom') log('  [boom] fine this time');
        else log('  [' + id + '] ACME = ' + price);
      }
      await wait(120);
    }
    busy = false;
    renderControls();
  }

  $('pub').onclick = publish;
  $('boomOn').onchange = draw;
  renderControls();
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>Publish price</strong>: Audit gets the message first, then ChartWindow — the numbers on
              the lines are the invocation order.</li>
              <li>Click <strong>close window</strong> on ChartWindow and publish again: the log shows
              <code>closed window still runs!</code>. That's the leak. Now click <strong>-= ChartWindow</strong> to fix it.</li>
              <li>Click <strong>+= Boom</strong>, then <strong>+= Late</strong>, and publish: Boom turns red and Late is
              "never called". Tick <strong>Safe publish</strong> and publish again: Late now runs.</li>
              <li>Unsubscribe Boom and re-subscribe it: it moves to the end of the list, so it no longer blocks
              anyone. Order is just "who did <code>+=</code> first".</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'An event has handlers A, B, C subscribed in that order. B throws. What happens with a plain <code>PriceChanged?.Invoke(...)</code>?',
        options: [
          'A, B and C all run; the exception is rethrown afterwards',
          'A runs, B throws, C never runs and the exception propagates to the publisher',
          'The handlers run in parallel, so C still runs',
          'B is automatically unsubscribed and C runs',
        ],
        answer: 1,
        why: 'Multicast delegates call handlers sequentially; an exception aborts the loop. Use <code>GetInvocationList()</code> with try/catch per handler to isolate them.',
      },
      {
        q: 'A short-lived view model subscribes to a singleton service\'s event and never unsubscribes. What is the consequence?',
        options: [
          'Nothing; the GC collects the view model when the page closes',
          'A compile-time warning',
          'The singleton holds a reference to the view model, so it stays alive and keeps handling events (leak)',
          'The event is automatically removed after the first call',
        ],
        answer: 2,
        why: 'The event stores a delegate pointing at the subscriber. The publisher (long-lived) keeps the subscriber (short-lived) reachable. Unsubscribe in <code>Dispose</code>.',
      },
      {
        q: 'Why does C# use the <code>event</code> keyword rather than a public delegate field?',
        options: [
          'Events are faster',
          'Outside code can only <code>+=</code>/<code>-=</code>; it cannot invoke the event or overwrite the list with <code>=</code>',
          'Events run handlers asynchronously',
          'Delegates cannot hold more than one method',
        ],
        answer: 1,
        why: 'A public delegate field could be raised or reset (<code>ticker.PriceChanged = null</code>) by anyone. <code>event</code> restricts that to the owning class.',
      },
      {
        q: 'Which is the Observer pattern in the BCL?',
        options: [
          '<code>IObservable&lt;T&gt;</code> / <code>IObserver&lt;T&gt;</code>',
          '<code>IEnumerable&lt;T&gt;</code>',
          '<code>ICloneable</code>',
          '<code>IComparer&lt;T&gt;</code>',
        ],
        answer: 0,
        why: 'The subject pushes values to subscribed observers (<code>OnNext</code>/<code>OnError</code>/<code>OnCompleted</code>). <code>IEnumerable</code> is the pull-based mirror image (Iterator).',
      },
      {
        q: 'What does <code>IObservable&lt;T&gt;.Subscribe</code> return, and why is that useful?',
        options: [
          'A <code>bool</code> telling whether subscription worked',
          'The current value',
          'An <code>IDisposable</code>; disposing it unsubscribes, so cleanup fits <code>using</code>/<code>Dispose</code>',
          'A <code>Task</code> that completes on the first value',
        ],
        answer: 2,
        why: 'Returning a subscription token makes unsubscribing explicit and composable, which helps avoid the forgotten-unsubscribe leak.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>OrderService</code> calls <code>EmailSender</code> and <code>Inventory</code> directly. Turn it into a subject:
      add <code>public event EventHandler&lt;OrderPlaced&gt;? OrderPlaced;</code>, raise it with <code>?.Invoke</code> in
      <code>Place</code>, remove the two fields, and subscribe the email and inventory handlers from the top-level code with
      <code>+=</code>. Finally unsubscribe one of them with <code>-=</code>. Edit the C# in the box below and click
      <strong>Check</strong>.</p>`,
      hint: 'Inside Place: OrderPlaced?.Invoke(this, new OrderPlaced(id, total)); Top level: service.OrderPlaced += email.OnOrderPlaced; and later service.OrderPlaced -= inventory.OnOrderPlaced;',
      starter: `var service = new OrderService();
service.Place("A-1", 40m);

record OrderPlaced(string Id, decimal Total);

class OrderService
{
  private readonly EmailSender _email = new();
  private readonly Inventory _inventory = new();

  public void Place(string id, decimal total)
  {
    Console.WriteLine($"Order {id} placed");
    _email.Send(id);
    _inventory.Reserve(id);
  }
}

class EmailSender
{
  public void Send(string id) => Console.WriteLine($"  email for {id}");
}

class Inventory
{
  public void Reserve(string id) => Console.WriteLine($"  reserve stock for {id}");
}`,
      solution: `var service = new OrderService();
var email = new EmailSender();
var inventory = new Inventory();

service.OrderPlaced += email.OnOrderPlaced;
service.OrderPlaced += inventory.OnOrderPlaced;
service.Place("A-1", 40m);

service.OrderPlaced -= inventory.OnOrderPlaced;
service.Place("A-2", 15m);

record OrderPlaced(string Id, decimal Total);

class OrderService
{
  public event EventHandler<OrderPlaced>? OrderPlaced;

  public void Place(string id, decimal total)
  {
    Console.WriteLine($"Order {id} placed");
    OrderPlaced?.Invoke(this, new OrderPlaced(id, total));
  }
}

class EmailSender
{
  public void OnOrderPlaced(object? sender, OrderPlaced e) =>
    Console.WriteLine($"  email for {e.Id}");
}

class Inventory
{
  public void OnOrderPlaced(object? sender, OrderPlaced e) =>
    Console.WriteLine($"  reserve stock for {e.Id}");
}`,
      checks: [
        { label: 'Declares event EventHandler<…> OrderPlaced', re: /event\s+EventHandler\s*<\s*\w+\s*>\??\s+OrderPlaced\b/ },
        { label: 'Raises it with ?.Invoke(', re: /OrderPlaced\s*\?\.\s*Invoke\s*\(/ },
        { label: 'Subscribes with +=', re: /\.OrderPlaced\s*\+=/ },
        { label: 'Unsubscribes somewhere with -=', re: /\.OrderPlaced\s*-=/ },
        { label: 'OrderService no longer holds EmailSender / Inventory fields', re: /readonly\s+(EmailSender|Inventory)\s+_/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────── COMMAND ─────────────────────────────────────────────
  {
    id: 'command',
    section: 'Behavioral patterns I',
    title: 'Command',
    explain: `
      <p><strong>Intent:</strong> turn a request ("type hello", "delete 3 chars", "transfer $50") into an
      <em>object</em>, so you can store it, queue it, log it, combine it, and undo it.</p>

      <h3>The problem</h3>
      <p>A text editor's toolbar buttons call <code>doc.Append(...)</code> and <code>doc.ToUpper()</code> directly.
      Now you need <strong>Undo/Redo</strong>, a "Shout" button that runs two actions, and keyboard shortcuts that do
      the same as the buttons. With direct method calls there is nothing to remember: once a call is done, it's gone.</p>
      <pre><code>// ❌ Before: actions are just calls, nothing is recorded
typeButton.Click  += (_, _) =&gt; doc.Text += input.Text;
upperButton.Click += (_, _) =&gt; doc.Text = doc.Text.ToUpper();
// Undo? We'd need to know what happened and how to reverse it…</code></pre>

      <h3>The solution</h3>
      <p>Each action becomes a class implementing <code>ICommand</code> with <code>Execute()</code> and
      <code>Undo()</code>. The command captures everything it needs (the receiver <code>doc</code>, the text, and
      whatever it must remember to reverse itself). An <em>invoker</em> (<code>History</code>) runs commands and keeps
      two stacks.</p>
      <pre><code>Client ──creates──▶ TypeCommand(doc, "hello")       «interface» ICommand
                         │  Execute(): doc.Text += text     Execute()
                         │  Undo():    remove text          Undo()
History (invoker)        ▼
  Execute(cmd): cmd.Execute(); undo.Push(cmd); redo.Clear();
  Undo():  cmd = undo.Pop(); cmd.Undo();    redo.Push(cmd);
  Redo():  cmd = redo.Pop(); cmd.Execute(); undo.Push(cmd);</code></pre>
      <ul>
        <li><strong>Command</strong> — <code>ICommand</code>; <strong>concrete commands</strong> — Type, Delete, Upper.</li>
        <li><strong>Receiver</strong> — the object that actually changes (<code>Document</code>).</li>
        <li><strong>Invoker</strong> — triggers commands without knowing what they do (<code>History</code>, a
        button, a job queue).</li>
      </ul>

      <h3>What else commands buy you</h3>
      <ul>
        <li><strong>Macros</strong> — a <code>MacroCommand</code> holds a list of commands: execute in order, undo in
        reverse order. It's itself an <code>ICommand</code> (a Composite).</li>
        <li><strong>Queueing / scheduling</strong> — put commands in a <code>Queue&lt;ICommand&gt;</code> or
        <code>Channel&lt;T&gt;</code> and run them later on a worker.</li>
        <li><strong>Logging / replay / audit</strong> — serialize command records (e.g. <code>record TransferMoney(…)</code>)
        and replay them.</li>
      </ul>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Undo/redo, macros, job queues, retries, "do this later", wiring the same action to many UI triggers.</li>
        <li>❌ A plain method call that will never be undone, queued or logged — a command class is just ceremony.
        A lambda (<code>Action</code>) is often enough for "run this later".</li>
      </ul>

      <h3>In .NET</h3>
      <ul>
        <li><code>System.Windows.Input.ICommand</code> in WPF/MAUI (<code>Execute</code>, <code>CanExecute</code>,
        <code>CanExecuteChanged</code>): a button binds to <code>SaveCommand</code> and greys itself out when
        <code>CanExecute</code> is false. MVVM toolkits provide <code>RelayCommand</code>.</li>
        <li>CQRS "commands" (<code>record PlaceOrder(...)</code> sent to a handler) — request-as-object again.</li>
        <li><code>Action</code> / <code>Func&lt;Task&gt;</code> queued to a background worker.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: an editor with undo / redo stacks and a macro',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var doc = new Document();
var history = new History();

Show(history.Execute(new TypeCommand(doc, "hello")));
Show(history.Execute(new TypeCommand(doc, " world")));
Show(history.Execute(new UppercaseCommand(doc)));
Show(history.Undo());
Show(history.Undo());
Show(history.Redo());
Show(history.Execute(new DeleteCommand(doc, 3)));
Show(history.Redo());
Show(history.Undo());
Show(history.Execute(new MacroCommand("Shout", [new TypeCommand(doc, "!"), new UppercaseCommand(doc)])));
Show(history.Undo());

void Show(string action)
{
  Console.WriteLine($"{action,-24}text='{doc.Text}'");
  Console.WriteLine($"{"",-24}undo={Fmt(history.UndoStack)} redo={Fmt(history.RedoStack)}");
}

// Stack<T> enumerates top-first; reverse it so the top is printed on the right.
static string Fmt(IEnumerable<ICommand> stack) =>
  "[" + string.Join(", ", stack.Reverse().Select(c => c.Name)) + "]";

interface ICommand
{
  string Name { get; }
  void Execute();
  void Undo();
}

class Document
{
  public string Text { get; set; } = "";
}

class TypeCommand(Document doc, string text) : ICommand
{
  public string Name => $"Type '{text}'";
  public void Execute() => doc.Text += text;
  public void Undo() => doc.Text = doc.Text[..^text.Length];
}

class DeleteCommand(Document doc, int count) : ICommand
{
  private string _removed = "";        // remembered so Undo can put it back
  public string Name => $"Delete {count}";

  public void Execute()
  {
    _removed = doc.Text[^count..];
    doc.Text = doc.Text[..^count];
  }

  public void Undo() => doc.Text += _removed;
}

class UppercaseCommand(Document doc) : ICommand
{
  private string _before = "";
  public string Name => "Upper";

  public void Execute()
  {
    _before = doc.Text;
    doc.Text = doc.Text.ToUpperInvariant();
  }

  public void Undo() => doc.Text = _before;
}

class MacroCommand(string name, List<ICommand> steps) : ICommand
{
  public string Name => $"Macro {name}";
  public void Execute() => steps.ForEach(s => s.Execute());

  public void Undo()
  {
    for (int i = steps.Count - 1; i >= 0; i--) steps[i].Undo();   // reverse order!
  }
}

class History
{
  public Stack<ICommand> UndoStack { get; } = new();
  public Stack<ICommand> RedoStack { get; } = new();

  public string Execute(ICommand cmd)
  {
    cmd.Execute();
    UndoStack.Push(cmd);
    RedoStack.Clear();                 // a new action invalidates the old "future"
    return $"Execute {cmd.Name}";
  }

  public string Undo()
  {
    if (!UndoStack.TryPop(out var cmd)) return "Undo (nothing)";
    cmd.Undo();
    RedoStack.Push(cmd);
    return $"Undo {cmd.Name}";
  }

  public string Redo()
  {
    if (!RedoStack.TryPop(out var cmd)) return "Redo (nothing)";
    cmd.Execute();
    UndoStack.Push(cmd);
    return $"Redo {cmd.Name}";
  }
}`,
        output: `Execute Type 'hello'    text='hello'
                        undo=[Type 'hello'] redo=[]
Execute Type ' world'   text='hello world'
                        undo=[Type 'hello', Type ' world'] redo=[]
Execute Upper           text='HELLO WORLD'
                        undo=[Type 'hello', Type ' world', Upper] redo=[]
Undo Upper              text='hello world'
                        undo=[Type 'hello', Type ' world'] redo=[Upper]
Undo Type ' world'      text='hello'
                        undo=[Type 'hello'] redo=[Upper, Type ' world']
Redo Type ' world'      text='hello world'
                        undo=[Type 'hello', Type ' world'] redo=[Upper]
Execute Delete 3        text='hello wo'
                        undo=[Type 'hello', Type ' world', Delete 3] redo=[]
Redo (nothing)          text='hello wo'
                        undo=[Type 'hello', Type ' world', Delete 3] redo=[]
Undo Delete 3           text='hello world'
                        undo=[Type 'hello', Type ' world'] redo=[Delete 3]
Execute Macro Shout     text='HELLO WORLD!'
                        undo=[Type 'hello', Type ' world', Macro Shout] redo=[]
Undo Macro Shout        text='hello world'
                        undo=[Type 'hello', Type ' world'] redo=[Macro Shout]`,
        explain: `
          <details>
            <summary>Step by step: both stacks after every call</summary>
            <p>Stacks are written bottom → top, so the <strong>rightmost item is the top</strong> (the next thing
            <code>Pop</code> returns). "Th" = <code>Type 'hello'</code>, "Tw" = <code>Type ' world'</code>.</p>
            <table>
              <tr><th>#</th><th>Call</th><th>Text after</th><th>Undo stack</th><th>Redo stack</th></tr>
              <tr><td>1</td><td>Execute Type 'hello'</td><td><code>hello</code></td><td>[Th]</td><td>[]</td></tr>
              <tr><td>2</td><td>Execute Type ' world'</td><td><code>hello world</code></td><td>[Th, Tw]</td><td>[]</td></tr>
              <tr><td>3</td><td>Execute Upper</td><td><code>HELLO WORLD</code></td><td>[Th, Tw, Upper]</td><td>[]</td></tr>
              <tr><td>4</td><td>Undo → pops Upper, calls its <code>Undo()</code></td><td><code>hello world</code></td><td>[Th, Tw]</td><td>[Upper]</td></tr>
              <tr><td>5</td><td>Undo → pops Tw</td><td><code>hello</code></td><td>[Th]</td><td>[Upper, Tw]</td></tr>
              <tr><td>6</td><td>Redo → pops Tw (top of redo), re-executes</td><td><code>hello world</code></td><td>[Th, Tw]</td><td>[Upper]</td></tr>
              <tr><td>7</td><td>Execute Delete 3</td><td><code>hello wo</code></td><td>[Th, Tw, Delete 3]</td><td><strong>[] ← cleared!</strong></td></tr>
              <tr><td>8</td><td>Redo → stack empty</td><td><code>hello wo</code></td><td>unchanged</td><td>[]</td></tr>
              <tr><td>9</td><td>Undo → pops Delete 3, re-appends <code>"rld"</code></td><td><code>hello world</code></td><td>[Th, Tw]</td><td>[Delete 3]</td></tr>
              <tr><td>10</td><td>Execute Macro Shout</td><td><code>HELLO WORLD!</code></td><td>[Th, Tw, Macro Shout]</td><td>[] ← cleared</td></tr>
              <tr><td>11</td><td>Undo → Macro undoes Upper, then Type '!'</td><td><code>hello world</code></td><td>[Th, Tw]</td><td>[Macro Shout]</td></tr>
            </table>
          </details>
          <details>
            <summary>Why step 7 clears the redo stack</summary>
            <p>After step 6 the redo stack holds <code>Upper</code> — "the future you undid". Step 7 creates a
            <em>different</em> future (you deleted instead of uppercasing). If <code>Upper</code> stayed on the redo
            stack, pressing Redo would apply it on top of text it was never recorded against. Its saved
            <code>_before</code> was <code>"hello world"</code>, so a later Undo would "restore" text that never
            existed at that point. Every editor (VS Code, Word) behaves the same: <strong>a new command after
            undo discards the redo history</strong>.</p>
            <div class="warn">Forgetting <code>RedoStack.Clear()</code> is the #1 undo/redo bug. It looks fine until
            someone does undo → new edit → redo.</div>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>_removed = doc.Text[^count..];                         // ① remember what you destroy
public void Undo() =&gt; doc.Text = _before;               // ② or snapshot the old state
for (int i = steps.Count - 1; i &gt;= 0; i--) steps[i].Undo();  // ③ undo a macro backwards
if (!UndoStack.TryPop(out var cmd)) return "Undo (nothing)"; // ④ empty stacks are normal</code></pre>
            <ol>
              <li><strong>①</strong> A command must store enough to reverse itself. <code>Delete</code> keeps the deleted
              characters; <code>Type</code> only needs its own text length.</li>
              <li><strong>②</strong> When the inverse is hard to compute (uppercase loses information), store a
              snapshot — that's the Memento idea.</li>
              <li><strong>③</strong> Macro steps can depend on each other, so undo must run in reverse order.</li>
              <li><strong>④</strong> <code>TryPop</code> avoids <code>InvalidOperationException</code> on an empty stack;
              UI would also disable the button (that's what WPF's <code>CanExecute</code> is for).</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'Widget: a tiny editor with visible undo / redo stacks',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .doc { font: 20px ui-monospace, Menlo, monospace; border: 2px solid #c5c9d6; border-radius: 8px; padding: 8px 12px;
    min-height: 30px; background: #fbfcfe; margin-bottom: 8px; white-space: pre; }
  .doc .cur { display: inline-block; width: 2px; height: 22px; background: #4f6bed; vertical-align: middle; }
  .ctl { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 8px; }
  .ctl input[type=text] { width: 90px; }
  .ctl input[type=number] { width: 50px; }
  .ctl .sep { width: 1px; height: 24px; background: #d5d9e5; margin: 0 6px; }
  .stacks { display: flex; gap: 16px; }
  .stack { flex: 1; border: 1px dashed #c5c9d6; border-radius: 8px; padding: 6px; min-height: 120px;
    display: flex; flex-direction: column; gap: 3px; }
  .stack h4 { margin: 0 0 4px; font-size: 13px; }
  .item { font: 12px ui-monospace, Menlo, monospace; border-radius: 6px; padding: 3px 8px; background: #eef1ff;
    border: 1px solid #b9c4f5; }
  .redo .item { background: #fff4e5; border-color: #f0c78a; }
  .item.top::after { content: '  ← top'; color: #646b80; }
  .item.new { animation: pop .4s; }
  @keyframes pop { from { transform: scale(1.15); background: #d7f5df; } to { transform: scale(1); } }
  .cleared { color: #b42318; font-size: 12px; font-weight: 600; min-height: 16px; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 90px; overflow: auto; white-space: pre; margin-top: 8px; }
</style>
<div class="hint">Every button creates a command object and hands it to History. Watch the two stacks: Undo moves the
top command to the Redo stack, Redo moves it back, and any new command empties Redo.</div>
<div class="doc" id="doc"></div>
<div class="ctl">
  <input type="text" id="txt" value="hello"> <button id="type">Type</button>
  <input type="number" id="n" value="3" min="1" max="20"> <button id="del">Delete</button>
  <button id="up">Uppercase</button>
  <button id="macro" title="Type '!' then Uppercase, as one command">Macro: Shout</button>
  <span class="sep"></span>
  <button id="undo">↶ Undo</button> <button id="redo">↷ Redo</button>
</div>
<div class="stacks">
  <div class="stack undo"><h4>Undo stack</h4><div id="us"></div></div>
  <div class="stack redo"><h4>Redo stack</h4><div id="rs"></div><div class="cleared" id="cl"></div></div>
</div>
<div class="log" id="log"></div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var doc = { text: '' };
  var undo = [];
  var redo = [];
  var lastNew = null;

  function log(s) {
    var l = $('log');
    l.textContent += s + String.fromCharCode(10);
    l.scrollTop = l.scrollHeight;
    console.log(s);
  }

  function TypeCmd(t) {
    return { name: "Type '" + t + "'",
      exec: function () { doc.text += t; },
      undo: function () { doc.text = doc.text.slice(0, doc.text.length - t.length); } };
  }
  function DeleteCmd(n) {
    var removed = '';
    return { name: 'Delete ' + n,
      exec: function () {
        var k = Math.min(n, doc.text.length);
        removed = doc.text.slice(doc.text.length - k);
        doc.text = doc.text.slice(0, doc.text.length - k);
      },
      undo: function () { doc.text += removed; } };
  }
  function UpperCmd() {
    var before = '';
    return { name: 'Upper',
      exec: function () { before = doc.text; doc.text = doc.text.toUpperCase(); },
      undo: function () { doc.text = before; } };
  }
  function MacroCmd(name, steps) {
    return { name: 'Macro ' + name,
      exec: function () { steps.forEach(function (s) { s.exec(); }); },
      undo: function () { for (var i = steps.length - 1; i >= 0; i--) steps[i].undo(); } };
  }

  function stackHtml(host, arr) {
    host.innerHTML = '';
    for (var i = arr.length - 1; i >= 0; i--) {
      var d = document.createElement('div');
      d.className = 'item' + (i === arr.length - 1 ? ' top' : '') + (arr[i] === lastNew ? ' new' : '');
      d.textContent = arr[i].name;
      host.appendChild(d);
    }
    if (!arr.length) host.innerHTML = '<span style="color:#9aa1b3;font-size:12px">(empty)</span>';
  }

  function render() {
    $('doc').innerHTML = '';
    $('doc').appendChild(document.createTextNode(doc.text));
    var c = document.createElement('span');
    c.className = 'cur';
    $('doc').appendChild(c);
    stackHtml($('us'), undo);
    stackHtml($('rs'), redo);
    $('undo').disabled = !undo.length;
    $('redo').disabled = !redo.length;
  }

  function names(a) { return '[' + a.map(function (c) { return c.name; }).join(', ') + ']'; }
  function trace(action) {
    log(action + "   text='" + doc.text + "'   undo=" + names(undo) + ' redo=' + names(redo));
  }

  function execute(cmd) {
    cmd.exec();
    undo.push(cmd);
    var had = redo.length;
    redo = [];
    lastNew = cmd;
    $('cl').textContent = had ? 'RedoStack.Clear(): ' + had + ' command(s) discarded' : '';
    trace('Execute ' + cmd.name);
    render();
  }

  $('type').onclick = function () { if ($('txt').value) execute(TypeCmd($('txt').value)); };
  $('del').onclick = function () { execute(DeleteCmd(Math.max(1, Number($('n').value) || 1))); };
  $('up').onclick = function () { execute(UpperCmd()); };
  $('macro').onclick = function () { execute(MacroCmd('Shout', [TypeCmd('!'), UpperCmd()])); };
  $('undo').onclick = function () {
    var c = undo.pop();
    if (!c) return;
    c.undo();
    redo.push(c);
    lastNew = c;
    $('cl').textContent = '';
    trace('Undo ' + c.name);
    render();
  };
  $('redo').onclick = function () {
    var c = redo.pop();
    if (!c) return;
    c.exec();
    undo.push(c);
    lastNew = c;
    $('cl').textContent = '';
    trace('Redo ' + c.name);
    render();
  };
  render();
</script>`,
        explain: `
          <details>
            <summary>Try this (replays the C# program)</summary>
            <ol>
              <li>Type <code>hello</code> → <strong>Type</strong>; change the box to <code> world</code> (leading space) →
              <strong>Type</strong>; click <strong>Uppercase</strong>.</li>
              <li><strong>Undo</strong> twice: <code>Upper</code> then <code>Type ' world'</code> move to the Redo stack.</li>
              <li><strong>Redo</strong> once, then <strong>Delete</strong> (3). The red note says the Redo stack was cleared —
              <code>Upper</code> is gone for good.</li>
              <li><strong>Undo</strong> once to get <code>hello world</code> back, then click <strong>Macro: Shout</strong>:
              one stack entry, two changes. One Undo reverts both.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Undo stack (top on the right) is <code>[A, B]</code>, redo stack is <code>[C]</code>. You execute a new command D. What are the stacks now?',
        options: [
          'undo <code>[A, B, D]</code>, redo <code>[C]</code>',
          'undo <code>[A, B, D]</code>, redo <code>[]</code>',
          'undo <code>[A, B, C, D]</code>, redo <code>[]</code>',
          'undo <code>[D]</code>, redo <code>[A, B, C]</code>',
        ],
        answer: 1,
        why: 'Executing a new command pushes it on the undo stack and clears redo: C belonged to a future that no longer exists.',
      },
      {
        q: 'A macro runs <code>Type "!"</code> then <code>Uppercase</code>. In which order must its <code>Undo()</code> undo them?',
        options: [
          'Same order: Type first, then Uppercase',
          'Reverse order: Uppercase first, then Type',
          'Order does not matter',
          'Only the last one needs undoing',
        ],
        answer: 1,
        why: 'Later steps were applied on top of earlier ones, so you peel them off last-in-first-out, exactly like the outer undo stack.',
      },
      {
        q: 'Why does <code>DeleteCommand</code> store the removed text in a field?',
        options: [
          'For logging only',
          'Because <code>Undo()</code> must put back exactly what <code>Execute()</code> destroyed',
          'Because records are immutable',
          'To make <code>Execute()</code> faster',
        ],
        answer: 1,
        why: 'A command must carry enough state to reverse itself. Deleted characters cannot be recomputed later.',
      },
      {
        q: 'In WPF MVVM, a <code>Button</code> binds to <code>SaveCommand</code>. What does <code>CanExecute</code> do?',
        options: [
          'Runs the save on a background thread',
          'Decides whether the command may run now; the button disables itself when it returns false',
          'Undoes the last save',
          'Registers the command in DI',
        ],
        answer: 1,
        why: '<code>System.Windows.Input.ICommand</code> has <code>Execute</code>, <code>CanExecute</code> and <code>CanExecuteChanged</code>; the button (invoker) asks <code>CanExecute</code> to set its enabled state.',
      },
      {
        q: 'Which scenario is the weakest reason to introduce Command classes?',
        options: [
          'Undo/redo in a drawing app',
          'Queueing jobs to run later on a worker',
          'A single "Save" call that is never undone, queued, or logged',
          'Recording user actions for replay in tests',
        ],
        answer: 2,
        why: 'Command pays off when requests need to be stored, undone, queued or combined. For a plain one-off call it is just extra indirection.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>The account is changed by calling <code>Deposit</code>/<code>Withdraw</code> directly, so there's no way to undo.
      Introduce <code>ICommand</code> with <code>Execute()</code> and <code>Undo()</code>, write <code>DepositCommand</code> and
      <code>WithdrawCommand</code>, keep executed commands in a <code>Stack&lt;ICommand&gt;</code>, and undo the last one.
      Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class DepositCommand(Account acc, decimal amount) : ICommand { public void Execute() => acc.Deposit(amount); public void Undo() => acc.Withdraw(amount); } — then var history = new Stack<ICommand>(); push after Execute, Pop().Undo() to undo.',
      starter: `var account = new Account();
account.Deposit(100m);
account.Withdraw(30m);
Console.WriteLine($"Balance: {account.Balance}");
// TODO: undo the withdrawal

class Account
{
  public decimal Balance { get; private set; }
  public void Deposit(decimal amount) => Balance += amount;
  public void Withdraw(decimal amount) => Balance -= amount;
}`,
      solution: `var account = new Account();
var history = new Stack<ICommand>();

Run(new DepositCommand(account, 100m));
Run(new WithdrawCommand(account, 30m));
Console.WriteLine($"Balance: {account.Balance}");

history.Pop().Undo();
Console.WriteLine($"After undo: {account.Balance}");

void Run(ICommand command)
{
  command.Execute();
  history.Push(command);
}

interface ICommand
{
  void Execute();
  void Undo();
}

class DepositCommand(Account account, decimal amount) : ICommand
{
  public void Execute() => account.Deposit(amount);
  public void Undo() => account.Withdraw(amount);
}

class WithdrawCommand(Account account, decimal amount) : ICommand
{
  public void Execute() => account.Withdraw(amount);
  public void Undo() => account.Deposit(amount);
}

class Account
{
  public decimal Balance { get; private set; }
  public void Deposit(decimal amount) => Balance += amount;
  public void Withdraw(decimal amount) => Balance -= amount;
}`,
      checks: [
        { label: 'Declares interface ICommand', re: /interface\s+ICommand\b/ },
        { label: 'ICommand has an Undo() method', re: /void\s+Undo\s*\(\s*\)/ },
        { label: 'DepositCommand implements ICommand', re: /class\s+Deposit\w*\s*(\([^)]*\))?\s*:\s*ICommand\b/ },
        { label: 'WithdrawCommand implements ICommand', re: /class\s+Withdraw\w*\s*(\([^)]*\))?\s*:\s*ICommand\b/ },
        { label: 'Keeps history in a Stack<ICommand>', re: /Stack\s*<\s*ICommand\s*>/ },
      ],
    }),
  },

  // ───────────────────────────────────────────── TEMPLATE METHOD ─────────────────────────────────────────────
  {
    id: 'template-method',
    section: 'Behavioral patterns I',
    title: 'Template Method',
    explain: `
      <p><strong>Intent:</strong> a base class defines the <em>skeleton</em> of an algorithm in one method and lets
      subclasses fill in specific steps, without changing the order of the steps.</p>

      <h3>The problem</h3>
      <p>You export users to CSV and to JSON. Both exporters open a file, write a header, write each row, maybe write a
      footer, and close the file. The open/close/count logic is copy-pasted, and someone already "fixed" the CSV
      version to log the row count but forgot the JSON one.</p>
      <pre><code>// ❌ Before: two classes, same steps, duplicated plumbing
class CsvExporter  { public void Export(...) { Open(); Header(); foreach … Row(); Close(); } }
class JsonExporter { public void Export(...) { Open(); Header(); foreach … Row(); Footer(); Close(); } }</code></pre>

      <h3>The solution</h3>
      <p>Move <code>Export</code> into an abstract base class and make it <strong>non-virtual</strong>: that's the
      <em>template method</em>. The steps that differ become <code>abstract</code> methods; optional steps become
      <code>virtual</code> <em>hooks</em> with a default.</p>
      <pre><code>abstract class DataExporter
  public void Export(rows)          ← template method (fixed order, not virtual)
     Open()                         ← base, private
     if (IncludeHeader) WriteHeader()   ← hook + abstract step
     foreach row: WriteRow(row)     ← abstract step
     WriteFooter()                  ← hook (default: do nothing)
     Close()                        ← base, private
        ▲                ▲
  CsvExporter       JsonExporter (also overrides WriteFooter)
        ▲
  HeaderlessCsvExporter (overrides the IncludeHeader hook)</code></pre>
      <ul>
        <li><strong>Abstract steps</strong> — subclasses <em>must</em> supply them.</li>
        <li><strong>Hooks</strong> — virtual methods with a sensible default that subclasses <em>may</em> override.</li>
        <li>"Don't call us, we'll call you" (the Hollywood principle): subclasses never call <code>Export</code>'s
        steps themselves; the base class calls them.</li>
      </ul>

      <h3>Template Method vs Strategy</h3>
      <table>
        <tr><th></th><th>Template Method</th><th>Strategy</th></tr>
        <tr><td>Mechanism</td><td>Inheritance (override steps)</td><td>Composition (hold an interface)</td></tr>
        <tr><td>What varies</td><td>Some <em>steps</em> of a fixed algorithm</td><td>The <em>whole</em> algorithm</td></tr>
        <tr><td>Chosen</td><td>At compile time (which subclass you instantiate)</td><td>At runtime (swap the object)</td></tr>
        <tr><td>Coupling</td><td>Subclass tied to base class internals</td><td>Loose: any class implementing the interface</td></tr>
      </table>
      <p>Modern C# often prefers composition, but Template Method is still the natural fit for framework base classes.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Several classes run the same steps in the same order and differ in a few of them.</li>
        <li>✅ You're writing a framework base class and want to guarantee the order (setup/teardown, logging).</li>
        <li>❌ The variations combine independently (format × compression × destination): inheritance explodes;
        use Strategy/Decorator.</li>
      </ul>
      <h3>In .NET</h3>
      <ul>
        <li><code>BackgroundService</code>: the base runs the hosting lifecycle and calls your
        <code>ExecuteAsync</code>.</li>
        <li><code>Stream</code>: <code>CopyTo</code>/<code>ReadByte</code> are implemented in the base in terms of
        your <code>Read</code>/<code>Write</code> overrides.</li>
        <li>ASP.NET Core <code>AuthenticationHandler&lt;TOptions&gt;</code> calls your
        <code>HandleAuthenticateAsync</code>; EF Core <code>DbContext.OnModelCreating</code> is a hook.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: one Export() skeleton, three exporters',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Text.Json;

List<User> users = [new(1, "Ana"), new(2, "Ben")];
DataExporter[] exporters = [new CsvExporter(), new JsonExporter(), new HeaderlessCsvExporter()];

foreach (var exporter in exporters)
{
  Console.WriteLine($"== {exporter.GetType().Name} ==");
  exporter.Export(users);
}

record User(int Id, string Name);

abstract class DataExporter
{
  // The template method: fixed order and NOT virtual, so subclasses can't reorder steps.
  public void Export(IReadOnlyList<User> rows)
  {
    Open();
    if (IncludeHeader) WriteHeader();
    for (int i = 0; i < rows.Count; i++) WriteRow(rows[i], isLast: i == rows.Count - 1);
    WriteFooter();
    Close(rows.Count);
  }

  // Steps every subclass MUST provide.
  protected abstract string Extension { get; }
  protected abstract void WriteHeader();
  protected abstract void WriteRow(User row, bool isLast);

  // Hooks: defaults that subclasses MAY override.
  protected virtual bool IncludeHeader => true;
  protected virtual void WriteFooter() { }

  // Fixed steps owned by the base class.
  private void Open() => Console.WriteLine($"[base] open users.{Extension}");
  private void Close(int count) => Console.WriteLine($"[base] close ({count} rows)");
}

class CsvExporter : DataExporter
{
  protected override string Extension => "csv";
  protected override void WriteHeader() => Console.WriteLine("id,name");
  protected override void WriteRow(User u, bool isLast) => Console.WriteLine($"{u.Id},{u.Name}");
}

class HeaderlessCsvExporter : CsvExporter
{
  protected override bool IncludeHeader => false;
}

class JsonExporter : DataExporter
{
  protected override string Extension => "json";
  protected override void WriteHeader() => Console.WriteLine("[");

  protected override void WriteRow(User u, bool isLast)
  {
    var json = JsonSerializer.Serialize(new { id = u.Id, name = u.Name });
    Console.WriteLine("  " + json + (isLast ? "" : ","));
  }

  protected override void WriteFooter() => Console.WriteLine("]");
}`,
        output: `== CsvExporter ==
[base] open users.csv
id,name
1,Ana
2,Ben
[base] close (2 rows)
== JsonExporter ==
[base] open users.json
[
  {"id":1,"name":"Ana"},
  {"id":2,"name":"Ben"}
]
[base] close (2 rows)
== HeaderlessCsvExporter ==
[base] open users.csv
1,Ana
2,Ben
[base] close (2 rows)`,
        explain: `
          <details>
            <summary>Step by step: who supplies each line</summary>
            <p>For <code>JsonExporter</code>, <code>Export</code> (in the base class) runs and calls down into the
            subclass for the varying steps:</p>
            <table>
              <tr><th>Step in <code>Export</code></th><th>Implemented by</th><th>Console</th></tr>
              <tr><td><code>Open()</code></td><td>DataExporter (base), using the subclass's <code>Extension</code></td><td><code>[base] open users.json</code></td></tr>
              <tr><td><code>IncludeHeader</code> hook</td><td>base default → <code>true</code></td><td>—</td></tr>
              <tr><td><code>WriteHeader()</code></td><td>JsonExporter</td><td><code>[</code></td></tr>
              <tr><td><code>WriteRow(Ana, isLast: false)</code></td><td>JsonExporter</td><td><code>{"id":1,"name":"Ana"},</code></td></tr>
              <tr><td><code>WriteRow(Ben, isLast: true)</code></td><td>JsonExporter</td><td><code>{"id":2,"name":"Ben"}</code></td></tr>
              <tr><td><code>WriteFooter()</code> hook</td><td>JsonExporter override</td><td><code>]</code></td></tr>
              <tr><td><code>Close(2)</code></td><td>DataExporter (base)</td><td><code>[base] close (2 rows)</code></td></tr>
            </table>
            <p>For <code>CsvExporter</code>, <code>WriteFooter</code> is the base's empty default, so nothing prints.
            <code>HeaderlessCsvExporter</code> only overrides the <code>IncludeHeader</code> hook, so the
            <code>id,name</code> line disappears but everything else is inherited.</p>
          </details>
          <details>
            <summary>Why <code>Export</code> is not <code>virtual</code></summary>
            <p>The guarantee "open → header → rows → footer → close, always" is the whole point. If
            <code>Export</code> were <code>virtual</code>, a subclass could override it and skip <code>Close</code>.
            <code>Open</code>/<code>Close</code> are <code>private</code> for the same reason. Subclasses only see the
            <code>protected</code> steps they're meant to fill in.</p>
            <div class="tip">Make abstract steps <code>protected</code>, not <code>public</code>: callers should use
            <code>Export</code>, never <code>WriteRow</code> directly.</div>
          </details>
        `,
      },
      {
        title: 'Widget: run the skeleton with a chosen subclass',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
  .wrap { display: flex; gap: 12px; flex-wrap: wrap; }
  .steps { flex: 1 1 300px; }
  .steps h4, .out h4 { margin: 0 0 4px; font-size: 13px; }
  .step { display: flex; justify-content: space-between; gap: 8px; align-items: center;
    font: 12.5px ui-monospace, Menlo, monospace; padding: 5px 8px; margin: 3px 0; border-radius: 6px;
    border: 1px solid #d5d9e5; background: #fff; transition: background .2s; }
  .step.indent { margin-left: 18px; }
  .tag { font: 11px system-ui, sans-serif; padding: 1px 7px; border-radius: 10px; white-space: nowrap; }
  .tag.base { background: #e3e7f9; color: #3b4fc4; }
  .tag.sub { background: #dcf3e3; color: #1a7f37; }
  .tag.hook { background: #fff1d6; color: #9a6200; }
  .step.active { outline: 2px solid #4f6bed; background: #f2f4ff; }
  .step.done { opacity: .6; }
  .step.skipped { opacity: .4; text-decoration: line-through; }
  .out { flex: 1 1 220px; }
  .out pre { font: 12.5px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 220px; overflow: auto; margin: 0; }
  .legend { font-size: 12px; color: #646b80; margin-top: 6px; }
</style>
<div class="hint">Choose a subclass, then <b>Step</b> through <code>Export(rows)</code>. The skeleton is the same every
time; only the coloured "who implements it" tags change.</div>
<div class="ctl">
  <select id="sel">
    <option value="csv">new CsvExporter()</option>
    <option value="json">new JsonExporter()</option>
    <option value="nohead">new HeaderlessCsvExporter()</option>
  </select>
  <button id="step">Step ▶</button>
  <button id="all">Run all ▶▶</button>
  <button id="reset">Reset</button>
</div>
<div class="wrap">
  <div class="steps"><h4>DataExporter.Export(rows) — the template method</h4><div id="list"></div></div>
  <div class="out"><h4>Output</h4><pre id="out"></pre></div>
</div>
<div class="legend"><span class="tag base">base</span> fixed in DataExporter ·
  <span class="tag sub">subclass</span> abstract step overridden ·
  <span class="tag hook">hook</span> optional virtual (default or override)</div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var rows = [{ id: 1, name: 'Ana' }, { id: 2, name: 'Ben' }];
  var NL = String.fromCharCode(10);
  var Q = String.fromCharCode(34);
  var K = {
    csv: { cls: 'CsvExporter', ext: 'csv', header: true, headerText: 'id,name',
      row: function (r) { return r.id + ',' + r.name; }, footer: null },
    nohead: { cls: 'HeaderlessCsvExporter', ext: 'csv', header: false, headerText: 'id,name',
      row: function (r) { return r.id + ',' + r.name; }, footer: null },
    json: { cls: 'JsonExporter', ext: 'json', header: true, headerText: '[',
      row: function (r, last) {
        return '  {' + Q + 'id' + Q + ':' + r.id + ',' + Q + 'name' + Q + ':' + Q + r.name + Q + '}' + (last ? '' : ',');
      }, footer: ']' }
  };
  var steps = [];
  var pos = 0;
  var timer = null;

  function build() {
    var k = K[$('sel').value];
    steps = [];
    steps.push({ label: 'Open()', tag: 'base', who: 'DataExporter',
      out: '[base] open users.' + k.ext });
    steps.push({ label: 'if (IncludeHeader)', tag: 'hook',
      who: k.header ? 'base default: true' : k.cls + ': false', out: null });
    steps.push({ label: 'WriteHeader()', tag: 'sub', who: k.cls, indent: true, skip: !k.header,
      out: k.headerText });
    rows.forEach(function (r, i) {
      steps.push({ label: 'WriteRow(' + r.name + ', isLast: ' + (i === rows.length - 1) + ')', tag: 'sub',
        who: k.cls, out: k.row(r, i === rows.length - 1) });
    });
    steps.push({ label: 'WriteFooter()', tag: 'hook',
      who: k.footer ? k.cls + ' override' : 'base default: { }', out: k.footer });
    steps.push({ label: 'Close(' + rows.length + ')', tag: 'base', who: 'DataExporter',
      out: '[base] close (' + rows.length + ' rows)' });
    pos = 0;
    $('out').textContent = '== ' + k.cls + ' ==' + NL;
    render();
  }

  function render() {
    var list = $('list');
    list.innerHTML = '';
    steps.forEach(function (s, i) {
      var d = document.createElement('div');
      var state = i < pos ? (s.skip ? ' skipped' : ' done') : i === pos ? ' active' : '';
      d.className = 'step' + (s.indent ? ' indent' : '') + state;
      var a = document.createElement('span');
      a.textContent = (i + 1) + '. ' + s.label;
      var t = document.createElement('span');
      t.className = 'tag ' + s.tag;
      t.textContent = s.who;
      d.appendChild(a);
      d.appendChild(t);
      list.appendChild(d);
    });
    $('step').disabled = pos >= steps.length;
    $('all').disabled = pos >= steps.length;
  }

  function step() {
    if (pos >= steps.length) return false;
    var s = steps[pos];
    if (s.skip) {
      console.log('skip ' + s.label + ' (hook said no)');
    } else if (s.out != null) {
      $('out').textContent += s.out + NL;
      console.log(s.label + ' by ' + s.who + ' -> ' + s.out);
    } else {
      console.log(s.label + ' -> ' + s.who);
    }
    pos++;
    render();
    return pos < steps.length;
  }

  $('step').onclick = step;
  $('all').onclick = function () {
    clearInterval(timer);
    timer = setInterval(function () { if (!step()) clearInterval(timer); }, 350);
  };
  $('reset').onclick = function () { clearInterval(timer); build(); };
  $('sel').onchange = function () { clearInterval(timer); build(); };
  build();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Run all with <strong>CsvExporter</strong>, then with <strong>JsonExporter</strong>: steps 1 and 7 keep their
              blue <em>base</em> tag; the green steps change owner, and the footer hook now prints <code>]</code>.</li>
              <li>Pick <strong>HeaderlessCsvExporter</strong>: the <code>IncludeHeader</code> hook returns false and step 3 is
              struck through. A one-line override changed the algorithm's behaviour, not its order.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why is the template method (<code>Export</code>) usually <em>not</em> <code>virtual</code>?',
        options: [
          'Virtual methods are slower',
          'So subclasses cannot change the order of the steps or skip mandatory ones',
          'Because abstract classes cannot have virtual methods',
          'So it can be called from static code',
        ],
        answer: 1,
        why: 'The base class guarantees the skeleton. Subclasses only override the protected steps and hooks.',
      },
      {
        q: 'What is a <em>hook</em> in Template Method?',
        options: [
          'An abstract method every subclass must implement',
          'A virtual method with a default (often empty) implementation that subclasses may override',
          'An event the base class raises',
          'A static helper method',
        ],
        answer: 1,
        why: 'Hooks like <code>WriteFooter()</code> or <code>IncludeHeader</code> give optional extension points without forcing every subclass to implement them.',
      },
      {
        q: 'Main difference between Template Method and Strategy?',
        options: [
          'Template Method uses inheritance to vary steps; Strategy uses composition to swap the whole algorithm at runtime',
          'Strategy needs abstract classes; Template Method needs interfaces',
          'They are the same pattern with different names',
          'Template Method is only for UI code',
        ],
        answer: 0,
        why: 'Template Method: subclass overrides parts of a fixed skeleton (chosen at compile time). Strategy: the context holds an interface, which you can swap at runtime.',
      },
      {
        q: 'Which .NET type uses Template Method?',
        options: [
          '<code>BackgroundService</code> — you override <code>ExecuteAsync</code>, the base handles start/stop',
          '<code>List&lt;T&gt;</code>',
          '<code>IComparer&lt;T&gt;</code>',
          '<code>Lazy&lt;T&gt;</code>',
        ],
        answer: 0,
        why: '<code>BackgroundService.StartAsync</code>/<code>StopAsync</code> form the skeleton and call your <code>ExecuteAsync</code> step.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>CsvImporter</code> and <code>PipeImporter</code> duplicate the connect / validate / save steps and differ
      only in how they parse. Extract an <code>abstract class Importer</code> with a non-virtual <code>Run(string input)</code>
      template method and a <code>protected abstract</code> parse step; make both importers inherit from it and
      <code>override</code> only the parsing. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'abstract class Importer { public void Run(string input) { Console.WriteLine("Connecting..."); var names = Parse(input); ... } protected abstract List<string> Parse(string input); }',
      starter: `new CsvImporter().Run("1,Ana;2,Ben");
new PipeImporter().Run("Cy|Dee|Eli");

class CsvImporter
{
  public void Run(string input)
  {
    Console.WriteLine("Connecting...");
    var names = input.Split(';').Select(r => r.Split(',')[1]).ToList();
    if (names.Any(string.IsNullOrWhiteSpace)) throw new FormatException();
    Console.WriteLine($"Saved {names.Count}: {string.Join(", ", names)}");
  }
}

class PipeImporter
{
  public void Run(string input)
  {
    Console.WriteLine("Connecting...");
    var names = input.Split('|').ToList();
    if (names.Any(string.IsNullOrWhiteSpace)) throw new FormatException();
    Console.WriteLine($"Saved {names.Count}: {string.Join(", ", names)}");
  }
}`,
      solution: `new CsvImporter().Run("1,Ana;2,Ben");
new PipeImporter().Run("Cy|Dee|Eli");

abstract class Importer
{
  public void Run(string input)
  {
    Console.WriteLine("Connecting...");
    var names = Parse(input);
    if (names.Any(string.IsNullOrWhiteSpace)) throw new FormatException();
    Console.WriteLine($"Saved {names.Count}: {string.Join(", ", names)}");
  }

  protected abstract List<string> Parse(string input);
}

class CsvImporter : Importer
{
  protected override List<string> Parse(string input) =>
    input.Split(';').Select(r => r.Split(',')[1]).ToList();
}

class PipeImporter : Importer
{
  protected override List<string> Parse(string input) => input.Split('|').ToList();
}`,
      checks: [
        { label: 'Declares an abstract base class', re: /abstract\s+class\s+\w+/ },
        { label: 'Has a protected abstract step', re: /protected\s+abstract\s+/ },
        { label: 'CsvImporter inherits from a base', re: /class\s+CsvImporter\s*:\s*\w+/ },
        { label: 'PipeImporter inherits from a base', re: /class\s+PipeImporter\s*:\s*\w+/ },
        { label: 'Run is not virtual/abstract (fixed skeleton)', re: /(virtual|abstract|override)\s+void\s+Run\b/, absent: true },
        { label: 'Only one Run implementation left', re: /void\s+Run\s*\([\s\S]*void\s+Run\s*\(/, absent: true },
      ],
    }),
  },
);
