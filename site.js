// Small helpers shared by every site. No libraries. Safe to delete what you don't use.
document.documentElement.classList.add('js');

// 1. Reveal on scroll: add data-reveal to any element (and style="--i:2" to stagger).
(() => {
  const els = document.querySelectorAll('[data-reveal]');
  if (!('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
  els.forEach(el => io.observe(el));
})();

// 2. Current year: <span data-year></span>
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// 3. Opening hours, in the BUSINESS's time zone (not the visitor's):
//   <ul data-hours data-tz="Asia/Singapore">
//     <li data-day="1">Monday — Closed</li>                                   (0 = Sunday ... 6 = Saturday)
//     <li data-day="2" data-open="06:30" data-close="14:00">Tuesday — 6:30am–2pm</li>
//   </ul>
//   <p data-open-status></p>   -> "Open now · until 2pm" / "Closed now · opens Tuesday at 6:30am"
(() => {
  const list = document.querySelector('[data-hours]');
  if (!list) return;
  const tz = list.dataset.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: tz, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(new Date()).map(p => [p.type, p.value]));
  const today = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  const nowMin = (+parts.hour) * 60 + (+parts.minute);
  const toMin = (t) => { const [h, m] = (t || '').split(':').map(Number); return h * 60 + (m || 0); };
  const fmt = (t) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${h < 12 ? 'am' : 'pm'}`; };
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = (d) => list.querySelector(`[data-day="${d}"]`);

  const row = day(today);
  if (row) { row.classList.add('is-today'); row.setAttribute('aria-current', 'date'); }

  const status = document.querySelectorAll('[data-open-status]');
  if (!status.length) return;
  let text;
  if (row && row.dataset.open && nowMin >= toMin(row.dataset.open) && nowMin < toMin(row.dataset.close)) {
    text = `Open now · until ${fmt(row.dataset.close)}`;
    status.forEach(s => s.classList.add('is-open'));
  } else {
    for (let i = 0; i <= 7; i++) {
      const d = (today + i) % 7, r = day(d);
      if (!r || !r.dataset.open || (i === 0 && nowMin >= toMin(r.dataset.open))) continue;
      text = `Closed now · opens ${i === 0 ? 'today' : i === 1 ? 'tomorrow' : names[d]} at ${fmt(r.dataset.open)}`;
      break;
    }
  }
  if (text) status.forEach(s => { s.textContent = text; });
})();

// 4. Mobile menu: <button data-menu-toggle aria-controls="menu" aria-expanded="false"> + <nav id="menu">
(() => {
  const btn = document.querySelector('[data-menu-toggle]');
  if (!btn) return;
  const menu = document.getElementById(btn.getAttribute('aria-controls'));
  const set = (open) => { btn.setAttribute('aria-expanded', String(open)); menu.classList.toggle('is-open', open); };
  btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => set(false)));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();

// 5. Countdown in calendar days, counted in the EVENT's time zone:
//   <span data-countdown="2027-03-20" data-tz="Asia/Singapore"
//         data-format="{n} days to go" data-tomorrow="Tomorrow!" data-today="Today's the day"
//         data-after="Thank you for celebrating with us">Saturday 20 March 2027</span>
//   Write a timeless fallback as the text (e.g. the date), never a number that goes stale.
(() => {
  const dayNumber = (date, tz) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
      .formatToParts(date).map(x => [x.type, x.value]));
    return Date.UTC(+p.year, +p.month - 1, +p.day) / 86400000;
  };
  document.querySelectorAll('[data-countdown]').forEach((el) => {
    const d = el.dataset, tz = d.tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
    const [y, m, day] = d.countdown.slice(0, 10).split('-').map(Number);
    if (!y || !m || !day) return;
    const n = Date.UTC(y, m - 1, day) / 86400000 - dayNumber(new Date(), tz);
    const text = n > 1 ? (d.format || '{n} days').replace('{n}', n) : n === 1 ? (d.tomorrow || 'Tomorrow') : n === 0 ? (d.today || 'Today') : d.after;
    if (text) el.textContent = text;
  });
})();

// 6. Fit text to its container's width (signature move 1): <h1 data-fit>MONSOON</h1>
//    Optional data-fit-max="320" caps the size in px. Give it a sensible CSS clamp() size too (used without JS).
(() => {
  const els = [...document.querySelectorAll('[data-fit]')];
  if (!els.length) return;
  const fit = (el) => {
    el.style.whiteSpace = 'nowrap';
    el.style.transition = 'none'; // a font-size transition (even 0.01ms under reduced motion) would make us measure the old size
    el.style.fontSize = '100px';
    const range = document.createRange(); range.selectNodeContents(el);
    const textW = range.getBoundingClientRect().width;
    const cs = getComputedStyle(el);
    const boxW = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    if (!textW || !boxW) { el.style.fontSize = ''; return; }
    const max = parseFloat(el.dataset.fitMax) || Infinity;
    el.style.fontSize = Math.min(max, Math.floor((100 * boxW / textW) * 0.995 * 10) / 10) + 'px';
    void el.offsetWidth; el.style.transition = '';
  };
  const run = () => els.forEach(fit);
  run();
  // Web fonts can finish after fonts.ready resolves (they load when first used), so refit when any font arrives.
  if (document.fonts) { document.fonts.ready.then(run); document.fonts.addEventListener('loadingdone', run); }
  addEventListener('load', run);
  if ('ResizeObserver' in window) { let w = innerWidth; new ResizeObserver(() => { if (innerWidth !== w) { w = innerWidth; run(); } }).observe(document.documentElement); }
})();

// 7. Line-by-line mask reveal (signature move 3): <h2 class="lines" data-reveal><span>First line</span><span>second</span></h2>
document.querySelectorAll('.lines').forEach((el) => {
  [...el.children].forEach((line, i) => {
    if (line.firstElementChild?.classList.contains('line-inner')) return;
    const inner = document.createElement('span');
    inner.className = 'line-inner';
    while (line.firstChild) inner.appendChild(line.firstChild);
    line.appendChild(inner);
    line.style.setProperty('--line', i);
  });
});

// 8. Live local clock (signature move 15): <span data-clock data-tz="Asia/Singapore">Singapore</span> -> "11:21 pm GMT+8"
(() => {
  const els = document.querySelectorAll('[data-clock]');
  if (!els.length) return;
  const tick = () => els.forEach((el) => {
    const opts = { timeZone: el.dataset.tz || undefined, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'shortOffset' };
    el.textContent = new Intl.DateTimeFormat('en-US', opts).format(new Date()).replace('AM', 'am').replace('PM', 'pm');
  });
  tick(); setInterval(tick, 30000);
})();

// 9. Color chapters (signature move 18): <section data-chapter="dark"> ... sets body.chapter-dark while it fills the middle of the screen.
//    Style it in CSS: body { transition: background-color .6s, color .6s } body.chapter-dark { --bg: ...; --text: ...; }
(() => {
  const secs = document.querySelectorAll('[data-chapter]');
  if (!secs.length || !('IntersectionObserver' in window)) return;
  const names = [...new Set([...secs].map(s => 'chapter-' + s.dataset.chapter))];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      document.body.classList.remove(...names);
      document.body.classList.add('chapter-' + e.target.dataset.chapter);
    });
  }, { rootMargin: '-50% 0px -50% 0px' });
  secs.forEach(s => io.observe(s));
})();

// 10. Pinned scenes (signature move 22): <section data-pin style="height:300vh"><div class="pin-stage">...</div></section>
//     .pin-stage is position:sticky (starter.css). site.js writes --p (0 → 1) on the section as you scroll through it,
//     so CSS can drive anything from it: transform: translateY(calc(var(--p) * -40%)); opacity: calc(1 - var(--p) * 2);
// 11. Scroll-played image sequence (signature move 21), inside a pinned scene:
//     <canvas data-sequence="images/seq/f_###.jpg" data-frames="120" data-poster="images/seq/f_000.jpg"></canvas>
//     ### is replaced by the zero-padded frame number. Add data-frames-mobile="60" + data-sequence-mobile for lighter phone frames.
(() => {
  const pins = [...document.querySelectorAll('[data-pin]')];
  if (!pins.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seqs = pins.map((pin) => {
    const c = pin.querySelector('canvas[data-sequence]');
    if (!c) return null;
    const mobile = innerWidth < 768 && c.dataset.sequenceMobile;
    const pattern = mobile ? c.dataset.sequenceMobile : c.dataset.sequence;
    const n = parseInt(mobile ? (c.dataset.framesMobile || c.dataset.frames) : c.dataset.frames, 10) || 1;
    const digits = (pattern.match(/#+/) || ['#'])[0].length;
    const src = (i) => pattern.replace(/#+/, String(i).padStart(digits, '0'));
    const imgs = new Array(n);
    const load = (i) => { if (!imgs[i]) { imgs[i] = new Image(); imgs[i].decoding = 'async'; imgs[i].src = src(i); } return imgs[i]; };
    const ctx = c.getContext('2d');
    let last = -1;
    const draw = (i) => {
      const img = load(i);
      if (!img.complete || !img.naturalWidth) { img.onload = () => { if (last === i) draw(i); }; last = i; return; }
      const dpr = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth * dpr, h = c.clientHeight * dpr;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight); // object-fit: cover
      ctx.drawImage(img, (w - img.naturalWidth * s) / 2, (h - img.naturalHeight * s) / 2, img.naturalWidth * s, img.naturalHeight * s);
      last = i;
    };
    // Load the first frame now, the rest progressively (every 4th first, then fill in).
    draw(reduce ? n - 1 : 0);
    if (!reduce) { let k = 0; const order = [...Array(n).keys()].sort((a, b) => (a % 4) - (b % 4) || a - b); const step = () => { for (let j = 0; j < 6 && k < n; j++) load(order[k++]); if (k < n) setTimeout(step, 30); }; setTimeout(step, 300); }
    return { n, draw, get last() { return last; } };
  });
  let ticking = false;
  const update = () => {
    ticking = false;
    pins.forEach((pin, idx) => {
      const r = pin.getBoundingClientRect();
      const total = Math.max(1, r.height - innerHeight);
      const p = Math.min(1, Math.max(0, -r.top / total));
      pin.style.setProperty('--p', p.toFixed(4));
      const s = seqs[idx];
      if (s && !reduce) { const f = Math.round(p * (s.n - 1)); if (f !== s.last) s.draw(f); }
    });
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
  addEventListener('resize', () => { seqs.forEach(s => s && s.draw(Math.max(0, s.last))); update(); });
  update();
})();

// 12. Filterable list (directories, listings — see references/directory.md):
//     <ul data-filter-list data-filter-noun="cat" data-filter-nouns="cats"><li data-tags="type-a east" data-name="Mochi">...</li></ul>
//     Controls anywhere on the page: <button data-filter="type-a" aria-pressed="false">, <select data-filter-select>, <input type="search" data-filter-search>
//     Optional: <p data-filter-count aria-live="polite"></p> and <p data-filter-empty hidden>No matches</p>. One list per page.
(() => {
  const list = document.querySelector('[data-filter-list]');
  if (!list) return;
  const items = [...list.children];
  const btns = [...document.querySelectorAll('[data-filter]')];
  const selects = [...document.querySelectorAll('[data-filter-select]')];
  const search = document.querySelector('[data-filter-search]');
  const count = document.querySelector('[data-filter-count]');
  const empty = document.querySelector('[data-filter-empty]');
  const noun = list.dataset.filterNoun || 'result', nouns = list.dataset.filterNouns || noun + 's';
  let tag = (btns.find(b => b.getAttribute('aria-pressed') === 'true') || {}).dataset?.filter || 'all';
  const apply = () => {
    const picks = [tag, ...selects.map(s => s.value)].filter(v => v && v !== 'all');
    const q = (search?.value || '').trim().toLowerCase();
    let shown = 0;
    items.forEach((el) => {
      const tags = (el.dataset.tags || '').toLowerCase().split(/\s+/);
      const text = (el.dataset.name || el.textContent).toLowerCase();
      const ok = picks.every(p => tags.includes(p.toLowerCase())) && (!q || text.includes(q));
      el.hidden = !ok; if (ok) shown++;
    });
    if (count) count.textContent = `${shown} ${shown === 1 ? noun : nouns}`;
    if (empty) empty.hidden = shown > 0;
  };
  btns.forEach(b => b.addEventListener('click', () => {
    tag = b.dataset.filter;
    btns.forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    apply();
  }));
  selects.forEach(s => s.addEventListener('change', apply));
  search?.addEventListener('input', apply);
  apply();
})();

// 13. Tabs (product feature tabs, menus by meal):
//     <div data-tabs><div role="tablist" aria-label="Features"><button role="tab" aria-controls="t1" aria-selected="true">Voices</button>...</div>
//     <div role="tabpanel" id="t1">...</div><div role="tabpanel" id="t2">...</div></div>
//     Leave every panel visible in the HTML (so everything shows without JavaScript); site.js hides all but the selected one.
//     Arrow keys move between tabs.
(() => {
  document.querySelectorAll('[data-tabs]').forEach((box) => {
    const tabs = [...box.querySelectorAll('[role="tab"]')];
    const show = (t, focus) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(x.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (focus) t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => show(t));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (d) { e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length], true); }
      });
    });
    show(tabs.find(t => t.getAttribute('aria-selected') === 'true') || tabs[0]);
  });
})();

// 14. Copy button (message templates, code samples, a discount code):
//     <button type="button" data-copy="#template" data-copied="Copied">Copy message</button>  -> copies the text of #template
(() => {
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener('click', async () => {
      const src = document.querySelector(btn.dataset.copy);
      if (!src) return;
      const text = (src.value ?? src.innerText).trim();
      try { await navigator.clipboard.writeText(text); }
      catch { const r = document.createRange(); r.selectNodeContents(src); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); }
      btn.textContent = btn.dataset.copied || 'Copied';
      setTimeout(() => { btn.textContent = label; }, 1800);
    });
  });
})();

// 15. Play button for a short audio sample (voice demo, a song snippet). Never autoplay.
//     <audio id="demo1" src="audio/demo1.mp3" preload="none"></audio>
//     <button type="button" data-play="#demo1" aria-pressed="false">Play sample</button>   (style [aria-pressed="true"] as "playing")
(() => {
  const btns = [...document.querySelectorAll('[data-play]')];
  btns.forEach((btn) => {
    const audio = document.querySelector(btn.dataset.play);
    if (!audio) return;
    const sync = () => btn.setAttribute('aria-pressed', String(!audio.paused));
    btn.addEventListener('click', () => {
      if (audio.paused) {
        document.querySelectorAll('audio').forEach(a => { if (a !== audio) a.pause(); });
        audio.play().catch(() => {});
      } else audio.pause();
    });
    ['play', 'pause', 'ended'].forEach(ev => audio.addEventListener(ev, sync));
  });
})();
