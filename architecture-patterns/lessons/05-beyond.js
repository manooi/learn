window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ==========================================================================
  // LAYERED ARCHITECTURE
  // ==========================================================================
  {
    id: 'layered-architecture',
    section: 'Beyond the UI layer',
    title: 'Layered (n-tier) architecture',
    explain: `
      <p>So far every pattern (MVC, MVP, MVVM, Redux…) has been about <strong>one screen</strong>: how
      the view, the state and the input handling talk to each other. Real apps have much more
      than a screen: business rules, saving to a database, calling servers. Where does all of that go?</p>
      <p>The oldest and most common answer is <strong>layers</strong>. You stack the code in horizontal
      slices, and each slice has one job:</p>
      <table>
        <tr><th>Layer</th><th>Job</th><th>Example code</th></tr>
        <tr><td><strong>Presentation</strong></td><td>Show things, take user input</td>
          <td>Views, controllers, buttons, forms</td></tr>
        <tr><td><strong>Application</strong> (a.k.a. service layer)</td>
          <td>Run one user task from start to finish ("transfer money")</td>
          <td><code>TransferService.transfer()</code></td></tr>
        <tr><td><strong>Domain</strong> (business logic)</td><td>The rules of the business</td>
          <td>"You can't withdraw more than your balance"</td></tr>
        <tr><td><strong>Data access</strong> (persistence)</td><td>Load and save data</td>
          <td>Repositories, SQL, HTTP calls, <code>localStorage</code></td></tr>
      </table>
      <p><strong>Analogy: a restaurant.</strong> The waiter (presentation) takes your order. The shift
      manager (application) turns "table 4 wants pasta" into steps. The chef's recipes (domain)
      decide how pasta is made. The pantry (data access) stores the ingredients. The waiter never
      walks into the pantry, and the recipe book doesn't care which shelf the flour is on.</p>

      <h3>The one rule: dependencies point down</h3>
      <p>A layer may call the layers <em>below</em> it, never the layers above. The presentation layer
      calls the service; the service calls the domain and the data access layer. The data layer
      never calls the UI. That gives you:</p>
      <ul>
        <li><strong>Replaceable top</strong>: you can add a mobile app or a CLI on top of the same
          services.</li>
        <li><strong>Findable code</strong>: "where's the overdraft rule?" → the domain layer.</li>
        <li><strong>Testable middle</strong>: services and rules run without a browser.</li>
      </ul>
      <pre><code>Presentation   (MVC / MVP / MVVM live here)
     │ calls
     ▼
Application    (use-case / service functions)
     │ calls
     ▼
Domain         (business rules)
     │ calls
     ▼
Data access    (database, HTTP, storage)</code></pre>
      <p>"<strong>n-tier</strong>" usually means the layers also run on different machines
      (browser → web server → database server). "Layered" is about how the <em>code</em> is organised,
      even inside one program. People often use the two words loosely.</p>

      <h3>Where does MVC fit?</h3>
      <p>All the patterns from earlier sections live <strong>inside the presentation layer</strong>.
      The "Model" in MVC is often just a thin front for the layers underneath: the controller asks a
      service to do the work, then the view shows the result. MVC is a pattern for the top floor
      of the building, not the whole building.</p>
      <div class="tip"><strong>Strict vs relaxed.</strong> In <em>strict</em> layering each layer
      may call only the one directly below. In <em>relaxed</em> layering a layer may skip down (the
      service in the example calls both the domain and the repository). Most real code is relaxed.</div>
      <div class="warn"><strong>Common pitfalls.</strong> (1) Business rules leak into the UI
      ("the button checks the balance"), so a second UI has to copy them. (2) The domain layer
      depends on the database layer, so you can't test a rule without a database. The next two
      lessons (Hexagonal and Clean) exist mostly to fix pitfall 2.</div>
    `,
    examples: [
      {
        title: 'A tiny bank in four layers',
        code: `// A tiny bank split into 4 layers. Each layer only calls layers BELOW it.

// ===== DATA ACCESS LAYER (talks to storage) =====
const fakeDatabase = { alice: 100, bob: 20 };

const AccountRepository = {
  find(id) {
    console.log('[Repository] SELECT ' + id);
    return { id, balance: fakeDatabase[id] };
  },
  findAll() {
    console.log('[Repository] SELECT all accounts');
    return { ...fakeDatabase };
  },
  save(account) {
    console.log('[Repository] UPDATE ' + account.id + ' = ' + account.balance);
    fakeDatabase[account.id] = account.balance;
  },
};

// ===== DOMAIN LAYER (business rules: no DOM, no storage) =====
const Domain = {
  withdraw(account, amount) {
    if (!(amount > 0)) throw new Error('Amount must be positive');
    if (amount > account.balance) throw new Error('Insufficient funds');
    const balance = account.balance - amount;
    console.log('[Domain] ' + account.id + ': ' + account.balance + ' → ' + balance);
    return { ...account, balance };
  },
  deposit(account, amount) {
    const balance = account.balance + amount;
    console.log('[Domain] ' + account.id + ': ' + account.balance + ' → ' + balance);
    return { ...account, balance };
  },
};

// ===== APPLICATION (SERVICE) LAYER (one user task, start to finish) =====
const TransferService = {
  transfer(fromId, toId, amount) {
    console.log('[Service] transfer ' + amount + ' ' + fromId + ' → ' + toId);
    const from = AccountRepository.find(fromId);
    const to = AccountRepository.find(toId);
    const newFrom = Domain.withdraw(from, amount); // may throw: nothing saved yet
    const newTo = Domain.deposit(to, amount);
    AccountRepository.save(newFrom);
    AccountRepository.save(newTo);
  },
  getBalances() {
    return AccountRepository.findAll();
  },
};

// ===== PRESENTATION LAYER (a small MVC-ish view + controller) =====
const root = document.getElementById('root');
const balancesEl = document.createElement('p');
const amountInput = document.createElement('input');
amountInput.type = 'number';
amountInput.value = '30';
amountInput.style.width = '70px';
const aToB = document.createElement('button');
aToB.textContent = 'Alice → Bob';
const bToA = document.createElement('button');
bToA.textContent = 'Bob → Alice';
const messageEl = document.createElement('p');
root.append(balancesEl, amountInput, aToB, bToA, messageEl);

function render(message) {
  const b = TransferService.getBalances();
  console.log('[Presentation] render alice=' + b.alice + ' bob=' + b.bob);
  balancesEl.textContent = 'Alice: $' + b.alice + ' · Bob: $' + b.bob;
  messageEl.textContent = message;
}

function onTransfer(fromId, toId) {
  const amount = Number(amountInput.value);
  console.log('[Presentation] click ' + fromId + ' → ' + toId + ', ' + amount);
  try {
    TransferService.transfer(fromId, toId, amount);
    render('Done!');
  } catch (e) {
    console.log('[Presentation] error: ' + e.message);
    render('Error: ' + e.message);
  }
}

aToB.addEventListener('click', () => onTransfer('alice', 'bob'));
bToA.addEventListener('click', () => onTransfer('bob', 'alice'));
render('');`,
        explain: `
          <details>
            <summary>Step by step: one click on "Alice → Bob" (amount 30)</summary>
            <p>On load you see <code>[Repository] SELECT all accounts</code> and
            <code>[Presentation] render alice=100 bob=20</code>. Then one click produces:</p>
            <table>
              <tr><th>#</th><th>Layer</th><th>Console</th></tr>
              <tr><td>1</td><td>Presentation</td><td><code>[Presentation] click alice → bob, 30</code></td></tr>
              <tr><td>2</td><td>Application</td><td><code>[Service] transfer 30 alice → bob</code></td></tr>
              <tr><td>3</td><td>Data access</td><td><code>[Repository] SELECT alice</code></td></tr>
              <tr><td>4</td><td>Data access</td><td><code>[Repository] SELECT bob</code></td></tr>
              <tr><td>5</td><td>Domain</td><td><code>[Domain] alice: 100 → 70</code></td></tr>
              <tr><td>6</td><td>Domain</td><td><code>[Domain] bob: 20 → 50</code></td></tr>
              <tr><td>7</td><td>Data access</td><td><code>[Repository] UPDATE alice = 70</code></td></tr>
              <tr><td>8</td><td>Data access</td><td><code>[Repository] UPDATE bob = 50</code></td></tr>
              <tr><td>9</td><td>Data access</td><td><code>[Repository] SELECT all accounts</code></td></tr>
              <tr><td>10</td><td>Presentation</td><td><code>[Presentation] render alice=70 bob=50</code></td></tr>
            </table>
            <p>Notice the direction: the calls go <strong>down</strong> (presentation → service →
            domain / repository) and only <em>return values</em> come back up. No lower layer ever
            calls <code>render</code>.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Keep clicking "Alice → Bob". Alice goes 70, 40, 10; on the 4th click she has only
              $10, so <code>Domain.withdraw</code> throws. You'll see
              <code>[Presentation] error: Insufficient funds</code> and <strong>no UPDATE lines</strong>:
              the service runs both rules before it saves anything.</li>
              <li>Type <code>-5</code> as the amount. The rule "Amount must be positive" lives in the
              domain, so <em>any</em> future UI (mobile, CLI) gets it for free.</li>
            </ul>
            <div class="warn">The tempting shortcut is to disable the button in the UI when the
            balance is too low and skip the domain check. Do both if you like, but the
            <em>rule</em> must live in the domain. The UI check is just a convenience.</div>
          </details>
        `,
      },
      {
        title: 'Diagram: a request travelling through the layers',
        lang: 'html',
        code: `<style>
  .stack { display: flex; flex-direction: column; gap: 6px; max-width: 420px; }
  .layer { border: 2px solid #c5c9d6; border-radius: 8px; padding: 6px 10px; }
  .layer small { color: #666; }
  .layer.on { border-color: #4f6bed; background: #eef1ff; }
  #note { min-height: 3em; margin-top: 8px; }
</style>
<div class="stack">
  <div class="layer" id="L0"><b>Presentation</b> <small>MVC lives here</small></div>
  <div class="layer" id="L1"><b>Application / Service</b> <small>TransferService</small></div>
  <div class="layer" id="L2"><b>Domain</b> <small>withdraw / deposit rules</small></div>
  <div class="layer" id="L3"><b>Data access</b> <small>AccountRepository</small></div>
</div>
<p id="note">Press "Next step" to follow one click on "Alice → Bob".</p>
<button id="next">Next step</button>
<button id="reset">Reset</button>
<script>
  const steps = [
    [0, '↓ The user clicks. The controller reads the amount and calls the service.'],
    [1, '↓ TransferService.transfer() plans the task: load, apply rules, save.'],
    [3, '↓ It asks the repository to load both accounts.'],
    [2, '↓ It asks the domain to apply the rules (withdraw, deposit).'],
    [3, '↓ It asks the repository to save both new balances.'],
    [1, '↑ transfer() returns. Nothing below ever called up; only return values came back.'],
    [0, '↑ The presentation layer re-renders with the new balances.'],
  ];
  let i = 0;
  const note = document.getElementById('note');
  function show() {
    document.querySelectorAll('.layer').forEach(el => el.classList.remove('on'));
    if (i === 0) {
      note.textContent = 'Press "Next step" to follow one click on "Alice → Bob".';
      return;
    }
    const [layer, text] = steps[i - 1];
    document.getElementById('L' + layer).classList.add('on');
    note.textContent = 'Step ' + i + '/' + steps.length + ': ' + text;
  }
  document.getElementById('next').onclick = () => {
    i = Math.min(i + 1, steps.length);
    show();
  };
  document.getElementById('reset').onclick = () => {
    i = 0;
    show();
  };
</script>`,
      },
    ],
    quiz: [
      {
        q: 'In a layered architecture, which direction may calls go?',
        options: [
          'Any layer may call any other layer',
          'Downwards only: a layer calls layers below it',
          'Upwards only: the database notifies the UI',
          'Only between neighbouring layers, in both directions',
        ],
        answer: 1,
        why: 'The core rule is "dependencies point down". Lower layers never call the ones above. They just return values.',
      },
      {
        q: 'Where does MVC (or MVP / MVVM) usually sit in a layered app?',
        options: [
          'It replaces all four layers',
          'In the data access layer',
          'In the presentation layer',
          'In the domain layer',
        ],
        answer: 2,
        why: 'UI patterns organise the top layer: how the screen, its state and input handling talk to each other. Services, rules and storage live below.',
      },
      {
        q: 'The rule "a transfer can\'t exceed the balance" belongs in…',
        options: [
          'the button\'s click handler',
          'the domain layer',
          'the SQL query',
          'the CSS (disable the button)',
        ],
        answer: 1,
        why: 'It is a business rule. In the domain layer every UI and every service reuses it, and it can be tested without a browser.',
      },
      {
        q: 'What weakness of the classic layered picture do Hexagonal and Clean architecture try to fix?',
        options: [
          'It has too few layers',
          'Business logic ends up depending on the database layer below it',
          'It cannot be used with JavaScript',
          'It forbids having a service layer',
        ],
        answer: 1,
        why: 'If the domain sits "above" data access, it depends on it. Then you can\'t test or reuse the rules without the database. The next lessons turn that arrow around.',
      },
    ],
    exercise: {
      task: `<p>The bank wants a new rule: <strong>a single transfer may not be more than $50</strong>.</p>
        <ol>
          <li>Add the rule in the <strong>right layer</strong> (not in the presentation code!). If it
          fails, throw <code>new Error('Limit is $50 per transfer')</code>.</li>
          <li>Check it: the amount is already 60, so click. The UI should show
          <code>Error: Limit is $50 per transfer</code> and the console should show no UPDATE lines.</li>
        </ol>`,
      starter: `// ===== DATA ACCESS =====
const fakeDatabase = { alice: 100, bob: 20 };
const AccountRepository = {
  find(id) {
    console.log('[Repository] SELECT ' + id);
    return { id, balance: fakeDatabase[id] };
  },
  save(account) {
    console.log('[Repository] UPDATE ' + account.id + ' = ' + account.balance);
    fakeDatabase[account.id] = account.balance;
  },
};

// ===== DOMAIN =====
const Domain = {
  withdraw(account, amount) {
    if (!(amount > 0)) throw new Error('Amount must be positive');
    if (amount > account.balance) throw new Error('Insufficient funds');
    // TODO: add the $50 limit rule here
    return { ...account, balance: account.balance - amount };
  },
  deposit(account, amount) {
    return { ...account, balance: account.balance + amount };
  },
};

// ===== SERVICE =====
const TransferService = {
  transfer(fromId, toId, amount) {
    console.log('[Service] transfer ' + amount + ' ' + fromId + ' → ' + toId);
    const newFrom = Domain.withdraw(AccountRepository.find(fromId), amount);
    const newTo = Domain.deposit(AccountRepository.find(toId), amount);
    AccountRepository.save(newFrom);
    AccountRepository.save(newTo);
  },
};

// ===== PRESENTATION =====
const root = document.getElementById('root');
const amountInput = document.createElement('input');
amountInput.type = 'number';
amountInput.value = '60';
const button = document.createElement('button');
button.textContent = 'Alice → Bob';
const messageEl = document.createElement('p');
root.append(amountInput, button, messageEl);

button.addEventListener('click', () => {
  try {
    TransferService.transfer('alice', 'bob', Number(amountInput.value));
    messageEl.textContent = 'Done! Alice $' + fakeDatabase.alice + ', Bob $' + fakeDatabase.bob;
  } catch (e) {
    messageEl.textContent = 'Error: ' + e.message;
  }
});`,
      hint: 'The rule is about money leaving an account, so it fits next to the other checks in Domain.withdraw. Because the service calls withdraw before any save(), a thrown error means nothing is saved.',
      solution: `// ===== DATA ACCESS =====
const fakeDatabase = { alice: 100, bob: 20 };
const AccountRepository = {
  find(id) {
    console.log('[Repository] SELECT ' + id);
    return { id, balance: fakeDatabase[id] };
  },
  save(account) {
    console.log('[Repository] UPDATE ' + account.id + ' = ' + account.balance);
    fakeDatabase[account.id] = account.balance;
  },
};

// ===== DOMAIN =====
const TRANSFER_LIMIT = 50;

const Domain = {
  withdraw(account, amount) {
    if (!(amount > 0)) throw new Error('Amount must be positive');
    if (amount > account.balance) throw new Error('Insufficient funds');
    if (amount > TRANSFER_LIMIT) {
      throw new Error('Limit is $' + TRANSFER_LIMIT + ' per transfer');
    }
    return { ...account, balance: account.balance - amount };
  },
  deposit(account, amount) {
    return { ...account, balance: account.balance + amount };
  },
};

// ===== SERVICE =====
const TransferService = {
  transfer(fromId, toId, amount) {
    console.log('[Service] transfer ' + amount + ' ' + fromId + ' → ' + toId);
    const newFrom = Domain.withdraw(AccountRepository.find(fromId), amount);
    const newTo = Domain.deposit(AccountRepository.find(toId), amount);
    AccountRepository.save(newFrom);
    AccountRepository.save(newTo);
  },
};

// ===== PRESENTATION =====
const root = document.getElementById('root');
const amountInput = document.createElement('input');
amountInput.type = 'number';
amountInput.value = '60';
const button = document.createElement('button');
button.textContent = 'Alice → Bob';
const messageEl = document.createElement('p');
root.append(amountInput, button, messageEl);

button.addEventListener('click', () => {
  try {
    TransferService.transfer('alice', 'bob', Number(amountInput.value));
    messageEl.textContent = 'Done! Alice $' + fakeDatabase.alice + ', Bob $' + fakeDatabase.bob;
  } catch (e) {
    messageEl.textContent = 'Error: ' + e.message;
  }
});`,
    },
  },

  // ==========================================================================
  // HEXAGONAL
  // ==========================================================================
  {
    id: 'hexagonal',
    section: 'Beyond the UI layer',
    title: 'Hexagonal: Ports & Adapters',
    explain: `
      <p>The layered picture has a weak spot: the business logic sits <em>on top of</em> the
      database layer, so it depends on it. Change the database, and the logic may have to change.
      Try to test a rule, and you need a database.</p>
      <p><strong>Hexagonal architecture</strong>, also called <strong>Ports &amp; Adapters</strong>,
      was described by <strong>Alistair Cockburn</strong> (his well-known write-up is usually dated
      to about 2005). The idea: put the application <strong>in the middle</strong>, and treat
      <em>everything</em> else (the UI, tests, the database, email, other servers) as the outside
      world that plugs into it.</p>

      <h3>Ports and adapters</h3>
      <ul>
        <li>A <strong>port</strong> is a socket in the wall of the app: an interface the app
          <em>defines</em>, in its own words. "I need something that can <code>save(note)</code> and
          give me <code>all()</code> notes."</li>
        <li>An <strong>adapter</strong> is a plug that fits the socket and translates to a real
          technology: an in-memory array, <code>localStorage</code>, an HTTP API, a DOM form, a
          command line.</li>
      </ul>
      <p><strong>Analogy: travel adapters.</strong> Your laptop (the app) has one kind of plug. In
      each country you use a different adapter to reach the local wall socket. The laptop never
      changes. In software, you swap adapters (real database in production, fake in tests) and the
      core never changes.</p>

      <h3>Two sides of the hexagon</h3>
      <table>
        <tr><th></th><th>Driving side (primary, "left")</th><th>Driven side (secondary, "right")</th></tr>
        <tr><td>Who starts the conversation?</td><td>The outside world calls the app</td>
          <td>The app calls the outside world</td></tr>
        <tr><td>Examples</td><td>DOM UI, CLI, tests, HTTP controllers</td>
          <td>Database, <code>localStorage</code>, HTTP client, email sender</td></tr>
        <tr><td>The port is…</td><td>the app's public API (<code>addNote</code>, <code>listNotes</code>)</td>
          <td>an interface the app needs (<code>save</code>, <code>all</code>)</td></tr>
        <tr><td>Who depends on whom?</td><td>Adapter → core (it calls the core)</td>
          <td>Adapter → core (it implements the core's port)</td></tr>
      </table>
      <p>The last row is the whole trick: on <strong>both</strong> sides the arrows point
      <strong>at the core</strong>. The core knows no adapter by name.</p>
      <div class="tip">Why a hexagon? Cockburn has said the shape just leaves room to draw several
      ports around the app. There is nothing special about six sides.</div>
      <div class="warn">JavaScript has no <code>interface</code> keyword, so a port is just an
      agreed <strong>shape</strong> (which methods exist and what they return). Write it down in a
      comment next to the core, like the example does. TypeScript lets you make it a real
      <code>interface</code>.</div>
    `,
    examples: [
      {
        title: 'Swap adapters, keep the core',
        code: `// ===== CORE (the hexagon): knows NO adapter by name =====
// Driven port, defined by the core, implemented by storage adapters:
//   store.save(note)  -> nothing
//   store.all()       -> array of { id, text }
function createNotesApp(store) {
  let nextId = store.all().length + 1;

  // Driving port: what the outside world may ask the app to do
  return {
    addNote(text) {
      const clean = text.trim();
      if (!clean) {
        console.log('[Core] rejected empty note');
        return { ok: false, error: 'Note cannot be empty' };
      }
      const note = { id: nextId++, text: clean };
      console.log('[Core] addNote ' + JSON.stringify(clean));
      store.save(note);
      return { ok: true, note };
    },
    listNotes() {
      return store.all();
    },
  };
}

// ===== DRIVEN ADAPTERS (storage) =====
function createMemoryStore() {
  const notes = []; // lives only as long as this adapter
  return {
    save(note) {
      notes.push(note);
      console.log('[Adapter:memory] pushed note #' + note.id);
    },
    all() {
      return notes.slice();
    },
  };
}

// A pretend localStorage (the real one is blocked in this sandbox)
const fakeLocalStorage = {
  data: {},
  getItem(key) {
    return key in this.data ? this.data[key] : null;
  },
  setItem(key, value) {
    this.data[key] = String(value);
  },
};

function createLocalStorageStore() {
  const read = () => JSON.parse(fakeLocalStorage.getItem('notes') || '[]');
  return {
    save(note) {
      const notes = read();
      notes.push(note);
      fakeLocalStorage.setItem('notes', JSON.stringify(notes));
      console.log('[Adapter:localStorage] setItem notes (' + notes.length + ' saved)');
    },
    all() {
      return read();
    },
  };
}

// A pretend server behind an HTTP API
const fakeServerRows = [];

function createHttpStore() {
  return {
    save(note) {
      console.log('[Adapter:http] POST /api/notes ' + JSON.stringify(note));
      fakeServerRows.push({ ...note });
    },
    all() {
      console.log('[Adapter:http] GET /api/notes');
      return fakeServerRows.map(row => ({ ...row }));
    },
  };
}

// ===== DRIVING ADAPTERS (UIs) =====
function mountDomUI(app, host) {
  const input = document.createElement('input');
  input.placeholder = 'New note';
  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  const error = document.createElement('div');
  error.style.color = '#c00';
  const list = document.createElement('ul');
  host.append(input, addBtn, error, list);

  function renderList() {
    list.innerHTML = '';
    for (const note of app.listNotes()) {
      const li = document.createElement('li');
      li.textContent = '#' + note.id + ' ' + note.text;
      list.append(li);
    }
  }

  addBtn.addEventListener('click', () => {
    console.log('[Adapter:DOM] click Add ' + JSON.stringify(input.value));
    const result = app.addNote(input.value);
    error.textContent = result.ok ? '' : result.error;
    if (result.ok) input.value = '';
    renderList();
  });
  renderList();
}

function mountCliUI(app, host) {
  const input = document.createElement('input');
  input.placeholder = 'add Buy milk  |  list';
  input.style.width = '220px';
  const runBtn = document.createElement('button');
  runBtn.textContent = 'Run command';
  const help = document.createElement('p');
  help.textContent = 'This UI answers in the console only.';
  host.append(input, runBtn, help);

  runBtn.addEventListener('click', () => {
    const line = input.value.trim();
    console.log('[Adapter:CLI] > ' + line);
    if (line.startsWith('add')) {
      const result = app.addNote(line.slice(3));
      console.log('[Adapter:CLI] ' + (result.ok ? 'saved #' + result.note.id : result.error));
    } else if (line === 'list') {
      const notes = app.listNotes();
      console.log('[Adapter:CLI] ' + notes.length + ' note(s)');
      notes.forEach(n => console.log('[Adapter:CLI]   #' + n.id + ' ' + n.text));
    } else {
      console.log('[Adapter:CLI] unknown command (try "add ..." or "list")');
    }
    input.value = '';
  });
}

// ===== COMPOSITION ROOT: the only place that picks adapters =====
const STORES = {
  memory: createMemoryStore,
  localStorage: createLocalStorageStore,
  http: createHttpStore,
};
const UIS = { DOM: mountDomUI, CLI: mountCliUI };

const root = document.getElementById('root');
root.innerHTML =
  '<label>Storage <select id="store">' +
  '<option>memory</option><option>localStorage</option><option>http</option>' +
  '</select></label> <label>UI <select id="ui">' +
  '<option>DOM</option><option>CLI</option></select></label><hr><div id="host"></div>';

const storeSelect = document.getElementById('store');
const uiSelect = document.getElementById('ui');
const host = document.getElementById('host');

function wire() {
  host.innerHTML = '';
  const store = STORES[storeSelect.value]();
  const app = createNotesApp(store); // the same core every time
  const names = storeSelect.value + ' store + ' + uiSelect.value + ' UI';
  console.log('[Main] core wired with ' + names);
  UIS[uiSelect.value](app, host);
}

storeSelect.addEventListener('change', wire);
uiSelect.addEventListener('change', wire);
wire();`,
        explain: `
          <details>
            <summary>Driving vs driven: who calls whom here?</summary>
            <table>
              <tr><th>Piece</th><th>Side</th><th>Calls…</th><th>Knows about…</th></tr>
              <tr><td><code>mountDomUI</code>, <code>mountCliUI</code></td><td>Driving</td>
                <td><code>app.addNote</code>, <code>app.listNotes</code></td><td>the core's API</td></tr>
              <tr><td><code>createNotesApp</code></td><td>Core</td>
                <td><code>store.save</code>, <code>store.all</code></td>
                <td>only the <em>shape</em> of <code>store</code></td></tr>
              <tr><td><code>createMemoryStore</code>, <code>createLocalStorageStore</code>,
                <code>createHttpStore</code></td><td>Driven</td>
                <td>an array, fake storage, a fake server</td><td>the port shape (it implements it)</td></tr>
              <tr><td><code>wire()</code></td><td>Composition root</td><td>everything</td>
                <td>everything: this is the one place allowed to</td></tr>
            </table>
            <p>Search the core for <code>memory</code>, <code>http</code> or <code>document</code>:
            nothing. The core only receives a <code>store</code> argument and uses <code>save</code> /
            <code>all</code>. That is what "the core owns the port" means.</p>
          </details>
          <details>
            <summary>Step by step: type "Buy milk", click Add (memory, then http)</summary>
            <p>On load: <code>[Main] core wired with memory store + DOM UI</code>.</p>
            <table>
              <tr><th>#</th><th>Who</th><th>Console (memory store)</th><th>Console (http store)</th></tr>
              <tr><td>1</td><td>Driving adapter</td>
                <td colspan="2"><code>[Adapter:DOM] click Add "Buy milk"</code></td></tr>
              <tr><td>2</td><td>Core</td><td colspan="2"><code>[Core] addNote "Buy milk"</code></td></tr>
              <tr><td>3</td><td>Driven adapter (<code>save</code>)</td>
                <td><code>[Adapter:memory] pushed note #1</code></td>
                <td><code>[Adapter:http] POST /api/notes {"id":1,"text":"Buy milk"}</code></td></tr>
              <tr><td>4</td><td>Driven adapter (<code>all</code>, via <code>listNotes</code>)</td>
                <td><em>(no log)</em></td><td><code>[Adapter:http] GET /api/notes</code></td></tr>
            </table>
            <p>Lines 1 and 2 are identical in both columns: the core did exactly the same thing. Only
            the plug on the right changed.</p>
            <p>When you switch the dropdown to http, you'll see <code>[Adapter:http] GET
            /api/notes</code> once <em>before</em> the <code>[Main] …</code> line
            (<code>createNotesApp</code> calls <code>store.all()</code> to pick the next id) and once
            <em>after</em> it (the DOM UI's first render).</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add two notes with <strong>memory</strong>, switch to <strong>localStorage</strong>,
              then back to memory. The memory notes are gone: each <code>wire()</code> makes a new
              memory adapter (like restarting the app). localStorage and http notes survive because
              their fake storage lives outside the adapter.</li>
              <li>Switch UI to <strong>CLI</strong>, type <code>add Call mum</code>, Run, then
              <code>list</code>, Run. Watch the console. A completely different UI, same core.</li>
              <li>Click Add with an empty box, or run <code>add</code> in the CLI. Both get "Note
              cannot be empty", because that rule lives in the core, not in a UI.</li>
            </ul>
            <div class="tip">All dependency arrows point <strong>inward</strong>: DOM UI → core ←
            http store. A test is just one more driving adapter, and a fake is just one more
            driven adapter. That is the payoff (see the exercise).</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In Ports &amp; Adapters, who defines the storage port (the <code>save</code> / <code>all</code> shape)?',
        options: [
          'The database library',
          'The application core, in its own terms',
          'The UI adapter',
          'Nobody, each adapter invents its own methods',
        ],
        answer: 1,
        why: 'The core says what it needs. Adapters must fit that socket. That is why the core never has to change when you swap storage.',
      },
      {
        q: 'Which of these is on the <strong>driving</strong> (primary) side?',
        options: [
          'An HTTP client that calls a payment API',
          'A SQL repository',
          'A unit test that calls <code>app.addNote()</code>',
          'An email sender',
        ],
        answer: 2,
        why: 'Driving adapters start the conversation by calling the app. A test does exactly that, just like a UI. The others are called <em>by</em> the app (driven side).',
      },
      {
        q: 'In the demo, what changes when you switch from "memory" to "http" storage?',
        options: [
          'The core function <code>createNotesApp</code>',
          'The DOM UI adapter',
          'Only which store object <code>wire()</code> passes into the core',
          'The port shape',
        ],
        answer: 2,
        why: 'The composition root picks a different adapter and hands it to the same core. Nothing else changes.',
      },
      {
        q: 'Which way do source-code dependencies point in a hexagonal app?',
        options: [
          'From the core out to the adapters',
          'From adapters on both sides in toward the core',
          'From driving adapters to driven adapters directly',
          'In a circle',
        ],
        answer: 1,
        why: 'UI adapters call the core\'s API and storage adapters implement the core\'s port. Both depend on the core; the core depends on neither.',
      },
    ],
    exercise: {
      task: `<p>A test is just another driving adapter, and a fake is just another driven adapter.</p>
        <ol>
          <li>Write <code>createSpyStore()</code>: a store adapter that fits the port
          (<code>save</code>, <code>all</code>) and also exposes a <code>saved</code> array so a test
          can look inside.</li>
          <li>Make both tests pass: adding "Buy milk" saves one note, and adding <code>"   "</code>
          saves nothing.</li>
        </ol>
        <p>You should see two <code>✓</code> lines in the console.</p>`,
      starter: `// ===== CORE (unchanged) =====
function createNotesApp(store) {
  let nextId = store.all().length + 1;
  return {
    addNote(text) {
      const clean = text.trim();
      if (!clean) {
        console.log('[Core] rejected empty note');
        return { ok: false, error: 'Note cannot be empty' };
      }
      const note = { id: nextId++, text: clean };
      console.log('[Core] addNote ' + JSON.stringify(clean));
      store.save(note);
      return { ok: true, note };
    },
    listNotes() {
      return store.all();
    },
  };
}

// ===== TEST HELPERS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
}

// ===== FAKE DRIVEN ADAPTER =====
function createSpyStore() {
  // TODO: return { saved: [...], save(note) {...}, all() {...} }
  return { all: () => [] };
}

// ===== TESTS (a driving adapter) =====
test('adding a note saves it', () => {
  const store = createSpyStore();
  const app = createNotesApp(store);
  app.addNote('Buy milk');
  assertEqual(store.saved, [{ id: 1, text: 'Buy milk' }]);
});

test('an empty note is not saved', () => {
  const store = createSpyStore();
  const app = createNotesApp(store);
  const result = app.addNote('   ');
  assertEqual(result.ok, false);
  assertEqual(store.saved, []);
});`,
      hint: 'Keep an array in a variable, push into it in save(), return a copy from all(), and put the same array on the returned object as saved.',
      solution: `// ===== CORE (unchanged) =====
function createNotesApp(store) {
  let nextId = store.all().length + 1;
  return {
    addNote(text) {
      const clean = text.trim();
      if (!clean) {
        console.log('[Core] rejected empty note');
        return { ok: false, error: 'Note cannot be empty' };
      }
      const note = { id: nextId++, text: clean };
      console.log('[Core] addNote ' + JSON.stringify(clean));
      store.save(note);
      return { ok: true, note };
    },
    listNotes() {
      return store.all();
    },
  };
}

// ===== TEST HELPERS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
}

// ===== FAKE DRIVEN ADAPTER =====
function createSpyStore() {
  const saved = [];
  return {
    saved,
    save(note) {
      console.log('[Adapter:spy] save #' + note.id);
      saved.push(note);
    },
    all() {
      return saved.slice();
    },
  };
}

// ===== TESTS (a driving adapter) =====
test('adding a note saves it', () => {
  const store = createSpyStore();
  const app = createNotesApp(store);
  app.addNote('Buy milk');
  assertEqual(store.saved, [{ id: 1, text: 'Buy milk' }]);
});

test('an empty note is not saved', () => {
  const store = createSpyStore();
  const app = createNotesApp(store);
  const result = app.addNote('   ');
  assertEqual(result.ok, false);
  assertEqual(store.saved, []);
});`,
    },
  },

  // ==========================================================================
  // CLEAN ARCHITECTURE
  // ==========================================================================
  {
    id: 'clean-architecture',
    section: 'Beyond the UI layer',
    title: 'Clean Architecture & the Dependency Rule',
    explain: `
      <p><strong>Clean Architecture</strong> is Robert C. Martin's ("Uncle Bob") name for a family of
      ideas he summed up in a 2012 blog post and later in the 2017 book <em>Clean Architecture</em>.
      It draws the app as <strong>circles</strong>, from the most important and stable in the middle
      to the most replaceable at the edge:</p>
      <table>
        <tr><th>Circle (inside → out)</th><th>Contains</th><th>In our example</th></tr>
        <tr><td><strong>Entities</strong></td><td>Core business rules and data</td>
          <td><code>createOrder</code>: totals, 10% discount at $100</td></tr>
        <tr><td><strong>Use cases</strong></td><td>Application rules: one user goal</td>
          <td><code>placeOrder(request)</code></td></tr>
        <tr><td><strong>Interface adapters</strong></td>
          <td>Convert data between use cases and the outside</td>
          <td>Controller, Presenter, Repository</td></tr>
        <tr><td><strong>Frameworks &amp; drivers</strong></td><td>The concrete tools</td>
          <td>The DOM, the (fake) database</td></tr>
      </table>

      <h3>The Dependency Rule</h3>
      <p><strong>Source-code dependencies only point inward.</strong> Code in an inner circle must not
      mention anything from an outer circle: no DOM, no database, no framework, not even the name
      of the presenter. Entities know nothing. Use cases know entities. And so on outward.</p>

      <h3>"But the use case has to save and show things!"</h3>
      <p>Right. At runtime, a use case <em>does</em> call outward: it saves to the database and hands
      results to the presenter. The trick is <strong>dependency inversion</strong>: the use case
      declares the <em>shapes</em> it needs (an <code>orderRepo</code> with <code>save</code>, a
      <code>presenter</code> with <code>success</code> / <code>failure</code>), and outer code
      passes in objects that fit. The use case calls them without knowing what they are. It is the
      same idea as the ports in the Hexagonal lesson.</p>
      <div class="tip"><strong>Control flow ≠ dependency direction.</strong> Calls go
      <em>in and back out</em> (controller → use case → presenter). Dependencies only point
      <em>in</em>. The walkthrough under the example shows both side by side. This is the part most
      people find confusing, so take it slowly.</div>

      <h3>Cousins: Onion and Hexagonal</h3>
      <p><strong>Onion Architecture</strong> (Jeffrey Palermo, 2008) draws nearly the same picture:
      the domain model in the centre, then domain services, application services, and UI /
      infrastructure / tests on the outside, with dependencies pointing to the centre. Hexagonal
      says the same thing with "ports" instead of circles. Martin presented Clean Architecture as a
      way to bring these ideas together. The names differ; the core rule is the same:
      <strong>keep the business logic in the middle, independent of tools.</strong></p>
      <div class="warn">Clean Architecture means a lot of pieces for a small app. A to-do list
      doesn't need four circles. Reach for it when business rules are big, long-lived, or shared by
      several UIs, or when tests are painful because logic is tangled with frameworks.</div>
    `,
    examples: [
      {
        title: 'PlaceOrder: one use case, four circles',
        code: `// ===== ENTITIES (innermost: know nothing else) =====
const PRICES = { book: 12.5, headphones: 80 };

function createOrder(id, lines) {
  if (lines.length === 0) {
    throw new Error('An order needs at least one item');
  }
  const subtotal = lines.reduce((sum, l) => sum + PRICES[l.sku] * l.qty, 0);
  const discount = subtotal >= 100 ? subtotal * 0.1 : 0; // business rule
  console.log('[Entity] order ' + id + ' subtotal ' + subtotal + ' discount ' + discount);
  return { id, lines, subtotal, discount, total: subtotal - discount };
}

// ===== USE CASES (know entities; DEFINE the ports they need) =====
// Ports (shapes the outer circles must provide):
//   orderRepo: { nextId(), save(order) }
//   presenter: { success({ orderId, total, discount }), failure(message) }
function makePlaceOrder({ orderRepo, presenter }) {
  return function placeOrder(request) {
    console.log('[UseCase] PlaceOrder ' + JSON.stringify(request));
    try {
      const lines = request.items.filter(item => item.qty > 0);
      const order = createOrder(orderRepo.nextId(), lines);
      orderRepo.save(order);
      presenter.success({ orderId: order.id, total: order.total, discount: order.discount });
    } catch (e) {
      presenter.failure(e.message);
    }
  };
}

// ===== INTERFACE ADAPTERS (translate between use cases and tools) =====
function makeOrderController(placeOrder) {
  return {
    submit(formValues) {
      console.log('[Controller] submit ' + JSON.stringify(formValues));
      const items = Object.keys(formValues).map(sku => ({ sku, qty: Number(formValues[sku]) }));
      placeOrder({ items });
    },
  };
}

function makeOrderPresenter(view) {
  const money = n => '$' + n.toFixed(2);
  return {
    success({ orderId, total, discount }) {
      const saved = discount > 0 ? ' (you saved ' + money(discount) + ')' : '';
      const text = 'Order #' + orderId + ' placed: ' + money(total) + saved;
      console.log('[Presenter] success → ' + text);
      view.show({ text, isError: false });
    },
    failure(message) {
      console.log('[Presenter] failure → ' + message);
      view.show({ text: 'Sorry: ' + message, isError: true });
    },
  };
}

function makeOrderRepository(db) {
  return {
    nextId() {
      return db.size + 1;
    },
    save(order) {
      db.set(order.id, order);
      console.log('[Repository] saved order ' + order.id + ' (' + db.size + ' in db)');
    },
  };
}

// ===== FRAMEWORKS & DRIVERS (the DOM, the database) =====
function makeDomView(root) {
  root.innerHTML =
    '<label>Book ($12.50) <input id="book" type="number" min="0" value="1"></label><br>' +
    '<label>Headphones ($80) <input id="headphones" type="number" min="0" value="1">' +
    '</label><br><button id="place">Place order</button><p id="out"></p>';
  const out = root.querySelector('#out');
  return {
    onSubmit(handler) {
      root.querySelector('#place').addEventListener('click', () => {
        handler({
          book: root.querySelector('#book').value,
          headphones: root.querySelector('#headphones').value,
        });
      });
    },
    show(viewModel) {
      console.log('[View] show ' + JSON.stringify(viewModel.text));
      out.textContent = viewModel.text;
      out.style.color = viewModel.isError ? '#c00' : '#070';
    },
  };
}

const fakeDb = new Map();

// ===== MAIN (composition root: the only place that knows everything) =====
const view = makeDomView(document.getElementById('root'));
const presenter = makeOrderPresenter(view);
const orderRepo = makeOrderRepository(fakeDb);
const placeOrder = makePlaceOrder({ orderRepo, presenter });
const controller = makeOrderController(placeOrder);
view.onSubmit(values => controller.submit(values));`,
        explain: `
          <details>
            <summary>Step by step: click "Place order" with 1 book + 1 headphones</summary>
            <table>
              <tr><th>#</th><th>Circle</th><th>Console</th></tr>
              <tr><td>1</td><td>Interface adapter (Controller)</td>
                <td><code>[Controller] submit {"book":"1","headphones":"1"}</code></td></tr>
              <tr><td>2</td><td>Use case</td>
                <td><code>[UseCase] PlaceOrder {"items":[{"sku":"book","qty":1},{"sku":"headphones","qty":1}]}</code></td></tr>
              <tr><td>3</td><td>Entity</td><td><code>[Entity] order 1 subtotal 92.5 discount 0</code></td></tr>
              <tr><td>4</td><td>Interface adapter (Repository)</td>
                <td><code>[Repository] saved order 1 (1 in db)</code></td></tr>
              <tr><td>5</td><td>Interface adapter (Presenter)</td>
                <td><code>[Presenter] success → Order #1 placed: $92.50</code></td></tr>
              <tr><td>6</td><td>Framework (DOM view)</td>
                <td><code>[View] show "Order #1 placed: $92.50"</code></td></tr>
            </table>
            <p>The controller turned strings from the inputs (<code>"1"</code>) into numbers
            (<code>1</code>), and the presenter turned the number <code>92.5</code> into the text
            <code>$92.50</code>. Translating formats is exactly what the "interface adapters" circle
            is for. The use case and entity only ever see plain data.</p>
          </details>
          <details>
            <summary>The key subtlety: control flow vs dependency arrows</summary>
            <p>Follow the <strong>calls</strong> (control flow) in the table above. They go
            <em>inward</em>, then back <em>outward</em>:</p>
            <pre><code>View ─click─&gt; Controller ─&gt; UseCase ─&gt; Entity
                                │
                                ├─&gt; orderRepo.save()     (outward!)
                                └─&gt; presenter.success()  (outward!) ─&gt; view.show()</code></pre>
            <p>Now follow the <strong>source-code dependencies</strong>: which code <em>mentions</em>
            which other code by name?</p>
            <table>
              <tr><th>Code</th><th>Mentions by name</th><th>Direction</th></tr>
              <tr><td><code>createOrder</code> (entity)</td><td>only <code>PRICES</code> (same circle)</td>
                <td>none</td></tr>
              <tr><td><code>makePlaceOrder</code> (use case)</td><td><code>createOrder</code></td>
                <td>inward ✅</td></tr>
              <tr><td><code>makeOrderController</code></td>
                <td>nothing: <code>placeOrder</code> is passed in; it builds the use case's request shape</td>
                <td>inward ✅</td></tr>
              <tr><td><code>makeOrderPresenter</code>, <code>makeOrderRepository</code></td>
                <td>nothing inner by name; they fit the use case's port shapes</td><td>inward ✅</td></tr>
              <tr><td>MAIN</td><td>everything</td><td>outermost circle, so that's allowed</td></tr>
            </table>
            <p>The use case <strong>calls</strong> the repository and the presenter, but never
            <strong>names</strong> them: they arrive as arguments
            (<code>makePlaceOrder({ orderRepo, presenter })</code>). The call arrow points out; the
            dependency arrow points in. That reversal is <strong>dependency inversion</strong>, and it
            is how Clean Architecture obeys the Dependency Rule while still saving and showing
            things.</p>
            <div class="warn">If you wrote <code>makeOrderPresenter(...)</code> or
            <code>document.querySelector</code> <em>inside</em> <code>makePlaceOrder</code>, the use case
            would depend on an outer circle. It would still work, but you could no longer test it
            without a DOM, or reuse it with another UI.</div>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Set headphones to <code>2</code>: subtotal 172.5 ≥ 100, so you'll see
              <code>[Entity] order 1 subtotal 172.5 discount 17.25</code> and "(you saved $17.25)".
              (The id is 1 if it's your first order; each successful order adds one.)</li>
              <li>Set both to <code>0</code>: the entity throws, and the use case calls
              <code>presenter.failure</code>. No <code>[Repository]</code> line appears.</li>
              <li>Change <code>money</code> in the presenter to show "฿" instead of "$". Nothing in the
              use case or entity needs to change.</li>
            </ul>
          </details>
        `,
      },
      {
        title: 'Testing the use case with fakes (no DOM, no DB)',
        code: `// Same entity and use case as the previous example, copied unchanged.
// ===== ENTITIES =====
const PRICES = { book: 12.5, headphones: 80 };

function createOrder(id, lines) {
  if (lines.length === 0) {
    throw new Error('An order needs at least one item');
  }
  const subtotal = lines.reduce((sum, l) => sum + PRICES[l.sku] * l.qty, 0);
  const discount = subtotal >= 100 ? subtotal * 0.1 : 0;
  console.log('[Entity] order ' + id + ' subtotal ' + subtotal + ' discount ' + discount);
  return { id, lines, subtotal, discount, total: subtotal - discount };
}

// ===== USE CASE =====
function makePlaceOrder({ orderRepo, presenter }) {
  return function placeOrder(request) {
    console.log('[UseCase] PlaceOrder ' + JSON.stringify(request));
    try {
      const lines = request.items.filter(item => item.qty > 0);
      const order = createOrder(orderRepo.nextId(), lines);
      orderRepo.save(order);
      presenter.success({ orderId: order.id, total: order.total, discount: order.discount });
    } catch (e) {
      presenter.failure(e.message);
    }
  };
}

// ===== FAKES (tiny objects that fit the ports) =====
function fakeRepo() {
  const saved = [];
  return { saved, nextId: () => 42, save: order => saved.push(order) };
}

function spyPresenter() {
  const calls = [];
  return {
    calls,
    success: output => calls.push(['success', output]),
    failure: message => calls.push(['failure', message]),
  };
}

// ===== TEST HELPERS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
}

// ===== TESTS =====
test('saves the order and presents the total', () => {
  const repo = fakeRepo();
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: repo, presenter });
  placeOrder({ items: [{ sku: 'book', qty: 1 }, { sku: 'headphones', qty: 1 }] });
  assertEqual(repo.saved.length, 1);
  assertEqual(presenter.calls, [['success', { orderId: 42, total: 92.5, discount: 0 }]]);
});

