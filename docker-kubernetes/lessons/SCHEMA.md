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

## Runtime rules — THIS SITE (Docker & Kubernetes, default lang `html`)
Docker/kubectl cannot run in a browser. So every lesson mixes two kinds of examples:

1. **Visual simulators** (`lang: 'html'`, runnable, widget mode — `SITE.editor` is false so NO code editor is shown) — self-contained HTML fragment with `<style>` + `<script>`
   (plain JS, no imports, no network). Examples: layer-cache visualiser, container lifecycle state machine,
   port-mapping diagram, scheduler placing pods on nodes, ReplicaSet self-healing (kill a pod → new one appears),
   rolling-update step-through, Service load-balancing animation, HPA slider. Use SVG or divs + CSS transitions.
   Use buttons ("Step ▶", "Kill pod", "Reset") so learners DO things. `console.log` goes to the console panel —
   use it as a fake terminal (e.g. log `$ kubectl get pods` style output).
   Keep previews < ~420px tall; readable in both light and dark (use neutral colours with explicit backgrounds,
   e.g. white cards on #f4f6fa, or set your own `body{background:…;color:…}`).
2. **Reference files** (`runnable: false`, `lang: 'docker' | 'yaml' | 'bash'`) — real Dockerfiles, compose files,
   K8s manifests, shell sessions the learner copies to their machine. Optional `note: '…'` replaces the default
   banner ("Reference file — run it on your machine with Docker / kubectl installed.").
   In `bash` sessions show commands with `$ ` prefix and realistic (abridged) output lines.

### Exercises (always `lang: 'html'`, widget mode — learner edits the textarea inside the preview)
Exercise = **edit a config inside a checker widget**. Pattern:
```html
<textarea id="f" spellcheck="false" style="width:100%;height:180px;font-family:monospace">FROM node:22
...starter Dockerfile/YAML the learner edits in the preview...</textarea>
<button id="check">Check</button>
<ul id="out"></ul>
<script>
  // Tiny rule-based checker: parse lines / simple regexes, list ✓ / ✗ per requirement.
</script>
```
Starter = broken/incomplete config + working checker (checks fail). Solution = same widget with a correct config
(all checks pass when "Check" clicked; ALSO run the check once on load so solution shows all ✓ immediately).
Checker must be forgiving (case, whitespace, order where order doesn't matter). No real YAML library — use
line/regex parsing (indentation-aware only if needed). Escape `</script>` never needed inside textarea content
but avoid the literal string `</textarea>` in the content.

### Static snippets in `explain`
Use `<pre><code class="language-docker">`, `language-yaml`, `language-bash`. Default (no class) = html/markup,
so ALWAYS set a class for non-HTML code.

### Versions / accuracy (as of 2026)
- Docker Engine 27+/28, BuildKit default builder, `docker compose` (v2 plugin, space not hyphen), compose file
  has NO `version:` key (obsolete). Compose file name `compose.yaml` preferred.
- Kubernetes 1.33+: `apps/v1` Deployments, `networking.k8s.io/v1` Ingress (mention Gateway API as newer option),
  `autoscaling/v2` HPA, containerd runtime (dockershim removed in 1.24 — Docker-built images still work, they're OCI).
- Local clusters: kind, minikube, k3d, Docker Desktop's built-in K8s.

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
