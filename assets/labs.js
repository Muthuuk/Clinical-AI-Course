/* Clinical AI course: "Try it" games and puzzles, one per lesson.
   Labs.render(host, spec, onDone) builds one hands-on activity. onDone(ok) fires when it is finished.
   Types:
     sort    drag each card into the right group
     order   drag the steps into the right order (or use the arrow buttons)
     match   drag each term onto its meaning
     memory  flip two cards at a time to find the matching pairs
     rush    speed round: sort cards against the clock
     spot    click the warning signs in a short case note
   Everything works with a mouse, a finger (drag, or tap then tap) and the keyboard (Enter to pick, Enter to place).
   All text from the data is inserted as plain text, never as HTML. */
(function(){
  'use strict';
  function h(tag, attrs){
    const e = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(k => { const v = attrs[k];
      if (k === 'class') e.className = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (v === true) e.setAttribute(k, ''); else if (v !== false && v != null) e.setAttribute(k, v); });
    for (let i = 2; i < arguments.length; i++){ const k = arguments[i]; if (k == null || k === false) continue;
      (Array.isArray(k) ? k : [k]).forEach(x => { if (x != null && x !== false) e.append(x.nodeType ? x : document.createTextNode(String(x))); }); }
    return e;
  }
  const shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--){ const j = Math.floor(Math.random()*(i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function feedback(fb, ok, head, rest){ fb.textContent = ''; fb.className = 'fb ' + (ok ? 'good' : 'warn'); fb.append(h('b', null, head + ' '), rest || ''); }
  function celebrate(host){
    if (reduced()) return;
    const wrap = h('div', { class: 'confetti', 'aria-hidden': 'true' });
    const cols = ['#0E6B66', '#E3A53A', '#4DB6AC', '#2D5B8A', '#5CBB84'];
    for (let i = 0; i < 26; i++){ const s = h('i'); s.style.left = (Math.random()*100) + '%'; s.style.background = cols[i % cols.length]; s.style.animationDelay = (Math.random()*0.4) + 's'; s.style.transform = `rotate(${Math.random()*360}deg)`; wrap.append(s); }
    host.append(wrap); setTimeout(() => wrap.remove(), 1800);
  }

  /* ---- drag helper: pointer events, so it works for mouse, pen and touch ----
     A small movement starts a drag; a plain click/tap still works as "pick". */
  function draggable(el, getZones, onDrop){
    let sx = 0, sy = 0, ghost = null, over = null, id = null;
    el.addEventListener('pointerdown', e => {
      if (el.disabled || e.button > 0) return;
      sx = e.clientX; sy = e.clientY; id = e.pointerId;
      const move = ev => {
        if (ev.pointerId !== id) return;
        if (!ghost){
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 7) return;
          const r = el.getBoundingClientRect();
          ghost = el.cloneNode(true); ghost.classList.add('ghost'); ghost.style.width = r.width + 'px';
          document.body.append(ghost); el.classList.add('dragging');
        }
        ev.preventDefault();
        ghost.style.left = (ev.clientX - ghost.offsetWidth/2) + 'px'; ghost.style.top = (ev.clientY - ghost.offsetHeight/2) + 'px';
        const t = document.elementFromPoint(ev.clientX, ev.clientY); const z = t && t.closest('[data-drop]');
        const ok = z && getZones().includes(z) ? z : null;
        if (ok !== over){ if (over) over.classList.remove('over'); over = ok; if (over) over.classList.add('over'); }
      };
      const up = ev => {
        if (ev.pointerId !== id) return;
        document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', up); document.removeEventListener('pointercancel', up);
        if (ghost){
          ghost.remove(); ghost = null; el.classList.remove('dragging');
          el.dataset.justDragged = '1'; setTimeout(() => { delete el.dataset.justDragged; }, 0);
          if (over){ over.classList.remove('over'); const z = over; over = null; onDrop(z); }
        }
      };
      document.addEventListener('pointermove', move, { passive: false }); document.addEventListener('pointerup', up); document.addEventListener('pointercancel', up);
    });
  }

  /* ---------- SORT: drag cards into groups ---------- */
  function sort(host, spec, done){
    const items = shuffle(spec.items.map((x, i) => Object.assign({ k: i }, x)));
    const where = new Map(); let sel = null, checked = false;
    const tray = h('div', { class: 'tray', 'data-drop': 'tray' }); const bk = h('div', { class: 'buckets' }); const fb = h('div', { class: 'fb' });
    const zones = spec.buckets.map((b, bi) => {
      const z = h('div', { class: 'bucket', 'data-drop': String(bi), tabindex: '0', role: 'button', 'aria-label': 'Group: ' + b });
      z.addEventListener('click', e => { if (e.target.closest('.chip')) return; place(bi); });
      z.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.chip')){ e.preventDefault(); place(bi); } });
      return z; });
    function place(bi){ if (checked || !sel) return; where.set(sel, bi); sel = null; draw(); }
    function chip(it){
      const c = h('button', { class: 'chip' + (sel === it ? ' sel' : ''), type: 'button', 'aria-pressed': String(sel === it) }, it.t);
      c.onclick = () => { if (checked || c.dataset.justDragged) return; if (where.has(it)){ where.delete(it); sel = null; } else sel = (sel === it ? null : it); draw(); };
      draggable(c, () => zones.concat([tray]), z => { if (checked) return; if (z === tray) where.delete(it); else where.set(it, +z.dataset.drop); sel = null; draw(); });
      return c;
    }
    function draw(){
      tray.textContent = ''; bk.textContent = '';
      items.forEach(it => { if (!where.has(it)) tray.append(chip(it)); });
      if (!tray.children.length) tray.append(h('span', { class: 'muted small' }, 'All cards placed. Press "Check".'));
      zones.forEach((z, bi) => { z.textContent = ''; z.append(h('h4', null, spec.buckets[bi]));
        items.filter(it => where.get(it) === bi).forEach(it => { const c = chip(it); if (checked) { c.classList.add(it.b === bi ? 'right' : 'wrong'); c.disabled = true; } z.append(c); });
        z.classList.toggle('ready', !!sel); bk.append(z); });
      check.disabled = checked || where.size !== items.length;
    }
    const check = h('button', { class: 'btn primary', type: 'button' }, 'Check');
    check.onclick = () => {
      checked = true; draw();
      const wrong = items.filter(it => where.get(it) !== it.b); const ok = !wrong.length;
      feedback(fb, ok, ok ? `All ${items.length} in the right group.` : `${items.length - wrong.length} of ${items.length} in the right group.`,
        (ok ? (spec.explain || '') : wrong.map(it => `"${it.t}" belongs in ${spec.buckets[it.b]}${it.why ? ': ' + it.why.replace(/[.\s]+$/, '') : ''}.`).join(' ')));
      if (ok) celebrate(host); done(ok);
    };
    const again = h('button', { class: 'btn', type: 'button', onclick: () => { where.clear(); sel = null; checked = false; fb.textContent = ''; fb.className = 'fb'; draw(); } }, 'Start again');
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, 'Drag each card into a group. Or tap a card, then tap the group. Tap a placed card to take it back.'), tray, bk, h('div', { class: 'row' }, check, again), fb);
    draw();
  }

  /* ---------- ORDER: drag steps into sequence ---------- */
  function order(host, spec, done){
    const right = spec.items.map((t, i) => ({ t, i }));
    let list = shuffle(right); if (list.every((x, k) => x.i === k) && list.length > 1) list.reverse();
    let checked = false;
    const ol = h('ol', { class: 'order' }); const fb = h('div', { class: 'fb' });
    function move(from, to){ if (checked || to < 0 || to >= list.length || from === to) return; const [x] = list.splice(from, 1); list.splice(to, 0, x); draw(); }
    function draw(){
      ol.textContent = '';
      const rows = list.map((it, k) => {
        const up = h('button', { class: 'mini', type: 'button', 'aria-label': 'Move up', disabled: checked || k === 0, onclick: () => move(k, k - 1) }, '▲');
        const dn = h('button', { class: 'mini', type: 'button', 'aria-label': 'Move down', disabled: checked || k === list.length - 1, onclick: () => move(k, k + 1) }, '▼');
        const grip = h('button', { class: 'grip', type: 'button', 'aria-label': 'Drag to move: ' + it.t, disabled: checked }, '⠿');
        const li = h('li', { class: 'orow' + (checked ? (it.i === k ? ' right' : ' wrong') : ''), 'data-drop': String(k) }, grip, h('span', { class: 'n' }, (k + 1) + '.'), h('span', { class: 'tx' }, it.t), up, dn);
        return { li, grip };
      });
      rows.forEach(r => ol.append(r.li));
      rows.forEach((r, k) => draggable(r.grip, () => rows.map(x => x.li), z => move(k, +z.dataset.drop)));
    }
    const check = h('button', { class: 'btn primary', type: 'button' }, 'Check my order');
    check.onclick = () => {
      checked = true; draw(); check.disabled = true;
      const ok = list.every((x, k) => x.i === k);
      feedback(fb, ok, ok ? 'Correct order.' : 'Not quite. Red rows are in the wrong place.', ok ? (spec.explain || '') : 'The right order is: ' + spec.items.map((t, k) => (k + 1) + '. ' + t).join(' → ') + '.');
      if (ok) celebrate(host); done(ok);
    };
    const again = h('button', { class: 'btn', type: 'button', onclick: () => { checked = false; check.disabled = false; list = shuffle(right); fb.textContent = ''; fb.className = 'fb'; draw(); } }, 'Shuffle and try again');
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, 'Drag the ⠿ handle to move a step, or use the ▲ ▼ buttons. The first step goes at the top.'), ol, h('div', { class: 'row' }, check, again), fb);
    draw();
  }

  /* ---------- MATCH: drag each term onto its meaning ---------- */
  function match(host, spec, done){
    const pairs = spec.pairs.map((p, i) => ({ a: p.a, b: p.b, i }));
    const terms = shuffle(pairs), defs = shuffle(pairs);
    const at = new Map(); // def index -> term
    let sel = null, checked = false;
    const bank = h('div', { class: 'tray', 'data-drop': 'bank' }); const grid = h('div', { class: 'mgrid' }); const fb = h('div', { class: 'fb' });
    const slots = defs.map(d => {
      const z = h('div', { class: 'mslot', 'data-drop': String(d.i), tabindex: '0', role: 'button', 'aria-label': 'Meaning: ' + d.b });
      z.addEventListener('click', e => { if (e.target.closest('.chip')) return; put(d.i); });
      z.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && !e.target.closest('.chip')){ e.preventDefault(); put(d.i); } });
      return { d, z }; });
    function put(di){ if (checked || !sel) return; for (const [k, v] of at) if (v === sel) at.delete(k); at.set(di, sel); sel = null; draw(); }
    function chip(t){
      const c = h('button', { class: 'chip term' + (sel === t ? ' sel' : ''), type: 'button', 'aria-pressed': String(sel === t) }, t.a);
      c.onclick = () => { if (checked || c.dataset.justDragged) return; let placed = false; for (const [k, v] of at) if (v === t){ at.delete(k); placed = true; } sel = placed ? null : (sel === t ? null : t); draw(); };
      draggable(c, () => slots.map(s => s.z).concat([bank]), z => { if (checked) return; for (const [k, v] of at) if (v === t) at.delete(k); if (z !== bank) at.set(+z.dataset.drop, t); sel = null; draw(); });
      return c;
    }
    function draw(){
      bank.textContent = ''; grid.textContent = '';
      const used = new Set(at.values());
      terms.forEach(t => { if (!used.has(t)) bank.append(chip(t)); });
      if (!bank.children.length) bank.append(h('span', { class: 'muted small' }, 'All terms placed. Press "Check".'));
      slots.forEach(({ d, z }) => { z.textContent = ''; const t = at.get(d.i);
        const hole = h('div', { class: 'hole' }, t ? chip(t) : h('span', { class: 'muted small' }, sel ? 'Tap to place here' : 'Drop a term here'));
        if (checked && t){ hole.firstChild.disabled = true; hole.firstChild.classList.add(t.i === d.i ? 'right' : 'wrong'); }
        z.append(hole, h('p', { class: 'def' }, d.b)); z.classList.toggle('ready', !!sel); grid.append(z); });
      check.disabled = checked || at.size !== pairs.length;
    }
    const check = h('button', { class: 'btn primary', type: 'button' }, 'Check');
    check.onclick = () => {
      checked = true; draw();
      const wrong = pairs.filter(p => !at.get(p.i) || at.get(p.i).i !== p.i); const ok = !wrong.length;
      feedback(fb, ok, ok ? 'All matched.' : `${pairs.length - wrong.length} of ${pairs.length} matched.`, ok ? (spec.explain || '') : wrong.map(p => `"${p.a}" means: ${p.b}`).join(' · '));
      if (ok) celebrate(host); done(ok);
    };
    const again = h('button', { class: 'btn', type: 'button', onclick: () => { at.clear(); sel = null; checked = false; fb.textContent = ''; fb.className = 'fb'; draw(); } }, 'Start again');
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, 'Drag each term onto its meaning. Or tap a term, then tap the meaning.'), bank, grid, h('div', { class: 'row' }, check, again), fb);
    draw();
  }

  /* ---------- MEMORY: flip cards to find pairs ---------- */
  function memory(host, spec, done){
    let cards, open, matched, moves, lock;
    const grid = h('div', { class: 'memgrid' }); const stat = h('p', { class: 'eyebrow' }); const fb = h('div', { class: 'fb' });
    function start(){
      cards = shuffle(spec.pairs.flatMap((p, i) => [{ t: p.a, i, side: 'a' }, { t: p.b, i, side: 'b' }]));
      open = []; matched = new Set(); moves = 0; lock = false; fb.textContent = ''; fb.className = 'fb'; draw();
    }
    function draw(){
      grid.textContent = '';
      stat.textContent = `Moves: ${moves} · Pairs found: ${matched.size} of ${spec.pairs.length}`;
      cards.forEach((c, k) => {
        const up = open.includes(k) || matched.has(c.i);
        const b = h('button', { class: 'mcard' + (up ? ' up' : '') + (matched.has(c.i) ? ' done' : '') + (c.side === 'a' ? ' term' : ''), type: 'button', 'aria-label': up ? c.t : 'Hidden card ' + (k + 1), disabled: matched.has(c.i) },
          h('span', { class: 'face' }, up ? c.t : '?'));
        b.onclick = () => flip(k); grid.append(b); });
    }
    function flip(k){
      if (lock || open.includes(k) || matched.has(cards[k].i)) return;
      open.push(k); draw();
      if (open.length === 2){
        moves++; const [x, y] = open.map(i => cards[i]);
        if (x.i === y.i && x.side !== y.side){ matched.add(x.i); open = []; draw();
          if (matched.size === spec.pairs.length){ const ok = moves <= spec.pairs.length*2 + 2;
            feedback(fb, true, `All pairs found in ${moves} moves.`, (ok ? 'Excellent memory. ' : 'Try again for fewer moves. ') + (spec.explain || '')); celebrate(host); done(true); } }
        else { lock = true; setTimeout(() => { open = []; lock = false; draw(); }, 1100); }
      }
    }
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, 'Turn over two cards at a time. Find each term and its meaning. Fewer moves is better.'), stat, grid,
      h('div', { class: 'row' }, h('button', { class: 'btn', type: 'button', onclick: start }, 'New game')), fb);
    start();
  }

  /* ---------- RUSH: speed round ---------- */
  function rush(host, spec, done){
    const secs = spec.seconds || 45; let queue, idx, score, left, timer, running = false, misses;
    const card = h('div', { class: 'rushcard', 'aria-live': 'polite' }); const clock = h('b', { class: 'mono' }); const sc = h('b', { class: 'mono' });
    const btns = h('div', { class: 'rushbtns' }); const fb = h('div', { class: 'fb' });
    const startBtn = h('button', { class: 'btn primary', type: 'button' }, '▶ Start the clock');
    spec.buckets.forEach((b, bi) => btns.append(h('button', { class: 'btn', type: 'button', disabled: true, onclick: () => answer(bi) }, `${bi + 1}. ${b}`)));
    function key(e){ if (!running) return; const n = parseInt(e.key, 10); if (n >= 1 && n <= spec.buckets.length){ e.preventDefault(); answer(n - 1); } }
    function show(){ card.textContent = queue[idx] ? queue[idx].t : ''; card.classList.remove('shake', 'pop'); }
    function answer(bi){
      if (!running) return; const it = queue[idx];
      if (it.b === bi){ score++; card.classList.add('pop'); } else { misses.push(it); card.classList.add('shake'); }
      sc.textContent = score; idx++;
      if (idx >= queue.length) return finish();
      setTimeout(show, 160);
    }
    function finish(){
      running = false; clearInterval(timer); document.removeEventListener('keydown', key);
      [...btns.children].forEach(b => b.disabled = true); startBtn.disabled = false; startBtn.textContent = '↻ Play again';
      const n = queue.length, ok = score >= Math.ceil(n*0.8);
      card.textContent = `${score} of ${n}`;
      feedback(fb, ok, ok ? 'Great round!' : 'Good try. Play again to beat your score.',
        (misses.length ? 'Check these: ' + misses.map(m => `"${m.t}" → ${spec.buckets[m.b]}`).join(' · ') + '. ' : '') + (idx < n ? `Time ran out with ${n - idx} card${n - idx > 1 ? 's' : ''} left. ` : '') + (ok ? (spec.explain || '') : ''));
      if (ok) celebrate(host); done(ok);
    }
    startBtn.onclick = () => {
      queue = shuffle(spec.items); idx = 0; score = 0; misses = []; left = secs; running = true; fb.textContent = ''; fb.className = 'fb';
      sc.textContent = '0'; clock.textContent = left + 's'; startBtn.disabled = true; [...btns.children].forEach(b => b.disabled = false);
      document.addEventListener('keydown', key); show();
      clearInterval(timer); timer = setInterval(() => { if (!host.isConnected){ clearInterval(timer); document.removeEventListener('keydown', key); return; } left--; clock.textContent = left + 's'; if (left <= 0) finish(); }, 1000);
    };
    card.textContent = 'Press start. Cards appear one at a time.';
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, `You have ${secs} seconds. Choose the right group for each card. On a keyboard, press 1 to ${spec.buckets.length}.`),
      h('div', { class: 'row' }, h('span', null, '⏱ ', clock), h('span', null, '⭐ Score ', sc)), card, btns, h('div', { class: 'row' }, startBtn), fb);
    clock.textContent = secs + 's'; sc.textContent = '0';
  }

  /* ---------- SPOT: click the warning signs ---------- */
  function spot(host, spec, done){
    const need = spec.parts.filter(p => p.bad).length; let found = 0, wrong = 0;
    const fb = h('div', { class: 'fb' }); const count = h('p', { class: 'eyebrow' }); const box = h('div', { class: 'mail' }); const notes = h('div', { class: 'notes' });
    const upd = () => count.textContent = `Warning signs found: ${found} of ${need}`;
    spec.parts.forEach(p => { const b = h('button', { class: 'part', type: 'button' }, p.lbl ? h('span', { class: 'lbl' }, p.lbl) : null, p.t);
      b.onclick = () => { b.disabled = true; b.classList.add(p.bad ? 'right' : 'wrong'); if (p.bad) found++; else wrong++;
        notes.prepend(h('p', null, h('b', null, p.bad ? 'Warning sign. ' : 'This part looks fine. '), p.why || ''));
        upd(); if (found === need){ box.querySelectorAll('.part').forEach(x => x.disabled = true);
          feedback(fb, wrong === 0, wrong ? `All ${need} found, with ${wrong} false alarm${wrong > 1 ? 's' : ''}.` : 'All found with no false alarms.', spec.explain || '');
          if (!wrong) celebrate(host); done(wrong === 0); } };
      box.append(b); });
    host.append(h('p', { class: 'q' }, spec.prompt), h('p', { class: 'how' }, 'Click each part that worries you. Clicking a part that is fine counts as a false alarm.'), count, box, fb, notes);
    upd();
  }

  const TYPES = { sort, order, match, memory, rush, spot };
  window.Labs = { types: Object.keys(TYPES), render(host, spec, done){ const f = TYPES[spec.type]; if (f) f(host, spec, done || (() => {})); } };
})();
