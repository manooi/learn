window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── why-ddd
  {
    id: 'why-ddd',
    section: 'Foundations',
    title: 'Why DDD? From CRUD to the big ball of mud',
    explain: `
      <p>Every messy system started out clean. Here is how it usually goes, told with
      <strong>SkyHop Airlines</strong>, the fictional low-cost carrier we use for the whole course.</p>

      <h3>Year 1: a tidy CRUD app</h3>
      <p>SkyHop launches with one route. The booking service is a REST API over a
      <code>bookings</code> table: <code>POST /bookings</code>, <code>PATCH /bookings/:id</code>,
      a <code>status</code> column. It works. Nobody needs a "domain model" to insert a row.</p>

      <h3>Year 3: the <code>BookingManager</code></h3>
      <p>Then the business grows, and every feature lands in the same place:</p>
      <ul>
        <li>Group bookings → <code>isGroup</code> flag. Staff travel → <code>isStaff</code>. Flexi fares → <code>flex</code>.
        Something nobody remembers → <code>flag2</code>.</li>
        <li><code>status</code> is now an integer. <code>3</code> means "cancelled"… or "no-show", depending on
        which job wrote it. The person who knew left in 2024.</li>
        <li>The cancellation fee rule lives in the web controller. The call-centre team copied it into their
        endpoint, then the business changed it, and only one copy got updated.</li>
        <li><code>updateStatus(pnr, 3, { src: 'CC', reason: 'NS' })</code> is the only way to change anything, so
        every change request touches the same 2,000-line file and every release is scary.</li>
      </ul>
      <p>Brian Foote and Joseph Yoder named this in 1997: the <strong>Big Ball of Mud</strong>, "a haphazardly
      structured, sprawling, sloppy, duct-tape-and-baling-wire, spaghetti-code jungle". It is not caused by
      bad developers. It is caused by <em>business knowledge with nowhere to live</em>, so it leaks into
      flags, magic numbers and copy-pasted <code>if</code>s.</p>

      <h3>What DDD actually is</h3>
      <p>Domain-Driven Design (Eric Evans, 2003, the "blue book") is a way of building software where the
      <strong>code is organised around the business's own concepts and language</strong>, worked out together
      with the people who know the business (domain experts). It has two halves:</p>
      <table>
        <tr><th>Strategic design</th><th>Tactical design</th></tr>
        <tr><td>The big picture: which parts of the business matter most (subdomains), where one model ends and
        another begins (bounded contexts), how teams and models relate (context maps), a shared
        <em>ubiquitous language</em>.</td>
        <td>The code-level building blocks inside one context: entities, value objects, aggregates, domain
        events, repositories, domain services.</td></tr>
        <tr><td>Useful for almost any non-trivial system.</td><td>Only worth it where the business rules are
        genuinely complex.</td></tr>
      </table>
      <p>This section covers the foundations. Section 2 is strategic design. Later sections are tactical
      design and architecture.</p>

      <div class="warn"><strong>DDD is not a folder structure.</strong> Creating <code>/domain</code>,
      <code>/entities</code> and <code>/repositories</code> folders, or using a "DDD framework", doesn't make a
      design domain-driven. If the code still says <code>status = 3</code>, nothing changed.</div>

      <div class="tip"><strong>In the real world:</strong> teams rarely start with DDD. They adopt it when the
      mud starts to hurt: when every change breaks something unrelated, when two teams fight over one table,
      or when nobody can explain what the code does without reading it. The first step is almost always
      language and boundaries (cheap), not aggregates and event sourcing (expensive).</div>
    `,
    examples: [
      {
        title: 'The BookingManager god-service (feel the pain)',
        code: `// SkyHop booking service, year 3.
// status: 1=held 2=ticketed 3=cancelled 4=flown (3 is also no-show? ask Dave. Dave left.)
const H = 60 * 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');

const db = new Map();
function seed(pnr) {
  db.set(pnr, {
    pnr, status: 2, fare: 120, depTs: DEPARTS,
    isGroup: false, isStaff: false, flex: false, flag2: true,
  });
}

class BookingManager {
  updateStatus(pnr, status, opts = {}) {
    const b = db.get(pnr);
    if (status === 3) {
      const hrs = (b.depTs - opts.now) / H;
      if (opts.src === 'WEB') {
        // web team, 2023: full fare inside 24h, else $30
        b.fee = b.flex ? 0 : hrs < 24 ? b.fare : 30;
      } else if (opts.src === 'CC') {
        // call centre copied it in 2024... then "24h" became "48h" here only
        b.fee = b.isStaff ? 0 : hrs < 48 ? b.fare : 30;
      }
      if (opts.reason === 'NS') b.flag2 = false; // no-show. also status 3?!
    }
    b.status = status;
    return b;
  }
}

const mgr = new BookingManager();
const now = DEPARTS - 30 * H; // 30 hours before departure

seed('PNR-0001');
seed('PNR-0002');
seed('PNR-0003');

const web = mgr.updateStatus('PNR-0001', 3, { src: 'WEB', now });
const cc = mgr.updateStatus('PNR-0002', 3, { src: 'CC', now });
console.log('web cancel, 30h before: fee =', web.fee);
console.log('call-centre cancel, 30h before: fee =', cc.fee);

// The nightly batch job marks no-shows... with the same status code
const ns = mgr.updateStatus('PNR-0003', 3, { reason: 'NS', now: DEPARTS + H });
console.log('no-show job: status =', ns.status, 'fee =', ns.fee);

// Finance report: "how many passengers cancelled?"
const cancelled = [...db.values()].filter((b) => b.status === 3).length;
console.log('finance report "cancellations":', cancelled, '(really 2 + 1 no-show)');

// Same customer, same booking, same moment: two different prices.
if (web.fee !== cc.fee) {
  console.warn('❌ rule duplicated and drifted: web', web.fee, 'vs call centre', cc.fee);
}`,
        explain: `
          <details>
            <summary>The problem: four kinds of pain in 40 lines</summary>
            <table>
              <tr><th>Smell</th><th>Where</th><th>What it costs</th></tr>
              <tr><td>Magic status code</td><td><code>status === 3</code></td><td>Means "cancelled" to the web
              team and "no-show" to the batch job. Finance counts 3 cancellations when there were 2.</td></tr>
              <tr><td>Duplicated rule</td><td>Fee logic in <code>WEB</code> and <code>CC</code> branches</td>
              <td>Rule changed in one copy only: <code>fee = 30</code> vs <code>fee = 120</code> for the same
              situation.</td></tr>
              <tr><td>Flag soup</td><td><code>isStaff</code>, <code>flex</code>, <code>flag2</code></td>
              <td>Web ignores <code>isStaff</code>, call centre ignores <code>flex</code>. Every flag doubles
              the paths nobody tested.</td></tr>
              <tr><td>Generic verb</td><td><code>updateStatus(pnr, 3, opts)</code></td><td>The business never says
              "update status to 3". They say "the passenger cancelled" or "the passenger didn't turn up".
              The code hides <em>what happened</em>.</td></tr>
            </table>
          </details>
          <details>
            <summary>What the console shows</summary>
            <table>
              <tr><th>Line</th><th>Console</th><th>Why</th></tr>
              <tr><td>web cancel</td><td><code>web cancel, 30h before: fee = 30</code></td><td>30h is not &lt; 24h → $30</td></tr>
              <tr><td>call-centre cancel</td><td><code>call-centre cancel, 30h before: fee = 120</code></td><td>30h is &lt; 48h → full fare</td></tr>
              <tr><td>no-show job</td><td><code>no-show job: status = 3 fee = undefined</code></td><td>No <code>src</code>, so no fee branch ran</td></tr>
              <tr><td>report</td><td><code>finance report "cancellations": 3 (really 2 + 1 no-show)</code></td><td>One number, two meanings</td></tr>
              <tr><td>warn</td><td><code>❌ rule duplicated and drifted: web 30 vs call centre 120</code></td><td></td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>flex: true</code> in <code>seed</code>. Web charges 0, call centre still charges 120.</li>
              <li>Change <code>now</code> to <code>DEPARTS - 50 * H</code>. Both now charge 30, and the bug "disappears":
              exactly how drift survives code review and manual testing.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Same behaviour, said in the business language',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

const H = 60 * 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');

// ONE place for the rule, named the way revenue management names it.
const CancellationPolicy = {
  feeFor(booking, now) {
    if (booking.fareType === 'FLEX') return 0;
    const hoursLeft = (booking.departsAt - now) / H;
    return hoursLeft < 24 ? booking.fare : 30;
  },
};

class Booking {
  #status = 'TICKETED';

  constructor(pnr, fare, fareType, departsAt) {
    this.pnr = pnr;
    this.fare = fare;
    this.fareType = fareType;
    this.departsAt = departsAt;
  }

  get status() {
    return this.#status;
  }

  cancelByPassenger(now) {
    if (this.#status !== 'TICKETED') {
      throw new DomainError(this.pnr + ' cannot be cancelled: it is ' + this.#status);
    }
    const fee = CancellationPolicy.feeFor(this, now);
    this.#status = 'CANCELLED_BY_PASSENGER';
    return { fee, refund: this.fare - fee };
  }

  markNoShow(now) {
    if (now < this.departsAt) throw new DomainError('Flight has not departed yet');
    this.#status = 'NO_SHOW';
  }
}

const now = DEPARTS - 30 * H;
const a = new Booking('PNR-0001', 120, 'LITE', DEPARTS);
const b = new Booking('PNR-0002', 120, 'LITE', DEPARTS);
const c = new Booking('PNR-0003', 120, 'LITE', DEPARTS);

// Web and call centre call the SAME behaviour. The channel is not a domain concept here.
console.log('web cancel:', a.cancelByPassenger(now));
console.log('call-centre cancel:', b.cancelByPassenger(now));

c.markNoShow(DEPARTS + H);

const byStatus = {};
for (const x of [a, b, c]) byStatus[x.status] = (byStatus[x.status] || 0) + 1;
console.log('report:', byStatus);

try {
  a.cancelByPassenger(now);
} catch (e) {
  console.log('rejected:', e.name, '-', e.message);
}`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s web and call-centre endpoints each contain their own copy of the cancellation-fee rule. Revenue management changes the rule. What is the DDD diagnosis?',
        options: [
          'The endpoints need more unit tests',
          'A business rule has no single home in the model, so it was duplicated per channel and drifted',
          'The database schema should store the fee rule in a config table',
          'The call-centre team should use the web API instead',
        ],
        answer: 1,
        why: 'Tests and config might help, but the root cause is that "cancellation policy" is a business concept with no place in the code. Give it one home (a policy or the Booking itself) and every channel calls it.',
      },
      {
        q: 'A new developer reads <code>if (b.status === 3 &amp;&amp; !b.flag2)</code>. Which DDD idea most directly attacks this?',
        options: [
          'Event sourcing',
          'Microservices',
          'Ubiquitous language: name states and behaviours with the business\'s words (e.g. <code>NO_SHOW</code>, <code>markNoShow()</code>)',
          'CQRS',
        ],
        answer: 2,
        why: 'The code is unreadable because it uses numbers and flags instead of the words the business uses. Ubiquitous language is the cheapest and most immediate DDD fix.',
      },
      {
        q: 'Your team adds <code>/domain</code>, <code>/application</code> and <code>/infrastructure</code> folders and moves files into them. The code still says <code>updateStatus(pnr, 3)</code>. Is the system now domain-driven?',
        options: [
          'Yes, layered folders are what DDD means',
          'Yes, as long as the domain folder has no framework imports',
          'No: DDD is about modelling business concepts and language, not folder names',
          'No: DDD requires microservices',
        ],
        answer: 2,
        why: 'Folders can help, but DDD is about what the code says. If the model still hides business meaning behind magic numbers, nothing important changed.',
      },
      {
        q: 'Which part of DDD is useful for almost any non-trivial system, even when the business rules are simple?',
        options: [
          'Strategic design: shared language and clear boundaries between parts of the system',
          'Event sourcing every aggregate',
          'A repository per table',
          'Rich entities for every database row',
        ],
        answer: 0,
        why: 'Language and boundaries are cheap and pay off everywhere. The tactical patterns (aggregates, events, repositories) cost more and only pay off where the rules are complex.',
      },
    ],
    exercise: {
      task: `<p>The web and call-centre channels each compute the cancellation fee, and they disagree.
      Revenue management confirms the real rule:</p>
      <ul>
        <li><code>FLEX</code> fares cancel for free.</li>
        <li>Otherwise, cancelling less than 24 hours before departure costs the full fare.</li>
        <li>Otherwise the fee is $30.</li>
      </ul>
      <p>Implement <code>cancellationFee(booking, hoursBeforeDeparture)</code> once, and make
      <strong>both</strong> channel functions use it. All checks should turn ✅.</p>`,
      starter: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

// TODO: the one true rule
function cancellationFee(booking, hoursBeforeDeparture) {
  return 0;
}

// Web team's version
function webCancelFee(booking, hoursBeforeDeparture) {
  if (booking.fareType === 'FLEX') return 0;
  return hoursBeforeDeparture < 24 ? booking.fare : 30;
}

// Call-centre team's copy (drifted)
function callCentreCancelFee(booking, hoursBeforeDeparture) {
  return hoursBeforeDeparture < 48 ? booking.fare : 30;
}

const lite = { fare: 120, fareType: 'LITE' };
const flex = { fare: 220, fareType: 'FLEX' };

check('policy: lite 30h → 30', cancellationFee(lite, 30), 30);
check('policy: lite 10h → full fare', cancellationFee(lite, 10), 120);
check('policy: flex 10h → 0', cancellationFee(flex, 10), 0);
check('web lite 30h', webCancelFee(lite, 30), 30);
check('call centre lite 30h', callCentreCancelFee(lite, 30), 30);
check('call centre flex 10h', callCentreCancelFee(flex, 10), 0);
check('channels agree at 23h', webCancelFee(lite, 23), callCentreCancelFee(lite, 23));`,
      hint: 'Copy the web team\'s logic into cancellationFee, then make each channel function a one-liner: return cancellationFee(booking, hoursBeforeDeparture).',
      solution: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

// The one true rule, owned by the domain, not by a channel.
function cancellationFee(booking, hoursBeforeDeparture) {
  if (booking.fareType === 'FLEX') return 0;
  return hoursBeforeDeparture < 24 ? booking.fare : 30;
}

function webCancelFee(booking, hoursBeforeDeparture) {
  return cancellationFee(booking, hoursBeforeDeparture);
}

function callCentreCancelFee(booking, hoursBeforeDeparture) {
  return cancellationFee(booking, hoursBeforeDeparture);
}

const lite = { fare: 120, fareType: 'LITE' };
const flex = { fare: 220, fareType: 'FLEX' };

check('policy: lite 30h → 30', cancellationFee(lite, 30), 30);
check('policy: lite 10h → full fare', cancellationFee(lite, 10), 120);
check('policy: flex 10h → 0', cancellationFee(flex, 10), 0);
check('web lite 30h', webCancelFee(lite, 30), 30);
check('call centre lite 30h', callCentreCancelFee(lite, 30), 30);
check('call centre flex 10h', callCentreCancelFee(flex, 10), 0);
check('channels agree at 23h', webCancelFee(lite, 23), callCentreCancelFee(lite, 23));`,
    },
  },

  // ───────────────────────────────────────────────────────────── domain-model
  {
    id: 'domain-model',
    section: 'Foundations',
    title: 'Domain, model & knowledge crunching',
    explain: `
      <p>Three words get thrown around a lot. Let's pin them down.</p>
      <ul>
        <li><strong>Domain</strong>: the area of business your software serves. For SkyHop: selling seats,
        flying aircraft, checking people in, handling disruptions.</li>
        <li><strong>Domain expert</strong>: someone who knows how that area works, usually not a developer.
        A revenue manager, a gate agent, an ops controller.</li>
        <li><strong>Model</strong>: a <em>purposeful simplification</em> of the domain that helps solve a specific
        problem. It lives in code, but also in conversations, whiteboard sketches and tests.</li>
      </ul>

      <h3>The map is not the territory</h3>
      <p>A subway map is wildly "wrong" about distances and street layouts, and that is exactly why it is useful:
      it keeps only what a rider needs (stations, lines, connections). A street map of the same city keeps
      different things for a different job. Neither is the "true" city.</p>
      <p>A domain model is the same. It is not a copy of reality. It is a deliberate choice of
      <em>what to keep and what to leave out</em> for one purpose. Trying to model "everything about a flight"
      gives you a model that is useless for every specific job.</p>

      <h3>Model ≠ data model</h3>
      <p>An ER diagram answers "what do we store?". A domain model answers "what does the business
      <em>do</em>, and which rules must always hold?". A <code>flights</code> table with a <code>seats</code>
      column tells you nothing about overbooking. The interesting knowledge is in the behaviour.</p>

      <h3>Knowledge crunching: a real conversation</h3>
      <p>Evans calls the process of learning a domain with experts <strong>knowledge crunching</strong>: talk,
      sketch, write a bit of code, find out it's wrong, talk again. Here is a typical one at SkyHop.</p>
      <div style="border-left:3px solid #888;padding:4px 12px;margin:8px 0">
        <p><strong>Dev:</strong> So a flight has 189 seats, and we stop selling at 189?</p>
        <p><strong>Priya (revenue manager):</strong> No, we sell up to 195 on most A320 routes.</p>
        <p><strong>Dev:</strong> So the capacity is 195?</p>
        <p><strong>Priya:</strong> No! The aircraft has 189 seats. That's <em>physical capacity</em>. 195 is the
        <em>authorised level</em>. On average about 4% of passengers don't turn up, so an empty seat is lost
        money.</p>
        <p><strong>Dev:</strong> What if everyone turns up?</p>
        <p><strong>Priya:</strong> Then the gate has a <em>denied boarding</em>: we ask for volunteers and pay
        compensation. That's a gate problem, not a sales problem. Oh, and if a seat is broken, it's
        <em>inoperative</em>. Don't count it.</p>
        <p><strong>Dev:</strong> Is the overbooking percentage the same everywhere?</p>
        <p><strong>Priya:</strong> Per route. And never on the last flight of the day. If we bump someone there,
        we can't rebook them until tomorrow.</p>
      </div>
      <p>In five minutes the model went from "seats" to <em>physical capacity</em>, <em>inoperative seats</em>,
      <em>authorised level</em>, <em>overbooking % per route</em>, <em>denied boarding</em>, and an exception for
      the <em>last flight of the day</em>. None of that would be in a schema someone designed alone. The
      example below turns this conversation into code.</p>

      <div class="tip"><strong>Questions that crunch knowledge:</strong> "What happens if…?", "Is that always
      true?", "What do you call that?", "Who decides?", "What did you do before there was software?".
      Write down every new word the expert uses. Each one is a candidate concept in the model.</div>

      <div class="tip"><strong>In the real world:</strong> knowledge crunching is not a phase at the start of a
      project. It happens every sprint. The best teams have a domain expert in refinement sessions, share
      a glossary, and treat "the expert used a word that isn't in our code" as a bug.</div>
    `,
    examples: [
      {
        title: 'Before and after talking to the revenue manager',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// v1: what the devs built alone. "A flight has seats."
class FlightV1 {
  constructor(seats) {
    this.seats = seats;
    this.sold = 0;
  }

  sell() {
    if (this.sold >= this.seats) throw new DomainError('Sold out');
    this.sold++;
  }
}

// v2: after knowledge crunching with Priya.
class Cabin {
  #physicalCapacity;
  #inoperativeSeats;
  #overbookingRate;
  #sold = 0;

  constructor({ physicalCapacity, overbookingRate, inoperativeSeats = 0 }) {
    this.#physicalCapacity = physicalCapacity;
    this.#overbookingRate = overbookingRate;
    this.#inoperativeSeats = inoperativeSeats;
  }

  get sellableCapacity() {
    return this.#physicalCapacity - this.#inoperativeSeats;
  }

  // "195 is the authorised level"
  get authorisedLevel() {
    const cap = this.sellableCapacity;
    return cap + Math.floor(cap * this.#overbookingRate);
  }

  get sold() {
    return this.#sold;
  }

  sell() {
    if (this.#sold >= this.authorisedLevel) {
      throw new DomainError('Authorised level ' + this.authorisedLevel + ' reached');
    }
    this.#sold++;
  }
}

function sellMany(name, flight, demand) {
  let rejected = 0;
  for (let i = 0; i < demand; i++) {
    try {
      flight.sell();
    } catch (e) {
      rejected++;
    }
  }
  console.log(name, '→ sold', flight.sold, '| turned away', rejected);
}

const demand = 198; // people who want SH123 tomorrow

sellMany('v1 FlightV1(189)', new FlightV1(189), demand);

const cabin = new Cabin({ physicalCapacity: 189, overbookingRate: 0.035 });
console.log('v2 authorised level:', cabin.authorisedLevel);
sellMany('v2 Cabin', cabin, demand);

const broken = new Cabin({ physicalCapacity: 189, overbookingRate: 0.035, inoperativeSeats: 2 });
console.log('v2 with 2 inoperative seats → sellable', broken.sellableCapacity,
  '| authorised', broken.authorisedLevel);`,
        explain: `
          <details>
            <summary>From conversation to code: each phrase became a concept</summary>
            <table>
              <tr><th>Priya said</th><th>In the code</th></tr>
              <tr><td>"The aircraft has 189 seats"</td><td><code>#physicalCapacity</code></td></tr>
              <tr><td>"If a seat is broken, it's inoperative. Don't count it."</td><td><code>#inoperativeSeats</code>, <code>sellableCapacity</code></td></tr>
              <tr><td>"We sell up to 195. That's the authorised level"</td><td><code>authorisedLevel</code> getter</td></tr>
              <tr><td>"Per route" overbooking</td><td><code>overbookingRate</code> passed in per cabin</td></tr>
              <tr><td>"Denied boarding is a gate problem, not a sales problem"</td><td><em>Deliberately absent.</em> It belongs to another part of the system (Check-in &amp; Boarding).</td></tr>
            </table>
            <p>The last row matters most. Knowing what to <em>leave out</em> is half of modelling.</p>
          </details>
          <details>
            <summary>What the console shows</summary>
            <table>
              <tr><th>Console</th><th>Meaning</th></tr>
              <tr><td><code>v1 FlightV1(189) → sold 189 | turned away 9</code></td><td>9 paying customers lost, though ~7 of the 189 won't show up</td></tr>
              <tr><td><code>v2 authorised level: 195</code></td><td>189 + floor(189 × 0.035 = 6.6) = 195</td></tr>
              <tr><td><code>v2 Cabin → sold 195 | turned away 3</code></td><td>6 extra seats sold</td></tr>
              <tr><td><code>v2 with 2 inoperative seats → sellable 187 | authorised 193</code></td><td>187 + floor(6.5) = 193</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set <code>overbookingRate: 0</code>. v2 behaves exactly like v1. The old model was a special case of the new one.</li>
              <li>Priya's last rule (no overbooking on the last flight of the day) is not implemented yet. Where would you put it? (The exercise asks you to.)</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Widget: how much should SkyHop overbook?',
        lang: 'html',
        editor: false,
        code: `<style>
  .ob { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .ob h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .ob .sub { color:#9aa3b5; margin:0 0 12px; }
  .ob .grid { display:grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap:10px 18px; }
  .ob label { display:block; color:#c9cfdb; font-size:13px; }
  .ob label b { color:#ffd479; }
  .ob input[type=range] { width:100%; margin:4px 0 0; }
  .ob .stats { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:8px; margin:12px 0; }
  .ob .stat { background:#252b36; border-radius:8px; padding:8px 10px; }
  .ob .stat .k { color:#9aa3b5; font-size:12px; }
  .ob .stat .v { font-size:18px; font-weight:600; color:#fff; }
  .ob .bars { display:flex; align-items:flex-end; gap:2px; height:90px; background:#14171d; border-radius:8px; padding:6px; }
  .ob .bar { flex:1; background:#4a5876; border-radius:2px 2px 0 0; position:relative; }
  .ob .bar.cur { background:#ffb347; }
  .ob .bar.best { outline:2px solid #6fdc8c; }
  .ob .axis { display:flex; justify-content:space-between; color:#9aa3b5; font-size:11px; margin-top:2px; }
  .ob .note { color:#9aa3b5; font-size:12px; margin-top:10px; }
  .ob .good { color:#6fdc8c; } .ob .bad { color:#ff8a80; }
</style>
<div class="ob">
  <h3>Overbooking model for SH123 (A320, 189 physical seats)</h3>
  <p class="sub">Move the sliders. The model trades extra ticket sales against the cost of denied boardings at the gate.</p>
  <div class="grid">
    <label>Authorised level (tickets sold): <b id="nOut"></b>
      <input id="n" type="range" min="189" max="210" value="195"></label>
    <label>No-show rate on this route: <b id="pOut"></b>
      <input id="p" type="range" min="0" max="12" step="0.5" value="4"></label>
    <label>Average fare: <b id="fOut"></b>
      <input id="f" type="range" min="40" max="250" step="10" value="90"></label>
    <label>Cost per denied boarding (compensation + rebooking): <b id="cOut"></b>
      <input id="c" type="range" min="100" max="1500" step="50" value="400"></label>
  </div>
  <div class="stats">
    <div class="stat"><div class="k">Expected passengers at gate</div><div class="v" id="sShow"></div></div>
    <div class="stat"><div class="k">P(at least one denied boarding)</div><div class="v" id="sRisk"></div></div>
    <div class="stat"><div class="k">Expected denied boardings</div><div class="v" id="sDb"></div></div>
    <div class="stat"><div class="k">Expected net revenue vs. no overbooking</div><div class="v" id="sNet"></div></div>
  </div>
  <div style="color:#c9cfdb;font-size:13px;margin-bottom:4px">Expected net revenue for each authorised level
    (<span style="color:#ffb347">orange</span> = your choice, <span class="good">green outline</span> = best):</div>
  <div class="bars" id="bars"></div>
  <div class="axis"><span>189</span><span>200</span><span>210</span></div>
  <div class="stat" style="margin-top:10px" id="verdict"></div>
  <div class="note"><b>What this model deliberately ignores:</b> refundable fares, group bookings, connecting passengers,
    seasonality, volunteers who accept vouchers. A real revenue-management model keeps more. A booking system
    keeps far less: it only needs the resulting <i>authorised level</i>. Same domain, different purpose, different model.</div>
</div>
<script>
  const CAP = 189;
  const $ = (id) => document.getElementById(id);
  const lf = [0];
  for (let i = 1; i <= 260; i++) lf[i] = lf[i - 1] + Math.log(i);

  function outcome(n, noShow, fare, cost) {
    const q = 1 - noShow;
    let expDenied = 0, risk = 0, expShow = n * q;
    if (noShow === 0) {
      expDenied = Math.max(0, n - CAP);
      risk = n > CAP ? 1 : 0;
    } else {
      for (let k = CAP + 1; k <= n; k++) {
        const pk = Math.exp(lf[n] - lf[k] - lf[n - k] + k * Math.log(q) + (n - k) * Math.log(noShow));
        expDenied += (k - CAP) * pk;
        risk += pk;
      }
    }
    const net = n * fare - expDenied * cost - CAP * fare;
    return { expShow, expDenied, risk, net };
  }

  const money = (x) => (x < 0 ? '-$' : '+$') + Math.abs(Math.round(x)).toLocaleString();

  function render() {
    const n = +$('n').value, p = +$('p').value / 100, f = +$('f').value, c = +$('c').value;
    $('nOut').textContent = n + (n === CAP ? ' (no overbooking)' : ' (+' + (n - CAP) + ')');
    $('pOut').textContent = (p * 100).toFixed(1) + '%';
    $('fOut').textContent = '$' + f;
    $('cOut').textContent = '$' + c;
    const o = outcome(n, p, f, c);
    $('sShow').textContent = o.expShow.toFixed(1);
    $('sRisk').textContent = (o.risk * 100).toFixed(1) + '%';
    $('sDb').textContent = o.expDenied.toFixed(2);
    $('sNet').innerHTML = '<span class="' + (o.net >= 0 ? 'good' : 'bad') + '">' + money(o.net) + '</span>';

    const all = [];
    for (let m = CAP; m <= 210; m++) all.push({ m, net: outcome(m, p, f, c).net });
    const best = all.reduce((a, b) => (b.net > a.net ? b : a));
    const max = Math.max(...all.map((x) => x.net), 1);
    $('bars').innerHTML = all.map((x) => {
      const h = Math.max(2, Math.round((Math.max(x.net, 0) / max) * 78));
      const cls = 'bar' + (x.m === n ? ' cur' : '') + (x.m === best.m ? ' best' : '');
      const col = x.net < 0 ? 'background:#a14b4b;' : '';
      return '<div class="' + cls + '" style="height:' + h + 'px;' + col + '" title="' + x.m + ': ' + money(x.net) + '"></div>';
    }).join('');
    const diff = n - best.m;
    $('verdict').innerHTML = diff === 0
      ? '<span class="good">✓ ' + n + ' is the best authorised level for these inputs.</span>'
      : 'Best for these inputs: <b class="good">' + best.m + '</b> (' + money(best.net) + '). You are ' +
        (diff > 0 ? 'over' : 'under') + 'booking by ' + Math.abs(diff) + '. ' +
        (diff > 0 ? 'Denied-boarding costs eat the extra sales.' : 'Empty seats from no-shows are lost money.');
  }
  for (const id of ['n', 'p', 'f', 'c']) $(id).addEventListener('input', render);
  render();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'A developer proposes a single <code>Flight</code> model with every attribute anyone at SkyHop has ever mentioned (crew, fuel, fares, meals, gate, seat map, delays…) "so it is complete". What is the main problem?',
        options: [
          'JavaScript objects can\'t hold that many fields',
          'A model is a purposeful simplification; one that tries to serve every purpose serves none of them well',
          'It should be split into one table per attribute',
          'Nothing, completeness is the goal of a domain model',
        ],
        answer: 1,
        why: 'Like a subway map vs a street map, a model is useful because of what it leaves out. Different problems (selling seats vs flying the aircraft) need different models.',
      },
      {
        q: 'During a refinement session, Priya says "authorised level" three times. The code has a column called <code>max_seats</code>. What should the team do?',
        options: [
          'Nothing, the column name is an implementation detail',
          'Ask Priya to say "max seats" instead',
          'Ask what it means exactly, then introduce <code>authorisedLevel</code> in the model and code',
          'Add a comment next to <code>max_seats</code>',
        ],
        answer: 2,
        why: 'A word the expert uses that isn\'t in the code is a missing concept. Clarify it (it turned out to be different from physical capacity) and make it explicit.',
      },
      {
        q: 'Which statement best describes the difference between a domain model and a data model?',
        options: [
          'They are the same thing drawn differently',
          'The data model is what we store; the domain model captures behaviour and rules the business cares about',
          'The domain model is only used in documentation',
          'The data model is the newer, preferred approach',
        ],
        answer: 1,
        why: 'Storage is one concern. The rules ("never overbook the last flight of the day") are the valuable knowledge, and they live in behaviour, not columns.',
      },
      {
        q: 'Priya mentions denied boarding at the gate. Why did the example deliberately leave it out of <code>Cabin</code>?',
        options: [
          'It is too hard to implement',
          'It is a different problem (handled at the gate, by a different process and team), so it belongs to a different model',
          'Denied boarding is illegal',
          'It should be a database trigger',
        ],
        answer: 1,
        why: 'Selling tickets and handling the gate are different jobs. Putting both in one model is the first step back to the god-object. You\'ll see this formalised as bounded contexts.',
      },
    ],
    exercise: {
      task: `<p>Implement the rest of Priya's rules as two functions:</p>
      <ul>
        <li><code>authorisedLevel(cabin)</code>: sellable capacity is <code>physicalCapacity - inoperativeSeats</code>;
        authorised level is <code>sellable + Math.floor(sellable * overbookingRate)</code>.
        <strong>But</strong> if <code>cabin.lastFlightOfDay</code> is true, there is no overbooking at all.</li>
        <li><code>canSell(cabin)</code>: true while <code>cabin.sold</code> is below the authorised level.</li>
      </ul>`,
      starter: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function authorisedLevel(cabin) {
  // TODO: physical capacity, inoperative seats, overbooking rate, last flight of the day
  return cabin.physicalCapacity;
}

function canSell(cabin) {
  // TODO
  return true;
}

const sh123 = { physicalCapacity: 189, inoperativeSeats: 0, overbookingRate: 0.035, lastFlightOfDay: false, sold: 0 };
const sh199 = { ...sh123, lastFlightOfDay: true };
const broken = { ...sh123, inoperativeSeats: 2 };

check('normal route: 195', authorisedLevel(sh123), 195);
check('inoperative seats: 193', authorisedLevel(broken), 193);
check('last flight of day: no overbooking', authorisedLevel(sh199), 189);
check('can sell at 194', canSell({ ...sh123, sold: 194 }), true);
check('cannot sell at 195', canSell({ ...sh123, sold: 195 }), false);
check('last flight: cannot sell 190th', canSell({ ...sh199, sold: 189 }), false);`,
      hint: 'Compute sellable first. Then pick the rate: const rate = cabin.lastFlightOfDay ? 0 : cabin.overbookingRate.',
      solution: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function authorisedLevel(cabin) {
  const sellable = cabin.physicalCapacity - cabin.inoperativeSeats;
  // "Never on the last flight of the day: we can't rebook them until tomorrow."
  const rate = cabin.lastFlightOfDay ? 0 : cabin.overbookingRate;
  return sellable + Math.floor(sellable * rate);
}

function canSell(cabin) {
  return cabin.sold < authorisedLevel(cabin);
}

const sh123 = { physicalCapacity: 189, inoperativeSeats: 0, overbookingRate: 0.035, lastFlightOfDay: false, sold: 0 };
const sh199 = { ...sh123, lastFlightOfDay: true };
const broken = { ...sh123, inoperativeSeats: 2 };

check('normal route: 195', authorisedLevel(sh123), 195);
check('inoperative seats: 193', authorisedLevel(broken), 193);
check('last flight of day: no overbooking', authorisedLevel(sh199), 189);
check('can sell at 194', canSell({ ...sh123, sold: 194 }), true);
check('cannot sell at 195', canSell({ ...sh123, sold: 195 }), false);
check('last flight: cannot sell 190th', canSell({ ...sh199, sold: 189 }), false);`,
    },
  },

  // ───────────────────────────────────────────────────────────── ubiquitous-language
  {
    id: 'ubiquitous-language',
    section: 'Foundations',
    title: 'Ubiquitous Language',
    explain: `
      <p>The <strong>ubiquitous language</strong> is a shared, precise vocabulary that developers and domain
      experts use <em>everywhere</em>: in conversation, in tickets, in tests, and above all in the code. If the
      gate agent says "the passenger is a no-show", the code says <code>booking.markNoShow()</code>, not
      <code>updateStatus(pnr, 3, 'NS')</code>.</p>

      <h3>Why it matters: the translation tax</h3>
      <p>Without a shared language, every conversation needs a translator. The product owner writes
      "passengers who cancel within 24 hours lose their fare". A developer translates that into
      "<code>status 3</code> with <code>src WEB</code> and <code>hrs &lt; 24</code>". Six months later another developer
      translates it back, slightly wrong. Each translation is a chance to lose meaning, and nobody notices until
      a customer is charged twice.</p>

      <h3>Rename the code to the business words</h3>
      <table>
        <tr><th>Before</th><th>After</th><th>Why it's better</th></tr>
        <tr><td><code>updateStatus(pnr, 3, 'P')</code></td><td><code>booking.cancelByPassenger(now)</code></td><td>Says what happened and who did it</td></tr>
        <tr><td><code>updateStatus(pnr, 3, 'A')</code></td><td><code>booking.cancelByAirline(reason)</code></td><td>Different rules (full refund + rebooking), so a different verb</td></tr>
        <tr><td><code>BookingManager</code>, <code>FlightHelper</code></td><td><code>Booking</code>, <code>Itinerary</code>, <code>CancellationPolicy</code></td><td>"Manager" and "Helper" mean "I don't know what this is"</td></tr>
        <tr><td><code>data.flag2</code></td><td><code>booking.hasCheckedBag</code></td><td>Readable by an expert</td></tr>
        <tr><td><code>seatsAvail</code></td><td><code>authorisedLevel - sold</code></td><td>Matches how revenue management thinks</td></tr>
      </table>
      <p>Test names are part of the language too: <code>it('charges the full fare when a Lite fare is cancelled
      within 24 hours')</code> is a sentence an expert can check.</p>

      <h3>Rules of thumb</h3>
      <ul>
        <li><strong>One word, one meaning</strong> (inside a given part of the system). If "booking" sometimes means the
        PNR and sometimes one flight segment, split it: <em>Booking</em> and <em>Segment</em>.</li>
        <li><strong>Use the expert's word, not your own invention.</strong> If they say "PNR", don't call it
        <code>Reservation</code> because it sounded nicer.</li>
        <li><strong>When the language changes, refactor the code.</strong> The language and code must stay in sync, or the
        language stops being ubiquitous.</li>
        <li><strong>Behaviours are verbs from the business.</strong> <code>checkIn</code>, <code>rebook</code>,
        <code>issueBoardingPass</code>. Not <code>process</code>, <code>handle</code>, <code>update</code>.</li>
      </ul>

      <h3>Foreshadowing: the language has borders</h3>
      <p>Ask the check-in team what a <em>passenger</em> is: a person with a passport, a seat and bags. Ask the
      loyalty team: they don't say passenger, they say <em>member</em>, with a tier and points. Neither is wrong.
      The ubiquitous language is only ubiquitous <strong>inside one bounded context</strong>. Trying to force one
      company-wide definition of "passenger" is exactly how the god-object starts. That is the topic of
      section 2.</p>

      <div class="warn">A glossary nobody reads isn't a ubiquitous language. The test is whether the words
      show up in the code, the tests, and the daily conversation.</div>

      <div class="tip"><strong>In the real world:</strong> teams keep a short glossary in the repo (a markdown
      file next to the code of that context), review new terms in PRs, and ask the domain expert to read
      test names. A cheap habit with a big payoff: when a ticket uses a word that isn't in the glossary,
      stop and ask what it means before writing code.</div>
    `,
    examples: [
      {
        title: 'Before / after: from status codes to business verbs',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

// ---------- BEFORE: the translation tax ----------
const legacy = {
  upd(b, st, rsn) {
    if (st === 3 && rsn === 'P') b.refund = b.fare - 30;
    if (st === 3 && rsn === 'A') b.refund = b.fare;
    b.st = st;
    return b;
  },
};
console.log('before:', legacy.upd({ pnr: 'PNR-0001', fare: 120 }, 3, 'A'));
// What happened? Who cancelled? Was the passenger offered another flight?

// ---------- AFTER: the code speaks SkyHop ----------
class Booking {
  #status = 'CONFIRMED';
  #events = [];

  constructor(pnr, fare) {
    this.pnr = pnr;
    this.fare = fare;
  }

  get status() {
    return this.#status;
  }

  get events() {
    return [...this.#events];
  }

  cancelByPassenger() {
    this.#assertConfirmed();
    const fee = 30;
    this.#status = 'CANCELLED_BY_PASSENGER';
    this.#events.push({ type: 'BookingCancelledByPassenger', pnr: this.pnr, refund: this.fare - fee });
  }

  cancelByAirline(reason) {
    this.#assertConfirmed();
    this.#status = 'CANCELLED_BY_AIRLINE';
    this.#events.push({ type: 'BookingCancelledByAirline', pnr: this.pnr, reason, refund: this.fare });
    this.#events.push({ type: 'RebookingOffered', pnr: this.pnr });
  }

  #assertConfirmed() {
    if (this.#status !== 'CONFIRMED') {
      throw new DomainError(this.pnr + ' is ' + this.#status + ', cannot cancel');
    }
  }
}

const mine = new Booking('PNR-0001', 120);
mine.cancelByPassenger();
console.log('after:', mine.status, mine.events);

const stormy = new Booking('PNR-0002', 120);
stormy.cancelByAirline('WEATHER');
console.log('after:', stormy.status, stormy.events.map((e) => e.type));

try {
  stormy.cancelByPassenger();
} catch (e) {
  console.log('rejected:', e.message);
}`,
      },
      {
        title: 'Widget: SkyHop glossary & jargon detector',
        lang: 'html',
        editor: false,
        code: `<style>
  .ul { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .ul h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .ul .sub { color:#9aa3b5; margin:0 0 10px; }
  .ul .terms { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
  .ul .term { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:999px; padding:3px 11px; cursor:pointer; margin:0; font-size:13px; }
  .ul .term:hover { background:#2f3644; }
  .ul .term.on { background:#ffd479; color:#1b1f27; border-color:#ffd479; }
  .ul .card { background:#252b36; border-radius:8px; padding:10px 12px; min-height:110px; }
  .ul .card .row { margin:3px 0; }
  .ul .card .k { color:#9aa3b5; display:inline-block; min-width:96px; }
  .ul code { background:#14171d; color:#ffd479; padding:1px 5px; border-radius:4px; font-size:12.5px; }
  .ul textarea { width:100%; box-sizing:border-box; min-height:110px; background:#14171d; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; font:12.5px/1.45 ui-monospace, Menlo, monospace; margin:6px 0; }
  .ul .find { margin:4px 0; padding:6px 10px; border-radius:6px; background:#2a2330; border-left:3px solid #ff8a80; }
  .ul .ok { background:#1f2b24; border-left-color:#6fdc8c; }
  .ul .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:5px 12px; cursor:pointer; margin:0 6px 0 0; }
  .ul .btn.ghost { background:#2f3644; }
</style>
<div class="ul">
  <h3>1 · SkyHop glossary</h3>
  <p class="sub">Click a term. Notice the <b>context</b> line: the same word can mean something else elsewhere.</p>
  <div class="terms" id="terms"></div>
  <div class="card" id="card"></div>

  <h3 style="margin-top:16px">2 · Jargon detector</h3>
  <p class="sub">Paste or type code below and click <b>Scan</b>. It flags names that hide business meaning.</p>
  <textarea id="src" spellcheck="false"></textarea>
  <button class="btn" id="scan">Scan</button><button class="btn ghost" id="clean">Load the clean version</button>
  <div id="out" style="margin-top:8px"></div>
</div>
<script>
  const G = {
    'PNR / booking reference': { def: 'A 6-character code (e.g. X7K2PQ) identifying one booking: who travels, on which flights.', code: 'Booking, booking.reference', not: 'Not a ticket. One PNR can hold several tickets and passengers.', ctx: 'Booking' },
    'Segment': { def: 'One flight the passenger is booked on, e.g. SH123 SYD→MEL on 2 Nov.', code: 'Segment', not: 'Not a leg. A segment with a stop (SYD→MEL→ADL on one flight number) has two legs.', ctx: 'Booking, Inventory' },
    'Leg': { def: 'One take-off to one landing of an aircraft.', code: 'FlightLeg', not: 'Booking rarely cares about legs; Flight Ops lives in them.', ctx: 'Flight Ops' },
    'Fare bucket': { def: 'A price level within a cabin (e.g. Y, M, Q). Cheaper buckets close first as the flight fills.', code: 'FareBucket', not: 'Not the cabin. Economy can have 10 buckets.', ctx: 'Inventory, Pricing' },
    'Ancillary': { def: 'Anything sold on top of the fare: checked bag, seat selection, meal, insurance.', code: 'Ancillary, booking.addAncillary()', not: 'Not part of the fare price.', ctx: 'Pricing, Booking' },
    'Check-in window': { def: 'Opens 24h before departure, closes 1h before. Online check-in only inside it.', code: 'CheckInWindow.isOpen(now)', not: 'Not the bag-drop deadline (that is a separate cut-off).', ctx: 'Check-in & Boarding' },
    'No-show': { def: 'A confirmed passenger who did not board and did not cancel.', code: 'booking.markNoShow()', not: 'Not a cancellation. Different refund rules and different statistics.', ctx: 'Check-in & Boarding, Inventory (forecasts)' },
    'Authorised level': { def: 'How many seats we may sell: physical capacity plus overbooking.', code: 'cabin.authorisedLevel', not: 'Not physical capacity.', ctx: 'Inventory' },
    'IROP': { def: 'Irregular operations: cancellations, big delays, diversions. Triggers rebooking.', code: 'FlightDisrupted event, Disruption context', not: 'Not a normal schedule change announced weeks ahead.', ctx: 'Disruption Management' },
    'Passenger': { def: 'In Booking: a named traveller on a PNR. In Check-in: a person with documents, a seat and bags.', code: 'Booking.Traveller / CheckIn.Passenger', not: 'Loyalty does not say passenger at all: it says Member.', ctx: 'Different in every context! (section 2)' },
  };
  const $ = (id) => document.getElementById(id);
  function show(name) {
    const t = G[name];
    for (const b of document.querySelectorAll('.term')) b.classList.toggle('on', b.dataset.t === name);
    $('card').innerHTML =
      '<div class="row" style="font-weight:600;color:#fff">' + name + '</div>' +
      '<div class="row"><span class="k">Means</span>' + t.def + '</div>' +
      '<div class="row"><span class="k">In code</span><code>' + t.code + '</code></div>' +
      '<div class="row"><span class="k">Not to confuse</span>' + t.not + '</div>' +
      '<div class="row"><span class="k">Context</span>' + t.ctx + '</div>';
  }
  $('terms').innerHTML = Object.keys(G).map((k) => '<button class="term" data-t="' + k + '">' + k + '</button>').join('');
  $('terms').addEventListener('click', (e) => { if (e.target.dataset.t) show(e.target.dataset.t); });
  show('No-show');

  const RULES = [
    { re: /[A-Za-z]*(Manager|Helper|Util|Utils|Processor)[A-Za-z]*/g, why: 'Vague container name. What business concept is this? (Booking? CancellationPolicy?)' },
    { re: /status\\s*[=!]==?\\s*\\d+|\\(\\s*\\w+\\s*,\\s*\\d+\\s*[,)]/g, why: 'Magic number for a state. Use a named state or, better, a business verb.' },
    { re: /\\b(flag\\d*|data|info|obj|tmp|item)\\b/g, why: 'Meaningless name. A domain expert cannot read it.' },
    { re: /\\b(upd|update|process|handle|doStuff|setStatus)\\w*\\s*\\(/g, why: 'Generic verb. Which business action is this? cancelByPassenger? markNoShow? rebook?' },
  ];
  const DIRTY = [
    'class BookingManager {',
    '  upd(data, st) {',
    '    if (data.status === 3 && data.flag2) {',
    '      data.info = processRefund(data);',
    '    }',
    '  }',
    '}',
    'mgr.updateStatus(pnr, 3);',
  ].join(String.fromCharCode(10));
  const CLEAN = [
    'class Booking {',
    '  cancelByPassenger(now) {',
    '    const fee = CancellationPolicy.feeFor(this, now);',
    '    this.recordRefund(this.fare - fee);',
    '  }',
    '}',
    'booking.cancelByPassenger(clock.now());',
  ].join(String.fromCharCode(10));
  const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function scan() {
    const src = $('src').value;
    const found = [];
    for (const r of RULES) {
      for (const m of src.matchAll(r.re)) found.push({ hit: m[0], why: r.why });
    }
    const seen = new Set();
    const uniq = found.filter((f) => !seen.has(f.hit) && seen.add(f.hit));
    $('out').innerHTML = uniq.length
      ? uniq.map((f) => '<div class="find"><code>' + esc(f.hit) + '</code> ' + f.why + '</div>').join('') +
        '<div style="color:#9aa3b5;font-size:12px;margin-top:6px">' + uniq.length + ' finding(s). Heuristics only: a human still decides.</div>'
      : '<div class="find ok">No jargon found. An expert could read these names out loud.</div>';
  }
  $('src').value = DIRTY;
  $('scan').onclick = scan;
  $('clean').onclick = () => { $('src').value = CLEAN; scan(); };
  scan();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'Gate agents say "the passenger is a no-show". The code has <code>booking.setStatus(5)</code>. A new developer asks why. What is the best fix?',
        options: [
          'Add a comment <code>// 5 = no-show</code>',
          'Create a constant <code>STATUS_5 = 5</code>',
          'Add <code>booking.markNoShow()</code> with its rules, and stop exposing <code>setStatus</code>',
          'Write it in the wiki',
        ],
        answer: 2,
        why: 'Comments and constants rename the number but not the action. A business verb captures what happened and is the one place to put the no-show rules.',
      },
      {
        q: 'The product owner writes "a booking can have several flights". Developers notice that "booking" in the code sometimes means the PNR and sometimes one flight. What should happen?',
        options: [
          'Keep using "booking" for both, context makes it clear',
          'Agree with the experts on two words (e.g. Booking and Segment) and refactor the code to use them',
          'Rename everything to "Reservation"',
          'Use <code>booking1</code> and <code>booking2</code>',
        ],
        answer: 1,
        why: 'One word, one meaning. Find the expert\'s words for the two concepts and make the code use them consistently.',
      },
      {
        q: 'The Check-in team defines "passenger" as a person with documents, a seat and bags. Loyalty says "member" with a tier and points. Which is the correct ubiquitous language for SkyHop?',
        options: [
          'Check-in\'s, because passengers come first',
          'Loyalty\'s, because it is more general',
          'Both: each is the ubiquitous language inside its own context',
          'Neither: create a company-wide "Customer" that unifies them',
        ],
        answer: 2,
        why: 'A ubiquitous language is ubiquitous within a bounded context. Forcing one enterprise-wide definition creates the god-object you\'ll see in section 2.',
      },
      {
        q: 'Revenue management renames "max seats" to "authorised level" in all their documents. The code still says <code>maxSeats</code>. What does DDD suggest?',
        options: [
          'Leave the code, renaming is risky',
          'Refactor the code to <code>authorisedLevel</code>: language and code evolve together',
          'Add an alias so both names work forever',
          'Ask the business to switch back',
        ],
        answer: 1,
        why: 'If code and conversation drift apart, the translation tax returns. Renames are cheap with modern tooling; misunderstandings are expensive.',
      },
    ],
    exercise: {
      task: `<p>The SkyHop glossary says:</p>
      <ul>
        <li>A booking starts <code>CONFIRMED</code>.</li>
        <li><strong>Check in</strong>: allowed only inside the <em>check-in window</em>, from 24h until 1h before
        departure. Status becomes <code>CHECKED_IN</code>.</li>
        <li><strong>No-show</strong>: after departure, a booking that is still <code>CONFIRMED</code> (never checked
        in) becomes <code>NO_SHOW</code>. A checked-in passenger can't be marked as a no-show by this rule.</li>
      </ul>
      <p>Replace the generic <code>setStatus</code> with the methods <code>checkIn(now)</code> and
      <code>markNoShow(now)</code>. Throw a <code>DomainError</code> when a rule is broken.</p>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof DomainError ? '✅' : '❌', name, '→', e.message);
  }
}

const H = 60 * 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');

class Booking {
  constructor(pnr, departsAt) {
    this.pnr = pnr;
    this.departsAt = departsAt;
    this.status = 'CONFIRMED';
  }

  setStatus(s) {
    this.status = s; // TODO: replace with checkIn(now) and markNoShow(now)
  }

  checkIn(now) {
    // TODO
  }

  markNoShow(now) {
    // TODO
  }
}

const a = new Booking('PNR-0001', DEPARTS);
a.checkIn(DEPARTS - 3 * H);
check('check-in 3h before works', a.status, 'CHECKED_IN');

const b = new Booking('PNR-0002', DEPARTS);
expectThrows('check-in 30h before is rejected', () => b.checkIn(DEPARTS - 30 * H));
expectThrows('check-in 30 min before is rejected', () => b.checkIn(DEPARTS - 0.5 * H));

b.markNoShow(DEPARTS + H);
check('never checked in → NO_SHOW', b.status, 'NO_SHOW');

expectThrows('checked-in passenger is not a no-show', () => a.markNoShow(DEPARTS + H));
expectThrows('no-show before departure is rejected',
  () => new Booking('PNR-0003', DEPARTS).markNoShow(DEPARTS - H));`,
      hint: 'Compute hoursLeft = (this.departsAt - now) / H. The window is open when hoursLeft <= 24 && hoursLeft >= 1. For markNoShow, check now >= departsAt and status === "CONFIRMED".',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log(e instanceof DomainError ? '✅' : '❌', name, '→', e.message);
  }
}

const H = 60 * 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');

class Booking {
  #status = 'CONFIRMED';

  constructor(pnr, departsAt) {
    this.pnr = pnr;
    this.departsAt = departsAt;
  }

  get status() {
    return this.#status;
  }

  checkIn(now) {
    if (this.#status !== 'CONFIRMED') throw new DomainError('Only confirmed bookings can check in');
    const hoursLeft = (this.departsAt - now) / H;
    if (hoursLeft > 24) throw new DomainError('Check-in window opens 24h before departure');
    if (hoursLeft < 1) throw new DomainError('Check-in window closed 1h before departure');
    this.#status = 'CHECKED_IN';
  }

  markNoShow(now) {
    if (now < this.departsAt) throw new DomainError('Flight has not departed yet');
    if (this.#status !== 'CONFIRMED') {
      throw new DomainError(this.pnr + ' is ' + this.#status + ', not a no-show');
    }
    this.#status = 'NO_SHOW';
  }
}

const a = new Booking('PNR-0001', DEPARTS);
a.checkIn(DEPARTS - 3 * H);
check('check-in 3h before works', a.status, 'CHECKED_IN');

const b = new Booking('PNR-0002', DEPARTS);
expectThrows('check-in 30h before is rejected', () => b.checkIn(DEPARTS - 30 * H));
expectThrows('check-in 30 min before is rejected', () => b.checkIn(DEPARTS - 0.5 * H));

b.markNoShow(DEPARTS + H);
check('never checked in → NO_SHOW', b.status, 'NO_SHOW');

expectThrows('checked-in passenger is not a no-show', () => a.markNoShow(DEPARTS + H));
expectThrows('no-show before departure is rejected',
  () => new Booking('PNR-0003', DEPARTS).markNoShow(DEPARTS - H));`,
    },
  },

  // ───────────────────────────────────────────────────────────── anemic-vs-rich
  {
    id: 'anemic-vs-rich',
    section: 'Foundations',
    title: 'Anemic vs rich domain model',
    explain: `
      <p>Martin Fowler coined <strong>Anemic Domain Model</strong> (2003) for a pattern that looks like a domain model
      but isn't: classes named after business things (<code>Booking</code>, <code>Passenger</code>) that hold
      only data plus getters and setters, while all the rules live in separate "service" classes.</p>

      <h3>Why anemic models leak</h3>
      <p>In an anemic model, a rule is enforced only if <em>every caller remembers to go through the right
      service</em>. The object itself happily accepts any value. So the rule holds until someone, usually
      under time pressure, calls the setter directly from a batch job, an admin screen or a migration
      script. Nothing stops them, and nothing tells them.</p>
      <pre><code>// Anemic: rule outside, door wide open
seatService.changeSeat(booking, '12A', now);  // checks the rules
booking.setSeat('12A');                        // ...or just this. Also compiles.

// Rich: rule inside, only one door
booking.changeSeat('12A', now);                // the only way in</code></pre>

      <h3>What "rich" means (and doesn't)</h3>
      <ul>
        <li><strong>Behaviour lives with the data it protects.</strong> <code>booking.changeSeat()</code> checks the
        seat-change rules itself. "Tell, don't ask": tell the booking what to do, don't ask for its fields and
        decide outside.</li>
        <li><strong>State is encapsulated.</strong> No public setters for fields that have rules. In JS, use
        <code>#private</code> fields and expose read-only getters.</li>
        <li><strong>Invariants are always true.</strong> An <em>invariant</em> is a rule that must hold whenever anyone
        looks at the object ("a passenger with an infant never sits in an exit row"). A rich object makes it
        impossible to reach an invalid state.</li>
        <li><strong>Rich ≠ fat.</strong> An entity does not send emails, call HTTP APIs or load other objects from
        the database. Those belong to application services and infrastructure. Rules that span several
        objects can live in a <em>domain service</em>.</li>
      </ul>

      <h3>When anemic is fine</h3>
      <p>If there are no real rules (an admin screen editing airport names), data objects plus a simple
      service, a <em>transaction script</em>, are the right choice. "Anemic" is only an anti-pattern when you
      have rules that need protecting. That's the next lesson.</p>

      <div class="warn">Adding getters and setters for every private field doesn't make a model rich.
      <code>get seat()</code> + <code>set seat(v)</code> is a public field with extra steps.</div>

      <div class="tip"><strong>In the real world:</strong> most codebases are anemic because ORMs and
      frameworks generate them that way (entity = table row with setters). You don't need a rewrite.
      Pick one important rule that has been bypassed before, move it into the entity, make the setter
      private, and let the compiler or tests show you every caller that needs to change.</div>
    `,
    examples: [
      {
        title: 'Anemic: the seat rule lives in a service, the setter is a back door',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

const MIN = 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');
const EXIT_ROWS = [12, 13];
const rowOf = (seat) => parseInt(seat, 10);

// ① Data bag: fields + getters/setters, no rules
class Booking {
  constructor(pnr, passengerName, travelsWithInfant, departsAt) {
    this.pnr = pnr;
    this.passengerName = passengerName;
    this.travelsWithInfant = travelsWithInfant;
    this.departsAt = departsAt;
    this.seat = null;
  }

  getSeat() {
    return this.seat;
  }

  setSeat(seat) {
    this.seat = seat;
  }
}

// ② The rules live here... if you remember to call it
class SeatService {
  changeSeat(booking, seat, now) {
    if (booking.departsAt - now < 60 * MIN) {
      throw new DomainError('Seat changes close 1h before departure');
    }
    if (EXIT_ROWS.includes(rowOf(seat)) && booking.travelsWithInfant) {
      throw new DomainError('Passengers with an infant cannot sit in an exit row');
    }
    booking.setSeat(seat);
    console.log('seat service:', booking.passengerName, '→', seat);
  }
}

// ③ Months later, the airport team writes a "quick" auto-assign for check-in
function autoAssignAtCheckIn(booking, freeSeats) {
  if (!booking.getSeat()) booking.setSeat(freeSeats[0]);
}

const seats = new SeatService();
const now = DEPARTS - 3 * 60 * MIN;
const lee = new Booking('PNR-0042', 'Lee', true, DEPARTS);

seats.changeSeat(lee, '20C', now);

try {
  seats.changeSeat(lee, '12A', now);
} catch (e) {
  console.log('seat service rejected:', e.message);
}

const kim = new Booking('PNR-0043', 'Kim', true, DEPARTS);
autoAssignAtCheckIn(kim, ['12A', '14B']);
console.log('auto-assign:', kim.passengerName, '→', kim.getSeat());

lee.seat = '13C'; // ④ or just write the field from an admin script
console.log('admin script:', lee.passengerName, '→', lee.seat);

for (const b of [lee, kim]) {
  if (b.travelsWithInfant && EXIT_ROWS.includes(rowOf(b.seat))) {
    console.warn('❌ BUG:', b.passengerName, 'has an infant and sits in exit row', b.seat);
  }
}`,
        explain: `
          <details>
            <summary>The problem: the rule is only as strong as its weakest caller</summary>
            <p>The safety rule "no infants in exit rows" exists (exit-row passengers must be able to open the
            door in an evacuation). It is written correctly in <code>SeatService</code>. The bug is that
            <code>Booking</code> doesn't know about it, so any code that holds a booking can break it.</p>
            <table>
              <tr><th>Step</th><th>Code path</th><th>Rule checked?</th><th>Console</th></tr>
              <tr><td>1</td><td><code>seats.changeSeat(lee, '20C')</code></td><td>✅ yes</td><td><code>seat service: Lee → 20C</code></td></tr>
              <tr><td>2</td><td><code>seats.changeSeat(lee, '12A')</code></td><td>✅ yes, throws</td><td><code>seat service rejected: Passengers with an infant cannot sit in an exit row</code></td></tr>
              <tr><td>3</td><td><code>autoAssignAtCheckIn(kim, …)</code> → <code>setSeat('12A')</code></td><td>❌ bypassed</td><td><code>auto-assign: Kim → 12A</code></td></tr>
              <tr><td>4</td><td><code>lee.seat = '13C'</code></td><td>❌ bypassed</td><td><code>admin script: Lee → 13C</code></td></tr>
              <tr><td>5</td><td>safety audit loop</td><td></td><td><code>❌ BUG: Lee has an infant and sits in exit row 13C</code><br><code>❌ BUG: Kim has an infant and sits in exit row 12A</code></td></tr>
            </table>
            <p>Two out of four writes skipped the rule. Neither was malicious: the auto-assign author simply
            didn't know <code>SeatService</code> existed. In an anemic model, <strong>knowing the rules is the
            caller's job</strong>, and callers multiply.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>class Booking { setSeat(seat) { this.seat = seat; } }   // ① any value accepted
class SeatService { changeSeat(booking, seat, now) {…} } // ② rules outside the object
function autoAssignAtCheckIn(b, free) { b.setSeat(free[0]) } // ③ legal, compiles, wrong
lee.seat = '13C';                                        // ④ public field: same door</code></pre>
            <ol>
              <li><strong>①</strong> The booking can't refuse anything. Its "invariants" are a wish.</li>
              <li><strong>②</strong> Correct logic, wrong place. It only runs if called.</li>
              <li><strong>③</strong> Nothing in the type or the API warns the author. Code review missed it because it looks harmless.</li>
              <li><strong>④</strong> Getters/setters didn't protect anything; the field was public anyway.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Look at the signature of <code>autoAssignAtCheckIn(booking, freeSeats)</code>: it doesn't even receive <code>now</code>. Even an author who knew about the "seat changes close 1h before departure" rule couldn't check it there. Rules outside the object force every caller to collect the right inputs.</li>
              <li>Swap the free seats to <code>['14B', '12A']</code>: the bug for Kim disappears. It depended on which seat happened to be first: a bug that shows up "sometimes" in production.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Rich: the booking protects its own invariants',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

const MIN = 60 * 1000;
const DEPARTS = Date.parse('2026-11-02T07:15:00Z');
const EXIT_ROWS = [12, 13];
const rowOf = (seat) => parseInt(seat, 10);

class Booking {
  #seat = null; // ① private: no back door

  constructor(pnr, passengerName, travelsWithInfant, departsAt) {
    this.pnr = pnr;
    this.passengerName = passengerName;
    this.travelsWithInfant = travelsWithInfant;
    this.departsAt = departsAt;
  }

  get seat() {
    return this.#seat; // ② read-only from outside
  }

  // ③ the only way to change the seat, rules included
  changeSeat(seat, now) {
    if (this.departsAt - now < 60 * MIN) {
      throw new DomainError('Seat changes close 1h before departure');
    }
    if (!this.canSit(seat)) {
      throw new DomainError('Passengers with an infant cannot sit in an exit row');
    }
    this.#seat = seat;
    console.log('changeSeat:', this.passengerName, '→', seat);
  }

  canSit(seat) {
    return !(this.travelsWithInfant && EXIT_ROWS.includes(rowOf(seat)));
  }

  // ④ auto-assign is a booking behaviour too, so it can't skip the rule
  autoAssign(freeSeats, now) {
    if (this.#seat) return;
    const seat = freeSeats.find((s) => this.canSit(s));
    if (!seat) throw new DomainError('No suitable free seat');
    this.changeSeat(seat, now);
  }
}

const now = DEPARTS - 3 * 60 * MIN;
const lee = new Booking('PNR-0042', 'Lee', true, DEPARTS);

lee.changeSeat('20C', now);

try {
  lee.changeSeat('12A', now);
} catch (e) {
  console.log('rejected:', e.message);
}

const kim = new Booking('PNR-0043', 'Kim', true, DEPARTS);
kim.autoAssign(['12A', '14B'], now);

try {
  lee.seat = '13C'; // ⑤ getter-only property: throws in strict mode (modules are strict)
} catch (e) {
  console.log('admin script blocked:', e.name);
}
console.log('lee still in', lee.seat);

for (const b of [lee, kim]) {
  const safe = b.canSit(b.seat);
  console.log(safe ? '✅' : '❌', b.passengerName, 'in', b.seat);
}`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>#seat = null;                       // ① private field
get seat() { return this.#seat; }   // ② read, never write
changeSeat(seat, now) { …rules…; this.#seat = seat; }  // ③ one door
autoAssign(free, now) { … this.changeSeat(seat, now); } // ④ reuses the door
lee.seat = '13C';                   // ⑤ TypeError: no setter</code></pre>
            <ol>
              <li><strong>①</strong> <code>#seat</code> is truly private in JS. <code>lee.#seat = …</code> outside the class is a <em>syntax error</em>, so it can't even be written.</li>
              <li><strong>②</strong> Other code can read the seat for display, but not change it.</li>
              <li><strong>③</strong> Every write goes through the rules. The rules are next to the data they protect.</li>
              <li><strong>④</strong> The airport team's auto-assign became a <code>Booking</code> behaviour. It picks the first seat the passenger is <em>allowed</em> to sit in.</li>
              <li><strong>⑤</strong> Assigning to a getter-only property throws a <code>TypeError</code> in strict mode. ES modules are always strict.</li>
            </ol>
          </details>
          <details>
            <summary>Step by step: the same four writes, now with a rich model</summary>
            <table>
              <tr><th>Step</th><th>Code path</th><th>Rule checked?</th><th>Console</th></tr>
              <tr><td>1</td><td><code>lee.changeSeat('20C')</code></td><td>✅</td><td><code>changeSeat: Lee → 20C</code></td></tr>
              <tr><td>2</td><td><code>lee.changeSeat('12A')</code></td><td>✅ throws</td><td><code>rejected: Passengers with an infant cannot sit in an exit row</code></td></tr>
              <tr><td>3</td><td><code>kim.autoAssign(['12A','14B'])</code></td><td>✅ skips 12A</td><td><code>changeSeat: Kim → 14B</code></td></tr>
              <tr><td>4</td><td><code>lee.seat = '13C'</code></td><td>✅ impossible</td><td><code>admin script blocked: TypeError</code><br><code>lee still in 20C</code></td></tr>
              <tr><td>5</td><td>safety audit</td><td></td><td><code>✅ Lee in 20C</code><br><code>✅ Kim in 14B</code></td></tr>
            </table>
            <p>Compare with the anemic example: same rules, same scenario, zero bugs. The difference is not
            better developers, it's that <strong>breaking the rule is no longer possible</strong>.</p>
          </details>
          <details>
            <summary>Common mistake: "rich" doesn't mean "does everything"</summary>
            <div class="warn">Don't put <code>sendSeatChangeEmail()</code>, <code>fetch()</code> or
            <code>repository.save(this)</code> inside <code>Booking</code>. The entity decides <em>whether</em> the
            change is allowed and records <em>what</em> happened. An application service loads it, calls
            <code>changeSeat</code>, saves it and publishes events. You'll build that split in later lessons.</div>
            <div class="tip">Where do the free seats come from? In a real system, seat availability belongs to the
            flight's seat map (another object, maybe another context). The booking receives the list as an argument,
            so its rule stays testable with no database.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s <code>Booking</code> has <code>getBags()</code>/<code>setBags()</code>, and a <code>BaggageService</code> checks "max 3 bags". An ops script calls <code>booking.setBags(5)</code>. What kind of model is this, and what is the fix?',
        options: [
          'Rich model; add more unit tests to the script',
          'Anemic model; move the rule into <code>booking.addBag()</code> and remove the public setter',
          'Rich model; make <code>BaggageService</code> a singleton',
          'Anemic model; add a database CHECK constraint and keep the setter',
        ],
        answer: 1,
        why: 'The object accepts any value and relies on callers to use the service. Move the rule to the object and close the back door. A DB constraint is a fine extra safety net, but the domain should not depend on it.',
      },
      {
        q: 'A developer makes <code>Booking</code> "rich" by adding <code>get seat()</code> and <code>set seat(v) { this.#seat = v; }</code>. Is the exit-row rule now protected?',
        options: [
          'Yes, the field is private',
          'Yes, getters and setters are encapsulation',
          'No: a setter with no rules is a public field with extra steps',
          'No: JavaScript can\'t have private fields',
        ],
        answer: 2,
        why: 'Encapsulation means the object decides what changes are valid. A pass-through setter decides nothing.',
      },
      {
        q: 'Where should "send the passenger an email after a seat change" go?',
        options: [
          'Inside <code>Booking.changeSeat()</code>, since it is part of the behaviour',
          'In an application service or event handler that reacts after <code>changeSeat</code> succeeds',
          'In the seat setter',
          'In a database trigger',
        ],
        answer: 1,
        why: 'The entity enforces rules and records what happened. Side effects (email, HTTP, persistence) belong outside it, often reacting to a domain event like SeatChanged.',
      },
      {
        q: 'SkyHop\'s internal tool for editing airport display names (code, name, time zone) uses plain data objects and a simple service. Is that an anti-pattern?',
        options: [
          'Yes, every object must be rich',
          'No: there are no real invariants to protect, so a simple transaction script is appropriate',
          'Yes, it should be event-sourced',
          'No, but only if it is a microservice',
        ],
        answer: 1,
        why: '"Anemic" is a problem only when there are rules being bypassed. Simple CRUD deserves simple code.',
      },
    ],
    exercise: {
      task: `<p>Baggage rules from the SkyHop glossary:</p>
      <ul>
        <li>Max <strong>3</strong> checked bags per booking.</li>
        <li>Each bag weighs at most <strong>32 kg</strong> (handler safety limit).</li>
        <li>No bags can be added after check-in.</li>
      </ul>
      <p>Turn the anemic <code>Booking</code> into a rich one: keep bags in a <code>#bags</code> private field, add
      <code>addBag(kg)</code> and <code>checkIn()</code> that enforce the rules, and expose <code>bags</code> as a
      <strong>frozen copy</strong> so nobody can <code>push</code> past the rules.</p>`,
      starter: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log('✅', name, '→', e.name + ': ' + e.message);
  }
}

// Anemic: public array, rules nowhere
class Booking {
  constructor(pnr) {
    this.pnr = pnr;
    this.bags = [];
    this.checkedIn = false;
  }

  addBag(kg) {
    this.bags.push(kg); // TODO: enforce the rules
  }

  checkIn() {
    this.checkedIn = true;
  }
}

const b = new Booking('PNR-0007');
b.addBag(20);
b.addBag(23);
check('two bags added', b.bags, [20, 23]);

expectThrows('bag over 32 kg', () => b.addBag(35));
b.addBag(15);
expectThrows('4th bag', () => b.addBag(10));
expectThrows('push past the rules', () => b.bags.push(99));
check('still 3 bags', b.bags.length, 3);

const c = new Booking('PNR-0008');
c.checkIn();
expectThrows('bag after check-in', () => c.addBag(10));
check('no bags on c', c.bags.length, 0);`,
      hint: 'Use #bags = [] and #checkedIn = false. get bags() { return Object.freeze([...this.#bags]); } — pushing to a frozen array throws a TypeError in strict mode.',
      solution: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

function expectThrows(name, fn) {
  try {
    fn();
    console.log('❌', name, '→ did not throw');
  } catch (e) {
    console.log('✅', name, '→', e.name + ': ' + e.message);
  }
}

class Booking {
  static MAX_BAGS = 3;
  static MAX_KG = 32;
  #bags = [];
  #checkedIn = false;

  constructor(pnr) {
    this.pnr = pnr;
  }

  get bags() {
    return Object.freeze([...this.#bags]);
  }

  addBag(kg) {
    if (this.#checkedIn) throw new DomainError('Bags cannot be added after check-in');
    if (kg > Booking.MAX_KG) throw new DomainError('A bag may weigh at most 32 kg');
    if (this.#bags.length >= Booking.MAX_BAGS) throw new DomainError('Max 3 checked bags');
    this.#bags.push(kg);
  }

  checkIn() {
    this.#checkedIn = true;
  }
}

const b = new Booking('PNR-0007');
b.addBag(20);
b.addBag(23);
check('two bags added', b.bags, [20, 23]);

expectThrows('bag over 32 kg', () => b.addBag(35));
b.addBag(15);
expectThrows('4th bag', () => b.addBag(10));
expectThrows('push past the rules', () => b.bags.push(99));
check('still 3 bags', b.bags.length, 3);

const c = new Booking('PNR-0008');
c.checkIn();
expectThrows('bag after check-in', () => c.addBag(10));
check('no bags on c', c.bags.length, 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── when-ddd
  {
    id: 'when-ddd',
    section: 'Foundations',
    title: 'When DDD is (and isn\'t) worth it',
    explain: `
      <p>DDD has a cost: time with domain experts, more classes, more thinking before coding, and a learning curve
      for the team. That cost pays off only where the <strong>business logic is complex and valuable</strong>.
      Evans' book is subtitled "Tackling Complexity in the Heart of Software" for a reason.</p>

      <h3>Strategic vs tactical: different price tags</h3>
      <ul>
        <li><strong>Strategic DDD</strong> (ubiquitous language, subdomains, bounded contexts, context maps) is cheap and
        useful almost everywhere. Even a CRUD app benefits from clear names and knowing which team owns what.</li>
        <li><strong>Tactical DDD</strong> (aggregates, value objects, domain events, repositories) is where the cost is.
        Use it only in the parts where rules are complex, which are usually the core of the business.</li>
      </ul>

      <h3>Pick the implementation pattern per area, not per company</h3>
      <p>Vlad Khononov's <em>Learning Domain-Driven Design</em> (2021) gives a practical ladder. Choose per
      subdomain:</p>
      <table>
        <tr><th>Pattern</th><th>Fits when</th><th>SkyHop example</th></tr>
        <tr><td><strong>Transaction script</strong></td><td>Simple procedures, few rules</td><td>Nightly job that exports yesterday's bookings to finance</td></tr>
        <tr><td><strong>Active record</strong></td><td>CRUD with simple validation on data structures</td><td>Admin screen for airports and aircraft types</td></tr>
        <tr><td><strong>Domain model</strong> (tactical DDD)</td><td>Complex rules and invariants that change often</td><td>Booking changes, fare rules, disruption rebooking</td></tr>
        <tr><td><strong>Event-sourced domain model</strong></td><td>Complex rules <em>and</em> you need the full history (audit, money, analytics)</td><td>Loyalty points ledger, LedgerBank accounts</td></tr>
      </table>

      <h3>Signals that DDD is worth it</h3>
      <ul>
        <li>The experts argue about the rules, and the rules have exceptions to exceptions.</li>
        <li>This part of the system is why customers choose you (competitive advantage).</li>
        <li>It will live for years and change every quarter.</li>
        <li>A domain expert is actually available to talk to.</li>
      </ul>
      <h3>Signals that it isn't</h3>
      <ul>
        <li>The work is mostly forms over a database (CRUD) with simple validation.</li>
        <li>You could buy it (payments, email, identity) and it's not your differentiator.</li>
        <li>It's a prototype or a throwaway marketing page.</li>
        <li>It's a data pipeline or report: transforming data, not protecting rules.</li>
        <li>Nobody on the business side will spend time with the team.</li>
      </ul>

      <div class="warn"><strong>Two classic failures.</strong> (1) "DDD everywhere": aggregates and repositories
      for an airport-codes table, triple the code for zero benefit. (2) "DDD nowhere": the pricing engine, the one
      thing that makes SkyHop money, is a 3,000-line transaction script because "we don't do patterns here".</div>

      <div class="tip"><strong>In the real world:</strong> a typical company ends up with a mix. One or two
      contexts use a full domain model, a few use active record, and several are bought SaaS products
      wrapped in a thin adapter. Mature teams decide this per context and write it down, so nobody "DDDs"
      the admin screens and nobody CRUDs the pricing engine.</div>
    `,
    examples: [
      {
        title: 'Widget: should this project use DDD?',
        lang: 'html',
        editor: false,
        code: `<style>
  .wd { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .wd h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .wd .sub { color:#9aa3b5; margin:0 0 10px; }
  .wd .presets button { background:#2f3644; color:#e6e6e6; border:1px solid #3a4252; border-radius:999px; padding:3px 10px; font-size:12.5px; cursor:pointer; margin:0 4px 6px 0; }
  .wd .presets button:hover { background:#3a4252; }
  .wd .q { display:grid; grid-template-columns: 1fr 230px; gap:6px 14px; align-items:center; padding:6px 0; border-bottom:1px solid #2a303c; }
  .wd .q span { color:#c9cfdb; }
  .wd .seg { display:flex; border:1px solid #3a4252; border-radius:6px; overflow:hidden; }
  .wd .seg label { flex:1; text-align:center; padding:4px 0; cursor:pointer; font-size:12.5px; color:#c9cfdb; background:#252b36; }
  .wd .seg input { display:none; }
  .wd .seg input:checked + i { font-style:normal; color:#1b1f27; }
  .wd .seg label:has(input:checked) { background:#ffd479; color:#1b1f27; }
  .wd .seg i { font-style:normal; }
  .wd .res { margin-top:12px; background:#252b36; border-radius:8px; padding:10px 12px; }
  .wd .res .big { font-size:17px; font-weight:600; color:#fff; }
  .wd .meter { height:8px; background:#14171d; border-radius:4px; margin:8px 0; overflow:hidden; }
  .wd .meter div { height:100%; background:linear-gradient(90deg,#6fdc8c,#ffd479,#ff8a80); }
  .wd ul { margin:6px 0 0; padding-left:20px; color:#c9cfdb; }
  @media (max-width: 560px) { .wd .q { grid-template-columns: 1fr; } }
</style>
<div class="wd">
  <h3>DDD fit check</h3>
  <p class="sub">Answer for one part of a system (not the whole company). Or start from a preset.</p>
  <div class="presets" id="presets"></div>
  <div id="qs"></div>
  <div class="res" id="res"></div>
</div>
<script>
  const QS = [
    { id: 'rules', text: 'How complex are the business rules?', opts: ['Forms + validation', 'Some rules', 'Rules with many exceptions'] },
    { id: 'edge', text: 'Is it why customers choose you?', opts: ['No, everyone has it', 'Somewhat', 'Yes, it is our edge'] },
    { id: 'change', text: 'How often do the rules change?', opts: ['Rarely', 'Every few months', 'Constantly'] },
    { id: 'expert', text: 'Is a domain expert available?', opts: ['No', 'Sometimes', 'Yes, regularly'] },
    { id: 'life', text: 'Expected lifetime?', opts: ['Weeks (prototype)', '1-2 years', 'Many years'] },
    { id: 'buy', text: 'Can you buy a good off-the-shelf product?', opts: ['Yes, easily', 'Partially', 'No'] },
    { id: 'history', text: 'Do you need full history / audit of every change?', opts: ['No', 'Nice to have', 'Yes, legally or for money'] },
  ];
  const PRESETS = {
    'Airport codes admin screen': { rules: 0, edge: 0, change: 0, expert: 1, life: 2, buy: 1, history: 0 },
    'Dynamic pricing engine': { rules: 2, edge: 2, change: 2, expert: 2, life: 2, buy: 1, history: 1 },
    'Disruption rebooking': { rules: 2, edge: 1, change: 1, expert: 2, life: 2, buy: 1, history: 1 },
    'Card payments': { rules: 1, edge: 0, change: 0, expert: 1, life: 2, buy: 0, history: 2 },
    'Black Friday landing page': { rules: 0, edge: 0, change: 0, expert: 0, life: 0, buy: 1, history: 0 },
    'Loyalty points ledger': { rules: 2, edge: 1, change: 1, expert: 2, life: 2, buy: 1, history: 2 },
  };
  const state = Object.assign({}, PRESETS['Dynamic pricing engine']);
  const $ = (id) => document.getElementById(id);

  $('qs').innerHTML = QS.map((q) =>
    '<div class="q"><span>' + q.text + '</span><div class="seg">' +
    q.opts.map((o, i) => '<label><input type="radio" name="' + q.id + '" value="' + i + '"><i>' + o + '</i></label>').join('') +
    '</div></div>').join('');
  $('presets').innerHTML = '<span style="color:#9aa3b5;font-size:12.5px;margin-right:6px">Presets:</span>' +
    Object.keys(PRESETS).map((k) => '<button data-p="' + k + '">' + k + '</button>').join('');

  function sync() {
    for (const q of QS) {
      for (const r of document.getElementsByName(q.id)) r.checked = +r.value === state[q.id];
    }
  }

  function recommend(s) {
    const reasons = [];
    if (s.life === 0) return { title: 'Just build it (no DDD)', pct: 5, reasons: ['A prototype or throwaway page does not live long enough to repay modelling effort.', 'Keep names clear; that is all.'] };
    if (s.buy === 0 && s.edge === 0) {
      return { title: 'Buy / integrate (generic subdomain)', pct: 20, reasons: ['A good product exists and it is not your edge. Buy it.', 'Wrap the vendor in a thin adapter (or anti-corruption layer) so its model does not leak into yours.', s.history === 2 ? 'Keep your own record of what you sent and received for audit.' : 'Do not build your own.'] };
    }
    const score = s.rules * 3 + s.edge * 2 + s.change * 2 + s.expert * 1;
    const pct = Math.round((score / 16) * 100);
    if (score <= 4) {
      reasons.push('Rules are simple: a transaction script or active record (ORM entity + validation) is enough.');
      reasons.push('Still worth it: clear names and a clear owner (strategic DDD is cheap).');
      return { title: 'CRUD / transaction script', pct, reasons };
    }
    if (score <= 8) {
      reasons.push('Some real rules: start with simple services, but give each rule one home.');
      if (s.expert === 0) reasons.push('No expert available: DDD modelling will be guesswork. Get one, or keep it simple.');
      reasons.push('Upgrade to a domain model when rule bugs start appearing.');
      return { title: 'Simple services, light modelling', pct, reasons };
    }
    reasons.push('Complex, changing rules: invest in a rich domain model (entities, value objects, aggregates).');
    if (s.edge === 2) reasons.push('This is your competitive edge: core subdomain. Put your best people and a domain expert here.');
    if (s.expert === 0) reasons.push('⚠ No domain expert: the biggest risk. DDD without experts is just extra classes.');
    if (s.history === 2) reasons.push('History matters: consider an event-sourced domain model.');
    if (s.buy === 0) reasons.push('A product exists, but because it matters this much, building gives you control.');
    return { title: s.history === 2 ? 'Domain model (consider event sourcing)' : 'Full DDD domain model', pct, reasons };
  }

  function render() {
    const r = recommend(state);
    $('res').innerHTML = '<div style="color:#9aa3b5;font-size:12px">Recommendation</div>' +
      '<div class="big">' + r.title + '</div>' +
      '<div class="meter"><div style="width:' + Math.max(4, r.pct) + '%"></div></div>' +
      '<div style="color:#9aa3b5;font-size:12px">Modelling investment justified: ' + r.pct + '%</div>' +
      '<ul>' + r.reasons.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
  }

  $('qs').addEventListener('change', (e) => { state[e.target.name] = +e.target.value; render(); });
  $('presets').addEventListener('click', (e) => {
    const p = PRESETS[e.target.dataset.p];
    if (!p) return;
    Object.assign(state, p);
    sync();
    render();
  });
  sync();
  render();
</script>`,
      },
      {
        title: 'Right-sized: a transaction script where a domain model would be overkill',
        code: `// SkyHop admin: edit airport reference data. No invariants worth an aggregate.
const airports = new Map();

function saveAirport(input) {
  const code = String(input.code || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(code)) {
    return { ok: false, error: 'IATA code must be 3 letters' };
  }
  if (!input.name) {
    return { ok: false, error: 'Name is required' };
  }
  airports.set(code, { code, name: input.name, timeZone: input.timeZone || 'UTC' });
  return { ok: true };
}

console.log(saveAirport({ code: 'syd', name: 'Sydney', timeZone: 'Australia/Sydney' }));
console.log(saveAirport({ code: 'MELB', name: 'Melbourne' }));
console.log(saveAirport({ code: 'MEL', name: 'Melbourne', timeZone: 'Australia/Melbourne' }));
console.log('airports:', [...airports.values()]);

// That is the whole feature. An Airport aggregate, AirportRepository, AirportCreated event
// and AirportFactory would add four files and no protection the 6 lines above don't give.`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop wants an internal screen to edit the list of aircraft types (code, name, seat count). Which approach fits?',
        options: [
          'Event-sourced aggregates with a full domain model',
          'Simple CRUD / active record with basic validation',
          'A separate microservice per aircraft type',
          'Microservices plus CQRS',
        ],
        answer: 1,
        why: 'Simple reference data with almost no rules. Clear names still help, but tactical patterns would only add code.',
      },
      {
        q: 'SkyHop\'s dynamic pricing (adjusting fares by demand, competitor prices and booking curves) is changing weekly and is a key reason the airline is profitable. Where should the team invest in DDD?',
        options: [
          'Nowhere, pricing is just math',
          'Here: it is complex, changes often and is a competitive edge, so it deserves a rich model and close work with revenue experts',
          'Only in the admin screens',
          'Buy a pricing SaaS and stop thinking about it',
        ],
        answer: 1,
        why: 'Complex + valuable + changing = the place where DDD\'s cost pays back. This is a core subdomain (next section).',
      },
      {
        q: 'A team wants full DDD for a new loyalty feature, but the loyalty product manager has no time to meet them for the next three months. What is the biggest risk?',
        options: [
          'The code will be slower',
          'They will build an elaborate model of their own guesses, which is just extra code',
          'They can\'t use TypeScript',
          'None, DDD doesn\'t need experts',
        ],
        answer: 1,
        why: 'DDD\'s value comes from capturing real domain knowledge. Without access to experts, the model is a developer\'s fantasy wrapped in patterns.',
      },
      {
        q: 'Which part of DDD is cheap enough to apply even to the CRUD parts of SkyHop?',
        options: [
          'Aggregates and repositories',
          'Event sourcing',
          'Ubiquitous language and clear boundaries/ownership',
          'Sagas',
        ],
        answer: 2,
        why: 'Good names and knowing which context owns which data cost almost nothing and help everywhere. Tactical patterns are the expensive part.',
      },
    ],
    exercise: {
      lang: 'html',
      editor: false,
      task: `<p>For each piece of work in the box below, choose the approach that fits best, then click
      <strong>Check</strong>. The checker explains every wrong answer.</p>`,
      starter: `<style>
  .wx { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .wx h3 { margin:0 0 8px; font-size:16px; color:#fff; }
  .wx .row { display:grid; grid-template-columns: 1fr 250px; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid #2a303c; }
  .wx .row b { color:#fff; }
  .wx .row small { color:#9aa3b5; display:block; }
  .wx select { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:5px; width:100%; }
  .wx .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:6px 14px; cursor:pointer; margin-top:10px; }
  .wx .fb { margin-top:4px; font-size:12.5px; }
  .wx .ok { color:#6fdc8c; } .wx .no { color:#ff8a80; }
  .wx #sum { margin-top:10px; font-weight:600; }
  @media (max-width: 560px) { .wx .row { grid-template-columns: 1fr; } }
</style>
<div class="wx">
  <h3>Pick an approach for each</h3>
  <div id="rows"></div>
  <button class="btn" id="check">Check</button>
  <div id="sum"></div>
</div>
<script>
  const PRESET = {};
  const OPTS = ['— choose —', 'CRUD / transaction script', 'Rich domain model (tactical DDD)', 'Buy / integrate a product'];
  const ITEMS = [
    { id: 'a', name: 'SkyHop disruption rebooking', desc: 'When a flight is cancelled, rebook hundreds of passengers by fare, loyalty tier, connections and crew limits. Rules change after every storm.', ans: 2,
      why: 'Many interacting rules that change often, with experts available in the ops control centre. A rich model pays off.' },
    { id: 'b', name: 'Staff phone directory', desc: 'List of employees with name, team and extension, edited by HR.', ans: 1,
      why: 'Pure data with trivial validation. A domain model adds nothing here.' },
    { id: 'c', name: 'Password login & MFA', desc: 'Sign-up, login, password reset and 2FA for the SkyHop app.', ans: 3,
      why: 'Identity is a generic problem with mature products. Building it yourself adds risk and gives no advantage.' },
    { id: 'd', name: 'ShopLane return eligibility', desc: 'Whether an item can be returned: category, days since delivery, opened or not, member tier, regional consumer law.', ans: 2,
      why: 'Rules with exceptions that differ by region and change with policy. A rich model keeps them in one place.' },
    { id: 'e', name: 'Transactional email delivery', desc: 'Sending booking-confirmation emails with good deliverability.', ans: 3,
      why: 'Email delivery is generic. Use a provider; your model only decides what to send and when.' },
    { id: 'f', name: 'Nightly CSV export to finance', desc: 'Dump yesterday\\'s bookings into a CSV for the finance team.', ans: 1,
      why: 'A data transformation, not rules to protect. A short script is right.' },
  ];
  const rows = document.getElementById('rows');
  rows.innerHTML = ITEMS.map((it) =>
    '<div class="row"><div><b>' + it.name + '</b><small>' + it.desc + '</small><div class="fb" id="fb-' + it.id + '"></div></div>' +
    '<select id="s-' + it.id + '">' + OPTS.map((o, i) => '<option value="' + i + '">' + o + '</option>').join('') + '</select></div>'
  ).join('');
  for (const it of ITEMS) if (PRESET[it.id] != null) document.getElementById('s-' + it.id).value = PRESET[it.id];

  document.getElementById('check').onclick = () => {
    let right = 0;
    for (const it of ITEMS) {
      const v = +document.getElementById('s-' + it.id).value;
      const fb = document.getElementById('fb-' + it.id);
      if (v === it.ans) {
        right++;
        fb.innerHTML = '<span class="ok">✓ ' + it.why + '</span>';
      } else if (v === 0) {
        fb.innerHTML = '<span class="no">Pick an option.</span>';
      } else {
        fb.innerHTML = '<span class="no">✗ Not quite. ' + it.why + ' Better: ' + OPTS[it.ans] + '.</span>';
      }
    }
    const sum = document.getElementById('sum');
    sum.innerHTML = right === ITEMS.length
      ? '<span class="ok">✅ All ' + right + ' correct. You are matching effort to complexity.</span>'
      : '<span class="no">' + right + ' / ' + ITEMS.length + ' correct.</span>';
  };
</script>`,
      hint: 'Ask two questions per item: are there rules with exceptions that change often (→ rich model)? Can you buy a solid product and it\'s not your edge (→ buy)? Otherwise, simple CRUD.',
      solution: '__WD_SOLUTION__',
    },
  },
);

// The "when-ddd" exercise solution is the same widget, pre-filled with the right answers.
(function () {
  const l = window.LESSONS.find((x) => x.id === 'when-ddd');
  l.exercise.solution = l.exercise.starter
    .replace('const PRESET = {};', "const PRESET = { a: 2, b: 1, c: 3, d: 2, e: 3, f: 1 };")
    .replace("document.getElementById('check').onclick = () => {", "const runCheck = () => {")
    .replace(/<\/script>$/, "  document.getElementById('check').onclick = runCheck;\n  runCheck();\n</script>");
})();

// Spread correct answers across option positions (deterministic swap, keeps the other options in order).
(function () {
  const ids = ["why-ddd","domain-model","ubiquitous-language","anemic-vs-rich","when-ddd"];
  const targets = [2, 0, 3, 1];
  let k = 0;
  for (const l of window.LESSONS) {
    if (!ids.includes(l.id)) continue;
    for (const q of l.quiz) {
      const t = Math.min(targets[k++ % targets.length], q.options.length - 1);
      [q.options[q.answer], q.options[t]] = [q.options[t], q.options[q.answer]];
      q.answer = t;
    }
  }
})();