test('gives 10% off at $100 or more', () => {
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: fakeRepo(), presenter });
  placeOrder({ items: [{ sku: 'headphones', qty: 2 }] });
  assertEqual(presenter.calls, [['success', { orderId: 42, total: 144, discount: 16 }]]);
});

test('rejects an empty order and saves nothing', () => {
  const repo = fakeRepo();
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: repo, presenter });
  placeOrder({ items: [{ sku: 'book', qty: 0 }] });
  assertEqual(repo.saved.length, 0);
  assertEqual(presenter.calls, [['failure', 'An order needs at least one item']]);
});

document.getElementById('root').textContent = 'Tests ran: see the console below.';`,
        explain: `
          <details>
            <summary>Why testing is easy: the use case only needs the port shapes</summary>
            <p>Because <code>makePlaceOrder</code> receives its repository and presenter as arguments,
            a test can pass in objects that just <em>record</em> what happened. No browser, no
            database, no mocking library. The console shows:</p>
            <pre><code>[UseCase] PlaceOrder {"items":[{"sku":"book","qty":1},{"sku":"headphones","qty":1}]}
[Entity] order 42 subtotal 92.5 discount 0
✓ saves the order and presents the total
[UseCase] PlaceOrder {"items":[{"sku":"headphones","qty":2}]}
[Entity] order 42 subtotal 160 discount 16
✓ gives 10% off at $100 or more
[UseCase] PlaceOrder {"items":[{"sku":"book","qty":0}]}
✓ rejects an empty order and saves nothing</code></pre>
            <p>In the third test there is no <code>[Entity]</code> line: <code>createOrder</code>
            throws before it logs, and the use case turns the error into
            <code>presenter.failure(...)</code>.</p>
            <div class="tip">Break a rule on purpose (change <code>0.1</code> to <code>0.2</code>) and
            run again: the discount test prints a red <code>✗</code> with the expected and actual
            values.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does the Dependency Rule say?',
        options: [
          'Outer circles must not depend on inner circles',
          'Source-code dependencies point only inward, toward the business rules',
          'Every class must have an interface',
          'The database is the centre of the app',
        ],
        answer: 1,
        why: 'Inner circles (entities, use cases) must not mention anything in outer circles (UI, DB, frameworks). Outer circles may depend on inner ones.',
      },
      {
        q: 'The use case calls <code>presenter.success()</code>, and the presenter is in an outer circle. Why doesn\'t that break the rule?',
        options: [
          'Because presenters are part of the entities circle',
          'Because the rule only applies to databases',
          'Because the use case only knows the shape it defined; the concrete presenter is passed in from outside',
          'It does break the rule; Clean Architecture allows exceptions',
        ],
        answer: 2,
        why: 'Control flows outward, but the source dependency points inward: the outer presenter fits the use case\'s output port. That is dependency inversion.',
      },
      {
        q: 'In the example, which piece turns <code>92.5</code> into <code>"$92.50"</code>?',
        options: ['The entity', 'The use case', 'The presenter (interface adapter)', 'The repository'],
        answer: 2,
        why: 'Formatting for display is a translation job, so it belongs in the interface-adapters circle. Rules and use cases stay format-free.',
      },
      {
        q: 'How is Onion Architecture (Palermo, 2008) related?',
        options: [
          'It is the opposite: the database is in the centre',
          'A close cousin: domain in the centre, dependencies pointing inward',
          'It is a JavaScript framework',
          'It only applies to mobile apps',
        ],
        answer: 1,
        why: 'Onion, Hexagonal and Clean all put the domain in the middle and make infrastructure depend on it.',
      },
    ],
    exercise: {
      task: `<p>The shop adds a rule: <strong>at most 5 of any single item per order</strong>.</p>
        <ol>
          <li>Put the rule in the <strong>right circle</strong>. When it is broken, throw
          <code>new Error('Max 5 per item')</code>.</li>
          <li>Finish the third test: ordering 6 books must save nothing and present
          <code>['failure', 'Max 5 per item']</code>.</li>
        </ol>
        <p>All three tests should show <code>✓</code>.</p>`,
      starter: `// ===== ENTITIES =====
const PRICES = { book: 12.5, headphones: 80 };

function createOrder(id, lines) {
  if (lines.length === 0) {
    throw new Error('An order needs at least one item');
  }
  // TODO: the "max 5 per item" rule
  const subtotal = lines.reduce((sum, l) => sum + PRICES[l.sku] * l.qty, 0);
  const discount = subtotal >= 100 ? subtotal * 0.1 : 0;
  return { id, lines, subtotal, discount, total: subtotal - discount };
}

// ===== USE CASE =====
function makePlaceOrder({ orderRepo, presenter }) {
  return function placeOrder(request) {
    console.log('[UseCase] PlaceOrder ' + JSON.stringify(request));
    try {
      const lines = request.items.filter(item => item.qty > 0);
      const order = createOrder(orderRepo.nextId(), lines);
      orderRepo.save(order);
      presenter.success({ orderId: order.id, total: order.total, discount: order.discount });
    } catch (e) {
      presenter.failure(e.message);
    }
  };
}

// ===== FAKES =====
function fakeRepo() {
  const saved = [];
  return { saved, nextId: () => 1, save: order => saved.push(order) };
}

function spyPresenter() {
  const calls = [];
  return {
    calls,
    success: output => calls.push(['success', output]),
    failure: message => calls.push(['failure', message]),
  };
}

// ===== TEST HELPERS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
}

// ===== TESTS =====
test('5 books is fine', () => {
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: fakeRepo(), presenter });
  placeOrder({ items: [{ sku: 'book', qty: 5 }] });
  assertEqual(presenter.calls[0][0], 'success');
});

test('headphones still get the discount', () => {
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: fakeRepo(), presenter });
  placeOrder({ items: [{ sku: 'headphones', qty: 2 }] });
  assertEqual(presenter.calls[0][1].total, 144);
});

test('6 books is rejected', () => {
  // TODO: make a fakeRepo and a spyPresenter, place an order for 6 books,
  // then check that nothing was saved and the presenter got the failure.
  throw new Error('not written yet');
});`,
      hint: 'It is a business rule about orders, so it goes in createOrder (the entity), e.g. if (lines.some(l => l.qty > 5)) throw …. The test looks like the other two, but keep a reference to the repo so you can check repo.saved.length.',
      solution: `// ===== ENTITIES =====
const PRICES = { book: 12.5, headphones: 80 };
const MAX_PER_ITEM = 5;

function createOrder(id, lines) {
  if (lines.length === 0) {
    throw new Error('An order needs at least one item');
  }
  if (lines.some(l => l.qty > MAX_PER_ITEM)) {
    throw new Error('Max ' + MAX_PER_ITEM + ' per item');
  }
  const subtotal = lines.reduce((sum, l) => sum + PRICES[l.sku] * l.qty, 0);
  const discount = subtotal >= 100 ? subtotal * 0.1 : 0;
  return { id, lines, subtotal, discount, total: subtotal - discount };
}

// ===== USE CASE =====
function makePlaceOrder({ orderRepo, presenter }) {
  return function placeOrder(request) {
    console.log('[UseCase] PlaceOrder ' + JSON.stringify(request));
    try {
      const lines = request.items.filter(item => item.qty > 0);
      const order = createOrder(orderRepo.nextId(), lines);
      orderRepo.save(order);
      presenter.success({ orderId: order.id, total: order.total, discount: order.discount });
    } catch (e) {
      presenter.failure(e.message);
    }
  };
}

// ===== FAKES =====
function fakeRepo() {
  const saved = [];
  return { saved, nextId: () => 1, save: order => saved.push(order) };
}

function spyPresenter() {
  const calls = [];
  return {
    calls,
    success: output => calls.push(['success', output]),
    failure: message => calls.push(['failure', message]),
  };
}

// ===== TEST HELPERS =====
function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

function assertEqual(actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error('expected ' + JSON.stringify(expected) + ' got ' + JSON.stringify(actual));
  }
}

// ===== TESTS =====
test('5 books is fine', () => {
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: fakeRepo(), presenter });
  placeOrder({ items: [{ sku: 'book', qty: 5 }] });
  assertEqual(presenter.calls[0][0], 'success');
});

test('headphones still get the discount', () => {
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: fakeRepo(), presenter });
  placeOrder({ items: [{ sku: 'headphones', qty: 2 }] });
  assertEqual(presenter.calls[0][1].total, 144);
});

test('6 books is rejected', () => {
  const repo = fakeRepo();
  const presenter = spyPresenter();
  const placeOrder = makePlaceOrder({ orderRepo: repo, presenter });
  placeOrder({ items: [{ sku: 'book', qty: 6 }] });
  assertEqual(repo.saved.length, 0);
  assertEqual(presenter.calls, [['failure', 'Max 5 per item']]);
});`,
    },
  },

  // ==========================================================================
  // VIPER & MVVM-C
  // ==========================================================================
  {
    id: 'viper-coordinators',
    section: 'Beyond the UI layer',
    title: 'VIPER & MVVM-C (iOS)',
    explain: `
      <p>iOS developers using UIKit had a famous problem nicknamed <strong>"Massive View
      Controller"</strong>: Apple's template put everything in one <code>UIViewController</code>
      (layout, networking, formatting, navigation) until the file was thousands of lines long. Two
      popular answers split it up differently.</p>

      <h3>VIPER: five roles per screen</h3>
      <p>VIPER was popularised by a 2014 objc.io article from engineers at Mutual Mobile. Each
      screen (a "module") gets five pieces:</p>
      <table>
        <tr><th>Letter</th><th>Role</th><th>Knows about</th></tr>
        <tr><td><strong>V</strong>iew</td><td>Passive: shows what it's told, forwards taps</td>
          <td>Presenter</td></tr>
        <tr><td><strong>I</strong>nteractor</td><td>Business logic for this use case, gets data</td>
          <td>Entities, data services; reports results to the Presenter</td></tr>
        <tr><td><strong>P</strong>resenter</td><td>Mediator: turns taps into interactor calls, turns
          entities into display strings, asks the Router to navigate</td><td>View, Interactor, Router</td></tr>
        <tr><td><strong>E</strong>ntity</td><td>Plain data objects</td><td>nothing</td></tr>
        <tr><td><strong>R</strong>outer (a.k.a. Wireframe)</td><td>Navigation: which screen comes
          next, and often builds (assembles) the module</td><td>other modules</td></tr>
      </table>
      <p>If that looks familiar: it's <strong>MVP</strong> (passive view + presenter) plus a
      <strong>use case</strong> (interactor, like the Clean Architecture lesson) plus a separate
      <strong>navigation</strong> object. VIPER is Clean Architecture applied to one screen.</p>

      <h3>MVVM-C: MVVM + Coordinator</h3>
      <p>The <strong>Coordinator</strong> pattern (widely popularised by Soroush Khanlou around 2015)
      keeps MVVM for each screen, but <strong>takes navigation away from the screens</strong>. A
      ViewModel never says "push the detail screen". It only reports an event ("the user picked the
      Mug"). A <strong>Coordinator</strong> listens and decides what happens next.</p>
      <p><strong>Analogy: a tour guide.</strong> Each museum room (screen) just tells visitors what
      is in it. The guide (coordinator) decides which room comes next. Change the tour, and no room
      has to be rebuilt.</p>
      <ul>
        <li>Screens become <strong>reusable</strong>: the same product screen can appear in the
          shop flow and in a search flow.</li>
        <li>Flows are <strong>readable in one place</strong>: "list → detail → cart → done".</li>
        <li>Bigger apps have a tree of coordinators (app → onboarding, app → shop, …).</li>
      </ul>
      <div class="tip"><strong>Web connection:</strong> a router in a single-page app (React Router,
      Vue Router) plays a similar "who decides the next screen" role, but it is driven by URLs,
      not by a coordinator object.</div>
      <div class="warn">VIPER means five files per screen. Many teams found that heavy for simple
      screens. With SwiftUI (2019+), many apps use plain MVVM, or state-driven navigation such as
      <code>NavigationStack</code> with a path, instead of full VIPER. Use the parts that solve a
      problem you actually have.</div>
    `,
    examples: [
      {
        title: 'VIPER: one module in plain JS',
        code: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ===== ENTITY (plain data) =====
// { id, title, done }

// ===== INTERACTOR (business logic + data for this use case) =====
class TodoInteractor {
  constructor() {
    this.todos = [
      { id: 1, title: 'Water plants', done: false },
      { id: 2, title: 'Pay rent', done: true },
    ];
    this.output = null; // the Presenter (set when the module is assembled)
  }
  fetchTodos() {
    console.log('[Interactor] fetchTodos → ' + this.todos.length + ' entities');
    this.output.didFetch(this.todos.slice());
  }
  toggle(id) {
    const todo = this.find(id);
    todo.done = !todo.done;
    console.log('[Interactor] toggle #' + id + ' → done=' + todo.done);
    this.output.didFetch(this.todos.slice());
  }
  find(id) {
    return this.todos.find(t => t.id === id);
  }
}

// ===== PRESENTER (mediator: formats data, asks the Router to navigate) =====
class TodoPresenter {
  constructor(view, interactor, router) {
    this.view = view;
    this.interactor = interactor;
    this.router = router;
  }
  viewDidLoad() {
    console.log('[Presenter] viewDidLoad');
    this.interactor.fetchTodos();
  }
  didFetch(todos) {
    const rows = todos.map(t => ({ id: t.id, text: (t.done ? '✅ ' : '⬜ ') + t.title }));
    console.log('[Presenter] didFetch → ' + rows.length + ' rows for the view');
    this.view.showRows(rows);
  }
  didTapToggle(id) {
    console.log('[Presenter] didTapToggle #' + id);
    this.interactor.toggle(id);
  }
  didTapDetails(id) {
    console.log('[Presenter] didTapDetails #' + id);
    this.router.showDetail(this.interactor.find(id));
  }
}

// ===== VIEW (passive: shows rows, forwards taps) =====
class TodoListView {
  constructor(host) {
    this.host = host;
    this.presenter = null;
  }
  showRows(rows) {
    console.log('[View] showRows (' + rows.length + ')');
    this.host.innerHTML = '<b>Todos</b>';
    for (const row of rows) {
      const line = document.createElement('div');
      line.append(
        button(row.text, () => {
          console.log('[View] tap toggle #' + row.id);
          this.presenter.didTapToggle(row.id);
        }),
        button('Details ›', () => {
          console.log('[View] tap details #' + row.id);
          this.presenter.didTapDetails(row.id);
        }),
      );
      this.host.append(line);
    }
  }
}

// ===== ROUTER (navigation + assembling the module) =====
class TodoRouter {
  static assembleModule(host) {
    const view = new TodoListView(host);
    const interactor = new TodoInteractor();
    const router = new TodoRouter(host);
    const presenter = new TodoPresenter(view, interactor, router);
    view.presenter = presenter;
    interactor.output = presenter;
    router.presenter = presenter;
    console.log('[Router] module assembled');
    return presenter;
  }
  constructor(host) {
    this.host = host;
    this.presenter = null;
  }
  showDetail(todo) {
    console.log('[Router] showDetail "' + todo.title + '"');
    this.host.innerHTML = '';
    const info = document.createElement('p');
    const status = todo.done ? 'done' : 'not done';
    info.textContent = 'Detail screen: "' + todo.title + '" is ' + status;
    this.host.append(info, button('‹ Back', () => this.back()));
  }
  back() {
    console.log('[Router] back to list');
    this.presenter.viewDidLoad();
  }
}

// ===== START =====
const presenter = TodoRouter.assembleModule(document.getElementById('root'));
presenter.viewDidLoad();`,
        explain: `
          <details>
            <summary>Step by step: start, then tap "Details ›" on Water plants</summary>
            <table>
              <tr><th>When</th><th>Console</th><th>What it shows</th></tr>
              <tr><td>Start</td><td><code>[Router] module assembled</code></td>
                <td>The Router builds V, I, P and wires them together</td></tr>
              <tr><td></td><td><code>[Presenter] viewDidLoad</code></td><td>The screen asks for data…</td></tr>
              <tr><td></td><td><code>[Interactor] fetchTodos → 2 entities</code></td>
                <td>…the Interactor gets it…</td></tr>
              <tr><td></td><td><code>[Presenter] didFetch → 2 rows for the view</code></td>
                <td>…the Presenter formats it (✅ / ⬜)…</td></tr>
              <tr><td></td><td><code>[View] showRows (2)</code></td><td>…the passive View draws it.</td></tr>
              <tr><td>Tap</td><td><code>[View] tap details #1</code></td><td>View forwards the tap</td></tr>
              <tr><td></td><td><code>[Presenter] didTapDetails #1</code></td>
                <td>Presenter decides this means "navigate"</td></tr>
              <tr><td></td><td><code>[Router] showDetail "Water plants"</code></td>
                <td>Only the Router knows how to show another screen</td></tr>
            </table>
            <p>Tap the "⬜ Water plants" button instead and the flow is View → Presenter → Interactor
            (<code>[Interactor] toggle #1 → done=true</code>) → Presenter → View. Business logic stays
            in the Interactor; the View never touches entities.</p>
          </details>
        `,
      },
      {
        title: 'MVVM-C: a Coordinator owns navigation',
        code: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ===== DATA =====
const PRODUCTS = [
  { id: 1, name: 'Coffee beans', price: 9 },
  { id: 2, name: 'Mug', price: 12 },
];

// ===== NAVIGATION STACK (like iOS UINavigationController) =====
class NavigationStack {
  constructor(host) {
    this.host = host;
    this.screens = [];
  }
  push(screen) {
    this.screens.push(screen);
    console.log('[Nav] push "' + screen.title + '" (depth ' + this.screens.length + ')');
    this.render();
  }
  pop() {
    const screen = this.screens.pop();
    console.log('[Nav] pop "' + screen.title + '" (depth ' + this.screens.length + ')');
    this.render();
  }
  popToRoot() {
    this.screens.length = 1;
    console.log('[Nav] popToRoot (depth 1)');
    this.render();
  }
  render() {
    const top = this.screens[this.screens.length - 1];
    this.host.innerHTML = '';
    const bar = document.createElement('div');
    bar.style.cssText = 'border-bottom:1px solid #ccc;margin-bottom:6px;padding-bottom:4px';
    if (this.screens.length > 1) bar.append(button('‹ Back', () => this.pop()));
    const title = document.createElement('b');
    title.textContent = ' ' + top.title;
    bar.append(title);
    const body = document.createElement('div');
    this.host.append(bar, body);
    top.render(body);
  }
}

// ===== VIEWMODELS (report events; never navigate) =====
class ProductListViewModel {
  constructor(products, events) {
    this.products = products;
    this.events = events;
  }
  get rows() {
    return this.products.map(p => ({ id: p.id, label: p.name + ' · $' + p.price }));
  }
  select(id) {
    const product = this.products.find(p => p.id === id);
    console.log('[ViewModel] list: selected ' + product.name);
    this.events.onSelect(product); // "this happened", NOT "push screen X"
  }
}

class ProductDetailViewModel {
  constructor(product, cart, events) {
    this.product = product;
    this.cart = cart;
    this.events = events;
  }
  get priceText() {
    return 'Price: $' + this.product.price;
  }
  addToCart() {
    this.cart.push(this.product);
    const name = this.product.name;
    console.log('[ViewModel] detail: added ' + name + ' (cart ' + this.cart.length + ')');
    this.events.onAdded();
  }
}

class CartViewModel {
  constructor(cart, events) {
    this.cart = cart;
    this.events = events;
  }
  get totalText() {
    const total = this.cart.reduce((sum, p) => sum + p.price, 0);
    return this.cart.length + ' item(s), total $' + total;
  }
  done() {
    console.log('[ViewModel] cart: done');
    this.events.onDone();
  }
}

// ===== VIEWS (draw a ViewModel, forward taps) =====
function ProductListView(vm) {
  return {
    title: 'Shop',
    render(el) {
      for (const row of vm.rows) {
        el.append(button(row.label, () => {
          console.log('[View] tap "' + row.label + '"');
          vm.select(row.id);
        }));
      }
    },
  };
}

function ProductDetailView(vm) {
  return {
    title: vm.product.name,
    render(el) {
      const p = document.createElement('p');
      p.textContent = vm.priceText;
      el.append(p, button('Add to cart', () => {
        console.log('[View] tap "Add to cart"');
        vm.addToCart();
      }));
    },
  };
}

function CartView(vm) {
  return {
    title: 'Cart',
    render(el) {
      const p = document.createElement('p');
      p.textContent = vm.totalText;
      el.append(p, button('Done', () => {
        console.log('[View] tap "Done"');
        vm.done();
      }));
    },
  };
}

// ===== COORDINATOR (the only place that knows the flow) =====
class ShopCoordinator {
  constructor(nav, shouldSkipCart) {
    this.nav = nav;
    this.shouldSkipCart = shouldSkipCart;
    this.cart = [];
  }
  start() {
    console.log('[Coordinator] start → Shop');
    const vm = new ProductListViewModel(PRODUCTS, {
      onSelect: product => this.showDetail(product),
    });
    this.nav.push(ProductListView(vm));
  }
  showDetail(product) {
    console.log('[Coordinator] showDetail ' + product.name);
    const vm = new ProductDetailViewModel(product, this.cart, {
      onAdded: () => this.afterAdd(),
    });
    this.nav.push(ProductDetailView(vm));
  }
  afterAdd() {
    if (this.shouldSkipCart()) {
      console.log('[Coordinator] skip cart → back to Shop');
      this.nav.popToRoot();
      return;
    }
    console.log('[Coordinator] showCart');
    const vm = new CartViewModel(this.cart, { onDone: () => this.finish() });
    this.nav.push(CartView(vm));
  }
  finish() {
    console.log('[Coordinator] finish → back to Shop');
    this.nav.popToRoot();
  }
}

// ===== START =====
const root = document.getElementById('root');
root.innerHTML =
  '<label><input type="checkbox" id="skip"> Coordinator rule: skip the cart after adding</label>' +
  '<div id="phone" style="border:2px solid #333;border-radius:12px;padding:8px;' +
  'margin-top:6px;max-width:300px;min-height:110px"></div>';
const skipBox = document.getElementById('skip');
const nav = new NavigationStack(document.getElementById('phone'));
new ShopCoordinator(nav, () => skipBox.checked).start();`,
        explain: `
          <details>
            <summary>Step by step: Mug → Add to cart → Done</summary>
            <p>On start: <code>[Coordinator] start → Shop</code>, <code>[Nav] push "Shop" (depth 1)</code>.</p>
            <table>
              <tr><th>Tap</th><th>Console</th><th>Who decided?</th></tr>
              <tr><td>"Mug · $12"</td><td><code>[View] tap "Mug · $12"</code><br>
                <code>[ViewModel] list: selected Mug</code><br>
                <code>[Coordinator] showDetail Mug</code><br>
                <code>[Nav] push "Mug" (depth 2)</code></td>
                <td>The list VM only said "selected Mug". The coordinator chose the detail screen.</td></tr>
              <tr><td>"Add to cart"</td><td><code>[View] tap "Add to cart"</code><br>
                <code>[ViewModel] detail: added Mug (cart 1)</code><br>
                <code>[Coordinator] showCart</code><br>
                <code>[Nav] push "Cart" (depth 3)</code></td>
                <td>The detail VM updated the cart and reported <code>onAdded</code>. What comes
                next is the coordinator's call.</td></tr>
              <tr><td>"Done"</td><td><code>[View] tap "Done"</code><br>
                <code>[ViewModel] cart: done</code><br>
                <code>[Coordinator] finish → back to Shop</code><br>
                <code>[Nav] popToRoot (depth 1)</code></td>
                <td>Coordinator again.</td></tr>
            </table>
          </details>
          <details>
            <summary>Try this: change the flow without touching any screen</summary>
            <p>Tick <strong>"skip the cart after adding"</strong>, then tap a product and "Add to
            cart". Now you see <code>[Coordinator] skip cart → back to Shop</code> and
            <code>[Nav] popToRoot (depth 1)</code>. The flow changed, but
            <code>ProductDetailViewModel</code> and its view are exactly the same code. Only
            <code>afterAdd()</code> in the coordinator made a different choice.</p>
            <div class="warn">The common mistake is putting <code>nav.push(CartView(...))</code>
            inside <code>addToCart()</code>. It works, but now the detail screen is welded to the
            shop flow: you can't reuse it anywhere that shouldn't open the cart.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In VIPER, which piece decides which screen to show next?',
        options: ['View', 'Interactor', 'Router', 'Entity'],
        answer: 2,
        why: 'The Router (also called Wireframe) handles navigation and often builds modules. The Presenter asks it to navigate.',
      },
      {
        q: 'In VIPER, where does business logic like "toggle a todo" live?',
        options: ['View', 'Interactor', 'Router', 'Presenter'],
        answer: 1,
        why: 'The Interactor holds use-case logic and works with entities. The Presenter only mediates and formats.',
      },
      {
        q: 'In MVVM-C, what should a ViewModel do when the user picks a product?',
        options: [
          'Push the detail screen onto the navigation stack',
          'Report an event (e.g. <code>onSelect(product)</code>) and let the Coordinator decide',
          'Create the next ViewModel and render it',
          'Change the URL',
        ],
        answer: 1,
        why: 'ViewModels report what happened. The Coordinator owns the flow, so screens stay reusable.',
      },
      {
        q: 'VIPER is best described as…',
        options: [
          'MVC with two-way binding',
          'A Redux store for iOS',
          'MVP + an interactor (use case) + a router, per screen',
          'A database pattern',
        ],
        answer: 2,
        why: 'Passive view and presenter come from MVP, the interactor from Clean Architecture\'s use cases, and the router adds navigation.',
      },
    ],
    exercise: {
      task: `<p>Add a <strong>checkout</strong> step to the coordinator flow.</p>
        <ol>
          <li>The cart screen gets a <strong>"Checkout"</strong> button. Its ViewModel method
          <code>checkout()</code> logs and calls <code>this.events.onCheckout()</code>. It must
          <em>not</em> touch <code>nav</code>.</li>
          <li>The coordinator reacts by pushing a <strong>"Thanks"</strong> screen with a "Back to
          shop" button that pops to the root.</li>
        </ol>
        <p>Expected console after tapping Checkout: <code>[ViewModel] cart: checkout</code>,
        <code>[Coordinator] showThanks</code>, <code>[Nav] push "Thanks" (depth 3)</code>.</p>`,
      starter: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

class NavigationStack {
  constructor(host) {
    this.host = host;
    this.screens = [];
  }
  push(screen) {
    this.screens.push(screen);
    console.log('[Nav] push "' + screen.title + '" (depth ' + this.screens.length + ')');
    this.render();
  }
  popToRoot() {
    this.screens.length = 1;
    console.log('[Nav] popToRoot (depth 1)');
    this.render();
  }
  render() {
    const top = this.screens[this.screens.length - 1];
    this.host.innerHTML = '<b>' + top.title + '</b><br>';
    top.render(this.host);
  }
}

// ===== VIEWMODELS =====
class ShopViewModel {
  constructor(events) {
    this.events = events;
  }
  addMug() {
    console.log('[ViewModel] shop: added Mug');
    this.events.onAdded();
  }
}

class CartViewModel {
  constructor(events) {
    this.events = events;
  }
  // TODO: checkout() → log '[ViewModel] cart: checkout' and call this.events.onCheckout()
}

// ===== VIEWS =====
function ShopView(vm) {
  return { title: 'Shop', render: el => el.append(button('Add Mug', () => vm.addMug())) };
}

function CartView(vm) {
  return {
    title: 'Cart',
    render: el => {
      el.append('1 Mug in cart ');
      // TODO: a "Checkout" button that calls vm.checkout()
    },
  };
}

// TODO: function ThanksView(onBack) { ... title 'Thanks', a "Back to shop" button }

// ===== COORDINATOR =====
class ShopCoordinator {
  constructor(nav) {
    this.nav = nav;
  }
  start() {
    this.nav.push(ShopView(new ShopViewModel({ onAdded: () => this.showCart() })));
  }
  showCart() {
    console.log('[Coordinator] showCart');
    this.nav.push(CartView(new CartViewModel({
      // TODO: onCheckout: () => this.showThanks(),
    })));
  }
  // TODO: showThanks() → log '[Coordinator] showThanks', push ThanksView
}

new ShopCoordinator(new NavigationStack(document.getElementById('root'))).start();`,
      hint: 'Mirror the existing pattern: the ViewModel only calls an event callback; the coordinator passes onCheckout when it creates CartViewModel, and its showThanks() pushes ThanksView(() => this.nav.popToRoot()).',
      solution: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

class NavigationStack {
  constructor(host) {
    this.host = host;
    this.screens = [];
  }
  push(screen) {
    this.screens.push(screen);
    console.log('[Nav] push "' + screen.title + '" (depth ' + this.screens.length + ')');
    this.render();
  }
  popToRoot() {
    this.screens.length = 1;
    console.log('[Nav] popToRoot (depth 1)');
    this.render();
  }
  render() {
    const top = this.screens[this.screens.length - 1];
    this.host.innerHTML = '<b>' + top.title + '</b><br>';
    top.render(this.host);
  }
}

// ===== VIEWMODELS =====
class ShopViewModel {
  constructor(events) {
    this.events = events;
  }
  addMug() {
    console.log('[ViewModel] shop: added Mug');
    this.events.onAdded();
  }
}

class CartViewModel {
  constructor(events) {
    this.events = events;
  }
  checkout() {
    console.log('[ViewModel] cart: checkout');
    this.events.onCheckout();
  }
}

// ===== VIEWS =====
function ShopView(vm) {
  return { title: 'Shop', render: el => el.append(button('Add Mug', () => vm.addMug())) };
}

function CartView(vm) {
  return {
    title: 'Cart',
    render: el => {
      el.append('1 Mug in cart ');
      el.append(button('Checkout', () => vm.checkout()));
    },
  };
}

function ThanksView(onBack) {
  return {
    title: 'Thanks',
    render: el => el.append('Order placed! ', button('Back to shop', onBack)),
  };
}

// ===== COORDINATOR =====
class ShopCoordinator {
  constructor(nav) {
    this.nav = nav;
  }
  start() {
    this.nav.push(ShopView(new ShopViewModel({ onAdded: () => this.showCart() })));
  }
  showCart() {
    console.log('[Coordinator] showCart');
    this.nav.push(CartView(new CartViewModel({
      onCheckout: () => this.showThanks(),
    })));
  }
  showThanks() {
    console.log('[Coordinator] showThanks');
    this.nav.push(ThanksView(() => this.nav.popToRoot()));
  }
}

new ShopCoordinator(new NavigationStack(document.getElementById('root'))).start();`,
    },
  },

  // ==========================================================================
  // PATTERN ZOO
  // ==========================================================================
  {
    id: 'pattern-zoo',
    section: 'Beyond the UI layer',
    title: 'The naming zoo: HMVC, MVVM-C, MVCS, MVA, PAC, MVU, “MMVC”?',
    explain: `
      <p>Once you know MVC, MVP, MVVM and unidirectional flow, you'll keep meeting new acronyms.
      Good news: almost all of them are <strong>one of the patterns you know, plus one extra
      idea</strong>. Here's the short version of each. (Where history is fuzzy, the dates are the
      commonly cited ones, not gospel.)</p>
      <table>
        <tr><th>Name</th><th>Stands for</th><th>The one extra idea</th></tr>
        <tr><td><strong>HMVC</strong></td><td>Hierarchical MVC</td>
          <td>MVC triads <strong>nested in a tree</strong>. A parent controller creates and talks to
          child triads; children talk to each other only through their parent. Often traced to a
          2000 JavaWorld article (Cai, Kapila &amp; Pal). In PHP it showed up in frameworks such as
          Kohana and in a well-known CodeIgniter add-on ("Modular Extensions – HMVC").</td></tr>
        <tr><td><strong>PAC</strong></td><td>Presentation–Abstraction–Control</td>
          <td>Proposed by <strong>Joëlle Coutaz in 1987</strong>. The app is a hierarchy of
          <em>agents</em>; each has a Presentation (UI), an Abstraction (data) and a Control. P and A
          <strong>never talk directly</strong>: Control sits between them and also talks to the
          parent and child agents. HMVC is often described as a close relative (some say a
          rediscovery) of PAC.</td></tr>
        <tr><td><strong>MVCS</strong></td><td>Model–View–Controller–Service</td>
          <td>MVC plus a <strong>Service</strong> layer that talks to the outside world (servers,
          APIs). Models hold state; services fetch and send. The name is best known from
          <strong>Robotlegs</strong>, an ActionScript 3 (Flash/Flex) framework.</td></tr>
        <tr><td><strong>MVA</strong></td><td>Model–View–Adapter</td>
          <td>Like MVC, but the <strong>view and model never know each other</strong>; all traffic
          goes through the adapter (also called a <em>mediating controller</em>). Very close to MVP.
          Apple's classic Cocoa docs describe a similar "mediating controller" style of MVC.</td></tr>
        <tr><td><strong>MVU</strong></td><td>Model–View–Update</td>
          <td>Another name for <strong>The Elm Architecture</strong> (see the Elm lesson): a model,
          a pure <code>view(model)</code>, and a pure <code>update(msg, model)</code>. In .NET you'll
          meet it in <strong>Fabulous</strong> (F#) and <strong>Comet</strong> (an experimental
          MVU library for .NET MAUI), among others.</td></tr>
        <tr><td><strong>MVVM-C</strong></td><td>MVVM + Coordinator</td>
          <td>MVVM per screen, plus a Coordinator that owns navigation (previous lesson).</td></tr>
        <tr><td><strong>VIPER</strong></td><td>View–Interactor–Presenter–Entity–Router</td>
          <td>MVP + a use-case interactor + a router, per screen (previous lesson).</td></tr>
        <tr><td><strong>MVI</strong></td><td>Model–View–Intent</td>
          <td>Unidirectional flow with user <em>intents</em> as a stream (Unidirectional section).</td></tr>
      </table>

      <h3>What about "MMVC"?</h3>
      <p><strong>"MMVC" is not a standard architecture pattern name.</strong> You won't find it next
      to MVC, MVP and MVVM in books or framework docs. If you've seen or typed "mmvc", the most
      likely explanation is a <strong>typo for MVVM</strong> (the letters are nearly the same!) or
      for MVC. That's a very easy slip, and it's the reason this lesson exists.</p>
      <p>The letters do occasionally appear as the <em>name of a specific library</em> (for example,
      a small Haxe framework modelled on Robotlegs was called <code>mmvc</code>), or in someone's
      blog for their own variant. If you meet it in a particular codebase, read that project's own
      definition. Don't assume there is one agreed meaning.</p>
      <div class="tip"><strong>How to decode any new acronym:</strong> ask the same three
      questions you've used all course. (1) Who holds the state? (2) Who knows about whom? (3) Which
      way does data flow? Answer those, and the name is just a label.</div>
      <div class="warn">Different articles define the same acronym slightly differently, especially
      the older ones (MVA, MVCS, HMVC). If two sources disagree, that's normal. Focus on the
      responsibilities, not the letters.</div>
    `,
    examples: [
      {
        title: 'Pattern card explorer',
        lang: 'html',
        code: `<style>
  #chips button.on { background: #4f6bed; color: #fff; border-color: #4f6bed; }
  .card { border: 1px solid #c5c9d6; border-radius: 10px; padding: 10px 14px; margin-top: 8px; }
  .card h3 { margin: 0 0 4px; }
  .card dt { font-weight: bold; margin-top: 6px; }
  .card dd { margin: 0 0 0 12px; }
  .warn-card { border-color: #d9a400; background: #fff9e6; }
</style>
<div id="chips"></div>
<div id="card" class="card"></div>
<script>
  const PATTERNS = [
    { name: 'MVC', full: 'Model–View–Controller',
      idea: 'Model holds data; View shows it (in classic MVC it observes the model); '
        + 'Controller handles input.',
      knows: 'View → Model (observes). Controller → Model + View.',
      origin: 'Trygve Reenskaug, Smalltalk, late 1970s.',
      where: 'Rails, Django (calls it MTV), ASP.NET MVC, Spring MVC.' },
    { name: 'HMVC', full: 'Hierarchical MVC',
      idea: 'MVC triads nested in a tree. Parents create and talk to child triads.',
      knows: 'Parent controller → child controllers. Siblings only via the parent.',
      origin: 'Often traced to a 2000 JavaWorld article (Cai, Kapila, Pal).',
      where: 'Some PHP frameworks and add-ons '
        + '(Kohana, CodeIgniter "Modular Extensions – HMVC").' },
    { name: 'PAC', full: 'Presentation–Abstraction–Control',
      idea: 'A hierarchy of agents, each with P (UI), A (data) and C (glue).',
      knows: 'P and A never talk directly. C mediates and talks to parent/child agents.',
      origin: 'Joëlle Coutaz, 1987.',
      where: 'Mostly in research and architecture literature; a close cousin of HMVC.' },
    { name: 'MVCS', full: 'Model–View–Controller–Service',
      idea: 'MVC plus Services that talk to servers/APIs, so models only hold state.',
      knows: 'Controllers (commands) → Services → Models.',
      origin: 'Best known from the Robotlegs framework (ActionScript 3).',
      where: 'Flash/Flex apps; the idea (a service layer) is everywhere.' },
    { name: 'MVA', full: 'Model–View–Adapter',
      idea: 'Everything goes through the adapter (a "mediating controller").',
      knows: 'View ↔ Adapter ↔ Model. View and Model never meet.',
      origin: 'Grew out of MVC practice; exact origin is unclear.',
      where: 'Cocoa-style desktop apps; very close to MVP.' },
    { name: 'MVP', full: 'Model–View–Presenter',
      idea: 'A passive view; the presenter pulls data and pushes it into the view.',
      knows: 'Presenter → View (via an interface) + Model.',
      origin: 'Taligent (Mike Potel), 1990s; '
        + 'later Dolphin Smalltalk and Martin Fowler\\'s writing.',
      where: 'WinForms, older Android, GWT.' },
    { name: 'MVVM', full: 'Model–View–ViewModel',
      idea: 'The ViewModel exposes bindable state + commands; bindings keep the view in sync.',
      knows: 'View → ViewModel (binding). ViewModel does not know the view.',
      origin: 'John Gossman, Microsoft, 2005 (WPF).',
      where: 'WPF, .NET MAUI, Android Jetpack, SwiftUI apps, Vue-style frameworks.' },
    { name: 'MVVM-C', full: 'MVVM + Coordinator',
      idea: 'MVVM per screen, plus a Coordinator that owns navigation.',
      knows: 'Coordinator → ViewModels. ViewModels only emit events.',
      origin: 'Coordinator idea popularised by Soroush Khanlou (~2015).',
      where: 'iOS (UIKit) apps.' },
    { name: 'VIPER', full: 'View–Interactor–Presenter–Entity–Router',
      idea: 'MVP + a use-case Interactor + a Router, per screen.',
      knows: 'View ↔ Presenter ↔ Interactor; Presenter → Router.',
      origin: 'objc.io article by Mutual Mobile engineers, 2014.',
      where: 'Larger iOS apps.' },
    { name: 'MVI', full: 'Model–View–Intent',
      idea: 'User intents → new state (a reducer) → view renders state. One direction.',
      knows: 'View emits intents; model produces state; view renders it.',
      origin: 'André Staltz / Cycle.js (~2015); later popular on Android.',
      where: 'Android (Kotlin), Cycle.js.' },
    { name: 'MVU', full: 'Model–View–Update (The Elm Architecture)',
      idea: 'Pure view(model) and pure update(msg, model); the runtime runs the loop.',
      knows: 'View emits messages; update returns the next model.',
      origin: 'Elm (Evan Czaplicki), 2010s.',
      where: 'Elm, Fabulous (F#), Comet (.NET MAUI, experimental), Iced (Rust).' },
    { name: 'MMVC?', full: 'Not a standard pattern name',
      idea: 'Most likely a typo for MVVM (or MVC). An easy slip!',
      knows: 'n/a',
      origin: 'Occasionally used as a library name (e.g. a Haxe port of Robotlegs) '
        + 'or for someone\\'s own variant.',
      where: 'If you see it in a codebase, read that project\\'s own definition.',
      warn: true },
  ];

  const chips = document.getElementById('chips');
  const card = document.getElementById('card');

  function row(label, text) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = text;
    return [dt, dd];
  }

  function show(p) {
    [...chips.children].forEach(b => b.classList.toggle('on', b.textContent === p.name));
    card.className = 'card' + (p.warn ? ' warn-card' : '');
    card.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = p.name + ' — ' + p.full;
    const dl = document.createElement('dl');
    dl.append(
      ...row('Big idea', p.idea),
      ...row('Who knows whom', p.knows),
      ...row('Origin (commonly cited)', p.origin),
      ...row('Where you meet it', p.where),
    );
    card.append(h, dl);
  }

  for (const p of PATTERNS) {
    const b = document.createElement('button');
    b.textContent = p.name;
    b.onclick = () => show(p);
    chips.append(b);
  }
  show(PATTERNS[PATTERNS.length - 1]);
</script>`,
      },
      {
        title: 'Match the description to the name',
        lang: 'html',
        code: `<style>
  #q { font-weight: bold; min-height: 3em; }
  #opts button { min-width: 80px; }
  #fb { min-height: 1.5em; margin-top: 6px; }
  .ok { color: #070; } .bad { color: #c00; }
</style>
<p id="progress"></p>
<p id="q"></p>
<div id="opts"></div>
<p id="fb"></p>
<button id="next" disabled>Next ›</button>
<script>
  const ROUNDS = [
    { text: 'MVC triads nested inside each other; a parent controller talks to child triads.',
      options: ['PAC', 'HMVC', 'MVCS', 'MVU'], answer: 'HMVC' },
    { text: 'Agents with Presentation, Abstraction and Control; P and A never talk (1987).',
      options: ['PAC', 'MVA', 'MVP', 'VIPER'], answer: 'PAC' },
    { text: 'MVC plus a layer of objects that talk to servers, popular in Robotlegs (AS3).',
      options: ['MVI', 'MVVM-C', 'MVCS', 'HMVC'], answer: 'MVCS' },
    { text: 'View and model never reference each other; a mediating controller passes everything.',
      options: ['MVA', 'MVC', 'MVU', 'MVVM'], answer: 'MVA' },
    { text: 'Pure update(msg, model) and pure view(model): The Elm Architecture.',
      options: ['MVVM', 'MVU', 'MVI', 'PAC'], answer: 'MVU' },
    { text: 'MVVM screens plus one object that owns the navigation flow.',
      options: ['VIPER', 'MVVM-C', 'MVCS', 'HMVC'], answer: 'MVVM-C' },
    { text: 'Someone wrote "MMVC". What did they most likely mean?',
      options: ['A standard 5th pattern', 'MVVM (typo)', 'Multi-Model Controller', 'MVU'],
      answer: 'MVVM (typo)' },
  ];
  let i = 0;
  let score = 0;
  const $ = id => document.getElementById(id);

  function render() {
    const r = ROUNDS[i];
    $('progress').textContent = 'Round ' + (i + 1) + ' of ' + ROUNDS.length + ' · score ' + score;
    $('q').textContent = r.text;
    $('fb').textContent = '';
    $('next').disabled = true;
    $('opts').innerHTML = '';
    for (const name of r.options) {
      const b = document.createElement('button');
      b.textContent = name;
      b.onclick = () => pick(name);
      $('opts').append(b);
    }
  }

  function pick(name) {
    const r = ROUNDS[i];
    const right = name === r.answer;
    if (right) score++;
    $('fb').className = right ? 'ok' : 'bad';
    $('fb').textContent = right ? '✓ Correct!' : '✗ Not quite: it is ' + r.answer + '.';
    [...$('opts').children].forEach(b => { b.disabled = true; });
    $('next').disabled = false;
    $('progress').textContent = 'Round ' + (i + 1) + ' of ' + ROUNDS.length + ' · score ' + score;
  }

  $('next').onclick = () => {
    i++;
    if (i < ROUNDS.length) {
      render();
      return;
    }
    $('q').textContent = 'Done! You scored ' + score + ' / ' + ROUNDS.length + '.';
    $('opts').innerHTML = '';
    $('fb').textContent = '';
    $('next').disabled = true;
  };
  render();
</script>`,
      },
      {
        title: 'HMVC in plain JS: a parent triad with child triads',
        code: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ===== CHILD TRIAD (a complete little MVC of its own) =====
function createCounterTriad(name) {
  // MODEL
  const model = { count: 0 };

  // VIEW
  const element = document.createElement('div');
  const label = document.createElement('span');
  element.append(label);
  function render() {
    label.textContent = name + ': ' + model.count + ' ';
  }

  // CONTROLLER (the only part the parent talks to)
  const controller = {
    element,
    onChange: null, // the parent plugs in here
    getCount: () => model.count,
    increment() {
      model.count++;
      console.log('[' + name + ' Controller] count = ' + model.count);
      render();
      if (controller.onChange) controller.onChange();
    },
    reset() {
      model.count = 0;
      console.log('[' + name + ' Controller] reset');
      render();
    },
  };
  element.append(button('+1', () => controller.increment()));
  render();
  return controller;
}

// ===== PARENT TRIAD (its "model" is made of child triads) =====
function createDashboardTriad(root) {
  // MODEL
  const children = [createCounterTriad('Likes'), createCounterTriad('Shares')];

  // VIEW
  const total = document.createElement('p');
  root.append(...children.map(c => c.element), total, button('Reset all', () => resetAll()));
  function render() {
    const sum = children.reduce((s, c) => s + c.getCount(), 0);
    total.textContent = 'Total: ' + sum;
    return sum;
  }

  // CONTROLLER
  function resetAll() {
    console.log('[Dashboard Controller] reset all children');
    children.forEach(c => c.reset());
    render();
  }
  children.forEach(child => {
    child.onChange = () => {
      const sum = render();
      console.log('[Dashboard Controller] a child changed → total ' + sum);
    };
  });
  render();
}

createDashboardTriad(document.getElementById('root'));`,
        explain: `
          <details>
            <summary>Step by step: "+1" on Likes, then "Reset all"</summary>
            <table>
              <tr><th>Action</th><th>Console</th><th>Who talks to whom</th></tr>
              <tr><td>+1 on Likes</td><td><code>[Likes Controller] count = 1</code><br>
                <code>[Dashboard Controller] a child changed → total 1</code></td>
                <td>Child handles its own input, then notifies its <strong>parent</strong> (never
                Shares).</td></tr>
              <tr><td>Reset all</td><td><code>[Dashboard Controller] reset all children</code><br>
                <code>[Likes Controller] reset</code><br><code>[Shares Controller] reset</code></td>
                <td>Parent controller sends a command <strong>down</strong> to each child
                controller.</td></tr>
            </table>
            <p>That's the whole of HMVC: each widget is a full MVC triad, and triads are arranged in a
            tree where communication goes through controllers, up to the parent or down to the
            children. Component trees in React and Vue (next section) work in a very similar shape:
            props go down, events go up.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What is "MMVC"?',
        options: [
          'The official successor to MVVM',
          'Not a standard pattern name; most likely a typo for MVVM (or MVC)',
          'Model–Model–View–Controller, defined by Reenskaug',
          'The Microsoft name for MVU',
        ],
        answer: 1,
        why: 'There is no widely recognised pattern called MMVC. It is almost always a slip for MVVM. If a specific project uses the name, check that project\'s own definition.',
      },
      {
        q: 'In PAC, how do the Presentation and the Abstraction communicate?',
        options: ['Directly, via data binding', 'Only through the Control', 'Through a global store', 'They share one object'],
        answer: 1,
        why: 'Control mediates between P and A, and also talks to parent and child agents in the hierarchy.',
      },
      {
        q: 'MVU is another name for…',
        options: ['MVVM with signals', 'The Elm Architecture', 'Hierarchical MVC', 'VIPER'],
        answer: 1,
        why: 'Model–View–Update: a model, a pure view function and a pure update function. Used in Elm and in .NET libraries like Fabulous and Comet.',
      },
      {
        q: 'What does the S in MVCS add?',
        options: [
          'Signals for reactivity',
          'A Service layer that talks to servers and APIs',
          'A Store like Redux',
          'Sub-views',
        ],
        answer: 1,
        why: 'Services handle the outside world (like remote calls), so models only hold state. The name is best known from Robotlegs (AS3).',
      },
      {
        q: 'In HMVC, how does a child triad tell its sibling something?',
        options: [
          'It calls the sibling\'s controller directly',
          'It edits the sibling\'s model',
          'It goes through the parent controller',
          'Siblings share a view',
        ],
        answer: 2,
        why: 'Triads form a tree. Children report to their parent, and the parent decides what to tell the other children.',
      },
    ],
    exercise: {
      task: `<p>Extend the HMVC dashboard:</p>
        <ol>
          <li>Add a third child triad, <strong>Comments</strong>.</li>
          <li>When the total reaches <strong>5 or more</strong>, the parent shows
          "🔥 Trending!" under the total (and hides it again after "Reset all").</li>
        </ol>
        <p>The children must not change: this is purely a parent-controller job.</p>`,
      starter: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ===== CHILD TRIAD (don't change this) =====
function createCounterTriad(name) {
  const model = { count: 0 };
  const element = document.createElement('div');
  const label = document.createElement('span');
  element.append(label);
  function render() {
    label.textContent = name + ': ' + model.count + ' ';
  }
  const controller = {
    element,
    onChange: null,
    getCount: () => model.count,
    increment() {
      model.count++;
      console.log('[' + name + ' Controller] count = ' + model.count);
      render();
      if (controller.onChange) controller.onChange();
    },
    reset() {
      model.count = 0;
      render();
    },
  };
  element.append(button('+1', () => controller.increment()));
  render();
  return controller;
}

// ===== PARENT TRIAD =====
function createDashboardTriad(root) {
  // TODO: add a 'Comments' child
  const children = [createCounterTriad('Likes'), createCounterTriad('Shares')];

  const total = document.createElement('p');
  // TODO: an element for the "Trending" badge
  root.append(...children.map(c => c.element), total, button('Reset all', () => resetAll()));

  function render() {
    const sum = children.reduce((s, c) => s + c.getCount(), 0);
    total.textContent = 'Total: ' + sum;
    // TODO: show "🔥 Trending!" when sum >= 5
  }

  function resetAll() {
    children.forEach(c => c.reset());
    render();
  }
  children.forEach(child => {
    child.onChange = render;
  });
  render();
}

createDashboardTriad(document.getElementById('root'));`,
      hint: 'Add createCounterTriad(\'Comments\') to the children array. Create a <p> for the badge, append it after total, and in render() set its textContent to sum >= 5 ? \'🔥 Trending!\' : \'\'.',
      solution: `function button(text, onClick) {
  const b = document.createElement('button');
  b.textContent = text;
  b.addEventListener('click', onClick);
  return b;
}

// ===== CHILD TRIAD (unchanged) =====
function createCounterTriad(name) {
  const model = { count: 0 };
  const element = document.createElement('div');
  const label = document.createElement('span');
  element.append(label);
  function render() {
    label.textContent = name + ': ' + model.count + ' ';
  }
  const controller = {
    element,
    onChange: null,
    getCount: () => model.count,
    increment() {
      model.count++;
      console.log('[' + name + ' Controller] count = ' + model.count);
      render();
      if (controller.onChange) controller.onChange();
    },
    reset() {
      model.count = 0;
      render();
    },
  };
  element.append(button('+1', () => controller.increment()));
  render();
  return controller;
}

// ===== PARENT TRIAD =====
const TRENDING_AT = 5;

function createDashboardTriad(root) {
  const children = [
    createCounterTriad('Likes'),
    createCounterTriad('Shares'),
    createCounterTriad('Comments'),
  ];

  const total = document.createElement('p');
  const badge = document.createElement('p');
  const resetBtn = button('Reset all', () => resetAll());
  root.append(...children.map(c => c.element), total, badge, resetBtn);

  function render() {
    const sum = children.reduce((s, c) => s + c.getCount(), 0);
    total.textContent = 'Total: ' + sum;
    badge.textContent = sum >= TRENDING_AT ? '🔥 Trending!' : '';
    console.log('[Dashboard Controller] total ' + sum);
  }

  function resetAll() {
    children.forEach(c => c.reset());
    render();
  }
  children.forEach(child => {
    child.onChange = render;
  });
  render();
}

createDashboardTriad(document.getElementById('root'));`,
    },
  },

  // ==========================================================================
  // COMPONENT ARCHITECTURE
  // ==========================================================================
  {
    id: 'component-architecture',
    section: 'Putting it together',
    title: 'Component architecture: container/presentational & hooks',
    explain: `
      <p>Modern UI frameworks (React, Vue, Svelte, Angular, SwiftUI, Jetpack Compose) are built
      around <strong>components</strong>: small pieces that bundle a bit of UI, its local state and
      its behaviour. An app is a <strong>tree</strong> of components. Data flows <em>down</em> as
      props; events flow <em>up</em> as callbacks. (Sound familiar? It's the HMVC tree shape from
      the zoo lesson, and each render is UI = f(state) from Foundations.)</p>
      <p>Because each component already mixes "view" and "logic", the question becomes:
      <strong>how do we keep a component from turning into a Massive View Controller?</strong>
      Two well-known answers:</p>

      <h3>1. Container vs presentational components</h3>
      <p>In a 2015 article, <strong>Dan Abramov</strong> described splitting components in two kinds:</p>
      <table>
        <tr><th></th><th>Presentational</th><th>Container</th></tr>
        <tr><td>Job</td><td>How things <em>look</em></td><td>How things <em>work</em></td></tr>
        <tr><td>Gets data from</td><td>props only</td><td>state, fetching, stores</td></tr>
        <tr><td>Changes data by</td><td>calling callback props</td><td>setState, dispatch, API calls</td></tr>
        <tr><td>Similar to</td><td>a passive View (MVP)</td><td>a Presenter / Controller</td></tr>
      </table>
      <p>Later he added a note saying he <strong>no longer recommends splitting components this
      way as a rule</strong>, because <strong>Hooks</strong> let you move the logic out without
      inventing an extra component. The <em>idea</em> (keep dumb display parts separate from
      logic) is still useful; the strict rule is not.</p>

      <h3>2. Custom hooks as ViewModels</h3>
      <p>A <strong>custom hook</strong> is a function whose name starts with <code>use</code> and
      which calls other hooks. It can own state, effects and derived values, and return them plus
      some functions. That is exactly what a <strong>ViewModel</strong> is in MVVM: bindable state +
      commands, with no JSX. The component becomes a thin View that just renders what the hook
      returns.</p>
      <pre><code class="language-jsx">function useUserSearch() {          // ≈ ViewModel
  const [query, setQuery] = useState('');
  // …state, effects, derived values…
  return { query, setQuery, visible, loading };
}

function UserSearch() {             // ≈ View
  const vm = useUserSearch();
  return &lt;UserList users={vm.visible} … /&gt;;
}</code></pre>
      <div class="tip">Vue's version of the same idea is a <strong>composable</strong>
      (<code>useSomething()</code> built on <code>ref</code> / <code>computed</code>). Svelte and
      Solid have similar "logic in a function, UI in a component" patterns.</div>
      <div class="warn">Not every component needs a hook. A 15-line component with one
      <code>useState</code> is already clear. Extract a hook when logic is long, reused, or you want
      to test it separately.</div>
    `,
    examples: [
      {
        title: 'Container + presentational (the 2015 way)',
        lang: 'react',
        code: `import { useState, useEffect } from 'react';

const ALL_USERS = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'];

function fakeFetchUsers() {
  return new Promise(resolve => setTimeout(() => resolve(ALL_USERS), 500));
}

// ===== PRESENTATIONAL: props in, JSX out. No state, no fetching. =====
function UserList({ users, query, onQueryChange, loading }) {
  console.log('[View] UserList render: ' + users.length + ' user(s)');
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <input
        value={query}
        placeholder="Filter…"
        onChange={e => onQueryChange(e.target.value)}
      />
      {loading ? <p>Loading…</p> : (
        <ul>
          {users.map(u => <li key={u}>{u}</li>)}
        </ul>
      )}
    </div>
  );
}

// ===== CONTAINER: owns state + data loading, renders the presentational one =====
function UserListContainer() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    console.log('[Container] fetching users');
    fakeFetchUsers().then(data => {
      if (ignore) return;
      console.log('[Container] got ' + data.length + ' users');
      setUsers(data);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const visible = users.filter(u => u.toLowerCase().includes(query.toLowerCase()));
  return <UserList users={visible} query={query} onQueryChange={setQuery} loading={loading} />;
}

export default function App() {
  return (
    <div>
      <b>Real container:</b>
      <UserListContainer />
      <b>Same presentational component with fake props (like a Storybook preview):</b>
      <UserList
        users={['Preview A', 'Preview B']}
        query=""
        onQueryChange={() => {}}
        loading={false}
      />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Why split it like this?</summary>
            <p><code>UserList</code> knows nothing about where users come from. That's why the
            second copy at the bottom can be fed fake data: that's how design tools like Storybook
            and simple tests use presentational components. The container is the only part that knows
            about fetching.</p>
            <p>Type in the first filter box: the container's <code>query</code> state changes, it
            re-renders, and passes a new filtered list down. You'll see
            <code>[View] UserList render: …</code> for each keystroke. The second (preview) box
            doesn't filter anything, because its <code>onQueryChange</code> does nothing: presentational
            components only <em>ask</em>; the owner decides.</p>
          </details>
        `,
      },
      {
        title: 'The same thing with a custom hook as the ViewModel',
        lang: 'react',
        code: `import { useState, useEffect } from 'react';

const ALL_USERS = ['Ana', 'Ben', 'Cy', 'Dee', 'Eli'];

function fakeFetchUsers() {
  return new Promise(resolve => setTimeout(() => resolve(ALL_USERS), 500));
}

// ===== "VIEWMODEL": a custom hook. State + derived values + commands, no JSX. =====
function useUserSearch() {
  const [users, setUsers] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    console.log('[ViewModel] fetching users');
    fakeFetchUsers().then(data => {
      if (ignore) return;
      console.log('[ViewModel] got ' + data.length + ' users');
      setUsers(data);
      setLoading(false);
    });
    return () => {
      ignore = true;
    };
  }, []);

  const visible = users.filter(u => u.toLowerCase().includes(query.toLowerCase()));

  return {
    query,
    loading,
    visible,
    summary: loading ? '' : visible.length + ' of ' + users.length + ' shown',
    setQuery,
    clear: () => setQuery(''),
  };
}

// ===== VIEW: renders whatever the hook returns =====
export default function App() {
  const vm = useUserSearch();
  console.log('[View] render: query=' + JSON.stringify(vm.query));

  return (
    <div>
      <input value={vm.query} placeholder="Filter…" onChange={e => vm.setQuery(e.target.value)} />
      <button onClick={vm.clear} disabled={!vm.query}>Clear</button>
      {vm.loading ? <p>Loading…</p> : (
        <>
          <ul>
            {vm.visible.map(u => <li key={u}>{u}</li>)}
          </ul>
          <small>{vm.summary}</small>
        </>
      )}
    </div>
  );
}`,
        explain: `
          <details>
            <summary>How this maps to MVVM</summary>
            <table>
              <tr><th>MVVM role</th><th>Here</th></tr>
              <tr><td>Model</td><td><code>fakeFetchUsers</code> (the data source)</td></tr>
              <tr><td>ViewModel state</td><td><code>query</code>, <code>loading</code></td></tr>
              <tr><td>ViewModel derived values</td><td><code>visible</code>, <code>summary</code>
                (recomputed each render, like computed properties)</td></tr>
              <tr><td>ViewModel commands</td><td><code>setQuery</code>, <code>clear</code></td></tr>
              <tr><td>View</td><td><code>App</code>: only reads <code>vm.*</code> and calls
                <code>vm.*</code></td></tr>
              <tr><td>Binding</td><td>React re-rendering when state changes</td></tr>
            </table>
            <p>Compared with the container version, there's no extra wrapper component. And
            <code>useUserSearch</code> can be reused by a totally different view (a dropdown, a
            table) without copying any logic.</p>
            <div class="tip">Unlike a class-based ViewModel, a hook's state belongs to the component
            that calls it. Two components calling <code>useUserSearch()</code> get two
            <strong>independent</strong> copies. To share one copy, lift it up to a common parent,
            put it in context, or use a store (Redux, Zustand…).</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'A presentational component…',
        options: [
          'fetches its own data',
          'gets everything through props and reports events through callback props',
          'must be a class',
          'dispatches Redux actions directly',
        ],
        answer: 1,
        why: 'It only cares how things look. Data comes in as props, and user actions go out through callbacks such as onQueryChange.',
      },
      {
        q: 'What did Dan Abramov later say about the container/presentational split?',
        options: [
          'It is mandatory in React 19',
          'He no longer suggests splitting components this way as a rule, since Hooks can hold the logic',
          'It only works with class components',
          'Containers should render HTML directly',
        ],
        answer: 1,
        why: 'His updated note says Hooks let you get the same benefit without the extra component layer. The underlying idea is still handy.',
      },
      {
        q: 'In MVVM terms, a custom hook like <code>useUserSearch()</code> is closest to…',
        options: ['the Model', 'the View', 'the ViewModel', 'the Router'],
        answer: 2,
        why: 'It holds UI state, derived values and commands, with no markup, so the component can simply render it.',
      },
      {
        q: 'Two different components each call <code>useUserSearch()</code>. What happens to <code>query</code>?',
        options: [
          'They share one query value',
          'Each component gets its own independent query',
          'React throws an error',
          'The second call returns undefined',
        ],
        answer: 1,
        why: 'Hooks reuse logic, not state. To share state, lift it up, use context, or use a store.',
      },
    ],
    exercise: {
      lang: 'react',
      task: `<p>This <code>TodoApp</code> does everything in one component. Refactor it into:</p>
        <ol>
          <li>a custom hook <code>useTodos()</code> (the ViewModel) returning
          <code>{ todos, text, setText, add, toggle, remaining }</code>, and</li>
          <li>a presentational <code>TodoView</code> that receives those as props and has
          <strong>no</strong> <code>useState</code> of its own.</li>
        </ol>
        <p>The app must behave exactly the same.</p>`,
      starter: `import { useState } from 'react';

export default function App() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn MVVM', done: true },
    { id: 2, text: 'Learn hooks', done: false },
  ]);
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    setTodos([...todos, { id: Date.now(), text: text.trim(), done: false }]);
    setText('');
  }

  function toggle(id) {
    setTodos(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  const remaining = todos.filter(t => !t.done).length;

  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="New todo" />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
            {t.done ? '✅' : '⬜'} {t.text}
          </li>
        ))}
      </ul>
      <p>{remaining} left</p>
    </div>
  );
}`,
      hint: 'Move the two useState calls, add, toggle and remaining into function useTodos() { … return { … }; }. Then App becomes: const vm = useTodos(); return <TodoView {...vm} />;',
      solution: `import { useState } from 'react';

