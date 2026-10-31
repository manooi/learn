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

## Runtime rules (this site: `html` mode, `editor: false` widgets by default)
Topic = authentication + authorization. Every example is an interactive HTML widget (preview only, full width).
Code = HTML fragment with `<style>`/`<script>` (classic script, not module). Iframe is light themed, ~1000px wide.
Two globals are pre-loaded in every html preview (from `../seq-lib.js`):

### `Seq.mount(selector, cfg)` — animated request/response sequence diagram (USE IT for every protocol flow)
```js
Seq.mount('#flow', {
  title: 'HTTP Basic auth',                  // optional
  intro: 'html shown before step 1',          // optional
  actors: [                                   // 2–5 actors, left→right
    { id: 'b', label: 'Browser', icon: '🌐', store: { },  storeLabel: 'Cookie jar' },
    { id: 's', label: 'Server',  icon: '🖥', store: { users: 'alice/bcrypt(...)' } },
  ],
  // either `steps: [...]` or `scenarios: [{ name: '✅ Happy path', steps: [...] }, { name: '❌ Wrong password', steps }]`
  steps: [
    { from: 'b', to: 's',
      kind: 'req',        // req (blue) | res (green) | redirect (orange dashed) | err (red) | self (purple, from===to)
                          // | back (cyan dotted, server-to-server back-channel) | info (grey)
      label: 'GET /admin',                       // short arrow label (≤ ~40 chars)
      badge: 'optional custom badge text',
      msg: 'GET /admin HTTP/1.1\nHost: shop.test\nAuthorization: Basic YWxpY2U6czNjcmV0',
                          // raw message shown in dark inspector. Line 1 bold; "Header: v" lines colored;
                          // blank line → body; lines starting with # or // are grey comments.
      hl: ['Authorization'],                     // substrings to highlight in msg
      note: 'HTML narration: what & WHY (1–3 sentences). <code> ok.',
      set: { b: { 'sid': 'abc123' }, s: { 'old': null } },   // state changes (null deletes); flashed yellow
    },
  ],
  onStep(i, step) {},  // optional hook, e.g. to update your own extra panel
});
// returns { go(i), play(), stop(), setScenario(i) }
```
Controls (Next/Back/Play/speed, click arrow, ←/→ keys), packet animation, and per-actor state cards are built in.
Messages: write REALISTIC raw HTTP (method line, Host, real header names, real param names per spec, URL-encoded
query strings, realistic JSON/XML bodies). Use `\n` for newlines inside JS strings (the code itself lives in a
template literal, so write `\\n` in the lesson file — or build msg with array.join('\n')). Keep ≤ ~14 steps per scenario.
Use scenarios to contrast happy path vs attack/failure.

### `Auth.*` — real, synchronous crypto/encoding (pure JS; use it so values shown are genuine)
`b64(str|bytes)`, `b64d(str)`, `b64url(x)`, `b64urlDecode(s)`, `hex(bytes)`, `sha256(x)→bytes`, `sha256hex(x)`,
`sha256b64url(x)` (PKCE S256), `hmacSha256hex(key,msg)`, `hmacSha256b64(key,msg)` (OAuth1 uses HMAC-SHA1 in spec —
say so, demo with SHA-256 and label it), `hmacSha256b64url(key,msg)`, `md5(str)→hex` (Digest), `randHex(n)`,
`randB64url(n)`, `jwtSign(header,payload,secret)` (HS256), `jwtDecode(token)→{header,payload,signature}`,
`jwtVerify(token,secret)→bool`. `crypto.subtle` may be unavailable (sandboxed iframe) — don't use it.

### Other widget kinds (beyond Seq) — mix in where they teach better
Simulated mini-apps: login form → fake server object in JS → show resulting request/response/cookies; token decoders
with editable textarea; attack simulators (CSRF, alg:none, redirect_uri tampering); policy evaluators
(RBAC/ABAC/ReBAC with checkboxes/selects and a live ALLOW/DENY verdict + reason trace); LDAP tree explorer.
Every widget must be self-explanatory: labels, instructions, live readouts. No network: simulate all servers in JS.
Style inside widgets: light theme, rounded cards, system font; keep total height ≤ ~850px.

### Exercises (widget mode)
`editor:false` exercise: put input (textarea/inputs/selects) + Check button + rule-based checker inside the widget,
showing ✅ / ❌ with feedback. `starter` = widget with empty/wrong input; `solution` = same widget pre-filled correctly.
Task text: "… in the box below and click Check".

### Read-only code (`runnable:false`, `lang: 'js'|'python'|'bash'|'http'|'json'|'yaml'|'xml'`)
Use for real server code snippets (Express middleware, Spring config, ldapsearch commands, SAML XML…). Optional
`note` replaces the banner. In `explain` use `<pre><code class="language-http">` etc.

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
