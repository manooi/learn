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

## Runtime rules (js mode — default for this site; `SITE.editor = true`)
- Plain ES module in sandboxed iframe. `<div id="root">` exists. `console.log/info/warn/error` shows in console panel — main output channel. Log with labels: `console.log('booking status:', b.status)`.
- Editor shown by default for modelling code (entities, value objects, aggregates, repositories, events, handlers): the code IS the lesson.
- NO imports, NO network, NO libraries. Each example self-contained: define tiny helpers (`check`, in-memory repo, event bus) inside the example rather than referencing other lessons.
- Plain modern JS (ES2023+): classes with `#private` fields, `Object.freeze`, `structuredClone`. Do NOT use `crypto.randomUUID()` (may be unavailable in sandboxed iframe); generate ids with a counter or deterministic strings so console output is predictable (e.g. `PNR-0001`, `ABC123`). No TypeScript in runnable code; TS / C# / Java snippets only as `runnable: false` examples or `<pre><code>` in explain, clearly labelled (TS is fine to show what types would add, e.g. branded types).
- Show domain errors explicitly: throw a `DomainError` subclass (define it in the example) and catch+log in the demo part so the console shows both happy path and the rejected invariant. Example must not end with an uncaught error.
- Async allowed (simulate brokers / eventual consistency with `await new Promise(r => setTimeout(r, ms))`); keep total run < 2s.
- Optional DOM output into `#root` (innerHTML + inline styles) when it helps (e.g. seat map, event log table). Keep < ~400px tall.

## Widget mode (`lang: 'html'`, `editor: false`) — for strategic-design visuals
- Use for: subdomain classifier, context-map diagrams with clickable relationships, event-storming board (drag/click sticky notes), aggregate-boundary chooser, saga/outbox step-through animations, architecture diagrams.
- Learner never sees the source, so the widget must be self-explanatory: title/instructions inside, labelled controls, live readout/explanation panel. Every knob worth exploring = a control.
- Colors: use event-storming convention where relevant — orange = domain event, blue = command, yellow = actor/aggregate (state which), pink = external system/hotspot, purple = policy, green = read model. Design for BOTH dark and light: use explicit backgrounds on widget containers (e.g. `background:#1b1f27;color:#e6e6e6` or neutral that reads well in both). No external fonts/CDNs.
- Widget exercises: input inside widget (selects/drag/textarea + Check button + rule-based checker that explains wrong answers); "Show solution" loads `solution` which should be the same widget pre-filled with the correct answer.

## Exercises (js mode)
- Starter must run without errors and print something. Include self-check asserts at bottom of starter + solution: `check('name', actual, expected)` helper defined in the code that logs ✅/❌ (JSON.stringify compare), plus `expectThrows('name', fn)` for invariant checks. Solution must print all ✅.
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
- Audience: working web developer (knows JS/TS, REST, SQL, some microservices talk); new-ish to DDD — has heard the buzzwords but never applied them properly. Skip programming basics; go deep on WHY, trade-offs and when NOT to use each pattern.
- REAL-WORLD first. Recurring domains (keep names consistent across the course):
  - **SkyHop Airlines** (main running example, fictional low-cost carrier): contexts Flight Scheduling, Inventory (seats/fare buckets), Booking (PNR, passengers, itinerary), Pricing (fares, ancillaries: bags, seats, meals), Payments, Check-in & Boarding, Loyalty, Disruption Management (cancellations, rebooking), Customer Notifications. Real terms: PNR / booking reference, fare class / fare bucket, overbooking, segment, leg, ancillary, check-in window (opens 24h before), boarding pass, no-show, IROP (irregular operations).
  - **ShopLane** e-commerce (catalog, cart, order, inventory, shipping, returns) and **LedgerBank** (accounts, money transfer, ledger, KYC) as secondary examples where they fit better.
  - Mention well-known public real-world stories when accurate (e.g. Amazon two-pizza teams / Conway's law, Uber's domain-oriented microservice architecture "DOMA" 2020, Shopify modular monolith with Packwerk, Netflix/Monzo etc.) — only if you are confident; otherwise omit.
- Canonical sources & vocabulary: Eric Evans "Domain-Driven Design" (2003, "blue book"), Vaughn Vernon "Implementing DDD" (2013, "red book") & "DDD Distilled", Vlad Khononov "Learning DDD" (2021), Alberto Brandolini Event Storming, Vernon's 4 aggregate rules (model true invariants in consistency boundaries; design small aggregates; reference other aggregates by identity; use eventual consistency outside the boundary). Context-map patterns: Partnership, Shared Kernel, Customer/Supplier, Conformist, Anticorruption Layer, Open Host Service, Published Language, Separate Ways, (Big Ball of Mud). Subdomains: Core, Supporting, Generic.
- Each lesson: explain + 1–3 examples + 3–5 quiz questions + 1 exercise. Quiz questions should be scenario-based ("SkyHop's loyalty team wants… which pattern?"), not trivia.
- Every lesson ends its explain with a short "In the real world" box (`<div class="tip">`) — how teams actually do it / common trade-off.