// ===== VIEWMODEL (custom hook) =====
function useTodos() {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn MVVM', done: true },
    { id: 2, text: 'Learn hooks', done: false },
  ]);
  const [text, setText] = useState('');

  function add() {
    if (!text.trim()) return;
    setTodos([...todos, { id: Date.now(), text: text.trim(), done: false }]);
    setText('');
  }

  function toggle(id) {
    setTodos(todos.map(t => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  const remaining = todos.filter(t => !t.done).length;

  return { todos, text, setText, add, toggle, remaining };
}

// ===== PRESENTATIONAL VIEW (props only) =====
function TodoView({ todos, text, setText, add, toggle, remaining }) {
  return (
    <div>
      <input value={text} onChange={e => setText(e.target.value)} placeholder="New todo" />
      <button onClick={add}>Add</button>
      <ul>
        {todos.map(t => (
          <li key={t.id} onClick={() => toggle(t.id)} style={{ cursor: 'pointer' }}>
            {t.done ? '✅' : '⬜'} {t.text}
          </li>
        ))}
      </ul>
      <p>{remaining} left</p>
    </div>
  );
}

// ===== WIRING =====
export default function App() {
  const vm = useTodos();
  return <TodoView {...vm} />;
}`,
    },
  },

  // ==========================================================================
  // CAPSTONE: SAME APP, FIVE PATTERNS
  // ==========================================================================
  {
    id: 'same-app-many-ways',
    section: 'Putting it together',
    title: 'Capstone: one counter-with-limit app, five patterns',
    explain: `
      <p>Time to put everything side by side. Below is <strong>one tiny app</strong>, built
      <strong>five times</strong>. Every version behaves identically:</p>
      <ul>
        <li>Shows <code>Count: N</code>, starting at 0.</li>
        <li><strong>−</strong> and <strong>+</strong> buttons, limited to 0…5.</li>
        <li>"−" is disabled at 0, "+" is disabled at 5.</li>
        <li>At 5 a red <strong>"Max reached"</strong> message appears.</li>
      </ul>
      <p>What changes is <strong>who owns the state</strong>, <strong>who decides the button
      states</strong>, and <strong>which way messages travel</strong>. Every version logs with role
      prefixes, so click "+" once in each and compare the consoles. The walkthrough under the
      Redux example lines them all up.</p>
      <table>
        <tr><th>Version</th><th>State lives in</th><th>"Is + disabled?" decided by</th><th>View updates because…</th></tr>
        <tr><td>MVC</td><td>Model</td><td>View (reads model)</td><td>it observes the model</td></tr>
        <tr><td>MVP</td><td>Model</td><td>Presenter</td><td>the presenter calls its setters</td></tr>
        <tr><td>MVVM</td><td>ViewModel (observable)</td><td>ViewModel (computed)</td>
          <td>bindings react to changes</td></tr>
        <tr><td>Redux-style</td><td>Store (one state object)</td><td>selectors</td>
          <td>it subscribes to the store</td></tr>
        <tr><td>MVI</td><td>Model stream (view state)</td><td>Model (in the view state)</td>
          <td>it renders every new view state</td></tr>
      </table>
      <div class="tip">For an app this small, all five are overkill: 15 lines of plain code would do.
      That's the point of a capstone: the tiny size makes the <em>differences in shape</em> easy to see.
      The next lesson is about choosing.</div>
    `,
    examples: [
      {
        title: '1. MVC: the view observes the model',
        code: `// Counter 0..5 as classic MVC
const MIN = 0;
const MAX = 5;

// ===== MODEL (state + rules + observers) =====
class CounterModel {
  constructor() {
    this.count = MIN;
    this.listeners = [];
  }
  subscribe(fn) {
    this.listeners.push(fn);
  }
  increment() {
    if (this.count >= MAX) return;
    this.count++;
    const n = this.listeners.length;
    console.log('[Model] count = ' + this.count + ', notifying ' + n + ' view(s)');
    this.listeners.forEach(fn => fn());
  }
  decrement() {
    if (this.count <= MIN) return;
    this.count--;
    const n = this.listeners.length;
    console.log('[Model] count = ' + this.count + ', notifying ' + n + ' view(s)');
    this.listeners.forEach(fn => fn());
  }
}

// ===== VIEW (draws itself by reading the model) =====
class CounterView {
  constructor(root, model) {
    this.model = model;
    this.label = document.createElement('p');
    this.minus = document.createElement('button');
    this.minus.textContent = '−';
    this.plus = document.createElement('button');
    this.plus.textContent = '+';
    this.message = document.createElement('p');
    this.message.style.color = '#c00';
    root.append(this.label, this.minus, this.plus, this.message);
    model.subscribe(() => this.render()); // the view OBSERVES the model
    this.render();
  }
  render() {
    const count = this.model.count;
    console.log('[View] render: reads model.count = ' + count);
    this.label.textContent = 'Count: ' + count;
    this.minus.disabled = count <= MIN;
    this.plus.disabled = count >= MAX;
    this.message.textContent = count >= MAX ? 'Max reached' : '';
  }
}

// ===== CONTROLLER (turns input into model calls) =====
class CounterController {
  constructor(model, view) {
    view.plus.addEventListener('click', () => {
      console.log('[Controller] "+" clicked → model.increment()');
      model.increment();
    });
    view.minus.addEventListener('click', () => {
      console.log('[Controller] "−" clicked → model.decrement()');
      model.decrement();
    });
  }
}

const model = new CounterModel();
const view = new CounterView(document.getElementById('root'), model);
new CounterController(model, view);`,
      },
      {
        title: '2. MVP: a passive view, the presenter does the thinking',
        code: `// Counter 0..5 as MVP (passive view)
const MIN = 0;
const MAX = 5;

// ===== MODEL (plain state + rules, no observers) =====
class CounterModel {
  constructor() {
    this.count = MIN;
  }
  increment() {
    if (this.count < MAX) this.count++;
    console.log('[Model] count = ' + this.count);
  }
  decrement() {
    if (this.count > MIN) this.count--;
    console.log('[Model] count = ' + this.count);
  }
}

// ===== VIEW (passive: setters + event hooks, zero logic) =====
class CounterView {
  constructor(root) {
    this.label = document.createElement('p');
    this.minus = document.createElement('button');
    this.minus.textContent = '−';
    this.plus = document.createElement('button');
    this.plus.textContent = '+';
    this.message = document.createElement('p');
    this.message.style.color = '#c00';
    root.append(this.label, this.minus, this.plus, this.message);
  }
  onPlus(handler) {
    this.plus.addEventListener('click', () => {
      console.log('[View] "+" clicked');
      handler();
    });
  }
  onMinus(handler) {
    this.minus.addEventListener('click', () => {
      console.log('[View] "−" clicked');
      handler();
    });
  }
  setCountText(text) {
    this.label.textContent = text;
  }
  setMinusEnabled(enabled) {
    this.minus.disabled = !enabled;
  }
  setPlusEnabled(enabled) {
    this.plus.disabled = !enabled;
  }
  setMessage(text) {
    this.message.textContent = text;
  }
}

// ===== PRESENTER (reacts to the view, updates the model, then the view) =====
class CounterPresenter {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    view.onPlus(() => this.plusClicked());
    view.onMinus(() => this.minusClicked());
    this.updateView();
  }
  plusClicked() {
    console.log('[Presenter] plusClicked → model.increment()');
    this.model.increment();
    this.updateView();
  }
  minusClicked() {
    console.log('[Presenter] minusClicked → model.decrement()');
    this.model.decrement();
    this.updateView();
  }
  updateView() {
    const count = this.model.count;
    console.log('[Presenter] updateView: count ' + count + ' → 4 view setters');
    this.view.setCountText('Count: ' + count);
    this.view.setMinusEnabled(count > MIN);
    this.view.setPlusEnabled(count < MAX);
    this.view.setMessage(count >= MAX ? 'Max reached' : '');
  }
}

new CounterPresenter(new CounterModel(), new CounterView(document.getElementById('root')));`,
      },
      {
        title: '3. MVVM: observables + bindings',
        code: `// Counter 0..5 as MVVM
const MIN = 0;
const MAX = 5;

// ===== TINY OBSERVABLE LIBRARY =====
function observable(initial) {
  let value = initial;
  const subs = [];
  return {
    get: () => value,
    set(next) {
      if (next === value) return; // unchanged → nobody is notified
      value = next;
      subs.forEach(fn => fn(value));
    },
    subscribe(fn) {
      subs.push(fn);
    },
  };
}

function computed(deps, fn) {
  const out = observable(fn());
  deps.forEach(dep => dep.subscribe(() => out.set(fn())));
  return out;
}

// ===== VIEWMODEL (state + derived state + commands; knows nothing about the DOM) =====
class CounterViewModel {
  constructor() {
    this.count = observable(MIN);
    this.countText = computed([this.count], () => 'Count: ' + this.count.get());
    this.canDecrement = computed([this.count], () => this.count.get() > MIN);
    this.canIncrement = computed([this.count], () => this.count.get() < MAX);
    this.message = computed([this.count], () => (this.count.get() >= MAX ? 'Max reached' : ''));
  }
  increment() {
    if (!this.canIncrement.get()) return;
    const next = this.count.get() + 1;
    console.log('[ViewModel] increment → count = ' + next);
    this.count.set(next);
  }
  decrement() {
    if (!this.canDecrement.get()) return;
    const next = this.count.get() - 1;
    console.log('[ViewModel] decrement → count = ' + next);
    this.count.set(next);
  }
}

// ===== BINDER (keeps DOM properties in sync with observables) =====
function bindText(el, obs, name) {
  el.textContent = obs.get();
  obs.subscribe(v => {
    console.log('[Binder] ' + name + ' ← ' + JSON.stringify(v));
    el.textContent = v;
  });
}

function bindEnabled(el, obs, name) {
  el.disabled = !obs.get();
  obs.subscribe(v => {
    console.log('[Binder] ' + name + ' ← ' + JSON.stringify(v));
    el.disabled = !v;
  });
}

// ===== VIEW (markup + bindings, no logic) =====
const vm = new CounterViewModel();
const root = document.getElementById('root');
const label = document.createElement('p');
const minus = document.createElement('button');
minus.textContent = '−';
const plus = document.createElement('button');
plus.textContent = '+';
const message = document.createElement('p');
message.style.color = '#c00';
root.append(label, minus, plus, message);

bindText(label, vm.countText, 'countText');
bindEnabled(minus, vm.canDecrement, 'canDecrement');
bindEnabled(plus, vm.canIncrement, 'canIncrement');
bindText(message, vm.message, 'message');

plus.addEventListener('click', () => {
  console.log('[View] "+" clicked → vm.increment()');
  vm.increment();
});
minus.addEventListener('click', () => {
  console.log('[View] "−" clicked → vm.decrement()');
  vm.decrement();
});`,
        explain: `
          <details>
            <summary>Step by step: bindings only fire for values that changed</summary>
            <p>Every computed value subscribes to <code>count</code>, and
            <code>observable.set</code> skips notifying when the value is the same. So one click
            only updates the DOM properties that actually changed:</p>
            <table>
              <tr><th>Click</th><th>Console</th><th>Silent (value unchanged)</th></tr>
              <tr><td>"+" at 0 → 1</td><td><code>[View] "+" clicked → vm.increment()</code><br>
                <code>[ViewModel] increment → count = 1</code><br>
                <code>[Binder] countText ← "Count: 1"</code><br>
                <code>[Binder] canDecrement ← true</code></td>
                <td><code>canIncrement</code> (still true), <code>message</code> (still "")</td></tr>
              <tr><td>"+" at 4 → 5</td><td><code>[View] "+" clicked → vm.increment()</code><br>
                <code>[ViewModel] increment → count = 5</code><br>
                <code>[Binder] countText ← "Count: 5"</code><br>
                <code>[Binder] canIncrement ← false</code><br>
                <code>[Binder] message ← "Max reached"</code></td>
                <td><code>canDecrement</code> (still true)</td></tr>
            </table>
            <p>The binder lines come out in the order the computed values were created in the
            ViewModel constructor: <code>countText</code>, <code>canDecrement</code>,
            <code>canIncrement</code>, <code>message</code>.</p>
          </details>
        `,
      },
      {
        title: '4. Redux-style: one store, pure reducer, selectors',
        code: `// Counter 0..5 as Redux-style unidirectional flow
const MIN = 0;
const MAX = 5;

// ===== REDUCER (pure: (state, action) → new state) =====
function counterReducer(state, action) {
  switch (action.type) {
    case 'counter/incremented':
      return state.count < MAX ? { count: state.count + 1 } : state;
    case 'counter/decremented':
      return state.count > MIN ? { count: state.count - 1 } : state;
    default:
      return state;
  }
}

// ===== SELECTORS (derive what the view needs from state) =====
const selectCanDecrement = state => state.count > MIN;
const selectCanIncrement = state => state.count < MAX;
const selectMessage = state => (state.count >= MAX ? 'Max reached' : '');

// ===== STORE =====
function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.push(fn);
    },
    dispatch(action) {
      console.log('[Store] dispatch ' + action.type);
      const prev = state;
      state = reducer(state, action);
      // logged here (not inside the reducer) so the reducer stays pure
      console.log('[Reducer] ' + JSON.stringify(prev) + ' → ' + JSON.stringify(state));
      if (state !== prev) listeners.forEach(fn => fn());
    },
  };
}

