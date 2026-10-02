// App shell: sidebar, hash router, lesson page, quiz, exercise, progress.
(function () {
  const LESSONS = window.LESSONS;
  const SITE = Object.assign({ title: 'Learn', tagline: '', icon: '★', defaultLang: 'react' }, window.SITE);
  const byId = new Map(LESSONS.map((l) => [l.id, l]));
  const sections = [];
  for (const l of LESSONS) {
    let s = sections.find((x) => x.name === l.section);
    if (!s) sections.push((s = { name: l.section, lessons: [] }));
    s.lessons.push(l);
  }

  // ---------- storage ----------
  const KEY = 'lr-progress:' + SITE.title;
  const state = Object.assign({ done: {}, quiz: {}, solved: {}, code: {} }, safeParse(localStorage.getItem(KEY)));
  function safeParse(s) { try { return JSON.parse(s) || {}; } catch { return {}; } }
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  // ---------- helpers ----------
  const $ = (sel) => document.querySelector(sel);
  function h(tag, attrs, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (k === 'html') n.innerHTML = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else if (v != null && v !== false) n.setAttribute(k, v === true ? '' : v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  }

  // ---------- sidebar ----------
  function renderNav(filter = '') {
    const nav = $('#nav');
    nav.textContent = '';
    const f = filter.trim().toLowerCase();
    const current = location.hash.replace(/^#\//, '');
    for (const s of sections) {
      const items = s.lessons.filter((l) => !f || l.title.toLowerCase().includes(f) || l.id.includes(f) || s.name.toLowerCase().includes(f));
      if (!items.length) continue;
      const doneCount = s.lessons.filter((l) => state.done[l.id]).length;
      nav.append(
        h('div', { class: 'nav-section' },
          h('div', { class: 'nav-head' }, h('span', null, s.name), h('span', { class: 'nav-count' }, `${doneCount}/${s.lessons.length}`)),
          h('ul', null, items.map((l) =>
            h('li', null, h('a', {
              href: '#/' + l.id,
              class: (l.id === current ? 'active ' : '') + (state.done[l.id] ? 'done' : ''),
            }, h('span', { class: 'check' }, state.done[l.id] ? '✓' : '○'), l.title))))));
    }
    const total = LESSONS.length;
    const done = LESSONS.filter((l) => state.done[l.id]).length;
    $('#progress-bar').style.width = total ? (done / total) * 100 + '%' : '0';
    $('#progress-text').textContent = `${done} / ${total}`;
  }

  // ---------- pages ----------
  function renderHome() {
    const main = $('#content');
    main.textContent = '';
    const next = LESSONS.find((l) => !state.done[l.id]) || LESSONS[0];
    main.append(
      h('section', { class: 'hero' },
        h('h1', null, SITE.title),
        h('p', null, `${LESSONS.length} interactive lessons. ${SITE.tagline} Every example is live: edit the code and watch the preview update.`),
        h('ul', { class: 'how' },
          h('li', null, h('strong', null, 'Read'), ' the short explanation.'),
          h('li', null, h('strong', null, 'Play'), ' with live examples — break things on purpose, check the console panel.'),
          h('li', null, h('strong', null, 'Quiz'), ' yourself. Answer everything right and the lesson is marked complete.'),
          h('li', null, h('strong', null, 'Build'), ' the exercise. Stuck? Use the hint, then the solution.')),
        next && h('a', { class: 'btn big', href: '#/' + next.id }, state.done[next.id] || !Object.keys(state.done).length ? 'Start learning →' : `Continue: ${next.title} →`)),
      h('div', { class: 'cards' }, sections.map((s) =>
        h('div', { class: 'card' },
          h('h3', null, s.name),
          h('div', { class: 'progress small' }, h('div', { style: `width:${(s.lessons.filter((l) => state.done[l.id]).length / s.lessons.length) * 100}%` })),
          h('ol', null, s.lessons.map((l) => h('li', { class: state.done[l.id] ? 'done' : '' }, h('a', { href: '#/' + l.id }, l.title))))))),
      h('p', { class: 'muted small' }, 'Progress is saved in your browser. ',
        h('button', { class: 'btn tiny ghost', onclick: () => {
          if (confirm('Reset all progress, quiz answers and saved exercise code?')) {
            localStorage.removeItem(KEY); location.reload();
          }
        } }, 'Reset progress')));
    document.title = SITE.title;
  }

  function renderLesson(lesson) {
    const main = $('#content');
    main.textContent = '';
    const idx = LESSONS.indexOf(lesson);
    const prev = LESSONS[idx - 1];
    const next = LESSONS[idx + 1];

    const doneBtn = h('button', { class: 'btn small ' + (state.done[lesson.id] ? '' : 'ghost') });
    const syncDone = () => {
      doneBtn.textContent = state.done[lesson.id] ? '✓ Completed' : 'Mark complete';
      doneBtn.className = 'btn small ' + (state.done[lesson.id] ? 'ok' : 'ghost');
    };
    doneBtn.onclick = () => { state.done[lesson.id] = !state.done[lesson.id]; save(); syncDone(); renderNav($('#search').value); };
    syncDone();
    const markDone = () => { if (!state.done[lesson.id]) { state.done[lesson.id] = true; save(); syncDone(); renderNav($('#search').value); } };

    main.append(
      h('div', { class: 'lesson-head' },
        h('div', null,
          h('div', { class: 'crumb' }, `${lesson.section} · Lesson ${idx + 1} of ${LESSONS.length}`),
          h('h1', null, lesson.title)),
        doneBtn),
      h('article', { class: 'explain', html: lesson.explain }));

    // Examples
    if (lesson.examples && lesson.examples.length) {
      main.append(h('h2', { class: 'part' }, '🧪 Try it'));
      for (const ex of lesson.examples) {
        const box = h('div', { class: 'example' }, h('h3', null, ex.title));
        main.append(box);
        if (ex.runnable === false) {
          box.append(h('div', { class: 'readonly-note' }, ex.note || 'Read-only — this code needs another language, a server or a framework, so it can’t run here.'),
            h('pre', { class: 'code' }, h('code', null, ex.code)));
        } else {
          Playground.create(box, { code: ex.code, lang: ex.lang });
        }
        if (ex.explain) box.append(h('div', { class: 'ex-explain', html: ex.explain }));
      }
    }

    // Quiz
    if (lesson.quiz && lesson.quiz.length) {
      const answers = (state.quiz[lesson.id] = state.quiz[lesson.id] || {});
      const score = h('span', { class: 'score' });
      const updateScore = () => {
        const right = lesson.quiz.filter((q, i) => answers[i] === q.answer).length;
        const answered = Object.keys(answers).length;
        score.textContent = `${right} / ${lesson.quiz.length} correct`;
        score.className = 'score' + (right === lesson.quiz.length ? ' ok' : '');
        if (right === lesson.quiz.length) markDone();
        return answered;
      };
      const quizBox = h('div', { class: 'quiz' });
      lesson.quiz.forEach((q, qi) => {
        const why = h('div', { class: 'why', html: q.why || '' });
        why.hidden = true;
        const opts = q.options.map((o, oi) => h('button', {
          class: 'opt', html: o,
          onclick: () => { answers[qi] = oi; save(); paint(); updateScore(); },
        }));
        const paint = () => {
          const a = answers[qi];
          opts.forEach((b, oi) => {
            b.classList.toggle('right', a != null && oi === q.answer);
            b.classList.toggle('wrong', a === oi && oi !== q.answer);
            b.classList.toggle('chosen', a === oi);
          });
          why.hidden = a == null;
          why.classList.toggle('ok', a === q.answer);
        };
        quizBox.append(h('div', { class: 'q' },
          h('div', { class: 'q-text', html: `<span class="q-num">${qi + 1}.</span> ${q.q}` }),
          h('div', { class: 'opts' }, opts), why));
        paint();
      });
      main.append(h('h2', { class: 'part' }, '❓ Quiz ', score,
        h('button', { class: 'btn tiny ghost', onclick: () => { state.quiz[lesson.id] = {}; save(); renderLesson(lesson); } }, 'retry')), quizBox);
      updateScore();
    }

    // Exercise
    const exr = lesson.exercise;
    if (exr) {
      const box = h('div', { class: 'exercise' });
      const hint = h('div', { class: 'tip', html: '💡 ' + exr.hint });
      hint.hidden = true;
      const solvedBtn = h('button', { class: 'btn small' });
      const syncSolved = () => {
        solvedBtn.textContent = state.solved[lesson.id] ? '✓ Solved' : 'I solved it';
        solvedBtn.className = 'btn small ' + (state.solved[lesson.id] ? 'ok' : '');
      };
      syncSolved();
      const pgHost = h('div');
      box.append(
        h('div', { class: 'task', html: exr.task }),
        h('div', { class: 'ex-actions' },
          h('button', { class: 'btn small ghost', onclick: () => { hint.hidden = !hint.hidden; } }, 'Show hint'),
          h('button', { class: 'btn small ghost', onclick: () => {
            if (confirm('Replace your code with the solution? (Your attempt will be overwritten.)')) pg.setCode(exr.solution);
          } }, 'Show solution'),
          h('button', { class: 'btn small ghost', onclick: () => { pg.setCode(exr.starter); } }, 'Start over'),
          solvedBtn),
        hint, pgHost);
      solvedBtn.onclick = () => {
        state.solved[lesson.id] = !state.solved[lesson.id];
        save(); syncSolved();
        if (state.solved[lesson.id]) markDone();
      };
      main.append(h('h2', { class: 'part' }, '🛠 Exercise'), box);
      const pg = Playground.create(pgHost, { code: state.code[lesson.id] ?? exr.starter, lang: exr.lang });
      let t;
      pgHost.addEventListener('input', () => {
        clearTimeout(t);
        t = setTimeout(() => { state.code[lesson.id] = pg.getCode(); save(); }, 400);
      });
    }

    // Syntax-highlight static code blocks (explain, read-only examples, walkthroughs).
    for (const code of main.querySelectorAll('pre code')) {
      if (code.closest('.playground')) continue;
      const m = code.className.match(/language-(\w+)/);
      code.innerHTML = Playground.highlight(code.textContent, m ? m[1] : SITE.defaultLang);
    }

    main.append(h('div', { class: 'pager' },
      prev ? h('a', { class: 'btn ghost', href: '#/' + prev.id }, '← ' + prev.title) : h('span'),
      next ? h('a', { class: 'btn', href: '#/' + next.id }, next.title + ' →') : h('a', { class: 'btn', href: '#/' }, '🎉 Finish')));

    document.title = `${lesson.title} — ${SITE.title}`;
  }

  // ---------- router ----------
  function route() {
    const id = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
    const lesson = byId.get(id);
    if (lesson) { renderLesson(lesson); localStorage.setItem('lr-last', id); } else renderHome();
    renderNav($('#search').value);
    window.scrollTo(0, 0);
    document.body.classList.remove('nav-open');
    const active = document.querySelector('#nav a.active');
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  $('#search').addEventListener('input', (e) => renderNav(e.target.value));
  $('#menu-btn').onclick = () => document.body.classList.toggle('nav-open');
  $('#theme-btn').onclick = () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    localStorage.setItem('lr-theme', t);
  };
  window.addEventListener('hashchange', route);
  document.addEventListener('keydown', (e) => {
    if (e.target.closest('textarea, input')) return;
    const id = location.hash.replace(/^#\//, '');
    const i = LESSONS.findIndex((l) => l.id === id);
    if (e.key === 'ArrowRight' && e.altKey && LESSONS[i + 1]) location.hash = '#/' + LESSONS[i + 1].id;
    if (e.key === 'ArrowLeft' && e.altKey && i > 0) location.hash = '#/' + LESSONS[i - 1].id;
  });

  document.querySelector('.brand').innerHTML = `<span class="logo">${SITE.icon}</span> ${SITE.title}`;
  if (SITE.defaultLang === 'react' && !window.Babel) {
    $('#content').innerHTML = '<div class="warn">Could not load Babel from unpkg.com. Check your internet connection and reload.</div>';
  } else route();
})();
