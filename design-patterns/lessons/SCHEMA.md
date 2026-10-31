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

## `editor` (per example and per exercise; falls back to `SITE.editor`, default true)
- `true` — code editor + preview side by side (learner reads/edits the code; the code IS the lesson).
- `false` — **widget mode**: preview only, full width, ↺ Reset button. Use for interaction-only demos (simulators,
  diagrams, step-throughs). The learner never sees the widget's source, so: put every knob worth exploring in the
  widget as a control; walkthrough "Try this" = click/slide/type instructions, never "edit the code".
  Widget exercises: input lives inside the widget (textarea + Check); task text says "edit … in the box below and
  click Check". "Show solution" reloads the widget with `solution`.

## `lang` (per example and per exercise; falls back to `SITE.defaultLang` in `site.js`)
- `react` — JSX ES module, must `export default` a component. Rules below.
- `html` — HTML fragment put into `<body>`; may include `<style>` and `<script>`. Best for visual widgets on non-code topics (SVG, canvas, sliders, step-through animations, simulations).
- `js` — plain ES module; `<div id="root">` exists; `console.*` shows in console panel.

## THIS COURSE: Design Patterns in C# (read this first)
Audience: developers who know basic C# (classes, interfaces, generics, lambdas) but are new to design patterns.
Target: **C# 14 / .NET 10** (installed locally). Each pattern lesson has this shape:

1. `explain` — intent (one sentence), the problem (concrete, real-world: orders, payments, notifications, files,
   UI…), the solution, a small participants list or ASCII/inline-SVG class diagram, **when to use / when not**,
   and how .NET itself uses it (e.g. `IEnumerable` = Iterator, `Stream` wrappers = Decorator, `event` = Observer,
   `HttpClientHandler` chain / ASP.NET Core middleware = Chain of Responsibility, `StringBuilder` = Builder,
   `ILogger<T>`/`IServiceProvider` = DI). Static C# snippets: `<pre><code>` (default language is C#).
2. **Example 1 — the C# program** (read-only):
   ```js
   { title: 'C#: …', runnable: false, lang: 'csharp',
     note: 'Complete Program.cs — paste into `dotnet new console` and `dotnet run`.',
     code: `…full program with top-level statements…`,
     output: `…EXACT stdout of dotnet run…`,
     explain: `<details>…walkthrough…</details>` }
   ```
   - Must be a COMPLETE Program.cs: top-level statements first, then type declarations (classes, records,
     interfaces) below. ImplicitUsings + Nullable enabled (System, System.Collections.Generic, System.Linq,
     System.Threading.Tasks etc. are implicit). No NuGet packages — BCL only.
   - Deterministic output (no DateTime.Now, Random without seed, Guid, timing). 15–80 lines ideally.
   - Show a "before" smell briefly in explain, and the pattern in the program. Use modern C#: records,
     primary constructors, switch expressions, `required`, file-scoped types, collection expressions `[...]`
     where natural — but keep it readable.
   - `output` is verified by actually running dotnet — it must match exactly.
3. **Example 2 — interactive widget** (`lang: 'html'`, `editor: false` is the site default): an SVG/DOM
   visualization of the pattern's runtime behaviour that the learner pokes: buttons/sliders/selects that create
   objects, call methods, swap strategies, wrap decorators, etc.; animate messages between participants
   (boxes + arrows), highlight the active object, and show a live log that mirrors what the C# program would
   print. Widget must be self-explanatory (short instruction line at top, labels, readouts). Light theme
   colors, ≤ ~450px tall, responsive width. Plain JS only inside `<script>`, no imports.
   Use `console.log` for a trace too (appears in console panel). Learner never sees widget source.
4. Quiz: 4–5 questions (concept, recognising the pattern in a scenario, comparing with similar patterns,
   pitfalls). `why` always filled.
5. Exercise — ALWAYS via the helper (defined in pattern-lib.js, available globally in lesson files):
   ```js
   exercise: window.csExercise({
     task: `<p>Refactor … Edit the C# in the box below and click <strong>Check</strong>.</p>`,
     hint: '…',
     starter: `…C# Program.cs that COMPILES and runs (the "before" code or a skeleton with TODOs)…`,
     solution: `…complete C# Program.cs that compiles, runs, and passes all checks…`,
     checks: [
       { label: 'Declares interface IDiscountStrategy', re: /interface\s+IDiscountStrategy\b/ },
       { label: 'No switch on customer type left', re: /switch\s*\(\s*customerType/, absent: true },
     ],
   }),
   ```
   Checks are regexes run against the code with comments and string-literal contents removed. 3–6 checks,
   structural and lenient on whitespace/naming where reasonable (`\s+`, `\w+`). Starter must fail ≥1 check.

### Verification (you MUST run both, and fix until clean)
```bash
node -e "global.window={};require('./design-patterns/pattern-lib.js');window.LESSONS=[];require('./design-patterns/lessons/<file>.js');console.log(window.LESSONS.length, window.LESSONS.map(l=>l.id).join(','))"
node /private/tmp/claude-501/-Users-sirawit-mahanin-personal-learn/8c5073ea-e97d-44a5-823f-3fc7e7bac251/scratchpad/cs-check.js /Users/sirawit.mahanin/personal/learn/design-patterns/lessons/<file>.js
```
cs-check compiles + runs every C# example and exercise starter/solution with dotnet 10, diffs `output`, and
evaluates the exercise checks. Run from repo root `/Users/sirawit.mahanin/personal/learn`. Tip: if `output`
is missing, the script prints the actual output so you can paste it in.

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