const store = createStore(counterReducer, { count: MIN });

// ===== VIEW (renders from state, dispatches actions) =====
const root = document.getElementById('root');
const label = document.createElement('p');
const minus = document.createElement('button');
minus.textContent = '−';
const plus = document.createElement('button');
plus.textContent = '+';
const message = document.createElement('p');
message.style.color = '#c00';
root.append(label, minus, plus, message);

function render() {
  const state = store.getState();
  console.log('[View] render from state ' + JSON.stringify(state));
  label.textContent = 'Count: ' + state.count;
  minus.disabled = !selectCanDecrement(state);
  plus.disabled = !selectCanIncrement(state);
  message.textContent = selectMessage(state);
}

plus.addEventListener('click', () => {
  console.log('[View] "+" clicked → dispatch counter/incremented');
  store.dispatch({ type: 'counter/incremented' });
});
minus.addEventListener('click', () => {
  console.log('[View] "−" clicked → dispatch counter/decremented');
  store.dispatch({ type: 'counter/decremented' });
});

store.subscribe(render);
render();`,
        explain: `
          <details>
            <summary>Side by side: the console for one "+" click (0 → 1) in each version</summary>
            <table>
              <tr><th>Pattern</th><th>Console, in order</th><th>What to notice</th></tr>
              <tr><td><strong>MVC</strong></td><td>
                <code>[Controller] "+" clicked → model.increment()</code><br>
                <code>[Model] count = 1, notifying 1 view(s)</code><br>
                <code>[View] render: reads model.count = 1</code></td>
                <td>The model <strong>pushes a notification</strong>; the view <strong>pulls</strong>
                the value and decides the button states itself.</td></tr>
              <tr><td><strong>MVP</strong></td><td>
                <code>[View] "+" clicked</code><br>
                <code>[Presenter] plusClicked → model.increment()</code><br>
                <code>[Model] count = 1</code><br>
                <code>[Presenter] updateView: count 1 → 4 view setters</code></td>
                <td>The model notifies nobody. The presenter <strong>pushes</strong> each value into the
                view.</td></tr>
              <tr><td><strong>MVVM</strong></td><td>
                <code>[View] "+" clicked → vm.increment()</code><br>
                <code>[ViewModel] increment → count = 1</code><br>
                <code>[Binder] countText ← "Count: 1"</code><br>
                <code>[Binder] canDecrement ← true</code></td>
                <td>Nobody calls "render". Bindings update <strong>only what changed</strong>.</td></tr>
              <tr><td><strong>Redux</strong></td><td>
                <code>[View] "+" clicked → dispatch counter/incremented</code><br>
                <code>[Store] dispatch counter/incremented</code><br>
                <code>[Reducer] {"count":0} → {"count":1}</code><br>
                <code>[View] render from state {"count":1}</code></td>
                <td>The view only sends a <strong>description</strong> of what happened. A new state
                object replaces the old one; the view re-renders from it.</td></tr>
              <tr><td><strong>MVI</strong></td><td>
                <code>[Intent] Increment</code><br>
                <code>[Model] Increment: count 0 → 1</code><br>
                <code>[View] render {"count":1,"canDecrement":true,"canIncrement":true,"message":""}</code></td>
                <td>Like Redux, but the model emits a complete <strong>view state</strong>, button
                flags included.</td></tr>
            </table>
          </details>
          <details>
            <summary>The same comparison as "who knows whom"</summary>
            <table>
              <tr><th></th><th>MVC</th><th>MVVM</th><th>Redux</th></tr>
              <tr><td>Input handled by</td><td>Controller</td><td>View → ViewModel command</td>
                <td>View → <code>dispatch</code></td></tr>
              <tr><td>New value computed by</td><td>Model method (mutates)</td>
                <td>ViewModel method (sets an observable)</td><td>Reducer (returns a new object)</td></tr>
              <tr><td>Screen updated by</td><td>View's <code>render()</code>, called by the model's
                notification</td><td>Binder, one property at a time</td>
                <td>View's <code>render()</code>, called by the store's subscription</td></tr>
              <tr><td>"+ disabled?" lives in</td><td>View (<code>count &gt;= MAX</code>)</td>
                <td>ViewModel (<code>canIncrement</code>)</td>
                <td>Selector (<code>selectCanIncrement</code>)</td></tr>
              <tr><td>Easy to unit-test without DOM</td><td>Model yes; view logic no</td>
                <td>ViewModel yes</td><td>Reducer + selectors yes (pure functions)</td></tr>
            </table>
            <div class="tip">Try clicking "+" five times in the MVC and Redux versions. At 5, the "+"
            button becomes disabled in both, but for different reasons: in MVC the <em>view</em> did
            <code>count &gt;= MAX</code>; in Redux a <em>selector</em> did. Moving that one line is the
            whole difference between "the view decides" and "logic outside the view decides".</div>
          </details>
        `,
      },
      {
        title: '5. MVI: intents → model → view state',
        code: `// Counter 0..5 as MVI (Model-View-Intent)
