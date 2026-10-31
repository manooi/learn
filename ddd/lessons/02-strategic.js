window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── subdomains
  {
    id: 'subdomains',
    section: 'Strategic Design',
    title: 'Core, supporting & generic subdomains',
    explain: `
      <p>A business is not one big problem. SkyHop has to price seats, take payments, check people in, send
      emails, plan schedules, handle storms. Each of those areas is a <strong>subdomain</strong>. They are not
      equally important, and DDD's first strategic move is to say so out loud.</p>

      <h3>Three kinds of subdomain</h3>
      <table>
        <tr><th>Type</th><th>What it is</th><th>SkyHop example</th><th>Strategy</th></tr>
        <tr><td><strong>Core</strong></td><td>What makes the company win. Complex, changes often, competitors can't just copy it.</td>
        <td>Dynamic pricing &amp; revenue management; ancillary bundling (a big share of a low-cost carrier's profit)</td>
        <td><strong>Build in-house.</strong> Best people, domain experts in the room, rich domain model.</td></tr>
        <tr><td><strong>Supporting</strong></td><td>Needed and specific to your business, but not a differentiator. Usually simpler.</td>
        <td>Check-in &amp; boarding, flight scheduling tools, crew briefing pages</td>
        <td><strong>Build simply</strong> (CRUD/transaction script is fine) or outsource. Don't gold-plate.</td></tr>
        <tr><td><strong>Generic</strong></td><td>Every company has this problem, it's been solved well.</td>
        <td>Payments, identity/login, email &amp; SMS, accounting</td>
        <td><strong>Buy or use open source.</strong> Wrap it in an adapter so its model doesn't leak into yours.</td></tr>
      </table>

      <h3>How to tell them apart</h3>
      <ul>
        <li><strong>Competitive advantage:</strong> "If we did this 20% better, would customers or profits notice?" Yes → core.</li>
        <li><strong>Off-the-shelf:</strong> "Can we buy a good product for it?" Yes, and it's not our edge → generic.</li>
        <li><strong>Complexity:</strong> core subdomains are usually complex. A complex subdomain is not automatically core
        (accounting is complex and generic).</li>
        <li><strong>Who decides:</strong> classification is a <em>business strategy</em> decision, made with business people,
        not a technical one.</li>
      </ul>

      <h3>It depends on strategy, and it changes</h3>
      <p>Loyalty is core for a premium airline whose frequent flyers pay most of the bills. For an ultra-low-cost
      carrier that competes on price, a basic points scheme is supporting. Disruption rebooking can move from
      supporting to core when the company decides "we recover from storms faster than anyone" is its promise. Revisit
      the classification every year or so.</p>

      <h3>Problem space vs solution space</h3>
      <p>Subdomains describe the <em>business</em> (problem space). Bounded contexts, the next lesson, describe the
      <em>software</em> (solution space). They often line up 1:1, but not always: one legacy system may cover several
      subdomains, and one subdomain may be split over several contexts.</p>

      <div class="warn"><strong>The expensive mistakes:</strong> building your own payment gateway or login system
      (generic) while the pricing engine (core) is a spreadsheet and a cron job. Or buying a product for your core and
      then being unable to innovate because the vendor owns your edge.</div>

      <div class="tip"><strong>In the real world:</strong> teams draw this as a quick "core domain chart" (business
      differentiation on one axis, model complexity on the other) in a workshop with product and leadership. The
      output decides where senior engineers go, what gets bought, and which parts are allowed to stay simple.</div>
    `,
    examples: [
      {
        title: 'Widget: classify SkyHop\'s subdomains',
        lang: 'html',
        editor: false,
        code: `<style>
  .sd { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .sd h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .sd .sub { color:#9aa3b5; margin:0 0 10px; }
  .sd .top { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-bottom:10px; }
  .sd .seg { display:inline-flex; border:1px solid #3a4252; border-radius:6px; overflow:hidden; }
  .sd .seg button { background:#252b36; color:#c9cfdb; border:0; margin:0; border-radius:0; padding:4px 10px; cursor:pointer; font-size:12.5px; }
  .sd .seg button.on { background:#ffd479; color:#1b1f27; }
  .sd .wrap { display:grid; grid-template-columns: 1fr 300px; gap:14px; }
  .sd .card { background:#252b36; border:1px solid #333b4a; border-radius:8px; padding:7px 9px; margin-bottom:6px; }
  .sd .card b { color:#fff; font-size:13.5px; }
  .sd .card .ch { display:flex; gap:4px; margin-top:4px; }
  .sd .card .ch button { flex:1; font-size:12px; padding:2px 0; margin:0; border-radius:5px; border:1px solid #3a4252; background:#1b1f27; color:#c9cfdb; cursor:pointer; }
  .sd .card .ch button.pick-ok { background:#2f5d3d; color:#fff; border-color:#6fdc8c; }
  .sd .card .ch button.pick-no { background:#5d2f2f; color:#fff; border-color:#ff8a80; }
  .sd .card .why { font-size:12.5px; color:#c9cfdb; margin-top:5px; display:none; }
  .sd .card.done .why { display:block; }
  .sd .tag { display:inline-block; font-size:11px; padding:0 6px; border-radius:4px; margin-left:4px; color:#1b1f27; font-weight:600; }
  .sd .t-core { background:#ffb347; } .sd .t-sup { background:#8ab4f8; } .sd .t-gen { background:#b0b8c8; }
  .sd svg { width:100%; height:auto; background:#14171d; border-radius:8px; }
  .sd .btn { background:#2f3644; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:4px 10px; cursor:pointer; font-size:12.5px; margin:0; }
  .sd .score { color:#9aa3b5; font-size:12.5px; }
  @media (max-width: 640px) { .sd .wrap { grid-template-columns: 1fr; } }
</style>
<div class="sd">
  <h3>SkyHop subdomains: core, supporting or generic?</h3>
  <p class="sub">Guess each one (C / S / G). The card explains the answer and the dot lands on the chart. Then flip the
    strategy and watch two of them move.</p>
  <div class="top">
    <span style="color:#c9cfdb;font-size:13px">SkyHop strategy:</span>
    <span class="seg" id="strat"><button data-s="ulcc" class="on">Ultra-low-cost</button><button data-s="premium">Premium service</button></span>
    <button class="btn" id="reveal">Reveal all</button>
    <span class="score" id="score"></span>
  </div>
  <div class="wrap">
    <div id="cards"></div>
    <div>
      <svg viewBox="0 0 300 300" id="chart"></svg>
      <div class="score" style="margin-top:4px">x: business differentiation · y: model complexity</div>
      <div style="margin-top:8px;font-size:12.5px;color:#c9cfdb">
        <span class="tag t-core">CORE</span> build, best people ·
        <span class="tag t-sup">SUPPORTING</span> build simply ·
        <span class="tag t-gen">GENERIC</span> buy
      </div>
    </div>
  </div>
</div>
<script>
  const T = { C: 'core', S: 'sup', G: 'gen' };
  const NAME = { C: 'Core', S: 'Supporting', G: 'Generic' };
  const ITEMS = [
    { id: 'price', name: 'Dynamic pricing & revenue management', x: 9.2, y: 9,
      ulcc: { a: 'C', why: 'Setting the right fare for every seat on every flight is how an airline makes money. Built in-house with revenue analysts; changes weekly.' },
      premium: { a: 'C', why: 'Still core: yield management drives profit for every airline model.' } },
    { id: 'anc', name: 'Ancillaries & bundles (bags, seats, meals)', x: 8.3, y: 6.5,
      ulcc: { a: 'C', why: 'For a low-cost carrier, ancillary revenue is a huge share of profit. Bundle design and pricing is a competitive weapon.' },
      premium: { a: 'S', why: 'A premium carrier includes bags and meals in the fare. Ancillaries become a simple add-on catalogue.' } },
    { id: 'irop', name: 'Disruption rebooking (IROP)', x: 7, y: 8.5,
      ulcc: { a: 'C', why: 'Storms cost millions in compensation, hotels and lost customers. SkyHop decided fast, automatic rebooking is part of its promise, so it treats this as core (it could be supporting at another airline).' },
      premium: { a: 'C', why: 'Premium passengers expect seamless recovery; rebooking quality is part of the product.' } },
    { id: 'loyal', name: 'Loyalty programme', x: 4, y: 5,
      ulcc: { a: 'S', why: 'A simple points scheme. Needed, specific to SkyHop, but nobody picks a low-cost carrier for its loyalty tiers.' },
      premium: { a: 'C', why: 'For a premium airline, frequent flyers are the most valuable customers. Tiers, partner earning and status benefits are a key differentiator.' } },
    { id: 'chk', name: 'Check-in & boarding', x: 3.5, y: 4,
      ulcc: { a: 'S', why: 'Must work and has airline-specific rules (check-in window, bag drop), but it is not why people fly SkyHop. Build simply, or buy an airline departure-control system and adapt.' },
      premium: { a: 'S', why: 'Same: necessary, airline-specific, not the differentiator.' } },
    { id: 'sched', name: 'Flight scheduling tools', x: 3, y: 6,
      ulcc: { a: 'S', why: 'Specific to airlines and fairly complex, but planners mostly need solid tooling, not innovation. Supporting.' },
      premium: { a: 'S', why: 'Supporting in both models.' } },
    { id: 'pay', name: 'Card payments', x: 1.2, y: 6.5,
      ulcc: { a: 'G', why: 'Every online business takes payments. Use a payment provider; PCI compliance alone is a reason not to build it.' },
      premium: { a: 'G', why: 'Generic everywhere.' } },
    { id: 'idp', name: 'Identity & login', x: 0.8, y: 5,
      ulcc: { a: 'G', why: 'Sign-up, MFA, password reset: solved problems. Buy an identity provider.' },
      premium: { a: 'G', why: 'Generic everywhere.' } },
    { id: 'mail', name: 'Email & SMS delivery', x: 0.9, y: 2.2,
      ulcc: { a: 'G', why: 'Deliverability is hard and generic. Use a provider. What to send and when is decided by your own contexts.' },
      premium: { a: 'G', why: 'Generic everywhere.' } },
    { id: 'acct', name: 'General ledger & accounting', x: 1.8, y: 8,
      ulcc: { a: 'G', why: 'Complex, but generic: every company does it, by the same accounting rules. Buy an ERP. Complex does not mean core.' },
      premium: { a: 'G', why: 'Generic everywhere.' } },
  ];
  let strat = 'ulcc';
  const picks = {};
  const $ = (id) => document.getElementById(id);

  function render() {
    let right = 0, done = 0;
    $('cards').innerHTML = ITEMS.map((it) => {
      const ans = it[strat];
      const p = picks[it.id];
      if (p) { done++; if (p === ans.a) right++; }
      const btn = (k) => '<button data-id="' + it.id + '" data-k="' + k + '" class="' +
        (p === k ? (k === ans.a ? 'pick-ok' : 'pick-no') : (p && k === ans.a ? 'pick-ok' : '')) + '">' + NAME[k] + '</button>';
      return '<div class="card ' + (p ? 'done' : '') + '"><b>' + it.name + '</b>' +
        (p ? '<span class="tag t-' + T[ans.a] + '">' + NAME[ans.a].toUpperCase() + '</span>' : '') +
        '<div class="ch">' + btn('C') + btn('S') + btn('G') + '</div>' +
        '<div class="why">' + (p && p !== ans.a ? '✗ ' : '✓ ') + ans.why + '</div></div>';
    }).join('');
    $('score').textContent = done ? right + ' / ' + done + ' right' : '';
    const col = { C: '#ffb347', S: '#8ab4f8', G: '#b0b8c8' };
    let svg = '<rect x="150" y="0" width="150" height="150" fill="#ffb347" opacity="0.08"/>' +
      '<line x1="20" y1="280" x2="295" y2="280" stroke="#3a4252"/><line x1="20" y1="280" x2="20" y2="5" stroke="#3a4252"/>' +
      '<text x="225" y="18" fill="#ffb347" font-size="11" text-anchor="middle">core zone</text>' +
      '<text x="290" y="295" fill="#9aa3b5" font-size="10" text-anchor="end">differentiation →</text>' +
      '<text x="6" y="12" fill="#9aa3b5" font-size="10">complexity ↑</text>';
    for (const it of ITEMS) {
      if (!picks[it.id]) continue;
      const cx = 20 + it.x * 27, cy = 280 - it.y * 28;
      const a = it[strat].a;
      svg += '<circle cx="' + cx + '" cy="' + cy + '" r="7" fill="' + col[a] + '"/>' +
        '<text x="' + (cx + (it.x > 6 ? -10 : 10)) + '" y="' + (cy + 4) + '" fill="#e6e6e6" font-size="10" text-anchor="' + (it.x > 6 ? 'end' : 'start') + '">' + it.name.split(' (')[0].split(' &')[0] + '</text>';
    }
    $('chart').innerHTML = svg;
  }

  $('cards').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    picks[b.dataset.id] = b.dataset.k;
    render();
  });
  $('strat').addEventListener('click', (e) => {
    const s = e.target.dataset.s;
    if (!s) return;
    strat = s;
    for (const b of $('strat').children) b.classList.toggle('on', b.dataset.s === s);
    render();
  });
  $('reveal').onclick = () => { for (const it of ITEMS) if (!picks[it.id]) picks[it.id] = it[strat].a; render(); };
  render();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop\'s CTO wants a team to build an in-house payment gateway "to save on provider fees". Revenue management is still adjusting fares with spreadsheets. What does subdomain thinking say?',
        options: [
          'Good idea, payments are critical so they are core',
          'Payments are generic: buy them. Put the strong team on pricing, which is core',
          'Build both at once with half the team each',
          'Outsource pricing to a vendor, it is just math',
        ],
        answer: 1,
        why: 'Critical is not the same as core. Payments must work, but they don\'t differentiate SkyHop. Pricing does, and it is under-invested.',
      },
      {
        q: 'Accounting at SkyHop has hundreds of complex rules. Is it therefore a core subdomain?',
        options: [
          'Yes, complexity defines core',
          'No: it is complex but generic (same rules for every company), so buy an ERP',
          'Yes, because finance is important',
          'It is supporting because it isn\'t customer-facing',
        ],
        answer: 1,
        why: 'Core is about competitive advantage, not complexity. Accounting is complex and generic.',
      },
      {
        q: 'SkyHop is acquired by a premium carrier whose business depends on frequent flyers. What likely happens to the Loyalty subdomain?',
        options: [
          'Nothing, classifications never change',
          'It becomes generic and should be bought',
          'It likely moves from supporting to core, and deserves more investment and a richer model',
          'It should be merged into Booking',
        ],
        answer: 2,
        why: 'Classification follows business strategy. When loyalty becomes a key differentiator, it becomes core.',
      },
      {
        q: 'The check-in team asks for a rich, event-sourced domain model for printing boarding passes. Check-in is supporting at SkyHop. What is a reasonable answer?',
        options: [
          'Yes, every part deserves the same investment',
          'Keep it simple: a straightforward implementation (or a bought DCS) is fine; spend the modelling effort on core areas',
          'No, check-in should be deleted',
          'Use microservices for each boarding pass type',
        ],
        answer: 1,
        why: 'Supporting subdomains need to work reliably, not to be elegant. Save the expensive patterns for where they create advantage.',
      },
    ],
    exercise: {
      lang: 'html',
      editor: false,
      task: `<p><strong>ShopLane</strong> is an online shop that wins customers with one promise: <em>order by 2pm,
      get it today</em>. Classify each ShopLane subdomain in the box below and click <strong>Check</strong>.</p>`,
      starter: `<style>
  .sx { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .sx h3 { margin:0 0 8px; font-size:16px; color:#fff; }
  .sx .row { display:grid; grid-template-columns: 1fr 190px; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid #2a303c; }
  .sx .row b { color:#fff; }
  .sx .row small { color:#9aa3b5; display:block; }
  .sx select { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:5px; width:100%; }
  .sx .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:6px 14px; cursor:pointer; margin-top:10px; }
  .sx .fb { margin-top:4px; font-size:12.5px; }
  .sx .ok { color:#6fdc8c; } .sx .no { color:#ff8a80; }
  .sx #sum { margin-top:10px; font-weight:600; }
  @media (max-width: 560px) { .sx .row { grid-template-columns: 1fr; } }
</style>
<div class="sx">
  <h3>ShopLane: core, supporting or generic?</h3>
  <div id="rows"></div>
  <button class="btn" id="check">Check</button>
  <div id="sum"></div>
</div>
<script>
  const PRESET = {};
  const OPTS = ['— choose —', 'Core', 'Supporting', 'Generic'];
  const ITEMS = [
    { id: 'promise', name: 'Same-day delivery promise', desc: 'Decides per cart and address whether "today" can be promised, using stock, courier capacity and cut-offs.', ans: 1,
      why: 'This is the promise customers choose ShopLane for. Complex, changing, a competitive edge: core.' },
    { id: 'pay', name: 'Card payments', desc: 'Authorise, capture and refund card payments.', ans: 3,
      why: 'Every shop needs it; providers do it better. Generic: buy.' },
    { id: 'returns', name: 'Returns handling', desc: 'Return labels, inspection outcome, trigger refund. ShopLane-specific rules but nothing customers choose it for.', ans: 2,
      why: 'Specific to ShopLane and needed, but not the differentiator. Supporting: build simply.' },
    { id: 'tax', name: 'Sales tax calculation', desc: 'Correct tax per region and product category.', ans: 3,
      why: 'Complex but identical for every shop. Generic: use a tax service. Complexity is not the same as core.' },
    { id: 'slot', name: 'Courier slot allocation', desc: 'Assigns orders to couriers so same-day deliveries actually arrive before 10pm.', ans: 1,
      why: 'Without it the same-day promise fails. It is part of the competitive edge: core.' },
    { id: 'catalog', name: 'Product catalogue admin', desc: 'Staff edit product titles, photos and categories.', ans: 2,
      why: 'Needed and ShopLane-specific in shape, but mostly CRUD. Supporting.' },
    { id: 'support', name: 'Customer support ticketing', desc: 'Inbox, tickets, SLAs for the support team.', ans: 3,
      why: 'A solved problem with many good products. Generic: buy a help-desk tool.' },
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
        fb.innerHTML = '<span class="no">✗ ' + it.why + '</span>';
      }
    }
    document.getElementById('sum').innerHTML = right === ITEMS.length
      ? '<span class="ok">✅ All ' + right + ' correct. Two cores, both serving the same-day promise.</span>'
      : '<span class="no">' + right + ' / ' + ITEMS.length + ' correct.</span>';
  };
</script>`,
      hint: 'Ask "is this part of the same-day promise?" (core), "can we buy a good product and is it not our edge?" (generic), otherwise supporting.',
      solution: '__SOLUTION__',
    },
  },

  // ───────────────────────────────────────────────────────────── bounded-contexts
  {
    id: 'bounded-contexts',
    section: 'Strategic Design',
    title: 'Bounded contexts: same word, different meaning',
    explain: `
      <p>Ask four SkyHop teams "what is a <em>passenger</em>?" and "what is a <em>flight</em>?":</p>
      <table>
        <tr><th>Context</th><th>"Passenger" means…</th><th>"Flight" means…</th></tr>
        <tr><td><strong>Booking</strong></td><td>A named traveller on a PNR: name, date of birth, contact details</td>
        <td>A sellable product: <code>SH123</code> on 2 Nov, SYD→MEL, with fares</td></tr>
        <tr><td><strong>Check-in &amp; Boarding</strong></td><td>A person at the airport: passport (APIS data), seat, bags,
        checked-in / boarded status</td><td>A departure with a gate, a boarding time and a passenger list</td></tr>
        <tr><td><strong>Loyalty</strong></td><td>They don't say passenger. They say <em>member</em>: tier, points,
        "status"</td><td>An activity that earns points (distance, fare class)</td></tr>
        <tr><td><strong>Flight Ops</strong></td><td>Mostly a count and a weight (for load &amp; balance)</td>
        <td>A physical aircraft movement: tail number, crew, fuel, actual off-block time, one or more legs</td></tr>
      </table>
      <p>None of them is wrong. Each definition is <em>precise and useful</em> for that team's job. The mistake is
      trying to merge them into one company-wide <code>Passenger</code> class.</p>

      <h3>Definition</h3>
      <p>A <strong>bounded context</strong> is a boundary inside which one model and one ubiquitous language apply
      consistently. Inside it, "passenger" means exactly one thing. Outside it, the word may mean something else,
      and that's fine. Contexts talk to each other through explicit contracts (APIs, events) and translate at the
      border, usually joined by an <strong>id</strong>, not by sharing objects.</p>

      <h3>What a bounded context is not</h3>
      <ul>
        <li><strong>Not necessarily a microservice.</strong> It can be a module in a monolith with its own folder,
        its own tables (or schema) and a public interface. One microservice should not span several contexts;
        one context may be several deployables.</li>
        <li><strong>Not a subdomain.</strong> A subdomain is part of the business (problem); a bounded context is part
        of the software (solution). Often 1:1, not always.</li>
        <li><strong>Not one per entity.</strong> A "Passenger service" and a "Flight service" are entity services, not
        bounded contexts. Contexts are cut by meaning and capability.</li>
      </ul>

      <h3>Why it matters</h3>
      <ul>
        <li><strong>Autonomy:</strong> Loyalty can rename "status" or add a tier without a meeting with Check-in.</li>
        <li><strong>Smaller models:</strong> each team understands its whole model.</li>
        <li><strong>Ownership:</strong> one team owns one context (a team may own several).</li>
      </ul>

      <div class="warn">"Let's have one canonical Customer model for the whole enterprise" is the most common way to
      build a god-object. It ends up with every field anyone ever needed, no clear owner, and every change needing
      sign-off from five teams.</div>

      <div class="tip"><strong>In the real world:</strong> you will often see the same id (e.g. <code>PAX-0001</code>)
      in several contexts with different data attached. Duplicated data (like a name copied into Check-in) is
      normal and intentional: each context keeps the version it needs, updated by events. Many teams start with
      a modular monolith (one deployable, strict module boundaries) and only split into services when a context
      needs to scale or deploy independently.</div>
    `,
    examples: [
      {
        title: 'One shared Passenger class: 40 fields and a word collision',
        code: `// The "canonical" Passenger, shared by Booking, Check-in, Loyalty and Flight Ops.
class Passenger {
  constructor(id, firstName, lastName) {
    Object.assign(this, {
      id, firstName, lastName, title: null, dateOfBirth: null, gender: null,
      email: null, phone: null, address: null, nationality: null,
      // Booking
      pnr: null, fareClass: null, fareBasis: null, ticketNumber: null, paidAmount: 0,
      currency: 'AUD', bookingChannel: null, promoCode: null, insurance: false,
      // Check-in & Boarding
      passportNumber: null, passportExpiry: null, apisSubmitted: false, seat: null,
      bags: [], boardingGroup: null, sequenceNumber: null, status: 'BOOKED',
      // Loyalty
      memberNumber: null, tier: null, points: 0, statusCredits: 0, memberSince: null,
      // Flight Ops
      specialAssistance: null, mealCode: null, weightCategory: 'ADULT', wheelchair: false,
      // ...added later by someone
      flag2: false, legacyId: null, loungeAccess: false, preferredLanguage: null,
    });
  }
}

const ana = new Passenger('PAX-0001', 'Ana', 'Silva');
console.log('fields on Passenger:', Object.keys(ana).length);

// ① Check-in context: online check-in succeeds
ana.passportNumber = 'PA1234567';
ana.apisSubmitted = true;
ana.seat = '14C';
ana.status = 'CHECKED_IN';
console.log('check-in sets status =', ana.status);

// ② Check-in needs APIS names in uppercase for border control
ana.firstName = ana.firstName.toUpperCase();
ana.lastName = ana.lastName.toUpperCase();

// ③ Loyalty context, nightly job. In loyalty language, "status" = tier!
ana.memberNumber = 'SH-778812';
ana.status = 'GOLD';
console.log('loyalty sets status =', ana.status);

// ④ Gate (Check-in & Boarding) scans the boarding pass
function gateScan(p) {
  if (p.status !== 'CHECKED_IN') {
    return 'DENIED: ' + p.firstName + ' is not checked in (status=' + p.status + ')';
  }
  return 'BOARDED: ' + p.firstName;
}
console.log('gate:', gateScan(ana));

// ⑤ Loyalty sends a welcome-to-Gold email
console.log('loyalty email: "Dear ' + ana.firstName + ', welcome to Gold!"');

const usedByCheckIn = ['id', 'firstName', 'lastName', 'passportNumber', 'apisSubmitted',
  'seat', 'bags', 'boardingGroup', 'status'];
console.log('fields check-in actually needs:', usedByCheckIn.length, 'of', Object.keys(ana).length);`,
        explain: `
          <details>
            <summary>The problem: one word, two meanings, one field</summary>
            <p>In Check-in, <em>status</em> means "has this person checked in / boarded?". In Loyalty, <em>status</em> is
            what airlines call the membership tier ("Gold status"). Both teams are using their own ubiquitous language
            correctly. The shared class forces both meanings into one field.</p>
            <table>
              <tr><th>Step</th><th>Who</th><th><code>status</code></th><th><code>firstName</code></th><th>Console</th></tr>
              <tr><td>start</td><td></td><td><code>'BOOKED'</code></td><td><code>'Ana'</code></td><td><code>fields on Passenger: 40</code></td></tr>
              <tr><td>①</td><td>Check-in</td><td><code>'CHECKED_IN'</code></td><td><code>'Ana'</code></td><td><code>check-in sets status = CHECKED_IN</code></td></tr>
              <tr><td>②</td><td>Check-in (APIS)</td><td><code>'CHECKED_IN'</code></td><td><code>'ANA'</code></td><td></td></tr>
              <tr><td>③</td><td>Loyalty job</td><td><strong><code>'GOLD'</code></strong></td><td><code>'ANA'</code></td><td><code>loyalty sets status = GOLD</code></td></tr>
              <tr><td>④</td><td>Gate</td><td><code>'GOLD'</code></td><td></td><td><code>gate: DENIED: ANA is not checked in (status=GOLD)</code></td></tr>
              <tr><td>⑤</td><td>Loyalty email</td><td></td><td><code>'ANA'</code></td><td><code>loyalty email: "Dear ANA, welcome to Gold!"</code></td></tr>
            </table>
            <p>Ana just became a Gold member and got <strong>denied boarding</strong> by the same act, plus an email that
            shouts at her. No team made a mistake in its own terms. The model did.</p>
          </details>
          <details>
            <summary>Why the "obvious" fixes don't work</summary>
            <ul>
              <li><strong>"Rename it <code>loyaltyStatus</code>."</strong> Fixes this collision. The next one is
              <code>firstName</code> (APIS uppercase vs display name), then <code>seat</code> (Booking's <em>purchased</em>
              seat vs Check-in's <em>assigned</em> seat after an aircraft swap)… The class keeps growing, and every
              rename needs four teams to agree.</li>
              <li><strong>"Add an owner comment per field."</strong> Nothing stops a write from another team, and
              nobody owns the class as a whole.</li>
              <li><strong>"Freeze the class, changes go through an architecture board."</strong> Now every feature waits for a meeting.</li>
            </ul>
            <p>The console's last line is the real smell: <code>fields check-in actually needs: 9 of 40</code>. Every
            team carries 30+ fields it doesn't understand.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Move step ③ above step ①. Now the gate lets Ana board, but Loyalty's tier is overwritten with
              <code>CHECKED_IN</code>. The bug depends on job timing: exactly the kind that appears only in production.</li>
              <li>Search the class for fields you can't explain (<code>flag2</code>, <code>legacyId</code>). In real
              shared models, that list is long.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Three small models, joined by id, translated by events',
        code: `// Each context owns a SMALL model in its own language. They share only ids.

// ---------- Booking context ----------
class Traveller {
  constructor(passengerId, givenName, familyName, dateOfBirth) {
    Object.assign(this, { passengerId, givenName, familyName, dateOfBirth });
    Object.freeze(this);
  }
}

// ---------- Check-in & Boarding context ----------
class CheckInPassenger {
  #status = 'NOT_CHECKED_IN'; // check-in language: NOT_CHECKED_IN → CHECKED_IN → BOARDED

  constructor(passengerId, apisName) {
    this.passengerId = passengerId;
    this.apisName = apisName; // 'SILVA/ANA' as border control wants it
    this.seat = null;
  }

  get status() {
    return this.#status;
  }

  checkIn(seat) {
    this.seat = seat;
    this.#status = 'CHECKED_IN';
  }

  board() {
    if (this.#status !== 'CHECKED_IN') return 'DENIED: ' + this.apisName + ' is ' + this.#status;
    this.#status = 'BOARDED';
    return 'BOARDED: ' + this.apisName;
  }
}

// ---------- Loyalty context ----------
class Member {
  constructor(memberNumber, displayName) {
    this.memberNumber = memberNumber;
    this.displayName = displayName;
    this.status = 'BLUE'; // loyalty language: status = tier. Safe here!
    this.points = 0;
  }

  earn(points) {
    this.points += points;
    if (this.points >= 1000) this.status = 'GOLD';
  }
}

// ---------- integration: a tiny event bus ----------
const handlers = {};
const on = (type, fn) => (handlers[type] = [...(handlers[type] || []), fn]);
const publish = (e) => (handlers[e.type] || []).forEach((fn) => fn(e));

const checkInDb = new Map(); // passengerId → CheckInPassenger
const loyaltyDb = new Map(); // memberNumber → Member
const memberByPassenger = new Map(); // passengerId → memberNumber (Loyalty's own link)

// Check-in translates Booking's event into ITS model
on('BookingConfirmed', (e) => {
  const apis = (e.familyName + '/' + e.givenName).toUpperCase();
  checkInDb.set(e.passengerId, new CheckInPassenger(e.passengerId, apis));
});

// Loyalty keeps only what it needs
on('BookingConfirmed', (e) => {
  if (!e.memberNumber) return;
  memberByPassenger.set(e.passengerId, e.memberNumber);
  if (!loyaltyDb.has(e.memberNumber)) {
    loyaltyDb.set(e.memberNumber, new Member(e.memberNumber, e.givenName));
  }
});

on('PassengerBoarded', (e) => {
  const m = loyaltyDb.get(memberByPassenger.get(e.passengerId));
  if (m) m.earn(1200);
});

// ---------- the same story as before ----------
const ana = new Traveller('PAX-0001', 'Ana', 'Silva', '1990-04-12');
publish({ type: 'BookingConfirmed', pnr: 'X7K2PQ', memberNumber: 'SH-778812', ...ana });

const cip = checkInDb.get('PAX-0001');
cip.checkIn('14C');
console.log('check-in:', cip.apisName, cip.status, cip.seat);

const member = loyaltyDb.get('SH-778812');
member.status = 'GOLD'; // loyalty upgrades her. Check-in is unaffected.
console.log('loyalty:', member.memberNumber, member.status);

console.log('gate:', cip.board());
publish({ type: 'PassengerBoarded', passengerId: 'PAX-0001', flight: 'SH123' });

console.log('loyalty email: "Dear ' + member.displayName + ', welcome to Gold!"');
console.log('points after flight:', member.points);
console.log('field counts → Traveller:', Object.keys(ana).length,
  '| CheckInPassenger:', Object.keys(cip).length + 1,
  '| Member:', Object.keys(member).length);`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>class CheckInPassenger { #status = 'NOT_CHECKED_IN'; … }   // ① check-in's own "status"
class Member { this.status = 'BLUE'; … }                   // ② loyalty's own "status"
on('BookingConfirmed', (e) =&gt; { … new CheckInPassenger(e.passengerId, apis) }) // ③ translate at the border
memberByPassenger.set(e.passengerId, e.memberNumber)       // ④ join by id, not by object</code></pre>
            <ol>
              <li><strong>①②</strong> The word <em>status</em> exists twice, with two meanings, in two classes. No collision is
              possible: they're different objects owned by different contexts.</li>
              <li><strong>③</strong> Check-in doesn't reuse Booking's <code>Traveller</code>. It reacts to
              <code>BookingConfirmed</code> and builds its own model, including the uppercase APIS name it needs.
              Booking's <code>givenName</code> stays <code>'Ana'</code>.</li>
              <li><strong>④</strong> Loyalty stores its own link from <code>passengerId</code> to <code>memberNumber</code>.
              Contexts refer to each other by id, never by holding each other's objects.</li>
            </ol>
          </details>
          <details>
            <summary>Step by step: the same story, no bugs</summary>
            <table>
              <tr><th>Step</th><th>What happens</th><th>Console</th></tr>
              <tr><td>1</td><td>Booking publishes <code>BookingConfirmed</code>. Check-in creates <code>CheckInPassenger('PAX-0001', 'SILVA/ANA')</code>. Loyalty creates <code>Member('SH-778812', 'Ana')</code>.</td><td></td></tr>
              <tr><td>2</td><td>Online check-in</td><td><code>check-in: SILVA/ANA CHECKED_IN 14C</code></td></tr>
              <tr><td>3</td><td>Loyalty sets <em>its</em> status</td><td><code>loyalty: SH-778812 GOLD</code></td></tr>
              <tr><td>4</td><td>Gate reads <em>check-in's</em> status</td><td><code>gate: BOARDED: SILVA/ANA</code></td></tr>
              <tr><td>5</td><td><code>PassengerBoarded</code> → Loyalty earns 1200 points</td><td><code>loyalty email: "Dear Ana, welcome to Gold!"</code><br><code>points after flight: 1200</code></td></tr>
              <tr><td>6</td><td>Model sizes</td><td><code>field counts → Traveller: 4 | CheckInPassenger: 4 | Member: 4</code></td></tr>
            </table>
            <p>(<code>CheckInPassenger</code> shows 3 public keys + the private <code>#status</code>, hence <code>+ 1</code>.)
            Three models of 4 fields each instead of one of 40, and each team can change its own without asking the others.</p>
          </details>
          <details>
            <summary>Try this / common mistake</summary>
            <ul>
              <li>Comment out <code>cip.checkIn('14C')</code>. The gate now says <code>DENIED: SILVA/ANA is NOT_CHECKED_IN</code>,
              for the right reason, regardless of what Loyalty does.</li>
              <li>Rename Loyalty's <code>status</code> to <code>tier</code>. Only Loyalty code changes. That's autonomy.</li>
            </ul>
            <div class="warn">Don't "fix" duplication by having Check-in <code>import</code> Booking's <code>Traveller</code>
            class. That re-couples the contexts. Copying the 2-3 fields you need, via an event or API, is the point.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Flight Ops wants a <code>tailNumber</code> and <code>crew</code> on "the Flight". Booking\'s Flight class is already used for fare search. What should they do?',
        options: [
          'Add <code>tailNumber</code> and <code>crew</code> to Booking\'s Flight class',
          'Create their own flight model in the Flight Ops context, linked to Booking\'s by flight number + date',
          'Store crew in the fare table',
          'Ask Booking to own crew data',
        ],
        answer: 1,
        why: '"Flight" means a sellable product in Booking and an aircraft movement in Ops. Separate models, joined by an identifier.',
      },
      {
        q: 'Check-in needs the passenger\'s name. Which approach respects bounded contexts?',
        options: [
          'Import Booking\'s <code>Traveller</code> class and its database table',
          'Read Booking\'s tables directly with a SQL join',
          'Receive the name via a <code>BookingConfirmed</code> event (or Booking\'s API) and store the copy Check-in needs, in its own format',
          'Ask the passenger to type their name again',
        ],
        answer: 2,
        why: 'Contexts talk through explicit contracts and keep their own copies. Sharing classes or tables couples them back together.',
      },
      {
        q: 'An architect proposes one microservice per bounded context, so SkyHop must split its monolith into 9 services before using bounded contexts. Is that required?',
        options: [
          'Yes, a bounded context is a microservice',
          'No: a bounded context can be a well-isolated module inside a monolith; deployment is a separate decision',
          'Yes, but only for core contexts',
          'No, bounded contexts are only documentation',
        ],
        answer: 1,
        why: 'A bounded context is a linguistic and model boundary. A modular monolith can enforce it with module boundaries and separate schemas.',
      },
      {
        q: 'In Loyalty, "status" means tier. In Check-in, "status" means checked-in/boarded. How should SkyHop resolve this?',
        options: [
          'Force everyone to use "tier" and "boardingState" company-wide',
          'Let each context keep its own meaning; the word is unambiguous inside each boundary',
          'Use a numeric status code shared by both',
          'Merge Loyalty into Check-in',
        ],
        answer: 1,
        why: 'Ubiquitous language is per context. The conflict only exists if both meanings share one model.',
      },
    ],
    exercise: {
      task: `<p>SkyHop's shared "god" flight record is used by Booking and Flight Ops. Split it.</p>
      <ul>
        <li><code>toBookingFlight(raw)</code> returns exactly <code>{ flightNumber, date, origin, destination, departure }</code>,
        where <code>departure</code> is the <strong>scheduled</strong> time (what was sold).</li>
        <li><code>toOpsFlight(raw)</code> returns exactly <code>{ flightNumber, date, tailNumber, crew, departure }</code>,
        where <code>departure</code> is the <strong>estimated</strong> time (what ops is working to), and
        <code>crew</code> is a <em>copy</em>, so changing it doesn't change anyone else's data.</li>
      </ul>
      <p>Same word "departure", two meanings: that's the bounded context at work.</p>`,
      starter: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const raw = {
  flightNumber: 'SH123', date: '2026-11-02', origin: 'SYD', destination: 'MEL',
  scheduledDeparture: '07:15', estimatedDeparture: '07:55',
  tailNumber: 'VH-SKH', crew: ['CPT Ng', 'FO Patel', 'CC Rossi'],
  fareBuckets: { Y: 12, M: 30, Q: 0 }, gate: 'D7', fuelKg: 7800, mealService: false,
};

function toBookingFlight(raw) {
  return raw; // TODO: only what Booking needs
}

function toOpsFlight(raw) {
  return raw; // TODO: only what Flight Ops needs
}

const b = toBookingFlight(raw);
const o = toOpsFlight(raw);

check('booking keys', Object.keys(b), ['flightNumber', 'date', 'origin', 'destination', 'departure']);
check('ops keys', Object.keys(o), ['flightNumber', 'date', 'tailNumber', 'crew', 'departure']);
check('booking departure = scheduled', b.departure, '07:15');
check('ops departure = estimated', o.departure, '07:55');

o.crew.push('CC Kaur');
check('ops crew change does not leak into raw', raw.crew.length, 3);`,
      hint: 'Build new objects with only the listed keys, in that order. For the crew, copy the array: [...raw.crew].',
      solution: `function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
}

const raw = {
  flightNumber: 'SH123', date: '2026-11-02', origin: 'SYD', destination: 'MEL',
  scheduledDeparture: '07:15', estimatedDeparture: '07:55',
  tailNumber: 'VH-SKH', crew: ['CPT Ng', 'FO Patel', 'CC Rossi'],
  fareBuckets: { Y: 12, M: 30, Q: 0 }, gate: 'D7', fuelKg: 7800, mealService: false,
};

// Booking: a flight is a product that was sold at a scheduled time.
function toBookingFlight(raw) {
  return {
    flightNumber: raw.flightNumber,
    date: raw.date,
    origin: raw.origin,
    destination: raw.destination,
    departure: raw.scheduledDeparture,
  };
}

// Flight Ops: a flight is an aircraft movement with a crew, working to the estimated time.
function toOpsFlight(raw) {
  return {
    flightNumber: raw.flightNumber,
    date: raw.date,
    tailNumber: raw.tailNumber,
    crew: [...raw.crew],
    departure: raw.estimatedDeparture,
  };
}

const b = toBookingFlight(raw);
const o = toOpsFlight(raw);

check('booking keys', Object.keys(b), ['flightNumber', 'date', 'origin', 'destination', 'departure']);
check('ops keys', Object.keys(o), ['flightNumber', 'date', 'tailNumber', 'crew', 'departure']);
check('booking departure = scheduled', b.departure, '07:15');
check('ops departure = estimated', o.departure, '07:55');

o.crew.push('CC Kaur');
check('ops crew change does not leak into raw', raw.crew.length, 3);`,
    },
  },

  // ───────────────────────────────────────────────────────────── context-mapping
  {
    id: 'context-mapping',
    section: 'Strategic Design',
    title: 'Context maps & relationship patterns',
    explain: `
      <p>Bounded contexts don't live alone. Booking needs prices from Pricing, seats from Inventory, money from
      Payments. A <strong>context map</strong> is a drawing of the contexts and, more importantly, the
      <em>relationship</em> on each line: who depends on whom, and who adapts to whom. It describes politics and
      team dynamics as much as technology.</p>

      <h3>Upstream and downstream</h3>
      <p>If changes in A affect B, A is <strong>upstream (U)</strong> and B is <strong>downstream (D)</strong>, like a
      river. Pricing is upstream of Booking: if Pricing changes its fare format, Booking feels it. The question for
      every line is: <em>how much power does the downstream have over the upstream?</em></p>

      <h3>The patterns</h3>
      <table>
        <tr><th>Pattern</th><th>Relationship</th><th>Typical use</th></tr>
        <tr><td><strong>Partnership</strong></td><td>Two teams succeed or fail together, plan and release in sync</td><td>Two tightly linked core contexts</td></tr>
        <tr><td><strong>Shared Kernel</strong></td><td>A small piece of model/code shared and co-owned by two teams</td><td>Shared value objects (PNR, PassengerName). Keep it tiny.</td></tr>
        <tr><td><strong>Customer / Supplier</strong></td><td>Upstream (supplier) plans work for downstream (customer) needs</td><td>Internal teams with a negotiated API</td></tr>
        <tr><td><strong>Conformist</strong></td><td>Downstream just adopts the upstream's model; no leverage, no translation</td><td>A big external provider whose model is good enough</td></tr>
        <tr><td><strong>Anticorruption Layer (ACL)</strong></td><td>Downstream builds a translation layer to protect its model</td><td>Legacy systems, messy external APIs</td></tr>
        <tr><td><strong>Open Host Service (OHS)</strong></td><td>Upstream offers one well-defined public API for everyone</td><td>Many consumers; stop building custom endpoints</td></tr>
        <tr><td><strong>Published Language (PL)</strong></td><td>A documented shared format (schema, event contract, industry standard)</td><td>Usually paired with OHS</td></tr>
        <tr><td><strong>Separate Ways</strong></td><td>No integration at all; duplicate the small thing you need</td><td>Integration costs more than it's worth</td></tr>
      </table>
      <p>(And the honest one: <strong>Big Ball of Mud</strong>, a part with no clear boundaries. Draw it on the map so
      everyone knows to put an ACL around it.)</p>

      <h3>Picking a pattern</h3>
      <ul>
        <li>Can you influence the upstream? No → Conformist or ACL. Yes → Customer/Supplier or Partnership.</li>
        <li>Is the upstream's model good enough for you? Yes → Conformist is cheap. No → ACL.</li>
        <li>Does the upstream have many consumers? → it should offer an OHS with a Published Language.</li>
        <li>Is the shared thing tiny and stable? → maybe Shared Kernel. Otherwise, duplicate it.</li>
      </ul>

      <div class="tip"><strong>In the real world:</strong> context maps are drawn on a whiteboard first, then kept
      as a living diagram in the architecture docs. The most valuable moment is when someone points at a line and
      says "wait, we're Conformist to <em>that</em>?" Relationships drift as teams and vendors change, so revisit the
      map when org charts change.</div>
    `,
    examples: [
      {
        title: 'Widget: SkyHop context map (click the lines)',
        lang: 'html',
        editor: false,
        code: `<style>
  .cm { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .cm h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .cm .sub { color:#9aa3b5; margin:0 0 8px; }
  .cm svg { width:100%; height:auto; background:#14171d; border-radius:8px; display:block; }
  .cm .edge { cursor:pointer; }
  .cm .edge .hit { stroke:transparent; stroke-width:16; fill:none; }
  .cm .edge .ln { stroke:#5b6478; stroke-width:2; fill:none; }
  .cm .edge:hover .ln { stroke:#c9cfdb; }
  .cm .edge.on .ln { stroke:#ffd479; stroke-width:3.5; }
  .cm .edge.dim { opacity:0.25; }
  .cm .node rect { stroke-width:1.5; }
  .cm .node { cursor:pointer; }
  .cm .legend { display:flex; flex-wrap:wrap; gap:5px; margin:8px 0; }
  .cm .legend button { background:#252b36; color:#c9cfdb; border:1px solid #3a4252; border-radius:999px; padding:2px 10px; font-size:12px; cursor:pointer; margin:0; }
  .cm .legend button.on { background:#ffd479; color:#1b1f27; border-color:#ffd479; }
  .cm .panel { background:#252b36; border-radius:8px; padding:10px 12px; min-height:120px; }
  .cm .panel h4 { margin:0 0 4px; color:#ffd479; font-size:15px; }
  .cm .panel .ud { color:#9aa3b5; font-size:12.5px; margin-bottom:6px; }
  .cm .panel p { margin:4px 0; }
  .cm .panel code { background:#14171d; color:#ffd479; padding:1px 5px; border-radius:4px; font-size:12px; }
  .cm .panel .k { color:#9aa3b5; }
</style>
<div class="cm">
  <h3>SkyHop context map</h3>
  <p class="sub">Click a line (or its badge) to see the relationship. Click a pattern below to highlight where it is used. U = upstream, D = downstream.</p>
  <svg viewBox="0 0 760 510" id="map"></svg>
  <div class="legend" id="legend"></div>
  <div class="panel" id="panel"></div>
</div>
<script>
  const NODES = {
    legacy: { x: 110, y: 50, label: 'Legacy Reservation', sub: 'mainframe (big ball of mud)', ext: true,
      info: 'The 1990s reservation mainframe. Still the system of record for PNRs. Nobody can change its data model.' },
    payprov: { x: 650, y: 50, label: 'PayFlow', sub: 'external payment provider', ext: true,
      info: 'A large external payment provider used by thousands of merchants. SkyHop has no influence on its API.' },
    inventory: { x: 110, y: 175, label: 'Inventory', sub: 'seats & fare buckets · core',
      info: 'How many seats are left in each fare bucket, holds, authorised levels.' },
    booking: { x: 380, y: 175, label: 'Booking', sub: 'PNR, itinerary · core',
      info: 'Creates and changes bookings. The busiest context on the map.' },
    payments: { x: 650, y: 175, label: 'Payments', sub: 'generic (thin wrapper)',
      info: 'SkyHop\\'s small payments context: wraps PayFlow, keeps a record of charges and refunds.' },
    pricing: { x: 110, y: 300, label: 'Pricing', sub: 'fares & ancillaries · core',
      info: 'Fare rules, dynamic pricing, bag and seat prices.' },
    checkin: { x: 380, y: 300, label: 'Check-in & Boarding', sub: 'supporting',
      info: 'Online check-in, boarding passes, gate scanning.' },
    notif: { x: 650, y: 300, label: 'Notifications', sub: 'generic',
      info: 'Sends emails, SMS and push through bought providers. Templates and delivery tracking.' },
    sched: { x: 110, y: 425, label: 'Flight Scheduling', sub: 'supporting',
      info: 'The timetable: which flights operate when, with which aircraft type.' },
    disruption: { x: 380, y: 425, label: 'Disruption Mgmt', sub: 'IROP rebooking · core',
      info: 'Reacts to cancellations and delays: rebooks passengers, issues vouchers.' },
    loyalty: { x: 650, y: 425, label: 'Loyalty', sub: 'supporting',
      info: 'Members, tiers, points.' },
  };
  const PAT = {
    P: { name: 'Partnership', def: 'Two teams with mutual dependency: they plan together, release together, and fix integration problems together. No upstream/downstream.' },
    SK: { name: 'Shared Kernel', def: 'A small, explicitly shared subset of the model (code + schema) co-owned by two teams. Changes need both teams to agree. Keep it tiny.' },
    CS: { name: 'Customer / Supplier', def: 'Upstream (supplier) and downstream (customer) are separate teams, but the customer\\'s needs go into the supplier\\'s planning. Contract tests often guard the API.' },
    CF: { name: 'Conformist', def: 'The downstream adopts the upstream\\'s model as-is. No translation. Cheap, but the upstream\\'s concepts become yours.' },
    ACL: { name: 'Anticorruption Layer', def: 'The downstream builds a translation layer so the upstream\\'s model never leaks into its own. Costs code, buys freedom.' },
    OHS: { name: 'Open Host Service + Published Language', def: 'The upstream offers one well-documented protocol/API for all consumers (OHS), using a documented shared format (PL), instead of one-off integrations.' },
    SW: { name: 'Separate Ways', def: 'No integration at all. Each side solves its small need on its own because connecting them costs more than it gives.' },
  };
  const EDGES = [
    { id: 'e1', a: 'legacy', b: 'booking', p: 'ACL', up: 'legacy',
      story: 'The mainframe returns records like <code>{RLOC, PAXNM: "SMITH/JOHN MR", STAT: "HK"}</code>. Booking puts a translator between it and its own model, so <code>Booking</code>, <code>Passenger</code> and <code>CONFIRMED</code> stay clean. When the mainframe is replaced, only the ACL changes.',
      code: 'reservationGateway.findBooking(ref) → translator.toBooking(mainframe.fetch(ref))' },
    { id: 'e2', a: 'inventory', b: 'pricing', p: 'P',
      story: 'Revenue management lives across both: Pricing decides fares, Inventory opens and closes fare buckets. The two teams share a backlog and a release train; if one slips, both do.',
      code: 'joint planning, shared integration tests, same release' },
    { id: 'e3', a: 'inventory', b: 'booking', p: 'CS', up: 'inventory',
      story: 'Booking (customer) needed "hold seats for 15 minutes during payment". Inventory (supplier) put it on its roadmap and shipped <code>holdSeats(flight, bucket, n, ttl)</code>, guarded by consumer contract tests owned by Booking.',
      code: 'inventory.holdSeats({ flight, bucket, count, ttlMinutes: 15 })' },
    { id: 'e4', a: 'pricing', b: 'booking', p: 'CS', up: 'pricing',
      story: 'Booking asks Pricing for a fare quote. Pricing treats Booking as its main customer: breaking changes are negotiated and versioned.',
      code: 'pricing.quote({ flight, fareBucket, passengers })' },
    { id: 'e5', a: 'payprov', b: 'payments', p: 'CF', up: 'payprov',
      story: 'PayFlow serves thousands of merchants and won\\'t change for SkyHop. Its model (payment intents, captures, refunds) is good enough, so Payments simply conforms and uses PayFlow\\'s terms directly.',
      code: 'payflow.paymentIntents.create({ amount, currency, capture_method })' },
    { id: 'e6', a: 'payments', b: 'booking', p: 'OHS', up: 'payments',
      story: 'Payments exposes one documented API (charge, refund, status) used by Booking, Loyalty (buying points) and airport kiosks, instead of each consumer integrating with PayFlow on its own.',
      code: 'POST /payments  { reference, amount, currency }  → { paymentId, status }' },
    { id: 'e7', a: 'booking', b: 'checkin', p: 'SK',
      story: 'Both contexts share a tiny library of value objects: <code>BookingReference</code> (6-char PNR) and <code>FlightDesignator</code> (SH123). Co-owned, changed only with both teams in the PR.',
      code: 'import { BookingReference, FlightDesignator } from "@skyhop/shared-kernel"' },
    { id: 'e8', a: 'sched', b: 'disruption', p: 'OHS', up: 'sched',
      story: 'Scheduling publishes a versioned schedule-change event feed in a documented format (a Published Language, similar in spirit to industry schedule standards). Disruption, Inventory and Check-in all consume the same feed; nobody gets a custom endpoint.',
      code: '{ type: "FlightCancelled", v: 2, flight: "SH123", date: "2026-11-02", reason: "WX" }' },
    { id: 'e9', a: 'checkin', b: 'loyalty', p: 'CF', up: 'checkin', t: 0.36,
      story: 'Loyalty consumes Check-in\\'s <code>PassengerBoarded</code> event exactly as it is and earns points from it. A deliberate internal Conformist: the event is good enough and translating it would add nothing.',
      code: 'on("PassengerBoarded", e → earnPoints(e.passengerId, e.flight))' },
    { id: 'e10', a: 'sched', b: 'loyalty', p: 'SW', curve: true,
      story: 'Loyalty runs "double points on new routes" promos and needs a list of new routes four times a year. Marketing types them into the promo tool. Integrating with Scheduling would cost weeks for no real gain.',
      code: '(no integration: a short list maintained by marketing)' },
    { id: 'e11', a: 'notif', b: 'disruption', p: 'CS', up: 'notif', t: 0.36,
      story: 'Disruption (customer) needs bulk SMS to 3,000 passengers within 5 minutes of a cancellation. Notifications (supplier) prioritises a bulk-send API and a capacity guarantee for it.',
      code: 'notifications.sendBulk({ template: "flight-cancelled", recipients })' },
  ];
  const $ = (id) => document.getElementById(id);
  const W = 170, H = 46;
  let selEdge = 'e1', selPat = null;

  function draw() {
    let s = '<defs><marker id="dot" markerWidth="6" markerHeight="6" refX="3" refY="3"><circle cx="3" cy="3" r="2.5" fill="#5b6478"/></marker></defs>';
    for (const e of EDGES) {
      const A = NODES[e.a], B = NODES[e.b];
      const d = e.curve ? 'M' + A.x + ',' + (A.y + H / 2) + ' Q' + ((A.x + B.x) / 2) + ',' + (A.y + 95) + ' ' + B.x + ',' + (B.y + H / 2)
        : 'M' + A.x + ',' + A.y + ' L' + B.x + ',' + B.y;
      const t = e.t || 0.5;
      const mx = e.curve ? (A.x + B.x) / 2 : A.x + (B.x - A.x) * t;
      const my = e.curve ? A.y + 59 : A.y + (B.y - A.y) * t;
      const cls = 'edge' + (e.id === selEdge ? ' on' : '') + (selPat && e.p !== selPat ? ' dim' : '');
      s += '<g class="' + cls + '" data-e="' + e.id + '"><path class="hit" d="' + d + '"/><path class="ln" d="' + d + '"' + (e.p === 'SW' ? ' stroke-dasharray="6 5"' : '') + '/>';
      if (e.up && !e.curve) {
        const U = NODES[e.up], Dn = NODES[e.up === e.a ? e.b : e.a];
        const dx = Dn.x - U.x, dy = Dn.y - U.y, len = Math.hypot(dx, dy);
        // place the U/D markers just outside each box
        const exit = Math.min(dx ? (W / 2) / Math.abs(dx) : 1, dy ? (H / 2) / Math.abs(dy) : 1) + 14 / len;
        const mark = (tt, txt) => {
          const x = U.x + dx * tt, y = U.y + dy * tt;
          return '<circle cx="' + x + '" cy="' + y + '" r="8" fill="#2f3644"/><text x="' + x + '" y="' + (y + 4) + '" fill="#c9cfdb" font-size="10" text-anchor="middle">' + txt + '</text>';
        };
        s += mark(exit, 'U') + mark(1 - exit, 'D');
      }
      const label = e.p === 'OHS' ? 'OHS/PL' : e.p === 'CS' ? 'C/S' : e.p;
      const bw = label.length * 7 + 12;
      s += '<rect x="' + (mx - bw / 2) + '" y="' + (my - 10) + '" width="' + bw + '" height="20" rx="10" fill="' + (e.id === selEdge ? '#ffd479' : '#3a4252') + '"/>' +
        '<text x="' + mx + '" y="' + (my + 4) + '" font-size="11" font-weight="600" text-anchor="middle" fill="' + (e.id === selEdge ? '#1b1f27' : '#e6e6e6') + '">' + label + '</text></g>';
    }
    for (const [k, n] of Object.entries(NODES)) {
      const fill = n.ext ? '#3a2a33' : '#24324a', stroke = n.ext ? '#f48fb1' : '#6b8cc7';
      s += '<g class="node" data-n="' + k + '"><rect x="' + (n.x - W / 2) + '" y="' + (n.y - H / 2) + '" width="' + W + '" height="' + H + '" rx="8" fill="' + fill + '" stroke="' + stroke + '"' + (n.ext ? ' stroke-dasharray="4 3"' : '') + '/>' +
        '<text x="' + n.x + '" y="' + (n.y - 3) + '" fill="#fff" font-size="13" font-weight="600" text-anchor="middle">' + n.label + '</text>' +
        '<text x="' + n.x + '" y="' + (n.y + 13) + '" fill="#9aa3b5" font-size="10" text-anchor="middle">' + n.sub + '</text></g>';
    }
    $('map').innerHTML = s;
  }

  function showEdge(id) {
    selEdge = id;
    const e = EDGES.find((x) => x.id === id);
    const p = PAT[e.p];
    const A = NODES[e.a].label, B = NODES[e.b].label;
    let ud = A + ' ↔ ' + B + ' (symmetric: no upstream/downstream)';
    if (e.up) {
      const up = NODES[e.up].label, down = NODES[e.up === e.a ? e.b : e.a].label;
      ud = 'Upstream: <b>' + up + '</b> → Downstream: <b>' + down + '</b>';
    }
    $('panel').innerHTML = '<h4>' + p.name + '</h4><div class="ud">' + ud + '</div>' +
      '<p>' + e.story + '</p><p><span class="k">In code:</span> <code>' + e.code + '</code></p>' +
      '<p class="k" style="font-size:12.5px">' + p.def + '</p>';
    draw();
  }

  function showNode(k) {
    const n = NODES[k];
    const rel = EDGES.filter((e) => e.a === k || e.b === k).map((e) => PAT[e.p].name + ' with ' + NODES[e.a === k ? e.b : e.a].label);
    $('panel').innerHTML = '<h4>' + n.label + '</h4><div class="ud">' + n.sub + '</div><p>' + n.info + '</p>' +
      '<p class="k">Relationships: ' + rel.join(' · ') + '</p>';
  }

  $('legend').innerHTML = Object.entries(PAT).map(([k, p]) => '<button data-p="' + k + '">' + p.name + '</button>').join('');
  $('legend').addEventListener('click', (e) => {
    const k = e.target.dataset.p;
    if (!k) return;
    selPat = selPat === k ? null : k;
    for (const b of $('legend').children) b.classList.toggle('on', b.dataset.p === selPat);
    const first = EDGES.find((x) => x.p === selPat);
    if (first) showEdge(first.id); else draw();
  });
  $('map').addEventListener('click', (e) => {
    const g = e.target.closest('[data-e]');
    if (g) return showEdge(g.dataset.e);
    const n = e.target.closest('[data-n]');
    if (n) showNode(n.dataset.n);
  });
  showEdge('e1');
</script>`,
      },
    ],
    quiz: [
      {
        q: 'SkyHop integrates with a global card-payment provider used by millions of merchants. Its model (payment intents, captures, refunds) fits SkyHop fine. Which relationship is most pragmatic?',
        options: ['Partnership', 'Conformist', 'Shared Kernel', 'Customer/Supplier'],
        answer: 1,
        why: 'You have no leverage over the provider, and its model is good enough, so adopting it is cheapest. (If it weren\'t good enough, you\'d add an ACL.)',
      },
      {
        q: 'Flight Scheduling is asked for a seventh custom endpoint, this time by Loyalty. Each consumer wants a slightly different shape. What should Scheduling do?',
        options: [
          'Build the seventh endpoint',
          'Offer an Open Host Service with a Published Language (one documented, versioned feed for everyone)',
          'Give consumers read access to its database',
          'Become Conformist to Loyalty',
        ],
        answer: 1,
        why: 'Many consumers + one upstream = publish one well-defined protocol and format. Consumers translate on their side if needed.',
      },
      {
        q: 'Booking depends on the 30-year-old reservation mainframe, whose records use codes like <code>STAT: "HK"</code> and names like <code>"SMITH/JOHN MR"</code>. SkyHop can\'t change it. What protects Booking\'s model?',
        options: ['Conformist', 'Shared Kernel', 'Anticorruption Layer', 'Separate Ways'],
        answer: 2,
        why: 'No leverage + a model you don\'t want = translate at the border. The ACL keeps mainframe concepts out of Booking. Next lesson builds one.',
      },
      {
        q: 'Booking and Check-in both copy-paste the same <code>BookingReference</code> validation (6 chars, no I/O/0/1). They change it together about once a year. Which pattern fits, and with what warning?',
        options: [
          'Shared Kernel, but keep the shared part tiny and co-owned',
          'Separate Ways, never share anything',
          'Conformist, Check-in should copy Booking\'s whole model',
          'Partnership, merge the two teams',
        ],
        answer: 0,
        why: 'A small, stable, co-owned piece of model is the textbook Shared Kernel. It turns dangerous when it grows, because every change needs both teams.',
      },
      {
        q: 'Disruption needs a "rebook at zero fare" option from Pricing. Pricing is an internal team that is willing to plan it into their roadmap with Disruption as a stakeholder. Which relationship is this?',
        options: ['Conformist', 'Customer/Supplier', 'Anticorruption Layer', 'Separate Ways'],
        answer: 1,
        why: 'Downstream needs drive the upstream\'s planning: that\'s Customer/Supplier. It requires the upstream to actually care, which is a team/organisational fact, not just a technical one.',
      },
    ],
    exercise: {
      lang: 'html',
      editor: false,
      task: `<p>For each integration situation in the box below, pick the context-map pattern that fits best and
      click <strong>Check</strong>.</p>`,
      starter: `<style>
  .cx { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .cx h3 { margin:0 0 8px; font-size:16px; color:#fff; }
  .cx .row { display:grid; grid-template-columns: 1fr 220px; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid #2a303c; }
  .cx .row div { color:#e6e6e6; }
  .cx select { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:5px; width:100%; }
  .cx .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:6px 14px; cursor:pointer; margin-top:10px; }
  .cx .fb { margin-top:4px; font-size:12.5px; }
  .cx .ok { color:#6fdc8c; } .cx .no { color:#ff8a80; }
  .cx #sum { margin-top:10px; font-weight:600; }
  @media (max-width: 560px) { .cx .row { grid-template-columns: 1fr; } }
</style>
<div class="cx">
  <h3>Which relationship?</h3>
  <div id="rows"></div>
  <button class="btn" id="check">Check</button>
  <div id="sum"></div>
</div>
<script>
  const PRESET = {};
  const OPTS = ['— choose —', 'Partnership', 'Shared Kernel', 'Customer / Supplier', 'Conformist', 'Anticorruption Layer', 'Open Host Service + PL', 'Separate Ways'];
  const ITEMS = [
    { id: 'a', text: 'LedgerBank must call a national credit bureau\\'s SOAP API. Field names are cryptic, codes change meaning by year, and LedgerBank has zero influence.', ans: 5,
      why: 'No leverage and a model you must not let in: translate at the border with an ACL.' },
    { id: 'b', text: 'ShopLane\\'s Shipping uses a large courier\\'s label API. The API is clean and its concepts (shipment, parcel, label) match what Shipping needs.', ans: 4,
      why: 'No leverage, but the model is good enough: conforming is the cheapest option.' },
    { id: 'c', text: 'SkyHop\\'s Booking and Inventory teams ship every feature together and their roadmaps only make sense as one.', ans: 1,
      why: 'Mutual dependency, joint planning and release: Partnership.' },
    { id: 'd', text: 'SkyHop\\'s Flight Scheduling has 8 internal consumers who each asked for their own endpoint.', ans: 6,
      why: 'One upstream, many consumers: publish one documented protocol and format (OHS + Published Language).' },
    { id: 'e', text: 'Loyalty needs a list of 5 new routes each quarter for promos. Integrating with Scheduling would take weeks.', ans: 7,
      why: 'Integration costs more than it gives. Separate Ways: maintain the tiny list locally.' },
    { id: 'f', text: 'ShopLane\\'s Returns team needs Orders to expose "items eligible for return". The Orders team agrees and schedules it for next sprint, with contract tests.', ans: 3,
      why: 'Downstream needs drive the upstream\\'s plan: Customer / Supplier.' },
  ];
  const rows = document.getElementById('rows');
  rows.innerHTML = ITEMS.map((it) =>
    '<div class="row"><div>' + it.text + '<div class="fb" id="fb-' + it.id + '"></div></div>' +
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
        fb.innerHTML = '<span class="no">✗ Not ' + OPTS[v] + '. ' + it.why + '</span>';
      }
    }
    document.getElementById('sum').innerHTML = right === ITEMS.length
      ? '<span class="ok">✅ All ' + right + ' correct.</span>'
      : '<span class="no">' + right + ' / ' + ITEMS.length + ' correct.</span>';
  };
</script>`,
      hint: 'First ask: can we influence the upstream? If not: is its model good enough (Conformist) or not (ACL)? If yes: do we plan together (Partnership) or do they serve us (Customer/Supplier)? Many consumers → OHS. Not worth integrating → Separate Ways.',
      solution: '__SOLUTION__',
    },
  },

  // ───────────────────────────────────────────────────────────── anti-corruption-layer
  {
    id: 'anti-corruption-layer',
    section: 'Strategic Design',
    title: 'Anti-corruption layer in code',
    explain: `
      <p>An <strong>anticorruption layer (ACL)</strong> is code that sits on the downstream side of an integration and
      translates the upstream's model into yours. The name says it all: without it, the upstream's concepts
      "corrupt" your model, one field name at a time.</p>

      <h3>SkyHop's case: the reservation mainframe</h3>
      <p>SkyHop's PNRs still live in a legacy reservation system. It returns records like this:</p>
      <pre><code>{
  RLOC: 'X7K2PQ',
  PAXNM: 'SMITH/JOHN MR',
  STAT: 'HK',
  SEGS: ['SH0123 Y 02NOV SYDMEL HK1 0715 0840', 'SH0456 Y 09NOV MELSYD TK1 1805 1930'],
}</code></pre>
      <p>Every field is a little puzzle: <code>RLOC</code> is the record locator (booking reference). Names are
      <code>FAMILY/GIVEN TITLE</code>. <code>HK</code> means "holding confirmed", <code>TK</code> means "confirmed, but the
      schedule changed", <code>HL</code> is waitlisted, <code>UN</code> means the flight doesn't operate. Dates have no
      year. Times have no colon or time zone.</p>

      <h3>The three parts of an ACL</h3>
      <ul>
        <li><strong>Gateway / facade</strong>: the only code that talks to the legacy system (its protocol, its quirks,
        its errors). Exposes methods in <em>your</em> language: <code>findBooking(reference)</code>.</li>
        <li><strong>Translator</strong>: pure functions from their model to yours (<code>'SMITH/JOHN MR'</code> →
        <code>{ title: 'Mr', given: 'John', family: 'Smith' }</code>). Easy to unit-test with recorded samples.</li>
        <li><strong>Your model</strong>: clean domain objects that never mention <code>PAXNM</code> or <code>HK</code>.</li>
      </ul>
      <p>The dependency arrow points one way: your domain doesn't know the ACL exists. It asks a
      <code>BookingSource</code>-style interface for a <code>Booking</code>, and the ACL implements it.</p>

      <h3>When to build one</h3>
      <ul>
        <li>The upstream's model is poor or alien to yours (legacy, a big ERP, a cryptic partner API).</li>
        <li>You're migrating off it (strangler fig): the ACL is the seam where you'll later plug in the new system.</li>
        <li>Your model is core and you can't afford outside concepts in it.</li>
      </ul>
      <p>When <em>not</em>: if the upstream's model is good and fits (Conformist is cheaper), or the integration is tiny.</p>

      <div class="warn">Two ways ACLs go wrong. (1) <strong>Leaky:</strong> the translator returns the raw object "just
      in case", and soon domain code reads <code>booking.raw.STAT</code>. (2) <strong>Smart:</strong> business rules
      creep into the translator ("if HL and Gold member then…"). The ACL translates; your model decides.</div>

      <div class="tip"><strong>In the real world:</strong> ACLs are the standard way to live with legacy systems
      during long migrations. Teams record real responses from the legacy system as test fixtures and run the
      translator against them in CI, so a surprise code like <code>"ZZ"</code> fails a test instead of a passenger's
      check-in. Unknown values should fail loudly at the border, not flow inward as <code>undefined</code>.</div>
    `,
    examples: [
      {
        title: 'Without an ACL: legacy codes leak into every feature',
        code: `// What the mainframe returns. We can't change it.
const mainframe = {
  fetchRecord(rloc) {
    return {
      RLOC: rloc,
      PAXNM: 'SMITH/JOHN MR',
      STAT: 'HK',
      SEGS: [
        'SH0123 Y 02NOV SYDMEL HK1 0715 0840',
        'SH0456 Y 09NOV MELSYD TK1 1805 1930',
      ],
    };
  },
};

// ---- email.js (Notifications team) ----
function greeting(rec) {
  const first = rec.PAXNM.split('/')[1];
  return 'Hi ' + first + ', your booking ' + rec.RLOC + ' is confirmed';
}

// ---- checkin.js (Check-in team) ----
function canCheckIn(rec, flight) {
  const seg = rec.SEGS.find((s) => s.startsWith(flight));
  return seg.includes(' HK'); // "HK = confirmed", someone said in 2019
}

// ---- app.js (Mobile team) ----
function tripCard(rec) {
  return rec.SEGS.map((s) => {
    const p = s.split(' ');
    return p[0] + ' ' + p[3].slice(0, 3) + '→' + p[3].slice(3) + ' on ' + p[2] + ' at ' + p[5];
  });
}

const rec = mainframe.fetchRecord('X7K2PQ');
console.log('email:', greeting(rec));
console.log('check-in SH0123:', canCheckIn(rec, 'SH0123'));
console.log('check-in SH0456:', canCheckIn(rec, 'SH0456'));
console.log('app:', tripCard(rec));

const leaked = ['PAXNM', 'RLOC', 'SEGS', 'HK', 'split'].length;
console.log('legacy concepts known by 3 teams:', leaked, '→ replacing the mainframe means changing all 3');`,
        explain: `
          <details>
            <summary>The problem: every team reinvents the translation, slightly wrong</summary>
            <table>
              <tr><th>Feature</th><th>Console</th><th>What went wrong</th></tr>
              <tr><td>email</td><td><code>email: Hi JOHN MR, your booking X7K2PQ is confirmed</code></td>
              <td>Title glued to the first name, shouting caps. The team didn't know the <code>FAMILY/GIVEN TITLE</code> format.</td></tr>
              <tr><td>check-in SH0123</td><td><code>check-in SH0123: true</code></td><td>Correct, by luck</td></tr>
              <tr><td>check-in SH0456</td><td><code>check-in SH0456: false</code></td>
              <td><strong>Bug.</strong> <code>TK</code> means "confirmed, schedule changed". John can't check in for a flight he holds.</td></tr>
              <tr><td>app</td><td><code>app: ["SH0123 SYD→MEL on 02NOV at 0715", …]</code></td>
              <td>No year, no colon, no time zone. Shows <code>0715</code> to customers.</td></tr>
              <tr><td>summary</td><td><code>legacy concepts known by 3 teams: 5 → replacing the mainframe means changing all 3</code></td><td></td></tr>
            </table>
            <p>Each team's code is short and looks harmless. Together, the mainframe's model has spread into three
            contexts. This is what "corruption" means: their model, not yours, now shapes your features.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>PAXNM</code> to <code>'NGUYEN/THI MAI MS'</code>. The email says <code>Hi THI MAI MS</code>.</li>
              <li>Change the first segment's <code>HK1</code> to <code>KK1</code> (also a confirmed code). Check-in breaks again.
              Every new code is a new bug in every team.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'With an ACL: gateway + translator + clean Booking model',
        code: `class DomainError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DomainError';
  }
}

class TranslationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranslationError';
  }
}

// ======== Legacy side (can't change) ========
const mainframe = {
  records: {
    X7K2PQ: {
      RLOC: 'X7K2PQ',
      PAXNM: 'SMITH/JOHN MR',
      STAT: 'HK',
      SEGS: ['SH0123 Y 02NOV SYDMEL HK1 0715 0840', 'SH0456 Y 05JAN MELSYD TK1 1805 1930'],
    },
    Q9W3ZT: { RLOC: 'Q9W3ZT', PAXNM: 'LEE/KIM', STAT: 'HK', SEGS: ['SH0789 Y 03NOV SYDBNE ZZ1 0900 1010'] },
  },
  fetchRecord(rloc) {
    return this.records[rloc];
  },
};

// ======== ACL: translator (pure functions) ========
const SEGMENT_STATUS = {
  HK: 'CONFIRMED', KK: 'CONFIRMED', TK: 'CONFIRMED', // ① legacy codes → our words
  HL: 'WAITLISTED',
  UN: 'NOT_OPERATING',
  HX: 'CANCELLED', XX: 'CANCELLED',
};
const TITLES = ['MR', 'MRS', 'MS', 'MISS', 'MSTR', 'DR'];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const cap = (w) => w.charAt(0) + w.slice(1).toLowerCase();

const translator = {
  passenger(paxnm) {
    const [family, rest] = paxnm.split('/');
    const words = rest.split(' ');
    const title = TITLES.includes(words.at(-1)) ? cap(words.pop()) : null;
    return { title, given: words.map(cap).join(' '), family: cap(family) };
  },

  date(ddmmm, today) {
    const day = Number(ddmmm.slice(0, 2));
    const month = MONTHS.indexOf(ddmmm.slice(2));
    let year = today.getUTCFullYear();
    // ② no year in legacy dates: a date well in the past means next year
    if (Date.UTC(year, month, day) < today.getTime() - 30 * 86400000) year++;
    return year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
  },

  segment(raw, today) {
    const [flight, , ddmmm, cityPair, statusCount, dep] = raw.split(' ');
    const code = statusCount.slice(0, 2);
    const status = SEGMENT_STATUS[code];
    if (!status) throw new TranslationError('Unknown legacy status ' + code + ' on ' + flight); // ③
    return {
      flight: flight.slice(0, 2) + Number(flight.slice(2)), // 'SH0123' → 'SH123'
      date: this.date(ddmmm, today),
      from: cityPair.slice(0, 3),
      to: cityPair.slice(3),
      departs: dep.slice(0, 2) + ':' + dep.slice(2),
      status,
      scheduleChanged: code === 'TK',
    };
  },
};

// ======== ACL: gateway (the only code that knows the mainframe) ========
class LegacyBookingGateway {
  constructor(system, clock) {
    this.system = system;
    this.clock = clock;
  }

  findBooking(reference) {
    const rec = this.system.fetchRecord(reference);
    if (!rec) return null;
    const today = this.clock();
    return new Booking(
      rec.RLOC,
      translator.passenger(rec.PAXNM),
      rec.SEGS.map((s) => translator.segment(s, today)),
    );
  }
}

// ======== Booking context: clean model, no legacy words ========
class Booking {
  constructor(reference, leadPassenger, segments) {
    this.reference = reference;
    this.leadPassenger = leadPassenger;
    this.segments = segments;
  }

  greeting() {
    return 'Hi ' + this.leadPassenger.given + ', your booking ' + this.reference + ' is confirmed';
  }

  canCheckIn(flight) {
    const seg = this.segments.find((s) => s.flight === flight);
    if (!seg) throw new DomainError(flight + ' is not in booking ' + this.reference);
    return seg.status === 'CONFIRMED';
  }
}

// ======== demo ========
const gateway = new LegacyBookingGateway(mainframe, () => new Date('2026-10-31T00:00:00Z'));
const booking = gateway.findBooking('X7K2PQ');

console.log('passenger:', booking.leadPassenger);
console.log('email:', booking.greeting());
console.log('check-in SH123:', booking.canCheckIn('SH123'));
console.log('check-in SH456:', booking.canCheckIn('SH456'));
console.log('app:', booking.segments.map((s) => s.flight + ' ' + s.from + '→' + s.to + ' on ' + s.date + ' at ' + s.departs + (s.scheduleChanged ? ' (new time)' : '')));

try {
  gateway.findBooking('Q9W3ZT');
} catch (e) {
  console.log('stopped at the border:', e.name, '-', e.message);
}`,
        explain: `
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const SEGMENT_STATUS = { HK: 'CONFIRMED', KK: 'CONFIRMED', TK: 'CONFIRMED', … }; // ①
if (Date.UTC(year, month, day) &lt; today - 30 days) year++;                     // ②
if (!status) throw new TranslationError('Unknown legacy status ' + code);       // ③
class LegacyBookingGateway { findBooking(reference) { … return new Booking(…) } } // ④</code></pre>
            <ol>
              <li><strong>①</strong> Legacy codes are translated <em>once</em> into Booking's language. Three legacy codes mean
              "confirmed" to us; <code>TK</code>'s extra meaning becomes an explicit <code>scheduleChanged</code> flag.</li>
              <li><strong>②</strong> Legacy dates have no year. The rule for guessing it lives in one tested function,
              with an injected clock, so <code>05JAN</code> correctly becomes <code>2027-01-05</code>.</li>
              <li><strong>③</strong> An unknown code (<code>ZZ</code>) stops at the border with a clear error instead of
              becoming <code>undefined</code> deep inside check-in.</li>
              <li><strong>④</strong> The gateway is the <em>only</em> code that calls the mainframe. Booking code receives a
              <code>Booking</code> and never sees <code>PAXNM</code>, <code>SEGS</code> or <code>HK</code>.</li>
            </ol>
          </details>
          <details>
            <summary>Step by step: translating record X7K2PQ</summary>
            <table>
              <tr><th>Legacy</th><th>Translator</th><th>Booking model</th></tr>
              <tr><td><code>RLOC: 'X7K2PQ'</code></td><td>as is</td><td><code>reference: 'X7K2PQ'</code></td></tr>
              <tr><td><code>'SMITH/JOHN MR'</code></td><td><code>passenger()</code></td><td><code>{ title: 'Mr', given: 'John', family: 'Smith' }</code></td></tr>
              <tr><td><code>'SH0123 … 02NOV SYDMEL HK1 0715 …'</code></td><td><code>segment()</code></td><td><code>{ flight: 'SH123', date: '2026-11-02', from: 'SYD', to: 'MEL', departs: '07:15', status: 'CONFIRMED', scheduleChanged: false }</code></td></tr>
              <tr><td><code>'SH0456 … 05JAN MELSYD TK1 1805 …'</code></td><td><code>segment()</code> + year rule</td><td><code>{ flight: 'SH456', date: '2027-01-05', …, departs: '18:05', status: 'CONFIRMED', scheduleChanged: true }</code></td></tr>
              <tr><td><code>'SH0789 … ZZ1 …'</code></td><td>unknown code</td><td><code>TranslationError</code></td></tr>
            </table>
            <p>Console:</p>
            <pre><code>passenger: {"title":"Mr","given":"John","family":"Smith"}
email: Hi John, your booking X7K2PQ is confirmed
check-in SH123: true
check-in SH456: true
app: ["SH123 SYD→MEL on 2026-11-02 at 07:15","SH456 MEL→SYD on 2027-01-05 at 18:05 (new time)"]
stopped at the border: TranslationError - Unknown legacy status ZZ on SH0789</code></pre>
            <p>All three bugs from the previous example are gone, and they're fixed in one place for every team.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>PAXNM</code> to <code>'NGUYEN/THI MAI MS'</code>: <code>given</code> becomes <code>'Thi Mai'</code>, title <code>'Ms'</code>.</li>
              <li>Replace <code>ZZ1</code> with <code>HL1</code> and add <code>console.log(gateway.findBooking('Q9W3ZT').canCheckIn('SH789'))</code>: <code>false</code>, because the segment is <code>WAITLISTED</code>.</li>
              <li>Imagine SkyHop moves to a new cloud reservation system. Write a <code>NewPssGateway</code> with the same <code>findBooking</code> method. <code>Booking</code> doesn't change at all: that is the payoff.</li>
            </ul>
          </details>
          <details>
            <summary>Common mistake: the ACL that decides things</summary>
            <div class="warn">Don't put rules like "waitlisted Gold members count as confirmed" in the translator. The translator
            says <em>what the legacy data means</em> (<code>WAITLISTED</code>). Whether a Gold member may check in anyway is a
            Booking or Check-in decision, made in the domain model where it can be found and tested.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In SkyHop\'s check-in code you find <code>if (booking.raw.STAT === "HK")</code>. The ACL exists. What went wrong?',
        options: [
          'Nothing, it\'s faster to read raw data',
          'The ACL is leaky: it passed the raw legacy record inward, and domain code started depending on legacy codes',
          'The mainframe should rename STAT',
          'The check-in team should build its own ACL inside check-in code',
        ],
        answer: 1,
        why: 'Once raw upstream data is reachable from domain code, someone will use it. The ACL should return only translated domain objects.',
      },
      {
        q: 'The legacy system returns a new status code <code>"ZZ"</code> nobody has seen. What should the translator do?',
        options: [
          'Map it to <code>undefined</code> and let downstream code decide',
          'Default it to <code>CONFIRMED</code> so passengers aren\'t blocked',
          'Fail loudly at the border (e.g. a translation error with the code and record), so it is noticed and mapped deliberately',
          'Ignore the segment',
        ],
        answer: 2,
        why: 'Silent defaults spread wrong data into the domain. Explicit failure at the boundary is easy to diagnose and fix once.',
      },
      {
        q: 'SkyHop plans to replace the mainframe over two years with a new reservation platform. How does an ACL help?',
        options: [
          'It doesn\'t; ACLs are only for external vendors',
          'Booking depends on the gateway\'s interface, so a new gateway for the new system can be swapped in, flow by flow, without changing Booking',
          'It makes the migration unnecessary',
          'It copies the mainframe\'s data model into the new system',
        ],
        answer: 1,
        why: 'The ACL is the seam of a strangler-fig migration: Booking talks to an interface in its own language; what sits behind it can change.',
      },
      {
        q: 'ShopLane integrates with a modern courier API whose concepts (shipment, parcel, label) match ShopLane\'s Shipping model almost exactly. Should they build an ACL?',
        options: [
          'Yes, always build an ACL for external APIs',
          'Probably not: the model fits, so being Conformist (maybe with a thin client wrapper) is cheaper',
          'Yes, and also a Shared Kernel',
          'No, they should use Separate Ways',
        ],
        answer: 1,
        why: 'An ACL costs code and maintenance. It pays off when the upstream model is alien or poor. When the model fits, conform.',
      },
    ],
    exercise: {
      task: `<p>Write the translator half of the ACL:</p>
      <ul>
        <li><code>translatePassenger(paxnm)</code>: <code>'SMITH/JOHN MR'</code> →
        <code>{ title: 'Mr', given: 'John', family: 'Smith' }</code>. Titles are <code>MR, MRS, MS, DR</code> and are optional
        (<code>title: null</code> if missing). Given names can have several words.</li>
        <li><code>translateStatus(code)</code>: <code>HK</code>, <code>KK</code>, <code>TK</code> → <code>'CONFIRMED'</code>;
        <code>HL</code> → <code>'WAITLISTED'</code>; <code>UN</code> → <code>'NOT_OPERATING'</code>. Any other code must
        <strong>throw</strong> a <code>TranslationError</code>.</li>
      </ul>`,
      starter: `class TranslationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranslationError';
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
    console.log(e instanceof TranslationError ? '✅' : '❌', name, '→', e.name + ': ' + e.message);
  }
}

function translatePassenger(paxnm) {
  // TODO: 'FAMILY/GIVEN NAMES TITLE' → { title, given, family }
  return { title: null, given: paxnm, family: '' };
}

function translateStatus(code) {
  // TODO: legacy code → Booking's words, unknown → throw TranslationError
  return code;
}

check('Smith', translatePassenger('SMITH/JOHN MR'), { title: 'Mr', given: 'John', family: 'Smith' });
check('Nguyen (two given names)', translatePassenger('NGUYEN/THI MAI MS'),
  { title: 'Ms', given: 'Thi Mai', family: 'Nguyen' });
check('Lee (no title)', translatePassenger('LEE/KIM'), { title: null, given: 'Kim', family: 'Lee' });

check('HK', translateStatus('HK'), 'CONFIRMED');
check('TK', translateStatus('TK'), 'CONFIRMED');
check('HL', translateStatus('HL'), 'WAITLISTED');
check('UN', translateStatus('UN'), 'NOT_OPERATING');
expectThrows('unknown ZZ', () => translateStatus('ZZ'));`,
      hint: 'Split on "/" for family vs rest, then split rest on spaces. If the last word is a known title, pop it. Capitalise with w[0] + w.slice(1).toLowerCase(). For status, use a lookup object and throw when the lookup is undefined.',
      solution: `class TranslationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'TranslationError';
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
    console.log(e instanceof TranslationError ? '✅' : '❌', name, '→', e.name + ': ' + e.message);
  }
}

const TITLES = ['MR', 'MRS', 'MS', 'DR'];
const cap = (w) => w.charAt(0) + w.slice(1).toLowerCase();

function translatePassenger(paxnm) {
  const [family, rest] = paxnm.split('/');
  const words = rest.split(' ');
  const title = TITLES.includes(words.at(-1)) ? cap(words.pop()) : null;
  return { title, given: words.map(cap).join(' '), family: cap(family) };
}

const STATUS = {
  HK: 'CONFIRMED',
  KK: 'CONFIRMED',
  TK: 'CONFIRMED',
  HL: 'WAITLISTED',
  UN: 'NOT_OPERATING',
};

function translateStatus(code) {
  const status = STATUS[code];
  if (!status) throw new TranslationError('Unknown legacy status ' + code);
  return status;
}

check('Smith', translatePassenger('SMITH/JOHN MR'), { title: 'Mr', given: 'John', family: 'Smith' });
check('Nguyen (two given names)', translatePassenger('NGUYEN/THI MAI MS'),
  { title: 'Ms', given: 'Thi Mai', family: 'Nguyen' });
check('Lee (no title)', translatePassenger('LEE/KIM'), { title: null, given: 'Kim', family: 'Lee' });

check('HK', translateStatus('HK'), 'CONFIRMED');
check('TK', translateStatus('TK'), 'CONFIRMED');
check('HL', translateStatus('HL'), 'WAITLISTED');
check('UN', translateStatus('UN'), 'NOT_OPERATING');
expectThrows('unknown ZZ', () => translateStatus('ZZ'));`,
    },
  },

  // ───────────────────────────────────────────────────────────── event-storming
  {
    id: 'event-storming',
    section: 'Strategic Design',
    title: 'Event Storming',
    explain: `
      <p><strong>Event Storming</strong> (Alberto Brandolini, around 2013) is a workshop where developers and
      domain experts model a business process together on a very long wall with sticky notes. It is the fastest
      known way to crunch knowledge across many people at once, and it is excellent at revealing bounded contexts.</p>

      <h3>The core idea: start from events</h3>
      <p>A <strong>domain event</strong> is something that happened that the business cares about, written in the past
      tense on an orange sticky: <em>Booking Confirmed</em>, <em>Passenger Checked In</em>, <em>Gate Closed</em>.
      Everybody can contribute events without knowing the system, which is why it works with mixed groups.</p>

      <h3>The sticky-note colours</h3>
      <table>
        <tr><th>Colour</th><th>Meaning</th><th>SkyHop example</th></tr>
        <tr><td style="background:#ffb347;color:#1b1f27">Orange</td><td>Domain event (past tense)</td><td>Booking Confirmed</td></tr>
        <tr><td style="background:#8ab4f8;color:#1b1f27">Blue</td><td>Command: an intention that triggers events</td><td>Check In</td></tr>
        <tr><td style="background:#fff176;color:#1b1f27">Small yellow</td><td>Actor / person who issues the command</td><td>Traveller, Gate Agent</td></tr>
        <tr><td style="background:#ce93d8;color:#1b1f27">Purple / lilac</td><td>Policy: "whenever X, then Y" (reactive logic)</td><td>Whenever gate closes, mark not-boarded passengers as no-shows</td></tr>
        <tr><td style="background:#f48fb1;color:#1b1f27">Pink (wide)</td><td>External system</td><td>PayFlow, Legacy Reservation</td></tr>
        <tr><td style="background:#a5d6a7;color:#1b1f27">Green</td><td>Read model: information someone needs to decide</td><td>Seat Map, Boarding List</td></tr>
        <tr><td style="background:#f06292;color:#fff">Hot pink (rotated)</td><td>Hotspot: a question, conflict or pain point</td><td>"Who owns the seat?"</td></tr>
      </table>
      <p>(In design-level sessions a large yellow sticky also marks <em>aggregates</em>. Teams vary on exact colours;
      what matters is that the legend is on the wall.)</p>

      <h3>Formats</h3>
      <ul>
        <li><strong>Big Picture</strong>: the whole business flow, 10–30 people, a day. Goal: shared understanding,
        hotspots, candidate boundaries.</li>
        <li><strong>Process Modelling</strong>: one process in detail with commands, policies and read models.</li>
        <li><strong>Software Design</strong>: adds aggregates; output is close to code.</li>
      </ul>

      <h3>Pivotal events</h3>
      <p>Some events mark a big change of phase: after <em>Booking Confirmed</em>, the conversation moves from selling
      to travel preparation; after <em>Flight Departed</em>, from the airport to the operation. These <strong>pivotal
      events</strong> are strong hints for bounded-context boundaries, and often for team boundaries too.</p>

      <div class="tip"><strong>Facilitation tips:</strong> "unlimited modelling space" (a long paper roll, not a
      whiteboard); everyone writes, no one is the scribe; no laptops; welcome duplicates and conflicts (they're
      information); mark disagreements as hotspots instead of resolving them on the spot.</div>

      <div class="tip"><strong>In the real world:</strong> remote teams do this on online whiteboards with the same
      colours. The most valuable output is rarely the final board; it is the hotspots (what nobody understood) and the
      moment two departments realise they use the same word for different things.</div>
    `,
    examples: [
      {
        title: 'Widget: a SkyHop Big Picture session, phase by phase',
        lang: 'html',
        editor: false,
        code: `<style>
  .es { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .es h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .es .bar { display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:6px 0 8px; }
  .es .btn { background:#2f3644; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:4px 12px; cursor:pointer; margin:0; }
  .es .btn:disabled { opacity:.4; cursor:default; }
  .es .dots button { width:26px; height:26px; border-radius:50%; padding:0; margin:0 2px; border:1px solid #3a4252; background:#252b36; color:#c9cfdb; cursor:pointer; font-size:12px; }
  .es .dots button.on { background:#ffd479; color:#1b1f27; border-color:#ffd479; }
  .es .story { background:#252b36; border-radius:8px; padding:8px 12px; margin-bottom:8px; min-height:58px; }
  .es .story b { color:#ffd479; }
  .es .scroll { overflow-x:auto; border-radius:8px; background:#f3efe6; }
  .es .board { position:relative; width:1440px; height:380px; }
  .es .note { position:absolute; width:86px; min-height:52px; padding:5px 6px; box-sizing:border-box; font-size:11px; line-height:1.25; color:#1b1f27;
    border-radius:2px; box-shadow:0 2px 4px rgba(0,0,0,.25); transition: left .6s ease, top .6s ease, transform .6s ease, opacity .4s; cursor:pointer; }
  .es .note.event { background:#ffb347; }
  .es .note.command { background:#8ab4f8; }
  .es .note.actor { background:#fff176; width:70px; min-height:34px; }
  .es .note.policy { background:#ce93d8; }
  .es .note.external { background:#f48fb1; width:96px; }
  .es .note.read { background:#a5d6a7; }
  .es .note.hotspot { background:#f06292; color:#fff; transform:rotate(-6deg); font-weight:600; }
  .es .note.pivotal { outline:3px solid #b3261e; outline-offset:1px; }
  .es .note.gone { opacity:0; pointer-events:none; }
  .es .note.sel { box-shadow:0 0 0 3px #1b1f27; }
  .es .line { position:absolute; top:0; bottom:0; border-left:3px dashed #b3261e; transition:opacity .4s; }
  .es .ctx { position:absolute; bottom:6px; font-size:13px; font-weight:700; color:#b3261e; transition:opacity .4s; }
  .es .axis { position:absolute; left:10px; right:10px; top:178px; border-top:2px solid rgba(0,0,0,.15); transition:opacity .4s; }
  .es .legend { display:flex; flex-wrap:wrap; gap:8px; margin-top:8px; font-size:12px; color:#c9cfdb; }
  .es .legend span i { display:inline-block; width:12px; height:12px; border-radius:2px; vertical-align:-2px; margin-right:4px; }
  .es .detail { margin-top:8px; font-size:13px; color:#c9cfdb; min-height:20px; }
</style>
<div class="es">
  <h3>Event Storming: book a flight → check in → board</h3>
  <div class="bar">
    <button class="btn" id="prev">◀ Prev</button>
    <span class="dots" id="dots"></span>
    <button class="btn" id="next">Next ▶</button>
    <span style="color:#9aa3b5;font-size:12.5px">Click any sticky for details. The board scrolls sideways.</span>
  </div>
  <div class="story" id="story"></div>
  <div class="scroll"><div class="board" id="board"></div></div>
  <div class="legend">
    <span><i style="background:#ffb347"></i>Domain event</span><span><i style="background:#8ab4f8"></i>Command</span>
    <span><i style="background:#fff176"></i>Actor</span><span><i style="background:#ce93d8"></i>Policy</span>
    <span><i style="background:#f48fb1"></i>External system</span><span><i style="background:#a5d6a7"></i>Read model</span>
    <span><i style="background:#f06292"></i>Hotspot</span><span><i style="border:2px solid #b3261e"></i>Pivotal event</span>
  </div>
  <div class="detail" id="detail"></div>
</div>
<script>
  const PHASES = [
    { t: '1 · Chaotic exploration', d: 'Everyone writes <b>orange domain events</b> in the past tense, all at once, anywhere on the wall. No discussion yet. Notice the duplicates (<i>Booking Made</i> vs <i>Reservation Created</i>) and the vague one (<i>Data Updated</i>): that is normal and useful.' },
    { t: '2 · Enforce the timeline', d: 'The group sorts events left to right in time order. Duplicates are merged (the experts agree to call it <b>Booking Confirmed</b>), vague events are rewritten or removed. Arguments about order are where knowledge appears.' },
    { t: '3 · Commands, actors, policies, systems', d: 'For each event: what caused it? A <b>blue command</b> from a <b>yellow actor</b>, a <b>pink external system</b>, or a <b>purple policy</b> ("whenever X, then Y"). <b>Green read models</b> show what someone needs to see to decide.' },
    { t: '4 · Hotspots', d: '<b>Hot-pink hotspots</b> mark questions, conflicts and pain. "Who owns the seat?" turned into a 20-minute debate between the Booking and Airport teams: exactly the point. Don\\'t solve them now; capture them.' },
    { t: '5 · Pivotal events & boundaries', d: '<b>Pivotal events</b> (red outline) mark phase changes. Boundaries drawn around them, plus where the language changed, give <b>candidate bounded contexts</b>: Booking, Check-in &amp; Boarding, Flight Ops.' },
  ];
  // col: timeline column, row: 0 actor/external, 1 command, 2 event, 3 policy/read model, 4 hotspot
  const N = [
    { id: 'e0', type: 'event', text: 'Fare Quoted', col: 0, from: 0, d: 'A price was shown for a flight. Pricing context.' },
    { id: 'e1', type: 'event', text: 'Seats Held', col: 1, from: 0, d: 'Inventory holds seats for 15 minutes while the traveller pays.' },
    { id: 'e2', type: 'event', text: 'Payment Authorised', col: 2, from: 0, d: 'Comes back from the external payment provider.' },
    { id: 'e3', type: 'event', text: 'Booking Confirmed', col: 3, from: 0, pivotal: true, d: 'Pivotal: from here on, the conversation is about travelling, not selling. A PNR exists.' },
    { id: 'e4', type: 'event', text: 'Seat Selected', col: 4, from: 0, d: 'An ancillary purchase or a free seat choice.' },
    { id: 'e5', type: 'event', text: 'Check-in Window Opened', col: 5, from: 0, d: 'A time-triggered event: 24h before departure.' },
    { id: 'e6', type: 'event', text: 'Passenger Checked In', col: 6, from: 0, d: 'Travel documents (APIS) submitted, seat confirmed.' },
    { id: 'e7', type: 'event', text: 'Boarding Pass Issued', col: 7, from: 0, d: 'Mobile or paper boarding pass.' },
    { id: 'e8', type: 'event', text: 'Bag Dropped', col: 8, from: 0, d: 'Checked bag tagged and accepted at the airport.' },
    { id: 'e9', type: 'event', text: 'Passenger Boarded', col: 9, from: 0, d: 'Boarding pass scanned at the gate.' },
    { id: 'e10', type: 'event', text: 'Gate Closed', col: 10, from: 0, d: 'No more boarding.' },
    { id: 'e11', type: 'event', text: 'No-Show Recorded', col: 11, from: 0, d: 'Confirmed passengers who did not board. Feeds the overbooking forecast.' },
    { id: 'e12', type: 'event', text: 'Flight Departed', col: 12, from: 0, pivotal: true, d: 'Pivotal: off-block. Responsibility moves to flight operations.' },
    { id: 'e13', type: 'event', text: 'Flight Arrived', col: 13, from: 0, d: 'On-block at destination.' },
    { id: 'x1', type: 'event', text: 'Booking Made', col: 3, from: 0, until: 0, d: 'Duplicate of Booking Confirmed (sales team word).' },
    { id: 'x2', type: 'event', text: 'Reservation Created', col: 3, from: 0, until: 0, d: 'Duplicate of Booking Confirmed (old mainframe word).' },
    { id: 'x3', type: 'event', text: 'Data Updated', col: 6, from: 0, until: 0, d: 'Too vague: what happened, in business terms? Removed.' },
    { id: 'a0', type: 'actor', text: 'Traveller', col: 1, row: 0, from: 2, d: 'Books, pays, checks in online.' },
    { id: 'a1', type: 'actor', text: 'Gate Agent', col: 9, row: 0, from: 2, d: 'Scans boarding passes, closes the gate.' },
    { id: 'x4', type: 'external', text: 'PayFlow (payments)', col: 2, row: 0, from: 2, d: 'External payment provider.' },
    { id: 'x5', type: 'external', text: 'Legacy Reservation', col: 3, row: 0, from: 2, d: 'The mainframe still stores the PNR.' },
    { id: 'c0', type: 'command', text: 'Hold Seats', col: 1, row: 1, from: 2, d: 'Issued by the traveller when choosing a flight.' },
    { id: 'c1', type: 'command', text: 'Pay', col: 2, row: 1, from: 2, d: 'Traveller pays; PayFlow authorises.' },
    { id: 'c2', type: 'command', text: 'Check In', col: 6, row: 1, from: 2, d: 'Traveller, online, inside the window.' },
    { id: 'c3', type: 'command', text: 'Scan Boarding Pass', col: 9, row: 1, from: 2, d: 'Gate agent at the gate.' },
    { id: 'p0', type: 'policy', text: 'Whenever payment is authorised → confirm booking', col: 2, row: 3, from: 2, d: 'Reactive logic between Payment Authorised and Booking Confirmed.' },
    { id: 'p1', type: 'policy', text: 'When window opens → send check-in reminder', col: 5, row: 3, from: 2, d: 'Triggers Customer Notifications.' },
    { id: 'p2', type: 'policy', text: 'When gate closes → record no-shows', col: 10, row: 3, from: 2, d: 'Everyone confirmed but not boarded becomes a no-show.' },
    { id: 'r0', type: 'read', text: 'Seat Map', col: 4, row: 3, from: 2, d: 'What the traveller sees to choose a seat.' },
    { id: 'r1', type: 'read', text: 'Boarding List', col: 9, row: 3, from: 2, d: 'What the gate agent sees: who is still missing.' },
    { id: 'h0', type: 'hotspot', text: 'Seat hold expired while paying?!', col: 1, row: 4, from: 3, d: 'Payment succeeded but the hold was gone. Refund? Re-hold? Nobody knew.' },
    { id: 'h1', type: 'hotspot', text: 'Who owns the seat: Booking or Check-in?', col: 4, row: 4, from: 3, d: 'Booking sells seats; Check-in reassigns them after aircraft swaps. Two meanings of "seat": a boundary hint.' },
    { id: 'h2', type: 'hotspot', text: 'No-show: refund taxes? who decides?', col: 11, row: 4, from: 3, d: 'Legal and finance disagree. Capture, don\\'t solve.' },
  ];
  const BOUNDS = [{ col: 4.95, label: '' }, { col: 11.95, label: '' }];
  const CTX = [{ col: 0, text: 'Booking' }, { col: 5.1, text: 'Check-in & Boarding' }, { col: 12.1, text: 'Flight Ops' }];
  const ROWY = [6, 68, 150, 232, 300];
  const colX = (c) => 14 + c * 101;
  let rnd = 7;
  const rand = () => { rnd = (rnd * 9301 + 49297) % 233280; return rnd / 233280; };
  const chaos = {};
  for (const n of N) if (n.type === 'event') chaos[n.id] = { x: 20 + rand() * 1000, y: 10 + rand() * 300, r: rand() * 16 - 8 };
  const $ = (id) => document.getElementById(id);
  let phase = 0, sel = null;

  const board = $('board');
  board.innerHTML = '<div class="axis" id="axis"></div>' +
    BOUNDS.map((b, i) => '<div class="line" id="bl' + i + '" style="left:' + (colX(b.col) - 8) + 'px"></div>').join('') +
    CTX.map((c, i) => '<div class="ctx" id="cx' + i + '" style="left:' + (colX(c.col) + 4) + 'px">' + c.text + '</div>').join('') +
    N.map((n) => '<div class="note ' + n.type + '" id="' + n.id + '" data-id="' + n.id + '">' + n.text + '</div>').join('');

  function render() {
    for (const n of N) {
      const el = $(n.id);
      const visible = phase >= n.from && (n.until == null || phase <= n.until);
      el.classList.toggle('gone', !visible);
      el.classList.toggle('pivotal', phase >= 4 && !!n.pivotal);
      el.classList.toggle('sel', sel === n.id);
      if (n.type === 'event' && phase === 0) {
        const c = chaos[n.id];
        el.style.left = c.x + 'px'; el.style.top = c.y + 'px';
        el.style.transform = 'rotate(' + c.r + 'deg)';
      } else {
        el.style.left = colX(n.col) + 'px';
        el.style.top = ROWY[n.row == null ? 2 : n.row] + 'px';
        el.style.transform = n.type === 'hotspot' ? 'rotate(-6deg)' : 'none';
      }
    }
    $('axis').style.opacity = phase >= 1 ? 1 : 0;
    for (let i = 0; i < BOUNDS.length; i++) $('bl' + i).style.opacity = phase >= 4 ? 1 : 0;
    for (let i = 0; i < CTX.length; i++) $('cx' + i).style.opacity = phase >= 4 ? 1 : 0;
    $('story').innerHTML = '<b>' + PHASES[phase].t + '.</b> ' + PHASES[phase].d;
    $('dots').innerHTML = PHASES.map((p, i) => '<button data-i="' + i + '" class="' + (i === phase ? 'on' : '') + '" title="' + p.t + '">' + (i + 1) + '</button>').join('');
    $('prev').disabled = phase === 0;
    $('next').disabled = phase === PHASES.length - 1;
  }
  $('prev').onclick = () => { phase = Math.max(0, phase - 1); render(); };
  $('next').onclick = () => { phase = Math.min(PHASES.length - 1, phase + 1); render(); };
  $('dots').addEventListener('click', (e) => { if (e.target.dataset.i) { phase = +e.target.dataset.i; render(); } });
  board.addEventListener('click', (e) => {
    const el = e.target.closest('.note');
    if (!el) return;
    const n = N.find((x) => x.id === el.dataset.id);
    sel = n.id;
    const kind = { event: 'Domain event', command: 'Command', actor: 'Actor', policy: 'Policy', external: 'External system', read: 'Read model', hotspot: 'Hotspot' }[n.type];
    $('detail').innerHTML = '<b style="color:#fff">' + n.text + '</b> · ' + kind + (n.pivotal ? ' · <span style="color:#ff8a80">pivotal</span>' : '') + ' — ' + n.d;
    render();
  });
  render();
</script>`,
      },
    ],
    quiz: [
      {
        q: 'During a SkyHop session, a developer writes "Update Booking Table" on an orange sticky. What should the facilitator suggest?',
        options: [
          'Keep it, technical events are useful',
          'Rewrite it as a business fact in the past tense, e.g. "Seat Selected" or "Booking Confirmed"',
          'Turn it blue, it is a command',
          'Put it on the external-systems row',
        ],
        answer: 1,
        why: 'Domain events describe what happened in the business, in the experts\' words. "Update table" is an implementation detail and hides meaning.',
      },
      {
        q: 'The Booking and Airport teams argue for 20 minutes about who "owns" a passenger\'s seat. What should happen on the wall?',
        options: [
          'Stop the session until they agree',
          'Let the most senior person decide',
          'Put a hotspot sticky there and move on; the conflict is a valuable boundary hint',
          'Remove the seat-related events',
        ],
        answer: 2,
        why: 'Hotspots capture disagreements without derailing the session. Two teams with different meanings for "seat" is exactly the kind of insight Event Storming is for.',
      },
      {
        q: 'Which sticky represents "Whenever a flight is cancelled, offer every passenger a rebooking"?',
        options: ['Orange domain event', 'Blue command', 'Purple policy', 'Green read model'],
        answer: 2,
        why: 'Reactive "whenever X, then Y" logic is a policy. It connects an event (Flight Cancelled) to a command (Offer Rebooking).',
      },
      {
        q: 'After the session, which observation most strongly suggests a bounded-context boundary?',
        options: [
          'The wall ran out of space at that point',
          'A pivotal event where the vocabulary and the people involved change (e.g. after Booking Confirmed, sales people leave and airport people take over)',
          'Two events that have the same colour',
          'An event with a long name',
        ],
        answer: 1,
        why: 'Pivotal events plus a change in language and actors are the classic boundary signals.',
      },
    ],
    exercise: {
      lang: 'html',
      editor: false,
      task: `<p>A Disruption Management session produced these stickies. In the box below, choose the right
      <strong>type</strong> for each, tick the <strong>two pivotal events</strong>, and click <strong>Check</strong>.</p>`,
      starter: `<style>
  .ex { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .ex h3 { margin:0 0 8px; font-size:16px; color:#fff; }
  .ex .row { display:grid; grid-template-columns: 1fr 170px 90px; gap:10px; align-items:center; padding:6px 0; border-bottom:1px solid #2a303c; }
  .ex .sticky { display:inline-block; background:#f3efe6; color:#1b1f27; padding:6px 9px; border-radius:2px; font-size:13px; box-shadow:0 1px 3px rgba(0,0,0,.3); transition: background .2s; }
  .ex select { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:5px; width:100%; }
  .ex label { font-size:12.5px; color:#c9cfdb; }
  .ex .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:6px 14px; cursor:pointer; margin-top:10px; }
  .ex .fb { margin-top:4px; font-size:12.5px; }
  .ex .ok { color:#6fdc8c; } .ex .no { color:#ff8a80; }
  .ex #sum { margin-top:10px; font-weight:600; }
  @media (max-width: 560px) { .ex .row { grid-template-columns: 1fr; } }
</style>
<div class="ex">
  <h3>Disruption Management: type each sticky</h3>
  <div id="rows"></div>
  <button class="btn" id="check">Check</button>
  <div id="sum"></div>
</div>
<script>
  const PRESET = {};
  const TYPES = ['— type —', 'Domain event', 'Command', 'Actor', 'Policy', 'External system', 'Read model', 'Hotspot'];
  const COLOR = { 1: '#ffb347', 2: '#8ab4f8', 3: '#fff176', 4: '#ce93d8', 5: '#f48fb1', 6: '#a5d6a7', 7: '#f06292' };
  const ITEMS = [
    { id: 'a', text: 'Flight Cancelled', type: 1, pivotal: true, why: 'Past-tense business fact. Pivotal: the problem moves from Flight Ops to Disruption Management.' },
    { id: 'b', text: 'Rebook Passenger', type: 2, why: 'An imperative intention that someone issues: a command.' },
    { id: 'c', text: 'Ops Controller', type: 3, why: 'A person who makes decisions and issues commands: an actor.' },
    { id: 'd', text: 'Whenever a flight is cancelled, offer rebooking to all its passengers', type: 4, why: '"Whenever X, then Y": a policy.' },
    { id: 'e', text: 'Available Alternative Flights', type: 6, why: 'Information someone looks at to decide: a read model.' },
    { id: 'f', text: 'Weather service', type: 5, why: 'Something outside SkyHop that sends us information: an external system.' },
    { id: 'g', text: 'What if the alternative flight is also full?', type: 7, why: 'An open question nobody could answer yet: a hotspot.' },
    { id: 'h', text: 'Booking Confirmed', type: 1, pivotal: true, why: 'Pivotal: the end of selling and the start of everything after. Disruption only cares about confirmed bookings.' },
    { id: 'i', text: 'Meal Preference Updated', type: 1, pivotal: false, why: 'A real event, but minor: nothing changes phase. Not pivotal.' },
  ];
  const rows = document.getElementById('rows');
  rows.innerHTML = ITEMS.map((it) =>
    '<div class="row"><div><span class="sticky" id="st-' + it.id + '">' + it.text + '</span><div class="fb" id="fb-' + it.id + '"></div></div>' +
    '<select id="s-' + it.id + '">' + TYPES.map((o, i) => '<option value="' + i + '">' + o + '</option>').join('') + '</select>' +
    '<label><input type="checkbox" id="p-' + it.id + '"> pivotal</label></div>'
  ).join('');
  const paint = (it) => {
    const v = +document.getElementById('s-' + it.id).value;
    document.getElementById('st-' + it.id).style.background = COLOR[v] || '#f3efe6';
  };
  for (const it of ITEMS) {
    const p = PRESET[it.id];
    if (p) {
      document.getElementById('s-' + it.id).value = p.type;
      document.getElementById('p-' + it.id).checked = !!p.pivotal;
    }
    paint(it);
    document.getElementById('s-' + it.id).addEventListener('change', () => paint(it));
  }

  document.getElementById('check').onclick = () => {
    let right = 0;
    for (const it of ITEMS) {
      const v = +document.getElementById('s-' + it.id).value;
      const piv = document.getElementById('p-' + it.id).checked;
      const fb = document.getElementById('fb-' + it.id);
      const typeOk = v === it.type;
      const pivOk = piv === !!it.pivotal;
      if (typeOk && pivOk) {
        right++;
        fb.innerHTML = '<span class="ok">✓ ' + it.why + '</span>';
      } else if (v === 0) {
        fb.innerHTML = '<span class="no">Pick a type.</span>';
      } else if (!typeOk) {
        fb.innerHTML = '<span class="no">✗ Not a ' + TYPES[v].toLowerCase() + '. ' + it.why + '</span>';
      } else if (piv && it.type !== 1) {
        fb.innerHTML = '<span class="no">✗ Type is right, but only domain events can be pivotal.</span>';
      } else {
        fb.innerHTML = '<span class="no">✗ Type is right; check the pivotal box. ' + it.why + '</span>';
      }
    }
    document.getElementById('sum').innerHTML = right === ITEMS.length
      ? '<span class="ok">✅ All ' + right + ' correct. You can read an Event Storming wall.</span>'
      : '<span class="no">' + right + ' / ' + ITEMS.length + ' correct.</span>';
  };
</script>`,
      hint: 'Past tense = event. Imperative verb = command. A person = actor. "Whenever… then…" = policy. Outside SkyHop = external system. Something you look at = read model. A question = hotspot. Pivotal events change the phase of the story.',
      solution: '__SOLUTION__',
    },
  },

  // ───────────────────────────────────────────────────────────── finding-boundaries
  {
    id: 'finding-boundaries',
    section: 'Strategic Design',
    title: 'Finding boundaries: teams, Conway\'s law & heuristics',
    explain: `
      <p>There is no algorithm that outputs "the right" bounded contexts. There are good <strong>heuristics</strong>,
      and when several of them point at the same line, it's probably a good boundary.</p>

      <h3>Heuristics that work</h3>
      <ul>
        <li><strong>Language changes.</strong> When the same word changes meaning ("status", "seat", "passenger") or
        different words mean the same thing, you've crossed a boundary.</li>
        <li><strong>Pivotal events.</strong> <em>Booking Confirmed</em>, <em>Flight Departed</em>: the story changes
        phase, the actors change, the data needed changes.</li>
        <li><strong>Business capabilities.</strong> "Sell seats", "Get passengers on board", "Recover from disruption".
        Capabilities are stable; org charts and systems change around them.</li>
        <li><strong>Different rates of change.</strong> Pricing rules change weekly; airport codes change yearly. Don't
        bind them together.</li>
        <li><strong>Different consistency needs.</strong> Seat inventory must be exact right now; loyalty points can be
        updated a few minutes later.</li>
        <li><strong>Ownership and team cognitive load.</strong> One team must be able to understand and own a context.
        If a context needs three teams, it's too big or cut wrong.</li>
        <li><strong>Change coupling.</strong> Code that always changes together belongs together. Your git history knows
        this (see the example).</li>
      </ul>

      <h3>Conway's law</h3>
      <p>Melvin Conway, 1968: <em>"Organizations which design systems are constrained to produce designs which are
      copies of the communication structures of these organizations."</em> If SkyHop has a Web team, an API team
      and a DBA team, it will get a system cut into web, API and database layers, and every feature will need all
      three. The <strong>Inverse Conway Maneuver</strong> turns this around: design the team structure to match the
      architecture you want (e.g. one team per bounded context, owning it end to end). Amazon's "two-pizza teams"
      that own services end to end are a well-known example of aligning teams and system boundaries; Skelton &amp;
      Pais' <em>Team Topologies</em> (2019) calls these <em>stream-aligned teams</em>.</p>

      <h3>Common mistakes</h3>
      <table>
        <tr><th>Mistake</th><th>Looks like</th><th>Why it hurts</th></tr>
        <tr><td><strong>Entity services</strong></td><td>PassengerService, FlightService, SeatService, one per table</td>
        <td>Every feature touches several services; "Passenger" becomes a god-object across the network</td></tr>
        <tr><td><strong>Technical layers</strong></td><td>Frontend context, API context, Database context</td>
        <td>Every business change crosses all layers and all teams</td></tr>
        <tr><td><strong>Too small</strong></td><td>A service per command ("CancelBookingService")</td>
        <td>Chatty calls, distributed transactions for one business action</td></tr>
        <tr><td><strong>Too big</strong></td><td>"The Booking platform" that does everything</td>
        <td>Back to the big ball of mud, one deployable for 80 developers</td></tr>
      </table>

      <div class="tip"><strong>Start bigger, split later.</strong> Merging two wrong services is painful; splitting a
      well-modularised module is cheap. Many teams start with a modular monolith: Shopify famously kept its Rails
      monolith and split it into components with enforced boundaries (their Packwerk tool), instead of jumping to
      microservices. Uber's "Domain-Oriented Microservice Architecture" (2020) went the other way: it grouped
      thousands of microservices into domains behind gateways because the fine-grained services had become too
      coupled.</div>

      <div class="tip"><strong>In the real world:</strong> boundaries are found iteratively. Teams draw candidate
      contexts after an Event Storming session, test them with upcoming change requests ("which contexts would this
      feature touch?"), and adjust. A boundary that makes every feature cross it is a wrong boundary, however
      elegant it looks on the diagram.</div>
    `,
    examples: [
      {
        title: 'Widget: change-impact simulator (three ways to cut SkyHop)',
        lang: 'html',
        editor: false,
        code: `<style>
  .fb2 { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .fb2 h3 { margin:0 0 4px; font-size:16px; color:#fff; }
  .fb2 .sub { color:#9aa3b5; margin:0 0 10px; }
  .fb2 .tabs { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px; }
  .fb2 .tabs button { background:#252b36; color:#c9cfdb; border:1px solid #3a4252; border-radius:6px; padding:5px 12px; cursor:pointer; margin:0; }
  .fb2 .tabs button.on { background:#ffd479; color:#1b1f27; border-color:#ffd479; }
  .fb2 .boxes { display:flex; flex-wrap:wrap; gap:8px; margin:8px 0; }
  .fb2 .box { flex:1 1 140px; background:#24324a; border:2px solid #3a4b6b; border-radius:8px; padding:8px; min-height:52px; transition: all .25s; }
  .fb2 .box b { color:#fff; display:block; font-size:13.5px; }
  .fb2 .box small { color:#9aa3b5; }
  .fb2 .box.hit { background:#5a3d1a; border-color:#ffb347; }
  .fb2 .reqs { display:grid; gap:6px; }
  .fb2 .req { display:grid; grid-template-columns: 1fr 70px; align-items:center; background:#252b36; border:1px solid #333b4a; border-radius:8px; padding:7px 10px; cursor:pointer; }
  .fb2 .req.on { border-color:#ffd479; }
  .fb2 .req .n { text-align:right; font-weight:700; }
  .fb2 .sum { margin-top:10px; background:#14171d; border-radius:8px; padding:8px 12px; }
  .fb2 .good { color:#6fdc8c; } .fb2 .bad { color:#ff8a80; } .fb2 .mid { color:#ffd479; }
</style>
<div class="fb2">
  <h3>How many teams does each change touch?</h3>
  <p class="sub">Pick a way to split the system, then click each change request. Orange boxes are the contexts (and teams) that must change and coordinate.</p>
  <div class="tabs" id="tabs"></div>
  <div class="boxes" id="boxes"></div>
  <div class="reqs" id="reqs"></div>
  <div class="sum" id="sum"></div>
</div>
<script>
  const SPLITS = {
    entity: { name: 'A · By entity', note: 'One service per noun/table. Feels natural from an ER diagram.',
      boxes: { pax: ['Passenger Service', 'all passenger fields'], flight: ['Flight Service', 'flights, times'], seat: ['Seat Service', 'seat map, assignments'], pay: ['Payment Service', 'charges, refunds'] },
      hits: [['pax', 'pay'], ['pax', 'flight', 'seat'], ['pax', 'flight', 'seat', 'pay'], ['flight', 'pax']],
      verdict: 'Every rule involves several nouns, so every change crosses services. "Passenger" grows into a networked god-object.' },
    layer: { name: 'B · By technical layer', note: 'One team per layer: the classic Conway outcome of a web/API/DB org chart.',
      boxes: { web: ['Web & App team', 'all screens'], api: ['API team', 'all endpoints & logic'], db: ['Database team', 'all tables'] },
      hits: [['web', 'api', 'db'], ['web', 'api', 'db'], ['web', 'api', 'db'], ['web', 'api']],
      verdict: 'Every business change needs every team. Releases wait for the slowest one. Conway\\'s law in action.' },
    capability: { name: 'C · By business capability', note: 'Bounded contexts around what the business does, each owned end to end (UI, logic, data) by one team.',
      boxes: { booking: ['Booking', 'sell & change bookings'], checkin: ['Check-in & Boarding', 'documents, boarding'], loyalty: ['Loyalty', 'members, tiers, points'], disruption: ['Disruption Mgmt', 'IROP rebooking'] },
      hits: [['booking'], ['checkin'], ['disruption', 'booking'], ['checkin']],
      verdict: 'Most changes stay inside one context. The one that crosses (partner rebooking) uses Booking\\'s published API, a planned Customer/Supplier relationship.' },
  };
  const REQS = [
    'Infants get their first checked bag free',
    'Gold members board first',
    'Rebook cancelled passengers onto a partner airline',
    'Check-in opens 48h before long-haul flights',
  ];
  let split = 'entity', req = 0;
  const $ = (id) => document.getElementById(id);

  function render() {
    const s = SPLITS[split];
    $('tabs').innerHTML = Object.entries(SPLITS).map(([k, v]) => '<button data-k="' + k + '" class="' + (k === split ? 'on' : '') + '">' + v.name + '</button>').join('');
    const hit = new Set(s.hits[req]);
    $('boxes').innerHTML = '<div style="width:100%;color:#9aa3b5;font-size:12.5px">' + s.note + '</div>' +
      Object.entries(s.boxes).map(([k, b]) => '<div class="box ' + (hit.has(k) ? 'hit' : '') + '"><b>' + b[0] + '</b><small>' + b[1] + '</small></div>').join('');
    $('reqs').innerHTML = REQS.map((r, i) => {
      const n = s.hits[i].length;
      const cls = n === 1 ? 'good' : n === 2 ? 'mid' : 'bad';
      return '<div class="req ' + (i === req ? 'on' : '') + '" data-i="' + i + '"><span>' + (i + 1) + '. ' + r + '</span><span class="n ' + cls + '">' + n + ' team' + (n > 1 ? 's' : '') + '</span></div>';
    }).join('');
    const total = s.hits.reduce((a, h) => a + h.length, 0);
    const single = s.hits.filter((h) => h.length === 1).length;
    $('sum').innerHTML = '<b>' + s.name + '</b>: ' + total + ' team-touches for 4 changes, ' + single + ' of 4 changes stay inside one team.<br>' +
      '<span style="color:#c9cfdb">' + s.verdict + '</span>';
  }
  $('tabs').addEventListener('click', (e) => { if (e.target.dataset.k) { split = e.target.dataset.k; render(); } });
  $('reqs').addEventListener('click', (e) => { const r = e.target.closest('.req'); if (r) { req = +r.dataset.i; render(); } });
  render();
</script>`,
      },
      {
        title: 'Change coupling: let git history suggest boundaries',
        code: `// Files that change together belong together. Here SkyHop's code is organised by
// technical layer (controllers/ models/ services/). What does the history say?
const commits = [
  ['controllers/booking.js', 'models/Booking.js', 'services/fees.js'],
  ['models/Booking.js', 'services/fees.js'],
  ['controllers/booking.js', 'services/fees.js', 'models/Passenger.js'],
  ['controllers/checkin.js', 'services/boarding.js', 'models/Passenger.js'],
  ['services/boarding.js', 'controllers/checkin.js'],
  ['controllers/checkin.js', 'services/boarding.js', 'models/Passenger.js'],
  ['models/LoyaltyAccount.js', 'services/points.js'],
  ['services/points.js', 'models/LoyaltyAccount.js', 'models/Passenger.js'],
  ['models/Booking.js', 'controllers/booking.js'],
  ['services/points.js', 'models/LoyaltyAccount.js'],
];

// ① count how often each file and each pair changes
const changes = new Map();
const pairs = new Map();
for (const files of commits) {
  for (const f of files) changes.set(f, (changes.get(f) || 0) + 1);
  for (let i = 0; i < files.length; i++) {
    for (let j = i + 1; j < files.length; j++) {
      const key = [files[i], files[j]].sort().join(' + ');
      pairs.set(key, (pairs.get(key) || 0) + 1);
    }
  }
}

// ② coupling = co-changes / changes of the less-changed file (0..1)
const coupling = [...pairs].map(([key, n]) => {
  const [a, b] = key.split(' + ');
  return { a, b, score: n / Math.min(changes.get(a), changes.get(b)) };
});

// ③ group strongly coupled files with a tiny union-find
const THRESHOLD = 0.6;
const parent = new Map([...changes.keys()].map((f) => [f, f]));
const find = (f) => (parent.get(f) === f ? f : find(parent.get(f)));
for (const { a, b, score } of coupling) {
  if (score >= THRESHOLD) parent.set(find(a), find(b));
}
const groups = new Map();
for (const f of changes.keys()) {
  const root = find(f);
  groups.set(root, [...(groups.get(root) || []), f]);
}

console.log('clusters by change coupling (score >= ' + THRESHOLD + '):');
for (const files of groups.values()) console.log('  •', files.sort().join(', '));

// ④ who keeps showing up everywhere?
const partners = (f) => new Set(coupling.filter((c) => c.a === f || c.b === f)
  .map((c) => (c.a === f ? c.b : c.a).split('/')[1].replace('.js', '')));
console.log('models/Passenger.js changes with:', [...partners('models/Passenger.js')].join(', '));
console.log('→ each cluster cuts across controllers/, models/, services/: the folders are layers,',
  'the clusters are capabilities (booking, check-in, loyalty).');
console.log('→ Passenger.js couples to every cluster: a shared god-model. Split it per context.');`,
        explain: `
          <details>
            <summary>What the analysis does</summary>
            <ol>
              <li><strong>①</strong> For each commit, count each file and each pair of files changed together.</li>
              <li><strong>②</strong> Coupling of a pair = how often they changed together ÷ how often the less-active one changed.
              <code>1.0</code> means "every time B changed, A changed too".</li>
              <li><strong>③</strong> Merge files whose coupling is at least 0.6 into clusters (union-find). Each cluster is a
              candidate module or context.</li>
              <li><strong>④</strong> A file coupled to every cluster is a red flag: a shared model everyone has to touch.</li>
            </ol>
          </details>
          <details>
            <summary>Reading the output</summary>
            <pre><code>clusters by change coupling (score &gt;= 0.6):
  • controllers/booking.js, models/Booking.js, services/fees.js
  • controllers/checkin.js, models/Passenger.js, services/boarding.js
  • models/LoyaltyAccount.js, services/points.js
models/Passenger.js changes with: booking, fees, checkin, boarding, points, LoyaltyAccount</code></pre>
            <p>The three clusters are <strong>business capabilities</strong> (Booking, Check-in, Loyalty), and each one cuts
            across the technical folders. That's the history telling you the code is organised by the wrong axis.
            <code>Passenger.js</code> lands in the check-in cluster (it changes most with check-in), but it also couples to
            booking and loyalty files: the shared god-model from the bounded-contexts lesson, found by data.</p>
            <div class="tip">On a real repo, <code>git log --name-only --format=</code> gives you the commit/file lists.
            Tools like CodeScene do this analysis at scale. Treat results as hints to discuss with the team, not as an
            answer.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Lower <code>THRESHOLD</code> to <code>0.3</code>. All eight files collapse into one cluster, glued together through <code>Passenger.js</code>: the god-model makes unrelated capabilities look like one.</li>
              <li>Add a commit <code>['models/LoyaltyAccount.js', 'controllers/checkin.js']</code> three times and re-run. A new
              coupling appears: ask the team why loyalty changes keep touching check-in (maybe "Gold boards first").</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'SkyHop splits its monolith into PassengerService, FlightService, SeatService and PaymentService. Six months later, every feature needs changes in three services. What went wrong?',
        options: [
          'Too few services; split further',
          'Boundaries were drawn around entities (nouns/tables) instead of business capabilities, so rules span services',
          'They should have used a different database',
          'Nothing, this is normal for microservices',
        ],
        answer: 1,
        why: 'Entity services are a classic mistake. Business rules involve several nouns, so cutting by noun splits every rule across services.',
      },
      {
        q: 'SkyHop has a Frontend team, a Backend team and a DBA team. Leadership wants independent bounded contexts. What does the Inverse Conway Maneuver suggest?',
        options: [
          'Keep the teams and add an architecture board',
          'Reorganise into teams that each own a context end to end (UI, logic, data), so the communication structure matches the desired architecture',
          'Move everyone into one big team',
          'Hire more DBAs',
        ],
        answer: 1,
        why: 'Conway\'s law says the system will mirror the org chart. To get capability-aligned contexts, align the teams first.',
      },
      {
        q: 'Pricing rules change weekly; airport reference data changes a few times a year. Both live in one "ReferenceData" module. Which heuristic says to split them?',
        options: [
          'Different rates of change',
          'Pivotal events',
          'Shared kernel',
          'Same database',
        ],
        answer: 0,
        why: 'Things that change at very different speeds, for different reasons, shouldn\'t be bound together.',
      },
      {
        q: 'A new team is unsure whether Check-in and Boarding should be one context or two. What is a sensible default?',
        options: [
          'Two microservices, you can always merge later',
          'One context (well modularised inside) until language, team ownership or change patterns clearly diverge; splitting later is cheaper than merging',
          'Ten nano-services, one per command',
          'Merge them into Booking',
        ],
        answer: 1,
        why: 'Start bigger, split later. Merging two wrongly split services is much harder than extracting a well-separated module.',
      },
    ],
    exercise: {
      lang: 'html',
      editor: false,
      task: `<p>Assign each SkyHop capability in the box below to the bounded context that should own it, then click
      <strong>Check</strong>. Think about language, pivotal events and who does the work.</p>`,
      starter: `<style>
  .bx { font-family:system-ui,-apple-system,'Segoe UI',sans-serif; background:#1b1f27; color:#e6e6e6; border-radius:10px; padding:14px 16px; font-size:14px; }
  .bx h3 { margin:0 0 8px; font-size:16px; color:#fff; }
  .bx .row { display:grid; grid-template-columns: 1fr 210px; gap:10px; align-items:center; padding:7px 0; border-bottom:1px solid #2a303c; }
  .bx select { background:#252b36; color:#e6e6e6; border:1px solid #3a4252; border-radius:6px; padding:5px; width:100%; }
  .bx .btn { background:#3b82f6; color:#fff; border:0; border-radius:6px; padding:6px 14px; cursor:pointer; margin-top:10px; }
  .bx .fb { margin-top:4px; font-size:12.5px; }
  .bx .ok { color:#6fdc8c; } .bx .no { color:#ff8a80; }
  .bx #sum { margin-top:10px; font-weight:600; }
  .bx .counts { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; font-size:12.5px; }
  .bx .counts span { background:#252b36; border-radius:999px; padding:2px 10px; color:#c9cfdb; }
  @media (max-width: 560px) { .bx .row { grid-template-columns: 1fr; } }
</style>
<div class="bx">
  <h3>Who owns it?</h3>
  <div id="rows"></div>
  <div class="counts" id="counts"></div>
  <button class="btn" id="check">Check</button>
  <div id="sum"></div>
</div>
<script>
  const PRESET = {};
  const OPTS = ['— choose —', 'Booking', 'Check-in & Boarding', 'Loyalty', 'Disruption Mgmt'];
  const ITEMS = [
    { id: 'a', text: 'Create a PNR with passengers and flights', ans: 1, why: 'Selling and recording what was bought: Booking.' },
    { id: 'b', text: 'Change the name on a booking (fee applies)', ans: 1, why: 'A change to what was sold, with a fee rule: Booking.' },
    { id: 'c', text: 'Record passport details (APIS) for border control', ans: 2, why: 'Travel documents are needed to fly, not to buy: Check-in & Boarding.' },
    { id: 'd', text: 'Issue a boarding pass', ans: 2, why: 'After the pivotal Booking Confirmed, at the airport: Check-in & Boarding.' },
    { id: 'e', text: 'Scan boarding passes at the gate', ans: 2, why: 'Gate agents, boarding list, gate closing: Check-in & Boarding.' },
    { id: 'f', text: 'Earn points when a passenger has flown', ans: 3, why: 'Members and points are Loyalty language. It reacts to PassengerBoarded / Flight Departed events.' },
    { id: 'g', text: 'Upgrade a member to Gold tier', ans: 3, why: '"Status" in the tier sense only exists in Loyalty.' },
    { id: 'h', text: 'Rebook all passengers of a cancelled flight', ans: 4, why: 'Triggered by the pivotal Flight Cancelled; own rules (priorities, partner flights). It asks Booking to change the bookings through Booking\\'s API.' },
  ];
  const rows = document.getElementById('rows');
  rows.innerHTML = ITEMS.map((it) =>
    '<div class="row"><div>' + it.text + '<div class="fb" id="fb-' + it.id + '"></div></div>' +
    '<select id="s-' + it.id + '">' + OPTS.map((o, i) => '<option value="' + i + '">' + o + '</option>').join('') + '</select></div>'
  ).join('');
  for (const it of ITEMS) if (PRESET[it.id] != null) document.getElementById('s-' + it.id).value = PRESET[it.id];
  function counts() {
    const c = [0, 0, 0, 0, 0];
    for (const it of ITEMS) c[+document.getElementById('s-' + it.id).value]++;
    document.getElementById('counts').innerHTML = OPTS.slice(1).map((o, i) => '<span>' + o + ': ' + c[i + 1] + '</span>').join('');
  }
  rows.addEventListener('change', counts);
  counts();

  document.getElementById('check').onclick = () => {
    let right = 0;
    for (const it of ITEMS) {
      const v = +document.getElementById('s-' + it.id).value;
      const fb = document.getElementById('fb-' + it.id);
      if (v === it.ans) {
        right++;
        fb.innerHTML = '<span class="ok">✓ ' + it.why + '</span>';
      } else if (v === 0) {
        fb.innerHTML = '<span class="no">Pick a context.</span>';
      } else {
        fb.innerHTML = '<span class="no">✗ Not ' + OPTS[v] + '. ' + it.why + '</span>';
      }
    }
    document.getElementById('sum').innerHTML = right === ITEMS.length
      ? '<span class="ok">✅ All ' + right + ' correct. Each context owns a coherent capability.</span>'
      : '<span class="no">' + right + ' / ' + ITEMS.length + ' correct.</span>';
  };
</script>`,
      hint: 'Before Booking Confirmed it\'s Booking. Documents, seats at the airport and the gate are Check-in & Boarding. Members, tiers and points are Loyalty. Anything triggered by Flight Cancelled is Disruption.',
      solution: '__SOLUTION__',
    },
  },
);

// Widget-exercise solutions: the same widget, pre-filled with the right answers and already checked.
(function () {
  const PRESETS = {
    subdomains: "{ promise: 1, pay: 3, returns: 2, tax: 3, slot: 1, catalog: 2, support: 3 }",
    'context-mapping': "{ a: 5, b: 4, c: 1, d: 6, e: 7, f: 3 }",
    'event-storming': "{ a: { type: 1, pivotal: true }, b: { type: 2 }, c: { type: 3 }, d: { type: 4 }, e: { type: 6 }, f: { type: 5 }, g: { type: 7 }, h: { type: 1, pivotal: true }, i: { type: 1 } }",
    'finding-boundaries': "{ a: 1, b: 1, c: 2, d: 2, e: 2, f: 3, g: 3, h: 4 }",
  };
  for (const [id, preset] of Object.entries(PRESETS)) {
    const ex = window.LESSONS.find((l) => l.id === id).exercise;
    ex.solution = ex.starter
      .replace('const PRESET = {};', 'const PRESET = ' + preset + ';')
      .replace("document.getElementById('check').onclick = () => {", 'const runCheck = () => {')
      .replace(/<\/script>$/, "  document.getElementById('check').onclick = runCheck;\n  runCheck();\n</script>");
  }
})();

// Spread correct answers across option positions (deterministic swap, keeps the other options in order).
(function () {
  const ids = ["subdomains","bounded-contexts","context-mapping","anti-corruption-layer","event-storming","finding-boundaries"];
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
