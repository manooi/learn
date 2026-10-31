window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── entities
  {
    id: 'entities',
    section: 'Tactical Building Blocks',
    title: 'Entities: Identity Over Attributes',
    explain: `
      <p>An <strong>entity</strong> is a domain object you care about <em>as a specific thing that
      continues over time</em>. What makes it "the same one" is its <strong>identity</strong>, not
      its current attribute values. Evans' classic test: if you change every attribute, is it still
      the same thing? A SkyHop passenger who fixes a typo in their name (<code>Jon</code> →
      <code>John</code>) is still the same passenger. A booking whose seat changes from 12A to 14C is
      still booking <code>SKY001</code>. Those are entities.</p>

      <h3>Equality by id, not by fields</h3>
      <p>Two different JS objects can represent the same entity (one loaded by the booking page,
      one by the check-in page). And two objects with identical fields can be different entities
      (two passengers both called "Jon Smith"). So entities compare by id:</p>
      <pre><code>equals(other) {
  return other instanceof Passenger &amp;&amp; other.id === this.id;
}</code></pre>
      <p><code>===</code> (same object in memory) is the wrong question. "Same fields" is also the
      wrong question. The right one is "same identity?".</p>

      <h3>Entities have a lifecycle</h3>
      <p>Because they continue over time, entities move through states, and the model should say
      which moves are legal. A SkyHop booking goes <code>HELD → CONFIRMED → CANCELLED</code> (or
      <code>HELD → EXPIRED</code> if the 20-minute hold runs out). Putting the transitions in
      methods like <code>confirm()</code> and <code>cancel()</code>, instead of letting anyone set
      <code>booking.status = 'whatever'</code>, is the first step away from an
      <em>anemic</em> model (plain data bags with all rules scattered in services).</p>

      <h3>Where does the id come from?</h3>
      <ul>
        <li><strong>Natural id</strong>: something the domain already uses. The airline PNR
        (booking reference, e.g. <code>K7XQ2M</code>), a passport number, an IATA flight number +
        date. Meaningful to humans, but outside forces can change or reuse them: PNRs are only
        6 characters, so airlines recycle them after a booking is archived, and a passport gets
        renewed.</li>
        <li><strong>Surrogate id</strong>: an id you invent (<code>bkg_000123</code>, a UUID, a DB
        sequence). Stable and unique, but meaningless to the business.</li>
        <li>Common real choice: a surrogate id as the internal key <em>plus</em> the PNR as a
        unique business attribute that people search by.</li>
        <li><strong>Who generates it?</strong> Generating ids in the domain/application (before
        saving) means the entity is complete from the moment it exists and you can reference it
        in events immediately. Waiting for a DB auto-increment means a half-born object with
        <code>id = null</code> until it is saved.</li>
      </ul>

      <div class="warn">Not everything with an id column is an entity. If two things with the same
      values are interchangeable for the business (an amount of money, a seat number, an
      airport code), it's a <strong>value object</strong> (next lesson), even if the database
      happens to give the row an id.</div>

      <div class="tip"><strong>In the real world:</strong> most bugs around entities are about
      equality: code that uses <code>===</code> on objects loaded twice, or <code>Set</code>s of
      entities that contain "duplicates". Give each entity an <code>equals</code> (or compare ids
      explicitly), make the id read-only, and expose state changes only through intention-revealing
      methods. Teams using ORMs often keep a surrogate DB key internally and expose a business id
      (PNR, order number) to users.</div>
    `,
    examples: [
      {
        title: 'Identity survives attribute changes',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Passenger {
  #id;

  constructor(id, firstName, lastName) {
    if (!id) throw new DomainError('A passenger needs an id');
    this.#id = id;
    this.firstName = firstName;
    this.lastName = lastName;
  }

  get id() {
    return this.#id;
  }

  correctName(firstName, lastName) {
    if (!firstName || !lastName) throw new DomainError('Name parts cannot be empty');
    this.firstName = firstName;
    this.lastName = lastName;
  }

  equals(other) {
    return other instanceof Passenger && other.id === this.id;
  }
}

// The same DB row loaded by two different pages
const fromBookingPage = new Passenger('PAX-7', 'Jon', 'Smith');
const fromCheckInPage = new Passenger('PAX-7', 'Jon', 'Smith');

// A different human who happens to have the same name
const otherJon = new Passenger('PAX-8', 'Jon', 'Smith');

console.log('same JS object?', fromBookingPage === fromCheckInPage);
console.log('same passenger?', fromBookingPage.equals(fromCheckInPage));
console.log('same name -> same passenger?', fromBookingPage.equals(otherJon));

// A typo fix changes attributes, not identity
fromBookingPage.correctName('John', 'Smith');
console.log('after fix:', fromBookingPage.firstName, fromBookingPage.lastName);
console.log('still the same passenger?', fromBookingPage.equals(fromCheckInPage));

// The id is read-only (getter, no setter). Modules run in strict mode, so this throws.
try {
  fromBookingPage.id = 'PAX-999';
} catch (e) {
  console.log('reassign id ->', e.name, '| id is still', fromBookingPage.id);
}

try {
  fromBookingPage.correctName('', 'Smith');
} catch (e) {
  console.log('rejected:', e.message);
}`,
      },
      {
        title: 'A booking entity with a lifecycle',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Deterministic PNR generator (real PNRs are random 6-char codes)
let pnrSeq = 0;
function nextPnr() {
  pnrSeq += 1;
  return 'SKY' + String(pnrSeq).padStart(3, '0');
}

class Booking {
  #pnr;
  #status = 'HELD';
  #seats = new Map(); // passengerId -> seat

  constructor(pnr) {
    this.#pnr = pnr;
  }

  get pnr() {
    return this.#pnr;
  }

  get status() {
    return this.#status;
  }

  seatOf(passengerId) {
    return this.#seats.get(passengerId) ?? 'none';
  }

  assignSeat(passengerId, seat) {
    if (this.#status === 'CANCELLED') {
      throw new DomainError('Booking ' + this.#pnr + ' is cancelled');
    }
    this.#seats.set(passengerId, seat);
  }

  confirm() {
    if (this.#status !== 'HELD') {
      throw new DomainError('Only a HELD booking can be confirmed (is ' + this.#status + ')');
    }
    this.#status = 'CONFIRMED';
  }

  cancel() {
    if (this.#status === 'CANCELLED') {
      throw new DomainError('Booking ' + this.#pnr + ' is already cancelled');
    }
    this.#status = 'CANCELLED';
  }

  equals(other) {
    return other instanceof Booking && other.pnr === this.pnr;
  }
}

const booking = new Booking(nextPnr());
console.log(booking.pnr, 'status:', booking.status);

booking.assignSeat('PAX-1', '12A');
booking.confirm();
booking.assignSeat('PAX-1', '14C'); // seat change: still the same booking
console.log(booking.pnr, 'status:', booking.status, '| PAX-1 seat:', booking.seatOf('PAX-1'));

booking.cancel();
console.log(booking.pnr, 'status:', booking.status);

const illegalMoves = [
  ['confirm a cancelled booking', () => booking.confirm()],
  ['change seat after cancel', () => booking.assignSeat('PAX-1', '1A')],
  ['cancel twice', () => booking.cancel()],
];

for (const [label, move] of illegalMoves) {
  try {
    move();
    console.log('allowed?!', label);
  } catch (e) {
    console.log('rejected', label + ':', e.message);
  }
}

const second = new Booking(nextPnr());
console.log('next booking:', second.pnr, '| equals first?', second.equals(booking));`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop loads booking <code>SKY001</code> in two places and gets objects <code>a</code> and <code>b</code>. A developer writes <code>if (a === b)</code> to check whether they are the same booking. What happens?',
        options: [
          'Works: same PNR means same object',
          'It throws a TypeError',
          'It is <code>false</code> even though they are the same booking, because they are two objects in memory. Compare ids instead',
          'It is <code>true</code> only if every field matches',
        ],
        answer: 2,
        why: 'Entity identity is the id (PNR), not the memory reference. Two loads produce two objects. Use <code>a.equals(b)</code> or compare <code>a.pnr === b.pnr</code>.',
      },
      {
        q: 'A passenger renews their passport, so the passport number changes. SkyHop used the passport number as the passenger id. What is the problem?',
        options: [
          'The passenger now looks like a brand-new person: history, loyalty and bookings are "lost". A natural key from outside the domain changed',
          'None, passport numbers are unique',
          'Passport numbers are too long for a database key',
          'It breaks value-object equality',
        ],
        answer: 0,
        why: 'Natural ids are only as stable as the outside world. Use a surrogate id the domain controls, and keep the passport number as an attribute (possibly with history).',
      },
      {
        q: 'Which of these is most naturally an <em>entity</em> in SkyHop?',
        options: [
          'The price "59.99 AUD"',
          'Seat number "12A" as a label',
          'The airport code "SYD"',
          'A booking that goes HELD → CONFIRMED → CANCELLED while its seat and contact email change',
        ],
        answer: 3,
        why: 'The booking has a lifecycle and must be tracked as the same thing as its attributes change. The others are interchangeable values.',
      },
      {
        q: 'Code elsewhere does <code>booking.status = "CONFIRMED"</code> directly on a cancelled booking. What modelling move prevents this?',
        options: [
          'Add a database CHECK constraint only',
          'Make status private and expose <code>confirm()</code> / <code>cancel()</code> methods that enforce the legal transitions',
          'Store status as a number',
          'Add a comment saying "do not set this"',
        ],
        answer: 1,
        why: 'Intention-revealing methods own the lifecycle rules, so no caller can skip them. A DB constraint is a useful backup, but the rule belongs in the model.',
      },
    ],
    exercise: {
      task: `<p>Turn this data-bag <code>Booking</code> into a proper entity:</p>
      <ul>
        <li><code>pnr</code> must be read-only (use a <code>#private</code> field + getter).</li>
        <li><code>equals(other)</code> compares by PNR only (contact email can differ).</li>
        <li><code>confirm()</code> is only allowed from <code>HELD</code>; otherwise throw a <code>DomainError</code>.</li>
        <li><code>cancel()</code> is allowed from <code>HELD</code> or <code>CONFIRMED</code>; cancelling twice throws.</li>
      </ul>
      <p>The checks at the bottom should all print ✅.</p>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Booking {
  constructor(pnr, email) {
    this.pnr = pnr; // TODO: make read-only
    this.email = email;
    this.status = 'HELD';
  }

  equals(other) {
    // TODO: compare by identity
    return false;
  }

  confirm() {
    // TODO: only from HELD
    this.status = 'CONFIRMED';
  }

  cancel() {
    // TODO: only from HELD or CONFIRMED
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

const a = new Booking('SKY001', 'jon@example.com');
const b = new Booking('SKY001', 'john.smith@example.com');
const c = new Booking('SKY002', 'jon@example.com');

check('same PNR, different email -> equal', a.equals(b), true);
check('different PNR -> not equal', a.equals(c), false);

let pnrAfter;
try {
  a.pnr = 'HACKED';
} catch (e) {
  // strict mode: assigning to a getter-only property throws
}
pnrAfter = a.pnr;
check('pnr is read-only', pnrAfter, 'SKY001');

a.confirm();
check('HELD -> CONFIRMED', a.status, 'CONFIRMED');
expectThrows('confirm twice', () => a.confirm());
a.cancel();
check('CONFIRMED -> CANCELLED', a.status, 'CANCELLED');
expectThrows('cancel twice', () => a.cancel());
expectThrows('confirm after cancel', () => a.confirm());`,
      hint: 'Store the PNR in <code>#pnr</code> and add <code>get pnr() { return this.#pnr; }</code> with no setter. For the status rules, check <code>this.status</code> at the top of each method and <code>throw new DomainError(...)</code> before changing anything.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Booking {
  #pnr;
  #status = 'HELD';

  constructor(pnr, email) {
    this.#pnr = pnr;
    this.email = email;
  }

  get pnr() {
    return this.#pnr;
  }

  get status() {
    return this.#status;
  }

  equals(other) {
    return other instanceof Booking && other.pnr === this.#pnr;
  }

  confirm() {
    if (this.#status !== 'HELD') {
      throw new DomainError('Cannot confirm ' + this.#pnr + ': it is ' + this.#status);
    }
    this.#status = 'CONFIRMED';
  }

  cancel() {
    if (this.#status !== 'HELD' && this.#status !== 'CONFIRMED') {
      throw new DomainError('Cannot cancel ' + this.#pnr + ': it is ' + this.#status);
    }
    this.#status = 'CANCELLED';
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

const a = new Booking('SKY001', 'jon@example.com');
const b = new Booking('SKY001', 'john.smith@example.com');
const c = new Booking('SKY002', 'jon@example.com');

check('same PNR, different email -> equal', a.equals(b), true);
check('different PNR -> not equal', a.equals(c), false);

let pnrAfter;
try {
  a.pnr = 'HACKED';
} catch (e) {
  // strict mode: assigning to a getter-only property throws
}
pnrAfter = a.pnr;
check('pnr is read-only', pnrAfter, 'SKY001');

a.confirm();
check('HELD -> CONFIRMED', a.status, 'CONFIRMED');
expectThrows('confirm twice', () => a.confirm());
a.cancel();
check('CONFIRMED -> CANCELLED', a.status, 'CANCELLED');
expectThrows('cancel twice', () => a.cancel());
expectThrows('confirm after cancel', () => a.confirm());`,
    },
  },

  // ───────────────────────────────────────────────────────────── value-objects
  {
    id: 'value-objects',
    section: 'Tactical Building Blocks',
    title: 'Value Objects',
    explain: `
      <p>A <strong>value object</strong> describes something by its value only: an amount of
      money, a seat number, a flight number, an email address, a date range. Two value objects
      with the same values are <strong>interchangeable</strong>. Nobody cares <em>which</em>
      "35.00 AUD" you have, only that it is 35.00 AUD.</p>

      <h3>Three properties</h3>
      <ul>
        <li><strong>Equality by value</strong>: <code>Money(3500, 'AUD').equals(Money(3500, 'AUD'))</code>
        is true, even for two different objects.</li>
        <li><strong>Immutable</strong>: you never change a value, you replace it. <code>price.discount(20)</code>
        returns a <em>new</em> price. This is what makes sharing them safe.</li>
        <li><strong>Self-validating</strong>: the constructor refuses to build an invalid value.
        Once you hold a <code>SeatNumber</code>, you know it's valid. No more re-checking
        <code>'12G'</code> in five controllers.</li>
      </ul>

      <h3>Why bother? Primitive obsession</h3>
      <p>Most codebases pass <code>price: number</code>, <code>seat: string</code>,
      <code>email: string</code> everywhere. That causes three classic bugs:</p>
      <ul>
        <li><strong>Float money</strong>: <code>0.1 + 0.2 !== 0.3</code>, and
        <code>1.15 * 100</code> is <code>114.99999999999999</code>. Store money as
        <strong>integer minor units</strong> (cents) plus a currency.</li>
        <li><strong>Mixed units</strong>: adding a THB fare to an AUD bag fee "works" with plain
        numbers. A <code>Money</code> type refuses.</li>
        <li><strong>Validation drift</strong>: one endpoint accepts <code>'12a'</code>, another
        rejects it, a third stores <code>' 12A '</code>. Normalising in one constructor fixes all.</li>
      </ul>

      <h3>Rich behaviour lives here</h3>
      <p>Value objects are a great home for logic: <code>money.allocate(3)</code>,
      <code>seat.isWindow</code>, <code>dateRange.overlaps(other)</code>. Moving logic into small,
      immutable, easily-tested values is often the cheapest big win in a DDD refactor. Many
      experienced modellers say: <em>prefer value objects; use entities only when you truly need
      identity</em>.</p>

      <pre><code>// TypeScript can add "branded" types so a raw string can't be passed by mistake
type PNR = string &amp; { readonly __brand: 'PNR' };
function findBooking(pnr: PNR) { /* ... */ }
findBooking('SKY001');            // compile error
findBooking(parsePnr('SKY001'));  // ok: went through validation</code></pre>

      <div class="warn"><strong>Persisting values:</strong> a value object does not need its own
      table or id. Store <code>Money</code> as two columns (<code>price_minor</code>,
      <code>price_currency</code>) or as JSON inside its entity's row. If you catch yourself
      giving a value object an id so you can update it in place, it's probably an entity, or
      you're mutating something you should replace.</div>

      <div class="tip"><strong>In the real world:</strong> payment providers such as Stripe take
      amounts as integers in the smallest currency unit (cents), exactly to avoid float bugs. Watch out for
      currencies with 0 decimals (JPY) or 3 (KWD): the number of decimals belongs to the currency,
      not to your code. Start with <code>Money</code>, <code>Email</code> and your domain's ids
      (PNR, flight number): those three alone remove a surprising number of bugs.</div>
    `,
    examples: [
      {
        title: 'Money: integer minor units + currency',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- the float problem ----------
console.log('float: 0.1 + 0.2 =', 0.1 + 0.2);
console.log('float: 1.15 * 100 =', 1.15 * 100, '-> Math.floor gives', Math.floor(1.15 * 100));

// ---------- Money value object ----------
const DECIMALS = { AUD: 2, THB: 2, JPY: 0 };

class Money {
  constructor(minor, currency) {
    if (!(currency in DECIMALS)) throw new DomainError('Unknown currency ' + currency);
    if (!Number.isInteger(minor)) throw new DomainError('Minor units must be an integer: ' + minor);
    this.minor = minor; // cents for AUD, satang for THB, yen for JPY
    this.currency = currency;
    Object.freeze(this); // immutable: every operation returns a NEW Money
  }

  // Parse from a decimal STRING so we never go through a float
  static of(text, currency) {
    const places = DECIMALS[currency];
    const [whole, frac = ''] = String(text).split('.');
    if (frac.length > places) {
      throw new DomainError(text + ' has more than ' + places + ' decimals for ' + currency);
    }
    const minor = Number(whole) * 10 ** places + Number(frac.padEnd(places, '0') || 0);
    return new Money(minor, currency);
  }

  add(other) {
    this.#sameCurrency(other);
    return new Money(this.minor + other.minor, this.currency);
  }

  times(quantity) {
    return new Money(Math.round(this.minor * quantity), this.currency);
  }

  equals(other) {
    return other instanceof Money && other.minor === this.minor && other.currency === this.currency;
  }

  toString() {
    const places = DECIMALS[this.currency];
    return (this.minor / 10 ** places).toFixed(places) + ' ' + this.currency;
  }

  #sameCurrency(other) {
    if (other.currency !== this.currency) {
      throw new DomainError('Cannot combine ' + this.currency + ' with ' + other.currency);
    }
  }
}

const tenCents = Money.of('0.10', 'AUD');
const twentyCents = Money.of('0.20', 'AUD');
console.log('Money: 0.10 + 0.20 =', tenCents.add(twentyCents).toString());
console.log('Money.of("1.15") minor units:', Money.of('1.15', 'AUD').minor);

// A SkyHop basket: fare + 2 bags + seat
const fare = Money.of('59.99', 'AUD');
const bag = Money.of('35.00', 'AUD');
const seat = Money.of('12.50', 'AUD');
const total = fare.add(bag.times(2)).add(seat);
console.log('basket total:', total.toString(), '| fare unchanged:', fare.toString());

// Equality by value: two separately created objects
const a = Money.of('35', 'AUD');
console.log('a === bag:', a === bag, '| a.equals(bag):', a.equals(bag));

// Rejected: mixing currencies (a Bangkok fare paid in AUD needs an explicit FX rate)
try {
  fare.add(Money.of('1200.00', 'THB'));
} catch (e) {
  console.log('rejected:', e.message);
}

try {
  Money.of('9.999', 'AUD');
} catch (e) {
  console.log('rejected:', e.message);
}

// Immutable: frozen object, assignment throws in strict mode
try {
  fare.minor = 0;
} catch (e) {
  console.log('fare.minor = 0 ->', e.name, '| fare is still', fare.toString());
}`,
        explain: `
          <details>
            <summary>The problem: floats and bare numbers lie about money</summary>
            <p>The first two lines show what goes wrong with <code>price: number</code>:</p>
            <table>
              <tr><th>Expression</th><th>Result</th><th>Why it hurts</th></tr>
              <tr><td><code>0.1 + 0.2</code></td><td><code>0.30000000000000004</code></td><td>Totals off by a fraction of a cent; <code>===</code> comparisons fail</td></tr>
              <tr><td><code>1.15 * 100</code></td><td><code>114.99999999999999</code></td><td>"Convert to cents" with <code>Math.floor</code> gives <strong>114</strong>: the customer is charged a cent less, the ledger doesn't balance</td></tr>
              <tr><td><code>59.99 + 1200</code> (AUD fare + THB fare)</td><td><code>1259.99</code></td><td>Nonsense number, no error at all</td></tr>
            </table>
            <p>Binary floats can't represent most decimal fractions exactly. That's fine for physics,
            fatal for money.</p>
          </details>
          <details>
            <summary>Step by step: what the console shows</summary>
            <table>
              <tr><th>Step</th><th>Code</th><th>Console</th></tr>
              <tr><td>1</td><td>float sums</td><td><code>float: 0.1 + 0.2 = 0.30000000000000004</code><br><code>float: 1.15 * 100 = 114.99999999999999 -&gt; Math.floor gives 114</code></td></tr>
              <tr><td>2</td><td><code>Money.of('0.10') .add(Money.of('0.20'))</code>: 10 + 20 cents as integers</td><td><code>Money: 0.10 + 0.20 = 0.30 AUD</code></td></tr>
              <tr><td>3</td><td><code>Money.of('1.15')</code> parses the <em>string</em> "1" and "15", never a float</td><td><code>Money.of("1.15") minor units: 115</code></td></tr>
              <tr><td>4</td><td>5999 + 2×3500 + 1250 = 14249 cents. <code>fare</code> is not modified: <code>add</code> returns new objects</td><td><code>basket total: 142.49 AUD | fare unchanged: 59.99 AUD</code></td></tr>
              <tr><td>5</td><td>Two different objects, same value</td><td><code>a === bag: false | a.equals(bag): true</code></td></tr>
              <tr><td>6</td><td>AUD + THB → <code>#sameCurrency</code> throws</td><td><code>rejected: Cannot combine AUD with THB</code></td></tr>
              <tr><td>7</td><td>3 decimals for a 2-decimal currency</td><td><code>rejected: 9.999 has more than 2 decimals for AUD</code></td></tr>
              <tr><td>8</td><td>Assigning to a frozen object in a module (strict mode)</td><td><code>fare.minor = 0 -&gt; TypeError | fare is still 59.99 AUD</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>if (!Number.isInteger(minor)) throw ...      // ① only whole cents can exist
Object.freeze(this);                          // ② immutable after construction
const [whole, frac = ''] = String(text).split('.');  // ③ parse text, never float math
return new Money(this.minor + other.minor, this.currency);  // ④ new value, old untouched
if (other.currency !== this.currency) throw ...      // ⑤ currency is part of the value</code></pre>
            <ol>
              <li><strong>①</strong> The invariant "money is a whole number of minor units" is checked once, in the constructor. No invalid <code>Money</code> can exist anywhere in the system.</li>
              <li><strong>②</strong> Frozen + every operation returns a new instance. You can hand the same <code>fare</code> to ten bookings safely.</li>
              <li><strong>③</strong> Input from forms and APIs arrives as text. Splitting the string avoids ever touching <code>1.15 * 100</code>.</li>
              <li><strong>④</strong> <code>add</code> and <code>times</code> are pure: that's why "fare unchanged" prints 59.99.</li>
              <li><strong>⑤</strong> Converting THB to AUD needs an exchange rate and a timestamp: a separate, explicit domain operation, never an accident.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>console.log(Money.of('1000', 'JPY').toString())</code>: JPY has 0 decimals, so it prints <code>1000 JPY</code>, and <code>Money.of('10.5', 'JPY')</code> is rejected.</li>
              <li>Replace <code>Object.freeze(this);</code> with a comment and run again: the last line now prints nothing, because <code>fare.minor = 0</code> silently succeeds. That's the aliasing bug from the next example waiting to happen.</li>
              <li>Call <code>bag.times(0.15)</code> (15% of 35.00 = 5.25): <code>Math.round</code> decides the rounding. In a real system the rounding rule (half-up, banker's) is a business decision. Ask finance!</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'SeatNumber, FlightNumber, Email + the aliasing bug',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- Part 1: the aliasing bug with a mutable shared object ----------
const promoFare = { amount: 100, currency: 'AUD' }; // plain mutable object

const bookingA = { pnr: 'SKY001', price: promoFare };
const bookingB = { pnr: 'SKY002', price: promoFare }; // same object, not a copy!

// Agent applies a 20% staff discount to booking A only... or so they think
bookingA.price.amount = bookingA.price.amount * 0.8;

console.log('A price:', bookingA.price.amount, '| B price:', bookingB.price.amount);
console.log('B silently changed:', bookingB.price.amount !== 100);

// ---------- Part 2: immutable value objects that validate themselves ----------
class SeatNumber {
  constructor(text) {
    const normalized = String(text).trim().toUpperCase();
    const match = normalized.match(/^([0-9]{1,2})([A-F])$/);
    if (!match) throw new DomainError('Invalid seat "' + text + '" (expected row + A-F, e.g. 12A)');
    const row = Number(match[1]);
    if (row < 1 || row > 30) throw new DomainError('Row ' + row + ' does not exist on an A320');
    this.row = row;
    this.letter = match[2];
    Object.freeze(this);
  }

  get isWindow() {
    return this.letter === 'A' || this.letter === 'F';
  }

  equals(other) {
    return other instanceof SeatNumber && other.row === this.row && other.letter === this.letter;
  }

  toString() {
    return this.row + this.letter;
  }
}

class FlightNumber {
  constructor(text) {
    const compact = String(text).replaceAll(' ', '').toUpperCase();
    const match = compact.match(/^([A-Z0-9]{2})([0-9]{1,4})$/);
    if (!match) throw new DomainError('Invalid flight number "' + text + '"');
    this.airline = match[1];
    this.number = Number(match[2]); // SH0101 and SH101 are the same flight
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof FlightNumber && other.toString() === this.toString();
  }

  toString() {
    return this.airline + this.number;
  }
}

class Email {
  constructor(text) {
    const value = String(text).trim().toLowerCase();
    if (!/^[^@ ]+@[^@ ]+[.][a-z]{2,}$/.test(value)) {
      throw new DomainError('Invalid email "' + text + '"');
    }
    this.value = value;
    Object.freeze(this);
  }

  equals(other) {
    return other instanceof Email && other.value === this.value;
  }

  toString() {
    return this.value;
  }
}

const seat = new SeatNumber(' 12a ');
console.log('seat:', seat.toString(), '| window?', seat.isWindow);
console.log('12A equals 12a?', seat.equals(new SeatNumber('12a')));
console.log('SH0101 equals sh 101?', new FlightNumber('SH0101').equals(new FlightNumber('sh 101')));
console.log('email:', new Email('  Jon.Smith@Example.COM ').toString());

const badInputs = [
  () => new SeatNumber('12G'),
  () => new SeatNumber('0A'),
  () => new SeatNumber('45C'),
  () => new FlightNumber('SKYHOP1'),
  () => new Email('jon@'),
];

for (const make of badInputs) {
  try {
    make();
  } catch (e) {
    console.log('rejected:', e.message);
  }
}

// ---------- Part 3: the aliasing bug cannot happen with a frozen value ----------
class Price {
  constructor(amount, currency) {
    this.amount = amount;
    this.currency = currency;
    Object.freeze(this);
  }

  discount(percent) {
    return new Price(Math.round(this.amount * (100 - percent)) / 100, this.currency);
  }
}

const promo = new Price(100, 'AUD');
const bookingC = { pnr: 'SKY003', price: promo };
const bookingD = { pnr: 'SKY004', price: promo }; // sharing is now SAFE

bookingC.price = bookingC.price.discount(20); // replace the value, never mutate it
console.log('C price:', bookingC.price.amount, '| D price:', bookingD.price.amount);`,
        explain: `
          <details>
            <summary>The problem: a shared mutable object changes behind your back</summary>
            <p>Part 1 hands the <em>same</em> plain object <code>promoFare</code> to two bookings. That's
            normal: a pricing service returns one fare object, the code assigns it twice. Then:</p>
            <table>
              <tr><th>Step</th><th>Memory</th><th>Console</th></tr>
              <tr><td>1</td><td><code>bookingA.price</code> and <code>bookingB.price</code> both point to one object <code>{amount: 100}</code></td><td></td></tr>
              <tr><td>2</td><td><code>bookingA.price.amount = 80</code> writes into that one shared object</td><td></td></tr>
              <tr><td>3</td><td>B reads the same object</td><td><code>A price: 80 | B price: 80</code><br><code>B silently changed: true</code></td></tr>
            </table>
            <p>The staff discount "leaked" to a customer who never got it. Nobody touched
            <code>bookingB</code>! In a real app the two references are in different modules, so this
            bug is very hard to trace. This is <strong>aliasing</strong>: two names for one mutable thing.</p>
          </details>
          <details>
            <summary>The fix: values that cannot be changed, only replaced</summary>
            <pre><code>class Price {
  constructor(amount, currency) {
    ...
    Object.freeze(this);                 // ① can't be modified
  }
  discount(percent) {
    return new Price(..., this.currency); // ② returns a NEW Price
  }
}
bookingC.price = bookingC.price.discount(20);  // ③ C now points to a new object</code></pre>
            <ol>
              <li><strong>①</strong> Nobody can write into the shared object any more.</li>
              <li><strong>②</strong> Operations produce new values.</li>
              <li><strong>③</strong> Only C's <em>reference</em> changes. D still points to the original <code>100</code>.</li>
            </ol>
            <table>
              <tr><th>Step</th><th>Memory</th><th>Console</th></tr>
              <tr><td>1</td><td>C and D both point to frozen <code>Price(100)</code> (safe to share)</td><td></td></tr>
              <tr><td>2</td><td><code>discount(20)</code> creates <code>Price(80)</code>; C points to it</td><td></td></tr>
              <tr><td>3</td><td>D still points to <code>Price(100)</code></td><td><code>C price: 80 | D price: 100</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: self-validating values</summary>
            <table>
              <tr><th>Input</th><th>What the constructor does</th><th>Console</th></tr>
              <tr><td><code>' 12a '</code></td><td>trim + uppercase → <code>12A</code>, row 12 letter A</td><td><code>seat: 12A | window? true</code></td></tr>
              <tr><td><code>'12a'</code> vs <code>12A</code></td><td>both normalise to the same value</td><td><code>12A equals 12a? true</code></td></tr>
              <tr><td><code>'SH0101'</code> vs <code>'sh 101'</code></td><td>remove spaces, uppercase, number → 101</td><td><code>SH0101 equals sh 101? true</code></td></tr>
              <tr><td><code>'  Jon.Smith@Example.COM '</code></td><td>trim + lowercase</td><td><code>email: jon.smith@example.com</code></td></tr>
              <tr><td><code>'12G'</code></td><td>regex only allows A–F</td><td><code>rejected: Invalid seat "12G" (expected row + A-F, e.g. 12A)</code></td></tr>
              <tr><td><code>'0A'</code>, <code>'45C'</code></td><td>row outside 1–30</td><td><code>rejected: Row 0 does not exist on an A320</code><br><code>rejected: Row 45 does not exist on an A320</code></td></tr>
              <tr><td><code>'SKYHOP1'</code></td><td>not 2-char airline + 1–4 digits</td><td><code>rejected: Invalid flight number "SKYHOP1"</code></td></tr>
              <tr><td><code>'jon@'</code></td><td>no domain</td><td><code>rejected: Invalid email "jon@"</code></td></tr>
            </table>
            <p>Once a <code>SeatNumber</code> exists it is valid, so the rest of the code never checks again.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>In Part 1, change <code>bookingB</code> to <code>price: { ...promoFare }</code> (a copy). B stays at 100. Copying works, but every caller must remember to do it. Freezing makes it impossible to forget.</li>
              <li>Add <code>seat.row = 1</code> after creating <code>seat</code>: you get a TypeError, because the value is frozen.</li>
              <li>Add a <code>get isAisle()</code> to <code>SeatNumber</code> (C and D on an A320). Behaviour like this belongs on the value, not in a <code>SeatUtils</code> file.</li>
            </ul>
            <div class="tip">Validation in a value object is about <em>shape</em> rules that are always true (a seat looks like 12A). Rules that depend on context ("is 12A free on SH101 tomorrow?") belong to an aggregate or a domain service.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'A SkyHop report sums fares stored as JS numbers in dollars and is off by a few cents per thousand bookings. What is the DDD-style fix?',
        options: [
          'Round with <code>toFixed(2)</code> at the end',
          'A <code>Money</code> value object holding integer minor units + currency, with <code>add</code>/<code>allocate</code> that never use floats',
          'Use <code>parseFloat</code> instead of <code>Number</code>',
          'Store fares as strings',
        ],
        answer: 1,
        why: 'Integer cents remove float error, and the currency travels with the amount, so mixing AUD and THB is rejected instead of silently added.',
      },
      {
        q: 'Two bookings share the same <code>baggage</code> object <code>{ kg: 20 }</code>. Upgrading booking A to 30kg also upgrades booking B. Best fix?',
        options: [
          'Give each baggage object an id',
          'Deep-clone the whole booking on every read',
          'Add a lock around the baggage object',
          'Make <code>BagAllowance</code> an immutable value object; upgrading returns a new allowance that A references',
        ],
        answer: 3,
        why: 'This is aliasing. Immutable values can be shared safely because nobody can change them; you replace the reference instead.',
      },
      {
        q: 'The check-in team asks: "Should <code>SeatNumber</code> be an entity because seat 12A on SH101 tomorrow is a specific physical seat that gets assigned?"',
        options: [
          'The label "12A" is a value. What has identity and lifecycle is the <em>seat assignment</em> (or the flight\'s seat inventory), which can use a <code>SeatNumber</code> value',
          'Yes, every seat is an entity',
          'No, seats should be plain strings',
          'Yes, and it should have its own repository',
        ],
        answer: 0,
        why: 'Ask "does the business track it over time as the same thing?" The assignment of PAX-1 to 12A on SH101/2026-11-01 does; the label "12A" is just a value used inside it.',
      },
      {
        q: 'Where should "an email must contain @ and a domain, and is compared case-insensitively" live?',
        options: [
          'In every controller that receives an email',
          'In a database trigger',
          'In an <code>Email</code> value object constructor that normalises and validates once',
          'In the front-end only',
        ],
        answer: 2,
        why: 'Self-validating value objects make invalid states unrepresentable. The UI can validate too, for UX, but the model is the source of truth.',
      },
    ],
    exercise: {
      task: `<p>A family of 3 books a 100.00 AUD group fare and wants it split per passenger for their
      receipts. Finish the <code>Money</code> value object:</p>
      <ul>
        <li>Reject non-integer minor units (throw <code>DomainError</code>) and freeze the object.</li>
        <li><code>add</code> rejects different currencies.</li>
        <li><code>equals</code> compares by value (minor + currency).</li>
        <li><code>allocate(n)</code> returns <code>n</code> Money parts that sum exactly to the original:
        100.00 / 3 → 33.34, 33.33, 33.33 (the first parts get the leftover cents). Reject <code>n &lt; 1</code>.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Money {
  constructor(minor, currency) {
    // TODO: reject non-integer minor units, then freeze
    this.minor = minor;
    this.currency = currency;
  }

  add(other) {
    // TODO: reject mixed currencies
    return new Money(this.minor + other.minor, this.currency);
  }

  equals(other) {
    // TODO: equality by value (minor + currency)
    return this === other;
  }

  allocate(n) {
    // TODO: split into n Money parts that add up exactly to this amount
    return [];
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

const fare = new Money(10000, 'AUD'); // 100.00 AUD for a family of 3
const parts = fare.allocate(3) || [];
check('3 parts', parts.length, 3);
check('parts in cents', parts.map((p) => p.minor), [3334, 3333, 3333]);
check('nothing lost', parts.reduce((sum, p) => sum.add(p), new Money(0, 'AUD')).equals(fare), true);
check('equal by value', new Money(500, 'AUD').equals(new Money(500, 'AUD')), true);
check('different currency not equal', new Money(500, 'AUD').equals(new Money(500, 'THB')), false);
expectThrows('AUD + THB rejected', () => fare.add(new Money(100, 'THB')));
expectThrows('fractional cents rejected', () => new Money(10.5, 'AUD'));
expectThrows('allocate(0) rejected', () => fare.allocate(0));

let frozen = false;
try {
  fare.minor = 1;
} catch (e) {
  frozen = true;
}
check('immutable', frozen && fare.minor === 10000, true);`,
      hint: '<code>Math.floor(this.minor / n)</code> is the base share and <code>this.minor % n</code> is how many leftover cents to hand out, one each to the first parts. Never divide money into floats.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Money {
  constructor(minor, currency) {
    if (!Number.isInteger(minor)) throw new DomainError('Minor units must be an integer');
    if (!/^[A-Z]{3}$/.test(currency)) throw new DomainError('Bad currency ' + currency);
    this.minor = minor;
    this.currency = currency;
    Object.freeze(this);
  }

  add(other) {
    if (other.currency !== this.currency) {
      throw new DomainError('Cannot add ' + other.currency + ' to ' + this.currency);
    }
    return new Money(this.minor + other.minor, this.currency);
  }

  equals(other) {
    return other instanceof Money && other.minor === this.minor && other.currency === this.currency;
  }

  // Split into n parts. No cent may be lost or invented:
  // the first (minor % n) parts get one extra minor unit.
  allocate(n) {
    if (!Number.isInteger(n) || n < 1) throw new DomainError('Cannot split into ' + n + ' parts');
    const base = Math.floor(this.minor / n);
    const remainder = this.minor % n;
    const parts = [];
    for (let i = 0; i < n; i++) {
      parts.push(new Money(base + (i < remainder ? 1 : 0), this.currency));
    }
    return parts;
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

const fare = new Money(10000, 'AUD'); // 100.00 AUD for a family of 3
const parts = fare.allocate(3) || [];
check('3 parts', parts.length, 3);
check('parts in cents', parts.map((p) => p.minor), [3334, 3333, 3333]);
check('nothing lost', parts.reduce((sum, p) => sum.add(p), new Money(0, 'AUD')).equals(fare), true);
check('equal by value', new Money(500, 'AUD').equals(new Money(500, 'AUD')), true);
check('different currency not equal', new Money(500, 'AUD').equals(new Money(500, 'THB')), false);
expectThrows('AUD + THB rejected', () => fare.add(new Money(100, 'THB')));
expectThrows('fractional cents rejected', () => new Money(10.5, 'AUD'));
expectThrows('allocate(0) rejected', () => fare.allocate(0));

let frozen = false;
try {
  fare.minor = 1;
} catch (e) {
  frozen = true;
}
check('immutable', frozen && fare.minor === 10000, true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── aggregates
  {
    id: 'aggregates',
    section: 'Tactical Building Blocks',
    title: 'Aggregates & Invariants',
    explain: `
      <p>Some business rules span several objects. "A SkyHop booking holds at most 9 passengers."
      "An infant must sit on the lap of an adult on the same booking, one infant per adult." "Nothing
      on the booking can change once the first flight has departed." No single
      <code>Passenger</code> can check those rules: you need to see the whole booking at once.</p>

      <p>An <strong>aggregate</strong> is a cluster of entities and value objects treated as
      <em>one unit for changes</em>. One entity is the <strong>aggregate root</strong> (here
      <code>Booking</code>); everything else (passengers, segments, seat assignments) lives inside
      it. The rules that must <em>always</em> hold for the cluster are its
      <strong>invariants</strong>.</p>

      <h3>The rules of the root</h3>
      <ul>
        <li><strong>All changes go through the root.</strong> Outside code calls
        <code>booking.addPassenger(...)</code>, never <code>passengers.push(...)</code>. The
        root checks every invariant before it changes anything.</li>
        <li><strong>Outside code holds references only to the root</strong>, not to
        inner entities. Need a passenger? Ask the booking.</li>
        <li><strong>One transaction = one aggregate.</strong> You load the whole aggregate,
        change it, save the whole aggregate. The invariants hold at every commit.</li>
        <li><strong>Inner entities have local identity</strong>: "passenger P1 of SKY001", not a
        global id.</li>
      </ul>

      <h3>The sneaky leak: getters that return internals</h3>
      <p>Making fields <code>#private</code> isn't enough. If <code>get passengers()</code>
      returns the internal array, any caller can <code>push</code> into it and skip every check.
      Return <strong>copies</strong> (frozen, so mistakes fail loudly) or read-only views.</p>

      <pre><code>get passengers() {
  return this.#passengers;                         // ❌ caller can push / edit
}
get passengers() {
  return Object.freeze(this.#passengers.map(p =&gt; Object.freeze({ ...p })));  // ✅
}</code></pre>

      <div class="warn"><strong>What is NOT an invariant of this aggregate:</strong> "the flight
      has a free seat" or "the customer has enough loyalty points". Those depend on other
      aggregates (flight inventory, loyalty account). Trying to enforce them inside
      <code>Booking</code> leads to giant aggregates. See the next lesson.</div>

      <div class="tip"><strong>In the real world:</strong> the hard part isn't the code, it's
      finding the <em>true</em> invariants. Ask domain experts "what must never be false, even
      for a second?" vs "what can be fixed up a bit later?". Only the first kind belongs inside one
      aggregate. ORMs tempt you to navigate <code>booking.passengers[0].booking.customer.orders</code>.
      DDD teams deliberately cut those object graphs at aggregate boundaries.</div>
    `,
    examples: [
      {
        title: 'Booking aggregate root guarding its invariants',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Booking is the AGGREGATE ROOT. Passengers and segments live inside it
// and can only be changed through its methods.
class Booking {
  static MAX_PASSENGERS = 9;

  #pnr;
  #clock;
  #passengers = []; // { id, name, type: 'ADULT' | 'CHILD' | 'INFANT', infantOf? }
  #segments = []; // { flight, from, to, departsAt }

  constructor(pnr, clock) {
    this.#pnr = pnr;
    this.#clock = clock;
  }

  get pnr() {
    return this.#pnr;
  }

  // Read access returns frozen copies: callers can look, not touch
  get passengers() {
    return Object.freeze(this.#passengers.map((p) => Object.freeze({ ...p })));
  }

  addSegment(flight, from, to, departsAt) {
    this.#assertNotDeparted();
    this.#segments.push({ flight, from, to, departsAt: new Date(departsAt) });
  }

  addPassenger(id, name, type, infantOf) {
    this.#assertNotDeparted();
    if (this.#passengers.length >= Booking.MAX_PASSENGERS) {
      throw new DomainError('A booking can hold at most ' + Booking.MAX_PASSENGERS + ' passengers');
    }
    if (type === 'INFANT') {
      const adult = this.#passengers.find((p) => p.id === infantOf);
      if (!adult || adult.type !== 'ADULT') {
        throw new DomainError('Infant ' + name + ' must be attached to an adult on this booking');
      }
      if (this.#passengers.some((p) => p.infantOf === infantOf)) {
        throw new DomainError(adult.name + ' already has an infant on their lap');
      }
    }
    this.#passengers.push({ id, name, type, infantOf: type === 'INFANT' ? infantOf : null });
  }

  removePassenger(id) {
    this.#assertNotDeparted();
    if (this.#passengers.some((p) => p.infantOf === id)) {
      throw new DomainError('Remove the infant travelling with ' + id + ' first');
    }
    this.#passengers = this.#passengers.filter((p) => p.id !== id);
  }

  #assertNotDeparted() {
    const now = this.#clock.now();
    const first = this.#segments[0];
    if (first && first.departsAt <= now) {
      throw new DomainError('Booking ' + this.#pnr + ' cannot change: ' + first.flight + ' has departed');
    }
  }

  summary() {
    const types = this.#passengers.map((p) => p.type[0]).join('');
    return this.#pnr + ' pax=' + this.#passengers.length + ' [' + types + '] segments=' +
      this.#segments.map((s) => s.flight).join('+');
  }
}

// A controllable clock so we can "travel in time"
let now = new Date('2026-11-01T06:00:00Z');
const clock = { now: () => now };

function attempt(label, action) {
  try {
    action();
    console.log('ok      ', label);
  } catch (e) {
    console.log('REJECTED', label, '->', e.message);
  }
}

const booking = new Booking('SKY001', clock);
booking.addSegment('SH101', 'SYD', 'MEL', '2026-11-01T09:00:00Z');
booking.addSegment('SH205', 'MEL', 'OOL', '2026-11-01T13:00:00Z');

attempt('add adult Ana', () => booking.addPassenger('P1', 'Ana', 'ADULT'));
attempt('add infant Mia on Ana', () => booking.addPassenger('P2', 'Mia', 'INFANT', 'P1'));
attempt('add 2nd infant on Ana', () => booking.addPassenger('P3', 'Leo', 'INFANT', 'P1'));
attempt('add infant with no adult', () => booking.addPassenger('P3', 'Leo', 'INFANT', 'P9'));
attempt('remove Ana (has infant)', () => booking.removePassenger('P1'));

for (let i = 3; i <= 9; i++) {
  booking.addPassenger('P' + i, 'Guest' + i, 'ADULT');
}
console.log(booking.summary());
attempt('add 10th passenger', () => booking.addPassenger('P10', 'Zed', 'ADULT'));

now = new Date('2026-11-01T09:30:00Z'); // SH101 left at 09:00
attempt('remove Guest9 after departure', () => booking.removePassenger('P9'));
console.log(booking.summary());`,
        explain: `
          <details>
            <summary>The problem: rules that no single object can check</summary>
            <p>Imagine <code>Passenger</code> rows that any service can insert directly. The check-in
            service adds an infant, the call centre removes the adult it was attached to. Each
            write looks fine on its own, and the result is an infant flying alone. The rule
            "infant needs an adult on the same booking" involves <em>two</em> passengers, so it must
            be checked by something that sees both: the root.</p>
          </details>
          <details>
            <summary>Step by step: each call vs each invariant</summary>
            <table>
              <tr><th>Step</th><th>Call</th><th>Invariant checked</th><th>Console</th></tr>
              <tr><td>1</td><td><code>addPassenger('P1','Ana','ADULT')</code></td><td>count 0 &lt; 9, not departed</td><td><code>ok       add adult Ana</code></td></tr>
              <tr><td>2</td><td>infant Mia → P1</td><td>P1 exists, is ADULT, has no infant</td><td><code>ok       add infant Mia on Ana</code></td></tr>
              <tr><td>3</td><td>infant Leo → P1</td><td>P1 already has Mia</td><td><code>REJECTED add 2nd infant on Ana -&gt; Ana already has an infant on their lap</code></td></tr>
              <tr><td>4</td><td>infant Leo → P9</td><td>P9 isn't on the booking</td><td><code>REJECTED add infant with no adult -&gt; Infant Leo must be attached to an adult on this booking</code></td></tr>
              <tr><td>5</td><td><code>removePassenger('P1')</code></td><td>would orphan Mia</td><td><code>REJECTED remove Ana (has infant) -&gt; Remove the infant travelling with P1 first</code></td></tr>
              <tr><td>6</td><td>loop adds P3–P9</td><td>count goes 2 → 9</td><td><code>SKY001 pax=9 [AIAAAAAAA] segments=SH101+SH205</code></td></tr>
              <tr><td>7</td><td>add P10</td><td>count 9 ≥ MAX</td><td><code>REJECTED add 10th passenger -&gt; A booking can hold at most 9 passengers</code></td></tr>
              <tr><td>8</td><td>clock → 09:30, remove P9</td><td>SH101 left at 09:00</td><td><code>REJECTED remove Guest9 after departure -&gt; Booking SKY001 cannot change: SH101 has departed</code></td></tr>
              <tr><td>9</td><td><code>summary()</code></td><td>nothing changed by rejected calls</td><td><code>SKY001 pax=9 [AIAAAAAAA] segments=SH101+SH205</code></td></tr>
            </table>
            <p>Note the order inside each method: <strong>check everything first, then change</strong>.
            A rejected call leaves the aggregate exactly as it was.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>#passengers = [];                                   // ① inner entities are private
constructor(pnr, clock) { ... this.#clock = clock; } // ② time is injected
this.#assertNotDeparted();                          // ③ guard at the top of every command
return Object.freeze(this.#passengers.map(...));    // ④ reads hand out copies</code></pre>
            <ol>
              <li><strong>①</strong> No one outside can reach the array, so the only way to add a passenger is <code>addPassenger</code>.</li>
              <li><strong>②</strong> "Has it departed?" depends on <em>now</em>. Injecting a clock keeps the aggregate deterministic and testable (we jump to 09:30 by changing <code>now</code>).</li>
              <li><strong>③</strong> Every command (add, remove, addSegment) runs the same guard, so a new method can't forget the rule... as long as you remember to call it. Some teams put this in one <code>#mutate(fn)</code> wrapper.</li>
              <li><strong>④</strong> Even read access can't be used to change state. Next example shows why this matters.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Move the clock to <code>'2026-11-01T08:59:00Z'</code>: removing Guest9 is now allowed and the summary shows <code>pax=8</code>.</li>
              <li>Add <code>booking.addPassenger('P10', 'Kid', 'CHILD')</code> before the loop: the loop throws at P9. Invariants hold no matter which order calls come in.</li>
              <li>Try <code>booking.passengers.push({})</code>: TypeError, the copy is frozen.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Bypassing the root through an exposed array (and the fix)',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

const MAX = 9;

// ❌ LEAKY: the root enforces the rule... but hands out its internal array
class LeakyBooking {
  #passengers = [];

  addPassenger(name) {
    if (this.#passengers.length >= MAX) throw new DomainError('max ' + MAX + ' passengers');
    this.#passengers.push({ name, type: 'ADULT' });
  }

  get passengers() {
    return this.#passengers; // the SAME array object the invariant protects
  }
}

// ✅ SAFE: same rule, but reads return frozen copies
class Booking {
  #passengers = [];

  addPassenger(name) {
    if (this.#passengers.length >= MAX) throw new DomainError('max ' + MAX + ' passengers');
    this.#passengers.push({ name, type: 'ADULT' });
  }

  get passengers() {
    return Object.freeze(this.#passengers.map((p) => Object.freeze({ ...p })));
  }

  get passengerCount() {
    return this.#passengers.length;
  }
}

function fillUp(booking) {
  for (let i = 1; i <= MAX; i++) booking.addPassenger('Guest' + i);
}

// ---------- leaky ----------
const leaky = new LeakyBooking();
fillUp(leaky);
try {
  leaky.addPassenger('Zed');
} catch (e) {
  console.log('leaky: addPassenger rejected ->', e.message);
}

// Some "helper" in another module goes around the root:
leaky.passengers.push({ name: 'Zed', type: 'ADULT' });
leaky.passengers[0].type = 'INFANT'; // and an adult becomes an infant with no lap
console.log('leaky: passengers =', leaky.passengers.length, '| first is', leaky.passengers[0].type);

// ---------- safe ----------
const safe = new Booking();
fillUp(safe);

try {
  safe.passengers.push({ name: 'Zed', type: 'ADULT' });
} catch (e) {
  console.log('safe: push on copy ->', e.name);
}

try {
  safe.passengers[0].type = 'INFANT';
} catch (e) {
  console.log('safe: edit copy ->', e.name);
}

console.log('safe: passengers =', safe.passengerCount, '| first is', safe.passengers[0].type);`,
        explain: `
          <details>
            <summary>The problem: <code>#private</code> field, public array</summary>
            <p><code>LeakyBooking</code> looks well encapsulated: the array is private and
            <code>addPassenger</code> checks the limit. But the getter returns the <em>same array
            object</em>, so whoever calls it holds a direct handle on the aggregate's insides.</p>
            <table>
              <tr><th>Step</th><th>Code</th><th>Internal state</th><th>Console</th></tr>
              <tr><td>1</td><td><code>fillUp(leaky)</code></td><td>9 adults</td><td></td></tr>
              <tr><td>2</td><td><code>leaky.addPassenger('Zed')</code></td><td>unchanged: rule works</td><td><code>leaky: addPassenger rejected -&gt; max 9 passengers</code></td></tr>
              <tr><td>3</td><td><code>leaky.passengers.push(...)</code></td><td><strong>10</strong> passengers, rule skipped</td><td></td></tr>
              <tr><td>4</td><td><code>leaky.passengers[0].type = 'INFANT'</code></td><td>an infant with no adult</td><td><code>leaky: passengers = 10 | first is INFANT</code></td></tr>
            </table>
            <p>Two invariants broken without calling a single domain method. In real code, step 3
            is a "quick fix" in a controller written months later by someone who never saw the rule.</p>
          </details>
          <details>
            <summary>The fix: defensive, frozen copies</summary>
            <pre><code>get passengers() {
  return Object.freeze(                       // ② array can't grow
    this.#passengers.map(p =&gt; Object.freeze({ ...p }))  // ① new objects, also frozen
  );
}</code></pre>
            <ol>
              <li><strong>①</strong> Each passenger is a shallow copy, so editing it would not touch the real one. Freezing it makes the mistake <em>visible</em> (a TypeError in strict mode) instead of silently ignored.</li>
              <li><strong>②</strong> The returned array is a new frozen array: <code>push</code> throws.</li>
            </ol>
            <table>
              <tr><th>Step</th><th>Code</th><th>Internal state</th><th>Console</th></tr>
              <tr><td>1</td><td><code>safe.passengers.push(...)</code></td><td>9, unchanged</td><td><code>safe: push on copy -&gt; TypeError</code></td></tr>
              <tr><td>2</td><td><code>safe.passengers[0].type = 'INFANT'</code></td><td>first still ADULT</td><td><code>safe: edit copy -&gt; TypeError</code></td></tr>
              <tr><td>3</td><td>read count + type</td><td></td><td><code>safe: passengers = 9 | first is ADULT</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Remove both <code>Object.freeze</code> calls (keep the <code>map</code> copy). The two <code>catch</code> lines disappear: the edits now succeed <em>on a copy</em> and are silently lost. The aggregate is safe, but the caller's bug is hidden. Freezing is about failing loudly.</li>
              <li>Remove the <code>map</code> too (<code>return this.#passengers</code>): <code>safe</code> now behaves exactly like <code>leaky</code>.</li>
            </ul>
            <div class="tip">Copying costs a little CPU on each read. For aggregates this is almost always fine: they should be small (next lesson). If an aggregate is so big that copying hurts, that's a design smell.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s check-in service wants to add a seat assignment by inserting directly into the <code>booking_passengers</code> table. What is the DDD concern?',
        options: [
          'None, it\'s just a faster write',
          'Tables should never be written to',
          'It bypasses the Booking root, so invariants like "no changes after departure" and "infant attached to adult" are never checked',
          'Check-in should have its own database',
        ],
        answer: 2,
        why: 'All changes to an aggregate go through its root, which checks the invariants. Direct writes to inner tables are the database version of pushing into an exposed array.',
      },
      {
        q: 'Which rule is a true invariant of the <code>Booking</code> aggregate?',
        options: [
          'Every infant on the booking is attached to a different adult on the same booking',
          'The flight still has free seats in fare bucket Q',
          'The customer\'s loyalty tier is Gold',
          'The payment provider has captured the payment',
        ],
        answer: 0,
        why: 'Only the infant rule can be checked with data that lives entirely inside the booking. The others depend on other aggregates or systems and need a different mechanism (domain service, eventual consistency, saga).',
      },
      {
        q: '<code>get segments() { return this.#segments; }</code>: what is the risk?',
        options: [
          'None, the field is private',
          'It is slower than returning a copy',
          'Private fields can\'t be returned from getters',
          'Callers receive the internal array and can push/modify segments without any invariant checks',
        ],
        answer: 3,
        why: '#private stops access by name, not by reference. Returning the actual array hands out the internals. Return frozen copies instead.',
      },
      {
        q: 'A rejected <code>addPassenger</code> call threw after it had already pushed the passenger. What principle was broken?',
        options: [
          'Always use async methods',
          'Check all invariants first, then change state, so a failed command leaves the aggregate unchanged',
          'Never throw errors from domain code',
          'Use a database transaction for every method',
        ],
        answer: 1,
        why: 'Validate-then-mutate keeps the aggregate consistent in memory, not just in the database. Otherwise a caught error leaves a half-changed object.',
      },
    ],
    exercise: {
      task: `<p>SkyHop sells multi-city trips. Make the <code>Itinerary</code> aggregate enforce:</p>
      <ul>
        <li>At most 4 segments.</li>
        <li>Each new segment starts where the previous one ended (<code>from === last.to</code>).</li>
        <li>Each new segment departs <em>after</em> the previous one.</li>
        <li><code>segments</code> returns frozen copies so outside code can't bypass the rules.</li>
      </ul>
      <p>Throw <code>DomainError</code> on violations, and don't change anything when you throw.</p>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Itinerary {
  static MAX_SEGMENTS = 4;

  #pnr;
  #segments = [];

  constructor(pnr) {
    this.#pnr = pnr;
  }

  addSegment(flight, from, to, departsAt) {
    // TODO: enforce the invariants before changing anything:
    //  - at most 4 segments
    //  - segment must start where the previous one ended
    //  - segment must depart after the previous one
    this.#segments.push({ flight, from, to, departsAt: new Date(departsAt) });
  }

  get segments() {
    // TODO: don't leak the internal array
    return this.#segments;
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

const b = new Itinerary('SKY042');
b.addSegment('SH101', 'SYD', 'MEL', '2026-11-01T09:00:00Z');
b.addSegment('SH205', 'MEL', 'OOL', '2026-11-01T13:00:00Z');
check('two connected segments', b.segments.map((s) => s.flight), ['SH101', 'SH205']);

expectThrows('gap: OOL then SYD departure', () =>
  b.addSegment('SH310', 'SYD', 'PER', '2026-11-02T08:00:00Z'));
expectThrows('departs before previous one', () =>
  b.addSegment('SH311', 'OOL', 'SYD', '2026-11-01T12:00:00Z'));

b.addSegment('SH312', 'OOL', 'SYD', '2026-11-03T08:00:00Z');
b.addSegment('SH101', 'SYD', 'MEL', '2026-11-04T09:00:00Z');
expectThrows('5th segment', () => b.addSegment('SH205', 'MEL', 'OOL', '2026-11-04T13:00:00Z'));
check('still 4 segments', b.segments.length, 4);

try {
  b.segments.push({ flight: 'HACK' });
} catch (e) {
  // expected when segments returns a frozen copy
}
try {
  b.segments[0].to = 'BKK';
} catch (e) {
  // expected when each segment copy is frozen
}
check('outside push has no effect', b.segments.length, 4);
check('outside edit has no effect', b.segments[0].to, 'MEL');`,
      hint: 'Grab <code>const last = this.#segments[this.#segments.length - 1]</code>, then run the three checks before <code>push</code>. For the getter, copy the same <code>Object.freeze(arr.map(s =&gt; Object.freeze({ ...s })))</code> pattern as the example.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Itinerary {
  static MAX_SEGMENTS = 4;

  #pnr;
  #segments = [];

  constructor(pnr) {
    this.#pnr = pnr;
  }

  addSegment(flight, from, to, departsAt) {
    const when = new Date(departsAt);
    const last = this.#segments[this.#segments.length - 1];
    if (this.#segments.length >= Itinerary.MAX_SEGMENTS) {
      throw new DomainError(this.#pnr + ' already has ' + Itinerary.MAX_SEGMENTS + ' segments');
    }
    if (last && last.to !== from) {
      throw new DomainError(flight + ' leaves ' + from + ' but the trip is in ' + last.to);
    }
    if (last && when <= last.departsAt) {
      throw new DomainError(flight + ' departs before ' + last.flight);
    }
    this.#segments.push({ flight, from, to, departsAt: when });
  }

  get segments() {
    return Object.freeze(this.#segments.map((s) => Object.freeze({ ...s })));
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

const b = new Itinerary('SKY042');
b.addSegment('SH101', 'SYD', 'MEL', '2026-11-01T09:00:00Z');
b.addSegment('SH205', 'MEL', 'OOL', '2026-11-01T13:00:00Z');
check('two connected segments', b.segments.map((s) => s.flight), ['SH101', 'SH205']);

expectThrows('gap: OOL then SYD departure', () =>
  b.addSegment('SH310', 'SYD', 'PER', '2026-11-02T08:00:00Z'));
expectThrows('departs before previous one', () =>
  b.addSegment('SH311', 'OOL', 'SYD', '2026-11-01T12:00:00Z'));

b.addSegment('SH312', 'OOL', 'SYD', '2026-11-03T08:00:00Z');
b.addSegment('SH101', 'SYD', 'MEL', '2026-11-04T09:00:00Z');
expectThrows('5th segment', () => b.addSegment('SH205', 'MEL', 'OOL', '2026-11-04T13:00:00Z'));
check('still 4 segments', b.segments.length, 4);

try {
  b.segments.push({ flight: 'HACK' });
} catch (e) {
  // expected when segments returns a frozen copy
}
try {
  b.segments[0].to = 'BKK';
} catch (e) {
  // expected when each segment copy is frozen
}
check('outside push has no effect', b.segments.length, 4);
check('outside edit has no effect', b.segments[0].to, 'MEL');`,
    },
  },

  // ───────────────────────────────────────────────────────────── aggregate-design
  {
    id: 'aggregate-design',
    section: 'Tactical Building Blocks',
    title: 'Designing Aggregates: Vernon\'s 4 Rules',
    explain: `
      <p>The first instinct when modelling an airline is one huge object graph: a
      <code>Flight</code> that contains its seats, which contain bookings, which contain passengers.
      It "matches reality". It also falls over the first time a sale opens. Vaughn Vernon's
      <em>Effective Aggregate Design</em> essays (and chapter 10 of <em>Implementing DDD</em>)
      give four rules of thumb:</p>

      <ol>
        <li><strong>Model true invariants in consistency boundaries.</strong> An aggregate exists
        to protect rules that must be true <em>at every commit</em>. Ask "what must never be false,
        even for a second?". If there's no such rule tying two things together, they don't belong
        in the same aggregate.</li>
        <li><strong>Design small aggregates.</strong> A root entity plus a few values is the norm. Big
        aggregates are slow to load, and every save rewrites everything. Worse, two users changing
        <em>unrelated</em> parts conflict with each other.</li>
        <li><strong>Reference other aggregates by identity.</strong> <code>booking.flightId = 'SH101'</code>,
        not <code>booking.flight = flightObject</code>. That keeps boundaries clear, makes it
        impossible to accidentally change two aggregates in one go, and lets them live in different
        stores or services later.</li>
        <li><strong>Use eventual consistency outside the boundary.</strong> Rules that span
        aggregates ("when a booking is requested, reduce inventory") are handled by
        <em>domain events</em> and handlers in separate transactions, a moment later.</li>
      </ol>

      <h3>How optimistic concurrency exposes a too-big aggregate</h3>
      <p>Each aggregate row carries a <code>version</code>. You load v1, change it, and save with
      "only if it's still v1". If someone else saved in between, your save fails with a
      <strong>concurrency conflict</strong> and you must reload and retry. That's exactly right
      when two people really fight over the same thing (the last seat). It's terrible when they
      fight over <em>the same big object</em> but different, unrelated parts of it (seat 12A vs
      14C).</p>
      <pre><code>UPDATE flight SET data = $1, version = version + 1
 WHERE id = 'SH101' AND version = $2;    -- 0 rows updated = someone else won</code></pre>

      <h3>Asking the business</h3>
      <p>Moving a rule out of an aggregate is a business decision, not a technical one. "Can a
      booking be PENDING for a second while inventory catches up?" Usually yes: airlines
      <em>overbook</em> deliberately and have processes for it. If the answer truly is "never",
      keep the rule inside a (small) aggregate and accept the contention.</p>

      <div class="warn">Rules are rules of <em>thumb</em>. Breaking one is fine when you know
      why. Example: a tiny <code>FlightInventory</code> counter is a deliberate hotspot. You keep
      it small, serialise its updates (one consumer per flight), and retry on conflict.</div>

      <div class="tip"><strong>In the real world:</strong> airline inventory systems
      keep availability as compact <em>counts per flight and fare bucket</em>, separate from the
      full booking records (PNRs). That's this lesson's split. Seat maps are another
      small piece, often keyed by flight + seat. A good sign your aggregates are too big:
      version-conflict errors in the logs that users experience as "please try again", even
      though nobody was actually competing for the same thing.</div>
    `,
    examples: [
      {
        title: 'Too big: a Flight aggregate holding all 180 seats',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// ❌ One BIG aggregate: the Flight owns every seat booking on board
class Flight {
  constructor(id, seats, version) {
    this.id = id;
    this.seats = seats; // { '1A': null, '1B': 'SKY001', ... } 180 entries
    this.version = version;
  }

  bookSeat(seat, pnr) {
    if (!(seat in this.seats)) throw new DomainError('No seat ' + seat);
    if (this.seats[seat]) throw new DomainError('Seat ' + seat + ' already taken');
    this.seats[seat] = pnr;
  }
}

// In-memory store with optimistic concurrency (a version number per aggregate)
class FlightStore {
  #rows = new Map();
  writes = 0;

  insert(flight) {
    this.#rows.set(flight.id, { version: 1, seats: structuredClone(flight.seats) });
  }

  load(id) {
    const row = this.#rows.get(id);
    return new Flight(id, structuredClone(row.seats), row.version);
  }

  save(flight) {
    const row = this.#rows.get(flight.id);
    if (row.version !== flight.version) {
      throw new ConcurrencyError(
        flight.id + ' changed since you loaded it (you had v' + flight.version + ', db has v' + row.version + ')');
    }
    this.#rows.set(flight.id, { version: row.version + 1, seats: structuredClone(flight.seats) });
    this.writes += Object.keys(flight.seats).length; // every save rewrites all seats
  }
}

// Build SH101 with 30 rows x 6 seats = 180 seats
const seats = {};
for (let row = 1; row <= 30; row++) {
  for (const letter of 'ABCDEF') seats[row + letter] = null;
}
const store = new FlightStore();
store.insert(new Flight('SH101', seats, 1));
console.log('SH101 aggregate holds', Object.keys(seats).length, 'seats');

// --- Two agents, two DIFFERENT seats, at the same moment ---
const ana = store.load('SH101'); // v1
const ben = store.load('SH101'); // v1

ana.bookSeat('12A', 'SKY001');
store.save(ana);
console.log('Ana booked 12A -> saved, db now v2');

ben.bookSeat('14C', 'SKY002');
try {
  store.save(ben);
} catch (e) {
  console.log('Ben booked 14C ->', e.name + ':', e.message);
}

// --- Sale opens: 50 agents load at once, each picks a different free seat ---
const sessions = [];
for (let i = 0; i < 50; i++) sessions.push(store.load('SH101'));

let saved = 0;
let conflicts = 0;
sessions.forEach((flight, i) => {
  const seat = (15 + Math.floor(i / 6)) + 'ABCDEF'[i % 6]; // 15A, 15B, ... 23B
  try {
    flight.bookSeat(seat, 'SKY' + (100 + i));
    store.save(flight);
    saved++;
  } catch (e) {
    if (e instanceof ConcurrencyError) conflicts++;
    else throw e;
  }
});
console.log('sale: 50 agents, 50 different seats ->', saved, 'saved,', conflicts, 'conflicts');
console.log('seat rows written to db so far:', store.writes);`,
        explain: `
          <details>
            <summary>The problem: unrelated changes collide</summary>
            <p>The model says "Flight owns its seats", so booking any seat means: load the whole
            flight (180 seats), change one entry, save the whole flight with a version check.
            Ana and Ben want <em>different</em> seats, so there is no business conflict. But there
            is a technical one:</p>
            <table>
              <tr><th>Step</th><th>Ana</th><th>Ben</th><th>DB row SH101</th><th>Console</th></tr>
              <tr><td>1</td><td>load → v1</td><td>load → v1</td><td>v1</td><td></td></tr>
              <tr><td>2</td><td>book 12A, save "if v1"</td><td></td><td><strong>v2</strong></td><td><code>Ana booked 12A -&gt; saved, db now v2</code></td></tr>
              <tr><td>3</td><td></td><td>book 14C, save "if v1"</td><td>still v2 → rejected</td><td><code>Ben booked 14C -&gt; ConcurrencyError: SH101 changed since you loaded it (you had v1, db has v2)</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: the sale opens</summary>
            <p>50 agents load the flight at the same moment (all get v2) and each picks a different
            free seat (15A, 15B, … 23B):</p>
            <table>
              <tr><th>Agent</th><th>Loaded</th><th>DB before save</th><th>Result</th></tr>
              <tr><td>#1</td><td>v2</td><td>v2</td><td>saved → v3</td></tr>
              <tr><td>#2</td><td>v2</td><td>v3</td><td>conflict</td></tr>
              <tr><td>#3 … #50</td><td>v2</td><td>v3</td><td>conflict</td></tr>
            </table>
            <p>Console:</p>
            <pre><code>sale: 50 agents, 50 different seats -&gt; 1 saved, 49 conflicts
seat rows written to db so far: 360</code></pre>
            <p>98% failure even though every request was valid. And two successful saves wrote 360
            seat rows just to change 2 seats. With retries, the 49 reload and try again, 48 fail
            again, and so on: the throughput of the whole flight is one save at a time.</p>
          </details>
          <details>
            <summary>Which rule did this design break?</summary>
            <ul>
              <li><strong>Rule 1:</strong> is there an invariant that ties seat 12A to seat 14C? No.
              The real invariants are "one passenger per seat" (per seat) and "don't sell beyond
              capacity" (a count).</li>
              <li><strong>Rule 2:</strong> 180 seats is not small. Real aircraft: up to 500+.</li>
              <li>The fix in the next example: small aggregates, referenced by id, with the
              cross-aggregate rule handled eventually.</li>
            </ul>
            <div class="tip">Try this: change the loop to use the <em>same</em> seat for everyone
            (<code>const seat = '15A'</code>). Still 1 saved and 49 conflicts, but now the
            conflicts are <em>correct</em>: they really were competing. Optimistic concurrency is
            only a problem when the boundary is wrong.</div>
          </details>
        `,
      },
      {
        title: 'Redesign: small Booking + FlightInventory, eventual consistency',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// ✅ Small aggregate #1: one Booking per PNR. References the flight BY ID only.
class Booking {
  constructor(pnr, flightId, status = 'PENDING') {
    this.pnr = pnr;
    this.flightId = flightId; // 'SH101', not a Flight object
    this.status = status;
  }

  confirm() {
    if (this.status !== 'PENDING') throw new DomainError(this.pnr + ' is ' + this.status);
    this.status = 'CONFIRMED';
  }

  reject(reason) {
    if (this.status !== 'PENDING') throw new DomainError(this.pnr + ' is ' + this.status);
    this.status = 'REJECTED: ' + reason;
  }
}

// ✅ Small aggregate #2: the TRUE invariant "never sell more than capacity" lives here.
// Three numbers instead of 180 seat rows.
class FlightInventory {
  constructor(flightId, capacity, sold) {
    this.flightId = flightId;
    this.capacity = capacity;
    this.sold = sold;
  }

  reserve(count) {
    if (this.sold + count > this.capacity) throw new DomainError(this.flightId + ' sold out');
    this.sold += count;
  }
}

// Tiny optimistic store, one "table" per aggregate type
class Store {
  #rows = new Map();

  add(id, aggregate) {
    if (this.#rows.has(id)) throw new ConcurrencyError(id + ' already exists');
    this.#rows.set(id, { version: 1, data: structuredClone(aggregate) });
  }

  load(id, Type) {
    const row = this.#rows.get(id);
    const aggregate = Object.assign(Object.create(Type.prototype), structuredClone(row.data));
    return { aggregate, version: row.version };
  }

  save(id, aggregate, expectedVersion) {
    const row = this.#rows.get(id);
    if (row.version !== expectedVersion) throw new ConcurrencyError(id + ' version conflict');
    this.#rows.set(id, { version: row.version + 1, data: structuredClone(aggregate) });
  }

  all() {
    return [...this.#rows.values()].map((row) => row.data);
  }
}

const bookings = new Store();
const inventory = new Store();
const queue = []; // events waiting to be handled (eventual consistency)

inventory.add('SH101', new FlightInventory('SH101', 180, 140)); // 40 seats left

// --- The sale: 50 agents at once. Each transaction touches ONE small aggregate. ---
let conflicts = 0;
for (let i = 1; i <= 50; i++) {
  const pnr = 'SKY' + String(i).padStart(3, '0');
  try {
    bookings.add(pnr, new Booking(pnr, 'SH101'));
    queue.push({ type: 'BookingRequested', pnr, flightId: 'SH101', seats: 1 });
  } catch (e) {
    conflicts++;
  }
}

const count = (status) => bookings.all().filter((b) => b.status.startsWith(status)).length;
console.log('sale: 50 bookings saved,', conflicts, 'conflicts');
console.log('right after the sale -> PENDING:', count('PENDING'), '| CONFIRMED:', count('CONFIRMED'));

// --- Later: an inventory handler processes the queue one event at a time ---
function handleBookingRequested(event) {
  // transaction A: inventory only
  const inv = inventory.load(event.flightId, FlightInventory);
  let ok = true;
  try {
    inv.aggregate.reserve(event.seats);
    inventory.save(event.flightId, inv.aggregate, inv.version);
  } catch (e) {
    if (!(e instanceof DomainError)) throw e;
    ok = false;
  }

  // transaction B: the booking only
  const b = bookings.load(event.pnr, Booking);
  if (ok) b.aggregate.confirm();
  else b.aggregate.reject('sold out');
  bookings.save(event.pnr, b.aggregate, b.version);
}

while (queue.length > 0) handleBookingRequested(queue.shift());

const inv = inventory.load('SH101', FlightInventory);
console.log('after the handler ->', 'CONFIRMED:', count('CONFIRMED'), '| REJECTED:', count('REJECTED'));
console.log('inventory SH101: sold', inv.aggregate.sold + '/' + inv.aggregate.capacity, '| version', inv.version);
console.log('SKY040:', bookings.load('SKY040', Booking).aggregate.status);
console.log('SKY041:', bookings.load('SKY041', Booking).aggregate.status);`,
        explain: `
          <details>
            <summary>The redesign</summary>
            <ul>
              <li><code>Booking</code>: one per PNR, holds <code>flightId</code> (a reference by id, rule 3).</li>
              <li><code>FlightInventory</code>: capacity + sold, three numbers. It owns the one true
              cross-booking invariant: "never sell more than capacity" (rule 1, rule 2).</li>
              <li>Creating a booking and reducing inventory happen in <strong>separate
              transactions</strong>, linked by a <code>BookingRequested</code> event (rule 4).</li>
            </ul>
          </details>
          <details>
            <summary>Step by step: timeline of the sale</summary>
            <table>
              <tr><th>Phase</th><th>What happens</th><th>State</th><th>Console</th></tr>
              <tr><td>Sale</td><td>50 agents each <code>add</code> their own Booking (different ids → no shared row)</td><td>50 PENDING, queue has 50 events</td><td><code>sale: 50 bookings saved, 0 conflicts</code></td></tr>
              <tr><td>Gap</td><td>Nothing handled yet. This is the "eventually" window</td><td>inventory still 140/180</td><td><code>right after the sale -&gt; PENDING: 50 | CONFIRMED: 0</code></td></tr>
              <tr><td>Events 1–40</td><td>handler: tx A <code>reserve(1)</code> on inventory, tx B <code>confirm()</code> booking</td><td>sold 141 … 180</td><td></td></tr>
              <tr><td>Events 41–50</td><td><code>reserve</code> throws "sold out" → tx B <code>reject</code></td><td>sold stays 180</td><td><code>after the handler -&gt; CONFIRMED: 40 | REJECTED: 10</code></td></tr>
              <tr><td>End</td><td>40 successful inventory saves: v1 → v41</td><td></td><td><code>inventory SH101: sold 180/180 | version 41</code><br><code>SKY040: CONFIRMED</code><br><code>SKY041: REJECTED: sold out</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>this.flightId = flightId;                  // ① reference by id, not a Flight object
queue.push({ type: 'BookingRequested', ... }); // ② the cross-aggregate rule becomes an event
inventory.save(event.flightId, inv.aggregate, inv.version);  // ③ tx A: inventory only
bookings.save(event.pnr, b.aggregate, b.version);            // ④ tx B: booking only
while (queue.length &gt; 0) handleBookingRequested(queue.shift()); // ⑤ one at a time</code></pre>
            <ol>
              <li><strong>①</strong> Booking can't reach into the flight and change it. It can only say which flight it's about.</li>
              <li><strong>②</strong> Instead of "update booking AND inventory atomically", the booking records that it was requested. Next section covers domain events properly.</li>
              <li><strong>③④</strong> Each transaction touches exactly one aggregate. If ③ fails, ④ records the rejection. There is no moment where a half-finished multi-aggregate write sits in the DB.</li>
              <li><strong>⑤</strong> A single consumer per flight serialises updates to the inventory hotspot, so even that small aggregate sees no conflicts. Multiple consumers would occasionally conflict and simply retry (that's the exercise).</li>
            </ol>
          </details>
          <details>
            <summary>Trade-offs and try this</summary>
            <ul>
              <li><strong>Cost:</strong> the customer sees "PENDING" for a moment and 10 of them get
              "sold out" after they thought they'd booked. The UI must say "confirming your booking…"
              instead of an instant ✅. The business decides if that's acceptable (it usually is;
              payment takes seconds anyway).</li>
              <li><strong>Try:</strong> change capacity to <code>200</code>: all 50 confirm, sold <code>190/200</code>, version 51.</li>
              <li><strong>Try:</strong> comment out the <code>while</code> loop: everything stays PENDING forever. Eventual consistency needs a reliable "eventually": see the outbox lesson.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s seat-map page often shows "Someone else changed this flight, please retry" during sales, even when customers pick different seats. Most likely cause?',
        options: [
          'The database is too slow',
          'The aggregate boundary is too big: all seats live in one Flight aggregate with one version number',
          'Optimistic concurrency should be replaced by no concurrency control',
          'The frontend sends requests twice',
        ],
        answer: 1,
        why: 'Unrelated changes collide on one version. Make aggregates small (per seat assignment, a compact inventory count, per booking) so only true competitors conflict.',
      },
      {
        q: 'A <code>Booking</code> class has a field <code>customer: Customer</code> (the full object), and saving a booking also saves the customer. Which Vernon rule does this break?',
        options: [
          'Use eventual consistency',
          'Design small aggregates',
          'None',
          'Reference other aggregates by identity: store <code>customerId</code> instead',
        ],
        answer: 3,
        why: 'Holding the object lets you change two aggregates in one transaction and blurs the boundary. Store the id and load the other aggregate separately when you need it.',
      },
      {
        q: 'Loyalty points must be added when a booking is confirmed. The product owner says "within a few minutes is fine". How should you model it?',
        options: [
          'Booking records BookingConfirmed; a Loyalty handler credits points in its own transaction later',
          'Put the loyalty account inside the Booking aggregate',
          'Update booking and loyalty account in one DB transaction',
          'Ask the customer to claim points manually',
        ],
        answer: 0,
        why: 'Not a true invariant of the booking ("a few minutes is fine"), so it belongs outside the boundary: eventual consistency via a domain event.',
      },
      {
        q: 'When is it right to keep a rule inside one (possibly busier) aggregate?',
        options: [
          'Whenever two objects are related in the real world',
          'When it makes the UI simpler',
          'When the rule must be true at every commit and violating it, even briefly, is unacceptable to the business',
          'Never: always use eventual consistency',
        ],
        answer: 2,
        why: 'Rule 1: aggregates exist for true invariants. If the business can\'t accept even a moment of inconsistency, enforce it inside one boundary and manage contention (keep it small, serialise, retry).',
      },
    ],
    exercise: {
      task: `<p>The <code>FlightInventory</code> is a small, deliberate hotspot. When two agents
      update it at the same moment, one gets a <code>ConcurrencyError</code>. Write
      <code>withRetry(operation, maxAttempts)</code>:</p>
      <ul>
        <li>Call <code>operation()</code> and return its result.</li>
        <li>On <code>ConcurrencyError</code>, call it again (it reloads and re-checks), up to
        <code>maxAttempts</code> calls in total, then rethrow.</li>
        <li>Any other error (e.g. <code>DomainError</code> "sold out") is rethrown immediately: retrying won't help a business rule.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// Small FlightInventory aggregate stored with a version number
class InventoryStore {
  #row = { version: 1, data: { flightId: 'SH101', capacity: 180, sold: 140 } };
  beforeSave = null; // test hook: simulates another agent saving first

  load() {
    return { data: structuredClone(this.#row.data), version: this.#row.version };
  }

  save(data, expectedVersion) {
    if (this.beforeSave) {
      const otherAgent = this.beforeSave;
      this.beforeSave = null;
      otherAgent();
    }
    if (this.#row.version !== expectedVersion) {
      throw new ConcurrencyError('SH101 v' + expectedVersion + ' is stale (db v' + this.#row.version + ')');
    }
    this.#row = { version: expectedVersion + 1, data: structuredClone(data) };
  }
}

// One complete load -> decide -> save cycle. Safe to re-run from scratch.
function reserve(store, seats) {
  const { data, version } = store.load();
  if (data.sold + seats > data.capacity) throw new DomainError('SH101 sold out');
  data.sold += seats;
  store.save(data, version);
  return data.sold;
}

function withRetry(operation, maxAttempts) {
  // TODO: call operation(). If it throws a ConcurrencyError, call it again,
  // up to maxAttempts calls in total. Rethrow any other error immediately,
  // and rethrow the ConcurrencyError after the last attempt.
  return operation();
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function run(fn) {
  try {
    return fn();
  } catch (e) {
    return 'threw ' + e.name;
  }
}

function counted(store, seats) {
  const op = () => {
    op.calls++;
    return reserve(store, seats);
  };
  op.calls = 0;
  return op;
}

// 1. No contention: one attempt
const s1 = new InventoryStore();
const op1 = counted(s1, 1);
check('no conflict -> sold 141', run(() => withRetry(op1, 3)), 141);
check('no conflict -> 1 attempt', op1.calls, 1);

// 2. Another agent sneaks in 2 seats between our load and save
const s2 = new InventoryStore();
s2.beforeSave = () => reserve(s2, 2);
const op2 = counted(s2, 1);
check('conflict once -> retried, sold 143', run(() => withRetry(op2, 3)), 143);
check('conflict once -> 2 attempts', op2.calls, 2);

// 3. Someone always wins the race: give up after maxAttempts
const s3 = new InventoryStore();
const rearm = () => {
  s3.beforeSave = () => {
    reserve(s3, 1);
    rearm();
  };
};
rearm();
const op3 = counted(s3, 1);
check('always conflicting -> rethrows', run(() => withRetry(op3, 3)), 'threw ConcurrencyError');
check('always conflicting -> 3 attempts', op3.calls, 3);

// 4. Business rule failures are NOT retried
const s4 = new InventoryStore();
const op4 = counted(s4, 50);
check('sold out -> DomainError', run(() => withRetry(op4, 3)), 'threw DomainError');
check('sold out -> 1 attempt only', op4.calls, 1);`,
      hint: 'A <code>for (let attempt = 1; ; attempt++)</code> loop with <code>try { return operation(); } catch (e) { ... }</code>. Inside the catch, rethrow unless <code>e instanceof ConcurrencyError &amp;&amp; attempt &lt; maxAttempts</code>.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class ConcurrencyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}

// Small FlightInventory aggregate stored with a version number
class InventoryStore {
  #row = { version: 1, data: { flightId: 'SH101', capacity: 180, sold: 140 } };
  beforeSave = null; // test hook: simulates another agent saving first

  load() {
    return { data: structuredClone(this.#row.data), version: this.#row.version };
  }

  save(data, expectedVersion) {
    if (this.beforeSave) {
      const otherAgent = this.beforeSave;
      this.beforeSave = null;
      otherAgent();
    }
    if (this.#row.version !== expectedVersion) {
      throw new ConcurrencyError('SH101 v' + expectedVersion + ' is stale (db v' + this.#row.version + ')');
    }
    this.#row = { version: expectedVersion + 1, data: structuredClone(data) };
  }
}

// One complete load -> decide -> save cycle. Safe to re-run from scratch.
function reserve(store, seats) {
  const { data, version } = store.load();
  if (data.sold + seats > data.capacity) throw new DomainError('SH101 sold out');
  data.sold += seats;
  store.save(data, version);
  return data.sold;
}

// Retry the WHOLE operation (reload + re-check + save) on a version conflict
function withRetry(operation, maxAttempts) {
  for (let attempt = 1; ; attempt++) {
    try {
      return operation();
    } catch (e) {
      const retryable = e instanceof ConcurrencyError;
      if (!retryable || attempt >= maxAttempts) throw e;
      // real code: wait a little (with jitter) before the next attempt
    }
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

function run(fn) {
  try {
    return fn();
  } catch (e) {
    return 'threw ' + e.name;
  }
}

function counted(store, seats) {
  const op = () => {
    op.calls++;
    return reserve(store, seats);
  };
  op.calls = 0;
  return op;
}

// 1. No contention: one attempt
const s1 = new InventoryStore();
const op1 = counted(s1, 1);
check('no conflict -> sold 141', run(() => withRetry(op1, 3)), 141);
check('no conflict -> 1 attempt', op1.calls, 1);

// 2. Another agent sneaks in 2 seats between our load and save
const s2 = new InventoryStore();
s2.beforeSave = () => reserve(s2, 2);
const op2 = counted(s2, 1);
check('conflict once -> retried, sold 143', run(() => withRetry(op2, 3)), 143);
check('conflict once -> 2 attempts', op2.calls, 2);

// 3. Someone always wins the race: give up after maxAttempts
const s3 = new InventoryStore();
const rearm = () => {
  s3.beforeSave = () => {
    reserve(s3, 1);
    rearm();
  };
};
rearm();
const op3 = counted(s3, 1);
check('always conflicting -> rethrows', run(() => withRetry(op3, 3)), 'threw ConcurrencyError');
check('always conflicting -> 3 attempts', op3.calls, 3);

// 4. Business rule failures are NOT retried
const s4 = new InventoryStore();
const op4 = counted(s4, 50);
check('sold out -> DomainError', run(() => withRetry(op4, 3)), 'threw DomainError');
check('sold out -> 1 attempt only', op4.calls, 1);`,
    },
  },

  // ───────────────────────────────────────────────────────────── domain-services
  {
    id: 'domain-services',
    section: 'Tactical Building Blocks',
    title: 'Domain Services',
    explain: `
      <p>Some important domain operations don't naturally belong to any one entity or value
      object. Moving money between two LedgerBank accounts: is that
      <code>fromAccount.transferTo(toAccount)</code>? Then the source account reaches into the
      target. Calculating a SkyHop fare from fare buckets, passenger types, bags and promo codes:
      is that the booking's job? The fare rules' job? Forcing it onto one of them gives a strange
      model. Evans' answer: a <strong>domain service</strong>, a stateless operation named in
      the ubiquitous language.</p>

      <h3>Recognising one</h3>
      <ul>
        <li>The operation is a <strong>significant business concept</strong> (domain experts
        talk about "a transfer", "pricing a quote", "rebooking a disrupted passenger").</li>
        <li>It involves <strong>several aggregates or values</strong> and would be awkward on any
        one of them.</li>
        <li>It's <strong>stateless</strong>: inputs in, result out. Any state lives in the
        aggregates it works on.</li>
      </ul>

      <h3>Domain service vs application service</h3>
      <table>
        <tr><th></th><th>Domain service</th><th>Application service</th></tr>
        <tr><td>Layer</td><td>Domain</td><td>Application (use cases)</td></tr>
        <tr><td>Contains</td><td>Business rules (same currency, no self-transfer)</td><td>Orchestration: load, call domain, save, transaction, auth, publish events</td></tr>
        <tr><td>Knows about</td><td>Domain objects only</td><td>Repositories, unit of work, security, DTOs</td></tr>
        <tr><td>Example</td><td><code>TransferService.transfer(from, to, amount)</code></td><td><code>TransferMoneyHandler.handle(command)</code></td></tr>
      </table>
      <p>Test: if you swapped the database or the web framework, would this code change? Yes →
      application (or infrastructure). No, it only changes when the <em>business</em> changes →
      domain.</p>

      <div class="warn"><strong>The anemic trap.</strong> "Service" is the most abused word in
      enterprise code. If <code>BookingService</code> has 40 methods that read and write fields
      on a passive <code>Booking</code> data bag, the rules have leaked out of the model: that's
      Fowler's <em>Anemic Domain Model</em> anti-pattern. A domain service should be the
      exception, used only for operations that really span objects. First try to put behaviour on
      the entity or value object.</div>

      <div class="tip"><strong>In the real world:</strong> a transfer changes two
      aggregates. Inside one bank's ledger (one bounded context, one DB) most teams accept updating
      both accounts in one local transaction, because "money vanished for a second" is not
      acceptable. That's a conscious exception to "one aggregate per transaction". Across banks or
      services, transfers become ledger entries + sagas. Pricing services are often pure
      functions, and that makes them easy to unit-test with hundreds of fare scenarios.</div>
    `,
    examples: [
      {
        title: 'LedgerBank: transfer as a domain service, called by an application service',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- Domain layer ----------
// Account is an aggregate. It guards ITS OWN rules: no overdraft, frozen accounts.
class Account {
  #balance; // integer minor units

  constructor(id, currency, balance, frozen = false) {
    this.id = id;
    this.currency = currency;
    this.#balance = balance;
    this.frozen = frozen;
  }

  get balance() {
    return this.#balance;
  }

  withdraw(amount) {
    if (this.frozen) throw new DomainError(this.id + ' is frozen');
    if (amount > this.#balance) throw new DomainError(this.id + ' has insufficient funds');
    this.#balance -= amount;
  }

  deposit(amount) {
    if (this.frozen) throw new DomainError(this.id + ' is frozen');
    this.#balance += amount;
  }
}

// Domain SERVICE: the rule involves TWO accounts, so it belongs to neither.
// Stateless: everything it needs comes in as arguments.
const TransferService = {
  transfer(from, to, amount, currency) {
    if (from.id === to.id) throw new DomainError('Cannot transfer to the same account');
    if (!Number.isInteger(amount) || amount <= 0) throw new DomainError('Amount must be positive');
    if (from.currency !== currency || to.currency !== currency) {
      throw new DomainError('Both accounts must be in ' + currency + ' (use an FX transfer)');
    }
    if (to.frozen) throw new DomainError(to.id + ' is frozen'); // check BEFORE withdrawing
    from.withdraw(amount);
    to.deposit(amount);
    return { from: from.id, to: to.id, amount, currency };
  },
};

// ---------- Application layer ----------
// Application SERVICE: one use case. Loads, delegates to the domain, saves.
// No business rules here: only orchestration (repo, transaction, auth, logging).
class TransferMoneyHandler {
  constructor(accounts) {
    this.accounts = accounts;
  }

  handle(command) {
    const from = this.accounts.get(command.fromId);
    const to = this.accounts.get(command.toId);
    if (!from || !to) return { ok: false, error: 'Unknown account' };
    try {
      const receipt = TransferService.transfer(from, to, command.amount, command.currency);
      // real code: save both inside one DB transaction (same bounded context, same DB)
      return { ok: true, receipt };
    } catch (e) {
      if (e instanceof DomainError) return { ok: false, error: e.message };
      throw e;
    }
  }
}

// In-memory "repository"
const accounts = new Map([
  ['ACC-1', new Account('ACC-1', 'AUD', 50000)],
  ['ACC-2', new Account('ACC-2', 'AUD', 1000)],
  ['ACC-3', new Account('ACC-3', 'THB', 900000)],
  ['ACC-4', new Account('ACC-4', 'AUD', 0, true)],
]);
const handler = new TransferMoneyHandler(accounts);

const commands = [
  { fromId: 'ACC-1', toId: 'ACC-2', amount: 12500, currency: 'AUD' },
  { fromId: 'ACC-2', toId: 'ACC-1', amount: 999999, currency: 'AUD' },
  { fromId: 'ACC-1', toId: 'ACC-3', amount: 1000, currency: 'AUD' },
  { fromId: 'ACC-1', toId: 'ACC-4', amount: 1000, currency: 'AUD' },
  { fromId: 'ACC-1', toId: 'ACC-1', amount: 1000, currency: 'AUD' },
];

for (const cmd of commands) {
  const result = handler.handle(cmd);
  const label = cmd.fromId + ' -> ' + cmd.toId + ' ' + cmd.amount;
  console.log(label.padEnd(24), result.ok ? 'OK' : 'REJECTED: ' + result.error);
}

console.log('ACC-1:', accounts.get('ACC-1').balance, '| ACC-2:', accounts.get('ACC-2').balance,
  '| ACC-4:', accounts.get('ACC-4').balance);`,
        explain: `
          <details>
            <summary>Who does what</summary>
            <table>
              <tr><th>Piece</th><th>Responsibility</th><th>Rules it owns</th></tr>
              <tr><td><code>Account</code> (aggregate)</td><td>its own balance</td><td>no overdraft, frozen accounts can't move money</td></tr>
              <tr><td><code>TransferService</code> (domain service)</td><td>a transfer between two accounts</td><td>not same account, positive amount, same currency, check target before withdrawing</td></tr>
              <tr><td><code>TransferMoneyHandler</code> (application service)</td><td>one use case</td><td>none: load, delegate, map errors to a result, (save)</td></tr>
            </table>
          </details>
          <details>
            <summary>Step by step: the five commands</summary>
            <table>
              <tr><th>Command</th><th>Rejected by</th><th>Console</th></tr>
              <tr><td>ACC-1 → ACC-2 12500</td><td>-</td><td><code>ACC-1 -&gt; ACC-2 12500     OK</code></td></tr>
              <tr><td>ACC-2 → ACC-1 999999</td><td><code>Account.withdraw</code></td><td><code>REJECTED: ACC-2 has insufficient funds</code></td></tr>
              <tr><td>ACC-1 → ACC-3 (THB)</td><td><code>TransferService</code></td><td><code>REJECTED: Both accounts must be in AUD (use an FX transfer)</code></td></tr>
              <tr><td>ACC-1 → ACC-4 (frozen)</td><td><code>TransferService</code>, <em>before</em> withdrawing</td><td><code>REJECTED: ACC-4 is frozen</code></td></tr>
              <tr><td>ACC-1 → ACC-1</td><td><code>TransferService</code></td><td><code>REJECTED: Cannot transfer to the same account</code></td></tr>
            </table>
            <p>Final balances: <code>ACC-1: 37500 | ACC-2: 13500 | ACC-4: 0</code>. Only the first
            transfer moved money: 50000 − 12500 and 1000 + 12500.</p>
          </details>
          <details>
            <summary>Try this: why the target check comes first</summary>
            <p>Delete the line <code>if (to.frozen) throw ...</code> from <code>TransferService</code>
            and run again. The ACC-4 transfer is still rejected (by <code>deposit</code>), but look
            at ACC-1: it is now <strong>36500</strong>. <code>withdraw</code> succeeded, then
            <code>deposit</code> threw. 10.00 vanished. In real code the DB transaction would roll
            back, but your in-memory objects are now wrong. Validate everything, then mutate:
            the same rule as for a single aggregate.</p>
          </details>
        `,
      },
      {
        title: 'Anti-pattern: the anemic "service" dumping ground',
        runnable: false,
        code: `// ❌ Booking is a bag of fields; every rule lives in a giant service.
class Booking {
  pnr; status; passengers = []; segments = []; paidAmount; // no behaviour
}

class BookingService {
  addPassenger(booking, pax) {
    if (booking.passengers.length >= 9) throw new Error('max 9');
    booking.passengers.push(pax);
  }
  confirm(booking) { booking.status = 'CONFIRMED'; }        // no state check
  cancel(booking) { booking.status = 'CANCELLED'; }
  changeSeat(booking, paxId, seat) { /* ... */ }
  sendConfirmationEmail(booking) { /* ... */ }               // infrastructure mixed in
  calculateRefund(booking) { /* ... */ }
  // ...35 more methods. And CheckInController does booking.passengers.push(...) anyway.
}

// ✅ Behaviour back on the aggregate; a domain service only where it truly spans objects.
class Booking {
  addPassenger(pax) { /* checks invariants */ }
  confirm(paymentRef) { /* HELD -> CONFIRMED */ }
}
const RefundPolicy = {                      // domain service: booking + fare rules + time
  refundFor(booking, fareRules, now) { /* ... */ },
};
class ConfirmBookingHandler {               // application service: orchestration only
  handle(cmd) { /* load booking, booking.confirm(), save, publish events */ }
}`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop needs "rebook a passenger from a cancelled flight onto the best alternative flight". It needs the booking, the disruption, and available inventory on several flights. Where does the decision logic go?',
        options: [
          'In the controller',
          'Inside the <code>Flight</code> entity',
          'In a <code>RebookingService</code> domain service that takes those objects and returns a decision',
          'In a database stored procedure',
        ],
        answer: 2,
        why: 'It is a named business operation spanning several aggregates with no natural single owner. That is the textbook case for a stateless domain service.',
      },
      {
        q: 'Which of these belongs in an <em>application</em> service rather than a domain service?',
        options: [
          '"Load both accounts, call the transfer, save in one DB transaction, return a DTO"',
          '"A transfer must be in the same currency"',
          '"Children pay 75% of the adult fare"',
          '"Infants pay a flat fee"',
        ],
        answer: 0,
        why: 'Loading, saving, transactions and DTOs are orchestration. The other three are business rules, which belong in the domain.',
      },
      {
        q: 'A code review finds <code>BookingService</code> with 45 methods, and <code>Booking</code> has only getters and setters. What\'s the diagnosis?',
        options: [
          'Good separation of concerns',
          'Too few services, split into 45 services',
          'Booking should be a value object',
          'An anemic domain model: move behaviour back into the Booking aggregate and keep services for true cross-object operations',
        ],
        answer: 3,
        why: 'Services full of rules + data-only entities = anemic model. Nothing protects invariants, so any code can set fields directly.',
      },
    ],
    exercise: {
      task: `<p>Implement <code>PricingService.quote(request)</code>, a stateless domain service for
      SkyHop fares (all amounts are integer AUD cents):</p>
      <ul>
        <li>Look up the adult fare in <code>FARE_BUCKETS</code>; unknown bucket → <code>DomainError</code>.</li>
        <li><code>ADULT</code> pays the bucket fare, <code>CHILD</code> pays 75% (<code>Math.round</code>), <code>INFANT</code> pays <code>INFANT_FLAT</code>.</li>
        <li>Each bag costs <code>BAG_PRICE</code>.</li>
        <li>An optional <code>promo</code> gives a % discount on <strong>adult + child fares only</strong> (not infants, not bags). Unknown promo → <code>DomainError</code>.</li>
        <li>Return <code>{ fares, bags, discount, total }</code>.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Pricing rules (would come from the Pricing context). Integer AUD cents, one-way.
const FARE_BUCKETS = { Y: 32000, M: 18000, Q: 9900 };
const CHILD_RATE = 0.75; // children pay 75% of the bucket fare
const INFANT_FLAT = 3000; // lap infants pay a flat 30.00
const BAG_PRICE = 3500; // each checked bag 35.00
const PROMOS = { HOP10: 0.1 }; // % off adult + child fares only

const PricingService = {
  quote({ bucket, passengers, bags, promo }) {
    // TODO:
    //  - look up the adult fare for the bucket (unknown bucket -> DomainError)
    //  - ADULT pays it, CHILD pays 75% (Math.round), INFANT pays INFANT_FLAT
    //  - bags cost BAG_PRICE each
    //  - promo % applies to ADULT + CHILD fares only (unknown promo -> DomainError)
    return { fares: 0, bags: 0, discount: 0, total: 0 };
  },
};

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

const family = { bucket: 'M', passengers: ['ADULT', 'ADULT', 'CHILD', 'INFANT'], bags: 2 };

check('1 adult, Q, no bags', PricingService.quote({ bucket: 'Q', passengers: ['ADULT'], bags: 0 }),
  { fares: 9900, bags: 0, discount: 0, total: 9900 });
check('family on M with 2 bags', PricingService.quote(family),
  { fares: 52500, bags: 7000, discount: 0, total: 59500 });
check('family with HOP10', PricingService.quote({ ...family, promo: 'HOP10' }),
  { fares: 52500, bags: 7000, discount: 4950, total: 54550 });
expectThrows('unknown fare bucket', () =>
  PricingService.quote({ bucket: 'Z', passengers: ['ADULT'], bags: 0 }));
expectThrows('unknown promo', () => PricingService.quote({ ...family, promo: 'FREE100' }));`,
      hint: 'Loop over passengers keeping two sums: <code>fares</code> (everyone) and <code>discountable</code> (adults + children). Discount = <code>Math.round(discountable * PROMOS[promo])</code>. For the family: 18000 + 18000 + 13500 + 3000 = 52500.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// Pricing rules (would come from the Pricing context). Integer AUD cents, one-way.
const FARE_BUCKETS = { Y: 32000, M: 18000, Q: 9900 };
const CHILD_RATE = 0.75; // children pay 75% of the bucket fare
const INFANT_FLAT = 3000; // lap infants pay a flat 30.00
const BAG_PRICE = 3500; // each checked bag 35.00
const PROMOS = { HOP10: 0.1 }; // % off adult + child fares only

// Domain service: pricing needs fare rules + passenger mix + ancillaries + promo.
// No single entity owns that, and it keeps no state between calls.
const PricingService = {
  quote({ bucket, passengers, bags, promo }) {
    const adultFare = FARE_BUCKETS[bucket];
    if (adultFare === undefined) throw new DomainError('Unknown fare bucket ' + bucket);
    if (promo !== undefined && !(promo in PROMOS)) throw new DomainError('Unknown promo ' + promo);

    let discountable = 0;
    let fares = 0;
    for (const type of passengers) {
      if (type === 'INFANT') {
        fares += INFANT_FLAT;
        continue;
      }
      const fare = type === 'CHILD' ? Math.round(adultFare * CHILD_RATE) : adultFare;
      fares += fare;
      discountable += fare;
    }

    const discount = promo ? Math.round(discountable * PROMOS[promo]) : 0;
    const bagTotal = bags * BAG_PRICE;
    return { fares, bags: bagTotal, discount, total: fares + bagTotal - discount };
  },
};

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

const family = { bucket: 'M', passengers: ['ADULT', 'ADULT', 'CHILD', 'INFANT'], bags: 2 };

check('1 adult, Q, no bags', PricingService.quote({ bucket: 'Q', passengers: ['ADULT'], bags: 0 }),
  { fares: 9900, bags: 0, discount: 0, total: 9900 });
check('family on M with 2 bags', PricingService.quote(family),
  { fares: 52500, bags: 7000, discount: 0, total: 59500 });
check('family with HOP10', PricingService.quote({ ...family, promo: 'HOP10' }),
  { fares: 52500, bags: 7000, discount: 4950, total: 54550 });
expectThrows('unknown fare bucket', () =>
  PricingService.quote({ bucket: 'Z', passengers: ['ADULT'], bags: 0 }));
expectThrows('unknown promo', () => PricingService.quote({ ...family, promo: 'FREE100' }));`,
    },
  },

  // ───────────────────────────────────────────────────────────── factories
  {
    id: 'factories',
    section: 'Tactical Building Blocks',
    title: 'Factories',
    explain: `
      <p>Creating an aggregate is often a business operation in its own right. A SkyHop booking
      isn't conjured from nothing: it is born from a <strong>fare quote</strong> the customer held
      for 20 minutes, it needs a fresh PNR, the passenger count must match the seats quoted, and
      the moment it exists, other parts of the system should hear <code>BookingCreated</code>. A
      <strong>factory</strong> wraps that creation logic so the result is always a valid,
      complete aggregate.</p>

      <h3>Two flavours</h3>
      <ul>
        <li><strong>Static factory method</strong> on the root: <code>Booking.fromQuote(quote, passengers, pnr, now)</code>.
        Named in the ubiquitous language, keeps creation rules next to the aggregate. The default choice.</li>
        <li><strong>Factory object</strong>: <code>new BookingFactory({ pnrGenerator, clock, pricing })</code>.
        Use it when creation needs collaborators the aggregate shouldn't know about, or creates
        several aggregates at once (a 22-student school group split into three PNRs).</li>
      </ul>
      <p>A plain <code>constructor</code> is fine for simple things (value objects). The trouble
      starts when one constructor has to mean two different things.</p>

      <h3>Creation vs reconstitution</h3>
      <table>
        <tr><th></th><th>Creation (<code>fromQuote</code>)</th><th>Reconstitution (<code>reconstitute</code>)</th></tr>
        <tr><td>Meaning</td><td>Something new happened in the business</td><td>Rebuilding an existing aggregate from storage</td></tr>
        <tr><td>Validation</td><td>All creation rules (quote not expired, pax count)</td><td>Trust stored data. The quote expired weeks ago, and that's fine</td></tr>
        <tr><td>New id?</td><td>Yes</td><td>No, use the stored one</td></tr>
        <tr><td>Domain events</td><td><code>BookingCreated</code></td><td><strong>None</strong>, nothing happened</td></tr>
        <tr><td>Called by</td><td>Application service</td><td>Repository only</td></tr>
      </table>

      <div class="warn"><strong>Classic bug:</strong> the constructor records
      <code>BookingCreated</code>, and the repository uses the same constructor to load bookings.
      Every page view now "creates" the booking again: welcome emails go out on every load,
      analytics counts 3× the sales. Reconstitution must never raise domain events.</div>

      <div class="tip"><strong>In the real world:</strong> ORMs (TypeORM, Hibernate, Entity Framework) bypass your
      constructor or call a no-arg one when loading. That's a form of reconstitution, which is
      why creation logic shouldn't live in the constructor. Event-sourced systems reconstitute by
      replaying stored events with an <code>apply</code> method that changes state without
      recording new events. Keep factories boring: validate, assemble, record one creation event.</div>
    `,
    examples: [
      {
        title: 'Booking.fromQuote vs Booking.reconstitute',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ❌ Naive: one constructor used for BOTH "new booking" and "load from DB"
class NaiveBooking {
  constructor(pnr, passengers, status) {
    this.pnr = pnr;
    this.passengers = passengers;
    this.status = status;
    this.events = [{ type: 'BookingCreated', pnr }]; // fires on every load too!
  }
}

// ✅ Two named entry points with different meaning
const INTERNAL = Symbol('internal'); // only code in this module can call the constructor

class Booking {
  #events = [];

  constructor(token, pnr, quote, passengers, status) {
    if (token !== INTERNAL) throw new Error('Use Booking.fromQuote() or Booking.reconstitute()');
    this.pnr = pnr;
    this.quote = quote;
    this.passengers = passengers;
    this.status = status;
  }

  // CREATION: a new booking is born from a fare quote the customer held
  static fromQuote(quote, passengers, pnr, now) {
    if (now > quote.expiresAt) {
      throw new DomainError('Quote ' + quote.id + ' expired at ' + quote.expiresAt.toISOString());
    }
    if (passengers.length === 0) throw new DomainError('A booking needs at least one passenger');
    if (passengers.length !== quote.seats) {
      throw new DomainError('Quote ' + quote.id + ' is for ' + quote.seats + ' seat(s), got ' +
        passengers.length + ' passenger(s)');
    }
    const booking = new Booking(INTERNAL, pnr, quote, [...passengers], 'HELD');
    booking.#events.push({ type: 'BookingCreated', pnr, flight: quote.flight, total: quote.total });
    return booking;
  }

  // RECONSTITUTION: the booking already exists; we're just rebuilding it from storage.
  // No validation of "is the quote still valid?" (it expired weeks ago, that's fine)
  // and NO events: nothing happened in the domain.
  static reconstitute(row) {
    return new Booking(INTERNAL, row.pnr, row.quote, row.passengers, row.status);
  }

  pullEvents() {
    const events = this.#events;
    this.#events = [];
    return events;
  }
}

const now = new Date('2026-11-01T08:00:00Z');
const quote = {
  id: 'Q-77',
  flight: 'SH101',
  seats: 2,
  total: 19800,
  expiresAt: new Date('2026-11-01T08:20:00Z'), // a 20-minute fare hold
};

// --- naive version: loading 3 times = 3 "new booking" emails ---
const dbRow = { pnr: 'SKY001', quote, passengers: ['Ana', 'Ben'], status: 'CONFIRMED' };
let naiveEvents = 0;
for (let i = 0; i < 3; i++) naiveEvents += new NaiveBooking(dbRow.pnr, dbRow.passengers, dbRow.status).events.length;
console.log('naive: loaded 3 times ->', naiveEvents, 'BookingCreated events (3 welcome emails!)');

// --- creation ---
const created = Booking.fromQuote(quote, ['Ana', 'Ben'], 'SKY001', now);
console.log('fromQuote ->', created.pnr, created.status, '| events:', created.pullEvents().map((e) => e.type));

// --- reconstitution ---
let loadedEvents = 0;
for (let i = 0; i < 3; i++) loadedEvents += Booking.reconstitute(dbRow).pullEvents().length;
const loaded = Booking.reconstitute(dbRow);
console.log('reconstitute ->', loaded.pnr, loaded.status, '| events after 3 loads:', loadedEvents);

// --- invalid creations are impossible ---
const attempts = [
  ['expired quote', () => Booking.fromQuote(quote, ['Ana', 'Ben'], 'SKY002', new Date('2026-11-01T08:21:00Z'))],
  ['no passengers', () => Booking.fromQuote(quote, [], 'SKY003', now)],
  ['wrong pax count', () => Booking.fromQuote(quote, ['Ana'], 'SKY004', now)],
  ['raw constructor', () => new Booking('x', 'SKY005', quote, ['Ana'], 'CONFIRMED')],
];

for (const [label, make] of attempts) {
  try {
    make();
  } catch (e) {
    console.log('rejected', label + ':', e.message);
  }
}`,
        explain: `
          <details>
            <summary>The problem: one constructor, two meanings</summary>
            <p><code>NaiveBooking</code>'s constructor records <code>BookingCreated</code>. The
            repository also uses it to load rows. Load SKY001 three times (booking page, manage-booking
            page, check-in):</p>
            <table>
              <tr><th>Load #</th><th>Events recorded</th><th>What a subscriber does</th></tr>
              <tr><td>1</td><td><code>BookingCreated SKY001</code></td><td>sends "Thanks for booking!"</td></tr>
              <tr><td>2</td><td><code>BookingCreated SKY001</code></td><td>sends it again</td></tr>
              <tr><td>3</td><td><code>BookingCreated SKY001</code></td><td>and again</td></tr>
            </table>
            <p>Console: <code>naive: loaded 3 times -&gt; 3 BookingCreated events (3 welcome emails!)</code></p>
          </details>
          <details>
            <summary>Step by step: the fixed version</summary>
            <table>
              <tr><th>Call</th><th>What happens</th><th>Console</th></tr>
              <tr><td><code>fromQuote(quote, [Ana, Ben], 'SKY001', 08:00)</code></td><td>quote valid until 08:20, 2 seats = 2 pax → HELD + 1 event</td><td><code>fromQuote -&gt; SKY001 HELD | events: ["BookingCreated"]</code></td></tr>
              <tr><td><code>reconstitute(dbRow)</code> × 3</td><td>status from the row (CONFIRMED), no checks, no events</td><td><code>reconstitute -&gt; SKY001 CONFIRMED | events after 3 loads: 0</code></td></tr>
              <tr><td>at 08:21</td><td>quote expired</td><td><code>rejected expired quote: Quote Q-77 expired at 2026-11-01T08:20:00.000Z</code></td></tr>
              <tr><td>no passengers</td><td></td><td><code>rejected no passengers: A booking needs at least one passenger</code></td></tr>
              <tr><td>1 pax on a 2-seat quote</td><td></td><td><code>rejected wrong pax count: Quote Q-77 is for 2 seat(s), got 1 passenger(s)</code></td></tr>
              <tr><td><code>new Booking('x', ...)</code></td><td>wrong token</td><td><code>rejected raw constructor: Use Booking.fromQuote() or Booking.reconstitute()</code></td></tr>
            </table>
            <p>Note that <code>reconstitute</code> happily loads a booking whose quote expired long
            ago: the rule "quote must be valid" is a <em>creation</em> rule, not an invariant of
            an existing booking.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const INTERNAL = Symbol('internal');              // ① a secret only this module has
if (token !== INTERNAL) throw ...                 // ② "private constructor"
booking.#events.push({ type: 'BookingCreated' }); // ③ only in the creation path
static reconstitute(row) { return new Booking(INTERNAL, row.pnr, ...); }  // ④ no event</code></pre>
            <ol>
              <li><strong>①②</strong> JS has no private constructors. A module-private <code>Symbol</code> works as one: outside code can't produce the token, so it must use a named factory.</li>
              <li><strong>③</strong> The creation event belongs to the creation <em>story</em>, so it lives in <code>fromQuote</code>, not the constructor.</li>
              <li><strong>④</strong> Reconstitution just restores state. In TypeScript/Java you'd make it package-private or put it on the repository's mapper.</li>
            </ol>
          </details>
        `,
      },
      {
        title: 'A factory object with collaborators: group bookings',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Booking {
  constructor(pnr, flight, passengers, total, createdAt) {
    this.pnr = pnr;
    this.flight = flight;
    this.passengers = passengers;
    this.total = total;
    this.createdAt = createdAt;
    this.status = 'HELD';
  }
}

// A factory OBJECT: creation needs collaborators (id generator, clock, pricing),
// which a static method on Booking shouldn't have to know about.
class BookingFactory {
  constructor({ pnrGenerator, clock, pricing }) {
    this.pnrGenerator = pnrGenerator;
    this.clock = clock;
    this.pricing = pricing;
  }

  createGroupBooking(flight, passengers) {
    if (passengers.length < 10) {
      throw new DomainError('Group bookings start at 10 passengers (got ' + passengers.length + ')');
    }
    // Groups are split into several PNRs of max 9 (SkyHop rule), all priced together
    const total = this.pricing.groupFare(flight, passengers.length);
    const perPax = Math.floor(total / passengers.length);
    const bookings = [];
    for (let i = 0; i < passengers.length; i += 9) {
      const chunk = passengers.slice(i, i + 9);
      bookings.push(new Booking(this.pnrGenerator.next(), flight, chunk, perPax * chunk.length,
        this.clock.now()));
    }
    return bookings;
  }
}

// Collaborators: deterministic fakes (in production: real generator, system clock, Pricing API)
let seq = 0;
const pnrGenerator = { next: () => 'GRP' + String(++seq).padStart(3, '0') };
const clock = { now: () => new Date('2026-11-01T08:00:00Z') };
const pricing = { groupFare: (flight, count) => count * 8900 }; // flat 89.00 pp

const factory = new BookingFactory({ pnrGenerator, clock, pricing });

const school = [];
for (let i = 1; i <= 22; i++) school.push('Student' + i);

const bookings = factory.createGroupBooking('SH101', school);
for (const b of bookings) {
  console.log(b.pnr, b.flight, 'pax=' + b.passengers.length, 'total=' + b.total, b.status);
}

try {
  factory.createGroupBooking('SH101', ['Ana', 'Ben']);
} catch (e) {
  console.log('rejected:', e.message);
}`,
        explain: `
          <details>
            <summary>Why an object instead of a static method?</summary>
            <p>Creating a group booking needs a PNR generator, a clock and the Pricing context's
            group fare. Passing three collaborators into <code>Booking.createGroup(...)</code> every
            time is noisy, and the <code>Booking</code> aggregate shouldn't depend on pricing
            infrastructure. A <code>BookingFactory</code> gets them once (dependency injection) and
            exposes a clean domain operation. It also returns <em>several</em> aggregates: 22
            students become <code>GRP001</code> (9), <code>GRP002</code> (9), <code>GRP003</code> (4),
            at 89.00 each (<code>total=80100</code> = 9 × 8900).</p>
            <p>Try this: swap <code>pricing</code> for <code>{ groupFare: (f, n) =&gt; n * 8900 - 5000 }</code>
            (a 50.00 group discount). <code>Math.floor</code> on the per-passenger share now loses
            cents. Could you fix that with the <code>allocate</code> method from the value-objects
            exercise?</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'After a release, customers get a "Thanks for booking!" email every time they open Manage Booking. Most likely cause?',
        options: [
          'The email service retries too often',
          'Loading a booking from the DB goes through the same code path that records <code>BookingCreated</code>; reconstitution is raising creation events',
          'The browser caches the page',
          'The booking aggregate is too big',
        ],
        answer: 1,
        why: 'Reconstitution rebuilds an existing aggregate and must not record domain events. Split creation (factory) from reconstitution (repository).',
      },
      {
        q: 'Creating a SkyHop booking needs a PNR generator, the current time and a call to Pricing. Best home for that logic?',
        options: [
          'The Booking constructor, importing those services directly',
          'A <code>BookingFactory</code> object with those collaborators injected, returning a valid Booking',
          'The controller',
          'A database trigger',
        ],
        answer: 1,
        why: 'When creation needs collaborators, a factory object keeps the aggregate free of infrastructure dependencies and keeps creation logic in the domain.',
      },
      {
        q: 'When reconstituting a booking created from a quote that expired 3 weeks ago, should the code reject it because the quote is expired?',
        options: [
          'Yes, data must always be validated',
          'Yes, and delete the booking',
          'Only on Mondays',
          'No: "quote not expired" is a rule about creating a booking, not an invariant of an existing one',
        ],
        answer: 3,
        why: 'Creation rules and invariants are different. Rejecting stored data because a creation-time rule no longer holds would make old bookings unloadable.',
      },
    ],
    exercise: {
      task: `<p>Split creation from reconstitution:</p>
      <ul>
        <li><code>Booking.create(quote, passengers, pnr, now)</code>: reject an expired quote and a
        passenger count different from <code>quote.seats</code> (<code>DomainError</code>), return a
        <code>HELD</code> booking that has recorded one <code>BookingCreated</code> event.</li>
        <li><code>Booking.reconstitute(row)</code>: rebuild exactly what was stored (including status),
        with <strong>no</strong> events and no quote checks.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Booking {
  #events = [];

  constructor(pnr, flight, passengers, status) {
    this.pnr = pnr;
    this.flight = flight;
    this.passengers = passengers;
    this.status = status;
  }

  record(event) {
    this.#events.push(event);
  }

  pullEvents() {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  toRow() {
    return { pnr: this.pnr, flight: this.flight, passengers: this.passengers, status: this.status };
  }

  static create(quote, passengers, pnr, now) {
    // TODO: reject an expired quote and a passenger count that doesn't match quote.seats,
    // build a HELD booking and record a BookingCreated event
    return new Booking(pnr, quote.flight, passengers, 'HELD');
  }

  static reconstitute(row) {
    // TODO: this is the naive version. What's wrong with the status and the event?
    const booking = new Booking(row.pnr, row.flight, row.passengers, 'HELD');
    booking.record({ type: 'BookingCreated', pnr: row.pnr, flight: row.flight });
    return booking;
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

const now = new Date('2026-11-01T08:00:00Z');
const quote = { id: 'Q-9', flight: 'SH205', seats: 1, expiresAt: new Date('2026-11-01T08:20:00Z') };

const fresh = Booking.create(quote, ['Ana'], 'SKY010', now);
check('created booking is HELD', fresh.status, 'HELD');
check('creation records BookingCreated', fresh.pullEvents().map((e) => e.type), ['BookingCreated']);

const row = { pnr: 'SKY009', flight: 'SH101', passengers: ['Ben'], status: 'CONFIRMED' };
const loaded = Booking.reconstitute(row);
check('reconstitute keeps stored status', loaded.status, 'CONFIRMED');
check('reconstitute keeps the data', loaded.toRow(), row);
check('reconstitute records NO events', loaded.pullEvents().length, 0);

expectThrows('expired quote', () =>
  Booking.create(quote, ['Ana'], 'SKY011', new Date('2026-11-01T09:00:00Z')));
expectThrows('passenger count must match quote', () =>
  Booking.create(quote, ['Ana', 'Ben'], 'SKY012', now));`,
      hint: 'In <code>create</code>: check, then <code>new Booking(pnr, quote.flight, [...passengers], "HELD")</code>, then <code>booking.record({ type: "BookingCreated", ... })</code>. In <code>reconstitute</code>: just <code>new Booking(row.pnr, row.flight, [...row.passengers], row.status)</code>.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class Booking {
  #events = [];

  constructor(pnr, flight, passengers, status) {
    this.pnr = pnr;
    this.flight = flight;
    this.passengers = passengers;
    this.status = status;
  }

  record(event) {
    this.#events.push(event);
  }

  pullEvents() {
    const events = this.#events;
    this.#events = [];
    return events;
  }

  toRow() {
    return { pnr: this.pnr, flight: this.flight, passengers: this.passengers, status: this.status };
  }

  static create(quote, passengers, pnr, now) {
    if (now > quote.expiresAt) throw new DomainError('Quote ' + quote.id + ' has expired');
    if (passengers.length !== quote.seats) {
      throw new DomainError('Quote is for ' + quote.seats + ' passenger(s), got ' + passengers.length);
    }
    const booking = new Booking(pnr, quote.flight, [...passengers], 'HELD');
    booking.record({ type: 'BookingCreated', pnr, flight: quote.flight });
    return booking;
  }

  static reconstitute(row) {
    // trust stored data, no validation of the (old) quote, no events
    return new Booking(row.pnr, row.flight, [...row.passengers], row.status);
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

const now = new Date('2026-11-01T08:00:00Z');
const quote = { id: 'Q-9', flight: 'SH205', seats: 1, expiresAt: new Date('2026-11-01T08:20:00Z') };

const fresh = Booking.create(quote, ['Ana'], 'SKY010', now);
check('created booking is HELD', fresh.status, 'HELD');
check('creation records BookingCreated', fresh.pullEvents().map((e) => e.type), ['BookingCreated']);

const row = { pnr: 'SKY009', flight: 'SH101', passengers: ['Ben'], status: 'CONFIRMED' };
const loaded = Booking.reconstitute(row);
check('reconstitute keeps stored status', loaded.status, 'CONFIRMED');
check('reconstitute keeps the data', loaded.toRow(), row);
check('reconstitute records NO events', loaded.pullEvents().length, 0);

expectThrows('expired quote', () =>
  Booking.create(quote, ['Ana'], 'SKY011', new Date('2026-11-01T09:00:00Z')));
expectThrows('passenger count must match quote', () =>
  Booking.create(quote, ['Ana', 'Ben'], 'SKY012', now));`,
    },
  },

  // ───────────────────────────────────────────────────────────── repositories
  {
    id: 'repositories',
    section: 'Tactical Building Blocks',
    title: 'Repositories',
    explain: `
      <p>A <strong>repository</strong> gives the domain the illusion of an in-memory
      <em>collection of aggregates</em>: "give me booking SKY001", "here, keep this booking".
      Behind it sits Postgres, DynamoDB or a REST call, but the domain doesn't know or care.
      Evans: one repository per <strong>aggregate root</strong>, nothing else.</p>

      <h3>The shape</h3>
      <pre><code>// Domain layer: the interface (TypeScript, for clarity)
interface BookingRepository {
  nextPnr(): PNR;
  findByPnr(pnr: PNR): Booking | null;     // loads the WHOLE aggregate
  findByPassengerEmail(email: Email): Booking[];  // domain-meaningful queries only
  save(booking: Booking): SaveResult;      // the whole aggregate, with a version check
}
// Infrastructure layer: PostgresBookingRepository implements BookingRepository</code></pre>
      <ul>
        <li><strong>Whole aggregates in, whole aggregates out.</strong> Loading "just the
        passengers" or saving "just the bags column" bypasses the root and its invariants.</li>
        <li><strong>Interface in the domain, implementation in infrastructure</strong> (dependency
        inversion). The domain and its tests use an in-memory implementation.</li>
        <li><strong>Optimistic concurrency</strong>: each aggregate carries a version; <code>save</code>
        fails if someone saved a newer one since you loaded. Prevents <em>lost updates</em>.</li>
        <li><strong>Queries named in the language</strong>: <code>findDueForCheckInReminder(now)</code>,
        not <code>findWhere({ col, op, value })</code>.</li>
      </ul>

      <h3>What a repository is not</h3>
      <ul>
        <li><strong>Not one per table.</strong> <code>PassengerRepository</code>,
        <code>SegmentRepository</code> and <code>BagRepository</code> let code edit the inside of
        a booking without the root. Passengers are saved <em>with</em> their booking.</li>
        <li><strong>Not a generic <code>Repository&lt;T&gt;</code></strong> with
        <code>update(id, partialFields)</code> and <code>query(anything)</code>. That's a thin DAO
        that exposes the DB to the domain. A generic <em>base class</em> internally is fine; the
        domain-facing interface should be specific.</li>
        <li><strong>Not for reports and screens.</strong> "Revenue per route last month" doesn't
        need aggregates. Use a plain SQL query or a read model (see CQRS).</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> the version check is usually one SQL
      clause: <code>UPDATE bookings SET data = $1, version = version + 1 WHERE pnr = $2 AND version = $3</code>,
      and "0 rows updated" means conflict. With an ORM, the same feature is called <em>optimistic
      locking</em> (<code>@Version</code> in JPA, row version / concurrency token in EF Core,
      <code>lock_version</code> in Rails). Many teams store the aggregate as a JSON document
      in a single row: one read, one write, no joins, natural aggregate boundaries.</div>
    `,
    examples: [
      {
        title: 'In-memory BookingRepository with optimistic concurrency',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- Domain: the Booking aggregate ----------
class Booking {
  #pnr;
  #email;
  #bags;
  #version; // which stored version this object was loaded from (0 = never saved)

  constructor(pnr, email, bags, version) {
    this.#pnr = pnr;
    this.#email = email;
    this.#bags = bags;
    this.#version = version;
  }

  static create(pnr, email) {
    return new Booking(pnr, email, 0, 0);
  }

  get pnr() {
    return this.#pnr;
  }

  get version() {
    return this.#version;
  }

  addBag() {
    if (this.#bags >= 3) throw new DomainError('Max 3 bags per booking');
    this.#bags += 1;
  }

  changeEmail(email) {
    this.#email = email;
  }

  toSnapshot() {
    return { pnr: this.#pnr, email: this.#email, bags: this.#bags };
  }

  static fromSnapshot(data, version) {
    return new Booking(data.pnr, data.email, data.bags, version);
  }

  markSaved(version) {
    this.#version = version;
  }

  describe() {
    return this.#pnr + ' v' + this.#version + ' email=' + this.#email + ' bags=' + this.#bags;
  }
}

// ---------- The repository: a collection of Booking aggregates ----------
// Interface the domain sees (in TS this would be an interface in the domain layer):
//   nextPnr(), findByPnr(pnr), save(booking)
class InMemoryBookingRepository {
  #rows = new Map(); // pnr -> { version, data }
  #seq = 0;

  nextPnr() {
    this.#seq += 1;
    return 'SKY' + String(this.#seq).padStart(3, '0');
  }

  findByPnr(pnr) {
    const row = this.#rows.get(pnr);
    if (!row) return null;
    // A fresh copy every time: like reading from a real DB
    return Booking.fromSnapshot(structuredClone(row.data), row.version);
  }

  save(booking) {
    const row = this.#rows.get(booking.pnr);
    const current = row ? row.version : 0;
    if (current !== booking.version) {
      return { ok: false, conflict: { expected: booking.version, actual: current } };
    }
    const next = current + 1;
    this.#rows.set(booking.pnr, { version: next, data: structuredClone(booking.toSnapshot()) });
    booking.markSaved(next);
    return { ok: true, version: next };
  }
}

const repo = new InMemoryBookingRepository();

// 1. Create and save
const pnr = repo.nextPnr();
const created = Booking.create(pnr, 'ana@example.com');
console.log('1. save new:', repo.save(created), '->', created.describe());

// 2. Two channels load the same booking
const web = repo.findByPnr(pnr);
const callCentre = repo.findByPnr(pnr);
console.log('2. web and call centre both loaded v' + web.version, '| same object?', web === callCentre);

// 3. Web adds a bag and saves first
web.addBag();
console.log('3. web save:', repo.save(web));

// 4. Call centre changes the email based on what it loaded (v1) -> conflict
callCentre.changeEmail('ana.new@example.com');
console.log('4. call centre save:', repo.save(callCentre));

// 5. Correct reaction: reload the latest version, re-apply the intent, save again
const fresh = repo.findByPnr(pnr);
fresh.changeEmail('ana.new@example.com');
console.log('5. retry save:', repo.save(fresh), '->', repo.findByPnr(pnr).describe());

// 6. Changing a loaded object without save() changes nothing in storage
const scratch = repo.findByPnr(pnr);
scratch.addBag();
console.log('6. unsaved change ->', repo.findByPnr(pnr).describe());

// 7. Not found is a normal answer, not an exception
console.log('7. findByPnr("NOPE1"):', repo.findByPnr('NOPE1'));`,
        explain: `
          <details>
            <summary>The problem: lost updates</summary>
            <p>Without a version check, "last write wins": each save writes the whole aggregate as
            that caller last saw it.</p>
            <table>
              <tr><th>Time</th><th>Web (customer)</th><th>Call centre</th><th>Stored</th></tr>
              <tr><td>t1</td><td>load: bags=0, email=ana@</td><td>load: bags=0, email=ana@</td><td>bags=0, ana@</td></tr>
              <tr><td>t2</td><td>add bag, save</td><td></td><td>bags=1, ana@</td></tr>
              <tr><td>t3</td><td></td><td>change email, save its whole copy</td><td><strong>bags=0</strong>, ana.new@ ❌</td></tr>
            </table>
            <p>The paid bag silently vanished. At the airport the customer is charged again. Nobody
            got an error.</p>
          </details>
          <details>
            <summary>Step by step: what the demo prints</summary>
            <table>
              <tr><th>Step</th><th>Stored</th><th>Console</th></tr>
              <tr><td>1. create + save (expects v0)</td><td>v1, bags=0</td><td><code>1. save new: {"ok":true,"version":1} -&gt; SKY001 v1 email=ana@example.com bags=0</code></td></tr>
              <tr><td>2. two loads</td><td>v1</td><td><code>2. web and call centre both loaded v1 | same object? false</code></td></tr>
              <tr><td>3. web: add bag, save (expects v1)</td><td>v2, bags=1</td><td><code>3. web save: {"ok":true,"version":2}</code></td></tr>
              <tr><td>4. call centre: email, save (expects v1, finds v2)</td><td>v2 unchanged</td><td><code>4. call centre save: {"ok":false,"conflict":{"expected":1,"actual":2}}</code></td></tr>
              <tr><td>5. reload v2, re-apply email, save</td><td>v3, bags=1, new email ✅</td><td><code>5. retry save: {"ok":true,"version":3} -&gt; SKY001 v3 email=ana.new@example.com bags=1</code></td></tr>
              <tr><td>6. load, add bag, <em>don't</em> save</td><td>v3, still bags=1</td><td><code>6. unsaved change -&gt; SKY001 v3 email=ana.new@example.com bags=1</code></td></tr>
              <tr><td>7. unknown PNR</td><td></td><td><code>7. findByPnr("NOPE1"): null</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>return Booking.fromSnapshot(structuredClone(row.data), row.version); // ①
if (current !== booking.version) return { ok: false, conflict: ... };   // ②
this.#rows.set(booking.pnr, { version: next, data: structuredClone(...) }); // ③
booking.markSaved(next);                                                 // ④</code></pre>
            <ol>
              <li><strong>①</strong> Every load builds a <em>new</em> aggregate from a <em>copy</em> of the data, so in-memory objects never share state with storage (step 6). A real DB does this naturally; an in-memory fake must do it on purpose, or your tests pass while production fails.</li>
              <li><strong>②</strong> The version the caller loaded must still be the latest. This is the whole optimistic concurrency mechanism.</li>
              <li><strong>③</strong> The <em>whole</em> aggregate is written at once, never "just the bags".</li>
              <li><strong>④</strong> After a successful save the object knows its new version, so the same instance can be changed and saved again.</li>
            </ol>
            <p>Returning <code>{ ok: false, conflict }</code> instead of throwing is a style choice:
            it makes "conflict" a normal, expected outcome the application service must handle
            (retry, or show "this booking was changed, please review").</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Remove the <code>if (current !== booking.version)</code> block. Step 4 now succeeds and step 5 prints <code>bags=0</code>: the lost update is back.</li>
              <li>Change step 6 to call <code>repo.save(scratch)</code> after <code>addBag()</code>: now storage shows <code>v4</code> and <code>bags=2</code>. Nothing reaches storage without an explicit <code>save</code>.</li>
            </ul>
            <div class="tip">Should retries be automatic? For <em>commutative</em> changes (adding a bag) a blind reload-and-reapply is safe. For decisions a human made from what they saw ("change the email to X because the old one bounced"), showing the conflict is often better.</div>
          </details>
        `,
      },
      {
        title: 'Anti-patterns: generic repository and repository-per-table',
        runnable: false,
        code: `// ❌ Generic repository exposed to the domain: any field, any query, partial updates.
interface Repository<T> {
  getById(id: string): T;
  update(id: string, fields: Partial<T>): void;   // skips every invariant
  query(where: Record<string, unknown>): T[];     // leaks the DB schema into the domain
}
bookingRepo.update('SKY001', { status: 'CONFIRMED' });  // no payment? no departure check?

// ❌ One repository per table: inner entities edited behind the root's back.
passengerRepo.insert({ bookingPnr: 'SKY001', type: 'INFANT' });  // 10th passenger, no adult

// ✅ One repository per aggregate root, intention-revealing, whole aggregate.
interface BookingRepository {
  nextPnr(): PNR;
  findByPnr(pnr: PNR): Booking | null;
  findDueForCheckInReminder(now: Date): Booking[];
  save(booking: Booking): { ok: true; version: number } | { ok: false; conflict: Conflict };
}

// ✅ Reports don't need aggregates: query the read side directly.
const rows = await sql\`SELECT route, sum(total_minor) FROM bookings GROUP BY route\`;`,
      },
    ],
    quiz: [
      {
        q: 'A developer adds <code>PassengerRepository.save(passenger)</code> so check-in can update a passenger\'s seat quickly. What\'s wrong?',
        options: [
          'Passengers are inside the Booking aggregate; saving them alone bypasses the root\'s invariants. Load and save the Booking',
          'Nothing, smaller writes are better',
          'It should be called <code>PassengerDAO</code>',
          'Repositories must be async',
        ],
        answer: 0,
        why: 'One repository per aggregate root. Inner entities are loaded and saved as part of the whole aggregate, through the root.',
      },
      {
        q: 'Two agents edit SKY001 at the same time. Agent B\'s save returns <code>{ ok: false, conflict }</code>. What should the application service do?',
        options: [
          'Force-save B\'s copy so the latest click wins',
          'Delete the booking and recreate it',
          'Reload the latest version and re-apply B\'s command (or show B the change if it needs a human decision)',
          'Ignore it, the user will try again',
        ],
        answer: 2,
        why: 'Optimistic concurrency detects the conflict. The fix is to redo the operation against the latest state. Force-saving recreates the lost update.',
      },
      {
        q: 'Finance wants "total ancillary revenue per route per month". Should they use <code>BookingRepository</code>?',
        options: [
          'Yes, load all bookings and sum in JS',
          'Yes, add <code>findAll()</code>',
          'No: repositories are for loading aggregates to change them. Use a SQL query or a dedicated read model for reporting',
          'Add a <code>getRevenue()</code> method to Booking',
        ],
        answer: 2,
        why: 'Loading millions of aggregates for a report is slow and pointless: nothing is being changed, so no invariants need protecting. Reads like this belong on the query side.',
      },
      {
        q: 'Your in-memory test repository stores the aggregate object itself (no copy). Why can that hide bugs?',
        options: [
          'Changes made to a loaded object appear "saved" even when save() was never called, so tests pass while the real DB version fails',
          'It uses too much memory',
          'Maps are slower than arrays',
          'It is not async',
        ],
        answer: 0,
        why: 'A real database returns fresh copies. A fake that shares references behaves differently: a forgotten <code>save()</code> goes unnoticed in tests.',
      },
    ],
    exercise: {
      task: `<p>Implement LedgerBank's <code>InMemoryAccountRepository</code>:</p>
      <ul>
        <li><code>findById(id)</code> returns a <em>new</em> <code>Account</code> built from a copy of the stored data (with its version), or <code>null</code>.</li>
        <li><code>findByOwner(ownerId)</code> returns copies of all that owner's accounts.</li>
        <li><code>save(account)</code>: if the stored version (0 if new) differs from <code>account.version</code>, return <code>{ ok: false, reason: 'conflict' }</code>. Otherwise store a copy with version + 1, set <code>account.version</code>, return <code>{ ok: true }</code>.</li>
      </ul>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// LedgerBank Account aggregate (given)
class Account {
  constructor(id, ownerId, balance, version = 0) {
    this.id = id;
    this.ownerId = ownerId;
    this.balance = balance;
    this.version = version; // 0 = never saved
  }

  deposit(amount) {
    if (amount <= 0) throw new DomainError('Deposit must be positive');
    this.balance += amount;
  }

  toData() {
    return { id: this.id, ownerId: this.ownerId, balance: this.balance };
  }
}

class InMemoryAccountRepository {
  #rows = new Map(); // id -> { version, data }
  #seq = 0;

  nextId() {
    this.#seq += 1;
    return 'ACC-' + this.#seq;
  }

  findById(id) {
    // TODO: return a NEW Account built from the stored data (or null)
    return null;
  }

  findByOwner(ownerId) {
    // TODO: return copies of all accounts of this owner
    return [];
  }

  save(account) {
    // TODO: version check -> { ok: false, reason: 'conflict' }
    // otherwise store a copy with version + 1, update account.version, return { ok: true }
    return { ok: true };
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const repo = new InMemoryAccountRepository();
const a1 = new Account(repo.nextId(), 'CUST-1', 1000);
const a2 = new Account(repo.nextId(), 'CUST-1', 500);
const a3 = new Account(repo.nextId(), 'CUST-2', 0);

check('save new account', repo.save(a1), { ok: true });
repo.save(a2);
repo.save(a3);
check('version set after save', a1.version, 1);

const loaded = repo.findById('ACC-1');
check('findById returns the data', loaded && loaded.toData(), { id: 'ACC-1', ownerId: 'CUST-1', balance: 1000 });
check('findById returns an Account', loaded instanceof Account, true);
check('findById returns a copy', loaded !== a1, true);
check('unknown id -> null', repo.findById('ACC-99'), null);
check('findByOwner', repo.findByOwner('CUST-1').map((a) => a.id), ['ACC-1', 'ACC-2']);

// Two tellers load ACC-1, both deposit
const tellerA = repo.findById('ACC-1');
const tellerB = repo.findById('ACC-1');
if (tellerA && tellerB) {
  tellerA.deposit(200);
  tellerB.deposit(300);
}
check('first save wins', tellerA ? repo.save(tellerA) : null, { ok: true });
check('second save conflicts', tellerB ? repo.save(tellerB) : null, { ok: false, reason: 'conflict' });
const afterConflict = repo.findById('ACC-1');
check('no lost update: balance 1200', afterConflict && afterConflict.balance, 1200);

// Unsaved changes must not leak into storage
const scratch = repo.findById('ACC-2');
if (scratch) scratch.deposit(9999);
const stored = repo.findById('ACC-2');
check('unsaved change not stored', stored && stored.balance, 500);`,
      hint: 'Store <code>{ version, data: structuredClone(account.toData()) }</code> in the Map. Write a private helper that turns a row back into <code>new Account(d.id, d.ownerId, d.balance, row.version)</code> and use it in both finders.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// LedgerBank Account aggregate (given)
class Account {
  constructor(id, ownerId, balance, version = 0) {
    this.id = id;
    this.ownerId = ownerId;
    this.balance = balance;
    this.version = version; // 0 = never saved
  }

  deposit(amount) {
    if (amount <= 0) throw new DomainError('Deposit must be positive');
    this.balance += amount;
  }

  toData() {
    return { id: this.id, ownerId: this.ownerId, balance: this.balance };
  }
}

class InMemoryAccountRepository {
  #rows = new Map(); // id -> { version, data }
  #seq = 0;

  nextId() {
    this.#seq += 1;
    return 'ACC-' + this.#seq;
  }

  #toAccount(row) {
    const d = structuredClone(row.data);
    return new Account(d.id, d.ownerId, d.balance, row.version);
  }

  findById(id) {
    const row = this.#rows.get(id);
    return row ? this.#toAccount(row) : null;
  }

  findByOwner(ownerId) {
    return [...this.#rows.values()]
      .filter((row) => row.data.ownerId === ownerId)
      .map((row) => this.#toAccount(row));
  }

  save(account) {
    const row = this.#rows.get(account.id);
    const current = row ? row.version : 0;
    if (current !== account.version) return { ok: false, reason: 'conflict' };
    this.#rows.set(account.id, { version: current + 1, data: structuredClone(account.toData()) });
    account.version = current + 1;
    return { ok: true };
  }
}

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const repo = new InMemoryAccountRepository();
const a1 = new Account(repo.nextId(), 'CUST-1', 1000);
const a2 = new Account(repo.nextId(), 'CUST-1', 500);
const a3 = new Account(repo.nextId(), 'CUST-2', 0);

check('save new account', repo.save(a1), { ok: true });
repo.save(a2);
repo.save(a3);
check('version set after save', a1.version, 1);

const loaded = repo.findById('ACC-1');
check('findById returns the data', loaded && loaded.toData(), { id: 'ACC-1', ownerId: 'CUST-1', balance: 1000 });
check('findById returns an Account', loaded instanceof Account, true);
check('findById returns a copy', loaded !== a1, true);
check('unknown id -> null', repo.findById('ACC-99'), null);
check('findByOwner', repo.findByOwner('CUST-1').map((a) => a.id), ['ACC-1', 'ACC-2']);

// Two tellers load ACC-1, both deposit
const tellerA = repo.findById('ACC-1');
const tellerB = repo.findById('ACC-1');
if (tellerA && tellerB) {
  tellerA.deposit(200);
  tellerB.deposit(300);
}
check('first save wins', tellerA ? repo.save(tellerA) : null, { ok: true });
check('second save conflicts', tellerB ? repo.save(tellerB) : null, { ok: false, reason: 'conflict' });
const afterConflict = repo.findById('ACC-1');
check('no lost update: balance 1200', afterConflict && afterConflict.balance, 1200);

// Unsaved changes must not leak into storage
const scratch = repo.findById('ACC-2');
if (scratch) scratch.deposit(9999);
const stored = repo.findById('ACC-2');
check('unsaved change not stored', stored && stored.balance, 500);`,
    },
  },

  // ───────────────────────────────────────────────────────────── specifications
  {
    id: 'specifications',
    section: 'Tactical Building Blocks',
    title: 'Specifications',
    explain: `
      <p>Business rules like "can this passenger check in?" or "is this booking eligible for a
      free rebooking?" tend to be copy-pasted: once in the check-in API, again in the mobile app's
      "Check in now" banner query, again in the reminder-email job. Each copy drifts. A
      <strong>specification</strong> (Evans &amp; Fowler) turns such a rule into a named,
      reusable object with one question: <code>isSatisfiedBy(candidate)</code>.</p>

      <h3>SkyHop rules as specifications</h3>
      <ul>
        <li><code>CheckInWindowOpen(now)</code>: departure is at most 24h away and more than 1h away.</li>
        <li><code>CanCheckIn(now)</code> = <code>IsConfirmed AND CheckInWindowOpen AND NOT IsCheckedIn</code></li>
        <li><code>EligibleForFreeRebooking</code> = <code>IsConfirmed AND (FlightDisrupted OR HasFlexFare)</code>,
        where disrupted = cancelled or delayed 3h+.</li>
      </ul>
      <p>Small specs combine with <code>and</code> / <code>or</code> / <code>not</code> into bigger
      ones that read almost exactly like the policy document.</p>

      <h3>Three uses for one rule</h3>
      <ol>
        <li><strong>Validation</strong>: the aggregate refuses a command: <code>if (!CanCheckIn(now).isSatisfiedBy(b)) throw ...</code></li>
        <li><strong>Selection / querying</strong>: "which bookings should get the 'check in now' push?" =
        <code>bookings.filter(spec.isSatisfiedBy)</code>. In a real DB, the spec can also produce a
        SQL <code>WHERE</code> clause or ORM criteria (that's how libraries like Ardalis.Specification for .NET work).</li>
        <li><strong>Building to order</strong>: "create a seat request that satisfies <em>window AND extra legroom</em>".</li>
      </ol>

      <div class="warn">Don't turn every <code>if</code> into a Spec class. Use specifications for
      rules that the business names, that change, and that are needed in more than one place. A
      one-off check inside an aggregate method is fine as a plain condition.</div>

      <div class="tip"><strong>In the real world:</strong> time-based rules are where
      specifications pay off most, because boundaries are subtle (is check-in open at
      <em>exactly</em> 1h before?). Pass <code>now</code> in explicitly so tests can pin it. Keeping
      the rule in one place also lets you show users <em>why</em>: "Check-in opens 24 hours before
      departure (in 3h 12m)". When the in-memory and SQL versions of a spec must both exist, test them
      against the same table of cases.</div>
    `,
    examples: [
      {
        title: 'CanCheckIn and EligibleForFreeRebooking: validate and query with one rule',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// A tiny Specification: a named predicate that can be combined
class Spec {
  constructor(name, test) {
    this.name = name;
    this.test = test;
  }

  isSatisfiedBy(candidate) {
    return this.test(candidate);
  }

  and(other) {
    return new Spec(this.name + ' AND ' + other.name, (c) => this.test(c) && other.test(c));
  }

  or(other) {
    return new Spec('(' + this.name + ' OR ' + other.name + ')', (c) => this.test(c) || other.test(c));
  }

  not() {
    return new Spec('NOT ' + this.name, (c) => !this.test(c));
  }
}

const HOUR = 60 * 60 * 1000;

// ---- Building blocks, named in the ubiquitous language ----
const IsConfirmed = new Spec('IsConfirmed', (b) => b.status === 'CONFIRMED');
const IsCheckedIn = new Spec('IsCheckedIn', (b) => b.checkedIn);
const HasFlexFare = new Spec('HasFlexFare', (b) => b.fareFamily === 'FLEX');
const FlightDisrupted = new Spec('FlightDisrupted', (b) => b.flightStatus === 'CANCELLED' || b.delayMinutes >= 180);

// Time-dependent: a function that builds a spec for a given "now"
const CheckInWindowOpen = (now) =>
  new Spec('CheckInWindowOpen', (b) => {
    const untilDeparture = b.departsAt - now;
    return untilDeparture <= 24 * HOUR && untilDeparture > 1 * HOUR; // opens 24h, closes 1h before
  });

// ---- Composed business rules ----
const CanCheckIn = (now) => IsConfirmed.and(CheckInWindowOpen(now)).and(IsCheckedIn.not());
const EligibleForFreeRebooking = IsConfirmed.and(FlightDisrupted.or(HasFlexFare));

console.log('rule:', CanCheckIn(new Date()).name);
console.log('rule:', EligibleForFreeRebooking.name);

// ---- 1. The check-in window boundaries ----
const booking = {
  pnr: 'SKY001', status: 'CONFIRMED', checkedIn: false, fareFamily: 'LITE',
  flightStatus: 'SCHEDULED', delayMinutes: 0, departsAt: new Date('2026-11-02T10:00:00Z'),
};
const moments = ['2026-11-01T09:59:00Z', '2026-11-01T10:00:00Z', '2026-11-02T08:59:00Z', '2026-11-02T09:00:00Z'];
for (const iso of moments) {
  console.log('can check in at', iso.slice(5, 16), '->', CanCheckIn(new Date(iso)).isSatisfiedBy(booking));
}

// ---- 2. Reuse for VALIDATION: the aggregate asks the spec ----
function checkIn(b, now) {
  const rule = CanCheckIn(now);
  if (!rule.isSatisfiedBy(b)) throw new DomainError(b.pnr + ' fails ' + rule.name);
  b.checkedIn = true;
}

const now = new Date('2026-11-02T06:00:00Z');
checkIn(booking, now);
console.log('SKY001 checked in:', booking.checkedIn);
try {
  checkIn(booking, now);
} catch (e) {
  console.log('rejected:', e.message);
}

// ---- 3. Reuse for QUERYING: same rule, filtering a list ----
const all = [
  { pnr: 'SKY002', status: 'CONFIRMED', fareFamily: 'LITE', flightStatus: 'CANCELLED', delayMinutes: 0 },
  { pnr: 'SKY003', status: 'CONFIRMED', fareFamily: 'FLEX', flightStatus: 'SCHEDULED', delayMinutes: 0 },
  { pnr: 'SKY004', status: 'CONFIRMED', fareFamily: 'LITE', flightStatus: 'SCHEDULED', delayMinutes: 200 },
  { pnr: 'SKY005', status: 'CONFIRMED', fareFamily: 'LITE', flightStatus: 'SCHEDULED', delayMinutes: 45 },
  { pnr: 'SKY006', status: 'CANCELLED', fareFamily: 'FLEX', flightStatus: 'CANCELLED', delayMinutes: 0 },
];
const eligible = all.filter((b) => EligibleForFreeRebooking.isSatisfiedBy(b)).map((b) => b.pnr);
console.log('free rebooking for:', eligible);`,
        explain: `
          <details>
            <summary>Step by step: the check-in window boundaries</summary>
            <p>SH101 departs <code>2026-11-02 10:00Z</code>. The window opens at 24h before
            (<code>&lt;=</code>, inclusive) and closes at 1h before (<code>&gt;</code>, so exactly 1h is closed):</p>
            <table>
              <tr><th>now</th><th>until departure</th><th><code>&lt;= 24h</code></th><th><code>&gt; 1h</code></th><th>Console</th></tr>
              <tr><td>11-01 09:59</td><td>24h 01m</td><td>❌</td><td>✅</td><td><code>can check in at 11-01T09:59 -&gt; false</code></td></tr>
              <tr><td>11-01 10:00</td><td>24h 00m</td><td>✅</td><td>✅</td><td><code>can check in at 11-01T10:00 -&gt; true</code></td></tr>
              <tr><td>11-02 08:59</td><td>1h 01m</td><td>✅</td><td>✅</td><td><code>can check in at 11-02T08:59 -&gt; true</code></td></tr>
              <tr><td>11-02 09:00</td><td>1h 00m</td><td>✅</td><td>❌</td><td><code>can check in at 11-02T09:00 -&gt; false</code></td></tr>
            </table>
            <p>These off-by-one-minute edges are exactly what goes wrong when the rule is
            re-implemented in three places with <code>&lt;</code> in one and <code>&lt;=</code> in another.</p>
          </details>
          <details>
            <summary>Validation and querying with the same specs</summary>
            <table>
              <tr><th>Use</th><th>Code</th><th>Console</th></tr>
              <tr><td>Composed names</td><td><code>.and()</code> / <code>.or()</code> / <code>.not()</code> build the name too</td><td><code>rule: IsConfirmed AND CheckInWindowOpen AND NOT IsCheckedIn</code><br><code>rule: IsConfirmed AND (FlightDisrupted OR HasFlexFare)</code></td></tr>
              <tr><td>Validate (06:00, 4h before)</td><td><code>checkIn(booking, now)</code> passes</td><td><code>SKY001 checked in: true</code></td></tr>
              <tr><td>Validate again</td><td><code>NOT IsCheckedIn</code> now fails</td><td><code>rejected: SKY001 fails IsConfirmed AND CheckInWindowOpen AND NOT IsCheckedIn</code></td></tr>
              <tr><td>Query</td><td>SKY002 cancelled flight ✅, SKY003 flex ✅, SKY004 200-min delay ✅, SKY005 45-min delay ❌, SKY006 booking cancelled ❌</td><td><code>free rebooking for: ["SKY002","SKY003","SKY004"]</code></td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>SkyHop changes policy: check-in now closes <strong>45 minutes</strong> before departure. Change <code>1 * HOUR</code> to <code>0.75 * HOUR</code>. The 09:00 line flips to <code>true</code>, and the validation and the query both pick it up, because there is one rule.</li>
              <li>Change the delay threshold to <code>&gt;= 30</code>: SKY005 joins the list.</li>
              <li>The rejection message names the whole rule but not <em>which part</em> failed. Add a method <code>whyNot(c)</code> that returns the names of the leaf specs that failed. Good error messages are a common reason to build your own small spec class.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s app shows "Check in now" for a flight departing in 50 minutes, but the API rejects the check-in. Root cause and fix?',
        options: [
          'Clock skew; sync the servers',
          'The app is cached',
          'Check-in should never close',
          'The rule is implemented twice with different boundaries; use one <code>CanCheckIn</code> specification for both the banner query and the command validation',
        ],
        answer: 3,
        why: 'Duplicated rules drift. A specification gives one source of truth reused for selection (banner) and validation (command).',
      },
      {
        q: 'Disruption Management asks: "rebooking is free if the flight is cancelled OR delayed over 3h, OR the fare is Flex, but only for confirmed bookings". Which composition matches?',
        options: [
          '<code>IsConfirmed.or(FlightDisrupted).or(HasFlexFare)</code>',
          '<code>IsConfirmed.and(FlightDisrupted.or(HasFlexFare))</code>',
          '<code>FlightDisrupted.and(HasFlexFare).and(IsConfirmed)</code>',
          '<code>IsConfirmed.not().and(HasFlexFare)</code>',
        ],
        answer: 1,
        why: '"Only for confirmed" applies to the whole OR-group, so IsConfirmed is ANDed with (disrupted OR flex).',
      },
      {
        q: 'Why does <code>CheckInWindowOpen</code> take <code>now</code> as a parameter instead of calling <code>new Date()</code> inside?',
        options: [
          'It\'s faster',
          'So the rule is deterministic: tests can pin the exact boundary minutes, and the same rule can answer "will it be open at 18:00?"',
          'Specifications cannot call functions',
          'Dates can\'t be compared',
        ],
        answer: 1,
        why: 'Hidden clock reads make rules untestable at their boundaries. Passing time in keeps specs pure.',
      },
    ],
    exercise: {
      task: `<p>Finish the <code>Spec</code> class: <code>and</code>, <code>or</code> and <code>not</code>
      must return <em>new</em> specs that combine both the test and the name (<code>'A AND B'</code>,
      <code>'(A OR B)'</code>, <code>'NOT A'</code>). Then compose SkyHop's free-seat-selection rule:</p>
      <p><code>CanSelectFreeSeat</code> = confirmed AND (flex fare OR gold member) AND not yet checked in.</p>`,
      starter: `class Spec {
  constructor(name, test) {
    this.name = name;
    this.test = test;
  }

  isSatisfiedBy(candidate) {
    return this.test(candidate);
  }

  and(other) {
    // TODO: new Spec named 'A AND B' that passes when both pass
    return this;
  }

  or(other) {
    // TODO: new Spec named '(A OR B)' that passes when either passes
    return this;
  }

  not() {
    // TODO: new Spec named 'NOT A' that passes when this one fails
    return this;
  }
}

const IsConfirmed = new Spec('IsConfirmed', (b) => b.status === 'CONFIRMED');
const HasFlexFare = new Spec('HasFlexFare', (b) => b.fareFamily === 'FLEX');
const IsGoldMember = new Spec('IsGoldMember', (b) => b.loyaltyTier === 'GOLD');
const IsCheckedIn = new Spec('IsCheckedIn', (b) => b.checkedIn);

// TODO: Confirmed AND (flex OR gold) AND not yet checked in
const CanSelectFreeSeat = IsConfirmed;

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const base = { status: 'CONFIRMED', fareFamily: 'LITE', loyaltyTier: 'NONE', checkedIn: false };
const cases = [
  ['lite fare, no status', base, false],
  ['flex fare', { ...base, fareFamily: 'FLEX' }, true],
  ['gold member', { ...base, loyaltyTier: 'GOLD' }, true],
  ['gold but already checked in', { ...base, loyaltyTier: 'GOLD', checkedIn: true }, false],
  ['flex but booking cancelled', { ...base, fareFamily: 'FLEX', status: 'CANCELLED' }, false],
];

for (const [label, booking, expected] of cases) {
  check(label, CanSelectFreeSeat.isSatisfiedBy(booking), expected);
}

check('rule reads like the business', CanSelectFreeSeat.name,
  'IsConfirmed AND (HasFlexFare OR IsGoldMember) AND NOT IsCheckedIn');

// Same spec reused as a query
const bookings = cases.map(([label, b], i) => ({ ...b, pnr: 'SKY10' + i }));
check('reused as a filter', bookings.filter((b) => CanSelectFreeSeat.isSatisfiedBy(b)).map((b) => b.pnr),
  ['SKY101', 'SKY102']);`,
      hint: '<code>and(other) { return new Spec(this.name + \' AND \' + other.name, (c) =&gt; this.test(c) &amp;&amp; other.test(c)); }</code>. Arrow functions keep <code>this</code> pointing at the original spec.',
      solution: `class Spec {
  constructor(name, test) {
    this.name = name;
    this.test = test;
  }

  isSatisfiedBy(candidate) {
    return this.test(candidate);
  }

  and(other) {
    return new Spec(this.name + ' AND ' + other.name, (c) => this.test(c) && other.test(c));
  }

  or(other) {
    return new Spec('(' + this.name + ' OR ' + other.name + ')', (c) => this.test(c) || other.test(c));
  }

  not() {
    return new Spec('NOT ' + this.name, (c) => !this.test(c));
  }
}

const IsConfirmed = new Spec('IsConfirmed', (b) => b.status === 'CONFIRMED');
const HasFlexFare = new Spec('HasFlexFare', (b) => b.fareFamily === 'FLEX');
const IsGoldMember = new Spec('IsGoldMember', (b) => b.loyaltyTier === 'GOLD');
const IsCheckedIn = new Spec('IsCheckedIn', (b) => b.checkedIn);

// Confirmed AND (flex OR gold) AND not yet checked in
const CanSelectFreeSeat = IsConfirmed.and(HasFlexFare.or(IsGoldMember)).and(IsCheckedIn.not());

// ---- checks ----
function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  const detail = ok ? '' : ' (got ' + JSON.stringify(actual) + ', expected ' + JSON.stringify(expected) + ')';
  console.log((ok ? '✅ ' : '❌ ') + name + detail);
}

const base = { status: 'CONFIRMED', fareFamily: 'LITE', loyaltyTier: 'NONE', checkedIn: false };
const cases = [
  ['lite fare, no status', base, false],
  ['flex fare', { ...base, fareFamily: 'FLEX' }, true],
  ['gold member', { ...base, loyaltyTier: 'GOLD' }, true],
  ['gold but already checked in', { ...base, loyaltyTier: 'GOLD', checkedIn: true }, false],
  ['flex but booking cancelled', { ...base, fareFamily: 'FLEX', status: 'CANCELLED' }, false],
];

for (const [label, booking, expected] of cases) {
  check(label, CanSelectFreeSeat.isSatisfiedBy(booking), expected);
}

check('rule reads like the business', CanSelectFreeSeat.name,
  'IsConfirmed AND (HasFlexFare OR IsGoldMember) AND NOT IsCheckedIn');

// Same spec reused as a query
const bookings = cases.map(([label, b], i) => ({ ...b, pnr: 'SKY10' + i }));
check('reused as a filter', bookings.filter((b) => CanSelectFreeSeat.isSatisfiedBy(b)).map((b) => b.pnr),
  ['SKY101', 'SKY102']);`,
    },
  },
);
