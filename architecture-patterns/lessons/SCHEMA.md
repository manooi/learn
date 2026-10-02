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
        explain: `                   // optional walkthrough under the playground — REQUIRED for hard examples (see below)
          <details>
            <summary>The problem: …</summary>
            <p>…</p>
          </details>
          <details>
            <summary>Step by step: what happens when you click …</summary>
            <table><tr><th>Step</th><th>State</th><th>Screen / console</th></tr> … </table>
          </details>
        `,
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

## `lang` (per example and per exercise; falls back to `SITE.defaultLang` in `site.js`)
- `react` — JSX ES module, must `export default` a component. Rules below.
- `html` — HTML fragment put into `<body>`; may include `<style>` and `<script>`. Best for visual widgets on non-code topics (SVG, canvas, sliders, step-through animations, simulations).
- `js` — plain ES module; `<div id="root">` exists; `console.*` shows in console panel.

## Runtime rules — js mode (DEFAULT for this site)
- Plain ES module in sandboxed iframe. `<div id="root"></div>` exists; build UI with DOM APIs (`document.createElement`, `innerHTML`, `addEventListener`).
- NO imports at all. Every pattern is implemented from scratch (tiny Model classes, EventEmitter/Observer, store, binder) so the learner sees the mechanics. Put the whole mini-app in one snippet, clearly separated with comment banners like `// ===== MODEL =====`, `// ===== VIEW =====`, `// ===== CONTROLLER =====`.
- Use `console.log` heavily to show message flow (e.g. `console.log('[Controller] add', text)`), prefix logs with the role in brackets: `[Model]`, `[View]`, `[Controller]`, `[Presenter]`, `[ViewModel]`, `[Store]`, `[Reducer]`, `[Dispatcher]`, `[Intent]`, `[UseCase]`, `[Adapter]`. Walkthroughs quote these exact lines.
- "Tests": simulate with plain `console.assert`-style helpers: `function test(name, fn) { try { fn(); console.log('✓', name); } catch (e) { console.error('✗', name, e.message); } }`. No test framework.
- Keep previews small (< ~400px tall). Inline styles or a `<style>` injected via `document.head.append(...)` OK.

## html mode — diagrams / animations
- For flow diagrams (who talks to whom), step-through animations of message flow, comparison widgets. SVG + buttons "Next step" encouraged.

## Runtime rules for `code` / `starter` / `solution` (react mode — only where lesson plan says so)
- Compiled with Babel (JSX, automatic runtime) and run as an ES module in a sandboxed iframe.
- MUST `export default` a component (conventionally `App`). Runner renders `<App />` into `#root`.
- Available imports ONLY: `'react'`, `'react-dom'`, `'react-dom/client'` (React **19.2**, development build). No other packages, no CSS imports, no TypeScript.
- Runner does NOT use StrictMode by default. If code contains `<StrictMode>`, runner also wraps the root (React 19 only double-runs effects on mount when StrictMode is at the root).
- `console.log/info/warn/error` output appears in a console panel under the preview — use it to teach render/effect order.
- No real network. Simulate async with `new Promise(r => setTimeout(r, ms))`.
- iframe has light default styling for body, button, input, select, textarea, ul. Use inline `style={{...}}` for anything else. Keep previews small (< ~400px tall).
## All modes
- Code is inside JS template literals: escape backticks as \` and `${` as `\${` inside code strings.
- No network. Every example / starter / solution must run with no errors. Starter may be incomplete but must still compile and render something.

## Code formatting
- Code in `code`/`starter`/`solution` and in `<pre><code>` blocks is syntax-highlighted automatically (Prism). Write it well-formatted: 2-space indent, one statement per line, ≤ ~90 chars per line, blank lines between logical blocks.
- `<pre><code>` in `explain` is highlighted with the site's default language; override with `<code class="language-html|css|javascript|jsx">`.
- Escape `<` `>` `&` inside `<pre><code>` as `&lt;` `&gt;` `&amp;`.
- Numbered comments `// ①` `// ②` in snippets pair nicely with an `<ol>` explaining each line.

## Walkthroughs for hard examples (example-level `explain`)
Every example that teaches a hard or subtle concept (timing, order of events, identity/equality, async/races, caching, anything beginners usually get wrong) MUST have an `explain` walkthrough. Trivial examples skip it.
- Structure: 2–4 accordion sections, each `<details><summary>Title</summary>…</details>` (collapsed by default). Titles may contain `<code>`.
- Section patterns (pick what fits):
  - **The problem** — what goes wrong without this technique; concrete scenario.
  - **Step by step** — timeline / render-by-render `<table>` (step or time, values/state, what screen shows, console output). Must match the example's real code, labels and logs.
  - **Key lines explained** — short annotated `<pre><code>` with ①②③ comments + `<ol>`.
  - **Try this** — concrete experiments in the live editor and what the learner will observe.
  - **Common mistake** — `<div class="tip">` / `<div class="warn">`.
- Model: the "Simulated fetch with race-condition fix" walkthrough (problem timeline → fix with ①②③ → same timeline fixed → how the demo lets you compare → tip).

## Content rules
- Audience: as chosen by the user (default beginner). Clear, short paragraphs, concrete analogies, "why it matters", common pitfalls.
- Each lesson: explain + 1–3 examples + 3–5 quiz questions + 1 exercise.
- Accurate to the current version of the topic (state versions explicitly; verify uncertain facts).
