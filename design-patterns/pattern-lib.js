// Shared widget library injected into every `html` preview iframe (see runner.js buildDoc).
// Provides:
//   CsEx.mount(selector, { starter, checks, title? })
//     C# exercise box: editable textarea + "Check" button that runs rule-based checks
//     against the learner's code (comments + string literals stripped before testing).
//     checks: [{ label: 'Defines interface IShape', test: /interface\s+IShape\b/ }        // RegExp must match
//              { label: 'No switch on type', test: /switch\s*\(/, absent: true }          // RegExp must NOT match
//              { label: 'Custom', test: (code, raw) => boolean }]                         // function
//   CsEx.strip(code) → code without // and /* */ comments and "string" contents.
// Stored as source text (window.PATTERN_LIB_SRC); runner.js inlines it into html iframes.
window.PATTERN_LIB_SRC = '(' + function () {
  const CSS = `
.csx { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2330; }
.csx-title { font-weight: 700; margin: 0 0 6px; }
.csx textarea { width: 100%; box-sizing: border-box; min-height: 260px; font: 12.5px/1.5 ui-monospace, Menlo, Consolas, monospace;
  tab-size: 4; padding: 10px; border: 1px solid #cfd5e3; border-radius: 8px; background: #fbfcfe; color: #1f2330; resize: vertical; }
.csx-bar { display: flex; gap: 6px; align-items: center; margin: 8px 0; }
.csx-bar button { margin: 0; }
.csx-bar .sum { margin-left: auto; font-size: 13px; font-weight: 600; }
.csx-bar .sum.ok { color: #1a7f37; }
.csx ul.csx-checks { list-style: none; padding: 0; margin: 0; display: grid; gap: 4px; }
.csx-checks li { font-size: 13px; padding: 4px 8px; border-radius: 6px; background: #f4f6fa; }
.csx-checks li.pass { background: #e6f6ea; color: #1a7f37; }
.csx-checks li.fail { background: #fdecec; color: #b42318; }
.csx-note { font-size: 12px; color: #646b80; margin-top: 6px; }`;
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  function strip(code) {
    return code
      .replace(/\/\*[\s\S]*?\*\//g, ' ')
      .replace(/\/\/.*$/gm, '')
      .replace(/@?\$?"(?:[^"\\]|\\.)*"/g, '""');
  }

  function mount(selector, cfg) {
    const host = typeof selector === 'string' ? document.querySelector(selector) : selector;
    host.className = (host.className + ' csx').trim();
    host.innerHTML = '';
    if (cfg.title) {
      const t = document.createElement('div');
      t.className = 'csx-title';
      t.textContent = cfg.title;
      host.appendChild(t);
    }
    const ta = document.createElement('textarea');
    ta.spellcheck = false;
    ta.value = cfg.starter || '';
    ta.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      e.preventDefault();
      const s = ta.selectionStart;
      ta.setRangeText('    ', s, ta.selectionEnd, 'end');
    });
    const bar = document.createElement('div');
    bar.className = 'csx-bar';
    const btn = document.createElement('button');
    btn.textContent = '✔ Check';
    const sum = document.createElement('span');
    sum.className = 'sum';
    bar.append(btn, sum);
    const list = document.createElement('ul');
    list.className = 'csx-checks';
    const note = document.createElement('div');
    note.className = 'csx-note';
    note.textContent = 'Checks look at the structure of your C# (comments ignored). For the real test, paste it into Program.cs and run `dotnet run`.';
    host.append(ta, bar, list, note);

    const checks = cfg.checks || [];
    const render = (results) => {
      list.innerHTML = '';
      checks.forEach((c, i) => {
        const li = document.createElement('li');
        const r = results && results[i];
        li.className = r == null ? '' : r ? 'pass' : 'fail';
        li.textContent = (r == null ? '○ ' : r ? '✓ ' : '✗ ') + c.label;
        list.appendChild(li);
      });
    };
    render(null);
    btn.onclick = () => {
      const raw = ta.value;
      const code = strip(raw);
      const results = checks.map((c) => {
        let ok;
        try {
          ok = typeof c.test === 'function' ? !!c.test(code, raw) : c.test.test(code);
        } catch (e) { ok = false; }
        return c.absent ? !ok : ok;
      });
      render(results);
      const n = results.filter(Boolean).length;
      sum.textContent = `${n} / ${checks.length} checks pass`;
      sum.className = 'sum' + (n === checks.length ? ' ok' : '');
      console.log(n === checks.length ? 'All checks pass 🎉' : `${checks.length - n} check(s) still failing`);
    };
    if (cfg.autoCheck) btn.click();
    return { getCode: () => ta.value, check: () => btn.click() };
  }

  window.CsEx = { mount, strip };
} + ')();';

// Helper for lesson files (runs in the main page, NOT in the iframe):
//   exercise: csExercise({ task, hint, starter, solution, checks })
// starter / solution are C# source strings; checks are
//   [{ label, re: /regex/, absent?: true }]  (regex only, so they can be serialized + verified offline).
// Produces a widget-mode html exercise whose starter/solution mount CsEx with the same checks.
window.csExercise = function ({ task, hint, starter, solution, checks }) {
  const ser = checks.map((c) => ({ label: c.label, src: c.re.source, flags: c.re.flags, absent: !!c.absent }));
  const page = (code, auto) => `<div id="ex"></div>
<script>
const checks = ${JSON.stringify(ser).replace(/</g, '\\u003c')}
  .map((c) => ({ label: c.label, test: new RegExp(c.src, c.flags), absent: c.absent }));
CsEx.mount('#ex', { starter: ${JSON.stringify(code).replace(/</g, '\\u003c')}, checks, autoCheck: ${auto} });
<\/script>`;
  return {
    task, hint, lang: 'html', editor: false,
    starter: page(starter, false),
    solution: page(solution, true),
    csStarter: starter, csSolution: solution, checks,
  };
};