const MIN = 0;
const MAX = 5;

// ===== TINY STREAM =====
function createStream() {
  const subs = [];
  return {
    subscribe: fn => subs.push(fn),
    emit: value => subs.forEach(fn => fn(value)),
  };
}

// ===== DOM (created once; the view only writes to it) =====
function createDom(root) {
  const dom = {
    label: document.createElement('p'),
    minus: document.createElement('button'),
    plus: document.createElement('button'),
    message: document.createElement('p'),
  };
  dom.minus.textContent = '−';
  dom.plus.textContent = '+';
  dom.message.style.color = '#c00';
  root.append(dom.label, dom.minus, dom.plus, dom.message);
  return dom;
}

// ===== INTENT: raw DOM events → meaningful intents =====
function intent(dom) {
  const intents = createStream();
  dom.plus.addEventListener('click', () => {
    console.log('[Intent] Increment');
    intents.emit({ type: 'Increment' });
  });
  dom.minus.addEventListener('click', () => {
    console.log('[Intent] Decrement');
    intents.emit({ type: 'Decrement' });
  });
  return intents;
}

// ===== MODEL: intents → a stream of complete, immutable view states =====
function toViewState(count) {
  return {
    count,
    canDecrement: count > MIN,
    canIncrement: count < MAX,
    message: count >= MAX ? 'Max reached' : '',
  };
}

