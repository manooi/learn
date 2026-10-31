// Shared widget library injected into every `html` preview iframe (see runner.js buildDoc).
// Provides:
//   Seq.mount(selector, cfg)  — animated, step-through request/response sequence diagram
//   Auth.*                    — tiny pure-JS crypto + encoding helpers (no crypto.subtle needed)
// Documented in lessons/SCHEMA.md.
// Stored as source text (window.SEQ_LIB_SRC); runner.js inlines it into html iframes.
window.SEQ_LIB_SRC = '(' + function () {
  const LIB_CSS = `
.seq { font: 14px/1.45 system-ui, -apple-system, 'Segoe UI', sans-serif; color: #1f2330; }
.seq * { box-sizing: border-box; }
.seq-title { font-weight: 700; font-size: 15px; margin: 0 0 6px; }
.seq-tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.seq-tabs button { margin: 0; font-size: 13px; }
.seq-tabs button.on { background: #087ea4; color: #fff; border-color: #087ea4; }
.seq-diagram { max-height: 430px; overflow: auto; border: 1px solid #e2e5ee; border-radius: 10px; background: #fbfcfe; position: relative; }
.seq-diagram svg { display: block; width: 100%; max-width: 860px; margin: 0 auto; height: auto; }
.seq-states { display: grid; gap: 6px; margin-top: 6px; }
.seq-state { border: 1px solid #e2e5ee; border-radius: 8px; padding: 4px 7px; background: #fff; font: 11.5px/1.35 ui-monospace, Menlo, monospace; min-height: 26px; overflow-wrap: anywhere; }
.seq-state b { font: 600 11px system-ui, sans-serif; color: #646b80; display: block; margin-bottom: 2px; }
.seq-state .kv { padding: 1px 3px; border-radius: 4px; transition: background .6s; }
.seq-state .kv.new { background: #fff1a8; }
.seq-state .k { color: #8a3ffc; }
.seq-state .empty { color: #a0a6b8; font-style: italic; }
.seq-ctrl { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin: 8px 0 6px; }
.seq-ctrl button { margin: 0; }
.seq-ctrl .count { margin-left: auto; font-size: 12.5px; color: #646b80; }
.seq-ctrl select { margin: 0; font-size: 12.5px; padding: 2px 4px; }
.seq-insp { border: 1px solid #e2e5ee; border-radius: 10px; overflow: hidden; background: #fff; }
.seq-insp-head { padding: 7px 10px; background: #f4f6fa; border-bottom: 1px solid #e2e5ee; font-size: 13px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.seq-badge { font: 700 10.5px system-ui; text-transform: uppercase; letter-spacing: .04em; padding: 2px 7px; border-radius: 99px; color: #fff; }
.seq-note { padding: 8px 10px; font-size: 13.5px; }
.seq-note:empty { display: none; }
.seq-note code, .seq-insp-head code { background: #eef1f6; padding: 0 4px; border-radius: 4px; font-size: 12.5px; }
.seq-msg { margin: 0; padding: 9px 11px; background: #0f1320; color: #d7dcea; font: 12px/1.5 ui-monospace, Menlo, monospace; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 260px; overflow: auto; }
.seq-msg:empty { display: none; }
.seq-msg .l1 { color: #fff; font-weight: 700; }
.seq-msg .hn { color: #7fd6ea; }
.seq-msg .cm { color: #7d869c; font-style: italic; }
.seq-msg mark { background: #f6c945; color: #1b1b1b; border-radius: 3px; padding: 0 2px; }
.seq-hint { font-size: 11.5px; color: #8a90a2; margin-top: 4px; }
@keyframes seqPulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
`;

  const KIND = {
    req:      { color: '#2563eb', name: 'Request' },
    res:      { color: '#16a34a', name: 'Response' },
    redirect: { color: '#ea580c', name: 'Redirect', dash: '7 4' },
    err:      { color: '#dc2626', name: 'Error' },
    self:     { color: '#7c3aed', name: 'Internal' },
    back:     { color: '#0891b2', name: 'Back-channel', dash: '2 3' },
    info:     { color: '#64748b', name: 'Info' },
  };

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  function colorMsg(text, hl) {
    const lines = String(text).split('\n');
    let inBody = false;
    const out = lines.map((ln, i) => {
      let h = esc(ln);
      if (i === 0) return `<span class="l1">${h}</span>`;
      if (ln.trim() === '') { inBody = true; return h; }
      if (/^\s*(#|\/\/)/.test(ln)) return `<span class="cm">${h}</span>`;
      if (!inBody) {
        const m = /^([A-Za-z0-9-]+):(.*)$/.exec(ln);
        if (m) h = `<span class="hn">${esc(m[1])}</span>:${esc(m[2])}`;
      }
      return h;
    }).join('\n');
    if (!hl || !hl.length) return out;
    let res = out;
    for (const word of hl) {
      const w = esc(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // only replace outside of tags
      res = res.replace(new RegExp(`(${w})(?![^<]*>)`, 'g'), '<mark>$1</mark>');
    }
    return res;
  }

  function mount(target, cfg) {
    const root = typeof target === 'string' ? document.querySelector(target) : target;
    const scenarios = cfg.scenarios || [{ name: '', steps: cfg.steps || [] }];
    let sc = 0, cur = -1, timer = null, speed = 1, anim = null;

    root.classList.add('seq');
    root.innerHTML = `
      ${cfg.title ? `<div class="seq-title">${cfg.title}</div>` : ''}
      ${scenarios.length > 1 ? `<div class="seq-tabs"></div>` : ''}
      <div class="seq-diagram"><svg></svg></div>
      <div class="seq-states"></div>
      <div class="seq-ctrl">
        <button data-a="reset" title="Back to start">⏮</button>
        <button data-a="prev" title="Previous step (←)">◀ Back</button>
        <button data-a="next" title="Next step (→)">Next ▶</button>
        <button data-a="play" title="Auto-play">⏵ Play</button>
        <select data-a="speed" title="Animation speed">
          <option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option>
        </select>
        <span class="count"></span>
      </div>
      <div class="seq-insp">
        <div class="seq-insp-head"></div>
        <div class="seq-note"></div>
        <pre class="seq-msg"></pre>
      </div>
      <div class="seq-hint">Tip: click any arrow to jump to it · ← / → keys step</div>`;

    const $ = (s) => root.querySelector(s);
    const svg = $('svg'), statesEl = $('.seq-states'), head = $('.seq-insp-head');
    const noteEl = $('.seq-note'), msgEl = $('.seq-msg'), countEl = $('.count'), diag = $('.seq-diagram');
    const NS = 'http://www.w3.org/2000/svg';
    const W = 760, TOP = 64, ROW = 40;

    const actors = () => scenarios[sc].actors || cfg.actors;
    const steps = () => scenarios[sc].steps;
    const xOf = (id) => {
      const a = actors(), i = a.findIndex((x) => x.id === id);
      if (i < 0) throw new Error(`Seq: unknown actor "${id}"`);
      return ((i + 0.5) * W) / a.length;
    };
    const mk = (tag, attrs, parent) => {
      const e = document.createElementNS(NS, tag);
      for (const k in attrs) e.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(e);
      return e;
    };

    if (scenarios.length > 1) {
      const tabs = $('.seq-tabs');
      scenarios.forEach((s, i) => {
        const b = document.createElement('button');
        b.textContent = s.name;
        b.onclick = () => setScenario(i);
        tabs.appendChild(b);
      });
    }

    function draw() {
      const A = actors(), S = steps();
      const H = TOP + ROW * S.length + 24;
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.innerHTML = '';
      const defs = mk('defs', {});
      for (const k in KIND) {
        const m = mk('marker', { id: 'ah-' + k, viewBox: '0 0 10 10', refX: 9, refY: 5,
          markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
        mk('path', { d: 'M0,0 L10,5 L0,10 z', fill: KIND[k].color }, m);
      }
      A.forEach((a) => {
        const x = xOf(a.id);
        mk('line', { x1: x, y1: 50, x2: x, y2: H - 8, stroke: '#c9cedb', 'stroke-dasharray': '4 4' });
        const bw = Math.min(150, W / A.length - 14);
        mk('rect', { x: x - bw / 2, y: 6, width: bw, height: 42, rx: 10, fill: a.color || '#fff',
          stroke: '#b9c0d0', 'stroke-width': 1.3 });
        const t = mk('text', { x, y: 25, 'text-anchor': 'middle', 'font-size': 17 });
        t.textContent = a.icon || '';
        const t2 = mk('text', { x, y: 42, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: '#1f2330' });
        t2.textContent = a.label;
      });
      S.forEach((s, i) => {
        const y = TOP + ROW * i + 14;
        const k = KIND[s.kind || (s.from === s.to ? 'self' : 'req')] || KIND.req;
        const kk = s.kind || (s.from === s.to ? 'self' : 'req');
        const g = mk('g', { 'data-i': i, style: 'cursor:pointer' });
        g.addEventListener('click', () => { stop(); go(i); });
        const x1 = xOf(s.from), x2 = xOf(s.to);
        let path;
        if (s.from === s.to) {
          path = mk('path', { d: `M${x1},${y - 8} h34 v16 h-30`, fill: 'none', stroke: k.color,
            'stroke-width': 2, 'marker-end': `url(#ah-${kk})` }, g);
        } else {
          const dir = x2 > x1 ? 1 : -1;
          path = mk('line', { x1: x1 + dir * 4, y1: y, x2: x2 - dir * 6, y2: y, stroke: k.color,
            'stroke-width': 2, 'marker-end': `url(#ah-${kk})` }, g);
        }
        if (k.dash) path.setAttribute('stroke-dasharray', k.dash);
        mk('rect', { x: Math.min(x1, x2) - 4, y: y - 20, width: Math.abs(x2 - x1) + 50, height: 28,
          fill: 'transparent' }, g);
        const tx = s.from === s.to ? x1 + 42 : (x1 + x2) / 2;
        const lbl = mk('text', { x: tx, y: y - 6, 'text-anchor': s.from === s.to ? 'start' : 'middle',
          'font-size': 11.5, fill: '#1f2330' }, g);
        lbl.textContent = `${i + 1}. ${s.label || ''}`;
        g.classList.add('st');
      });
      // packet (animated dot)
      mk('circle', { r: 7, cx: -20, cy: -20, fill: '#f59e0b', stroke: '#fff', 'stroke-width': 2, id: 'pkt' });
      statesEl.style.gridTemplateColumns = `repeat(${A.length}, 1fr)`;
    }

    function stateAt(i) {
      const st = {};
      actors().forEach((a) => (st[a.id] = Object.assign({}, a.store || {})));
      const changed = {};
      for (let j = 0; j <= i; j++) {
        const set = steps()[j].set || {};
        for (const id in set) {
          st[id] = st[id] || {};
          for (const key in set[id]) {
            if (set[id][key] === null) delete st[id][key];
            else st[id][key] = set[id][key];
            if (j === i) changed[id + '|' + key] = true;
          }
        }
      }
      return { st, changed };
    }

    function renderStates() {
      const A = actors();
      const anyStore = A.some((a) => a.store) || steps().some((s) => s.set);
      statesEl.style.display = anyStore ? 'grid' : 'none';
      if (!anyStore) return;
      const { st, changed } = stateAt(cur);
      statesEl.innerHTML = A.map((a) => {
        const kv = Object.entries(st[a.id] || {});
        const body = kv.length
          ? kv.map(([k, v]) => `<div class="kv ${changed[a.id + '|' + k] ? 'new' : ''}"><span class="k">${esc(k)}</span>: ${esc(v)}</div>`).join('')
          : '<span class="empty">empty</span>';
        return `<div class="seq-state"><b>${a.icon || ''} ${esc(a.storeLabel || a.label + ' state')}</b>${body}</div>`;
      }).join('');
    }

    function renderStep() {
      const S = steps();
      svg.querySelectorAll('g.st').forEach((g) => {
        const i = +g.dataset.i;
        g.style.opacity = i < cur ? 0.85 : i === cur ? 1 : 0.13;
        g.querySelector('text').setAttribute('font-weight', i === cur ? 700 : 400);
      });
      countEl.textContent = cur < 0 ? `${S.length} steps · press Next ▶` : `Step ${cur + 1} / ${S.length}`;
      $('[data-a=prev]').disabled = cur < 0;
      $('[data-a=next]').disabled = cur >= S.length - 1;
      renderStates();
      if (cur < 0) {
        head.innerHTML = `<span>${cfg.intro || 'Press <b>Next ▶</b> or <b>⏵ Play</b> to send the first message.'}</span>`;
        noteEl.innerHTML = ''; msgEl.innerHTML = '';
        return;
      }
      const s = S[cur];
      const kk = s.kind || (s.from === s.to ? 'self' : 'req');
      const k = KIND[kk] || KIND.req;
      const A = actors();
      const nm = (id) => { const a = A.find((x) => x.id === id); return (a.icon || '') + ' ' + a.label; };
      head.innerHTML = `<span class="seq-badge" style="background:${k.color}">${s.badge || k.name}</span>
        <b>${cur + 1}.</b> ${s.from === s.to ? esc(nm(s.from)) : esc(nm(s.from)) + ' → ' + esc(nm(s.to))}`;
      noteEl.innerHTML = s.note || '';
      msgEl.innerHTML = s.msg ? colorMsg(s.msg, s.hl) : '';
      animate(s);
      const g = svg.querySelector(`g[data-i="${cur}"]`);
      if (g) {
        const y = TOP + ROW * cur;
        const scale = svg.clientWidth / W;
        const py = y * scale;
        if (py < diag.scrollTop + 40 || py > diag.scrollTop + diag.clientHeight - 60) {
          diag.scrollTo({ top: Math.max(0, py - diag.clientHeight / 2), behavior: 'smooth' });
        }
      }
      if (cfg.onStep) cfg.onStep(cur, s);
    }

    function animate(s) {
      cancelAnimationFrame(anim);
      const pkt = svg.querySelector('#pkt');
      const i = cur, y = TOP + ROW * i + 14;
      const x1 = xOf(s.from), x2 = xOf(s.to);
      const kk = s.kind || (s.from === s.to ? 'self' : 'req');
      pkt.setAttribute('fill', (KIND[kk] || KIND.req).color);
      const dur = 700 / speed, t0 = performance.now();
      const frame = (t) => {
        const p = Math.min(1, (t - t0) / dur), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        let cx, cy;
        if (s.from === s.to) {
          // trace the self loop: right, down, left
          const L = 34 + 16 + 30, d = e * L;
          if (d < 34) { cx = x1 + d; cy = y - 8; }
          else if (d < 50) { cx = x1 + 34; cy = y - 8 + (d - 34); }
          else { cx = x1 + 34 - (d - 50); cy = y + 8; }
        } else { cx = x1 + (x2 - x1) * e; cy = y; }
        pkt.setAttribute('cx', cx); pkt.setAttribute('cy', cy);
        pkt.setAttribute('opacity', p >= 1 ? 0 : 1);
        if (p < 1) anim = requestAnimationFrame(frame);
      };
      anim = requestAnimationFrame(frame);
    }

    function go(i) {
      cur = Math.max(-1, Math.min(steps().length - 1, i));
      renderStep();
    }
    function stop() { clearInterval(timer); timer = null; $('[data-a=play]').textContent = '⏵ Play'; }
    function play() {
      if (timer) return stop();
      if (cur >= steps().length - 1) go(-1);
      $('[data-a=play]').textContent = '⏸ Pause';
      go(cur + 1);
      timer = setInterval(() => {
        if (cur >= steps().length - 1) return stop();
        go(cur + 1);
      }, 1900 / speed);
    }
    function setScenario(i) {
      stop(); sc = i; cur = -1;
      root.querySelectorAll('.seq-tabs button').forEach((b, j) => b.classList.toggle('on', j === i));
      draw(); renderStep();
      if (cfg.onScenario) cfg.onScenario(i, scenarios[i]);
    }

    root.querySelector('.seq-ctrl').addEventListener('click', (e) => {
      const a = e.target.dataset && e.target.dataset.a;
      if (a === 'reset') { stop(); go(-1); }
      if (a === 'prev') { stop(); go(cur - 1); }
      if (a === 'next') { stop(); go(cur + 1); }
      if (a === 'play') play();
    });
    $('[data-a=speed]').addEventListener('change', (e) => {
      speed = +e.target.value;
      if (timer) { stop(); play(); }
    });
    if (root.__seqKey) document.removeEventListener('keydown', root.__seqKey);
    if (root.__seqStop) root.__seqStop();
    root.__seqStop = () => { clearInterval(timer); cancelAnimationFrame(anim); };
    root.__seqKey = (e) => {
      if (!root.isConnected) return;
      if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
      if (e.key === 'ArrowRight') { stop(); go(cur + 1); }
      if (e.key === 'ArrowLeft') { stop(); go(cur - 1); }
    };
    document.addEventListener('keydown', root.__seqKey);

    setScenario(cfg.start || 0);
    return { go, play, stop, setScenario, get step() { return cur; } };
  }

  // ---------------- Auth helpers (pure JS, synchronous) ----------------
  const enc = new TextEncoder(), dec = new TextDecoder();
  const toBytes = (x) => (typeof x === 'string' ? enc.encode(x) : x instanceof Uint8Array ? x : new Uint8Array(x));
  const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  const b64 = (x) => { const b = toBytes(x); let s = ''; for (const c of b) s += String.fromCharCode(c); return btoa(s); };
  const b64d = (s) => { const bin = atob(s); return dec.decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))); };
  const b64url = (x) => b64(x).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const b64urlDecode = (s) => { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; return b64d(s); };

  function sha256(data) {
    const m = toBytes(data);
    const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const l = m.length, n = ((l + 9 + 63) >> 6) << 6, p = new Uint8Array(n);
    p.set(m); p[l] = 0x80;
    const dv = new DataView(p.buffer);
    dv.setUint32(n - 4, (l * 8) >>> 0); dv.setUint32(n - 8, Math.floor((l * 8) / 2 ** 32));
    const w = new Uint32Array(64);
    const r = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = r(w[i-15], 7) ^ r(w[i-15], 18) ^ (w[i-15] >>> 3);
        const s1 = r(w[i-2], 17) ^ r(w[i-2], 19) ^ (w[i-2] >>> 10);
        w[i] = (w[i-16] + s0 + w[i-7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = r(e, 6) ^ r(e, 11) ^ r(e, 25), ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
        const S0 = r(a, 2) ^ r(a, 13) ^ r(a, 22), mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), odv = new DataView(out.buffer);
    H.forEach((v, i) => odv.setUint32(i * 4, v));
    return out;
  }

  function hmacSha256(key, msg) {
    let k = toBytes(key);
    if (k.length > 64) k = sha256(k);
    const kp = new Uint8Array(64); kp.set(k);
    const ip = kp.map((x) => x ^ 0x36), op = kp.map((x) => x ^ 0x5c);
    const m = toBytes(msg);
    const inner = new Uint8Array(64 + m.length); inner.set(ip); inner.set(m, 64);
    const ih = sha256(inner);
    const outer = new Uint8Array(96); outer.set(op); outer.set(ih, 64);
    return sha256(outer);
  }

  function md5(str) {
    const m = toBytes(str);
    const s = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
    const K = new Uint32Array(64);
    for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
    const l = m.length, n = ((l + 9 + 63) >> 6) << 6, p = new Uint8Array(n);
    p.set(m); p[l] = 0x80;
    const dv = new DataView(p.buffer);
    dv.setUint32(n - 8, (l * 8) >>> 0, true); dv.setUint32(n - 4, Math.floor((l * 8) / 2 ** 32), true);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let o = 0; o < n; o += 64) {
      const M = []; for (let i = 0; i < 16; i++) M[i] = dv.getUint32(o + i * 4, true);
      let A = a0, B = b0, C = c0, D = d0;
      for (let i = 0; i < 64; i++) {
        let F, g;
        if (i < 16) { F = (B & C) | (~B & D); g = i; }
        else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
        else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * i) % 16; }
        F = (F + A + K[i] + M[g]) >>> 0;
        A = D; D = C; C = B;
        B = (B + ((F << s[i]) | (F >>> (32 - s[i])))) >>> 0;
      }
      a0 = (a0 + A) >>> 0; b0 = (b0 + B) >>> 0; c0 = (c0 + C) >>> 0; d0 = (d0 + D) >>> 0;
    }
    const out = new Uint8Array(16), odv = new DataView(out.buffer);
    [a0, b0, c0, d0].forEach((v, i) => odv.setUint32(i * 4, v, true));
    return hex(out);
  }

  const randHex = (n = 16) => hex(crypto.getRandomValues(new Uint8Array(n)));
  const randB64url = (n = 32) => b64url(crypto.getRandomValues(new Uint8Array(n)));

  function jwtSign(header, payload, secret) {
    const h = b64url(JSON.stringify(header)), p = b64url(JSON.stringify(payload));
    return `${h}.${p}.${b64url(hmacSha256(secret, `${h}.${p}`))}`;
  }
  function jwtDecode(token) {
    const [h, p, s] = String(token).trim().split('.');
    return { header: JSON.parse(b64urlDecode(h)), payload: JSON.parse(b64urlDecode(p)), signature: s };
  }
  function jwtVerify(token, secret) {
    const [h, p, s] = String(token).trim().split('.');
    return b64url(hmacSha256(secret, `${h}.${p}`)) === s;
  }

  window.Seq = { mount, colorMsg, esc };
  window.Auth = {
    b64, b64d, b64url, b64urlDecode, hex,
    sha256: (x) => sha256(x), sha256hex: (x) => hex(sha256(x)), sha256b64url: (x) => b64url(sha256(x)),
    hmacSha256hex: (k, m) => hex(hmacSha256(k, m)), hmacSha256b64: (k, m) => b64(hmacSha256(k, m)),
    hmacSha256b64url: (k, m) => b64url(hmacSha256(k, m)),
    md5, randHex, randB64url, jwtSign, jwtDecode, jwtVerify,
  };
  const st = document.createElement('style');
  st.textContent = LIB_CSS;
  (document.head || document.documentElement).appendChild(st);
}.toString() + ')();';
