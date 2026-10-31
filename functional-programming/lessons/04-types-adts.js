window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── adts
  {
    id: 'adts',
    section: 'Types & Data Modeling',
    title: 'Algebraic Data Types',
    explain: `
      <p>"Algebraic data type" sounds scary but names two things you already use. The
      "algebra" is counting: how many different values can a type hold?</p>

      <h3>Product types: A <em>and</em> B</h3>
      <p>An object or tuple holds several fields <em>at the same time</em>. The number of
      possible values is the <strong>product</strong> of each field's possibilities:</p>
      <pre><code>// { giftWrap: boolean, size: 'S' | 'M' | 'L' }
// 2 × 3 = 6 possible values
const order = { giftWrap: true, size: 'M' };
const point = [3, 4];   // a tuple is a product too</code></pre>

      <h3>Sum types: A <em>or</em> B</h3>
      <p>A value that is exactly <em>one of</em> several variants. The count is the
      <strong>sum</strong> of each variant's possibilities. JavaScript has no built-in sum
      types, so we encode them as <strong>tagged unions</strong>: plain objects with a
      <code>tag</code> (or <code>type</code>, the Redux convention) field saying which variant
      this is, plus only the fields that variant needs.</p>
      <pre><code>// Shape = Circle(radius) | Rect(width, height) | Triangle(base, height)
const Circle = radius =&gt; ({ tag: 'Circle', radius });
const Rect = (width, height) =&gt; ({ tag: 'Rect', width, height });
const Triangle = (base, height) =&gt; ({ tag: 'Triangle', base, height });</code></pre>
      <p>Those little <strong>constructor functions</strong> are the whole trick. Always
      build variants through them and you can't misspell a tag or forget a field.</p>

      <h3>Why count states?</h3>
      <p>Every possible value is a case your code must handle (or must make sure can never
      happen). Products multiply cases quickly. Sums let you say "it's exactly one of these",
      which usually means <em>far fewer</em> cases. Two lessons from now that becomes the core
      design rule: make illegal states unrepresentable.</p>

      <h3>Recursive ADTs</h3>
      <p>A variant can contain the type itself: <code>Expr = Num(n) | Add(Expr, Expr) |
      Mul(Expr, Expr)</code>. Lists, trees, JSON and syntax trees are all recursive ADTs, and
      the recursion from the previous section is how you process them.</p>
      <div class="tip">Haskell writes <code>data Shape = Circle Double | Rect Double
      Double</code>; TypeScript writes a union of object types with a literal
      <code>tag</code>. In plain JS the tagged-object convention <em>is</em> the type, so be
      consistent: one field name (<code>tag</code>), always a string, always set by a
      constructor.</div>
      <div class="warn">Don't infer the variant from which fields exist (<code>if
      (shape.radius)</code>). <code>radius: 0</code> is falsy, and two variants may share a
      field name. Always switch on the tag.</div>
    `,
    examples: [
      {
        title: 'Counting states, and a Shape sum type',
        code: `// PRODUCT: a value has field A AND field B → possibilities multiply
const bools = [true, false];
const sizes = ['S', 'M', 'L'];

const products = bools.flatMap(giftWrap => sizes.map(size => ({ giftWrap, size })));
console.log('product { giftWrap, size }:', products.length, 'states (2 × 3)');

// SUM: a value is variant A OR variant B → possibilities add
const sums = [
  ...bools.map(value => ({ tag: 'Flag', value })),
  ...sizes.map(value => ({ tag: 'Size', value })),
];
console.log('sum Flag | Size:', sums.length, 'states (2 + 3)');

// A sum type with constructor functions
const Circle = radius => ({ tag: 'Circle', radius });
const Rect = (width, height) => ({ tag: 'Rect', width, height });
const Triangle = (base, height) => ({ tag: 'Triangle', base, height });

const area = shape => {
  switch (shape.tag) {
    case 'Circle':
      return Math.PI * shape.radius ** 2;
    case 'Rect':
      return shape.width * shape.height;
    case 'Triangle':
      return (shape.base * shape.height) / 2;
    default:
      throw new Error('Unknown shape: ' + shape.tag);
  }
};

const shapes = [Circle(1), Rect(2, 3), Triangle(4, 5)];
for (const s of shapes) {
  console.log(s.tag.padEnd(9), JSON.stringify(s), '→ area', area(s).toFixed(2));
}`,
      },
      {
        title: 'A recursive ADT: arithmetic expressions',
        code: `// Expr = Num(n) | Add(left, right) | Mul(left, right)
const Num = n => ({ tag: 'Num', n });
const Add = (left, right) => ({ tag: 'Add', left, right });
const Mul = (left, right) => ({ tag: 'Mul', left, right });

const evaluate = e => {
  switch (e.tag) {
    case 'Num':
      return e.n;
    case 'Add':
      return evaluate(e.left) + evaluate(e.right);
    case 'Mul':
      return evaluate(e.left) * evaluate(e.right);
    default:
      throw new Error('Unknown expr: ' + e.tag);
  }
};

const show = e => {
  switch (e.tag) {
    case 'Num':
      return String(e.n);
    case 'Add':
      return '(' + show(e.left) + ' + ' + show(e.right) + ')';
    case 'Mul':
      return show(e.left) + ' * ' + show(e.right);
    default:
      throw new Error('Unknown expr: ' + e.tag);
  }
};

// 2 + 3 * 4   and   (2 + 3) * 4
const a = Add(Num(2), Mul(Num(3), Num(4)));
const b = Mul(Add(Num(2), Num(3)), Num(4));

console.log(show(a), '=', evaluate(a));
console.log(show(b), '=', evaluate(b));
console.log('the data itself:', JSON.stringify(b));`,
      },
    ],
    quiz: [
      {
        q: `How many possible values does
        <code>{ isAdmin: boolean, theme: 'light' | 'dark' | 'system' }</code> have?`,
        options: ['5', '6', '8', '2'],
        answer: 1,
        why: `It's a product type: 2 × 3 = 6. Every field combination is a valid value.`,
      },
      {
        q: `How many values does <code>Yes | No | Maybe(boolean)</code> have?`,
        options: ['3', '4', '6', '8'],
        answer: 1,
        why: `It's a sum: Yes (1) + No (1) + Maybe (2) = 4.`,
      },
      {
        q: `How do we usually encode a sum type in plain JavaScript?`,
        options: [
          'With a class hierarchy only',
          'With objects that carry a tag/type field naming the variant',
          'With Symbols',
          'It is impossible',
        ],
        answer: 1,
        why: `A tagged union: <code>{ tag: 'Circle', radius }</code>. The tag tells code which
        variant it holds and therefore which fields exist.`,
      },
      {
        q: `Why use constructor functions like <code>Circle(r)</code> instead of writing
        object literals by hand?`,
        options: [
          'They are faster',
          'One place creates each variant, so tags and fields are always consistent',
          'JSON.stringify requires them',
          'Object literals cannot have a tag field',
        ],
        answer: 1,
        why: `A typo like <code>{ tag: 'circle' }</code> or a missing field is easy by hand.
        Constructors make the set of variants explicit and the shapes reliable.`,
      },
      {
        q: `Why is <code>if (shape.radius) { ...circle... }</code> a bad way to detect a
        variant?`,
        options: [
          'It is too slow',
          'radius 0 is falsy and other variants could share field names; switch on the tag',
          'Optional chaining is required',
          'It is fine',
        ],
        answer: 1,
        why: `Structural guessing breaks on falsy values and overlapping fields. The tag is the
        single source of truth for "which variant".`,
      },
    ],
    exercise: {
      task: `<p>Model a payment method as a sum type:
      <code>Cash | Card(last4) | Voucher(code, amount)</code>.</p>
      <ul>
        <li>Write the three constructors (tag field: <code>tag</code>).</li>
        <li>Write <code>describe(method)</code> returning <code>'Cash'</code>,
        <code>'Card ending 4242'</code> or <code>'Voucher SAVE10 ($10)'</code>.
        Unknown tags should throw.</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

// TODO: constructors
const Cash = () => ({});
const Card = last4 => ({});
const Voucher = (code, amount) => ({});

const describe = method => {
  // TODO: switch on method.tag
  return '';
};

check('Cash shape', Cash(), { tag: 'Cash' });
check('Card shape', Card('4242'), { tag: 'Card', last4: '4242' });
check('Voucher shape', Voucher('SAVE10', 10), {
  tag: 'Voucher',
  code: 'SAVE10',
  amount: 10,
});
check('describe Cash', describe(Cash()), 'Cash');
check('describe Card', describe(Card('4242')), 'Card ending 4242');
check('describe Voucher', describe(Voucher('SAVE10', 10)), 'Voucher SAVE10 ($10)');

let threw = false;
try {
  describe({ tag: 'Bitcoin' });
} catch {
  threw = true;
}
check('unknown tag throws', threw, true);`,
      hint: `<code>const Card = last4 =&gt; ({ tag: 'Card', last4 });</code>. In
      <code>describe</code>, use <code>switch (method.tag)</code> with a <code>default</code>
      that throws.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Cash = () => ({ tag: 'Cash' });
const Card = last4 => ({ tag: 'Card', last4 });
const Voucher = (code, amount) => ({ tag: 'Voucher', code, amount });

const describe = method => {
  switch (method.tag) {
    case 'Cash':
      return 'Cash';
    case 'Card':
      return 'Card ending ' + method.last4;
    case 'Voucher':
      return 'Voucher ' + method.code + ' ($' + method.amount + ')';
    default:
      throw new Error('Unknown payment method: ' + method.tag);
  }
};

check('Cash shape', Cash(), { tag: 'Cash' });
check('Card shape', Card('4242'), { tag: 'Card', last4: '4242' });
check('Voucher shape', Voucher('SAVE10', 10), {
  tag: 'Voucher',
  code: 'SAVE10',
  amount: 10,
});
check('describe Cash', describe(Cash()), 'Cash');
check('describe Card', describe(Card('4242')), 'Card ending 4242');
check('describe Voucher', describe(Voucher('SAVE10', 10)), 'Voucher SAVE10 ($10)');

let threw = false;
try {
  describe({ tag: 'Bitcoin' });
} catch {
  threw = true;
}
check('unknown tag throws', threw, true);`,
    },
  },

  // ───────────────────────────────────────────────────────────── pattern-matching
  {
    id: 'pattern-matching',
    section: 'Types & Data Modeling',
    title: 'Pattern Matching in JS',
    explain: `
      <p>Once data is a tagged union, almost every function on it has the same shape:
      "look at the tag, run the code for that variant". In ML-family languages that's
      <strong>pattern matching</strong>, and the compiler warns you if you forgot a
      variant. JavaScript gives us two practical substitutes.</p>

      <h3>1. <code>switch</code> on the tag</h3>
      <pre><code>switch (shape.tag) {
  case 'Circle': return Math.PI * shape.radius ** 2;
  case 'Rect':   return shape.width * shape.height;
  default:       throw new Error('Unhandled: ' + shape.tag);
}</code></pre>
      <p>Always end with a <code>default</code> that <strong>throws</strong>. Silently
      returning <code>undefined</code> for an unknown variant turns a clear bug into a
      mysterious <code>NaN</code> three functions later.</p>

      <h3>2. A <code>match</code> helper</h3>
      <pre><code>const match = (value, cases) =&gt; {
  const handler = Object.hasOwn(cases, value.tag) ? cases[value.tag] : cases._;
  if (!handler) throw new Error('no case for ' + value.tag);
  return handler(value);
};

match(shape, {
  Circle: ({ radius }) =&gt; Math.PI * radius ** 2,
  Rect: ({ width, height }) =&gt; width * height,
  _: () =&gt; 0,                 // optional wildcard
});</code></pre>
      <p>It's an expression (returns a value), handlers can destructure their variant, and
      it reads like a table. <code>_</code> is a conventional "anything else" case.</p>

      <h3>Exhaustiveness</h3>
      <p>The plain helper only throws when an <em>unhandled value actually shows up</em>,
      maybe months later in production. A stricter version knows the full list of tags and
      checks the <em>cases object</em> on every call, so a forgotten case fails the first time
      the code runs with any value, typically in your first test.</p>
      <div class="tip">TypeScript can do this at compile time: switch on a discriminated
      union and assign the leftover to a <code>never</code> variable in <code>default</code>.
      If you forget a case, it doesn't compile. Next lesson shows the snippet.</div>
      <div class="warn">There is a TC39 <strong>pattern matching proposal</strong>
      (<code>match (x) { when ... }</code>), but it's still an early-stage proposal, not in
      any browser or Node, and its syntax keeps changing. Don't use it; the helper above is
      the practical option today.</div>
    `,
    examples: [
      {
        title: 'A match helper with an exhaustiveness check',
        explain: `
          <details>
            <summary>The problem: a missing case hides until that value appears</summary>
            <p><code>perimeterLoose</code> forgot <code>Triangle</code>. Calling it with a circle
            works fine, so every test with circles and rectangles passes. The bug only surfaces
            when a triangle finally arrives.</p>
          </details>
          <details>
            <summary>Step by step: what each line prints</summary>
            <table>
              <tr><th>Call</th><th>Console</th><th>Why</th></tr>
              <tr><td><code>area(...)</code> ×3</td><td><code>area Circle: 3.14</code>, <code>area Rect: 6.00</code>, <code>area Triangle: 10.00</code></td><td>All three cases present.</td></tr>
              <tr><td><code>isRound(Rect(1, 1))</code></td><td><code>isRound(Rect): false</code></td><td>No <code>Rect</code> handler, so the <code>_</code> wildcard runs. With a wildcard, the strict check allows missing tags.</td></tr>
              <tr><td><code>perimeterLoose(Circle(1))</code></td><td><code>loose, Circle: 6.28</code></td><td>⚠️ Works, the missing Triangle case is invisible.</td></tr>
              <tr><td><code>perimeterLoose(Triangle(3, 4))</code></td><td><code>loose, Triangle → match: no case for "Triangle"</code></td><td>Fails only now, when the rare value appears.</td></tr>
              <tr><td><code>perimeterStrict(Circle(1))</code></td><td><code>strict, Circle → non-exhaustive match, missing: Triangle</code></td><td>✅ Fails immediately, even for a circle.</td></tr>
              <tr><td>naive <code>cases[tag]</code></td><td><code>naive lookup of "constructor": function</code></td><td>Plain objects inherit <code>constructor</code>, <code>toString</code>... from <code>Object.prototype</code>.</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const matcher = tags =&gt; (value, cases) =&gt; {
  const missing = tags.filter(t =&gt; !Object.hasOwn(cases, t));      // ①
  if (missing.length &gt; 0 &amp;&amp; !Object.hasOwn(cases, '_')) throw ...; // ②
  return match(value, cases);                                     // ③
};</code></pre>
            <ol>
              <li><strong>①</strong> Compare the handlers against the <em>declared</em> list of
              variants, not against the current value.</li>
              <li><strong>②</strong> A wildcard is an explicit opt-out: "I mean to treat the
              rest the same".</li>
              <li><strong>③</strong> Then dispatch as usual. <code>Object.hasOwn</code> (ES2022)
              ignores inherited keys, so a tag like <code>"constructor"</code> can't hit
              <code>Object.prototype.constructor</code>.</li>
            </ol>
            <div class="tip">Wildcards weaken exhaustiveness: add a new variant and every
            <code>_</code> silently swallows it. Prefer listing all cases where behaviour
            really differs.</div>
          </details>
        `,
        code: `const match = (value, cases) => {
  const handler = Object.hasOwn(cases, value.tag) ? cases[value.tag] : cases._;
  if (!handler) throw new Error('match: no case for "' + value.tag + '"');
  return handler(value);
};

// Stricter: knows every tag up front and checks the cases object on EVERY call
const matcher = tags => (value, cases) => {
  const missing = tags.filter(t => !Object.hasOwn(cases, t));
  if (missing.length > 0 && !Object.hasOwn(cases, '_')) {
    throw new Error('non-exhaustive match, missing: ' + missing.join(', '));
  }
  return match(value, cases);
};

const Circle = radius => ({ tag: 'Circle', radius });
const Rect = (width, height) => ({ tag: 'Rect', width, height });
const Triangle = (a, b) => ({ tag: 'Triangle', a, b }); // right triangle, legs a and b

const matchShape = matcher(['Circle', 'Rect', 'Triangle']);

const area = shape =>
  matchShape(shape, {
    Circle: ({ radius }) => Math.PI * radius ** 2,
    Rect: ({ width, height }) => width * height,
    Triangle: ({ a, b }) => (a * b) / 2,
  });

for (const s of [Circle(1), Rect(2, 3), Triangle(4, 5)]) {
  console.log('area ' + s.tag + ':', area(s).toFixed(2));
}

const isRound = shape => matchShape(shape, { Circle: () => true, _: () => false });
console.log('isRound(Rect):', isRound(Rect(1, 1)));

// Oops: both versions forgot Triangle
const perimeterCases = {
  Circle: ({ radius }) => 2 * Math.PI * radius,
  Rect: ({ width, height }) => 2 * (width + height),
};
const perimeterLoose = shape => match(shape, perimeterCases);
const perimeterStrict = shape => matchShape(shape, perimeterCases);

console.log('loose, Circle:', perimeterLoose(Circle(1)).toFixed(2));
try {
  perimeterLoose(Triangle(3, 4));
} catch (e) {
  console.log('loose, Triangle →', e.message);
}
try {
  perimeterStrict(Circle(1));
} catch (e) {
  console.log('strict, Circle →', e.message);
}

// Why Object.hasOwn and not cases[tag]:
console.log('naive lookup of "constructor":', typeof perimeterCases['constructor']);`,
      },
      {
        title: 'switch on type with a throwing default',
        code: `const assertNever = value => {
  throw new Error('Unhandled case: ' + JSON.stringify(value));
};

// Actions: a sum type tagged with \`type\` (the Redux convention)
const AddItem = (name, price) => ({ type: 'AddItem', name, price });
const RemoveItem = name => ({ type: 'RemoveItem', name });
const Clear = () => ({ type: 'Clear' });

const cartReducer = (cart, action) => {
  switch (action.type) {
    case 'AddItem':
      return [...cart, { name: action.name, price: action.price }];
    case 'RemoveItem':
      return cart.filter(item => item.name !== action.name);
    case 'Clear':
      return [];
    default:
      return assertNever(action);
  }
};

const actions = [
  AddItem('tea', 3),
  AddItem('cake', 5),
  RemoveItem('tea'),
  AddItem('jam', 4),
];
const cart = actions.reduce(cartReducer, []);
const total = cart.reduce((sum, item) => sum + item.price, 0);

console.log('cart:', cart.map(item => item.name).join(', '), '| total:', total);
console.log('after Clear:', cartReducer(cart, Clear()));

try {
  cartReducer(cart, { type: 'AddItm', name: 'typo' });
} catch (e) {
  console.log('typo caught:', e.message);
}`,
      },
    ],
    quiz: [
      {
        q: `Why should the <code>default</code> branch of a switch over a tagged union
        throw?`,
        options: [
          'Because switch requires it',
          'So an unknown or misspelled variant fails loudly instead of returning undefined',
          'To make the function faster',
          'It should return null instead',
        ],
        answer: 1,
        why: `Returning <code>undefined</code> just moves the failure somewhere harder to
        debug. Throwing names the exact unhandled variant.`,
      },
      {
        q: `The plain <code>match</code> helper is missing a <code>Triangle</code> case. When
        is that discovered?`,
        options: [
          'At parse time',
          'Only when a Triangle value is actually matched',
          'On the first call with any value',
          'Never',
        ],
        answer: 1,
        why: `It only looks up the current value's tag. The strict <code>matcher(tags)</code>
        version checks the cases object up front, so it fails on the first call.`,
      },
      {
        q: `Why use <code>Object.hasOwn(cases, tag)</code> instead of
        <code>cases[tag]</code>?`,
        options: [
          'It is shorter',
          'cases[tag] also finds inherited keys like constructor and toString',
          'cases[tag] does not work with strings',
          'No reason',
        ],
        answer: 1,
        why: `A plain object literal inherits from <code>Object.prototype</code>. A tag of
        <code>"constructor"</code> would find a function there and run it as a handler.`,
      },
      {
        q: `What's the downside of the <code>_</code> wildcard?`,
        options: [
          'It is slower',
          'New variants are silently handled by it, so you lose the reminder to handle them',
          'It cannot return values',
          'It only works with switch',
        ],
        answer: 1,
        why: `Exhaustiveness checks exist to tell you "you added a variant, now update
        this". A wildcard opts out of that.`,
      },
      {
        q: `Can you use TC39 pattern matching (<code>match (x) { when ... }</code>) in
        today's browsers?`,
        options: [
          'Yes, since ES2024',
          'Yes, behind a flag in Node',
          'No, it is still a proposal and not shipped anywhere',
          'Only in Safari',
        ],
        answer: 2,
        why: `It's an early-stage proposal and its syntax is still moving. Use switch or a
        match helper.`,
      },
    ],
    exercise: {
      task: `<p>Write <code>matcher(tags)</code>, returning a <code>(value, cases)</code>
      function that:</p>
      <ul>
        <li>throws <code>'non-exhaustive match, missing: ...'</code> if any tag has no
        handler <em>and</em> there's no <code>_</code> wildcard (even if the current value's
        case is present);</li>
        <li>calls the handler for <code>value.tag</code> (own properties only), else
        <code>_</code>;</li>
        <li>throws if neither exists.</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const matcher = tags => (value, cases) => {
  // TODO
  return undefined;
};

const Email = to => ({ tag: 'Email', to });
const Sms = phone => ({ tag: 'Sms', phone });
const Push = deviceId => ({ tag: 'Push', deviceId });

const matchNote = matcher(['Email', 'Sms', 'Push']);

const render = note =>
  matchNote(note, {
    Email: ({ to }) => 'email to ' + to,
    Sms: ({ phone }) => 'sms to ' + phone,
    Push: ({ deviceId }) => 'push to ' + deviceId,
  });

check('Email', render(Email('ada@example.com')), 'email to ada@example.com');
check('Push', render(Push('d-7')), 'push to d-7');
check('wildcard', matchNote(Sms('555'), { Email: () => 'email', _: () => 'other' }), 'other');

let threw = false;
try {
  matchNote(Email('x'), { Email: () => 'email' }); // Sms and Push missing!
} catch {
  threw = true;
}
check('missing cases throw even for Email', threw, true);

const weirdTag = { tag: 'constructor' };
check('own keys only', matchNote(weirdTag, { _: () => 'fallback' }), 'fallback');`,
      hint: `First compute <code>missing = tags.filter(t =&gt; !Object.hasOwn(cases, t))</code>
      and throw if <code>missing.length &gt; 0 &amp;&amp; !Object.hasOwn(cases, '_')</code>. Then
      pick <code>Object.hasOwn(cases, value.tag) ? cases[value.tag] : cases._</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const matcher = tags => (value, cases) => {
  const missing = tags.filter(t => !Object.hasOwn(cases, t));
  if (missing.length > 0 && !Object.hasOwn(cases, '_')) {
    throw new Error('non-exhaustive match, missing: ' + missing.join(', '));
  }
  const handler = Object.hasOwn(cases, value.tag) ? cases[value.tag] : cases._;
  if (!handler) throw new Error('no case for ' + value.tag);
  return handler(value);
};

const Email = to => ({ tag: 'Email', to });
const Sms = phone => ({ tag: 'Sms', phone });
const Push = deviceId => ({ tag: 'Push', deviceId });

const matchNote = matcher(['Email', 'Sms', 'Push']);

const render = note =>
  matchNote(note, {
    Email: ({ to }) => 'email to ' + to,
    Sms: ({ phone }) => 'sms to ' + phone,
    Push: ({ deviceId }) => 'push to ' + deviceId,
  });

check('Email', render(Email('ada@example.com')), 'email to ada@example.com');
check('Push', render(Push('d-7')), 'push to d-7');
check('wildcard', matchNote(Sms('555'), { Email: () => 'email', _: () => 'other' }), 'other');

let threw = false;
try {
  matchNote(Email('x'), { Email: () => 'email' }); // Sms and Push missing!
} catch {
  threw = true;
}
check('missing cases throw even for Email', threw, true);

const weirdTag = { tag: 'constructor' };
check('own keys only', matchNote(weirdTag, { _: () => 'fallback' }), 'fallback');`,
    },
  },

  // ───────────────────────────────────────────────────────────── illegal-states
  {
    id: 'illegal-states',
    section: 'Types & Data Modeling',
    title: 'Make Illegal States Unrepresentable',
    explain: `
      <p>Here's the state shape almost every app starts with for loading data:</p>
      <pre><code>{ isLoading: false, error: null, data: null }</code></pre>
      <p>Three independent fields make it a <strong>product type</strong>. Even counting
      <code>error</code> and <code>data</code> only as "present / absent", that's
      2 × 2 × 2 = <strong>8</strong> combinations. Only 4 of them mean anything:
      idle, loading, failed, succeeded. The other 4 (loading <em>and</em> failed, error
      <em>and</em> data, ...) are <strong>illegal states</strong>: nothing should ever produce
      them, yet the type happily allows them, and one forgotten
      <code>error: null</code> produces one. This is "boolean soup".</p>

      <h3>The fix: a sum type with exactly the legal states</h3>
      <pre><code>// RemoteData = NotAsked | Loading | Failure(error) | Success(data)
const NotAsked = () =&gt; ({ tag: 'NotAsked' });
const Loading = () =&gt; ({ tag: 'Loading' });
const Failure = error =&gt; ({ tag: 'Failure', error });
const Success = data =&gt; ({ tag: 'Success', data });</code></pre>
      <ul>
        <li>4 variants = 4 states. The impossible combinations can't even be written.</li>
        <li>Each variant carries only its own data. <code>data</code> exists only inside
        <code>Success</code>, so you can't read stale data while showing an error.</li>
        <li>Transitions replace the whole value (<code>state = Success(rows)</code>), so
        there's no "forgot to reset the error" bug.</li>
      </ul>
      <p>The pattern goes way beyond fetching: <code>{ isLoggedIn, user }</code> →
      <code>Anonymous | LoggedIn(user)</code>; <code>{ isOpen, isSubmitting, isDone }</code> →
      a form state union; a payment with <code>paidAt</code> and <code>refundedAt</code>
      fields → <code>Pending | Paid(at) | Refunded(paidAt, refundedAt)</code>.</p>
      <div class="tip">If a combination you called "illegal" turns out to be real (say,
      "refreshing while still showing old data"), don't go back to booleans. Add a variant
      that says exactly that: <code>Refreshing(data)</code>.</div>
      <div class="warn">The slogan comes from Yaron Minsky (OCaml). In typed languages the
      compiler enforces it. In plain JS it's a discipline: constructors are the only way to
      build states, and <code>match</code>/<code>switch</code> is the only way to read them.
      JSDoc or TypeScript (below) can add compile-time checking.</div>
    `,
    examples: [
      {
        title: 'Boolean soup: how an impossible state sneaks in',
        explain: `
          <details>
            <summary>Step by step: the state after each update</summary>
            <table>
              <tr><th>Step</th><th>isLoading</th><th>error</th><th>data</th><th>Legal?</th></tr>
              <tr><td>initial</td><td>false</td><td>null</td><td>null</td><td>✅ idle</td></tr>
              <tr><td>fetch #1 starts</td><td>true</td><td>null</td><td>null</td><td>✅ loading</td></tr>
              <tr><td>fetch #1 fails</td><td>false</td><td>"Network down"</td><td>null</td><td>✅ failed</td></tr>
              <tr><td>retry starts</td><td>true</td><td>"Network down"</td><td>null</td><td>❌ loading + error</td></tr>
              <tr><td>retry succeeds</td><td>false</td><td>"Network down"</td><td>["Ada","Grace"]</td><td>❌ error + data</td></tr>
            </table>
            <p>Each update used <code>{ ...state, ... }</code> and changed only what seemed
            relevant. Nobody remembered to clear <code>error</code>. The final line prints
            <code>screen shows → Error: Network down</code> even though the data loaded fine:
            <code>render</code> checks <code>error</code> before <code>data</code>, so the
            order of <code>if</code>s silently decides what the user sees.</p>
          </details>
          <details>
            <summary>Enumerating all 8 combinations</summary>
            <table>
              <tr><th>loading</th><th>error</th><th>data</th><th>Meaning</th></tr>
              <tr><td>F</td><td>F</td><td>F</td><td>✅ NotAsked</td></tr>
              <tr><td>F</td><td>F</td><td>T</td><td>✅ Success</td></tr>
              <tr><td>F</td><td>T</td><td>F</td><td>✅ Failure</td></tr>
              <tr><td>F</td><td>T</td><td>T</td><td>❌ which one is true?</td></tr>
              <tr><td>T</td><td>F</td><td>F</td><td>✅ Loading</td></tr>
              <tr><td>T</td><td>F</td><td>T</td><td>❌ (or a real "refreshing" state, then model it!)</td></tr>
              <tr><td>T</td><td>T</td><td>F</td><td>❌ spinner or error?</td></tr>
              <tr><td>T</td><td>T</td><td>T</td><td>❌ everything at once</td></tr>
            </table>
            <p>The console prints <code>legal: 4 of 8</code>. Half the type is states your
            UI must either handle or pretend can't happen. And it gets worse quickly: add
            <code>isRefreshing</code> and it's 16.</p>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Fix the soup by hand: add <code>error: null</code> to the "retry starts"
              update. It works... until the next developer adds a fourth field.</li>
              <li>Swap the first two <code>if</code>s in <code>render</code>. Now the "retry
              starts" step would show "Error" instead of a spinner. The UI depends on
              <code>if</code> order, not on the data.</li>
            </ul>
          </details>
        `,
        code: `let state = { isLoading: false, error: null, data: null };
const log = label => console.log(label.padEnd(16), JSON.stringify(state));

log('initial');
state = { ...state, isLoading: true };
log('fetch #1 starts');
state = { ...state, isLoading: false, error: 'Network down' };
log('fetch #1 fails');
state = { ...state, isLoading: true };
log('retry starts');
state = { ...state, isLoading: false, data: ['Ada', 'Grace'] };
log('retry succeeds');

const render = s => {
  if (s.isLoading) return 'Spinner';
  if (s.error) return 'Error: ' + s.error;
  if (s.data) return 'List of ' + s.data.length;
  return 'Click to load';
};
console.log('screen shows →', render(state));

console.log('--- all 8 combinations ---');
const legal = {
  'F F F': 'NotAsked',
  'F F T': 'Success',
  'F T F': 'Failure',
  'T F F': 'Loading',
};
let legalCount = 0;
for (const loading of [false, true]) {
  for (const error of [false, true]) {
    for (const data of [false, true]) {
      const key = [loading, error, data].map(b => (b ? 'T' : 'F')).join(' ');
      const meaning = legal[key];
      if (meaning) legalCount++;
      console.log('loading/error/data =', key, '→', meaning ? '✅ ' + meaning : '❌ illegal');
    }
  }
}
console.log('legal:', legalCount, 'of 8');`,
      },
      {
        title: 'RemoteData: only the legal states exist',
        code: `const NotAsked = () => ({ tag: 'NotAsked' });
const Loading = () => ({ tag: 'Loading' });
const Failure = error => ({ tag: 'Failure', error });
const Success = data => ({ tag: 'Success', data });

const match = (value, cases) => {
  const handler = cases[value.tag];
  if (!handler) throw new Error('no case for ' + value.tag);
  return handler(value);
};

const render = rd =>
  match(rd, {
    NotAsked: () => 'Click to load',
    Loading: () => 'Spinner',
    Failure: ({ error }) => 'Error: ' + error + ' [Retry]',
    Success: ({ data }) => 'List of ' + data.length + ': ' + data.join(', '),
  });

// The same flow as the boolean soup, but every step REPLACES the state
const steps = [
  ['initial', NotAsked()],
  ['fetch #1 starts', Loading()],
  ['fetch #1 fails', Failure('Network down')],
  ['retry starts', Loading()],
  ['retry succeeds', Success(['Ada', 'Grace'])],
];

for (const [label, state] of steps) {
  console.log(label.padEnd(16), JSON.stringify(state).padEnd(42), '→', render(state));
}

// Data lives only inside Success: there is nothing stale to read elsewhere
console.log('Failure has .data?', 'data' in Failure('x'));`,
      },
      {
        title: 'The same union in TypeScript (read-only)',
        runnable: false,
        code: `// TypeScript: a discriminated union. The compiler narrows on \`tag\`.
type RemoteData<E, A> =
  | { tag: 'NotAsked' }
  | { tag: 'Loading' }
  | { tag: 'Failure'; error: E }
  | { tag: 'Success'; data: A };

function render(rd: RemoteData<string, string[]>): string {
  switch (rd.tag) {
    case 'NotAsked':
      return 'Click to load';
    case 'Loading':
      return 'Spinner';
    case 'Failure':
      return 'Error: ' + rd.error; // rd is narrowed: .error exists here
    case 'Success':
      return rd.data.join(', '); // ...and .data exists only here
    default: {
      const unreachable: never = rd; // compile error if a case is missing
      return unreachable;
    }
  }
}

// Plain JS + JSDoc gets the same checking in editors with // @ts-check:
/**
 * @typedef {{ tag: 'NotAsked' } | { tag: 'Loading' }
 *   | { tag: 'Failure', error: string } | { tag: 'Success', data: string[] }} RemoteData
 */`,
      },
    ],
    quiz: [
      {
        q: `<code>{ isLoading: boolean, hasError: boolean, hasData: boolean }</code> has how
        many states, and how many are meaningful for a fetch?`,
        options: ['3 and 3', '8 and 4', '6 and 4', '8 and 8'],
        answer: 1,
        why: `2 × 2 × 2 = 8 combinations. Only idle, loading, failure and success make sense;
        the other 4 are illegal states the type still allows.`,
      },
      {
        q: `Why can't the RemoteData union show an error and stale data at the same time?`,
        options: [
          'Because match prevents it',
          'Because data only exists inside Success and error only inside Failure; a value is one variant',
          'Because JSON.stringify drops it',
          'It can',
        ],
        answer: 1,
        why: `A sum type value is exactly one variant. There's no field to forget to clear,
        because each transition builds a whole new variant.`,
      },
      {
        q: `You discover "refreshing while still showing the old list" is a real
        requirement. Best fix?`,
        options: [
          'Go back to isLoading + data booleans',
          'Add a Refreshing(data) variant',
          'Store data in a global variable',
          'Use Success with a loading flag inside',
        ],
        answer: 1,
        why: `Model the newly legal state explicitly. The union still lists exactly the states
        that exist, and every <code>match</code> is reminded to handle it.`,
      },
      {
        q: `In the TypeScript snippet, what does <code>const unreachable: never = rd</code>
        in <code>default</code> give you?`,
        options: [
          'A runtime error message',
          'A compile error if any variant is not handled above',
          'Faster code',
          'Nothing, it is decoration',
        ],
        answer: 1,
        why: `After all cases are handled, <code>rd</code> is narrowed to <code>never</code>.
        If you forget one, <code>rd</code> still has that variant's type, and assigning it to
        <code>never</code> fails to compile.`,
      },
      {
        q: `Which is the "illegal states unrepresentable" version of
        <code>{ isLoggedIn: boolean, user: User | null }</code>?`,
        options: [
          '<code>{ isLoggedIn: boolean }</code>',
          '<code>Anonymous | LoggedIn(user)</code>',
          '<code>{ user: User | null, isLoggedIn: boolean, isGuest: boolean }</code>',
          '<code>{ status: string, user: User | null }</code>',
        ],
        answer: 1,
        why: `The original allows <code>isLoggedIn: true, user: null</code> and the reverse.
        With the union, a user exists exactly when you're logged in.`,
      },
    ],
    exercise: {
      task: `<p>Model a websocket connection as a union:
      <code>Disconnected | Connecting(attempt) | Connected(sessionId) | Failed(reason,
      attempts)</code>.</p>
      <ul>
        <li>Write the four constructors (field names as in the checks).</li>
        <li><code>statusText(state)</code> → <code>'Offline'</code>,
        <code>'Connecting (attempt 2)...'</code>, <code>'Online: s-42'</code>,
        <code>'Failed after 3 attempts: timeout'</code>.</li>
        <li><code>retry(state)</code>: a <code>Failed</code> state becomes
        <code>Connecting(attempts + 1)</code>; any other state is returned unchanged.</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

// TODO: constructors
const Disconnected = () => ({ tag: 'TODO' });
const Connecting = attempt => ({ tag: 'TODO' });
const Connected = sessionId => ({ tag: 'TODO' });
const Failed = (reason, attempts) => ({ tag: 'TODO' });

const statusText = state => {
  // TODO: switch on state.tag
  return '';
};

const retry = state => {
  // TODO
  return state;
};

check('Connecting shape', Connecting(2), { tag: 'Connecting', attempt: 2 });
check('Failed shape', Failed('timeout', 3), {
  tag: 'Failed',
  reason: 'timeout',
  attempts: 3,
});
check('text Disconnected', statusText(Disconnected()), 'Offline');
check('text Connecting', statusText(Connecting(2)), 'Connecting (attempt 2)...');
check('text Connected', statusText(Connected('s-42')), 'Online: s-42');
check('text Failed', statusText(Failed('timeout', 3)), 'Failed after 3 attempts: timeout');
check('retry Failed', retry(Failed('timeout', 3)), Connecting(4));
check('retry Connected', retry(Connected('s-42')), Connected('s-42'));`,
      hint: `<code>const Failed = (reason, attempts) =&gt; ({ tag: 'Failed', reason, attempts });</code>.
      <code>retry</code>: <code>state.tag === 'Failed' ? Connecting(state.attempts + 1) : state</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Disconnected = () => ({ tag: 'Disconnected' });
const Connecting = attempt => ({ tag: 'Connecting', attempt });
const Connected = sessionId => ({ tag: 'Connected', sessionId });
const Failed = (reason, attempts) => ({ tag: 'Failed', reason, attempts });

const statusText = state => {
  switch (state.tag) {
    case 'Disconnected':
      return 'Offline';
    case 'Connecting':
      return 'Connecting (attempt ' + state.attempt + ')...';
    case 'Connected':
      return 'Online: ' + state.sessionId;
    case 'Failed':
      return 'Failed after ' + state.attempts + ' attempts: ' + state.reason;
    default:
      throw new Error('Unknown state: ' + state.tag);
  }
};

const retry = state => (state.tag === 'Failed' ? Connecting(state.attempts + 1) : state);

check('Connecting shape', Connecting(2), { tag: 'Connecting', attempt: 2 });
check('Failed shape', Failed('timeout', 3), {
  tag: 'Failed',
  reason: 'timeout',
  attempts: 3,
});
check('text Disconnected', statusText(Disconnected()), 'Offline');
check('text Connecting', statusText(Connecting(2)), 'Connecting (attempt 2)...');
check('text Connected', statusText(Connected('s-42')), 'Online: s-42');
check('text Failed', statusText(Failed('timeout', 3)), 'Failed after 3 attempts: timeout');
check('retry Failed', retry(Failed('timeout', 3)), Connecting(4));
check('retry Connected', retry(Connected('s-42')), Connected('s-42'));`,
    },
  },

  // ───────────────────────────────────────────────────────────── maybe
  {
    id: 'maybe',
    section: 'Types & Data Modeling',
    title: 'Maybe / Option',
    explain: `
      <p>Tony Hoare called <code>null</code> his "billion-dollar mistake": any value might
      secretly be missing, and nothing forces you to check. <strong>Maybe</strong> (called
      <strong>Option</strong> in Rust, Scala and fp-ts) makes "might be missing" an explicit
      sum type:</p>
      <pre><code>// Maybe&lt;A&gt; = Just(value: A) | Nothing</code></pre>
      <p>On its own that's just a tagged union. The power is in three operations that let
      you work with the value <em>without unwrapping it</em>:</p>
      <ul>
        <li><code>map(f)</code>: if <code>Just(x)</code>, return <code>Just(f(x))</code>;
        if <code>Nothing</code>, stay <code>Nothing</code>. <code>f</code> never sees a
        missing value.</li>
        <li><code>chain(f)</code> (a.k.a. <code>flatMap</code>/<code>bind</code>): for
        steps that themselves return a Maybe. <code>map</code> would give
        <code>Just(Just(x))</code>; <code>chain</code> flattens it.</li>
        <li><code>getOrElse(fallback)</code>: leave the Maybe world at the end, with a
        default.</li>
      </ul>
      <p>The result is a pipeline where the "is it missing?" check is written
      <em>once</em>, inside <code>Nothing</code>, instead of before every step. The first
      <code>Nothing</code> short-circuits everything after it.</p>

      <h3>Maybe vs <code>?.</code> and <code>??</code></h3>
      <p>Modern JS already has optional chaining and nullish coalescing, and they cover a
      lot:</p>
      <pre><code>const city = order.customer?.address?.city ?? 'unknown';</code></pre>
      <p>If you're just reading <strong>nested properties</strong> that may be absent,
      <code>?.</code> + <code>??</code> is enough. Don't wrap that in a Maybe. Maybe earns
      its keep when:</p>
      <ul>
        <li>the steps are <strong>functions that can fail</strong>, not property reads
        (parse a string, find in a list, look up an id, validate a number). <code>?.</code>
        can't express "<code>parseInt</code> gave NaN" or "regex didn't match";</li>
        <li>you want <strong>absence visible in the return value</strong>: a function that
        returns <code>Maybe</code> tells the caller "handle the missing case", a function
        returning <code>User | undefined</code> doesn't;</li>
        <li>you need to tell "absent" from "present but <code>undefined</code>"
        (<code>Map.get</code> can't).</li>
      </ul>
      <div class="warn"><code>??</code> only catches <code>null</code>/<code>undefined</code>.
      <code>||</code> also replaces <code>0</code>, <code>''</code> and <code>false</code>,
      which is a classic bug for volume or quantity fields. Neither catches
      <code>NaN</code>.</div>
    `,
    examples: [
      {
        title: 'A Maybe pipeline, step by step',
        explain: `
          <details>
            <summary>The problem: a null check before every step</summary>
            <pre><code>const id = /^u[0-9]+$/.test(input) ? input : null;
if (id === null) return 'unknown';
const user = db[id];
if (!user) return 'unknown';
const age = Number.parseInt(user.age, 10);
if (Number.isNaN(age)) return 'unknown';
return age + 1;</code></pre>
            <p>Half the lines are "is it there?" checks, each slightly different
            (<code>=== null</code>, falsy, <code>isNaN</code>). With Maybe, each step
            says once how it can fail, and the pipeline reads as the happy path.</p>
          </details>
          <details>
            <summary>Step by step: which steps run for each input</summary>
            <table>
              <tr><th>input</th><th>parseId</th><th>findUser</th><th>parseAge</th><th>map +1</th><th>Console result</th></tr>
              <tr><td><code>"u1"</code></td><td>✓ Just("u1")</td><td>✓ Just(user)</td><td>✓ Just(36)</td><td>Just(37)</td><td><code>→ Just(37) | getOrElse: 37</code></td></tr>
              <tr><td><code>"u2"</code></td><td>✓</td><td>✓</td><td>✗ <code>"n/a"</code> → Nothing</td><td>skipped</td><td><code>→ Nothing | getOrElse: unknown</code></td></tr>
              <tr><td><code>"u9"</code></td><td>✓</td><td>✗ not in db → Nothing</td><td>not called</td><td>skipped</td><td><code>→ Nothing | getOrElse: unknown</code></td></tr>
              <tr><td><code>"bob"</code></td><td>✗ → Nothing</td><td>not called</td><td>not called</td><td>skipped</td><td><code>→ Nothing | getOrElse: unknown</code></td></tr>
            </table>
            <p>Look at the console: for <code>"bob"</code> only the <code>parseId</code> line
            prints. <code>Nothing.chain(f)</code> returns <code>Nothing</code> without calling
            <code>f</code>, so later steps literally don't run.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>map: f =&gt; Just(f(value)),       // ① Just: apply f, re-wrap
chain: f =&gt; f(value),           // ② Just: f already returns a Maybe, don't re-wrap
map: () =&gt; Nothing(),           // ③ Nothing: ignore f entirely

parseId(input).chain(findUser).chain(parseAge).map(age =&gt; age + 1)</code></pre>
            <ol>
              <li><strong>①</strong> Use <code>map</code> for steps that can't fail
              (<code>age + 1</code>).</li>
              <li><strong>②</strong> Use <code>chain</code> for steps that can
              (<code>findUser</code> returns a Maybe). With <code>map</code> you'd get
              <code>Just(Just(user))</code>.</li>
              <li><strong>③</strong> This is the single place where "missing" is handled for
              the whole pipeline.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake: <code>map</code> with a function that returns null</summary>
            <p>The last two lines of the console:</p>
            <pre><code>map with a fn returning undefined: Just(undefined)
chain + fromNullable: Nothing</code></pre>
            <div class="warn">Our <code>map</code> trusts <code>f</code> to always return a
            value. If <code>f</code> can return null/undefined, you're back to a hidden
            missing value, now wrapped in a <code>Just</code>. Use
            <code>chain(x =&gt; fromNullable(f(x)))</code> for steps that can come back
            empty.</div>
          </details>
        `,
        code: `const Just = value => ({
  tag: 'Just',
  value,
  map: f => Just(f(value)),
  chain: f => f(value),
  getOrElse: () => value,
  toString: () => 'Just(' + JSON.stringify(value) + ')',
});

const Nothing = () => ({
  tag: 'Nothing',
  map: () => Nothing(),
  chain: () => Nothing(),
  getOrElse: fallback => fallback,
  toString: () => 'Nothing',
});

const fromNullable = x => (x == null ? Nothing() : Just(x));

const db = {
  u1: { name: 'Ada', age: '36' },
  u2: { name: 'Bob', age: 'n/a' },
};

// Each step can fail, each returns a Maybe
const parseId = input => {
  const ok = /^u[0-9]+$/.test(input);
  console.log('  parseId', JSON.stringify(input), ok ? '✓' : '✗');
  return ok ? Just(input) : Nothing();
};

const findUser = id => {
  const user = db[id];
  console.log('  findUser', id, user ? '✓' : '✗');
  return fromNullable(user);
};

const parseAge = user => {
  const n = Number.parseInt(user.age, 10);
  console.log('  parseAge', JSON.stringify(user.age), Number.isNaN(n) ? '✗' : '✓');
  return Number.isNaN(n) ? Nothing() : Just(n);
};

const ageNextYear = input =>
  parseId(input)
    .chain(findUser)
    .chain(parseAge)
    .map(age => age + 1);

for (const input of ['u1', 'u2', 'u9', 'bob']) {
  console.log('input', JSON.stringify(input));
  const result = ageNextYear(input);
  console.log('  →', String(result), '| getOrElse:', result.getOrElse('unknown'));
}

console.log('map with a fn returning undefined:', String(Just({}).map(o => o.missing)));
console.log('chain + fromNullable:', String(Just({}).chain(o => fromNullable(o.missing))));`,
      },
      {
        title: 'When ?. and ?? are enough (and when they are not)',
        code: `const Just = value => ({
  tag: 'Just',
  value,
  chain: f => f(value),
  getOrElse: () => value,
});
const Nothing = () => ({ tag: 'Nothing', chain: () => Nothing(), getOrElse: d => d });
const fromNullable = x => (x == null ? Nothing() : Just(x));

// 1) Nested property reads: ?. + ?? is all you need
const order = { customer: { address: { city: 'Lyon' } } };
const emptyOrder = {};
console.log('city:', order.customer?.address?.city ?? 'unknown');
console.log('city:', emptyOrder.customer?.address?.city ?? 'unknown');

// 2) ?? vs || : only ?? keeps 0 and ''
const settings = { volume: 0, nickname: '' };
console.log('volume  ||:', settings.volume || 50, ' ??:', settings.volume ?? 50);
const nick = settings.nickname;
console.log('nickname ||:', nick || 'anon', ' ??:', JSON.stringify(nick ?? 'anon'));

// 3) Steps that are FUNCTIONS that can fail: ?. does not help
const portWithOptionalChaining = text => {
  try {
    return Number(JSON.parse(text)?.port) ?? 3000; // NaN slips through ??
  } catch {
    return 3000; // and JSON.parse needs its own try/catch
  }
};

const safeParseJSON = text => {
  try {
    return Just(JSON.parse(text));
  } catch {
    return Nothing();
  }
};
const prop = key => obj => fromNullable(obj[key]);
const toInt = s => (Number.isInteger(Number(s)) ? Just(Number(s)) : Nothing());

const portWithMaybe = text =>
  safeParseJSON(text)
    .chain(prop('port'))
    .chain(toInt)
    .getOrElse(3000);

for (const text of ['{"port": "8080"}', '{"port": "80x"}', '{}', 'not json']) {
  console.log(
    text.padEnd(16),
    '?.:', String(portWithOptionalChaining(text)).padEnd(5),
    'Maybe:', portWithMaybe(text),
  );
}

// 4) Absent vs present-but-undefined
const cache = new Map([['a', undefined]]);
const lookup = key => (cache.has(key) ? Just(cache.get(key)) : Nothing());
for (const key of ['a', 'b']) {
  const viaNullish = cache.get(key) ?? 'missing';
  console.log("get('" + key + "') ?? 'missing':", viaNullish, '| Maybe tag:', lookup(key).tag);
}`,
      },
    ],
    quiz: [
      {
        q: `What does <code>Nothing().map(f)</code> do?`,
        options: [
          'Calls f with undefined',
          'Returns Nothing without calling f',
          'Throws',
          'Returns Just(undefined)',
        ],
        answer: 1,
        why: `That's the whole point: functions in the pipeline never see a missing value. The
        first Nothing short-circuits the rest.`,
      },
      {
        q: `<code>findUser</code> returns a Maybe. Why <code>m.chain(findUser)</code> rather
        than <code>m.map(findUser)</code>?`,
        options: [
          'chain is faster',
          'map would produce a nested Just(Just(user)); chain flattens it',
          'map does not accept functions',
          'There is no difference',
        ],
        answer: 1,
        why: `<code>map</code> always re-wraps the result. When the function already returns
        a Maybe, <code>chain</code> uses that Maybe directly.`,
      },
      {
        q: `You need <code>user.profile.avatar.url</code> with a default. Best tool?`,
        options: [
          'A Maybe pipeline with prop() steps',
          'user?.profile?.avatar?.url ?? defaultUrl',
          'try/catch',
          'user.profile.avatar.url || defaultUrl',
        ],
        answer: 1,
        why: `Plain nested property reads are exactly what <code>?.</code> and
        <code>??</code> were designed for. Maybe adds nothing here except ceremony.`,
      },
      {
        q: `<code>const volume = settings.volume || 50</code> with <code>volume: 0</code>
        gives…`,
        options: ['0', '50', 'undefined', 'NaN'],
        answer: 1,
        why: `<code>||</code> replaces any falsy value, including 0. Use <code>??</code> to
        replace only null/undefined.`,
      },
      {
        q: `What does <code>Just({}).map(o =&gt; o.missing)</code> give with our
        implementation?`,
        options: ['Nothing', 'Just(undefined)', 'undefined', 'It throws'],
        answer: 1,
        why: `Our <code>map</code> doesn't inspect the result. For steps that may return
        null/undefined, use <code>chain(o =&gt; fromNullable(o.missing))</code>.`,
      },
    ],
    exercise: {
      task: `<p>Using the given Maybe, write:</p>
      <ul>
        <li><code>safeHead(xs)</code>: <code>Just(first)</code> or <code>Nothing</code> for
        an empty array.</li>
        <li><code>safeNumber(s)</code>: <code>Just(number)</code> if the trimmed string is a
        valid number, else <code>Nothing</code> (careful: <code>Number('  ')</code> is
        <code>0</code>).</li>
        <li><code>firstNumberDoubled(strings)</code>: the first string parsed as a number,
        doubled, or <code>0</code>.</li>
      </ul>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Just = value => ({
  tag: 'Just',
  value,
  map: f => Just(f(value)),
  chain: f => f(value),
  getOrElse: () => value,
  toString: () => 'Just(' + JSON.stringify(value) + ')',
});
const Nothing = () => ({
  tag: 'Nothing',
  map: () => Nothing(),
  chain: () => Nothing(),
  getOrElse: fallback => fallback,
  toString: () => 'Nothing',
});

const safeHead = xs => {
  // TODO
  return undefined;
};

const safeNumber = s => {
  // TODO
  return undefined;
};

const firstNumberDoubled = strings => {
  // TODO: safeHead → chain(safeNumber) → map(double) → getOrElse(0)
  return undefined;
};

check('safeHead []', String(safeHead([])), 'Nothing');
check('safeHead [5, 6]', String(safeHead([5, 6])), 'Just(5)');
check('safeNumber "42"', String(safeNumber(' 42 ')), 'Just(42)');
check('safeNumber "4x2"', String(safeNumber('4x2')), 'Nothing');
check('safeNumber blank', String(safeNumber('   ')), 'Nothing');
check('doubled ["21", "x"]', firstNumberDoubled(['21', 'x']), 42);
check('doubled ["x", "21"]', firstNumberDoubled(['x', '21']), 0);
check('doubled []', firstNumberDoubled([]), 0);`,
      hint: `<code>safeHead = xs =&gt; (xs.length &gt; 0 ? Just(xs[0]) : Nothing())</code>.
      For <code>safeNumber</code>, trim first, reject <code>''</code>, then check
      <code>Number.isNaN</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Just = value => ({
  tag: 'Just',
  value,
  map: f => Just(f(value)),
  chain: f => f(value),
  getOrElse: () => value,
  toString: () => 'Just(' + JSON.stringify(value) + ')',
});
const Nothing = () => ({
  tag: 'Nothing',
  map: () => Nothing(),
  chain: () => Nothing(),
  getOrElse: fallback => fallback,
  toString: () => 'Nothing',
});

const safeHead = xs => (xs.length > 0 ? Just(xs[0]) : Nothing());

const safeNumber = s => {
  const trimmed = s.trim();
  const n = Number(trimmed);
  return trimmed !== '' && !Number.isNaN(n) ? Just(n) : Nothing();
};

const firstNumberDoubled = strings =>
  safeHead(strings)
    .chain(safeNumber)
    .map(n => n * 2)
    .getOrElse(0);

check('safeHead []', String(safeHead([])), 'Nothing');
check('safeHead [5, 6]', String(safeHead([5, 6])), 'Just(5)');
check('safeNumber "42"', String(safeNumber(' 42 ')), 'Just(42)');
check('safeNumber "4x2"', String(safeNumber('4x2')), 'Nothing');
check('safeNumber blank', String(safeNumber('   ')), 'Nothing');
check('doubled ["21", "x"]', firstNumberDoubled(['21', 'x']), 42);
check('doubled ["x", "21"]', firstNumberDoubled(['x', '21']), 0);
check('doubled []', firstNumberDoubled([]), 0);`,
    },
  },

  // ───────────────────────────────────────────────────────────── either
  {
    id: 'either',
    section: 'Types & Data Modeling',
    title: 'Either / Result',
    explain: `
      <p>Maybe says <em>that</em> something failed, but not <em>why</em>.
      <strong>Either</strong> keeps the reason:</p>
      <pre><code>// Either&lt;E, A&gt; = Left(error: E) | Right(value: A)
// a.k.a. Result&lt;A, E&gt; = Err(error) | Ok(value)     (Rust, F#, neverthrow)</code></pre>
      <p>"Right" is the right (correct) path by convention. We'll use the friendlier
      <code>Ok</code>/<code>Err</code> names. The operations mirror Maybe:</p>
      <ul>
        <li><code>map(f)</code>: transform an <code>Ok</code>; an <code>Err</code> passes
        through untouched, <code>f</code> is skipped.</li>
        <li><code>chain(f)</code>: run a step that can itself fail (returns a Result). The
        first <code>Err</code> wins and every later step is skipped.</li>
        <li><code>fold(onErr, onOk)</code>: at the end, turn both cases into one value
        (a message, an HTTP response, a UI state).</li>
      </ul>
      <p>Picture two railway tracks: the Ok track and the Err track. Each
      <code>chain</code> step is a switch that may move you to the Err track, and once
      you're there you ride it to the end. This is often called
      <strong>railway-oriented programming</strong>.</p>

      <h3>Errors as values vs <code>throw</code></h3>
      <ul>
        <li>A thrown error is invisible in the function's signature. Callers can't tell
        <code>parseConfig</code> might throw without reading its code.</li>
        <li><code>throw</code> jumps to the nearest <code>catch</code>, wherever that is.
        A Result is a normal return value: it flows through <code>map</code>, gets stored,
        gets logged, gets combined.</li>
        <li><code>fromTry(fn)</code> is the bridge: wrap a throwing function (like
        <code>JSON.parse</code>) so it returns <code>Ok</code>/<code>Err</code> instead.</li>
      </ul>
      <div class="tip">Rule of thumb: use Result for <strong>expected</strong> failures
      that are part of the domain (invalid input, not found, permission denied). Keep
      <code>throw</code> for <strong>bugs</strong> and truly exceptional situations
      (impossible state, programmer error), where crashing loudly is right.</div>
      <div class="warn">Promises are already a kind of Result for async code (fulfilled /
      rejected). Mixing them: an <code>async</code> function can resolve to a Result, so
      rejections mean "bug/infrastructure" and <code>Err</code> means "expected failure".</div>
    `,
    examples: [
      {
        title: 'The railway: validating an email',
        explain: `
          <details>
            <summary>The problem: nested ifs or early-return soup</summary>
            <p>Each validation step can fail with its own message. With plain code you write
            <code>if (...) return { error: ... }</code> after every step, and every caller
            needs to know your ad-hoc error shape. With Result each step is a small function
            and the pipeline is one line.</p>
          </details>
          <details>
            <summary>Step by step: which steps run for each input</summary>
            <table>
              <tr><th>input</th><th>required</th><th>hasAt</th><th>allowedDomain</th><th>normalize (map)</th><th>Console result</th></tr>
              <tr><td><code>"  Ada@Example.com "</code></td><td>✓ trims</td><td>✓</td><td>✓</td><td>runs</td><td><code>→ Ok: ada@example.com</code></td></tr>
              <tr><td><code>"   "</code></td><td>✗ Err</td><td>skipped</td><td>skipped</td><td>skipped</td><td><code>→ Err: email is required</code></td></tr>
              <tr><td><code>"ada.example.com"</code></td><td>✓</td><td>✗ Err</td><td>skipped</td><td>skipped</td><td><code>→ Err: email must contain @</code></td></tr>
              <tr><td><code>"bot@spam.com"</code></td><td>✓</td><td>✓</td><td>✗ Err</td><td>skipped</td><td><code>→ Err: domain not allowed</code></td></tr>
            </table>
            <p>The <code>run ...</code> lines in the console prove it: after the first Err, no
            more <code>run</code> lines appear for that input. For the blank input you see
            only <code>run required</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>chain: f =&gt; f(value),        // ① Ok: run the next step, its Result is the new one
chain: () =&gt; Err(error),     // ② Err: ignore the step, keep the first error
fold: (onErr, onOk) =&gt; ...   // ③ leave the railway: handle both cases once

Ok(input).chain(required).chain(hasAt).chain(allowedDomain).map(normalize)</code></pre>
            <ol>
              <li><strong>①</strong> A step returning <code>Err</code> switches the train to
              the error track.</li>
              <li><strong>②</strong> On the error track, steps are skipped and the original
              error is preserved: you report <em>what</em> went wrong first.</li>
              <li><strong>③</strong> <code>fold</code> forces you to say what happens in both
              cases. You can't "forget" the error path.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Swap <code>.chain(hasAt)</code> and <code>.chain(allowedDomain)</code>. Same
              results here, but now think about which message a user sees first for
              <code>"spam.com"</code>.</li>
              <li>Change <code>.map(normalize)</code> to <code>.chain(normalize)</code>. The
              Ok result breaks: <code>normalize</code> returns a plain string, not a Result,
              so <code>fold</code> is missing. <code>map</code> for steps that can't fail,
              <code>chain</code> for steps that can.</li>
            </ul>
            <div class="warn">This stops at the <strong>first</strong> error. For forms you
            usually want <em>all</em> errors at once; the "Parse, don't validate" lesson
            collects them per field.</div>
          </details>
        `,
        code: `const Ok = value => ({
  tag: 'Ok',
  value,
  map: f => Ok(f(value)),
  chain: f => f(value),
  fold: (onErr, onOk) => onOk(value),
});

const Err = error => ({
  tag: 'Err',
  error,
  map: () => Err(error),
  chain: () => Err(error),
  fold: (onErr, onOk) => onErr(error),
});

// Wrap a step so we can see when it runs
const step = (name, fn) => x => {
  console.log('    run', name);
  return fn(x);
};

const required = step('required', s => (s.trim() ? Ok(s.trim()) : Err('email is required')));
const hasAt = step('hasAt', s => (s.includes('@') ? Ok(s) : Err('email must contain @')));
const allowedDomain = step('allowedDomain', s =>
  s.endsWith('@spam.com') ? Err('domain not allowed') : Ok(s),
);
const normalize = step('normalize', s => s.toLowerCase());

const validateEmail = input =>
  Ok(input)
    .chain(required)
    .chain(hasAt)
    .chain(allowedDomain)
    .map(normalize);

for (const input of ['  Ada@Example.com ', '   ', 'ada.example.com', 'bot@spam.com']) {
  console.log('input ' + JSON.stringify(input));
  const result = validateEmail(input);
  console.log('  → ' + result.fold(e => 'Err: ' + e, v => 'Ok: ' + v));
}`,
      },
      {
        title: 'Throw vs value, and fromTry',
        code: `const Ok = value => ({
  tag: 'Ok',
  value,
  map: f => Ok(f(value)),
  chain: f => f(value),
  fold: (onErr, onOk) => onOk(value),
});
const Err = error => ({
  tag: 'Err',
  error,
  map: () => Err(error),
  chain: () => Err(error),
  fold: (onErr, onOk) => onErr(error),
});

// 1) The throwing version: nothing in its shape says it can fail
const readPortThrowing = text => {
  const config = JSON.parse(text); // may throw SyntaxError
  if (typeof config.port !== 'number') throw new Error('port must be a number');
  if (config.port < 1 || config.port > 65535) throw new Error('port out of range');
  return config.port;
};

try {
  console.log('throwing:', readPortThrowing('{"port": 99999}'));
} catch (e) {
  console.log('throwing: caught "' + e.message + '" (only because we remembered try)');
}

// 2) fromTry: turn a throwing function into a Result-returning one
const fromTry = (fn, label) => (...args) => {
  try {
    return Ok(fn(...args));
  } catch (e) {
    return Err(label + ' (' + e.name + ')');
  }
};

const parseJSON = fromTry(JSON.parse, 'invalid JSON');
const portField = config =>
  typeof config.port === 'number' ? Ok(config.port) : Err('port must be a number');
const inRange = port =>
  port >= 1 && port <= 65535 ? Ok(port) : Err('port out of range: ' + port);

const readPort = text => parseJSON(text).chain(portField).chain(inRange);

for (const text of ['{"port": 8080}', '{"port": 99999}', '{"port": "80"}', '{port: 8080}']) {
  const shown = readPort(text).fold(e => 'Err: ' + e, p => 'Ok: ' + p);
  console.log(text.padEnd(16), '→', shown);
}

// 3) Results are values: collect, count, log them
const results = ['{"port": 1}', 'oops', '{"port": 2}'].map(readPort);
console.log('ok count:', results.filter(r => r.tag === 'Ok').length, 'of', results.length);

// 4) Back at the edge, decide once
const port = readPort('oops').fold(() => 3000, p => p);
console.log('port with default:', port);`,
      },
    ],
    quiz: [
      {
        q: `What does <code>Err('boom').map(f)</code> return?`,
        options: [
          'Ok(f(boom))',
          "Err('boom'), and f is never called",
          'It throws boom',
          'undefined',
        ],
        answer: 1,
        why: `On the error track every <code>map</code>/<code>chain</code> is skipped and the
        original error is passed along unchanged.`,
      },
      {
        q: `A validation pipeline has steps A, B, C (all via chain). B fails. Which run?`,
        options: ['A, B, C', 'A and B', 'Only A', 'Only C'],
        answer: 1,
        why: `A runs and succeeds, B runs and returns Err, C is skipped because
        <code>Err.chain</code> ignores its function.`,
      },
      {
        q: `What is <code>fromTry(JSON.parse)</code> for?`,
        options: [
          'Making JSON.parse faster',
          'Turning a function that throws into one that returns Ok/Err',
          'Validating JSON schemas',
          'Catching errors globally',
        ],
        answer: 1,
        why: `It's the bridge from the throwing world into Result pipelines: success becomes
        <code>Ok(value)</code>, a thrown error becomes <code>Err(...)</code>.`,
      },
      {
        q: `When is <code>throw</code> still the right choice?`,
        options: [
          'For invalid user input',
          'For "user not found"',
          'For programmer bugs and impossible states',
          'Never',
        ],
        answer: 2,
        why: `Expected, domain-level failures belong in Result so callers must handle them.
        Bugs should crash loudly so you notice and fix them.`,
      },
      {
        q: `What does <code>fold(onErr, onOk)</code> do?`,
        options: [
          'Merges two Results',
          'Leaves the Result world by handling both cases and returning a single value',
          'Retries the failed step',
          'Converts Err to Ok',
        ],
        answer: 1,
        why: `It's the exit point: you must supply a handler for each case, so the error path
        can't be forgotten.`,
      },
    ],
    exercise: {
      task: `<p>Build <code>parseAge(text)</code> from three Result steps chained in this
      order:</p>
      <ul>
        <li><code>toNumber</code>: <code>Err('not a number')</code> for blank or non-numeric
        text, else <code>Ok(number)</code></li>
        <li><code>isInteger</code>: <code>Err('not an integer')</code> unless
        <code>Number.isInteger</code></li>
        <li><code>inRange</code>: <code>Err('out of range')</code> unless 0–150</li>
      </ul>
      <p>The checks use <code>fold</code> to turn each result into a string.</p>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = value => ({
  tag: 'Ok',
  value,
  map: f => Ok(f(value)),
  chain: f => f(value),
  fold: (onErr, onOk) => onOk(value),
});
const Err = error => ({
  tag: 'Err',
  error,
  map: () => Err(error),
  chain: () => Err(error),
  fold: (onErr, onOk) => onErr(error),
});

const toNumber = text => Err('TODO');
const isInteger = n => Err('TODO');
const inRange = n => Err('TODO');

const parseAge = text => toNumber(text).chain(isInteger).chain(inRange);

const show = r => r.fold(e => 'Err: ' + e, v => 'Ok: ' + v);

check('"42"', show(parseAge('42')), 'Ok: 42');
check('" 7 "', show(parseAge(' 7 ')), 'Ok: 7');
check('"abc"', show(parseAge('abc')), 'Err: not a number');
check('blank', show(parseAge('  ')), 'Err: not a number');
check('"4.5"', show(parseAge('4.5')), 'Err: not an integer');
check('"200"', show(parseAge('200')), 'Err: out of range');
check('"-1"', show(parseAge('-1')), 'Err: out of range');`,
      hint: `<code>toNumber</code>: trim, then
      <code>trimmed === '' || Number.isNaN(Number(trimmed)) ? Err('not a number') : Ok(Number(trimmed))</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = value => ({
  tag: 'Ok',
  value,
  map: f => Ok(f(value)),
  chain: f => f(value),
  fold: (onErr, onOk) => onOk(value),
});
const Err = error => ({
  tag: 'Err',
  error,
  map: () => Err(error),
  chain: () => Err(error),
  fold: (onErr, onOk) => onErr(error),
});

const toNumber = text => {
  const trimmed = text.trim();
  const n = Number(trimmed);
  return trimmed === '' || Number.isNaN(n) ? Err('not a number') : Ok(n);
};
const isInteger = n => (Number.isInteger(n) ? Ok(n) : Err('not an integer'));
const inRange = n => (n >= 0 && n <= 150 ? Ok(n) : Err('out of range'));

const parseAge = text => toNumber(text).chain(isInteger).chain(inRange);

const show = r => r.fold(e => 'Err: ' + e, v => 'Ok: ' + v);

check('"42"', show(parseAge('42')), 'Ok: 42');
check('" 7 "', show(parseAge(' 7 ')), 'Ok: 7');
check('"abc"', show(parseAge('abc')), 'Err: not a number');
check('blank', show(parseAge('  ')), 'Err: not a number');
check('"4.5"', show(parseAge('4.5')), 'Err: not an integer');
check('"200"', show(parseAge('200')), 'Err: out of range');
check('"-1"', show(parseAge('-1')), 'Err: out of range');`,
    },
  },

  // ───────────────────────────────────────────────────────────── parse-dont-validate
  {
    id: 'parse-dont-validate',
    section: 'Types & Data Modeling',
    title: "Parse, Don't Validate",
    explain: `
      <p>A <strong>validator</strong> answers a yes/no question:
      <code>isValidAge(input) → boolean</code>. After it says yes, you still hold the
      <em>same raw input</em>: a string with spaces, maybe. Nothing records that it was
      checked, so the next function checks again, or worse, assumes and doesn't.</p>
      <p>A <strong>parser</strong> answers with a <em>better value</em>:
      <code>parseAge(input) → Ok(42) | Err('...')</code>. The output is a real number,
      already trimmed and range-checked. Code that receives it doesn't need to re-check
      anything. The phrase comes from Alexis King's 2019 essay "Parse, don't validate".</p>

      <h3>Parse once, at the boundary</h3>
      <p>Data from outside (form fields, <code>JSON.parse</code>, query strings,
      <code>localStorage</code>, API responses) is <code>unknown</code>. Parse it the moment
      it enters the program:</p>
      <pre><code>raw input ──► parseSignup ──► Ok(User)  ──► the rest of the app trusts User
                         └──► Err([...]) ──► show errors, stop here</code></pre>
      <p>The opposite, checks sprinkled everywhere just before use, is sometimes called
      <strong>shotgun parsing</strong>: some paths check, some forget, and invalid data
      gets halfway through a process before anything notices.</p>

      <h3>Parsers compose</h3>
      <p>Small parsers (<code>string</code>, <code>nonEmpty</code>, <code>int</code>,
      <code>between(13, 120)</code>) combine into field parsers with <code>pipeP</code>,
      and field parsers combine into an object parser. Unlike the Either pipeline (stop at
      first error), the object parser runs <em>every</em> field and collects all errors,
      which is what a form needs.</p>
      <div class="tip">In real projects this is what schema libraries do: Zod, Valibot,
      ArkType, Effect Schema. Zod, for example (not runnable here):
      <pre><code>const Signup = z.object({
  name: z.string().trim().min(1),
  age: z.coerce.number().int().min(13).max(120),
});
const result = Signup.safeParse(input);
// { success: true, data } | { success: false, error }</code></pre>
      Same idea: one schema, one call at the boundary, a precise value or a list of
      errors.</div>
      <div class="warn">Plain JS can't stop someone from building a "User" object by hand and
      skipping the parser. Make the parser the only place that creates these values (and
      maybe <code>Object.freeze</code> the result) so "came from the parser" really means
      "valid".</div>
    `,
    examples: [
      {
        title: 'Validate vs parse',
        code: `// VALIDATE: a yes/no answer. You still hold the raw string afterwards.
const isValidAge = input =>
  typeof input === 'string' && /^ *[0-9]+ *$/.test(input) && Number(input) <= 150;

const raw = ' 42 ';
if (isValidAge(raw)) {
  console.log('validated! typeof raw:', typeof raw);
  console.log('next birthday:', raw + 1, '🙃');
}

// PARSE: answer with a better value (or a reason why not)
const Ok = value => ({ tag: 'Ok', value });
const Err = error => ({ tag: 'Err', error });

const parseAge = input => {
  if (typeof input !== 'string' && typeof input !== 'number') {
    return Err('expected text or a number');
  }
  const text = String(input).trim();
  const n = Number(text);
  if (text === '' || !Number.isInteger(n)) return Err('not a whole number');
  if (n < 0 || n > 150) return Err('out of range');
  return Ok(n);
};

for (const input of [' 42 ', '4.2', '', 200, null]) {
  const r = parseAge(input);
  const shown =
    r.tag === 'Ok' ? 'Ok ' + r.value + ' (' + typeof r.value + ')' : 'Err ' + r.error;
  console.log(JSON.stringify(input).padEnd(6), '→', shown);
}

const parsed = parseAge(raw);
if (parsed.tag === 'Ok') console.log('next birthday:', parsed.value + 1, '🎂');`,
      },
      {
        title: 'Composing parsers for a signup form',
        explain: `
          <details>
            <summary>What the console shows</summary>
            <table>
              <tr><th>Input</th><th>Result</th></tr>
              <tr><td><code>good</code>: name <code>"  Ada "</code>, email <code>"ADA@Example.com"</code>, age <code>"36"</code></td>
              <td><code>Ok</code> with <code>{"name":"Ada","email":"ada@example.com","age":36,"newsletter":false}</code>: trimmed, lower-cased, a real number, a default filled in.</td></tr>
              <tr><td><code>bad</code>: blank name, no @, age 9, newsletter <code>"yes"</code></td>
              <td><code>Err</code> with all four messages, one per field.</td></tr>
              <tr><td><code>null</code></td><td><code>Err ["expected an object"]</code></td></tr>
            </table>
            <p>Then <code>welcome(user)</code> runs only for the parsed value and does
            <code>user.age + 1</code> with no checks: <code>Welcome Ada, next year you'll be
            37</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const pipeP = (...parsers) =&gt; input =&gt;
  parsers.reduce((r, p) =&gt; (r.tag === 'Ok' ? p(r.value) : r), Ok(input)); // ①

const object = shape =&gt; input =&gt; {
  for (const [key, parser] of Object.entries(shape)) {                       // ②
    const r = parser(input[key]);
    if (r.tag === 'Ok') value[key] = r.value; else errors.push(key + ': ' + r.error);
  }
  return errors.length &gt; 0 ? Err(errors) : Ok(value);                      // ③
};</code></pre>
            <ol>
              <li><strong>①</strong> Within one field: run parsers in sequence, stop at the
              first error (the railway from the Either lesson). Each parser receives the
              <em>previous parser's output</em>, so <code>nonEmpty</code> sees an already
              trimmed string.</li>
              <li><strong>②</strong> Across fields: run <em>every</em> field parser, even after
              one fails, so the user sees all problems at once.</li>
              <li><strong>③</strong> The output object contains only keys from the shape,
              with parsed values. Extra junk in the input (like <code>isAdmin: true</code>)
              is dropped.</li>
            </ol>
            <div class="tip">That last point matters for security: never spread raw request
            bodies into your data (<code>{ ...req.body }</code>). Parse into exactly the
            fields you expect.</div>
          </details>
        `,
        code: `const Ok = value => ({ tag: 'Ok', value });
const Err = error => ({ tag: 'Err', error });

// Building blocks: each parser is  unknown → Result
const string = input =>
  typeof input === 'string' ? Ok(input.trim()) : Err('expected a string');
const nonEmpty = s => (s.length > 0 ? Ok(s) : Err('must not be empty'));
const email = s => (/^[^@ ]+@[^@ ]+$/.test(s) ? Ok(s.toLowerCase()) : Err('not an email'));
const int = input => {
  const n = typeof input === 'string' && input.trim() !== '' ? Number(input) : input;
  return Number.isInteger(n) ? Ok(n) : Err('expected a whole number');
};
const between = (min, max) => n =>
  n >= min && n <= max ? Ok(n) : Err('must be between ' + min + ' and ' + max);
const boolean = input =>
  typeof input === 'boolean' ? Ok(input) : Err('expected true/false');
const optional = (parser, fallback) => input =>
  input === undefined ? Ok(fallback) : parser(input);

// Combinators
const pipeP = (...parsers) => input =>
  parsers.reduce((r, p) => (r.tag === 'Ok' ? p(r.value) : r), Ok(input));

const object = shape => input => {
  if (typeof input !== 'object' || input === null) return Err(['expected an object']);
  const value = {};
  const errors = [];
  for (const [key, parser] of Object.entries(shape)) {
    const r = parser(input[key]);
    if (r.tag === 'Ok') value[key] = r.value;
    else errors.push(key + ': ' + r.error);
  }
  return errors.length > 0 ? Err(errors) : Ok(value);
};

// The schema for our boundary
const parseSignup = object({
  name: pipeP(string, nonEmpty),
  email: pipeP(string, email),
  age: pipeP(int, between(13, 120)),
  newsletter: optional(boolean, false),
});

const good = { name: '  Ada ', email: 'ADA@Example.com', age: '36', isAdmin: true };
const bad = { name: '   ', email: 'ada-at-example', age: 9, newsletter: 'yes' };

for (const [label, input] of [['good', good], ['bad', bad], ['null', null]]) {
  const r = parseSignup(input);
  console.log(label.padEnd(4), r.tag, JSON.stringify(r.tag === 'Ok' ? r.value : r.error));
}

// Inside the app: no checks needed, the type is already right
const welcome = user => 'Welcome ' + user.name + ", next year you'll be " + (user.age + 1);

const result = parseSignup(good);
if (result.tag === 'Ok') console.log(welcome(result.value));`,
      },
    ],
    quiz: [
      {
        q: `What's the key difference between a validator and a parser?`,
        options: [
          'Parsers are faster',
          'A validator returns a boolean; a parser returns a more precise value (or an error)',
          'Validators only work on strings',
          'There is none',
        ],
        answer: 1,
        why: `After validation you still hold the raw input. After parsing you hold a new
        value that <em>is</em> the evidence: a number instead of a string, a trimmed name,
        defaults filled in.`,
      },
      {
        q: `Where should parsing happen?`,
        options: [
          'Right before each use',
          'Once, at the boundary where outside data enters the program',
          'Only on the server',
          'In the database',
        ],
        answer: 1,
        why: `Parse at the edge (form submit, API response, JSON.parse) so everything inside
        receives trusted values. Checks scattered everywhere ("shotgun parsing") are easy to
        miss.`,
      },
      {
        q: `Why does <code>object(shape)</code> collect all errors, while
        <code>pipeP</code> stops at the first?`,
        options: [
          'It is a bug',
          'Fields are independent (show every problem at once); steps of one field depend on the previous step',
          'pipeP is faster that way',
          'Arrays cannot hold one error',
        ],
        answer: 1,
        why: `<code>between(13, 120)</code> can't run if <code>int</code> failed, so per
        field we stop. But a bad email says nothing about the name, so across fields we keep
        going.`,
      },
      {
        q: `The input has an extra <code>isAdmin: true</code>. What does
        <code>parseSignup</code> return?`,
        options: [
          'An error',
          'The parsed object without isAdmin',
          'The parsed object including isAdmin',
          'It throws',
        ],
        answer: 1,
        why: `The output is built only from keys in the schema. Unknown fields are dropped,
        which prevents mass-assignment bugs.`,
      },
      {
        q: `<code>isValidAge(' 42 ')</code> is true. What's <code>' 42 ' + 1</code>?`,
        options: ['43', "' 42 1'", 'NaN', 'TypeError'],
        answer: 1,
        why: `Validation didn't change the type, so <code>+</code> concatenates. Parsing would
        have given you the number 42.`,
      },
    ],
    exercise: {
      task: `<p>Parse pagination query params (always strings, or missing). Implement:</p>
      <ul>
        <li><code>int</code>: <code>Ok(number)</code> for a non-blank string of a whole
        number, else <code>Err('expected a whole number')</code></li>
        <li><code>between(min, max)</code>: <code>Err('must be between MIN and MAX')</code>
        outside the range</li>
        <li><code>oneOf(options)</code>: <code>Err('must be one of: asc, desc')</code> for
        anything else</li>
      </ul>
      <p><code>pipeP</code>, <code>optional</code> and <code>object</code> are given, as is
      the <code>parseQuery</code> schema.</p>`,
      starter: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = value => ({ tag: 'Ok', value });
const Err = error => ({ tag: 'Err', error });

const pipeP = (...parsers) => input =>
  parsers.reduce((r, p) => (r.tag === 'Ok' ? p(r.value) : r), Ok(input));
const optional = (parser, fallback) => input =>
  input === undefined ? Ok(fallback) : parser(input);
const object = shape => input => {
  const value = {};
  const errors = [];
  for (const [key, parser] of Object.entries(shape)) {
    const r = parser(input[key]);
    if (r.tag === 'Ok') value[key] = r.value;
    else errors.push(key + ': ' + r.error);
  }
  return errors.length > 0 ? Err(errors) : Ok(value);
};

// TODO: implement these three
const int = input => Err('TODO');
const between = (min, max) => n => Err('TODO');
const oneOf = options => input => Err('TODO');

const parseQuery = object({
  page: optional(pipeP(int, between(1, 1000)), 1),
  pageSize: optional(pipeP(int, between(1, 100)), 20),
  sort: optional(oneOf(['asc', 'desc']), 'asc'),
});

check('all given', parseQuery({ page: '2', pageSize: '50', sort: 'desc' }), {
  tag: 'Ok',
  value: { page: 2, pageSize: 50, sort: 'desc' },
});
check('defaults', parseQuery({}), {
  tag: 'Ok',
  value: { page: 1, pageSize: 20, sort: 'asc' },
});
check('not a number', parseQuery({ page: 'abc' }), {
  tag: 'Err',
  error: ['page: expected a whole number'],
});
check('all errors', parseQuery({ page: '0', pageSize: '500', sort: 'random' }), {
  tag: 'Err',
  error: [
    'page: must be between 1 and 1000',
    'pageSize: must be between 1 and 100',
    'sort: must be one of: asc, desc',
  ],
});
check('blank is not 0', parseQuery({ pageSize: ' ' }), {
  tag: 'Err',
  error: ['pageSize: expected a whole number'],
});`,
      hint: `<code>int</code>: <code>const n = Number(input);</code> and reject when
      <code>input.trim() === ''</code> or <code>!Number.isInteger(n)</code>.
      <code>oneOf</code>: <code>options.includes(input) ? Ok(input) : Err('must be one of: ' +
      options.join(', '))</code>.`,
      solution: `const check = (name, actual, expected) => {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(ok ? '✅' : '❌', name, ok ? '' : '→ got ' + JSON.stringify(actual));
};

const Ok = value => ({ tag: 'Ok', value });
const Err = error => ({ tag: 'Err', error });

const pipeP = (...parsers) => input =>
  parsers.reduce((r, p) => (r.tag === 'Ok' ? p(r.value) : r), Ok(input));
const optional = (parser, fallback) => input =>
  input === undefined ? Ok(fallback) : parser(input);
const object = shape => input => {
  const value = {};
  const errors = [];
  for (const [key, parser] of Object.entries(shape)) {
    const r = parser(input[key]);
    if (r.tag === 'Ok') value[key] = r.value;
    else errors.push(key + ': ' + r.error);
  }
  return errors.length > 0 ? Err(errors) : Ok(value);
};

const int = input => {
  const n = Number(input);
  return typeof input === 'string' && input.trim() !== '' && Number.isInteger(n)
    ? Ok(n)
    : Err('expected a whole number');
};
const between = (min, max) => n =>
  n >= min && n <= max ? Ok(n) : Err('must be between ' + min + ' and ' + max);
const oneOf = options => input =>
  options.includes(input) ? Ok(input) : Err('must be one of: ' + options.join(', '));

const parseQuery = object({
  page: optional(pipeP(int, between(1, 1000)), 1),
  pageSize: optional(pipeP(int, between(1, 100)), 20),
  sort: optional(oneOf(['asc', 'desc']), 'asc'),
});

check('all given', parseQuery({ page: '2', pageSize: '50', sort: 'desc' }), {
  tag: 'Ok',
  value: { page: 2, pageSize: 50, sort: 'desc' },
});
check('defaults', parseQuery({}), {
  tag: 'Ok',
  value: { page: 1, pageSize: 20, sort: 'asc' },
});
check('not a number', parseQuery({ page: 'abc' }), {
  tag: 'Err',
  error: ['page: expected a whole number'],
});
check('all errors', parseQuery({ page: '0', pageSize: '500', sort: 'random' }), {
  tag: 'Err',
  error: [
    'page: must be between 1 and 1000',
    'pageSize: must be between 1 and 100',
    'sort: must be one of: asc, desc',
  ],
});
check('blank is not 0', parseQuery({ pageSize: ' ' }), {
  tag: 'Err',
  error: ['pageSize: expected a whole number'],
});`,
    },
  },
);
