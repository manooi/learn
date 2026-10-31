window.LESSONS = window.LESSONS || [];
(function () {
  // Widgets are written as real functions and stringified into the iframe, so they can use
  // template literals freely. W(fn, arg) → HTML fragment that runs fn(rootEl, arg).
  const WCSS = `<style>
.wd{font:14px/1.45 system-ui,-apple-system,'Segoe UI',sans-serif;color:#1f2330}
.wd .card{border:1px solid #e2e5ee;border-radius:10px;padding:10px 12px;background:#fbfcfe;margin:0 0 10px}
.wd .row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.wd .muted{color:#646b80;font-size:13px}
.wd h4{margin:0 0 6px;font-size:15px}
.wd button.on{background:#0f766e;color:#fff;border-color:#0f766e}
.wd button.chk{background:#16a34a;color:#fff;border-color:#16a34a;font-weight:600}
.wd .big{font-size:20px;font-weight:800}
.wd .mono{font-family:ui-monospace,Menlo,monospace}
.wd .flow{stroke-dasharray:6 10;animation:wdfl .6s linear infinite}
@keyframes wdfl{to{stroke-dashoffset:-16}}
.wd table.tt{border-collapse:collapse;font:13px ui-monospace,Menlo,monospace;background:#fff}
.wd table.tt td,.wd table.tt th{border:1px solid #e2e5ee;padding:3px 10px;text-align:center}
.wd table.tt th{background:#f1f4f9;font:600 12px system-ui}
.wd table.tt tr.cur td{background:#fff4c2;font-weight:700}
.wd svg text{font-family:system-ui,-apple-system,'Segoe UI',sans-serif}
</style>`;
  const W = (fn, arg) => `${WCSS}<div class="wd" id="w"></div>
<script>(${fn.toString()})(document.getElementById('w')${arg === undefined ? '' : ', ' + JSON.stringify(arg)});<\/script>`;
  // Circuit: fn(arg) returns the Circ config.
  const C = (fn, arg) => `<div id="c"></div>
<script>Circ.mount('#c', (${fn.toString()})(${arg === undefined ? '' : JSON.stringify(arg)}));<\/script>`;

  // ---------------------------------------------------------------- bits-voltage widgets
  function voltageWidget(root) {
    const FAM = {
      ttl: { name: 'TTL, 5 V (classic 7400 chips)', vdd: 5, vol: 0.4, voh: 2.4, vil: 0.8, vih: 2.0 },
      lv33: { name: 'LVCMOS 3.3 V (microcontrollers, Raspberry Pi GPIO)', vdd: 3.3, vol: 0.2, voh: 3.1, vil: 0.8, vih: 2.0 },
      lv18: { name: 'LVCMOS 1.8 V (phone SoC I/O, flash chips)', vdd: 1.8, vol: 0.45, voh: 1.35, vil: 0.63, vih: 1.17 },
      core: { name: '≈1.0 V CPU core (illustrative)', vdd: 1.0, vol: 0.1, voh: 0.9, vil: 0.35, vih: 0.65 },
    };
    root.innerHTML = `
<div class="card"><div class="row"><b>Logic family</b>
  <select id="fam">${Object.entries(FAM).map(([k, f]) => `<option value="${k}">${f.name}</option>`).join('')}</select></div>
  <div class="muted" id="rules" style="margin-top:4px"></div></div>
<div class="card"><h4>① Probe one wire: drag the voltage</h4>
  <div class="row"><input type="range" id="probe" min="0" max="1" step="0.001" style="width:380px">
  <span class="big mono" id="pv"></span><span class="big" id="pr"></span></div>
  <svg id="gauge" viewBox="0 0 720 54" width="720" height="54"></svg></div>
<div class="card"><h4>② Send bits down a noisy wire</h4>
  <div class="row">Bits <input id="bits" class="mono" value="10110010" size="10" maxlength="16">
  Noise ± <input type="range" id="noise" min="0" max="1" step="0.005" value="0.04" style="width:220px"> <b class="mono" id="nv"></b>
  <button id="reroll">🎲 New noise</button></div>
  <svg id="plot" viewBox="0 0 720 250" width="720" height="250"></svg>
  <div id="res" style="font-weight:600"></div></div>`;
    const $ = (s) => root.querySelector(s);
    let rnd = [];
    const reroll = () => { rnd = Array.from({ length: 16 * 24 }, () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1); };
    reroll();
    let fam = FAM.ttl, probe = 0.3;
    const read = (v) => (v >= fam.vih ? '1' : v <= fam.vil ? '0' : '?');
    function draw() {
      $('#rules').innerHTML = `Receiver reads <b>0</b> at ≤ ${fam.vil} V, <b>1</b> at ≥ ${fam.vih} V, anything between is <b style="color:#b91c1c">undefined</b>.
        Sender promises its 0 ≤ ${fam.vol} V and its 1 ≥ ${fam.voh} V. Noise margins: low ${(fam.vil - fam.vol).toFixed(2)} V, high ${(fam.voh - fam.vih).toFixed(2)} V.`;
      // probe gauge
      const v = probe * fam.vdd, x = (u) => 10 + (u / fam.vdd) * 700;
      const r = read(v);
      $('#pv').textContent = v.toFixed(2) + ' V';
      $('#pr').innerHTML = r === '?' ? '→ <span style="color:#b91c1c">⚠ undefined (forbidden zone)</span>' : `→ receiver reads <span style="color:${r === '1' ? '#15803d' : '#1d4ed8'}">${r}</span>`;
      $('#gauge').innerHTML = `<rect x="${x(0)}" y="8" width="${x(fam.vil) - x(0)}" height="22" fill="#dbeafe"/>
        <rect x="${x(fam.vil)}" y="8" width="${x(fam.vih) - x(fam.vil)}" height="22" fill="#fee2e2"/>
        <rect x="${x(fam.vih)}" y="8" width="${x(fam.vdd) - x(fam.vih)}" height="22" fill="#dcfce7"/>
        <text x="${(x(0) + x(fam.vil)) / 2}" y="24" text-anchor="middle" font-size="12" fill="#1d4ed8">reads 0</text>
        <text x="${(x(fam.vil) + x(fam.vih)) / 2}" y="24" text-anchor="middle" font-size="12" fill="#b91c1c">undefined</text>
        <text x="${(x(fam.vih) + x(fam.vdd)) / 2}" y="24" text-anchor="middle" font-size="12" fill="#15803d">reads 1</text>
        ${[0, fam.vil, fam.vih, fam.vdd].map((u) => `<text x="${x(u)}" y="46" text-anchor="middle" font-size="11" fill="#64748b">${u} V</text>`).join('')}
        <path d="M${x(v)} 4 V34" stroke="#111" stroke-width="3"/><circle cx="${x(v)}" cy="4" r="4" fill="#111"/>`;
      // noisy line
      const bits = ($('#bits').value.replace(/[^01]/g, '') || '0').slice(0, 16).split('');
      const nb = bits.length, spb = 24, N = nb * spb;
      const amp = +$('#noise').value * fam.vdd * 0.5;
      $('#nv').textContent = amp.toFixed(2) + ' V';
      const X = (i) => 50 + (i / N) * 660, Y = (u) => 14 + (1 - u / fam.vdd) * 170;
      let s = `<rect x="50" y="${Y(fam.vil)}" width="660" height="${Y(0) - Y(fam.vil)}" fill="#dbeafe" opacity=".7"/>
        <rect x="50" y="${Y(fam.vih)}" width="660" height="${Y(fam.vil) - Y(fam.vih)}" fill="#fee2e2" opacity=".8"/>
        <rect x="50" y="${Y(fam.vdd)}" width="660" height="${Y(fam.vih) - Y(fam.vdd)}" fill="#dcfce7" opacity=".7"/>`;
      for (const [u, t] of [[fam.voh, 'sender 1 ≥ VOH'], [fam.vol, 'sender 0 ≤ VOL']]) s += `<path d="M50 ${Y(u)} H710" stroke="#64748b" stroke-dasharray="4 4"/><text x="706" y="${Y(u) - 3}" text-anchor="end" font-size="10.5" fill="#475569">${t}</text>`;
      for (const u of [0, fam.vil, fam.vih, fam.vdd]) s += `<text x="44" y="${Y(u) + 4}" text-anchor="end" font-size="10.5" fill="#64748b">${u}V</text>`;
      const pts = [];
      for (let i = 0; i < N; i++) {
        const b = bits[Math.floor(i / spb)];
        pts.push(X(i) + ',' + Y(Math.max(-0.1 * fam.vdd, Math.min(fam.vdd * 1.1, (b === '1' ? fam.voh : fam.vol) + amp * rnd[i]))));
      }
      s += `<polyline points="${pts.join(' ')}" fill="none" stroke="#7c3aed" stroke-width="1.6"/>`;
      let ok = 0;
      bits.forEach((b, k) => {
        const i = k * spb + spb / 2;
        const v2 = (b === '1' ? fam.voh : fam.vol) + amp * rnd[i];
        const rd = read(v2);
        if (rd === b) ok++;
        const col = rd === b ? '#15803d' : '#dc2626';
        s += `<circle cx="${X(i)}" cy="${Y(Math.max(-0.1 * fam.vdd, Math.min(fam.vdd * 1.1, v2)))}" r="4.5" fill="${col}" stroke="#fff"/>`;
        s += `<text x="${X(i)}" y="215" text-anchor="middle" font-size="13" font-weight="700" fill="#334155">${b}</text>`;
        s += `<text x="${X(i)}" y="238" text-anchor="middle" font-size="13" font-weight="700" fill="${col}">${rd}</text>`;
      });
      s += `<text x="44" y="215" text-anchor="end" font-size="11" fill="#64748b">sent</text><text x="44" y="238" text-anchor="end" font-size="11" fill="#64748b">read</text>`;
      $('#plot').innerHTML = s;
      const margin = Math.min(fam.vil - fam.vol, fam.voh - fam.vih);
      $('#res').innerHTML = ok === nb
        ? `<span style="color:#15803d">✅ All ${nb} bits read correctly.</span> <span class="muted">Noise ±${amp.toFixed(2)} V vs smallest noise margin ${margin.toFixed(2)} V.</span>`
        : `<span style="color:#dc2626">⚠ ${nb - ok} of ${nb} bits wrong or undefined (red dots).</span> <span class="muted">Noise ±${amp.toFixed(2)} V is bigger than the ${margin.toFixed(2)} V noise margin.</span>`;
    }
    $('#fam').onchange = (e) => { fam = FAM[e.target.value]; draw(); };
    $('#probe').value = probe;
    $('#probe').oninput = (e) => { probe = +e.target.value; draw(); };
    $('#noise').oninput = draw;
    $('#bits').oninput = draw;
    $('#reroll').onclick = () => { reroll(); draw(); };
    draw();
  }

  function copyWidget(root) {
    root.innerHTML = `
<div class="card"><div class="row"><b>Copies made:</b> <input type="range" id="k" min="0" max="30" value="0" style="width:260px"> <b id="kv" class="mono"></b>
  <button id="one">📠 Copy again</button> <button id="rs">↺ Back to original</button>
  <span style="margin-left:10px">Noise per copy ± <input type="range" id="sg" min="0" max="0.25" step="0.005" value="0.05" style="width:140px"> <b id="sv" class="mono"></b></span></div>
  <div class="muted">Each copy (like re-recording a cassette, or passing a signal through another chip) adds a little random noise.</div></div>
<div class="row" style="align-items:flex-start">
  <div class="card" style="flex:1"><h4>Analog: the value IS the voltage</h4><svg id="a" viewBox="0 0 440 170" width="100%"></svg><div id="ar"></div></div>
  <div class="card" style="flex:1"><h4>Digital: only "above or below the middle" matters</h4><svg id="d" viewBox="0 0 440 170" width="100%"></svg><div id="dr"></div></div>
</div>`;
    const $ = (s) => root.querySelector(s);
    const N = 128, STAGES = 30;
    const bits = '1011001110001011'.split('').map(Number);
    const orig = { a: [], d: [] };
    for (let i = 0; i < N; i++) {
      orig.a.push(0.5 + 0.28 * Math.sin((2 * Math.PI * i) / 48) + 0.12 * Math.sin((2 * Math.PI * i) / 15));
      orig.d.push(bits[Math.floor(i / 8)]);
    }
    const noise = Array.from({ length: STAGES }, () => Array.from({ length: N }, () => (Math.random() + Math.random() + Math.random()) / 1.5 - 1));
    function at(k, sg) {
      let a = orig.a.slice(), d = orig.d.slice();
      for (let s = 0; s < k; s++) {
        a = a.map((v, i) => v + sg * noise[s][i]);
        d = d.map((v, i) => (v + sg * noise[s][i] > 0.5 ? 1 : 0)); // regenerate: snap back to clean 0/1
      }
      return { a, d };
    }
    const X = (i) => 30 + (i / (N - 1)) * 400, Y = (v) => 150 - v * 130;
    const line = (arr, col, w, dash) => `<polyline points="${arr.map((v, i) => X(i) + ',' + Y(Math.max(-0.1, Math.min(1.1, v)))).join(' ')}" fill="none" stroke="${col}" stroke-width="${w}" ${dash ? 'stroke-dasharray="4 3"' : ''}/>`;
    const axes = `<path d="M30 ${Y(0)} H430 M30 ${Y(1)} H430" stroke="#e2e5ee"/><path d="M30 ${Y(0.5)} H430" stroke="#fca5a5" stroke-dasharray="3 3"/>
      <text x="26" y="${Y(0) + 4}" text-anchor="end" font-size="10" fill="#64748b">0</text><text x="26" y="${Y(1) + 4}" text-anchor="end" font-size="10" fill="#64748b">1</text>`;
    function draw() {
      const k = +$('#k').value, sg = +$('#sg').value;
      $('#kv').textContent = k;
      $('#sv').textContent = sg.toFixed(3);
      const r = at(k, sg);
      $('#a').innerHTML = axes + line(orig.a, '#94a3b8', 1.5, true) + line(r.a, '#7c3aed', 2);
      $('#d').innerHTML = axes + line(orig.d, '#94a3b8', 1.5, true) + line(r.d, '#0f766e', 2);
      const err = Math.sqrt(r.a.reduce((s, v, i) => s + (v - orig.a[i]) ** 2, 0) / N);
      const wrong = bits.filter((b, j) => r.d[j * 8 + 4] !== b).length;
      $('#ar').innerHTML = `Average error: <b>${err.toFixed(3)}</b> ${k ? (err > 0.08 ? '<span style="color:#dc2626">(the song is getting hissy)</span>' : '(drifting…)') : '(perfect original)'}`;
      $('#dr').innerHTML = `Bits wrong: <b style="color:${wrong ? '#dc2626' : '#15803d'}">${wrong} of 16</b> ${wrong ? '(noise exceeded the margin, a bit flipped)' : '✅ identical to the original'}`;
    }
    $('#k').oninput = draw; $('#sg').oninput = draw;
    $('#one').onclick = () => { $('#k').value = Math.min(STAGES, +$('#k').value + 1); draw(); };
    $('#rs').onclick = () => { $('#k').value = 0; draw(); };
    draw();
  }

  function classifyWidget(root, preset) {
    const ITEMS = [
      ['TTL', 0.3, '0'], ['TTL', 1.2, '?'], ['TTL', 2.7, '1'], ['TTL', 0.9, '?'], ['TTL', 4.6, '1'], ['TTL', 1.95, '?'],
      ['1.0 V core', 0.2, '0'], ['1.0 V core', 0.5, '?'], ['1.0 V core', 0.8, '1'],
    ];
    const pick = preset ? ITEMS.map((it) => it[2]) : ITEMS.map(() => null);
    root.innerHTML = `<div class="card"><b>Receiver rules</b>
  <div class="muted">TTL (5 V): reads 0 at ≤ 0.8 V · reads 1 at ≥ 2.0 V · in between = undefined<br>
  1.0 V CPU core: reads 0 at ≤ 0.35 V · reads 1 at ≥ 0.65 V · in between = undefined</div></div>
  <div class="card" id="list"></div>
  <div class="row"><button class="chk" id="chk">✔ Check</button></div><div class="circ-result" id="out"></div>`;
    const list = root.querySelector('#list');
    function draw() {
      list.innerHTML = ITEMS.map(([f, v], i) => `<div class="row" style="margin:3px 0"><span style="width:250px">#${i + 1} ${f} wire at <b class="mono">${v} V</b> reads…</span>
        ${['0', '1', '?'].map((o) => `<button data-i="${i}" data-o="${o}" class="${pick[i] === o ? 'on' : ''}">${o === '?' ? '? undefined' : o}</button>`).join('')}</div>`).join('');
    }
    list.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; pick[+b.dataset.i] = b.dataset.o; draw(); };
    root.querySelector('#chk').onclick = () => {
      const wrong = ITEMS.map((it, i) => (pick[i] === it[2] ? 0 : i + 1)).filter(Boolean);
      const out = root.querySelector('#out');
      if (!wrong.length) { out.className = 'circ-result ok'; out.textContent = '✅ All 9 correct! You think like a logic input.'; console.log('✅ All voltages classified correctly'); }
      else { out.className = 'circ-result bad'; out.textContent = '❌ Not yet: check #' + wrong.join(', #') + '. Compare each voltage with the two thresholds.'; console.log('❌ wrong: ' + wrong.join(',')); }
    };
    draw();
  }

  // ---------------------------------------------------------------- binary-numbers widgets
  function bitFlipper(root) {
    root.innerHTML = `<div class="card"><div id="cells" class="row" style="gap:6px"></div>
  <div class="row" style="margin-top:8px"><button id="inc">+1</button><button id="dec">−1</button><button id="shl" title="shift left = ×2">≪ shift left (×2)</button><button id="shr">≫ shift right (÷2)</button><button id="clr">clear</button><button id="all">all ones</button></div></div>
<div class="card"><div class="row" style="gap:28px">
  <div><div class="muted">Decimal</div><div class="big mono" id="dec-v"></div></div>
  <div><div class="muted">Hex (each 4-bit nibble → one digit)</div><div class="big mono" id="hex-v"></div></div>
  <div><div class="muted">Sum of place values</div><div class="mono" id="sum"></div></div></div></div>
<div class="card"><div class="muted">Nibble → hex digit (highlighted = digits in use)</div><div id="hexref" class="row mono" style="gap:4px;font-size:12px"></div></div>`;
    const $ = (s) => root.querySelector(s);
    let v = 42;
    const nib = (n) => n.toString(2).padStart(4, '0');
    function draw() {
      let h = '';
      for (let k = 7; k >= 0; k--) {
        const on = (v >> k) & 1;
        h += `<div style="text-align:center;${k === 3 ? 'margin-left:14px' : ''}"><div class="muted mono">${1 << k}</div>
          <button data-k="${k}" style="width:54px;height:54px;font:800 22px ui-monospace,monospace;${on ? 'background:#16a34a;color:#fff;border-color:#15803d' : ''}">${on}</button>
          <div class="muted" style="font-size:11px">2<sup>${k}</sup> · bit ${k}</div></div>`;
      }
      $('#cells').innerHTML = h;
      $('#dec-v').textContent = v;
      $('#hex-v').innerHTML = `<span style="color:#7c3aed">${nib(v >> 4)}</span> <span style="color:#0f766e">${nib(v & 15)}</span> → 0x<span style="color:#7c3aed">${(v >> 4).toString(16).toUpperCase()}</span><span style="color:#0f766e">${(v & 15).toString(16).toUpperCase()}</span>`;
      const terms = [];
      for (let k = 7; k >= 0; k--) if ((v >> k) & 1) terms.push(1 << k);
      $('#sum').textContent = (terms.join(' + ') || '0') + ' = ' + v;
      $('#hexref').innerHTML = [...Array(16)].map((_, d) => `<span style="padding:2px 6px;border-radius:5px;border:1px solid #e2e5ee;${d === v >> 4 || d === (v & 15) ? 'background:#fff4c2;font-weight:700' : ''}">${nib(d)}=${d.toString(16).toUpperCase()}</span>`).join('');
    }
    $('#cells').onclick = (e) => { const b = e.target.closest('button'); if (b) { v ^= 1 << +b.dataset.k; draw(); } };
    $('#inc').onclick = () => { v = (v + 1) & 255; draw(); };
    $('#dec').onclick = () => { v = (v + 255) & 255; draw(); };
    $('#shl').onclick = () => { v = (v << 1) & 255; draw(); };
    $('#shr').onclick = () => { v = v >> 1; draw(); };
    $('#clr').onclick = () => { v = 0; draw(); };
    $('#all').onclick = () => { v = 255; draw(); };
    draw();
  }

  function wildWidget(root) {
    root.innerHTML = `<div class="row" style="margin-bottom:8px"><button data-t="col" class="on">🎨 Colours</button><button data-t="ip">🌐 IPv4 address</button><button data-t="sz">📦 How many values?</button></div><div id="p"></div>`;
    const $ = (s) => root.querySelector(s);
    const bin8 = (n) => n.toString(2).padStart(8, '0');
    const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, '0');
    const st = { rgb: [255, 136, 0], ip: [192, 168, 1, 10], n: 8 };
    const tabs = {
      col() {
        $('#p').innerHTML = `<div class="card"><div class="row" style="align-items:flex-start;gap:20px"><div id="sw" style="width:120px;height:120px;border-radius:12px;border:1px solid #ccc"></div><div id="ch"></div></div>
          <div class="muted" style="margin-top:6px">CSS colour <span class="mono">#RRGGBB</span> = 3 bytes = 24 bits → 2<sup>24</sup> = 16,777,216 colours. Each pair of hex digits is one byte (0–255) of red, green, blue light.</div></div>`;
        const draw = () => {
          $('#sw').style.background = '#' + st.rgb.map(hex2).join('');
          $('#ch').innerHTML = `<div class="big mono">#${st.rgb.map((c, i) => `<span style="color:${['#dc2626', '#16a34a', '#2563eb'][i]}">${hex2(c)}</span>`).join('')}</div>` +
            ['Red', 'Green', 'Blue'].map((n, i) => `<div class="row mono" style="margin:4px 0"><span style="width:50px;font-family:system-ui">${n}</span><input type="range" min="0" max="255" value="${st.rgb[i]}" data-i="${i}" style="width:200px"><span style="width:34px">${st.rgb[i]}</span><span>= 0x${hex2(st.rgb[i])}</span><span>= ${bin8(st.rgb[i])}</span></div>`).join('');
        };
        $('#p').oninput = (e) => { if (e.target.dataset.i) { st.rgb[+e.target.dataset.i] = +e.target.value; draw(); } };
        draw();
      },
      ip() {
        $('#p').innerHTML = `<div class="card"><div id="ipin" class="row mono"></div><div id="ipb" class="mono" style="margin-top:8px;font-size:15px"></div>
          <div class="muted" style="margin-top:6px">An IPv4 address is one 32-bit number written as 4 bytes in decimal. 2<sup>32</sup> = 4,294,967,296 addresses, which the world ran out of, so IPv6 uses 128 bits.</div></div>`;
        const draw = () => {
          $('#ipin').innerHTML = st.ip.map((b, i) => `<input type="number" min="0" max="255" value="${b}" data-i="${i}" style="width:70px">`).join('<b>.</b>');
          $('#ipb').innerHTML = st.ip.map((b) => bin8(b)).join(' . ') + `<br>= one number: <b>${(st.ip[0] * 16777216 + st.ip[1] * 65536 + st.ip[2] * 256 + st.ip[3]).toLocaleString()}</b> (hex 0x${st.ip.map(hex2).join('')})`;
        };
        $('#p').onchange = (e) => { if (e.target.dataset.i) { st.ip[+e.target.dataset.i] = Math.max(0, Math.min(255, +e.target.value | 0)); draw(); } };
        draw();
      },
      sz() {
        $('#p').innerHTML = `<div class="card"><div class="row">Number of bits <input type="range" id="n" min="1" max="64" value="${st.n}" style="width:300px"> <b id="nv" class="big mono"></b></div><div id="sr" style="margin-top:6px"></div></div>`;
        const EX = { 1: 'a yes/no flag', 4: 'one hex digit', 7: 'ASCII characters', 8: 'one byte: a pixel channel, a character in a UTF-8 text file', 10: '1 KiB = 1024 bytes', 16: 'a 16-bit sample of CD audio', 24: 'every CSS colour', 32: 'every IPv4 address; a 32-bit int', 64: 'a 64-bit CPU register / pointer' };
        const draw = () => {
          const n = +$('#n').value; st.n = n;
          $('#nv').textContent = n;
          const v = 2n ** BigInt(n);
          $('#sr').innerHTML = `${n} bits → 2<sup>${n}</sup> = <b class="mono">${v.toLocaleString()}</b> different patterns. Biggest unsigned value: <span class="mono">${(v - 1n).toLocaleString()}</span>.<br><span class="muted">${EX[n] ? 'Example: ' + EX[n] : 'Every extra bit doubles the count.'}</span>`;
        };
        $('#n').oninput = draw; draw();
      },
    };
    root.querySelector('.row').onclick = (e) => {
      const b = e.target.closest('button[data-t]'); if (!b) return;
      root.querySelectorAll('button[data-t]').forEach((x) => x.classList.toggle('on', x === b));
      $('#p').oninput = null; $('#p').onchange = null;
      tabs[b.dataset.t]();
    };
    tabs.col();
  }

  function byteTargets(root, preset) {
    const T = [['42 (decimal)', 42], ['0xA7 (hex)', 0xa7], ['the GREEN byte of the colour #FF8800', 0x88]];
    const vals = preset ? T.map((t) => t[1]) : [0, 0, 0];
    root.innerHTML = `<div id="rows"></div><div class="row"><button class="chk" id="chk">✔ Check</button></div><div class="circ-result" id="out"></div>`;
    const rows = root.querySelector('#rows');
    function draw() {
      rows.innerHTML = T.map(([name], r) => `<div class="card"><div class="row"><b style="width:320px">Row ${r + 1}: make ${name}</b>
        ${[7, 6, 5, 4, 3, 2, 1, 0].map((k) => `<button data-r="${r}" data-k="${k}" title="place value ${1 << k}" style="width:38px;font:700 16px ui-monospace,monospace;${(vals[r] >> k) & 1 ? 'background:#16a34a;color:#fff' : ''}">${(vals[r] >> k) & 1}</button>`).join('')}
        <span class="mono muted">= ${vals[r]}</span></div></div>`).join('');
    }
    rows.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; vals[+b.dataset.r] ^= 1 << +b.dataset.k; draw(); };
    root.querySelector('#chk').onclick = () => {
      const bad = T.map((t, r) => (vals[r] === t[1] ? 0 : r + 1)).filter(Boolean);
      const out = root.querySelector('#out');
      if (!bad.length) { out.className = 'circ-result ok'; out.textContent = '✅ All three bytes are right!'; console.log('✅ bytes correct'); }
      else { out.className = 'circ-result bad'; out.textContent = '❌ Row ' + bad.join(', ') + ' not right yet. (The widget only shows decimal, so convert hex in your head!)'; console.log('❌ rows ' + bad.join(',')); }
    };
    draw();
  }

  // ---------------------------------------------------------------- transistor widgets
  function mosWidget(root) {
    const VDD = 1.0, VTH = 0.35;
    root.innerHTML = `<div class="row" style="align-items:stretch">${['n', 'p'].map((t) => `
  <div class="card" style="flex:1;min-width:330px"><h4>${t === 'n' ? 'nMOS: ON when gate is HIGH' : 'pMOS: ON when gate is LOW (note the ○ bubble)'}</h4>
    <svg id="s${t}" viewBox="0 0 300 270" width="300" height="270"></svg>
    <div class="row"><button data-t="${t}" data-v="0">Gate = 0 V</button><button data-t="${t}" data-v="1">Gate = 1.0 V</button></div>
    <div class="row"><span>V<sub>G</sub></span> <input type="range" min="0" max="1" step="0.01" data-t="${t}" style="width:200px"><b class="mono" id="v${t}"></b></div>
    <div id="r${t}" style="min-height:42px"></div></div>`).join('')}</div>
  <div class="muted">Threshold voltage V<sub>th</sub> ≈ ${VTH} V (typical modern value is a few tenths of a volt). Supply VDD = ${VDD} V.</div>`;
    const g = { n: 0, p: 0 };
    const lamp = (cx, cy, on) => `${on ? `<circle cx="${cx}" cy="${cy}" r="28" fill="#fde047" opacity=".45"/>` : ''}<circle cx="${cx}" cy="${cy}" r="18" fill="${on ? '#fde047' : '#f1f5f9'}" stroke="#334155" stroke-width="2"/>
      <path d="M${cx - 9} ${cy - 9} L${cx + 9} ${cy + 9} M${cx + 9} ${cy - 9} L${cx - 9} ${cy + 9}" stroke="#334155" stroke-width="1.5"/><text x="${cx + 26}" y="${cy + 4}" font-size="12" fill="#475569">lamp</text>`;
    const gnd = (x, y) => `<path d="M${x - 16} ${y} H${x + 16} M${x - 10} ${y + 6} H${x + 10} M${x - 4} ${y + 12} H${x + 4}" stroke="#334155" stroke-width="2"/><text x="${x + 22}" y="${y + 8}" font-size="12" fill="#475569">GND (0 V)</text>`;
    function fet(t, y0, on, vg) { // channel from y0 to y0+60 at x=180
      const c = on ? '#16a34a' : '#cbd5e1';
      let s = `<rect x="176" y="${y0}" width="8" height="60" rx="2" fill="${c}"/>`;
      s += `<path d="M162 ${y0 + 5} V${y0 + 55}" stroke="#334155" stroke-width="3"/>`;
      if (t === 'p') s += `<circle cx="155" cy="${y0 + 30}" r="5" fill="#fff" stroke="#334155" stroke-width="2"/><path d="M150 ${y0 + 30} H80" stroke="${vg > 0.5 ? '#16a34a' : '#94a3b8'}" stroke-width="2.5"/>`;
      else s += `<path d="M162 ${y0 + 30} H80" stroke="${vg > 0.5 ? '#16a34a' : '#94a3b8'}" stroke-width="2.5"/>`;
      s += `<circle cx="74" cy="${y0 + 30}" r="7" fill="${vg > 0.5 ? '#16a34a' : '#fff'}" stroke="#334155" stroke-width="2"/><text x="60" y="${y0 + 35}" text-anchor="end" font-size="13" font-weight="700">G</text>`;
      s += `<text x="100" y="${y0 + 24}" font-size="11" fill="#475569">${vg.toFixed(2)} V</text>`;
      s += `<text x="192" y="${y0 + 34}" font-size="11.5" fill="${on ? '#15803d' : '#64748b'}" font-weight="700">${on ? 'channel ON' : 'channel OFF'}</text>`;
      return s;
    }
    function draw() {
      for (const t of ['n', 'p']) {
        const vg = g[t], on = t === 'n' ? vg > VTH : vg < VDD - VTH;
        const wc = on ? '#16a34a' : '#94a3b8';
        let s = `<path d="M100 20 H260" stroke="#dc2626" stroke-width="3"/><text x="100" y="14" font-size="12" fill="#dc2626" font-weight="700">VDD +1.0 V</text>`;
        if (t === 'n') {
          s += `<path d="M180 20 V62 M180 98 V130 M180 190 V232" stroke="${wc}" stroke-width="2.5" fill="none"/>`;
          s += lamp(180, 80, on) + fet('n', 130, on, vg) + gnd(180, 232);
          s += `<text x="190" y="128" font-size="11" fill="#475569">D (drain)</text><text x="190" y="204" font-size="11" fill="#475569">S (source)</text>`;
          if (on) s += `<path class="flow" d="M180 20 V232" stroke="#facc15" stroke-width="3" fill="none"/>`;
        } else {
          s += `<path d="M180 20 V40 M180 100 V142 M180 178 V232" stroke="${wc}" stroke-width="2.5" fill="none"/>`;
          s += fet('p', 40, on, vg) + lamp(180, 160, on) + gnd(180, 232);
          s += `<text x="190" y="38" font-size="11" fill="#475569">S (source)</text><text x="190" y="114" font-size="11" fill="#475569">D (drain)</text>`;
          if (on) s += `<path class="flow" d="M180 20 V232" stroke="#facc15" stroke-width="3" fill="none"/>`;
        }
        root.querySelector('#s' + t).innerHTML = s;
        root.querySelector('#v' + t).textContent = vg.toFixed(2) + ' V';
        root.querySelector('input[data-t="' + t + '"]').value = vg;
        root.querySelector('#r' + t).innerHTML = t === 'n'
          ? `V<sub>G</sub> = ${vg.toFixed(2)} V ${on ? '&gt;' : '≤'} V<sub>th</sub> ${VTH} V → <b style="color:${on ? '#15803d' : '#64748b'}">${on ? 'switch CLOSED, current flows, lamp ON' : 'switch OPEN, no current, lamp off'}</b>`
          : `V<sub>G</sub> = ${vg.toFixed(2)} V ${on ? '&lt;' : '≥'} VDD − V<sub>th</sub> = ${(VDD - VTH).toFixed(2)} V → <b style="color:${on ? '#15803d' : '#64748b'}">${on ? 'switch CLOSED, current flows, lamp ON' : 'switch OPEN, no current, lamp off'}</b>`;
        root.querySelectorAll('button[data-t="' + t + '"]').forEach((b) => b.classList.toggle('on', +b.dataset.v === vg));
      }
    }
    root.onclick = (e) => { const b = e.target.closest('button[data-t]'); if (b) { g[b.dataset.t] = +b.dataset.v; draw(); } };
    root.oninput = (e) => { if (e.target.dataset.t) { g[e.target.dataset.t] = +e.target.value; draw(); } };
    draw();
  }

  function mooreWidget(root) {
    const D = [
      [1971, 'Intel 4004', 2300, 'first commercial microprocessor, for a calculator'],
      [1975, 'MOS 6502', 3510, 'Apple II; variants ran the Commodore 64 and NES'],
      [1978, 'Intel 8086', 29000, 'the first x86, ancestor of today\'s PC CPUs'],
      [1985, 'Intel 80386', 275000, '32-bit x86'],
      [1993, 'Intel Pentium', 3100000, ''],
      [2000, 'Pentium 4', 42000000, ''],
      [2006, 'Core 2 Duo', 291000000, 'dual-core laptops and desktops'],
      [2020, 'Apple M1', 16000000000, 'MacBook Air (2020)'],
      [2022, 'Apple M1 Ultra', 114000000000, 'two M1 Max dies joined together'],
      [2024, 'NVIDIA B200', 208000000000, 'AI accelerator GPU, two dies'],
    ];
    root.innerHTML = `<div class="card"><h4>Transistors per chip (log scale: each grid line = 10× more)</h4><svg id="m" viewBox="0 0 760 330" width="760" height="330"></svg>
      <div id="info" style="min-height:24px;font-weight:600">Hover or click a dot.</div>
      <div class="muted">Dashed line: Moore's law, "double every 2 years", starting from the 4004. 1947's first transistor was a single hand-built device about the size of your thumb.</div></div>`;
    const X = (y) => 70 + ((y - 1968) / (2027 - 1968)) * 670, Y = (n) => 300 - ((Math.log10(n) - 3) / 9) * 280;
    let s = '';
    for (let e = 3; e <= 12; e++) s += `<path d="M70 ${Y(10 ** e)} H740" stroke="#e2e5ee"/><text x="64" y="${Y(10 ** e) + 4}" text-anchor="end" font-size="10.5" fill="#64748b">${['1 thousand', '10k', '100k', '1 million', '10M', '100M', '1 billion', '10B', '100B', '1 trillion'][e - 3]}</text>`;
    for (let y = 1970; y <= 2025; y += 10) s += `<text x="${X(y)}" y="320" text-anchor="middle" font-size="11" fill="#64748b">${y}</text>`;
    s += `<path d="M${X(1971)} ${Y(2300)} L${X(2025)} ${Y(2300 * 2 ** ((2025 - 1971) / 2))}" stroke="#f59e0b" stroke-width="2" stroke-dasharray="6 5"/>`;
    D.forEach((d, i) => { s += `<g data-i="${i}" style="cursor:pointer"><circle cx="${X(d[0])}" cy="${Y(d[2])}" r="7" fill="#2563eb" stroke="#fff" stroke-width="2"/><text x="${X(d[0]) + (i > 6 ? -10 : 10)}" y="${Y(d[2]) + (i > 6 ? -10 : 4)}" text-anchor="${i > 6 ? 'end' : 'start'}" font-size="11.5" fill="#1e293b">${d[1]}</text></g>`; });
    root.querySelector('#m').innerHTML = s;
    const show = (e) => { const g = e.target.closest('[data-i]'); if (!g) return; const d = D[+g.dataset.i]; root.querySelector('#info').innerHTML = `${d[0]} · ${d[1]}: <span class="mono">${d[2].toLocaleString()}</span> transistors${d[3] ? ' · ' + d[3] : ''}`; };
    root.querySelector('#m').onmouseover = show; root.querySelector('#m').onclick = show;
  }

  function switchPuzzle(root, preset) {
    const CIR = [
      { name: '① one nMOS', want: 1, g: [0], on: (g) => g[0] },
      { name: '② one pMOS', want: 1, g: [1], on: (g) => !g[0] },
      { name: '③ two nMOS in series', want: 1, g: [0, 0], on: (g) => g[0] && g[1] },
      { name: '④ two nMOS in parallel', want: 0, g: [1, 0], on: (g) => g[0] || g[1] },
    ];
    if (preset) { CIR[0].g = [1]; CIR[1].g = [0]; CIR[2].g = [1, 1]; CIR[3].g = [0, 0]; }
    root.innerHTML = `<div class="row" id="cs" style="align-items:stretch"></div><div class="row"><button class="chk" id="chk">✔ Check</button></div><div class="circ-result" id="out"></div>`;
    const fet = (x, y, t, on, v, i, k, side) => {
      const d = side === 'R' ? 1 : -1, px = x + 14 * d;
      let s = `<rect x="${x - 4}" y="${y}" width="8" height="50" rx="2" fill="${on ? '#16a34a' : '#cbd5e1'}"/><path d="M${px} ${y + 4} V${y + 46}" stroke="#334155" stroke-width="3"/>`;
      const lx = t === 'p' ? px + 10 * d : px;
      if (t === 'p') s += `<circle cx="${px + 6 * d}" cy="${y + 25}" r="4.5" fill="#fff" stroke="#334155" stroke-width="2"/>`;
      s += `<path d="M${lx} ${y + 25} H${x + 44 * d}" stroke="#334155" stroke-width="2"/>`;
      s += `<g data-i="${i}" data-k="${k}" style="cursor:pointer"><circle cx="${x + 56 * d}" cy="${y + 25}" r="12" fill="${v ? '#16a34a' : '#fff'}" stroke="#334155" stroke-width="2"/><text x="${x + 56 * d}" y="${y + 30}" text-anchor="middle" font-size="13" font-weight="800" fill="${v ? '#fff' : '#334155'}">${v}</text></g>`;
      s += `<text x="${x + 56 * d}" y="${y + 52}" text-anchor="middle" font-size="10" fill="#64748b">${t}MOS</text>`;
      return s;
    };
    const lamp = (x, y, on) => `${on ? `<circle cx="${x}" cy="${y}" r="24" fill="#fde047" opacity=".5"/>` : ''}<circle cx="${x}" cy="${y}" r="15" fill="${on ? '#fde047' : '#f1f5f9'}" stroke="#334155" stroke-width="2"/><path d="M${x - 7} ${y - 7} L${x + 7} ${y + 7} M${x + 7} ${y - 7} L${x - 7} ${y + 7}" stroke="#334155" stroke-width="1.5"/>`;
    const gnd = (x, y) => `<path d="M${x - 14} ${y} H${x + 14} M${x - 9} ${y + 5} H${x + 9} M${x - 4} ${y + 10} H${x + 4}" stroke="#334155" stroke-width="2"/>`;
    function draw() {
      root.querySelector('#cs').innerHTML = CIR.map((c, i) => {
        const on = !!c.on(c.g), w = (p) => `<path d="${p}" stroke="${on ? '#16a34a' : '#94a3b8'}" stroke-width="2.5" fill="none"/>`;
        let s = `<path d="M60 18 H200" stroke="#dc2626" stroke-width="3"/><text x="60" y="12" font-size="11" fill="#dc2626" font-weight="700">VDD</text>`;
        if (i === 0) s += w('M130 18 V50 M130 80 V110 M130 160 V225') + lamp(130, 65, on) + fet(130, 110, 'n', c.g[0], c.g[0], i, 0, 'L') + gnd(130, 225);
        if (i === 1) s += w('M130 18 V40 M130 90 V140 M130 170 V225') + fet(130, 40, 'p', !c.g[0], c.g[0], i, 0, 'L') + lamp(130, 155, on) + gnd(130, 225);
        if (i === 2) s += w('M130 18 V40 M130 70 V90 M130 140 V160 M130 210 V228') + lamp(130, 55, on) + fet(130, 90, 'n', c.g[0], c.g[0], i, 0, 'L') + fet(130, 160, 'n', c.g[1], c.g[1], i, 1, 'L') + gnd(130, 228);
        if (i === 3) s += w('M130 18 V40 M130 70 V100 M90 100 H170 M90 100 V110 M170 100 V110 M90 160 V175 M170 160 V175 M90 175 H170 M130 175 V225') + lamp(130, 55, on) + fet(90, 110, 'n', c.g[0], c.g[0], i, 0, 'L') + fet(170, 110, 'n', c.g[1], c.g[1], i, 1, 'R') + gnd(130, 225);
        const good = on === !!c.want;
        return `<div class="card" style="width:184px;padding:8px"><b>${c.name}</b><div class="muted">Goal: lamp <b>${c.want ? 'ON 💡' : 'OFF'}</b></div>
          <svg viewBox="0 0 250 245" width="184" height="180" data-c="${i}">${s}</svg>
          <div style="font-weight:600;color:${good ? '#15803d' : '#b45309'}">Lamp is ${on ? 'ON' : 'off'} ${good ? '✓' : ''}</div></div>`;
      }).join('');
    }
    root.querySelector('#cs').onclick = (e) => { const g = e.target.closest('[data-k]'); if (!g) return; CIR[+g.dataset.i].g[+g.dataset.k] ^= 1; draw(); };
    root.querySelector('#chk').onclick = () => {
      const bad = CIR.map((c, i) => (!!c.on(c.g) === !!c.want ? 0 : i + 1)).filter(Boolean);
      const out = root.querySelector('#out');
      if (!bad.length) { out.className = 'circ-result ok'; out.textContent = '✅ All four lamps match their goals.'; console.log('✅ all lamps correct'); }
      else { out.className = 'circ-result bad'; out.textContent = '❌ Circuit ' + bad.join(', ') + ' not matching its goal yet.'; console.log('❌ circuits ' + bad.join(',')); }
    };
    draw();
  }

  // ---------------------------------------------------------------- CMOS inverter widget
  function cmosWidget(root) {
    const VTH = 0.35;
    root.innerHTML = `<div class="row" style="align-items:flex-start">
  <div class="card"><svg id="s" viewBox="0 0 500 330" width="500" height="330"></svg>
    <div class="row"><button id="b0">IN = 0 (0 V)</button><button id="b1">IN = 1 (1.0 V)</button></div>
    <div class="row"><span>V<sub>in</sub></span> <input type="range" id="sl" min="0" max="1" step="0.01" style="width:240px"><b class="mono" id="vv"></b></div></div>
  <div style="flex:1;min-width:250px"><div class="card"><h4>What's happening</h4><div id="r"></div></div>
    <div class="card"><h4>Transfer curve: V<sub>out</sub> vs V<sub>in</sub></h4><svg id="vtc" viewBox="0 0 240 200" width="240" height="200"></svg></div></div></div>`;
    const $ = (s) => root.querySelector(s);
    let vin = 0, flash = null, flashT = null;
    const vout = (x) => 1 / (1 + Math.exp((x - 0.5) / 0.035));
    function fet(t, y0, on, part) {
      const c = on ? (part ? '#f59e0b' : '#16a34a') : '#cbd5e1';
      let s = `<rect x="256" y="${y0}" width="8" height="56" rx="2" fill="${c}"/><path d="M242 ${y0 + 4} V${y0 + 52}" stroke="#334155" stroke-width="3"/>`;
      if (t === 'p') s += `<circle cx="235" cy="${y0 + 28}" r="5" fill="#fff" stroke="#334155" stroke-width="2"/>`;
      s += `<text x="276" y="${y0 + 24}" font-size="12" font-weight="700" fill="#334155">${t === 'p' ? 'pMOS (pull-up)' : 'nMOS (pull-down)'}</text>`;
      s += `<text x="276" y="${y0 + 40}" font-size="11.5" font-weight="700" fill="${on ? (part ? '#b45309' : '#15803d') : '#64748b'}">${on ? (part ? 'partly ON' : 'ON (closed)') : 'OFF (open)'}</text>`;
      return s;
    }
    function draw() {
      const pOn = vin < 1 - VTH, nOn = vin > VTH, both = pOn && nOn, vo = vout(vin);
      const inC = vin > 0.5 ? '#16a34a' : '#94a3b8', outC = vo > 0.5 ? '#16a34a' : '#94a3b8';
      let s = `<path d="M160 22 H330" stroke="#dc2626" stroke-width="3"/><text x="160" y="15" font-size="12" font-weight="700" fill="#dc2626">VDD = 1.0 V</text>`;
      s += `<path d="M260 22 V52 M260 108 V165" stroke="${pOn ? '#16a34a' : '#94a3b8'}" stroke-width="2.5"/>`;
      s += `<path d="M260 165 V222 M260 278 V300" stroke="${nOn ? '#2563eb' : '#94a3b8'}" stroke-width="2.5"/>`;
      s += fet('p', 52, pOn, both) + fet('n', 222, nOn, both);
      s += `<path d="M250 300 H270 M254 306 H266 M258 312 H262" stroke="#334155" stroke-width="2"/><text x="276" y="312" font-size="12" fill="#475569">GND 0 V</text>`;
      // input
      s += `<path d="M70 165 H170 M170 80 V250 M170 80 H230 M170 250 H242" stroke="${inC}" stroke-width="2.5" fill="none"/>`;
      s += `<circle cx="62" cy="165" r="9" fill="${inC}" stroke="#334155" stroke-width="2"/><text x="62" y="148" text-anchor="middle" font-size="13" font-weight="800">IN</text><text x="62" y="192" text-anchor="middle" font-size="11.5">${vin.toFixed(2)} V</text>`;
      // output + load cap
      s += `<path d="M260 165 H458 M410 165 V200 M410 210 V240" stroke="${outC}" stroke-width="2.5" fill="none"/><circle cx="260" cy="165" r="4" fill="${outC}"/><circle cx="410" cy="165" r="3.5" fill="${outC}"/>`;
      s += `<path d="M396 200 H424 M396 210 H424" stroke="#334155" stroke-width="3"/><path d="M402 240 H418 M406 245 H414" stroke="#334155" stroke-width="2"/><text x="430" y="203" font-size="10.5" fill="#64748b">C: wire +</text><text x="430" y="216" font-size="10.5" fill="#64748b">next gates</text>`;
      s += `<circle cx="470" cy="165" r="11" fill="${vo > 0.5 ? '#ef4444' : '#e2e8f0'}" stroke="#334155" stroke-width="2"/><text x="470" y="146" text-anchor="middle" font-size="13" font-weight="800">OUT</text><text x="350" y="157" text-anchor="middle" font-size="11.5" font-weight="700">${vo.toFixed(2)} V</text>`;
      if (both) s += `<path class="flow" d="M260 22 V300" stroke="#ef4444" stroke-width="4" fill="none"/>`;
      else if (flash === 'up') s += `<path class="flow" d="M260 22 V165 H410 V200" stroke="#facc15" stroke-width="4" fill="none"/>`;
      else if (flash === 'down') s += `<path class="flow" d="M410 200 V165 H260 V300" stroke="#facc15" stroke-width="4" fill="none"/>`;
      $('#s').innerHTML = s;
      $('#vv').textContent = vin.toFixed(2) + ' V';
      $('#sl').value = vin;
      $('#b0').classList.toggle('on', vin === 0); $('#b1').classList.toggle('on', vin === 1);
      const lvl = vo > 0.65 ? '<b style="color:#15803d">1</b>' : vo < 0.35 ? '<b>0</b>' : '<b style="color:#b91c1c">undefined</b>';
      $('#r').innerHTML = `<div>pMOS: <b>${pOn ? 'ON' : 'OFF'}</b> (its gate is ${pOn ? 'low enough' : 'high'}) · nMOS: <b>${nOn ? 'ON' : 'OFF'}</b></div>
        <div>OUT is connected to <b>${both ? 'BOTH rails (fighting!)' : pOn ? 'VDD through the pMOS' : 'GND through the nMOS'}</b> → ${vo.toFixed(2)} V = logic ${lvl}</div>
        <div style="margin-top:6px">${both ? '<b style="color:#dc2626">⚠ Both transistors partly on: current flows straight from VDD to GND. Wasted power and heat. Real inputs only pass through this zone briefly while switching.</b>' : '<span style="color:#15803d">✓ No path from VDD to GND (one switch is always open), so holding this state draws almost no current.</span>'}</div>
        <div class="muted" style="margin-top:6px">${flash ? '⚡ Switching: the yellow dots are the brief current that ' + (flash === 'up' ? 'charges' : 'discharges') + ' the output capacitance C. This is where CMOS spends its energy.' : 'Click IN = 0 / IN = 1 to watch the switching current.'}</div>`;
      let v = '<path d="M30 10 V170 H230" stroke="#94a3b8" fill="none"/>';
      v += `<rect x="${30 + VTH * 200}" y="10" width="${(1 - 2 * VTH) * 200}" height="160" fill="#fee2e2" opacity=".7"/><text x="130" y="24" text-anchor="middle" font-size="10" fill="#b91c1c">both partly on</text>`;
      let d = '';
      for (let i = 0; i <= 100; i++) { const x = i / 100; d += (i ? ' L' : 'M') + (30 + x * 200) + ' ' + (170 - vout(x) * 160); }
      v += `<path d="${d}" fill="none" stroke="#7c3aed" stroke-width="2"/><circle cx="${30 + vin * 200}" cy="${170 - vo * 160}" r="6" fill="#111"/>`;
      v += `<text x="130" y="190" text-anchor="middle" font-size="10.5" fill="#64748b">V_in 0 → 1.0 V</text><text x="24" y="14" text-anchor="end" font-size="10" fill="#64748b">1V</text><text x="24" y="172" text-anchor="end" font-size="10" fill="#64748b">0</text>`;
      $('#vtc').innerHTML = v;
    }
    function setIn(v) {
      const before = vout(vin) > 0.5;
      vin = v;
      const after = vout(vin) > 0.5;
      if (before !== after) { flash = after ? 'up' : 'down'; clearTimeout(flashT); flashT = setTimeout(() => { flash = null; draw(); }, 1400); }
      draw();
    }
    $('#b0').onclick = () => setIn(0); $('#b1').onclick = () => setIn(1);
    $('#sl').oninput = (e) => setIn(+e.target.value);
    draw();
  }

  // ---------------------------------------------------------------- series / parallel widget
  function seriesWidget(root) {
    root.innerHTML = `<div class="row" style="margin-bottom:6px"><button id="ms" class="on">Series (one after another)</button><button id="mp">Parallel (side by side)</button></div>
  <div class="row" style="align-items:flex-start"><div class="card"><svg id="s" viewBox="0 0 470 250" width="470" height="250"></svg><div class="muted">Click switch A or B to flip it.</div></div>
  <div class="card"><h4 id="name"></h4><table class="tt" id="tt"></table><div class="muted" id="rule" style="max-width:220px;margin-top:6px"></div></div></div>`;
    const $ = (s) => root.querySelector(s);
    let mode = 's', a = 0, b = 0;
    const sw = (x, y, closed, lab, live) => `<g data-sw="${lab}" style="cursor:pointer"><rect x="${x - 6}" y="${y - 34}" width="72" height="46" fill="transparent"/>
      <circle cx="${x}" cy="${y}" r="4" fill="#334155"/><circle cx="${x + 60}" cy="${y}" r="4" fill="#334155"/>
      <path d="M${x} ${y} L${closed ? x + 60 : x + 52} ${closed ? y : y - 26}" stroke="${live ? '#16a34a' : '#334155'}" stroke-width="4" stroke-linecap="round"/>
      <text x="${x + 30}" y="${y - 30}" text-anchor="middle" font-size="14" font-weight="800" fill="${closed ? '#15803d' : '#334155'}">${lab} = ${closed ? 1 : 0}</text></g>`;
    function draw() {
      const on = mode === 's' ? a && b : a || b;
      const c = on ? '#16a34a' : '#94a3b8';
      let s = `<path d="M40 110 V60 H${mode === 's' ? 130 : 110}" stroke="${c}" stroke-width="2.5" fill="none"/><path d="M40 130 V220 H400 V162" stroke="${c}" stroke-width="2.5" fill="none"/>`;
      s += `<path d="M24 110 H56" stroke="#334155" stroke-width="3"/><path d="M32 122 H48" stroke="#334155" stroke-width="5"/><text x="8" y="100" font-size="12" font-weight="700" fill="#dc2626">+</text><text x="64" y="128" font-size="11" fill="#64748b">battery</text>`;
      if (mode === 's') {
        s += `<path d="M190 60 H250 M310 60 H400 V118" stroke="${c}" stroke-width="2.5" fill="none"/>`;
        s += sw(130, 60, a, 'A', on) + sw(250, 60, b, 'B', on);
        if (on) s += `<path class="flow" d="M40 110 V60 H400 V118" stroke="#facc15" stroke-width="3" fill="none"/>`;
      } else {
        s += `<path d="M110 60 V40 H190 M110 60 V110 H190 M250 40 H330 V110 H250 M330 60 H400 V118" stroke="${c}" stroke-width="2.5" fill="none"/>`;
        s += sw(190, 40, a, 'A', on && a) + sw(190, 110, b, 'B', on && b);
        if (a) s += `<path class="flow" d="M40 110 V60 H110 V40 H330 V60 H400 V118" stroke="#facc15" stroke-width="3" fill="none"/>`;
        if (b) s += `<path class="flow" d="M40 110 V60 H110 V110 H330 V60 H400 V118" stroke="#facc15" stroke-width="3" fill="none"/>`;
      }
      if (on) s += `<path class="flow" d="M400 162 V220 H40 V130" stroke="#facc15" stroke-width="3" fill="none"/>`;
      s += `${on ? '<circle cx="400" cy="140" r="34" fill="#fde047" opacity=".45"/>' : ''}<circle cx="400" cy="140" r="22" fill="${on ? '#fde047' : '#f1f5f9'}" stroke="#334155" stroke-width="2"/><path d="M389 129 L411 151 M411 129 L389 151" stroke="#334155" stroke-width="1.5"/><text x="432" y="145" font-size="13" font-weight="700">lamp</text>`;
      $('#s').innerHTML = s;
      $('#name').innerHTML = mode === 's' ? 'Series = <span style="color:#0f766e">AND</span>' : 'Parallel = <span style="color:#0f766e">OR</span>';
      $('#tt').innerHTML = '<tr><th>A</th><th>B</th><th>lamp</th></tr>' + [[0, 0], [0, 1], [1, 0], [1, 1]].map(([x, y]) => `<tr class="${x === a && y === b ? 'cur' : ''}"><td>${x}</td><td>${y}</td><td>${mode === 's' ? x & y : x | y}</td></tr>`).join('');
      $('#rule').textContent = mode === 's' ? 'Current must pass through A AND B. One open switch breaks the loop.' : 'Current can take path A OR path B. Any closed switch completes the loop.';
      $('#ms').classList.toggle('on', mode === 's'); $('#mp').classList.toggle('on', mode === 'p');
    }
    $('#s').onclick = (e) => { const g = e.target.closest('[data-sw]'); if (!g) return; if (g.dataset.sw === 'A') a ^= 1; else b ^= 1; draw(); };
    $('#ms').onclick = () => { mode = 's'; draw(); }; $('#mp').onclick = () => { mode = 'p'; draw(); };
    draw();
  }

  // ---------------------------------------------------------------- Circ configs
  function notCfg() {
    return {
      title: 'NOT gate (the CMOS inverter as one symbol) and two NOTs in a row',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 40 },
        { id: 'n1', type: 'NOT', x: 140, y: 40 },
        { id: 'n2', type: 'NOT', x: 280, y: 100 },
        { id: 'y', type: 'OUT', label: 'NOT A', x: 440, y: 40 },
        { id: 'z', type: 'OUT', label: 'NOT NOT A', x: 440, y: 100 },
      ],
      wires: [['a', 'n1'], ['n1', 'y'], ['n1', 'n2', { mx: 240 }], ['n2', 'z']],
    };
  }
  function notEx(sol) {
    const cfg = {
      build: { palette: ['NOT'], best: 2 },
      target: ({ A }) => ({ P: A ^ 1, Q: A }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 150 },
        { id: 'p', type: 'OUT', label: 'P', x: 660, y: 80 },
        { id: 'q', type: 'OUT', label: 'Q', x: 660, y: 220 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'n1', type: 'NOT', x: 220, y: 150 }, { id: 'n2', type: 'NOT', x: 420, y: 220 });
      cfg.wires = [['a', 'n1'], ['n1', 'p'], ['n1', 'n2'], ['n2', 'q']];
    }
    return cfg;
  }
  function andOrCfg() {
    return {
      title: 'The same two switches, as gates',
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 20, y: 0 },
        { id: 'b', type: 'IN', label: 'B', x: 20, y: 100 },
        { id: 'g1', type: 'AND', x: 160, y: 10, label: 'AND (series)' },
        { id: 'g2', type: 'OR', x: 160, y: 70, label: 'OR (parallel)' },
        { id: 'y1', type: 'OUT', label: 'A AND B', x: 300, y: 20 },
        { id: 'y2', type: 'OUT', label: 'A OR B', x: 300, y: 80 },
      ],
      wires: [['a', 'g1.0', { mx: 100 }], ['b', 'g1.1', { mx: 120 }], ['a', 'g2.0', { mx: 100 }], ['b', 'g2.1', { mx: 120 }], ['g1', 'y1'], ['g2', 'y2']],
    };
  }
  function vaultEx(sol) {
    const cfg = {
      build: { palette: ['AND', 'OR'], best: 2 },
      target: ({ A, B, M }) => ({ OPEN: (A & B) | M }),
      parts: [
        { id: 'a', type: 'IN', label: 'A', x: 40, y: 50 },
        { id: 'b', type: 'IN', label: 'B', x: 40, y: 130 },
        { id: 'm', type: 'IN', label: 'M', x: 40, y: 250 },
        { id: 't1', type: 'TEXT', text: 'keys A and B, or Master code M', x: 20, y: 340 },
        { id: 'o', type: 'OUT', label: 'OPEN', x: 640, y: 140 },
      ],
      wires: [],
    };
    if (sol) {
      cfg.parts.push({ id: 'g1', type: 'AND', x: 200, y: 90 }, { id: 'g2', type: 'OR', x: 380, y: 140 });
      cfg.wires = [['a', 'g1.0'], ['b', 'g1.1'], ['g1', 'g2.0'], ['m', 'g2.1'], ['g2', 'o']];
    }
    return cfg;
  }

  window.LESSONS.push(
    // =============================================================== bits-voltage
    {
      id: 'bits-voltage',
      section: 'Foundations',
      title: 'Bits are voltages',
      explain: `
<p>In code a bit is an abstract <code>0</code> or <code>1</code>. Inside a chip there is no "1" anywhere, only <strong>wires at different voltages</strong>. A wire near the supply voltage (called <strong>VDD</strong>) means <strong>1</strong>. A wire near 0 V (ground, <strong>GND</strong>) means <strong>0</strong>.</p>
<p>The trick that makes computers reliable: a receiver doesn't care about the <em>exact</em> voltage, only which <strong>range</strong> it falls in. Think "is the glass more than about half full?" rather than "how many millilitres exactly?".</p>
<ul>
  <li><strong>Reads 0</strong>: anything at or below a low threshold, <code>V<sub>IL</sub></code> (input-low).</li>
  <li><strong>Reads 1</strong>: anything at or above a high threshold, <code>V<sub>IH</sub></code> (input-high).</li>
  <li><strong>Forbidden zone</strong> in between: the receiver might see 0, 1, or flicker. Good circuits only pass through it briefly while switching.</li>
</ul>
<h3>Noise margins: the safety buffer</h3>
<p>Senders promise <em>better</em> levels than receivers need: a 1 is at least <code>V<sub>OH</sub></code> and a 0 is at most <code>V<sub>OL</sub></code>. The gap between what is sent and what is needed is the <strong>noise margin</strong>. For classic 5 V TTL: the sender's 1 is ≥ 2.4 V, the receiver needs only ≥ 2.0 V, so up to 0.4 V of noise (crosstalk from a neighbouring wire, a motor starting, a bounce on the ground line) can't corrupt the bit.</p>
<h3>Why digital beats analog</h3>
<p>In an analog signal the voltage <em>is</em> the information, so every bit of noise becomes part of the signal forever, and copies of copies get worse (think photocopy of a photocopy). In a digital circuit every gate <strong>regenerates</strong> the signal: it reads "that's a 1" and outputs a fresh, clean 1. Noise smaller than the margin is simply thrown away at every step. That's why a file copied a million times is still bit-perfect.</p>
<div class="tip">Software analogy: the thresholds are like <code>if (v &gt;= 2.0) return 1; if (v &lt;= 0.8) return 0; else return undefined;</code>. Hardware designers work hard so the <code>undefined</code> branch never happens when it's read.</div>
<div class="warn">Mixing families can break things: a 5 V output into a 3.3 V-only input (like a Raspberry Pi GPIO pin) can damage it. Level shifters translate between voltage families.</div>
<div class="world">
<ul>
<li><strong>5 V TTL</strong>: the 7400-series logic chips of the 1960s–80s (and Arduino Uno's 5 V I/O) use the thresholds in the demo: 0 ≤ 0.8 V, 1 ≥ 2.0 V.</li>
<li><strong>3.3 V and 1.8 V</strong>: microcontrollers (ESP32, Raspberry Pi GPIO) run at 3.3 V; phone chips and flash memory often talk at 1.8 V.</li>
<li><strong>~1 V CPU cores</strong>: a modern laptop or phone CPU core runs at roughly 0.7–1.3 V and changes it on the fly (DVFS) to save power.</li>
<li><strong>Why lower is better</strong>: the energy to flip a wire is about C·V², so dropping from 5 V to 1 V cuts switching energy about 25×. That's why chips keep lowering voltage.</li>
<li><strong>USB</strong>: supplies 5 V of power, but USB 2.0 High-Speed data travels as tiny ~400 mV differential swings. The receiver compares two wires instead of one wire against ground, which cancels noise.</li>
</ul></div>`,
      examples: [
        {
          title: 'A digital receiver: probe a wire, then add noise',
          code: W(voltageWidget),
          explain: `
<details><summary>Try this</summary>
<ol>
<li>In ①, drag the probe slowly from 0 V upward. Watch the readout jump from <b>reads 0</b> to <b>⚠ undefined</b> at 0.8 V and to <b>reads 1</b> at 2.0 V (TTL).</li>
<li>In ②, push <b>Noise ±</b> up until red dots appear. With TTL the first errors appear just above <b>±0.40 V</b>, exactly the noise margin printed above. Click <b>🎲 New noise</b> a few times near that value: sometimes it survives, sometimes not.</li>
<li>Switch the family to <b>LVCMOS 1.8 V</b>. The same slider position now gives far more errors: its margins are only about 0.18 V. Lower voltage saves power but leaves less room for noise, so chip designers must keep wires quieter.</li>
</ol></details>`,
        },
        {
          title: 'Copy of a copy: analog drifts, digital regenerates',
          code: W(copyWidget),
          explain: `
<details><summary>Try this</summary>
<p>Click <b>📠 Copy again</b> ten or more times. The analog wave (left) wanders further from the dashed original with every copy, and nothing can tell which wiggles were noise. The digital line (right) stays identical, because every copy snaps each sample back to a clean 0 or 1 (that's the regenerate step).</p>
<p>Now raise <b>Noise per copy</b> to about 0.2 and copy 30 times. Eventually a bit flips on the digital side too: when a single copy's noise is larger than the margin (0.5 here), even digital fails. Engineering is about keeping noise well under the margin.</p></details>`,
        },
      ],
      quiz: [
        { q: 'A TTL receiver (0 at ≤ 0.8 V, 1 at ≥ 2.0 V) sees 1.4 V. What does it read?', options: ['0', '1', 'Undefined: it is in the forbidden zone', '1.4'], answer: 2, why: '1.4 V is between V<sub>IL</sub> = 0.8 V and V<sub>IH</sub> = 2.0 V, so the reading is not guaranteed.' },
        { q: 'A sender guarantees its 1 is ≥ 2.4 V and the receiver needs ≥ 2.0 V. What is the high noise margin?', options: ['2.4 V', '0.4 V', '2.0 V', '4.4 V'], answer: 1, why: 'Noise margin = V<sub>OH</sub> − V<sub>IH</sub> = 2.4 − 2.0 = 0.4 V of noise can be tolerated.' },
        { q: 'Why can a digital file be copied a million times without degrading?', options: ['Digital wires have no noise', 'Each stage regenerates clean levels, discarding noise smaller than the margin', 'Copies use higher voltage', 'Errors cancel out on average'], answer: 1, why: 'Noise exists everywhere. Digital wins because every gate restores the signal to a clean 0 or 1.' },
        { q: 'Why do modern CPUs run their cores at about 1 V rather than 5 V?', options: ['1 V is easier to measure', 'Switching energy grows with V², so lower voltage means much less power and heat', 'Transistors only work at 1 V', 'To increase noise margin'], answer: 1, why: 'Energy per switch ∝ C·V². The trade-off is smaller noise margins.' },
      ],
      exercise: {
        task: `<p>Be the receiver. For each wire below, decide what a logic input reads: <b>0</b>, <b>1</b>, or <b>? undefined</b>. Click your answers in the box below and click <b>✔ Check</b>.</p>`,
        hint: 'At or below V<sub>IL</sub> → 0. At or above V<sub>IH</sub> → 1. Strictly between → undefined. 1.95 V is just short of 2.0 V.',
        starter: W(classifyWidget, false),
        solution: W(classifyWidget, true),
      },
    },
    // =============================================================== binary-numbers
    {
      id: 'binary-numbers',
      section: 'Foundations',
      title: 'Counting in binary & hex',
      explain: `
<p>One wire holds one bit: 0 or 1. Put several wires side by side and their pattern is a <strong>number</strong>. It works exactly like decimal, except each place is worth <strong>2×</strong> the one to its right instead of 10×.</p>
<pre><code>place value:  128  64  32  16   8   4   2   1
bits:           0   0   1   0   1   0   1   0
                       32   +   8   +   2      = 42</code></pre>
<ul>
<li>The rightmost bit is bit 0, the <strong>least significant bit</strong> (LSB). Bit k is worth 2<sup>k</sup>.</li>
<li>With n bits you get 2<sup>n</sup> patterns: 0 … 2<sup>n</sup> − 1. 8 bits = 1 <strong>byte</strong> = 0 … 255.</li>
<li>Counting up is like an odometer: <code>0111 + 1 = 1000</code>. The 1s roll over and carry left. You'll build a circuit that does exactly this later.</li>
<li>Shifting all bits left one place doubles the number (<code>x &lt;&lt; 1</code> in code), just like adding a 0 in decimal multiplies by 10.</li>
</ul>
<h3>Hexadecimal: binary in short-hand</h3>
<p>Long bit strings are hard to read, so we group them in fours. A 4-bit group (a <strong>nibble</strong>) has 16 values, written <code>0–9</code> then <code>A–F</code> (A = 10 … F = 15). One hex digit = exactly 4 bits, so a byte is always two hex digits: <code>0010 1010</code> = <code>0x2A</code> = 42. The <code>0x</code> prefix just says "this is hex".</p>
<div class="tip">You already use hex: <code>#FF8800</code> in CSS, <code>0xFF</code> masks in code, memory addresses in stack traces, MAC addresses like <code>a4:83:e7:…</code>.</div>
<div class="world">
<ul>
<li><strong>Colours</strong>: <code>#FF8800</code> is three bytes: red 0xFF = 255, green 0x88 = 136, blue 0x00 = 0. 24 bits → 16.7 million colours.</li>
<li><strong>IPv4</strong>: <code>192.168.1.10</code> is one 32-bit number written as 4 bytes. 2<sup>32</sup> ≈ 4.3 billion addresses ran out in the 2010s, so IPv6 uses 128 bits.</li>
<li><strong>File sizes</strong>: memory comes in powers of two, so 1 KiB = 2<sup>10</sup> = 1024 bytes, while disk makers use 1 KB = 1000 bytes. That's why a "1 TB" drive shows up as about 931 GiB.</li>
</ul></div>`,
      examples: [
        { title: 'Bit flipper: click bits, watch decimal and hex', code: W(bitFlipper) },
        { title: 'Bits in the wild: colours, IP addresses, sizes', code: W(wildWidget) },
      ],
      quiz: [
        { q: 'What is binary <code>1101</code> in decimal?', options: ['11', '13', '1101', '14'], answer: 1, why: '8 + 4 + 0 + 1 = 13.' },
        { q: 'How many different values can 8 bits represent?', options: ['8', '128', '255', '256'], answer: 3, why: '2<sup>8</sup> = 256 patterns, from 0 to 255.' },
        { q: 'What is <code>0xFF</code> in decimal?', options: ['15', '255', '256', '100'], answer: 1, why: 'F = 15, so 15 × 16 + 15 = 255, which is 1111 1111: a byte with every bit set.' },
        { q: 'Which hex digit is the nibble <code>1010</code>?', options: ['A', '10', 'B', '5'], answer: 0, why: '1010 = 8 + 2 = 10 = A.' },
        { q: 'What does shifting <code>0000 0101</code> left by one place give?', options: ['0000 0010 (2)', '0000 1010 (10)', '0000 0110 (6)', '1000 0010'], answer: 1, why: 'Every bit moves up to a place worth twice as much: 5 × 2 = 10.' },
      ],
      exercise: {
        task: `<p>Set the bits in each row to make the requested byte, then click <b>✔ Check</b>. The rows show decimal only, so you'll have to convert the hex yourself.</p>`,
        hint: '42 = 32 + 8 + 2. For hex, convert each digit to 4 bits: A = 1010, 7 = 0111. #FF8800 → the middle pair 88 is green: 8 = 1000.',
        starter: W(byteTargets, false),
        solution: W(byteTargets, true),
      },
    },
    // =============================================================== transistor-switch
    {
      id: 'transistor-switch',
      section: 'Foundations',
      title: 'The transistor is a switch',
      explain: `
<p>Every gate, adder and CPU in this course is made of one component repeated billions of times: the <strong>MOSFET</strong> (metal-oxide-semiconductor field-effect transistor). For digital logic you can think of it as a <strong>switch that is flipped by a voltage instead of a finger</strong>.</p>
<p>It has three terminals:</p>
<ul>
<li><strong>Gate (G)</strong>: the control input. It's separated from the rest by a thin insulating layer, so almost no current flows into it. It works by electric field alone, like a magnet pulling a door shut without touching it.</li>
<li><strong>Source (S)</strong> and <strong>drain (D)</strong>: the two ends of the switch. When the transistor is on, a conducting <strong>channel</strong> forms between them.</li>
</ul>
<p>There are two complementary types:</p>
<table><tr><th></th><th>Gate = 1 (high)</th><th>Gate = 0 (low)</th><th>Good at passing</th></tr>
<tr><td><strong>nMOS</strong></td><td>ON (closed)</td><td>OFF (open)</td><td>a strong 0 (connects to GND)</td></tr>
<tr><td><strong>pMOS</strong> (drawn with a ○ bubble)</td><td>OFF (open)</td><td>ON (closed)</td><td>a strong 1 (connects to VDD)</td></tr></table>
<p>Real transistors are analog devices: the channel turns on gradually once the gate passes a <strong>threshold voltage</strong> (V<sub>th</sub>). Digital design only drives gates fully low or fully high, so the transistor is either clearly open or clearly closed.</p>
<div class="tip">Software analogy: an nMOS is <code>if (gate) connect(drain, source)</code>. A pMOS is <code>if (!gate) connect(…)</code>. Next lesson you'll pair them to build NOT.</div>
<div class="world">
<ul>
<li><strong>1947</strong>: John Bardeen, Walter Brattain and William Shockley at Bell Labs built the first transistor (a point-contact germanium device), which earned them the 1956 Nobel Prize in Physics. It replaced vacuum tubes, which were hot, bulky and burned out.</li>
<li><strong>Moore's law</strong>: in 1965 Gordon Moore (later Intel co-founder) observed transistor counts doubling regularly, revised in 1975 to about every two years. The Intel 4004 (1971) had 2,300 transistors. Apple's M1 (2020) has 16 billion and the M1 Ultra 114 billion.</li>
<li>"3 nm" process names are marketing labels now, not a physical size of any feature, but transistors really are only tens of nanometres across: thousands fit across a human hair.</li>
</ul></div>`,
      examples: [
        { title: 'nMOS vs pMOS: click the gate voltage', code: W(mosWidget),
          explain: `
<details><summary>Try this</summary>
<ol><li>Click <b>Gate = 1.0 V</b> on the nMOS: the channel turns green and the lamp lights. Click <b>Gate = 0 V</b> on the pMOS: same result. The pMOS is the mirror image.</li>
<li>Drag the nMOS slider slowly from 0 up. Nothing happens until it passes 0.35 V (V<sub>th</sub>), then the switch closes. Digital circuits never park a gate near the threshold. They drive it to 0 V or 1.0 V.</li>
<li>Notice no current flows into the gate (the <b>G</b> wire never shows moving dots). A transistor holding its state costs almost nothing. Only the lamp path carries current.</li></ol></details>` },
        { title: "Moore's law: 50 years of doubling", code: W(mooreWidget) },
      ],
      quiz: [
        { q: 'An nMOS transistor\'s gate is at logic 1. The switch is…', options: ['Open (off)', 'Closed (on)', 'Half on', 'Depends on the drain'], answer: 1, why: 'nMOS conducts when its gate is high.' },
        { q: 'What does the small ○ bubble on a pMOS gate mean?', options: ['It is broken', 'It turns ON when the gate is LOW (inverted control)', 'It is a capacitor', 'It needs more current'], answer: 1, why: 'The bubble means "inverted": pMOS conducts when the gate is 0.' },
        { q: 'Why does a MOSFET\'s gate draw almost no current?', options: ['It is insulated from the channel by a thin oxide layer and controls it by electric field', 'It is made of plastic', 'Current only flows on clock edges', 'It is connected to ground'], answer: 0, why: 'The "O" in MOS is the oxide insulator. The gate acts through an electric field, like a capacitor plate.' },
        { q: 'Roughly how many transistors are in an Apple M1 chip?', options: ['2,300', '3.1 million', '16 billion', '16 trillion'], answer: 2, why: 'About 16 billion. The 4004 of 1971 had 2,300.' },
      ],
      exercise: {
        task: `<p>Click the gate circles (0/1) in each circuit so every lamp matches its goal, then click <b>✔ Check</b>. Notice what circuits ③ and ④ remind you of: that's next lesson's big idea.</p>`,
        hint: 'nMOS conducts when its gate is 1, pMOS when its gate is 0. In series both must conduct; in parallel either one is enough, so to turn ④ off both must be off.',
        starter: W(switchPuzzle, false),
        solution: W(switchPuzzle, true),
      },
    },
    // =============================================================== cmos-not
    {
      id: 'cmos-not',
      section: 'Foundations',
      title: 'Building NOT from two transistors',
      explain: `
<p>Your first logic gate! A <strong>NOT</strong> gate (inverter) outputs the opposite of its input: 0 → 1, 1 → 0. It takes just <strong>two transistors</strong>, one of each type, stacked between the power rails:</p>
<pre><code>   VDD (1)
    |
  [pMOS]  ← pull-up: ON when IN = 0
    |
    +-------- OUT
    |
  [nMOS]  ← pull-down: ON when IN = 1
    |
   GND (0)          IN drives both gates</code></pre>
<ul>
<li><strong>IN = 0</strong>: pMOS on, nMOS off → OUT is connected to VDD → <strong>1</strong>.</li>
<li><strong>IN = 1</strong>: pMOS off, nMOS on → OUT is connected to GND → <strong>0</strong>.</li>
</ul>
<p>This pairing is called <strong>CMOS</strong> (Complementary MOS). Every CMOS gate has a pull-up network of pMOS transistors and a pull-down network of nMOS transistors, designed so that <strong>exactly one of them conducts</strong> for any input.</p>
<p>Notice the output is not "made from" the input. The output's energy comes from the VDD and GND rails; the input only flips the switches. That's how every gate regenerates a clean signal, as you saw in lesson 1.</p>
<div class="tip">From now on we draw this 2-transistor circuit as one symbol: a triangle with a bubble. The bubble ○ always means "invert".</div>
<div class="world">
<ul>
<li><strong>Why your idle laptop is cool</strong>: in a CMOS gate holding a steady value, one switch is always open, so there is no path from VDD to GND and almost no current flows. Power is spent mainly when outputs <em>switch</em>, charging and discharging tiny wire capacitances. Idle chips stop their clocks (clock gating) so nothing switches.</li>
<li>CMOS was invented by Frank Wanlass at Fairchild Semiconductor in 1963. Early digital watches used it because it could run for a year on a button cell, and today virtually every CPU, GPU and phone chip is CMOS.</li>
<li>The leftover idle power in modern chips is <em>leakage</em>: at a few nanometres, "off" transistors leak a little. Chips cut power to whole unused blocks (power gating) to fight it.</li>
</ul></div>`,
      examples: [
        {
          title: 'CMOS inverter at switch level',
          code: W(cmosWidget),
          explain: `
<details><summary>The problem: how do you make "the opposite" from switches?</summary>
<p>A transistor can only connect or disconnect two wires. It can't compute "1 minus the input". The trick is to stop thinking about transforming the input and instead ask: <strong>which rail should the output be connected to?</strong> When IN is 0 we want OUT tied to VDD (1). When IN is 1 we want OUT tied to GND (0). So we need one switch that closes on a <em>low</em> input (a pMOS, on top) and one that closes on a <em>high</em> input (an nMOS, below).</p>
</details>
<details><summary>Step by step: what each button does</summary>
<table><tr><th>You do</th><th>pMOS</th><th>nMOS</th><th>OUT connected to</th><th>OUT</th></tr>
<tr><td>Click <b>IN = 0 (0 V)</b></td><td>ON (green)</td><td>OFF (grey)</td><td>VDD, green path</td><td>1.00 V → 1, LED lit</td></tr>
<tr><td>Click <b>IN = 1 (1.0 V)</b></td><td>OFF</td><td>ON (blue path)</td><td>GND</td><td>0.00 V → 0</td></tr>
<tr><td>Just after a click</td><td colspan="3">Yellow dots: brief current charging (0→1) or draining (1→0) the capacitor C</td><td>switching energy</td></tr>
<tr><td>Drag the slider to 0.50 V</td><td>partly ON (amber)</td><td>partly ON</td><td>both rails: red path, VDD → GND</td><td>0.50 V → undefined</td></tr></table>
<p>In the two steady states (rows 1 and 2) there is never a closed path from VDD to GND. That is the whole secret of CMOS's low power.</p>
</details>
<details><summary>Try this</summary>
<ol><li>Click IN = 1, then IN = 0, a few times. The output LED is always the opposite of IN, and the yellow switching current appears only right after each change.</li>
<li>Drag the slider slowly from 0 to 1.0 V and watch the black dot on the transfer curve. The output stays near 1.0 V until about 0.4 V, then falls steeply. That steep cliff is why a slightly noisy input still gives a clean output (the regeneration from lesson 1).</li>
<li>Park the slider between 0.36 V and 0.64 V. The red ⚠ path shows current flowing straight through both transistors. This is why inputs must never sit in the forbidden zone.</li></ol>
</details>
<details><summary>Common mistake: "why not put the nMOS on top?"</summary>
<p>It would seem to work logically, but nMOS transistors are bad at passing a 1: the output would only rise to about VDD − V<sub>th</sub> (0.65 V here), barely a valid 1, and the next gate's margins vanish. pMOS passes strong 1s and nMOS passes strong 0s, so CMOS always puts pMOS in the pull-up network and nMOS in the pull-down network.</p>
</details>`,
        },
        {
          title: 'Same thing, one symbol: the NOT gate',
          code: C(notCfg),
          explain: `
<details><summary>Try this</summary>
<p>Click switch <b>A</b>. The first NOT's output is always the opposite. The second NOT inverts it back, so <b>NOT NOT A</b> equals A: two inverters in a row make a <b>buffer</b>. Real chips use buffer chains to drive long wires and big loads, regenerating the signal along the way. Hover a gate to see its description. The truth table on the right lists every input case; click a row to jump to it.</p></details>`,
        },
      ],
      quiz: [
        { q: 'In a CMOS inverter with IN = 1, which transistor is on?', options: ['pMOS', 'nMOS', 'Both', 'Neither'], answer: 1, why: 'nMOS conducts with a high gate, pulling OUT down to GND, so OUT = 0.' },
        { q: 'Why does a CMOS gate use almost no power while holding a steady output?', options: ['The transistors are cold', 'One of the two networks is always off, so no current path from VDD to GND exists', 'The output is disconnected', 'It stores energy in the gate'], answer: 1, why: 'Current flows mainly while switching (charging capacitance), not while holding a value.' },
        { q: 'Where does the output\'s energy come from?', options: ['The input signal', 'The power rails VDD and GND, via whichever transistor is on', 'The clock', 'The capacitor C'], answer: 1, why: 'The input only controls the switches. That\'s why a gate can regenerate a weak input into a strong output.' },
        { q: 'What happens if the input sits at half the supply voltage?', options: ['Output is exactly 0', 'Both transistors partly conduct: undefined output and wasted short-circuit current', 'Nothing, CMOS ignores it', 'The chip turns off'], answer: 1, why: 'Both partly on gives a direct VDD→GND path. Inputs should only pass through this region briefly.' },
      ],
      exercise: {
        task: `<p>Puzzle 1 of many! Using only NOT gates, build a circuit where <b>P = NOT A</b> and <b>Q = A</b> in the board below, then click <b>✔ Check</b>.</p>
<p>How to play: click <b>+ NOT</b> to add a gate, drag from a pin ● to another pin to wire it, drag gates to move them. One output can feed several inputs.</p>`,
        hint: 'One NOT gives NOT A for P. Feed that NOT A into a second NOT and you get A back for Q.',
        starter: C(notEx, false),
        solution: C(notEx, true),
      },
    },
    // =============================================================== switches-to-logic
    {
      id: 'switches-to-logic',
      section: 'Foundations',
      title: 'Switches in series = AND, parallel = OR',
      explain: `
<p>Forget transistors for a moment and think of a battery, a lamp and two ordinary switches, A and B. There are two ways to wire them:</p>
<ul>
<li><strong>Series</strong> (one after another): current must get through A <em>and then</em> B. The lamp is on only if <strong>A AND B</strong> are both closed.</li>
<li><strong>Parallel</strong> (side by side): current can take either path. The lamp is on if <strong>A OR B</strong> (or both) is closed.</li>
</ul>
<p>Those are the two most important logic functions, and you just got them for free from wiring. Write them as <strong>truth tables</strong>, one row for each possible input:</p>
<table><tr><th>A</th><th>B</th><th>A AND B</th><th>A OR B</th></tr>
<tr><td>0</td><td>0</td><td>0</td><td>0</td></tr><tr><td>0</td><td>1</td><td>0</td><td>1</td></tr>
<tr><td>1</td><td>0</td><td>0</td><td>1</td></tr><tr><td>1</td><td>1</td><td>1</td><td>1</td></tr></table>
<p>Chips do the same with transistors: nMOS transistors in series conduct only if all gates are 1, and in parallel if any gate is 1 (you saw this in the transistor puzzle). Next section you'll see exactly how CMOS gates are built from these series/parallel networks.</p>
<div class="tip">In code: <code>a &amp;&amp; b</code> is series, <code>a || b</code> is parallel. A truth table is just an exhaustive unit test: with n inputs there are 2<sup>n</sup> rows, so you can check every case.</div>
<div class="world">
<ul>
<li><strong>Two-person rule (series = AND)</strong>: bank vaults and missile launch consoles use two key switches wired in series, placed too far apart for one person to turn both.</li>
<li><strong>Dead man's switch (series = AND)</strong>: a train's traction power flows through the driver's vigilance pedal in series with the controls. Let go and the circuit opens. Lawn mowers and treadmill safety clips work the same way.</li>
<li><strong>Car dome light (parallel = OR)</strong>: each door has a switch, all wired in parallel to the light, so opening <em>any</em> door turns it on.</li>
<li><strong>Hallway light</strong> (switch at each end of the stairs) is neither AND nor OR. It's XOR, coming up in the Logic Gates section.</li>
</ul></div>`,
      examples: [
        { title: 'Battery, lamp, two switches', code: W(seriesWidget) },
        { title: 'The same thing as gates: AND and OR', code: C(andOrCfg),
          explain: `<details><summary>Try this</summary><p>Click <b>A</b> and <b>B</b> through all four combinations and compare the LEDs with the series/parallel lamp above. The truth table on the right lists every case at once. Click any row to set the switches to it. The <b>⏱ settled after N gate delays</b> line under the board counts how many steps the change took to travel through. You'll use it in the gate-delay lesson.</p></details>` },
      ],
      quiz: [
        { q: 'Two switches in series. A = 1 (closed), B = 0 (open). Is the lamp on?', options: ['Yes', 'No'], answer: 1, why: 'Series needs every switch closed: AND. 1 AND 0 = 0.' },
        { q: 'Two switches in parallel. A = 0, B = 1. Is the lamp on?', options: ['Yes', 'No'], answer: 0, why: 'Parallel needs any switch closed: OR. 0 OR 1 = 1.' },
        { q: 'How many rows does the truth table of a 3-input circuit have?', options: ['3', '6', '8', '9'], answer: 2, why: '2<sup>3</sup> = 8 combinations of three bits.' },
        { q: 'A car\'s dome light turns on if any of its 4 doors is open. Which wiring/gate is it?', options: ['Series / AND', 'Parallel / OR', 'Neither'], answer: 1, why: 'Any door switch closing completes the circuit: OR.' },
      ],
      exercise: {
        task: `<p><b>The vault.</b> The door should <b>OPEN</b> when both keys <b>A</b> and <b>B</b> are turned, or when the bank manager enters the master code <b>M</b>. Using only AND and OR gates, build it in the board below, then click <b>✔ Check</b>. The truth table shows a 🎯 goal column; red rows don't match yet.</p>`,
        hint: 'Combine the keys first: A AND B. Then OR that with M.',
        starter: C(vaultEx, false),
        solution: C(vaultEx, true),
      },
    },
  );
})();
