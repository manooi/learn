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

## Runtime rules (js mode — default for this site)
- Plain ES module in sandboxed iframe. `<div id="root">` exists. `console.log/info/warn/error` shows in console panel.
- NO real LLM, NO network, NO imports. Simulate the model with a **fake/scripted LLM**: a JS function that takes `messages` (array of `{role, content}`) and returns an assistant message (text and/or `toolCalls`). This teaches the real shapes without API keys.
- Simulate a filesystem with an in-memory object `const fs = { 'src/app.js': '...' }`; simulate `bash` with a tiny command table. Never pretend it is the real pi.
- Async is fine (`await new Promise(r => setTimeout(r, ms))`) to show streaming / turn timing. Keep total run < 3s.
- Render visuals into `#root` with plain DOM (innerHTML + inline styles) when helpful: message timelines, token boxes, session trees. Keep previews < ~400px tall.
- `html` mode (`lang: 'html'`) allowed for pure visual widgets (sliders, SVG).
- Real pi commands / TypeScript extension code / JSONL files / AGENTS.md → `runnable: false` examples or `<pre><code>` in explain. Must be accurate to pi source docs at
  `/private/tmp/claude-501/-Users-sirawit-mahanin-personal-learn/b60a3489-25df-42fb-a88e-683fc584a2f4/scratchpad/pi-src/packages/coding-agent/` (docs/, examples/, src/). `runnable:false` code must still be JS/TS-like text (TS is fine since not executed).
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