function model(intents) {
  const states = createStream();
  let state = toViewState(MIN);
  intents.subscribe(action => {
    const delta = action.type === 'Increment' ? 1 : -1;
    const count = Math.min(MAX, Math.max(MIN, state.count + delta));
    console.log('[Model] ' + action.type + ': count ' + state.count + ' → ' + count);
    state = toViewState(count);
    states.emit(state);
  });
  return { states, initial: state };
}

// ===== VIEW: view state → DOM (no decisions) =====
function view(dom, state) {
  console.log('[View] render ' + JSON.stringify(state));
  dom.label.textContent = 'Count: ' + state.count;
  dom.minus.disabled = !state.canDecrement;
  dom.plus.disabled = !state.canIncrement;
  dom.message.textContent = state.message;
}

// ===== WIRING: view(model(intent(dom))) =====
const dom = createDom(document.getElementById('root'));
const { states, initial } = model(intent(dom));
states.subscribe(state => view(dom, state));
view(dom, initial);`,
      },
    ],
    quiz: [
      {
        q: 'In which version does the <strong>view itself</strong> compute whether "+" is disabled?',
        options: ['MVC', 'MVP', 'MVVM', 'MVI'],
        answer: 0,
        why: 'The MVC view reads model.count and does count >= MAX itself. In MVP the presenter decides, in MVVM a computed property, in MVI the view state.',
      },
      {
        q: 'Clicking "+" at 0 in the MVVM version logs <code>canDecrement ← true</code> but no <code>canIncrement</code> line. Why?',
        options: [
          'A bug: canIncrement is not bound',
          'canIncrement was true before and is still true, so the observable did not notify',
          'The binder only handles the first two bindings',
          'canIncrement is computed from canDecrement',
        ],
        answer: 1,
        why: 'observable.set returns early when the value is unchanged, so only bindings whose value changed run.',
      },
      {
        q: 'In the Redux-style version, what does the view send when "+" is clicked?',
        options: [
          'The new count',
          'A plain action object describing what happened: <code>{ type: \'counter/incremented\' }</code>',
          'A call to <code>render()</code>',
          'A mutated state object',
        ],
        answer: 1,
        why: 'Views dispatch actions. Only the reducer decides the new state, and the store notifies subscribers.',
      },
      {
        q: 'What is special about the state the MVI model emits?',
        options: [
          'It only contains the count',
          'It is a complete view state, including flags like <code>canIncrement</code> and the message',
          'It is mutable so the view can change it',
          'It is sent to the controller',
        ],
        answer: 1,
        why: 'MVI models produce a single, immutable, complete view state; the view just draws it.',
      },
      {
        q: 'Which versions keep the model with <strong>no</strong> knowledge of any listener?',
        options: ['MVC only', 'MVP', 'MVC and MVVM', 'None'],
        answer: 1,
        why: 'The MVP model is a plain object with no subscribers. The presenter calls it and then updates the view. The MVC model keeps a listeners list.',
      },
    ],
    exercise: {
      task: `<p>Add a <strong>Reset</strong> button to the Redux-style version.</p>
        <ol>
          <li>Add a <code>'counter/reset'</code> case to the reducer that returns
          <code>{ count: MIN }</code>, but returns the <em>same</em> state object if the count is already
          <code>MIN</code> (so no re-render happens).</li>
          <li>Add a selector <code>selectCanReset</code> and use it to disable the button at 0.</li>
          <li>The click handler only dispatches. It must not touch the label or count.</li>
        </ol>`,
      starter: `const MIN = 0;
