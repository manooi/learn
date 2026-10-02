window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  // ───────────────────────────────────────────────────────────── selector-rerenders
  {
    id: 'selector-rerenders',
    section: 'Selectors & re-renders',
    title: 'Selectors decide re-renders',
    explain: `
      <p>This is the most important idea in Zustand. Every time <code>set</code> changes the
      store, Zustand does this for <strong>every</strong> subscribed component:</p>
      <ol>
        <li>Run the component's selector on the new state.</li>
        <li>Compare the result with the previous result using <code>Object.is</code>.</li>
        <li>Same? Skip. Different? Re-render that component.</li>
      </ol>
      <p>So it's not "what changed in the store" that matters, it's "did <em>my selector's
      result</em> change". A selector like <code>(s) =&gt; s.bears &gt;= 3</code> returns a
      boolean; the component re-renders only when that boolean flips, not on every bear.</p>

      <h3><code>Object.is</code> in 20 seconds</h3>
      <table>
        <tr><th>Comparison</th><th>Result</th></tr>
        <tr><td><code>Object.is(3, 3)</code></td><td>true (same primitive)</td></tr>
        <tr><td><code>Object.is('a', 'a')</code></td><td>true</td></tr>
        <tr><td><code>Object.is(arr, arr)</code></td><td>true (same reference)</td></tr>
        <tr><td><code>Object.is({ a: 1 }, { a: 1 })</code></td><td><strong>false</strong> (two different objects)</td></tr>
        <tr><td><code>Object.is([], [])</code></td><td><strong>false</strong></td></tr>
      </table>

      <div class="tip">Selectors run often (after every store change, for every subscriber).
      Keep them cheap and pure: read, maybe compute a little, return.</div>
      <div class="warn">A selector that builds a new object or array every time (like
      <code>(s) =&gt; ({ a: s.a })</code> or <code>(s) =&gt; s.list.filter(...)</code>) is
      never "equal". In v5 that causes an infinite render loop. The next lessons show how to
      fix it.</div>
    `,
    examples: [
      {
        title: 'Render counters: who re-renders on each click?',
        code: `import { create } from 'zustand';

const useZooStore = create((set, get) => ({
  bears: 0,
  fish: 0,
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  addFish: () => set((state) => ({ fish: state.fish + 1 })),
  sameBears: () => {
    console.log('sameBears: set({ bears: ' + get().bears + ' })');
    set({ bears: get().bears });
  },
}));

function BearCount() {
  const bears = useZooStore((state) => state.bears);
  console.log('render <BearCount>');
  return <p>Bears: {bears}</p>;
}

function FishCount() {
  const fish = useZooStore((state) => state.fish);
  console.log('render <FishCount>');
  return <p>Fish: {fish}</p>;
}

function BigZoo() {
  const isBig = useZooStore((state) => state.bears >= 3);
  console.log('render <BigZoo>');
  return <p>Big zoo (3+ bears)? {isBig ? 'yes' : 'no'}</p>;
}

function Controls() {
  const addBear = useZooStore((state) => state.addBear);
  const addFish = useZooStore((state) => state.addFish);
  const sameBears = useZooStore((state) => state.sameBears);
  console.log('render <Controls>');

  return (
    <div>
      <button onClick={addBear}>+ bear</button>{' '}
      <button onClick={addFish}>+ fish</button>{' '}
      <button onClick={sameBears}>set same bears</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <BearCount />
      <FishCount />
      <BigZoo />
      <Controls />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: one store, many subscribers</summary>
            <p>All four components subscribe to the same store. Every <code>set</code> notifies
            all of them. If they all re-rendered each time, a big app would do a lot of useless
            work. The selector is each component's filter: it says which part of the state
            this component actually depends on.</p>
          </details>
          <details>
            <summary>Step by step: + fish, then + bear three times, then set same bears</summary>
            <table>
              <tr><th>Click</th><th>State</th><th>Selector results (Bear / Fish / Big)</th><th>Console</th></tr>
              <tr><td>First render</td><td>bears 0, fish 0</td><td>0 / 0 / false</td>
                <td><code>render &lt;BearCount&gt;</code><br><code>render &lt;FishCount&gt;</code><br>
                <code>render &lt;BigZoo&gt;</code><br><code>render &lt;Controls&gt;</code></td></tr>
              <tr><td>+ fish</td><td>bears 0, fish 1</td><td>0 / <strong>1</strong> / false</td>
                <td><code>render &lt;FishCount&gt;</code></td></tr>
              <tr><td>+ bear</td><td>bears 1</td><td><strong>1</strong> / 1 / false</td>
                <td><code>render &lt;BearCount&gt;</code></td></tr>
              <tr><td>+ bear</td><td>bears 2</td><td><strong>2</strong> / 1 / false</td>
                <td><code>render &lt;BearCount&gt;</code></td></tr>
              <tr><td>+ bear</td><td>bears 3</td><td><strong>3</strong> / 1 / <strong>true</strong></td>
                <td><code>render &lt;BearCount&gt;</code><br><code>render &lt;BigZoo&gt;</code></td></tr>
              <tr><td>set same bears</td><td>bears 3 (new state object!)</td><td>3 / 1 / true</td>
                <td><code>sameBears: set({ bears: 3 })</code>, no renders</td></tr>
            </table>
            <p><code>&lt;Controls&gt;</code> renders once and never again: its selectors return
            action functions, which never change. <code>&lt;BigZoo&gt;</code> ignored the first
            two bears because its <em>result</em> stayed <code>false</code>.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const isBig = useZooStore((state) =&gt; state.bears &gt;= 3); // ①
set({ bears: get().bears });                                // ②
const addBear = useZooStore((state) =&gt; state.addBear);     // ③</code></pre>
            <ol>
              <li><strong>①</strong> The selector computes a boolean. Re-render happens only on
              <code>false → true</code> (or back), not on every bear.</li>
              <li><strong>②</strong> This <code>set</code> really creates a new state object and
              calls every listener. But each selector returns the same primitive as before, so
              <code>Object.is</code> says "equal" everywhere and nothing renders.</li>
              <li><strong>③</strong> Actions are stable references: selecting them costs no
              re-renders.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Add <code>console.log('BigZoo selector runs')</code> inside BigZoo's selector
              (use a block body). You'll see it runs on <em>every</em> click, even when the
              component doesn't re-render. Running selectors is cheap; rendering is what we
              avoid.</li>
              <li>Change <code>FishCount</code> to <code>useZooStore()</code> (no selector).
              Now it re-renders on every click, including "set same bears".</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'A component uses <code>(s) =&gt; s.count &gt; 10</code>. count goes 3 → 4 → 5. How many re-renders?',
        options: ['2', '1', '0', '3'],
        answer: 2,
        why: 'The selector returns false every time. Object.is(false, false) is true, so no re-render.',
      },
      {
        q: 'How does Zustand compare the old and new selector result by default?',
        options: ['Deep equality', 'Object.is', 'JSON.stringify', 'Shallow equality'],
        answer: 1,
        why: 'The default is Object.is (strict reference/primitive equality). Shallow comparison is opt-in via useShallow.',
      },
      {
        q: 'You call <code>set({ fish: get().fish })</code> (same value). What re-renders?',
        options: [
          'Every subscribed component',
          'Only components with no selector (whole state)',
          'Only components selecting fish',
          'Nothing at all, ever',
        ],
        answer: 1,
        why: 'set still creates a new state object. Selectors returning primitives are equal and skip, but a "whole state" subscriber gets a new object and re-renders.',
      },
      {
        q: 'Why is <code>Object.is({ a: 1 }, { a: 1 })</code> a problem for selectors?',
        options: [
          "It isn't, it returns true",
          'It returns false, so a selector that builds a new object always looks changed',
          'It throws',
          'It is slow',
        ],
        answer: 1,
        why: 'Two separately created objects are never Object.is-equal, even with the same contents.',
      },
    ],
    exercise: {
      task: `<p>The <code>Status</code> component shows "online" or "offline", but it re-renders
      every time <code>pings</code> changes (watch the console when clicking Ping).</p>
      <p>Change only its selector so it re-renders only when the status label actually
      changes. The store says online when <code>lastSeen</code> is under 5.</p>`,
      starter: `import { create } from 'zustand';

const usePresenceStore = create((set) => ({
  lastSeen: 0,
  pings: 0,
  ping: () => set((state) => ({ pings: state.pings + 1 })),
  wait: () => set((state) => ({ lastSeen: state.lastSeen + 2 })),
}));

function Status() {
  const state = usePresenceStore();
  const online = state.lastSeen < 5;
  console.log('render <Status>');
  return <p>Status: {online ? 'online' : 'offline'}</p>;
}

function Controls() {
  const ping = usePresenceStore((state) => state.ping);
  const wait = usePresenceStore((state) => state.wait);
  return (
    <div>
      <button onClick={ping}>Ping</button>{' '}
      <button onClick={wait}>Wait 2 min</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Status />
      <Controls />
    </div>
  );
}`,
      hint: 'Move the comparison into the selector: usePresenceStore((state) => state.lastSeen < 5). It returns a boolean.',
      solution: `import { create } from 'zustand';

const usePresenceStore = create((set) => ({
  lastSeen: 0,
  pings: 0,
  ping: () => set((state) => ({ pings: state.pings + 1 })),
  wait: () => set((state) => ({ lastSeen: state.lastSeen + 2 })),
}));

function Status() {
  const online = usePresenceStore((state) => state.lastSeen < 5);
  console.log('render <Status>');
  return <p>Status: {online ? 'online' : 'offline'}</p>;
}

function Controls() {
  const ping = usePresenceStore((state) => state.ping);
  const wait = usePresenceStore((state) => state.wait);
  return (
    <div>
      <button onClick={ping}>Ping</button>{' '}
      <button onClick={wait}>Wait 2 min</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Status />
      <Controls />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── multiple-selectors
  {
    id: 'multiple-selectors',
    section: 'Selectors & re-renders',
    title: 'Picking several values',
    explain: `
      <p>A component often needs more than one value. You have three safe options:</p>
      <ol>
        <li><strong>One hook call per value</strong> (simplest, always safe):
        <pre><code>const bears = useZooStore((s) =&gt; s.bears);
const fish = useZooStore((s) =&gt; s.fish);</code></pre></li>
        <li><strong>Return an existing reference</strong> (safe: no new object created):
        <pre><code>const keeper = useZooStore((s) =&gt; s.keeper);  // s.keeper is an object in the store</code></pre></li>
        <li><strong>Return a new object/array wrapped in <code>useShallow</code></strong>:
        <pre><code>import { useShallow } from 'zustand/react/shallow';

const { bears, fish } = useZooStore(
  useShallow((s) =&gt; ({ bears: s.bears, fish: s.fish }))
);</code></pre></li>
      </ol>

      <h3>The v5 trap: returning a new object without <code>useShallow</code></h3>
      <pre><code>// ❌ Zustand v5: "Maximum update depth exceeded"
const { bears, fish } = useZooStore((s) =&gt; ({ bears: s.bears, fish: s.fish }));</code></pre>
      <p>That selector creates a <strong>brand-new object every time it runs</strong>. v5's
      hook is built directly on React's <code>useSyncExternalStore</code>, which calls the
      selector to take a "snapshot" and compares snapshots with <code>Object.is</code>. A new
      object each time looks like "the store changed" on every check, so React re-renders,
      gets another new object, re-renders again… until it gives up.</p>

      <div class="warn"><strong>v4 vs v5.</strong> In Zustand v4 the same code "worked": it
      only caused an extra re-render on every store change (v4 memoized the result per state
      snapshot). v5 dropped that layer to match React's rules, so the bug now shows up as an
      infinite loop. When migrating from v4, search for selectors that return
      <code>{ ... }</code> or <code>[ ... ]</code> and wrap them in <code>useShallow</code>.</div>

      <div class="tip">v5 also removed the old second argument (equality function) from the
      hook created by <code>create</code>. <code>useStore(selector, shallow)</code> no longer
      works. Use <code>useShallow</code>, or <code>createWithEqualityFn</code> from
      <code>'zustand/traditional'</code> if you really need a custom equality function.</div>
    `,
    examples: [
      {
        title: 'Three safe ways to pick several values',
        code: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useZooStore = create((set) => ({
  bears: 0,
  fish: 0,
  keeper: 'Ana',
  addBear: () => set((state) => ({ bears: state.bears + 1 })),
  addFish: () => set((state) => ({ fish: state.fish + 1 })),
  swapKeeper: () =>
    set((state) => ({ keeper: state.keeper === 'Ana' ? 'Ben' : 'Ana' })),
}));

function SeparateHooks() {
  const bears = useZooStore((state) => state.bears);
  const fish = useZooStore((state) => state.fish);
  console.log('render <SeparateHooks>');
  return <p>A) separate hooks: {bears} bears, {fish} fish</p>;
}

function ShallowObject() {
  const { bears, fish } = useZooStore(
    useShallow((state) => ({ bears: state.bears, fish: state.fish }))
  );
  console.log('render <ShallowObject>');
  return <p>B) useShallow object: {bears} bears, {fish} fish</p>;
}

function ShallowArray() {
  const [bears, fish] = useZooStore(
    useShallow((state) => [state.bears, state.fish])
  );
  console.log('render <ShallowArray>');
  return <p>C) useShallow array: {bears} bears, {fish} fish</p>;
}

function Controls() {
  const { addBear, addFish, swapKeeper } = useZooStore(
    useShallow((state) => ({
      addBear: state.addBear,
      addFish: state.addFish,
      swapKeeper: state.swapKeeper,
    }))
  );
  const keeper = useZooStore((state) => state.keeper);

  return (
    <div>
      <button onClick={addBear}>+ bear</button>{' '}
      <button onClick={addFish}>+ fish</button>{' '}
      <button onClick={swapKeeper}>swap keeper ({keeper})</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <SeparateHooks />
      <ShallowObject />
      <ShallowArray />
      <Controls />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: + bear, then swap keeper</summary>
            <table>
              <tr><th>Click</th><th>A (separate)</th><th>B (object)</th><th>C (array)</th><th>Console</th></tr>
              <tr><td>First render</td><td>renders</td><td>renders</td><td>renders</td>
                <td><code>render &lt;SeparateHooks&gt;</code><br><code>render &lt;ShallowObject&gt;</code><br>
                <code>render &lt;ShallowArray&gt;</code></td></tr>
              <tr><td>+ bear</td><td>bears 0→1</td>
                <td><code>{bears:1, fish:0}</code> ≠ prev</td><td><code>[1, 0]</code> ≠ prev</td>
                <td>all three lines again</td></tr>
              <tr><td>swap keeper</td><td>0/0 unchanged</td>
                <td>new object, but shallow-equal → reuse old</td>
                <td>new array, shallow-equal → reuse old</td>
                <td>nothing (only the Controls button label changes)</td></tr>
            </table>
            <p>All three behave the same. <code>keeper</code> isn't in any of their selectors,
            so swapping it renders none of them.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>useZooStore(
  useShallow(                                          // ②
    (state) =&gt; ({ bears: state.bears, fish: state.fish }) // ①
  )
);</code></pre>
            <ol>
              <li><strong>①</strong> This selector makes a new object on every call. Alone,
              that loops forever in v5.</li>
              <li><strong>②</strong> <code>useShallow</code> wraps it. It remembers the last
              result and, if the new one has the same keys with <code>Object.is</code>-equal
              values, returns the <em>old</em> object. Same reference in → React sees "no
              change".</li>
            </ol>
            <p><code>Controls</code> uses the same trick to grab three actions at once. It
            re-renders only for <code>keeper</code>, which it selects on purpose to show the
            name on the button.</p>
          </details>
          <details>
            <summary>Which one should I use?</summary>
            <ul>
              <li>2–3 values: separate hooks are the clearest.</li>
              <li>Many values, or you like destructuring: <code>useShallow</code> object.</li>
              <li><code>useShallow</code> array: short, but order matters, so it's easy to swap
              two values by accident.</li>
            </ul>
          </details>
        `,
      },
      {
        title: '❌ The v5 infinite loop (read-only, do not run)',
        runnable: false,
        code: `import { create } from 'zustand';

const useZooStore = create(() => ({ bears: 0, fish: 0 }));

function BadPicker() {
  // New object on every call -> v5 re-renders forever:
  // "The result of getSnapshot should be cached to avoid an infinite loop"
  // "Maximum update depth exceeded"
  const { bears, fish } = useZooStore((state) => ({
    bears: state.bears,
    fish: state.fish,
  }));

  return <p>{bears} bears, {fish} fish</p>;
}

export default function App() {
  return <BadPicker />;
}`,
        explain: `
          <details>
            <summary>Step by step: why this never settles</summary>
            <table>
              <tr><th>Step</th><th>What React does</th><th>Result</th></tr>
              <tr><td>1</td><td>Render <code>BadPicker</code>, call the selector (the
                <code>getSnapshot</code> function)</td><td>object #1</td></tr>
              <tr><td>2</td><td>Call it again to check the snapshot is stable</td>
                <td>object #2. <code>Object.is(#1, #2)</code> is false → console error
                "getSnapshot should be cached"</td></tr>
              <tr><td>3</td><td>Snapshot "changed", so schedule another render</td>
                <td>object #3, #4… always different</td></tr>
              <tr><td>4</td><td>After ~50 nested updates React stops</td>
                <td><strong>Maximum update depth exceeded</strong>, the component crashes</td></tr>
            </table>
            <p>Notice the store never changed. The selector alone causes the loop.</p>
          </details>
          <details>
            <summary>Three fixes</summary>
            <pre><code>// ① separate hooks
const bears = useZooStore((s) =&gt; s.bears);
const fish = useZooStore((s) =&gt; s.fish);

// ② useShallow
const { bears, fish } = useZooStore(
  useShallow((s) =&gt; ({ bears: s.bears, fish: s.fish }))
);

// ③ select the stable parent object, if the store already has one
const zoo = useZooStore((s) =&gt; s.zoo);</code></pre>
            <ol>
              <li><strong>①</strong> Each selector returns a primitive: always stable.</li>
              <li><strong>②</strong> <code>useShallow</code> hands back the previous object when
              contents match.</li>
              <li><strong>③</strong> Returning something that already <em>exists</em> in the store
              is fine: same reference until you <code>set</code> a new one.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'In Zustand v5, what happens with <code>useStore((s) =&gt; ({ a: s.a, b: s.b }))</code>?',
        options: [
          'It works fine',
          'It re-renders on every store change, nothing worse',
          'It causes an infinite loop / "Maximum update depth exceeded"',
          'It returns undefined',
        ],
        answer: 2,
        why: 'The selector returns a new object on every call, so the snapshot never looks stable. v4 only over-rendered; v5 loops.',
      },
      {
        q: 'Which of these selectors is safe in v5 without useShallow?',
        options: [
          '(s) => [s.a, s.b]',
          '(s) => ({ ...s.user })',
          '(s) => s.user (an object stored in state)',
          '(s) => s.items.filter((i) => i.done)',
        ],
        answer: 2,
        why: 'Returning an object that already lives in the store gives the same reference until it is replaced. The others create new objects/arrays on each call.',
      },
      {
        q: 'Where do you import <code>useShallow</code> from?',
        options: ["'zustand/shallow'", "'zustand/react/shallow'", "'zustand/middleware'", "'react'"],
        answer: 1,
        why: "<code>useShallow</code> is a React hook, exported from 'zustand/react/shallow'. ('zustand/shallow' exports the plain <code>shallow</code> compare function.)",
      },
      {
        q: 'In v5, does <code>useBearStore(selector, shallow)</code> (equality fn as 2nd arg) still work?',
        options: [
          'Yes, same as v4',
          'No, it was removed. Use useShallow or createWithEqualityFn from zustand/traditional',
          'Only in StrictMode',
          'Only with devtools',
        ],
        answer: 1,
        why: 'The hook from <code>create</code> in v5 takes only a selector. The equality-function form moved to <code>zustand/traditional</code>.',
      },
    ],
    exercise: {
      task: `<p><code>UserCard</code> needs <code>name</code>, <code>email</code> and the
      <code>logout</code> action. Right now it reads them with three separate hooks.</p>
      <p>Rewrite it to use <strong>one</strong> hook call with <code>useShallow</code> that
      returns an object <code>{ name, email, logout }</code>. Changing the theme must still
      not re-render <code>UserCard</code> (watch the console).</p>`,
      starter: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useAppStore = create((set) => ({
  name: 'Ana',
  email: 'ana@example.com',
  theme: 'light',
  logout: () => set({ name: 'Guest', email: '-' }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

function UserCard() {
  // TODO: replace these three calls with one useShallow call
  const name = useAppStore((state) => state.name);
  const email = useAppStore((state) => state.email);
  const logout = useAppStore((state) => state.logout);
  console.log('render <UserCard>');

  return (
    <div>
      <p>{name} ({email})</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

function ThemeButton() {
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const theme = useAppStore((state) => state.theme);
  return <button onClick={toggleTheme}>Theme: {theme}</button>;
}

export default function App() {
  return (
    <div>
      <UserCard />
      <ThemeButton />
    </div>
  );
}`,
      hint: 'const { name, email, logout } = useAppStore(useShallow((state) => ({ name: state.name, email: state.email, logout: state.logout })));',
      solution: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useAppStore = create((set) => ({
  name: 'Ana',
  email: 'ana@example.com',
  theme: 'light',
  logout: () => set({ name: 'Guest', email: '-' }),
  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
}));

function UserCard() {
  const { name, email, logout } = useAppStore(
    useShallow((state) => ({
      name: state.name,
      email: state.email,
      logout: state.logout,
    }))
  );
  console.log('render <UserCard>');

  return (
    <div>
      <p>{name} ({email})</p>
      <button onClick={logout}>Log out</button>
    </div>
  );
}

function ThemeButton() {
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const theme = useAppStore((state) => state.theme);
  return <button onClick={toggleTheme}>Theme: {theme}</button>;
}

export default function App() {
  return (
    <div>
      <UserCard />
      <ThemeButton />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── use-shallow
  {
    id: 'use-shallow',
    section: 'Selectors & re-renders',
    title: 'useShallow',
    explain: `
      <p><code>useShallow</code> wraps a selector and makes its result
      <strong>stable</strong>: if the new result is <em>shallowly equal</em> to the previous
      one, you get the previous one back (same reference), so no re-render.</p>
      <pre><code>import { useShallow } from 'zustand/react/shallow';

const { nuts, honey } = useBearStore(
  useShallow((state) =&gt; ({ nuts: state.nuts, honey: state.honey }))
);</code></pre>

      <h3>What "shallow" means</h3>
      <p>It compares <strong>one level</strong>: same set of keys (or same length for
      arrays), and each value <code>Object.is</code>-equal. It does not look deeper.</p>
      <table>
        <tr><th>prev</th><th>next</th><th>shallow equal?</th></tr>
        <tr><td><code>{ a: 1, b: 2 }</code></td><td><code>{ a: 1, b: 2 }</code></td><td>✅ yes</td></tr>
        <tr><td><code>[1, 2]</code></td><td><code>[1, 2]</code></td><td>✅ yes</td></tr>
        <tr><td><code>['papa', 'mama']</code></td><td><code>['mama', 'papa']</code></td><td>❌ no (order matters)</td></tr>
        <tr><td><code>{ a: 1 }</code></td><td><code>{ a: 1, b: 2 }</code></td><td>❌ no (different keys)</td></tr>
        <tr><td><code>{ u: { n: 1 } }</code></td><td><code>{ u: { n: 1 } }</code></td><td>❌ no, unless it's the <em>same</em> inner object</td></tr>
      </table>

      <p>Analogy: shallow compare checks that every box on the shelf has the same label. It
      does not open the boxes.</p>

      <h3>Common patterns</h3>
      <pre><code>// pick several fields
useStore(useShallow((s) =&gt; ({ a: s.a, b: s.b })));
// tuple
const [a, b] = useStore(useShallow((s) =&gt; [s.a, s.b]));
// list of keys: re-render only when keys are added/removed, not when values change
const names = useStore(useShallow((s) =&gt; Object.keys(s)));
// derived arrays
const doneIds = useStore(useShallow((s) =&gt; s.todos.filter((t) =&gt; t.done).map((t) =&gt; t.id)));</code></pre>

      <div class="tip">There is also a plain function <code>shallow(a, b)</code> in
      <code>'zustand/shallow'</code> (usable anywhere, e.g. in <code>subscribe</code> or
      tests). <code>useShallow</code> is the React-hook wrapper around it.</div>
      <div class="warn">Don't wrap selectors that already return a primitive or a stable
      reference. It works, but adds a comparison for nothing.</div>
    `,
    examples: [
      {
        title: 'How shallow() compares',
        code: `import { shallow } from 'zustand/shallow';

const inner = { n: 1 };
const cases = [
  ['{a:1,b:2} vs {a:1,b:2}', { a: 1, b: 2 }, { a: 1, b: 2 }],
  ['[1,2] vs [1,2]', [1, 2], [1, 2]],
  ['[papa,mama] vs [mama,papa]', ['papa', 'mama'], ['mama', 'papa']],
  ['{a:1} vs {a:1,b:2}', { a: 1 }, { a: 1, b: 2 }],
  ['{u:{n:1}} vs {u:{n:1}} (new inner)', { u: { n: 1 } }, { u: { n: 1 } }],
  ['{u:inner} vs {u:inner} (same inner)', { u: inner }, { u: inner }],
];

export default function App() {
  return (
    <table style={{ borderCollapse: 'collapse', fontSize: 14 }}>
      <tbody>
        {cases.map(([label, a, b]) => {
          const same = shallow(a, b);
          const strict = Object.is(a, b);
          console.log(label, '| shallow:', same, '| Object.is:', strict);
          return (
            <tr key={label}>
              <td style={{ padding: 4 }}><code>{label}</code></td>
              <td style={{ padding: 4 }}>shallow: {same ? '✅' : '❌'}</td>
              <td style={{ padding: 4 }}>Object.is: {strict ? '✅' : '❌'}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}`,
      },
      {
        title: 'Object.keys pattern with render counters',
        code: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useMealStore = create(() => ({
  papaBear: 'large porridge pot',
  mamaBear: 'middle-size pot',
  littleBear: 'little wee pot',
}));

function BearNames() {
  const names = useMealStore(useShallow((state) => Object.keys(state)));
  console.log('render <BearNames>');
  return <p>Bears: {names.join(', ')}</p>;
}

function AllMeals() {
  const meals = useMealStore(); // whole state
  console.log('render <AllMeals>');
  return (
    <ul>
      {Object.entries(meals).map(([name, meal]) => (
        <li key={name}>{name}: {meal}</li>
      ))}
    </ul>
  );
}

function changePapaMeal() {
  const next = useMealStore.getState().papaBear === 'pizza' ? 'salad' : 'pizza';
  console.log('setState({ papaBear: ' + next + ' })');
  useMealStore.setState({ papaBear: next });
}

function addCub() {
  console.log('setState({ cubBear: tiny cup })');
  useMealStore.setState({ cubBear: 'tiny cup' });
}

export default function App() {
  return (
    <div>
      <BearNames />
      <AllMeals />
      <button onClick={changePapaMeal}>Change papa's meal</button>{' '}
      <button onClick={addCub}>Add a cub</button>
    </div>
  );
}`,
        explain: `
          <details>
            <summary>The problem: <code>Object.keys</code> always builds a new array</summary>
            <p><code>Object.keys(state)</code> returns a fresh array on every call. Without
            <code>useShallow</code>, that is the same v5 infinite loop you saw with objects. With
            it, the array is compared element by element: <code>['papaBear', 'mamaBear',
            'littleBear']</code> vs the same three strings → equal → keep the old array.</p>
          </details>
          <details>
            <summary>Step by step: change papa's meal twice, then add a cub</summary>
            <table>
              <tr><th>Click</th><th>Keys</th><th>Console</th></tr>
              <tr><td>First render</td><td>papaBear, mamaBear, littleBear</td>
                <td><code>render &lt;BearNames&gt;</code><br><code>render &lt;AllMeals&gt;</code></td></tr>
              <tr><td>Change papa's meal</td><td>same 3 keys</td>
                <td><code>setState({ papaBear: pizza })</code><br><code>render &lt;AllMeals&gt;</code></td></tr>
              <tr><td>Change papa's meal</td><td>same 3 keys</td>
                <td><code>setState({ papaBear: salad })</code><br><code>render &lt;AllMeals&gt;</code></td></tr>
              <tr><td>Add a cub</td><td>4 keys (length changed)</td>
                <td><code>setState({ cubBear: tiny cup })</code><br><code>render &lt;BearNames&gt;</code><br>
                <code>render &lt;AllMeals&gt;</code></td></tr>
              <tr><td>Add a cub again</td><td>same 4 keys, same value</td>
                <td><code>setState({ cubBear: tiny cup })</code><br><code>render &lt;AllMeals&gt;</code></td></tr>
            </table>
            <p><code>AllMeals</code> has no selector, so it re-renders on every
            <code>setState</code>, even when nothing visible changed (last row).</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>useMealStore(useShallow((state) =&gt; Object.keys(state)));  // ①
useMealStore.setState({ papaBear: next });                 // ②</code></pre>
            <ol>
              <li><strong>①</strong> <code>useShallow</code> keeps a ref to the last array. When
              the new array has the same length and the same string at every index, it returns
              the old array, so React sees no change.</li>
              <li><strong>②</strong> This store has no actions, so the buttons call
              <code>setState</code> directly from plain functions. It merges exactly like
              <code>set</code> inside the store.</li>
            </ol>
          </details>
          <details>
            <summary>Try this</summary>
            <ul>
              <li>Change <code>BearNames</code> to select <code>Object.values(state)</code>
              instead. Now it re-renders when papa's meal changes, because one element of the
              array is a different string.</li>
            </ul>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does <code>useShallow</code> return when the new selector result is shallow-equal to the previous one?',
        options: ['The new result', 'The previous result (same reference)', 'undefined', 'A deep copy'],
        answer: 1,
        why: 'Returning the previous reference is what makes Object.is see "no change".',
      },
      {
        q: 'Is <code>{ user: { id: 1 } }</code> shallow-equal to a new <code>{ user: { id: 1 } }</code> (different inner object)?',
        options: ['Yes', 'No, the inner objects are compared with Object.is', 'Only in v5', 'Only with arrays'],
        answer: 1,
        why: 'Shallow compares one level. The values are two different objects, so it is not equal.',
      },
      {
        q: 'With <code>useShallow((s) =&gt; Object.keys(s))</code>, when does the component re-render?',
        options: [
          'On every set',
          'When a key is added, removed or reordered',
          'When any value changes',
          'Never',
        ],
        answer: 1,
        why: 'The result is an array of key names. It only changes when the set/order of keys changes.',
      },
      {
        q: 'Which import gives you the plain <code>shallow(a, b)</code> function (not a hook)?',
        options: ["'zustand/react/shallow'", "'zustand/shallow'", "'zustand'", "'react'"],
        answer: 1,
        why: "'zustand/shallow' (also 'zustand/vanilla/shallow') exports <code>shallow</code>. The hook <code>useShallow</code> lives in 'zustand/react/shallow'.",
      },
    ],
    exercise: {
      task: `<p><code>Toolbar</code> shows the list of tool names. Make it select
      <code>Object.keys(state.tools)</code> with <code>useShallow</code> so that clicking
      "Use hammer" (which only changes a count) does <strong>not</strong> re-render it, but
      "Add saw" does.</p>
      <p>The starter uses the whole <code>tools</code> object, so it re-renders every time.</p>`,
      starter: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useToolStore = create((set) => ({
  tools: { hammer: 0, wrench: 0 },
  use: (name) =>
    set((state) => ({ tools: { ...state.tools, [name]: state.tools[name] + 1 } })),
  addSaw: () => set((state) => ({ tools: { ...state.tools, saw: 0 } })),
}));

function Toolbar() {
  // TODO: select only the names, with useShallow
  const tools = useToolStore((state) => state.tools);
  const names = Object.keys(tools);
  console.log('render <Toolbar>');
  return <p>Tools: {names.join(', ')}</p>;
}

function Controls() {
  const hammer = useToolStore((state) => state.tools.hammer);
  const use = useToolStore((state) => state.use);
  const addSaw = useToolStore((state) => state.addSaw);

  return (
    <div>
      <p>Hammer used {hammer} times</p>
      <button onClick={() => use('hammer')}>Use hammer</button>{' '}
      <button onClick={addSaw}>Add saw</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Toolbar />
      <Controls />
    </div>
  );
}`,
      hint: 'const names = useToolStore(useShallow((state) => Object.keys(state.tools)));',
      solution: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useToolStore = create((set) => ({
  tools: { hammer: 0, wrench: 0 },
  use: (name) =>
    set((state) => ({ tools: { ...state.tools, [name]: state.tools[name] + 1 } })),
  addSaw: () => set((state) => ({ tools: { ...state.tools, saw: 0 } })),
}));

function Toolbar() {
  const names = useToolStore(useShallow((state) => Object.keys(state.tools)));
  console.log('render <Toolbar>');
  return <p>Tools: {names.join(', ')}</p>;
}

function Controls() {
  const hammer = useToolStore((state) => state.tools.hammer);
  const use = useToolStore((state) => state.use);
  const addSaw = useToolStore((state) => state.addSaw);

  return (
    <div>
      <p>Hammer used {hammer} times</p>
      <button onClick={() => use('hammer')}>Use hammer</button>{' '}
      <button onClick={addSaw}>Add saw</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Toolbar />
      <Controls />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── derived-state
  {
    id: 'derived-state',
    section: 'Selectors & re-renders',
    title: 'Derived / computed values',
    explain: `
      <p>A <strong>derived value</strong> is anything you can calculate from state: a cart
      total, the number of done todos, a filtered list. <strong>Don't store it.</strong>
      Stored copies get out of sync ("I added an item but forgot to update
      <code>total</code>"). Compute it when you read.</p>

      <h3>Compute in the selector (numbers, strings, booleans)</h3>
      <pre><code>const total = useCartStore((s) =&gt;
  s.items.reduce((sum, item) =&gt; sum + item.price * item.qty, 0)
);
const doneCount = useTodoStore((s) =&gt; s.todos.filter((t) =&gt; t.done).length);</code></pre>
      <p>These return primitives, so <code>Object.is</code> works and the component
      re-renders only when the <em>number</em> changes.</p>

      <h3>Derived arrays/objects need care</h3>
      <p><code>filter</code>, <code>map</code>, <code>slice</code> and friends return a new
      array every call. Returned straight from a selector, that is the v5 infinite loop.
      Two fixes:</p>
      <pre><code>// A) wrap in useShallow: compares the items one by one
const visible = useTodoStore(
  useShallow((s) =&gt; s.todos.filter((t) =&gt; !t.done))
);

// B) select the raw, stable data, derive outside with useMemo
const todos = useTodoStore((s) =&gt; s.todos);
const visible = useMemo(() =&gt; todos.filter((t) =&gt; !t.done), [todos]);</code></pre>

      <div class="tip">A works well when the derived items keep their references (filter,
      slice). If you <code>map</code> to <em>new objects</em>
      (<code>todos.map((t) =&gt; ({ ...t }))</code>), shallow compare fails every time; use B,
      or map to primitives (like ids) instead.</div>
      <div class="warn">Computing in the selector means it runs after <em>every</em> store
      change. Fine for small lists. For heavy work over big lists, prefer B so it only
      recomputes when its inputs change.</div>
    `,
    examples: [
      {
        title: 'Computed totals in selectors',
        code: `import { create } from 'zustand';

const useCartStore = create((set) => ({
  items: [
    { id: 1, name: 'Tea', price: 3, qty: 1 },
    { id: 2, name: 'Cake', price: 5, qty: 2 },
  ],
  note: '',
  addOne: (id) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, qty: i.qty + 1 } : i)),
    })),
  setNote: (note) => set({ note }),
}));

function Total() {
  const total = useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.price * i.qty, 0)
  );
  console.log('render <Total>');
  return <h3>Total: \${total}</h3>;
}

function ItemCount() {
  const count = useCartStore((state) =>
    state.items.reduce((sum, i) => sum + i.qty, 0)
  );
  console.log('render <ItemCount>');
  return <p>{count} items</p>;
}

function AddButtons() {
  const items = useCartStore((state) => state.items);
  const addOne = useCartStore((state) => state.addOne);
  return items.map((i) => (
    <button key={i.id} onClick={() => addOne(i.id)} style={{ marginRight: 4 }}>
      + {i.name} (\${i.price})
    </button>
  ));
}

function NoteInput() {
  const note = useCartStore((state) => state.note);
  const setNote = useCartStore((state) => state.setNote);
  return (
    <input
      placeholder="note (not part of the total)"
      value={note}
      onChange={(e) => setNote(e.target.value)}
    />
  );
}

// App selects nothing, so it never re-renders its children
export default function App() {
  return (
    <div>
      <AddButtons />
      <Total />
      <ItemCount />
      <NoteInput />
    </div>
  );
}`,
      },
      {
        title: 'Filtered lists: useShallow vs useMemo',
        code: `import { useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useTodoStore = create((set) => ({
  todos: [
    { id: 1, text: 'Wash dishes', done: false },
    { id: 2, text: 'Buy milk', done: true },
    { id: 3, text: 'Call mum', done: false },
  ],
  search: '',
  toggle: (id) =>
    set((state) => ({
      todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
  setSearch: (search) => set({ search }),
}));

// A) derive inside the selector, stabilized by useShallow
function OpenTodos() {
  const open = useTodoStore(useShallow((state) => state.todos.filter((t) => !t.done)));
  console.log('render <OpenTodos>');
  return <p>A) open: {open.map((t) => t.text).join(', ') || 'none'}</p>;
}

// B) select raw data, derive with useMemo
function DoneTodos() {
  const todos = useTodoStore((state) => state.todos);
  const done = useMemo(() => todos.filter((t) => t.done), [todos]);
  console.log('render <DoneTodos>');
  return <p>B) done: {done.map((t) => t.text).join(', ') || 'none'}</p>;
}

function Checklist() {
  const todos = useTodoStore((state) => state.todos);
  const toggle = useTodoStore((state) => state.toggle);
  return todos.map((t) => (
    <label key={t.id} style={{ display: 'block' }}>
      <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
      {t.text}
    </label>
  ));
}

function SearchBox() {
  const search = useTodoStore((state) => state.search);
  const setSearch = useTodoStore((state) => state.setSearch);
  return (
    <input
      placeholder="type here (unrelated state)"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
    />
  );
}

// App selects nothing, so parent re-renders don't blur the demo
export default function App() {
  return (
    <div>
      <Checklist />
      <SearchBox />
      <OpenTodos />
      <DoneTodos />
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: type a letter, then tick "Wash dishes"</summary>
            <table>
              <tr><th>Action</th><th>A) useShallow filter</th><th>B) useMemo</th><th>Console</th></tr>
              <tr><td>First render</td><td>renders</td><td>renders</td>
                <td><code>render &lt;OpenTodos&gt;</code><br><code>render &lt;DoneTodos&gt;</code></td></tr>
              <tr><td>Type "x" in the input</td>
                <td>filter makes a new array with the same 2 todo objects → shallow-equal → skip</td>
                <td><code>state.todos</code> same reference → skip</td>
                <td>nothing</td></tr>
              <tr><td>Tick "Wash dishes"</td>
                <td>open list is now [Call mum] → re-render</td>
                <td><code>todos</code> is a new array → re-render, useMemo recomputes</td>
                <td><code>render &lt;OpenTodos&gt;</code><br><code>render &lt;DoneTodos&gt;</code></td></tr>
            </table>
            <p>Notice <code>App</code> selects nothing: the checklist and the input live in their
            own components. If <code>App</code> read <code>search</code> itself, typing would
            re-render <code>App</code> and, with it, <em>every child</em>, whatever their
            selectors say. Selectors only control re-renders caused by the store, not by a
            parent.</p>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>useTodoStore(useShallow((state) =&gt; state.todos.filter((t) =&gt; !t.done))); // ①
const todos = useTodoStore((state) =&gt; state.todos);                          // ②
const done = useMemo(() =&gt; todos.filter((t) =&gt; t.done), [todos]);          // ③</code></pre>
            <ol>
              <li><strong>①</strong> <code>filter</code> returns a new array each time, but its
              elements are the same todo objects from the store, so shallow compare can tell
              "nothing changed".</li>
              <li><strong>②</strong> Selecting the stored array is always stable. It changes only
              when an action writes a new <code>todos</code> array.</li>
              <li><strong>③</strong> <code>useMemo</code> recomputes only when <code>todos</code>
              changes. Good for expensive derivations.</li>
            </ol>
          </details>
          <details>
            <summary>Common mistake</summary>
            <div class="warn"><code>useTodoStore((state) =&gt; state.todos.filter((t) =&gt; !t.done))</code>
            without <code>useShallow</code> crashes in v5 with "Maximum update depth
            exceeded". Any selector that ends with <code>.filter()</code>,
            <code>.map()</code>, <code>Object.keys()</code>, <code>[...]</code> or
            <code>{...}</code> needs one of the two fixes.</div>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'Why not store <code>total</code> in the cart store next to <code>items</code>?',
        options: [
          'Zustand forbids numbers',
          'It can get out of sync; compute it from items instead',
          'It would be slower to read',
          'Stores can only hold arrays',
        ],
        answer: 1,
        why: 'A stored copy must be updated in every action that touches items. Deriving it can never be wrong.',
      },
      {
        q: 'Is <code>useStore((s) =&gt; s.todos.filter((t) =&gt; t.done).length)</code> safe in v5?',
        options: [
          'No, filter creates a new array',
          'Yes, the selector returns a number',
          'Only with useShallow',
          'Only with useMemo',
        ],
        answer: 1,
        why: 'The temporary array never leaves the selector. The returned value is a primitive, compared with Object.is.',
      },
      {
        q: 'Which is safe for a filtered list in v5?',
        options: [
          'useStore((s) => s.todos.filter(f))',
          'useStore(useShallow((s) => s.todos.filter(f)))',
          'useStore((s) => [...s.todos])',
          'useStore((s) => s.todos.map((t) => ({ ...t })))',
        ],
        answer: 1,
        why: 'useShallow compares the filtered items one by one. The others return new arrays each call (the last one also new objects).',
      },
    ],
    exercise: {
      task: `<p>Add a <code>Summary</code> component that shows
      "<em>X of Y done</em>". Compute both numbers in selectors (don't add fields to the
      store). Then show a list of the <strong>titles</strong> of open tasks using
      <code>useShallow</code> and <code>filter</code> + <code>map</code> to strings.</p>`,
      starter: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useTaskStore = create((set) => ({
  tasks: [
    { id: 1, title: 'Plan', done: true },
    { id: 2, title: 'Build', done: false },
    { id: 3, title: 'Ship', done: false },
  ],
  toggle: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

function Summary() {
  // TODO: doneCount and total via selectors
  return <p>? of ? done</p>;
}

function OpenTitles() {
  // TODO: titles of open tasks, with useShallow
  return <p>Open: ?</p>;
}

export default function App() {
  const tasks = useTaskStore((state) => state.tasks);
  const toggle = useTaskStore((state) => state.toggle);

  return (
    <div>
      {tasks.map((t) => (
        <label key={t.id} style={{ display: 'block' }}>
          <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
          {t.title}
        </label>
      ))}
      <Summary />
      <OpenTitles />
    </div>
  );
}`,
      hint: 'useTaskStore((state) => state.tasks.filter((t) => t.done).length) and useTaskStore(useShallow((state) => state.tasks.filter((t) => !t.done).map((t) => t.title))).',
      solution: `import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

const useTaskStore = create((set) => ({
  tasks: [
    { id: 1, title: 'Plan', done: true },
    { id: 2, title: 'Build', done: false },
    { id: 3, title: 'Ship', done: false },
  ],
  toggle: (id) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    })),
}));

function Summary() {
  const doneCount = useTaskStore((state) => state.tasks.filter((t) => t.done).length);
  const total = useTaskStore((state) => state.tasks.length);
  return <p>{doneCount} of {total} done</p>;
}

function OpenTitles() {
  const titles = useTaskStore(
    useShallow((state) => state.tasks.filter((t) => !t.done).map((t) => t.title))
  );
  return <p>Open: {titles.join(', ') || 'none'}</p>;
}

export default function App() {
  const tasks = useTaskStore((state) => state.tasks);
  const toggle = useTaskStore((state) => state.toggle);

  return (
    <div>
      {tasks.map((t) => (
        <label key={t.id} style={{ display: 'block' }}>
          <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
          {t.title}
        </label>
      ))}
      <Summary />
      <OpenTitles />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── auto-selectors
  {
    id: 'auto-selectors',
    section: 'Selectors & re-renders',
    title: 'Auto-generating selectors',
    explain: `
      <p>Writing <code>useBearStore((state) =&gt; state.bears)</code> for every field gets
      repetitive. The Zustand docs show a tiny helper, <code>createSelectors</code>, that adds
      a ready-made hook per top-level key under <code>store.use</code>:</p>
      <pre><code>const bears = useBearStore.use.bears();       // same as (s) =&gt; s.bears
const increase = useBearStore.use.increase();</code></pre>

      <h3>The helper (plain JS)</h3>
      <pre><code>const createSelectors = (store) =&gt; {
  store.use = {};
  for (const key of Object.keys(store.getState())) {
    store.use[key] = () =&gt; store((state) =&gt; state[key]);
  }
  return store;
};

const useBearStore = createSelectors(
  create((set) =&gt; ({
    bears: 0,
    increase: () =&gt; set((state) =&gt; ({ bears: state.bears + 1 })),
  }))
);</code></pre>
      <p>It loops over the keys of the <em>initial</em> state and, for each one, creates a
      function that calls the store hook with a single-field selector. You get the same
      precise re-renders as hand-written selectors, with less typing.</p>

      <h3>TypeScript version (from the docs)</h3>
      <pre><code>import { StoreApi, UseBoundStore } from 'zustand';

type WithSelectors&lt;S&gt; = S extends { getState: () =&gt; infer T }
  ? S &amp; { use: { [K in keyof T]: () =&gt; T[K] } }
  : never;

const createSelectors = &lt;S extends UseBoundStore&lt;StoreApi&lt;object&gt;&gt;&gt;(_store: S) =&gt; {
  const store = _store as WithSelectors&lt;typeof _store&gt;;
  store.use = {};
  for (const k of Object.keys(store.getState())) {
    (store.use as any)[k] = () =&gt; store((s) =&gt; s[k as keyof typeof s]);
  }
  return store;
};</code></pre>

      <div class="warn"><code>store.use.bears()</code> is a <strong>hook call</strong>. Follow
      the rules of hooks: call it at the top level of a component, never inside a loop,
      condition or event handler.</div>
      <div class="tip">Keys added later with <code>setState</code> won't get a generated
      selector (the loop ran once). Declare every key in the initial state, even as
      <code>null</code>. For derived values or picks, keep writing normal selectors.</div>
    `,
    examples: [
      {
        title: 'createSelectors in action',
        code: `import { create } from 'zustand';

const createSelectors = (store) => {
  store.use = {};
  for (const key of Object.keys(store.getState())) {
    store.use[key] = () => store((state) => state[key]);
  }
  return store;
};

const useBearStoreBase = create((set) => ({
  bears: 0,
  honey: 10,
  increase: () => set((state) => ({ bears: state.bears + 1 })),
  eatHoney: () => set((state) => ({ honey: Math.max(0, state.honey - 1) })),
}));

const useBearStore = createSelectors(useBearStoreBase);
console.log('generated selectors:', Object.keys(useBearStore.use).join(', '));

function Bears() {
  const bears = useBearStore.use.bears();
  console.log('render <Bears>');
  return <p>Bears: {bears}</p>;
}

function Honey() {
  const honey = useBearStore.use.honey();
  console.log('render <Honey>');
  return <p>Honey jars: {honey}</p>;
}

function Controls() {
  const increase = useBearStore.use.increase();
  const eatHoney = useBearStore.use.eatHoney();
  return (
    <div>
      <button onClick={increase}>+ bear</button>{' '}
      <button onClick={eatHoney}>eat honey</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Bears />
      <Honey />
      <Controls />
    </div>
  );
}`,
      },
    ],
    quiz: [
      {
        q: 'What does <code>useBearStore.use.bears()</code> do after <code>createSelectors</code>?',
        options: [
          'Reads bears once without subscribing',
          'Calls useBearStore((s) => s.bears), subscribing to bears only',
          'Subscribes to the whole state',
          'Sets bears',
        ],
        answer: 1,
        why: 'Each generated function is just the store hook with a one-field selector.',
      },
      {
        q: 'Can you call <code>useBearStore.use.bears()</code> inside an onClick handler?',
        options: [
          'Yes, it is a normal getter',
          'No, it is a hook; use useBearStore.getState().bears in handlers',
          'Only in React 19',
          'Only once',
        ],
        answer: 1,
        why: 'It calls a React hook, so it must follow the rules of hooks. Outside render, read with getState().',
      },
      {
        q: 'A key is added later via <code>setState({ cubs: 2 })</code>. Does <code>store.use.cubs</code> exist?',
        options: ['Yes, automatically', 'No, selectors were generated from the initial keys only', 'Only after a re-render', 'Yes, but it returns undefined'],
        answer: 1,
        why: 'createSelectors loops over the keys once, when you call it.',
      },
    ],
    exercise: {
      task: `<p>Wrap <code>useTimerStore</code> with <code>createSelectors</code> (already
      written for you) and replace every hand-written selector in the components with
      <code>useTimerStore.use.xxx()</code>.</p>`,
      starter: `import { create } from 'zustand';

const createSelectors = (store) => {
  store.use = {};
  for (const key of Object.keys(store.getState())) {
    store.use[key] = () => store((state) => state[key]);
  }
  return store;
};

// TODO: wrap with createSelectors
const useTimerStore = create((set) => ({
  minutes: 25,
  label: 'Focus',
  addMinute: () => set((state) => ({ minutes: state.minutes + 1 })),
  rename: () =>
    set((state) => ({ label: state.label === 'Focus' ? 'Break' : 'Focus' })),
}));

function Display() {
  const minutes = useTimerStore((state) => state.minutes);
  const label = useTimerStore((state) => state.label);
  return <h3>{label}: {minutes} min</h3>;
}

function Controls() {
  const addMinute = useTimerStore((state) => state.addMinute);
  const rename = useTimerStore((state) => state.rename);
  return (
    <div>
      <button onClick={addMinute}>+1 min</button>{' '}
      <button onClick={rename}>Switch label</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Display />
      <Controls />
    </div>
  );
}`,
      hint: 'const useTimerStore = createSelectors(create((set) => ({ ... }))); then const minutes = useTimerStore.use.minutes();',
      solution: `import { create } from 'zustand';

const createSelectors = (store) => {
  store.use = {};
  for (const key of Object.keys(store.getState())) {
    store.use[key] = () => store((state) => state[key]);
  }
  return store;
};

const useTimerStore = createSelectors(
  create((set) => ({
    minutes: 25,
    label: 'Focus',
    addMinute: () => set((state) => ({ minutes: state.minutes + 1 })),
    rename: () =>
      set((state) => ({ label: state.label === 'Focus' ? 'Break' : 'Focus' })),
  }))
);

function Display() {
  const minutes = useTimerStore.use.minutes();
  const label = useTimerStore.use.label();
  return <h3>{label}: {minutes} min</h3>;
}

function Controls() {
  const addMinute = useTimerStore.use.addMinute();
  const rename = useTimerStore.use.rename();
  return (
    <div>
      <button onClick={addMinute}>+1 min</button>{' '}
      <button onClick={rename}>Switch label</button>
    </div>
  );
}

export default function App() {
  return (
    <div>
      <Display />
      <Controls />
    </div>
  );
}`,
    },
  },

  // ───────────────────────────────────────────────────────────── store-outside-react
  {
    id: 'store-outside-react',
    section: 'Selectors & re-renders',
    title: 'Using the store outside components',
    explain: `
      <p>The hook returned by <code>create</code> is also the store itself. It carries the
      plain store API, usable from <strong>anywhere</strong>: timers, WebSocket handlers,
      utility modules, tests.</p>
      <table>
        <tr><th>Method</th><th>What it does</th></tr>
        <tr><td><code>useStore.getState()</code></td><td>Current state, right now. Does not subscribe.</td></tr>
        <tr><td><code>useStore.setState(partial, replace?)</code></td><td>Same as <code>set</code> inside the store: merges, accepts an object or <code>(state) =&gt; partial</code>.</td></tr>
        <tr><td><code>useStore.subscribe(listener)</code></td><td>Calls <code>listener(state, prevState)</code> after every change. Returns an <strong>unsubscribe</strong> function.</td></tr>
        <tr><td><code>useStore.getInitialState()</code></td><td>The state the store started with (v5).</td></tr>
      </table>

      <pre><code>// plain function, no React
export function startTicking() {
  return setInterval(() =&gt; {
    useClockStore.setState((state) =&gt; ({ seconds: state.seconds + 1 }));
  }, 1000);
}

const unsubscribe = useClockStore.subscribe((state, prev) =&gt; {
  if (state.seconds !== prev.seconds) console.log('tick', state.seconds);
});
// later
unsubscribe();</code></pre>

      <div class="warn"><code>getState()</code> in a component body gives you a value, but the
      component won't re-render when it changes. In render, always use the hook with a
      selector. Use <code>getState()</code> in event handlers, effects and non-React
      code.</div>
      <div class="tip"><code>subscribe</code> fires on <em>every</em> change. Compare
      <code>state.x !== prev.x</code> to react to one field only (or use the
      <code>subscribeWithSelector</code> middleware, covered later). If you subscribe inside
      <code>useEffect</code>, return the unsubscribe function as the cleanup.</div>
    `,
    examples: [
      {
        title: 'getState / setState from plain functions and timers',
        code: `import { create } from 'zustand';

const useClockStore = create(() => ({ seconds: 0, running: false }));

// Plain functions, outside any component
let timerId = null;

function start() {
  if (timerId) return;
  useClockStore.setState({ running: true });
  timerId = setInterval(() => {
    useClockStore.setState((state) => ({ seconds: state.seconds + 1 }));
  }, 1000);
}

function stop() {
  clearInterval(timerId);
  timerId = null;
  useClockStore.setState({ running: false });
}

function reset() {
  stop();
  useClockStore.setState(useClockStore.getInitialState(), true);
}

function logNow() {
  console.log('getState():', JSON.stringify(useClockStore.getState()));
}

export default function App() {
  const seconds = useClockStore((state) => state.seconds);
  const running = useClockStore((state) => state.running);

  return (
    <div>
      <h2>{seconds}s {running ? '⏱' : '⏸'}</h2>
      <button onClick={start}>Start</button>{' '}
      <button onClick={stop}>Stop</button>{' '}
      <button onClick={reset}>Reset</button>{' '}
      <button onClick={logNow}>Log getState()</button>
    </div>
  );
}`,
      },
      {
        title: 'subscribe(listener) and unsubscribe',
        code: `import { useEffect, useState } from 'react';
import { create } from 'zustand';

const useCounterStore = create((set) => ({
  count: 0,
  label: 'clicks',
  inc: () => set((state) => ({ count: state.count + 1 })),
  rename: () => set({ label: 'taps' }),
}));

// A module-level subscription: lives as long as the page
useCounterStore.subscribe((state, prev) => {
  if (state.count !== prev.count && state.count % 5 === 0) {
    console.log('[module] milestone:', state.count);
  }
});

function Logger() {
  useEffect(() => {
    const unsubscribe = useCounterStore.subscribe((state, prev) => {
      console.log('[Logger] count ' + prev.count + ' -> ' + state.count);
    });
    console.log('[Logger] subscribed');
    return () => {
      unsubscribe();
      console.log('[Logger] unsubscribed');
    };
  }, []);

  return <p style={{ color: 'gray' }}>Logger is listening…</p>;
}

export default function App() {
  const [showLogger, setShowLogger] = useState(true);
  const count = useCounterStore((state) => state.count);
  const label = useCounterStore((state) => state.label);
  const inc = useCounterStore((state) => state.inc);
  const rename = useCounterStore((state) => state.rename);

  return (
    <div>
      <p>{count} {label}</p>
      <button onClick={inc}>+1</button>{' '}
      <button onClick={rename}>rename label</button>
      <label style={{ display: 'block', marginTop: 8 }}>
        <input
          type="checkbox"
          checked={showLogger}
          onChange={(e) => setShowLogger(e.target.checked)}
        />
        mount Logger
      </label>
      {showLogger && <Logger />}
    </div>
  );
}`,
        explain: `
          <details>
            <summary>Step by step: +1, rename label, untick Logger, +1 ×4</summary>
            <table>
              <tr><th>Action</th><th>count</th><th>Console</th></tr>
              <tr><td>First render</td><td>0</td><td><code>[Logger] subscribed</code></td></tr>
              <tr><td>+1</td><td>1</td><td><code>[Logger] count 0 -&gt; 1</code></td></tr>
              <tr><td>rename label</td><td>1</td><td><code>[Logger] count 1 -&gt; 1</code>
                (listener runs on <em>every</em> change)</td></tr>
              <tr><td>untick "mount Logger"</td><td>1</td><td><code>[Logger] unsubscribed</code></td></tr>
              <tr><td>+1 four times</td><td>5</td><td><code>[module] milestone: 5</code> only</td></tr>
            </table>
          </details>
          <details>
            <summary>Key lines explained</summary>
            <pre><code>const unsubscribe = useCounterStore.subscribe(   // ①
  (state, prev) =&gt; { ... }                       // ②
);
return () =&gt; { unsubscribe(); };                 // ③</code></pre>
            <ol>
              <li><strong>①</strong> <code>subscribe</code> returns a function that removes the
              listener.</li>
              <li><strong>②</strong> The listener gets the new state and the previous state. It
              is called for every <code>set</code>, so the module listener checks
              <code>state.count !== prev.count</code> to ignore the rename.</li>
              <li><strong>③</strong> Returning it as the effect cleanup prevents a leak: without
              it, a hidden Logger would keep logging forever.</li>
            </ol>
          </details>
        `,
      },
    ],
    quiz: [
      {
        q: 'What does <code>useStore.subscribe(listener)</code> return?',
        options: ['The current state', 'An unsubscribe function', 'A Promise', 'Nothing'],
        answer: 1,
        why: 'Call the returned function to stop listening, e.g. in a useEffect cleanup.',
      },
      {
        q: 'What arguments does a subscribe listener receive?',
        options: ['(state)', '(state, prevState)', '(action, state)', '(key, value)'],
        answer: 1,
        why: 'Listeners are called with the new state and the previous state.',
      },
      {
        q: 'A component renders <code>{useStore.getState().count}</code>. What happens when count changes?',
        options: [
          'It re-renders with the new count',
          'It shows the old value until something else re-renders it',
          'It throws',
          'React warns and re-renders',
        ],
        answer: 1,
        why: 'getState() reads once and does not subscribe. Use the hook with a selector in render.',
      },
      {
        q: 'Which call from a plain function adds 1 to <code>count</code>?',
        options: [
          'useStore.set({ count: +1 })',
          'useStore.setState((state) => ({ count: state.count + 1 }))',
          'useStore().count++',
          'useStore.getState().count += 1',
        ],
        answer: 1,
        why: 'setState works like set: object or updater function, merged into the state.',
      },
    ],
    exercise: {
      task: `<p>Write the plain function <code>notify(text)</code> (outside React):</p>
      <ul>
        <li>Add <code>{ id, text }</code> to <code>messages</code> with
        <code>useToastStore.setState</code>.</li>
        <li>After 1.5 seconds, remove that message (use <code>setTimeout</code> +
        <code>filter</code>).</li>
      </ul>
      <p>The button already calls <code>notify</code>.</p>`,
      starter: `import { create } from 'zustand';

const useToastStore = create(() => ({ messages: [] }));

let nextId = 1;

function notify(text) {
  // TODO: add a message, then remove it after 1500 ms
}

function Toasts() {
  const messages = useToastStore((state) => state.messages);
  return (
    <ul>
      {messages.map((m) => (
        <li key={m.id}>{m.text}</li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <div>
      <button onClick={() => notify('Saved at ' + new Date().toLocaleTimeString())}>
        Save
      </button>
      <Toasts />
    </div>
  );
}`,
      hint: 'const id = nextId++; useToastStore.setState((state) => ({ messages: [...state.messages, { id, text }] })); then setTimeout(() => useToastStore.setState((state) => ({ messages: state.messages.filter((m) => m.id !== id) })), 1500).',
      solution: `import { create } from 'zustand';

const useToastStore = create(() => ({ messages: [] }));

let nextId = 1;

function notify(text) {
  const id = nextId++;
  useToastStore.setState((state) => ({
    messages: [...state.messages, { id, text }],
  }));

  setTimeout(() => {
    useToastStore.setState((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  }, 1500);
}

function Toasts() {
  const messages = useToastStore((state) => state.messages);
  return (
    <ul>
      {messages.map((m) => (
        <li key={m.id}>{m.text}</li>
      ))}
    </ul>
  );
}

export default function App() {
  return (
    <div>
      <button onClick={() => notify('Saved at ' + new Date().toLocaleTimeString())}>
        Save
      </button>
      <Toasts />
    </div>
  );
}`,
    },
  },
);
