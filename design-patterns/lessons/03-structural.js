window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────── ADAPTER ─────────────────────────────
  {
    id: 'adapter',
    section: 'Structural patterns',
    title: 'Adapter',
    explain: `
      <p><strong>Intent:</strong> make a class with an incompatible interface usable through the interface your code expects, by putting a small translator in between.</p>
      <h3>The problem</h3>
      <p>Your checkout code talks to payment providers through your own interface: <code>IPaymentGateway.Charge(orderId, amount)</code>. Then the business signs a deal with a bank whose SDK is a 15-year-old class that only accepts an XML string, wants the amount in <em>cents</em>, and answers with more XML. You can't change the SDK. You also don't want XML-building code spread through <code>Checkout</code>:</p>
      <pre><code>// ❌ before: Checkout knows the legacy API's quirks
public void Pay(string orderId, decimal amount)
{
  var xml = $"&lt;pay&gt;&lt;order&gt;{orderId}&lt;/order&gt;&lt;cents&gt;{(int)(amount * 100)}&lt;/cents&gt;&lt;/pay&gt;";
  var reply = legacyGateway.SubmitXml(xml);
  if (reply.Contains("status='OK'")) { /* parse txn id... */ }
}</code></pre>
      <h3>The solution</h3>
      <p>Write an <strong>adapter</strong>: a class that <em>implements your interface</em> and <em>holds the incompatible object</em>. Each call is translated on the way in (dollars to cents, object to XML) and the answer is translated on the way out (XML to <code>PaymentResult</code>). <code>Checkout</code> keeps talking to <code>IPaymentGateway</code> and never finds out.</p>
      <pre><code class="language-none">Checkout ──► IPaymentGateway ◄── LegacyGatewayAdapter ──► LegacyXmlGateway
 (client)       (target)              (adapter)              (adaptee)
              Charge(id, 25.50m)    builds &lt;pay&gt;…&lt;cents&gt;2550…   SubmitXml(xml)</code></pre>
      <ul>
        <li><strong>Target</strong>: the interface the client wants (<code>IPaymentGateway</code>).</li>
        <li><strong>Adaptee</strong>: the existing class with the wrong shape (<code>LegacyXmlGateway</code>).</li>
        <li><strong>Adapter</strong>: implements Target, forwards to Adaptee, translates both ways.</li>
      </ul>
      <h3>Object adapter vs class adapter</h3>
      <p>The <strong>object adapter</strong> (above) <em>wraps</em> an instance. A <strong>class adapter</strong> <em>inherits</em> from the adaptee and implements the target at the same time:</p>
      <pre><code>// class adapter: works only if the adaptee is not sealed
public class LegacyClassAdapter : LegacyXmlGateway, IPaymentGateway
{
  public PaymentResult Charge(string orderId, decimal amount) =&gt;
    Parse(SubmitXml(ToXml(orderId, amount)));   // calls the inherited method
}</code></pre>
      <p>C# has single class inheritance, and many SDK classes are <code>sealed</code>, so <strong>prefer the object adapter</strong>. It can also adapt any subclass of the adaptee, and you can swap in a fake adaptee in tests.</p>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Third-party SDKs, legacy systems, or a vendor you may replace later. Keep their types out of your domain code.</li>
        <li>✅ Two libraries that each expect a different interface for the same idea.</li>
        <li>❌ If you own both sides, just change the interface. An adapter between two of your own classes is usually a sign of drift.</li>
        <li>❌ Don't let the adapter grow business rules. It only <em>translates</em>.</li>
      </ul>
      <h3>Adapters inside .NET</h3>
      <ul>
        <li><code>StreamReader</code> adapts a byte <code>Stream</code> to the character-based <code>TextReader</code> API (<code>ReadLine()</code>). <code>StreamWriter</code> does the reverse for <code>TextWriter</code>.</li>
        <li><code>XmlReader.Create(TextReader)</code>, <code>StringReader</code> (a <code>string</code> seen as a <code>TextReader</code>).</li>
        <li>ADO.NET's <code>DbDataAdapter</code> adapts database commands to fill a <code>DataSet</code>. The pattern is in the name.</li>
      </ul>
      <div class="tip">Name adapters after what they adapt, for example <code>LegacyGatewayAdapter</code> or <code>StripeGatewayAdapter</code>. Put them at the edge of your app (an "Infrastructure" folder) so vendor types never leak inward.</div>
    `,
    examples: [
      {
        title: 'C#: wrapping a legacy XML payment gateway',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Xml.Linq;

IPaymentGateway gateway = new LegacyGatewayAdapter(new LegacyXmlGateway());
var checkout = new Checkout(gateway);

checkout.Pay("A-100", 25.50m);
checkout.Pay("A-101", 0m);

Console.WriteLine("--- new provider, same Checkout ---");
checkout = new Checkout(new ModernGateway());
checkout.Pay("A-102", 10m);

public record PaymentResult(bool Success, string Reference);

// Target: the interface our code wants
public interface IPaymentGateway
{
  PaymentResult Charge(string orderId, decimal amount);
}

// Client: only knows IPaymentGateway
public class Checkout(IPaymentGateway gateway)
{
  public void Pay(string orderId, decimal amount)
  {
    var result = gateway.Charge(orderId, amount);
    Console.WriteLine(result.Success
      ? $"[Checkout] {orderId} paid, ref {result.Reference}"
      : $"[Checkout] {orderId} FAILED: {result.Reference}");
  }
}

// Adaptee: legacy SDK we cannot change (XML in, XML out, amounts in cents)
public class LegacyXmlGateway
{
  public string SubmitXml(string xml)
  {
    Console.WriteLine($"  [Legacy] received {xml}");
    var cents = (int)XElement.Parse(xml).Element("cents")!;
    var reply = cents > 0
      ? $"<reply status='OK' txn='TX{cents}'/>"
      : "<reply status='ERR' error='E42 invalid amount'/>";
    Console.WriteLine($"  [Legacy] replied  {reply}");
    return reply;
  }
}

// Adapter: implements the target, wraps the adaptee, translates both ways
public class LegacyGatewayAdapter(LegacyXmlGateway legacy) : IPaymentGateway
{
  public PaymentResult Charge(string orderId, decimal amount)
  {
    var request = new XElement("pay",                     // ① translate the request
      new XElement("order", orderId),
      new XElement("cents", (int)(amount * 100)));

    var replyXml = legacy.SubmitXml(                      // ② call the old API
      request.ToString(SaveOptions.DisableFormatting));

    var reply = XElement.Parse(replyXml);                 // ③ translate the reply
    var ok = (string?)reply.Attribute("status") == "OK";
    var reference = (string?)reply.Attribute(ok ? "txn" : "error") ?? "?";
    return new PaymentResult(ok, reference);
  }
}

// A modern provider already fits the target: no adapter needed
public class ModernGateway : IPaymentGateway
{
  public PaymentResult Charge(string orderId, decimal amount) =>
    new(true, $"pi_{orderId.ToLowerInvariant()}");
}`,
        output: `  [Legacy] received <pay><order>A-100</order><cents>2550</cents></pay>
  [Legacy] replied  <reply status='OK' txn='TX2550'/>
[Checkout] A-100 paid, ref TX2550
  [Legacy] received <pay><order>A-101</order><cents>0</cents></pay>
  [Legacy] replied  <reply status='ERR' error='E42 invalid amount'/>
[Checkout] A-101 FAILED: E42 invalid amount
--- new provider, same Checkout ---
[Checkout] A-102 paid, ref pi_a-102`,
        explain: `
          <details>
            <summary>Step by step: one <code>Charge</code> call through the adapter</summary>
            <p>Follow <code>checkout.Pay("A-100", 25.50m)</code>:</p>
            <table>
              <tr><th>Step</th><th>Who</th><th>Data</th><th>Console</th></tr>
              <tr><td>1</td><td><code>Checkout</code></td><td><code>gateway.Charge("A-100", 25.50m)</code>. It only sees <code>IPaymentGateway</code>.</td><td></td></tr>
              <tr><td>2</td><td>Adapter ①</td><td>25.50 dollars → <code>2550</code> cents, wrapped in <code>&lt;pay&gt;</code> XML</td><td></td></tr>
              <tr><td>3</td><td>Adapter ② → Legacy</td><td><code>SubmitXml("&lt;pay&gt;…&lt;/pay&gt;")</code></td><td><code>[Legacy] received &lt;pay&gt;…</code></td></tr>
              <tr><td>4</td><td>Legacy</td><td>returns <code>&lt;reply status='OK' txn='TX2550'/&gt;</code></td><td><code>[Legacy] replied …</code></td></tr>
              <tr><td>5</td><td>Adapter ③</td><td>XML → <code>new PaymentResult(true, "TX2550")</code></td><td></td></tr>
              <tr><td>6</td><td><code>Checkout</code></td><td>reads <code>result.Success</code></td><td><code>[Checkout] A-100 paid, ref TX2550</code></td></tr>
            </table>
            <p>For <code>A-101</code> the legacy system answers with <code>status='ERR'</code>. The adapter turns that into <code>Success = false</code> and reads the <code>error</code> attribute instead of <code>txn</code>, so failures are translated too.</p>
          </details>
          <details>
            <summary>Why the last line proves the point</summary>
            <p><code>ModernGateway</code> already implements <code>IPaymentGateway</code>, so it plugs straight into the same <code>Checkout</code> class. <code>Checkout</code> was never edited. Because the adapter keeps the legacy quirks in one class, changing provider is a one-line change in the composition code.</p>
            <div class="warn">Keep the adapter "dumb". If you catch yourself adding discount rules or retries in it, those belong in your domain code or in a decorator.</div>
          </details>
        `,
      },
      {
        title: 'Widget: plug shapes and live call translation',
        lang: 'html',
        code: `<style>
.ad { font-size: 14px; }
.ad .hint { color: #555; margin: 0 0 8px; }
.ad .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 10px; }
.ad .lane { display: flex; align-items: stretch; }
.ad .box { flex: 1; border: 2px solid #c5cde0; border-radius: 10px; padding: 8px; background: #fff;
  text-align: center; transition: all .25s; min-width: 0; }
.ad .box.hi { border-color: #2563eb; background: #eaf2ff; box-shadow: 0 0 0 3px #bfdbfe; }
.ad .box.bad { border-color: #dc2626; background: #fdecec; box-shadow: 0 0 0 3px #fecaca; }
.ad .box.off { opacity: .3; }
.ad .name { font-weight: 700; font-size: 13px; }
.ad .sig { font: 11.5px ui-monospace, Menlo, monospace; color: #444; }
.ad .plug { font-size: 24px; line-height: 1.2; color: #334; }
.ad .wire { width: 34px; align-self: center; height: 4px; background: #c5cde0; transition: background .25s; }
.ad .wire.hi { background: #2563eb; }
.ad .packet { margin: 10px 0; min-height: 22px; padding: 6px 10px; border-radius: 8px; background: #fff7e6;
  border: 1px dashed #f0b44c; font: 12.5px ui-monospace, Menlo, monospace; word-break: break-all; }
.ad .log { font: 12px/1.45 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 118px; overflow: auto; padding: 6px 8px; white-space: pre; }
.ad .log .err { color: #b42318; }
</style>
<div class="ad">
  <p class="hint">Pick a gateway, set the order and amount, then click <b>Pay</b>. Untick "use adapter" to see why the shapes don't fit.</p>
  <div class="ctl">
    <select id="gw">
      <option value="legacy">LegacyXmlGateway (square socket)</option>
      <option value="modern">ModernGateway (round socket)</option>
    </select>
    <label><input type="checkbox" id="useAd" checked> use adapter</label>
    order <select id="ord"><option>A-100</option><option>A-101</option><option>A-102</option></select>
    amount <input id="amt" type="number" value="25.50" step="0.01" style="width:80px">
    <button id="pay">Pay</button>
    <button id="clr">Clear log</button>
  </div>
  <div class="lane">
    <div class="box" id="bC"><div class="plug">●</div><div class="name">Checkout</div>
      <div class="sig">needs IPaymentGateway<br>Charge(orderId, amount)</div></div>
    <div class="wire" id="w1"></div>
    <div class="box" id="bA"><div class="plug">● → ■</div><div class="name">LegacyGatewayAdapter</div>
      <div class="sig">: IPaymentGateway<br>wraps LegacyXmlGateway</div></div>
    <div class="wire" id="w2"></div>
    <div class="box" id="bL"><div class="plug" id="sock">■</div><div class="name" id="lname">LegacyXmlGateway</div>
      <div class="sig" id="lsig">SubmitXml(string xml)</div></div>
  </div>
  <div class="packet" id="pk">The message in flight appears here.</div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var busy = false;

function log(s, err) {
  var d = document.createElement('div');
  d.textContent = s;
  if (err) d.className = 'err';
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(s);
}

function clearHi() {
  ['bC', 'bA', 'bL', 'w1', 'w2'].forEach(function (id) { $(id).classList.remove('hi', 'bad'); });
}

function play(steps) {
  busy = true;
  $('pay').disabled = true;
  var i = 0;
  function next() {
    if (i >= steps.length) {
      busy = false;
      $('pay').disabled = false;
      setTimeout(clearHi, 700);
      return;
    }
    var s = steps[i++];
    clearHi();
    (s.hi || []).forEach(function (id) { $(id).classList.add('hi'); });
    (s.bad || []).forEach(function (id) { $(id).classList.add('bad'); });
    if (s.pk) $('pk').textContent = s.pk;
    if (s.log) log(s.log, s.err);
    setTimeout(next, 800);
  }
  next();
}

function layout() {
  var legacy = $('gw').value === 'legacy';
  var use = $('useAd').checked;
  $('sock').textContent = legacy ? '■' : '●';
  $('lname').textContent = legacy ? 'LegacyXmlGateway' : 'ModernGateway';
  $('lsig').innerHTML = legacy ? 'SubmitXml(string xml)<br>XML in, XML out, cents' : ': IPaymentGateway<br>Charge(orderId, amount)';
  $('bA').classList.toggle('off', !use || !legacy);
}

$('gw').onchange = layout;
$('useAd').onchange = layout;
$('clr').onclick = function () { $('log').innerHTML = ''; };

$('pay').onclick = function () {
  if (busy) return;
  var legacy = $('gw').value === 'legacy';
  var use = $('useAd').checked;
  var ord = $('ord').value;
  var amount = Number($('amt').value) || 0;
  var call = 'gateway.Charge("' + ord + '", ' + amount.toFixed(2) + 'm)';
  var steps = [];
  if (!legacy) {
    steps.push({ hi: ['bC', 'w1', 'w2', 'bL'], pk: call + '  (fits directly, no adapter needed)' });
    steps.push({ hi: ['bC'], pk: 'PaymentResult(true, "pi_' + ord.toLowerCase() + '")',
      log: '[Checkout] ' + ord + ' paid, ref pi_' + ord.toLowerCase() });
  } else if (!use) {
    steps.push({ hi: ['bC', 'w1', 'w2'], pk: call });
    steps.push({ bad: ['bC', 'bL'], pk: '● does not fit ■ : LegacyXmlGateway has no Charge() method',
      log: "error CS1061: 'LegacyXmlGateway' does not contain a definition for 'Charge'", err: true });
  } else {
    var cents = Math.round(amount * 100);
    var xml = '<pay><order>' + ord + '</order><cents>' + cents + '</cents></pay>';
    var ok = cents > 0;
    var reply = ok ? "<reply status='OK' txn='TX" + cents + "'/>" : "<reply status='ERR' error='E42 invalid amount'/>";
    var ref = ok ? 'TX' + cents : 'E42 invalid amount';
    steps.push({ hi: ['bC', 'w1', 'bA'], pk: call });
    steps.push({ hi: ['bA'], pk: '① translate: ' + amount.toFixed(2) + ' dollars → ' + cents + ' cents, build XML' });
    steps.push({ hi: ['bA', 'w2', 'bL'], pk: '② legacy.SubmitXml("' + xml + '")', log: '  [Legacy] received ' + xml });
    steps.push({ hi: ['bL'], pk: 'returns ' + reply, log: '  [Legacy] replied  ' + reply });
    steps.push({ hi: ['bA'], pk: '③ translate reply → new PaymentResult(' + ok + ', "' + ref + '")' });
    steps.push({ hi: ['bC'], pk: 'Checkout reads result.Success = ' + ok,
      log: ok ? '[Checkout] ' + ord + ' paid, ref ' + ref : '[Checkout] ' + ord + ' FAILED: ' + ref, err: !ok });
  }
  play(steps);
};

layout();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Keep <em>LegacyXmlGateway</em> and <em>use adapter</em>, click <b>Pay</b>. The log matches the first three lines of the C# output. The yellow strip shows each translation step ①②③.</li>
              <li>Set the amount to <code>0</code> and pay again. The legacy system answers <code>ERR</code> and the adapter turns it into <code>Success = false</code>.</li>
              <li>Untick <em>use adapter</em> and pay. Checkout's round plug doesn't fit the square socket. In C# this is a <strong>compile error</strong>, not a runtime bug.</li>
              <li>Switch to <em>ModernGateway</em>. The adapter fades out because a class that already implements the target needs no translator.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What is the main job of an Adapter?',
        options: ['Add new behaviour to an object at runtime', 'Convert one interface into another the client expects', 'Control access to an expensive object', 'Give a simple entry point to a whole subsystem'],
        answer: 1,
        why: 'Adapter translates an incompatible interface into the one the client already uses. Adding behaviour is Decorator, controlling access is Proxy, and a simple entry point is Facade.',
      },
      {
        q: '<code>new StreamReader(networkStream).ReadLine()</code>: which role does <code>StreamReader</code> play?',
        options: ['Adaptee', 'Adapter from Stream (bytes) to TextReader (lines/chars)', 'Facade over the network stack', 'Proxy for a remote stream'],
        answer: 1,
        why: '<code>Stream</code> only reads bytes. <code>StreamReader</code> derives from <code>TextReader</code> and wraps a <code>Stream</code>, translating bytes into characters and lines. That is an object adapter.',
      },
      {
        q: 'Why is the object adapter usually preferred over the class adapter in C#?',
        options: ['It is faster at runtime', 'C# has single inheritance and many SDK classes are sealed; wrapping avoids both limits', 'Class adapters cannot implement interfaces', 'Object adapters do not need the adaptee at all'],
        answer: 1,
        why: 'A class adapter must inherit from the adaptee, which fails for sealed classes and uses up your only base class. Wrapping an instance works with any adaptee and makes it easy to pass a fake in tests.',
      },
      {
        q: 'Your team owns both <code>OrderService</code> and the <code>IOrderStore</code> interface it uses. A new store class has a slightly different method name. Best move?',
        options: ['Write an adapter', 'Rename the method or align the interface, since you own both sides', 'Use a facade', 'Create a class adapter by inheritance'],
        answer: 1,
        why: 'Adapters shine when you <em>cannot</em> change one side (third-party, legacy). When you own both, an adapter just adds a layer. Fix the mismatch directly.',
      },
      {
        q: 'Which code belongs in an adapter?',
        options: ['Converting dollars to cents and XML to a result object', 'Applying a 10% loyalty discount', 'Retrying failed payments three times', 'Sending a receipt email'],
        answer: 0,
        why: 'An adapter only translates data and calls. Discounts are business rules, retries are a cross-cutting behaviour (a decorator), and emails belong to another service.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>The dashboard needs temperatures in Celsius through <code>ITemperatureSource</code>, but the only sensor is a vendor class <code>LegacyThermometer</code> that reports Fahrenheit. Right now the conversion is done inline in the client.</p>
        <p>Write an <strong>object adapter</strong> <code>ThermometerAdapter</code> that implements <code>ITemperatureSource</code>, wraps a <code>LegacyThermometer</code>, and converts (°F − 32) × 5 / 9. Then let <code>Dashboard</code> receive an <code>ITemperatureSource</code>. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class ThermometerAdapter(LegacyThermometer sensor) : ITemperatureSource { public double Celsius() => (sensor.ReadFahrenheit() - 32) * 5 / 9; }',
      starter: `var dashboard = new Dashboard(new LegacyThermometer());
dashboard.Show();

public interface ITemperatureSource
{
  double Celsius();
}

// Vendor code: cannot be changed
public sealed class LegacyThermometer
{
  public double ReadFahrenheit() => 98.6;
}

// TODO: make Dashboard depend on ITemperatureSource instead of the vendor class
public class Dashboard(LegacyThermometer sensor)
{
  public void Show()
  {
    var celsius = (sensor.ReadFahrenheit() - 32) * 5 / 9;
    Console.WriteLine($"Temperature: {celsius:0.0} C");
  }
}`,
      solution: `ITemperatureSource source = new ThermometerAdapter(new LegacyThermometer());
var dashboard = new Dashboard(source);
dashboard.Show();

public interface ITemperatureSource
{
  double Celsius();
}

// Vendor code: cannot be changed
public sealed class LegacyThermometer
{
  public double ReadFahrenheit() => 98.6;
}

// Adapter: implements the target, wraps the adaptee
public class ThermometerAdapter(LegacyThermometer sensor) : ITemperatureSource
{
  public double Celsius() => (sensor.ReadFahrenheit() - 32) * 5 / 9;
}

public class Dashboard(ITemperatureSource source)
{
  public void Show() => Console.WriteLine($"Temperature: {source.Celsius():0.0} C");
}`,
      checks: [
        { label: 'Class ThermometerAdapter implements ITemperatureSource', re: /class\s+ThermometerAdapter\b[^{]*:\s*ITemperatureSource\b/ },
        { label: 'Adapter holds a LegacyThermometer (constructor parameter or field)', re: /class\s+ThermometerAdapter\s*\(\s*LegacyThermometer\s+\w+|LegacyThermometer\s+_?\w+\s*[;=)]/ },
        { label: 'Dashboard depends on ITemperatureSource', re: /class\s+Dashboard\s*\(\s*ITemperatureSource\s+\w+|Dashboard\s*\(\s*ITemperatureSource\s+\w+\s*\)/ },
        { label: 'Dashboard no longer takes LegacyThermometer', re: /class\s+Dashboard\s*\(\s*LegacyThermometer/, absent: true },
        { label: 'Composition wraps the sensor: new ThermometerAdapter(new LegacyThermometer())', re: /new\s+ThermometerAdapter\s*\(\s*new\s+LegacyThermometer\s*\(/ },
      ],
    }),
  },

  // ───────────────────────────── DECORATOR ─────────────────────────────
  {
    id: 'decorator',
    section: 'Structural patterns',
    title: 'Decorator',
    explain: `
      <p><strong>Intent:</strong> add behaviour to an object by <em>wrapping</em> it in another object with the same interface, without changing the original class and without subclassing.</p>
      <h3>The problem</h3>
      <p>You have <code>IDataService.Get(key)</code> backed by a database that sometimes times out. Different call sites need different extras: logging here, caching there, retries almost everywhere. With inheritance you end up with a class for every combination:</p>
      <pre><code class="language-none">DbService
├── LoggingDbService
├── CachingDbService
├── LoggingCachingDbService
├── RetryingCachingDbService
└── LoggingRetryingCachingDbService   …2ⁿ classes for n features</code></pre>
      <h3>The solution</h3>
      <p>Make each feature a small class that <strong>implements <code>IDataService</code> and holds another <code>IDataService</code></strong>. It does its extra work, then delegates to the inner object. Because wrappers and the real service share the interface, you can stack them in any combination at runtime:</p>
      <pre><code>IDataService svc = new Logging(new Caching(new Retry(new FlakyDb())));</code></pre>
      <pre><code class="language-none">client → Logging → Caching → Retry → FlakyDb
         ◄────────── results come back out ◄──</code></pre>
      <ul>
        <li><strong>Component</strong>: the shared interface (<code>IDataService</code>).</li>
        <li><strong>Concrete component</strong>: the real work (<code>FlakyDb</code>).</li>
        <li><strong>Decorators</strong>: wrap a component, add before/after behaviour (<code>Logging</code>, <code>Caching</code>, <code>Retry</code>). An optional abstract base decorator holds the inner reference.</li>
      </ul>
      <h3>Order matters</h3>
      <p>A call travels <em>inward</em> through the wrappers and the result travels back <em>outward</em>. So <code>Logging(Caching(x))</code> logs every call, even cache hits, but <code>Caching(Logging(x))</code> only logs cache misses. The walkthrough under the C# program shows this line by line.</p>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Cross-cutting features (logging, caching, retry, metrics, authorization, validation) that you want to mix and match.</li>
        <li>✅ You can't or shouldn't modify the original class.</li>
        <li>❌ Very long chains are hard to debug: stack traces get deep and order bugs are subtle.</li>
        <li>❌ If the interface is huge (20 methods), every decorator must forward all of them. Consider a narrower interface first.</li>
      </ul>
      <h3>Decorators inside .NET</h3>
      <ul>
        <li><code>Stream</code> wrappers: <code>BufferedStream</code>, <code>GZipStream</code>, <code>CryptoStream</code>, <code>DeflateStream</code> all take a <code>Stream</code> and are a <code>Stream</code>.
<pre><code>using var file = File.Create("backup.gz.enc");
using var crypto = new CryptoStream(file, aes.CreateEncryptor(), CryptoStreamMode.Write);
using var gzip = new GZipStream(crypto, CompressionLevel.Optimal);
gzip.Write(data);   // data → compress → encrypt → disk</code></pre>
        Here too, order matters: compress <em>before</em> encrypting, because encrypted bytes look random and don't compress.</li>
        <li><code>HttpClient</code> handlers: a <code>DelegatingHandler</code> wraps an <code>InnerHandler</code> (logging, retry, auth headers).</li>
        <li>ASP.NET Core middleware and libraries like Scrutor's <code>services.Decorate&lt;IService, LoggingService&gt;()</code>.</li>
      </ul>
      <div class="tip">A decorator must keep the <strong>same contract</strong> as what it wraps. Callers shouldn't be able to tell whether they hold the real service or a wrapped one.</div>
    `,
    examples: [
      {
        title: 'C#: logging, caching and retry wrappers in different orders',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `Console.WriteLine("=== A: Logging(Caching(Retry(db))) ===");
Run(new Logging(new Caching(new Retry(new FlakyDb()))));

Console.WriteLine("=== B: Caching(Logging(Retry(db))) ===");
Run(new Caching(new Logging(new Retry(new FlakyDb()))));

Console.WriteLine("=== C: Caching(Retry(Logging(db))) ===");
Run(new Caching(new Retry(new Logging(new FlakyDb()))));

static void Run(IDataService svc)
{
  for (var i = 1; i <= 2; i++)
    Console.WriteLine($"call {i} => {svc.Get("user:1")}");
}

// Component
public interface IDataService
{
  string Get(string key);
}

// Concrete component: times out on every odd-numbered call
public class FlakyDb : IDataService
{
  private int calls;

  public string Get(string key)
  {
    calls++;
    if (calls % 2 == 1)
    {
      Console.WriteLine($"[db] call #{calls} TIMEOUT");
      throw new TimeoutException();
    }
    Console.WriteLine($"[db] call #{calls} ok");
    return $"Ana({key})";
  }
}

// Base decorator: holds the wrapped object
public abstract class DataServiceDecorator(IDataService inner) : IDataService
{
  protected IDataService Inner { get; } = inner;
  public abstract string Get(string key);
}

public class Logging(IDataService inner) : DataServiceDecorator(inner)
{
  public override string Get(string key)
  {
    Console.WriteLine($"[log] -> Get({key})");    // before: on the way in
    var value = Inner.Get(key);
    Console.WriteLine($"[log] <- {value}");       // after: on the way out
    return value;
  }
}

public class Caching(IDataService inner) : DataServiceDecorator(inner)
{
  private readonly Dictionary<string, string> cache = [];

  public override string Get(string key)
  {
    if (cache.TryGetValue(key, out var hit))
    {
      Console.WriteLine($"[cache] HIT {key}");    // short-circuit: inner never called
      return hit;
    }
    Console.WriteLine($"[cache] miss {key}");
    return cache[key] = Inner.Get(key);
  }
}

public class Retry(IDataService inner, int maxAttempts = 3) : DataServiceDecorator(inner)
{
  public override string Get(string key)
  {
    for (var attempt = 1; ; attempt++)
    {
      try
      {
        Console.WriteLine($"[retry] attempt {attempt}");
        return Inner.Get(key);
      }
      catch (TimeoutException) when (attempt < maxAttempts)
      {
        // swallow and loop again
      }
    }
  }
}`,
        output: `=== A: Logging(Caching(Retry(db))) ===
[log] -> Get(user:1)
[cache] miss user:1
[retry] attempt 1
[db] call #1 TIMEOUT
[retry] attempt 2
[db] call #2 ok
[log] <- Ana(user:1)
call 1 => Ana(user:1)
[log] -> Get(user:1)
[cache] HIT user:1
[log] <- Ana(user:1)
call 2 => Ana(user:1)
=== B: Caching(Logging(Retry(db))) ===
[cache] miss user:1
[log] -> Get(user:1)
[retry] attempt 1
[db] call #1 TIMEOUT
[retry] attempt 2
[db] call #2 ok
[log] <- Ana(user:1)
call 1 => Ana(user:1)
[cache] HIT user:1
call 2 => Ana(user:1)
=== C: Caching(Retry(Logging(db))) ===
[cache] miss user:1
[retry] attempt 1
[log] -> Get(user:1)
[db] call #1 TIMEOUT
[retry] attempt 2
[log] -> Get(user:1)
[db] call #2 ok
[log] <- Ana(user:1)
call 1 => Ana(user:1)
[cache] HIT user:1
call 2 => Ana(user:1)`,
        explain: `
          <details>
            <summary>The mental model: calls go in, results come out</summary>
            <p>Read <code>new Logging(new Caching(new Retry(new FlakyDb())))</code> from the <strong>outside in</strong>. The client holds the outermost object. Each decorator runs its "before" code, calls <code>Inner.Get</code>, then runs its "after" code as the result comes back:</p>
            <pre><code class="language-none">svc.Get("user:1")
└─ Logging   before: "[log] -&gt; Get"
   └─ Caching   miss → call inner        (a HIT would return here and skip everything below)
      └─ Retry     attempt 1 → inner throws → caught → attempt 2
         └─ FlakyDb   call #1 TIMEOUT / call #2 ok
      ◄─ Retry returns "Ana(user:1)"
   ◄─ Caching stores it in the dictionary
◄─ Logging   after: "[log] &lt;- Ana(user:1)"</code></pre>
            <p>It works like nested function calls on the call stack. The last wrapper you <em>enter</em> is the first one to <em>finish</em>.</p>
          </details>
          <details>
            <summary>Step by step: composition A, call 1 and call 2</summary>
            <table>
              <tr><th>#</th><th>Active object</th><th>What it does</th><th>Console</th></tr>
              <tr><td>1</td><td>Logging</td><td>before-code, then <code>Inner.Get</code></td><td><code>[log] -&gt; Get(user:1)</code></td></tr>
              <tr><td>2</td><td>Caching</td><td>dictionary empty → miss → <code>Inner.Get</code></td><td><code>[cache] miss user:1</code></td></tr>
              <tr><td>3</td><td>Retry</td><td>attempt 1 → <code>Inner.Get</code></td><td><code>[retry] attempt 1</code></td></tr>
              <tr><td>4</td><td>FlakyDb</td><td>call #1 is odd → throws <code>TimeoutException</code></td><td><code>[db] call #1 TIMEOUT</code></td></tr>
              <tr><td>5</td><td>Retry</td><td><code>catch … when (attempt &lt; 3)</code> → loop</td><td><code>[retry] attempt 2</code></td></tr>
              <tr><td>6</td><td>FlakyDb</td><td>call #2 succeeds</td><td><code>[db] call #2 ok</code></td></tr>
              <tr><td>7</td><td>Caching</td><td>stores <code>Ana(user:1)</code>, returns it</td><td></td></tr>
              <tr><td>8</td><td>Logging</td><td>after-code</td><td><code>[log] &lt;- Ana(user:1)</code></td></tr>
              <tr><td>9</td><td>client</td><td>prints the result</td><td><code>call 1 =&gt; Ana(user:1)</code></td></tr>
              <tr><td>10</td><td>Logging → Caching</td><td>call 2: Caching finds the key → <strong>HIT</strong>, returns without calling Retry or FlakyDb</td><td><code>[log] -&gt; Get</code>, <code>[cache] HIT</code>, <code>[log] &lt;- …</code></td></tr>
            </table>
            <p>Retry hides the first failure, so callers never see the timeout. The cache means call 2 never reaches the database.</p>
          </details>
          <details>
            <summary>Same wrappers, different order: A vs B vs C</summary>
            <p>All three use the same four classes. Only the nesting differs:</p>
            <table>
              <tr><th></th><th>Composition</th><th>Log lines (call 1 / call 2)</th><th>What you learn</th></tr>
              <tr><td>A</td><td><code>Logging(Caching(Retry(db)))</code></td><td>2 / 2</td><td>Logging is outermost, so it sees <strong>every</strong> request, cache hits included. Good for "requests per second".</td></tr>
              <tr><td>B</td><td><code>Caching(Logging(Retry(db)))</code></td><td>2 / <strong>0</strong></td><td>Cache hits return before reaching Logging. You only log real backend work. Good for "how often do we hit the DB?".</td></tr>
              <tr><td>C</td><td><code>Caching(Retry(Logging(db)))</code></td><td><strong>3</strong> / 0</td><td>Logging is inside Retry, so it logs each <strong>attempt</strong>. The failed attempt has a <code>-&gt;</code> but no <code>&lt;-</code> line because the exception skipped Logging's after-code.</td></tr>
            </table>
            <div class="warn">Order bugs are real. Put Retry <em>outside</em> Caching and an error result could be cached and served forever. Put an authorization decorator <em>inside</em> a cache and unauthorised users could be served cached data. Decide the order on purpose, and compose in one place (the composition root) so it's easy to read.</div>
          </details>
          <details>
            <summary>Try this in the widget below</summary>
            <p>Build stack A, click <b>Call Get</b> twice, then use ↑/↓ to move Logging below Caching (stack B) and call twice again. Watch how many <code>[log]</code> lines appear. Then untick Retry and call: the timeout now escapes to the client.</p>
          </details>
        `,
      },
      {
        title: 'Widget: build a wrapper stack and trace a call',
        lang: 'html',
        code: `<style>
.dc { font-size: 14px; }
.dc .hint { color: #555; margin: 0 0 8px; }
.dc .grid { display: grid; grid-template-columns: minmax(180px, 230px) 1fr; gap: 12px; }
.dc .layers { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.dc .layers li { display: flex; align-items: center; gap: 4px; padding: 3px 6px; border: 1px solid #dde3ee;
  border-radius: 6px; background: #fafbfd; font-size: 13px; }
.dc .layers li.off { opacity: .45; }
.dc .layers li b { flex: 1; }
.dc .layers button { padding: 0 6px; margin: 0; }
.dc .expr { font: 12px ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 6px; padding: 6px;
  margin: 6px 0; word-break: break-all; }
.dc .nest { border: 2px solid #c5cde0; border-radius: 10px; padding: 4px 8px 8px; margin-top: 4px; transition: all .2s; }
.dc .nest > .lbl { font: 600 12px ui-monospace, Menlo, monospace; }
.dc .nest.hi { border-color: #2563eb; background: #eaf2ff; box-shadow: 0 0 0 3px #bfdbfe; }
.dc .nest.err { border-color: #dc2626; background: #fdecec; }
.dc .k-log { color: #7c3aed; } .dc .k-cache { color: #0f766e; } .dc .k-retry { color: #b45309; } .dc .k-db { color: #1d4ed8; }
.dc .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 8px 0; }
.dc .log { font: 12px/1.45 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 150px; overflow: auto; padding: 6px 8px; white-space: pre; }
.dc .log .client { font-weight: 700; color: #111; }
.dc .log .bad { color: #b42318; font-weight: 700; }
.dc .stats { font-size: 12.5px; color: #444; }
</style>
<div class="dc">
  <p class="hint">Toggle wrappers on/off and reorder them with ↑ ↓ (top = outermost). Click <b>Call Get</b> and watch the call go in and the result come out.</p>
  <div class="grid">
    <div>
      <ul class="layers" id="layers"></ul>
      <div class="expr" id="expr"></div>
      <label style="font-size:13px"><input type="checkbox" id="flaky" checked> FlakyDb times out on odd calls</label>
    </div>
    <div id="viz"></div>
  </div>
  <div class="ctl">
    key <select id="key"><option>user:1</option><option>user:2</option></select>
    <button id="go">▶ Call Get</button>
    <button id="rebuild">Rebuild objects (clear cache + db counter)</button>
    <span class="stats" id="stats"></span>
  </div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var NAMES = { log: 'Logging', cache: 'Caching', retry: 'Retry' };
var layers = [{ k: 'log', on: true }, { k: 'cache', on: true }, { k: 'retry', on: true }];
var cache = {};
var dbCalls = 0;
var callNo = 0;
var busy = false;
var stats = { db: 0, logLines: 0, hits: 0 };

function active() { return layers.filter(function (l) { return l.on; }); }

function rebuild(msg) {
  cache = {};
  dbCalls = 0;
  callNo = 0;
  stats = { db: 0, logLines: 0, hits: 0 };
  render();
  if (msg) addLog('--- new objects: ' + $('expr').textContent + ' ---', '');
}

function render() {
  var ul = $('layers');
  ul.innerHTML = '';
  layers.forEach(function (l, i) {
    var li = document.createElement('li');
    if (!l.on) li.className = 'off';
    var cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = l.on;
    cb.onchange = function () { if (busy) return; l.on = cb.checked; rebuild(true); };
    var b = document.createElement('b');
    b.textContent = NAMES[l.k];
    b.className = 'k-' + l.k;
    var up = document.createElement('button');
    up.textContent = '↑';
    up.disabled = i === 0;
    up.onclick = function () { move(i, -1); };
    var dn = document.createElement('button');
    dn.textContent = '↓';
    dn.disabled = i === layers.length - 1;
    dn.onclick = function () { move(i, 1); };
    li.append(cb, b, up, dn);
    ul.appendChild(li);
  });
  var li2 = document.createElement('li');
  li2.innerHTML = '<b class="k-db">FlakyDb (real service)</b>';
  ul.appendChild(li2);

  var a = active();
  var expr = 'new FlakyDb()';
  for (var j = a.length - 1; j >= 0; j--) expr = 'new ' + NAMES[a[j].k] + '(' + expr + ')';
  $('expr').textContent = expr;

  var host = $('viz');
  host.innerHTML = '';
  var parent = host;
  a.forEach(function (l, i) {
    var d = document.createElement('div');
    d.className = 'nest';
    d.id = 'n' + i;
    d.innerHTML = '<div class="lbl k-' + l.k + '">' + NAMES[l.k] + '</div>';
    parent.appendChild(d);
    parent = d;
  });
  var db = document.createElement('div');
  db.className = 'nest';
  db.id = 'ndb';
  db.innerHTML = '<div class="lbl k-db">FlakyDb</div>';
  parent.appendChild(db);
  $('stats').textContent = 'db calls: ' + stats.db + ' · log lines: ' + stats.logLines + ' · cache hits: ' + stats.hits;
}

function move(i, d) {
  if (busy) return;
  var j = i + d;
  var t = layers[i];
  layers[i] = layers[j];
  layers[j] = t;
  rebuild(true);
}

function addLog(text, cls) {
  var div = document.createElement('div');
  div.textContent = text;
  if (cls) div.className = cls;
  $('log').appendChild(div);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(text);
}

// Simulate the C# objects: build a list of events, then animate them.
function callLayer(a, i, key, ev) {
  if (i === a.length) {
    dbCalls++;
    if ($('flaky').checked && dbCalls % 2 === 1) {
      ev.push({ n: 'ndb', t: '[db] call #' + dbCalls + ' TIMEOUT', c: 'k-db', err: true, db: 1 });
      throw new Error('TimeoutException');
    }
    ev.push({ n: 'ndb', t: '[db] call #' + dbCalls + ' ok', c: 'k-db', db: 1 });
    return 'Ana(' + key + ')';
  }
  var k = a[i].k;
  var id = 'n' + i;
  var v;
  if (k === 'log') {
    ev.push({ n: id, t: '[log] -> Get(' + key + ')', c: 'k-log', lg: 1 });
    v = callLayer(a, i + 1, key, ev);
    ev.push({ n: id, t: '[log] <- ' + v, c: 'k-log', lg: 1 });
    return v;
  }
  if (k === 'cache') {
    if (cache[key]) {
      ev.push({ n: id, t: '[cache] HIT ' + key, c: 'k-cache', hit: 1 });
      return cache[key];
    }
    ev.push({ n: id, t: '[cache] miss ' + key, c: 'k-cache' });
    v = callLayer(a, i + 1, key, ev);
    cache[key] = v;
    ev.push({ n: id, t: '', c: '' });
    return v;
  }
  for (var attempt = 1; ; attempt++) {
    ev.push({ n: id, t: '[retry] attempt ' + attempt, c: 'k-retry' });
    try {
      v = callLayer(a, i + 1, key, ev);
      ev.push({ n: id, t: '', c: '' });
      return v;
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

$('go').onclick = function () {
  if (busy) return;
  var key = $('key').value;
  var a = active();
  var ev = [];
  callNo++;
  try {
    var v = callLayer(a, 0, key, ev);
    ev.push({ n: null, t: 'call ' + callNo + ' => ' + v, c: 'client' });
  } catch (e) {
    ev.push({ n: null, t: 'call ' + callNo + ' => unhandled TimeoutException!', c: 'bad' });
  }
  busy = true;
  $('go').disabled = true;
  var i = 0;
  function step() {
    document.querySelectorAll('.dc .nest').forEach(function (x) { x.classList.remove('hi', 'err'); });
    if (i >= ev.length) {
      busy = false;
      $('go').disabled = false;
      return;
    }
    var e = ev[i++];
    if (e.n) $(e.n).classList.add(e.err ? 'err' : 'hi');
    if (e.t) addLog(e.t, e.c);
    if (e.db) stats.db++;
    if (e.lg) stats.logLines++;
    if (e.hit) stats.hits++;
    $('stats').textContent = 'db calls: ' + stats.db + ' · log lines: ' + stats.logLines + ' · cache hits: ' + stats.hits;
    setTimeout(step, e.t ? 650 : 350);
  }
  step();
};

$('rebuild').onclick = function () { if (!busy) rebuild(true); };
$('flaky').onchange = function () { if (!busy) rebuild(true); };
rebuild(false);
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Default stack (Logging, Caching, Retry) is composition <strong>A</strong>. Click <b>Call Get</b> twice. The log matches block A of the C# output. Boxes light up from the outside in, then back out.</li>
              <li>Click ↓ on Logging once to get Caching, Logging, Retry (composition <strong>B</strong>). Call twice. The second call stops at Caching, so no <code>[log]</code> lines appear.</li>
              <li>Move Logging to the bottom (composition <strong>C</strong>) and call. You'll see <code>[log] -&gt;</code> for every retry attempt.</li>
              <li>Untick <em>Retry</em> and call: the first database timeout escapes to the client (red). Without the wrapper, nothing handles it.</li>
              <li>Untick <em>FlakyDb times out</em> to compare a healthy backend. Switch the key to <code>user:2</code> to get a cache miss on purpose.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What makes a class a decorator?',
        options: ['It inherits from the concrete class and overrides methods', 'It implements the same interface as the object it wraps and delegates to it', 'It converts one interface to another', 'It creates the wrapped object lazily'],
        answer: 1,
        why: 'Same interface plus a reference to an inner object of that interface. That is why decorators can be stacked and the client can\'t tell the difference.',
      },
      {
        q: 'With <code>Caching(Logging(db))</code>, what is logged for a cache hit?',
        options: ['A "-&gt;" and a "&lt;-" line', 'Only the "-&gt;" line', 'Nothing: Caching returns before Logging is reached', 'An exception'],
        answer: 2,
        why: 'Caching is the outer wrapper. On a hit it returns immediately, so the inner Logging decorator never runs.',
      },
      {
        q: 'Which .NET types are decorators?',
        options: ['<code>GZipStream</code> and <code>BufferedStream</code> (they take a Stream and are a Stream)', '<code>List&lt;T&gt;</code> and <code>Dictionary&lt;K,V&gt;</code>', '<code>StreamReader</code> (Stream → TextReader)', '<code>Lazy&lt;T&gt;</code>'],
        answer: 0,
        why: 'Stream wrappers keep the <code>Stream</code> interface and add compression or buffering. <code>StreamReader</code> changes the interface (bytes to text), which makes it an adapter.',
      },
      {
        q: 'Why prefer decorators over subclasses like <code>LoggingCachingDbService</code>?',
        options: ['Decorators run faster', 'Subclasses can\'t override methods', 'Features combine at runtime without one class per combination', 'Decorators don\'t need interfaces'],
        answer: 2,
        why: 'n independent features as subclasses need up to 2ⁿ classes. As decorators you need n classes, and you can combine them in any order.',
      },
      {
        q: 'You want metrics for <em>every</em> request, including those served from cache. Where should the Metrics decorator go?',
        options: ['Innermost, next to the database', 'Outside the Caching decorator', 'Inside Retry', 'Order doesn\'t matter'],
        answer: 1,
        why: 'Only wrappers outside the cache see cache hits. Anything inside Caching runs only on misses.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>The starter adds logging by <em>subclassing</em> <code>EmailNotifier</code>. Adding Slack would mean another subclass, plus one for "Slack + logging"…</p>
        <p>Refactor to decorators: <code>LoggingNotifier</code> and <code>SlackNotifier</code> each implement <code>INotifier</code> and wrap another <code>INotifier</code>. Compose them as <code>new LoggingNotifier(new SlackNotifier(new EmailNotifier()))</code> and remove the subclass. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class SlackNotifier(INotifier inner) : INotifier { public void Send(string m) { inner.Send(m); Console.WriteLine($"slack: {m}"); } }',
      starter: `INotifier notifier = new LoggingEmailNotifier();
notifier.Send("Order 42 shipped");

public interface INotifier
{
  void Send(string message);
}

public class EmailNotifier : INotifier
{
  public virtual void Send(string message) => Console.WriteLine($"email: {message}");
}

// TODO: replace this subclass with decorators that wrap any INotifier
public class LoggingEmailNotifier : EmailNotifier
{
  public override void Send(string message)
  {
    Console.WriteLine("log: sending...");
    base.Send(message);
  }
}`,
      solution: `INotifier notifier = new LoggingNotifier(new SlackNotifier(new EmailNotifier()));
notifier.Send("Order 42 shipped");

public interface INotifier
{
  void Send(string message);
}

public class EmailNotifier : INotifier
{
  public void Send(string message) => Console.WriteLine($"email: {message}");
}

public class SlackNotifier(INotifier inner) : INotifier
{
  public void Send(string message)
  {
    inner.Send(message);
    Console.WriteLine($"slack: {message}");
  }
}

public class LoggingNotifier(INotifier inner) : INotifier
{
  public void Send(string message)
  {
    Console.WriteLine("log: sending...");
    inner.Send(message);
    Console.WriteLine("log: sent");
  }
}`,
      checks: [
        { label: 'LoggingNotifier implements INotifier', re: /class\s+LoggingNotifier\b[^{]*:\s*INotifier\b/ },
        { label: 'SlackNotifier implements INotifier', re: /class\s+SlackNotifier\b[^{]*:\s*INotifier\b/ },
        { label: 'Decorators receive an INotifier to wrap', re: /(\(\s*INotifier\s+\w+\s*\)[\s\S]*){2,}/ },
        { label: 'No class inherits from EmailNotifier anymore', re: /:\s*EmailNotifier\b/, absent: true },
        { label: 'Composes three layers: new XNotifier(new YNotifier(new EmailNotifier()))', re: /new\s+\w+Notifier\s*\(\s*new\s+\w+Notifier\s*\(\s*new\s+EmailNotifier\s*\(/ },
      ],
    }),
  },

  // ───────────────────────────── FACADE ─────────────────────────────
  {
    id: 'facade',
    section: 'Structural patterns',
    title: 'Facade',
    explain: `
      <p><strong>Intent:</strong> give a complex subsystem one simple front door, so clients can do the common task with one call instead of coordinating many classes.</p>
      <h3>The problem</h3>
      <p>Placing an order touches inventory, payments, shipping and email. Each subsystem is reasonable on its own, but every controller, background job and test that places an order must call six methods in the right order and handle the "out of stock" branch:</p>
      <pre><code>// ❌ before: every client repeats the choreography
if (!inventory.Reserve(sku, qty)) return "Rejected";
var auth = payments.Authorize(qty * price);
payments.Capture(auth);
inventory.Commit(sku, qty);
var tracking = shipping.CreateLabel(sku, qty);
mailer.Send(email, $"Order shipped: {tracking}");</code></pre>
      <p>Clients now depend on four classes and their call order. When payments gains a fraud check, you edit every client.</p>
      <h3>The solution</h3>
      <p>A <strong>facade</strong> class owns the choreography and exposes a small, task-shaped API: <code>PlaceOrder(email, sku, qty, price)</code>. The subsystem classes stay as they are, and power users can still use them directly.</p>
      <pre><code class="language-none">           ┌──────────────── CheckoutFacade.PlaceOrder() ────────────────┐
client ──► │ Inventory.Reserve → Payments.Authorize → Payments.Capture → │
           │ Inventory.Commit  → Shipping.CreateLabel → Mailer.Send      │
           └──────────────────────────────────────────────────────────────┘</code></pre>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ A subsystem with many moving parts used in the same way by many clients (checkout, report export, onboarding a user).</li>
        <li>✅ Layering: an application service is often a facade over repositories and domain services.</li>
        <li>❌ A facade that keeps growing into a "god class" with 40 methods. Split it by task.</li>
        <li>❌ Don't <em>hide</em> the subsystem completely when advanced clients need its full power. A facade is a shortcut, not a wall.</li>
      </ul>
      <h3>Facade vs Adapter</h3>
      <p>Both wrap other code. An <strong>adapter</strong> makes <em>one</em> existing interface look like <em>another existing</em> interface the client expects. A <strong>facade</strong> defines a <em>new, simpler</em> interface over <em>many</em> classes.</p>
      <h3>Facades inside .NET</h3>
      <ul>
        <li><code>File.ReadAllText(path)</code> hides <code>FileStream</code> + <code>StreamReader</code> + encoding detection + disposal.</li>
        <li><code>HttpClient.GetStringAsync(url)</code> hides request messages, handlers, content reading.</li>
        <li><code>WebApplication.CreateBuilder(args)</code> sets up configuration, logging, DI and hosting in one call.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: a checkout facade over four subsystems',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var shop = new CheckoutFacade(new Inventory(), new Payments(), new Shipping(), new Mailer());

Console.WriteLine(shop.PlaceOrder("ana@example.com", "SKU-42", 2, 19.99m));
Console.WriteLine(shop.PlaceOrder("ben@example.com", "SKU-99", 1, 5.00m));

// Facade: one task-shaped method over the whole subsystem
public class CheckoutFacade(Inventory inventory, Payments payments, Shipping shipping, Mailer mailer)
{
  public string PlaceOrder(string email, string sku, int qty, decimal price)
  {
    if (!inventory.Reserve(sku, qty))
      return $"Rejected: {sku} out of stock";

    var authId = payments.Authorize(qty * price);
    payments.Capture(authId);
    inventory.Commit(sku, qty);
    var tracking = shipping.CreateLabel(sku, qty);
    mailer.Send(email, $"Order shipped: {tracking}");
    return $"Placed, tracking {tracking}";
  }
}

// Subsystem classes: each does one job and knows nothing about the facade
public class Inventory
{
  private readonly Dictionary<string, int> stock = new() { ["SKU-42"] = 10, ["SKU-99"] = 0 };

  public bool Reserve(string sku, int qty)
  {
    var ok = stock.GetValueOrDefault(sku) >= qty;
    Console.WriteLine($"  inventory: reserve {qty} x {sku} -> {(ok ? "ok" : "OUT OF STOCK")}");
    return ok;
  }

  public void Commit(string sku, int qty)
  {
    stock[sku] -= qty;
    Console.WriteLine($"  inventory: commit {sku}, {stock[sku]} left");
  }
}

public class Payments
{
  private int next = 1;

  public string Authorize(decimal amount)
  {
    var id = $"AUTH-{next++}";
    Console.WriteLine($"  payments: authorize {amount} -> {id}");
    return id;
  }

  public void Capture(string authId) => Console.WriteLine($"  payments: capture {authId}");
}

public class Shipping
{
  public string CreateLabel(string sku, int qty)
  {
    Console.WriteLine($"  shipping: label for {qty} x {sku} -> TRK-1001");
    return "TRK-1001";
  }
}

public class Mailer
{
  public void Send(string to, string message) =>
    Console.WriteLine($"  mailer: to {to}: '{message}'");
}`,
        output: `  inventory: reserve 2 x SKU-42 -> ok
  payments: authorize 39.98 -> AUTH-1
  payments: capture AUTH-1
  inventory: commit SKU-42, 8 left
  shipping: label for 2 x SKU-42 -> TRK-1001
  mailer: to ana@example.com: 'Order shipped: TRK-1001'
Placed, tracking TRK-1001
  inventory: reserve 1 x SKU-99 -> OUT OF STOCK
Rejected: SKU-99 out of stock`,
      },
      {
        title: 'Widget: 6 subsystem calls vs 1 facade call',
        lang: 'html',
        code: `<style>
.fc { font-size: 14px; }
.fc .hint { color: #555; margin: 0 0 8px; }
.fc .ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.fc .stage { display: grid; grid-template-columns: 110px 130px 1fr; gap: 10px; align-items: center; }
.fc .box { border: 2px solid #c5cde0; border-radius: 10px; padding: 8px; text-align: center; background: #fff;
  font-weight: 700; font-size: 13px; transition: all .2s; }
.fc .box.hi { border-color: #2563eb; background: #eaf2ff; box-shadow: 0 0 0 3px #bfdbfe; }
.fc .box.off { opacity: .25; }
.fc .subs { display: grid; gap: 4px; }
.fc .sub { border: 1px solid #dde3ee; border-radius: 8px; padding: 4px 8px; font: 12px ui-monospace, Menlo, monospace;
  background: #fafbfd; transition: all .2s; display: flex; justify-content: space-between; }
.fc .sub.hi { border-color: #2563eb; background: #eaf2ff; }
.fc .sub.done { border-color: #16a34a; background: #effaf2; }
.fc .sub.bad { border-color: #dc2626; background: #fdecec; }
.fc .sub .who { color: #888; }
.fc .meters { display: flex; gap: 16px; margin: 8px 0; font-size: 13px; flex-wrap: wrap; }
.fc .meters b { font-size: 18px; color: #1d4ed8; }
.fc pre { margin: 0; font: 11.5px/1.4 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px;
  padding: 6px 8px; white-space: pre-wrap; }
.fc .log { font: 12px/1.45 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 96px; overflow: auto; padding: 6px 8px; white-space: pre; margin-top: 6px; }
</style>
<div class="fc">
  <p class="hint">Choose how the client places an order, then click <b>Place order</b>. Compare how much the client has to know.</p>
  <div class="ctl">
    <label><input type="radio" name="mode" value="direct"> client calls subsystems directly</label>
    <label><input type="radio" name="mode" value="facade" checked> client calls CheckoutFacade</label>
    <label><input type="checkbox" id="stock" checked> SKU in stock</label>
    <button id="go">Place order</button>
  </div>
  <div class="stage">
    <div class="box" id="client">Client<br><span style="font-weight:400;font-size:11px">controller / job / test</span></div>
    <div class="box" id="facade">CheckoutFacade<br><span style="font-weight:400;font-size:11px">PlaceOrder()</span></div>
    <div class="subs" id="subs"></div>
  </div>
  <div class="meters">
    <span>calls written in client code: <b id="mCalls">0</b></span>
    <span>classes the client depends on: <b id="mDeps">1</b></span>
    <span>orders placed: <b id="mOrders">0</b></span>
  </div>
  <pre id="code"></pre>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var STEPS = [
  { cls: 'Inventory', m: 'Reserve(sku, qty)' },
  { cls: 'Payments', m: 'Authorize(total)' },
  { cls: 'Payments', m: 'Capture(authId)' },
  { cls: 'Inventory', m: 'Commit(sku, qty)' },
  { cls: 'Shipping', m: 'CreateLabel(sku, qty)' },
  { cls: 'Mailer', m: 'Send(email, msg)' },
];
var CODE = {
  direct: 'if (!inventory.Reserve(sku, qty)) return "Rejected";' + String.fromCharCode(10) +
    'var auth = payments.Authorize(qty * price);' + String.fromCharCode(10) +
    'payments.Capture(auth);' + String.fromCharCode(10) +
    'inventory.Commit(sku, qty);' + String.fromCharCode(10) +
    'var tracking = shipping.CreateLabel(sku, qty);' + String.fromCharCode(10) +
    'mailer.Send(email, "Order shipped: " + tracking);',
  facade: 'var result = shop.PlaceOrder(email, sku, qty, price);',
};
var busy = false;
var orders = 0;
var stock = 10;
var auth = 0;

function mode() { return document.querySelector('input[name=mode]:checked').value; }

function render() {
  var m = mode();
  $('subs').innerHTML = '';
  STEPS.forEach(function (s, i) {
    var d = document.createElement('div');
    d.className = 'sub';
    d.id = 's' + i;
    d.innerHTML = '<span>' + s.cls + '.' + s.m + '</span><span class="who"></span>';
    $('subs').appendChild(d);
  });
  $('facade').classList.toggle('off', m === 'direct');
  $('code').textContent = '// client code' + String.fromCharCode(10) + CODE[m];
  $('mDeps').textContent = m === 'direct' ? 4 : 1;
  $('mCalls').textContent = m === 'direct' ? 6 : 1;
}

function log(t) {
  var d = document.createElement('div');
  d.textContent = t;
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(t);
}

function lineFor(i, inStock) {
  var t = (2 * 19.99).toFixed(2);
  return [
    '  inventory: reserve 2 x SKU-42 -> ' + (inStock ? 'ok' : 'OUT OF STOCK'),
    '  payments: authorize ' + t + ' -> AUTH-' + auth,
    '  payments: capture AUTH-' + auth,
    '  inventory: commit SKU-42, ' + stock + ' left',
    '  shipping: label for 2 x SKU-42 -> TRK-1001',
    "  mailer: to ana@example.com: 'Order shipped: TRK-1001'",
  ][i];
}

$('go').onclick = function () {
  if (busy) return;
  busy = true;
  $('go').disabled = true;
  render();
  var m = mode();
  var inStock = $('stock').checked;
  var caller = m === 'direct' ? 'client' : 'facade';
  var i = 0;
  $('client').classList.add('hi');
  if (m === 'facade') log('client: shop.PlaceOrder(...)  // 1 call');
  function next() {
    STEPS.forEach(function (_, k) { $('s' + k).classList.remove('hi'); });
    $('facade').classList.remove('hi');
    if (i === STEPS.length || (i === 1 && !inStock)) {
      $('client').classList.remove('hi');
      log(inStock ? 'Placed, tracking TRK-1001' : 'Rejected: SKU-42 out of stock');
      if (inStock) { orders++; $('mOrders').textContent = orders; }
      busy = false;
      $('go').disabled = false;
      return;
    }
    if (m === 'facade') $('facade').classList.add('hi');
    if (i === 1) auth++;
    if (i === 3) stock -= 2;
    var row = $('s' + i);
    row.classList.add('hi');
    row.querySelector('.who').textContent = 'called by ' + caller;
    var bad = i === 0 && !inStock;
    log(lineFor(i, !bad));
    var done = i;
    setTimeout(function () { row.classList.remove('hi'); row.classList.add(bad ? 'bad' : 'done'); }, 450);
    i++;
    setTimeout(next, 650);
  }
  next();
};

document.querySelectorAll('input[name=mode]').forEach(function (r) {
  r.onchange = function () { if (!busy) render(); };
});
render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>With <em>client calls subsystems directly</em>, place an order. Every row says "called by client". The client code box shows six lines and four dependencies that every caller must repeat.</li>
              <li>Switch to <em>CheckoutFacade</em> and place the order again. The same six subsystem calls happen, in the same order, but "called by facade". The client wrote one line.</li>
              <li>Untick <em>SKU in stock</em>. The flow stops after <code>Reserve</code> fails. With the facade, that branch lives in one place instead of in every client.</li>
            </ol>
            <div class="tip">A facade doesn't make the work smaller. It moves the <em>knowledge</em> of how to do the work into one class.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does a Facade provide?',
        options: ['A translation from one existing interface to another', 'A simpler, task-shaped interface over a group of classes', 'Lazy creation of an expensive object', 'A tree of objects treated uniformly'],
        answer: 1,
        why: 'Facade = a simple front door to a subsystem. Translating interfaces is Adapter, lazy creation is a virtual Proxy, and trees are Composite.',
      },
      {
        q: '<code>File.ReadAllText(path)</code> internally opens a FileStream, wraps it in a StreamReader, detects encoding and disposes everything. That method is an example of…',
        options: ['Decorator', 'Facade', 'Proxy', 'Composite'],
        answer: 1,
        why: 'One convenient call over several cooperating classes. You can still use FileStream and StreamReader directly when you need more control.',
      },
      {
        q: 'After adding a facade, should other code be forbidden from using the subsystem classes directly?',
        options: ['Yes, always make subsystem classes internal', 'Not necessarily: a facade is a convenience; advanced clients may still use the parts', 'Yes, otherwise the facade won\'t compile', 'Only in ASP.NET Core'],
        answer: 1,
        why: 'The classic Facade doesn\'t encapsulate the subsystem. It just offers an easier path. You can hide it when you want a strict boundary, but the pattern doesn\'t require it.',
      },
      {
        q: 'Your <code>AppFacade</code> now has 45 methods covering orders, users, reports and email. What went wrong?',
        options: ['Nothing, facades should cover everything', 'It became a god class; split into task-focused facades like CheckoutService and ReportExporter', 'It should be converted into an adapter', 'It needs to be a singleton'],
        answer: 1,
        why: 'A facade should simplify one area. A single facade over the whole app recreates the coupling problem in one place.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>To watch a movie, the client currently calls six methods on four devices. Create a <code>HomeTheaterFacade</code> with <code>WatchMovie(string title)</code> and <code>EndMovie()</code> that do the choreography, and make the top-level code use only the facade. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class HomeTheaterFacade(Lights lights, Projector projector, Amplifier amp, Streamer streamer) { public void WatchMovie(string title) { lights.Dim(10); ... } }',
      starter: `var lights = new Lights();
var projector = new Projector();
var amp = new Amplifier();
var streamer = new Streamer();

// TODO: hide this choreography behind HomeTheaterFacade.WatchMovie / EndMovie
lights.Dim(10);
projector.On();
amp.On();
amp.SetVolume(5);
streamer.Play("Dune");
streamer.Stop();

public class Lights { public void Dim(int level) => Console.WriteLine($"lights dimmed to {level}%"); }
public class Projector { public void On() => Console.WriteLine("projector on"); }
public class Amplifier
{
  public void On() => Console.WriteLine("amp on");
  public void SetVolume(int v) => Console.WriteLine($"volume {v}");
}
public class Streamer
{
  public void Play(string title) => Console.WriteLine($"playing {title}");
  public void Stop() => Console.WriteLine("stopped");
}`,
      solution: `var theater = new HomeTheaterFacade(new Lights(), new Projector(), new Amplifier(), new Streamer());
theater.WatchMovie("Dune");
theater.EndMovie();

public class HomeTheaterFacade(Lights lights, Projector projector, Amplifier amp, Streamer streamer)
{
  public void WatchMovie(string title)
  {
    lights.Dim(10);
    projector.On();
    amp.On();
    amp.SetVolume(5);
    streamer.Play(title);
  }

  public void EndMovie()
  {
    streamer.Stop();
    lights.Dim(100);
  }
}

public class Lights { public void Dim(int level) => Console.WriteLine($"lights dimmed to {level}%"); }
public class Projector { public void On() => Console.WriteLine("projector on"); }
public class Amplifier
{
  public void On() => Console.WriteLine("amp on");
  public void SetVolume(int v) => Console.WriteLine($"volume {v}");
}
public class Streamer
{
  public void Play(string title) => Console.WriteLine($"playing {title}");
  public void Stop() => Console.WriteLine("stopped");
}`,
      checks: [
        { label: 'Declares class HomeTheaterFacade', re: /class\s+HomeTheaterFacade\b/ },
        { label: 'Has WatchMovie(string title)', re: /void\s+WatchMovie\s*\(\s*string\s+\w+\s*\)/ },
        { label: 'Has EndMovie()', re: /void\s+EndMovie\s*\(\s*\)/ },
        { label: 'Client calls .WatchMovie(...)', re: /\.\s*WatchMovie\s*\(/ },
        { label: 'Top-level code no longer starts with lights.Dim(...)', re: /^lights\.Dim\s*\(/m, absent: true },
      ],
    }),
  },

  // ───────────────────────────── PROXY ─────────────────────────────
  {
    id: 'proxy',
    section: 'Structural patterns',
    title: 'Proxy',
    explain: `
      <p><strong>Intent:</strong> provide a stand-in object with the <em>same interface</em> as the real one, so you can <strong>control access</strong> to it: create it late, check permissions, cache results, or reach it over a network.</p>
      <h3>The problem</h3>
      <p>A photo gallery shows 200 thumbnails. Each <code>HighResImage</code> loads 8 MB from disk in its constructor. Building the gallery eagerly loads 1.6 GB before the user sees anything, even though they will only open a few photos. Some photos are private and must only be shown to admins.</p>
      <h3>The solution</h3>
      <p>Give the gallery <strong>proxies</strong> that implement <code>IImage</code>. A proxy is cheap to create. It only creates the real image when <code>Display()</code> is first called, and it can check the user's role before it forwards the call. The gallery code doesn't change, because it still talks to <code>IImage</code>.</p>
      <pre><code class="language-none">Gallery ──► IImage ◄── LazyImageProxy ──(creates on first use)──► HighResImage
                   ◄── ProtectedImageProxy ──(checks user first)──► IImage</code></pre>
      <h3>Kinds of proxy</h3>
      <ul>
        <li><strong>Virtual proxy</strong>: lazy creation of something expensive (<code>Lazy&lt;T&gt;</code>, EF Core lazy-loading proxies).</li>
        <li><strong>Protection proxy</strong>: checks permissions before forwarding.</li>
        <li><strong>Caching proxy</strong>: remembers results of expensive or remote calls.</li>
        <li><strong>Remote proxy</strong>: a local object that represents something in another process (gRPC clients, WCF channels, Refit/HTTP clients generated from an interface).</li>
      </ul>
      <h3>Proxy vs Decorator: same shape, different intent</h3>
      <p>Both implement the interface and hold the real object, so the code can look identical. The difference is <strong>why</strong> it exists:</p>
      <table>
        <tr><th></th><th>Decorator</th><th>Proxy</th></tr>
        <tr><td>Purpose</td><td><em>Adds</em> behaviour (logging, compression)</td><td><em>Controls access</em> to the real object (when, whether, from where)</td></tr>
        <tr><td>Who creates the real object</td><td>The client passes it in. Decorators are stacked freely.</td><td>Often the proxy itself (lazy) or infrastructure (remote).</td></tr>
        <tr><td>Stacking</td><td>Designed to be stacked in any order</td><td>Usually a single stand-in</td></tr>
      </table>
      <p>A caching wrapper is a grey area. People call it a "caching decorator" or a "caching proxy", and both names are fine. Pick the name that tells readers the intent.</p>
      <h3>Proxies inside .NET</h3>
      <ul>
        <li><code>Lazy&lt;T&gt;</code>: a thread-safe virtual proxy around a factory (<code>.Value</code> creates on first access).</li>
        <li>EF Core lazy loading (<code>UseLazyLoadingProxies()</code>) generates subclasses of your entities. Touching <code>order.Customer</code> runs a SQL query at that moment.</li>
        <li><code>System.Reflection.DispatchProxy</code> builds a proxy for any interface at runtime. Every call goes to your <code>Invoke</code> method, which is how many logging/remote frameworks work.</li>
      </ul>
      <div class="warn">Lazy proxies hide cost. A harmless-looking property access might hit the disk or the database. EF lazy loading in a loop is the classic "N+1 queries" bug.</div>
    `,
    examples: [
      {
        title: 'C#: virtual and protection proxies, plus Lazy<T>',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `List<IImage> gallery =
[
  new LazyImageProxy("beach.jpg"),
  new LazyImageProxy("city.jpg"),
  new LazyImageProxy("forest.jpg"),
];
Console.WriteLine($"Gallery ready: {gallery.Count} images, nothing loaded yet");
Console.WriteLine(gallery[1].Display());
Console.WriteLine(gallery[1].Display());

Console.WriteLine("--- protection proxy ---");
var payroll = new LazyImageProxy("payroll.png");
IImage asBen = new ProtectedImageProxy(payroll, new User("ben", IsAdmin: false));
IImage asAna = new ProtectedImageProxy(payroll, new User("ana", IsAdmin: true));
Console.WriteLine(asBen.Display());
Console.WriteLine(asAna.Display());

Console.WriteLine("--- built-in: Lazy<T> ---");
var logo = new Lazy<HighResImage>(() => new HighResImage("logo.png"));
Console.WriteLine($"IsValueCreated: {logo.IsValueCreated}");
Console.WriteLine(logo.Value.Display());
Console.WriteLine($"IsValueCreated: {logo.IsValueCreated}");

public interface IImage
{
  string FileName { get; }
  string Display();
}

public record User(string Name, bool IsAdmin);

// Real subject: expensive to create
public class HighResImage : IImage
{
  public HighResImage(string fileName)
  {
    FileName = fileName;
    Console.WriteLine($"  [disk] loading {fileName} (8 MB)...");
  }

  public string FileName { get; }
  public string Display() => $"Showing {FileName}";
}

// Virtual proxy: same interface, creates the real object on first use
public class LazyImageProxy(string fileName) : IImage
{
  private HighResImage? real;

  public string FileName => fileName;

  public string Display()
  {
    real ??= new HighResImage(fileName);    // only the first call pays
    return real.Display();
  }
}

// Protection proxy: same interface, checks access before forwarding
public class ProtectedImageProxy(IImage inner, User user) : IImage
{
  public string FileName => inner.FileName;

  public string Display() =>
    user.IsAdmin
      ? inner.Display()
      : $"Access denied: {user.Name} cannot view {FileName}";
}`,
        output: `Gallery ready: 3 images, nothing loaded yet
  [disk] loading city.jpg (8 MB)...
Showing city.jpg
Showing city.jpg
--- protection proxy ---
Access denied: ben cannot view payroll.png
  [disk] loading payroll.png (8 MB)...
Showing payroll.png
--- built-in: Lazy<T> ---
IsValueCreated: False
  [disk] loading logo.png (8 MB)...
Showing logo.png
IsValueCreated: True`,
        explain: `
          <details>
            <summary>Step by step: when does the disk get hit?</summary>
            <table>
              <tr><th>Line</th><th>Objects that exist</th><th>Console</th></tr>
              <tr><td>build <code>gallery</code></td><td>3 × <code>LazyImageProxy</code> (just a file name each). <strong>No</strong> <code>HighResImage</code>.</td><td><code>Gallery ready: 3 images…</code></td></tr>
              <tr><td><code>gallery[1].Display()</code></td><td><code>real</code> is null → <code>??=</code> creates <code>HighResImage("city.jpg")</code></td><td><code>[disk] loading city.jpg…</code> then <code>Showing city.jpg</code></td></tr>
              <tr><td><code>gallery[1].Display()</code> again</td><td><code>real</code> already set → reused</td><td><code>Showing city.jpg</code> only</td></tr>
              <tr><td><code>asBen.Display()</code></td><td>protection proxy says no → inner proxy is <strong>never called</strong>, so nothing loads</td><td><code>Access denied…</code></td></tr>
              <tr><td><code>asAna.Display()</code></td><td>allowed → inner lazy proxy creates the real image now</td><td><code>[disk] loading payroll.png…</code></td></tr>
            </table>
            <p>beach.jpg and forest.jpg were never displayed, so they never cost anything. The <code>[disk]</code> line appears <em>before</em> <code>Showing…</code> because <code>Display()</code> runs (and loads) before <code>Console.WriteLine</code> prints its return value.</p>
          </details>
          <details>
            <summary>Proxies compose: protection wraps lazy</summary>
            <p><code>ProtectedImageProxy</code> takes an <code>IImage</code>, so it can wrap the lazy proxy. Both users share the same <code>payroll</code> lazy proxy. Ben's denied call stops at the outer proxy, and Ana's call goes through and triggers the load. Put the access check <strong>outside</strong> the lazy one so denied users never cause the expensive load.</p>
            <div class="tip"><code>real ??= new …</code> is fine for single-threaded code. If two threads can call <code>Display()</code> at once, both might load the file. <code>Lazy&lt;T&gt;</code> is thread-safe by default (<code>LazyThreadSafetyMode.ExecutionAndPublication</code>), so use it inside the proxy in that case.</div>
          </details>
        `,
      },
      {
        title: 'Widget: lazy image gallery with access control',
        lang: 'html',
        code: `<style>
.px { font-size: 14px; }
.px .hint { color: #555; margin: 0 0 8px; }
.px .ctl { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin-bottom: 8px; }
.px .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(92px, 1fr)); gap: 8px; }
.px .tile { border: 2px solid #c5cde0; border-radius: 10px; padding: 6px; text-align: center; cursor: pointer;
  background: #fff; transition: all .2s; user-select: none; }
.px .tile:hover { border-color: #93c5fd; }
.px .thumb { height: 46px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  font-size: 22px; background: #eef1f6; color: #99a; }
.px .tile.loaded .thumb { color: #fff; }
.px .tile.loading { border-color: #f59e0b; background: #fff7e6; }
.px .tile.denied { border-color: #dc2626; background: #fdecec; }
.px .tile.hit { border-color: #16a34a; box-shadow: 0 0 0 3px #bbf7d0; }
.px .fn { font: 11.5px ui-monospace, Menlo, monospace; margin-top: 3px; }
.px .st { font-size: 11px; color: #666; }
.px .meters { display: flex; gap: 16px; margin: 8px 0; font-size: 13px; flex-wrap: wrap; }
.px .meters b { font-size: 17px; color: #1d4ed8; }
.px .log { font: 12px/1.45 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 110px; overflow: auto; padding: 6px 8px; white-space: pre; }
</style>
<div class="px">
  <p class="hint">Pick a mode and click <b>Rebuild gallery</b>, then click thumbnails to call <code>Display()</code>. 🔒 = private image.</p>
  <div class="ctl">
    <select id="mode">
      <option value="eager">No proxy: new HighResImage for every tile</option>
      <option value="lazy" selected>Virtual proxy (LazyImageProxy)</option>
      <option value="prot">Protection proxy + virtual proxy</option>
    </select>
    user <select id="user"><option value="ben">ben (guest)</option><option value="ana">ana (admin)</option></select>
    <button id="build">Rebuild gallery</button>
  </div>
  <div class="grid" id="grid"></div>
  <div class="meters">
    <span>disk loads: <b id="mLoads">0</b></span>
    <span>MB loaded: <b id="mMb">0</b></span>
    <span>served from loaded object: <b id="mHits">0</b></span>
    <span>denied: <b id="mDen">0</b></span>
  </div>
  <div class="log" id="log"></div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var FILES = [
  { f: 'beach.jpg', c: '#38bdf8', e: '🏖' }, { f: 'city.jpg', c: '#64748b', e: '🏙' },
  { f: 'forest.jpg', c: '#16a34a', e: '🌲' }, { f: 'desert.jpg', c: '#d97706', e: '🏜' },
  { f: 'snow.jpg', c: '#93c5fd', e: '🏔' }, { f: 'payroll.png', c: '#7c3aed', e: '📊', priv: true },
];
var imgs = [];
var m = { loads: 0, mb: 0, hits: 0, den: 0 };
var busy = false;

function log(t) {
  var d = document.createElement('div');
  d.textContent = t;
  $('log').appendChild(d);
  $('log').scrollTop = $('log').scrollHeight;
  console.log(t);
}

function meters() {
  $('mLoads').textContent = m.loads;
  $('mMb').textContent = m.mb;
  $('mHits').textContent = m.hits;
  $('mDen').textContent = m.den;
}

function load(img) {
  img.loaded = true;
  m.loads++;
  m.mb += 8;
  log('  [disk] loading ' + img.f + ' (8 MB)...');
}

function paint() {
  var g = $('grid');
  g.innerHTML = '';
  imgs.forEach(function (img, i) {
    var t = document.createElement('div');
    t.className = 'tile' + (img.loaded ? ' loaded' : '');
    t.id = 't' + i;
    var th = document.createElement('div');
    th.className = 'thumb';
    th.textContent = img.loaded ? img.e : (img.priv ? '🔒' : '?');
    if (img.loaded) th.style.background = img.c;
    var fn = document.createElement('div');
    fn.className = 'fn';
    fn.textContent = (img.priv ? '🔒 ' : '') + img.f;
    var st = document.createElement('div');
    st.className = 'st';
    st.textContent = img.loaded ? 'HighResImage loaded' : (mode() === 'eager' ? '' : 'proxy only');
    t.append(th, fn, st);
    t.onclick = function () { display(i); };
    g.appendChild(t);
  });
  meters();
}

function mode() { return $('mode').value; }

function build() {
  m = { loads: 0, mb: 0, hits: 0, den: 0 };
  $('log').innerHTML = '';
  imgs = FILES.map(function (x) { return { f: x.f, c: x.c, e: x.e, priv: !!x.priv, loaded: false }; });
  if (mode() === 'eager') {
    imgs.forEach(load);
    log('Gallery ready: 6 HighResImage objects, ' + m.mb + ' MB loaded up front');
  } else {
    log('Gallery ready: 6 images, nothing loaded yet');
  }
  paint();
}

function flash(i, cls) {
  var t = $('t' + i);
  t.classList.add(cls);
  setTimeout(function () { t.classList.remove(cls); }, 700);
}

function display(i) {
  if (busy) return;
  var img = imgs[i];
  var user = $('user').value;
  if (mode() === 'prot' && img.priv && user !== 'ana') {
    m.den++;
    log('Access denied: ' + user + ' cannot view ' + img.f);
    meters();
    flash(i, 'denied');
    return;
  }
  if (img.loaded) {
    m.hits++;
    log('Showing ' + img.f);
    paint();
    flash(i, 'hit');
    return;
  }
  busy = true;
  $('t' + i).classList.add('loading');
  $('t' + i).querySelector('.st').textContent = 'loading 8 MB…';
  setTimeout(function () {
    load(img);
    log('Showing ' + img.f);
    busy = false;
    paint();
  }, 700);
}

$('build').onclick = build;
$('mode').onchange = build;
build();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>In <em>Virtual proxy</em> mode, nothing is loaded at first. Click <code>city.jpg</code>: one disk load. Click it again: the green flash means the already-loaded object answered and the disk wasn't touched. This matches the first lines of the C# output.</li>
              <li>Switch to <em>No proxy</em>. All six images load up front (48 MB) before you click anything.</li>
              <li>Switch to <em>Protection proxy</em> with user <code>ben</code> and click 🔒 payroll.png. Access is denied and the image is <strong>not</strong> loaded. Switch the user to <code>ana</code> and click again: it loads now.</li>
              <li>Compare the counters across modes after clicking the same three tiles.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What do a proxy and its real subject have in common?',
        options: ['Nothing, the proxy has a simpler API', 'They implement the same interface, so the client can\'t tell them apart', 'The proxy inherits from the client', 'They must live in different processes'],
        answer: 1,
        why: 'The proxy is a stand-in: same interface, so the client code doesn\'t change when you add it.',
      },
      {
        q: 'Code looks identical to a decorator: implements <code>IReportService</code>, wraps another <code>IReportService</code>. It refuses calls unless the user has the "Finance" role. Best name?',
        options: ['Adapter', 'Protection proxy', 'Facade', 'Composite'],
        answer: 1,
        why: 'Structure alone doesn\'t decide it. The <em>intent</em> is controlling access, which makes it a protection proxy. If it added extra behaviour like logging, you would call it a decorator.',
      },
      {
        q: 'Which built-in .NET type is a ready-made virtual proxy?',
        options: ['<code>Lazy&lt;T&gt;</code>', '<code>StringBuilder</code>', '<code>IEnumerable&lt;T&gt;</code>', '<code>Task&lt;T&gt;</code>'],
        answer: 0,
        why: '<code>Lazy&lt;T&gt;</code> wraps a factory and creates the value on first <code>.Value</code> access, thread-safely by default.',
      },
      {
        q: 'With EF Core lazy-loading proxies, a loop prints <code>order.Customer.Name</code> for 100 orders. What happens?',
        options: ['One SQL query', 'Up to 100 extra SQL queries (N+1), one per lazy navigation load', 'A compile error', 'Customers are always null'],
        answer: 1,
        why: 'Each first access to a lazy navigation property runs a query. The proxy hides the cost, which is the classic N+1 problem. Use <code>Include</code> to load related data up front instead.',
      },
      {
        q: 'In the C# example, why is <code>ProtectedImageProxy</code> placed <em>outside</em> the lazy proxy?',
        options: ['It doesn\'t matter', 'So denied users never trigger the expensive load', 'Because C# requires it', 'So the image loads twice'],
        answer: 1,
        why: 'The outer proxy runs first. Checking permission before the lazy proxy means a denied call returns early and nothing is loaded.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>The report list creates every <code>ExpensiveReport</code> up front, and each one takes seconds to build. Write a <strong>virtual proxy</strong> <code>LazyReportProxy</code> that implements <code>IReport</code> and only creates the <code>ExpensiveReport</code> the first time <code>Render()</code> is called (use <code>??=</code> or <code>Lazy&lt;ExpensiveReport&gt;</code>). Make the list hold proxies. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'class LazyReportProxy(string name) : IReport { private ExpensiveReport? real; public string Render() => (real ??= new ExpensiveReport(name)).Render(); }',
      starter: `List<IReport> reports =
[
  new ExpensiveReport("Sales"),
  new ExpensiveReport("Stock"),
  new ExpensiveReport("Payroll"),
];
Console.WriteLine("list ready");
Console.WriteLine(reports[0].Render());

public interface IReport
{
  string Render();
}

public class ExpensiveReport : IReport
{
  private readonly string name;

  public ExpensiveReport(string name)
  {
    this.name = name;
    Console.WriteLine($"building {name} report (slow)...");
  }

  public string Render() => $"[{name} report]";
}

// TODO: add LazyReportProxy : IReport`,
      solution: `List<IReport> reports =
[
  new LazyReportProxy("Sales"),
  new LazyReportProxy("Stock"),
  new LazyReportProxy("Payroll"),
];
Console.WriteLine("list ready");
Console.WriteLine(reports[0].Render());
Console.WriteLine(reports[0].Render());

public interface IReport
{
  string Render();
}

public class ExpensiveReport : IReport
{
  private readonly string name;

  public ExpensiveReport(string name)
  {
    this.name = name;
    Console.WriteLine($"building {name} report (slow)...");
  }

  public string Render() => $"[{name} report]";
}

public class LazyReportProxy(string name) : IReport
{
  private ExpensiveReport? real;

  public string Render()
  {
    real ??= new ExpensiveReport(name);
    return real.Render();
  }
}`,
      checks: [
        { label: 'LazyReportProxy implements IReport', re: /class\s+LazyReportProxy\b[^{]*:\s*IReport\b/ },
        { label: 'Proxy holds a nullable ExpensiveReport or a Lazy<ExpensiveReport>', re: /ExpensiveReport\?\s+\w+|Lazy\s*<\s*ExpensiveReport\s*>/ },
        { label: 'Creates the real report lazily (??= new or new Lazy<...>)', re: /\?\?=\s*new\s+ExpensiveReport|new\s+Lazy\s*<\s*ExpensiveReport\s*>|new\s*\(\s*\(\s*\)\s*=>\s*new\s+ExpensiveReport/ },
        { label: 'The list is built from proxies', re: /new\s+LazyReportProxy\s*\(/ },
        { label: 'The list no longer creates ExpensiveReport eagerly', re: /^\s*new\s+ExpensiveReport\s*\(\s*""\s*\)\s*,?\s*$/m, absent: true },
      ],
    }),
  },

  // ───────────────────────────── COMPOSITE ─────────────────────────────
  {
    id: 'composite',
    section: 'Structural patterns',
    title: 'Composite',
    explain: `
      <p><strong>Intent:</strong> build tree structures where a single item (leaf) and a group of items (composite) share one interface, so clients can treat them the same way.</p>
      <h3>The problem</h3>
      <p>A file explorer needs folder sizes. A folder contains files <em>and</em> other folders, to any depth. Without a shared type the code is full of type checks and separate lists:</p>
      <pre><code>// ❌ before
long Size(Folder f)
{
  long total = 0;
  foreach (var file in f.Files) total += file.Bytes;
  foreach (var sub in f.SubFolders) total += Size(sub);   // the client handles recursion
  return total;
}
// …and every other feature (search, print, count) repeats the same two loops</code></pre>
      <h3>The solution</h3>
      <p>Define one abstraction, <code>Node</code>, with the operations you need (<code>Size()</code>, <code>Print()</code>). A <code>FileItem</code> (leaf) answers directly. A <code>Folder</code> (composite) holds a <code>List&lt;Node&gt;</code> and answers by <strong>asking each child the same question</strong> and combining the answers. Children may be files or folders, and the folder doesn't care which. Recursion falls out naturally.</p>
      <pre><code class="language-none">            Node  (Name, Size(), Print())
           ╱    ╲
   FileItem      Folder ◆──── children: List&lt;Node&gt;
   (leaf)        (composite: Size() = Σ child.Size())</code></pre>
      <h3>Where you've seen it</h3>
      <ul>
        <li>UI trees: WPF/WinForms <code>Control.Controls</code>, the HTML DOM, Blazor/React component trees. A panel lays out its children, and so does a panel inside a panel.</li>
        <li>Org charts (a manager's cost = own salary + team), menus with sub-menus, bill-of-materials, pricing bundles.</li>
        <li>.NET: <code>System.Linq.Expressions.Expression</code> trees (<code>BinaryExpression</code> has <code>Left</code>/<code>Right</code> expressions); <code>IConfiguration</code> sections containing sections; <code>XElement</code> containing elements.</li>
      </ul>
      <h3>When to use / when not</h3>
      <ul>
        <li>✅ The data is naturally a part-whole hierarchy and clients want to ignore the difference between one item and a group.</li>
        <li>❌ Flat collections: a <code>List&lt;T&gt;</code> is enough.</li>
        <li>❌ When leaves and groups need very different operations, forcing one interface leads to methods like <code>Add()</code> on a file that just throw. Keep child-management methods on <code>Folder</code> only, as the example does.</li>
      </ul>
      <div class="warn">Recursion depth equals tree depth. Very deep trees (100k levels) can overflow the stack. Real trees are shallow, but if you build trees from user input, guard against cycles: a folder that contains itself recurses forever.</div>
    `,
    examples: [
      {
        title: 'C#: file system sizes with a recursion trace',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var root = new Folder("root",
  new FileItem("readme.md", 4),
  new Folder("src",
    new FileItem("app.cs", 20),
    new FileItem("util.cs", 8)),
  new Folder("assets",
    new FileItem("logo.png", 120),
    new Folder("empty")));

Console.WriteLine("== Tree ==");
root.Print();

Console.WriteLine("== root.Size() trace ==");
var total = root.Size();
Console.WriteLine($"Total: {total} KB");

Console.WriteLine("== Same call on a leaf or a composite ==");
Node[] things = [new FileItem("notes.txt", 3), new Folder("docs", new FileItem("a.md", 1))];
foreach (var node in things)
  Console.WriteLine($"{node.Name}: {node.Size()} KB");

// Component: what leaves and composites have in common
public abstract class Node(string name)
{
  public string Name { get; } = name;
  public abstract long Size(int depth = 0);
  public abstract void Print(int depth = 0);
  protected static string Pad(int depth) => new(' ', depth * 2);
}

// Leaf: answers directly
public class FileItem(string name, long sizeKb) : Node(name)
{
  public override long Size(int depth = 0)
  {
    Console.WriteLine($"{Pad(depth)}{Name} = {sizeKb}");
    return sizeKb;
  }

  public override void Print(int depth = 0) =>
    Console.WriteLine($"{Pad(depth)}{Name} ({sizeKb} KB)");
}

// Composite: asks every child the same question and combines the answers
public class Folder(string name, params Node[] children) : Node(name)
{
  private readonly List<Node> children = [.. children];

  public void Add(Node child) => children.Add(child);

  public override long Size(int depth = 0)
  {
    Console.WriteLine($"{Pad(depth)}Size({Name}/)");     // ① enter
    long total = 0;
    foreach (var child in children)
      total += child.Size(depth + 1);                    // ② recurse: file OR folder
    Console.WriteLine($"{Pad(depth)}{Name}/ = {total}"); // ③ return the roll-up
    return total;
  }

  public override void Print(int depth = 0)
  {
    Console.WriteLine($"{Pad(depth)}{Name}/");
    foreach (var child in children)
      child.Print(depth + 1);
  }
}`,
        output: `== Tree ==
root/
  readme.md (4 KB)
  src/
    app.cs (20 KB)
    util.cs (8 KB)
  assets/
    logo.png (120 KB)
    empty/
== root.Size() trace ==
Size(root/)
  readme.md = 4
  Size(src/)
    app.cs = 20
    util.cs = 8
  src/ = 28
  Size(assets/)
    logo.png = 120
    Size(empty/)
    empty/ = 0
  assets/ = 120
root/ = 152
Total: 152 KB
== Same call on a leaf or a composite ==
notes.txt = 3
notes.txt: 3 KB
Size(docs/)
  a.md = 1
docs/ = 1
docs: 1 KB`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>public override long Size(int depth = 0)
{
  Console.WriteLine($"{Pad(depth)}Size({Name}/)");     // ① enter
  long total = 0;
  foreach (var child in children)
    total += child.Size(depth + 1);                    // ② recurse
  Console.WriteLine($"{Pad(depth)}{Name}/ = {total}"); // ③ roll-up
  return total;
}</code></pre>
            <ol>
              <li><strong>①</strong> Each folder prints when its call starts. <code>depth</code> only controls indentation, so the trace shows the call stack visually.</li>
              <li><strong>②</strong> <code>child</code> is typed as <code>Node</code>. If it's a <code>FileItem</code>, the leaf version runs and returns at once. If it's a <code>Folder</code>, the same method runs again one level deeper. The folder never checks the type, because virtual dispatch picks the right method.</li>
              <li><strong>③</strong> A folder can only print its total once <em>all</em> its children have returned. That's why totals appear <em>after</em> their children in the trace: answers bubble up from the leaves.</li>
            </ol>
          </details>
          <details>
            <summary>Step by step: the call stack for <code>root.Size()</code></summary>
            <table>
              <tr><th>#</th><th>Call stack (top = running)</th><th>Event</th><th>Console line</th></tr>
              <tr><td>1</td><td>root</td><td>enter root</td><td><code>Size(root/)</code></td></tr>
              <tr><td>2</td><td>root → readme.md</td><td>leaf returns 4</td><td><code>&nbsp;&nbsp;readme.md = 4</code></td></tr>
              <tr><td>3</td><td>root → src</td><td>enter src (root waits, total so far 4)</td><td><code>&nbsp;&nbsp;Size(src/)</code></td></tr>
              <tr><td>4</td><td>root → src → app.cs</td><td>leaf returns 20</td><td><code>&nbsp;&nbsp;&nbsp;&nbsp;app.cs = 20</code></td></tr>
              <tr><td>5</td><td>root → src → util.cs</td><td>leaf returns 8</td><td><code>&nbsp;&nbsp;&nbsp;&nbsp;util.cs = 8</code></td></tr>
              <tr><td>6</td><td>root → src</td><td>src returns 20 + 8</td><td><code>&nbsp;&nbsp;src/ = 28</code></td></tr>
              <tr><td>7</td><td>root → assets</td><td>enter assets (root total 4 + 28 = 32)</td><td><code>&nbsp;&nbsp;Size(assets/)</code></td></tr>
              <tr><td>8</td><td>root → assets → logo.png</td><td>leaf returns 120</td><td><code>&nbsp;&nbsp;&nbsp;&nbsp;logo.png = 120</code></td></tr>
              <tr><td>9</td><td>root → assets → empty</td><td>enter empty, no children, returns 0</td><td><code>Size(empty/)</code>, <code>empty/ = 0</code></td></tr>
              <tr><td>10</td><td>root → assets</td><td>assets returns 120 + 0</td><td><code>&nbsp;&nbsp;assets/ = 120</code></td></tr>
              <tr><td>11</td><td>root</td><td>root returns 4 + 28 + 120</td><td><code>root/ = 152</code></td></tr>
            </table>
            <p>The deepest the stack gets is 3 frames (root → assets → empty), which equals the depth of the tree. The empty folder is the <strong>base case</strong> for folders: the loop runs zero times and returns 0.</p>
          </details>
          <details>
            <summary>Uniform treatment: the last block of output</summary>
            <p><code>Node[] things</code> mixes a file and a folder. The loop calls <code>node.Size()</code> without knowing which one it has. The file answers in one line, and the folder recurses. This is the client-side payoff of Composite: <strong>no <code>if (node is Folder)</code> anywhere</strong>.</p>
            <p>Note the order: <code>notes.txt = 3</code> appears before <code>notes.txt: 3 KB</code> because the interpolated string calls <code>Size()</code> (which prints its trace) before <code>WriteLine</code> prints the result.</p>
            <div class="tip"><code>Add()</code> lives only on <code>Folder</code>. Putting it on <code>Node</code> would make <code>FileItem.Add</code> throw at runtime. This "safe" version of Composite trades a bit of uniformity for type safety.</div>
          </details>
        `,
      },
      {
        title: 'Widget: build a tree and watch sizes roll up',
        lang: 'html',
        code: `<style>
.cp { font-size: 14px; }
.cp .hint { color: #555; margin: 0 0 8px; }
.cp .ctl { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-bottom: 8px; }
.cp .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.cp .tree { border: 1px solid #dde3ee; border-radius: 8px; padding: 6px; height: 250px; overflow: auto; }
.cp .row { display: flex; align-items: center; gap: 6px; padding: 2px 6px; border-radius: 6px; cursor: pointer;
  font: 13px ui-monospace, Menlo, monospace; transition: background .15s; }
.cp .row:hover { background: #f4f6fa; }
.cp .row.sel { outline: 2px solid #93c5fd; }
.cp .row.active { background: #dbeafe; }
.cp .row.done { background: #ecfdf3; }
.cp .size { margin-left: auto; font-size: 12px; color: #555; background: #f1f3f8; border-radius: 10px; padding: 0 8px; }
.cp .size.fresh { background: #16a34a; color: #fff; }
.cp .side { display: grid; gap: 6px; grid-template-rows: auto 1fr; }
.cp .stack { border: 1px solid #dde3ee; border-radius: 8px; padding: 6px; min-height: 58px; font: 12px ui-monospace, Menlo, monospace; }
.cp .frame { background: #eaf2ff; border: 1px solid #93c5fd; border-radius: 4px; padding: 1px 6px; margin: 2px 0; }
.cp .log { font: 12px/1.4 ui-monospace, Menlo, monospace; background: #f6f8fb; border: 1px solid #dde3ee;
  border-radius: 8px; height: 168px; overflow: auto; padding: 6px 8px; white-space: pre; }
.cp .lbl { font-size: 12px; color: #666; }
</style>
<div class="cp">
  <p class="hint">Click a folder to select it, add files/folders, then click <b>▶ root.Size()</b> to animate the recursive calls.</p>
  <div class="ctl">
    <button id="addFolder">+ Folder</button>
    name <input id="nm" value="docs" style="width:80px">
    <button id="addFile">+ File</button>
    size <input id="kb" type="number" value="10" min="0" style="width:60px"> KB
    <button id="del">Delete</button>
    <button id="run">▶ root.Size()</button>
    speed <input id="speed" type="range" min="150" max="900" value="450" style="width:80px">
  </div>
  <div class="cols">
    <div class="tree" id="tree"></div>
    <div class="side">
      <div><div class="lbl">call stack (top = running)</div><div class="stack" id="stack"></div></div>
      <div><div class="lbl">console (same format as the C# trace)</div><div class="log" id="log"></div></div>
    </div>
  </div>
</div>
<script>
var $ = function (id) { return document.getElementById(id); };
var nextId = 1;
function folder(name, kids) { return { id: nextId++, name: name, kids: kids || [], size: null }; }
function file(name, kb) { return { id: nextId++, name: name, kb: kb }; }
var root = folder('root', [
  file('readme.md', 4),
  folder('src', [file('app.cs', 20), file('util.cs', 8)]),
  folder('assets', [file('logo.png', 120), folder('empty')]),
]);
var selected = root;
var busy = false;

function isFolder(n) { return !!n.kids; }

function find(n, id, parent) {
  if (n.id === id) return { node: n, parent: parent };
  if (!isFolder(n)) return null;
  for (var i = 0; i < n.kids.length; i++) {
    var r = find(n.kids[i], id, n);
    if (r) return r;
  }
  return null;
}

function staleUp(n) {
  // sizes of all folders become unknown after an edit
  if (isFolder(n)) { n.size = null; n.kids.forEach(staleUp); }
}

function render() {
  var t = $('tree');
  t.innerHTML = '';
  (function walk(n, depth) {
    var r = document.createElement('div');
    r.className = 'row' + (n === selected ? ' sel' : '');
    r.id = 'r' + n.id;
    r.style.paddingLeft = (6 + depth * 18) + 'px';
    var label = document.createElement('span');
    label.textContent = (isFolder(n) ? '📁 ' + n.name + '/' : '📄 ' + n.name);
    var sz = document.createElement('span');
    sz.className = 'size';
    sz.id = 'z' + n.id;
    sz.textContent = isFolder(n) ? (n.size == null ? '? KB' : n.size + ' KB') : n.kb + ' KB';
    r.append(label, sz);
    r.onclick = function () {
      if (busy) return;
      selected = n;
      render();
    };
    t.appendChild(r);
    if (isFolder(n)) n.kids.forEach(function (k) { walk(k, depth + 1); });
  })(root, 0);
}

function targetFolder() {
  if (isFolder(selected)) return selected;
  var f = find(root, selected.id, null);
  return f && f.parent ? f.parent : root;
}

$('addFolder').onclick = function () {
  if (busy) return;
  var f = targetFolder();
  var n = folder($('nm').value || 'folder');
  f.kids.push(n);
  staleUp(root);
  selected = n;
  render();
};
$('addFile').onclick = function () {
  if (busy) return;
  var f = targetFolder();
  var nm = $('nm').value || 'file';
  if (nm.indexOf('.') < 0) nm = nm + '.txt';
  f.kids.push(file(nm, Math.max(0, Number($('kb').value) || 0)));
  staleUp(root);
  render();
};
$('del').onclick = function () {
  if (busy || selected === root) return;
  var f = find(root, selected.id, null);
  f.parent.kids.splice(f.parent.kids.indexOf(selected), 1);
  selected = f.parent;
  staleUp(root);
  render();
};

function pad(d) { var s = ''; for (var i = 0; i < d; i++) s += '  '; return s; }

$('run').onclick = function () {
  if (busy) return;
  staleUp(root);
  render();
  $('log').innerHTML = '';
  var ev = [];
  var stack = [];
  // Simulate Folder.Size / FileItem.Size exactly like the C# program
  (function size(n, depth) {
    stack.push(n);
    if (!isFolder(n)) {
      ev.push({ n: n, stack: stack.slice(), line: pad(depth) + n.name + ' = ' + n.kb, kind: 'leaf' });
      stack.pop();
      return n.kb;
    }
    ev.push({ n: n, stack: stack.slice(), line: pad(depth) + 'Size(' + n.name + '/)', kind: 'enter' });
    var total = 0;
    n.kids.forEach(function (k) { total += size(k, depth + 1); });
    ev.push({ n: n, stack: stack.slice(), line: pad(depth) + n.name + '/ = ' + total, kind: 'exit', total: total });
    stack.pop();
    return total;
  })(root, 0);

  busy = true;
  var i = 0;
  function step() {
    document.querySelectorAll('.cp .row.active').forEach(function (x) { x.classList.remove('active'); });
    if (i >= ev.length) {
      $('stack').innerHTML = '<span class="lbl">(empty: root.Size() returned ' + root.size + ')</span>';
      var d = document.createElement('div');
      d.textContent = 'Total: ' + root.size + ' KB';
      $('log').appendChild(d);
      console.log('Total: ' + root.size + ' KB');
      busy = false;
      return;
    }
    var e = ev[i++];
    $('stack').innerHTML = '';
    e.stack.slice().reverse().forEach(function (fr, k) {
      var f = document.createElement('div');
      f.className = 'frame';
      f.textContent = (k === 0 ? '▶ ' : '  ') + (isFolder(fr) ? 'Size(' + fr.name + '/)' : fr.name + '.Size()');
      $('stack').appendChild(f);
    });
    var row = $('r' + e.n.id);
    row.classList.add('active');
    if (e.kind === 'exit') {
      e.n.size = e.total;
      var z = $('z' + e.n.id);
      z.textContent = e.total + ' KB';
      z.classList.add('fresh');
      row.classList.add('done');
    }
    if (e.kind === 'leaf') row.classList.add('done');
    var d = document.createElement('div');
    d.textContent = e.line;
    $('log').appendChild(d);
    $('log').scrollTop = $('log').scrollHeight;
    console.log(e.line);
    setTimeout(step, Number($('speed').max) + 150 - Number($('speed').value));
  }
  step();
};

render();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ol>
              <li>Click <b>▶ root.Size()</b> on the starting tree. The console reproduces the C# trace line for line, and the call-stack panel shows how deep the recursion is at each moment.</li>
              <li>Watch the size badges: a folder's badge only turns green after <em>all</em> its children are done. Totals bubble up.</li>
              <li>Select <code>empty/</code>, add a 50 KB file, and run again. <code>empty/</code>, <code>assets/</code> and <code>root/</code> all change. Nothing else needed updating, because each folder simply asks its children.</li>
              <li>Add a folder inside a folder inside a folder and run. The stack panel grows one frame per level.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What is the key idea of the Composite pattern?',
        options: ['Leaves and groups share one interface, so clients treat them the same', 'Every object is created by a factory', 'Objects notify each other of changes', 'A wrapper adds behaviour'],
        answer: 0,
        why: 'Composite lets a client call <code>Size()</code> (or Render, Price…) on anything in the tree without checking whether it\'s a single item or a group.',
      },
      {
        q: 'In <code>Folder.Size()</code>, what is the "base case" that stops recursion?',
        options: ['There is none, so it recurses forever', 'Leaves (files) return directly, and empty folders loop zero times', 'A depth limit of 10', 'The garbage collector'],
        answer: 1,
        why: 'Recursion ends at leaves, which answer without calling further, and at empty composites, whose loop doesn\'t run.',
      },
      {
        q: 'Which is a composite in the .NET world?',
        options: ['A WinForms <code>Panel</code> containing other controls (including panels)', '<code>Lazy&lt;T&gt;</code>', '<code>GZipStream</code>', '<code>Random</code>'],
        answer: 0,
        why: 'UI controls form a tree: a panel is a control that holds controls. Layout and painting recurse through it.',
      },
      {
        q: 'Where should <code>Add(Node child)</code> live in the "safe" Composite design?',
        options: ['On <code>Node</code>, so files throw NotSupportedException', 'Only on <code>Folder</code> (the composite)', 'On a static helper', 'On <code>FileItem</code>'],
        answer: 1,
        why: 'Putting child management only on the composite means the compiler stops you from adding children to a file. The trade-off is that clients need a <code>Folder</code> reference to add things.',
      },
      {
        q: 'In the trace, why does <code>src/ = 28</code> print <em>after</em> <code>app.cs = 20</code> and <code>util.cs = 8</code>?',
        options: ['Console output is buffered randomly', 'A folder can only report its total after all child calls have returned', 'Files are always printed first by Print()', 'Because of alphabetical sorting'],
        answer: 1,
        why: 'The total is computed by summing child results, so the folder\'s "exit" line runs only after the loop finishes. Results flow from the leaves up to the root.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>The org chart code keeps two separate lists (<code>Members</code> and <code>SubTeams</code>) and two loops. Refactor to Composite: an abstract class (or interface) <code>OrgUnit</code> with <code>decimal Cost()</code>; <code>Employee</code> is a leaf returning its salary; <code>Team</code> holds a <code>List&lt;OrgUnit&gt;</code> and sums its children's <code>Cost()</code>. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'abstract class OrgUnit { public abstract decimal Cost(); }  class Team(string name, params OrgUnit[] units) : OrgUnit { ... units.Sum(u => u.Cost()) }',
      starter: `var dev = new Team("Dev");
dev.Members.Add(new Employee("Ana", 5000));
dev.Members.Add(new Employee("Ben", 4000));
var company = new Team("Company");
company.Members.Add(new Employee("CEO", 9000));
company.SubTeams.Add(dev);
Console.WriteLine($"Total cost: {company.Cost()}");

public class Employee(string name, decimal salary)
{
  public string Name => name;
  public decimal Salary => salary;
}

// TODO: one list of OrgUnit instead of two lists
public class Team(string name)
{
  public List<Employee> Members { get; } = [];
  public List<Team> SubTeams { get; } = [];

  public decimal Cost()
  {
    decimal total = 0;
    foreach (var m in Members) total += m.Salary;
    foreach (var t in SubTeams) total += t.Cost();
    return total;
  }
}`,
      solution: `var dev = new Team("Dev", new Employee("Ana", 5000), new Employee("Ben", 4000));
var company = new Team("Company", new Employee("CEO", 9000), dev);
Console.WriteLine($"Total cost: {company.Cost()}");

public abstract class OrgUnit(string name)
{
  public string Name => name;
  public abstract decimal Cost();
}

public class Employee(string name, decimal salary) : OrgUnit(name)
{
  public override decimal Cost() => salary;
}

public class Team(string name, params OrgUnit[] units) : OrgUnit(name)
{
  private readonly List<OrgUnit> units = [.. units];

  public void Add(OrgUnit unit) => units.Add(unit);

  public override decimal Cost() => units.Sum(u => u.Cost());
}`,
      checks: [
        { label: 'Declares OrgUnit as abstract class or interface', re: /(abstract\s+class|interface)\s+I?OrgUnit\b/ },
        { label: 'Employee is an OrgUnit', re: /class\s+Employee\b[^{]*:\s*I?OrgUnit\b/ },
        { label: 'Team is an OrgUnit', re: /class\s+Team\b[^{]*:\s*I?OrgUnit\b/ },
        { label: 'Team keeps a List<OrgUnit> of children', re: /List\s*<\s*I?OrgUnit\s*>/ },
        { label: 'Sums children recursively via Cost()', re: /\.Sum\s*\(\s*\w+\s*=>\s*\w+\.Cost\s*\(\s*\)\s*\)|\+=\s*\w+\.Cost\s*\(\s*\)/ },
        { label: 'No separate List<Team> / List<Employee> anymore', re: /List\s*<\s*(Team|Employee)\s*>/, absent: true },
      ],
    }),
  },
);