const MAX = 5;

function counterReducer(state, action) {
  switch (action.type) {
    case 'counter/incremented':
      return state.count < MAX ? { count: state.count + 1 } : state;
    case 'counter/decremented':
      return state.count > MIN ? { count: state.count - 1 } : state;
    // TODO: 'counter/reset'
    default:
      return state;
  }
}

const selectCanDecrement = state => state.count > MIN;
const selectCanIncrement = state => state.count < MAX;
const selectMessage = state => (state.count >= MAX ? 'Max reached' : '');
// TODO: selectCanReset

function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.push(fn);
    },
    dispatch(action) {
      console.log('[Store] dispatch ' + action.type);
      const prev = state;
      state = reducer(state, action);
      if (state !== prev) listeners.forEach(fn => fn());
    },
  };
}

const store = createStore(counterReducer, { count: MIN });

const root = document.getElementById('root');
const label = document.createElement('p');
const minus = document.createElement('button');
minus.textContent = '−';
const plus = document.createElement('button');
plus.textContent = '+';
// TODO: a Reset button
const message = document.createElement('p');
message.style.color = '#c00';
root.append(label, minus, plus, message);

function render() {
  const state = store.getState();
  console.log('[View] render from state ' + JSON.stringify(state));
  label.textContent = 'Count: ' + state.count;
  minus.disabled = !selectCanDecrement(state);
  plus.disabled = !selectCanIncrement(state);
  message.textContent = selectMessage(state);
}

plus.addEventListener('click', () => store.dispatch({ type: 'counter/incremented' }));
minus.addEventListener('click', () => store.dispatch({ type: 'counter/decremented' }));

store.subscribe(render);
render();`,
      hint: 'case \'counter/reset\': return state.count === MIN ? state : { count: MIN }; — then const selectCanReset = state => state.count !== MIN; and in render(): reset.disabled = !selectCanReset(state).',
      solution: `const MIN = 0;
const MAX = 5;

function counterReducer(state, action) {
  switch (action.type) {
    case 'counter/incremented':
      return state.count < MAX ? { count: state.count + 1 } : state;
    case 'counter/decremented':
      return state.count > MIN ? { count: state.count - 1 } : state;
    case 'counter/reset':
      return state.count === MIN ? state : { count: MIN };
    default:
      return state;
  }
}

const selectCanDecrement = state => state.count > MIN;
const selectCanIncrement = state => state.count < MAX;
const selectMessage = state => (state.count >= MAX ? 'Max reached' : '');
const selectCanReset = state => state.count !== MIN;

function createStore(reducer, initialState) {
  let state = initialState;
  const listeners = [];
  return {
    getState: () => state,
    subscribe(fn) {
      listeners.push(fn);
    },
    dispatch(action) {
      console.log('[Store] dispatch ' + action.type);
      const prev = state;
      state = reducer(state, action);
      if (state !== prev) listeners.forEach(fn => fn());
    },
  };
}

