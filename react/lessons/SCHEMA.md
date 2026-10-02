# Lesson file format

Each file in `lessons/` is a plain browser script (no modules, no build) loaded by `index.html`.

```js
window.LESSONS = window.LESSONS || [];
window.LESSONS.push(
  {
    id: 'jsx',                       // unique kebab-case, used in URL hash #/jsx
    section: 'Basics',               // sidebar group name (exact string given per file)
    title: 'JSX',
    explain: `
      <p>HTML string. Use <code>inline code</code>, <strong>, <ul>/<li>, <h3> subheadings.</p>
      <pre><code>static non-runnable snippet (escape &lt; &gt; &amp;)</code></pre>
      <div class="tip">Tip box</div>
      <div class="warn">Pitfall box</div>
    `,
    examples: [
      {
        title: 'Hello JSX',
        runnable: true,              // default true; false = shown as read-only code only
        explain: `<p>Optional HTML walkthrough shown under the playground (pre, table ok). Group sections as accordions: <details><summary>Title</summary>…</details>.</p>`,
        code: `import { useState } from 'react';

export default function App() {
  return <h1>Hello</h1>;
}`,
      },
    ],
    quiz: [
      { q: 'Question text (may contain <code>)', options: ['A', 'B', 'C', 'D'], answer: 1, why: 'Explanation shown after answering.' },
    ],
    exercise: {
      task: `<p>HTML describing what to build.</p>`,
      starter: `export default function App() {\n  // TODO\n}`,
      hint: 'Plain text or HTML hint.',
      solution: `...full working code...`,
    },
  },
);
```

## Runtime rules for `code` / `starter` / `solution`
- Compiled with Babel (JSX, automatic runtime) and run as an ES module in a sandboxed iframe.
- MUST `export default` a component (conventionally `App`). Runner renders `<App />` into `#root`.
- Available imports ONLY: `'react'`, `'react-dom'`, `'react-dom/client'` (React **19.2**, development build). No other packages, no CSS imports, no TypeScript.
- Runner does NOT wrap in StrictMode (examples may add `<StrictMode>` themselves).
- `console.log/info/warn/error` output appears in a console panel under the preview — use it to teach render/effect order.
- No real network. Simulate async with `new Promise(r => setTimeout(r, ms))`.
- iframe has light default styling for body, button, input, select, textarea, ul. Use inline `style={{...}}` for anything else. Keep previews small (< ~400px tall).
- Code is inside JS template literals: escape backticks as \` and `${` as `\${` inside code strings.
- Every example / starter / solution must run with no errors. Starter may be incomplete but must still compile and render something.

## Content rules
- Audience: React beginner. Clear, short paragraphs, concrete analogies, "why it matters", common pitfalls.
- Each lesson: explain + 1–3 examples + 3–5 quiz questions + 1 exercise.
- Accurate to React 19.2 (e.g. `ref` is a regular prop, `forwardRef` legacy; `use`, Actions, `useActionState`, `useFormStatus` from `react-dom`, `useOptimistic`, `useEffectEvent`, `<Activity>`).
