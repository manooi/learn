window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────── intro
  {
    id: 'intro',
    section: 'Basics',
    title: 'What is React',
    explain: `
      <p><strong>React</strong> is a JavaScript library for building user interfaces. Instead of telling the browser <em>step by step</em> how to change the page ("find this div, change its text, add a class..."), you describe <em>what the UI should look like</em> for the current data, and React figures out how to update the page.</p>

      <h3>The big idea: UI = f(state)</h3>
      <p>Think of your UI as a function of your data. Give it a list of 3 todos, it shows 3 items. Give it 4, it shows 4. You never write "append a new li" code yourself — you change the data and React re-draws what changed.</p>

      <h3>Building blocks: components</h3>
      <p>A React app is made of <strong>components</strong>: small, reusable pieces of UI written as JavaScript functions. A component returns markup that looks like HTML (called <strong>JSX</strong>):</p>
      <pre><code>export default function App() {
  return &lt;h1&gt;Hello, React!&lt;/h1&gt;;
}</code></pre>
      <p>Like LEGO bricks, you snap small components (a <code>Button</code>, an <code>Avatar</code>) into bigger ones (a <code>ProfileCard</code>), and those into a whole page.</p>

      <h3>How this site works</h3>
      <ul>
        <li>Every example has a live editor. Change the code and the preview updates.</li>
        <li>Each file must <code>export default</code> a component (usually called <code>App</code>). The site renders it for you.</li>
        <li>Anything you <code>console.log</code> shows up in the console panel under the preview.</li>
      </ul>

      <div class="tip"><strong>Why it matters:</strong> declarative code ("show this for that data") is much easier to read and debug than long chains of manual DOM updates.</div>
      <div class="warn">React is a <em>library</em> for UI, not a full framework. Routing, data fetching etc. come from other tools or frameworks built on React (like Next.js). For learning, plain React is all you need.</div>
    `,
    examples: [
      {
        title: 'Your first component',
        code: `export default function App() {
  console.log('App rendered!');
  return (
    <div>
      <h1>Hello, React!</h1>
      <p>Try changing this text and watch the preview update.</p>
    </div>
  );
}`,
      },
      {
        title: 'Declarative: UI follows data',
        code: `const fruits = ['Apple', 'Banana', 'Cherry'];

export default function App() {
  // We describe WHAT to show for this data.
  // Add 'Mango' to the array above and the list updates by itself.
  return (
    <div>
      <h2>I have {fruits.length} fruits</h2>
      <ul>
        {fruits.map(f => <li key={f}>{f}</li>)}
      </ul>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What is React mainly used for?', options: ['Styling web pages', 'Building user interfaces', 'Running databases', 'Replacing HTTP'], answer: 1, why: 'React is a JavaScript library for building user interfaces out of components.' },
      { q: 'What does "declarative" mean in React?', options: ['You write every DOM change by hand', 'You describe what the UI should look like for the current data', 'You must declare all variables with const', 'You write UI in XML files'], answer: 1, why: 'You describe the result; React works out the DOM updates needed to get there.' },
      { q: 'In React, a component is usually…', options: ['A CSS class', 'A JavaScript function that returns markup (JSX)', 'An HTML file', 'A database table'], answer: 1, why: 'Modern React components are plain JavaScript functions that return JSX.' },
      { q: 'On this site, what must each code sample do?', options: ['Call <code>ReactDOM.render</code> itself', '<code>export default</code> a component', 'Import a CSS file', 'Nothing special'], answer: 1, why: 'The runner renders your default-exported component into the page.' },
    ],
    exercise: {
      task: `<p>Make the <code>App</code> component show an <code>h1</code> with your name and a <code>p</code> saying what you want to build with React.</p>`,
      starter: `export default function App() {
  // TODO: return an h1 with your name and a p below it
  return <div>Replace me</div>;
}`,
      hint: 'Wrap the h1 and p in a single parent div, and put the whole thing in parentheses after return.',
      solution: `export default function App() {
  return (
    <div>
      <h1>Hi, I am Alex</h1>
      <p>I want to build a todo app with React.</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── jsx
  {
    id: 'jsx',
    section: 'Basics',
    title: 'JSX',
    explain: `
      <p><strong>JSX</strong> lets you write HTML-like markup inside JavaScript. It is not a string and not real HTML — a compiler (Babel) turns it into normal JavaScript function calls that create React elements.</p>
      <pre><code>const el = &lt;h1 className="title"&gt;Hi&lt;/h1&gt;;
// becomes roughly:
const el = jsx('h1', { className: 'title', children: 'Hi' });</code></pre>

      <h3>Rules of JSX</h3>
      <ul>
        <li><strong>Return one root element.</strong> Wrap siblings in a <code>&lt;div&gt;</code> or a Fragment <code>&lt;&gt;...&lt;/&gt;</code>.</li>
        <li><strong>Close every tag.</strong> <code>&lt;img /&gt;</code>, <code>&lt;br /&gt;</code>, <code>&lt;input /&gt;</code>.</li>
        <li><strong>camelCase attributes.</strong> <code>className</code> instead of <code>class</code>, <code>htmlFor</code> instead of <code>for</code>, <code>onClick</code> instead of <code>onclick</code>.</li>
      </ul>

      <h3>Curly braces: a window into JavaScript</h3>
      <p>Inside JSX, <code>{ }</code> lets you drop in any JavaScript <em>expression</em>: variables, math, function calls.</p>
      <pre><code>const name = 'Sam';
&lt;p&gt;Hello {name}, 2 + 2 = {2 + 2}&lt;/p&gt;</code></pre>

      <h3>Inline styles use objects</h3>
      <p><code>style</code> takes a JavaScript object with camelCase keys, which is why you see double braces: the outer pair means "JavaScript here", the inner pair is the object.</p>
      <pre><code>&lt;div style={{ backgroundColor: 'gold', fontSize: 20 }}&gt;...&lt;/div&gt;</code></pre>

      <div class="warn">You can put <em>expressions</em> in braces, not <em>statements</em>. <code>{if (x) ...}</code> or <code>{for (...)}</code> will not compile. Use ternaries, <code>&amp;&amp;</code>, and <code>.map()</code> instead.</div>
      <div class="tip">React escapes values in braces, so <code>{userInput}</code> is shown as text and cannot inject HTML. That protects you from XSS attacks.</div>
    `,
    examples: [
      {
        title: 'Expressions in braces',
        code: `const user = { first: 'Ada', last: 'Lovelace', born: 1815 };

function fullName(u) {
  return u.first + ' ' + u.last;
}

export default function App() {
  const year = new Date().getFullYear();
  return (
    <div>
      <h2>{fullName(user)}</h2>
      <p>Born in {user.born} — that was {year - user.born} years ago.</p>
      <p>Uppercase: {user.first.toUpperCase()}</p>
    </div>
  );
}`,
      },
      {
        title: 'Attributes & styles',
        code: `export default function App() {
  const size = 80;
  const boxStyle = {
    backgroundColor: '#61dafb',
    padding: 12,
    borderRadius: 8,
    color: '#20232a',
  };
  return (
    <div className="card" style={boxStyle}>
      <label htmlFor="nick">Nickname: </label>
      <input id="nick" placeholder="type here" />
      <br />
      <img
        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%2361dafb'/%3E%3C/svg%3E"
        alt="blue square"
        width={size}
        height={size}
        style={{ marginTop: 8, borderRadius: '50%' }}
      />
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Which attribute sets a CSS class in JSX?', options: ['class', 'className', 'cssClass', 'styleClass'], answer: 1, why: '<code>class</code> is a reserved word in JavaScript, so JSX uses <code>className</code>.' },
      { q: 'What can go inside <code>{ }</code> in JSX?', options: ['Any JavaScript expression', 'Only strings', 'if statements and for loops', 'Only variable names'], answer: 0, why: 'Braces accept expressions (things that produce a value). Statements like <code>if</code> and <code>for</code> are not allowed.' },
      { q: 'Why does <code>style={{ color: "red" }}</code> have double braces?', options: ['It is a typo', 'Outer braces = JavaScript, inner braces = an object', 'Double braces mean "important"', 'JSX requires double braces everywhere'], answer: 1, why: 'The <code>style</code> prop takes an object; the outer braces switch into JavaScript.' },
      { q: 'Which is valid JSX?', options: ['<code>&lt;img src="a.png"&gt;</code>', '<code>&lt;img src="a.png" /&gt;</code>', '<code>&lt;img src="a.png"&gt;&lt;img&gt;</code>', 'All of them'], answer: 1, why: 'Every JSX tag must be closed; void elements use a self-closing slash.' },
    ],
    exercise: {
      task: `<p>Build a small "business card". Use the <code>person</code> object to show the name in an <code>h2</code>, the job in a <code>p</code>, and the age next year (age + 1). Give the outer <code>div</code> a border and padding using an inline <code>style</code> object.</p>`,
      starter: `const person = { name: 'Mia', job: 'Designer', age: 29 };

export default function App() {
  // TODO: show name, job, and age next year
  return <div>Card goes here</div>;
}`,
      hint: 'Use {person.name} inside the h2, and {person.age + 1} for next year. style={{ border: "1px solid #ccc", padding: 16 }}.',
      solution: `const person = { name: 'Mia', job: 'Designer', age: 29 };

export default function App() {
  return (
    <div style={{ border: '1px solid #ccc', padding: 16, borderRadius: 8, maxWidth: 260 }}>
      <h2>{person.name}</h2>
      <p>{person.job}</p>
      <p>Next year I will be {person.age + 1}.</p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── components
  {
    id: 'components',
    section: 'Basics',
    title: 'Components',
    explain: `
      <p>A <strong>component</strong> is a JavaScript function that returns JSX. Once defined, you use it like a custom HTML tag: <code>&lt;Greeting /&gt;</code>.</p>
      <pre><code>function Greeting() {
  return &lt;p&gt;Hello!&lt;/p&gt;;
}

export default function App() {
  return (
    &lt;div&gt;
      &lt;Greeting /&gt;
      &lt;Greeting /&gt;
    &lt;/div&gt;
  );
}</code></pre>

      <h3>Rules</h3>
      <ul>
        <li><strong>Names start with a capital letter.</strong> <code>&lt;Greeting /&gt;</code> is a component; <code>&lt;greeting /&gt;</code> is treated as an unknown HTML tag.</li>
        <li><strong>Return JSX</strong> (or <code>null</code> to render nothing).</li>
        <li><strong>Define components at the top level</strong> of a file, never inside another component.</li>
      </ul>

      <h3>Why split into components?</h3>
      <p>Same reason you split code into functions: reuse, readability, and one place to fix bugs. A page might be <code>App</code> → <code>Header</code>, <code>ProductList</code> → many <code>ProductCard</code>s. This nesting is called the <strong>component tree</strong>.</p>

      <h3>Exports</h3>
      <p>In real projects each component often lives in its own file and is exported with <code>export default</code> or <code>export function Name()</code>, then imported where needed. Here we keep everything in one file.</p>

      <div class="warn"><strong>Don't nest component definitions.</strong> Declaring <code>function Child()</code> inside <code>App</code> creates a brand-new component type on every render, so React throws away its state each time. Always declare components at the top level.</div>
    `,
    examples: [
      {
        title: 'Reusing a component',
        code: `function Avatar() {
  return (
    <img
      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60'%3E%3Crect width='60' height='60' fill='%23f4a261'/%3E%3C/svg%3E"
      alt="avatar"
      width={60}
      height={60}
      style={{ borderRadius: '50%', margin: 4 }}
    />
  );
}

function Team() {
  return (
    <section>
      <h2>Our team</h2>
      <Avatar />
      <Avatar />
      <Avatar />
    </section>
  );
}

export default function App() {
  return <Team />;
}`,
      },
      {
        title: 'A small component tree',
        code: `function Header() {
  return <header><h1>My Shop</h1></header>;
}

function Product() {
  return (
    <li style={{ padding: 4 }}>
      A nice product — $10
    </li>
  );
}

function ProductList() {
  return (
    <ul>
      <Product />
      <Product />
    </ul>
  );
}

function Footer() {
  return <footer style={{ color: 'gray' }}>© 2026 My Shop</footer>;
}

export default function App() {
  // App -> Header, ProductList -> Product x2, Footer
  return (
    <div>
      <Header />
      <ProductList />
      <Footer />
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Which name is correct for a React component?', options: ['myButton', 'my-button', 'MyButton', '_mybutton'], answer: 2, why: 'Component names must start with a capital letter so JSX can tell them apart from HTML tags.' },
      { q: 'What does <code>&lt;profile /&gt;</code> (lowercase) do?', options: ['Renders the Profile component', 'React treats it as an HTML tag named "profile"', 'Throws a syntax error', 'Renders nothing silently and correctly'], answer: 1, why: 'Lowercase tags are treated as built-in DOM elements.' },
      { q: 'Where should you define a component?', options: ['Inside another component', 'At the top level of a file', 'Inside a useState call', 'Inside JSX braces'], answer: 1, why: 'Defining components inside others recreates them each render, resetting state and hurting performance.' },
      { q: 'What can a component return to render nothing?', options: ['<code>undefined</code> only', '<code>null</code>', '<code>false</code> is an error', 'An empty string is an error'], answer: 1, why: 'Returning <code>null</code> is the standard way to render nothing.' },
    ],
    exercise: {
      task: `<p>Create a <code>Card</code> component that shows an <code>h3</code> "React" and a <code>p</code> "A library for UIs", inside a bordered <code>div</code>. Render <strong>three</strong> <code>Card</code>s in <code>App</code>.</p>`,
      starter: `// TODO: create a Card component here

export default function App() {
  return (
    <div>
      {/* TODO: render three Cards */}
    </div>
  );
}`,
      hint: 'function Card() { return <div style={{ border: "1px solid #ccc" }}>...</div>; } then write <Card /> three times.',
      solution: `function Card() {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 8, marginBottom: 8 }}>
      <h3>React</h3>
      <p>A library for UIs</p>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Card />
      <Card />
      <Card />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── props
  {
    id: 'props',
    section: 'Basics',
    title: 'Props',
    explain: `
      <p><strong>Props</strong> (short for properties) are how a parent passes data to a child component. They look like HTML attributes, but can hold <em>any</em> JavaScript value: strings, numbers, arrays, objects, even functions.</p>
      <pre><code>&lt;Greeting name="Sam" age={30} /&gt;</code></pre>
      <p>The component receives all props as a single object — usually destructured right in the parameter list:</p>
      <pre><code>function Greeting({ name, age }) {
  return &lt;p&gt;{name} is {age}&lt;/p&gt;;
}</code></pre>

      <h3>Strings vs everything else</h3>
      <p>Strings can use quotes: <code>name="Sam"</code>. Everything else needs braces: <code>age={30}</code>, <code>isAdmin={true}</code>, <code>tags={['a', 'b']}</code>.</p>

      <h3>Default values</h3>
      <p>Use JavaScript default parameters: <code>function Button({ color = 'blue' })</code>. The default is used when the prop is missing (<code>undefined</code>).</p>

      <h3>Props are read-only</h3>
      <p>A component must never change its own props. Think of props like arguments to a function or settings on a remote control that someone else holds: the child reads them, the parent decides them. When a child needs values that change, that's what <strong>state</strong> is for (coming soon).</p>

      <div class="tip">Writing just the prop name, like <code>&lt;Button disabled /&gt;</code>, passes <code>true</code>.</div>
      <div class="warn"><code>age="30"</code> passes the <em>string</em> "30", not the number 30. Use <code>age={30}</code> for numbers.</div>
    `,
    examples: [
      {
        title: 'Passing props',
        code: `function Greeting({ name, emoji = '👋' }) {
  return <p>{emoji} Hello, {name}!</p>;
}

export default function App() {
  return (
    <div>
      <Greeting name="Ada" />
      <Greeting name="Linus" emoji="🐧" />
      <Greeting name="Grace" emoji="🚀" />
    </div>
  );
}`,
      },
      {
        title: 'Objects and numbers as props',
        code: `function ProductCard({ product, quantity }) {
  const total = product.price * quantity;
  return (
    <div style={{ border: '1px solid #ddd', padding: 8, marginBottom: 8, borderRadius: 6 }}>
      <strong>{product.name}</strong>
      <div>{quantity} × \${product.price} = \${total}</div>
    </div>
  );
}

export default function App() {
  const coffee = { name: 'Coffee', price: 4 };
  const bagel = { name: 'Bagel', price: 3 };
  return (
    <div>
      <ProductCard product={coffee} quantity={2} />
      <ProductCard product={bagel} quantity={5} />
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'How do you pass the number 5 as a prop?', options: ['<code>count="5"</code>', '<code>count={5}</code>', '<code>count=(5)</code>', '<code>count=[5]</code>'], answer: 1, why: 'Non-string values go in braces. Quotes would pass the string "5".' },
      { q: 'Can a component modify its own props?', options: ['Yes, any time', 'Only inside event handlers', 'No — props are read-only', 'Only if it is the root component'], answer: 2, why: 'Props belong to the parent. Treat them as read-only; use state for values that change.' },
      { q: 'How do you give a prop a default value?', options: ['<code>Component.default = ...</code>', 'Default parameter in destructuring: <code>{ size = 10 }</code>', 'It is impossible', '<code>useDefault()</code>'], answer: 1, why: 'Standard JavaScript default parameters work and are the recommended way.' },
      { q: 'What does <code>&lt;Toggle on /&gt;</code> pass for <code>on</code>?', options: ['"on"', '<code>undefined</code>', '<code>true</code>', '<code>null</code>'], answer: 2, why: 'A prop without a value defaults to <code>true</code>, just like boolean HTML attributes.' },
    ],
    exercise: {
      task: `<p>Create a <code>Badge</code> component that takes <code>label</code> and <code>color</code> props and renders a <code>span</code> with that background color, white text, and some padding. Give <code>color</code> a default of <code>'gray'</code>. Render three badges: "New" (green), "Sale" (red), and "Default" (no color passed).</p>`,
      starter: `function Badge() {
  // TODO: read label and color from props
  return <span>badge</span>;
}

export default function App() {
  return (
    <div>
      <Badge />
    </div>
  );
}`,
      hint: 'function Badge({ label, color = "gray" }) and style={{ backgroundColor: color, color: "white", padding: "2px 8px" }}.',
      solution: `function Badge({ label, color = 'gray' }) {
  return (
    <span style={{ backgroundColor: color, color: 'white', padding: '2px 8px', borderRadius: 12, marginRight: 6 }}>
      {label}
    </span>
  );
}

export default function App() {
  return (
    <div>
      <Badge label="New" color="green" />
      <Badge label="Sale" color="red" />
      <Badge label="Default" />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── children
  {
    id: 'children',
    section: 'Basics',
    title: 'The children prop',
    explain: `
      <p>Whatever you put <em>between</em> a component's opening and closing tags arrives in a special prop called <strong><code>children</code></strong>.</p>
      <pre><code>&lt;Card&gt;
  &lt;h2&gt;Title&lt;/h2&gt;
  &lt;p&gt;Some text&lt;/p&gt;
&lt;/Card&gt;

function Card({ children }) {
  return &lt;div className="card"&gt;{children}&lt;/div&gt;;
}</code></pre>
      <p>Think of <code>Card</code> as a picture frame: it provides the border and layout, and you decide what picture goes inside. The frame doesn't need to know what the picture is.</p>

      <h3>What can children be?</h3>
      <ul>
        <li>Text: <code>&lt;Button&gt;Save&lt;/Button&gt;</code></li>
        <li>Elements and other components</li>
        <li>A mix of both, or nothing at all (then <code>children</code> is <code>undefined</code>)</li>
      </ul>

      <h3>Why it matters</h3>
      <p>Wrapper components like <code>Card</code>, <code>Modal</code>, <code>Layout</code>, <code>Panel</code> become reusable for any content. This is the heart of <strong>composition</strong> in React.</p>

      <div class="tip">Treat <code>children</code> as opaque: just render <code>{children}</code> where you want it. You rarely need to inspect or loop over it.</div>
    `,
    examples: [
      {
        title: 'A reusable Card wrapper',
        code: `function Card({ children }) {
  return (
    <div style={{
      border: '1px solid #ddd',
      borderRadius: 8,
      padding: 12,
      marginBottom: 10,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    }}>
      {children}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Card>
        <h3>Profile</h3>
        <p>Name: Ada</p>
      </Card>
      <Card>
        <button>I am a button inside a card</button>
      </Card>
      <Card>Just some plain text.</Card>
    </div>
  );
}`,
      },
      {
        title: 'children plus other props',
        code: `function Alert({ type = 'info', children }) {
  const colors = { info: '#e7f1ff', warning: '#fff4e5', error: '#fdecea' };
  const icons = { info: 'ℹ️', warning: '⚠️', error: '⛔' };
  return (
    <div style={{ background: colors[type], padding: 10, borderRadius: 6, marginBottom: 8 }}>
      {icons[type]} {children}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Alert>Your profile was saved.</Alert>
      <Alert type="warning">Your trial ends in <strong>3 days</strong>.</Alert>
      <Alert type="error">Something went wrong.</Alert>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'In <code>&lt;Box&gt;Hi&lt;/Box&gt;</code>, how does Box access "Hi"?', options: ['<code>props.text</code>', '<code>props.children</code>', '<code>props.content</code>', '<code>this.inner</code>'], answer: 1, why: 'Content between tags is passed as the <code>children</code> prop.' },
      { q: 'What is <code>children</code> when a component is used as <code>&lt;Box /&gt;</code>?', options: ['An empty array', 'An empty string', '<code>undefined</code>', 'It throws an error'], answer: 2, why: 'No content between tags means no children prop — it is <code>undefined</code>.' },
      { q: 'Why is the children prop useful?', options: ['It makes components faster', 'It lets wrapper components display any content they are given', 'It is required for every component', 'It replaces state'], answer: 1, why: 'Wrappers like Card or Modal can frame any content without knowing what it is.' },
    ],
    exercise: {
      task: `<p>Create a <code>Panel</code> component that takes a <code>title</code> prop and <code>children</code>. It should render a bordered box with the title in bold at the top and the children below. Use it twice in <code>App</code> with different content.</p>`,
      starter: `function Panel() {
  // TODO: accept title and children
  return <div>panel</div>;
}

export default function App() {
  return (
    <div>
      <Panel />
    </div>
  );
}`,
      hint: 'function Panel({ title, children }) { return <div>...<strong>{title}</strong><div>{children}</div></div>; }',
      solution: `function Panel({ title, children }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, marginBottom: 10 }}>
      <div style={{ background: '#f3f3f3', padding: 8, fontWeight: 'bold' }}>{title}</div>
      <div style={{ padding: 8 }}>{children}</div>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Panel title="About">
        <p>I am learning React.</p>
      </Panel>
      <Panel title="Links">
        <ul>
          <li>react.dev</li>
          <li>MDN</li>
        </ul>
      </Panel>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── conditional-rendering
  {
    id: 'conditional-rendering',
    section: 'Basics',
    title: 'Conditional rendering',
    explain: `
      <p>Often you want to show different things depending on some condition: logged in or not, loading or done, empty list or not. Since JSX is just JavaScript, you use normal JavaScript tools.</p>

      <h3>1. if / early return</h3>
      <p>Outside the JSX, use a regular <code>if</code>:</p>
      <pre><code>if (isLoading) {
  return &lt;p&gt;Loading...&lt;/p&gt;;
}
return &lt;Dashboard /&gt;;</code></pre>

      <h3>2. Ternary <code>? :</code> — "this or that"</h3>
      <pre><code>&lt;p&gt;{isOnline ? 'Online 🟢' : 'Offline 🔴'}&lt;/p&gt;</code></pre>

      <h3>3. <code>&amp;&amp;</code> — "this or nothing"</h3>
      <pre><code>{hasError &amp;&amp; &lt;p&gt;Something went wrong&lt;/p&gt;}</code></pre>
      <p>If the left side is falsy, nothing is shown.</p>

      <h3>4. Return null</h3>
      <p>A component can return <code>null</code> to render nothing at all.</p>

      <div class="warn"><strong>The 0 pitfall:</strong> <code>{count &amp;&amp; &lt;p&gt;You have messages&lt;/p&gt;}</code> renders a literal <strong>0</strong> when count is 0, because React renders numbers. Use <code>{count &gt; 0 &amp;&amp; ...}</code> instead.</div>
      <div class="tip"><code>false</code>, <code>null</code>, <code>undefined</code> and <code>true</code> render nothing in JSX. Numbers (including 0) and strings do render.</div>
    `,
    examples: [
      {
        title: 'if, ternary and &&',
        code: `function Status({ user }) {
  if (!user) {
    return <p>Please log in.</p>;
  }
  return (
    <div>
      <p>Welcome back, {user.name}!</p>
      <p>{user.isAdmin ? 'You are an admin 🔑' : 'Regular user'}</p>
      {user.unread > 0 && <p>📬 You have {user.unread} unread messages</p>}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Status user={null} />
      <hr />
      <Status user={{ name: 'Ada', isAdmin: true, unread: 3 }} />
      <hr />
      <Status user={{ name: 'Bob', isAdmin: false, unread: 0 }} />
    </div>
  );
}`,
      },
      {
        title: 'The 0 pitfall',
        code: `export default function App() {
  const count = 0;
  return (
    <div>
      <p>Buggy version (shows a stray 0):</p>
      <div style={{ border: '1px dashed red', padding: 6 }}>
        {count && <span>You have {count} items</span>}
      </div>
      <p>Fixed version (shows nothing):</p>
      <div style={{ border: '1px dashed green', padding: 6, minHeight: 20 }}>
        {count > 0 && <span>You have {count} items</span>}
      </div>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>{false &amp;&amp; &lt;p&gt;Hi&lt;/p&gt;}</code> render?', options: ['"false"', 'Nothing', '<code>&lt;p&gt;Hi&lt;/p&gt;</code>', 'An error'], answer: 1, why: 'false renders nothing in JSX.' },
      { q: 'What does <code>{0 &amp;&amp; &lt;p&gt;Hi&lt;/p&gt;}</code> render?', options: ['Nothing', 'The paragraph', 'The number 0', 'An error'], answer: 2, why: '<code>0 &amp;&amp; x</code> evaluates to 0, and React renders numbers.' },
      { q: 'Which is best for "show A or B"?', options: ['<code>&amp;&amp;</code>', 'The ternary <code>cond ? A : B</code>', 'A for loop', 'try/catch'], answer: 1, why: 'Ternary chooses between two options; <code>&amp;&amp;</code> is for "A or nothing".' },
      { q: 'How can a component render nothing?', options: ['Return <code>null</code>', 'Throw an error', 'Return <code>"nothing"</code>', 'Call <code>hide()</code>'], answer: 0, why: 'Returning null tells React to render nothing for that component.' },
    ],
    exercise: {
      task: `<p>Finish <code>Weather</code>. It gets a <code>temp</code> prop (number). Show "🥵 Hot!" if temp is 30 or more, otherwise "🙂 Nice". Additionally, only if temp is below 0, show an extra line "🧊 Freezing warning". Render it with temps 35, 20 and -5.</p>`,
      starter: `function Weather({ temp }) {
  // TODO: ternary for Hot/Nice, && for freezing warning
  return <p>{temp}°C</p>;
}

export default function App() {
  return (
    <div>
      <Weather temp={35} />
      <Weather temp={20} />
      <Weather temp={-5} />
    </div>
  );
}`,
      hint: '{temp >= 30 ? "🥵 Hot!" : "🙂 Nice"} and {temp < 0 && <p>🧊 Freezing warning</p>}',
      solution: `function Weather({ temp }) {
  return (
    <div style={{ borderBottom: '1px solid #eee', padding: 6 }}>
      <p>{temp}°C — {temp >= 30 ? '🥵 Hot!' : '🙂 Nice'}</p>
      {temp < 0 && <p>🧊 Freezing warning</p>}
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Weather temp={35} />
      <Weather temp={20} />
      <Weather temp={-5} />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── lists-keys
  {
    id: 'lists-keys',
    section: 'Basics',
    title: 'Lists & keys',
    explain: `
      <p>To show a list, turn an array of data into an array of JSX elements with <code>.map()</code>:</p>
      <pre><code>const items = ['Milk', 'Eggs', 'Bread'];
&lt;ul&gt;
  {items.map(item =&gt; &lt;li key={item}&gt;{item}&lt;/li&gt;)}
&lt;/ul&gt;</code></pre>
      <p>Use <code>.filter()</code> first if you only want some items.</p>

      <h3>What is <code>key</code>?</h3>
      <p>A <strong>key</strong> is a unique, stable ID for each item among its siblings. React uses keys to match items between renders — like name tags at a party. If someone leaves or joins, React knows exactly who is who instead of guessing by position.</p>
      <ul>
        <li>Use IDs from your data: <code>key={user.id}</code>.</li>
        <li>Keys must be unique among siblings, not across the whole app.</li>
        <li>The key goes on the <strong>outermost element returned by map</strong>.</li>
        <li><code>key</code> is not passed to your component as a prop.</li>
      </ul>

      <div class="warn"><strong>Avoid array index as key</strong> when the list can be reordered, filtered or have items inserted. React will attach state (like text typed in an input) to the wrong item. Index is OK only for static lists that never change.</div>
      <div class="warn">Never generate keys on the fly with <code>Math.random()</code> — keys change every render, so React recreates every item.</div>
    `,
    examples: [
      {
        title: 'map + filter with keys',
        code: `const people = [
  { id: 1, name: 'Ada', job: 'engineer' },
  { id: 2, name: 'Grace', job: 'admiral' },
  { id: 3, name: 'Linus', job: 'engineer' },
  { id: 4, name: 'Frida', job: 'painter' },
];

export default function App() {
  const engineers = people.filter(p => p.job === 'engineer');
  return (
    <div>
      <h3>Everyone</h3>
      <ul>
        {people.map(person => (
          <li key={person.id}>
            <strong>{person.name}</strong> — {person.job}
          </li>
        ))}
      </ul>
      <h3>Engineers only</h3>
      <ul>
        {engineers.map(p => <li key={p.id}>{p.name}</li>)}
      </ul>
    </div>
  );
}`,
      },
      {
        title: 'Why index keys break things',
        code: `import { useState } from 'react';

export default function App() {
  const [items, setItems] = useState([
    { id: 'a', label: 'Apple' },
    { id: 'b', label: 'Banana' },
  ]);

  function addToTop() {
    const id = String(Date.now());
    setItems([{ id, label: 'New #' + items.length }, ...items]);
  }

  // Type something in the inputs, then click the button.
  return (
    <div>
      <button onClick={addToTop}>Add item to top</button>
      <div style={{ display: 'flex', gap: 20 }}>
        <div>
          <h4>key=index ❌</h4>
          {items.map((item, i) => (
            <div key={i}>{item.label} <input size={6} /></div>
          ))}
        </div>
        <div>
          <h4>key=id ✅</h4>
          {items.map(item => (
            <div key={item.id}>{item.label} <input size={6} /></div>
          ))}
        </div>
      </div>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Which array method is typically used to render a list?', options: ['<code>forEach</code>', '<code>map</code>', '<code>reduce</code>', '<code>push</code>'], answer: 1, why: '<code>map</code> returns a new array of JSX elements; <code>forEach</code> returns nothing.' },
      { q: 'What makes a good key?', options: ['<code>Math.random()</code>', 'A stable unique ID from the data', 'The same string for all items', 'The current time'], answer: 1, why: 'Keys must be stable and unique among siblings so React can match items between renders.' },
      { q: 'Where does the <code>key</code> go?', options: ['On the parent ul', 'On the outermost element returned inside map', 'On any child element', 'In the component name'], answer: 1, why: 'React reads the key from the elements directly in the array.' },
      { q: 'When is using the index as key risky?', options: ['Never', 'When items can be reordered, inserted or removed', 'Only in production', 'When the list has more than 10 items'], answer: 1, why: 'Positions shift, so state gets attached to the wrong item.' },
      { q: 'Can a child component read <code>props.key</code>?', options: ['Yes', 'No — key is used by React and not passed as a prop', 'Only in strict mode', 'Only if it is a number'], answer: 1, why: 'Pass the ID as a separate prop (e.g. <code>id</code>) if the child needs it.' },
    ],
    exercise: {
      task: `<p>Render the <code>todos</code> as a list. Each item should show its text, with a ✅ if done or ⬜ if not. Below the list, show a second list containing <strong>only the unfinished</strong> todos. Use <code>id</code> as the key.</p>`,
      starter: `const todos = [
  { id: 1, text: 'Learn JSX', done: true },
  { id: 2, text: 'Learn props', done: true },
  { id: 3, text: 'Learn state', done: false },
  { id: 4, text: 'Build an app', done: false },
];

export default function App() {
  // TODO: map todos, then filter + map unfinished ones
  return <ul></ul>;
}`,
      hint: 'todos.map(t => <li key={t.id}>{t.done ? "✅" : "⬜"} {t.text}</li>) and todos.filter(t => !t.done).map(...)',
      solution: `const todos = [
  { id: 1, text: 'Learn JSX', done: true },
  { id: 2, text: 'Learn props', done: true },
  { id: 3, text: 'Learn state', done: false },
  { id: 4, text: 'Build an app', done: false },
];

export default function App() {
  const unfinished = todos.filter(t => !t.done);
  return (
    <div>
      <h3>All todos</h3>
      <ul>
        {todos.map(t => (
          <li key={t.id}>{t.done ? '✅' : '⬜'} {t.text}</li>
        ))}
      </ul>
      <h3>Still to do ({unfinished.length})</h3>
      <ul>
        {unfinished.map(t => <li key={t.id}>{t.text}</li>)}
      </ul>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── events
  {
    id: 'events',
    section: 'Basics',
    title: 'Handling events',
    explain: `
      <p>To respond to clicks, typing, hovering and so on, pass a function to an event prop like <code>onClick</code>, <code>onChange</code>, <code>onMouseEnter</code> or <code>onSubmit</code>.</p>
      <pre><code>function handleClick() {
  alert('Clicked!');
}
&lt;button onClick={handleClick}&gt;Click me&lt;/button&gt;</code></pre>

      <h3>Pass the function, don't call it</h3>
      <ul>
        <li>✅ <code>onClick={handleClick}</code> — passes the function; React calls it on click.</li>
        <li>❌ <code>onClick={handleClick()}</code> — calls it immediately <em>during render</em>, every render.</li>
        <li>✅ <code>onClick={() =&gt; greet('Ada')}</code> — wrap in an arrow function when you need arguments.</li>
      </ul>

      <h3>The event object</h3>
      <p>Handlers receive an event object <code>e</code>. Common uses: <code>e.target.value</code> (what was typed), <code>e.preventDefault()</code> (stop a form from reloading the page), <code>e.stopPropagation()</code> (stop the event bubbling to parent handlers).</p>

      <h3>Passing handlers as props</h3>
      <p>A parent can pass a function to a child, e.g. <code>&lt;Button onPress={save} /&gt;</code>. By convention handler props are named <code>onSomething</code> and handler functions <code>handleSomething</code>.</p>

      <div class="tip">Events <strong>bubble</strong>: a click on a button inside a div also triggers the div's <code>onClick</code> (after the button's). Try it in the second example.</div>
    `,
    examples: [
      {
        title: 'Click, type, hover',
        code: `export default function App() {
  function handleClick() {
    console.log('Button clicked');
  }

  function handleChange(e) {
    console.log('You typed:', e.target.value);
  }

  return (
    <div>
      <button onClick={handleClick}>Click me</button>
      <button onClick={() => console.log('Hi from an inline arrow')}>Inline</button>
      <p>
        <input placeholder="Type something" onChange={handleChange} />
      </p>
      <p
        onMouseEnter={() => console.log('mouse entered')}
        style={{ background: '#eef', padding: 8 }}
      >
        Hover over me
      </p>
    </div>
  );
}`,
      },
      {
        title: 'Arguments, props & bubbling',
        code: `function ColorButton({ color, onPick }) {
  return (
    <button onClick={() => onPick(color)} style={{ color }}>
      {color}
    </button>
  );
}

export default function App() {
  function handlePick(color) {
    console.log('Picked:', color);
  }

  return (
    <div
      onClick={() => console.log('...the div heard the click too (bubbling)')}
      style={{ border: '1px solid #ccc', padding: 10 }}
    >
      <ColorButton color="red" onPick={handlePick} />
      <ColorButton color="green" onPick={handlePick} />
      <button onClick={e => { e.stopPropagation(); console.log('Stopped! Div will not hear this.'); }}>
        stopPropagation
      </button>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Which correctly attaches a click handler?', options: ['<code>onclick="handle()"</code>', '<code>onClick={handle()}</code>', '<code>onClick={handle}</code>', '<code>click={handle}</code>'], answer: 2, why: 'Pass the function itself. <code>handle()</code> would call it during render.' },
      { q: 'How do you pass an argument to a handler?', options: ['<code>onClick={remove(id)}</code>', '<code>onClick={() =&gt; remove(id)}</code>', '<code>onClick="remove(id)"</code>', '<code>onClick={remove, id}</code>'], answer: 1, why: 'Wrap it in an arrow function so it runs only on click.' },
      { q: 'How do you read what the user typed in an input?', options: ['<code>e.value</code>', '<code>e.target.value</code>', '<code>input.text</code>', '<code>e.key.value</code>'], answer: 1, why: '<code>e.target</code> is the input element; <code>.value</code> is its current text.' },
      { q: 'What does <code>e.preventDefault()</code> do on a form submit?', options: ['Stops the browser from reloading the page', 'Clears the form', 'Stops bubbling', 'Disables the button'], answer: 0, why: 'It cancels the browser’s default action — for forms, a full page navigation.' },
    ],
    exercise: {
      task: `<p>Create a <code>Greeter</code> component with three buttons: "Ada", "Grace", "Linus". Clicking a button should <code>console.log</code> "Hello, NAME!". Use a single handler function that takes the name as an argument.</p>`,
      starter: `export default function App() {
  // TODO: write greet(name) and attach it to three buttons
  return (
    <div>
      <button>Ada</button>
    </div>
  );
}`,
      hint: "function greet(name) { console.log('Hello, ' + name + '!'); } then onClick={() => greet('Ada')}",
      solution: `export default function App() {
  function greet(name) {
    console.log('Hello, ' + name + '!');
  }

  return (
    <div>
      <button onClick={() => greet('Ada')}>Ada</button>
      <button onClick={() => greet('Grace')}>Grace</button>
      <button onClick={() => greet('Linus')}>Linus</button>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── state-intro
  {
    id: 'state-intro',
    section: 'Basics',
    title: 'State with useState',
    explain: `
      <p>So far our components only show fixed data. <strong>State</strong> is a component's memory: values that change over time because of user interaction — a counter, the text in a box, whether a menu is open.</p>

      <h3>Why not a normal variable?</h3>
      <p>A regular <code>let count = 0</code> has two problems: it resets every time the component runs, and changing it does <strong>not</strong> tell React to update the screen.</p>

      <h3>useState</h3>
      <pre><code>import { useState } from 'react';

function Counter() {
  const [count, setCount] = useState(0);
  return &lt;button onClick={() =&gt; setCount(count + 1)}&gt;{count}&lt;/button&gt;;
}</code></pre>
      <ul>
        <li><code>useState(0)</code> — 0 is the <strong>initial</strong> value (used only on the first render).</li>
        <li>It returns a pair: the current value and a <strong>setter</strong> function.</li>
        <li>Calling the setter stores the new value and asks React to <strong>re-render</strong> the component.</li>
      </ul>

      <h3>State is a snapshot</h3>
      <p>Within one render, <code>count</code> is a fixed value. <code>setCount(count + 1)</code> doesn't change <code>count</code> right away — it schedules the next render, where <code>count</code> will be the new value. To update based on the previous value several times in a row, use an <strong>updater function</strong>: <code>setCount(c =&gt; c + 1)</code>.</p>

      <h3>Each component instance has its own state</h3>
      <p>Render <code>&lt;Counter /&gt;</code> twice and each one counts separately.</p>

      <div class="warn"><strong>Rules of Hooks:</strong> call <code>useState</code> (and any <code>use...</code> hook) only at the top level of a component — never inside <code>if</code>, loops, or nested functions.</div>
      <div class="warn">Never change state directly (<code>count = 5</code> or <code>user.name = 'x'</code>). Always call the setter with a new value. For objects/arrays, create a new copy: <code>setUser({ ...user, name: 'x' })</code>.</div>
    `,
    examples: [
      {
        title: 'Counter',
        code: `import { useState } from 'react';

function Counter({ label }) {
  const [count, setCount] = useState(0);
  console.log(label, 'rendered with count =', count);
  return (
    <div style={{ marginBottom: 8 }}>
      {label}: <strong>{count}</strong>{' '}
      <button onClick={() => setCount(count + 1)}>+1</button>
      <button onClick={() => setCount(count - 1)}>-1</button>
      <button onClick={() => setCount(0)}>reset</button>
    </div>
  );
}

export default function App() {
  // Two instances = two separate pieces of state
  return (
    <div>
      <Counter label="Apples" />
      <Counter label="Oranges" />
    </div>
  );
}`,
      },
      {
        title: 'Snapshot vs updater function',
        code: `import { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);

  function plusThreeWrong() {
    // count is the SAME snapshot value in all three lines
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
    console.log('count right after setting is still', count);
  }

  function plusThreeRight() {
    // each updater gets the latest pending value
    setCount(c => c + 1);
    setCount(c => c + 1);
    setCount(c => c + 1);
  }

  return (
    <div>
      <h2>{count}</h2>
      <button onClick={plusThreeWrong}>+3 (wrong: adds 1)</button>
      <button onClick={plusThreeRight}>+3 (right)</button>
    </div>
  );
}`,
      },
      {
        title: 'Toggle with a boolean',
        code: `import { useState } from 'react';

export default function App() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setIsOpen(o => !o)}>
        {isOpen ? 'Hide' : 'Show'} details
      </button>
      {isOpen && <p>🎉 Surprise! These are the details.</p>}
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does <code>useState(10)</code> return?', options: ['Just the number 10', 'An array: [current value, setter function]', 'An object with get and set', 'A promise'], answer: 1, why: 'useState returns a pair, usually destructured as <code>const [value, setValue]</code>.' },
      { q: 'Why doesn’t a normal <code>let</code> variable work for a counter?', options: ['let is not allowed in components', 'Changing it does not trigger a re-render and it resets each render', 'It works fine', 'It is too slow'], answer: 1, why: 'Only state setters tell React to re-render, and state persists between renders.' },
      { q: 'Starting at 0, what is count after one click on a button that runs <code>setCount(count + 1)</code> three times?', options: ['0', '1', '3', 'Error'], answer: 1, why: 'Each call uses the same snapshot (0), so all three set it to 1. Use <code>c =&gt; c + 1</code> to get 3.' },
      { q: 'Where may you call <code>useState</code>?', options: ['Inside an if statement', 'Inside a loop', 'At the top level of a component', 'Inside an event handler'], answer: 2, why: 'Hooks must be called in the same order every render, so only at the top level.' },
      { q: 'If you render <code>&lt;Counter /&gt;</code> twice, the two counters…', options: ['Share one count', 'Each have their own count', 'Cause an error', 'Only the first works'], answer: 1, why: 'State belongs to each component instance.' },
    ],
    exercise: {
      task: `<p>Build a "like" button. It shows "🤍 Like" when not liked and "❤️ Liked" when liked, and toggles on click. Next to it, show a like count that goes up by 1 when you like and down by 1 when you unlike (start at 41).</p>`,
      starter: `import { useState } from 'react';

export default function App() {
  // TODO: two pieces of state: liked (boolean) and likes (number)
  return (
    <div>
      <button>🤍 Like</button> 41 likes
    </div>
  );
}`,
      hint: 'In the click handler: if liked, setLikes(l => l - 1) else setLikes(l => l + 1); then setLiked(!liked).',
      solution: `import { useState } from 'react';

export default function App() {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(41);

  function handleClick() {
    if (liked) {
      setLikes(l => l - 1);
    } else {
      setLikes(l => l + 1);
    }
    setLiked(!liked);
  }

  return (
    <div>
      <button onClick={handleClick}>{liked ? '❤️ Liked' : '🤍 Like'}</button> {likes} likes
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── forms
  {
    id: 'forms',
    section: 'Basics',
    title: 'Forms & controlled inputs',
    explain: `
      <p>In a <strong>controlled input</strong>, React state is the single source of truth for the input's value. You pass <code>value</code> from state and update state in <code>onChange</code>:</p>
      <pre><code>const [name, setName] = useState('');
&lt;input value={name} onChange={e =&gt; setName(e.target.value)} /&gt;</code></pre>
      <p>Every keystroke → <code>onChange</code> → <code>setName</code> → re-render → input shows the new value. Because the value lives in state, you can easily validate it, transform it (e.g. uppercase), or show it elsewhere.</p>

      <h3>Different input types</h3>
      <ul>
        <li>Text, <code>&lt;textarea&gt;</code>, <code>&lt;select&gt;</code>: use <code>value</code> + <code>e.target.value</code>.</li>
        <li>Checkbox: use <code>checked</code> + <code>e.target.checked</code>.</li>
        <li>Number inputs still give you a <em>string</em> in <code>e.target.value</code> — convert with <code>Number(...)</code>.</li>
      </ul>

      <h3>Submitting</h3>
      <p>Handle <code>onSubmit</code> on the <code>&lt;form&gt;</code> and call <code>e.preventDefault()</code> so the browser doesn't reload the page. This also makes pressing Enter submit the form.</p>

      <div class="warn">If you set <code>value</code> but forget <code>onChange</code>, the input becomes <strong>read-only</strong> — typing does nothing, and React warns in the console.</div>
      <div class="tip">React 19 also lets you pass a function to <code>&lt;form action={fn}&gt;</code> which receives <code>FormData</code> (uncontrolled forms). You'll meet Actions later; controlled inputs are the foundation.</div>
    `,
    examples: [
      {
        title: 'Controlled text input',
        code: `import { useState } from 'react';

export default function App() {
  const [name, setName] = useState('');
  return (
    <div>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Your name"
      />
      <p>Hello, {name || 'stranger'}!</p>
      <p>Length: {name.length} {name.length > 10 && '⚠️ That is long!'}</p>
      <button onClick={() => setName('')}>Clear</button>
    </div>
  );
}`,
      },
      {
        title: 'A full form',
        code: `import { useState } from 'react';

export default function App() {
  const [email, setEmail] = useState('');
  const [plan, setPlan] = useState('free');
  const [agree, setAgree] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    console.log('Submitted:', { email, plan, agree });
  }

  const canSubmit = email.includes('@') && agree;

  return (
    <form onSubmit={handleSubmit}>
      <p>
        <label>Email: <input type="email" value={email} onChange={e => setEmail(e.target.value)} /></label>
      </p>
      <p>
        <label>Plan:{' '}
          <select value={plan} onChange={e => setPlan(e.target.value)}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="team">Team</option>
          </select>
        </label>
      </p>
      <p>
        <label>
          <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
          I agree to the terms
        </label>
      </p>
      <button type="submit" disabled={!canSubmit}>Sign up</button>
    </form>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What makes an input "controlled"?', options: ['It has an id', 'Its value comes from React state and updates via onChange', 'It is inside a form', 'It uses a ref'], answer: 1, why: 'State drives the value, and onChange updates the state.' },
      { q: 'For a checkbox, which property holds its on/off state?', options: ['<code>e.target.value</code>', '<code>e.target.checked</code>', '<code>e.target.on</code>', '<code>e.checked</code>'], answer: 1, why: 'Checkboxes use <code>checked</code>, not <code>value</code>.' },
      { q: 'What happens with <code>&lt;input value={name} /&gt;</code> and no onChange?', options: ['Works normally', 'Input is effectively read-only', 'The page crashes', 'Value is ignored'], answer: 1, why: 'React keeps forcing the value from state, which never changes.' },
      { q: 'Why call <code>e.preventDefault()</code> in onSubmit?', options: ['To stop the page from reloading', 'To clear the inputs', 'To validate the form', 'It is required by React'], answer: 0, why: 'The browser’s default form submit navigates/reloads the page.' },
    ],
    exercise: {
      task: `<p>Build a tiny tip calculator. Two controlled inputs: <strong>bill</strong> (number) and <strong>tip %</strong> (a select with 10, 15, 20). Show the tip amount and the total, rounded to 2 decimals with <code>toFixed(2)</code>.</p>`,
      starter: `import { useState } from 'react';

export default function App() {
  // TODO: state for bill and tip percent
  return (
    <div>
      <input type="number" placeholder="Bill" />
      <p>Tip: 0.00</p>
      <p>Total: 0.00</p>
    </div>
  );
}`,
      hint: 'Keep bill as a string in state, convert with Number(bill) for math. tip = Number(bill) * Number(percent) / 100.',
      solution: `import { useState } from 'react';

export default function App() {
  const [bill, setBill] = useState('');
  const [percent, setPercent] = useState('15');

  const tip = (Number(bill) || 0) * Number(percent) / 100;
  const total = (Number(bill) || 0) + tip;

  return (
    <div>
      <p>
        <input type="number" placeholder="Bill" value={bill} onChange={e => setBill(e.target.value)} />
      </p>
      <p>
        Tip:{' '}
        <select value={percent} onChange={e => setPercent(e.target.value)}>
          <option value="10">10%</option>
          <option value="15">15%</option>
          <option value="20">20%</option>
        </select>
      </p>
      <p>Tip: {tip.toFixed(2)}</p>
      <p><strong>Total: {total.toFixed(2)}</strong></p>
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── lifting-state
  {
    id: 'lifting-state',
    section: 'Basics',
    title: 'Lifting state up',
    explain: `
      <p>Sometimes two components need to share the same data. Siblings can't read each other's state. The solution: <strong>move ("lift") the state up</strong> to their closest common parent, then pass it down as props.</p>

      <h3>The pattern</h3>
      <ol>
        <li>Remove the state from the children.</li>
        <li>Put it in the common parent.</li>
        <li>Pass the <strong>value</strong> down as a prop, and a <strong>function to change it</strong> as another prop (like <code>onChange</code>).</li>
      </ol>
      <pre><code>function Parent() {
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    &lt;&gt;
      &lt;Panel isActive={activeIndex === 0} onShow={() =&gt; setActiveIndex(0)} /&gt;
      &lt;Panel isActive={activeIndex === 1} onShow={() =&gt; setActiveIndex(1)} /&gt;
    &lt;/&gt;
  );
}</code></pre>

      <h3>Data flows down, events flow up</h3>
      <p>Props flow <strong>down</strong> from parent to child. When a child wants to change something, it calls a function the parent gave it — the event flows <strong>up</strong>. The parent updates its state, and new props flow down again.</p>

      <div class="tip">Ask: "which component <em>owns</em> this data?" Keep state as low as possible, but high enough that every component that needs it can get it.</div>
      <div class="warn">Avoid copying props into state (<code>useState(props.value)</code>) to "sync" them — the copy won't update when the prop changes. Use the prop directly.</div>
    `,
    examples: [
      {
        title: 'Accordion: only one open at a time',
        code: `import { useState } from 'react';

function Panel({ title, isActive, onShow, children }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 6, padding: 8, marginBottom: 6 }}>
      <strong>{title}</strong>{' '}
      {isActive ? (
        <p>{children}</p>
      ) : (
        <button onClick={onShow}>Show</button>
      )}
    </div>
  );
}

export default function App() {
  // State lives in the parent so panels can coordinate
  const [activeIndex, setActiveIndex] = useState(0);
  return (
    <div>
      <Panel title="About" isActive={activeIndex === 0} onShow={() => setActiveIndex(0)}>
        React is a library for building UIs.
      </Panel>
      <Panel title="Etymology" isActive={activeIndex === 1} onShow={() => setActiveIndex(1)}>
        It "reacts" to changes in data.
      </Panel>
    </div>
  );
}`,
      },
      {
        title: 'Shared value in two inputs',
        code: `import { useState } from 'react';

function TemperatureInput({ label, value, onChange }) {
  return (
    <p>
      <label>{label}: <input type="number" value={value} onChange={e => onChange(e.target.value)} /></label>
    </p>
  );
}

export default function App() {
  const [celsius, setCelsius] = useState('20');

  const fahrenheit = celsius === '' ? '' : String(Math.round(Number(celsius) * 9 / 5 + 32));

  function handleFahrenheit(f) {
    setCelsius(f === '' ? '' : String(Math.round((Number(f) - 32) * 5 / 9)));
  }

  return (
    <div>
      <TemperatureInput label="Celsius" value={celsius} onChange={setCelsius} />
      <TemperatureInput label="Fahrenheit" value={fahrenheit} onChange={handleFahrenheit} />
      <p>{Number(celsius) >= 100 ? '💨 Water boils' : '💧 Water does not boil'}</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'Two sibling components need the same state. What do you do?', options: ['Duplicate the state in both', 'Lift it to their closest common parent', 'Use a global variable', 'It is impossible'], answer: 1, why: 'The shared parent owns the state and passes it down as props.' },
      { q: 'How does a child ask the parent to change lifted state?', options: ['It edits its props', 'It calls a function the parent passed as a prop', 'It calls the parent’s useState', 'It re-renders itself'], answer: 1, why: 'The parent passes a callback like <code>onChange</code>; the child calls it.' },
      { q: 'In React, data generally flows…', options: ['Up from children to parents', 'Down from parents to children via props', 'Sideways between siblings', 'Randomly'], answer: 1, why: 'One-way data flow: props go down, events go up via callbacks.' },
    ],
    exercise: {
      task: `<p>There are two components: <code>Search</code> (an input) and <code>Results</code> (a filtered list). Lift the search text into <code>App</code> so typing in <code>Search</code> filters the fruits shown by <code>Results</code> (case-insensitive).</p>`,
      starter: `import { useState } from 'react';

const fruits = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Pineapple'];

function Search() {
  const [text, setText] = useState(''); // TODO: move this up to App
  return <input value={text} onChange={e => setText(e.target.value)} placeholder="Search fruit" />;
}

function Results() {
  // TODO: receive the query as a prop and filter
  return (
    <ul>
      {fruits.map(f => <li key={f}>{f}</li>)}
    </ul>
  );
}

export default function App() {
  return (
    <div>
      <Search />
      <Results />
    </div>
  );
}`,
      hint: 'In App: const [query, setQuery] = useState(""). Pass <Search value={query} onChange={setQuery} /> and <Results query={query} />. Filter with f.toLowerCase().includes(query.toLowerCase()).',
      solution: `import { useState } from 'react';

const fruits = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Pineapple'];

function Search({ value, onChange }) {
  return <input value={value} onChange={e => onChange(e.target.value)} placeholder="Search fruit" />;
}

function Results({ query }) {
  const matches = fruits.filter(f => f.toLowerCase().includes(query.toLowerCase()));
  if (matches.length === 0) return <p>No fruit found.</p>;
  return (
    <ul>
      {matches.map(f => <li key={f}>{f}</li>)}
    </ul>
  );
}

export default function App() {
  const [query, setQuery] = useState('');
  return (
    <div>
      <Search value={query} onChange={setQuery} />
      <Results query={query} />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── composition
  {
    id: 'composition',
    section: 'Basics',
    title: 'Composition',
    explain: `
      <p><strong>Composition</strong> means building complex UIs by combining simple components, instead of making one giant component with lots of options. React strongly prefers composition over inheritance — you will basically never use <code>class X extends Y</code> to share UI.</p>

      <h3>Tool 1: children</h3>
      <p>Generic containers (<code>Card</code>, <code>Modal</code>, <code>Layout</code>) render whatever you put inside them via <code>children</code>.</p>

      <h3>Tool 2: "slots" via props</h3>
      <p>When a component has several holes to fill, pass JSX in named props:</p>
      <pre><code>&lt;PageLayout
  sidebar={&lt;Menu /&gt;}
  header={&lt;h1&gt;Dashboard&lt;/h1&gt;}
&gt;
  &lt;Stats /&gt;
&lt;/PageLayout&gt;</code></pre>

      <h3>Tool 3: specialization</h3>
      <p>Make a specific component by rendering a generic one with certain props: <code>DangerButton</code> is just <code>&lt;Button color="red" {...props} /&gt;</code>.</p>

      <h3>Why it matters</h3>
      <ul>
        <li>Components stay small and focused.</li>
        <li>Fewer "boolean prop explosions" (<code>showIcon</code>, <code>hasFooter</code>, <code>isCompact</code>…).</li>
        <li>Composition can also avoid "prop drilling": a parent can render a child with its data already filled in, instead of passing data through layers that don't use it.</li>
      </ul>
      <div class="tip"><code>{...props}</code> (spread) forwards all remaining props to another component. Handy for wrappers, but use it deliberately.</div>
    `,
    examples: [
      {
        title: 'Slots with props',
        code: `function Layout({ header, sidebar, children }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ background: '#20232a', color: '#61dafb', padding: 8 }}>{header}</div>
      <div style={{ display: 'flex' }}>
        <aside style={{ background: '#f4f4f4', padding: 8, width: 100 }}>{sidebar}</aside>
        <main style={{ padding: 8, flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Layout
      header={<strong>My Dashboard</strong>}
      sidebar={
        <ul style={{ margin: 0, paddingLeft: 16 }}>
          <li>Home</li>
          <li>Stats</li>
        </ul>
      }
    >
      <p>Main content goes here. Layout does not know or care what it is.</p>
    </Layout>
  );
}`,
      },
      {
        title: 'Specialization',
        code: `function Button({ color = '#61dafb', children, ...rest }) {
  return (
    <button
      style={{ background: color, color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, margin: 4 }}
      {...rest}
    >
      {children}
    </button>
  );
}

function DangerButton(props) {
  return <Button color="crimson" {...props} />;
}

function SuccessButton(props) {
  return <Button color="seagreen" {...props} />;
}

export default function App() {
  return (
    <div>
      <Button onClick={() => console.log('default')}>Default</Button>
      <DangerButton onClick={() => console.log('deleted!')}>Delete</DangerButton>
      <SuccessButton onClick={() => console.log('saved!')}>Save</SuccessButton>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'How does React recommend reusing UI between components?', options: ['Class inheritance', 'Composition (children, props, wrapping)', 'Copy-paste', 'Global CSS only'], answer: 1, why: 'React favors composition; inheritance hierarchies for components are not recommended.' },
      { q: 'Can you pass JSX as a regular prop, like <code>icon={&lt;Star /&gt;}</code>?', options: ['No, only children can hold JSX', 'Yes — JSX is just a value', 'Only strings are allowed', 'Only inside a Fragment'], answer: 1, why: 'JSX elements are ordinary JavaScript values and can be passed in any prop.' },
      { q: 'What does <code>{...rest}</code> do in <code>&lt;button {...rest}&gt;</code>?', options: ['Nothing', 'Spreads all remaining props onto the button', 'Removes all props', 'Creates a loop'], answer: 1, why: 'The spread syntax forwards every property of the object as a prop.' },
    ],
    exercise: {
      task: `<p>Create a <code>Dialog</code> component with a <code>title</code> slot, a <code>footer</code> slot, and <code>children</code> for the body. Then create a <code>ConfirmDialog</code> that uses <code>Dialog</code> with "OK" and "Cancel" buttons in the footer (each logs its name to the console). Render <code>ConfirmDialog</code> with the message "Delete this file?".</p>`,
      starter: `function Dialog() {
  // TODO: title, footer, children
  return <div>dialog</div>;
}

function ConfirmDialog() {
  // TODO: use Dialog with OK/Cancel buttons in footer
  return <Dialog />;
}

export default function App() {
  return <ConfirmDialog />;
}`,
      hint: 'ConfirmDialog({ message }) returns <Dialog title="Are you sure?" footer={<><button>OK</button><button>Cancel</button></>}>{message}</Dialog>.',
      solution: `function Dialog({ title, footer, children }) {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, maxWidth: 300 }}>
      <div style={{ padding: 8, fontWeight: 'bold', borderBottom: '1px solid #eee' }}>{title}</div>
      <div style={{ padding: 8 }}>{children}</div>
      <div style={{ padding: 8, borderTop: '1px solid #eee', textAlign: 'right' }}>{footer}</div>
    </div>
  );
}

function ConfirmDialog({ message }) {
  return (
    <Dialog
      title="Are you sure?"
      footer={
        <>
          <button onClick={() => console.log('OK')}>OK</button>
          <button onClick={() => console.log('Cancel')}>Cancel</button>
        </>
      }
    >
      {message}
    </Dialog>
  );
}

export default function App() {
  return <ConfirmDialog message="Delete this file?" />;
}`,
    },
  },

  // ───────────────────────────────────────────── fragments
  {
    id: 'fragments',
    section: 'Basics',
    title: 'Fragments',
    explain: `
      <p>A component must return a single root element. But wrapping everything in a <code>&lt;div&gt;</code> adds extra nodes to the page, which can break layouts (flexbox, grid) or produce invalid HTML (e.g. a <code>div</code> inside a <code>tr</code>).</p>
      <p>A <strong>Fragment</strong> groups elements <em>without</em> adding anything to the DOM:</p>
      <pre><code>return (
  &lt;&gt;
    &lt;h1&gt;Title&lt;/h1&gt;
    &lt;p&gt;Text&lt;/p&gt;
  &lt;/&gt;
);</code></pre>

      <h3>Short vs long syntax</h3>
      <ul>
        <li><code>&lt;&gt;...&lt;/&gt;</code> — short syntax, most common.</li>
        <li><code>&lt;Fragment&gt;...&lt;/Fragment&gt;</code> — import <code>Fragment</code> from <code>'react'</code>. Needed when you must pass a <code>key</code>, e.g. when mapping a list that renders several elements per item.</li>
      </ul>
      <pre><code>{items.map(item =&gt; (
  &lt;Fragment key={item.id}&gt;
    &lt;dt&gt;{item.term}&lt;/dt&gt;
    &lt;dd&gt;{item.meaning}&lt;/dd&gt;
  &lt;/Fragment&gt;
))}</code></pre>

      <div class="warn">The short syntax <code>&lt;&gt;</code> cannot take a <code>key</code> or any other attribute. Use <code>&lt;Fragment key={...}&gt;</code> for that.</div>
    `,
    examples: [
      {
        title: 'Fragments keep tables valid',
        code: `function Columns() {
  // A div here would produce invalid HTML inside <tr>
  return (
    <>
      <td style={{ border: '1px solid #ccc', padding: 4 }}>Ada</td>
      <td style={{ border: '1px solid #ccc', padding: 4 }}>Engineer</td>
    </>
  );
}

export default function App() {
  return (
    <table style={{ borderCollapse: 'collapse' }}>
      <tbody>
        <tr>
          <Columns />
        </tr>
      </tbody>
    </table>
  );
}`,
      },
      {
        title: 'Keyed Fragment in a list',
        code: `import { Fragment } from 'react';

const glossary = [
  { id: 1, term: 'JSX', meaning: 'HTML-like syntax inside JavaScript' },
  { id: 2, term: 'Props', meaning: 'Inputs passed from parent to child' },
  { id: 3, term: 'State', meaning: 'A component\\'s memory' },
];

export default function App() {
  return (
    <dl>
      {glossary.map(item => (
        <Fragment key={item.id}>
          <dt style={{ fontWeight: 'bold' }}>{item.term}</dt>
          <dd style={{ marginBottom: 6 }}>{item.meaning}</dd>
        </Fragment>
      ))}
    </dl>
  );
}`,
      },
    ],
    quiz: [
      { q: 'What does a Fragment add to the DOM?', options: ['A div', 'A span', 'Nothing', 'A comment node'], answer: 2, why: 'Fragments group children without rendering a wrapper element.' },
      { q: 'Which syntax lets you add a <code>key</code>?', options: ['<code>&lt;&gt;</code>', '<code>&lt;Fragment key={id}&gt;</code>', 'Both', 'Neither'], answer: 1, why: 'The short syntax accepts no attributes; use the explicit Fragment.' },
      { q: 'Why might a wrapping div be a problem?', options: ['Divs are deprecated', 'It can break flex/grid layouts or create invalid HTML like div inside tr', 'Divs are slow to type', 'React forbids divs'], answer: 1, why: 'Extra wrappers change the DOM structure that CSS and HTML rules depend on.' },
    ],
    exercise: {
      task: `<p>The <code>NameCells</code> component currently wraps its two <code>&lt;td&gt;</code>s in a <code>div</code>, which is invalid inside a table row. Fix it with a Fragment. Then render one row per person in <code>people</code> (use the id as the row key).</p>`,
      starter: `const people = [
  { id: 1, first: 'Ada', last: 'Lovelace' },
  { id: 2, first: 'Alan', last: 'Turing' },
];

function NameCells({ first, last }) {
  // TODO: replace the div with a Fragment
  return (
    <div>
      <td>{first}</td>
      <td>{last}</td>
    </div>
  );
}

export default function App() {
  return (
    <table>
      <tbody>
        {/* TODO: one <tr> per person */}
      </tbody>
    </table>
  );
}`,
      hint: 'Use <>...</> in NameCells. In App: people.map(p => <tr key={p.id}><NameCells first={p.first} last={p.last} /></tr>)',
      solution: `const people = [
  { id: 1, first: 'Ada', last: 'Lovelace' },
  { id: 2, first: 'Alan', last: 'Turing' },
];

function NameCells({ first, last }) {
  return (
    <>
      <td style={{ padding: 4 }}>{first}</td>
      <td style={{ padding: 4 }}>{last}</td>
    </>
  );
}

export default function App() {
  return (
    <table>
      <tbody>
        {people.map(p => (
          <tr key={p.id}>
            <NameCells first={p.first} last={p.last} />
          </tr>
        ))}
      </tbody>
    </table>
  );
}`,
    },
  },

  // ───────────────────────────────────────────── rendering-purity
  {
    id: 'rendering-purity',
    section: 'Basics',
    title: 'Rendering & purity',
    explain: `
      <p>How does React actually get your UI on screen? Think of a restaurant: components are cooks, React is the waiter.</p>
      <ol>
        <li><strong>Trigger</strong> — something asks for a render: the first load, or a state setter being called.</li>
        <li><strong>Render</strong> — React <em>calls your component functions</em> to find out what the UI should be. "Rendering" means calling the function, not touching the screen.</li>
        <li><strong>Commit</strong> — React compares the result with the previous one and updates only the DOM nodes that actually changed.</li>
      </ol>
      <p>When a component re-renders, its children re-render too (by default). That's fine — React is fast, and only real differences reach the DOM.</p>

      <h3>Components must be pure</h3>
      <p>A <strong>pure</strong> function, like a math formula, always gives the same output for the same input and doesn't change anything outside itself. React expects your component body to be pure:</p>
      <ul>
        <li>Same props + state → same JSX.</li>
        <li>Don't modify variables or objects that existed before the render (globals, props, state).</li>
        <li>Creating and changing <em>local</em> variables inside the render is totally fine.</li>
      </ul>

      <h3>So where do side effects go?</h3>
      <p>Things that "change the world" — logging to a server, changing state, timers, fetching data — belong in <strong>event handlers</strong> (preferred) or, as a last resort, in <code>useEffect</code> (covered later). Event handlers don't need to be pure because they don't run during render.</p>

      <div class="warn"><strong>StrictMode</strong> calls your components twice in development on purpose, to expose impure code. If rendering twice changes the result, you have a bug.</div>
      <div class="tip">Never call a state setter directly in the component body (not inside a handler) — that triggers a render during render and causes an infinite loop.</div>
    `,
    examples: [
      {
        title: 'Impure vs pure (with StrictMode)',
        code: `import { StrictMode } from 'react';

let guest = 0; // variable OUTSIDE the component

function ImpureCup() {
  guest = guest + 1; // ❌ changes outside variable during render
  return <p>Impure: tea cup for guest #{guest}</p>;
}

function PureCup({ guest }) {
  return <p>Pure: tea cup for guest #{guest}</p>; // ✅ depends only on props
}

export default function App() {
  // StrictMode renders twice in dev -> impure numbers jump around
  return (
    <StrictMode>
      <ImpureCup />
      <ImpureCup />
      <ImpureCup />
      <hr />
      <PureCup guest={1} />
      <PureCup guest={2} />
      <PureCup guest={3} />
    </StrictMode>
  );
}`,
      },
      {
        title: 'Watch renders in the console',
        code: `import { useState } from 'react';

function Child({ label }) {
  console.log('  render Child', label);
  return <li>{label}</li>;
}

export default function App() {
  const [count, setCount] = useState(0);
  console.log('render App, count =', count);

  // Local mutation during render is fine: this array is new every render
  const items = [];
  for (let i = 1; i <= 3; i++) {
    items.push(<Child key={i} label={'Item ' + i} />);
  }

  return (
    <div>
      <button onClick={() => setCount(count + 1)}>Re-render ({count})</button>
      <ul>{items}</ul>
      <p>Click the button: App and all Children re-render, but only the button text changes in the DOM.</p>
    </div>
  );
}`,
      },
    ],
    quiz: [
      { q: 'In React, "rendering" means…', options: ['Painting pixels on the screen', 'React calling your component functions to compute the UI', 'Downloading the page', 'Compiling JSX'], answer: 1, why: 'Rendering is calling components; committing updates the DOM afterward.' },
      { q: 'Which is allowed during render?', options: ['Changing a global variable', 'Mutating a prop object', 'Creating and pushing to a local array', 'Calling setState unconditionally'], answer: 2, why: 'Local variables created during this render are safe to mutate.' },
      { q: 'Where should side effects preferably go?', options: ['In the component body', 'In event handlers', 'In JSX braces', 'In the key prop'], answer: 1, why: 'Event handlers run in response to user actions, not during render, so they can have side effects.' },
      { q: 'Why does StrictMode render components twice in development?', options: ['It is a bug', 'To help find impure components', 'To make apps faster', 'To test the network'], answer: 1, why: 'Pure components give the same result both times; impure ones reveal themselves.' },
      { q: 'What happens to the DOM when a parent re-renders but a child’s output is unchanged?', options: ['The child’s DOM is rebuilt from scratch', 'React leaves unchanged DOM nodes alone', 'The page reloads', 'The child is removed'], answer: 1, why: 'React compares results and only commits actual differences.' },
    ],
    exercise: {
      task: `<p>The <code>RenderLog</code> component below is impure: it pushes to a global array during render, so the list keeps growing (StrictMode makes it worse). Rewrite <code>RenderLog</code> so it is pure: it should just show the <code>hour</code> prop and whether it is "Day" (6–17) or "Night". Remove the global array.</p>`,
      starter: `import { StrictMode, useState } from 'react';

const log = [];

function RenderLog({ hour }) {
  log.push(hour); // ❌ impure
  return <p>Rendered hours: {log.join(', ')}</p>;
}

export default function App() {
  const [hour, setHour] = useState(9);
  return (
    <StrictMode>
      <button onClick={() => setHour((hour + 1) % 24)}>Next hour</button>
      <RenderLog hour={hour} />
    </StrictMode>
  );
}`,
      hint: 'Compute a local const: const isDay = hour >= 6 && hour <= 17; then return JSX using only hour and isDay.',
      solution: `import { StrictMode, useState } from 'react';

function RenderLog({ hour }) {
  const isDay = hour >= 6 && hour <= 17;
  return (
    <p>
      It is {hour}:00 — {isDay ? '☀️ Day' : '🌙 Night'}
    </p>
  );
}

export default function App() {
  const [hour, setHour] = useState(9);
  return (
    <StrictMode>
      <button onClick={() => setHour((hour + 1) % 24)}>Next hour</button>
      <RenderLog hour={hour} />
    </StrictMode>
  );
}`,
    },
  },
);
