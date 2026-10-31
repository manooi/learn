window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── domain-events
  {
    id: 'domain-events',
    section: 'Domain Events & Consistency',
    title: 'Domain Events',
    explain: `
      <p>A <strong>domain event</strong> is a record of something that happened in the domain
      that domain experts care about: <code>BookingConfirmed</code>, <code>FlightCancelled</code>,
      <code>SeatChanged</code>, <code>PaymentCaptured</code>. You'll hear these in Event Storming
      workshops as the orange stickies. They're how one part of the model tells others "this is
      now true" without calling them directly.</p>

      <h3>Rules for good events</h3>
      <ul>
        <li><strong>Past tense, in the ubiquitous language.</strong> <code>FlightCancelled</code>,
        not <code>CancelFlight</code> (that's a command) and not <code>FlightStatusUpdated</code>
        (says nothing: updated to what, why?). If an ops controller would not say the sentence
        "the flight was cancelled", rename it.</li>
        <li><strong>Facts are immutable.</strong> You can't un-happen an event. A mistake is fixed
        by a <em>new</em> event (<code>BookingReinstated</code>), never by editing the old one.</li>
        <li><strong>Carry what consumers need to react</strong>: ids, the relevant new values,
        <code>occurredAt</code>. Not the whole aggregate.</li>
        <li><strong>Only real changes produce events.</strong> A rejected command records nothing.
        A no-op (cancelling an already-cancelled flight) records nothing.</li>
      </ul>

      <h3>Record inside, dispatch after save</h3>
      <p>The aggregate <em>records</em> events in a private list as part of a state change. The
      application service saves the aggregate and only then <em>dispatches</em> the events. If you
      publish first and the save fails, other contexts react to something that never happened
      (an email for a booking that isn't confirmed).</p>
      <pre><code>const booking = repo.get(pnr);
booking.confirm(paymentRef, now);          // ① records BookingConfirmed internally
repo.save(booking);                        // ② state is durable
for (const e of booking.pullEvents()) bus.publish(e);  // ③ now tell the world</code></pre>
      <p>Handlers decouple the core flow from side effects: the Booking context doesn't know that
      Notifications sends an email or that Loyalty adds points. New reactions = new subscribers,
      no change to <code>Booking</code>.</p>

      <div class="warn">There is still a gap between ② and ③: if the process crashes right after
      saving, the events are lost. Within one process that is often acceptable for things like
      cache invalidation; for anything that crosses a service boundary use the
      <strong>transactional outbox</strong> (lesson after next).</div>

      <div class="tip"><strong>In the real world:</strong> start with an in-process bus like this
      one (handlers run in the same process, maybe the same transaction). Many frameworks ship one:
      MediatR notifications in .NET, Spring's <code>ApplicationEventPublisher</code>, NestJS CQRS
      <code>EventBus</code>. Move to a broker (Kafka, RabbitMQ, SNS/SQS) when consumers live in other
      services. Event names are part of your ubiquitous language: review them with domain experts
      the same way you review class names.</div>
    `,
    examples: [
      {
        title: 'Booking records events; app service saves, then dispatches',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- Building blocks ----------
class AggregateRoot {
  #pending = [];

  record(type, data) {
    this.#pending.push(Object.freeze({ type, ...data })); // events are immutable facts
  }

  pullEvents() {
    const events = this.#pending;
    this.#pending = [];
    return events;
  }
}

class EventBus {
  #handlers = new Map();

  subscribe(type, handler) {
    if (!this.#handlers.has(type)) this.#handlers.set(type, []);
    this.#handlers.get(type).push(handler);
  }

  publish(event) {
    for (const handler of this.#handlers.get(event.type) ?? []) handler(event);
  }
}

// ---------- Booking context ----------
class Booking extends AggregateRoot {
  constructor(pnr, email) {
    super();
    this.pnr = pnr;
    this.email = email;
    this.status = 'HELD';
  }

  confirm(paymentRef, at) {
    if (this.status !== 'HELD') throw new DomainError(this.pnr + ' is already ' + this.status);
    this.status = 'CONFIRMED';
    this.record('BookingConfirmed', { pnr: this.pnr, paymentRef, occurredAt: at });
  }

  cancel(reason, at) {
    if (this.status === 'CANCELLED') throw new DomainError(this.pnr + ' is already cancelled');
    this.status = 'CANCELLED';
    this.record('BookingCancelled', { pnr: this.pnr, reason, occurredAt: at });
  }
}

class BookingRepository {
  #rows = new Map(); // pnr -> plain stored data
  failNextSave = false; // simulate the DB being down

  get(pnr) {
    const row = this.#rows.get(pnr);
    return Object.assign(new Booking(row.pnr, row.email), row); // fresh object per load
  }

  save(booking) {
    if (this.failNextSave) {
      this.failNextSave = false;
      throw new Error('DB timeout');
    }
    const { pnr, email, status } = booking;
    this.#rows.set(pnr, { pnr, email, status });
  }
}

// ---------- Application service: save FIRST, then dispatch ----------
function runUseCase(label, repo, bus, pnr, action) {
  const booking = repo.get(pnr);
  try {
    action(booking);
    repo.save(booking);
  } catch (e) {
    booking.pullEvents(); // discard: what didn't get saved didn't happen
    console.log('[' + label + '] failed:', e.message, '-> no events published');
    return;
  }
  for (const event of booking.pullEvents()) bus.publish(event);
}

// ---------- Wiring: other parts of the system react ----------
const bus = new EventBus();
bus.subscribe('BookingConfirmed', (e) => console.log('  Notifications: email "Your trip ' + e.pnr + ' is confirmed"'));
bus.subscribe('BookingConfirmed', (e) => console.log('  Loyalty: accrue points for', e.pnr, '(payment ' + e.paymentRef + ')'));
bus.subscribe('BookingCancelled', (e) => console.log('  Inventory: release seats of', e.pnr, '- reason:', e.reason));

const repo = new BookingRepository();
repo.save(new Booking('SKY001', 'ana@example.com'));
repo.save(new Booking('SKY002', 'ben@example.com'));
const at = '2026-11-01T08:00:00Z';

console.log('1. confirm SKY001');
runUseCase('confirm', repo, bus, 'SKY001', (b) => b.confirm('PAY-881', at));

console.log('2. confirm SKY001 again');
runUseCase('confirm', repo, bus, 'SKY001', (b) => b.confirm('PAY-882', at));

console.log('3. confirm SKY002 while the DB is down');
repo.failNextSave = true;
runUseCase('confirm', repo, bus, 'SKY002', (b) => b.confirm('PAY-883', at));

console.log('4. cancel SKY001');
runUseCase('cancel', repo, bus, 'SKY001', (b) => b.cancel('customer request', at));

console.log('stored statuses:', repo.get('SKY001').status, repo.get('SKY002').status);`,
        explain: `
          <details>
            <summary>Step by step: the four use cases</summary>
            <table>
              <tr><th>#</th><th>Aggregate</th><th>Save</th><th>Events dispatched</th><th>Console</th></tr>
              <tr><td>1</td><td>HELD → CONFIRMED, records <code>BookingConfirmed</code></td><td>ok</td><td>1 event → 2 handlers</td><td><code>Notifications: email "Your trip SKY001 is confirmed"</code><br><code>Loyalty: accrue points for SKY001 (payment PAY-881)</code></td></tr>
              <tr><td>2</td><td><code>confirm</code> throws (already CONFIRMED), nothing recorded</td><td>skipped</td><td>none</td><td><code>[confirm] failed: SKY001 is already CONFIRMED -&gt; no events published</code></td></tr>
              <tr><td>3</td><td>SKY002 confirmed <em>in memory</em>, event recorded</td><td><strong>throws</strong></td><td>none: events discarded</td><td><code>[confirm] failed: DB timeout -&gt; no events published</code></td></tr>
              <tr><td>4</td><td>CONFIRMED → CANCELLED</td><td>ok</td><td><code>BookingCancelled</code> → Inventory</td><td><code>Inventory: release seats of SKY001 - reason: customer request</code></td></tr>
            </table>
            <p>Last line: <code>stored statuses: CANCELLED HELD</code>. SKY002 is still HELD in storage,
            and correctly, nobody was told it was confirmed.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>this.#pending.push(Object.freeze({ type, ...data }));  // ① frozen fact
this.status = 'CONFIRMED';
this.record('BookingConfirmed', { ... });             // ② same method as the state change
repo.save(booking);                                   // ③ save first...
for (const event of booking.pullEvents()) bus.publish(event);  // ④ ...then publish
booking.pullEvents(); // discard                       // ⑤ failure path</code></pre>
            <ol>
              <li><strong>①</strong> Events are frozen: a handler can't change what happened for the handlers after it.</li>
              <li><strong>②</strong> The event is recorded in the same method that changes state, so the two can't get out of sync. Any code path that confirms a booking produces the event.</li>
              <li><strong>③④</strong> Order matters. Publishing before saving would have sent the "confirmed" email in case 3.</li>
              <li><strong>⑤</strong> <code>pullEvents</code> also clears the list, so a failed attempt can't leak stale events into a later retry.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Swap ③ and ④ in <code>runUseCase</code> (publish, then save). Case 3 now prints the email and points lines, then fails. The customer gets a confirmation for a booking stored as HELD.</li>
              <li>Add a subscriber: <code>bus.subscribe('BookingCancelled', (e) =&gt; console.log('  Loyalty: reverse points for', e.pnr))</code>. Nothing in <code>Booking</code> changes: that's the decoupling.</li>
              <li>Rename <code>BookingCancelled</code> to <code>BookingUpdated</code> with <code>{ status: 'CANCELLED' }</code>. Notice every subscriber now has to inspect the payload to know what happened: a sign the event name is too generic.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Which is the best name for the event raised when SkyHop ops cancels a flight because of a storm?',
        options: ['<code>CancelFlight</code>', '<code>FlightUpdated</code>', '<code>FlightCancelled</code> with a <code>reason</code>', '<code>FlightStatusChangedToC</code>'],
        answer: 2,
        why: 'Past tense, domain language, specific. CancelFlight is a command; FlightUpdated hides the meaning in the payload.',
      },
      {
        q: 'An application service publishes <code>BookingConfirmed</code>, then calls <code>repo.save()</code>, which fails on a unique-constraint error. What happens?',
        options: [
          'Nothing, the save error rolls the event back',
          'The event bus retries the save',
          'The aggregate is automatically reverted',
          'Other contexts act on a confirmation that was never stored: emails, points, tickets for a non-existent state',
        ],
        answer: 3,
        why: 'Dispatch after the state is durable. Events describe facts; publishing before the fact exists produces ghosts.',
      },
      {
        q: 'Ops double-clicks "Cancel flight" and <code>cancel()</code> is called twice. What should the second call record?',
        options: [
          'Nothing: the flight was already cancelled, no new fact happened (or reject the command)',
          'A second FlightCancelled event',
          'FlightUncancelled',
          'A FlightCancelledTwice event',
        ],
        answer: 0,
        why: 'Events are facts about changes. Re-applying the same state is a no-op (or a rejected command) and must not tell the world it happened again.',
      },
      {
        q: 'Loyalty wants to start awarding points for confirmed bookings. With domain events in place, what changes in the Booking aggregate?',
        options: [
          'Add a call to <code>LoyaltyService.accrue()</code> inside <code>confirm()</code>',
          'Booking must store the loyalty balance',
          'Nothing: Loyalty subscribes to <code>BookingConfirmed</code>',
          'Booking must wait for Loyalty to respond',
        ],
        answer: 2,
        why: 'Events invert the dependency: the publisher doesn\'t know its subscribers. New reactions don\'t touch the core model.',
      },
    ],
    exercise: {
      task: `<p>SkyHop's Flight Scheduling context needs events. Make <code>Flight</code> record:</p>
      <ul>
        <li><code>FlightDelayed { flightId, minutes, totalDelay }</code> on every <code>delay(minutes)</code>.
        Reject <code>minutes &lt;= 0</code> and delaying a cancelled flight with a <code>DomainError</code>.</li>
        <li><code>FlightCancelled { flightId, reason }</code> on <code>cancel(reason)</code>, but only the
        first time: cancelling an already-cancelled flight is a silent no-op with no event.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class AggregateRoot {
  #pending = [];

  record(type, data) {
    this.#pending.push(Object.freeze({ type, ...data }));
  }

  pullEvents() {
    const events = this.#pending;
    this.#pending = [];
    return events;
  }
}

class Flight extends AggregateRoot {
  constructor(id) {
    super();
    this.id = id;
    this.status = 'SCHEDULED';
    this.delayMinutes = 0;
  }

  delay(minutes) {
    // TODO: reject if cancelled or minutes <= 0, then record FlightDelayed
    this.delayMinutes += minutes;
  }

  cancel(reason) {
    // TODO: record FlightCancelled, but only the first time
    this.status = 'CANCELLED';
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌ ' + name + ' (no error thrown)');
  } catch (e) {
    const ok = e instanceof DomainError;
    console.log((ok ? '✅ ' : '❌ ') + name + ' -> ' + e.name + ': ' + e.message);
  }
}

const flight = new Flight('SH101-2026-11-01');
flight.delay(40);
flight.delay(30);
check('two delays -> two events', flight.pullEvents(), [
  { type: 'FlightDelayed', flightId: 'SH101-2026-11-01', minutes: 40, totalDelay: 40 },
  { type: 'FlightDelayed', flightId: 'SH101-2026-11-01', minutes: 30, totalDelay: 70 },
]);
check('pullEvents empties the list', flight.pullEvents().length, 0);

expectThrows('delay of 0 minutes', () => flight.delay(0));
flight.cancel('crew shortage');
flight.cancel('crew shortage'); // e.g. double click in the ops tool
check('cancel twice -> one event', flight.pullEvents(), [
  { type: 'FlightCancelled', flightId: 'SH101-2026-11-01', reason: 'crew shortage' },
]);
expectThrows('cannot delay a cancelled flight', () => flight.delay(10));
check('rejected command records nothing', flight.pullEvents().length, 0);`,
      hint: 'Use <code>this.record(\'FlightDelayed\', { flightId: this.id, minutes, totalDelay: this.delayMinutes })</code> after updating the total. In <code>cancel</code>, <code>if (this.status === \'CANCELLED\') return;</code> first.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class AggregateRoot {
  #pending = [];

  record(type, data) {
    this.#pending.push(Object.freeze({ type, ...data }));
  }

  pullEvents() {
    const events = this.#pending;
    this.#pending = [];
    return events;
  }
}

class Flight extends AggregateRoot {
  constructor(id) {
    super();
    this.id = id;
    this.status = 'SCHEDULED';
    this.delayMinutes = 0;
  }

  delay(minutes) {
    if (this.status === 'CANCELLED') throw new DomainError(this.id + ' is cancelled');
    if (minutes <= 0) throw new DomainError('Delay must be positive');
    this.delayMinutes += minutes;
    this.record('FlightDelayed', { flightId: this.id, minutes, totalDelay: this.delayMinutes });
  }

  cancel(reason) {
    if (this.status === 'CANCELLED') return; // already true: no new fact, no event
    this.status = 'CANCELLED';
    this.record('FlightCancelled', { flightId: this.id, reason });
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌ ' + name + ' (no error thrown)');
  } catch (e) {
    const ok = e instanceof DomainError;
    console.log((ok ? '✅ ' : '❌ ') + name + ' -> ' + e.name + ': ' + e.message);
  }
}

const flight = new Flight('SH101-2026-11-01');
flight.delay(40);
flight.delay(30);
check('two delays -> two events', flight.pullEvents(), [
  { type: 'FlightDelayed', flightId: 'SH101-2026-11-01', minutes: 40, totalDelay: 40 },
  { type: 'FlightDelayed', flightId: 'SH101-2026-11-01', minutes: 30, totalDelay: 70 },
]);
check('pullEvents empties the list', flight.pullEvents().length, 0);

expectThrows('delay of 0 minutes', () => flight.delay(0));
flight.cancel('crew shortage');
flight.cancel('crew shortage'); // e.g. double click in the ops tool
check('cancel twice -> one event', flight.pullEvents(), [
  { type: 'FlightCancelled', flightId: 'SH101-2026-11-01', reason: 'crew shortage' },
]);
expectThrows('cannot delay a cancelled flight', () => flight.delay(10));
check('rejected command records nothing', flight.pullEvents().length, 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── eventual-consistency
  {
    id: 'eventual-consistency',
    section: 'Domain Events & Consistency',
    title: 'Consistency Across Aggregates',
    explain: `
      <p>Inside one aggregate, changes are <strong>immediately consistent</strong>: one transaction,
      invariants true at commit. Between aggregates (and between bounded contexts) we use
      <strong>eventual consistency</strong>: aggregate A commits and publishes an event, and
      aggregate B updates in its <em>own</em> transaction a moment later. For a while, the system
      as a whole is "behind".</p>

      <h3>The SkyHop example</h3>
      <p>A customer pays for SKY001. The Booking context confirms the booking (tx 1) and publishes
      <code>BookingConfirmed</code>. The Loyalty context, a different team with its own database,
      credits 1,250 points (tx 2). Between the two, the booking is confirmed but the points don't
      exist yet. If Loyalty's database is down, that window may last minutes.</p>

      <h3>Why accept it?</h3>
      <ul>
        <li><strong>Availability</strong>: the booking succeeds even when Loyalty is down. With one
        big transaction across both, a Loyalty outage would stop SkyHop selling tickets.</li>
        <li><strong>Autonomy</strong>: each context owns its data and deploys independently.</li>
        <li><strong>The business already works this way.</strong> Ask: "how quickly must points
        appear?" The answer is almost never "in the same millisecond". Airline loyalty programs
        commonly say miles post days after the flight.</li>
      </ul>

      <h3>Design the gap, don't hide it</h3>
      <ul>
        <li><strong>UX</strong>: show "+1,250 points pending, will appear within 24h" instead of a
        wrong balance. Read your own writes: the screen can use the booking's own data for the
        pending number.</li>
        <li><strong>Retries</strong>: delivery must retry until it succeeds (and handlers must be
        idempotent, see the last lesson).</li>
        <li><strong>Monitoring</strong>: alert when the gap grows (queue lag, oldest unprocessed event).</li>
        <li><strong>The "within" is a business SLA</strong>: write it down ("points within 24h"),
        then measure it.</li>
      </ul>

      <div class="warn">If the business says "these two things must <em>never</em> disagree,
      not even for a second", that's a signal they belong in the same aggregate, not a reason to
      build a distributed transaction (two-phase commit). 2PC across services is fragile and
      blocks everyone when one participant is slow.</div>

      <div class="tip"><strong>In the real world:</strong> eventual consistency is the default
      for most large systems. A bank statement shows "pending" card transactions; an online
      shop's order page says "processing". The engineering is easy compared to the
      conversations: agree with the product owner on what users see during the gap, and how long
      the gap may be before someone gets paged.</div>
    `,
    examples: [
      {
        title: 'Booking confirmed now, loyalty points later (simulated clock)',
        code: `// Toggle: does the Loyalty database fail on the first delivery attempt?
const LOYALTY_DOWN_ON_FIRST_TRY = true;

// ---------- A tiny simulated clock (deterministic, runs instantly) ----------
class Simulation {
  #now = 0;
  #seq = 0;
  #tasks = [];

  get now() {
    return this.#now;
  }

  at(delayMs, task) {
    this.#tasks.push({ time: this.#now + delayMs, seq: this.#seq++, task });
  }

  async run() {
    while (this.#tasks.length > 0) {
      this.#tasks.sort((a, b) => a.time - b.time || a.seq - b.seq);
      const next = this.#tasks.shift();
      this.#now = next.time;
      await next.task();
    }
  }
}

const sim = new Simulation();
const log = (...args) => console.log('t=' + String(sim.now).padStart(3) + 'ms', ...args);

// ---------- Broker: async delivery with retry ----------
const BROKER_LATENCY = 250;
const RETRY_AFTER = 500;
const subscribers = [];

function publish(event) {
  for (const handler of subscribers) deliver(handler, event, 1, BROKER_LATENCY);
}

function deliver(handler, event, attempt, delay) {
  sim.at(delay, async () => {
    try {
      await handler(event, attempt);
    } catch (e) {
      log('broker: delivery #' + attempt + ' failed (' + e.message + '), retry in ' + RETRY_AFTER + 'ms');
      deliver(handler, event, attempt + 1, RETRY_AFTER);
    }
  });
}

// ---------- Booking context (its own data) ----------
const bookings = new Map();

function confirmBooking(pnr, fareMinor) {
  bookings.set(pnr, { pnr, status: 'CONFIRMED', expectedPoints: (fareMinor / 100) * 5 });
  log('booking: ' + pnr + ' CONFIRMED and saved (tx 1)');
  publish({ type: 'BookingConfirmed', pnr, memberId: 'M-42', fareMinor });
}

// ---------- Loyalty context (separate data, separate transaction) ----------
const loyalty = { 'M-42': { balance: 0, creditedFor: [] } };

subscribers.push(async (event, attempt) => {
  if (event.type !== 'BookingConfirmed') return;
  if (LOYALTY_DOWN_ON_FIRST_TRY && attempt === 1) throw new Error('loyalty DB unavailable');
  const account = loyalty[event.memberId];
  const points = (event.fareMinor / 100) * 5;
  account.balance += points;
  account.creditedFor.push(event.pnr);
  log('loyalty: +' + points + ' points for ' + event.pnr + ' (tx 2), balance ' + account.balance);
});

// ---------- The customer's "My trips" screen reads both ----------
function showScreen(pnr) {
  const booking = bookings.get(pnr);
  const account = loyalty['M-42'];
  const credited = account.creditedFor.includes(pnr);
  const pointsText = credited
    ? account.balance + ' points'
    : account.balance + ' points (+' + booking.expectedPoints + ' pending, will appear within 24h)';
  log('screen: ' + pnr + ' ' + booking.status + ' | ' + pointsText);
}

// ---------- The timeline ----------
sim.at(0, () => confirmBooking('SKY001', 25000)); // 250.00 AUD fare
sim.at(0, () => showScreen('SKY001'));
sim.at(100, () => showScreen('SKY001'));
sim.at(400, () => showScreen('SKY001'));
sim.at(800, () => showScreen('SKY001'));

await sim.run();`,
        explain: `
          <details>
            <summary>The problem: two contexts, two transactions</summary>
            <p>The tempting design is one transaction: <code>UPDATE bookings ...; UPDATE loyalty_accounts ...; COMMIT</code>.
            It only works if both live in one database owned by one team, and it makes the booking
            depend on Loyalty being up. Here Loyalty is a separate context, so the booking commits
            alone and Loyalty catches up through the broker. The question is no longer "how do we
            avoid the gap?" but "what does the customer see during it?".</p>
            <p>The demo uses a <strong>simulated clock</strong> (<code>Simulation.at(ms, task)</code>) so the timeline is
            deterministic and runs instantly. A real broker would be seconds, not milliseconds.</p>
          </details>
          <details>
            <summary>Step by step: the timeline (with <code>LOYALTY_DOWN_ON_FIRST_TRY = true</code>)</summary>
            <table>
              <tr><th>t</th><th>Booking DB</th><th>Loyalty DB</th><th>Screen shows</th><th>Console</th></tr>
              <tr><td>0ms</td><td>SKY001 CONFIRMED</td><td>balance 0</td><td></td><td><code>booking: SKY001 CONFIRMED and saved (tx 1)</code></td></tr>
              <tr><td>0ms</td><td></td><td></td><td>confirmed, 0 + 1250 pending</td><td><code>screen: SKY001 CONFIRMED | 0 points (+1250 pending, will appear within 24h)</code></td></tr>
              <tr><td>100ms</td><td></td><td></td><td>same</td><td>same line at <code>t=100ms</code></td></tr>
              <tr><td>250ms</td><td></td><td>handler throws</td><td></td><td><code>broker: delivery #1 failed (loyalty DB unavailable), retry in 500ms</code></td></tr>
              <tr><td>400ms</td><td></td><td>still 0</td><td>still pending</td><td>same screen line at <code>t=400ms</code></td></tr>
              <tr><td>750ms</td><td></td><td><strong>balance 1250</strong></td><td></td><td><code>loyalty: +1250 points for SKY001 (tx 2), balance 1250</code></td></tr>
              <tr><td>800ms</td><td></td><td></td><td>1250 points ✅</td><td><code>screen: SKY001 CONFIRMED | 1250 points</code></td></tr>
            </table>
            <p>From 0 to 750ms the system is <em>inconsistent</em>: booking confirmed, points missing.
            Nothing is broken, because the screen tells the truth ("pending") and the broker keeps retrying.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>bookings.set(pnr, { ..., expectedPoints: (fareMinor / 100) * 5 }); // ① booking knows what to expect
publish({ type: 'BookingConfirmed', pnr, memberId: 'M-42', fareMinor }); // ② fire and move on
deliver(handler, event, attempt + 1, RETRY_AFTER);                   // ③ retry on failure
const credited = account.creditedFor.includes(pnr);                  // ④ screen checks both sides</code></pre>
            <ol>
              <li><strong>①</strong> The Booking side stores enough to describe the pending state without asking Loyalty.</li>
              <li><strong>②</strong> <code>confirmBooking</code> returns immediately: the customer's checkout never waits for Loyalty.</li>
              <li><strong>③</strong> The broker retries. Without this, a single failure makes the gap permanent (the points never arrive).</li>
              <li><strong>④</strong> The screen compares "what should be there" with "what is there" and words the gap honestly.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>LOYALTY_DOWN_ON_FIRST_TRY = false</code>: points arrive at <code>t=250ms</code>, and the <code>t=400ms</code> screen already shows <code>1250 points</code>. The gap shrinks but never disappears (0–250ms).</li>
              <li>Change the failing condition to <code>attempt &lt;= 3</code>: three failures, credited at <code>t=1750ms</code>, so the 800ms screen still says pending. Real systems cap retries and move the message to a <em>dead-letter queue</em> for a human to inspect.</li>
              <li>Remove the <code>pending</code> text from <code>showScreen</code> so it just shows the balance. The customer sees "0 points" right after paying 250 AUD and calls support. Same data, worse UX.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Right after booking, customers see "0 points" and call support. Points arrive ~2 minutes later. What\'s the best fix?',
        options: [
          'Put the loyalty account inside the Booking aggregate',
          'Use a distributed transaction across Booking and Loyalty',
          'Show the pending state ("+1,250 points pending, will appear within 24h") using data the booking side already has',
          'Make the booking wait until Loyalty confirms',
        ],
        answer: 2,
        why: 'The gap is fine for the business; the UX was not. Design the in-between state explicitly instead of coupling the contexts.',
      },
      {
        q: 'Loyalty\'s database is down for 10 minutes. With eventual consistency via a broker with retries, what happens to bookings?',
        options: [
          'Bookings keep succeeding; points are credited when Loyalty recovers and the retries succeed',
          'Bookings fail for 10 minutes',
          'Points are lost',
          'Bookings are confirmed twice',
        ],
        answer: 0,
        why: 'That availability is the main reason to accept eventual consistency between contexts.',
      },
      {
        q: 'The finance team insists that a payment and its ledger entry must never disagree, not even briefly. What does that suggest?',
        options: [
          'Use eventual consistency with faster retries',
          'Use two-phase commit across microservices',
          'Ignore the requirement',
          'They may belong in the same aggregate / transaction boundary within one context',
        ],
        answer: 3,
        why: 'A true "never disagree" rule is an invariant, which belongs inside one consistency boundary. Eventual consistency is for rules that tolerate a delay.',
      },
    ],
    exercise: {
      task: `<p>Build the read model behind the "My points" widget. It consumes events from
      <strong>two</strong> contexts, which can arrive in any order:</p>
      <ul>
        <li><code>BookingConfirmed { memberId, pnr, expectedPoints }</code> → points are pending for that PNR.</li>
        <li><code>PointsAccrued { memberId, pnr, points }</code> → move them to the balance.</li>
        <li><code>BookingCancelled { memberId, pnr }</code> → drop any pending points for it.</li>
      </ul>
      <p><code>view(memberId)</code> returns <code>{ balance, pending, message }</code> where message is
      <code>'+N points will appear within 24h'</code> when something is pending, else <code>''</code>.
      If <code>PointsAccrued</code> arrives first, a later <code>BookingConfirmed</code> for the same PNR must not make it pending again.</p>`,
      starter: `// Read model for the "My points" widget. It listens to events from TWO contexts:
//   Booking: BookingConfirmed { memberId, pnr, expectedPoints }, BookingCancelled { memberId, pnr }
//   Loyalty: PointsAccrued { memberId, pnr, points }
class PointsSummary {
  #balance = 0;

  on(event) {
    // TODO: track pending points per pnr (from BookingConfirmed),
    // move them to the balance on PointsAccrued, drop them on BookingCancelled.
    // Careful: PointsAccrued may arrive BEFORE BookingConfirmed.
    if (event.type === 'PointsAccrued') this.#balance += event.points;
  }

  view(memberId) {
    return { balance: this.#balance, pending: 0, message: '' };
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const summary = new PointsSummary();
summary.on({ type: 'BookingConfirmed', memberId: 'M-42', pnr: 'SKY001', expectedPoints: 1250 });
check('confirmed, not yet accrued', summary.view('M-42'),
  { balance: 0, pending: 1250, message: '+1250 points will appear within 24h' });

summary.on({ type: 'PointsAccrued', memberId: 'M-42', pnr: 'SKY001', points: 1250 });
check('accrued -> pending moves to balance', summary.view('M-42'), { balance: 1250, pending: 0, message: '' });

summary.on({ type: 'BookingConfirmed', memberId: 'M-42', pnr: 'SKY002', expectedPoints: 400 });
summary.on({ type: 'BookingCancelled', memberId: 'M-42', pnr: 'SKY002' });
check('cancelled before accrual -> no pending', summary.view('M-42'), { balance: 1250, pending: 0, message: '' });

// Different contexts, different queues: Loyalty's event can overtake Booking's
summary.on({ type: 'PointsAccrued', memberId: 'M-7', pnr: 'SKY003', points: 300 });
summary.on({ type: 'BookingConfirmed', memberId: 'M-7', pnr: 'SKY003', expectedPoints: 300 });
check('accrued arrives first -> not pending again', summary.view('M-7'), { balance: 300, pending: 0, message: '' });
check('members are separate', summary.view('M-42').balance, 1250);`,
      hint: 'Per member keep <code>{ balance, pending: Map(pnr → points), credited: Set(pnr) }</code>. On BookingConfirmed only add to pending if the PNR is not in <code>credited</code>.',
      solution: `// Read model for the "My points" widget. It listens to events from TWO contexts:
//   Booking: BookingConfirmed { memberId, pnr, expectedPoints }, BookingCancelled { memberId, pnr }
//   Loyalty: PointsAccrued { memberId, pnr, points }
class PointsSummary {
  #members = new Map();

  #member(id) {
    if (!this.#members.has(id)) {
      this.#members.set(id, { balance: 0, pending: new Map(), credited: new Set() });
    }
    return this.#members.get(id);
  }

  on(event) {
    const m = this.#member(event.memberId);
    if (event.type === 'BookingConfirmed') {
      if (!m.credited.has(event.pnr)) m.pending.set(event.pnr, event.expectedPoints);
    } else if (event.type === 'PointsAccrued') {
      m.pending.delete(event.pnr);
      m.credited.add(event.pnr);
      m.balance += event.points;
    } else if (event.type === 'BookingCancelled') {
      m.pending.delete(event.pnr);
    }
  }

  view(memberId) {
    const m = this.#member(memberId);
    const pending = [...m.pending.values()].reduce((sum, p) => sum + p, 0);
    const message = pending > 0 ? '+' + pending + ' points will appear within 24h' : '';
    return { balance: m.balance, pending, message };
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const summary = new PointsSummary();
summary.on({ type: 'BookingConfirmed', memberId: 'M-42', pnr: 'SKY001', expectedPoints: 1250 });
check('confirmed, not yet accrued', summary.view('M-42'),
  { balance: 0, pending: 1250, message: '+1250 points will appear within 24h' });

summary.on({ type: 'PointsAccrued', memberId: 'M-42', pnr: 'SKY001', points: 1250 });
check('accrued -> pending moves to balance', summary.view('M-42'), { balance: 1250, pending: 0, message: '' });

summary.on({ type: 'BookingConfirmed', memberId: 'M-42', pnr: 'SKY002', expectedPoints: 400 });
summary.on({ type: 'BookingCancelled', memberId: 'M-42', pnr: 'SKY002' });
check('cancelled before accrual -> no pending', summary.view('M-42'), { balance: 1250, pending: 0, message: '' });

// Different contexts, different queues: Loyalty's event can overtake Booking's
summary.on({ type: 'PointsAccrued', memberId: 'M-7', pnr: 'SKY003', points: 300 });
summary.on({ type: 'BookingConfirmed', memberId: 'M-7', pnr: 'SKY003', expectedPoints: 300 });
check('accrued arrives first -> not pending again', summary.view('M-7'), { balance: 300, pending: 0, message: '' });
check('members are separate', summary.view('M-42').balance, 1250);`,
    },
  },

  // ───────────────────────────────────────────────────────────── outbox
  {
    id: 'outbox',
    section: 'Domain Events & Consistency',
    title: 'The Transactional Outbox',
    explain: `
      <p>Eventual consistency only works if "eventually" actually happens. The most common way it
      silently breaks is the <strong>dual write</strong>: the application writes to its database
      and then, separately, publishes to a message broker (Kafka, RabbitMQ, SNS).</p>
      <pre><code>await db.save(booking);                  // write #1 succeeds
// 💥 process OOM-killed / deploy restarts the pod / network blip
await broker.publish(bookingConfirmed);  // write #2 never happens</code></pre>
      <p>The booking is CONFIRMED in the database, but the event exists nowhere. No retry will
      fix it, because nothing remembers the event should exist. Ticketing never issues the ticket;
      Loyalty never credits points. Swapping the order (publish first) just flips the bug: an
      event for a booking that was never saved.</p>

      <h3>The pattern</h3>
      <ol>
        <li>In the <strong>same local transaction</strong> as the aggregate change, insert the
        event into an <code>outbox</code> table in the same database. Both rows commit, or neither does.</li>
        <li>A separate <strong>relay</strong> (a polling job, or change-data-capture like Debezium
        reading the DB log) reads unsent outbox rows, publishes them, and marks them sent.</li>
      </ol>
      <pre><code>BEGIN;
  UPDATE bookings SET status = 'CONFIRMED', version = version + 1 WHERE pnr = 'SKY002' AND version = 3;
  INSERT INTO outbox (id, type, payload) VALUES ('msg-001', 'BookingConfirmed', '{"pnr":"SKY002"}');
COMMIT;
-- relay, later:  SELECT * FROM outbox WHERE sent_at IS NULL ORDER BY seq;  publish;  UPDATE ... SET sent_at = now()</code></pre>

      <h3>The price: at-least-once</h3>
      <p>The relay can crash <em>after</em> publishing but <em>before</em> marking the row sent.
      On restart it publishes the same message again. The outbox turns "maybe zero times" into
      "<strong>at least once</strong>", so every consumer must be <strong>idempotent</strong>
      (dedupe by message id). That's the last lesson of this section. Exactly-once delivery
      across a network isn't something you get for free. Effectively-once = at-least-once +
      idempotent consumers.</p>

      <div class="warn">Don't "fix" the dual write with a try/catch that retries the publish.
      Retries can't help if the process itself is gone. Only something durable (the outbox row)
      survives a crash.</div>

      <div class="tip"><strong>In the real world:</strong> the outbox is a standard pattern
      (Chris Richardson's microservices.io catalogue lists it as "Transactional outbox"). Debezium
      has a dedicated outbox event router; NServiceBus, MassTransit and Axon have built-in outboxes.
      Operational must-haves: an index on unsent rows, a cleanup job for old sent rows, and an alert on
      "oldest unsent row age". The mirror-image pattern on the consumer side is the
      <em>inbox</em>: store processed message ids in the consumer's DB in the same transaction as the
      effect.</div>
    `,
    examples: [
      {
        title: 'Dual write vs outbox, with crash switches',
        code: `// Toggles: where does the process crash?
const CRASH_AFTER_DB_COMMIT = true; // between "DB saved" and "broker publish"
const RELAY_CRASH_BEFORE_MARK = true; // relay published but died before marking the row sent

class ProcessCrash extends Error {
  constructor(where) {
    super('process killed ' + where);
    this.name = 'ProcessCrash';
  }
}

// ---------- Fake infrastructure ----------
class Database {
  bookings = new Map();
  outbox = []; // { id, type, payload, sentAt }

  // All-or-nothing: work on copies, swap them in only if fn finishes
  transaction(fn) {
    const tx = { bookings: new Map(this.bookings), outbox: [...this.outbox] };
    fn(tx);
    this.bookings = tx.bookings;
    this.outbox = tx.outbox;
  }
}

class Broker {
  delivered = [];

  publish(message) {
    this.delivered.push(message);
  }
}

let msgSeq = 0;
const nextMessageId = () => 'msg-' + String(++msgSeq).padStart(3, '0');

// ---------- ❌ 1. Naive dual write ----------
function confirmNaive(db, broker, pnr) {
  db.transaction((tx) => tx.bookings.set(pnr, 'CONFIRMED')); // write #1: DB
  if (CRASH_AFTER_DB_COMMIT) throw new ProcessCrash('after DB commit');
  broker.publish({ id: nextMessageId(), type: 'BookingConfirmed', pnr }); // write #2: broker
}

// ---------- ✅ 2. Transactional outbox ----------
function confirmWithOutbox(db, pnr) {
  db.transaction((tx) => {
    tx.bookings.set(pnr, 'CONFIRMED');
    tx.outbox.push({ id: nextMessageId(), type: 'BookingConfirmed', payload: { pnr }, sentAt: null });
  }); // ONE local transaction: both rows or neither
  if (CRASH_AFTER_DB_COMMIT) throw new ProcessCrash('after DB commit');
}

// Relay (separate loop/process): read unsent rows -> publish -> mark sent
function relayOnce(db, broker, crashBeforeMark) {
  for (const row of db.outbox.filter((r) => r.sentAt === null)) {
    broker.publish({ id: row.id, type: row.type, ...row.payload });
    if (crashBeforeMark) throw new ProcessCrash('in relay before marking ' + row.id + ' sent');
    row.sentAt = '2026-11-01T08:00:01Z';
  }
}

function run(label, fn) {
  try {
    fn();
  } catch (e) {
    if (!(e instanceof ProcessCrash)) throw e;
    console.log('  💥', e.message);
  }
}

const show = (db, broker) =>
  '  db: ' + JSON.stringify([...db.bookings]) + ' | outbox unsent: ' +
  db.outbox.filter((r) => !r.sentAt).length + ' | broker got: ' + JSON.stringify(broker.delivered.map((m) => m.id));

console.log('A. naive dual write');
const dbA = new Database();
const brokerA = new Broker();
run('naive', () => confirmNaive(dbA, brokerA, 'SKY001'));
console.log(show(dbA, brokerA));
console.log('  -> booking confirmed but the event is LOST. Loyalty, Ticketing never hear about it.');

console.log('B. outbox: app crashes after commit');
const dbB = new Database();
const brokerB = new Broker();
run('outbox', () => confirmWithOutbox(dbB, 'SKY002'));
console.log(show(dbB, brokerB));
console.log('  relay runs after restart:');
run('relay', () => relayOnce(dbB, brokerB, false));
console.log(show(dbB, brokerB));

console.log('C. outbox: relay crashes between publish and mark-sent');
const dbC = new Database();
const brokerC = new Broker();
run('outbox', () => confirmWithOutbox(dbC, 'SKY003'));
run('relay #1', () => relayOnce(dbC, brokerC, RELAY_CRASH_BEFORE_MARK));
console.log(show(dbC, brokerC));
console.log('  relay restarts:');
run('relay #2', () => relayOnce(dbC, brokerC, false));
console.log(show(dbC, brokerC));
console.log('  -> at-least-once: consumers must dedupe by message id');`,
        explain: `
          <details>
            <summary>The problem: two systems, no shared transaction</summary>
            <p>Scenario A (<code>confirmNaive</code>) writes to the DB, then the process dies before
            the broker call:</p>
            <table>
              <tr><th>Step</th><th>DB</th><th>Broker</th><th>Console</th></tr>
              <tr><td>1</td><td>SKY001 CONFIRMED (committed)</td><td>empty</td><td></td></tr>
              <tr><td>2</td><td></td><td></td><td><code>💥 process killed after DB commit</code></td></tr>
              <tr><td>3</td><td>still CONFIRMED</td><td><strong>still empty, forever</strong></td><td><code>db: [["SKY001","CONFIRMED"]] | outbox unsent: 0 | broker got: []</code></td></tr>
            </table>
            <p>There's no record anywhere that a <code>BookingConfirmed</code> should exist. This is a
            <strong>lost event</strong>, and you'll find out from an angry customer at the airport with
            no ticket.</p>
          </details>
          <details>
            <summary>The fix: write the event to the same DB, in the same transaction</summary>
            <pre><code>db.transaction((tx) =&gt; {
  tx.bookings.set(pnr, 'CONFIRMED');           // ① the state change
  tx.outbox.push({ id, type, payload, sentAt: null });  // ② the event, same tx
});
// 💥 crash here: harmless
relayOnce(db, broker);                          // ③ later, separately
  broker.publish(...)                           // ④
  row.sentAt = ...                              // ⑤ mark sent AFTER publishing</code></pre>
            <ol>
              <li><strong>①②</strong> One local ACID transaction, so it's impossible to have the booking without the event or the event without the booking.</li>
              <li><strong>③</strong> The relay runs independently (a loop, a cron, CDC). If the app crashed, the relay still finds the row when it next runs.</li>
              <li><strong>④⑤</strong> Publish, then mark. If it crashes between the two, the row is still unsent and will be published again: a duplicate, never a loss.</li>
            </ol>
            <table>
              <tr><th>Scenario B step</th><th>DB</th><th>Broker</th><th>Console</th></tr>
              <tr><td>commit</td><td>SKY002 + outbox row msg-001</td><td>empty</td><td><code>💥 process killed after DB commit</code></td></tr>
              <tr><td>after crash</td><td>1 unsent row</td><td>empty</td><td><code>db: [["SKY002","CONFIRMED"]] | outbox unsent: 1 | broker got: []</code></td></tr>
              <tr><td>relay runs</td><td>row marked sent</td><td>msg-001</td><td><code>db: [["SKY002","CONFIRMED"]] | outbox unsent: 0 | broker got: ["msg-001"]</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: scenario C, the duplicate</summary>
            <table>
              <tr><th>Step</th><th>Outbox row msg-002</th><th>Broker</th><th>Console</th></tr>
              <tr><td>commit (app crash, harmless)</td><td>unsent</td><td>[]</td><td><code>💥 process killed after DB commit</code></td></tr>
              <tr><td>relay #1 publishes</td><td>unsent</td><td>[msg-002]</td><td></td></tr>
              <tr><td>relay #1 dies before ⑤</td><td><strong>still unsent</strong></td><td>[msg-002]</td><td><code>💥 process killed in relay before marking msg-002 sent</code></td></tr>
              <tr><td>state</td><td></td><td></td><td><code>db: [["SKY003","CONFIRMED"]] | outbox unsent: 1 | broker got: ["msg-002"]</code></td></tr>
              <tr><td>relay #2 publishes again, marks sent</td><td>sent</td><td>[msg-002, <strong>msg-002</strong>]</td><td><code>db: [["SKY003","CONFIRMED"]] | outbox unsent: 0 | broker got: ["msg-002","msg-002"]</code></td></tr>
            </table>
            <p>Same message id twice. The consumer must recognise <code>msg-002</code> and skip the
            second copy, otherwise the customer gets 2× the points.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>CRASH_AFTER_DB_COMMIT = false</code>: scenario A now delivers <code>msg-001</code>, which is why dual-write bugs pass every test and only show up in production during deploys and outages.</li>
              <li>Set <code>RELAY_CRASH_BEFORE_MARK = false</code>: scenario C delivers <code>msg-002</code> exactly once.</li>
              <li>Reorder the loop body in <code>relayOnce</code> to: set <code>row.sentAt</code> → crash check → <code>broker.publish</code> (mark first). Scenario C now ends with <code>unsent: 0 | broker got: []</code>: you traded a duplicate for a lost event. Mark-after-publish is the safe order.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Interactive: watch an event get lost or duplicated',
        lang: 'html',
        editor: false,
        code: `<style>
  .ow { background:#1b1f27; color:#e6e6e6; font:13px/1.4 system-ui, sans-serif; padding:12px; border-radius:8px; }
  .ow h4 { margin:0 0 6px; font-size:14px; }
  .ow .controls { display:flex; flex-wrap:wrap; gap:8px 16px; align-items:center; margin-bottom:10px; }
  .ow label { cursor:pointer; }
  .ow button { background:#2d3442; color:#e6e6e6; border:1px solid #4a5263; border-radius:6px; padding:5px 10px; cursor:pointer; font:inherit; }
  .ow button:hover { background:#3a4356; }
  .ow button:disabled { opacity:.4; cursor:not-allowed; }
  .ow .lanes { display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; }
  .ow .lane { background:#232936; border:1px solid #3a4150; border-radius:6px; padding:8px; min-height:110px; }
  .ow .lane h5 { margin:0 0 6px; font-size:12px; text-transform:uppercase; letter-spacing:.05em; color:#9aa4b5; }
  .ow .row { background:#2b3242; border-radius:4px; padding:3px 6px; margin:3px 0; font-family:ui-monospace, monospace; font-size:12px; }
  .ow .evt { background:#7a4a12; color:#ffe2bf; }
  .ow .sent { opacity:.55; }
  .ow .dup { background:#6b1f2a; color:#ffd3d9; }
  .ow .status { margin-top:10px; padding:8px; border-radius:6px; background:#232936; border-left:4px solid #6b7280; }
  .ow .ok { border-left-color:#22c55e; }
  .ow .bad { border-left-color:#ef4444; }
  .ow .warnc { border-left-color:#f59e0b; }
  .ow .log { margin-top:8px; max-height:90px; overflow:auto; font-family:ui-monospace, monospace; font-size:12px; color:#c8d0dc; }
</style>
<div class="ow">
  <h4>Dual write vs transactional outbox</h4>
  <div class="controls">
    <label><input type="radio" name="mode" value="naive"> Naive dual write</label>
    <label><input type="radio" name="mode" value="outbox" checked> Transactional outbox</label>
    <label><input type="checkbox" id="crashApp"> 💥 app crashes right after DB commit</label>
    <label><input type="checkbox" id="crashRelay"> 💥 relay crashes before marking sent</label>
    <label><input type="checkbox" id="dedupe"> consumer dedupes by message id</label>
  </div>
  <div class="controls">
    <button id="confirm">1. Customer pays: confirm booking</button>
    <button id="relay">2. Run outbox relay</button>
    <button id="reset">Reset</button>
  </div>
  <div class="lanes">
    <div class="lane"><h5>Booking DB: bookings</h5><div id="bookings"></div></div>
    <div class="lane"><h5>Booking DB: outbox</h5><div id="outbox"></div></div>
    <div class="lane"><h5>Broker</h5><div id="broker"></div></div>
    <div class="lane"><h5>Loyalty (consumer)</h5><div id="loyalty"></div></div>
  </div>
  <div class="status" id="status"></div>
  <div class="log" id="log"></div>
</div>
<script>
  const $ = (id) => document.getElementById(id);
  let s;
  function reset() {
    s = { seq: 0, bookings: [], outbox: [], broker: [], seen: new Set(), points: 0, credits: [], log: [] };
    render('Pick a mode and crash switches, then click step 1.');
  }
  const mode = () => document.querySelector('input[name=mode]:checked').value;
  const say = (line) => s.log.unshift(line);

  function deliver(msg) {
    s.broker.push(msg);
    if ($('dedupe').checked && s.seen.has(msg.id)) {
      say('Loyalty: ' + msg.id + ' already processed, skipped');
      return;
    }
    s.seen.add(msg.id);
    s.points += 1250;
    s.credits.push(msg.id);
    say('Loyalty: +1250 points for ' + msg.pnr + ' (' + msg.id + ')');
  }

  $('confirm').onclick = () => {
    const pnr = 'SKY' + String(s.bookings.length + 1).padStart(3, '0');
    const id = 'msg-' + String(++s.seq).padStart(3, '0');
    if (mode() === 'naive') {
      s.bookings.push(pnr);
      say('DB commit: ' + pnr + ' CONFIRMED');
      if ($('crashApp').checked) {
        say('💥 app crashed before publishing ' + id);
        render();
        return;
      }
      say('app publishes ' + id + ' to broker');
      deliver({ id, pnr });
    } else {
      s.bookings.push(pnr);
      s.outbox.push({ id, pnr, sent: false });
      say('DB commit (one transaction): ' + pnr + ' CONFIRMED + outbox row ' + id);
      if ($('crashApp').checked) say('💥 app crashed after commit: the outbox row is safe on disk');
    }
    render();
  };

  $('relay').onclick = () => {
    const unsent = s.outbox.filter((r) => !r.sent);
    if (unsent.length === 0) say('relay: nothing to send');
    for (const row of unsent) {
      say('relay publishes ' + row.id);
      deliver({ id: row.id, pnr: row.pnr });
      if ($('crashRelay').checked) {
        say('💥 relay crashed before marking ' + row.id + ' sent: it will be sent again');
        render();
        return;
      }
      row.sent = true;
      say('relay marks ' + row.id + ' sent');
    }
    render();
  };

  $('reset').onclick = reset;
  document.querySelectorAll('input[name=mode]').forEach((r) => (r.onchange = reset));

  function render(hint) {
    const naive = mode() === 'naive';
    $('relay').disabled = naive;
    $('crashRelay').disabled = naive;
    $('bookings').innerHTML = s.bookings.map((p) => '<div class="row">' + p + ' CONFIRMED</div>').join('') || '<em>empty</em>';
    $('outbox').innerHTML = naive
      ? '<em>(not used in this mode)</em>'
      : s.outbox.map((r) => '<div class="row evt ' + (r.sent ? 'sent' : '') + '">' + r.id + ' ' + r.pnr + (r.sent ? ' ✓ sent' : ' • unsent') + '</div>').join('') || '<em>empty</em>';
    const counts = {};
    s.broker.forEach((m) => (counts[m.id] = (counts[m.id] || 0) + 1));
    $('broker').innerHTML = s.broker.map((m, i) => {
      const dup = s.broker.findIndex((x) => x.id === m.id) !== i;
      return '<div class="row evt ' + (dup ? 'dup' : '') + '">' + m.id + ' BookingConfirmed' + (dup ? ' (dup)' : '') + '</div>';
    }).join('') || '<em>empty</em>';
    $('loyalty').innerHTML = '<div class="row">points: ' + s.points + '</div>' + s.credits.map((c) => '<div class="row">credited ' + c + '</div>').join('');

    const confirmed = s.bookings.length;
    const uniqueDelivered = new Set(s.broker.map((m) => m.id)).size;
    const pendingRows = s.outbox.filter((r) => !r.sent).length;
    const lost = confirmed - uniqueDelivered - pendingRows;
    const doubleCredits = s.credits.length - new Set(s.credits).size;
    let cls = 'ok';
    let text = hint || '✅ Consistent: every confirmed booking reached Loyalty exactly once.';
    if (!hint) {
      if (lost > 0) {
        cls = 'bad';
        text = '❌ ' + lost + ' event(s) LOST: booking confirmed in the DB, but no message exists anywhere. Loyalty will never credit these points. Nothing will retry, because nothing remembers the event.';
      } else if (doubleCredits > 0) {
        cls = 'bad';
        text = '❌ Duplicate processed: the same message was credited ' + (doubleCredits + 1) + '×. The outbox gives at-least-once delivery, so consumers must dedupe. Tick "consumer dedupes".';
      } else if (s.broker.length > uniqueDelivered) {
        cls = 'warnc';
        text = '⚠️ Duplicate delivered but deduped by the consumer: at-least-once + idempotent consumer = effectively once.';
      } else if (pendingRows > 0) {
        cls = 'warnc';
        text = '⏳ ' + pendingRows + ' outbox row(s) waiting. Not lost: run the relay (step 2) and they will be published.';
      } else if (confirmed === 0) {
        text = 'Nothing yet. Click step 1.';
        cls = '';
      }
    }
    $('status').className = 'status ' + cls;
    $('status').textContent = text;
    $('log').innerHTML = s.log.map((l) => '<div>' + l + '</div>').join('');
  }
  reset();
</script>`,
        explain: `
          <details>
            <summary>Try this in the widget</summary>
            <ol>
              <li><strong>Lose an event:</strong> choose <em>Naive dual write</em>, tick <em>app crashes right after DB commit</em>, click step 1. The booking is confirmed, the broker is empty, the status goes red. There's no button that can fix it.</li>
              <li><strong>Survive the same crash:</strong> choose <em>Transactional outbox</em> (keep the crash ticked), click step 1. The outbox row is waiting (⏳). Click step 2: delivered, Loyalty credits 1250 points.</li>
              <li><strong>Duplicate:</strong> tick <em>relay crashes before marking sent</em>, click step 1 then step 2. The message reaches Loyalty but the row stays unsent. Untick the relay crash and click step 2 again: the same message arrives twice and Loyalty credits 2500 points (red).</li>
              <li><strong>Make it safe:</strong> Reset, tick <em>consumer dedupes by message id</em>, repeat step 3. The duplicate is delivered but skipped (amber): effectively once.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop sees ~20 bookings a week that are CONFIRMED but never got a ticket issued. Ticketing listens for <code>BookingConfirmed</code> on Kafka. The code does <code>await db.save(b); await kafka.send(evt);</code>. Most likely cause?',
        options: [
          'Kafka loses messages',
          'Dual write: the process sometimes dies (deploys, OOM) between the DB commit and the publish, so the event is lost',
          'Ticketing is too slow',
          'The booking aggregate is too big',
        ],
        answer: 1,
        why: 'Two separate writes with no shared transaction. The fix is an outbox row in the same DB transaction, published by a relay.',
      },
      {
        q: 'With an outbox in place, Loyalty occasionally credits points twice for one booking. Why, and what\'s the fix?',
        options: [
          'The outbox is broken; remove it',
          'The relay delivers at-least-once (it can republish after a crash before marking sent); make the consumer idempotent by recording processed message ids',
          'Kafka duplicates randomly; switch brokers',
          'Mark rows sent before publishing',
        ],
        answer: 1,
        why: 'At-least-once is the outbox\'s guarantee. Marking before publishing would turn duplicates into losses, which is worse. Dedupe on the consumer side.',
      },
      {
        q: 'A teammate proposes: "publish to the broker first, then save to the DB; if the save fails, publish a compensating event". Problem?',
        options: [
          'None, that\'s the outbox pattern',
          'It\'s slower',
          'Brokers don\'t support compensating events',
          'If the process crashes after publishing, nothing sends the compensation: consumers react to a booking that doesn\'t exist. It\'s still a dual write',
        ],
        answer: 3,
        why: 'Any design with two independent writes and a crash window between them can lose or invent facts. Only one atomic write (DB + outbox) closes the window.',
      },
    ],
    exercise: {
      task: `<p>Implement both halves of the outbox:</p>
      <ul>
        <li><code>confirmBooking(db, pnr)</code>: in <strong>one</strong> <code>db.transaction</code>, reject non-HELD bookings
        (<code>DomainError</code>), set CONFIRMED, and push an outbox row
        <code>{ id: nextId(), type: 'BookingConfirmed', payload: { pnr }, sentAt: null }</code>. Never touch the broker here.</li>
        <li><code>relayOnce(db, broker)</code>: publish every unsent row in order as <code>{ id, type, ...payload }</code>,
        set <code>sentAt = NOW</code> <em>after</em> publishing, and return how many were sent.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Given: a DB with all-or-nothing transactions, and a broker
class Database {
  bookings = new Map([['SKY001', 'HELD'], ['SKY002', 'HELD'], ['SKY003', 'CANCELLED']]);
  outbox = []; // { id, type, payload, sentAt }

  transaction(fn) {
    const tx = { bookings: new Map(this.bookings), outbox: [...this.outbox] };
    fn(tx); // if fn throws, nothing below runs: the copies are thrown away
    this.bookings = tx.bookings;
    this.outbox = tx.outbox;
  }
}

class Broker {
  delivered = [];

  publish(message) {
    this.delivered.push(message);
  }
}

let seq = 0;
const nextId = () => 'msg-' + ++seq;
const NOW = '2026-11-01T08:00:00Z';

function confirmBooking(db, pnr) {
  // TODO: inside ONE db.transaction: check the booking is HELD (else DomainError),
  // set it CONFIRMED, and push an outbox row
  // { id: nextId(), type: 'BookingConfirmed', payload: { pnr }, sentAt: null }
  db.bookings.set(pnr, 'CONFIRMED');
}

function relayOnce(db, broker) {
  // TODO: publish every row with sentAt === null, in order, as
  // { id, type, ...payload }, then set sentAt = NOW. Return how many were sent.
  return 0;
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌ ' + name + ' (no error thrown)');
  } catch (e) {
    const ok = e instanceof DomainError;
    console.log((ok ? '✅ ' : '❌ ') + name + ' -> ' + e.name + ': ' + e.message);
  }
}

const db = new Database();
const broker = new Broker();

confirmBooking(db, 'SKY001');
confirmBooking(db, 'SKY002');
check('bookings confirmed', db.bookings.get('SKY001') + ' ' + db.bookings.get('SKY002'), 'CONFIRMED CONFIRMED');
check('one outbox row per booking, same transaction', db.outbox.map((r) => r.payload.pnr), ['SKY001', 'SKY002']);
check('nothing published yet (app never talks to the broker)', broker.delivered.length, 0);

expectThrows('cannot confirm a cancelled booking', () => confirmBooking(db, 'SKY003'));
check('failed transaction wrote no outbox row', db.outbox.length, 2);

check('relay sends 2', relayOnce(db, broker), 2);
check('broker got them in order', broker.delivered,
  [{ id: 'msg-1', type: 'BookingConfirmed', pnr: 'SKY001' }, { id: 'msg-2', type: 'BookingConfirmed', pnr: 'SKY002' }]);
check('rows marked sent', db.outbox.map((r) => r.sentAt), [NOW, NOW]);
check('second relay run sends nothing', relayOnce(db, broker), 0);`,
      hint: 'Work on <code>tx.bookings</code> / <code>tx.outbox</code> inside the transaction callback, not on <code>db.*</code>. If you throw inside the callback, the transaction never swaps the copies in, so neither write happens.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Given: a DB with all-or-nothing transactions, and a broker
class Database {
  bookings = new Map([['SKY001', 'HELD'], ['SKY002', 'HELD'], ['SKY003', 'CANCELLED']]);
  outbox = []; // { id, type, payload, sentAt }

  transaction(fn) {
    const tx = { bookings: new Map(this.bookings), outbox: [...this.outbox] };
    fn(tx); // if fn throws, nothing below runs: the copies are thrown away
    this.bookings = tx.bookings;
    this.outbox = tx.outbox;
  }
}

class Broker {
  delivered = [];

  publish(message) {
    this.delivered.push(message);
  }
}

let seq = 0;
const nextId = () => 'msg-' + ++seq;
const NOW = '2026-11-01T08:00:00Z';

function confirmBooking(db, pnr) {
  db.transaction((tx) => {
    const status = tx.bookings.get(pnr);
    if (status !== 'HELD') throw new DomainError(pnr + ' is ' + status);
    tx.bookings.set(pnr, 'CONFIRMED');
    tx.outbox.push({ id: nextId(), type: 'BookingConfirmed', payload: { pnr }, sentAt: null });
  });
}

function relayOnce(db, broker) {
  let sent = 0;
  for (const row of db.outbox) {
    if (row.sentAt !== null) continue;
    broker.publish({ id: row.id, type: row.type, ...row.payload });
    row.sentAt = NOW;
    sent++;
  }
  return sent;
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌ ' + name + ' (no error thrown)');
  } catch (e) {
    const ok = e instanceof DomainError;
    console.log((ok ? '✅ ' : '❌ ') + name + ' -> ' + e.name + ': ' + e.message);
  }
}

const db = new Database();
const broker = new Broker();

confirmBooking(db, 'SKY001');
confirmBooking(db, 'SKY002');
check('bookings confirmed', db.bookings.get('SKY001') + ' ' + db.bookings.get('SKY002'), 'CONFIRMED CONFIRMED');
check('one outbox row per booking, same transaction', db.outbox.map((r) => r.payload.pnr), ['SKY001', 'SKY002']);
check('nothing published yet (app never talks to the broker)', broker.delivered.length, 0);

expectThrows('cannot confirm a cancelled booking', () => confirmBooking(db, 'SKY003'));
check('failed transaction wrote no outbox row', db.outbox.length, 2);

check('relay sends 2', relayOnce(db, broker), 2);
check('broker got them in order', broker.delivered,
  [{ id: 'msg-1', type: 'BookingConfirmed', pnr: 'SKY001' }, { id: 'msg-2', type: 'BookingConfirmed', pnr: 'SKY002' }]);
check('rows marked sent', db.outbox.map((r) => r.sentAt), [NOW, NOW]);
check('second relay run sends nothing', relayOnce(db, broker), 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── integration-events
  {
    id: 'integration-events',
    section: 'Domain Events & Consistency',
    title: 'Domain Events vs Integration Events',
    explain: `
      <p>Not every event should leave its bounded context. Inside Booking, a
      <code>BookingConfirmed</code> domain event can be rich: full passenger objects, passports,
      the internal fare bucket, a fraud score. It's an implementation detail you can refactor any
      day. The moment another team consumes it, though, it becomes a <strong>public contract</strong>
      that you can't change without breaking them.</p>

      <table>
        <tr><th></th><th>Domain event</th><th>Integration event</th></tr>
        <tr><td>Audience</td><td>Same bounded context</td><td>Other contexts / teams / services</td></tr>
        <tr><td>Shape</td><td>Internal model terms, may be rich</td><td>Minimal, stable, documented</td></tr>
        <tr><td>Naming</td><td><code>BookingConfirmed</code></td><td><code>booking.confirmed</code> + <code>version: 1</code></td></tr>
        <tr><td>Change</td><td>Refactor freely</td><td>Versioned, backwards compatible, deprecation period</td></tr>
        <tr><td>Transport</td><td>In-process bus</td><td>Broker via outbox</td></tr>
      </table>

      <h3>Published Language</h3>
      <p>In context-mapping terms, the integration events are Booking's <strong>Published
      Language</strong>: a shared, documented format (often JSON Schema / Avro / Protobuf in a
      schema registry) used with an <strong>Open Host Service</strong>. Consumers depend on the
      language, not on Booking's internal model.</p>

      <h3>Translate at the boundary</h3>
      <ul>
        <li><strong>Minimal PII</strong>: send the booking reference, not names, birth dates or
        passports. Consumers that need details call an API with proper authorisation. Every copy
        of personal data in another team's topic is a GDPR / Privacy Act liability.</li>
        <li><strong>Stable vocabulary</strong>: <code>fareBucket: 'Q'</code> is internal; don't publish it
        unless it's part of the contract.</li>
        <li><strong>Envelope</strong>: <code>messageId</code> (for dedupe), <code>type</code>, <code>version</code>,
        <code>occurredAt</code>, then <code>data</code>.</li>
      </ul>

      <h3>Versioning</h3>
      <ul>
        <li><strong>Additive changes</strong> (new optional field) keep the version. Consumers are
        <em>tolerant readers</em>: they ignore fields they don't know.</li>
        <li><strong>Breaking changes</strong> (rename, change type, remove) get a new version. The
        producer often publishes v1 and v2 side by side during migration.</li>
        <li><strong>Upcasting</strong>: a consumer (or event store) converts old versions to the
        latest shape on read, so handler code only knows one version.</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> teams that publish their internal domain
      events directly usually regret it within a year. Every refactor becomes a cross-team
      negotiation. A thin translator per public event is cheap insurance. Schema registries
      (Confluent, AWS Glue, Apicurio) can enforce compatibility rules automatically in CI.</div>
    `,
    examples: [
      {
        title: 'Translating BookingConfirmed into booking.confirmed v1',
        code: `// ---------- Inside the Booking context: a RICH domain event ----------
// Uses internal model names, full objects, PII. Only Booking's own code sees it.
const domainEvent = {
  type: 'BookingConfirmed',
  occurredAt: '2026-11-01T08:00:00Z',
  pnr: 'K7XQ2M',
  fareBucket: 'Q', // internal pricing detail, may be renamed tomorrow
  passengers: [
    { id: 'P1', name: 'Ana Silva', dob: '1990-04-12', passport: 'PA1234567', email: 'ana@example.com', type: 'ADULT' },
    { id: 'P2', name: 'Mia Silva', dob: '2025-08-01', passport: 'PA7654321', email: null, type: 'INFANT' },
  ],
  segments: [
    { flight: 'SH101', date: '2026-11-20', from: 'SYD', to: 'MEL', cabin: 'Y' },
    { flight: 'SH205', date: '2026-11-20', from: 'MEL', to: 'OOL', cabin: 'Y' },
  ],
  total: { minor: 23800, currency: 'AUD' },
  internalRiskScore: 0.07, // fraud model output: must never leave the context
};

// ---------- Translator: domain event -> PUBLIC integration event (Published Language) ----------
let messageSeq = 0;

function toIntegrationEvent(e) {
  return {
    // envelope: same shape for every public event
    messageId: 'bkg-' + String(++messageSeq).padStart(6, '0'),
    type: 'booking.confirmed',
    version: 1,
    occurredAt: e.occurredAt,
    // data: a deliberate, minimal, documented contract
    data: {
      bookingRef: e.pnr,
      flights: e.segments.map((s) => s.flight + '/' + s.date),
      passengerCount: e.passengers.length,
      totalPaid: { amount: (e.total.minor / 100).toFixed(2), currency: e.total.currency },
    },
  };
}

const message = toIntegrationEvent(domainEvent);
console.log('public message:', message);

const internalSize = JSON.stringify(domainEvent).length;
const publicSize = JSON.stringify(message).length;
console.log('size: internal', internalSize, 'chars -> public', publicSize, 'chars');

const leaked = ['passport', 'dob', 'email', 'internalRiskScore', 'fareBucket']
  .filter((field) => JSON.stringify(message).includes(field));
console.log('PII / internals leaked:', leaked.length === 0 ? 'none' : leaked);`,
        explain: `
          <details>
            <summary>What gets dropped, and why</summary>
            <table>
              <tr><th>Internal field</th><th>Public?</th><th>Reason</th></tr>
              <tr><td><code>pnr</code></td><td>✅ as <code>bookingRef</code></td><td>The id other contexts need; public name independent of the internal one</td></tr>
              <tr><td><code>segments</code></td><td>✅ as <code>'SH101/2026-11-20'</code></td><td>Flight + date identifies a flight across contexts</td></tr>
              <tr><td><code>passengers</code></td><td>only a count</td><td>Names, DOB, passports, emails = PII. Consumers that need them call an authorised API</td></tr>
              <tr><td><code>total</code></td><td>✅ as decimal string + currency</td><td>An explicit, documented money format</td></tr>
              <tr><td><code>fareBucket</code></td><td>❌</td><td>Internal pricing detail that will change</td></tr>
              <tr><td><code>internalRiskScore</code></td><td>❌</td><td>Confidential; leaking it would be a security incident</td></tr>
            </table>
            <p>Console: the message is <code>{"messageId":"bkg-000001","type":"booking.confirmed","version":1,...}</code>,
            then <code>size: internal 555 chars -&gt; public 250 chars</code> and
            <code>PII / internals leaked: none</code>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Replace <code>passengerCount: e.passengers.length</code> with <code>passengers: e.passengers</code>. The leak check now prints <code>["passport","dob","email"]</code>. That's exactly what happens when a team "just publishes the domain event".</li>
              <li>Rename the internal <code>pnr</code> to <code>bookingReference</code> in <code>domainEvent</code> and update the translator. The public message is unchanged: that's the point of the translation layer.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Consumer side: upcasting v1 → v2 and the tolerant reader',
        code: `// Consumer side (e.g. Customer Notifications). Its handler is written against v2 only.
//
// v1 data: { bookingRef, flights: ['SH101/2026-11-20'], passengerCount }
// v2 data: { bookingRef, flights: [{ flight, date, cabin }], passengerCount }  <- breaking change

const upcasters = {
  // v1 -> v2: split 'SH101/2026-11-20' into fields; cabin wasn't known in v1
  1: (msg) => ({
    ...msg,
    version: 2,
    data: {
      ...msg.data,
      flights: msg.data.flights.map((text) => {
        const [flight, date] = text.split('/');
        return { flight, date, cabin: 'UNKNOWN' };
      }),
    },
  }),
};

const LATEST = 2;

function upcast(msg) {
  let current = msg;
  while (current.version < LATEST) {
    const step = upcasters[current.version];
    if (!step) throw new Error('No upcaster for ' + current.type + ' v' + current.version);
    current = step(current);
  }
  if (current.version > LATEST) {
    throw new Error(current.type + ' v' + current.version + ' is newer than this consumer understands');
  }
  return current;
}

function handleBookingConfirmed(msg) {
  const { bookingRef, flights } = msg.data; // tolerant reader: take only what we need
  const lines = flights.map((f) => f.flight + ' on ' + f.date + (f.cabin === 'UNKNOWN' ? '' : ' (' + f.cabin + ')'));
  console.log('  email for', bookingRef + ':', lines.join(', '));
}

const stream = [
  { messageId: 'bkg-000001', type: 'booking.confirmed', version: 1,
    data: { bookingRef: 'K7XQ2M', flights: ['SH101/2026-11-20'], passengerCount: 2 } },
  { messageId: 'bkg-000002', type: 'booking.confirmed', version: 2,
    data: { bookingRef: 'P3RT9A', flights: [{ flight: 'SH330', date: '2026-12-01', cabin: 'J' }],
      passengerCount: 1, seatsSelected: true } }, // extra field: ignored, not an error
  { messageId: 'bkg-000003', type: 'booking.confirmed', version: 3,
    data: { bookingRef: 'ZZ0001' } },
];

for (const msg of stream) {
  console.log(msg.messageId, 'arrived as v' + msg.version);
  try {
    handleBookingConfirmed(upcast(msg));
  } catch (e) {
    console.log('  parked for a human:', e.message);
  }
}`,
        explain: `
          <details>
            <summary>Step by step: three messages, three versions</summary>
            <table>
              <tr><th>Message</th><th>Upcast</th><th>Handler sees</th><th>Console</th></tr>
              <tr><td>bkg-000001 v1</td><td>v1→v2: split <code>'SH101/2026-11-20'</code>, cabin <code>UNKNOWN</code></td><td>v2 shape</td><td><code>email for K7XQ2M: SH101 on 2026-11-20</code></td></tr>
              <tr><td>bkg-000002 v2</td><td>none</td><td>v2 + unknown <code>seatsSelected</code> (ignored)</td><td><code>email for P3RT9A: SH330 on 2026-12-01 (J)</code></td></tr>
              <tr><td>bkg-000003 v3</td><td>newer than consumer</td><td>-</td><td><code>parked for a human: booking.confirmed v3 is newer than this consumer understands</code></td></tr>
            </table>
            <p>The handler is written against v2 only. Old messages (e.g. replayed from a Kafka topic
            with long retention) still work, because the upcaster chain brings them up to date first.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const upcasters = { 1: (msg) =&gt; ({ ...msg, version: 2, data: ... }) };  // ① one step per version
while (current.version &lt; LATEST) current = upcasters[current.version](current);  // ② chain
if (current.version &gt; LATEST) throw ...                                   // ③ don't guess
const { bookingRef, flights } = msg.data;                                 // ④ tolerant reader</code></pre>
            <ol>
              <li><strong>①</strong> Each upcaster only knows how to go from N to N+1. Adding v3 later = add <code>2: ...</code>; v1 messages go 1→2→3 automatically.</li>
              <li><strong>②</strong> Pure functions returning new objects; the original message is never mutated.</li>
              <li><strong>③</strong> A message from the future means the producer deployed a breaking change before this consumer was upgraded. Park it (dead-letter queue) instead of half-processing it.</li>
              <li><strong>④</strong> Destructure only what you use; extra fields like <code>seatsSelected</code> don't break anything. That's what makes additive changes safe.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'The Disruption team asks Booking to publish its internal <code>BookingConfirmed</code> object as-is to Kafka "because it has everything". What\'s the risk?',
        options: [
          'It leaks PII and internal concepts, and freezes Booking\'s internal model: every refactor now breaks another team',
          'Kafka can\'t handle large messages',
          'None, more data is better',
          'Domain events can\'t be serialised',
        ],
        answer: 0,
        why: 'Publish a translated, minimal, versioned integration event (Published Language). Keep the rich domain event internal.',
      },
      {
        q: 'Booking wants to add an optional <code>loyaltyTier</code> field to <code>booking.confirmed</code>. What\'s needed?',
        options: [
          'A new major version and a migration for all consumers',
          'Stop publishing v1 immediately',
          'Nothing special if consumers are tolerant readers: additive optional fields are backwards compatible',
          'Rename the event',
        ],
        answer: 2,
        why: 'Additive changes are compatible when consumers ignore unknown fields. Renames, type changes and removals are the breaking ones.',
      },
      {
        q: '<code>flights</code> changes from <code>["SH101/2026-11-20"]</code> to <code>[{ flight, date, cabin }]</code>. A consumer must handle months of old v1 messages during replay. Best approach?',
        options: [
          'Rewrite old messages in the topic',
          'Keep both shapes in the handler with if/else everywhere',
          'Publish as <code>version: 2</code>; the consumer upcasts v1 → v2 on read so the handler only knows v2',
          'Drop old messages',
        ],
        answer: 2,
        why: 'Events are immutable history. Upcasting converts old shapes on read, keeping handler code simple.',
      },
    ],
    exercise: {
      task: `<p>Write the translator for cancellations and an upcaster:</p>
      <ul>
        <li><code>toPublic(event, messageId)</code> → <code>{ messageId, type: 'booking.cancelled', version: 1, occurredAt, data }</code>
        with <code>data = { bookingRef, flights: ['SH101/2026-11-20'], refund: { amount: '119.00', currency: 'AUD' } }</code>
        (<code>refund: null</code> if non-refundable). No passengers, agent details or internal reason codes.</li>
        <li><code>upcastV1toV2(msg)</code>: v2 adds <code>data.reasonCode</code>; old v1 messages get <code>'UNSPECIFIED'</code>.
        Return a <em>new</em> object; pass non-v1 messages through unchanged.</li>
      </ul>`,
      starter: `// Internal domain event from the Booking context
const cancelled = {
  type: 'BookingCancelled',
  occurredAt: '2026-11-03T10:15:00Z',
  pnr: 'K7XQ2M',
  cancelledBy: { agentId: 'AG-17', email: 'agent17@skyhop.example' },
  passengers: [{ name: 'Ana Silva', passport: 'PA1234567', email: 'ana@example.com' }],
  segments: [{ flight: 'SH101', date: '2026-11-20' }],
  refund: { minor: 11900, currency: 'AUD' }, // null when the fare is non-refundable
  internalReason: 'CUST_REQ_WEB',
};

// 1. Translate to the public contract booking.cancelled v1
function toPublic(e, messageId) {
  // TODO: envelope { messageId, type: 'booking.cancelled', version: 1, occurredAt, data }
  // data: { bookingRef, flights: ['SH101/2026-11-20'], refund: { amount: '119.00', currency } | null }
  // No passengers, no agent details, no internal reason codes.
  return { messageId, type: e.type, version: 1, occurredAt: e.occurredAt, data: { ...e } };
}

// 2. v2 adds data.reasonCode. Old v1 messages get 'UNSPECIFIED'.
function upcastV1toV2(msg) {
  // TODO: return a NEW message (don't mutate msg); leave non-v1 messages unchanged
  return msg;
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const v1 = toPublic(cancelled, 'bkg-000042');
check('public v1 contract', v1, {
  messageId: 'bkg-000042',
  type: 'booking.cancelled',
  version: 1,
  occurredAt: '2026-11-03T10:15:00Z',
  data: { bookingRef: 'K7XQ2M', flights: ['SH101/2026-11-20'], refund: { amount: '119.00', currency: 'AUD' } },
});

const text = JSON.stringify(v1);
check('no PII or internals', ['passport', 'email', 'agentId', 'internalReason'].filter((k) => text.includes(k)), []);
check('non-refundable -> refund null', toPublic({ ...cancelled, refund: null }, 'x').data.refund, null);

const v2 = upcastV1toV2(v1);
check('upcast to v2', [v2.version, v2.data.reasonCode, v2.data.bookingRef], [2, 'UNSPECIFIED', 'K7XQ2M']);
check('original v1 untouched', [v1.version, 'reasonCode' in v1.data], [1, false]);
const native = { ...v1, version: 2, data: { ...v1.data, reasonCode: 'SCHEDULE_CHANGE' } };
check('real v2 passes through', upcastV1toV2(native).data.reasonCode, 'SCHEDULE_CHANGE');`,
      hint: '<code>(e.refund.minor / 100).toFixed(2)</code> gives <code>\'119.00\'</code>. For the upcaster: <code>{ ...msg, version: 2, data: { ...msg.data, reasonCode: \'UNSPECIFIED\' } }</code>.',
      solution: `// Internal domain event from the Booking context
const cancelled = {
  type: 'BookingCancelled',
  occurredAt: '2026-11-03T10:15:00Z',
  pnr: 'K7XQ2M',
  cancelledBy: { agentId: 'AG-17', email: 'agent17@skyhop.example' },
  passengers: [{ name: 'Ana Silva', passport: 'PA1234567', email: 'ana@example.com' }],
  segments: [{ flight: 'SH101', date: '2026-11-20' }],
  refund: { minor: 11900, currency: 'AUD' }, // null when the fare is non-refundable
  internalReason: 'CUST_REQ_WEB',
};

// 1. Translate to the public contract booking.cancelled v1
function toPublic(e, messageId) {
  return {
    messageId,
    type: 'booking.cancelled',
    version: 1,
    occurredAt: e.occurredAt,
    data: {
      bookingRef: e.pnr,
      flights: e.segments.map((s) => s.flight + '/' + s.date),
      refund: e.refund ? { amount: (e.refund.minor / 100).toFixed(2), currency: e.refund.currency } : null,
    },
  };
}

// 2. v2 adds data.reasonCode. Old v1 messages get 'UNSPECIFIED'.
function upcastV1toV2(msg) {
  if (msg.version !== 1) return msg;
  return { ...msg, version: 2, data: { ...msg.data, reasonCode: 'UNSPECIFIED' } };
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const v1 = toPublic(cancelled, 'bkg-000042');
check('public v1 contract', v1, {
  messageId: 'bkg-000042',
  type: 'booking.cancelled',
  version: 1,
  occurredAt: '2026-11-03T10:15:00Z',
  data: { bookingRef: 'K7XQ2M', flights: ['SH101/2026-11-20'], refund: { amount: '119.00', currency: 'AUD' } },
});

const text = JSON.stringify(v1);
check('no PII or internals', ['passport', 'email', 'agentId', 'internalReason'].filter((k) => text.includes(k)), []);
check('non-refundable -> refund null', toPublic({ ...cancelled, refund: null }, 'x').data.refund, null);

const v2 = upcastV1toV2(v1);
check('upcast to v2', [v2.version, v2.data.reasonCode, v2.data.bookingRef], [2, 'UNSPECIFIED', 'K7XQ2M']);
check('original v1 untouched', [v1.version, 'reasonCode' in v1.data], [1, false]);
const native = { ...v1, version: 2, data: { ...v1.data, reasonCode: 'SCHEDULE_CHANGE' } };
check('real v2 passes through', upcastV1toV2(native).data.reasonCode, 'SCHEDULE_CHANGE');`,
    },
  },

  // ───────────────────────────────────────────────────────────── sagas
  {
    id: 'sagas',
    section: 'Domain Events & Consistency',
    title: 'Sagas & Process Managers',
    explain: `
      <p>Booking a SkyHop flight touches three contexts, each with its own database: Inventory
      (hold the seat), Payments (charge the card), Ticketing (issue the e-ticket). There is no
      transaction that spans all three. And if the card is declined after the seat was held, someone
      has to give the seat back. A <strong>saga</strong> is a long-running business process made
      of local transactions, where every step that can be undone has a <strong>compensating
      action</strong>.</p>

      <pre><code>hold seat      → (compensate: release seat)
charge payment → (compensate: refund payment)
issue ticket   → last step: once the ticket exists the saga is done</code></pre>
      <p>If step <em>n</em> fails, run the compensations of steps <em>n−1 … 1</em> in reverse
      order. Compensation is a <em>business</em> action, not a rollback: the charge really happened
      and shows on the statement; the refund is a second, visible transaction.</p>

      <h3>Orchestration vs choreography</h3>
      <table>
        <tr><th></th><th>Orchestration (process manager)</th><th>Choreography</th></tr>
        <tr><td>Who decides the next step?</td><td>A central saga object/service with explicit state</td><td>Each context reacts to the previous context's event</td></tr>
        <tr><td>Flow is visible in…</td><td>One place (the orchestrator's code)</td><td>Spread across subscribers. You reconstruct it from logs</td></tr>
        <tr><td>Coupling</td><td>Orchestrator knows all participants</td><td>Participants know each other's events</td></tr>
        <tr><td>Good for</td><td>Many steps, branching, timeouts, compensation order matters</td><td>2–3 simple steps, very decoupled teams</td></tr>
      </table>
      <p>"Process manager" (from <em>Enterprise Integration Patterns</em>) is the more precise name
      for the orchestrating object: it holds state ("waiting for payment") and reacts to events by
      sending commands. Many teams just say "saga" for both.</p>

      <h3>Things real sagas need</h3>
      <ul>
        <li><strong>Persisted saga state</strong>: if the orchestrator crashes after "seat held",
        it must resume, not start over.</li>
        <li><strong>Timeouts</strong>: the 20-minute seat hold expires; payment gateways hang.</li>
        <li><strong>Idempotent steps and compensations</strong>: they will be retried.</li>
        <li><strong>Compensation can fail too</strong>: a refund API is down. Retry, and if it still
        fails, flag the case for a human ("NEEDS_ATTENTION") rather than stopping halfway.</li>
        <li><strong>Pivot step</strong>: after some point (ticket issued) you only go forward. Put
        the irreversible step last.</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> workflow engines like Temporal, AWS
      Step Functions, Camunda or Azure Durable Functions are orchestrated sagas with persisted state,
      timers and retries built in. Uber built Cadence (Temporal's predecessor) for exactly this kind
      of multi-service flow. Choreography tends to start nicely and become "who on earth emits
      <code>SeatReleased</code>?" once there are 8 steps. Many teams choreograph between
      contexts but orchestrate inside a context's own process manager.</div>
    `,
    examples: [
      {
        title: 'Orchestrated booking saga with compensations (3 scenarios)',
        code: `// ---------- Fake participants (each is its own bounded context / service) ----------
class StepFailed extends Error {
  constructor(message) {
    super(message);
    this.name = 'StepFailed';
  }
}

function makeServices(fail) {
  const state = { seatsHeld: [], charges: [], tickets: [] };
  const call = async (step, fn) => {
    await new Promise((r) => setTimeout(r, 5)); // network hop
    if (fail[step]) throw new StepFailed(fail[step]);
    return fn();
  };
  return {
    state,
    inventory: {
      hold: (pnr) => call('hold', () => state.seatsHeld.push(pnr)),
      release: (pnr) => call('release', () => (state.seatsHeld = state.seatsHeld.filter((p) => p !== pnr))),
    },
    payments: {
      charge: (pnr, minor) => call('charge', () => state.charges.push({ pnr, minor })),
      refund: (pnr) => call('refund', () => (state.charges = state.charges.filter((c) => c.pnr !== pnr))),
    },
    ticketing: {
      issue: (pnr) => call('issue', () => state.tickets.push('TKT-' + pnr)),
    },
  };
}

// ---------- The orchestrator: a saga that knows the steps and their compensations ----------
async function runBookingSaga(pnr, fareMinor, services) {
  const { inventory, payments, ticketing } = services;
  const steps = [
    { name: 'hold seat', run: () => inventory.hold(pnr), undoName: 'release seat', undo: () => inventory.release(pnr) },
    { name: 'charge payment', run: () => payments.charge(pnr, fareMinor), undoName: 'refund payment',
      undo: () => payments.refund(pnr) },
    { name: 'issue ticket', run: () => ticketing.issue(pnr), undo: null }, // last step: nothing after it
  ];

  const done = [];
  for (const step of steps) {
    try {
      await step.run();
      done.push(step);
      console.log('  ✔', step.name);
    } catch (e) {
      console.log('  ✖', step.name, '-', e.message);
      for (const prev of done.reverse()) {
        await prev.undo();
        console.log('  ↩ compensate:', prev.undoName);
      }
      return 'CANCELLED';
    }
  }
  return 'CONFIRMED';
}

// ---------- Scenarios (the failure toggles) ----------
const scenarios = [
  ['happy path', {}],
  ['card declined', { charge: 'card declined' }],
  ['ticketing down', { issue: 'ticketing service timeout' }],
];

for (const [label, fail] of scenarios) {
  console.log(label + ':');
  const services = makeServices(fail);
  const result = await runBookingSaga('SKY001', 23800, services);
  const s = services.state;
  console.log('  => booking', result, '| seats held:', s.seatsHeld.length, '| charges:', s.charges.length,
    '| tickets:', s.tickets.length);
}`,
        explain: `
          <details>
            <summary>The problem: a failure in the middle</summary>
            <p>Without a saga, the code is three awaits in a row. When the card is declined at step 2,
            the function throws and nothing undoes step 1. The seat stays held until the hold expires
            (or forever, if the hold has no expiry), so it can't be sold. In a sale with thousands of
            declined cards, a flight shows "sold out" while half its seats are held by nobody.
            When ticketing fails at step 3, it's worse: the customer was charged and has no ticket.</p>
          </details>
          <details>
            <summary>Step by step: the three scenarios</summary>
            <table>
              <tr><th>Scenario</th><th>Steps run</th><th>Compensations (reverse)</th><th>Final console line</th></tr>
              <tr><td>happy path</td><td>✔ hold seat, ✔ charge payment, ✔ issue ticket</td><td>none</td><td><code>=&gt; booking CONFIRMED | seats held: 1 | charges: 1 | tickets: 1</code></td></tr>
              <tr><td>card declined</td><td>✔ hold seat, ✖ charge payment - card declined</td><td>↩ release seat</td><td><code>=&gt; booking CANCELLED | seats held: 0 | charges: 0 | tickets: 0</code></td></tr>
              <tr><td>ticketing down</td><td>✔ hold seat, ✔ charge payment, ✖ issue ticket - ticketing service timeout</td><td>↩ refund payment, ↩ release seat</td><td><code>=&gt; booking CANCELLED | seats held: 0 | charges: 0 | tickets: 0</code></td></tr>
            </table>
            <p>Note the order in the third scenario: refund first, then release. Compensations run in
            reverse, newest first, so the system walks back through the same states it went through.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>{ name: 'hold seat', run: ..., undoName: 'release seat', undo: ... }  // ① each step + its undo
done.push(step);                                 // ② remember what succeeded
for (const prev of done.reverse()) await prev.undo();   // ③ undo newest first
{ name: 'issue ticket', run: ..., undo: null }   // ④ the pivot: nothing after it can fail
return 'CANCELLED';                              // ⑤ the saga ends in a defined state</code></pre>
            <ol>
              <li><strong>①</strong> Steps are data: the orchestrator is a generic loop, and the business flow is readable in one list.</li>
              <li><strong>②</strong> Only completed steps get compensated. The failed step didn't happen (or it's idempotent to undo).</li>
              <li><strong>③</strong> Reverse order.</li>
              <li><strong>④</strong> The last step is the one that can't be undone, so it never needs compensating: if it succeeds, the saga is done.</li>
              <li><strong>⑤</strong> Real orchestrators persist this state after every step so a crash can resume.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add a scenario <code>['refund API down', { issue: 'timeout', refund: 'refund API 503' }]</code>. The compensation itself throws and the whole script stops with an error: the seat is never released. Fix it like the exercise does: catch per compensation, keep going, return <code>'NEEDS_ATTENTION'</code>.</li>
              <li>Move "issue ticket" to be the <em>first</em> step. Now a declined card means voiding an already-issued ticket: a much more expensive compensation. Order steps so the hardest-to-undo comes last.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'The same flow as choreography (events only, no orchestrator)',
        code: `// Toggle: does the card get declined?
const CARD_DECLINED = true;

// ---------- An event bus everyone publishes to and listens on ----------
const handlers = {};
const on = (type, fn) => (handlers[type] = [...(handlers[type] ?? []), fn]);
const queue = [];
const emit = (type, data) => {
  console.log('  event:', type, JSON.stringify(data));
  queue.push({ type, data });
};

async function drain() {
  while (queue.length > 0) {
    const event = queue.shift();
    for (const fn of handlers[event.type] ?? []) await fn(event.data);
  }
}

// ---------- Each context reacts to events. Nobody is "in charge". ----------
// Inventory
on('BookingRequested', ({ pnr }) => emit('SeatHeld', { pnr }));
on('PaymentFailed', ({ pnr }) => emit('SeatReleased', { pnr })); // compensation

// Payments
on('SeatHeld', ({ pnr }) => {
  if (CARD_DECLINED) emit('PaymentFailed', { pnr, reason: 'card declined' });
  else emit('PaymentCaptured', { pnr, minor: 23800 });
});

// Ticketing
on('PaymentCaptured', ({ pnr }) => emit('TicketIssued', { pnr, ticket: 'TKT-' + pnr }));

// Booking (tracks its own status from the events it cares about)
const booking = { pnr: 'SKY001', status: 'REQUESTED' };
on('TicketIssued', () => (booking.status = 'CONFIRMED'));
on('SeatReleased', () => (booking.status = 'CANCELLED'));

console.log('customer clicks "Pay":');
emit('BookingRequested', { pnr: 'SKY001' });
await drain();
console.log('booking SKY001 status:', booking.status);`,
        explain: `
          <details>
            <summary>Step by step: the event chain</summary>
            <p>With <code>CARD_DECLINED = true</code>:</p>
            <table>
              <tr><th>#</th><th>Event</th><th>Published by</th><th>Who reacts</th></tr>
              <tr><td>1</td><td><code>BookingRequested</code></td><td>Booking</td><td>Inventory holds a seat</td></tr>
              <tr><td>2</td><td><code>SeatHeld</code></td><td>Inventory</td><td>Payments tries to charge</td></tr>
              <tr><td>3</td><td><code>PaymentFailed {"reason":"card declined"}</code></td><td>Payments</td><td>Inventory compensates</td></tr>
              <tr><td>4</td><td><code>SeatReleased</code></td><td>Inventory</td><td>Booking marks itself CANCELLED</td></tr>
            </table>
            <p>Last line: <code>booking SKY001 status: CANCELLED</code>. With <code>CARD_DECLINED = false</code>
            the chain is <code>BookingRequested → SeatHeld → PaymentCaptured → TicketIssued</code> and the status is <code>CONFIRMED</code>.</p>
          </details>
          <details>
            <summary>Compare with the orchestrated version</summary>
            <ul>
              <li><strong>No single place shows the flow.</strong> To learn that a failed payment releases the seat, you must find the <code>on('PaymentFailed', ...)</code> in Inventory's code.</li>
              <li><strong>Inventory now knows about Payments' events.</strong> Add a "bag fee" step and Inventory must also listen to <code>BagFeeFailed</code>. Coupling has moved, not disappeared.</li>
              <li><strong>But</strong> there's no central service that every flow depends on, and each team can add reactions without coordinating a deploy.</li>
            </ul>
            <div class="tip">Try this: add a Notifications subscriber for <code>PaymentFailed</code> that logs "email: your card was declined". In choreography, that's one new line, and nobody else changes. In orchestration, you'd edit the saga.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'The card is charged, then ticketing times out. What should the booking saga do?',
        options: [
          'Run compensations in reverse: refund the payment, then release the seat, and end the booking as CANCELLED (or retry ticketing first if that\'s the policy)',
          'Roll back the database transaction',
          'Leave the charge and tell the customer to call support',
          'Release the seat first, then refund',
        ],
        answer: 0,
        why: 'Each step committed locally in its own context; there\'s nothing to roll back. Compensating actions undo the business effects, newest first.',
      },
      {
        q: 'SkyHop\'s check-in flow has 9 steps with branching (visa check, upsell, seat, bags, boarding pass) and timeouts. Orchestration or choreography?',
        options: [
          'Choreography: always more decoupled',
          'Neither: use a distributed transaction',
          'Put all 9 steps in one aggregate',
          'Orchestration: a process manager with persisted state makes a long, branching flow with timeouts visible and controllable',
        ],
        answer: 3,
        why: 'Choreography works for short flows; long branching flows become impossible to follow. An orchestrator (or workflow engine) holds the state machine in one place.',
      },
      {
        q: 'During compensation, the refund API returns 503. What should a well-built saga do?',
        options: [
          'Stop immediately and leave the seat held',
          'Retry the refund; keep running the other compensations (release the seat); if it still fails, mark the saga for manual follow-up',
          'Charge the card again',
          'Delete the saga state',
        ],
        answer: 1,
        why: 'Compensations must be retried and must not block each other. A saga must always end in a known state, even if that state is "needs a human".',
      },
      {
        q: 'Why do teams try to put the irreversible step (issuing the ticket) last?',
        options: [
          'It\'s the fastest step',
          'Steps after it could fail and would require undoing something that is expensive or impossible to undo',
          'Ticketing is always the last service alphabetically',
          'Because events must be in alphabetical order',
        ],
        answer: 1,
        why: 'The "pivot" step should be the point of no return. Everything before it is compensatable; nothing after it can fail the saga.',
      },
    ],
    exercise: {
      task: `<p>Write the generic orchestrator <code>runSaga(steps)</code>. Each step has async
      <code>run()</code> and <code>undo()</code>.</p>
      <ul>
        <li>Run steps in order. If all succeed, return <code>'COMPLETED'</code>.</li>
        <li>If a step fails, undo the <strong>completed</strong> steps in <strong>reverse</strong> order (not the failed one) and return <code>'COMPENSATED'</code>.</li>
        <li>If an <code>undo</code> throws, keep undoing the remaining steps, and return <code>'NEEDS_ATTENTION'</code>.</li>
      </ul>`,
      starter: `// Given: builds the steps of a SkyHop booking saga. Each step logs to \`trace\`.
function makeSteps(trace, { failAt = null, undoFailsAt = null } = {}) {
  const step = (name) => ({
    name,
    run: async () => {
      if (name === failAt) {
        trace.push(name + ' FAILED');
        throw new Error(name + ' failed');
      }
      trace.push(name);
    },
    undo: async () => {
      if (name === undoFailsAt) {
        trace.push('undo ' + name + ' FAILED');
        throw new Error('undo ' + name + ' failed');
      }
      trace.push('undo ' + name);
    },
  });
  return [step('hold seat'), step('charge payment'), step('add bag'), step('issue ticket')];
}

// Run steps in order. On failure, undo the COMPLETED steps in reverse order.
// Returns 'COMPLETED', 'COMPENSATED', or 'NEEDS_ATTENTION' (an undo itself failed).
async function runSaga(steps) {
  for (const step of steps) {
    try {
      await step.run();
    } catch (e) {
      // TODO: compensate the steps that already succeeded (newest first)
      return 'FAILED';
    }
  }
  return 'COMPLETED';
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

async function scenario(options) {
  const trace = [];
  const status = await runSaga(makeSteps(trace, options));
  return { status, trace };
}

check('happy path', await scenario({}), {
  status: 'COMPLETED',
  trace: ['hold seat', 'charge payment', 'add bag', 'issue ticket'],
});

check('bag fails -> undo payment, then seat', await scenario({ failAt: 'add bag' }), {
  status: 'COMPENSATED',
  trace: ['hold seat', 'charge payment', 'add bag FAILED', 'undo charge payment', 'undo hold seat'],
});

check('first step fails -> nothing to undo', await scenario({ failAt: 'hold seat' }), {
  status: 'COMPENSATED',
  trace: ['hold seat FAILED'],
});

check('refund fails -> still release seat, flag it', await scenario({ failAt: 'issue ticket', undoFailsAt: 'charge payment' }), {
  status: 'NEEDS_ATTENTION',
  trace: ['hold seat', 'charge payment', 'add bag', 'issue ticket FAILED',
    'undo add bag', 'undo charge payment FAILED', 'undo hold seat'],
});`,
      hint: 'Keep a <code>completed</code> array. In the catch, loop over <code>completed.reverse()</code> with a <code>try/catch</code> around each <code>await done.undo()</code> and a flag that turns false if any undo fails.',
      solution: `// Given: builds the steps of a SkyHop booking saga. Each step logs to \`trace\`.
function makeSteps(trace, { failAt = null, undoFailsAt = null } = {}) {
  const step = (name) => ({
    name,
    run: async () => {
      if (name === failAt) {
        trace.push(name + ' FAILED');
        throw new Error(name + ' failed');
      }
      trace.push(name);
    },
    undo: async () => {
      if (name === undoFailsAt) {
        trace.push('undo ' + name + ' FAILED');
        throw new Error('undo ' + name + ' failed');
      }
      trace.push('undo ' + name);
    },
  });
  return [step('hold seat'), step('charge payment'), step('add bag'), step('issue ticket')];
}

// Run steps in order. On failure, undo the COMPLETED steps in reverse order.
// Returns 'COMPLETED', 'COMPENSATED', or 'NEEDS_ATTENTION' (an undo itself failed).
async function runSaga(steps) {
  const completed = [];
  for (const step of steps) {
    try {
      await step.run();
      completed.push(step);
    } catch (e) {
      let allUndone = true;
      for (const done of completed.reverse()) {
        try {
          await done.undo();
        } catch (undoError) {
          allUndone = false; // keep going: release what we still can, flag for a human
        }
      }
      return allUndone ? 'COMPENSATED' : 'NEEDS_ATTENTION';
    }
  }
  return 'COMPLETED';
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

async function scenario(options) {
  const trace = [];
  const status = await runSaga(makeSteps(trace, options));
  return { status, trace };
}

check('happy path', await scenario({}), {
  status: 'COMPLETED',
  trace: ['hold seat', 'charge payment', 'add bag', 'issue ticket'],
});

check('bag fails -> undo payment, then seat', await scenario({ failAt: 'add bag' }), {
  status: 'COMPENSATED',
  trace: ['hold seat', 'charge payment', 'add bag FAILED', 'undo charge payment', 'undo hold seat'],
});

check('first step fails -> nothing to undo', await scenario({ failAt: 'hold seat' }), {
  status: 'COMPENSATED',
  trace: ['hold seat FAILED'],
});

check('refund fails -> still release seat, flag it', await scenario({ failAt: 'issue ticket', undoFailsAt: 'charge payment' }), {
  status: 'NEEDS_ATTENTION',
  trace: ['hold seat', 'charge payment', 'add bag', 'issue ticket FAILED',
    'undo add bag', 'undo charge payment FAILED', 'undo hold seat'],
});`,
    },
  },

  // ───────────────────────────────────────────────────────────── idempotency
  {
    id: 'idempotency',
    section: 'Domain Events & Consistency',
    title: 'Idempotency & Ordering',
    explain: `
      <p>Everything in this section leads here. Outbox relays republish after crashes. Brokers
      redeliver when an acknowledgement times out. Sagas retry steps. So every consumer will
      sometimes see <strong>the same message twice</strong>, and messages about one aggregate can
      arrive <strong>out of order</strong>. Your handlers must give the right result anyway.</p>

      <h3>Idempotency: twice = once</h3>
      <p>An operation is idempotent if doing it again has no further effect. Some are naturally
      idempotent: "set seat to 14C", "mark booking CONFIRMED". Many aren't: "add 1,250 points",
      "send an email", "charge 238.00".</p>
      <ul>
        <li><strong>Processed-message store (inbox)</strong>: record each <code>messageId</code> you've
        handled, <em>in the same transaction</em> as the effect. A duplicate finds its id and is
        skipped. A unique index on the id makes it race-safe.</li>
        <li><strong>Make the effect idempotent</strong>: "credit points for PNR SKY001" with a unique
        key on <code>(member, pnr)</code> instead of "add 1,250".</li>
        <li><strong>Idempotency keys on commands/APIs</strong>: payment providers (Stripe's
        <code>Idempotency-Key</code> header, for example) store the result of the first request
        and return it for retries with the same key.</li>
      </ul>

      <h3>Ordering: per-aggregate version numbers</h3>
      <p>Brokers usually guarantee order only within a partition, and retries can overtake
      originals. If <code>SeatChanged</code> (v2) arrives before <code>BookingConfirmed</code> (v1),
      a naive read model creates the row from v2, then v1 overwrites it with the old seat. Stamp
      each event with the aggregate's version, and in the consumer:</p>
      <ul>
        <li><code>version &lt;= last</code> → already seen, skip.</li>
        <li><code>version === last + 1</code> → apply, then check if the next one is parked.</li>
        <li><code>version &gt; last + 1</code> → gap: park it (or reject so the broker redelivers later).</li>
      </ul>
      <p>Partitioning the topic by aggregate id (Kafka message key = PNR) keeps events of one
      booking in order in the normal case. Versions handle the abnormal cases.</p>

      <div class="warn">A dedupe check in memory (a JS <code>Set</code>) is lost on restart and
      isn't shared between consumer instances. In production, the processed-ids table lives in the
      consumer's database and is written in the same transaction as the effect. Otherwise a crash
      between "effect done" and "id recorded" gives you the duplicate back.</div>

      <div class="tip"><strong>In the real world:</strong> "exactly-once" in broker marketing (e.g.
      Kafka's exactly-once semantics) covers the broker's own read-process-write within Kafka, not your
      database or your email provider. The practical recipe across systems is:
      at-least-once delivery (outbox) + idempotent consumers (inbox / unique keys) + per-aggregate
      ordering (partition key + version). Test it by delivering every message twice in your
      integration tests.</div>
    `,
    examples: [
      {
        title: 'Duplicate PaymentCaptured → double points (and the fix)',
        code: `// The same message delivered twice (outbox relay restart / broker redelivery after a timeout)
const deliveries = [
  { messageId: 'pay-0001', type: 'PaymentCaptured', memberId: 'M-42', pnr: 'SKY001', minor: 25000 },
  { messageId: 'pay-0001', type: 'PaymentCaptured', memberId: 'M-42', pnr: 'SKY001', minor: 25000 },
  { messageId: 'pay-0002', type: 'PaymentCaptured', memberId: 'M-42', pnr: 'SKY002', minor: 8000 },
];

const pointsFor = (minor) => (minor / 100) * 5; // 5 points per AUD

// ---------- ❌ Naive handler: "add points" is not idempotent ----------
function makeNaiveLoyalty() {
  const db = { balance: 0 };
  return {
    db,
    handle(msg) {
      db.balance += pointsFor(msg.minor);
      console.log('  naive: +' + pointsFor(msg.minor), 'for', msg.messageId, '-> balance', db.balance);
    },
  };
}

// ---------- ✅ Idempotent handler: remember processed message ids ----------
function makeIdempotentLoyalty() {
  const db = { balance: 0, processed: new Set() }; // processed ids live in the SAME db
  return {
    db,
    handle(msg) {
      if (db.processed.has(msg.messageId)) {
        console.log('  idempotent: skip duplicate', msg.messageId);
        return;
      }
      // In a real DB, these two writes are ONE transaction:
      //   INSERT INTO processed_messages(id) VALUES ($1);  -- unique key
      //   UPDATE accounts SET balance = balance + $2 ...;
      db.processed.add(msg.messageId);
      db.balance += pointsFor(msg.minor);
      console.log('  idempotent: +' + pointsFor(msg.minor), 'for', msg.messageId, '-> balance', db.balance);
    },
  };
}

console.log('naive consumer:');
const naive = makeNaiveLoyalty();
deliveries.forEach((m) => naive.handle(m));

console.log('idempotent consumer:');
const safe = makeIdempotentLoyalty();
deliveries.forEach((m) => safe.handle(m));

console.log('expected 1650 | naive:', naive.db.balance, '| idempotent:', safe.db.balance);

// ---------- Bonus: some operations are naturally idempotent ----------
const seatMap = {};
const assign = (msg) => (seatMap[msg.pnr] = msg.seat); // "set to X", not "add X"
assign({ pnr: 'SKY001', seat: '14C' });
assign({ pnr: 'SKY001', seat: '14C' });
console.log('set-style update applied twice:', seatMap);`,
        explain: `
          <details>
            <summary>The problem: "add points" applied twice</summary>
            <table>
              <tr><th>Delivery</th><th>Naive balance</th><th>Console</th></tr>
              <tr><td>pay-0001</td><td>1250</td><td><code>naive: +1250 for pay-0001 -&gt; balance 1250</code></td></tr>
              <tr><td>pay-0001 (again)</td><td><strong>2500</strong></td><td><code>naive: +1250 for pay-0001 -&gt; balance 2500</code></td></tr>
              <tr><td>pay-0002</td><td>2900</td><td><code>naive: +400 for pay-0002 -&gt; balance 2900</code></td></tr>
            </table>
            <p>The customer got 1,250 free points, worth real money. At SkyHop's scale, a broker
            hiccup during a sale could mint millions of points.</p>
          </details>
          <details>
            <summary>The fix: remember processed message ids</summary>
            <pre><code>if (db.processed.has(msg.messageId)) return;  // ① seen it: do nothing
db.processed.add(msg.messageId);              // ② record the id...
db.balance += pointsFor(msg.minor);           // ③ ...and the effect, in ONE transaction</code></pre>
            <ol>
              <li><strong>①</strong> The message id comes from the producer (the outbox row id), so a redelivery carries the same id.</li>
              <li><strong>②③</strong> Both writes must commit together. If ③ commits without ②, the duplicate is applied again. If ② commits without ③, the points are lost.</li>
            </ol>
            <table>
              <tr><th>Delivery</th><th>Processed ids</th><th>Balance</th><th>Console</th></tr>
              <tr><td>pay-0001</td><td>{pay-0001}</td><td>1250</td><td><code>idempotent: +1250 for pay-0001 -&gt; balance 1250</code></td></tr>
              <tr><td>pay-0001</td><td>unchanged</td><td>1250</td><td><code>idempotent: skip duplicate pay-0001</code></td></tr>
              <tr><td>pay-0002</td><td>{pay-0001, pay-0002}</td><td>1650</td><td><code>idempotent: +400 for pay-0002 -&gt; balance 1650</code></td></tr>
            </table>
            <p>Summary line: <code>expected 1650 | naive: 2900 | idempotent: 1650</code>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Give the second delivery a new id (<code>'pay-0001-retry'</code>). The idempotent consumer now double-credits too: dedupe only works if the <em>producer</em> keeps the id stable across retries. Generate it once, when the event is recorded (outbox row), never at publish time.</li>
              <li>The last line shows a naturally idempotent "set" update: <code>{"SKY001":"14C"}</code> after two applications. Whenever you can, model effects as "set to" rather than "add".</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Out of order: SeatChanged before BookingConfirmed',
        code: `// Events about ONE booking carry the aggregate's version: 1, 2, 3...
// The broker delivers them OUT OF ORDER (different partitions, a retry overtook the original).
const arrivals = [
  { pnr: 'SKY001', version: 2, type: 'SeatChanged', seat: '14C' },
  { pnr: 'SKY001', version: 1, type: 'BookingConfirmed', seat: '12A', name: 'Ana' },
  { pnr: 'SKY001', version: 2, type: 'SeatChanged', seat: '14C' }, // redelivered duplicate
  { pnr: 'SKY001', version: 3, type: 'SeatChanged', seat: '3F' },
];

function apply(row, e) {
  if (e.type === 'BookingConfirmed') return { name: e.name, seat: e.seat, status: 'CONFIRMED' };
  if (e.type === 'SeatChanged') return { ...row, seat: e.seat };
  return row;
}

// ---------- ❌ Naive check-in read model: apply in arrival order ----------
const naive = {};
// the first two arrivals = what the gate agent sees right now
for (const e of arrivals.slice(0, 2)) {
  naive[e.pnr] = apply(naive[e.pnr] ?? {}, e);
  console.log('naive  v' + e.version, e.type.padEnd(16), '->', JSON.stringify(naive[e.pnr]));
}
console.log('naive result: seat', naive.SKY001.seat, '(customer chose 14C!)');

// ---------- ✅ Version-aware: apply only the NEXT version, park gaps, skip old ones ----------
const rows = {}; // pnr -> { version, data }
const parked = {}; // pnr -> Map(version -> event)

function handle(e) {
  const row = rows[e.pnr] ?? { version: 0, data: {} };
  if (e.version <= row.version) {
    console.log('fixed  v' + e.version, e.type.padEnd(16), '-> skip (already at v' + row.version + ')');
    return;
  }
  if (e.version > row.version + 1) {
    parked[e.pnr] = parked[e.pnr] ?? new Map();
    parked[e.pnr].set(e.version, e);
    console.log('fixed  v' + e.version, e.type.padEnd(16), '-> park (waiting for v' + (row.version + 1) + ')');
    return;
  }
  rows[e.pnr] = { version: e.version, data: apply(row.data, e) };
  console.log('fixed  v' + e.version, e.type.padEnd(16), '->', JSON.stringify(rows[e.pnr].data));

  const next = parked[e.pnr]?.get(e.version + 1);
  if (next) {
    parked[e.pnr].delete(next.version);
    console.log('       unpark v' + next.version);
    handle(next);
  }
}

arrivals.forEach(handle);
console.log('fixed result: seat', rows.SKY001.data.seat, 'at v' + rows.SKY001.version);`,
        explain: `
          <details>
            <summary>The problem: arrival order ≠ event order</summary>
            <p>Ana confirmed SKY001 with seat 12A (v1), then changed to 14C (v2). The check-in read
            model receives v2 first:</p>
            <table>
              <tr><th>Arrival</th><th>Naive row</th><th>Console</th></tr>
              <tr><td>v2 SeatChanged 14C</td><td><code>{seat: 14C}</code> (row created from a partial event)</td><td><code>naive  v2 SeatChanged      -&gt; {"seat":"14C"}</code></td></tr>
              <tr><td>v1 BookingConfirmed 12A</td><td>overwritten → <strong>12A</strong></td><td><code>naive  v1 BookingConfirmed -&gt; {"name":"Ana","seat":"12A","status":"CONFIRMED"}</code></td></tr>
            </table>
            <p><code>naive result: seat 12A (customer chose 14C!)</code>: the gate prints a boarding pass for a
            seat someone else may now have.</p>
          </details>
          <details>
            <summary>Step by step: the version-aware handler</summary>
            <table>
              <tr><th>Arrival</th><th>Last applied</th><th>Decision</th><th>Console</th></tr>
              <tr><td>v2 SeatChanged</td><td>0</td><td>2 &gt; 0+1 → park</td><td><code>-&gt; park (waiting for v1)</code></td></tr>
              <tr><td>v1 BookingConfirmed</td><td>0</td><td>1 = 0+1 → apply</td><td><code>-&gt; {"name":"Ana","seat":"12A","status":"CONFIRMED"}</code></td></tr>
              <tr><td>(parked v2)</td><td>1</td><td>2 = 1+1 → unpark + apply</td><td><code>unpark v2</code><br><code>-&gt; {"name":"Ana","seat":"14C","status":"CONFIRMED"}</code></td></tr>
              <tr><td>v2 again (duplicate)</td><td>2</td><td>2 ≤ 2 → skip</td><td><code>-&gt; skip (already at v2)</code></td></tr>
              <tr><td>v3 SeatChanged 3F</td><td>2</td><td>apply</td><td><code>-&gt; {"name":"Ana","seat":"3F","status":"CONFIRMED"}</code></td></tr>
            </table>
            <p>Final: <code>fixed result: seat 3F at v3</code>. Note the version check also deduplicated
            the redelivered v2 for free: per-aggregate versions give you ordering <em>and</em> idempotency.</p>
          </details>
          <details>
            <summary>Trade-offs</summary>
            <ul>
              <li><strong>Parking needs a limit</strong>: if v1 never arrives (lost upstream), parked events pile up. Alert after a timeout, or fetch the current state from the source's API to resync.</li>
              <li><strong>Simpler alternative for read models</strong>: if each event carries the full new state (or you only care about the latest), just keep the highest version and ignore older ones: <code>if (e.version &lt;= row.version) return;</code>. No parking needed, but events that only contain a change (deltas) can't be applied this way.</li>
              <li><strong>Try:</strong> delete the parking block (the <code>if (e.version &gt; row.version + 1)</code> branch). v2 is applied to an empty row and v1 is then skipped as "old": a different wrong answer. Ordering bugs are sneaky.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Loyalty\'s consumer dedupes with an in-memory <code>Set</code> of message ids. After a deploy, some members got double points. Why?',
        options: [
          'Sets are unreliable in JavaScript',
          'The broker should have deduped',
          'Message ids are random',
          'The Set was emptied by the restart (and isn\'t shared across instances), so redelivered messages looked new. Store processed ids in the DB in the same transaction as the effect',
        ],
        answer: 3,
        why: 'Deduplication state must be durable, shared and atomic with the effect. A unique constraint on processed_messages(id) is the usual approach.',
      },
      {
        q: 'Which handler is naturally idempotent?',
        options: [
          '"Set booking SKY001\'s seat to 14C"',
          '"Add 1,250 points to member M-42"',
          '"Send a confirmation email"',
          '"Charge 238.00 AUD"',
        ],
        answer: 0,
        why: 'Setting a value to X twice yields X. Adding, sending and charging accumulate effects and need explicit dedupe (ids, idempotency keys).',
      },
      {
        q: 'Events for one booking are published to a Kafka topic with a random partition key. The check-in view sometimes shows an old seat. Best fix?',
        options: [
          'Add more partitions',
          'Sleep 1 second before handling each event',
          'Use the PNR as the message key so one booking\'s events stay in one ordered partition, and make the consumer check per-booking versions for retries',
          'Process events in alphabetical order',
        ],
        answer: 2,
        why: 'Partition by aggregate id for normal-case ordering; per-aggregate versions handle redeliveries and the odd out-of-order arrival.',
      },
      {
        q: 'Payments retries a "capture payment" call to the card provider after a network timeout. How do you avoid charging twice?',
        options: [
          'Never retry payments',
          'Refund every second charge manually',
          'Send an idempotency key (e.g. derived from the booking + attempt id) so the provider returns the original result for the retry',
          'Retry with a slightly different amount',
        ],
        answer: 2,
        why: 'Idempotency keys make retries of non-idempotent operations safe: the provider stores the first result and replays it for the same key.',
      },
    ],
    exercise: {
      task: `<p>Make the loyalty <code>BalanceProjection</code> safe against duplicates and reordering.
      Each message has a <code>messageId</code> and a per-member <code>version</code> (1, 2, 3…).</p>
      <ul>
        <li>Already-processed <code>messageId</code>, or <code>version &lt;=</code> the last applied → return <code>'duplicate'</code>, change nothing.</li>
        <li><code>version &gt;</code> last + 1 → return <code>'parked'</code>; apply it automatically once the missing version arrives.</li>
        <li>Otherwise apply (<code>PointsRedeemed</code> subtracts) and return <code>'applied'</code>.</li>
      </ul>`,
      starter: `// Read model: loyalty balance per member, fed by events from the member's account stream.
// Each message: { messageId, memberId, version, type: 'PointsAccrued' | 'PointsRedeemed', points }
class BalanceProjection {
  #balances = new Map(); // memberId -> balance

  balanceOf(memberId) {
    return this.#balances.get(memberId) ?? 0;
  }

  handle(msg) {
    // TODO 1: return 'duplicate' for a messageId already processed, or a version <= the last applied
    // TODO 2: return 'parked' for a version that skips ahead; apply it once the gap is filled
    // TODO 3: otherwise apply (redeem = minus) and return 'applied'
    const delta = msg.type === 'PointsRedeemed' ? -msg.points : msg.points;
    this.#balances.set(msg.memberId, this.balanceOf(msg.memberId) + delta);
    return 'applied';
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const p = new BalanceProjection();
const accrue1 = { messageId: 'm-1', memberId: 'M-42', version: 1, type: 'PointsAccrued', points: 1250 };
const accrue2 = { messageId: 'm-2', memberId: 'M-42', version: 2, type: 'PointsAccrued', points: 400 };
const redeem3 = { messageId: 'm-3', memberId: 'M-42', version: 3, type: 'PointsRedeemed', points: 1000 };

check('first message applied', p.handle(accrue1), 'applied');
check('same message again -> duplicate', p.handle(accrue1), 'duplicate');
check('balance not doubled', p.balanceOf('M-42'), 1250);

check('v3 before v2 -> parked', p.handle(redeem3), 'parked');
check('parked event not applied yet', p.balanceOf('M-42'), 1250);
check('v2 arrives -> applied', p.handle(accrue2), 'applied');
check('v3 unparked after v2', p.balanceOf('M-42'), 650);

check('redelivered v3 -> duplicate', p.handle(redeem3), 'duplicate');
const stale = { messageId: 'm-2b', memberId: 'M-42', version: 2, type: 'PointsAccrued', points: 400 };
check('new id but old version -> duplicate', p.handle(stale), 'duplicate');
check('final balance', p.balanceOf('M-42'), 650);
check('other members unaffected', p.handle({ ...accrue1, messageId: 'm-9', memberId: 'M-7' }), 'applied');`,
      hint: 'Keep three maps: processed ids (Set), per-member <code>{ version, balance }</code>, and per-member parked messages <code>Map(version → msg)</code>. After applying version N, look up N+1 in the parked map and call <code>this.handle(next)</code>.',
      solution: `// Read model: loyalty balance per member, fed by events from the member's account stream.
// Each message: { messageId, memberId, version, type: 'PointsAccrued' | 'PointsRedeemed', points }
class BalanceProjection {
  #seen = new Set(); // processed messageIds
  #members = new Map(); // memberId -> { version, balance }
  #parked = new Map(); // memberId -> Map(version -> msg)

  balanceOf(memberId) {
    return this.#members.get(memberId)?.balance ?? 0;
  }

  handle(msg) {
    if (this.#seen.has(msg.messageId)) return 'duplicate';
    const m = this.#members.get(msg.memberId) ?? { version: 0, balance: 0 };
    if (msg.version <= m.version) return 'duplicate';
    if (msg.version > m.version + 1) {
      if (!this.#parked.has(msg.memberId)) this.#parked.set(msg.memberId, new Map());
      this.#parked.get(msg.memberId).set(msg.version, msg);
      return 'parked';
    }
    this.#seen.add(msg.messageId);
    const delta = msg.type === 'PointsRedeemed' ? -msg.points : msg.points;
    this.#members.set(msg.memberId, { version: msg.version, balance: m.balance + delta });

    const next = this.#parked.get(msg.memberId)?.get(msg.version + 1);
    if (next) {
      this.#parked.get(msg.memberId).delete(next.version);
      this.handle(next);
    }
    return 'applied';
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const p = new BalanceProjection();
const accrue1 = { messageId: 'm-1', memberId: 'M-42', version: 1, type: 'PointsAccrued', points: 1250 };
const accrue2 = { messageId: 'm-2', memberId: 'M-42', version: 2, type: 'PointsAccrued', points: 400 };
const redeem3 = { messageId: 'm-3', memberId: 'M-42', version: 3, type: 'PointsRedeemed', points: 1000 };

check('first message applied', p.handle(accrue1), 'applied');
check('same message again -> duplicate', p.handle(accrue1), 'duplicate');
check('balance not doubled', p.balanceOf('M-42'), 1250);

check('v3 before v2 -> parked', p.handle(redeem3), 'parked');
check('parked event not applied yet', p.balanceOf('M-42'), 1250);
check('v2 arrives -> applied', p.handle(accrue2), 'applied');
check('v3 unparked after v2', p.balanceOf('M-42'), 650);

check('redelivered v3 -> duplicate', p.handle(redeem3), 'duplicate');
const stale = { messageId: 'm-2b', memberId: 'M-42', version: 2, type: 'PointsAccrued', points: 400 };
check('new id but old version -> duplicate', p.handle(stale), 'duplicate');
check('final balance', p.balanceOf('M-42'), 650);
check('other members unaffected', p.handle({ ...accrue1, messageId: 'm-9', memberId: 'M-7' }), 'applied');`,
    },
  },
);
