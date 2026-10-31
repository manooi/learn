window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── layered
  {
    id: 'layered',
    section: 'Architecture',
    title: 'Layered Architecture & the Dependency Rule',
    explain: `
      <p>Tactical DDD (entities, value objects, aggregates) only pays off if the domain model is
      <strong>protected</strong>. If your <code>Booking</code> class imports the ORM, the HTTP
      framework and the Stripe SDK, then every framework upgrade, every schema change and every
      test drags the whole world in with it. Evans' blue book (2003) proposed the classic fix:
      split the code into <strong>layers</strong> and control which way the arrows point.</p>

      <h3>The four layers</h3>
      <table>
        <tr><th>Layer</th><th>Job</th><th>SkyHop example</th></tr>
        <tr><td><strong>UI / interface</strong></td><td>Translate HTTP, CLI, queue messages into
        calls; translate results back (status codes, JSON)</td><td><code>POST /bookings/:ref/cancel</code>
        controller</td></tr>
        <tr><td><strong>Application</strong></td><td>One function per use case: load, call the
        domain, save, publish. No business rules.</td><td><code>cancelBooking(ref)</code></td></tr>
        <tr><td><strong>Domain</strong></td><td>The model: rules, invariants, events. Plain
        code.</td><td><code>Booking.cancel()</code>, <code>Money</code>, <code>BookingCancelled</code></td></tr>
        <tr><td><strong>Infrastructure</strong></td><td>Databases, brokers, payment providers, email.
        Implements interfaces the inner layers declare.</td><td><code>PgBookingRepository</code>,
        <code>StripeGateway</code></td></tr>
      </table>

      <h3>The dependency rule</h3>
      <p>Source-code dependencies point <strong>inwards, towards the domain</strong>:</p>
      <pre><code>UI  ──►  Application  ──►  Domain  ◄──  Infrastructure</code></pre>
      <ul>
        <li><strong>The domain imports nothing</strong> outside itself: no <code>express</code>,
        no <code>pg</code>, no <code>@prisma/client</code>, no <code>axios</code>. You should be
        able to copy the domain folder into an empty project and run its tests.</li>
        <li><strong>Infrastructure points inwards too.</strong> In the original
        "top-to-bottom" picture the domain sat <em>above</em> infrastructure and called it. Modern
        DDD flips that arrow with <strong>dependency inversion</strong>: the domain (or application)
        layer declares an interface, e.g. <code>BookingRepository</code>, and infrastructure
        implements it. The domain never knows Postgres exists.</li>
        <li>Somebody still has to plug the real classes together. That's the
        <strong>composition root</strong> (your <code>main.js</code> / DI container): the only
        place allowed to know every layer.</li>
      </ul>
      <pre><code>src/
  booking/
    domain/          booking.js, money.js, bookingRepository.js (port)
    application/     cancelBooking.js, addBag.js
    infrastructure/  pgBookingRepository.js, stripeGateway.js
    ui/              bookingRoutes.js
  main.js            ← composition root: wires adapters into use cases</code></pre>
      <p>Notice the folder is split <strong>by bounded context first</strong> (<code>booking/</code>),
      then by layer. Splitting the whole repo into <code>controllers/ models/ services/</code> hides
      the domain and invites every context to share everything.</p>

      <div class="warn"><strong>Strict vs relaxed layering.</strong> In strict layering, UI may only
      call the application layer. In relaxed layering, UI can also read domain types (e.g. to
      render a <code>Money</code>). Pick one per codebase. Going the other way is never allowed:
      the domain never calls the UI, and the domain never imports infrastructure.</div>

      <div class="tip"><strong>In the real world:</strong> teams enforce the rule with tooling, not
      discipline: <code>dependency-cruiser</code> or ESLint <code>no-restricted-imports</code> in
      JS/TS, ArchUnit in Java, NetArchTest in .NET. A one-line CI check that fails when
      <code>domain/**</code> imports <code>pg</code> catches far more than code review does. Don't
      layer a simple CRUD screen four deep. Use full layering where the domain logic is worth
      protecting.</div>
    `,
    examples: [
      {
        title: 'Four layers, one use case (SkyHop cancel)',
        code: `// ── DOMAIN: plain JS. No framework, no I/O, no imports. ──────────
class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
class BookingNotFound extends DomainError {}

class Booking {
  #status;
  constructor(ref, status = 'CONFIRMED') {
    this.ref = ref;
    this.#status = status;
  }
  get status() {
    return this.#status;
  }
  cancel() {
    if (this.#status === 'CANCELLED') {
      throw new DomainError('booking ' + this.ref + ' is already cancelled');
    }
    this.#status = 'CANCELLED';
  }
}
// The domain DECLARES the port it needs. JS has no interfaces, so we
// document the shape: BookingRepository { findByRef(ref), save(booking) }

// ── APPLICATION: one use case, depends only on the domain + port ──
function makeCancelBooking({ bookings }) {
  return function cancelBooking(ref) {
    const booking = bookings.findByRef(ref);
    if (!booking) throw new BookingNotFound('no booking ' + ref);
    booking.cancel();
    bookings.save(booking);
    return { ref: booking.ref, status: booking.status }; // DTO, not the entity
  };
}

// ── INFRASTRUCTURE: implements the port (pretend this is Postgres) ──
class InMemoryBookingRepository {
  #rows = new Map();
  findByRef(ref) {
    const row = this.#rows.get(ref);
    return row ? new Booking(row.ref, row.status) : null;
  }
  save(booking) {
    this.#rows.set(booking.ref, { ref: booking.ref, status: booking.status });
    console.log('  [infra] UPDATE bookings SET status=' + booking.status +
      ' WHERE ref=' + booking.ref);
  }
}

// ── UI: translate HTTP-ish request/response, nothing else ─────────
function cancelController(req, cancelBooking) {
  try {
    return { status: 200, body: cancelBooking(req.params.ref) };
  } catch (e) {
    if (e instanceof BookingNotFound) return { status: 404, body: { error: e.message } };
    if (e instanceof DomainError) return { status: 409, body: { error: e.message } };
    throw e; // unknown errors are not ours to hide
  }
}

// ── COMPOSITION ROOT: the only place that knows every layer ──────
const repo = new InMemoryBookingRepository();
repo.save(new Booking('PNR-0001'));
const cancelBooking = makeCancelBooking({ bookings: repo });

const req = { params: { ref: 'PNR-0001' } };
console.log('1st POST /bookings/PNR-0001/cancel →', cancelController(req, cancelBooking));
console.log('2nd POST /bookings/PNR-0001/cancel →', cancelController(req, cancelBooking));
console.log('POST /bookings/NOPE/cancel →',
  cancelController({ params: { ref: 'NOPE' } }, cancelBooking));`,
      },
      {
        title: 'Widget: which arrows are allowed?',
        lang: 'html',
        editor: false,
        code: `<style>
  .lw { background:#1b1f27; color:#e6e6e6; font:14px system-ui, sans-serif; padding:14px;
        border-radius:10px; }
  .lw h4 { margin:0 0 6px; }
  .lw .row { display:flex; gap:8px; flex-wrap:wrap; margin:8px 0; }
  .lw button.layer { flex:1; min-width:120px; padding:12px 8px; border-radius:8px; cursor:pointer;
        border:2px solid #3a4150; background:#262b36; color:#e6e6e6; font-weight:600; }
  .lw button.layer.from { border-color:#4c9aff; background:#1d3352; }
  .lw button.layer.to { border-color:#f5a524; background:#3d2f12; }
  .lw .out { margin-top:10px; padding:10px; border-radius:8px; background:#11141a; min-height:64px; }
  .lw .ok { color:#5ad17a; font-weight:700; }
  .lw .bad { color:#ff6b6b; font-weight:700; }
  .lw label { font-size:13px; color:#aab; }
</style>
<div class="lw">
  <h4>Dependency rule explorer</h4>
  <div style="font-size:13px;color:#aab">Click a layer that <b style="color:#4c9aff">imports</b>,
  then the layer it imports <b style="color:#f5a524">from</b>.</div>
  <div class="row" id="layers"></div>
  <label><input type="checkbox" id="relaxed"> relaxed layering (UI may read domain types)</label>
  <div class="out" id="out">Pick the importing layer first.</div>
</div>
<script>
  const LAYERS = ['ui', 'application', 'domain', 'infrastructure'];
  const NAMES = { ui: 'UI', application: 'Application', domain: 'Domain',
    infrastructure: 'Infrastructure' };
  const WHY = {
    'ui>application': 'Controllers call use cases. This is the normal entry point.',
    'ui>domain': 'Only in relaxed layering, e.g. to format a Money value. Strict layering sends everything through the application layer.',
    'ui>infrastructure': 'A controller running SQL skips the use case and the rules. The next change to the rule will miss this path.',
    'application>domain': 'Use cases load aggregates and call their behaviour.',
    'application>ui': 'A use case must not know whether it was called by HTTP, a CLI or a queue consumer.',
    'application>infrastructure': 'The use case should depend on a port (interface), e.g. PaymentGateway, not on the Stripe adapter. Wire the adapter in the composition root.',
    'domain>ui': 'The model would depend on screens. Never.',
    'domain>application': 'The domain does not know which use cases exist. Arrows point inward only.',
    'domain>infrastructure': 'This is the classic mistake: a Booking importing the ORM or the HTTP client. The domain becomes untestable without a database.',
    'infrastructure>domain': 'Adapters implement domain ports (BookingRepository) and map rows to aggregates. This arrow is the inverted dependency.',
    'infrastructure>application': 'Adapters may implement application-level ports (e.g. Notifier) and use application DTOs.',
    'infrastructure>ui': 'A database adapter has no business knowing about controllers.',
  };
  const allowed = (from, to, relaxed) => {
    const ok = ['ui>application', 'application>domain', 'infrastructure>domain',
      'infrastructure>application'];
    if (relaxed) ok.push('ui>domain');
    return ok.includes(from + '>' + to);
  };
  let from = null;
  const row = document.getElementById('layers');
  const out = document.getElementById('out');
  const relaxed = document.getElementById('relaxed');
  function render(to) {
    row.innerHTML = '';
    for (const l of LAYERS) {
      const b = document.createElement('button');
      b.className = 'layer' + (l === from ? ' from' : '') + (l === to ? ' to' : '');
      b.textContent = NAMES[l];
      b.onclick = () => pick(l);
      row.appendChild(b);
    }
  }
  function pick(l) {
    if (!from || from === l) {
      from = from === l ? null : l;
      out.textContent = from ? NAMES[from] + ' imports from … ?' : 'Pick the importing layer first.';
      render(null);
      return;
    }
    const to = l;
    const ok = allowed(from, to, relaxed.checked);
    out.innerHTML = '<div class="' + (ok ? 'ok' : 'bad') + '">' + NAMES[from] + ' → ' + NAMES[to] +
      ': ' + (ok ? 'ALLOWED' : 'FORBIDDEN') + '</div><div style="margin-top:6px">' +
      WHY[from + '>' + to] + '</div>';
    render(to);
    from = null;
  }
  relaxed.onchange = () => { from = null; render(null); out.textContent = 'Pick the importing layer first.'; };
  render(null);
</script>`,
      },
    ],
    quiz: [
      {
        q: 'A SkyHop developer adds <code>import { prisma } from "../db"</code> inside <code>Booking.cancel()</code> to check whether a refund already exists. What is wrong?',
        options: [
          'Nothing: aggregates may query anything they need',
          'The domain now depends on infrastructure. Load the data in the application layer (or via a port) and pass it in',
          'Prisma should be replaced with raw SQL',
          'The check should move into the UI controller',
        ],
        answer: 1,
        why: 'The domain must not import infrastructure. The use case can load what the rule needs and pass it as an argument, or the domain can declare a port that infrastructure implements.',
      },
      {
        q: 'Where should <code>new PgBookingRepository(pool)</code> and <code>makeCancelBooking({ bookings })</code> be wired together?',
        options: [
          'Inside the Booking aggregate constructor',
          'Inside each controller on every request',
          'In the composition root (main.js / DI container)',
          'In the domain layer, so it is reusable',
        ],
        answer: 2,
        why: 'Only the composition root knows every concrete class. Everything else depends on abstractions (ports) and gets them injected.',
      },
      {
        q: 'In the dependency rule, which arrow is the "inverted" one compared with naive top-to-bottom layering?',
        options: [
          'UI → Application',
          'Application → Domain',
          'Infrastructure → Domain (infrastructure implements interfaces the domain declares)',
          'Domain → UI',
        ],
        answer: 2,
        why: 'In naive layering the domain calls the database layer below it. With dependency inversion, the domain owns the interface and infrastructure depends on it.',
      },
      {
        q: 'ShopLane\'s "edit newsletter preferences" screen is pure CRUD with no rules. A teammate wants four layers, ports and aggregates for it. Best advice?',
        options: [
          'Yes, every feature must follow the same layering',
          'Use a simple transaction script or CRUD module there and save full layering for the parts with real domain logic',
          'Put it in the domain layer of the Order context',
          'Make it a microservice',
        ],
        answer: 1,
        why: 'Layering is a cost. Pay it where it protects valuable logic. Supporting or generic CRUD areas can be simple.',
      },
    ],
    exercise: {
      task: `<p>Write <code>findViolations(modules)</code>: a tiny dependency-rule checker like the ones
      CI tools run. Each module path starts with its layer (<code>ui/</code>,
      <code>application/</code>, <code>domain/</code>, <code>infrastructure/</code>). Imports that do
      not contain a <code>/</code> are third-party packages.</p>
      <ul>
        <li>Allowed layer arrows (strict): ui→application, application→domain,
        infrastructure→domain, infrastructure→application, and any layer → itself.</li>
        <li>Third-party packages are allowed only in <code>ui</code> and
        <code>infrastructure</code>.</li>
        <li>Return an array of strings <code>'from -> to'</code> in the order they appear.</li>
      </ul>`,
      starter: `const ALLOWED = {
  ui: ['ui', 'application'],
  application: ['application', 'domain'],
  domain: ['domain'],
  infrastructure: ['infrastructure', 'domain', 'application'],
};
const PACKAGES_OK = ['ui', 'infrastructure'];

function findViolations(modules) {
  const out = [];
  // TODO: for each [from, imports] in Object.entries(modules)
  //   - layer = from.split('/')[0]
  //   - for each imported path: package (no '/') or another layer?
  //   - push 'from -> to' when it breaks the rule
  return out;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const skyhop = {
  'ui/bookingRoutes': ['application/cancelBooking', 'express'],
  'application/cancelBooking': ['domain/booking', 'domain/bookingRepository'],
  'domain/booking': ['domain/money'],
  'domain/money': [],
  'infrastructure/pgBookingRepository': ['domain/bookingRepository', 'pg'],
  'infrastructure/emailNotifier': ['application/notifier', 'nodemailer'],
};
check('clean codebase has no violations', findViolations(skyhop), []);

const messy = {
  'domain/fareRules': ['axios', 'domain/money'],
  'domain/booking': ['infrastructure/pgBookingRepository'],
  'application/addBag': ['stripe', 'domain/booking'],
  'ui/adminRoutes': ['infrastructure/pgBookingRepository'],
  'application/cancelBooking': ['ui/bookingRoutes'],
};
check('finds all five violations', findViolations(messy), [
  'domain/fareRules -> axios',
  'domain/booking -> infrastructure/pgBookingRepository',
  'application/addBag -> stripe',
  'ui/adminRoutes -> infrastructure/pgBookingRepository',
  'application/cancelBooking -> ui/bookingRoutes',
]);
check('same layer is fine', findViolations({ 'domain/a': ['domain/b'] }), []);`,
      hint: 'const isPackage = !to.includes("/"); then ok = isPackage ? PACKAGES_OK.includes(layer) : ALLOWED[layer].includes(to.split("/")[0]).',
      solution: `const ALLOWED = {
  ui: ['ui', 'application'],
  application: ['application', 'domain'],
  domain: ['domain'],
  infrastructure: ['infrastructure', 'domain', 'application'],
};
const PACKAGES_OK = ['ui', 'infrastructure'];

function findViolations(modules) {
  const out = [];
  for (const [from, imports] of Object.entries(modules)) {
    const layer = from.split('/')[0];
    for (const to of imports) {
      const isPackage = !to.includes('/');
      const ok = isPackage
        ? PACKAGES_OK.includes(layer)
        : ALLOWED[layer].includes(to.split('/')[0]);
      if (!ok) out.push(from + ' -> ' + to);
    }
  }
  return out;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const skyhop = {
  'ui/bookingRoutes': ['application/cancelBooking', 'express'],
  'application/cancelBooking': ['domain/booking', 'domain/bookingRepository'],
  'domain/booking': ['domain/money'],
  'domain/money': [],
  'infrastructure/pgBookingRepository': ['domain/bookingRepository', 'pg'],
  'infrastructure/emailNotifier': ['application/notifier', 'nodemailer'],
};
check('clean codebase has no violations', findViolations(skyhop), []);

const messy = {
  'domain/fareRules': ['axios', 'domain/money'],
  'domain/booking': ['infrastructure/pgBookingRepository'],
  'application/addBag': ['stripe', 'domain/booking'],
  'ui/adminRoutes': ['infrastructure/pgBookingRepository'],
  'application/cancelBooking': ['ui/bookingRoutes'],
};
check('finds all five violations', findViolations(messy), [
  'domain/fareRules -> axios',
  'domain/booking -> infrastructure/pgBookingRepository',
  'application/addBag -> stripe',
  'ui/adminRoutes -> infrastructure/pgBookingRepository',
  'application/cancelBooking -> ui/bookingRoutes',
]);
check('same layer is fine', findViolations({ 'domain/a': ['domain/b'] }), []);`,
    },
  },
  // ───────────────────────────────────────────────────────────── hexagonal
  {
    id: 'hexagonal',
    section: 'Architecture',
    title: 'Hexagonal Architecture: Ports & Adapters',
    explain: `
      <p>Alistair Cockburn's <strong>hexagonal architecture</strong> (2005, also called
      <em>ports and adapters</em>) takes the dependency rule and drops the idea of "top" and
      "bottom". There is an <strong>inside</strong> (the application and domain) and an
      <strong>outside</strong> (everything else: HTTP, databases, payment providers, email, the test
      suite). The inside talks to the outside only through <strong>ports</strong>.</p>

      <h3>Vocabulary</h3>
      <ul>
        <li><strong>Port</strong>: an interface <em>owned by the inside</em>, named in domain
        language. <code>PaymentGateway.refund({ bookingRef, amount })</code>, not
        <code>stripe.refunds.create</code>.</li>
        <li><strong>Adapter</strong>: code outside the hexagon that implements a port for one
        technology: <code>StripePaymentGateway</code>, <code>PgBookingRepository</code>,
        <code>SesEmailNotifier</code>, <code>InMemoryBookingRepository</code>.</li>
        <li><strong>Driving (primary) side</strong>: things that <em>call</em> the app: REST
        controller, CLI, queue consumer, test. Their adapters call the use case.</li>
        <li><strong>Driven (secondary) side</strong>: things the app <em>calls</em>: DB, payments,
        notifications, clock. The use case calls their ports.</li>
      </ul>
      <pre><code>            driving side                         driven side
   REST controller ─┐                         ┌─► PgBookingRepository
   Queue consumer  ─┼─► [ CancelBooking ] ─ports─┼─► StripePaymentGateway
   Test            ─┘   [   Booking      ]       └─► Email / SMS notifier</code></pre>

      <h3>Why it matters</h3>
      <ul>
        <li><strong>Test without infrastructure.</strong> Plug in-memory adapters into the same use
        case. Tests run in milliseconds and need no Docker.</li>
        <li><strong>Swap vendors.</strong> Moving from Stripe to Adyen means a new adapter. The
        use case and domain don't change.</li>
        <li><strong>Defer decisions.</strong> You can build the cancel flow before anyone has picked
        the SMS provider.</li>
      </ul>

      <h3>Clean and Onion: same idea, different drawing</h3>
      <p>Jeffrey Palermo's <strong>Onion Architecture</strong> (2008) and Robert C. Martin's
      <strong>Clean Architecture</strong> (2012) draw the same thing as concentric circles: entities in
      the middle, use cases around them, interface adapters, then frameworks and drivers. All three
      share one rule: <em>source dependencies point inward</em>. The names differ, the intent is the
      same. Don't argue about which one you're doing. Check that the domain has no outward imports.</p>

      <div class="warn"><strong>Leaky ports.</strong> A port called
      <code>PaymentGateway.createStripeRefund(chargeId, metadata)</code> is a Stripe adapter
      pretending to be a port. Name ports after what the domain needs, and keep vendor ids, retries
      and error codes inside the adapter.</div>

      <div class="tip"><strong>In the real world:</strong> most teams don't create a port for
      everything. The ones that pay off are the volatile or slow ones: persistence, payments,
      messaging, notifications, the clock and third-party APIs. Pure helper libraries (date
      formatting, a validation library) usually get imported directly. Keep the number of adapters
      per port small: typically one production adapter plus one in-memory or fake adapter for tests.</div>
    `,
    examples: [
      {
        title: 'CancelBooking with swappable adapters',
        explain: `
          <details>
            <summary>The problem: a use case welded to its infrastructure</summary>
            <p>Here is the "obvious" version most codebases start with:</p>
            <pre><code>async function cancelBooking(ref) {
  const row = await pg.query('SELECT * FROM bookings WHERE ref=$1', [ref]);
  if (row.status === 'CANCELLED') throw new Error('already cancelled');
  await stripe.refunds.create({ charge: row.charge_id, amount: (row.paid - 30) * 100 });
  await pg.query('UPDATE bookings SET status=$1 WHERE ref=$2', ['CANCELLED', ref]);
  await twilio.messages.create({ to: row.phone, body: 'Cancelled' });
}</code></pre>
            <table>
              <tr><th>You want to…</th><th>What it costs here</th></tr>
              <tr><td>Test "can't cancel within 2h of departure"</td><td>A Postgres container, a Stripe test key, a Twilio mock, seeded rows. Seconds per test.</td></tr>
              <tr><td>Add email alongside SMS</td><td>Edit the use case. Every channel change touches business code.</td></tr>
              <tr><td>Switch Stripe → another provider</td><td>Hunt every <code>stripe.*</code> call across the codebase.</td></tr>
              <tr><td>Read the business rule</td><td>It's buried between SQL and SDK calls; the 2h rule isn't even there yet.</td></tr>
            </table>
            <p>In the example, the rule moved into <code>Booking.cancel(now)</code> and the use case
            only talks to four ports: <code>bookings</code>, <code>payments</code>,
            <code>notifier</code>, <code>clock</code>.</p>
          </details>
          <details>
            <summary>Step by step: wiring A (fake Stripe + email + SMS)</summary>
            <p>NOW is 1 Nov 2026 09:00. PNR-0001 departs in 72h and paid A$129. PNR-0002 departs in 30h and paid A$89.</p>
            <table>
              <tr><th>Call</th><th>Inside the hexagon</th><th>Adapters</th><th>Console</th></tr>
              <tr><td><code>cancelA('PNR-0001')</code></td><td>① load → ② <code>cancel()</code>: 72h ≥ 2h, status → CANCELLED, refund 129 − 30 = <strong>99</strong></td><td>③ FakeStripe converts to cents (9900) and mints <code>re_0001</code>; ④ save; email + SMS composite</td><td><code>[stripe] POST /v1/refunds amount=9900 metadata.pnr=PNR-0001 → re_0001</code><br><code>[email] to ana@mail.test: …refund A$99</code><br><code>[sms] to +61400000001: …</code><br><code>cancel PNR-0001 → {"ref":"PNR-0001","status":"CANCELLED","refund":99,"refundId":"re_0001"}</code></td></tr>
              <tr><td><code>cancelA('PNR-0001')</code> again</td><td>② throws <code>AlreadyCancelled</code> before any adapter is touched</td><td>none</td><td><code>cancel PNR-0001 again → AlreadyCancelled: PNR-0001 is already cancelled</code></td></tr>
              <tr><td><code>stripe.down = true</code>, <code>cancelA('PNR-0002')</code></td><td>② succeeds <em>in memory</em> (refund 59)</td><td>③ adapter throws <code>PaymentFailed</code>, so ④ save never runs</td><td><code>cancel PNR-0002 (stripe down) → PaymentFailed: stripe: 503 service unavailable</code><br><code>PNR-0002 stored status: CONFIRMED</code></td></tr>
            </table>
            <p>Notice the use case never mentions cents, <code>re_</code> ids, or how many channels
            exist. Those are adapter details. The composite <code>both(email, sms)</code> is still
            just a <code>Notifier</code>, so the use case can't tell there are two.</p>
          </details>
          <details>
            <summary>Step by step: wiring B (the same use case, zero infrastructure)</summary>
            <table>
              <tr><th>Call</th><th>What happens</th><th>Console</th></tr>
              <tr><td><code>cancelB('PNR-0002')</code></td><td>30h left → refund 89 − 30 = 59. The recording gateway stores the call and returns <code>test-1</code>.</td><td><code>cancel PNR-0002 → {"ref":"PNR-0002","status":"CANCELLED","refund":59,"refundId":"test-1"}</code></td></tr>
              <tr><td><code>cancelB('PNR-0003')</code></td><td>Departs in 1h → <code>CancellationClosed</code> thrown at ②. No refund, no save, no message.</td><td><code>cancel PNR-0003 (1h to go) → CancellationClosed: cancellation closes 2h before departure (1.0h left)</code></td></tr>
              <tr><td>inspect doubles</td><td>Assert on what was <em>asked for</em>, not on HTTP traffic</td><td><code>refund calls: [{"bookingRef":"PNR-0002","amount":59}]</code><br><code>messages: ["SkyHop: PNR-0002 cancelled, refund A$59"]</code><br><code>PNR-0003 stored status: CONFIRMED</code></td></tr>
            </table>
            <p>This is the hexagonal payoff: <code>makeCancelBooking</code> ran unchanged in both
            wirings. A real test suite would do exactly wiring B, with <code>check()</code> calls on
            <code>payments.calls</code> and <code>notifier.sent</code>. The clock is a port too,
            which is why "1h to go" is deterministic instead of depending on when you run it.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Swap the order of ③ and ④ (save before refund) and rerun wiring A. With Stripe down,
              PNR-0002 is now stored as <code>CANCELLED</code> with no refund. Neither order is safe
              on its own. Real systems make the refund idempotent (keyed by PNR) and retry it, or
              record a <code>BookingCancelled</code> event in an outbox and refund asynchronously.</li>
              <li>Add a <code>PushNotifier</code> adapter and pass <code>both(new EmailNotifier(), new PushNotifier())</code>. The use case doesn't change.</li>
              <li>Change <code>CANCEL_FEE</code> to 100 and rerun: PNR-0002 (paid A$89) now gets <code>refund: 0</code> in wiring B thanks to <code>Math.max</code>, instead of a negative refund.</li>
            </ul>
            <div class="tip">The in-memory repo returns a <em>copy</em> on every read
            (<code>new Booking({ ...row })</code>). That's deliberate: if it returned the same
            object, the failed PNR-0002 cancel would have mutated "the database" even though
            <code>save()</code> never ran, and your tests would lie to you.</div>
          </details>
        `,
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
class AlreadyCancelled extends DomainError {}
class CancellationClosed extends DomainError {}
class PaymentFailed extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentFailed';
  }
}

const HOUR = 3600 * 1000;
const CANCEL_FEE = 30;

// ═══ INSIDE THE HEXAGON ═══════════════════════════════════════
class Booking {
  constructor({ ref, email, phone, paid, departsAt, status = 'CONFIRMED' }) {
    Object.assign(this, { ref, email, phone, paid, departsAt, status });
  }
  // Returns the refund amount. All the rules are here, not in the use case.
  cancel(now) {
    if (this.status === 'CANCELLED') throw new AlreadyCancelled(this.ref + ' is already cancelled');
    const hoursLeft = (this.departsAt - now) / HOUR;
    if (hoursLeft < 2) {
      throw new CancellationClosed('cancellation closes 2h before departure (' +
        hoursLeft.toFixed(1) + 'h left)');
    }
    this.status = 'CANCELLED';
    return Math.max(0, this.paid - CANCEL_FEE);
  }
}

// Ports the use case needs (shapes, owned by the inside):
//   BookingRepository { findByRef(ref), save(booking) }
//   PaymentGateway    { refund({ bookingRef, amount }) -> { refundId } }
//   Notifier          { send({ booking, text }) }
//   Clock             { now() }
function makeCancelBooking({ bookings, payments, notifier, clock }) {
  return async function cancelBooking(ref) {
    const booking = await bookings.findByRef(ref);                        // ①
    const refund = booking.cancel(clock.now());                           // ②
    const { refundId } = await payments.refund({ bookingRef: ref, amount: refund }); // ③
    await bookings.save(booking);                                         // ④
    await notifier.send({ booking, text: 'SkyHop: ' + ref + ' cancelled, refund A$' + refund });
    return { ref, status: booking.status, refund, refundId };
  };
}

// ═══ OUTSIDE: ADAPTERS ════════════════════════════════════════
class InMemoryBookingRepository {
  #rows = new Map();
  async findByRef(ref) {
    return new Booking({ ...this.#rows.get(ref) });   // fresh copy, like a DB read
  }
  async save(booking) {
    this.#rows.set(booking.ref, { ...booking });
  }
  statusOf(ref) {
    return this.#rows.get(ref).status;
  }
}

// Pretends to be a Stripe-like API: cents, its own ids, can go down.
class FakeStripeGateway {
  #seq = 0;
  down = false;
  async refund({ bookingRef, amount }) {
    if (this.down) throw new PaymentFailed('stripe: 503 service unavailable');
    const id = 're_' + String(++this.#seq).padStart(4, '0');
    console.log('  [stripe] POST /v1/refunds amount=' + amount * 100 +
      ' metadata.pnr=' + bookingRef + ' → ' + id);
    return { refundId: id };
  }
}

class EmailNotifier {
  async send({ booking, text }) {
    console.log('  [email] to ' + booking.email + ': ' + text);
  }
}
class SmsNotifier {
  async send({ booking, text }) {
    console.log('  [sms] to ' + booking.phone + ': ' + text.slice(0, 160));
  }
}
// A composite is still just a Notifier.
const both = (...ns) => ({ send: async (msg) => { for (const n of ns) await n.send(msg); } });

// Test doubles: record calls, no I/O, no console noise.
const recordingPayments = () => {
  const calls = [];
  return { calls, refund: async (r) => (calls.push(r), { refundId: 'test-' + calls.length }) };
};
const recordingNotifier = () => {
  const sent = [];
  return { sent, send: async ({ text }) => sent.push(text) };
};

// ═══ DEMO ═════════════════════════════════════════════════════
const NOW = Date.UTC(2026, 10, 1, 9, 0);   // 1 Nov 2026 09:00
const seed = (repo) => {
  repo.save(new Booking({ ref: 'PNR-0001', email: 'ana@mail.test', phone: '+61400000001',
    paid: 129, departsAt: NOW + 72 * HOUR }));
  repo.save(new Booking({ ref: 'PNR-0002', email: 'ben@mail.test', phone: '+61400000002',
    paid: 89, departsAt: NOW + 30 * HOUR }));
  repo.save(new Booking({ ref: 'PNR-0003', email: 'cy@mail.test', phone: '+61400000003',
    paid: 59, departsAt: NOW + 1 * HOUR }));
};
const clock = { now: () => NOW };

async function attempt(label, fn) {
  try {
    console.log(label, '→', await fn());
  } catch (e) {
    console.log(label, '→', e.name + ': ' + e.message);
  }
}

// Wiring A: "staging" adapters
console.log('── wiring A: fake Stripe + email + SMS ──');
const repoA = new InMemoryBookingRepository();
seed(repoA);
const stripe = new FakeStripeGateway();
const cancelA = makeCancelBooking({
  bookings: repoA, payments: stripe, notifier: both(new EmailNotifier(), new SmsNotifier()), clock,
});
await attempt('cancel PNR-0001', () => cancelA('PNR-0001'));
await attempt('cancel PNR-0001 again', () => cancelA('PNR-0001'));
stripe.down = true;
await attempt('cancel PNR-0002 (stripe down)', () => cancelA('PNR-0002'));
console.log('PNR-0002 stored status:', repoA.statusOf('PNR-0002'));

// Wiring B: the SAME use case, zero infrastructure
console.log('── wiring B: in-memory test doubles ──');
const repoB = new InMemoryBookingRepository();
seed(repoB);
const payments = recordingPayments();
const notifier = recordingNotifier();
const cancelB = makeCancelBooking({ bookings: repoB, payments, notifier, clock });
await attempt('cancel PNR-0002', () => cancelB('PNR-0002'));
await attempt('cancel PNR-0003 (1h to go)', () => cancelB('PNR-0003'));
console.log('refund calls:', payments.calls);
console.log('messages:', notifier.sent);
console.log('PNR-0003 stored status:', repoB.statusOf('PNR-0003'));`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop is switching SMS providers from one vendor to another. With ports and adapters done right, what changes?',
        options: [
          'The CancelBooking use case and the Booking aggregate',
          'Only a new Notifier adapter and one line in the composition root',
          'Every test that sends notifications',
          'The Notifier port gains a vendorName parameter',
        ],
        answer: 1,
        why: 'The port speaks domain language (send a message to the passenger). Vendor details live in the adapter, so only the adapter and the wiring change.',
      },
      {
        q: 'Which of these is a well-designed driven port for SkyHop payments?',
        options: [
          '<code>stripeClient.refunds.create({ charge, amount_cents, metadata })</code>',
          '<code>PaymentGateway.refund({ bookingRef, amount }) → { refundId }</code>',
          '<code>Http.post(url, body)</code>',
          '<code>PaymentGateway.execute(sql)</code>',
        ],
        answer: 1,
        why: 'A port is named in the inside\'s language and hides the vendor. Cents conversion, charge ids and HTTP belong in the adapter.',
      },
      {
        q: 'In the example, the use case runs refund before save. Stripe is down for PNR-0002. What state is the booking in afterwards, and why is that useful?',
        options: [
          'CANCELLED with no refund: the customer loses money',
          'CONFIRMED: the change was never saved, so the user can simply retry',
          'Deleted from the repository',
          'It depends on the SMS adapter',
        ],
        answer: 1,
        why: 'booking.cancel() only changed the in-memory copy. The refund threw before save(), so nothing was persisted. (The reverse failure, refund succeeds then save fails, needs an outbox or idempotent refund keyed by PNR.)',
      },
      {
        q: 'Your team argues whether the codebase is "Clean" or "Hexagonal". What actually matters?',
        options: [
          'Using the exact folder names from the book',
          'Having exactly six sides of adapters',
          'That source dependencies point inward and the domain/use cases can run without frameworks',
          'Having one microservice per circle',
        ],
        answer: 2,
        why: 'Hexagonal, Onion and Clean Architecture share the same rule. The drawing differs; the dependency direction is the point.',
      },
    ],
    exercise: {
      task: `<p>SkyHop's old payment provider <code>legacyPay</code> has an awkward API:
      <code>legacyPay.reverse(cents, reference)</code> returns a <strong>string</strong>, either
      <code>'OK:&lt;id&gt;'</code> or <code>'ERR:&lt;reason&gt;'</code>. Write
      <code>LegacyPayAdapter</code> so it satisfies SkyHop's <code>PaymentGateway</code> port:</p>
      <ul>
        <li><code>async refund({ bookingRef, amount })</code> converts dollars to cents (round to
        integer) and calls <code>reverse</code>.</li>
        <li>On <code>OK:</code> return <code>{ refundId: '&lt;id&gt;' }</code>.</li>
        <li>On <code>ERR:</code> throw <code>PaymentFailed</code> with the reason as message.</li>
        <li>If <code>amount</code> is 0, don't call the provider. Return
        <code>{ refundId: null }</code>.</li>
      </ul>
      <p>The use case and the checks are already written and must not change.</p>`,
      starter: `class PaymentFailed extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentFailed';
  }
}

// The awkward vendor SDK (don't change it)
const legacyPay = {
  calls: [],
  reverse(cents, reference) {
    this.calls.push([cents, reference]);
    if (reference === 'PNR-FAIL') return 'ERR:card expired';
    return 'OK:LP' + (1000 + this.calls.length);
  },
};

class LegacyPayAdapter {
  constructor(sdk) {
    this.sdk = sdk;
  }
  async refund({ bookingRef, amount }) {
    // TODO: translate the port call into the vendor call and back
    return { refundId: undefined };
  }
}

// ── the use case only knows the PORT ──
async function refundBooking(payments, booking) {
  const { refundId } = await payments.refund({ bookingRef: booking.ref, amount: booking.refund });
  return booking.ref + ' refunded with ' + refundId;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
async function expectThrows(name, fn, type) {
  try {
    await fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = !type || e instanceof type;
    console.log(ok ? '✅' : '❌', name, ok ? '(' + e.message + ')' : '→ wrong error ' + e.name);
  }
}

const adapter = new LegacyPayAdapter(legacyPay);
check('OK maps to refundId', await adapter.refund({ bookingRef: 'PNR-0001', amount: 99 }),
  { refundId: 'LP1001' });
check('dollars become cents', legacyPay.calls[0], [9900, 'PNR-0001']);
check('fractional dollars rounded', (await adapter.refund({ bookingRef: 'PNR-0002', amount: 19.99 }),
  legacyPay.calls[1]), [1999, 'PNR-0002']);
await expectThrows('ERR becomes PaymentFailed',
  () => adapter.refund({ bookingRef: 'PNR-FAIL', amount: 10 }), PaymentFailed);
const before = legacyPay.calls.length;
check('zero refund skips provider', await adapter.refund({ bookingRef: 'PNR-0003', amount: 0 }),
  { refundId: null });
check('…and really made no call', legacyPay.calls.length, before);
check('use case works through the port',
  await refundBooking(adapter, { ref: 'PNR-0004', refund: 50 }), 'PNR-0004 refunded with LP1004');`,
      hint: 'const res = this.sdk.reverse(Math.round(amount * 100), bookingRef); const [status, rest] = [res.slice(0, 3), res.slice(4)]; Remember the amount === 0 early return.',
      solution: `class PaymentFailed extends Error {
  constructor(message) {
    super(message);
    this.name = 'PaymentFailed';
  }
}

// The awkward vendor SDK (don't change it)
const legacyPay = {
  calls: [],
  reverse(cents, reference) {
    this.calls.push([cents, reference]);
    if (reference === 'PNR-FAIL') return 'ERR:card expired';
    return 'OK:LP' + (1000 + this.calls.length);
  },
};

class LegacyPayAdapter {
  constructor(sdk) {
    this.sdk = sdk;
  }
  async refund({ bookingRef, amount }) {
    if (amount === 0) return { refundId: null };
    const res = this.sdk.reverse(Math.round(amount * 100), bookingRef);
    const status = res.slice(0, res.indexOf(':'));
    const rest = res.slice(res.indexOf(':') + 1);
    if (status !== 'OK') throw new PaymentFailed(rest);
    return { refundId: rest };
  }
}

// ── the use case only knows the PORT ──
async function refundBooking(payments, booking) {
  const { refundId } = await payments.refund({ bookingRef: booking.ref, amount: booking.refund });
  return booking.ref + ' refunded with ' + refundId;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
async function expectThrows(name, fn, type) {
  try {
    await fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = !type || e instanceof type;
    console.log(ok ? '✅' : '❌', name, ok ? '(' + e.message + ')' : '→ wrong error ' + e.name);
  }
}

const adapter = new LegacyPayAdapter(legacyPay);
check('OK maps to refundId', await adapter.refund({ bookingRef: 'PNR-0001', amount: 99 }),
  { refundId: 'LP1001' });
check('dollars become cents', legacyPay.calls[0], [9900, 'PNR-0001']);
check('fractional dollars rounded', (await adapter.refund({ bookingRef: 'PNR-0002', amount: 19.99 }),
  legacyPay.calls[1]), [1999, 'PNR-0002']);
await expectThrows('ERR becomes PaymentFailed',
  () => adapter.refund({ bookingRef: 'PNR-FAIL', amount: 10 }), PaymentFailed);
const before = legacyPay.calls.length;
check('zero refund skips provider', await adapter.refund({ bookingRef: 'PNR-0003', amount: 0 }),
  { refundId: null });
check('…and really made no call', legacyPay.calls.length, before);
check('use case works through the port',
  await refundBooking(adapter, { ref: 'PNR-0004', refund: 50 }), 'PNR-0004 refunded with LP1004');`,
    },
  },
  // ───────────────────────────────────────────────────────────── application-services
  {
    id: 'application-services',
    section: 'Architecture',
    title: 'Application Services & Use Cases',
    explain: `
      <p>An <strong>application service</strong> (also called a <em>use case</em> or
      <em>command handler</em>) is the entry point for one thing a user or system wants to do:
      <em>add a bag</em>, <em>change seat</em>, <em>cancel booking</em>. It is the conductor. It
      doesn't play any instrument itself.</p>

      <h3>The shape of almost every command handler</h3>
      <pre><code>async handle(cmd, user) {
  const booking = await bookings.get(cmd.ref);  // ① load ONE aggregate
  authorize(user, booking);                     // ② who may do this? (app concern)
  booking.addBag(cmd.passengerId, cmd.weightKg);// ③ call behaviour: rules live in the domain
  await bookings.save(booking);                 // ④ one transaction, optimistic version check
  await bus.publish(booking.pullEvents());      // ⑤ publish after commit (or via outbox)
  return toDto(booking);                        // ⑥ map to a DTO, never leak the entity
}</code></pre>

      <h3>What belongs here vs in the domain</h3>
      <table>
        <tr><th>Application service</th><th>Domain (aggregate / domain service)</th></tr>
        <tr><td>Authorization: "is this user the booking owner or an agent?"</td><td>Invariants: "max 2 bags per passenger", "bag ≤ 32 kg"</td></tr>
        <tr><td>Transactions, retries, idempotency keys</td><td>State transitions: CONFIRMED → CANCELLED</td></tr>
        <tr><td>Loading/saving via repositories</td><td>Raising domain events (<code>BagAdded</code>)</td></tr>
        <tr><td>DTO ↔ command mapping, input parsing</td><td>Calculations with domain meaning (refund amount)</td></tr>
        <tr><td>Calling other contexts' APIs / ports</td><td>Nothing about HTTP, users, sessions</td></tr>
      </table>
      <p>A quick test: <em>if the same rule must hold when the call comes from the mobile app, the
      call centre and a batch job, it belongs in the domain.</em> Authorization is the classic
      exception. "Only agents can waive fees" depends on <em>who</em> calls, so it sits in the
      application layer (or a policy object it calls).</p>

      <h3>Commands are objects</h3>
      <p>A <strong>command</strong> is a plain, immutable description of intent:
      <code>{ type: 'AddBag', bookingRef, passengerId, weightKg }</code>. Named in the imperative,
      validated for shape at the edge, handled by exactly one handler. Command objects make
      logging, queuing, retrying and idempotency easy, because you can store and replay them.</p>

      <h3>One aggregate per transaction</h3>
      <p>Vernon's rule: a command modifies <strong>one aggregate instance</strong> in one
      transaction. If cancelling a booking must also release seats in Inventory and credit Loyalty,
      the handler saves the Booking and publishes <code>BookingCancelled</code>. Other handlers
      update the other aggregates in their own transactions (eventual consistency).</p>

      <div class="warn"><strong>Anti-pattern: the fat service.</strong> When <code>if</code>
      statements about bags, fares and seats creep into the handler, the aggregate becomes a data bag
      (anemic model) and the rule gets copy-pasted into every other handler. The next handler written
      by someone else forgets it. Example 2 shows exactly that.</div>

      <div class="tip"><strong>In the real world:</strong> handlers are short, often 10 to 20 lines. If
      yours is 200 lines, look for rules to push into aggregates, value objects or a domain service.
      Many teams use a <em>mediator</em> or command bus so cross-cutting concerns (logging, auth,
      transactions) wrap every handler once instead of being repeated in each.</div>
    `,
    examples: [
      {
        title: 'AddBag handler: load → authorize → behave → save → publish → DTO',
        explain: `
          <details>
            <summary>Step by step: the four sequential commands</summary>
            <table>
              <tr><th>Command</th><th>Who stops it</th><th>Stored version after</th><th>Console</th></tr>
              <tr><td>ana, P1 20kg</td><td>passes ② auth and ③ rules</td><td>v1 → v2</td><td><code>[bus] {"type":"BagAdded",…"weightKg":20}</code><br><code>ana adds 20kg for P1 → {"ref":"PNR-0001","bags":1}</code></td></tr>
              <tr><td>mallory, P1 5kg</td><td>② application layer: not owner, not agent</td><td>v2</td><td><code>mallory adds a bag → Forbidden: mallory may not change PNR-0001</code></td></tr>
              <tr><td>agent-7, P1 15kg</td><td>passes (agents may act on any booking)</td><td>v2 → v3</td><td><code>agent adds 2nd bag for P1 → {"ref":"PNR-0001","bags":2}</code></td></tr>
              <tr><td>ana, P1 10kg</td><td>③ domain: P1 already has 2 bags</td><td>v3</td><td><code>ana adds 3rd bag for P1 → BagLimitExceeded: P1 already has 2 bags</code></td></tr>
            </table>
            <p>Two different kinds of "no": <code>Forbidden</code> comes from the handler (it depends on
            <em>who</em> asks), <code>BagLimitExceeded</code> from the aggregate (it's true no matter who
            asks). Neither failed command reached <code>save()</code> or the bus.</p>
          </details>
          <details>
            <summary>Step by step: the race, and why it's the repository that catches it</summary>
            <table>
              <tr><th>Tick</th><th>phone app</th><th>web app</th><th>Stored</th></tr>
              <tr><td>1</td><td><code>get()</code> → copy at v3, P2 has 0 bags</td><td><code>get()</code> → copy at v3, P2 has 0 bags</td><td>v3</td></tr>
              <tr><td>2</td><td><code>addBag</code> ✓ (rule sees 0 bags)</td><td><code>addBag</code> ✓ (rule sees 0 bags)</td><td>v3</td></tr>
              <tr><td>3</td><td><code>save()</code>: stored v3 = loaded v3 → commit</td><td></td><td><strong>v4</strong></td></tr>
              <tr><td>4</td><td>publish <code>BagAdded</code></td><td><code>save()</code>: stored v4 ≠ loaded v3 → throw</td><td>v4</td></tr>
            </table>
            <p>Console (the web line prints first because its failure resolves one tick before the phone's publish finishes):</p>
            <pre><code>[bus] {"type":"BagAdded","ref":"PNR-0001","passengerId":"P2","weightKg":23}
web app:   P2 23kg → ConcurrencyError: PNR-0001 changed since load (v3 vs v4)
phone app: P2 23kg → {"ref":"PNR-0001","bags":3}
final P2 bags: 1</code></pre>
            <p>Here both requests were legal on their own (P2 may have 2 bags), but the same
            mechanism protects the "max 2" rule when P2 already has 1 bag: without the version check,
            both copies would see 1 bag, both would pass, and the last write would silently win (or
            produce 3 bags). The aggregate guards the rule <em>within</em> one copy. The version check
            guards it <em>across</em> concurrent copies.</p>
            <div class="tip">A common handler policy: on <code>ConcurrencyError</code>, reload and
            retry the whole command once or twice. That's safe because the command is a plain object
            you can re-run, and the rules are re-checked on fresh state.</div>
          </details>
        `,
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
class BagLimitExceeded extends DomainError {}
class Forbidden extends Error {
  constructor(m) { super(m); this.name = 'Forbidden'; }
}
class ConcurrencyError extends Error {
  constructor(m) { super(m); this.name = 'ConcurrencyError'; }
}

// ── DOMAIN: the rules ──
class Booking {
  #events = [];
  constructor({ ref, ownerId, passengers, bags = [], version = 0 }) {
    Object.assign(this, { ref, ownerId, passengers, bags, version });
  }
  addBag(passengerId, weightKg) {
    if (!this.passengers.includes(passengerId)) {
      throw new DomainError(passengerId + ' is not on ' + this.ref);
    }
    if (weightKg > 32) throw new DomainError('bags over 32 kg must go as cargo');
    const mine = this.bags.filter((b) => b.passengerId === passengerId);
    if (mine.length >= 2) throw new BagLimitExceeded(passengerId + ' already has 2 bags');
    this.bags.push({ passengerId, weightKg });
    this.#events.push({ type: 'BagAdded', ref: this.ref, passengerId, weightKg });
  }
  pullEvents() {
    const out = this.#events;
    this.#events = [];
    return out;
  }
}

// ── INFRASTRUCTURE: repo with optimistic concurrency ──
class InMemoryBookings {
  #rows = new Map();
  async get(ref) {
    await null; // pretend I/O, lets other requests interleave
    return new Booking(structuredClone(this.#rows.get(ref)));
  }
  async save(b) {
    await null;
    const stored = this.#rows.get(b.ref);
    if (stored && stored.version !== b.version) {
      throw new ConcurrencyError(b.ref + ' changed since load (v' + b.version +
        ' vs v' + stored.version + ')');
    }
    const { ref, ownerId, passengers, bags } = b;
    this.#rows.set(ref, { ref, ownerId, passengers, bags, version: b.version + 1 });
  }
}
const bus = { publish: async (evts) => evts.forEach((e) => console.log('  [bus]', e)) };

// ── APPLICATION: command + handler ──
const AddBag = (data) => Object.freeze({ type: 'AddBag', ...data });

class AddBagHandler {
  constructor({ bookings, bus }) {
    this.bookings = bookings;
    this.bus = bus;
  }
  async handle(cmd, user) {
    const booking = await this.bookings.get(cmd.bookingRef);                 // ①
    if (user.role !== 'agent' && user.id !== booking.ownerId) {              // ②
      throw new Forbidden(user.id + ' may not change ' + cmd.bookingRef);
    }
    booking.addBag(cmd.passengerId, cmd.weightKg);                          // ③
    await this.bookings.save(booking);                                      // ④
    await this.bus.publish(booking.pullEvents());                           // ⑤
    return { ref: booking.ref, bags: booking.bags.length };                 // ⑥
  }
}

// ── DEMO ──
const bookings = new InMemoryBookings();
await bookings.save(new Booking({ ref: 'PNR-0001', ownerId: 'ana', passengers: ['P1', 'P2'] }));
const handler = new AddBagHandler({ bookings, bus });
const ana = { id: 'ana', role: 'customer' };

async function run(label, cmd, user) {
  try {
    console.log(label, '→', await handler.handle(cmd, user));
  } catch (e) {
    console.log(label, '→', e.name + ': ' + e.message);
  }
}

await run('ana adds 20kg for P1', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P1', weightKg: 20 }), ana);
await run('mallory adds a bag', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P1', weightKg: 5 }),
  { id: 'mallory', role: 'customer' });
await run('agent adds 2nd bag for P1', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P1', weightKg: 15 }),
  { id: 'agent-7', role: 'agent' });
await run('ana adds 3rd bag for P1', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P1', weightKg: 10 }), ana);

// Two requests for P2 race: both load v3, both pass the rule, only one may commit.
console.log('── concurrent requests ──');
await Promise.all([
  run('phone app: P2 23kg', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P2', weightKg: 23 }), ana),
  run('web app:   P2 23kg', AddBag({ bookingRef: 'PNR-0001', passengerId: 'P2', weightKg: 23 }), ana),
]);
console.log('final P2 bags:', (await bookings.get('PNR-0001')).bags.filter((b) => b.passengerId === 'P2').length);`,
      },
      {
        title: 'Anti-pattern: the rule lives in the service, so a second service forgets it',
        code: `// Anemic Booking: just data. All rules are in services.
const db = { 'PNR-0002': { ref: 'PNR-0002', bags: [{ pax: 'P1', kg: 20 }, { pax: 'P1', kg: 18 }] } };

// Written by the web team in 2023, has the 2-bag rule.
const WebBaggageService = {
  addBag(ref, pax, kg) {
    const b = db[ref];
    if (b.bags.filter((x) => x.pax === pax).length >= 2) throw new Error('max 2 bags');
    if (kg > 32) throw new Error('too heavy');
    b.bags.push({ pax, kg });
  },
};

// Written by the call-centre team in 2025. Copied half the checks.
const CallCentreBaggageService = {
  addBag(ref, pax, kg) {
    const b = db[ref];
    if (kg > 32) throw new Error('too heavy');
    b.bags.push({ pax, kg }); // the 2-bag rule was forgotten
  },
};

try {
  WebBaggageService.addBag('PNR-0002', 'P1', 10);
} catch (e) {
  console.log('web:', e.message);
}
CallCentreBaggageService.addBag('PNR-0002', 'P1', 10);
console.log('call centre: accepted. P1 now has', db['PNR-0002'].bags.length, 'bags ❌ invariant broken');

// Fix: the rule moves into the aggregate. Every entry point gets it for free.
class Booking {
  constructor(bags) {
    this.bags = bags;
  }
  addBag(pax, kg) {
    if (this.bags.filter((x) => x.pax === pax).length >= 2) throw new Error('max 2 bags');
    if (kg > 32) throw new Error('too heavy');
    this.bags.push({ pax, kg });
  }
}
const fixed = new Booking([{ pax: 'P1', kg: 20 }, { pax: 'P1', kg: 18 }]);
for (const channel of ['web', 'call centre', 'batch import']) {
  try {
    fixed.addBag('P1', 10);
  } catch (e) {
    console.log(channel + ' (rich model):', e.message, '✅');
  }
}`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop rule: "only agents may waive the change fee". Where should the check live?',
        options: [
          'In the Booking aggregate, as booking.waiveFee(user)',
          'In the application service (or a policy it calls), because it depends on who is calling',
          'In the database as a trigger',
          'In the React component that shows the button',
        ],
        answer: 1,
        why: 'Authorization depends on the caller, which is an application concern. The domain can still expose waiveFee(), but the handler decides who may call it. Hiding the button in the UI is a UX nicety, not security.',
      },
      {
        q: 'A CancelBooking handler saves the Booking, then also loads and updates the Flight\'s seat inventory and the passenger\'s LoyaltyAccount in the same transaction. What is the DDD-friendly alternative?',
        options: [
          'Merge Booking, Flight and LoyaltyAccount into one aggregate',
          'Save only the Booking and publish BookingCancelled; Inventory and Loyalty react in their own transactions',
          'Use a bigger database lock',
          'Move all three updates into the Booking constructor',
        ],
        answer: 1,
        why: 'One aggregate per transaction keeps aggregates small and contention low. Other aggregates (often in other contexts) become eventually consistent via events.',
      },
      {
        q: 'Why does AddBagHandler return <code>{ ref, bags }</code> instead of the Booking object?',
        options: [
          'Objects cannot be returned from async functions',
          'To keep the domain model from leaking to callers who could mutate it or couple to its internals',
          'Because the Booking is too big to serialize',
          'It is required by the HTTP spec',
        ],
        answer: 1,
        why: 'DTOs decouple the outside from the model. Controllers serialize the DTO, and the aggregate stays free to change shape.',
      },
      {
        q: 'In example 1, the phone and web app both add a bag for P2 at the same moment. Why does exactly one fail?',
        options: [
          'The domain rule rejects the second bag',
          'Both loaded version 3; the first save bumped it to 4, so the second save failed the optimistic version check',
          'Promise.all always rejects the second promise',
          'The bus refused a duplicate event',
        ],
        answer: 1,
        why: 'Each request saw P2 with 0 bags, so the rule passed in both. The repository\'s version check is what serializes concurrent writes to one aggregate. The loser can reload and retry.',
      },
    ],
    exercise: {
      task: `<p>Write <code>ChangeSeatHandler.handle(cmd, user)</code> for SkyHop. The
      <code>Booking.changeSeat</code> rule and the repository are done. Your handler must:</p>
      <ol>
        <li>Load the booking. If the repo returns <code>null</code>, throw <code>NotFound</code>.</li>
        <li>Authorize: allowed if <code>user.role === 'agent'</code> or
        <code>user.id === booking.ownerId</code>. Otherwise throw <code>Forbidden</code>.</li>
        <li>Call <code>booking.changeSeat(cmd.passengerId, cmd.seat)</code>. Don't re-implement its rules.</li>
        <li>Save, then publish <code>booking.pullEvents()</code> on the bus.</li>
        <li>Return the DTO <code>{ ref, seats }</code> where <code>seats</code> is the booking's
        <code>seats</code> object.</li>
      </ol>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class SeatTaken extends DomainError {}
class NotFound extends Error {
  constructor(m) { super(m); this.name = 'NotFound'; }
}
class Forbidden extends Error {
  constructor(m) { super(m); this.name = 'Forbidden'; }
}

class Booking {
  #events = [];
  constructor({ ref, ownerId, seats }) {
    Object.assign(this, { ref, ownerId, seats: { ...seats } });
  }
  changeSeat(passengerId, seat) {
    if (!(passengerId in this.seats)) throw new DomainError(passengerId + ' not on booking');
    if (!/^[0-9]{1,2}[A-F]$/.test(seat)) throw new DomainError('bad seat ' + seat);
    const holder = Object.keys(this.seats).find((p) => this.seats[p] === seat);
    if (holder && holder !== passengerId) throw new SeatTaken(seat + ' is taken by ' + holder);
    this.seats[passengerId] = seat;
    this.#events.push({ type: 'SeatChanged', ref: this.ref, passengerId, seat });
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
}

const rows = new Map([['PNR-0001', { ref: 'PNR-0001', ownerId: 'ana', seats: { P1: '12A', P2: '12B' } }]]);
const bookings = {
  saves: 0,
  async get(ref) {
    return rows.has(ref) ? new Booking(rows.get(ref)) : null;
  },
  async save(b) {
    this.saves++;
    rows.set(b.ref, { ref: b.ref, ownerId: b.ownerId, seats: { ...b.seats } });
  },
};
const published = [];
const bus = { publish: async (evts) => published.push(...evts) };

class ChangeSeatHandler {
  constructor({ bookings, bus }) {
    this.bookings = bookings;
    this.bus = bus;
  }
  async handle(cmd, user) {
    // TODO: load (NotFound) → authorize (Forbidden) → changeSeat → save → publish → DTO
    return null;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
async function expectThrows(name, fn, type) {
  try {
    await fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = !type || e instanceof type;
    console.log(ok ? '✅' : '❌', name, ok ? '(' + e.message + ')' : '→ wrong error ' + e.name);
  }
}

const h = new ChangeSeatHandler({ bookings, bus });
const ana = { id: 'ana', role: 'customer' };
const cmd = (passengerId, seat, ref = 'PNR-0001') =>
  Object.freeze({ type: 'ChangeSeat', bookingRef: ref, passengerId, seat });

check('owner changes seat → DTO', await h.handle(cmd('P1', '14C'), ana),
  { ref: 'PNR-0001', seats: { P1: '14C', P2: '12B' } });
check('saved once', bookings.saves, 1);
check('event published', published, [{ type: 'SeatChanged', ref: 'PNR-0001', passengerId: 'P1', seat: '14C' }]);
check('agent may change too', (await h.handle(cmd('P2', '14D'), { id: 'a1', role: 'agent' }))?.seats?.P2, '14D');
await expectThrows('stranger is Forbidden', () => h.handle(cmd('P1', '1A'), { id: 'bob', role: 'customer' }), Forbidden);
await expectThrows('unknown booking is NotFound', () => h.handle(cmd('P1', '1A', 'PNR-9999'), ana), NotFound);
await expectThrows('domain rule still enforced', () => h.handle(cmd('P1', '14D'), ana), SeatTaken);
check('failed commands saved nothing', bookings.saves, 2);`,
      hint: 'const booking = await this.bookings.get(cmd.bookingRef); if (!booking) throw new NotFound(...). Check the role/owner before calling changeSeat, and call save only after changeSeat succeeded.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class SeatTaken extends DomainError {}
class NotFound extends Error {
  constructor(m) { super(m); this.name = 'NotFound'; }
}
class Forbidden extends Error {
  constructor(m) { super(m); this.name = 'Forbidden'; }
}

class Booking {
  #events = [];
  constructor({ ref, ownerId, seats }) {
    Object.assign(this, { ref, ownerId, seats: { ...seats } });
  }
  changeSeat(passengerId, seat) {
    if (!(passengerId in this.seats)) throw new DomainError(passengerId + ' not on booking');
    if (!/^[0-9]{1,2}[A-F]$/.test(seat)) throw new DomainError('bad seat ' + seat);
    const holder = Object.keys(this.seats).find((p) => this.seats[p] === seat);
    if (holder && holder !== passengerId) throw new SeatTaken(seat + ' is taken by ' + holder);
    this.seats[passengerId] = seat;
    this.#events.push({ type: 'SeatChanged', ref: this.ref, passengerId, seat });
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
}

const rows = new Map([['PNR-0001', { ref: 'PNR-0001', ownerId: 'ana', seats: { P1: '12A', P2: '12B' } }]]);
const bookings = {
  saves: 0,
  async get(ref) {
    return rows.has(ref) ? new Booking(rows.get(ref)) : null;
  },
  async save(b) {
    this.saves++;
    rows.set(b.ref, { ref: b.ref, ownerId: b.ownerId, seats: { ...b.seats } });
  },
};
const published = [];
const bus = { publish: async (evts) => published.push(...evts) };

class ChangeSeatHandler {
  constructor({ bookings, bus }) {
    this.bookings = bookings;
    this.bus = bus;
  }
  async handle(cmd, user) {
    const booking = await this.bookings.get(cmd.bookingRef);
    if (!booking) throw new NotFound('no booking ' + cmd.bookingRef);
    if (user.role !== 'agent' && user.id !== booking.ownerId) {
      throw new Forbidden(user.id + ' may not change ' + booking.ref);
    }
    booking.changeSeat(cmd.passengerId, cmd.seat);
    await this.bookings.save(booking);
    await this.bus.publish(booking.pullEvents());
    return { ref: booking.ref, seats: booking.seats };
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
async function expectThrows(name, fn, type) {
  try {
    await fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = !type || e instanceof type;
    console.log(ok ? '✅' : '❌', name, ok ? '(' + e.message + ')' : '→ wrong error ' + e.name);
  }
}

const h = new ChangeSeatHandler({ bookings, bus });
const ana = { id: 'ana', role: 'customer' };
const cmd = (passengerId, seat, ref = 'PNR-0001') =>
  Object.freeze({ type: 'ChangeSeat', bookingRef: ref, passengerId, seat });

check('owner changes seat → DTO', await h.handle(cmd('P1', '14C'), ana),
  { ref: 'PNR-0001', seats: { P1: '14C', P2: '12B' } });
check('saved once', bookings.saves, 1);
check('event published', published, [{ type: 'SeatChanged', ref: 'PNR-0001', passengerId: 'P1', seat: '14C' }]);
check('agent may change too', (await h.handle(cmd('P2', '14D'), { id: 'a1', role: 'agent' }))?.seats?.P2, '14D');
await expectThrows('stranger is Forbidden', () => h.handle(cmd('P1', '1A'), { id: 'bob', role: 'customer' }), Forbidden);
await expectThrows('unknown booking is NotFound', () => h.handle(cmd('P1', '1A', 'PNR-9999'), ana), NotFound);
await expectThrows('domain rule still enforced', () => h.handle(cmd('P1', '14D'), ana), SeatTaken);
check('failed commands saved nothing', bookings.saves, 2);`,
    },
  },
  // ───────────────────────────────────────────────────────────── cqrs
  {
    id: 'cqrs',
    section: 'Architecture',
    title: 'CQRS: Separate Write and Read Models',
    explain: `
      <p><strong>Command Query Responsibility Segregation</strong> (named by Greg Young, building on
      Bertrand Meyer's command-query separation) says: the model you use to <em>change</em> data
      doesn't have to be the model you use to <em>read</em> it.</p>

      <h3>Why one model struggles to do both</h3>
      <ul>
        <li>The <strong>write model</strong> (the <code>Booking</code> aggregate) is shaped around
        <em>invariants</em>: max 2 bags, can't cancel within 2h. It's small, loaded by id, and
        doesn't know a flight's city names or departure time (those belong to Flight Scheduling).</li>
        <li>The <strong>"My Trips" dashboard</strong> wants, per customer, a list of upcoming trips with
        route, departure time, status and bag count. That data comes from <em>several</em>
        aggregates and contexts. Serving it from the write model means joins across Booking, Flight,
        Payments on every page view, or bloating the aggregate with display fields.</li>
      </ul>
      <p>CQRS splits them. Commands go to aggregates. Aggregates emit events. A
      <strong>projection</strong> listens to events and maintains a <strong>read model</strong>: a
      denormalized table or document shaped exactly like the screen. A query is then a single key
      lookup, with no joins and no rules.</p>
      <pre><code>  command ─► [Booking aggregate] ─► events ─► [MyTrips projection] ─► read model ◄─ query
               (write DB)                     (async, a few ms…s later)  (read DB / cache)</code></pre>

      <h3>The price: eventual consistency</h3>
      <p>If the projection runs asynchronously, there's a window where the write succeeded but
      the read model hasn't caught up: a <strong>stale read</strong>. The user adds a bag and the
      dashboard still says 0 bags. You have to design for it:</p>
      <ul>
        <li>Return enough data from the command for the UI to update optimistically.</li>
        <li><strong>Read-your-own-writes</strong>: the command returns the new version, and the UI
        (or query API) waits until the projection has reached that version.</li>
        <li>Show the state honestly ("updating…"), the way banking apps show "pending".</li>
      </ul>

      <h3>CQRS is a spectrum</h3>
      <ol>
        <li>Same database, separate query code (SQL views or dedicated query handlers that skip the
        aggregate). Cheap, consistent, often enough.</li>
        <li>Same database, projection tables updated in the same transaction. Still consistent.</li>
        <li>Separate read store (Elasticsearch, Redis, a document DB) updated asynchronously from
        events. Scales reads independently and gives you eventual consistency.</li>
      </ol>

      <div class="warn"><strong>When CQRS is overkill:</strong> CRUD screens where reads and writes
      have the same shape, low traffic, a small team, or anything where users can't tolerate stale
      reads and you don't want to build version-waiting. Also: CQRS does <em>not</em> require
      event sourcing, and event sourcing does not require separate databases. Greg Young himself stresses
      that CQRS is not a top-level architecture: apply it to the specific contexts or screens that
      benefit.</div>

      <div class="tip"><strong>In the real world:</strong> most teams start at level 1 (a query
      service that reads SQL directly into DTOs, bypassing aggregates) and only move a specific screen
      to an async projection when it's slow or needs data from other contexts. Projections are
      disposable: you can delete one and rebuild it by replaying events (example 2), which makes
      adding a new screen cheap once the events exist.</div>
    `,
    examples: [
      {
        title: 'Write model vs MyTrips read model, with a stale read',
        explain: `
          <details>
            <summary>The problem: one model pulled in two directions</summary>
            <p>Without CQRS, the dashboard query either goes through the aggregate or joins
            everything on every page view:</p>
            <pre><code>SELECT b.ref, f.origin || '→' || f.dest AS route, f.departs, b.status,
       (SELECT count(*) FROM bags g WHERE g.booking_id = b.id) AS bags
FROM bookings b
JOIN flights f  ON f.flight_no = b.flight_no      -- owned by Flight Scheduling!
WHERE b.customer_id = $1</code></pre>
            <ul>
              <li>The Booking context now reads another context's tables, so their schema changes break you.</li>
              <li>Someone "helpfully" adds <code>route</code> and <code>departs</code> to the Booking
              aggregate so it can render the dashboard. Now the aggregate carries fields no invariant needs.</li>
              <li>Read traffic (thousands of dashboard views) contends with writes on the same rows.</li>
            </ul>
            <p>In the example, <code>Booking</code> knows only <code>flightNo</code>, <code>bags</code>,
            <code>status</code>. The projection joins in the flight data <em>once</em>, when the event
            arrives, and stores a ready-to-render row.</p>
          </details>
          <details>
            <summary>Step by step: the timeline with the stale reads</summary>
            <p><code>LAG_MS = 50</code>: every event reaches the projection 50 ms after the command.</p>
            <table>
              <tr><th>Step</th><th>Write model (Booking PNR-0001)</th><th>Read model row</th><th>Console</th></tr>
              <tr><td>[1]</td><td>created, v1. <code>BookingCreated</code> queued</td><td>(none)</td><td><code>[1] cmd BookFlight → {"ref":"PNR-0001","version":1}</code></td></tr>
              <tr><td>[2]</td><td>v1</td><td>(none)</td><td><code>[2] query MyTrips(ana) right away → [] ← STALE</code></td></tr>
              <tr><td>+50ms</td><td>v1</td><td>row created from event + <code>flights.SH101</code>, v1</td><td><code>[projection] applied BookingCreated PNR-0001 v1</code></td></tr>
              <tr><td>[3]</td><td>v1</td><td>bags:0, v1</td><td><code>[3] … → ["PNR-0001 SYD→MEL 2026-11-20 07:00 CONFIRMED bags:0"]</code></td></tr>
              <tr><td>[4]</td><td><code>addBag()</code>: bags 1, <strong>v2</strong></td><td>bags:0, v1</td><td><code>[4] cmd AddBag → {"ref":"PNR-0001","version":2}</code></td></tr>
              <tr><td>[5]</td><td>bags 1, v2</td><td><strong>bags:0</strong>, v1</td><td><code>[5] query right away → […bags:0] ← STALE</code></td></tr>
              <tr><td>waitFor(v2)</td><td>v2</td><td>polls every 5 ms… event lands → bags:1, v2</td><td><code>[projection] applied BagAdded PNR-0001 v2</code></td></tr>
              <tr><td>[6]</td><td>v2</td><td>bags:1, v2</td><td><code>[6] query after waitFor(v2) → […bags:1]</code></td></tr>
              <tr><td>[7]</td><td>PNR-0002 created; PNR-0001 cancelled (v3)</td><td>new PNR-0002 row; PNR-0001 CANCELLED, v3</td><td><code>[7] after cancel + new booking → ["PNR-0001 … CANCELLED bags:1","PNR-0002 MEL→OOL 2026-12-02 18:30 CONFIRMED bags:0"]</code></td></tr>
              <tr><td>[8]</td><td><code>addBag()</code> throws: rules run on the write side only</td><td>unchanged</td><td><code>[8] cmd AddBag on cancelled → rejected by WRITE model: booking is CANCELLED</code></td></tr>
            </table>
            <p>Steps [2] and [5] are the moment users notice: the command said OK, the screen
            disagrees. Step [6] is the fix. The command returned <code>version: 2</code>, and the
            client waits until the projection's row has <code>v ≥ 2</code> before reading.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>events.forEach((e) =&gt; setTimeout(() =&gt; subscribers.forEach((fn) =&gt; fn(e)), LAG_MS)); // ①
const row = { ref: e.ref, ...flights[e.flightNo], status: 'CONFIRMED', bags: 0, v: e.version }; // ②
row.v = e.version;                                                                  // ③
while (!rowByRef.has(ref) || rowByRef.get(ref).v &lt; version) await sleep(5);         // ④</code></pre>
            <ol>
              <li><strong>①</strong> Delivery is deferred, like a broker plus consumer. The command has already returned by the time any subscriber runs.</li>
              <li><strong>②</strong> Denormalization: route and departure are copied into the row at projection time. Queries never touch <code>flights</code>.</li>
              <li><strong>③</strong> Each row remembers the last aggregate version it applied. That's what makes read-your-own-writes possible, and lets a projection skip duplicates (<code>e.version &lt;= row.v</code>).</li>
              <li><strong>④</strong> Read-your-own-writes. In production you'd give it a timeout, or have the query API accept <code>?minVersion=2</code> and return 202/"updating" when it isn't there yet.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>LAG_MS = 0</code>. Step [2] is <em>still</em> stale: <code>setTimeout(…, 0)</code> runs after the current script, so "async" means stale even at zero lag.</li>
              <li>Set <code>LAG_MS = 300</code>. Everything still prints the same, just slower: <code>waitFor</code> waits for a <em>version</em>, not a fixed time. Now also change <code>await sleep(LAG_MS + 20)</code> to <code>await sleep(20)</code>: step [3] goes stale too, because a fixed sleep is a guess and guesses fail under load.</li>
              <li>Add a third subscriber that keeps a count of bookings per flight. That's a second read model from the same events, and the write side doesn't change.</li>
            </ul>
            <div class="warn">If two projections need to be consistent <em>with each other</em> (e.g. a
            list and a total), feed them from the same subscription in the same transaction, or accept
            that they can briefly disagree.</div>
          </details>
        `,
        code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}

// ═══ WRITE SIDE ═══════════════════════════════════════════════
// Aggregate knows only what its invariants need: flight number, not city names.
class Booking {
  #events = [];
  constructor(state) {
    Object.assign(this, state);
  }
  static create(ref, customerId, flightNo) {
    const b = new Booking({ ref, customerId, flightNo, bags: 0, status: 'CONFIRMED', version: 0 });
    b.#raise({ type: 'BookingCreated', ref, customerId, flightNo });
    return b;
  }
  addBag() {
    if (this.status !== 'CONFIRMED') throw new DomainError('booking is ' + this.status);
    if (this.bags >= 2) throw new DomainError('max 2 bags');
    this.bags++;
    this.#raise({ type: 'BagAdded', ref: this.ref });
  }
  cancel() {
    if (this.status === 'CANCELLED') throw new DomainError('already cancelled');
    this.status = 'CANCELLED';
    this.#raise({ type: 'BookingCancelled', ref: this.ref });
  }
  #raise(e) {
    this.version++;
    this.#events.push({ ...e, version: this.version });
  }
  pullEvents() {
    const out = this.#events;
    this.#events = [];
    return out;
  }
}

// Async bus: delivery happens LATER (like Kafka/SQS + a consumer).
const LAG_MS = 50;
const subscribers = [];
const publish = (events) =>
  events.forEach((e) => setTimeout(() => subscribers.forEach((fn) => fn(e)), LAG_MS));

const writeDb = new Map();
function execute(ref, action) {
  const booking = action(writeDb.get(ref));
  writeDb.set(booking.ref, booking);
  publish(booking.pullEvents());
  return { ref: booking.ref, version: booking.version };
}

// ═══ READ SIDE ════════════════════════════════════════════════
// Flight Scheduling data, copied locally from that context's events.
const flights = {
  SH101: { route: 'SYD→MEL', departs: '2026-11-20 07:00' },
  SH205: { route: 'MEL→OOL', departs: '2026-12-02 18:30' },
};
// Read model: one ready-to-render row per booking, keyed by customer.
const myTrips = new Map(); // customerId -> Map(ref -> row)
const rowByRef = new Map();

subscribers.push((e) => {
  if (e.type === 'BookingCreated') {
    const row = { ref: e.ref, ...flights[e.flightNo], status: 'CONFIRMED', bags: 0, v: e.version };
    if (!myTrips.has(e.customerId)) myTrips.set(e.customerId, new Map());
    myTrips.get(e.customerId).set(e.ref, row);
    rowByRef.set(e.ref, row);
  } else {
    const row = rowByRef.get(e.ref);
    if (e.type === 'BagAdded') row.bags++;
    if (e.type === 'BookingCancelled') row.status = 'CANCELLED';
    row.v = e.version;
  }
  console.log('    [projection] applied', e.type, e.ref, 'v' + e.version);
});

// Query: a key lookup. No joins, no aggregate, no rules.
const getMyTrips = (customerId) =>
  [...(myTrips.get(customerId) || new Map()).values()].map((r) =>
    r.ref + ' ' + r.route + ' ' + r.departs + ' ' + r.status + ' bags:' + r.bags);

// Read-your-own-writes helper: wait until the projection reaches a version.
async function waitFor(ref, version) {
  while (!rowByRef.has(ref) || rowByRef.get(ref).v < version) await sleep(5);
}

// ═══ TIMELINE ═════════════════════════════════════════════════
console.log('[1] cmd BookFlight →', execute('PNR-0001', () => Booking.create('PNR-0001', 'ana', 'SH101')));
console.log('[2] query MyTrips(ana) right away →', getMyTrips('ana'), '← STALE');
await sleep(LAG_MS + 20);
console.log('[3] query MyTrips(ana) after lag →', getMyTrips('ana'));

const res = execute('PNR-0001', (b) => (b.addBag(), b));
console.log('[4] cmd AddBag →', res);
console.log('[5] query right away →', getMyTrips('ana'), '← STALE');
await waitFor(res.ref, res.version);
console.log('[6] query after waitFor(v' + res.version + ') →', getMyTrips('ana'));

execute('PNR-0002', () => Booking.create('PNR-0002', 'ana', 'SH205'));
const c = execute('PNR-0001', (b) => (b.cancel(), b));
await waitFor(c.ref, c.version);
console.log('[7] after cancel + new booking →', getMyTrips('ana'));

try {
  execute('PNR-0001', (b) => (b.addBag(), b));
} catch (e) {
  console.log('[8] cmd AddBag on cancelled → rejected by WRITE model:', e.message);
}`,
      },
      {
        title: 'Projections are disposable: rebuild from the event log',
        code: `// The event log the write side has produced so far.
const log = [
  { type: 'BookingCreated', ref: 'PNR-0001', customerId: 'ana', flightNo: 'SH101', fare: 129 },
  { type: 'BookingCreated', ref: 'PNR-0002', customerId: 'ben', flightNo: 'SH101', fare: 89 },
  { type: 'BagAdded', ref: 'PNR-0001' },
  { type: 'BookingCreated', ref: 'PNR-0003', customerId: 'ana', flightNo: 'SH205', fare: 159 },
  { type: 'BookingCancelled', ref: 'PNR-0002' },
];

// Marketing asks for a NEW screen next quarter: revenue per flight.
// No write-model change needed. Write a projection and replay history.
function revenuePerFlight(events) {
  const byRef = {};
  const out = {};
  for (const e of events) {
    if (e.type === 'BookingCreated') {
      byRef[e.ref] = e;
      out[e.flightNo] = (out[e.flightNo] || 0) + e.fare;
    }
    if (e.type === 'BookingCancelled') {
      const b = byRef[e.ref];
      out[b.flightNo] -= b.fare;
    }
  }
  return out;
}

// And the existing dashboard can be thrown away and rebuilt at any time.
function tripsPerCustomer(events) {
  const out = {};
  for (const e of events) {
    if (e.type === 'BookingCreated') (out[e.customerId] ||= []).push(e.ref);
    if (e.type === 'BookingCancelled') {
      for (const refs of Object.values(out)) {
        const i = refs.indexOf(e.ref);
        if (i >= 0) refs.splice(i, 1);
      }
    }
  }
  return out;
}

console.log('revenue per flight:', revenuePerFlight(log));
console.log('active trips per customer:', tripsPerCustomer(log));
console.log('as of event #3 (time travel for free):', tripsPerCustomer(log.slice(0, 3)));`,
      },
    ],
    quiz: [
      {
        q: 'Ana adds a bag on SkyHop\'s app. The command returns 200 OK, but her "My Trips" page still shows 0 bags for a moment. What is happening?',
        options: [
          'The write failed silently',
          'The read model is updated asynchronously from events and hasn\'t caught up yet (a stale read)',
          'The aggregate rejected the bag',
          'The browser cache is broken',
        ],
        answer: 1,
        why: 'With an async projection, reads lag writes. Mitigate with optimistic UI, version waiting (read-your-own-writes) or by showing "updating".',
      },
      {
        q: 'Where should the rule "max 2 bags per passenger" be enforced in a CQRS system?',
        options: [
          'In the MyTrips projection',
          'In the query handler',
          'In the write model (Booking aggregate), before the event is emitted',
          'In both read and write models',
        ],
        answer: 2,
        why: 'The read model is derived data and has no authority. Rules are checked on the write side; events record facts that already passed the rules.',
      },
      {
        q: 'ShopLane\'s admin panel edits product descriptions: same fields in, same fields out, 20 users. A teammate proposes separate read/write stores with Kafka. Your advice?',
        options: [
          'Great idea, CQRS always improves performance',
          'Overkill: reads and writes have the same shape and staleness would only add confusion. Plain CRUD (maybe a simple query layer) is enough',
          'Use event sourcing instead',
          'Use two microservices',
        ],
        answer: 1,
        why: 'CQRS pays off when read shapes differ a lot from write shapes, or reads need independent scaling. Otherwise it adds infrastructure and eventual consistency for nothing.',
      },
      {
        q: 'Marketing wants a "revenue per flight" report that nobody planned for. In an event-driven CQRS system, what is the cheapest path?',
        options: [
          'Add revenue fields to the Booking aggregate',
          'Write a new projection and replay the existing events into it',
          'Run nightly joins on the write database forever',
          'Ask the Booking team to emit a new RevenueCalculated event retroactively',
        ],
        answer: 1,
        why: 'As long as the events carry the needed facts, new read models are just new projections replayed over history (example 2).',
      },
    ],
    exercise: {
      task: `<p>SkyHop's gate agents need a <strong>FlightManifest</strong> read model: per flight
      number, the list of passenger names on <em>active</em> bookings and a count. Write
      <code>applyToManifest(manifest, event)</code>:</p>
      <ul>
        <li><code>BookingCreated { eventId, ref, flightNo, passengers: [names] }</code>: add the
        names under <code>manifest[flightNo]</code>.</li>
        <li><code>BookingCancelled { eventId, ref }</code>: remove that booking's names (you'll need
        to remember which flight/names a ref had).</li>
        <li>Message brokers deliver <strong>at least once</strong>: an event with an
        <code>eventId</code> you've already applied must be ignored.</li>
        <li><code>manifestFor(manifest, flightNo)</code> returns <code>{ count, names }</code> with
        names sorted.</li>
      </ul>`,
      starter: `function emptyManifest() {
  return { flights: {}, refs: {}, seen: new Set() };
}

function applyToManifest(m, e) {
  // TODO: skip already-seen eventIds
  // TODO: BookingCreated → remember m.refs[ref] = { flightNo, passengers } and add names
  // TODO: BookingCancelled → remove names of that ref from its flight
  return m;
}

function manifestFor(m, flightNo) {
  const names = [...(m.flights[flightNo] || [])].sort();
  return { count: names.length, names };
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const events = [
  { eventId: 'e1', type: 'BookingCreated', ref: 'PNR-0001', flightNo: 'SH101', passengers: ['Ana Lee', 'Tom Lee'] },
  { eventId: 'e2', type: 'BookingCreated', ref: 'PNR-0002', flightNo: 'SH101', passengers: ['Ben Ng'] },
  { eventId: 'e3', type: 'BookingCreated', ref: 'PNR-0003', flightNo: 'SH205', passengers: ['Cy Park'] },
  { eventId: 'e2', type: 'BookingCreated', ref: 'PNR-0002', flightNo: 'SH101', passengers: ['Ben Ng'] },
  { eventId: 'e4', type: 'BookingCancelled', ref: 'PNR-0001' },
  { eventId: 'e4', type: 'BookingCancelled', ref: 'PNR-0001' },
];
const m = emptyManifest();
applyToManifest(m, events[0]);
applyToManifest(m, events[1]);
check('two bookings on SH101', manifestFor(m, 'SH101'), { count: 3, names: ['Ana Lee', 'Ben Ng', 'Tom Lee'] });
applyToManifest(m, events[2]);
applyToManifest(m, events[3]);
check('duplicate e2 ignored', manifestFor(m, 'SH101').count, 3);
check('other flight separate', manifestFor(m, 'SH205'), { count: 1, names: ['Cy Park'] });
applyToManifest(m, events[4]);
applyToManifest(m, events[5]);
check('cancel removes both Lees once', manifestFor(m, 'SH101'), { count: 1, names: ['Ben Ng'] });
check('unknown flight is empty', manifestFor(m, 'SH999'), { count: 0, names: [] });
const rebuilt = events.reduce(applyToManifest, emptyManifest());
check('rebuild from log gives same result', manifestFor(rebuilt, 'SH101'), manifestFor(m, 'SH101'));`,
      hint: 'if (m.seen.has(e.eventId)) return m; m.seen.add(e.eventId). Keep m.flights[flightNo] as an array; on cancel, filter out each of m.refs[ref].passengers once.',
      solution: `function emptyManifest() {
  return { flights: {}, refs: {}, seen: new Set() };
}

function applyToManifest(m, e) {
  if (m.seen.has(e.eventId)) return m;
  m.seen.add(e.eventId);
  if (e.type === 'BookingCreated') {
    m.refs[e.ref] = { flightNo: e.flightNo, passengers: e.passengers };
    m.flights[e.flightNo] = [...(m.flights[e.flightNo] || []), ...e.passengers];
  }
  if (e.type === 'BookingCancelled') {
    const b = m.refs[e.ref];
    if (!b) return m;
    const left = [...m.flights[b.flightNo]];
    for (const name of b.passengers) left.splice(left.indexOf(name), 1);
    m.flights[b.flightNo] = left;
    delete m.refs[e.ref];
  }
  return m;
}

function manifestFor(m, flightNo) {
  const names = [...(m.flights[flightNo] || [])].sort();
  return { count: names.length, names };
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const events = [
  { eventId: 'e1', type: 'BookingCreated', ref: 'PNR-0001', flightNo: 'SH101', passengers: ['Ana Lee', 'Tom Lee'] },
  { eventId: 'e2', type: 'BookingCreated', ref: 'PNR-0002', flightNo: 'SH101', passengers: ['Ben Ng'] },
  { eventId: 'e3', type: 'BookingCreated', ref: 'PNR-0003', flightNo: 'SH205', passengers: ['Cy Park'] },
  { eventId: 'e2', type: 'BookingCreated', ref: 'PNR-0002', flightNo: 'SH101', passengers: ['Ben Ng'] },
  { eventId: 'e4', type: 'BookingCancelled', ref: 'PNR-0001' },
  { eventId: 'e4', type: 'BookingCancelled', ref: 'PNR-0001' },
];
const m = emptyManifest();
applyToManifest(m, events[0]);
applyToManifest(m, events[1]);
check('two bookings on SH101', manifestFor(m, 'SH101'), { count: 3, names: ['Ana Lee', 'Ben Ng', 'Tom Lee'] });
applyToManifest(m, events[2]);
applyToManifest(m, events[3]);
check('duplicate e2 ignored', manifestFor(m, 'SH101').count, 3);
check('other flight separate', manifestFor(m, 'SH205'), { count: 1, names: ['Cy Park'] });
applyToManifest(m, events[4]);
applyToManifest(m, events[5]);
check('cancel removes both Lees once', manifestFor(m, 'SH101'), { count: 1, names: ['Ben Ng'] });
check('unknown flight is empty', manifestFor(m, 'SH999'), { count: 0, names: [] });
const rebuilt = events.reduce(applyToManifest, emptyManifest());
check('rebuild from log gives same result', manifestFor(rebuilt, 'SH101'), manifestFor(m, 'SH101'));`,
    },
  },
  // ───────────────────────────────────────────────────────────── event-sourcing
  {
    id: 'event-sourcing',
    section: 'Architecture',
    title: 'Event Sourcing',
    explain: `
      <p>In a normal (state-based) system, LedgerBank stores the current balance:
      <code>UPDATE accounts SET balance = 581.00</code>. The previous value is gone. Why it's 581,
      what it was on 1 October, who withdrew what: all of that lives in a separate audit table,
      if somebody remembered to write it.</p>
      <p><strong>Event sourcing</strong> flips it: the <strong>events are the source of
      truth</strong>. You store <code>AccountOpened</code>, <code>MoneyDeposited</code>,
      <code>MoneyWithdrawn</code> in an append-only stream per aggregate. Current state isn't
      stored; it is <strong>computed</strong> by folding over the events.</p>
      <pre><code>state = events.reduce(evolve, initialState)</code></pre>

      <h3>Two pure functions</h3>
      <ul>
        <li><code>decide(state, command) → events</code>: the rules. Can reject (throw). This is
        where "insufficient funds" lives.</li>
        <li><code>evolve(state, event) → state</code>: applies a fact that already happened.
        <strong>No rules, never throws</strong>. If it threw, you could never load an account whose
        history contains that event again.</li>
      </ul>
      <p>Loading an aggregate = read its stream, fold with <code>evolve</code>
      (<strong>rehydrate</strong>). Saving = <code>append(streamId, expectedVersion, newEvents)</code>.
      The expected version is optimistic concurrency: if someone appended in between, the append
      fails and you retry with fresh state.</p>

      <h3>What you get</h3>
      <ul>
        <li><strong>Full audit trail</strong> by construction. Banks, ledgers and compliance love this.</li>
        <li><strong>Temporal queries</strong>: "what was the balance on 1 Oct?" = fold only events
        up to that date.</li>
        <li><strong>New read models from old history</strong> (see CQRS): replay events into a new projection.</li>
        <li><strong>Debugging</strong>: replay the exact sequence that produced a bug.</li>
      </ul>

      <h3>What it costs</h3>
      <ul>
        <li><strong>Long streams</strong> get slow to fold. Fix: <strong>snapshots</strong>, i.e.
        store the state every N events and fold only the tail.</li>
        <li><strong>Schema evolution</strong>: events are immutable, but your code changes. Old
        events must still load. Fix: <strong>upcasters</strong> that convert old event versions to the
        current shape on read (example 2), or a weak schema that tolerates missing fields.</li>
        <li><strong>GDPR "right to erasure"</strong> vs an immutable log. Common answers: keep
        personal data out of events (store a reference), or <strong>crypto-shredding</strong>: encrypt
        personal fields with a per-person key and delete the key on request.</li>
        <li><strong>Querying</strong>: you can't <code>SELECT … WHERE balance &lt; 0</code> on a
        stream. You need projections (CQRS) for almost every list screen.</li>
        <li><strong>Team learning curve</strong> and tooling (event store, replay, versioning).
        It's a big step from CRUD.</li>
      </ul>

      <div class="warn"><strong>ES ≠ CQRS ≠ DDD.</strong> They combine well but are independent.
      DDD is a design approach and works fine with state-based persistence (most DDD systems are).
      CQRS can be done without events at all (separate query code). Event sourcing practically
      <em>forces</em> CQRS for reads, but it doesn't force microservices or a separate database.
      Choose ES per aggregate/context where history is the business (ledgers, bookings with
      complex change history), not as a company-wide default.</div>

      <div class="tip"><strong>In the real world:</strong> teams use a dedicated store
      (EventStoreDB/Kurrent, Marten on Postgres, Axon) or a plain Postgres table
      <code>events(stream_id, version, type, data, at)</code> with a unique constraint on
      <code>(stream_id, version)</code>. That unique constraint <em>is</em> the optimistic
      concurrency check. Snapshots are usually an optimization added later, once streams have hundreds
      of events. Most aggregates never need them.</div>
    `,
    examples: [
      {
        title: 'LedgerBank account: fold, temporal query, concurrency, snapshot',
        explain: `
          <details>
            <summary>The problem: <code>UPDATE balance</code> forgets everything</summary>
            <table>
              <tr><th>State-based row</th><th>Question from the auditor</th><th>Answer</th></tr>
              <tr><td><code>ACC-0001 | Ana Lee | 581.00</code></td><td>"Balance on 1 Oct?"</td><td>Unknown, unless an audit table exists and was kept in sync</td></tr>
              <tr><td></td><td>"Which withdrawals made it 581?"</td><td>Unknown</td></tr>
              <tr><td></td><td>"Did the ATM and the app both withdraw at 10:03?"</td><td>Last write wins. Possibly a lost update</td></tr>
            </table>
            <p>Teams bolt on <code>account_history</code> tables, triggers and change-data-capture.
            Event sourcing makes the history <em>the</em> data. The balance is derived from it, so the
            two can never disagree.</p>
          </details>
          <details>
            <summary>Step by step: rehydrate is a <code>reduce</code></summary>
            <p>Five commands went through <code>handle()</code>: load → <code>decide</code> →
            <code>append(id, state.version, events)</code>. Then the demo folds the stream, logging after
            each <code>evolve</code>:</p>
            <table>
              <tr><th>Event</th><th>evolve does</th><th>Console</th></tr>
              <tr><td>v1 AccountOpened</td><td>id, owner, overdraft 0</td><td><code>v1 2026-09-01 AccountOpened → balance A$0.00</code></td></tr>
              <tr><td>v2 MoneyDeposited 50000</td><td>0 + 50000</td><td><code>v2 2026-09-15 MoneyDeposited A$500.00 → balance A$500.00</code></td></tr>
              <tr><td>v3 MoneyWithdrawn 12000</td><td>50000 − 12000</td><td><code>v3 2026-09-28 MoneyWithdrawn A$120.00 → balance A$380.00</code></td></tr>
              <tr><td>v4 MoneyDeposited 30000</td><td>38000 + 30000</td><td><code>v4 2026-10-05 MoneyDeposited A$300.00 → balance A$680.00</code></td></tr>
              <tr><td>v5 MoneyWithdrawn 9900</td><td>68000 − 9900</td><td><code>v5 2026-10-20 MoneyWithdrawn A$99.00 → balance A$581.00</code></td></tr>
            </table>
            <p><strong>Temporal query:</strong> <code>balanceAsOf('2026-10-01')</code> keeps only v1–v3
            (dates ≤ 1 Oct) and folds them: <code>balance on 2026-10-01: A$380.00</code>. Same
            <code>evolve</code>, shorter prefix. No extra table.</p>
            <p><strong>Invariant:</strong> withdrawing A$1000 runs <code>decide</code> on the
            rehydrated state (58100 cents, overdraft 0) and throws before any event exists:
            <code>InsufficientFunds: balance A$581.00, cannot withdraw A$1000.00</code>. Nothing is
            appended, so the stream stays at v5.</p>
          </details>
          <details>
            <summary>Step by step: concurrency and the snapshot</summary>
            <table>
              <tr><th>Step</th><th>Stream</th><th>Console</th></tr>
              <tr><td>ATM and app both load. Both see v5, balance A$581</td><td>v5</td><td></td></tr>
              <tr><td>ATM: <code>decide</code> OK (581 − 500 ≥ 0), <code>append(id, 5, …)</code></td><td><strong>v6</strong>, balance A$81</td><td><code>ATM decided on v5 → appended v6</code></td></tr>
              <tr><td>App: <code>decide</code> also OK <em>on its stale copy</em>, <code>append(id, 5, …)</code></td><td>v6 ≠ 5 → rejected</td><td><code>app decided on v5 → ConcurrencyConflict: expected v5 but stream is at v6</code></td></tr>
              <tr><td>App retries via <code>handle</code> (fresh load at v6)</td><td>v6</td><td><code>app retry → InsufficientFunds: balance A$81.00, cannot withdraw A$500.00</code></td></tr>
              <tr><td>Snapshot saved at v6, then deposit A$25 → v7</td><td>v7</td><td></td></tr>
              <tr><td><code>load()</code>: snapshot v6 + fold events after v6</td><td>v7</td><td><code>loaded snapshot v6 + replayed 1 event(s) → balance A$106.00 at v7</code><br><code>full replay gives the same: A$106.00</code></td></tr>
            </table>
            <p>Without the expected-version check, both A$500 withdrawals would be appended and the
            balance would be <strong>−A$419.00</strong>, breaking the no-overdraft invariant even though
            each <code>decide</code> was correct on the data it saw. The snapshot is purely a cache: the
            last line proves a full replay agrees. You can delete snapshots any time.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>overdraftCents: 0</code> to <code>50000</code> in <code>decide</code> (Open). Now the app retry succeeds and the final balance is negative but legal.</li>
              <li>Add <code>console.log(store.read(ID))</code> at the end to see the raw frozen events with versions.</li>
              <li>Try <code>store.read(ID)[0].type = 'X'</code>. It throws a <code>TypeError</code> (modules run in strict mode) because events are <code>Object.freeze</code>d: history is immutable.</li>
            </ul>
            <div class="tip">Notice <code>decide</code> and <code>evolve</code> are pure and need no store at
            all. That's why event-sourced aggregates are so easy to test: given events, when command,
            then events (see the Testing the Domain lesson).</div>
          </details>
        `,
        code: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class InsufficientFunds extends DomainError {}
class ConcurrencyConflict extends Error {
  constructor(m) { super(m); this.name = 'ConcurrencyConflict'; }
}
const aud = (cents) => (cents < 0 ? '-' : '') + 'A$' + (Math.abs(cents) / 100).toFixed(2);

// ── Event store: append-only streams + optional snapshots ──
class EventStore {
  #streams = new Map();
  #snapshots = new Map();
  read(id, afterVersion = 0) {
    return (this.#streams.get(id) || []).filter((e) => e.version > afterVersion);
  }
  append(id, expectedVersion, events) {
    const stream = this.#streams.get(id) || [];
    if (stream.length !== expectedVersion) {
      throw new ConcurrencyConflict('expected v' + expectedVersion +
        ' but stream is at v' + stream.length);
    }
    const stored = events.map((e, i) =>
      Object.freeze({ ...e, version: expectedVersion + i + 1 }));
    this.#streams.set(id, [...stream, ...stored]);
    return stored;
  }
  saveSnapshot(id, state) {
    this.#snapshots.set(id, structuredClone(state));
  }
  loadSnapshot(id) {
    return this.#snapshots.get(id) || null;
  }
}

// ── The aggregate as two pure functions ──
const initial = Object.freeze({ id: null, owner: null, balance: 0, overdraft: 0, version: 0 });

// evolve: "this happened". No rules, never throws.
function evolve(state, e) {
  switch (e.type) {
    case 'AccountOpened':
      return { ...state, id: e.accountId, owner: e.owner, overdraft: e.overdraftCents,
        version: e.version };
    case 'MoneyDeposited':
      return { ...state, balance: state.balance + e.cents, version: e.version };
    case 'MoneyWithdrawn':
      return { ...state, balance: state.balance - e.cents, version: e.version };
    default:
      return { ...state, version: e.version };
  }
}

// decide: the rules. Returns new events, or throws.
function decide(state, cmd) {
  switch (cmd.type) {
    case 'Open':
      if (state.id) throw new DomainError('account already open');
      return [{ type: 'AccountOpened', accountId: cmd.accountId, owner: cmd.owner,
        overdraftCents: 0, at: cmd.at }];
    case 'Deposit':
      if (cmd.cents <= 0) throw new DomainError('deposit must be positive');
      return [{ type: 'MoneyDeposited', cents: cmd.cents, at: cmd.at }];
    case 'Withdraw':
      if (state.balance - cmd.cents < -state.overdraft) {
        throw new InsufficientFunds('balance ' + aud(state.balance) + ', cannot withdraw ' +
          aud(cmd.cents));
      }
      return [{ type: 'MoneyWithdrawn', cents: cmd.cents, at: cmd.at }];
  }
  throw new DomainError('unknown command ' + cmd.type);
}

const rehydrate = (events, from = initial) => events.reduce(evolve, from);

function load(store, id) {
  const snap = store.loadSnapshot(id);
  const tail = store.read(id, snap ? snap.version : 0);
  return { state: rehydrate(tail, snap || initial), fromSnapshot: snap && snap.version,
    replayed: tail.length };
}

function handle(store, id, cmd) {
  const { state } = load(store, id);
  return store.append(id, state.version, decide(state, cmd));
}

// ═══ DEMO ═════════════════════════════════════════════════════
const store = new EventStore();
const ID = 'ACC-0001';
handle(store, ID, { type: 'Open', accountId: ID, owner: 'Ana Lee', at: '2026-09-01' });
handle(store, ID, { type: 'Deposit', cents: 50000, at: '2026-09-15' });
handle(store, ID, { type: 'Withdraw', cents: 12000, at: '2026-09-28' });
handle(store, ID, { type: 'Deposit', cents: 30000, at: '2026-10-05' });
handle(store, ID, { type: 'Withdraw', cents: 9900, at: '2026-10-20' });

console.log('── rehydrate = fold over the stream ──');
store.read(ID).reduce((s, e) => {
  const next = evolve(s, e);
  console.log('v' + e.version, e.at, e.type.padEnd(15), (e.cents ? aud(e.cents) : '').padStart(9),
    '→ balance', aud(next.balance));
  return next;
}, initial);

console.log('── temporal query ──');
const balanceAsOf = (date) => rehydrate(store.read(ID).filter((e) => e.at <= date)).balance;
console.log('balance on 2026-10-01:', aud(balanceAsOf('2026-10-01')));
console.log('balance now:', aud(load(store, ID).state.balance));

console.log('── invariant ──');
try {
  handle(store, ID, { type: 'Withdraw', cents: 100000, at: '2026-10-25' });
} catch (e) {
  console.log('withdraw A$1000.00 →', e.name + ': ' + e.message);
}

console.log('── concurrency: ATM and app both withdraw A$500.00 ──');
const atm = load(store, ID).state;
const app = load(store, ID).state;
const cmd500 = { type: 'Withdraw', cents: 50000, at: '2026-10-26' };
store.append(ID, atm.version, decide(atm, cmd500));
console.log('ATM decided on v' + atm.version + ' → appended v' + (atm.version + 1));
try {
  store.append(ID, app.version, decide(app, cmd500));
} catch (e) {
  console.log('app decided on v' + app.version + ' →', e.name + ': ' + e.message);
}
try {
  handle(store, ID, cmd500); // retry on fresh state
} catch (e) {
  console.log('app retry →', e.name + ': ' + e.message);
}

console.log('── snapshot ──');
store.saveSnapshot(ID, load(store, ID).state);
handle(store, ID, { type: 'Deposit', cents: 2500, at: '2026-10-28' });
const l = load(store, ID);
console.log('loaded snapshot v' + l.fromSnapshot + ' + replayed', l.replayed, 'event(s) → balance',
  aud(l.state.balance), 'at v' + l.state.version);
console.log('full replay gives the same:', aud(rehydrate(store.read(ID)).balance));`,
      },
      {
        title: 'Schema evolution (upcasting) and GDPR crypto-shredding',
        explain: `
          <details>
            <summary>Step by step: upcasting on read</summary>
            <table>
              <tr><th>Stored (never changes)</th><th>Upcaster</th><th>What evolve sees</th></tr>
              <tr><td><code>AccountOpened@1</code></td><td>adds <code>overdraftCents: 0</code></td><td><code>AccountOpened@2</code></td></tr>
              <tr><td><code>MoneyDeposited@1 { amount: 250.5 }</code></td><td>dollars → <code>Math.round(250.5 * 100)</code></td><td><code>MoneyDeposited@2</code> 25050</td></tr>
              <tr><td><code>FundsWithdrawn@1 { amount: 40 }</code></td><td>renamed event + cents</td><td><code>MoneyWithdrawn@2</code> 4000</td></tr>
              <tr><td><code>MoneyDeposited@2</code></td><td>none (already current)</td><td>120000</td></tr>
              <tr><td><code>MoneyWithdrawn@2</code></td><td>none</td><td>3550</td></tr>
            </table>
            <p>Balance: 25050 − 4000 + 120000 − 3550 = <code>balance (cents): 137500</code>. The
            <code>while</code> loop chains upcasters, so a future <code>@2 → @3</code> just adds one entry and
            <code>@1</code> events flow through both.</p>
          </details>
          <details>
            <summary>Crypto-shredding, and its limits</summary>
            <p><code>KycVerified</code> stores the name as ciphertext (<code>stored ciphertext: Ilu'Un</code>).
            While the key exists, readers decrypt it (<code>read before erasure: Ben Ng</code>). On an
            erasure request the key is deleted, not the event (<code>read after erasure: [erased]</code>),
            and the money events, which hold no personal data, still fold into a correct balance.</p>
            <div class="warn">The character shift here is a toy, not encryption. Use a real KMS and
            authenticated encryption, and remember projections and backups that hold <em>decrypted</em>
            copies must be erased too. Regulators may also require you to <em>keep</em> some financial records
            for years. Erasure rules are a legal question, not just a technical one.</div>
          </details>
        `,
        code: `// Events written over 6 years. Stored events are NEVER rewritten.
const stored = [
  { type: 'AccountOpened', schema: 1, accountId: 'ACC-0002', at: '2020-03-01' },
  { type: 'MoneyDeposited', schema: 1, amount: 250.5, at: '2020-03-02' }, // dollars as a float (bad idea)
  { type: 'FundsWithdrawn', schema: 1, amount: 40, at: '2020-04-11' },    // old event name
  { type: 'MoneyDeposited', schema: 2, cents: 120000, currency: 'AUD', at: '2024-07-01' },
  { type: 'MoneyWithdrawn', schema: 2, cents: 3550, currency: 'AUD', at: '2025-01-09' },
];

// Upcasters: old shape -> next shape, applied on READ, chained until current.
const upcasters = {
  'AccountOpened@1': (e) => ({ ...e, schema: 2, overdraftCents: 0 }),
  'MoneyDeposited@1': (e) => ({ type: 'MoneyDeposited', schema: 2,
    cents: Math.round(e.amount * 100), currency: 'AUD', at: e.at }),
  'FundsWithdrawn@1': (e) => ({ type: 'MoneyWithdrawn', schema: 2,
    cents: Math.round(e.amount * 100), currency: 'AUD', at: e.at }),
};
function upcast(e) {
  let cur = e;
  while (upcasters[cur.type + '@' + cur.schema]) cur = upcasters[cur.type + '@' + cur.schema](cur);
  return cur;
}

// evolve only knows the CURRENT schema. Old code paths are gone.
function evolve(s, e) {
  if (e.type === 'MoneyDeposited') return { ...s, balance: s.balance + e.cents };
  if (e.type === 'MoneyWithdrawn') return { ...s, balance: s.balance - e.cents };
  return s;
}

for (const e of stored) {
  const up = upcast(e);
  console.log(e.type + '@' + e.schema, '→', up.type + '@' + up.schema, up.cents ?? '');
}
const balance = stored.map(upcast).reduce(evolve, { balance: 0 }).balance;
console.log('balance (cents):', balance);

// ── Crypto-shredding: personal data encrypted with a per-customer key ──
const keys = new Map([['cust-ben', 7]]); // a real system uses a KMS and real crypto
const enc = (text, k) => [...text].map((c) => String.fromCharCode(c.charCodeAt(0) + k)).join('');
const dec = (text, k) => [...text].map((c) => String.fromCharCode(c.charCodeAt(0) - k)).join('');

const kycEvent = { type: 'KycVerified', customerId: 'cust-ben', name: enc('Ben Ng', 7),
  passportNo: enc('PA1234567', 7), at: '2020-03-01' };
const readName = (e) => (keys.has(e.customerId) ? dec(e.name, keys.get(e.customerId)) : '[erased]');

console.log('stored ciphertext:', kycEvent.name);
console.log('read before erasure:', readName(kycEvent));
keys.delete('cust-ben'); // GDPR erasure request: throw away the key, keep the event
console.log('read after erasure:', readName(kycEvent), '(event and balance history intact)');`,
      },
    ],
    quiz: [
      {
        q: 'An auditor asks LedgerBank: "what was ACC-0001\'s balance at close of business on 1 October?" How does an event-sourced account answer?',
        options: [
          'Restore last night\'s database backup',
          'Fold only the events with <code>at ≤ 1 Oct</code> through evolve',
          'It cannot: event sourcing only knows the current balance',
          'Query the read model, which stores daily balances by default',
        ],
        answer: 1,
        why: 'State at any point in time is just a fold over a prefix of the stream. That is the temporal-query superpower of ES.',
      },
      {
        q: 'A developer puts <code>if (state.balance - e.cents &lt; 0) throw ...</code> inside <code>evolve</code> for MoneyWithdrawn. Why is that dangerous?',
        options: [
          'It makes the fold slower',
          'If a past event ever violates the rule (old overdraft policy, bug fix), that account can never be loaded again',
          'evolve must be async',
          'It is fine; rules belong everywhere',
        ],
        answer: 1,
        why: 'Events are facts that already happened. Rules belong in decide (before the event exists). evolve must accept every historical event.',
      },
      {
        q: 'SkyHop\'s Booking stream had <code>BagAdded { kg }</code>; the new code needs <code>BagAdded { weight: { value, unit } }</code>. What is the usual approach?',
        options: [
          'UPDATE all old events in place',
          'Write an upcaster that converts v1 events to v2 on read, so evolve only handles the latest shape',
          'Delete old bookings',
          'Keep both shapes in evolve forever with if/else everywhere',
        ],
        answer: 1,
        why: 'The log stays immutable; upcasters translate at read time. Some teams do a one-off "copy-and-transform" migration to a new stream, but never edit history in place.',
      },
      {
        q: 'Which statement is true?',
        options: [
          'You can\'t do DDD without event sourcing',
          'Event sourcing requires microservices',
          'CQRS, event sourcing and DDD are independent; ES practically requires CQRS-style read models for queries',
          'CQRS requires event sourcing',
        ],
        answer: 2,
        why: 'Most DDD systems are state-based. CQRS can be plain separate query code. ES needs projections because you cannot query streams efficiently.',
      },
      {
        q: 'A customer invokes GDPR erasure. Their name and passport number are inside KycVerified events in an immutable stream. A common technique?',
        options: [
          'Crypto-shredding: personal fields were encrypted with a per-customer key. Delete the key',
          'Delete the whole stream including financial history',
          'Ignore the request: events are immutable',
          'Change the events\' type to "Deleted"',
        ],
        answer: 0,
        why: 'Deleting the key makes the personal data unreadable while keeping non-personal financial facts. Better still: keep personal data out of events where you can. (Get legal advice for the real retention rules.)',
      },
    ],
    exercise: {
      task: `<p>Event-source a SkyHop <code>Booking</code>. Implement:</p>
      <ul>
        <li><code>evolve(state, e)</code> for <code>BookingCreated { ref, passengers }</code>
        (status <code>'CONFIRMED'</code>, <code>seats: {}</code>, <code>bags</code> = 0 per passenger),
        <code>SeatAssigned { passenger, seat }</code>, <code>BagAdded { passenger }</code>,
        <code>BookingCancelled</code> (status <code>'CANCELLED'</code>). Don't mutate the old state.</li>
        <li><code>stateAt(events, at)</code>: state from events with <code>e.at &lt;= at</code>.</li>
        <li><code>decideAddBag(state, passenger, at)</code>: returns
        <code>[{ type: 'BagAdded', passenger, at }]</code>, or throws <code>DomainError</code> if
        the booking is cancelled or the passenger already has 2 bags.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const initial = Object.freeze({ ref: null, status: 'NEW', seats: {}, bags: {} });

function evolve(state, e) {
  switch (e.type) {
    // TODO: BookingCreated, SeatAssigned, BagAdded, BookingCancelled
    default:
      return state;
  }
}

const rehydrate = (events) => events.reduce(evolve, initial);

function stateAt(events, at) {
  // TODO
  return initial;
}

function decideAddBag(state, passenger, at) {
  // TODO: rules, then return the new event(s)
  return [];
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof DomainError ? '✅' : '❌', name, '(' + e.message + ')');
  }
}

const events = [
  { type: 'BookingCreated', ref: 'PNR-0001', passengers: ['P1', 'P2'], at: '2026-11-01T10:00' },
  { type: 'SeatAssigned', passenger: 'P1', seat: '12A', at: '2026-11-01T10:05' },
  { type: 'BagAdded', passenger: 'P1', at: '2026-11-02T08:00' },
  { type: 'SeatAssigned', passenger: 'P1', seat: '3C', at: '2026-11-05T19:30' },
  { type: 'BagAdded', passenger: 'P1', at: '2026-11-06T07:00' },
];
const now = rehydrate(events);
check('current state', now,
  { ref: 'PNR-0001', status: 'CONFIRMED', seats: { P1: '3C' }, bags: { P1: 2, P2: 0 } });
check('seat on 3 Nov was 12A', stateAt(events, '2026-11-03T00:00').seats.P1, '12A');
check('before creation: initial', stateAt(events, '2026-10-01T00:00'), initial);
check('evolve does not mutate', (evolve(now, { type: 'BagAdded', passenger: 'P2' }), now.bags.P2), 0);
check('decide P2 bag', decideAddBag(now, 'P2', 'T1'), [{ type: 'BagAdded', passenger: 'P2', at: 'T1' }]);
expectThrows('P1 third bag rejected', () => decideAddBag(now, 'P1', 'T1'));
const cancelled = evolve(now, { type: 'BookingCancelled', at: '2026-11-07T00:00' });
check('cancelled status', cancelled.status, 'CANCELLED');
expectThrows('no bags on cancelled booking', () => decideAddBag(cancelled, 'P2', 'T2'));`,
      hint: 'BookingCreated: bags = Object.fromEntries(e.passengers.map(p => [p, 0])). For SeatAssigned/BagAdded spread both state and the nested object: { ...state, seats: { ...state.seats, [e.passenger]: e.seat } }.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const initial = Object.freeze({ ref: null, status: 'NEW', seats: {}, bags: {} });

function evolve(state, e) {
  switch (e.type) {
    case 'BookingCreated':
      return { ref: e.ref, status: 'CONFIRMED', seats: {},
        bags: Object.fromEntries(e.passengers.map((p) => [p, 0])) };
    case 'SeatAssigned':
      return { ...state, seats: { ...state.seats, [e.passenger]: e.seat } };
    case 'BagAdded':
      return { ...state, bags: { ...state.bags, [e.passenger]: state.bags[e.passenger] + 1 } };
    case 'BookingCancelled':
      return { ...state, status: 'CANCELLED' };
    default:
      return state;
  }
}

const rehydrate = (events) => events.reduce(evolve, initial);

function stateAt(events, at) {
  return rehydrate(events.filter((e) => e.at <= at));
}

function decideAddBag(state, passenger, at) {
  if (state.status !== 'CONFIRMED') throw new DomainError('booking is ' + state.status);
  if (!(passenger in state.bags)) throw new DomainError(passenger + ' not on booking');
  if (state.bags[passenger] >= 2) throw new DomainError(passenger + ' already has 2 bags');
  return [{ type: 'BagAdded', passenger, at }];
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof DomainError ? '✅' : '❌', name, '(' + e.message + ')');
  }
}

const events = [
  { type: 'BookingCreated', ref: 'PNR-0001', passengers: ['P1', 'P2'], at: '2026-11-01T10:00' },
  { type: 'SeatAssigned', passenger: 'P1', seat: '12A', at: '2026-11-01T10:05' },
  { type: 'BagAdded', passenger: 'P1', at: '2026-11-02T08:00' },
  { type: 'SeatAssigned', passenger: 'P1', seat: '3C', at: '2026-11-05T19:30' },
  { type: 'BagAdded', passenger: 'P1', at: '2026-11-06T07:00' },
];
const now = rehydrate(events);
check('current state', now,
  { ref: 'PNR-0001', status: 'CONFIRMED', seats: { P1: '3C' }, bags: { P1: 2, P2: 0 } });
check('seat on 3 Nov was 12A', stateAt(events, '2026-11-03T00:00').seats.P1, '12A');
check('before creation: initial', stateAt(events, '2026-10-01T00:00'), initial);
check('evolve does not mutate', (evolve(now, { type: 'BagAdded', passenger: 'P2' }), now.bags.P2), 0);
check('decide P2 bag', decideAddBag(now, 'P2', 'T1'), [{ type: 'BagAdded', passenger: 'P2', at: 'T1' }]);
expectThrows('P1 third bag rejected', () => decideAddBag(now, 'P1', 'T1'));
const cancelled = evolve(now, { type: 'BookingCancelled', at: '2026-11-07T00:00' });
check('cancelled status', cancelled.status, 'CANCELLED');
expectThrows('no bags on cancelled booking', () => decideAddBag(cancelled, 'P2', 'T2'));`,
    },
  },
  // ───────────────────────────────────────────────────────────── monolith-vs-microservices
  {
    id: 'monolith-vs-microservices',
    section: 'Architecture',
    title: 'Modular Monolith vs Microservices',
    explain: `
      <p>"We're doing DDD, so each bounded context is a microservice" is one of the most expensive
      misreadings of DDD. A <strong>bounded context is a model boundary</strong>: a language and a
      set of rules that are consistent inside. A <strong>microservice is a deployment
      boundary</strong>: a separately built, deployed and operated process. They often line up, but
      they don't have to.</p>

      <h3>Options on the spectrum</h3>
      <table>
        <tr><th>Style</th><th>Boundaries</th><th>Good when</th><th>Pain</th></tr>
        <tr><td><strong>Big ball of mud</strong></td><td>none</td><td>never on purpose</td><td>everything couples to everything</td></tr>
        <tr><td><strong>Modular monolith</strong></td><td>contexts = modules with public APIs, enforced by tooling; one deployable</td><td>1 to a handful of teams, boundaries still moving, want simple ops and in-process transactions</td><td>one deploy pipeline; a bad module can take the process down; scaling is all-or-nothing</td></tr>
        <tr><td><strong>Microservices</strong></td><td>contexts (or parts of them) = services with their own DB</td><td>many teams needing independent deploys, very different scaling or reliability needs, stable boundaries</td><td>network failures, eventual consistency everywhere, distributed tracing, on-call for N services</td></tr>
        <tr><td><strong>Distributed monolith</strong></td><td>services in name only</td><td>never</td><td>all of the microservices pain plus all of the coupling</td></tr>
      </table>

      <h3>The distributed monolith anti-pattern</h3>
      <p>Symptoms: services share a database; a checkout request makes a chain of 5 synchronous
      HTTP calls; you can't deploy <code>booking</code> without also deploying <code>pricing</code>;
      one service going down takes the site down. This usually happens when services are split by
      technical layer or by entity ("CustomerService", "OrderService") instead of along bounded
      contexts, or split before the boundaries were understood.</p>

      <h3>Getting module boundaries right first</h3>
      <ul>
        <li>One folder/package per bounded context. Each exposes a small <strong>public API</strong>
        (functions, commands, events). Everything else is private.</li>
        <li>Each module declares its dependencies. A CI check fails when module A reaches into
        module B's internals or tables. <strong>Shopify</strong> did this for its large Rails
        monolith and open-sourced <strong>Packwerk</strong> (2020), which checks that code only
        references packages it declares as dependencies.</li>
        <li>Each module owns its tables. No cross-module joins. Talk via API calls or events, even
        in-process.</li>
        <li>Once boundaries have been stable for a while, extracting a module into a service is
        mostly swapping an in-process call for a network client (example 1, last step).</li>
      </ul>

      <h3>Public stories worth knowing</h3>
      <ul>
        <li><strong>Segment</strong>'s "Goodbye Microservices" (2018): they merged over a hundred
        destination microservices back into one service because the operational overhead outweighed
        the benefits.</li>
        <li><strong>Amazon Prime Video</strong> (2023) moved one monitoring service from distributed
        serverless components to a single process and reported about 90% lower infrastructure cost.
        That was one workload, not a verdict on microservices.</li>
        <li><strong>Conway's law</strong>: system structure mirrors the communication structure of the
        organization. Service boundaries that cut across team boundaries will hurt.</li>
      </ul>

      <div class="warn">Microservices are mostly an <strong>organizational</strong> scaling tool:
      they let many teams deploy independently. If you have one team, you get the costs without
      the main benefit.</div>

      <div class="tip"><strong>In the real world:</strong> "monolith first" (Martin Fowler's
      phrasing) is common advice: start with a well-modularized monolith along bounded contexts,
      measure, and extract services when a specific force appears, such as a team that needs to deploy
      independently, a component with very different load, or a different reliability or compliance
      requirement. Extract the context with the clearest boundary and fewest synchronous dependencies
      first.</div>
    `,
    examples: [
      {
        title: 'A modular monolith with enforced boundaries',
        code: `class BoundaryViolation extends Error {
  constructor(m) { super(m); this.name = 'BoundaryViolation'; }
}

// ── tiny module registry (what Packwerk-style tools check statically) ──
const modules = new Map();
function defineModule(name, { dependsOn = [], api }) {
  modules.set(name, { dependsOn, api });
}
function use(from, to) {
  if (!modules.get(from).dependsOn.includes(to)) {
    throw new BoundaryViolation(from + ' has not declared a dependency on ' + to);
  }
  return new Proxy(modules.get(to).api, {
    get(api, prop) {
      if (!(prop in api)) {
        throw new BoundaryViolation(to + '.' + String(prop) + ' is not public');
      }
      return api[prop];
    },
  });
}

// ── pricing module: private table, public quote() ──
const fareTable = { 'SH101:Y': 129, 'SH101:J': 499 };   // private to pricing
defineModule('pricing', {
  api: {
    quote: (flightNo, cabin) => ({ flightNo, cabin, amount: fareTable[flightNo + ':' + cabin] }),
  },
});

// ── booking module: declares pricing, uses only its API ──
let seq = 0;
defineModule('booking', {
  dependsOn: ['pricing'],
  api: {
    book(flightNo, cabin) {
      const q = use('booking', 'pricing').quote(flightNo, cabin);
      return { ref: 'PNR-' + String(++seq).padStart(4, '0'), ...q };
    },
  },
});

// ── loyalty module: declares nothing ──
defineModule('loyalty', { dependsOn: [], api: {} });

const tryIt = (label, fn) => {
  try {
    console.log(label, '→', fn());
  } catch (e) {
    console.log(label, '→', e.name + ': ' + e.message);
  }
};

// The HTTP layer is the composition root: it may call any module's public API.
const http = (name) => modules.get(name).api;

tryIt('POST /bookings SH101 Y', () => http('booking').book('SH101', 'Y'));
tryIt('booking reads pricing.fareTable', () => use('booking', 'pricing').fareTable);
tryIt('loyalty calls booking.book', () => use('loyalty', 'booking').book('SH101', 'J'));

// ── later: pricing is extracted into its own service ──
// Only the module's implementation changes. Callers keep calling quote().
const fakeHttp = (path) => ({ status: 200, json: { flightNo: 'SH101', cabin: 'J', amount: 479 } });
modules.get('pricing').api = {
  quote(flightNo, cabin) {
    const res = fakeHttp('/pricing/quote?flight=' + flightNo + '&cabin=' + cabin);
    console.log('  [http] GET pricing-service → ' + res.status);
    return res.json;
  },
};
tryIt('POST /bookings SH101 J (pricing extracted)', () => http('booking').book('SH101', 'J'));`,
      },
      {
        title: 'Widget: monolith, modular monolith or microservices?',
        lang: 'html',
        editor: false,
        code: `<style>
  .mm { background:#1b1f27; color:#e6e6e6; font:14px system-ui, sans-serif; padding:14px;
        border-radius:10px; }
  .mm h4 { margin:0 0 4px; }
  .mm .grid { display:grid; grid-template-columns: 1fr 70px; gap:6px 12px; align-items:center;
        margin:10px 0; }
  .mm input[type=range] { width:100%; }
  .mm .val { font-weight:700; text-align:right; color:#f5a524; }
  .mm .out { background:#11141a; border-radius:8px; padding:10px; }
  .mm .rec { font-size:17px; font-weight:700; margin-bottom:6px; }
  .mm .bar { height:10px; border-radius:5px; background:#2a303c; overflow:hidden; margin:6px 0; }
  .mm .bar > div { height:100%; background:linear-gradient(90deg,#5ad17a,#f5a524,#ff6b6b); }
  .mm ul { margin:6px 0 0 18px; padding:0; }
  .mm .warn { color:#ff9b9b; }
</style>
<div class="mm">
  <h4>Architecture advisor (a conversation starter, not an oracle)</h4>
  <div style="font-size:13px;color:#aab">Move the sliders to describe your situation.</div>
  <div class="grid" id="grid"></div>
  <div class="out">
    <div class="rec" id="rec"></div>
    <div style="font-size:12px;color:#aab">monolith ◄── pressure ──► microservices</div>
    <div class="bar"><div id="bar"></div></div>
    <ul id="why"></ul>
  </div>
</div>
<script>
  const KNOBS = [
    { id: 'teams', label: 'Teams working on the system', min: 1, max: 20, v: 2 },
    { id: 'deploy', label: 'Need for independent deploys (0 none – 3 critical)', min: 0, max: 3, v: 1 },
    { id: 'scale', label: 'Parts with very different load/reliability needs (0–3)', min: 0, max: 3, v: 0 },
    { id: 'clarity', label: 'How stable are the bounded context boundaries? (0 unknown – 3 proven)', min: 0, max: 3, v: 1 },
    { id: 'ops', label: 'Ops maturity: CI/CD, tracing, on-call (0–3)', min: 0, max: 3, v: 1 },
  ];
  const s = {};
  const grid = document.getElementById('grid');
  for (const k of KNOBS) {
    s[k.id] = k.v;
    const label = document.createElement('label');
    label.textContent = k.label;
    const wrap = document.createElement('div');
    const input = document.createElement('input');
    input.type = 'range'; input.min = k.min; input.max = k.max; input.value = k.v;
    const val = document.createElement('div');
    val.className = 'val';
    val.textContent = k.v;
    input.oninput = () => { s[k.id] = Number(input.value); val.textContent = input.value; render(); };
    label.appendChild(input);
    grid.appendChild(label);
    grid.appendChild(val);
  }
  function render() {
    const why = [];
    let p = 0;
    p += Math.min(s.teams, 12) * 4;          // up to 48
    p += s.deploy * 10;                       // up to 30
    p += s.scale * 7;                         // up to 21
    const pressure = Math.min(100, p);
    const readiness = s.clarity + s.ops;      // 0..6
    let rec;
    if (pressure < 30) {
      rec = 'Modular monolith';
      why.push('Few teams and little need for independent deploys: one deployable is cheapest.');
      why.push('Still split it into modules per bounded context with enforced public APIs.');
    } else if (pressure < 60 || readiness < 4) {
      rec = 'Modular monolith, extract 1–2 services where a specific force exists';
      why.push('Some pressure, but not enough (or not ready enough) for a full split.');
      if (s.scale >= 2) why.push('Extract the part with very different load or reliability needs first.');
      if (s.deploy >= 2) why.push('Extract the context whose team is blocked most by the shared release.');
    } else {
      rec = 'Microservices along bounded contexts';
      why.push('Many teams needing independent deploys, and the boundaries and ops are mature.');
      why.push('One service per context (or a few per large context), each owning its data.');
    }
    if (s.clarity <= 1 && pressure >= 30) {
      why.push('<span class="warn">Boundaries are unclear: splitting now risks a distributed monolith. Run Event Storming / context mapping first.</span>');
    }
    if (s.ops <= 1 && pressure >= 60) {
      why.push('<span class="warn">Low ops maturity: N services means N pipelines, dashboards and pagers. Invest there first.</span>');
    }
    if (s.teams === 1 && s.deploy >= 2) {
      why.push('One team wanting independent deploys usually needs a faster pipeline, not more services.');
    }
    document.getElementById('rec').textContent = rec;
    document.getElementById('bar').style.width = pressure + '%';
    document.getElementById('why').innerHTML = why.map((w) => '<li>' + w + '</li>').join('');
  }
  render();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop has one 8-person team and has identified 6 bounded contexts. A tech lead proposes 6 microservices on day one. Best response?',
        options: [
          'Agree: one bounded context must be one microservice',
          'Build a modular monolith with one module per context and enforced boundaries; extract services when a concrete force appears',
          'Build one service with no modules to move fast',
          'Build 12 services so each context can be split into read and write',
        ],
        answer: 1,
        why: 'A bounded context is a model boundary, not a deployment unit. With one team, microservices add network and ops costs without the main benefit, independent team deploys.',
      },
      {
        q: 'ShopLane split into Orders, Inventory and Shipping services. All three read and write the same <code>shop</code> Postgres database, and a schema change requires deploying all three together. This is…',
        options: [
          'A well-designed microservice architecture',
          'A distributed monolith: shared database and lock-step deploys',
          'A modular monolith',
          'Event sourcing',
        ],
        answer: 1,
        why: 'Shared databases and coordinated deploys mean you pay for distribution but keep the coupling. Each service should own its data and talk via APIs or events.',
      },
      {
        q: 'In a modular monolith, the Loyalty module runs <code>SELECT * FROM bookings JOIN payments …</code> directly. What is the boundary-respecting alternative?',
        options: [
          'It\'s fine: it\'s all one database',
          'Use Booking\'s public API or subscribe to its events (e.g. FlightFlown) and keep a local read model',
          'Move the Loyalty tables into the Booking module',
          'Create a database view owned by nobody',
        ],
        answer: 1,
        why: 'Modules own their tables. Cross-module joins couple schemas and make later extraction impossible. Go through APIs or events, even in-process.',
      },
      {
        q: 'Which force is the strongest reason to extract SkyHop\'s Pricing context into its own service?',
        options: [
          'It has the most classes',
          'Microservices are more modern',
          'Pricing needs to scale to 50× the traffic of the rest during fare sales, and its team must release several times a day independently',
          'The CTO read a blog post',
        ],
        answer: 2,
        why: 'Extract for concrete forces: different scaling or reliability needs, or a team blocked by shared releases. Size and fashion are not reasons.',
      },
    ],
    exercise: {
      task: `<p>Write <code>findSmells(services)</code>, a distributed-monolith detector. Each
      service is <code>{ name, db, calls: [names of services it calls synchronously] }</code>.
      Return an array of strings, in this order:</p>
      <ol>
        <li>For each database used by 2+ services (in order of first appearance):
        <code>'shared-db orders_db: checkout, inventory'</code> (names in input order).</li>
        <li>For each pair that call each other synchronously (report once, first-listed service
        first): <code>'sync-cycle: inventory &lt;-&gt; shipping'</code>.</li>
        <li>For each service whose longest synchronous call chain (counting itself, never visiting a
        service twice) is 4 or more: <code>'deep-chain: checkout (4)'</code>.</li>
      </ol>`,
      starter: `function findSmells(services) {
  const out = [];
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));

  // 1. shared databases
  // TODO

  // 2. mutual synchronous calls
  // TODO

  // 3. deep chains: longest path counting nodes, no revisits
  function depth(name, seen) {
    // TODO: 1 + max depth of callees not in seen
    return 1;
  }
  // TODO: push 'deep-chain: name (n)' for depth >= 4

  return out;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const shoplane = [
  { name: 'checkout', db: 'orders_db', calls: ['pricing', 'inventory'] },
  { name: 'pricing', db: 'pricing_db', calls: ['catalog'] },
  { name: 'catalog', db: 'catalog_db', calls: [] },
  { name: 'inventory', db: 'orders_db', calls: ['shipping'] },
  { name: 'shipping', db: 'shipping_db', calls: ['inventory', 'carrier'] },
  { name: 'carrier', db: 'carrier_db', calls: [] },
];
check('finds all smells', findSmells(shoplane), [
  'shared-db orders_db: checkout, inventory',
  'sync-cycle: inventory <-> shipping',
  'deep-chain: checkout (4)',
]);

const healthy = [
  { name: 'booking', db: 'booking_db', calls: ['pricing'] },
  { name: 'pricing', db: 'pricing_db', calls: [] },
  { name: 'loyalty', db: 'loyalty_db', calls: [] },
];
check('healthy system has none', findSmells(healthy), []);
check('three on one db', findSmells([
  { name: 'a', db: 'x', calls: [] },
  { name: 'b', db: 'x', calls: [] },
  { name: 'c', db: 'x', calls: [] },
]), ['shared-db x: a, b, c']);`,
      hint: 'Shared DB: group names in a Map keyed by db (Map keeps insertion order). Cycles: for i < j, check a.calls.includes(b.name) && b.calls.includes(a.name). depth(name, seen): const next = byName[name].calls.filter(c => !seen.has(c)); return 1 + Math.max(0, ...next.map(c => depth(c, new Set([...seen, c])))).',
      solution: `function findSmells(services) {
  const out = [];
  const byName = Object.fromEntries(services.map((s) => [s.name, s]));

  // 1. shared databases
  const byDb = new Map();
  for (const s of services) byDb.set(s.db, [...(byDb.get(s.db) || []), s.name]);
  for (const [db, names] of byDb) {
    if (names.length > 1) out.push('shared-db ' + db + ': ' + names.join(', '));
  }

  // 2. mutual synchronous calls
  for (let i = 0; i < services.length; i++) {
    for (let j = i + 1; j < services.length; j++) {
      const a = services[i];
      const b = services[j];
      if (a.calls.includes(b.name) && b.calls.includes(a.name)) {
        out.push('sync-cycle: ' + a.name + ' <-> ' + b.name);
      }
    }
  }

  // 3. deep chains: longest path counting nodes, no revisits
  function depth(name, seen) {
    const next = byName[name].calls.filter((c) => !seen.has(c));
    return 1 + Math.max(0, ...next.map((c) => depth(c, new Set([...seen, c]))));
  }
  for (const s of services) {
    const d = depth(s.name, new Set([s.name]));
    if (d >= 4) out.push('deep-chain: ' + s.name + ' (' + d + ')');
  }

  return out;
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const shoplane = [
  { name: 'checkout', db: 'orders_db', calls: ['pricing', 'inventory'] },
  { name: 'pricing', db: 'pricing_db', calls: ['catalog'] },
  { name: 'catalog', db: 'catalog_db', calls: [] },
  { name: 'inventory', db: 'orders_db', calls: ['shipping'] },
  { name: 'shipping', db: 'shipping_db', calls: ['inventory', 'carrier'] },
  { name: 'carrier', db: 'carrier_db', calls: [] },
];
check('finds all smells', findSmells(shoplane), [
  'shared-db orders_db: checkout, inventory',
  'sync-cycle: inventory <-> shipping',
  'deep-chain: checkout (4)',
]);

const healthy = [
  { name: 'booking', db: 'booking_db', calls: ['pricing'] },
  { name: 'pricing', db: 'pricing_db', calls: [] },
  { name: 'loyalty', db: 'loyalty_db', calls: [] },
];
check('healthy system has none', findSmells(healthy), []);
check('three on one db', findSmells([
  { name: 'a', db: 'x', calls: [] },
  { name: 'b', db: 'x', calls: [] },
  { name: 'c', db: 'x', calls: [] },
]), ['shared-db x: a, b, c']);`,
    },
  },
);
