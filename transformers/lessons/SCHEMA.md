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

## Runtime rules for this site (Transformers / ML)
- `SITE.defaultLang` = `html`. Most examples are **visual widgets**: HTML fragment with `<style>` + `<script>` (inline, classic or `type="module"`). SVG / canvas diagrams, range sliders driving formulas, step-through buttons, tiny simulations (e.g. gradient descent animating on a curve, attention heatmap, softmax bars).
- Use `lang: 'js'` for "numbers in code" examples: plain ES module, tiny pure-JS implementations (dot product, softmax, a single neuron, attention for 3 tokens). Print with `console.log` / `console.table` — shows in console panel. `<div id="root">` exists if needed.
- NO external libraries, NO network, NO CDN imports. Everything hand-written in vanilla JS (matrices = arrays of arrays). Keep numbers small (2–8 dims, 3–6 tokens) so learners can follow by hand.
- Use fixed seeds / hard-coded weights so output is deterministic and walkthrough tables match console output exactly. If random needed, write a tiny seeded PRNG (mulberry32).
- Widgets must fit ~ 680px wide, < ~420px tall. Readable in both light and dark: set explicit colors inside the widget (e.g. white-ish background card `#fff`/text `#222`, or use `color-scheme: light dark` carefully). Simplest: give the widget root `background:#fff;color:#1a1a1a;padding:12px;border-radius:8px`.
- Format numbers with `.toFixed(2)` or `(3)` in outputs.
- Python/PyTorch snippets allowed only as `runnable: false` examples (static reference showing "how it looks in real code"), set `lang: 'python'` on them (Prism highlights Python). In `explain` use `<code class="language-python">`. Keep them short and correct for PyTorch 2.x.

## Preview-only widgets
- `html` examples render **preview only** (full width, no editor) — learner interacts, doesn't edit. A "Show code" toggle reveals source. So widgets must be self-explanatory: labels, instructions, live readouts inside the widget.
- Set `showCode: true` on an html example only if editing its code is the point.
- `js` examples and all exercises keep the editor.

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
