// Live playground: textarea editor → sandboxed iframe preview + console.
// Modes: react (Babel + React 19 from esm.sh), html (visual widgets), js (plain modules).
(function () {
  const REACT = '19.2.0';
  const IMPORT_MAP = {
    imports: {
      'react': `https://esm.sh/react@${REACT}?dev`,
      'react/jsx-runtime': `https://esm.sh/react@${REACT}/jsx-runtime?dev&external=react`,
      'react/jsx-dev-runtime': `https://esm.sh/react@${REACT}/jsx-dev-runtime?dev&external=react`,
      'react-dom': `https://esm.sh/react-dom@${REACT}?dev&external=react`,
      'react-dom/client': `https://esm.sh/react-dom@${REACT}/client?dev&external=react,react-dom`,
    },
  };

  const FRAME_CSS = `
    :root { color-scheme: light; }
    body { font: 15px/1.5 system-ui, -apple-system, Segoe UI, sans-serif; margin: 12px; color: #1f2330; background: #fff; }
    button { font: inherit; padding: 4px 12px; margin: 2px; border: 1px solid #c5c9d6; border-radius: 6px; background: #f4f5f9; cursor: pointer; }
    button:hover { background: #e8eaf2; }
    button:disabled { opacity: .5; cursor: default; }
    input, select, textarea { font: inherit; padding: 4px 8px; margin: 2px; border: 1px solid #c5c9d6; border-radius: 6px; }
    input[type=checkbox], input[type=radio] { padding: 0; }
    input[type=range] { padding: 0; border: 0; box-sizing: border-box; min-width: 0; }
    ul { padding-left: 22px; }
    h1, h2, h3 { margin: .3em 0; }
  `;

  // Runs first inside the iframe (classic script): forwards console, errors and size to the parent.
  const BRIDGE = `
    const send = (type, payload) => parent.postMessage({ __lr: true, type, ...payload }, '*');
    window.__send = send;
    const fmt = (v) => {
      if (typeof v === 'string') return v;
      if (v instanceof Error) return v.name + ': ' + v.message;
      if (typeof v === 'function') return 'ƒ ' + (v.name || 'anonymous') + '()';
      if (v && v.nodeType === 1) return '<' + v.tagName.toLowerCase() + (v.id ? '#' + v.id : '') + '>';
      try {
        const seen = new WeakSet();
        return JSON.stringify(v, (k, x) => {
          if (typeof x === 'object' && x !== null) {
            if (x.$$typeof) return '[React element]';
            if (seen.has(x)) return '[Circular]';
            seen.add(x);
          }
          if (typeof x === 'function') return 'ƒ ' + (x.name || 'anonymous');
          if (x === undefined) return 'undefined';
          return x;
        });
      } catch { return String(v); }
    };
    const fill = (args) => {
      // Minimal %s/%d/%o/%c support (React warnings use %s).
      if (typeof args[0] !== 'string' || !/%[sdioOc]/.test(args[0])) return args.map(fmt).join(' ');
      let i = 1;
      const head = args[0].replace(/%[sdioOc]/g, (m) => (m === '%c' ? (i++, '') : fmt(args[i++])));
      return [head, ...args.slice(i).map(fmt)].join(' ');
    };
    for (const level of ['log', 'info', 'warn', 'error', 'debug']) {
      const orig = console[level].bind(console);
      console[level] = (...args) => { orig(...args); send('console', { level, text: fill(args) }); };
    }
    // console.table → aligned plain-text table.
    console.table = (data) => {
      if (!data || typeof data !== 'object') return send('console', { level: 'log', text: fmt(data) });
      const keys = Object.keys(data);
      const cols = [];
      for (const k of keys) {
        const row = data[k];
        if (row && typeof row === 'object') for (const c of Object.keys(row)) if (!cols.includes(c)) cols.push(c);
      }
      const cell = (v) => (v === undefined ? '' : typeof v === 'string' ? v : fmt(v));
      const rows = [['(index)'].concat(cols.length ? cols : ['Value'])];
      for (const k of keys) {
        const row = data[k];
        rows.push([k].concat(cols.length
          ? cols.map((c) => (row && typeof row === 'object' ? cell(row[c]) : ''))
          : [cell(row)]));
      }
      const w = rows[0].map((_, i) => Math.max(...rows.map((r) => String(r[i]).length)));
      const line = (r) => r.map((v, i) => String(v).padEnd(w[i])).join(' │ ');
      const sep = w.map((n) => '─'.repeat(n)).join('─┼─');
      const text = [line(rows[0]), sep].concat(rows.slice(1).map(line)).join('\\n');
      send('console', { level: 'log', text });
    };
    window.__report = (err) => send('error', { text: err && err.stack ? String(err.message || err) : String(err) });
    window.addEventListener('error', (e) => window.__report(e.error || e.message));
    window.addEventListener('unhandledrejection', (e) => window.__report(e.reason));
    addEventListener('DOMContentLoaded', () => {
      new ResizeObserver(() => send('size', { h: document.documentElement.scrollHeight })).observe(document.body);
    });
  `;

  // react mode: import compiled user module from a blob URL and mount its default export.
  const REACT_MOUNT = `
    (async () => {
      try {
        const url = URL.createObjectURL(new Blob([window.__CODE__], { type: 'text/javascript' }));
        const mod = await import(url);
        const App = mod.default;
        if (typeof App !== 'function') throw new Error('Your code must "export default" a component, e.g. export default function App() { ... }');
        const { createElement, StrictMode } = await import('react');
        const { createRoot } = await import('react-dom/client');
        createRoot(document.getElementById('root'), {
          onUncaughtError: (e) => __report(e),
        }).render(window.__STRICT ? createElement(StrictMode, null, createElement(App)) : createElement(App));
        __send('ready', {});
      } catch (e) { __report(e); }
    })();
  `;

  const escapeScript = (s) => s.replace(/<\/(script)/gi, '<\\/$1').replace(/<!--/g, '<\\!--');

  // lang: 'react' (JSX module, export default App) | 'html' (HTML fragment incl. <style>/<script>) | 'js' (plain ES module, #root available)
  // strict: code uses <StrictMode> → also wrap the root. React 19 only double-runs
  // effects on initial mount when StrictMode is at the root, not nested inside App.
  function buildDoc(code, lang, strict) {
    const head = `<!doctype html><html><head><meta charset="utf-8">
<style>${FRAME_CSS}</style>
<script>{${BRIDGE}}<\/script>`;
    if (lang === 'html') {
      return `${head}</head><body>${code}
<script>__send('ready', {});<\/script></body></html>`;
    }
    if (lang === 'js') {
      return `${head}</head><body><div id="root"></div>
<script type="module">${escapeScript(code)}
__send('ready', {});<\/script></body></html>`;
    }
    return `${head}
<script type="importmap">${JSON.stringify(IMPORT_MAP)}<\/script>
<script>window.__STRICT = ${strict}; window.__CODE__ = ${escapeScript(JSON.stringify(code))};<\/script>
</head><body><div id="root"></div>
<script type="module">${escapeScript(REACT_MOUNT)}<\/script>
</body></html>`;
  }

  function compile(code, lang) {
    if (lang !== 'react') return code;
    return Babel.transform(code, {
      presets: [['react', { runtime: 'automatic' }]],
      filename: 'App.jsx',
      sourceType: 'module',
    }).code;
  }

  // Syntax highlighting via Prism (loaded from CDN in index.html). Falls back to plain text.
  const GRAMMAR = { react: 'jsx', jsx: 'jsx', html: 'markup', markup: 'markup', js: 'javascript', javascript: 'javascript', css: 'css', python: 'python', py: 'python' };
  const escHtml = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  function highlight(text, lang) {
    const name = GRAMMAR[lang] || 'jsx';
    const P = window.Prism;
    if (!P || !P.languages[name]) return escHtml(text);
    return P.highlight(text, P.languages[name], name);
  }

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  };

  // Registry so one global message listener can route to the right playground.
  const frames = new Map();
  window.addEventListener('message', (e) => {
    const d = e.data;
    if (!d || !d.__lr) return;
    const pg = frames.get(e.source);
    if (pg) pg.onMessage(d);
  });

  /**
   * create(container, { code, lang }) → { getCode, setCode, run }
   */
  function create(container, opts) {
    const initial = opts.code;
    const lang = opts.lang || (window.SITE && SITE.defaultLang) || 'react';
    const root = el('div', 'playground lang-' + lang);
    const bar = el('div', 'pg-bar');
    const label = el('span', 'pg-label', { react: 'App.jsx', html: 'index.html', js: 'main.js' }[lang] || lang);
    const runBtn = el('button', 'btn small', '▶ Run');
    const resetBtn = el('button', 'btn small ghost', '↺ Reset');
    const hint = el('span', 'pg-hint', '⌘/Ctrl+Enter to run');
    bar.append(label, hint, resetBtn, runBtn);

    // Preview-only mode: interactive demo, code tucked behind a toggle.
    if (opts.hideCode) {
      root.classList.add('code-hidden');
      label.textContent = '🎛 Interactive demo';
      const codeBtn = el('button', 'btn small ghost pg-code-btn', '</> Show code');
      codeBtn.onclick = () => {
        const hidden = root.classList.toggle('code-hidden');
        codeBtn.textContent = hidden ? '</> Show code' : '</> Hide code';
        if (!hidden) requestAnimationFrame(fitEditor);
      };
      bar.insertBefore(codeBtn, resetBtn);
    }

    const body = el('div', 'pg-body');
    const editor = el('textarea', 'pg-editor');
    editor.spellcheck = false;
    editor.value = initial;
    editor.setAttribute('autocapitalize', 'off');
    editor.setAttribute('autocomplete', 'off');

    // Editor = transparent textarea on top of a highlighted <pre> kept in sync.
    const editWrap = el('div', 'pg-edit');
    const hl = el('pre', 'pg-hl');
    hl.setAttribute('aria-hidden', 'true');
    const hlCode = el('code');
    hl.append(hlCode);
    editWrap.append(hl, editor);
    const paint = () => {
      const v = editor.value;
      hlCode.innerHTML = highlight(v.endsWith('\n') ? v + ' ' : v, lang);
      hl.scrollTop = editor.scrollTop;
      hl.scrollLeft = editor.scrollLeft;
    };
    editor.addEventListener('scroll', () => { hl.scrollTop = editor.scrollTop; hl.scrollLeft = editor.scrollLeft; });

    const out = el('div', 'pg-out');
    const frameWrap = el('div', 'pg-frame-wrap');
    const status = el('div', 'pg-status', 'Loading…');
    let iframe = null;
    const errBox = el('pre', 'pg-error');
    errBox.hidden = true;
    const consoleHead = el('div', 'pg-console-head');
    consoleHead.append(el('span', null, 'Console'));
    const clearBtn = el('button', 'btn tiny ghost', 'clear');
    consoleHead.append(clearBtn);
    const consoleBox = el('div', 'pg-console');
    frameWrap.append(status);
    out.append(frameWrap, errBox, consoleHead, consoleBox);
    body.append(editWrap, out);
    root.append(bar, body);
    container.append(root);

    const fitEditor = () => {
      editor.style.height = 'auto';
      editor.style.height = Math.max(160, Math.min(editor.scrollHeight + 4, 640)) + 'px';
    };

    const self = {
      onMessage(d) {
        if (d.type === 'console') {
          const line = el('div', 'pg-log ' + d.level, d.text);
          consoleBox.append(line);
          consoleBox.scrollTop = consoleBox.scrollHeight;
          consoleHead.classList.add('has');
        } else if (d.type === 'error') {
          showError(d.text);
        } else if (d.type === 'size' && iframe) {
          iframe.style.height = Math.max(80, Math.min(d.h + 4, 520)) + 'px';
        } else if (d.type === 'ready') {
          status.hidden = true;
        }
      },
    };

    function showError(text) {
      errBox.hidden = false;
      errBox.textContent = (errBox.textContent ? errBox.textContent + '\n' : '') + text;
      status.hidden = true;
    }

    function run() {
      errBox.hidden = true;
      errBox.textContent = '';
      consoleBox.textContent = '';
      consoleHead.classList.remove('has');
      if (iframe) { frames.delete(iframe.contentWindow); iframe.remove(); }
      let compiled;
      try {
        compiled = compile(editor.value, lang);
      } catch (e) {
        iframe = null;
        status.hidden = true;
        showError('Syntax error: ' + e.message.replace(/^App\.jsx: /, ''));
        return;
      }
      status.hidden = false;
      iframe = el('iframe', 'pg-frame');
      iframe.setAttribute('sandbox', 'allow-scripts allow-modals allow-forms');
      iframe.title = 'Preview';
      frameWrap.append(iframe);
      frames.set(iframe.contentWindow, self);
      iframe.srcdoc = buildDoc(compiled, lang, /<StrictMode\b/.test(editor.value));
    }

    let timer;
    editor.addEventListener('input', () => {
      fitEditor();
      paint();
      clearTimeout(timer);
      timer = setTimeout(run, 700);
    });
    editor.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault(); clearTimeout(timer); run(); return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: t, value: v } = editor;
        if (e.shiftKey) {
          const lineStart = v.lastIndexOf('\n', s - 1) + 1;
          if (v.slice(lineStart, lineStart + 2) === '  ') {
            editor.value = v.slice(0, lineStart) + v.slice(lineStart + 2);
            editor.selectionStart = editor.selectionEnd = Math.max(lineStart, s - 2);
          }
        } else {
          editor.value = v.slice(0, s) + '  ' + v.slice(t);
          editor.selectionStart = editor.selectionEnd = s + 2;
        }
        editor.dispatchEvent(new Event('input'));
      }
      if (e.key === 'Enter' && !e.metaKey && !e.ctrlKey) {
        // Keep indentation of current line.
        const { selectionStart: s, value: v } = editor;
        const lineStart = v.lastIndexOf('\n', s - 1) + 1;
        const indent = v.slice(lineStart).match(/^ */)[0];
        const extra = /[{([]\s*$/.test(v.slice(lineStart, s)) ? '  ' : '';
        e.preventDefault();
        editor.setRangeText('\n' + indent + extra, s, editor.selectionEnd, 'end');
        editor.dispatchEvent(new Event('input'));
      }
    });
    runBtn.onclick = () => { clearTimeout(timer); run(); };
    resetBtn.onclick = () => { editor.value = initial; fitEditor(); paint(); run(); };
    clearBtn.onclick = () => { consoleBox.textContent = ''; consoleHead.classList.remove('has'); };

    paint();
    requestAnimationFrame(fitEditor);
    run();

    return {
      getCode: () => editor.value,
      setCode(code) { editor.value = code; fitEditor(); paint(); run(); },
      run,
    };
  }

  window.Playground = { create, highlight };
})();
