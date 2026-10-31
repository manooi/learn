window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── STATE ─────────────────────────────────────────────
  {
    id: 'state',
    section: 'Behavioral patterns II',
    title: 'State',
    explain: `
      <p><strong>Intent:</strong> let an object change its behaviour when its internal state changes, by delegating
      to a separate <em>state object</em> per state. It looks as if the object changed its class.</p>

      <h3>The problem</h3>
      <p>An order goes <code>New → Paid → Shipped → Delivered</code>, and can be <code>Cancelled</code> while New or
      Paid. Every action has to check the current status, so the same <code>switch</code> is repeated in every
      method:</p>
      <pre><code>// ❌ Before: one switch per action, rules scattered across methods
public void Ship()
{
  switch (_status)
  {
    case "Paid": _status = "Shipped"; break;
    case "New": throw new InvalidOperationException("not paid yet");
    case "Shipped": case "Delivered": case "Cancelled":
      throw new InvalidOperationException($"cannot ship when {_status}");
  }
}
public void Cancel() { switch (_status) { /* …again… */ } }
public bool CanEditAddress =&gt; _status is "New" or "Paid";   // …and again</code></pre>
      <p>Adding a state ("OnHold") means editing every switch, and it's easy to forget one: an invalid transition
      slips through.</p>

      <h3>The solution</h3>
      <p>Make one class per state. Each state class implements the actions <em>it</em> allows and returns the next
      state; everything else is rejected by a default in the base class. The <em>context</em> (<code>Order</code>)
      just holds the current state object and forwards calls to it.</p>
      <pre><code>Order (context) ── _state ──▶ «abstract» OrderState
  Pay()  =&gt; Apply(_state.Pay())        Pay() / Ship() / Deliver() / Cancel()  → default: null (invalid)
  Ship() =&gt; Apply(_state.Ship())       CanEditAddress                        → default: false
                         ▲
     NewState   PaidState   ShippedState   DeliveredState   CancelledState
     Pay,Cancel Ship,Cancel  Deliver        (nothing)        (nothing)</code></pre>

      <h3>State vs Strategy</h3>
      <p>The class diagrams are nearly identical (context holds an interface). The difference is <em>who swaps the
      object and why</em>:</p>
      <ul>
        <li><strong>Strategy</strong>: the <em>client</em> picks an algorithm; strategies don't know each other.</li>
        <li><strong>State</strong>: the <em>states themselves</em> decide the next state as the object lives
        (<code>NewState.Pay()</code> returns a <code>PaidState</code>). States know their successors.</li>
      </ul>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Many states, many actions, and behaviour that really differs per state (workflows, protocols,
        game characters, UI wizards, connection lifecycles).</li>
        <li>❌ Two or three states with almost no behaviour — an <code>enum</code> plus a small transition table
        (<code>Dictionary&lt;(State, Action), State&gt;</code>) or a switch expression is simpler.</li>
      </ul>
      <h3>In .NET</h3>
      <p><code>async</code>/<code>await</code> methods and <code>yield return</code> iterators compile into state
      machines (an <code>int _state</code> field and a switch inside <code>MoveNext</code>).
      <code>HttpClient</code> connections, <code>Task</code> status and <code>CommunicationState</code> in WCF are
      also state machines. For domain workflows, libraries like Stateless use transition tables.</p>
    `,
    examples: [
      {
        title: 'C#: an order lifecycle with state classes',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `var order = new Order("A-42");
Console.WriteLine($"Order {order.Id}: {order.Status}");
order.Pay();
order.Ship();
order.Cancel();
order.Deliver();
order.Pay();
Console.WriteLine($"  can edit address? {order.CanEditAddress}");

var other = new Order("B-7");
Console.WriteLine($"Order {other.Id}: {other.Status}");
Console.WriteLine($"  can edit address? {other.CanEditAddress}");
other.Cancel();
other.Ship();

// The context: no switch anywhere. It forwards to the current state object.
class Order(string id)
{
  private OrderState _state = new NewState();

  public string Id => id;
  public string Status => _state.Name;
  public bool CanEditAddress => _state.CanEditAddress;

  public void Pay() => Apply("Pay", _state.Pay());
  public void Ship() => Apply("Ship", _state.Ship());
  public void Deliver() => Apply("Deliver", _state.Deliver());
  public void Cancel() => Apply("Cancel", _state.Cancel());

  private void Apply(string action, OrderState? next)
  {
    if (next is null)
    {
      Console.WriteLine($"  {action,-8} rejected: order is {_state.Name}");
      return;
    }
    Console.WriteLine($"  {action,-8} {_state.Name} -> {next.Name}");
    _state = next;
  }
}

abstract class OrderState
{
  public abstract string Name { get; }
  public virtual bool CanEditAddress => false;

  // Default: every action is invalid. Each state overrides only what it allows.
  public virtual OrderState? Pay() => null;
  public virtual OrderState? Ship() => null;
  public virtual OrderState? Deliver() => null;
  public virtual OrderState? Cancel() => null;
}

sealed class NewState : OrderState
{
  public override string Name => "New";
  public override bool CanEditAddress => true;
  public override OrderState Pay() => new PaidState();
  public override OrderState Cancel() => new CancelledState();
}

sealed class PaidState : OrderState
{
  public override string Name => "Paid";
  public override bool CanEditAddress => true;
  public override OrderState Ship() => new ShippedState();
  public override OrderState Cancel() => new CancelledState();   // would also refund
}

sealed class ShippedState : OrderState
{
  public override string Name => "Shipped";
  public override OrderState Deliver() => new DeliveredState();
}

sealed class DeliveredState : OrderState
{
  public override string Name => "Delivered";
}

sealed class CancelledState : OrderState
{
  public override string Name => "Cancelled";
}`,
        output: `Order A-42: New
  Pay      New -> Paid
  Ship     Paid -> Shipped
  Cancel   rejected: order is Shipped
  Deliver  Shipped -> Delivered
  Pay      rejected: order is Delivered
  can edit address? False
Order B-7: New
  can edit address? True
  Cancel   New -> Cancelled
  Ship     rejected: order is Cancelled`,
        explain: `
          <details>
            <summary>The transition table the classes encode</summary>
            <p>Each row is a state class; each cell is what that class's method returns. "✗" means the method was
            not overridden, so the base class default (<code>null</code> = invalid) applies.</p>
            <table>
              <tr><th>State \\ action</th><th>Pay</th><th>Ship</th><th>Deliver</th><th>Cancel</th><th>CanEditAddress</th></tr>
              <tr><td><strong>New</strong></td><td>→ Paid</td><td>✗</td><td>✗</td><td>→ Cancelled</td><td>true</td></tr>
              <tr><td><strong>Paid</strong></td><td>✗</td><td>→ Shipped</td><td>✗</td><td>→ Cancelled</td><td>true</td></tr>
              <tr><td><strong>Shipped</strong></td><td>✗</td><td>✗</td><td>→ Delivered</td><td>✗</td><td>false</td></tr>
              <tr><td><strong>Delivered</strong></td><td>✗</td><td>✗</td><td>✗</td><td>✗</td><td>false</td></tr>
              <tr><td><strong>Cancelled</strong></td><td>✗</td><td>✗</td><td>✗</td><td>✗</td><td>false</td></tr>
            </table>
            <p>With the switch version this table was smeared across five methods. Here each row lives in one small
            class, and "invalid unless allowed" is the default — you can't forget a case.</p>
          </details>
          <details>
            <summary>Step by step: order A-42</summary>
            <table>
              <tr><th>Call</th><th><code>_state</code> before</th><th>Method returns</th><th><code>_state</code> after</th><th>Console</th></tr>
              <tr><td><code>Pay()</code></td><td>NewState</td><td>new PaidState()</td><td>PaidState</td><td><code>Pay      New -&gt; Paid</code></td></tr>
              <tr><td><code>Ship()</code></td><td>PaidState</td><td>new ShippedState()</td><td>ShippedState</td><td><code>Ship     Paid -&gt; Shipped</code></td></tr>
              <tr><td><code>Cancel()</code></td><td>ShippedState</td><td><code>null</code> (base default)</td><td>ShippedState</td><td><code>Cancel   rejected: order is Shipped</code></td></tr>
              <tr><td><code>Deliver()</code></td><td>ShippedState</td><td>new DeliveredState()</td><td>DeliveredState</td><td><code>Deliver  Shipped -&gt; Delivered</code></td></tr>
              <tr><td><code>Pay()</code></td><td>DeliveredState</td><td><code>null</code></td><td>DeliveredState</td><td><code>Pay      rejected: order is Delivered</code></td></tr>
              <tr><td><code>CanEditAddress</code></td><td>DeliveredState</td><td><code>false</code> (base default)</td><td>—</td><td><code>can edit address? False</code></td></tr>
            </table>
            <p>Notice that <code>Order.Pay()</code> is the same line of code both times; the <em>result</em> differs
            because a different state object answers. That's "behaviour changes with state".</p>
          </details>
          <details>
            <summary>Design choices and common mistakes</summary>
            <ul>
              <li><strong>Returning the next state</strong> (as here) keeps states free of side effects on the context.
              Another common style passes the context in (<code>Pay(Order o)</code>) and lets the state call
              <code>o.SetState(...)</code>.</li>
              <li><strong>Rejecting</strong>: here invalid actions are logged. In real code you'd usually throw
              <code>InvalidOperationException</code> or return a result type so the API can answer 409 Conflict.</li>
              <li>States with no fields can be singletons (<code>static readonly NewState Instance</code>) to avoid
              allocations.</li>
            </ul>
            <div class="warn">Don't let callers set the status directly (<code>order.Status = "Shipped"</code>). Then
            the transition rules are bypassed and the state pattern protects nothing.</div>
          </details>
        `,
      },
      {
        title: 'Widget: drive the state machine',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-bottom: 6px; }
  .ctl button.act { min-width: 74px; font-weight: 600; }
  .ctl button.bad { animation: bad .6s; }
  @keyframes bad { 0%, 100% { transform: none; } 20%, 60% { transform: translateX(-4px); background: #fdecec;
    border-color: #b42318; color: #b42318; } 40%, 80% { transform: translateX(4px); background: #fdecec; } }
  .ctl button.good { background: #e6f6ea; border-color: #1a7f37; }
  svg { width: 100%; max-width: 660px; height: auto; display: block; }
  .info { font-size: 13px; margin: 4px 0; }
  .info b { color: #4f6bed; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 100px; overflow: auto; white-space: pre; }
</style>
<div class="hint">Click actions. Valid ones (green outline) move the order along an arrow; invalid ones shake red and
the order stays where it is — exactly what the state classes return.</div>
<div class="ctl">
  <button class="act" id="Pay">Pay()</button>
  <button class="act" id="Ship">Ship()</button>
  <button class="act" id="Deliver">Deliver()</button>
  <button class="act" id="Cancel">Cancel()</button>
  <button id="reset">↺ New order</button>
</div>
<svg viewBox="0 0 640 235" id="svg"></svg>
<div class="info" id="info"></div>
<div class="log" id="log"></div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var NODES = {
    New: { x: 70, y: 60 }, Paid: { x: 235, y: 60 }, Shipped: { x: 400, y: 60 },
    Delivered: { x: 565, y: 60 }, Cancelled: { x: 235, y: 190 }
  };
  var T = {
    New: { Pay: 'Paid', Cancel: 'Cancelled' },
    Paid: { Ship: 'Shipped', Cancel: 'Cancelled' },
    Shipped: { Deliver: 'Delivered' },
    Delivered: {},
    Cancelled: {}
  };
  var EDGES = [['New', 'Paid', 'Pay'], ['Paid', 'Shipped', 'Ship'], ['Shipped', 'Delivered', 'Deliver'],
    ['New', 'Cancelled', 'Cancel'], ['Paid', 'Cancelled', 'Cancel']];
  var ACTIONS = ['Pay', 'Ship', 'Deliver', 'Cancel'];
  var current = 'New';
  var hotEdge = null;
  var badNode = false;
  var n = 1;

  function log(s) {
    var l = $('log');
    l.textContent += s + String.fromCharCode(10);
    l.scrollTop = l.scrollHeight;
    console.log(s);
  }

  function clip(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var s = Math.min(dx ? 62 / Math.abs(dx) : 1e9, dy ? 24 / Math.abs(dy) : 1e9);
    return { x: a.x + dx * s, y: a.y + dy * s };
  }

  function draw() {
    var h = '<defs>' +
      '<marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#8a93a8"/></marker>' +
      '<marker id="ahh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">' +
      '<path d="M0,0 L10,5 L0,10 z" fill="#1a7f37"/></marker></defs>';
    EDGES.forEach(function (e) {
      var a = NODES[e[0]], b = NODES[e[1]];
      var p = clip(a, b), q = clip(b, a);
      var hot = hotEdge === e[0] + e[1];
      var avail = e[0] === current;
      var col = hot ? '#1a7f37' : avail ? '#4f6bed' : '#b8bfcf';
      h += '<line x1="' + p.x + '" y1="' + p.y + '" x2="' + q.x + '" y2="' + q.y + '" stroke="' + col +
        '" stroke-width="' + (hot ? 4 : avail ? 2.5 : 1.5) + '" marker-end="url(#' + (hot ? 'ahh' : 'ah') + ')"/>';
      var mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      var off = e[0] === e[1] ? 0 : (a.y === b.y ? -8 : 0);
      var ox = a.y === b.y ? 0 : (a.x === b.x ? 30 : -22);
      h += '<text x="' + (mx + ox) + '" y="' + (my + off) + '" text-anchor="middle" font-size="12" fill="' + col +
        '" font-weight="600">' + e[2] + '()</text>';
    });
    Object.keys(NODES).forEach(function (k) {
      var nd = NODES[k];
      var cur = k === current;
      var stroke = cur ? (badNode ? '#b42318' : '#4f6bed') : '#c5c9d6';
      var fill = cur ? (badNode ? '#fdecec' : '#eef1ff') : '#fff';
      h += '<rect x="' + (nd.x - 60) + '" y="' + (nd.y - 22) + '" width="120" height="44" rx="12" fill="' + fill +
        '" stroke="' + stroke + '" stroke-width="' + (cur ? 3 : 1.5) + '"/>';
      h += '<text x="' + nd.x + '" y="' + (nd.y + 5) + '" text-anchor="middle" font-size="14" font-weight="' +
        (cur ? 700 : 400) + '">' + k + 'State</text>';
    });
    $('svg').innerHTML = h;
    var allowed = Object.keys(T[current]);
    ACTIONS.forEach(function (a) { $(a).classList.toggle('good', allowed.indexOf(a) >= 0); });
    $('info').innerHTML = 'Order A-' + n + ' · <code>_state</code> = <b>' + current + 'State</b> · allowed: ' +
      (allowed.length ? allowed.join(', ') : '<i>nothing (final state)</i>') + ' · CanEditAddress = <b>' +
      (current === 'New' || current === 'Paid') + '</b>';
  }

  function act(a) {
    var next = T[current][a];
    var pad = (a + '        ').slice(0, 8);
    if (!next) {
      log('  ' + pad + ' rejected: order is ' + current);
      var b = $(a);
      b.classList.remove('bad');
      void b.offsetWidth;
      b.classList.add('bad');
      badNode = true;
      draw();
      setTimeout(function () { badNode = false; draw(); }, 600);
      return;
    }
    log('  ' + pad + ' ' + current + ' -> ' + next);
    hotEdge = current + next;
    current = next;
    draw();
    setTimeout(function () { hotEdge = null; draw(); }, 800);
  }

  ACTIONS.forEach(function (a) { $(a).onclick = function () { act(a); }; });
  $('reset').onclick = function () {
    n++;
    current = 'New';
    log('Order A-' + n + ': New');
    draw();
  };
  log('Order A-1: New');
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Replay the C# program: <strong>Pay → Ship → Cancel → Deliver → Pay</strong>. Cancel and the last Pay
              shake red; the log matches the program's output line for line.</li>
              <li>Click <strong>New order</strong>, then <strong>Cancel → Ship</strong>: the B-7 run. Cancelled is a
              final state, so nothing is allowed any more.</li>
              <li>Watch <em>CanEditAddress</em> below the diagram: it's a behaviour (not a transition) that also comes from
              the current state object.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In the State pattern, who usually decides which state comes next?',
        options: [
          'The client code, by assigning a new state',
          'The current state object (e.g. <code>NewState.Pay()</code> returns a <code>PaidState</code>)',
          'A static switch in the context',
          'The garbage collector',
        ],
        answer: 1,
        why: 'States know their successors; the context just stores what they return. That is the key difference from Strategy, where the client picks the object.',
      },
      {
        q: 'An order is <code>Shipped</code> and someone calls <code>Cancel()</code>. With the example\'s design, what happens?',
        options: [
          'It becomes Cancelled',
          '<code>ShippedState</code> doesn\'t override <code>Cancel</code>, so the base default returns <code>null</code> and the order stays Shipped',
          'A compile error',
          'It goes back to Paid',
        ],
        answer: 1,
        why: 'Invalid by default: only explicitly overridden actions are allowed. The context sees <code>null</code> and rejects.',
      },
      {
        q: 'State and Strategy have almost the same class diagram. What is the real difference?',
        options: [
          'State uses abstract classes, Strategy uses interfaces',
          'Strategy objects replace each other as the object lives; states are picked once',
          'States transition among themselves over the object\'s lifetime; a strategy is chosen by the client and strategies don\'t know each other',
          'There is no difference',
        ],
        answer: 2,
        why: 'Same structure, different intent: State models a lifecycle, Strategy models interchangeable algorithms.',
      },
      {
        q: 'Which is the best reason NOT to use State classes?',
        options: [
          'The object has 6 states and 5 actions with different behaviour per state',
          'A traffic light with 3 states and one action <code>Next()</code>, no other behaviour',
          'A document workflow with approval rules',
          'A TCP connection lifecycle',
        ],
        answer: 1,
        why: 'Tiny machines are clearer as an <code>enum</code> + switch expression or a transition dictionary. State classes pay off when per-state behaviour is rich.',
      },
      {
        q: 'Where does the C# compiler itself generate a state machine?',
        options: [
          'For every <code>record</code>',
          'For <code>async</code> methods and <code>yield return</code> iterators',
          'For <code>switch</code> expressions',
          'For generic methods',
        ],
        answer: 1,
        why: 'Both are rewritten into a class with a <code>_state</code> field and a <code>MoveNext</code> method that resumes where it left off.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>Document</code> repeats a <code>switch (_status)</code> in every method. Refactor it to the State
      pattern: an abstract <code>DocumentState</code> (or <code>IDocumentState</code>) with <code>Submit</code>,
      <code>Approve</code>, <code>Reject</code>; classes <code>DraftState</code>, <code>ReviewState</code>,
      <code>PublishedState</code>; and a <code>Document</code> that forwards to its current state. No switch on the status
      should be left. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'abstract class DocumentState { public abstract string Name { get; } public virtual DocumentState? Submit() => null; ... } class DraftState : DocumentState { public override DocumentState Submit() => new ReviewState(); }',
      starter: `var doc = new Document();
doc.Approve();
doc.Submit();
doc.Reject();
doc.Submit();
doc.Approve();

class Document
{
  private string _status = "Draft";

  public void Submit()
  {
    switch (_status)
    {
      case "Draft": Move("Review"); break;
      default: Console.WriteLine($"cannot submit when {_status}"); break;
    }
  }

  public void Approve()
  {
    switch (_status)
    {
      case "Review": Move("Published"); break;
      default: Console.WriteLine($"cannot approve when {_status}"); break;
    }
  }

  public void Reject()
  {
    switch (_status)
    {
      case "Review": Move("Draft"); break;
      default: Console.WriteLine($"cannot reject when {_status}"); break;
    }
  }

  private void Move(string next)
  {
    Console.WriteLine($"{_status} -> {next}");
    _status = next;
  }
}`,
      solution: `var doc = new Document();
doc.Approve();
doc.Submit();
doc.Reject();
doc.Submit();
doc.Approve();

class Document
{
  private DocumentState _state = new DraftState();

  public void Submit() => Apply("submit", _state.Submit());
  public void Approve() => Apply("approve", _state.Approve());
  public void Reject() => Apply("reject", _state.Reject());

  private void Apply(string action, DocumentState? next)
  {
    if (next is null)
    {
      Console.WriteLine($"cannot {action} when {_state.Name}");
      return;
    }
    Console.WriteLine($"{_state.Name} -> {next.Name}");
    _state = next;
  }
}

abstract class DocumentState
{
  public abstract string Name { get; }
  public virtual DocumentState? Submit() => null;
  public virtual DocumentState? Approve() => null;
  public virtual DocumentState? Reject() => null;
}

class DraftState : DocumentState
{
  public override string Name => "Draft";
  public override DocumentState Submit() => new ReviewState();
}

class ReviewState : DocumentState
{
  public override string Name => "Review";
  public override DocumentState Approve() => new PublishedState();
  public override DocumentState Reject() => new DraftState();
}

class PublishedState : DocumentState
{
  public override string Name => "Published";
}`,
      checks: [
        { label: 'Declares a state abstraction (abstract class …State or interface I…State)', re: /abstract\s+class\s+\w*State\b|interface\s+I\w*State\b/ },
        { label: 'Has a Draft state class', re: /class\s+Draft\w*\s*(\([^)]*\))?\s*:\s*\w+/ },
        { label: 'Has a Review state class', re: /class\s+\w*Review\w*\s*(\([^)]*\))?\s*:\s*\w+/ },
        { label: 'Has a Published state class', re: /class\s+Published\w*\s*(\([^)]*\))?\s*:\s*\w+/ },
        { label: 'No switch on the status string left', re: /switch\s*\(\s*_?status\b/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────── CHAIN OF RESPONSIBILITY ─────────────────────────────────────────────
  {
    id: 'chain-of-responsibility',
    section: 'Behavioral patterns II',
    title: 'Chain of Responsibility',
    explain: `
      <p><strong>Intent:</strong> pass a request along a chain of handlers. Each handler either handles it (and may
      stop the chain) or passes it to the next one. The sender doesn't know which handler will deal with it.</p>

      <h3>The problem</h3>
      <p>Purchase approvals: managers sign up to $1,000, directors up to $10,000, the CEO up to $100,000, anything
      bigger is rejected. The rules end up in one growing <code>if/else</code>, and every new rule (e.g. "finance
      must also check anything over $50k") means editing it:</p>
      <pre><code>// ❌ Before
if (amount &lt;= 1_000) return "Manager";
else if (amount &lt;= 10_000) return "Director";
else if (amount &lt;= 100_000) return "CEO";
else return "Rejected";</code></pre>

      <h3>The solution</h3>
      <p>Each rule becomes a handler object with a reference to the <em>next</em> handler. The client sends the
      request to the first handler; it either handles it or calls <code>next</code>.</p>
      <pre><code>abstract class Approver
{
  private Approver? _next;
  public Approver SetNext(Approver next) { _next = next; return next; }
  public virtual string Handle(decimal amount) =&gt;
    _next?.Handle(amount) ?? $"Rejected {amount}";            // pass it on
}

class Manager : Approver
{
  public override string Handle(decimal amount) =&gt;
    amount &lt;= 1_000 ? $"Manager approved {amount}" : base.Handle(amount);
}

manager.SetNext(director).SetNext(ceo);   // build the chain
manager.Handle(5_000m);                   // → "Director approved 5000"</code></pre>

      <h3>The modern form: pipelines with <code>next()</code></h3>
      <p>ASP.NET Core middleware is Chain of Responsibility where each handler gets a <code>next</code> delegate and
      can run code <strong>before and after</strong> calling it:</p>
      <pre><code>app.Use(async (context, next) =&gt;
{
  // ① on the way in (request)
  await next(context);   // ② everything after us in the pipeline runs here
  // ③ on the way out (response)
});</code></pre>
      <ul>
        <li><strong>Short-circuiting</strong> — a middleware that doesn't call <code>next</code> ends the request
        (authentication failure, cached response, rate limit, static file found).</li>
        <li><strong>Order matters</strong> — middleware runs in the order you register it. Put exception handling
        first, authentication before authorization, and never a response cache before authentication.</li>
      </ul>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Several handlers might process a request and you want to add/remove/reorder them without touching
        the sender: HTTP pipelines, validation rules, support ticket escalation, event filtering.</li>
        <li>❌ Exactly one known handler: just call it. Also beware: a request can fall off the end unhandled — always
        decide what the end of the chain does.</li>
      </ul>
      <h3>In .NET</h3>
      <ul>
        <li>ASP.NET Core middleware (<code>app.Use</code>, <code>RequestDelegate</code>).</li>
        <li><code>HttpClient</code> handlers: <code>DelegatingHandler</code> subclasses each override
        <code>SendAsync</code> and call <code>base.SendAsync</code> (the next handler) — used for logging, retries,
        auth headers (<code>AddHttpMessageHandler</code>).</li>
        <li>MediatR pipeline behaviours, gRPC interceptors, SignalR hub filters.</li>
      </ul>
    `,
    examples: [
      {
        title: 'C#: a middleware pipeline with next(), short-circuit and order',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`. (Synchronous mini version of ASP.NET Core middleware.)',
        code: `Middleware logging = (ctx, next) =>
{
  Console.WriteLine($"  Logging  -> {ctx.Path}");
  next(ctx);
  Console.WriteLine($"  Logging  <- {ctx.Status}");
};

Middleware auth = (ctx, next) =>
{
  if (ctx.User is null)
  {
    Console.WriteLine("  Auth     no user: 401, short-circuit");
    ctx.Status = 401;
    return;                          // next is never called
  }
  Console.WriteLine($"  Auth     ok ({ctx.User})");
  next(ctx);
};

Middleware gzip = (ctx, next) =>
{
  Console.WriteLine("  Gzip     -> will compress the response");
  next(ctx);
  Console.WriteLine($"  Gzip     <- compressed '{ctx.Body}'");
};

Action<HttpCtx> endpoint = ctx =>
{
  Console.WriteLine("  Endpoint 200 'orders: 3'");
  ctx.Status = 200;
  ctx.Body = "orders: 3";
};

var app = Pipeline.Build([logging, auth, gzip], endpoint);
Run(app, new HttpCtx("/orders", "ana"));
Run(app, new HttpCtx("/orders", null));

Console.WriteLine("== order matters: auth registered before logging ==");
var authFirst = Pipeline.Build([auth, logging, gzip], endpoint);
Run(authFirst, new HttpCtx("/orders", null));

void Run(Action<HttpCtx> pipeline, HttpCtx ctx)
{
  Console.WriteLine($"GET {ctx.Path} as {ctx.User ?? "anonymous"}");
  pipeline(ctx);
  Console.WriteLine($"  => {ctx.Status}");
}

delegate void Middleware(HttpCtx ctx, Action<HttpCtx> next);

class HttpCtx(string path, string? user)
{
  public string Path => path;
  public string? User => user;
  public int Status { get; set; } = 404;
  public string Body { get; set; } = "";
}

static class Pipeline
{
  // Wrap from the end: the endpoint is innermost, the first middleware is outermost.
  public static Action<HttpCtx> Build(List<Middleware> middlewares, Action<HttpCtx> endpoint)
  {
    Action<HttpCtx> next = endpoint;
    for (int i = middlewares.Count - 1; i >= 0; i--)
    {
      var current = middlewares[i];
      var inner = next;              // capture THIS step's next
      next = ctx => current(ctx, inner);
    }
    return next;
  }
}`,
        output: `GET /orders as ana
  Logging  -> /orders
  Auth     ok (ana)
  Gzip     -> will compress the response
  Endpoint 200 'orders: 3'
  Gzip     <- compressed 'orders: 3'
  Logging  <- 200
  => 200
GET /orders as anonymous
  Logging  -> /orders
  Auth     no user: 401, short-circuit
  Logging  <- 401
  => 401
== order matters: auth registered before logging ==
GET /orders as anonymous
  Auth     no user: 401, short-circuit
  => 401`,
        explain: `
          <details>
            <summary>Step by step: in and out of the pipeline (ana)</summary>
            <p>Each <code>next(ctx)</code> is an ordinary method call, so the pipeline is a <em>call stack</em>: code
            before <code>next</code> runs top-down, code after <code>next</code> runs bottom-up as the calls
            return.</p>
            <table>
              <tr><th>#</th><th>Call stack (innermost last)</th><th>Phase</th><th>Console</th></tr>
              <tr><td>1</td><td>logging</td><td>before next</td><td><code>Logging  -&gt; /orders</code></td></tr>
              <tr><td>2</td><td>logging → auth</td><td>before next</td><td><code>Auth     ok (ana)</code></td></tr>
              <tr><td>3</td><td>logging → auth → gzip</td><td>before next</td><td><code>Gzip     -&gt; will compress the response</code></td></tr>
              <tr><td>4</td><td>logging → auth → gzip → endpoint</td><td>terminal</td><td><code>Endpoint 200 'orders: 3'</code></td></tr>
              <tr><td>5</td><td>logging → auth → gzip</td><td>after next</td><td><code>Gzip     &lt;- compressed 'orders: 3'</code></td></tr>
              <tr><td>6</td><td>logging → auth</td><td>after next (nothing to do)</td><td>—</td></tr>
              <tr><td>7</td><td>logging</td><td>after next</td><td><code>Logging  &lt;- 200</code></td></tr>
            </table>
            <p>Gzip sees the response body only <em>after</em> the endpoint wrote it — that's why compression,
            timing and logging wrap <code>next</code>.</p>
          </details>
          <details>
            <summary>Short-circuit and order (the anonymous requests)</summary>
            <table>
              <tr><th>Pipeline</th><th>What runs</th><th>Console</th></tr>
              <tr><td>[logging, auth, gzip]</td><td>logging in → auth returns without <code>next</code> → logging out</td>
                <td><code>Logging  -&gt; /orders</code><br><code>Auth     no user: 401, short-circuit</code><br><code>Logging  &lt;- 401</code></td></tr>
              <tr><td>[auth, logging, gzip]</td><td>auth is outermost and stops immediately</td>
                <td><code>Auth     no user: 401, short-circuit</code> — no log line at all!</td></tr>
            </table>
            <p>Gzip and the endpoint never run for anonymous users. In the second pipeline the rejected request is not
            even logged. Same middlewares, different order, different behaviour. This is why ASP.NET Core docs
            prescribe an order (exception handler → HTTPS → static files → routing → authentication → authorization →
            endpoints).</p>
          </details>
          <details>
            <summary>Key lines explained: how <code>Build</code> chains the handlers</summary>
            <pre><code>Action&lt;HttpCtx&gt; next = endpoint;               // ① start with the innermost
for (int i = middlewares.Count - 1; i &gt;= 0; i--)  // ② walk backwards
{
  var current = middlewares[i];
  var inner = next;                               // ③ capture a copy
  next = ctx =&gt; current(ctx, inner);              // ④ wrap
}</code></pre>
            <ol>
              <li><strong>①</strong> The endpoint is the end of the chain.</li>
              <li><strong>②</strong> We wrap from the last middleware to the first, so the first registered ends up
              outermost — it runs first.</li>
              <li><strong>③</strong> Without <code>inner</code>, the lambda would capture the variable <code>next</code>
              itself, which we keep reassigning: every middleware would call the outermost one and recurse forever.</li>
              <li><strong>④</strong> ASP.NET Core does the same with <code>Func&lt;RequestDelegate, RequestDelegate&gt;</code>
              in <code>ApplicationBuilder.Build()</code>.</li>
            </ol>
            <div class="warn">In ASP.NET Core, don't write to the response after calling <code>next</code> if the
            response has already started; and don't call <code>next</code> twice.</div>
          </details>
        `,
      },
      {
        title: 'Widget: reorder the middleware and send requests',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .wrap { display: flex; gap: 12px; flex-wrap: wrap; }
  .pipe { flex: 1 1 260px; }
  .side { flex: 1 1 260px; }
  .mw { display: flex; align-items: center; gap: 6px; border: 2px solid #c5c9d6; border-radius: 8px;
    padding: 5px 8px; margin: 4px 0; background: #fff; transition: background .2s, border-color .2s; font-size: 13px; }
  .mw b { flex: 1; }
  .mw small { color: #646b80; font-size: 11px; }
  .mw button { padding: 0 6px; font-size: 12px; margin: 0; }
  .mw.in { background: #eef1ff; border-color: #4f6bed; }
  .mw.out { background: #e6f6ea; border-color: #1a7f37; }
  .mw.stop { background: #fdecec; border-color: #b42318; }
  .mw.end { background: #f4f6fa; }
  .reqs button { display: block; width: 100%; text-align: left; margin: 3px 0; font-size: 13px; }
  .res { font-weight: 700; margin: 6px 0; min-height: 20px; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 125px; overflow: auto; white-space: pre; margin-top: 6px; }
  .cache { font-size: 12px; color: #646b80; }
</style>
<div class="hint">Use ↑ ↓ to reorder the middleware (top = registered first = runs first), then send a request.
Blue = code before <code>next()</code>, green = code after, red = short-circuit.</div>
<div class="wrap">
  <div class="pipe" id="pipe"></div>
  <div class="side">
    <div class="reqs">
      <button data-r="0">ana → GET /orders</button>
      <button data-r="1">anonymous → GET /orders</button>
      <button data-r="2">ana → GET /orders (11th request this minute)</button>
    </div>
    <div class="cache" id="cache"></div>
    <button id="clear" style="font-size:12px">Clear cache</button>
    <div class="res" id="res"></div>
  </div>
</div>
<div class="log" id="log"></div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var NL = String.fromCharCode(10);
  var REQS = [
    { user: 'ana', path: '/orders', burst: false },
    { user: null, path: '/orders', burst: false },
    { user: 'ana', path: '/orders', burst: true }
  ];
  var DESC = {
    Logging: 'logs in and out',
    RateLimit: '429 if too many requests',
    Auth: '401 if no user',
    Cache: 'serves cached responses'
  };
  var order = ['Logging', 'RateLimit', 'Auth', 'Cache'];
  var cache = {};
  var busy = false;

  function log(s) {
    var l = $('log');
    l.textContent += s + NL;
    l.scrollTop = l.scrollHeight;
    console.log(s);
  }

  function renderPipe() {
    var p = $('pipe');
    p.innerHTML = '';
    order.forEach(function (name, i) {
      var d = document.createElement('div');
      d.className = 'mw';
      d.id = 'mw' + i;
      var t = document.createElement('b');
      t.textContent = (i + 1) + '. ' + name;
      var s = document.createElement('small');
      s.textContent = DESC[name];
      var up = document.createElement('button');
      up.textContent = '↑';
      up.disabled = busy || i === 0;
      up.onclick = function () { swap(i, i - 1); };
      var dn = document.createElement('button');
      dn.textContent = '↓';
      dn.disabled = busy || i === order.length - 1;
      dn.onclick = function () { swap(i, i + 1); };
      d.appendChild(t);
      d.appendChild(s);
      d.appendChild(up);
      d.appendChild(dn);
      p.appendChild(d);
    });
    var e = document.createElement('div');
    e.className = 'mw';
    e.id = 'mw' + order.length;
    e.innerHTML = '<b>Endpoint</b><small>200 with the orders (terminal)</small>';
    p.appendChild(e);
    $('cache').textContent = 'Cache: ' + (Object.keys(cache).length ? Object.keys(cache).join(', ') + ' (stored)' : 'empty');
  }

  function swap(a, b) {
    var t = order[a];
    order[a] = order[b];
    order[b] = t;
    log('-- pipeline order: ' + order.join(' → ') + ' → Endpoint');
    renderPipe();
  }

  // Simulate the pipeline as nested calls and record events.
  function simulate(req) {
    var ev = [];
    var ctx = { status: 404, body: '', fromCache: false };
    function call(i) {
      var pad = '  ' + new Array(i + 1).join('  ');
      if (i === order.length) {
        ctx.status = 200;
        ctx.body = 'orders of ' + req.user;
        ev.push({ i: i, cls: 'end', text: pad + 'Endpoint 200 ' + ctx.body });
        return;
      }
      var m = order[i];
      if (m === 'Logging') {
        ev.push({ i: i, cls: 'in', text: pad + 'Logging -> GET ' + req.path + ' (' + (req.user || 'anonymous') + ')' });
        call(i + 1);
        ev.push({ i: i, cls: 'out', text: pad + 'Logging <- ' + ctx.status });
      } else if (m === 'Auth') {
        if (!req.user) {
          ctx.status = 401;
          ev.push({ i: i, cls: 'stop', text: pad + 'Auth: no user -> 401, next() NOT called' });
          return;
        }
        ev.push({ i: i, cls: 'in', text: pad + 'Auth ok (' + req.user + ')' });
        call(i + 1);
        ev.push({ i: i, cls: 'out', text: null });
      } else if (m === 'RateLimit') {
        if (req.burst) {
          ctx.status = 429;
          ev.push({ i: i, cls: 'stop', text: pad + 'RateLimit: too many requests -> 429' });
          return;
        }
        ev.push({ i: i, cls: 'in', text: pad + 'RateLimit ok' });
        call(i + 1);
        ev.push({ i: i, cls: 'out', text: null });
      } else if (m === 'Cache') {
        if (cache[req.path]) {
          ctx.status = 200;
          ctx.body = cache[req.path];
          ctx.fromCache = true;
          ev.push({ i: i, cls: 'stop', text: pad + 'Cache HIT -> 200 ' + ctx.body + ' (next() NOT called)' });
          return;
        }
        ev.push({ i: i, cls: 'in', text: pad + 'Cache miss' });
        call(i + 1);
        if (ctx.status === 200) {
          cache[req.path] = ctx.body;
          ev.push({ i: i, cls: 'out', text: pad + 'Cache <- stored ' + req.path });
        } else {
          ev.push({ i: i, cls: 'out', text: null });
        }
      }
    }
    call(0);
    return { ev: ev, ctx: ctx };
  }

  function clearMarks() {
    for (var i = 0; i <= order.length; i++) {
      var d = $('mw' + i);
      if (d) d.classList.remove('in', 'out', 'stop', 'end');
    }
  }

  function send(r) {
    if (busy) return;
    var req = REQS[r];
    busy = true;
    renderPipe();
    $('res').textContent = '';
    log('GET ' + req.path + ' as ' + (req.user || 'anonymous') + (req.burst ? ' (burst)' : ''));
    var sim = simulate(req);
    var k = 0;
    function tick() {
      if (k >= sim.ev.length) {
        var c = sim.ctx;
        var leak = c.fromCache && !req.user;
        $('res').textContent = '=> ' + c.status + (c.body && c.status === 200 ? ' "' + c.body + '"' : '') +
          (leak ? '  ⚠ anonymous user got cached private data!' : '');
        $('res').style.color = leak ? '#b42318' : c.status === 200 ? '#1a7f37' : '#9a6200';
        log('  => ' + c.status + (leak ? '  (LEAK: cache ran before auth)' : ''));
        busy = false;
        renderPipe();
        return;
      }
      var e = sim.ev[k++];
      clearMarks();
      var d = $('mw' + e.i);
      if (d) d.classList.add(e.cls);
      if (e.text) log(e.text);
      setTimeout(tick, 420);
    }
    tick();
  }

  document.querySelectorAll('[data-r]').forEach(function (b) {
    b.onclick = function () { send(Number(b.getAttribute('data-r'))); };
  });
  $('clear').onclick = function () { cache = {}; log('-- cache cleared'); renderPipe(); };
  renderPipe();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Send <strong>ana → GET /orders</strong>: watch the blue wave go down and the green wave come back up.
              The log's indentation is the call depth. Cache stores the response on the way out.</li>
              <li>Send <strong>anonymous</strong>: Auth turns red and nothing below it runs, but Logging still logs the
              401 on the way out.</li>
              <li>Move <strong>Cache</strong> above <strong>Auth</strong> (↑ on Cache), then send <em>anonymous</em> again:
              the cache answers before Auth ever runs — an anonymous user receives ana's orders. Order matters!</li>
              <li>Move <strong>Logging</strong> to the bottom and send the 11th-request one: RateLimit stops it and the
              rejection is never logged.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Middleware A, B, C are registered in that order; each prints "in" before <code>next()</code> and "out" after. What is printed for a normal request?',
        options: [
          'A in, A out, B in, B out, C in, C out',
          'A in, B in, C in, C out, B out, A out',
          'C in, B in, A in, A out, B out, C out',
          'A in, B in, C in, A out, B out, C out',
        ],
        answer: 1,
        why: '<code>next()</code> is a nested call: the "in" parts run top-down, then the calls return bottom-up, so the "out" parts run in reverse.',
      },
      {
        q: 'An authentication middleware returns without calling <code>next</code>. What is this called and what runs afterwards?',
        options: [
          'A deadlock; nothing runs',
          'Short-circuiting; later middleware and the endpoint are skipped, but earlier middleware still run their "after next" code',
          'An exception; the host restarts',
          'Bubbling; the endpoint still runs',
        ],
        answer: 1,
        why: 'The chain stops at that handler. The handlers that already called <code>next</code> are still on the call stack, so their code after <code>next</code> runs.',
      },
      {
        q: 'Which .NET type lets you build a Chain of Responsibility for outgoing <code>HttpClient</code> requests?',
        options: ['<code>DelegatingHandler</code>', '<code>HttpContent</code>', '<code>HttpRequestMessage</code>', '<code>IHttpClientFactory</code> alone'],
        answer: 0,
        why: 'Each <code>DelegatingHandler</code> overrides <code>SendAsync</code> and calls <code>base.SendAsync</code> to pass the request to its <code>InnerHandler</code> — the next link.',
      },
      {
        q: 'Why should a response cache middleware NOT be registered before authentication?',
        options: [
          'It would be slower',
          'It could serve a cached (possibly private) response before the user is authenticated',
          'Caching requires authentication to compile',
          'There is no problem with that order',
        ],
        answer: 1,
        why: 'A cache hit short-circuits, so authentication never runs. Order in a chain is behaviour, not style.',
      },
      {
        q: 'In the classic approval chain, what must you decide that a plain <code>if/else</code> made obvious?',
        options: [
          'The name of each handler',
          'What happens when no handler accepts the request (end of chain)',
          'Whether handlers are records',
          'Which thread runs each handler',
        ],
        answer: 1,
        why: 'A request can fall off the end of a chain. Make the last link (or the base default) reject or report it explicitly.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>Replace the <code>if / else if</code> ladder with a chain of handlers: an abstract <code>Approver</code> (or
      interface) with a <code>Handle(decimal amount)</code> method and a reference to the next approver;
      <code>Manager</code> (≤ 1,000), <code>Director</code> (≤ 10,000) and <code>Ceo</code> (≤ 100,000) classes; anything
      else falls off the end and is rejected. Edit the C# in the box below and click <strong>Check</strong>.</p>`,
      hint: 'abstract class Approver { private Approver? _next; public Approver SetNext(Approver n) { _next = n; return n; } public virtual string Handle(decimal a) => _next?.Handle(a) ?? $"Rejected {a}"; } and in Manager: amount <= 1_000m ? ... : base.Handle(amount).',
      starter: `var approvals = new ApprovalService();
foreach (var amount in new[] { 500m, 5_000m, 50_000m, 500_000m })
{
  Console.WriteLine(approvals.Approve(amount));
}

class ApprovalService
{
  public string Approve(decimal amount)
  {
    if (amount <= 1_000m) return $"Manager approved {amount}";
    else if (amount <= 10_000m) return $"Director approved {amount}";
    else if (amount <= 100_000m) return $"CEO approved {amount}";
    else return $"Rejected {amount}";
  }
}`,
      solution: `var chain = new Manager();
chain.SetNext(new Director()).SetNext(new Ceo());

foreach (var amount in new[] { 500m, 5_000m, 50_000m, 500_000m })
{
  Console.WriteLine(chain.Handle(amount));
}

abstract class Approver
{
  private Approver? _next;

  public Approver SetNext(Approver next)
  {
    _next = next;
    return next;
  }

  public virtual string Handle(decimal amount) =>
    _next?.Handle(amount) ?? $"Rejected {amount}";
}

class Manager : Approver
{
  public override string Handle(decimal amount) =>
    amount <= 1_000m ? $"Manager approved {amount}" : base.Handle(amount);
}

class Director : Approver
{
  public override string Handle(decimal amount) =>
    amount <= 10_000m ? $"Director approved {amount}" : base.Handle(amount);
}

class Ceo : Approver
{
  public override string Handle(decimal amount) =>
    amount <= 100_000m ? $"CEO approved {amount}" : base.Handle(amount);
}`,
      checks: [
        { label: 'Declares a handler abstraction (abstract class …Approver/Handler or interface)', re: /abstract\s+class\s+\w*(Approver|Handler)\b|interface\s+I\w*(Approver|Handler)\b/ },
        { label: 'Manager is a handler class', re: /class\s+Manager\w*\s*(\([^)]*\))?\s*:\s*\w+/ },
        { label: 'Director is a handler class', re: /class\s+Director\w*\s*(\([^)]*\))?\s*:\s*\w+/ },
        { label: 'Passes the request on (next?.Handle / base.Handle)', re: /([Nn]ext\w*\s*\??\.\s*Handle\w*|base\s*\.\s*Handle\w*)\s*\(/ },
        { label: 'No if / else-if ladder on amount', re: /else\s+if\s*\(\s*amount/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────── ITERATOR ─────────────────────────────────────────────
  {
    id: 'iterator',
    section: 'Behavioral patterns II',
    title: 'Iterator',
    explain: `
      <p><strong>Intent:</strong> give a way to walk through the elements of a collection one at a time without
      exposing how the collection is stored.</p>

      <h3>The problem</h3>
      <p>Callers want to loop over a playlist, a tree, a paged API or a 2 GB log file. If each collection exposes its
      internals (<code>Node.Next</code>, <code>PageToken</code>, <code>array[i]</code>), every caller writes its own
      loop and is coupled to the storage. And building a full <code>List&lt;T&gt;</code> first wastes memory when the
      caller only needs the first 10 items.</p>

      <h3>The solution in .NET: <code>IEnumerable&lt;T&gt;</code> / <code>IEnumerator&lt;T&gt;</code></h3>
      <pre><code>public interface IEnumerable&lt;out T&gt; { IEnumerator&lt;T&gt; GetEnumerator(); }   // the collection
public interface IEnumerator&lt;out T&gt; : IDisposable                            // the cursor
{
  bool MoveNext();   // advance; false when done
  T Current { get; } // the element at the cursor
}</code></pre>
      <p>The iterator pattern is baked into the language. <code>foreach</code> is just sugar:</p>
      <pre><code>foreach (var x in items) Console.WriteLine(x);

// is compiled to roughly:
using (var e = items.GetEnumerator())
{
  while (e.MoveNext())
  {
    var x = e.Current;
    Console.WriteLine(x);
  }
}</code></pre>

      <h3><code>yield return</code>: write an iterator as a normal method</h3>
      <pre><code>IEnumerable&lt;int&gt; Evens(int max)
{
  for (int i = 0; i &lt;= max; i += 2)
    yield return i;      // pause here; resume on the next MoveNext()
}</code></pre>
      <p>The compiler turns this method into a state machine class implementing <code>IEnumerator&lt;int&gt;</code>.
      The body doesn't run when you call <code>Evens(10)</code>; it runs bit by bit, each time someone calls
      <code>MoveNext()</code>.</p>

      <h3>Deferred execution and multiple enumeration</h3>
      <ul>
        <li><strong>Deferred</strong>: LINQ operators like <code>Where</code>/<code>Select</code> are iterators too.
        Building a query runs nothing; items are <em>pulled</em> through the whole chain one at a time, only when
        something enumerates (<code>foreach</code>, <code>ToList</code>, <code>Count</code>, <code>First</code>).</li>
        <li><strong>Multiple enumeration</strong>: every enumeration re-runs the whole pipeline — including the source.
        If the source is a database query or HTTP call, you hit it twice. Materialize once with
        <code>ToList()</code>/<code>ToArray()</code> when you need the results more than once.</li>
      </ul>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Expose a custom collection, stream large/infinite data, generate sequences lazily, hide paging.</li>
        <li>❌ When callers need random access or the count up front — return <code>IReadOnlyList&lt;T&gt;</code>.</li>
      </ul>
      <h3>In .NET</h3>
      <p>Every collection implements <code>IEnumerable&lt;T&gt;</code>; LINQ to Objects is built from iterators;
      <code>File.ReadLines</code> streams lines lazily (unlike <code>ReadAllLines</code>); <code>IAsyncEnumerable&lt;T&gt;</code>
      with <code>await foreach</code> and <code>yield return</code> in <code>async</code> methods is the async version.</p>
    `,
    examples: [
      {
        title: 'C#: foreach desugared, yield return, and lazy LINQ pull order',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `using System.Collections;

Console.WriteLine("1) foreach, desugared by hand:");
using (var e = new Countdown(3).GetEnumerator())
{
  while (e.MoveNext()) Console.WriteLine($"  Current = {e.Current}");
}

Console.WriteLine("2) build the query");
var query = Numbers()
  .Where(n => { Console.WriteLine($"    Where({n})"); return n % 2 == 0; })
  .Select(n => { Console.WriteLine($"    Select({n})"); return n * 10; });
Console.WriteLine("  ...nothing has run yet");

Console.WriteLine("3) foreach pulls one item at a time");
foreach (var x in query) Console.WriteLine($"  got {x}");

Console.WriteLine("4) enumerate again = the whole pipeline runs again");
Console.WriteLine($"  Count() = {query.Count()}");

Console.WriteLine("5) First() stops pulling as soon as it has an answer");
Console.WriteLine($"  First() = {query.First()}");

static IEnumerable<int> Numbers()
{
  for (int i = 1; i <= 4; i++)
  {
    Console.WriteLine($"  source yields {i}");
    yield return i;
  }
  Console.WriteLine("  source done");
}

class Countdown(int from) : IEnumerable<int>
{
  public IEnumerator<int> GetEnumerator()
  {
    for (int i = from; i > 0; i--) yield return i;
  }

  IEnumerator IEnumerable.GetEnumerator() => GetEnumerator();
}`,
        output: `1) foreach, desugared by hand:
  Current = 3
  Current = 2
  Current = 1
2) build the query
  ...nothing has run yet
3) foreach pulls one item at a time
  source yields 1
    Where(1)
  source yields 2
    Where(2)
    Select(2)
  got 20
  source yields 3
    Where(3)
  source yields 4
    Where(4)
    Select(4)
  got 40
  source done
4) enumerate again = the whole pipeline runs again
  source yields 1
    Where(1)
  source yields 2
    Where(2)
    Select(2)
  source yields 3
    Where(3)
  source yields 4
    Where(4)
    Select(4)
  source done
  Count() = 2
5) First() stops pulling as soon as it has an answer
  source yields 1
    Where(1)
  source yields 2
    Where(2)
    Select(2)
  First() = 20`,
        explain: `
          <details>
            <summary>The surprise: it is not "all Where, then all Select"</summary>
            <p>Many people expect LINQ to work like a batch job: filter the whole list, then project the whole list.
            That would print <code>Where(1) Where(2) Where(3) Where(4)</code> and only then the <code>Select</code>s.
            Instead, step 2 prints <em>nothing</em>, and step 3 interleaves source, Where and Select per item. Each
            operator is an iterator that pulls from the one before it only when asked.</p>
          </details>
          <details>
            <summary>Step by step: who calls <code>MoveNext()</code> on whom (step 3)</summary>
            <table>
              <tr><th>#</th><th>Who asks</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>foreach → Select.MoveNext()</td><td>Select needs an item, asks Where; Where asks the source</td><td>—</td></tr>
              <tr><td>2</td><td>source</td><td>runs until the first <code>yield return</code>, pauses</td><td><code>source yields 1</code></td></tr>
              <tr><td>3</td><td>Where</td><td>predicate is false → asks the source again</td><td><code>Where(1)</code></td></tr>
              <tr><td>4</td><td>source</td><td>resumes after the yield, loops, yields 2</td><td><code>source yields 2</code></td></tr>
              <tr><td>5</td><td>Where</td><td>true → hands 2 to Select</td><td><code>Where(2)</code></td></tr>
              <tr><td>6</td><td>Select</td><td>projects 2 → 20, <code>MoveNext()</code> returns true</td><td><code>Select(2)</code></td></tr>
              <tr><td>7</td><td>foreach body</td><td><code>x = Current</code></td><td><code>got 20</code></td></tr>
              <tr><td>8–13</td><td>foreach → MoveNext() again</td><td>same dance for 3 (rejected) and 4</td><td><code>source yields 3</code> … <code>got 40</code></td></tr>
              <tr><td>14</td><td>foreach → MoveNext()</td><td>source loop ends and runs to the end of the method → false all the way up</td><td><code>source done</code></td></tr>
            </table>
            <p>Step 5 shows the payoff: <code>First()</code> stops after getting 20, so the source never yields 3 or 4 and
            never prints <code>source done</code>. With an infinite or huge source, laziness is what makes it work.</p>
          </details>
          <details>
            <summary>Multiple enumeration and how to avoid it</summary>
            <p>Step 4 re-ran <em>everything</em> just to count. <code>query</code> is not a list of results; it's a recipe.
            Every <code>foreach</code>, <code>Count()</code>, <code>Any()</code>, <code>First()</code> follows the recipe
            from the start. If <code>Numbers()</code> were a database call, the example would have queried the database
            three times.</p>
            <pre><code>var results = query.ToList();        // ① run the pipeline once
Console.WriteLine(results.Count);    // ② no re-run: List&lt;T&gt;.Count is a field
foreach (var x in results) { … }     // ③ iterates the list, not the pipeline</code></pre>
            <div class="warn">Analyzers warn about "possible multiple enumeration of IEnumerable" for this reason. Also
            remember that side effects inside a lambda (like our <code>Console.WriteLine</code>) run once <em>per
            enumeration</em>, not once per query definition.</div>
          </details>
        `,
      },
      {
        title: 'Widget: step a lazy pipeline item by item',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 4px 12px; align-items: center; margin-bottom: 8px; font-size: 13px; }
  .pipe { display: flex; align-items: stretch; gap: 4px; flex-wrap: wrap; margin-bottom: 8px; }
  .st { flex: 1 1 100px; border: 2px solid #c5c9d6; border-radius: 10px; padding: 6px; text-align: center;
    background: #fff; transition: background .2s, border-color .2s; min-width: 92px; }
  .st b { display: block; font-size: 13px; }
  .st code { font-size: 11px; color: #646b80; }
  .st .val { font: 700 16px ui-monospace, Menlo, monospace; min-height: 22px; margin-top: 4px; }
  .st .cnt { font-size: 11px; color: #646b80; }
  .st.ask { border-color: #9a6200; background: #fff7e6; }
  .st.give { border-color: #1a7f37; background: #e6f6ea; }
  .st.drop { border-color: #b42318; background: #fdecec; }
  .ar { align-self: center; color: #8a93a8; font-size: 18px; }
  .chips { display: flex; gap: 3px; justify-content: center; margin-top: 4px; flex-wrap: wrap; }
  .chip { font: 11px ui-monospace, Menlo, monospace; border-radius: 4px; padding: 0 4px; background: #eceef3; color: #9aa1b3; }
  .chip.done { background: #dfe5ff; color: #3b4fc4; }
  .now { font-size: 13px; min-height: 20px; margin-bottom: 4px; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 120px; overflow: auto; white-space: pre; }
</style>
<div class="hint">Click <b>Step</b> to advance one call at a time. Orange = asking for the next item (MoveNext), green =
handing an item on, red = Where rejected it. Nothing runs until the consumer asks.</div>
<div class="ctl">
  <button id="step">Step ▶</button>
  <button id="item">Next item ▶▶</button>
  <button id="reset">↺ Reset</button>
  <label><input type="checkbox" id="take"> add <code>.Take(2)</code></label>
  <label><input type="checkbox" id="list"> call <code>.ToList()</code> first</label>
</div>
<div class="pipe">
  <div class="st" id="s-source"><b>Source</b><code>yield 1..6</code><div class="chips" id="chips"></div><div class="cnt" id="c-source"></div></div>
  <div class="ar">→</div>
  <div class="st" id="s-where"><b>Where</b><code>n % 2 == 0</code><div class="val" id="v-where"></div><div class="cnt" id="c-where"></div></div>
  <div class="ar">→</div>
  <div class="st" id="s-select"><b>Select</b><code>n * 10</code><div class="val" id="v-select"></div><div class="cnt" id="c-select"></div></div>
  <div class="ar" id="ar-take">→</div>
  <div class="st" id="s-take"><b>Take(2)</b><code>stop after 2</code><div class="val" id="v-take"></div><div class="cnt" id="c-take"></div></div>
  <div class="ar" id="ar-list">→</div>
  <div class="st" id="s-list"><b>ToList()</b><code>List&lt;int&gt;</code><div class="val" id="v-list"></div></div>
  <div class="ar">→</div>
  <div class="st" id="s-consumer"><b>foreach</b><code>Console.WriteLine</code><div class="val" id="v-consumer"></div></div>
</div>
<div class="now" id="now"></div>
<div class="log" id="log"></div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var NL = String.fromCharCode(10);
  var SRC = [1, 2, 3, 4, 5, 6];
  var events = [];
  var pos = 0;
  var counts = {};

  // Build the exact sequence of calls a lazy (or ToList) pipeline makes.
  function build() {
    var useTake = $('take').checked;
    var useList = $('list').checked;
    var ev = [];
    var feeder = useList ? 'list' : 'consumer';
    var produced = [];
    var taken = 0;
    var srcIdx = 0;
    var done = false;
    // pull one item from the top stage; returns value or null
    function pullTop() {
      if (useTake) {
        ev.push({ st: 'take', cls: 'ask', text: 'Take.MoveNext()  (' + taken + ' of 2 so far)' });
        if (taken >= 2) {
          ev.push({ st: 'take', cls: 'drop', text: 'Take: already have 2 -> false. Source is NOT asked again', log: '  Take stops: source never asked for more' });
          return null;
        }
      }
      ev.push({ st: 'select', cls: 'ask', text: 'Select.MoveNext() asks Where' });
      while (true) {
        ev.push({ st: 'where', cls: 'ask', text: 'Where.MoveNext() asks Source' });
        if (srcIdx >= SRC.length) {
          ev.push({ st: 'source', cls: 'drop', text: 'Source loop ends -> MoveNext() returns false', log: '  source done' });
          done = true;
          return null;
        }
        var n = SRC[srcIdx++];
        ev.push({ st: 'source', cls: 'give', val: n, src: srcIdx, text: 'Source resumes and yields ' + n, log: '  source yields ' + n });
        if (n % 2 !== 0) {
          ev.push({ st: 'where', cls: 'drop', val: n, text: 'Where(' + n + ') is false -> ask Source again', log: '    Where(' + n + ')' });
          continue;
        }
        ev.push({ st: 'where', cls: 'give', val: n, text: 'Where(' + n + ') is true -> hand ' + n + ' to Select', log: '    Where(' + n + ')' });
        ev.push({ st: 'select', cls: 'give', val: n * 10, text: 'Select(' + n + ') -> ' + (n * 10), log: '    Select(' + n + ')' });
        if (useTake) {
          taken++;
          ev.push({ st: 'take', cls: 'give', val: n * 10, text: 'Take passes ' + (n * 10) + ' (' + taken + ' of 2)' });
        }
        return n * 10;
      }
    }
    if (useList) {
      ev.push({ st: 'list', cls: 'ask', text: 'ToList() starts: it enumerates the WHOLE pipeline right now', log: 'var list = query.ToList();' });
      while (true) {
        var v = pullTop();
        if (v === null) break;
        produced.push(v);
        ev.push({ st: 'list', cls: 'give', val: '[' + produced.join(',') + ']', text: 'list.Add(' + v + ')' });
      }
      ev.push({ st: 'list', cls: 'give', val: '[' + produced.join(',') + ']', text: 'ToList() finished. The pipeline is done; foreach now reads the list', log: 'foreach (var x in list)' });
      produced.forEach(function (v2) {
        ev.push({ st: 'consumer', cls: 'give', val: v2, text: 'foreach reads ' + v2 + ' from the list (no pipeline work)', log: '  got ' + v2 });
      });
      ev.push({ st: 'consumer', cls: 'drop', text: 'end of list -> loop ends' });
    } else {
      ev.push({ st: 'consumer', cls: 'ask', text: 'foreach calls MoveNext() on the query', log: 'foreach (var x in query)' });
      while (true) {
        var v3 = pullTop();
        if (v3 === null) {
          ev.push({ st: 'consumer', cls: 'drop', text: 'MoveNext() returned false -> loop ends' });
          break;
        }
        ev.push({ st: 'consumer', cls: 'give', val: v3, text: 'foreach body runs with x = ' + v3, log: '  got ' + v3, item: true });
        ev.push({ st: 'consumer', cls: 'ask', text: 'foreach calls MoveNext() again' });
      }
    }
    events = ev;
    pos = 0;
    counts = {};
    $('log').textContent = '';
    $('ar-take').style.display = $('s-take').style.display = useTake ? '' : 'none';
    $('ar-list').style.display = $('s-list').style.display = useList ? '' : 'none';
    ['where', 'select', 'take', 'list', 'consumer'].forEach(function (s) { $('v-' + s).textContent = ''; });
    paint(null, 0);
    $('now').textContent = 'Query built. Nothing has run yet — click Step.';
  }

  function paint(cur, srcCount) {
    ['source', 'where', 'select', 'take', 'list', 'consumer'].forEach(function (s) {
      $('s-' + s).classList.remove('ask', 'give', 'drop');
    });
    if (cur) {
      $('s-' + cur.st).classList.add(cur.cls);
      if (cur.val != null && $('v-' + cur.st)) $('v-' + cur.st).textContent = cur.val;
    }
    var chips = $('chips');
    chips.innerHTML = '';
    SRC.forEach(function (n, i) {
      var c = document.createElement('span');
      c.className = 'chip' + (i < srcCount ? ' done' : '');
      c.textContent = n;
      chips.appendChild(c);
    });
    $('c-source').textContent = 'yielded ' + (counts.source || 0);
    $('c-where').textContent = 'called ' + (counts.where || 0) + 'x';
    $('c-select').textContent = 'called ' + (counts.select || 0) + 'x';
    $('c-take').textContent = '';
    $('step').disabled = $('item').disabled = pos >= events.length;
  }

  var srcSeen = 0;
  function step() {
    if (pos >= events.length) return null;
    var e = events[pos++];
    if (e.st === 'source' && e.cls === 'give') { counts.source = (counts.source || 0) + 1; srcSeen = e.src; }
    if (e.st === 'where' && e.cls !== 'ask') counts.where = (counts.where || 0) + 1;
    if (e.st === 'select' && e.cls === 'give') counts.select = (counts.select || 0) + 1;
    if (pos === 1) srcSeen = 0;
    paint(e, srcSeen);
    $('now').textContent = (pos) + '/' + events.length + ': ' + e.text;
    if (e.log) {
      $('log').textContent += e.log + NL;
      $('log').scrollTop = $('log').scrollHeight;
      console.log(e.log);
    }
    return e;
  }

  $('step').onclick = step;
  $('item').onclick = function () {
    var e;
    do { e = step(); } while (e && !(e.st === 'consumer' && e.cls !== 'ask'));
  };
  $('reset').onclick = function () { srcSeen = 0; build(); };
  $('take').onchange = function () { srcSeen = 0; build(); };
  $('list').onchange = function () { srcSeen = 0; build(); };
  build();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Click <strong>Step</strong> repeatedly: the orange "ask" travels right-to-left (foreach → Select → Where →
              Source), then a value travels back left-to-right. Item 1 is dropped by Where, so Where asks again.</li>
              <li>Tick <strong>Take(2)</strong> and use <strong>Next item</strong>: after 40 the chain stops — source chips
              5 and 6 stay grey because nobody ever asked for them.</li>
              <li>Tick <strong>ToList() first</strong>: now all the pipeline work happens before the first
              <code>got</code> line, and foreach just reads the finished list. Same pull order inside, different timing.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does this print? <code>var q = Numbers().Where(IsEven);</code> (where <code>Numbers</code> logs each yield) — and then nothing else.',
        options: [
          'Every "source yields" line',
          'Only the even numbers',
          'Nothing: the query is deferred until something enumerates it',
          'A compile error',
        ],
        answer: 2,
        why: '<code>Where</code> just wraps the source in another iterator. No <code>MoveNext()</code> is called, so no code in <code>Numbers</code> runs.',
      },
      {
        q: 'For <code>source.Where(f).Select(g)</code> with a <code>foreach</code>, which order is right for the first matching item?',
        options: [
          'f on all items, then g on all matches',
          'source yields item → f(item) → g(item) → loop body, then the next item',
          'g first, then f',
          'loop body first, then f and g',
        ],
        answer: 1,
        why: 'Items are pulled through the whole chain one at a time. The loop body for item 1 runs before item 2 is even produced.',
      },
      {
        q: 'A method returns <code>IEnumerable&lt;Order&gt;</code> built from a database query. You call <code>.Count()</code> and then <code>foreach</code> over it. What happens?',
        options: [
          'The query runs once and is cached automatically',
          'The query runs twice (multiple enumeration)',
          'Count() throws',
          'foreach reuses the enumerator from Count()',
        ],
        answer: 1,
        why: 'An <code>IEnumerable</code> is a recipe. Each enumeration starts over. Call <code>ToList()</code> once if you need the results more than once.',
      },
      {
        q: 'What does the compiler turn a method containing <code>yield return</code> into?',
        options: [
          'A method that builds a hidden <code>List&lt;T&gt;</code>',
          'A state-machine class implementing <code>IEnumerable&lt;T&gt;</code>/<code>IEnumerator&lt;T&gt;</code>; each <code>MoveNext()</code> resumes after the last <code>yield</code>',
          'A background thread that produces items',
          'An <code>async</code> method',
        ],
        answer: 1,
        why: 'The local variables become fields and a <code>_state</code> field remembers where to resume. No list, no thread.',
      },
      {
        q: 'What is <code>foreach (var x in items)</code> compiled to (for a non-array)?',
        options: [
          'A <code>for</code> loop with an index',
          '<code>GetEnumerator()</code>, then <code>while (e.MoveNext())</code> reading <code>e.Current</code>, then <code>Dispose()</code>',
          'A call to <code>ToList()</code> followed by indexing',
          'Recursion',
        ],
        answer: 1,
        why: 'That is the Iterator pattern exactly. The <code>Dispose()</code> in a <code>finally</code> is what runs <code>finally</code> blocks inside iterators when you <code>break</code> early.',
      },
    ],
    exercise: window.csExercise({
      task: `<p><code>Evens</code> eagerly computes every even number into a <code>List&lt;int&gt;</code>, even though the caller
      only takes 3. Rewrite it as a lazy iterator: return <code>IEnumerable&lt;int&gt;</code> and use <code>yield return</code>,
      with no list. After the change only 3 "computing" lines should print. Edit the C# in the box below and click
      <strong>Check</strong>.</p>`,
      hint: 'static IEnumerable<int> Evens(int max) { for (int i = 0; i <= max; i += 2) { Console.WriteLine($"computing {i}"); yield return i; } }',
      starter: `foreach (var n in Evens(20).Take(3))
{
  Console.WriteLine($"got {n}");
}

static List<int> Evens(int max)
{
  var result = new List<int>();
  for (int i = 0; i <= max; i += 2)
  {
    Console.WriteLine($"computing {i}");
    result.Add(i);
  }
  return result;
}`,
      solution: `foreach (var n in Evens(20).Take(3))
{
  Console.WriteLine($"got {n}");
}

static IEnumerable<int> Evens(int max)
{
  for (int i = 0; i <= max; i += 2)
  {
    Console.WriteLine($"computing {i}");
    yield return i;
  }
}`,
      checks: [
        { label: 'Evens returns IEnumerable<int>', re: /IEnumerable\s*<\s*int\s*>\s+Evens\s*\(/ },
        { label: 'Uses yield return', re: /yield\s+return\b/ },
        { label: 'No List<int> is built', re: /new\s+List\s*<\s*int\s*>/, absent: true },
        { label: 'No .Add( calls', re: /\.Add\s*\(/, absent: true },
      ],
    }),
  },

  // ───────────────────────────────────────────── MEDIATOR ─────────────────────────────────────────────
  {
    id: 'mediator',
    section: 'Behavioral patterns II',
    title: 'Mediator',
    explain: `
      <p><strong>Intent:</strong> instead of objects talking to each other directly, they talk to one central
      <em>mediator</em>, which coordinates them. Many-to-many references become one-to-many.</p>

      <h3>The problem</h3>
      <p>In a chat app where each user holds references to every other user, adding the 5th user means updating 4
      others. In a form, the "ship to billing address" checkbox enables the address box, which revalidates the submit
      button, which updates the summary panel… Each widget references several others, and you can't reuse any of them
      alone.</p>
      <pre><code>// ❌ Before: everyone knows everyone — n·(n−1)/2 links
ana.Contacts.AddRange([bob, cy, dee]);
bob.Contacts.AddRange([ana, cy, dee]);
// …and Say() loops over its own contacts</code></pre>

      <h3>The solution</h3>
      <p>Components only know the mediator. They report "something happened" and the mediator decides who else needs
      to know. The coordination logic lives in one place.</p>
      <pre><code>   ana     bob                 ana ─┐   ┌─ bob
    │ ╲   ╱ │                          ChatRoom
    │  ╳    │      becomes     cy ──┘   └─ dee
    │ ╱   ╲ │
   cy ─── dee                  4 links instead of 6 (and 8 instead of 28 for 8 users)</code></pre>
      <ul>
        <li><strong>Mediator</strong> — <code>ChatRoom</code>, an air-traffic tower, a form controller.</li>
        <li><strong>Colleagues</strong> — users, planes, widgets: they hold a reference to the mediator only.</li>
      </ul>

      <h3>MediatR-style request/handler</h3>
      <p>In .NET apps "mediator" often means the MediatR library's style: a controller sends a request object
      (<code>new PlaceOrder(...)</code>) to <code>IMediator.Send</code>, and the mediator finds the single handler
      registered for that request type. The controller doesn't reference the handler. The example hand-rolls this in
      ~15 lines (no NuGet needed).</p>

      <h3>Mediator vs Observer</h3>
      <table>
        <tr><th></th><th>Observer</th><th>Mediator</th></tr>
        <tr><td>Direction</td><td>One subject broadcasts to whoever subscribed</td><td>Many colleagues ↔ one hub that routes</td></tr>
        <tr><td>Logic</td><td>Subject knows nothing about listeners</td><td>Mediator contains the coordination rules</td></tr>
        <tr><td>Replies</td><td>Usually none (fire and forget)</td><td>Often request/response (<code>Send</code> returns a result)</td></tr>
      </table>
      <p>They combine well: a mediator often uses events internally to notify colleagues.</p>

      <h3>When to use / when not</h3>
      <ul>
        <li>✅ Lots of objects interacting in tangled ways (UI forms, chat, game entities); decoupling controllers from
        use-case handlers.</li>
        <li>❌ When the mediator becomes a "god object" holding all business logic. Also, a request/handler mediator adds
        an indirection that makes "Go to definition" stop working — use it where the decoupling is worth it.</li>
      </ul>
      <h3>In .NET</h3>
      <p>MediatR's <code>IMediator.Send</code>/<code>Publish</code>; WPF/MAUI messengers
      (<code>WeakReferenceMessenger</code> in the CommunityToolkit.Mvvm); a SignalR hub routing messages between
      clients; a <code>Form</code>/page code-behind that coordinates its child controls.</p>
    `,
    examples: [
      {
        title: 'C#: a chat room mediator and a mini MediatR',
        runnable: false,
        lang: 'csharp',
        note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
        code: `Console.WriteLine("-- chat room (mediator) --");
var room = new ChatRoom();
var ana = room.Join("ana");
var bob = room.Join("bob");
room.Join("cy");
room.Join("dee");

ana.Say("hi team");
bob.SayTo("cy", "lunch?");
bob.SayTo("zed", "anyone?");
Console.WriteLine($"  {room.Count} users, {room.Count} links (direct: {room.Count * (room.Count - 1) / 2})");

Console.WriteLine("-- mini MediatR --");
var db = new Dictionary<int, (string Item, int Qty)>();
var mediator = new Mediator();
mediator.Register(new PlaceOrderHandler(db));
mediator.Register(new GetOrderTotalHandler(db));

// The caller only knows the mediator and the request types.
int id = mediator.Send(new PlaceOrder("Book", 2));
decimal total = mediator.Send(new GetOrderTotal(id));
Console.WriteLine($"  order #{id} total = {total}");

// ---------- chat room ----------
class User(string name, ChatRoom room)
{
  public string Name => name;
  public void Say(string text) => room.Broadcast(this, text);
  public void SayTo(string to, string text) => room.Direct(this, to, text);
  public void Receive(string from, string text) => Console.WriteLine($"  {name} got from {from}: {text}");
}

class ChatRoom
{
  private readonly Dictionary<string, User> _users = new();
  public int Count => _users.Count;

  public User Join(string name) => _users[name] = new User(name, this);

  public void Broadcast(User from, string text)
  {
    Console.WriteLine($"[{from.Name} -> all] {text}");
    foreach (var user in _users.Values)
    {
      if (user != from) user.Receive(from.Name, text);
    }
  }

  public void Direct(User from, string to, string text)
  {
    Console.WriteLine($"[{from.Name} -> {to}] {text}");
    if (_users.TryGetValue(to, out var target)) target.Receive(from.Name, text);
    else Console.WriteLine($"  room: no user '{to}'");
  }
}

// ---------- mini MediatR ----------
interface IRequest<TResponse> { }

interface IRequestHandler<TRequest, TResponse> where TRequest : IRequest<TResponse>
{
  TResponse Handle(TRequest request);
}

record PlaceOrder(string Item, int Qty) : IRequest<int>;
record GetOrderTotal(int OrderId) : IRequest<decimal>;

class PlaceOrderHandler(Dictionary<int, (string Item, int Qty)> db) : IRequestHandler<PlaceOrder, int>
{
  public int Handle(PlaceOrder r)
  {
    int id = db.Count + 1;
    db[id] = (r.Item, r.Qty);
    Console.WriteLine($"  PlaceOrderHandler: {r.Qty} x {r.Item} -> #{id}");
    return id;
  }
}

class GetOrderTotalHandler(Dictionary<int, (string Item, int Qty)> db)
  : IRequestHandler<GetOrderTotal, decimal>
{
  private static readonly Dictionary<string, decimal> Prices = new() { ["Book"] = 12.50m };

  public decimal Handle(GetOrderTotal r)
  {
    var (item, qty) = db[r.OrderId];
    Console.WriteLine($"  GetOrderTotalHandler: #{r.OrderId}");
    return Prices[item] * qty;
  }
}

class Mediator
{
  private readonly Dictionary<Type, Func<object, object>> _handlers = new();

  public void Register<TRequest, TResponse>(IRequestHandler<TRequest, TResponse> handler)
    where TRequest : IRequest<TResponse>
    => _handlers[typeof(TRequest)] = request => handler.Handle((TRequest)request)!;

  public TResponse Send<TResponse>(IRequest<TResponse> request)
  {
    Console.WriteLine($"  mediator: routing {request.GetType().Name}");
    return (TResponse)_handlers[request.GetType()](request);
  }
}`,
        output: `-- chat room (mediator) --
[ana -> all] hi team
  bob got from ana: hi team
  cy got from ana: hi team
  dee got from ana: hi team
[bob -> cy] lunch?
  cy got from bob: lunch?
[bob -> zed] anyone?
  room: no user 'zed'
  4 users, 4 links (direct: 6)
-- mini MediatR --
  mediator: routing PlaceOrder
  PlaceOrderHandler: 2 x Book -> #1
  mediator: routing GetOrderTotal
  GetOrderTotalHandler: #1
  order #1 total = 25.00`,
        explain: `
          <details>
            <summary>Key lines explained: the chat room</summary>
            <pre><code>class User(string name, ChatRoom room)                       // ① only knows the room
public void Say(string text) =&gt; room.Broadcast(this, text);   // ② report, don't deliver
if (user != from) user.Receive(from.Name, text);              // ③ routing rules live here
else Console.WriteLine($"  room: no user '{to}'");            // ④ one place for edge cases</code></pre>
            <ol>
              <li><strong>①</strong> A user has no list of other users. Adding <code>dee</code> didn't touch ana, bob or cy.</li>
              <li><strong>②</strong> Users tell the mediator what they want; they don't know who's listening.</li>
              <li><strong>③</strong> "Don't echo to the sender" is a coordination rule, so it belongs to the mediator.</li>
              <li><strong>④</strong> Unknown recipients, muted users, moderation — all in one class.</li>
            </ol>
          </details>
          <details>
            <summary>Key lines explained: how <code>Send</code> finds the handler</summary>
            <pre><code>record PlaceOrder(string Item, int Qty) : IRequest&lt;int&gt;;          // ① request declares its reply type
_handlers[typeof(TRequest)] = request =&gt; handler.Handle((TRequest)request)!; // ② register by type
public TResponse Send&lt;TResponse&gt;(IRequest&lt;TResponse&gt; request)          // ③ TResponse inferred
  =&gt; (TResponse)_handlers[request.GetType()](request);               // ④ look up + call</code></pre>
            <ol>
              <li><strong>①</strong> <code>IRequest&lt;int&gt;</code> is a marker interface that carries the response type,
              so <code>mediator.Send(new PlaceOrder(...))</code> is typed as <code>int</code>.</li>
              <li><strong>②</strong> The dictionary maps <code>typeof(PlaceOrder)</code> → a lambda that casts and calls the
              strongly-typed handler. (Real MediatR finds handlers in the DI container instead.)</li>
              <li><strong>③</strong> The compiler infers <code>TResponse = int</code> from <code>PlaceOrder : IRequest&lt;int&gt;</code>.</li>
              <li><strong>④</strong> Lookup by the runtime type, invoke, cast the <code>object</code> back.</li>
            </ol>
            <div class="tip">The caller now depends on <code>Mediator</code> + request records only. Handlers can be
            added, replaced or wrapped (logging, validation — a Chain of Responsibility around <code>Send</code>) without
            touching callers.</div>
          </details>
        `,
      },
      {
        title: 'Widget: direct references vs a mediator',
        lang: 'html',
        code: `<style>
  .hint { color: #646b80; font-size: 13px; margin-bottom: 6px; }
  .ctl { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: center; margin-bottom: 6px; font-size: 13px; }
  .stats { display: flex; gap: 10px; flex-wrap: wrap; margin: 4px 0; }
  .stat { border: 1px solid #d5d9e5; border-radius: 8px; padding: 4px 10px; font-size: 12px; background: #fafbfd; }
  .stat b { font-size: 18px; display: block; }
  .stat.bad b { color: #b42318; }
  .stat.good b { color: #1a7f37; }
  svg { width: 100%; max-width: 520px; height: auto; display: block; margin: 0 auto; }
  .log { font: 12px/1.5 ui-monospace, Menlo, monospace; background: #f4f6fa; border-radius: 8px; padding: 8px;
    height: 80px; overflow: auto; white-space: pre; }
</style>
<div class="hint">Switch between wiring styles, add components, and watch the number of references. Then send a
message and see which path it takes.</div>
<div class="ctl">
  <label><input type="radio" name="m" value="direct"> Direct references</label>
  <label><input type="radio" name="m" value="mediator" checked> Mediator (ChatRoom)</label>
  <button id="add">+ Add component</button>
  <button id="rem">− Remove</button>
</div>
<div class="ctl">
  From <select id="from"></select> to <select id="to"></select>
  <button id="send" style="font-weight:700">Send ▶</button>
</div>
<div class="stats">
  <div class="stat" id="st1"><b id="links"></b>references to maintain</div>
  <div class="stat" id="st2"><b id="knows"></b>objects each component knows</div>
  <div class="stat"><b id="touch"></b>classes touched to add one more</div>
</div>
<svg viewBox="0 0 420 300" id="svg"></svg>
<div class="log" id="log"></div>
<script>
  var $ = function (id) { return document.getElementById(id); };
  var NS = 'http://www.w3.org/2000/svg';
  var NAMES = ['Ana', 'Bob', 'Cy', 'Dee', 'Eli', 'Fay', 'Gus', 'Hal'];
  var count = 4;
  var busy = false;
  var CX = 210, CY = 150, R = 115;

  function mode() {
    var r = document.querySelector('input[name=m]:checked');
    return r ? r.value : 'mediator';
  }
  function pos(i) {
    var a = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: CX + R * Math.cos(a), y: CY + R * Math.sin(a) };
  }
  function log(s) {
    var l = $('log');
    l.textContent += s + String.fromCharCode(10);
    l.scrollTop = l.scrollHeight;
    console.log(s);
  }
  function mk(name, attrs, text) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (text != null) e.textContent = text;
    $('svg').appendChild(e);
    return e;
  }

  function draw() {
    var svg = $('svg');
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var m = mode();
    var i, j, p, q;
    if (m === 'direct') {
      for (i = 0; i < count; i++) for (j = i + 1; j < count; j++) {
        p = pos(i); q = pos(j);
        mk('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: '#e3a0a0', 'stroke-width': 1.5 });
      }
    } else {
      for (i = 0; i < count; i++) {
        p = pos(i);
        mk('line', { x1: p.x, y1: p.y, x2: CX, y2: CY, stroke: '#9fb0f0', 'stroke-width': 2 });
      }
      mk('rect', { x: CX - 48, y: CY - 20, width: 96, height: 40, rx: 10, fill: '#eef1ff', stroke: '#4f6bed', 'stroke-width': 2, id: 'hub' });
      mk('text', { x: CX, y: CY + 5, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700 }, 'ChatRoom');
    }
    for (i = 0; i < count; i++) {
      p = pos(i);
      mk('circle', { cx: p.x, cy: p.y, r: 22, fill: '#fff', stroke: '#8a93a8', 'stroke-width': 2, id: 'n' + i });
      mk('text', { x: p.x, y: p.y + 4, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600 }, NAMES[i]);
    }
    var links = m === 'direct' ? count * (count - 1) / 2 : count;
    $('links').textContent = links;
    $('knows').textContent = m === 'direct' ? count - 1 : 1;
    $('touch').textContent = m === 'direct' ? count + 1 : 1;
    $('st1').className = 'stat ' + (m === 'direct' ? 'bad' : 'good');
    $('st2').className = 'stat ' + (m === 'direct' ? 'bad' : 'good');
    $('add').disabled = busy || count >= NAMES.length;
    $('rem').disabled = busy || count <= 2;
    $('send').disabled = busy;
  }

  function fillSelects() {
    var f = $('from'), t = $('to');
    var fv = f.value, tv = t.value;
    f.innerHTML = '';
    t.innerHTML = '<option value="all">everyone</option>';
    for (var i = 0; i < count; i++) {
      f.innerHTML += '<option value="' + i + '">' + NAMES[i] + '</option>';
      t.innerHTML += '<option value="' + i + '">' + NAMES[i] + '</option>';
    }
    if (fv !== '' && Number(fv) < count) f.value = fv;
    if (tv === 'all' || (tv !== '' && Number(tv) < count)) t.value = tv || 'all';
  }

  function fly(a, b, color) {
    return new Promise(function (resolve) {
      var c = mk('circle', { cx: a.x, cy: a.y, r: 7, fill: color });
      var t0 = null;
      function frame(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 450);
        c.setAttribute('cx', a.x + (b.x - a.x) * k);
        c.setAttribute('cy', a.y + (b.y - a.y) * k);
        if (k < 1) requestAnimationFrame(frame); else { c.remove(); resolve(); }
      }
      requestAnimationFrame(frame);
    });
  }

  function flash(id, color) {
    var e = document.getElementById(id);
    if (!e) return;
    e.setAttribute('fill', color);
    setTimeout(function () { if (e) e.setAttribute('fill', id === 'hub' ? '#eef1ff' : '#fff'); }, 500);
  }

  async function send() {
    var from = Number($('from').value);
    var toV = $('to').value;
    var targets = [];
    for (var i = 0; i < count; i++) if (i !== from && (toV === 'all' || Number(toV) === i)) targets.push(i);
    if (!targets.length) { log('(nobody to send to)'); return; }
    busy = true;
    draw();
    var m = mode();
    var label = toV === 'all' ? 'all' : NAMES[Number(toV)];
    log('[' + NAMES[from] + ' -> ' + label + '] hello');
    if (m === 'mediator') {
      await fly(pos(from), { x: CX, y: CY }, '#4f6bed');
      flash('hub', '#d8defd');
      log('  ChatRoom routes to ' + targets.map(function (k) { return NAMES[k]; }).join(', '));
      await Promise.all(targets.map(function (k) { return fly({ x: CX, y: CY }, pos(k), '#4f6bed'); }));
    } else {
      log('  ' + NAMES[from] + ' calls each target itself (' + targets.length + ' references used)');
      await Promise.all(targets.map(function (k) { return fly(pos(from), pos(k), '#c0392b'); }));
    }
    targets.forEach(function (k) { flash('n' + k, '#e6f6ea'); log('  ' + NAMES[k] + ' got from ' + NAMES[from] + ': hello'); });
    busy = false;
    draw();
  }

  $('add').onclick = function () {
    count++;
    var m = mode();
    log('+ ' + NAMES[count - 1] + (m === 'direct'
      ? ': must be wired to ' + (count - 1) + ' others, and they to it'
      : ': room.Join("' + NAMES[count - 1] + '") — nobody else changes'));
    fillSelects();
    draw();
  };
  $('rem').onclick = function () { count--; fillSelects(); draw(); };
  document.querySelectorAll('input[name=m]').forEach(function (r) {
    r.onchange = function () { log('-- mode: ' + mode()); draw(); };
  });
  $('send').onclick = send;
  fillSelects();
  draw();
</script>`,
        explain: `
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In <strong>Direct references</strong> mode, click <strong>+ Add component</strong> until you have 8: the
              reference count climbs 6 → 10 → 15 → 21 → 28 (n·(n−1)/2). Switch to <strong>Mediator</strong>: 8.</li>
              <li>Send from Ana to <em>everyone</em> in both modes. Direct: Ana fires every message herself. Mediator: one
              message to the ChatRoom, which fans it out.</li>
              <li>Read the log line when you add a component: with a mediator, nobody else has to change.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'With 10 components that all talk to each other, how many references does each approach need?',
        options: [
          'Direct: 10, mediator: 45',
          'Direct: 45 (n·(n−1)/2), mediator: 10',
          'Both need 45',
          'Direct: 100, mediator: 1',
        ],
        answer: 1,
        why: 'Every pair needs a link directly (10·9/2 = 45). With a mediator each component holds one reference, to the hub.',
      },
      {
        q: 'Which statement best separates Mediator from Observer?',
        options: [
          'Observer: a subject broadcasts to unknown subscribers; Mediator: a hub with coordination logic routes between colleagues, often with replies',
          'Mediator only works with events',
          'Observer requires a central hub',
          'They are identical',
        ],
        answer: 0,
        why: 'Observer is one-to-many notification with no routing logic. A mediator decides who gets what and can return results (like <code>Send</code>).',
      },
      {
        q: 'In MediatR-style code, what does a controller depend on?',
        options: [
          'Every handler class directly',
          'The mediator and request types (e.g. <code>PlaceOrder : IRequest&lt;int&gt;</code>), not the handlers',
          'The database context',
          'Nothing; it uses static methods',
        ],
        answer: 1,
        why: 'The controller calls <code>mediator.Send(new PlaceOrder(...))</code>; the mediator finds the registered handler.',
      },
      {
        q: 'What is the main risk of the Mediator pattern?',
        options: [
          'It cannot be unit-tested',
          'It always leaks memory',
          'The mediator can grow into a god object that holds all the logic',
          'It only works in UI code',
        ],
        answer: 2,
        why: 'Centralising coordination is the point, but keep business logic in the colleagues/handlers; split mediators per feature if they grow.',
      },
    ],
    exercise: window.csExercise({
      task: `<p>Each <code>User</code> keeps a <code>Contacts</code> list of every other user. Introduce a <code>ChatRoom</code>
      mediator: users receive the room in their constructor, <code>Say</code> forwards to the room, and the room delivers the
      message to everyone except the sender. Remove the <code>Contacts</code> list. Edit the C# in the box below and click
      <strong>Check</strong>.</p>`,
      hint: 'class ChatRoom { private readonly List<User> _users = []; public User Join(string name) { var u = new User(name, this); _users.Add(u); return u; } public void Broadcast(User from, string text) { ... } } and class User(string name, ChatRoom room).',
      starter: `var ana = new User("ana");
var bob = new User("bob");
var cy = new User("cy");
ana.Contacts.AddRange([bob, cy]);
bob.Contacts.AddRange([ana, cy]);
cy.Contacts.AddRange([ana, bob]);

ana.Say("hi");

class User(string name)
{
  public string Name => name;
  public List<User> Contacts { get; } = [];

  public void Say(string text)
  {
    foreach (var contact in Contacts) contact.Receive(name, text);
  }

  public void Receive(string from, string text) =>
    Console.WriteLine($"{name} got from {from}: {text}");
}`,
      solution: `var room = new ChatRoom();
var ana = room.Join("ana");
room.Join("bob");
room.Join("cy");

ana.Say("hi");

class User(string name, ChatRoom room)
{
  public string Name => name;

  public void Say(string text) => room.Broadcast(this, text);

  public void Receive(string from, string text) =>
    Console.WriteLine($"{name} got from {from}: {text}");
}

class ChatRoom
{
  private readonly List<User> _users = [];

  public User Join(string name)
  {
    var user = new User(name, this);
    _users.Add(user);
    return user;
  }

  public void Broadcast(User from, string text)
  {
    foreach (var user in _users)
    {
      if (user != from) user.Receive(from.Name, text);
    }
  }
}`,
      checks: [
        { label: 'Declares class ChatRoom', re: /class\s+ChatRoom\b/ },
        { label: 'User depends on the mediator (ChatRoom parameter or field)', re: /\bChatRoom\s+_?\w+\s*[,;)=]/ },
        { label: 'No Contacts list on User', re: /List\s*<\s*User\s*>\s+Contacts\b/, absent: true },
        { label: 'No more Contacts wiring', re: /Contacts\s*\.\s*Add/, absent: true },
      ],
    }),
  },
);
