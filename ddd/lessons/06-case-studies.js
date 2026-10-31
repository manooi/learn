window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── refactor-legacy
  {
    id: 'refactor-legacy',
    section: 'Real-World Case Studies',
    title: 'Refactoring a Legacy Booking Service',
    explain: `
      <p>Few people start DDD on a blank page. Most inherit something like SkyHop's
      <code>BookingService.update(id, data)</code>: one endpoint that does everything, a row object
      with cryptic status codes, rules spread across <code>if</code> statements, and no tests. The
      business can't stop while you rewrite it. This lesson is the safe, incremental path.</p>

      <h3>The playbook</h3>
      <ol>
        <li><strong>Characterization tests first</strong> (Michael Feathers, <em>Working
        Effectively with Legacy Code</em>). Before changing anything, write tests that record what
        the code <em>does today</em>, including the weird parts. They're a safety net, not a
        statement that the behaviour is correct.</li>
        <li><strong>Name the concepts.</strong> Sit with the domain experts and translate:
        <code>status 'X'</code> is <em>Cancelled</em>; <code>pnr</code> is the <em>booking
        reference</em>; <code>update({ bags: 3 })</code> really means <em>change checked bags</em>.
        Write the glossary down. This is ubiquitous language applied to old code.</li>
        <li><strong>Extract value objects</strong> for the primitives with rules:
        <code>BookingRef</code>, <code>Money</code>, <code>SeatNumber</code>. Validation moves to one
        place, and there are no more floats for money.</li>
        <li><strong>Move rules into an aggregate.</strong> <code>booking.cancel()</code>,
        <code>booking.changeBags(n)</code>, <code>booking.changeSeat(s)</code> replace the
        <code>if</code> chain. The generic <code>update</code> becomes a thin translator to these
        intention-revealing methods.</li>
        <li><strong>Add domain events</strong> (<code>BookingCancelled</code>,
        <code>BagsChanged</code>), so other contexts can react without being called directly.</li>
        <li><strong>Strangle, don't rewrite.</strong> Martin Fowler's <em>strangler fig</em>
        pattern: put a router in front of the old code and move one operation at a time to the new
        model behind a flag. Old and new run side by side until the old path is dead code.</li>
      </ol>

      <div class="warn"><strong>Preserve or fix?</strong> Characterization tests will expose bugs
      (in the example, seat changes are accepted on cancelled bookings). Don't silently fix them
      during the refactor. Ask the product owner, then change the test <em>deliberately</em> in a
      separate, visible step. Someone downstream may depend on the bug.</div>

      <div class="tip"><strong>In the real world:</strong> the biggest risk is the "big rewrite" that
      runs for 18 months while the old system keeps changing. Strangler-style migrations ship value
      every sprint. A common trick is to run old and new side by side in "shadow mode": the new code
      computes a result, the old code's result is returned, and differences are logged until there
      are none. Also, put an anticorruption layer between the new model and the legacy schema, so
      the cryptic codes never leak into the new domain.</div>
    `,
    examples: [
      {
        title: 'Step 0: the legacy service + characterization tests',
        explain: `
          <details>
            <summary>The problem: what does <code>update(id, data)</code> actually do?</summary>
            <p>Read it and try to answer: what does <code>status: 'X'</code> mean? Why
            <code>- 30</code>? Can a cancelled booking change seats? Nobody on the team is sure, and the
            original author left. Every rule (<em>max 2 bags per passenger</em>, <em>A$35 per bag</em>,
            <em>A$30 cancellation fee</em>) is an anonymous <code>if</code> or magic number inside one
            generic method. Every caller sends a bag of fields, and the method guesses the intention from
            which keys are present.</p>
            <p>Before restructuring code like this you need to know, precisely, what it does today.</p>
          </details>
          <details>
            <summary>Step by step: building the golden master</summary>
            <table>
              <tr><th>Case</th><th>Input</th><th>Recorded output (golden master)</th><th>Note</th></tr>
              <tr><td>add 2 bags</td><td>id 1, <code>{ bags: 3 }</code></td><td><code>total: 328</code></td><td>258 + 2 × 35</td></tr>
              <tr><td>too many bags</td><td><code>{ bags: 5 }</code></td><td><code>{"ok":false,"err":"too many bags"}</code></td><td>limit = pax × 2 = 4</td></tr>
              <tr><td>remove a bag</td><td><code>{ bags: 0 }</code></td><td><code>total: 223</code></td><td>bags are refunded at A$35</td></tr>
              <tr><td>cancel</td><td><code>{ status: 'X' }</code></td><td><code>status: "X", total: 228</code></td><td>the "fee" reduces <code>total</code></td></tr>
              <tr><td>seat on cancelled (!)</td><td>id 2, <code>{ seat: '1A' }</code></td><td><code>{"ok":true,…"seat":"1A"}</code></td><td><strong>probably a bug</strong>, but recorded as-is</td></tr>
              <tr><td>unknown id</td><td>id 9</td><td><code>{"ok":false,"err":"not found"}</code></td><td></td></tr>
            </table>
            <p>Step A prints each case's actual output; that output <em>becomes</em> the expected
            value. Step B replays every case against a service and compares strings:
            <code>legacy vs its own golden master: 10/10</code>. <code>seed()</code> before each case
            matters: the legacy code mutates rows in place, so cases would otherwise leak into each other.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Here the golden master is computed from the code it tests, which only makes sense for the very first run. Real suites store the strings, as example 2 does with its <code>CASES</code>. In example 2, change <code>* 35</code> to <code>* 36</code> inside <code>Legacy</code>: "add 2 bags" and "remove a bag" go ❌. That's the net catching an accidental change.</li>
              <li>Add a case <code>['cancel + bags', 1, { status: 'X', bags: 2 }]</code>. The output is an error, <em>but</em> the row was already set to <code>'X'</code> before the bag check failed. Legacy code has partial updates. Record that too, and decide later.</li>
            </ul>
          </details>
        `,
        code: `// ═══ LEGACY CODE (as found) ═══════════════════════════════════
const db = new Map();
function seed() {
  db.clear();
  db.set(1, { id: 1, pnr: 'ABC123', status: 'C', pax: 2, bags: 1, seat: '12A', total: 258 });
  db.set(2, { id: 2, pnr: 'XYZ789', status: 'X', pax: 1, bags: 0, seat: '3C', total: 59 });
}

const BookingService = {
  update(id, data) {
    const row = db.get(id);
    if (!row) return { ok: false, err: 'not found' };
    if (data.status === 'X') {
      if (row.status === 'X') return { ok: false, err: 'already' };
      row.status = 'X';
      row.total = row.total - 30; // ??? someone said "fee"
    }
    if (data.bags !== undefined) {
      if (row.status === 'X') return { ok: false, err: 'cancelled' };
      if (data.bags > row.pax * 2) return { ok: false, err: 'too many bags' };
      row.total = row.total + (data.bags - row.bags) * 35;
      row.bags = data.bags;
    }
    if (data.seat) {
      if (!/^[0-9]+[A-F]$/.test(data.seat)) return { ok: false, err: 'bad seat' };
      row.seat = data.seat;
    }
    return { ok: true, row: { ...row } };
  },
};

// ═══ CHARACTERIZATION TESTS: record what it DOES, not what it should do ═══
const CASES = [
  ['add 2 bags', 1, { bags: 3 }],
  ['too many bags', 1, { bags: 5 }],
  ['remove a bag', 1, { bags: 0 }],
  ['change seat', 1, { seat: '14C' }],
  ['bad seat', 1, { seat: '99Z' }],
  ['cancel', 1, { status: 'X' }],
  ['cancel twice', 2, { status: 'X' }],
  ['bags on cancelled', 2, { bags: 1 }],
  ['seat on cancelled (!)', 2, { seat: '1A' }],
  ['unknown id', 9, { bags: 1 }],
];
// Step A: run once, print the actual output = the "golden master"
seed();
const golden = CASES.map(([name, id, data]) => {
  seed();
  return [name, JSON.stringify(BookingService.update(id, data))];
});
for (const [name, out] of golden) console.log(name.padEnd(22), out);

// Step B: the recorded masters become assertions that any refactor must keep.
function characterize(service) {
  let pass = 0;
  for (const [i, [name, id, data]] of CASES.entries()) {
    seed();
    const out = JSON.stringify(service.update(id, data));
    if (out === golden[i][1]) pass++;
    else console.log('  ❌', name, 'changed:', out);
  }
  return pass + '/' + CASES.length;
}
console.log('legacy vs its own golden master:', characterize(BookingService));`,
      },
      {
        title: 'Steps 1–5: value objects, aggregate, events, strangler router',
        explain: `
          <details>
            <summary>Steps 1–4: what changed, concept by concept</summary>
            <table>
              <tr><th>Legacy</th><th>New model</th><th>Why it's better</th></tr>
              <tr><td><code>status 'C' / 'X'</code></td><td><code>'CONFIRMED' / 'CANCELLED'</code>, translated only in <code>toDomain</code>/<code>toRow</code></td><td>Ubiquitous language in the model; cryptic codes stay at the edge (anticorruption)</td></tr>
              <tr><td><code>total: 258</code> (float dollars)</td><td><code>Money</code> in integer cents, <code>plus</code>/<code>times</code></td><td>No float drift, one place for money rules</td></tr>
              <tr><td><code>/^[0-9]+[A-F]$/</code> inline</td><td><code>new SeatNumber(v)</code></td><td>An invalid seat can't exist anywhere in the model</td></tr>
              <tr><td><code>if (data.bags !== undefined) …</code></td><td><code>booking.changeBags(n)</code></td><td>Intention-revealing method; the rule lives with the data it protects</td></tr>
              <tr><td>(nothing)</td><td><code>BagsChanged</code>, <code>SeatChanged</code>, <code>BookingCancelled</code></td><td>Other contexts can react (pricing, notifications) without being called</td></tr>
            </table>
            <p><code>V2.update</code> keeps the <strong>old contract</strong> (same input, same
            <code>{ ok, row/err }</code> output) but is now just a translator: <em>which intention does
            this payload express?</em> Callers don't have to change yet. Note also that V2 works on a
            copy and only saves on success, so the legacy partial-update problem disappears.</p>
          </details>
          <details>
            <summary>Step 5: the strangler router run, line by line</summary>
            <table>
              <tr><th><code>migrated</code></th><th>Who handles bags / cancel / seat</th><th>Console</th></tr>
              <tr><td>(none)</td><td>legacy / legacy / legacy</td><td><code>router, nothing migrated 10/10</code></td></tr>
              <tr><td><code>bags</code></td><td><strong>V2</strong> / legacy / legacy</td><td><code>router, bags → V2 10/10</code></td></tr>
              <tr><td><code>bags, cancel, seat</code></td><td>V2 / V2 / V2</td><td><code>router, everything → V2 10/10</code></td></tr>
            </table>
            <p>Every row is checked against the <em>same</em> golden master, so each migration step
            is proven safe on its own. In production, <code>migrated</code> would be a feature flag,
            rolled out per operation (and maybe per percentage of traffic).</p>
            <p><code>events from V2 run: BagsChanged, BagsChanged, BagsChanged, BagsChanged, SeatChanged, BookingCancelled, SeatChanged</code>:
            two <code>BagsChanged</code> came from the "bags → V2" run (add, remove), and the rest from the
            "everything → V2" run. Failed cases (too many bags, bags on cancelled) produced
            <strong>no</strong> events, because the aggregate threw before recording them.</p>
          </details>
          <details>
            <summary>Step 6: fixing the quirk on purpose</summary>
            <p>Only after the migration is complete, in a separate change approved by the product owner,
            does <code>changeSeat</code> start rejecting cancelled bookings. The output shows why it
            must be a separate, visible step:</p>
            <pre><code>  ❌ seat on cancelled (!) → {"ok":false,"err":"cancelled"}
V2 with fix vs OLD golden master   9/10
V2 with fix vs UPDATED cases       10/10</code></pre>
            <p>The old master catches the change (good: it's a real behaviour change). The case is then
            updated <em>explicitly</em> in <code>FIXED</code>, so reviewers see "we now reject seat
            changes on cancelled bookings" as its own diff.</p>
            <div class="tip">The order matters: <strong>tests → names → value objects → aggregate →
            events → route traffic → delete legacy → fix quirks</strong>. Each step is small, reversible
            and shippable. If you have to stop halfway because of a deadline, you still have something
            better than you started with.</div>
          </details>
        `,
        code: `// (legacy code + golden cases copied from example 1 so this runs on its own)
const db = new Map();
function seed() {
  db.clear();
  db.set(1, { id: 1, pnr: 'ABC123', status: 'C', pax: 2, bags: 1, seat: '12A', total: 258 });
  db.set(2, { id: 2, pnr: 'XYZ789', status: 'X', pax: 1, bags: 0, seat: '3C', total: 59 });
}
const Legacy = {
  update(id, data) {
    const row = db.get(id);
    if (!row) return { ok: false, err: 'not found' };
    if (data.status === 'X') {
      if (row.status === 'X') return { ok: false, err: 'already' };
      row.status = 'X';
      row.total = row.total - 30;
    }
    if (data.bags !== undefined) {
      if (row.status === 'X') return { ok: false, err: 'cancelled' };
      if (data.bags > row.pax * 2) return { ok: false, err: 'too many bags' };
      row.total = row.total + (data.bags - row.bags) * 35;
      row.bags = data.bags;
    }
    if (data.seat) {
      if (!/^[0-9]+[A-F]$/.test(data.seat)) return { ok: false, err: 'bad seat' };
      row.seat = data.seat;
    }
    return { ok: true, row: { ...row } };
  },
};
const CASES = [
  ['add 2 bags', 1, { bags: 3 }, '{"ok":true,"row":{"id":1,"pnr":"ABC123","status":"C","pax":2,"bags":3,"seat":"12A","total":328}}'],
  ['too many bags', 1, { bags: 5 }, '{"ok":false,"err":"too many bags"}'],
  ['remove a bag', 1, { bags: 0 }, '{"ok":true,"row":{"id":1,"pnr":"ABC123","status":"C","pax":2,"bags":0,"seat":"12A","total":223}}'],
  ['change seat', 1, { seat: '14C' }, '{"ok":true,"row":{"id":1,"pnr":"ABC123","status":"C","pax":2,"bags":1,"seat":"14C","total":258}}'],
  ['bad seat', 1, { seat: '99Z' }, '{"ok":false,"err":"bad seat"}'],
  ['cancel', 1, { status: 'X' }, '{"ok":true,"row":{"id":1,"pnr":"ABC123","status":"X","pax":2,"bags":1,"seat":"12A","total":228}}'],
  ['cancel twice', 2, { status: 'X' }, '{"ok":false,"err":"already"}'],
  ['bags on cancelled', 2, { bags: 1 }, '{"ok":false,"err":"cancelled"}'],
  ['seat on cancelled (!)', 2, { seat: '1A' }, '{"ok":true,"row":{"id":2,"pnr":"XYZ789","status":"X","pax":1,"bags":0,"seat":"1A","total":59}}'],
  ['unknown id', 9, { bags: 1 }, '{"ok":false,"err":"not found"}'],
];
function characterize(label, service, cases = CASES) {
  let pass = 0;
  for (const [name, id, data, expected] of cases) {
    seed();
    const out = JSON.stringify(service.update(id, data));
    if (out === expected) pass++;
    else console.log('  ❌', name, '→', out);
  }
  console.log(label.padEnd(34), pass + '/' + cases.length);
}

// ═══ STEP 1: name the concepts (glossary agreed with the business) ═══
// status 'C' = Confirmed, 'X' = Cancelled · pnr = BookingRef · total = amount paid (AUD)
// "fee" = cancellation fee A$30 · bag = checked bag A$35, max 2 per passenger

// ═══ STEP 2: value objects ═══
class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class Money {
  constructor(cents) {
    if (!Number.isInteger(cents)) throw new DomainError('cents must be an integer');
    this.cents = cents;
    Object.freeze(this);
  }
  static aud(dollars) { return new Money(Math.round(dollars * 100)); }
  plus(o) { return new Money(this.cents + o.cents); }
  times(n) { return new Money(this.cents * n); }
  get dollars() { return this.cents / 100; }
}
class SeatNumber {
  constructor(v) {
    if (!/^[0-9]+[A-F]$/.test(v)) throw new DomainError('bad seat');
    this.value = v;
    Object.freeze(this);
  }
}
const BAG_PRICE = Money.aud(35);
const CANCEL_FEE = Money.aud(30);

// ═══ STEPS 3 + 4: rules move into the aggregate, which records events ═══
class Booking {
  #events = [];
  constructor({ id, ref, status, passengers, bags, seat, paid }) {
    Object.assign(this, { id, ref, status, passengers, bags, seat, paid });
  }
  cancel() {
    if (this.status === 'CANCELLED') throw new DomainError('already');
    this.status = 'CANCELLED';
    this.paid = this.paid.plus(CANCEL_FEE.times(-1));
    this.#events.push({ type: 'BookingCancelled', ref: this.ref });
  }
  changeBags(n) {
    if (this.status === 'CANCELLED') throw new DomainError('cancelled');
    if (n > this.passengers * 2) throw new DomainError('too many bags');
    this.paid = this.paid.plus(BAG_PRICE.times(n - this.bags));
    this.#events.push({ type: 'BagsChanged', ref: this.ref, from: this.bags, to: n });
    this.bags = n;
  }
  changeSeat(seat) {
    this.seat = seat; // quirk preserved for now (see golden case "seat on cancelled")
    this.#events.push({ type: 'SeatChanged', ref: this.ref, seat: seat.value });
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
}

// Anticorruption mapping: legacy row <-> aggregate. Cryptic codes stop here.
const toDomain = (r) => new Booking({ id: r.id, ref: r.pnr, status: r.status === 'X' ? 'CANCELLED'
  : 'CONFIRMED', passengers: r.pax, bags: r.bags, seat: new SeatNumber(r.seat), paid: Money.aud(r.total) });
const toRow = (b) => ({ id: b.id, pnr: b.ref, status: b.status === 'CANCELLED' ? 'X' : 'C',
  pax: b.passengers, bags: b.bags, seat: b.seat.value, total: b.paid.dollars });

const published = [];
// New implementation of the OLD contract: translate data → intention-revealing calls.
const V2 = {
  update(id, data) {
    if (!db.has(id)) return { ok: false, err: 'not found' };
    const b = toDomain(db.get(id));
    try {
      if (data.status === 'X') b.cancel();
      if (data.bags !== undefined) b.changeBags(data.bags);
      if (data.seat) b.changeSeat(new SeatNumber(data.seat));
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, err: e.message };
      throw e;
    }
    db.set(id, toRow(b));
    published.push(...b.pullEvents());
    return { ok: true, row: { ...db.get(id) } };
  },
};

// ═══ STEP 5: strangler router, moving one operation at a time ═══
const migrated = new Set();
const opOf = (data) => (data.status ? 'cancel' : data.bags !== undefined ? 'bags' : 'seat');
const Router = { update: (id, data) => (migrated.has(opOf(data)) ? V2 : Legacy).update(id, data) };

characterize('legacy', Legacy);
characterize('router, nothing migrated', Router);
migrated.add('bags');
characterize('router, bags → V2', Router);
migrated.add('cancel');
migrated.add('seat');
characterize('router, everything → V2', Router);
console.log('events from V2 run:', published.map((e) => e.type).join(', '));

// ═══ STEP 6 (separate PR, product owner agreed): fix the quirk ON PURPOSE ═══
Booking.prototype.changeSeat = function (seat) {
  if (this.status === 'CANCELLED') throw new DomainError('cancelled');
  this.seat = seat;
};
const FIXED = CASES.map((c) => (c[0] === 'seat on cancelled (!)'
  ? [c[0], c[1], c[2], '{"ok":false,"err":"cancelled"}'] : c));
characterize('V2 with fix vs OLD golden master', V2);
characterize('V2 with fix vs UPDATED cases', V2, FIXED);`,
      },
    ],
    quiz: [
      {
        q: 'You find that legacy <code>update()</code> lets passengers change seats on cancelled bookings. You\'re mid-refactor. What do you do?',
        options: [
          'Fix it silently in the new aggregate; it\'s obviously a bug',
          'Keep the characterization test green for now, raise it with the product owner, and change the test deliberately in a separate step',
          'Delete the characterization test',
          'Throw an exception in the legacy code too',
        ],
        answer: 1,
        why: 'Refactoring means no behaviour change. Mixing bug fixes into it hides them. Make the decision visible and separate so anyone depending on the old behaviour notices.',
      },
      {
        q: 'Why write characterization tests <em>before</em> extracting value objects and aggregates?',
        options: [
          'They are required by DDD',
          'They pin down today\'s behaviour so you can detect any unintended change while restructuring',
          'They replace unit tests forever',
          'They make the legacy code faster',
        ],
        answer: 1,
        why: 'Without a safety net, every refactoring step is a guess. Golden-master style tests capture actual outputs, weird ones included.',
      },
      {
        q: 'SkyHop wants to replace the whole booking backend. Which approach does the strangler fig pattern suggest?',
        options: [
          'Freeze features for a year and rewrite from scratch',
          'Route operations through a facade and move them one by one to the new model, deleting old paths as they go',
          'Run both systems with separate databases forever',
          'Copy the old code into a new repo and rename classes',
        ],
        answer: 1,
        why: 'Incremental replacement behind a router or facade keeps the system shippable, and each moved operation is verified by the same tests.',
      },
      {
        q: 'The legacy table stores <code>status \'C\'/\'X\'</code> and <code>total</code> as a float. Where should translation into <code>CONFIRMED</code> and <code>Money</code> happen?',
        options: [
          'In every method of the aggregate',
          'In one mapping or anticorruption layer between the legacy schema and the new model',
          'In the UI',
          'Nowhere: use the legacy codes in the new model too',
        ],
        answer: 1,
        why: 'Keep the new model clean. One translation point (toDomain/toRow in the example) stops legacy concepts leaking in and is easy to delete when the schema is migrated.',
      },
    ],
    exercise: {
      task: `<p>Move the legacy bag rule into the aggregate. Implement
      <code>Booking.changeBags(n)</code> so that it:</p>
      <ul>
        <li>throws <code>DomainError('cancelled')</code> if the booking is cancelled, and
        <code>DomainError('too many bags')</code> if <code>n &gt; passengers * 2</code>, or if
        <code>n &lt; 0</code> (a rule the legacy code forgot, agreed with the business);</li>
        <li>adjusts <code>paid</code> (a <code>Money</code> in cents) by A$35 per bag added or removed;</li>
        <li>records <code>{ type: 'BagsChanged', ref, from, to, charge }</code> where
        <code>charge</code> is the cents difference;</li>
        <li>does nothing and records no event if <code>n</code> equals the current count.</li>
      </ul>
      <p>The characterization checks compare your totals with the legacy function.</p>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
class Money {
  constructor(cents) {
    this.cents = cents;
    Object.freeze(this);
  }
  plus(o) { return new Money(this.cents + o.cents); }
  times(n) { return new Money(this.cents * n); }
}
const BAG_PRICE = new Money(3500);

// legacy behaviour we must match (for valid inputs)
function legacyBags(row, bags) {
  if (row.status === 'X') return { ok: false, err: 'cancelled' };
  if (bags > row.pax * 2) return { ok: false, err: 'too many bags' };
  return { ok: true, total: row.total + (bags - row.bags) * 35 };
}

class Booking {
  #events = [];
  constructor({ ref, cancelled = false, passengers, bags, paid }) {
    Object.assign(this, { ref, cancelled, passengers, bags, paid });
  }
  changeBags(n) {
    // TODO
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
  get events() {
    return this.#events;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, msg) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = e instanceof DomainError && (!msg || e.message === msg);
    console.log(ok ? '✅' : '❌', name, '(' + e.message + ')');
  }
}
const make = (o = {}) => new Booking({ ref: 'ABC123', passengers: 2, bags: 1, paid: new Money(25800), ...o });

for (const n of [0, 2, 4]) {
  const b = make();
  b.changeBags(n);
  check('total matches legacy for bags=' + n, b.paid.cents / 100,
    legacyBags({ status: 'C', pax: 2, bags: 1, total: 258 }, n).total);
}
const b = make();
b.changeBags(3);
check('event recorded', b.pullEvents(), [{ type: 'BagsChanged', ref: 'ABC123', from: 1, to: 3, charge: 7000 }]);
check('bags updated', b.bags, 3);
const same = make();
same.changeBags(1);
check('no-op records nothing', same.pullEvents(), []);
expectThrows('too many bags', () => make().changeBags(5), 'too many bags');
expectThrows('negative bags (new rule)', () => make().changeBags(-1), 'too many bags');
expectThrows('cancelled booking', () => make({ cancelled: true }).changeBags(2), 'cancelled');`,
      hint: 'Check the rules first, then: const from = this.bags; if (n === from) return; const charge = BAG_PRICE.times(n - from); this.paid = this.paid.plus(charge); push the event with charge.cents.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
class Money {
  constructor(cents) {
    this.cents = cents;
    Object.freeze(this);
  }
  plus(o) { return new Money(this.cents + o.cents); }
  times(n) { return new Money(this.cents * n); }
}
const BAG_PRICE = new Money(3500);

// legacy behaviour we must match (for valid inputs)
function legacyBags(row, bags) {
  if (row.status === 'X') return { ok: false, err: 'cancelled' };
  if (bags > row.pax * 2) return { ok: false, err: 'too many bags' };
  return { ok: true, total: row.total + (bags - row.bags) * 35 };
}

class Booking {
  #events = [];
  constructor({ ref, cancelled = false, passengers, bags, paid }) {
    Object.assign(this, { ref, cancelled, passengers, bags, paid });
  }
  changeBags(n) {
    if (this.cancelled) throw new DomainError('cancelled');
    if (n < 0 || n > this.passengers * 2) throw new DomainError('too many bags');
    const from = this.bags;
    if (n === from) return;
    const charge = BAG_PRICE.times(n - from);
    this.paid = this.paid.plus(charge);
    this.bags = n;
    this.#events.push({ type: 'BagsChanged', ref: this.ref, from, to: n, charge: charge.cents });
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
  get events() {
    return this.#events;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, msg) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = e instanceof DomainError && (!msg || e.message === msg);
    console.log(ok ? '✅' : '❌', name, '(' + e.message + ')');
  }
}
const make = (o = {}) => new Booking({ ref: 'ABC123', passengers: 2, bags: 1, paid: new Money(25800), ...o });

for (const n of [0, 2, 4]) {
  const b = make();
  b.changeBags(n);
  check('total matches legacy for bags=' + n, b.paid.cents / 100,
    legacyBags({ status: 'C', pax: 2, bags: 1, total: 258 }, n).total);
}
const b = make();
b.changeBags(3);
check('event recorded', b.pullEvents(), [{ type: 'BagsChanged', ref: 'ABC123', from: 1, to: 3, charge: 7000 }]);
check('bags updated', b.bags, 3);
const same = make();
same.changeBags(1);
check('no-op records nothing', same.pullEvents(), []);
expectThrows('too many bags', () => make().changeBags(5), 'too many bags');
expectThrows('negative bags (new rule)', () => make().changeBags(-1), 'too many bags');
expectThrows('cancelled booking', () => make({ cancelled: true }).changeBags(2), 'cancelled');`,
    },
  },
  // ───────────────────────────────────────────────────────────── case-irop
  {
    id: 'case-irop',
    section: 'Real-World Case Studies',
    title: 'Case Study: Flight Cancellation & Rebooking (IROP)',
    explain: `
      <p><strong>IROP</strong> (irregular operations) is airline speak for "the plan fell apart":
      weather, crew timing out, a technical fault. When SkyHop cancels SH101 SYD→MEL at 07:00,
      a few hundred passengers need new flights, fast, and fairly. It's a great DDD case because it
      crosses several bounded contexts, and each one has a different idea of what a "flight" or a
      "passenger" is.</p>

      <h3>Who does what</h3>
      <table>
        <tr><th>Context</th><th>Role in IROP</th><th>Talks via</th></tr>
        <tr><td><strong>Flight Operations / Scheduling</strong></td><td>Decides the flight is cancelled. Knows aircraft, crew, slots. Knows nothing about bookings.</td><td>publishes <code>FlightCancelled</code></td></tr>
        <tr><td><strong>Disruption Management</strong></td><td>Policy: "when a flight is cancelled, re-accommodate its passengers". Owns re-accommodation rules.</td><td>consumes <code>FlightCancelled</code>, publishes <code>RebookingOffered</code> / <code>RefundOffered</code></td></tr>
        <tr><td><strong>Inventory</strong></td><td>Seats left on alternative flights</td><td>query / reserve API</td></tr>
        <tr><td><strong>Booking</strong></td><td>Applies the accepted offer to the PNR (new segment)</td><td>consumes <code>RebookingAccepted</code></td></tr>
        <tr><td><strong>Customer Notifications</strong></td><td>SMS / email / push in the passenger's language</td><td>consumes <code>RebookingOffered</code></td></tr>
      </table>

      <h3>Re-accommodation rules (SkyHop's simplified version)</h3>
      <ul>
        <li>Candidate flights: same origin and destination, departing after the cancelled one, with
        seats left.</li>
        <li>Same <strong>fare family</strong> (Starter / Plus / Max). A Plus passenger keeps their
        bag and flexibility and is not put on a flight that only sells Starter.</li>
        <li>Earliest suitable flight wins.</li>
        <li>When seats are scarce, <strong>priority</strong> goes by loyalty tier (Platinum &gt; Gold &gt;
        Silver &gt; Member), then by booking date (earlier first).</li>
        <li>No suitable seat → offer a refund (or a voucher) instead.</li>
      </ul>

      <h3>Two technical must-haves</h3>
      <ul>
        <li><strong>Idempotent handlers.</strong> Brokers deliver at least once. If
        <code>FlightCancelled</code> arrives twice, the policy must not hand out seats twice. Record
        processed event ids (in the same transaction as the effects, in real systems).</li>
        <li><strong>Local data.</strong> The Disruption context keeps its own read model of "who is
        booked on which flight", fed by Booking events. When 50 flights cancel in a snowstorm,
        it shouldn't be hammering the Booking service with synchronous queries.</li>
      </ul>

      <div class="warn">The rules above are simplified for teaching. Real re-accommodation also
      involves regulations such as EU261 or national consumer law, interline agreements with other
      airlines, connecting itineraries, passengers with special assistance, and group bookings.
      Model them as separate, named policies, not one giant function.</div>

      <div class="tip"><strong>In the real world:</strong> airlines run IROP as a batch-plus-human
      process. An optimizer proposes re-accommodation, agents handle exceptions, and passengers can
      accept, pick another flight in self-service, or take a refund. That's why the event is
      <code>RebookingOffered</code>, not <code>PassengerRebooked</code>. The model should reflect
      that the passenger still has a choice.</div>
    `,
    examples: [
      {
        title: 'FlightCancelled → policy → offers → notifications (with a duplicate delivery)',
        explain: `
          <details>
            <summary>The problem: the "one big cancel function" approach</summary>
            <p>A first attempt usually looks like this, inside the flight-ops admin tool:</p>
            <pre><code>async function cancelFlight(flightNo) {
  await db.flights.update(flightNo, { status: 'CANCELLED' });
  const bookings = await bookingApi.findByFlight(flightNo);   // sync call, 300 PNRs
  for (const b of bookings) {
    const alt = await inventoryApi.firstSeat(b.route);        // ignores fare family &amp; priority
    await bookingApi.move(b.ref, alt);                        // passenger has no choice
    await smsApi.send(b.phone, 'Moved to ' + alt);
  }
}</code></pre>
            <ul>
              <li>Flight Ops now knows about bookings, inventory, SMS. Every new reaction (hotel vouchers, crew rescheduling) edits this function.</li>
              <li>Passengers are processed in database order, so a Platinum member can end up with a refund while a Member gets the last seat.</li>
              <li>If it crashes at PNR 150 and someone re-runs it, the first 149 passengers are moved <em>again</em>.</li>
            </ul>
          </details>
          <details>
            <summary>Step by step: the event sequence and seat allocation</summary>
            <p>Priority order (tier, then booking date): <code>Cy(Platinum) &gt; Ana(Gold) &gt; Eve(Silver) &gt; Ben(Member) &gt; Dee(Member)</code>. Ben beats Dee because he booked on 15 Aug versus 20 Sep.</p>
            <table>
              <tr><th>#</th><th>Passenger (fare family)</th><th>Candidates (SYD→MEL, after 07:00, family, seats)</th><th>Result</th><th>Seats after: 103 / 105 / 107</th></tr>
              <tr><td>1</td><td>Cy (Starter)</td><td>SH103 ✓, SH105 ✓</td><td><code>RebookingOffered</code> SH103 09:00 (ev-002)</td><td>1 / 1 / 5</td></tr>
              <tr><td>2</td><td>Ana (Plus)</td><td>SH103 ✓, SH107 ✓</td><td>SH103 09:00 (ev-003)</td><td><strong>0</strong> / 1 / 5</td></tr>
              <tr><td>3</td><td>Eve (Max)</td><td>SH103 full, SH107 ✓</td><td>SH107 18:00 (ev-004)</td><td>0 / 1 / 4</td></tr>
              <tr><td>4</td><td>Ben (Starter)</td><td>SH103 full, SH105 ✓ (SH107 has no Starter)</td><td>SH105 13:00 (ev-005)</td><td>0 / <strong>0</strong> / 4</td></tr>
              <tr><td>5</td><td>Dee (Starter)</td><td>none</td><td><code>RefundOffered</code> (ev-006)</td><td>0 / 0 / 4</td></tr>
            </table>
            <p>SH201 is never considered (it goes to BNE) and SH107's free seats don't help Dee because it doesn't sell Starter. Each
            <code>publish</code> runs the Notifications handlers, so every offer line is followed by its SMS:</p>
            <pre><code>→ publish RebookingOffered PNR-C3 (ev-002)
  [notify] SMS Cy: SH101 is cancelled. We saved you a Starter seat on SH103 at 09:00. …
…
→ publish RefundOffered PNR-D4 (ev-006)
  [notify] SMS Dee: SH101 is cancelled (no Starter seat today). Choose a full refund or a later flight in the app.</code></pre>
          </details>
          <details>
            <summary>Step by step: the duplicate delivery</summary>
            <table>
              <tr><th>Delivery</th><th><code>processed</code> before</th><th>What the policy does</th><th>Console</th></tr>
              <tr><td>1st <code>ev-001</code></td><td>{}</td><td>adds ev-001, allocates 4 seats, issues 5 events</td><td>(the sequence above)</td></tr>
              <tr><td>2nd <code>ev-001</code></td><td>{ev-001}</td><td>returns immediately</td><td><code>[disruption] duplicate ev-001 → skipped</code></td></tr>
            </table>
            <p>Final line: <code>seats left: SH103=0 SH105=0 SH107=4 SH201=9</code>. Without the
            <code>processed</code> check, the second run would find SH103 and SH105 full and push Cy, Ana
            and Ben onto SH107 or refunds, <em>on top of</em> the offers already sent. Notifications keeps
            its own <code>sent</code> set for the same reason. Every consumer is responsible for its own
            idempotency.</p>
            <div class="warn">In production, store the processed event id <strong>in the same
            transaction</strong> as the seat allocation (or use an inbox table). If you record the id and
            then crash before allocating, the event is lost. If you allocate and crash before recording,
            it's processed twice.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Comment out <code>if (processed.has(e.eventId)) { … }</code> and rerun. Watch the second delivery produce a different, wrong set of offers.</li>
              <li>Change Dee's tier to <code>'Gold'</code>. She now outranks Eve and Ben: Ben gets the refund instead.</li>
              <li>Add SH109 at 21:00 with Starter seats. Dee gets an offer instead of a refund, and no other code changes.</li>
            </ul>
          </details>
        `,
        code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── tiny async bus (at-least-once: it can deliver duplicates) ──
const handlers = {};
const on = (type, fn) => (handlers[type] ||= []).push(fn);
async function publish(event) {
  console.log('→ publish', event.type, event.ref || event.flightNo, '(' + event.eventId + ')');
  await sleep(5);
  for (const fn of handlers[event.type] || []) await fn(event);
}
let evSeq = 0;
const newEvent = (type, data) => ({ eventId: 'ev-' + String(++evSeq).padStart(3, '0'), type, ...data });

// ═══ DISRUPTION MANAGEMENT CONTEXT ════════════════════════════
// Local read model of bookings per flight (fed earlier by Booking events).
const bookingsByFlight = {
  SH101: [
    { ref: 'PNR-A1', name: 'Ana', tier: 'Gold', fareFamily: 'Plus', bookedAt: '2026-09-01' },
    { ref: 'PNR-B2', name: 'Ben', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-08-15' },
    { ref: 'PNR-C3', name: 'Cy', tier: 'Platinum', fareFamily: 'Starter', bookedAt: '2026-10-01' },
    { ref: 'PNR-D4', name: 'Dee', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-09-20' },
    { ref: 'PNR-E5', name: 'Eve', tier: 'Silver', fareFamily: 'Max', bookedAt: '2026-10-10' },
  ],
};
// Snapshot of Inventory for alternatives (in reality: a query/reserve API).
const alternatives = [
  { flightNo: 'SH103', from: 'SYD', to: 'MEL', departs: '09:00', seats: 2, families: ['Starter', 'Plus', 'Max'] },
  { flightNo: 'SH105', from: 'SYD', to: 'MEL', departs: '13:00', seats: 1, families: ['Starter'] },
  { flightNo: 'SH107', from: 'SYD', to: 'MEL', departs: '18:00', seats: 5, families: ['Plus', 'Max'] },
  { flightNo: 'SH201', from: 'SYD', to: 'BNE', departs: '08:00', seats: 9, families: ['Starter', 'Plus', 'Max'] },
];

const TIER_RANK = { Platinum: 0, Gold: 1, Silver: 2, Member: 3 };
const byPriority = (a, b) =>
  TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.bookedAt.localeCompare(b.bookedAt);

function findSeat(pax, cancelled) {
  return alternatives
    .filter((f) => f.from === cancelled.from && f.to === cancelled.to)
    .filter((f) => f.departs > cancelled.departs)
    .filter((f) => f.families.includes(pax.fareFamily))
    .filter((f) => f.seats > 0)
    .sort((a, b) => a.departs.localeCompare(b.departs))[0];
}

const processed = new Set(); // idempotency: event ids already handled

on('FlightCancelled', async (e) => {
  if (processed.has(e.eventId)) {
    console.log('  [disruption] duplicate', e.eventId, '→ skipped');
    return;
  }
  processed.add(e.eventId);
  const affected = [...(bookingsByFlight[e.flightNo] || [])].sort(byPriority);
  console.log('  [disruption] ' + e.flightNo + ' cancelled, priority order:',
    affected.map((p) => p.name + '(' + p.tier + ')').join(' > '));
  for (const pax of affected) {
    const seat = findSeat(pax, e);
    if (seat) {
      seat.seats--;
      await publish(newEvent('RebookingOffered', { ref: pax.ref, name: pax.name,
        flightNo: seat.flightNo, departs: seat.departs, fareFamily: pax.fareFamily }));
    } else {
      await publish(newEvent('RefundOffered', { ref: pax.ref, name: pax.name,
        reason: 'no ' + pax.fareFamily + ' seat today' }));
    }
  }
});

// ═══ CUSTOMER NOTIFICATIONS CONTEXT ═══════════════════════════
const sent = new Set();
on('RebookingOffered', async (e) => {
  if (sent.has(e.eventId)) return;
  sent.add(e.eventId);
  console.log('  [notify] SMS ' + e.name + ': SH101 is cancelled. We saved you a ' + e.fareFamily +
    ' seat on ' + e.flightNo + ' at ' + e.departs + '. Accept or choose another flight in the app.');
});
on('RefundOffered', async (e) => {
  console.log('  [notify] SMS ' + e.name + ': SH101 is cancelled (' + e.reason +
    '). Choose a full refund or a later flight in the app.');
});

// ═══ FLIGHT OPS CONTEXT publishes ═════════════════════════════
const cancelled = newEvent('FlightCancelled', { flightNo: 'SH101', from: 'SYD', to: 'MEL',
  departs: '07:00', reason: 'crew duty-time limit' });
await publish(cancelled);

console.log('── broker redelivers the same event ──');
await publish(cancelled);

console.log('seats left:', alternatives.map((f) => f.flightNo + '=' + f.seats).join(' '));`,
      },
    ],
    quiz: [
      {
        q: 'Why does Flight Operations publish <code>FlightCancelled</code> instead of calling Booking and Notifications directly?',
        options: [
          'Events are faster than HTTP',
          'Flight Ops should not need to know who cares about cancellations; Disruption, Notifications and others subscribe and apply their own rules',
          'Because Flight Ops has no database',
          'It is required by IATA',
        ],
        answer: 1,
        why: 'Publishing a fact decouples the upstream context from downstream policies. New reactions (e.g. a hotel-voucher policy) can be added without changing Flight Ops.',
      },
      {
        q: 'The broker delivers FlightCancelled SH101 twice. Without idempotency, what is the worst consequence in the example?',
        options: [
          'The console prints twice',
          'Seats on alternative flights are allocated twice, so later passengers lose seats they should have had, and passengers get duplicate SMSs',
          'Nothing; the second delivery is identical',
          'Flight Ops cancels SH101 again',
        ],
        answer: 1,
        why: 'Each handling decrements alternative-flight seats. A second run would hand out seats again, double-booking scarce inventory. Tracking processed event ids prevents that.',
      },
      {
        q: 'Ben (Member, Starter, booked 15 Aug) and Dee (Member, Starter, booked 20 Sep) compete for the last Starter seat on SH105. Who gets it under SkyHop\'s rules, and why?',
        options: [
          'Dee, the most recent booking',
          'Ben: same tier, so the earlier booking date wins',
          'Whoever opens the SMS first',
          'Both, by overbooking',
        ],
        answer: 1,
        why: 'Priority is tier first, then booking date. Same tier → earlier booking date wins.',
      },
      {
        q: 'Why is the event named <code>RebookingOffered</code> rather than <code>PassengerRebooked</code>?',
        options: [
          'Shorter names are better',
          'The passenger can still accept, pick another flight or take a refund; the model should not claim a fact that hasn\'t happened',
          'Booking events must end in "Offered"',
          'To avoid a name clash in JavaScript',
        ],
        answer: 1,
        why: 'Event names state facts in the past tense. What happened is that an offer was made. RebookingAccepted, published later, is what changes the PNR.',
      },
    ],
    exercise: {
      task: `<p>Implement the pure core of the Disruption policy:</p>
      <ul>
        <li><code>planRebooking(passengers, cancelled, flights)</code> returns an array of offers
        <code>{ ref, flightNo }</code> (or <code>{ ref, refund: true }</code>) in <strong>priority
        order</strong>: tier (Platinum, Gold, Silver, Member), then <code>bookedAt</code>.
        Pick the earliest flight with the same route, a later departure, the passenger's fare
        family, and seats left. Don't mutate the input flights (copy the seat counts).</li>
        <li><code>onceById(handler)</code> wraps a handler so a second event with the same
        <code>eventId</code> is ignored (returns <code>'duplicate'</code>).</li>
      </ul>`,
      starter: `const TIER_RANK = { Platinum: 0, Gold: 1, Silver: 2, Member: 3 };

function planRebooking(passengers, cancelled, flights) {
  const seatsLeft = Object.fromEntries(flights.map((f) => [f.flightNo, f.seats]));
  // TODO: sort passengers by priority, then pick a flight per passenger
  return [];
}

function onceById(handler) {
  // TODO: remember eventIds
  return (event) => handler(event);
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const cancelled = { flightNo: 'SH301', from: 'MEL', to: 'OOL', departs: '06:30' };
const flights = [
  { flightNo: 'SH309', from: 'MEL', to: 'OOL', departs: '19:00', seats: 3, families: ['Plus', 'Max'] },
  { flightNo: 'SH303', from: 'MEL', to: 'OOL', departs: '10:15', seats: 1, families: ['Starter', 'Plus'] },
  { flightNo: 'SH300', from: 'MEL', to: 'OOL', departs: '05:00', seats: 9, families: ['Starter', 'Plus', 'Max'] },
  { flightNo: 'SH411', from: 'MEL', to: 'SYD', departs: '11:00', seats: 9, families: ['Starter', 'Plus', 'Max'] },
];
const pax = [
  { ref: 'R1', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-07-01' },
  { ref: 'R2', tier: 'Gold', fareFamily: 'Plus', bookedAt: '2026-09-09' },
  { ref: 'R3', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-06-01' },
  { ref: 'R4', tier: 'Silver', fareFamily: 'Max', bookedAt: '2026-08-08' },
  { ref: 'R5', tier: 'Platinum', fareFamily: 'Plus', bookedAt: '2026-10-01' },
];
const plan = planRebooking(pax, cancelled, flights);
check('priority order', plan.map((o) => o.ref), ['R5', 'R2', 'R4', 'R3', 'R1']);
check('Platinum gets the earliest Plus seat', plan[0], { ref: 'R5', flightNo: 'SH303' });
check('Gold falls to the evening flight', plan[1], { ref: 'R2', flightNo: 'SH309' });
check('Max only fits SH309', plan[2], { ref: 'R4', flightNo: 'SH309' });
check('no Starter seats left → refunds', plan.slice(3),
  [{ ref: 'R3', refund: true }, { ref: 'R1', refund: true }]);
check('input flights not mutated', flights[1].seats, 1);
check('earlier departures and other routes ignored', plan.some((o) => o.flightNo === 'SH300' || o.flightNo === 'SH411'), false);

let calls = 0;
const handle = onceById(() => ++calls);
handle({ eventId: 'ev-1' });
const second = handle({ eventId: 'ev-1' });
handle({ eventId: 'ev-2' });
check('duplicate ignored', calls, 2);
check('duplicate reported', second, 'duplicate');`,
      hint: 'const ordered = [...passengers].sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.bookedAt.localeCompare(b.bookedAt)); then filter flights by route, departs > cancelled.departs, families.includes, seatsLeft[f.flightNo] > 0, sort by departs, take [0].',
      solution: `const TIER_RANK = { Platinum: 0, Gold: 1, Silver: 2, Member: 3 };

function planRebooking(passengers, cancelled, flights) {
  const seatsLeft = Object.fromEntries(flights.map((f) => [f.flightNo, f.seats]));
  const ordered = [...passengers].sort((a, b) =>
    TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.bookedAt.localeCompare(b.bookedAt));
  return ordered.map((p) => {
    const best = flights
      .filter((f) => f.from === cancelled.from && f.to === cancelled.to)
      .filter((f) => f.departs > cancelled.departs)
      .filter((f) => f.families.includes(p.fareFamily))
      .filter((f) => seatsLeft[f.flightNo] > 0)
      .sort((a, b) => a.departs.localeCompare(b.departs))[0];
    if (!best) return { ref: p.ref, refund: true };
    seatsLeft[best.flightNo]--;
    return { ref: p.ref, flightNo: best.flightNo };
  });
}

function onceById(handler) {
  const seen = new Set();
  return (event) => {
    if (seen.has(event.eventId)) return 'duplicate';
    seen.add(event.eventId);
    return handler(event);
  };
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const cancelled = { flightNo: 'SH301', from: 'MEL', to: 'OOL', departs: '06:30' };
const flights = [
  { flightNo: 'SH309', from: 'MEL', to: 'OOL', departs: '19:00', seats: 3, families: ['Plus', 'Max'] },
  { flightNo: 'SH303', from: 'MEL', to: 'OOL', departs: '10:15', seats: 1, families: ['Starter', 'Plus'] },
  { flightNo: 'SH300', from: 'MEL', to: 'OOL', departs: '05:00', seats: 9, families: ['Starter', 'Plus', 'Max'] },
  { flightNo: 'SH411', from: 'MEL', to: 'SYD', departs: '11:00', seats: 9, families: ['Starter', 'Plus', 'Max'] },
];
const pax = [
  { ref: 'R1', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-07-01' },
  { ref: 'R2', tier: 'Gold', fareFamily: 'Plus', bookedAt: '2026-09-09' },
  { ref: 'R3', tier: 'Member', fareFamily: 'Starter', bookedAt: '2026-06-01' },
  { ref: 'R4', tier: 'Silver', fareFamily: 'Max', bookedAt: '2026-08-08' },
  { ref: 'R5', tier: 'Platinum', fareFamily: 'Plus', bookedAt: '2026-10-01' },
];
const plan = planRebooking(pax, cancelled, flights);
check('priority order', plan.map((o) => o.ref), ['R5', 'R2', 'R4', 'R3', 'R1']);
check('Platinum gets the earliest Plus seat', plan[0], { ref: 'R5', flightNo: 'SH303' });
check('Gold falls to the evening flight', plan[1], { ref: 'R2', flightNo: 'SH309' });
check('Max only fits SH309', plan[2], { ref: 'R4', flightNo: 'SH309' });
check('no Starter seats left → refunds', plan.slice(3),
  [{ ref: 'R3', refund: true }, { ref: 'R1', refund: true }]);
check('input flights not mutated', flights[1].seats, 1);
check('earlier departures and other routes ignored', plan.some((o) => o.flightNo === 'SH300' || o.flightNo === 'SH411'), false);

let calls = 0;
const handle = onceById(() => ++calls);
handle({ eventId: 'ev-1' });
const second = handle({ eventId: 'ev-1' });
handle({ eventId: 'ev-2' });
check('duplicate ignored', calls, 2);
check('duplicate reported', second, 'duplicate');`,
    },
  },
  // ───────────────────────────────────────────────────────────── case-checkout
  {
    id: 'case-checkout',
    section: 'Real-World Case Studies',
    title: 'Case Study: ShopLane Checkout & Fulfilment',
    explain: `
      <p>Checkout looks like CRUD until you ask the business a few questions. "If the price changes
      while it's in my cart, what do I pay?" "If two people buy the last unit at the same time, who
      gets it?" "Can I return half an order after 40 days?" Each answer is a modelling decision.</p>

      <h3>Cart ≠ Order</h3>
      <table>
        <tr><th></th><th>Cart</th><th>Order</th></tr>
        <tr><td>Purpose</td><td>A wish list with quantities. Cheap, throwaway, often anonymous.</td><td>A commitment: a customer agreed to pay a price for items.</td></tr>
        <tr><td>Prices</td><td><strong>Live</strong>: always recomputed from the catalog</td><td><strong>Snapshot</strong>: unit prices copied at placement time and never recomputed</td></tr>
        <tr><td>Invariants</td><td>Almost none (qty &gt; 0)</td><td>Many: state machine, payment matches total, returns ≤ ordered</td></tr>
        <tr><td>Lifetime</td><td>Minutes to days, may expire</td><td>Years (accounting, tax, warranty)</td></tr>
      </table>
      <p>Modelling them as one <code>Order</code> with <code>status: 'cart'</code> mixes two
      lifecycles and two sets of rules. Separate aggregates, often separate contexts
      (<em>Shopping</em> vs <em>Ordering</em>).</p>

      <h3>Price snapshot</h3>
      <p>The order line stores <code>{ sku, qty, unitPrice }</code>, not just the SKU. That's not
      duplication: "the price the customer agreed to" is a <em>different concept</em> from "the
      current catalog price". Invoices, refunds and disputes depend on the first.</p>

      <h3>Inventory reservation with expiry</h3>
      <p>Placing an order <strong>reserves</strong> stock for a limited time (e.g. 15 minutes). If
      payment doesn't arrive, the reservation <strong>expires</strong> and the units go back on
      sale. Available = on hand − active reservations. Inventory owns this rule. Ordering just asks.</p>

      <h3>Order state machine</h3>
      <pre><code>PLACED ──pay──► PAID ──ship──► SHIPPED ──deliver──► DELIVERED ──return (≤30 days)──► (partial) RETURNED
   │              │
   └──cancel──────┴──cancel──► CANCELLED   (PAID → CANCELLED triggers a refund)</code></pre>
      <p>An explicit transition table turns "can we ship a cancelled order?" from a code archaeology
      question into one line of data.</p>

      <div class="tip"><strong>In the real world:</strong> large shops often split this across
      contexts: Cart/Shopping, Ordering, Payments, Inventory (sometimes Warehouse vs Availability),
      Fulfilment/Shipping, Returns. They coordinate with events (<code>OrderPlaced</code>,
      <code>PaymentCaptured</code>, <code>ShipmentDispatched</code>) and often a saga or process manager
      for the happy path and compensations. Reservation TTLs are tuned per product: tickets and flash
      sales use short TTLs, B2B orders long ones.</div>
    `,
    examples: [
      {
        title: 'Cart → Order: price snapshot and reservation expiry',
        explain: `
          <details>
            <summary>Step by step: the Black Friday timeline</summary>
            <p>Stock on hand: MUG-01 = 3, TEE-42 = 1. Reservation TTL = 15 minutes.</p>
            <table>
              <tr><th>Time</th><th>What happens</th><th>TEE-42 available</th><th>Console</th></tr>
              <tr><td>10:00</td><td>Ana's cart: 2 × $15 + 1 × $29, computed live</td><td>1</td><td><code>ana cart (live): $59.00</code></td></tr>
              <tr><td>10:00</td><td><code>placeOrder</code> snapshots unit prices and reserves until 10:15</td><td>0</td><td><code>ORD-0001 placed, total $59.00 · TEE-42 available: 0</code></td></tr>
              <tr><td>10:01</td><td>Catalog price → $19. Cart follows, order doesn't</td><td>0</td><td><code>… ana cart (live): $49.00 · order ORD-0001 still $59.00</code></td></tr>
              <tr><td>10:05</td><td>Ben tries: available = 1 on hand − 1 held</td><td>0</td><td><code>10:05 ben orders TEE-42 → OutOfStock: TEE-42: only 0 left</code></td></tr>
              <tr><td>10:16</td><td>Ana's reservation (expires 10:15) no longer counts</td><td>1</td><td><code>10:16 TEE-42 available: 1</code></td></tr>
              <tr><td>10:16</td><td>Ben orders at the <em>new</em> price. ORD-0002 was burnt by his failed attempt</td><td>0</td><td><code>10:16 ben ORD-0003 placed at $19.00</code></td></tr>
              <tr><td>10:17</td><td>Ana's payment arrives, but her reservation expired</td><td>0</td><td><code>10:17 ana pays ORD-0001 → ReservationExpired: …</code></td></tr>
              <tr><td>10:18</td><td>Ben pays in time: reservation becomes a real deduction</td><td>0</td><td><code>10:18 ben pays ORD-0003 → PAID · TEE-42 available: 0</code></td></tr>
            </table>
            <p>Notice that nothing "runs" at 10:15. Expiry is computed (<code>r.expiresAt &gt; now</code>)
            rather than performed by a timer. Real systems still run a sweeper job to delete old rows and
            emit <code>ReservationExpired</code> events, but correctness doesn't depend on that job
            being on time.</p>
          </details>
          <details>
            <summary>Key design decisions</summary>
            <ul>
              <li><strong>Clock as a parameter</strong> (<code>now</code>): the whole timeline is deterministic and testable without waiting 15 real minutes.</li>
              <li><strong>All-or-nothing reserve</strong>: <code>reserve</code> checks every line before holding any, so a failed order never leaves half its items held.</li>
              <li><strong>Inventory owns availability.</strong> Ordering never computes "on hand − held" itself. It asks, and handles <code>OutOfStock</code> / <code>ReservationExpired</code>.</li>
            </ul>
            <div class="warn">If Ana's card was already charged when <code>ReservationExpired</code>
            fires, the order must move to CANCELLED and a refund must be issued. That's a
            <strong>compensation</strong>, typically handled by a saga or process manager.</div>
          </details>
        `,
        code: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class OutOfStock extends DomainError {}
class ReservationExpired extends DomainError {}
const MIN = 60 * 1000;
const fmt = (cents) => '$' + (cents / 100).toFixed(2);

// ── Catalog context: current prices (they change!) ──
const catalog = { 'MUG-01': 1500, 'TEE-42': 2900 };

// ── Shopping context: Cart holds SKUs + qty, never prices ──
class Cart {
  lines = new Map();
  add(sku, qty) {
    this.lines.set(sku, (this.lines.get(sku) || 0) + qty);
    return this;
  }
  liveTotal() {
    let t = 0;
    for (const [sku, qty] of this.lines) t += catalog[sku] * qty;
    return t;
  }
}

// ── Inventory context: reservations with a TTL ──
class Inventory {
  #onHand = { 'MUG-01': 3, 'TEE-42': 1 };
  #reservations = []; // { orderId, sku, qty, expiresAt }
  constructor(ttlMs) {
    this.ttl = ttlMs;
  }
  available(sku, now) {
    const held = this.#reservations
      .filter((r) => r.sku === sku && r.expiresAt > now)
      .reduce((s, r) => s + r.qty, 0);
    return this.#onHand[sku] - held;
  }
  reserve(orderId, lines, now) {
    for (const { sku, qty } of lines) {
      if (this.available(sku, now) < qty) throw new OutOfStock(sku + ': only ' + this.available(sku, now) + ' left');
    }
    for (const { sku, qty } of lines) this.#reservations.push({ orderId, sku, qty, expiresAt: now + this.ttl });
  }
  commit(orderId, now) {
    const mine = this.#reservations.filter((r) => r.orderId === orderId);
    if (mine.length === 0 || mine.some((r) => r.expiresAt <= now)) {
      throw new ReservationExpired('reservation for ' + orderId + ' expired');
    }
    for (const r of mine) this.#onHand[r.sku] -= r.qty;
    this.#reservations = this.#reservations.filter((r) => r.orderId !== orderId);
  }
}

// ── Ordering context: Order snapshots prices at placement ──
let seq = 0;
class Order {
  constructor(id, lines, placedAt) {
    this.id = id;
    this.lines = lines; // [{ sku, qty, unitPrice }] frozen at placement
    this.placedAt = placedAt;
    this.status = 'PLACED';
    Object.freeze(this.lines);
  }
  get total() {
    return this.lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  }
}
function placeOrder(cart, inventory, now) {
  const id = 'ORD-' + String(++seq).padStart(4, '0'); // burnt if reserve fails, like a DB sequence
  const lines = [...cart.lines].map(([sku, qty]) => Object.freeze({ sku, qty, unitPrice: catalog[sku] }));
  inventory.reserve(id, lines, now); // all-or-nothing
  return new Order(id, lines, now);
}
function pay(order, inventory, now) {
  inventory.commit(order.id, now);
  order.status = 'PAID';
}

// ═══ DEMO ═════════════════════════════════════════════════════
const inv = new Inventory(15 * MIN);
const t0 = Date.UTC(2026, 10, 27, 10, 0); // Black Friday, 10:00

const ana = new Cart().add('MUG-01', 2).add('TEE-42', 1);
console.log('ana cart (live):', fmt(ana.liveTotal()));
const o1 = placeOrder(ana, inv, t0);
console.log(o1.id, 'placed, total', fmt(o1.total), '· TEE-42 available:', inv.available('TEE-42', t0));

catalog['TEE-42'] = 1900; // flash sale starts at 10:01
console.log('price drops to', fmt(1900), '→ ana cart (live):', fmt(ana.liveTotal()),
  '· order', o1.id, 'still', fmt(o1.total));

const ben = new Cart().add('TEE-42', 1);
try {
  placeOrder(ben, inv, t0 + 5 * MIN);
} catch (e) {
  console.log('10:05 ben orders TEE-42 →', e.name + ': ' + e.message);
}

// Ana never pays. At 10:16 her reservation has expired.
console.log('10:16 TEE-42 available:', inv.available('TEE-42', t0 + 16 * MIN));
const o2 = placeOrder(ben, inv, t0 + 16 * MIN);
console.log('10:16 ben', o2.id, 'placed at', fmt(o2.total));
try {
  pay(o1, inv, t0 + 17 * MIN);
} catch (e) {
  console.log('10:17 ana pays', o1.id, '→', e.name + ': ' + e.message);
}
pay(o2, inv, t0 + 18 * MIN);
console.log('10:18 ben pays', o2.id, '→', o2.status, '· TEE-42 available:', inv.available('TEE-42', t0 + 18 * MIN));`,
      },
      {
        title: 'Order state machine: transition table + events',
        code: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const DAY = 86400000;

// The whole lifecycle, as data. Anything not listed is illegal.
const TRANSITIONS = {
  PLACED: { pay: 'PAID', cancel: 'CANCELLED' },
  PAID: { ship: 'SHIPPED', cancel: 'CANCELLED' },
  SHIPPED: { deliver: 'DELIVERED' },
  DELIVERED: {},
  CANCELLED: {},
};
const EVENT_FOR = { pay: 'OrderPaid', cancel: 'OrderCancelled', ship: 'OrderShipped',
  deliver: 'OrderDelivered' };

class Order {
  #events = [];
  constructor(id) {
    this.id = id;
    this.status = 'PLACED';
    this.deliveredAt = null;
  }
  #go(action, now, extra = {}) {
    const next = TRANSITIONS[this.status][action];
    if (!next) throw new DomainError('cannot ' + action + ' a ' + this.status + ' order');
    const from = this.status;
    this.status = next;
    this.#events.push({ type: EVENT_FOR[action], id: this.id, from, to: next, ...extra });
  }
  pay(now) { this.#go('pay', now); }
  ship(now, trackingNo) { this.#go('ship', now, { trackingNo }); }
  deliver(now) {
    this.#go('deliver', now);
    this.deliveredAt = now;
  }
  cancel(now) {
    const wasPaid = this.status === 'PAID';
    this.#go('cancel', now, { refundDue: wasPaid });
  }
  canReturn(now) {
    return this.status === 'DELIVERED' && now - this.deliveredAt <= 30 * DAY;
  }
  pullEvents() {
    const e = this.#events;
    this.#events = [];
    return e;
  }
}

const t = (d) => Date.UTC(2026, 10, d);
const attempt = (label, fn) => {
  try {
    fn();
    console.log('✓', label);
  } catch (e) {
    console.log('✗', label, '→', e.message);
  }
};

const a = new Order('ORD-0001');
attempt('ship before paying', () => a.ship(t(1), 'TRK1'));
attempt('pay', () => a.pay(t(1)));
attempt('ship', () => a.ship(t(2), 'TRK1'));
attempt('cancel after shipping', () => a.cancel(t(3)));
attempt('deliver', () => a.deliver(t(4)));
console.log('events:', a.pullEvents().map((e) => e.type + '(' + e.from + '→' + e.to + ')').join(', '));
console.log('return on day 20?', a.canReturn(t(20)), '· on 10 Jan?', a.canReturn(Date.UTC(2027, 0, 10)));

const b = new Order('ORD-0002');
b.pay(t(1));
b.cancel(t(1));
console.log('paid then cancelled →', b.pullEvents().at(-1));`,
      },
    ],
    quiz: [
      {
        q: 'A customer placed a ShopLane order for a $29 tee. An hour later the catalog price drops to $19. What should the order total be, and why?',
        options: [
          '$19: always use the current catalog price',
          '$29: the order line snapshot records the price the customer agreed to at placement',
          '$24: average the two',
          'Recalculate whenever the order is viewed',
        ],
        answer: 1,
        why: 'An order is a commitment at a price. A price-match policy could issue a refund, but that is a separate, explicit business action, not a silent recalculation.',
      },
      {
        q: 'Why model Cart and Order as separate aggregates instead of one Order with <code>status: \'cart\'</code>?',
        options: [
          'Fewer database tables',
          'They have different lifecycles and invariants: carts are throwaway with live prices, orders are long-lived commitments with snapshots and a strict state machine',
          'Carts cannot have ids',
          'Because JavaScript classes cannot have a status field',
        ],
        answer: 1,
        why: 'One model for two concepts forces every rule to check "am I a cart or an order?". Separate aggregates keep each simple.',
      },
      {
        q: 'Ana placed an order, and her reservation for the last tee expired before she paid. Ben bought it. What should happen when Ana\'s payment finally arrives?',
        options: [
          'Silently over-sell: stock becomes −1',
          'Reject or cancel her order (and refund if money was captured), because the reservation expired',
          'Take the tee back from Ben',
          'Extend her reservation retroactively',
        ],
        answer: 1,
        why: 'Inventory\'s invariant (never sell more than on hand) wins. The payment step must check the reservation is still valid and compensate if not.',
      },
      {
        q: 'Support asks: "can we cancel an order that is already SHIPPED?". In the example, where do you look and change the answer?',
        options: [
          'Search all controllers for status checks',
          'The TRANSITIONS table: SHIPPED has no cancel; adding it (or a separate return/intercept flow) is one explicit change',
          'The database schema',
          'The UI button visibility',
        ],
        answer: 1,
        why: 'An explicit state machine makes lifecycle rules data you can read, test and change in one place.',
      },
    ],
    exercise: {
      task: `<p>Add <strong>returns</strong> to the ShopLane order. Implement
      <code>order.requestReturn(sku, qty, now)</code>:</p>
      <ul>
        <li>Only <code>DELIVERED</code> orders, within 30 days of <code>deliveredAt</code>
        (inclusive). Otherwise throw <code>DomainError</code>.</li>
        <li>Total returned for a SKU can't exceed the ordered qty (track
        <code>returned[sku]</code>). Unknown SKUs throw.</li>
        <li>Refund = <strong>snapshot</strong> <code>unitPrice × qty</code> (the catalog price may
        have changed).</li>
        <li>Record <code>{ type: 'ReturnRequested', orderId, sku, qty, refund }</code> and return
        the refund in cents.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const DAY = 86400000;
const catalog = { 'MUG-01': 1500, 'TEE-42': 2900 };

class Order {
  events = [];
  returned = {};
  constructor(id, lines) {
    this.id = id;
    this.lines = lines; // [{ sku, qty, unitPrice }]
    this.status = 'PLACED';
    this.deliveredAt = null;
  }
  markDelivered(now) {
    this.status = 'DELIVERED';
    this.deliveredAt = now;
  }
  requestReturn(sku, qty, now) {
    // TODO
    return 0;
  }
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

const day = (d) => Date.UTC(2026, 10, 1) + d * DAY;
const make = () => new Order('ORD-0007', [
  { sku: 'MUG-01', qty: 3, unitPrice: 1500 },
  { sku: 'TEE-42', qty: 1, unitPrice: 2900 },
]);

expectThrows('not delivered yet', () => make().requestReturn('MUG-01', 1, day(0)));
const o = make();
o.markDelivered(day(2));
catalog['TEE-42'] = 1900; // sale after the order
check('refund uses snapshot price', o.requestReturn('TEE-42', 1, day(10)), 2900);
check('partial return of mugs', o.requestReturn('MUG-01', 2, day(12)), 3000);
expectThrows('cannot return more than ordered', () => o.requestReturn('MUG-01', 2, day(13)));
check('last mug on day 32 (30 days after delivery)', o.requestReturn('MUG-01', 1, day(32)), 1500);
const late = make();
late.markDelivered(day(2));
expectThrows('day 33 is too late', () => late.requestReturn('TEE-42', 1, day(33)));
expectThrows('unknown sku', () => o.requestReturn('HAT-99', 1, day(5)));
check('events recorded', o.events.map((e) => e.sku + ':' + e.qty + ':' + e.refund),
  ['TEE-42:1:2900', 'MUG-01:2:3000', 'MUG-01:1:1500']);`,
      hint: 'Check status and now - deliveredAt <= 30 * DAY first. const line = this.lines.find(l => l.sku === sku). const already = this.returned[sku] || 0; if (already + qty > line.qty) throw.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const DAY = 86400000;
const catalog = { 'MUG-01': 1500, 'TEE-42': 2900 };

class Order {
  events = [];
  returned = {};
  constructor(id, lines) {
    this.id = id;
    this.lines = lines; // [{ sku, qty, unitPrice }]
    this.status = 'PLACED';
    this.deliveredAt = null;
  }
  markDelivered(now) {
    this.status = 'DELIVERED';
    this.deliveredAt = now;
  }
  requestReturn(sku, qty, now) {
    if (this.status !== 'DELIVERED') throw new DomainError('order is ' + this.status);
    if (now - this.deliveredAt > 30 * DAY) throw new DomainError('return window closed');
    const line = this.lines.find((l) => l.sku === sku);
    if (!line) throw new DomainError(sku + ' is not in this order');
    const already = this.returned[sku] || 0;
    if (qty <= 0 || already + qty > line.qty) {
      throw new DomainError('can return at most ' + (line.qty - already) + ' x ' + sku);
    }
    this.returned[sku] = already + qty;
    const refund = line.unitPrice * qty;
    this.events.push({ type: 'ReturnRequested', orderId: this.id, sku, qty, refund });
    return refund;
  }
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

const day = (d) => Date.UTC(2026, 10, 1) + d * DAY;
const make = () => new Order('ORD-0007', [
  { sku: 'MUG-01', qty: 3, unitPrice: 1500 },
  { sku: 'TEE-42', qty: 1, unitPrice: 2900 },
]);

expectThrows('not delivered yet', () => make().requestReturn('MUG-01', 1, day(0)));
const o = make();
o.markDelivered(day(2));
catalog['TEE-42'] = 1900; // sale after the order
check('refund uses snapshot price', o.requestReturn('TEE-42', 1, day(10)), 2900);
check('partial return of mugs', o.requestReturn('MUG-01', 2, day(12)), 3000);
expectThrows('cannot return more than ordered', () => o.requestReturn('MUG-01', 2, day(13)));
check('last mug on day 32 (30 days after delivery)', o.requestReturn('MUG-01', 1, day(32)), 1500);
const late = make();
late.markDelivered(day(2));
expectThrows('day 33 is too late', () => late.requestReturn('TEE-42', 1, day(33)));
expectThrows('unknown sku', () => o.requestReturn('HAT-99', 1, day(5)));
check('events recorded', o.events.map((e) => e.sku + ':' + e.qty + ':' + e.refund),
  ['TEE-42:1:2900', 'MUG-01:2:3000', 'MUG-01:1:1500']);`,
    },
  },
  // ───────────────────────────────────────────────────────────── case-banking
  {
    id: 'case-banking',
    section: 'Real-World Case Studies',
    title: 'Case Study: LedgerBank Transfers & Double-Entry Ledger',
    explain: `
      <p>Money is where sloppy modelling gets expensive. LedgerBank's core concepts are old (double-entry
      bookkeeping is centuries old) and very precise. That makes them a gift for DDD: the
      ubiquitous language already exists, and the invariants are non-negotiable.</p>

      <h3>The building blocks</h3>
      <ul>
        <li><strong><code>Money</code> value object</strong>: integer minor units (cents) +
        currency. Adding AUD to USD throws. No floats, ever: <code>0.1 + 0.2 !== 0.3</code>.</li>
        <li><strong><code>Account</code> aggregate</strong>: invariant "balance never goes below
        −overdraftLimit". Debit and credit are methods, not setters.</li>
        <li><strong>Ledger and journal</strong>: every movement is a <em>journal</em> of entries
        (DR/CR lines). Invariant: <strong>Σ debits = Σ credits</strong> in a single currency. The
        ledger is append-only. Mistakes are fixed with reversing entries, never edits.</li>
        <li><strong>Idempotency key</strong>: the client sends a unique key per transfer intent.
        If the network times out and the app retries, the bank returns the original result instead
        of moving money twice.</li>
      </ul>

      <h3>Transfer: domain service or saga?</h3>
      <table>
        <tr><th></th><th>Inside LedgerBank (both accounts ours)</th><th>To another bank</th></tr>
        <tr><td>Shape</td><td><strong>Domain service</strong> <code>TransferService</code>: the
        operation doesn't belong to either account alone</td><td><strong>Saga / process manager</strong>:
        a long-running process over several steps and systems</td></tr>
        <tr><td>Consistency</td><td>Often one DB transaction over two Account aggregates (a
        deliberate, documented exception to "one aggregate per transaction"), or a Transfer aggregate
        + events</td><td>Eventual. The other bank can accept minutes later, or reject</td></tr>
        <tr><td>Failure handling</td><td>Rollback</td><td><strong>Compensation</strong>: release the hold,
        or post a reversing entry</td></tr>
      </table>

      <div class="warn">Don't store a <code>balance</code> column that's updated independently of the
      ledger. Either derive balances from ledger entries, or update both in the same transaction and
      reconcile them regularly. Two sources of truth for money will drift.</div>

      <div class="tip"><strong>In the real world:</strong> payment APIs commonly accept an
      idempotency key header (Stripe's <code>Idempotency-Key</code> is the well-known example) and
      reject a reused key sent with a different payload. Core banking systems keep
      <strong>holds</strong> (authorizations) separate from posted entries. That's why your banking
      app shows "pending" transactions and an "available" balance that differs from the ledger
      balance.</div>
    `,
    examples: [
      {
        title: 'Money, Account, TransferService, ledger and idempotency',
        explain: `
          <details>
            <summary>Step by step: five requests</summary>
            <table>
              <tr><th>Request</th><th>What decides</th><th>Console</th></tr>
              <tr><td>ana→ben 120, key k-001</td><td>new key; ana 500 → 380, ben 20 → 140; journal TX-0001 balances</td><td><code>{"id":"TX-0001",…"amount":"AUD 120.00"}</code></td></tr>
              <tr><td>same request, k-001</td><td>idempotency map hit, so <em>nothing</em> is moved</td><td><code>{"id":"TX-0001",…,"replayed":true}</code></td></tr>
              <tr><td>ben→ana 250, k-002</td><td>Account invariant: 140 − 250 = −110 &lt; −100 limit</td><td><code>InsufficientFunds: ben has AUD 140.00, limit -AUD 100.00</code></td></tr>
              <tr><td>ben→ana 230, k-003</td><td>140 − 230 = −90 ≥ −100: allowed overdraft</td><td><code>{"id":"TX-0002",…"AUD 230.00"}</code></td></tr>
              <tr><td>ana→cy 50 AUD, k-004</td><td>Service checks currencies <em>before</em> debiting anything</td><td><code>CurrencyMismatch: transfer AUD 50.00 from AUD to USD needs FX</code></td></tr>
            </table>
            <p>Final <code>balances: ana=AUD 610.00  ben=AUD -90.00  cy=USD 1000.00</code>. Sum of AUD
            balances is still 520, the same as the 500 + 20 we started with: money moved, none was
            created. The hand-written journal (DR 10.00 vs CR 9.99) is rejected by the ledger itself,
            whoever calls it.</p>
            <div class="warn">The currency check happens before <code>a.debit</code> on purpose. If
            <code>b.credit</code> threw <em>after</em> <code>a.debit</code> succeeded, this in-memory
            demo would lose A$50. In production the whole block runs in one database transaction, which
            is the pragmatic, explicit exception to "one aggregate per transaction".</div>
          </details>
        `,
        code: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class CurrencyMismatch extends DomainError {}
class InsufficientFunds extends DomainError {}
class UnbalancedJournal extends DomainError {}

// ── Money: integer cents + currency, immutable ──
class Money {
  constructor(cents, currency) {
    if (!Number.isInteger(cents)) throw new DomainError('cents must be an integer: ' + cents);
    this.cents = cents;
    this.currency = currency;
    Object.freeze(this);
  }
  static of(amount, currency) {
    return new Money(Math.round(amount * 100), currency);
  }
  #same(o) {
    if (o.currency !== this.currency) {
      throw new CurrencyMismatch(this.currency + ' vs ' + o.currency);
    }
  }
  plus(o) { this.#same(o); return new Money(this.cents + o.cents, this.currency); }
  minus(o) { this.#same(o); return new Money(this.cents - o.cents, this.currency); }
  lessThan(o) { this.#same(o); return this.cents < o.cents; }
  toString() { return this.currency + ' ' + (this.cents / 100).toFixed(2); }
}

// ── Account aggregate: overdraft invariant ──
class Account {
  constructor(id, currency, opening, overdraft = 0) {
    this.id = id;
    this.balance = Money.of(opening, currency);
    this.overdraftLimit = Money.of(overdraft, currency);
  }
  debit(m) {
    const after = this.balance.minus(m);
    if (after.lessThan(new Money(-this.overdraftLimit.cents, m.currency))) {
      throw new InsufficientFunds(this.id + ' has ' + this.balance + ', limit -' + this.overdraftLimit);
    }
    this.balance = after;
  }
  credit(m) {
    this.balance = this.balance.plus(m);
  }
}

// ── Ledger: append-only journals that must balance ──
class Ledger {
  journals = [];
  post(id, lines) {
    const cur = lines[0].amount.currency;
    let dr = new Money(0, cur);
    let cr = new Money(0, cur);
    for (const l of lines) l.side === 'DR' ? (dr = dr.plus(l.amount)) : (cr = cr.plus(l.amount));
    if (dr.cents !== cr.cents) throw new UnbalancedJournal('DR ' + dr + ' ≠ CR ' + cr);
    this.journals.push(Object.freeze({ id, lines: Object.freeze(lines) }));
  }
}

// ── Domain service: the operation belongs to neither account alone ──
let txSeq = 0;
class TransferService {
  #done = new Map(); // idempotency key -> result
  constructor(accounts, ledger) {
    this.accounts = accounts;
    this.ledger = ledger;
  }
  transfer({ key, from, to, amount }) {
    if (this.#done.has(key)) return { ...this.#done.get(key), replayed: true };
    const a = this.accounts.get(from);
    const b = this.accounts.get(to);
    if (a.balance.currency !== amount.currency || b.balance.currency !== amount.currency) {
      throw new CurrencyMismatch('transfer ' + amount + ' from ' + a.balance.currency +
        ' to ' + b.balance.currency + ' needs FX');
    }
    // In production: ONE database transaction around the next three lines.
    a.debit(amount);
    b.credit(amount);
    const id = 'TX-' + String(++txSeq).padStart(4, '0');
    this.ledger.post(id, [
      { account: from, side: 'DR', amount },
      { account: to, side: 'CR', amount },
    ]);
    const result = { id, from, to, amount: String(amount) };
    this.#done.set(key, result);
    return result;
  }
}

// ═══ DEMO ═════════════════════════════════════════════════════
console.log('floats:', 0.1 + 0.2, '· Money:', String(Money.of(0.1, 'AUD').plus(Money.of(0.2, 'AUD'))));

const accounts = new Map([
  ['ana', new Account('ana', 'AUD', 500)],
  ['ben', new Account('ben', 'AUD', 20, 100)],
  ['cy', new Account('cy', 'USD', 1000)],
]);
const ledger = new Ledger();
const svc = new TransferService(accounts, ledger);
const show = () => [...accounts.values()].map((a) => a.id + '=' + a.balance).join('  ');
const run = (label, req) => {
  try {
    console.log(label, '→', svc.transfer(req));
  } catch (e) {
    console.log(label, '→', e.name + ': ' + e.message);
  }
};

run('ana→ben 120 (key k-001)', { key: 'k-001', from: 'ana', to: 'ben', amount: Money.of(120, 'AUD') });
run('retry after timeout (k-001)', { key: 'k-001', from: 'ana', to: 'ben', amount: Money.of(120, 'AUD') });
console.log('balances:', show());
run('ben→ana 250 (k-002)', { key: 'k-002', from: 'ben', to: 'ana', amount: Money.of(250, 'AUD') });
run('ben→ana 230 (k-003)', { key: 'k-003', from: 'ben', to: 'ana', amount: Money.of(230, 'AUD') });
run('ana→cy 50 AUD (k-004)', { key: 'k-004', from: 'ana', to: 'cy', amount: Money.of(50, 'AUD') });
console.log('balances:', show());

try {
  ledger.post('BAD-1', [
    { account: 'ana', side: 'DR', amount: Money.of(10, 'AUD') },
    { account: 'fees', side: 'CR', amount: Money.of(9.99, 'AUD') },
  ]);
} catch (e) {
  console.log('hand-written journal →', e.name + ': ' + e.message);
}
console.log('journals:', ledger.journals.map((j) => j.id + ' ' +
  j.lines.map((l) => l.side + ' ' + l.account + ' ' + l.amount).join(' / ')).join(' | '));`,
      },
      {
        title: 'Transfer to another bank: a saga with compensation',
        explain: `
          <details>
            <summary>Step by step: three sagas started at once</summary>
            <p>Ana has A$500. Three outbound transfers start concurrently: A$200 (OK), A$250 (to a closed account), A$100.</p>
            <table>
              <tr><th>Saga</th><th>Step 1: hold</th><th>Step 2–3: clearing (30 ms later)</th><th>Ana available after</th></tr>
              <tr><td>SAGA-1 A$200</td><td>placed → available A$300</td><td>accepted → hold settled, ledger A$300</td><td>300 → 50 (while SAGA-2 holds) → 300</td></tr>
              <tr><td>SAGA-2 A$250</td><td>placed → available A$50</td><td>rejected → <strong>compensate</strong>: release hold</td><td>back to A$300</td></tr>
              <tr><td>SAGA-3 A$100</td><td>REJECTED: only A$50 available at that moment</td><td>never sent</td><td></td></tr>
            </table>
            <p>Final: <code>results: ["COMPLETED","FAILED","REJECTED"]</code> and
            <code>ana ledger A$300.00 · available A$300.00 · holds 0</code>. SAGA-3 was rejected because
            of money that was later given back. That's the honest cost of holds: they protect the
            invariant ("never send money you don't have") at the price of being conservative while
            transfers are in flight.</p>
            <div class="tip">A real process manager persists its state after each step (<code>HOLD_PLACED</code>,
            <code>SENT</code>, <code>SETTLED</code>/<code>COMPENSATED</code>), so after a crash it resumes
            from the last recorded step instead of re-sending money. Each step must also be idempotent,
            keyed by the saga id, as <code>placeHold(sagaId, …)</code> is here.</div>
          </details>
        `,
        code: `const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Account with holds: available = ledger balance - active holds
class Account {
  holds = new Map();
  constructor(id, cents) {
    this.id = id;
    this.ledgerBalance = cents;
  }
  get available() {
    return this.ledgerBalance - [...this.holds.values()].reduce((s, c) => s + c, 0);
  }
  placeHold(holdId, cents) {
    if (this.available < cents) throw new Error('insufficient available funds');
    this.holds.set(holdId, cents);
  }
  settleHold(holdId) { // hold becomes a real debit
    this.ledgerBalance -= this.holds.get(holdId);
    this.holds.delete(holdId);
  }
  releaseHold(holdId) { // compensation
    this.holds.delete(holdId);
  }
}
const aud = (c) => 'A$' + (c / 100).toFixed(2);

// Fake external clearing network: slow, and it can say no.
const clearing = {
  async send({ toBank, toAccount, cents }) {
    await sleep(30);
    if (toAccount === '000-CLOSED') return { ok: false, reason: 'beneficiary account closed' };
    return { ok: true, clearingRef: 'CLR-' + toBank + '-' + cents };
  },
};

// Process manager: one instance per transfer, each step logged & resumable.
async function outboundTransferSaga(sagaId, account, req, log) {
  const step = (s) => log.push(sagaId + ' ' + s);
  try {
    account.placeHold(sagaId, req.cents);
  } catch (e) {
    step('REJECTED: ' + e.message);
    return 'REJECTED';
  }
  step('1 hold placed ' + aud(req.cents) + ' (available ' + aud(account.available) + ')');
  step('2 sent to clearing network');
  const res = await clearing.send(req);
  if (res.ok) {
    account.settleHold(sagaId);
    step('3 accepted ' + res.clearingRef + ' → hold settled, ledger ' + aud(account.ledgerBalance));
    return 'COMPLETED';
  }
  account.releaseHold(sagaId);
  step('3 rejected (' + res.reason + ') → COMPENSATE: hold released, available ' + aud(account.available));
  return 'FAILED';
}

const ana = new Account('ana', 50000);
const log = [];
const results = await Promise.all([
  outboundTransferSaga('SAGA-1', ana, { toBank: 'OZB', toAccount: '123-456', cents: 20000 }, log),
  outboundTransferSaga('SAGA-2', ana, { toBank: 'OZB', toAccount: '000-CLOSED', cents: 25000 }, log),
  outboundTransferSaga('SAGA-3', ana, { toBank: 'OZB', toAccount: '789-000', cents: 10000 }, log),
]);
log.forEach((l) => console.log(l));
console.log('results:', results);
console.log('ana ledger', aud(ana.ledgerBalance), '· available', aud(ana.available), '· holds', ana.holds.size);`,
      },
    ],
    quiz: [
      {
        q: 'LedgerBank\'s mobile app sends a transfer, the request times out, and the app retries. How do you avoid moving the money twice?',
        options: [
          'Ask the user to check their balance first',
          'The client sends an idempotency key; the server stores the result per key and returns it again for retries',
          'Disable retries in the app',
          'Compare amounts and reject any transfer equal to the last one',
        ],
        answer: 1,
        why: 'Idempotency keys identify the intent, not the payload. Equal amounts can be legitimate separate transfers, so comparing amounts doesn\'t work.',
      },
      {
        q: 'Where does the rule "Σ debits = Σ credits" belong?',
        options: [
          'In each Account aggregate',
          'In the Ledger/Journal, which rejects any journal that does not balance',
          'In the UI',
          'In a nightly report',
        ],
        answer: 1,
        why: 'The invariant is about a set of entries posted together, so the journal (or ledger posting) is the consistency boundary that enforces it.',
      },
      {
        q: 'Ana transfers A$250 to an account at another bank. That bank rejects it 3 minutes later. What does the saga do?',
        options: [
          'Roll back the database transaction from 3 minutes ago',
          'Run a compensating action: release the hold (or post a reversing entry if already settled)',
          'Retry forever',
          'Delete the ledger entry',
        ],
        answer: 1,
        why: 'Across systems there is no shared transaction to roll back. Sagas undo with explicit compensations, and ledgers are corrected with new entries, never edits.',
      },
      {
        q: 'Why does <code>TransferService</code> exist instead of <code>ana.transferTo(ben, amount)</code>?',
        options: [
          'Services are always better than methods',
          'The operation spans two aggregates plus the ledger and idempotency, so it belongs to neither account alone. That makes it a domain service',
          'Accounts cannot have methods',
          'To make it a microservice',
        ],
        answer: 1,
        why: 'Domain services hold domain operations that don\'t naturally fit one entity. The accounts still enforce their own invariants (overdraft).',
      },
    ],
    exercise: {
      task: `<p>Write <code>postJournal(ledger, key, lines)</code>. Each line is
      <code>{ account, side: 'DR' | 'CR', cents, currency }</code>. Reject with
      <code>DomainError</code> when:</p>
      <ul>
        <li>fewer than 2 lines, or any <code>cents</code> is not a positive integer;</li>
        <li>lines use more than one currency;</li>
        <li>Σ DR ≠ Σ CR.</li>
      </ul>
      <p>Idempotency: if <code>key</code> was already posted with the <em>same</em> lines, return the
      original journal id without posting again. Same key with <em>different</em> lines → throw
      <code>DomainError('idempotency key reused')</code>. New journals get ids <code>J-1</code>,
      <code>J-2</code>, … and are pushed to <code>ledger.journals</code>.</p>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const newLedger = () => ({ journals: [], keys: new Map() });

function postJournal(ledger, key, lines) {
  // TODO: idempotency check (ledger.keys: key -> { id, payload })
  // TODO: validations
  // TODO: create id 'J-' + (ledger.journals.length + 1), push, remember key
  return null;
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
const L = (account, side, cents, currency = 'AUD') => ({ account, side, cents, currency });

const ledger = newLedger();
const transfer = [L('ana', 'DR', 12000), L('ben', 'CR', 12000)];
check('balanced journal posts', postJournal(ledger, 'k1', transfer), 'J-1');
check('retry returns same id', postJournal(ledger, 'k1', transfer), 'J-1');
check('…and did not post twice', ledger.journals.length, 1);
expectThrows('same key, different lines', () => postJournal(ledger, 'k1', [L('ana', 'DR', 1), L('ben', 'CR', 1)]));
check('split fee journal (3 lines)', postJournal(ledger, 'k2',
  [L('ana', 'DR', 10250), L('ben', 'CR', 10000), L('fees', 'CR', 250)]), 'J-2');
expectThrows('unbalanced', () => postJournal(ledger, 'k3', [L('ana', 'DR', 1000), L('ben', 'CR', 999)]));
expectThrows('mixed currency', () => postJournal(ledger, 'k4', [L('ana', 'DR', 1000), L('cy', 'CR', 1000, 'USD')]));
expectThrows('one line only', () => postJournal(ledger, 'k5', [L('ana', 'DR', 0)]));
expectThrows('fractional cents', () => postJournal(ledger, 'k6', [L('ana', 'DR', 10.5), L('ben', 'CR', 10.5)]));
expectThrows('negative amount', () => postJournal(ledger, 'k7', [L('ana', 'DR', -5), L('ben', 'CR', -5)]));
check('failed posts left no trace', ledger.journals.map((j) => j.id), ['J-1', 'J-2']);`,
      hint: 'const payload = JSON.stringify(lines). If ledger.keys.has(key): compare payloads. Validate with lines.every(l => Number.isInteger(l.cents) && l.cents > 0) and new Set(lines.map(l => l.currency)).size === 1. Only remember the key after a successful post.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}
const newLedger = () => ({ journals: [], keys: new Map() });

function postJournal(ledger, key, lines) {
  const payload = JSON.stringify(lines);
  if (ledger.keys.has(key)) {
    const prev = ledger.keys.get(key);
    if (prev.payload !== payload) throw new DomainError('idempotency key reused');
    return prev.id;
  }
  if (lines.length < 2) throw new DomainError('a journal needs at least 2 lines');
  if (!lines.every((l) => Number.isInteger(l.cents) && l.cents > 0)) {
    throw new DomainError('amounts must be positive integer cents');
  }
  if (new Set(lines.map((l) => l.currency)).size !== 1) throw new DomainError('mixed currencies');
  const sum = (side) => lines.filter((l) => l.side === side).reduce((s, l) => s + l.cents, 0);
  if (sum('DR') !== sum('CR')) throw new DomainError('DR ' + sum('DR') + ' ≠ CR ' + sum('CR'));
  const id = 'J-' + (ledger.journals.length + 1);
  ledger.journals.push(Object.freeze({ id, lines: structuredClone(lines) }));
  ledger.keys.set(key, { id, payload });
  return id;
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
const L = (account, side, cents, currency = 'AUD') => ({ account, side, cents, currency });

const ledger = newLedger();
const transfer = [L('ana', 'DR', 12000), L('ben', 'CR', 12000)];
check('balanced journal posts', postJournal(ledger, 'k1', transfer), 'J-1');
check('retry returns same id', postJournal(ledger, 'k1', transfer), 'J-1');
check('…and did not post twice', ledger.journals.length, 1);
expectThrows('same key, different lines', () => postJournal(ledger, 'k1', [L('ana', 'DR', 1), L('ben', 'CR', 1)]));
check('split fee journal (3 lines)', postJournal(ledger, 'k2',
  [L('ana', 'DR', 10250), L('ben', 'CR', 10000), L('fees', 'CR', 250)]), 'J-2');
expectThrows('unbalanced', () => postJournal(ledger, 'k3', [L('ana', 'DR', 1000), L('ben', 'CR', 999)]));
expectThrows('mixed currency', () => postJournal(ledger, 'k4', [L('ana', 'DR', 1000), L('cy', 'CR', 1000, 'USD')]));
expectThrows('one line only', () => postJournal(ledger, 'k5', [L('ana', 'DR', 0)]));
expectThrows('fractional cents', () => postJournal(ledger, 'k6', [L('ana', 'DR', 10.5), L('ben', 'CR', 10.5)]));
expectThrows('negative amount', () => postJournal(ledger, 'k7', [L('ana', 'DR', -5), L('ben', 'CR', -5)]));
check('failed posts left no trace', ledger.journals.map((j) => j.id), ['J-1', 'J-2']);`,
    },
  },
  // ───────────────────────────────────────────────────────────── testing-domain
  {
    id: 'testing-domain',
    section: 'Real-World Case Studies',
    title: 'Testing the Domain',
    explain: `
      <p>A well-isolated domain model is the easiest code in your system to test. No database, no
      HTTP, no mocks: build some state, call a method, look at the result. If testing your aggregates
      needs a mocking library, that's a design smell. Something from the outside has leaked in.</p>

      <h3>Given – When – Then on events</h3>
      <p>For event-driven (especially event-sourced) aggregates, there's a beautifully regular test
      shape:</p>
      <pre><code>given([ BookingConfirmed{…}, PassportAdded{…} ])   // history: facts that already happened
  .when( CheckIn{ passenger: 'P1', now } )           // one command
  .then([ PassengerCheckedIn{…}, BoardingPassIssued{…} ])   // new facts expected
// or .thenThrows(CheckInNotOpen)</code></pre>
      <p>These tests read like the business rules, so a domain expert can review them. They test
      <strong>behaviour</strong>, not internal fields, so you can refactor the aggregate's
      internals freely as long as the same events come out.</p>

      <h3>What to test at which layer</h3>
      <table>
        <tr><th>Layer</th><th>Test style</th><th>Doubles</th><th>How many</th></tr>
        <tr><td>Value objects</td><td>Plain unit tests: equality, validation, arithmetic</td><td>none</td><td>many, tiny</td></tr>
        <tr><td>Aggregates / domain services</td><td>Given-when-then, or state-based (call method, assert state + events)</td><td>none (pass a fixed <code>now</code>)</td><td>most of your tests</td></tr>
        <tr><td>Application services</td><td>Use case with <strong>in-memory adapters</strong> (repo, bus, clock); assert outcome</td><td>fakes, not mocks</td><td>one or a few per use case</td></tr>
        <tr><td>Adapters</td><td>Integration tests against the real thing (Postgres in a container, provider sandbox)</td><td>none</td><td>a few per adapter</td></tr>
        <tr><td>Whole system</td><td>End-to-end through HTTP/UI for the critical journeys</td><td>none</td><td>a handful</td></tr>
      </table>

      <h3>Fakes vs mocks</h3>
      <p>A <strong>fake</strong> is a working, simplified implementation (an in-memory repository).
      A <strong>mock</strong> asserts which methods were called with which arguments. Mocks couple tests to
      <em>how</em> code does something, so rename <code>findById</code> to <code>get</code> and
      twenty tests break while behaviour is unchanged. Prefer fakes and assert on outcomes. Example 2
      shows the difference.</p>

      <div class="tip"><strong>In the real world:</strong> teams that do DDD well often end up with
      thousands of millisecond-fast domain tests and a thin layer of slower integration tests: the
      classic test pyramid, for once actually achieved. Write the GWT tests together with domain
      experts. Ask them for the weird cases ("what if the passenger checks in exactly 24h before?"),
      because those are where the real rules hide. For extra confidence on rules with many inputs,
      property-based testing (fast-check in JS) generates hundreds of cases per invariant.</div>
    `,
    examples: [
      {
        title: 'Given-when-then for SkyHop check-in, with a tiny test runner',
        explain: `
          <details>
            <summary>How one GWT test runs</summary>
            <table>
              <tr><th>Part</th><th>Code</th><th>What it does</th></tr>
              <tr><td>Given</td><td><code>[confirmed(true), PassportAdded P2]</code></td><td><code>history.reduce(evolve, initial)</code> → <code>{ status: 'CONFIRMED', international: true, passports: ['P2'], … }</code></td></tr>
              <tr><td>When</td><td><code>{ type: 'CheckIn', passenger: 'P2', now: DEP - 3h }</code></td><td><code>decide(state, cmd)</code>: window is 30 Nov 10:00 to 1 Dec 09:00 and now is 1 Dec 07:00 ✓, not checked in ✓, passport ✓</td></tr>
              <tr><td>Then</td><td><code>checkedIn('P2')</code></td><td>JSON-compares the two emitted events, including <code>gateClosesAt: DEP - 20 min</code></td></tr>
            </table>
            <p>No repository, no clock, no bus. Time is just a number in the command, so boundary
            tests like "exactly 24h before" (passes) and "59 min before" (<code>CheckInNotOpen</code>)
            are trivial to write. The report prints <code>8/8 passed</code> to the console and renders
            the same list into the preview.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>cmd.now &lt; opens</code> to <code>cmd.now &lt;= opens</code>. Only "window opens exactly 24h before" goes red, which tells you exactly which business rule you broke.</li>
              <li>Swap the order of the passport and already-checked-in checks. All tests still pass, because they check behaviour, not implementation.</li>
              <li>Write a test expecting a passenger who isn't on the booking (<code>'P9'</code>) to be rejected. It fails: <code>decide</code> happily checks P9 in. You've just discovered a missing rule. Add it to <code>decide</code> and watch the test go green.</li>
            </ul>
          </details>
        `,
        code: `// ═══ DOMAIN: check-in decider ═════════════════════════════════
class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class CheckInNotOpen extends DomainError {}
class AlreadyCheckedIn extends DomainError {}
class PassportRequired extends DomainError {}
class NotCheckInable extends DomainError {}
const HOUR = 3600 * 1000;
const MIN = 60 * 1000;

const initial = { status: 'NONE', departsAt: 0, international: false, passports: [], checkedIn: [] };
function evolve(s, e) {
  switch (e.type) {
    case 'BookingConfirmed':
      return { ...s, status: 'CONFIRMED', departsAt: e.departsAt, international: e.international,
        passengers: e.passengers };
    case 'PassportAdded':
      return { ...s, passports: [...s.passports, e.passenger] };
    case 'PassengerCheckedIn':
      return { ...s, checkedIn: [...s.checkedIn, e.passenger] };
    case 'BookingCancelled':
      return { ...s, status: 'CANCELLED' };
    default:
      return s;
  }
}
function decide(s, cmd) {
  if (s.status !== 'CONFIRMED') throw new NotCheckInable('booking is ' + s.status);
  const opens = s.departsAt - 24 * HOUR;
  const closes = s.departsAt - 1 * HOUR;
  if (cmd.now < opens || cmd.now > closes) throw new CheckInNotOpen('check-in is 24h to 1h before');
  if (s.checkedIn.includes(cmd.passenger)) throw new AlreadyCheckedIn(cmd.passenger);
  if (s.international && !s.passports.includes(cmd.passenger)) throw new PassportRequired(cmd.passenger);
  return [
    { type: 'PassengerCheckedIn', passenger: cmd.passenger },
    { type: 'BoardingPassIssued', passenger: cmd.passenger, gateClosesAt: s.departsAt - 20 * MIN },
  ];
}

// ═══ TINY TEST RUNNER ═════════════════════════════════════════
const results = [];
function test(name, fn) {
  try {
    fn();
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, msg: e.message });
  }
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function given(history) {
  return {
    when(cmd) {
      const run = () => decide(history.reduce(evolve, initial), cmd);
      return {
        then(expected) {
          const actual = run();
          if (!same(actual, expected)) throw new Error('expected ' + JSON.stringify(expected) +
            ' got ' + JSON.stringify(actual));
        },
        thenThrows(Type) {
          try {
            run();
          } catch (e) {
            if (e instanceof Type) return;
            throw new Error('expected ' + Type.name + ' got ' + e.name);
          }
          throw new Error('expected ' + Type.name + ' but nothing was thrown');
        },
      };
    },
  };
}

// ═══ THE TESTS (read them like a spec) ════════════════════════
const DEP = Date.UTC(2026, 11, 1, 10, 0); // 1 Dec 2026 10:00
const confirmed = (international = false) => ({ type: 'BookingConfirmed', departsAt: DEP,
  international, passengers: ['P1', 'P2'] });
const checkedIn = (passenger) => [
  { type: 'PassengerCheckedIn', passenger },
  { type: 'BoardingPassIssued', passenger, gateClosesAt: DEP - 20 * MIN },
];

test('checks in inside the window', () =>
  given([confirmed()]).when({ type: 'CheckIn', passenger: 'P1', now: DEP - 5 * HOUR })
    .then(checkedIn('P1')));
test('window opens exactly 24h before', () =>
  given([confirmed()]).when({ type: 'CheckIn', passenger: 'P1', now: DEP - 24 * HOUR })
    .then(checkedIn('P1')));
test('too early: 25h before', () =>
  given([confirmed()]).when({ type: 'CheckIn', passenger: 'P1', now: DEP - 25 * HOUR })
    .thenThrows(CheckInNotOpen));
test('too late: 59 min before', () =>
  given([confirmed()]).when({ type: 'CheckIn', passenger: 'P1', now: DEP - 59 * MIN })
    .thenThrows(CheckInNotOpen));
test('cannot check in twice', () =>
  given([confirmed(), { type: 'PassengerCheckedIn', passenger: 'P1' }])
    .when({ type: 'CheckIn', passenger: 'P1', now: DEP - 3 * HOUR }).thenThrows(AlreadyCheckedIn));
test('international needs a passport', () =>
  given([confirmed(true)]).when({ type: 'CheckIn', passenger: 'P2', now: DEP - 3 * HOUR })
    .thenThrows(PassportRequired));
test('international with passport is fine', () =>
  given([confirmed(true), { type: 'PassportAdded', passenger: 'P2' }])
    .when({ type: 'CheckIn', passenger: 'P2', now: DEP - 3 * HOUR })
    .then(checkedIn('P2')));
test('cancelled booking cannot check in', () =>
  given([confirmed(), { type: 'BookingCancelled' }])
    .when({ type: 'CheckIn', passenger: 'P1', now: DEP - 3 * HOUR }).thenThrows(NotCheckInable));

// ═══ REPORT (console + #root) ═════════════════════════════════
for (const r of results) console.log(r.ok ? '✅' : '❌', r.name, r.ok ? '' : '→ ' + r.msg);
const passed = results.filter((r) => r.ok).length;
console.log(passed + '/' + results.length + ' passed');
document.getElementById('root').innerHTML =
  '<div style="font:13px system-ui;padding:8px;background:#1b1f27;color:#e6e6e6;border-radius:8px">' +
  '<b>' + passed + '/' + results.length + ' passed</b>' +
  results.map((r) => '<div style="color:' + (r.ok ? '#5ad17a' : '#ff6b6b') + '">' +
    (r.ok ? '✔ ' : '✘ ') + r.name + (r.ok ? '' : ' — ' + r.msg) + '</div>').join('') + '</div>';`,
      },
      {
        title: 'Fakes vs mocks: which test survives a refactor?',
        code: `class Booking {
  constructor(ref, bags = 0) {
    this.ref = ref;
    this.bags = bags;
  }
  addBag() {
    if (this.bags >= 2) throw new Error('max 2 bags');
    this.bags++;
  }
}

// Version 1 of the handler
async function addBagV1(repo, ref) {
  const b = await repo.findById(ref);
  b.addBag();
  await repo.save(b);
}
// Version 2: a harmless refactor (repo method renamed, upsert instead of save)
async function addBagV2(repo, ref) {
  const b = await repo.get(ref);
  b.addBag();
  await repo.upsert(b);
}

// ── FAKE: a real (tiny) implementation with both method names ──
class InMemoryRepo {
  rows = new Map([['PNR-0001', { ref: 'PNR-0001', bags: 1 }]]);
  async findById(ref) { const r = this.rows.get(ref); return new Booking(r.ref, r.bags); }
  async get(ref) { return this.findById(ref); }
  async save(b) { this.rows.set(b.ref, { ref: b.ref, bags: b.bags }); }
  async upsert(b) { return this.save(b); }
}
async function stateTest(handler) {
  const repo = new InMemoryRepo();
  await handler(repo, 'PNR-0001');
  return repo.rows.get('PNR-0001').bags === 2 ? '✅ pass' : '❌ fail';
}

// ── MOCK: records calls and asserts on them ──
async function mockTest(handler) {
  const calls = [];
  const mock = {
    findById: async (ref) => (calls.push('findById:' + ref), new Booking(ref, 1)),
    save: async (b) => calls.push('save:' + b.bags),
  };
  try {
    await handler(mock, 'PNR-0001');
  } catch (e) {
    return '❌ fail (' + e.message + ')';
  }
  const ok = JSON.stringify(calls) === JSON.stringify(['findById:PNR-0001', 'save:2']);
  return ok ? '✅ pass' : '❌ fail (calls: ' + calls + ')';
}

console.log('V1 state-based test:', await stateTest(addBagV1));
console.log('V1 mock-based test: ', await mockTest(addBagV1));
console.log('V2 state-based test:', await stateTest(addBagV2));
console.log('V2 mock-based test: ', await mockTest(addBagV2));`,
      },
    ],
    quiz: [
      {
        q: 'Which test best captures the SkyHop rule "check-in closes 1 hour before departure"?',
        options: [
          'An end-to-end Cypress test clicking through the app at a real time of day',
          '<code>given([BookingConfirmed]).when(CheckIn at DEP − 59 min).thenThrows(CheckInNotOpen)</code>',
          'A mock asserting <code>repo.save</code> was not called',
          'A SQL query checking the bookings table',
        ],
        answer: 1,
        why: 'A domain-level GWT test with an explicit "now" pins the exact boundary, runs in microseconds and reads like the rule.',
      },
      {
        q: 'Your aggregate tests need a mocking library to stub the ORM and the HTTP client. What does that suggest?',
        options: [
          'You need a better mocking library',
          'Infrastructure has leaked into the domain; move I/O out to the application layer/adapters',
          'Aggregates should not be tested',
          'Nothing; that is normal',
        ],
        answer: 1,
        why: 'A clean domain model has no I/O dependencies, so its tests need none. Needing mocks there is a design signal.',
      },
      {
        q: 'In example 2, why does the mock-based test fail for V2 although behaviour is identical?',
        options: [
          'V2 has a bug',
          'It asserted how the handler talks to the repo (method names and order), not the outcome',
          'Mocks cannot be async',
          'The in-memory repo is wrong',
        ],
        answer: 1,
        why: 'Interaction-based tests are coupled to implementation details. State-based tests with fakes check the result and survive refactors.',
      },
      {
        q: 'Where should a test that verifies the Postgres adapter maps a <code>Money</code> column correctly live?',
        options: [
          'In the aggregate unit tests',
          'In a small integration test that runs the real adapter against a real (containerized) Postgres',
          'Nowhere: adapters are trivial',
          'In the end-to-end UI tests',
        ],
        answer: 1,
        why: 'Adapter correctness is about the real technology, so test it against the real thing, but keep those tests few and focused.',
      },
    ],
    exercise: {
      task: `<p>The given-when-then tests for <strong>seat selection</strong> are written. Make them
      pass by implementing <code>decide(state, cmd)</code> for <code>SelectSeat { passenger, seat }</code>:</p>
      <ul>
        <li>Booking must be <code>CONFIRMED</code>, else <code>NotSelectable</code>.</li>
        <li>Rows 12 and 13 are exit rows: a passenger travelling with an infant can't sit there →
        <code>ExitRowNotAllowed</code>.</li>
        <li>Seat already held by <em>another</em> passenger on this booking → <code>SeatTaken</code>.</li>
        <li>Selecting the seat you already have → no events (<code>[]</code>).</li>
        <li>Otherwise emit <code>SeatSelected</code>, preceded by <code>SeatReleased</code> for the
        passenger's previous seat if they had one.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class NotSelectable extends DomainError {}
class ExitRowNotAllowed extends DomainError {}
class SeatTaken extends DomainError {}
const EXIT_ROWS = [12, 13];

const initial = { status: 'NONE', infants: [], seats: {} };
function evolve(s, e) {
  switch (e.type) {
    case 'BookingConfirmed':
      return { ...s, status: 'CONFIRMED', infants: e.withInfant };
    case 'SeatSelected':
      return { ...s, seats: { ...s.seats, [e.passenger]: e.seat } };
    case 'BookingCancelled':
      return { ...s, status: 'CANCELLED' };
    default:
      return s;
  }
}

function decide(s, cmd) {
  // TODO: implement the rules
  return [];
}

// ── tiny GWT runner (prints ✅/❌) ──
function given(history) {
  const run = (cmd) => decide(history.reduce(evolve, initial), cmd);
  return {
    when: (cmd) => ({
      then(name, expected) {
        let actual;
        try {
          actual = run(cmd);
        } catch (e) {
          actual = e.name;
        }
        const ok = JSON.stringify(actual) === JSON.stringify(expected);
        console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
      },
      thenThrows(name, Type) {
        try {
          run(cmd);
          console.log('❌', name, '→ nothing thrown');
        } catch (e) {
          console.log(e instanceof Type ? '✅' : '❌', name, e instanceof Type ? '' : '→ ' + e.name);
        }
      },
    }),
  };
}

const confirmed = { type: 'BookingConfirmed', withInfant: ['P2'] };
const sel = (passenger, seat) => ({ type: 'SelectSeat', passenger, seat });

given([confirmed]).when(sel('P1', '14C'))
  .then('first selection', [{ type: 'SeatSelected', passenger: 'P1', seat: '14C' }]);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P1', '20A'))
  .then('change releases old seat first', [
    { type: 'SeatReleased', passenger: 'P1', seat: '14C' },
    { type: 'SeatSelected', passenger: 'P1', seat: '20A' },
  ]);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P1', '14C'))
  .then('same seat again is a no-op', []);
given([confirmed]).when(sel('P1', '12A'))
  .then('adult without infant may take exit row', [{ type: 'SeatSelected', passenger: 'P1', seat: '12A' }]);
given([confirmed]).when(sel('P2', '13F')).thenThrows('infant passenger not in exit row', ExitRowNotAllowed);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P2', '14C'))
  .thenThrows('seat held by another passenger', SeatTaken);
given([]).when(sel('P1', '14C')).thenThrows('unconfirmed booking', NotSelectable);
given([confirmed, { type: 'BookingCancelled' }]).when(sel('P1', '14C'))
  .thenThrows('cancelled booking', NotSelectable);`,
      hint: 'const row = parseInt(cmd.seat, 10) gives 12 for "12A". Find another holder with Object.entries(s.seats).find(([p, seat]) => seat === cmd.seat && p !== cmd.passenger). Build the events array: push SeatReleased only if s.seats[cmd.passenger] exists.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class NotSelectable extends DomainError {}
class ExitRowNotAllowed extends DomainError {}
class SeatTaken extends DomainError {}
const EXIT_ROWS = [12, 13];

const initial = { status: 'NONE', infants: [], seats: {} };
function evolve(s, e) {
  switch (e.type) {
    case 'BookingConfirmed':
      return { ...s, status: 'CONFIRMED', infants: e.withInfant };
    case 'SeatSelected':
      return { ...s, seats: { ...s.seats, [e.passenger]: e.seat } };
    case 'BookingCancelled':
      return { ...s, status: 'CANCELLED' };
    default:
      return s;
  }
}

function decide(s, cmd) {
  if (s.status !== 'CONFIRMED') throw new NotSelectable('booking is ' + s.status);
  const current = s.seats[cmd.passenger];
  if (current === cmd.seat) return [];
  if (EXIT_ROWS.includes(parseInt(cmd.seat, 10)) && s.infants.includes(cmd.passenger)) {
    throw new ExitRowNotAllowed(cmd.passenger + ' travels with an infant');
  }
  const holder = Object.entries(s.seats).find(([p, seat]) => seat === cmd.seat && p !== cmd.passenger);
  if (holder) throw new SeatTaken(cmd.seat + ' is held by ' + holder[0]);
  const events = [];
  if (current) events.push({ type: 'SeatReleased', passenger: cmd.passenger, seat: current });
  events.push({ type: 'SeatSelected', passenger: cmd.passenger, seat: cmd.seat });
  return events;
}

// ── tiny GWT runner (prints ✅/❌) ──
function given(history) {
  const run = (cmd) => decide(history.reduce(evolve, initial), cmd);
  return {
    when: (cmd) => ({
      then(name, expected) {
        let actual;
        try {
          actual = run(cmd);
        } catch (e) {
          actual = e.name;
        }
        const ok = JSON.stringify(actual) === JSON.stringify(expected);
        console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
      },
      thenThrows(name, Type) {
        try {
          run(cmd);
          console.log('❌', name, '→ nothing thrown');
        } catch (e) {
          console.log(e instanceof Type ? '✅' : '❌', name, e instanceof Type ? '' : '→ ' + e.name);
        }
      },
    }),
  };
}

const confirmed = { type: 'BookingConfirmed', withInfant: ['P2'] };
const sel = (passenger, seat) => ({ type: 'SelectSeat', passenger, seat });

given([confirmed]).when(sel('P1', '14C'))
  .then('first selection', [{ type: 'SeatSelected', passenger: 'P1', seat: '14C' }]);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P1', '20A'))
  .then('change releases old seat first', [
    { type: 'SeatReleased', passenger: 'P1', seat: '14C' },
    { type: 'SeatSelected', passenger: 'P1', seat: '20A' },
  ]);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P1', '14C'))
  .then('same seat again is a no-op', []);
given([confirmed]).when(sel('P1', '12A'))
  .then('adult without infant may take exit row', [{ type: 'SeatSelected', passenger: 'P1', seat: '12A' }]);
given([confirmed]).when(sel('P2', '13F')).thenThrows('infant passenger not in exit row', ExitRowNotAllowed);
given([confirmed, { type: 'SeatSelected', passenger: 'P1', seat: '14C' }]).when(sel('P2', '14C'))
  .thenThrows('seat held by another passenger', SeatTaken);
given([]).when(sel('P1', '14C')).thenThrows('unconfirmed booking', NotSelectable);
given([confirmed, { type: 'BookingCancelled' }]).when(sel('P1', '14C'))
  .thenThrows('cancelled booking', NotSelectable);`,
    },
  },
  // ───────────────────────────────────────────────────────────── ddd-pitfalls
  {
    id: 'ddd-pitfalls',
    section: 'Real-World Case Studies',
    title: 'DDD Pitfalls & Anti-Patterns',
    explain: `
      <p>Most failed "DDD projects" didn't fail because DDD is wrong. They failed because teams
      copied the <em>patterns</em> (repositories, aggregates, events) without the <em>thinking</em>
      (language, boundaries, invariants). Here are the usual suspects, how to spot them and what to do.</p>

      <table>
        <tr><th>Smell</th><th>How it looks</th><th>Fix</th></tr>
        <tr><td><strong>Anemic domain model</strong> (Fowler, 2003)</td><td>Entities are bags of getters/setters; all rules live in <code>*Service</code> classes</td><td>Move behaviour to the data it protects: <code>booking.addBag()</code>, not <code>bookingService.addBag(booking)</code></td></tr>
        <tr><td><strong>Aggregate too big</strong></td><td><code>Flight</code> contains all its bookings, passengers and seats; every change locks the whole flight</td><td>Design small aggregates around true invariants; reference others by id; use eventual consistency between them</td></tr>
        <tr><td><strong>Entity-per-table thinking</strong></td><td>One class + one repository per table, named after the schema (<code>BookingRow</code>, <code>BagRow</code>)</td><td>Model from behaviour and invariants first, map to tables second; one repository per aggregate root</td></tr>
        <tr><td><strong>Shared database between contexts</strong></td><td>Loyalty joins Booking's tables directly</td><td>Each context owns its data; integrate via APIs, events, or a published read model</td></tr>
        <tr><td><strong>"DDD = microservices"</strong></td><td>One service per context on day one, for a small team</td><td>Bounded context is a model boundary; start with a modular monolith</td></tr>
        <tr><td><strong>Pattern-itis on CRUD</strong></td><td>Factories, specifications and domain events for a settings screen</td><td>Use tactical patterns in the core domain; keep supporting/generic areas simple</td></tr>
        <tr><td><strong>Generic repository</strong></td><td><code>Repository&lt;T&gt;</code> with <code>findAll</code>, <code>findBy(where)</code>, <code>update(id, patch)</code></td><td>Repositories per aggregate with intention-revealing methods (<code>bookingsDepartingWithin(24h)</code>); <code>update(patch)</code> bypasses invariants</td></tr>
        <tr><td><strong>Leaking ORM</strong></td><td>Aggregate extends the ORM base class; lazy loading inside rules; decorators everywhere</td><td>Keep the model plain; map in the repository adapter. (Using ORM entities as aggregates can work if you are disciplined, but be aware of the trade.)</td></tr>
      </table>

      <h3>Strategic pitfalls (often worse)</h3>
      <ul>
        <li><strong>Skipping the language.</strong> If developers say "the order row" and business
        says "the reservation", no pattern will save you.</li>
        <li><strong>One model to rule them all.</strong> A single <code>Customer</code> class shared
        by Sales, Support, Billing and Shipping grows 80 fields and pleases nobody.</li>
        <li><strong>DDD everywhere.</strong> Evans' advice is to focus effort on the <em>core
        domain</em>. Buy or keep simple the generic parts (auth, email, invoicing).</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> the smell that hurts most often is
      "aggregate too big", because it shows up late, as lock contention and slow loads under real
      traffic (example 2). Second is a shared database. It feels fast for the first year and then
      makes every schema change a cross-team negotiation. When in doubt, ask "what invariant forces
      these things to change together, in the same transaction?" If you can't name one, they're
      separate aggregates.</div>
    `,
    examples: [
      {
        title: 'Widget: spot the smell',
        lang: 'html',
        editor: false,
        code: `<style>
  .sm { background:#1b1f27; color:#e6e6e6; font:14px system-ui, sans-serif; padding:14px; border-radius:10px; }
  .sm h4 { margin:0 0 4px; }
  .sm .card { background:#262b36; border-radius:8px; padding:10px; margin:8px 0; border-left:4px solid #3a4150; }
  .sm .card.ok { border-left-color:#5ad17a; }
  .sm .card.bad { border-left-color:#ff6b6b; }
  .sm pre { margin:6px 0; white-space:pre-wrap; font:12px ui-monospace, monospace; color:#cfd6e4; background:#11141a; padding:6px 8px; border-radius:6px; }
  .sm select, .sm button { font:13px system-ui; padding:4px 8px; border-radius:6px; border:1px solid #3a4150; background:#11141a; color:#e6e6e6; }
  .sm button { cursor:pointer; background:#4c9aff; color:#fff; border:none; padding:6px 14px; }
  .sm .fb { font-size:13px; margin-top:6px; }
  .sm .score { font-weight:700; margin-left:10px; }
</style>
<div class="sm">
  <h4>Spot the smell</h4>
  <div style="font-size:13px;color:#aab">Pick the anti-pattern each snippet shows, then click Check.</div>
  <div id="cards"></div>
  <button id="check">Check</button><span class="score" id="score"></span>
</div>
<script>
  const SMELLS = ['anemic model', 'aggregate too big', 'entity-per-table', 'shared database',
    'DDD = microservices', 'pattern-itis on CRUD', 'generic repository', 'leaking ORM'];
  const ITEMS = [
    { code: 'class Booking { status; bags; seat; }   // only getters/setters\\nBookingService.addBag(b) { if (b.bags >= 2) throw …; b.bags++ }\\nCallCentreService.addBag(b) { b.bags++ }',
      answer: 'anemic model', why: 'Rules live in services, so the second service forgot one. Put addBag() with its rule on Booking.' },
    { code: 'class Flight {\\n  seats /* 180 */; bookings /* all PNRs */; passengers; meals;\\n}\\n// changing one seat loads and version-locks the whole flight',
      answer: 'aggregate too big', why: 'No invariant needs all bookings in one transaction. Make Booking its own aggregate referencing flightId, and keep a small seat-inventory aggregate.' },
    { code: 'LoyaltyJob.run():\\n  SELECT b.ref, p.amount FROM booking.bookings b\\n  JOIN payments.charges p ON p.booking_id = b.id',
      answer: 'shared database', why: 'Loyalty is coupled to two other contexts\\' schemas. Consume FlightFlown / PaymentCaptured events or an API instead.' },
    { code: 'interface Repository&lt;T&gt; {\\n  findAll(); findBy(where); update(id, patch); delete(id);\\n}\\nbookingRepo.update(id, { status: "CANCELLED" })',
      answer: 'generic repository', why: 'update(patch) bypasses Booking.cancel() and its rules. Repositories per aggregate: get(ref), save(booking), plus intention-revealing queries.' },
    { code: '@Entity class Booking extends BaseModel {\\n  @OneToMany(lazy) passengers;\\n  canCancel() { return this.passengers.length … } // triggers SQL!\\n}',
      answer: 'leaking ORM', why: 'Business rules now depend on lazy-loading and DB sessions, so they can\\'t be tested without the ORM. Keep the model plain and map in the adapter.' },
    { code: 'Team of 4, first month:\\n  booking-svc, pricing-svc, seat-svc, bag-svc, pnr-svc,\\n  passenger-svc, payment-svc, email-svc, loyalty-svc  (each with its own repo + pipeline)',
      answer: 'DDD = microservices', why: 'Bounded contexts are model boundaries. Four people operating nine services pay the distribution tax with no benefit. Modular monolith first.' },
    { code: 'NewsletterPreferences (1 checkbox):\\n  PreferenceAggregate, PreferenceFactory, OptInSpecification,\\n  PreferenceDomainService, 4 domain events, 2 sagas',
      answer: 'pattern-itis on CRUD', why: 'A generic or supporting subdomain with no real invariants. A simple CRUD module is the right design here.' },
    { code: 'BookingRow, PassengerRow, BagRow, SeatRow\\nBookingRowRepository, PassengerRowRepository, BagRowRepository, SeatRowRepository\\n// a use case saves 4 repositories in a row',
      answer: 'entity-per-table', why: 'The model mirrors the schema instead of the behaviour. Booking is the aggregate root, passengers and bags live inside it, and there is one repository.' },
  ];
  const cards = document.getElementById('cards');
  ITEMS.forEach((it, i) => {
    const c = document.createElement('div');
    c.className = 'card';
    c.id = 'card' + i;
    c.innerHTML = '<b>#' + (i + 1) + '</b><pre>' + it.code + '</pre>' +
      '<select id="sel' + i + '"><option value="">— choose a smell —</option>' +
      SMELLS.map((s) => '<option>' + s + '</option>').join('') + '</select>' +
      '<div class="fb" id="fb' + i + '"></div>';
    cards.appendChild(c);
  });
  document.getElementById('check').onclick = () => {
    let right = 0;
    ITEMS.forEach((it, i) => {
      const v = document.getElementById('sel' + i).value;
      const ok = v === it.answer;
      if (ok) right++;
      document.getElementById('card' + i).className = 'card ' + (v ? (ok ? 'ok' : 'bad') : '');
      document.getElementById('fb' + i).innerHTML = !v ? 'Pick one.' : ok
        ? '✔ ' + it.why
        : '✘ Not quite. Look again: what would break first as this system grows?';
    });
    document.getElementById('score').textContent = right + ' / ' + ITEMS.length +
      (right === ITEMS.length ? '  all correct!' : '');
  };
</script>`,
      },
      {
        title: 'Aggregate too big: measuring the contention',
        explain: `
          <details>
            <summary>Reading the three results</summary>
            <table>
              <tr><th>Design</th><th>Console</th><th>Why</th></tr>
              <tr><td>Flight holds all bookings</td><td><code>saved:  1  conflicts: 19  aggregates touched: 1</code></td><td>All 20 loaded version 0 of the <em>same</em> aggregate. The first save bumps it to 1, and the other 19 fail the version check, although they changed unrelated seats.</td></tr>
              <tr><td>Booking per PNR</td><td><code>saved: 20  conflicts:  0  aggregates touched: 20</code></td><td>Each request touches its own aggregate. No false sharing.</td></tr>
              <tr><td>Booking + SeatInventory</td><td><code>saved: 17  conflicts:  3  aggregates touched: 17</code></td><td>16 seat changes hit only their bookings. The 4 new sales really do compete for the same seat count, so 3 conflict and must retry. That contention is <em>real</em>: it protects "no overbooking".</td></tr>
            </table>
            <p>The goal isn't zero conflicts. It's conflicts <strong>only where a true invariant
            requires them</strong>. Vernon's rule "design small aggregates" is exactly this
            measurement.</p>
          </details>
        `,
        code: `// 20 passengers on flight SH101 change their seats at the same moment.
// Each request: load → change → save with an optimistic version check.

function simulate(label, aggregateIdFor) {
  const versions = new Map(); // aggregateId -> version
  const requests = Array.from({ length: 20 }, (_, i) => 'PNR-' + String(i + 1).padStart(4, '0'));

  // Phase 1: everyone loads at the same time
  const loaded = requests.map((ref) => {
    const id = aggregateIdFor(ref);
    return { ref, id, version: versions.get(id) || 0 };
  });

  // Phase 2: everyone saves
  let ok = 0;
  let conflicts = 0;
  for (const req of loaded) {
    const current = versions.get(req.id) || 0;
    if (current !== req.version) {
      conflicts++;
      continue;
    }
    versions.set(req.id, current + 1);
    ok++;
  }
  console.log(label.padEnd(38), 'saved:', String(ok).padStart(2), ' conflicts:', String(conflicts).padStart(2),
    ' aggregates touched:', versions.size);
}

// BIG: the Flight aggregate holds all 180 bookings → every request hits the same aggregate.
simulate('Flight aggregate (holds bookings)', () => 'flight:SH101');

// SMALL: each Booking is its own aggregate referencing flightNo by id.
simulate('Booking aggregates (ref flight by id)', (ref) => 'booking:' + ref);

// The real shared invariant (no overbooking) lives in a small SeatInventory aggregate.
// Only requests that change seat COUNTS touch it: here every 5th request is a new sale,
// the other 16 are seat changes inside an existing booking.
simulate('Booking + SeatInventory (4 new sales)', (ref) =>
  Number(ref.slice(-2)) % 5 === 0 ? 'inventory:SH101:Y' : 'booking:' + ref);`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s <code>Flight</code> aggregate contains 180 <code>Booking</code>s. During a sale, most seat changes fail with concurrency errors. Best fix?',
        options: [
          'Turn off optimistic locking',
          'Make Booking its own aggregate referencing the flight by id; keep only the true shared invariant (seat counts) in a small inventory aggregate',
          'Add more database CPU',
          'Retry every request 50 times',
        ],
        answer: 1,
        why: 'Small aggregates around real invariants (Vernon\'s rules) remove false contention. Example 2 shows 19 of 20 requests failing with the big aggregate and zero with small ones.',
      },
      {
        q: 'A ShopLane repository offers <code>orders.update(id, { status: \'SHIPPED\' })</code>. What is the problem?',
        options: [
          'It is too slow',
          'It bypasses the Order aggregate\'s state machine and invariants. Changes should go through order.ship() and then save(order)',
          'Status should be an integer',
          'Repositories may not update anything',
        ],
        answer: 1,
        why: 'Patch-style generic updates let any caller set any state. Repositories should load and save whole aggregates, so behaviour stays in the model.',
      },
      {
        q: 'Which is NOT necessarily an anti-pattern?',
        options: [
          'Several bounded contexts deployed together in one modular monolith',
          'Two contexts writing to the same tables',
          'All business rules in service classes with anemic entities',
          'One generic repository for every entity',
        ],
        answer: 0,
        why: 'Deploying several contexts together is a perfectly good choice when the module boundaries are enforced. The others erode boundaries or invariants.',
      },
      {
        q: 'The team spent two sprints applying aggregates, specifications and domain events to the "edit profile photo" feature. What is the DDD-aligned feedback?',
        options: [
          'Great, consistency across the codebase is key',
          'Invest tactical patterns in the core domain; a generic CRUD feature like this should stay simple',
          'They should also add event sourcing',
          'Move it to a microservice',
        ],
        answer: 1,
        why: 'Strategic design tells you where to spend effort. Pattern-itis on CRUD costs time and adds complexity without protecting any important rule.',
      },
    ],
    exercise: {
      task: `<p>ShopLane's <code>Coupon</code> is anemic: services poke its fields, and two of them
      forgot rules. Write a <strong>rich</strong> <code>Coupon</code> with
      <code>redeem(orderId, orderTotalCents, now)</code> that returns the discount in cents and
      enforces:</p>
      <ul>
        <li>not expired (<code>now &lt;= expiresAt</code>), else <code>DomainError('expired')</code>;</li>
        <li>order total ≥ <code>minSpendCents</code>, else <code>DomainError('min spend not met')</code>;</li>
        <li>at most <code>maxUses</code> redemptions, else <code>DomainError('used up')</code>;</li>
        <li>the same <code>orderId</code> can't redeem twice: the second call returns the same
        discount without using another redemption (idempotent);</li>
        <li>discount = <code>percent</code>% of the total, rounded down, capped at
        <code>maxDiscountCents</code>.</li>
      </ul>
      <p><code>uses</code> must be readable but not settable from outside (use a getter over a
      <code>#private</code> field).</p>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}

// BEFORE (anemic) — for reference:
//   coupon.uses++; order.total -= coupon.percent * order.total / 100;   // in 3 different services

class Coupon {
  constructor({ code, percent, maxDiscountCents, minSpendCents, maxUses, expiresAt }) {
    Object.assign(this, { code, percent, maxDiscountCents, minSpendCents, maxUses, expiresAt });
  }
  get uses() {
    return 0; // TODO: back this with a #private field
  }
  redeem(orderId, orderTotalCents, now) {
    // TODO
    return 0;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, msg) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = e instanceof DomainError && e.message === msg;
    console.log(ok ? '✅' : '❌', name, '(' + e.message + ')');
  }
}
const NOV30 = Date.UTC(2026, 10, 30);
const make = () => new Coupon({ code: 'BLACKFRI', percent: 20, maxDiscountCents: 5000,
  minSpendCents: 3000, maxUses: 2, expiresAt: NOV30 });

const c = make();
check('20% of $40.00', c.redeem('ORD-1', 4000, NOV30 - 1), 800);
check('capped at $50.00', c.redeem('ORD-2', 99999, NOV30 - 1), 5000);
check('uses counted', c.uses, 2);
check('same order again is idempotent', c.redeem('ORD-1', 4000, NOV30 - 1), 800);
check('…and did not use a redemption', c.uses, 2);
expectThrows('third distinct order', () => c.redeem('ORD-3', 4000, NOV30 - 1), 'used up');
expectThrows('below min spend', () => make().redeem('ORD-4', 2999, NOV30 - 1), 'min spend not met');
expectThrows('expired', () => make().redeem('ORD-5', 4000, NOV30 + 1), 'expired');
check('rounds down', make().redeem('ORD-6', 3333, NOV30), 666);
const d = make();
try {
  d.uses = 99;
} catch {}
check('uses cannot be set from outside', d.uses, 0);`,
      hint: 'Keep #uses = 0 and #byOrder = new Map(). In redeem: if (this.#byOrder.has(orderId)) return it. Then check expiry, min spend, uses. discount = Math.min(Math.floor(total * percent / 100), maxDiscountCents).',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = 'DomainError'; }
}

// BEFORE (anemic) — for reference:
//   coupon.uses++; order.total -= coupon.percent * order.total / 100;   // in 3 different services

class Coupon {
  #uses = 0;
  #byOrder = new Map();
  constructor({ code, percent, maxDiscountCents, minSpendCents, maxUses, expiresAt }) {
    Object.assign(this, { code, percent, maxDiscountCents, minSpendCents, maxUses, expiresAt });
  }
  get uses() {
    return this.#uses;
  }
  redeem(orderId, orderTotalCents, now) {
    if (this.#byOrder.has(orderId)) return this.#byOrder.get(orderId);
    if (now > this.expiresAt) throw new DomainError('expired');
    if (orderTotalCents < this.minSpendCents) throw new DomainError('min spend not met');
    if (this.#uses >= this.maxUses) throw new DomainError('used up');
    const discount = Math.min(Math.floor((orderTotalCents * this.percent) / 100), this.maxDiscountCents);
    this.#uses++;
    this.#byOrder.set(orderId, discount);
    return discount;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, msg) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    const ok = e instanceof DomainError && e.message === msg;
    console.log(ok ? '✅' : '❌', name, '(' + e.message + ')');
  }
}
const NOV30 = Date.UTC(2026, 10, 30);
const make = () => new Coupon({ code: 'BLACKFRI', percent: 20, maxDiscountCents: 5000,
  minSpendCents: 3000, maxUses: 2, expiresAt: NOV30 });

const c = make();
check('20% of $40.00', c.redeem('ORD-1', 4000, NOV30 - 1), 800);
check('capped at $50.00', c.redeem('ORD-2', 99999, NOV30 - 1), 5000);
check('uses counted', c.uses, 2);
check('same order again is idempotent', c.redeem('ORD-1', 4000, NOV30 - 1), 800);
check('…and did not use a redemption', c.uses, 2);
expectThrows('third distinct order', () => c.redeem('ORD-3', 4000, NOV30 - 1), 'used up');
expectThrows('below min spend', () => make().redeem('ORD-4', 2999, NOV30 - 1), 'min spend not met');
expectThrows('expired', () => make().redeem('ORD-5', 4000, NOV30 + 1), 'expired');
check('rounds down', make().redeem('ORD-6', 3333, NOV30), 666);
const d = make();
try {
  d.uses = 99;
} catch {}
check('uses cannot be set from outside', d.uses, 0);`,
    },
  },
  // ───────────────────────────────────────────────────────────── capstone
  {
    id: 'capstone',
    section: 'Real-World Case Studies',
    title: 'Capstone: Model SkyHop Loyalty',
    explain: `
      <p>Time to put it together. SkyHop is launching <strong>SkyHop Rewards</strong>, and the
      Loyalty context is yours. The business rules come from a (fictional) workshop with the loyalty
      team. Your job is to turn them into a <code>LoyaltyAccount</code> aggregate that is correct,
      small and safe under at-least-once event delivery.</p>

      <h3>The rules from the workshop</h3>
      <ol>
        <li><strong>Earn on flown, not on booked.</strong> Points are credited when the Check-in &amp;
        Boarding context publishes <code>FlightFlown</code> for a passenger.</li>
        <li><strong>Points</strong> = ⌊fare (AUD) × tier multiplier⌋. Multipliers: Member 1,
        Silver 1.25, Gold 1.5, Platinum 2. Use the tier <em>before</em> this flight.</li>
        <li><strong>Status credits</strong> per flight by fare family: Starter 10, Plus 20, Max 40.</li>
        <li><strong>Tier upgrade</strong> as soon as credits reach a threshold: Silver 100, Gold 250,
        Platinum 500. (Downgrades are a yearly batch job, out of scope.)</li>
        <li><strong>Expiry:</strong> each earned batch expires 365 days after the flight.</li>
        <li><strong>Redeem</strong> uses the oldest non-expired points first. Can't redeem more than
        available: <code>InsufficientPoints</code>.</li>
        <li><strong>Idempotent:</strong> the same <code>FlightFlown</code> (same
        <code>eventId</code>) delivered twice must earn once.</li>
      </ol>

      <h3>Why <code>FlightFlown</code> and not <code>BookingConfirmed</code>?</h3>
      <ul>
        <li><strong>Bookings change.</strong> They get cancelled, refunded, re-routed in an IROP,
        or downgraded. Every change would need a matching "claw back points" flow.</li>
        <li><strong>No-shows.</strong> A passenger who never boards shouldn't earn. Only Boarding
        knows who actually flew.</li>
        <li><strong>Clawbacks can fail.</strong> If points were earned at booking and spent before
        the cancellation, you can't take them back without a negative balance or a debt-collection
        process. Example 1 shows exactly that.</li>
        <li><strong>It matches the language.</strong> Loyalty experts talk about "flown revenue"
        and "flown segments". Listening for that vocabulary leads you to the right event.</li>
      </ul>
      <p>That's also a context-mapping decision. Loyalty is <em>downstream</em> of Check-in &amp;
      Boarding and translates its event through a small <strong>anticorruption layer</strong> into
      Loyalty's own language (member id, fare family, points).</p>

      <h3>Design hints</h3>
      <ul>
        <li>One aggregate per member: <code>LoyaltyAccount</code>. Don't put flights or bookings
        inside it. Store only what the rules need: batches of points, credits, tier, processed
        event ids.</li>
        <li>Pass <code>now</code> in. No <code>Date.now()</code> inside the aggregate.</li>
        <li>Record domain events (<code>PointsEarned</code>, <code>TierUpgraded</code>,
        <code>PointsRedeemed</code>, <code>PointsExpired</code>) so Notifications can send "You're
        Silver now!" without Loyalty calling it.</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> airline programmes vary a lot.
      Some earn by distance, some by revenue, many by both (points vs status credits), and partner
      earning (credit cards, hotels) often outweighs flying. That variety is why Loyalty is often
      a <em>core</em> subdomain for an airline: it drives revenue and differentiation, so it is worth
      modelling carefully instead of buying a one-size-fits-all package.</div>
    `,
    examples: [
      {
        title: 'Why earning on BookingConfirmed goes wrong',
        explain: `
          <details>
            <summary>Step by step: the same year under both policies</summary>
            <table>
              <tr><th>Event</th><th>Policy A balance (earn on booking)</th><th>Policy B balance (earn on flown)</th></tr>
              <tr><td>3 × BookingConfirmed (200, 150, 300)</td><td>650</td><td>0</td></tr>
              <tr><td>RedeemRequested 500</td><td>150</td><td>0 (<code>redeem 500 rejected: only 0 available</code>)</td></tr>
              <tr><td>BookingCancelled PNR-0002</td><td>0 (claw back 150)</td><td>0 (nothing to undo)</td></tr>
              <tr><td>FlightFlown PNR-0001</td><td>0 (already counted at booking)</td><td>200</td></tr>
              <tr><td>NoShow PNR-0003</td><td><strong>−300</strong> (claw back 300)</td><td>200</td></tr>
            </table>
            <p>Policy A ends at <code>balance: -300 ← member owes us points ❌</code>: the member spent
            points for flights they never took, and now the business needs a debt process, or has to
            write off the points. Policy B ends at <code>balance: 200 ✅</code> with no compensating logic at
            all. Choosing the right <em>event to react to</em> removed a whole category of code.</p>
            <p>The ACL line <code>toEarnCommand(ff)</code> is also worth noticing. Loyalty never handles
            Boarding's event shape beyond that function, and it speaks in its own terms
            (<code>memberId</code>, <code>EarnForFlight</code>) from then on.</p>
          </details>
        `,
        code: `// One member's year, as events from two different contexts.
const timeline = [
  { ctx: 'Booking', type: 'BookingConfirmed', pnr: 'PNR-0001', fareAud: 200 },
  { ctx: 'Booking', type: 'BookingConfirmed', pnr: 'PNR-0002', fareAud: 150 },
  { ctx: 'Booking', type: 'BookingConfirmed', pnr: 'PNR-0003', fareAud: 300 },
  { ctx: 'Loyalty', type: 'RedeemRequested', points: 500 },       // spends points early
  { ctx: 'Booking', type: 'BookingCancelled', pnr: 'PNR-0002' },  // refunded
  { ctx: 'Boarding', type: 'FlightFlown', pnr: 'PNR-0001', fareAud: 200, eventId: 'ff-1' },
  { ctx: 'Boarding', type: 'NoShow', pnr: 'PNR-0003' },            // never boarded
];

// ── Policy A: earn on BookingConfirmed, claw back later ──
function policyA(events) {
  let balance = 0;
  const earned = {};
  const log = [];
  for (const e of events) {
    if (e.type === 'BookingConfirmed') {
      earned[e.pnr] = e.fareAud;
      balance += e.fareAud;
      log.push('+' + e.fareAud + ' (' + e.pnr + ' booked)');
    }
    if (e.type === 'RedeemRequested') {
      balance -= e.points;
      log.push('-' + e.points + ' redeemed');
    }
    if (e.type === 'BookingCancelled' || e.type === 'NoShow') {
      balance -= earned[e.pnr];
      log.push('-' + earned[e.pnr] + ' clawback (' + e.pnr + ' ' + e.type + ')');
    }
  }
  return { balance, log };
}

// ── Policy B: earn only on FlightFlown, via a small ACL ──
// Anticorruption layer: Boarding's event → Loyalty's command, in Loyalty's language.
const memberByPnr = { 'PNR-0001': 'M-1001', 'PNR-0002': 'M-1001', 'PNR-0003': 'M-1001' };
const toEarnCommand = (ff) => ({ type: 'EarnForFlight', memberId: memberByPnr[ff.pnr],
  sourceEventId: ff.eventId, fareAud: ff.fareAud });

function policyB(events) {
  let balance = 0;
  const log = [];
  for (const e of events) {
    if (e.type === 'FlightFlown') {
      const cmd = toEarnCommand(e);
      balance += cmd.fareAud;
      log.push('+' + cmd.fareAud + ' (' + e.pnr + ' flown, ' + cmd.memberId + ')');
    }
    if (e.type === 'RedeemRequested') {
      if (balance < e.points) {
        log.push('redeem ' + e.points + ' rejected: only ' + balance + ' available');
        continue;
      }
      balance -= e.points;
    }
  }
  return { balance, log };
}

const a = policyA(timeline);
console.log('A: earn on BookingConfirmed');
a.log.forEach((l) => console.log('   ', l));
console.log('   balance:', a.balance, a.balance < 0 ? '← member owes us points ❌' : '');

const b = policyB(timeline);
console.log('B: earn on FlightFlown');
b.log.forEach((l) => console.log('   ', l));
console.log('   balance:', b.balance, '✅ no clawbacks needed');`,
      },
    ],
    quiz: [
      {
        q: 'Loyalty earns on <code>FlightFlown</code>. Check-in &amp; Boarding later renames a field in that event. Which pattern keeps Loyalty\'s model safe?',
        options: [
          'Conformist: just use Boarding\'s field names everywhere in Loyalty',
          'An anticorruption layer translating FlightFlown into Loyalty\'s own EarnForFlight command',
          'Shared kernel with Boarding\'s whole model',
          'Read Boarding\'s database directly',
        ],
        answer: 1,
        why: 'The ACL is the one place that knows Boarding\'s shape. A rename there is a one-line fix, and the LoyaltyAccount aggregate is untouched.',
      },
      {
        q: 'A Silver member flies a A$100 fare and that flight lifts them to Gold. How many points does it earn under the workshop rules?',
        options: ['100', '125 (Silver multiplier, the tier before the flight)', '150 (Gold multiplier)', '0 until the upgrade is processed'],
        answer: 1,
        why: 'Rule 2 says to use the tier before this flight. Rules like this are exactly what you must ask domain experts about, then pin down with a test.',
      },
      {
        q: 'The broker redelivers <code>FlightFlown ff-42</code> an hour later. What should the LoyaltyAccount do?',
        options: [
          'Earn again: it\'s a new message',
          'Recognize the processed eventId and ignore it, with no new events and no balance change',
          'Throw an error so the broker stops',
          'Earn half',
        ],
        answer: 1,
        why: 'At-least-once delivery means duplicates are normal. Idempotency by eventId, stored with the aggregate, makes redelivery harmless.',
      },
      {
        q: 'Should <code>LoyaltyAccount</code> hold the member\'s list of bookings and flights?',
        options: [
          'Yes, so it can recompute points anytime',
          'No. It holds only what its invariants need (point batches, credits, tier, processed ids) and references other things by id',
          'Yes, aggregates should be as complete as possible',
          'Only the cancelled ones',
        ],
        answer: 1,
        why: 'Small aggregates around true invariants. Bookings belong to the Booking context; Loyalty keeps its own minimal facts.',
      },
    ],
    exercise: {
      task: `<p>Implement <code>LoyaltyAccount</code> per the workshop rules above. API:</p>
      <ul>
        <li><code>onFlightFlown({ eventId, memberId, fareAud, fareFamily, flownAt })</code> returns
        <code>true</code> if applied, <code>false</code> for a duplicate <code>eventId</code>. Throws
        <code>DomainError</code> if <code>memberId</code> isn't this account's. Records
        <code>PointsEarned { points, eventId }</code> and, on upgrade,
        <code>TierUpgraded { from, to }</code>.</li>
        <li><code>availablePoints(now)</code>: sum of non-expired batches (a batch is expired when
        <code>now ≥ expiresAt</code>).</li>
        <li><code>expire(now)</code>: removes expired batches, records
        <code>PointsExpired { points }</code> if any, and returns the number expired.</li>
        <li><code>redeem(points, now)</code>: expires first, throws <code>InsufficientPoints</code> if
        not enough, consumes the oldest batches first (partially if needed), and records
        <code>PointsRedeemed { points }</code>.</li>
        <li><code>pullEvents()</code> returns and clears recorded events.</li>
      </ul>
      <p>Dates are ISO strings like <code>'2026-03-01'</code>. Use the provided <code>dayNo()</code>
      helper (days since epoch) to add 365 days and compare.</p>`,
      starter: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class InsufficientPoints extends DomainError {}

const MULTIPLIER = { Member: 1, Silver: 1.25, Gold: 1.5, Platinum: 2 };
const CREDITS = { Starter: 10, Plus: 20, Max: 40 };
const TIERS = [['Platinum', 500], ['Gold', 250], ['Silver', 100], ['Member', 0]];
const dayNo = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);

class LoyaltyAccount {
  #events = [];
  constructor(memberId) {
    this.memberId = memberId;
    this.tier = 'Member';
    this.credits = 0;
    this.batches = []; // { points, expiresDay }
    this.processed = new Set();
  }
  onFlightFlown(e) {
    // TODO: idempotency, member check, points (tier BEFORE), credits, batch, events, upgrade
    return false;
  }
  availablePoints(now) {
    // TODO
    return 0;
  }
  expire(now) {
    // TODO
    return 0;
  }
  redeem(points, now) {
    // TODO
  }
  pullEvents() {
    const out = this.#events;
    this.#events = [];
    return out;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, Type = DomainError) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof Type ? '✅' : '❌', name, '(' + e.name + ': ' + e.message + ')');
  }
}
const flown = (eventId, fareAud, fareFamily, flownAt, memberId = 'M-1001') =>
  ({ eventId, memberId, fareAud, fareFamily, flownAt });

const acc = new LoyaltyAccount('M-1001');
check('first flight applied', acc.onFlightFlown(flown('ff-1', 200, 'Plus', '2026-01-10')), true);
check('200 points at Member x1', acc.availablePoints('2026-01-11'), 200);
check('duplicate ff-1 ignored', acc.onFlightFlown(flown('ff-1', 200, 'Plus', '2026-01-10')), false);
check('…balance unchanged', acc.availablePoints('2026-01-11'), 200);
expectThrows('other member rejected', () => acc.onFlightFlown(flown('ff-x', 50, 'Starter', '2026-01-12', 'M-9999')));

acc.onFlightFlown(flown('ff-2', 100, 'Max', '2026-02-01'));
acc.onFlightFlown(flown('ff-3', 100, 'Max', '2026-03-01')); // credits 20+40+40 = 100 → Silver
check('upgraded to Silver at 100 credits', [acc.tier, acc.credits], ['Silver', 100]);
acc.onFlightFlown(flown('ff-4', 100, 'Max', '2026-04-01'));
check('Silver multiplier applies to next flight', acc.availablePoints('2026-04-02'), 525);
check('event stream', acc.pullEvents().map((e) => e.type + (e.to ? ':' + e.to : '') + (e.points ? ':' + e.points : '')),
  ['PointsEarned:200', 'PointsEarned:100', 'PointsEarned:100', 'TierUpgraded:Silver', 'PointsEarned:125']);

acc.redeem(250, '2026-06-01'); // takes ff-1 (200) + 50 of ff-2
check('redeem oldest first', acc.batches.map((b) => b.points), [50, 100, 125]);
check('available after redeem', acc.availablePoints('2026-06-01'), 275);
expectThrows('cannot redeem more than available', () => acc.redeem(1000, '2026-06-02'), InsufficientPoints);
check('…and nothing changed', acc.availablePoints('2026-06-02'), 275);

check('ff-2 remainder still valid the day before expiry', acc.availablePoints('2027-01-31'), 275);
check('expire on 2027-02-01 removes 50', acc.expire('2027-02-01'), 50);
check('available after expiry', acc.availablePoints('2027-02-01'), 225);
expectThrows('everything expired by 2027-04-01', () => acc.redeem(10, '2027-04-01'), InsufficientPoints);
check('events after expiry', acc.pullEvents().map((e) => e.type + ':' + e.points),
  ['PointsRedeemed:250', 'PointsExpired:50', 'PointsExpired:225']);`,
      hint: 'onFlightFlown: if (this.processed.has(e.eventId)) return false; points = Math.floor(e.fareAud * MULTIPLIER[this.tier]) BEFORE updating the tier; push { points, expiresDay: dayNo(e.flownAt) + 365 }; then const newTier = TIERS.find(([, min]) => this.credits >= min)[0]. redeem: this.expire(now) first, then loop over batches subtracting Math.min(batch.points, remaining) and drop empty batches.',
      solution: `class DomainError extends Error {
  constructor(m) { super(m); this.name = this.constructor.name; }
}
class InsufficientPoints extends DomainError {}

const MULTIPLIER = { Member: 1, Silver: 1.25, Gold: 1.5, Platinum: 2 };
const CREDITS = { Starter: 10, Plus: 20, Max: 40 };
const TIERS = [['Platinum', 500], ['Gold', 250], ['Silver', 100], ['Member', 0]];
const RANK = { Member: 0, Silver: 1, Gold: 2, Platinum: 3 };
const dayNo = (iso) => Math.floor(Date.parse(iso + 'T00:00:00Z') / 86400000);

class LoyaltyAccount {
  #events = [];
  constructor(memberId) {
    this.memberId = memberId;
    this.tier = 'Member';
    this.credits = 0;
    this.batches = []; // { points, expiresDay }
    this.processed = new Set();
  }
  onFlightFlown(e) {
    if (this.processed.has(e.eventId)) return false;
    if (e.memberId !== this.memberId) {
      throw new DomainError(e.eventId + ' is for ' + e.memberId + ', not ' + this.memberId);
    }
    const points = Math.floor(e.fareAud * MULTIPLIER[this.tier]); // tier BEFORE this flight
    this.batches.push({ points, expiresDay: dayNo(e.flownAt) + 365 });
    this.credits += CREDITS[e.fareFamily];
    this.processed.add(e.eventId);
    this.#events.push({ type: 'PointsEarned', memberId: this.memberId, points, eventId: e.eventId });
    const newTier = TIERS.find(([, min]) => this.credits >= min)[0];
    if (RANK[newTier] > RANK[this.tier]) {
      this.#events.push({ type: 'TierUpgraded', memberId: this.memberId, from: this.tier, to: newTier });
      this.tier = newTier;
    }
    return true;
  }
  availablePoints(now) {
    const today = dayNo(now);
    return this.batches.filter((b) => b.expiresDay > today).reduce((s, b) => s + b.points, 0);
  }
  expire(now) {
    const today = dayNo(now);
    const expired = this.batches.filter((b) => b.expiresDay <= today).reduce((s, b) => s + b.points, 0);
    this.batches = this.batches.filter((b) => b.expiresDay > today);
    if (expired > 0) this.#events.push({ type: 'PointsExpired', memberId: this.memberId, points: expired });
    return expired;
  }
  redeem(points, now) {
    this.expire(now);
    const available = this.availablePoints(now);
    if (points > available) {
      throw new InsufficientPoints('wants ' + points + ', has ' + available);
    }
    let remaining = points;
    for (const b of this.batches) { // batches are in earn order = oldest first
      const take = Math.min(b.points, remaining);
      b.points -= take;
      remaining -= take;
      if (remaining === 0) break;
    }
    this.batches = this.batches.filter((b) => b.points > 0);
    this.#events.push({ type: 'PointsRedeemed', memberId: this.memberId, points });
  }
  pullEvents() {
    const out = this.#events;
    this.#events = [];
    return out;
  }
}

// ── self-check ──
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}
function expectThrows(name, fn, Type = DomainError) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof Type ? '✅' : '❌', name, '(' + e.name + ': ' + e.message + ')');
  }
}
const flown = (eventId, fareAud, fareFamily, flownAt, memberId = 'M-1001') =>
  ({ eventId, memberId, fareAud, fareFamily, flownAt });

const acc = new LoyaltyAccount('M-1001');
check('first flight applied', acc.onFlightFlown(flown('ff-1', 200, 'Plus', '2026-01-10')), true);
check('200 points at Member x1', acc.availablePoints('2026-01-11'), 200);
check('duplicate ff-1 ignored', acc.onFlightFlown(flown('ff-1', 200, 'Plus', '2026-01-10')), false);
check('…balance unchanged', acc.availablePoints('2026-01-11'), 200);
expectThrows('other member rejected', () => acc.onFlightFlown(flown('ff-x', 50, 'Starter', '2026-01-12', 'M-9999')));

acc.onFlightFlown(flown('ff-2', 100, 'Max', '2026-02-01'));
acc.onFlightFlown(flown('ff-3', 100, 'Max', '2026-03-01')); // credits 20+40+40 = 100 → Silver
check('upgraded to Silver at 100 credits', [acc.tier, acc.credits], ['Silver', 100]);
acc.onFlightFlown(flown('ff-4', 100, 'Max', '2026-04-01'));
check('Silver multiplier applies to next flight', acc.availablePoints('2026-04-02'), 525);
check('event stream', acc.pullEvents().map((e) => e.type + (e.to ? ':' + e.to : '') + (e.points ? ':' + e.points : '')),
  ['PointsEarned:200', 'PointsEarned:100', 'PointsEarned:100', 'TierUpgraded:Silver', 'PointsEarned:125']);

acc.redeem(250, '2026-06-01'); // takes ff-1 (200) + 50 of ff-2
check('redeem oldest first', acc.batches.map((b) => b.points), [50, 100, 125]);
check('available after redeem', acc.availablePoints('2026-06-01'), 275);
expectThrows('cannot redeem more than available', () => acc.redeem(1000, '2026-06-02'), InsufficientPoints);
check('…and nothing changed', acc.availablePoints('2026-06-02'), 275);

check('ff-2 remainder still valid the day before expiry', acc.availablePoints('2027-01-31'), 275);
check('expire on 2027-02-01 removes 50', acc.expire('2027-02-01'), 50);
check('available after expiry', acc.availablePoints('2027-02-01'), 225);
expectThrows('everything expired by 2027-04-01', () => acc.redeem(10, '2027-04-01'), InsufficientPoints);
check('events after expiry', acc.pullEvents().map((e) => e.type + ':' + e.points),
  ['PointsRedeemed:250', 'PointsExpired:50', 'PointsExpired:225']);`,
    },
  },
);