const store = createStore(counterReducer, { count: MIN });

const root = document.getElementById('root');
const label = document.createElement('p');
const minus = document.createElement('button');
minus.textContent = '−';
const plus = document.createElement('button');
plus.textContent = '+';
const reset = document.createElement('button');
reset.textContent = 'Reset';
const message = document.createElement('p');
message.style.color = '#c00';
root.append(label, minus, plus, reset, message);

function render() {
  const state = store.getState();
  console.log('[View] render from state ' + JSON.stringify(state));
  label.textContent = 'Count: ' + state.count;
  minus.disabled = !selectCanDecrement(state);
  plus.disabled = !selectCanIncrement(state);
  reset.disabled = !selectCanReset(state);
  message.textContent = selectMessage(state);
}

plus.addEventListener('click', () => store.dispatch({ type: 'counter/incremented' }));
minus.addEventListener('click', () => store.dispatch({ type: 'counter/decremented' }));
reset.addEventListener('click', () => store.dispatch({ type: 'counter/reset' }));

store.subscribe(render);
render();`,
    },
  },

  // ==========================================================================
  // CHOOSING A PATTERN
  // ==========================================================================
  {
    id: 'choosing-a-pattern',
    section: 'Putting it together',
    title: 'Choosing a pattern (and not over-engineering)',
    explain: `
      <p>You now know a whole shelf of patterns. The honest truth about choosing one:
      <strong>most of the time, your framework has already chosen for you</strong>, and your job is
      to use its style well.</p>
      <table>
        <tr><th>If you use…</th><th>You're mostly doing…</th></tr>
        <tr><td>Rails, Django, Laravel, ASP.NET MVC, Spring MVC</td>
          <td>Web MVC (Django calls it "MTV")</td></tr>
        <tr><td>React</td><td>Components + hooks; add a store (Redux Toolkit, Zustand…) only when
          shared state gets painful</td></tr>
        <tr><td>Vue, Svelte</td><td>Components with reactive state (MVVM-flavoured); Pinia or
          stores for shared state</td></tr>
        <tr><td>Angular</td><td>Components + injectable services (+ signals, or NgRx for Redux style)</td></tr>
        <tr><td>WPF, .NET MAUI</td><td>MVVM with data binding</td></tr>
        <tr><td>Android (Jetpack)</td><td>ViewModel + observable UI state, one-direction flow
          (MVVM / MVI-ish)</td></tr>
        <tr><td>iOS (SwiftUI / UIKit)</td><td>MVVM, often with coordinators in UIKit; some teams use
          VIPER or unidirectional libraries</td></tr>
        <tr><td>Elm</td><td>The Elm Architecture (MVU), built in</td></tr>
      </table>

      <h3>The comparison table</h3>
      <table>
        <tr><th>Pattern</th><th>Who knows whom</th><th>Testability</th><th>Boilerplate</th><th>Typical platforms</th></tr>
        <tr><td>MVC (classic)</td><td>View observes Model; Controller knows both</td>
          <td>Model easy; view logic harder</td><td>Low</td><td>Server web frameworks, older desktop</td></tr>
        <tr><td>MVP</td><td>Presenter knows View (interface) + Model; View is passive</td>
          <td>High (fake the view)</td><td>Medium (view interfaces)</td><td>WinForms, older Android, GWT</td></tr>
        <tr><td>MVVM</td><td>View → ViewModel via binding; VM doesn't know the view</td>
          <td>High (test the VM)</td><td>Medium (needs binding)</td><td>WPF/MAUI, Android, SwiftUI, Vue-style</td></tr>
        <tr><td>Flux / Redux</td><td>Views dispatch actions; one store; pure reducers</td>
          <td>Very high (pure functions)</td><td>Medium–high</td><td>React apps with lots of shared state</td></tr>
        <tr><td>MVI / MVU (Elm)</td><td>Intents/messages → model → one view state</td>
          <td>Very high</td><td>Medium</td><td>Elm, Android, Cycle.js, F#/.NET MVU libraries</td></tr>
        <tr><td>Components + hooks</td><td>Tree: props down, events up; hooks hold logic</td>
          <td>Good (test hooks/components)</td><td>Low</td><td>React, Vue, Svelte, Solid</td></tr>
        <tr><td>VIPER / MVVM-C</td><td>Per-screen roles + a router / coordinator</td>
          <td>High</td><td>High (VIPER) / medium (MVVM-C)</td><td>iOS</td></tr>
        <tr><td>Clean / Hexagonal / Onion</td><td>Everything depends inward on the core</td>
          <td>Very high for business logic</td><td>High</td><td>Any, when business rules are big</td></tr>
      </table>

      <h3>YAGNI: "You Aren't Gonna Need It"</h3>
      <p>Every pattern costs something: more files, more names, more jumping around to follow one
      click. Pay that cost when it buys you something <em>now</em>, not "maybe later".</p>
      <ul>
        <li><strong>Start simple:</strong> state + a render function, or your framework's defaults.</li>
        <li><strong>Watch for pain:</strong> the same rule copied in two places; a component nobody
          dares to touch; bugs because two screens disagree about data; logic you can't test.</li>
        <li><strong>Then refactor</strong> toward the pattern that fixes <em>that</em> pain: pull
          rules into plain functions, add a ViewModel/hook, add a store, add ports for I/O.</li>
      </ul>
      <div class="tip"><strong>Patterns are vocabulary.</strong> Their biggest everyday value is
      communication: "let's move that into the ViewModel", "this should be a use case", "that's a
      driven adapter". You can use the words without adopting a whole framework.</div>
      <div class="warn">The most common architecture mistake beginners make is not "too little
      pattern". It's building VIPER, Clean Architecture and a Redux store for a three-screen app, then
      spending all their time on plumbing instead of features.</div>
    `,
    examples: [
      {
        title: 'Decision helper: answer 4 questions',
        lang: 'html',
        code: `<style>
  fieldset { border: 1px solid #c5c9d6; border-radius: 8px; margin: 0 0 6px; padding: 4px 10px; }
  legend { font-weight: bold; }
  label { margin-right: 10px; white-space: nowrap; }
  #out { border: 2px solid #4f6bed; border-radius: 8px; padding: 8px 12px; background: #eef1ff; }
  #out h3 { margin: 0 0 4px; }
</style>
<form id="f">
  <fieldset><legend>1. What are you building on?</legend>
    <label><input type="radio" name="platform" value="react" checked> React (web)</label>
    <label><input type="radio" name="platform" value="vue"> Vue / Svelte / Angular</label>
    <label><input type="radio" name="platform" value="server"> Server-rendered web</label>
    <label><input type="radio" name="platform" value="ios"> iOS</label>
    <label><input type="radio" name="platform" value="android"> Android</label>
    <label><input type="radio" name="platform" value="dotnet"> WPF / .NET MAUI</label>
  </fieldset>
  <fieldset><legend>2. How big is it?</legend>
    <label><input type="radio" name="size" value="small" checked> Small / solo / prototype</label>
    <label><input type="radio" name="size" value="medium"> Medium</label>
    <label><input type="radio" name="size" value="large"> Large, many devs, long-lived</label>
  </fieldset>
  <fieldset><legend>3. How much state is shared between screens?</legend>
    <label><input type="radio" name="shared" value="local" checked> Mostly local</label>
    <label><input type="radio" name="shared" value="some"> Some</label>
    <label><input type="radio" name="shared" value="lots"> Lots (undo / replay / debugging)</label>
  </fieldset>
  <fieldset><legend>4. How heavy is the business logic?</legend>
    <label><input type="radio" name="logic" value="thin" checked> Thin: forms and display</label>
    <label><input type="radio" name="logic" value="heavy"> Heavy: complex rules, many UIs</label>
  </fieldset>
</form>
<div id="out"></div>
<script>
  const BASE = {
    react: ['Components + custom hooks',
      'React already gives you components and hooks; a custom hook is your ViewModel.'],
    vue: ['Components + the framework\\'s reactive state',
      'Vue and Svelte are MVVM-flavoured; Angular adds services. Use their built-in tools first.'],
    server: ['Web MVC, your framework\\'s way',
      'Rails, Django, Laravel and friends are built around routes → controllers → views.'],
    ios: ['MVVM (SwiftUI or UIKit)',
      'The most common, well-documented choice on iOS today.'],
    android: ['MVVM with Jetpack ViewModel + observable UI state',
      'Close to what Google\\'s own architecture guide recommends.'],
    dotnet: ['MVVM',
      'WPF and MAUI are designed around data binding, which is the heart of MVVM.'],
  };

  const TIPS = {
    storeReact: 'Add a store (Redux Toolkit, Zustand or useReducer + context): '
      + 'one place for shared state.',
    storeVue: 'Add the framework\\'s store '
      + '(Pinia, Svelte stores, Angular signals/services or NgRx).',
    mvi: 'Lean MVI: one immutable UI state per screen, updated by intents.',
    server: 'Keep shared state in the database/session; on the client, '
      + 'add a small store only if you build rich widgets.',
    unidirectional: 'Consider a unidirectional approach (a single state + actions/reducer) '
      + 'for the shared parts.',
    lift: 'Lift shared state to a common parent or a small shared service '
      + 'before reaching for a global store.',
    coordinators: 'Add Coordinators (MVVM-C) so navigation lives in one place.',
    clean: 'Put business rules in a UI-free core: use cases + injected repositories '
      + '(Clean / Hexagonal). Test them with fakes.',
    plainRules: 'Keep rules in plain functions in their own file and test them directly. '
      + 'Skip the full Clean Architecture circles for now.',
    yagni: 'YAGNI: framework defaults are enough. No store, no extra layers. '
      + 'Refactor when it starts to hurt.',
  };

  function suggest(a) {
    const [title, reason] = BASE[a.platform];
    const extras = [];

    if (a.shared === 'lots') {
      if (a.platform === 'react') extras.push(TIPS.storeReact);
      else if (a.platform === 'vue') extras.push(TIPS.storeVue);
      else if (a.platform === 'android') extras.push(TIPS.mvi);
      else if (a.platform === 'server') extras.push(TIPS.server);
      else extras.push(TIPS.unidirectional);
    } else if (a.shared === 'some') {
      extras.push(TIPS.lift);
    }

    if (a.platform === 'ios' && a.size !== 'small') {
      extras.push(TIPS.coordinators);
    }

    if (a.logic === 'heavy' && a.size !== 'small') {
      extras.push(TIPS.clean);
    } else if (a.logic === 'heavy') {
      extras.push(TIPS.plainRules);
    }

    if (a.size === 'small' && a.shared === 'local' && a.logic === 'thin') {
      extras.push(TIPS.yagni);
    }
    return { title, reason, extras };
  }

  function update() {
    const data = new FormData(document.getElementById('f'));
    const answers = Object.fromEntries(data.entries());
    const s = suggest(answers);
    const out = document.getElementById('out');
    out.innerHTML = '';
    const h = document.createElement('h3');
    h.textContent = 'Suggestion: ' + s.title;
    const p = document.createElement('p');
    p.textContent = 'Why: ' + s.reason;
    const ul = document.createElement('ul');
    s.extras.forEach(text => {
      const li = document.createElement('li');
      li.textContent = text;
      ul.append(li);
    });
    out.append(h, p, ul);
  }

  document.getElementById('f').addEventListener('change', update);
  update();
</script>`,
        explain: `
          <details>
            <summary>How the helper thinks (and its limits)</summary>
            <p>It starts from the <strong>platform's default</strong> (question 1), because fighting
            your framework is the most expensive choice of all. Then each answer can only
            <em>add</em> something:</p>
            <ul>
              <li>Lots of shared state → a single store / unidirectional flow.</li>
              <li>iOS and not small → coordinators for navigation.</li>
              <li>Heavy business logic and not small → a Clean / Hexagonal core; if small, just plain
              tested functions.</li>
              <li>Small + local + thin → an explicit "YAGNI" note.</li>
            </ul>
            <p>Try "React · Small · Mostly local · Thin" (the defaults): the answer is just components +
            hooks. Now switch to "Large · Lots · Heavy" and watch the list grow. That growth is what
            architecture should look like: <strong>earned by the problem</strong>, not added up front.</p>
            <div class="warn">It's a teaching toy with a handful of rules, not an oracle. Real
            decisions also depend on your team's experience and what the existing codebase already
            does. Consistency with the code you already have usually beats the "ideal" pattern.</div>
          </details>
        `,
      },
      {
        title: 'Often enough: state + one render function',
        code: `// No named pattern. Just UI = f(state), with the rules in pure functions.
// For many small widgets this is all the architecture you need.

// ===== STATE =====
let state = { items: ['Milk'], text: '' };

// ===== RULES (pure: easy to test, easy to move later) =====
function addItem(s) {
  const text = s.text.trim();
  if (!text || s.items.includes(text)) return s;
  return { items: [...s.items, text], text: '' };
}

function setState(next, reason) {
  if (next === state) {
    console.log('[State] ' + reason + ' refused by the rules (unchanged)');
    return;
  }
  console.log('[State] ' + reason + ' → ' + JSON.stringify(next.items));
  state = next;
  render();
}

// ===== RENDER =====
const root = document.getElementById('root');
const input = document.createElement('input');
input.placeholder = 'Add to shopping list';
const addBtn = document.createElement('button');
addBtn.textContent = 'Add';
const list = document.createElement('ul');
root.append(input, addBtn, list);

function render() {
  input.value = state.text;
  addBtn.disabled = !state.text.trim();
  list.innerHTML = '';
  state.items.forEach(item => {
    const li = document.createElement('li');
    li.textContent = item;
    list.append(li);
  });
}

input.addEventListener('input', () => {
  state = { ...state, text: input.value }; // typing: no log, no full re-render needed
  addBtn.disabled = !state.text.trim();
});
addBtn.addEventListener('click', () => setState(addItem(state), 'add'));

render();`,
        explain: `
          <details>
            <summary>Why this is a perfectly good starting point</summary>
            <p>It already has the most valuable ideas from the whole course: one source of truth
            (<code>state</code>), rules in pure functions (<code>addItem</code>), and a render that only
            reads state. Type "Eggs" and click Add: you'll see
            <code>[State] add → ["Milk","Eggs"]</code>. Type "Milk" and click Add again: <code>addItem</code> returns the
            <em>same</em> state object (duplicates aren't allowed), so you see
            <code>[State] add refused by the rules (unchanged)</code> and nothing re-renders.</p>
            <p>If this grows, the upgrade path is short: <code>setState</code> becomes a store's
            <code>dispatch</code> (Redux-style), or <code>state</code> + rules become a ViewModel
            (MVVM). You refactor <em>when</em> it hurts, and the pure rules move over unchanged.</p>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'You start a new app with Django. Which pattern should you "choose"?',
        options: [
          'VIPER',
          'Whatever Django already does: its web-MVC style (MTV)',
          'Redux, then Django',
          'Clean Architecture with four circles, from day one',
        ],
        answer: 1,
        why: 'Frameworks usually choose for you. Working with the framework\'s style is cheaper than fighting it.',
      },
      {
        q: 'What does YAGNI suggest for a small, solo prototype with little shared state?',
        options: [
          'Add Redux just in case',
          'Use VIPER for every screen',
          'Keep to the framework defaults and refactor when real pain appears',
          'Never use any pattern',
        ],
        answer: 2,
        why: 'Add structure when it pays for itself now. YAGNI doesn\'t mean "no patterns", it means "not before you need them".',
      },
      {
        q: 'Which is a good signal that you need more structure?',
        options: [
          'The app has more than one file',
          'The same business rule is copied into several components and they drift apart',
          'A blog post says a new pattern is popular',
          'You used a <code>for</code> loop',
        ],
        answer: 1,
        why: 'Duplicated rules, untestable logic, and screens disagreeing about data are real pains that patterns solve.',
      },
      {
        q: 'Which pattern has the most boilerplate but the strongest isolation of business rules?',
        options: ['Components + hooks', 'Classic MVC', 'Clean / Hexagonal architecture', 'Plain state + render'],
        answer: 2,
        why: 'Ports, adapters, use cases and a composition root add files, but the core rules become independent of every tool.',
      },
    ],
    exercise: {
      task: `<p>This tip calculator works, but everything is tangled in one click handler. Refactor it
        into the <strong>minimum useful structure</strong>, no big framework:</p>
        <ol>
          <li>A <strong>pure function</strong> <code>calcTip(bill, percent)</code> that returns
          <code>{ tip, total }</code> (rounded to cents), or throws <code>'Bill must be positive'</code>.</li>
          <li>A <code>render(result)</code> function that only writes to the DOM.</li>
          <li>Two tests using the <code>test()</code> helper: 50 at 10% → tip 5, total 55; and a
          bill of 0 throws.</li>
        </ol>`,
      starter: `function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

const root = document.getElementById('root');
root.innerHTML =
  'Bill <input id="bill" type="number" value="50" style="width:80px"> ' +
  'Tip % <input id="pct" type="number" value="10" style="width:60px"> ' +
  '<button id="go">Calculate</button><p id="out"></p>';

// Everything tangled together:
document.getElementById('go').addEventListener('click', () => {
  const bill = Number(document.getElementById('bill').value);
  const pct = Number(document.getElementById('pct').value);
  if (!(bill > 0)) {
    document.getElementById('out').textContent = 'Error: Bill must be positive';
    return;
  }
  const tip = Math.round(bill * pct) / 100;
  document.getElementById('out').textContent =
    'Tip $' + tip.toFixed(2) + ' · Total $' + (bill + tip).toFixed(2);
});

// TODO: extract calcTip(bill, percent) and render(result), then add two tests`,
      hint: 'calcTip does the check and the maths and returns an object; the click handler becomes: read inputs → try { render(calcTip(...)) } catch (e) { render({ error: e.message }) }. Tests call calcTip directly, no DOM needed.',
      solution: `function test(name, fn) {
  try {
    fn();
    console.log('✓', name);
  } catch (e) {
    console.error('✗', name, e.message);
  }
}

// ===== RULES (pure) =====
function calcTip(bill, percent) {
  if (!(bill > 0)) throw new Error('Bill must be positive');
  const tip = Math.round(bill * percent) / 100;
  const total = Math.round((bill + tip) * 100) / 100;
  return { tip, total };
}

// ===== VIEW =====
const root = document.getElementById('root');
root.innerHTML =
  'Bill <input id="bill" type="number" value="50" style="width:80px"> ' +
  'Tip % <input id="pct" type="number" value="10" style="width:60px"> ' +
  '<button id="go">Calculate</button><p id="out"></p>';

function render(result) {
  document.getElementById('out').textContent = result.error
    ? 'Error: ' + result.error
    : 'Tip $' + result.tip.toFixed(2) + ' · Total $' + result.total.toFixed(2);
}

// ===== GLUE (read input → rule → render) =====
document.getElementById('go').addEventListener('click', () => {
  const bill = Number(document.getElementById('bill').value);
  const pct = Number(document.getElementById('pct').value);
  try {
    render(calcTip(bill, pct));
  } catch (e) {
    render({ error: e.message });
  }
});

// ===== TESTS =====
test('50 at 10% → tip 5, total 55', () => {
  const r = calcTip(50, 10);
  if (r.tip !== 5 || r.total !== 55) throw new Error('got ' + JSON.stringify(r));
});

test('a bill of 0 throws', () => {
  let threw = false;
  try {
    calcTip(0, 10);
  } catch (e) {
    threw = e.message === 'Bill must be positive';
  }
  if (!threw) throw new Error('expected an error');
});`,
    },
  },
);
